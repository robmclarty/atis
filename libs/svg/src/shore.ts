/**
 * shore: the shore as the still sheet draws it, a band of flat blocks along
 * the foot of the sheet under the world (D153, D158), in the chrome's own
 * material (D12): hard edges, one monospace face, nothing that glows.
 *
 * The scene's `shoreRail` orders the groups and says what each block holds;
 * this lays them out and draws them. Blocks run left to right and wrap in
 * rows, so a long shore costs a row or two rather than a column. A group the
 * change touched opens on a grid of every file it holds (D160): one small
 * flat square per file, wrapped to the block's width, the changed ones first
 * and lit in the change hue as the world stains them (filled for an edit, an
 * outline for a deletion, dashed for a rename), a ghost's dashed grey, the
 * rest the base tissue's grey. Beneath the grid the changed files and the
 * ghosts are named, each with its mark as a disc and its path, `+` before an
 * added one (D120); the rest of the blocks show their name and count. `other`
 * is framed heavier, in the ink, since it is never quiet (D48). A red slot
 * over a group hangs its bolt on the block's first line, and a notice on a
 * shore file hangs its numbered boxes at that line's end.
 */

import {
  CHANGE_HUE,
  CHROME_INK,
  CHROME_MUTED,
  CHROME_PAD,
  CHROME_STROKE_WIDTH,
  GHOST_DASH,
  GHOST_STROKE,
  IFR_HUE,
  LABEL_BASELINE,
  MONO_ADVANCE,
  NOTICE_BOX,
  NOTICE_BOX_GAP,
  ORGANELLE_FILL,
  RENAME_DASH,
  SECONDARY_BOX_WIDTH,
  SHORE_BLOCK_GAP,
  SHORE_BLOCK_PAD,
  SHORE_BLOCK_WIDTH,
  SHORE_FILES_SHOWN,
  SHORE_FONT_SIZE,
  SHORE_GRID_CELL,
  SHORE_GRID_GAP,
  SHORE_LINE,
  SHORE_MARK_R,
  STANDING_STORM_FILL,
  STANDING_STORM_SCALE,
  STORM_LABEL_GAP,
} from 'scene';
import type { ShoreBlock, ShoreFile, ShoreStorm } from 'scene';

import { el, num } from './el.js';
import type { Markup } from './el.js';
import { STORM_GLYPH } from './weather.js';

/** A rectangle on the sheet. */
type Rect = { readonly x: number; readonly y: number; readonly width: number; readonly height: number };

/** A touched block's grid as laid: how many squares a row holds, how many rows, and the room it takes above the names, its gap beneath included. */
type Grid = { readonly perRow: number; readonly rows: number; readonly height: number };

/** A block laid on the sheet, with the notices whose boxes it carries. */
type Placed = { readonly block: ShoreBlock; readonly ranks: readonly number[]; readonly rect: Rect; readonly grid: Grid | undefined };

/** The band as laid: its markup, how tall it is, and where each group's block and its run of notice boxes sit. */
export type Band = {
  readonly markup: Markup | undefined;
  readonly height: number;
  readonly blocks: ReadonlyMap<string, { readonly rect: Rect; readonly run: { readonly x: number; readonly y: number } }>;
};

const ADDED = '+';
const ELLIPSIS = '…';
/** A bolt is about twelve units tall about its origin; on a block's line it is drawn at the line's size. */
const BOLT_SCALE = SHORE_FONT_SIZE / 12;
/** From one square's left edge to the next. */
const PITCH = SHORE_GRID_CELL + SHORE_GRID_GAP;

function textWidth(text: string): number {
  return text.length * SHORE_FONT_SIZE * MONO_ADVANCE;
}

/** How wide a run of `count` numbered boxes is. */
function runWidth(count: number): number {
  return count === 0 ? 0 : count * NOTICE_BOX + (count - 1) * NOTICE_BOX_GAP;
}

/** The files a block names beneath its grid: the changed ones and the ghosts, in the rail's order. */
function namedOf(block: ShoreBlock): readonly ShoreFile[] {
  return block.files.filter((file) => file.change !== undefined || file.ghost === true);
}

/** The words a named file is written with: `+` before an added path, the old path before a renamed one (D40, D120). */
function wordsOf(file: ShoreFile): string {
  if (file.change?.kind === 'added') return `${ADDED}${file.path}`;
  if (file.change?.kind === 'renamed' && file.change.from !== undefined) return `${file.change.from} → ${file.path}`;
  return file.path;
}

/** A path cut from its left to fit `budget` characters, so the file's own name, the end that says most, survives. */
function fitted(words: string, budget: number): string {
  return words.length <= budget ? words : `${ELLIPSIS}${words.slice(words.length - Math.max(budget - 1, 1))}`;
}

/** The storm marks a block's first line carries: a bolt and its slot for the change's red, a small grey bolt for standing state (D68). */
function stormWidth(storms: readonly ShoreStorm[]): number {
  return storms.reduce(
    (total, storm) => total + SHORE_BLOCK_GAP + SHORE_FONT_SIZE + (storm.change ? STORM_LABEL_GAP / 2 + textWidth(storm.slot) : 0),
    0,
  );
}

/** The header's words: the group's name and how many files it holds. */
function headerOf(block: ShoreBlock): string {
  return `${block.group} ${String(block.count)}`;
}

/** How many lines a block's named files take: those it names, and one saying how many more. */
function fileLines(named: readonly ShoreFile[]): number {
  const shown = Math.min(named.length, SHORE_FILES_SHOWN);
  return shown + (named.length > shown ? 1 : 0);
}

/** How wide `count` squares are in one row. */
function gridWidth(count: number): number {
  return count === 0 ? 0 : count * PITCH - SHORE_GRID_GAP;
}

/** A touched block's grid, wrapped to `inner`, the width inside the block's padding; an untouched block has none. */
function gridOf(block: ShoreBlock, inner: number): Grid | undefined {
  if (!block.touched || block.files.length === 0) return undefined;
  const perRow = Math.max(1, Math.floor((inner + SHORE_GRID_GAP) / PITCH));
  const rows = Math.ceil(block.files.length / perRow);
  return { perRow, rows, height: rows * PITCH - SHORE_GRID_GAP + SHORE_BLOCK_GAP };
}

/** A block's size and its grid: its header with its storms and notice boxes, its grid, and its named files, inside its padding, at most an open block's width. */
function sizeOf(block: ShoreBlock, ranks: readonly number[], room: number): { readonly width: number; readonly height: number; readonly grid: Grid | undefined } {
  const named = namedOf(block);
  const header = textWidth(headerOf(block)) + stormWidth(block.storms) + (ranks.length === 0 ? 0 : SHORE_BLOCK_GAP + runWidth(ranks.length));
  const lines = named.map((file) => 2 * SHORE_MARK_R + SHORE_BLOCK_GAP / 2 + textWidth(wordsOf(file)));
  const widest = Math.max(header, block.touched ? gridWidth(block.files.length) : 0, ...lines);
  const cap = Math.min(SHORE_BLOCK_WIDTH, room);
  const width = Math.min(widest + 2 * SHORE_BLOCK_PAD, named.length === 0 ? room : cap);
  const grid = gridOf(block, width - 2 * SHORE_BLOCK_PAD);
  return { width, height: 2 * SHORE_BLOCK_PAD + SHORE_LINE * (1 + fileLines(named)) + (grid?.height ?? 0), grid };
}

/** The blocks flowed left to right from `(x, y)` within `width`, wrapping to a new row when the next would not fit; each row as tall as its tallest. */
function flow(blocks: readonly ShoreBlock[], ranksOf: ReadonlyMap<string, readonly number[]>, x: number, y: number, width: number): readonly Placed[] {
  const left = x + CHROME_PAD;
  const right = x + width - CHROME_PAD;
  const placed: Placed[] = [];
  let cursor = left;
  let top = y + CHROME_PAD;
  let rowHeight = 0;
  for (const block of blocks) {
    const ranks = ranksOf.get(block.group) ?? [];
    const { width: blockWidth, height, grid } = sizeOf(block, ranks, right - left);
    if (cursor > left && cursor + blockWidth > right) {
      cursor = left;
      top += rowHeight + SHORE_BLOCK_GAP;
      rowHeight = 0;
    }
    placed.push({ block, ranks, rect: { x: cursor, y: top, width: blockWidth, height }, grid });
    cursor += blockWidth + SHORE_BLOCK_GAP;
    rowHeight = Math.max(rowHeight, height);
  }
  return placed;
}

/** The top of a block's `line`th line, 0 its header; the grid, when there is one, sits between the header and the first named file. */
function lineTop(rect: Rect, line: number, grid: Grid | undefined): number {
  return rect.y + SHORE_BLOCK_PAD + SHORE_LINE * line + (line > 0 ? (grid?.height ?? 0) : 0);
}

/** The baseline of a block's `line`th line. */
function baselineOf(rect: Rect, line: number, grid: Grid | undefined): number {
  return lineTop(rect, line, grid) + SHORE_LINE / 2 + SHORE_FONT_SIZE * LABEL_BASELINE;
}

/** How a file is marked, as the world stains it: filled for an edit, an outline for a deletion, dashed for a rename, a dashed grey ring for a ghost, the base tissue's grey for any other file. */
function paintOf(file: ShoreFile): Readonly<Record<string, string>> {
  if (file.ghost === true) return { fill: 'none', stroke: GHOST_STROKE, 'stroke-dasharray': GHOST_DASH };
  if (file.change === undefined) return { fill: ORGANELLE_FILL, stroke: 'none' };
  if (file.change.kind === 'deleted') return { fill: 'none', stroke: CHANGE_HUE };
  if (file.change.kind === 'renamed') return { fill: 'none', stroke: CHANGE_HUE, 'stroke-dasharray': RENAME_DASH };
  return { fill: CHANGE_HUE, stroke: 'none' };
}

/** A named file's mark, a disc before its path. */
function markOf(file: ShoreFile, cx: number, cy: number): Markup {
  return el('circle', { cx, cy, r: SHORE_MARK_R, 'stroke-width': CHROME_STROKE_WIDTH, ...paintOf(file) });
}

/** The grid's squares, one per file in the rail's order, filling each row left to right from the block's padding. */
function drawGrid(block: ShoreBlock, rect: Rect, grid: Grid): readonly Markup[] {
  const left = rect.x + SHORE_BLOCK_PAD;
  const top = lineTop(rect, 1, undefined);
  return block.files.map((file, index) =>
    el('rect', {
      x: left + (index % grid.perRow) * PITCH,
      y: top + Math.floor(index / grid.perRow) * PITCH,
      width: SHORE_GRID_CELL,
      height: SHORE_GRID_CELL,
      'data-file': file.path,
      'data-kind': file.change?.kind ?? (file.ghost === true ? 'ghost' : 'file'),
      'stroke-width': CHROME_STROKE_WIDTH,
      ...paintOf(file),
    }),
  );
}

/** The storms on a block's first line, from `x`. */
function drawStorms(storms: readonly ShoreStorm[], x: number, centre: number): readonly Markup[] {
  let cursor = x;
  return storms.flatMap((storm) => {
    cursor += SHORE_BLOCK_GAP + SHORE_FONT_SIZE / 2;
    const scale = storm.change ? BOLT_SCALE : BOLT_SCALE * STANDING_STORM_SCALE;
    const bolt = el('path', {
      'data-slot': storm.slot,
      'data-change': storm.change ? 'true' : 'false',
      d: STORM_GLYPH,
      fill: storm.change ? IFR_HUE : STANDING_STORM_FILL,
      transform: `translate(${num(cursor)} ${num(centre)}) scale(${num(scale)})`,
    });
    const at = cursor + SHORE_FONT_SIZE / 2 + STORM_LABEL_GAP / 2;
    cursor += SHORE_FONT_SIZE / 2;
    if (!storm.change) return [bolt];
    cursor += STORM_LABEL_GAP / 2 + textWidth(storm.slot);
    const label = el('text', { x: at, y: centre + SHORE_FONT_SIZE * LABEL_BASELINE, 'font-size': SHORE_FONT_SIZE, 'font-variant': 'small-caps', fill: IFR_HUE }, [storm.slot]);
    return [bolt, label];
  });
}

/** One block: its frame, its header with its storms, its grid when the change touched it, and its named files. */
function drawBlock({ block, rect, grid }: Placed): Markup {
  const text = { 'font-size': SHORE_FONT_SIZE };
  const header = headerOf(block);
  const centre = rect.y + SHORE_BLOCK_PAD + SHORE_LINE / 2;
  const budget = Math.floor((rect.width - 2 * SHORE_BLOCK_PAD - 2 * SHORE_MARK_R - SHORE_BLOCK_GAP / 2) / (SHORE_FONT_SIZE * MONO_ADVANCE));
  const named = namedOf(block);
  const shown = named.slice(0, SHORE_FILES_SHOWN);
  const rows = shown.flatMap((file, index) => {
    const line = index + 1;
    const lineCentre = lineTop(rect, line, grid) + SHORE_LINE / 2;
    const markX = rect.x + SHORE_BLOCK_PAD + SHORE_MARK_R;
    return [
      el('g', { 'data-id': file.path, 'data-kind': file.change?.kind ?? 'ghost' }, [
        markOf(file, markX, lineCentre),
        el('text', { x: markX + SHORE_MARK_R + SHORE_BLOCK_GAP / 2, y: baselineOf(rect, line, grid), ...text, fill: CHROME_INK }, [fitted(wordsOf(file), budget)]),
      ]),
    ];
  });
  const more = named.length - shown.length;
  return el('g', { 'data-group': block.group, 'data-touched': block.touched ? 'true' : undefined, 'data-loud': block.loud ? 'true' : undefined }, [
    el('rect', {
      ...rect,
      fill: 'none',
      stroke: block.loud ? CHROME_INK : CHROME_MUTED,
      'stroke-width': block.loud ? SECONDARY_BOX_WIDTH : CHROME_STROKE_WIDTH,
    }),
    el('text', { x: rect.x + SHORE_BLOCK_PAD, y: baselineOf(rect, 0, grid), ...text, 'font-variant': 'small-caps', fill: CHROME_INK }, [
      block.group,
      el('tspan', { fill: CHROME_MUTED }, [` ${String(block.count)}`]),
    ]),
    ...drawStorms(block.storms, rect.x + SHORE_BLOCK_PAD + textWidth(header), centre),
    ...(grid === undefined ? [] : [el('g', { 'data-grid': block.group }, drawGrid(block, rect, grid))]),
    ...rows,
    ...(more > 0
      ? [el('text', { x: rect.x + SHORE_BLOCK_PAD, y: baselineOf(rect, shown.length + 1, grid), ...text, fill: CHROME_MUTED }, [`and ${String(more)} more`])]
      : []),
  ]);
}

/**
 * The band under the world, from `(x, y)` and `width` wide: the blocks in the
 * rail's order, each carrying the numbered boxes of the notices on its group
 * (`ranksOf`, by group). A shore with no group draws no band.
 */
export function layOutShore(blocks: readonly ShoreBlock[], ranksOf: ReadonlyMap<string, readonly number[]>, x: number, y: number, width: number): Band {
  if (blocks.length === 0) return { markup: undefined, height: 0, blocks: new Map() };
  const placed = flow(blocks, ranksOf, x, y, width);
  const bottom = Math.max(...placed.map(({ rect }) => rect.y + rect.height));
  return {
    markup: el('g', { id: 'shore' }, placed.map(drawBlock)),
    height: bottom + CHROME_PAD - y,
    blocks: new Map(
      placed.map(({ block, ranks, rect }) => [
        block.group,
        { rect, run: { x: rect.x + rect.width - SHORE_BLOCK_PAD - runWidth(ranks.length), y: rect.y + SHORE_BLOCK_PAD + (SHORE_LINE - NOTICE_BOX) / 2 } },
      ]),
    ),
  };
}
