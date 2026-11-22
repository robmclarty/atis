import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { Dependency, MapJson } from 'core';
import { expect, test } from 'vitest';

import { STAR_SKY, packageStarsOf, starNamed } from '../stars.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));

const GROUND = { x0: 100, y0: 200, x1: 500, y1: 400 };

const withDependencies = (dependencies: readonly Dependency[]): MapJson => assertMap({ ...DEMO, weather: { ...DEMO.weather, dependencies } });

/** How far a point lies outside a box: 0 inside it. */
const outside = (x: number, y: number): number => Math.hypot(Math.max(GROUND.x0 - x, 0, x - GROUND.x1), Math.max(GROUND.y0 - y, 0, y - GROUND.y1));

test('each outside package is one star off the edge of the ground, by name, sized by its importers and hued by its health (D354 (package-stars))', () => {
  const stars = packageStarsOf(DEMO, GROUND);
  expect(stars.map((star) => [star.name, star.importers, star.hue])).toEqual([
    ['kleur', 2, 'unread'],
    ['picomatch', 2, 'change'],
    ['semver', 1, 'unread'],
  ]);
  // The busiest package's star is whole, and one file's is its share under a square root.
  expect(stars.map((star) => star.weight)).toEqual([1, 1, Math.sqrt(1 / 2)]);
  // Every star stands outside the ground, between the nearest and the farthest the sky lets it.
  const longer = GROUND.x1 - GROUND.x0;
  for (const star of stars) {
    const away = outside(star.x, star.y);
    expect(away).toBeGreaterThanOrEqual(STAR_SKY.near * longer - 1e-9);
    expect(away).toBeLessThanOrEqual(STAR_SKY.far * longer * Math.SQRT2 + 1e-9);
  }
});

test('a star keeps its place from one map to the next, whatever else the map holds, and moves with the seed (C3, P2)', () => {
  const stars = packageStarsOf(DEMO, GROUND);
  expect(packageStarsOf(structuredClone(DEMO), GROUND)).toEqual(stars);
  // A package read by an audit hangs where it hung: only its hue moved.
  const audited = packageStarsOf(withDependencies([{ name: 'kleur', importers: 2, advisories: 1, severity: 'high' }]), GROUND);
  const kleur = stars.find((star) => star.name === 'kleur');
  expect(audited).toEqual([{ ...kleur, hue: 'ifr' }]);
  expect(packageStarsOf(DEMO, GROUND, { ...STAR_SKY, seed: STAR_SKY.seed + 1 })).not.toEqual(stars);
});

test('many stars stand clear of one another where the sky has the room', () => {
  const many = withDependencies(Array.from({ length: 24 }, (_, at) => ({ name: `pkg-${String(at).padStart(2, '0')}`, importers: 1 + (at % 5) })));
  const stars = packageStarsOf(many, GROUND);
  expect(stars).toHaveLength(24);
  const gap = STAR_SKY.gap * (GROUND.x1 - GROUND.x0);
  const nearest = Math.min(...stars.flatMap((a, i) => stars.slice(i + 1).map((b) => Math.hypot(a.x - b.x, a.y - b.y))));
  expect(nearest).toBeGreaterThanOrEqual(gap);
});

test('a map that records no packages, or lays no ground out, hangs no star (C2)', () => {
  const { dependencies: _dependencies, ...weather } = DEMO.weather;
  expect(packageStarsOf({ ...DEMO, weather }, GROUND)).toEqual([]);
  expect(packageStarsOf(DEMO, undefined)).toEqual([]);
  expect(packageStarsOf(DEMO, { x0: 5, y0: 5, x1: 5, y1: 5 })).toEqual([]);
});

test('a star is named unasked where an advisory names its package or the change touched it, and a calm one keeps quiet (P1)', () => {
  expect((['ifr', 'amber', 'change', 'clean', 'unread'] as const).map((hue) => starNamed({ hue }))).toEqual([true, true, true, false, false]);
});
