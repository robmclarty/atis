import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

import * as tokens from '../tokens.js';

/**
 * docs/design.md is the human-facing record of the look the SVG settled on,
 * written from the static SVG as §5.6 asks, and tokens.ts is the single source
 * both renderers read it from (D51, D130). The two drift the moment a token
 * is added or renamed with no line in the doc, so this test holds the doc to
 * naming every token the file exports.
 *
 * It is the forward direction only: the doc may also name fixed geometry that
 * is not a token (the clone glyphs, the arrowhead), which it lists on purpose,
 * so a reverse check would flag those. Reading files with node:fs is fine in a
 * test; C1 keeps Node out of the code the package ships, and nothing the scene
 * exports reaches for it.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const DESIGN = join(HERE, '..', '..', '..', '..', 'docs', 'design.md');

/** Every export of tokens.ts is a token; the module carries nothing else. */
const NAMES = Object.keys(tokens);

test('tokens.ts exports the tokens the design doc is written from', () => {
  expect(NAMES.length).toBeGreaterThan(50);
});

test('design.md names every exported token', () => {
  const doc = readFileSync(DESIGN, 'utf8');
  const missing = NAMES.filter((name) => !new RegExp(`\\b${name}\\b`).test(doc));
  expect(missing, `tokens exported but not documented: ${missing.join(', ')}`).toEqual([]);
});

/**
 * §5.5's bounds on the motion tokens (D51, C12). A balance patch moves a
 * token freely inside its bound (Q3); a patch that crosses one changes
 * §5.5's grammar, and moves the bound here and the row in design.md with
 * it. Where §5.5 states a ceiling or a range, the bound is that. Where it
 * says "about", it is a quarter either way. Where it gives a starting value
 * or no number at all, the bound is the rule the value serves.
 */
interface Bound {
  readonly above?: number;
  readonly atLeast?: number;
  readonly atMost?: number;
  readonly below?: number;
  /** The words of §5.5 the bound reads, or the rule its value serves. */
  readonly why: string;
}

/** The transient ceiling (C12): nothing but the breathing moves for longer. */
const TRANSIENT_MS = 600;

const about = (value: number, why: string): Bound => ({ atLeast: value * 0.75, atMost: value * 1.25, why });

const MOTION_BOUNDS: Readonly<Record<string, Bound>> = {
  SETTLE_MS: { above: 0, atMost: TRANSIENT_MS, why: 'a damped drop, and a transient' },
  SETTLE_LIFT: { above: 0, why: 'a drop starts above where it lands' },
  SETTLE_DAMPING: { above: 0, atMost: 1, why: 'damped, and landing inside SETTLE_MS' },
  FLARE_MS: { above: 0, atMost: TRANSIENT_MS, why: 'a burst: only the breathing outlasts a transient' },
  FLARE_GAIN: { above: 0, why: 'a flare brightens' },
  FLARE_GROW: { atLeast: 0, why: 'a flare may swell its glow, never shrink it' },
  BREATHE_PERIOD_MS: about(2000, 'a period of about 2 s'),
  BREATHE_AMPLITUDE: about(0.03, 'an amplitude of about 3% of its glow radius'),
  PRIMARY_FLARE_MIN_MS: { atLeast: 8000, atMost: 20000, why: 'drawn from 8 to 20 s' },
  PRIMARY_FLARE_MAX_MS: { atLeast: 8000, atMost: 20000, why: 'drawn from 8 to 20 s' },
  SECONDARY_FLARE_MIN_MS: { atLeast: 40000, atMost: 90000, why: 'rarer, 40 to 90 s' },
  SECONDARY_FLARE_MAX_MS: { atLeast: 40000, atMost: 90000, why: 'rarer, 40 to 90 s' },
  SECONDARY_FLARE_GAIN: { above: 0, below: 1, why: 'dimmer than the primary, and still a flare' },
  JIGGLE_MS: { above: 0, atMost: 600, why: 'a brief jiggle, 600 ms or less' },
  JIGGLE_AMPLITUDE: { above: 0, below: 1, why: 'the relief swings but never turns inside out' },
  JIGGLE_HZ: { above: 0, why: 'a swing' },
  JIGGLE_DECAY: { atLeast: Math.log(20), why: 'heavy damping: a twentieth of the swing or less is left when it stops' },
  HOVER_MS: { above: 0, atMost: TRANSIENT_MS, why: 'an ease to a highlight, and a transient' },
  FLY_TO_MS: { above: 0, atMost: 400, why: 'an ease of 400 ms or less' },
  LOD_FADE_MS: { above: 0, atMost: 300, why: 'a cross-fade of 300 ms or less, never a blink' },
  DRIFT_HZ_MIN: { above: 0, atMost: 0.25, why: 'a slow float (D157): a wander of four seconds or longer' },
  DRIFT_HZ_MAX: { above: 0, atMost: 0.25, why: 'a slow float (D157): a wander of four seconds or longer' },
  DRIFT_REACH: { above: 0, atMost: 0.5, why: 'a loose file wanders about its place, never across its cell (D165)' },
  DRIFT_SPEED: { above: 0, atMost: 0.05, why: 'a slow float on the screen (D165): a small share of it a second, twenty seconds or more to cross it' },
  DRIFT_GAP: { atLeast: 0, why: 'a file keeps off its neighbours and the membrane, never into them' },
  DRIFT_EASE_MS: { above: 0, atMost: TRANSIENT_MS, why: 'the drift eases in as the cell opens, a transient' },
};

const VALUES: Readonly<Record<string, unknown>> = tokens;

/** A token's value, which every motion token is: a finite number. */
const valueOf = (name: string): number => {
  const value = VALUES[name];
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${name} is not an exported finite number`);
  return value;
};

test.each(Object.entries(MOTION_BOUNDS))("%s sits inside §5.5's bound", (name, bound) => {
  const value = valueOf(name);
  if (bound.above !== undefined) expect(value, bound.why).toBeGreaterThan(bound.above);
  if (bound.atLeast !== undefined) expect(value, bound.why).toBeGreaterThanOrEqual(bound.atLeast);
  if (bound.atMost !== undefined) expect(value, bound.why).toBeLessThanOrEqual(bound.atMost);
  if (bound.below !== undefined) expect(value, bound.why).toBeLessThan(bound.below);
});

test('each random flare, and the drift, is drawn from a window that opens before it closes', () => {
  expect(valueOf('PRIMARY_FLARE_MIN_MS')).toBeLessThanOrEqual(valueOf('PRIMARY_FLARE_MAX_MS'));
  expect(valueOf('SECONDARY_FLARE_MIN_MS')).toBeLessThanOrEqual(valueOf('SECONDARY_FLARE_MAX_MS'));
  expect(valueOf('DRIFT_HZ_MIN')).toBeLessThanOrEqual(valueOf('DRIFT_HZ_MAX'));
});

/**
 * The shapes' motion inside an opened cell (D147), one value per rule count,
 * 0 to 6: still at 0, and faster and further as the level climbs, each within
 * the bound its rule serves.
 */
const SHAPE_MOTION_BOUNDS: Readonly<Record<string, Bound>> = {
  SHAPE_PULSE_HZ: { atLeast: 0, atMost: 2, why: 'a pulse, never a flicker: two beats a second at most' },
  SHAPE_PULSE: { atLeast: 0, below: 1, why: 'an arm swells and shrinks but never turns inside out' },
  SHAPE_TURN: { atLeast: 0, atMost: 0.5, why: 'a slow turn, under a twelfth of a revolution a second' },
};

test.each(Object.entries(SHAPE_MOTION_BOUNDS))('%s is still at 0 rules, climbs with the level, and keeps inside its bound', (name, bound) => {
  const values = VALUES[name];
  if (!Array.isArray(values)) throw new Error(`${name} is not an exported list`);
  expect(values).toHaveLength(7);
  expect(values[0]).toBe(0);
  values.forEach((value: unknown, level) => {
    if (typeof value !== 'number') throw new Error(`${name}[${String(level)}] is not a number`);
    if (level > 0) expect(value, `${name} climbs at ${String(level)}`).toBeGreaterThan(Number(values[level - 1]));
    if (bound.atLeast !== undefined) expect(value, bound.why).toBeGreaterThanOrEqual(bound.atLeast);
    if (bound.atMost !== undefined) expect(value, bound.why).toBeLessThanOrEqual(bound.atMost);
    if (bound.below !== undefined) expect(value, bound.why).toBeLessThan(bound.below);
  });
});

test("design.md's motion table names exactly the tokens §5.5, D147, D157 and D165 bound", () => {
  const doc = readFileSync(DESIGN, 'utf8');
  const section = doc.split(/^## /m).find((part) => part.startsWith('Motion'));
  expect(section, 'design.md has no Motion section').toBeDefined();
  const rows = [...(section ?? '').matchAll(/^\| `([A-Z][A-Z0-9_]*)` \|/gm)].map((match) => match[1] ?? '');
  expect(rows.toSorted()).toEqual([...Object.keys(MOTION_BOUNDS), ...Object.keys(SHAPE_MOTION_BOUNDS)].toSorted());
});
