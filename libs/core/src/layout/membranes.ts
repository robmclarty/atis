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
 * The field is a soft rule, and on a crowded terrace it bends: a skin can come
 * to rest over a neighbour's file. So every ring is checked once it is cut,
 * and a neighbour whose centre still lies under it is carved out, the skin
 * drawn in around the file in a bay that opens on the nearest way out. The
 * carve only ever takes area away, so it never puts anyone else under the
 * skin, and it never takes a member: a skin holds exactly its own (§5.1).
 *
 * Nothing here draws. A contour is a closed ring of points in the field's own
 * coordinates, stored once in `map.json` so every renderer traces the same
 * membrane (D24). How thick to draw it is the cell's `interface_size`, which
 * `membraneThickness` turns into a stroke width: a deep module is a big body
 * with a thin skin (§5.1).
 */

import { BubbleSets, circle } from 'bubblesets-js';
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

/**
 * The carve. A bay clears its neighbour's edge by this much, so the skin's
 * stroke does not lie over the file it was drawn around, and narrows by this
 * share each time it would take a member or cross the skin elsewhere, down to
 * this floor. It tries this many ways out, the nearest first, and draws each
 * rounded end in this many segments.
 */
const CARVE_PAD = 4;
const CARVE_SHRINK = 0.6;
const CARVE_MIN = 0.5;
const CARVE_WAYS = 16;
const CARVE_ARC = 8;
/** Longer than any field, so a ray this long from a point under a skin always leaves it. */
const RAY_LENGTH = 1e6;

const CELL_FIELDS = ladder(CELL_OPTIONS, 3);
const SHORE_FIELDS = ladder(SHORE_OPTIONS, 2);

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function round(value: number): number {
  return Math.round(value * PRECISION) / PRECISION;
}

/** The width a renderer draws a membrane at, from the cell's `interface_size` (§5.1). */
export function membraneThickness(interfaceSize: number): number {
  const scaled = THICKNESS_MIN + THICKNESS_SCALE * Math.sqrt(Math.max(interfaceSize, 0));
  return round(Math.min(scaled, THICKNESS_MAX));
}

/**
 * Whether a point lies inside a contour, by the even-odd rule over spans
 * that are open at the top: an edge counts when the point's height lies
 * between its ends, one end in and one out. Contours and positions share
 * two decimals, so a point is often level with a vertex, and at a vertex
 * where the ring only touches that height (a peak or a trough) both edges
 * or neither must count. The library's own test counts one there, and so
 * reads a point a long way outside the ring as in.
 */
export function withinContour(contour: Contour, x: number, y: number): boolean {
  return enclosed(contour, x, y);
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

/** Who a ring has wrong: the members it leaves out and the others it holds. */
type Tally = { readonly missing: number; readonly intruders: readonly Position[] };

/**
 * The check the library does not make: it loosens the field until every
 * member's centre is inside the ring, and says nothing about whose else is.
 * This asks the stored ring both questions, by `withinContour`'s rule.
 * Whatever lies outside the ring's box is outside the ring, which keeps the
 * question cheap on a big field.
 */
function tally(contour: Contour, members: readonly Position[], others: readonly Position[]): Tally {
  const xs = contour.map(([x]) => x);
  const ys = contour.map(([, y]) => y);
  const [left, right, top, bottom] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const inside = (at: Position): boolean =>
    at.x >= left && at.x <= right && at.y >= top && at.y <= bottom && enclosed(contour, at.x, at.y);
  return { missing: members.filter((at) => !inside(at)).length, intruders: others.filter(inside) };
}

type Point = readonly [number, number];

/** The ring once round, without the point that closes it. */
function openRing(contour: Contour): readonly Point[] {
  const first = contour[0];
  const last = contour.at(-1);
  const closed = contour.length > 1 && first !== undefined && last !== undefined && first[0] === last[0] && first[1] === last[1];
  return closed ? contour.slice(0, -1) : contour;
}

function lerp([ax, ay]: Point, [bx, by]: Point, share: number): Point {
  return [ax + (bx - ax) * share, ay + (by - ay) * share];
}

/** Where segment `ab` crosses segment `cd`: the share along each, half-open so a crossing at a shared vertex counts once. */
function crossing(a: Point, b: Point, c: Point, d: Point): readonly [number, number] | undefined {
  const [rx, ry] = [b[0] - a[0], b[1] - a[1]];
  const [sx, sy] = [d[0] - c[0], d[1] - c[1]];
  const denominator = rx * sy - ry * sx;
  if (denominator === 0) return undefined;
  const [qx, qy] = [c[0] - a[0], c[1] - a[1]];
  const along = (qx * sy - qy * sx) / denominator;
  const across = (qx * ry - qy * rx) / denominator;
  return along >= 0 && along < 1 && across >= 0 && across < 1 ? [along, across] : undefined;
}

/** Even-odd, the same rule `withinContour` reads a ring by. */
function enclosed(polygon: readonly Point[], x: number, y: number): boolean {
  let inside = false;
  polygon.forEach(([ax, ay], index) => {
    const [bx, by] = polygon[(index + 1) % polygon.length] ?? [ax, ay];
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside;
  });
  return inside;
}

/**
 * The shape a bay is cut with: a capsule round the neighbour's centre and
 * out along `way` to past the skin, its two rounded ends in `CARVE_ARC`
 * segments. It is convex, so the skin crosses it exactly twice when the bay
 * opens cleanly onto the outside.
 */
function capsule([px, py]: Point, way: Point, length: number, radius: number): readonly Point[] {
  const [dx, dy] = way;
  const [vx, vy] = [-dy, dx];
  const [tx, ty] = [px + dx * length, py + dy * length];
  const end = (cx: number, cy: number, ux: number, uy: number): readonly Point[] =>
    Array.from({ length: CARVE_ARC + 1 }, (_, step) => {
      const angle = (Math.PI * step) / CARVE_ARC;
      return [cx + radius * (Math.cos(angle) * vx * ux + Math.sin(angle) * dx * uy), cy + radius * (Math.cos(angle) * vy * ux + Math.sin(angle) * dy * uy)] as const;
    });
  return [...end(px, py, 1, -1), ...end(tx, ty, -1, 1)];
}

/** Where the skin crosses the hull: the skin's edge and the share along it, the place round the hull (edge plus share), and the point. */
type Hit = { readonly edge: number; readonly along: number; readonly side: number; readonly at: Point };

/** The hull's vertices strictly between two places round it, going forward or back. */
function hullBetween(hull: readonly Point[], from: number, to: number, step: 1 | -1): readonly Point[] {
  const size = hull.length;
  const [fromEdge, toEdge] = [Math.floor(from), Math.floor(to)];
  if (fromEdge === toEdge && (step === 1 ? from < to : from > to)) return [];
  const [start, stop] = step === 1 ? [fromEdge + 1, toEdge] : [fromEdge, toEdge + 1];
  const points: Point[] = [];
  for (let index = start, guard = 0; guard <= size; index += step, guard += 1) {
    const at = ((index % size) + size) % size;
    points.push(hull[at] ?? [0, 0]);
    if (at === ((stop % size) + size) % size) break;
  }
  return points;
}

/**
 * One bay: the skin minus the capsule, when the skin crosses the capsule
 * exactly twice and no member stands in it. The ring keeps everything
 * outside the capsule and is closed across it along the capsule's own edge,
 * the part of it that lay under the skin. Anything else (a member in the
 * way, or the skin folding back across the capsule) is no bay this time.
 */
function bay(ring: readonly Point[], hull: readonly Point[], members: readonly Position[]): readonly Point[] | undefined {
  const xs = hull.map(([x]) => x);
  const ys = hull.map(([, y]) => y);
  const [left, right, top, bottom] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const near = (x: number, y: number): boolean => x >= left && x <= right && y >= top && y <= bottom;
  if (members.some((member) => near(member.x, member.y) && enclosed(hull, member.x, member.y))) return undefined;
  const hits: Hit[] = [];
  ring.forEach((a, edge) => {
    const b = ring[(edge + 1) % ring.length] ?? a;
    // An edge wholly to one side of the hull's box cannot cross it.
    if (Math.max(a[0], b[0]) < left || Math.min(a[0], b[0]) > right || Math.max(a[1], b[1]) < top || Math.min(a[1], b[1]) > bottom) return;
    hull.forEach((c, side) => {
      const hit = crossing(a, b, c, hull[(side + 1) % hull.length] ?? c);
      if (hit !== undefined) hits.push({ edge, along: hit[0], side: side + hit[1], at: lerp(a, b, hit[0]) });
    });
  });
  const [first, second] = hits.toSorted((a, b) => a.edge + a.along - (b.edge + b.along));
  if (hits.length !== 2 || first === undefined || second === undefined) return undefined;
  // Which crossing takes the skin into the hull: the stretch just after the first is either inside it or not.
  const next = first.edge === second.edge ? second.at : (ring[(first.edge + 1) % ring.length] ?? second.at);
  const [probeX, probeY] = lerp(first.at, next, 0.5);
  const [enter, leave] = enclosed(hull, probeX, probeY) ? [first, second] : [second, first];

  const kept: Point[] = [leave.at];
  if (!(leave.edge === enter.edge && leave.along < enter.along)) {
    for (let index = leave.edge + 1, guard = 0; guard < ring.length; index += 1, guard += 1) {
      const at = index % ring.length;
      kept.push(ring[at] ?? [0, 0]);
      if (at === enter.edge) break;
    }
  }
  kept.push(enter.at);
  // The two crossings split the hull in two, one part under the old skin and one outside it; the bay is drawn along the part under it.
  const forward = hullBetween(hull, enter.side, leave.side, 1);
  const probe = forward[Math.floor(forward.length / 2)] ?? lerp(enter.at, leave.at, 0.5);
  return [...kept, ...(enclosed(ring, probe[0], probe[1]) ? forward : hullBetween(hull, enter.side, leave.side, -1))];
}

/** The ways out of a ring from a point under it: the nearest point of the skin first, then rays round the compass, each with how far it runs before it leaves. */
function waysOut(ring: readonly Point[], [px, py]: Point): readonly { readonly way: Point; readonly reach: number }[] {
  const nearest = ring.reduce<{ readonly at: Point; readonly distance: number } | undefined>((best, a, index) => {
    const b = ring[(index + 1) % ring.length] ?? a;
    const span = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2;
    const share = span === 0 ? 0 : Math.max(0, Math.min(1, ((px - a[0]) * (b[0] - a[0]) + (py - a[1]) * (b[1] - a[1])) / span));
    const at = lerp(a, b, share);
    const distance = Math.hypot(at[0] - px, at[1] - py);
    return best === undefined || distance < best.distance ? { at, distance } : best;
  }, undefined);
  const toward =
    nearest === undefined || nearest.distance === 0
      ? []
      : [{ way: [(nearest.at[0] - px) / nearest.distance, (nearest.at[1] - py) / nearest.distance] as const, reach: nearest.distance }];
  const rays = Array.from({ length: CARVE_WAYS }, (_, index) => {
    const angle = (2 * Math.PI * index) / CARVE_WAYS;
    const way: Point = [Math.cos(angle), Math.sin(angle)];
    const far: Point = [px + way[0] * RAY_LENGTH, py + way[1] * RAY_LENGTH];
    const reach = ring.reduce((closest, a, edge) => {
      const hit = crossing([px, py], far, a, ring[(edge + 1) % ring.length] ?? a);
      return hit === undefined ? closest : Math.min(closest, hit[0] * RAY_LENGTH);
    }, Number.POSITIVE_INFINITY);
    return { way, reach };
  });
  return [...toward, ...rays.filter((ray) => Number.isFinite(ray.reach)).toSorted((a, b) => a.reach - b.reach)];
}

/**
 * Draw the skin in around one neighbour whose centre it holds: the widest
 * bay that clears the file, down the nearest way out that opens cleanly,
 * narrowing until one does. A neighbour no bay can free is left where it
 * is, and the ring with it.
 */
function carveOne(ring: readonly Point[], intruder: Position, members: readonly Position[]): readonly Point[] {
  const centre: Point = [intruder.x, intruder.y];
  for (const { way, reach } of waysOut(ring, centre)) {
    for (let radius = intruder.r + CARVE_PAD; radius >= CARVE_MIN; radius *= CARVE_SHRINK) {
      const carved = bay(ring, capsule(centre, way, reach + radius + 1, radius), members);
      if (carved !== undefined && !enclosed(carved, intruder.x, intruder.y)) return carved;
    }
  }
  return ring;
}

/** Every neighbour still under the skin carved out in path order, the ring rounded and closed again. */
function carve(contour: Contour, members: readonly Position[], others: readonly Position[]): Contour {
  let ring = openRing(contour);
  for (const intruder of others) {
    if (enclosed(ring, intruder.x, intruder.y)) ring = carveOne(ring, intruder, members);
  }
  const rounded = ring.map(([x, y]) => [round(x), round(y)] as const);
  const [start] = rounded;
  return start === undefined ? contour : [...rounded, start];
}

/**
 * The membrane around a set of ids, cut with the first field on the ladder
 * that holds every member and no one else. When no field does, the cut that
 * leaves out the fewest members, then holds the fewest others, is carved
 * until it holds no one else: a skin with a neighbour's file under it would
 * draw that file as the cell's, and a missing one would say the cell has no
 * membrane, which is not true either (C2). Members are raised in path order
 * so the field is the same every time (C3). Ids with no position are neither
 * members nor obstacles: a file the layout did not place is not on the field
 * at all.
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

  let best: { readonly contour: Contour; readonly tally: Tally } | undefined;
  for (const field of fields) {
    const contour = cut(members, others, field);
    if (contour === undefined) continue;
    const found = tally(contour, members, others);
    if (found.missing === 0 && found.intruders.length === 0) return contour;
    const better =
      best === undefined ||
      found.missing < best.tally.missing ||
      (found.missing === best.tally.missing && found.intruders.length < best.tally.intruders.length);
    if (better) best = { contour, tally: found };
  }
  return best === undefined ? undefined : carve(best.contour, members, best.tally.intruders);
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
