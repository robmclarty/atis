import { expect, test } from 'vitest';

import { computePackageTies, computeTies } from '../ties.js';

const edge = (from: string, to: string) => ({ from, to });

/** A folder cell `pm` with a barrel and two siblings, a cell `util` it reads from, and a loose file in a cell of its own. */
const ORGANELLES = [
  { path: 'src/pm/index.ts', cell: 'folder:src/pm' },
  { path: 'src/pm/slots.ts', cell: 'folder:src/pm' },
  { path: 'src/pm/tools.ts', cell: 'folder:src/pm' },
  { path: 'src/util/format.ts', cell: 'folder:src/util' },
  { path: 'src/util/text.ts', cell: 'folder:src/util' },
  { path: 'src/cli/main.ts', cell: 'folder:src/cli' },
  { path: 'src/cli/orphan.ts', cell: 'folder:src/cli' },
];

const NONE: ReadonlySet<string> = new Set();

test('a barrel held by its siblings counts every edge to them inside, in either direction', () => {
  const ties = computeTies(
    ORGANELLES,
    [edge('src/pm/index.ts', 'src/pm/slots.ts'), edge('src/pm/index.ts', 'src/pm/tools.ts'), edge('src/pm/tools.ts', 'src/pm/index.ts')],
    NONE,
  );
  expect(ties.get('src/pm/index.ts')).toEqual({ inside: 3, outside: 0 });
  expect(ties.get('src/pm/tools.ts')).toEqual({ inside: 2, outside: 0 });
});

test('a file whose imports all leave its cell is tied only outside, and the files it reads count it too', () => {
  const ties = computeTies(ORGANELLES, [edge('src/cli/main.ts', 'src/pm/index.ts'), edge('src/cli/main.ts', 'src/util/text.ts')], NONE);
  expect(ties.get('src/cli/main.ts')).toEqual({ inside: 0, outside: 2 });
  expect(ties.get('src/pm/index.ts')).toEqual({ inside: 0, outside: 1 });
  expect(ties.get('src/util/text.ts')).toEqual({ inside: 0, outside: 1 });
});

test('a file with no ties carries two zeros, which is wholly loose, not an absent key', () => {
  const ties = computeTies(ORGANELLES, [edge('src/cli/main.ts', 'src/pm/index.ts')], NONE);
  expect(ties.get('src/cli/orphan.ts')).toEqual({ inside: 0, outside: 0 });
});

test('an edge to a test or a shore file ties nothing, since neither is terrain (D4)', () => {
  const ties = computeTies(
    ORGANELLES,
    [edge('src/pm/__tests__/pm.test.ts', 'src/pm/index.ts'), edge('src/pm/index.ts', 'vite.config.ts')],
    NONE,
  );
  expect(ties.get('src/pm/index.ts')).toEqual({ inside: 0, outside: 0 });
  expect(ties.has('src/pm/__tests__/pm.test.ts')).toBe(false);
});

test('a deleted file carries no ties, and an edge to it ties nothing on the head graph (C2)', () => {
  const ties = computeTies(ORGANELLES, [edge('src/pm/index.ts', 'src/pm/slots.ts')], new Set(['src/pm/slots.ts']));
  expect(ties.has('src/pm/slots.ts')).toBe(false);
  expect(ties.get('src/pm/index.ts')).toEqual({ inside: 1, outside: 0 });
});

test('a repeated edge counts once, and a file importing itself ties nothing', () => {
  const ties = computeTies(
    ORGANELLES,
    [edge('src/util/format.ts', 'src/util/text.ts'), edge('src/util/format.ts', 'src/util/text.ts'), edge('src/util/text.ts', 'src/util/text.ts')],
    NONE,
  );
  expect(ties.get('src/util/format.ts')).toEqual({ inside: 1, outside: 0 });
  expect(ties.get('src/util/text.ts')).toEqual({ inside: 1, outside: 0 });
});

/** A package `core` with a barrel, a single-file module and a folder; a package `cli` with one module; and a loose script in no package. */
const PACKAGED = [
  { path: 'libs/core/src/index.ts', cell: 'package:libs/core' },
  { path: 'libs/core/src/slots.ts', cell: 'single:libs/core/src/slots.ts' },
  { path: 'libs/core/src/pm/index.ts', cell: 'folder:libs/core/src/pm' },
  { path: 'apps/cli/src/doctor.ts', cell: 'single:apps/cli/src/doctor.ts' },
  { path: 'scripts/build.ts', cell: 'directory:scripts' },
];

const CELLS = [
  { id: 'package:libs/core', kind: 'package' },
  { id: 'single:libs/core/src/slots.ts', kind: 'single', parent: 'package:libs/core' },
  { id: 'folder:libs/core/src/pm', kind: 'folder', parent: 'package:libs/core' },
  { id: 'package:apps/cli', kind: 'package' },
  { id: 'single:apps/cli/src/doctor.ts', kind: 'single', parent: 'package:apps/cli' },
  { id: 'directory:scripts', kind: 'directory' },
] as const;

test("a single-file module is tied inside to its package's siblings, though its own cell holds nothing else (D167)", () => {
  const ties = computePackageTies(
    PACKAGED,
    CELLS,
    [edge('libs/core/src/index.ts', 'libs/core/src/slots.ts'), edge('libs/core/src/slots.ts', 'libs/core/src/pm/index.ts')],
    NONE,
  );
  expect(ties.get('libs/core/src/slots.ts')).toEqual({ inside: 2, outside: 0 });
  // The barrel's cell is the package itself, so it is tied at home too.
  expect(ties.get('libs/core/src/index.ts')).toEqual({ inside: 1, outside: 0 });
});

test('a module whose imports all leave its package is tied only outside, and a file in no package still ties it outside', () => {
  const ties = computePackageTies(
    PACKAGED,
    CELLS,
    [edge('apps/cli/src/doctor.ts', 'libs/core/src/index.ts'), edge('apps/cli/src/doctor.ts', 'libs/core/src/pm/index.ts'), edge('scripts/build.ts', 'apps/cli/src/doctor.ts')],
    NONE,
  );
  expect(ties.get('apps/cli/src/doctor.ts')).toEqual({ inside: 0, outside: 3 });
  expect(ties.get('libs/core/src/pm/index.ts')).toEqual({ inside: 0, outside: 1 });
});

test('a file in no package carries no package ties, nor does a deleted one (C2)', () => {
  const ties = computePackageTies(
    PACKAGED,
    CELLS,
    [edge('scripts/build.ts', 'libs/core/src/index.ts'), edge('libs/core/src/index.ts', 'libs/core/src/slots.ts')],
    new Set(['libs/core/src/slots.ts']),
  );
  expect(ties.has('scripts/build.ts')).toBe(false);
  expect(ties.has('libs/core/src/slots.ts')).toBe(false);
  expect(ties.get('libs/core/src/index.ts')).toEqual({ inside: 1, outside: 1 });
});

test('package ties leave out a test and a shore file, as cell ties do (D4)', () => {
  const ties = computePackageTies(
    PACKAGED,
    CELLS,
    [edge('libs/core/src/__tests__/slots.test.ts', 'libs/core/src/slots.ts'), edge('libs/core/src/slots.ts', 'libs/core/vite.config.ts')],
    NONE,
  );
  expect(ties.get('libs/core/src/slots.ts')).toEqual({ inside: 0, outside: 0 });
});
