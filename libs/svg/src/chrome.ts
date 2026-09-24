/**
 * chrome: the HUD, the notice list, the leaders and the tier marks, as
 * still SVG (§7, §5.4, D12).
 *
 * The world is organic and the chrome is brutalist (D12): flat blocks, hard
 * edges, one monospace face, high contrast, and nothing that glows, blurs
 * or grades. It frames the world rather than covering it: a strip of grade
 * blocks across the top and a column of notices down the right, on a flat
 * ground with a hard rule wherever it meets the field, so no block ever
 * lands on tissue. Its annotations do reach onto the map, in the
 * technical-drawing manner of §5.6: a dotted leader from each notice's row
 * to a numbered mark beside its target; round the primary a thin ring in
 * the category hue with its kind written under the mark; round a secondary
 * a thick ring in ink; for a tertiary the mark alone. A notice that names a
 * red global slot rather than a file points at that slot's storm in the
 * field's corner, since the storm is where the map says it.
 *
 * Every number in the HUD is read from the map (D33), and a block whose
 * input the map does not carry, or carries as stale, is muted with a dash
 * where the number would be, never a number (C2, D41). The category letters
 * are always written on the category hue (C11). The six slots are C7's: the
 * list draws at most six rows, in the map's rank order, and pads nothing.
 */

import { OTHER_GROUP } from 'core';
import type { Contour, FlightCategory, Layout, MapJson, Notice, NoticeTier, Position } from 'core';

import { el, num } from './el.js';
import type { Attrs, Markup } from './el.js';
import { pathOf } from './terrain.js';
import { globalStormAnchors } from './weather.js';
import {
  CATEGORY_FONT_SIZE,
  CATEGORY_LETTERS,
  CHROME_GROUND,
  CHROME_INK,
  CHROME_MUTED,
  CHROME_PAD,
  CHROME_RULE,
  CHROME_STROKE_WIDTH,
  EMPHASIS_PAD,
  HUD_BLOCK_GAP,
  HUD_BLOCK_HEIGHT,
  HUD_BLOCK_PAD,
  HUD_FONT_SIZE,
  HUD_PAD,
  IFR_HUE,
  LABEL_BASELINE,
  LEADER_DASH,
  LEADER_INK,
  LEADER_WIDTH,
  LIFR_HUE,
  MONO_ADVANCE,
  MUTED_DASH,
  MVFR_HUE,
  NOTICE_BOX,
  NOTICE_BOX_GAP,
  NOTICE_COLUMN,
  NOTICE_LEADING,
  NOTICE_NUMERAL_SIZE,
  NOTICE_ROW_GAP,
  NOTICE_SMALL_SIZE,
  NOTICE_TEXT_GAP,
  NOTICE_TEXT_SIZE,
  PRIMARY_RING_WIDTH,
  SECONDARY_BOX_WIDTH,
  SECONDARY_RING_WIDTH,
  VFR_HUE,
} from './tokens.js';

/** The chrome as drawn, and the canvas it needs: the world is set `worldY` down, so the HUD strip never covers it. */
export type Chrome = {
  readonly markup: Markup;
  readonly width: number;
  readonly height: number;
  readonly worldY: number;
};

/** C7's budget: the list draws at most this many rows, whatever it is handed. */
export const NOTICE_BUDGET = 6;

/** The category hues (§5.3, D6). NOINST has none: its block is the muted grey, with the letters still on it. */
export const CATEGORY_HUES: Readonly<Partial<Record<FlightCategory, string>>> = {
  VFR: VFR_HUE,
  MVFR: MVFR_HUE,
  IFR: IFR_HUE,
  LIFR: LIFR_HUE,
};

/** The HUD blocks of §7, by their `data-block`, in the order the row draws them. */
export const HUD_ORDER: readonly string[] = [
  'category',
  'checks',
  'patch-cov',
  'mutants',
  'reach',
  'size',
  'health',
  'notices',
  'other',
];

/** The unit the chrome writes tallies in: `−` is the minus sign, `·` the tier separator. */
const MINUS = '−';
const DOT = '·';

/**
 * One grade block: a label, a bold value, and a tail after it. A muted
 * block's value is the dash, and `muted` says why: `absent` when the map
 * never carried the input, `stale` when its slot's file predated the run
 * (D41), `empty` when there was nothing to measure, `head-only` for the
 * delta this build cannot take (D23).
 */
type Block = {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly tail: string;
  readonly muted?: string;
};

type PlacedBlock = { readonly block: Block; readonly x: number; readonly y: number; readonly width: number };

/** Where a notice's target is on the field: a placed file, or a skinned cell or group. */
type Anchor =
  | { readonly kind: 'point'; readonly at: Position }
  | { readonly kind: 'contour'; readonly contour: Contour; readonly foot: readonly [number, number] };

/** A notice with its rank and, when the field has it, its target's anchor and the origin its marks hang from. */
type Ranked = {
  readonly rank: number;
  readonly notice: Notice;
  readonly anchor?: Anchor;
};

/** One line of a notice's row. */
type Line = {
  readonly text: string;
  readonly size: number;
  readonly fill: string;
  readonly bold?: boolean;
  readonly smallCaps?: boolean;
};

type Row = {
  readonly ranked: Ranked;
  readonly y: number;
  readonly lines: readonly Line[];
  readonly height: number;
};

/** A run of marks at one target: its boxes, left to right in rank order, from the top-left corner `(x, y)` of the first. */
type Marks = {
  readonly target: string;
  readonly anchor: Anchor;
  readonly ranks: readonly number[];
  readonly x: number;
  readonly y: number;
};

const SQRT_HALF = Math.SQRT1_2;

function block(id: string, label: string, value: string, tail = ''): Block {
  return { id, label, value, tail };
}

function muted(id: string, label: string, reason: string): Block {
  return { id, label, value: MUTED_DASH, tail: '', muted: reason };
}

/** A text element made of runs, on one line: the empty text child keeps `el` from breaking the tspans onto lines of their own, since whitespace inside `<text>` is content. */
function runs(attrs: Attrs, spans: readonly Markup[]): Markup {
  return el('text', attrs, ['', ...spans]);
}

/** How wide a string is in the chrome's face, from the monospace estimate (C5). */
function textWidth(text: string, size: number): number {
  return text.length * size * MONO_ADVANCE;
}

/** Whether a slot's raw file was stale in this run: `meta.instruments.stale` names each as `slot: file, …` (D41). */
function isStale(map: MapJson, slot: string): boolean {
  return (map.meta.instruments.stale ?? []).some((entry) => entry.startsWith(`${slot}:`));
}

/** `Checks n/m`: the slots that passed over the slots that ran; a skipped slot is in neither (D41). Muted when no `.check/` was trusted. */
function checksBlock(map: MapJson): Block {
  if (map.meta.instruments.mode !== 'check') return muted('checks', 'Checks', 'absent');
  const ran = map.weather.checks.slots.filter((slot) => !slot.skipped);
  const passed = ran.filter((slot) => slot.ok);
  return block('checks', 'Checks', `${String(passed.length)}/${String(ran.length)}`);
}

/** `Patch cov x%`: the covered share of every changed executable line, over the whole change. */
function coverageBlock(map: MapJson): Block {
  if (isStale(map, 'test')) return muted('patch-cov', 'Patch cov', 'stale');
  const coverage = map.weather.evidence.patch_coverage;
  if (coverage === undefined) return muted('patch-cov', 'Patch cov', 'absent');
  const executable = coverage.reduce((total, file) => total + file.changed_executable, 0);
  if (executable === 0) return muted('patch-cov', 'Patch cov', 'empty');
  const covered = coverage.reduce((total, file) => total + file.covered, 0);
  return block('patch-cov', 'Patch cov', `${String(Math.round((covered / executable) * 100))}%`);
}

/** `Mutants k survived`: the mutants still alive on the changed lines, which is what core counted (§5.2). */
function mutantBlock(map: MapJson): Block {
  if (isStale(map, 'mutation')) return muted('mutants', 'Mutants', 'stale');
  const mutants = map.weather.evidence.mutants;
  if (mutants === undefined) return muted('mutants', 'Mutants', 'absent');
  return block('mutants', 'Mutants', String(mutants.length), ' survived');
}

/** The tally of each tier among the notices the list draws (C7). */
function tierCounts(notices: readonly Notice[]): Readonly<Record<NoticeTier, number>> {
  const counts: Record<NoticeTier, number> = { primary: 0, secondary: 0, tertiary: 0 };
  for (const notice of notices) counts[notice.tier] += 1;
  return counts;
}

/** The HUD row of §7 in `HUD_ORDER`; `Other` only when the shore's `other` group is non-empty (D48). */
function blocksOf(map: MapJson, notices: readonly Notice[]): readonly Block[] {
  const { changed, reach, checks } = map.weather;
  const cells = new Set(reach.map((entry) => entry.cell)).size;
  const added = changed.reduce((total, file) => total + file.added, 0);
  const deleted = changed.reduce((total, file) => total + file.deleted, 0);
  const tiers = tierCounts(notices);
  const other = map.terrain.groups.find((group) => group.id === OTHER_GROUP);
  const blocks: readonly Block[] = [
    block('category', '', checks.category),
    checksBlock(map),
    coverageBlock(map),
    mutantBlock(map),
    block('reach', 'Reach', String(cells), ' cells'),
    block('size', 'Size', `+${String(added)} ${MINUS}${String(deleted)}`, `, ${String(changed.length)} files`),
    muted('health', 'Health Δ', 'head-only'),
    block('notices', 'Notices', [tiers.primary, tiers.secondary, tiers.tertiary].map(String).join(DOT)),
    ...(other === undefined || other.files.length === 0 ? [] : [block('other', 'Other', String(other.files.length))]),
  ];
  const byId = new Map(blocks.map((entry) => [entry.id, entry] as const));
  return HUD_ORDER.flatMap((id) => {
    const entry = byId.get(id);
    return entry === undefined ? [] : [entry];
  });
}

function isCategory(placed: Block): boolean {
  return placed.id === 'category';
}

function blockFontSize(placed: Block): number {
  return isCategory(placed) ? CATEGORY_FONT_SIZE : HUD_FONT_SIZE;
}

function blockText(placed: Block): string {
  return placed.label === '' ? `${placed.value}${placed.tail}` : `${placed.label} ${placed.value}${placed.tail}`;
}

function blockWidth(placed: Block): number {
  return textWidth(blockText(placed), blockFontSize(placed)) + 2 * HUD_BLOCK_PAD;
}

/**
 * The blocks in one row from the left, wrapping to a second row only when
 * the canvas is too narrow to hold them all, so the strip is as tall as it
 * needs to be and no taller.
 */
function layOutHud(blocks: readonly Block[], width: number): { readonly placed: readonly PlacedBlock[]; readonly height: number } {
  const placed: PlacedBlock[] = [];
  let x = CHROME_PAD;
  let row = 0;
  for (const current of blocks) {
    const blockW = blockWidth(current);
    if (x > CHROME_PAD && x + blockW > width - CHROME_PAD) {
      row += 1;
      x = CHROME_PAD;
    }
    placed.push({ block: current, x, y: HUD_PAD + row * (HUD_BLOCK_HEIGHT + HUD_BLOCK_GAP), width: blockW });
    x += blockW + HUD_BLOCK_GAP;
  }
  return { placed, height: 2 * HUD_PAD + (row + 1) * HUD_BLOCK_HEIGHT + row * HUD_BLOCK_GAP };
}

/**
 * One block: the category solid in its hue with the letters on it, every
 * other block outlined in ink with its label and a bold value, a muted one
 * outlined and written in the muted grey with the dash where its number
 * would be.
 */
function drawBlock({ block: current, x, y, width }: PlacedBlock, category: FlightCategory): Markup {
  const size = blockFontSize(current);
  const solid = isCategory(current) ? (CATEGORY_HUES[category] ?? CHROME_MUTED) : undefined;
  const ink = current.muted === undefined ? CHROME_INK : CHROME_MUTED;
  const spans = [
    ...(current.label === '' ? [] : [el('tspan', {}, [`${current.label} `])]),
    el('tspan', { 'font-weight': 'bold' }, [current.value]),
    ...(current.tail === '' ? [] : [el('tspan', {}, [current.tail])]),
  ];
  return el(
    'g',
    {
      'data-block': current.id,
      'data-category': isCategory(current) ? current.value : undefined,
      'data-muted': current.muted === undefined ? undefined : 'true',
      'data-reason': current.muted,
    },
    [
      el('rect', {
        x,
        y,
        width,
        height: HUD_BLOCK_HEIGHT,
        fill: solid ?? 'none',
        stroke: solid === undefined ? ink : undefined,
        'stroke-width': solid === undefined ? CHROME_STROKE_WIDTH : undefined,
      }),
      runs(
        {
          x: x + HUD_BLOCK_PAD,
          y: y + HUD_BLOCK_HEIGHT / 2 + size * LABEL_BASELINE,
          'font-size': size,
          fill: solid === undefined ? ink : CATEGORY_LETTERS,
        },
        spans,
      ),
    ],
  );
}

/** The lowest point of a contour, leftmost on a tie: where a group's marks hang from. */
function footOf(contour: Contour): readonly [number, number] | undefined {
  let foot: readonly [number, number] | undefined;
  for (const point of contour) {
    if (foot === undefined || point[1] > foot[1] || (point[1] === foot[1] && point[0] < foot[0])) foot = point;
  }
  return foot;
}

/**
 * A target's anchor: its position when the layout placed it, else its
 * contour when core skinned it, else the storm of the global slot it names,
 * else nothing to point at. A file wins the name, since only the last of
 * the three is keyed by a slot rather than a path.
 */
function anchorOf(target: string, layout: Layout, storms: ReadonlyMap<string, Position>): Anchor | undefined {
  const at = layout.positions[target];
  if (at !== undefined) return { kind: 'point', at };
  const contour = layout.contours?.[target];
  if (contour === undefined) {
    const storm = storms.get(target);
    return storm === undefined ? undefined : { kind: 'point', at: storm };
  }
  const foot = footOf(contour);
  return foot === undefined ? undefined : { kind: 'contour', contour, foot };
}

/** The six the list has room for, in the map's rank order (C7), each with its anchor when the field has one. */
function noticesInBudget(map: MapJson, layout: Layout): readonly Ranked[] {
  const storms = globalStormAnchors(map.weather, layout);
  return map.notices.slice(0, NOTICE_BUDGET).map((notice, index): Ranked => {
    const anchor = anchorOf(notice.target, layout, storms);
    return { rank: index + 1, notice, ...(anchor === undefined ? {} : { anchor }) };
  });
}

/**
 * Greedy word wrap at a character budget, the monospace estimate standing
 * in for a font (C5). A single word past the budget, a long path say, is
 * cut at the budget rather than left to run off the column.
 */
export function wrap(text: string, budget: number): readonly string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const chunks = word.length <= budget ? [word] : (word.match(new RegExp(`.{1,${String(budget)}}`, 'g')) ?? []);
    for (const chunk of chunks) {
      if (line === '') line = chunk;
      else if (line.length + 1 + chunk.length <= budget) line = `${line} ${chunk}`;
      else {
        lines.push(line);
        line = chunk;
      }
    }
  }
  if (line !== '') lines.push(line);
  return lines;
}

/** How many characters of a size fit on one line of the column. */
function budgetFor(size: number): number {
  return Math.floor((NOTICE_COLUMN - 2 * CHROME_PAD - NOTICE_BOX - NOTICE_TEXT_GAP) / (size * MONO_ADVANCE));
}

/** The thresholds that produced a notice, as `key value` pairs in the map's order (D9). */
function thresholdsOf(notice: Notice): string {
  return Object.entries(notice.thresholds)
    .map(([key, value]) => `${key} ${String(value)}`)
    .join(` ${DOT} `);
}

/** A row's lines: the target in bold, the kind in small caps, the why, and the thresholds in the muted grey. */
function linesOf(notice: Notice): readonly Line[] {
  const thresholds = thresholdsOf(notice);
  return [
    ...wrap(notice.target, budgetFor(NOTICE_TEXT_SIZE)).map((text): Line => ({ text, size: NOTICE_TEXT_SIZE, fill: CHROME_INK, bold: true })),
    { text: notice.kind, size: NOTICE_SMALL_SIZE, fill: CHROME_INK, smallCaps: true },
    ...wrap(notice.why, budgetFor(NOTICE_TEXT_SIZE)).map((text): Line => ({ text, size: NOTICE_TEXT_SIZE, fill: CHROME_INK })),
    ...(thresholds === ''
      ? []
      : wrap(thresholds, budgetFor(NOTICE_SMALL_SIZE)).map((text): Line => ({ text, size: NOTICE_SMALL_SIZE, fill: CHROME_MUTED }))),
  ];
}

/** The rows stacked down the column from `top`, each as tall as its lines. */
function layOutRows(ranked: readonly Ranked[], top: number): readonly Row[] {
  let y = top;
  return ranked.map((entry): Row => {
    const lines = linesOf(entry.notice);
    const height = lines.reduce((total, line) => total + line.size * NOTICE_LEADING, 0);
    const row = { ranked: entry, y, lines, height };
    y += height + NOTICE_ROW_GAP;
    return row;
  });
}

/** The numbered box: solid in the hue for the primary, a thick ink frame for a secondary, a thin muted frame for a tertiary. */
function drawBox(rank: number, tier: NoticeTier, x: number, y: number, hue: string): Markup {
  const solid = tier === 'primary';
  return el('g', { 'data-mark': rank, 'data-tier': tier }, [
    el('rect', {
      x,
      y,
      width: NOTICE_BOX,
      height: NOTICE_BOX,
      fill: solid ? hue : CHROME_GROUND,
      stroke: solid ? undefined : tier === 'secondary' ? CHROME_INK : CHROME_MUTED,
      'stroke-width': solid ? undefined : tier === 'secondary' ? SECONDARY_BOX_WIDTH : CHROME_STROKE_WIDTH,
    }),
    el(
      'text',
      {
        x: x + NOTICE_BOX / 2,
        y: y + NOTICE_BOX / 2 + NOTICE_NUMERAL_SIZE * LABEL_BASELINE,
        'font-size': NOTICE_NUMERAL_SIZE,
        'font-weight': 'bold',
        'text-anchor': 'middle',
        fill: solid ? CATEGORY_LETTERS : CHROME_INK,
      },
      [String(rank)],
    ),
  ]);
}

/** One row: its box at the column's edge and its lines beside it, each line on its own baseline. */
function drawRow(row: Row, x: number, hue: string): Markup {
  const { rank, notice, anchor } = row.ranked;
  let top = row.y;
  const lines = row.lines.map((line) => {
    const baseline = top + line.size;
    top += line.size * NOTICE_LEADING;
    return el(
      'text',
      {
        x: x + NOTICE_BOX + NOTICE_TEXT_GAP,
        y: baseline,
        'font-size': line.size,
        'font-weight': line.bold === true ? 'bold' : undefined,
        'font-variant': line.smallCaps === true ? 'small-caps' : undefined,
        fill: line.fill,
      },
      [line.text],
    );
  });
  return el(
    'g',
    {
      'data-notice': rank,
      'data-tier': notice.tier,
      'data-kind': notice.kind,
      'data-target': notice.target,
      'data-unplaced': anchor === undefined ? 'true' : undefined,
    },
    [drawBox(rank, notice.tier, x, row.y, hue), ...lines],
  );
}

/** The strongest tier among a target's notices: the one emphasis its skin carries. */
function strongest(tiers: readonly NoticeTier[]): NoticeTier {
  if (tiers.includes('primary')) return 'primary';
  return tiers.includes('secondary') ? 'secondary' : 'tertiary';
}

/**
 * Where a target's marks hang: off the lower right of a placed file, just
 * past its emphasis ring, so they stay clear of the glyph at its upper
 * right, the old name at its right and the stitches under it; below the
 * foot of a skinned group. A run that would leave the field hangs to the
 * lower left instead, its order kept, which is every storm's run, since a
 * storm sits in the field's right corner by construction.
 */
function marksFor(target: string, anchor: Anchor, ranks: readonly number[], layout: Layout, worldY: number): Marks {
  const run = ranks.length * NOTICE_BOX + (ranks.length - 1) * NOTICE_BOX_GAP;
  const [right, y] =
    anchor.kind === 'point'
      ? [anchor.at.x + (anchor.at.r + EMPHASIS_PAD + NOTICE_BOX_GAP) * SQRT_HALF, anchor.at.y + (anchor.at.r + EMPHASIS_PAD + NOTICE_BOX_GAP) * SQRT_HALF]
      : [anchor.foot[0] - NOTICE_BOX / 2, anchor.foot[1] + NOTICE_BOX_GAP];
  const fits = right + run <= layout.width - CHROME_PAD;
  // A group's foot is on the shore, which the layout keeps inside the field, so only a point anchor's run ever flips.
  const left = anchor.kind === 'point' ? anchor.at.x - (anchor.at.r + EMPHASIS_PAD + NOTICE_BOX_GAP) * SQRT_HALF - run : right;
  return { target, anchor, ranks, x: fits ? right : left, y: y + worldY };
}

/** Each target's marks, in the order the targets first appear in the list, so the primary's come first. */
function marksOf(ranked: readonly Ranked[], layout: Layout, worldY: number): readonly Marks[] {
  const byTarget = new Map<string, { readonly anchor: Anchor; readonly ranks: number[] }>();
  for (const entry of ranked) {
    if (entry.anchor === undefined) continue;
    const held = byTarget.get(entry.notice.target) ?? { anchor: entry.anchor, ranks: [] };
    held.ranks.push(entry.rank);
    byTarget.set(entry.notice.target, held);
  }
  return [...byTarget].map(([target, { anchor, ranks }]) => marksFor(target, anchor, ranks, layout, worldY));
}

/** The centre of the `rank`th box of a run of marks. */
function boxCentre(marks: Marks, rank: number): readonly [number, number] {
  const index = marks.ranks.indexOf(rank);
  return [marks.x + index * (NOTICE_BOX + NOTICE_BOX_GAP) + NOTICE_BOX / 2, marks.y + NOTICE_BOX / 2];
}

/** The emphasis on a target's skin: a ring past the evidence skin, or the contour re-traced, thin in the hue for the primary and thick in ink for a secondary. */
function drawEmphasis(marks: Marks, tier: NoticeTier, hue: string, worldY: number): Markup | undefined {
  if (tier === 'tertiary') return undefined;
  const stroke = tier === 'primary' ? hue : CHROME_INK;
  const width = tier === 'primary' ? PRIMARY_RING_WIDTH : SECONDARY_RING_WIDTH;
  const shared = { 'data-target': marks.target, 'data-tier': tier, fill: 'none', stroke, 'stroke-width': width };
  if (marks.anchor.kind === 'point') {
    const { at } = marks.anchor;
    return el('circle', { ...shared, cx: at.x, cy: at.y + worldY, r: at.r + EMPHASIS_PAD });
  }
  return el('path', { ...shared, d: pathOf(marks.anchor.contour), transform: `translate(0 ${num(worldY)})` });
}

/** The primary's kind, written in the hue under its run of marks (§5.4: saturated hue and label). */
function drawPrimaryLabel(marks: Marks, kind: string, hue: string): Markup {
  return el(
    'text',
    {
      'data-target': marks.target,
      x: marks.x,
      y: marks.y + NOTICE_BOX + NOTICE_BOX_GAP + NOTICE_SMALL_SIZE,
      'font-size': NOTICE_SMALL_SIZE,
      'font-variant': 'small-caps',
      fill: hue,
    },
    [kind],
  );
}

/**
 * The marks on the map, one run per target: the emphasis for its strongest
 * tier, then its numbered boxes in rank order, then the primary's kind. The
 * boxes are drawn over the leaders, so each leader ends where its box begins.
 */
function drawMarks(ranked: readonly Ranked[], marks: readonly Marks[], hue: string, worldY: number): Markup | undefined {
  const tierOf = new Map(ranked.map((entry) => [entry.rank, entry.notice] as const));
  const perTarget = marks.map((run) => {
    const notices = run.ranks.flatMap((rank) => {
      const notice = tierOf.get(rank);
      return notice === undefined ? [] : [notice];
    });
    const tier = strongest(notices.map((notice) => notice.tier));
    const emphasis = drawEmphasis(run, tier, hue, worldY);
    const primary = notices.find((notice) => notice.tier === 'primary');
    return el('g', { 'data-target': run.target }, [
      ...(emphasis === undefined ? [] : [emphasis]),
      ...run.ranks.map((rank, index) =>
        drawBox(rank, tierOf.get(rank)?.tier ?? 'tertiary', run.x + index * (NOTICE_BOX + NOTICE_BOX_GAP), run.y, hue),
      ),
      ...(primary === undefined ? [] : [drawPrimaryLabel(run, primary.kind, hue)]),
    ]);
  });
  return perTarget.length === 0 ? undefined : el('g', { id: 'marks' }, perTarget);
}

/** One dotted leader per placed notice, from the centre of its row's box to the centre of its mark on the map. */
function drawLeaders(rows: readonly Row[], marks: readonly Marks[], columnX: number): Markup | undefined {
  const byTarget = new Map(marks.map((run) => [run.target, run] as const));
  const lines = rows.flatMap((row) => {
    const run = byTarget.get(row.ranked.notice.target);
    if (run === undefined) return [];
    const [x2, y2] = boxCentre(run, row.ranked.rank);
    return [
      el('line', {
        'data-notice': row.ranked.rank,
        x1: columnX + NOTICE_BOX / 2,
        y1: row.y + NOTICE_BOX / 2,
        x2,
        y2,
      }),
    ];
  });
  if (lines.length === 0) return undefined;
  return el(
    'g',
    { id: 'leaders', stroke: LEADER_INK, 'stroke-width': LEADER_WIDTH, 'stroke-dasharray': LEADER_DASH, 'stroke-linecap': 'round', fill: 'none' },
    lines,
  );
}

/** The sheet the world and the chrome sit on: the chrome's flat ground, the full canvas. */
export function drawGround(chrome: Chrome): Markup {
  return el('rect', { id: 'ground', x: 0, y: 0, width: chrome.width, height: chrome.height, fill: CHROME_GROUND });
}

/**
 * The chrome over the world: the HUD strip, the hard rules, the leaders,
 * the notice column and the marks, in that order, so the rows and the boxes
 * lie over the leaders that join them. The canvas is the world plus the
 * strip above it and the column beside it, and as tall as the taller of the
 * world and the list.
 */
export function drawChrome(map: MapJson, layout: Layout): Chrome {
  const width = layout.width + NOTICE_COLUMN;
  const ranked = noticesInBudget(map, layout);
  const hud = layOutHud(blocksOf(map, ranked.map((entry) => entry.notice)), width);
  const worldY = hud.height;
  const columnX = layout.width + CHROME_PAD;
  const rows = layOutRows(ranked, worldY + CHROME_PAD);
  const last = rows.at(-1);
  const listBottom = last === undefined ? worldY : last.y + last.height + CHROME_PAD;
  const height = Math.max(worldY + layout.height, Math.ceil(listBottom));
  const { category } = map.weather.checks;
  const hue = CATEGORY_HUES[category] ?? CHROME_INK;
  const marks = marksOf(ranked, layout, worldY);
  const leaders = drawLeaders(rows, marks, columnX);
  const drawnMarks = drawMarks(ranked, marks, hue, worldY);
  const markup = el('g', { id: 'chrome' }, [
    el('g', { id: 'hud' }, hud.placed.map((placed) => drawBlock(placed, category))),
    el('g', { id: 'rules', stroke: CHROME_RULE, 'stroke-width': CHROME_STROKE_WIDTH }, [
      el('line', { x1: 0, y1: worldY, x2: width, y2: worldY }),
      el('line', { x1: layout.width, y1: worldY, x2: layout.width, y2: height }),
    ]),
    ...(leaders === undefined ? [] : [leaders]),
    el('g', { id: 'notices' }, rows.map((row) => drawRow(row, columnX, hue))),
    ...(drawnMarks === undefined ? [] : [drawnMarks]),
  ]);
  return { markup, width, height, worldY };
}
