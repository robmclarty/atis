import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { buildMap } from 'core';
import type { DiffFile, Notice } from 'core';
import { afterAll, expect, test } from 'vitest';

import { checkInferredShapes, scanImports, shapePaths } from '../sources/index.js';
import type { Scan } from '../sources/index.js';

/**
 * Each tree is written from strings into a `mkdtemp` directory, as the scan's
 * own tests write theirs (D42), standing in for the `git archive` extraction
 * of one side of a change. A package that names `src/index.ts` and is not
 * private publishes it, so the file is an interface file read from outside
 * the repository (D75), which is where an interface notice can fire.
 */
const scratch: string[] = [];

afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

type Tree = Readonly<Record<string, string>>;

const MANIFEST = `{ "name": "lib", "type": "module", "main": "src/index.ts" }\n`;
const INDEX = 'src/index.ts';

function writeTree(files: Tree): string {
  const dir = mkdtempSync(join(tmpdir(), 'atis-shapes-'));
  scratch.push(dir);
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}

/** A published package whose barrel is the given source. */
function library(index: string, extra: Tree = {}): Tree {
  return { 'package.json': MANIFEST, [INDEX]: index, ...extra };
}

/** One side scanned, and its inferred names printed by the checker where `paths` names their file. */
function checked(files: Tree, paths: readonly string[] = [INDEX]): Scan {
  const dir = writeTree(files);
  return checkInferredShapes(dir, scanImports(dir), new Set(paths));
}

function shapeOf(scan: Scan, path: string, name: string): string | null | undefined {
  return scan.files.find((file) => file.path === path)?.shapes[name];
}

/** The notices of a change that modified `src/index.ts` from `base` to `head`, with no history and no `.check/`. */
function noticesOf(base: Scan, head: Scan): readonly Notice[] {
  return buildMap({
    meta: { repo: 'fixture', base: 'main', head: 'head', merge_base: 'base', generated_at: '' },
    base,
    head,
    diff: [{ path: INDEX, kind: 'modified', added: 1, deleted: 1, hunks: [{ start: 1, count: 1 }] }],
    deps_added: [],
    commits: [],
    head_time: 0,
    check: { mode: 'git-only', reason: '.check/ is absent' },
  }).notices;
}

const COUNT = 'export function count(items: readonly string[]) { return items.length; }\n';

test("an inferred export is printed by the checker over the tree's own imports, where the file alone could not (D118)", () => {
  const files = library(`import { make } from './make.js';\nexport function build() { return make('a'); }\n`, {
    'src/make.ts': `export interface Made { readonly id: string }\nexport function make(id: string): Made { return { id }; }\n`,
  });

  // Read on its own the file cannot say what `build` returns: the scan flags it and prints nothing (D76).
  const scanned = scanImports(writeTree(files));
  expect(scanned.files.find((file) => file.path === INDEX)?.inferred).toEqual(['build']);
  expect(shapeOf(scanned, INDEX, 'build')).toBeNull();

  // The checker follows the import into `make.ts` and prints the type it found there.
  expect(shapeOf(checked(files), INDEX, 'build')).toBe('function build(): import("./make.js").Made;');
});

test('a workspace package is followed by its manifest, never through a node_modules the extraction lacks (D118)', () => {
  const files: Tree = {
    'pnpm-workspace.yaml': "packages:\n  - 'libs/*'\n",
    'package.json': '{ "name": "root", "private": true }\n',
    'libs/shared/package.json': '{ "name": "shared", "type": "module", "exports": { ".": "./src/index.ts" } }\n',
    'libs/shared/src/index.ts': 'export type Slot = { readonly name: string };\nexport function slot(name: string): Slot { return { name }; }\n',
    'libs/app/package.json': '{ "name": "app", "type": "module", "exports": { ".": "./src/index.ts" } }\n',
    'libs/app/src/index.ts': "import { slot } from 'shared';\nexport function first() { return slot('a'); }\n",
  };
  const scan = checked(files, ['libs/app/src/index.ts']);
  expect(shapeOf(scan, 'libs/app/src/index.ts', 'first')).toBe('function first(): import("shared").Slot;');
});

test('a body-only edit that keeps every inferred type raises nothing, and a changed inferred return raises interface-change (D118)', () => {
  const base = checked(library(COUNT));
  const body = checked(library('export function count(items: readonly string[]) { const n = items.length; return n; }\n'));
  const returns = checked(library('export function count(items: readonly string[]) { return String(items.length); }\n'));

  expect(shapeOf(base, INDEX, 'count')).toBe('function count(items: readonly string[]): number;');
  expect(shapeOf(body, INDEX, 'count')).toBe(shapeOf(base, INDEX, 'count'));
  expect(noticesOf(base, body)).toEqual([]);

  const notices = noticesOf(base, returns);
  expect(notices.map((notice) => notice.kind)).toEqual(['interface-change']);
  expect(notices[0]?.why).toBe('the interface of `.` changed (`count` reshaped) and `lib` publishes `count`');
});

/** A class whose methods' return types are all inferred: `label` returns a string literal, `next` the given expression. */
function counter(label: string, next: string): string {
  return `export class Counter {\n  #n = 0;\n  next() { return ${next}; }\n  label() { return '${label}'; }\n}\n`;
}

test('a class with inferred method returns compares member by member (D118)', () => {
  const base = checked(library(counter('c', '++this.#n')));

  expect(shapeOf(base, INDEX, 'Counter')).toBe('class Counter {\n    #private;\n    next(): number;\n    label(): string;\n}');
  // A new string from `label` is still a string: nothing a reader of the class sees has moved.
  expect(noticesOf(base, checked(library(counter('d', '++this.#n'))))).toEqual([]);
  // `next` now returns a string, and the class is reshaped by that one member.
  const reshaped = checked(library(counter('c', 'String(++this.#n)')));
  expect(shapeOf(reshaped, INDEX, 'Counter')).toContain('next(): string;');
  expect(noticesOf(base, reshaped).map((notice) => notice.kind)).toEqual(['interface-change']);
});

test('an external return type swapped for another stays uncompared, since both would print any (C2, D118)', () => {
  // `ext` is an npm package the extraction never installed: each call is the checker's error type.
  const base = checked(library("import { a } from 'ext';\nexport function f() { return a(); }\n"));
  const head = checked(library("import { b } from 'ext';\nexport function f() { return b(); }\n"));

  expect(shapeOf(base, INDEX, 'f')).toBeNull();
  expect(shapeOf(head, INDEX, 'f')).toBeNull();
  const notices = noticesOf(base, head);
  expect(notices.map((notice) => notice.kind)).toEqual(['interface-uncompared']);
  expect(notices[0]?.why).toContain('the shape of `f` could not be compared');
});

test("a name the checker's declaration emit cannot name stays uncompared, and the any a declaration writes is compared (C2, D118)", () => {
  // An anonymous class with a private member cannot be written into a declaration file.
  expect(shapeOf(checked(library('export const Mixed = class { private secret = 1; };\n')), INDEX, 'Mixed')).toBeNull();
  // `JSON.parse` is declared to return `any`: that is a written type, not an unresolved one.
  expect(shapeOf(checked(library('export function parse(text: string) { return JSON.parse(text); }\n')), INDEX, 'parse')).toBe(
    'function parse(text: string): any;',
  );
});

test('only the files handed over are checked, and the names the scan printed itself are left as they were (D118)', () => {
  const files = library(`${COUNT}export const LIMIT: number = 3;\n`);
  const untouched = checked(files, []);
  expect(shapeOf(untouched, INDEX, 'count')).toBeNull();
  expect(shapeOf(untouched, INDEX, 'LIMIT')).toBe('const LIMIT: number;');
  expect(shapeOf(checked(files), INDEX, 'LIMIT')).toBe('const LIMIT: number;');
});

test('the checker reads the changed interface files the change kept, each side under its own path (D118)', () => {
  const tree: Tree = {
    'package.json': '{ "name": "app", "private": true, "type": "module" }\n',
    'src/index.ts': "export { run } from './pm/index.js';\nexport { old } from './old.js';\n",
    'src/pm/index.ts': "import { helper } from './util.js';\nexport function run() { return helper(); }\n",
    'src/pm/util.ts': 'export function helper() { return 1; }\n',
    'src/old.ts': 'export function old() { return 0; }\n',
  };
  const base = scanImports(writeTree(tree));
  const head = scanImports(
    writeTree({ ...tree, 'src/old.ts': '', 'src/renamed.ts': tree['src/old.ts'] ?? '', 'src/added.ts': 'export const ADDED = 1;\n' }),
  );
  const diff: readonly DiffFile[] = [
    { path: 'src/pm/index.ts', kind: 'modified', added: 1, deleted: 1, hunks: [] },
    // `util.ts` is read only inside its folder cell, through the barrel: not an interface file.
    { path: 'src/pm/util.ts', kind: 'modified', added: 1, deleted: 1, hunks: [] },
    { path: 'src/renamed.ts', kind: 'renamed', from: 'src/old.ts', added: 0, deleted: 0, hunks: [] },
    { path: 'src/added.ts', kind: 'added', added: 1, deleted: 0, hunks: [] },
  ];

  const paths = shapePaths(diff, base, head);
  expect([...paths.base].toSorted()).toEqual(['src/old.ts', 'src/pm/index.ts']);
  expect([...paths.head].toSorted()).toEqual(['src/pm/index.ts', 'src/renamed.ts']);
});
