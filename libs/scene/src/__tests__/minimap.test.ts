import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson } from 'core';
import { expect, test } from 'vitest';

import { CINEMA, cinemaFrame } from '../cinema.js';
import { onRing, overlaps } from '../labels.js';
import { bodyBounds, calloutsOf, fixedFrame, groundOf, minimapFrame, minimapIn, minimapOf, runAt, thinRing, toInset, toLayout, viewOutline } from '../minimap.js';
import type { CalloutLook, MinimapBox, MinimapFrame, Point, WorldPoint } from '../minimap.js';
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

test("a fixed frame is the box's size whatever it shows, the stretch centred in it at its own aspect", () => {
  const frame = fixedFrame({ x0: 100, y0: 50, x1: 500, y1: 150 }, BOX);
  expect([frame.width, frame.height]).toEqual([BOX.width, BOX.height]);
  expect(frame.scale).toBeCloseTo((240 - 12) / 400);
  const [x0, y0] = toInset(frame, [100, 50]);
  const [x1, y1] = toInset(frame, [500, 150]);
  expect(x0).toBeCloseTo(6);
  expect(x1).toBeCloseTo(234);
  expect((y0 + y1) / 2).toBeCloseTo(BOX.height / 2);
  const { layout: _layout, ...terrain } = DEMO.terrain;
  expect(bodyBounds({ ...DEMO, terrain })).toBeUndefined();
});

test('zoomed onto a stretch, the drawing leaves out every skin, file, change and notice that falls wholly outside the frame, and keeps each file at its own size', () => {
  const whole = minimap(DEMO);
  const frame = cinemaFrame(DEMO, 480, 300, CINEMA);
  const zoomed = minimapIn(DEMO, frame);
  if (zoomed === undefined) throw new Error('the demo is laid out');
  expect(whole.files).toHaveLength(DEMO.terrain.organelles.length);
  expect(zoomed.files.length).toBeLessThan(whole.files.length);
  for (const file of zoomed.files) {
    expect(file.x + file.r).toBeGreaterThanOrEqual(0);
    expect(file.x - file.r).toBeLessThanOrEqual(frame.width);
    expect(file.r).toBeCloseTo((DEMO.terrain.layout?.positions[file.path]?.r ?? 0) * frame.scale);
  }
  expect(zoomed.silhouette.length).toBeGreaterThan(0);
  // A frame off the body draws nothing of it.
  const away = minimapIn(DEMO, { ...frame, x: -1e6, y: -1e6 });
  expect([away?.silhouette, away?.files, away?.reach, away?.changed, away?.notices]).toEqual([[], [], [], [], []]);
  expect(zoomed.notices.map((notice) => notice.target)).toEqual(['libs/core/src/pm/index.ts', 'libs/core/src/pm/tools.ts']);
  // The fifth notice's file pokes its edge into the frame, so its dot is drawn, but its middle lies outside, so no notice is hung on it there.
  expect(zoomed.changed.map((file) => file.path)).toContain('apps/cli/src/doctor.ts');
});

test("a run of boxes hangs past its file's own disc, or past the changed dot when the disc is smaller", () => {
  const notice = { target: 'a.ts', x: 100, y: 50, r: 20, marked: [] };
  expect(runAt(notice, { changedR: 1.5 })).toEqual([100 + 20 * Math.SQRT1_2 + 1, 50 + 20 * Math.SQRT1_2 + 1]);
  expect(runAt({ ...notice, r: 0 }, { changedR: 1.5 })).toEqual([102.5, 52.5]);
});

const CALLOUT: CalloutLook = { fontSize: 8, pad: 3, box: 10, boxGap: 1.5, textGap: 5, gap: 4, end: 1.5 };

const calloutsIn = (map: MapJson, frame: MinimapFrame): ReturnType<typeof calloutsOf> => {
  const drawn = minimapIn(map, frame);
  if (drawn === undefined) throw new Error('the map is laid out');
  return calloutsOf(map, drawn, CALLOUT);
};

const insideOf = (frame: MinimapFrame, box: { readonly x: number; readonly y: number; readonly width: number; readonly height: number }): boolean =>
  box.x >= 0 && box.y >= 0 && box.x + box.width <= frame.width && box.y + box.height <= frame.height;

test("a still's callouts name each target it frames once, in rank order, off the body, inside the frame and clear of each other, each leader running from the target's edge to its box", () => {
  const frame = cinemaFrame(DEMO, 480, 300, CINEMA);
  const callouts = calloutsIn(DEMO, frame);
  expect(callouts.map((callout) => [callout.text, callout.marked.map((mark) => mark.rank)])).toEqual([
    ['index.ts', [1, 2, 3, 4]],
    ['+tools.ts', [6]],
  ]);
  const skins = minimapIn(DEMO, frame)?.silhouette ?? [];
  for (const [index, { target, box, r, leader }] of callouts.entries()) {
    expect(insideOf(frame, box)).toBe(true);
    expect(skins.some((ring) => onRing(box, ring))).toBe(false);
    expect(callouts.slice(index + 1).some((other) => overlaps(other.box, box))).toBe(false);
    const at = DEMO.terrain.layout?.positions[target];
    if (at === undefined) throw new Error('the demo places its targets');
    const [x, y] = toInset(frame, [at.x, at.y]);
    expect(r).toBeCloseTo(at.r * frame.scale);
    expect(Math.hypot(leader[0][0] - x, leader[0][1] - y)).toBeCloseTo(r);
    const [ex, ey] = leader[1];
    expect(ex === box.x || ex === box.x + box.width || ey === box.y || ey === box.y + box.height).toBe(true);
  }
});

test("a frame the body fills still names its targets inside it, on ground off the target's own cell, and one map gives one placement (C3)", () => {
  const at = DEMO.terrain.layout?.positions['libs/core/src/pm/index.ts'];
  if (at === undefined) throw new Error('the demo places its primary');
  // A frame so close on the primary that the body covers all of it.
  const scale = 12;
  const frame: MinimapFrame = { width: 240, height: 160, scale, x: at.x - 120 / scale, y: at.y - 80 / scale };
  const callouts = calloutsIn(DEMO, frame);
  expect(callouts.map((callout) => callout.target)).toContain('libs/core/src/pm/index.ts');
  for (const { box } of callouts) expect(insideOf(frame, box)).toBe(true);
  expect(calloutsIn(DEMO, frame)).toEqual(callouts);
});

test("a cell's callout leads to the cell's middle, where its leader ends on a dot", () => {
  const [first] = DEMO.notices;
  if (first === undefined) throw new Error('the demo has notices');
  const onCell: MapJson = { ...DEMO, notices: [{ ...first, target: PM }] };
  const frame = cinemaFrame(onCell, 480, 300, CINEMA);
  const [callout] = calloutsIn(onCell, frame);
  expect(callout?.text).toBe('pm');
  expect(callout?.r).toBe(0);
});
