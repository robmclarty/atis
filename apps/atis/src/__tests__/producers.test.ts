import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { assertMap, buildMap, layOutTerrain } from 'core';
import type { MapJson } from 'core';
import { afterAll, expect, test } from 'vitest';

import { run } from '../run.js';
import { PRODUCERS, mergeScans, producersOff, readTree, typescriptKind } from '../sources/index.js';
import type { Producer, Scan, ScannedFile } from '../sources/index.js';

/**
 * The producers (D114): TypeScript is the first behind one interface, every
 * producer whose files a tree holds runs, their scans merge into one, and a
 * producer switched off or unable to run leaves its files on the shore and
 * says why in the map.
 */

const MINUTE = 60_000;

const workspaces: string[] = [];

afterAll(() => {
  for (const dir of workspaces) rmSync(dir, { recursive: true, force: true });
});

function temp(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), `atis-producers-${prefix}-`));
  workspaces.push(dir);
  return dir;
}

function write(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

/** A small package: a barrel, a module it re-exports, a test of it, and a README. */
function tree(): string {
  const dir = temp('tree');
  write(join(dir, 'package.json'), '{ "name": "demo", "private": true, "type": "module" }\n');
  write(join(dir, 'README.md'), '# demo\n');
  write(join(dir, 'src', 'index.ts'), "export { area } from './shapes.js';\n");
  write(join(dir, 'src', 'shapes.ts'), 'export function area(width: number, height: number): number {\n  return width * height;\n}\n');
  write(join(dir, 'src', '__tests__', 'shapes.test.ts'), "import { area } from '../shapes.js';\n\narea(2, 3);\n");
  return dir;
}

/** A tree's map as a change of nothing, so its terrain and its instruments are what the scan alone made. */
function mapOf(scan: Scan): MapJson {
  const map = buildMap({
    meta: { repo: 'demo', base: 'main', head: 'h'.repeat(40), merge_base: 'b'.repeat(40), generated_at: '' },
    base: scan,
    head: scan,
    diff: [],
    deps_added: [],
    commits: [],
    head_time: 0,
    check: { mode: 'git-only', reason: '.check/ is absent' },
  });
  assertMap(map);
  return map;
}

/** A file a hand-built producer read: a source file of `loc` lines exporting `names`. */
function produced(path: string, extra: Partial<ScannedFile> = {}): ScannedFile {
  return { path, loc: 10, kind: 'source', exports: [], shapes: {}, inferred: [], code: [], packages: [], functions: [], ...extra };
}

/** A producer of `.fake` files, read without a toolchain: each one source, `mod.fake` its directory's barrel, `b.fake` importing `a.fake`. */
const FAKE: Producer = {
  id: 'fake',
  extensions: ['.fake'],
  unavailable: () => undefined,
  read: ({ files }) => ({
    scan: {
      files: files.map((path) => produced(path, path.endsWith('/mod.fake') ? { barrel: true } : {})),
      edges: files.includes('src/lib/b.fake') && files.includes('src/lib/a.fake') ? [{ from: 'src/lib/b.fake', to: 'src/lib/a.fake', names: ['a'], line: 1 }] : [],
      members: [],
      entry_points: { source: 'manifests', reason: 'fake reads no entry points' },
    },
    parsed: {},
  }),
};

test.each([
  ['src/doctor.ts', 'source'],
  ['src/components/Canvas.tsx', 'source'],
  ['src/latest.ts', 'source'],
  ['src/contest/index.ts', 'source'],
  ['src/__tests__/doctor.test.ts', 'test'],
  ['src/__tests__/helpers.ts', 'test'],
  ['src/doctor.test.ts', 'test'],
  ['src/view.spec.tsx', 'test'],
  ['test/e2e/run.ts', 'test'],
  ['packages/core/test/fixtures/tree.ts', 'test'],
  ['benchmarks/handle-event/index.mts', 'source'],
  ['src/loader.cts', 'source'],
  ['src/types.d.mts', 'source'],
  ['src/index.d.cts', 'source'],
  ['src/handler.test.mts', 'test'],
  ['src/loader.spec.cts', 'test'],
  ['scripts/release.mjs', 'source'],
  ['lib/legacy.cjs', 'source'],
  ['src/App.jsx', 'source'],
  ['src/math.test.js', 'test'],
  ['src/App.spec.jsx', 'test'],
  ['src/__tests__/setup.cjs', 'test'],
  ['README.md', 'other'],
  ['data/points.json', 'other'],
  ['test/fixtures/biome.json', 'other'],
])('the TypeScript producer reads %s as %s (D4, D77, D184)', (path, kind) => {
  expect(typescriptKind(path)).toBe(kind);
});

test("TypeScript is the first producer, claiming its four extensions and JavaScript's four, and it can always run (D114, D184)", () => {
  const [typescript] = PRODUCERS;
  expect(typescript?.id).toBe('typescript');
  expect(typescript?.extensions).toEqual(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']);
  expect(typescript?.unavailable()).toBeUndefined();
});

test('the TypeScript producer gives each file it reads its kind, and marks an index.ts its directory\'s barrel; every other file is other (D114)', () => {
  const { files } = readTree(tree()).scan;
  expect(files.map((file) => [file.path, file.kind, file.barrel ?? false])).toEqual([
    ['README.md', 'other', false],
    ['package.json', 'other', false],
    ['src/__tests__/shapes.test.ts', 'test', false],
    ['src/index.ts', 'source', true],
    ['src/shapes.ts', 'source', false],
  ]);
});

test('every producer whose files the tree holds runs, and their scans merge into one the map builds cells from (D114)', () => {
  const dir = tree();
  write(join(dir, 'src', 'lib', 'mod.fake'), 'mod\n');
  write(join(dir, 'src', 'lib', 'a.fake'), 'a\n');
  write(join(dir, 'src', 'lib', 'b.fake'), 'b\n');
  const alone = readTree(dir).scan;
  const both = readTree(dir, { producers: [...PRODUCERS, FAKE] }).scan;

  // Each TypeScript file reads as it did alone, and the .fake files as the other producer gave them.
  expect(both.files.filter((file) => !file.path.endsWith('.fake'))).toEqual(alone.files.filter((file) => !file.path.endsWith('.fake')));
  expect(both.files.filter((file) => file.path.endsWith('.fake')).map((file) => [file.path, file.kind, file.barrel ?? false])).toEqual([
    ['src/lib/a.fake', 'source', false],
    ['src/lib/b.fake', 'source', false],
    ['src/lib/mod.fake', 'source', true],
  ]);
  expect(both.edges).toEqual([...alone.edges, { from: 'src/lib/b.fake', to: 'src/lib/a.fake', names: ['a'], line: 1 }].toSorted((a, b) => (a.from < b.from ? -1 : 1)));
  expect(both.entry_points).toEqual({ source: 'manifests', reason: `typescript: ${alone.entry_points.source === 'manifests' ? alone.entry_points.reason : ''}; fake: fake reads no entry points` });
  expect(both.unread).toBeUndefined();

  // The barrel the producer named makes src/lib a folder cell, which core found by no extension.
  const folder = mapOf(both).terrain.cells.find((cell) => cell.id === 'folder:src/lib');
  expect(folder).toMatchObject({ barrel: 'src/lib/mod.fake', organelles: ['src/lib/a.fake', 'src/lib/b.fake', 'src/lib/mod.fake'] });
});

test('a producer switched off reads nothing: its files stay on the shore, and the map says which producer and why (D114, C2)', () => {
  const dir = tree();
  const off = readTree(dir, { off: ['typescript'] }).scan;

  expect(off.files.every((file) => file.kind === 'other' && file.loc === 0 && file.exports.length === 0)).toBe(true);
  expect(off.edges).toEqual([]);
  expect(off.members).toEqual([]);
  expect(off.entry_points).toEqual({ source: 'manifests', reason: 'no producer read the tree' });
  expect(off.unread).toEqual([{ producer: 'typescript', reason: 'switched off in atis.config.json' }]);

  const map = mapOf(off);
  expect(map.terrain.cells).toEqual([]);
  expect(map.terrain.groups.find((group) => group.id === 'other')?.files).toEqual(['src/__tests__/shapes.test.ts', 'src/index.ts', 'src/shapes.ts']);
  expect(map.meta.instruments.unread).toEqual(['typescript: switched off in atis.config.json']);
});

test('a producer that cannot run leaves its files on the shore and says why, while the others read theirs (D114, C2)', () => {
  const dir = tree();
  write(join(dir, 'src', 'lib', 'a.fake'), 'a\n');
  const scan = readTree(dir, { producers: [...PRODUCERS, { ...FAKE, unavailable: () => 'no fake toolchain on the PATH' }] }).scan;

  expect(scan.files.find((file) => file.path === 'src/lib/a.fake')).toMatchObject({ kind: 'other', loc: 0 });
  expect(scan.files.find((file) => file.path === 'src/shapes.ts')?.kind).toBe('source');
  expect(scan.unread).toEqual([{ producer: 'fake', reason: 'no fake toolchain on the PATH' }]);

  const map = mapOf(scan);
  expect(map.meta.instruments.unread).toEqual(['fake: no fake toolchain on the PATH']);
  expect(map.terrain.groups.find((group) => group.id === 'other')?.files).toContain('src/lib/a.fake');
});

test('a producer whose files the tree does not hold neither runs nor is named, switched off or not (D114)', () => {
  const dir = tree();
  let ran = false;
  const watched: Producer = {
    ...FAKE,
    read: (input) => {
      ran = true;
      return FAKE.read(input);
    },
  };
  const scan = readTree(dir, { producers: [...PRODUCERS, watched], off: ['fake'] }).scan;
  expect(ran).toBe(false);
  expect(scan.unread).toBeUndefined();
  expect(mapOf(scan).meta.instruments.unread).toBeUndefined();
});

test('merging keeps every tracked path in order, each as its producer read it or as other, and sorts the edges as one (D114)', () => {
  const lookup = { source: 'fallow' } as const;
  const one: Scan = { files: [produced('b.x')], edges: [{ from: 'b.x', to: 'z.x', names: [], line: 2 }], members: [{ name: 'x', dir: '.', entry: ['b.x'], published: false, surface: [] }], entry_points: lookup };
  const two: Scan = { files: [produced('a.y', { kind: 'test' })], edges: [{ from: 'a.y', to: 'b.x', names: [], line: 1 }], members: [], entry_points: lookup };
  const merged = mergeScans(['a.y', 'b.x', 'c.md'], [{ producer: 'x', scan: one }, { producer: 'y', scan: two }], []);

  expect(merged.files.map((file) => [file.path, file.kind])).toEqual([['a.y', 'test'], ['b.x', 'source'], ['c.md', 'other']]);
  expect(merged.files[2]).toEqual({ path: 'c.md', loc: 0, kind: 'other', exports: [], shapes: {}, inferred: [], code: [], packages: [], functions: [] });
  expect(merged.edges.map((edge) => edge.from)).toEqual(['a.y', 'b.x']);
  expect(merged.members).toEqual(one.members);
  expect(merged.entry_points).toEqual({ source: 'fallow' });
  expect('unread' in merged).toBe(false);
  // One producer's lookup stands as it said it; none read, and the tree says so.
  expect(mergeScans([], [{ producer: 'x', scan: { ...one, entry_points: { source: 'manifests', reason: 'no local fallow' } } }], []).entry_points).toEqual({ source: 'manifests', reason: 'no local fallow' });
  expect(mergeScans(['c.md'], [], [{ producer: 'x', reason: 'off' }])).toMatchObject({ entry_points: { source: 'manifests', reason: 'no producer read the tree' }, unread: [{ producer: 'x', reason: 'off' }] });
});

test('switching off a producer atis does not run is a typo, and throws rather than reading as nothing (C4)', () => {
  expect(producersOff(['typescript'])).toEqual(['typescript']);
  expect(() => producersOff(['typescrpit'])).toThrow(/typescrpit, which names no producer; the producers are typescript/);
});

test('a terrain laid out from a scan the producers read is the one the TypeScript scan alone laid out (D114)', () => {
  const dir = tree();
  const scan = readTree(dir).scan;
  expect(layOutTerrain(scan)).toEqual(layOutTerrain(readTree(dir, { producers: PRODUCERS }).scan));
});

/** A throwaway repository whose head commits an atis.config.json. */
function configured(config: string): string {
  const repo = tree();
  const git = (...args: readonly string[]): string =>
    execFileSync('git', ['-c', 'user.name=atis', '-c', 'user.email=atis@example.invalid', '-c', 'commit.gpgsign=false', ...args], { cwd: repo, encoding: 'utf8' }).trim();
  git('init', '--quiet');
  git('add', '.');
  git('commit', '--quiet', '-m', 'feat: measure an area');
  write(join(repo, 'atis.config.json'), config);
  write(join(repo, 'src', 'square.ts'), 'export function square(side: number): number {\n  return side * side;\n}\n');
  git('add', '.');
  git('commit', '--quiet', '-m', 'feat: square a side');
  return repo;
}

test('atis.config.json switches the TypeScript producer off: the run maps no cells, and says so in meta.instruments (D114)', { timeout: MINUTE }, () => {
  const repo = configured('{ "producers": { "typescript": false } }\n');
  const out = join(temp('maps'), 'map.json');
  const outcome = run({ repo, base: 'HEAD~1', out, cache: false, verbose: false });
  expect(outcome.exitCode, outcome.stderr).toBe(0);
  const map = JSON.parse(readFileSync(out, 'utf8')) as MapJson;
  expect(map.terrain.cells).toEqual([]);
  expect(map.meta.instruments.unread).toEqual(['typescript: switched off in atis.config.json']);
  expect(map.weather.changed.find((file) => file.path === 'src/square.ts')?.group).toBe('other');
});

test('an atis.config.json that switches off a producer atis does not run is misuse: exit 2, naming it (C4)', { timeout: MINUTE }, () => {
  const repo = configured('{ "producers": { "go": false } }\n');
  const outcome = run({ repo, base: 'HEAD~1', out: join(temp('maps'), 'map.json'), cache: false, verbose: false });
  expect(outcome.exitCode).toBe(2);
  expect(outcome.stderr).toContain('switches off go, which names no producer');
});
