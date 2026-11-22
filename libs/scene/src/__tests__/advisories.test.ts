import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { Dependency, MapJson } from 'core';
import { expect, test } from 'vitest';

import { advisedFilesOf, dependencyHealthOf } from '../advisories.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));

const INDEX = 'libs/core/src/pm/index.ts';
const TOOLS = 'libs/core/src/pm/tools.ts';
const SLOTS = 'libs/core/src/pm/slots.ts';

const withDependencies = (dependencies: readonly Dependency[] | undefined): MapJson => {
  const { dependencies: _was, ...weather } = DEMO.weather;
  return assertMap({ ...DEMO, weather: dependencies === undefined ? weather : { ...weather, dependencies } });
};

/** An audit that names `kleur` at high, imported by two files, and `semver` at low, imported by one of the same two. */
const ADVISED: readonly Dependency[] = [
  { name: 'kleur', importers: 2, advisories: 2, severity: 'high', files: [INDEX, TOOLS] },
  { name: 'picomatch', importers: 2, change: 'added', advisories: 0 },
  { name: 'semver', importers: 1, advisories: 1, severity: 'low', files: [TOOLS] },
];

test('the health of the outside packages counts those an advisory names, those named at high or critical, and the worst severity (D352 (deps-block))', () => {
  expect(dependencyHealthOf(withDependencies(ADVISED))).toEqual({ state: 'read', packages: 3, advised: 2, severe: 1, worst: 'high' });
  const critical = ADVISED.map((dependency) => (dependency.name === 'semver' ? { ...dependency, severity: 'critical' } : dependency));
  expect(dependencyHealthOf(withDependencies(critical))).toEqual({ state: 'read', packages: 3, advised: 2, severe: 2, worst: 'critical' });
  // An audit that found nothing is read, and clean.
  const clean = ADVISED.map(({ name, importers }) => ({ name, importers, advisories: 0 }));
  expect(dependencyHealthOf(withDependencies(clean))).toEqual({ state: 'read', packages: 3, advised: 0, severe: 0 });
});

test('no audit read is unread with its reason, never a clean audit (C2)', () => {
  // The demo's packages carry no count: no audit read them.
  expect(dependencyHealthOf(DEMO)).toEqual({ state: 'unread', reason: 'no audit was read' });
  expect(dependencyHealthOf(withDependencies(undefined))).toEqual({ state: 'unread', reason: "the head scan recorded no file's imports by package" });
  expect(dependencyHealthOf(withDependencies([]))).toEqual({ state: 'unread', reason: 'the terrain imports no outside package' });
});

test('the advised files are the terrain files that import a package an advisory names, by path, each with every such package and whether one is serious (D351 (advised-files))', () => {
  const map = withDependencies(ADVISED);
  expect(advisedFilesOf(map)).toEqual([
    { path: INDEX, packages: ['kleur'], severe: true },
    { path: TOOLS, packages: ['kleur', 'semver'], severe: true },
  ]);
  // One map gives one list.
  expect(advisedFilesOf(map)).toBe(advisedFilesOf(map));
  // Only a lesser advisory: the file is advised, and not seriously.
  const lesser = withDependencies([{ name: 'semver', importers: 1, advisories: 1, severity: 'moderate', files: [SLOTS] }]);
  expect(advisedFilesOf(lesser)).toEqual([{ path: SLOTS, packages: ['semver'], severe: false }]);
});

test('a map with no audit, or one written before core listed the importing files, advises no file (C2)', () => {
  expect(advisedFilesOf(DEMO)).toEqual([]);
  expect(advisedFilesOf(withDependencies(ADVISED.map(({ files: _files, ...dependency }) => dependency)))).toEqual([]);
  // A file the terrain does not hold is left out.
  expect(advisedFilesOf(withDependencies([{ name: 'kleur', importers: 1, advisories: 1, severity: 'high', files: ['gone/file.ts'] }]))).toEqual([]);
});
