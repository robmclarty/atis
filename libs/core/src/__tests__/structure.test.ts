import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

import { DEFAULT_CONFIG } from '../config.js';
import { compareStructure, computeCategory } from '../evidence.js';
import type { CheckArtifacts, Dead, Dupes, Health, HealthFinding, Structure, StructureChange } from '../evidence.js';
import { buildMap } from '../map.js';
import type { BuildInputs } from '../map.js';
import type { DiffFile } from '../reach.js';
import { assertMap } from '../schema.js';
import type { ChangedFile } from '../schema.js';

/**
 * The base side (D98): what fallow measured at head, set beside what it
 * measured at the base. A finding is the change's when the change made it,
 * new or worse; a cycle or a boundary violation when it is absent at the
 * base; the improvements are what got better; the health delta is the
 * maintainability that moved. With no base side every one of them is absent
 * (C2). Every finding here is in the shape fallow 3.22 writes, trimmed.
 */

const SHAPES = 'src/shapes.ts';
const SQUARE = 'src/square.ts';
const GONE = 'src/gone.ts';
const NEW = 'src/new.ts';
const OLD_NAME = 'src/old-name.ts';
const RENAMED = 'src/renamed.ts';
const STILL = 'src/still.ts';

const NO_DEAD: Dead = { circular_dependencies: [], re_export_cycles: [], boundary_violations: [], unused_exports: [] };
const NO_DUPES: Dupes = { clone_families: [] };
const NO_HEALTH: Health = { file_scores: [], findings: [] };

function modified(path: string, hunks = [{ start: 10, count: 4 }]): DiffFile {
  return { path, kind: 'modified', added: 4, deleted: 1, hunks };
}

/** The change every test measures: two files edited, one deleted, one added and one renamed; `still.ts` is never touched. */
const DIFF: readonly DiffFile[] = [
  modified(SHAPES),
  modified(SQUARE),
  { path: GONE, kind: 'deleted', added: 0, deleted: 30, hunks: [] },
  { path: NEW, kind: 'added', added: 40, deleted: 0, hunks: [{ start: 1, count: 40 }] },
  { path: RENAMED, from: OLD_NAME, kind: 'renamed', added: 1, deleted: 1, hunks: [{ start: 3, count: 1 }] },
];

type Parts = { readonly health?: Health; readonly dupes?: Dupes; readonly dead?: Dead };

/** One side as fallow measured it: every analysis present unless the test drops one, nothing muted. */
function side(parts: Parts, fallow = '3.22.0'): Structure {
  return { fallow, health: NO_HEALTH, dupes: NO_DUPES, dead: NO_DEAD, muted: [], ...parts };
}

/** The terrain's files; the test beside them is none (D4). */
const TERRAIN: ReadonlySet<string> = new Set([SHAPES, SQUARE, GONE, NEW, RENAMED, STILL]);

function compared(base: Structure, head: Structure, diff: readonly DiffFile[] = DIFF): StructureChange {
  return compareStructure({ base, head, diff, terrain: TERRAIN });
}

function fn(path: string, name: string, exceeded: string, cyclomatic: number, line = 10): HealthFinding {
  return { path, name, exceeded, line, line_count: 20, cyclomatic, cognitive: 9, crap: 12 };
}

function findings(...list: readonly HealthFinding[]): Health {
  return { file_scores: [], findings: list };
}

test('a function over a threshold is the change’s when it is new at head or worse than its base self, on a changed file (D98)', () => {
  const base = findings(fn(SHAPES, 'area', 'cyclomatic', 18), fn(SQUARE, 'square', 'cyclomatic', 22), fn(STILL, 'idle', 'cyclomatic', 16));
  const head = findings(
    // Rose from 18 to 24.
    fn(SHAPES, 'area', 'cyclomatic', 24, 14),
    // As bad as it was, though the change touched its lines: standing.
    fn(SQUARE, 'square', 'cyclomatic', 22),
    // Broke a rule it did not, with no measure rising.
    fn(SQUARE, 'cube', 'cyclomatic', 16, 40),
    fn(NEW, 'fresh', 'both', 20),
    // New, but on a file the change never touched: the movement of ground it left alone is not its own.
    fn(STILL, 'idle', 'cyclomatic', 16),
    fn(STILL, 'other', 'cyclomatic', 30, 50),
  );
  const change = compared(side({ health: base }), side({ health: head }));

  expect(change.health).toEqual([
    { path: NEW, function: 'fresh', rules: ['cognitive', 'cyclomatic'], change: 'new' },
    { path: SHAPES, function: 'area', rules: ['cyclomatic'], change: 'worse' },
    { path: SQUARE, function: 'cube', rules: ['cyclomatic'], change: 'new' },
  ]);
  // A rule its base self did not break is worse, whatever the measures did.
  const broke = compared(side({ health: findings(fn(SQUARE, 'square', 'cyclomatic', 22)) }), side({ health: findings(fn(SQUARE, 'square', 'cyclomatic_crap', 22)) }));
  expect(broke.health).toEqual([{ path: SQUARE, function: 'square', rules: ['crap', 'cyclomatic'], change: 'worse' }]);
});

test('anonymous functions match their base selves in order, and a renamed file’s under its base path (D40)', () => {
  const base = findings(fn(SHAPES, '<arrow>', 'cyclomatic', 20, 10), fn(SHAPES, '<arrow>', 'cyclomatic', 30, 60), fn(OLD_NAME, 'move', 'cyclomatic', 19));
  // Both arrows moved down five lines; the second grew. The renamed file's function is as it was.
  const head = findings(fn(SHAPES, '<arrow>', 'cyclomatic', 20, 15), fn(SHAPES, '<arrow>', 'cyclomatic', 31, 65), fn(RENAMED, 'move', 'cyclomatic', 19));
  const change = compared(side({ health: base }), side({ health: head }));

  expect(change.health).toEqual([{ path: SHAPES, function: '<arrow>', rules: ['cyclomatic'], change: 'worse' }]);
  expect(change.improvements).toEqual([]);
});

test('the improvements: a threshold no longer breached, a dent gone, a clone family dissolved and a cycle broken (D98)', () => {
  const cycle = { files: [SHAPES, SQUARE], length: 2, line: 3, col: 9, edges: [{ path: SHAPES, line: 3, col: 9 }, { path: SQUARE, line: 4, col: 9 }] };
  const standingCycle = { files: [STILL, 'src/other.ts'], length: 2, line: 1, col: 0 };
  const family = { files: [GONE, SQUARE], groups: [], total_duplicated_lines: 24 };
  const base = side({
    health: findings(fn(SHAPES, 'area', 'all', 40), fn(GONE, 'legacy', 'cyclomatic', 19), fn(STILL, 'idle', 'cyclomatic', 16)),
    dupes: { clone_families: [family] },
    dead: { ...NO_DEAD, circular_dependencies: [cycle, standingCycle] },
  });
  // `area` now breaks cognitive alone; the legacy file, its clone and the cycle are gone; `still.ts` is as it was.
  const head = side({
    health: findings(fn(SHAPES, 'area', 'cognitive', 12), fn(STILL, 'idle', 'cyclomatic', 16)),
    dead: { ...NO_DEAD, circular_dependencies: [standingCycle] },
  });

  expect(compared(base, head).improvements).toEqual([
    { kind: 'clone-family', files: [GONE, SQUARE] },
    { kind: 'cycle', files: [SHAPES, SQUARE] },
    { kind: 'dent', files: [GONE], rule: 'cyclomatic' },
    { kind: 'dent', files: [SHAPES], rule: 'crap' },
    { kind: 'dent', files: [SHAPES], rule: 'cycle' },
    { kind: 'dent', files: [SHAPES], rule: 'cyclomatic' },
    { kind: 'dent', files: [SQUARE], rule: 'cycle' },
    { kind: 'threshold', files: [GONE], rule: 'cyclomatic', function: 'legacy' },
    { kind: 'threshold', files: [SHAPES], rule: 'crap', function: 'area' },
    { kind: 'threshold', files: [SHAPES], rule: 'cyclomatic', function: 'area' },
  ]);
});

test('a clone family is the change’s when it is new or duplicates more than its base self; one that dropped a copy is neither (D98)', () => {
  const pair = { files: [SHAPES, SQUARE], groups: [], total_duplicated_lines: 20 };
  const trio = { files: [SHAPES, SQUARE, STILL], groups: [], total_duplicated_lines: 30 };
  const placed = (base: readonly unknown[], head: readonly unknown[]): StructureChange =>
    compared(side({ dupes: { clone_families: base } }), side({ dupes: { clone_families: head } }));

  expect(placed([], [pair]).dupes).toEqual([{ spans: [], files: [SHAPES, SQUARE] }]);
  expect(placed([pair], [{ ...pair, total_duplicated_lines: 28 }]).dupes).toEqual([{ spans: [], files: [SHAPES, SQUARE] }]);
  expect(placed([pair], [pair]).dupes).toEqual([]);
  // The trio lost `still.ts`'s copy: the pair left behind is what it was, not a new family, and the trio did not dissolve.
  expect(placed([trio], [pair])).toMatchObject({ dupes: [], improvements: [] });
  // A family fallow gives no total for duplicates the lines its copies span.
  const spanned = { files: [SHAPES, SQUARE], groups: [{ instances: [{ file: SHAPES, start_line: 1, end_line: 10 }, { file: SQUARE, start_line: 5, end_line: 14 }] }] };
  expect(placed([spanned], [{ ...pair, total_duplicated_lines: 20 }]).dupes).toEqual([]);
  expect(placed([spanned], [{ ...pair, total_duplicated_lines: 21 }]).dupes).toHaveLength(1);
});

test('a cycle or a boundary violation is introduced when the base had none of the same files (D98)', () => {
  const cycle = { files: [SHAPES, SQUARE], length: 2, line: 3, col: 9 };
  const violation = { from_path: SHAPES, to_path: 'src/app/x.ts', from_zone: 'libs', to_zone: 'apps', line: 2, col: 9 };
  const renamedCycle = { files: [OLD_NAME, SQUARE], length: 2, line: 1, col: 0 };

  expect(compared(side({}), side({ dead: { ...NO_DEAD, circular_dependencies: [cycle], boundary_violations: [violation] } })).introduced).toEqual([
    { spans: [], files: [SHAPES, SQUARE] },
    { spans: [], files: ['src/app/x.ts', SHAPES] },
  ]);
  // One the base had is standing, a renamed file's under its base path.
  const dead: Dead = { ...NO_DEAD, circular_dependencies: [cycle, { ...renamedCycle, files: [RENAMED, SQUARE] }] };
  expect(compared(side({ dead: { ...NO_DEAD, circular_dependencies: [cycle, renamedCycle] } }), side({ dead })).introduced).toEqual([]);
});

/** A health report of file scores alone, each file at the maintainability index given. */
function scores(entries: Readonly<Record<string, number>>): Health {
  return {
    file_scores: Object.entries(entries).map(([path, maintainability_index]) => ({ path, lines: 40, function_count: 3, maintainability_index, crap_max: 4 })),
    findings: [],
  };
}

test('the health delta is each changed file’s maintainability, head less base, and their sum, in fallow’s own measure (D98)', () => {
  const TEST = 'src/__tests__/shapes.test.ts';
  const base = scores({ [SHAPES]: 84.1, [SQUARE]: 70, [GONE]: 50, [OLD_NAME]: 77.7, [STILL]: 90, [TEST]: 70 });
  const head = scores({ [SHAPES]: 82.9, [SQUARE]: 70, [NEW]: 60, [RENAMED]: 80, [STILL]: 95, [TEST]: 60 });
  const diff = [...DIFF, modified(TEST)];

  // An added and a deleted file have no other self; the untouched one is not the change's; a changed test is no
  // terrain, so it moves no Health Δ, as it adds no Size (D4, D166); a file that moved nothing is a measured 0.
  expect(compared(side({ health: base }), side({ health: head }), diff).health_delta).toEqual({
    maintainability: 1.1,
    files: [
      { path: RENAMED, maintainability: 2.3 },
      { path: SHAPES, maintainability: -1.2 },
      { path: SQUARE, maintainability: 0 },
    ],
  });
});

test('with no base side, or two fallows, nothing compares; with one analysis missing, only it falls back (C2)', () => {
  const measured = side({ health: findings(fn(SHAPES, 'area', 'cyclomatic', 18)) });

  expect(compared({ reason: 'no local fallow at node_modules/.bin/fallow' }, measured)).toEqual({});
  expect(compared(measured, { reason: 'health: timed out after 60 s; dupes: timed out after 60 s; dead: timed out after 60 s' })).toEqual({});
  // A moved pin would read as the change, so two versions are no base side at all.
  expect(compared(side({}, '3.21.0'), measured)).toEqual({});

  const noDupes: Structure = { fallow: '3.22.0', health: NO_HEALTH, dead: NO_DEAD, muted: [] };
  const partial = compared(noDupes, measured);
  expect(partial).not.toHaveProperty('dupes');
  expect(partial).toMatchObject({ health: [{ path: SHAPES, change: 'new' }], introduced: [], improvements: [] });
  expect(partial.health_delta).toEqual({ maintainability: 0, files: [] });

  // Measured, and nothing got better: an empty list, which is evidence, beside the absent one, which is not.
  expect(compared(side({}), side({})).improvements).toEqual([]);
});

/** A `.check/` with `health` and `dupes` red, each naming `square.ts`, whose hunk meets both findings. */
const RED: Extract<CheckArtifacts, { mode: 'check' }> = {
  mode: 'check',
  summary: {
    ok: false,
    checks_run: 2,
    timestamp: '2026-10-26T09:00:00.000Z',
    total_duration_ms: 1_000,
    checks: [
      { name: 'health', ok: false, skipped: false },
      { name: 'dupes', ok: false, skipped: false },
    ],
  },
  fallow_schemas: {},
  stale: [],
  health: findings(fn(SQUARE, 'square', 'cyclomatic', 22)),
  dupes: { clone_families: [{ files: [SHAPES, SQUARE], groups: [{ instances: [{ file: SQUARE, start_line: 8, end_line: 16 }] }], total_duplicated_lines: 18 }] },
};

function splitWith(structure: StructureChange): readonly (readonly [string, readonly string[] | undefined])[] {
  const changed: readonly ChangedFile[] = [SHAPES, SQUARE].map((path) => ({ ...modified(path), cell: 'folder:src', is_barrel: false }));
  const checks = computeCategory({ check: RED, structure, changed, files: [], stitches: [], deps_added: [], deps_moved: [], config: DEFAULT_CONFIG });
  return checks.slots.map((slot) => [slot.name, slot.change] as const);
}

test('a red health or dupes slot is the change’s through what the change made, in place of the line rule (D73, D98)', () => {
  // Head-only, the hunk at lines 10 to 13 meets both findings, so both reds are the change's.
  expect(splitWith({})).toEqual([['dupes', [SQUARE]], ['health', [SQUARE]]]);

  // Measured on both sides, the two findings were there before: standing state.
  const same = side({ health: RED.health ?? NO_HEALTH, dupes: RED.dupes ?? NO_DUPES });
  expect(splitWith(compared(same, same))).toEqual([['dupes', []], ['health', []]]);

  // A function the change made worse puts `health` on the change through its file.
  const worse = side({ health: findings(fn(SQUARE, 'square', 'cyclomatic', 25)), dupes: RED.dupes ?? NO_DUPES });
  expect(splitWith(compared(same, worse))).toEqual([['dupes', []], ['health', [SQUARE]]]);
});

const HERE = dirname(fileURLToPath(import.meta.url));

test('assertMap reads improvements and the health delta as the change’s own, and refuses what is not (D98)', () => {
  const map = buildMap(JSON.parse(readFileSync(join(HERE, '..', '..', 'fixtures', 'demo', 'inputs.json'), 'utf8')) as BuildInputs, DEFAULT_CONFIG);
  const withWeather = (weather: Record<string, unknown>): unknown => ({ ...map, weather: { ...map.weather, ...weather } });
  const doctor = 'apps/cli/src/doctor.ts';

  expect(() => assertMap(map)).not.toThrow();
  expect(() => assertMap(withWeather({ improvements: [{ kind: 'better', files: [doctor] }] }))).toThrow('weather.improvements[0].kind');
  expect(() => assertMap(withWeather({ improvements: [{ kind: 'cycle', files: [] }] }))).toThrow('expected at least one file');
  expect(() => assertMap(withWeather({ improvements: [{ kind: 'cycle', files: [STILL] }] }))).toThrow('none of them is a changed file');
  expect(() => assertMap(withWeather({ improvements: [{ kind: 'dent', files: [doctor] }] }))).toThrow('a dent names the rule it no longer breaks');
  expect(() => assertMap(withWeather({ health_delta: { maintainability: Number.NaN, files: [] } }))).toThrow('weather.health_delta.maintainability');
  expect(() => assertMap(withWeather({ health_delta: { maintainability: 1, files: [{ path: STILL, maintainability: 1 }] } }))).toThrow('is not a changed file');
  const twice = { path: doctor, maintainability: 1 };
  expect(() => assertMap(withWeather({ health_delta: { maintainability: 2, files: [twice, twice] } }))).toThrow('is listed twice');
});
