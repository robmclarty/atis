import { expect, test } from 'vitest';

import type { Lod } from '../labels.js';
import { CELL_GATE, LOD_GATES, fillOf, homewardAt, levelAt, lodPlan } from '../lod.js';
import type { LodPlan } from '../lod.js';
import { LOD_FADE_MS } from '../tokens.js';

/** A frame every sixtieth of a second. */
const FRAME_MS = 1000 / 60;

/** Run a plan over a list of zooms, one frame apart, from a plan at rest at the first. */
function run(zooms: readonly number[], frameMs = FRAME_MS): readonly LodPlan[] {
  const plans: LodPlan[] = [];
  let plan: LodPlan | undefined;
  for (const zoom of zooms) {
    plan = lodPlan(plan, zoom, frameMs);
    plans.push(plan);
  }
  return plans;
}

test('each gate is left lower than it is entered, and the gates climb in order', () => {
  expect(LOD_GATES).toHaveLength(4);
  LOD_GATES.forEach((gate, index) => {
    expect(gate.exit, `LOD${String(index + 1)}`).toBeLessThan(gate.enter);
    if (index > 0) expect(gate.exit).toBeGreaterThan(LOD_GATES[index - 1]?.enter ?? Number.POSITIVE_INFINITY);
  });
});

test('the opening frame is the far field, and the level climbs only past each entry and falls only under each exit', () => {
  const [lod1, lod2] = LOD_GATES;
  if (lod1 === undefined || lod2 === undefined) throw new Error('four gates');
  expect(levelAt(0, 1)).toBe(0);
  expect(levelAt(0, lod1.enter - 0.01)).toBe(0);
  expect(levelAt(0, lod1.enter + 0.01)).toBe(1);
  // Between the two thresholds the level is whatever it was.
  const between = (lod1.enter + lod1.exit) / 2;
  expect(levelAt(0, between)).toBe(0);
  expect(levelAt(1, between)).toBe(1);
  expect(levelAt(1, lod1.exit - 0.01)).toBe(0);
  expect(levelAt(1, lod2.enter + 0.01)).toBe(2);
});

test('a zoom that jitters across a threshold never flips the level', () => {
  const [lod1] = LOD_GATES;
  if (lod1 === undefined) throw new Error('four gates');
  // Four seconds of a zoom shaking by a hair either side of each threshold: the level changes once at most, and never comes back.
  for (const edge of [lod1.enter, lod1.exit]) {
    const jitter = Array.from({ length: 240 }, (_, frame) => edge + (frame % 2 === 0 ? 0.02 : -0.02));
    const levels = run([lod1.enter + 0.1, ...jitter]).map((plan) => plan.lod);
    const changes = levels.slice(1).filter((level, index) => level !== levels[index]).length;
    expect(changes, `jittering about ${String(edge)}`).toBeLessThanOrEqual(1);
  }
});

test('a jump in zoom passes every gate between, in or out', () => {
  expect(levelAt(0, 30)).toBe(3);
  expect(levelAt(0, 500)).toBe(4);
  expect(levelAt(4, 1)).toBe(0);
});

test('the first plan stands at rest, every layer up to its level shown and none past it', () => {
  expect(lodPlan(undefined, 1, 0)).toEqual({ lod: 0, opacity: [1, 0, 0, 0, 0] });
  expect(lodPlan(undefined, 8, 0)).toEqual({ lod: 2, opacity: [1, 1, 1, 0, 0] });
});

test('a cross-fade takes no longer than its bound, from any opacity, and moves no faster than its rate', () => {
  const frames = Math.ceil(LOD_FADE_MS / FRAME_MS);
  // Zoom in through LOD1 and LOD2 in one frame: both layers fade in together, and are done within the bound.
  const plans = run([1, ...Array.from({ length: frames + 1 }, () => 8)]);
  expect(plans[1]?.lod).toBe(2);
  expect(plans.at(-1)?.opacity).toEqual([1, 1, 1, 0, 0]);
  plans.slice(1).forEach((plan, index) => {
    const before = plans[index];
    plan.opacity.forEach((value, level) => {
      expect(Math.abs(value - (before?.opacity[level] ?? 0))).toBeLessThanOrEqual(FRAME_MS / LOD_FADE_MS + 1e-12);
    });
  });
  const inBound = plans.findIndex((plan) => plan.opacity[2] === 1);
  expect(inBound * FRAME_MS).toBeLessThanOrEqual(LOD_FADE_MS + FRAME_MS);
});

test('a level that turns back mid-fade fades back from where it was, again within the bound', () => {
  const lod2 = LOD_GATES[1];
  if (lod2 === undefined) throw new Error('four gates');
  let plan = lodPlan(undefined, 2, 0);
  plan = lodPlan(plan, lod2.enter + 1, LOD_FADE_MS / 2);
  expect(plan.opacity[2]).toBeCloseTo(0.5, 9);
  plan = lodPlan(plan, lod2.exit - 1, 1);
  expect(plan.lod).toBe(1);
  expect(plan.opacity[2]).toBeLessThan(0.5);
  plan = lodPlan(plan, lod2.exit - 1, LOD_FADE_MS);
  expect(plan.opacity).toEqual([1, 1, 0, 0, 0]);
});

test('a long frame or no fade at all lands the layers at once, never past their targets', () => {
  const start = lodPlan(undefined, 1, 0);
  expect(lodPlan(start, 30, 10 * LOD_FADE_MS).opacity).toEqual([1, 1, 1, 1, 0]);
  expect(lodPlan(start, 30, 1, 0).opacity).toEqual([1, 1, 1, 1, 0]);
  expect(lodPlan(start, 30, -5).opacity).toEqual(start.opacity);
});

test('one zoom path and one clock give one plan (C3, D94)', () => {
  const path = [1, 1.2, 1.8, 3, 7, 6.5, 4.9, 1.3];
  expect(run(path)).toEqual(run(path));
  const levels: readonly Lod[] = run(path).map((plan) => plan.lod);
  expect(levels).toEqual([0, 0, 1, 1, 2, 2, 1, 0]);
});

test("a cell's gate opens it filling most of the free screen, holds it a little smaller, and brings its files home smaller still (D165)", () => {
  expect(CELL_GATE.open).toBeLessThanOrEqual(1);
  expect(CELL_GATE.close).toBeLessThan(CELL_GATE.open);
  expect(CELL_GATE.home).toBeLessThan(CELL_GATE.close);
  expect(CELL_GATE.home).toBeGreaterThan(0);
});

test('a stretch of ground fills the free screen in whichever of its width and height fills it first', () => {
  const screen = { width: 800, height: 600, pixelsPerUnit: 2 };
  expect(fillOf({ width: 200, height: 100 }, screen)).toBe(0.5);
  expect(fillOf({ width: 100, height: 240 }, screen)).toBe(0.8);
  expect(fillOf({ width: 100, height: 240 }, { ...screen, pixelsPerUnit: 4 })).toBe(1.6);
});

test("a closed cell's files stay where they floated while it fills the share it closes under or more, and come home eased as it shrinks to its home", () => {
  expect(homewardAt(1)).toBe(0);
  expect(homewardAt(CELL_GATE.close)).toBe(0);
  expect(homewardAt((CELL_GATE.close + CELL_GATE.home) / 2)).toBeCloseTo(0.5, 9);
  expect(homewardAt(CELL_GATE.home)).toBe(1);
  expect(homewardAt(0)).toBe(1);
  // Eased: it leaves and reaches home slowly.
  const step = (CELL_GATE.close - CELL_GATE.home) / 100;
  expect(homewardAt(CELL_GATE.close - step)).toBeLessThan(0.001);
  expect(1 - homewardAt(CELL_GATE.home + step)).toBeLessThan(0.001);
  // A gate with no span between its close and its home brings them home as it closes.
  expect(homewardAt(0.3, { open: 0.6, close: 0.4, home: 0.4 })).toBe(1);
  expect(homewardAt(0.5, { open: 0.6, close: 0.4, home: 0.4 })).toBe(0);
});
