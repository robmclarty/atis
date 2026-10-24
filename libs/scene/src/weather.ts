/**
 * weather: what the change did, derived once for both renderers (§5.2, D90).
 * The SVG draws it still and the world draws it moving, and neither works it
 * out for itself, so the two cannot drift (D86).
 *
 * Each file the layout placed carries its own state: its change kind, and a
 * renamed file its old path (D40); a lit crossing where the reach left a cell
 * through it; its evidence, the skin's open share (D71, D80), its mutants as
 * notches round the top and its stitches round the bottom; and a ghost's
 * co-change. Each cell carries the reach at its nearest hop, dimmer by a
 * fixed share per membrane crossed (D5), and the storms over it, split by
 * whether the red is the change's (D68). The exceptional edges come beside
 * them. Each attribute has one channel of C11 and no other.
 *
 * All of it is read from `map.json` alone (D33). A channel the map does not
 * carry is absent, never defaulted (C2), a file the layout did not place
 * carries nothing, and every list is in path order (C3).
 */

import { readRedSplit } from 'core';
import type { ChangeKind, ExceptionalEdge, MapJson, ReachEntry, Stitch, Terrain } from 'core';

import { gridFor } from './heightfield.js';
import type { Grid } from './heightfield.js';
import { openRing, scanRing } from './raster.js';
import type { Ring } from './raster.js';
import { MUTANT_NOTCH_SPACING, REACH_DECAY, STITCH_SPACING, STORM_LIFT, STORM_ROW } from './tokens.js';

const PASSED = 'passed';
const FAILED = 'failed';
/** Where a file's notches gather, and its stitches: the top of its ring and the bottom, in the layout's y-down angles. */
const TOP = -Math.PI / 2;
const BOTTOM = Math.PI / 2;

/** Hue is state: what this change did to the file, and for a rename where it came from (D40). */
export type ChangeState = { readonly kind: ChangeKind; readonly from?: string };

/**
 * The skin round a changed file (D71): the share of its changed executable
 * lines no test ran, lit, and the rest a hairline. A file the coverage report
 * never names is unmeasured and open whole (D80).
 */
export type Skin =
  | { readonly measured: true; readonly open: number; readonly covered: number; readonly changed_executable: number }
  | { readonly measured: false; readonly open: 1 };

/** A mutant on the file, at its line, cut as a notch at `angle` round the top of the skin. */
export type Notch = { readonly line: number; readonly status: string; readonly angle: number };

/** How a stitch reads: lit for a pass, torn for a failure, unlit for a test not run, which is no pass (C2). */
export type StitchLook = 'lit' | 'torn' | 'unlit';

/** A test importing the file, stitched across its edge at `angle` round the bottom. */
export type StitchMark = { readonly test: string; readonly status: string; readonly look: StitchLook; readonly angle: number };

/** Luminance is evidence: the skin, the notches and the stitches, each present only where the map carries it. */
export type FileEvidence = {
  readonly skin?: Skin;
  readonly notches: readonly Notch[];
  readonly stitches: readonly StitchMark[];
};

/** A file that usually changes with these and did not (§5.2): the changed files it goes with, how often, and on how many commits. */
export type GhostState = { readonly with: readonly string[]; readonly rate: number; readonly support: number };

/** One placed file's weather; a file the weather leaves alone is not listed. */
export type FileWeather = {
  readonly path: string;
  readonly change?: ChangeState;
  /** The reach left a cell through this interface file, so it is lit at the crossing. */
  readonly crossing?: true;
  readonly evidence?: FileEvidence;
  readonly ghost?: GhostState;
};

/**
 * The reach in a cell: its nearest hop and its light, 1 in the changed cell
 * and `REACH_DECAY` dimmer per membrane crossed (D5). The light fills the
 * cell's own territory, its contour less the `holes` its children cut, so a
 * package never lights a folder the reach did not enter, and nested skins
 * never stack (D45, D151).
 */
export type CellReach = { readonly hops: number; readonly luminance: number; readonly holes: readonly string[] };

/** A red slot over a place (a cell, or a shore group), the change's or standing (D68), hung at the bolt's point above its contour. */
export type Storm = {
  readonly slot: string;
  readonly place: string;
  readonly change: boolean;
  readonly x: number;
  readonly y: number;
};

/** One cell's or shore group's weather; one the weather leaves alone is not listed. */
export type CellWeather = {
  readonly cell: string;
  readonly reach?: CellReach;
  readonly storms: readonly Storm[];
};

export type SceneWeather = {
  readonly files: readonly FileWeather[];
  readonly cells: readonly CellWeather[];
  /** Every storm the map hangs, the change's first, then the standing ones, each list by slot (C3). */
  readonly storms: readonly Storm[];
  /** The exceptional edges between placed files, the only lines on the map (§5.1). */
  readonly edges: readonly ExceptionalEdge[];
};

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** The angle of the `index`th of `count` marks spread evenly about `centre`, `spacing` apart, so two read as two and not as a lump. */
function spread(centre: number, index: number, count: number, spacing: number): number {
  return centre + (index - (count - 1) / 2) * spacing;
}

/** How bright the reach is a number of membranes out: 1 in the changed cell, a fixed share dimmer per crossing (D5). */
export function reachLuminance(hops: number): number {
  return REACH_DECAY ** hops;
}

/** The nearest hop each reached cell is entered at. */
function nearestHops(reach: readonly ReachEntry[]): ReadonlyMap<string, number> {
  const nearest = new Map<string, number>();
  for (const entry of reach) {
    const known = nearest.get(entry.cell);
    if (known === undefined || entry.hops < known) nearest.set(entry.cell, entry.hops);
  }
  return nearest;
}

/** Each cell's direct children that have a contour, in id order: the territory its own light is cut around (D45). */
function holesOf(terrain: Terrain): ReadonlyMap<string, readonly string[]> {
  const contours = terrain.layout?.contours ?? {};
  const children = new Map<string, string[]>();
  for (const cell of terrain.cells.toSorted((a, b) => byPath(a.id, b.id))) {
    if (cell.parent === undefined || contours[cell.id] === undefined) continue;
    const held = children.get(cell.parent) ?? [];
    held.push(cell.id);
    children.set(cell.parent, held);
  }
  return children;
}

/** How a stitch of this status reads. */
export function stitchLook(status: string): StitchLook {
  if (status === FAILED) return 'torn';
  return status === PASSED ? 'lit' : 'unlit';
}

/** The skins of the changed files, measured or not, by path. */
function skinsOf(map: MapJson): ReadonlyMap<string, Skin> {
  const skins = new Map<string, Skin>();
  for (const coverage of map.weather.evidence.patch_coverage ?? []) {
    // A file with no changed executable line has no skin to close or open (C2).
    if (coverage.changed_executable <= 0) continue;
    const open = Math.max(coverage.changed_executable - coverage.covered, 0) / coverage.changed_executable;
    skins.set(coverage.path, { measured: true, open, covered: coverage.covered, changed_executable: coverage.changed_executable });
  }
  for (const path of map.weather.evidence.unmeasured ?? []) skins.set(path, { measured: false, open: 1 });
  return skins;
}

/** The mutants on each file as notches, by line, spread round the top of its skin. */
function notchesOf(map: MapJson): ReadonlyMap<string, readonly Notch[]> {
  const byFile = new Map<string, { line: number; status: string }[]>();
  for (const mutant of (map.weather.evidence.mutants ?? []).toSorted((a, b) => a.line - b.line || byPath(a.status, b.status))) {
    const on = byFile.get(mutant.path) ?? [];
    on.push({ line: mutant.line, status: mutant.status });
    byFile.set(mutant.path, on);
  }
  return new Map(
    [...byFile].map(([path, on]) => [path, on.map((mutant, index) => ({ ...mutant, angle: spread(TOP, index, on.length, MUTANT_NOTCH_SPACING) }))] as const),
  );
}

/** The stitches on each target, by test path, spread round the bottom of its skin. */
function stitchesOf(map: MapJson): ReadonlyMap<string, readonly StitchMark[]> {
  const byTarget = new Map<string, { test: string; status: string }[]>();
  for (const stitch of (map.weather.evidence.stitches ?? []).toSorted((a, b) => byPath(a.test, b.test))) {
    for (const target of stitch.targets) {
      const on = byTarget.get(target) ?? [];
      on.push({ test: stitch.test, status: stitch.status });
      byTarget.set(target, on);
    }
  }
  return new Map(
    [...byTarget].map(
      ([target, on]) =>
        [
          target,
          on.map((stitch, index) => ({ ...stitch, look: stitchLook(stitch.status), angle: spread(BOTTOM, index, on.length, STITCH_SPACING) })),
        ] as const,
    ),
  );
}

/** Every placed file the weather touches, with its state, by path. */
function filesOf(map: MapJson): readonly FileWeather[] {
  const positions = map.terrain.layout?.positions ?? {};
  const changes = new Map(map.weather.changed.map((file) => [file.path, file] as const));
  const crossings = new Set(map.weather.reach.flatMap((entry) => entry.via));
  const skins = skinsOf(map);
  const notches = notchesOf(map);
  const stitches = stitchesOf(map);
  const ghosts = new Map(map.weather.ghosts.map((ghost) => [ghost.path, ghost] as const));
  const touched = new Set([...changes.keys(), ...crossings, ...skins.keys(), ...notches.keys(), ...stitches.keys(), ...ghosts.keys()]);
  return [...touched]
    .filter((path) => positions[path] !== undefined)
    .toSorted(byPath)
    .map((path): FileWeather => {
      const change = changes.get(path);
      const skin = skins.get(path);
      const onNotches = notches.get(path) ?? [];
      const onStitches = stitches.get(path) ?? [];
      const ghost = ghosts.get(path);
      const hasEvidence = skin !== undefined || onNotches.length > 0 || onStitches.length > 0;
      return {
        path,
        ...(change === undefined ? {} : { change: { kind: change.kind, ...(change.from === undefined ? {} : { from: change.from }) } }),
        ...(crossings.has(path) ? { crossing: true as const } : {}),
        ...(hasEvidence ? { evidence: { ...(skin === undefined ? {} : { skin }), notches: onNotches, stitches: onStitches } } : {}),
        ...(ghost === undefined ? {} : { ghost: { with: ghost.with, rate: ghost.rate, support: ghost.support } }),
      };
    });
}

/**
 * Where a red slot's named file sits on the field: its cell; for a test
 * file, which has no cell (D4), the cells of the files it stitches; else its
 * shore group. A path the map cannot place hangs nothing.
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
function topOf(contour: Ring): readonly [number, number] | undefined {
  let top: readonly [number, number] | undefined;
  for (const point of contour) {
    if (top === undefined || point[1] < top[1] || (point[1] === top[1] && point[0] < top[0])) top = point;
  }
  return top;
}

/**
 * The storms, from core's split of the red slots as the map records it (D67,
 * D73): each slot is the change's over every place a changed file it is on
 * the change through sits on, and standing state over every other place the
 * files it names sit on. A global slot names no file and hangs nothing; the
 * HUD counts it instead (D68). Each is hung above the top of its place's
 * contour, stacked where two hang over one place in the order they come, so
 * the change's red sits nearest; a place with no contour hangs nothing.
 */
function stormsOf(map: MapJson): readonly Storm[] {
  const { terrain, weather } = map;
  const stitches = weather.evidence.stitches ?? [];
  const red = readRedSplit(weather.checks.slots);
  const change = red.change.flatMap((slot) => placesOf(slot.change, terrain, stitches).map((place) => ({ slot: slot.name, place, change: true })));
  const standing = [...red.change, ...red.standing]
    .toSorted((a, b) => byPath(a.name, b.name))
    .flatMap((slot) => {
      const onChange = new Set(placesOf(slot.change, terrain, stitches));
      return placesOf(slot.named, terrain, stitches)
        .filter((place) => !onChange.has(place))
        .map((place) => ({ slot: slot.name, place, change: false }));
    });
  const contours = terrain.layout?.contours ?? {};
  const rows = new Map<string, number>();
  return [...change, ...standing].flatMap((storm): Storm[] => {
    const top = topOf(contours[storm.place] ?? []);
    if (top === undefined) return [];
    const row = rows.get(storm.place) ?? 0;
    rows.set(storm.place, row + 1);
    return [{ ...storm, x: top[0], y: top[1] - STORM_LIFT - row * STORM_ROW }];
  });
}

/** Every cell the reach entered and every place a storm hangs over, with its state, by id. */
function cellsOf(map: MapJson, storms: readonly Storm[]): readonly CellWeather[] {
  const hops = nearestHops(map.weather.reach);
  const holes = holesOf(map.terrain);
  const ids = [...new Set([...hops.keys(), ...storms.map((storm) => storm.place)])].toSorted(byPath);
  return ids.map((cell): CellWeather => {
    const nearest = hops.get(cell);
    return {
      cell,
      ...(nearest === undefined ? {} : { reach: { hops: nearest, luminance: reachLuminance(nearest), holes: holes.get(cell) ?? [] } }),
      storms: storms.filter((storm) => storm.place === cell),
    };
  });
}

/** The exceptional edges whose two ends the layout placed, by importer, imported and kind. */
function edgesOf(map: MapJson): readonly ExceptionalEdge[] {
  const positions = map.terrain.layout?.positions ?? {};
  return map.terrain.edges_exceptional
    .filter((edge) => positions[edge.from] !== undefined && positions[edge.to] !== undefined)
    .toSorted((a, b) => byPath(a.from, b.from) || byPath(a.to, b.to) || byPath(a.kind, b.kind));
}

/** The weather both renderers draw, derived from the map alone. */
export function weatherOf(map: MapJson): SceneWeather {
  const storms = stormsOf(map);
  return { files: filesOf(map), cells: cellsOf(map, storms), storms, edges: edgesOf(map) };
}

/**
 * The reach laid into a grid the skin samples, at the heightfield's
 * resolution (D152). Each reached cell lights its own territory, its contour
 * less the cells it holds, at its luminance, and each point takes the
 * brightest light over it, so where skins nest or touch the reach never
 * stacks into a brighter fog than the changed cell's own (D151). Unlit ground
 * is 0. The edge is hard at the sample; the skin's shader softens it.
 */
export function reachField(map: MapJson, resolution: number): Grid {
  const field = gridFor(map, resolution);
  const contours = map.terrain.layout?.contours ?? {};
  for (const { cell, reach } of weatherOf(map).cells) {
    const contour = contours[cell];
    if (reach === undefined || contour === undefined) continue;
    const inside = new Set<number>();
    scanRing(field, openRing(contour), (index) => inside.add(index));
    for (const hole of reach.holes) scanRing(field, openRing(contours[hole] ?? []), (index) => inside.delete(index));
    for (const index of inside) field.values[index] = Math.max(field.values[index] ?? 0, reach.luminance);
  }
  return field;
}
