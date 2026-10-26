/**
 * overlays: what each whole-repo overlay lays on the terrain (D101), derived
 * once for both renderers (D90).
 *
 * A `repo` map draws one overlay at a time, and each is drawn in the channel
 * its measure owns (C11): trouble spots and recent heat are history, so they
 * are texture; ugly spots, coverage gaps and dead code are what the checks
 * found, so they are luminance, as evidence is; duplication is repetition, a
 * file's outline echoed; a cycle is a state, LIFR's; and a baselined finding
 * is muted, drawn in the standing state's graphite (D49). Each overlay comes
 * down to a level per terrain file, 0 to 1, how strongly its channel marks
 * that file. An overlay the map holds as muted carries its reason instead,
 * and a map of a change holds none (C2). A file the terrain does not hold,
 * a shore file, is not on the field and gets no mark.
 */

import { OVERLAY_NAMES } from 'core';
import type { MapJson, OverlayName, Overlays } from 'core';

import { OVERLAY_DEAD_EXPORT_LEVEL } from './tokens.js';

/** The overlay a `repo` map opens on: churn × complexity, where trouble usually is (§8). */
export const DEFAULT_OVERLAY: OverlayName = 'trouble_spots';

/** What the HUD calls each overlay. */
export const OVERLAY_TITLES: Readonly<Record<OverlayName, string>> = {
  trouble_spots: 'Trouble spots',
  ugly_spots: 'Ugly spots',
  coverage_gaps: 'Coverage gaps',
  dead_code: 'Dead code',
  duplication: 'Duplication',
  cycles: 'Cycles',
  recent_heat: 'Recent heat',
  baselined: 'Baselined',
};

/** The channel an overlay is drawn in, the one its measure owns (C11). */
export type OverlayChannel = 'texture' | 'luminance' | 'repetition' | 'state' | 'muted';

export const OVERLAY_CHANNELS: Readonly<Record<OverlayName, OverlayChannel>> = {
  trouble_spots: 'texture',
  ugly_spots: 'luminance',
  coverage_gaps: 'luminance',
  dead_code: 'luminance',
  duplication: 'repetition',
  cycles: 'state',
  recent_heat: 'texture',
  baselined: 'muted',
};

/** What the HUD counts an overlay's entries as. */
export type OverlayUnit = 'file' | 'finding' | 'family' | 'cycle';

/** How strongly an overlay marks one terrain file, above 0 and at most 1. */
export type OverlayMark = { readonly path: string; readonly level: number };

/** One overlay as the renderers draw it: its marks in its channel and how many entries it holds, or why the map holds none. */
export type OverlayView =
  | {
      readonly name: OverlayName;
      readonly title: string;
      readonly channel: OverlayChannel;
      readonly marks: readonly OverlayMark[];
      readonly count: number;
      readonly unit: OverlayUnit;
    }
  | { readonly name: OverlayName; readonly title: string; readonly reason: string };

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** A name the CLI or a toggle hands in, as one of the overlays, or undefined. */
export function overlayNamed(name: string): OverlayName | undefined {
  return OVERLAY_NAMES.find((known) => known === name);
}

/** The levels, one per terrain file, the strongest where an overlay names a file twice, and nothing at 0. */
function marksOf(levels: readonly (readonly [string, number])[], terrain: ReadonlySet<string>): readonly OverlayMark[] {
  const strongest = new Map<string, number>();
  for (const [path, level] of levels) {
    if (terrain.has(path) && level > 0) strongest.set(path, Math.max(strongest.get(path) ?? 0, Math.min(level, 1)));
  }
  return [...strongest].map(([path, level]) => ({ path, level })).toSorted((a, b) => byPath(a.path, b.path));
}

/** One overlay's levels by file, and what its entries are counted as. */
type Levels = { readonly levels: readonly (readonly [string, number])[]; readonly count: number; readonly unit: OverlayUnit };

/** A dead file is lit full, and a file with dead exports a share of that per export. */
function deadLevels(dead: NonNullable<Overlays['dead_code']>): Levels {
  const exports = new Map<string, number>();
  for (const entry of dead) if (entry.kind === 'export') exports.set(entry.path, (exports.get(entry.path) ?? 0) + 1);
  const levels = [
    ...dead.flatMap((entry) => (entry.kind === 'file' ? [[entry.path, 1] as const] : [])),
    ...[...exports].map(([path, count]) => [path, count * OVERLAY_DEAD_EXPORT_LEVEL] as const),
  ];
  return { levels, count: dead.length, unit: 'finding' };
}

/** Each overlay's levels, by name; undefined where the map does not draw it. */
const LEVELS: Readonly<Record<OverlayName, (overlays: Overlays) => Levels | undefined>> = {
  trouble_spots: ({ trouble_spots: spots }) => spots && { levels: spots.map((spot) => [spot.path, spot.score] as const), count: spots.length, unit: 'file' },
  // fallow's maintainability index runs 0 to 100, so the light is what a file falls short of 100 by; a file fallow never scored is lit full.
  ugly_spots: ({ ugly_spots: spots }) =>
    spots && { levels: spots.map((spot) => [spot.path, spot.maintainability === undefined ? 1 : (100 - spot.maintainability) / 100] as const), count: spots.length, unit: 'file' },
  coverage_gaps: ({ coverage_gaps: gaps }) =>
    gaps && { levels: gaps.map((gap) => [gap.path, 'unmeasured' in gap ? 1 : gap.uncovered / gap.statements] as const), count: gaps.length, unit: 'file' },
  dead_code: ({ dead_code: dead }) => dead && deadLevels(dead),
  duplication: ({ duplication: families }) =>
    families && { levels: families.flatMap((family) => family.files.map((path) => [path, 1] as const)), count: families.length, unit: 'family' },
  cycles: ({ cycles }) => cycles && { levels: cycles.flatMap((cycle) => cycle.files.map((path) => [path, 1] as const)), count: cycles.length, unit: 'cycle' },
  recent_heat: ({ recent_heat: heat }) => {
    if (heat === undefined) return undefined;
    const hottest = heat.files.reduce((most, file) => Math.max(most, file.commits), 0);
    return { levels: heat.files.map((file) => [file.path, file.commits / hottest] as const), count: heat.files.length, unit: 'file' };
  },
  baselined: ({ baselined: found }) =>
    found && { levels: found.flatMap((finding) => finding.files.map((path) => [path, 1] as const)), count: found.length, unit: 'finding' },
};

/** Why the map holds no `name`: the reason `muted` gives it (C2). */
function reasonOf(overlays: Overlays, name: OverlayName): string {
  const prefix = `${name}: `;
  const entry = (overlays.muted ?? []).find((line) => line.startsWith(prefix));
  return entry === undefined ? 'the map holds no such overlay' : entry.slice(prefix.length);
}

/**
 * One overlay of a `repo` map as the renderers draw it, or undefined on a
 * map of a change, which holds no overlays (D101).
 */
export function overlayOf(map: MapJson, name: OverlayName): OverlayView | undefined {
  const { overlays } = map;
  if (overlays === undefined) return undefined;
  const title = OVERLAY_TITLES[name];
  const read = LEVELS[name](overlays);
  if (read === undefined) return { name, title, reason: reasonOf(overlays, name) };
  const terrain = new Set(map.terrain.organelles.map((organelle) => organelle.path));
  return { name, title, channel: OVERLAY_CHANNELS[name], marks: marksOf(read.levels, terrain), count: read.count, unit: read.unit };
}
