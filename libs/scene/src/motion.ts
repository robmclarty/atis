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
 * crosses their gates. An opened cell's slide fades in and out at the same
 * rate, and its exploded view spreads and gathers at it too (step 40). Inside
 * an opened cell each file's shape pulses and turns by the rules it breaks
 * (D147), and each file floats by how loosely its cellmates hold it (D157),
 * or on a package's slide its package (D167), slowly and on the screen's
 * scale; once the cell closes, the surface draws its files where they last
 * floated, and they ease home only as the view climbs on toward the field
 * (D165). The curves are the materials spike's, as `docs/design.md` records
 * them.
 *
 * Under reduced motion only a static halo stands for the load flare: no
 * settle, no breathing, no flares, no jiggle, still shapes, no float, and a
 * fly-to, a slide and an exploded view that cut rather than ease.
 *
 * The tokens it is timed from come in as one object, read at the moment each
 * is needed and never once at the start, so the dev panel's registry can hand
 * in live values and a change shows on the next frame (D156); left out, they
 * rest at `tokens.ts`'s values.
 */

import type { MapJson, NoticeTier } from 'core';

import { DRIFT_TOKENS, homeFloat, startFloat, stepFloat } from './drift.js';
import type { Drifted, DriftTokens, Float } from './drift.js';
import { CELL_GATE, homewardAt, lodPlan } from './lod.js';
import type { CellGate, LodGate, LodPlan } from './lod.js';
import type { Point } from './minimap.js';
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
  LOD_FADE_MS,
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

/** Every motion token the scheduler and the drift time themselves from, as one object (D156); `MOTION_TOKENS` is where they rest. */
export type MotionTokens = DriftTokens & {
  readonly SETTLE_MS: number;
  readonly SETTLE_LIFT: number;
  readonly SETTLE_DAMPING: number;
  readonly FLARE_MS: number;
  readonly FLARE_GAIN: number;
  readonly FLARE_GROW: number;
  readonly BREATHE_PERIOD_MS: number;
  readonly BREATHE_AMPLITUDE: number;
  readonly PRIMARY_FLARE_MIN_MS: number;
  readonly PRIMARY_FLARE_MAX_MS: number;
  readonly SECONDARY_FLARE_MIN_MS: number;
  readonly SECONDARY_FLARE_MAX_MS: number;
  readonly SECONDARY_FLARE_GAIN: number;
  readonly JIGGLE_MS: number;
  readonly JIGGLE_AMPLITUDE: number;
  readonly JIGGLE_HZ: number;
  readonly JIGGLE_DECAY: number;
  readonly HOVER_MS: number;
  readonly FLY_TO_MS: number;
  readonly LOD_FADE_MS: number;
  readonly SHAPE_PULSE_HZ: readonly number[];
  readonly SHAPE_PULSE: readonly number[];
  readonly SHAPE_TURN: readonly number[];
};

/** The motion tokens at rest: `tokens.ts`'s values, which the design doc's motion table logs (Q3). */
export const MOTION_TOKENS: MotionTokens = {
  ...DRIFT_TOKENS,
  SETTLE_MS,
  SETTLE_LIFT,
  SETTLE_DAMPING,
  FLARE_MS,
  FLARE_GAIN,
  FLARE_GROW,
  BREATHE_PERIOD_MS,
  BREATHE_AMPLITUDE,
  PRIMARY_FLARE_MIN_MS,
  PRIMARY_FLARE_MAX_MS,
  SECONDARY_FLARE_MIN_MS,
  SECONDARY_FLARE_MAX_MS,
  SECONDARY_FLARE_GAIN,
  JIGGLE_MS,
  JIGGLE_AMPLITUDE,
  JIGGLE_HZ,
  JIGGLE_DECAY,
  HOVER_MS,
  FLY_TO_MS,
  LOD_FADE_MS,
  SHAPE_PULSE_HZ,
  SHAPE_PULSE,
  SHAPE_TURN,
};

/** What the scheduler is told: the clock it reads, the seed its chance is drawn from, each notice's tier in rank order, whether motion is reduced, and the tokens it is timed from, resting when left out. */
export type SchedulerOptions = {
  readonly clock: () => number;
  readonly seed: number;
  readonly tiers: readonly NoticeTier[];
  readonly reduced: boolean;
  readonly tokens?: MotionTokens;
};

/** One notice's light this frame: a gain on its own light and a scale on its glow, both 1 at rest. */
export type NoticeLight = { readonly gain: number; readonly scale: number };

/**
 * The opened cell this frame: which cell its slide shows, while it is open
 * and until it has faded out; how far the slide has faded in, 0 to 1; and how
 * far its exploded view has spread, 0 to 1.
 */
export type OpenFrame = { readonly cell: string | undefined; readonly shown: number; readonly exploded: number };

/**
 * What the float is measured on this frame (D165): how many layout units the
 * free screen's shorter side spans at the camera's zoom, the share of the free
 * screen a cell's skin fills, and the cell's gate, resting when left out.
 */
export type FloatView = { readonly screen: number; readonly fill: (cell: string) => number; readonly gate?: CellGate };

/**
 * Where the float has the files this frame: the slide's cell's, where its
 * bodies stand, and every file the surface draws off its place, by path:
 * each closed cell's, where it last floated, eased home by how far the view
 * has climbed from it.
 */
export type Floated = { readonly open: readonly Drifted[]; readonly surface: ReadonlyMap<string, Point> };

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
  /** The opened cell: its slide's fade and its exploded view's spread. */
  readonly open: OpenFrame;
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
  /** The frame at the clock's time; given the camera's zoom, its levels of detail too, through the gates handed in or `LOD_GATES`. */
  readonly frame: (zoom?: number, gates?: readonly LodGate[]) => MotionFrame;
  /** How a shape breaking `rules` rules moves at the clock's time, inside an opened cell (D147). */
  readonly shape: (rules: number) => ShapeMotion;
  /** Open a cell now, or close the open one with `undefined`; its slide fades in or out from here, and its exploded view gathers. */
  readonly open: (cell: string | undefined) => void;
  /** Spread the opened cell's exploded view, or gather it; nothing while no cell is open. */
  readonly explode: (on: boolean) => void;
  /** Step the open cell's float to the clock's time, and say where every floated file stands (D157, D165); nothing moves under reduced motion. */
  readonly float: (map: MapJson, view: FloatView) => Floated;
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
export function settleAt(t: number, tokens: MotionTokens = MOTION_TOKENS): number {
  if (t >= tokens.SETTLE_MS) return 1;
  if (t <= 0) return 0;
  const zeta = tokens.SETTLE_DAMPING;
  const omega = 4 / (zeta * (tokens.SETTLE_MS / 1000));
  const s = t / 1000;
  if (zeta >= 1) return 1 - Math.exp(-omega * s) * (1 + omega * s);
  const root = Math.sqrt(1 - zeta * zeta);
  const damped = omega * root;
  return 1 - Math.exp(-zeta * omega * s) * (Math.cos(damped * s) + (zeta / root) * Math.sin(damped * s));
}

/** How far a flare rises over its first seventh before it falls away. */
const FLARE_RISE = 0.14;

/** A flare's envelope at `t` into it: a straight rise over its first seventh, then a fall as the square of what remains; nothing outside it. */
export function flareAt(t: number, tokens: MotionTokens = MOTION_TOKENS): number {
  if (t < 0 || t >= tokens.FLARE_MS) return 0;
  const rise = tokens.FLARE_MS * FLARE_RISE;
  return t < rise ? t / rise : (1 - (t - rise) / (tokens.FLARE_MS - rise)) ** 2;
}

/** The jiggle's swing at `t` into it: a sine decaying through `JIGGLE_DECAY` e-folds across `JIGGLE_MS`. */
export function jiggleAt(t: number, tokens: MotionTokens = MOTION_TOKENS): number {
  if (t < 0 || t >= tokens.JIGGLE_MS) return 0;
  return tokens.JIGGLE_AMPLITUDE * Math.exp((-t / tokens.JIGGLE_MS) * tokens.JIGGLE_DECAY) * Math.sin((2 * Math.PI * tokens.JIGGLE_HZ * t) / 1000);
}

/** A fly-to's ease: slow out, slow in. */
function easeInOut(progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  return p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2;
}

type Flare = { readonly index: number; readonly start: number; readonly gain: number };

/** The most of a jump in the clock the float steps through, as when the tab was hidden: it floats on from there rather than racing to catch up. */
const FLOAT_CATCH_UP_MS = 1000;

/** The scheduler, over its clock and its seed. */
export function createScheduler({ clock, seed, tiers, reduced, tokens: T = MOTION_TOKENS }: SchedulerOptions): Scheduler {
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
  let opened: string | undefined;
  let openedAt = 0;
  // The slide: the cell it shows until it has faded out, and how far it has faded in.
  let shownCell: string | undefined;
  let shown = 0;
  let exploded = 0;
  let explodeTarget = 0;
  // The open cell's float and the clock reading its time counts from, laid once the world first asks for it; and each closed cell's, held where it last floated.
  let floating: { readonly float: Float; readonly from: number } | undefined;
  const resting = new Map<string, Float>();

  /** A value eased toward its target at a fixed rate: a cross-fade from anywhere takes at most `LOD_FADE_MS`. */
  const approach = (value: number, target: number, elapsed: number): number => {
    if (reduced || T.LOD_FADE_MS <= 0) return target;
    const step = elapsed / T.LOD_FADE_MS;
    return value < target ? Math.min(target, value + step) : Math.max(target, value - step);
  };

  const stamp = (now: number, what: string, index: number): void => {
    log.push(`${(now / 1000).toFixed(3)}s ${what} ${String(index + 1)}`);
  };

  /** Draw the next due time for a notice that flares at random, from `from`. */
  const schedule = (index: number, from: number): void => {
    const tier = tiers[index];
    if (tier === 'primary') due.set(index, from + T.PRIMARY_FLARE_MIN_MS + chance() * (T.PRIMARY_FLARE_MAX_MS - T.PRIMARY_FLARE_MIN_MS));
    else if (tier === 'secondary') due.set(index, from + T.SECONDARY_FLARE_MIN_MS + chance() * (T.SECONDARY_FLARE_MAX_MS - T.SECONDARY_FLARE_MIN_MS));
  };

  const request = (index: number, now: number): void => {
    const flare = { index, start: now, gain: tiers[index] === 'primary' ? 1 : T.SECONDARY_FLARE_GAIN };
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
      inFlight = { index: primary, start: now + T.SETTLE_MS / 2, gain: 1 };
      stamp(now + T.SETTLE_MS / 2, 'run', primary);
    }
    tiers.forEach((_, index) => schedule(index, now + T.SETTLE_MS));
  };

  /** The flare in flight ends, and the queued one, if any, starts where it ended. */
  const retire = (now: number): void => {
    while (inFlight !== undefined && now - inFlight.start >= T.FLARE_MS) {
      const ended = inFlight.start + T.FLARE_MS;
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

  const frame = (zoom?: number, gates?: readonly LodGate[]): MotionFrame => {
    const now = clock();
    const elapsed = lastFrame === undefined ? 0 : now - lastFrame;
    lastFrame = now;
    const since = loadAt === undefined ? 0 : now - loadAt;

    hoverValue = T.HOVER_MS <= 0 ? hoverTarget : hoverValue < hoverTarget ? Math.min(hoverTarget, hoverValue + elapsed / T.HOVER_MS) : Math.max(hoverTarget, hoverValue - elapsed / T.HOVER_MS);
    const flying = flyStart === undefined ? undefined : reduced ? 1 : easeInOut((now - flyStart) / T.FLY_TO_MS);
    if (flyStart !== undefined && (reduced || now - flyStart >= T.FLY_TO_MS)) flyStart = undefined;
    lod = zoom === undefined ? lod : lodPlan(lod, zoom, elapsed, T.LOD_FADE_MS, gates);
    shown = approach(shown, opened === undefined ? 0 : 1, elapsed);
    exploded = approach(exploded, explodeTarget, elapsed);
    if (shown === 0 && opened === undefined) shownCell = undefined;
    const open: OpenFrame = { cell: shownCell, shown, exploded };
    const shared = { t: since, hover: hoverValue, fly: flying, open, ...(lod === undefined || zoom === undefined ? {} : { lod }) };

    if (reduced || loadAt === undefined) {
      return { ...shared, amp: 1, lift: 0, notices: tiers.map(() => ({ gain: 1, scale: 1 })), flaring: undefined, halo: reduced && tiers.includes('primary') };
    }

    advanceFlares(now);
    const settled = settleAt(since, T);
    const swing = jiggleStart === undefined ? 0 : jiggleAt(now - jiggleStart, T);
    if (jiggleStart !== undefined && now - jiggleStart >= T.JIGGLE_MS) jiggleStart = undefined;
    const primary = tiers.indexOf('primary');
    const notices = tiers.map((_, index): NoticeLight => {
      const breath = index === primary && since > T.SETTLE_MS ? 1 + T.BREATHE_AMPLITUDE * Math.sin((2 * Math.PI * (since - T.SETTLE_MS)) / T.BREATHE_PERIOD_MS) : 1;
      const burst = inFlight?.index === index ? inFlight.gain * flareAt(now - inFlight.start, T) : 0;
      return { gain: 1 + T.FLARE_GAIN * burst, scale: breath * (1 + T.FLARE_GROW * burst) };
    });
    const flaring = inFlight !== undefined && now >= inFlight.start ? inFlight.index : undefined;
    return { ...shared, amp: settled + swing, lift: (1 - settled) * T.SETTLE_LIFT, notices, flaring, halo: false };
  };

  const shape = (rules: number): ShapeMotion => {
    const level = Math.max(0, Math.min(MAX_RULES, Math.round(rules)));
    if (reduced || level === 0) return AT_REST;
    const t = (clock() - (loadAt ?? clock())) / 1000;
    return { t, pulseHz: T.SHAPE_PULSE_HZ[level] ?? 0, pulse: T.SHAPE_PULSE[level] ?? 0, turn: T.SHAPE_TURN[level] ?? 0 };
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
    open: (cell) => {
      if (cell !== undefined && opened === cell) return;
      // The cell that was open keeps its files where they last floated.
      if (floating !== undefined) resting.set(floating.float.cell, floating.float);
      floating = undefined;
      if (cell === undefined) opened = undefined;
      else {
        // Another cell opens over the slide: it fades in from nothing. The same one opened again as it fades out fades back in from there.
        if (shownCell !== cell) shown = 0;
        opened = cell;
        openedAt = clock();
        shownCell = cell;
      }
      explodeTarget = 0;
      exploded = 0;
    },
    explode: (on) => {
      explodeTarget = opened !== undefined && on ? 1 : 0;
    },
    float: (map, view) => {
      if (reduced) return { open: [], surface: new Map() };
      const now = clock();
      const gate = view.gate ?? CELL_GATE;
      if (opened !== undefined && floating?.float.cell !== opened) {
        // A cell opened again floats on from where the surface draws its files; any other floats out from rest.
        const held = resting.get(opened);
        resting.delete(opened);
        const float = held === undefined ? startFloat(map, opened) : homeFloat(map, held, homewardAt(view.fill(opened), gate));
        // Its clock runs from the moment the cell opened, on from where a held float's stood.
        floating = { float, from: openedAt - float.t };
      }
      if (floating !== undefined) {
        const from = Math.max(floating.from, now - floating.float.t - FLOAT_CATCH_UP_MS);
        floating = { float: stepFloat(map, floating.float, now - from, { seed, screen: view.screen, tokens: T }), from };
      }
      const surface = new Map<string, Point>();
      const positions = map.terrain.layout?.positions ?? {};
      let fading: readonly Drifted[] = [];
      for (const [cell, held] of resting) {
        const eased = homeFloat(map, held, homewardAt(view.fill(cell), gate));
        if (cell === shownCell) fading = eased.files;
        const away = eased.files.filter((file) => file.x !== positions[file.id]?.x || file.y !== positions[file.id]?.y);
        // Home at last, or never away: the cell's files are where the layout put them, and the surface draws them there.
        if (away.length === 0 && cell !== shownCell) resting.delete(cell);
        for (const file of away) surface.set(file.id, [file.x, file.y]);
      }
      return { open: floating?.float.files ?? fading, surface };
    },
    log: () => [...log],
  };
}
