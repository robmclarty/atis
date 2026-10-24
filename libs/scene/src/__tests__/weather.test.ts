import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson } from 'core';
import { expect, test } from 'vitest';

import { sampleGrid } from '../heightfield.js';
import { MUTANT_NOTCH_SPACING, REACH_DECAY, STITCH_SPACING, STORM_LIFT, STORM_ROW } from '../tokens.js';
import { reachField, reachLuminance, stitchLook, weatherOf } from '../weather.js';
import type { CellWeather, FileWeather, SceneWeather } from '../weather.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));
const WEATHER = weatherOf(DEMO);

function fileOf(weather: SceneWeather, path: string): FileWeather | undefined {
  return weather.files.find((file) => file.path === path);
}

function cellOf(weather: SceneWeather, id: string): CellWeather | undefined {
  return weather.cells.find((cell) => cell.cell === id);
}

/** The demo with one changed file renamed from an old path, and its edges, reach and checks as given. */
function withWeather(weather: Partial<MapJson['weather']>, terrain: Partial<MapJson['terrain']> = {}): MapJson {
  return { ...DEMO, weather: { ...DEMO.weather, ...weather }, terrain: { ...DEMO.terrain, ...terrain } };
}

const PM = 'folder:libs/core/src/pm';
const CORE = 'package:libs/core';
const UTIL = 'directory:libs/core/src/util';

test('each placed changed file carries its change kind, and a renamed one its old path (D40)', () => {
  expect(fileOf(WEATHER, 'libs/core/src/pm/tools.ts')?.change).toEqual({ kind: 'added' });
  expect(fileOf(WEATHER, 'libs/core/src/pm/legacy.ts')?.change).toEqual({ kind: 'deleted' });
  expect(fileOf(WEATHER, 'apps/cli/src/doctor.ts')?.change).toEqual({ kind: 'modified' });
  const renamed = withWeather({
    changed: DEMO.weather.changed.map((file) =>
      file.path === 'apps/cli/src/doctor.ts' ? { ...file, kind: 'renamed' as const, from: 'apps/cli/src/check.ts' } : file,
    ),
  });
  expect(fileOf(weatherOf(renamed), 'apps/cli/src/doctor.ts')?.change).toEqual({ kind: 'renamed', from: 'apps/cli/src/check.ts' });
});

test('a file the layout never placed carries no weather, a changed test file included, since it is a stitch (D4, C2)', () => {
  const suite = 'libs/core/src/__tests__/pm.test.ts';
  expect(DEMO.weather.changed.some((file) => file.path === suite)).toBe(true);
  expect(fileOf(WEATHER, suite)).toBeUndefined();
  const placed = new Set(Object.keys(DEMO.terrain.layout?.positions ?? {}));
  expect(WEATHER.files.every((file) => placed.has(file.path))).toBe(true);
});

test('the reach lights each cell at its nearest hop, dimmer by the decay per membrane, and cuts out the cells it holds (D5, D45)', () => {
  expect(cellOf(WEATHER, PM)?.reach).toEqual({ hops: 0, luminance: 1, holes: [] });
  expect(cellOf(WEATHER, CORE)?.reach).toEqual({ hops: 1, luminance: REACH_DECAY, holes: [UTIL, PM] });
  expect(cellOf(WEATHER, UTIL)?.reach).toBeUndefined();
  const lights = [0, 1, 2, 3, 4, 5, 6, 7].map(reachLuminance);
  lights.slice(1).forEach((light, index) => expect(light).toBeLessThan(lights[index] ?? 0));
  expect(reachLuminance(3)).toBe(REACH_DECAY ** 3);
});

test('an interface file the reach left a cell through is lit at the crossing', () => {
  const via = new Set(DEMO.weather.reach.flatMap((entry) => entry.via));
  expect(via.size).toBeGreaterThan(0);
  expect(WEATHER.files.filter((file) => file.crossing === true).map((file) => file.path)).toEqual([...via].toSorted());
});

test("a changed file's skin opens by the share of its changed lines no test ran, and an unmeasured one opens whole (D71, D80)", () => {
  expect(fileOf(WEATHER, 'libs/core/src/pm/index.ts')?.evidence?.skin).toEqual({ measured: true, open: 5 / 9, covered: 4, changed_executable: 9 });
  expect(fileOf(WEATHER, 'apps/cli/src/doctor.ts')?.evidence?.skin).toEqual({ measured: false, open: 1 });
  // A file with no changed executable line has no skin to open or close.
  const coverage = (DEMO.weather.evidence.patch_coverage ?? []).map((entry) =>
    entry.path === 'libs/core/src/pm/index.ts' ? { ...entry, changed_executable: 0, covered: 0 } : entry,
  );
  const bare = weatherOf(withWeather({ evidence: { ...DEMO.weather.evidence, patch_coverage: coverage } }));
  expect(fileOf(bare, 'libs/core/src/pm/index.ts')?.evidence?.skin).toBeUndefined();
});

test("a file's mutants are notches by line, spread evenly about the top of its skin", () => {
  const notches = fileOf(WEATHER, 'libs/core/src/pm/tools.ts')?.evidence?.notches ?? [];
  expect(notches.map((notch) => notch.line)).toEqual([27, 64]);
  expect(notches.map((notch) => notch.status)).toEqual(['NoCoverage', 'Survived']);
  expect((notches[0]?.angle ?? 0) + (notches[1]?.angle ?? 0)).toBeCloseTo(-Math.PI, 12);
  expect((notches[1]?.angle ?? 0) - (notches[0]?.angle ?? 0)).toBeCloseTo(MUTANT_NOTCH_SPACING, 12);
});

test('a stitch reads lit when its test passed, torn when it failed, and unlit when it never ran (C2), spread about the bottom', () => {
  expect(stitchLook('passed')).toBe('lit');
  expect(stitchLook('failed')).toBe('torn');
  expect(stitchLook('skipped')).toBe('unlit');
  const stitches = [
    { test: 'libs/core/src/__tests__/a.test.ts', targets: ['libs/core/src/pm/index.ts'], status: 'passed' },
    { test: 'libs/core/src/__tests__/b.test.ts', targets: ['libs/core/src/pm/index.ts'], status: 'todo' },
  ];
  const on = fileOf(weatherOf(withWeather({ evidence: { ...DEMO.weather.evidence, stitches } })), 'libs/core/src/pm/index.ts')?.evidence?.stitches;
  expect(on?.map((stitch) => [stitch.test, stitch.look])).toEqual([
    ['libs/core/src/__tests__/a.test.ts', 'lit'],
    ['libs/core/src/__tests__/b.test.ts', 'unlit'],
  ]);
  expect((on?.[0]?.angle ?? 0) + (on?.[1]?.angle ?? 0)).toBeCloseTo(Math.PI, 12);
  expect((on?.[1]?.angle ?? 0) - (on?.[0]?.angle ?? 0)).toBeCloseTo(STITCH_SPACING, 12);
  expect(fileOf(WEATHER, 'libs/core/src/pm/tools.ts')?.evidence?.stitches.map((stitch) => stitch.look)).toEqual(['torn']);
});

test("the storms split by the change: the change's red over the cell its changed file sits in, the rest standing (D68)", () => {
  expect(WEATHER.storms.map((storm) => [storm.slot, storm.place, storm.change])).toEqual([
    ['test', PM, true],
    ['dead', UTIL, false],
    ['dead', CORE, false],
  ]);
  expect(cellOf(WEATHER, PM)?.storms.map((storm) => storm.slot)).toEqual(['test']);
});

test("a storm hangs above its place's contour, a second over one place a row higher, and a global slot hangs none", () => {
  const contour = DEMO.terrain.layout?.contours?.[PM] ?? [];
  const top = Math.min(...contour.map(([, y]) => y));
  const [first] = WEATHER.storms;
  expect(first?.y).toBeCloseTo(top - STORM_LIFT, 9);
  // A second red slot named on the same changed file stacks above the first.
  const slots = [
    ...DEMO.weather.checks.slots,
    { name: 'types', ok: false, skipped: false, scope: ['libs/core/src/pm/index.ts'], change: ['libs/core/src/pm/index.ts'] },
    { name: 'lint', ok: false, skipped: false, scope: 'global' as const },
  ];
  const stacked = weatherOf(withWeather({ checks: { ...DEMO.weather.checks, slots } })).storms.filter((storm) => storm.place === PM);
  expect(stacked.map((storm) => storm.slot)).toEqual(['test', 'types']);
  expect((stacked[0]?.y ?? 0) - (stacked[1]?.y ?? 0)).toBeCloseTo(STORM_ROW, 9);
  expect(stacked.some((storm) => storm.slot === 'lint')).toBe(false);
});

test('a ghost carries the changed files it usually changes with, and the edges keep only those between placed files', () => {
  expect(fileOf(WEATHER, 'libs/core/src/util/format.ts')?.ghost).toEqual({ with: ['libs/core/src/pm/index.ts'], rate: 0.6, support: 3 });
  const edges = [
    { from: 'libs/core/src/util/text.ts', to: 'libs/core/src/util/format.ts', kind: 'cycle' as const },
    { from: 'libs/core/src/util/format.ts', to: 'libs/core/src/util/text.ts', kind: 'cycle' as const },
    { from: 'libs/core/src/__tests__/pm.test.ts', to: 'libs/core/src/pm/index.ts', kind: 'new-cross-module' as const },
  ];
  expect(weatherOf(withWeather({}, { edges_exceptional: edges })).edges).toEqual([edges[1], edges[0]]);
});

test('the reach field lights each reached cell at its luminance, takes the brightest where skins nest, and leaves an unreached child dark (D151)', () => {
  const field = reachField(DEMO, 2);
  const at = (path: string): number => {
    const place = DEMO.terrain.layout?.positions[path];
    return place === undefined ? Number.NaN : sampleGrid(field, place.x, place.y);
  };
  expect(at('libs/core/src/pm/tools.ts')).toBeCloseTo(1, 6);
  expect(at('libs/core/src/index.ts')).toBeCloseTo(REACH_DECAY, 6);
  expect(at('libs/core/src/util/format.ts')).toBe(0);
  expect(Math.max(...field.values)).toBe(1);
  expect(sampleGrid(field, (DEMO.terrain.layout?.width ?? 0) - 2, (DEMO.terrain.layout?.height ?? 0) - 2)).toBe(0);
});

test('a map with no reach lights nothing (C2)', () => {
  expect(reachField(withWeather({ reach: [] }), 4).values.every((value) => value === 0)).toBe(true);
});

/**
 * C11 gives every channel its meanings and no others, so each attribute the
 * weather carries is pinned to one channel and one of that channel's
 * meanings. Luminance means evidence and reach by C11's own words, so the
 * unit no two attributes may share is a channel's meaning, not the channel.
 * A ghost is a dashed outline: a texture, and co-change is history (§5.2).
 */
type Channel = 'hue' | 'luminance' | 'texture' | 'shape' | 'size' | 'repetition' | 'relief' | 'motion';

const C11: Readonly<Record<Channel, readonly string[]>> = {
  hue: ['state'],
  luminance: ['evidence', 'reach'],
  texture: ['history'],
  shape: ['conformance'],
  size: ['mass'],
  repetition: ['duplication'],
  relief: ['elevation'],
  motion: ['urgency', 'conformance', 'looseness'],
};

type Assigned = readonly [Channel, string];

const FILE_CHANNELS = {
  change: ['hue', 'state'],
  crossing: ['luminance', 'reach'],
  evidence: ['luminance', 'evidence'],
  ghost: ['texture', 'history'],
} as const satisfies Record<Exclude<keyof FileWeather, 'path'>, Assigned>;

const CELL_CHANNELS = {
  reach: ['luminance', 'reach'],
  storms: ['hue', 'state'],
} as const satisfies Record<Exclude<keyof CellWeather, 'cell'>, Assigned>;

const ENTITIES: Readonly<Record<string, Readonly<Record<string, Assigned>>>> = { file: FILE_CHANNELS, cell: CELL_CHANNELS };

/** Every key the records carry, but the one naming them. */
const carried = (records: readonly object[], identity: string): readonly string[] =>
  [...new Set(records.flatMap((record) => Object.keys(record)))].filter((key) => key !== identity).toSorted();

test('every attribute the weather carries is pinned to one channel of C11', () => {
  const rich = weatherOf(
    withWeather({
      changed: DEMO.weather.changed.map((file) => (file.path === 'apps/cli/src/doctor.ts' ? { ...file, kind: 'renamed' as const, from: 'old.ts' } : file)),
    }),
  );
  expect(carried(rich.files, 'path')).toEqual(Object.keys(FILE_CHANNELS).toSorted());
  expect(carried(rich.cells, 'cell')).toEqual(Object.keys(CELL_CHANNELS).toSorted());
});

test.each(Object.entries(ENTITIES))("no two of a %s's attributes share a channel's meaning, and each meaning is one C11 gives its channel", (_entity, channels) => {
  const used = new Map<string, string>();
  for (const [attribute, [channel, meaning]] of Object.entries(channels)) {
    expect(C11[channel], `${attribute} on ${channel}`).toContain(meaning);
    const key = `${channel}: ${meaning}`;
    expect(used.get(key), `${attribute} and ${used.get(key) ?? ''} both say ${key}`).toBeUndefined();
    used.set(key, attribute);
  }
});

test('one map gives one weather, whatever order its lists arrive in (C3)', () => {
  const shuffled = withWeather(
    {
      changed: DEMO.weather.changed.toReversed(),
      reach: DEMO.weather.reach.toReversed(),
      ghosts: DEMO.weather.ghosts.toReversed(),
      evidence: {
        ...DEMO.weather.evidence,
        mutants: (DEMO.weather.evidence.mutants ?? []).toReversed(),
        stitches: (DEMO.weather.evidence.stitches ?? []).toReversed(),
      },
    },
    { cells: DEMO.terrain.cells.toReversed(), organelles: DEMO.terrain.organelles.toReversed() },
  );
  expect(weatherOf(shuffled)).toEqual(WEATHER);
  expect(reachField(shuffled, 4).values).toEqual(reachField(DEMO, 4).values);
});
