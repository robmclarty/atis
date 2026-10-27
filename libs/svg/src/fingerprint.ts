/**
 * fingerprint: the terrain alone, small, for a README (D107), drawn as the
 * minimap draws the field (D175): the body flat in one grey, each cell's
 * skin drawn round, and every file a flat disc at its own size, with no
 * weather, no notices, no overlay, no shore and no text: the shape of the
 * repository and nothing it was asked about, a flat map to orient on rather
 * than the still map's dim tissue. The whole terrain is fitted into one fixed
 * size, centred, so a README's image never changes its footprint, and the
 * same map gives the same bytes (C3), which is what makes a daily refresh
 * change only when the structure does. GitHub Next's repo-visualizer showed
 * that a picture of a repository seen every day makes its structural change
 * noticeable by familiarity.
 */

import type { MapJson } from 'core';
import { CHROME_GROUND, MINIMAP, bodyBounds, fixedFrame, minimapIn } from 'scene';

import { el, num, serialize } from './el.js';
import { drawMinimapTerrain } from './minimap.js';

const XMLNS = 'http://www.w3.org/2000/svg';

/** The fingerprint's one size, in pixels, and the margin the terrain keeps from its edges. */
export const FINGERPRINT = { width: 480, height: 300, margin: 8 } as const;

/** Render a map's terrain alone at the fingerprint's size (D107, D175); a map with no layout has no terrain to draw, and is refused as `renderSvg` refuses it (D24). */
export function renderFingerprint(map: MapJson): string {
  const bounds = bodyBounds(map);
  const { width, height, margin } = FINGERPRINT;
  const drawn = bounds === undefined ? undefined : minimapIn(map, fixedFrame(bounds, { width, height, pad: margin }));
  if (drawn === undefined) throw new Error('renderFingerprint: the map has no terrain.layout; the fingerprint draws a laid-out map (D24)');
  return serialize(
    el('svg', { xmlns: XMLNS, viewBox: `0 0 ${num(width)} ${num(height)}`, width, height }, [
      el('rect', { id: 'ground', width, height, fill: CHROME_GROUND }),
      el('g', { id: 'terrain' }, drawMinimapTerrain(drawn, MINIMAP)),
    ]),
  );
}
