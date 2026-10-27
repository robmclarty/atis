/**
 * minimap: the body in miniature, for the flat inset at the chrome's bottom
 * left (D154), so a reviewer zoomed into one cell keeps where it sits. It
 * says five things, each from the map alone: the body's silhouette, every
 * cell's contour laid together; how far the reach goes, each reached cell's
 * own territory at its luminance (D5, D161); the changed files the layout
 * placed; the notices on the field, each target's run of numbered boxes in
 * rank order (D148); and, from the camera, the view's outline on the ground.
 * The shore is the rail's (D153), so neither its groups nor their files show.
 * Beneath the weather it also carries each cell's skin and every file the
 * terrain places, at its own size, which the inset draws wherever they hold
 * a pixel; the comment's still and the README's fingerprint are this same
 * drawing as if the inset were zoomed in (D175), framed on the change or on
 * the whole terrain at a fixed size rather than on the body at the inset's.
 *
 * Everything is laid in the inset's pixels, framed on the body's bounds and
 * thinned to what a pixel can hold, so the chrome draws it as it comes and a
 * test pins it. The frame maps a pixel back onto the layout, which is how a
 * click or a drag on the inset moves the camera. The view's outline is where
 * the frustum's corner rays meet the ground, so a tilt draws it as the
 * ground it shows rather than a rectangle. One input gives one inset (C3).
 */

import type { ChangeKind, MapJson, NoticeTier } from 'core';

import { nameOf, noticeAnchors, onRing, overlaps, spotsAround } from './labels.js';
import type { LabelBox } from './labels.js';
import { MONO_ADVANCE } from './tokens.js';
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

/** A file the terrain places, at its centre in the inset, with its radius there: its mass (C11). */
export type MinimapFile = { readonly path: string; readonly x: number; readonly y: number; readonly r: number };

/** A changed file the layout placed, at its centre in the inset, with its radius there. */
export type MinimapChange = { readonly path: string; readonly kind: ChangeKind; readonly x: number; readonly y: number; readonly r: number };

/** One target's notices in the inset: its point, the radius of the file it names (none for a cell), and its notices' ranks and tiers, in rank order. */
export type MinimapNotice = {
  readonly target: string;
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly marked: readonly { readonly rank: number; readonly tier: NoticeTier }[];
};

export type Minimap = {
  readonly frame: MinimapFrame;
  /** Every cell's contour, thinned and wound one way, so filled together they are the body's one silhouette, and each drawn round is a cell's skin. */
  readonly silhouette: readonly Ring[];
  readonly files: readonly MinimapFile[];
  readonly reach: readonly MinimapReach[];
  readonly changed: readonly MinimapChange[];
  readonly notices: readonly MinimapNotice[];
};

/**
 * The minimap's look (D154), the inset's and the stills' drawn as it
 * (D175): flat chrome, never glowing (D12). The inset takes at most this much
 * room and keeps this margin inside its frame. The body is flat in one grey,
 * each cell's skin drawn round in a hairline of its own ink, and a reached
 * cell's own ground lays the reach's hue over it at its luminance times this
 * share, flattened as the legend flattens the world's one translucent ink.
 * A file is a flat disc at its own size in a lighter grey, drawn once it is
 * at least this many pixels across; a changed file is a dot in the change
 * hue at least this radius; and the view is outlined in this ink at this
 * width. The dev panel moves each live in the inset (D156).
 */
export type MinimapLook = {
  readonly width: number;
  readonly height: number;
  readonly pad: number;
  readonly body: string;
  readonly skin: string;
  readonly reachShare: number;
  readonly file: string;
  readonly fileFloor: number;
  readonly changedR: number;
  readonly view: string;
  readonly viewWidth: number;
};

export const MINIMAP: MinimapLook = { width: 240, height: 180, pad: 6, body: '#333c47', skin: '#4b5664', reachShare: 0.55, file: '#5a6573', fileFloor: 1.5, changedR: 1.5, view: '#e6edf3', viewWidth: 1 };

/** How close two points of a ring may lie in the inset, in pixels, before the second is dropped. */
export const MINIMAP_STEP = 1;

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** The least and the most of a stretch of the layout. */
export type Bounds = { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };

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

/**
 * A frame of a fixed size over a stretch of the layout: the stretch as large
 * as the box allows at its own aspect, the margin kept inside each edge, and
 * centred, so the frame is always the box's size whatever it shows.
 */
export function fixedFrame(bounds: Bounds, box: MinimapBox): MinimapFrame {
  const fitted = minimapFrame(bounds, box);
  return { ...fitted, width: box.width, height: box.height, x: fitted.x - (box.width - fitted.width) / 2 / fitted.scale, y: fitted.y - (box.height - fitted.height) / 2 / fitted.scale };
}

/** The least and the most of some numbers, folded rather than spread: a repo of many thousand files holds more edges than a call takes arguments. */
function low(values: readonly number[]): number {
  return values.reduce((least, value) => Math.min(least, value));
}

function high(values: readonly number[]): number {
  return values.reduce((most, value) => Math.max(most, value));
}

/** The body's bounds: every cell's contour and every placed terrain file, or the layout's box when neither is drawn; none with no layout. */
export function bodyBounds(map: MapJson): Bounds | undefined {
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
  const layout = map.terrain.layout;
  const contours = layout?.contours ?? {};
  const runs = new Map<string, { readonly at: Point; readonly r: number; readonly marked: { readonly rank: number; readonly tier: NoticeTier }[] }>();
  for (const { rank, notice, anchor } of noticeAnchors(map)) {
    if (anchor === undefined || anchor.kind === 'group') continue;
    const at = anchor.kind === 'cell' ? middleOf(contours[anchor.cell] ?? []) : ([anchor.x, anchor.y] as const);
    if (at === undefined) continue;
    const r = anchor.kind === 'cell' ? 0 : (layout?.positions[notice.target]?.r ?? 0) * frame.scale;
    const run = runs.get(notice.target) ?? { at, r, marked: [] };
    run.marked.push({ rank, tier: notice.tier });
    runs.set(notice.target, run);
  }
  return [...runs].map(([target, { at, r, marked }]) => {
    const [x, y] = toInset(frame, at);
    return { target, x, y, r, marked };
  });
}

/**
 * Where a target's run of boxes stands in the inset, its top-left corner: off
 * the target's lower right, past the file's own disc or the changed dot,
 * whichever is wider, as the world hangs it past the ring, so the mark under
 * it still shows.
 */
export function runAt(notice: MinimapNotice, look: Pick<MinimapLook, 'changedR'>): Point {
  const past = Math.max(notice.r * Math.SQRT1_2, look.changedR) + 1;
  return [notice.x + past, notice.y + past];
}

/** The inset for a map within a box of pixels, framed on its body, or none when the map has no layout to draw (C2). */
export function minimapOf(map: MapJson, box: MinimapBox, step: number = MINIMAP_STEP): Minimap | undefined {
  const bounds = bodyBounds(map);
  return bounds === undefined ? undefined : minimapIn(map, minimapFrame(bounds, box), step);
}

/** Whether a stretch of the inset, given by its least and most corners, reaches into the frame. */
const inFrame = (frame: MinimapFrame, x0: number, y0: number, x1: number, y1: number): boolean => x1 >= 0 && y1 >= 0 && x0 <= frame.width && y0 <= frame.height;

/** Whether a ring in the inset's pixels reaches into the frame. */
const ringInFrame = (frame: MinimapFrame, ring: Ring): boolean => inFrame(frame, low(ring.map(([x]) => x)), low(ring.map(([, y]) => y)), high(ring.map(([x]) => x)), high(ring.map(([, y]) => y)));

/** A contour thinned into the inset, or none when too little of it is left to draw or none of it reaches into the frame. */
const ringIn = (frame: MinimapFrame, contour: Ring, step: number): Ring | undefined => {
  const ring = thinRing(frame, contour, step);
  return ring !== undefined && ringInFrame(frame, ring) ? ring : undefined;
};

/**
 * The minimap's drawing of a map in a frame of its own choosing, as if the
 * inset were zoomed onto that stretch of the layout (D175). A skin, a file, a
 * reached cell or a notice's point that falls wholly outside the frame is
 * left out, so a still framed on a corner of a large repository draws that
 * corner alone; the inset's own frame holds the whole body, so it leaves out
 * nothing. None when the map has no layout to draw (C2).
 */
export function minimapIn(map: MapJson, frame: MinimapFrame, step: number = MINIMAP_STEP): Minimap | undefined {
  const layout = map.terrain.layout;
  if (layout === undefined) return undefined;
  const contours = layout.contours ?? {};
  const cells = map.terrain.cells.toSorted((a, b) => byPath(a.id, b.id));
  const silhouette = cells.flatMap((cell) => {
    const ring = ringIn(frame, contours[cell.id] ?? [], step);
    return ring === undefined ? [] : [ring];
  });
  const files = map.terrain.organelles
    .toSorted((a, b) => byPath(a.id, b.id))
    .flatMap(({ id }): MinimapFile[] => {
      const at = layout.positions[id];
      if (at === undefined) return [];
      const [x, y] = toInset(frame, [at.x, at.y]);
      const r = at.r * frame.scale;
      return inFrame(frame, x - r, y - r, x + r, y + r) ? [{ path: id, x, y, r }] : [];
    });
  const weather = weatherOf(map);
  const reach = weather.cells.flatMap(({ cell, reach: lit }): MinimapReach[] => {
    if (lit === undefined) return [];
    const outer = ringIn(frame, contours[cell] ?? [], step);
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
    const r = at.r * frame.scale;
    return inFrame(frame, x - r, y - r, x + r, y + r) ? [{ path, kind: change.kind, x, y, r }] : [];
  });
  const notices = noticesOf(map, frame).filter(({ x, y }) => inFrame(frame, x, y, x, y));
  return { frame, silhouette, files, reach, changed, notices };
}

/**
 * A notice target's callout in a still (D175): its short name, its notices'
 * ranks and tiers, its box in the frame, the target's radius there (none for
 * a cell's middle, where nothing else marks the point), and the leader from
 * the target's own edge to the box's nearest edge.
 */
export type Callout = {
  readonly target: string;
  readonly text: string;
  readonly r: number;
  readonly marked: MinimapNotice['marked'];
  readonly box: LabelBox;
  readonly leader: readonly [Point, Point];
};

/**
 * How a callout is set, in the frame's pixels: its type size, the padding
 * inside its box, its numbered boxes' side and the gap between them, the gap
 * from the last box to its name, how far off its target it starts looking
 * for clear ground, and the dot a leader ends on where no file is drawn.
 */
export type CalloutLook = { readonly fontSize: number; readonly pad: number; readonly box: number; readonly boxGap: number; readonly textGap: number; readonly gap: number; readonly end: number };

/** How many steps out, each a callout's height, a callout looks for clear ground before it takes the next looser rule. */
const CALLOUT_RINGS = 64;

/** The point of a box nearest a point outside it, or the point itself inside. */
const nearestOn = (box: LabelBox, [x, y]: Point): Point => [Math.min(Math.max(x, box.x), box.x + box.width), Math.min(Math.max(y, box.y), box.y + box.height)];

/** Whether a box falls on a ring in the inset, its bounds checked first so a far ring is passed without walking its edges. */
const onSkin = (box: LabelBox, ring: Ring): boolean => {
  const xs = ring.map(([x]) => x);
  const ys = ring.map(([, y]) => y);
  const [x0, y0] = [low(xs), low(ys)];
  return overlaps({ x: x0, y: y0, width: high(xs) - x0, height: high(ys) - y0 }, box) && onRing(box, ring);
};

/**
 * The callouts a still hangs on the targets of the notices it frames, one
 * per target in rank order, so the numbered boxes stand off the terrain with
 * the name beside them rather than on it: each where it first finds clear
 * ground stepping out from its target, wholly inside the frame and clear of
 * every callout placed before it. It looks first for ground off every skin,
 * away from the body, then for ground off its own cell and every file, and
 * then for anywhere in the frame, so a still framed tight on the body still
 * names its targets. A target none of these places in the frame goes
 * unnamed in the still, as one outside the frame does; the comment's list
 * names it either way. One input gives one placement (C3).
 */
export function calloutsOf(map: MapJson, drawn: Minimap, look: CalloutLook): readonly Callout[] {
  const { frame } = drawn;
  const contours = map.terrain.layout?.contours ?? {};
  const cellOf = new Map(map.terrain.organelles.map((organelle) => [organelle.id, organelle.cell] as const));
  const added = new Set(map.weather.changed.flatMap((file) => (file.kind === 'added' ? [file.path] : [])));
  const skins = drawn.silhouette;
  const discs = drawn.files.map(({ x, y, r }): LabelBox => ({ x: x - r, y: y - r, width: 2 * r, height: 2 * r }));
  const height = Math.max(look.box, look.fontSize) + 2 * look.pad;
  const placed: Callout[] = [];
  const inside = (box: LabelBox): boolean => box.x >= look.pad && box.y >= look.pad && box.x + box.width <= frame.width - look.pad && box.y + box.height <= frame.height - look.pad;
  const free = (box: LabelBox): boolean => inside(box) && placed.every((callout) => !overlaps(callout.box, box));
  for (const run of drawn.notices) {
    const text = nameOf(run.target, added.has(run.target));
    const boxes = run.marked.length * look.box + (run.marked.length - 1) * look.boxGap;
    const width = 2 * look.pad + boxes + look.textGap + text.length * look.fontSize * MONO_ADVANCE;
    const own = thinRing(frame, contours[cellOf.get(run.target) ?? run.target] ?? []);
    // Each rule, and the reach it starts at: the last starts at the target's middle, since a file wider than the frame has no edge in it to stand off.
    const rules: readonly (readonly [(box: LabelBox) => boolean, number])[] = [
      [(box) => free(box) && skins.every((ring) => !onSkin(box, ring)), run.r + look.gap],
      [(box) => free(box) && (own === undefined || !onSkin(box, own)) && discs.every((disc) => !overlaps(disc, box)), run.r + look.gap],
      [free, look.gap],
    ];
    const spot = rules.reduce<LabelBox | undefined>((found, [rule, from]) => {
      if (found !== undefined) return found;
      for (let ring = 0; ring < CALLOUT_RINGS; ring += 1) {
        const clear = spotsAround(run.x, run.y, from + ring * height, width, height).find(rule);
        if (clear !== undefined) return clear;
      }
      return undefined;
    }, undefined);
    if (spot === undefined) continue;
    const to = nearestOn(spot, [run.x, run.y]);
    const length = Math.hypot(to[0] - run.x, to[1] - run.y);
    const from: Point = length === 0 ? [run.x, run.y] : [run.x + ((to[0] - run.x) * run.r) / length, run.y + ((to[1] - run.y) * run.r) / length];
    placed.push({ target: run.target, text, r: run.r, marked: run.marked, box: spot, leader: [from, to] });
  }
  return placed;
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
