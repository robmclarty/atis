/**
 * render: `map.json` in, one still SVG out (D33).
 *
 * The renderer reads the map and nothing else: no git, no `.check/`, no DOM,
 * no layout of its own (D24). The image is two materials on one sheet
 * (D12): `#world`, the organic material of §5.6, built bottom up in one
 * order (the field, the terraces, the shore, the membranes, the organelles,
 * and over all of it the weather), and `#chrome`, the brutalist frame of §7
 * that stands above and beside it and annotates it. The chrome decides the
 * canvas, since it is what the world is framed by, and the world is set down
 * under the HUD strip so nothing covers it. It is the same bytes for the same
 * map (C3), and it animates nothing (C10).
 */

import type { Layout, MapJson } from 'core';
import { FONT_FAMILY } from 'scene';

import { drawChrome, drawGround } from './chrome.js';
import type { Chrome } from './chrome.js';
import { el, num, serialize } from './el.js';
import type { Markup } from './el.js';
import { drawField, drawMembranes, drawOrganelles, drawShore, drawTerraces } from './terrain.js';
import { drawWeather } from './weather.js';

const XMLNS = 'http://www.w3.org/2000/svg';

/** A map's layout and the chrome drawn round it: everything the sheet is cut to, before anything is laid over it. */
export type Frame = { readonly layout: Layout; readonly chrome: Chrome };

/**
 * The frame a map is drawn in. A map without `terrain.layout` is refused
 * rather than laid out here: positions belong to core, so that every
 * renderer draws the same terrain (D24), and a map built without them has
 * nothing to draw on.
 */
export function frameOf(map: MapJson): Frame {
  const layout = map.terrain.layout;
  if (layout === undefined) {
    throw new Error('renderSvg: the map has no terrain.layout; the renderer draws a laid-out map and lays out nothing itself (D24)');
  }
  return { layout, chrome: drawChrome(map, layout) };
}

/** The sheet: the ground, the world under the HUD strip, the chrome, and over all of them whatever `over` lays on top (the practice map's callouts). */
export function drawSheet(map: MapJson, { layout, chrome }: Frame, over: readonly Markup[] = []): string {
  const world = el('g', { id: 'world', transform: `translate(0 ${num(chrome.worldY)})` }, [
    drawField(layout),
    drawTerraces(layout),
    drawShore(map.terrain, layout),
    drawMembranes(map.terrain, layout),
    drawOrganelles(map.terrain, layout),
    drawWeather(map, layout),
  ]);
  return serialize(
    el(
      'svg',
      {
        xmlns: XMLNS,
        viewBox: `0 0 ${num(chrome.width)} ${num(chrome.height)}`,
        width: chrome.width,
        height: chrome.height,
        'font-family': FONT_FAMILY,
      },
      [drawGround(chrome), world, chrome.markup, ...over],
    ),
  );
}

/** Render a map as SVG. */
export function renderSvg(map: MapJson): string {
  return drawSheet(map, frameOf(map));
}
