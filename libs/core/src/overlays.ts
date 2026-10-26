/**
 * overlays: the whole repository's state at one commit (§8, D101).
 *
 * A `repo` map has no change to draw, so in place of weather it carries
 * overlays over the commit's own terrain: trouble spots (churn × complexity),
 * ugly spots (thresholds and maintainability), coverage gaps, dead code,
 * duplication, cycles, recent heat over the newest commits, and the findings
 * checkride's committed baseline grandfathers, drawn muted (D49). Each reads
 * one source: git's log, a channel of `.check/`, or the baseline beside one.
 * An overlay whose source is missing is absent, and `muted` says why (C2).
 *
 * A baselined finding is found the one way checkride's contract allows: its
 * keys are compared and counted, never parsed. Each fallow finding is keyed
 * as checkride's fallow parser keys it, and it is baselined when the baseline
 * holds its key for every finding that shares it. A key built otherwise than
 * checkride builds it matches nothing, so its finding reads as new rather
 * than muted, the loud side of the mistake (C2).
 */

import type { OverlayConfig } from './config.js';
import { pathsOf, rulesOf } from './evidence.js';
import type { CheckArtifacts, CodeSpan, Coverage, Dead, Dupes, Health, HealthFinding } from './evidence.js';
import type { Commit } from './history.js';
import type {
  Breach,
  BaselinedFinding,
  BaselinedKind,
  CloneFamily,
  CoverageGap,
  Cycle,
  DeadCode,
  OverlayName,
  Overlays,
  RecentHeat,
  TroubleSpot,
  UglySpot,
} from './schema.js';

/**
 * checkride's committed `checkride.baseline.json`, read (D49): each check's
 * grandfathered keys, and how many findings a key grandfathers where the
 * capture counted them; or why there is no baseline to read.
 */
export type CheckBaseline =
  | {
      readonly slots: Readonly<Record<string, readonly string[]>>;
      readonly counts?: Readonly<Record<string, Readonly<Record<string, number>>>>;
    }
  | { readonly reason: string };

export type OverlayInputs = {
  /** Every file the map draws an overlay on: its organelles and its shore's files, never a test, which has no place (D4). */
  readonly placed: ReadonlySet<string>;
  /** The terrain's files, each with the code spans the scan read in it, none where it read none (D141). */
  readonly terrain: ReadonlyMap<string, readonly CodeSpan[]>;
  /** The log window at the commit, newest first (D8). */
  readonly commits: readonly Commit[];
  /** `.check/`, with its coverage set aside where the report names none of the tree (D122). */
  readonly check: CheckArtifacts;
  /** Whether `check`'s coverage was set aside for naming none of the tree (D122). */
  readonly coverage_unnamed: boolean;
  readonly baseline: CheckBaseline;
  readonly config: OverlayConfig;
};

/** One overlay as read, or why it could not be. */
type Read<T> = { readonly value: T } | { readonly reason: string };

type RanCheck = Extract<CheckArtifacts, { mode: 'check' }>;

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function sortUnique(paths: readonly string[]): readonly string[] {
  return [...new Set(paths)].toSorted(byPath);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A field as a trimmed string, `''` where it is missing or no string, as checkride reads one. */
function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Why a channel of `.check/` was not read: no trusted `.check/` at all, a
 * slot that never ran, or a file that was stale or missing (D41).
 */
function unread(check: CheckArtifacts, slot: string, file: string): string {
  if (check.mode === 'git-only') return check.reason;
  const ran = check.summary.checks.find((entry) => entry.name === slot);
  if (ran === undefined) return `.check/ ran no ${slot} slot`;
  if (ran.skipped) return `the ${slot} slot was skipped`;
  if (check.stale.some((stale) => stale.file === file)) return `.check/${file} is stale`;
  return `.check/${file} is missing or unreadable`;
}

/** A channel of a trusted `.check/`, or why it is not there to read. */
function readChannel<T>(check: CheckArtifacts, slot: string, file: string, pick: (ran: RanCheck) => T | undefined): Read<T> {
  const value = check.mode === 'check' ? pick(check) : undefined;
  return value === undefined ? { reason: unread(check, slot, file) } : { value };
}

/** An overlay drawn from a read source, or the source's reason carried on. */
function from<T, U>(read: Read<T>, by: (value: T) => Read<U>): Read<U> {
  return 'reason' in read ? read : by(read.value);
}

/** How many of `commits` touched each file, a commit counted once per file. */
function commitCounts(commits: readonly Commit[]): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const commit of commits) {
    for (const path of new Set(commit.files.map((file) => file.path))) counts.set(path, (counts.get(path) ?? 0) + 1);
  }
  return counts;
}

// ---------------------------------------------------------------------------
// trouble spots, ugly spots and coverage gaps: one entry per file
// ---------------------------------------------------------------------------

/**
 * Churn × complexity (§8): each file the window's commits touched and fallow
 * gives a total cyclomatic complexity, the product scored against the
 * repository's largest. A health report that totals no file's complexity
 * cannot say which spots are complex, so it gives no overlay (C2).
 */
function troubleSpots(health: Health, commits: readonly Commit[], placed: ReadonlySet<string>): Read<readonly TroubleSpot[]> {
  if (!health.file_scores.some((score) => score.total_cyclomatic !== undefined)) {
    return { reason: "health.json totals no file's cyclomatic complexity" };
  }
  const touched = commitCounts(commits);
  const spots = health.file_scores.flatMap((score) => {
    const count = touched.get(score.path) ?? 0;
    const complexity = score.total_cyclomatic ?? 0;
    return placed.has(score.path) && count > 0 && complexity > 0 ? [{ path: score.path, commits: count, complexity }] : [];
  });
  const worst = spots.reduce((most, spot) => Math.max(most, spot.commits * spot.complexity), 0);
  return { value: spots.map((spot) => ({ ...spot, score: (spot.commits * spot.complexity) / worst })).toSorted((a, b) => byPath(a.path, b.path)) };
}

/** Thresholds and maintainability (§8): every file fallow scored or found a function over a threshold in, with each such function's rules. */
function uglySpots(health: Health, placed: ReadonlySet<string>): readonly UglySpot[] {
  const maintainability = new Map(health.file_scores.map((score) => [score.path, score.maintainability_index] as const));
  const breaches = new Map<string, Breach[]>();
  for (const finding of health.findings) {
    const breach: Breach = { ...(finding.name === undefined ? {} : { function: finding.name }), line: finding.line, rules: rulesOf(finding.exceeded) };
    breaches.set(finding.path, [...(breaches.get(finding.path) ?? []), breach]);
  }
  return sortUnique([...maintainability.keys(), ...breaches.keys()])
    .filter((path) => placed.has(path))
    .map((path): UglySpot => {
      const index = maintainability.get(path);
      const own = (breaches.get(path) ?? []).toSorted((a, b) => a.line - b.line || byPath(a.function ?? '', b.function ?? ''));
      return { path, ...(index === undefined ? {} : { maintainability: index }), breaches: own };
    });
}

/**
 * Coverage gaps (§8): every file the report counts a statement of that never
 * ran, and every terrain file holding code that the report never names, a
 * gap of unknown size (D80, D141). A file of types alone holds no code, so it
 * is never unmeasured.
 */
function coverageGaps(coverage: Coverage, terrain: ReadonlyMap<string, readonly CodeSpan[]>, placed: ReadonlySet<string>): readonly CoverageGap[] {
  const named = new Set(coverage.map((file) => file.path));
  const measured = coverage.flatMap((file): readonly CoverageGap[] => {
    const uncovered = file.statements.filter((statement) => statement.hits === 0).length;
    return placed.has(file.path) && uncovered > 0 ? [{ path: file.path, statements: file.statements.length, uncovered }] : [];
  });
  const unmeasured = [...terrain]
    .filter(([path, spans]) => !named.has(path) && spans.length > 0)
    .map(([path]): CoverageGap => ({ path, unmeasured: true }));
  return [...measured, ...unmeasured].toSorted((a, b) => byPath(a.path, b.path));
}

// ---------------------------------------------------------------------------
// dead code, duplication and cycles: one entry per finding
// ---------------------------------------------------------------------------

/** The fields naming the declaration a member-scoped finding belongs to, in checkride's order. */
const CONTAINER_FIELDS = ['parent_name', 'component_name', 'catalog_name'];

/** The fields carrying a finding's own symbol, in checkride's order. */
const SYMBOL_FIELDS = [
  'export_name',
  'name',
  'type_name',
  'member',
  'member_name',
  'prop_name',
  'emit_name',
  'input_name',
  'output_name',
  'event_name',
  'entry_name',
  'action_name',
  'key_name',
  'package_name',
  'dependency',
  'specifier',
];

function firstField(item: Record<string, unknown>, fields: readonly string[]): string {
  for (const field of fields) {
    const value = str(item[field]);
    if (value !== '') return value;
  }
  return '';
}

/** A finding's symbol as checkride names it: `<container>.<leaf>`, or whichever half it carries, or `''`. */
function symbolOf(item: Record<string, unknown>): string {
  return [firstField(item, CONTAINER_FIELDS), firstField(item, SYMBOL_FIELDS)].filter((part) => part !== '').join('.');
}

/** The file one finding stands on, under `path` or `file`, or `''`. */
function fileOf(item: Record<string, unknown>): string {
  return str(item['path']) || str(item['file']);
}

/** A positive whole line, or none. */
function lineOf(item: Record<string, unknown>): number | undefined {
  const line = item['line'];
  return typeof line === 'number' && Number.isInteger(line) && line >= 1 ? line : undefined;
}

/** Dead code (§8): every file nothing imports, and every export nothing reads, by its name. */
function deadCode(dead: Dead, placed: ReadonlySet<string>): readonly DeadCode[] {
  const files = (dead.unused_files ?? []).flatMap((item): readonly DeadCode[] => {
    const path = isRecord(item) ? fileOf(item) : '';
    return placed.has(path) ? [{ path, kind: 'file' }] : [];
  });
  const exports = dead.unused_exports.flatMap((item): readonly DeadCode[] => {
    if (!isRecord(item)) return [];
    const path = fileOf(item);
    const name = symbolOf(item);
    const line = lineOf(item);
    return placed.has(path) && name !== '' ? [{ path, kind: 'export', name, ...(line === undefined ? {} : { line }) }] : [];
  });
  return [...files, ...exports].toSorted((a, b) => byPath(a.path, b.path) || byPath(a.kind, b.kind) || byPath(a.kind === 'export' ? a.name : '', b.kind === 'export' ? b.name : ''));
}

/** One clone family as fallow reported it, under the id the map numbers it by. */
type NumberedFamily = { readonly id: string; readonly files: readonly string[]; readonly family: unknown };

/**
 * The clone families, numbered. fallow names no id for a family, so the map
 * numbers them: the families sorted by their own file lists, `family-1` up,
 * which is what makes two runs over one `dupes.json` mark the same cells with
 * the same glyph (C3), and the duplication overlay name the same family as
 * the terrain's `clone_family` does.
 */
export function numberCloneFamilies(dupes: Dupes | undefined): readonly NumberedFamily[] {
  return (dupes?.clone_families ?? [])
    .map((family) => ({ family, files: sortUnique(pathsOf(family)) }))
    .filter(({ files }) => files.length > 0)
    .toSorted((a, b) => byPath(a.files.join('\n'), b.files.join('\n')))
    .map(({ family, files }, index) => ({ id: `family-${String(index + 1)}`, files, family }));
}

/** Duplication (§8): each clone family on the files the map places, with the lines it duplicates where fallow counts them. */
function duplication(dupes: Dupes, placed: ReadonlySet<string>): readonly CloneFamily[] {
  return numberCloneFamilies(dupes).flatMap(({ id, files, family }): readonly CloneFamily[] => {
    const kept = files.filter((path) => placed.has(path));
    const lines = isRecord(family) ? family['total_duplicated_lines'] : undefined;
    return kept.length === 0 ? [] : [{ id, files: kept, ...(typeof lines === 'number' ? { lines } : {}) }];
  });
}

/** A cycle's files as fallow lists them, an import cycle's in import order. */
function cycleFiles(item: unknown): readonly string[] {
  const files = isRecord(item) ? item['files'] : undefined;
  return Array.isArray(files) ? files.filter((file): file is string => typeof file === 'string') : [];
}

/** Cycles (§8): every import cycle and every cycle of re-exports, each on the files the map places. */
function cycles(dead: Dead, placed: ReadonlySet<string>): readonly Cycle[] {
  const read = (items: readonly unknown[], kind: Cycle['kind']): readonly Cycle[] =>
    items.flatMap((item): readonly Cycle[] => {
      const files = cycleFiles(item).filter((path) => placed.has(path));
      return files.length === 0 ? [] : [{ kind, files }];
    });
  return [...read(dead.circular_dependencies, 'import'), ...read(dead.re_export_cycles, 're-export')].toSorted(
    (a, b) => byPath(a.files.join('\n'), b.files.join('\n')) || byPath(a.kind, b.kind),
  );
}

/** Recent heat (§8): the newest `count` commits of the window, and how many of them touched each file the map places. */
function recentHeat(commits: readonly Commit[], count: number, placed: ReadonlySet<string>): RecentHeat {
  const recent = commits.slice(0, count);
  const files = [...commitCounts(recent)]
    .filter(([path]) => placed.has(path))
    .map(([path, touched]) => ({ path, commits: touched }))
    .toSorted((a, b) => byPath(a.path, b.path));
  return { commits: recent.length, files };
}

// ---------------------------------------------------------------------------
// the baseline: findings keyed as checkride keys them, compared, never parsed
// ---------------------------------------------------------------------------

/** A function name that is a stable identifier keys without its position; fallow's `<arrow>` and kin do not. */
const STABLE_IDENTIFIER = /^[A-Za-z_$][\w$.]*$/;

/** A script file, as against a markup file, whose `<template>` comes once to it. */
const SCRIPT_FILE = /\.[cm]?[jt]sx?$/;

/** Whether checkride keys a health finding by its name alone: a real identifier, or a unit fallow emits once to a file. */
function namedUnit(name: string, file: string): boolean {
  if (STABLE_IDENTIFIER.test(name) || name === '<component>') return true;
  return name === '<template>' && !SCRIPT_FILE.test(file);
}

/** `key`, with `:<line>[:<col>]` appended where the finding has a position, as checkride disambiguates findings that share every name. */
function positioned(key: string, line: unknown, col: unknown): string {
  const at = [line, col].filter((part): part is number => typeof part === 'number').join(':');
  return at === '' ? key : `${key}:${at}`;
}

/** An older release's key for a `<component>` or a markup `<template>`, with the position it no longer carries. */
const POSITIONAL_UNIT = /^health:(?<file>.+):(?<unit><component>|<template>)(?::\d+){1,2}$/;

/** The key a baseline's entry stands for now: checkride reads an older release's positional unit key as the name alone. */
function currentKey(key: string): string {
  const match = POSITIONAL_UNIT.exec(key);
  const file = match?.groups?.['file'] ?? '';
  const unit = match?.groups?.['unit'] ?? '';
  return match !== null && namedUnit(unit, file) ? `health:${file}:${unit}` : key;
}

/** A health finding's key: `health:<file>:<function>`, positioned for a function with no stable name. */
function healthKey(finding: HealthFinding): string {
  const name = str(finding.name);
  const key = `health:${finding.path}:${name}`;
  return namedUnit(name, finding.path) ? key : positioned(key, finding.line, finding.col);
}

/**
 * A dead-code finding's key: `dead-code:<category>:<file>:<symbol>`, the file
 * alone positioned where it names no symbol, and a cycle's sorted files
 * joined by `->`; none where the finding carries none of them.
 */
function deadKey(category: string, item: Record<string, unknown>): string | undefined {
  const file = fileOf(item);
  const symbol = symbolOf(item);
  if (symbol !== '') return `dead-code:${category}:${[file, symbol].filter((part) => part !== '').join(':')}`;
  if (file !== '') return positioned(`dead-code:${category}:${file}`, item['line'], item['col']);
  const files = cycleFiles(item)
    .map((path) => path.trim())
    .filter((path) => path !== '')
    .toSorted(byPath);
  return files.length === 0 ? undefined : `dead-code:${category}:${files.join('->')}`;
}

/** One finding a baseline may grandfather: the check its keys are under, its keys (a clone family has one per group), and what it is. */
type Candidate = { readonly slot: string; readonly keys: readonly string[]; readonly finding: BaselinedFinding };

/** The dead-code categories an overlay draws, with what a grandfathered one of each is. */
const DEAD_KINDS: readonly (readonly [keyof Dead, BaselinedKind])[] = [
  ['unused_files', 'unused-file'],
  ['unused_exports', 'unused-export'],
  ['circular_dependencies', 'cycle'],
  ['re_export_cycles', 'cycle'],
];

function deadCandidates(dead: Dead): readonly Candidate[] {
  return DEAD_KINDS.flatMap(([category, kind]) =>
    (dead[category] ?? []).flatMap((item): readonly Candidate[] => {
      if (!isRecord(item)) return [];
      const key = deadKey(category, item);
      if (key === undefined) return [];
      const files = kind === 'cycle' ? cycleFiles(item) : [fileOf(item)];
      const name = kind === 'unused-export' ? symbolOf(item) : '';
      return [{ slot: 'dead', keys: [key], finding: { kind, files, ...(name === '' ? {} : { name }) } }];
    }),
  );
}

/** A clone family's keys, one per group's fingerprint; a group with none cannot be grandfathered, so neither can its family. */
function familyCandidates(dupes: Dupes): readonly Candidate[] {
  return numberCloneFamilies(dupes).flatMap(({ id, files, family }): readonly Candidate[] => {
    const groups = isRecord(family) && Array.isArray(family['groups']) ? family['groups'] : [];
    const keys = groups.map((group: unknown) => (isRecord(group) ? str(group['fingerprint']) : ''));
    if (keys.length === 0 || keys.includes('')) return [];
    return [{ slot: 'dupes', keys: keys.map((fingerprint) => `dupes:${fingerprint}`), finding: { kind: 'clone-family', files, name: id } }];
  });
}

/**
 * The findings checkride's baseline grandfathers (D49). A key grandfathers as
 * many findings as its count, one where the check was counted and the key
 * found once, and any number where the check predates counting; when more
 * findings share a key than it grandfathers, no one of them can be told from
 * the new one, so none is muted (C2).
 */
function baselined(check: RanCheck, baseline: Exclude<CheckBaseline, { reason: string }>, placed: ReadonlySet<string>): readonly BaselinedFinding[] {
  const candidates: readonly Candidate[] = [
    ...(check.health?.findings ?? []).map((finding): Candidate => {
      const name = str(finding.name);
      return { slot: 'health', keys: [healthKey(finding)], finding: { kind: 'threshold', files: [finding.path], ...(name === '' ? {} : { name }) } };
    }),
    ...(check.dead === undefined ? [] : deadCandidates(check.dead)),
    ...(check.dupes === undefined ? [] : familyCandidates(check.dupes)),
  ];
  const found = new Map<string, number>();
  for (const { slot, keys } of candidates) {
    for (const key of keys) found.set(`${slot}\n${key}`, (found.get(`${slot}\n${key}`) ?? 0) + 1);
  }
  const held = new Map(Object.entries(baseline.slots).map(([slot, keys]) => [slot, new Set(keys.map(currentKey))] as const));
  const holds = (slot: string, key: string): boolean => {
    if (held.get(slot)?.has(key) !== true) return false;
    const counts = baseline.counts?.[slot];
    const allowed = counts === undefined ? Number.POSITIVE_INFINITY : (counts[key] ?? 1);
    return (found.get(`${slot}\n${key}`) ?? 0) <= allowed;
  };
  return candidates
    .filter(({ slot, keys }) => keys.every((key) => holds(slot, key)))
    .flatMap(({ finding }): readonly BaselinedFinding[] => {
      const files = finding.files.filter((path) => placed.has(path));
      return files.length === 0 ? [] : [{ ...finding, files }];
    })
    .toSorted((a, b) => byPath(a.files.join('\n'), b.files.join('\n')) || byPath(a.kind, b.kind) || byPath(a.name ?? '', b.name ?? ''));
}

/** The baselined overlay: the baseline and at least one of fallow's three channels to compare it with, or why not. */
function baselinedOf(check: CheckArtifacts, baseline: CheckBaseline, placed: ReadonlySet<string>): Read<readonly BaselinedFinding[]> {
  if ('reason' in baseline) return baseline;
  if (check.mode === 'git-only') return { reason: check.reason };
  if (check.health === undefined && check.dead === undefined && check.dupes === undefined) {
    return { reason: '.check/ holds none of health.json, dead.json and dupes.json to compare the baseline with' };
  }
  return { value: baselined(check, baseline, placed) };
}

/**
 * Every overlay of a `repo` map (D101), each read from its own source and
 * absent with its reason where that source is (C2).
 */
export function computeOverlays(inputs: OverlayInputs): Overlays {
  const { check, placed } = inputs;
  const health = readChannel(check, 'health', 'health.json', (ran) => ran.health);
  const dead = readChannel(check, 'dead', 'dead.json', (ran) => ran.dead);
  const coverage: Read<Coverage> = inputs.coverage_unnamed
    ? { reason: "the coverage report names none of the tree's source files" }
    : readChannel(check, 'test', 'coverage/coverage-final.json', (ran) => ran.coverage);
  const dupes = readChannel(check, 'dupes', 'dupes.json', (ran) => ran.dupes);

  const trouble = from(health, (read) => troubleSpots(read, inputs.commits, placed));
  const ugly = from(health, (read) => ({ value: uglySpots(read, placed) }));
  const gaps = from(coverage, (read) => ({ value: coverageGaps(read, inputs.terrain, placed) }));
  const unused = from(dead, (read) => ({ value: deadCode(read, placed) }));
  const families = from(dupes, (read) => ({ value: duplication(read, placed) }));
  const loops = from(dead, (read) => ({ value: cycles(read, placed) }));
  const grandfathered = baselinedOf(check, inputs.baseline, placed);

  const reads: readonly (readonly [OverlayName, Read<unknown>])[] = [
    ['trouble_spots', trouble],
    ['ugly_spots', ugly],
    ['coverage_gaps', gaps],
    ['dead_code', unused],
    ['duplication', families],
    ['cycles', loops],
    ['baselined', grandfathered],
  ];
  const muted = reads.flatMap(([name, read]) => ('reason' in read ? [`${name}: ${read.reason}`] : [])).toSorted(byPath);
  return {
    ...('value' in trouble ? { trouble_spots: trouble.value } : {}),
    ...('value' in ugly ? { ugly_spots: ugly.value } : {}),
    ...('value' in gaps ? { coverage_gaps: gaps.value } : {}),
    ...('value' in unused ? { dead_code: unused.value } : {}),
    ...('value' in families ? { duplication: families.value } : {}),
    ...('value' in loops ? { cycles: loops.value } : {}),
    // The log is never missing: a repository has at least the commit it is mapped at.
    recent_heat: recentHeat(inputs.commits, inputs.config.heat_commits, placed),
    ...('value' in grandfathered ? { baselined: grandfathered.value } : {}),
    ...(muted.length === 0 ? {} : { muted }),
  };
}
