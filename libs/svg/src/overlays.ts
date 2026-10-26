/**
 * overlays: one whole-repo overlay over the terrain, as still SVG (D101).
 *
 * A `repo` map has no weather of its own, so the sheet draws one of its
 * overlays where the weather would lie, in the channel the scene gives its
 * measure (C11): history as hatching, at an opacity by its level; what the
 * checks found as a ring of the evidence light just past the file's edge, lit
 * by its level, as a gap is; duplication as the file's outline echoed in two
 * rings; a cycle as a ring in LIFR's hue; and a baselined finding as a ring in
 * the standing state's graphite, muted (D49). The levels are the scene's
 * `overlayOf`, the derivation the world draws from too (D90); this file only
 * draws them. An overlay the map holds as muted, or one with nothing to
 * mark, draws nothing, and the HUD says which (C2).
 */

import type { Layout, MapJson, OverlayName, Position } from 'core';
import {
  EVIDENCE_LIGHT,
  GLYPH_STROKE,
  INTEGRITY_GAP_WIDTH,
  INTEGRITY_PAD,
  LIFR_HUE,
  OVERLAY_ECHO_GAP,
  OVERLAY_ECHO_WIDTH,
  OVERLAY_MUTED_STROKE,
  TEXTURE_MAX_OPACITY,
  overlayOf,
} from 'scene';
import type { OverlayChannel } from 'scene';

import { el } from './el.js';
import type { Markup } from './el.js';
import { HATCH_ID } from './patterns.js';

/** A ring just past a file's edge, the way a skin's evidence is drawn (D71). */
function ring(path: string, level: number, at: Position, stroke: string, opacity: number): Markup {
  return el('circle', { 'data-id': path, 'data-level': level, cx: at.x, cy: at.y, r: at.r + INTEGRITY_PAD, stroke, 'stroke-opacity': opacity === 1 ? undefined : opacity });
}

/** One file's mark in an overlay's channel, at its level. */
function markOf(channel: OverlayChannel, path: string, level: number, at: Position): readonly Markup[] {
  if (channel === 'texture') {
    return [el('circle', { 'data-id': path, 'data-level': level, cx: at.x, cy: at.y, r: at.r, fill: `url(#${HATCH_ID})`, 'fill-opacity': TEXTURE_MAX_OPACITY * level, stroke: 'none' })];
  }
  if (channel === 'luminance') return [ring(path, level, at, EVIDENCE_LIGHT, level)];
  if (channel === 'state') return [ring(path, level, at, LIFR_HUE, 1)];
  if (channel === 'muted') return [ring(path, level, at, OVERLAY_MUTED_STROKE, 1)];
  return [1, 2].map((echo) =>
    el('circle', { 'data-id': path, 'data-echo': echo, cx: at.x, cy: at.y, r: at.r + echo * OVERLAY_ECHO_GAP, stroke: GLYPH_STROKE, 'stroke-width': OVERLAY_ECHO_WIDTH }),
  );
}

/** The overlay `name` over the terrain, every placed file it marks in its channel; undefined where the map holds it muted, or it marks nothing. */
export function drawOverlay(map: MapJson, layout: Layout, name: OverlayName): Markup | undefined {
  const view = overlayOf(map, name);
  if (view === undefined || 'reason' in view) return undefined;
  const marks = view.marks.flatMap(({ path, level }) => {
    const at = layout.positions[path];
    return at === undefined ? [] : markOf(view.channel, path, level, at);
  });
  if (marks.length === 0) return undefined;
  return el('g', { id: 'overlay', 'data-overlay': name, 'data-channel': view.channel, fill: 'none', 'stroke-width': INTEGRITY_GAP_WIDTH }, marks);
}
