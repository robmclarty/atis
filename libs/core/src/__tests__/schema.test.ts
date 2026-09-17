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

test('rejects a changed entry naming an unknown group', () => {
  const map = minimalMap();
  const withUnknownGroup = {
    ...map,
    weather: { ...map.weather, changed: [groupChangedEntry({ group: 'nonexistent' })] },
  };
  expect(() => assertMap(withUnknownGroup)).toThrow(/weather\.changed\[0\]\.group/);
});
