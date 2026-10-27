import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson } from 'core';
import { CHROME_GROUND, MINIMAP, bodyBounds, fixedFrame, minimapIn } from 'scene';
import { expect, test } from 'vitest';

import { FINGERPRINT, renderFingerprint } from '../fingerprint.js';
import { renderSvg } from '../render.js';

/**
 * The terrain fingerprint (D107), drawn as the minimap draws the field
 * (D175): the demo's body, skins and files alone at one small fixed size,
 * its golden landed as the still map's are, by writing it back under
 * `ATIS_UPDATE_GOLDENS=1` and reading the diff before committing it.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const GOLDEN = join(HERE, '..', '..', 'fixtures', 'demo', 'fingerprint.svg');

const demo = (): MapJson => assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));

test('the demo renders its fingerprint golden byte for byte, and the same bytes twice', () => {
  const svg = renderFingerprint(demo());
  if (process.env['ATIS_UPDATE_GOLDENS'] === '1') writeFileSync(GOLDEN, svg);
  expect(svg).toBe(readFileSync(GOLDEN, 'utf8'));
  expect(renderFingerprint(demo())).toBe(svg);
});

test("the fingerprint is one fixed size and the minimap's terrain alone: the body, the skins and the files, and no weather, notice, shore, chrome or text", () => {
  const map = demo();
  const svg = renderFingerprint(map);
  expect(svg.split('\n', 1)[0]).toBe(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${String(FINGERPRINT.width)} ${String(FINGERPRINT.height)}" width="${String(FINGERPRINT.width)}" height="${String(FINGERPRINT.height)}">`);
  expect(svg).toContain(`<rect id="ground" width="${String(FINGERPRINT.width)}" height="${String(FINGERPRINT.height)}" fill="${CHROME_GROUND}"/>`);
  expect(svg).toContain(`<path id="body" d="M`);
  expect(svg).toContain(`fill="${MINIMAP.body}"`);
  expect(svg).toContain(`stroke="${MINIMAP.skin}"`);
  // Every file the terrain places is a flat disc at its own size, the minimap zoomed onto the whole body.
  const bounds = bodyBounds(map);
  if (bounds === undefined) throw new Error('the demo is laid out');
  const drawn = minimapIn(map, fixedFrame(bounds, { width: FINGERPRINT.width, height: FINGERPRINT.height, pad: FINGERPRINT.margin }));
  expect(svg.match(/<circle /g)).toHaveLength(drawn?.files.filter((file) => 2 * file.r >= MINIMAP.fileFloor).length ?? -1);
  expect(drawn?.files).toHaveLength(map.terrain.organelles.length);
  for (const absent of ['id="reach"', 'id="changed"', 'id="marks"', 'data-run', 'id="weather"', 'id="terraces"', 'id="chrome"', 'id="world"', '<text', 'font-family', 'opacity', 'filter']) expect(svg).not.toContain(absent);
  // The still map of the same map does draw the weather; the fingerprint leaves it out.
  expect(renderSvg(map)).toContain('id="weather"');
});

test('the whole body sits inside the fixed size, centred, its margin kept on the side it fills', () => {
  const map = demo();
  const bounds = bodyBounds(map);
  if (bounds === undefined) throw new Error('the demo is laid out');
  const frame = fixedFrame(bounds, { width: FINGERPRINT.width, height: FINGERPRINT.height, pad: FINGERPRINT.margin });
  const [x0, y0, x1, y1] = [(bounds.x0 - frame.x) * frame.scale, (bounds.y0 - frame.y) * frame.scale, (bounds.x1 - frame.x) * frame.scale, (bounds.y1 - frame.y) * frame.scale];
  expect(x0 + x1).toBeCloseTo(FINGERPRINT.width);
  expect(y0 + y1).toBeCloseTo(FINGERPRINT.height);
  expect(Math.min(x0, y0)).toBeCloseTo(FINGERPRINT.margin);
});

test('a change to the weather leaves the fingerprint alone, and one to the terrain moves it', () => {
  const map = demo();
  const svg = renderFingerprint(map);
  expect(renderFingerprint({ ...map, notices: [], weather: { ...map.weather, changed: [] } })).toBe(svg);
  const layout = map.terrain.layout;
  if (layout === undefined) throw new Error('the demo is laid out');
  const [first, ...rest] = map.terrain.organelles;
  if (first === undefined) throw new Error('the demo has files');
  const at = layout.positions[first.id];
  if (at === undefined) throw new Error('the demo places its files');
  expect(renderFingerprint({ ...map, terrain: { ...map.terrain, organelles: rest } })).not.toBe(svg);
  expect(renderFingerprint({ ...map, terrain: { ...map.terrain, layout: { ...layout, positions: { ...layout.positions, [first.id]: { ...at, r: at.r * 2 } } } } })).not.toBe(svg);
});

test('a map with no layout has no fingerprint to draw', () => {
  const { layout: _layout, ...terrain } = demo().terrain;
  expect(() => renderFingerprint({ ...demo(), terrain })).toThrow(/no terrain\.layout/);
});
