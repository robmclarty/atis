/**
 * picking: what the pointer is over, at every level of detail. The world
 * hands in the layout point under the pointer, the level it is at, and how
 * far a pixel reaches on the ground, and gets back the organelle there, else
 * the membrane of the innermost cell whose skin holds the point, else open
 * ground. A file reaches out by a few pixels past its edge, so a file too
 * small to aim at still answers, and the nearest edge wins between two. At
 * the far field (LOD0) the files are not drawn, only the change and the
 * notices as points of light (§6), so only those answer there and the rest
 * of the ground answers as its cells.
 *
 * The cells are picked against the triangles their skins are cut into
 * (`membranes`), teeth and all, smallest first so a cell nested in another
 * answers before the cell that holds it. The shore is the rail's (D153), and
 * the rail's blocks take the pointer themselves as DOM, so no shore group is
 * ever picked here, and a test file, which the layout never places (D4),
 * answers as nothing of its own.
 *
 * The point under the pointer is where its ray meets the skin, not the flat
 * ground, so a tilted view picks the file the reviewer sees on a raised
 * terrace rather than the one behind it: `surfacePoint` walks the ray down
 * through the relief. Pure: no three and no DOM (C1), so a test picks on a
 * fixture's own geometry.
 */

import type { MapJson } from 'core';

import { instances } from './instances.js';
import type { Lod } from './labels.js';
import { noticeAnchors } from './labels.js';
import { membranes } from './membranes.js';
import type { Point, WorldPoint } from './minimap.js';
import { weatherOf } from './weather.js';

/** What the pointer is over: a placed file, with its cell, centre and radius, or a cell by its membrane. */
export type Pick =
  | { readonly kind: 'organelle'; readonly path: string; readonly cell: string; readonly x: number; readonly y: number; readonly r: number }
  | { readonly kind: 'membrane'; readonly cell: string };

export type Picker = {
  /** What lies under a layout point at a level of detail, a file reaching `slop` layout units past its edge; none on open ground. */
  readonly pick: (point: Point, lod: Lod, slop: number) => Pick | undefined;
};

/** A cell's skin as the picker reads it: its triangles' corners, its bounding box, and its area, by which nested cells are ordered. */
type Skin = {
  readonly cell: string;
  readonly vertices: Float32Array;
  readonly triangles: Uint32Array;
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  readonly area: number;
};

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Twice the signed area of a triangle. */
function cross(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

/** Whether a point lies in a triangle or on its edge, whichever way the triangle winds. */
function inTriangle(px: number, py: number, ax: number, ay: number, bx: number, by: number, cx: number, cy: number): boolean {
  const d1 = cross(px, py, ax, ay, bx, by);
  const d2 = cross(px, py, bx, by, cx, cy);
  const d3 = cross(px, py, cx, cy, ax, ay);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}

/** Each cell's skin with its box and its area, smallest first, ties by path. */
function skinsOf(map: MapJson): readonly Skin[] {
  return membranes(map)
    .map(({ cell, vertices, triangles }): Skin => {
      const xs = vertices.filter((_, index) => index % 2 === 0);
      const ys = vertices.filter((_, index) => index % 2 === 1);
      let area = 0;
      for (let t = 0; t < triangles.length; t += 3) {
        const [a, b, c] = [triangles[t] ?? 0, triangles[t + 1] ?? 0, triangles[t + 2] ?? 0];
        area += Math.abs(cross(vertices[2 * a] ?? 0, vertices[2 * a + 1] ?? 0, vertices[2 * b] ?? 0, vertices[2 * b + 1] ?? 0, vertices[2 * c] ?? 0, vertices[2 * c + 1] ?? 0)) / 2;
      }
      return { cell, vertices, triangles, x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys), area };
    })
    .toSorted((a, b) => a.area - b.area || byPath(a.cell, b.cell));
}

/** Whether a cell's skin holds a point. */
function holds(skin: Skin, x: number, y: number): boolean {
  if (x < skin.x0 || x > skin.x1 || y < skin.y0 || y > skin.y1) return false;
  const { vertices: v, triangles } = skin;
  for (let t = 0; t < triangles.length; t += 3) {
    const [a, b, c] = [triangles[t] ?? 0, triangles[t + 1] ?? 0, triangles[t + 2] ?? 0];
    if (inTriangle(x, y, v[2 * a] ?? 0, v[2 * a + 1] ?? 0, v[2 * b] ?? 0, v[2 * b + 1] ?? 0, v[2 * c] ?? 0, v[2 * c + 1] ?? 0)) return true;
  }
  return false;
}

/** The files lit at the far field: the change's, and each notice's target the layout placed. */
function litOf(map: MapJson): ReadonlySet<string> {
  const lit = new Set(weatherOf(map).files.flatMap((file) => (file.change === undefined ? [] : [file.path])));
  for (const { anchor } of noticeAnchors(map)) if (anchor?.kind === 'organelle') lit.add(anchor.path);
  return lit;
}

/** The picker over a map's own geometry, laid out once. */
export function createPicker(map: MapJson): Picker {
  const files = instances(map);
  const lit = litOf(map);
  const skins = skinsOf(map);
  const pick = ([x, y]: Point, lod: Lod, slop: number): Pick | undefined => {
    let best: (typeof files)[number] | undefined;
    let bestGap = Number.POSITIVE_INFINITY;
    for (const file of files) {
      if (lod === 0 && !lit.has(file.id)) continue;
      // How far past the file's edge the point lies; inside it, below nothing.
      const gap = Math.hypot(x - file.x, y - file.y) - file.r;
      if (gap <= slop && gap < bestGap) {
        best = file;
        bestGap = gap;
      }
    }
    if (best !== undefined) return { kind: 'organelle', path: best.id, cell: best.cell, x: best.x, y: best.y, r: best.r };
    const skin = skins.find((each) => holds(each, x, y));
    return skin === undefined ? undefined : { kind: 'membrane', cell: skin.cell };
  };
  return { pick };
}

/** How many steps a ray is walked down through the relief before the crossing is narrowed. */
const MARCH_STEPS = 64;
/** How many halvings narrow the crossing once found. */
const BISECTIONS = 16;

/**
 * Where the line through two points of the world first meets the skin,
 * walking down from the height `top`, which no point of the skin rises above,
 * to the ground: a layout point. The relief is read through `heightAt`. A
 * ray that never meets it, or runs level, meets the flat ground, and failing
 * that nothing.
 */
export function surfacePoint(near: WorldPoint, far: WorldPoint, heightAt: (x: number, y: number) => number, top: number): Point | undefined {
  const dy = far[1] - near[1];
  if (dy === 0) return undefined;
  const at = (height: number): WorldPoint => {
    const t = (height - near[1]) / dy;
    return [near[0] + t * (far[0] - near[0]), height, near[2] + t * (far[2] - near[2])];
  };
  /** How far the ray at this height stands above the skin under it. */
  const clearance = (height: number): number => {
    const [px, , pz] = at(height);
    return height - heightAt(px, pz);
  };
  let above = Math.max(0, top);
  for (let step = 1; step <= MARCH_STEPS; step += 1) {
    const height = Math.max(0, top) * (1 - step / MARCH_STEPS);
    if (clearance(height) <= 0) {
      let below = height;
      for (let halving = 0; halving < BISECTIONS; halving += 1) {
        const middle = (above + below) / 2;
        if (clearance(middle) > 0) above = middle;
        else below = middle;
      }
      const [px, , pz] = at(below);
      return [px, pz];
    }
    above = height;
  }
  const [px, , pz] = at(0);
  return [px, pz];
}
