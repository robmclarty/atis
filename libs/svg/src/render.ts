/**
 * render: `map.json` in, one still SVG out (D33).
 *
 * The renderer reads the map and nothing else: no git, no `.check/`, no DOM,
 * no layout of its own (D24). The image is `#world`, the organic material of
 * §5.6, built bottom up in one order: the field, the terraces, the shore, the
 * membranes, the organelles, and over all of it the weather. The chrome is
 * drawn in the step that follows. It is the same bytes for the same map (C3),
 * and it animates nothing (C10).
 */

import type { MapJson } from 'core';

import { el, num, serialize } from './el.js';
import { drawField, drawMembranes, drawOrganelles, drawShore, drawTerraces } from './terrain.js';
import { FONT_FAMILY } from './tokens.js';
import { drawWeather } from './weather.js';

const XMLNS = 'http://www.w3.org/2000/svg';

/**
 * Render a map as SVG. A map without `terrain.layout` is refused rather than
 * laid out here: positions belong to core, so that every renderer draws the
 * same terrain (D24), and a map built without them has nothing to draw on.
 */
export function renderSvg(map: MapJson): string {
  const layout = map.terrain.layout;
  if (layout === undefined) {
    throw new Error('renderSvg: the map has no terrain.layout; the renderer draws a laid-out map and lays out nothing itself (D24)');
  }
  const world = el('g', { id: 'world' }, [
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
        viewBox: `0 0 ${num(layout.width)} ${num(layout.height)}`,
        width: layout.width,
        height: layout.height,
        'font-family': FONT_FAMILY,
      },
      [world],
    ),
  );
}
