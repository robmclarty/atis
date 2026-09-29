import { expect, test } from 'vitest';

import { DEFAULT_CONFIG } from '../config.js';
import { configMatcher } from '../groups.js';
import { classifyFile, identifyModules, memberOf } from '../modules.js';
import type { ImportEdge, ModuleCell, Modules, ScannedFile } from '../modules.js';

const isConfig = configMatcher(DEFAULT_CONFIG.groups);

/** A scanned file with `loc` lines and `exports` exported names. */
function file(path: string, loc = 10, exports = 0): ScannedFile {
  return { path, loc, exports: Array.from({ length: exports }, (_, index) => `name${String(index)}`) };
}

function edge(from: string, to: string): ImportEdge {
  return { from, to };
}

function cellIn(modules: Modules, id: string): ModuleCell {
  const found = modules.cells.find((cell) => cell.id === id);
  if (found === undefined) throw new Error(`no cell ${id} among ${modules.cells.map((cell) => cell.id).join(', ')}`);
  return found;
}

function cellIds(modules: Modules): readonly string[] {
  return modules.cells.map((cell) => cell.id);
}

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
  ['README.md', 'other'],
  ['scripts/release.mjs', 'other'],
  ['test/fixtures/biome.json', 'other'],
])('classifyFile(%s) is %s', (path, kind) => {
  expect(classifyFile(path)).toBe(kind);
});

test('a .ts that configures a tool is shore, not terrain, once the config table is in hand (D57)', () => {
  // `*.config.*` and the `config` row's other patterns, at the root or nested.
  expect(classifyFile('vitest.config.ts', isConfig)).toBe('other');
  expect(classifyFile('packages/app/vite.config.tsx', isConfig)).toBe('other');
  expect(classifyFile('rules/no-raw-fetch.ts', isConfig)).toBe('other');
  // A test under the config row is still evidence: the test read comes first (D4).
  expect(classifyFile('src/theme.config.test.ts', isConfig)).toBe('test');
  // A name that merely contains "config" is ordinary terrain.
  expect(classifyFile('src/config.ts', isConfig)).toBe('source');
  // Without the table, the name-only read leaves it terrain, the fallback the graph sources take.
  expect(classifyFile('vitest.config.ts')).toBe('source');
});

test('a .mts or .cts file sorts as a .ts does: an organelle, a test, or tool config (D77)', () => {
  const modules = identifyModules(
    [
      file('benchmarks/handle-event/index.mts', 30, 1),
      file('src/loader.cts', 20, 1),
      file('src/handler.test.mts', 40),
      file('vite.config.mts', 10, 1),
    ],
    [],
    [],
    isConfig,
  );

  expect(classifyFile('vite.config.mts', isConfig)).toBe('other');
  expect(modules.organelles.map((organelle) => [organelle.path, organelle.cell])).toEqual([
    ['benchmarks/handle-event/index.mts', 'directory:benchmarks/handle-event'],
    ['src/loader.cts', 'single:src/loader.cts'],
  ]);
});

test('memberOf picks the innermost member and normalises the roots', () => {
  const roots = ['.', './packages/core/', 'packages/core/examples/demo'];
  expect(memberOf('packages/core/src/index.ts', roots)).toBe('packages/core');
  expect(memberOf('packages/core/examples/demo/main.ts', roots)).toBe('packages/core/examples/demo');
  expect(memberOf('packages/corelib/index.ts', roots)).toBe('');
  expect(memberOf('packages/corelib/index.ts', ['packages/core'])).toBeUndefined();
});

test('a flat src/ is one package: its barrel alone is direct, each file a single cell, tests left out', () => {
  const modules = identifyModules(
    [
      file('src/orchestrator.ts', 60, 1),
      file('src/index.ts', 5, 3),
      file('src/doctor.ts', 40, 2),
      file('src/__tests__/doctor.test.ts', 80),
      file('src/doctor.spec.ts', 20),
      file('test/e2e/cli.ts', 30),
      file('README.md', 12),
    ],
    [edge('src/index.ts', 'src/doctor.ts')],
    [],
  );

  expect(modules).toEqual({
    cells: [
      {
        id: 'package:.',
        path: '.',
        kind: 'package',
        barrel: 'src/index.ts',
        organelles: ['src/index.ts'],
        interface_files: ['src/index.ts'],
        interface_size: 3,
        body_loc: 105,
      },
      {
        id: 'single:src/doctor.ts',
        path: 'src/doctor.ts',
        kind: 'single',
        parent: 'package:.',
        organelles: ['src/doctor.ts'],
        interface_files: ['src/doctor.ts'],
        interface_size: 2,
        body_loc: 40,
      },
      {
        id: 'single:src/orchestrator.ts',
        path: 'src/orchestrator.ts',
        kind: 'single',
        parent: 'package:.',
        organelles: ['src/orchestrator.ts'],
        interface_files: ['src/orchestrator.ts'],
        interface_size: 1,
        body_loc: 60,
      },
    ],
    organelles: [
      { id: 'src/doctor.ts', path: 'src/doctor.ts', cell: 'single:src/doctor.ts', loc: 40 },
      { id: 'src/index.ts', path: 'src/index.ts', cell: 'package:.', loc: 5 },
      { id: 'src/orchestrator.ts', path: 'src/orchestrator.ts', cell: 'single:src/orchestrator.ts', loc: 60 },
    ],
  });
});

test('a folder module owns everything beneath it; a barrel-less folder falls back to its directory', () => {
  const modules = identifyModules(
    [
      file('src/index.ts', 4, 2),
      file('src/doctor.ts', 40, 1),
      file('src/pm/index.ts', 8, 4),
      file('src/pm/tools.ts', 120, 3),
      file('src/pm/detect/lockfile.ts', 30, 1),
      file('src/types/slot.ts', 15, 2),
      file('src/types/verdict.ts', 5, 1),
    ],
    [
      edge('src/doctor.ts', 'src/pm/index.ts'),
      edge('src/doctor.ts', 'src/types/slot.ts'),
      edge('src/types/slot.ts', 'src/types/verdict.ts'),
      edge('src/pm/tools.ts', 'src/pm/detect/lockfile.ts'),
    ],
    [],
  );

  expect(cellIds(modules)).toEqual(['directory:src/types', 'folder:src/pm', 'package:.', 'single:src/doctor.ts']);
  expect(cellIn(modules, 'folder:src/pm')).toEqual({
    id: 'folder:src/pm',
    path: 'src/pm',
    kind: 'folder',
    parent: 'package:.',
    barrel: 'src/pm/index.ts',
    organelles: ['src/pm/detect/lockfile.ts', 'src/pm/index.ts', 'src/pm/tools.ts'],
    interface_files: ['src/pm/index.ts'],
    interface_size: 4,
    body_loc: 158,
  });
  expect(cellIn(modules, 'directory:src/types')).toEqual({
    id: 'directory:src/types',
    path: 'src/types',
    kind: 'directory',
    parent: 'package:.',
    organelles: ['src/types/slot.ts', 'src/types/verdict.ts'],
    interface_files: ['src/types/slot.ts'],
    interface_size: 2,
    body_loc: 20,
  });
  expect(cellIn(modules, 'package:.')).toMatchObject({ organelles: ['src/index.ts'], body_loc: 222 });
});

test('a root config .ts beside workspace members is shore: no `directory:.` cell, no empty `package:.` (D57)', () => {
  const modules = identifyModules(
    [
      file('apps/atis/src/cli.ts', 8),
      file('apps/atis/src/index.ts', 30, 4),
      file('apps/atis/src/__tests__/index.test.ts', 40),
      file('libs/core/src/index.ts', 6, 12),
      file('libs/core/src/schema.ts', 300, 20),
      file('libs/core/src/layout/index.ts', 3, 1),
      file('libs/core/src/layout/force.ts', 90, 1),
      file('libs/core/src/__tests__/schema.test.ts', 190),
      file('vitest.config.ts', 35, 1),
    ],
    [edge('apps/atis/src/cli.ts', 'apps/atis/src/index.ts'), edge('apps/atis/src/index.ts', 'libs/core/src/index.ts')],
    ['.', 'apps/atis', './libs/core/'],
    isConfig,
  );

  // The config file founds no cell of its own and drags no empty root package
  // into being: before D57 the spike drew a `directory:.` and a `package:.`
  // beside it, and both are gone now.
  expect(cellIds(modules)).toEqual([
    'folder:libs/core/src/layout',
    'package:apps/atis',
    'package:libs/core',
    'single:apps/atis/src/cli.ts',
    'single:libs/core/src/schema.ts',
  ]);
  expect(cellIds(modules)).not.toContain('directory:.');
  expect(cellIds(modules)).not.toContain('package:.');
  expect(modules.organelles.map((organelle) => organelle.path)).not.toContain('vitest.config.ts');

  // The members are still packaged exactly as before.
  expect(cellIn(modules, 'package:libs/core')).toEqual({
    id: 'package:libs/core',
    path: 'libs/core',
    kind: 'package',
    barrel: 'libs/core/src/index.ts',
    organelles: ['libs/core/src/index.ts'],
    interface_files: ['libs/core/src/index.ts'],
    interface_size: 12,
    body_loc: 399,
  });
  expect(cellIn(modules, 'folder:libs/core/src/layout').parent).toBe('package:libs/core');
  expect(cellIn(modules, 'single:apps/atis/src/cli.ts').parent).toBe('package:apps/atis');
});

test('packages/*: .tsx barrels, loose package files, a barrel-less package and an empty member', () => {
  const modules = identifyModules(
    [
      file('packages/core/src/index.ts', 10, 5),
      file('packages/core/src/nodes/task.ts', 50, 2),
      file('packages/core/src/nodes/gate.ts', 20, 1),
      file('packages/core/vite.config.ts', 12, 1),
      file('packages/studio/src/index.tsx', 6, 2),
      file('packages/studio/src/components/index.tsx', 4, 1),
      file('packages/studio/src/components/Canvas.tsx', 70, 1),
      file('packages/legacy/lib/parse.ts', 40, 2),
      file('packages/legacy/lib/internal.ts', 25, 3),
      file('packages/docs-site/README.md', 10),
    ],
    [
      edge('packages/core/src/index.ts', 'packages/core/src/nodes/task.ts'),
      edge('packages/core/src/nodes/task.ts', 'packages/core/src/nodes/gate.ts'),
      edge('packages/core/src/nodes/task.ts', 'packages/legacy/lib/parse.ts'),
      edge('packages/legacy/lib/parse.ts', 'packages/legacy/lib/internal.ts'),
    ],
    ['packages/core', 'packages/studio', 'packages/legacy', 'packages/docs-site'],
  );

  expect(cellIds(modules)).toEqual([
    'directory:packages/core',
    'directory:packages/core/src/nodes',
    'directory:packages/legacy/lib',
    'folder:packages/studio/src/components',
    'package:packages/core',
    'package:packages/legacy',
    'package:packages/studio',
  ]);
  expect(cellIn(modules, 'package:packages/studio').barrel).toBe('packages/studio/src/index.tsx');
  expect(cellIn(modules, 'folder:packages/studio/src/components').barrel).toBe('packages/studio/src/components/index.tsx');
  expect(cellIn(modules, 'directory:packages/core')).toMatchObject({
    parent: 'package:packages/core',
    organelles: ['packages/core/vite.config.ts'],
  });
  expect(cellIn(modules, 'directory:packages/core/src/nodes')).toMatchObject({
    interface_files: ['packages/core/src/nodes/task.ts'],
    interface_size: 2,
  });
  expect(cellIn(modules, 'package:packages/legacy')).toEqual({
    id: 'package:packages/legacy',
    path: 'packages/legacy',
    kind: 'package',
    organelles: [],
    interface_files: ['packages/legacy/lib/parse.ts'],
    interface_size: 2,
    body_loc: 65,
  });
  expect(cellIn(modules, 'directory:packages/legacy/lib').interface_files).toEqual(['packages/legacy/lib/parse.ts']);
});

test('a barrel-less repo with no workspace falls back to directory cells, interfaces from outside importers', () => {
  const modules = identifyModules(
    [
      file('index.ts', 5, 1),
      file('main.ts', 20),
      file('lib/a.ts', 30, 2),
      file('lib/b.ts', 10, 1),
      file('lib/util/index.ts', 2, 4),
      file('lib/util/c.ts', 15, 3),
      file('test/a.ts', 25),
    ],
    [
      edge('main.ts', 'lib/a.ts'),
      edge('lib/a.ts', 'lib/b.ts'),
      edge('lib/a.ts', 'lib/util/c.ts'),
      edge('lib/b.ts', 'lib/util/c.ts'),
      edge('lib/b.ts', 'lib/b.ts'),
      edge('test/a.ts', 'lib/b.ts'),
      edge('lib/a.ts', 'node_modules/zod/index.ts'),
    ],
    [],
  );

  expect(modules.cells).toEqual([
    {
      id: 'directory:.',
      path: '.',
      kind: 'directory',
      parent: 'package:.',
      organelles: ['index.ts', 'main.ts'],
      interface_files: [],
      interface_size: 0,
      body_loc: 25,
    },
    {
      id: 'directory:lib',
      path: 'lib',
      kind: 'directory',
      parent: 'package:.',
      organelles: ['lib/a.ts', 'lib/b.ts'],
      interface_files: ['lib/a.ts'],
      interface_size: 2,
      body_loc: 40,
    },
    {
      id: 'directory:lib/util',
      path: 'lib/util',
      kind: 'directory',
      parent: 'package:.',
      organelles: ['lib/util/c.ts', 'lib/util/index.ts'],
      interface_files: ['lib/util/c.ts'],
      interface_size: 3,
      body_loc: 17,
    },
    {
      id: 'package:.',
      path: '.',
      kind: 'package',
      organelles: [],
      interface_files: [],
      interface_size: 0,
      body_loc: 82,
    },
  ]);
});

test('a library root with example members: the root src/ makes the root a package of its own', () => {
  const modules = identifyModules(
    [
      file('src/index.ts', 10, 6),
      file('src/core/index.ts', 5, 2),
      file('src/core/flow.ts', 80, 1),
      file('tsdown.config.ts', 9, 1),
      file('examples/pr-improve/src/index.ts', 4, 1),
      file('examples/pr-improve/src/main.ts', 60),
    ],
    [edge('examples/pr-improve/src/main.ts', 'src/index.ts')],
    ['examples/pr-improve'],
  );

  expect(cellIds(modules)).toEqual([
    'directory:.',
    'folder:src/core',
    'package:.',
    'package:examples/pr-improve',
    'single:examples/pr-improve/src/main.ts',
  ]);
  expect(cellIn(modules, 'package:.')).toMatchObject({ barrel: 'src/index.ts', body_loc: 104 });
  expect(cellIn(modules, 'directory:.').parent).toBe('package:.');
  expect(cellIn(modules, 'package:examples/pr-improve')).toMatchObject({
    barrel: 'examples/pr-improve/src/index.ts',
    body_loc: 64,
  });
});

test('the same inputs in any order, with duplicates, give the same modules', () => {
  const files = [
    file('src/index.ts', 4, 2),
    file('src/pm/index.ts', 8, 4),
    file('src/pm/tools.ts', 120, 3),
    file('lib/a.ts', 30, 2),
    file('lib/b.ts', 10, 1),
  ];
  const edges = [edge('src/pm/tools.ts', 'lib/a.ts'), edge('lib/a.ts', 'lib/b.ts'), edge('src/index.ts', 'lib/b.ts')];
  const once = identifyModules(files, edges, []);

  expect(identifyModules([...files, ...files].toReversed(), edges.toReversed(), [])).toEqual(once);
  expect(cellIds(once)).toEqual(['directory:lib', 'folder:src/pm', 'package:.']);
  expect(cellIn(once, 'directory:lib').interface_files).toEqual(['lib/a.ts', 'lib/b.ts']);
});
