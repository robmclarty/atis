/**
 * dependencies: the outside packages the terrain imports at head (D170), the
 * stars the far zoom hangs around the planet, each with how many files use
 * it and the health its light carries.
 *
 * A package is counted from the head scan's record of what each file imports
 * by name, which never holds a workspace member or a Node built-in, and only
 * a terrain file counts: a test or a shore file is no terrain (D4). Beside
 * the count sit what this change did to the package in a manifest (D83) and
 * the worst advisory naming it. An audit whose advisories were not read gives
 * no count at all, never a clean one (C2).
 *
 * A package an advisory names also lists the terrain files that import it
 * (D351 (advised-files)), so the map can mark where a risky package is used:
 * a mark on each file, a whole repo's overlay, and a star's reach. A package
 * no advisory names lists none, which keeps the map the size it was.
 */

import { severityRank } from './evidence.js';
import type { Advisory, Security } from './evidence.js';
import type { DepAdded, DepMoved, Dependency, DependencyChange } from './schema.js';

/** A scanned file as this count reads it: its path, and the outside packages it imports where the scan recorded them. */
export type PackageImports = { readonly path: string; readonly packages?: readonly string[] };

export type DependencyInputs = {
  /** The head scan's files (D32). */
  readonly files: readonly PackageImports[];
  /** The terrain's files: a file outside it imports nothing the stars count (D4). */
  readonly terrain: ReadonlySet<string>;
  readonly deps_added: readonly DepAdded[];
  readonly deps_moved: readonly DepMoved[];
  /** The audit, or nothing where it was not read (C2). */
  readonly security: Security | undefined;
};

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** An advisory names a package as its module, or on a path that pulls its module in (D83). */
function names(advisory: Advisory, name: string): boolean {
  return advisory.module === name || advisory.paths.some((path) => path.packages.includes(name));
}

/** The advisories naming a package and the worst of their severities, or nothing where no audit's advisories were read (C2). */
function healthOf(name: string, advisories: readonly Advisory[] | undefined): Pick<Dependency, 'advisories' | 'severity'> {
  if (advisories === undefined) return {};
  const naming = advisories.filter((advisory) => names(advisory, name));
  const [worst] = naming.toSorted((a, b) => severityRank(a.severity) - severityRank(b.severity) || byPath(a.severity, b.severity));
  return worst === undefined ? { advisories: 0 } : { advisories: naming.length, severity: worst.severity.toLowerCase() };
}

/**
 * Every outside package a terrain file imports at head, sorted by name (C3),
 * or nothing where the head scan recorded no file's imports by package (C2).
 */
export function computeDependencies(inputs: DependencyInputs): readonly Dependency[] | undefined {
  if (!inputs.files.some((file) => file.packages !== undefined)) return undefined;
  const importing = new Map<string, string[]>();
  for (const file of inputs.files) {
    if (!inputs.terrain.has(file.path)) continue;
    for (const name of new Set(file.packages)) importing.set(name, [...(importing.get(name) ?? []), file.path]);
  }
  const added = new Set(inputs.deps_added.map((dep) => dep.name));
  const moved = new Set(inputs.deps_moved.map((dep) => dep.name));
  const changeOf = (name: string): DependencyChange | undefined => (added.has(name) ? 'added' : moved.has(name) ? 'moved' : undefined);
  return [...importing]
    .toSorted(([a], [b]) => byPath(a, b))
    .map(([name, files]): Dependency => {
      const change = changeOf(name);
      const health = healthOf(name, inputs.security?.advisories);
      return {
        name,
        importers: files.length,
        ...(change === undefined ? {} : { change }),
        ...health,
        // Only a package an advisory names says which files import it (D351 (advised-files)).
        ...((health.advisories ?? 0) > 0 ? { files: files.toSorted(byPath) } : {}),
      };
    });
}
