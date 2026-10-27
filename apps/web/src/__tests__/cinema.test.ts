import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson } from 'core';
import { expect, test } from 'vitest';

import { cinemaView } from '../cinema.js';
import { zoomFor } from '../fit.js';
import { CINEMA } from '../materials.js';
import { viewOf } from '../view.js';

/** A still for a pull request's comment (`?cinema`, D108): framed on what the change is about, on the terrain, between the surface's gate and the cells' level. */
const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', '..', 'libs', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));
const [WIDTH, HEIGHT] = [1280, 800];
const OPENING = viewOf('?cinema=1');

const placed = (map: MapJson, id: string): { readonly x: number; readonly y: number; readonly r: number } => {
  const at = map.terrain.layout?.positions[id];
  if (at === undefined) throw new Error(`the demo does not place ${id}`);
  return at;
};

test('the page asks for a still with ?cinema', () => {
  expect(OPENING.cinema).toBe(true);
  expect(viewOf('')).not.toHaveProperty('cinema');
});

/** The demo's change narrowed to the three files of its `pm` cell, and the notices on them. */
const PM = ['libs/core/src/pm/index.ts', 'libs/core/src/pm/legacy.ts', 'libs/core/src/pm/tools.ts'];
const narrow: MapJson = { ...DEMO, notices: DEMO.notices.filter((notice) => PM.includes(notice.target)), weather: { ...DEMO.weather, changed: DEMO.weather.changed.filter((file) => PM.includes(file.path) || file.path === 'README.md') } };

test("a still frames the change's notices and its files on the terrain, its zoom between the look's two bounds", () => {
  const view = cinemaView(narrow, OPENING, WIDTH, HEIGHT, CINEMA);
  expect(view.zoom).toBeGreaterThanOrEqual(CINEMA.farthest);
  expect(view.zoom).toBeLessThanOrEqual(CINEMA.nearest);
  // The box is the three files' own; the shore's README, which the world draws in the rail, does not pull it.
  const files = PM.map((id) => placed(DEMO, id));
  const [x0, x1] = [Math.min(...files.map((at) => at.x - at.r)), Math.max(...files.map((at) => at.x + at.r))];
  const [y0, y1] = [Math.min(...files.map((at) => at.y - at.r)), Math.max(...files.map((at) => at.y + at.r))];
  expect(view.centre).toEqual([(x0 + x1) / 2, (y0 + y1) / 2]);
  expect(view.backend).toBe(OPENING.backend);
});

test("a change whose files spread wider than the surface allows frames its notices' targets alone", () => {
  const layout = DEMO.terrain.layout;
  if (layout === undefined) throw new Error('the demo is laid out');
  const view = cinemaView(DEMO, OPENING, WIDTH, HEIGHT, CINEMA);
  const targets = [...new Set(DEMO.notices.map((notice) => notice.target))].map((id) => placed(DEMO, id));
  const [x0, x1] = [Math.min(...targets.map((at) => at.x - at.r)), Math.max(...targets.map((at) => at.x + at.r))];
  const [y0, y1] = [Math.min(...targets.map((at) => at.y - at.r)), Math.max(...targets.map((at) => at.y + at.r))];
  const fits = zoomFor(layout, { x0, y0, x1, y1 }, WIDTH, HEIGHT, { right: 0 }, CINEMA.share) >= CINEMA.farthest;
  expect(view.centre).toEqual(fits ? [(x0 + x1) / 2, (y0 + y1) / 2] : [placed(DEMO, DEMO.notices[0]?.target ?? '').x, placed(DEMO, DEMO.notices[0]?.target ?? '').y]);
  expect(view.zoom).toBeGreaterThanOrEqual(CINEMA.farthest);
});

test('a change of one small file is held at the nearest zoom, its neighbours round it, never a file plate', () => {
  const one: MapJson = { ...DEMO, notices: DEMO.notices.slice(0, 1), weather: { ...DEMO.weather, changed: DEMO.weather.changed.filter((file) => file.path === 'libs/core/src/pm/index.ts') } };
  const view = cinemaView(one, OPENING, WIDTH, HEIGHT, CINEMA);
  const at = placed(DEMO, 'libs/core/src/pm/index.ts');
  expect(view.zoom).toBe(CINEMA.nearest);
  expect(view.centre).toEqual([at.x, at.y]);
});

test('a change too wide for the surface frames its notices, and failing them the first, at the widest surface still', () => {
  const layout = DEMO.terrain.layout;
  if (layout === undefined) throw new Error('the demo is laid out');
  const whole = { x0: 0, y0: 0, x1: layout.width, y1: layout.height };
  // A look whose farthest zoom no box of the demo reaches at its share: every box is too wide.
  const tight = { ...CINEMA, farthest: zoomFor(layout, whole, WIDTH, HEIGHT, { right: 0 }, CINEMA.share) * 50 };
  const view = cinemaView(DEMO, OPENING, WIDTH, HEIGHT, tight);
  const first = placed(DEMO, DEMO.notices[0]?.target ?? '');
  expect(view.zoom).toBe(tight.farthest);
  expect(view.centre).toEqual([first.x, first.y]);
});

test('a change with nothing on the terrain frames the field\'s middle at the surface', () => {
  const ashore: MapJson = { ...DEMO, notices: [], weather: { ...DEMO.weather, changed: DEMO.weather.changed.filter((file) => file.path === 'README.md') } };
  const layout = DEMO.terrain.layout;
  expect(cinemaView(ashore, OPENING, WIDTH, HEIGHT, CINEMA)).toEqual({ ...OPENING, zoom: CINEMA.farthest, centre: [(layout?.width ?? 0) / 2, (layout?.height ?? 0) / 2] });
});
