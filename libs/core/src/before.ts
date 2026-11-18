/**
 * before: the reach a change would have, asked before the change is made.
 *
 * A map answers "what did this change reach?" from a diff. A planner asks
 * the question the other way round: it names the files a step means to
 * change and wants the ring a change there usually drags along. `reachFrom`
 * answers from one scan and one log window, with no new kind of evidence:
 * the import reach is `computeReach` fed one `modified` entry per named
 * file, priced by module hop as D5 prices it, and the co-change reach is
 * `computeHistory` with the named files as the changed set, held to the
 * thresholds a ghost is held to. A source that is missing mutes what it
 * would have said, in words (C2). It reads no file and no clock (C1), and
 * every list leaves sorted, so one commit and one set of paths give one
 * answer (C3).
 */

import { DEFAULT_CONFIG } from './config.js';
import type { Config } from './config.js';
import { computeHistory } from './history.js';
import type { Commit } from './history.js';
import { standingModules } from './map.js';
import type { Scan } from './map.js';
import { computeReach } from './reach.js';
import type { DiffFile } from './reach.js';
import { REACH_KIND, REACH_SCHEMA_VERSION } from './schema.js';
import type { Cochange, ReachAnswer, ReachByCochange, ReachByImport, ReachedFile } from './schema.js';

export type ReachFromOptions = {
  /** The commit the scan was taken at. */
  readonly head: string;
  /** The config whose shore table and co-change thresholds apply; the default when absent. */
  readonly config?: Config;
  /** Why the co-change half is not read (`--no-history`, a shallow clone), as the words `muted` carries; the commits are left unread when it is set. */
  readonly cochange_muted?: string;
};

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function sortUnique(values: readonly string[]): readonly string[] {
  return [...new Set(values)].toSorted(byPath);
}

/** A rate to two places, as the answer prints it: four of six reads 0.67. */
function round(rate: number): number {
  return Math.round(rate * 100) / 100;
}

/** A named path with no trailing slash and no leading `./`; the repository's root is the empty string. */
function bare(path: string): string {
  const trimmed = path.replace(/^(?:\.\/)+/, '').replace(/\/+$/, '');
  return trimmed === '.' ? '' : trimmed;
}

/** What the named paths are at the head: the files they name, a `dir/` standing for every file under it, and the ones that name nothing yet. */
function resolvePaths(paths: readonly string[], scan: Scan): { readonly files: readonly string[]; readonly fresh: readonly string[] } {
  const known = new Set(scan.files.map((file) => file.path));
  const files: string[] = [];
  const fresh: string[] = [];
  for (const path of paths) {
    const named = bare(path);
    if (known.has(named)) {
      files.push(named);
      continue;
    }
    const prefix = named === '' ? '' : `${named}/`;
    const under = scan.files.map((file) => file.path).filter((file) => file.startsWith(prefix));
    if (under.length === 0) fresh.push(path);
    else files.push(...under);
  }
  return { files: sortUnique(files), fresh: sortUnique(fresh) };
}

/** The extension a path ends in, dot included, or the empty string. */
function extensionOf(path: string): string {
  const name = path.slice(path.lastIndexOf('/') + 1);
  const dot = name.lastIndexOf('.');
  return dot <= 0 ? '' : name.slice(dot);
}

/**
 * What the import half could not say: a producer that left its files unread,
 * and each named file in a language no producer reads, which stands with no
 * edges and so with no import reach. A test is evidence rather than terrain
 * (D4) and a shore file founds no cell (D48); neither is a missing source, so
 * neither is named here.
 */
function importMuted(files: readonly string[], scan: Scan): readonly string[] {
  const kindOf = new Map(scan.files.map((file) => [file.path, file.kind] as const));
  const unreadBy = new Map<string, string[]>();
  for (const file of files) {
    if (kindOf.get(file) !== 'other') continue;
    const extension = extensionOf(file);
    unreadBy.set(extension, [...(unreadBy.get(extension) ?? []), file]);
  }
  const languages = [...unreadBy]
    .toSorted(([a], [b]) => byPath(a, b))
    .map(([extension, named]) => {
      const kind = extension === '' ? 'files with no extension' : `${extension} files`;
      const [first = ''] = named;
      const subject = named.length === 1 ? `${first} has` : `${String(named.length)} named files have`;
      return `import: atis reads no imports from ${kind}, so ${subject} no import reach`;
    });
  const producers = (scan.unread ?? [])
    .map((unread) => `import: the ${unread.producer} producer left its files unread: ${unread.reason}`)
    .toSorted(byPath);
  return [...languages, ...producers];
}

/** The files a change to `files` reaches over the head's import edges, the named files themselves left out: they are the seam, not its ring. */
function importReach(files: readonly string[], scan: Scan, config: Config): readonly ReachByImport[] {
  const named = new Set(files);
  const changed = files.map((path): DiffFile => ({ path, kind: 'modified', added: 0, deleted: 0, hunks: [] }));
  const { modules, groups } = standingModules(scan, config);
  const { reach } = computeReach({ changed, modules, groups, headEdges: scan.edges, baseEdges: scan.edges });
  return reach.filter((entry) => !named.has(entry.path)).map((entry) => ({ path: entry.path, by: 'import', hops: entry.hops, via: entry.via }));
}

/** Whether pair `a` says more than pair `b` of the same file: the higher rate, then the higher support, then the named file that sorts first. */
function stronger(a: Cochange, b: Cochange): boolean {
  if (a.rate !== b.rate) return a.rate > b.rate;
  if (a.support !== b.support) return a.support > b.support;
  return a.a < b.a;
}

/**
 * The files that move with `files` often enough to matter: every pair at or
 * over the ghost thresholds whose other end still stands at the head and is
 * not itself named, one entry a file, from the named file it moves with most.
 */
function cochangeReach(files: readonly string[], scan: Scan, commits: readonly Commit[], config: Config): readonly ReachByCochange[] {
  const named = new Set(files);
  const standing = new Set(scan.files.map((file) => file.path));
  const { cochange_rate, cochange_support } = config.notices;
  const best = new Map<string, Cochange>();
  for (const pair of computeHistory(commits, new Map(), files, 0).cochange) {
    if (named.has(pair.b) || !standing.has(pair.b)) continue;
    if (pair.rate < cochange_rate || pair.support < cochange_support) continue;
    const held = best.get(pair.b);
    if (held === undefined || stronger(pair, held)) best.set(pair.b, pair);
  }
  return [...best.values()].map((pair) => ({ path: pair.b, by: 'cochange', rate: round(pair.rate), support: pair.support, with: pair.a }));
}

/**
 * The reach a change to `paths` would have at the head `scan` was taken at.
 * `paths` are repository paths as asked, already held inside the repository
 * by the caller; a `dir/` stands for the files under it, and a path that
 * names nothing at the head is a new file, listed in `new` with no reach of
 * its own, since nothing imports it yet and no commit has touched it.
 * `commits` is the log window read back from the head, newest first.
 */
export function reachFrom(paths: readonly string[], scan: Scan, commits: readonly Commit[], options: ReachFromOptions): ReachAnswer {
  const config = options.config ?? DEFAULT_CONFIG;
  const { files, fresh } = resolvePaths(paths, scan);
  const muted = options.cochange_muted;
  const reach: readonly ReachedFile[] = [
    ...importReach(files, scan, config),
    ...(muted === undefined ? cochangeReach(files, scan, commits, config) : []),
  ].toSorted((a, b) => byPath(a.path, b.path) || byPath(a.by, b.by));
  return {
    schema_version: REACH_SCHEMA_VERSION,
    kind: REACH_KIND,
    head: options.head,
    paths: [...new Set(paths)],
    new: fresh,
    reach,
    muted: [...(muted === undefined ? [] : [`cochange: ${muted}`]), ...importMuted(files, scan)],
  };
}
