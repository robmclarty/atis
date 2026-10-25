import type { NoticeTier } from 'core';
import { expect, test } from 'vitest';

import { LOD_GATES } from '../lod.js';
import { createScheduler, flareAt, jiggleAt, seeded, settleAt } from '../motion.js';
import type { MotionFrame, Scheduler } from '../motion.js';
import { AT_REST } from '../shape.js';
import {
  BREATHE_AMPLITUDE,
  BREATHE_PERIOD_MS,
  FLARE_GAIN,
  FLARE_MS,
  FLY_TO_MS,
  HOVER_MS,
  JIGGLE_MS,
  LOD_FADE_MS,
  PRIMARY_FLARE_MAX_MS,
  PRIMARY_FLARE_MIN_MS,
  SECONDARY_FLARE_GAIN,
  SECONDARY_FLARE_MAX_MS,
  SECONDARY_FLARE_MIN_MS,
  SETTLE_LIFT,
  SETTLE_MS,
  SHAPE_PULSE,
  SHAPE_PULSE_HZ,
  SHAPE_TURN,
} from '../tokens.js';

const FRAME_MS = 1000 / 60;
const MINUTE_MS = 60_000;
const TIERS: readonly NoticeTier[] = ['primary', 'secondary', 'secondary', 'tertiary', 'tertiary', 'tertiary'];

/** A scheduler on a clock the test moves, loaded at time 0. */
function rig(seed = 7, reduced = false, tiers: readonly NoticeTier[] = TIERS): { readonly scheduler: Scheduler; readonly at: (ms: number) => void } {
  let now = 0;
  const scheduler = createScheduler({ clock: () => now, seed, tiers, reduced });
  scheduler.load();
  return { scheduler, at: (ms) => (now = ms) };
}

/** Every frame of a minute at sixty a second, with the time each was drawn at. */
function minute(seed = 7, reduced = false): readonly (MotionFrame & { readonly now: number })[] {
  const { scheduler, at } = rig(seed, reduced);
  return Array.from({ length: Math.round(MINUTE_MS / FRAME_MS) + 1 }, (_, frame) => {
    const now = frame * FRAME_MS;
    at(now);
    return { ...scheduler.frame(), now };
  });
}

/** When each flare on the notice at `index` began, from a minute's frames. */
function flareStarts(frames: ReturnType<typeof minute>, index: number): readonly number[] {
  return frames.filter((frame, i) => frame.flaring === index && frames[i - 1]?.flaring !== index).map((frame) => frame.now);
}

test('the skin settles in a damped drop from its lift, landing inside the settle with a small overshoot', () => {
  expect(settleAt(0)).toBe(0);
  expect(settleAt(SETTLE_MS)).toBe(1);
  const curve = Array.from({ length: SETTLE_MS }, (_, t) => settleAt(t));
  expect(Math.max(...curve)).toBeGreaterThan(1);
  expect(Math.max(...curve)).toBeLessThan(1.06);
  const frames = minute();
  expect(frames[0]?.lift).toBe(SETTLE_LIFT);
  for (const frame of frames.filter((each) => each.now >= SETTLE_MS)) {
    expect(frame.amp).toBe(1);
    expect(frame.lift).toBe(0);
  }
});

test("the primary's load flare starts halfway through the settle, rises over its first seventh and falls as the square of what remains", () => {
  const rise = FLARE_MS * 0.14;
  expect(flareAt(rise)).toBeCloseTo(1, 12);
  expect(flareAt(rise / 2)).toBeCloseTo(0.5, 12);
  expect(flareAt(rise + (FLARE_MS - rise) / 2)).toBeCloseTo(0.25, 12);
  expect(flareAt(FLARE_MS)).toBe(0);
  const frames = minute();
  expect(flareStarts(frames, 0)[0]).toBeGreaterThanOrEqual(SETTLE_MS / 2);
  expect(flareStarts(frames, 0)[0]).toBeLessThan(SETTLE_MS / 2 + FRAME_MS);
  const peak = Math.max(...frames.filter((frame) => frame.now < SETTLE_MS / 2 + FLARE_MS).map((frame) => frame.notices[0]?.gain ?? 0));
  expect(peak).toBeGreaterThan(1 + FLARE_GAIN * 0.95);
  expect(peak).toBeLessThanOrEqual(1 + FLARE_GAIN);
});

test('once settled the primary breathes, a sine of its period and amplitude, and nothing else does', () => {
  const frames = minute().filter((frame) => frame.now > SETTLE_MS + FLARE_MS && frame.flaring === undefined);
  const scales = frames.map((frame) => frame.notices[0]?.scale ?? 1);
  expect(Math.max(...scales)).toBeCloseTo(1 + BREATHE_AMPLITUDE, 3);
  expect(Math.min(...scales)).toBeCloseTo(1 - BREATHE_AMPLITUDE, 3);
  const quarter = SETTLE_MS + BREATHE_PERIOD_MS * 5.25;
  const { scheduler, at } = rig();
  at(quarter);
  // A quarter period into a breath, past any flare, the glow is at its fullest.
  const frame = scheduler.frame();
  if (frame.flaring !== 0) expect(frame.notices[0]?.scale).toBeCloseTo(1 + BREATHE_AMPLITUDE, 9);
  for (const each of frames) for (const light of each.notices.slice(1)) expect(light.scale).toBe(1);
});

test("the primary flares again every 8 to 20 s, a secondary every 40 to 90 s at half its light, and tertiaries never", () => {
  const frames = minute();
  const primary = flareStarts(frames, 0).slice(1);
  expect(primary.length).toBeGreaterThanOrEqual(2);
  [SETTLE_MS, ...primary].slice(0, -1).forEach((from, index) => {
    const gap = (primary[index] ?? 0) - from;
    expect(gap).toBeGreaterThanOrEqual(PRIMARY_FLARE_MIN_MS - FRAME_MS);
    expect(gap).toBeLessThanOrEqual(PRIMARY_FLARE_MAX_MS + FLARE_MS + FRAME_MS);
  });
  const longer = Array.from({ length: 4 }, (_, seed) => minute(seed + 1)).flatMap((run) => [1, 2].flatMap((index) => flareStarts(run, index)));
  expect(longer.length).toBeGreaterThan(0);
  for (const start of longer) expect(start).toBeGreaterThanOrEqual(SETTLE_MS + SECONDARY_FLARE_MIN_MS - FRAME_MS);
  for (const start of longer) expect(start).toBeLessThanOrEqual(SETTLE_MS + SECONDARY_FLARE_MAX_MS + FLARE_MS + FRAME_MS);
  const secondaryPeak = Math.max(...Array.from({ length: 4 }, (_, seed) => minute(seed + 1)).flatMap((run) => run.map((frame) => frame.notices[1]?.gain ?? 1)));
  expect(secondaryPeak).toBeLessThanOrEqual(1 + FLARE_GAIN * SECONDARY_FLARE_GAIN + 1e-9);
  for (const frame of frames) for (const light of frame.notices.slice(3)) expect(light).toEqual({ gain: 1, scale: 1 });
});

test('never two flares in flight: a third asked for meanwhile is dropped, the second waits its turn', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    for (const frame of minute(seed)) expect(frame.notices.filter((light) => light.gain > 1).length).toBeLessThanOrEqual(1);
  }
  const { scheduler, at } = rig();
  at(5000);
  scheduler.flare(1);
  scheduler.flare(2);
  scheduler.flare(0);
  expect(scheduler.log().slice(-3)).toEqual(['5.000s run 2', '5.000s queue 3', '5.000s drop 1']);
  at(5000 + FLARE_MS / 2);
  expect(scheduler.frame().flaring).toBe(1);
  at(5000 + FLARE_MS + FRAME_MS);
  expect(scheduler.frame().flaring).toBe(2);
  at(5000 + 2 * FLARE_MS + FRAME_MS);
  expect(scheduler.frame().flaring).toBeUndefined();
});

test('a jiggle swings the skin and is still within its transient, and never repeats on its own', () => {
  const { scheduler, at } = rig();
  at(10_000);
  scheduler.frame();
  scheduler.jiggle();
  const swing = Array.from({ length: Math.round(JIGGLE_MS / FRAME_MS) + 30 }, (_, frame) => {
    at(10_000 + frame * FRAME_MS);
    return scheduler.frame().amp - 1;
  });
  expect(Math.max(...swing.map(Math.abs))).toBeGreaterThan(0.05);
  for (const value of swing.slice(Math.ceil(JIGGLE_MS / FRAME_MS))) expect(value).toBe(0);
  expect(jiggleAt(JIGGLE_MS)).toBe(0);
});

test('a hover eases in over its time, a fly-to over at most its own, and the levels cross-fade within theirs', () => {
  const { scheduler, at } = rig();
  at(1000);
  scheduler.frame(1);
  scheduler.hover(true);
  scheduler.flyTo();
  at(1000 + HOVER_MS / 2);
  const half = scheduler.frame(1);
  expect(half.hover).toBeCloseTo(0.5, 9);
  expect(half.fly).toBeGreaterThan(0);
  at(1000 + HOVER_MS);
  expect(scheduler.frame(1).hover).toBe(1);
  at(1000 + FLY_TO_MS);
  expect(scheduler.frame(1).fly).toBe(1);
  at(1000 + FLY_TO_MS + FRAME_MS);
  expect(scheduler.frame(1).fly).toBeUndefined();
  // Zoom past LOD1's gate: its layer is in by the fade's bound, and not before half of it.
  const inside = (LOD_GATES[0]?.enter ?? 2) + 0.5;
  const start = 1000 + FLY_TO_MS + FRAME_MS;
  at(start + FRAME_MS);
  expect(scheduler.frame(inside).lod?.lod).toBe(1);
  at(start + FRAME_MS + LOD_FADE_MS / 2);
  expect(scheduler.frame(inside).lod?.opacity[1]).toBeLessThan(1);
  at(start + FRAME_MS + LOD_FADE_MS);
  expect(scheduler.frame(inside).lod?.opacity[1]).toBe(1);
});

test("the levels of detail follow the gates the world hands in each frame, so the panel's gates move them (step 44)", () => {
  const scheduler = createScheduler({ clock: () => 0, seed: 1, tiers: [], reduced: true });
  // At zoom 3 the resting gates put the camera at LOD1; gates that open LOD2 at 2.5 put it at LOD2.
  expect(scheduler.frame(3).lod?.lod).toBe(1);
  const moved = [{ enter: 1.2, exit: 1.1 }, { enter: 2.5, exit: 2.2 }, { enter: 24, exit: 20 }, { enter: 80, exit: 66 }];
  expect(scheduler.frame(3, moved).lod?.lod).toBe(2);
  expect(scheduler.frame(3, LOD_GATES).lod?.lod).toBe(1);
});

test('under reduced motion only a static halo stands for the load flare: no settle, breath, flare or jiggle, and a fly-to cuts', () => {
  const frames = minute(7, true);
  for (const frame of frames) {
    expect(frame.halo).toBe(true);
    expect(frame.amp).toBe(1);
    expect(frame.lift).toBe(0);
    expect(frame.flaring).toBeUndefined();
    for (const light of frame.notices) expect(light).toEqual({ gain: 1, scale: 1 });
  }
  const { scheduler, at } = rig(7, true);
  scheduler.flare(0);
  scheduler.jiggle();
  scheduler.flyTo();
  at(1);
  const frame = scheduler.frame();
  expect(frame.fly).toBe(1);
  expect(frame.amp).toBe(1);
  expect(scheduler.log()).toEqual([]);
  expect(scheduler.shape(6)).toEqual(AT_REST);
});

test('with motion on, the halo never shows, and a map with no primary breathes nothing', () => {
  for (const frame of minute()) expect(frame.halo).toBe(false);
  const { scheduler, at } = rig(7, false, ['secondary', 'tertiary']);
  at(SETTLE_MS + BREATHE_PERIOD_MS / 4);
  expect(scheduler.frame().notices[0]?.scale).toBe(1);
});

test('inside an opened cell a shape is still at 0 rules, and moves faster and further as the level climbs (D147)', () => {
  const { scheduler, at } = rig();
  at(3000);
  expect(scheduler.shape(0)).toEqual(AT_REST);
  const levels = [1, 2, 3, 4, 5, 6].map((rules) => scheduler.shape(rules));
  for (const motion of levels) expect(motion.t).toBeCloseTo(3, 9);
  levels.slice(1).forEach((motion, index) => {
    const before = levels[index];
    expect(motion.pulseHz).toBeGreaterThan(before?.pulseHz ?? Number.POSITIVE_INFINITY);
    expect(motion.pulse).toBeGreaterThan(before?.pulse ?? Number.POSITIVE_INFINITY);
    expect(motion.turn).toBeGreaterThan(before?.turn ?? Number.POSITIVE_INFINITY);
  });
  expect(levels.at(-1)).toEqual({ t: 3, pulseHz: SHAPE_PULSE_HZ[6], pulse: SHAPE_PULSE[6], turn: SHAPE_TURN[6] });
  expect(scheduler.shape(9)).toEqual(scheduler.shape(6));
});

test('one seed and one time give one frame, and another seed flares at other times (D94, C3)', () => {
  expect(minute(11)).toEqual(minute(11));
  expect(flareStarts(minute(11), 0)).not.toEqual(flareStarts(minute(12), 0));
  const draws = seeded(42);
  const again = seeded(42);
  const values = Array.from({ length: 100 }, () => draws());
  expect(Array.from({ length: 100 }, () => again())).toEqual(values);
  expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
});

test("a frame's flares do not depend on the frame rate: a minute drawn at 30 a second runs the same flares", () => {
  const { scheduler, at } = rig(5);
  const starts: number[] = [];
  let previous: number | undefined;
  for (let now = 0; now <= MINUTE_MS; now += 1000 / 30) {
    at(now);
    const { flaring } = scheduler.frame();
    if (flaring === 0 && previous !== 0) starts.push(now);
    previous = flaring;
  }
  const sixty = flareStarts(minute(5), 0);
  expect(starts).toHaveLength(sixty.length);
  starts.forEach((start, index) => expect(Math.abs(start - (sixty[index] ?? 0))).toBeLessThanOrEqual(1000 / 30));
});
