/**
 * terrain: the ground the weather is drawn over (§5.1, D13), as still SVG.
 *
 * Read downward, like the field it draws (D24). The shore comes first, a
 * strip of the tracked files that are not code, with one small skin and one
 * small-caps label per group that has a mark on the field (D48). Under it the
 * terraces, band 0 at the top where the entry points are and the deepest band
 * at the bottom. Over them the membranes, one closed path per cell traced from
 * the contour core cut, its stroke as thick as the cell's interface: a deep
 * module is a big body with a thin skin. On top the organelles, a circle sized
 * by mass, or a polygon with one vertex pulled per breached rule when a file
 * has dents, and the same small glyph on every member of a clone family.
 *
 * Everything here is base tissue, greyscale and dim, drawn to be found rather
 * than seen (§5.6, D11). Nothing here draws an import edge (§5.1) and nothing
 * here is luminous: that is the weather's to say. Nothing here computes a
 * position either; the renderer reads `map.json` and draws what it finds
 * (D33), which is what lets two renderers draw one terrain.
 */

import { membraneThickness } from 'core';
import type { Cell, Contour, Group, Layout, Organelle, Position, Terrain } from 'core';

import { el, num } from './el.js';
import type { Markup } from './el.js';
import {
  DENT_PULL,
  DENT_VERTICES,
  FIELD_FILL,
  GLYPH_OFFSET,
  GLYPH_STROKE,
  MEMBRANE_FILL,
  MEMBRANE_FILL_OPACITY,
  MEMBRANE_STROKE,
  ORGANELLE_FILL,
  ORGANELLE_STROKE,
  ORGANELLE_STROKE_WIDTH,
  SHORE_CONTOUR,
  SHORE_CONTOUR_WIDTH,
  SHORE_FILL,
  SHORE_LABEL,
  SHORE_LABEL_GAP,
  SHORE_LABEL_SIZE,
  SHORE_MARK,
  TERRACE_FILL,
  TERRACE_LINE,
  TERRACE_LINE_WIDTH,
} from './tokens.js';

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

type Mark = { readonly file: string; readonly at: Position };

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** A closed ring as a path: the first point moved to, the rest drawn to, then closed. The weather glows through the same path. */
export function pathOf(contour: Contour): string {
  const [first, ...rest] = contour;
  if (first === undefined) return '';
  return `M${num(first[0])} ${num(first[1])}${rest.map(([x, y]) => `L${num(x)} ${num(y)}`).join('')}Z`;
}

/** The near-black the whole map is dim against. */
export function drawField(layout: Layout): Markup {
  return el('rect', { id: 'field', x: 0, y: 0, width: layout.width, height: layout.height, fill: FIELD_FILL });
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

/** The top-left corner of whatever the shore drew for a group, which is where its label hangs. */
function cornerOf(marks: readonly Mark[], contour: Contour | undefined): readonly [number, number] {
  const points: readonly (readonly [number, number])[] = [
    ...marks.map(({ at }) => [at.x - at.r, at.y - at.r] as const),
    ...(contour ?? []),
  ];
  return [Math.min(...points.map(([x]) => x)), Math.min(...points.map(([, y]) => y))];
}

/**
 * One group: its skin, its files as faint marks, and its name in small caps.
 * A group with no mark on the field (the `tests` group, whose files are
 * evidence and got no place, D4) draws nothing, and the group's contour is
 * read from the map rather than assumed, so a group core could not skin
 * still shows its marks and its name.
 */
function drawGroup(group: Group, layout: Layout): Markup | undefined {
  const marks = group.files.flatMap((file): readonly Mark[] => {
    const at = layout.positions[file];
    return at === undefined ? [] : [{ file, at }];
  });
  if (marks.length === 0) return undefined;
  const contour = layout.contours?.[group.id];
  const [left, top] = cornerOf(marks, contour);
  const skin =
    contour === undefined
      ? []
      : [el('path', { d: pathOf(contour), fill: 'none', stroke: SHORE_CONTOUR, 'stroke-width': SHORE_CONTOUR_WIDTH })];
  return el('g', { 'data-group': group.id }, [
    ...skin,
    ...marks.map(({ file, at }) => el('circle', { 'data-id': file, cx: at.x, cy: at.y, r: at.r, fill: SHORE_MARK })),
    el(
      'text',
      { x: left, y: top - SHORE_LABEL_GAP, 'font-size': SHORE_LABEL_SIZE, 'font-variant': 'small-caps', fill: SHORE_LABEL },
      [group.id],
    ),
  ]);
}

/** The strip above the top terrace: land above the abyss, one block per group in D48's table order. */
export function drawShore(terrain: Terrain, layout: Layout): Markup {
  const height = layout.shore.y1 - layout.shore.y0;
  const strip = height > 0 ? [el('rect', { x: 0, y: layout.shore.y0, width: layout.width, height, fill: SHORE_FILL })] : [];
  const groups = terrain.groups.flatMap((group) => {
    const drawn = drawGroup(group, layout);
    return drawn === undefined ? [] : [drawn];
  });
  return el('g', { id: 'shore' }, [...strip, ...groups]);
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

/**
 * One path per cell that has a contour, the outermost cells first so a
 * folder's skin is drawn over the package's that holds it (D45), and the
 * stroke as thick as the cell's interface (§5.1). The fill is translucent,
 * so where skins nest the body reads a shade fuller, which is the nesting.
 */
export function drawMembranes(terrain: Terrain, layout: Layout): Markup {
  const contours = layout.contours ?? {};
  const nesting = nestingOf(terrain.cells);
  const cells = [...terrain.cells].toSorted(
    (a, b) => (nesting.get(a.id) ?? 0) - (nesting.get(b.id) ?? 0) || byPath(a.id, b.id),
  );
  return el(
    'g',
    {
      id: 'membranes',
      fill: MEMBRANE_FILL,
      'fill-opacity': MEMBRANE_FILL_OPACITY,
      stroke: MEMBRANE_STROKE,
      'stroke-linejoin': 'round',
    },
    cells.flatMap((cell) => {
      const contour = contours[cell.id];
      if (contour === undefined) return [];
      return [
        el('path', {
          'data-id': cell.id,
          'data-kind': cell.kind,
          'stroke-width': membraneThickness(cell.interface_size),
          d: pathOf(contour),
        }),
      ];
    }),
  );
}

/**
 * The dented outline: a polygon on the organelle's circle with one vertex
 * pulled out per dent, the pulled vertices spread evenly round the ring
 * starting from the top, so two dents read as two teeth and not as a lump.
 */
function dentedPoints(at: Position, dents: number): string {
  const count = Math.min(dents, DENT_VERTICES);
  const pulled = new Set(Array.from({ length: count }, (_, k) => Math.round((k * DENT_VERTICES) / dents) % DENT_VERTICES));
  return Array.from({ length: DENT_VERTICES }, (_, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / DENT_VERTICES;
    const radius = pulled.has(i) ? at.r * DENT_PULL : at.r;
    return `${num(at.x + radius * Math.cos(angle))},${num(at.y + radius * Math.sin(angle))}`;
  }).join(' ');
}

/** The families present, each with its glyph's index, in path order so the same map gives the same marks (C3). */
function familiesOf(organelles: readonly Organelle[]): ReadonlyMap<string, number> {
  const families = [...new Set(organelles.flatMap((organelle) => organelle.clone_family ?? []))].toSorted(byPath);
  return new Map(families.map((family, index) => [family, index % GLYPHS.length]));
}

/** The family's glyph, just outside the organelle's edge at its upper right. */
function drawGlyph(organelle: Organelle, family: string, index: number, at: Position): Markup {
  const offset = (at.r + GLYPH_OFFSET) * Math.SQRT1_2;
  return el('path', {
    'data-id': organelle.id,
    'data-family': family,
    d: GLYPHS[index] ?? '',
    fill: 'none',
    stroke: GLYPH_STROKE,
    transform: `translate(${num(at.x + offset)} ${num(at.y - offset)})`,
  });
}

/** One organelle: its shape, then its clone glyph when it has a family. */
function drawOrganelle(organelle: Organelle, at: Position, families: ReadonlyMap<string, number>): readonly Markup[] {
  const identity = { 'data-id': organelle.id, 'data-reachable': organelle.reachable ? undefined : 'false' };
  const shape =
    organelle.dents.length === 0
      ? el('circle', { ...identity, cx: at.x, cy: at.y, r: at.r })
      : el('polygon', {
          ...identity,
          'data-dents': organelle.dents.join(' '),
          points: dentedPoints(at, organelle.dents.length),
        });
  const family = organelle.clone_family;
  if (family === undefined) return [shape];
  return [shape, drawGlyph(organelle, family, families.get(family) ?? 0, at)];
}

/**
 * One shape per organelle the layout placed: a circle at the radius core gave
 * its mass, or a polygon with a pulled vertex per dent (shape is conformance,
 * §5.1), with the same small glyph on every member of a clone family
 * (repetition is duplication). A file the layout did not place is not on the
 * field, and draws nothing.
 */
export function drawOrganelles(terrain: Terrain, layout: Layout): Markup {
  const families = familiesOf(terrain.organelles);
  return el(
    'g',
    { id: 'organelles', fill: ORGANELLE_FILL, stroke: ORGANELLE_STROKE, 'stroke-width': ORGANELLE_STROKE_WIDTH },
    terrain.organelles.flatMap((organelle) => {
      const at = layout.positions[organelle.id];
      return at === undefined ? [] : drawOrganelle(organelle, at, families);
    }),
  );
}
