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
 * another's cells (D166). Terrain is settled first and added files second,
 * with the terrain pinned, so that the weather never moves the ground under
 * it (D32). The membranes are cut last,
 * over the settled field, one per cell and one per shore group (D13).
 */

import { classifyFile } from '../modules.js';
import type { ImportEdge } from '../modules.js';
import type { Band, Group, Layout, LayoutBand, Organelle, Position } from '../schema.js';
import { radiusOf, simulate } from './force.js';
import type { LayoutFile, Placement, Strip } from './force.js';
import { computeMembranes } from './membranes.js';
import type { MembraneCell } from './membranes.js';
import { LAYOUT_SEED, seededRandom } from './random.js';

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
      const here = files.filter((file) => file.band === band.index);
      const widest = here.reduce((most, file) => Math.max(most, radiusOf(file.loc)), 0);
      const height = Math.ceil(
        Math.max(MIN_BAND_HEIGHT, BAND_ROOM * 2 * widest, demandOf(here) / width),
      );
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

/**
 * The shore, on a grid rather than a simulation: these files import nothing
 * and are imported by nothing, so there is no structure for a force to find,
 * and a grid at least reads in the order the rule table is written (D48). Each
 * group is one block, blocks flow left to right and wrap, which is what gives
 * step 17 one small contour to draw per group.
 */
function layOutShore(groups: readonly Group[], width: number): Shore {
  const positions = new Map<string, Position>();
  let x = MARGIN;
  let y = SHORE_PAD;
  let rowHeight = 0;
  let extent = 0;

  for (const group of groups) {
    const files = group.files.filter((file) => classifyFile(file) !== 'test');
    if (files.length === 0) continue;
    const cols = Math.min(SHORE_MAX_COLUMNS, Math.ceil(Math.sqrt(files.length)));
    const rows = Math.ceil(files.length / cols);
    const blockWidth = cols * SHORE_PITCH;
    if (x > MARGIN && x + blockWidth > width - MARGIN) {
      x = MARGIN;
      y += rowHeight + SHORE_GAP;
      rowHeight = 0;
    }
    files.forEach((file, index) => {
      positions.set(file, {
        x: round(x + ((index % cols) + 0.5) * SHORE_PITCH),
        y: round(y + (Math.floor(index / cols) + 0.5) * SHORE_PITCH),
        r: SHORE_MARK_RADIUS,
      });
    });
    extent = Math.max(extent, x + blockWidth);
    x += blockWidth + SHORE_GAP;
    rowHeight = Math.max(rowHeight, rows * SHORE_PITCH);
  }

  if (positions.size === 0) return { positions, height: 0, extent: 0 };
  return { positions, height: Math.ceil(y + rowHeight + SHORE_PAD), extent: Math.ceil(extent) + MARGIN };
}

/** Slide a settled pass so its leftmost edge rests on the margin; the shape of it does not change. */
function shift(placements: readonly Placement[], offset: number): readonly Placement[] {
  return placements.map((placed) => roundPlacement({ ...placed, x: placed.x + offset }));
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

/**
 * The lane each cell stands in: the outermost cell that holds it, which is
 * its package, or the cell itself when no package holds it (D45).
 */
function laneOf(cells: readonly MembraneCell[]): (cell: string) => string {
  const parentOf = new Map(cells.flatMap((cell) => (cell.parent === undefined ? [] : [[cell.id, cell.parent] as const])));
  return (cell) => {
    const seen = new Set([cell]);
    let at = cell;
    for (let up = parentOf.get(at); up !== undefined && !seen.has(up); up = parentOf.get(at)) {
      seen.add(up);
      at = up;
    }
    return at;
  };
}

/** One lane settled in a frame of its own: its terrain's left edge on the margin, and how far right that terrain reaches. */
type Settled = { readonly placements: readonly Placement[]; readonly span: number; readonly grounded: boolean };

/**
 * Settle one lane, in the two passes D32 asks for. The terrain goes first,
 * alone, and is then slid onto the margin and rounded; the second pass pins
 * exactly those numbers, so every force in it is working around a terrain it
 * cannot move, and the only thing it decides is where the change's new files
 * go: within the lane's slack either side of its terrain, never out across
 * the gutter. A lane whose every file is new has no terrain to pin, so the
 * second pass is the only one there was and it is what gets slid.
 */
function settleLane(files: readonly LayoutFile[], input: LayoutInput, strips: ReadonlyMap<number, Strip>): Settled {
  const ground = files.filter((file) => !input.added.has(file.id));
  const shared = { edges: input.edges, strips, width: spreadWidth(ground.length === 0 ? files : ground) } as const;

  const terrain = simulate({ ...shared, files: ground, fixed: new Map(), random: seededRandom(LAYOUT_SEED) });
  if (terrain.length === 0) {
    const all = simulate({ ...shared, files, fixed: new Map(), random: seededRandom(LAYOUT_SEED + 1) });
    const slid = shift(all, offsetFor(all));
    return { placements: slid, span: spanOf(slid), grounded: false };
  }
  const settled = shift(terrain, offsetFor(terrain));
  const span = spanOf(settled);
  if (ground.length === files.length) return { placements: settled, span, grounded: true };

  const all = simulate({
    ...shared,
    files,
    fixed: new Map(settled.map((placed) => [placed.id, placed] as const)),
    lane: { x0: MARGIN - LANE_SLACK, x1: MARGIN + span + LANE_SLACK },
    random: seededRandom(LAYOUT_SEED + 1),
  });
  return { placements: all.map(roundPlacement), span, grounded: true };
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
 * hop the skin already draws (D45).
 */
function settle(files: readonly LayoutFile[], input: LayoutInput, strips: ReadonlyMap<number, Strip>): readonly Placement[] {
  const laneFor = laneOf(input.cells);
  const lanes = new Map<string, LayoutFile[]>();
  for (const file of files) {
    const lane = laneFor(file.cell);
    lanes.set(lane, [...(lanes.get(lane) ?? []), file]);
  }
  const settled = [...lanes]
    .toSorted(([a], [b]) => byPath(pathOf(a), pathOf(b)) || byPath(a, b))
    .map(([, held]) => settleLane(held, input, strips));

  let left = MARGIN;
  return [...settled.filter((lane) => lane.grounded), ...settled.filter((lane) => !lane.grounded)].flatMap((lane) => {
    const offset = left - MARGIN;
    left = Math.ceil(left + lane.span + 2 * LANE_SLACK + LANE_GUTTER);
    return offset === 0 ? lane.placements : shift(lane.placements, offset);
  });
}

/**
 * Compute the one layout every renderer of this map draws from (D24). The
 * field's own size is measured off the terrain once it has settled and the
 * shore beside it, rather than a frame the terrain was made to fit, and the
 * membranes are cut over that settled field, so nothing they do can move it.
 */
export function computeLayout(input: LayoutInput): Layout {
  const files: readonly LayoutFile[] = input.organelles.map((organelle) => ({
    id: organelle.id,
    cell: organelle.cell,
    band: organelle.band,
    loc: organelle.loc,
  }));
  const spread = spreadWidth(files);
  const shore = layOutShore(input.groups, spread);
  const bands = stripsFor(input.bands, files, spread, shore.height);
  const strips = new Map(bands.map((band) => [band.index, band] as const));
  const placements = settle(files, input, strips);

  const right = placements.reduce((edge, placed) => Math.max(edge, placed.x + placed.r), 0);
  const entries: readonly (readonly [string, Position])[] = [
    ...shore.positions,
    ...placements.map((placed) => [placed.id, { x: placed.x, y: placed.y, r: placed.r }] as const),
  ].toSorted(([a], [b]) => byPath(a, b));
  const positions = Object.fromEntries(entries);

  return {
    width: Math.max(MIN_WIDTH, shore.extent, Math.ceil(right) + MARGIN),
    height: shore.height + bands.reduce((total, band) => total + (band.y1 - band.y0), 0),
    shore: { y0: 0, y1: shore.height },
    bands,
    positions,
    contours: computeMembranes({ cells: input.cells, groups: input.groups, positions }),
  };
}
