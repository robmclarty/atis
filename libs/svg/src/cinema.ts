/**
 * cinema: the still a pull request's comment shows (D108, D174), drawn as the
 * minimap draws the field, as if it could be zoomed in (D175): the body and
 * its skins flat, every file a flat disc, the reach, the changed files and
 * the notices' numbered boxes, framed where the world's `?cinema` page stands
 * its camera, on the box round the change's notices and changed files on
 * the terrain, between just past the surface's gate and short of the cells'
 * level (`CINEMA`). A comment's reader cannot zoom, so the still frames what
 * the change is about, and the comment's numbered list points into it. Its
 * only words are the names of the notices' targets it frames, each in a
 * callout set off the body on the empty ground, with the target's numbered
 * boxes and a leader back to it. It is drawn at half its size and shown at
 * twice, so the boxes, the dots and the hairlines read at the minimap's own
 * sizes in a comment's column. No browser draws it, and the same map gives
 * the same bytes (C3).
 */

import type { MapJson } from 'core';
import { CHROME_GROUND, CHROME_INK, CINEMA, FONT_FAMILY, LABELING, MINIMAP, NOTICE_BOX, NOTICE_BOX_GAP, NOTICE_TEXT_GAP, NOTICE_TEXT_SIZE, calloutsOf, cinemaFrame, minimapIn } from 'scene';
import type { CalloutLook } from 'scene';

import { CATEGORY_HUES } from './chrome.js';
import { el, num, serialize } from './el.js';
import { drawCallouts, drawMinimap } from './minimap.js';

const XMLNS = 'http://www.w3.org/2000/svg';

/** The still's size in the minimap's pixels, and how many times that it is shown at. */
export const CINEMA_STILL = { width: 480, height: 300, density: 2 } as const;

/** The callouts set as the still map's chrome sets a notice: its text size and numbered box, the minimap's gap between boxes, and the world's label padding. */
export const CINEMA_CALLOUT: CalloutLook = { fontSize: NOTICE_TEXT_SIZE, pad: LABELING.pad, box: NOTICE_BOX, boxGap: NOTICE_BOX_GAP / 2, textGap: NOTICE_TEXT_GAP, gap: LABELING.gap, end: MINIMAP.changedR };

/** Render a map's cinema still (D174, D175); a map with no layout has nothing to frame, and is refused as `renderSvg` refuses it (D24). */
export function renderCinema(map: MapJson): string {
  const { width, height, density } = CINEMA_STILL;
  const drawn = map.terrain.layout === undefined ? undefined : minimapIn(map, cinemaFrame(map, width, height, CINEMA));
  if (drawn === undefined) throw new Error('renderCinema: the map has no terrain.layout; the still draws a laid-out map (D24)');
  const hue = CATEGORY_HUES[map.weather.checks.category] ?? CHROME_INK;
  return serialize(
    el('svg', { xmlns: XMLNS, viewBox: `0 0 ${num(width)} ${num(height)}`, width: width * density, height: height * density, 'font-family': FONT_FAMILY }, [
      el('rect', { id: 'ground', width, height, fill: CHROME_GROUND }),
      el('g', { id: 'minimap' }, drawMinimap(drawn, MINIMAP)),
      el('g', { id: 'labels' }, drawCallouts(calloutsOf(map, drawn, CINEMA_CALLOUT), CINEMA_CALLOUT, hue)),
    ]),
  );
}
