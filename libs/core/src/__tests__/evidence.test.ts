import { expect, test } from 'vitest';

import { DEFAULT_CONFIG } from '../config.js';
import { HARNESS_BROKEN, UNKNOWN_STATUS, computeCategory, computeEvidence, readRedSplit, splitRedSlots } from '../evidence.js';
import type { CheckArtifacts, CheckSummarySlot, Dead, EvidenceInputs, FileEvidence, Health, RedSplit } from '../evidence.js';
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

/** Evidence into category, the way `buildMap` chains them, stitches and all. */
function categoryFor(world: World, changed: readonly DiffFile[], check: CheckArtifacts): Checks {
  const inputs = inputsFor(world, changed, check);
  const { evidence, files } = computeEvidence(inputs);
  return computeCategory({ check, changed: inputs.changed, files, stitches: evidence.stitches ?? [], config: DEFAULT_CONFIG });
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

test('a red slot naming a changed file is IFR, and a skipped slot is not red (D69)', () => {
  const red = categoryFor(
    CHAIN,
    [change('src/pm/tools.ts')],
    ran({ ...TOOLS_CLOSED, lint: { diagnostics: [{ path: 'src/pm/tools.ts', severity: 'error' }] } }, [slot('types'), slot('lint', false)]),
  );
  expect(red.category).toBe('IFR');

  const skipped = categoryFor(CHAIN, [change('src/pm/tools.ts')], ran(TOOLS_CLOSED, [slot('types'), slot('mutation', false, true)]));
  expect(skipped.category).toBe('VFR');
});

test('a red slot naming only untouched files, and a global red slot, each leave an otherwise VFR change VFR (D69)', () => {
  const untouched = categoryFor(
    CHAIN,
    [change('src/pm/tools.ts')],
    ran({ ...TOOLS_CLOSED, lint: { diagnostics: [{ path: 'src/doctor.ts', severity: 'error' }] } }, [slot('types'), slot('lint', false)]),
  );
  expect(untouched.category).toBe('VFR');
  // The slot is still reported, scoped to the file it named and on the change through none: standing state is counted beside the category, never hidden (D70).
  expect(untouched.slots).toContainEqual({ name: 'lint', ok: false, skipped: false, scope: ['src/doctor.ts'], change: [] });

  // A red `types` has no raw output about files, so it is global, and global red is standing state.
  const global = categoryFor(CHAIN, [change('src/pm/tools.ts')], ran(TOOLS_CLOSED, [slot('types', false), slot('lint')]));
  expect(global.category).toBe('VFR');
});

test('a torn stitch puts a red test slot on the change, though the failing test is not itself a changed file', () => {
  const failing = { test: { results: [{ path: 'src/__tests__/tools.test.ts', status: 'failed' }] } };

  // `tools.test.ts` imports the changed `tools.ts` and failed: the stitch tore on the change.
  const torn = categoryFor(CHAIN, [change('src/pm/tools.ts')], ran({ ...TOOLS_CLOSED, ...failing }, [slot('types'), slot('test', false)]));
  expect(torn.category).toBe('IFR');

  // The same failure on a change it imports nothing of is standing state: `util.ts` has no test.
  const standing = categoryFor(
    CHAIN,
    [change('src/pm/util.ts')],
    ran({ coverage: [{ path: 'src/pm/util.ts', statements: [{ line: 10, hits: 1 }] }], ...failing }, [slot('types'), slot('test', false)]),
  );
  expect(standing.category).toBe('VFR');
});

test("checkride PR 2's shape reads MVFR on its own evidence: all four red slots are standing state (D69)", () => {
  const checks = categoryFor(
    CHAIN,
    // One changed file whose reach stays in its own cell, with one uncovered changed line.
    [change('src/pm/util.ts')],
    ran(
      {
        coverage: [{ path: 'src/pm/util.ts', statements: [{ line: 10, hits: 3 }, { line: 12, hits: 0 }] }],
        dead: NO_DEAD,
        dupes: { clone_families: [{ files: ['src/doctor.ts', 'src/index.ts'] }] },
        health: {
          file_scores: [],
          findings: [
            { path: 'src/doctor.ts', exceeded: 'crap', line: 12, line_count: 30 },
            { path: 'src/pm/probe.ts', exceeded: 'cognitive', line: 4, line_count: 18 },
          ],
        },
      },
      [
        slot('dead', false),
        slot('dupes', false),
        slot('health', false),
        slot('lint'),
        slot('snippets', false),
        slot('test'),
        slot('types'),
      ],
    ),
  );

  expect(checks.category).toBe('MVFR');
  expect(readRedSplit(checks.slots)).toEqual({
    change: [],
    standing: [
      { name: 'dead', global: true, change: [], named: [] },
      { name: 'dupes', global: false, change: [], named: ['src/doctor.ts', 'src/index.ts'] },
      { name: 'health', global: false, change: [], named: ['src/doctor.ts', 'src/pm/probe.ts'] },
      { name: 'snippets', global: true, change: [], named: [] },
    ],
  });
});

test('the split keeps each red slot in one list and puts it on the change only through the changed files behind it', () => {
  const split = splitRedSlots({
    slots: [
      { name: 'types', ok: false, skipped: false, scope: 'global' },
      { name: 'health', ok: false, skipped: false, scope: ['src/doctor.ts', 'src/pm/tools.ts'] },
      { name: 'test', ok: false, skipped: false, scope: ['src/__tests__/other.test.ts', 'src/__tests__/tools.test.ts'] },
      { name: 'lint', ok: true, skipped: false, scope: 'global' },
      { name: 'mutation', ok: false, skipped: true, scope: 'global' },
    ],
    changed: [change('src/pm/tools.ts'), change('src/pm/util.ts')],
    stitches: [
      { test: 'src/__tests__/tools.test.ts', targets: ['src/pm/tools.ts', 'src/pm/util.ts'], status: 'failed' },
      // A stitch that held is no tear, even under a red `test`.
      { test: 'src/__tests__/other.test.ts', targets: ['src/pm/util.ts'], status: 'passed' },
    ],
    spans: new Map([
      [
        'health',
        [
          { path: 'src/doctor.ts', start: 1, end: 40 },
          { path: 'src/pm/tools.ts', start: 8, end: 20 },
        ],
      ],
    ]),
  });

  expect(split).toEqual({
    change: [
      // On the change through `tools.ts`, whose function spans the hunk; the untouched `doctor.ts` it also names is standing state.
      { name: 'health', global: false, change: ['src/pm/tools.ts'], named: ['src/doctor.ts', 'src/pm/tools.ts'] },
      // The torn stitch carries the red onto both files it imports; the test it tore in is not itself the change.
      {
        name: 'test',
        global: false,
        change: ['src/pm/tools.ts', 'src/pm/util.ts'],
        named: ['src/__tests__/other.test.ts', 'src/__tests__/tools.test.ts'],
      },
    ],
    // A green slot and a skipped one are in neither list.
    standing: [{ name: 'types', global: true, change: [], named: [] }],
  });
});

const ROUTER = 'src/router/reg-exp-router/router.ts';
const NODE = 'src/router/reg-exp-router/node.ts';

/** hono's reg-exp router at #5266's review commit: its entry reads the router, which reads the trie's nodes. */
const HONO: World = {
  files: ['src/router/reg-exp-router/index.ts', ROUTER, NODE],
  head: imports(`src/router/reg-exp-router/index.ts > ${ROUTER}`, `${ROUTER} > ${NODE}`),
};

/** Some of that commit's hunks in the router: `add` spans lines 67 to 126 and the change wrote inside it. */
const ROUTER_HUNKS: readonly Hunk[] = [
  { start: 1, count: 1 },
  { start: 10, count: 6 },
  { start: 69, count: 1 },
  { start: 114, count: 8 },
  { start: 171, count: 1 },
];

/** fallow's `health` findings on the two files at that commit, by the pinned fallow: `add` is the rewrite; `compareKey` and `insert` were not touched. */
const HONO_HEALTH: Health = {
  file_scores: [],
  findings: [
    { path: NODE, exceeded: 'cognitive_crap', line: 20, line_count: 24 },
    { path: NODE, exceeded: 'all', line: 51, line_count: 85 },
    { path: ROUTER, exceeded: 'all', line: 67, line_count: 60 },
  ],
};

test("hono #5266's shape: a hunk inside add's span keeps the health red on the change, and node.ts's untouched functions are standing (D73)", () => {
  const checks = categoryFor(
    HONO,
    // node.ts changed only its imports, above both of its findings.
    [change(ROUTER, ROUTER_HUNKS), change(NODE, [{ start: 1, count: 3 }])],
    ran({ health: HONO_HEALTH }, [slot('health', false)]),
  );

  expect(checks.category).toBe('IFR');
  expect(checks.slots).toEqual([{ name: 'health', ok: false, skipped: false, scope: [NODE, ROUTER], change: [ROUTER] }]);
});

const QUERY_MANAGER = 'src/core/QueryManager.ts';
const USE_LAZY_QUERY = 'src/react/hooks/useLazyQuery.ts';

const APOLLO: World = {
  files: ['src/index.ts', QUERY_MANAGER, USE_LAZY_QUERY],
  head: imports(`src/index.ts > ${QUERY_MANAGER}`, `${USE_LAZY_QUERY} > ${QUERY_MANAGER}`),
};

/** Some of fallow's `health` findings on the two files at apollo-client #12633's review commit, by the pinned fallow. */
const APOLLO_HEALTH: Health = {
  file_scores: [],
  findings: [
    { path: QUERY_MANAGER, exceeded: 'cognitive_crap', line: 461, line_count: 209 },
    { path: QUERY_MANAGER, exceeded: 'crap', line: 1394, line_count: 155 },
    { path: QUERY_MANAGER, exceeded: 'crap', line: 1722, line_count: 30 },
    { path: QUERY_MANAGER, exceeded: 'crap', line: 1761, line_count: 194 },
    { path: USE_LAZY_QUERY, exceeded: 'crap', line: 316, line_count: 25 },
  ],
};

test("apollo-client #12633's shape: a health red whose findings no hunk meets is standing, though it names two changed files (D73)", () => {
  const checks = categoryFor(
    APOLLO,
    // The change wrote between `fetchObservableWithInfo` (1394 to 1548) and `maskOperation` (from 1722), and far above the hook's finding.
    [change(QUERY_MANAGER, [{ start: 1646, count: 3 }, { start: 1691, count: 3 }]), change(USE_LAZY_QUERY, [{ start: 177, count: 1 }])],
    ran({ health: APOLLO_HEALTH }, [slot('health', false)]),
  );

  // Nothing else is measured here, so with its red standing the change reads on its own evidence; the retake map keeps IFR on its failing tests.
  expect(checks.category).toBe('VFR');
  expect(readRedSplit(checks.slots)).toEqual({
    change: [],
    standing: [{ name: 'health', global: false, change: [], named: [QUERY_MANAGER, USE_LAZY_QUERY] }],
  });
});

test('a pure deletion meets the span that holds its position, and one just outside the first or last line does not (D73)', () => {
  const at = (start: number): RedSplit =>
    splitRedSlots({
      slots: [{ name: 'health', ok: false, skipped: false, scope: [ROUTER] }],
      changed: [change(ROUTER, [{ start, count: 0 }])],
      stitches: [],
      spans: new Map([['health', [{ path: ROUTER, start: 67, end: 126 }]]]),
    });
  const onChange = (start: number): readonly string[] => at(start).change.map((red) => red.name);

  // Lines deleted after head line 80 sat between 80 and 81, inside `add`; after 125, between it and the closing 126.
  expect(onChange(80)).toEqual(['health']);
  expect(onChange(125)).toEqual(['health']);
  // After 66 they sat just above the function's first line, and after 126 just below its last.
  expect(onChange(66)).toEqual([]);
  expect(onChange(126)).toEqual([]);

  // The same through the category: a change that only deleted inside `add` is the change's red.
  const deleted = categoryFor(HONO, [change(ROUTER, [{ start: 80, count: 0 }])], ran({ health: HONO_HEALTH }, [slot('health', false)]));
  expect(deleted.category).toBe('IFR');
  expect(deleted.slots[0]?.change).toEqual([ROUTER]);
});

test('a dupes red is the change\'s only where one of its clone instances meets a hunk, the instances read by key (D73)', () => {
  const family = {
    files: ['src/doctor.ts', 'src/pm/tools.ts'],
    groups: [
      {
        instances: [
          { file: 'src/doctor.ts', start_line: 40, end_line: 52 },
          { file: 'src/pm/tools.ts', start_line: 8, end_line: 20 },
        ],
      },
    ],
  };
  const checks = categoryFor(
    CHAIN,
    // Both copies' files changed, but only the hunk in `tools.ts` lands inside its copy.
    [change('src/pm/tools.ts'), change('src/doctor.ts', [{ start: 1, count: 2 }])],
    ran({ ...TOOLS_CLOSED, dupes: { clone_families: [family] } }, [slot('dupes', false)]),
  );

  expect(checks.category).toBe('IFR');
  expect(checks.slots).toEqual([
    { name: 'dupes', ok: false, skipped: false, scope: ['src/doctor.ts', 'src/pm/tools.ts'], change: ['src/pm/tools.ts'] },
  ]);
});

test('the category records the split on each red slot that names files, and readRedSplit reads the same split back', () => {
  const checks = categoryFor(
    HONO,
    [change(ROUTER, ROUTER_HUNKS), change(NODE, [{ start: 1, count: 3 }])],
    ran({ health: HONO_HEALTH, lint: { diagnostics: [{ path: NODE, severity: 'error' }] } }, [
      slot('health', false),
      slot('lint', false),
      slot('test'),
      slot('types', false),
    ]),
  );

  // The line rule is for `health` and `dupes` alone: `lint` is on the change through any changed file it names.
  expect(checks.slots).toEqual([
    { name: 'health', ok: false, skipped: false, scope: [NODE, ROUTER], change: [ROUTER] },
    { name: 'lint', ok: false, skipped: false, scope: [NODE], change: [NODE] },
    // A green slot and a global one carry no split: there is nothing of theirs for a renderer to place.
    { name: 'test', ok: true, skipped: false, scope: 'global' },
    { name: 'types', ok: false, skipped: false, scope: 'global' },
  ]);
  expect(readRedSplit(checks.slots)).toEqual({
    change: [
      { name: 'health', global: false, change: [ROUTER], named: [NODE, ROUTER] },
      { name: 'lint', global: false, change: [NODE], named: [NODE] },
    ],
    standing: [{ name: 'types', global: true, change: [], named: [] }],
  });
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
        health: { file_scores: [], findings: [{ path: 'src/doctor.ts', exceeded: 'cyclomatic', line: 3, line_count: 20 }] },
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

  expect(checks.slots).toEqual([{ name: 'struct', ok: false, skipped: false, scope: ['src/doctor.ts', 'src/pm/util.ts'], change: [] }]);
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
