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

import type { FallowSchemas } from 'core';

const CHECK_DIR = '.check';
const SUMMARY_FILE = 'summary.json';
const SUMMARY_SCHEMA_VERSION = 1;

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

export type Mutant = { readonly line: number; readonly status: string };
export type MutationFile = { readonly path: string; readonly mutants: readonly Mutant[] };
export type Mutation = readonly MutationFile[];

export type TestResult = { readonly path: string; readonly status: string };
export type TestReport = { readonly results: readonly TestResult[] };

export type Security = { readonly vulnerabilities: Readonly<Record<string, number>> };

/** A channel muted for staleness: its owning slot ran, but the raw file predates the run window (D41). */
export type StaleChannel = { readonly slot: string; readonly file: string; readonly age_ms: number };

export type CheckInputs =
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
    };

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

type FallowParse<T> = { readonly value: T; readonly schema_version?: number };

/** `health.json` (fallow): `file_scores[]`, `findings[]` by path with the exceeded threshold, `target_thresholds.fan_in_p95`. */
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
    return [
      {
        path: normalizePath(path),
        ...(fan_in === undefined ? {} : { fan_in }),
        ...(fan_out === undefined ? {} : { fan_out }),
        lines,
        function_count,
        maintainability_index,
        crap_max,
      },
    ];
  });

  const findings = arrayField(value, 'findings').flatMap((raw): readonly HealthFinding[] => {
    if (!isRecord(raw)) return [];
    const path = raw['path'];
    const exceeded = raw['exceeded'];
    return typeof path === 'string' && typeof exceeded === 'string' ? [{ path: normalizePath(path), exceeded }] : [];
  });

  const thresholds = value['target_thresholds'];
  const fan_in_p95 = isRecord(thresholds) ? numberField(thresholds, 'fan_in_p95') : undefined;
  const schemaVersion = numberField(value, 'schema_version');

  return {
    value: { file_scores, findings, ...(fan_in_p95 === undefined ? {} : { fan_in_p95 }) },
    ...(schemaVersion === undefined ? {} : { schema_version: schemaVersion }),
  };
}

/** `dead.json` (fallow): `circular_dependencies`, `re_export_cycles`, `boundary_violations`, `unused_exports`. */
export function parseDead(text: string): FallowParse<Dead> | undefined {
  const value = parseJson(text);
  if (!isRecord(value)) return undefined;
  const schemaVersion = numberField(value, 'schema_version');
  return {
    value: {
      circular_dependencies: arrayField(value, 'circular_dependencies'),
      re_export_cycles: arrayField(value, 're_export_cycles'),
      boundary_violations: arrayField(value, 'boundary_violations'),
      unused_exports: arrayField(value, 'unused_exports'),
    },
    ...(schemaVersion === undefined ? {} : { schema_version: schemaVersion }),
  };
}

/** `dupes.json` (fallow): `clone_families`. */
export function parseDupes(text: string): FallowParse<Dupes> | undefined {
  const value = parseJson(text);
  if (!isRecord(value)) return undefined;
  const schemaVersion = numberField(value, 'schema_version');
  return { value: { clone_families: arrayField(value, 'clone_families') }, ...(schemaVersion === undefined ? {} : { schema_version: schemaVersion }) };
}

/** `coverage/coverage-final.json` (istanbul): absolute-path keys, `statementMap`, `s`. */
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
      const hitCount = hits[id];
      return [{ line, hits: typeof hitCount === 'number' ? hitCount : 0 }];
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
    const mutants = arrayField(raw, 'mutants').flatMap((m): readonly Mutant[] => {
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

/** `security.json`: `metadata.vulnerabilities`. */
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
  return { vulnerabilities: result };
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
