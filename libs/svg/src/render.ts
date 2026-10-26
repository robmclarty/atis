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
 * under the HUD strip so nothing covers it. A `repo` map draws one of its
 * overlays where a change's weather would lie, trouble spots unless asked
 * for another, and its HUD names it (D101). It is the same bytes for the same
 * map (C3), and it animates nothing (C10).
 */

import type { Layout, MapJson, OverlayName } from 'core';
import { DEFAULT_OVERLAY, FONT_FAMILY } from 'scene';

import { drawChrome, drawGround } from './chrome.js';
import type { Chrome } from './chrome.js';
import { el, num, serialize } from './el.js';
import type { Markup } from './el.js';
import { drawOverlay } from './overlays.js';
import { drawField, drawMembranes, drawOrganelles, drawTerraces } from './terrain.js';
import { drawWeather } from './weather.js';

const XMLNS = 'http://www.w3.org/2000/svg';

/** A map's layout and the chrome drawn round it, and the overlay a `repo` map draws: everything the sheet is cut to, before anything is laid over it. */
export type Frame = { readonly layout: Layout; readonly chrome: Chrome; readonly overlay?: OverlayName };

/** How to draw a map: which overlay a `repo` map draws, trouble spots unless another is named; a map of a change has none to draw (D101). */
export type RenderOptions = { readonly overlay?: OverlayName | undefined };

/**
 * The frame a map is drawn in. A map without `terrain.layout` is refused
 * rather than laid out here: positions belong to core, so that every
 * renderer draws the same terrain (D24), and a map built without them has
 * nothing to draw on.
 */
export function frameOf(map: MapJson, options: RenderOptions = {}): Frame {
  const layout = map.terrain.layout;
  if (layout === undefined) {
    throw new Error('renderSvg: the map has no terrain.layout; the renderer draws a laid-out map and lays out nothing itself (D24)');
  }
  if (map.overlays === undefined) return { layout, chrome: drawChrome(map, layout) };
  const overlay = options.overlay ?? DEFAULT_OVERLAY;
  return { layout, chrome: drawChrome(map, layout, overlay), overlay };
}

/** The sheet: the ground, the world under the HUD strip cropped to the terrain, the chrome with the shore's band under the world, and over all of them whatever `over` lays on top (the practice map's callouts). */
export function drawSheet(map: MapJson, { layout, chrome, overlay }: Frame, over: readonly Markup[] = []): string {
  const drawn = overlay === undefined ? undefined : drawOverlay(map, layout, overlay);
  const world = el('g', { id: 'world', transform: `translate(0 ${num(chrome.originY)})` }, [
    drawField(layout, chrome.worldTop),
    drawTerraces(layout),
    drawMembranes(map.terrain, layout),
    drawOrganelles(map.terrain, layout),
    drawWeather(map, layout),
    ...(drawn === undefined ? [] : [drawn]),
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

/** Render a map as SVG; a `repo` map draws the overlay `options` names, trouble spots by default (D101). */
export function renderSvg(map: MapJson, options: RenderOptions = {}): string {
  return drawSheet(map, frameOf(map, options));
}
