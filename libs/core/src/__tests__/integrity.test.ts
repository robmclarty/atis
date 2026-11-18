import { expect, test } from 'vitest';

import { computeIntegrity } from '../integrity.js';
import { identifyModules } from '../modules.js';
import type { ImportEdge, ScannedFile } from '../modules.js';
import type { Integrity } from '../schema.js';
import { typed } from './scanned.js';

const edge = (from: string, to: string): ImportEdge => ({ from, to });

/**
 * A package `core` with a barrel, a single-file module and two folder
 * modules, one with a test; a package `cli` that reads it; and a directory
 * of loose scripts with no barrel.
 */
const PATHS = [
  'libs/core/src/index.ts',
  'libs/core/src/slots.ts',
  'libs/core/src/pm/index.ts',
  'libs/core/src/pm/tools.ts',
  'libs/core/src/pm/__tests__/pm.test.ts',
  'libs/core/src/util/index.ts',
  'libs/core/src/util/text.ts',
  'apps/cli/src/index.ts',
  'apps/cli/src/doctor.ts',
  'scripts/build.ts',
  'scripts/lint.ts',
];

const ROOTS = ['apps/cli', 'libs/core'];
const CORE = 'package:libs/core';
const PM = 'folder:libs/core/src/pm';
const UTIL = 'folder:libs/core/src/util';
const NONE: ReadonlySet<string> = new Set();

/** The scan's integrity: its files grouped into cells as the map groups them, then counted over `edges` as the head graph. */
function integrityOf(edges: readonly ImportEdge[], deleted: ReadonlySet<string> = NONE): ReadonlyMap<string, Integrity> {
  const files = PATHS.map((path): ScannedFile => ({ ...typed(path), loc: 10, exports: [] }));
  return computeIntegrity(identifyModules(files, edges, ROOTS).cells, edges, deleted);
}

test('the hand-built scan groups into the cells the cases below name', () => {
  const files = PATHS.map((path): ScannedFile => ({ ...typed(path), loc: 10, exports: [] }));
  expect(identifyModules(files, [], ROOTS).cells.map((cell) => cell.id).toSorted()).toEqual([
    'directory:scripts',
    PM,
    UTIL,
    'package:apps/cli',
    CORE,
    'single:apps/cli/src/doctor.ts',
    'single:libs/core/src/slots.ts',
  ]);
});

test('a folder imported on its barrel from a sibling folder is entered through it (D192)', () => {
  const integrity = integrityOf([edge('libs/core/src/util/text.ts', 'libs/core/src/pm/index.ts')]);
  expect(integrity.get(PM)).toEqual({ through: 1, past: 0 });
  // The importer reads out, which enters nothing of its own cell.
  expect(integrity.get(UTIL)).toEqual({ through: 0, past: 0 });
});

test('a folder imported on a file behind its barrel from a sibling folder is entered past it', () => {
  const integrity = integrityOf([edge('libs/core/src/util/text.ts', 'libs/core/src/pm/tools.ts')]);
  expect(integrity.get(PM)).toEqual({ through: 0, past: 1 });
});

test("another package's import onto a nested folder's barrel comes through the folder and past the package", () => {
  const integrity = integrityOf([edge('apps/cli/src/doctor.ts', 'libs/core/src/pm/index.ts')]);
  expect(integrity.get(PM)).toEqual({ through: 1, past: 0 });
  expect(integrity.get(CORE)).toEqual({ through: 0, past: 1 });
});

test("an import between two cells of one package enters the folder and nothing of the package, whose contour holds both ends", () => {
  const integrity = integrityOf([
    edge('libs/core/src/slots.ts', 'libs/core/src/pm/tools.ts'),
    edge('libs/core/src/index.ts', 'libs/core/src/pm/index.ts'),
    edge('libs/core/src/pm/index.ts', 'libs/core/src/pm/tools.ts'),
  ]);
  expect(integrity.get(PM)).toEqual({ through: 1, past: 1 });
  expect(integrity.get(CORE)).toEqual({ through: 0, past: 0 });
});

test("a package imported on its own barrel from another package is entered through it", () => {
  const integrity = integrityOf([edge('apps/cli/src/doctor.ts', 'libs/core/src/index.ts'), edge('scripts/build.ts', 'libs/core/src/slots.ts')]);
  expect(integrity.get(CORE)).toEqual({ through: 1, past: 1 });
});

test('a directory with no barrel and a single-file cell carry no integrity, however they are imported (C2)', () => {
  const integrity = integrityOf([
    edge('apps/cli/src/doctor.ts', 'scripts/build.ts'),
    edge('scripts/lint.ts', 'libs/core/src/slots.ts'),
    edge('libs/core/src/index.ts', 'libs/core/src/slots.ts'),
  ]);
  expect(integrity.has('directory:scripts')).toBe(false);
  expect(integrity.has('single:libs/core/src/slots.ts')).toBe(false);
  expect(integrity.has('single:apps/cli/src/doctor.ts')).toBe(false);
  expect([...integrity.keys()].toSorted()).toEqual([PM, UTIL, 'package:apps/cli', CORE]);
});

test('a test file importing past a barrel counts nothing, since a test is no terrain (D4)', () => {
  const integrity = integrityOf([
    edge('libs/core/src/pm/__tests__/pm.test.ts', 'libs/core/src/util/text.ts'),
    edge('libs/core/src/pm/__tests__/pm.test.ts', 'libs/core/src/util/index.ts'),
    edge('libs/core/src/util/text.ts', 'vite.config.ts'),
  ]);
  expect(integrity.get(UTIL)).toEqual({ through: 0, past: 0 });
  expect(integrity.get(CORE)).toEqual({ through: 0, past: 0 });
});

test('the same edge twice counts once, and a file importing itself counts nothing', () => {
  const integrity = integrityOf([
    edge('libs/core/src/util/text.ts', 'libs/core/src/pm/tools.ts'),
    edge('libs/core/src/util/text.ts', 'libs/core/src/pm/tools.ts'),
    edge('libs/core/src/pm/tools.ts', 'libs/core/src/pm/tools.ts'),
  ]);
  expect(integrity.get(PM)).toEqual({ through: 0, past: 1 });
});

test('a cell whose barrel the change deleted carries no integrity, since it has no interface at head (C2)', () => {
  const edges = [edge('libs/core/src/util/text.ts', 'libs/core/src/pm/tools.ts')];
  const integrity = integrityOf(edges, new Set(['libs/core/src/pm/index.ts', 'libs/core/src/pm/tools.ts']));
  expect(integrity.has(PM)).toBe(false);
  expect(integrity.get(UTIL)).toEqual({ through: 0, past: 0 });
});

test('the same scan gives the same counts (C3)', () => {
  const edges = [edge('apps/cli/src/doctor.ts', 'libs/core/src/pm/index.ts'), edge('apps/cli/src/doctor.ts', 'libs/core/src/util/text.ts')];
  expect([...integrityOf(edges)]).toEqual([...integrityOf(edges)]);
});
