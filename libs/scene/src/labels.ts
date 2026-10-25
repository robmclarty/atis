/**
 * labels: where each notice anchors, and which labels the world writes at
 * each level of detail, placed so no two collide.
 *
 * A notice anchors to the nearest thing the map draws for its target (D148):
 * its organelle when the layout placed one; else, for a test file, the stitch
 * it draws on the first file it imports, by path; else a cell's skin; else,
 * for a shore file or a shore group, the group's block, wherever the renderer
 * draws the shore (D153). Only a target with none of these is unplaced. Both
 * renderers ring and box a notice there, and the world breathes the primary
 * there (step 34).
 *
 * Labels are DOM text laid over the world (D91), so they are placed in the
 * screen's pixels over the viewport the camera shows. From LOD1 up every
 * notice keeps its label, placed first and never dropped (§6); the rest of
 * a level's budget goes to the placed files by importance (the strongest
 * notice tier on the file, then whether the change touched it, then how few
 * hops the reach took to get there), nearest the view's centre first. Each
 * label tries eight spots round its anchor, and a notice's keeps stepping
 * out until one is clear, so no two boxes ever overlap. Ground the caller
 * keeps off, an opened cell's slide (D166), takes no label either: a box that
 * would fall on it is not clear, so the slide's own tags stand alone there.
 * One input gives one placement (C3).
 */

import type { MapJson, Notice, NoticeTier } from 'core';

import type { Ring } from './raster.js';
import { MONO_ADVANCE } from './tokens.js';
import { weatherOf } from './weather.js';

/** §6's levels: field, surface, cell, organelle, diff. */
export type Lod = 0 | 1 | 2 | 3 | 4;

/** What the camera shows: a rectangle of the layout, and how many screen pixels one layout unit takes. */
export type Viewport = { readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly pixelsPerUnit: number };

/** A point on the layout with the radius of what is drawn there. */
type Spot = { readonly x: number; readonly y: number; readonly r: number };

/** Where a notice is drawn, by D148's order. */
export type NoticeAnchor =
  | ({ readonly kind: 'organelle'; readonly path: string } & Spot)
  | ({ readonly kind: 'stitch'; readonly test: string; readonly on: string } & Spot)
  | { readonly kind: 'cell'; readonly cell: string }
  | { readonly kind: 'group'; readonly group: string };

/** A notice in the list's order, with where it is drawn, when anything draws it. */
export type AnchoredNotice = { readonly rank: number; readonly notice: Notice; readonly anchor?: NoticeAnchor };

/** A box on the screen, from the viewport's top-left, in pixels. */
export type LabelBox = { readonly x: number; readonly y: number; readonly width: number; readonly height: number };

/** One label: what it names, its words, the notice's rank when it is a notice's, the layout point it labels, and its box on the screen. */
export type Label = {
  readonly target: string;
  readonly text: string;
  readonly rank?: number;
  readonly anchor: { readonly x: number; readonly y: number };
  readonly box: LabelBox;
};

/** How labels are set: their size in pixels, their padding and their gap from what they label, and how many besides the notices each level writes. */
export type Labeling = {
  readonly fontSize: number;
  readonly pad: number;
  readonly gap: number;
  readonly budget: Readonly<Record<Lod, number>>;
};

export const LABELING: Labeling = { fontSize: 11, pad: 3, gap: 4, budget: { 0: 0, 1: 12, 2: 40, 3: 80, 4: 80 } };

/** C7's budget: the list holds at most six notices, so at most six are anchored. */
const NOTICE_BUDGET = 6;
/** How many rings out a notice's label keeps stepping before it settles for the last it tried; far more than any map needs. */
const NOTICE_RINGS = 64;
const ADDED = '+';
const TIER_ORDER: Readonly<Record<NoticeTier, number>> = { primary: 0, secondary: 1, tertiary: 2 };

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Each of the six notices in the list's order with its anchor, by D148's
 * order: its organelle; else a test file's stitch on the first placed file it
 * imports; else a cell's skin; else a shore file's group, or the group itself.
 */
export function noticeAnchors(map: MapJson): readonly AnchoredNotice[] {
  const positions = map.terrain.layout?.positions ?? {};
  const contours = map.terrain.layout?.contours ?? {};
  const terrain = new Set(map.terrain.organelles.map((organelle) => organelle.id));
  const cells = new Set(map.terrain.cells.map((cell) => cell.id));
  const groupOf = new Map(map.terrain.groups.flatMap((group) => [[group.id, group.id] as const, ...group.files.map((file) => [file, group.id] as const)]));
  const stitched = new Map<string, NoticeAnchor>();
  for (const file of weatherOf(map).files) {
    const at = positions[file.path];
    if (at === undefined) continue;
    for (const stitch of file.evidence?.stitches ?? []) {
      if (stitched.has(stitch.test)) continue;
      const x = at.x + at.r * Math.cos(stitch.angle);
      const y = at.y + at.r * Math.sin(stitch.angle);
      stitched.set(stitch.test, { kind: 'stitch', test: stitch.test, on: file.path, x, y, r: 0 });
    }
  }
  const anchorOf = (target: string): NoticeAnchor | undefined => {
    const at = positions[target];
    if (at !== undefined && terrain.has(target)) return { kind: 'organelle', path: target, x: at.x, y: at.y, r: at.r };
    const stitch = stitched.get(target);
    if (stitch !== undefined) return stitch;
    if (cells.has(target) && contours[target] !== undefined) return { kind: 'cell', cell: target };
    const group = groupOf.get(target);
    return group === undefined ? undefined : { kind: 'group', group };
  };
  return map.notices.slice(0, NOTICE_BUDGET).map((notice, index): AnchoredNotice => {
    const anchor = anchorOf(notice.target);
    return { rank: index + 1, notice, ...(anchor === undefined ? {} : { anchor }) };
  });
}

/** A file's short name, `+` before it when the change added it (D120). */
function nameOf(path: string, added: boolean): string {
  const base = path.slice(path.lastIndexOf('/') + 1);
  return added ? `${ADDED}${base}` : base;
}

/** The eight spots a label tries round a point, `reach` pixels out: right, left, above, below, then the corners. */
function spotsAround(px: number, py: number, reach: number, width: number, height: number): readonly LabelBox[] {
  const right = { x: px + reach, y: py - height / 2 };
  const left = { x: px - reach - width, y: py - height / 2 };
  const above = { x: px - width / 2, y: py - reach - height };
  const below = { x: px - width / 2, y: py + reach };
  const corner = reach * Math.SQRT1_2;
  return [
    right,
    left,
    above,
    below,
    { x: px + corner, y: py - corner - height },
    { x: px - corner - width, y: py - corner - height },
    { x: px + corner, y: py + corner },
    { x: px - corner - width, y: py + corner },
  ].map((spot) => ({ ...spot, width, height }));
}

function overlaps(a: LabelBox, b: LabelBox): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/** Whether the point lies inside the ring, by the even-odd rule. */
function within(x: number, y: number, ring: Ring): boolean {
  let odd = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [ax, ay] = ring[i] ?? [0, 0];
    const [bx, by] = ring[j] ?? [0, 0];
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) odd = !odd;
  }
  return odd;
}

/** Which side of the line through `p` and `q` the point `r` lies on: -1, 0 or 1. */
function sideOf(p: readonly [number, number], q: readonly [number, number], r: readonly [number, number]): number {
  return Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
}

/** Whether the segment from `a` to `b` crosses the segment from `c` to `d`. */
function crosses(a: readonly [number, number], b: readonly [number, number], c: readonly [number, number], d: readonly [number, number]): boolean {
  return sideOf(a, b, c) !== sideOf(a, b, d) && sideOf(c, d, a) !== sideOf(c, d, b);
}

/** Whether a box falls on the ground a ring bounds: a corner of the box inside it, a point of it inside the box, or an edge of each crossing. */
function onRing(box: LabelBox, ring: Ring): boolean {
  const corners: readonly (readonly [number, number])[] = [
    [box.x, box.y],
    [box.x + box.width, box.y],
    [box.x + box.width, box.y + box.height],
    [box.x, box.y + box.height],
  ];
  if (corners.some(([x, y]) => within(x, y, ring))) return true;
  if (ring.some(([x, y]) => x > box.x && x < box.x + box.width && y > box.y && y < box.y + box.height)) return true;
  return ring.some((a, index) => {
    const b = ring[(index + 1) % ring.length] ?? a;
    return corners.some((c, side) => crosses(a, b, c, corners[(side + 1) % corners.length] ?? c));
  });
}

/** A ring on the screen, in the viewport's pixels, with the box that bounds it, so a label far off it is cleared without walking its edges. */
type Keep = { readonly ring: Ring; readonly bounds: LabelBox };

function keepOf(ring: Ring, viewport: Viewport): Keep {
  const screen: Ring = ring.map(([x, y]) => [(x - viewport.x) * viewport.pixelsPerUnit, (y - viewport.y) * viewport.pixelsPerUnit]);
  const xs = screen.map(([x]) => x);
  const ys = screen.map(([, y]) => y);
  const [x, y] = [Math.min(...xs), Math.min(...ys)];
  return { ring: screen, bounds: { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y } };
}

function inside(box: LabelBox, viewport: Viewport): boolean {
  return box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width * viewport.pixelsPerUnit && box.y + box.height <= viewport.height * viewport.pixelsPerUnit;
}

/** A label wanting a place: what it names, its words, its rank if a notice's, and the point and radius it stands off from. */
type Wanted = { readonly target: string; readonly text: string; readonly rank?: number } & Spot;

/** Where a notice's label is drawn from on the field: its point, or the middle of a cell's skin; a shore group's block in the chrome names it there instead. */
function spotOf(anchor: NoticeAnchor | undefined, map: MapJson): Spot | undefined {
  if (anchor === undefined || anchor.kind === 'group') return undefined;
  if (anchor.kind !== 'cell') return anchor;
  const contour = map.terrain.layout?.contours?.[anchor.cell] ?? [];
  if (contour.length === 0) return undefined;
  const x = contour.reduce((total, [px]) => total + px, 0) / contour.length;
  const y = contour.reduce((total, [, py]) => total + py, 0) / contour.length;
  return { x, y, r: 0 };
}

/**
 * The labels at one level of detail over one viewport: none at LOD0; from
 * LOD1 every notice anchored on the field, then the level's budget of files
 * by importance and nearness, none overlapping another, and none falling on
 * the ground `off` bounds, rings in layout units: an opened cell's slide,
 * whose own tags name its files (D166).
 */
export function labelsFor(map: MapJson, lod: Lod, viewport: Viewport, labeling: Labeling = LABELING, off: readonly Ring[] = []): readonly Label[] {
  if (lod === 0) return [];
  const positions = map.terrain.layout?.positions ?? {};
  const added = new Set(map.weather.changed.filter((file) => file.kind === 'added').map((file) => file.path));
  const anchored = noticeAnchors(map);
  const notices = anchored.flatMap(({ rank, notice, anchor }): Wanted[] => {
    const spot = spotOf(anchor, map);
    return spot === undefined ? [] : [{ target: notice.target, text: nameOf(notice.target, added.has(notice.target)), rank, ...spot }];
  });

  const tierOf = new Map<string, number>();
  for (const { notice } of anchored) tierOf.set(notice.target, Math.min(tierOf.get(notice.target) ?? 3, TIER_ORDER[notice.tier]));
  const changed = new Set(map.weather.changed.map((file) => file.path));
  const hops = new Map<string, number>();
  for (const entry of map.weather.reach) hops.set(entry.path, Math.min(hops.get(entry.path) ?? Number.POSITIVE_INFINITY, entry.hops));
  const centre = { x: viewport.x + viewport.width / 2, y: viewport.y + viewport.height / 2 };
  const labelled = new Set(notices.map((notice) => notice.target));
  const files = map.terrain.organelles
    .flatMap((organelle) => {
      const at = positions[organelle.id];
      return at === undefined || labelled.has(organelle.id) ? [] : [{ target: organelle.id, text: nameOf(organelle.id, added.has(organelle.id)), ...at }];
    })
    .map((file) => ({
      file,
      key: [tierOf.get(file.target) ?? 3, changed.has(file.target) ? 0 : 1, hops.get(file.target) ?? Number.POSITIVE_INFINITY, Math.hypot(file.x - centre.x, file.y - centre.y)] as const,
    }))
    .toSorted((a, b) => a.key[0] - b.key[0] || a.key[1] - b.key[1] || a.key[2] - b.key[2] || a.key[3] - b.key[3] || byPath(a.file.target, b.file.target))
    .map(({ file }) => file);

  const height = labeling.fontSize + 2 * labeling.pad;
  const kept = off.filter((ring) => ring.length >= 3).map((ring) => keepOf(ring, viewport));
  const clear = (box: LabelBox): boolean => kept.every((keep) => !overlaps(keep.bounds, box) || !onRing(box, keep.ring));
  const placed: Label[] = [];
  const place = (wanted: Wanted, rings: number): boolean => {
    const width = wanted.text.length * labeling.fontSize * MONO_ADVANCE + 2 * labeling.pad;
    const px = (wanted.x - viewport.x) * viewport.pixelsPerUnit;
    const py = (wanted.y - viewport.y) * viewport.pixelsPerUnit;
    const base = wanted.r * viewport.pixelsPerUnit + labeling.gap;
    for (let ring = 0; ring < rings; ring += 1) {
      const free = spotsAround(px, py, base + ring * height, width, height).find(
        (box) => (wanted.rank !== undefined || inside(box, viewport)) && clear(box) && placed.every((label) => !overlaps(label.box, box)),
      );
      if (free === undefined) continue;
      placed.push({ target: wanted.target, text: wanted.text, ...(wanted.rank === undefined ? {} : { rank: wanted.rank }), anchor: { x: wanted.x, y: wanted.y }, box: free });
      return true;
    }
    return false;
  };
  for (const notice of notices) place(notice, NOTICE_RINGS);
  let budget = labeling.budget[lod];
  for (const file of files) {
    if (budget <= 0) break;
    if (file.x < viewport.x || file.x > viewport.x + viewport.width || file.y < viewport.y || file.y > viewport.y + viewport.height) continue;
    if (place(file, 1)) budget -= 1;
  }
  return placed;
}
