/**
 * patterns: what the weather refers to by id rather than draws in place.
 *
 * Texture means history (P3, C11): the hatching churn is painted with and
 * the stipple bug-fix rate is painted with are each drawn once here, in one
 * neutral ink, and every organelle that carries a value is overlaid with the
 * pattern at an opacity by that value. Beside them sit the blur the reach
 * glows through and one arrowhead per exceptional edge kind in that kind's
 * hue, since a marker cannot borrow its line's colour in every renderer. All
 * of it lives under `#world`: a filter belongs to the organic material, and
 * the chrome never gets one (D12).
 */

import type { ExceptionalEdgeKind } from 'core';

import { el, num } from './el.js';
import type { Markup } from './el.js';
import { ARROW_SIZE, CHANGE_HUE, HATCH_PITCH, HATCH_WIDTH, LIFR_HUE, REACH_BLUR, STIPPLE_DOT, STIPPLE_PITCH, TEXTURE_INK } from './tokens.js';

export const HATCH_ID = 'hatch';
export const STIPPLE_ID = 'stipple';
export const GLOW_ID = 'glow';

/** Hue means state (C11): a cycle or a boundary crossed is LIFR; an import this change introduced across cells is the change's own. */
export const EDGE_HUES: Readonly<Record<ExceptionalEdgeKind, string>> = {
  boundary: LIFR_HUE,
  cycle: LIFR_HUE,
  'new-cross-module': CHANGE_HUE,
};

const EDGE_KINDS: readonly ExceptionalEdgeKind[] = ['boundary', 'cycle', 'new-cross-module'];

/** The arrowhead an edge of this kind ends in. */
export function arrowId(kind: ExceptionalEdgeKind): string {
  return `arrow-${kind}`;
}

/** The definitions, drawn once: the two textures, the glow, and an arrowhead per edge kind. */
export function drawDefs(): Markup {
  return el('defs', {}, [
    el('pattern', { id: HATCH_ID, patternUnits: 'userSpaceOnUse', width: HATCH_PITCH, height: HATCH_PITCH }, [
      el('path', { d: `M0 ${num(HATCH_PITCH)}L${num(HATCH_PITCH)} 0`, stroke: TEXTURE_INK, 'stroke-width': HATCH_WIDTH }),
    ]),
    el('pattern', { id: STIPPLE_ID, patternUnits: 'userSpaceOnUse', width: STIPPLE_PITCH, height: STIPPLE_PITCH }, [
      el('circle', { cx: STIPPLE_PITCH / 2, cy: STIPPLE_PITCH / 2, r: STIPPLE_DOT, fill: TEXTURE_INK }),
    ]),
    el('filter', { id: GLOW_ID, x: '-25%', y: '-25%', width: '150%', height: '150%' }, [
      el('feGaussianBlur', { stdDeviation: REACH_BLUR }),
    ]),
    ...EDGE_KINDS.map((kind) =>
      el(
        'marker',
        { id: arrowId(kind), viewBox: '0 0 6 6', refX: 5, refY: 3, markerWidth: ARROW_SIZE, markerHeight: ARROW_SIZE, orient: 'auto', fill: EDGE_HUES[kind] },
        [el('path', { d: 'M0 0L6 3L0 6Z' })],
      ),
    ),
  ]);
}
