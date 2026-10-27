/**
 * cinema: the world framed as a still for a pull request's comment (D108),
 * the page's `?cinema`. A comment's reader cannot zoom, so the still frames
 * what the change is about rather than the tab's opening frame, which is the
 * far field's planet, a dot at a comment's size: the box round every target
 * a notice names and every changed file the terrain places, filling a share
 * of the screen, with no chrome beside it. The zoom is held between just
 * past the surface's gate, so the still is never the planet, and short of
 * the cells' level, so it is never a file's plate. Pure, so a test reads it
 * straight.
 */

import type { MapJson } from 'core';
import type { Point } from 'scene';

import { zoomFor } from './fit.js';
import type { Box } from './fit.js';
import type { View } from './view.js';

/** How a cinema still is framed: the share of the screen the change's box fills, and the farthest and nearest zoom over the fit it may stand at. */
export type CinemaLook = { readonly share: number; readonly farthest: number; readonly nearest: number };

/** No chrome claims the screen in a still. */
const NO_RAIL = { right: 0 } as const;

/**
 * The points a set of targets covers on the terrain: a file by its place and
 * edge, a cell by its skin. A shore file has a place in the layout's strip
 * above the terraces, but the world draws the shore in the rail, not on the
 * field, so it frames nothing.
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

/** The box round some points, or none for none. */
const boxOf = (points: readonly Point[]): Box | undefined =>
  points.length === 0
    ? undefined
    : { x0: Math.min(...points.map(([x]) => x)), y0: Math.min(...points.map(([, y]) => y)), x1: Math.max(...points.map(([x]) => x)), y1: Math.max(...points.map(([, y]) => y)) };

/** A box's middle. */
const middleOf = (box: Box): Point => [(box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2];

/**
 * The view a cinema still opens at on a canvas of this size. It frames the
 * first of these that fits at the surface: every notice's target and every
 * changed file on the terrain, else the notices' targets alone, the zoom
 * held between the look's two bounds. A change too wide for both is the
 * widest surface still, centred on the first notice's target, the one to
 * look at first; a change with nothing on the terrain, the field's middle.
 */
export const cinemaView = (map: MapJson, view: View, width: number, height: number, look: CinemaLook): View => {
  const layout = map.terrain.layout ?? { width: 1, height: 1 };
  const noticed = map.notices.map((notice) => notice.target);
  const boxes = [boxOf(pointsOf(map, [...noticed, ...map.weather.changed.map((file) => file.path)])), boxOf(pointsOf(map, noticed))].filter((box) => box !== undefined);
  for (const box of boxes) {
    const zoom = zoomFor(layout, box, width, height, NO_RAIL, look.share);
    if (zoom >= look.farthest) return { ...view, zoom: Math.min(look.nearest, zoom), centre: middleOf(box) };
  }
  const first = boxOf(pointsOf(map, noticed.slice(0, 1))) ?? boxes[0];
  return { ...view, zoom: look.farthest, centre: first === undefined ? [layout.width / 2, layout.height / 2] : middleOf(first) };
};
