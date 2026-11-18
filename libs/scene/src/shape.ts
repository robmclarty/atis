/**
 * shape: a file's outline, a point on one continuous spectrum (§5.1, D194).
 * One function draws it for both renderers: the SVG still, at rest (C10), and
 * the world inside an opened cell, moved by the scheduler at any time
 * (D147). The spectrum's seven samples are `SHAPE_LEVELS`, the forms the
 * materials spike settled; a score in [0, 1] lands between two of them and
 * the outline is the morph of that pair. Within a form, the arms' phase and
 * lengths are seeded by the file's path, so one file is one shape on every
 * render and two files at one score differ (C3).
 */

import type { Position } from 'core';

import { SHAPE_ARM_SPREAD, SHAPE_CORE_GIVE, SHAPE_LEVELS } from './tokens.js';

/**
 * How the shape moves: the time in seconds, how fast and how far its arms
 * pulse, how fast it turns, and how far each arm's beat wanders off the
 * pulse, in radians (`jitter`). Still unless the scheduler says otherwise.
 */
export type ShapeMotion = { readonly t: number; readonly pulseHz: number; readonly pulse: number; readonly turn: number; readonly jitter: number };

/** No motion: the outline the SVG draws, and the world's under reduced motion. */
export const AT_REST: ShapeMotion = { t: 0, pulseHz: 0, pulse: 0, turn: 0, jitter: 0 };

/** A bulb at an arm's tip. */
export type Bulb = { readonly x: number; readonly y: number; readonly r: number };

/**
 * The outline as points round the file, its bulbs, its core, the radius
 * inside which nothing protrudes, and its extent, the radius no point of the
 * ring lies outside: the body's swell and its longest arm together. `level`
 * is where its score lands among the forms, 0 to `MAX_RULES`, whole at a form
 * and fractional between two.
 */
export type Outline = {
  readonly level: number;
  readonly ring: readonly (readonly [number, number])[];
  readonly bulbs: readonly Bulb[];
  readonly core: number;
  readonly extent: number;
};

/** The highest level a file can reach: fallow's four thresholds, a boundary violation and a cycle. */
export const MAX_RULES = SHAPE_LEVELS.length - 1;

/** The level a file's breached rules put it at, 0 to `MAX_RULES`. */
export function rulesOf(dents: readonly string[]): number {
  return Math.min(dents.length, MAX_RULES);
}

/** A path's seed: FNV-1a over its UTF-16 code units. */
export function seedOf(id: string): number {
  let hash = 2_166_136_261;
  for (let i = 0; i < id.length; i += 1) hash = Math.imul(hash ^ id.charCodeAt(i), 16_777_619);
  return hash >>> 0;
}

/** The `i`th draw from a seed, in [0, 1), from integer mixing alone so every engine draws the same. */
export function draw(seed: number, i: number): number {
  let t = (seed + Math.imul(i + 1, 0x9e_37_79_b9)) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
}

/** Draws reserved for the shape's own phases, clear of the arms' indices. */
const TURN_DRAW = 99;
const WOBBLE_DRAW = 98;
const BEAT_DRAW = 50;
const JITTER_RATE_DRAW = 110;
const JITTER_PHASE_DRAW = 130;

/** How fast an arm's beat wanders, in Hz: each arm draws its own rate between the two, a wander of 5 to 20 s, far slower than any pulse. */
const JITTER_HZ_MIN = 0.05;
const JITTER_HZ_MAX = 0.2;

/** How near a whole level a score must land to be drawn as that form alone. */
const FORM_SNAP = 1e-9;

/** The wobble drifts this many times faster than the body turns, so a turning shape never reads as a rigid wheel. */
const WOBBLE_DRIFT = 3;

type Form = (typeof SHAPE_LEVELS)[number];

/** One of the two forms a score lands between, as the morph draws it: its arms, and how far in they have faded, 0 to 1. */
type Faded = { readonly form: Form; readonly weight: number; readonly strength: number };

/**
 * The outline of the file `id`, placed at `at`, at `score` on the spectrum,
 * 0 smooth to 1 spiky, as `motion` has it. The score lands at
 * `score × MAX_RULES` among the forms: how far the arms reach, how narrow
 * they are, the body's wobble, the bulbs' size and the points the ring is
 * drawn through all run linearly between the form below and the form above.
 *
 * The two forms' arms cross-fade. The lower form's arms hold their length
 * through the first half of the way while the upper's grow in beside them,
 * then fade out through the second half, and the outline is whichever of
 * the two stands further out at each angle. Held that way, the furthest
 * point never draws back as the score climbs, which a plain blend of the
 * two would let it do halfway, where both sets of arms are half length. The
 * bulbs fade with the fraction: the lower form's out, the upper's in.
 *
 * Arms reach out from a core a little smaller than the radius, each a raised
 * cosine round its spoke, longer or shorter by its seed and pulsing with its
 * own beat; the body turns as a whole. Each arm's beat wanders by up to the
 * motion's `jitter` either way, on a slow sine whose rate and phase are the
 * arm's own by its seed, so a jittered shape's arms drift in and out of step
 * and its pulse never settles into one rhythm (D194). At a whole level the
 * outline is that form alone.
 */
export function outlineOf(id: string, at: Position, score: number, motion: ShapeMotion = AT_REST): Outline {
  const landed = (Number.isFinite(score) ? Math.max(0, Math.min(1, score)) : 0) * MAX_RULES;
  // A score that is a form's own, give or take the arithmetic that made it, is that form alone.
  const level = Math.abs(landed - Math.round(landed)) < FORM_SNAP ? Math.round(landed) : landed;
  const low = Math.min(MAX_RULES, Math.floor(level));
  const fraction = level - low;
  const lower = SHAPE_LEVELS[low] ?? SHAPE_LEVELS[0];
  if (lower === undefined) throw new Error('SHAPE_LEVELS is empty');
  const upper = SHAPE_LEVELS[low + 1] ?? lower;
  const mix = (pick: (form: Form) => number): number => pick(lower) + (pick(upper) - pick(lower)) * fraction;
  const reach = mix((form) => form.reach);
  const sharp = mix((form) => form.sharp);
  const wobble = mix((form) => form.wobble);
  const samples = Math.max(3, Math.round(mix((form) => form.samples)));

  const seed = seedOf(id);
  const core = at.r * (1 - SHAPE_CORE_GIVE * reach);
  const phase = draw(seed, TURN_DRAW) * 2 * Math.PI + motion.turn * motion.t;
  const wobblePhase = draw(seed, WOBBLE_DRAW) * 2 * Math.PI + WOBBLE_DRIFT * motion.turn * motion.t;
  // Both forms read one run of seeded arms, so an arm keeps its length and its beat as the forms change round it.
  const arms = Array.from({ length: Math.max(lower.arms, upper.arms) }, (_, arm) => {
    const size = 1 + SHAPE_ARM_SPREAD * (2 * draw(seed, arm) - 1);
    const beat = draw(seed, BEAT_DRAW + arm) * 2 * Math.PI;
    const wanderHz = JITTER_HZ_MIN + (JITTER_HZ_MAX - JITTER_HZ_MIN) * draw(seed, JITTER_RATE_DRAW + arm);
    const wander = motion.jitter * Math.sin(2 * Math.PI * wanderHz * motion.t + draw(seed, JITTER_PHASE_DRAW + arm) * 2 * Math.PI);
    return size * (1 + motion.pulse * Math.sin(2 * Math.PI * motion.pulseHz * motion.t + beat + wander));
  });
  const faded: readonly Faded[] = [
    { form: lower, weight: Math.min(1, 2 * (1 - fraction)), strength: 1 - fraction },
    ...(fraction > 0 ? [{ form: upper, weight: Math.min(1, 2 * fraction), strength: fraction }] : []),
  ];

  /** How far one form's arms stand out at an angle, as a share of the core. */
  const armAt = ({ form, weight }: Faded, theta: number): number => {
    if (form.arms === 0) return 0;
    const turned = theta - phase;
    const spoke = (((Math.round((turned * form.arms) / (2 * Math.PI)) % form.arms) + form.arms) % form.arms);
    const crest = ((1 + Math.cos(turned * form.arms)) / 2) ** sharp;
    return reach * weight * (arms[spoke] ?? 1) * crest;
  };
  const radiusAt = (theta: number): number => core * (1 + wobble * Math.sin(2 * theta + wobblePhase) + Math.max(...faded.map((each) => armAt(each, theta))));

  const ring = Array.from({ length: samples }, (_, i): readonly [number, number] => {
    const theta = (i / samples) * 2 * Math.PI;
    const radius = radiusAt(theta);
    return [at.x + Math.cos(theta) * radius, at.y + Math.sin(theta) * radius];
  });
  const bulbs = faded.flatMap(({ form, weight, strength }) =>
    form.bulb <= 0 || strength <= 0
      ? []
      : Array.from({ length: form.arms }, (_, arm): Bulb => {
          const theta = phase + (arm / form.arms) * 2 * Math.PI;
          const tip = core * (1 + reach * weight * (arms[arm] ?? 1));
          return { x: at.x + Math.cos(theta) * tip, y: at.y + Math.sin(theta) * tip, r: at.r * form.bulb * strength };
        }),
  );
  const longest = Math.max(0, ...faded.map(({ form, weight }) => weight * Math.max(0, ...arms.slice(0, form.arms))));
  return { level, ring, bulbs, core, extent: core * (1 + wobble + reach * longest) };
}
