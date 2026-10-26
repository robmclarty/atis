/**
 * check: checkride's `.check/` artifacts. Trusted only through a `summary.json`
 * with `schema_version: 1`; a missing, empty or pre-contract folder is
 * `git-only` with a `reason`, and a summary that carries `schema_version: 1`
 * but fails the rest of the schema-1 shape is `harness_broken` (D41). A raw
 * file is read only when the slot that owns it ran in this summary and was
 * not skipped, by a fixed slot-to-file table, never by `output_file` (D41).
 * A missing channel is `undefined`, never a faked default (C2); a channel
 * whose file predates the run window is muted as stale with its age
 * recorded. Each split into a thin runner (this file's `readCheck`) and pure
 * parsers tested from JSON strings (D30).
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, sep } from 'node:path';

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

type SummaryParse = { readonly kind: 'ok'; readonly summary: CheckSummary } | { readonly kind: 'invalid' } | { readonly kind: 'harness_broken' };

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

  const checks: CheckSummarySlot[] = [];
  for (const raw of checksRaw) {
    if (!isRecord(raw)) return { kind: 'harness_broken' };
    const name = raw['name'];
    const slotOk = raw['ok'];
    if (typeof name !== 'string' || typeof slotOk !== 'boolean') return { kind: 'harness_broken' };
    checks.push({ name, ok: slotOk, skipped: raw['skipped'] === true });
  }

  return { kind: 'ok', summary: { ok, checks_run: checksRun, timestamp, total_duration_ms: totalDurationMs, checks } };
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
function resolveSummary(dir: string): { readonly summary: CheckSummary } | { readonly reason: string } {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return { reason: '.check/ is absent' };
  if (readdirSync(dir).length === 0) return { reason: '.check/ is empty' };

  const summaryPath = join(dir, SUMMARY_FILE);
  if (!existsSync(summaryPath)) return { reason: '.check/summary.json is missing' };

  const parsed = parseSummary(readFileSync(summaryPath, 'utf8'));
  if (parsed.kind === 'invalid') return { reason: '.check/summary.json has no schema_version: 1' };
  if (parsed.kind === 'harness_broken') return { reason: 'harness_broken' };
  return { summary: parsed.summary };
}

/**
 * Every raw channel this summary's slots license: gated by the fixed
 * slot-to-file table (never `output_file`), muted as stale against the run
 * window `[timestamp − total_duration_ms, ∞)`, and never read at all when
 * its slot did not run or was skipped (D41, C2).
 */
function readChannels(dir: string, repo: string, summary: CheckSummary): Omit<Extract<CheckInputs, { mode: 'check' }>, 'mode' | 'summary'> {
  const ranSlots = new Set(summary.checks.filter((slot) => !slot.skipped).map((slot) => slot.name));
  const windowStart = Date.parse(summary.timestamp) - summary.total_duration_ms;
  const stale: StaleChannel[] = [];

  function readChannel<T>(slot: string, file: string, parse: (text: string) => T | undefined): T | undefined {
    if (!ranSlots.has(slot)) return undefined;
    const path = join(dir, file);
    if (!existsSync(path)) return undefined;
    const { mtimeMs } = statSync(path);
    if (mtimeMs < windowStart) {
      stale.push({ slot, file, age_ms: windowStart - mtimeMs });
      return undefined;
    }
    return parse(readFileSync(path, 'utf8'));
  }

  const healthRaw = readChannel('health', 'health.json', parseHealth);
  const deadRaw = readChannel('dead', 'dead.json', parseDead);
  const dupesRaw = readChannel('dupes', 'dupes.json', parseDupes);
  const coverage = readChannel('test', 'coverage/coverage-final.json', (text) => parseCoverage(text, repo));
  const test = readChannel('test', 'test.json', (text) => parseTest(text, repo));
  const mutation = readChannel('mutation', 'mutation.json', parseMutation);
  const security = readChannel('security', 'security.json', parseSecurity);
  const lint = readChannel('lint', 'lint.json', parseLint);
  const struct = readChannel('struct', 'struct.json', parseStruct);

  const fallow_schemas: { health?: number; dead?: number; dupes?: number } = {
    ...(healthRaw?.schema_version === undefined ? {} : { health: healthRaw.schema_version }),
    ...(deadRaw?.schema_version === undefined ? {} : { dead: deadRaw.schema_version }),
    ...(dupesRaw?.schema_version === undefined ? {} : { dupes: dupesRaw.schema_version }),
  };

  return {
    fallow_schemas,
    stale,
    ...(healthRaw === undefined ? {} : { health: healthRaw.value }),
    ...(deadRaw === undefined ? {} : { dead: deadRaw.value }),
    ...(dupesRaw === undefined ? {} : { dupes: dupesRaw.value }),
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
 * its owning slot ran and was not skipped, by the fixed slot-to-file table;
 * a missing or stale channel is `undefined`, never faked (C2). Split from
 * `readCheck` so a fixture that stands in for a `.check/` folder without
 * literally being named `.check/` (gitignored everywhere) can be read
 * directly (D42).
 */
export function readCheckDir(dir: string): CheckInputs {
  const resolved = resolveSummary(dir);
  if ('reason' in resolved) return { mode: 'git-only', reason: resolved.reason };

  return { mode: 'check', summary: resolved.summary, ...readChannels(dir, dirname(dir), resolved.summary) };
}

/** `.check/` at `repo`, or `git-only` with a `reason` when it cannot be trusted (D41). */
export function readCheck(repo: string): CheckInputs {
  return readCheckDir(join(repo, CHECK_DIR));
}
