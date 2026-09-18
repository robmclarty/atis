/**
 * membranes: the crease line around each cell (§5.1, D13).
 *
 * A cell is drawn as a Bubble Set: the isocontour of an energy field that the
 * cell's own organelles raise and every other organelle lowers, cut over the
 * layout rather than by it. A cell whose files stand on two terraces is drawn
 * stretched across both, and that stretch is the information, a module doing
 * work at two depths. A package cell wraps every cell inside it, so leaving
 * the package through its barrel costs the same one hop as leaving a folder
 * (D45). The shore gets the same treatment at a smaller scale: one contour
 * per group with a mark on the field, so the strip reads as blocks.
 *
 * Nothing here draws. A contour is a closed ring of points in the field's own
 * coordinates, stored once in `map.json` so every renderer traces the same
 * membrane (D24). How thick to draw it is the cell's `interface_size`, which
 * `membraneThickness` turns into a stroke width: a deep module is a big body
 * with a thin skin (§5.1).
 */

import { BubbleSets, PointPath, boundingBox, circle } from 'bubblesets-js';
import type { IBubbleSetOptions } from 'bubblesets-js';

import type { Cell, Group, Position } from '../schema.js';

/** A closed ring of `[x, y]` points; the last point returns to the first. */
export type Contour = readonly (readonly [number, number])[];

/** What a membrane needs to know about a cell: who it holds, and who holds it. */
export type MembraneCell = Pick<Cell, 'id' | 'parent' | 'organelles'>;

export type MembraneInput = {
  readonly cells: readonly MembraneCell[];
  /** The shore, whose test files have no position and so no membrane (D4). */
  readonly groups: readonly Group[];
  /** Every placed organelle and shore mark; whatever has no position has no membrane. */
  readonly positions: Readonly<Record<string, Position>>;
};

/** How a skin is cut: the energy field, and how far the ring may be thinned before it is smoothed. */
type Field = { readonly options: IBubbleSetOptions; readonly tolerance: number };

/**
 * The field a cell's membrane is cut from. Energy is full within `nodeR0` of
 * an organelle's edge and gone at `nodeR1`, so the membrane rests about
 * `nodeR0` outside the organelles and two of them join under one skin when
 * they stand within `nodeR1` of each other; farther apart than that, a
 * routed virtual edge joins them, bending around any other cell's organelle
 * in the way. The non-member factor is the push those organelles give back,
 * which is what keeps a neighbour's file outside the skin rather than under
 * it. The resolution is the marching grid in pixels.
 */
const CELL_OPTIONS: IBubbleSetOptions = {
  pixelGroup: 4,
  nodeR0: 15,
  nodeR1: 50,
  edgeR0: 10,
  edgeR1: 20,
  morphBuffer: 10,
  nonMemberInfluenceFactor: -0.8,
};

/** The shore's marks are small and close, so their skin is tighter and cut finer. */
const SHORE_OPTIONS: IBubbleSetOptions = {
  pixelGroup: 2,
  nodeR0: 6,
  nodeR1: 20,
  edgeR0: 5,
  edgeR1: 10,
  morphBuffer: 6,
  nonMemberInfluenceFactor: -0.8,
};

/**
 * The push a second cut gives neighbours when the first left one under the
 * skin, which happens on a terrace packed tighter than the routing can bend
 * around. Pushing this hard every time would instead drop a cell's own file
 * out of a crowded skin, so it is the second cut and never the first, and
 * it is kept only when the check below says it worked.
 */
const HARDER_PUSH = -1.5;

/**
 * The ring the marching squares return is one point per grid step, which is
 * many more than the shape needs. It is thinned to what stays within the
 * field's tolerance of a straight line, then smoothed into a B-spline sampled
 * this many times per control point, which is the curve the renderer draws.
 * The tolerance is per field: the shore's margin is a third of a cell's, so
 * the same thinning that is invisible on a cell would pull a shore mark out.
 */
const SPLINE_GRANULARITY = 3;

/** Two decimals, the layout's own precision, so a contour reads like its positions. */
const PRECISION = 100;

/**
 * Stroke widths for the skin: floored so a one-export interface still reads
 * as a line, growing with the square root of the interface so a barrel that
 * exports everything reads as thick rather than as a wall.
 */
const THICKNESS_MIN = 1.5;
const THICKNESS_MAX = 6;
const THICKNESS_SCALE = 0.5;

function ladder(options: IBubbleSetOptions, tolerance: number): readonly Field[] {
  return [
    { options, tolerance },
    { options: { ...options, nonMemberInfluenceFactor: HARDER_PUSH }, tolerance },
  ];
}

const CELL_FIELDS = ladder(CELL_OPTIONS, 3);
const SHORE_FIELDS = ladder(SHORE_OPTIONS, 2);

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function round(value: number): number {
  return Math.round(value * PRECISION) / PRECISION;
}

function ringOf(contour: Contour): PointPath {
  return new PointPath(contour.map(([x, y]) => ({ x, y })));
}

/** The width a renderer draws a membrane at, from the cell's `interface_size` (§5.1). */
export function membraneThickness(interfaceSize: number): number {
  const scaled = THICKNESS_MIN + THICKNESS_SCALE * Math.sqrt(Math.max(interfaceSize, 0));
  return round(Math.min(scaled, THICKNESS_MAX));
}

/** Whether a point lies inside a contour: the same ray test the contour was checked with. */
export function withinContour(contour: Contour, x: number, y: number): boolean {
  return ringOf(contour).withinArea(x, y);
}

/**
 * Each cell with every cell beneath it, so a package's members are its
 * barrel and everything its folders hold (D45). A cell's `parent` names the
 * package it sits in, and only packages hold cells, so the tree is shallow;
 * the walk does not assume it.
 */
function subtreeOf(cells: readonly MembraneCell[]): ReadonlyMap<string, readonly MembraneCell[]> {
  const children = new Map<string, MembraneCell[]>();
  for (const cell of cells) {
    if (cell.parent === undefined) continue;
    children.set(cell.parent, [...(children.get(cell.parent) ?? []), cell]);
  }
  return new Map(
    cells.map((cell) => {
      const below: MembraneCell[] = [];
      const stack = [cell];
      for (let next = stack.pop(); next !== undefined; next = stack.pop()) {
        below.push(next);
        stack.push(...(children.get(next.id) ?? []));
      }
      return [cell.id, below] as const;
    }),
  );
}

/**
 * Cut one ring: the members raise the field, everything else placed on it
 * pushes back, and the ring the marching squares find is thinned and
 * smoothed into the curve the renderer draws, at the layout's precision. A
 * set the field cannot enclose even after the library has loosened it yields
 * no ring.
 */
function cut(members: readonly Position[], others: readonly Position[], field: Field): Contour | undefined {
  const set = new BubbleSets(field.options);
  set.pushMember(...members.map((placed) => circle(placed.x, placed.y, placed.r)));
  set.pushNonMember(...others.map((placed) => circle(placed.x, placed.y, placed.r)));
  const ring = set.compute();
  if (ring.length === 0) return undefined;
  const curve = ring.simplify(field.tolerance).bSplines(SPLINE_GRANULARITY);
  return curve.points.map((point) => [round(point.x), round(point.y)] as const);
}

/**
 * The check the library does not make: it loosens the field until every
 * member's centre is inside the ring, and says nothing about whose else is.
 * This asks the stored ring both questions. Whatever lies outside the ring's
 * box is outside the ring, which keeps the question cheap on a big field.
 */
function holds(contour: Contour, members: readonly Position[], others: readonly Position[]): boolean {
  const ring = ringOf(contour);
  const box = boundingBox(ring.points);
  if (box === null) return false;
  const inside = (at: Position): boolean => box.containsPt(at.x, at.y) && ring.withinArea(at.x, at.y);
  return members.every(inside) && !others.some(inside);
}

/**
 * The membrane around a set of ids, cut with the first field on the ladder
 * that holds every member and no one else. When no field does, the first
 * cut stands: a skin with a neighbour's file under it is still the cell's
 * skin, and a missing one would say the cell has no membrane, which is not
 * true (C2). Members are raised in path order so the field is the same every
 * time (C3). Ids with no position are neither members nor obstacles: a file
 * the layout did not place is not on the field at all.
 */
function membraneOf(
  ids: readonly string[],
  positions: Readonly<Record<string, Position>>,
  fields: readonly Field[],
): Contour | undefined {
  const inside = new Set(ids);
  const placed = Object.entries(positions).toSorted(([a], [b]) => byPath(a, b));
  const members = placed.flatMap(([id, at]) => (inside.has(id) ? [at] : []));
  if (members.length === 0) return undefined;
  const others = placed.flatMap(([id, at]) => (inside.has(id) ? [] : [at]));

  let first: Contour | undefined;
  for (const field of fields) {
    const contour = cut(members, others, field);
    if (contour === undefined) continue;
    if (holds(contour, members, others)) return contour;
    first ??= contour;
  }
  return first;
}

/**
 * One contour per cell and per shore group that has a mark on the field,
 * keyed by the cell's or the group's id (a cell id carries its kind, so the
 * two never collide), keys in path order (C3). Every organelle and mark that
 * is not a member is an obstacle the skin routes around, which is what keeps
 * a neighbour's file outside it; a package's skin holds every organelle of
 * every cell beneath it (D45).
 */
export function computeMembranes(input: MembraneInput): Readonly<Record<string, Contour>> {
  const subtree = subtreeOf(input.cells);
  const drawn: (readonly [string, Contour])[] = [];

  for (const cell of input.cells) {
    const ids = (subtree.get(cell.id) ?? [cell]).flatMap((held) => held.organelles);
    const contour = membraneOf(ids, input.positions, CELL_FIELDS);
    if (contour !== undefined) drawn.push([cell.id, contour]);
  }
  for (const group of input.groups) {
    const contour = membraneOf(group.files, input.positions, SHORE_FIELDS);
    if (contour !== undefined) drawn.push([group.id, contour]);
  }

  return Object.fromEntries(drawn.toSorted(([a], [b]) => byPath(a, b)));
}
