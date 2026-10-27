/**
 * composites: a repo past 5,000 files drawn a package at a time (§15's R1,
 * C14). At the surface each package stands as one composite, Nx style: its
 * own skin over one body, none of the cells it holds drawn inside it and none
 * of its files, until the camera nears it. A package nears once its skin
 * fills a share of the free screen, as the cell's gate reads a cell (D165),
 * and holds open while it fills a lesser share, so a zoom that jitters across
 * the gate never flips it; past the surface, at the cell's level and on,
 * every package is open, so a cell opens as a slide only inside an open
 * package. The weather is the change's and is drawn whatever stands under it.
 *
 * The scene lays what the world needs for it: the composites, the grid that
 * says which package's skin each sample of the skin lies under, and the
 * tissue a composite wears, which is the base tissue with no cell inside a
 * package; the scheduler eases each between the two (C12). Pure (C1).
 */

import type { MapJson } from 'core';

import { gridFor } from './heightfield.js';
import type { Grid } from './heightfield.js';
import { tissue } from './membranes.js';
import type { Tissue, TissueLook } from './membranes.js';
import { openRing, scanRing } from './raster.js';

/** How many placed files a repo holds before its packages stand as composites at the surface (C14). */
export const COMPOSITE_FILES = 5_000;

/** A package drawn as one: its cell, its number on the composite grid from 1, every file and cell beneath it, and the box its skin spans. */
export type Composite = {
  readonly id: string;
  readonly number: number;
  readonly files: readonly string[];
  readonly cells: readonly string[];
  readonly box: { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };
};

/**
 * The composite's gate, beside the cell's (D165): the share of the free
 * screen, in whichever of its width and height it fills first, a package
 * opens at, and the share it holds open at. Below the cell's own gate, so a
 * package is open before any cell in it fills enough to open as a slide.
 */
export type CompositeGate = { readonly open: number; readonly close: number };

export const COMPOSITE_GATE: CompositeGate = { open: 0.35, close: 0.25 };

/** The level of detail from which every package is open: the cell's (§6). */
const OPEN_FROM = 2;

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * The map's composites, one per package with a skin, in id order and
 * numbered from 1; none for a repo of `threshold` placed files or fewer,
 * which is drawn cell by cell as it always was.
 */
export function compositesOf(map: MapJson, threshold: number = COMPOSITE_FILES): readonly Composite[] {
  const layout = map.terrain.layout;
  if (layout === undefined) return [];
  const placed = map.terrain.organelles.filter((organelle) => layout.positions[organelle.id] !== undefined);
  if (placed.length <= threshold) return [];
  const parentOf = new Map(map.terrain.cells.flatMap((cell) => (cell.parent === undefined ? [] : [[cell.id, cell.parent] as const])));
  /** The package a cell lies in, itself for a package; none for a cell no package holds. */
  const packageOf = (cell: string): string | undefined => {
    let at: string | undefined = cell;
    for (let steps = 0; at !== undefined && steps <= map.terrain.cells.length; steps += 1) {
      const up = parentOf.get(at);
      if (up === undefined) return at;
      at = up;
    }
    return undefined;
  };
  const packages = new Set(map.terrain.cells.filter((cell) => cell.kind === 'package' && (layout.contours?.[cell.id]?.length ?? 0) >= 3).map((cell) => cell.id));
  const files = new Map<string, string[]>();
  for (const organelle of placed) {
    const owner = packageOf(organelle.cell);
    if (owner !== undefined && packages.has(owner)) files.set(owner, [...(files.get(owner) ?? []), organelle.id]);
  }
  const cells = new Map<string, string[]>();
  for (const cell of map.terrain.cells) {
    const owner = packageOf(cell.id);
    if (owner !== undefined && owner !== cell.id && packages.has(owner)) cells.set(owner, [...(cells.get(owner) ?? []), cell.id]);
  }
  return [...packages].toSorted(byPath).map((id, index) => {
    const ring = layout.contours?.[id] ?? [];
    const xs = ring.map(([x]) => x);
    const ys = ring.map(([, y]) => y);
    return {
      id,
      number: index + 1,
      files: (files.get(id) ?? []).toSorted(byPath),
      cells: (cells.get(id) ?? []).toSorted(byPath),
      box: { x0: xs.reduce((low, x) => Math.min(low, x)), y0: ys.reduce((low, y) => Math.min(low, y)), x1: xs.reduce((high, x) => Math.max(high, x)), y1: ys.reduce((high, y) => Math.max(high, y)) },
    };
  });
}

/** Which composite's skin each sample lies under, by its number, 0 under none, at the skin's `resolution`. */
export function compositeGrid(map: MapJson, composites: readonly Composite[], resolution: number): Grid {
  const grid = gridFor(map, resolution);
  const contours = map.terrain.layout?.contours ?? {};
  for (const composite of composites) {
    scanRing(grid, openRing(contours[composite.id] ?? []), (index) => {
      grid.values[index] = composite.number;
    });
  }
  return grid;
}

/** The tissue a composite wears: the base tissue laid with no cell a package holds, so each package is its own skin over one body. */
export function compositeTissue(map: MapJson, composites: readonly Composite[], resolution: number, look?: TissueLook): Tissue {
  const inner = new Set(composites.flatMap((composite) => composite.cells));
  return tissue({ ...map, terrain: { ...map.terrain, cells: map.terrain.cells.filter((cell) => !inner.has(cell.id)) } }, resolution, look);
}

/** How the view stands over one composite this frame: the share of the free screen its skin fills, and whether any of it is on the screen. */
export type CompositeView = { readonly fill: number; readonly seen: boolean };

/**
 * Which composites are open this frame, in the order given, from which were
 * open the frame before: every one from the cell's level on; below it, one on
 * the screen that fills the gate's `open` share, or was open and still fills
 * its `close` share.
 */
export function compositesOpen(previous: readonly boolean[], views: readonly CompositeView[], lod: number, gate: CompositeGate = COMPOSITE_GATE): readonly boolean[] {
  return views.map((view, index) => lod >= OPEN_FROM || (view.seen && view.fill >= (previous[index] === true ? gate.close : gate.open)));
}
