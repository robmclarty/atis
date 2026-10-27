import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson } from 'core';
import { CHANGE_HUE, CHROME_GROUND, CINEMA, IFR_HUE, LABELING, MINIMAP, NOTICE_BOX, calloutsOf, cinemaFrame, minimapIn } from 'scene';
import { expect, test } from 'vitest';

import { CINEMA_CALLOUT, CINEMA_STILL, renderCinema } from '../cinema.js';
import { num } from '../el.js';

/**
 * The comment's still (D174), drawn as the minimap draws the field, as if it
 * could be zoomed in (D175): the demo framed on its change, its golden landed
 * as the still map's are, by writing it back under `ATIS_UPDATE_GOLDENS=1`
 * and reading the diff before committing it.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const GOLDEN = join(HERE, '..', '..', 'fixtures', 'demo', 'cinema.svg');

const demo = (): MapJson => assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));

const drawnOf = (map: MapJson): NonNullable<ReturnType<typeof minimapIn>> => {
  const drawn = minimapIn(map, cinemaFrame(map, CINEMA_STILL.width, CINEMA_STILL.height, CINEMA));
  if (drawn === undefined) throw new Error('the demo is laid out');
  return drawn;
};

test('the demo renders its still golden byte for byte, and the same bytes twice', () => {
  const svg = renderCinema(demo());
  if (process.env['ATIS_UPDATE_GOLDENS'] === '1') writeFileSync(GOLDEN, svg);
  expect(svg).toBe(readFileSync(GOLDEN, 'utf8'));
  expect(renderCinema(demo())).toBe(svg);
});

test("the still is the minimap's whole drawing at the cinema framing, drawn at half its size and shown at twice, flat and with no world", () => {
  const svg = renderCinema(demo());
  const { width, height, density } = CINEMA_STILL;
  expect(svg.split('\n', 1)[0]).toBe(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${String(width)} ${String(height)}" width="${String(width * density)}" height="${String(height * density)}" font-family="ui-monospace, Menlo, Consolas, monospace">`);
  expect(svg).toContain(`<rect id="ground" width="${String(width)}" height="${String(height)}" fill="${CHROME_GROUND}"/>`);
  for (const layer of ['<path id="body"', '<g id="reach">', '<path id="skins"', '<g id="files"', '<g id="changed">', '<g id="leaders"', '<g id="callouts">']) expect(svg).toContain(layer);
  // Flat chrome: no lit world, no gradient, no glow and no translucency (D12).
  for (const absent of ['id="world"', 'id="terraces"', 'id="weather"', 'Gradient', 'filter', 'opacity', '<animate']) expect(svg).not.toContain(absent);
});

test('the changed files are dots in the change hue at least the minimap\'s, a deleted one hollow, over the files at their own size', () => {
  const svg = renderCinema(demo());
  const drawn = drawnOf(demo());
  const added = drawn.changed.find((file) => file.path === 'libs/core/src/pm/tools.ts');
  const deleted = drawn.changed.find((file) => file.path === 'libs/core/src/pm/legacy.ts');
  if (added === undefined || deleted === undefined) throw new Error('the demo frames its pm cell');
  expect(svg).toContain(`<circle data-changed="libs/core/src/pm/tools.ts" cx="${num(added.x)}" cy="${num(added.y)}" r="${num(Math.max(added.r, MINIMAP.changedR))}" fill="${CHANGE_HUE}"/>`);
  expect(svg).toContain(`<circle data-changed="libs/core/src/pm/legacy.ts" cx="${num(deleted.x)}" cy="${num(deleted.y)}" r="${num(Math.max(deleted.r, MINIMAP.changedR))}" fill="none" stroke="${CHANGE_HUE}" stroke-width="1"/>`);
  // The shore's README is the rail's, so neither the frame nor the still draws it.
  expect(svg).not.toContain('README.md');
});

test("the notices' targets are its only labels, each a block of its numbered boxes and its name set off the body, with a leader back to it, and a target outside the frame has none", () => {
  const map = demo();
  const svg = renderCinema(map);
  const callouts = calloutsOf(map, drawnOf(map), CINEMA_CALLOUT);
  expect(callouts.map((callout) => [callout.target, callout.text, callout.marked.map((mark) => mark.rank)])).toEqual([
    ['libs/core/src/pm/index.ts', 'index.ts', [1, 2, 3, 4]],
    ['libs/core/src/pm/tools.ts', '+tools.ts', [6]],
  ]);
  const [primary] = callouts;
  if (primary === undefined) throw new Error('the demo frames its primary');
  const top = primary.box.y + (primary.box.height - NOTICE_BOX) / 2;
  expect(svg).toContain(`<g data-mark="1" data-tier="primary">\n          <rect x="${num(primary.box.x + LABELING.pad)}" y="${num(top)}" width="10" height="10" fill="${IFR_HUE}"/>`);
  expect(svg).toContain('>index.ts</text>');
  expect(svg).toContain(`<line data-leader="libs/core/src/pm/index.ts" x1="${num(primary.leader[0][0])}" y1="${num(primary.leader[0][1])}" x2="${num(primary.leader[1][0])}" y2="${num(primary.leader[1][1])}"/>`);
  expect([...svg.matchAll(/data-mark="(\d)"/g)].map((match) => match[1])).toEqual(['1', '2', '3', '4', '6']);
  // The fifth notice's file lies off the frame but for its edge, so the still names no file the reader cannot find; no other file is named.
  expect(svg).not.toContain('data-callout="apps/cli/src/doctor.ts"');
  expect(svg).not.toContain('>doctor.ts<');
  expect(svg.match(/<text /g)).toHaveLength(callouts.length + 5);
});

test("a change to the weather moves the still, and one with no notices or changes on the terrain frames the field's middle", () => {
  const map = demo();
  const calm: MapJson = { ...map, notices: [], weather: { ...map.weather, changed: [] } };
  const svg = renderCinema(calm);
  expect(svg).not.toBe(renderCinema(map));
  expect(svg).not.toContain('data-mark');
  expect(svg).not.toContain('data-changed');
});

test('a map with no layout has no still to draw', () => {
  const { layout: _layout, ...terrain } = demo().terrain;
  expect(() => renderCinema({ ...demo(), terrain })).toThrow(/no terrain\.layout/);
});
