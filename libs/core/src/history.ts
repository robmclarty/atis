/**
 * history: churn, age, bug-fix rate and co-change over the git log window
 * (§5.1, CHID). No author field reaches this module or leaves it (C6); every
 * number comes from `sha`, `time`, `subject` and the per-file line counts
 * alone.
 */

import type { Cochange, Stability } from './schema.js';

const DAY_SECONDS = 86_400;
const BUGFIX = /\b(fix|bug|regression|hotfix)\b/i;

/** One file `git log --numstat` names in a commit; a binary file carries `0` for both (never faked otherwise, C2). */
export type CommitFile = { readonly path: string; readonly added: number; readonly deleted: number };

/** One commit of the log window, no author or email anywhere (C6). */
export type Commit = {
  readonly sha: string;
  readonly time: number;
  readonly subject: string;
  readonly files: readonly CommitFile[];
};

/** A changed file's history; a field is absent when the window holds no commit touching it, or its current loc is unknown (C2). */
export type FileHistory = {
  readonly path: string;
  readonly churn_ratio?: number;
  readonly age_days?: number;
  readonly bugfix_rate?: number;
};

/** A file's stability, for every path the window saw, changed or not (D149). */
export type FileStability = Stability & { readonly path: string };

export type HistoryResult = {
  readonly window_commits: number;
  readonly files: readonly FileHistory[];
  readonly stability: readonly FileStability[];
  readonly cochange: readonly Cochange[];
};

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

type PathStats = { changedLines: number; commitCount: number; bugfixCount: number; firstTime: number };

/** The window's added and deleted lines over the file's current size, absent where that size is unknown or zero (C2). */
function churnOf(entry: PathStats, currentLoc: number | undefined): { readonly churn_ratio?: number } {
  return currentLoc === undefined || currentLoc === 0 ? {} : { churn_ratio: entry.changedLines / currentLoc };
}

/** Whole days from the window's first commit touching the file to the head. */
function ageOf(entry: PathStats, headTime: number): number {
  return Math.floor((headTime - entry.firstTime) / DAY_SECONDS);
}

/**
 * Churn ratio, age and bug-fix rate for every `changed` path (D8); the age
 * and churn ratio again as the stability of every path the window saw,
 * changed or not (D149), from the same counts; and, per
 * CHID eq. 3, one directional co-change pair `{ a, b, rate, support }` for
 * every other file a changed file shares a commit with: `support` counts the
 * shared commits and `rate` divides it by how often `a` itself was touched in
 * the window. `loc` is each path's current line count, the churn ratio's
 * denominator; `headTime` and every commit `time` are unix seconds.
 */
export function computeHistory(
  commits: readonly Commit[],
  loc: ReadonlyMap<string, number>,
  changed: readonly string[],
  headTime: number,
): HistoryResult {
  const stats = new Map<string, PathStats>();
  const cochangeCounts = new Map<string, Map<string, number>>();
  const changedSet = new Set(changed);

  for (const commit of commits) {
    const isBugfix = BUGFIX.test(commit.subject);
    const paths = new Set(commit.files.map((file) => file.path));
    for (const file of commit.files) {
      const entry = stats.get(file.path) ?? { changedLines: 0, commitCount: 0, bugfixCount: 0, firstTime: commit.time };
      entry.changedLines += file.added + file.deleted;
      entry.commitCount += 1;
      if (isBugfix) entry.bugfixCount += 1;
      entry.firstTime = Math.min(entry.firstTime, commit.time);
      stats.set(file.path, entry);
    }
    for (const a of paths) {
      if (!changedSet.has(a)) continue;
      const targets = cochangeCounts.get(a) ?? new Map<string, number>();
      for (const b of paths) {
        if (b !== a) targets.set(b, (targets.get(b) ?? 0) + 1);
      }
      cochangeCounts.set(a, targets);
    }
  }

  const files = [...changedSet].toSorted(byPath).map((path): FileHistory => {
    const entry = stats.get(path);
    if (entry === undefined) return { path };
    return {
      path,
      ...churnOf(entry, loc.get(path)),
      age_days: ageOf(entry, headTime),
      bugfix_rate: entry.bugfixCount / entry.commitCount,
    };
  });

  const stability = [...stats.entries()]
    .toSorted(([a], [b]) => byPath(a, b))
    .map(([path, entry]): FileStability => ({ path, age_days: ageOf(entry, headTime), ...churnOf(entry, loc.get(path)) }));

  const cochange: Cochange[] = [...cochangeCounts.entries()]
    .flatMap(([a, targets]) => {
      const occurrences = stats.get(a)?.commitCount ?? 0;
      return [...targets.entries()].map(([b, support]) => ({ a, b, rate: support / occurrences, support }));
    })
    .toSorted((x, y) => byPath(x.a, y.a) || byPath(x.b, y.b));

  return { window_commits: commits.length, files, stability, cochange };
}
