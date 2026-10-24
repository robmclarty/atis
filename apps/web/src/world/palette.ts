/**
 * palette: the hues the weather's marks are drawn in, one uniform per meaning
 * (C11), read live from the registry so the dev panel moves them (D156). A
 * mark names its hue by index (`marks.ts`), and the material picks the
 * colour from these on the GPU, so a token moved shows on the next frame.
 */

import { Color, Vector3 } from 'three/webgpu';
import type { Node, UniformNode } from 'three/webgpu';
import { float, select, uniform } from 'three/tsl';
import { CHANGE_HUE, EVIDENCE_LIGHT, GHOST_STROKE, IFR_HUE, LIFR_HUE, REACH_GLOW, STANDING_STORM_FILL, STITCH_UNLIT, TEXTURE_INK } from 'scene';

import { HUES } from '../marks.js';
import type { Hue } from '../marks.js';

/** The tokens the palette reads, at rest: the shape its live view takes. */
export const PALETTE_LOOK = { CHANGE_HUE, REACH_GLOW, EVIDENCE_LIGHT, IFR_HUE, STITCH_UNLIT, GHOST_STROKE, TEXTURE_INK, LIFR_HUE, STANDING_STORM_FILL };
type PaletteLook = typeof PALETTE_LOOK;

/** Which token each hue is, in `HUES`' order. */
const TOKEN_OF: Readonly<Record<Hue, keyof PaletteLook>> = {
  change: 'CHANGE_HUE',
  reach: 'REACH_GLOW',
  evidence: 'EVIDENCE_LIGHT',
  ifr: 'IFR_HUE',
  unlit: 'STITCH_UNLIT',
  ghost: 'GHOST_STROKE',
  ink: 'TEXTURE_INK',
  lifr: 'LIFR_HUE',
  standing: 'STANDING_STORM_FILL',
};

export type Palette = {
  /** The colour a hue index names, on the GPU, as linear light. */
  readonly colourOf: (index: Node<'float'>) => Node<'vec3'>;
  /** The colour a hue names, on the CPU, now. */
  readonly colour: (hue: Hue) => Color;
  /** Re-read every hue from the registry, each frame. */
  readonly restyle: () => void;
};

/** The index a hue is named by. */
export const hueIndex = (hue: Hue): number => HUES.indexOf(hue);

/** A token's colour as the linear light a vec3 uniform carries. */
const linear = (token: string): Vector3 => {
  const colour = new Color(token);
  return new Vector3(colour.r, colour.g, colour.b);
};

/** The palette over a live look. */
export const createPalette = (look: PaletteLook): Palette => {
  const uniforms: readonly UniformNode<'vec3', Vector3>[] = HUES.map((hue) => uniform(linear(look[TOKEN_OF[hue]])));
  const [first, ...rest] = uniforms;
  if (first === undefined) throw new Error('the palette has no hue');
  // Picked by index: the hue at `i + 1` replaces the pick once the index has reached it.
  const colourOf = (index: Node<'float'>): Node<'vec3'> => rest.reduce<Node<'vec3'>>((picked, colour, i) => select(index.lessThan(float(i + 0.5)), picked, colour), first);
  return {
    colourOf,
    colour: (hue) => new Color(look[TOKEN_OF[hue]]),
    restyle: () => HUES.forEach((hue, i) => uniforms[i]?.value.copy(linear(look[TOKEN_OF[hue]]))),
  };
};
