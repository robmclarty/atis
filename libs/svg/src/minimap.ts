/**
 * minimap: the scene's minimap drawn as still SVG, the drawing the comment's
 * image and the README's fingerprint are made of (D175). It is the inset at
 * the chrome's bottom left (D154) as if it could be zoomed in: the body flat
 * in one grey, each cell's skin drawn round in a hairline, every file a flat
 * disc at its own size, and, when the still carries the weather, each
 * reached cell's ground tinted by its luminance, the changed files in the
 * change hue, a deleted one hollow, and each notice target's run of numbered
 * boxes hung off its lower right. Flat chrome, every ink solid and nothing
 * that glows (D12), so the image reads as the minimap does, a map to orient
 * on, rather than as the world's lit still or the still map's dim tissue.
 */

import type { Callout, CalloutLook, Minimap, MinimapLook, Point } from 'scene';
import { CHANGE_HUE, CHROME_GROUND, CHROME_INK, CHROME_MUTED, CHROME_STROKE_WIDTH, LABEL_BASELINE, LEADER_DASH, LEADER_INK, LEADER_WIDTH, REACH_GLOW } from 'scene';

import { drawBox } from './chrome.js';
import { el, num } from './el.js';
import type { Markup } from './el.js';
import { over } from './legend.js';

/** Rings as one SVG path, each a closed run of points. */
const pathOf = (rings: readonly (readonly Point[])[]): string => rings.map((ring) => `M${ring.map(([x, y]) => `${num(x)} ${num(y)}`).join('L')}Z`).join('');

/** The skins and the files: the terrain the minimap draws under any weather, the reach slotted in between when it is drawn. */
function drawGround(drawn: Minimap, look: MinimapLook, reach: readonly Markup[]): readonly Markup[] {
  return [
    el('path', { id: 'body', d: pathOf(drawn.silhouette), fill: look.body }),
    ...reach,
    el('path', { id: 'skins', d: pathOf(drawn.silhouette), fill: 'none', stroke: look.skin, 'stroke-width': CHROME_STROKE_WIDTH }),
    el(
      'g',
      { id: 'files', fill: look.file },
      drawn.files.flatMap((file) => (2 * file.r < look.fileFloor ? [] : [el('circle', { cx: file.x, cy: file.y, r: file.r })])),
    ),
  ];
}

/** The terrain alone in the minimap's drawing: the body, the skins and the files, and no weather (D107). */
export function drawMinimapTerrain(drawn: Minimap, look: MinimapLook): readonly Markup[] {
  return drawGround(drawn, look, []);
}

/**
 * The minimap's drawing with its weather: the terrain, the reach tinting
 * each reached cell's own ground, and the changed files in the change hue,
 * at least the minimap's dot and a deleted one hollow.
 */
export function drawMinimap(drawn: Minimap, look: MinimapLook): readonly Markup[] {
  const reach = drawn.reach.map((lit) => el('path', { 'data-reach': lit.cell, d: pathOf(lit.rings), 'fill-rule': 'evenodd', fill: over(REACH_GLOW, look.body, lit.luminance * look.reachShare) }));
  return [
    ...drawGround(drawn, look, reach.length === 0 ? [] : [el('g', { id: 'reach' }, reach)]),
    el(
      'g',
      { id: 'changed' },
      drawn.changed.map((file) => {
        const r = Math.max(file.r, look.changedR);
        return file.kind === 'deleted'
          ? el('circle', { 'data-changed': file.path, cx: file.x, cy: file.y, r, fill: 'none', stroke: CHANGE_HUE, 'stroke-width': CHROME_STROKE_WIDTH })
          : el('circle', { 'data-changed': file.path, cx: file.x, cy: file.y, r, fill: CHANGE_HUE });
      }),
    ),
  ];
}

/**
 * The callouts a still names its notices' targets with, in the chrome's
 * technical-drawing manner (§5.6): a dotted leader from the target's edge to
 * a flat block on the chrome's ground holding the target's numbered boxes,
 * the primary's solid in `hue`, the category's (C11), and its short name.
 * A cell's leader ends on a dot at the cell's middle, where nothing else
 * marks the point it names.
 */
export function drawCallouts(callouts: readonly Callout[], look: CalloutLook, hue: string): readonly Markup[] {
  return [
    el(
      'g',
      { id: 'leaders', stroke: LEADER_INK, 'stroke-width': LEADER_WIDTH, 'stroke-dasharray': LEADER_DASH, 'stroke-linecap': 'round', fill: 'none' },
      callouts.map(({ target, leader: [[x1, y1], [x2, y2]] }) => el('line', { 'data-leader': target, x1, y1, x2, y2 })),
    ),
    el(
      'g',
      { id: 'ends', fill: LEADER_INK },
      callouts.flatMap(({ target, r, leader: [[x, y]] }) => (r === 0 ? [el('circle', { 'data-end': target, cx: x, cy: y, r: look.end })] : [])),
    ),
    el(
      'g',
      { id: 'callouts' },
      callouts.map(({ target, text, marked, box }) => {
        const top = box.y + (box.height - look.box) / 2;
        const textX = box.x + look.pad + marked.length * look.box + (marked.length - 1) * look.boxGap + look.textGap;
        return el('g', { 'data-callout': target }, [
          el('rect', { x: box.x, y: box.y, width: box.width, height: box.height, fill: CHROME_GROUND, stroke: CHROME_MUTED, 'stroke-width': CHROME_STROKE_WIDTH }),
          ...marked.map(({ rank, tier }, index) => drawBox(rank, tier, box.x + look.pad + index * (look.box + look.boxGap), top, hue)),
          el('text', { x: textX, y: box.y + box.height / 2 + look.fontSize * LABEL_BASELINE, 'font-size': look.fontSize, fill: CHROME_INK }, [text]),
        ]);
      }),
    ),
  ];
}
