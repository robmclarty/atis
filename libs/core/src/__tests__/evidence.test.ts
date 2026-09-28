import { expect, test } from 'vitest';

import { DEFAULT_CONFIG } from '../config.js';
import { HARNESS_BROKEN, UNKNOWN_STATUS, computeCategory, computeEvidence } from '../evidence.js';
import type { CheckArtifacts, CheckSummarySlot, Dead, EvidenceInputs, FileEvidence } from '../evidence.js';
import { identifyGroups } from '../groups.js';
import { identifyModules } from '../modules.js';
import type { ImportEdge, ScannedFile } from '../modules.js';
import { computeReach } from '../reach.js';
import type { DiffFile } from '../reach.js';
import type { ChangeKind, Checks, Hunk } from '../schema.js';

const TIMESTAMP = '2026-09-17T05:52:40.668Z';

/** The whole repository a test measures against: its files, and who imports whom. */
type World = {
  readonly files: readonly string[];
  readonly head: readonly ImportEdge[];
  /** The base graph; the same as the head graph unless the test is about a deleted file. */
  readonly base?: readonly ImportEdge[];
};

/** `'a > b'`: `a` imports `b`. */
function imports(...pairs: readonly string[]): ImportEdge[] {
  return pairs.map((pair) => {
    const [from = '', to = ''] = pair.split(' > ');
    return { from, to };
  });
}

/**
 * Three cells in a chain, the shape D5 is about: the `pm` folder cell entered
 * through its barrel, the single-file cell `doctor.ts`, and the package barrel
 * above them. The barrel re-exports `tools.ts` alone, so `util.ts`, reached
 * only by the internal leaf `probe.ts`, is the contained change; `gone.ts` is
 * there to be deleted.
 */
const HEAD_IMPORTS = [
  'src/index.ts > src/doctor.ts',
  'src/doctor.ts > src/pm/index.ts',
  'src/pm/index.ts > src/pm/tools.ts',
  'src/pm/probe.ts > src/pm/util.ts',
  'src/__tests__/tools.test.ts > src/pm/tools.ts',
  'src/__tests__/other.test.ts > src/pm/tools.ts',
];

const CHAIN: World = {
  files: [
    'src/index.ts',
    'src/doctor.ts',
    'src/pm/index.ts',
    'src/pm/tools.ts',
    'src/pm/util.ts',
    'src/pm/probe.ts',
    'src/pm/gone.ts',
    'src/__tests__/tools.test.ts',
    'src/__tests__/other.test.ts',
  ],
  head: imports(...HEAD_IMPORTS),
  // The base still had `gone.ts`, and the head graph lost it with the file.
  base: imports(...HEAD_IMPORTS, 'src/pm/tools.ts > src/pm/gone.ts', 'src/__tests__/tools.test.ts > src/pm/gone.ts'),
};

function change(path: string, hunks: readonly Hunk[] = [{ start: 10, count: 4 }], kind: ChangeKind = 'modified'): DiffFile {
  return { path, kind, added: 4, deleted: 1, hunks };
}

type Ran = Extract<CheckArtifacts, { mode: 'check' }>;
type Channels = Omit<Ran, 'mode' | 'summary' | 'fallow_schemas' | 'stale'>;

function slot(name: string, ok = true, skipped = false): CheckSummarySlot {
  return { name, ok, skipped };
}

const GREEN: readonly CheckSummarySlot[] = [slot('types'), slot('test'), slot('dead')];

/** A trusted `.check/`: the given channels, over a summary whose slots are green unless the test says otherwise. */
function ran(channels: Channels = {}, checks: readonly CheckSummarySlot[] = GREEN, checksRun = checks.length): CheckArtifacts {
  return {
    mode: 'check',
    summary: {
      ok: checks.every((entry) => entry.ok),
      checks_run: checksRun,
      timestamp: TIMESTAMP,
      total_duration_ms: 1_000,
      checks,
    },
    fallow_schemas: {},
    stale: [],
    ...channels,
  };
}

const NO_DEAD: Dead = {
  circular_dependencies: [],
  re_export_cycles: [],
  boundary_violations: [],
  unused_exports: [],
};

/** Coverage of `src/pm/tools.ts` with one statement outside the hunk, two sharing line 11, and one uncovered inside it. */
const TOOLS_COVERAGE: Channels = {
  coverage: [
    {
      path: 'src/pm/tools.ts',
      statements: [
        { line: 9, hits: 5 },
        { line: 10, hits: 3 },
        { line: 11, hits: 0 },
        { line: 11, hits: 2 },
        { line: 13, hits: 0 },
        { line: 20, hits: 0 },
      ],
    },
  ],
};

/** Every changed line of `src/pm/tools.ts` covered: the closed skin of §5.2. */
const TOOLS_CLOSED: Channels = {
  coverage: [{ path: 'src/pm/tools.ts', statements: [{ line: 10, hits: 1 }, { line: 12, hits: 4 }] }],
};

/** The composition `buildMap` will use: place the changed set, then read the evidence off it. */
function inputsFor(world: World, changed: readonly DiffFile[], check: CheckArtifacts): EvidenceInputs {
  const scanned = world.files.map((path): ScannedFile => ({ path, loc: 10, exports: [] }));
  const modules = identifyModules(scanned, world.head, []);
  const groups = identifyGroups(scanned, DEFAULT_CONFIG.groups, []);
  const baseEdges = world.base ?? world.head;
  const placed = computeReach({ changed, modules, groups, headEdges: world.head, baseEdges });
  return { changed: placed.changed, modules, groups, headEdges: world.head, baseEdges, check };
}

function evidenceFor(world: World, changed: readonly DiffFile[], check: CheckArtifacts): ReturnType<typeof computeEvidence> {
  return computeEvidence(inputsFor(world, changed, check));
}

function fileAt(files: readonly FileEvidence[], path: string): FileEvidence {
  const found = files.find((file) => file.path === path);
  if (found === undefined) throw new Error(`no evidence for ${path}`);
  return found;
}

/** Evidence into category, the way step 12 chains them. */
function categoryFor(world: World, changed: readonly DiffFile[], check: CheckArtifacts): Checks {
  const inputs = inputsFor(world, changed, check);
  const { files } = computeEvidence(inputs);
  return computeCategory({ check, changed: inputs.changed, files, config: DEFAULT_CONFIG });
}

test('patch coverage measures the statements inside the head-side hunks, folded onto lines as istanbul folds them', () => {
  const { evidence } = evidenceFor(CHAIN, [change('src/pm/tools.ts')], ran(TOOLS_COVERAGE));

  expect(evidence.patch_coverage).toEqual([
    {
      path: 'src/pm/tools.ts',
      // Lines 10, 11 and 13 of the hunk carry statements; line 12 carries none and is not executable.
      // Line 11's two statements fold to the higher hit count, so a line one of them ran is covered.
      changed_executable: 3,
      covered: 2,
      uncovered_lines: [13],
    },
  ]);
  // Line 9 ran and line 20 did not, and neither is this change's business.
  expect(evidence.patch_coverage?.[0]?.uncovered_lines).not.toContain(20);
});

test('a file the coverage report never names has no patch coverage, and a run without coverage has no channel at all', () => {
  const named = evidenceFor(CHAIN, [change('src/pm/tools.ts'), change('src/pm/util.ts')], ran(TOOLS_COVERAGE));

  // The channel ran, so it is present, and it says nothing about the file it never measured (C2).
  expect(named.evidence.patch_coverage?.map((entry) => entry.path)).toEqual(['src/pm/tools.ts']);
  expect(fileAt(named.files, 'src/pm/util.ts').coverage).toBeUndefined();

  const unmeasured = evidenceFor(CHAIN, [change('src/pm/tools.ts')], ran());
  expect(unmeasured.evidence.patch_coverage).toBeUndefined();
  expect(Object.keys(unmeasured.evidence)).toEqual([]);
});

test('only survived and no-coverage mutants on the changed lines count, and they do not need coverage to be read', () => {
  const { evidence } = evidenceFor(
    CHAIN,
    [change('src/pm/tools.ts')],
    ran({
      mutation: [
        {
          path: 'src/pm/tools.ts',
          mutants: [
            { line: 11, status: 'Survived' },
            { line: 12, status: 'NoCoverage' },
            { line: 10, status: 'Killed' },
            { line: 11, status: 'Ignored' },
            { line: 40, status: 'Survived' },
          ],
        },
      ],
    }),
  );

  expect(evidence.mutants).toEqual([
    { path: 'src/pm/tools.ts', line: 11, status: 'Survived' },
    { path: 'src/pm/tools.ts', line: 12, status: 'NoCoverage' },
  ]);
});

test('every test file importing the change is a stitch, torn when it failed and unknown when the run never named it', () => {
  const { evidence } = evidenceFor(
    CHAIN,
    [change('src/pm/tools.ts')],
    ran({ test: { results: [{ path: 'src/__tests__/tools.test.ts', status: 'failed' }] } }),
  );

  expect(evidence.stitches).toEqual([
    // The test that ran and failed: the torn stitch of §5.2.
    { test: 'src/__tests__/other.test.ts', targets: ['src/pm/tools.ts'], status: UNKNOWN_STATUS },
    { test: 'src/__tests__/tools.test.ts', targets: ['src/pm/tools.ts'], status: 'failed' },
  ]);
});

test('a deleted file is stitched through the base graph, where the tests that imported it still live', () => {
  const { evidence } = evidenceFor(
    CHAIN,
    [change('src/pm/gone.ts', [], 'deleted')],
    ran({ test: { results: [{ path: 'src/__tests__/tools.test.ts', status: 'passed' }] } }),
  );

  expect(evidence.stitches).toEqual([
    { test: 'src/__tests__/tools.test.ts', targets: ['src/pm/gone.ts'], status: 'passed' },
  ]);
});

test('a run with no test report has no stitches, rather than stitches with a made-up status', () => {
  const { evidence } = evidenceFor(CHAIN, [change('src/pm/tools.ts')], ran(TOOLS_COVERAGE));

  expect(evidence.stitches).toBeUndefined();
  expect(Object.keys(evidence)).toEqual(['patch_coverage']);
});

test('reach is counted per changed file, and a changed barrel read from another cell has escaped', () => {
  const { files } = evidenceFor(
    CHAIN,
    [change('src/pm/tools.ts'), change('src/pm/util.ts'), change('src/pm/index.ts'), change('README.md')],
    ran(),
  );

  // `tools.ts` climbs out through the barrel, into `doctor.ts`, into the package barrel: three cells.
  expect(fileAt(files, 'src/pm/tools.ts').cells_reached).toBe(3);
  // Nothing outside `pm` imports `util.ts`, so the change stays in its own cell: the deep-module payoff.
  expect(fileAt(files, 'src/pm/util.ts').cells_reached).toBe(1);
  // A shore file is not terrain and reaches no cell at all (D48).
  expect(fileAt(files, 'README.md').cells_reached).toBe(0);

  expect(files.map((file) => `${file.path} ${String(file.escaped_interface)}`)).toEqual([
    'README.md false',
    // The barrel `doctor.ts` imports: its exports are consumed outside its cell.
    'src/pm/index.ts true',
    'src/pm/tools.ts false',
    'src/pm/util.ts false',
  ]);
});

test('a changed barrel nothing outside its cell imports has not escaped', () => {
  const solo: World = {
    files: ['src/solo/index.ts', 'src/solo/impl.ts'],
    head: imports('src/solo/index.ts > src/solo/impl.ts'),
  };
  const { files } = evidenceFor(solo, [change('src/solo/index.ts')], ran());

  expect(fileAt(files, 'src/solo/index.ts').escaped_interface).toBe(false);
});

test('checks green, evidence closed and nothing escaped is VFR', () => {
  const checks = categoryFor(CHAIN, [change('src/pm/tools.ts')], ran(TOOLS_CLOSED));

  expect(checks.category).toBe('VFR');
  expect(checks.checks_run).toBe(3);
  expect(checks.timestamp).toBe(TIMESTAMP);
  expect(checks.reason).toBeUndefined();
  expect(checks.slots).toEqual([
    { name: 'dead', ok: true, skipped: false, scope: 'global' },
    { name: 'test', ok: true, skipped: false, scope: 'global' },
    { name: 'types', ok: true, skipped: false, scope: 'global' },
  ]);
});

test('one gap is MVFR while nothing is red, and the same gap on a high-reach file is IFR', () => {
  // `util.ts` is read only inside its own cell: one gap, one cell, a look rather than instruments.
  expect(
    categoryFor(CHAIN, [change('src/pm/util.ts')], ran({ coverage: [{ path: 'src/pm/util.ts', statements: [{ line: 10, hits: 0 }] }] }))
      .category,
  ).toBe('MVFR');

  // The identical gap on the file whose reach crosses three cells: D27's *high reach*.
  expect(
    categoryFor(CHAIN, [change('src/pm/tools.ts')], ran({ coverage: [{ path: 'src/pm/tools.ts', statements: [{ line: 10, hits: 0 }] }] }))
      .category,
  ).toBe('IFR');
});

test('an escaped interface with no gap anywhere is MVFR', () => {
  const checks = categoryFor(
    CHAIN,
    [change('src/pm/index.ts')],
    ran({ coverage: [{ path: 'src/pm/index.ts', statements: [{ line: 10, hits: 2 }] }] }),
  );

  expect(checks.category).toBe('MVFR');
});

test('any red slot is IFR, and a skipped slot is not red', () => {
  const red = categoryFor(CHAIN, [change('src/pm/tools.ts')], ran(TOOLS_CLOSED, [slot('types'), slot('lint', false)]));
  expect(red.category).toBe('IFR');

  const skipped = categoryFor(CHAIN, [change('src/pm/tools.ts')], ran(TOOLS_CLOSED, [slot('types'), slot('mutation', false, true)]));
  expect(skipped.category).toBe('VFR');
});

test('a summary that ran no check at all is LIFR, however green it claims to be', () => {
  const checks = categoryFor(CHAIN, [change('src/pm/tools.ts')], ran(TOOLS_CLOSED, GREEN, 0));

  expect(checks.category).toBe('LIFR');
  expect(checks.checks_run).toBe(0);
});

test('a summary that claimed schema 1 and then failed its shape is a broken harness, which is LIFR and not NOINST', () => {
  const checks = categoryFor(CHAIN, [change('src/pm/tools.ts')], { mode: 'git-only', reason: HARNESS_BROKEN });

  expect(checks).toEqual({ category: 'LIFR', checks_run: 0, reason: HARNESS_BROKEN, slots: [] });
});

test('a cycle or a boundary violation touching a changed file is LIFR; one that misses the change is not', () => {
  const cycle = {
    files: ['src/pm/tools.ts', 'src/doctor.ts'],
    length: 2,
    edges: [{ path: 'src/pm/tools.ts', line: 1, col: 9 }],
  };
  const violation = { from_path: 'src/doctor.ts', to_path: 'src/pm/util.ts', from_zone: 'app', to_zone: 'lib', line: 5 };

  const touched = categoryFor(
    CHAIN,
    [change('src/pm/tools.ts')],
    ran({ dead: { ...NO_DEAD, circular_dependencies: [cycle] }, ...TOOLS_CLOSED }),
  );
  expect(touched.category).toBe('LIFR');

  const crossed = categoryFor(CHAIN, [change('src/pm/util.ts')], ran({ dead: { ...NO_DEAD, boundary_violations: [violation] }, ...TOOLS_CLOSED }));
  expect(crossed.category).toBe('LIFR');

  // The same cycle, on a change that touches neither end of it.
  const missed = categoryFor(CHAIN, [change('src/pm/util.ts')], ran({ dead: { ...NO_DEAD, circular_dependencies: [cycle] }, ...TOOLS_CLOSED }));
  expect(missed.category).toBe('VFR');
});

test('no .check/ is NOINST with the reason it was not read, never green and never a red', () => {
  const checks = categoryFor(CHAIN, [change('src/pm/tools.ts')], { mode: 'git-only', reason: '.check/ is absent' });

  expect(checks).toEqual({ category: 'NOINST', checks_run: 0, reason: '.check/ is absent', slots: [] });
});

test('a red slot is scoped to the paths its own output names, for the six slots whose output is about files', () => {
  const checks = categoryFor(
    CHAIN,
    [change('src/pm/tools.ts')],
    ran(
      {
        test: {
          results: [
            { path: 'src/__tests__/tools.test.ts', status: 'failed' },
            { path: 'src/__tests__/other.test.ts', status: 'passed' },
          ],
        },
        health: { file_scores: [], findings: [{ path: 'src/doctor.ts', exceeded: 'cyclomatic' }] },
        dead: { ...NO_DEAD, unused_exports: [{ path: 'src/pm/util.ts', name: 'helper', line: 4 }] },
        dupes: {
          clone_families: [
            { files: ['src/pm/tools.ts', 'src/doctor.ts'], groups: [{ instances: [{ file: 'src/index.ts', start_line: 1 }] }] },
          ],
        },
        lint: { diagnostics: [{ path: 'src/pm/probe.ts', severity: 'error' }] },
        struct: { matches: [{ path: 'src/pm/util.ts', severity: 'error' }] },
      },
      [
        slot('test', false),
        slot('health', false),
        slot('dead', false),
        slot('dupes', false),
        slot('lint', false),
        slot('struct', false),
        slot('types', false),
      ],
    ),
  );

  expect(Object.fromEntries(checks.slots.map((entry) => [entry.name, entry.scope]))).toEqual({
    // Only the test that failed; the one that passed is not where the storm is.
    test: ['src/__tests__/tools.test.ts'],
    health: ['src/doctor.ts'],
    dead: ['src/pm/util.ts'],
    // A clone family names its files directly and its instances one level down; both, deduplicated and sorted.
    dupes: ['src/doctor.ts', 'src/index.ts', 'src/pm/tools.ts'],
    lint: ['src/pm/probe.ts'],
    struct: ['src/pm/util.ts'],
    // `types` has no raw output about files, so its storm marker covers the whole field.
    types: 'global',
  });
});

test('a red lint naming one changed file among warnings elsewhere is scoped to that file alone (D67)', () => {
  const checks = categoryFor(
    CHAIN,
    [change('src/pm/tools.ts')],
    ran(
      {
        ...TOOLS_CLOSED,
        lint: {
          diagnostics: [
            { path: 'src/doctor.ts', severity: 'warning' },
            { path: 'src/pm/tools.ts', severity: 'error' },
            { path: 'src/pm/tools.ts', severity: 'error' },
          ],
        },
      },
      [slot('types'), slot('lint', false)],
    ),
  );

  // The error is what failed the slot; the warning on `doctor.ts` did not.
  expect(checks.slots.find((entry) => entry.name === 'lint')?.scope).toEqual(['src/pm/tools.ts']);
});

test('a red lint or struct with no error among its findings was failed by its warnings, so every one names its file', () => {
  const checks = categoryFor(
    CHAIN,
    [change('src/pm/tools.ts')],
    ran(
      {
        struct: {
          matches: [
            { path: 'src/pm/util.ts', severity: 'warning' },
            { path: 'src/doctor.ts', severity: 'hint' },
          ],
        },
      },
      [slot('struct', false)],
    ),
  );

  expect(checks.slots).toEqual([{ name: 'struct', ok: false, skipped: false, scope: ['src/doctor.ts', 'src/pm/util.ts'] }]);
});

test('a red slot whose own output was never read, or named no file, stays global rather than guessing at a scope', () => {
  const unread = categoryFor(
    CHAIN,
    [change('src/pm/tools.ts')],
    ran({}, [slot('test', false), slot('dead', false), slot('lint', false), slot('struct', false)]),
  );
  expect(unread.slots.map((entry) => entry.scope)).toEqual(['global', 'global', 'global', 'global']);

  // Clean reports under red slots: each failed on something its findings do not show.
  const empty = categoryFor(CHAIN, [change('src/pm/tools.ts')], ran({ lint: { diagnostics: [] }, struct: { matches: [] } }, [slot('lint', false), slot('struct', false)]));
  expect(empty.slots.map((entry) => entry.scope)).toEqual(['global', 'global']);
});
