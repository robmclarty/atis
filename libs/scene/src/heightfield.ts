/**
 * heightfield: the soft skin's relief (§5.1), elevation by stability and mass
 * and nothing else (C11). No depth band steps the skin: the field is a level
 * ground like space, and depth reads from a rule at each band's boundary
 * drawn over it (D169, amending D151's terraces). Swells, the broad scale,
 * raise old, quiet files as bedrock and lower churny ones, read from each
 * file's `stability` (D149) and absent where the map carries none (C2). Bumps,
 * the small scale, swell each cell through the skin by its mass, one per cell,
 * creasing where two meet.
 *
 * Every layer is a grid over the layout, sampled every `resolution` layout
 * units, computed once on the CPU. The bumps are also handed out as a list, so
 * the vertex stage can settle and jiggle the mass alone (§5.5). Inputs are
 * read in path order, so one map gives one grid byte for byte (C3).
 */

import type { MapJson, Organelle } from 'core';

/**
 * The relief's sizes, in the heightfield's own units (a cell's body stands at
 * most 9, as the materials spike tuned it) and the layout's. One object,
 * handed in, so the dev panel can move them live (D156); `RELIEF` is where
 * they rest.
 */
export type Relief = {
  /** A swell's peak: up this far under bedrock, down this far under churn. */
  readonly swellHeight: number;
  /** How broad the swell round each file is, a gaussian's sigma in layout units. */
  readonly swellSpread: number;
  /** The age, in days, at which a file reads as fully old. */
  readonly swellOldDays: number;
  /** The churn ratio at which a file reads as fully churny. */
  readonly swellChurnFull: number;
  /** The height a cell's bump tends to as its mass grows. */
  readonly bodyHeight: number;
  /** The lines of code at which a cell's bump stands at half of `bodyHeight`. */
  readonly bodyHalfLoc: number;
  /** How far past its outermost file's edge a cell's bump reaches, in layout units. */
  readonly bodyPad: number;
};

export const RELIEF: Relief = {
  swellHeight: 3,
  swellSpread: 48,
  swellOldDays: 365,
  swellChurnFull: 4,
  bodyHeight: 9,
  bodyHalfLoc: 400,
  bodyPad: 12,
};

/**
 * Values sampled over the layout: column `c` and row `r` sit at layout
 * `(c × resolution, r × resolution)`, stored row by row. Every grid the scene
 * lays for the skin shares this shape and the heightfield's resolution (D152).
 */
export type Grid = {
  readonly resolution: number;
  readonly columns: number;
  readonly rows: number;
  readonly values: Float32Array;
};

/** The relief by scale, and their sum, which is the skin's resting height. */
export type Heightfield = {
  readonly swell: Grid;
  readonly mass: Grid;
  readonly height: Grid;
};

/** One cell's bump: its centre and reach in layout units, and its mass as a share of `bodyHeight`, from 0 towards 1. */
export type Bump = {
  readonly cell: string;
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly mass: number;
};

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** An empty grid covering the map's layout at `resolution`; a map with no layout gets a single sample (C2: nothing is drawn there). */
export function gridFor(map: MapJson, resolution: number): Grid {
  if (!(resolution > 0)) throw new Error(`a grid needs a positive resolution, got ${String(resolution)}`);
  const layout = map.terrain.layout;
  const columns = layout === undefined ? 1 : Math.ceil(layout.width / resolution) + 1;
  const rows = layout === undefined ? 1 : Math.ceil(layout.height / resolution) + 1;
  return { resolution, columns, rows, values: new Float32Array(columns * rows) };
}

/** A grid's value at a layout point, read bilinearly between its four nearest samples and held at the edges. */
export function sampleGrid(grid: Grid, x: number, y: number): number {
  const at = (column: number, row: number): number =>
    grid.values[Math.min(grid.rows - 1, Math.max(0, row)) * grid.columns + Math.min(grid.columns - 1, Math.max(0, column))] ?? 0;
  const gx = x / grid.resolution;
  const gy = y / grid.resolution;
  const c0 = Math.floor(gx);
  const r0 = Math.floor(gy);
  const tx = clamp01(gx - c0);
  const ty = clamp01(gy - r0);
  const top = at(c0, r0) * (1 - tx) + at(c0 + 1, r0) * tx;
  const bottom = at(c0, r0 + 1) * (1 - tx) + at(c0 + 1, r0 + 1) * tx;
  return top * (1 - ty) + bottom * ty;
}

/** Visit every sample within `reach` layout units of a point, with its index and its distance squared. */
function around(grid: Grid, x: number, y: number, reach: number, visit: (index: number, d2: number) => void): void {
  const c0 = Math.max(0, Math.ceil((x - reach) / grid.resolution));
  const c1 = Math.min(grid.columns - 1, Math.floor((x + reach) / grid.resolution));
  const r0 = Math.max(0, Math.ceil((y - reach) / grid.resolution));
  const r1 = Math.min(grid.rows - 1, Math.floor((y + reach) / grid.resolution));
  for (let row = r0; row <= r1; row += 1) {
    for (let column = c0; column <= c1; column += 1) {
      const d2 = (column * grid.resolution - x) ** 2 + (row * grid.resolution - y) ** 2;
      if (d2 <= reach * reach) visit(row * grid.columns + column, d2);
    }
  }
}

/**
 * How settled a file is, from −1 (young and churning) to 1 (old and quiet);
 * absent for a file with no stability, or no churn ratio to weigh its age
 * against, since a missing churn read as none would fake a quiet file (C2).
 */
function settledness(organelle: Organelle, relief: Relief): number | undefined {
  const churn = organelle.stability?.churn_ratio;
  if (organelle.stability === undefined || churn === undefined) return undefined;
  return clamp01(organelle.stability.age_days / relief.swellOldDays) - clamp01(churn / relief.swellChurnFull);
}

/**
 * Swells: round each file a broad gaussian carrying its settledness, averaged
 * where files crowd and fading to nothing away from them, so a dense cluster
 * of bedrock is no taller than one old file, and empty ground stays level.
 */
function swells(map: MapJson, grid: Grid, relief: Relief): Grid {
  const positions = map.terrain.layout?.positions ?? {};
  const weight = new Float64Array(grid.values.length);
  const lift = new Float64Array(grid.values.length);
  const spread = 2 * relief.swellSpread * relief.swellSpread;
  for (const organelle of map.terrain.organelles.toSorted((a, b) => byPath(a.id, b.id))) {
    const settled = settledness(organelle, relief);
    const place = positions[organelle.id];
    if (settled === undefined || place === undefined) continue;
    around(grid, place.x, place.y, 3 * relief.swellSpread, (index, d2) => {
      const w = Math.exp(-d2 / spread);
      weight[index] = (weight[index] ?? 0) + w;
      lift[index] = (lift[index] ?? 0) + w * settled;
    });
  }
  grid.values.forEach((_value, index) => {
    grid.values[index] = (relief.swellHeight * (lift[index] ?? 0)) / Math.max(1, weight[index] ?? 0);
  });
  return grid;
}

/**
 * Each cell's bump, in cell order. It sits on the cell's own files, centred
 * on their mass, and reaches just past the outermost, so it rises where the
 * cell's membrane is drawn. It weighs the lines of those files alone: a
 * package's `body_loc` counts its nested cells too, and their own bumps carry
 * that mass, so no line is counted twice and a package never buries its
 * folders under one dome. A cell with no files of its own placed has no
 * centre to stand on, so it has no bump (C2).
 */
export function bumps(map: MapJson, relief: Relief = RELIEF): readonly Bump[] {
  const positions = map.terrain.layout?.positions ?? {};
  const loc = new Map(map.terrain.organelles.map((organelle) => [organelle.id, organelle.loc] as const));
  return map.terrain.cells
    .toSorted((a, b) => byPath(a.id, b.id))
    .flatMap((cell): Bump[] => {
      const placed = [...cell.organelles].toSorted(byPath).flatMap((id) => {
        const place = positions[id];
        return place === undefined ? [] : [{ ...place, loc: loc.get(id) ?? 0 }];
      });
      if (placed.length === 0) return [];
      const lines = placed.reduce((total, file) => total + file.loc, 0);
      const weight = placed.reduce((total, file) => total + Math.max(file.loc, 1), 0);
      const x = placed.reduce((total, file) => total + file.x * Math.max(file.loc, 1), 0) / weight;
      const y = placed.reduce((total, file) => total + file.y * Math.max(file.loc, 1), 0) / weight;
      const radius = Math.max(...placed.map((file) => Math.hypot(file.x - x, file.y - y) + file.r)) + relief.bodyPad;
      const mass = Math.sqrt(lines) / (Math.sqrt(lines) + Math.sqrt(relief.bodyHalfLoc));
      return [{ cell: cell.id, x, y, radius, mass }];
    });
}

/** A bump's height a distance `d` from its centre: smooth at the peak and smooth to nothing at its radius. */
export function bumpProfile(bump: Bump, d: number, relief: Relief = RELIEF): number {
  if (d >= bump.radius) return 0;
  const t = 1 - (d / bump.radius) ** 2;
  return relief.bodyHeight * bump.mass * t * t;
}

/** The mass relief: at each point the tallest bump over it, so where two bumps meet the skin folds into a crease. */
function masses(map: MapJson, grid: Grid, relief: Relief): Grid {
  for (const bump of bumps(map, relief)) {
    around(grid, bump.x, bump.y, bump.radius, (index, d2) => {
      grid.values[index] = Math.max(grid.values[index] ?? 0, bumpProfile(bump, Math.sqrt(d2), relief));
    });
  }
  return grid;
}

/** The skin's relief over the map's layout, every `resolution` layout units, by scale and summed: level wherever no file swells it or no cell's body rises. */
export function heightfield(map: MapJson, resolution: number, relief: Relief = RELIEF): Heightfield {
  const swell = swells(map, gridFor(map, resolution), relief);
  const mass = masses(map, gridFor(map, resolution), relief);
  const height = gridFor(map, resolution);
  for (let i = 0; i < height.values.length; i += 1) {
    height.values[i] = (swell.values[i] ?? 0) + (mass.values[i] ?? 0);
  }
  return { swell, mass, height };
}
