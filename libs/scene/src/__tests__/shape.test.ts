import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import { expect, test } from 'vitest';

import { AT_REST, MAX_RULES, draw as seeded, outlineOf, rulesOf, seedOf } from '../shape.js';
import type { Outline, ShapeMotion } from '../shape.js';
import { troubleOf } from '../trouble.js';
import { SHAPE_ARM_SPREAD, SHAPE_CORE_GIVE, SHAPE_LEVELS } from '../tokens.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));

const AT = { x: 40, y: 60, r: 10 };
const IDS = ['a.ts', 'src/pm/tools.ts', 'libs/core/src/util/format.ts', 'x/y/z.ts', 'b'];

/** The score that lands on the form at `level`, one of the spectrum's seven samples. */
const scoreAt = (level: number): number => level / MAX_RULES;

/** The outline of `id` at the form at `level`. */
const formOf = (id: string, level: number, motion: ShapeMotion = AT_REST): Outline => outlineOf(id, AT, scoreAt(level), motion);

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

test('a file with no trouble is a circle at the radius its mass gave it', () => {
  const outline = outlineOf('a.ts', AT, 0);
  expect(outline.level).toBe(0);
  expect(outline.bulbs).toEqual([]);
  expect(outline.core).toBe(AT.r);
  expect(outline.extent).toBe(AT.r);
  for (const radius of radii(outline)) expect(radius).toBeCloseTo(AT.r, 9);
});

test.each([3, 4, 5, 6])('a file at form %i shows one crest per arm of its form', (level) => {
  for (const id of IDS) expect(crests(formOf(id, level), level), id).toBe(SHAPE_LEVELS[level]?.arms);
});

test('the gentle forms swell about the radius without spikes: within the wobble and the arms of their form', () => {
  for (const level of [1, 2]) {
    const form = SHAPE_LEVELS[level];
    if (form === undefined) throw new Error('SHAPE_LEVELS has seven forms');
    for (const id of IDS) {
      const outline = formOf(id, level);
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
      const outline = formOf(id, level);
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

test('from one form to the next the outline reaches further, while its body gives a little back', () => {
  for (const id of IDS) {
    const outlines = Array.from({ length: MAX_RULES + 1 }, (_, level) => formOf(id, level));
    const reach = outlines.map((outline) => Math.max(...radii(outline)));
    reach.slice(1).forEach((far, index) => expect(far, `${id} at ${String(index + 1)}`).toBeGreaterThan(reach[index] ?? Number.POSITIVE_INFINITY));
    outlines.forEach((outline, level) => expect(outline.core).toBeCloseTo(AT.r * (1 - SHAPE_CORE_GIVE * (SHAPE_LEVELS[level]?.reach ?? 0)), 9));
  }
});

test('the rule count caps at the highest form, a dents list reads as its length, and a score outside the spectrum draws its nearer end', () => {
  expect(rulesOf([])).toBe(0);
  expect(rulesOf(['crap', 'cyclomatic'])).toBe(2);
  expect(rulesOf(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'])).toBe(MAX_RULES);
  expect(outlineOf('a.ts', AT, 9)).toEqual(outlineOf('a.ts', AT, 1));
  expect(outlineOf('a.ts', AT, 1).level).toBe(MAX_RULES);
  expect(outlineOf('a.ts', AT, -2)).toEqual(outlineOf('a.ts', AT, 0));
  expect(outlineOf('a.ts', AT, Number.NaN).level).toBe(0);
});

test('a path seeds its shape: one path and score is one outline every time, and two paths at one score differ (C3)', () => {
  for (const score of [0.13, 0.4, scoreAt(4), 0.87, 1]) {
    expect(outlineOf('src/pm/tools.ts', AT, score)).toEqual(outlineOf('src/pm/tools.ts', AT, score));
    expect(outlineOf('src/pm/tools.ts', AT, score).ring).not.toEqual(outlineOf('src/pm/slots.ts', AT, score).ring);
  }
});

test('at rest, the outline is the same at any time; turning and pulsing move it, and only within its form', () => {
  const still = formOf('a.ts', 5);
  expect(formOf('a.ts', 5, { ...AT_REST, t: 7.5 })).toEqual(still);
  const turned = formOf('a.ts', 5, { t: 1, pulseHz: 0, pulse: 0, turn: 0.4 });
  expect(turned.ring).not.toEqual(still.ring);
  expect(crests(turned, 5)).toBe(SHAPE_LEVELS[5]?.arms);
  const pulsing = formOf('a.ts', 5, { t: 0.3, pulseHz: 1.15, pulse: 0.38, turn: 0 });
  expect(pulsing.ring).not.toEqual(still.ring);
  expect(pulsing.bulbs.map((bulb) => bulb.r)).toEqual(still.bulbs.map((bulb) => bulb.r));
});

test("every organelle of one map gives the same outlines byte for byte on a second draw (C3)", () => {
  const draw = (): string =>
    JSON.stringify(
      DEMO.terrain.organelles.map((organelle) => {
        const at = DEMO.terrain.layout?.positions[organelle.id];
        return at === undefined ? null : outlineOf(organelle.id, at, troubleOf(organelle).score);
      }),
    );
  expect(draw()).toBe(draw());
});

/**
 * The form at a whole level as it was drawn before the spectrum (D146): one
 * of the seven stepped forms, kept here as the reference the spectrum's
 * samples are held to.
 */
function steppedOf(id: string, level: number): Pick<Outline, 'ring' | 'bulbs' | 'core'> {
  const form = SHAPE_LEVELS[level];
  if (form === undefined) throw new Error('SHAPE_LEVELS has seven forms');
  const seed = seedOf(id);
  const core = AT.r * (1 - SHAPE_CORE_GIVE * form.reach);
  const phase = seeded(seed, 99) * 2 * Math.PI;
  const wobblePhase = seeded(seed, 98) * 2 * Math.PI;
  const arms = Array.from({ length: form.arms }, (_, arm) => 1 + SHAPE_ARM_SPREAD * (2 * seeded(seed, arm) - 1));
  const radiusAt = (theta: number): number => {
    const body = core * (1 + form.wobble * Math.sin(2 * theta + wobblePhase));
    if (form.arms === 0) return body;
    const turned = theta - phase;
    const spoke = ((Math.round((turned * form.arms) / (2 * Math.PI)) % form.arms) + form.arms) % form.arms;
    return body + core * form.reach * (arms[spoke] ?? 1) * ((1 + Math.cos(turned * form.arms)) / 2) ** form.sharp;
  };
  const ring = Array.from({ length: form.samples }, (_, i): readonly [number, number] => {
    const theta = (i / form.samples) * 2 * Math.PI;
    return [AT.x + Math.cos(theta) * radiusAt(theta), AT.y + Math.sin(theta) * radiusAt(theta)];
  });
  const bulbs =
    form.bulb <= 0
      ? []
      : arms.map((size, arm) => {
          const theta = phase + (arm / form.arms) * 2 * Math.PI;
          const reach = core * (1 + form.reach * size);
          return { x: AT.x + Math.cos(theta) * reach, y: AT.y + Math.sin(theta) * reach, r: AT.r * form.bulb };
        });
  return { ring, bulbs, core };
}

test("each whole level's outline is the stepped form it was before the spectrum, within rounding", () => {
  for (const id of IDS) {
    for (let level = 0; level <= MAX_RULES; level += 1) {
      const was = steppedOf(id, level);
      const is = formOf(id, level);
      expect(is.level).toBe(level);
      expect(is.core).toBeCloseTo(was.core, 9);
      expect(is.ring).toHaveLength(was.ring.length);
      is.ring.forEach(([x, y], index) => {
        expect(x).toBeCloseTo(was.ring[index]?.[0] ?? Number.NaN, 9);
        expect(y).toBeCloseTo(was.ring[index]?.[1] ?? Number.NaN, 9);
      });
      expect(is.bulbs).toHaveLength(was.bulbs.length);
      is.bulbs.forEach((bulb, index) => {
        expect(bulb.x).toBeCloseTo(was.bulbs[index]?.x ?? Number.NaN, 9);
        expect(bulb.y).toBeCloseTo(was.bulbs[index]?.y ?? Number.NaN, 9);
        expect(bulb.r).toBeCloseTo(was.bulbs[index]?.r ?? Number.NaN, 9);
      });
    }
  }
});

/** The furthest two rings drawn through the same points stand apart, point for point, as a share of the radius. */
function apart(a: Outline, b: Outline): number {
  return Math.max(...a.ring.map(([x, y], index) => Math.hypot(x - (b.ring[index]?.[0] ?? Number.NaN), y - (b.ring[index]?.[1] ?? Number.NaN)))) / AT.r;
}

test('the spectrum is continuous: two scores a thousandth apart give rings whose matching points differ by under a fiftieth of the radius', () => {
  // The spiky end grows a full arm, about the radius long, inside a sixth of
  // the spectrum, so no outline can hold a hundredth of the radius across a
  // hundredth of the score there; a thousandth of the score is the step the
  // bound is held at. Two rings match point for point where they are drawn
  // through the same number of points, which is all but where the count ticks.
  const step = 0.001;
  let compared = 0;
  for (const id of IDS) {
    for (let index = 0; index < 1000; index += 1) {
      const [low, high] = [outlineOf(id, AT, index * step), outlineOf(id, AT, (index + 1) * step)];
      expect(Math.abs(high.ring.length - low.ring.length)).toBeLessThanOrEqual(1);
      expect(Math.abs(high.core - low.core) / AT.r).toBeLessThan(0.001);
      if (low.ring.length !== high.ring.length) continue;
      compared += 1;
      expect(apart(low, high), `${id} at ${String(index * step)}`).toBeLessThan(1 / 50);
    }
  }
  expect(compared).toBeGreaterThan(IDS.length * 800);
});

test('the smooth half of the spectrum holds a hundredth of the radius across a hundredth of the score', () => {
  for (const id of IDS) {
    for (let index = 0; index < 16; index += 1) {
      const [low, high] = [outlineOf(id, AT, index / 100), outlineOf(id, AT, (index + 1) / 100)];
      if (low.ring.length === high.ring.length) expect(apart(low, high), `${id} at ${String(index / 100)}`).toBeLessThan(0.011);
    }
  }
});

test('no outline jumps as it passes a form: just below and just above each whole level it is all but the form itself', () => {
  const near = 1e-6;
  for (const id of IDS) {
    for (let level = 0; level <= MAX_RULES; level += 1) {
      const form = formOf(id, level);
      for (const side of [-near, near]) {
        const score = scoreAt(level) + side;
        if (score < 0 || score > 1) continue;
        const beside = outlineOf(id, AT, score);
        expect(beside.ring).toHaveLength(form.ring.length);
        expect(apart(form, beside), `${id} beside ${String(level)}`).toBeLessThan(1e-4);
        // A bulb fading in or out beside the form is all but nothing, and the form's own are all but whole.
        const whole = beside.bulbs.filter((bulb) => bulb.r > AT.r * 1e-3);
        expect(whole).toHaveLength(form.bulbs.length);
        whole.forEach((bulb, index) => expect(Math.hypot(bulb.x - (form.bulbs[index]?.x ?? Number.NaN), bulb.y - (form.bulbs[index]?.y ?? Number.NaN)) / AT.r).toBeLessThan(1e-4));
      }
    }
  }
});

test('a higher score never gives a smaller extent, and no point of the ring lies outside it', () => {
  // The extent is the body's swell and the longest arm together. The ring is
  // drawn through a fixed number of points, which can step either side of a
  // narrow spike's tip, so its own furthest point is held to the extent here
  // and to the seven forms above.
  const steps = 600;
  for (const id of IDS) {
    let before = 0;
    for (let index = 0; index <= steps; index += 1) {
      const outline = outlineOf(id, AT, index / steps);
      expect(outline.extent, `${id} at ${String(index / steps)}`).toBeGreaterThanOrEqual(before - 1e-12);
      before = outline.extent;
      expect(Math.max(...radii(outline))).toBeLessThanOrEqual(outline.extent + 1e-9);
      expect(Math.min(...radii(outline))).toBeGreaterThan(0);
    }
    expect(outlineOf(id, AT, 1).extent).toBeGreaterThan(outlineOf(id, AT, 0).extent * 1.4);
  }
});

test('between two forms the lower one holds its arms while the upper grows in, then gives way: halfway, both stand at full length', () => {
  for (const id of IDS) {
    for (const level of [3, 4]) {
      const lower = SHAPE_LEVELS[level]?.arms ?? 0;
      const upper = SHAPE_LEVELS[level + 1]?.arms ?? 0;
      const near = crests(outlineOf(id, AT, scoreAt(level + 0.02)), level);
      expect(near, `${id} just past ${String(level)}`).toBeGreaterThanOrEqual(lower);
      expect(near).toBeLessThanOrEqual(lower + upper);
      expect(crests(outlineOf(id, AT, scoreAt(level + 0.98)), level + 1), `${id} just short of ${String(level + 1)}`).toBeGreaterThanOrEqual(upper);
    }
  }
});

test('the bulbs cross-fade: the lower form\'s shrink as the upper form\'s grow, by the fraction of the way', () => {
  const rising = outlineOf('a.ts', AT, scoreAt(4.25));
  expect(rising.bulbs).toHaveLength(SHAPE_LEVELS[5]?.arms ?? -1);
  for (const bulb of rising.bulbs) expect(bulb.r).toBeCloseTo(AT.r * (SHAPE_LEVELS[5]?.bulb ?? 0) * 0.25, 9);
  const between = outlineOf('a.ts', AT, scoreAt(5.25));
  const [lower, upper] = [SHAPE_LEVELS[5], SHAPE_LEVELS[6]];
  expect(between.bulbs).toHaveLength((lower?.arms ?? 0) + (upper?.arms ?? 0));
  between.bulbs.slice(0, lower?.arms).forEach((bulb) => expect(bulb.r).toBeCloseTo(AT.r * (lower?.bulb ?? 0) * 0.75, 9));
  between.bulbs.slice(lower?.arms).forEach((bulb) => expect(bulb.r).toBeCloseTo(AT.r * (upper?.bulb ?? 0) * 0.25, 9));
  expect(outlineOf('a.ts', AT, scoreAt(3.9)).bulbs).toEqual([]);
});
