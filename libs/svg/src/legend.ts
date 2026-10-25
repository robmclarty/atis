/**
 * legend: the key every map carries in its chrome (D87), and the one list
 * of marks it keys, which the practice map numbers its callouts from (D125).
 *
 * The retake's reader heard the legend once and was "just guessing and
 * intuiting" by the maps, so the key now rides on the map itself: a compact
 * inset at the foot of the notice column, one numbered row per mark, each a
 * small sample of the mark beside a few words on what it measures, never on
 * how to weigh it (D66). The inset is chrome, so it is flat (D12): the
 * samples are the world's own shapes and inks with nothing that glows or
 * fades: each ink the world draws at a share (the hairline, the reach's warm
 * glow and its crossings, the history's textures) is drawn here already laid
 * over what it lies on, and a texture as its own lines and dots, never a
 * pattern.
 *
 * `docs/glance-test.md` lists the same marks under the same numbers, and a
 * test holds the two lists together.
 */

import {
  CALLOUT_FONT_SIZE,
  CALLOUT_R,
  CATEGORY_LETTERS,
  CHANGE_HUE,
  CHROME_GROUND,
  CHROME_INK,
  CHROME_MUTED,
  CHROME_STROKE_WIDTH,
  CROSSING_OPACITY,
  CROSSING_PAD,
  EVIDENCE_LIGHT,
  GHOST_DASH,
  GHOST_PAD,
  GHOST_STROKE,
  HATCH_PITCH,
  HATCH_WIDTH,
  IFR_HUE,
  INTEGRITY_CLOSED_OPACITY,
  INTEGRITY_CLOSED_WIDTH,
  INTEGRITY_GAP_WIDTH,
  INTEGRITY_PAD,
  LABEL_BASELINE,
  LEGEND_FONT_SIZE,
  LEGEND_KEY_PITCH,
  LEGEND_PAD,
  LEGEND_ROW,
  LEGEND_SAMPLE_R,
  LEGEND_SLOT,
  LIFR_HUE,
  MAX_RULES,
  MONO_ADVANCE,
  MVFR_HUE,
  ORGANELLE_FILL,
  ORGANELLE_STROKE,
  ORGANELLE_STROKE_WIDTH,
  REACH_GLOW,
  REACH_ORIGIN_OPACITY,
  STANDING_STORM_FILL,
  STANDING_STORM_SCALE,
  STIPPLE_DOT,
  STIPPLE_PITCH,
  STITCH_SPACING,
  STITCH_WIDTH,
  TEXTURE_INK,
  TEXTURE_MAX_OPACITY,
  VFR_HUE,
  outlineOf,
  reachLuminance,
} from 'scene';

import { el, num } from './el.js';
import type { Markup } from './el.js';
import { pathOf } from './terrain.js';
import { STORM_GLYPH, notchOf, stitchOf, stitchStroke } from './weather.js';

/** One mark the legend keys: its id, which the practice map's callouts find it by, and the few words its row says. */
export type LegendMark = { readonly id: string; readonly words: string };

/**
 * The marks, numbered from 1 in this order, on the inset, on the practice
 * map's callouts and in `docs/glance-test.md`: the category first, then the
 * evidence on a changed file's skin, the storms, the ghost, and the change
 * itself; then the reach's light and its crossings, and last the history's
 * two textures (D166), so every mark that lights or textures the map has a
 * row.
 */
export const LEGEND: readonly LegendMark[] = [
  { id: 'category', words: 'category: set by the change alone' },
  { id: 'lit-arc', words: 'lit arc: changed lines no test ran' },
  { id: 'hairline', words: 'hairline: changed lines the tests ran' },
  { id: 'notch', words: 'notch: a mutant no test killed' },
  { id: 'stitches', words: 'stitches: its tests passed, not run, failed' },
  { id: 'red-bolt', words: 'red bolt: a failing check names a changed file' },
  { id: 'grey-bolt', words: 'grey bolt: fails on files the change left alone' },
  { id: 'ghost', words: 'ghost: usually changes with these, and did not' },
  { id: 'stain', words: 'cyan: a changed file; +path in a row: added' },
  { id: 'unmeasured', words: 'skin lit whole: no coverage report names it' },
  { id: 'reach', words: 'warm light: the reach, dimmer each module out' },
  { id: 'crossing', words: 'lit halo: where the reach leaves a module' },
  { id: 'hatching', words: 'hatching: how much of it was rewritten lately' },
  { id: 'stipple', words: 'stipple: how many of its commits fixed bugs' },
];

/** The category scale the first row draws, each block solid in its hue with its letters on it (C11). */
const CATEGORIES: readonly (readonly [string, string])[] = [
  ['VFR', VFR_HUE],
  ['MVFR', MVFR_HUE],
  ['IFR', IFR_HUE],
  ['LIFR', LIFR_HUE],
];

const TOP = -Math.PI / 2;
const BOTTOM = Math.PI / 2;
/** How much of the sample skin the lit arc takes, from the top clockwise. */
const ARC_SHARE = 0.4;
/** The stitch sample's three statuses, as the map writes them, left to right. */
const STITCHES: readonly string[] = ['passed', 'not-run', 'failed'];
/** The reach sample's three hops, brightest first, one block each across the slot. */
const HOPS: readonly number[] = [0, 1, 2];

function channel(hex: string, at: number): number {
  return Number.parseInt(hex.slice(at, at + 2), 16);
}

/** A `#rrggbb` colour laid at `share` over another, flattened to the colour the eye sees. */
function over(top: string, under: string, share: number): string {
  return `#${[1, 3, 5]
    .map((at) => Math.round(channel(top, at) * share + channel(under, at) * (1 - share)))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`;
}

/** The world's dim hairline, flat: the evidence light at the hairline's strength over the chrome's ground. */
const HAIRLINE = over(EVIDENCE_LIGHT, CHROME_GROUND, INTEGRITY_CLOSED_OPACITY);
/** The history's one ink, flat: the texture at its full strength over the file it is laid on. */
const TEXTURE = over(TEXTURE_INK, ORGANELLE_FILL, TEXTURE_MAX_OPACITY);

/** The numbered balloon a legend row and its callout share: the number in a ring of the chrome's ink, on its ground. */
export function drawBalloon(number: number, x: number, y: number): Markup {
  return el('g', { 'data-balloon': number }, [
    el('circle', { cx: x, cy: y, r: CALLOUT_R, fill: CHROME_GROUND, stroke: CHROME_INK, 'stroke-width': CHROME_STROKE_WIDTH }),
    el(
      'text',
      {
        x,
        y: y + CALLOUT_FONT_SIZE * LABEL_BASELINE,
        'font-size': CALLOUT_FONT_SIZE,
        'font-weight': 'bold',
        'text-anchor': 'middle',
        fill: CHROME_INK,
      },
      [String(number)],
    ),
  ]);
}

type Sample = { readonly marks: readonly Markup[]; readonly width: number };

/** A sample that keeps to its slot. */
function plain(marks: readonly Markup[]): Sample {
  return { marks, width: LEGEND_SLOT };
}

function file(x: number, y: number, fill = ORGANELLE_FILL): Markup {
  return el('circle', { cx: x, cy: y, r: LEGEND_SAMPLE_R, fill, stroke: ORGANELLE_STROKE, 'stroke-width': ORGANELLE_STROKE_WIDTH });
}

function skin(x: number, y: number, stroke: string, width: number): Markup {
  return el('circle', { cx: x, cy: y, r: LEGEND_SAMPLE_R + INTEGRITY_PAD, fill: 'none', stroke, 'stroke-width': width });
}

function hairline(x: number, y: number): Markup {
  return skin(x, y, HAIRLINE, INTEGRITY_CLOSED_WIDTH);
}

/**
 * The reach's light, flat: one block per hop across the slot, each the warm
 * glow at the share the world lights a cell entered at that hop, laid over
 * the chrome's ground, so the row shows the light dimming one module out.
 */
function reach(x: number, y: number): readonly Markup[] {
  const width = LEGEND_SLOT / HOPS.length;
  return HOPS.map((hops, index) =>
    el('rect', {
      'data-hops': hops,
      x: x - LEGEND_SLOT / 2 + index * width,
      y: y - LEGEND_SAMPLE_R,
      width,
      height: 2 * LEGEND_SAMPLE_R,
      fill: over(REACH_GLOW, CHROME_GROUND, REACH_ORIGIN_OPACITY * reachLuminance(hops)),
    }),
  );
}

/** A lit crossing, flat: the warm disc past the file's edge at the crossing's strength, the file's outline inside it. */
function crossing(x: number, y: number): readonly Markup[] {
  return [
    el('circle', { cx: x, cy: y, r: LEGEND_SAMPLE_R + CROSSING_PAD, fill: over(REACH_GLOW, CHROME_GROUND, CROSSING_OPACITY) }),
    el('circle', { cx: x, cy: y, r: LEGEND_SAMPLE_R, fill: 'none', stroke: ORGANELLE_STROKE, 'stroke-width': ORGANELLE_STROKE_WIDTH }),
  ];
}

/**
 * Churn's hatching on a file, drawn as the lines themselves rather than a
 * pattern: the world's diagonals, `x + y` a multiple of the pitch from the
 * file's centre, each cut to the file's disc inside its outline.
 */
function hatching(x: number, y: number): readonly Markup[] {
  const r = LEGEND_SAMPLE_R - ORGANELLE_STROKE_WIDTH / 2;
  const most = Math.floor((r * Math.SQRT2) / HATCH_PITCH);
  const lines = Array.from({ length: 2 * most + 1 }, (_, index) => (index - most) * HATCH_PITCH).flatMap((sum) => {
    const off = Math.abs(sum) / Math.SQRT2;
    if (off >= r) return [];
    const half = Math.sqrt(r * r - off * off) / Math.SQRT2;
    return [el('line', { x1: x + sum / 2 - half, y1: y + sum / 2 + half, x2: x + sum / 2 + half, y2: y + sum / 2 - half, stroke: TEXTURE, 'stroke-width': HATCH_WIDTH })];
  });
  return [file(x, y), ...lines];
}

/** Bug-fix rate's stipple on a file, drawn as the dots themselves: the world's grid, a dot in the middle of each pitch, every dot that sits whole inside the file. */
function stipple(x: number, y: number): readonly Markup[] {
  const r = LEGEND_SAMPLE_R - ORGANELLE_STROKE_WIDTH / 2;
  const most = Math.ceil(r / STIPPLE_PITCH);
  const offsets = Array.from({ length: 2 * most }, (_, index) => (index - most + 0.5) * STIPPLE_PITCH);
  const dots = offsets.flatMap((dy) =>
    offsets.flatMap((dx) => (Math.hypot(dx, dy) + STIPPLE_DOT <= r ? [el('circle', { cx: x + dx, cy: y + dy, r: STIPPLE_DOT, fill: TEXTURE })] : [])),
  );
  return [file(x, y), ...dots];
}

function bolt(x: number, y: number, fill: string, scale: number): Markup {
  return el('path', { d: STORM_GLYPH, fill, transform: `translate(${num(x)} ${num(y)}) scale(${num(scale)})` });
}

/** The category scale: one solid block per hue, the letters written on it. */
function categories(x: number, y: number): Sample {
  let left = x;
  const blocks = CATEGORIES.map(([letters, hue]) => {
    const width = letters.length * LEGEND_FONT_SIZE * MONO_ADVANCE + LEGEND_PAD;
    const block = el('g', {}, [
      el('rect', { x: left, y: y - LEGEND_FONT_SIZE, width, height: 2 * LEGEND_FONT_SIZE, fill: hue }),
      el(
        'text',
        { x: left + LEGEND_PAD / 2, y: y + LEGEND_FONT_SIZE * LABEL_BASELINE, 'font-size': LEGEND_FONT_SIZE, 'font-weight': 'bold', fill: CATEGORY_LETTERS },
        [letters],
      ),
    ]);
    left += width + CHROME_STROKE_WIDTH;
    return block;
  });
  return { marks: blocks, width: left - x };
}

/** Each mark's sample, centred in its slot at `(x, y)` (the category's scale runs right from the slot's left edge instead). */
function sampleOf(id: string, x: number, y: number): Sample {
  const at = { x, y, r: LEGEND_SAMPLE_R };
  switch (id) {
    case 'category':
      return categories(x - LEGEND_SLOT / 2, y);
    case 'lit-arc':
      return plain([
        file(x, y),
        hairline(x, y),
        el('circle', {
          cx: x,
          cy: y,
          r: LEGEND_SAMPLE_R + INTEGRITY_PAD,
          fill: 'none',
          stroke: EVIDENCE_LIGHT,
          'stroke-width': INTEGRITY_GAP_WIDTH,
          pathLength: 1,
          'stroke-dasharray': `${num(ARC_SHARE)} 1`,
          transform: `rotate(-90 ${num(x)} ${num(y)})`,
        }),
      ]);
    case 'hairline':
      return plain([file(x, y), hairline(x, y)]);
    case 'notch':
      return plain([file(x, y), hairline(x, y), el('path', { d: pathOf(notchOf(at, TOP)), fill: EVIDENCE_LIGHT })]);
    case 'stitches':
      return plain([
        file(x, y),
        ...STITCHES.flatMap((status, index) =>
          stitchOf(at, BOTTOM + (index - 1) * STITCH_SPACING, status).map(([[x1, y1], [x2, y2]]) =>
            el('line', { x1, y1, x2, y2, stroke: stitchStroke(status), 'stroke-width': STITCH_WIDTH }),
          ),
        ),
      ]);
    case 'red-bolt':
      return plain([bolt(x, y, IFR_HUE, 1)]);
    case 'grey-bolt':
      return plain([bolt(x, y, STANDING_STORM_FILL, STANDING_STORM_SCALE)]);
    case 'ghost':
      return plain([
        file(x, y),
        el('circle', { cx: x, cy: y, r: LEGEND_SAMPLE_R + GHOST_PAD, fill: 'none', stroke: GHOST_STROKE, 'stroke-dasharray': GHOST_DASH }),
      ]);
    case 'stain':
      return plain([file(x, y, CHANGE_HUE)]);
    case 'unmeasured':
      return plain([file(x, y), hairline(x, y), skin(x, y, EVIDENCE_LIGHT, INTEGRITY_GAP_WIDTH)]);
    case 'reach':
      return plain(reach(x, y));
    case 'crossing':
      return plain(crossing(x, y));
    case 'hatching':
      return plain(hatching(x, y));
    case 'stipple':
      return plain(stipple(x, y));
    default:
      return plain([]);
  }
}

/** What the key of the seven shapes says beside them (D146). */
export const SHAPE_KEY_WORDS = 'shape: rules it breaks, 0 to 6';

/** How tall the inset is: its title, a row per mark, the shape key's row, and its padding. */
export function legendHeight(): number {
  return 2 * LEGEND_PAD + LEGEND_FONT_SIZE + LEGEND_ROW * (LEGEND.length + 1);
}

/**
 * The key of the seven shapes (D146), a row of its own under the numbered
 * marks: one file at each rule count, 0 to 6 from left to right, drawn by the
 * scene's `outlineOf` at rest as every organelle is, then the words. It keys a
 * scale, as the category row does, so it takes no number and no balloon.
 */
function drawShapeKey(x: number, centre: number): Markup {
  const first = x + LEGEND_PAD + LEGEND_KEY_PITCH / 2;
  const forms = Array.from({ length: MAX_RULES + 1 }, (_, rules) => {
    const at = { x: first + rules * LEGEND_KEY_PITCH, y: centre, r: LEGEND_SAMPLE_R };
    const outline = outlineOf(`legend-key-${String(rules)}`, at, rules);
    const style = { fill: ORGANELLE_FILL, stroke: ORGANELLE_STROKE, 'stroke-width': ORGANELLE_STROKE_WIDTH };
    return el('g', { 'data-rules': rules }, [
      rules === 0 ? el('circle', { cx: at.x, cy: at.y, r: at.r, ...style }) : el('path', { d: pathOf(outline.ring), ...style }),
      ...outline.bulbs.map((bulb) => el('circle', { cx: bulb.x, cy: bulb.y, r: bulb.r, ...style })),
    ]);
  });
  const words = first + MAX_RULES * LEGEND_KEY_PITCH + LEGEND_KEY_PITCH / 2 + LEGEND_PAD;
  return el('g', { 'data-key': 'shapes' }, [
    ...forms,
    el('text', { x: words, y: centre + LEGEND_FONT_SIZE * LABEL_BASELINE, 'font-size': LEGEND_FONT_SIZE, fill: CHROME_INK }, [SHAPE_KEY_WORDS]),
  ]);
}

/** The left of each row's three parts from the inset's left: its balloon's centre, its sample slot's centre, and where its words start. */
function columnsOf(x: number): { readonly balloon: number; readonly slot: number; readonly words: number } {
  const balloon = x + LEGEND_PAD + CALLOUT_R;
  const slot = balloon + CALLOUT_R + LEGEND_PAD + LEGEND_SLOT / 2;
  return { balloon, slot, words: slot + LEGEND_SLOT / 2 + LEGEND_PAD };
}

/**
 * The inset, its top-left at `(x, y)` and `width` wide: a hairline frame,
 * a small-caps title, then one row per mark in `LEGEND` order, each its
 * numbered balloon, its sample and its words, and last the key of the seven
 * shapes.
 */
export function drawLegend(x: number, y: number, width: number): Markup {
  const columns = columnsOf(x);
  const top = y + LEGEND_PAD + LEGEND_FONT_SIZE;
  const rows = LEGEND.map((mark, index) => {
    const centre = top + LEGEND_ROW * (index + 0.5);
    const sample = sampleOf(mark.id, columns.slot, centre);
    const words = Math.max(columns.words, columns.slot - LEGEND_SLOT / 2 + sample.width + LEGEND_PAD);
    return el('g', { 'data-mark': mark.id }, [
      drawBalloon(index + 1, columns.balloon, centre),
      ...sample.marks,
      el('text', { x: words, y: centre + LEGEND_FONT_SIZE * LABEL_BASELINE, 'font-size': LEGEND_FONT_SIZE, fill: CHROME_INK }, [mark.words]),
    ]);
  });
  return el('g', { id: 'legend' }, [
    el('rect', { x, y, width, height: legendHeight(), fill: 'none', stroke: CHROME_MUTED, 'stroke-width': CHROME_STROKE_WIDTH }),
    el('text', { x: x + LEGEND_PAD, y: y + LEGEND_PAD + LEGEND_FONT_SIZE, 'font-size': LEGEND_FONT_SIZE, 'font-variant': 'small-caps', fill: CHROME_MUTED }, [
      'legend',
    ]),
    ...rows,
    drawShapeKey(x, top + LEGEND_ROW * (LEGEND.length + 0.5)),
  ]);
}
