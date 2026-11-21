import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { Cell, Departure, MapJson } from 'core';
import { expect, test } from 'vitest';

import { approvedLine, departureWords, lineOf, nudge, rowsShown, startsOpen, treeOf, wornBy } from '../tree.js';
import type { DirectoryNode, TreeModel, TreeNode } from '../tree.js';

/**
 * The folder tree's model (D208 (side-panels)): the map's files and the
 * shore's folded under their directories, each row with the target it
 * selects, what it wears and what it counts, a chain of lone directories as
 * one row (D276 (chain-row)), a package and a directory at one path as the
 * package's row, the departures from the approved shape on the rows they
 * are about (D283 (lost-departure)), the rows a set of open directories
 * shows, and the header's line.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const read = (...path: readonly string[]): MapJson => assertMap(JSON.parse(readFileSync(join(ROOT, ...path), 'utf8')));
const DEMO = read('libs', 'core', 'fixtures', 'demo', 'map.json');
/** excalidraw: 505 files on the map, 739 on the shore, a package at the repo's root, and ten paths a package and a directory share. */
const CORPUS = read('fixtures', 'corpus-10', 'map.json');

const SHA = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';

/** Every row of a tree, open or not, by its path. */
const every = (model: TreeModel): ReadonlyMap<string, TreeNode> => new Map(rowsShown(model, () => true).map((row) => [row.node.path, row.node] as const));

const rowAt = (model: TreeModel, path: string): TreeNode => {
  const node = every(model).get(path);
  if (node === undefined) throw new Error(`the tree has no row at ${path}`);
  return node;
};

const directoryAt = (model: TreeModel, path: string): DirectoryNode => {
  const node = rowAt(model, path);
  if (node.kind !== 'directory') throw new Error(`${path} is not a directory's row`);
  return node;
};

/** The demo with these departures from a shape approved at a commit. */
const departing = (departures: readonly Departure[], map: MapJson = DEMO): MapJson => ({ ...map, approved: { at: SHA, departures } });

const grown = (target: string, cell: string): Departure => ({ kind: 'files-grown', target, cell, why: `${target} grew`, was: 1, now: 2 });

test("the demo's files fold under their directories, directories first and each by name, a chain of lone directories written as one row (D276 (chain-row))", () => {
  const model = treeOf(DEMO);
  expect(rowsShown(model, () => true).map(({ node, depth }) => `${'  '.repeat(depth)}${node.name}${node.kind === 'directory' ? '/' : ''}`)).toEqual([
    'apps/cli/',
    '  src/',
    '    doctor.ts',
    '    index.ts',
    '  package.json',
    'libs/core/',
    '  dist/',
    '    index.d.ts',
    '    index.js',
    '  src/',
    '    __tests__/',
    '      pm.test.ts',
    '    pm/',
    '      index.ts',
    '      legacy.ts',
    '      slots.ts',
    '      tools.ts',
    '    util/',
    '      format.ts',
    '      text.ts',
    '    index.ts',
    '  package.json',
    '.gitignore',
    'README.md',
    'notes.xyz',
    'package.json',
    'pnpm-workspace.yaml',
    'tsconfig.json',
  ]);
  // `apps` and `libs` hold one directory each and nothing else, so neither has a row of its own.
  expect(every(model).has('apps')).toBe(false);
  expect(rowAt(model, 'apps/cli').name).toBe('apps/cli');
  expect(model.counts).toMatchObject({ files: 20, placed: 9, changed: 8, changedOnMap: 4, ghosts: 1 });
});

test("a row's target is what it selects: a file's id, the module standing at a directory, and none for a shore file, which names its group", () => {
  const model = treeOf(DEMO);
  expect(rowAt(model, 'libs/core/src/pm/tools.ts')).toMatchObject({ kind: 'file', target: 'libs/core/src/pm/tools.ts' });
  expect(rowAt(model, 'libs/core/src/pm')).toMatchObject({ kind: 'directory', target: 'folder:libs/core/src/pm' });
  expect(rowAt(model, 'libs/core')).toMatchObject({ kind: 'directory', target: 'package:libs/core' });
  expect(directoryAt(model, 'libs/core/src').target).toBeUndefined();
  expect(rowAt(model, 'README.md')).toMatchObject({ kind: 'shore', group: 'docs' });
  expect(rowAt(model, 'libs/core/src/__tests__/pm.test.ts')).toMatchObject({ kind: 'shore', group: 'tests' });
  // Every target the line can name lights one row: a file's id its own, a cell's the row at its path, and a single file's module the file's.
  for (const file of DEMO.terrain.organelles) expect(model.index.get(file.id)).toBe(file.path);
  expect(model.index.get('folder:libs/core/src/pm')).toBe('libs/core/src/pm');
  expect(model.index.get('single:apps/cli/src/doctor.ts')).toBe('apps/cli/src/doctor.ts');
  expect(model.index.get('README.md')).toBeUndefined();
});

test('a row wears its change, its ghost and its notices by rank, and a directory counts what stands beneath it', () => {
  const model = treeOf(DEMO);
  expect(rowAt(model, 'libs/core/src/pm/tools.ts').badges).toEqual({ change: 'added', ghost: false, notices: [{ rank: 6, tier: 'tertiary' }], departures: 0 });
  expect(rowAt(model, 'libs/core/src/pm/legacy.ts').badges.change).toBe('deleted');
  expect(rowAt(model, 'libs/core/src/pm/index.ts').badges.notices.map((mark) => mark.rank)).toEqual([1, 2, 3, 4]);
  expect(rowAt(model, 'libs/core/src/util/format.ts').badges).toMatchObject({ ghost: true });
  expect(rowAt(model, 'README.md').badges.change).toBe('modified');
  const pm = directoryAt(model, 'libs/core/src/pm');
  expect(pm.counts).toEqual({ files: 4, placed: 4, changed: 3, changedOnMap: 3, ghosts: 0, notices: [1, 2, 3, 4, 6].map((rank) => expect.objectContaining({ rank })), departures: 0 });
  expect(directoryAt(model, 'libs/core/src/util').counts).toMatchObject({ files: 2, changed: 0, ghosts: 1 });
  expect(directoryAt(model, 'libs/core/dist').counts).toMatchObject({ files: 2, placed: 0 });
  // A notice on a shore file is worn by its row; one on a group or on a slot has no row in the tree.
  const ashore = treeOf({ ...DEMO, notices: [{ ...DEMO.notices[0]!, target: 'README.md' }, { ...DEMO.notices[1]!, target: 'deps' }, { ...DEMO.notices[2]!, target: 'lint' }] });
  expect(rowAt(ashore, 'README.md').badges.notices).toEqual([{ rank: 1, tier: 'primary' }]);
  expect(ashore.counts.notices).toHaveLength(1);
});

test('a closed directory wears all it holds, an open one only its own, and a file its own (D277 (closed-wears-hidden))', () => {
  const model = treeOf(departing([grown('libs/core/src/pm', 'folder:libs/core/src/pm')]));
  const core = directoryAt(model, 'libs/core');
  expect(wornBy(core, false)).toMatchObject({ changed: 4, ghosts: 1, departures: 1 });
  expect(wornBy(core, false).notices.map((mark) => mark.rank)).toEqual([1, 2, 3, 4, 6]);
  expect(wornBy(core, true)).toEqual({ changed: 0, ghosts: 0, notices: [], departures: 0 });
  expect(wornBy(directoryAt(model, 'libs/core/src/pm'), true)).toMatchObject({ changed: 0, notices: [], departures: 1 });
  expect(wornBy(rowAt(model, 'libs/core/src/pm/tools.ts'), false)).toEqual({ changed: 0, ghosts: 0, notices: [{ rank: 6, tier: 'tertiary' }], departures: 0 });
});

test("a departure is worn by its module's row, a module that is gone by the nearest row still standing, and an outside package's by none (D283 (lost-departure))", () => {
  const model = treeOf(
    departing([
      { kind: 'module-removed', target: 'apps', cell: 'directory:apps', why: 'apps is gone' },
      { kind: 'fan-out-up', target: 'apps/cli/src/doctor.ts', cell: 'single:apps/cli/src/doctor.ts', why: 'doctor reaches further', was: 1, now: 3 },
      { kind: 'dependency-added', target: 'kleur', why: 'kleur is new' },
      grown('libs/core/src/pm', 'folder:libs/core/src/pm'),
      { kind: 'module-removed', target: 'libs/core/src/pm/gone/deep', cell: 'directory:libs/core/src/pm/gone/deep', why: 'deep is gone' },
      { kind: 'module-removed', target: 'vendor', cell: 'directory:vendor', why: 'vendor is gone' },
    ]),
  );
  expect(rowAt(model, 'libs/core/src/pm').badges.departures).toBe(2);
  expect(rowAt(model, 'apps/cli/src/doctor.ts').badges.departures).toBe(1);
  // `apps` wears a departure of its own, so it stands as its own row and is not written into `apps/cli`.
  expect(rowAt(model, 'apps')).toMatchObject({ name: 'apps', badges: { departures: 1 } });
  expect(rowAt(model, 'apps/cli').name).toBe('cli');
  expect(directoryAt(model, 'apps').counts.departures).toBe(2);
  // Nothing stands at `vendor` or above it, and an outside package is no row: the header alone counts those two.
  expect(model.counts.departures).toBe(4);
  expect(model.approved).toEqual({ at: SHA, departures: 6 });
});

test("where a package and a directory share a path the row's target is the package, both cells light it, and it wears both cells' departures (D218 (departure-cell))", () => {
  const loose: Cell = { ...DEMO.terrain.cells.find((cell) => cell.id === 'directory:libs/core/src/util')!, id: 'directory:libs/core', path: 'libs/core', organelles: [] };
  const paired = { ...DEMO, terrain: { ...DEMO.terrain, cells: [loose, ...DEMO.terrain.cells] } };
  const model = treeOf(departing([grown('libs/core', 'directory:libs/core'), grown('libs/core', 'package:libs/core')], paired));
  expect(rowAt(model, 'libs/core')).toMatchObject({ target: 'package:libs/core', badges: { departures: 2 } });
  expect(model.index.get('directory:libs/core')).toBe('libs/core');
  expect(model.index.get('package:libs/core')).toBe('libs/core');
});

test('a corpus map folds whole: every listed file once, a package at the root as the one top row, and each shared path the package', () => {
  const model = treeOf(CORPUS);
  const rows = every(model);
  const shore = CORPUS.terrain.groups.flatMap((group) => group.files);
  expect(model.counts).toMatchObject({ files: CORPUS.terrain.organelles.length + shore.length, placed: CORPUS.terrain.organelles.length, changed: CORPUS.weather.changed.length });
  for (const file of CORPUS.terrain.organelles) expect(rows.get(file.path)).toMatchObject({ kind: 'file', target: file.id });
  for (const path of shore) expect(rows.get(path)?.kind).toBe('shore');
  expect(new Set(rowsShown(model, () => true).map((row) => row.node.path)).size).toBe(rows.size);
  // The repo's root holds a module, so it is the one row at the top, named for the repo, open from the start.
  expect(model.roots).toHaveLength(1);
  expect(model.roots[0]).toMatchObject({ kind: 'directory', path: '.', name: 'excalidraw', target: 'package:.' });
  expect(startsOpen(directoryAt(model, '.'))).toBe(true);
  expect(model.index.get('directory:.')).toBe('.');
  const paths = CORPUS.terrain.cells.map((cell) => cell.path);
  const pairs = [...new Set(paths.filter((path, index) => paths.indexOf(path) !== index))];
  expect(pairs).toHaveLength(10);
  expect(pairs).toEqual(expect.arrayContaining(['.', 'examples/with-script-in-browser', 'excalidraw-app', 'packages/common']));
  for (const path of pairs) expect(directoryAt(model, path).target).toBe(`package:${path}`);
  // Every cell lights a row, and every directory's target is a cell standing at its path.
  for (const cell of CORPUS.terrain.cells) expect(rows.has(model.index.get(cell.id) ?? '')).toBe(true);
  // A map with no module at the root has no row for it (the demo), and its top rows are what the root holds.
  expect(treeOf(DEMO).roots.map((node) => node.path)).toEqual(['apps/cli', 'libs/core', '.gitignore', 'README.md', 'notes.xyz', 'package.json', 'pnpm-workspace.yaml', 'tsconfig.json']);
});

test("the rows on show are the top rows and what each open directory holds: a closed one's rows are not made, and a directory holding a change on the map opens unasked (D284 (opens-on-map-change))", () => {
  const model = treeOf(DEMO);
  expect(rowsShown(model, () => false).map((row) => row.node.path)).toEqual(model.roots.map((node) => node.path));
  const atStart = rowsShown(model, startsOpen).map((row) => row.node.path);
  // `util` holds a ghost and `dist` build output, but no change: both stay closed.
  expect(atStart).toContain('libs/core/src/pm/tools.ts');
  expect(atStart).toContain('libs/core/src/util');
  expect(atStart).not.toContain('libs/core/src/util/format.ts');
  expect(atStart).not.toContain('libs/core/dist/index.js');
  // `__tests__` holds a changed file, but one not on the map: it stays closed, and wears the change.
  expect(atStart).toContain('libs/core/src/__tests__');
  expect(atStart).not.toContain('libs/core/src/__tests__/pm.test.ts');
  expect(startsOpen(directoryAt(model, 'libs/core/src/__tests__'))).toBe(false);
  expect(wornBy(directoryAt(model, 'libs/core/src/__tests__'), false).changed).toBe(1);
  expect(rowsShown(model, startsOpen).find((row) => row.node.path === 'libs/core/src/pm/tools.ts')?.depth).toBe(3);
  expect(lineOf(model, 'libs/core/src/pm/tools.ts')).toEqual(['libs/core/src/pm', 'libs/core/src', 'libs/core']);
  expect(lineOf(model, 'README.md')).toEqual([]);
  // On the corpus map most of its 1,244 files are no rows until a reader opens their directories.
  const corpus = treeOf(CORPUS);
  expect(rowsShown(corpus, startsOpen).length).toBeLessThan(every(corpus).size / 2);
});

test("the header's line says how far the map departs from the approved shape and since when, or, muted, that none was approved (D210 (approved-block))", () => {
  expect(approvedLine(treeOf(DEMO))).toEqual({ words: 'no approved shape yet: run atis approve', muted: true });
  expect(approvedLine(treeOf(departing([])))).toEqual({ words: 'since approved a1b2c3d: no departures', muted: false });
  expect(approvedLine(treeOf(departing([grown('libs/core/src/pm', 'folder:libs/core/src/pm')]))).words).toBe('since approved a1b2c3d: 1 departure');
  const two = [grown('libs/core/src/pm', 'folder:libs/core/src/pm'), { kind: 'dependency-added', target: 'kleur', why: 'kleur is new' } as const];
  expect(approvedLine(treeOf(departing(two))).words).toBe('since approved a1b2c3d: 2 departures');
  expect(approvedLine(treeOf({ ...DEMO, approved: { at: 'working-tree', departures: two } })).words).toBe('since approved working tree: 2 departures');
  expect([0, 1, 2].map(departureWords)).toEqual(['no departures', '1 departure', '2 departures']);
});

test('a row is scrolled to only as far as it takes to show under the header: up past the header, down to the foot, and not at all in view', () => {
  const view = { top: 0, bottom: 600 };
  expect(nudge(view, { top: 300, bottom: 316 }, 24)).toBe(0);
  expect(nudge(view, { top: 10, bottom: 26 }, 24)).toBe(-14);
  expect(nudge(view, { top: -100, bottom: -84 }, 24)).toBe(-124);
  expect(nudge(view, { top: 700, bottom: 716 }, 24)).toBe(116);
  expect(nudge({ top: 50, bottom: 650 }, { top: 60, bottom: 76 }, 0)).toBe(0);
});
