import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { Cell, LayoutRow, MapJson, Notice, NoticeTier } from 'core';
import { expect, test } from 'vitest';

import { BAND_LABEL_TOKENS, LABELING, across, bandLabelsFor, between, labelsFor, noticeAnchors } from '../labels.js';
import type { BandLabel, Label, LabelBox, Lod, Viewport } from '../labels.js';
import { levelAt } from '../lod.js';
import { dentedRing } from '../membranes.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));

function notice(target: string, tier: NoticeTier = 'tertiary'): Notice {
  return { tier, kind: 'test-kind', target, why: 'because', inputs: {}, thresholds: {}, weight: 1 };
}

/** The demo with these notices in its list. */
function withNotices(notices: readonly Notice[]): MapJson {
  return { ...DEMO, notices: [...notices] };
}

const SIDE = 20;
const SPACING = 20;

/** A dense map: a grid of `SIDE` × `SIDE` files in one cell, `SPACING` apart, six of them carrying the notices, a few changed. */
function dense(): MapJson {
  const files = Array.from({ length: SIDE * SIDE }, (_, index) => `src/grid/f${String(index).padStart(3, '0')}.ts`);
  const at = (index: number): { x: number; y: number; r: number } => ({ x: 20 + (index % SIDE) * SPACING, y: 20 + Math.floor(index / SIDE) * SPACING, r: 6 });
  const tiers: readonly NoticeTier[] = ['primary', 'secondary', 'secondary', 'tertiary', 'tertiary', 'tertiary'];
  const noticed = [210, 211, 230, 189, 190, 231];
  return {
    ...DEMO,
    terrain: {
      ...DEMO.terrain,
      cells: [{ id: 'folder:src/grid', path: 'src/grid', kind: 'folder', organelles: files, band: 0, interface_size: 1, body_loc: 4000, dents: [] }],
      organelles: files.map((path) => ({ id: path, path, cell: 'folder:src/grid', band: 0, reachable: true, loc: 10, dents: [] })),
      groups: [],
      layout: {
        width: 40 + SIDE * SPACING,
        height: 40 + SIDE * SPACING,
        shore: { y0: 0, y1: 0 },
        bands: [{ index: 0, y0: 0, y1: 40 + SIDE * SPACING }],
        positions: Object.fromEntries(files.map((path, index) => [path, at(index)])),
        contours: {},
      },
    },
    weather: {
      ...DEMO.weather,
      changed: [5, 6, 7, 300].map((index) => ({ path: files[index] ?? '', kind: 'modified' as const, cell: 'folder:src/grid', is_barrel: false, added: 1, deleted: 0, hunks: [] })),
      reach: [],
      evidence: {},
      ghosts: [],
    },
    notices: noticed.map((index, rank) => notice(files[index] ?? '', tiers[rank])),
  };
}

const WHOLE: Viewport = { x: 0, y: 0, width: 40 + SIDE * SPACING, height: 40 + SIDE * SPACING, pixelsPerUnit: 1.5 };

function overlapping(labels: readonly Label[]): readonly (readonly [string, string])[] {
  return labels.flatMap((a, i) =>
    labels
      .slice(i + 1)
      .filter((b) => a.box.x < b.box.x + b.box.width && b.box.x < a.box.x + a.box.width && a.box.y < b.box.y + b.box.height && b.box.y < a.box.y + a.box.height)
      .map((b) => [a.target, b.target] as const),
  );
}

test('a notice anchors to its organelle when the layout placed it (D148)', () => {
  const [first] = noticeAnchors(withNotices([notice('libs/core/src/pm/tools.ts', 'primary')]));
  const at = DEMO.terrain.layout?.positions['libs/core/src/pm/tools.ts'];
  expect(first?.anchor).toEqual({ kind: 'organelle', path: 'libs/core/src/pm/tools.ts', ...at });
});

test("a notice on a test file anchors to the stitch it draws on the first file it imports, by path (D148)", () => {
  const [first] = noticeAnchors(withNotices([notice('libs/core/src/__tests__/pm.test.ts', 'primary')]));
  const on = DEMO.terrain.layout?.positions['libs/core/src/pm/index.ts'];
  expect(first?.anchor?.kind).toBe('stitch');
  if (first?.anchor?.kind !== 'stitch' || on === undefined) throw new Error('the test file draws a stitch on pm/index.ts');
  expect(first.anchor.on).toBe('libs/core/src/pm/index.ts');
  // On the file's edge, below it, where the stitches gather.
  expect(Math.hypot(first.anchor.x - on.x, first.anchor.y - on.y)).toBeCloseTo(on.r, 6);
  expect(first.anchor.y).toBeGreaterThan(on.y);
});

test("a notice on a shore file, or on a shore group itself, anchors to the group's block; a test file with no stitch anchors to the tests group (D148)", () => {
  const anchors = noticeAnchors(withNotices([notice('README.md'), notice('other')]));
  expect(anchors[0]?.anchor).toEqual({ kind: 'group', group: 'docs' });
  expect(anchors[1]?.anchor).toEqual({ kind: 'group', group: 'other' });
  const unstitched: MapJson = { ...withNotices([notice('libs/core/src/__tests__/pm.test.ts')]), weather: { ...DEMO.weather, evidence: { ...DEMO.weather.evidence, stitches: [] } } };
  expect(noticeAnchors(unstitched)[0]?.anchor).toEqual({ kind: 'group', group: 'tests' });
});

test('a notice on a cell anchors to its skin, and one on a name nothing draws is unplaced', () => {
  const anchors = noticeAnchors(withNotices([notice('folder:libs/core/src/pm'), notice('lint')]));
  expect(anchors[0]?.anchor).toEqual({ kind: 'cell', cell: 'folder:libs/core/src/pm' });
  expect(anchors[1]?.anchor).toBeUndefined();
  expect(anchors.map((each) => each.rank)).toEqual([1, 2]);
});

test('at the far zoom nothing is labelled; from the surface down every notice is, and the rest fill the level budget', () => {
  const map = dense();
  expect(labelsFor(map, 0, WHOLE)).toEqual([]);
  for (const lod of [1, 2, 3] as const satisfies readonly Lod[]) {
    const labels = labelsFor(map, lod, WHOLE);
    const notices = labels.filter((label) => label.rank !== undefined);
    expect(notices.map((label) => label.rank), `LOD${String(lod)}`).toEqual([1, 2, 3, 4, 5, 6]);
    expect(labels.length - notices.length, `LOD${String(lod)}`).toBeLessThanOrEqual(LABELING.budget[lod]);
  }
  expect(labelsFor(map, 2, WHOLE).length).toBeGreaterThan(labelsFor(map, 1, WHOLE).length);
});

test('the notices are placed first, in rank order, and the rest by importance: changed files before quiet ones', () => {
  const labels = labelsFor(dense(), 1, WHOLE);
  expect(labels.slice(0, 6).map((label) => label.rank)).toEqual([1, 2, 3, 4, 5, 6]);
  const changed = new Set(dense().weather.changed.map((file) => file.path));
  const rest = labels.slice(6).map((label) => changed.has(label.target));
  // Once a quiet file is labelled, no changed file follows it.
  expect(rest.indexOf(false) === -1 || rest.slice(rest.indexOf(false)).every((isChanged) => !isChanged)).toBe(true);
  expect(rest.filter(Boolean).length).toBe(changed.size);
});

test('no two label boxes overlap, even where files crowd, at every level of detail', () => {
  const map = dense();
  const tight: Viewport = { ...WHOLE, pixelsPerUnit: 0.5 };
  for (const lod of [1, 2, 3, 4] as const satisfies readonly Lod[]) {
    expect(overlapping(labelsFor(map, lod, WHOLE)), `LOD${String(lod)}`).toEqual([]);
    expect(overlapping(labelsFor(map, lod, tight)), `LOD${String(lod)} zoomed out`).toEqual([]);
  }
});

test('a label outside the viewport is not written, unless it is a notice, which is always kept', () => {
  const corner: Viewport = { x: 0, y: 0, width: 120, height: 120, pixelsPerUnit: 2 };
  const labels = labelsFor(dense(), 2, corner);
  for (const label of labels.filter((each) => each.rank === undefined)) {
    expect(label.anchor.x).toBeLessThanOrEqual(120);
    expect(label.anchor.y).toBeLessThanOrEqual(120);
    expect(label.box.x).toBeGreaterThanOrEqual(0);
    expect(label.box.x + label.box.width).toBeLessThanOrEqual(240);
  }
  expect(labels.filter((each) => each.rank !== undefined)).toHaveLength(6);
});

test("an added file's label carries the + (D120)", () => {
  const map = dense();
  const target = map.notices[0]?.target ?? '';
  const added: MapJson = { ...map, weather: { ...map.weather, changed: [{ path: target, kind: 'added', cell: 'folder:src/grid', is_barrel: false, added: 1, deleted: 0, hunks: [] }] } };
  expect(labelsFor(added, 1, WHOLE)[0]?.text).toBe(`+${target.slice(target.lastIndexOf('/') + 1)}`);
});

test('one map and one viewport give one placement, whatever order the files arrive in (C3)', () => {
  const map = dense();
  const shuffled: MapJson = { ...map, terrain: { ...map.terrain, organelles: map.terrain.organelles.toReversed() } };
  expect(labelsFor(shuffled, 2, WHOLE)).toEqual(labelsFor(map, 2, WHOLE));
  expect(labelsFor(map, 2, WHOLE)).toEqual(labelsFor(map, 2, WHOLE));
});

/** How far a box's nearest point lies from a point, in the box's pixels. */
function distanceFrom(box: Label['box'], x: number, y: number): number {
  const dx = Math.max(box.x - x, 0, x - (box.x + box.width));
  const dy = Math.max(box.y - y, 0, y - (box.y + box.height));
  return Math.hypot(dx, dy);
}

/** A box's corners, edges and inside on a six-by-six grid of points. */
function samples(box: Label['box']): readonly (readonly [number, number])[] {
  return Array.from({ length: 36 }, (_, index) => [box.x + ((index % 6) / 5) * box.width, box.y + (Math.floor(index / 6) / 5) * box.height] as const);
}

/** A ring of `sides` points round a centre, in layout units: an opened slide's skin, near enough round. */
function roundRing(cx: number, cy: number, r: number, sides: number): readonly (readonly [number, number])[] {
  return Array.from({ length: sides }, (_, index) => [cx + r * Math.cos((2 * Math.PI * index) / sides), cy + r * Math.sin((2 * Math.PI * index) / sides)] as const);
}

test("no label falls on an opened slide's ground: every notice's steps out past it, and the files round it keep the rest of the budget (D166)", () => {
  const map = dense();
  // A slide over the middle of the grid, holding all six noticed files.
  const [cx, cy, r, sides] = [220, 220, 60, 64];
  const ring = roundRing(cx, cy, r, sides);
  // The ring holds the circle its sides' midpoints lie on, so a box that far off the centre is off the ring.
  const held = r * Math.cos(Math.PI / sides) * WHOLE.pixelsPerUnit;
  const centre = [(cx - WHOLE.x) * WHOLE.pixelsPerUnit, (cy - WHOLE.y) * WHOLE.pixelsPerUnit] as const;
  // Without the slide, labels land on its ground, so the test bites.
  expect(labelsFor(map, 2, WHOLE).some((label) => distanceFrom(label.box, ...centre) < held)).toBe(true);
  for (const lod of [1, 2, 3, 4] as const) {
    const labels = labelsFor(map, lod, WHOLE, LABELING, [ring]);
    for (const label of labels) expect(distanceFrom(label.box, ...centre), `LOD${String(lod)}: ${label.target}`).toBeGreaterThanOrEqual(held - 1e-9);
    expect(labels.filter((label) => label.rank !== undefined).map((label) => label.rank)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(overlapping(labels)).toEqual([]);
    expect(labels.length, `LOD${String(lod)} keeps labelling round the slide`).toBeGreaterThan(6);
  }
});

test("labels laid round the demo's opened folder keep off its toothed skin, and a ring too small to bound ground keeps nothing off", () => {
  const map = withNotices([notice('libs/core/src/pm/tools.ts', 'primary'), notice('libs/core/src/pm/index.ts', 'secondary'), notice('apps/cli/src/doctor.ts', 'tertiary')]);
  const ring = map.terrain.layout?.contours?.['folder:libs/core/src/pm'] ?? [];
  expect(ring.length).toBeGreaterThan(3);
  const xs = ring.map(([x]) => x);
  const ys = ring.map(([, y]) => y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const viewport: Viewport = { x: minX - 60, y: minY - 60, width: maxX - minX + 120, height: maxY - minY + 120, pixelsPerUnit: 4 };
  const toScreen = ([x, y]: readonly [number, number]): readonly [number, number] => [(x - viewport.x) * viewport.pixelsPerUnit, (y - viewport.y) * viewport.pixelsPerUnit];
  const screen = ring.map(toScreen);
  /** Whether a screen point lies inside the folder's skin, by the even-odd rule. */
  const insideSkin = (px: number, py: number): boolean =>
    screen.reduce((odd, [ax, ay], index) => {
      const [bx, by] = screen[(index + screen.length - 1) % screen.length] ?? [ax, ay];
      return ay > py !== by > py && px < ((bx - ax) * (py - ay)) / (by - ay) + ax ? !odd : odd;
    }, false);
  const free = labelsFor(map, 2, viewport);
  expect(free.some((label) => samples(label.box).some(([x, y]) => insideSkin(x, y)))).toBe(true);
  const kept = labelsFor(map, 2, viewport, LABELING, [ring]);
  for (const label of kept) expect(samples(label.box).some(([x, y]) => insideSkin(x, y)), label.target).toBe(false);
  expect(kept.filter((label) => label.rank !== undefined)).toHaveLength(3);
  expect(labelsFor(map, 2, viewport, LABELING, [ring.slice(0, 2)])).toEqual(free);
});

test('asked about targets, only theirs are written: a noticed file its notices, a quiet file its name, and asked about nothing, nothing (D168)', () => {
  const map = dense();
  const noticed = map.notices[0]?.target ?? '';
  const quiet = map.terrain.organelles.find((organelle) => !map.notices.some((each) => each.target === organelle.id))?.id ?? '';
  for (const lod of [1, 2, 3] as const satisfies readonly Lod[]) {
    expect(labelsFor(map, lod, WHOLE, LABELING, [], new Set()), `LOD${String(lod)}`).toEqual([]);
    expect(labelsFor(map, lod, WHOLE, LABELING, [], new Set([noticed])).map((label) => [label.target, label.rank])).toEqual([[noticed, 1]]);
    expect(labelsFor(map, lod, WHOLE, LABELING, [], new Set([quiet])).map((label) => [label.target, label.rank])).toEqual([[quiet, undefined]]);
  }
  const both = labelsFor(map, 1, WHOLE, LABELING, [], new Set([noticed, quiet]));
  expect(both.map((label) => label.target).toSorted()).toEqual([noticed, quiet].toSorted());
  expect(overlapping(both)).toEqual([]);
  // A target asked about at the far zoom still writes nothing there.
  expect(labelsFor(map, 0, WHOLE, LABELING, [], new Set([noticed]))).toEqual([]);
});

test("a row's rule is the stretch of its row that lies on the screen, and none when its row is off it", () => {
  expect(between([100, 300], [500, 300], 800, 600)).toEqual([
    [100, 300],
    [500, 300],
  ]);
  expect(between([-100, 300], [500, 300], 800, 600)).toEqual([
    [0, 300],
    [500, 300],
  ]);
  expect(between([-400, 300], [-100, 300], 800, 600)).toBeUndefined();
  expect(between([100, 700], [500, 700], 800, 600)).toBeUndefined();
  expect(between([100, 100], [100, 100], 800, 600)).toBeUndefined();
});

test('a rule runs across the whole screen, whichever way the camera has turned the ground, and one that misses the screen is not drawn', () => {
  expect(across([100, 300], [500, 300], 800, 600)).toEqual([
    [0, 300],
    [800, 300],
  ]);
  const slanted = across([100, 100], [200, 150], 800, 600);
  expect(slanted?.[0]).toEqual([0, 50]);
  expect(slanted?.[1]).toEqual([800, 450]);
  expect(across([100, 700], [500, 700], 800, 600)).toBeUndefined();
  expect(across([100, 100], [100, 100], 800, 600)).toBeUndefined();
});

/** A 16:9 screen, as the world's smoke test frames it. */
const SCREEN = { width: 1440, height: 900 } as const;

/** What the camera shows at a zoom, centred on a layout point: zoom 1 fits the whole layout on the screen, as the world opens. */
function viewAt(layout: { readonly width: number; readonly height: number }, zoom: number, [cx, cy]: readonly [number, number]): Viewport {
  const pixelsPerUnit = Math.min(SCREEN.width / layout.width, SCREEN.height / layout.height) * zoom;
  const [width, height] = [SCREEN.width / pixelsPerUnit, SCREEN.height / pixelsPerUnit];
  return { x: cx - width / 2, y: cy - height / 2, width, height, pixelsPerUnit };
}

type Project = (x: number, y: number) => readonly [number, number];

/** The camera's view of the level ground over a viewport, tipped `tilt` degrees off overhead and turned `turn` degrees round its centre, as the world's orthographic camera does. */
function viewFrom(viewport: Viewport, tilt: number, turn: number): Project {
  const [cx, cy] = [viewport.x + viewport.width / 2, viewport.y + viewport.height / 2];
  const ppu = viewport.pixelsPerUnit;
  const [c, s, f] = [Math.cos((turn * Math.PI) / 180), Math.sin((turn * Math.PI) / 180), Math.cos((tilt * Math.PI) / 180)];
  return (x, y) => [(viewport.width * ppu) / 2 + ((x - cx) * c - (y - cy) * s) * ppu, (viewport.height * ppu) / 2 + ((x - cx) * s + (y - cy) * c) * f * ppu];
}

/** A rectangle of the layout, as a cell's contour. */
function rect(x0: number, y0: number, x1: number, y1: number): readonly (readonly [number, number])[] {
  return [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
}

function cellAt(id: string): Cell {
  return { id, path: id.slice(id.indexOf(':') + 1), kind: 'folder', organelles: [], band: 2, interface_size: 1, body_loc: 100, dents: [] };
}

/**
 * A banded field 600 by 700: the shore above y 100, then six bands each 100
 * tall, band 3 spanning depths 3 to 4 and band 5 given no depths, and the
 * cells it is handed, each a rectangle of the layout. Rows, when handed, wrap
 * the lanes (Q73).
 */
function banded(cells: Readonly<Record<string, readonly (readonly [number, number])[]>> = {}, rows?: readonly LayoutRow[]): MapJson {
  const bands = Array.from({ length: 6 }, (_, index) => ({ index, y0: 100 + index * 100, y1: 200 + index * 100 }));
  const depths = [
    { index: 0, depth_min: 0, depth_max: 0 },
    { index: 1, depth_min: 1, depth_max: 1 },
    { index: 2, depth_min: 2, depth_max: 2 },
    { index: 3, depth_min: 3, depth_max: 4 },
    { index: 4, depth_min: 5, depth_max: 5 },
  ];
  return {
    ...DEMO,
    terrain: {
      ...DEMO.terrain,
      cells: Object.keys(cells).map(cellAt),
      organelles: [],
      groups: [],
      bands: depths,
      layout: { width: 600, height: 700, shore: { y0: 0, y1: 100 }, bands, ...(rows === undefined ? {} : { rows }), positions: {}, contours: cells },
    },
    notices: [],
  };
}

const FIELD = { width: 600, height: 700 } as const;

/** Whether two boxes on the screen overlap. */
function boxesOverlap(a: LabelBox, b: LabelBox): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/** Whether a screen point lies inside a ring on the screen, by the even-odd rule. */
function insideRing(px: number, py: number, ring: readonly (readonly [number, number])[]): boolean {
  return ring.reduce((odd, [ax, ay], index) => {
    const [bx, by] = ring[(index + ring.length - 1) % ring.length] ?? [ax, ay];
    return ay > py !== by > py && px < ((bx - ax) * (py - ay)) / (by - ay) + ax ? !odd : odd;
  }, false);
}

/** Whether a box on the screen covers any of a skin there: a point of the box inside it, or a point of it inside the box. */
function coversSkin(box: LabelBox, skin: readonly (readonly [number, number])[]): boolean {
  return samples(box).some(([x, y]) => insideRing(x, y, skin)) || skin.some(([x, y]) => x > box.x && x < box.x + box.width && y > box.y && y < box.y + box.height);
}

test('at zoom 1 the bands are unlabelled; at zoom 4 each rule in view carries one label with its words, inset from the left edge just under it (D196, Q86)', () => {
  const map = banded({ 'folder:src/middle': rect(250, 320, 350, 380) });
  const far = viewAt(FIELD, 1, [300, 350]);
  expect(levelAt(0, 1)).toBe(0);
  expect(bandLabelsFor(map, levelAt(0, 1), far)).toEqual([]);
  // The same view past LOD1's gate would be labelled: it is the level that keeps it bare.
  expect(bandLabelsFor(map, 1, far).length).toBeGreaterThan(0);

  const near = viewAt(FIELD, 4, [300, 350]);
  const lod = levelAt(0, 4);
  expect(lod).toBe(1);
  const labels = bandLabelsFor(map, lod, near);
  // The screen shows y 262.5 to 437.5: the rules where bands 2 and 3 begin.
  expect(labels.map((label) => [label.band, label.text])).toEqual([
    [2, '2 deep'],
    [3, '3–4 deep'],
  ]);
  for (const label of labels) {
    const rule = (100 + label.band * 100 - near.y) * near.pixelsPerUnit;
    expect(label.box.x).toBeCloseTo(BAND_LABEL_TOKENS.BAND_LABEL_INSET, 9);
    expect(label.box.y).toBeCloseTo(rule + BAND_LABEL_TOKENS.BAND_LABEL_GAP, 9);
    expect(label.box.height).toBe(BAND_LABEL_TOKENS.BAND_LABEL_SIZE);
    expect(label.row).toBeUndefined();
  }
});

test('the band at depth 0 reads `entry` under its top, a band that spans depths reads `n–m deep`, and a band the map gives no depths has no label (Q86, C2)', () => {
  const map = banded();
  expect(levelAt(0, 1.8)).toBe(1);
  // The screen shows y 55 to 444, from just above the shore's foot.
  expect(bandLabelsFor(map, 1, viewAt(FIELD, 1.8, [300, 250])).map((label) => label.text)).toEqual(['entry', '1 deep', '2 deep', '3–4 deep']);
  // And y 355 to 744, down to band 5, which the map gives no depths.
  const low = bandLabelsFor(map, 1, viewAt(FIELD, 1.8, [300, 550]));
  expect(low.map((label) => label.text)).toEqual(['3–4 deep', '5 deep']);
  expect(low.some((label) => label.band === 5)).toBe(false);
});

test('where the lanes wrap into rows each row labels its own bands, from where its rule enters the screen, and a row off the screen labels none (Q73)', () => {
  const rows = [
    { x0: 0, x1: 600, bands: [0, 1, 2].map((index) => ({ index, y0: 100 + index * 100, y1: 200 + index * 100 })) },
    { x0: 0, x1: 300, bands: [0, 1, 2].map((index) => ({ index, y0: 400 + index * 100, y1: 500 + index * 100 })) },
  ];
  const map = banded({}, rows);
  // The whole field with room to its left, labelled as past LOD1's gate: each row's rule starts where its row does, not at the screen's edge.
  const out = viewAt(FIELD, 1, [400, 350]);
  expect(out.x).toBeLessThan(0);
  const labels = bandLabelsFor(map, 1, out);
  expect(labels.map((label) => [label.row, label.text])).toEqual([
    [0, 'entry'],
    [0, '1 deep'],
    [0, '2 deep'],
    [1, 'entry'],
    [1, '1 deep'],
    [1, '2 deep'],
  ]);
  for (const label of labels) expect(label.box.x).toBeCloseTo((0 - out.x) * out.pixelsPerUnit + BAND_LABEL_TOKENS.BAND_LABEL_INSET, 9);
  // Panned so the screen begins past the second row's end: its rules are off the screen, though level with it, and the first row's run on across it.
  const past = viewAt(FIELD, 2, [600, 400]);
  expect(past.x).toBeGreaterThan(300);
  const panned = bandLabelsFor(map, 1, past);
  expect(panned.length).toBeGreaterThan(0);
  expect(panned.every((label) => label.row === 0)).toBe(true);
});

test("a label that would fall on a cell's skin, a placed label or the HUD's claim is dropped, and the others stand where they stood (D196)", () => {
  const near = viewAt(FIELD, 4, [300, 350]);
  const clear = bandLabelsFor(banded(), 1, near);
  const [two, three] = clear;
  if (two === undefined || three === undefined) throw new Error('both rules in view are labelled');
  // A cell over the left edge just under band 2's rule.
  const covered = bandLabelsFor(banded({ 'folder:src/left': rect(150, 302, 230, 360) }), 1, near);
  expect(covered).toEqual([three]);
  // A cell that stops short of the label still keeps it, so the drop is the skin's, not the band's: its drawn line's reach is kept off too.
  const shy = bandLabelsFor(banded({ 'folder:src/left': rect(near.x + (two.box.x + two.box.width + 30) / near.pixelsPerUnit, 302, 300, 360) }), 1, near);
  expect(shy).toEqual(clear);
  // A file's label placed over band 3's spot, and the HUD over band 2's.
  const label: Label = { target: 'src/x.ts', text: 'x.ts', anchor: { x: near.x, y: near.y }, box: { ...three.box, x: three.box.x + 4 } };
  expect(bandLabelsFor(banded(), 1, near, [label])).toEqual([two]);
  expect(bandLabelsFor(banded(), 1, near, [], [{ x: 0, y: 0, width: 300, height: two.box.y + 1 }])).toEqual([three]);
});

test('turned and tilted, even past a quarter, each label stays inside its band just off its rule, and a band thinner on the screen than its label takes none', () => {
  const map = banded();
  const view = viewAt(FIELD, 1.8, [300, 350]);
  for (const [tilt, turn] of [
    [0, 0],
    [35, -25],
    [35, 160],
  ] as const) {
    const project = viewFrom(view, tilt, turn);
    const labels = bandLabelsFor(map, 1, view, [], [], project);
    expect(labels.length, `tilt ${String(tilt)}, turn ${String(turn)}`).toBeGreaterThan(0);
    for (const label of labels) {
      const corners = [
        [label.box.x, label.box.y],
        [label.box.x + label.box.width, label.box.y],
        [label.box.x, label.box.y + label.box.height],
        [label.box.x + label.box.width, label.box.y + label.box.height],
      ] as const;
      /** Which side of the line where `y` meets the ground a screen point lies on. */
      const side = (y: number, [px, py]: readonly [number, number]): number => {
        const [a, b] = [project(0, y), project(600, y)];
        return Math.sign((b[0] - a[0]) * (py - a[1]) - (b[1] - a[1]) * (px - a[0]));
      };
      const [top, foot] = [100 + label.band * 100, 200 + label.band * 100];
      const inward = side(top, project(300, top + 50));
      for (const corner of corners) {
        expect(side(top, corner), `${label.text} below its rule`).toBe(inward);
        expect(side(foot, corner), `${label.text} above its band's foot`).toBe(-inward);
      }
    }
  }
  const thin: MapJson = { ...map, terrain: { ...map.terrain, layout: { ...FIELD, shore: { y0: 0, y1: 10 }, bands: [0, 1, 2, 3, 4].map((index) => ({ index, y0: 10 + index * 4, y1: 14 + index * 4 })), positions: {}, contours: {} } } };
  expect(bandLabelsFor(thin, 1, viewAt(FIELD, 1.8, [300, 30]))).toEqual([]);
});

test("on the demo, level, tilted and turned, and zoomed to the deepest level, no band label covers a placed label, a notice mark, the HUD or a cell's skin, though it would without them (D196)", () => {
  const map = withNotices([notice('libs/core/src/pm/tools.ts', 'primary'), notice('libs/core/src/pm/index.ts', 'secondary'), notice('apps/cli/src/doctor.ts', 'tertiary'), notice('folder:libs/core/src/pm')]);
  const layout = map.terrain.layout;
  if (layout === undefined) throw new Error('the demo is laid out');
  const hud: LabelBox = { x: 0, y: 0, width: 320, height: 100 };
  // Each view's left edge runs down over the skins: apps/cli at x 24 to 80, libs/core from x 151.
  const views = [
    { name: 'level at the surface', zoom: 1.8, centre: [323, 230], tilt: 0, turn: 0 },
    { name: 'tilted and turned as the world opens', zoom: 3, centre: [330, 400], tilt: 35, turn: -25 },
    { name: 'tilted inside a cell', zoom: 8, centre: [200, 300], tilt: 35, turn: 0 },
    { name: 'at the deepest zoom on open ground', zoom: 100, centre: [120, 276], tilt: 0, turn: 0 },
    { name: 'at the deepest zoom on a skin', zoom: 100, centre: [200, 276], tilt: 0, turn: 0 },
    { name: 'tilted and turned at the deepest zoom', zoom: 100, centre: [200, 276], tilt: 35, turn: -25 },
  ] as const;
  const bare: MapJson = { ...map, terrain: { ...map.terrain, layout: { ...layout, contours: {} } } };
  let shown = 0;
  let wouldCover = 0;
  for (const view of views) {
    const viewport = viewAt(layout, view.zoom, view.centre);
    const lod = levelAt(0, view.zoom);
    const project = viewFrom(viewport, view.tilt, view.turn);
    const overhead = viewFrom(viewport, 0, 0);
    const placed = labelsFor(map, lod, viewport);
    // A placed label is drawn hung from its anchor's projection, by the offset it was placed with overhead.
    const drawn = placed.map((label) => {
      const [ox, oy] = overhead(label.anchor.x, label.anchor.y);
      const [px, py] = project(label.anchor.x, label.anchor.y);
      return { ...label.box, x: label.box.x + px - ox, y: label.box.y + py - oy };
    });
    // A notice mark: a numbered box off its target's lower right.
    const marks = placed.filter((label) => label.rank !== undefined).map((label): LabelBox => ({ x: drawn[placed.indexOf(label)]?.x ?? 0, y: (drawn[placed.indexOf(label)]?.y ?? 0) + 20, width: 30, height: 10 }));
    const skins = map.terrain.cells.flatMap((cell) => {
      const contour = layout.contours?.[cell.id];
      return contour === undefined ? [] : [dentedRing(contour, cell.dents.length).map(([x, y]) => project(x, y))];
    });
    const covers = (label: BandLabel): boolean => [...drawn, ...marks, hud].some((box) => boxesOverlap(box, label.box)) || skins.some((skin) => coversSkin(label.box, skin));
    const labels = bandLabelsFor(map, lod, viewport, placed, [...marks, hud], project);
    shown += labels.length;
    for (const label of labels) {
      expect(covers(label), `${view.name}: ${label.text}`).toBe(false);
      expect(label.box.x >= 0 && label.box.y >= 0 && label.box.x + label.box.width <= SCREEN.width && label.box.y + label.box.height <= SCREEN.height, `${view.name}: ${label.text} on the screen`).toBe(true);
    }
    wouldCover += bandLabelsFor(bare, lod, viewport, [], [], project).filter(covers).length;
    expect(bandLabelsFor(map, lod, viewport, placed, [...marks, hud], project), `${view.name} (C3)`).toEqual(labels);
  }
  expect(shown).toBeGreaterThan(0);
  expect(wouldCover).toBeGreaterThan(0);
});

test('one map and one view give one set of band labels, whatever order the cells arrive in (C3)', () => {
  const map = banded({ 'folder:src/a': rect(150, 302, 230, 360), 'folder:src/b': rect(250, 402, 330, 460) });
  const view = viewAt(FIELD, 4, [300, 350]);
  const project = viewFrom(view, 35, -25);
  const reversed: MapJson = { ...map, terrain: { ...map.terrain, cells: map.terrain.cells.toReversed() } };
  expect(bandLabelsFor(reversed, 1, view, [], [], project)).toEqual(bandLabelsFor(map, 1, view, [], [], project));
  expect(bandLabelsFor(map, 2, view)).toEqual(bandLabelsFor(map, 2, view));
});
