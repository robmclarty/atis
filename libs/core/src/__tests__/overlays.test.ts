import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { DEFAULT_CONFIG } from '../config.js';
import type { CheckArtifacts, Dead, Dupes, Health, HealthFinding } from '../evidence.js';
import type { Commit } from '../history.js';
import { buildMap, buildRepoMap, layOutTerrain } from '../map.js';
import type { BuildInputs, RepoInputs } from '../map.js';
import { computeOverlays } from '../overlays.js';
import type { CheckBaseline, OverlayInputs } from '../overlays.js';
import { assertMap } from '../schema.js';
import type { Overlays } from '../schema.js';

/**
 * Each overlay is read from one source and tested on its own, absent with
 * its reason where that source is (D101, C2); the last block builds whole
 * `repo` maps over the demo fixture's head. Reading the fixture with
 * `node:fs` is fine here: C1 covers the code core ships, not its tests.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = JSON.parse(readFileSync(join(HERE, '..', '..', 'fixtures', 'demo', 'inputs.json'), 'utf8')) as BuildInputs;

type RanCheck = Extract<CheckArtifacts, { mode: 'check' }>;
type Channels = Omit<RanCheck, 'mode' | 'summary' | 'fallow_schemas' | 'stale'> & Partial<Pick<RanCheck, 'stale'>>;

const SLOTS = ['dead', 'dupes', 'health', 'test'];

/** A trusted `.check/` whose fallow and test slots all ran, holding `channels`. */
function ran(channels: Channels, skipped: readonly string[] = []): CheckArtifacts {
  const checks = SLOTS.map((name) => ({ name, ok: true, skipped: skipped.includes(name) }));
  const summary = { ok: true, checks_run: checks.length, timestamp: '2026-10-26T00:00:00.000Z', total_duration_ms: 1, checks };
  return { mode: 'check', fallow_schemas: {}, stale: [], ...channels, summary };
}

const NO_BASELINE: CheckBaseline = { reason: 'no checkride.baseline.json is committed at the head' };

/** Four files on the terrain, `c.ts` holding no code; `z.ts` is a file the map never places. */
function overlaysOf(over: Partial<OverlayInputs> = {}): Overlays {
  return computeOverlays({
    placed: new Set(['a.ts', 'a.tsx', 'b.ts', 'c.ts', 'd.ts']),
    terrain: new Map([
      ['a.ts', [{ start: 1, end: 9 }]],
      ['b.ts', [{ start: 1, end: 4 }]],
      ['c.ts', []],
      ['d.ts', [{ start: 2, end: 3 }]],
    ]),
    commits: [],
    check: ran({}),
    coverage_unnamed: false,
    baseline: NO_BASELINE,
    config: DEFAULT_CONFIG.overlays,
    ...over,
  });
}

function commit(sha: string, ...paths: readonly string[]): Commit {
  return { sha, time: 0, subject: sha, files: paths.map((path) => ({ path, added: 1, deleted: 0 })) };
}

function health(over: Partial<Health>): Health {
  return { file_scores: [], findings: [], ...over };
}

function score(path: string, maintainability: number, total?: number): Health['file_scores'][number] {
  return { path, lines: 10, function_count: 1, maintainability_index: maintainability, crap_max: 1, ...(total === undefined ? {} : { total_cyclomatic: total }) };
}

function finding(path: string, name: string | undefined, line: number, exceeded: string, col?: number): HealthFinding {
  return { path, exceeded, line, line_count: 5, ...(name === undefined ? {} : { name }), ...(col === undefined ? {} : { col }) };
}

function dead(over: Partial<Dead>): Dead {
  return { circular_dependencies: [], re_export_cycles: [], boundary_violations: [], unused_exports: [], ...over };
}

function muted(overlays: Overlays): readonly string[] {
  return overlays.muted ?? [];
}

describe('trouble spots: churn × complexity (§8)', () => {
  test("each file the window touched and fallow totals the complexity of scores its product against the repository's worst", () => {
    const overlays = overlaysOf({
      commits: [commit('c3', 'a.ts'), commit('c2', 'a.ts', 'z.ts'), commit('c1', 'a.ts', 'b.ts', 'z.ts')],
      check: ran({ health: health({ file_scores: [score('a.ts', 70, 10), score('b.ts', 80, 40), score('c.ts', 90, 5), score('z.ts', 50, 100)] }) }),
    });

    // `c.ts` was never touched, and `z.ts` is not a file the map places.
    expect(overlays.trouble_spots).toEqual([
      { path: 'a.ts', commits: 3, complexity: 10, score: 0.75 },
      { path: 'b.ts', commits: 1, complexity: 40, score: 1 },
    ]);
  });

  test('a health report that totals no file\'s complexity mutes the overlay and says why, leaving the ugly spots drawn', () => {
    const overlays = overlaysOf({ commits: [commit('c1', 'a.ts')], check: ran({ health: health({ file_scores: [score('a.ts', 70)] }) }) });

    expect(overlays.trouble_spots).toBeUndefined();
    expect(muted(overlays)).toContain("trouble_spots: health.json totals no file's cyclomatic complexity");
    expect(overlays.ugly_spots).toEqual([{ path: 'a.ts', maintainability: 70, breaches: [] }]);
  });

  test('no trusted .check/ mutes every overlay it feeds with its reason, while the recent heat reads git alone', () => {
    const overlays = overlaysOf({ commits: [commit('c1', 'a.ts')], check: { mode: 'git-only', reason: '.check/ is absent' } });

    expect(muted(overlays)).toEqual([
      'baselined: no checkride.baseline.json is committed at the head',
      'coverage_gaps: .check/ is absent',
      'cycles: .check/ is absent',
      'dead_code: .check/ is absent',
      'duplication: .check/ is absent',
      'trouble_spots: .check/ is absent',
      'ugly_spots: .check/ is absent',
    ]);
    expect(overlays.recent_heat).toEqual({ commits: 1, files: [{ path: 'a.ts', commits: 1 }] });
  });
});

describe('ugly spots: thresholds and maintainability (§8)', () => {
  test('every file fallow scored or found over a threshold, with each function and every rule it breaks', () => {
    const overlays = overlaysOf({
      check: ran({
        health: health({
          file_scores: [score('a.ts', 61.4), score('b.ts', 92.1), score('z.ts', 10)],
          findings: [finding('a.ts', 'resolve', 41, 'cyclomatic_crap'), finding('a.ts', '<arrow>', 3, 'cognitive'), finding('c.ts', undefined, 8, 'crap')],
        }),
      }),
    });

    // A compound `exceeded` is split one rule per threshold; `c.ts` was never scored, so it carries no index (C2).
    expect(overlays.ugly_spots).toEqual([
      {
        path: 'a.ts',
        maintainability: 61.4,
        breaches: [
          { function: '<arrow>', line: 3, rules: ['cognitive'] },
          { function: 'resolve', line: 41, rules: ['crap', 'cyclomatic'] },
        ],
      },
      { path: 'b.ts', maintainability: 92.1, breaches: [] },
      { path: 'c.ts', breaches: [{ line: 8, rules: ['crap'] }] },
    ]);
  });

  test('a skipped health slot mutes both health overlays by name', () => {
    const overlays = overlaysOf({ check: ran({}, ['health']) });

    expect(overlays.ugly_spots).toBeUndefined();
    expect(muted(overlays)).toContain('ugly_spots: the health slot was skipped');
    expect(muted(overlays)).toContain('trouble_spots: the health slot was skipped');
  });
});

describe('coverage gaps (§8)', () => {
  const coverage = [
    { path: 'a.ts', statements: [{ line: 1, hits: 2 }, { line: 2, hits: 0 }, { line: 3, end: 5, hits: 0 }] },
    { path: 'b.ts', statements: [{ line: 1, hits: 1 }] },
    { path: 'z.ts', statements: [{ line: 1, hits: 0 }] },
  ];

  test('a file with statements that never ran, and a terrain file holding code the report never names (D80)', () => {
    const overlays = overlaysOf({ check: ran({ coverage }) });

    // `b.ts` ran whole, `c.ts` holds no code to measure, and `z.ts` is not placed.
    expect(overlays.coverage_gaps).toEqual([
      { path: 'a.ts', statements: 3, uncovered: 2 },
      { path: 'd.ts', unmeasured: true },
    ]);
  });

  test("a report that names none of the tree is muted, never read as every file unmeasured (D122)", () => {
    const overlays = overlaysOf({ check: ran({ coverage }), coverage_unnamed: true });

    expect(overlays.coverage_gaps).toBeUndefined();
    expect(muted(overlays)).toContain("coverage_gaps: the coverage report names none of the tree's source files");
  });

  test('a stale report is muted as stale (D41)', () => {
    const overlays = overlaysOf({ check: ran({ stale: [{ slot: 'test', file: 'coverage/coverage-final.json', age_ms: 9000 }] }) });

    expect(muted(overlays)).toContain('coverage_gaps: .check/coverage/coverage-final.json is stale');
  });
});

describe('dead code (§8)', () => {
  test('every file nothing imports and every export nothing reads, on the files the map places', () => {
    const overlays = overlaysOf({
      check: ran({
        dead: dead({
          unused_files: [{ path: 'c.ts' }, { path: 'z.ts' }],
          unused_exports: [{ path: 'a.ts', export_name: 'gone', line: 7, col: 13 }, { path: 'a.ts', name: 'alsoGone' }, { path: 'b.ts' }],
        }),
      }),
    });

    // An export fallow names no symbol for is no name to draw.
    expect(overlays.dead_code).toEqual([
      { path: 'a.ts', kind: 'export', name: 'alsoGone' },
      { path: 'a.ts', kind: 'export', name: 'gone', line: 7 },
      { path: 'c.ts', kind: 'file' },
    ]);
  });

  test('no dead.json mutes the dead code and the cycles alike', () => {
    const overlays = overlaysOf({ check: ran({}) });

    expect(muted(overlays)).toContain('dead_code: .check/dead.json is missing or unreadable');
    expect(muted(overlays)).toContain('cycles: .check/dead.json is missing or unreadable');
  });
});

describe('duplication (§8)', () => {
  test('each clone family on the files the map places, numbered by its own files, with the lines it duplicates', () => {
    const dupes: Dupes = {
      clone_families: [
        { files: ['d.ts', 'b.ts'], groups: [], total_duplicated_lines: 12 },
        { files: ['a.ts', 'z.ts'], groups: [] },
        { files: ['z.ts'], groups: [] },
      ],
    };
    const overlays = overlaysOf({ check: ran({ dupes }) });

    // The family on `z.ts` alone keeps its number, so the ids stay the terrain's, and draws nowhere.
    expect(overlays.duplication).toEqual([
      { id: 'family-1', files: ['a.ts'] },
      { id: 'family-2', files: ['b.ts', 'd.ts'], lines: 12 },
    ]);
  });

  test("the overlay names a family by the id the terrain's cells carry", () => {
    const map = buildRepoMap(repoInputs());
    const [family] = map.overlays?.duplication ?? [];

    expect(family).toEqual({ id: 'family-1', files: ['libs/core/src/pm/slots.ts', 'libs/core/src/pm/tools.ts'], lines: 34 });
    expect(map.terrain.organelles.find((organelle) => organelle.path === 'libs/core/src/pm/tools.ts')?.clone_family).toBe('family-1');
  });
});

describe('cycles (§8)', () => {
  test('every import cycle in import order and every cycle of re-exports, on the files the map places', () => {
    const overlays = overlaysOf({
      check: ran({ dead: dead({ circular_dependencies: [{ files: ['b.ts', 'a.ts'], length: 2 }], re_export_cycles: [{ files: ['d.ts', 'c.ts', 'z.ts'] }, { files: ['z.ts'] }] }) }),
    });

    expect(overlays.cycles).toEqual([
      { kind: 'import', files: ['b.ts', 'a.ts'] },
      { kind: 're-export', files: ['d.ts', 'c.ts'] },
    ]);
  });
});

describe('recent heat (§8)', () => {
  const commits = [commit('c3', 'a.ts', 'b.ts'), commit('c2', 'a.ts'), commit('c1', 'b.ts', 'z.ts')];

  test('the newest commits the config counts as recent, and how many of them touched each placed file', () => {
    const overlays = overlaysOf({ commits, config: { heat_commits: 2 } });

    expect(overlays.recent_heat).toEqual({ commits: 2, files: [{ path: 'a.ts', commits: 2 }, { path: 'b.ts', commits: 1 }] });
  });

  test('a window shorter than the config asks for is the window it is', () => {
    expect(overlaysOf({ commits }).recent_heat).toEqual({ commits: 3, files: [{ path: 'a.ts', commits: 2 }, { path: 'b.ts', commits: 2 }] });
  });
});

describe("baselined findings: checkride's keys compared, never parsed (D49)", () => {
  const healthFindings = [
    finding('a.ts', 'resolve', 41, 'cyclomatic', 2),
    finding('a.ts', '<arrow>', 3, 'cognitive', 4),
    finding('a.tsx', '<component>', 5, 'cognitive', 0),
    finding('b.ts', 'other', 9, 'crap', 0),
  ];

  test('a health finding is keyed by its function, an unnamed one by its position too, and an older positional unit key still reads', () => {
    const overlays = overlaysOf({
      check: ran({ health: health({ findings: healthFindings }) }),
      baseline: { slots: { health: ['health:a.ts:resolve', 'health:a.ts:<arrow>:3:4', 'health:a.tsx:<component>:5:0', 'health:b.ts:other:9:0'] } },
    });

    // `b.ts`'s function has a stable name, so its key carries no position and the positional one matches nothing.
    expect(overlays.baselined).toEqual([
      { kind: 'threshold', files: ['a.ts'], name: '<arrow>' },
      { kind: 'threshold', files: ['a.ts'], name: 'resolve' },
      { kind: 'threshold', files: ['a.tsx'], name: '<component>' },
    ]);
  });

  test('dead files, exports and cycles take their category, their file and symbol, and a cycle its sorted files', () => {
    const overlays = overlaysOf({
      check: ran({
        dead: dead({
          unused_files: [{ path: 'c.ts' }],
          unused_exports: [{ path: 'a.ts', export_name: 'gone', line: 7 }, { path: 'b.ts', export_name: 'kept', line: 2 }],
          circular_dependencies: [{ files: ['b.ts', 'a.ts'], line: 1, col: 0 }],
        }),
      }),
      baseline: { slots: { dead: ['dead-code:unused_files:c.ts', 'dead-code:unused_exports:a.ts:gone', 'dead-code:circular_dependencies:a.ts->b.ts'] } },
    });

    expect(overlays.baselined).toEqual([
      { kind: 'unused-export', files: ['a.ts'], name: 'gone' },
      { kind: 'cycle', files: ['b.ts', 'a.ts'] },
      { kind: 'unused-file', files: ['c.ts'] },
    ]);
  });

  test("a clone family is baselined only when the baseline holds every one of its groups' fingerprints", () => {
    const dupes: Dupes = {
      clone_families: [
        { files: ['a.ts', 'b.ts'], groups: [{ fingerprint: 'dup:1' }, { fingerprint: 'dup:2' }] },
        { files: ['c.ts', 'd.ts'], groups: [{ fingerprint: 'dup:3' }, { fingerprint: 'dup:4' }] },
      ],
    };
    const overlays = overlaysOf({ check: ran({ dupes }), baseline: { slots: { dupes: ['dupes:dup:1', 'dupes:dup:2', 'dupes:dup:3'] } } });

    expect(overlays.baselined).toEqual([{ kind: 'clone-family', files: ['a.ts', 'b.ts'], name: 'family-1' }]);
  });

  test('a key grandfathers as many findings as its count, one where the check was counted, and any number before counting', () => {
    const twice = ran({ health: health({ findings: [finding('b.ts', 'render', 3, 'cognitive'), finding('b.ts', 'render', 30, 'cognitive')] }) });
    const slots = { health: ['health:b.ts:render'] };

    // Two findings share one key the counted check grandfathers once: neither can be told from the new one, so neither is muted (C2).
    expect(overlaysOf({ check: twice, baseline: { slots, counts: { health: {} } } }).baselined).toEqual([]);
    expect(overlaysOf({ check: twice, baseline: { slots, counts: { health: { 'health:b.ts:render': 2 } } } }).baselined).toHaveLength(2);
    expect(overlaysOf({ check: twice, baseline: { slots } }).baselined).toHaveLength(2);
  });

  test('no committed baseline, or no fallow channel to compare it with, mutes the overlay and says why', () => {
    expect(muted(overlaysOf({ check: ran({ health: health({ findings: healthFindings }) }) }))).toContain(
      'baselined: no checkride.baseline.json is committed at the head',
    );
    expect(muted(overlaysOf({ baseline: { slots: { health: [] } } }))).toContain(
      'baselined: .check/ holds none of health.json, dead.json and dupes.json to compare the baseline with',
    );
  });
});

function repoInputs(over: Partial<RepoInputs> = {}): RepoInputs {
  return {
    meta: { repo: 'demo', named: 'HEAD', head: DEMO.meta.head, generated_at: '' },
    scan: DEMO.head,
    commits: DEMO.commits,
    head_time: DEMO.head_time,
    check: DEMO.check,
    baseline: NO_BASELINE,
    ...over,
  };
}

describe('a repo map (D101)', () => {
  test("is the head's terrain under a change of nothing, with no weather or notice, and the overlays in their place", () => {
    const map = buildRepoMap(repoInputs());

    expect(() => assertMap(map)).not.toThrow();
    expect(map.meta).toMatchObject({ mode: 'repo', base: 'HEAD', head: DEMO.meta.head, merge_base: DEMO.meta.head });
    expect(map.weather.changed).toEqual([]);
    expect(map.weather.reach).toEqual([]);
    expect(map.notices).toEqual([]);
    expect(map.sequence).toBeUndefined();
    // The demo's health totals no complexity, and it commits no baseline.
    expect(map.overlays?.muted).toEqual([
      'baselined: no checkride.baseline.json is committed at the head',
      "trouble_spots: health.json totals no file's cyclomatic complexity",
    ]);
  });

  test('lays the terrain out exactly as the terrain cache lays out the commit, and holds that layout when handed it (P2, D96)', () => {
    const layout = layOutTerrain(DEMO.head);

    expect(buildRepoMap(repoInputs()).terrain.layout).toEqual(layout);
    expect(buildRepoMap(repoInputs({ ground: layout })).terrain.layout).toEqual(layout);
  });

  test('builds the same bytes twice (C3)', () => {
    expect(JSON.stringify(buildRepoMap(repoInputs()))).toBe(JSON.stringify(buildRepoMap(repoInputs())));
  });

  test('draws no overlay on a test, which has no place of its own (D4)', () => {
    const tested = 'libs/core/src/__tests__/pm.test.ts';
    const check = DEMO.check.mode === 'check' ? DEMO.check : undefined;
    const map = buildRepoMap(
      repoInputs({ check: ran({ ...check, health: health({ file_scores: [score(tested, 40, 9), score('libs/core/src/pm/tools.ts', 64.9, 30)] }) }) }),
    );

    expect(map.overlays?.ugly_spots?.map((spot) => spot.path)).toEqual(['libs/core/src/pm/tools.ts']);
    expect(map.overlays?.trouble_spots?.map((spot) => spot.path)).toEqual(['libs/core/src/pm/tools.ts']);
  });

  test("mutes the coverage gaps, and says so beside the map's instruments, when the report names none of the tree (D122)", () => {
    const check = DEMO.check.mode === 'check' ? DEMO.check : undefined;
    const map = buildRepoMap(repoInputs({ check: ran({ ...check, coverage: [{ path: 'elsewhere/x.ts', statements: [{ line: 1, hits: 0 }] }] }) }));

    expect(map.overlays?.coverage_gaps).toBeUndefined();
    expect(map.meta.instruments.muted).toEqual(["coverage: the report names none of the tree's source files"]);
  });
});

describe('assertMap and the overlays', () => {
  const repo = (): Record<string, unknown> => JSON.parse(JSON.stringify(buildRepoMap(repoInputs()))) as Record<string, unknown>;

  test('refuses overlays on a change map, and a repo map without them', () => {
    const change = buildMap(DEMO);
    expect(() => assertMap({ ...change, overlays: {} })).toThrow(/overlays exactly on a repo map/);
    const { overlays: _gone, ...bare } = repo();
    expect(() => assertMap(bare)).toThrow(/overlays exactly on a repo map/);
  });

  test('refuses a repo map that changes a file or ranks a notice', () => {
    const map = buildMap(DEMO);
    expect(() => assertMap({ ...repo(), weather: map.weather })).toThrow(/a repo map changes no file/);
    expect(() => assertMap({ ...repo(), notices: map.notices })).toThrow(/a repo map ranks no notice/);
  });

  test('refuses an overlay that is neither drawn nor muted, or is both', () => {
    const map = repo();
    const overlays = map['overlays'] as Record<string, unknown>;
    const { recent_heat: _heat, ...unheated } = overlays;
    expect(() => assertMap({ ...map, overlays: unheated })).toThrow(/overlays\.recent_heat: absent with no reason/);
    expect(() => assertMap({ ...map, overlays: { ...overlays, trouble_spots: [] } })).toThrow(/overlays\.trouble_spots: drawn and muted both/);
  });

  test('refuses an overlay naming a file the map does not place', () => {
    const map = repo();
    const overlays = map['overlays'] as Record<string, unknown>;
    expect(() => assertMap({ ...map, overlays: { ...overlays, cycles: [{ kind: 'import', files: ['nowhere.ts'] }] } })).toThrow(/unknown organelle or group file "nowhere.ts"/);
  });
});
