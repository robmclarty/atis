/**
 * drift: inside an opened cell, each file floats about its place by how
 * loosely it is held there (D157), slowly and on the screen's scale (D165).
 * Its looseness is the share of its import ties that leave the cell, counted
 * both ways on the head graph between terrain files: a hub held by many
 * cellmates sits still near the middle, and a file that works with none of
 * them wanders furthest. Drift means looseness, as C11 names it.
 *
 * A file alone in its cell, a deleted file, and a file the map gives no
 * `ties` stay still (C2). So does every file under reduced motion (C12), and
 * in the SVG, which never draws it.
 *
 * The float is stepped, `DRIFT_STEP_MS` at a time whatever the frame rate,
 * from rest or from wherever the surface last drew the cell's files, so one
 * seed, one start and one run of screens give one frame (D94, C3). Each step
 * every loose file heads for its wander: two slow sines about its place,
 * eased in as the cell opens, reaching `DRIFT_REACH` of the cell's radius
 * times its looseness. It is then pushed off its neighbours, the looser giving
 * way more, and off the membrane and the cells its cell holds, never nearer
 * them than it rests. No step moves a file more than `DRIFT_SPEED` of the
 * screen a second, and the wander's clock slows as the view zooms in so that
 * it keeps to that; a step that would take a file out of its membrane, or into
 * a cell its cell holds, leaves it where it was. So no file crosses its
 * membrane or jumps, at any zoom.
 */

import type { MapJson, Organelle } from 'core';

import { dentedRing } from './membranes.js';
import { openRing } from './raster.js';
import type { Ring } from './raster.js';
import { draw, seedOf } from './shape.js';
import { DRIFT_EASE_MS, DRIFT_GAP, DRIFT_HZ_MAX, DRIFT_HZ_MIN, DRIFT_REACH, DRIFT_SPEED } from './tokens.js';

/**
 * The drift's tokens as one object, so a registry can hand in live values and
 * a change shows on the next frame (D156); `DRIFT_TOKENS` is where they rest,
 * at `tokens.ts`'s values. The drift reads each at the moment it needs it.
 */
export type DriftTokens = {
  readonly DRIFT_HZ_MIN: number;
  readonly DRIFT_HZ_MAX: number;
  readonly DRIFT_REACH: number;
  readonly DRIFT_SPEED: number;
  readonly DRIFT_GAP: number;
  readonly DRIFT_EASE_MS: number;
};
export const DRIFT_TOKENS: DriftTokens = { DRIFT_HZ_MIN, DRIFT_HZ_MAX, DRIFT_REACH, DRIFT_SPEED, DRIFT_GAP, DRIFT_EASE_MS };

/** How long one step of the float is: sixty a second, whatever the frame rate. */
export const DRIFT_STEP_MS = 1000 / 60;

/** A file of the opened cell where the drift has it, and how loose it is; `undefined` for a file that stays still. */
export type Drifted = { readonly id: string; readonly x: number; readonly y: number; readonly r: number; readonly looseness: number | undefined };

/**
 * A cell's float: the milliseconds since the cell opened, the wander's own
 * clock, which runs slower than they do while the view is zoomed in close, and
 * each placed file of the cell where it stands, in path order.
 */
export type Float = { readonly cell: string; readonly t: number; readonly wander: number; readonly files: readonly Drifted[] };

/** What a step reads: the seed, how many layout units the free screen's shorter side spans at the camera's zoom, reduced motion, and the tokens, resting when left out. */
export type DriftAt = { readonly seed: number; readonly screen: number; readonly reduced?: boolean; readonly tokens?: DriftTokens };

/** How many rounds of pushing apart and pushing off the membrane a step takes. */
const ROUNDS = 2;
/** How far inside its bound a file may sit and still be read as inside it: rounding, not room. */
const EPSILON = 1e-6;

/**
 * A file's looseness, 0 to 1: the share of its ties that leave its cell, and 1
 * for a file with none. A file the map gives no ties has none (C2).
 */
export function loosenessOf(organelle: Organelle): number | undefined {
  const ties = organelle.ties;
  if (ties === undefined) return undefined;
  const total = ties.inside + ties.outside;
  return total === 0 ? 1 : ties.outside / total;
}

/** A file as the float reads it: where it rests, how freely it moves, and how far it rests from the membrane and from each cell its cell holds. */
type Resting = {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly looseness: number | undefined;
  readonly mobility: number;
  readonly toRing: number;
  readonly toHoles: readonly number[];
};

/** A ring's edges, four numbers each: where the edge starts and where it ends. */
type Edges = Float64Array;

/**
 * A cell's float laid once: its membrane as the slide draws it and the skins
 * of the cells it holds, as edges; its radius; and its files. None for a cell
 * whose files all stay still.
 */
type Laid = { readonly ring: Edges; readonly holes: readonly Edges[]; readonly radius: number; readonly files: readonly Resting[]; near?: Near };

/** Each file's edges near enough its place to matter for a reach: the membrane's and each held cell's, by index. */
type Near = { readonly reach: number; readonly ring: readonly Int32Array[]; readonly holes: readonly (readonly Int32Array[])[] };

function edgesOf(ring: Ring): Edges {
  const edges = new Float64Array(ring.length * 4);
  ring.forEach(([ax, ay], index) => {
    const [bx, by] = ring[(index + 1) % ring.length] ?? [ax, ay];
    edges.set([ax, ay, bx, by], index * 4);
  });
  return edges;
}

/** The nearest point to `(x, y)` on one edge, and the square of the distance to it. */
function onEdge(edges: Edges, k: number, x: number, y: number): readonly [number, number, number] {
  const ax = edges[k * 4] ?? 0;
  const ay = edges[k * 4 + 1] ?? 0;
  const dx = (edges[k * 4 + 2] ?? 0) - ax;
  const dy = (edges[k * 4 + 3] ?? 0) - ay;
  const length2 = dx * dx + dy * dy;
  const t = length2 === 0 ? 0 : Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / length2));
  const px = ax + t * dx;
  const py = ay + t * dy;
  return [px, py, (x - px) ** 2 + (y - py) ** 2];
}

/** The nearest point to `(x, y)` among some edges, every edge when none are listed, and the distance to it. */
function nearestAmong(edges: Edges, list: Int32Array | undefined, x: number, y: number): readonly [number, number, number] {
  let best: readonly [number, number, number] = [x, y, Number.POSITIVE_INFINITY];
  const count = list === undefined ? edges.length / 4 : list.length;
  for (let i = 0; i < count; i += 1) {
    const found = onEdge(edges, list === undefined ? i : (list[i] ?? 0), x, y);
    if (found[2] < best[2]) best = found;
  }
  return [best[0], best[1], Math.sqrt(best[2])];
}

/** Whether `(x, y)` lies inside a ring's edges, by the even-odd rule. */
function insideEdges(edges: Edges, x: number, y: number): boolean {
  let inside = false;
  for (let k = 0; k < edges.length / 4; k += 1) {
    const ax = edges[k * 4] ?? 0;
    const ay = edges[k * 4 + 1] ?? 0;
    const bx = edges[k * 4 + 2] ?? 0;
    const by = edges[k * 4 + 3] ?? 0;
    if (ay > y !== by > y && x < ax + ((y - ay) / (by - ay)) * (bx - ax)) inside = !inside;
  }
  return inside;
}

/** Which side of the line through `a` and `b` a point lies on: positive, negative, or 0 on it. */
function side(ax: number, ay: number, bx: number, by: number, px: number, py: number): number {
  return Math.sign((bx - ax) * (py - ay) - (by - ay) * (px - ax));
}

/** How many of the listed edges a move from `(x0, y0)` to `(x1, y1)` crosses or touches. */
function crossings(edges: Edges, list: Int32Array, x0: number, y0: number, x1: number, y1: number): number {
  let count = 0;
  for (const k of list) {
    const ax = edges[k * 4] ?? 0;
    const ay = edges[k * 4 + 1] ?? 0;
    const bx = edges[k * 4 + 2] ?? 0;
    const by = edges[k * 4 + 3] ?? 0;
    if (side(ax, ay, bx, by, x0, y0) * side(ax, ay, bx, by, x1, y1) <= 0 && side(x0, y0, x1, y1, ax, ay) * side(x0, y0, x1, y1, bx, by) <= 0) count += 1;
  }
  return count;
}

function byPath(a: { readonly id: string }, b: { readonly id: string }): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Each cell's float as laid, per map, so a frame steps it without laying it again. */
const LAID = new WeakMap<MapJson, Map<string, Laid | undefined>>();

/** The placed files of `cell`, in path order. */
function placedIn(map: MapJson, cell: string): readonly Organelle[] {
  const positions = map.terrain.layout?.positions ?? {};
  return map.terrain.organelles.filter((organelle) => organelle.cell === cell && positions[organelle.id] !== undefined).toSorted(byPath);
}

/**
 * A cell's float laid: none for a cell with fewer than two placed files or no
 * skin, whose files all stay still. A file the layout rests outside its
 * membrane, or inside a cell its cell holds, stays still too.
 */
function laidOf(map: MapJson, cell: string): Laid | undefined {
  const cached = LAID.get(map) ?? new Map<string, Laid | undefined>();
  LAID.set(map, cached);
  if (cached.has(cell)) return cached.get(cell);
  const contours = map.terrain.layout?.contours ?? {};
  const contour = contours[cell];
  const found = map.terrain.cells.find((each) => each.id === cell);
  const organelles = placedIn(map, cell);
  let laid: Laid | undefined;
  if (found !== undefined && contour !== undefined && contour.length >= 3 && organelles.length >= 2) {
    const outline = openRing(dentedRing(contour, found.dents.length));
    const ring = edgesOf(outline);
    const holes = map.terrain.cells
      .filter((each) => each.parent === cell)
      .toSorted(byPath)
      .flatMap((each) => {
        const held = contours[each.id];
        return held === undefined || held.length < 3 ? [] : [edgesOf(openRing(dentedRing(held, each.dents.length)))];
      });
    const cx = outline.reduce((total, [x]) => total + x, 0) / outline.length;
    const cy = outline.reduce((total, [, y]) => total + y, 0) / outline.length;
    const radius = Math.max(...outline.map(([x, y]) => Math.hypot(x - cx, y - cy)));
    const positions = map.terrain.layout?.positions ?? {};
    const files = organelles.map((organelle): Resting => {
      const at = positions[organelle.id] ?? { x: 0, y: 0, r: 0 };
      const looseness = loosenessOf(organelle);
      const placed = insideEdges(ring, at.x, at.y) && holes.every((hole) => !insideEdges(hole, at.x, at.y));
      return {
        id: organelle.id,
        x: at.x,
        y: at.y,
        r: at.r,
        looseness,
        mobility: placed ? (looseness ?? 0) : 0,
        toRing: nearestAmong(ring, undefined, at.x, at.y)[2],
        toHoles: holes.map((hole) => nearestAmong(hole, undefined, at.x, at.y)[2]),
      };
    });
    laid = { ring, holes, radius, files };
  }
  cached.set(cell, laid);
  return laid;
}

/**
 * How far a file may travel from its place, in reaches of its wander: twice,
 * so a push may carry it past its wander but never far. For a file within
 * that of its place, the nearest point of a ring lies within the file's
 * resting distance from the ring plus twice its travel, and any edge its step
 * crosses within its travel, so those edges are the only ones it reads.
 */
const TRAVEL = 2;

/** The edges near each file of a laid cell for a reach, laid again only when the reach moves. */
function nearOf(laid: Laid, reach: number): Near {
  if (laid.near?.reach === reach) return laid.near;
  const listed = (edges: Edges, file: Resting, rests: number): Int32Array => {
    const within = rests + 2 * TRAVEL * reach + EPSILON;
    const list: number[] = [];
    for (let k = 0; k < edges.length / 4; k += 1) if (onEdge(edges, k, file.x, file.y)[2] <= within * within) list.push(k);
    return Int32Array.from(list);
  };
  const near: Near = {
    reach,
    ring: laid.files.map((file) => listed(laid.ring, file, file.toRing)),
    holes: laid.holes.map((hole, h) => laid.files.map((file) => listed(hole, file, file.toHoles[h] ?? 0))),
  };
  laid.near = near;
  return near;
}

/** The float of `cell` at rest as it opens: every placed file where the layout put it. */
export function startFloat(map: MapJson, cell: string): Float {
  const laid = laidOf(map, cell);
  const positions = map.terrain.layout?.positions ?? {};
  const files = placedIn(map, cell).map((organelle): Drifted => {
    const at = positions[organelle.id] ?? { x: 0, y: 0, r: 0 };
    return { id: organelle.id, x: at.x, y: at.y, r: at.r, looseness: laid === undefined ? undefined : loosenessOf(organelle) };
  });
  return { cell, t: 0, wander: 0, files };
}

/**
 * A float eased toward home: each file `share` of the way from where it
 * floated back to where the layout put it, 0 leaving it where it floated and 1
 * bringing it home. Its clocks keep where they stood, so a cell opened again
 * floats on from here.
 */
export function homeFloat(map: MapJson, float: Float, share: number): Float {
  const home = Math.min(1, Math.max(0, share));
  if (home === 0) return float;
  const positions = map.terrain.layout?.positions ?? {};
  return {
    ...float,
    files: float.files.map((file) => {
      const rest = positions[file.id] ?? file;
      return { ...file, x: file.x + (rest.x - file.x) * home, y: file.y + (rest.y - file.y) * home };
    }),
  };
}

/** The clearance a file keeps from a ring it rests this far from: its radius and the gap, or less where it rests nearer. */
function keepOf(file: Resting, rests: number, gap: number): number {
  return Math.min(rests, file.r + gap);
}

function smooth(value: number): number {
  const v = Math.min(1, Math.max(0, value));
  return v * v * (3 - 2 * v);
}

/**
 * The float stepped on to `t` milliseconds since its cell opened, a whole
 * number of steps at a time, at the screen it is handed. A cell whose files
 * all stay still, and reduced motion, leave every file where the layout put
 * it. The tokens it is timed from rest at `tokens.ts`'s values when none are
 * handed in (D156).
 */
export function stepFloat(map: MapJson, float: Float, t: number, at: DriftAt): Float {
  const tokens = at.tokens ?? DRIFT_TOKENS;
  // Counted in whole steps, so a float stepped frame by frame lands on the same time as one stepped in one go.
  const done = Math.round(float.t / DRIFT_STEP_MS);
  const steps = Math.max(0, Math.floor(t / DRIFT_STEP_MS + EPSILON) - done);
  if (steps === 0) return float;
  const laid = laidOf(map, float.cell);
  const advanced = (done + steps) * DRIFT_STEP_MS;
  if (laid === undefined || at.reduced === true || float.files.length !== laid.files.length) return { ...startFloat(map, float.cell), t: advanced, wander: float.wander };

  const files = laid.files;
  const xs = float.files.map((file) => file.x);
  const ys = float.files.map((file) => file.y);
  const gap = tokens.DRIFT_GAP;
  // The most a step moves a file, the wander's reach, and how far a file may travel from its place, in layout units.
  const speed = (tokens.DRIFT_SPEED * at.screen * DRIFT_STEP_MS) / 1000;
  const reach = tokens.DRIFT_REACH * laid.radius;
  const travel = TRAVEL * reach;
  const near = nearOf(laid, reach);
  // The wander at its rates moves a file at most its reach times pi times the faster rate, a second; zoomed in, its clock slows to keep to the speed on the screen.
  const fastest = reach * Math.PI * tokens.DRIFT_HZ_MAX;
  const pace = fastest <= 0 ? 1 : Math.min(1, (tokens.DRIFT_SPEED * at.screen) / fastest);
  const wanders = files.map((file) => {
    const own = (seedOf(file.id) ^ Math.imul(at.seed >>> 0, 0x9e_37_79_b9)) >>> 0;
    const rate = (i: number): number => tokens.DRIFT_HZ_MIN + draw(own, i) * (tokens.DRIFT_HZ_MAX - tokens.DRIFT_HZ_MIN);
    return { fx: rate(0), fy: rate(1), px: draw(own, 2) * 2 * Math.PI, py: draw(own, 3) * 2 * Math.PI };
  });

  /** Hold a file within its travel of its place. */
  const tether = (file: Resting, i: number): void => {
    const dx = (xs[i] ?? file.x) - file.x;
    const dy = (ys[i] ?? file.y) - file.y;
    const away = Math.hypot(dx, dy);
    if (away <= travel) return;
    xs[i] = file.x + (dx * travel) / away;
    ys[i] = file.y + (dy * travel) / away;
  };

  /** Bring a file back to `keep` from a ring on the side it began the step on, along the line through the ring's nearest point; on the ring itself it is left for the step's last check. */
  const keepOff = (edges: Edges, list: Int32Array, i: number, x0: number, y0: number, keep: number): void => {
    const x = xs[i] ?? x0;
    const y = ys[i] ?? y0;
    const [qx, qy, distance] = nearestAmong(edges, list, x, y);
    const right = crossings(edges, list, x0, y0, x, y) % 2 === 0;
    if ((right && distance >= keep) || distance === 0 || !Number.isFinite(distance)) return;
    const toward = right ? 1 : -1;
    xs[i] = qx + ((x - qx) / distance) * toward * keep;
    ys[i] = qy + ((y - qy) / distance) * toward * keep;
  };

  /** Whether a step from `(x0, y0)` to `(x, y)` crosses no ring and ends by at least the clearance the file rests at; a file too near none of them to tell is so. */
  const fits = (file: Resting, i: number, x0: number, y0: number, x: number, y: number): boolean => {
    const moved = Math.hypot(x - file.x, y - file.y);
    const keep = keepOf(file, file.toRing, gap);
    const ring = near.ring[i] ?? new Int32Array();
    if (moved > file.toRing - keep && (crossings(laid.ring, ring, x0, y0, x, y) > 0 || nearestAmong(laid.ring, ring, x, y)[2] < keep - EPSILON)) return false;
    return laid.holes.every((hole, h) => {
      const rests = file.toHoles[h] ?? Number.POSITIVE_INFINITY;
      const keepHole = keepOf(file, rests, gap);
      const list = near.holes[h]?.[i] ?? new Int32Array();
      return moved <= rests - keepHole || (crossings(hole, list, x0, y0, x, y) === 0 && nearestAmong(hole, list, x, y)[2] >= keepHole - EPSILON);
    });
  };

  let wander = float.wander;
  for (let step = 1; step <= steps; step += 1) {
    wander += DRIFT_STEP_MS * pace;
    const ease = smooth(((done + step) * DRIFT_STEP_MS) / tokens.DRIFT_EASE_MS);
    const seconds = wander / 1000;
    const fromX = [...xs];
    const fromY = [...ys];
    // Each loose file heads for its wander: two sines about its place, from its place, inside the unit disc.
    files.forEach((file, i) => {
      const own = wanders[i];
      if (file.mobility <= 0 || own === undefined) return;
      const ux = (Math.sin(2 * Math.PI * own.fx * seconds + own.px) - Math.sin(own.px)) / (2 * Math.SQRT2);
      const uy = (Math.sin(2 * Math.PI * own.fy * seconds + own.py) - Math.sin(own.py)) / (2 * Math.SQRT2);
      const away = ease * file.mobility * reach;
      const dx = file.x + away * ux - (xs[i] ?? file.x);
      const dy = file.y + away * uy - (ys[i] ?? file.y);
      const distance = Math.hypot(dx, dy);
      const share = distance <= speed ? 1 : speed / distance;
      xs[i] = (xs[i] ?? file.x) + dx * share;
      ys[i] = (ys[i] ?? file.y) + dy * share;
    });
    for (let round = 0; round < ROUNDS; round += 1) {
      // Off each other, the looser giving way more, never nearer than they rest.
      files.forEach((a, i) => {
        for (let j = i + 1; j < files.length; j += 1) {
          const b = files[j];
          if (b === undefined) continue;
          const free = a.mobility + b.mobility;
          const need = a.r + b.r + gap;
          const dx = (xs[j] ?? 0) - (xs[i] ?? 0);
          const dy = (ys[j] ?? 0) - (ys[i] ?? 0);
          if (free <= 0 || Math.abs(dx) >= need || Math.abs(dy) >= need) continue;
          const distance = Math.hypot(dx, dy);
          const overlap = Math.min(need, Math.hypot(b.x - a.x, b.y - a.y)) - distance;
          if (overlap <= 0 || distance === 0) continue;
          const ux = dx / distance;
          const uy = dy / distance;
          xs[i] = (xs[i] ?? 0) - ux * overlap * (a.mobility / free);
          ys[i] = (ys[i] ?? 0) - uy * overlap * (a.mobility / free);
          xs[j] = (xs[j] ?? 0) + ux * overlap * (b.mobility / free);
          ys[j] = (ys[j] ?? 0) + uy * overlap * (b.mobility / free);
        }
      });
      // Off the membrane and the cells the cell holds, where a file has come near enough to one to tell.
      files.forEach((file, i) => {
        if (file.mobility <= 0) return;
        tether(file, i);
        const x0 = fromX[i] ?? file.x;
        const y0 = fromY[i] ?? file.y;
        const away = (): number => Math.hypot((xs[i] ?? file.x) - file.x, (ys[i] ?? file.y) - file.y);
        const keep = keepOf(file, file.toRing, gap);
        if (away() > file.toRing - keep) keepOff(laid.ring, near.ring[i] ?? new Int32Array(), i, x0, y0, keep);
        laid.holes.forEach((hole, h) => {
          const rests = file.toHoles[h] ?? Number.POSITIVE_INFINITY;
          const keepHole = keepOf(file, rests, gap);
          if (away() > rests - keepHole) keepOff(hole, near.holes[h]?.[i] ?? new Int32Array(), i, x0, y0, keepHole);
        });
        tether(file, i);
      });
    }
    // No step moves a file further than the speed, and none takes it out of its membrane or into a cell its cell holds.
    files.forEach((file, i) => {
      const x0 = fromX[i] ?? file.x;
      const y0 = fromY[i] ?? file.y;
      let x = xs[i] ?? x0;
      let y = ys[i] ?? y0;
      const moved = Math.hypot(x - x0, y - y0);
      if (moved > speed) {
        x = x0 + ((x - x0) * speed) / moved;
        y = y0 + ((y - y0) * speed) / moved;
      }
      const stays = file.mobility <= 0 || (moved > 0 && !fits(file, i, x0, y0, x, y));
      xs[i] = stays ? x0 : x;
      ys[i] = stays ? y0 : y;
    });
  }
  return {
    cell: float.cell,
    t: advanced,
    wander,
    files: files.map((file, i) => ({ id: file.id, x: xs[i] ?? file.x, y: ys[i] ?? file.y, r: file.r, looseness: file.looseness })),
  };
}

/**
 * Where each placed file of `cell` is `t` milliseconds after the cell opened,
 * stepped from rest at one screen, by path. A closed cell (`t` undefined),
 * reduced motion, or a cell whose files all stay still leaves every file where
 * the layout put it.
 */
export function driftOf(map: MapJson, cell: string, t: number | undefined, at: DriftAt): readonly Drifted[] {
  const start = startFloat(map, cell);
  return t === undefined ? start.files : stepFloat(map, start, t, at).files;
}
