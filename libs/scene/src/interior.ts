/**
 * interior: an opened cell as a stained slide (§5.6's inside, §6's LOD2),
 * laid out for the world and tested here. The slide is the cell's membrane,
 * teeth and all (D159), cut into triangles with a hole for each folder and
 * directory it holds, so a package's slide never covers the folders inside
 * it, while the file of each single-file cell it holds is a body on it beside
 * the package's own (D167); the membrane is
 * the frame round the files, and the barrel's exports are written on it, the
 * names the map records under their count, a few to a line and the rest
 * counted past a dozen, or the count alone where the map records no names
 * (D162, C2). Each file is a body in
 * its morphed outline (D146), moved by the rules it breaks (D147) and floating
 * by its looseness (D157, D165) through the scheduler, and stained by what the
 * change did to it (hue is state, C11): added and modified through, the share
 * of its changed lines no test ran left unstained from the top clockwise, as
 * the evidence ring lights its gap (D71); a file nobody measured unstained
 * whole (D80); a deleted file its outline alone, the body gone; a renamed one
 * dashed (D40). On demand the exploded view spreads the bodies out from the
 * cell's middle along dotted leaders, in the technical drawing's manner,
 * clear of one another. The file labels are tags in two columns on screen,
 * left and right of the slide however it is framed, each with its rule count
 * (D155), joined to their bodies by dotted leaders.
 *
 * Pure (C1): no three and no DOM. The world hands in where the scheduler's
 * float has the files, how far the exploded view has spread, and a projection
 * to the screen, and one input gives one layout (C3).
 */

import earcut from 'earcut';
import { membraneThickness } from 'core';
import type { ChangeKind, MapJson, Position } from 'core';

import { heldCellsOf, slideCellOf, slideFilesOf } from './drift.js';
import type { Drifted } from './drift.js';
import { LABELING } from './labels.js';
import type { LabelBox, Labeling } from './labels.js';
import { dentedRing } from './membranes.js';
import type { Point } from './minimap.js';
import { openRing } from './raster.js';
import type { Ring } from './raster.js';
import { AT_REST, draw, outlineOf, rulesOf, seedOf } from './shape.js';
import type { Outline, ShapeMotion } from './shape.js';
import { MONO_ADVANCE } from './tokens.js';
import { weatherOf } from './weather.js';

/**
 * How the exploded view spreads the bodies: each moves out from the cell's
 * middle to this many times its distance from it, plus this share of the
 * cell's radius, and keeps this much clear ground off its neighbours, in
 * layout units; and how the membrane writes the exports: this many names to a
 * line, and this many before the rest are only counted. One object, handed
 * in, so the dev panel can move it live (D156); `INTERIOR_LAYOUT` is where it
 * rests.
 */
export type InteriorLayout = {
  readonly explodeSpread: number;
  readonly explodePush: number;
  readonly explodeGap: number;
  readonly exportsPerLine: number;
  readonly exportsShown: number;
};

export const INTERIOR_LAYOUT: InteriorLayout = { explodeSpread: 1.6, explodePush: 0.35, explodeGap: 3, exportsPerLine: 3, exportsShown: 12 };

/** What the change did to a file, and the share of its body left unstained: its changed lines no test ran, or all of it when nobody measured (D80). */
export type Stain = { readonly kind: ChangeKind; readonly from?: string; readonly open: number };

/** A file on the slide at rest: where the layout put it, the rules it breaks, its stain, its looseness, and where the exploded view takes it. */
export type SlideFile = {
  readonly id: string;
  readonly rest: Position;
  readonly rules: number;
  readonly dents: readonly string[];
  readonly stain?: Stain;
  readonly looseness?: number;
  readonly exploded: Point;
};

/** The barrel's exports as the membrane writes them: how many, their names where the map records them (D162), the barrel's name when the cell has one, and the point of the membrane they sit at. */
export type Exports = { readonly count: number; readonly names?: readonly string[]; readonly barrel?: string; readonly x: number; readonly y: number };

/** An opened cell at rest, laid once when it opens. */
export type Slide = {
  readonly cell: string;
  readonly path: string;
  /** The membrane, teeth and all, with its closing repeat dropped. */
  readonly ring: Ring;
  /** The skins of the cells it holds, cut out of the slide. */
  readonly holes: readonly Ring[];
  /** The slide cut into triangles: the ring's and the holes' points as `x, y` pairs, and three indices per triangle. */
  readonly vertices: Float32Array;
  readonly triangles: Uint32Array;
  /** How thick the membrane is drawn: the cell's interface (§5.1). */
  readonly thickness: number;
  readonly centre: Point;
  readonly radius: number;
  readonly exports: Exports;
  readonly files: readonly SlideFile[];
};

/** A file on the slide this frame: where it is, in its outline as the scheduler moves it. */
export type Body = SlideFile & { readonly x: number; readonly y: number; readonly r: number; readonly outline: Outline };

/** How the slide moves this frame: where the float has the cell's files (none while it rests), reduced motion, how far the exploded view has spread, 0 to 1, and how each rule count moves a shape. */
export type InteriorMotion = {
  readonly drifted?: readonly Drifted[];
  readonly reduced?: boolean;
  readonly explode?: number;
  readonly shape?: (rules: number) => ShapeMotion;
};

/** One file's tag in a column beside the slide: its words, its rule count, which column, its box on the screen, and the dotted leader from its edge to the body's rim. */
export type Tag = {
  readonly id: string;
  readonly text: string;
  readonly rules: number;
  readonly side: 'left' | 'right';
  readonly box: LabelBox;
  readonly leader: { readonly from: Point; readonly to: Point };
};

/** The screen the tags are kept on: its size in pixels, and how many pixels one layout unit takes. */
export type Screen = { readonly width: number; readonly height: number; readonly pixelsPerUnit: number };

/** A layout point's place on the screen, in pixels. */
export type Projection = (x: number, y: number) => Point;

/** How many rounds of pushing exploded bodies apart a layout takes. */
const ROUNDS = 12;
/** The pixels between two tags in a column, and between a column and the screen's edge. */
const TAG_ROW_GAP = 2;
const TAG_MARGIN = 8;
/** What an added file's name is written with (D120). */
const ADDED = '+';

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** A ring's middle and radius: the centre of its points, and the farthest of them from it. */
function extentOf(ring: Ring): { readonly centre: Point; readonly radius: number } {
  const x = ring.reduce((total, [px]) => total + px, 0) / ring.length;
  const y = ring.reduce((total, [, py]) => total + py, 0) / ring.length;
  return { centre: [x, y], radius: Math.max(...ring.map(([px, py]) => Math.hypot(px - x, py - y))) };
}

/** The point of a ring nearest `(x, y)`. */
function nearestOn(ring: Ring, x: number, y: number): Point {
  let best: Point = ring[0] ?? [x, y];
  let bestD2 = Number.POSITIVE_INFINITY;
  ring.forEach(([ax, ay], index) => {
    const [bx, by] = ring[(index + 1) % ring.length] ?? [ax, ay];
    const dx = bx - ax;
    const dy = by - ay;
    const length2 = dx * dx + dy * dy;
    const t = length2 === 0 ? 0 : clamp01(((x - ax) * dx + (y - ay) * dy) / length2);
    const px = ax + t * dx;
    const py = ay + t * dy;
    const d2 = (x - px) ** 2 + (y - py) ** 2;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = [px, py];
    }
  });
  return best;
}

/** The ring's uppermost point, the leftmost of a tie: where the weather hangs a storm. */
function topOf(ring: Ring): Point {
  let top: Point = ring[0] ?? [0, 0];
  for (const point of ring) if (point[1] < top[1] || (point[1] === top[1] && point[0] < top[0])) top = point;
  return top;
}

/** No motion at all: how a shape moves at rest, closed or under reduced motion. */
function still(): ShapeMotion {
  return AT_REST;
}

/** A file's short name, `+` before it when the change added it (D120). */
function nameOf(path: string, added: boolean): string {
  const base = path.slice(path.lastIndexOf('/') + 1);
  return added ? `${ADDED}${base}` : base;
}

/** Each changed placed file's stain, by path: its kind, its old path, and the share of its body left unstained. */
function stainsOf(map: MapJson): ReadonlyMap<string, Stain> {
  const stains = new Map<string, Stain>();
  for (const file of weatherOf(map).files) {
    if (file.change === undefined) continue;
    const skin = file.evidence?.skin;
    const open = skin === undefined ? 0 : skin.measured ? skin.open : 1;
    stains.set(file.path, { kind: file.change.kind, ...(file.change.from === undefined ? {} : { from: file.change.from }), open });
  }
  return stains;
}

type Spread = { x: number; y: number; readonly r: number };

/** Push two overlapping bodies apart along the line between them, each by half. */
function apart(a: Spread, b: Spread, gap: number): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy);
  const overlap = a.r + b.r + gap - distance;
  if (overlap <= 0) return;
  const [ux, uy] = distance === 0 ? [1, 0] : [dx / distance, dy / distance];
  a.x -= (ux * overlap) / 2;
  a.y -= (uy * overlap) / 2;
  b.x += (ux * overlap) / 2;
  b.y += (uy * overlap) / 2;
}

/**
 * Where the exploded view takes each file: out from the cell's middle along
 * its own bearing, a file at the middle along one its path draws, then a few
 * rounds pushing bodies apart so none overlaps another, in path order (C3).
 */
function explodedOf(files: readonly { readonly id: string; readonly rest: Position }[], centre: Point, radius: number, layout: InteriorLayout): readonly Point[] {
  const bodies = files.map(({ id, rest }): Spread => {
    const dx = rest.x - centre[0];
    const dy = rest.y - centre[1];
    const distance = Math.hypot(dx, dy);
    const angle = distance === 0 ? draw(seedOf(id), 0) * 2 * Math.PI : Math.atan2(dy, dx);
    const reach = distance * layout.explodeSpread + radius * layout.explodePush;
    return { x: centre[0] + Math.cos(angle) * reach, y: centre[1] + Math.sin(angle) * reach, r: rest.r };
  });
  for (let round = 0; round < ROUNDS; round += 1) {
    bodies.forEach((body, index) => {
      for (const other of bodies.slice(index + 1)) apart(body, other, layout.explodeGap);
    });
  }
  return bodies.map((body): Point => [body.x, body.y]);
}

/**
 * The slide an opened cell shows, laid once as it opens: none for a cell the
 * map lacks, the layout drew no skin for, or whose file floats on its
 * package's slide (D167). The barrel's exports sit on the
 * membrane nearest the barrel's own body, or at the membrane's top when the
 * cell has no barrel on the slide.
 */
export function cellSlide(map: MapJson, cell: string, layout: InteriorLayout = INTERIOR_LAYOUT): Slide | undefined {
  const found = map.terrain.cells.find((each) => each.id === cell);
  const contours = map.terrain.layout?.contours ?? {};
  const contour = contours[cell];
  if (found === undefined || contour === undefined || contour.length < 3 || slideCellOf(map, cell) !== cell) return undefined;
  const ring = openRing(dentedRing(contour, found.dents.length));
  const holes = heldCellsOf(map, cell).flatMap((each) => {
    const held = contours[each.id];
    return held === undefined || held.length < 3 ? [] : [openRing(held)];
  });
  const flat = [ring, ...holes].flatMap((each) => each.flatMap(([x, y]) => [x, y]));
  const holeStarts: number[] = [];
  let start = ring.length;
  for (const hole of holes) {
    holeStarts.push(start);
    start += hole.length;
  }
  const { centre, radius } = extentOf(ring);

  const positions = map.terrain.layout?.positions ?? {};
  const stains = stainsOf(map);
  const placed = slideFilesOf(map, cell);
  const rests = placed.map(({ organelle }) => ({ id: organelle.id, rest: positions[organelle.id] ?? { x: 0, y: 0, r: 0 } }));
  const exploded = explodedOf(rests, centre, radius, layout);
  const files = placed.map(({ organelle, looseness }, index): SlideFile => {
    const stain = stains.get(organelle.id);
    return {
      id: organelle.id,
      rest: rests[index]?.rest ?? { x: 0, y: 0, r: 0 },
      rules: rulesOf(organelle.dents),
      dents: organelle.dents,
      ...(stain === undefined ? {} : { stain }),
      ...(looseness === undefined ? {} : { looseness }),
      exploded: exploded[index] ?? [0, 0],
    };
  });

  const barrel = found.barrel === undefined ? undefined : files.find((file) => file.id === found.barrel);
  const [ex, ey] = barrel === undefined ? topOf(ring) : nearestOn(ring, barrel.rest.x, barrel.rest.y);
  // The names are the head's, so they are counted as they stand there; the count alone is the terrain's (D162).
  const exports: Exports = {
    count: found.exports?.length ?? found.interface_size,
    ...(found.exports === undefined ? {} : { names: found.exports }),
    ...(found.barrel === undefined ? {} : { barrel: nameOf(found.barrel, false) }),
    x: ex,
    y: ey,
  };

  return {
    cell,
    path: found.path,
    ring,
    holes,
    vertices: Float32Array.from(flat),
    triangles: Uint32Array.from(earcut(flat, holeStarts.length === 0 ? undefined : holeStarts)),
    thickness: membraneThickness(found.interface_size),
    centre,
    radius,
    exports,
    files,
  };
}

/**
 * The bodies on a slide this frame: each file where the float has it (D157,
 * D165), drawn toward its exploded spot by how far the view has spread, in
 * the outline its rule count moves (D147). At rest, and under reduced motion,
 * every body sits where the layout put it, still; so does a file the float
 * leaves out.
 */
export function interiorOf(slide: Slide, motion: InteriorMotion = {}): readonly Body[] {
  const drifted = new Map(motion.reduced === true ? [] : (motion.drifted ?? []).map((file) => [file.id, file] as const));
  const spread = clamp01(motion.explode ?? 0);
  const shape = motion.reduced === true ? still : (motion.shape ?? still);
  return slide.files.map((file): Body => {
    const at = drifted.get(file.id) ?? file.rest;
    const x = at.x + (file.exploded[0] - at.x) * spread;
    const y = at.y + (file.exploded[1] - at.y) * spread;
    const r = file.rest.r;
    return { ...file, x, y, r, outline: outlineOf(file.id, { x, y, r }, file.rules, file.rules === 0 ? AT_REST : shape(file.rules)) };
  });
}

/**
 * A column's tags stacked top-down from where each body projects, each at
 * least a row below the one above, then held on the screen: each is pulled up
 * from the foot leaving room for those below it, and down from the head
 * leaving room for those above, so the column keeps its order and its spacing
 * and fits the screen whenever it can.
 */
function stackColumn(wanted: readonly { readonly y: number }[], height: number, screenHeight: number): readonly number[] {
  const row = height + TAG_ROW_GAP;
  const tops: number[] = [];
  for (const { y } of wanted) {
    const previous = tops.at(-1);
    tops.push(previous === undefined ? y - height / 2 : Math.max(y - height / 2, previous + row));
  }
  const count = tops.length;
  return tops.map((top, index) => Math.max(TAG_MARGIN + index * row, Math.min(top, screenHeight - TAG_MARGIN - height - (count - 1 - index) * row)));
}

/**
 * The tags beside a slide on the screen: each body's name and rule count in
 * the column on its side of the slide's middle, stacked down the column by
 * where the body projects, the columns held against the slide's edges and
 * kept on the screen however the slide is framed (D155), each joined to its
 * body's rim by a leader from the tag's inner edge.
 */
export function tagsOf(slide: Slide, bodies: readonly Body[], project: Projection, screen: Screen, labeling: Labeling = LABELING): readonly Tag[] {
  const height = labeling.fontSize + 2 * labeling.pad;
  const ringOnScreen = slide.ring.map(([x, y]) => project(x, y));
  const x0 = Math.min(...ringOnScreen.map(([x]) => x));
  const x1 = Math.max(...ringOnScreen.map(([x]) => x));
  const middle = (x0 + x1) / 2;
  const wanted = bodies
    .map((body) => {
      const [sx, sy] = project(body.x, body.y);
      const text = `${nameOf(body.id, body.stain?.kind === 'added')}${body.rules > 0 ? ` · ${String(body.rules)}` : ''}`;
      const width = text.length * labeling.fontSize * MONO_ADVANCE + 2 * labeling.pad;
      return { body, text, width, x: sx, y: sy, side: sx < middle ? ('left' as const) : ('right' as const) };
    })
    .toSorted((a, b) => a.y - b.y || byPath(a.body.id, b.body.id));
  return (['left', 'right'] as const).flatMap((side): Tag[] => {
    const column = wanted.filter((each) => each.side === side);
    if (column.length === 0) return [];
    const widest = Math.max(...column.map((each) => each.width));
    // The column's inner edge: against the slide, pulled onto the screen when the slide runs off it.
    const edge = side === 'left' ? Math.max(x0 - labeling.gap, TAG_MARGIN + widest) : Math.min(x1 + labeling.gap, screen.width - TAG_MARGIN - widest);
    const tops = stackColumn(column, height, screen.height);
    return column.map((each, index): Tag => {
      const top = tops[index] ?? 0;
      const box: LabelBox = { x: side === 'left' ? edge - each.width : edge, y: top, width: each.width, height };
      const from: Point = [edge, top + height / 2];
      const dx = each.x - from[0];
      const dy = each.y - from[1];
      const distance = Math.hypot(dx, dy);
      const rim = each.body.r * screen.pixelsPerUnit;
      const to: Point = distance <= rim ? [each.x, each.y] : [each.x - (dx / distance) * rim, each.y - (dy / distance) * rim];
      return { id: each.body.id, text: each.text, rules: each.body.rules, side, box, leader: { from, to } };
    });
  });
}

/**
 * The lines the membrane writes for a cell's exports (D162): first the
 * barrel's name and the count, `index.ts · 3 exports`, or the count alone for
 * a cell with no barrel; then the names, a few to a line in columns as wide
 * as their longest name, the chrome's monospace table; and past the names
 * shown, how many more there are, `and 8 more`.
 */
export function exportsWords(exports: Exports, layout: InteriorLayout = INTERIOR_LAYOUT): readonly string[] {
  const count = `${String(exports.count)} ${exports.count === 1 ? 'export' : 'exports'}`;
  const head = exports.barrel === undefined ? count : `${exports.barrel} · ${count}`;
  const names = exports.names ?? [];
  const perLine = Math.max(1, Math.floor(layout.exportsPerLine));
  const shown = names.slice(0, Math.max(0, Math.floor(layout.exportsShown)));
  const rows = Array.from({ length: Math.ceil(shown.length / perLine) }, (_, row) => shown.slice(row * perLine, (row + 1) * perLine));
  const widths = Array.from({ length: perLine }, (_, column) => Math.max(0, ...rows.map((row) => row[column]?.length ?? 0)));
  const lines = rows.map((row) => row.map((name, column) => (column === row.length - 1 ? name : name.padEnd(widths[column] ?? 0))).join('  '));
  const rest = names.length - shown.length;
  return [head, ...lines, ...(rest > 0 ? [`and ${String(rest)} more`] : [])];
}
