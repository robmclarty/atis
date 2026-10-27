/**
 * fingerprint: the terrain alone, small, for a README (D107). The terraces,
 * the cells' skins and the files on them, drawn as the still map draws its
 * ground, with no weather, no notices, no overlay, no shore and no chrome:
 * the shape of the repository and nothing it was asked about. The layout is
 * fitted into one fixed size, centred on the field, so a README's image
 * never changes its footprint, and the same map gives the same bytes (C3),
 * which is what makes a daily refresh change only when the structure does.
 * GitHub Next's repo-visualizer showed that a picture of a repository seen
 * every day makes its structural change noticeable by familiarity.
 */

import type { Layout, MapJson, Terrain } from 'core';
import { FIELD_FILL } from 'scene';

import { el, num, serialize } from './el.js';
import { drawMembranes, drawOrganelles, drawTerraces } from './terrain.js';

const XMLNS = 'http://www.w3.org/2000/svg';

/** A stretch of the layout, in its units. */
type Box = { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };

/**
 * The ground the fingerprint frames: across the field, and down from the
 * first terrace to the last, widened to every cell's skin, so the shore's
 * strip above band 0, which the fingerprint draws nothing of, is left out.
 */
function groundOf(terrain: Terrain, layout: Layout): Box {
  const bands = layout.rows === undefined ? layout.bands : layout.rows.flatMap((row) => row.bands);
  const rings = terrain.cells.flatMap((cell) => layout.contours?.[cell.id] ?? []);
  const xs = [0, layout.width, ...rings.map(([x]) => x)];
  const ys = [...bands.flatMap((band) => [band.y0, band.y1]), ...rings.map(([, y]) => y)];
  return ys.length === 0 ? { x0: 0, y0: 0, x1: layout.width, y1: layout.height } : { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

/** The fingerprint's one size, in pixels, and the margin the terrain keeps from its edges. */
export const FINGERPRINT = { width: 480, height: 300, margin: 8 } as const;

/** Render a map's terrain alone at the fingerprint's size (D107); a map with no layout has no terrain to draw, and is refused as `renderSvg` refuses it (D24). */
export function renderFingerprint(map: MapJson): string {
  const layout = map.terrain.layout;
  if (layout === undefined) throw new Error('renderFingerprint: the map has no terrain.layout; the fingerprint draws a laid-out map (D24)');
  const { width, height, margin } = FINGERPRINT;
  const box = groundOf(map.terrain, layout);
  const [across, down] = [Math.max(1, box.x1 - box.x0), Math.max(1, box.y1 - box.y0)];
  // The scale is written to four places, finer than `num`'s two, and the terrain is centred by the scale as written.
  const scale = Math.floor(Math.min((width - 2 * margin) / across, (height - 2 * margin) / down) * 1e4) / 1e4;
  const x = (width - across * scale) / 2 - box.x0 * scale;
  const y = (height - down * scale) / 2 - box.y0 * scale;
  return serialize(
    el('svg', { xmlns: XMLNS, viewBox: `0 0 ${num(width)} ${num(height)}`, width, height }, [
      el('rect', { id: 'field', width, height, fill: FIELD_FILL }),
      el('g', { id: 'terrain', transform: `translate(${num(x)} ${num(y)}) scale(${String(scale)})` }, [drawTerraces(layout), drawMembranes(map.terrain, layout), drawOrganelles(map.terrain, layout)]),
    ]),
  );
}
