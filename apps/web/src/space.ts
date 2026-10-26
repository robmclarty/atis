/**
 * space: the world's ground as data (D169). The field is a ground like outer
 * space: near-black, with a faint star field seeded over a grid the ground
 * repeats, at most one star a cell, at a place and a brightness its seed
 * gives it, most of them dim (C3: one seed, one sky). And depth reads from a
 * rule at each band's boundary, not from a step in the skin: one rule a
 * boundary, at the height the band below begins, drawn across the screen
 * over the 3D in a translucent ink. Pure, so a test reads it straight; the
 * world draws it in `world/space.ts`.
 */

import { seeded } from 'scene';
import type { Point } from 'scene';
import type { MapJson } from 'core';

/** How many cells the star grid holds each way before the ground repeats it. */
export const STAR_GRID = 64;

/** How far into its cell a star may sit from the cell's edge, as a share of the cell, so its disc is drawn whole within it at the far zoom. */
const STAR_MARGIN = 0.2;

/** How the brightness is spread: a power over an even draw, so most stars are faint and a few are bright. */
const STAR_FALLOFF = 3;

/** The dimmest a star is drawn, as a share of the brightest. */
const STAR_FLOOR = 0.15;

/**
 * The star field: `STAR_GRID` × `STAR_GRID` cells, row by row, four values a
 * cell: how bright its star is, 0 for none, then where in the cell it sits
 * across and down, as shares of the cell, and a 1. A cell holds a star at the
 * odds `density` gives; the same seed draws the same field (C3).
 */
export const starField = (seed: number, density: number): Float32Array => {
  const random = seeded(seed);
  const cells = new Float32Array(STAR_GRID * STAR_GRID * 4);
  for (let cell = 0; cell < STAR_GRID * STAR_GRID; cell += 1) {
    // Every cell draws all four numbers, star or none, so one cell's luck never shifts another's.
    const [odds, light, across, down] = [random(), random(), random(), random()];
    const lit = odds < density;
    cells[cell * 4] = lit ? STAR_FLOOR + (1 - STAR_FLOOR) * light ** STAR_FALLOFF : 0;
    cells[cell * 4 + 1] = STAR_MARGIN + (1 - 2 * STAR_MARGIN) * across;
    cells[cell * 4 + 2] = STAR_MARGIN + (1 - 2 * STAR_MARGIN) * down;
    cells[cell * 4 + 3] = 1;
  }
  return cells;
};

/** A rule at a band's boundary: the band it opens, and the height on the layout where it begins. */
export type BandRule = { readonly band: number; readonly y: number };

/** One rule a boundary between two bands, top to bottom: where each band after the first begins. */
export const bandRules = (map: MapJson): readonly BandRule[] =>
  (map.terrain.layout?.bands ?? [])
    .toSorted((a, b) => a.index - b.index)
    .slice(1)
    .map((band) => ({ band: band.index, y: band.y0 }));

/**
 * The line through two points on the screen, run out to the screen's edges:
 * its two ends there, or none when the line misses the screen or the points
 * are one. A rule drawn so crosses the whole screen, wherever the camera has
 * turned the ground.
 */
export const across = (from: Point, to: Point, width: number, height: number): readonly [Point, Point] | undefined => {
  const [dx, dy] = [to[0] - from[0], to[1] - from[1]];
  if (dx === 0 && dy === 0) return undefined;
  // Liang and Barsky's clip, over a line with no ends: each pair of edges narrows the stretch of it inside the screen.
  let [low, high] = [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY];
  for (const [step, start, size] of [
    [dx, from[0], width],
    [dy, from[1], height],
  ] as const) {
    if (step === 0) {
      if (start < 0 || start > size) return undefined;
      continue;
    }
    const [a, b] = [(0 - start) / step, (size - start) / step];
    [low, high] = [Math.max(low, Math.min(a, b)), Math.min(high, Math.max(a, b))];
  }
  if (low > high) return undefined;
  return [
    [from[0] + dx * low, from[1] + dy * low],
    [from[0] + dx * high, from[1] + dy * high],
  ];
};
