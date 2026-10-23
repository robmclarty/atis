import { expect, test } from 'vitest';

import { DEFAULT_CONFIG } from '../config.js';
import {
  COVERAGE_UNNAMED,
  HARNESS_BROKEN,
  UNKNOWN_STATUS,
  computeCategory,
  computeEvidence,
  readRedSplit,
  splitRedSlots,
  trustCoverage,
} from '../evidence.js';
import type { CheckArtifacts, CheckSummarySlot, CodeSpan, Dead, EvidenceInputs, FileEvidence, Health, RedSplit } from '../evidence.js';
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

type Code = ReadonlyMap<string, readonly CodeSpan[]>;

/** No file holding code: the tests that are not about D80 leave a file the report omits as they found it. */
const NO_CODE: Code = new Map();

/** Code throughout every file of the chain, the way the scan reads a file whose statements survive type stripping (D80, D141). */
const ALL_CODE: Code = new Map(CHAIN.files.map((path) => [path, [{ start: 1, end: 40 }]]));

/** Code in `tools.ts` alone: every other file of the chain holds only types. */
const TOOLS_CODE: Code = new Map([['src/pm/tools.ts', [{ start: 1, end: 40 }]]]);

/** The composition `buildMap` will use: place the changed set, then read the evidence off it. */
function inputsFor(
  world: World,
  changed: readonly DiffFile[],
  check: CheckArtifacts,
  code: Code = NO_CODE,
): EvidenceInputs {
  const scanned = world.files.map((path): ScannedFile => ({ path, loc: 10, exports: [] }));
  const modules = identifyModules(scanned, world.head, []);
  const groups = identifyGroups(scanned, DEFAULT_CONFIG.groups, []);
  const baseEdges = world.base ?? world.head;
  const placed = computeReach({ changed, modules, groups, headEdges: world.head, baseEdges });
  return { changed: placed.changed, modules, groups, headEdges: world.head, baseEdges, check, code };
}

function evidenceFor(
  world: World,
  changed: readonly DiffFile[],
  check: CheckArtifacts,
  code: Code = NO_CODE,
): ReturnType<typeof computeEvidence> {
  return computeEvidence(inputsFor(world, changed, check, code));
}

function fileAt(files: readonly FileEvidence[], path: string): FileEvidence {
  const found = files.find((file) => file.path === path);
  if (found === undefined) throw new Error(`no evidence for ${path}`);
  return found;
}

/** Evidence into category, the way `buildMap` chains them, stitches and all. */
function categoryFor(
  world: World,
  changed: readonly DiffFile[],
  check: CheckArtifacts,
  code: Code = NO_CODE,
): Checks {
  const inputs = inputsFor(world, changed, check, code);
  const { evidence, files } = computeEvidence(inputs);
  return computeCategory({
    check,
    changed: inputs.changed,
    files,
    stitches: evidence.stitches ?? [],
    deps_added: [],
    deps_moved: [],
    config: DEFAULT_CONFIG,
  });
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

test('a changed file whose hunks meet code, and that an existing report never names, is unmeasured, a gap of unknown size (D80)', () => {
  const changed = [change('src/pm/tools.ts'), change('src/pm/util.ts')];
  const { evidence, files } = evidenceFor(CHAIN, changed, ran(TOOLS_CLOSED), ALL_CODE);

  // The report measured `tools.ts` and never named `util.ts`: one closed skin, one unmeasured file.
  expect(evidence.patch_coverage?.map((entry) => entry.path)).toEqual(['src/pm/tools.ts']);
  expect(evidence.unmeasured).toEqual(['src/pm/util.ts']);
  expect(fileAt(files, 'src/pm/util.ts').unmeasured).toBe(true);
  expect(fileAt(files, 'src/pm/util.ts').coverage).toBeUndefined();
  expect(fileAt(files, 'src/pm/tools.ts').unmeasured).toBe(false);

  // An added or renamed file is measured, or not, at its head path like any other.
  const added = evidenceFor(CHAIN, [change('src/pm/util.ts', undefined, 'added')], ran(TOOLS_CLOSED), ALL_CODE);
  expect(added.evidence.unmeasured).toEqual(['src/pm/util.ts']);
  const renamed = evidenceFor(CHAIN, [change('src/pm/util.ts', undefined, 'renamed')], ran(TOOLS_CLOSED), ALL_CODE);
  expect(renamed.evidence.unmeasured).toEqual(['src/pm/util.ts']);
});

test('a file of types, a deleted file, a test and a map with no coverage channel are never unmeasured (D80)', () => {
  const report = ran(TOOLS_CLOSED);

  // `util.ts` holds only types here: the scan read no code in it, so the report owed it nothing.
  const typesOnly = evidenceFor(CHAIN, [change('src/pm/util.ts')], report, TOOLS_CODE);
  expect(typesOnly.evidence.unmeasured).toEqual([]);

  // A deleted file has nothing left at head to measure.
  const deleted = evidenceFor(CHAIN, [change('src/pm/gone.ts', [], 'deleted')], report, ALL_CODE);
  expect(deleted.evidence.unmeasured).toEqual([]);

  // A test is evidence, not terrain (D4): a report that leaves it out leaves no gap.
  const testFile = evidenceFor(CHAIN, [change('src/__tests__/tools.test.ts')], report, ALL_CODE);
  expect(testFile.evidence.unmeasured).toEqual([]);

  // No coverage channel at all: nothing is unmeasured, because nothing claimed to measure (C2).
  const silent = evidenceFor(CHAIN, [change('src/pm/util.ts')], ran(), ALL_CODE);
  expect(silent.evidence.unmeasured).toBeUndefined();
  expect(fileAt(silent.files, 'src/pm/util.ts').unmeasured).toBe(false);
});

/**
 * The `pm` barrel as the scan reads it (its own spans are checked in the
 * scan's tests): three re-exports, a blank, and the one constant that leaves
 * code, on line 5.
 *
 *     export { resolveTool } from './tools.js';
 *     export { listSlots } from './slots.js';
 *     export type { Slot } from './slots.js';
 *
 *     export const VERSION = '1.13.1';
 */
const BARREL_CODE: Code = new Map([['src/pm/index.ts', [{ start: 5, end: 5 }]]]);

/**
 * `util.ts` as the scan reads it: an import, a blank, and one function on
 * lines 3 to 6.
 *
 *     import { listSlots } from './slots.js';
 *
 *     export function pick(name: string): string {
 *       const slot = listSlots().find((entry) => entry === name);
 *       return slot ?? name;
 *     }
 */
const FUNCTION_CODE: Code = new Map([['src/pm/util.ts', [{ start: 3, end: 6 }]]]);

test('a barrel whose changed lines are re-exports is never unmeasured, though it holds a constant, and one that edits the constant is (D141)', () => {
  const at = (hunk: Hunk): readonly string[] | undefined =>
    evidenceFor(CHAIN, [change('src/pm/index.ts', [hunk])], ran(TOOLS_CLOSED), BARREL_CODE).evidence.unmeasured;

  // The change wrote three re-exports: no test could run them, and a broken one fails the build or the typecheck.
  expect(at({ start: 1, count: 3 })).toEqual([]);
  expect(at({ start: 5, count: 1 })).toEqual(['src/pm/index.ts']);
});

test('a pure deletion inside a function leaves the file unmeasured, and one among the imports does not (D141, D73)', () => {
  const at = (start: number): readonly string[] | undefined =>
    evidenceFor(CHAIN, [change('src/pm/util.ts', [{ start, count: 0 }])], ran(TOOLS_CLOSED), FUNCTION_CODE).evidence.unmeasured;

  // Lines deleted after head line 4 sat between 4 and 5, inside `pick`.
  expect(at(4)).toEqual(['src/pm/util.ts']);
  // After line 1 they sat between the import and the blank line, where nothing a test could run is left.
  expect(at(1)).toEqual([]);
  // After line 6, just below the function's last line.
  expect(at(6)).toEqual([]);
});

test('an unmeasured file is a gap: never VFR, MVFR on its own, IFR at high reach (D80, D27)', () => {
  // `util.ts` alone, unmeasured, in its own cell: the closed `tools.ts` beside it cannot make the change VFR.
  expect(categoryFor(CHAIN, [change('src/pm/tools.ts'), change('src/pm/util.ts')], ran(TOOLS_CLOSED), ALL_CODE).category).toBe('MVFR');

  // The same file holding no code is no gap, and the change reads VFR on `tools.ts`'s closed skin.
  expect(categoryFor(CHAIN, [change('src/pm/tools.ts'), change('src/pm/util.ts')], ran(TOOLS_CLOSED), TOOLS_CODE).category).toBe('VFR');

  // `tools.ts` reaches three cells; unmeasured there, it is IFR, as an uncovered line would be.
  const others = ran({ coverage: [{ path: 'src/pm/util.ts', statements: [{ line: 10, hits: 1 }] }] });
  expect(categoryFor(CHAIN, [change('src/pm/tools.ts')], others, ALL_CODE).category).toBe('IFR');
});

test("a report naming none of the tree's source files is muted with its reason; one naming any of them is trusted (D122)", () => {
  const sources = new Set(['src/pm/tools.ts', 'src/pm/util.ts']);

  // Keys relative to another checkout match nothing here, and neither does an empty report.
  const elsewhere = ran({ coverage: [{ path: '../other/src/pm/tools.ts', statements: [{ line: 10, hits: 1 }] }] });
  for (const report of [elsewhere, ran({ coverage: [] })]) {
    const trusted = trustCoverage(report, sources);
    expect(trusted.muted).toBe(COVERAGE_UNNAMED);
    expect(trusted.check.mode === 'check' ? trusted.check.coverage : 'not read').toBeUndefined();
  }

  // One name is enough to make the report this tree's, and then every file it omits stays unmeasured (D80).
  const ours = ran(TOOLS_CLOSED);
  expect(trustCoverage(ours, sources)).toEqual({ check: ours });

  // A run with no coverage, and no `.check/` at all, pass through untouched.
  expect(trustCoverage(ran(), sources)).toEqual({ check: ran() });
  const absent: CheckArtifacts = { mode: 'git-only', reason: '.check/ is absent' };
  expect(trustCoverage(absent, sources)).toEqual({ check: absent });
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
  expect(Object.keys(evidence)).toEqual(['patch_coverage', 'unmeasured']);
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
    places: new Map([
      [
        'health',
        [
          { spans: [{ path: 'src/doctor.ts', start: 1, end: 40 }], files: [] },
          { spans: [{ path: 'src/pm/tools.ts', start: 8, end: 20 }], files: [] },
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
      places: new Map([['health', [{ spans: [{ path: ROUTER, start: 67, end: 126 }], files: [] }]]]),
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

/**
 * fallow 3.35's `dead.json` for a small two-zone repository, captured from a
 * run and trimmed to the four arrays atis reads, each finding's `actions` and
 * `finding_id` dropped (the whole report is `apps/atis/fixtures/check/dead-findings.json`).
 * `a.ts` and `b.ts` import each other on lines 3 and 4; `e.ts` imports `f.ts`
 * on line 2, and `f.ts` re-exports from `e.ts`; the barrel and `one.ts`
 * re-export each other; `c.ts` imports the app on line 5, and `d.ts`
 * re-exports from it on line 4; `unused.ts` exports `neverRead` on line 7.
 * fallow writes every re-export's import at line 1, column 0.
 */
const FALLOW_DEAD = `{
  "circular_dependencies": [
    {"files": ["libs/core/src/a.ts", "libs/core/src/b.ts"], "length": 2, "line": 3, "col": 9, "edges": [{"path": "libs/core/src/a.ts", "line": 3, "col": 9}, {"path": "libs/core/src/b.ts", "line": 4, "col": 9}], "effective_severity": "error"},
    {"files": ["libs/core/src/barrel/index.ts", "libs/core/src/barrel/one.ts"], "length": 2, "line": 1, "col": 0, "edges": [{"path": "libs/core/src/barrel/index.ts", "line": 1, "col": 0}, {"path": "libs/core/src/barrel/one.ts", "line": 1, "col": 0}], "effective_severity": "error"},
    {"files": ["libs/core/src/e.ts", "libs/core/src/f.ts"], "length": 2, "line": 2, "col": 9, "edges": [{"path": "libs/core/src/e.ts", "line": 2, "col": 9}, {"path": "libs/core/src/f.ts", "line": 1, "col": 0}], "effective_severity": "error"}
  ],
  "re_export_cycles": [
    {"files": ["libs/core/src/barrel/index.ts", "libs/core/src/barrel/one.ts"], "kind": "multi-node", "effective_severity": "warn"}
  ],
  "boundary_violations": [
    {"from_path": "libs/core/src/c.ts", "to_path": "apps/app/src/x.ts", "from_zone": "libs", "to_zone": "apps", "import_specifier": "apps/app/src/x.ts", "line": 5, "col": 9, "effective_severity": "error"},
    {"from_path": "libs/core/src/d.ts", "to_path": "apps/app/src/x.ts", "from_zone": "libs", "to_zone": "apps", "import_specifier": "apps/app/src/x.ts", "line": 1, "col": 0, "effective_severity": "error"}
  ],
  "unused_exports": [
    {"path": "libs/core/src/unused.ts", "export_name": "neverRead", "is_type_only": false, "line": 7, "col": 13, "span_start": 91, "is_re_export": false, "effective_severity": "error"}
  ]
}`;

const CAPTURED = JSON.parse(FALLOW_DEAD) as Dead;
const [PAIR_CYCLE, BARREL_CYCLE, MIXED_CYCLE] = CAPTURED.circular_dependencies;
const [BARREL_REEXPORT_CYCLE] = CAPTURED.re_export_cycles;
const [LINED_VIOLATION, REEXPORT_VIOLATION] = CAPTURED.boundary_violations;
const [NEVER_READ] = CAPTURED.unused_exports;

const APP = 'apps/app/src/index.ts';
const APP_HELPER = 'apps/app/src/x.ts';
const A = 'libs/core/src/a.ts';
const B = 'libs/core/src/b.ts';
const C = 'libs/core/src/c.ts';
const D = 'libs/core/src/d.ts';
const E = 'libs/core/src/e.ts';
const F = 'libs/core/src/f.ts';
const UNUSED = 'libs/core/src/unused.ts';
const BARREL = 'libs/core/src/barrel/index.ts';
const ONE = 'libs/core/src/barrel/one.ts';

/** The captured repository's own files and imports. */
const CAPTURE: World = {
  files: [APP, APP_HELPER, A, B, C, D, E, F, UNUSED, BARREL, ONE, 'libs/core/src/barrel/two.ts'],
  head: imports(
    ...[A, C, D, E, UNUSED, BARREL].map((to) => `${APP} > ${to}`),
    `${A} > ${B}`,
    `${B} > ${A}`,
    `${C} > ${APP_HELPER}`,
    `${D} > ${APP_HELPER}`,
    `${E} > ${F}`,
    `${F} > ${E}`,
    `${BARREL} > ${ONE}`,
    `${BARREL} > libs/core/src/barrel/two.ts`,
    `${ONE} > ${BARREL}`,
  ),
};

/** The captured findings a test is about, under a red `dead`, and nothing else measured. */
function deadRed(findings: Partial<Dead>): CheckArtifacts {
  return ran({ dead: { ...NO_DEAD, ...findings } }, [slot('dead', false)]);
}

function lines(path: string, start: number, count = 1): DiffFile {
  return change(path, [{ start, count }]);
}

test('a standing cycle through two changed files is standing state, since no hunk meets either import line (D140)', () => {
  // `a.ts` changed inside `alpha`, and `b.ts` inside `beta`; their imports, on lines 3 and 4, were there before.
  const checks = categoryFor(CAPTURE, [lines(A, 6), lines(B, 7)], deadRed({ circular_dependencies: [PAIR_CYCLE] }));

  expect(checks.category).toBe('VFR');
  expect(checks.slots).toEqual([{ name: 'dead', ok: false, skipped: false, scope: [A, B], change: [] }]);
});

test('a cycle whose import line the change wrote is LIFR, on the change through the file that imports alone (D140)', () => {
  // `b.ts`'s import of `a.ts` is line 4; `a.ts` changed only inside `alpha`.
  const checks = categoryFor(CAPTURE, [lines(A, 6), lines(B, 4)], deadRed({ circular_dependencies: [PAIR_CYCLE] }));

  expect(checks.category).toBe('LIFR');
  expect(checks.slots).toEqual([{ name: 'dead', ok: false, skipped: false, scope: [A, B], change: [B] }]);
});

test('a boundary violation is on the change only where the change touched its import, never through the file it reaches (D140)', () => {
  const at = (changed: readonly DiffFile[]): Checks => categoryFor(CAPTURE, changed, deadRed({ boundary_violations: [LINED_VIOLATION] }));

  expect(at([lines(C, 5)]).category).toBe('LIFR');
  // Inside `gamma`, below the import.
  expect(at([lines(C, 8)]).category).toBe('VFR');
  // The app file the violation reaches holds none of its lines.
  expect(at([lines(APP_HELPER, 4)]).slots).toEqual([{ name: 'dead', ok: false, skipped: false, scope: [APP_HELPER, C], change: [] }]);
});

test('an unused export is the change\'s on its own line and standing off it, and as no cycle it is never LIFR (D140)', () => {
  const at = (start: number): Checks => categoryFor(CAPTURE, [lines(UNUSED, start)], deadRed({ unused_exports: [NEVER_READ] }));

  // On `neverRead`'s line 7 the red is the change's, which is IFR.
  expect(at(7).category).toBe('IFR');
  expect(at(7).slots[0]?.change).toEqual([UNUSED]);
  // Inside `used`, lines 3 to 5, it was there before.
  expect(at(4).category).toBe('VFR');
  expect(at(4).slots[0]?.change).toEqual([]);
});

test('a finding with no line atis can read keeps the file rule: a re-export cycle, and every import fallow writes at line 1, column 0 (D140, C2)', () => {
  // The barrel changed on line 3, its re-export of `two.ts`: not the cycle's import, but fallow gives no line to hold either to.
  const barrel = (findings: Partial<Dead>): Checks => categoryFor(CAPTURE, [lines(BARREL, 3)], deadRed(findings));
  expect(barrel({ re_export_cycles: [BARREL_REEXPORT_CYCLE] }).category).toBe('LIFR');
  expect(barrel({ circular_dependencies: [BARREL_CYCLE] }).slots[0]?.change).toEqual([BARREL]);

  // `d.ts`'s re-export across the boundary sits on line 4 and reads as 1:0, so both files it names keep the file rule.
  expect(categoryFor(CAPTURE, [lines(APP_HELPER, 4)], deadRed({ boundary_violations: [REEXPORT_VIOLATION] })).category).toBe('LIFR');

  // A finding of a shape with no line at all.
  const bare = categoryFor(CAPTURE, [lines(C, 8)], deadRed({ boundary_violations: [{ from_path: C, to_path: APP_HELPER }] }));
  expect(bare.slots[0]?.change).toEqual([C]);
});

test('a cycle holds each file to its own edge, so a file whose edge has no line keeps the file rule beside one that does (D140)', () => {
  const at = (changed: readonly DiffFile[]): readonly string[] =>
    categoryFor(CAPTURE, changed, deadRed({ circular_dependencies: [MIXED_CYCLE] })).slots[0]?.change ?? [];

  // `e.ts` imports `f.ts` on line 2, and the change wrote line 3.
  expect(at([lines(E, 3)])).toEqual([]);
  expect(at([lines(E, 2)])).toEqual([E]);
  // `f.ts`'s re-export of `e.ts` reads as 1:0, so any change to `f.ts` is a change to the cycle.
  expect(at([lines(E, 3), lines(F, 2)])).toEqual([F]);
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
