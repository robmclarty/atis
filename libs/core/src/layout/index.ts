/**
 * layout: the field every renderer draws on (D24).
 *
 * Positions belong to core, not to a renderer: two renderers that computed
 * their own would draw two different terrains from one `map.json`, and P2 says
 * they may not. So this is where the map gets its coordinates, and it gets
 * them once.
 *
 * The field is read downward. The shore sits above everything, a strip of the
 * tracked files that are not code at all, one block per group in D48's table
 * order (land above the abyss). Under it the terraces descend, band 0 at the
 * top where the entry points are, the deepest band at the bottom. Across them
 * each package stands in a lane of its own, so no package's skin runs between
 * another's cells (D166), and inside its lane each cell stands apart from its
 * siblings, so no two cells' skins cross (D171, `siblings.ts`). A repo of
 * many large packages would stand its lanes in a strip far wider than any
 * screen, so once one row of them would run wider than about the screen's
 * shape over its terraces, the lanes wrap into rows, each carrying its own
 * ladder of the same terraces lower down (Q73). Terrain is
 * settled first and added files second, with the terrain pinned, so that the
 * weather never moves the ground under it (D32). The membranes are cut last,
 * over the settled field, one per cell and one per shore group (D13).
 *
 * Handed a layout before it, the field relaxes from it rather than settling
 * from nothing (D97): each file that kept its path starts where it was, at the
 * same share of its terrace's height, so a terrain that barely changed is
 * drawn barely moved, across bases as within one. A renamed file's place in
 * that layout, under its old path, is carried into this field beside the
 * file nearest it that stayed, which is the second position its old-to-new
 * leader runs from (D40).
 *
 * Handed its base's own field instead, a change's map holds it (D172): every
 * file the change left where it was, on the same terrace in the same cell,
 * stands exactly where the base put it, the change's own files are placed
 * into the room around them as the second pass places added files, and only
 * the skins near what moved are cut again. A change the base's field cannot
 * hold, one that gives a terrace another meaning or outgrows the shore's
 * room, relaxes from it instead, and so does every change over a base whose
 * lanes wrapped into rows.
 */

import type { ImportEdge } from '../modules.js';
import { TESTS_GROUP } from '../reach.js';
import type { Band, Group, Layout, LayoutBand, LayoutRow, Organelle, Position } from '../schema.js';
import { heightsOn, radiusOf, simulate } from './force.js';
import type { Lane, LayoutFile, Placement, Point, Strip } from './force.js';
import { computeMembranes, skinMembers } from './membranes.js';
import type { MembraneCell } from './membranes.js';
import { LAYOUT_SEED, seedOf, seededRandom } from './random.js';
import { placeAdded, standApart } from './siblings.js';
import type { Block, Held } from './siblings.js';

export * from './force.js';
export * from './membranes.js';
export * from './random.js';

/** The quiet edge the field keeps around everything it draws. */
const MARGIN = 40;
/** A field narrower than this reads as a column rather than a map. */
const MIN_WIDTH = 480;
/** Roughly how much wider than tall the field wants to be before the forces have their say. */
const ASPECT = 1.6;
/** How many times its own area an organelle is given to breathe in. */
const SPREAD = 6;
/** Widths are rounded to this, so a one-line edit cannot jitter the whole field. */
const WIDTH_STEP = 20;
/** No terrace is thinner than this, or than this many of its own widest organelle. */
const MIN_BAND_HEIGHT = 96;
const BAND_ROOM = 3;

/**
 * A package's lane: the room it keeps either side of its terrain for the
 * change's added files, and the gutter between one lane's room and the next.
 * Together they stand two packages' terrain over a hundred units apart, twice
 * as far as a skin's field reaches out from the files it holds.
 */
const LANE_SLACK = 40;
const LANE_GUTTER = 24;
/** How far one lane's terrain stands from the next: its slack, the next one's, and the gutter between. */
const LANE_PITCH = 2 * LANE_SLACK + LANE_GUTTER;
/** Rows of lanes stand as far apart as lanes do, so one row's deepest skins keep from the next row's shallowest as one lane's keep from the next. */
const ROW_GAP = LANE_PITCH;

/** The shore's grid: a fixed pitch, blocks of at most this many columns, a gap between groups. */
const SHORE_PITCH = 18;
const SHORE_MARK_RADIUS = 4;
const SHORE_GAP = 40;
const SHORE_MAX_COLUMNS = 8;
const SHORE_PAD = 24;

/** Two decimals: far finer than anything an eye or an SVG resolves, and it keeps the file readable. */
const PRECISION = 100;

export type LayoutInput = {
  /** The cells the membranes are cut around; a package's holds every cell beneath it (D45). */
  readonly cells: readonly MembraneCell[];
  readonly organelles: readonly Organelle[];
  /** The terrain's import graph: felt by the layout, drawn by nobody (§5.1). */
  readonly edges: readonly ImportEdge[];
  readonly bands: readonly Band[];
  /** The shore, in D48's table order; its test files are evidence and get no place here (D4). */
  readonly groups: readonly Group[];
  /** The files this change added, laid out in the second pass (D32). */
  readonly added: ReadonlySet<string>;
  /** A layout before this one to relax from, keyed by path: a base's own, or its nearest cached ancestor's (D97). */
  readonly prior?: Prior;
  /** The change's renames, head path to base path, whose places in `prior` are carried into this field (D40). */
  readonly renames?: ReadonlyMap<string, string>;
  /** The base's own field, which a change's map holds wherever the change left the ground alone (D172); it outranks `prior`. */
  readonly ground?: Ground;
};

/** What a layout before this one says: where each file was, and the terraces it was on, in whichever row. */
export type Prior = Pick<Layout, 'positions' | 'bands' | 'rows'>;

/**
 * A base's own field, keyed by base path (D172): the layout its terrain was
 * given, and that terrain as it was laid out, its cells, files, terraces and
 * shore, which is what says whether a file of the change still stands where
 * the base put it.
 */
export type Ground = {
  readonly layout: Layout;
  readonly cells: readonly MembraneCell[];
  readonly organelles: readonly LayoutFile[];
  readonly bands: readonly Band[];
  readonly groups: readonly Group[];
};

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function round(value: number): number {
  return Math.round(value * PRECISION) / PRECISION;
}

function roundPlacement(placed: Placement): Placement {
  return { id: placed.id, x: round(placed.x), y: round(placed.y), r: round(placed.r) };
}

/**
 * How much room a band asks for: its organelles' own area, several times over,
 * because a terrace packed to its edges reads as a wall rather than a terrace.
 */
function demandOf(files: readonly LayoutFile[]): number {
  return SPREAD * files.reduce((area, file) => area + Math.PI * radiusOf(file.loc) ** 2, 0);
}

/**
 * How wide to start: the room everything on the field asks for, at roughly the
 * shape of a window. This is a starting spread and not the answer — the forces
 * pull a tightly coupled repository in tighter than this, and the field the
 * map ends up with is measured off the terrain once it has settled, so that a
 * narrow column of a codebase is drawn as one rather than padded out to look
 * like something wider.
 */
function spreadWidth(files: readonly LayoutFile[]): number {
  const wanted = Math.sqrt(demandOf(files) * ASPECT);
  return Math.max(MIN_WIDTH, Math.ceil(wanted / WIDTH_STEP) * WIDTH_STEP);
}

/** How tall a terrace is: tall enough for what stands on it. */
function heightOf(index: number, files: readonly LayoutFile[], width: number): number {
  const here = files.filter((file) => file.band === index);
  const widest = here.reduce((most, file) => Math.max(most, radiusOf(file.loc)), 0);
  return Math.ceil(Math.max(MIN_BAND_HEIGHT, BAND_ROOM * 2 * widest, demandOf(here) / width));
}

/** The terraces, stacked under the shore in band order, each tall enough for what stands on it. */
function stripsFor(
  bands: readonly Band[],
  files: readonly LayoutFile[],
  width: number,
  top: number,
): readonly LayoutBand[] {
  let y = top;
  return [...bands]
    .toSorted((a, b) => a.index - b.index)
    .map((band) => {
      const height = heightOf(band.index, files, width);
      const strip = { index: band.index, y0: y, y1: y + height };
      y += height;
      return strip;
    });
}

type Shore = {
  readonly positions: ReadonlyMap<string, Position>;
  readonly height: number;
  /** How far right the blocks actually reached, so the field is at least that wide. */
  readonly extent: number;
};

/** One group's block on the shore: its top-left corner, its columns, and the row of blocks it stands in. */
type ShoreBlock = { readonly x: number; readonly y: number; readonly cols: number; readonly row: number };

/** One row of blocks: its top, the most rows of marks a block in it has, and where its last block ends. */
type ShoreRow = { readonly y: number; room: number; right: number };

/** The shore's blocks and the files each holds, by group, and its rows of blocks, top to bottom. */
type Flow = {
  readonly blocks: ReadonlyMap<string, ShoreBlock>;
  readonly files: ReadonlyMap<string, readonly string[]>;
  readonly rows: readonly ShoreRow[];
};

/** A group's shore files: none of the tests', which are evidence (D4). */
function shoreFilesOf(group: Group): readonly string[] {
  return group.id === TESTS_GROUP ? [] : group.files;
}

function columnsFor(count: number): number {
  return Math.min(SHORE_MAX_COLUMNS, Math.ceil(Math.sqrt(count)));
}

/** The place of the `index`th mark of a block. */
function markAt(block: ShoreBlock, index: number): Position {
  return {
    x: round(block.x + ((index % block.cols) + 0.5) * SHORE_PITCH),
    y: round(block.y + (Math.floor(index / block.cols) + 0.5) * SHORE_PITCH),
    r: SHORE_MARK_RADIUS,
  };
}

/** The blocks, flowed left to right and wrapped at `width`. */
function flowShore(groups: readonly Group[], width: number): Flow {
  const blocks = new Map<string, ShoreBlock>();
  const files = new Map<string, readonly string[]>();
  const rows: ShoreRow[] = [];
  let row: ShoreRow | undefined;
  let x = MARGIN;

  for (const group of groups) {
    const marks = shoreFilesOf(group);
    if (marks.length === 0) continue;
    const cols = columnsFor(marks.length);
    const blockWidth = cols * SHORE_PITCH;
    if (row !== undefined && x + blockWidth > width - MARGIN) {
      x = MARGIN;
      row = { y: row.y + row.room * SHORE_PITCH + SHORE_GAP, room: 0, right: x };
      rows.push(row);
    }
    if (row === undefined) {
      row = { y: SHORE_PAD, room: 0, right: x };
      rows.push(row);
    }
    blocks.set(group.id, { x, y: row.y, cols, row: rows.length - 1 });
    files.set(group.id, marks);
    row.room = Math.max(row.room, Math.ceil(marks.length / cols));
    row.right = x + blockWidth;
    x += blockWidth + SHORE_GAP;
  }
  return { blocks, files, rows };
}

/** How tall the shore stands over its rows of blocks, and how far right they reach, so the field is at least that wide. */
function shoreBounds(rows: readonly ShoreRow[]): { readonly height: number; readonly extent: number } {
  const last = rows.at(-1);
  if (last === undefined) return { height: 0, extent: 0 };
  const right = rows.reduce((edge, row) => Math.max(edge, row.right), 0);
  return { height: Math.ceil(last.y + last.room * SHORE_PITCH + SHORE_PAD), extent: Math.ceil(right) + MARGIN };
}

/**
 * The shore, on a grid rather than a simulation: these files import nothing
 * and are imported by nothing, so there is no structure for a force to find,
 * and a grid at least reads in the order the rule table is written (D48). Each
 * group is one block, blocks flow left to right and wrap, which is what gives
 * step 17 one small contour to draw per group.
 */
function layOutShore(groups: readonly Group[], width: number): Shore {
  const flow = flowShore(groups, width);
  const positions = new Map<string, Position>();
  for (const [id, block] of flow.blocks) {
    (flow.files.get(id) ?? []).forEach((file, index) => positions.set(file, markAt(block, index)));
  }
  return { positions, ...shoreBounds(flow.rows) };
}

/** Slide a settled pass along, and down into a row below the first; the shape of it does not change. */
function shift(placements: readonly Placement[], offset: number, down = 0): readonly Placement[] {
  return placements.map((placed) => roundPlacement({ ...placed, x: placed.x + offset, y: placed.y + down }));
}

function offsetFor(placements: readonly Placement[]): number {
  if (placements.length === 0) return 0;
  return MARGIN - placements.reduce((left, placed) => Math.min(left, placed.x - placed.r), Number.POSITIVE_INFINITY);
}

/** How far right of the margin a pass slid onto it reaches. */
function spanOf(placements: readonly Placement[]): number {
  return placements.reduce((edge, placed) => Math.max(edge, placed.x + placed.r), MARGIN) - MARGIN;
}

/** The path in a cell's id, which `identifyModules` writes as `<kind>:<path>`. */
function pathOf(id: string): string {
  return id.slice(id.indexOf(':') + 1);
}

/** The kind in a cell's id, the part `pathOf` leaves out. */
function kindOf(id: string): string {
  return id.slice(0, Math.max(id.indexOf(':'), 0));
}

/**
 * A cell and every cell that holds it, the cell first and its package last
 * (D45), so the last is the lane it stands in: a cell no package holds is a
 * lane of its own. The walk stops at a loop rather than trusting the tree to
 * have none.
 */
function ancestry(cells: readonly MembraneCell[]): (cell: string) => readonly string[] {
  const parentOf = new Map(cells.flatMap((cell) => (cell.parent === undefined ? [] : [[cell.id, cell.parent] as const])));
  return (cell) => {
    const line = [cell];
    for (let up = parentOf.get(cell); up !== undefined && !line.includes(up); up = parentOf.get(up)) line.push(up);
    return line;
  };
}

/**
 * Which part of `root` a cell is in: the cell `root` holds that it lies
 * beneath, or `''` when it is `root` itself, which is the part its own files
 * make. `line` is the cell's ancestry, so `root` is somewhere in it.
 */
function partOf(line: readonly string[], root: string): string {
  const at = line.indexOf(root);
  return at <= 0 ? '' : (line[at - 1] ?? '');
}

/** One lane settled in a frame of its own: its terrain's left edge on the margin, and how far right that terrain reaches. */
type Settled = { readonly placements: readonly Placement[]; readonly span: number; readonly grounded: boolean };

/** The fields every pass of one layout shares. */
type Field = {
  readonly input: LayoutInput;
  readonly strips: ReadonlyMap<number, Strip>;
  readonly line: (cell: string) => readonly string[];
  /** Where the prior put each file it shares with this field, carried onto this field's terraces. */
  readonly start: ReadonlyMap<string, Point>;
};

/** Settle files with the forces, with nothing pinned, from the layout's seed or a seed of their own, starting each from the prior where it has one. */
function alone(files: readonly LayoutFile[], field: Field, seed = LAYOUT_SEED): readonly Placement[] {
  const { input, strips, start } = field;
  return simulate({ files, edges: input.edges, strips, width: spreadWidth(files), fixed: new Map(), start, random: seededRandom(seed) });
}

/**
 * How far a block may rise (below zero) and fall and keep every file on its
 * terrace: a file's height within its strip says nothing (D13), so a block
 * may take any of the heights all of its files can.
 */
function liftOf(placements: readonly Placement[], bandOf: ReadonlyMap<string, number>, strips: ReadonlyMap<number, Strip>): readonly [number, number] {
  return placements.reduce<readonly [number, number]>(
    ([up, down], placed) => {
      const strip = strips.get(bandOf.get(placed.id) ?? -1);
      if (strip === undefined) return [up, down];
      const [low, high] = heightsOn(strip, placed.r);
      return [Math.max(up, Math.min(low - placed.y, 0)), Math.min(down, Math.max(high - placed.y, 0))];
    },
    [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY],
  );
}

/**
 * Settle the files beneath `root`, keeping the cells it holds apart (D171).
 * A root whose files are all its own, or all one held cell's, has no
 * siblings to keep apart and settles as one. Otherwise each part (the
 * root's own files, and each held cell with every cell beneath it) settles
 * alone into a block, the forces settle the whole root once more to say
 * where each block wants to be, near the files it imports and is imported
 * by, and the blocks are stood apart as near those places as they fit. A
 * part a layout before this one placed wants the place it had instead: the
 * forces settling the whole root pull stood-apart blocks back together, so
 * a block placed by them would creep on every relaxation (D97).
 */
function settleBeneath(root: string, files: readonly LayoutFile[], field: Field, seed = LAYOUT_SEED): readonly Placement[] {
  const parts = new Map<string, LayoutFile[]>();
  for (const file of files) {
    const part = partOf(field.line(file.cell), root);
    parts.set(part, [...(parts.get(part) ?? []), file]);
  }
  const [only] = parts.keys();
  if (parts.size <= 1) return only === undefined || only === '' ? alone(files, field, seed) : settleBeneath(only, files, field, seed);

  const together = alone(files, field, seed);
  const partOfFile = new Map(files.map((file) => [file.id, partOf(field.line(file.cell), root)] as const));
  const wanted = new Map<string, { total: number; count: number }>();
  for (const placed of together) {
    const part = partOfFile.get(placed.id) ?? '';
    const seen = wanted.get(part) ?? { total: 0, count: 0 };
    wanted.set(part, { total: seen.total + placed.x, count: seen.count + 1 });
  }
  const bandOf = new Map(files.map((file) => [file.id, file.band] as const));
  const blocks = [...parts].map(([part, held]): Block => {
    const seen = wanted.get(part);
    const placements = part === '' ? alone(held, field, seedOf(root)) : settleBeneath(part, held, field, seedOf(part));
    const kept = keptPlace(placements, field.start);
    return {
      key: part,
      placements,
      wanted: kept ?? (seen === undefined ? 0 : seen.total / seen.count),
      lift: liftOf(placements, bandOf, field.strips),
      grows: part === '' || kindOf(part) !== 'single',
      kept: kept !== undefined,
    };
  });
  return standApart(blocks);
}

function meanX(points: readonly Point[]): number {
  return points.reduce((total, point) => total + point.x, 0) / points.length;
}

/**
 * Where a block a layout before this one placed wants its centroid: where it
 * puts the files that layout placed back where they were, on average,
 * whatever files the block has gained beside them. None for a block that
 * layout never saw.
 */
function keptPlace(placements: readonly Placement[], start: ReadonlyMap<string, Point>): number | undefined {
  const known = placements.filter((placed) => start.has(placed.id));
  if (known.length === 0) return undefined;
  const were = known.flatMap((placed) => {
    const was = start.get(placed.id);
    return was === undefined ? [] : [was];
  });
  return meanX(were) - meanX(known) + meanX(placements);
}

/**
 * Settle one lane, in the two passes D32 asks for. The terrain goes first,
 * alone, its cells kept apart, and is then slid onto the margin and rounded;
 * the second pass pins exactly those numbers, so every force in it is
 * working around a terrain it cannot move, and the only thing it decides is
 * where the change's new files go: within the lane's slack either side of
 * its terrain, never out across the gutter, and moved from where the forces
 * wanted them only as far as keeps sibling cells apart. A lane whose every
 * file is new has no terrain to pin, so it settles as terrain would, and that
 * is what gets slid.
 */
function settleLane(root: string, files: readonly LayoutFile[], field: Field): Settled {
  const { input } = field;
  const ground = files.filter((file) => !input.added.has(file.id));
  const terrain = settleBeneath(root, ground, field);
  if (terrain.length === 0) {
    const all = settleBeneath(root, files, field);
    const slid = shift(all, offsetFor(all));
    return { placements: slid, span: spanOf(slid), grounded: false };
  }
  const settled = shift(terrain, offsetFor(terrain));
  const span = spanOf(settled);
  if (ground.length === files.length) return { placements: settled, span, grounded: true };

  const lane = { x0: MARGIN - LANE_SLACK, x1: MARGIN + span + LANE_SLACK };
  return { placements: [...settled, ...placeBeside(root, files, settled, lane, field)], span, grounded: true };
}

/**
 * The second pass (D32): every file of a lane its terrain does not hold,
 * placed with that terrain pinned. The forces say where each wants to be,
 * near the files it imports and is imported by, and it lands at the nearest
 * place to that inside the lane at which sibling cells keep apart.
 */
function placeBeside(root: string, files: readonly LayoutFile[], terrain: readonly Placement[], lane: Lane, field: Field): readonly Placement[] {
  const pinned = new Map(terrain.map((placed) => [placed.id, placed] as const));
  const wanted = simulate({
    files,
    edges: field.input.edges,
    strips: field.strips,
    width: spreadWidth(files.filter((file) => pinned.has(file.id))),
    fixed: pinned,
    lane,
    random: seededRandom(LAYOUT_SEED + 1),
  });
  const cellOf = new Map(files.map((file) => [file.id, file.cell] as const));
  const held = (placed: Placement): Held => ({ ...placed, cell: cellOf.get(placed.id) ?? '' });
  const bandOf = new Map(files.map((file) => [file.id, file.band] as const));
  const added = placeAdded({
    terrain: terrain.map(held),
    added: wanted.flatMap((placed) => {
      const strip = field.strips.get(bandOf.get(placed.id) ?? -1);
      return !pinned.has(placed.id) && strip !== undefined ? [{ ...held(placed), heights: heightsOn(strip, placed.r) }] : [];
    }),
    levels: (cell) => {
      const line = field.line(cell);
      return line.slice(0, line.indexOf(root) + 1).toReversed().map((at) => [at, partOf(line, at)] as const);
    },
    lane,
  });
  return added.map(roundPlacement);
}

/**
 * Settle the field, a lane at a time. A package's skin holds every cell
 * beneath it (D45), so a package whose files the forces let wander in among
 * another's draws that skin running between the other's cells, which reads
 * as one package inside the other. So each package settles alone, on the
 * terraces every lane shares, and the lanes stand side by side in path order,
 * each with its slack and a gutter between, so no two packages share a
 * stretch of the field and no skin has another package's cells to run
 * between. Where a lane stands is measured off the terrain of the lanes
 * before it, never their added files, and the lanes the change brought whole
 * stand after every lane that has ground, so the change's new files and
 * packages take room beside the ground rather than shouldering it aside
 * (D32). Imports between packages pull nothing: the gap they cross is the
 * hop the skin already draws (D45). Every lane settles on the one ladder of
 * terraces, and a lane in a row below the first is moved down onto that
 * row's copy of it whole (Q73).
 */
function settle(files: readonly LayoutFile[], input: LayoutInput, bands: readonly LayoutBand[]): Wrapped {
  const strips = new Map(bands.map((band) => [band.index, band] as const));
  const field: Field = { input, strips, line: ancestry(input.cells), start: startsOf(files, input.prior, strips) };
  const lanes = new Map<string, LayoutFile[]>();
  for (const file of files) {
    const lane = field.line(file.cell).at(-1) ?? file.cell;
    lanes.set(lane, [...(lanes.get(lane) ?? []), file]);
  }
  const settled = [...lanes]
    .toSorted(([a], [b]) => byPath(pathOf(a), pathOf(b)) || byPath(a, b))
    .map(([root, held]) => settleLane(root, held, field));

  const ladder = ladderOf(bands);
  const rows = wrap(
    settled.filter((lane) => lane.grounded),
    settled.filter((lane) => !lane.grounded),
    ladder,
  );
  const [only] = rows;
  if (rows.length === 1 && only !== undefined) return { placements: standInRow(only, 0) };
  const placed = rows.map((row, index) => standInRow(row, index * (ladder + ROW_GAP)));
  return {
    placements: placed.flat(),
    rows: placed.map(
      (row, index): LayoutRow => ({
        x0: 0,
        x1: Math.ceil(row.reduce((edge, at) => Math.max(edge, at.x + at.r), 0)) + MARGIN,
        bands: bands.map((band) => ({ index: band.index, y0: band.y0 + index * (ladder + ROW_GAP), y1: band.y1 + index * (ladder + ROW_GAP) })),
      }),
    ),
  };
}

/** The settled field: every file's placement, and the rows its lanes wrapped into, when they wrapped. */
type Wrapped = { readonly placements: readonly Placement[]; readonly rows?: readonly LayoutRow[] };

/** How tall a ladder of terraces stands, top to bottom. */
function ladderOf(bands: readonly LayoutBand[]): number {
  return bands.reduce((total, band) => total + (band.y1 - band.y0), 0);
}

/** Stand lanes side by side from the margin, each its terrain's span and a pitch after the one before, moved `down` into their row. */
function standInRow(lanes: readonly Settled[], down: number): readonly Placement[] {
  let left = MARGIN;
  return lanes.flatMap((lane) => {
    const offset = left - MARGIN;
    left = Math.ceil(left + lane.span + LANE_PITCH);
    return offset === 0 && down === 0 ? lane.placements : shift(lane.placements, offset, down);
  });
}

/** How wide a row of lanes stood as `standInRow` stands them runs: its last lane's terrain's right edge, and the margin past it. */
function rowWidth(lanes: readonly Settled[]): number {
  let [left, right] = [MARGIN, MARGIN];
  for (const lane of lanes) {
    right = left + lane.span;
    left = Math.ceil(left + lane.span + LANE_PITCH);
  }
  return right + MARGIN;
}

/** Lanes filled on, in the order they stand, into rows no wider than `most`: a lane opens a row when the last holds one already and would run past it. */
function fill(lanes: readonly Settled[], most: number, rows: readonly (readonly Settled[])[] = []): readonly (readonly Settled[])[] {
  return lanes.reduce<readonly (readonly Settled[])[]>((filled, lane) => {
    const last = filled.at(-1);
    return last !== undefined && rowWidth([...last, lane]) <= most ? [...filled.slice(0, -1), [...last, lane]] : [...filled, [lane]];
  }, rows);
}

/**
 * The rows the lanes stand in (Q73). One, as the field always stood, while
 * the lanes fit one row no wider than `ASPECT` times its terraces' height.
 * Past that, the fewest rows at which the lanes, filled in the order they
 * stand into rows no wider than `ASPECT` times the height those rows stack
 * to, take no more rows than that: the field nearest the screen's shape that
 * still never splits a lane. The breaks are measured off the lanes with
 * ground alone, as a lane's place is measured off the terrain before it
 * (D32), so the lanes of packages a change brings whole fill on after the
 * ground's rather than splitting its rows.
 */
function wrap(grounded: readonly Settled[], fresh: readonly Settled[], ladder: number): readonly (readonly Settled[])[] {
  const [basis, rest] = grounded.length > 0 ? [grounded, fresh] : [fresh, []];
  if (basis.length < 2 || rowWidth(basis) <= ASPECT * ladder) return [[...grounded, ...fresh]];
  // It ends by the time `count` reaches the lanes' own count, since no row is ever left empty.
  for (let count = 2; ; count += 1) {
    const most = ASPECT * (count * ladder + (count - 1) * ROW_GAP);
    const rows = fill(basis, most);
    if (rows.length <= count) return fill(rest, most, rows);
  }
}

/**
 * Where the prior puts each file it shares with this field (D97). Its `x` is
 * kept in the prior's frame, which the passes carry their new files into; its
 * height keeps its share of the terrace it stood on, set on the terrace it
 * stands on now, since terraces grow and move with what stands on them and a
 * file's height within one says nothing (D13). A prior whose lanes wrapped
 * into rows is read on whichever row's terrace the file stood (Q73).
 */
function startsOf(files: readonly LayoutFile[], prior: Prior | undefined, strips: ReadonlyMap<number, Strip>): ReadonlyMap<string, Point> {
  if (prior === undefined) return new Map();
  const ladders = prior.rows?.flatMap((row) => row.bands) ?? prior.bands;
  return new Map(
    files.flatMap((file) => {
      const was = prior.positions[file.id];
      const strip = strips.get(file.band);
      if (was === undefined || strip === undefined) return [];
      const stood = ladders.find((band) => was.y >= band.y0 && was.y < band.y1);
      const share = stood === undefined || stood.y1 <= stood.y0 ? 0.5 : (was.y - stood.y0) / (stood.y1 - stood.y0);
      return [[file.id, { x: was.x, y: strip.y0 + share * (strip.y1 - strip.y0) }] as const];
    }),
  );
}

/**
 * Where each renamed file stood in the prior, under its old path, carried
 * into this field beside the file nearest it there that stands in both (D40,
 * D97): the field's lanes and terraces shift with what the change adds, and
 * the nearest neighbour that stayed shifted with them. A renamed file the
 * prior never placed has no second position (C2).
 */
function renamedFrom(prior: Prior | undefined, renames: ReadonlyMap<string, string>, positions: Readonly<Record<string, Position>>): Readonly<Record<string, Position>> {
  if (prior === undefined || renames.size === 0) return {};
  const moved = new Set(renames.keys());
  const stayed = Object.keys(positions)
    .filter((id) => !moved.has(id) && prior.positions[id] !== undefined)
    .toSorted(byPath);
  const entries = [...renames]
    .toSorted(([a], [b]) => byPath(a, b))
    .flatMap(([path, from]) => {
      const was = prior.positions[from];
      if (was === undefined || positions[path] === undefined) return [];
      const nearest = stayed.reduce<{ readonly id: string; readonly distance: number } | undefined>((best, id) => {
        const there = prior.positions[id];
        const distance = there === undefined ? Number.POSITIVE_INFINITY : Math.hypot(there.x - was.x, there.y - was.y);
        return best === undefined || distance < best.distance ? { id, distance } : best;
      }, undefined);
      const before = nearest === undefined ? undefined : prior.positions[nearest.id];
      const after = nearest === undefined ? undefined : positions[nearest.id];
      const dx = before === undefined || after === undefined ? 0 : after.x - before.x;
      const dy = before === undefined || after === undefined ? 0 : after.y - before.y;
      return [[path, { x: round(was.x + dx), y: round(was.y + dy), r: was.r }] as const];
    });
  return Object.fromEntries(entries);
}

function filesOf(organelles: readonly Organelle[]): readonly LayoutFile[] {
  return organelles.map((organelle) => ({ id: organelle.id, cell: organelle.cell, band: organelle.band, loc: organelle.loc }));
}

/** Whether two ancestries name the same cells, the cell first and its lane last. */
function sameLine(one: readonly string[], other: readonly string[]): boolean {
  return one.length === other.length && one.every((cell, index) => cell === other[index]);
}

/**
 * The base's terraces, under the meaning the change gives them: each band
 * both know keeps its strip, a band only the change has is stacked below the
 * deepest as tall as what stands on it, and a band only the base had goes.
 * None when a band both know spans other depths, which happens when the
 * change deepens the abyss past the bands a map can draw, and every terrace
 * then means something else.
 */
function heldStrips(input: LayoutInput, ground: Ground, files: readonly LayoutFile[], width: number): readonly LayoutBand[] | undefined {
  const meant = new Map(ground.bands.map((band) => [band.index, band] as const));
  const stood = new Map(ground.layout.bands.map((band) => [band.index, band] as const));
  let y = ground.layout.shore.y1;
  const strips: LayoutBand[] = [];
  for (const band of [...input.bands].toSorted((a, b) => a.index - b.index)) {
    const was = meant.get(band.index);
    const strip = stood.get(band.index);
    if (was !== undefined && (was.depth_min !== band.depth_min || was.depth_max !== band.depth_max)) return undefined;
    if (strip?.y0 === y) {
      strips.push(strip);
      y = strip.y1;
      continue;
    }
    if (strip !== undefined) return undefined;
    const height = heightOf(band.index, files, width);
    strips.push({ index: band.index, y0: y, y1: y + height });
    y += height;
  }
  return strips;
}

/**
 * The base's shore, with the change's new marks in it (D172): every mark the
 * base placed in a group the change keeps it in stands where it stood, and
 * each new one takes the next free place of its group's block, in path
 * order, as low as the tallest block of its row reaches and one row lower,
 * into the gap below every row. What its block cannot take, and a group the
 * base had no block for, stands in a block of its own at the end of the row,
 * as tall as the row, widening the field rather than pushing the terraces
 * down. None when the base had no shore for a new mark to join.
 */
function heldShore(groups: readonly Group[], ground: Ground, width: number): Shore | undefined {
  const flow = flowShore(ground.groups, width);
  const rows = flow.rows.map((row) => ({ ...row }));
  const positions = new Map<string, Position>();
  for (const group of groups) {
    const marks = shoreFilesOf(group);
    if (marks.length === 0) continue;
    const before = flow.files.get(group.id) ?? [];
    const had = new Set(before);
    const kept = marks.filter((file) => had.has(file) && ground.layout.positions[file] !== undefined);
    for (const file of kept) {
      const at = ground.layout.positions[file];
      if (at !== undefined) positions.set(file, at);
    }
    const stood = new Set(kept);
    const fresh = marks.filter((file) => !stood.has(file));
    const block = flow.blocks.get(group.id);
    const fits = block === undefined ? 0 : Math.max(((rows[block.row]?.room ?? 0) + 1) * block.cols - before.length, 0);
    if (block !== undefined) fresh.slice(0, fits).forEach((file, index) => positions.set(file, markAt(block, before.length + index)));
    const spilled = fresh.slice(fits);
    if (spilled.length === 0) continue;
    const row = rows[block?.row ?? rows.length - 1];
    if (row === undefined) return undefined;
    const cols = Math.max(columnsFor(spilled.length), Math.ceil(spilled.length / row.room));
    const spill: ShoreBlock = { x: row.right + SHORE_GAP, y: row.y, cols, row: block?.row ?? rows.length - 1 };
    spilled.forEach((file, index) => positions.set(file, markAt(spill, index)));
    row.right = spill.x + cols * SHORE_PITCH;
  }
  return { positions, height: ground.layout.shore.y1, extent: shoreBounds(rows).extent };
}

/** The stretch of `x` a lane's terrain covered in the base: its files' discs, left edge to right. */
function extentOf(placements: readonly Position[]): Lane {
  return {
    x0: placements.reduce((left, at) => Math.min(left, at.x - at.r), Number.POSITIVE_INFINITY),
    x1: placements.reduce((right, at) => Math.max(right, at.x + at.r), Number.NEGATIVE_INFINITY),
  };
}

/** Every place the field changed at from `before` to `after`: where a file now stands that it did not, and where one stood that it has left. */
function changedPlaces(before: Readonly<Record<string, Position>>, after: Readonly<Record<string, Position>>): readonly Position[] {
  const ids = [...new Set([...Object.keys(before), ...Object.keys(after)])].toSorted(byPath);
  return ids.flatMap((id) => {
    const [was, now] = [before[id], after[id]];
    if (was !== undefined && now !== undefined && was.x === now.x && was.y === now.y && was.r === now.r) return [];
    return [...(was === undefined ? [] : [was]), ...(now === undefined ? [] : [now])];
  });
}

/**
 * Hold the base's field under a change (D172). A file stands exactly where
 * the base put it when the change did not add or rename it and left it in
 * the same cell, under the same cells up to its lane, on the same terrace at
 * the same size. Every other file is placed as the second pass places an
 * added one, around the held files of its lane, inside the room the base's
 * lane kept either side of its terrain; a lane none of whose files is held
 * settles alone and stands after every lane the base had. The terraces and
 * the shore are the base's, and a skin whose members and neighbourhood did
 * not change is the base's skin. None when the base's terraces or shore
 * cannot hold the change, which then relaxes from the base instead (D97).
 *
 * Over a base whose lanes wrapped into rows (Q73), each lane's files are
 * placed on its own row's terraces, the lanes the base never had stand after
 * the last row's last lane, and the rows stand as the base had them, a row
 * reaching further right only as far as its new files do. A change that
 * gives the ladder another terrace would move every row below the first, so
 * it relaxes instead.
 */
function holdGround(input: LayoutInput, ground: Ground): Layout | undefined {
  const files = filesOf(input.organelles);
  const width = spreadWidth(ground.organelles);
  const bands = heldStrips(input, ground, files, width);
  const shore = heldShore(input.groups, ground, width);
  if (bands === undefined || shore === undefined) return undefined;
  const { rows } = ground.layout;
  if (rows !== undefined && !sameLadder(bands, ground.layout.bands)) return undefined;
  const strips = new Map(bands.map((band) => [band.index, band] as const));
  // Each row's terraces, the first row's the one ladder, and the row a base position stands in.
  const ladders = rows === undefined ? [strips] : rows.map((row) => new Map(row.bands.map((band) => [band.index, band] as const)));
  const rowAt = (y: number): number => (rows === undefined ? 0 : Math.max(0, rows.findIndex((row) => row.bands.some((band) => y >= band.y0 && y < band.y1))));

  const line = ancestry(input.cells);
  const before = ancestry(ground.cells);
  const was = new Map(ground.organelles.map((file) => [file.id, file] as const));
  const renamed = new Set(input.renames?.keys() ?? []);
  const stands = (file: LayoutFile): Position | undefined => {
    const then = was.get(file.id);
    if (input.added.has(file.id) || renamed.has(file.id) || then === undefined) return undefined;
    if (then.cell !== file.cell || then.band !== file.band || then.loc !== file.loc || !sameLine(line(file.cell), before(then.cell))) return undefined;
    return ground.layout.positions[file.id];
  };

  const lanes = new Map<string, LayoutFile[]>();
  for (const file of files) {
    const root = line(file.cell).at(-1) ?? file.cell;
    lanes.set(root, [...(lanes.get(root) ?? []), file]);
  }
  const laid = new Map<string, Position[]>();
  for (const file of ground.organelles) {
    const at = ground.layout.positions[file.id];
    const root = before(file.cell).at(-1) ?? file.cell;
    if (at !== undefined) laid.set(root, [...(laid.get(root) ?? []), at]);
  }

  const field: Field = { input, strips, line, start: new Map() };
  const placements: Placement[] = [];
  const unheld: (readonly [string, readonly LayoutFile[]])[] = [];
  for (const [root, held] of [...lanes].toSorted(([a], [b]) => byPath(pathOf(a), pathOf(b)) || byPath(a, b))) {
    const terrain = held.flatMap((file): Placement[] => {
      const at = stands(file);
      return at === undefined ? [] : [{ id: file.id, ...at }];
    });
    placements.push(...terrain);
    if (terrain.length === held.length) continue;
    if (terrain.length === 0) {
      unheld.push([root, held]);
      continue;
    }
    const { x0, x1 } = extentOf(laid.get(root) ?? terrain);
    const row = ladders[rowAt(terrain[0]?.y ?? 0)] ?? strips;
    placements.push(...placeBeside(root, held, terrain, { x0: x0 - LANE_SLACK, x1: x1 + LANE_SLACK }, row === strips ? field : { ...field, strips: row }));
  }

  // The lanes the base never had, or whose every file the change moved, stand after the base's last, as a cold field stands its new lanes (D32), in its last row.
  const last = rows === undefined ? 0 : rows.length - 1;
  const down = rows === undefined ? 0 : (rows[last]?.bands[0]?.y0 ?? 0) - (bands[0]?.y0 ?? 0);
  const end = extentOf([...laid.values()].flat().filter((at) => rowAt(at.y) === last)).x1;
  let left = Number.isFinite(end) ? Math.ceil(end + LANE_PITCH) : MARGIN;
  for (const [root, held] of unheld) {
    const lane = settleLane(root, held, field);
    placements.push(...shift(lane.placements, left - MARGIN, down));
    left = Math.ceil(left + lane.span + LANE_PITCH);
  }

  const right = placements.reduce((edge, placed) => Math.max(edge, placed.x + placed.r), 0);
  const positions = Object.fromEntries(
    [...shore.positions, ...placements.map((placed) => [placed.id, { x: placed.x, y: placed.y, r: placed.r }] as const)].toSorted(([a], [b]) => byPath(a, b)),
  );
  const renamedFromBase = renamedFrom(ground.layout, input.renames ?? new Map(), positions);
  const kept = {
    contours: ground.layout.contours ?? {},
    members: skinMembers({ cells: ground.cells, groups: ground.groups, positions: ground.layout.positions }),
    changed: changedPlaces(ground.layout.positions, positions),
  };
  const reach = (row: number): number => placements.reduce((edge, placed) => (rowAt(placed.y) === row ? Math.max(edge, placed.x + placed.r) : edge), 0);
  return {
    width: Math.max(MIN_WIDTH, ground.layout.width, shore.extent, Math.ceil(right) + MARGIN),
    height: rows === undefined ? shore.height + bands.reduce((total, band) => total + (band.y1 - band.y0), 0) : ground.layout.height,
    shore: { y0: 0, y1: shore.height },
    bands,
    ...(rows === undefined ? {} : { rows: rows.map((row, index) => ({ ...row, x1: Math.max(row.x1, Math.ceil(reach(index)) + MARGIN) })) }),
    positions,
    ...(Object.keys(renamedFromBase).length === 0 ? {} : { renamed_from: renamedFromBase }),
    contours: computeMembranes({ cells: input.cells, groups: input.groups, positions }, kept),
  };
}

/** Whether two ladders hold the same terraces at the same heights. */
function sameLadder(one: readonly LayoutBand[], other: readonly LayoutBand[]): boolean {
  return one.length === other.length && one.every((band, index) => band.index === other[index]?.index && band.y0 === other[index]?.y0 && band.y1 === other[index]?.y1);
}

/**
 * Compute the one layout every renderer of this map draws from (D24). The
 * field's own size is measured off the terrain once it has settled and the
 * shore beside it, rather than a frame the terrain was made to fit, and the
 * membranes are cut over that settled field, so nothing they do can move it.
 * Handed its base's own field, a change's map holds it rather than settling
 * again (D172), and relaxes from it only where the base's field cannot hold
 * the change (D97).
 */
export function computeLayout(input: LayoutInput): Layout {
  const { ground, ...rest } = input;
  if (ground !== undefined) return holdGround(rest, ground) ?? computeLayout({ ...rest, prior: ground.layout });
  const files = filesOf(input.organelles);
  const spread = spreadWidth(files);
  const shore = layOutShore(input.groups, spread);
  const bands = stripsFor(input.bands, files, spread, shore.height);
  const { placements, rows } = settle(files, input, bands);
  const stacked = rows === undefined ? 0 : (rows.length - 1) * (ladderOf(bands) + ROW_GAP);

  const right = placements.reduce((edge, placed) => Math.max(edge, placed.x + placed.r), 0);
  const entries: readonly (readonly [string, Position])[] = [
    ...shore.positions,
    ...placements.map((placed) => [placed.id, { x: placed.x, y: placed.y, r: placed.r }] as const),
  ].toSorted(([a], [b]) => byPath(a, b));
  const positions = Object.fromEntries(entries);

  const renamed = renamedFrom(input.prior, input.renames ?? new Map(), positions);

  return {
    width: Math.max(MIN_WIDTH, shore.extent, Math.ceil(right) + MARGIN),
    height: shore.height + bands.reduce((total, band) => total + (band.y1 - band.y0), 0) + stacked,
    shore: { y0: 0, y1: shore.height },
    bands,
    ...(rows === undefined ? {} : { rows }),
    positions,
    ...(Object.keys(renamed).length === 0 ? {} : { renamed_from: renamed }),
    contours: computeMembranes({ cells: input.cells, groups: input.groups, positions }),
  };
}
