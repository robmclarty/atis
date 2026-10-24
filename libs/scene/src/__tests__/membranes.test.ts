import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap, membraneThickness } from 'core';
import type { MapJson } from 'core';
import { expect, test } from 'vitest';

import { sampleGrid } from '../heightfield.js';
import type { Grid } from '../heightfield.js';
import { TISSUE, membranes, tissue } from '../membranes.js';
import type { Membrane } from '../membranes.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));

type Ring = readonly (readonly [number, number])[];

/** An L: a 100-unit square with its upper-right 60-unit quarter cut away, so one corner turns inward. */
const ELL: Ring = [
  [100, 100],
  [200, 100],
  [200, 140],
  [140, 140],
  [140, 200],
  [100, 200],
  [100, 100],
];

/** The demo map with its contours replaced: each named cell gets the ring given, and the rest none. */
function withContours(contours: Readonly<Record<string, Ring>>, cells: MapJson['terrain']['cells'] = DEMO.terrain.cells): MapJson {
  const layout = DEMO.terrain.layout;
  if (layout === undefined) throw new Error('the demo map has a layout');
  return { ...DEMO, terrain: { ...DEMO.terrain, cells, layout: { ...layout, contours } } };
}

/** The shoelace area of a ring, closing repeat or not. */
function ringArea(ring: Ring): number {
  let twice = 0;
  ring.forEach(([ax, ay], index) => {
    const [bx, by] = ring[(index + 1) % ring.length] ?? [ax, ay];
    twice += ax * by - bx * ay;
  });
  return Math.abs(twice) / 2;
}

/** The summed area of a membrane's triangles. */
function triangleArea({ vertices, triangles }: Membrane): number {
  let total = 0;
  for (let t = 0; t < triangles.length; t += 3) {
    const [a, b, c] = [triangles[t] ?? 0, triangles[t + 1] ?? 0, triangles[t + 2] ?? 0];
    const ax = vertices[2 * a] ?? 0;
    const ay = vertices[2 * a + 1] ?? 0;
    const bx = vertices[2 * b] ?? 0;
    const by = vertices[2 * b + 1] ?? 0;
    const cx = vertices[2 * c] ?? 0;
    const cy = vertices[2 * c + 1] ?? 0;
    total += Math.abs((bx - ax) * (cy - ay) - (cx - ax) * (by - ay)) / 2;
  }
  return total;
}

const PM = 'folder:libs/core/src/pm';

/** How many samples a membrane grid lays any line on. */
const laidSamples = (grid: Grid): number => grid.values.filter((value) => value > 0).length;

test("a concave contour's triangles cover exactly the polygon, and its closing point is not a vertex twice", () => {
  const [membrane] = membranes(withContours({ [PM]: ELL }));
  expect(membrane?.cell).toBe(PM);
  expect(membrane?.vertices).toHaveLength(2 * (ELL.length - 1));
  expect(membrane?.triangles).toHaveLength(3 * (ELL.length - 3));
  expect(triangleArea(membrane!)).toBeCloseTo(ringArea(ELL), 6);
  expect(ringArea(ELL)).toBe(100 * 100 - 60 * 60);
});

test("every cell's contour on the demo is cut into triangles that cover it, and no shore group's is", () => {
  const cut = membranes(DEMO);
  const contours = DEMO.terrain.layout?.contours ?? {};
  const cellIds = DEMO.terrain.cells.map((cell) => cell.id).toSorted();
  expect(cut.map((membrane) => membrane.cell)).toEqual(cellIds);
  const groups = DEMO.terrain.groups.map((group) => group.id).filter((id) => contours[id] !== undefined);
  expect(groups.length).toBeGreaterThan(0);
  for (const membrane of cut) {
    expect(membrane.triangles.every((index) => index < membrane.vertices.length / 2)).toBe(true);
    expect(triangleArea(membrane) / ringArea(contours[membrane.cell] ?? [])).toBeCloseTo(1, 3);
  }
});

test('the tissue draws a membrane line along the contour, as wide as the cell interface, and none inside or out', () => {
  const resolution = 2;
  const { membrane } = tissue(withContours({ [PM]: ELL }), resolution);
  const pm = DEMO.terrain.cells.find((cell) => cell.id === PM);
  const half = membraneThickness(pm?.interface_size ?? 0) / 2;
  // On every edge of the L, at its midpoint, the line is laid.
  ELL.slice(0, -1).forEach(([ax, ay], index) => {
    const [bx, by] = ELL[index + 1] ?? [ax, ay];
    expect(sampleGrid(membrane, (ax + bx) / 2, (ay + by) / 2), `edge ${String(index)}`).toBeGreaterThan(0.5);
  });
  // Well inside the body, and out in the cut-away corner, there is no line.
  expect(sampleGrid(membrane, 120, 120)).toBe(0);
  expect(sampleGrid(membrane, 180, 180)).toBe(0);
  // Just past the line's half-width and a sample's, it is gone.
  expect(sampleGrid(membrane, 150, 100 - half - resolution - 1)).toBe(0);
});

test('a wider interface lays a wider membrane line', () => {
  const resolution = 2;
  const cells = (size: number): MapJson['terrain']['cells'] =>
    DEMO.terrain.cells.map((cell) => (cell.id === PM ? { ...cell, interface_size: size } : cell));
  const thin = tissue(withContours({ [PM]: ELL }, cells(0)), resolution).membrane;
  const wide = tissue(withContours({ [PM]: ELL }, cells(64)), resolution).membrane;
  expect(laidSamples(wide)).toBeGreaterThan(laidSamples(thin));
});

test('the body fills inside a skin and not outside it, and is fuller where skins nest', () => {
  const inner: Ring = [
    [110, 110],
    [130, 110],
    [130, 130],
    [110, 130],
  ];
  const map = withContours({ [PM]: ELL, 'directory:libs/core/src/util': inner });
  const { body } = tissue(map, 2, { ...TISSUE, bodySoften: 0 });
  expect(sampleGrid(body, 170, 120)).toBe(TISSUE.bodyShare);
  expect(sampleGrid(body, 120, 120)).toBe(Math.min(1, 2 * TISSUE.bodyShare));
  expect(sampleGrid(body, 180, 180)).toBe(0);
  expect(sampleGrid(body, 50, 50)).toBe(0);
});

test('the body is softened at its edge, and stays within 0 and 1', () => {
  const { body } = tissue(withContours({ [PM]: ELL }), 2);
  const edge = sampleGrid(body, 100, 150);
  expect(edge).toBeGreaterThan(0);
  expect(edge).toBeLessThan(TISSUE.bodyShare);
  expect(body.values.every((value) => value >= 0 && value <= 1)).toBe(true);
});

test('one map lays one tissue and one set of triangles, byte for byte, in any cell order (C3)', () => {
  const reversed: MapJson = { ...DEMO, terrain: { ...DEMO.terrain, cells: DEMO.terrain.cells.toReversed() } };
  const a = tissue(DEMO, 4);
  const b = tissue(reversed, 4);
  expect(b.body.values).toEqual(a.body.values);
  expect(b.membrane.values).toEqual(a.membrane.values);
  expect(membranes(reversed)).toEqual(membranes(DEMO));
});
