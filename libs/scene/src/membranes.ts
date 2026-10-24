/**
 * membranes: each cell's skin as geometry and as tissue. A cell's contour,
 * the Bubble Set core laid around its files (§5.1), is cut into triangles
 * for the slide an opened cell shows and for the pointer to pick against. The
 * shore is chrome, never terrain (D153), so a shore group's contour is not.
 *
 * The tissue is the base the skin is shaded from (D151, D152): the cells'
 * bodies, fuller where cells nest, and their membrane lines, as wide as each
 * cell's interface (§5.1), laid into grids at the heightfield's resolution
 * and softened there, so the world never paints a large canvas to get them.
 */

import earcut from 'earcut';
import { membraneThickness } from 'core';
import type { MapJson } from 'core';

import { gridFor } from './heightfield.js';
import type { Grid } from './heightfield.js';

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

type Ring = readonly (readonly [number, number])[];

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** A contour's points, the closing repeat of the first dropped, which earcut and the scanline both read as a zero-length edge. */
function openRing(contour: Ring): Ring {
  const first = contour[0];
  const last = contour.at(-1);
  return contour.length > 1 && first !== undefined && last !== undefined && first[0] === last[0] && first[1] === last[1]
    ? contour.slice(0, -1)
    : contour;
}

/** Every cell that has a contour, in cell order, with its contour opened. */
function skinsOf(map: MapJson): readonly { readonly cell: string; readonly interfaceSize: number; readonly ring: Ring }[] {
  const contours = map.terrain.layout?.contours ?? {};
  return map.terrain.cells
    .toSorted((a, b) => byPath(a.id, b.id))
    .flatMap((cell) => {
      const contour = contours[cell.id];
      return contour === undefined || contour.length < 3 ? [] : [{ cell: cell.id, interfaceSize: cell.interface_size, ring: openRing(contour) }];
    });
}

/** Each cell's skin, triangulated, in cell order; a shore group's contour is never a cell's, so it is never cut. */
export function membranes(map: MapJson): readonly Membrane[] {
  return skinsOf(map).map(({ cell, ring }) => {
    const flat = ring.flatMap(([x, y]) => [x, y]);
    return { cell, vertices: Float32Array.from(flat), triangles: Uint32Array.from(earcut(flat)) };
  });
}

/** Add one ring's inside to the body grid, a row at a time, by the even-odd rule. */
function fillRing(grid: Grid, ring: Ring, share: number): void {
  const ys = ring.map(([, y]) => y);
  const r0 = Math.max(0, Math.ceil(Math.min(...ys) / grid.resolution));
  const r1 = Math.min(grid.rows - 1, Math.floor(Math.max(...ys) / grid.resolution));
  for (let row = r0; row <= r1; row += 1) {
    const y = row * grid.resolution;
    const crossings: number[] = [];
    ring.forEach(([ax, ay], index) => {
      const [bx, by] = ring[(index + 1) % ring.length] ?? [ax, ay];
      if (ay <= y === by <= y) return;
      crossings.push(ax + ((y - ay) / (by - ay)) * (bx - ax));
    });
    crossings.sort((a, b) => a - b);
    for (let pair = 0; pair + 1 < crossings.length; pair += 2) {
      const c0 = Math.max(0, Math.ceil((crossings[pair] ?? 0) / grid.resolution));
      const c1 = Math.min(grid.columns - 1, Math.floor((crossings[pair + 1] ?? 0) / grid.resolution));
      for (let column = c0; column <= c1; column += 1) {
        const index = row * grid.columns + column;
        grid.values[index] = Math.min(1, (grid.values[index] ?? 0) + share);
      }
    }
  }
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

/** The base tissue at the heightfield's `resolution`: the cells' bodies, softened, and their membrane lines. */
export function tissue(map: MapJson, resolution: number, look: TissueLook = TISSUE): Tissue {
  const body = gridFor(map, resolution);
  const membrane = gridFor(map, resolution);
  for (const { ring, interfaceSize } of skinsOf(map)) {
    fillRing(body, ring, look.bodyShare);
    strokeRing(membrane, ring, membraneThickness(interfaceSize));
  }
  return { body: soften(body, look.bodySoften), membrane };
}
