/**
 * random: the one source of chance the layout has, and it is seeded (C3, D34).
 *
 * A layout wants jitter — two files on the same spot must be told apart, and a
 * collision needs a direction to resolve along — but a map that moves between
 * two runs over one base is a map a reviewer cannot trust. So the chance is a
 * 32-bit linear congruential generator started from a fixed seed: the same
 * inputs draw the same numbers in the same order, forever. `d3-force` reaches
 * for its own generator unless it is handed one, which is what
 * `simulation.randomSource` is for.
 */

/** Numerical Recipes' parameters, the ones `d3-force` itself uses. */
const MULTIPLIER = 1_664_525;
const INCREMENT = 1_013_904_223;
const MODULUS = 2 ** 32;

/**
 * The seed every layout starts from. Its value means nothing; that it never
 * changes is the whole point, since it is what makes one base ref draw one map
 * (D37: determinism is what the terrain cache would otherwise have bought).
 */
export const LAYOUT_SEED = 1_312_559;

/**
 * A generator of numbers in `[0, 1)`. `MULTIPLIER * state` stays under 2^53,
 * so every step is exact in a double and the sequence is the same on every
 * machine that runs it.
 */
export function seededRandom(seed: number): () => number {
  let state = Math.trunc(Math.abs(seed)) % MODULUS;
  return () => {
    state = (MULTIPLIER * state + INCREMENT) % MODULUS;
    return state / MODULUS;
  };
}
