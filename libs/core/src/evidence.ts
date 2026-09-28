/**
 * evidence: membrane integrity and the flight category (§5.2, §5.3).
 *
 * Evidence is what the check run knows about the lines this change touched:
 * which of its changed executable lines the tests covered, which mutants
 * survived on them, and which test files stitch it to a result. The category
 * is the one word the map opens with, and D27 fixes the numbers §5.3 names
 * only in words.
 *
 * Both read the artifacts the CLI's `readCheck` gathers, whose shape is
 * declared here rather than beside the reader because core cannot import the
 * CLI (C1): core owns the contract and the reader conforms to it, the way
 * `history.ts` owns `Commit`. A channel the run did not produce is absent,
 * never a default (C2).
 */

import type { Config } from './config.js';
import { classifyFile } from './modules.js';
import type { ImportEdge, Modules } from './modules.js';
import { computeReach } from './reach.js';
import type { ReachInputs } from './reach.js';
import type {
  ChangedFile,
  CheckSlot,
  Checks,
  Evidence,
  FallowSchemas,
  FlightCategory,
  Hunk,
  Mutant,
  PatchCoverage,
  Stitch,
} from './schema.js';

/** One slot as `.check/summary.json` (schema 1) records it. */
export type CheckSummarySlot = { readonly name: string; readonly ok: boolean; readonly skipped: boolean };

export type CheckSummary = {
  readonly ok: boolean;
  readonly checks_run: number;
  readonly timestamp: string;
  readonly total_duration_ms: number;
  readonly checks: readonly CheckSummarySlot[];
};

export type HealthFileScore = {
  readonly path: string;
  readonly fan_in?: number;
  readonly fan_out?: number;
  readonly lines: number;
  readonly function_count: number;
  readonly maintainability_index: number;
  readonly crap_max: number;
};

export type HealthFinding = { readonly path: string; readonly exceeded: string };

export type Health = {
  readonly file_scores: readonly HealthFileScore[];
  readonly findings: readonly HealthFinding[];
  readonly fan_in_p95?: number;
};

/** fallow's `dead.json` findings, kept as they were read: atis takes the paths they name and nothing else. */
export type Dead = {
  readonly circular_dependencies: readonly unknown[];
  readonly re_export_cycles: readonly unknown[];
  readonly boundary_violations: readonly unknown[];
  readonly unused_exports: readonly unknown[];
};

export type Dupes = { readonly clone_families: readonly unknown[] };

export type CoverageStatement = { readonly line: number; readonly hits: number };
export type CoverageFile = { readonly path: string; readonly statements: readonly CoverageStatement[] };
export type Coverage = readonly CoverageFile[];

/** One mutant as `mutation.json` reports it, before it is joined to a changed line. */
export type ReportedMutant = { readonly line: number; readonly status: string };
export type MutationFile = { readonly path: string; readonly mutants: readonly ReportedMutant[] };
export type Mutation = readonly MutationFile[];

export type TestResult = { readonly path: string; readonly status: string };
export type TestReport = { readonly results: readonly TestResult[] };

export type Security = { readonly vulnerabilities: Readonly<Record<string, number>> };

/** One finding a lint or struct tool reports, kept to the file it names and the severity the tool gave it. */
export type ReportedFinding = { readonly path: string; readonly severity: string };

/** oxlint's `lint.json`: its diagnostics. */
export type Lint = { readonly diagnostics: readonly ReportedFinding[] };

/** ast-grep's `struct.json`: its matches. */
export type Struct = { readonly matches: readonly ReportedFinding[] };

/** A channel muted for staleness: its slot ran, but the raw file predates the run window (D41). */
export type StaleChannel = { readonly slot: string; readonly file: string; readonly age_ms: number };

/** Everything a trusted `.check/` yielded, or the reason there is nothing to trust (D41). */
export type CheckArtifacts =
  | { readonly mode: 'git-only'; readonly reason: string }
  | {
      readonly mode: 'check';
      readonly summary: CheckSummary;
      readonly fallow_schemas: FallowSchemas;
      readonly stale: readonly StaleChannel[];
      readonly health?: Health;
      readonly dead?: Dead;
      readonly dupes?: Dupes;
      readonly coverage?: Coverage;
      readonly mutation?: Mutation;
      readonly test?: TestReport;
      readonly security?: Security;
      readonly lint?: Lint;
      readonly struct?: Struct;
    };

type RanCheck = Extract<CheckArtifacts, { mode: 'check' }>;

/**
 * The `reason` a `git-only` read carries when `summary.json` claimed schema 1
 * and then failed its shape. That is a broken harness rather than an absent
 * one, so it is the one `git-only` reason that lands LIFR instead of NOINST
 * (D41, D27).
 */
export const HARNESS_BROKEN = 'harness_broken';

/** The status a stitch carries when the test report never names the test file: not run is not a pass (C2). */
export const UNKNOWN_STATUS = 'unknown';

/** Stryker's two live outcomes: a mutant that survived the suite, and one no test even reached. */
const LIVE_MUTANTS: ReadonlySet<string> = new Set(['survived', 'nocoverage']);

/** Vitest's one failing outcome; a pending or skipped result is not what makes the slot red. */
const FAILED = 'failed';

/** oxlint's and ast-grep's failing severity; a warning fails the slot only when the run denies warnings. */
const ERROR = 'error';

const GLOBAL = 'global';

/** Fallow names a finding's files under these keys directly: `path` and `file` on a location, the two ends of a boundary violation. */
const PATH_KEYS = ['path', 'file', 'from_path', 'to_path'];

/** And under these as lists: `files` on a circular dependency, a re-export cycle and a clone family. */
const PATH_LIST_KEYS = ['files', 'paths', 'cycle', 'shared_files'];

/** And under these as nested records: a cycle's `edges`, a clone family's `groups` and their `instances`. */
const NESTED_KEYS = ['edges', 'groups', 'instances'];

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sortUnique(paths: readonly string[]): readonly string[] {
  return [...new Set(paths)].toSorted(byPath);
}

/**
 * Evidence asks reach's question once more per changed file, because D27's
 * *high reach* is measured per file while `weather.reach` is the union over
 * the whole change. It reuses `computeReach` rather than walking again, so
 * D5's hop rules keep exactly one implementation.
 */
export type EvidenceInputs = Omit<ReachInputs, 'changed'> & {
  /** The placed changed set `computeReach` returned: keyed by head path, each on one cell or one group (D40, D48). */
  readonly changed: readonly ChangedFile[];
  readonly check: CheckArtifacts;
};

/** What the evidence knows about one changed file; §5.3 reads it for the category and §5.4 for the notices. */
export type FileEvidence = {
  readonly path: string;
  /** Absent when the coverage report never names the file: unmeasured is not covered (C2). */
  readonly coverage?: PatchCoverage;
  /** Survived and no-coverage mutants on this file's changed lines; empty when the channel is muted. */
  readonly mutants: readonly Mutant[];
  /** The cells this one file's reach touches, its own included: D27's *high reach* input. */
  readonly cells_reached: number;
  /** D27's *escaped interface*: a changed barrel that a file outside its cell imports. */
  readonly escaped_interface: boolean;
};

export type EvidenceResult = {
  /** `weather.evidence`: a key is absent when its channel is missing or muted (C2). */
  readonly evidence: Evidence;
  /** One entry per changed file, sorted by path (C3). */
  readonly files: readonly FileEvidence[];
};

/** Every head-side line this change wrote; a deleted file has none, so nothing joins to it. */
function hunkLines(hunks: readonly Hunk[]): ReadonlySet<number> {
  const lines = new Set<number>();
  for (const { start, count } of hunks) {
    for (let line = start; line < start + count; line += 1) lines.add(line);
  }
  return lines;
}

/**
 * Patch coverage for one file: the statements whose start line falls in a
 * head-side hunk, folded onto lines the way istanbul folds them, where a
 * line's hit count is the highest of the statements starting on it. So a line
 * several statements share counts as covered when any of them ran, and
 * `changed_executable` counts lines rather than statements, which is what the
 * closed fraction of the membrane is drawn from.
 */
function patchCoverage(path: string, changedLines: ReadonlySet<number>, file: CoverageFile): PatchCoverage {
  const hits = new Map<number, number>();
  for (const statement of file.statements) {
    if (!changedLines.has(statement.line)) continue;
    hits.set(statement.line, Math.max(hits.get(statement.line) ?? 0, statement.hits));
  }
  const uncovered = [...hits].filter(([, count]) => count === 0).map(([line]) => line);
  return {
    path,
    changed_executable: hits.size,
    covered: hits.size - uncovered.length,
    uncovered_lines: uncovered.toSorted((a, b) => a - b),
  };
}

/**
 * The mutants still alive on this file's changed lines. Mutation is joined to
 * the hunks rather than to the covered lines, so the channel still reports
 * when coverage is missing: the two are separate instruments (C2).
 */
function liveMutants(path: string, changedLines: ReadonlySet<number>, file: MutationFile): readonly Mutant[] {
  return file.mutants
    .filter((mutant) => changedLines.has(mutant.line) && LIVE_MUTANTS.has(mutant.status.toLowerCase()))
    .map((mutant): Mutant => ({ path, line: mutant.line, status: mutant.status }))
    .toSorted((a, b) => a.line - b.line || byPath(a.status, b.status));
}

/** The innermost cell each terrain file lives in; a test file and a shore file have none (D4, D48). */
function indexCells(modules: Modules): ReadonlyMap<string, string> {
  return new Map(modules.organelles.map((organelle) => [organelle.path, organelle.cell]));
}

function reachInputsFor(inputs: EvidenceInputs, file: ChangedFile): ReachInputs {
  return {
    changed: [file],
    modules: inputs.modules,
    groups: inputs.groups,
    headEdges: inputs.headEdges,
    baseEdges: inputs.baseEdges,
  };
}

/** How many cells one changed file's reach touches, its own included; a shore or test file is not terrain and touches none. */
function cellsReached(file: ChangedFile, inputs: EvidenceInputs): number {
  if (file.cell === undefined) return 0;
  const { reach } = computeReach(reachInputsFor(inputs, file));
  return new Set(reach.map((entry) => entry.cell)).size;
}

/**
 * A changed barrel that something outside its cell imports: D27's *escaped
 * interface*. "Outside" is measured the way D45 measures a hop, by innermost
 * cell, and a test importer is evidence rather than a consumer (D4).
 */
function escapedInterface(file: ChangedFile, cells: ReadonlyMap<string, string>, edges: readonly ImportEdge[]): boolean {
  if (!file.is_barrel) return false;
  const home = cells.get(file.path);
  return edges.some(({ from, to }) => to === file.path && cells.has(from) && cells.get(from) !== home);
}

/**
 * Every test file that imports a changed file, joined to its result. A test
 * the report does not name did not run in this check, which is `unknown`
 * rather than a pass (C2). A deleted file is stitched through the base graph,
 * where the tests that still imported it live, exactly as reach walks it
 * (D39).
 */
function stitchesFor(inputs: EvidenceInputs, report: TestReport): readonly Stitch[] {
  const deleted = new Set(inputs.changed.filter((file) => file.kind === 'deleted').map((file) => file.path));
  const changed = new Set(inputs.changed.map((file) => file.path));
  const targets = new Map<string, string[]>();

  const collect = (edges: readonly ImportEdge[], wantDeleted: boolean): void => {
    for (const { from, to } of edges) {
      if (!changed.has(to) || deleted.has(to) !== wantDeleted || classifyFile(from) !== 'test') continue;
      const list = targets.get(from) ?? [];
      if (!list.includes(to)) list.push(to);
      targets.set(from, list);
    }
  };
  collect(inputs.headEdges, false);
  collect(inputs.baseEdges, true);

  const status = new Map(report.results.map((result) => [result.path, result.status]));
  return [...targets]
    .map(([test, paths]): Stitch => ({
      test,
      targets: paths.toSorted(byPath),
      status: status.get(test) ?? UNKNOWN_STATUS,
    }))
    .toSorted((a, b) => byPath(a.test, b.test));
}

/**
 * The evidence for the change: per file the coverage of its changed lines and
 * the mutants alive on them, and across the change the stitches that tie it to
 * the test run. `weather.evidence` carries a channel only when the run
 * produced it, so a map with no coverage says nothing about coverage rather
 * than saying zero (C2).
 */
export function computeEvidence(inputs: EvidenceInputs): EvidenceResult {
  const check = inputs.check.mode === 'check' ? inputs.check : undefined;
  const coverageOf = new Map((check?.coverage ?? []).map((file) => [file.path, file]));
  const mutationOf = new Map((check?.mutation ?? []).map((file) => [file.path, file]));
  const cells = indexCells(inputs.modules);

  const files = inputs.changed
    .map((file): FileEvidence => {
      const changedLines = hunkLines(file.hunks);
      const coverage = coverageOf.get(file.path);
      const mutation = mutationOf.get(file.path);
      return {
        path: file.path,
        ...(coverage === undefined ? {} : { coverage: patchCoverage(file.path, changedLines, coverage) }),
        mutants: mutation === undefined ? [] : liveMutants(file.path, changedLines, mutation),
        cells_reached: cellsReached(file, inputs),
        escaped_interface: escapedInterface(file, cells, inputs.headEdges),
      };
    })
    .toSorted((a, b) => byPath(a.path, b.path));

  return {
    evidence: {
      ...(check?.coverage === undefined
        ? {}
        : { patch_coverage: files.flatMap((file) => (file.coverage === undefined ? [] : [file.coverage])) }),
      ...(check?.mutation === undefined ? {} : { mutants: files.flatMap((file) => file.mutants) }),
      ...(check?.test === undefined ? {} : { stitches: stitchesFor(inputs, check.test) }),
    },
    files,
  };
}

export type CategoryInputs = {
  readonly check: CheckArtifacts;
  readonly changed: readonly ChangedFile[];
  /** `computeEvidence`'s per-file result: the gaps, the reach and the escaped interfaces D27 counts. */
  readonly files: readonly FileEvidence[];
  /** `computeEvidence`'s stitches, empty when the run had no test report: a torn one puts a red `test` on the change (D67). */
  readonly stitches: readonly Stitch[];
  readonly config: Config;
};

/**
 * One red slot as D67 splits it: the changed files it is on the change
 * through, and every other file it names, which is standing state. A global
 * slot names no file at all, so its red is standing state whole.
 */
export type RedSlot = {
  readonly name: string;
  readonly global: boolean;
  /** The changed files the slot names, and for `test` the changed files each torn stitch it names imports; sorted (C3). */
  readonly change: readonly string[];
  /** Every other file the slot names; sorted (C3), and empty on a global slot. */
  readonly standing: readonly string[];
};

/** The red slots, each in exactly one list, both in name order (C3). */
export type RedSplit = {
  /** The change's red: every slot with at least one changed file behind it. */
  readonly change: readonly RedSlot[];
  /** The standing state: every global slot, and every slot that names no changed file. */
  readonly standing: readonly RedSlot[];
};

/** What the split reads, all of it on `map.json`, so a renderer can make the same split the category did. */
export type RedSplitInputs = {
  readonly slots: readonly CheckSlot[];
  /** The changed set; the split reads only its paths. */
  readonly changed: readonly Pick<ChangedFile, 'path'>[];
  readonly stitches: readonly Stitch[];
};

/**
 * The files one fallow finding names. Fallow puts them under a small fixed set
 * of keys: `files` and `edges[].path` on a circular dependency, `from_path`
 * and `to_path` on a boundary violation, `files` and
 * `groups[].instances[].file` on a clone family, `path` on an unused export.
 * Reading those keys is D41's "read by key, never reject on the number"
 * applied to the findings themselves: a finding shape atis does not know names
 * nothing, and its slot falls back to `global` rather than to a guess.
 */
export function pathsOf(finding: unknown): readonly string[] {
  if (!isRecord(finding)) return [];
  const paths: string[] = [];
  for (const key of PATH_KEYS) {
    const value = finding[key];
    if (typeof value === 'string') paths.push(value);
  }
  for (const key of PATH_LIST_KEYS) {
    const value = finding[key];
    if (Array.isArray(value)) paths.push(...value.filter((entry): entry is string => typeof entry === 'string'));
  }
  for (const key of NESTED_KEYS) {
    const value = finding[key];
    if (Array.isArray(value)) paths.push(...value.flatMap(pathsOf));
  }
  return paths;
}

/** The findings that are a cycle or a boundary violation, which is what §5.3 calls LIFR when one touches the change. */
export function structuralFindings(dead: Dead | undefined): readonly unknown[] {
  if (dead === undefined) return [];
  return [...dead.circular_dependencies, ...dead.re_export_cycles, ...dead.boundary_violations];
}

/**
 * The files a red lint or struct slot names: the ones carrying an error,
 * because an error is what fails the slot. A red slot with no error among its
 * findings was failed by its warnings (a run that denies them), so then every
 * finding names its file.
 */
function failingPaths(findings: readonly ReportedFinding[]): readonly string[] {
  const errors = findings.filter((finding) => finding.severity === ERROR);
  return sortUnique((errors.length === 0 ? findings : errors).map((finding) => finding.path));
}

/** The paths a red slot's own raw output names, for the six slots whose output is about files (D27, D67). */
function namedPaths(slot: string, check: RanCheck): readonly string[] {
  if (slot === 'test') {
    return sortUnique((check.test?.results ?? []).filter((result) => result.status === FAILED).map((result) => result.path));
  }
  if (slot === 'health') return sortUnique((check.health?.findings ?? []).map((finding) => finding.path));
  if (slot === 'dead') {
    return sortUnique([...structuralFindings(check.dead), ...(check.dead?.unused_exports ?? [])].flatMap(pathsOf));
  }
  if (slot === 'dupes') return sortUnique((check.dupes?.clone_families ?? []).flatMap(pathsOf));
  if (slot === 'lint') return failingPaths(check.lint?.diagnostics ?? []);
  if (slot === 'struct') return failingPaths(check.struct?.matches ?? []);
  return [];
}

/** A red slot is scoped to the paths its output names; every other slot, and one that named none, is global (D27, D67). */
function scopeOf(slot: CheckSummarySlot, check: RanCheck): CheckSlot['scope'] {
  if (slot.ok || slot.skipped) return GLOBAL;
  const paths = namedPaths(slot.name, check);
  return paths.length === 0 ? GLOBAL : paths;
}

function scopedSlots(check: RanCheck): readonly CheckSlot[] {
  return check.summary.checks
    .map((slot): CheckSlot => ({ name: slot.name, ok: slot.ok, skipped: slot.skipped, scope: scopeOf(slot, check) }))
    .toSorted((a, b) => byPath(a.name, b.name));
}

function isRed(slot: CheckSlot): boolean {
  return !slot.ok && !slot.skipped;
}

/**
 * D67's split of the red slots into the change's red and the standing state.
 * A slot is on the change through each changed file it names, and `test` also
 * through each failing test it names that imports a changed file, which is a
 * torn stitch (D4): the test is not the change, but the files it tore on are.
 * Every other file a slot names, and every global slot, is standing state.
 * The category, the notices and the render all read this one split.
 */
export function splitRedSlots(inputs: RedSplitInputs): RedSplit {
  const changed = new Set(inputs.changed.map((file) => file.path));
  const torn = new Map(
    inputs.stitches
      .filter((stitch) => stitch.status === FAILED)
      .map((stitch) => [stitch.test, stitch.targets.filter((target) => changed.has(target))] as const),
  );

  const slots = inputs.slots
    .filter(isRed)
    .toSorted((a, b) => byPath(a.name, b.name))
    .map((slot): RedSlot => {
      if (slot.scope === GLOBAL) return { name: slot.name, global: true, change: [], standing: [] };
      const through = (path: string): readonly string[] => [
        ...(changed.has(path) ? [path] : []),
        ...(slot.name === 'test' ? (torn.get(path) ?? []) : []),
      ];
      return {
        name: slot.name,
        global: false,
        change: sortUnique(slot.scope.flatMap(through)),
        standing: sortUnique(slot.scope.filter((path) => through(path).length === 0)),
      };
    });

  return {
    change: slots.filter((slot) => slot.change.length > 0),
    standing: slots.filter((slot) => slot.change.length === 0),
  };
}

/** A gap: a changed file with at least one uncovered changed executable line (D27). */
function hasGap(file: FileEvidence): boolean {
  return file.coverage !== undefined && file.coverage.uncovered_lines.length > 0;
}

/**
 * §5.3's ladder with D27's numbers, worst rung first. A vacuous green (no
 * check ran at all) and a cycle or boundary violation on a file this change
 * touched are the two things that make a green summary worse than no summary.
 * A red slot is IFR only when it is the change's red (D69): standing state
 * leaves the category to the change's own evidence.
 */
function categoryOf(inputs: CategoryInputs, check: RanCheck, slots: readonly CheckSlot[]): FlightCategory {
  const changed = new Set(inputs.changed.map((file) => file.path));
  const highReach = inputs.config.category.high_reach_cells;
  const red = splitRedSlots({ slots, changed: inputs.changed, stitches: inputs.stitches });

  if (check.summary.checks_run === 0) return 'LIFR';
  if (structuralFindings(check.dead).some((finding) => pathsOf(finding).some((path) => changed.has(path)))) return 'LIFR';
  if (red.change.length > 0) return 'IFR';
  if (inputs.files.some((file) => hasGap(file) && file.cells_reached >= highReach)) return 'IFR';
  if (inputs.files.some((file) => hasGap(file) || file.escaped_interface)) return 'MVFR';
  return 'VFR';
}

/**
 * The verdict block of `weather`: the flight category of §5.3, the slots the
 * run reports and the paths each red one names. No `.check/` is NOINST and
 * never green (D27); a `summary.json` that claimed schema 1 and then failed
 * its shape is a broken harness, which is LIFR.
 */
export function computeCategory(inputs: CategoryInputs): Checks {
  const { check } = inputs;
  if (check.mode === 'git-only') {
    return {
      category: check.reason === HARNESS_BROKEN ? 'LIFR' : 'NOINST',
      checks_run: 0,
      reason: check.reason,
      slots: [],
    };
  }

  const slots = scopedSlots(check);
  return {
    category: categoryOf(inputs, check, slots),
    checks_run: check.summary.checks_run,
    timestamp: check.summary.timestamp,
    slots,
  };
}
