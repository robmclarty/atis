import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson } from 'core';
import { expect, test } from 'vitest';

import { FINGERPRINT, renderFingerprint } from '../fingerprint.js';
import { renderSvg } from '../render.js';
import { drawMembranes, drawOrganelles, drawTerraces } from '../terrain.js';
import { serialize } from '../el.js';

/**
 * The terrain fingerprint (D107): the demo's terrain alone at one small fixed
 * size, its golden landed as the still map's are, by writing it back under
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

test('the fingerprint is one fixed size and the terrain alone: the terraces, the skins and the files, and no weather, notice, shore, chrome or text', () => {
  const map = demo();
  const svg = renderFingerprint(map);
  expect(svg.split('\n', 1)[0]).toBe(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${String(FINGERPRINT.width)} ${String(FINGERPRINT.height)}" width="${String(FINGERPRINT.width)}" height="${String(FINGERPRINT.height)}">`);
  const layout = map.terrain.layout;
  if (layout === undefined) throw new Error('the demo is laid out');
  // Each terrain layer is the still map's own drawing of it, word for word.
  for (const drawn of [drawTerraces(layout), drawMembranes(map.terrain, layout), drawOrganelles(map.terrain, layout)]) {
    expect(svg).toContain(serialize(drawn).trim().split('\n')[0]);
  }
  for (const absent of ['id="weather"', 'id="chrome"', 'id="world"', 'data-notice', '<text', 'font-family']) expect(svg).not.toContain(absent);
  // The still map of the same map does draw the weather; the fingerprint leaves it out.
  expect(renderSvg(map)).toContain('id="weather"');
});

test('a change to the weather leaves the fingerprint alone, and one to the terrain moves it', () => {
  const map = demo();
  const svg = renderFingerprint(map);
  expect(renderFingerprint({ ...map, notices: [], weather: { ...map.weather, changed: [] } })).toBe(svg);
  const layout = map.terrain.layout;
  if (layout === undefined) throw new Error('the demo is laid out');
  expect(renderFingerprint({ ...map, terrain: { ...map.terrain, layout: { ...layout, width: layout.width * 2 } } })).not.toBe(svg);
});

test('a map with no layout has no fingerprint to draw', () => {
  const { layout: _layout, ...terrain } = demo().terrain;
  expect(() => renderFingerprint({ ...demo(), terrain })).toThrow(/no terrain\.layout/);
});
