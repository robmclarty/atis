/**
 * terrain: the ground the weather is drawn over (§5.1, D13), as still SVG.
 *
 * Read downward, like the field it draws (D24): the terraces, band 0 at the
 * top where the entry points are and the deepest band at the bottom. The
 * shore, the tracked files that are not code (D48), is no land here: the
 * chrome draws it as a band of flat blocks under the world (D153, D158). Over them the membranes, one closed path per cell traced from
 * the contour core cut, its stroke as thick as the cell's interface: a deep
 * module is a big body with a thin skin. On top the organelles, a circle sized
 * by mass, or, when a file breaks rules, its outline morphed by how many
 * (D146), and the same small glyph on every member of a clone family. A
 * cell wears its own rules and family the same way, on its skin: one point
 * pulled out of the membrane per rule its files break, and its family's glyph
 * just outside it.
 *
 * Everything here is base tissue, greyscale and dim, drawn to be found rather
 * than seen (§5.6, D11). Nothing here draws an import edge (§5.1) and nothing
 * here is luminous: that is the weather's to say. Nothing here computes a
 * position either; the renderer reads `map.json` and draws what it finds
 * (D33), which is what lets two renderers draw one terrain.
 */

import { membraneThickness } from 'core';
import type { Cell, Contour, Layout, Organelle, Position, Terrain } from 'core';
import {
  FIELD_FILL,
  GLYPH_OFFSET,
  GLYPH_STROKE,
  MEMBRANE_DENT_PULL,
  MEMBRANE_DENT_SPAN,
  MEMBRANE_FILL,
  MEMBRANE_FILL_OPACITY,
  MEMBRANE_STROKE,
  ORGANELLE_FILL,
  ORGANELLE_STROKE,
  ORGANELLE_STROKE_WIDTH,
  TERRACE_FILL,
  TERRACE_LINE,
  TERRACE_LINE_WIDTH,
  outlineOf,
  rulesOf,
} from 'scene';

import { el, num } from './el.js';
import type { Markup } from './el.js';

/**
 * The clone glyphs, one per family in the order the families sort, wrapping
 * when a map has more families than shapes. Each is a small stroke drawn
 * about its own origin: two bars, a triangle, a square, a diamond, a cross,
 * a ring. The bars come first because two of a thing is what duplication is.
 */
const GLYPHS: readonly string[] = [
  'M-3 -2H3M-3 2H3',
  'M0 -3L3 2H-3Z',
  'M-2.5 -2.5H2.5V2.5H-2.5Z',
  'M0 -3L3 0L0 3L-3 0Z',
  'M-3 -3L3 3M-3 3L3 -3',
  'M0 -3A3 3 0 1 1 0 3A3 3 0 1 1 0 -3Z',
];

type Point = readonly [number, number];

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** A closed ring as a path: the first point moved to, the rest drawn to, then closed. The weather glows through the same path. */
export function pathOf(contour: Contour): string {
  const [first, ...rest] = contour;
  if (first === undefined) return '';
  return `M${num(first[0])} ${num(first[1])}${rest.map(([x, y]) => `L${num(x)} ${num(y)}`).join('')}Z`;
}

/** The near-black the whole map is dim against, from the world's top, `top` in the layout's units, down. */
export function drawField(layout: Layout, top: number): Markup {
  return el('rect', { id: 'field', x: 0, y: top, width: layout.width, height: layout.height - top, fill: FIELD_FILL });
}

/** One faint strip and one contour line per band, band 0 uppermost: the entry points are at the top (D13). */
export function drawTerraces(layout: Layout): Markup {
  const bands = [...layout.bands].toSorted((a, b) => a.index - b.index);
  return el(
    'g',
    { id: 'terraces' },
    bands.map((band) =>
      el('g', { 'data-band': band.index }, [
        el('rect', { x: 0, y: band.y0, width: layout.width, height: band.y1 - band.y0, fill: TERRACE_FILL }),
        el('line', {
          x1: 0,
          y1: band.y0,
          x2: layout.width,
          y2: band.y0,
          stroke: TERRACE_LINE,
          'stroke-width': TERRACE_LINE_WIDTH,
        }),
      ]),
    ),
  );
}

/** How many cells stand between a cell and the top of its tree, bounded so a malformed chain cannot loop. */
function nestingOf(cells: readonly Cell[]): ReadonlyMap<string, number> {
  const parents = new Map(cells.map((cell) => [cell.id, cell.parent] as const));
  const depthOf = (id: string): number => {
    let depth = 0;
    for (let parent = parents.get(id); parent !== undefined && depth < cells.length; parent = parents.get(parent)) {
      depth += 1;
    }
    return depth;
  };
  return new Map(cells.map((cell) => [cell.id, depthOf(cell.id)]));
}

/** The ring once round, without the point that closes it, so no vertex is counted twice. */
function openRing(contour: Contour): readonly Point[] {
  const first = contour[0];
  const last = contour.at(-1);
  const closed = contour.length > 1 && first !== undefined && last !== undefined && first[0] === last[0] && first[1] === last[1];
  return closed ? contour.slice(0, -1) : contour;
}

/** Where a ring is read along its length: each vertex's distance from the first, the whole length, and which way round it runs. */
type Walk = {
  readonly ring: readonly Point[];
  readonly at: readonly number[];
  readonly length: number;
  /** 1 when the shoelace area is positive, -1 when negative: which side of travel is outside. */
  readonly turn: number;
};

function walkOf(ring: readonly Point[]): Walk {
  const at: number[] = [];
  let length = 0;
  let area = 0;
  ring.forEach(([x, y], index) => {
    const [nx, ny] = ring[(index + 1) % ring.length] ?? [x, y];
    at.push(length);
    length += Math.hypot(nx - x, ny - y);
    area += x * ny - nx * y;
  });
  return { ring, at, length, turn: area < 0 ? -1 : 1 };
}

/** The point a given distance along the ring, wrapping past its end. */
function pointAlong(walk: Walk, distance: number): Point {
  const along = ((distance % walk.length) + walk.length) % walk.length;
  const { ring, at } = walk;
  let index = at.length - 1;
  while (index > 0 && (at[index] ?? 0) > along) index -= 1;
  const [x, y] = ring[index] ?? [0, 0];
  const [nx, ny] = ring[(index + 1) % ring.length] ?? [x, y];
  const span = Math.hypot(nx - x, ny - y);
  const share = span === 0 ? 0 : (along - (at[index] ?? 0)) / span;
  return [x + (nx - x) * share, y + (ny - y) * share];
}

/** The ring's uppermost vertex, the leftmost of a tie: the same top the weather hangs a storm from. */
function topIndex(ring: readonly Point[]): number {
  let top = 0;
  ring.forEach(([x, y], index) => {
    const [tx, ty] = ring[top] ?? [x, y];
    if (y < ty || (y === ty && x < tx)) top = index;
  });
  return top;
}

/**
 * A cell's skin with one point pulled out per breached rule, the way an
 * organelle pulls a vertex (§5.1). The points are spread evenly along the
 * ring by its length and phased so the ring's top falls midway between two
 * of them, because the top is where the weather hangs a storm. Each is a
 * tooth: the ring is cut `MEMBRANE_DENT_SPAN` either side of the point,
 * narrower when the teeth would crowd, and the point is drawn
 * `MEMBRANE_DENT_PULL` out from the chord the cut leaves. Every other vertex
 * stays where core put it, and the dented ring is written from its top.
 */
function dentedRing(contour: Contour, dents: number): readonly Point[] {
  const walk = walkOf(openRing(contour));
  if (dents === 0 || walk.ring.length < 3 || walk.length === 0) return contour;
  const start = walk.at[topIndex(walk.ring)] ?? 0;
  const spacing = walk.length / dents;
  const span = Math.min(MEMBRANE_DENT_SPAN, spacing / 4);
  const teeth = Array.from({ length: dents }, (_, k) => spacing / 2 + k * spacing);
  const cut = (key: number): boolean => teeth.some((centre) => key >= centre - span && key <= centre + span);
  const kept = walk.ring.flatMap((point, index) => {
    const key = ((((walk.at[index] ?? 0) - start) % walk.length) + walk.length) % walk.length;
    return cut(key) ? [] : [{ key, point }];
  });
  const pulled = teeth.flatMap((centre) => {
    const [ax, ay] = pointAlong(walk, start + centre - span);
    const [bx, by] = pointAlong(walk, start + centre + span);
    const [cx, cy] = pointAlong(walk, start + centre);
    const chord = Math.hypot(bx - ax, by - ay);
    const [ox, oy] = chord === 0 ? [0, 0] : [(walk.turn * (by - ay)) / chord, (walk.turn * (ax - bx)) / chord];
    return [
      { key: centre - span, point: [ax, ay] as const },
      { key: centre, point: [cx + ox * MEMBRANE_DENT_PULL, cy + oy * MEMBRANE_DENT_PULL] as const },
      { key: centre + span, point: [bx, by] as const },
    ];
  });
  return [...kept, ...pulled].toSorted((a, b) => a.key - b.key).map(({ point }) => point);
}

/** The ring's upper right, the point furthest along the diagonal up and right, where a cell's glyph hangs as an organelle's does. */
function upperRightOf(ring: readonly Point[]): Point | undefined {
  let corner: Point | undefined;
  for (const point of ring) {
    if (corner === undefined || point[0] - point[1] > corner[0] - corner[1]) corner = point;
  }
  return corner;
}

/**
 * One path per cell that has a contour, the outermost cells first so a
 * folder's skin is drawn over the package's that holds it (D45), and the
 * stroke as thick as the cell's interface (§5.1). The fill is translucent,
 * so where skins nest the body reads a shade fuller, which is the nesting.
 * A cell whose files break rules is drawn dented, one tooth per rule, and a
 * cell in a clone family carries the family's glyph past its upper right,
 * the glyphs drawn after every skin so none is under a nested body.
 */
export function drawMembranes(terrain: Terrain, layout: Layout): Markup {
  const contours = layout.contours ?? {};
  const nesting = nestingOf(terrain.cells);
  const families = familiesOf(terrain);
  const cells = [...terrain.cells].toSorted(
    (a, b) => (nesting.get(a.id) ?? 0) - (nesting.get(b.id) ?? 0) || byPath(a.id, b.id),
  );
  const skins = cells.flatMap((cell) => {
    const contour = contours[cell.id];
    if (contour === undefined) return [];
    return [{ cell, ring: dentedRing(contour, cell.dents.length), thickness: membraneThickness(cell.interface_size) }];
  });
  const glyphs = skins.flatMap(({ cell, ring, thickness }) => {
    const family = cell.clone_family;
    const corner = upperRightOf(ring);
    if (family === undefined || corner === undefined) return [];
    const offset = (thickness / 2 + GLYPH_OFFSET) * Math.SQRT1_2;
    return [drawGlyph(cell.id, family, families.get(family) ?? 0, [corner[0] + offset, corner[1] - offset])];
  });
  return el(
    'g',
    {
      id: 'membranes',
      fill: MEMBRANE_FILL,
      'fill-opacity': MEMBRANE_FILL_OPACITY,
      stroke: MEMBRANE_STROKE,
      'stroke-linejoin': 'round',
    },
    [
      ...skins.map(({ cell, ring, thickness }) =>
        el('path', {
          'data-id': cell.id,
          'data-kind': cell.kind,
          'data-dents': cell.dents.length === 0 ? undefined : cell.dents.join(' '),
          'stroke-width': thickness,
          d: pathOf(ring),
        }),
      ),
      ...glyphs,
    ],
  );
}

/**
 * The families present on organelles and cells alike, each with its glyph's
 * index, in path order so the same map gives the same marks (C3), and a cell
 * wears the very glyph its files do.
 */
function familiesOf(terrain: Terrain): ReadonlyMap<string, number> {
  const families = [
    ...new Set([...terrain.organelles, ...terrain.cells].flatMap((member) => member.clone_family ?? [])),
  ].toSorted(byPath);
  return new Map(families.map((family, index) => [family, index % GLYPHS.length]));
}

/** The family's glyph, centred where it hangs. */
function drawGlyph(id: string, family: string, index: number, [x, y]: Point): Markup {
  return el('path', {
    'data-id': id,
    'data-family': family,
    d: GLYPHS[index] ?? '',
    fill: 'none',
    stroke: GLYPH_STROKE,
    transform: `translate(${num(x)} ${num(y)})`,
  });
}

/**
 * One organelle: its shape, then its clone glyph when it has a family, just
 * outside its edge at its upper right. A file within every threshold is a
 * circle at the radius core gave its mass; one that breaks rules is its
 * outline morphed by how many (D146), drawn still at rest (C10) through the
 * scene's `outlineOf`, the shape the world moves, with a disc for each bulb
 * at levels 5 and 6.
 */
function drawOrganelle(organelle: Organelle, at: Position, families: ReadonlyMap<string, number>): readonly Markup[] {
  const identity = { 'data-id': organelle.id, 'data-reachable': organelle.reachable ? undefined : 'false' };
  const rules = rulesOf(organelle.dents);
  const outline = rules === 0 ? undefined : outlineOf(organelle.id, at, rules);
  const shape =
    outline === undefined
      ? [el('circle', { ...identity, cx: at.x, cy: at.y, r: at.r })]
      : [
          el('path', { ...identity, 'data-dents': organelle.dents.join(' '), d: pathOf(outline.ring) }),
          ...outline.bulbs.map((bulb) => el('circle', { 'data-id': organelle.id, 'data-bulb': 'true', cx: bulb.x, cy: bulb.y, r: bulb.r })),
        ];
  const family = organelle.clone_family;
  if (family === undefined) return shape;
  const offset = (at.r + GLYPH_OFFSET) * Math.SQRT1_2;
  return [...shape, drawGlyph(organelle.id, family, families.get(family) ?? 0, [at.x + offset, at.y - offset])];
}

/**
 * One shape per organelle the layout placed: a circle at the radius core gave
 * its mass, or its outline morphed by the rules it breaks (shape is
 * conformance, §5.1, D146), with the same small glyph on every member of a clone family
 * (repetition is duplication). A file the layout did not place is not on the
 * field, and draws nothing.
 */
export function drawOrganelles(terrain: Terrain, layout: Layout): Markup {
  const families = familiesOf(terrain);
  return el(
    'g',
    { id: 'organelles', fill: ORGANELLE_FILL, stroke: ORGANELLE_STROKE, 'stroke-width': ORGANELLE_STROKE_WIDTH },
    terrain.organelles.flatMap((organelle) => {
      const at = layout.positions[organelle.id];
      return at === undefined ? [] : drawOrganelle(organelle, at, families);
    }),
  );
}
