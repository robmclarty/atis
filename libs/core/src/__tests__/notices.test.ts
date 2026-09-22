import { expect, test } from 'vitest';

import { DEFAULT_CONFIG } from '../config.js';
import type { Config, NoticeKind } from '../config.js';
import { computeEvidence } from '../evidence.js';
import type { CheckArtifacts, CheckSummarySlot, Dead, Health } from '../evidence.js';
import { identifyGroups } from '../groups.js';
import type { FileHistory } from '../history.js';
import { identifyModules } from '../modules.js';
import type { Modules, ScannedFile } from '../modules.js';
import { HEAD_ONLY, findGhosts, rankNotices } from '../notices.js';
import type { NamedEdge, NoticeInputs } from '../notices.js';
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
  /** Extra `'a > b'` edges the base graph had and the head graph lost. */
  readonly baseEdges?: readonly string[];
  /** The names an edge takes, in both graphs, keyed `'a > b'`. */
  readonly names?: Readonly<Record<string, readonly string[]>>;
  /** The names an edge took at base alone: what a consumer has since dropped. */
  readonly baseNames?: Readonly<Record<string, readonly string[]>>;
  /** What a head file exports; empty unless the scenario says otherwise. */
  readonly exports?: Readonly<Record<string, readonly string[]>>;
  readonly bands?: Readonly<Record<string, number>>;
  readonly fanIn?: Readonly<Record<string, number>>;
  readonly check?: CheckArtifacts;
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

type Ran = Extract<CheckArtifacts, { mode: 'check' }>;
type Channels = Omit<Ran, 'mode' | 'summary' | 'fallow_schemas' | 'stale'>;

/** A trusted `.check/` carrying the given channels; the summary itself is green, so only the channels speak. */
function ran(channels: Channels): CheckArtifacts {
  const checks: readonly CheckSummarySlot[] = [{ name: 'test', ok: true, skipped: false }];
  return {
    mode: 'check',
    summary: { ok: true, checks_run: 1, timestamp: '2026-09-17T05:52:40.668Z', total_duration_ms: 1_000, checks },
    fallow_schemas: {},
    stale: [],
    ...channels,
  };
}

function red(name: string, scope: CheckSlot['scope'] = 'global'): CheckSlot {
  return { name, ok: false, skipped: false, scope };
}

function verdict(slots: readonly CheckSlot[]): Checks {
  return { category: 'IFR', checks_run: slots.length, slots };
}

function change(path: string, added = 4, deleted = 1, hunks: readonly Hunk[] = [{ start: 10, count: 4 }]): DiffFile {
  return { path, kind: 'modified', added, deleted, hunks };
}

function edgesOf(scenario: Scenario, base: boolean): readonly NamedEdge[] {
  return [...EDGES, ...(base ? (scenario.baseEdges ?? []) : [])].map((pair): NamedEdge => {
    const [from = '', to = ''] = pair.split(' > ');
    const names = (base ? scenario.baseNames?.[pair] : undefined) ?? scenario.names?.[pair] ?? [];
    return { from, to, names };
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

/** The composition `buildMap` will use: place the change, read its evidence, then rank the notices off both. */
function inputsFor(scenario: Scenario): NoticeInputs {
  const paths = [...WORLD, ...(scenario.files ?? [])].toSorted();
  const scanned = paths.map((path): ScannedFile => ({ path, loc: 20, exports: scenario.exports?.[path] ?? [] }));
  const headEdges = edgesOf(scenario, false);
  const baseEdges = edgesOf(scenario, true);
  const modules = identifyModules(scanned, headEdges, []);
  // The terrain is scanned at the merge-base and the exports at head, so a deleted file is in one and not the other.
  const headFiles = scanned.filter((file) => !(scenario.deleted ?? []).includes(file.path));
  const groups = identifyGroups(scanned, DEFAULT_CONFIG.groups, []);
  const changed = scenario.changed ?? [change('src/pm/util.ts')];
  const check = scenario.check ?? NO_CHECK;
  const placed = computeReach({ changed, modules, groups, headEdges, baseEdges });
  const { files } = computeEvidence({ changed: placed.changed, modules, groups, headEdges, baseEdges, check });

  return {
    changed: placed.changed,
    files,
    checks: scenario.checks ?? NOINST,
    cells: cellsFor(modules, scenario),
    groups,
    history: scenario.history ?? [],
    cochange: scenario.cochange ?? [],
    deps_added: scenario.deps_added ?? [],
    headFiles,
    headEdges,
    baseEdges,
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
  'red-check-slot': { checks: verdict([red('types')]) },
  'cycle-or-boundary': {
    check: ran({ dead: { ...NO_DEAD, circular_dependencies: [{ files: ['src/pm/util.ts', 'src/pm/probe.ts'] }] } }),
  },
  'deleted-export': {
    changed: [change('src/pm/tools.ts')],
    names: { 'src/pm/index.ts > src/pm/tools.ts': ['resolve'] },
  },
  'interface-change': { changed: [change('src/pm/index.ts')], bands: { [PM]: 5 } },
  'uncovered-high-reach': {
    changed: [change('src/pm/tools.ts')],
    check: ran({ coverage: [{ path: 'src/pm/tools.ts', statements: [{ line: 10, hits: 0 }] }] }),
  },
  'survived-mutants': {
    check: ran({ mutation: [{ path: 'src/pm/util.ts', mutants: [{ line: 10, status: 'Survived' }] }] }),
  },
  'threshold-breached': {
    check: ran({ health: { ...NO_HEALTH, findings: [{ path: 'src/pm/util.ts', exceeded: 'cyclomatic' }] } }),
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

/** Everything at once: more candidates than the map has room for. */
const CROWDED: Scenario = {
  files: ['odd.qqq'],
  changed: [change('src/pm/tools.ts'), change('src/pm/index.ts'), change('src/pm/util.ts', 200, 10)],
  bands: { [PM]: 5 },
  checks: verdict([red('types'), red('test', ['src/doctor.ts', 'src/pm/tools.ts'])]),
  check: ran({
    coverage: [{ path: 'src/pm/tools.ts', statements: [{ line: 10, hits: 0 }] }],
    mutation: [{ path: 'src/pm/index.ts', mutants: [{ line: 10, status: 'Survived' }] }],
    health: { ...NO_HEALTH, findings: [{ path: 'src/pm/util.ts', exceeded: 'cyclomatic' }] },
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
  const findings = { ...NO_HEALTH, findings: [{ path: 'src/pm/util.ts', exceeded: 'cyclomatic' }] };
  const quiet = noticesFor({ check: ran({ health: findings }) });
  const loud = noticesFor({ check: ran({ health: findings }), checks: verdict([red('health', ['src/pm/util.ts'])]) });

  expect(kindsOf(quiet)).toEqual(['threshold-breached']);
  // The red slot says it louder and points at the same file; the threshold notice does not repeat it.
  expect(kindsOf(loud)).toEqual(['red-check-slot']);
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
