import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, expect, test } from 'vitest';

import {
  parseCoverage,
  parseDead,
  parseDupes,
  parseHealth,
  parseLint,
  parseMutation,
  parseSecurity,
  parseStruct,
  parseSummary,
  parseTest,
  readCheck,
  readCheckDir,
} from '../sources/index.js';
import type { CheckInputs } from '../sources/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE_REPO = join(HERE, '..', '..', 'fixtures', 'check');

function writeTree(root: string, tree: Readonly<Record<string, string>>): string {
  for (const [path, content] of Object.entries(tree)) {
    const file = join(root, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
  return root;
}

function tempRepo(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `atis-check-${prefix}-`));
}

function expectCheck(result: CheckInputs): Extract<CheckInputs, { mode: 'check' }> {
  if (result.mode !== 'check') throw new Error(`expected mode "check", got a git-only reason: ${result.reason}`);
  return result;
}

/** oxlint 1.x `--format=json` as it lands in `lint.json`: an error and a warning, captured from a run and trimmed to two files. */
const OXLINT_REPORT = `{ "diagnostics": [{"message": "\`debugger\` statement is not allowed","code": "eslint(no-debugger)","severity": "error","url": "https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-debugger.html","help": "Remove the debugger statement","filename": "src/b.ts","labels": [{"span": {"offset": 0,"length": 9,"line": 1,"column": 1}}]},
{"message": "Unexpected console statement.","code": "eslint(no-console)","severity": "warning","url": "https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-console.html","help": "Delete this console statement.","filename": "src/a.ts","labels": [{"span": {"offset": 10,"length": 11,"line": 2,"column": 1}}]}],
              "number_of_files": 2,
              "number_of_rules": 97,
              "threads_count": 8,
              "start_time": 0.008714208
            }
            `;

/** ast-grep 0.x `scan --json=compact` as it lands in `struct.json`: a bare array of matches, captured and trimmed to its keys. */
const AST_GREP_REPORT = JSON.stringify([
  { text: 'var x = 1;', range: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } }, file: 'src/a.ts', language: 'TypeScript', ruleId: 'no-var', severity: 'warning', message: 'no var' },
  { text: 'class A {}', range: { start: { line: 0, column: 0 }, end: { line: 0, column: 10 } }, file: 'src/a.ts', language: 'TypeScript', ruleId: 'no-class', severity: 'error', message: 'no classes' },
]);

// ---------------------------------------------------------------------------
// parseSummary
// ---------------------------------------------------------------------------

test('parseSummary reads a schema-1 summary into ok, checks_run, timestamp, total_duration_ms and checks[]', () => {
  const parsed = parseSummary(
    JSON.stringify({
      schema_version: 1,
      ok: true,
      checks_run: 2,
      timestamp: '2026-01-01T00:00:00.000Z',
      total_duration_ms: 1000,
      checks: [
        { name: 'health', adapter: 'fallow', ok: true, exit_code: 0, duration_ms: 10, output_file: 'health.json' },
        { name: 'test', adapter: 'vitest', ok: true, skipped: false, exit_code: 0, duration_ms: 20, output_file: null },
      ],
    }),
  );
  expect(parsed).toEqual({
    kind: 'ok',
    summary: {
      ok: true,
      checks_run: 2,
      timestamp: '2026-01-01T00:00:00.000Z',
      total_duration_ms: 1000,
      checks: [
        { name: 'health', ok: true, skipped: false },
        { name: 'test', ok: true, skipped: false },
      ],
    },
  });
});

test('parseSummary is invalid on unparseable JSON, a missing schema_version or the wrong one, never rejecting on the number elsewhere', () => {
  expect(parseSummary('{ not json')).toEqual({ kind: 'invalid' });
  expect(parseSummary(JSON.stringify({ ok: true }))).toEqual({ kind: 'invalid' });
  expect(parseSummary(JSON.stringify({ schema_version: 2, ok: true }))).toEqual({ kind: 'invalid' });
});

test('parseSummary is harness_broken when schema_version: 1 but the rest of the shape does not match (D41)', () => {
  expect(parseSummary(JSON.stringify({ schema_version: 1, ok: true }))).toEqual({ kind: 'harness_broken' });
  expect(
    parseSummary(JSON.stringify({ schema_version: 1, ok: true, checks_run: 1, timestamp: 't', total_duration_ms: 1, checks: 'nope' })),
  ).toEqual({ kind: 'harness_broken' });
  expect(
    parseSummary(
      JSON.stringify({ schema_version: 1, ok: true, checks_run: 1, timestamp: 't', total_duration_ms: 1, checks: [{ adapter: 'x' }] }),
    ),
  ).toEqual({ kind: 'harness_broken' });
});

// ---------------------------------------------------------------------------
// the fallow readers: health, dead, dupes
// ---------------------------------------------------------------------------

test('parseHealth reads file_scores, findings by path with the exceeded threshold, and fan_in_p95, dropping a malformed row', () => {
  const parsed = parseHealth(
    JSON.stringify({
      schema_version: 9,
      file_scores: [
        { path: './src/a.ts', fan_in: 3, fan_out: 1, lines: 10, function_count: 2, maintainability_index: 90, crap_max: 1 },
        { path: 'src/broken.ts' },
      ],
      findings: [{ path: 'src/a.ts', exceeded: 'cyclomatic' }],
      target_thresholds: { fan_in_p95: 6 },
    }),
  );
  expect(parsed).toEqual({
    value: {
      file_scores: [{ path: 'src/a.ts', fan_in: 3, fan_out: 1, lines: 10, function_count: 2, maintainability_index: 90, crap_max: 1 }],
      findings: [{ path: 'src/a.ts', exceeded: 'cyclomatic' }],
      fan_in_p95: 6,
    },
    schema_version: 9,
  });
});

test('parseDead passes circular_dependencies, re_export_cycles, boundary_violations and unused_exports through', () => {
  const parsed = parseDead(
    JSON.stringify({
      schema_version: 11,
      circular_dependencies: [{ cycle: ['a.ts', 'b.ts'] }],
      re_export_cycles: [],
      boundary_violations: [{ from: 'apps', to: 'libs' }],
      unused_exports: [],
    }),
  );
  expect(parsed).toEqual({
    value: {
      circular_dependencies: [{ cycle: ['a.ts', 'b.ts'] }],
      re_export_cycles: [],
      boundary_violations: [{ from: 'apps', to: 'libs' }],
      unused_exports: [],
    },
    schema_version: 11,
  });
});

test('parseDupes passes clone_families through and records a fallow schema_version without rejecting it', () => {
  expect(parseDupes(JSON.stringify({ schema_version: 42, clone_families: [{ files: ['a.ts', 'b.ts'] }] }))).toEqual({
    value: { clone_families: [{ files: ['a.ts', 'b.ts'] }] },
    schema_version: 42,
  });
});

// ---------------------------------------------------------------------------
// coverage, mutation, test, security
// ---------------------------------------------------------------------------

test('parseCoverage relativises istanbul\'s absolute-path keys and reads statementMap lines against s hit counts', () => {
  const covered = parseCoverage(
    JSON.stringify({
      '/repo/src/a.ts': {
        statementMap: { '0': { start: { line: 5 }, end: { line: 5 } }, '1': { start: { line: 9 }, end: { line: 9 } } },
        s: { '0': 2, '1': 0 },
      },
    }),
    '/repo',
  );
  expect(covered).toEqual([
    { path: 'src/a.ts', statements: [{ line: 5, hits: 2 }, { line: 9, hits: 0 }] },
  ]);
});

test('parseMutation reads Stryker 1.0 files[path].mutants[{ status, location.start.line }]', () => {
  const mutation = parseMutation(
    JSON.stringify({
      files: {
        'src/a.ts': {
          mutants: [
            { status: 'Survived', location: { start: { line: 12 }, end: { line: 12 } } },
            { status: 'Killed', location: { start: { line: 30 }, end: { line: 30 } } },
          ],
        },
      },
    }),
  );
  expect(mutation).toEqual([{ path: 'src/a.ts', mutants: [{ line: 12, status: 'Survived' }, { line: 30, status: 'Killed' }] }]);
});

test('parseTest relativises vitest\'s absolute testResults[].name', () => {
  const report = parseTest(
    JSON.stringify({ testResults: [{ name: '/repo/src/__tests__/a.test.ts', status: 'failed' }] }),
    '/repo',
  );
  expect(report).toEqual({ results: [{ path: 'src/__tests__/a.test.ts', status: 'failed' }] });
});

test('parseSecurity reads metadata.vulnerabilities, and is undefined without it (C2)', () => {
  expect(parseSecurity(JSON.stringify({ metadata: { vulnerabilities: { high: 1, critical: 0 } } }))).toEqual({
    vulnerabilities: { high: 1, critical: 0 },
  });
  expect(parseSecurity(JSON.stringify({ metadata: {} }))).toBeUndefined();
  expect(parseSecurity('not json')).toBeUndefined();
});

// ---------------------------------------------------------------------------
// lint and struct: the files a red slot names (D67)
// ---------------------------------------------------------------------------

test('parseLint reads each oxlint diagnostic\'s filename and severity, sorted by path', () => {
  expect(parseLint(OXLINT_REPORT)).toEqual({
    diagnostics: [
      { path: 'src/a.ts', severity: 'warning' },
      { path: 'src/b.ts', severity: 'error' },
    ],
  });
});

test('parseLint drops a diagnostic with no filename or severity, and is undefined without a diagnostics list (C2)', () => {
  const report = JSON.stringify({ diagnostics: [{ filename: './src/a.ts', severity: 'error' }, { message: 'no file', severity: 'error' }, 'nope'] });
  expect(parseLint(report)).toEqual({ diagnostics: [{ path: 'src/a.ts', severity: 'error' }] });
  expect(parseLint(JSON.stringify({ number_of_files: 3 }))).toBeUndefined();
  expect(parseLint('{ not json')).toBeUndefined();
});

test('parseStruct reads each ast-grep match\'s file and severity, sorted by path then severity', () => {
  expect(parseStruct(AST_GREP_REPORT)).toEqual({
    matches: [
      { path: 'src/a.ts', severity: 'error' },
      { path: 'src/a.ts', severity: 'warning' },
    ],
  });
  expect(parseStruct('[]')).toEqual({ matches: [] });
});

test('parseStruct is undefined on anything but a bare array of matches (C2)', () => {
  expect(parseStruct(JSON.stringify({ matches: [] }))).toBeUndefined();
  expect(parseStruct('not json')).toBeUndefined();
});

test('lint.json and struct.json are read when their slots ran and were not skipped (D41, D67)', () => {
  const root = writeTree(tempRepo('lint-struct'), {
    '.check/summary.json': JSON.stringify({
      schema_version: 1,
      ok: false,
      checks_run: 2,
      timestamp: '2026-01-01T00:00:00.000Z',
      total_duration_ms: 1000,
      checks: [
        { name: 'lint', ok: false, skipped: false },
        { name: 'struct', ok: false },
      ],
    }),
    '.check/lint.json': OXLINT_REPORT,
    '.check/struct.json': AST_GREP_REPORT,
  });
  const result = expectCheck(readCheck(root));
  rmSync(root, { recursive: true, force: true });
  expect(result.lint?.diagnostics.map((entry) => entry.path)).toEqual(['src/a.ts', 'src/b.ts']);
  expect(result.struct?.matches).toHaveLength(2);
});

// ---------------------------------------------------------------------------
// readCheck: absent, empty, summary-less, invalid and harness_broken (D41)
// ---------------------------------------------------------------------------

test('.check/ absent is git-only with a reason', () => {
  const root = tempRepo('absent');
  const result = readCheck(root);
  rmSync(root, { recursive: true, force: true });
  expect(result).toEqual({ mode: 'git-only', reason: '.check/ is absent' });
});

test('.check/ empty is git-only with a reason', () => {
  const root = tempRepo('empty');
  mkdirSync(join(root, '.check'));
  const result = readCheck(root);
  rmSync(root, { recursive: true, force: true });
  expect(result).toEqual({ mode: 'git-only', reason: '.check/ is empty' });
});

test('.check/ present without summary.json is git-only with a reason (the summary-less case)', () => {
  const root = writeTree(tempRepo('summary-less'), { '.check/health.json': '{}' });
  const result = readCheck(root);
  rmSync(root, { recursive: true, force: true });
  expect(result).toEqual({ mode: 'git-only', reason: '.check/summary.json is missing' });
});

test('a summary.json with the wrong schema_version is git-only, not harness_broken', () => {
  const root = writeTree(tempRepo('bad-schema'), { '.check/summary.json': JSON.stringify({ schema_version: 3 }) });
  const result = readCheck(root);
  rmSync(root, { recursive: true, force: true });
  expect(result).toEqual({ mode: 'git-only', reason: '.check/summary.json has no schema_version: 1' });
});

test('a schema_version: 1 summary.json failing the rest of the shape is harness_broken (D41, D27)', () => {
  const root = writeTree(tempRepo('harness-broken'), { '.check/summary.json': JSON.stringify({ schema_version: 1, ok: true }) });
  const result = readCheck(root);
  rmSync(root, { recursive: true, force: true });
  expect(result).toEqual({ mode: 'git-only', reason: 'harness_broken' });
});

// ---------------------------------------------------------------------------
// readCheck: gating by the slot table, staleness and skip (synthetic, D41)
// ---------------------------------------------------------------------------

let gated: string;
let gatedResult: CheckInputs;

beforeAll(() => {
  gated = writeTree(tempRepo('gated'), {
    '.check/summary.json': JSON.stringify({
      schema_version: 1,
      ok: true,
      checks_run: 2,
      timestamp: '2026-01-01T00:00:00.000Z',
      total_duration_ms: 1000,
      checks: [
        { name: 'mutation', ok: true, skipped: false },
        { name: 'security', ok: true, skipped: true },
        { name: 'struct', ok: true, skipped: true },
      ],
    }),
    '.check/mutation.json': JSON.stringify({ files: { 'src/a.ts': { mutants: [{ status: 'Survived', location: { start: { line: 1 } } }] } } }),
    '.check/security.json': JSON.stringify({ metadata: { vulnerabilities: { high: 0 } } }),
    '.check/struct.json': AST_GREP_REPORT,
    '.check/dead.json': JSON.stringify({ circular_dependencies: [], re_export_cycles: [], boundary_violations: [], unused_exports: [] }),
    '.check/lint.json': OXLINT_REPORT,
  });
  // The run window is [timestamp - total_duration_ms, ∞) = [2025-12-31T23:59:59.000Z, ∞); backdate
  // mutation.json a full year earlier so it unambiguously predates it.
  const stale = new Date('2025-01-01T00:00:00.000Z');
  utimesSync(join(gated, '.check', 'mutation.json'), stale, stale);
  gatedResult = readCheck(gated);
});

afterAll(() => {
  rmSync(gated, { recursive: true, force: true });
});

test('a listed slot\'s file older than the run window is muted as stale, its age recorded (the stale-mutation case, D41)', () => {
  const result = expectCheck(gatedResult);
  expect(result.mutation).toBeUndefined();
  expect(result.stale).toEqual([{ slot: 'mutation', file: 'mutation.json', age_ms: expect.any(Number) }]);
  expect(result.stale[0]?.age_ms).toBeGreaterThan(0);
});

test('a skipped slot\'s raw file is never read, and never counted as stale either', () => {
  const result = expectCheck(gatedResult);
  expect(result.security).toBeUndefined();
  expect(result.struct).toBeUndefined();
  expect(result.stale.some((entry) => entry.slot === 'security' || entry.slot === 'struct')).toBe(false);
});

test('a raw file present but absent from checks[] is never read (the unlisted-slot case, D41)', () => {
  const result = expectCheck(gatedResult);
  expect(result.dead).toBeUndefined();
  expect(result.lint).toBeUndefined();
});

// ---------------------------------------------------------------------------
// readCheck against a trimmed copy of checkride's own .check/ (D41, D42)
// ---------------------------------------------------------------------------

let fixtureResult: CheckInputs;

beforeAll(() => {
  fixtureResult = readCheckDir(FIXTURE_REPO);
});

test('reads the trimmed checkride fixture: mode check, the summary, and every fallow schema_version recorded', () => {
  const result = expectCheck(fixtureResult);
  expect(result.summary.ok).toBe(true);
  expect(result.summary.checks_run).toBe(19);
  expect(result.summary.checks.some((slot) => slot.name === 'test' && slot.ok)).toBe(true);
  expect(result.fallow_schemas).toEqual({ health: 9, dead: 9, dupes: 9 });
});

test('health.json: file_scores, findings by path with the exceeded threshold, and fan_in_p95', () => {
  const result = expectCheck(fixtureResult);
  expect(result.health?.file_scores).toHaveLength(3);
  expect(result.health?.findings).toEqual([{ path: 'src/gate.ts', exceeded: 'cyclomatic' }]);
  expect(result.health?.fan_in_p95).toBe(6);
});

test('dead.json and dupes.json: the four dead-code channels and clone_families, all clean here', () => {
  const result = expectCheck(fixtureResult);
  expect(result.dead).toEqual({ circular_dependencies: [], re_export_cycles: [], boundary_violations: [], unused_exports: [] });
  expect(result.dupes).toEqual({ clone_families: [] });
});

test('security.json: metadata.vulnerabilities', () => {
  const result = expectCheck(fixtureResult);
  expect(result.security).toEqual({ vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0 } });
});

test('coverage/coverage-final.json and test.json: read because the test slot ran and was not skipped', () => {
  const result = expectCheck(fixtureResult);
  const adapters = result.coverage?.find((file) => file.path.endsWith('src/adapters.ts'));
  expect(adapters?.statements).toEqual([{ line: 15, hits: 29 }, { line: 127, hits: 29 }, { line: 155, hits: 0 }]);
  expect(result.test?.results).toHaveLength(3);
  expect(result.test?.results.every((entry) => entry.status === 'passed')).toBe(true);
});

test('mutation.json exists on disk but "mutation" never appears in checks[]: never read (D41)', () => {
  const result = expectCheck(fixtureResult);
  expect(result.mutation).toBeUndefined();
});
