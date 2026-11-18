import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { MapJson } from 'core';
import { expect, test } from 'vitest';

import { MAX_RULES } from '../shape.js';
import { syntheticMap } from '../synthetic.js';
import { BUGFIX_FULL_AT, CHURN_FULL_AT, TROUBLE_RULES_FROM } from '../tokens.js';
import { troubleFrom, troubleOf } from '../trouble.js';

const RULES = ['cognitive', 'crap', 'cyclomatic', 'lines', 'boundary', 'cycle'];
const dents = (count: number): readonly string[] => RULES.slice(0, count);

/** A file breaking `rules` rules, with a history where one is given. */
const file = (rules: number, churn_ratio?: number, bugfix_rate?: number): Parameters<typeof troubleOf>[0] => ({
  dents: dents(rules),
  ...(churn_ratio === undefined ? {} : { churn_ratio }),
  ...(bugfix_rate === undefined ? {} : { bugfix_rate }),
});

test('a hand-built map with every signal at 0 scores every file 0', () => {
  const map: MapJson = syntheticMap({ files: 40, seed: 7 });
  const calm = map.terrain.organelles.map((organelle) => ({ ...organelle, dents: [], churn_ratio: 0, bugfix_rate: 0 }));
  expect(calm.length).toBeGreaterThan(10);
  for (const organelle of calm) expect(troubleOf(organelle)).toEqual({ score: 0, used: ['dents', 'churn_ratio', 'bugfix_rate'], missing: [] });
});

test('the rules set the floor: 0 at none, TROUBLE_RULES_FROM at one, 0.9 at six, and 1 only one step past the last rule (Q96)', () => {
  expect(troubleFrom(0)).toBe(0);
  expect(troubleFrom(1)).toBe(TROUBLE_RULES_FROM);
  expect(troubleFrom(MAX_RULES)).toBeCloseTo(0.9, 12);
  expect(troubleFrom(MAX_RULES + 1)).toBe(1);
  expect(troubleFrom(MAX_RULES + 5)).toBe(1);
  // An even climb from one rule on.
  const steps = Array.from({ length: MAX_RULES }, (_, index) => troubleFrom(index + 2) - troubleFrom(index + 1));
  for (const step of steps) expect(step).toBeCloseTo((1 - TROUBLE_RULES_FROM) / MAX_RULES, 12);
  expect(troubleOf(file(MAX_RULES, 0, 0)).score).toBeCloseTo(0.9, 12);
  expect(troubleOf(file(MAX_RULES, CHURN_FULL_AT, 0)).score).toBe(1);
});

test('history shades a rule-abiding file up to the first rule, by the greater of churn and bug-fix rate, each full where its texture is', () => {
  expect(troubleOf(file(0, CHURN_FULL_AT / 2, 0)).score).toBeCloseTo(TROUBLE_RULES_FROM / 2, 12);
  expect(troubleOf(file(0, 0, BUGFIX_FULL_AT / 4)).score).toBeCloseTo(TROUBLE_RULES_FROM / 4, 12);
  expect(troubleOf(file(0, CHURN_FULL_AT / 2, BUGFIX_FULL_AT / 4)).score).toBeCloseTo(TROUBLE_RULES_FROM / 2, 12);
  // Past full, a signal is clamped: it never carries a file past the next rule's floor.
  expect(troubleOf(file(0, CHURN_FULL_AT * 9, 1)).score).toBe(TROUBLE_RULES_FROM);
  expect(troubleOf(file(2, 0, 1)).score).toBeCloseTo(troubleFrom(3), 12);
});

test('an absent churn_ratio is listed under missing and never lowers a score bugfix_rate gives (C2)', () => {
  const without = troubleOf(file(1, undefined, BUGFIX_FULL_AT / 2));
  expect(without.missing).toEqual(['churn_ratio']);
  expect(without.used).toEqual(['dents', 'bugfix_rate']);
  expect(without.score).toBe(troubleOf(file(1, 0, BUGFIX_FULL_AT / 2)).score);
  expect(without.score).toBeGreaterThan(troubleFrom(1));
  // Both absent: the rules alone, and both named.
  const bare = troubleOf(file(3));
  expect(bare).toEqual({ score: troubleFrom(3), used: ['dents'], missing: ['churn_ratio', 'bugfix_rate'] });
  expect(troubleOf(file(0)).score).toBe(0);
});

test('the score is monotone in each input', () => {
  const grid = Array.from({ length: 11 }, (_, index) => index / 10);
  for (let rules = 0; rules <= MAX_RULES; rules += 1) {
    for (const churn of grid) {
      for (const bugfix of grid) {
        const here = troubleOf(file(rules, churn * CHURN_FULL_AT, bugfix * BUGFIX_FULL_AT)).score;
        expect(here).toBeGreaterThanOrEqual(0);
        expect(here).toBeLessThanOrEqual(1);
        expect(troubleOf(file(rules, (churn + 0.1) * CHURN_FULL_AT, bugfix * BUGFIX_FULL_AT)).score).toBeGreaterThanOrEqual(here);
        expect(troubleOf(file(rules, churn * CHURN_FULL_AT, (bugfix + 0.1) * BUGFIX_FULL_AT)).score).toBeGreaterThanOrEqual(here);
        if (rules < MAX_RULES) expect(troubleOf(file(rules + 1, churn * CHURN_FULL_AT, bugfix * BUGFIX_FULL_AT)).score).toBeGreaterThanOrEqual(here);
      }
    }
  }
});

test('the score is continuous across each rule boundary: a full history meets the next rule with none', () => {
  for (let rules = 0; rules < MAX_RULES; rules += 1) {
    const below = troubleOf(file(rules, CHURN_FULL_AT, 0)).score;
    const above = troubleOf(file(rules + 1, 0, 0)).score;
    expect(below).toBeCloseTo(above, 12);
    // Just short of full sits just short of the boundary.
    expect(above - troubleOf(file(rules, CHURN_FULL_AT * 0.999, 0)).score).toBeLessThan(0.001);
  }
});

test('more dents than the spectrum has rules score as the last rule does', () => {
  expect(troubleOf({ dents: [...RULES, 'extra', 'more'] }).score).toBe(troubleOf(file(MAX_RULES)).score);
});

test('the same organelle scores the same on every call, and a moved token moves the score (C3, D156)', () => {
  const organelle = file(2, 1.3, 0.2);
  expect(troubleOf(organelle)).toEqual(troubleOf(organelle));
  const moved = troubleOf(file(1), { TROUBLE_RULES_FROM: 0.6, CHURN_FULL_AT, BUGFIX_FULL_AT });
  expect(moved.score).toBe(0.6);
});

test('TROUBLE_RULES_FROM has a row in docs/design.md', () => {
  const doc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', 'docs', 'design.md'), 'utf8');
  expect(doc).toMatch(/^\| `TROUBLE_RULES_FROM` \| `0\.4` \|/m);
  expect(TROUBLE_RULES_FROM).toBe(0.4);
});
