/**
 * radar: the health radar (D103), CHID's radar of a changed file's raw
 * metrics, read from the map alone (D93): cyclomatic, cognitive, CRAP, size,
 * churn, bug-fix rate, fan-in and fan-out, one spoke each. Raw, each spoke
 * carries the number the map holds and runs to the largest the map holds for
 * that measure. Categorised, it stands within or over its threshold in D9's
 * one config: fallow's for the three complexity measures, read from the
 * file's dents, and the notices' gates for churn, bug-fix rate and fan-in.
 * A file's fan-in and fan-out are counted from the change's wiring, the
 * terrain files that import it and that it imports, since tests tie nothing
 * (D4). What the map does not carry is muted with the reason, never drawn as
 * a number: it records whether a function breaks fallow's thresholds and not
 * by how much, so the three complexity spokes have no raw value, and D9 sets
 * no threshold for a file's size or its fan-out (C2). Pure: no React, no DOM.
 */

import { DEFAULT_CONFIG } from 'core';
import type { Config, MapJson } from 'core';
import { MUTED_DASH } from 'scene';

/** The radar's spokes, clockwise from the top. */
export type RadarMeasure = 'cyclomatic' | 'cognitive' | 'crap' | 'size' | 'churn' | 'bugfix' | 'fan_in' | 'fan_out';

/** Each spoke and how it is named, in order. */
export const RADAR_MEASURES: readonly { readonly id: RadarMeasure; readonly label: string }[] = [
  { id: 'cyclomatic', label: 'cyclomatic' },
  { id: 'cognitive', label: 'cognitive' },
  { id: 'crap', label: 'CRAP' },
  { id: 'size', label: 'size' },
  { id: 'churn', label: 'churn' },
  { id: 'bugfix', label: 'bug-fix rate' },
  { id: 'fan_in', label: 'fan-in' },
  { id: 'fan_out', label: 'fan-out' },
];

/** How a spoke stands raw: its number as written and its reach, 0 to 1, of the largest the map holds; or why the map holds none. */
export type RawReading = { readonly value: number; readonly written: string; readonly reach: number } | { readonly muted: string };

/** How a spoke stands categorised: within or over its threshold, which is written beside it; or why it has no category. */
export type CategoryReading = { readonly over: boolean; readonly threshold: string } | { readonly muted: string };

export type RadarSpoke = { readonly id: RadarMeasure; readonly label: string; readonly raw: RawReading; readonly category: CategoryReading };

export type Radar = { readonly path: string; readonly spokes: readonly RadarSpoke[] };

const NO_RAW_COMPLEXITY = "the map records whether a function breaks fallow's threshold, not by how much";

/** The changed files a radar can be drawn for: each one the terrain places, in the map's order. */
export const radarFiles = (map: MapJson): readonly string[] => {
  const placed = new Set(map.terrain.organelles.map((organelle) => organelle.id));
  return map.weather.changed.filter((file) => file.kind !== 'deleted' && placed.has(file.path)).map((file) => file.path);
};

/** The file a radar opens on: the first a notice names, the change's worst first, else the first changed file it can be drawn for. */
export const firstRadarFile = (map: MapJson): string | undefined => {
  const files = radarFiles(map);
  return map.notices.map((notice) => notice.target).find((target) => files.includes(target)) ?? files[0];
};

/** A number as a spoke writes it: a whole number plainly, a fraction to two places. */
const written = (value: number): string => (Number.isInteger(value) ? String(value) : value.toFixed(2));

/** A raw reading of `value` against the largest the map holds, or the reason it has none. */
const rawOf = (value: number | undefined, largest: number, muted: string): RawReading => (value === undefined ? { muted } : { value, written: written(value), reach: largest > 0 ? Math.min(1, value / largest) : 0 });

/** A categorised reading of `value` against a gate it is over at or above, or the reason it has none. */
const gated = (value: number | undefined, gate: number, muted: string): CategoryReading => (value === undefined ? { muted } : { over: value >= gate, threshold: `≥ ${written(gate)}` });

/** Whether fallow's health was read for the head, so a file with no dent breaks none of its thresholds rather than going unmeasured (C2). */
const healthRead = (map: MapJson): boolean => {
  const { fallow_schemas: schemas, structure } = map.meta.instruments;
  return schemas?.health !== undefined || (structure !== undefined && 'fallow' in structure.head);
};

/** The terrain files on each side of a changed file's import edges: those importing it and those it imports, counted once each; none with no wiring recorded. */
const fansOf = (map: MapJson, terrain: ReadonlySet<string>): ReadonlyMap<string, { readonly in: number; readonly out: number }> | undefined => {
  const { wiring } = map.weather;
  if (wiring === undefined) return undefined;
  const importers = new Map<string, Set<string>>();
  const imported = new Map<string, Set<string>>();
  const add = (sides: Map<string, Set<string>>, file: string, other: string): void => {
    if (!terrain.has(other)) return;
    const set = sides.get(file) ?? new Set<string>();
    set.add(other);
    sides.set(file, set);
  };
  for (const edge of wiring) {
    add(importers, edge.to, edge.from);
    add(imported, edge.from, edge.to);
  }
  return new Map(radarFiles(map).map((path) => [path, { in: importers.get(path)?.size ?? 0, out: imported.get(path)?.size ?? 0 }] as const));
};

/** The largest of some numbers, 0 for none. */
const largestOf = (values: readonly (number | undefined)[]): number => values.reduce<number>((most, value) => (value !== undefined && value > most ? value : most), 0);

/** The health radar for a changed file the terrain places, with D9's thresholds from `config`; none for any other path. */
export const radarOf = (map: MapJson, path: string, config: Config = DEFAULT_CONFIG): Radar | undefined => {
  const organelle = map.terrain.organelles.find((candidate) => candidate.id === path);
  if (organelle === undefined || !radarFiles(map).includes(path)) return undefined;
  const { organelles } = map.terrain;
  const fans = fansOf(map, new Set(organelles.map((candidate) => candidate.id)));
  const fan = fans?.get(path);
  const noWiring = 'the map records no wiring for the change';
  const health = healthRead(map);
  const complexity = (rule: string): CategoryReading => (health ? { over: organelle.dents.includes(rule), threshold: "fallow's" } : { muted: 'no health was read for the head' });
  const gates = config.notices;
  const readings: Readonly<Record<RadarMeasure, Omit<RadarSpoke, 'id' | 'label'>>> = {
    cyclomatic: { raw: { muted: NO_RAW_COMPLEXITY }, category: complexity('cyclomatic') },
    cognitive: { raw: { muted: NO_RAW_COMPLEXITY }, category: complexity('cognitive') },
    crap: { raw: { muted: NO_RAW_COMPLEXITY }, category: complexity('crap') },
    size: { raw: rawOf(organelle.loc, largestOf(organelles.map((candidate) => candidate.loc)), 'no size was read'), category: { muted: 'D9 sets no threshold for a file\'s size' } },
    churn: {
      raw: rawOf(organelle.churn_ratio, largestOf(organelles.map((candidate) => candidate.churn_ratio)), 'the history window saw no churn for it'),
      category: gated(organelle.churn_ratio, gates.hot_churn_ratio, 'the history window saw no churn for it'),
    },
    bugfix: {
      raw: rawOf(organelle.bugfix_rate, largestOf(organelles.map((candidate) => candidate.bugfix_rate)), 'the history window saw no commits for it'),
      category: gated(organelle.bugfix_rate, gates.hot_bugfix_rate, 'the history window saw no commits for it'),
    },
    fan_in: { raw: rawOf(fan?.in, largestOf([...(fans?.values() ?? [])].map((each) => each.in)), noWiring), category: gated(fan?.in, gates.fan_in_high, noWiring) },
    fan_out: { raw: rawOf(fan?.out, largestOf([...(fans?.values() ?? [])].map((each) => each.out)), noWiring), category: { muted: 'D9 sets no threshold for fan-out' } },
  };
  return { path, spokes: RADAR_MEASURES.map(({ id, label }) => ({ id, label, ...readings[id] })) };
};

/** What a spoke writes beside its end: its number raw, `over` or `within` and the threshold categorised, or the muted dash. */
export const spokeWords = (spoke: RadarSpoke, raw: boolean): string => {
  if (raw) return 'muted' in spoke.raw ? MUTED_DASH : spoke.raw.written;
  return 'muted' in spoke.category ? MUTED_DASH : `${spoke.category.over ? 'over' : 'within'} ${spoke.category.threshold}`;
};
