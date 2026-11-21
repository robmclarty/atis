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
 * (D162, C2). The names the reach crossed the membrane by, those a reach
 * entry outside the cell carries (D111), are marked to be lit among them, and
 * are never the ones a long list counts away (D181). Each file is a body in
 * its morphed outline (D146), moved by the rules it breaks (D147) and floating
 * by its looseness (D157, D165) through the scheduler, and stained by what the
 * change did to it (hue is state, C11): added and modified through, the share
 * of its changed lines no test ran left unstained from the top clockwise, as
 * the evidence ring lights its gap (D71); a file nobody measured unstained
 * whole (D80); a deleted file its outline alone, the body gone; a renamed one
 * dashed (D40). Inside each body its functions are granules, a nucleus laid
 * by phyllotaxis from the body's middle inside the core its arms never cross,
 * each sized by its lines and dented by the thresholds it breaks, the densest
 * file on the slide reading full and the rest by their lines (D197); a file
 * the scan read no functions in has none (C2). On demand the exploded view
 * spreads the tags, not the bodies (D198): every body stays where the float
 * has it, and the file labels are tags in two columns on screen, just outside
 * the slide, left and right of it however it is framed and clear of the
 * chrome, each with its rule count (D155), joined to their bodies by long
 * elbowed leaders in the technical drawing's manner.
 *
 * Pure (C1): no three and no DOM. The world hands in where the scheduler's
 * float has the files and a projection
 * to the screen, and one input gives one layout (C3).
 */

import earcut from 'earcut';
import { membraneThickness } from 'core';
import type { ChangeKind, FileFunction, MapJson, Position, ReachEntry } from 'core';

import { GATHER, heldCellsOf, restOf, slideCellOf, slideFilesOf } from './drift.js';
import type { Drifted } from './drift.js';
import { LABELING } from './labels.js';
import type { LabelBox, Labeling } from './labels.js';
import { dentedRing } from './membranes.js';
import type { Point } from './minimap.js';
import { openRing } from './raster.js';
import type { Ring } from './raster.js';
import { AT_REST, draw, outlineOf, rulesOf, seedOf } from './shape.js';
import { troubleFrom, troubleOf } from './trouble.js';
import type { Outline, ShapeMotion } from './shape.js';
import { MONO_ADVANCE, NUCLEUS_FILL, NUCLEUS_MOST, NUCLEUS_PAD, TAG_ELBOW, TAG_ROW_FLOOR } from './tokens.js';
import { weatherOf } from './weather.js';

/**
 * How the slide is laid: how the membrane writes the exports, this many names to a
 * line, and this many before the rest are only counted; and how far the held
 * files gather toward the slide's middle and the loose toward its rim, 0 to 1
 * (D199), 0 resting every file where the layout put it. One object, handed
 * in, so the dev panel can move it live (D156); `INTERIOR_LAYOUT` is where it
 * rests.
 */
export type InteriorLayout = {
  readonly exportsPerLine: number;
  readonly exportsShown: number;
  readonly gather: number;
};

export const INTERIOR_LAYOUT: InteriorLayout = { exportsPerLine: 3, exportsShown: 12, gather: GATHER };

/** What the change did to a file, and the share of its body left unstained: its changed lines no test ran, or all of it when nobody measured (D80). */
/** `improved` where the change made the file healthier, which wears the calm-positive hue in place of the change hue (D98). */
export type Stain = { readonly kind: ChangeKind; readonly from?: string; readonly open: number; readonly improved?: true };

/** A file on the slide at rest: where it rests, the layout's place gathered by how its cellmates hold it (D199), its lines and the functions the head scan read in it, where it read any (D197), the rules it breaks, where its trouble puts it on the shape spectrum (D194), its stain, and its looseness. */
export type SlideFile = {
  readonly id: string;
  readonly rest: Position;
  readonly lines: number;
  readonly functions?: readonly FileFunction[];
  readonly rules: number;
  readonly score: number;
  readonly dents: readonly string[];
  readonly stain?: Stain;
  readonly looseness?: number;
};

/**
 * The barrel's exports as the membrane writes them: how many, their names
 * where the map records them (D162), those of them the reach crossed the
 * membrane by (D181), the barrel's name when the cell has one, and the point
 * of the membrane they sit at.
 */
export type Exports = {
  readonly count: number;
  readonly names?: readonly string[];
  readonly reached?: readonly string[];
  readonly barrel?: string;
  readonly x: number;
  readonly y: number;
};

/** One name the membrane writes, padded to its column, and whether the reach crossed the membrane by it (D181). */
export type ExportName = { readonly name: string; readonly text: string; readonly reached: boolean };

/** The membrane's exports as written: the barrel and the count, the names shown in rows, and how many more there are, where any are. */
export type ExportsTable = { readonly head: string; readonly rows: readonly (readonly ExportName[])[]; readonly tail?: string };

/** What lies between two names on a row of the membrane's exports. */
export const EXPORTS_GAP = '  ';

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
  /** The lines of the largest file on the slide, which the nuclei fill by (D197). */
  readonly mostLines: number;
  readonly exports: Exports;
  readonly files: readonly SlideFile[];
};

/**
 * The nucleus's tokens as one object, so a registry can hand in live values
 * (D156); `NUCLEUS_TOKENS` is where they rest, at `tokens.ts`'s values.
 */
export type NucleusTokens = { readonly NUCLEUS_FILL: number; readonly NUCLEUS_PAD: number; readonly NUCLEUS_MOST: number };
export const NUCLEUS_TOKENS: NucleusTokens = { NUCLEUS_FILL, NUCLEUS_PAD, NUCLEUS_MOST };

/** One function as a granule in its file's nucleus: what it is, the rules it breaks, and where it lies from the body's middle, in its outline, dented once per rule (D197, D102). */
export type NucleusGranule = {
  readonly name: string;
  readonly line: number;
  readonly line_count: number;
  readonly rules: readonly string[];
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly ring: readonly Point[];
};

/**
 * A file's nucleus (D197): its granules in line order, each placed from the
 * body's middle, so the nucleus rides the body wherever the float has it and
 * keeps still inside it; and how many functions past the most it draws are
 * only counted.
 */
export type Nucleus = { readonly granules: readonly NucleusGranule[]; readonly more: number };

/** A file on the slide this frame: where it is, in its outline as the scheduler moves it, with its nucleus where the scan read its functions. */
export type Body = SlideFile & { readonly x: number; readonly y: number; readonly r: number; readonly outline: Outline; readonly nucleus?: Nucleus };

/**
 * How the slide moves this frame: where the float has the cell's files (none
 * while it rests), reduced motion, how each trouble score moves a shape, and the demo switch, under which
 * the bodies take scores across the spectrum in place of their trouble (D202);
 * and the nucleus's tokens, resting when left out.
 */
export type InteriorMotion = {
  readonly drifted?: readonly Drifted[];
  readonly reduced?: boolean;
  readonly shape?: (score: number) => ShapeMotion;
  readonly shapes?: 'demo';
  readonly nucleus?: NucleusTokens;
};

/** A tag's leader on the screen (D198): from the tag's inner edge straight toward the slide to its elbow, then to the body's rim. */
export type Leader = { readonly from: Point; readonly elbow: Point; readonly to: Point };

/**
 * One tag in a column beside the slide: a file's, with its words, its rule
 * count, the functions its nucleus only counts, and the leader to its body;
 * or a column's footer, which counts the tags the column had no row for
 * (`more`) and has no leader. Each says which column it stands in, its box
 * on the screen, and the size its words are set at, smaller where the
 * column's rows shrank to fit.
 */
export type Tag = {
  readonly id: string;
  readonly text: string;
  readonly rules: number;
  readonly side: 'left' | 'right';
  readonly box: LabelBox;
  readonly fontSize: number;
  readonly leader?: Leader;
  readonly more?: number;
};

/** The screen's edges the chrome claims, in pixels: the tags keep inside what is left (P25). */
export type Margins = { readonly top: number; readonly bottom: number; readonly left: number; readonly right: number };

/** The screen the tags are kept on: its size in pixels, how many pixels one layout unit takes, and the margins the chrome claims, none when left out. */
export type Screen = { readonly width: number; readonly height: number; readonly pixelsPerUnit: number; readonly margins?: Margins };

/**
 * The tags' tokens as one object, so a registry can hand in live values
 * (D156); `TAG_TOKENS` is where they rest, at `tokens.ts`'s values.
 */
export type TagTokens = { readonly TAG_ELBOW: number; readonly TAG_ROW_FLOOR: number };
export const TAG_TOKENS: TagTokens = { TAG_ELBOW, TAG_ROW_FLOOR };

/** A layout point's place on the screen, in pixels. */
export type Projection = (x: number, y: number) => Point;

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
    const improved = file.change.improvements === undefined ? {} : { improved: true as const };
    stains.set(file.path, { kind: file.change.kind, ...(file.change.from === undefined ? {} : { from: file.change.from }), open, ...improved });
  }
  return stains;
}

/** A name the reach crossed a cell's membrane by, and the reach entries outside the cell that it carried, in the map's order (D181). */
export type Crossing = { readonly name: string; readonly entries: readonly ReachEntry[] };

/**
 * The names the reach crossed a cell's membrane by, in the membrane's own
 * order (D181): each of the cell's exported names that a reach entry for a
 * file outside the cell carries (D111), a file in a cell it holds, however
 * deep, being inside it, with the entries that carried it. None for a cell
 * the map lacks or records no names for (D162, C2). What the membrane lights
 * and what the Reach block opens on while the cell is open (D186) both read
 * it.
 */
export function crossingsOf(map: MapJson, cell: string): readonly Crossing[] | undefined {
  const names = map.terrain.cells.find((each) => each.id === cell)?.exports;
  if (names === undefined) return undefined;
  const parentOf = new Map(map.terrain.cells.flatMap((each) => (each.parent === undefined ? [] : [[each.id, each.parent] as const])));
  const inside = (id: string | undefined): boolean => id !== undefined && (id === cell || inside(parentOf.get(id)));
  const outside = map.weather.reach.filter((entry) => !inside(entry.cell));
  return names.flatMap((name) => {
    const entries = outside.filter((entry) => entry.names?.includes(name) === true);
    return entries.length === 0 ? [] : [{ name, entries }];
  });
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

  const gathered = restOf(map, cell, layout.gather);
  const stains = stainsOf(map);
  const placed = slideFilesOf(map, cell);
  const rests = placed.map(({ organelle }) => ({ id: organelle.id, rest: gathered.get(organelle.id) ?? { x: 0, y: 0, r: 0 } }));
  const files = placed.map(({ organelle, looseness }, index): SlideFile => {
    const stain = stains.get(organelle.id);
    return {
      id: organelle.id,
      rest: rests[index]?.rest ?? { x: 0, y: 0, r: 0 },
      lines: organelle.loc,
      ...(organelle.functions === undefined ? {} : { functions: organelle.functions }),
      rules: rulesOf(organelle.dents),
      score: troubleOf(organelle).score,
      dents: organelle.dents,
      ...(stain === undefined ? {} : { stain }),
      ...(looseness === undefined ? {} : { looseness }),
    };
  });

  const barrel = found.barrel === undefined ? undefined : files.find((file) => file.id === found.barrel);
  const [ex, ey] = barrel === undefined ? topOf(ring) : nearestOn(ring, barrel.rest.x, barrel.rest.y);
  // The names are the head's, so they are counted as they stand there; the count alone is the terrain's (D162).
  const reached = (crossingsOf(map, cell) ?? []).map((crossing) => crossing.name);
  const exports: Exports = {
    count: found.exports?.length ?? found.interface_size,
    ...(found.exports === undefined ? {} : { names: found.exports }),
    ...(reached.length === 0 ? {} : { reached }),
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
    mostLines: Math.max(0, ...files.map((file) => file.lines)),
    exports,
    files,
  };
}

/** The golden angle, which turns each granule of a nucleus from the last so no two spokes line up. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
/** The draw a file's nucleus takes its first spoke from, clear of the shape's own. */
const NUCLEUS_DRAW = 170;
/** The densest a spiral of granules is laid, as the share of its disc they cover: past it equal neighbours on the spiral would lie over one another. */
const NUCLEUS_PACK_MOST = 0.55;

/** What a nucleus is laid from: the file's path, its lines, and the functions the head scan read in it, where it read any. A file on a slide is one, and so is a file at rest on the map (D290 (nucleus-by-number)). */
export type NucleusFile = Pick<SlideFile, 'id' | 'lines' | 'functions'>;

/** Each file's nucleus as last laid, so a frame that asks again for the same core and tokens gets the one laid. */
const NUCLEI = new WeakMap<NucleusFile, { readonly key: string; readonly nucleus: Nucleus }>();

/**
 * A file's nucleus inside its outline (D197): one granule per function the
 * head scan read, in line order, on a phyllotaxis spiral from the body's
 * middle, each turned the golden angle from the last and as far out as the
 * area of those before it and half its own, so equal granules stand at the
 * square root of their index and a half, and a lone one at the middle. A granule's radius goes as the square root of its lines, and
 * the set is scaled so its summed area is `NUCLEUS_FILL` of the core's, times
 * the file's lines over the largest file's on the slide: the densest file
 * reads full and every other by its lines. The spiral is spaced so a full
 * nucleus spans the core less `NUCLEUS_PAD`, or as near that as it can be
 * laid with its granules clear of one another; one whose outermost granule
 * would spill past the padded core is shrunk whole, places and radii alike,
 * until it fits, so no granule meets the outline however the shape moves. Each
 * granule's ring is the plate's outline at its breaches' score (D102). Past
 * `NUCLEUS_MOST` functions the largest are drawn, in line order, and the rest
 * counted. None for a file the scan read no functions in, never one made
 * from a count alone (C2). The granules lie from the body's middle and do
 * not pulse or turn: one file, one core and one set of tokens give one
 * nucleus (C3). `mostLines` is the line count the fill is measured against,
 * handed in as a number (D290 (nucleus-by-number)): the slide's largest file
 * for a body on a slide, and the same for a file at rest on the map, which
 * has no slide to read it from.
 */
export function nucleusOf(file: NucleusFile, outline: Outline, mostLines: number, tokens: NucleusTokens = NUCLEUS_TOKENS): Nucleus | undefined {
  const functions = file.functions;
  if (functions === undefined || functions.length === 0 || file.lines <= 0 || mostLines <= 0 || outline.core <= 0) return undefined;
  const key = [outline.core, mostLines, tokens.NUCLEUS_FILL, tokens.NUCLEUS_PAD, tokens.NUCLEUS_MOST].join(' ');
  const last = NUCLEI.get(file);
  if (last?.key === key) return last.nucleus;

  const most = Math.max(1, Math.floor(tokens.NUCLEUS_MOST));
  const kept = new Set(
    functions
      .map((fn, index) => ({ fn, index }))
      .toSorted((a, b) => b.fn.line_count - a.fn.line_count || a.index - b.index)
      .slice(0, most)
      .map((each) => each.index),
  );
  const drawn = functions.filter((_, index) => kept.has(index));
  const fill = clamp01(tokens.NUCLEUS_FILL) * Math.min(1, file.lines / mostLines);
  const pad = clamp01(tokens.NUCLEUS_PAD);
  const limit = outline.core * (1 - pad);
  // A full nucleus spans the padded core, so the spiral is as dense as that takes, and never so dense its granules overlap.
  const pack = Math.min(NUCLEUS_PACK_MOST, clamp01(tokens.NUCLEUS_FILL) / Math.max((1 - pad) ** 2, Number.EPSILON));
  const lines = drawn.reduce((total, fn) => total + fn.line_count, 0);
  if (fill <= 0 || limit <= 0 || pack <= 0 || lines <= 0) return undefined;
  const scale = outline.core * Math.sqrt(fill / lines);
  const turn = draw(seedOf(file.id), NUCLEUS_DRAW) * 2 * Math.PI;
  let within = 0;
  const laid = drawn.map((fn, index) => {
    const r = Math.sqrt(fn.line_count) * scale;
    // As far out as the area of those before it and half its own, which keeps the first few clear of one another; a lone granule sits at the middle.
    const away = drawn.length === 1 ? 0 : Math.sqrt((within + (r * r) / 2) / pack);
    within += r * r;
    const rules = fn.breaches ?? [];
    // The granule's outline on a unit body, which its radius then sizes: the plate's, at its breaches' score (D102, Q97).
    const unit = outlineOf(`${file.id}#${fn.name}@${String(fn.line)}`, { x: 0, y: 0, r: 1 }, troubleFrom(rules.length));
    return { fn, rules, r, away, theta: turn + index * GOLDEN_ANGLE, unit };
  });
  const furthest = Math.max(...laid.map((each) => each.away + each.r * each.unit.extent));
  const shrink = furthest <= limit ? 1 : limit / furthest;
  const nucleus: Nucleus = {
    granules: laid.map(({ fn, rules, r, away, theta, unit }): NucleusGranule => {
      const x = Math.cos(theta) * away * shrink;
      const y = Math.sin(theta) * away * shrink;
      const radius = r * shrink;
      return { name: fn.name, line: fn.line, line_count: fn.line_count, rules, x, y, r: radius, ring: unit.ring.map(([ux, uy]): Point => [x + ux * radius, y + uy * radius]) };
    }),
    more: functions.length - drawn.length,
  };
  NUCLEI.set(file, { key, nucleus });
  return nucleus;
}

/** The demo switch's scores, by path (D202): each file's index in path order over the last index, 0 for a lone file. */
function demoScores(files: readonly SlideFile[]): ReadonlyMap<string, number> {
  const paths = files.map((file) => file.id).toSorted();
  const last = paths.length - 1;
  return new Map(paths.map((path, index) => [path, last === 0 ? 0 : index / last] as const));
}

/**
 * The bodies on a slide this frame: each file where the float has it (D157,
 * D165), whether or not the exploded view is spread, which moves the tags
 * and never a body (D198), in the outline its trouble score moves (D147, D194). At rest, and under reduced motion,
 * every body sits at its rest (D199), still; so does a file the float
 * leaves out. Under the demo switch each body's score is its place in path
 * order across the spectrum, the first file smooth and the last spiky, so a
 * cell of any map shows every form (D202).
 */
export function interiorOf(slide: Slide, motion: InteriorMotion = {}): readonly Body[] {
  const drifted = new Map(motion.reduced === true ? [] : (motion.drifted ?? []).map((file) => [file.id, file] as const));
  const shape = motion.reduced === true ? still : (motion.shape ?? still);
  const demo = motion.shapes === 'demo' ? demoScores(slide.files) : undefined;
  return slide.files.map((file): Body => {
    const { x, y } = drifted.get(file.id) ?? file.rest;
    const r = file.rest.r;
    const score = demo?.get(file.id) ?? file.score;
    const outline = outlineOf(file.id, { x, y, r }, score, shape(score));
    const nucleus = nucleusOf(file, outline, slide.mostLines, motion.nucleus);
    return { ...file, score, x, y, r, outline, ...(nucleus === undefined ? {} : { nucleus }) };
  });
}

/**
 * A column's tags stacked top-down from where each body projects, each at
 * least a row below the one above, then held between the column's head and
 * foot: each is pulled up from the foot leaving room for those below it, and
 * down from the head leaving room for those above, so the column keeps its
 * order and its spacing and fits whenever it can.
 */
function stackColumn(wanted: readonly { readonly y: number }[], height: number, head: number, foot: number): readonly number[] {
  const row = height + TAG_ROW_GAP;
  const tops: number[] = [];
  for (const { y } of wanted) {
    const previous = tops.at(-1);
    tops.push(previous === undefined ? y - height / 2 : Math.max(y - height / 2, previous + row));
  }
  const count = tops.length;
  return tops.map((top, index) => Math.max(head + index * row, Math.min(top, foot - height - (count - 1 - index) * row)));
}

const NO_MARGINS: Margins = { top: 0, bottom: 0, left: 0, right: 0 };

/**
 * The tags beside a slide on the screen (D198): each body's name, its rule
 * count and the functions its nucleus only counts (`+12 fn`, D197) in the
 * column on its side of the slide's middle, stacked down the column by where
 * the body projects. The columns stand just outside the slide, an elbow's
 * length off its edges, and are pulled onto the screen only when the slide
 * runs off it, then clear of the margins the chrome claims (D155, P25). Each
 * tag is joined to its body by a leader that leaves the tag's inner edge
 * straight toward the slide for `TAG_ELBOW` pixels, or as far as the body
 * leaves room for, and then turns for the body's rim.
 *
 * A column with more tags than rows shrinks its rows, and the words with
 * them, no smaller than `TAG_ROW_FLOOR`. Where they still do not fit it
 * keeps the tags of the bodies nearest the view's middle, as many as fit
 * above a footer, in the bodies' order down the screen, and the footer
 * counts the rest: `and 23 more` (Q89).
 */
export function tagsOf(slide: Slide, bodies: readonly Body[], project: Projection, screen: Screen, labeling: Labeling = LABELING, tokens: TagTokens = TAG_TOKENS): readonly Tag[] {
  const margins = screen.margins ?? NO_MARGINS;
  const full = labeling.fontSize + 2 * labeling.pad;
  const floor = Math.min(full, Math.max(1, tokens.TAG_ROW_FLOOR));
  const head = margins.top + TAG_MARGIN;
  const foot = screen.height - margins.bottom - TAG_MARGIN;
  const room = Math.max(0, foot - head);
  const centre: Point = [(margins.left + screen.width - margins.right) / 2, (margins.top + screen.height - margins.bottom) / 2];
  const ringOnScreen = slide.ring.map(([x, y]) => project(x, y));
  const x0 = Math.min(...ringOnScreen.map(([x]) => x));
  const x1 = Math.max(...ringOnScreen.map(([x]) => x));
  const middle = (x0 + x1) / 2;
  const wanted = bodies
    .map((body) => {
      const [sx, sy] = project(body.x, body.y);
      const more = body.nucleus?.more ?? 0;
      const text = `${nameOf(body.id, body.stain?.kind === 'added')}${body.rules > 0 ? ` · ${String(body.rules)}` : ''}${more > 0 ? ` · +${String(more)} fn` : ''}`;
      return { body, text, x: sx, y: sy, side: sx < middle ? ('left' as const) : ('right' as const) };
    })
    .toSorted((a, b) => a.y - b.y || byPath(a.body.id, b.body.id));
  return (['left', 'right'] as const).flatMap((side): Tag[] => {
    const every = wanted.filter((each) => each.side === side);
    if (every.length === 0) return [];
    // The rows: full where the column fits, shrunk toward the floor where it does not, and at the floor only as many tags as fit above a footer.
    const fits = (count: number, height: number): boolean => count * height + (count - 1) * TAG_ROW_GAP <= room;
    const height = fits(every.length, full) ? full : Math.min(full, Math.max(floor, Math.floor((room - (every.length - 1) * TAG_ROW_GAP) / every.length)));
    const rows = fits(every.length, height) ? every.length : Math.max(1, Math.floor((room + TAG_ROW_GAP) / (height + TAG_ROW_GAP)));
    const kept = new Set(
      rows >= every.length
        ? every
        : every
            .toSorted((a, b) => Math.hypot(a.x - centre[0], a.y - centre[1]) - Math.hypot(b.x - centre[0], b.y - centre[1]) || byPath(a.body.id, b.body.id))
            .slice(0, rows - 1),
    );
    const column = every.filter((each) => kept.has(each));
    const rest = every.length - column.length;
    // The words shrink with their row, a pixel clear of it above and below.
    const fontSize = Math.min(labeling.fontSize, Math.max(1, height - 2));
    const widthOf = (text: string): number => text.length * fontSize * MONO_ADVANCE + 2 * labeling.pad;
    const footer = rest > 0 ? `and ${String(rest)} more` : undefined;
    const widest = Math.max(...column.map((each) => widthOf(each.text)), footer === undefined ? 0 : widthOf(footer));
    // The column's inner edge: an elbow's length off the slide, pulled onto the screen and clear of the chrome's claims when the slide runs off it.
    const edge = side === 'left' ? Math.max(x0 - labeling.gap - tokens.TAG_ELBOW, margins.left + TAG_MARGIN + widest) : Math.min(x1 + labeling.gap + tokens.TAG_ELBOW, screen.width - margins.right - TAG_MARGIN - widest);
    const inward = side === 'left' ? 1 : -1;
    const tops = stackColumn(footer === undefined ? column : [...column, { y: Number.NEGATIVE_INFINITY }], height, head, foot);
    const boxAt = (top: number, width: number): LabelBox => ({ x: side === 'left' ? edge - width : edge, y: top, width, height });
    const tags = column.map((each, index): Tag => {
      const top = tops[index] ?? 0;
      const from: Point = [edge, top + height / 2];
      const rim = each.body.r * screen.pixelsPerUnit;
      // Straight toward the slide, never past the body's near rim, then on to the rim.
      const elbow: Point = [edge + inward * Math.max(0, Math.min(tokens.TAG_ELBOW, (each.x - edge) * inward - rim)), from[1]];
      const dx = each.x - elbow[0];
      const dy = each.y - elbow[1];
      const distance = Math.hypot(dx, dy);
      const to: Point = distance <= rim ? [each.x, each.y] : [each.x - (dx / distance) * rim, each.y - (dy / distance) * rim];
      return { id: each.body.id, text: each.text, rules: each.body.rules, side, box: boxAt(top, widthOf(each.text)), fontSize, leader: { from, elbow, to } };
    });
    return footer === undefined ? tags : [...tags, { id: `${side}: more`, text: footer, rules: 0, side, box: boxAt(tops.at(-1) ?? head, widthOf(footer)), fontSize, more: rest }];
  });
}

/**
 * The membrane's exports as a table (D162): first the barrel's name and the
 * count, `index.ts · 3 exports`, or the count alone for a cell with no
 * barrel; then the names, a few to a line in columns as wide as their
 * longest name, the chrome's monospace table, each marked where the reach
 * crossed the membrane by it (D181); and past the names shown, how many more
 * there are, `and 8 more`. The names the reach crossed by are kept among
 * those shown before any other, so a long list never counts one away, and
 * the names keep their own order.
 */
export function exportsTable(exports: Exports, layout: InteriorLayout = INTERIOR_LAYOUT): ExportsTable {
  const count = `${String(exports.count)} ${exports.count === 1 ? 'export' : 'exports'}`;
  const head = exports.barrel === undefined ? count : `${exports.barrel} · ${count}`;
  const names = exports.names ?? [];
  const reached = new Set(exports.reached ?? []);
  const perLine = Math.max(1, Math.floor(layout.exportsPerLine));
  const kept = new Set([...names.filter((name) => reached.has(name)), ...names.filter((name) => !reached.has(name))].slice(0, Math.max(0, Math.floor(layout.exportsShown))));
  const shown = names.filter((name) => kept.has(name));
  const rows = Array.from({ length: Math.ceil(shown.length / perLine) }, (_, row) => shown.slice(row * perLine, (row + 1) * perLine));
  const widths = Array.from({ length: perLine }, (_, column) => Math.max(0, ...rows.map((row) => row[column]?.length ?? 0)));
  const rest = names.length - shown.length;
  return {
    head,
    rows: rows.map((row) => row.map((name, column) => ({ name, text: column === row.length - 1 ? name : name.padEnd(widths[column] ?? 0), reached: reached.has(name) }))),
    ...(rest > 0 ? { tail: `and ${String(rest)} more` } : {}),
  };
}

/** The lines the membrane writes for a cell's exports: its table, a row to a line (D162). */
export function exportsWords(exports: Exports, layout: InteriorLayout = INTERIOR_LAYOUT): readonly string[] {
  const { head, rows, tail } = exportsTable(exports, layout);
  return [head, ...rows.map((row) => row.map((cell) => cell.text).join(EXPORTS_GAP)), ...(tail === undefined ? [] : [tail])];
}
