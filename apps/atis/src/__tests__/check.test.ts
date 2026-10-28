import { mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, expect, test } from 'vitest';

import {
  goModulePath,
  goWorkUses,
  parseBaseline,
  parseCoverage,
  parseDead,
  parseDupes,
  parseGoTestEvents,
  parseHealth,
  parseLint,
  parseMutation,
  parseSecurity,
  parseStruct,
  parseSummary,
  parseTest,
  readCheck,
  readCheckDir,
  readGoTestResults,
  slotsOf,
} from '../sources/index.js';
import type { CheckInputs, SummaryCheck } from '../sources/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE_REPO = join(HERE, '..', '..', 'fixtures', 'check');
const TARGETS_REPO = join(HERE, '..', '..', 'fixtures', 'check-targets');
const TARGETS_FIXTURE = join(TARGETS_REPO, 'check');

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
        { name: 'health', slot: 'health', adapter: 'fallow', ok: true, skipped: false },
        { name: 'test', slot: 'test', adapter: 'vitest', ok: true, skipped: false },
      ],
    },
  });
});

test("parseSummary keeps a target's check whole: its slot, adapter, target and the directory it ran from (D180)", () => {
  const parsed = parseSummary(
    JSON.stringify({
      schema_version: 1,
      ok: false,
      checks_run: 2,
      timestamp: '2026-01-01T00:00:00.000Z',
      total_duration_ms: 1000,
      checks: [
        { name: 'api:lint', target: 'api', slot: 'lint', pack: 'go', cwd: 'api', adapter: 'golangci-lint', ok: false, exit_code: 1, duration_ms: 9, output_file: 'api/lint.json' },
        { name: 'web:lint', target: 'web', slot: 'lint', pack: 'ts', cwd: 'web', adapter: null, ok: true, skipped: true, exit_code: null, duration_ms: 0, output_file: null },
        { name: 'struct', slot: 'struct', pack: 'repo', adapter: 'ast-grep', ok: true, exit_code: 0, duration_ms: 9, output_file: 'struct.json' },
      ],
    }),
  );
  expect(parsed.kind === 'ok' ? parsed.summary.checks : parsed).toEqual([
    { name: 'api:lint', slot: 'lint', adapter: 'golangci-lint', ok: false, skipped: false, target: 'api', cwd: 'api' },
    { name: 'web:lint', slot: 'lint', adapter: null, ok: true, skipped: true, target: 'web', cwd: 'web' },
    { name: 'struct', slot: 'struct', adapter: 'ast-grep', ok: true, skipped: false },
  ]);
});

test('parseSummary is invalid on unparseable JSON, a missing schema_version or the wrong one, never rejecting on the number elsewhere', () => {
  expect(parseSummary('{ not json')).toEqual({ kind: 'invalid' });
  expect(parseSummary(JSON.stringify({ ok: true }))).toEqual({ kind: 'invalid' });
  expect(parseSummary(JSON.stringify({ schema_version: 2, ok: true }))).toEqual({ kind: 'invalid' });
});

/** A one-check schema-1 summary: an oxlint `lint` with `check`'s fields over it. */
function shaped(check: Readonly<Record<string, unknown>>): string {
  return JSON.stringify({ schema_version: 1, ok: true, checks_run: 1, timestamp: 't', total_duration_ms: 1, checks: [{ name: 'lint', ok: true, adapter: 'oxlint', ...check }] });
}

/** A check of `slot` as the reader keeps it: one that sat out names no adapter. */
function summaryCheck(name: string, slot: string, ok: boolean, skipped = false): SummaryCheck {
  return { name, slot, adapter: skipped ? null : 'x', ok, skipped };
}

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
  // Every schema-1 check records its adapter, which picks its parser, and a target and a cwd are places inside the repo (D180).
  for (const broken of [{ adapter: undefined }, { adapter: 7 }, { target: '../elsewhere' }, { target: 'a/b' }, { cwd: '../up' }, { cwd: '/abs' }, { slot: 3 }]) {
    expect(parseSummary(shaped(broken)), JSON.stringify(broken)).toEqual({ kind: 'harness_broken' });
  }
  expect(parseSummary(shaped({ target: 'web', cwd: 'apps/web' })).kind).toBe('ok');
});

test("slotsOf reads every target's check of a slot as the one slot: red when any is red, skipped only when all sat out (D180)", () => {
  expect(
    slotsOf([
      summaryCheck('web:types', 'types', true),
      summaryCheck('api:types', 'types', false),
      summaryCheck('web:lint', 'lint', true, true),
      summaryCheck('api:lint', 'lint', true),
      summaryCheck('web:dead', 'dead', true, true),
      summaryCheck('api:dead', 'dead', true, true),
      summaryCheck('struct', 'struct', true),
    ]),
  ).toEqual([
    { name: 'types', ok: false, skipped: false },
    { name: 'lint', ok: true, skipped: false },
    { name: 'dead', ok: true, skipped: true },
    { name: 'struct', ok: true, skipped: false },
  ]);
});

// ---------------------------------------------------------------------------
// the fallow readers: health, dead, dupes
// ---------------------------------------------------------------------------

test('parseHealth reads file_scores with their total complexity, findings by path with the exceeded threshold, the lines they span and their column, and fan_in_p95, dropping a malformed row', () => {
  const parsed = parseHealth(
    JSON.stringify({
      schema_version: 9,
      file_scores: [
        { path: './src/a.ts', fan_in: 3, fan_out: 1, lines: 10, function_count: 2, maintainability_index: 90, crap_max: 1, total_cyclomatic: 14 },
        { path: 'src/broken.ts' },
      ],
      findings: [
        // hono #5266's `add`, as fallow writes it: the span is what a hunk has to meet (D73).
        { path: './src/router.ts', name: 'add', line: 67, col: 2, cyclomatic: 22, cognitive: 34, line_count: 60, exceeded: 'all' },
        // A finding with no lines cannot be placed against a hunk, so it is malformed like one with no threshold.
        { path: 'src/a.ts', exceeded: 'cyclomatic' },
        { path: 'src/a.ts', line: 4, line_count: 9 },
      ],
      target_thresholds: { fan_in_p95: 6 },
    }),
  );
  expect(parsed).toEqual({
    value: {
      // A file's total complexity is a trouble spot's (D101).
      file_scores: [{ path: 'src/a.ts', fan_in: 3, fan_out: 1, lines: 10, function_count: 2, maintainability_index: 90, crap_max: 1, total_cyclomatic: 14 }],
      // Its name and its measures match it to its base self and say whether a change made it worse (D98);
      // its column keys an unnamed function in checkride's baseline (D49).
      findings: [{ path: 'src/router.ts', exceeded: 'all', line: 67, col: 2, line_count: 60, name: 'add', cyclomatic: 22, cognitive: 34 }],
      fan_in_p95: 6,
    },
    schema_version: 9,
  });
});

test('parseDead passes circular_dependencies, re_export_cycles, boundary_violations, unused_exports and unused_files through', () => {
  const parsed = parseDead(
    JSON.stringify({
      schema_version: 11,
      circular_dependencies: [{ cycle: ['a.ts', 'b.ts'] }],
      re_export_cycles: [],
      boundary_violations: [{ from: 'apps', to: 'libs' }],
      unused_exports: [],
      unused_files: [{ path: 'src/orphan.ts' }],
    }),
  );
  expect(parsed).toEqual({
    value: {
      circular_dependencies: [{ cycle: ['a.ts', 'b.ts'] }],
      re_export_cycles: [],
      boundary_violations: [{ from: 'apps', to: 'libs' }],
      unused_exports: [],
      unused_files: [{ path: 'src/orphan.ts' }],
    },
    schema_version: 11,
  });
});

test("parseDead keeps each finding of a captured fallow 3.35 report whole, the lines a dead red is held to included (D140)", () => {
  const parsed = parseDead(readFileSync(join(FIXTURE_REPO, 'dead-findings.json'), 'utf8'));

  expect(parsed?.schema_version).toBe(10);
  // A cycle's edges are the imports that close it, each on its own file's line; a re-export's import reads 1:0.
  expect(parsed?.value.circular_dependencies).toEqual([
    expect.objectContaining({ edges: [{ path: 'libs/core/src/a.ts', line: 3, col: 9 }, { path: 'libs/core/src/b.ts', line: 4, col: 9 }] }),
    expect.objectContaining({ edges: [{ path: 'libs/core/src/barrel/index.ts', line: 1, col: 0 }, { path: 'libs/core/src/barrel/one.ts', line: 1, col: 0 }] }),
    expect.objectContaining({ edges: [{ path: 'libs/core/src/e.ts', line: 2, col: 9 }, { path: 'libs/core/src/f.ts', line: 1, col: 0 }] }),
  ]);
  expect(parsed?.value.re_export_cycles).toEqual([expect.objectContaining({ files: ['libs/core/src/barrel/index.ts', 'libs/core/src/barrel/one.ts'] })]);
  expect(parsed?.value.boundary_violations).toEqual([
    expect.objectContaining({ from_path: 'libs/core/src/c.ts', to_path: 'apps/app/src/x.ts', line: 5, col: 9 }),
    expect.objectContaining({ from_path: 'libs/core/src/d.ts', to_path: 'apps/app/src/x.ts', line: 1, col: 0 }),
  ]);
  expect(parsed?.value.unused_exports).toEqual([expect.objectContaining({ path: 'libs/core/src/unused.ts', export_name: 'neverRead', line: 7 })]);
});

test('parseDupes passes clone_families through and records a fallow schema_version without rejecting it', () => {
  expect(parseDupes(JSON.stringify({ schema_version: 42, clone_families: [{ files: ['a.ts', 'b.ts'] }] }))).toEqual({
    value: { clone_families: [{ files: ['a.ts', 'b.ts'] }] },
    schema_version: 42,
  });
});

test("parseBaseline reads each check's keys as opaque strings, and the counts of the keys a capture found more than once (D49)", () => {
  const parsed = parseBaseline(
    JSON.stringify({
      schema_version: 1,
      slots: { dupes: ['dupes:dup:0ac5220b'], health: ['health:src/a.ts:run', '', 7], lint: [], prose: 'none' },
      captured_with: { health: { pin_source: 'package.json' } },
      counts: { health: { 'health:src/a.ts:run': 2, 'health:src/a.ts:odd': 1 }, dead: 'none' },
    }),
  );

  // A malformed entry is dropped, and a field atis does not read is ignored, as checkride's own reader does.
  expect(parsed).toEqual({
    slots: { dupes: ['dupes:dup:0ac5220b'], health: ['health:src/a.ts:run'], lint: [] },
    counts: { health: { 'health:src/a.ts:run': 2 } },
  });
  expect(parseBaseline(JSON.stringify({ schema_version: 1, slots: {} }))).toEqual({ slots: {} });
});

test('parseBaseline refuses a newer schema whole, rather than half reading it, and says why it read nothing (C2)', () => {
  expect(parseBaseline(JSON.stringify({ schema_version: 2, slots: {} }))).toEqual({ reason: 'checkride.baseline.json is schema_version 2, and atis reads 1' });
  expect(parseBaseline('{')).toEqual({ reason: 'checkride.baseline.json is not a JSON object' });
  expect(parseBaseline(JSON.stringify({ schema_version: 1 }))).toEqual({ reason: 'checkride.baseline.json has no slots' });
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
    { path: 'src/a.ts', statements: [{ line: 5, end: 5, hits: 2 }, { line: 9, end: 9, hits: 0 }] },
  ]);
});

test('parseCoverage carries a multi-line statement\'s end line beside its start, and leaves it off where the map gives none (D163)', () => {
  const covered = parseCoverage(
    JSON.stringify({
      '/repo/src/a.ts': {
        statementMap: {
          '0': { start: { line: 12, column: 2 }, end: { line: 16, column: null } },
          '1': { start: { line: 20 } },
        },
        s: { '0': 0, '1': 3 },
      },
    }),
    '/repo',
  );
  expect(covered).toEqual([
    { path: 'src/a.ts', statements: [{ line: 12, end: 16, hits: 0 }, { line: 20, hits: 3 }] },
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
        { name: 'lint', adapter: 'oxlint', ok: false, skipped: false },
        { name: 'struct', adapter: 'ast-grep', ok: false },
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
        { name: 'mutation', adapter: 'stryker', ok: true, skipped: false },
        { name: 'security', adapter: 'pnpm-audit', ok: true, skipped: true },
        { name: 'struct', adapter: 'ast-grep', ok: true, skipped: true },
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
  // tsc fills types, which atis reads only from the type checkers it places, so that slot alone is muted and named (D176, D180).
  expect(result.muted).toEqual(['types: atis has no parser for tsc']);
  expect(result.types).toBeUndefined();
  // vitest's coverage speaks for the files the TypeScript producer reads, and no other kind is ever a gap against it (D176).
  expect(result.coverage_extensions).toEqual(['.cjs', '.cts', '.js', '.jsx', '.mjs', '.mts', '.ts', '.tsx']);
});

test('health.json: file_scores, findings by path with the exceeded threshold and their lines, and fan_in_p95', () => {
  const result = expectCheck(fixtureResult);
  expect(result.health?.file_scores).toHaveLength(3);
  expect(result.health?.findings).toEqual([{ path: 'src/gate.ts', exceeded: 'cyclomatic', line: 42, col: 0, line_count: 95, name: 'runGate', cyclomatic: 28, cognitive: 22 }]);
  expect(result.health?.fan_in_p95).toBe(6);
});

test('dead.json and dupes.json: the five dead-code channels and clone_families, all clean here', () => {
  const result = expectCheck(fixtureResult);
  expect(result.dead).toEqual({ circular_dependencies: [], re_export_cycles: [], boundary_violations: [], unused_exports: [], unused_files: [] });
  expect(result.dupes).toEqual({ clone_families: [] });
});

test('security.json: metadata.vulnerabilities, and an empty advisories record as no advisories', () => {
  const result = expectCheck(fixtureResult);
  expect(result.security).toEqual({ vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0 }, advisories: [] });
});

test("security.json's advisories: each module, its severity and every path, the importer read as its manifest (D83)", () => {
  const security = parseSecurity(readFileSync(join(FIXTURE_REPO, 'security-advisories.json'), 'utf8'));
  expect(security?.vulnerabilities).toEqual({ info: 0, low: 0, moderate: 2, high: 1, critical: 0 });
  expect(security?.advisories).toEqual([
    {
      module: 'esbuild',
      severity: 'moderate',
      paths: [{ manifest: 'package.json', packages: ['drizzle-kit', '@esbuild-kit/esm-loader', '@esbuild-kit/core-utils', 'esbuild'] }],
    },
    {
      module: 'js-yaml',
      severity: 'moderate',
      // pnpm writes a member's importer with each `/` as `__`: `packages__docs` is `packages/docs`.
      paths: [
        { manifest: 'package.json', packages: ['markdownlint-cli2', 'js-yaml'] },
        { manifest: 'packages/docs/package.json', packages: ['markdownlint-cli2', 'js-yaml'] },
      ],
    },
    { module: 'undici', severity: 'high', paths: [{ manifest: 'package.json', packages: ['@robmclarty/volley', 'undici'] }] },
  ]);
});

test('a report with no advisories record names none, so nothing in it can be tied to a change (C2, D83)', () => {
  expect(parseSecurity(JSON.stringify({ metadata: { vulnerabilities: { high: 2 } } }))).toEqual({ vulnerabilities: { high: 2 } });
  // An advisory missing its module or severity, and a path with no package after its importer, name nothing.
  const sparse = parseSecurity(
    JSON.stringify({
      advisories: { 1: { severity: 'high', findings: [] }, 2: { module_name: 'qs', severity: 'low', findings: [{ paths: ['.', '.>express>qs'] }] } },
      metadata: { vulnerabilities: { high: 1, low: 1 } },
    }),
  );
  expect(sparse?.advisories).toEqual([{ module: 'qs', severity: 'low', paths: [{ manifest: 'package.json', packages: ['express', 'qs'] }] }]);
});

test('coverage/coverage-final.json and test.json: read because the test slot ran and was not skipped', () => {
  const result = expectCheck(fixtureResult);
  const adapters = result.coverage?.find((file) => file.path.endsWith('src/adapters.ts'));
  expect(adapters?.statements).toEqual([{ line: 15, end: 15, hits: 29 }, { line: 127, end: 148, hits: 29 }, { line: 155, end: 544, hits: 0 }]);
  expect(result.test?.results).toHaveLength(3);
  expect(result.test?.results.every((entry) => entry.status === 'passed')).toBe(true);
});

test('mutation.json exists on disk but "mutation" never appears in checks[]: never read (D41)', () => {
  const result = expectCheck(fixtureResult);
  expect(result.mutation).toBeUndefined();
});

// ---------------------------------------------------------------------------
// readCheck against checkride 0.19's own polyglot-stack, split into targets (D180)
// ---------------------------------------------------------------------------

let targetsResult: CheckInputs;

beforeAll(() => {
  targetsResult = readCheckDir(TARGETS_FIXTURE);
});

test("the polyglot capture reads as one summary: each target's checks of a slot are that slot, red where any is", () => {
  const result = expectCheck(targetsResult);
  expect(result.summary.ok).toBe(false);
  expect(result.summary.checks_run).toBe(8);
  expect(result.summary.checks).toEqual([
    { name: 'types', ok: false, skipped: false },
    { name: 'lint', ok: false, skipped: false },
    { name: 'struct', ok: false, skipped: false },
    { name: 'dead', ok: true, skipped: true },
    { name: 'test', ok: false, skipped: false },
    { name: 'docs', ok: true, skipped: true },
    { name: 'links', ok: true, skipped: false },
    { name: 'spell', ok: true, skipped: true },
    { name: 'unclaimed', ok: true, skipped: false },
  ]);
});

test("each target's findings are read by its own tool's parser and put on the repo's root: golangci-lint's on api/, shellcheck's on scripts/ (D176, D180)", () => {
  const result = expectCheck(targetsResult);
  expect(result.lint?.diagnostics).toEqual([
    { path: 'api/cmd/api/remove.go', severity: 'error' },
    { path: 'api/internal/greet/dot.go', severity: 'error' },
    // ShellCheck's level is info, but at its default severity every comment fails the check.
    { path: 'scripts/deploy.sh', severity: 'error' },
  ]);
});

test("go test's failing package stands for its _test.go file, and the run says why Go's files have no coverage, and which type checkers it cannot place (D176, C2)", () => {
  const result = expectCheck(targetsResult);
  // cmd/api has no test files, so its skip names no file.
  expect(result.test?.results).toEqual([{ path: 'api/internal/greet/greet_test.go', status: 'failed' }]);
  expect(result.coverage).toBeUndefined();
  expect(result.coverage_extensions).toBeUndefined();
  expect(result.types).toBeUndefined();
  expect(result.muted).toEqual([
    'coverage: go-test writes none, which api:test ran',
    'types: atis has no parser for tsc, which web:types ran',
    'types: atis has no parser for go-build, which api:types ran',
  ]);
});

test("a check of the repo as a whole reads from .check/'s root, its paths already on it: ast-grep's dot import in the Go service", () => {
  const result = expectCheck(targetsResult);
  expect(result.struct).toEqual({ matches: [{ path: 'api/internal/greet/dot.go', severity: 'error' }] });
  expect(result.stale).toEqual([]);
});

// ---------------------------------------------------------------------------
// readCheck: targets' directories, rebased paths and the merge (synthetic, D180)
// ---------------------------------------------------------------------------

/** A target's check as checkride 0.19 writes it into a split summary. */
function targetCheck(target: string, cwd: string, slot: string, adapter: string, ok = true): Readonly<Record<string, unknown>> {
  return { name: `${target}:${slot}`, target, slot, pack: 'ts', cwd, adapter, ok, exit_code: ok ? 0 : 1, duration_ms: 1, output_file: null };
}

/** A schema-1 summary of `checks`, written now with a run window an hour wide, so every file written beside it is this run's. */
function splitSummary(checks: readonly Readonly<Record<string, unknown>>[]): string {
  const ok = checks.every((check) => check['ok'] === true);
  return JSON.stringify({ schema_version: 1, ok, checks_run: checks.length, timestamp: new Date().toISOString(), total_duration_ms: 3_600_000, checks });
}

test("a target's files are read from its directory under .check/, and their paths put on the repo's root from where its check ran (D180)", () => {
  const root = tempRepo('targets');
  const at = (path: string): string => join(root, path);
  writeTree(root, {
    '.check/summary.json': splitSummary([
      targetCheck('web', 'apps/web', 'lint', 'oxlint', false),
      targetCheck('docs', 'docs', 'lint', 'oxlint'),
      targetCheck('web', 'apps/web', 'health', 'fallow'),
      targetCheck('web', 'apps/web', 'dead', 'fallow'),
      targetCheck('web', 'apps/web', 'test', 'vitest'),
      targetCheck('web', 'apps/web', 'security', 'pnpm-audit'),
    ]),
    '.check/web/lint.json': OXLINT_REPORT,
    '.check/docs/lint.json': JSON.stringify({ diagnostics: [{ filename: 'scripts/build.ts', severity: 'warning' }] }),
    '.check/web/health.json': JSON.stringify({
      schema_version: 9,
      file_scores: [{ path: 'src/a.ts', lines: 10, function_count: 1, maintainability_index: 80, crap_max: 2 }],
      findings: [{ path: './src/a.ts', exceeded: 'cyclomatic', line: 3, line_count: 5 }],
      target_thresholds: { fan_in_p95: 4 },
    }),
    '.check/web/dead.json': JSON.stringify({
      circular_dependencies: [{ files: ['src/a.ts', 'src/b.ts'], edges: [{ path: 'src/a.ts', line: 1 }] }],
      re_export_cycles: [],
      boundary_violations: [],
      unused_exports: [{ path: 'src/b.ts', export_name: 'gone', line: 2 }],
    }),
    '.check/web/test.json': JSON.stringify({ testResults: [{ name: at('apps/web/src/a.test.ts'), status: 'passed' }] }),
    '.check/web/coverage/coverage-final.json': JSON.stringify({ [at('apps/web/src/a.ts')]: { statementMap: { 0: { start: { line: 3 }, end: { line: 3 } } }, s: { 0: 1 } } }),
    '.check/web/security.json': JSON.stringify({
      metadata: { vulnerabilities: { high: 1 } },
      advisories: { 1: { module_name: 'qs', severity: 'high', findings: [{ paths: ['.>express>qs'] }] } },
    }),
  });
  const result = expectCheck(readCheck(root));
  rmSync(root, { recursive: true, force: true });

  expect(result.muted).toBeUndefined();
  expect(result.summary.checks.find((slot) => slot.name === 'lint')).toEqual({ name: 'lint', ok: false, skipped: false });
  expect(result.lint?.diagnostics).toEqual([
    { path: 'apps/web/src/a.ts', severity: 'warning' },
    { path: 'apps/web/src/b.ts', severity: 'error' },
    { path: 'docs/scripts/build.ts', severity: 'warning' },
  ]);
  expect(result.health?.file_scores.map((score) => score.path)).toEqual(['apps/web/src/a.ts']);
  expect(result.health?.findings.map((finding) => finding.path)).toEqual(['apps/web/src/a.ts']);
  expect(result.health?.fan_in_p95).toBe(4);
  expect(result.fallow_schemas).toEqual({ health: 9 });
  expect(result.dead?.circular_dependencies).toEqual([{ files: ['apps/web/src/a.ts', 'apps/web/src/b.ts'], edges: [{ path: 'apps/web/src/a.ts', line: 1 }] }]);
  expect(result.dead?.unused_exports).toEqual([{ path: 'apps/web/src/b.ts', export_name: 'gone', line: 2 }]);
  // istanbul's and vitest's absolute paths are made relative to the repo, which is the root already.
  expect(result.test?.results).toEqual([{ path: 'apps/web/src/a.test.ts', status: 'passed' }]);
  expect(result.coverage?.map((file) => file.path)).toEqual(['apps/web/src/a.ts']);
  // pnpm's importer `.` is the target's own manifest.
  expect(result.security?.advisories).toEqual([{ module: 'qs', severity: 'high', paths: [{ manifest: 'apps/web/package.json', packages: ['express', 'qs'] }] }]);
});

test("a slot one target fills with a tool atis cannot read is muted whole, and a channel one target never wrote is absent, so no target's files read as measured and clean (C2, D180)", () => {
  const root = tempRepo('targets-partial');
  const at = (path: string): string => join(root, path);
  const report = (path: string): string => JSON.stringify({ testResults: [{ name: at(path), status: 'passed' }] });
  writeTree(root, {
    '.check/summary.json': splitSummary([
      targetCheck('web', 'web', 'lint', 'oxlint', false),
      targetCheck('api', 'api', 'lint', 'clippy'),
      targetCheck('web', 'web', 'test', 'vitest'),
      targetCheck('docs', 'docs', 'test', 'vitest'),
    ]),
    '.check/web/lint.json': OXLINT_REPORT,
    '.check/api/lint.jsonl': '{"reason":"build-finished","success":true}\n',
    '.check/web/test.json': report('web/src/a.test.ts'),
    '.check/web/coverage/coverage-final.json': JSON.stringify({ [at('web/src/a.ts')]: { statementMap: {}, s: {} } }),
    '.check/docs/test.json': report('docs/src/b.test.ts'),
  });
  const result = expectCheck(readCheck(root));
  rmSync(root, { recursive: true, force: true });

  // web's oxlint report is readable, but the red it would scope may be the Rust crate's, which the reader cannot place.
  expect(result.lint).toBeUndefined();
  expect(result.muted).toEqual(['lint: atis has no parser for clippy, which api:lint ran']);
  // Both targets wrote a test report; only web wrote coverage, so docs' files would read as unmeasured gaps against it.
  expect(result.test?.results.map((entry) => entry.path)).toEqual(['docs/src/b.test.ts', 'web/src/a.test.ts']);
  expect(result.coverage).toBeUndefined();
});

test("a summary that never split still reads each file by its adapter: biome's lint.json never reaches oxlint's parser, knip's dead.json never fallow's, and jest's report reads as vitest's (D180)", () => {
  const root = tempRepo('adapters');
  writeTree(root, {
    '.check/summary.json': splitSummary([
      { name: 'lint', adapter: 'biome', ok: false, exit_code: 1, duration_ms: 1, output_file: 'lint.json' },
      { name: 'dead', adapter: 'knip', ok: true, exit_code: 0, duration_ms: 1, output_file: 'dead.json' },
      { name: 'test', adapter: 'jest', ok: true, exit_code: 0, duration_ms: 1, output_file: null },
    ]),
    // Biome's reporter has a diagnostics list too, so read by the slot's name it would pass for a clean oxlint run.
    '.check/lint.json': JSON.stringify({ summary: { errors: 1 }, diagnostics: [{ category: 'lint/style/useConst', severity: 'error', location: { path: { file: 'src/a.ts' } } }] }),
    '.check/dead.json': JSON.stringify({ files: ['src/old.ts'], issues: [] }),
    '.check/test.json': JSON.stringify({ numFailedTests: 0, testResults: [{ name: join(root, 'src/a.test.ts'), status: 'passed', assertionResults: [] }] }),
  });
  const result = expectCheck(readCheck(root));
  rmSync(root, { recursive: true, force: true });

  expect(result.lint).toBeUndefined();
  expect(result.dead).toBeUndefined();
  expect(result.muted).toEqual(['dead: atis has no parser for knip', 'lint: atis has no parser for biome']);
  expect(result.test?.results).toEqual([{ path: 'src/a.test.ts', status: 'passed' }]);
});

// ---------------------------------------------------------------------------
// go test's events: a package stands for its _test.go files (D176, D30)
// ---------------------------------------------------------------------------

test("parseGoTestEvents reads each package's outcome from its own action, never a test's, from captured go test -json output", () => {
  const red = readFileSync(join(TARGETS_FIXTURE, 'api', 'test.jsonl'), 'utf8');
  expect(parseGoTestEvents(red)).toEqual([
    { package: 'example.com/stack/api/cmd/api', status: 'skipped' },
    { package: 'example.com/stack/api/internal/greet', status: 'failed' },
  ]);
  // A passing run, as the example's green capture prints it: the test's pass, then the package's.
  const green = [
    '{"Time":"2026-10-28T11:57:47.515778-07:00","Action":"run","Package":"example.com/stack/api/internal/greet","Test":"TestHello"}',
    '{"Time":"2026-10-28T11:57:47.51581-07:00","Action":"pass","Package":"example.com/stack/api/internal/greet","Test":"TestHello","Elapsed":0}',
    '{"Time":"2026-10-28T11:57:47.517661-07:00","Action":"pass","Package":"example.com/stack/api/internal/greet","Elapsed":1.028}',
  ].join('\n');
  expect(parseGoTestEvents(green)).toEqual([{ package: 'example.com/stack/api/internal/greet', status: 'passed' }]);
  // A failing test whose package never reported names nothing, and text that holds no event is no run at all (C2).
  expect(parseGoTestEvents('{"Action":"fail","Package":"p","Test":"TestX"}\n')).toEqual([]);
  expect(parseGoTestEvents('ok  \texample.com/x\t0.1s\n')).toBeUndefined();
});

test("goModulePath reads a go.mod's module, quoted or not, and goWorkUses each directory a go.work uses, in either form", () => {
  expect(goModulePath('module example.com/stack/api\n\ngo 1.24\n')).toBe('example.com/stack/api');
  expect(goModulePath('// a comment\nmodule "example.com/quoted" // trailing\n')).toBe('example.com/quoted');
  expect(goModulePath('go 1.24\n')).toBeUndefined();
  expect(goWorkUses('go 1.24\n\nuse ./tools\nuse (\n\t./svc // the service\n\t"./lib"\n)\n')).toEqual(['./tools', './svc', './lib']);
});

test("readGoTestResults puts each package of a workspace in its module's directory, on every _test.go file there, and names nothing outside one", () => {
  const root = writeTree(tempRepo('go-work'), {
    'go/go.work': 'go 1.24\n\nuse (\n\t./svc\n\t./lib\n)\n',
    'go/svc/go.mod': 'module example.com/svc\n',
    'go/svc/internal/store/store_test.go': 'package store\n',
    'go/svc/internal/store/extra_test.go': 'package store\n',
    'go/svc/internal/store/store.go': 'package store\n',
    'go/lib/go.mod': 'module example.com/svc/lib\n',
    'go/lib/text_test.go': 'package lib\n',
  });
  const events = [
    { Action: 'fail', Package: 'example.com/svc/internal/store' },
    // The longer module path wins: lib is its own module, not a package of svc.
    { Action: 'pass', Package: 'example.com/svc/lib' },
    { Action: 'pass', Package: 'example.com/elsewhere' },
  ]
    .map((event) => JSON.stringify(event))
    .join('\n');
  const report = readGoTestResults(events, root, 'go');
  rmSync(root, { recursive: true, force: true });
  expect(report).toEqual({
    results: [
      { path: 'go/lib/text_test.go', status: 'passed' },
      { path: 'go/svc/internal/store/extra_test.go', status: 'failed' },
      { path: 'go/svc/internal/store/store_test.go', status: 'failed' },
    ],
  });
});

// ---------------------------------------------------------------------------
// the other packs' findings, read through checkride's own parsers (D176)
// ---------------------------------------------------------------------------

/** The files `findings` name, each once, in the order they come. */
function files(findings: readonly { readonly path: string }[] | undefined): readonly string[] {
  return [...new Set((findings ?? []).map((finding) => finding.path))];
}

/** One of checkride's captures, its scratch repo's absolute paths moved onto `root`, where the test lays it. */
function captured(name: string, root: string): string {
  const text = readFileSync(join(TARGETS_REPO, 'findings', name), 'utf8');
  return ['/private/tmp/fixture-repo', '/tmp/fixture-repo', '/private/tmp/fixture-tf', '/tmp/fixture-tf'].reduce((moved, from) => moved.replaceAll(from, root), text);
}

test("ruff and mypy, tflint, terraform validate and trivy, and staticcheck are read by checkride's parsers onto their targets: lint, types and security name the files they flag (D176)", () => {
  const root = tempRepo('packs');
  const target = (name: string, slot: string, adapter: string): Readonly<Record<string, unknown>> => ({ ...targetCheck(name, name, slot, adapter, false), pack: name });
  writeTree(root, {
    '.check/summary.json': splitSummary([
      target('py', 'lint', 'ruff'),
      target('py', 'types', 'mypy'),
      target('infra', 'lint', 'tflint'),
      target('infra', 'types', 'terraform-validate'),
      target('infra', 'security', 'trivy-config'),
      target('svc', 'lint', 'staticcheck'),
    ]),
    '.check/py/lint.json': captured('findings-ruff.json', root),
    '.check/py/types.jsonl': captured('findings-mypy.jsonl', root),
    '.check/infra/lint.json': captured('findings-tflint.json', root),
    '.check/infra/types.json': captured('findings-terraform-validate.json', root),
    '.check/infra/security.json': captured('findings-trivy-config.json', root),
    '.check/svc/lint.jsonl': captured('findings-staticcheck.jsonl', root),
  });
  const result = expectCheck(readCheck(root));
  rmSync(root, { recursive: true, force: true });

  expect(result.muted).toBeUndefined();
  expect(files(result.lint?.diagnostics)).toEqual(['infra/main.tf', 'infra/modules/bucket/main.tf', 'infra/modules/greet/main.tf', 'py/src/kit/__init__.py', 'svc/internal/store/store.go']);
  // terraform validate's warning and mypy's note could not fail their checks, so they read as warnings beside the errors that did.
  expect(result.types?.diagnostics).toEqual([
    { path: 'infra/main.tf', severity: 'error' },
    { path: 'infra/main.tf', severity: 'warning' },
    { path: 'infra/modules/greet/main.tf', severity: 'error' },
    { path: 'py/src/kit/__init__.py', severity: 'error' },
    { path: 'py/src/kit/__init__.py', severity: 'error' },
    { path: 'py/src/kit/__init__.py', severity: 'warning' },
  ]);
  // A config scanner names files, not packages, and counts none (C2).
  expect(result.security?.vulnerabilities).toEqual({});
  expect(result.security?.advisories).toBeUndefined();
  expect(files(result.security?.findings)).toEqual(['infra/main.tf', 'infra/modules/bucket/main.tf']);
});

test('basedpyright at the root of a repo that never split reads its findings onto the paths it printed', () => {
  const root = tempRepo('basedpyright');
  writeTree(root, {
    '.check/summary.json': splitSummary([{ name: 'types', adapter: 'basedpyright', pack: 'python', ok: false, exit_code: 1, duration_ms: 1, output_file: 'types.json' }]),
    '.check/types.json': captured('findings-basedpyright.json', root),
  });
  const result = expectCheck(readCheck(root));
  rmSync(root, { recursive: true, force: true });
  expect(result.types?.diagnostics.map((finding) => finding.path)).toContain('py/src/kit/__init__.py');
  expect(result.types?.diagnostics.some((finding) => finding.severity === 'error')).toBe(true);
});

test("a pytest run counts as its check's verdict alone beside vitest's report and coverage, which speak only for the TypeScript producer's files (D176)", () => {
  const root = tempRepo('pytest');
  writeTree(root, {
    '.check/summary.json': splitSummary([targetCheck('web', 'web', 'test', 'vitest'), { ...targetCheck('py', 'py', 'test', 'pytest', false), pack: 'python' }]),
    '.check/web/test.json': JSON.stringify({ testResults: [{ name: join(root, 'web/src/a.test.ts'), status: 'passed' }] }),
    '.check/web/coverage/coverage-final.json': JSON.stringify({ [join(root, 'web/src/a.ts')]: { statementMap: {}, s: {} } }),
  });
  const result = expectCheck(readCheck(root));
  rmSync(root, { recursive: true, force: true });

  expect(result.summary.checks).toEqual([{ name: 'test', ok: false, skipped: false }]);
  expect(result.test?.results).toEqual([{ path: 'web/src/a.test.ts', status: 'passed' }]);
  expect(result.coverage?.map((file) => file.path)).toEqual(['web/src/a.ts']);
  expect(result.coverage_extensions).toContain('.ts');
  expect(result.coverage_extensions).not.toContain('.py');
  expect(result.muted).toEqual([
    'coverage: pytest writes none, which py:test ran',
    'test: pytest writes no report, which py:test ran, so the run counts as its verdict alone',
  ]);
});
