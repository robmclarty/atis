/**
 * check: checkride's `.check/` artifacts. Trusted only through a `summary.json`
 * with `schema_version: 1`; a missing, empty or pre-contract folder is
 * `git-only` with a `reason`, and a summary that carries `schema_version: 1`
 * but fails the rest of the schema-1 shape is `harness_broken` (D41). A raw
 * file is read only when the check that owns it ran in this summary and was
 * not skipped, by the parser its check's `adapter` names, never by the slot
 * name alone and never by `output_file` (D41, D180). A target's files are read
 * from `.check/<target>/`, their paths rebased from the check's `cwd` onto the
 * repo root, and every target's evidence merges into one reading (D180). A
 * missing channel is `undefined`, never a faked default (C2); a channel whose
 * file predates the run window is muted as stale with its age recorded, and
 * one a check fills with an adapter atis has no parser for is muted with the
 * adapter named. Each split into a thin runner (this file's `readCheck`) and
 * pure parsers tested from JSON strings (D30).
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, sep } from 'node:path';

import { rebaseFinding } from 'core';
import type {
  Advisory,
  AdvisoryPath,
  CheckArtifacts,
  CheckBaseline,
  CheckSummary,
  CheckSummarySlot,
  Coverage,
  CoverageFile,
  CoverageStatement,
  Dead,
  Dupes,
  Health,
  HealthFileScore,
  HealthFinding,
  Lint,
  Mutation,
  MutationFile,
  ReportedFinding,
  ReportedMutant,
  Security,
  StaleChannel,
  Struct,
  TestReport,
  TestResult,
} from 'core';

const CHECK_DIR = '.check';
const SUMMARY_FILE = 'summary.json';
const SUMMARY_SCHEMA_VERSION = 1;

/**
 * What `readCheck` hands core. The shape is core's (`CheckArtifacts`), since
 * core owns the contract it computes evidence from and cannot import this
 * reader (C1); the alias keeps the reader's own name for it.
 */
export type CheckInputs = CheckArtifacts;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function arrayField(record: Record<string, unknown>, key: string): readonly unknown[] {
  const value = record[key];
  return Array.isArray(value) ? value : [];
}

function numberField(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === 'number' ? value : undefined;
}

/** Repo-relative and slash-separated, with the `./` segments fallow leaves in its paths dropped. */
function normalizePath(path: string): string {
  return path
    .split('/')
    .filter((part) => part !== '' && part !== '.')
    .join('/');
}

/** An absolute path (coverage, vitest) relativised to `repo`; outside it, best-effort normalised as-is. */
function relativeToRepo(repo: string, absolutePath: string): string {
  const rel = relative(repo, absolutePath);
  return rel.startsWith('..') || isAbsolute(rel) ? normalizePath(absolutePath) : rel.split(sep).join('/');
}

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * One check as checkride's summary records it (D180): the adapter that filled
 * it, `null` when its slot resolved to nothing, and the catalogue slot it
 * fills, which is `slot` where the run split into targets and its name
 * otherwise. A target's check also names the target whose directory under
 * `.check/` holds its files, and the directory it ran from when that is not
 * the repo's root.
 */
export type SummaryCheck = {
  readonly name: string;
  readonly slot: string;
  readonly adapter: string | null;
  readonly ok: boolean;
  readonly skipped: boolean;
  readonly target?: string;
  readonly cwd?: string;
};

/** A schema-1 summary as the reader keeps it: core's summary, with each check's adapter and place (D180). */
type CheckRun = Omit<CheckSummary, 'checks'> & { readonly checks: readonly SummaryCheck[] };

type SummaryParse = { readonly kind: 'ok'; readonly summary: CheckRun } | { readonly kind: 'invalid' } | { readonly kind: 'harness_broken' };

/** A target's name as checkride writes it, which is a directory under `.check/`: one plain segment, never a path. */
function isPlainName(name: string): boolean {
  return name !== '' && name !== '.' && name !== '..' && !/[/\\]/.test(name);
}

/** A check's `cwd` as checkride writes it: relative to the repo's root, and never leaving it. */
function isInsideRepo(cwd: string): boolean {
  return cwd !== '' && !isAbsolute(cwd) && !cwd.split(/[/\\]/).includes('..');
}

/** One check of the summary, or `undefined` when it breaks the schema-1 shape in a field the reader reads. */
function summaryCheck(raw: unknown): SummaryCheck | undefined {
  if (!isRecord(raw)) return undefined;
  const { name, ok, adapter, slot = name, target, cwd } = raw;
  if (typeof name !== 'string' || typeof ok !== 'boolean' || typeof slot !== 'string') return undefined;
  if (typeof adapter !== 'string' && adapter !== null) return undefined;
  if (target !== undefined && (typeof target !== 'string' || !isPlainName(target))) return undefined;
  if (cwd !== undefined && (typeof cwd !== 'string' || !isInsideRepo(cwd))) return undefined;
  return {
    name,
    slot,
    adapter,
    ok,
    skipped: raw['skipped'] === true,
    ...(target === undefined ? {} : { target }),
    ...(cwd === undefined ? {} : { cwd }),
  };
}

/** The pure parser: `summary.json` text to its schema-1 shape, or which way it failed (D41). */
export function parseSummary(text: string): SummaryParse {
  const value = parseJson(text);
  if (!isRecord(value) || value['schema_version'] !== SUMMARY_SCHEMA_VERSION) return { kind: 'invalid' };

  const ok = value['ok'];
  const checksRun = value['checks_run'];
  const timestamp = value['timestamp'];
  const totalDurationMs = value['total_duration_ms'];
  const checksRaw = value['checks'];
  if (typeof ok !== 'boolean' || typeof checksRun !== 'number' || typeof timestamp !== 'string' || typeof totalDurationMs !== 'number' || !Array.isArray(checksRaw)) {
    return { kind: 'harness_broken' };
  }

  const checks: SummaryCheck[] = [];
  for (const raw of checksRaw) {
    const check = summaryCheck(raw);
    if (check === undefined) return { kind: 'harness_broken' };
    checks.push(check);
  }

  return { kind: 'ok', summary: { ok, checks_run: checksRun, timestamp, total_duration_ms: totalDurationMs, checks } };
}

/**
 * The summary as core reads it: one entry per catalogue slot, red when any
 * check filling it is red and skipped only when every one sat out, so a split
 * repo's `web:lint` and `api:lint` are the one `lint` core scopes and splits
 * (D180). A summary that never split has one check per slot, read as it
 * always was.
 */
export function slotsOf(checks: readonly SummaryCheck[]): readonly CheckSummarySlot[] {
  const slots = new Map<string, CheckSummarySlot>();
  for (const check of checks) {
    const seen = slots.get(check.slot);
    slots.set(
      check.slot,
      seen === undefined
        ? { name: check.slot, ok: check.ok, skipped: check.skipped }
        : { name: check.slot, ok: seen.ok && check.ok, skipped: seen.skipped && check.skipped },
    );
  }
  return [...slots.values()];
}

/**
 * One fallow report, read: what it holds, and its envelope's `kind`, `version`
 * and `schema_version`. The kind is what tells a report from fallow's error
 * envelope, which parses as a report of nothing (C2); the version is which
 * fallow wrote it (D98).
 */
export type FallowParse<T> = { readonly value: T; readonly kind?: string; readonly version?: string; readonly schema_version?: number };

function stringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
}

/** The envelope every fallow report opens with, each part only when it is there. */
function envelopeOf(record: Record<string, unknown>): Omit<FallowParse<unknown>, 'value'> {
  const kind = stringField(record, 'kind');
  const version = stringField(record, 'version');
  const schemaVersion = numberField(record, 'schema_version');
  return {
    ...(kind === undefined ? {} : { kind }),
    ...(version === undefined ? {} : { version }),
    ...(schemaVersion === undefined ? {} : { schema_version: schemaVersion }),
  };
}

/**
 * `health.json` (fallow): `file_scores[]`, `findings[]` by path with the
 * exceeded threshold and the function's `line` and `line_count`, which is
 * where a red `health` meets a change or does not (D73), and
 * `target_thresholds.fan_in_p95`. A finding keeps its function's name and its
 * three measures where fallow gives them, which match it to its base self
 * and say whether the change made it worse (D98). A file keeps its total
 * cyclomatic complexity, a trouble spot's complexity, and a finding its
 * column, which keys an unnamed function in checkride's baseline (D101).
 */
export function parseHealth(text: string): FallowParse<Health> | undefined {
  const value = parseJson(text);
  if (!isRecord(value)) return undefined;

  const file_scores = arrayField(value, 'file_scores').flatMap((raw): readonly HealthFileScore[] => {
    if (!isRecord(raw)) return [];
    const path = raw['path'];
    const lines = raw['lines'];
    const function_count = raw['function_count'];
    const maintainability_index = raw['maintainability_index'];
    const crap_max = raw['crap_max'];
    if (typeof path !== 'string' || typeof lines !== 'number' || typeof function_count !== 'number' || typeof maintainability_index !== 'number' || typeof crap_max !== 'number') {
      return [];
    }
    const fan_in = numberField(raw, 'fan_in');
    const fan_out = numberField(raw, 'fan_out');
    const total_cyclomatic = numberField(raw, 'total_cyclomatic');
    return [
      {
        path: normalizePath(path),
        ...(fan_in === undefined ? {} : { fan_in }),
        ...(fan_out === undefined ? {} : { fan_out }),
        lines,
        function_count,
        maintainability_index,
        crap_max,
        ...(total_cyclomatic === undefined ? {} : { total_cyclomatic }),
      },
    ];
  });

  const findings = arrayField(value, 'findings').flatMap((raw): readonly HealthFinding[] => {
    if (!isRecord(raw)) return [];
    const path = raw['path'];
    const exceeded = raw['exceeded'];
    const line = numberField(raw, 'line');
    const line_count = numberField(raw, 'line_count');
    if (typeof path !== 'string' || typeof exceeded !== 'string' || line === undefined || line_count === undefined) return [];
    const name = stringField(raw, 'name');
    const col = numberField(raw, 'col');
    const measures = (['cyclomatic', 'cognitive', 'crap'] as const).flatMap((measure) => {
      const measured = numberField(raw, measure);
      return measured === undefined ? [] : [[measure, measured] as const];
    });
    return [
      {
        path: normalizePath(path),
        exceeded,
        line,
        ...(col === undefined ? {} : { col }),
        line_count,
        ...(name === undefined ? {} : { name }),
        ...Object.fromEntries(measures),
      },
    ];
  });

  const thresholds = value['target_thresholds'];
  const fan_in_p95 = isRecord(thresholds) ? numberField(thresholds, 'fan_in_p95') : undefined;

  return { value: { file_scores, findings, ...(fan_in_p95 === undefined ? {} : { fan_in_p95 }) }, ...envelopeOf(value) };
}

/**
 * `dead.json` (fallow): `circular_dependencies`, `re_export_cycles`,
 * `boundary_violations`, `unused_exports` and `unused_files`, each finding
 * kept whole, so core reads the paths it names and the lines it stands on by
 * key (D140, D101).
 */
export function parseDead(text: string): FallowParse<Dead> | undefined {
  const value = parseJson(text);
  if (!isRecord(value)) return undefined;
  return {
    value: {
      circular_dependencies: arrayField(value, 'circular_dependencies'),
      re_export_cycles: arrayField(value, 're_export_cycles'),
      boundary_violations: arrayField(value, 'boundary_violations'),
      unused_exports: arrayField(value, 'unused_exports'),
      unused_files: arrayField(value, 'unused_files'),
    },
    ...envelopeOf(value),
  };
}

/** `dupes.json` (fallow): `clone_families`. */
export function parseDupes(text: string): FallowParse<Dupes> | undefined {
  const value = parseJson(text);
  if (!isRecord(value)) return undefined;
  return { value: { clone_families: arrayField(value, 'clone_families') }, ...envelopeOf(value) };
}

/** `coverage/coverage-final.json` (istanbul): absolute-path keys, `statementMap` start and end lines, `s` (D163). */
export function parseCoverage(text: string, repo: string): Coverage | undefined {
  const value = parseJson(text);
  if (!isRecord(value)) return undefined;

  const files = Object.entries(value).flatMap(([absPath, raw]): readonly CoverageFile[] => {
    if (!isRecord(raw)) return [];
    const statementMap = raw['statementMap'];
    const hits = raw['s'];
    if (!isRecord(statementMap) || !isRecord(hits)) return [];

    const statements = Object.entries(statementMap).flatMap(([id, entry]): readonly CoverageStatement[] => {
      if (!isRecord(entry)) return [];
      const start = entry['start'];
      const line = isRecord(start) ? start['line'] : undefined;
      if (typeof line !== 'number') return [];
      const stop = entry['end'];
      const end = isRecord(stop) ? stop['line'] : undefined;
      const hitCount = hits[id];
      return [{ line, ...(typeof end === 'number' ? { end } : {}), hits: typeof hitCount === 'number' ? hitCount : 0 }];
    });

    return [{ path: relativeToRepo(repo, absPath), statements }];
  });

  return files.toSorted((a, b) => byPath(a.path, b.path));
}

/** `mutation.json` (Stryker 1.0): `files[path].mutants[{ status, location.start.line }]`. */
export function parseMutation(text: string): Mutation | undefined {
  const value = parseJson(text);
  if (!isRecord(value)) return undefined;
  const files = value['files'];
  if (!isRecord(files)) return undefined;

  const result = Object.entries(files).flatMap(([path, raw]): readonly MutationFile[] => {
    if (!isRecord(raw)) return [];
    const mutants = arrayField(raw, 'mutants').flatMap((m): readonly ReportedMutant[] => {
      if (!isRecord(m)) return [];
      const status = m['status'];
      const location = m['location'];
      const start = isRecord(location) ? location['start'] : undefined;
      const line = isRecord(start) ? start['line'] : undefined;
      return typeof status === 'string' && typeof line === 'number' ? [{ line, status }] : [];
    });
    return [{ path: normalizePath(path), mutants }];
  });

  return result.toSorted((a, b) => byPath(a.path, b.path));
}

/** `test.json` (vitest): `testResults[{ name, status }]`, `name` an absolute path. */
export function parseTest(text: string, repo: string): TestReport | undefined {
  const value = parseJson(text);
  if (!isRecord(value)) return undefined;

  const results = arrayField(value, 'testResults').flatMap((raw): readonly TestResult[] => {
    if (!isRecord(raw)) return [];
    const name = raw['name'];
    const status = raw['status'];
    return typeof name === 'string' && typeof status === 'string' ? [{ path: relativeToRepo(repo, name), status }] : [];
  });

  return { results: results.toSorted((a, b) => byPath(a.path, b.path)) };
}

/** The manifest at a workspace member's root, which is what an audit path's importer stands for. */
const MANIFEST = 'package.json';

/**
 * One path as pnpm's audit writes it (`.>express>qs`): the importer first,
 * `.` for the root and a member's directory with each `/` written `__`, then
 * each package down to the vulnerable module. A path with no package after
 * its importer names nothing (D83).
 */
function advisoryPath(text: string): AdvisoryPath | undefined {
  const [importer = '', ...packages] = text.split('>');
  if (importer === '' || packages.length === 0) return undefined;
  return { manifest: importer === '.' ? MANIFEST : `${importer.replaceAll('__', '/')}/${MANIFEST}`, packages };
}

/** One advisory, read by key: its module, its severity, and every path its findings name; one missing a module or severity names nothing. */
function advisoryOf(raw: unknown): readonly Advisory[] {
  if (!isRecord(raw)) return [];
  const module = raw['module_name'];
  const severity = raw['severity'];
  if (typeof module !== 'string' || typeof severity !== 'string') return [];
  const texts = arrayField(raw, 'findings').flatMap((finding) => (isRecord(finding) ? arrayField(finding, 'paths') : []));
  const paths = [...new Set(texts.filter((path): path is string => typeof path === 'string'))]
    .toSorted(byPath)
    .flatMap((path) => advisoryPath(path) ?? []);
  return [{ module, severity, paths }];
}

/**
 * `security.json`: the counts under `metadata.vulnerabilities`, and the
 * advisories under `advisories` with the paths that pull each module in
 * (D83). A report with no `advisories` record carries none, so nothing in it
 * can be tied to the change (C2).
 */
export function parseSecurity(text: string): Security | undefined {
  const value = parseJson(text);
  if (!isRecord(value)) return undefined;
  const metadata = value['metadata'];
  if (!isRecord(metadata)) return undefined;
  const vulnerabilities = metadata['vulnerabilities'];
  if (!isRecord(vulnerabilities)) return undefined;

  const result: Record<string, number> = {};
  for (const [kind, count] of Object.entries(vulnerabilities)) {
    if (typeof count === 'number') result[kind] = count;
  }
  const raw = value['advisories'];
  if (!isRecord(raw)) return { vulnerabilities: result };
  const advisories = Object.values(raw)
    .flatMap(advisoryOf)
    .toSorted((a, b) => byPath(a.module, b.module) || byPath(a.severity, b.severity));
  return { vulnerabilities: result, advisories };
}

/** Each finding's file (under `pathKey`) and severity; a finding missing either names nothing. */
function reportedFindings(raws: readonly unknown[], pathKey: string): readonly ReportedFinding[] {
  return raws
    .flatMap((raw): readonly ReportedFinding[] => {
      if (!isRecord(raw)) return [];
      const path = raw[pathKey];
      const severity = raw['severity'];
      return typeof path === 'string' && typeof severity === 'string' ? [{ path: normalizePath(path), severity }] : [];
    })
    .toSorted((a, b) => byPath(a.path, b.path) || byPath(a.severity, b.severity));
}

/** `lint.json` (oxlint `--format=json`): `diagnostics[{ filename, severity }]`, `filename` repo-relative. */
export function parseLint(text: string): Lint | undefined {
  const value = parseJson(text);
  if (!isRecord(value)) return undefined;
  const diagnostics = value['diagnostics'];
  return Array.isArray(diagnostics) ? { diagnostics: reportedFindings(diagnostics, 'filename') } : undefined;
}

/** `struct.json` (ast-grep `--json=compact`): a bare array of matches, `[{ file, severity }]`, `file` repo-relative. */
export function parseStruct(text: string): Struct | undefined {
  const value = parseJson(text);
  return Array.isArray(value) ? { matches: reportedFindings(value, 'file') } : undefined;
}

/** checkride's committed baseline, at the repository's root (D49). */
export const BASELINE_FILE = 'checkride.baseline.json';
const BASELINE_SCHEMA_VERSION = 1;

/** Each entry of `record` that is itself a record, by key; anything else is dropped. */
function records(record: Record<string, unknown>): Readonly<Record<string, Record<string, unknown>>> {
  return Object.fromEntries(Object.entries(record).flatMap(([key, value]) => (isRecord(value) ? [[key, value] as const] : [])));
}

/**
 * `checkride.baseline.json` (schema 1): each check's grandfathered keys, and
 * how many findings a key grandfathers where `counts` names it, kept as
 * opaque strings to compare and count, never parse (D49). The reader is
 * checkride's own kind of tolerant: unknown fields are ignored and a
 * malformed entry dropped, while a newer `schema_version` is refused whole
 * rather than half read.
 */
export function parseBaseline(text: string): CheckBaseline {
  const value = parseJson(text);
  if (!isRecord(value)) return { reason: `${BASELINE_FILE} is not a JSON object` };
  const version = value['schema_version'];
  if (version !== BASELINE_SCHEMA_VERSION) {
    return { reason: `${BASELINE_FILE} is schema_version ${String(version)}, and atis reads ${String(BASELINE_SCHEMA_VERSION)}` };
  }
  const slotsRaw = value['slots'];
  if (!isRecord(slotsRaw)) return { reason: `${BASELINE_FILE} has no slots` };
  const slots = Object.fromEntries(
    Object.entries(slotsRaw).flatMap(([slot, keys]) =>
      Array.isArray(keys) ? [[slot, keys.filter((key): key is string => typeof key === 'string' && key !== '')] as const] : [],
    ),
  );
  const countsRaw = value['counts'];
  if (!isRecord(countsRaw)) return { slots };
  const counts = Object.fromEntries(
    Object.entries(records(countsRaw)).map(([slot, keys]) => [
      slot,
      Object.fromEntries(Object.entries(keys).filter((entry): entry is [string, number] => Number.isInteger(entry[1]) && Number(entry[1]) >= 2)),
    ]),
  );
  return { slots, counts };
}

/** `.check/`, or a `reason` it cannot be trusted: absent, empty, or no schema-1 `summary.json` (D41). */
function resolveSummary(dir: string): { readonly summary: CheckRun } | { readonly reason: string } {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return { reason: '.check/ is absent' };
  if (readdirSync(dir).length === 0) return { reason: '.check/ is empty' };

  const summaryPath = join(dir, SUMMARY_FILE);
  if (!existsSync(summaryPath)) return { reason: '.check/summary.json is missing' };

  const parsed = parseSummary(readFileSync(summaryPath, 'utf8'));
  if (parsed.kind === 'invalid') return { reason: '.check/summary.json has no schema_version: 1' };
  if (parsed.kind === 'harness_broken') return { reason: 'harness_broken' };
  return { summary: parsed.summary };
}

/** A channel core reads from `.check/`, each one file a check's tool writes. */
type Channel = 'health' | 'dead' | 'dupes' | 'coverage' | 'test' | 'mutation' | 'security' | 'lint' | 'struct';

/** The test runners' two files: their report, and the istanbul coverage the repo's config writes beside it. */
const TEST_FILES: Readonly<Partial<Record<Channel, string>>> = { test: 'test.json', coverage: 'coverage/coverage-final.json' };

/**
 * The files each adapter atis has a parser for writes, by the slot it fills:
 * the one place a raw file meets its parser (D41, D180). One slot is filled by
 * a different tool in each pack, so a file is read by the adapter that wrote
 * it and never by its name alone: golangci-lint's `lint.json` is not oxlint's.
 * Jest's `--json` report is the one vitest's JSON reporter copies, which is
 * all `parseTest` reads.
 */
const READERS: Readonly<Record<string, Readonly<Record<string, Readonly<Partial<Record<Channel, string>>>>>>> = {
  health: { fallow: { health: 'health.json' } },
  dead: { fallow: { dead: 'dead.json' } },
  dupes: { fallow: { dupes: 'dupes.json' } },
  test: { vitest: TEST_FILES, jest: TEST_FILES },
  mutation: { stryker: { mutation: 'mutation.json' } },
  security: { 'pnpm-audit': { security: 'security.json' } },
  lint: { oxlint: { lint: 'lint.json' } },
  struct: { 'ast-grep': { struct: 'struct.json' } },
};

/** The files `check`'s adapter writes, when atis has a parser for it. */
function filesOf(check: SummaryCheck): Readonly<Partial<Record<Channel, string>>> | undefined {
  return check.adapter === null ? undefined : READERS[check.slot]?.[check.adapter];
}

/** Why a check's channel is muted: the adapter it ran, which atis has no parser for, and the check's name where it is not the slot's (D180, C2). */
function unparsed(check: SummaryCheck): string {
  if (check.adapter === null) return `${check.slot}: ${check.name} ran with no adapter named`;
  const ran = check.name === check.slot ? '' : `, which ${check.name} ran`;
  return `${check.slot}: atis has no parser for ${check.adapter}${ran}`;
}

/** A path a check's tool wrote from the directory it ran in, put on the repo's root (D180). */
type OnRoot = (path: string) => string;

function onRootOf(cwd: string | undefined): OnRoot | undefined {
  return cwd === undefined ? undefined : (path) => normalizePath(`${cwd}/${path}`);
}

function healthOnRoot(health: Health, at: OnRoot): Health {
  return {
    ...health,
    file_scores: health.file_scores.map((score) => ({ ...score, path: at(score.path) })),
    findings: health.findings.map((finding) => ({ ...finding, path: at(finding.path) })),
  };
}

function deadOnRoot(dead: Dead, at: OnRoot): Dead {
  const rebased = (findings: readonly unknown[]): readonly unknown[] => findings.map((finding) => rebaseFinding(finding, at));
  return {
    circular_dependencies: rebased(dead.circular_dependencies),
    re_export_cycles: rebased(dead.re_export_cycles),
    boundary_violations: rebased(dead.boundary_violations),
    unused_exports: rebased(dead.unused_exports),
    ...(dead.unused_files === undefined ? {} : { unused_files: rebased(dead.unused_files) }),
  };
}

function securityOnRoot(security: Security, at: OnRoot): Security {
  const { advisories } = security;
  if (advisories === undefined) return security;
  return {
    ...security,
    advisories: advisories.map((advisory) => ({ ...advisory, paths: advisory.paths.map((path) => ({ ...path, manifest: at(path.manifest) })) })),
  };
}

/** Each of `values` gathered into one, or the one itself, untouched, when a single check wrote it, as every summary that never split does. */
function merged<T>(values: readonly T[] | undefined, gather: (all: readonly T[]) => T): T | undefined {
  if (values === undefined) return undefined;
  return values.length === 1 ? values[0] : gather(values);
}

/** Each check's findings in pipeline order, and those sorted by path where the parser sorts them (C3). */
function sortedPaths<T extends { readonly path: string }>(all: readonly (readonly T[])[]): readonly T[] {
  return all.flat().toSorted((a, b) => byPath(a.path, b.path));
}

function gatherHealth(all: readonly Health[]): Health {
  // Each target's fan_in_p95 is its own population's; a threshold the targets disagree on is no threshold (C2).
  const thresholds = [...new Set(all.flatMap((health) => (health.fan_in_p95 === undefined ? [] : [health.fan_in_p95])))];
  const [fan_in_p95] = thresholds;
  return {
    file_scores: all.flatMap((health) => health.file_scores),
    findings: all.flatMap((health) => health.findings),
    ...(thresholds.length === 1 && fan_in_p95 !== undefined ? { fan_in_p95 } : {}),
  };
}

function gatherDead(all: readonly Dead[]): Dead {
  return {
    circular_dependencies: all.flatMap((dead) => dead.circular_dependencies),
    re_export_cycles: all.flatMap((dead) => dead.re_export_cycles),
    boundary_violations: all.flatMap((dead) => dead.boundary_violations),
    unused_exports: all.flatMap((dead) => dead.unused_exports),
    ...(all.every((dead) => dead.unused_files === undefined) ? {} : { unused_files: all.flatMap((dead) => dead.unused_files ?? []) }),
  };
}

function gatherSecurity(all: readonly Security[]): Security {
  const vulnerabilities: Record<string, number> = {};
  for (const security of all) {
    for (const [kind, count] of Object.entries(security.vulnerabilities)) vulnerabilities[kind] = (vulnerabilities[kind] ?? 0) + count;
  }
  if (all.every((security) => security.advisories === undefined)) return { vulnerabilities };
  const advisories = all
    .flatMap((security) => security.advisories ?? [])
    .toSorted((a, b) => byPath(a.module, b.module) || byPath(a.severity, b.severity));
  return { vulnerabilities, advisories };
}

/** The fallow schema the first check that wrote one recorded, in pipeline order (D98). */
function schemaOf(reports: readonly FallowParse<unknown>[] | undefined): number | undefined {
  return reports?.find((report) => report.schema_version !== undefined)?.schema_version;
}

/**
 * Every raw channel this summary's checks license (D41, D180). A slot's
 * channels are read only from the checks that ran in it, each from its
 * target's directory by its adapter's parser, its paths rebased from where
 * it ran, and merged into one channel only when every one of them yielded
 * it: a file missing, stale or unreadable in one target would leave that
 * target's files reading as measured and clean (C2). A slot one of whose
 * checks ran an adapter atis has no parser for is muted whole, the adapter
 * named, since a red the reader cannot place must not land on another
 * target's files. A file is muted as stale against the run window
 * `[timestamp − total_duration_ms, ∞)`.
 */
function readChannels(dir: string, repo: string, summary: CheckRun): Omit<Extract<CheckInputs, { mode: 'check' }>, 'mode' | 'summary'> {
  const windowStart = Date.parse(summary.timestamp) - summary.total_duration_ms;
  const stale: StaleChannel[] = [];
  const muted: string[] = [];

  const readable = new Map(
    Object.keys(READERS).map((slot) => {
      const ran = summary.checks.filter((check) => check.slot === slot && !check.skipped);
      const silent = ran.filter((check) => filesOf(check) === undefined);
      muted.push(...silent.map(unparsed));
      return [slot, silent.length === 0 ? ran : []] as const;
    }),
  );

  /** One check's file, unless it is missing or older than the run, when it is `undefined` and a stale one is recorded. */
  function readFile(check: SummaryCheck, file: string): string | undefined {
    const at = check.target === undefined ? file : `${check.target}/${file}`;
    const path = join(dir, at);
    if (!existsSync(path)) return undefined;
    const { mtimeMs } = statSync(path);
    if (mtimeMs < windowStart) {
      stale.push({ slot: check.name, file: at, age_ms: windowStart - mtimeMs });
      return undefined;
    }
    return readFileSync(path, 'utf8');
  }

  /** `channel` from every check that ran in `slot`, each parsed and put on the root; `undefined` unless every one yielded it (C2). */
  function readChannel<T>(slot: string, channel: Channel, parse: (text: string, at: OnRoot | undefined) => T | undefined): readonly T[] | undefined {
    const checks = readable.get(slot) ?? [];
    if (checks.length === 0) return undefined;
    const values: T[] = [];
    for (const check of checks) {
      const file = filesOf(check)?.[channel];
      const text = file === undefined ? undefined : readFile(check, file);
      const value = text === undefined ? undefined : parse(text, onRootOf(check.cwd));
      if (value === undefined) return undefined;
      values.push(value);
    }
    return values;
  }

  const healthRaw = readChannel('health', 'health', (text, at) => {
    const parsed = parseHealth(text);
    return parsed === undefined || at === undefined ? parsed : { ...parsed, value: healthOnRoot(parsed.value, at) };
  });
  const deadRaw = readChannel('dead', 'dead', (text, at) => {
    const parsed = parseDead(text);
    return parsed === undefined || at === undefined ? parsed : { ...parsed, value: deadOnRoot(parsed.value, at) };
  });
  const dupesRaw = readChannel('dupes', 'dupes', (text, at) => {
    const parsed = parseDupes(text);
    if (parsed === undefined || at === undefined) return parsed;
    return { ...parsed, value: { clone_families: parsed.value.clone_families.map((family) => rebaseFinding(family, at)) } };
  });
  // istanbul's keys and a test report's names are absolute, so making them relative to the repo puts them on its root.
  const coverage = merged(
    readChannel('test', 'coverage', (text) => parseCoverage(text, repo)),
    sortedPaths,
  );
  const test = merged(
    readChannel('test', 'test', (text) => parseTest(text, repo)),
    (all) => ({ results: sortedPaths(all.map((report) => report.results)) }),
  );
  const mutation = merged(
    readChannel('mutation', 'mutation', (text, at) => {
      const parsed = parseMutation(text);
      return parsed === undefined || at === undefined ? parsed : parsed.map((file) => ({ ...file, path: at(file.path) }));
    }),
    sortedPaths,
  );
  const security = merged(
    readChannel('security', 'security', (text, at) => {
      const parsed = parseSecurity(text);
      return parsed === undefined || at === undefined ? parsed : securityOnRoot(parsed, at);
    }),
    gatherSecurity,
  );
  const lint = merged(
    readChannel('lint', 'lint', (text, at) => {
      const parsed = parseLint(text);
      return parsed === undefined || at === undefined ? parsed : { diagnostics: parsed.diagnostics.map((finding) => ({ ...finding, path: at(finding.path) })) };
    }),
    (all) => ({ diagnostics: all.flatMap((report) => report.diagnostics).toSorted((a, b) => byPath(a.path, b.path) || byPath(a.severity, b.severity)) }),
  );
  const struct = merged(
    readChannel('struct', 'struct', (text, at) => {
      const parsed = parseStruct(text);
      return parsed === undefined || at === undefined ? parsed : { matches: parsed.matches.map((finding) => ({ ...finding, path: at(finding.path) })) };
    }),
    (all) => ({ matches: all.flatMap((report) => report.matches).toSorted((a, b) => byPath(a.path, b.path) || byPath(a.severity, b.severity)) }),
  );

  const health = merged(healthRaw?.map((report) => report.value), gatherHealth);
  const dead = merged(deadRaw?.map((report) => report.value), gatherDead);
  const dupes = merged(dupesRaw?.map((report) => report.value), (all) => ({ clone_families: all.flatMap((report) => report.clone_families) }));
  const [healthSchema, deadSchema, dupesSchema] = [schemaOf(healthRaw), schemaOf(deadRaw), schemaOf(dupesRaw)];
  const fallow_schemas: { health?: number; dead?: number; dupes?: number } = {
    ...(healthSchema === undefined ? {} : { health: healthSchema }),
    ...(deadSchema === undefined ? {} : { dead: deadSchema }),
    ...(dupesSchema === undefined ? {} : { dupes: dupesSchema }),
  };

  return {
    fallow_schemas,
    stale,
    ...(muted.length === 0 ? {} : { muted }),
    ...(health === undefined ? {} : { health }),
    ...(dead === undefined ? {} : { dead }),
    ...(dupes === undefined ? {} : { dupes }),
    ...(coverage === undefined ? {} : { coverage }),
    ...(mutation === undefined ? {} : { mutation }),
    ...(test === undefined ? {} : { test }),
    ...(security === undefined ? {} : { security }),
    ...(lint === undefined ? {} : { lint }),
    ...(struct === undefined ? {} : { struct }),
  };
}

/**
 * `dir` itself (a `.check/` folder, wherever it lives), or `git-only` with a
 * `reason` when it cannot be trusted (D41). Every raw file is read only when
 * a check that owns it ran and was not skipped, by its adapter's parser and
 * from its target's directory; a missing, stale or unparsed channel is
 * `undefined`, never faked (C2, D180). Every target's checks of a slot read
 * as the one slot core knows. Split from `readCheck` so a fixture that stands
 * in for a `.check/` folder without literally being named `.check/`
 * (gitignored everywhere) can be read directly (D42).
 */
export function readCheckDir(dir: string): CheckInputs {
  const resolved = resolveSummary(dir);
  if ('reason' in resolved) return { mode: 'git-only', reason: resolved.reason };

  const { summary } = resolved;
  return { mode: 'check', summary: { ...summary, checks: slotsOf(summary.checks) }, ...readChannels(dir, dirname(dir), summary) };
}

/** `.check/` at `repo`, or `git-only` with a `reason` when it cannot be trusted (D41). */
export function readCheck(repo: string): CheckInputs {
  return readCheckDir(join(repo, CHECK_DIR));
}
