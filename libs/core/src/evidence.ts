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
import { computeCellsReached } from './reach.js';
import type { DiffFile, ReachInputs } from './reach.js';
import type {
  ChangedFile,
  CheckSlot,
  Checks,
  DepAdded,
  DepMoved,
  Evidence,
  FallowSchemas,
  FileHealthDelta,
  FlightCategory,
  HealthDelta,
  Hunk,
  Improvement,
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
  /** The sum of its functions' cyclomatic complexity, where fallow gives it: a trouble spot's complexity (D101). */
  readonly total_cyclomatic?: number;
};

/**
 * One function over a threshold: its file, the rule it broke, and the
 * `line_count` lines it spans from `line` at head (D73). Its name and its
 * measures, where fallow gives them, are what match it to its base self and
 * tell whether the change made it worse (D98).
 */
export type HealthFinding = {
  readonly path: string;
  readonly exceeded: string;
  readonly line: number;
  /** The column it starts at, as fallow writes it, which keys an unnamed function in checkride's baseline (D49). */
  readonly col?: number;
  readonly line_count: number;
  readonly name?: string;
  readonly cyclomatic?: number;
  readonly cognitive?: number;
  readonly crap?: number;
};

export type Health = {
  readonly file_scores: readonly HealthFileScore[];
  readonly findings: readonly HealthFinding[];
  readonly fan_in_p95?: number;
};

/** fallow's `dead.json` findings, kept as they were read: atis takes the paths they name and the lines they stand on, by key, and nothing else (D140). */
export type Dead = {
  readonly circular_dependencies: readonly unknown[];
  readonly re_export_cycles: readonly unknown[];
  readonly boundary_violations: readonly unknown[];
  readonly unused_exports: readonly unknown[];
  /** The files nothing imports, where the reader kept them: whole-repo dead code (D101). */
  readonly unused_files?: readonly unknown[];
};

export type Dupes = { readonly clone_families: readonly unknown[] };

/**
 * One istanbul statement: the line it starts on, the line it ends on, and how
 * often it ran. `end` is absent for a producer that knows only start lines,
 * and a statement without one ends on the line it starts (D163).
 */
export type CoverageStatement = { readonly line: number; readonly end?: number; readonly hits: number };
export type CoverageFile = { readonly path: string; readonly statements: readonly CoverageStatement[] };
export type Coverage = readonly CoverageFile[];

/** One mutant as `mutation.json` reports it, before it is joined to a changed line. */
export type ReportedMutant = { readonly line: number; readonly status: string };
export type MutationFile = { readonly path: string; readonly mutants: readonly ReportedMutant[] };
export type Mutation = readonly MutationFile[];

export type TestResult = { readonly path: string; readonly status: string };
export type TestReport = { readonly results: readonly TestResult[] };

/**
 * One way an advisory's module is pulled in: the manifest of the importer the
 * audit starts from, then each package down to the module, the first being
 * the importer's own dependency.
 */
export type AdvisoryPath = { readonly manifest: string; readonly packages: readonly string[] };

/** One advisory as the audit reports it: the vulnerable module, its severity, and every path that pulls it in (D83). */
export type Advisory = { readonly module: string; readonly severity: string; readonly paths: readonly AdvisoryPath[] };

/** The audit's severities, worst first: the order a security notice lists its advisories in. */
const SEVERITIES = ['critical', 'high', 'moderate', 'low', 'info'];

/** Where a severity falls in the audit's order, worst first; a word the audit does not use falls after `info`. */
export function severityRank(severity: string): number {
  const rank = SEVERITIES.indexOf(severity.toLowerCase());
  return rank === -1 ? SEVERITIES.length : rank;
}

/**
 * `security.json`: the audit's counts, and its advisories where the report
 * names them. Without `advisories` no advisory can be tied to the change, so
 * every one is standing state (C2, D83).
 */
export type Security = { readonly vulnerabilities: Readonly<Record<string, number>>; readonly advisories?: readonly Advisory[] };

/** One finding a lint or struct tool reports, kept to the file it names and the severity the tool gave it. */
export type ReportedFinding = { readonly path: string; readonly severity: string };

/** oxlint's `lint.json`: its diagnostics. */
export type Lint = { readonly diagnostics: readonly ReportedFinding[] };

/** ast-grep's `struct.json`: its matches. */
export type Struct = { readonly matches: readonly ReportedFinding[] };

/** A package this change added to a manifest or moved the range of, and the advisories whose paths run through it (D83). */
export type BroughtPackage = {
  readonly manifest: string;
  readonly name: string;
  readonly range: string;
  /** The range it was moved from; absent on a package this change added. */
  readonly from?: string;
  readonly advisories: readonly Advisory[];
};

/**
 * The advisories this change brought (D83): those with a path whose importer
 * is a manifest this change edited and whose first package is one that edit
 * added or moved the range of. A path into the same module through a package
 * the change left alone was there before it, so its advisory is standing.
 * One entry per package, by manifest and then name (C3).
 */
export function broughtAdvisories(
  security: Security | undefined,
  deps_added: readonly DepAdded[],
  deps_moved: readonly DepMoved[],
): readonly BroughtPackage[] {
  const advisories = security?.advisories ?? [];
  const deps: readonly (DepAdded | DepMoved)[] = [...deps_added, ...deps_moved];
  return deps
    .map((dep): BroughtPackage => ({
      manifest: dep.manifest,
      name: dep.name,
      range: dep.range,
      ...('from' in dep ? { from: dep.from } : {}),
      advisories: advisories.filter((advisory) =>
        advisory.paths.some((path) => path.manifest === dep.manifest && path.packages[0] === dep.name),
      ),
    }))
    .filter((brought) => brought.advisories.length > 0)
    .toSorted((a, b) => byPath(a.manifest, b.manifest) || byPath(a.name, b.name));
}

/**
 * One extracted commit's health, duplication and structure, as the reviewed
 * repo's own fallow measured it (D22, D98): the version that ran, each of the
 * three analyses it read, and each it could not as `analysis: reason`; or why
 * it never ran on the commit at all (C2). Its reports are `.check/`'s, read
 * by the same parsers, and its paths its own commit's, so the two sides of a
 * change compare like for like once the base's are put under head paths.
 */
export type Structure =
  | {
      readonly fallow: string;
      readonly health?: Health;
      readonly dupes?: Dupes;
      readonly dead?: Dead;
      readonly muted: readonly string[];
    }
  | { readonly reason: string };

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

/**
 * The slots whose findings name lines of a file rather than the file: a
 * function over a threshold, a clone (D73), and a cycle's or a boundary
 * violation's import or an unused export (D140).
 */
const LINE_SLOTS: ReadonlySet<string> = new Set(['health', 'dupes', 'dead']);

/** The slot whose findings name packages, on the change only through a manifest whose own edit brought one (D83). */
const SECURITY = 'security';

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
 * Evidence asks reach's question once more for each changed file, because
 * D27's *high reach* is measured per file while `weather.reach` is the union
 * over the whole change. `computeCellsReached` answers it for every changed
 * file in one walk of each graph, beside the walk `computeReach` makes, so
 * reach keeps its one home.
 */
export type EvidenceInputs = Omit<ReachInputs, 'changed'> & {
  /** The placed changed set `computeReach` returned: keyed by head path, each on one cell or one group (D40, D48). */
  readonly changed: readonly ChangedFile[];
  readonly check: CheckArtifacts;
  /**
   * Each head file's code spans, as the scan read them: a changed file a
   * report omits is unmeasured only where one of its hunks meets one (D80,
   * D141). A file the scan did not read is absent, and never unmeasured on a
   * guess (C2).
   */
  readonly code: ReadonlyMap<string, readonly CodeSpan[]>;
};

/** What the evidence knows about one changed file; §5.3 reads it for the category and §5.4 for the notices. */
export type FileEvidence = {
  readonly path: string;
  /** Absent when the coverage report never names the file: unmeasured is not covered (C2). */
  readonly coverage?: PatchCoverage;
  /**
   * A changed source file whose changed lines touch code, which the coverage
   * report, though it exists, never names: no test run is known to have
   * measured it, so it is a gap of unknown size rather than a closed skin
   * (D80, D122, D141).
   */
  readonly unmeasured: boolean;
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

/** The last line of a statement, which is its first when the producer gave no end (D163). */
function endOf(statement: CoverageStatement): number {
  return Math.max(statement.line, statement.end ?? statement.line);
}

/** Whether `inner`'s lines lie inside `outer`'s and are fewer. */
function nestsIn(inner: CoverageStatement, outer: CoverageStatement): boolean {
  return outer.line <= inner.line && endOf(inner) <= endOf(outer) && (outer.line < inner.line || endOf(inner) < endOf(outer));
}

/**
 * The hit count of one changed line, or undefined where no statement covers
 * it and the line is not executable. A line statements start on folds them
 * the way istanbul folds them, to the highest hit count among them, so a line
 * several statements share counts as covered when any of them ran. A line
 * inside a statement that starts above it, the continuation of a multi-line
 * condition or literal, is executable too (D163), and takes the highest hits
 * among the innermost statements over it: an `if` or a loop that ran spans
 * the lines of the block inside it, and must not cover a branch that never
 * did (C2).
 */
function lineHits(line: number, statements: readonly CoverageStatement[]): number | undefined {
  const over = statements.filter((statement) => statement.line <= line && line <= endOf(statement));
  const starting = over.filter((statement) => statement.line === line);
  const folded = starting.length > 0 ? starting : over.filter((outer) => !over.some((inner) => nestsIn(inner, outer)));
  return folded.length === 0 ? undefined : Math.max(...folded.map((statement) => statement.hits));
}

/**
 * Patch coverage for one file: every changed line a statement covers, from its
 * start line to its end line, folded onto lines by `lineHits`.
 * `changed_executable` counts lines rather than statements, which is what the
 * closed fraction of the membrane is drawn from.
 */
function patchCoverage(path: string, changedLines: ReadonlySet<number>, file: CoverageFile): PatchCoverage {
  const hits = new Map<number, number>();
  for (const line of changedLines) {
    const count = lineHits(line, file.statements);
    if (count !== undefined) hits.set(line, count);
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

/** Why coverage is muted when its report names none of the tree's source files (D122). */
export const COVERAGE_UNNAMED = "coverage: the report names none of the tree's source files";

/** A trusted `.check/` with its coverage set aside, and the reason it was, when one was (D122). */
export type TrustedCoverage = { readonly check: CheckArtifacts; readonly muted?: string };

/**
 * D122's broken channel. The CLI makes a coverage report's keys relative to
 * the repository it reads, so a report written in another checkout, or one
 * that is empty, names none of this tree's source files; read as it stands,
 * it would call every changed file unmeasured. Such a report is muted, with
 * the reason recorded beside the map's other muted channels, as D41 mutes a
 * stale file. One that names even one source file is this tree's, and every
 * changed file it leaves out stays unmeasured (D80).
 */
export function trustCoverage(check: CheckArtifacts, sources: ReadonlySet<string>): TrustedCoverage {
  if (check.mode !== 'check' || check.coverage === undefined) return { check };
  if (check.coverage.some((file) => sources.has(file.path))) return { check };
  const { coverage: _unnamed, ...rest } = check;
  return { check: rest, muted: COVERAGE_UNNAMED };
}

/**
 * Whether a report that exists leaves this changed file unmeasured (D80): a
 * terrain file that still stands at head, one of whose hunks meets a
 * statement that leaves code, and that the report never names. A deleted file
 * has nothing left to measure, and a test or a shore file is not terrain. A
 * change whose lines are imports, `export … from`, types or declarations
 * wrote nothing a test could run, so it leaves no gap, as a file of types
 * never does (D141).
 */
function isUnmeasured(
  file: ChangedFile,
  report: ReadonlyMap<string, CoverageFile> | undefined,
  code: ReadonlyMap<string, readonly CodeSpan[]>,
): boolean {
  if (report === undefined || report.has(file.path)) return false;
  if (file.kind === 'deleted' || file.cell === undefined) return false;
  return (code.get(file.path) ?? []).some((span) => file.hunks.some((hunk) => meets(span, hunk)));
}

/**
 * The evidence for the change: per file the coverage of its changed lines and
 * the mutants alive on them, and across the change the stitches that tie it to
 * the test run. `weather.evidence` carries a channel only when the run
 * produced it, so a map with no coverage says nothing about coverage rather
 * than saying zero (C2). A changed file a report that exists never names is
 * listed as unmeasured beside the coverage the report does give (D80).
 */
export function computeEvidence(inputs: EvidenceInputs): EvidenceResult {
  const check = inputs.check.mode === 'check' ? inputs.check : undefined;
  const coverageOf = check?.coverage === undefined ? undefined : new Map(check.coverage.map((file) => [file.path, file]));
  const mutationOf = new Map((check?.mutation ?? []).map((file) => [file.path, file]));
  const cells = indexCells(inputs.modules);
  const reached = computeCellsReached(inputs);

  const files = inputs.changed
    .map((file): FileEvidence => {
      const changedLines = hunkLines(file.hunks);
      const coverage = coverageOf?.get(file.path);
      const mutation = mutationOf.get(file.path);
      return {
        path: file.path,
        ...(coverage === undefined ? {} : { coverage: patchCoverage(file.path, changedLines, coverage) }),
        unmeasured: isUnmeasured(file, coverageOf, inputs.code),
        mutants: mutation === undefined ? [] : liveMutants(file.path, changedLines, mutation),
        cells_reached: reached.get(file.path) ?? 0,
        escaped_interface: escapedInterface(file, cells, inputs.headEdges),
      };
    })
    .toSorted((a, b) => byPath(a.path, b.path));

  return {
    evidence: {
      ...(check?.coverage === undefined
        ? {}
        : {
            patch_coverage: files.flatMap((file) => (file.coverage === undefined ? [] : [file.coverage])),
            unmeasured: files.filter((file) => file.unmeasured).map((file) => file.path),
          }),
      ...(check?.mutation === undefined ? {} : { mutants: files.flatMap((file) => file.mutants) }),
      ...(check?.test === undefined ? {} : { stitches: stitchesFor(inputs, check.test) }),
    },
    files,
  };
}

export type CategoryInputs = {
  readonly check: CheckArtifacts;
  /** What fallow measured the change did against the base; absent or empty, the line rule reads the head alone (D73, D98, D140). */
  readonly structure?: StructureChange;
  readonly changed: readonly ChangedFile[];
  /** `computeEvidence`'s per-file result: the gaps, the reach and the escaped interfaces D27 counts. */
  readonly files: readonly FileEvidence[];
  /** `computeEvidence`'s stitches, empty when the run had no test report: a torn one puts a red `test` on the change (D67). */
  readonly stitches: readonly Stitch[];
  /** The manifest delta: a red `security` is on the change only through a manifest whose added or moved package brought an advisory (D83). */
  readonly deps_added: readonly DepAdded[];
  readonly deps_moved: readonly DepMoved[];
  readonly config: Config;
};

/**
 * One red slot as D67 and D73 split it: the changed files it is on the
 * change through, and every file it names. What it names off the change is
 * standing state, and a global slot names no file at all, so its red is
 * standing state whole.
 */
export type RedSlot = {
  readonly name: string;
  readonly global: boolean;
  /** The changed files the slot is on the change through; sorted (C3). */
  readonly change: readonly string[];
  /** Every file the slot's own output names, its scope; sorted (C3), and empty on a global slot. */
  readonly named: readonly string[];
};

/** The red slots, each in exactly one list, both in name order (C3). */
export type RedSplit = {
  /** The change's red: every slot with at least one changed file behind it. */
  readonly change: readonly RedSlot[];
  /** The standing state: every global slot, and every slot with no changed file behind it. */
  readonly standing: readonly RedSlot[];
};

/** The head lines, first to last, of one statement that leaves JavaScript behind once its types are stripped, as the scan reads them (D141). */
export type CodeSpan = { readonly start: number; readonly end: number };

/** A finding's lines at head, first to last: a `health` function, one `dupes` clone instance (D73), or a `dead` finding's one line (D140). */
export type Span = CodeSpan & { readonly path: string };

/**
 * Where one finding sits for the line rule: the spans of the lines it stands
 * on, and the files it names where it has no line atis can read. The file
 * rule holds it to those, so nothing is hidden on a guess (D140, C2).
 */
export type FindingPlace = { readonly spans: readonly Span[]; readonly files: readonly string[] };

/** What the split reads: the scoped slots, the change's lines, the torn stitches, and where each finding sits. */
export type RedSplitInputs = {
  readonly slots: readonly CheckSlot[];
  /** The changed set with its head-side hunks, where a `health`, `dupes` or `dead` finding has to land to be the change's (D73, D140). */
  readonly changed: readonly Pick<ChangedFile, 'path' | 'hunks'>[];
  readonly stitches: readonly Stitch[];
  /** The places of the `health`, `dupes` and `dead` findings, by slot name; a slot with none here puts no file on the change. */
  readonly places: ReadonlyMap<string, readonly FindingPlace[]>;
  /** The manifests whose added or moved packages brought an advisory: the only files a red `security` is on the change through (D83). */
  readonly brought?: ReadonlySet<string>;
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

/** A positive whole line number under `line`, read by key (D41); anything else is no line. */
function lineOf(record: Record<string, unknown>): number | undefined {
  const line = record['line'];
  return typeof line === 'number' && Number.isInteger(line) && line >= 1 ? line : undefined;
}

/**
 * An import's line, where fallow gives one atis can read. Fallow 3.35 writes
 * an import that a re-export makes (`export … from`) at line 1, column 0,
 * wherever the statement sits, so that position names no line. An import
 * that truly sits at the file's first character keeps the file rule with it,
 * which hides nothing (C2).
 */
function importLine(record: Record<string, unknown>): number | undefined {
  const line = lineOf(record);
  return line === 1 && record['col'] === 0 ? undefined : line;
}

function lineSpan(path: string, line: number): Span {
  return { path, start: line, end: line };
}

/**
 * A cycle's place. Each of its `edges` is the import in its own file that
 * leads on round the cycle, so each file is held to its edges' lines, and a
 * file with no edge line atis can read keeps the file rule. A re-export
 * cycle carries no edges, so every file it names keeps it (D140).
 */
function cyclePlace(cycle: unknown): FindingPlace {
  const edges = isRecord(cycle) && Array.isArray(cycle['edges']) ? cycle['edges'].filter(isRecord) : [];
  const spans = edges.flatMap((edge): readonly Span[] => {
    const path = edge['path'];
    const line = importLine(edge);
    return typeof path === 'string' && line !== undefined ? [lineSpan(path, line)] : [];
  });
  const lined = new Set(spans.map((span) => span.path));
  return { spans, files: sortUnique(pathsOf(cycle).filter((path) => !lined.has(path))) };
}

/**
 * A finding that stands on one line of one file: a boundary violation's
 * import, on `line` in `from_path`, or an unused export's own `line` in
 * `path`. One with no line atis can read keeps the file rule over every file
 * it names (D140).
 */
function linePlace(finding: unknown, pathKey: string, line: (record: Record<string, unknown>) => number | undefined): FindingPlace {
  const path = isRecord(finding) ? finding[pathKey] : undefined;
  const at = isRecord(finding) ? line(finding) : undefined;
  return typeof path === 'string' && at !== undefined ? { spans: [lineSpan(path, at)], files: [] } : { spans: [], files: sortUnique(pathsOf(finding)) };
}

/** The cycles and boundary violations, each with its place: what §5.3 calls LIFR when one is on the change (D140). */
export function structuralPlaces(dead: Dead | undefined): readonly FindingPlace[] {
  if (dead === undefined) return [];
  return [
    ...[...dead.circular_dependencies, ...dead.re_export_cycles].map(cyclePlace),
    ...dead.boundary_violations.map((violation) => linePlace(violation, 'from_path', importLine)),
  ];
}

/** The unused exports, each with its place: the one `dead` finding §5.4 gives no kind of its own (D140). */
export function unusedExportPlaces(dead: Dead | undefined): readonly FindingPlace[] {
  return (dead?.unused_exports ?? []).map((unused) => linePlace(unused, 'path', lineOf));
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

/** The paths a red slot's own raw output names, for the seven slots whose output is about files, `security` by the manifests its advisories start from (D27, D67, D83). */
function namedPaths(slot: string, check: RanCheck): readonly string[] {
  if (slot === 'test') {
    return sortUnique((check.test?.results ?? []).filter((result) => result.status === FAILED).map((result) => result.path));
  }
  if (slot === 'health') return sortUnique((check.health?.findings ?? []).map((finding) => finding.path));
  if (slot === 'dead') {
    const { dead } = check;
    if (dead === undefined) return [];
    return sortUnique([...dead.circular_dependencies, ...dead.re_export_cycles, ...dead.boundary_violations, ...dead.unused_exports].flatMap(pathsOf));
  }
  if (slot === 'dupes') return sortUnique((check.dupes?.clone_families ?? []).flatMap(pathsOf));
  if (slot === 'lint') return failingPaths(check.lint?.diagnostics ?? []);
  if (slot === 'struct') return failingPaths(check.struct?.matches ?? []);
  if (slot === SECURITY) {
    return sortUnique((check.security?.advisories ?? []).flatMap((advisory) => advisory.paths.map((path) => path.manifest)));
  }
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

/** A `health` finding's span: its function, `line_count` lines from `line`. */
export function healthSpan(finding: HealthFinding): Span {
  return { path: finding.path, start: finding.line, end: finding.line + finding.line_count - 1 };
}

/**
 * The lines each copy in a clone family spans, read by key as the rest of
 * fallow's findings are (D41): `groups[].instances[]`, each with `file`,
 * `start_line` and `end_line`. An instance missing one of them spans no
 * lines, so it can put no file on the change.
 */
function cloneSpans(family: unknown): readonly Span[] {
  const groups = isRecord(family) && Array.isArray(family['groups']) ? family['groups'] : [];
  return groups.flatMap((group: unknown): readonly Span[] => {
    const instances = isRecord(group) && Array.isArray(group['instances']) ? group['instances'] : [];
    return instances.flatMap((instance: unknown): readonly Span[] => {
      if (!isRecord(instance)) return [];
      const { file, start_line: start, end_line: end } = instance;
      return typeof file === 'string' && typeof start === 'number' && typeof end === 'number' ? [{ path: file, start, end }] : [];
    });
  });
}

/**
 * The places of the three line-scoped slots' findings, by slot name (D73,
 * D140). Where fallow measured both sides, a `health` or `dupes` finding is
 * placed only when the change made it, new at head or worse than its base
 * self, and a cycle or boundary violation only when the change introduced it,
 * each over the whole of every changed file it names, in place of the line
 * rule (D98); an unused export keeps the line rule either way.
 */
function findingPlaces(check: RanCheck, structure: StructureChange): ReadonlyMap<string, readonly FindingPlace[]> {
  const made = structure.health?.map((fn): FindingPlace => ({ spans: [], files: [fn.path] }));
  return new Map([
    ['health', made ?? (check.health?.findings ?? []).map((finding) => ({ spans: [healthSpan(finding)], files: [] }))],
    ['dupes', structure.dupes ?? (check.dupes?.clone_families ?? []).map((family) => ({ spans: cloneSpans(family), files: [] }))],
    ['dead', [...(structure.introduced ?? structuralPlaces(check.dead)), ...unusedExportPlaces(check.dead)]],
  ]);
}

// ---------------------------------------------------------------------------
// the base side: what the change made, introduced, eased and moved (D98)
// ---------------------------------------------------------------------------

/** fallow's compound `exceeded` values, split so a function breaks one rule per threshold (§5.1). */
const EXCEEDED_RULES: ReadonlyMap<string, readonly string[]> = new Map([
  ['both', ['cognitive', 'cyclomatic']],
  ['cyclomatic_crap', ['crap', 'cyclomatic']],
  ['cognitive_crap', ['cognitive', 'crap']],
  ['all', ['cognitive', 'crap', 'cyclomatic']],
]);

/** The rules one `exceeded` names, each of fallow's thresholds by itself, so the count of dents is the count of rules (§5.1). */
export function rulesOf(exceeded: string): readonly string[] {
  return EXCEEDED_RULES.get(exceeded) ?? [exceeded];
}

/** The dent a cycle puts in each file it runs through, and the one a boundary violation puts in both its ends. */
export const CYCLE_RULE = 'cycle';
export const BOUNDARY_RULE = 'boundary';

/**
 * Every rule each file breaks, which is the count of vertices its shape has
 * pulled out (§5.1): fallow's thresholds from its health findings, plus a
 * cycle or a boundary violation from its dead-code findings naming the file,
 * each path read through `at`.
 */
export function dentsFrom(health: Health | undefined, dead: Dead | undefined, at: (path: string) => string = (path) => path): ReadonlyMap<string, readonly string[]> {
  const found = new Map<string, Set<string>>();
  const dent = (path: string, rule: string): void => {
    found.set(at(path), (found.get(at(path)) ?? new Set<string>()).add(rule));
  };
  for (const finding of health?.findings ?? []) {
    for (const rule of rulesOf(finding.exceeded)) dent(finding.path, rule);
  }
  for (const cycle of [...(dead?.circular_dependencies ?? []), ...(dead?.re_export_cycles ?? [])]) {
    for (const path of pathsOf(cycle)) dent(path, CYCLE_RULE);
  }
  for (const violation of dead?.boundary_violations ?? []) {
    for (const path of pathsOf(violation)) dent(path, BOUNDARY_RULE);
  }
  return new Map([...found].map(([path, rules]) => [path, sortUnique([...rules])] as const));
}

/** A function over a threshold at head on a changed file that the change made: new there, or worse than its base self (D98). */
export type MadeFunction = {
  readonly path: string;
  /** As fallow names it, where it does. */
  readonly function?: string;
  readonly rules: readonly string[];
  readonly change: 'new' | 'worse';
};

/**
 * What the change did to health, duplication and structure, read by setting
 * what fallow measured at head beside what it measured at the base (D98).
 * Each part is absent where its analysis was not measured on both sides by
 * one fallow, which leaves the head-only reading of D73 and D140 in its
 * place; `improvements` is absent only where no analysis was (C2).
 */
export type StructureChange = {
  /** The functions over a threshold at head, on a changed file, new there or worse than at the base. */
  readonly health?: readonly MadeFunction[];
  /** The clone families at head that name a changed file and are new there or duplicate more than their base selves did. */
  readonly dupes?: readonly FindingPlace[];
  /** The cycles and boundary violations at head that name a changed file and are absent at the base. */
  readonly introduced?: readonly FindingPlace[];
  readonly improvements?: readonly Improvement[];
  readonly health_delta?: HealthDelta;
};

/** The two sides fallow measured, the diff that renames the base's paths to the head's (D40), and the terrain the health delta is of. */
export type StructureInputs = {
  readonly base: Structure;
  readonly head: Structure;
  readonly diff: readonly DiffFile[];
  /** The terrain's files: a test or a shore file is no terrain (D4), so its maintainability moves no Health Δ, as it adds no Size (D166). */
  readonly terrain: ReadonlySet<string>;
};

/** fallow's three measures of one function, any of which rising makes it worse. */
const MEASURES = ['cyclomatic', 'cognitive', 'crap'] as const;

/**
 * Each function over a threshold, by its identity across the two sides: its
 * file under head paths, its name, and its place among that file's functions
 * of the name, top down, since fallow names every anonymous one alike.
 */
function functionsByKey(findings: readonly HealthFinding[], at: (path: string) => string): ReadonlyMap<string, HealthFinding> {
  const seen = new Map<string, number>();
  const keyed = new Map<string, HealthFinding>();
  const placed = findings.map((finding) => ({ ...finding, path: at(finding.path) })).toSorted((a, b) => byPath(a.path, b.path) || a.line - b.line);
  for (const finding of placed) {
    const name = `${finding.path}\n${finding.name ?? ''}`;
    const nth = seen.get(name) ?? 0;
    seen.set(name, nth + 1);
    keyed.set(`${name}\n${String(nth)}`, finding);
  }
  return keyed;
}

/** Whether a function breaks a rule its base self did not, or rose in a measure both sides carry; a measure one side lacks says nothing (C2). */
function worseThan(head: HealthFinding, base: HealthFinding): boolean {
  const before = new Set(rulesOf(base.exceeded));
  if (rulesOf(head.exceeded).some((rule) => !before.has(rule))) return true;
  return MEASURES.some((measure) => {
    const [now, was] = [head[measure], base[measure]];
    return now !== undefined && was !== undefined && now > was;
  });
}

function named(finding: HealthFinding): { readonly function?: string } {
  return finding.name === undefined ? {} : { function: finding.name };
}

/** The functions the change made over a threshold, and the rules each base function on a changed file no longer breaks. */
function healthMoves(base: Health, head: Health, at: (path: string) => string, changed: ReadonlySet<string>): { readonly made: readonly MadeFunction[]; readonly eased: readonly Improvement[] } {
  const before = functionsByKey(base.findings, at);
  const after = functionsByKey(head.findings, (path) => path);
  const made = [...after].flatMap(([key, finding]): readonly MadeFunction[] => {
    const self = before.get(key);
    if (!changed.has(finding.path) || (self !== undefined && !worseThan(finding, self))) return [];
    return [{ path: finding.path, ...named(finding), rules: sortUnique(rulesOf(finding.exceeded)), change: self === undefined ? 'new' : 'worse' }];
  });
  const eased = [...before].flatMap(([key, finding]): readonly Improvement[] => {
    if (!changed.has(finding.path)) return [];
    const now = after.get(key);
    const still = new Set(now === undefined ? [] : rulesOf(now.exceeded));
    return rulesOf(finding.exceeded)
      .filter((rule) => !still.has(rule))
      .map((rule): Improvement => ({ kind: 'threshold', files: [finding.path], rule, ...named(finding) }));
  });
  return { made, eased };
}

/** The dents each changed file had at the base and has no longer, by the analyses both sides measured. */
function dentsGone(base: ReadonlyMap<string, readonly string[]>, head: ReadonlyMap<string, readonly string[]>, changed: ReadonlySet<string>): readonly Improvement[] {
  return [...base].flatMap(([path, rules]) => {
    if (!changed.has(path)) return [];
    const still = new Set(head.get(path) ?? []);
    return rules.filter((rule) => !still.has(rule)).map((rule): Improvement => ({ kind: 'dent', files: [path], rule }));
  });
}

/** One clone family by the files it names, under head paths, and the lines it duplicates. */
type Family = { readonly files: readonly string[]; readonly lines: number };

/** The lines a family duplicates: fallow's own total where it gives one, else the lines its copies span. */
function duplicatedLines(family: unknown): number {
  const total = isRecord(family) ? family['total_duplicated_lines'] : undefined;
  if (typeof total === 'number') return total;
  return cloneSpans(family).reduce((lines, span) => lines + span.end - span.start + 1, 0);
}

function familiesOf(dupes: Dupes, at: (path: string) => string): readonly Family[] {
  return dupes.clone_families
    .map((family) => ({ files: sortUnique(pathsOf(family).map(at)), lines: duplicatedLines(family) }))
    .filter((family) => family.files.length > 0);
}

/** A head family's base self: the family of the same files, else the smallest that held them all, which a change that drops a copy leaves behind. */
function baseSelf(family: Family, base: readonly Family[]): Family | undefined {
  const key = family.files.join('\n');
  return (
    base.find((self) => self.files.join('\n') === key) ??
    base
      .filter((self) => family.files.every((path) => self.files.includes(path)))
      .toSorted((a, b) => a.files.length - b.files.length || byPath(a.files.join('\n'), b.files.join('\n')))[0]
  );
}

/** The families the change made, new or duplicating more, and the base families on a changed file no head family is left of. */
function dupesMoves(base: Dupes, head: Dupes, at: (path: string) => string, changed: ReadonlySet<string>): { readonly made: readonly FindingPlace[]; readonly dissolved: readonly Improvement[] } {
  const before = familiesOf(base, at);
  const selves = familiesOf(head, (path) => path).map((family) => ({ family, self: baseSelf(family, before) }));
  const touches = (files: readonly string[]): boolean => files.some((path) => changed.has(path));
  const made = selves
    .filter(({ family, self }) => touches(family.files) && (self === undefined || family.lines > self.lines))
    .map(({ family }): FindingPlace => ({ spans: [], files: family.files }));
  const left = new Set(selves.flatMap(({ self }) => (self === undefined ? [] : [self])));
  const dissolved = before.filter((family) => !left.has(family) && touches(family.files)).map((family): Improvement => ({ kind: 'clone-family', files: family.files }));
  return { made, dissolved };
}

/** A cycle's or a boundary violation's identity across the two sides: what it is and the files it names, under head paths. */
type Structural = { readonly key: string; readonly files: readonly string[]; readonly cycle: boolean };

function structuralsOf(dead: Dead, at: (path: string) => string): readonly Structural[] {
  const of = (kind: string, findings: readonly unknown[], cycle: boolean): readonly Structural[] =>
    findings.map((finding) => {
      const files = sortUnique(pathsOf(finding).map(at));
      const ends = isRecord(finding) ? [finding['from_path'], finding['to_path']].map((end) => (typeof end === 'string' ? at(end) : '')) : [];
      return { key: [kind, ...(cycle ? files : ends)].join('\n'), files, cycle };
    });
  return [...of('cycle', dead.circular_dependencies, true), ...of('re-export', dead.re_export_cycles, true), ...of('boundary', dead.boundary_violations, false)];
}

/** The cycles and boundary violations the change introduced, and the cycles on a changed file it broke. */
function deadMoves(base: Dead, head: Dead, at: (path: string) => string, changed: ReadonlySet<string>): { readonly introduced: readonly FindingPlace[]; readonly broken: readonly Improvement[] } {
  const before = structuralsOf(base, at);
  const after = structuralsOf(head, (path) => path);
  const absent = (from: readonly Structural[]) => {
    const keys = new Set(from.map((finding) => finding.key));
    return (finding: Structural): boolean => !keys.has(finding.key) && finding.files.some((path) => changed.has(path));
  };
  return {
    introduced: after.filter(absent(before)).map((finding): FindingPlace => ({ spans: [], files: finding.files })),
    broken: before.filter((finding) => finding.cycle && absent(after)(finding)).map((finding): Improvement => ({ kind: 'cycle', files: finding.files })),
  };
}

/** A measure to the tenth fallow gives its maintainability index in, so a sum of differences reads as one and not as a float. */
function tenths(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * The change's movement in fallow's maintainability index: each changed
 * terrain file both sides scored, head less base, a renamed one against its
 * base path, and their sum. An added or a deleted file has no other self to
 * move from.
 */
function healthDelta(base: Health, head: Health, diff: readonly DiffFile[], terrain: ReadonlySet<string>): HealthDelta {
  const before = new Map(base.file_scores.map((score) => [score.path, score.maintainability_index] as const));
  const after = new Map(head.file_scores.map((score) => [score.path, score.maintainability_index] as const));
  const files = diff
    .flatMap((file): readonly FileHealthDelta[] => {
      const was = before.get(file.from ?? file.path);
      const now = after.get(file.path);
      if (file.kind === 'added' || file.kind === 'deleted' || !terrain.has(file.path) || was === undefined || now === undefined) return [];
      return [{ path: file.path, maintainability: tenths(now - was) }];
    })
    .toSorted((a, b) => byPath(a.path, b.path));
  return { maintainability: tenths(files.reduce((total, file) => total + file.maintainability, 0)), files };
}

/** One analysis on both sides, or none where either side lacks it. */
function both<T>(was: T | undefined, now: T | undefined): readonly [T, T] | undefined {
  return was === undefined || now === undefined ? undefined : [was, now];
}

function improvementKey(improvement: Improvement): string {
  return [improvement.kind, improvement.files.join('\n'), improvement.rule ?? '', improvement.function ?? ''].join('\t');
}

/**
 * Set the head fallow measured beside the base it measured (D98). Only two
 * sides one fallow measured compare, so a moved pin reads as no base side
 * rather than as the change; and each analysis compares only where both
 * sides hold it. A finding the change made, introduced or eased names a
 * changed file, a deleted one under its base path (D40), so the movement of
 * ground the change never touched is never its own.
 */
export function compareStructure(inputs: StructureInputs): StructureChange {
  const { base, head } = inputs;
  if (!('fallow' in base) || !('fallow' in head) || base.fallow !== head.fallow) return {};
  const renames = new Map(inputs.diff.flatMap((file) => (file.kind === 'renamed' && file.from !== undefined ? [[file.from, file.path] as const] : [])));
  const at = (path: string): string => renames.get(path) ?? path;
  const changed = new Set(inputs.diff.map((file) => file.path));
  const health = both(base.health, head.health);
  const dupes = both(base.dupes, head.dupes);
  const dead = both(base.dead, head.dead);
  if (health === undefined && dupes === undefined && dead === undefined) return {};

  const healthMoved = health === undefined ? undefined : healthMoves(health[0], health[1], at, changed);
  const dupesMoved = dupes === undefined ? undefined : dupesMoves(dupes[0], dupes[1], at, changed);
  const deadMoved = dead === undefined ? undefined : deadMoves(dead[0], dead[1], at, changed);
  const dents = dentsGone(dentsFrom(health?.[0], dead?.[0], at), dentsFrom(health?.[1], dead?.[1]), changed);
  const improvements = [...(healthMoved?.eased ?? []), ...dents, ...(dupesMoved?.dissolved ?? []), ...(deadMoved?.broken ?? [])]
    .toSorted((a, b) => byPath(improvementKey(a), improvementKey(b)));

  return {
    ...(healthMoved === undefined ? {} : { health: healthMoved.made }),
    ...(dupesMoved === undefined ? {} : { dupes: dupesMoved.made }),
    ...(deadMoved === undefined ? {} : { introduced: deadMoved.introduced }),
    improvements,
    ...(health === undefined ? {} : { health_delta: healthDelta(health[0], health[1], inputs.diff, inputs.terrain) }),
  };
}

/**
 * Whether one head-side hunk meets a finding's or a statement's lines. A hunk
 * that wrote lines meets the span it overlaps. A pure deletion wrote none and
 * sits between head lines `start` and `start + 1`, so it meets the span that
 * holds both of them: a deletion inside the function or the clone (D73, D141).
 */
function meets(span: CodeSpan, hunk: Hunk): boolean {
  if (hunk.count === 0) return span.start <= hunk.start && hunk.start < span.end;
  return hunk.start <= span.end && span.start < hunk.start + hunk.count;
}

/**
 * Whether a finding lands on this change: its file changed, and one of the
 * file's head-side hunks meets its lines (D73). A finding on lines the change
 * never touched was there before it, as far as a head-only read can tell.
 */
export function spanOnChange(span: Span, hunks: ReadonlyMap<string, readonly Hunk[]>): boolean {
  return (hunks.get(span.path) ?? []).some((hunk) => meets(span, hunk));
}

/**
 * The changed files one finding is on the change through: each file where a
 * hunk meets one of its lines, and each file it names with no line atis can
 * read that the change touched at all (D73, D140).
 */
export function placeOnChange(place: FindingPlace, hunks: ReadonlyMap<string, readonly Hunk[]>): readonly string[] {
  return sortUnique([
    ...place.spans.filter((span) => spanOnChange(span, hunks)).map((span) => span.path),
    ...place.files.filter((path) => hunks.has(path)),
  ]);
}

/** Each red slot in exactly one list: the change's when some changed file is behind it, else the standing state's. */
function partition(slots: readonly RedSlot[]): RedSplit {
  return {
    change: slots.filter((slot) => slot.change.length > 0),
    standing: slots.filter((slot) => slot.change.length === 0),
  };
}

/**
 * D67's split of the red slots into the change's red and the standing state,
 * with D73's line rule. A slot is on the change through each changed file it
 * names, and `test` also through each failing test it names that imports a
 * changed file, which is a torn stitch (D4): the test is not the change, but
 * the files it tore on are. `health`, `dupes` and `dead` name lines of a
 * file rather than the file, so each is on the change only through a changed
 * file where one of its findings meets a hunk, or one a finding with no line
 * atis can read names (D140); where fallow measured both sides, through a
 * changed file a finding the change made or introduced names, which is what
 * `places` holds then (D98). `security` names the
 * manifests its advisories start from, and is on the change only through a
 * manifest whose own edit added or moved a package one of them runs through
 * (D83). Every other file a slot names,
 * and every global slot, is standing state. `computeCategory` makes this
 * split once and records it on the map, where the notices and the render
 * read it back through `readRedSplit`.
 */
export function splitRedSlots(inputs: RedSplitInputs): RedSplit {
  const hunks = new Map(inputs.changed.map((file) => [file.path, file.hunks] as const));
  const torn = new Map(
    inputs.stitches
      .filter((stitch) => stitch.status === FAILED)
      .map((stitch) => [stitch.test, stitch.targets.filter((target) => hunks.has(target))] as const),
  );

  const slots = inputs.slots
    .filter(isRed)
    .toSorted((a, b) => byPath(a.name, b.name))
    .map((slot): RedSlot => {
      if (slot.scope === GLOBAL) return { name: slot.name, global: true, change: [], named: [] };
      const met = new Set((inputs.places.get(slot.name) ?? []).flatMap((place) => placeOnChange(place, hunks)));
      const through = (path: string): readonly string[] => {
        if (LINE_SLOTS.has(slot.name)) return met.has(path) ? [path] : [];
        if (slot.name === SECURITY) return hunks.has(path) && inputs.brought?.has(path) === true ? [path] : [];
        return [...(hunks.has(path) ? [path] : []), ...(slot.name === 'test' ? (torn.get(path) ?? []) : [])];
      };
      return { name: slot.name, global: false, change: sortUnique(slot.scope.flatMap(through)), named: sortUnique(slot.scope) };
    });

  return partition(slots);
}

/**
 * The split as `map.json` records it: each red slot that names files carries
 * the changed files `splitRedSlots` put it on the change through. The notices
 * and every renderer read the split back from here rather than remaking it,
 * which they could not do from the map, since the line rule reads findings
 * the map does not carry (D73).
 */
export function readRedSplit(slots: readonly CheckSlot[]): RedSplit {
  return partition(
    slots
      .filter(isRed)
      .toSorted((a, b) => byPath(a.name, b.name))
      .map(
        (slot): RedSlot =>
          slot.scope === GLOBAL
            ? { name: slot.name, global: true, change: [], named: [] }
            : { name: slot.name, global: false, change: slot.change ?? [], named: slot.scope },
      ),
  );
}

/** Each red slot that names files, with the changed files the split put it on the change through recorded on it (D73). */
function recordSplit(slots: readonly CheckSlot[], red: RedSplit): readonly CheckSlot[] {
  const change = new Map([...red.change, ...red.standing].map((slot) => [slot.name, slot.change] as const));
  return slots.map((slot) => (isRed(slot) && slot.scope !== GLOBAL ? { ...slot, change: change.get(slot.name) ?? [] } : slot));
}

/** A gap: a changed file with at least one uncovered changed executable line (D27), or one no report measured at all (D80). */
function hasGap(file: FileEvidence): boolean {
  return file.unmeasured || (file.coverage !== undefined && file.coverage.uncovered_lines.length > 0);
}

/**
 * §5.3's ladder with D27's numbers, worst rung first. A vacuous green (no
 * check ran at all) and a cycle or boundary violation on this change are the
 * two things that make a green summary worse than no summary. A cycle or a
 * violation is on the change where the change introduced it, absent at the
 * base fallow measured (D98), and without a base side by the split's line
 * rule: one whose import lines the change never touched was there before it,
 * so a standing cycle through a changed file is standing state (D140). A
 * red slot is IFR only when it is the change's red (D69): standing state
 * leaves the category to the change's own evidence.
 */
function categoryOf(inputs: CategoryInputs, check: RanCheck, red: RedSplit): FlightCategory {
  const hunks = new Map(inputs.changed.map((file) => [file.path, file.hunks] as const));
  const highReach = inputs.config.category.high_reach_cells;

  if (check.summary.checks_run === 0) return 'LIFR';
  // With both sides measured, only a cycle or a violation the change introduced (D98).
  if ((inputs.structure?.introduced ?? structuralPlaces(check.dead)).some((place) => placeOnChange(place, hunks).length > 0)) return 'LIFR';
  if (red.change.length > 0) return 'IFR';
  if (inputs.files.some((file) => hasGap(file) && file.cells_reached >= highReach)) return 'IFR';
  if (inputs.files.some((file) => hasGap(file) || file.escaped_interface)) return 'MVFR';
  return 'VFR';
}

/**
 * The verdict block of `weather`: the flight category of §5.3, the slots the
 * run reports, the paths each red one names, and the changed files the split
 * put each on the change through (D73). No `.check/` is NOINST and never
 * green (D27); a `summary.json` that claimed schema 1 and then failed its
 * shape is a broken harness, which is LIFR.
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
  const brought = new Set(broughtAdvisories(check.security, inputs.deps_added, inputs.deps_moved).map((entry) => entry.manifest));
  const red = splitRedSlots({ slots, changed: inputs.changed, stitches: inputs.stitches, places: findingPlaces(check, inputs.structure ?? {}), brought });
  return {
    category: categoryOf(inputs, check, red),
    checks_run: check.summary.checks_run,
    timestamp: check.summary.timestamp,
    slots: recordSplit(slots, red),
  };
}
