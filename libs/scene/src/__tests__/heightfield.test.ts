import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { Cell, MapJson, Organelle, Stability } from 'core';
import { expect, test } from 'vitest';

import { RELIEF, SKIN_RESOLUTION, SKIN_SAMPLES, bumpProfile, bumps, gridFor, heightfield, sampleGrid, skinResolution } from '../heightfield.js';
import type { Grid } from '../heightfield.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));

/** A file on a synthetic map: its cell, where the layout put it, and what the history saw of it. */
type Spec = {
  readonly id: string;
  readonly cell: string;
  readonly band: number;
  readonly x: number;
  readonly y: number;
  readonly r?: number;
  readonly loc?: number;
  readonly stability?: Stability;
};

const BAND_HEIGHT = 200;
const WIDTH = 600;

/** A map holding just these files, on three bands 200 units tall under a shore strip, each cell a folder of its own. */
function mapOf(specs: readonly Spec[]): MapJson {
  const cellIds = [...new Set(specs.map((spec) => spec.cell))].toSorted();
  const cells = cellIds.map((id): Cell => {
    const files = specs.filter((spec) => spec.cell === id);
    return {
      id,
      path: id,
      kind: 'folder',
      organelles: files.map((spec) => spec.id),
      band: Math.min(...files.map((spec) => spec.band)),
      interface_size: 1,
      body_loc: files.reduce((total, spec) => total + (spec.loc ?? 100), 0),
      dents: [],
    };
  });
  const organelles = specs.map(
    (spec): Organelle => ({
      id: spec.id,
      path: spec.id,
      cell: spec.cell,
      band: spec.band,
      reachable: true,
      loc: spec.loc ?? 100,
      dents: [],
      ...(spec.stability === undefined ? {} : { stability: spec.stability }),
    }),
  );
  const bands = [0, 1, 2].map((index) => ({ index, y0: 40 + index * BAND_HEIGHT, y1: 40 + (index + 1) * BAND_HEIGHT }));
  return {
    meta: {
      schema_version: 1,
      generated_at: '',
      repo: 'synthetic',
      base: 'main',
      head: 'HEAD',
      merge_base: 'base',
      mode: 'change',
      instruments: { mode: 'git-only' },
    },
    terrain: {
      cells,
      organelles,
      bands: bands.map((band) => ({ index: band.index, depth_min: band.index, depth_max: band.index })),
      groups: [],
      edges_exceptional: [],
      history: { window_commits: 0, cochange: [] },
      layout: {
        width: WIDTH,
        height: 40 + 3 * BAND_HEIGHT,
        shore: { y0: 0, y1: 40 },
        bands,
        positions: Object.fromEntries(specs.map((spec) => [spec.id, { x: spec.x, y: spec.y, r: spec.r ?? 10 }])),
        contours: {},
      },
    },
    weather: {
      changed: [],
      reach: [],
      evidence: {},
      checks: { category: 'NOINST', checks_run: 0, slots: [] },
      ghosts: [],
      deps_added: [],
      improvements: [],
    },
    notices: [],
  };
}

/** The value at one sample. */
function at(grid: Grid, column: number, row: number): number {
  return grid.values[row * grid.columns + column] ?? Number.NaN;
}

const BEDROCK: Stability = { age_days: 900, churn_ratio: 0.1 };
const CHURNY: Stability = { age_days: 20, churn_ratio: 6 };

test('the grid covers the layout at the resolution asked for, with a sample on each edge', () => {
  const grid = gridFor(mapOf([]), 10);
  expect(grid.columns).toBe(WIDTH / 10 + 1);
  expect(grid.rows).toBe((40 + 3 * BAND_HEIGHT) / 10 + 1);
  expect(grid.values).toHaveLength(grid.columns * grid.rows);
  expect(() => gridFor(mapOf([]), 0)).toThrow(/positive resolution/);
});

test("the skin is laid at the spike's resolution until a field is too large for it, then coarsened only as far as keeps its grids under the cap (C14)", () => {
  expect(skinResolution(DEMO)).toBe(SKIN_RESOLUTION);
  const { layout: _layout, ...unlaid } = DEMO.terrain;
  expect(skinResolution({ ...DEMO, terrain: unlaid })).toBe(SKIN_RESOLUTION);
  const sized = (width: number, height: number): MapJson => {
    const layout = DEMO.terrain.layout;
    if (layout === undefined) throw new Error('the demo has a layout');
    return { ...DEMO, terrain: { ...DEMO.terrain, layout: { ...layout, width, height } } };
  };
  // The largest real field so far, corpus-5's, keeps the spike's resolution.
  expect(skinResolution(sized(2329, 3994))).toBe(SKIN_RESOLUTION);
  // Step 43's 5,000 files wrapped into rows, and its 20,000.
  for (const [width, height] of [
    [19_427, 12_508],
    [46_560, 30_801],
  ] as const) {
    const map = sized(width, height);
    const resolution = skinResolution(map);
    expect(resolution).toBeGreaterThan(SKIN_RESOLUTION);
    const grid = gridFor(map, resolution);
    expect(grid.columns * grid.rows).toBeLessThanOrEqual(SKIN_SAMPLES);
    // A whole unit finer would have held more than the cap.
    const finer = gridFor(map, resolution - 1);
    expect(finer.columns * finer.rows).toBeGreaterThan(SKIN_SAMPLES);
  }
});

test('no band steps the skin: with no file swelling it and no body rising, the field is level across every band boundary (D169)', () => {
  const { height, swell, mass } = heightfield(mapOf([]), 2);
  expect(height.values.every((value) => value === 0)).toBe(true);
  expect(swell.values.every((value) => value === 0)).toBe(true);
  expect(mass.values.every((value) => value === 0)).toBe(true);
  // Far from any file, the ground either side of a boundary stands at one height.
  const map = mapOf([{ id: 'src/a.ts', cell: 'folder:src', band: 0, x: 60, y: 100, stability: BEDROCK }]);
  const field = heightfield(map, 2);
  for (const edge of [40 + BAND_HEIGHT, 40 + 2 * BAND_HEIGHT]) {
    expect(sampleGrid(field.height, 500, edge - 20)).toBeCloseTo(sampleGrid(field.height, 500, edge + 20), 6);
  }
  expect(Object.keys(RELIEF).filter((name) => name.startsWith('terrace'))).toEqual([]);
});

test('a bedrock file sits above a churny one in the same band, cell for cell', () => {
  const map = mapOf([
    { id: 'src/old/a.ts', cell: 'folder:src/old', band: 1, x: 150, y: 340, stability: BEDROCK },
    { id: 'src/new/b.ts', cell: 'folder:src/new', band: 1, x: 450, y: 340, stability: CHURNY },
  ]);
  const { height, swell, mass } = heightfield(map, 4);
  // The two cells weigh the same, so their bumps match, and the difference is the swell's.
  expect(sampleGrid(mass, 150, 340)).toBeCloseTo(sampleGrid(mass, 450, 340), 4);
  expect(sampleGrid(swell, 150, 340)).toBeGreaterThan(0);
  expect(sampleGrid(swell, 450, 340)).toBeLessThan(0);
  expect(sampleGrid(height, 150, 340)).toBeGreaterThan(sampleGrid(height, 450, 340));
});

test('a swell stays within its height, and fades to level ground away from every file', () => {
  const map = mapOf([{ id: 'src/old/a.ts', cell: 'folder:src/old', band: 1, x: 100, y: 340, stability: BEDROCK }]);
  const { swell } = heightfield(map, 4);
  expect(Math.max(...swell.values)).toBeLessThanOrEqual(RELIEF.swellHeight + 1e-6);
  expect(sampleGrid(swell, 100, 340)).toBeCloseTo(RELIEF.swellHeight * (1 - BEDROCK.churn_ratio! / RELIEF.swellChurnFull), 4);
  expect(sampleGrid(swell, 560, 600)).toBeCloseTo(0, 6);
});

test('a map without stability has no swells, and a stability with no churn ratio raises none (C2)', () => {
  const plain = heightfield(mapOf([{ id: 'src/a.ts', cell: 'folder:src', band: 0, x: 300, y: 140 }]), 4);
  expect(plain.swell.values.every((value) => value === 0)).toBe(true);
  const ageOnly = heightfield(mapOf([{ id: 'src/a.ts', cell: 'folder:src', band: 0, x: 300, y: 140, stability: { age_days: 900 } }]), 4);
  expect(ageOnly.swell.values.every((value) => value === 0)).toBe(true);

  // The demo without its stability keys keeps its bumps, and loses only the swells.
  const stripped: MapJson = {
    ...DEMO,
    terrain: { ...DEMO.terrain, organelles: DEMO.terrain.organelles.map(({ stability: _stability, ...rest }) => rest) },
  };
  const bare = heightfield(stripped, 4);
  const full = heightfield(DEMO, 4);
  expect(bare.swell.values.every((value) => value === 0)).toBe(true);
  expect(full.swell.values.some((value) => value !== 0)).toBe(true);
  expect(bare.mass.values).toEqual(full.mass.values);
});

test("a bump peaks at its cell's centre and falls smoothly to nothing at its radius", () => {
  const map = mapOf([
    { id: 'src/pm/a.ts', cell: 'folder:src/pm', band: 1, x: 280, y: 320, loc: 300 },
    { id: 'src/pm/b.ts', cell: 'folder:src/pm', band: 1, x: 320, y: 360, loc: 100 },
  ]);
  const [bump] = bumps(map);
  // Centred on the files' mass, which the heavier file pulls toward it.
  expect(bump?.x).toBeCloseTo((280 * 300 + 320 * 100) / 400, 6);
  expect(bump?.y).toBeCloseTo((320 * 300 + 360 * 100) / 400, 6);
  const { mass } = heightfield(map, 2);
  let peak = { value: -1, x: 0, y: 0 };
  for (let row = 0; row < mass.rows; row += 1) {
    for (let column = 0; column < mass.columns; column += 1) {
      const value = at(mass, column, row);
      if (value > peak.value) peak = { value, x: column * 2, y: row * 2 };
    }
  }
  expect(Math.hypot(peak.x - (bump?.x ?? 0), peak.y - (bump?.y ?? 0))).toBeLessThanOrEqual(2);
  expect(bump && bumpProfile(bump, bump.radius)).toBe(0);
  expect(bump && bumpProfile(bump, bump.radius * 0.99)).toBeGreaterThan(0);
});

test('a heavier cell stands taller, and its mass never reaches the full body height', () => {
  const map = mapOf([
    { id: 'src/big/a.ts', cell: 'folder:src/big', band: 1, x: 150, y: 340, loc: 4000 },
    { id: 'src/small/b.ts', cell: 'folder:src/small', band: 1, x: 450, y: 340, loc: 40 },
  ]);
  const [big, small] = bumps(map);
  expect(big?.mass).toBeGreaterThan(small?.mass ?? 1);
  expect(big?.mass).toBeLessThan(1);
  expect(bumps(mapOf([{ id: 'a.ts', cell: 'folder:x', band: 0, x: 1, y: 1, loc: RELIEF.bodyHalfLoc }]))[0]?.mass).toBeCloseTo(0.5, 9);
});

test('where two bumps meet the skin creases: the tallest bump holds each point, so their sum never shows', () => {
  const map = mapOf([
    { id: 'src/a/a.ts', cell: 'folder:src/a', band: 1, x: 280, y: 340, loc: 200 },
    { id: 'src/b/b.ts', cell: 'folder:src/b', band: 1, x: 320, y: 340, loc: 200 },
  ]);
  const [a, b] = bumps(map);
  const { mass } = heightfield(map, 1);
  const between = sampleGrid(mass, 300, 340);
  expect(between).toBeCloseTo(Math.max(bumpProfile(a!, 20), bumpProfile(b!, 20)), 4);
  // A crease: the midpoint is lower than a step either side of it.
  expect(between).toBeLessThan(sampleGrid(mass, 290, 340));
  expect(between).toBeLessThan(sampleGrid(mass, 310, 340));
});

test("a package's bump weighs its own files, not its folders', and a cell with none placed has no bump", () => {
  const bumpsOf = new Map(bumps(DEMO).map((bump) => [bump.cell, bump] as const));
  const pkg = DEMO.terrain.cells.find((cell) => cell.id === 'package:libs/core');
  const index = DEMO.terrain.organelles.find((organelle) => organelle.id === 'libs/core/src/index.ts');
  const lines = index?.loc ?? 0;
  expect(pkg?.body_loc).toBeGreaterThan(lines);
  expect(bumpsOf.get('package:libs/core')?.mass).toBeCloseTo(Math.sqrt(lines) / (Math.sqrt(lines) + Math.sqrt(RELIEF.bodyHalfLoc)), 9);
  expect(bumps(mapOf([]))).toEqual([]);
});

test('the height is the sum of the two scales, stability and mass', () => {
  const field = heightfield(DEMO, 4);
  field.height.values.forEach((value, i) => {
    expect(value).toBeCloseTo((field.swell.values[i] ?? 0) + (field.mass.values[i] ?? 0), 4);
  });
});

/** The skin's resting height as raw bytes. */
const bytes = (map: MapJson): Uint8Array => new Uint8Array(heightfield(map, 4).height.values.buffer);

test('one map gives one grid byte for byte, whatever order its lists arrive in (C3)', () => {
  const first = bytes(DEMO);
  expect(bytes(DEMO)).toEqual(first);
  const shuffled: MapJson = {
    ...DEMO,
    terrain: { ...DEMO.terrain, cells: DEMO.terrain.cells.toReversed(), organelles: DEMO.terrain.organelles.toReversed() },
  };
  expect(bytes(shuffled)).toEqual(first);
});
