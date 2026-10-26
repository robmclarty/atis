/**
 * palette: the hues the weather's marks are drawn in, one uniform per meaning
 * (C11), read live from the registry so the dev panel moves them (D156). A
 * mark names its hue by index (`marks.ts`), and the material picks the
 * colour from these on the GPU, so a token moved shows on the next frame.
 * The category hue is the map's own flight category's (§5.3, D6), the one
 * saturated hue the notices' emphasis borrows (§5.4), and the leaders' grey
 * is the chrome's (D72).
 */

import { Color, Vector3 } from 'three/webgpu';
import type { Node, UniformNode } from 'three/webgpu';
import { float, select, uniform } from 'three/tsl';
import { CHANGE_HUE, CHROME_MUTED, EVIDENCE_LIGHT, GHOST_STROKE, GLYPH_STROKE, IFR_HUE, IMPROVED_HUE, LEADER_INK, LIFR_HUE, MVFR_HUE, REACH_GLOW, STANDING_STORM_FILL, STITCH_UNLIT, TEXTURE_INK, VFR_HUE } from 'scene';
import type { FlightCategory } from 'core';

import { HUES } from '../marks.js';
import type { Hue } from '../marks.js';
import { CATEGORY_TOKEN } from '../notices.js';

/** The tokens the palette reads, at rest: the shape its live view takes. */
export const PALETTE_LOOK = { CHANGE_HUE, REACH_GLOW, EVIDENCE_LIGHT, IFR_HUE, STITCH_UNLIT, GHOST_STROKE, TEXTURE_INK, LIFR_HUE, STANDING_STORM_FILL, VFR_HUE, MVFR_HUE, LEADER_INK, CHROME_MUTED, IMPROVED_HUE, GLYPH_STROKE };
type PaletteLook = typeof PALETTE_LOOK;

/** Which token each hue is, in `HUES`' order; the category's depends on the map. */
const TOKEN_OF: Readonly<Record<Exclude<Hue, 'category'>, keyof PaletteLook>> = {
  change: 'CHANGE_HUE',
  reach: 'REACH_GLOW',
  evidence: 'EVIDENCE_LIGHT',
  ifr: 'IFR_HUE',
  unlit: 'STITCH_UNLIT',
  ghost: 'GHOST_STROKE',
  ink: 'TEXTURE_INK',
  lifr: 'LIFR_HUE',
  standing: 'STANDING_STORM_FILL',
  leader: 'LEADER_INK',
  improved: 'IMPROVED_HUE',
  glyph: 'GLYPH_STROKE',
};

const tokenOf = (hue: Hue, category: FlightCategory): keyof PaletteLook => (hue === 'category' ? CATEGORY_TOKEN[category] : TOKEN_OF[hue]);

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

/** The palette over a live look, for a map of this category. */
export const createPalette = (look: PaletteLook, category: FlightCategory): Palette => {
  const uniforms: readonly UniformNode<'vec3', Vector3>[] = HUES.map((hue) => uniform(linear(look[tokenOf(hue, category)])));
  const [first, ...rest] = uniforms;
  if (first === undefined) throw new Error('the palette has no hue');
  // Picked by index: the hue at `i + 1` replaces the pick once the index has reached it.
  const colourOf = (index: Node<'float'>): Node<'vec3'> => rest.reduce<Node<'vec3'>>((picked, colour, i) => select(index.lessThan(float(i + 0.5)), picked, colour), first);
  return {
    colourOf,
    colour: (hue) => new Color(look[tokenOf(hue, category)]),
    restyle: () => HUES.forEach((hue, i) => uniforms[i]?.value.copy(linear(look[tokenOf(hue, category)]))),
  };
};
