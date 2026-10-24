/**
 * shape: a file's outline, morphed by the rules it breaks (§5.1, D146). One
 * function draws it for both renderers: the SVG still, at rest (C10), and
 * the world inside an opened cell, moved by the scheduler at any time
 * (D147). The form at each rule count is `SHAPE_LEVELS`'; within a level,
 * the arms' phase and lengths are seeded by the file's path, so one file is
 * one shape on every render and two files at one level differ (C3).
 */

import type { Position } from 'core';

import { SHAPE_ARM_SPREAD, SHAPE_CORE_GIVE, SHAPE_LEVELS } from './tokens.js';

/** How the shape moves: the time in seconds, how fast and how far its arms pulse, and how fast it turns. Still unless the scheduler says otherwise. */
export type ShapeMotion = { readonly t: number; readonly pulseHz: number; readonly pulse: number; readonly turn: number };

/** No motion: the outline the SVG draws, and the world's under reduced motion. */
export const AT_REST: ShapeMotion = { t: 0, pulseHz: 0, pulse: 0, turn: 0 };

/** A bulb at an arm's tip. */
export type Bulb = { readonly x: number; readonly y: number; readonly r: number };

/** The outline as points round the file, its bulbs, and its core: the radius inside which nothing protrudes. */
export type Outline = {
  readonly level: number;
  readonly ring: readonly (readonly [number, number])[];
  readonly bulbs: readonly Bulb[];
  readonly core: number;
};

/** The highest level a file can reach: fallow's four thresholds, a boundary violation and a cycle. */
export const MAX_RULES = SHAPE_LEVELS.length - 1;

/** The level a file's breached rules put it at, 0 to `MAX_RULES`. */
export function rulesOf(dents: readonly string[]): number {
  return Math.min(dents.length, MAX_RULES);
}

/** A path's seed: FNV-1a over its UTF-16 code units. */
function seedOf(id: string): number {
  let hash = 2_166_136_261;
  for (let i = 0; i < id.length; i += 1) hash = Math.imul(hash ^ id.charCodeAt(i), 16_777_619);
  return hash >>> 0;
}

/** The `i`th draw from a seed, in [0, 1), from integer mixing alone so every engine draws the same. */
function draw(seed: number, i: number): number {
  let t = (seed + Math.imul(i + 1, 0x9e_37_79_b9)) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
}

/** Draws reserved for the shape's own phases, clear of the arms' indices. */
const TURN_DRAW = 99;
const WOBBLE_DRAW = 98;
const BEAT_DRAW = 50;

/** The wobble drifts this many times faster than the body turns, so a turning shape never reads as a rigid wheel. */
const WOBBLE_DRIFT = 3;

/**
 * The outline of the file `id`, placed at `at`, breaking `rules` rules, as
 * `motion` has it. Arms reach out from a core a little smaller than the
 * radius, each a raised cosine round its spoke, longer or shorter by its
 * seed and pulsing with its own beat; the body turns as a whole; at levels 5
 * and 6 a bulb sits at each arm's tip.
 */
export function outlineOf(id: string, at: Position, rules: number, motion: ShapeMotion = AT_REST): Outline {
  const level = Math.max(0, Math.min(MAX_RULES, Math.round(rules)));
  const form = SHAPE_LEVELS[level] ?? SHAPE_LEVELS[0];
  if (form === undefined) throw new Error('SHAPE_LEVELS is empty');
  const seed = seedOf(id);
  const core = at.r * (1 - SHAPE_CORE_GIVE * form.reach);
  const phase = draw(seed, TURN_DRAW) * 2 * Math.PI + motion.turn * motion.t;
  const wobblePhase = draw(seed, WOBBLE_DRAW) * 2 * Math.PI + WOBBLE_DRIFT * motion.turn * motion.t;
  const arms = Array.from({ length: form.arms }, (_, arm) => {
    const size = 1 + SHAPE_ARM_SPREAD * (2 * draw(seed, arm) - 1);
    const beat = draw(seed, BEAT_DRAW + arm) * 2 * Math.PI;
    return size * (1 + motion.pulse * Math.sin(2 * Math.PI * motion.pulseHz * motion.t + beat));
  });

  const radiusAt = (theta: number): number => {
    const body = core * (1 + form.wobble * Math.sin(2 * theta + wobblePhase));
    if (form.arms === 0) return body;
    const turned = theta - phase;
    const spoke = (((Math.round((turned * form.arms) / (2 * Math.PI)) % form.arms) + form.arms) % form.arms);
    const crest = ((1 + Math.cos(turned * form.arms)) / 2) ** form.sharp;
    return body + core * form.reach * (arms[spoke] ?? 1) * crest;
  };

  const ring = Array.from({ length: form.samples }, (_, i): readonly [number, number] => {
    const theta = (i / form.samples) * 2 * Math.PI;
    const radius = radiusAt(theta);
    return [at.x + Math.cos(theta) * radius, at.y + Math.sin(theta) * radius];
  });
  const bulbs =
    form.bulb <= 0
      ? []
      : arms.map((size, arm): Bulb => {
          const theta = phase + (arm / form.arms) * 2 * Math.PI;
          const reach = core * (1 + form.reach * size);
          return { x: at.x + Math.cos(theta) * reach, y: at.y + Math.sin(theta) * reach, r: at.r * form.bulb };
        });
  return { level, ring, bulbs, core };
}
