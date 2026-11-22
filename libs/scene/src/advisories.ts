/**
 * advisories: what an audit says of the outside packages, read for every
 * renderer from the map's own `weather.dependencies` (D170, D90). The planet
 * that hung each package as a star is gone (D213 (planet-goes)), and with it
 * the one place a serious advisory showed on the opening frame; these are the
 * readings that put it back: the health of the packages as one line, for the
 * HUD's block and the status line (D347 (advisories-in-status), D352
 * (deps-block)), and the terrain files that import a package an advisory
 * names, for the mark on each, the whole repo's overlay and the stars'
 * lines (D351 (advised-files)).
 *
 * No audit read is no evidence and never a clean audit (C2): the health is
 * then unread, and no file is advised. A map written before core listed the
 * importing files carries the advisories and no files, and marks none.
 */

import type { Dependency, MapJson } from 'core';

import { starHue } from './planet.js';

/**
 * The outside packages' health in one reading: how many the terrain imports,
 * how many an advisory names, how many of those at high or critical, and the
 * worst severity among them, as the audit writes it. `unread` where the map
 * carries no package list, or no audit read any of them (C2).
 */
export type DependencyHealth =
  | { readonly state: 'unread'; readonly reason: string }
  | { readonly state: 'read'; readonly packages: number; readonly advised: number; readonly severe: number; readonly worst?: string };

/** The audit's severities, worst first, as `pnpm audit` and its kin write them; one it does not know ranks last. */
const SEVERITY_ORDER: readonly string[] = ['critical', 'high', 'moderate', 'low', 'info'];

function rankOf(severity: string): number {
  const rank = SEVERITY_ORDER.indexOf(severity);
  return rank === -1 ? SEVERITY_ORDER.length : rank;
}

function byText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** The health of the outside packages a map's terrain imports (D352 (deps-block)). */
export function dependencyHealthOf(map: MapJson): DependencyHealth {
  const { dependencies } = map.weather;
  if (dependencies === undefined) return { state: 'unread', reason: "the head scan recorded no file's imports by package" };
  const audited = dependencies.filter((dependency) => dependency.advisories !== undefined);
  // An audit reads every package or none, so one unread package among read ones is still an audit read.
  if (audited.length === 0) return { state: 'unread', reason: dependencies.length === 0 ? 'the terrain imports no outside package' : 'no audit was read' };
  const advised = audited.filter((dependency) => (dependency.advisories ?? 0) > 0);
  const [worst] = advised.flatMap((dependency) => dependency.severity ?? []).toSorted((a, b) => rankOf(a) - rankOf(b) || byText(a, b));
  return {
    state: 'read',
    packages: dependencies.length,
    advised: advised.length,
    severe: advised.filter((dependency) => starHue(dependency) === 'ifr').length,
    ...(worst === undefined ? {} : { worst }),
  };
}

/**
 * The `Deps` block's words (D352 (deps-block)), the same for the still sheet
 * and the world's HUD: how many outside packages an advisory names and the
 * worst severity among them, `clean` where an audit read them and named
 * none, and nothing where no audit was read, which the block mutes with a
 * dash and never writes as clean (C2).
 */
export function depsBlockOf(map: MapJson): { readonly value: string; readonly tail: string } | undefined {
  const health = dependencyHealthOf(map);
  if (health.state === 'unread') return undefined;
  if (health.advised === 0) return { value: 'clean', tail: '' };
  return { value: String(health.advised), tail: ` advised${health.worst === undefined ? '' : `, worst ${health.worst}`}` };
}

/**
 * One terrain file that imports a package an advisory names: the packages,
 * by name, and whether any of them is named at high or critical, the state a
 * star wore red for (D170), or only lower.
 */
export type AdvisedFile = { readonly path: string; readonly packages: readonly string[]; readonly severe: boolean };

/** Each map's advised files as last read, so a frame that asks again gets the list it had. */
const ADVISED = new WeakMap<MapJson, readonly AdvisedFile[]>();

/** A package's importing files, none where no advisory names it or the map lists none (C2). */
function filesOf(dependency: Dependency): readonly string[] {
  return (dependency.advisories ?? 0) > 0 ? (dependency.files ?? []) : [];
}

/**
 * The terrain files that import a package an advisory names, by path (C3),
 * each with every such package it imports (D351 (advised-files)). A file the
 * terrain no longer holds is left out.
 */
export function advisedFilesOf(map: MapJson): readonly AdvisedFile[] {
  const known = ADVISED.get(map);
  if (known !== undefined) return known;
  const terrain = new Set(map.terrain.organelles.map((organelle) => organelle.path));
  const byFile = new Map<string, { packages: string[]; severe: boolean }>();
  for (const dependency of map.weather.dependencies ?? []) {
    const severe = starHue(dependency) === 'ifr';
    for (const path of filesOf(dependency)) {
      if (!terrain.has(path)) continue;
      const entry = byFile.get(path) ?? { packages: [], severe: false };
      entry.packages.push(dependency.name);
      entry.severe ||= severe;
      byFile.set(path, entry);
    }
  }
  const files = [...byFile].map(([path, entry]): AdvisedFile => ({ path, packages: entry.packages.toSorted(byText), severe: entry.severe })).toSorted((a, b) => byText(a.path, b.path));
  ADVISED.set(map, files);
  return files;
}
