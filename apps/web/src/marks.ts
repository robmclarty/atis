/**
 * marks: the weather as the world draws it, worked out from the scene's one
 * derivation (`weatherOf`, D90) into flat records a GPU instances: a sector
 * per mark on a file, a bolt per storm, a ribbon per exceptional edge, and a
 * label for each old path and each change storm's slot. Every mark the still
 * SVG draws has its record here, mark for mark (D86), with the same tokens
 * for its size and the same hue by meaning (C11); the hues themselves are
 * named by index, so the material reads them live through the registry
 * (D156). Pure: no three, no DOM, so a test reads the records straight.
 */

import {
  ARROW_SIZE,
  BUGFIX_FULL_AT,
  CHANGE_OUTLINE_WIDTH,
  CHURN_FULL_AT,
  CROSSING_OPACITY,
  CROSSING_PAD,
  EDGE_BOW,
  EDGE_WIDTH,
  GHOST_DASH,
  GHOST_PAD,
  INTEGRITY_CLOSED_OPACITY,
  INTEGRITY_CLOSED_WIDTH,
  INTEGRITY_GAP_WIDTH,
  INTEGRITY_PAD,
  MUTANT_NOTCH_DEPTH,
  MUTANT_NOTCH_WIDTH,
  RENAME_DASH,
  RENAME_LABEL_GAP,
  STANDING_STORM_SCALE,
  STITCH_LENGTH,
  STITCH_TEAR,
  STITCH_WIDTH,
  STORM_LABEL_GAP,
  TEXTURE_MAX_OPACITY,
  weatherOf,
} from 'scene';
import type { FileWeather, SceneWeather, Storm } from 'scene';
import type { MapJson, Position } from 'core';

/** The hues a mark can take, by what it means: the index the material's palette is read at. */
export const HUES = ['change', 'reach', 'evidence', 'ifr', 'unlit', 'ghost', 'ink', 'lifr', 'standing'] as const;
export type Hue = (typeof HUES)[number];

/** A texture laid over a mark: none, hatching for churn, stipple for bug-fix rate (C11). */
export type Pattern = 'none' | 'hatch' | 'stipple';

/** What a mark is, for a reader and a test; the GPU reads the numbers. */
export type MarkKind = 'stain' | 'outline' | 'crossing' | 'hairline' | 'gap' | 'notch' | 'stitch' | 'ghost' | 'history';

/**
 * One sector about a file: an arc from `from` to `to` (radians, y down, the
 * layout's), between `inner` and `outer` offsets from the file's radius; or,
 * when `from` equals `to`, a strip along that spoke, `innerHalf` and
 * `outerHalf` wide either side at its two ends, which is how a stitch and a
 * notch are cut. Its `dash` is on and off along the arc, 0 for solid; its
 * `bloom` is the share of its light the bloom sees; and `far` says it shows
 * at the far field too, where only the change's lights show (§5.6).
 */
export type Sector = {
  readonly kind: MarkKind;
  readonly path: string;
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly from: number;
  readonly to: number;
  readonly inner: number;
  readonly outer: number;
  readonly innerHalf: number;
  readonly outerHalf: number;
  readonly hue: Hue;
  readonly opacity: number;
  readonly dash: readonly [number, number];
  readonly bloom: number;
  readonly pattern: Pattern;
  readonly far: boolean;
};

/** A storm's bolt, flat on the skin where the scene hangs it, the change's full size and standing state smaller and graphite (D68). */
export type Bolt = { readonly slot: string; readonly place: string; readonly x: number; readonly y: number; readonly scale: number; readonly hue: Hue };

/** An exceptional edge as a ribbon: its points along the bow, its hue by kind, and the arrowhead's tip and heading at the imported end. */
export type Ribbon = {
  readonly from: string;
  readonly to: string;
  readonly kind: string;
  readonly points: readonly (readonly [number, number])[];
  readonly hue: Hue;
  readonly arrow: { readonly x: number; readonly y: number; readonly angle: number; readonly size: number };
};

/** Words the world writes beside a mark: a change storm's slot, a renamed file's old path (D40). */
export type Label = { readonly kind: 'storm' | 'rename'; readonly text: string; readonly x: number; readonly y: number; readonly hue: Hue };

export type Marks = {
  readonly sectors: readonly Sector[];
  readonly bolts: readonly Bolt[];
  readonly ribbons: readonly Ribbon[];
  readonly labels: readonly Label[];
};

const TAU = 2 * Math.PI;
/** Where the lit gap starts, the top of the ring, as the SVG rotates it. */
const TOP = -Math.PI / 2;
const SOLID: readonly [number, number] = [0, 0];
/** The points a ribbon is sampled at along its bow. */
const RIBBON_SAMPLES = 16;

/** A dash token, `"3 2"`, as its two lengths. */
const dashOf = (token: string): readonly [number, number] => {
  const [on = 0, off = 0] = token.split(' ').map(Number);
  return [on, off];
};

/** A sector's fields that most marks leave at rest. */
const REST = { innerHalf: 0, outerHalf: 0, dash: SOLID, pattern: 'none' as const, far: false };

/** A full ring of `width` centred `offset` past the file's radius. */
const ring = (kind: MarkKind, file: FileWeather, at: Position, offset: number, width: number, hue: Hue, opacity: number, bloom: number, dash: readonly [number, number] = SOLID): Sector => ({
  ...REST,
  kind,
  path: file.path,
  x: at.x,
  y: at.y,
  r: at.r,
  from: 0,
  to: TAU,
  inner: offset - width / 2,
  outer: offset + width / 2,
  hue,
  opacity,
  dash,
  bloom,
});

/** A disc out to `outer` past the file's radius. */
const disc = (kind: MarkKind, file: FileWeather, at: Position, outer: number, hue: Hue, opacity: number, bloom: number, far: boolean, pattern: Pattern = 'none'): Sector => ({
  ...REST,
  kind,
  path: file.path,
  x: at.x,
  y: at.y,
  r: at.r,
  from: 0,
  to: TAU,
  inner: -at.r,
  outer,
  hue,
  opacity,
  bloom,
  pattern,
  far,
});

/** A strip along the spoke at `angle`, from `inner` to `outer` past the radius, `innerHalf` and `outerHalf` wide at each end. */
const spoke = (kind: MarkKind, file: FileWeather, at: Position, angle: number, inner: number, outer: number, innerHalf: number, outerHalf: number, hue: Hue, bloom: number): Sector => ({
  ...REST,
  kind,
  path: file.path,
  x: at.x,
  y: at.y,
  r: at.r,
  from: angle,
  to: angle,
  inner,
  outer,
  innerHalf,
  outerHalf,
  hue,
  opacity: 1,
  bloom,
});

/** The change's stain by kind: a filled disc for an edit, the outline alone for a deletion, a dashed outline for a rename (D40). The stain shows at the far field, as the change's light. */
const stainOf = (file: FileWeather, at: Position): readonly Sector[] => {
  const change = file.change;
  if (change === undefined) return [];
  if (change.kind === 'added' || change.kind === 'modified') return [disc('stain', file, at, 0, 'change', 1, 1, true)];
  return [ring('outline', file, at, 0, CHANGE_OUTLINE_WIDTH, 'change', 1, 1, change.kind === 'renamed' ? dashOf(RENAME_DASH) : SOLID)];
};

/** The evidence on a changed file (D71): its skin's hairline and lit gap, or the whole ring lit when nobody measured it (D80); its mutants as notches; its stitches, torn in two when the test failed. */
const evidenceOf = (file: FileWeather, at: Position): readonly Sector[] => {
  const evidence = file.evidence;
  if (evidence === undefined) return [];
  const skin = evidence.skin;
  const skins: Sector[] =
    skin === undefined
      ? []
      : skin.measured
        ? [
            ring('hairline', file, at, INTEGRITY_PAD, INTEGRITY_CLOSED_WIDTH, 'evidence', INTEGRITY_CLOSED_OPACITY, 0),
            ...(skin.open > 0 ? [{ ...ring('gap', file, at, INTEGRITY_PAD, INTEGRITY_GAP_WIDTH, 'evidence', 1, 1), from: TOP, to: TOP + skin.open * TAU }] : []),
          ]
        : [ring('hairline', file, at, INTEGRITY_PAD, INTEGRITY_CLOSED_WIDTH, 'evidence', INTEGRITY_CLOSED_OPACITY, 0), ring('gap', file, at, INTEGRITY_PAD, INTEGRITY_GAP_WIDTH, 'evidence', 1, 1)];
  const notches = evidence.notches.map((notch) => spoke('notch', file, at, notch.angle, -MUTANT_NOTCH_DEPTH, INTEGRITY_PAD + INTEGRITY_GAP_WIDTH / 2, 0, MUTANT_NOTCH_WIDTH / 2, 'evidence', 1));
  const half = STITCH_LENGTH / 2;
  const stitches = evidence.stitches.flatMap((stitch) => {
    const hue: Hue = stitch.look === 'lit' ? 'evidence' : stitch.look === 'torn' ? 'ifr' : 'unlit';
    const bloom = stitch.look === 'unlit' ? 0 : 1;
    if (stitch.look !== 'torn') return [spoke('stitch', file, at, stitch.angle, -half, half, STITCH_WIDTH / 2, STITCH_WIDTH / 2, hue, bloom)];
    return [
      spoke('stitch', file, at, stitch.angle, -half, -STITCH_TEAR / 2, STITCH_WIDTH / 2, STITCH_WIDTH / 2, hue, bloom),
      spoke('stitch', file, at, stitch.angle, STITCH_TEAR / 2, half, STITCH_WIDTH / 2, STITCH_WIDTH / 2, hue, bloom),
    ];
  });
  return [...skins, ...notches, ...stitches];
};

/** A texture's opacity by its value: proportional up to the value it is full at, and full beyond. */
const textureOpacity = (value: number, fullAt: number): number => TEXTURE_MAX_OPACITY * Math.min(value / fullAt, 1);

/** History as texture on every placed file that carries a value (C2): hatching by churn, stipple by bug-fix rate. */
const historyOf = (map: MapJson): readonly Sector[] => {
  const positions = map.terrain.layout?.positions ?? {};
  return map.terrain.organelles
    .toSorted((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .flatMap((organelle) => {
      const at = positions[organelle.id];
      if (at === undefined) return [];
      const file: FileWeather = { path: organelle.id };
      const churn = organelle.churn_ratio;
      const bugfix = organelle.bugfix_rate;
      return [
        ...(churn !== undefined && churn > 0 ? [disc('history', file, at, 0, 'ink', textureOpacity(churn, CHURN_FULL_AT), 0, false, 'hatch')] : []),
        ...(bugfix !== undefined && bugfix > 0 ? [disc('history', file, at, 0, 'ink', textureOpacity(bugfix, BUGFIX_FULL_AT), 0, false, 'stipple')] : []),
      ];
    });
};

/** The marks on every placed file the weather touches, in the SVG's own layer order: stains, history, evidence, ghosts; crossings with the reach beneath. */
const sectorsOf = (map: MapJson, weather: SceneWeather): readonly Sector[] => {
  const positions = map.terrain.layout?.positions ?? {};
  const placed = weather.files.flatMap((file) => {
    const at = positions[file.path];
    return at === undefined ? [] : [{ file, at }];
  });
  const crossings = placed.flatMap(({ file, at }) => (file.crossing === true ? [disc('crossing', file, at, CROSSING_PAD, 'reach', CROSSING_OPACITY, 1, false)] : []));
  const stains = placed.flatMap(({ file, at }) => stainOf(file, at));
  const evidence = placed.flatMap(({ file, at }) => evidenceOf(file, at));
  const ghosts = placed.flatMap(({ file, at }) => (file.ghost === undefined ? [] : [ring('ghost', file, at, GHOST_PAD, 1, 'ghost', 1, 0, dashOf(GHOST_DASH))]));
  return [...crossings, ...stains, ...historyOf(map), ...evidence, ...ghosts];
};

/** Every storm as a bolt where the scene hangs it; a change's labelled with its slot beside it. */
const boltsOf = (storms: readonly Storm[]): { readonly bolts: readonly Bolt[]; readonly labels: readonly Label[] } => ({
  bolts: storms.map((storm) => ({ slot: storm.slot, place: storm.place, x: storm.x, y: storm.y, scale: storm.change ? 1 : STANDING_STORM_SCALE, hue: storm.change ? 'ifr' : 'standing' })),
  labels: storms.filter((storm) => storm.change).map((storm) => ({ kind: 'storm', text: storm.slot, x: storm.x + STORM_LABEL_GAP, y: storm.y, hue: 'ifr' })),
});

/** The point `distance` out from `from` toward `to`. */
const toward = (from: Position, to: { readonly x: number; readonly y: number }, distance: number): readonly [number, number] => {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  if (length === 0) return [from.x, from.y];
  return [from.x + ((to.x - from.x) / length) * distance, from.y + ((to.y - from.y) / length) * distance];
};

/** Each exceptional edge as a ribbon along the bow the SVG draws, its ends pulled back to each file's edge, the arrowhead on the imported file's rim. */
const ribbonsOf = (map: MapJson, weather: SceneWeather): readonly Ribbon[] => {
  const positions = map.terrain.layout?.positions ?? {};
  return weather.edges.flatMap((edge): Ribbon[] => {
    const from = positions[edge.from];
    const to = positions[edge.to];
    if (from === undefined || to === undefined) return [];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (dx === 0 && dy === 0) return [];
    const control = { x: (from.x + to.x) / 2 - dy * EDGE_BOW, y: (from.y + to.y) / 2 + dx * EDGE_BOW };
    const [x1, y1] = toward(from, control, from.r);
    const [x2, y2] = toward(to, control, to.r);
    const points = Array.from({ length: RIBBON_SAMPLES + 1 }, (_, i): readonly [number, number] => {
      const t = i / RIBBON_SAMPLES;
      const u = 1 - t;
      return [u * u * x1 + 2 * u * t * control.x + t * t * x2, u * u * y1 + 2 * u * t * control.y + t * t * y2];
    });
    return [{ from: edge.from, to: edge.to, kind: edge.kind, points, hue: edge.kind === 'new-cross-module' ? 'change' : 'lifr', arrow: { x: x2, y: y2, angle: Math.atan2(y2 - control.y, x2 - control.x), size: ARROW_SIZE } }];
  });
};

/** The old path beside each renamed file (D40). */
const renamesOf = (map: MapJson, weather: SceneWeather): readonly Label[] => {
  const positions = map.terrain.layout?.positions ?? {};
  return weather.files.flatMap((file): Label[] => {
    const at = positions[file.path];
    if (at === undefined || file.change?.kind !== 'renamed' || file.change.from === undefined) return [];
    return [{ kind: 'rename', text: file.change.from, x: at.x + at.r + RENAME_LABEL_GAP, y: at.y, hue: 'change' }];
  });
};

/** The weather's marks for a map, read from the scene's derivation alone. */
export const marksOf = (map: MapJson): Marks => {
  const weather = weatherOf(map);
  const { bolts, labels } = boltsOf(weather.storms);
  return { sectors: sectorsOf(map, weather), bolts, ribbons: ribbonsOf(map, weather), labels: [...labels, ...renamesOf(map, weather)] };
};

/** The width a ribbon is drawn at, the only line on the map (§5.1). */
export const RIBBON_WIDTH = EDGE_WIDTH;
