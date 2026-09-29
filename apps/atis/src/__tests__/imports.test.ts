import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';

import { buildMap, identifyModules } from 'core';
import type { MapJson } from 'core';
import { afterAll, beforeAll, expect, test, vi } from 'vitest';

import {
  parseExportShapes,
  parseFallowEntryPoints,
  parseManifestWorkspaces,
  parseWorkspaceGlobs,
  scanImports,
} from '../sources/index.js';
import type { Scan, ScannedFile } from '../sources/index.js';

/**
 * The fixture tree is written from these strings into a `mkdtemp` directory, so
 * no `.ts` fixture is ever committed and neither the gate nor fallow ever sees
 * it (D42). It stands in for the `git archive` extraction the scan is handed.
 */
const WORKSPACE: Readonly<Record<string, string>> = {
  'pnpm-workspace.yaml': `packages:
  - 'apps/*'
  - 'libs/*'

allowBuilds:
  fallow: true
`,
  'package.json': `{ "name": "fixture", "private": true }\n`,
  'README.md': `# fixture\n`,
  'apps/cli/package.json': `{
  "name": "@scope/cli",
  "type": "module",
  "bin": { "cli": "./dist/cli.js" },
  "exports": { ".": { "source": "./src/index.ts", "default": "./dist/index.js" } }
}
`,
  'apps/cli/src/cli.ts': `import { run } from './index.js';

run({ verbose: false });
`,
  'apps/cli/src/index.ts': `import chalk from 'chalk';
import { helper } from './helpers/index.js';
import { greet as hello } from 'shared';
import type { Options } from './types.js';
import './polyfill.js';

export * from './types.js';

export function run(options: Options): string {
  return chalk(hello(helper(options)));
}

export async function load(): Promise<unknown> {
  return import('./lazy.js');
}
`,
  'apps/cli/src/helpers/index.ts': `export function helper(value: unknown): unknown {
  return value;
}
`,
  'apps/cli/src/types.ts': `export type Options = { readonly verbose: boolean };

export const DEFAULTS: Options = { verbose: false };
`,
  'apps/cli/src/polyfill.ts': `export const READY = true;\n`,
  'apps/cli/src/lazy.ts': `export const LAZY = 'lazy';\n`,
  'apps/cli/src/__tests__/index.test.ts': `import { run } from '../index.js';

run({ verbose: true });
`,
  'libs/shared/package.json': `{
  "name": "shared",
  "type": "module",
  "main": "src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./harness": "./src/__tests__/harness.ts",
    "./styles": "./styles.css"
  }
}
`,
  'libs/shared/src/index.ts': `export { greet } from './greet.js';
export * as view from './view.js';
`,
  'libs/shared/src/greet.ts': `export function greet(value: unknown): string {
  return String(value);
}

export const HELLO = 'hello';
`,
  'libs/shared/src/view.tsx': `import { greet } from './greet.js';

export function View(): unknown {
  return <div className={greet('x')} />;
}
`,
  'libs/shared/src/__tests__/harness.ts': `import { greet } from '../greet.js';

export const sample = greet('sample');
`,
  'libs/shared/styles.css': `.view { color: red; }\n`,
};

/** A repo with no workspace file: the root package is the only member (D43). */
const FLAT: Readonly<Record<string, string>> = {
  'package.json': `{ "name": "flat", "type": "module", "main": "src/index.ts" }\n`,
  'src/index.ts': `import { value } from './lib/value.js';

export const app = value;
`,
  'src/lib/value.ts': `export const value = 1;\n`,
};

/**
 * An npm or bun repo (D64): `workspaces` is an array, `./` prefixes and all,
 * and a `!` glob drops a member the way it would in `pnpm-workspace.yaml`.
 */
const NPM: Readonly<Record<string, string>> = {
  'package.json': `{ "name": "npm-root", "private": true, "workspaces": ["./packages/*", "!packages/legacy"] }\n`,
  'packages/a/package.json': `{ "name": "@npm/a", "main": "src/index.ts" }\n`,
  'packages/a/src/index.ts': `export const a = 1;\n`,
  'packages/b/package.json': `{ "name": "@npm/b", "exports": { ".": "./src/index.ts" } }\n`,
  'packages/b/src/index.ts': `import { a } from '@npm/a';
import { legacy } from '@npm/legacy';

export const b = a + legacy;
`,
  'packages/legacy/package.json': `{ "name": "@npm/legacy", "main": "src/index.ts" }\n`,
  'packages/legacy/src/index.ts': `export const legacy = 0;\n`,
};

/** The `apps/*` and `libs/*` members a yarn repo and a two-manifest repo share. */
const APPS_AND_LIBS: Readonly<Record<string, string>> = {
  'apps/web/package.json': `{ "name": "web", "main": "src/index.ts" }\n`,
  'apps/web/src/index.ts': `import { util } from 'util-lib';

export const web = util;
`,
  'libs/util/package.json': `{ "name": "util-lib" }\n`,
  'libs/util/src/index.ts': `export const util = 1;\n`,
};

/** A yarn repo: `workspaces` is an object whose `packages` holds the globs. */
const YARN: Readonly<Record<string, string>> = {
  'package.json': `{
  "name": "yarn-root",
  "private": true,
  "workspaces": { "packages": ["apps/*", "libs/*"], "nohoist": ["**/react"] }
}
`,
  ...APPS_AND_LIBS,
};

/** Both manifests: pnpm never reads `workspaces`, so `pnpm-workspace.yaml` wins. */
const BOTH: Readonly<Record<string, string>> = {
  'pnpm-workspace.yaml': `packages:\n  - 'libs/*'\n`,
  'package.json': `{ "name": "both", "private": true, "workspaces": ["apps/*", "libs/*"] }\n`,
  ...APPS_AND_LIBS,
};

function writeTree(root: string, tree: Readonly<Record<string, string>>): string {
  for (const [path, content] of Object.entries(tree)) {
    const file = join(root, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
  return root;
}

const scratch: string[] = [];

/** Write a tree into its own `mkdtemp` directory and scan it; `afterAll` removes it. */
function scanTree(tree: Readonly<Record<string, string>>): Scan {
  const dir = writeTree(mkdtempSync(join(tmpdir(), 'atis-tree-')), tree);
  scratch.push(dir);
  return scanImports(dir);
}

/** An executable shell script standing in for a real binary. */
function writeScript(path: string, body: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `#!/bin/sh\n${body}\n`, { mode: 0o755 });
}

/** A working tree whose own fallow is `body`, run with the scanned tree as `$6`, the value of `--root` (D22). */
function repoWithFallow(body: string): string {
  const repo = mkdtempSync(join(tmpdir(), 'atis-repo-'));
  scratch.push(repo);
  writeScript(join(repo, 'node_modules', '.bin', 'fallow'), body);
  return repo;
}

/** `work`, with a `pnpm` first on PATH that narrates and fails, so a lookup routed through pnpm could not succeed. */
function underNarratingPnpm<T>(work: () => T): T {
  const shims = mkdtempSync(join(tmpdir(), 'atis-shims-'));
  scratch.push(shims);
  writeScript(join(shims, 'pnpm'), `echo 'Lockfile is up to date, resolution step is skipped'\nexit 1`);
  vi.stubEnv('PATH', `${shims}${delimiter}${process.env['PATH'] ?? ''}`);
  try {
    return work();
  } finally {
    vi.unstubAllEnvs();
  }
}

/** The map a scan builds with no diff and no `.check/`: only its instruments are read. */
function mapOf(found: Scan): MapJson {
  return buildMap({
    meta: { repo: 'fixture', base: 'main', head: 'head', merge_base: 'base', generated_at: '' },
    base: found,
    head: found,
    diff: [],
    deps_added: [],
    commits: [],
    head_time: 0,
    check: { mode: 'git-only', reason: '.check/ is absent' },
  });
}

function packageCells(found: Scan): readonly string[] {
  const roots = found.members.map((member) => member.dir);
  return identifyModules(found.files, found.edges, roots)
    .cells.filter((cell) => cell.kind === 'package')
    .map((cell) => cell.path);
}

function fileIn(scan: Scan, path: string): ScannedFile {
  const found = scan.files.find((file) => file.path === path);
  if (found === undefined) throw new Error(`no file ${path} in the scan`);
  return found;
}

let workspace: string;
let flat: string;
let scan: Scan;

beforeAll(() => {
  workspace = writeTree(mkdtempSync(join(tmpdir(), 'atis-scan-')), WORKSPACE);
  flat = writeTree(mkdtempSync(join(tmpdir(), 'atis-flat-')), FLAT);
  scan = scanImports(workspace);
});

afterAll(() => {
  for (const dir of [workspace, flat, ...scratch]) rmSync(dir, { recursive: true, force: true });
});

test('every tracked file is listed, classified and sorted, whether it is parsed or not', () => {
  expect(scan.files.map((file) => [file.path, file.kind])).toEqual([
    ['README.md', 'other'],
    ['apps/cli/package.json', 'other'],
    ['apps/cli/src/__tests__/index.test.ts', 'test'],
    ['apps/cli/src/cli.ts', 'source'],
    ['apps/cli/src/helpers/index.ts', 'source'],
    ['apps/cli/src/index.ts', 'source'],
    ['apps/cli/src/lazy.ts', 'source'],
    ['apps/cli/src/polyfill.ts', 'source'],
    ['apps/cli/src/types.ts', 'source'],
    ['libs/shared/package.json', 'other'],
    ['libs/shared/src/__tests__/harness.ts', 'test'],
    ['libs/shared/src/greet.ts', 'source'],
    ['libs/shared/src/index.ts', 'source'],
    ['libs/shared/src/view.tsx', 'source'],
    ['libs/shared/styles.css', 'other'],
    ['package.json', 'other'],
    ['pnpm-workspace.yaml', 'other'],
  ]);
  expect(fileIn(scan, 'libs/shared/src/greet.ts').loc).toBe(4);
  expect(fileIn(scan, 'README.md')).toEqual({ path: 'README.md', loc: 0, kind: 'other', exports: [], shapes: {} });
});

test('exports are the names a file declares, with `export * from` passing the target on', () => {
  expect(fileIn(scan, 'apps/cli/src/types.ts').exports).toEqual(['DEFAULTS', 'Options']);
  expect(fileIn(scan, 'apps/cli/src/index.ts').exports).toEqual(['DEFAULTS', 'Options', 'load', 'run']);
  expect(fileIn(scan, 'libs/shared/src/index.ts').exports).toEqual(['greet', 'view']);
  expect(fileIn(scan, 'libs/shared/src/view.tsx').exports).toEqual(['View']);
});

test('every exported name has a shape beside it, and a name a star passes on takes the star as its shape (D76)', () => {
  for (const file of scan.files) expect(Object.keys(file.shapes).toSorted()).toEqual(file.exports);
  expect(fileIn(scan, 'apps/cli/src/index.ts').shapes).toEqual({
    DEFAULTS: '* from "./types.js"',
    Options: '* from "./types.js"',
    load: 'function load(): Promise<unknown>;',
    run: 'function run(options: Options): string;',
  });
  expect(fileIn(scan, 'libs/shared/src/index.ts').shapes).toEqual({
    greet: 'greet from "./greet.js"',
    view: '* from "./view.js"',
  });
  expect(fileIn(scan, 'libs/shared/src/greet.ts').shapes).toEqual({
    HELLO: 'const HELLO = "hello";',
    greet: 'function greet(value: unknown): string;',
  });
  expect(fileIn(scan, 'libs/shared/src/view.tsx').shapes).toEqual({ View: 'function View(): unknown;' });
});

test("a body-only edit leaves a function's shape alone, and so does a doc comment (D76)", () => {
  const before = parseExportShapes(
    'area.ts',
    `export function area(width: number, height: number): number {
  return width * height;
}
`,
  );
  const after = parseExportShapes(
    'area.ts',
    `/** The area of a rectangle. */
export function area(width: number, height: number): number {
  const product = width * height;
  return product;
}
`,
  );
  expect(before).toEqual({ area: 'function area(width: number, height: number): number;' });
  expect(after).toEqual(before);
});

test("a tuple type gaining a leading element moves its shape, as trpc's query keys did (D76)", () => {
  const before = parseExportShapes(
    'types.ts',
    `export type TRPCQueryKey = [path: readonly string[], opts?: { input?: unknown }];\n`,
  );
  const after = parseExportShapes(
    'types.ts',
    `export type TRPCQueryKey = [prefix: readonly string[], path: readonly string[], opts?: { input?: unknown }];\n`,
  );
  expect(after['TRPCQueryKey']).not.toBe(before['TRPCQueryKey']);
  expect(after['TRPCQueryKey']).toMatch(/^type TRPCQueryKey = \[\s*prefix: readonly string\[\],/);
});

test('an interface gaining a member moves its shape (D76)', () => {
  const before = parseExportShapes('options.ts', `export interface Options {\n  readonly verbose: boolean;\n}\n`);
  const after = parseExportShapes(
    'options.ts',
    `export interface Options {\n  readonly verbose: boolean;\n  readonly queryKeyPrefix?: string;\n}\n`,
  );
  expect(after['Options']).not.toBe(before['Options']);
});

test('an export whose type is inferred reads as not compared, never as unchanged (C2)', () => {
  const shapes = parseExportShapes(
    'values.ts',
    `import { f } from './f.js';

export const x = f();
export const typed: number = f(), loose = f();
export function echo(value: string) {
  return value;
}
export default f();
`,
  );
  expect(shapes).toEqual({ default: null, echo: null, loose: null, typed: 'const typed: number;', x: null });
});

test('overloads and merged declarations fold into one shape, the implementation dropped (D76)', () => {
  const shapes = parseExportShapes(
    'merged.ts',
    `export function parse(text: string): number;
export function parse(text: string, radix: number): number;
export function parse(text: string, radix = 10): number {
  return Number.parseInt(text, radix);
}

export interface Box { width: number }
export interface Box { height: number }

export function Tool(): void {}
export namespace Tool {
  export const version: string = '1';
}
`,
  );
  expect(shapes).toEqual({
    Box: 'interface Box {\n    width: number;\n}\ninterface Box {\n    height: number;\n}',
    Tool: 'function Tool(): void;\nnamespace Tool {\n    const version: string;\n}',
    parse: 'function parse(text: string): number;\nfunction parse(text: string, radix: number): number;',
  });
});

test("a re-exported name's shape is its binding, and a local exported by name is its declaration (D76)", () => {
  const shapes = parseExportShapes(
    'index.ts',
    `import { helper } from './helper.js';
import type { Options } from './options.js';

function run(options: Options): string {
  return helper(options);
}

export { run as start, helper, type Options };
export { greet as hello } from './greet.js';
export type { View } from './view.js';
export * as util from './util.js';
export * from './everything.js';
`,
  );
  expect(shapes).toEqual({
    Options: 'type Options from "./options.js"',
    View: 'type View from "./view.js"',
    hello: 'greet from "./greet.js"',
    helper: 'helper from "./helper.js"',
    start: 'function run(options: Options): string;',
    util: '* from "./util.js"',
  });
});

test('every specifier resolves the way NodeNext would, and npm packages are dropped', () => {
  expect(scan.edges).toEqual([
    { from: 'apps/cli/src/__tests__/index.test.ts', to: 'apps/cli/src/index.ts', names: ['run'], line: 1 },
    { from: 'apps/cli/src/cli.ts', to: 'apps/cli/src/index.ts', names: ['run'], line: 1 },
    { from: 'apps/cli/src/index.ts', to: 'apps/cli/src/helpers/index.ts', names: ['helper'], line: 2 },
    { from: 'apps/cli/src/index.ts', to: 'libs/shared/src/index.ts', names: ['greet'], line: 3 },
    { from: 'apps/cli/src/index.ts', to: 'apps/cli/src/types.ts', names: ['Options'], line: 4 },
    { from: 'apps/cli/src/index.ts', to: 'apps/cli/src/polyfill.ts', names: [], line: 5 },
    { from: 'apps/cli/src/index.ts', to: 'apps/cli/src/types.ts', names: ['*'], line: 7 },
    { from: 'apps/cli/src/index.ts', to: 'apps/cli/src/lazy.ts', names: [], line: 14 },
    { from: 'libs/shared/src/__tests__/harness.ts', to: 'libs/shared/src/greet.ts', names: ['greet'], line: 1 },
    { from: 'libs/shared/src/index.ts', to: 'libs/shared/src/greet.ts', names: ['greet'], line: 1 },
    { from: 'libs/shared/src/index.ts', to: 'libs/shared/src/view.tsx', names: ['*'], line: 2 },
    { from: 'libs/shared/src/view.tsx', to: 'libs/shared/src/greet.ts', names: ['greet'], line: 1 },
  ]);
});

test('members come from the workspace globs, entries from bin, main and exports', () => {
  expect(scan.members).toEqual([
    { name: 'fixture', dir: '.', entry: [] },
    { name: '@scope/cli', dir: 'apps/cli', entry: ['apps/cli/src/cli.ts', 'apps/cli/src/index.ts'] },
    { name: 'shared', dir: 'libs/shared', entry: ['libs/shared/src/index.ts'] },
  ]);
});

test("the reviewed repo's fallow runs as the binary itself, never through pnpm, and its entry points join the manifests", () => {
  const repo = repoWithFallow(
    [
      `[ "$*" = "list --entry-points --format json --root ${workspace}" ] || exit 9`,
      `echo '{"entry_points":[{"path":"apps/cli/./src/lazy.ts","source":"manual entry"}]}'`,
    ].join('\n'),
  );
  const found = underNarratingPnpm(() => scanImports(workspace, { repo }));

  expect(found.entry_points).toEqual({ source: 'fallow' });
  expect(found.members.find((member) => member.dir === 'apps/cli')?.entry).toEqual([
    'apps/cli/src/cli.ts',
    'apps/cli/src/index.ts',
    'apps/cli/src/lazy.ts',
  ]);
  expect(mapOf(found).meta.instruments).toEqual({ mode: 'git-only', reason: '.check/ is absent', entry_points: 'fallow' });
});

test('a fallow that is missing, fails or is talked over leaves the manifests, and says why (C2)', () => {
  // The fixture tree has no `node_modules`, so the default scan had no fallow to ask.
  expect(scan.entry_points).toEqual({ source: 'manifests', reason: 'no local fallow at node_modules/.bin/fallow' });

  // fallow's own JSON error names the real path of the tree, which is a temp directory, so it is cut to `.` (C3).
  const rejected = scanImports(workspace, {
    repo: repoWithFallow(
      [
        `printf '{"error":true,"message":"Failed to parse config file %s/.fallowrc.json: Expected string","exit_code":2}' "$(cd "$6" && pwd -P)"`,
        'exit 2',
      ].join('\n'),
    ),
  });
  expect(rejected.members).toEqual(scan.members);
  expect(rejected.entry_points).toEqual({
    source: 'manifests',
    reason: 'fallow list exited 2: Failed to parse config file ./.fallowrc.json: Expected string',
  });

  const crashed = scanImports(workspace, { repo: repoWithFallow(`echo 'thread main panicked' >&2\nexit 101`) });
  expect(crashed.entry_points).toEqual({ source: 'manifests', reason: 'fallow list exited 101: thread main panicked' });

  // What `pnpm exec` did on an npm tree: a line of narration ahead of the JSON.
  const narrated = scanImports(workspace, {
    repo: repoWithFallow(`echo 'Lockfile is up to date, resolution step is skipped'\necho '{"entry_points":[]}'`),
  });
  expect(narrated.entry_points).toMatchObject({
    source: 'manifests',
    reason: expect.stringMatching(/^fallow list printed no entry points: /),
  });
});

test("a failed lookup's reason reaches meta.instruments, and the manifests are named as the source", () => {
  const found = scanImports(workspace, { repo: repoWithFallow(`echo 'thread main panicked' >&2\nexit 101`) });
  expect(mapOf(found).meta.instruments).toEqual({
    mode: 'git-only',
    reason: '.check/ is absent',
    entry_points: 'manifests',
    entry_points_reason: 'fallow list exited 101: thread main panicked',
  });
});

test('without a workspace file or a workspaces field the root package stands alone', () => {
  const rootOnly = scanImports(flat);
  expect(rootOnly.members).toEqual([{ name: 'flat', dir: '.', entry: ['src/index.ts'] }]);
  expect(rootOnly.edges).toEqual([{ from: 'src/index.ts', to: 'src/lib/value.ts', names: ['value'], line: 1 }]);
});

test('the workspaces array npm and bun write names the members, exclusions and all', () => {
  const npm = scanTree(NPM);
  expect(npm.members).toEqual([
    { name: 'npm-root', dir: '.', entry: [] },
    { name: '@npm/a', dir: 'packages/a', entry: ['packages/a/src/index.ts'] },
    { name: '@npm/b', dir: 'packages/b', entry: ['packages/b/src/index.ts'] },
  ]);
  expect(npm.edges).toEqual([
    { from: 'packages/b/src/index.ts', to: 'packages/a/src/index.ts', names: ['a'], line: 1 },
  ]);
  // The excluded `legacy` is no member, so its files fall to the root package.
  expect(packageCells(npm)).toEqual(['.', 'packages/a', 'packages/b']);
});

test("yarn's workspaces object names the members through its packages", () => {
  const yarn = scanTree(YARN);
  expect(yarn.members).toEqual([
    { name: 'yarn-root', dir: '.', entry: [] },
    { name: 'web', dir: 'apps/web', entry: ['apps/web/src/index.ts'] },
    { name: 'util-lib', dir: 'libs/util', entry: [] },
  ]);
  expect(yarn.edges).toEqual([
    { from: 'apps/web/src/index.ts', to: 'libs/util/src/index.ts', names: ['util'], line: 1 },
  ]);
  expect(packageCells(yarn)).toEqual(['apps/web', 'libs/util']);
});

test('pnpm-workspace.yaml wins when a workspaces field sits beside it', () => {
  const both = scanTree(BOTH);
  expect(both.members.map((member) => member.dir)).toEqual(['.', 'libs/util']);
  // `apps/web` is a member only in the ignored `workspaces`, so it stays in the root package.
  expect(packageCells(both)).toEqual(['.', 'libs/util']);
});

test('the same tree scans the same way twice', () => {
  expect(scanImports(workspace)).toEqual(scan);
});

test('parseWorkspaceGlobs reads the block list, the flow list and exclusions', () => {
  expect(parseWorkspaceGlobs(WORKSPACE['pnpm-workspace.yaml'] ?? '')).toEqual(['apps/*', 'libs/*']);
  expect(parseWorkspaceGlobs("packages:\n  - packages/**\n  - '!**/__fixtures__/**'\n")).toEqual([
    'packages/**',
    '!**/__fixtures__/**',
  ]);
  expect(parseWorkspaceGlobs(`packages: ['apps/*', "libs/*"]\n`)).toEqual(['apps/*', 'libs/*']);
  expect(parseWorkspaceGlobs('onlyBuiltDependencies:\n  - fallow\n')).toEqual([]);
});

test('parseManifestWorkspaces reads the array, the yarn object and exclusions', () => {
  expect(parseManifestWorkspaces('{ "workspaces": ["packages/*", "!packages/legacy"] }')).toEqual([
    'packages/*',
    '!packages/legacy',
  ]);
  expect(parseManifestWorkspaces('{ "workspaces": { "packages": ["apps/*"], "nohoist": ["**/react"] } }')).toEqual([
    'apps/*',
  ]);
  expect(parseManifestWorkspaces('{ "workspaces": { "nohoist": ["**/react"] } }')).toEqual([]);
  expect(parseManifestWorkspaces('{ "name": "flat" }')).toEqual([]);
  expect(parseManifestWorkspaces('{ "name": ')).toEqual([]);
});

test('parseFallowEntryPoints collapses the ./ segments fallow leaves in workspace paths', () => {
  const stdout = JSON.stringify({
    entry_point_count: 4,
    entry_points: [
      { path: 'libs/core/./src/index.ts', source: 'package.json main' },
      { path: 'apps/atis/src/cli.ts', source: 'manual entry' },
      { path: 'apps/atis/src/cli.ts', source: 'package.json main' },
      { path: 'apps/atis/tsconfig.json', source: 'typescript' },
    ],
  });
  expect(parseFallowEntryPoints(stdout)).toEqual([
    'apps/atis/src/cli.ts',
    'apps/atis/tsconfig.json',
    'libs/core/src/index.ts',
  ]);
  expect(() => parseFallowEntryPoints('{"ok":true}')).toThrow(/entry_points/);
});
