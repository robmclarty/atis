import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap, membraneThickness, withinContour } from 'core';
import type { MapJson } from 'core';
import { expect, test } from 'vitest';

import { sampleGrid } from '../heightfield.js';
import type { Grid } from '../heightfield.js';
import { TISSUE, dentedRing, membranes, tissue, wobbleOf } from '../membranes.js';
import type { Membrane } from '../membranes.js';
import { MEMBRANE_DENT_PULL, MEMBRANE_WOBBLE } from '../tokens.js';

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
/** The demo's pm folder breaks rules, so its skin wears teeth; a cell with none keeps its contour as cut. */
const UTIL = 'directory:libs/core/src/util';

/** The demo with the named cells' dents replaced. */
function withDents(dents: Readonly<Record<string, readonly string[]>>, map: MapJson = DEMO): MapJson {
  return { ...map, terrain: { ...map.terrain, cells: map.terrain.cells.map((cell) => (dents[cell.id] === undefined ? cell : { ...cell, dents: [...(dents[cell.id] ?? [])] })) } };
}

/** How far a point stands off a ring: its distance to the nearest edge. */
function offRing(point: Ring[number], ring: Ring): number {
  let nearest = Number.POSITIVE_INFINITY;
  ring.forEach(([ax, ay], index) => {
    const [bx, by] = ring[(index + 1) % ring.length] ?? [ax, ay];
    const dx = bx - ax;
    const dy = by - ay;
    const length2 = dx * dx + dy * dy;
    const t = length2 === 0 ? 0 : Math.min(1, Math.max(0, ((point[0] - ax) * dx + (point[1] - ay) * dy) / length2));
    nearest = Math.min(nearest, Math.hypot(point[0] - (ax + t * dx), point[1] - (ay + t * dy)));
  });
  return nearest;
}

/** How many samples a membrane grid lays any line on. */
const laidSamples = (grid: Grid): number => grid.values.filter((value) => value > 0).length;

test("a concave contour's triangles cover exactly the polygon, and its closing point is not a vertex twice", () => {
  const [membrane] = membranes(withDents({ [PM]: [] }, withContours({ [PM]: ELL })));
  expect(membrane?.cell).toBe(PM);
  expect(membrane?.vertices).toHaveLength(2 * (ELL.length - 1));
  expect(membrane?.triangles).toHaveLength(3 * (ELL.length - 3));
  expect(triangleArea(membrane!)).toBeCloseTo(ringArea(ELL), 6);
  expect(ringArea(ELL)).toBe(100 * 100 - 60 * 60);
});

test("every cell's skin on the demo, teeth and all, is cut into triangles that cover it, and no shore group's is", () => {
  const cut = membranes(DEMO);
  const contours = DEMO.terrain.layout?.contours ?? {};
  const dents = new Map(DEMO.terrain.cells.map((cell) => [cell.id, cell.dents.length] as const));
  const cellIds = DEMO.terrain.cells.map((cell) => cell.id).toSorted();
  expect(cut.map((membrane) => membrane.cell)).toEqual(cellIds);
  const groups = DEMO.terrain.groups.map((group) => group.id).filter((id) => contours[id] !== undefined);
  expect(groups.length).toBeGreaterThan(0);
  for (const membrane of cut) {
    expect(membrane.triangles.every((index) => index < membrane.vertices.length / 2)).toBe(true);
    expect(triangleArea(membrane) / ringArea(dentedRing(contours[membrane.cell] ?? [], dents.get(membrane.cell) ?? 0))).toBeCloseTo(1, 3);
  }
});

test('a cell with dents pulls one point out of its skin per rule, pointing out, and a cell with none keeps its contour as cut (D159)', () => {
  const contours = DEMO.terrain.layout?.contours ?? {};
  const dented = DEMO.terrain.cells.filter((cell) => cell.dents.length > 0);
  expect(dented.length).toBeGreaterThan(0);
  for (const cell of dented) {
    const contour = contours[cell.id] ?? [];
    const ring = dentedRing(contour, cell.dents.length);
    const pulled = ring.filter((point) => offRing(point, contour) > MEMBRANE_DENT_PULL / 2);
    expect(pulled, `${cell.id} has one tooth per rule`).toHaveLength(cell.dents.length);
    for (const point of pulled) expect(withinContour(contour, point[0], point[1]), `${cell.id}'s tooth points out`).toBe(false);
  }
  const plain = contours[UTIL] ?? [];
  expect(dentedRing(plain, 0)).toBe(plain);
  expect(dentedRing(ELL, 0)).toBe(ELL);
  expect(dentedRing(ELL.slice(0, 2), 3)).toEqual(ELL.slice(0, 2));
});

test("the tissue lays the membrane line along the dented ring, so a tooth's tip is on the line and the contour under it is not", () => {
  const resolution = 1;
  const toothed = withDents({ [PM]: ['cyclomatic', 'cognitive'] }, withContours({ [PM]: ELL }));
  const plain = withDents({ [PM]: [] }, withContours({ [PM]: ELL }));
  const ring = dentedRing(ELL, 2);
  const tips = ring.filter((point) => offRing(point, ELL) > MEMBRANE_DENT_PULL / 2);
  expect(tips).toHaveLength(2);
  for (const [x, y] of tips) {
    expect(sampleGrid(tissue(toothed, resolution).membrane, x, y)).toBeGreaterThan(0.5);
    expect(sampleGrid(tissue(plain, resolution).membrane, x, y)).toBe(0);
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
  expect(b.wobble.values).toEqual(a.wobble.values);
  expect(a.wobble.values.some((value) => value > 0), 'the demo has a cell imported past its barrel').toBe(true);
  expect(tissue(DEMO, 4).wobble.values).toEqual(a.wobble.values);
  expect(membranes(reversed)).toEqual(membranes(DEMO));
});

const CORE = 'package:libs/core';

/** The demo with the named cells' integrity replaced, or taken away where none is given. */
function withIntegrity(integrity: Readonly<Record<string, { readonly through: number; readonly past: number } | undefined>>, map: MapJson = DEMO): MapJson {
  const cells = map.terrain.cells.map((cell) => {
    if (!(cell.id in integrity)) return cell;
    const { integrity: _, ...rest } = cell;
    const next = integrity[cell.id];
    return next === undefined ? rest : { ...rest, integrity: next };
  });
  return { ...map, terrain: { ...map.terrain, cells } };
}

test("a membrane ripples by the share of its cell's outside imports that land past its barrel, and holds still where none was measured (D195, C2)", () => {
  expect(wobbleOf({ integrity: { through: 0, past: 4 } })).toBe(MEMBRANE_WOBBLE);
  expect(wobbleOf({ integrity: { through: 3, past: 3 } })).toBe(MEMBRANE_WOBBLE / 2);
  expect(wobbleOf({ integrity: { through: 100, past: 100 } })).toBe(MEMBRANE_WOBBLE / 2);
  expect(wobbleOf({ integrity: { through: 3, past: 1 } })).toBe(MEMBRANE_WOBBLE / 4);
  // Entered only through its barrel, entered by nothing, and a cell with no barrel to be entered past.
  expect(wobbleOf({ integrity: { through: 7, past: 0 } })).toBe(0);
  expect(wobbleOf({ integrity: { through: 0, past: 0 } })).toBe(0);
  expect(wobbleOf({})).toBe(0);
  // The demo's own cells: its core package is entered once each way, its pm folder through its barrel alone, and its util directory has no barrel.
  const cell = (id: string): MapJson['terrain']['cells'][number] => {
    const found = DEMO.terrain.cells.find((each) => each.id === id);
    if (found === undefined) throw new Error(`the demo lost ${id}`);
    return found;
  };
  expect(cell(CORE).integrity).toEqual({ through: 1, past: 1 });
  expect(wobbleOf(cell(CORE))).toBe(MEMBRANE_WOBBLE / 2);
  expect(cell(PM).integrity?.past).toBe(0);
  expect(wobbleOf(cell(PM))).toBe(0);
  expect(cell(UTIL).integrity).toBeUndefined();
  expect(wobbleOf(cell(UTIL))).toBe(0);
});

test("the tissue lays each cell's amplitude under its skin's line and as far either side as the ripple reaches, and 0 off every membrane", () => {
  const resolution = 1;
  const half = withIntegrity({ [PM]: { through: 2, past: 2 } }, withDents({ [PM]: [] }, withContours({ [PM]: ELL })));
  const { wobble, membrane } = tissue(half, resolution);
  // On every edge of the L, on the line and the ripple's reach to either side of it, the grid carries the cell's amplitude.
  ELL.slice(0, -1).forEach(([ax, ay], index) => {
    const [bx, by] = ELL[index + 1] ?? [ax, ay];
    const [mx, my] = [(ax + bx) / 2, (ay + by) / 2];
    const [nx, ny] = ax === bx ? [1, 0] : [0, 1];
    for (const off of [-MEMBRANE_WOBBLE, 0, MEMBRANE_WOBBLE]) {
      expect(sampleGrid(wobble, mx + nx * off, my + ny * off), `edge ${String(index)} at ${String(off)}`).toBe(MEMBRANE_WOBBLE / 2);
    }
  });
  // Wherever the line is laid the ripple is too, so no stretch of a rippling line is left standing.
  membrane.values.forEach((line, index) => {
    if (line > 0) expect(wobble.values[index]).toBe(MEMBRANE_WOBBLE / 2);
  });
  // Well inside the body, out in the cut-away corner and out on the open field, nothing ripples.
  expect(sampleGrid(wobble, 120, 150)).toBe(0);
  expect(sampleGrid(wobble, 180, 180)).toBe(0);
  expect(sampleGrid(wobble, 50, 50)).toBe(0);
  // Every sample that carries an amplitude lies within the ripple's reach of the ring.
  const pm = DEMO.terrain.cells.find((cell) => cell.id === PM);
  const reach = membraneThickness(pm?.interface_size ?? 0) / 2 + MEMBRANE_DENT_PULL + resolution;
  wobble.values.forEach((value, index) => {
    if (value === 0) return;
    const at: Ring[number] = [(index % wobble.columns) * resolution, Math.floor(index / wobble.columns) * resolution];
    expect(offRing(at, ELL)).toBeLessThanOrEqual(reach + 1e-6);
  });
});

test('a map where no cell is imported past its barrel lays no ripple at all', () => {
  const still = withIntegrity({ [CORE]: { through: 2, past: 0 }, [PM]: { through: 2, past: 0 } });
  expect(tissue(still, 2).wobble.values.every((value) => value === 0)).toBe(true);
  const none = withIntegrity({ [CORE]: undefined, [PM]: undefined, 'package:apps/cli': undefined });
  expect(none.terrain.cells.every((cell) => cell.integrity === undefined)).toBe(true);
  expect(tissue(none, 2).wobble.values.every((value) => value === 0)).toBe(true);
});

test('a still skin beside a rippling one holds still: each sample takes the amplitude of the line it stands nearest', () => {
  // Two squares 4 apart, less than the ripple's reach: the left one imported past its barrel, the right one a directory.
  const left: Ring = [
    [100, 100],
    [160, 100],
    [160, 160],
    [100, 160],
  ];
  const right: Ring = [
    [164, 100],
    [224, 100],
    [224, 160],
    [164, 160],
  ];
  const cells = DEMO.terrain.cells.map((cell) => (cell.id === PM || cell.id === UTIL ? { ...cell, interface_size: 0, dents: [] } : cell));
  const map = withIntegrity({ [PM]: { through: 0, past: 3 } }, withContours({ [PM]: left, [UTIL]: right }, cells));
  const { wobble } = tissue(map, 1);
  // Down the facing sides, away from the corners: the rippling line and its side of the gap ripple, the still line and its side do not.
  for (let y = 115; y <= 145; y += 5) {
    expect(sampleGrid(wobble, 160, y), `the rippling line at ${String(y)}`).toBe(MEMBRANE_WOBBLE);
    expect(sampleGrid(wobble, 161, y)).toBe(MEMBRANE_WOBBLE);
    expect(sampleGrid(wobble, 163, y)).toBe(0);
    expect(sampleGrid(wobble, 164, y), `the still line at ${String(y)}`).toBe(0);
    expect(sampleGrid(wobble, 166, y)).toBe(0);
  }
  // The rippling skin's far side, which no still line stands near, ripples to its whole reach.
  expect(sampleGrid(wobble, 100 - MEMBRANE_DENT_PULL, 130)).toBe(MEMBRANE_WOBBLE);
  // Swapped, so the still cell comes first in cell order, the same line ripples and the same line holds.
  const swapped = withIntegrity({ [UTIL]: { through: 0, past: 3 } }, withContours({ [PM]: right, [UTIL]: left }, cells));
  const other = tissue(swapped, 1).wobble;
  expect(sampleGrid(other, 160, 130)).toBe(MEMBRANE_WOBBLE);
  expect(sampleGrid(other, 164, 130)).toBe(0);
});
