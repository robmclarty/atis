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

/**
 * Visit the index of every sample inside a ring, a row at a time, by the
 * even-odd rule. Each edge is laid once into the rows it crosses, rather than
 * every edge tested against every row, since a membrane's contour can carry
 * hundreds of points over hundreds of rows; each candidate row is still held
 * to the crossing rule exactly, so the samples visited are the same.
 */
export function scanRing(grid: Grid, ring: Ring, visit: (index: number) => void): void {
  const n = ring.length;
  if (n < 3) return;
  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  for (const [, y] of ring) {
    if (y < top) top = y;
    if (y > bottom) bottom = y;
  }
  const r0 = Math.max(0, Math.ceil(top / grid.resolution));
  const r1 = Math.min(grid.rows - 1, Math.floor(bottom / grid.resolution));
  if (r1 < r0) return;
  const crossings: number[][] = Array.from({ length: r1 - r0 + 1 }, () => []);
  for (let index = 0; index < n; index += 1) {
    const [ax, ay] = ring[index] ?? [0, 0];
    const [bx, by] = ring[(index + 1) % n] ?? [ax, ay];
    if (ay === by) continue;
    // An edge crosses the rows whose y lies in [low, high); a row either side is held to the rule too, so rounding never drops one.
    const first = Math.max(r0, Math.ceil(Math.min(ay, by) / grid.resolution) - 1);
    const last = Math.min(r1, Math.floor(Math.max(ay, by) / grid.resolution) + 1);
    for (let row = first; row <= last; row += 1) {
      const y = row * grid.resolution;
      if (ay <= y === by <= y) continue;
      crossings[row - r0]?.push(ax + ((y - ay) / (by - ay)) * (bx - ax));
    }
  }
  crossings.forEach((xs, offset) => {
    const row = r0 + offset;
    xs.sort((a, b) => a - b);
    for (let pair = 0; pair + 1 < xs.length; pair += 2) {
      const c0 = Math.max(0, Math.ceil((xs[pair] ?? 0) / grid.resolution));
      const c1 = Math.min(grid.columns - 1, Math.floor((xs[pair + 1] ?? 0) / grid.resolution));
      for (let column = c0; column <= c1; column += 1) visit(row * grid.columns + column);
    }
  });
}
