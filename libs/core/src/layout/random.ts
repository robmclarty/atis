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

/** FNV-1a's 32-bit offset basis and prime. */
const FNV_BASIS = 2_166_136_261;
const FNV_PRIME = 16_777_619;

/**
 * A seed of a cell's own, for a pass that settles one cell alone: the
 * layout's seed folded with the cell's id by FNV-1a. Each cell settled from
 * the one seed would draw the same first numbers as every other, and so rest
 * every single-file cell at the same height on its terrace, a row of beads;
 * a seed per id tells them apart and is still the same on every run (C3).
 */
export function seedOf(id: string): number {
  let hash = FNV_BASIS ^ LAYOUT_SEED;
  for (const char of id) hash = Math.imul(hash ^ (char.codePointAt(0) ?? 0), FNV_PRIME) >>> 0;
  return hash;
}
