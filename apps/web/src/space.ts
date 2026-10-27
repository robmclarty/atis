/**
 * space: the world's ground as data (D169). The field is a ground like outer
 * space: near-black, with a faint star field seeded over a grid the ground
 * repeats, at most one star a cell, at a place and a brightness its seed
 * gives it, most of them dim (C3: one seed, one sky). And depth reads from a
 * rule at each band's boundary, not from a step in the skin: one rule a
 * boundary, at the height the band below begins, drawn across the screen
 * over the 3D in a translucent ink. A field whose lanes wrap into rows rules
 * each row's boundaries across that row alone, so no rule cuts through
 * another row's terrain (Q73). Pure, so a test reads it straight; the world
 * draws it in `world/space.ts`.
 */

import { seeded } from 'scene';
import type { Point } from 'scene';
import type { LayoutBand, MapJson } from 'core';

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

/**
 * A rule at a band's boundary: the band it opens, the height on the layout
 * where it begins, and, in a field whose lanes wrap into rows, the stretch of
 * its row it runs across, `x0` to `x1` (Q73). A rule with no row runs across
 * the screen.
 */
export type BandRule = { readonly band: number; readonly y: number; readonly row?: readonly [number, number] };

/** One rule a boundary between two bands of one ladder, top to bottom: where each band after the first begins. */
const boundaries = (bands: readonly LayoutBand[]): readonly BandRule[] =>
  bands
    .toSorted((a, b) => a.index - b.index)
    .slice(1)
    .map((band) => ({ band: band.index, y: band.y0 }));

/** The field's rules: its one ladder's, or each row's across that row (Q73). */
export const bandRules = (map: MapJson): readonly BandRule[] => {
  const layout = map.terrain.layout;
  if (layout?.rows === undefined) return boundaries(layout?.bands ?? []);
  return layout.rows.flatMap((row) => boundaries(row.bands).map((rule) => ({ ...rule, row: [row.x0, row.x1] as const })));
};

/**
 * The stretch of the line through two points, from `low` to `high` of the way
 * from the first to the second, that lies on the screen: its two ends there,
 * or none when it misses the screen or the points are one. Liang and
 * Barsky's clip: each pair of edges narrows the stretch inside the screen.
 */
const clip = (from: Point, to: Point, width: number, height: number, [start, end]: readonly [number, number]): readonly [Point, Point] | undefined => {
  const [dx, dy] = [to[0] - from[0], to[1] - from[1]];
  if (dx === 0 && dy === 0) return undefined;
  let [low, high] = [start, end];
  for (const [step, at, size] of [
    [dx, from[0], width],
    [dy, from[1], height],
  ] as const) {
    if (step === 0) {
      if (at < 0 || at > size) return undefined;
      continue;
    }
    const [a, b] = [(0 - at) / step, (size - at) / step];
    [low, high] = [Math.max(low, Math.min(a, b)), Math.min(high, Math.max(a, b))];
  }
  if (low > high) return undefined;
  return [
    [from[0] + dx * low, from[1] + dy * low],
    [from[0] + dx * high, from[1] + dy * high],
  ];
};

/**
 * The line through two points on the screen, run out to the screen's edges:
 * its two ends there, or none when the line misses the screen or the points
 * are one. A rule drawn so crosses the whole screen, wherever the camera has
 * turned the ground.
 */
export const across = (from: Point, to: Point, width: number, height: number): readonly [Point, Point] | undefined =>
  clip(from, to, width, height, [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY]);

/** The part of the segment between two points on the screen that lies on it, or none when none of it does: a row's rule, which runs across its row alone (Q73). */
export const between = (from: Point, to: Point, width: number, height: number): readonly [Point, Point] | undefined => clip(from, to, width, height, [0, 1]);
