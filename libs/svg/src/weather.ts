/**
 * weather: what changed between base and head, drawn over the terrain as
 * still SVG (§5.2, D35).
 *
 * Every mark here is luminous because it means something (§5.6), and each
 * channel keeps its one meaning (P3, C11). Hue is state: the change hue
 * stains what this change touched, a deleted file is that hue as an outline
 * with no body, a renamed one a dashed outline at its one position with its
 * old path beside it and a dashed leader from where the base put it (D40,
 * D97); a changed file the change made healthier wears the calm-positive
 * mint in place of the change hue (D98); IFR red is a failed slot and a torn stitch; LIFR
 * magenta is a cycle or a boundary crossed. Luminance is reach and evidence:
 * a warm glow fills the changed cell and, one membrane on, the next cell
 * dimmer (D5), each barrel the reach crosses lit at the crossing; a changed
 * file's skin is lit for the share of its changed lines the tests did not
 * run and a dim hairline for the rest (D71), notched in light where a mutant
 * lived, stitched where a test imports it. Texture is history: hatching by churn, stipple by bug-fix
 * rate. A ghost is a dashed outline round a file that usually changes with
 * these and did not. A storm hangs over each cell where a red slot names a
 * changed file; the same slot over a cell the change did not touch is
 * standing state, a small grey bolt laid beneath the weather as terrain, and
 * a global slot hangs none (D68). The exceptional edges are the only lines
 * on the map (§5.1).
 *
 * All of it is read from `map.json` and nothing else (D33), through the
 * scene's `weatherOf`, the one derivation the world draws from too, so the two
 * renderers cannot drift (D90); this file only draws it. A channel the map
 * does not carry is not drawn: no group, no default, no placeholder (C2). A
 * file the layout did not place is not on the field and gets no mark. Every
 * list is sorted by path, so the same map is the same bytes (C3).
 */

import type { Contour, Layout, MapJson, Organelle, Position, Terrain } from 'core';
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
  GHOST_DASH,
  GHOST_PAD,
  GHOST_STROKE,
  IFR_HUE,
  IMPROVED_HUE,
  INTEGRITY_CLOSED_OPACITY,
  INTEGRITY_CLOSED_WIDTH,
  INTEGRITY_GAP_WIDTH,
  INTEGRITY_PAD,
  LABEL_BASELINE,
  MUTANT_NOTCH_DEPTH,
  MUTANT_NOTCH_WIDTH,
  REACH_GLOW,
  REACH_ORIGIN_OPACITY,
  RENAME_DASH,
  RENAME_LABEL_GAP,
  RENAME_LABEL_SIZE,
  RENAME_LEADER_WIDTH,
  STANDING_STORM_FILL,
  STANDING_STORM_SCALE,
  STITCH_LENGTH,
  STITCH_TEAR,
  STITCH_UNLIT,
  STITCH_WIDTH,
  STORM_LABEL_GAP,
  STORM_LABEL_SIZE,
  TEXTURE_MAX_OPACITY,
  reachLuminance,
  renameLeaderOf,
  stitchLook,
  weatherOf,
} from 'scene';
import type { ChangeState, FileWeather, Notch, SceneWeather, Skin, StitchLook, StitchMark, Storm } from 'scene';

import { el, num } from './el.js';
import type { Markup } from './el.js';
import { EDGE_HUES, GLOW_ID, HATCH_ID, STIPPLE_ID, arrowId, drawDefs } from './patterns.js';
import { pathOf } from './terrain.js';

/** The storm glyph: a bolt, drawn about its own origin. The legend draws its sample from the same path. */
export const STORM_GLYPH = 'M1 -6L-3 1H0L-1 6L3 -1H0Z';

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** The point on a ring about `at`, `radius` out, at `angle`. */
function onRing(at: Position, angle: number, radius: number): readonly [number, number] {
  return [at.x + radius * Math.cos(angle), at.y + radius * Math.sin(angle)];
}

/**
 * The opacity a reached cell is filled at: brightest in the changed cell,
 * and a fixed share dimmer per membrane crossed (D5), so it is strictly
 * decreasing by hop and still writes a distinct value at two decimals seven
 * crossings out, further than any map measured reaches.
 */
export function reachOpacity(hops: number): number {
  return REACH_ORIGIN_OPACITY * reachLuminance(hops);
}

/**
 * Reach as light: each reached cell's own territory, its contour with the
 * cells it holds cut out (D45), filled with the glow at an opacity by its
 * nearest hop, dimmest first so the changed cell's own light is laid last, so
 * a package's light does not spill over a folder inside it that the reach
 * never entered, and a reached folder glows on its own. Each interface file
 * the reach crossed is lit as a disc just past its edge. All of it is blurred
 * together so the light reads as luminescence from within rather than as an
 * outline (§5.6). Absent when nothing is reached.
 */
function drawReach(weather: SceneWeather, layout: Layout): Markup | undefined {
  const contours = layout.contours ?? {};
  const reached = weather.cells
    .flatMap((cell) => (cell.reach === undefined ? [] : [{ cell: cell.cell, reach: cell.reach }]))
    .toSorted((a, b) => b.reach.hops - a.reach.hops || byPath(a.cell, b.cell));
  const glows = reached.flatMap(({ cell, reach }) => {
    const contour = contours[cell];
    if (contour === undefined) return [];
    const holes = reach.holes.flatMap((hole) => {
      const held = contours[hole];
      return held === undefined ? [] : [pathOf(held)];
    });
    return [
      el('path', {
        'data-id': cell,
        'data-hops': reach.hops,
        d: [pathOf(contour), ...holes].join(''),
        'fill-rule': holes.length === 0 ? undefined : 'evenodd',
        opacity: REACH_ORIGIN_OPACITY * reach.luminance,
      }),
    ];
  });
  const crossings = placedFiles(weather, layout)
    .filter(({ file }) => file.crossing === true)
    .map(({ file, at }) => el('circle', { 'data-via': file.path, cx: at.x, cy: at.y, r: at.r + CROSSING_PAD, opacity: CROSSING_OPACITY }));
  if (glows.length === 0 && crossings.length === 0) return undefined;
  return el('g', { id: 'reach', fill: REACH_GLOW, filter: `url(#${GLOW_ID})` }, [...glows, ...crossings]);
}

/** Each file the weather touches, with the place the layout gave it, in path order. */
function placedFiles(weather: SceneWeather, layout: Layout): readonly { readonly file: FileWeather; readonly at: Position }[] {
  return weather.files.flatMap((file) => {
    const at = layout.positions[file.path];
    return at === undefined ? [] : [{ file, at }];
  });
}

/** A renamed file's leader (D40, D97): the scene's, dashed in its state's hue, from where the base put it to the rim of where it is. */
function drawLeader(path: string, change: ChangeState, at: Position, hue: string | undefined): Markup | undefined {
  const leader = renameLeaderOf(change, at);
  if (leader === undefined) return undefined;
  const [[x1, y1], [x2, y2]] = [leader.from, leader.to];
  return el('line', {
    'data-id': path,
    'data-leader': 'renamed',
    x1,
    y1,
    x2,
    y2,
    fill: 'none',
    stroke: hue,
    'stroke-width': RENAME_LEADER_WIDTH,
    'stroke-dasharray': RENAME_DASH,
  });
}

/** What got better on a file, as `data-improved` names it: each kind once, in order (D98). */
function improvedKinds(change: ChangeState): string | undefined {
  const kinds = [...new Set((change.improvements ?? []).map((improvement) => improvement.kind))].toSorted();
  return kinds.length === 0 ? undefined : kinds.join(' ');
}

/**
 * One changed file's stain, by kind: added and modified are the change hue
 * through, with no rim of their own, since the fill is state and the rim is
 * evidence's to draw (C11); deleted is the outline alone, the body gone;
 * renamed is a dashed outline at its one position with the old path beside
 * it and its leader from where it was (D40, D97). A file the change made
 * healthier wears the calm-positive hue in place of the change hue, one
 * state per file (D98). The stain is a circle at the organelle's radius, so
 * a dented file keeps its teeth in the base tissue's grey: shape stays
 * conformance.
 */
function drawStain(path: string, change: ChangeState, at: Position): readonly Markup[] {
  const improved = improvedKinds(change);
  const hue = improved === undefined ? undefined : IMPROVED_HUE;
  const mark = { 'data-id': path, 'data-kind': change.kind, 'data-improved': improved, cx: at.x, cy: at.y, r: at.r };
  if (change.kind === 'added' || change.kind === 'modified') return [el('circle', { ...mark, fill: hue, stroke: 'none' })];
  if (change.kind === 'deleted') return [el('circle', { ...mark, fill: 'none', stroke: hue })];
  const outline = el('circle', { ...mark, fill: 'none', stroke: hue, 'stroke-dasharray': RENAME_DASH });
  const leader = drawLeader(path, change, at, hue);
  const marks = [...(leader === undefined ? [] : [leader]), outline];
  if (change.from === undefined) return marks;
  const label = el(
    'text',
    {
      'data-id': path,
      x: at.x + at.r + RENAME_LABEL_GAP,
      y: at.y + RENAME_LABEL_SIZE * LABEL_BASELINE,
      'font-size': RENAME_LABEL_SIZE,
      fill: hue,
      stroke: 'none',
    },
    [change.from],
  );
  return [...marks, label];
}

/** The changed set, stained by kind (§5.2): a shore file at its mark, a test file nowhere, since it is a stitch (D4). */
function drawChanged(weather: SceneWeather, layout: Layout): Markup | undefined {
  const stains = placedFiles(weather, layout).flatMap(({ file, at }) => (file.change === undefined ? [] : drawStain(file.path, file.change, at)));
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
 * drawing its gap rather than its closure (D71). The whole ring is a dim
 * hairline, and over it the share of its changed executable lines the tests
 * did not run is lit at full strength from the top clockwise, so worse
 * evidence draws more light; a closed skin is hairline all round. A file
 * with no changed executable line has no skin and gets no ring, rather than
 * a closed one (C2): the scene gives it none.
 */
function drawIntegrity(path: string, skin: Extract<Skin, { readonly measured: true }>, at: Position): Markup {
  const ring = { cx: at.x, cy: at.y, r: at.r + INTEGRITY_PAD, fill: 'none', stroke: EVIDENCE_LIGHT };
  const hairline = el('circle', { ...ring, 'stroke-width': INTEGRITY_CLOSED_WIDTH, 'stroke-opacity': INTEGRITY_CLOSED_OPACITY });
  const gap =
    skin.open > 0
      ? [
          el('circle', {
            ...ring,
            'stroke-width': INTEGRITY_GAP_WIDTH,
            pathLength: 1,
            'stroke-dasharray': `${num(skin.open)} 1`,
            transform: `rotate(-90 ${num(at.x)} ${num(at.y)})`,
          }),
        ]
      : [];
  return el('g', { 'data-id': path, 'data-covered': skin.covered, 'data-changed': skin.changed_executable }, [hairline, ...gap]);
}

/**
 * The skin of a changed file the coverage report never names (D80): lit
 * whole, since no test is known to have run any of it. It is the gap at an
 * unknown size, drawn the way a skin no changed line of which was covered is
 * drawn, so a file nobody measured never reads calmer than one half covered.
 */
function drawUnmeasured(path: string, at: Position): Markup {
  const ring = { cx: at.x, cy: at.y, r: at.r + INTEGRITY_PAD, fill: 'none', stroke: EVIDENCE_LIGHT };
  return el('g', { 'data-id': path, 'data-unmeasured': 'true' }, [
    el('circle', { ...ring, 'stroke-width': INTEGRITY_CLOSED_WIDTH, 'stroke-opacity': INTEGRITY_CLOSED_OPACITY }),
    el('circle', { ...ring, 'stroke-width': INTEGRITY_GAP_WIDTH }),
  ]);
}

/**
 * Live mutants as lit notches (D71): per mutant, a wedge in the evidence
 * light cut from the skin's outer edge to a point inside the organelle's,
 * spread round the top of the ring, so a mutant that lived adds light where
 * a dark bite took it away.
 */
function drawDents(path: string, notches: readonly Notch[], at: Position): readonly Markup[] {
  return notches.map((notch) =>
    el('path', {
      'data-id': path,
      'data-line': notch.line,
      'data-status': notch.status,
      d: pathOf(notchOf(at, notch.angle)),
      fill: EVIDENCE_LIGHT,
    }),
  );
}

/** One notch's wedge on a file's ring at `angle`: its base across the skin's outer edge, its point inside the file's. The legend draws its sample from it too. */
export function notchOf(at: Position, angle: number): Contour {
  const outer = at.r + INTEGRITY_PAD + INTEGRITY_GAP_WIDTH / 2;
  const half = MUTANT_NOTCH_WIDTH / 2;
  const [bx, by] = onRing(at, angle, outer);
  const [tx, ty] = [-Math.sin(angle) * half, Math.cos(angle) * half];
  return [[bx - tx, by - ty], onRing(at, angle, at.r - MUTANT_NOTCH_DEPTH), [bx + tx, by + ty]];
}

/** The ink each stitch reads in: the evidence light for a pass, IFR for a tear, unlit grey for a test not run. */
const STITCH_STROKES: Readonly<Record<StitchLook, string>> = { lit: EVIDENCE_LIGHT, torn: IFR_HUE, unlit: STITCH_UNLIT };

/** A stitch that passed is lit; one that failed is torn and IFR; any other status was not run, and not run is not a pass (C2). */
export function stitchStroke(status: string): string {
  return STITCH_STROKES[stitchLook(status)];
}

/** One stitch: a short stroke across the edge on its spoke; torn, it breaks either side of the edge. */
function drawStitch(target: string, stitch: StitchMark, at: Position): readonly Markup[] {
  const mark = { 'data-id': target, 'data-test': stitch.test, 'data-status': stitch.status, stroke: STITCH_STROKES[stitch.look] };
  return stitchOf(at, stitch.angle, stitch.status).map(([[x1, y1], [x2, y2]]) => el('line', { ...mark, x1, y1, x2, y2 }));
}

/** One stitch's strokes across a file's edge at `angle`: one stroke, or two either side of the tear when it failed. The legend draws its samples from it too. */
export function stitchOf(at: Position, angle: number, status: string): readonly (readonly [readonly [number, number], readonly [number, number]])[] {
  const segment = (from: number, to: number): readonly [readonly [number, number], readonly [number, number]] => [
    onRing(at, angle, at.r + from),
    onRing(at, angle, at.r + to),
  ];
  const half = STITCH_LENGTH / 2;
  if (stitchLook(status) !== 'torn') return [segment(-half, half)];
  return [segment(-half, -STITCH_TEAR / 2), segment(STITCH_TEAR / 2, half)];
}

/** Evidence on the changed organelles (§5.2): skins, then dents, then stitches, each by path; absent when the map carries none. */
function drawEvidence(weather: SceneWeather, layout: Layout): Markup | undefined {
  const placed = placedFiles(weather, layout).flatMap(({ file, at }) => (file.evidence === undefined ? [] : [{ path: file.path, evidence: file.evidence, at }]));
  const skins = placed.flatMap(({ path, evidence, at }) => {
    if (evidence.skin === undefined) return [];
    return [evidence.skin.measured ? drawIntegrity(path, evidence.skin, at) : drawUnmeasured(path, at)];
  });
  const dents = placed.flatMap(({ path, evidence, at }) => drawDents(path, evidence.notches, at));
  const stitches = placed.flatMap(({ path, evidence, at }) => evidence.stitches.flatMap((stitch) => drawStitch(path, stitch, at)));
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
function drawEdge(edge: SceneWeather['edges'][number], from: Position, to: Position): Markup | undefined {
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
function drawEdges(weather: SceneWeather, layout: Layout): Markup | undefined {
  const edges = weather.edges.flatMap((edge) => {
    const from = layout.positions[edge.from];
    const to = layout.positions[edge.to];
    const drawn = from === undefined || to === undefined ? undefined : drawEdge(edge, from, to);
    return drawn === undefined ? [] : [drawn];
  });
  return edges.length === 0 ? undefined : el('g', { id: 'edges', fill: 'none', 'stroke-width': EDGE_WIDTH }, edges);
}

/** Missing co-change ghosts (§5.2): a dashed outline just outside each untouched file that usually changes with these. */
function drawGhosts(weather: SceneWeather, layout: Layout): Markup | undefined {
  const outlines = placedFiles(weather, layout).flatMap(({ file, at }) =>
    file.ghost === undefined
      ? []
      : [
          el('circle', {
            'data-id': file.path,
            'data-with': file.ghost.with.join(' '),
            'data-rate': file.ghost.rate,
            cx: at.x,
            cy: at.y,
            r: at.r + GHOST_PAD,
          }),
        ],
  );
  if (outlines.length === 0) return undefined;
  return el('g', { id: 'ghosts', fill: 'none', stroke: GHOST_STROKE, 'stroke-dasharray': GHOST_DASH }, outlines);
}

/**
 * The change's storms (§5.2, D68): the bolt in the IFR hue with the slot's
 * name to its right, over each cell or shore group where a red slot names a
 * changed file. A skipped slot is not red, and a green one is no storm.
 */
function drawStorms(storms: readonly Storm[]): Markup | undefined {
  const bolts = storms
    .filter((storm) => storm.change)
    .map((storm) =>
      el('g', { 'data-slot': storm.slot, 'data-over': storm.place }, [
        el('path', { d: STORM_GLYPH, transform: `translate(${num(storm.x)} ${num(storm.y)})` }),
        el(
          'text',
          {
            x: storm.x + STORM_LABEL_GAP,
            y: storm.y + STORM_LABEL_SIZE * LABEL_BASELINE,
            'font-size': STORM_LABEL_SIZE,
            'font-variant': 'small-caps',
          },
          [storm.slot],
        ),
      ]),
    );
  return bolts.length === 0 ? undefined : el('g', { id: 'storms', fill: IFR_HUE }, bolts);
}

/**
 * The standing storms (D68): a red slot over a cell the change did not
 * touch is terrain, not weather, so its bolt is smaller, graphite, and
 * carries no label, the way §5.3 keeps unchanged terrain greyscale.
 */
function drawStandingStorms(storms: readonly Storm[]): Markup | undefined {
  const bolts = storms
    .filter((storm) => !storm.change)
    .map((storm) =>
      el('path', {
        'data-slot': storm.slot,
        'data-over': storm.place,
        d: STORM_GLYPH,
        transform: `translate(${num(storm.x)} ${num(storm.y)}) scale(${num(STANDING_STORM_SCALE)})`,
      }),
    );
  return bolts.length === 0 ? undefined : el('g', { id: 'standing-storms', fill: STANDING_STORM_FILL }, bolts);
}

/**
 * The weather over the terrain: its definitions first, then the layers
 * bottom up. The standing storms lie under everything, since they are
 * terrain (D68); reach glows over them; the changed set is stained over it;
 * history textures go over the stains, so a hot file stays hot when it is
 * changed; evidence sits on the outlines; the exceptional edges cross the
 * bodies they join; then the ghosts, and the change's storms on top. A
 * layer with nothing to draw is left out rather than emptied (C2).
 */
export function drawWeather(map: MapJson, layout: Layout): Markup {
  const weather = weatherOf(map);
  const layers = [
    drawStandingStorms(weather.storms),
    drawReach(weather, layout),
    drawChanged(weather, layout),
    drawHistory(map.terrain, layout),
    drawEvidence(weather, layout),
    drawEdges(weather, layout),
    drawGhosts(weather, layout),
    drawStorms(weather.storms),
  ].flatMap((layer) => (layer === undefined ? [] : [layer]));
  return el('g', { id: 'weather' }, [drawDefs(), ...layers]);
}
