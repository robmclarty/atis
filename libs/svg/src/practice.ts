/**
 * practice: the annotated practice map every reading opens with (D87), its
 * callouts drawn from the legend's own list of marks (D125).
 *
 * A practice map is a real map, never scored, drawn from a retake fixture
 * whose truth is already unsealed. Over it hang numbered balloons, one per
 * mark the legend keys and the map carries, each numbered as that mark's
 * row in the inset and in `docs/glance-test.md`, and joined by a solid line
 * to the first instance of the mark the map draws. A mark the map has no
 * instance of gets no balloon, and the render says which those are, so a
 * reader is never shown a mark the fixture does not have.
 *
 * The fixture's skins are cut again over its own positions by today's core,
 * so a map written before core's last fix to them is skinned as core skins
 * a map now. Nothing else in the map is touched.
 */

import { computeMembranes } from 'core';
import type { Layout, MapJson, Organelle, PatchCoverage, Position } from 'core';
import {
  BUGFIX_FULL_AT,
  CALLOUT_CLEARANCE,
  CALLOUT_R,
  CALLOUT_REACH,
  CHROME_INK,
  CHROME_STROKE_WIDTH,
  CHURN_FULL_AT,
  CROSSING_PAD,
  GHOST_PAD,
  INTEGRITY_GAP_WIDTH,
  INTEGRITY_PAD,
  MUTANT_NOTCH_SPACING,
  weatherOf,
} from 'scene';

import type { Box, Chrome } from './chrome.js';
import { el } from './el.js';
import type { Markup } from './el.js';
import { LEGEND, drawBalloon } from './legend.js';
import { drawSheet, frameOf } from './render.js';

type Point = readonly [number, number];

/** Where a mark is on the sheet, which way its balloon stands off from it, and how far when that is not `CALLOUT_REACH`. */
type Anchor = { readonly at: Point; readonly toward: Point; readonly reach?: number };

/** One balloon: its mark, its number in the legend, the point it marks and where it stands. */
export type Callout = { readonly mark: string; readonly number: number; readonly at: Point; readonly balloon: Point };

/** The practice map, and the legend's marks it carries no instance of. */
export type Practice = { readonly svg: string; readonly callouts: readonly Callout[]; readonly missing: readonly string[] };

const TOP = -Math.PI / 2;

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** The unit vector at `angle`, which is also the way out from a ring at that angle. */
function heading(angle: number): Point {
  return [Math.cos(angle), Math.sin(angle)];
}

/** A point on a file's ring `radius` out at `angle`, standing off outward; `originY` is where the layout's top lands on the sheet. */
function onRing(at: Position, radius: number, angle: number, originY: number): Anchor {
  const [dx, dy] = heading(angle);
  return { at: [at.x + radius * dx, at.y + originY + radius * dy], toward: [dx, dy] };
}

/** The first of `paths`, in path order, that the layout placed on the terrain: a shore file's mark is the band's, not the world's (D153). */
function firstPlaced(paths: readonly string[], layout: Layout, map: MapJson): readonly [string, Position] | undefined {
  const terrain = new Set(map.terrain.organelles.map((organelle) => organelle.id));
  for (const path of [...paths].toSorted(byPath)) {
    const at = layout.positions[path];
    if (at !== undefined && terrain.has(path)) return [path, at];
  }
  return undefined;
}

/** What a finder reads: the map, its layout, and where the chrome put its blocks and rows. */
type Sheet = { readonly map: MapJson; readonly layout: Layout; readonly chrome: Chrome };

/** A file's skin: the ring the evidence is drawn on, just past its edge. */
function skin(at: Position): number {
  return at.r + INTEGRITY_PAD;
}

/** The share of a file's changed executable lines no test ran: the lit arc's length round its skin. */
function openShare(file: PatchCoverage): number {
  return (file.changed_executable - file.covered) / file.changed_executable;
}

/** The first changed file, in path order, with some of its changed lines unrun: the file the lit arc is found on. */
function openFile({ map, layout }: Sheet): PatchCoverage | undefined {
  return [...(map.weather.evidence.patch_coverage ?? [])]
    .toSorted((a, b) => byPath(a.path, b.path))
    .find((file) => file.covered < file.changed_executable && layout.positions[file.path] !== undefined);
}

/** The category block's foot, its balloon below the whole HUD strip on the field, however many rows the strip wrapped to. */
function findCategory({ chrome }: Sheet): Anchor | undefined {
  if (chrome.category === undefined) return undefined;
  const { x, y, width, height } = chrome.category;
  return { at: [x + width / 2, y + height], toward: [0, 1], reach: chrome.worldY - (y + height) + CALLOUT_REACH };
}

/** The middle of the lit arc, which runs clockwise from the top over the unrun share. */
function findLitArc(sheet: Sheet): Anchor | undefined {
  const file = openFile(sheet);
  const at = file === undefined ? undefined : sheet.layout.positions[file.path];
  if (file === undefined || at === undefined) return undefined;
  return onRing(at, skin(at) + INTEGRITY_GAP_WIDTH / 2, TOP + openShare(file) * Math.PI, sheet.chrome.originY);
}

/** The middle of the hairline, the rest of the ring, on a file the tests ran some of; a different file from the arc's where the map has one. */
function findHairline(sheet: Sheet): Anchor | undefined {
  const arc = openFile(sheet)?.path;
  const [file] = (sheet.map.weather.evidence.patch_coverage ?? [])
    .filter((entry) => entry.covered > 0 && sheet.layout.positions[entry.path] !== undefined)
    .toSorted((a, b) => Number(a.path === arc) - Number(b.path === arc) || byPath(a.path, b.path));
  const at = file === undefined ? undefined : sheet.layout.positions[file.path];
  if (file === undefined || at === undefined) return undefined;
  return onRing(at, skin(at), TOP + (1 + openShare(file)) * Math.PI, sheet.chrome.originY);
}

/** The first notch on the first file with a live mutant, at the top of its ring. */
function findNotch(sheet: Sheet): Anchor | undefined {
  const mutants = sheet.map.weather.evidence.mutants ?? [];
  const found = firstPlaced([...new Set(mutants.map((mutant) => mutant.path))], sheet.layout, sheet.map);
  if (found === undefined) return undefined;
  const [path, at] = found;
  const count = mutants.filter((mutant) => mutant.path === path).length;
  return onRing(at, skin(at) + INTEGRITY_GAP_WIDTH / 2, TOP - ((count - 1) / 2) * MUTANT_NOTCH_SPACING, sheet.chrome.originY);
}

/** The stitches across the bottom of the first file a test imports. */
function findStitches(sheet: Sheet): Anchor | undefined {
  const targets = (sheet.map.weather.evidence.stitches ?? []).flatMap((stitch) => stitch.targets);
  const found = firstPlaced([...new Set(targets)], sheet.layout, sheet.map);
  return found === undefined ? undefined : onRing(found[1], found[1].r, Math.PI / 2, sheet.chrome.originY);
}

/** The first bolt of the change's storms, or of the standing ones, its balloon to the left since a red bolt's slot is written to its right. */
function findBolt({ map, chrome }: Sheet, change: boolean): Anchor | undefined {
  const storm = weatherOf(map).storms.find((hung) => hung.change === change);
  return storm === undefined ? undefined : { at: [storm.x, storm.y + chrome.originY], toward: [-1, 0] };
}

/** The dashed ring past the first ghost. */
function findGhost(sheet: Sheet): Anchor | undefined {
  const found = firstPlaced(sheet.map.weather.ghosts.map((ghost) => ghost.path), sheet.layout, sheet.map);
  return found === undefined ? undefined : onRing(found[1], found[1].r + GHOST_PAD, (3 * Math.PI) / 4, sheet.chrome.originY);
}

/** An added file's stain where the map has one, else a modified file's, since the cyan is the one hue for both (D120). */
function findStain(sheet: Sheet): Anchor | undefined {
  const changed = sheet.map.weather.changed;
  const of = (kind: string): readonly string[] => changed.filter((file) => file.kind === kind).map((file) => file.path);
  const found = firstPlaced(of('added'), sheet.layout, sheet.map) ?? firstPlaced(of('modified'), sheet.layout, sheet.map);
  return found === undefined ? undefined : onRing(found[1], found[1].r, (5 * Math.PI) / 4, sheet.chrome.originY);
}

/** The right of the first skin lit whole. */
function findUnmeasured(sheet: Sheet): Anchor | undefined {
  const found = firstPlaced(sheet.map.weather.evidence.unmeasured ?? [], sheet.layout, sheet.map);
  return found === undefined ? undefined : onRing(found[1], skin(found[1]) + INTEGRITY_GAP_WIDTH / 2, 0, sheet.chrome.originY);
}

/** The top of the first changed cell's skin, in path order, which the reach lights brightest: the edge its glow spills over. */
function findReach({ map, layout, chrome }: Sheet): Anchor | undefined {
  const [first] = weatherOf(map)
    .cells.filter((cell) => cell.reach?.hops === 0 && layout.contours?.[cell.cell] !== undefined)
    .map((cell) => cell.cell)
    .toSorted(byPath);
  const ring = first === undefined ? undefined : layout.contours?.[first];
  const [top] = (ring ?? []).toSorted(([ax, ay], [bx, by]) => ay - by || ax - bx);
  return top === undefined ? undefined : { at: [top[0], top[1] + chrome.originY], toward: [0, -1] };
}

/** The upper right of the first lit crossing, in path order. */
function findCrossing(sheet: Sheet): Anchor | undefined {
  const via = weatherOf(sheet.map).files.filter((file) => file.crossing === true).map((file) => file.path);
  const found = firstPlaced(via, sheet.layout, sheet.map);
  return found === undefined ? undefined : onRing(found[1], found[1].r + CROSSING_PAD, -Math.PI / 4, sheet.chrome.originY);
}

/**
 * A point inside the file the map textures most strongly with one history,
 * by its value up to the one it is full at, ties by path: the instance a
 * reader can see, since a faint texture is a few lines' worth of ink.
 */
function findTexture(sheet: Sheet, value: (organelle: Organelle) => number | undefined, fullAt: number, angle: number): Anchor | undefined {
  const terrain = new Map(sheet.map.terrain.organelles.map((organelle) => [organelle.id, Math.min(value(organelle) ?? 0, fullAt)]));
  const strongest = Math.max(0, ...terrain.values());
  if (strongest === 0) return undefined;
  const found = firstPlaced([...terrain].filter(([, strength]) => strength === strongest).map(([path]) => path), sheet.layout, sheet.map);
  return found === undefined ? undefined : onRing(found[1], found[1].r / 2, angle, sheet.chrome.originY);
}

/**
 * Where each legend mark's first instance is, by the same rules the
 * renderer places it, keyed by the mark's id. A mark with no finder here
 * has no balloon, and the render names it missing.
 */
export const FINDERS: Readonly<Record<string, (sheet: Sheet) => Anchor | undefined>> = {
  category: findCategory,
  'lit-arc': findLitArc,
  hairline: findHairline,
  notch: findNotch,
  stitches: findStitches,
  'red-bolt': (sheet) => findBolt(sheet, true),
  'grey-bolt': (sheet) => findBolt(sheet, false),
  ghost: findGhost,
  stain: findStain,
  unmeasured: findUnmeasured,
  reach: findReach,
  crossing: findCrossing,
  hatching: (sheet) => findTexture(sheet, (organelle) => organelle.churn_ratio, CHURN_FULL_AT, (-3 * Math.PI) / 4),
  stipple: (sheet) => findTexture(sheet, (organelle) => organelle.bugfix_rate, BUGFIX_FULL_AT, Math.PI / 4),
};

/** Where a balloon may not stand: on a notice's marks, in the notice column, the HUD strip or the shore's band, or on a balloon already hung. */
type Keepout = { readonly boxes: readonly Box[]; readonly balloons: readonly Point[] };

/** The turns a balloon tries off the way it faces, nearest first, an eighth of a turn apart. */
const TURNS: readonly number[] = [0, 1, -1, 2, -2, 3, -3, 4].map((step) => (step * Math.PI) / 4);

function clearOf([x, y]: Point, { boxes, balloons }: Keepout): boolean {
  const room = CALLOUT_R + CALLOUT_CLEARANCE;
  const offBox = (box: Box): boolean =>
    x + room <= box.x || x - room >= box.x + box.width || y + room <= box.y || y - room >= box.y + box.height;
  return boxes.every(offBox) && balloons.every(([bx, by]) => Math.hypot(bx - x, by - y) >= 2 * room);
}

/**
 * A balloon its reach off its mark, the way the mark faces if that
 * spot is clear and on the sheet, else the nearest turn of the compass that
 * is; failing all of them, the way it faces.
 */
function standOff({ at: [x, y], toward: [dx, dy], reach = CALLOUT_REACH }: Anchor, chrome: Chrome, keepout: Keepout): Point {
  const facing = Math.atan2(dy, dx);
  const onSheet = ([px, py]: Point): boolean =>
    px >= CALLOUT_R && px <= chrome.width - CALLOUT_R && py >= CALLOUT_R && py <= chrome.height - CALLOUT_R;
  const spots = TURNS.map((turn): Point => [x + Math.cos(facing + turn) * reach, y + Math.sin(facing + turn) * reach]);
  return spots.find((spot) => onSheet(spot) && clearOf(spot, keepout)) ?? spots[0] ?? [x, y];
}

/**
 * Every mark the map carries an instance of, in the legend's order, numbered
 * by its row, each balloon hung clear of the notices' marks, the chrome and
 * the balloons hung before it.
 */
export function calloutsOf(map: MapJson, layout: Layout, chrome: Chrome): readonly Callout[] {
  const boxes: readonly Box[] = [
    ...chrome.marks,
    { x: 0, y: 0, width: chrome.width, height: chrome.worldY },
    { x: layout.width, y: chrome.worldY, width: chrome.width - layout.width, height: chrome.height - chrome.worldY },
    ...(chrome.band === undefined ? [] : [chrome.band]),
  ];
  const callouts: Callout[] = [];
  LEGEND.forEach((mark, index) => {
    const anchor = FINDERS[mark.id]?.({ map, layout, chrome });
    if (anchor === undefined) return;
    const balloon = standOff(anchor, chrome, { boxes, balloons: callouts.map((callout) => callout.balloon) });
    callouts.push({ mark: mark.id, number: index + 1, at: anchor.at, balloon });
  });
  return callouts;
}

/** The callouts over everything: each a solid line from its mark to the edge of its balloon, then the balloon. */
function drawCallouts(callouts: readonly Callout[]): Markup {
  return el(
    'g',
    { id: 'callouts' },
    callouts.map(({ mark, number, at: [x, y], balloon: [bx, by] }) => {
      const length = Math.hypot(bx - x, by - y);
      const share = length === 0 ? 0 : (length - CALLOUT_R) / length;
      return el('g', { 'data-callout': number, 'data-mark': mark }, [
        el('line', { x1: x, y1: y, x2: x + (bx - x) * share, y2: y + (by - y) * share, stroke: CHROME_INK, 'stroke-width': CHROME_STROKE_WIDTH }),
        drawBalloon(number, bx, by),
      ]);
    }),
  );
}

/** A fixture's map with its skins cut again by today's core over its own positions; everything else as the fixture wrote it. */
function reskinned(map: MapJson): MapJson {
  const layout = map.terrain.layout;
  if (layout === undefined) return map;
  const contours = computeMembranes({ cells: map.terrain.cells, groups: map.terrain.groups, positions: layout.positions });
  return { ...map, terrain: { ...map.terrain, layout: { ...layout, contours } } };
}

/** The practice map: the fixture drawn as every map is, its skins re-cut, and a numbered balloon on the first instance of each mark the legend keys. */
export function renderPractice(fixture: MapJson): Practice {
  const map = reskinned(fixture);
  const frame = frameOf(map);
  const callouts = calloutsOf(map, frame.layout, frame.chrome);
  const found = new Set(callouts.map((callout) => callout.mark));
  return {
    svg: drawSheet(map, frame, [drawCallouts(callouts)]),
    callouts,
    missing: LEGEND.map((mark) => mark.id).filter((id) => !found.has(id)),
  };
}
