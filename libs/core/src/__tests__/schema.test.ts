import { expect, test } from 'vitest';

import { assertMap, SCHEMA_VERSION } from '../schema.js';
import type { ChangedFile, Layout, MapJson, Notice, NoticeTier } from '../schema.js';

function notice(tier: NoticeTier): Notice {
  return {
    tier,
    kind: 'test-kind',
    target: 'src/foo/index.ts',
    why: 'because the test says so',
    inputs: {},
    thresholds: {},
    weight: 1,
  };
}

function changedEntry(overrides: Partial<ChangedFile> = {}): ChangedFile {
  return {
    path: 'src/foo/index.ts',
    kind: 'modified',
    cell: 'src/foo',
    is_barrel: true,
    added: 1,
    deleted: 0,
    hunks: [{ start: 1, count: 1 }],
    ...overrides,
  };
}

function groupChangedEntry(overrides: Partial<ChangedFile> = {}): ChangedFile {
  return {
    path: 'other.txt',
    kind: 'modified',
    group: 'docs',
    is_barrel: false,
    added: 1,
    deleted: 0,
    hunks: [],
    ...overrides,
  };
}

function minimalMap(): MapJson {
  return {
    meta: {
      schema_version: SCHEMA_VERSION,
      generated_at: '2026-09-16T00:00:00.000Z',
      repo: '/repo',
      base: 'main',
      head: 'HEAD',
      merge_base: 'abc123',
      mode: 'change',
      instruments: { mode: 'git-only' },
    },
    terrain: {
      cells: [
        {
          id: 'src/foo',
          path: 'src/foo/index.ts',
          kind: 'folder',
          organelles: ['src/foo/index.ts'],
          band: 0,
          interface_size: 1,
          body_loc: 10,
          dents: [],
        },
      ],
      organelles: [
        {
          id: 'src/foo/index.ts',
          path: 'src/foo/index.ts',
          cell: 'src/foo',
          band: 0,
          reachable: true,
          loc: 10,
          dents: [],
        },
      ],
      bands: [{ index: 0, depth_min: 0, depth_max: 0 }],
      groups: [{ id: 'docs', files: ['README.md'] }],
      edges_exceptional: [],
      history: { window_commits: 0, cochange: [] },
    },
    weather: {
      changed: [changedEntry()],
      reach: [{ path: 'src/foo/index.ts', cell: 'src/foo', hops: 0, via: [] }],
      evidence: {},
      checks: { category: 'NOINST', checks_run: 0, slots: [] },
      ghosts: [],
      deps_added: [],
      improvements: [],
    },
    notices: [],
  };
}

function layoutFixture(overrides: Partial<Layout> = {}): Layout {
  return {
    width: 100,
    height: 100,
    shore: { y0: 0, y1: 10 },
    bands: [{ index: 0, y0: 10, y1: 100 }],
    positions: {
      'src/foo/index.ts': { x: 1, y: 1, r: 1 },
      'README.md': { x: 2, y: 2, r: 1 },
    },
    contours: {},
    ...overrides,
  };
}

function mapWithLayout(layout: Layout = layoutFixture()): MapJson {
  const map = minimalMap();
  return { ...map, terrain: { ...map.terrain, layout } };
}

test('accepts a minimal valid map', () => {
  const map = minimalMap();
  expect(assertMap(map)).toEqual(map);
});

test('accepts a valid map with a layout', () => {
  const map = mapWithLayout();
  expect(assertMap(map)).toEqual(map);
});

function withInstruments(instruments: Record<string, unknown>): unknown {
  const map = minimalMap();
  return { ...map, meta: { ...map.meta, instruments } };
}

test('accepts where the entry points came from, with the reason fallow was not read', () => {
  const fromFallow = withInstruments({ mode: 'git-only', entry_points: 'fallow' });
  const fromManifests = withInstruments({
    mode: 'git-only',
    entry_points: 'manifests',
    entry_points_reason: 'no local fallow at node_modules/.bin/fallow',
  });
  expect(assertMap(fromFallow)).toEqual(fromFallow);
  expect(assertMap(fromManifests)).toEqual(fromManifests);
});

test('rejects an entry-point source it does not know, and a reason that does not pair with manifests', () => {
  expect(() => assertMap(withInstruments({ mode: 'git-only', entry_points: 'pnpm' }))).toThrow(
    /meta\.instruments\.entry_points:/,
  );
  expect(() => assertMap(withInstruments({ mode: 'git-only', entry_points: 'manifests' }))).toThrow(
    /meta\.instruments\.entry_points_reason/,
  );
  expect(() =>
    assertMap(withInstruments({ mode: 'git-only', entry_points: 'fallow', entry_points_reason: 'it ran' })),
  ).toThrow(/meta\.instruments\.entry_points_reason/);
  expect(() =>
    assertMap(withInstruments({ mode: 'git-only', entry_points: 'manifests', entry_points_reason: 2 })),
  ).toThrow(/meta\.instruments\.entry_points_reason/);
});

test('accepts the base as typed beside the base as resolved, and rejects either when it is not a string (D99)', () => {
  const typed = { ...minimalMap(), meta: { ...minimalMap().meta, base: 'v1.2.0', base_typed: '--last-tag' } };
  expect(assertMap(typed)).toEqual(typed);
  expect(() => assertMap({ ...minimalMap(), meta: { ...minimalMap().meta, base_typed: 1 } })).toThrow(/meta\.base_typed/);
  expect(() => assertMap({ ...minimalMap(), meta: { ...minimalMap().meta, base: undefined } })).toThrow(/meta\.base:/);
});

test('rejects a wrong schema_version', () => {
  const map = { ...minimalMap(), meta: { ...minimalMap().meta, schema_version: 2 } };
  expect(() => assertMap(map)).toThrow(/meta\.schema_version/);
});

test('rejects more than six notices', () => {
  const map = {
    ...minimalMap(),
    notices: [
      notice('tertiary'),
      notice('tertiary'),
      notice('tertiary'),
      notice('tertiary'),
      notice('tertiary'),
      notice('tertiary'),
      notice('tertiary'),
    ],
  };
  expect(() => assertMap(map)).toThrow(/^invalid map at notices:/);
});

test('rejects a tier count over its budget', () => {
  const map = { ...minimalMap(), notices: [notice('primary'), notice('primary')] };
  expect(() => assertMap(map)).toThrow(/notices\[1\]/);
});

test('rejects a weather.reach entry naming an unknown cell', () => {
  const map = minimalMap();
  const withBadReach = {
    ...map,
    weather: { ...map.weather, reach: [{ path: 'src/foo/index.ts', cell: 'unknown-cell', hops: 0, via: [] }] },
  };
  expect(() => assertMap(withBadReach)).toThrow(/weather\.reach\[0\]\.cell/);
});

test('rejects a layout.positions entry naming an unknown organelle or group file', () => {
  const map = mapWithLayout(
    layoutFixture({
      positions: {
        'src/foo/index.ts': { x: 1, y: 1, r: 1 },
        'README.md': { x: 2, y: 2, r: 1 },
        'ghost/path.ts': { x: 3, y: 3, r: 1 },
      },
    }),
  );
  expect(() => assertMap(map)).toThrow(/positions\["ghost\/path\.ts"\]/);
});

test('rejects a changed entry with both cell and group', () => {
  const map = minimalMap();
  const withBoth = {
    ...map,
    weather: { ...map.weather, changed: [changedEntry({ group: 'docs' })] },
  };
  expect(() => assertMap(withBoth)).toThrow(/weather\.changed\[0\]/);
});

function withSlots(slots: readonly Record<string, unknown>[]): unknown {
  const map = minimalMap();
  return { ...map, weather: { ...map.weather, checks: { category: 'IFR', checks_run: slots.length, slots } } };
}

test('accepts the split recorded on each red slot that names files, empty when its red is all standing (D73)', () => {
  const map = withSlots([
    { name: 'health', ok: false, skipped: false, scope: ['src/foo/index.ts', 'src/bar.ts'], change: ['src/foo/index.ts'] },
    { name: 'dupes', ok: false, skipped: false, scope: ['src/bar.ts'], change: [] },
    { name: 'types', ok: false, skipped: false, scope: 'global' },
    { name: 'lint', ok: true, skipped: false, scope: 'global' },
  ]);
  expect(assertMap(map)).toEqual(map);
});

test('rejects a red slot that names files without its split, a split on any other slot, and a split naming an unchanged file', () => {
  expect(() => assertMap(withSlots([{ name: 'health', ok: false, skipped: false, scope: ['src/foo/index.ts'] }]))).toThrow(
    /weather\.checks\.slots\[0\]\.change: a red slot that names files/,
  );
  expect(() => assertMap(withSlots([{ name: 'types', ok: false, skipped: false, scope: 'global', change: [] }]))).toThrow(
    /weather\.checks\.slots\[0\]\.change: only a red slot/,
  );
  expect(() =>
    assertMap(withSlots([{ name: 'health', ok: true, skipped: false, scope: ['src/foo/index.ts'], change: ['src/foo/index.ts'] }])),
  ).toThrow(/weather\.checks\.slots\[0\]\.change: only a red slot/);
  expect(() => assertMap(withSlots([{ name: 'health', ok: false, skipped: false, scope: ['src/bar.ts'], change: ['src/bar.ts'] }]))).toThrow(
    /weather\.checks\.slots\[0\]\.change\[0\]: not a changed file/,
  );
});

function withEvidence(evidence: Record<string, unknown>): unknown {
  const map = minimalMap();
  return { ...map, weather: { ...map.weather, evidence } };
}

test('accepts unmeasured files beside the coverage they sit outside, and rejects any without coverage or naming an unchanged file (D80)', () => {
  const map = withEvidence({ patch_coverage: [], unmeasured: ['src/foo/index.ts'] });
  expect(assertMap(map)).toEqual(map);
  expect(() => assertMap(withEvidence({ unmeasured: ['src/foo/index.ts'] }))).toThrow(
    /weather\.evidence\.unmeasured: only a map with patch_coverage/,
  );
  expect(() => assertMap(withEvidence({ patch_coverage: [], unmeasured: ['src/bar.ts'] }))).toThrow(
    /weather\.evidence\.unmeasured\[0\]: not a changed file/,
  );
});

test("accepts an organelle's stability, with or without its churn ratio, and rejects a negative age or a churn that is not a number (D149)", () => {
  const withStability = (stability: unknown): unknown => {
    const map = minimalMap();
    const [organelle] = map.terrain.organelles;
    return { ...map, terrain: { ...map.terrain, organelles: [{ ...organelle, stability }] } };
  };
  expect(() => assertMap(withStability({ age_days: 30, churn_ratio: 0.5 }))).not.toThrow();
  expect(() => assertMap(withStability({ age_days: 30 }))).not.toThrow();
  expect(() => assertMap(withStability({ age_days: -1 }))).toThrow(/stability\.age_days/);
  expect(() => assertMap(withStability({ age_days: 1, churn_ratio: 'high' }))).toThrow(/stability\.churn_ratio/);
  expect(() => assertMap(withStability(7))).toThrow(/stability: expected an object/);
});

test("accepts an organelle's ties, none included, and rejects a count that is negative, fractional or missing (D157)", () => {
  const withTies = (ties: unknown): unknown => {
    const map = minimalMap();
    const [organelle] = map.terrain.organelles;
    return { ...map, terrain: { ...map.terrain, organelles: [{ ...organelle, ties }] } };
  };
  expect(() => assertMap(withTies({ inside: 2, outside: 1 }))).not.toThrow();
  expect(() => assertMap(withTies({ inside: 0, outside: 0 }))).not.toThrow();
  expect(() => assertMap(withTies({ inside: -1, outside: 0 }))).toThrow(/ties\.inside/);
  expect(() => assertMap(withTies({ inside: 1, outside: 0.5 }))).toThrow(/ties\.outside/);
  expect(() => assertMap(withTies({ inside: 1 }))).toThrow(/ties\.outside/);
});

test('accepts the wiring, a group file at one end included, and rejects an end the map does not place, a self-import, or an edge with no changed end (step 41)', () => {
  const withWiring = (wiring: unknown, groupFiles: readonly string[] = ['README.md']): unknown => {
    const map = minimalMap();
    return { ...map, terrain: { ...map.terrain, groups: [{ id: 'docs', files: groupFiles }] }, weather: { ...map.weather, wiring } };
  };
  expect(() => assertMap(withWiring([]))).not.toThrow();
  expect(() => assertMap(withWiring([{ from: 'README.md', to: 'src/foo/index.ts' }]))).not.toThrow();
  expect(() => assertMap(withWiring([{ from: 'src/foo/index.ts', to: 'src/bar.ts' }]))).toThrow(/weather\.wiring\[0\]\.to: unknown organelle or group file "src\/bar\.ts"/);
  expect(() => assertMap(withWiring([{ from: 'src/foo/index.ts', to: 'src/foo/index.ts' }]))).toThrow(/weather\.wiring\[0\]: a file does not import itself/);
  expect(() => assertMap(withWiring([{ from: 'README.md', to: 'NOTES.md' }], ['README.md', 'NOTES.md']))).toThrow(/weather\.wiring\[0\]: neither end is a changed file/);
  expect(() => assertMap(withWiring([{ from: 'README.md' }]))).toThrow(/weather\.wiring\[0\]\.to: expected a string/);
  expect(() => assertMap(withWiring({}))).toThrow(/weather\.wiring: expected an array/);
});

test("accepts a cell's export names, none included, and rejects a list that is not one of names (D162)", () => {
  const withExports = (exports: unknown): unknown => {
    const map = minimalMap();
    const [cell] = map.terrain.cells;
    return { ...map, terrain: { ...map.terrain, cells: [{ ...cell, exports }] } };
  };
  expect(() => assertMap(withExports(['listSlots', 'resolveSlot']))).not.toThrow();
  expect(() => assertMap(withExports([]))).not.toThrow();
  expect(() => assertMap(withExports('listSlots'))).toThrow(/terrain\.cells\[0\]\.exports: expected an array/);
  expect(() => assertMap(withExports(['listSlots', 7]))).toThrow(/terrain\.cells\[0\]\.exports\[1\]: expected a string/);
});

test('accepts the outside packages, none included, and rejects a severity no advisory backs, an unsorted list or a package no file imports (D170)', () => {
  const withDependencies = (dependencies: unknown): unknown => {
    const map = minimalMap();
    return { ...map, weather: { ...map.weather, dependencies } };
  };
  expect(() => assertMap(withDependencies([]))).not.toThrow();
  expect(() =>
    assertMap(
      withDependencies([
        { name: '@scope/kit', importers: 1 },
        { name: 'express', importers: 2, change: 'moved', advisories: 2, severity: 'high' },
        { name: 'kleur', importers: 1, advisories: 0 },
      ]),
    ),
  ).not.toThrow();
  expect(() => assertMap(withDependencies([{ name: 'kleur', importers: 1, severity: 'low' }]))).toThrow(/dependencies\[0\]\.severity: a severity is required exactly when/);
  expect(() => assertMap(withDependencies([{ name: 'kleur', importers: 1, advisories: 1 }]))).toThrow(/dependencies\[0\]\.severity/);
  expect(() => assertMap(withDependencies([{ name: 'kleur', importers: 0 }]))).toThrow(/dependencies\[0\]\.importers/);
  expect(() => assertMap(withDependencies([{ name: 'kleur', importers: 1, change: 'removed' }]))).toThrow(/dependencies\[0\]\.change/);
  expect(() => assertMap(withDependencies([{ name: 'b', importers: 1 }, { name: 'a', importers: 1 }]))).toThrow(/dependencies\[1\]\.name: expected the names sorted/);
  expect(() => assertMap(withDependencies({}))).toThrow(/weather\.dependencies: expected an array/);
});

test('rejects a changed entry naming an unknown group', () => {
  const map = minimalMap();
  const withUnknownGroup = {
    ...map,
    weather: { ...map.weather, changed: [groupChangedEntry({ group: 'nonexistent' })] },
  };
  expect(() => assertMap(withUnknownGroup)).toThrow(/weather\.changed\[0\]\.group/);
});

/** The minimal map with a range's frames beside its weather (D100). */
function withFrames(...frames: readonly Record<string, unknown>[]): unknown {
  return { ...minimalMap(), sequence: { frames } };
}

function frame(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { commit: 'a'.repeat(40), subject: 'feat: a commit', weather: minimalMap().weather, notices: [], ...overrides };
}

test('accepts a range\'s frames, one with a file the terrain does not place, and a map with none (D100)', () => {
  const gone = groupChangedEntry({ path: 'docs/gone.md', group: 'prompts' });
  const unplaced = frame({ weather: { ...minimalMap().weather, changed: [changedEntry(), gone] }, unplaced: ['docs/gone.md'] });
  const ranged = withFrames(frame(), unplaced);
  expect(assertMap(ranged)).toEqual(ranged);
  expect(assertMap(withFrames())).toEqual(withFrames());
});

test('checks every frame as it checks the weather and the notices, over the one terrain (D100)', () => {
  const weather = minimalMap().weather;
  const cases: readonly [Record<string, unknown>, RegExp][] = [
    [{ commit: 1 }, /sequence\.frames\[0\]\.commit/],
    [{ subject: undefined }, /sequence\.frames\[0\]\.subject/],
    [{ weather: { ...weather, reach: [{ path: 'src/foo/index.ts', cell: 'src/gone', hops: 0, via: [] }] } }, /sequence\.frames\[0\]\.weather\.reach\[0\]\.cell: unknown cell/],
    [{ weather: { ...weather, changed: [groupChangedEntry({ group: 'prompts' })] } }, /sequence\.frames\[0\]\.weather\.changed\[0\]\.group: unknown group/],
    [{ weather: { ...weather, wiring: [{ from: 'src/foo/index.ts', to: 'src/gone.ts' }] } }, /sequence\.frames\[0\]\.weather\.wiring\[0\]\.to/],
    [{ notices: ['primary', 'primary'].map((tier) => notice(tier as NoticeTier)) }, /sequence\.frames\[0\]\.notices\[1\]: too many primary/],
    [{ unplaced: ['src/foo/index.ts'] }, /sequence\.frames\[0\]\.unplaced\[0\]: the terrain places/],
    [{ unplaced: ['src/gone.ts'] }, /sequence\.frames\[0\]\.unplaced: not a changed file "src\/gone\.ts"/],
  ];
  for (const [overrides, error] of cases) expect(() => assertMap(withFrames(frame(overrides)))).toThrow(error);

  const two = { ...weather, changed: [groupChangedEntry({ path: 'b.md', group: 'prompts' }), groupChangedEntry({ path: 'a.md', group: 'prompts' })] };
  expect(() => assertMap(withFrames(frame({ weather: two, unplaced: ['b.md', 'a.md'] })))).toThrow(/unplaced\[1\]: expected the paths sorted/);
  expect(() => assertMap({ ...minimalMap(), sequence: {} })).toThrow(/sequence\.frames/);
});
