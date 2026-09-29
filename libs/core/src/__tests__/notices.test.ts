import { expect, test } from 'vitest';

import { DEFAULT_CONFIG } from '../config.js';
import type { Config, NoticeKind } from '../config.js';
import { computeCategory, computeEvidence } from '../evidence.js';
import type { CheckArtifacts, CheckSummarySlot, Dead, Health } from '../evidence.js';
import { identifyGroups } from '../groups.js';
import type { FileHistory } from '../history.js';
import { identifyModules } from '../modules.js';
import type { Modules, ScannedFile } from '../modules.js';
import { HEAD_ONLY, findGhosts, findPublicNames, rankNotices } from '../notices.js';
import type { ExportShapes, NamedEdge, NoticeInputs, PassedName, PublishingMember, ScanFile } from '../notices.js';
import { computeReach } from '../reach.js';
import type { DiffFile } from '../reach.js';
import type { Cell, CheckSlot, Checks, Cochange, DepAdded, Hunk, Notice } from '../schema.js';

/**
 * One repository for every scenario: the chain of §5.2, where `pm` is entered
 * through its barrel and read from `doctor.ts`, which the package barrel
 * reads. `util.ts` hangs off `probe.ts`, which nothing imports, so a change to
 * it stays in its own cell and fires nothing by itself: it is the quiet file
 * every scenario below starts from.
 */
const WORLD = [
  'src/index.ts',
  'src/doctor.ts',
  'src/pm/index.ts',
  'src/pm/tools.ts',
  'src/pm/probe.ts',
  'src/pm/util.ts',
  'src/__tests__/tools.test.ts',
  'README.md',
];

/** `'a > b'`: `a` imports `b`. */
const EDGES = [
  'src/index.ts > src/doctor.ts',
  'src/doctor.ts > src/pm/index.ts',
  'src/pm/index.ts > src/pm/tools.ts',
  'src/pm/probe.ts > src/pm/util.ts',
  'src/__tests__/tools.test.ts > src/pm/tools.ts',
];

const PM = 'folder:src/pm';

type Scenario = {
  /** Extra tracked files beside `WORLD`. */
  readonly files?: readonly string[];
  /** Files the terrain has and the head scan does not: what this change deleted (D32, D39). */
  readonly deleted?: readonly string[];
  /** The diff; one quiet modification to `src/pm/util.ts` unless the scenario is about something else. */
  readonly changed?: readonly DiffFile[];
  /** Extra `'a > b'` edges both graphs have. */
  readonly edges?: readonly string[];
  /** Extra `'a > b'` edges the base graph had and the head graph lost. */
  readonly baseEdges?: readonly string[];
  /** What a re-export edge passes on, in both graphs, keyed `'a > b'` (D75). */
  readonly reexports?: Readonly<Record<string, readonly PassedName[]>>;
  /** The workspace members and what each publishes; none unless the scenario says otherwise (D75). */
  readonly members?: readonly PublishingMember[];
  /** The names an edge takes, in both graphs, keyed `'a > b'`. */
  readonly names?: Readonly<Record<string, readonly string[]>>;
  /** The names an edge took at base alone: what a consumer has since dropped. */
  readonly baseNames?: Readonly<Record<string, readonly string[]>>;
  /** What a head file exports; empty unless the scenario says otherwise. */
  readonly exports?: Readonly<Record<string, readonly string[]>>;
  /** What a base file exported, where it differs from the head's. */
  readonly baseExports?: Readonly<Record<string, readonly string[]>>;
  /** The shapes a head file's scan printed; absent unless the scenario says otherwise, which compares like `null` (D76). */
  readonly shapes?: Readonly<Record<string, ExportShapes>>;
  /** The shapes a base file's scan printed, where they differ from the head's. */
  readonly baseShapes?: Readonly<Record<string, ExportShapes>>;
  readonly bands?: Readonly<Record<string, number>>;
  readonly fanIn?: Readonly<Record<string, number>>;
  readonly check?: CheckArtifacts;
  /** A verdict built by hand, each red slot that names files carrying its split; else the category's own, made from `check`. */
  readonly checks?: Checks;
  readonly history?: readonly FileHistory[];
  readonly cochange?: readonly Cochange[];
  readonly deps_added?: readonly DepAdded[];
};

const NO_CHECK: CheckArtifacts = { mode: 'git-only', reason: '.check/ is absent' };

const NOINST: Checks = { category: 'NOINST', checks_run: 0, reason: '.check/ is absent', slots: [] };

const NO_DEAD: Dead = {
  circular_dependencies: [],
  re_export_cycles: [],
  boundary_violations: [],
  unused_exports: [],
};

const NO_HEALTH: Health = { file_scores: [], findings: [] };

/** A function in `util.ts` over the cyclomatic threshold, spanning the quiet change's hunk at lines 10 to 13 (D73). */
const UTIL_BREACH = { path: 'src/pm/util.ts', exceeded: 'cyclomatic', line: 8, line_count: 12 };

type Ran = Extract<CheckArtifacts, { mode: 'check' }>;
type Channels = Omit<Ran, 'mode' | 'summary' | 'fallow_schemas' | 'stale'>;

const GREEN: readonly CheckSummarySlot[] = [{ name: 'test', ok: true, skipped: false }];

/** A trusted `.check/` carrying the given channels; the summary is green unless the scenario says otherwise, so only the channels speak. */
function ran(channels: Channels, checks: readonly CheckSummarySlot[] = GREEN): CheckArtifacts {
  return {
    mode: 'check',
    summary: { ok: checks.every((slot) => slot.ok), checks_run: checks.length, timestamp: '2026-09-17T05:52:40.668Z', total_duration_ms: 1_000, checks },
    fallow_schemas: {},
    stale: [],
    ...channels,
  };
}

/** A red slot as `map.json` records it: one that names files carries the changed files the category's split put it on the change through. */
function red(name: string, scope: CheckSlot['scope'] = 'global', onChange: readonly string[] = []): CheckSlot {
  return { name, ok: false, skipped: false, scope, ...(scope === 'global' ? {} : { change: onChange }) };
}

function verdict(slots: readonly CheckSlot[]): Checks {
  return { category: 'IFR', checks_run: slots.length, slots };
}

function change(path: string, added = 4, deleted = 1, hunks: readonly Hunk[] = [{ start: 10, count: 4 }]): DiffFile {
  return { path, kind: 'modified', added, deleted, hunks };
}

function edgesOf(scenario: Scenario, base: boolean): readonly NamedEdge[] {
  return [...EDGES, ...(scenario.edges ?? []), ...(base ? (scenario.baseEdges ?? []) : [])].map((pair): NamedEdge => {
    const [from = '', to = ''] = pair.split(' > ');
    const names = (base ? scenario.baseNames?.[pair] : undefined) ?? scenario.names?.[pair] ?? [];
    const reexports = scenario.reexports?.[pair];
    return { from, to, names, ...(reexports === undefined ? {} : { reexports }) };
  });
}

/** The cells `buildMap` will assemble, with the band and fan-in this scenario wants on them. */
function cellsFor(modules: Modules, scenario: Scenario): readonly Cell[] {
  return modules.cells.map((cell): Cell => {
    const fanIn = scenario.fanIn?.[cell.id];
    return {
      id: cell.id,
      path: cell.path,
      kind: cell.kind,
      ...(cell.parent === undefined ? {} : { parent: cell.parent }),
      ...(cell.barrel === undefined ? {} : { barrel: cell.barrel }),
      organelles: cell.organelles,
      band: scenario.bands?.[cell.id] ?? 0,
      interface_size: cell.interface_size,
      body_loc: cell.body_loc,
      ...(fanIn === undefined ? {} : { fan_in: fanIn }),
      dents: [],
    };
  });
}

/** A scanned file with the shapes its scan printed, or none where the scan never read them (D76). */
function withShapes(file: ScannedFile, shapes: ExportShapes | undefined): ScanFile {
  return shapes === undefined ? file : { ...file, shapes };
}

/** The composition `buildMap` will use: place the change, read its evidence, split its red, then rank the notices off all three. */
function inputsFor(scenario: Scenario): NoticeInputs {
  const paths = [...WORLD, ...(scenario.files ?? [])].toSorted();
  const scanned = paths.map((path): ScannedFile => ({ path, loc: 20, exports: scenario.exports?.[path] ?? [] }));
  const headEdges = edgesOf(scenario, false);
  const baseEdges = edgesOf(scenario, true);
  const modules = identifyModules(scanned, headEdges, []);
  const changed = scenario.changed ?? [change('src/pm/util.ts')];
  const added = new Set(changed.filter((file) => file.kind === 'added').map((file) => file.path));
  // The terrain is scanned at the merge-base and the exports at head, so a deleted file is in one and not the other.
  const headFiles = scanned
    .filter((file) => !(scenario.deleted ?? []).includes(file.path))
    .map((file): ScanFile => withShapes(file, scenario.shapes?.[file.path]));
  const baseFiles = scanned
    .filter((file) => !added.has(file.path))
    .map(
      (file): ScanFile =>
        withShapes(
          { ...file, exports: scenario.baseExports?.[file.path] ?? file.exports },
          scenario.baseShapes?.[file.path] ?? scenario.shapes?.[file.path],
        ),
    );
  const groups = identifyGroups(scanned, DEFAULT_CONFIG.groups, []);
  const check = scenario.check ?? NO_CHECK;
  const placed = computeReach({ changed, modules, groups, headEdges, baseEdges });
  const { evidence, files } = computeEvidence({ changed: placed.changed, modules, groups, headEdges, baseEdges, check });
  const checks =
    scenario.checks ??
    (check.mode === 'check'
      ? computeCategory({ check, changed: placed.changed, files, stitches: evidence.stitches ?? [], config: DEFAULT_CONFIG })
      : NOINST);
  const members = scenario.members ?? [];

  return {
    changed: placed.changed,
    files,
    checks,
    cells: cellsFor(modules, scenario),
    groups,
    history: scenario.history ?? [],
    cochange: scenario.cochange ?? [],
    deps_added: scenario.deps_added ?? [],
    baseFiles,
    headFiles,
    headEdges,
    baseEdges,
    publicNames: findPublicNames([
      { files: baseFiles, edges: baseEdges, members },
      { files: headFiles, edges: headEdges, members },
    ]),
    check,
    config: DEFAULT_CONFIG,
  };
}

function noticesFor(scenario: Scenario): readonly Notice[] {
  return rankNotices(inputsFor(scenario));
}

function kindsOf(notices: readonly Notice[]): readonly string[] {
  return notices.map((notice) => notice.kind);
}

/** Where a target lands in the ranking, so a test can assert one notice above another. */
function rankOf(notices: readonly Notice[], path: string): number {
  return notices.findIndex((notice) => notice.target === path);
}

/**
 * One scenario per row of §5.4, plus D48's `other` group: each is the quiet
 * repository with exactly the one input that row names, so whatever comes back
 * first is that row's candidate and nothing else.
 */
const ONE_OF_EACH: Readonly<Record<NoticeKind, Scenario>> = {
  'red-check-slot': { checks: verdict([red('lint', ['src/pm/util.ts'], ['src/pm/util.ts'])]) },
  'cycle-or-boundary': {
    check: ran({ dead: { ...NO_DEAD, circular_dependencies: [{ files: ['src/pm/util.ts', 'src/pm/probe.ts'] }] } }),
  },
  'deleted-export': {
    changed: [change('src/pm/tools.ts')],
    names: { 'src/pm/index.ts > src/pm/tools.ts': ['resolve'] },
  },
  'interface-change': {
    changed: [change('src/pm/index.ts')],
    bands: { [PM]: 5 },
    exports: { 'src/pm/index.ts': ['resolve'] },
    baseExports: { 'src/pm/index.ts': [] },
  },
  'uncovered-high-reach': {
    changed: [change('src/pm/tools.ts')],
    check: ran({ coverage: [{ path: 'src/pm/tools.ts', statements: [{ line: 10, hits: 0 }] }] }),
  },
  'survived-mutants': {
    check: ran({ mutation: [{ path: 'src/pm/util.ts', mutants: [{ line: 10, status: 'Survived' }] }] }),
  },
  'threshold-breached': {
    check: ran({ health: { ...NO_HEALTH, findings: [UTIL_BREACH] } }),
  },
  'security-finding': { check: ran({ security: { vulnerabilities: { high: 2, total: 2 } } }) },
  'large-hot-change': {
    changed: [change('src/pm/util.ts', 90, 20)],
    history: [{ path: 'src/pm/util.ts', churn_ratio: 3 }],
  },
  'new-dependency': { deps_added: [{ manifest: 'package.json', name: 'd3-force', range: '^3.0.0', dev: false }] },
  'missing-cochange': { cochange: [{ a: 'src/pm/util.ts', b: 'src/doctor.ts', rate: 0.8, support: 4 }] },
  'bedrock-change': { history: [{ path: 'src/pm/util.ts', age_days: 800, churn_ratio: 0.1 }] },
  'other-group': { files: ['odd.qqq'] },
};

/**
 * Everything at once: more candidates than the map has room for. The red on
 * the change is `lint`, so weight alone orders it; a red `test` would lead (D74).
 */
const CROWDED: Scenario = {
  files: ['odd.qqq'],
  changed: [change('src/pm/tools.ts'), change('src/pm/index.ts'), change('src/pm/util.ts', 200, 10)],
  bands: { [PM]: 5 },
  exports: { 'src/pm/index.ts': ['resolve'] },
  baseExports: { 'src/pm/index.ts': [] },
  checks: verdict([red('types'), red('lint', ['src/doctor.ts', 'src/pm/tools.ts'], ['src/pm/tools.ts'])]),
  check: ran({
    coverage: [{ path: 'src/pm/tools.ts', statements: [{ line: 10, hits: 0 }] }],
    mutation: [{ path: 'src/pm/index.ts', mutants: [{ line: 10, status: 'Survived' }] }],
    health: { ...NO_HEALTH, findings: [UTIL_BREACH] },
    security: { vulnerabilities: { high: 1 } },
    dead: { ...NO_DEAD, boundary_violations: [{ from_path: 'src/pm/util.ts', to_path: 'src/doctor.ts' }] },
  }),
  history: [{ path: 'src/pm/util.ts', churn_ratio: 4, bugfix_rate: 0.5, age_days: 900 }],
  cochange: [{ a: 'src/pm/util.ts', b: 'src/index.ts', rate: 0.9, support: 5 }],
  deps_added: [{ manifest: 'package.json', name: 'd3-force', range: '^3.0.0', dev: false }],
};

test('every candidate kind of §5.4, and D48 s other group, fires from the inputs its row names', () => {
  const fired = Object.fromEntries(
    Object.entries(ONE_OF_EACH).map(([kind, scenario]) => [kind, noticesFor(scenario)[0]?.kind ?? 'nothing fired']),
  );

  expect(fired).toEqual(Object.fromEntries(Object.keys(ONE_OF_EACH).map((kind) => [kind, kind])));
});

test('the budget is one primary, two secondary and three tertiary, worst first, however many rank', () => {
  const notices = noticesFor(CROWDED);

  expect(notices).toHaveLength(6);
  expect(notices.map((notice) => notice.tier)).toEqual([
    'primary',
    'secondary',
    'secondary',
    'tertiary',
    'tertiary',
    'tertiary',
  ]);
  // The history factor is what lifts a cycle over the red gate here: `util.ts` has churned four times its own
  // length and one commit in two says "fix", which multiplies severity 9 past a red slot on a calmer file.
  expect(notices[0]?.kind).toBe('cycle-or-boundary');
  // The weights never climb back up.
  const weights = notices.map((notice) => notice.weight);
  expect(weights).toEqual(weights.toSorted((a, b) => b - a));
});

test('a lone candidate is one primary, and nothing is padded behind it', () => {
  const notices = noticesFor(ONE_OF_EACH['new-dependency']);

  expect(notices).toHaveLength(1);
  expect(notices[0]?.tier).toBe('primary');
  expect(notices[0]?.kind).toBe('new-dependency');
});

test('two runs over one input produce one ranking, and the input order cannot change it', () => {
  const inputs = inputsFor(CROWDED);
  const first = rankNotices(inputs);
  const second = rankNotices(inputs);
  const shuffled = rankNotices({
    ...inputs,
    changed: [...inputs.changed].toReversed(),
    files: [...inputs.files].toReversed(),
    cells: [...inputs.cells].toReversed(),
    groups: [...inputs.groups].toReversed(),
    history: [...inputs.history].toReversed(),
    cochange: [...inputs.cochange].toReversed(),
    deps_added: [...inputs.deps_added].toReversed(),
    headEdges: [...inputs.headEdges].toReversed(),
    baseEdges: [...inputs.baseEdges].toReversed(),
    checks: { ...inputs.checks, slots: [...inputs.checks.slots].toReversed() },
  });

  expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  expect(JSON.stringify(shuffled)).toBe(JSON.stringify(first));
});

test('the two head-only kinds say in their why that they are not measured as introduced', () => {
  const structural = noticesFor(ONE_OF_EACH['cycle-or-boundary'])[0];
  const threshold = noticesFor(ONE_OF_EACH['threshold-breached'])[0];

  expect(structural?.kind).toBe('cycle-or-boundary');
  expect(structural?.why).toContain(HEAD_ONLY);
  expect(threshold?.kind).toBe('threshold-breached');
  expect(threshold?.why).toContain(HEAD_ONLY);
  // And those two are the only kinds that claim it; no other candidate names an approximation it did not make.
  expect(kindsOf(noticesFor(CROWDED).filter((notice) => notice.why.includes(HEAD_ONLY)))).toEqual([
    'cycle-or-boundary',
    'threshold-breached',
  ]);
});

test('every notice echoes the measurements and the coefficients that produced it', () => {
  const notices = noticesFor(CROWDED);

  for (const notice of notices) {
    expect(Object.keys(notice.inputs)).toEqual(
      expect.arrayContaining(['cells_reached', 'uncovered_fraction', 'history_weight']),
    );
    expect(notice.thresholds['severity']).toBeGreaterThan(0);
  }
  // The threshold a kind was gated on rides along with it (D9, D28).
  const notice = noticesFor({ ...ONE_OF_EACH['interface-change'], fanIn: { [PM]: 9 } })[0];
  expect(notice?.thresholds).toEqual({ severity: 8, fan_in_high: 7, deep_band: 4 });
  expect(notice?.inputs['fan_in']).toBe(9);
});

test('the rank is the severity scaled by reach, by the evidence gap and by the history', () => {
  const notice = noticesFor({
    changed: [change('src/pm/tools.ts')],
    check: ran({ coverage: [{ path: 'src/pm/tools.ts', statements: [{ line: 10, hits: 0 }, { line: 11, hits: 3 }] }] }),
    history: [{ path: 'src/pm/tools.ts', churn_ratio: 0.5, bugfix_rate: 0.5 }],
  })[0];

  expect(notice?.kind).toBe('uncovered-high-reach');
  expect(notice?.inputs).toEqual({
    cells_reached: 3,
    uncovered_fraction: 0.5,
    history_weight: 1,
    uncovered_lines: 1,
  });
  // 7 × (1 + ln 4) × 1.5 × 2, to three decimals.
  expect(notice?.weight).toBe(50.112);
});

test('a red slot names its findings itself, so the same slot does not spend a second notice on them', () => {
  const findings = { ...NO_HEALTH, findings: [UTIL_BREACH] };
  const quiet = noticesFor({ check: ran({ health: findings }) });
  const loud = noticesFor({ check: ran({ health: findings }), checks: verdict([red('health', ['src/pm/util.ts'], ['src/pm/util.ts'])]) });

  expect(kindsOf(quiet)).toEqual(['threshold-breached']);
  // The red slot says it louder and points at the same file; the threshold notice does not repeat it.
  expect(kindsOf(loud)).toEqual(['red-check-slot']);
});

test('a global red slot yields no notice, and no longer speaks for the finding its slot would repeat (D67)', () => {
  expect(noticesFor({ checks: verdict([red('types')]) })).toEqual([]);

  // A red `security` is global, so it is standing state: the vulnerabilities it counted take the row instead.
  const security = noticesFor({
    check: ran({ security: { vulnerabilities: { high: 2, total: 2 } } }),
    checks: verdict([red('security')]),
  });
  expect(kindsOf(security)).toEqual(['security-finding']);
});

test('a file two red slots name takes one row, its why naming both, and their untouched files take none (D67)', () => {
  const notices = noticesFor({
    changed: [change('src/pm/tools.ts')],
    checks: verdict([
      red('lint', ['src/pm/tools.ts'], ['src/pm/tools.ts']),
      red('health', ['src/doctor.ts', 'src/pm/tools.ts'], ['src/pm/tools.ts']),
    ]),
  });

  expect(notices.map((notice) => [notice.kind, notice.target])).toEqual([['red-check-slot', 'src/pm/tools.ts']]);
  expect(notices[0]?.why).toBe('the `health` and `lint` checks are red on this changed file');
  expect(notices[0]?.inputs['slots']).toBe(2);
});

test('a torn stitch puts a red test slot on the changed file the failing test imports, not on the test (D67)', () => {
  const notices = noticesFor({
    changed: [change('src/pm/tools.ts')],
    check: ran({ test: { results: [{ path: 'src/__tests__/tools.test.ts', status: 'failed' }] } }, [
      { name: 'test', ok: false, skipped: false },
    ]),
  });

  expect(notices.map((notice) => [notice.kind, notice.target])).toEqual([['red-check-slot', 'src/pm/tools.ts']]);
  expect(notices[0]?.why).toBe('the `test` check is red on this changed file');
});

test("checkride PR 2's shape ranks no standing or global red, so the change's own finding stands alone (D67)", () => {
  const notices = noticesFor({
    // One changed file whose reach stays in its own cell, with one uncovered changed line and a mutant alive on it.
    check: ran(
      {
        coverage: [{ path: 'src/pm/util.ts', statements: [{ line: 10, hits: 3 }, { line: 12, hits: 0 }] }],
        mutation: [{ path: 'src/pm/util.ts', mutants: [{ line: 10, status: 'Survived' }] }],
        dead: NO_DEAD,
        dupes: { clone_families: [{ files: ['src/doctor.ts', 'src/index.ts'] }] },
        health: {
          ...NO_HEALTH,
          findings: [
            { path: 'src/doctor.ts', exceeded: 'crap', line: 12, line_count: 30 },
            { path: 'src/pm/probe.ts', exceeded: 'cognitive', line: 4, line_count: 18 },
          ],
        },
      },
      // Global `dead` and `snippets`, and `dupes` and `health` on files the change never touched: all standing state.
      ['dead', 'dupes', 'health', 'snippets'].map((name) => ({ name, ok: false, skipped: false })),
    ),
  });

  expect(notices.map((notice) => [notice.kind, notice.target])).toEqual([['survived-mutants', 'src/pm/util.ts']]);
});

test('a health red whose finding no hunk meets is standing, and no threshold-breached row comes back for it (D73)', () => {
  // The quiet change wrote lines 10 to 13 of `util.ts`; this function over the threshold spans 30 to 41.
  const untouched = { ...UTIL_BREACH, line: 30 };
  const health = (finding: typeof UTIL_BREACH, ok: boolean): CheckArtifacts =>
    ran({ health: { ...NO_HEALTH, findings: [finding] } }, [{ name: 'health', ok, skipped: false }]);

  // Red, the finding is standing state: no red row, and no threshold row returns for it at the lower severity.
  expect(noticesFor({ check: health(untouched, false) })).toEqual([]);
  // Green, the untouched finding raises nothing either: the threshold row reads the same line rule as the split.
  expect(noticesFor({ check: health(untouched, true) })).toEqual([]);
  // A pure deletion inside the function touches it, so the green slot's finding is a threshold row again.
  const deleted = noticesFor({ changed: [change('src/pm/util.ts', 0, 2, [{ start: 35, count: 0 }])], check: health(untouched, true) });
  expect(kindsOf(deleted)).toEqual(['threshold-breached']);
  expect(deleted[0]?.why).toBe(`cyclomatic over threshold in a function this change touched; ${HEAD_ONLY}`);
  // Where the change's hunk falls inside the function, the red is the change's: one row, which speaks for the threshold.
  expect(kindsOf(noticesFor({ check: health(UTIL_BREACH, false) }))).toEqual(['red-check-slot']);
});

/** The failing test apollo-client #12633 edited itself: a test file, so in no cell and reaching none (D4). */
const FAILING = 'src/__tests__/tools.test.ts';

/**
 * apollo-client #12633's shape (Q29): the PR's own failing test beside a red
 * `health` on a file that reaches three cells, an interface change in band 5,
 * and a large change to a hot file. The test carries apollo's history, so it
 * weighs what apollo's did, 10 × 1 × 1 × 4.56, and every other row outweighs it.
 */
const APOLLO: Scenario = {
  changed: [change(FAILING), change('src/pm/tools.ts'), change('src/pm/index.ts'), change('src/pm/util.ts', 90, 20)],
  bands: { [PM]: 5 },
  exports: { 'src/pm/index.ts': ['resolve'] },
  baseExports: { 'src/pm/index.ts': [] },
  checks: verdict([red('health', ['src/pm/tools.ts'], ['src/pm/tools.ts']), red('test', [FAILING], [FAILING])]),
  history: [
    { path: FAILING, churn_ratio: 3.06, bugfix_rate: 0.5 },
    { path: 'src/pm/tools.ts', churn_ratio: 1 },
    { path: 'src/pm/index.ts', churn_ratio: 1.5 },
    { path: 'src/pm/util.ts', churn_ratio: 6 },
  ],
};

/** Each notice as its kind and target, the two things a reader of the ranking sees first. */
function rowsOf(notices: readonly Notice[]): readonly (readonly [string, string])[] {
  return notices.map((notice) => [notice.kind, notice.target] as const);
}

test("apollo-client #12633's failing test takes the primary slot over every heavier row (D74)", () => {
  const notices = noticesFor(APOLLO);

  expect(notices[0]).toMatchObject({ kind: 'red-check-slot', target: FAILING, tier: 'primary', weight: 45.6 });
  expect(notices[0]?.why).toBe('the `test` check is red on this changed file');
  // Every row behind it outweighs it, and behind it the weight order is the one §5.4 gives.
  const behind = notices.slice(1);
  expect(rowsOf(behind)).toEqual([
    ['interface-change', 'src/pm/index.ts'],
    ['red-check-slot', 'src/pm/tools.ts'],
    ['large-hot-change', 'src/pm/util.ts'],
  ]);
  expect(behind.every((notice) => notice.weight > 45.6)).toBe(true);
  const weights = behind.map((notice) => notice.weight);
  expect(weights).toEqual(weights.toSorted((a, b) => b - a));
});

test('a second failing test on the change keeps the place its weight gives it (D74)', () => {
  // Its path sorts ahead of apollo's test and it carries no history, so it weighs the bare severity.
  const second = 'src/__tests__/probe.test.ts';
  const notices = noticesFor({
    ...APOLLO,
    files: [second],
    changed: [...(APOLLO.changed ?? []), change(second)],
    checks: verdict([
      red('health', ['src/pm/tools.ts'], ['src/pm/tools.ts']),
      red('test', [second, FAILING], [second, FAILING]),
    ]),
  });

  // The heavier failing test leads; the lighter one falls to last, behind every row that outweighs it.
  expect(notices.map((notice) => notice.target)).toEqual([
    FAILING,
    ...rowsOf(noticesFor(APOLLO).slice(1)).map(([, target]) => target),
    second,
  ]);
  expect(notices.at(-1)).toMatchObject({ kind: 'red-check-slot', weight: 10 });
});

/** `CROWDED`'s red row: the gate on `tools.ts`, whichever slot is red there. */
function isGate([kind, target]: readonly [string, string]): boolean {
  return kind === 'red-check-slot' && target === 'src/pm/tools.ts';
}

test('with no red test the ranking is weight order, and a red test lifts its own row alone (D74)', () => {
  const asLint = noticesFor(CROWDED);
  const asTest = noticesFor({
    ...CROWDED,
    checks: verdict([red('types'), red('test', ['src/doctor.ts', 'src/pm/tools.ts'], ['src/pm/tools.ts'])]),
  });

  // With `lint` red the red row sits where its weight puts it, behind the cycle that history lifted.
  const weights = asLint.map((notice) => notice.weight);
  expect(weights).toEqual(weights.toSorted((a, b) => b - a));
  expect(rowsOf(asLint).findIndex(isGate)).toBeGreaterThan(0);
  // With `test` red, that one row moves to the front and the rest keep their order around the gap it left.
  expect(isGate(rowsOf(asTest)[0] ?? ['', ''])).toBe(true);
  expect(rowsOf(asTest).slice(1)).toEqual(rowsOf(asLint).filter((row) => !isGate(row)));
});

test('a consumer that has already dropped the name is not a live consumer', () => {
  const takes = { 'src/pm/index.ts > src/pm/tools.ts': ['resolve'] };
  const broken = noticesFor({ changed: [change('src/pm/tools.ts')], names: takes });
  const mended = noticesFor({ changed: [change('src/pm/tools.ts')], baseNames: takes });
  const exported = noticesFor({
    changed: [change('src/pm/tools.ts')],
    names: takes,
    exports: { 'src/pm/tools.ts': ['resolve'] },
  });

  expect(kindsOf(broken)).toEqual(['deleted-export']);
  expect(broken[0]?.target).toBe('src/pm/tools.ts');
  expect(broken[0]?.why).toContain('`resolve`');
  // The head version of the importer no longer takes the name, so nothing is broken.
  expect(mended).toEqual([]);
  // And a name the head still exports was never deleted.
  expect(exported).toEqual([]);
});

test('a deleted file keeps the consumers only the base graph can see', () => {
  const notices = noticesFor({
    changed: [{ path: 'src/pm/gone.ts', kind: 'deleted', added: 0, deleted: 12, hunks: [] }],
    files: ['src/pm/gone.ts'],
    deleted: ['src/pm/gone.ts'],
    baseEdges: ['src/pm/tools.ts > src/pm/gone.ts'],
    baseNames: { 'src/pm/tools.ts > src/pm/gone.ts': ['helper'] },
  });

  // The file is gone from the head scan, so every name it exported is missing and its base importer is the consumer.
  expect(kindsOf(notices)).toEqual(['deleted-export']);
  expect(notices[0]?.inputs['consumers']).toBe(1);
});

test('the deleted-export why pluralises its consumer count', () => {
  const one = noticesFor({
    changed: [change('src/pm/tools.ts')],
    names: { 'src/pm/index.ts > src/pm/tools.ts': ['resolve'] },
  });
  expect(one[0]?.kind).toBe('deleted-export');
  expect(one[0]?.why).toContain('1 file still imports it');

  // Three base importers of a deleted file's name, so the clause reads as a plural.
  const three = noticesFor({
    changed: [{ path: 'src/pm/gone.ts', kind: 'deleted', added: 0, deleted: 12, hunks: [] }],
    files: ['src/pm/gone.ts', 'src/a.ts', 'src/b.ts', 'src/c.ts'],
    deleted: ['src/pm/gone.ts'],
    baseEdges: ['src/a.ts > src/pm/gone.ts', 'src/b.ts > src/pm/gone.ts', 'src/c.ts > src/pm/gone.ts'],
    baseNames: {
      'src/a.ts > src/pm/gone.ts': ['helper'],
      'src/b.ts > src/pm/gone.ts': ['helper'],
      'src/c.ts > src/pm/gone.ts': ['helper'],
    },
  });
  expect(three[0]?.kind).toBe('deleted-export');
  expect(three[0]?.inputs['consumers']).toBe(3);
  expect(three[0]?.why).toContain('3 files still import it');
});

/** `pm`'s barrel, in band 5 and read from `doctor.ts`: the interface file every D76 case below edits. */
const BARREL = 'src/pm/index.ts';

/** The barrel's one export, as the scan prints it. */
const RESOLVE = 'function resolve(slot: string): string;';

/** An edit to the barrel, with the exports and shapes the scenario gives at base and at head. */
function barrelEdit(scenario: Scenario): Scenario {
  return { changed: [change(BARREL)], bands: { [PM]: 5 }, ...scenario };
}

test('a body-only edit to an interface file moves no name and no shape, and raises no notice (D76)', () => {
  const notices = noticesFor(barrelEdit({ exports: { [BARREL]: ['resolve'] }, shapes: { [BARREL]: { resolve: RESOLVE } } }));

  expect(notices).toEqual([]);
});

test('a moved fingerprint raises interface-change, its why naming the name that moved (D76)', () => {
  const notices = noticesFor(
    barrelEdit({
      exports: { [BARREL]: ['resolve'] },
      baseShapes: { [BARREL]: { resolve: RESOLVE } },
      shapes: { [BARREL]: { resolve: 'function resolve(slot: string, root: string): string;' } },
    }),
  );

  expect(rowsOf(notices)).toEqual([['interface-change', BARREL]]);
  expect(notices[0]?.why).toBe('the interface of `src/pm` changed (`resolve` reshaped) and it sits in band 5');
  expect(notices[0]?.inputs).toMatchObject({ names_added: 0, names_removed: 0, names_reshaped: 1, names_uncompared: 0 });
});

test('an added name raises interface-change whatever its shape, and a long list is counted (D76)', () => {
  const one = noticesFor(
    barrelEdit({
      exports: { [BARREL]: ['resolve', 'resolveTool'] },
      baseExports: { [BARREL]: ['resolve'] },
      shapes: { [BARREL]: { resolve: RESOLVE, resolveTool: null } },
    }),
  );
  expect(rowsOf(one)).toEqual([['interface-change', BARREL]]);
  expect(one[0]?.why).toBe('the interface of `src/pm` changed (`resolveTool` added) and it sits in band 5');

  const five = noticesFor(barrelEdit({ exports: { [BARREL]: ['a', 'b', 'c', 'd', 'e'] }, baseExports: { [BARREL]: [] } }));
  expect(five[0]?.why).toBe('the interface of `src/pm` changed (`a`, `b`, `c` and 2 more added) and it sits in band 5');
  expect(five[0]?.inputs['names_added']).toBe(5);
});

test('a removed name a live importer still takes raises deleted-export alone, the destructive kind (D76)', () => {
  const edit = barrelEdit({
    exports: { [BARREL]: ['resolve'] },
    baseExports: { [BARREL]: ['legacy', 'resolve'] },
    shapes: { [BARREL]: { resolve: RESOLVE } },
  });
  const takes = { 'src/doctor.ts > src/pm/index.ts': ['legacy'] };

  // `doctor.ts` still takes `legacy` at head, so the import is broken and deleted-export is the one row.
  expect(rowsOf(noticesFor({ ...edit, names: takes }))).toEqual([['deleted-export', BARREL]]);
  // Once the importer has let the name go nothing is broken, and the removed name is an interface change.
  const mended = noticesFor({ ...edit, baseNames: takes });
  expect(rowsOf(mended)).toEqual([['interface-change', BARREL]]);
  expect(mended[0]?.why).toBe('the interface of `src/pm` changed (`legacy` removed) and it sits in band 5');
});

test('an export whose shape could not be compared keeps the notice, and its why never reads as unchanged (C2, D76)', () => {
  const inferred = noticesFor(
    barrelEdit({ exports: { [BARREL]: ['VERSION', 'resolve'] }, shapes: { [BARREL]: { VERSION: null, resolve: RESOLVE } } }),
  );
  expect(rowsOf(inferred)).toEqual([['interface-change', BARREL]]);
  expect(inferred[0]?.why).toBe(
    'the interface of `src/pm` was touched and it sits in band 5; the shape of `VERSION` could not be compared',
  );
  expect(inferred[0]?.inputs).toMatchObject({ names_reshaped: 0, names_uncompared: 1 });

  // A scan that never read the shapes compares the same way, rather than as a match.
  const unread = noticesFor(barrelEdit({ exports: { [BARREL]: ['resolve'] } }));
  expect(unread[0]?.why).toBe(
    'the interface of `src/pm` was touched and it sits in band 5; the shape of `resolve` could not be compared',
  );
});

function scanOf(path: string, exports: readonly string[]): ScanFile {
  return { path, loc: 10, exports };
}

/** A re-export edge: it takes what it passes on (D75). */
function reexport(from: string, to: string, reexports: readonly PassedName[]): NamedEdge {
  return { from, to, names: reexports.map((pass) => pass.name), reexports };
}

test('the public names are what a published entry exposes, followed by name through every kind of re-export (D75)', () => {
  const found = findPublicNames([
    {
      files: [
        scanOf('src/index.ts', ['Renamed', 'TRPCMutationKey', 'TRPCQueryKey', 'ns']),
        scanOf('src/internals/types.ts', ['TRPCMutationKey', 'TRPCQueryKey']),
        scanOf('src/internals/keys.ts', ['TRPCQueryKey', 'unused']),
        scanOf('src/util.ts', ['helper', 'internal']),
        scanOf('src/ns.ts', ['a', 'b']),
        scanOf('src/secret.ts', ['secret']),
        scanOf('src/loop-a.ts', ['loop']),
        scanOf('src/loop-b.ts', ['loop']),
      ],
      edges: [
        // `export type * from './internals/types.js'`, which itself `export *`s the keys.
        reexport('src/index.ts', 'src/internals/types.ts', [{ name: '*', as: '*' }]),
        reexport('src/internals/types.ts', 'src/internals/keys.ts', [{ name: '*', as: '*' }]),
        // `export { helper as Renamed } from './util.js'`: `internal` is never passed on.
        reexport('src/index.ts', 'src/util.ts', [{ name: 'helper', as: 'Renamed' }]),
        // `export * as ns from './ns.js'` hands `ns` the whole of the target.
        reexport('src/index.ts', 'src/ns.ts', [{ name: '*', as: 'ns' }]),
        // An import is no re-export, whatever it takes.
        { from: 'src/index.ts', to: 'src/secret.ts', names: ['secret'] },
        // Two files that star each other settle rather than recur.
        reexport('src/secret.ts', 'src/loop-a.ts', [{ name: '*', as: '*' }]),
        reexport('src/loop-a.ts', 'src/loop-b.ts', [{ name: '*', as: '*' }]),
        reexport('src/loop-b.ts', 'src/loop-a.ts', [{ name: '*', as: '*' }]),
      ],
      members: [
        { name: '@trpc/x', published: true, surface: ['src/index.ts'] },
        { name: 'private-root', published: false, surface: ['src/secret.ts'] },
        { name: 'unread' },
      ],
    },
  ]);

  expect(Object.fromEntries(found)).toEqual({
    'src/index.ts': { names: ['Renamed', 'TRPCMutationKey', 'TRPCQueryKey', 'ns'], members: ['@trpc/x'] },
    'src/internals/types.ts': { names: ['TRPCMutationKey', 'TRPCQueryKey'], members: ['@trpc/x'] },
    'src/internals/keys.ts': { names: ['TRPCQueryKey'], members: ['@trpc/x'] },
    'src/util.ts': { names: ['helper'], members: ['@trpc/x'] },
    'src/ns.ts': { names: ['a', 'b'], members: ['@trpc/x'] },
  });

  // Published, the private root's star cycle is walked once each way and settles.
  const loop = findPublicNames([
    {
      files: [scanOf('src/loop-a.ts', ['loop']), scanOf('src/loop-b.ts', ['loop'])],
      edges: [
        reexport('src/loop-a.ts', 'src/loop-b.ts', [{ name: '*', as: '*' }]),
        reexport('src/loop-b.ts', 'src/loop-a.ts', [{ name: '*', as: '*' }]),
      ],
      members: [{ name: 'loop', published: true, surface: ['src/loop-a.ts'] }],
    },
  ]);
  expect([...loop.keys()]).toEqual(['src/loop-a.ts', 'src/loop-b.ts']);
});

/** trpc's internals file, which the package barrel re-exports whole and which nothing else reads (D75). */
const INTERNALS = 'src/internals/types.ts';

const TRPC = '@trpc/tanstack-react-query';

const MUTATION_KEY = 'type TRPCMutationKey = [path: readonly string[]];';

/** The query key before trpc #6976, and after it gained a leading element (D76). */
const QUERY_KEY = 'type TRPCQueryKey = [path: readonly string[]];';
const PREFIXED_KEY = 'type TRPCQueryKey = [prefix: readonly string[], path: readonly string[]];';

/**
 * trpc #6976's shape: `src/index.ts` is the `.` export of a published member
 * and `export type *`s the internals file, which only it reads, so its cell
 * has a fan-in of 1 in band 1. The change adds a leading element to the key.
 */
function trpc(scenario: Scenario = {}): Scenario {
  const barrel = `src/index.ts > ${INTERNALS}`;
  const keys = ['TRPCMutationKey', 'TRPCQueryKey'];
  return {
    files: [INTERNALS],
    edges: [barrel],
    names: { [barrel]: ['*'] },
    reexports: { [barrel]: [{ name: '*', as: '*' }] },
    exports: { 'src/index.ts': keys, [INTERNALS]: keys },
    baseShapes: { [INTERNALS]: { TRPCMutationKey: MUTATION_KEY, TRPCQueryKey: QUERY_KEY } },
    shapes: { [INTERNALS]: { TRPCMutationKey: MUTATION_KEY, TRPCQueryKey: PREFIXED_KEY } },
    members: [{ name: TRPC, published: true, surface: ['src/index.ts'] }],
    changed: [change(INTERNALS)],
    bands: { 'directory:src/internals': 1 },
    fanIn: { 'directory:src/internals': 1 },
    ...scenario,
  };
}

test("trpc #6976's shape reads the internals file's names as public, so a reshaped key raises interface-change (D75)", () => {
  const notices = noticesFor(trpc());

  expect(rowsOf(notices)).toEqual([['interface-change', INTERNALS]]);
  expect(notices[0]?.why).toBe(
    `the interface of \`src/internals\` changed (\`TRPCQueryKey\` reshaped) and \`${TRPC}\` publishes \`TRPCMutationKey\` and \`TRPCQueryKey\``,
  );
  expect(notices[0]?.inputs).toMatchObject({ band: 1, fan_in: 1, public_names: 2, names_reshaped: 1 });

  // Wide is not moved: a public file whose names and shapes held still raises nothing (D76).
  expect(noticesFor(trpc({ shapes: { [INTERNALS]: { TRPCMutationKey: MUTATION_KEY, TRPCQueryKey: QUERY_KEY } } }))).toEqual(
    [],
  );
});

test('a private member without publishConfig publishes no name, so the internals file reads as narrow (D75)', () => {
  const unpublished = trpc({ members: [{ name: TRPC, published: false, surface: ['src/index.ts'] }] });

  expect(inputsFor(unpublished).publicNames.size).toBe(0);
  expect(noticesFor(unpublished)).toEqual([]);
});

test('a name the barrel does not re-export stays internal, and a file holding no public name stays narrow (D75)', () => {
  const barrel = `src/index.ts > ${INTERNALS}`;
  // `export type { TRPCQueryKey } from './internals/types.js'`: the mutation key is never passed on.
  const byName = trpc({
    names: { [barrel]: ['TRPCQueryKey'] },
    reexports: { [barrel]: [{ name: 'TRPCQueryKey', as: 'TRPCQueryKey' }] },
    exports: { 'src/index.ts': ['TRPCQueryKey'], [INTERNALS]: ['TRPCMutationKey', 'TRPCQueryKey'] },
  });
  expect(inputsFor(byName).publicNames.get(INTERNALS)).toEqual({ names: ['TRPCQueryKey'], members: [TRPC] });

  // Imported rather than re-exported, the internals file holds no public name and its fan-in of 1 is all it has.
  const imported = trpc({ reexports: {} });
  expect(inputsFor(imported).publicNames.has(INTERNALS)).toBe(false);
  expect(noticesFor(imported)).toEqual([]);
});

test('a ghost is the file that usually comes along, named by what expected it', () => {
  const cochange: readonly Cochange[] = [
    { a: 'src/pm/util.ts', b: 'src/doctor.ts', rate: 0.8, support: 4 },
    // Below either gate, and so not a ghost: the pair is coincidence, not a habit.
    { a: 'src/pm/util.ts', b: 'src/index.ts', rate: 0.4, support: 9 },
    { a: 'src/pm/util.ts', b: 'src/pm/tools.ts', rate: 0.9, support: 2 },
  ];
  const ghosts = findGhosts(cochange, ['src/pm/util.ts'], DEFAULT_CONFIG.notices);
  const notice = noticesFor({ cochange })[0];

  expect(ghosts).toEqual([{ path: 'src/doctor.ts', with: ['src/pm/util.ts'], rate: 0.8, support: 4 }]);
  expect(notice?.target).toBe('src/doctor.ts');
  expect(notice?.why).toContain('src/pm/util.ts');
  // A file this change already touches is not absent, however often the two travel together.
  expect(findGhosts(cochange, ['src/pm/util.ts', 'src/doctor.ts'], DEFAULT_CONFIG.notices)).toEqual([]);
});

test('a ghost is ranked by its rate and support, so the path alphabet no longer decides (D55)', () => {
  // Four co-change ghosts at the severity floor, so only their rate and support can
  // separate them; support 2 needs the gate lowered to admit the quiet one.
  const config: Config = { ...DEFAULT_CONFIG, notices: { ...DEFAULT_CONFIG.notices, cochange_support: 2 } };
  const rank = (strong: string, weak: string): readonly Notice[] =>
    rankNotices({
      ...inputsFor({
        cochange: [
          { a: 'src/pm/util.ts', b: strong, rate: 0.857, support: 6 },
          { a: 'src/pm/util.ts', b: weak, rate: 0.5, support: 2 },
          { a: 'src/pm/util.ts', b: 'src/mike.ts', rate: 0.6, support: 3 },
          { a: 'src/pm/util.ts', b: 'src/november.ts', rate: 0.6, support: 3 },
        ],
      }),
      config,
    });

  // The strong ghost sorts last alphabetically and still ranks first.
  const late = rank('src/zulu.ts', 'src/alpha.ts');
  expect(kindsOf(late)).toEqual(['missing-cochange', 'missing-cochange', 'missing-cochange', 'missing-cochange']);
  expect(rankOf(late, 'src/zulu.ts')).toBeLessThan(rankOf(late, 'src/alpha.ts'));
  // And with the paths swapped it still wins: the weight decides, not the path.
  const early = rank('src/alpha.ts', 'src/zulu.ts');
  expect(rankOf(early, 'src/alpha.ts')).toBeLessThan(rankOf(early, 'src/zulu.ts'));

  // The strong ghost is the primary, weighed severity × (1 + rate) × (1 + log(1 + support)).
  expect(late[0]?.target).toBe('src/zulu.ts');
  expect(late[0]?.tier).toBe('primary');
  expect(late[0]?.weight).toBe(10.941);
  // Its inputs carry the pair's rate and support and no zeroed §5.4 factors (D9).
  expect(late[0]?.inputs).toEqual({ rate: 0.857, support: 6 });
  expect(late[0]?.thresholds).toEqual({ severity: 2, cochange_rate: 0.5, cochange_support: 2 });
});

test('a missing channel produces no candidate at all, rather than a candidate with a zero in it', () => {
  expect(noticesFor({})).toEqual([]);
  // No `.check/` at all: nothing to say about coverage, mutants, thresholds or vulnerabilities (C2).
  expect(noticesFor({ changed: [change('src/pm/tools.ts', 300, 200)] })).toEqual([]);
});
