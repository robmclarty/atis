/**
 * weather: what changed between base and head, drawn over the terrain as
 * still SVG (§5.2, D35).
 *
 * Every mark here is luminous because it means something (§5.6), and each
 * channel keeps its one meaning (P3, C11). Hue is state: the change hue
 * stains what this change touched, a deleted file is that hue as an outline
 * with no body, a renamed one a dashed outline at its one position with its
 * old path beside it (D40); IFR red is a failed slot and a torn stitch; LIFR
 * magenta is a cycle or a boundary crossed. Luminance is reach and evidence:
 * a warm glow fills the changed cell and, one membrane on, the next cell
 * dimmer (D5), each barrel the reach crosses lit at the crossing; a changed
 * file's skin is closed for the share of its changed lines the tests ran and
 * open for the rest, bitten where a mutant lived, stitched where a test
 * imports it. Texture is history: hatching by churn, stipple by bug-fix
 * rate. A ghost is a dashed outline round a file that usually changes with
 * these and did not. A storm hangs over each cell a red slot names, or over
 * the field when the slot is global. The exceptional edges are the only
 * lines on the map (§5.1).
 *
 * All of it is read from `map.json` and nothing else (D33). A channel the
 * map does not carry is not drawn: no group, no default, no placeholder
 * (C2). A file the layout did not place is not on the field and gets no
 * mark. Every list is sorted by path, so the same map is the same bytes (C3).
 */

import type {
  ChangedFile,
  Contour,
  Evidence,
  ExceptionalEdge,
  Ghost,
  Layout,
  MapJson,
  Mutant,
  Organelle,
  PatchCoverage,
  Position,
  ReachEntry,
  Stitch,
  Terrain,
  Weather,
} from 'core';

import { el, num } from './el.js';
import type { Markup } from './el.js';
import { EDGE_HUES, GLOW_ID, HATCH_ID, STIPPLE_ID, arrowId, drawDefs } from './patterns.js';
import { pathOf } from './terrain.js';
import {
  BUGFIX_FULL_AT,
  CHANGE_HUE,
  CHANGE_OUTLINE_WIDTH,
  CHURN_FULL_AT,
  CROSSING_OPACITY,
  CROSSING_PAD,
  EDGE_BOW,
  EDGE_WIDTH,
  EVIDENCE_LIGHT,
  FIELD_FILL,
  GHOST_DASH,
  GHOST_PAD,
  GHOST_STROKE,
  IFR_HUE,
  INTEGRITY_GAP_WIDTH,
  INTEGRITY_PAD,
  INTEGRITY_WIDTH,
  MUTANT_DENT_RADIUS,
  MUTANT_DENT_SPACING,
  REACH_DECAY,
  REACH_GLOW,
  REACH_ORIGIN_OPACITY,
  RENAME_DASH,
  RENAME_LABEL_GAP,
  RENAME_LABEL_SIZE,
  STITCH_LENGTH,
  STITCH_SPACING,
  STITCH_TEAR,
  STITCH_UNLIT,
  STITCH_WIDTH,
  STORM_INSET,
  STORM_LABEL_GAP,
  STORM_LABEL_SIZE,
  STORM_LIFT,
  STORM_ROW,
  TEXTURE_MAX_OPACITY,
} from './tokens.js';

/** The storm glyph: a bolt, drawn about its own origin. */
const STORM_GLYPH = 'M1 -6L-3 1H0L-1 6L3 -1H0Z';
/** Where a label's baseline sits to centre it on a mark, as a share of its font size. */
const BASELINE = 0.35;
const PASSED = 'passed';
const FAILED = 'failed';
const TOP = -Math.PI / 2;
const BOTTOM = Math.PI / 2;

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** The point on a ring about `at`, `radius` out, at `angle`. */
function onRing(at: Position, angle: number, radius: number): readonly [number, number] {
  return [at.x + radius * Math.cos(angle), at.y + radius * Math.sin(angle)];
}

/** The angle of the `index`th of `count` marks spread evenly about `centre`, `spacing` apart, so two read as two and not as a lump. */
function spread(centre: number, index: number, count: number, spacing: number): number {
  return centre + (index - (count - 1) / 2) * spacing;
}

/**
 * The opacity a reached cell is filled at: brightest in the changed cell,
 * and a fixed share dimmer per membrane crossed (D5), so it is strictly
 * decreasing by hop and still writes a distinct value at two decimals seven
 * crossings out, further than any map measured reaches.
 */
export function reachOpacity(hops: number): number {
  return REACH_ORIGIN_OPACITY * REACH_DECAY ** hops;
}

/** The nearest hop each reached cell is entered at, dimmest first, so the changed cell's own light is laid last. */
function cellsReached(reach: readonly ReachEntry[]): readonly (readonly [string, number])[] {
  const nearest = new Map<string, number>();
  for (const entry of reach) {
    const known = nearest.get(entry.cell);
    if (known === undefined || entry.hops < known) nearest.set(entry.cell, entry.hops);
  }
  return [...nearest].toSorted(([a, aHops], [b, bHops]) => bHops - aHops || byPath(a, b));
}

/** Each cell's direct children in id order: the cells its own territory is cut around (D45). */
function childrenOf(terrain: Terrain): ReadonlyMap<string, readonly string[]> {
  const children = new Map<string, string[]>();
  for (const cell of [...terrain.cells].toSorted((a, b) => byPath(a.id, b.id))) {
    if (cell.parent === undefined) continue;
    const held = children.get(cell.parent) ?? [];
    held.push(cell.id);
    children.set(cell.parent, held);
  }
  return children;
}

/**
 * Reach as light: each reached cell's own territory, its contour with the
 * cells it holds cut out (D45), filled with the glow at an opacity by its
 * nearest hop, so a package's light does not spill over a folder inside it
 * that the reach never entered, and a reached folder glows on its own. Each
 * interface file the reach crossed is lit as a disc just past its edge. All
 * of it is blurred together so the light reads as luminescence from within
 * rather than as an outline (§5.6). Absent when nothing is reached.
 */
function drawReach(weather: Weather, terrain: Terrain, layout: Layout): Markup | undefined {
  const contours = layout.contours ?? {};
  const children = childrenOf(terrain);
  const glows = cellsReached(weather.reach).flatMap(([cell, hops]) => {
    const contour = contours[cell];
    if (contour === undefined) return [];
    const holes = (children.get(cell) ?? []).flatMap((child) => {
      const held = contours[child];
      return held === undefined ? [] : [pathOf(held)];
    });
    return [
      el('path', {
        'data-id': cell,
        'data-hops': hops,
        d: [pathOf(contour), ...holes].join(''),
        'fill-rule': holes.length === 0 ? undefined : 'evenodd',
        opacity: reachOpacity(hops),
      }),
    ];
  });
  const crossings = [...new Set(weather.reach.flatMap((entry) => entry.via))].toSorted(byPath).flatMap((path) => {
    const at = layout.positions[path];
    if (at === undefined) return [];
    return [el('circle', { 'data-via': path, cx: at.x, cy: at.y, r: at.r + CROSSING_PAD, opacity: CROSSING_OPACITY })];
  });
  if (glows.length === 0 && crossings.length === 0) return undefined;
  return el('g', { id: 'reach', fill: REACH_GLOW, filter: `url(#${GLOW_ID})` }, [...glows, ...crossings]);
}

/**
 * One changed file's stain, by kind: added and modified are the change hue
 * through, with no rim of their own, since the fill is state and the rim is
 * evidence's to draw (C11); deleted is the outline alone, the body gone;
 * renamed is a dashed outline at its one position with the old path beside
 * it (D40). The stain is a circle at the organelle's radius, so a dented
 * file keeps its teeth in the base tissue's grey: shape stays conformance.
 */
function drawStain(file: ChangedFile, at: Position): readonly Markup[] {
  const mark = { 'data-id': file.path, 'data-kind': file.kind, cx: at.x, cy: at.y, r: at.r };
  if (file.kind === 'added' || file.kind === 'modified') return [el('circle', { ...mark, stroke: 'none' })];
  if (file.kind === 'deleted') return [el('circle', { ...mark, fill: 'none' })];
  const outline = el('circle', { ...mark, fill: 'none', 'stroke-dasharray': RENAME_DASH });
  if (file.from === undefined) return [outline];
  const label = el(
    'text',
    {
      'data-id': file.path,
      x: at.x + at.r + RENAME_LABEL_GAP,
      y: at.y + RENAME_LABEL_SIZE * BASELINE,
      'font-size': RENAME_LABEL_SIZE,
      stroke: 'none',
    },
    [file.from],
  );
  return [outline, label];
}

/** The changed set, stained by kind (§5.2): a shore file at its mark, a test file nowhere, since it is a stitch (D4). */
function drawChanged(changed: readonly ChangedFile[], layout: Layout): Markup | undefined {
  const stains = [...changed]
    .toSorted((a, b) => byPath(a.path, b.path))
    .flatMap((file) => {
      const at = layout.positions[file.path];
      return at === undefined ? [] : drawStain(file, at);
    });
  if (stains.length === 0) return undefined;
  return el('g', { id: 'changed', fill: CHANGE_HUE, stroke: CHANGE_HUE, 'stroke-width': CHANGE_OUTLINE_WIDTH }, stains);
}

/** A texture's opacity by its value: proportional up to the value it is full at, and full beyond. */
function textureOpacity(value: number, fullAt: number): number {
  return TEXTURE_MAX_OPACITY * Math.min(value / fullAt, 1);
}

/**
 * One organelle's textures: hatching by churn ratio, stipple by bug-fix
 * rate, each only when the map carries the value (C2). A measured zero is
 * drawn as nothing, which is what an opacity of zero would have looked like.
 */
function drawTextures(organelle: Organelle, at: Position): readonly Markup[] {
  const overlay = (pattern: string, key: string, value: number, fullAt: number): Markup =>
    el('circle', {
      'data-id': organelle.id,
      [key]: value,
      cx: at.x,
      cy: at.y,
      r: at.r,
      fill: `url(#${pattern})`,
      'fill-opacity': textureOpacity(value, fullAt),
    });
  const churn = organelle.churn_ratio;
  const bugfix = organelle.bugfix_rate;
  return [
    ...(churn !== undefined && churn > 0 ? [overlay(HATCH_ID, 'data-churn', churn, CHURN_FULL_AT)] : []),
    ...(bugfix !== undefined && bugfix > 0 ? [overlay(STIPPLE_ID, 'data-bugfix', bugfix, BUGFIX_FULL_AT)] : []),
  ];
}

/** History as texture (§5.2, C11) on every placed organelle that carries a value; absent when none does. */
function drawHistory(terrain: Terrain, layout: Layout): Markup | undefined {
  const textures = terrain.organelles.flatMap((organelle) => {
    const at = layout.positions[organelle.id];
    return at === undefined ? [] : drawTextures(organelle, at);
  });
  return textures.length === 0 ? undefined : el('g', { id: 'history' }, textures);
}

/**
 * Membrane integrity: the changed file's skin as a ring just past its edge,
 * open all round in the dark of the field, then closed from the top
 * clockwise for the share of its changed executable lines the tests ran;
 * the gap is what stays dark. A file with no changed executable line has no
 * skin to close and gets no ring, rather than a closed one (C2).
 */
function drawIntegrity(coverage: PatchCoverage, at: Position): Markup | undefined {
  if (coverage.changed_executable <= 0) return undefined;
  const closed = coverage.covered / coverage.changed_executable;
  const ring = { cx: at.x, cy: at.y, r: at.r + INTEGRITY_PAD, fill: 'none' };
  return el('g', { 'data-id': coverage.path, 'data-covered': coverage.covered, 'data-changed': coverage.changed_executable }, [
    el('circle', { ...ring, stroke: FIELD_FILL, 'stroke-width': INTEGRITY_GAP_WIDTH }),
    el('circle', {
      ...ring,
      stroke: EVIDENCE_LIGHT,
      'stroke-width': INTEGRITY_WIDTH,
      pathLength: 1,
      'stroke-dasharray': `${num(closed)} 1`,
      transform: `rotate(-90 ${num(at.x)} ${num(at.y)})`,
    }),
  ]);
}

/** The mutants on each file, by line. */
function mutantsByPath(mutants: readonly Mutant[]): ReadonlyMap<string, readonly Mutant[]> {
  const byPathMap = new Map<string, Mutant[]>();
  for (const mutant of [...mutants].toSorted((a, b) => a.line - b.line || byPath(a.status, b.status))) {
    const on = byPathMap.get(mutant.path) ?? [];
    on.push(mutant);
    byPathMap.set(mutant.path, on);
  }
  return byPathMap;
}

/** Live mutants as small dents: a dark bite out of the skin per mutant, spread round the top of the ring. */
function drawDents(path: string, mutants: readonly Mutant[], at: Position): readonly Markup[] {
  return mutants.map((mutant, index) => {
    const [cx, cy] = onRing(at, spread(TOP, index, mutants.length, MUTANT_DENT_SPACING), at.r);
    return el('circle', {
      'data-id': path,
      'data-line': mutant.line,
      'data-status': mutant.status,
      cx,
      cy,
      r: MUTANT_DENT_RADIUS,
      fill: FIELD_FILL,
    });
  });
}

type StitchOn = { readonly test: string; readonly status: string };

/** The stitches on each target, in test path order. */
function stitchesByTarget(stitches: readonly Stitch[]): ReadonlyMap<string, readonly StitchOn[]> {
  const byTarget = new Map<string, StitchOn[]>();
  for (const stitch of [...stitches].toSorted((a, b) => byPath(a.test, b.test))) {
    for (const target of stitch.targets) {
      const on = byTarget.get(target) ?? [];
      on.push({ test: stitch.test, status: stitch.status });
      byTarget.set(target, on);
    }
  }
  return byTarget;
}

/** A stitch that passed is lit; one that failed is torn and IFR; any other status was not run, and not run is not a pass (C2). */
function stitchStroke(status: string): string {
  if (status === FAILED) return IFR_HUE;
  return status === PASSED ? EVIDENCE_LIGHT : STITCH_UNLIT;
}

/** One stitch: a short stroke across the edge on its spoke; torn, it breaks either side of the edge. */
function drawStitch(target: string, stitch: StitchOn, at: Position, angle: number): readonly Markup[] {
  const mark = { 'data-id': target, 'data-test': stitch.test, 'data-status': stitch.status, stroke: stitchStroke(stitch.status) };
  const segment = (from: number, to: number): Markup => {
    const [x1, y1] = onRing(at, angle, at.r + from);
    const [x2, y2] = onRing(at, angle, at.r + to);
    return el('line', { ...mark, x1, y1, x2, y2 });
  };
  const half = STITCH_LENGTH / 2;
  if (stitch.status !== FAILED) return [segment(-half, half)];
  return [segment(-half, -STITCH_TEAR / 2), segment(STITCH_TEAR / 2, half)];
}

/** Evidence on the changed organelles (§5.2): skins, dents and stitches; absent when the map carries none. */
function drawEvidence(evidence: Evidence, layout: Layout): Markup | undefined {
  const { positions } = layout;
  const skins = [...(evidence.patch_coverage ?? [])]
    .toSorted((a, b) => byPath(a.path, b.path))
    .flatMap((coverage) => {
      const at = positions[coverage.path];
      const arc = at === undefined ? undefined : drawIntegrity(coverage, at);
      return arc === undefined ? [] : [arc];
    });
  const dents = [...mutantsByPath(evidence.mutants ?? [])]
    .toSorted(([a], [b]) => byPath(a, b))
    .flatMap(([path, mutants]) => {
      const at = positions[path];
      return at === undefined ? [] : drawDents(path, mutants, at);
    });
  const stitches = [...stitchesByTarget(evidence.stitches ?? [])]
    .toSorted(([a], [b]) => byPath(a, b))
    .flatMap(([target, on]) => {
      const at = positions[target];
      if (at === undefined) return [];
      return on.flatMap((stitch, index) => drawStitch(target, stitch, at, spread(BOTTOM, index, on.length, STITCH_SPACING)));
    });
  const marks = [...skins, ...dents, ...stitches];
  return marks.length === 0 ? undefined : el('g', { id: 'evidence', 'stroke-width': STITCH_WIDTH }, marks);
}

/** The point `distance` out from `from` toward `to`. */
function toward(from: Position, to: { readonly x: number; readonly y: number }, distance: number): readonly [number, number] {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  if (length === 0) return [from.x, from.y];
  return [from.x + ((to.x - from.x) / length) * distance, from.y + ((to.y - from.y) / length) * distance];
}

/**
 * One exceptional edge, importer to imported: a curve bowed to the right of
 * travel, so the two edges of a cycle bow apart into a lens rather than
 * lying on one another, its ends pulled back to each organelle's edge so
 * the arrowhead lands on the rim.
 */
function drawEdge(edge: ExceptionalEdge, from: Position, to: Position): Markup | undefined {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return undefined;
  const control = { x: (from.x + to.x) / 2 - dy * EDGE_BOW, y: (from.y + to.y) / 2 + dx * EDGE_BOW };
  const [x1, y1] = toward(from, control, from.r);
  const [x2, y2] = toward(to, control, to.r);
  return el('path', {
    'data-from': edge.from,
    'data-to': edge.to,
    'data-kind': edge.kind,
    d: `M${num(x1)} ${num(y1)}Q${num(control.x)} ${num(control.y)} ${num(x2)} ${num(y2)}`,
    stroke: EDGE_HUES[edge.kind],
    'marker-end': `url(#${arrowId(edge.kind)})`,
  });
}

/** The exceptional edges, the only lines on the map (§5.1): a boundary crossed, a cycle, or a cross-cell import this change introduced. */
function drawEdges(terrain: Terrain, layout: Layout): Markup | undefined {
  const edges = [...terrain.edges_exceptional]
    .toSorted((a, b) => byPath(a.from, b.from) || byPath(a.to, b.to) || byPath(a.kind, b.kind))
    .flatMap((edge) => {
      const from = layout.positions[edge.from];
      const to = layout.positions[edge.to];
      const drawn = from === undefined || to === undefined ? undefined : drawEdge(edge, from, to);
      return drawn === undefined ? [] : [drawn];
    });
  return edges.length === 0 ? undefined : el('g', { id: 'edges', fill: 'none', 'stroke-width': EDGE_WIDTH }, edges);
}

/** Missing co-change ghosts (§5.2): a dashed outline just outside each untouched file that usually changes with these. */
function drawGhosts(ghosts: readonly Ghost[], layout: Layout): Markup | undefined {
  const outlines = [...ghosts]
    .toSorted((a, b) => byPath(a.path, b.path))
    .flatMap((ghost) => {
      const at = layout.positions[ghost.path];
      if (at === undefined) return [];
      return [
        el('circle', {
          'data-id': ghost.path,
          'data-with': ghost.with.join(' '),
          'data-rate': ghost.rate,
          cx: at.x,
          cy: at.y,
          r: at.r + GHOST_PAD,
        }),
      ];
    });
  if (outlines.length === 0) return undefined;
  return el('g', { id: 'ghosts', fill: 'none', stroke: GHOST_STROKE, 'stroke-dasharray': GHOST_DASH }, outlines);
}

/**
 * Where a red slot's named file sits on the field: its cell; for a test
 * file, which has no cell (D4), the cells of the files it stitches; else
 * its shore group. A path the map cannot place hangs nothing.
 */
function placesOf(scope: readonly string[], terrain: Terrain, stitches: readonly Stitch[]): readonly string[] {
  const cellOf = new Map(terrain.organelles.map((organelle) => [organelle.id, organelle.cell] as const));
  const groupOf = new Map(terrain.groups.flatMap((group) => group.files.map((file) => [file, group.id] as const)));
  const stitchedBy = new Map(stitches.map((stitch) => [stitch.test, stitch.targets] as const));
  const places = scope.flatMap((path): readonly string[] => {
    const cell = cellOf.get(path);
    if (cell !== undefined) return [cell];
    const targets = stitchedBy.get(path);
    if (targets !== undefined) {
      return targets.flatMap((target) => {
        const stitched = cellOf.get(target);
        return stitched === undefined ? [] : [stitched];
      });
    }
    const group = groupOf.get(path);
    return group === undefined ? [] : [group];
  });
  return [...new Set(places)].toSorted(byPath);
}

/** The topmost point of a contour, leftmost on a tie: where a storm hangs. */
function topOf(contour: Contour): readonly [number, number] | undefined {
  let top: readonly [number, number] | undefined;
  for (const point of contour) {
    if (top === undefined || point[1] < top[1] || (point[1] === top[1] && point[0] < top[0])) top = point;
  }
  return top;
}

/** One storm: the bolt at (x, y) and the slot's name beside it, to the right, or to the left at the field's edge. */
function drawStorm(slot: string, over: string, x: number, y: number, atEdge: boolean): Markup {
  return el('g', { 'data-slot': slot, 'data-over': over }, [
    el('path', { d: STORM_GLYPH, transform: `translate(${num(x)} ${num(y)})` }),
    el(
      'text',
      {
        x: atEdge ? x - STORM_LABEL_GAP : x + STORM_LABEL_GAP,
        y: y + STORM_LABEL_SIZE * BASELINE,
        'font-size': STORM_LABEL_SIZE,
        'font-variant': 'small-caps',
        'text-anchor': atEdge ? 'end' : undefined,
      },
      [slot],
    ),
  ]);
}

/**
 * Storms (§5.2): one per red slot, over the field at its top right corner
 * when the slot is global, else over each cell or shore group the slot's
 * files place on, stacked where two slots name the same place. A skipped
 * slot is not red, and a green one is no storm.
 */
function drawStorms(weather: Weather, terrain: Terrain, layout: Layout): Markup | undefined {
  const contours = layout.contours ?? {};
  const red = weather.checks.slots.filter((slot) => !slot.ok && !slot.skipped).toSorted((a, b) => byPath(a.name, b.name));
  const rows = new Map<string, number>();
  const row = (place: string): number => {
    const count = rows.get(place) ?? 0;
    rows.set(place, count + 1);
    return count;
  };
  const storms = red.flatMap((slot) => {
    if (slot.scope === 'global') {
      return [drawStorm(slot.name, 'field', layout.width - STORM_INSET, STORM_INSET + row('field') * STORM_ROW, true)];
    }
    return placesOf(slot.scope, terrain, weather.evidence.stitches ?? []).flatMap((place) => {
      const top = topOf(contours[place] ?? []);
      if (top === undefined) return [];
      return [drawStorm(slot.name, place, top[0], top[1] - STORM_LIFT - row(place) * STORM_ROW, false)];
    });
  });
  return storms.length === 0 ? undefined : el('g', { id: 'storms', fill: IFR_HUE }, storms);
}

/**
 * The weather over the terrain: its definitions first, then the layers
 * bottom up. Reach glows under everything; the changed set is stained over
 * it; history textures go over the stains, so a hot file stays hot when it
 * is changed; evidence sits on the outlines; the exceptional edges cross the
 * bodies they join; then the ghosts, and the storms on top. A layer with
 * nothing to draw is left out rather than emptied (C2).
 */
export function drawWeather(map: MapJson, layout: Layout): Markup {
  const layers = [
    drawReach(map.weather, map.terrain, layout),
    drawChanged(map.weather.changed, layout),
    drawHistory(map.terrain, layout),
    drawEvidence(map.weather.evidence, layout),
    drawEdges(map.terrain, layout),
    drawGhosts(map.weather.ghosts, layout),
    drawStorms(map.weather, map.terrain, layout),
  ].flatMap((layer) => (layer === undefined ? [] : [layer]));
  return el('g', { id: 'weather' }, [drawDefs(), ...layers]);
}
