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
 * The world writes no word over the field unasked (D168), so a caller may
 * name the targets it is asked about, the file or cell under the pointer and
 * the target of the notice row it is over, and only their labels are placed.
 *
 * The one standing text D168 allows (D196) is each depth band's: a quiet
 * caption from LOD1, `entry` or `n deep` (Q86), the inset in from where the
 * band's line enters the screen and just under it, worked through the
 * camera's projection so it stays on its rule tilted and turned. It yields:
 * where it would fall on a placed label, a notice mark, the HUD or a cell's
 * skin it is dropped, never moved, so it never covers what it describes.
 * One input gives one placement (C3).
 */

import { membraneThickness } from 'core';
import type { Band, Layout, LayoutBand, MapJson, Notice, NoticeTier } from 'core';

import { dentedRing, wobbleOf } from './membranes.js';
import type { Ring } from './raster.js';
import { BAND_LABEL_GAP, BAND_LABEL_INSET, BAND_LABEL_SIZE, MEMBRANE_DENT_PULL, MONO_ADVANCE } from './tokens.js';
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

/** A file's short name, `+` before it when the change added it (D120), or a cell's last segment. */
export function nameOf(path: string, added: boolean): string {
  const base = path.slice(path.lastIndexOf('/') + 1);
  return added ? `${ADDED}${base}` : base;
}

/** The eight spots a label tries round a point, `reach` pixels out: right, left, above, below, then the corners. */
export function spotsAround(px: number, py: number, reach: number, width: number, height: number): readonly LabelBox[] {
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

/** Whether two boxes overlap. */
export function overlaps(a: LabelBox, b: LabelBox): boolean {
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

/**
 * Whether a box falls on the ground a ring bounds: a point of the ring inside
 * the box, an edge of each crossing, or the box inside the ring. Where no
 * edge crosses and no point lies inside, the box's corners are all inside
 * the ring or all out, so one corner speaks for them; and an edge whose own
 * bounds miss the box is passed without the crossing test, so a long ring
 * near a label costs a few comparisons an edge.
 */
export function onRing(box: LabelBox, ring: Ring): boolean {
  const [x0, y0, x1, y1] = [box.x, box.y, box.x + box.width, box.y + box.height];
  const corners: readonly (readonly [number, number])[] = [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
  if (ring.some(([x, y]) => x > x0 && x < x1 && y > y0 && y < y1)) return true;
  const crossed = ring.some((a, index) => {
    const b = ring[(index + 1) % ring.length] ?? a;
    if (Math.max(a[0], b[0]) < x0 || Math.min(a[0], b[0]) > x1 || Math.max(a[1], b[1]) < y0 || Math.min(a[1], b[1]) > y1) return false;
    return corners.some((c, side) => crosses(a, b, c, corners[(side + 1) % corners.length] ?? c));
  });
  return crossed || within(x0, y0, ring);
}

/** A point on the screen, in pixels from its top-left. */
type ScreenPoint = readonly [number, number];

/** A layout point's place on the screen, in the viewport's pixels: how the camera shows the level ground. */
type Projection = (x: number, y: number) => ScreenPoint;

/** The viewport seen from overhead: each layout unit `pixelsPerUnit` pixels across, from its top-left. */
function overheadOf(viewport: Viewport): Projection {
  return (x, y) => [(x - viewport.x) * viewport.pixelsPerUnit, (y - viewport.y) * viewport.pixelsPerUnit];
}

/** A ring on the screen, in the viewport's pixels, with the box that bounds it, so a label far off it is cleared without walking its edges. */
type Keep = { readonly ring: Ring; readonly bounds: LabelBox };

function keepOf(ring: Ring, project: Projection): Keep {
  const screen: Ring = ring.map(([x, y]) => project(x, y));
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
 * whose own tags name its files (D166). Given the targets `asked` about, only
 * theirs: each asked target's notices and, for a file no notice names, its
 * name (D168).
 */
export function labelsFor(map: MapJson, lod: Lod, viewport: Viewport, labeling: Labeling = LABELING, off: readonly Ring[] = [], asked?: ReadonlySet<string>): readonly Label[] {
  if (lod === 0) return [];
  const isAsked = (target: string): boolean => asked === undefined || asked.has(target);
  const positions = map.terrain.layout?.positions ?? {};
  const added = new Set(map.weather.changed.filter((file) => file.kind === 'added').map((file) => file.path));
  const anchored = noticeAnchors(map);
  const notices = anchored.flatMap(({ rank, notice, anchor }): Wanted[] => {
    const spot = spotOf(anchor, map);
    return spot === undefined || !isAsked(notice.target) ? [] : [{ target: notice.target, text: nameOf(notice.target, added.has(notice.target)), rank, ...spot }];
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
      return at === undefined || labelled.has(organelle.id) || !isAsked(organelle.id) ? [] : [{ target: organelle.id, text: nameOf(organelle.id, added.has(organelle.id)), ...at }];
    })
    .map((file) => ({
      file,
      key: [tierOf.get(file.target) ?? 3, changed.has(file.target) ? 0 : 1, hops.get(file.target) ?? Number.POSITIVE_INFINITY, Math.hypot(file.x - centre.x, file.y - centre.y)] as const,
    }))
    .toSorted((a, b) => a.key[0] - b.key[0] || a.key[1] - b.key[1] || a.key[2] - b.key[2] || a.key[3] - b.key[3] || byPath(a.file.target, b.file.target))
    .map(({ file }) => file);

  const height = labeling.fontSize + 2 * labeling.pad;
  const kept = off.filter((ring) => ring.length >= 3).map((ring) => keepOf(ring, overheadOf(viewport)));
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

/**
 * The stretch of the line through two points, from `low` to `high` of the way
 * from the first to the second, that lies on the screen: its two ends there,
 * or none when it misses the screen or the points are one. Liang and
 * Barsky's clip: each pair of edges narrows the stretch inside the screen.
 */
function clip(from: ScreenPoint, to: ScreenPoint, width: number, height: number, [start, end]: readonly [number, number]): readonly [ScreenPoint, ScreenPoint] | undefined {
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
}

/**
 * The line through two points on the screen, run out to the screen's edges:
 * its two ends there, or none when the line misses the screen or the points
 * are one. A band's rule drawn so crosses the whole screen, wherever the
 * camera has turned the ground, and its label hangs from where it enters.
 */
export function across(from: ScreenPoint, to: ScreenPoint, width: number, height: number): readonly [ScreenPoint, ScreenPoint] | undefined {
  return clip(from, to, width, height, [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY]);
}

/** The part of the segment between two points on the screen that lies on it, or none when none of it does: a row's rule, which runs across its row alone (Q73). */
export function between(from: ScreenPoint, to: ScreenPoint, width: number, height: number): readonly [ScreenPoint, ScreenPoint] | undefined {
  return clip(from, to, width, height, [0, 1]);
}

/**
 * The band labels' tokens as one object, so a registry can hand in live
 * values (D156); `BAND_LABEL_TOKENS` is where they rest, at `tokens.ts`'s values.
 */
export type BandLabelTokens = { readonly BAND_LABEL_SIZE: number; readonly BAND_LABEL_INSET: number; readonly BAND_LABEL_GAP: number };
export const BAND_LABEL_TOKENS: BandLabelTokens = { BAND_LABEL_SIZE, BAND_LABEL_INSET, BAND_LABEL_GAP };

/** One depth band's label: the band it names, the row of lanes it stands in where the lanes wrap (Q73), its words, and its box on the screen. */
export type BandLabel = { readonly band: number; readonly row?: number; readonly text: string; readonly box: LabelBox };

/** What a band's label says, from its depths (Q86): `entry` for the band that starts at depth 0, else `n deep`, or `n–m deep` for a band that spans depths. */
function bandWords(band: Band): string {
  const [low, high] = [String(band.depth_min), String(band.depth_max)];
  if (band.depth_min === 0) return 'entry';
  return band.depth_min === band.depth_max ? `${low} deep` : `${low}–${high} deep`;
}

/** A ladder of terraces and the stretch of the layout it stands across: the field's one ladder, or a row's where the lanes wrap (Q73). */
type Ladder = { readonly row?: number; readonly x0: number; readonly x1: number; readonly bands: readonly LayoutBand[] };

function laddersOf(layout: Layout): readonly Ladder[] {
  if (layout.rows === undefined) return [{ x0: 0, x1: layout.width, bands: layout.bands }];
  return layout.rows.map((row, index) => ({ row: index, x0: row.x0, x1: row.x1, bands: row.bands }));
}

/** A line's height on the screen where it crosses `x`, through its two projected points; the caller has made sure it does not stand upright. */
function heightOn([a, b]: readonly [ScreenPoint, ScreenPoint], x: number): number {
  return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);
}

/**
 * Where a band's label stands on the screen: the inset in from the left end
 * of the stretch of its line the screen shows, and just inside the band from
 * it, below the line unless the view is turned past a quarter. Band 0's line
 * is its top, under the shore; every other band's is the rule the world draws
 * where it begins. None where the line misses the screen or stands upright on
 * it, or where the label would run past the line's end or out of its band.
 */
function boxFor(ladder: Ladder, band: LayoutBand, text: string, project: Projection, screen: { readonly width: number; readonly height: number }, tokens: BandLabelTokens): LabelBox | undefined {
  const top = [project(ladder.x0, band.y0), project(ladder.x1, band.y0)] as const;
  const foot = [project(ladder.x0, band.y1), project(ladder.x1, band.y1)] as const;
  if (Math.abs(top[1][0] - top[0][0]) < 1e-9) return undefined;
  const run = (ladder.row === undefined ? across : between)(top[0], top[1], screen.width, screen.height);
  if (run === undefined) return undefined;
  const [left, right] = [Math.min(run[0][0], run[1][0]), Math.max(run[0][0], run[1][0])];
  const [width, height] = [text.length * tokens.BAND_LABEL_SIZE * MONO_ADVANCE, tokens.BAND_LABEL_SIZE];
  const x = left + tokens.BAND_LABEL_INSET;
  if (x + width > right) return undefined;
  const line = [heightOn(top, x), heightOn(top, x + width)];
  const end = [heightOn(foot, x), heightOn(foot, x + width)];
  const below = heightOn(foot, x) > heightOn(top, x);
  const y = below ? Math.max(...line) + tokens.BAND_LABEL_GAP : Math.min(...line) - tokens.BAND_LABEL_GAP - height;
  const inBand = below ? y + height <= Math.min(...end) : y >= Math.max(...end);
  return inBand ? { x, y, width, height } : undefined;
}

/** A box grown by `by` pixels on every side. */
function grow(box: LabelBox, by: number): LabelBox {
  return { x: box.x - by, y: box.y - by, width: box.width + 2 * by, height: box.height + 2 * by };
}

/** Each contour's bounds on the layout, kept with the contour, so the labels placed again on every frame the view moves walk no ring twice (C14); the same contour gives the same bounds (C3). */
const BOUNDS = new WeakMap<Ring, readonly [number, number, number, number]>();

function layoutBoundsOf(ring: Ring): readonly [number, number, number, number] {
  const known = BOUNDS.get(ring);
  if (known !== undefined) return known;
  let [x0, y0, x1, y1] = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
  for (const [x, y] of ring) [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
  const bounds = [x0, y0, x1, y1] as const;
  BOUNDS.set(ring, bounds);
  return bounds;
}

/** Each contour dented by its cell's rules as the world draws it (D159), kept with the contour as its bounds are. */
const DENTED = new WeakMap<Ring, { readonly dents: number; readonly ring: Ring }>();

function dentedOf(contour: Ring, dents: number): Ring {
  const known = DENTED.get(contour);
  if (known?.dents === dents) return known.ring;
  const ring = dentedRing(contour, dents);
  DENTED.set(contour, { dents, ring });
  return ring;
}

/** A ring's bounds on the layout, through its corners onto the screen: the box its picture lies in, since the camera's view of the level ground is affine. */
function boundsOn(ring: Ring, project: Projection): LabelBox {
  const [x0, y0, x1, y1] = layoutBoundsOf(ring);
  const corners = [project(x0, y0), project(x1, y0), project(x1, y1), project(x0, y1)];
  const [xs, ys] = [corners.map(([px]) => px), corners.map(([, py]) => py)];
  const [left, top] = [Math.min(...xs), Math.min(...ys)];
  return { x: left, y: top, width: Math.max(...xs) - left, height: Math.max(...ys) - top };
}

/** An edge of a ring on the screen, from one point to the next. */
type Edge = readonly [ScreenPoint, ScreenPoint];

/**
 * A cell's skin on the screen as the world draws it: the box its contour's
 * bounds land in, grown by how far a tooth stands out; how far past its ring
 * its line reaches, half its width and its ripple (D195), in pixels; and the
 * edges of its ring, dented by the rules its files break (D159), that reach
 * left of `reachX`, projected only once a label comes near the skin. The band
 * labels stand near the screen's left edge, so a long skin keeps a handful of
 * its edges, and placing the labels again each frame the view moves stays
 * cheap at thousands of files (C14).
 */
type Skin = { readonly near: LabelBox; readonly reach: number; readonly edges: () => readonly Edge[] };

function skinsOf(map: MapJson, project: Projection, pixelsPerUnit: number, reachX: number): readonly Skin[] {
  const contours = map.terrain.layout?.contours ?? {};
  return map.terrain.cells.flatMap((cell): Skin[] => {
    const contour = contours[cell.id];
    if (contour === undefined || contour.length < 3) return [];
    const reach = (membraneThickness(cell.interface_size) / 2 + wobbleOf(cell)) * pixelsPerUnit;
    let kept: readonly Edge[] | undefined;
    const edges = (): readonly Edge[] => {
      if (kept !== undefined) return kept;
      const ring = dentedOf(contour, cell.dents.length).map(([x, y]) => project(x, y));
      kept = ring.flatMap((a, index): Edge[] => {
        const b = ring[(index + 1) % ring.length] ?? a;
        return Math.min(a[0], b[0]) <= reachX + reach ? [[a, b]] : [];
      });
      return kept;
    };
    return [{ near: grow(boundsOn(contour, project), MEMBRANE_DENT_PULL * pixelsPerUnit), reach, edges }];
  });
}

/**
 * Whether a box falls on a skin's ground or its drawn line, from the edges
 * it kept: a point of the ring inside the box grown by the line's reach, an
 * edge crossing it, or the box inside the ring, by the even-odd count along
 * a ray leftward from a corner, which no edge it left out can cross.
 */
function onSkin(box: LabelBox, skin: Skin): boolean {
  const grown = grow(box, skin.reach);
  if (!overlaps(skin.near, grown)) return false;
  const [x0, y0, x1, y1] = [grown.x, grown.y, grown.x + grown.width, grown.y + grown.height];
  const corners: readonly ScreenPoint[] = [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
  let odd = false;
  for (const [a, b] of skin.edges()) {
    if (a[0] > x0 && a[0] < x1 && a[1] > y0 && a[1] < y1) return true;
    const touches = Math.max(a[0], b[0]) >= x0 && Math.min(a[0], b[0]) <= x1 && Math.max(a[1], b[1]) >= y0 && Math.min(a[1], b[1]) <= y1;
    if (touches && corners.some((c, side) => crosses(a, b, c, corners[(side + 1) % corners.length] ?? c))) return true;
    if (a[1] > y0 !== b[1] > y0 && x0 > ((b[0] - a[0]) * (y0 - a[1])) / (b[1] - a[1]) + a[0]) odd = !odd;
  }
  return odd;
}

/** A placed label's box where the world draws it: hung from its anchor's projection by the offset it was placed with overhead. */
function shownAt(label: Label, overhead: Projection, project: Projection): LabelBox {
  const [ox, oy] = overhead(label.anchor.x, label.anchor.y);
  const [px, py] = project(label.anchor.x, label.anchor.y);
  return { ...label.box, x: label.box.x + px - ox, y: label.box.y + py - oy };
}

/**
 * Each depth band's quiet label over one viewport (D196, Q86): none at LOD0;
 * from LOD1 one for each band whose line the screen shows, a row's band in
 * each row where the lanes wrap, saying `entry` or `n deep` from
 * `terrain.bands`, the inset in from where its line enters the screen and
 * just under it. A label is dropped, never moved, where it would fall off
 * the screen or on a placed label (`placed`, as `labelsFor` gave them), a box
 * the caller claims (`off`, in the viewport's pixels: the notice marks, the
 * HUD), or a cell's skin, so it never covers what it describes. `project` is
 * the camera's view of the level ground, overhead unless it is tilted or
 * turned; a placed label is hung from its anchor's projection, as the world
 * draws it. One input gives one set of labels (C3).
 */
export function bandLabelsFor(
  map: MapJson,
  lod: Lod,
  viewport: Viewport,
  placed: readonly Label[] = [],
  off: readonly LabelBox[] = [],
  project: Projection = overheadOf(viewport),
  tokens: BandLabelTokens = BAND_LABEL_TOKENS,
): readonly BandLabel[] {
  const layout = map.terrain.layout;
  if (lod === 0 || layout === undefined) return [];
  const screen = { width: viewport.width * viewport.pixelsPerUnit, height: viewport.height * viewport.pixelsPerUnit };
  const overhead = overheadOf(viewport);
  const taken = [...off, ...placed.map((label) => shownAt(label, overhead, project))];
  const depths = new Map(map.terrain.bands.map((band) => [band.index, band] as const));
  const wanted = laddersOf(layout).flatMap((ladder) =>
    ladder.bands
      .toSorted((a, b) => a.index - b.index)
      .flatMap((band): BandLabel[] => {
        const depth = depths.get(band.index);
        const text = depth === undefined ? undefined : bandWords(depth);
        const box = text === undefined ? undefined : boxFor(ladder, band, text, project, screen, tokens);
        if (text === undefined || box === undefined || !inside(box, viewport) || taken.some((other) => overlaps(other, box))) return [];
        return [{ band: band.index, ...(ladder.row === undefined ? {} : { row: ladder.row }), text, box }];
      }),
  );
  const skins = skinsOf(map, project, viewport.pixelsPerUnit, Math.max(...wanted.map((label) => label.box.x + label.box.width)));
  return wanted.filter((label) => !skins.some((skin) => onSkin(label.box, skin)));
}
