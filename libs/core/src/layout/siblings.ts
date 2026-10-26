/**
 * siblings: the cells inside one package, kept apart (D171).
 *
 * The lanes keep packages apart (D166), and inside a package the forces had
 * the say: a folder's files and its neighbours' were pulled together by
 * their imports, so the folder's skin, which reaches round all of its files,
 * ran over the single-file cells settled between them, and two skins that
 * cross read as one cell inside the other. So inside a package every cell
 * settles alone, as a block, and the blocks are stood apart: each is slid
 * sideways (`y` is depth and never moves) to the place nearest where the
 * forces wanted it at which its outline keeps a gap from every block already
 * standing. A block's outline is the convex hull of its files' discs, each
 * grown by half the gap, and a skin runs round its files and along the
 * straight ways between them, so it keeps inside that hull, near enough: two
 * outlines that do not meet hold two skins that do not cross.
 *
 * The change's added files come after, with the terrain pinned (D32): each
 * lands where the second pass wanted it, moved along its terrace only as far
 * as keeps the blocks that grow to hold it clear of their siblings, into the
 * room a block that can take new files keeps round it.
 */

import { COLLIDE_PAD } from './force.js';
import type { Lane, Placement } from './force.js';

/**
 * The clear ground two sibling blocks keep between their files' discs and
 * the straight ways between them. A skin rests about 15 outside its files
 * (`nodeR0` in `membranes.ts`) and a neighbour's files push it back in, so
 * this leaves two skins apart with room for their strokes to read as two.
 */
const SIBLING_GAP = 20;

/**
 * The room a block that can take new files keeps round it on top of the
 * gap, so a file the change adds to it can usually stand beside the files it
 * already holds without its skin reaching into a sibling's: on seeded
 * crowded packages it left one layout in eighty with no clear place for an
 * added file. A single-file cell takes no new files, since a new file is a
 * cell of its own, so it keeps none.
 */
const GROWTH_ROOM = 16;

/** A disc is outlined as a polygon of this many sides drawn round it, so the polygon holds the whole disc. */
const SIDES = 16;

/** How far apart the rises a block is tried at stand, and the places an added file is tried at. */
const TRY_STEP = 6;

/**
 * A block settled in a frame of its own, keyed by the part of its parent it
 * is, with the `x` the forces wanted its centroid at, how far up (below
 * zero) and down its files' terraces let it rise and fall, whether the
 * change can add files to it, and whether its place is where a layout
 * before this one stood it rather than where the forces wanted it (D97).
 */
export type Block = {
  readonly key: string;
  readonly placements: readonly Placement[];
  readonly wanted: number;
  readonly lift: readonly [number, number];
  readonly grows: boolean;
  readonly kept: boolean;
};

type Point = readonly [number, number];

/** A convex polygon, its corners counter-clockwise in the field's coordinates. */
type Hull = readonly Point[];

/** An open stretch of shifts a block may not take, or of rises it may take. */
type Span = readonly [number, number];

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function cross(o: Point, a: Point, b: Point): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

/** The convex hull of some points, by Andrew's monotone chain. */
function hullOf(points: readonly Point[]): Hull {
  const sorted = points.toSorted((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (sorted.length < 3) return sorted;
  const chain = (from: readonly Point[]): Point[] => {
    const kept: Point[] = [];
    for (const point of from) {
      while (kept.length >= 2 && cross(kept.at(-2) ?? point, kept.at(-1) ?? point, point) <= 0) kept.pop();
      kept.push(point);
    }
    return kept.slice(0, -1);
  };
  return [...chain(sorted), ...chain(sorted.toReversed())];
}

/** The outline of some discs, each grown by half the gap, or by `pad`. */
function outlineOf(placements: readonly Placement[], pad = SIBLING_GAP / 2): Hull {
  const spoke = 1 / Math.cos(Math.PI / SIDES);
  return hullOf(
    placements.flatMap((placed) => {
      const reach = (placed.r + pad) * spoke;
      return Array.from({ length: SIDES }, (_unused, side): Point => {
        const angle = (2 * Math.PI * side) / SIDES;
        return [placed.x + reach * Math.cos(angle), placed.y + reach * Math.sin(angle)];
      });
    }),
  );
}

/** Whether some side of `edges` separates the two outlines: both project onto its normal without overlapping. */
function parted(edges: Hull, one: Hull, other: Hull): boolean {
  for (let index = 0; index < edges.length; index += 1) {
    const a = edges[index] ?? [0, 0];
    const b = edges[(index + 1) % edges.length] ?? a;
    const [nx, ny] = [a[1] - b[1], b[0] - a[0]];
    let [oneLow, oneHigh, otherLow, otherHigh] = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
    for (const [x, y] of one) {
      const along = x * nx + y * ny;
      oneLow = Math.min(oneLow, along);
      oneHigh = Math.max(oneHigh, along);
    }
    for (const [x, y] of other) {
      const along = x * nx + y * ny;
      otherLow = Math.min(otherLow, along);
      otherHigh = Math.max(otherHigh, along);
    }
    if (oneHigh <= otherLow || otherHigh <= oneLow) return true;
  }
  return false;
}

/** Whether two convex outlines overlap, by separating axes; two that only touch do not. */
function overlaps(one: Hull, other: Hull): boolean {
  return !parted(one, one, other) && !parted(other, one, other);
}

/** How high an outline stands: its top and its bottom. */
function rise(hull: Hull): readonly [number, number] {
  const ys = hull.map(([, y]) => y);
  return [Math.min(...ys), Math.max(...ys)];
}

/**
 * The shifts at which `moving` overlaps `still`, which are the points of the
 * one less the other, a convex shape too; or none, when no rise within
 * `lift` brings the two level with each other.
 */
function differenceOf(moving: Hull, still: Hull, lift: Span): Hull | undefined {
  const [[movingTop, movingBottom], [stillTop, stillBottom]] = [rise(moving), rise(still)];
  if (movingBottom + lift[1] <= stillTop || stillBottom <= movingTop + lift[0]) return undefined;
  return hullOf(still.flatMap(([bx, by]) => moving.map(([ax, ay]): Point => [bx - ax, by - ay])));
}

/** The open stretch of sideways shifts a difference blocks at the rise `dy`: where it crosses that line, as a list of none or one. */
function blocked(difference: Hull, dy: number): readonly Span[] {
  let [low, high] = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
  difference.forEach(([ax, ay], index) => {
    const [bx, by] = difference[(index + 1) % difference.length] ?? [ax, ay];
    if (ay === dy) [low, high] = [Math.min(low, ax), Math.max(high, ax)];
    if ((ay < dy && by > dy) || (ay > dy && by < dy)) {
      const x = ax + ((bx - ax) * (dy - ay)) / (by - ay);
      [low, high] = [Math.min(low, x), Math.max(high, x)];
    }
  });
  return low < high ? [[low, high]] : [];
}

/**
 * The point nearest `wanted` that no forbidden span holds, the left of two
 * at the same distance. The nearest free point is `wanted` itself or an end
 * of some span, so those are the only places it looks.
 */
function nearestFree(wanted: number, forbidden: readonly Span[]): number {
  const free = (x: number): boolean => forbidden.every(([from, to]) => x <= from || x >= to);
  return [wanted, ...forbidden.flat()]
    .filter((x) => Number.isFinite(x) && free(x))
    .reduce((best, x) => {
      const [near, nearest] = [Math.abs(x - wanted), Math.abs(best - wanted)];
      return near < nearest || (near === nearest && x < best) ? x : best;
    }, Number.POSITIVE_INFINITY);
}

/**
 * Stand the blocks apart. The biggest goes first and keeps the place the
 * forces wanted, and each after it takes the nearest place at which it is
 * clear of all of them: slid sideways, and up or down only as far as its
 * files' terraces let them go, so it may stand above or below a block, or
 * tucked in beside its slope, when the two keep to different terraces. Path
 * order breaks a tie in size, so the field is the same every time (C3). The
 * blocks a layout before this one stood go before every block it never saw,
 * so they keep the places they had, which were clear of each other then, and
 * the new ones find room round them (D97).
 */
export function standApart(blocks: readonly Block[]): readonly Placement[] {
  const sized = blocks.map((block) => {
    const outline = outlineOf(block.placements, SIBLING_GAP / 2 + (block.grows ? GROWTH_ROOM : 0));
    const xs = outline.map(([x]) => x);
    const ys = outline.map(([, y]) => y);
    return { block, outline, area: (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys)) };
  });
  const stood: Hull[] = [];
  return sized
    .toSorted((a, b) => Number(b.block.kept) - Number(a.block.kept) || b.area - a.area || byPath(a.block.key, b.block.key))
    .flatMap(({ block, outline }) => {
      if (block.placements.length === 0) return [];
      const centroid = block.placements.reduce((sum, placed) => sum + placed.x, 0) / block.placements.length;
      const wanted = block.wanted - centroid;
      const differences = stood.flatMap((other) => {
        const difference = differenceOf(outline, other, block.lift);
        return difference === undefined ? [] : [difference];
      });
      const [low, high] = block.lift;
      const rises = [0, ...Array.from({ length: Math.max(0, Math.floor((high - low) / TRY_STEP)) + 1 }, (_unused, step) => low + step * TRY_STEP)]
        .filter((dy) => dy >= low && dy <= high)
        .toSorted((a, b) => Math.abs(a) - Math.abs(b) || a - b);
      let best = { dx: wanted, dy: 0, cost: Number.POSITIVE_INFINITY };
      for (const dy of rises) {
        // A rise as far off as the best place found is already no nearer.
        if (Math.abs(dy) >= best.cost) break;
        const dx = nearestFree(wanted, differences.flatMap((difference) => blocked(difference, dy)));
        const cost = Math.hypot(dx - wanted, dy);
        if (cost < best.cost) best = { dx, dy, cost };
      }
      const { dx, dy } = best;
      stood.push(outline.map(([x, y]): Point => [x + dx, y + dy]));
      return block.placements.map((placed) => ({ ...placed, x: placed.x + dx, y: placed.y + dy }));
    });
}

/** A file on the field with the cell it belongs to. */
export type Held = Placement & { readonly cell: string };

/** An added file where the second pass wanted it, and the heights its terrace lets its centre take. */
type Wanted = Held & { readonly heights: readonly [number, number] };

type AddedInput = {
  /** The lane's terrain, pinned where it settled. */
  readonly terrain: readonly Held[];
  /** The change's added files. */
  readonly added: readonly Wanted[];
  /**
   * Every level of the lane a cell sits under, outermost first, as the cell
   * at that level and the part of it the cell is in: the held cell it lies
   * beneath, or `''` for the level's own files.
   */
  readonly levels: (cell: string) => readonly (readonly [string, string])[];
  /** The stretch of `x` the lane gives its added files. */
  readonly lane: Lane;
};

/** The places an added file is tried at: on a grid over the lane and its terrace, with where the forces wanted it, nearest that first. */
function placesFor(file: Wanted, lane: Lane): readonly Point[] {
  const across = (low: number, high: number): readonly number[] =>
    low > high ? [] : Array.from({ length: Math.floor((high - low) / TRY_STEP) + 1 }, (_unused, step) => low + step * TRY_STEP);
  const xs = [file.x, ...across(lane.x0 + file.r, lane.x1 - file.r)];
  const ys = [file.y, ...across(...file.heights)];
  const distance = ([x, y]: Point): number => Math.hypot(x - file.x, y - file.y);
  return xs.flatMap((x) => ys.map((y): Point => [x, y])).toSorted((a, b) => distance(a) - distance(b) || a[0] - b[0] || a[1] - b[1]);
}

/**
 * The way in: how a part's skin reaches a file it grows to hold, from the
 * nearest of the files it already holds, edge to edge, which is the way the
 * skin's routing joins a member to the rest (`membranes.ts`), or the file
 * alone when the part holds nothing yet.
 */
function bridgeOf(own: readonly Placement[], file: Placement): readonly Placement[] {
  const gap = (other: Placement): number => Math.hypot(other.x - file.x, other.y - file.y) - other.r;
  const nearest = own.reduce<Placement | undefined>((best, other) => (best === undefined || gap(other) < gap(best) ? other : best), undefined);
  return nearest === undefined ? [file] : [nearest, file];
}

/** An outline with its bounds, so two far apart are told apart without testing every side. */
type Shape = { readonly hull: Hull; readonly x0: number; readonly x1: number; readonly y0: number; readonly y1: number };

function shapeOf(hull: Hull): Shape {
  const xs = hull.map(([x]) => x);
  const ys = hull.map(([, y]) => y);
  return { hull, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

function clash(one: Shape, other: Shape): boolean {
  return one.x0 < other.x1 && other.x0 < one.x1 && one.y0 < other.y1 && other.y0 < one.y1 && overlaps(one.hull, other.hull);
}

/** A part of a level: the files it holds and their outline. */
type Part = { readonly held: readonly Placement[]; readonly shape: Shape };

/**
 * Place the change's added files, in path order, each at the place nearest
 * where the second pass wanted it, on its own terrace and inside the lane,
 * at which it sits on no file and the way every part that grows to hold it
 * reaches it stays clear of the other parts of its level. Failing that it
 * takes the nearest place it sits on no file at, beside its own rather than
 * across a sibling from them, which is the one way an added file can still
 * bring two skins together: the room a block keeps is spent, and the
 * terrain it would need moved is pinned (D32).
 */
export function placeAdded(input: AddedInput): readonly Placement[] {
  const parts = new Map<string, Map<string, Part>>();
  const hold = (file: Held): void => {
    for (const [at, part] of input.levels(file.cell)) {
      const level = parts.get(at) ?? new Map<string, Part>();
      const held = [...(level.get(part)?.held ?? []), file];
      level.set(part, { held, shape: shapeOf(outlineOf(held)) });
      parts.set(at, level);
    }
  };
  input.terrain.forEach(hold);

  const placed: Placement[] = [...input.terrain];
  return input.added
    .toSorted((a, b) => byPath(a.id, b.id))
    .map((file) => {
      const levels = input.levels(file.cell).map(([at, part]) => {
        const level = parts.get(at) ?? new Map<string, Part>();
        const others = [...level].flatMap(([other, { shape }]) => (other === part ? [] : [shape]));
        return { own: level.get(part)?.held ?? [], others };
      });
      const disc = ([x, y]: Point): Placement => ({ id: file.id, x, y, r: file.r });
      // Only a file within touching height of the terrace can be sat on.
      const [top, bottom] = file.heights;
      const near = placed.filter((other) => other.y + other.r + file.r + COLLIDE_PAD > top && other.y - other.r - file.r - COLLIDE_PAD < bottom);
      const free = (at: Placement): boolean => near.every((other) => Math.hypot(other.x - at.x, other.y - at.y) >= other.r + at.r + COLLIDE_PAD);
      // The way in holds the file's own disc, so a way in clear of the siblings is a file clear of them too.
      const reached = (at: Placement): boolean =>
        levels.every(({ own, others }) => {
          const bridge = shapeOf(outlineOf(bridgeOf(own, at)));
          return others.every((other) => !clash(bridge, other));
        });
      let fallback: Placement | undefined;
      let chosen: Placement | undefined;
      for (const place of placesFor(file, input.lane)) {
        const at = disc(place);
        if (!free(at)) continue;
        fallback ??= at;
        if (reached(at)) {
          chosen = at;
          break;
        }
      }
      const at = chosen ?? fallback ?? disc([file.x, file.y]);
      placed.push(at);
      hold({ ...at, cell: file.cell });
      return at;
    });
}
