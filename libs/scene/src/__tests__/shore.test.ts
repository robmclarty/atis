import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson } from 'core';
import { expect, test } from 'vitest';

import { shoreRail } from '../shore.js';
import { weatherOf } from '../weather.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));

function withWeather(weather: Partial<MapJson['weather']>, groups: MapJson['terrain']['groups'] = DEMO.terrain.groups): MapJson {
  return { ...DEMO, terrain: { ...DEMO.terrain, groups }, weather: { ...DEMO.weather, ...weather } };
}

test('the groups the change touched lead, then the rest, each by name with `other` last and loud (D48, D153)', () => {
  const rail = shoreRail(DEMO);
  expect(rail.map((block) => [block.group, block.touched, block.loud])).toEqual([
    ['deps', true, false],
    ['docs', true, false],
    ['tests', true, false],
    ['other', true, true],
    ['build', false, false],
    ['config', false, false],
    ['settings', false, false],
  ]);
  const counts = new Map(DEMO.terrain.groups.map((group) => [group.id, group.files.length] as const));
  for (const block of rail) expect(block.count).toBe(counts.get(block.group));
});

test('a touched block names its changed files by path with their kinds, and an untouched block names none', () => {
  const rail = shoreRail(DEMO);
  expect(rail.find((block) => block.group === 'docs')?.files).toEqual([{ path: 'README.md', change: { kind: 'modified' } }]);
  expect(rail.find((block) => block.group === 'build')?.files).toEqual([]);
  const renamed = shoreRail(
    withWeather({
      changed: DEMO.weather.changed.map((file) => (file.path === 'README.md' ? { ...file, kind: 'renamed' as const, from: 'READ_ME.md' } : file)),
    }),
  );
  expect(renamed.find((block) => block.group === 'docs')?.files).toEqual([{ path: 'README.md', change: { kind: 'renamed', from: 'READ_ME.md' } }]);
});

test("a shore file that usually changes with these and did not is named as a ghost on its group's block, which stays untouched", () => {
  const ghosts = [{ path: 'tsconfig.json', with: ['libs/core/src/pm/index.ts'], rate: 0.5, support: 2 }];
  const config = shoreRail(withWeather({ ghosts })).find((block) => block.group === 'config');
  expect(config?.files).toEqual([{ path: 'tsconfig.json', ghost: true }]);
  expect(config?.touched).toBe(false);
});

test('a red slot naming a shore file hangs over its group, split by the change, and a global slot over none (D68)', () => {
  const slots = [
    ...DEMO.weather.checks.slots,
    { name: 'spell', ok: false, skipped: false, scope: ['README.md'], change: ['README.md'] },
    { name: 'docs', ok: false, skipped: false, scope: ['README.md', 'tsconfig.json'], change: [] },
  ];
  const rail = shoreRail(withWeather({ checks: { ...DEMO.weather.checks, slots } }));
  expect(rail.find((block) => block.group === 'docs')?.storms).toEqual([
    { slot: 'spell', change: true },
    { slot: 'docs', change: false },
  ]);
  expect(rail.find((block) => block.group === 'config')?.storms).toEqual([{ slot: 'docs', change: false }]);
  expect(rail.find((block) => block.group === 'deps')?.storms).toEqual([]);
});

test('the tests group is a block like any other, naming its changed test files, and an empty group has no block', () => {
  const tests = shoreRail(DEMO).find((block) => block.group === 'tests');
  expect(tests?.touched).toBe(true);
  expect(tests?.files).toEqual([{ path: 'libs/core/src/__tests__/pm.test.ts', change: { kind: 'modified' } }]);
  const empty = shoreRail(withWeather({}, [...DEMO.terrain.groups, { id: 'assets', files: [] }]));
  expect(empty.some((block) => block.group === 'assets')).toBe(false);
});

test('a long shore stays one block per group, however many files each holds', () => {
  const groups = Array.from({ length: 40 }, (_group, index) => ({ id: `group-${String(index).padStart(2, '0')}`, files: Array.from({ length: 50 }, (_file, file) => `g${String(index)}/f${String(file)}.md`) }));
  const rail = shoreRail(withWeather({ changed: [], ghosts: [] }, groups));
  expect(rail).toHaveLength(40);
  expect(rail.every((block) => block.files.length === 0 && block.count === 50)).toBe(true);
});

test('the terrain weather leaves the shore to the rail: no shore file, and no storm over a group (D153)', () => {
  const shoreFiles = new Set(DEMO.terrain.groups.flatMap((group) => group.files));
  expect(weatherOf(DEMO).files.some((file) => shoreFiles.has(file.path))).toBe(false);
  const slots = [...DEMO.weather.checks.slots, { name: 'spell', ok: false, skipped: false, scope: ['README.md'], change: ['README.md'] }];
  const storms = weatherOf(withWeather({ checks: { ...DEMO.weather.checks, slots } })).storms;
  expect(storms.some((storm) => storm.place === 'docs')).toBe(false);
});

test('one map gives one rail, whatever order its lists arrive in (C3)', () => {
  const shuffled: MapJson = {
    ...DEMO,
    terrain: { ...DEMO.terrain, groups: DEMO.terrain.groups.toReversed().map((group) => ({ ...group, files: group.files.toReversed() })) },
    weather: { ...DEMO.weather, changed: DEMO.weather.changed.toReversed() },
  };
  expect(shoreRail(shuffled)).toEqual(shoreRail(DEMO));
});
