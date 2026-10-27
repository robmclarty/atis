import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson } from 'core';
import { expect, test } from 'vitest';

import { CINEMA, cinemaFocus, cinemaFrame, zoomOnto } from '../cinema.js';
import { toInset } from '../minimap.js';

/**
 * A still for a pull request's comment (D174, D175): framed on what the
 * change is about, on the terrain, between the surface's gate and the cells'
 * level; the world's `?cinema` page stands its camera at the focus, and the
 * comment's flat still draws the minimap in the frame.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));
const [WIDTH, HEIGHT] = [1280, 800];

const placed = (map: MapJson, id: string): { readonly x: number; readonly y: number; readonly r: number } => {
  const at = map.terrain.layout?.positions[id];
  if (at === undefined) throw new Error(`the demo does not place ${id}`);
  return at;
};

const layoutOf = (map: MapJson): { readonly width: number; readonly height: number } => {
  const layout = map.terrain.layout;
  if (layout === undefined) throw new Error('the demo is laid out');
  return layout;
};

/** The demo's change narrowed to the three files of its `pm` cell, and the notices on them. */
const PM = ['libs/core/src/pm/index.ts', 'libs/core/src/pm/legacy.ts', 'libs/core/src/pm/tools.ts'];
const narrow: MapJson = { ...DEMO, notices: DEMO.notices.filter((notice) => PM.includes(notice.target)), weather: { ...DEMO.weather, changed: DEMO.weather.changed.filter((file) => PM.includes(file.path) || file.path === 'README.md') } };

test("a still frames the change's notices and its files on the terrain, its zoom between the look's two bounds", () => {
  const focus = cinemaFocus(narrow, WIDTH, HEIGHT, CINEMA);
  expect(focus.zoom).toBeGreaterThanOrEqual(CINEMA.farthest);
  expect(focus.zoom).toBeLessThanOrEqual(CINEMA.nearest);
  // The box is the three files' own; the shore's README, which neither the world nor the minimap draws on the field, does not pull it.
  const files = PM.map((id) => placed(DEMO, id));
  const [x0, x1] = [Math.min(...files.map((at) => at.x - at.r)), Math.max(...files.map((at) => at.x + at.r))];
  const [y0, y1] = [Math.min(...files.map((at) => at.y - at.r)), Math.max(...files.map((at) => at.y + at.r))];
  expect(focus.centre).toEqual([(x0 + x1) / 2, (y0 + y1) / 2]);
});

test("a change whose files spread wider than the surface allows frames its notices' targets alone", () => {
  const focus = cinemaFocus(DEMO, WIDTH, HEIGHT, CINEMA);
  const targets = [...new Set(DEMO.notices.map((notice) => notice.target))].map((id) => placed(DEMO, id));
  const [x0, x1] = [Math.min(...targets.map((at) => at.x - at.r)), Math.max(...targets.map((at) => at.x + at.r))];
  const [y0, y1] = [Math.min(...targets.map((at) => at.y - at.r)), Math.max(...targets.map((at) => at.y + at.r))];
  const fits = zoomOnto(layoutOf(DEMO), { x0, y0, x1, y1 }, WIDTH, HEIGHT, CINEMA.share) >= CINEMA.farthest;
  expect(focus.centre).toEqual(fits ? [(x0 + x1) / 2, (y0 + y1) / 2] : [placed(DEMO, DEMO.notices[0]?.target ?? '').x, placed(DEMO, DEMO.notices[0]?.target ?? '').y]);
  expect(focus.zoom).toBeGreaterThanOrEqual(CINEMA.farthest);
});

test('a change of one small file is held at the nearest zoom, its neighbours round it, never a file plate', () => {
  const one: MapJson = { ...DEMO, notices: DEMO.notices.slice(0, 1), weather: { ...DEMO.weather, changed: DEMO.weather.changed.filter((file) => file.path === 'libs/core/src/pm/index.ts') } };
  const focus = cinemaFocus(one, WIDTH, HEIGHT, CINEMA);
  const at = placed(DEMO, 'libs/core/src/pm/index.ts');
  expect(focus.zoom).toBe(CINEMA.nearest);
  expect(focus.centre).toEqual([at.x, at.y]);
});

test('a change too wide for the surface frames its notices, and failing them the first, at the widest surface still', () => {
  const layout = layoutOf(DEMO);
  const whole = { x0: 0, y0: 0, x1: layout.width, y1: layout.height };
  // A look whose farthest zoom no box of the demo reaches at its share: every box is too wide.
  const tight = { ...CINEMA, farthest: zoomOnto(layout, whole, WIDTH, HEIGHT, CINEMA.share) * 50 };
  const focus = cinemaFocus(DEMO, WIDTH, HEIGHT, tight);
  const first = placed(DEMO, DEMO.notices[0]?.target ?? '');
  expect(focus.zoom).toBe(tight.farthest);
  expect(focus.centre).toEqual([first.x, first.y]);
});

test("a change with nothing on the terrain frames the field's middle at the surface", () => {
  const ashore: MapJson = { ...DEMO, notices: [], weather: { ...DEMO.weather, changed: DEMO.weather.changed.filter((file) => file.path === 'README.md') } };
  const layout = layoutOf(DEMO);
  expect(cinemaFocus(ashore, WIDTH, HEIGHT, CINEMA)).toEqual({ zoom: CINEMA.farthest, centre: [layout.width / 2, layout.height / 2] });
});

test('at zoom 1 a box the size of the layout fills the picture at the share, whatever the picture', () => {
  const layout = layoutOf(DEMO);
  const whole = { x0: 0, y0: 0, x1: layout.width, y1: layout.height };
  expect(zoomOnto(layout, whole, WIDTH, HEIGHT, 1)).toBeCloseTo(1);
  expect(zoomOnto(layout, whole, 480, 300, 0.5)).toBeCloseTo(0.5);
});

test("the flat frame puts the focus at the picture's middle, the layout at the focus's zoom over the fit, whatever the picture's size", () => {
  const layout = layoutOf(DEMO);
  for (const [width, height] of [
    [WIDTH, HEIGHT],
    [480, 300],
  ] as const) {
    const focus = cinemaFocus(narrow, width, height, CINEMA);
    const frame = cinemaFrame(narrow, width, height, CINEMA);
    expect([frame.width, frame.height]).toEqual([width, height]);
    expect(frame.scale).toBeCloseTo(focus.zoom * Math.min(width / layout.width, height / layout.height));
    const [x, y] = toInset(frame, focus.centre);
    expect(x).toBeCloseTo(width / 2);
    expect(y).toBeCloseTo(height / 2);
  }
  // The zoom is a ratio over the fit, so a smaller picture frames the same stretch of the layout.
  const [small, large] = [cinemaFocus(narrow, 480, 300, CINEMA), cinemaFocus(narrow, WIDTH, HEIGHT, CINEMA)];
  expect(small.zoom).toBeCloseTo(large.zoom);
  expect(small.centre).toEqual(large.centre);
});
