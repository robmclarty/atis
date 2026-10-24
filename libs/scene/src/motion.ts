/**
 * motion: the one scheduler that owns every animation in the world (§5.5,
 * C12). Nothing moves outside it. It reads time only from the clock it is
 * handed and draws chance only from a source seeded by the seed it is handed,
 * so one seed and one sequence of clock readings give one sequence of frames:
 * random to a reader, reproducible to a test and to `--png` (D94, C3).
 *
 * On load the skin settles onto the terrain, a damped drop; halfway through,
 * the primary notice flares, a burst that rises over its first seventh and
 * falls away as the square of what remains; once settled the primary
 * breathes, a sine, and every notice's random flares start their clocks, the
 * primary's every 8 to 20 s and a secondary's every 40 to 90 s at half its
 * light. At most one flare is ever in flight: one that comes due meanwhile
 * waits in a queue one deep, and any after it is dropped. A jiggle swings the
 * skin when the camera lands on a cell; a hover eases a highlight in; a
 * fly-to eases the camera across; the levels of detail cross-fade as the zoom
 * crosses their gates. Inside an opened cell each file's shape pulses and
 * turns by the rules it breaks (D147). The curves are the materials spike's,
 * as `docs/design.md` records them.
 *
 * Under reduced motion only a static halo stands for the load flare: no
 * settle, no breathing, no flares, no jiggle, still shapes, and a fly-to that
 * cuts rather than eases.
 */

import type { NoticeTier } from 'core';

import { lodPlan } from './lod.js';
import type { LodPlan } from './lod.js';
import { AT_REST, MAX_RULES } from './shape.js';
import type { ShapeMotion } from './shape.js';
import {
  BREATHE_AMPLITUDE,
  BREATHE_PERIOD_MS,
  FLARE_GAIN,
  FLARE_GROW,
  FLARE_MS,
  FLY_TO_MS,
  HOVER_MS,
  JIGGLE_AMPLITUDE,
  JIGGLE_DECAY,
  JIGGLE_HZ,
  JIGGLE_MS,
  PRIMARY_FLARE_MAX_MS,
  PRIMARY_FLARE_MIN_MS,
  SECONDARY_FLARE_GAIN,
  SECONDARY_FLARE_MAX_MS,
  SECONDARY_FLARE_MIN_MS,
  SETTLE_DAMPING,
  SETTLE_LIFT,
  SETTLE_MS,
  SHAPE_PULSE,
  SHAPE_PULSE_HZ,
  SHAPE_TURN,
} from './tokens.js';

/** What the scheduler is told: the clock it reads, the seed its chance is drawn from, each notice's tier in rank order, and whether motion is reduced. */
export type SchedulerOptions = {
  readonly clock: () => number;
  readonly seed: number;
  readonly tiers: readonly NoticeTier[];
  readonly reduced: boolean;
};

/** One notice's light this frame: a gain on its own light and a scale on its glow, both 1 at rest. */
export type NoticeLight = { readonly gain: number; readonly scale: number };

/** Everything the world moves this frame. */
export type MotionFrame = {
  /** Milliseconds since load. */
  readonly t: number;
  /** The skin's relief as a share of its rest, 0 before it settles, swinging about 1 in a jiggle. */
  readonly amp: number;
  /** How far above the terrain the skin still hangs, in the heightfield's units. */
  readonly lift: number;
  /** Each notice's light, in rank order. */
  readonly notices: readonly NoticeLight[];
  /** The rank's index in flight, if a flare is. */
  readonly flaring: number | undefined;
  /** Under reduced motion, the static halo that stands for the primary's load flare. */
  readonly halo: boolean;
  /** The hover's highlight, eased from 0 to 1. */
  readonly hover: number;
  /** A fly-to's progress, eased from 0 to 1, while one is under way. */
  readonly fly: number | undefined;
  /** The levels of detail, when the frame was given the zoom. */
  readonly lod?: LodPlan;
};

export type Scheduler = {
  /** Start the load: the settle, the primary's load flare, and the random flares' clocks. */
  readonly load: () => void;
  /** Ask for a flare on the notice at this index, in flight if none is, else queued, else dropped. */
  readonly flare: (index: number) => void;
  /** Swing the skin once, as when the camera lands on a cell. */
  readonly jiggle: () => void;
  /** Ease the hover's highlight in, or out. */
  readonly hover: (on: boolean) => void;
  /** Start a fly-to. */
  readonly flyTo: () => void;
  /** The frame at the clock's time; given the camera's zoom, its levels of detail too. */
  readonly frame: (zoom?: number) => MotionFrame;
  /** How a shape breaking `rules` rules moves at the clock's time, inside an opened cell (D147). */
  readonly shape: (rules: number) => ShapeMotion;
  /** What happened to every flare asked for, in order: run, queued or dropped, with the time and the rank. */
  readonly log: () => readonly string[];
};

/** A seeded source of chance in [0, 1), mulberry32, from integer mixing alone so every engine draws the same. */
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d_2b_79_f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** The settle: an underdamped spring from 0 to 1 that lands inside `SETTLE_MS`, with a small overshoot rather than a bounce. */
export function settleAt(t: number): number {
  if (t >= SETTLE_MS) return 1;
  if (t <= 0) return 0;
  const zeta = SETTLE_DAMPING;
  const omega = 4 / (zeta * (SETTLE_MS / 1000));
  const s = t / 1000;
  if (zeta >= 1) return 1 - Math.exp(-omega * s) * (1 + omega * s);
  const root = Math.sqrt(1 - zeta * zeta);
  const damped = omega * root;
  return 1 - Math.exp(-zeta * omega * s) * (Math.cos(damped * s) + (zeta / root) * Math.sin(damped * s));
}

/** How far a flare rises over its first seventh before it falls away. */
const FLARE_RISE = 0.14;

/** A flare's envelope at `t` into it: a straight rise over its first seventh, then a fall as the square of what remains; nothing outside it. */
export function flareAt(t: number): number {
  if (t < 0 || t >= FLARE_MS) return 0;
  const rise = FLARE_MS * FLARE_RISE;
  return t < rise ? t / rise : (1 - (t - rise) / (FLARE_MS - rise)) ** 2;
}

/** The jiggle's swing at `t` into it: a sine decaying through `JIGGLE_DECAY` e-folds across `JIGGLE_MS`. */
export function jiggleAt(t: number): number {
  if (t < 0 || t >= JIGGLE_MS) return 0;
  return JIGGLE_AMPLITUDE * Math.exp((-t / JIGGLE_MS) * JIGGLE_DECAY) * Math.sin((2 * Math.PI * JIGGLE_HZ * t) / 1000);
}

/** A fly-to's ease: slow out, slow in. */
function easeInOut(progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  return p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2;
}

type Flare = { readonly index: number; readonly start: number; readonly gain: number };

/** The scheduler, over its clock and its seed. */
export function createScheduler({ clock, seed, tiers, reduced }: SchedulerOptions): Scheduler {
  const chance = seeded(seed);
  const log: string[] = [];
  const due = new Map<number, number>();
  let loadAt: number | undefined;
  let inFlight: Flare | undefined;
  let queued: Flare | undefined;
  let jiggleStart: number | undefined;
  let hoverTarget = 0;
  let hoverValue = 0;
  let flyStart: number | undefined;
  let lastFrame: number | undefined;
  let lod: LodPlan | undefined;

  const stamp = (now: number, what: string, index: number): void => {
    log.push(`${(now / 1000).toFixed(3)}s ${what} ${String(index + 1)}`);
  };

  /** Draw the next due time for a notice that flares at random, from `from`. */
  const schedule = (index: number, from: number): void => {
    const tier = tiers[index];
    if (tier === 'primary') due.set(index, from + PRIMARY_FLARE_MIN_MS + chance() * (PRIMARY_FLARE_MAX_MS - PRIMARY_FLARE_MIN_MS));
    else if (tier === 'secondary') due.set(index, from + SECONDARY_FLARE_MIN_MS + chance() * (SECONDARY_FLARE_MAX_MS - SECONDARY_FLARE_MIN_MS));
  };

  const request = (index: number, now: number): void => {
    const flare = { index, start: now, gain: tiers[index] === 'primary' ? 1 : SECONDARY_FLARE_GAIN };
    if (inFlight === undefined) {
      inFlight = flare;
      stamp(now, 'run', index);
    } else if (queued === undefined) {
      queued = flare;
      stamp(now, 'queue', index);
    } else stamp(now, 'drop', index);
  };

  const load = (): void => {
    const now = clock();
    loadAt = now;
    inFlight = undefined;
    queued = undefined;
    due.clear();
    if (reduced) return;
    const primary = tiers.indexOf('primary');
    if (primary >= 0) {
      inFlight = { index: primary, start: now + SETTLE_MS / 2, gain: 1 };
      stamp(now + SETTLE_MS / 2, 'run', primary);
    }
    tiers.forEach((_, index) => schedule(index, now + SETTLE_MS));
  };

  /** The flare in flight ends, and the queued one, if any, starts where it ended. */
  const retire = (now: number): void => {
    while (inFlight !== undefined && now - inFlight.start >= FLARE_MS) {
      const ended = inFlight.start + FLARE_MS;
      inFlight = queued === undefined ? undefined : { ...queued, start: Math.max(queued.start, ended) };
      queued = undefined;
    }
  };

  /** Every random flare due by `now`, in the order they fell due, each retiring what ended before it asks. */
  const advanceFlares = (now: number): void => {
    for (;;) {
      const next = [...due].filter(([, at]) => at <= now).toSorted(([a, at], [b, bt]) => at - bt || a - b)[0];
      if (next === undefined) break;
      const [index, at] = next;
      retire(at);
      request(index, at);
      schedule(index, at);
    }
    retire(now);
  };

  const frame = (zoom?: number): MotionFrame => {
    const now = clock();
    const elapsed = lastFrame === undefined ? 0 : now - lastFrame;
    lastFrame = now;
    const since = loadAt === undefined ? 0 : now - loadAt;

    hoverValue = HOVER_MS <= 0 ? hoverTarget : hoverValue < hoverTarget ? Math.min(hoverTarget, hoverValue + elapsed / HOVER_MS) : Math.max(hoverTarget, hoverValue - elapsed / HOVER_MS);
    const flying = flyStart === undefined ? undefined : reduced ? 1 : easeInOut((now - flyStart) / FLY_TO_MS);
    if (flyStart !== undefined && (reduced || now - flyStart >= FLY_TO_MS)) flyStart = undefined;
    lod = zoom === undefined ? lod : lodPlan(lod, zoom, elapsed);
    const shared = { t: since, hover: hoverValue, fly: flying, ...(lod === undefined || zoom === undefined ? {} : { lod }) };

    if (reduced || loadAt === undefined) {
      return { ...shared, amp: 1, lift: 0, notices: tiers.map(() => ({ gain: 1, scale: 1 })), flaring: undefined, halo: reduced && tiers.includes('primary') };
    }

    advanceFlares(now);
    const settled = settleAt(since);
    const swing = jiggleStart === undefined ? 0 : jiggleAt(now - jiggleStart);
    if (jiggleStart !== undefined && now - jiggleStart >= JIGGLE_MS) jiggleStart = undefined;
    const primary = tiers.indexOf('primary');
    const notices = tiers.map((_, index): NoticeLight => {
      const breath = index === primary && since > SETTLE_MS ? 1 + BREATHE_AMPLITUDE * Math.sin((2 * Math.PI * (since - SETTLE_MS)) / BREATHE_PERIOD_MS) : 1;
      const burst = inFlight?.index === index ? inFlight.gain * flareAt(now - inFlight.start) : 0;
      return { gain: 1 + FLARE_GAIN * burst, scale: breath * (1 + FLARE_GROW * burst) };
    });
    const flaring = inFlight !== undefined && now >= inFlight.start ? inFlight.index : undefined;
    return { ...shared, amp: settled + swing, lift: (1 - settled) * SETTLE_LIFT, notices, flaring, halo: false };
  };

  const shape = (rules: number): ShapeMotion => {
    const level = Math.max(0, Math.min(MAX_RULES, Math.round(rules)));
    if (reduced || level === 0) return AT_REST;
    const t = (clock() - (loadAt ?? clock())) / 1000;
    return { t, pulseHz: SHAPE_PULSE_HZ[level] ?? 0, pulse: SHAPE_PULSE[level] ?? 0, turn: SHAPE_TURN[level] ?? 0 };
  };

  return {
    load,
    flare: (index) => {
      if (reduced || loadAt === undefined) return;
      const now = clock();
      // Catch up first: whatever fell due or ended since the last frame comes before this ask.
      advanceFlares(now);
      request(index, now);
    },
    jiggle: () => {
      if (!reduced) jiggleStart = clock();
    },
    hover: (on) => {
      hoverTarget = on ? 1 : 0;
    },
    flyTo: () => {
      flyStart = clock();
    },
    frame,
    shape,
    log: () => [...log],
  };
}
