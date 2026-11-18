/**
 * membranes: each cell's skin as geometry and as tissue. A cell's contour,
 * the Bubble Set core laid around its files (§5.1), wears one tooth per rule
 * its files break (D159), and is cut into triangles for the slide an opened
 * cell shows and for the pointer to pick against. The shore is chrome, never
 * terrain (D153), so a shore group's contour is not.
 *
 * The tissue is the base the skin is shaded from (D151, D152): the cells'
 * bodies, fuller where cells nest, and their membrane lines, as wide as each
 * cell's interface (§5.1), laid into grids at the heightfield's resolution
 * and softened there, so the world never paints a large canvas to get them.
 * The lines are laid from the dented ring, so the world's membranes wear the
 * same teeth the SVG draws, which reads the ring from here (D86, D159).
 *
 * A third grid lies beside those two (D195): how far each cell's membrane
 * line ripples, by the share of its outside imports that land past its
 * barrel. The line is laid once and never again, so the world moves it by
 * sampling it a little to one side, and this grid says how far.
 */

import earcut from 'earcut';
import { membraneThickness } from 'core';
import type { Cell, MapJson } from 'core';

import { gridFor } from './heightfield.js';
import type { Grid } from './heightfield.js';
import { openRing, scanRing } from './raster.js';
import type { Ring } from './raster.js';
import { MEMBRANE_DENT_PULL, MEMBRANE_DENT_SPAN, MEMBRANE_WOBBLE } from './tokens.js';

/** A cell's skin cut into triangles: its ring's points as `x, y` pairs in layout units, and three indices per triangle. */
export type Membrane = {
  readonly cell: string;
  readonly vertices: Float32Array;
  readonly triangles: Uint32Array;
};

/** The base tissue the skin samples: how much body lies under each point, how much membrane line, and how far that line ripples there, in layout units (D195). */
export type Tissue = {
  readonly body: Grid;
  readonly membrane: Grid;
  readonly wobble: Grid;
};

/** How the tissue is laid: each skin a point lies inside adds this much body, up to 1, and the body is softened over this many samples. */
export type TissueLook = {
  readonly bodyShare: number;
  readonly bodySoften: number;
};

export const TISSUE: TissueLook = { bodyShare: 0.5, bodySoften: 1 };

type Point = readonly [number, number];

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Where a ring is read along its length: each vertex's distance from the first, the whole length, and which way round it runs. */
type Walk = {
  readonly ring: Ring;
  readonly at: readonly number[];
  readonly length: number;
  /** 1 when the shoelace area is positive, -1 when negative: which side of travel is outside. */
  readonly turn: number;
};

function walkOf(ring: Ring): Walk {
  const at: number[] = [];
  let length = 0;
  let area = 0;
  ring.forEach(([x, y], index) => {
    const [nx, ny] = ring[(index + 1) % ring.length] ?? [x, y];
    at.push(length);
    length += Math.hypot(nx - x, ny - y);
    area += x * ny - nx * y;
  });
  return { ring, at, length, turn: area < 0 ? -1 : 1 };
}

/** The point a given distance along the ring, wrapping past its end. */
function pointAlong(walk: Walk, distance: number): Point {
  const along = ((distance % walk.length) + walk.length) % walk.length;
  const { ring, at } = walk;
  let index = at.length - 1;
  while (index > 0 && (at[index] ?? 0) > along) index -= 1;
  const [x, y] = ring[index] ?? [0, 0];
  const [nx, ny] = ring[(index + 1) % ring.length] ?? [x, y];
  const span = Math.hypot(nx - x, ny - y);
  const share = span === 0 ? 0 : (along - (at[index] ?? 0)) / span;
  return [x + (nx - x) * share, y + (ny - y) * share];
}

/** The ring's uppermost vertex, the leftmost of a tie: the same top the weather hangs a storm from. */
function topIndex(ring: Ring): number {
  let top = 0;
  ring.forEach(([x, y], index) => {
    const [tx, ty] = ring[top] ?? [x, y];
    if (y < ty || (y === ty && x < tx)) top = index;
  });
  return top;
}

/**
 * A cell's skin with one point pulled out per breached rule, the way an
 * organelle pulls a vertex (§5.1, D159). The points are spread evenly along
 * the ring by its length and phased so the ring's top falls midway between
 * two of them, because the top is where the weather hangs a storm. Each is a
 * tooth: the ring is cut `MEMBRANE_DENT_SPAN` either side of the point,
 * narrower when the teeth would crowd, and the point is drawn
 * `MEMBRANE_DENT_PULL` out from the chord the cut leaves. Every other vertex
 * stays where core put it, and the dented ring is written from its top. A
 * ring with no dents comes back as it was given, closing repeat and all.
 */
export function dentedRing(contour: Ring, dents: number): Ring {
  const walk = walkOf(openRing(contour));
  if (dents === 0 || walk.ring.length < 3 || walk.length === 0) return contour;
  const start = walk.at[topIndex(walk.ring)] ?? 0;
  const spacing = walk.length / dents;
  const span = Math.min(MEMBRANE_DENT_SPAN, spacing / 4);
  const teeth = Array.from({ length: dents }, (_, k) => spacing / 2 + k * spacing);
  const cut = (key: number): boolean => teeth.some((centre) => key >= centre - span && key <= centre + span);
  const kept = walk.ring.flatMap((point, index) => {
    const key = ((((walk.at[index] ?? 0) - start) % walk.length) + walk.length) % walk.length;
    return cut(key) ? [] : [{ key, point }];
  });
  const pulled = teeth.flatMap((centre) => {
    const [ax, ay] = pointAlong(walk, start + centre - span);
    const [bx, by] = pointAlong(walk, start + centre + span);
    const [cx, cy] = pointAlong(walk, start + centre);
    const chord = Math.hypot(bx - ax, by - ay);
    const [ox, oy] = chord === 0 ? [0, 0] : [(walk.turn * (by - ay)) / chord, (walk.turn * (ax - bx)) / chord];
    return [
      { key: centre - span, point: [ax, ay] as const },
      { key: centre, point: [cx + ox * MEMBRANE_DENT_PULL, cy + oy * MEMBRANE_DENT_PULL] as const },
      { key: centre + span, point: [bx, by] as const },
    ];
  });
  return [...kept, ...pulled].toSorted((a, b) => a.key - b.key).map(({ point }) => point);
}

/**
 * How far a cell's membrane line ripples either side of where it rests, in
 * layout units (D195): `MEMBRANE_WOBBLE` by the share of its outside imports
 * that land past its barrel. A cell entered only through its barrel holds
 * still, and so does one the map gives no `integrity` (a directory, a single
 * file) or nothing outside imports: no share was measured there, so none is
 * drawn (C2).
 */
export function wobbleOf(cell: Pick<Cell, 'integrity'>): number {
  const { through, past } = cell.integrity ?? { through: 0, past: 0 };
  const entered = through + past;
  return entered === 0 ? 0 : (MEMBRANE_WOBBLE * past) / entered;
}

/** A cell's skin as the tissue lays it: its dented ring, opened, how wide its line is drawn and how far it ripples. */
type Skin = { readonly cell: string; readonly thickness: number; readonly wobble: number; readonly ring: Ring };

/** Every cell that has a contour, in cell order, with its skin dented by its rules and opened. */
function skinsOf(map: MapJson): readonly Skin[] {
  const contours = map.terrain.layout?.contours ?? {};
  return map.terrain.cells
    .toSorted((a, b) => byPath(a.id, b.id))
    .flatMap((cell) => {
      const contour = contours[cell.id];
      if (contour === undefined || contour.length < 3) return [];
      return [{ cell: cell.id, thickness: membraneThickness(cell.interface_size), wobble: wobbleOf(cell), ring: openRing(dentedRing(contour, cell.dents.length)) }];
    });
}

/** Each cell's skin, teeth and all, triangulated, in cell order; a shore group's contour is never a cell's, so it is never cut. */
export function membranes(map: MapJson): readonly Membrane[] {
  return skinsOf(map).map(({ cell, ring }) => {
    const flat = ring.flatMap(([x, y]) => [x, y]);
    return { cell, vertices: Float32Array.from(flat), triangles: Uint32Array.from(earcut(flat)) };
  });
}

/** The distance from a point to a segment. */
function toSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const length2 = dx * dx + dy * dy;
  const t = length2 === 0 ? 0 : Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / length2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * Lay one ring's membrane line into the grid: each sample takes the share of
 * a sample-wide box the line covers there, so a line thinner than a sample
 * still shows, a thicker interface reads wider, and nothing aliases between
 * samples. Where two lines meet, the stronger holds.
 */
function strokeRing(grid: Grid, ring: Ring, thickness: number): void {
  const half = thickness / 2 + grid.resolution / 2;
  ring.forEach(([ax, ay], index) => {
    const [bx, by] = ring[(index + 1) % ring.length] ?? [ax, ay];
    const c0 = Math.max(0, Math.ceil((Math.min(ax, bx) - half) / grid.resolution));
    const c1 = Math.min(grid.columns - 1, Math.floor((Math.max(ax, bx) + half) / grid.resolution));
    const r0 = Math.max(0, Math.ceil((Math.min(ay, by) - half) / grid.resolution));
    const r1 = Math.min(grid.rows - 1, Math.floor((Math.max(ay, by) + half) / grid.resolution));
    for (let row = r0; row <= r1; row += 1) {
      for (let column = c0; column <= c1; column += 1) {
        const d = toSegment(column * grid.resolution, row * grid.resolution, ax, ay, bx, by);
        const cover = Math.min(1, Math.max(0, (half - d) / grid.resolution));
        const at = row * grid.columns + column;
        if (cover > (grid.values[at] ?? 0)) grid.values[at] = cover;
      }
    }
  });
}

/**
 * How far past its line's edge a skin's ripple is laid. The skin samples its
 * line up to the amplitude to one side, so a sample that far off the line
 * must carry the amplitude too, or the line would only thin where it stands
 * and never move. `MEMBRANE_WOBBLE` keeps under `MEMBRANE_DENT_PULL`
 * (`tokens.test.ts`), so laying to the pull holds whatever the token is moved
 * to inside its bound; a sample more covers the skin reading between samples.
 */
const wobbleReach = (resolution: number): number => MEMBRANE_DENT_PULL + resolution;

/**
 * Visit every sample within `reach` of a ring's line that `wanted` passes:
 * its index, and how far it stands off the line's edge, below zero under the
 * line itself. A sample near two of the ring's segments is visited once for
 * each. `wanted` is asked before the distance is measured, so a caller that
 * wants few samples pays for few.
 */
function nearRing(grid: Grid, { ring, thickness }: Skin, reach: number, wanted: (index: number) => boolean, visit: (index: number, off: number) => void): void {
  const half = thickness / 2;
  const span = half + reach;
  ring.forEach(([ax, ay], at) => {
    const [bx, by] = ring[(at + 1) % ring.length] ?? [ax, ay];
    const c0 = Math.max(0, Math.ceil((Math.min(ax, bx) - span) / grid.resolution));
    const c1 = Math.min(grid.columns - 1, Math.floor((Math.max(ax, bx) + span) / grid.resolution));
    const r0 = Math.max(0, Math.ceil((Math.min(ay, by) - span) / grid.resolution));
    const r1 = Math.min(grid.rows - 1, Math.floor((Math.max(ay, by) + span) / grid.resolution));
    for (let row = r0; row <= r1; row += 1) {
      for (let column = c0; column <= c1; column += 1) {
        const index = row * grid.columns + column;
        if (!wanted(index)) continue;
        const off = toSegment(column * grid.resolution, row * grid.resolution, ax, ay, bx, by) - half;
        if (off <= reach) visit(index, off);
      }
    }
  });
}

/**
 * Lay each skin's ripple into the grid (D195): its amplitude under its line
 * and as far either side as the ripple may carry it, and 0 everywhere else.
 * Where two skins run close, each sample takes the amplitude of the line it
 * stands nearest, so a still skin beside a rippling one holds still up to
 * the middle of the ground between them. The rippling skins lay their
 * amplitudes first, the nearer line holding a sample two of them reach; then
 * each still skin takes back the samples it stands nearer, the only samples
 * a still skin is measured at, so a map where few cells ripple costs little
 * and one where none does costs nothing. At an equal distance a rippling
 * skin keeps the sample, and of two the first in cell order (C3).
 */
function layWobble(grid: Grid, skins: readonly Skin[]): void {
  const rippling = skins.filter((skin) => skin.wobble > 0);
  if (rippling.length === 0) return;
  const reach = wobbleReach(grid.resolution);
  const nearest = new Float32Array(grid.values.length).fill(Number.POSITIVE_INFINITY);
  const nearer = (index: number, off: number): boolean => off < (nearest[index] ?? Number.NEGATIVE_INFINITY);
  for (const skin of rippling) {
    nearRing(grid, skin, reach, () => true, (index, off) => {
      if (!nearer(index, off)) return;
      nearest[index] = off;
      grid.values[index] = skin.wobble;
    });
  }
  const laid = (index: number): boolean => (grid.values[index] ?? 0) > 0;
  for (const skin of skins) {
    if (skin.wobble > 0) continue;
    nearRing(grid, skin, reach, laid, (index, off) => {
      if (!nearer(index, off)) return;
      nearest[index] = off;
      grid.values[index] = 0;
    });
  }
}

/** Average each sample with its `radius` neighbours along one axis, held at the edges. */
function boxPass(grid: Grid, radius: number, across: boolean): void {
  const source = Float32Array.from(grid.values);
  const lines = across ? grid.rows : grid.columns;
  const length = across ? grid.columns : grid.rows;
  const indexOf = (line: number, step: number): number => (across ? line * grid.columns + step : step * grid.columns + line);
  for (let line = 0; line < lines; line += 1) {
    for (let step = 0; step < length; step += 1) {
      let sum = 0;
      for (let offset = -radius; offset <= radius; offset += 1) {
        sum += source[indexOf(line, Math.min(length - 1, Math.max(0, step + offset)))] ?? 0;
      }
      grid.values[indexOf(line, step)] = sum / (2 * radius + 1);
    }
  }
}

/** Soften a grid with a box of `radius` samples each way, held at the edges: one pass across, one down. */
function soften(grid: Grid, radius: number): Grid {
  if (radius < 1) return grid;
  boxPass(grid, radius, true);
  boxPass(grid, radius, false);
  return grid;
}

/** The base tissue at the heightfield's `resolution`: the cells' bodies, softened, their membrane lines, teeth and all, and how far each line ripples (D195). */
export function tissue(map: MapJson, resolution: number, look: TissueLook = TISSUE): Tissue {
  const body = gridFor(map, resolution);
  const membrane = gridFor(map, resolution);
  const wobble = gridFor(map, resolution);
  const skins = skinsOf(map);
  for (const { ring, thickness } of skins) {
    scanRing(body, ring, (index) => {
      body.values[index] = Math.min(1, (body.values[index] ?? 0) + look.bodyShare);
    });
    strokeRing(membrane, ring, thickness);
  }
  layWobble(wobble, skins);
  return { body: soften(body, look.bodySoften), membrane, wobble };
}
