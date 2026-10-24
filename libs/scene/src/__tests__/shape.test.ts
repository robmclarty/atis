import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import { expect, test } from 'vitest';

import { AT_REST, MAX_RULES, outlineOf, rulesOf } from '../shape.js';
import type { Outline } from '../shape.js';
import { SHAPE_ARM_SPREAD, SHAPE_CORE_GIVE, SHAPE_LEVELS } from '../tokens.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));

const AT = { x: 40, y: 60, r: 10 };
const IDS = ['a.ts', 'src/pm/tools.ts', 'libs/core/src/util/format.ts', 'x/y/z.ts', 'b'];

/** Each point's distance from the file's centre. */
function radii(outline: Outline): readonly number[] {
  return outline.ring.map(([x, y]) => Math.hypot(x - AT.x, y - AT.y));
}

/**
 * How many arms the outline shows: runs of points standing above the body's
 * highest wobble by a quarter of the shortest arm, counted round the ring.
 */
function crests(outline: Outline, level: number): number {
  const form = SHAPE_LEVELS[level];
  if (form === undefined) return 0;
  const threshold = outline.core * (1 + form.wobble) + 0.25 * outline.core * form.reach * (1 - SHAPE_ARM_SPREAD);
  const above = radii(outline).map((radius) => radius > threshold);
  const starts = above.filter((up, index) => up && !above[(index - 1 + above.length) % above.length]).length;
  return above.every(Boolean) ? 1 : starts;
}

test('a file within every threshold is a circle at the radius its mass gave it', () => {
  const outline = outlineOf('a.ts', AT, 0);
  expect(outline.level).toBe(0);
  expect(outline.bulbs).toEqual([]);
  expect(outline.core).toBe(AT.r);
  for (const radius of radii(outline)) expect(radius).toBeCloseTo(AT.r, 9);
});

test.each([3, 4, 5, 6])('a file breaking %i rules shows one crest per arm of its form', (level) => {
  for (const id of IDS) expect(crests(outlineOf(id, AT, level), level), id).toBe(SHAPE_LEVELS[level]?.arms);
});

test('the gentle forms swell about the radius without spikes: within the wobble and the arms of their form', () => {
  for (const level of [1, 2]) {
    const form = SHAPE_LEVELS[level];
    if (form === undefined) throw new Error('SHAPE_LEVELS has seven forms');
    for (const id of IDS) {
      const outline = outlineOf(id, AT, level);
      const spread = radii(outline);
      expect(Math.min(...spread)).toBeGreaterThanOrEqual(outline.core * (1 - form.wobble) - 1e-9);
      expect(Math.max(...spread)).toBeLessThanOrEqual(outline.core * (1 + form.wobble + form.reach * (1 + SHAPE_ARM_SPREAD)) + 1e-9);
      expect(Math.max(...spread) - Math.min(...spread)).toBeGreaterThan(0);
    }
  }
});

test('only the two highest forms wear bulbs, one at the tip of each arm', () => {
  for (const id of IDS) {
    for (let level = 0; level <= MAX_RULES; level += 1) {
      const outline = outlineOf(id, AT, level);
      const form = SHAPE_LEVELS[level];
      expect(outline.bulbs, `${id} at ${String(level)}`).toHaveLength(level >= 5 ? (form?.arms ?? -1) : 0);
      for (const bulb of outline.bulbs) {
        expect(bulb.r).toBeCloseTo(AT.r * (form?.bulb ?? 0), 9);
        // Each bulb sits out past the body, where an arm reaches.
        expect(Math.hypot(bulb.x - AT.x, bulb.y - AT.y)).toBeGreaterThan(outline.core * (1 + (form?.reach ?? 0) * (1 - SHAPE_ARM_SPREAD)) - 1e-9);
      }
    }
  }
});

test('the more rules a file breaks, the further its outline reaches, while its body gives a little back', () => {
  for (const id of IDS) {
    const outlines = Array.from({ length: MAX_RULES + 1 }, (_, level) => outlineOf(id, AT, level));
    const reach = outlines.map((outline) => Math.max(...radii(outline)));
    reach.slice(1).forEach((far, index) => expect(far, `${id} at ${String(index + 1)}`).toBeGreaterThan(reach[index] ?? Number.POSITIVE_INFINITY));
    outlines.forEach((outline, level) => expect(outline.core).toBeCloseTo(AT.r * (1 - SHAPE_CORE_GIVE * (SHAPE_LEVELS[level]?.reach ?? 0)), 9));
  }
});

test('the rule count caps at the highest form, and a dents list reads as its length', () => {
  expect(rulesOf([])).toBe(0);
  expect(rulesOf(['crap', 'cyclomatic'])).toBe(2);
  expect(rulesOf(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'])).toBe(MAX_RULES);
  expect(outlineOf('a.ts', AT, 9).level).toBe(MAX_RULES);
  expect(outlineOf('a.ts', AT, -2).level).toBe(0);
});

test('a path seeds its shape: one path is one outline every time, and two paths at one level differ (C3)', () => {
  expect(outlineOf('src/pm/tools.ts', AT, 4)).toEqual(outlineOf('src/pm/tools.ts', AT, 4));
  expect(outlineOf('src/pm/tools.ts', AT, 4).ring).not.toEqual(outlineOf('src/pm/slots.ts', AT, 4).ring);
});

test('at rest, the outline is the same at any time; turning and pulsing move it, and only within its form', () => {
  const still = outlineOf('a.ts', AT, 5);
  expect(outlineOf('a.ts', AT, 5, { ...AT_REST, t: 7.5 })).toEqual(still);
  const turned = outlineOf('a.ts', AT, 5, { t: 1, pulseHz: 0, pulse: 0, turn: 0.4 });
  expect(turned.ring).not.toEqual(still.ring);
  expect(crests(turned, 5)).toBe(SHAPE_LEVELS[5]?.arms);
  const pulsing = outlineOf('a.ts', AT, 5, { t: 0.3, pulseHz: 1.15, pulse: 0.38, turn: 0 });
  expect(pulsing.ring).not.toEqual(still.ring);
  expect(pulsing.bulbs.map((bulb) => bulb.r)).toEqual(still.bulbs.map((bulb) => bulb.r));
});

test("every organelle of one map gives the same outlines byte for byte on a second draw (C3)", () => {
  const draw = (): string =>
    JSON.stringify(
      DEMO.terrain.organelles.map((organelle) => {
        const at = DEMO.terrain.layout?.positions[organelle.id];
        return at === undefined ? null : outlineOf(organelle.id, at, rulesOf(organelle.dents));
      }),
    );
  expect(draw()).toBe(draw());
});
