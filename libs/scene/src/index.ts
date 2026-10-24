/**
 * scene: everything the world draws short of a GPU call (D90), turned from
 * `map.json` alone. Pure like core and svg (C1): no DOM, no Node, no three,
 * and no clock or random source it was not handed (C3, D94), so the still
 * renderer, the world and `--png` all read one model, and the decisions
 * inside the render are tested where they are made.
 */

export * from './heightfield.js';
export * from './instances.js';
export * from './labels.js';
export * from './membranes.js';
export * from './shape.js';
export * from './shore.js';
export * from './tokens.js';
export * from './weather.js';
