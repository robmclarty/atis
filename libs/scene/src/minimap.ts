/**
 * minimap: the body in miniature, for the flat inset at the chrome's bottom
 * left (D154), so a reviewer zoomed into one cell keeps where it sits. It
 * says five things, each from the map alone: the body's silhouette, every
 * cell's contour laid together; how far the reach goes, each reached cell's
 * own territory at its luminance (D5, D161); the changed files the layout
 * placed; the notices on the field, each target's run of numbered boxes in
 * rank order (D148); and, from the camera, the view's outline on the ground.
 * The shore is the rail's (D153), so neither its groups nor their files show.
 *
 * Everything is laid in the inset's pixels, framed on the body's bounds and
 * thinned to what a pixel can hold, so the chrome draws it as it comes and a
 * test pins it. The frame maps a pixel back onto the layout, which is how a
 * click or a drag on the inset moves the camera. The view's outline is where
 * the frustum's corner rays meet the ground, so a tilt draws it as the
 * ground it shows rather than a rectangle. One input gives one inset (C3).
 */

import type { ChangeKind, MapJson, NoticeTier } from 'core';

import { noticeAnchors } from './labels.js';
import { openRing } from './raster.js';
import type { Ring } from './raster.js';
import { weatherOf } from './weather.js';

/** A point on the layout or in the inset: `x, y`, y down in both. */
export type Point = readonly [number, number];

/** A point in the world: x across the layout, y up off the ground, z down the layout. */
export type WorldPoint = readonly [number, number, number];

/**
 * How the layout lies in the inset: the inset's size in pixels, how many
 * pixels one layout unit takes, and the layout point at its top-left corner.
 */
export type MinimapFrame = {
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  readonly x: number;
  readonly y: number;
};

/** The room the inset may take, in pixels, and the margin it keeps inside its edge. */
export type MinimapBox = { readonly width: number; readonly height: number; readonly pad: number };

/** A reached cell's own ground in the inset: its contour and the cells it holds cut out of it, with its hops and its luminance. */
export type MinimapReach = { readonly cell: string; readonly hops: number; readonly luminance: number; readonly rings: readonly Ring[] };

/** A changed file the layout placed, at its centre in the inset. */
export type MinimapChange = { readonly path: string; readonly kind: ChangeKind; readonly x: number; readonly y: number };

/** One target's notices in the inset: its point and its notices' ranks and tiers, in rank order. */
export type MinimapNotice = {
  readonly target: string;
  readonly x: number;
  readonly y: number;
  readonly marked: readonly { readonly rank: number; readonly tier: NoticeTier }[];
};

export type Minimap = {
  readonly frame: MinimapFrame;
  /** Every cell's contour, thinned and wound one way, so filled together they are the body's one silhouette. */
  readonly silhouette: readonly Ring[];
  readonly reach: readonly MinimapReach[];
  readonly changed: readonly MinimapChange[];
  readonly notices: readonly MinimapNotice[];
};

/** How close two points of a ring may lie in the inset, in pixels, before the second is dropped. */
export const MINIMAP_STEP = 1;

type Bounds = { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** A layout point in the inset's pixels. */
export function toInset(frame: MinimapFrame, [x, y]: Point): Point {
  return [(x - frame.x) * frame.scale, (y - frame.y) * frame.scale];
}

/** A pixel of the inset back on the layout: where a click or a drag on it points. */
export function toLayout(frame: MinimapFrame, [px, py]: Point): Point {
  return [px / frame.scale + frame.x, py / frame.scale + frame.y];
}

/**
 * The inset over a stretch of the layout: as large as the box allows at the
 * stretch's own aspect, the margin kept inside each edge, so the inset is no
 * larger than what it shows. A stretch with no extent takes a unit.
 */
export function minimapFrame(bounds: Bounds, box: MinimapBox): MinimapFrame {
  const width = Math.max(1, bounds.x1 - bounds.x0);
  const height = Math.max(1, bounds.y1 - bounds.y0);
  const scale = Math.max(Number.MIN_VALUE, Math.min((box.width - 2 * box.pad) / width, (box.height - 2 * box.pad) / height));
  return { width: width * scale + 2 * box.pad, height: height * scale + 2 * box.pad, scale, x: bounds.x0 - box.pad / scale, y: bounds.y0 - box.pad / scale };
}

/** The least and the most of some numbers, folded rather than spread: a repo of many thousand files holds more edges than a call takes arguments. */
function low(values: readonly number[]): number {
  return values.reduce((least, value) => Math.min(least, value));
}

function high(values: readonly number[]): number {
  return values.reduce((most, value) => Math.max(most, value));
}

/** The body's bounds: every cell's contour and every placed terrain file, or the layout's box when neither is drawn. */
function boundsOf(map: MapJson): Bounds | undefined {
  const layout = map.terrain.layout;
  if (layout === undefined) return undefined;
  const xs: number[] = [];
  const ys: number[] = [];
  for (const cell of map.terrain.cells) {
    for (const [x, y] of layout.contours?.[cell.id] ?? []) {
      xs.push(x);
      ys.push(y);
    }
  }
  for (const organelle of map.terrain.organelles) {
    const at = layout.positions[organelle.id];
    if (at === undefined) continue;
    xs.push(at.x - at.r, at.x + at.r);
    ys.push(at.y - at.r, at.y + at.r);
  }
  if (xs.length === 0) return { x0: 0, y0: 0, x1: layout.width, y1: layout.height };
  return { x0: low(xs), y0: low(ys), x1: high(xs), y1: high(ys) };
}

/** Twice a ring's signed area, positive when it runs clockwise on a y-down page. */
function signedArea(ring: Ring): number {
  return ring.reduce((total, [x, y], index) => {
    const [nx, ny] = ring[(index + 1) % ring.length] ?? [x, y];
    return total + x * ny - nx * y;
  }, 0);
}

/**
 * A contour in the inset's pixels with every point closer than `step` to the
 * last one kept dropped, wound clockwise, or none when fewer than three
 * points are left to draw.
 */
export function thinRing(frame: MinimapFrame, contour: Ring, step: number = MINIMAP_STEP): Ring | undefined {
  const kept: Point[] = [];
  for (const point of openRing(contour)) {
    const [px, py] = toInset(frame, point);
    const last = kept.at(-1);
    if (last === undefined || Math.hypot(px - last[0], py - last[1]) >= step) kept.push([px, py]);
  }
  const first = kept[0];
  const last = kept.at(-1);
  if (kept.length > 3 && first !== undefined && last !== undefined && Math.hypot(last[0] - first[0], last[1] - first[1]) < step) kept.pop();
  if (kept.length < 3) return undefined;
  return signedArea(kept) < 0 ? kept.toReversed() : kept;
}

/** The middle of a contour: the mean of its points, where a notice on a cell hangs its marks. */
function middleOf(contour: Ring): Point | undefined {
  const ring = openRing(contour);
  if (ring.length === 0) return undefined;
  return [ring.reduce((total, [x]) => total + x, 0) / ring.length, ring.reduce((total, [, y]) => total + y, 0) / ring.length];
}

/** Each target's notices at its point on the field, in the order the targets first appear in the list; a shore group's are the rail's. */
function noticesOf(map: MapJson, frame: MinimapFrame): readonly MinimapNotice[] {
  const contours = map.terrain.layout?.contours ?? {};
  const runs = new Map<string, { readonly at: Point; readonly marked: { readonly rank: number; readonly tier: NoticeTier }[] }>();
  for (const { rank, notice, anchor } of noticeAnchors(map)) {
    if (anchor === undefined || anchor.kind === 'group') continue;
    const at = anchor.kind === 'cell' ? middleOf(contours[anchor.cell] ?? []) : ([anchor.x, anchor.y] as const);
    if (at === undefined) continue;
    const run = runs.get(notice.target) ?? { at, marked: [] };
    run.marked.push({ rank, tier: notice.tier });
    runs.set(notice.target, run);
  }
  return [...runs].map(([target, { at, marked }]) => {
    const [x, y] = toInset(frame, at);
    return { target, x, y, marked };
  });
}

/** The inset for a map within a box of pixels, or none when the map has no layout to draw (C2). */
export function minimapOf(map: MapJson, box: MinimapBox, step: number = MINIMAP_STEP): Minimap | undefined {
  const bounds = boundsOf(map);
  const layout = map.terrain.layout;
  if (bounds === undefined || layout === undefined) return undefined;
  const frame = minimapFrame(bounds, box);
  const contours = layout.contours ?? {};
  const cells = map.terrain.cells.toSorted((a, b) => byPath(a.id, b.id));
  const silhouette = cells.flatMap((cell) => {
    const ring = thinRing(frame, contours[cell.id] ?? [], step);
    return ring === undefined ? [] : [ring];
  });
  const weather = weatherOf(map);
  const reach = weather.cells.flatMap(({ cell, reach: lit }): MinimapReach[] => {
    if (lit === undefined) return [];
    const outer = thinRing(frame, contours[cell] ?? [], step);
    if (outer === undefined) return [];
    const holes = lit.holes.flatMap((hole) => {
      const ring = thinRing(frame, contours[hole] ?? [], step);
      return ring === undefined ? [] : [ring];
    });
    return [{ cell, hops: lit.hops, luminance: lit.luminance, rings: [outer, ...holes] }];
  });
  const changed = weather.files.flatMap(({ path, change }): MinimapChange[] => {
    const at = layout.positions[path];
    if (change === undefined || at === undefined) return [];
    const [x, y] = toInset(frame, [at.x, at.y]);
    return [{ path, kind: change.kind, x, y }];
  });
  return { frame, silhouette, reach, changed, notices: noticesOf(map, frame) };
}

/** Where the line through two points of the world meets the ground, as a layout point, or none when it runs level with it. */
export function groundOf(near: WorldPoint, far: WorldPoint): Point | undefined {
  const dy = far[1] - near[1];
  if (dy === 0) return undefined;
  const t = -near[1] / dy;
  return [near[0] + t * (far[0] - near[0]), near[2] + t * (far[2] - near[2])];
}

/**
 * The view's outline on the ground: where each of the frustum's corner rays,
 * given as a point on its near plane and one on its far plane, meets it, in
 * the corners' order. None when any ray runs level with the ground, since
 * then the view has no outline there.
 */
export function viewOutline(corners: readonly (readonly [WorldPoint, WorldPoint])[]): readonly Point[] | undefined {
  const outline: Point[] = [];
  for (const [near, far] of corners) {
    const point = groundOf(near, far);
    if (point === undefined) return undefined;
    outline.push(point);
  }
  return outline;
}
