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
 */

import earcut from 'earcut';
import { membraneThickness } from 'core';
import type { MapJson } from 'core';

import { gridFor } from './heightfield.js';
import type { Grid } from './heightfield.js';
import { openRing, scanRing } from './raster.js';
import type { Ring } from './raster.js';
import { MEMBRANE_DENT_PULL, MEMBRANE_DENT_SPAN } from './tokens.js';

/** A cell's skin cut into triangles: its ring's points as `x, y` pairs in layout units, and three indices per triangle. */
export type Membrane = {
  readonly cell: string;
  readonly vertices: Float32Array;
  readonly triangles: Uint32Array;
};

/** The base tissue the skin samples: how much body lies under each point, and how much membrane line. */
export type Tissue = {
  readonly body: Grid;
  readonly membrane: Grid;
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

/** Every cell that has a contour, in cell order, with its skin dented by its rules and opened. */
function skinsOf(map: MapJson): readonly { readonly cell: string; readonly interfaceSize: number; readonly ring: Ring }[] {
  const contours = map.terrain.layout?.contours ?? {};
  return map.terrain.cells
    .toSorted((a, b) => byPath(a.id, b.id))
    .flatMap((cell) => {
      const contour = contours[cell.id];
      return contour === undefined || contour.length < 3 ? [] : [{ cell: cell.id, interfaceSize: cell.interface_size, ring: openRing(dentedRing(contour, cell.dents.length)) }];
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

/** The base tissue at the heightfield's `resolution`: the cells' bodies, softened, and their membrane lines, teeth and all. */
export function tissue(map: MapJson, resolution: number, look: TissueLook = TISSUE): Tissue {
  const body = gridFor(map, resolution);
  const membrane = gridFor(map, resolution);
  for (const { ring, interfaceSize } of skinsOf(map)) {
    scanRing(body, ring, (index) => {
      body.values[index] = Math.min(1, (body.values[index] ?? 0) + look.bodyShare);
    });
    strokeRing(membrane, ring, membraneThickness(interfaceSize));
  }
  return { body: soften(body, look.bodySoften), membrane };
}
