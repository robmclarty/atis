import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson } from 'core';
import { expect, test } from 'vitest';

import { groundOf, minimapFrame, minimapOf, thinRing, toInset, toLayout, viewOutline } from '../minimap.js';
import type { MinimapBox, Point, WorldPoint } from '../minimap.js';
import type { Ring } from '../raster.js';
import { REACH_DECAY } from '../tokens.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));
const RETAKE = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', '..', 'fixtures', 'retake-3', 'map.json'), 'utf8')));

const BOX: MinimapBox = { width: 240, height: 160, pad: 6 };
const PM = 'folder:libs/core/src/pm';
const CORE = 'package:libs/core';
const UTIL = 'directory:libs/core/src/util';

const minimap = (map: MapJson): NonNullable<ReturnType<typeof minimapOf>> => {
  const drawn = minimapOf(map, BOX);
  if (drawn === undefined) throw new Error('the map drew no minimap');
  return drawn;
};

/** Twice a ring's signed area, positive clockwise on a y-down page. */
const area = (ring: Ring): number =>
  ring.reduce((total, [x, y], index) => {
    const [nx, ny] = ring[(index + 1) % ring.length] ?? [x, y];
    return total + x * ny - nx * y;
  }, 0);

const within = (frame: { readonly width: number; readonly height: number }, [x, y]: Point): boolean => x >= 0 && y >= 0 && x <= frame.width && y <= frame.height;

test("the frame fits the body's bounds into the box at their own aspect, the margin kept, and a pixel maps back where it came from", () => {
  const wide = minimapFrame({ x0: 100, y0: 50, x1: 500, y1: 150 }, BOX);
  expect(wide.scale).toBeCloseTo((240 - 12) / 400);
  expect(wide.width).toBeCloseTo(240);
  expect(wide.height).toBeCloseTo(100 * wide.scale + 12);
  expect(toInset(wide, [100, 50])).toEqual([6, 6].map((n) => expect.closeTo(n)));
  const tall = minimapFrame({ x0: 0, y0: 0, x1: 100, y1: 1000 }, BOX);
  expect(tall.height).toBeCloseTo(160);
  expect(tall.width).toBeLessThan(40);
  const [x, y] = toLayout(wide, toInset(wide, [321, 77]));
  expect(x).toBeCloseTo(321);
  expect(y).toBeCloseTo(77);
});

test("the silhouette is every cell's contour, inside the inset and wound one way, so filled together they are one body", () => {
  const { frame, silhouette } = minimap(DEMO);
  expect(silhouette).toHaveLength(DEMO.terrain.cells.length);
  for (const ring of silhouette) {
    expect(area(ring)).toBeGreaterThan(0);
    expect(ring.every((point) => within(frame, point))).toBe(true);
  }
});

test("the shore is the rail's: no group's contour joins the silhouette (D153)", () => {
  const contours = RETAKE.terrain.layout?.contours ?? {};
  const groups = RETAKE.terrain.groups.filter((group) => contours[group.id] !== undefined);
  expect(groups.length).toBeGreaterThan(0);
  // With every group's contour taken out of the layout, the inset is the same inset.
  const layout = RETAKE.terrain.layout;
  if (layout === undefined) throw new Error('retake-3 lost its layout');
  const cellsOnly = Object.fromEntries(Object.entries(contours).filter(([id]) => !groups.some((group) => group.id === id)));
  const bare: MapJson = { ...RETAKE, terrain: { ...RETAKE.terrain, layout: { ...layout, contours: cellsOnly } } };
  expect(minimap(RETAKE).silhouette).toEqual(minimap(bare).silhouette);
  expect(minimap(RETAKE).silhouette.length).toBeGreaterThan(200);
});

test('a ring is thinned to what a pixel holds, and a contour too small to draw is dropped', () => {
  const frame = minimapFrame({ x0: 0, y0: 0, x1: 1000, y1: 1000 }, { width: 100, height: 100, pad: 0 });
  // A circle of 400 points, 200 units across: 20 pixels across in the inset.
  const circle: Ring = Array.from({ length: 400 }, (_, index) => [500 + 100 * Math.cos((index / 400) * 2 * Math.PI), 500 + 100 * Math.sin((index / 400) * 2 * Math.PI)] as const);
  const thinned = thinRing(frame, circle) ?? [];
  expect(thinned.length).toBeLessThan(80);
  expect(thinned.length).toBeGreaterThan(20);
  for (const [index, [px, py]] of thinned.entries()) {
    const [nx, ny] = thinned[(index + 1) % thinned.length] ?? [px, py];
    expect(Math.hypot(nx - px, ny - py)).toBeGreaterThanOrEqual(1 - 1e-9);
  }
  const speck: Ring = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];
  expect(thinRing(frame, speck)).toBeUndefined();
  // Wound the other way, it comes back clockwise all the same.
  expect(area(thinRing(frame, circle.toReversed()) ?? [])).toBeGreaterThan(0);
});

test("the reach is each reached cell's own ground at its luminance, the cells it holds cut out (D5, D161)", () => {
  const { reach } = minimap(DEMO);
  const pm = reach.find((each) => each.cell === PM);
  const core = reach.find((each) => each.cell === CORE);
  expect(pm).toMatchObject({ hops: 0, luminance: 1 });
  expect(pm?.rings).toHaveLength(1);
  expect(core).toMatchObject({ hops: 1, luminance: REACH_DECAY });
  // The package's own ground: its contour less the two cells it holds.
  expect(core?.rings).toHaveLength(3);
  expect(reach.some((each) => each.cell === UTIL)).toBe(false);
});

test('the changed files are the placed ones, at their centres, each with its kind; a shore file is the rail’s', () => {
  const { frame, changed } = minimap(DEMO);
  const positions = DEMO.terrain.layout?.positions ?? {};
  const placed = DEMO.weather.changed.filter((file) => positions[file.path] !== undefined && DEMO.terrain.organelles.some((organelle) => organelle.id === file.path));
  expect(changed.map((file) => file.path)).toEqual(placed.map((file) => file.path).toSorted());
  expect(changed.some((file) => file.path === 'README.md')).toBe(false);
  const tools = changed.find((file) => file.path === 'libs/core/src/pm/tools.ts');
  const at = positions['libs/core/src/pm/tools.ts'];
  expect(tools?.kind).toBe('added');
  expect([tools?.x, tools?.y]).toEqual(toInset(frame, [at?.x ?? 0, at?.y ?? 0]));
  expect(changed.find((file) => file.path === 'libs/core/src/pm/legacy.ts')?.kind).toBe('deleted');
});

test("the notices hang at their targets in rank order, one run per target, the primary's first (D148)", () => {
  const { frame, notices } = minimap(DEMO);
  const index = DEMO.terrain.layout?.positions['libs/core/src/pm/index.ts'];
  expect(notices.map((run) => run.target)).toEqual(['libs/core/src/pm/index.ts', 'apps/cli/src/doctor.ts', 'libs/core/src/pm/tools.ts']);
  expect(notices[0]?.marked).toEqual([
    { rank: 1, tier: 'primary' },
    { rank: 2, tier: 'secondary' },
    { rank: 3, tier: 'secondary' },
    { rank: 4, tier: 'tertiary' },
  ]);
  expect([notices[0]?.x, notices[0]?.y]).toEqual(toInset(frame, [index?.x ?? 0, index?.y ?? 0]));
  // A notice on a shore group shows on its block in the rail, never in the inset.
  const shored: MapJson = { ...DEMO, notices: [{ tier: 'primary', kind: 'k', target: 'README.md', why: 'w', inputs: {}, thresholds: {}, weight: 1 }] };
  expect(minimap(shored).notices).toEqual([]);
});

/** A ray straight down through a ground point, by a point on the near plane and one on the far. */
const down = (x: number, z: number): readonly [WorldPoint, WorldPoint] => [
  [x, 1000, z],
  [x, -1000, z],
];

test('the view is the frustum on the ground: overhead a rectangle, tilted the ground it shows, and none when a ray runs level', () => {
  expect(viewOutline([down(10, 20), down(110, 20), down(110, 80), down(10, 80)])).toEqual([
    [10, 20],
    [110, 20],
    [110, 80],
    [10, 80],
  ]);
  // Tipped 35°, every ray slants across the layout and meets the ground where it crosses it, not under where it starts.
  const tan = Math.tan((35 * Math.PI) / 180);
  const tipped = (x: number, z: number): readonly [WorldPoint, WorldPoint] => [
    [x, 1000, z + 1000 * tan],
    [x, -1000, z - 1000 * tan],
  ];
  const outline = viewOutline([tipped(10, 20), tipped(110, 20), tipped(110, 80), tipped(10, 80)]) ?? [];
  expect(outline.map(([x]) => x)).toEqual([10, 110, 110, 10]);
  expect(outline.map(([, z]) => z)).toEqual([20, 20, 80, 80].map((z) => expect.closeTo(z)));
  expect(groundOf([0, 5, 0], [10, 5, 0])).toBeUndefined();
  expect(viewOutline([down(0, 0), [[0, 5, 0], [10, 5, 0]]])).toBeUndefined();
});

test('one map gives one inset, and a map with no layout gives none (C3, C2)', () => {
  expect(minimapOf(DEMO, BOX)).toEqual(minimapOf(DEMO, BOX));
  const { layout: _layout, ...terrain } = DEMO.terrain;
  expect(minimapOf({ ...DEMO, terrain }, BOX)).toBeUndefined();
});
