/**
 * materials: the world's own look, at the values the materials spike left
 * them (D151): the skin's two albedos and its wet sheen, the key light and the
 * ambient, and the sky the sheen mirrors. They are the world's tokens beside
 * the scene's (`libs/scene/src/tokens.ts`), kept here as data with no three
 * import so the registry (D156) and its tests read them in Node; `world/`
 * reads each through the registry, so the dev panel moves them live. Step 44
 * records them in `docs/design.md` beside their sources.
 */

/** The skin's material: the two albedos, how rough and how wet it is, and the share of its albedo kept at the far field. */
export type SkinLook = {
  /** The skin where it lies on the field: graphite. */
  readonly fieldAlbedo: string;
  /** The skin where a cell swells through it: blue-grey. */
  readonly tissueAlbedo: string;
  readonly roughness: number;
  /** The wet sheen: a clearcoat, and how soft its reflection is. */
  readonly clearcoat: number;
  readonly clearcoatRoughness: number;
  /** The share of the albedo the far field keeps, lit only by the ambient's floor. */
  readonly farAlbedo: number;
};

export const SKIN: SkinLook = {
  fieldAlbedo: '#14181e',
  tissueAlbedo: '#2b333d',
  roughness: 0.46,
  clearcoat: 1,
  clearcoatRoughness: 0.14,
  farAlbedo: 0.05,
};

/** The lights: the key, the ambient, and the sky's strength in the sheen. */
export type Lighting = {
  /** The key light's colour, its strength at the surface, and where it shines from, relative to the layout's centre. */
  readonly key: string;
  readonly keyIntensity: number;
  readonly keyFrom: readonly [number, number, number];
  /** The ambient's colour, its strength at the surface, and the share of it the far field keeps. */
  readonly ambient: string;
  readonly ambientIntensity: number;
  readonly ambientFloor: number;
  /** The sky's strength in the sheen at the surface; off at the far field. */
  readonly sky: number;
};

export const LIGHTING: Lighting = {
  key: '#dfe8f2',
  keyIntensity: 2.2,
  keyFrom: [-0.55, 1, -0.45],
  ambient: '#8796a8',
  ambientIntensity: 0.35,
  ambientFloor: 0.1,
  sky: 0.35,
};

/** The sky the wet sheen mirrors: black overhead, a band below about 60° of elevation, and three soft boxes round the key light. */
export type SkyLook = {
  /** The band's colour and its gain over the sRGB value, an HDR light the sheen can catch. */
  readonly band: string;
  readonly bandGain: number;
  /** The band fades out between these two elevations, as sines: full below the lower, gone above the upper. */
  readonly bandTop: readonly [number, number];
  /** It fades in across the horizon, between these two. */
  readonly horizon: readonly [number, number];
  /** The boxes' colour, how narrow each is, and each box's direction and gain. */
  readonly box: string;
  readonly boxFocus: number;
  readonly boxes: readonly (readonly [number, number, number, number])[];
};

export const SKY: SkyLook = {
  band: '#8ea4ba',
  bandGain: 2.2,
  bandTop: [0.62, 0.9],
  horizon: [-0.1, 0.12],
  box: '#f2f6fa',
  boxFocus: 40,
  boxes: [
    [-0.55, 0.62, -0.45, 2.5],
    [0.6, 0.55, -0.3, 2],
    [0.1, 0.5, 0.7, 1.5],
  ],
};
