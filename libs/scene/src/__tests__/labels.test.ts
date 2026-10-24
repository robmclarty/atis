import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson, Notice, NoticeTier } from 'core';
import { expect, test } from 'vitest';

import { LABELING, labelsFor, noticeAnchors } from '../labels.js';
import type { Label, Lod, Viewport } from '../labels.js';

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
