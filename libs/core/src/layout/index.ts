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
 * siblings, so no two cells' skins cross (D171, `siblings.ts`). Terrain is
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
 */

import { classifyFile } from '../modules.js';
import type { ImportEdge } from '../modules.js';
import type { Band, Group, Layout, LayoutBand, Organelle, Position } from '../schema.js';
import { heightsOn, radiusOf, simulate } from './force.js';
import type { LayoutFile, Placement, Point, Strip } from './force.js';
import { computeMembranes } from './membranes.js';
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
};

/** What a layout before this one says: where each file was, and the terraces it was on. */
export type Prior = Pick<Layout, 'positions' | 'bands'>;

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
  const wanted = simulate({
    files,
    edges: input.edges,
    strips: field.strips,
    width: spreadWidth(ground),
    fixed: new Map(settled.map((placed) => [placed.id, placed] as const)),
    lane,
    random: seededRandom(LAYOUT_SEED + 1),
  });
  const cellOf = new Map(files.map((file) => [file.id, file.cell] as const));
  const held = (placed: Placement): Held => ({ ...placed, cell: cellOf.get(placed.id) ?? '' });
  const bandOf = new Map(files.map((file) => [file.id, file.band] as const));
  const added = placeAdded({
    terrain: settled.map(held),
    added: wanted.flatMap((placed) => {
      const strip = field.strips.get(bandOf.get(placed.id) ?? -1);
      return input.added.has(placed.id) && strip !== undefined ? [{ ...held(placed), heights: heightsOn(strip, placed.r) }] : [];
    }),
    levels: (cell) => {
      const line = field.line(cell);
      return line.slice(0, line.indexOf(root) + 1).toReversed().map((at) => [at, partOf(line, at)] as const);
    },
    lane,
  });
  return { placements: [...settled, ...added.map(roundPlacement)], span, grounded: true };
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
  const field: Field = { input, strips, line: ancestry(input.cells), start: startsOf(files, input.prior, strips) };
  const lanes = new Map<string, LayoutFile[]>();
  for (const file of files) {
    const lane = field.line(file.cell).at(-1) ?? file.cell;
    lanes.set(lane, [...(lanes.get(lane) ?? []), file]);
  }
  const settled = [...lanes]
    .toSorted(([a], [b]) => byPath(pathOf(a), pathOf(b)) || byPath(a, b))
    .map(([root, held]) => settleLane(root, held, field));

  let left = MARGIN;
  return [...settled.filter((lane) => lane.grounded), ...settled.filter((lane) => !lane.grounded)].flatMap((lane) => {
    const offset = left - MARGIN;
    left = Math.ceil(left + lane.span + 2 * LANE_SLACK + LANE_GUTTER);
    return offset === 0 ? lane.placements : shift(lane.placements, offset);
  });
}

/**
 * Where the prior puts each file it shares with this field (D97). Its `x` is
 * kept in the prior's frame, which the passes carry their new files into; its
 * height keeps its share of the terrace it stood on, set on the terrace it
 * stands on now, since terraces grow and move with what stands on them and a
 * file's height within one says nothing (D13).
 */
function startsOf(files: readonly LayoutFile[], prior: Prior | undefined, strips: ReadonlyMap<number, Strip>): ReadonlyMap<string, Point> {
  if (prior === undefined) return new Map();
  return new Map(
    files.flatMap((file) => {
      const was = prior.positions[file.id];
      const strip = strips.get(file.band);
      if (was === undefined || strip === undefined) return [];
      const stood = prior.bands.find((band) => was.y >= band.y0 && was.y < band.y1);
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

  const renamed = renamedFrom(input.prior, input.renames ?? new Map(), positions);

  return {
    width: Math.max(MIN_WIDTH, shore.extent, Math.ceil(right) + MARGIN),
    height: shore.height + bands.reduce((total, band) => total + (band.y1 - band.y0), 0),
    shore: { y0: 0, y1: shore.height },
    bands,
    positions,
    ...(Object.keys(renamed).length === 0 ? {} : { renamed_from: renamed }),
    contours: computeMembranes({ cells: input.cells, groups: input.groups, positions }),
  };
}
