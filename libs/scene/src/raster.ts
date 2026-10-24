/**
 * raster: laying a contour onto a grid, shared by every soft layer the scene
 * computes for the skin (D152). Pure arithmetic over layout units; no canvas.
 */

import type { Grid } from './heightfield.js';

/** A closed outline in layout units, as `map.json` carries a contour. */
export type Ring = readonly (readonly [number, number])[];

/** A contour's points with the closing repeat of the first dropped, which earcut and the scanline would read as a zero-length edge. */
export function openRing(contour: Ring): Ring {
  const first = contour[0];
  const last = contour.at(-1);
  return contour.length > 1 && first !== undefined && last !== undefined && first[0] === last[0] && first[1] === last[1]
    ? contour.slice(0, -1)
    : contour;
}

/** Visit the index of every sample inside a ring, a row at a time, by the even-odd rule. */
export function scanRing(grid: Grid, ring: Ring, visit: (index: number) => void): void {
  if (ring.length < 3) return;
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
      for (let column = c0; column <= c1; column += 1) visit(row * grid.columns + column);
    }
  }
}
