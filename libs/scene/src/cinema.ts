/**
 * cinema: how a still for a pull request's comment is framed (D174, D175). A
 * comment's reader cannot zoom, so the still frames what the change is about
 * rather than the tab's opening frame, which is the far field's planet, a dot
 * at a comment's size: the box round every target a notice names and every
 * changed file the terrain places, filling a share of the picture. The zoom
 * over the fit is held between just past the surface's gate, so the still is
 * never the planet, and short of the cells' level, so it is never a file's
 * plate. The world's `?cinema` page stands its camera here, and the comment's
 * flat still, the minimap zoomed in, frames its drawing here, so the two
 * frame one change alike. Pure, so a test reads it straight (C3).
 */

import type { MapJson } from 'core';

import type { Bounds, MinimapFrame, Point } from './minimap.js';

/** How a cinema still is framed: the share of the picture the change's box fills, and the farthest and nearest zoom over the fit it may stand at. */
export type CinemaLook = { readonly share: number; readonly farthest: number; readonly nearest: number };

/**
 * The share of the picture the box round the change's notices and files
 * fills, and the farthest and nearest zoom over the fit the still may stand
 * at, just past the surface's gate (`LOD_GATES`, 1.7) and short of the cells'
 * level (6), so it is never the far field's planet nor a file's plate.
 */
export const CINEMA: CinemaLook = { share: 0.7, farthest: 2, nearest: 3 };

/** Where a still stands: its zoom over the fit, and the layout point at its middle. */
export type CinemaFocus = { readonly zoom: number; readonly centre: Point };

type Extent = { readonly width: number; readonly height: number };

/**
 * The points a set of targets covers on the terrain: a file by its place and
 * edge, a cell by its skin. A shore file has a place in the layout's strip
 * above the terraces, but neither the world nor the minimap draws the shore
 * on the field, so it frames nothing.
 */
const pointsOf = (map: MapJson, targets: readonly string[]): readonly Point[] => {
  const layout = map.terrain.layout;
  if (layout === undefined) return [];
  const files = new Set(map.terrain.organelles.map((organelle) => organelle.id));
  const cells = new Set(map.terrain.cells.map((cell) => cell.id));
  return targets.flatMap((target): readonly Point[] => {
    const at = files.has(target) ? layout.positions[target] : undefined;
    if (at !== undefined) return [[at.x - at.r, at.y - at.r], [at.x + at.r, at.y + at.r]];
    return cells.has(target) ? (layout.contours?.[target] ?? []) : [];
  });
};

/** The box round some points, folded rather than spread, or none for none. */
const boxOf = (points: readonly Point[]): Bounds | undefined =>
  points.reduce<Bounds | undefined>((box, [x, y]) => (box === undefined ? { x0: x, y0: y, x1: x, y1: y } : { x0: Math.min(box.x0, x), y0: Math.min(box.y0, y), x1: Math.max(box.x1, x), y1: Math.max(box.y1, y) }), undefined);

/** A box's middle. */
const middleOf = (box: Bounds): Point => [(box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2];

/** Pixels per layout unit at zoom 1, where the whole layout fits the picture with no margin. */
const fitScale = (layout: Extent, width: number, height: number): number => 1 / Math.max(layout.width / Math.max(1, width), layout.height / Math.max(1, height));

/**
 * The zoom over the fit at which a box fills `share` of the picture in
 * whichever of its width and height it fills first. A box with no extent is
 * taken as a unit across.
 */
export const zoomOnto = (layout: Extent, box: Bounds, width: number, height: number, share: number): number =>
  Math.min((Math.max(1, width) * share) / Math.max(1, box.x1 - box.x0), (Math.max(1, height) * share) / Math.max(1, box.y1 - box.y0)) / fitScale(layout, width, height);

/**
 * Where a cinema still of this size stands. It frames the first of these
 * that fits at the surface: every notice's target and every changed file on
 * the terrain, else the notices' targets alone, the zoom held between the
 * look's two bounds. A change too wide for both is the widest surface still,
 * centred on the first notice's target, the one to look at first; a change
 * with nothing on the terrain, the field's middle.
 */
export const cinemaFocus = (map: MapJson, width: number, height: number, look: CinemaLook): CinemaFocus => {
  const layout = map.terrain.layout ?? { width: 1, height: 1 };
  const noticed = map.notices.map((notice) => notice.target);
  const boxes = [boxOf(pointsOf(map, [...noticed, ...map.weather.changed.map((file) => file.path)])), boxOf(pointsOf(map, noticed))].filter((box) => box !== undefined);
  for (const box of boxes) {
    const zoom = zoomOnto(layout, box, width, height, look.share);
    if (zoom >= look.farthest) return { zoom: Math.min(look.nearest, zoom), centre: middleOf(box) };
  }
  const first = boxOf(pointsOf(map, noticed.slice(0, 1))) ?? boxes[0];
  return { zoom: look.farthest, centre: first === undefined ? [layout.width / 2, layout.height / 2] : middleOf(first) };
};

/**
 * The flat frame a cinema still of this size draws the minimap in (D175):
 * the layout at the focus's zoom over the fit, its centre at the picture's
 * middle, so the flat still frames the change as the world's still does.
 */
export const cinemaFrame = (map: MapJson, width: number, height: number, look: CinemaLook): MinimapFrame => {
  const layout = map.terrain.layout ?? { width: 1, height: 1 };
  const { zoom, centre } = cinemaFocus(map, width, height, look);
  const scale = zoom * fitScale(layout, width, height);
  return { width, height, scale, x: centre[0] - width / 2 / scale, y: centre[1] - height / 2 / scale };
};
