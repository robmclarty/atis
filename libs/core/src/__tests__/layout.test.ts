import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

import { DEFAULT_CONFIG } from '../config.js';
import { LAYOUT_SEED, computeLayout, radiusOf, seededRandom, simulate } from '../layout/index.js';
import type { LayoutInput } from '../layout/index.js';
import { buildMap } from '../map.js';
import type { BuildInputs } from '../map.js';
import { assertMap } from '../schema.js';
import type { Band, Group, Layout, Organelle, Position } from '../schema.js';

/**
 * The fixture is a repository shaped like one: eight cells, each sitting on
 * two neighbouring terraces the way a folder module's files do, chained
 * together by imports, with a shore of documentation beside them. The
 * pathological shape — a cell with a file on every terrace — is deliberately
 * not the fixture: §5.1 says such a cell is *stretched* across the abyss, so
 * the map drawing it as a tall column rather than a clump is the encoding
 * working, not the layout failing.
 */
const CELLS = 8;
const PER_CELL = 6;
const BANDS = 7;

function cellOf(index: number): string {
  return `folder:libs/p${String(index).padStart(2, '0')}/src`;
}

function fileOf(cell: number, file: number): string {
  return `libs/p${String(cell).padStart(2, '0')}/src/f${String(file).padStart(2, '0')}.ts`;
}

function organelleAt(cell: number, file: number): Organelle {
  return {
    id: fileOf(cell, file),
    path: fileOf(cell, file),
    cell: cellOf(cell),
    band: (cell % (BANDS - 1)) + (file % 2),
    reachable: true,
    // A wide spread of sizes, so collision is working on radii that differ.
    loc: 20 + ((cell * 37 + file * 13) % 600),
    dents: [],
  };
}

function fixture(added: readonly string[] = []): LayoutInput {
  const organelles = Array.from({ length: CELLS }, (_unused, cell) =>
    Array.from({ length: PER_CELL }, (_file, file) => organelleAt(cell, file)),
  ).flat();
  // A chain through each cell's files, and one import from each cell into the next.
  const edges = organelles.flatMap((organelle, index) =>
    index === 0 ? [] : [{ from: organelles[index - 1]?.id ?? '', to: organelle.id }],
  );
  const groups: readonly Group[] = [
    { id: 'docs', files: Array.from({ length: 14 }, (_unused, index) => `docs/page-${String(index)}.md`) },
    { id: 'deps', files: ['package.json', 'pnpm-workspace.yaml'] },
    { id: 'tests', files: ['libs/p00/src/__tests__/p00.test.ts'] },
    { id: 'other', files: ['notes.xyz'] },
  ];
  const bands: readonly Band[] = Array.from({ length: BANDS }, (_unused, index) => ({
    index,
    depth_min: index,
    depth_max: index,
  }));
  return { organelles, edges, bands, groups, added: new Set(added) };
}

/** One field, shared by every test that only reads it; laying it out twice is the slow part. */
const INPUT = fixture();
const FIELD = computeLayout(INPUT);

function positionOf(layout: Layout, id: string): Position {
  const position = layout.positions[id];
  if (position === undefined) throw new Error(`no position for ${id}`);
  return position;
}

/** The mean distance between two sets of points; within one set, a point is not its own neighbour. */
function meanDistance(from: readonly Position[], to: readonly Position[]): number {
  const pairs = from.flatMap((a) => to.flatMap((b) => (a === b ? [] : [Math.hypot(a.x - b.x, a.y - b.y)])));
  return pairs.reduce((total, distance) => total + distance, 0) / pairs.length;
}

function draw(seed: number): readonly number[] {
  const random = seededRandom(seed);
  return Array.from({ length: 8 }, () => random());
}

test('the same inputs lay out byte for byte the same, twice', () => {
  expect(JSON.stringify(computeLayout(INPUT))).toBe(JSON.stringify(FIELD));
});

test('a seeded generator repeats its stream, and a different seed is a different one', () => {
  expect(draw(LAYOUT_SEED)).toEqual(draw(LAYOUT_SEED));
  expect(draw(LAYOUT_SEED)).not.toEqual(draw(LAYOUT_SEED + 1));
  expect(draw(LAYOUT_SEED).every((value) => value >= 0 && value < 1)).toBe(true);
});

test('every organelle lands on its own terrace, inside the strip and not only on its line', () => {
  const strips = new Map(FIELD.bands.map((band) => [band.index, band] as const));

  expect(FIELD.bands.map((band) => band.index)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  // The terraces stack under the shore with no gap and no overlap between them.
  expect(FIELD.shore).toEqual({ y0: 0, y1: FIELD.bands[0]?.y0 });
  expect(FIELD.bands.at(-1)?.y1).toBe(FIELD.height);
  for (const [index, band] of FIELD.bands.entries()) {
    expect(band.y0).toBe(FIELD.bands[index - 1]?.y1 ?? FIELD.shore.y1);
  }

  for (const organelle of INPUT.organelles) {
    const position = positionOf(FIELD, organelle.id);
    const strip = strips.get(organelle.band);
    expect(strip, `band ${String(organelle.band)} has no strip`).toBeDefined();
    expect(position.y - position.r).toBeGreaterThanOrEqual(strip?.y0 ?? 0);
    expect(position.y + position.r).toBeLessThanOrEqual(strip?.y1 ?? 0);
  }
});

test('no two organelles overlap by more than a pixel', () => {
  const placed = INPUT.organelles.map((organelle) => positionOf(FIELD, organelle.id));
  const overlaps = placed.flatMap((a, index) =>
    placed.slice(index + 1).map((b) => a.r + b.r - Math.hypot(a.x - b.x, a.y - b.y)),
  );
  expect(Math.max(...overlaps)).toBeLessThanOrEqual(1);
});

test('a cell sits closer to itself than to any other cell', () => {
  const cells = new Map<string, Position[]>();
  for (const organelle of INPUT.organelles) {
    cells.set(organelle.cell, [...(cells.get(organelle.cell) ?? []), positionOf(FIELD, organelle.id)]);
  }

  for (const [cell, own] of cells) {
    const inside = meanDistance(own, own);
    for (const [other, theirs] of cells) {
      if (other === cell) continue;
      expect(inside, `${cell} is no tighter than the gap to ${other}`).toBeLessThan(meanDistance(own, theirs));
    }
  }
});

test('size means mass and only mass', () => {
  expect(radiusOf(400)).toBeGreaterThan(radiusOf(100));
  // Area with lines, so twice the code is twice the ink; floored so a one-line
  // file still shows and capped so a generated monster cannot eat its terrace.
  expect(radiusOf(0)).toBe(radiusOf(1) - 0.62);
  expect(radiusOf(1_000_000)).toBe(radiusOf(999_999));
});

test('the second pass cannot move what the first one settled', () => {
  const files = INPUT.organelles.map((organelle) => ({
    id: organelle.id,
    cell: organelle.cell,
    band: organelle.band,
    loc: organelle.loc,
  }));
  const strips = new Map(FIELD.bands.map((band) => [band.index, { y0: band.y0, y1: band.y1 }] as const));
  const weather = `${cellOf(CELLS - 1)}/`;
  const shared = { edges: INPUT.edges, strips, width: 900 } as const;

  const terrain = files.filter((file) => !file.id.startsWith(weather.replace('folder:', '')));
  const first = simulate({ ...shared, files: terrain, fixed: new Map(), random: seededRandom(LAYOUT_SEED) });
  const fixed = new Map(first.map((placed) => [placed.id, placed] as const));
  const second = simulate({ ...shared, files, fixed, random: seededRandom(LAYOUT_SEED + 1) });

  expect(first).not.toHaveLength(files.length);
  const settled = new Map(second.map((placed) => [placed.id, placed] as const));
  for (const placed of first) expect(settled.get(placed.id)).toEqual(placed);
  // And the files the second pass was there for did get a place of their own.
  expect(second).toHaveLength(files.length);
});

test('the shore is a grid above band 0, group by group, and holds no test file', () => {
  const shore = Object.entries(FIELD.positions).filter(([, position]) => position.y < FIELD.shore.y1);
  expect(shore).not.toHaveLength(0);
  for (const [, position] of shore) {
    expect(position.y).toBeGreaterThan(0);
    // Every mark is the same size: the shore is not terrain and carries no mass (D48).
    expect(position.r).toBe(4);
  }

  // Groups run in D48's table order, left to right, each its own block.
  const leftmostOf = (prefix: string): number =>
    Math.min(...shore.filter(([path]) => path.startsWith(prefix)).map(([, position]) => position.x));
  expect(leftmostOf('docs/')).toBeLessThan(leftmostOf('package.json'));
  expect(leftmostOf('package.json')).toBeLessThan(leftmostOf('notes.xyz'));

  // A changed test file names a group, but it is evidence and never shore (D4).
  expect(FIELD.positions['libs/p00/src/__tests__/p00.test.ts']).toBeUndefined();
});

test('an empty repository lays out an empty field rather than throwing', () => {
  const layout = computeLayout({ organelles: [], edges: [], bands: [], groups: [], added: new Set() });
  expect(layout).toEqual({ width: 480, height: 0, shore: { y0: 0, y1: 0 }, bands: [], positions: {} });
});

/** The end of the seam: `buildMap` is what puts the field in the file (D24). */
const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, '..', '..', 'fixtures');

test('buildMap emits a layout every organelle and shore file has a place in', () => {
  const inputs = JSON.parse(readFileSync(join(FIXTURES, 'demo', 'inputs.json'), 'utf8')) as BuildInputs;
  const map = buildMap(inputs, DEFAULT_CONFIG);
  const layout = map.terrain.layout;

  expect(() => assertMap(map)).not.toThrow();
  expect(layout).toBeDefined();
  if (layout === undefined) return;

  for (const organelle of map.terrain.organelles) expect(layout.positions[organelle.id]).toBeDefined();
  for (const group of map.terrain.groups) {
    for (const file of group.files) {
      expect(layout.positions[file] === undefined).toBe(group.id === 'tests');
    }
  }
  // Step 16 draws the membranes; until then the map says so rather than
  // carrying an empty record that claims there are none (C2).
  expect(layout.contours).toBeUndefined();
  // The added file was placed by the second pass and is on the field like any other.
  expect(layout.positions['libs/core/src/pm/tools.ts']).toBeDefined();
});
