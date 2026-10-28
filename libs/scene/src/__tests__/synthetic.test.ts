import { assertMap } from 'core';
import { expect, test } from 'vitest';

import { syntheticInputs, syntheticMap } from '../synthetic.js';

/**
 * The seeded repo the world's budget is measured on (step 43, C14): as many
 * terrain files as asked, a pull request's worth of change of every kind, the
 * same repo for the same seed, and a map core builds from it that passes the
 * guard. The 5,000-file map takes core minutes to lay out, so the inputs are
 * held at that size and the map at a small one.
 */

test('the inputs hold exactly the terrain files asked for at 5,000, in packages with barrels, and change a pull request of every kind', () => {
  const inputs = syntheticInputs({ files: 5000 });
  const terrain = inputs.base.files.filter((file) => file.kind === 'source');
  expect(terrain).toHaveLength(5000);
  expect(inputs.base.members.length).toBeGreaterThan(10);
  expect(inputs.base.members.slice(1).every((member) => member.entry.length === 1 && inputs.base.files.some((file) => file.path === member.entry[0]))).toBe(true);
  expect(inputs.base.files.some((file) => file.kind === 'test')).toBe(true);
  expect(new Set(inputs.diff.map((file) => file.kind))).toEqual(new Set(['modified', 'added', 'deleted', 'renamed']));
  expect(inputs.diff.length).toBeGreaterThan(40);
  expect(inputs.diff.length).toBeLessThan(80);
  // A renamed file is at its new path on the head and its old one on the base.
  const moved = inputs.diff.find((file) => file.kind === 'renamed');
  expect(inputs.head.files.some((file) => file.path === moved?.path)).toBe(true);
  expect(inputs.base.files.some((file) => file.path === moved?.from)).toBe(true);
  expect(inputs.commits.length).toBeGreaterThan(100);
});

test('one size and one seed give one repo, and another seed another', () => {
  expect(JSON.stringify(syntheticInputs({ files: 800, seed: 3 }))).toBe(JSON.stringify(syntheticInputs({ files: 800, seed: 3 })));
  expect(JSON.stringify(syntheticInputs({ files: 800, seed: 4 }))).not.toBe(JSON.stringify(syntheticInputs({ files: 800, seed: 3 })));
});

// Core's layout is the slow part, and slower again under the gate's coverage beside every other suite, so the map is small and the clock generous.
test("core builds a map from it that passes the guard: every kind of cell, terraces deep enough to read, the change's weather and a full notice budget", { timeout: 60_000 }, () => {
  const map = assertMap(syntheticMap({ files: 150, changed: 30 }));
  const added = map.weather.changed.filter((file) => file.kind === 'added').length;
  expect(map.terrain.organelles).toHaveLength(150 + added);
  expect(new Set(map.terrain.cells.map((cell) => cell.kind))).toEqual(new Set(['package', 'folder', 'single', 'directory']));
  expect(map.terrain.bands.length).toBeGreaterThanOrEqual(4);
  expect(Object.keys(map.terrain.layout?.contours ?? {}).length).toBeGreaterThan(map.terrain.cells.length / 2);
  expect(map.weather.reach.length).toBeGreaterThan(0);
  expect(map.weather.evidence.patch_coverage?.length).toBeGreaterThan(0);
  expect(map.weather.checks.category).toBe('IFR');
  expect(map.notices).toHaveLength(6);
});
