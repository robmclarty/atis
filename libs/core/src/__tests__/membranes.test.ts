import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

import { DEFAULT_CONFIG } from '../config.js';
import { computeLayout, computeMembranes, membraneThickness, withinContour } from '../layout/index.js';
import type { LayoutInput, MembraneCell } from '../layout/index.js';
import { buildMap } from '../map.js';
import type { BuildInputs } from '../map.js';
import type { Band, Group, Organelle, Position } from '../schema.js';

/**
 * The fixture is a small repository with every shape a membrane has to
 * handle: a package whose barrel sits over a single-file cell (so the
 * package's skin holds a cell, D45), a folder module whose files stand on
 * two terraces (so its skin is stretched across the strip line, §5.1), a
 * folder that sits on one, and a loose directory at the bottom; beside them
 * a shore with a test file that has no place on it (D4).
 */
const FILES: readonly (readonly [cell: string, path: string, band: number])[] = [
  ['package:apps/x', 'apps/x/src/index.ts', 0],
  ['single:apps/x/src/main.ts', 'apps/x/src/main.ts', 1],
  ['folder:libs/a/src', 'libs/a/src/a0.ts', 1],
  ['folder:libs/a/src', 'libs/a/src/a1.ts', 2],
  ['folder:libs/a/src', 'libs/a/src/a2.ts', 1],
  ['folder:libs/a/src', 'libs/a/src/a3.ts', 2],
  ['folder:libs/a/src', 'libs/a/src/a4.ts', 1],
  ['folder:libs/b/src', 'libs/b/src/b0.ts', 2],
  ['folder:libs/b/src', 'libs/b/src/b1.ts', 2],
  ['folder:libs/b/src', 'libs/b/src/b2.ts', 2],
  ['folder:libs/b/src', 'libs/b/src/b3.ts', 2],
  ['directory:libs/c', 'libs/c/c0.ts', 3],
  ['directory:libs/c', 'libs/c/c1.ts', 3],
  ['directory:libs/c', 'libs/c/c2.ts', 3],
];

const GROUPS: readonly Group[] = [
  { id: 'docs', files: ['README.md', 'docs/a.md', 'docs/b.md', 'docs/c.md', 'docs/d.md'] },
  { id: 'deps', files: ['package.json', 'pnpm-workspace.yaml'] },
  { id: 'tests', files: ['libs/a/src/__tests__/a.test.ts'] },
  { id: 'other', files: ['notes.xyz'] },
];

function organelleAt([cell, path, band]: (typeof FILES)[number], index: number): Organelle {
  return { id: path, path, cell, band, reachable: true, loc: 40 + ((index * 53) % 300), dents: [] };
}

function fixture(): LayoutInput {
  const organelles = FILES.map(organelleAt);
  const ids = [...new Set(FILES.map(([cell]) => cell))];
  const cells: readonly MembraneCell[] = ids.map((id) => ({
    id,
    ...(id === 'single:apps/x/src/main.ts' ? { parent: 'package:apps/x' } : {}),
    organelles: FILES.flatMap(([cell, path]) => (cell === id ? [path] : [])),
  }));
  // A chain down through the files, so the forces have a structure to find.
  const edges = FILES.flatMap(([, path], index) => (index === 0 ? [] : [{ from: FILES[index - 1]?.[1] ?? '', to: path }]));
  const bands: readonly Band[] = [0, 1, 2, 3].map((index) => ({ index, depth_min: index, depth_max: index }));
  return { cells, organelles, edges, bands, groups: GROUPS, added: new Set() };
}

const INPUT = fixture();
const FIELD = computeLayout(INPUT);
const CONTOURS = FIELD.contours ?? {};

/** Who a skin holds: the cell's own files and those of every cell beneath it (D45). */
function heldBy(cell: string): ReadonlySet<string> {
  const below = INPUT.cells.filter((candidate) => candidate.id === cell || candidate.parent === cell);
  return new Set(below.flatMap((candidate) => candidate.organelles));
}

function contourOf(id: string): NonNullable<(typeof CONTOURS)[string]> {
  const contour = CONTOURS[id];
  if (contour === undefined) throw new Error(`no contour for ${id}`);
  return contour;
}

function at(id: string): Position {
  const position = FIELD.positions[id];
  if (position === undefined) throw new Error(`no position for ${id}`);
  return position;
}

test('one contour per cell and per shore group with a mark, and none for the tests', () => {
  const cells = INPUT.cells.map((cell) => cell.id);
  expect(Object.keys(CONTOURS)).toEqual([...cells, 'deps', 'docs', 'other'].toSorted());
  // The keys are in path order, so the file is the same bytes every time (C3).
  expect(Object.keys(CONTOURS)).toEqual(Object.keys(CONTOURS).toSorted());
});

test('every member centre is inside its skin and every other centre is outside it', () => {
  const placed = Object.entries(FIELD.positions);
  expect(placed.length).toBeGreaterThan(FILES.length);

  for (const cell of INPUT.cells) {
    const held = heldBy(cell.id);
    for (const [id, position] of placed) {
      expect(withinContour(contourOf(cell.id), position.x, position.y), `${id} against ${cell.id}`).toBe(held.has(id));
    }
  }
  for (const group of GROUPS) {
    if (group.id === 'tests') continue;
    const held = new Set(group.files);
    for (const [id, position] of placed) {
      expect(withinContour(contourOf(group.id), position.x, position.y), `${id} against ${group.id}`).toBe(held.has(id));
    }
  }
});

test('a package skin holds the cell beneath it, whose own skin does not hold the barrel', () => {
  const barrel = at('apps/x/src/index.ts');
  const main = at('apps/x/src/main.ts');
  expect(withinContour(contourOf('package:apps/x'), main.x, main.y)).toBe(true);
  expect(withinContour(contourOf('single:apps/x/src/main.ts'), barrel.x, barrel.y)).toBe(false);
});

test('a cell on two terraces has one skin, stretched across the line between them', () => {
  const upper = FIELD.bands.find((band) => band.index === 1);
  const lower = FIELD.bands.find((band) => band.index === 2);
  expect(upper?.y1).toBe(lower?.y0);
  const line = upper?.y1 ?? 0;

  const contour = contourOf('folder:libs/a/src');
  expect(contour.some(([, y]) => y < line)).toBe(true);
  expect(contour.some(([, y]) => y > line)).toBe(true);
  // One closed ring: it returns to where it started.
  expect(contour.at(-1)).toEqual(contour[0]);
  expect(contour.length).toBeGreaterThan(3);
});

test('a contour is written to the layout precision', () => {
  for (const contour of Object.values(CONTOURS)) {
    for (const point of contour) {
      for (const value of point) expect(Math.abs(value * 100 - Math.round(value * 100))).toBeLessThan(1e-6);
    }
  }
});

test('the same field cuts the same membranes, byte for byte, twice', () => {
  const input = { cells: INPUT.cells, groups: INPUT.groups, positions: FIELD.positions };
  expect(JSON.stringify(computeMembranes(input))).toBe(JSON.stringify(computeMembranes(input)));
  expect(JSON.stringify(computeLayout(INPUT).contours)).toBe(JSON.stringify(CONTOURS));
});

test('a skin routes around another cell standing between two of its own files', () => {
  const positions = {
    'a/one.ts': { x: 100, y: 100, r: 8 },
    'a/two.ts': { x: 200, y: 100, r: 8 },
    'b/between.ts': { x: 150, y: 100, r: 8 },
  };
  const contours = computeMembranes({
    cells: [
      { id: 'directory:a', organelles: ['a/one.ts', 'a/two.ts'] },
      { id: 'directory:b', organelles: ['b/between.ts'] },
    ],
    groups: [],
    positions,
  });
  const a = contours['directory:a'] ?? [];
  const b = contours['directory:b'] ?? [];
  expect(withinContour(a, 100, 100)).toBe(true);
  expect(withinContour(a, 200, 100)).toBe(true);
  expect(withinContour(a, 150, 100)).toBe(false);
  expect(withinContour(b, 150, 100)).toBe(true);
  expect(withinContour(b, 100, 100)).toBe(false);
});

test('a file the layout did not place is neither held nor routed around', () => {
  const contours = computeMembranes({
    cells: [
      { id: 'directory:a', organelles: ['a/placed.ts', 'a/missing.ts'] },
      { id: 'directory:b', organelles: ['b/missing.ts'] },
    ],
    groups: [{ id: 'docs', files: ['docs/missing.md'] }],
    positions: { 'a/placed.ts': { x: 50, y: 50, r: 6 } },
  });
  expect(Object.keys(contours)).toEqual(['directory:a']);
  expect(withinContour(contours['directory:a'] ?? [], 50, 50)).toBe(true);
  expect(withinContour([], 50, 50)).toBe(false);
});

test('the skin thickens with the interface, floored and capped', () => {
  expect(membraneThickness(0)).toBe(1.5);
  expect(membraneThickness(1)).toBe(2);
  expect(membraneThickness(4)).toBeGreaterThan(membraneThickness(1));
  expect(membraneThickness(16)).toBeGreaterThan(membraneThickness(4));
  expect(membraneThickness(1000)).toBe(6);
  expect(membraneThickness(10_000)).toBe(6);
});

/** The end of the seam: `buildMap` puts the membranes in the file beside the positions (D24). */
const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, '..', '..', 'fixtures');

test('buildMap cuts a skin per cell and per placed group, and a package holds its folders', () => {
  const inputs = JSON.parse(readFileSync(join(FIXTURES, 'demo', 'inputs.json'), 'utf8')) as BuildInputs;
  const map = buildMap(inputs, DEFAULT_CONFIG);
  const layout = map.terrain.layout;
  const contours = layout?.contours ?? {};
  const positions = layout?.positions ?? {};

  const groups = map.terrain.groups.filter((group) => group.id !== 'tests').map((group) => group.id);
  expect(Object.keys(contours)).toEqual([...map.terrain.cells.map((cell) => cell.id), ...groups].toSorted());

  const inside = (contour: string, id: string): boolean => {
    const position = positions[id];
    if (position === undefined) throw new Error(`no position for ${id}`);
    return withinContour(contours[contour] ?? [], position.x, position.y);
  };
  // `libs/core`'s skin holds `pm/` and `util/` and not the CLI (D45); `pm/`'s does not hold the package barrel.
  expect(inside('package:libs/core', 'libs/core/src/pm/slots.ts')).toBe(true);
  expect(inside('package:libs/core', 'libs/core/src/util/text.ts')).toBe(true);
  expect(inside('package:libs/core', 'apps/cli/src/doctor.ts')).toBe(false);
  expect(inside('folder:libs/core/src/pm', 'libs/core/src/index.ts')).toBe(false);
  expect(inside('folder:libs/core/src/pm', 'libs/core/src/pm/tools.ts')).toBe(true);
  // A shore contour holds its own marks and no other group's.
  expect(inside('deps', 'package.json')).toBe(true);
  expect(inside('deps', 'README.md')).toBe(false);
});
