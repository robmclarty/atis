/**
 * materials: the world's own look, at the values the materials spike left
 * them (D151): the skin's two albedos and its wet sheen, the key light and the
 * ambient, and the sky the sheen mirrors. They are the world's tokens beside
 * the scene's (`libs/scene/src/tokens.ts`), kept here as data with no three
 * import so the registry (D156) and its tests read them in Node; `world/`
 * reads each through the registry, so the dev panel moves them live, and
 * `docs/design.md` records every field under "World materials". The levels of
 * detail's gates and the camera's give ride with them (step 44), and so do the
 * minimap's look (D154), the one piece of chrome the scene's tokens do not
 * already dress, an opened cell's slide (step 40), and the planet the far
 * zoom draws (D170).
 */

import { CELL_GATE, COMPOSITE_GATE, INTERIOR_LAYOUT, LOD_GATES, PLANET_LAYOUT } from 'scene';
import type { InteriorLayout, LodGate, PlanetLayout } from 'scene';

/** The skin's material: the albedos, the membrane line, how rough and how wet it is, the share of its albedo kept at the far field, and the tissue's own faint light. */
export type SkinLook = {
  /** The skin where it lies on the open field: near-black, the ground space is (D169). */
  readonly fieldAlbedo: string;
  /** The skin where a cell's body lies under it: blue-grey. */
  readonly tissueAlbedo: string;
  /** The membrane line laid into the tissue, added over the albedo as wide as the cell's interface. */
  readonly membraneLine: string;
  readonly roughness: number;
  /** The wet sheen: a clearcoat, and how soft its reflection is. */
  readonly clearcoat: number;
  readonly clearcoatRoughness: number;
  /** The share of the albedo the far field keeps, lit only by the ambient's floor. */
  readonly farAlbedo: number;
  /** Base tissue's faint light, which never blooms (D151): a rim where the skin slopes away, in this colour, this strong, falling off this sharply with the facing, and each cell's own faint light over its body, this strong. */
  readonly rimColour: string;
  readonly rimGain: number;
  readonly rimPower: number;
  readonly cellLight: number;
};

export const SKIN: SkinLook = {
  fieldAlbedo: '#07090c',
  tissueAlbedo: '#2b333d',
  membraneLine: '#3c4652',
  roughness: 0.46,
  clearcoat: 1,
  clearcoatRoughness: 0.14,
  farAlbedo: 0.05,
  rimColour: '#7f93a6',
  rimGain: 0.05,
  rimPower: 3,
  cellLight: 0.035,
};

/**
 * The space the field is (D169): its faint stars, which stay a size on the
 * screen however near the camera comes and never bloom, and the rule at each
 * band's boundary that depth reads from, drawn over the 3D in an ink just
 * visible enough to register, so it sits back from every mark.
 */
export type SpaceLook = {
  /** The stars' ink, how bright the brightest is drawn, and a star's radius in screen pixels. */
  readonly starInk: string;
  readonly starGain: number;
  readonly starRadius: number;
  /** The star grid: layout units between its cells, the share of its cells that hold a star, and the seed the field is drawn from (C3). */
  readonly starSpacing: number;
  readonly starDensity: number;
  readonly starSeed: number;
  /** The rule at each band's boundary: its ink, how much of it shows, and its width in screen pixels. */
  readonly ruleInk: string;
  readonly ruleOpacity: number;
  readonly ruleWidth: number;
};

export const SPACE: SpaceLook = {
  starInk: '#c6d0dc',
  starGain: 0.5,
  starRadius: 0.8,
  starSpacing: 22,
  starDensity: 0.3,
  starSeed: 1,
  ruleInk: '#8796a8',
  ruleOpacity: 0.16,
  ruleWidth: 1,
};

/**
 * The far zoom's planet (D170), beside its shape from the scene
 * (`PLANET_LAYOUT`): its dark body, a hair lighter at its middle than at its
 * limb; each light on it, at least this radius in pixels and else the file's
 * own disc on the sphere, its glow this many times as wide, this bright, and
 * dimming toward the limb until it faces the camera this much; the share of a
 * light's or a star's brightness its glow starts at past its core; each
 * star's radius in pixels for the fewest importers and the most, its glow
 * this many times as wide, this bright; the hues a star takes beside the
 * state hues it shares with the sheet, amber for a lesser advisory, dim white
 * with no finding, and muted grey with no audit read; and the rim the stars
 * light, reaching this share of the radius in from the limb and this share
 * out past it as a haze, this bright. None of it blooms: a light's glow is
 * its own.
 */
export type PlanetLook = PlanetLayout & {
  readonly body: string;
  readonly bodyCore: string;
  readonly lightMin: number;
  readonly lightGlow: number;
  readonly lightGain: number;
  readonly limbFade: number;
  readonly glowShare: number;
  readonly starMin: number;
  readonly starMax: number;
  readonly starGlow: number;
  readonly starGain: number;
  readonly amber: string;
  readonly clean: string;
  readonly unread: string;
  readonly rimDepth: number;
  readonly rimHaze: number;
  readonly rimGain: number;
};

export const PLANET: PlanetLook = {
  ...PLANET_LAYOUT,
  body: '#05070a',
  bodyCore: '#0e131a',
  lightMin: 1.4,
  lightGlow: 3.5,
  lightGain: 0.9,
  limbFade: 0.2,
  glowShare: 0.28,
  starMin: 1.2,
  starMax: 4.5,
  starGlow: 4,
  starGain: 0.9,
  amber: '#e9a93c',
  clean: '#c6d0dc',
  unread: '#58616c',
  rimDepth: 0.12,
  rimHaze: 0.02,
  rimGain: 0.7,
};

/** The bloom on the emissive target alone (D11, D12): how strong, how wide, and the light below which nothing blooms. */
export type BloomLook = {
  readonly strength: number;
  readonly radius: number;
  readonly threshold: number;
};

export const BLOOM: BloomLook = { strength: 0.9, radius: 0.5, threshold: 0 };

/**
 * The weather's light in the world (D151): how much the reach lights the skin
 * and how much of that the bloom sees (a fifth, so a broad reach stays a
 * luminance and not a fog), how much brighter the reach reads over a cell's
 * body than in the crease between, how far the reach is softened in samples,
 * the share of a mark's light the bloom sees, and of a ribbon's.
 */
export type WeatherLook = {
  readonly reachGain: number;
  readonly reachBloom: number;
  readonly reachBodyGain: number;
  readonly reachSoften: number;
  readonly markBloom: number;
  readonly ribbonBloom: number;
};

// The reach's gain starts under the spike's 1.05: under AgX, added to the lit albedo and bloomed, that read as a white wash where the sheet lays a warm tint, so it opens lower for the panel to tune (D156).
export const WEATHER: WeatherLook = { reachGain: 0.7, reachBloom: 0.2, reachBodyGain: 1.1, reachSoften: 2, markBloom: 1, ribbonBloom: 0.3 };

/**
 * A notice's light on the field (§5.4, step 34): the primary's halo, a disc
 * in the category hue over its anchor out to its ring, which breathes and
 * flares through the scheduler, at this share of the hue's light, and the
 * share of that the bloom sees. The tier rings are annotations in the
 * chrome's manner and never bloom (D12, D72).
 */
export type NoticeLook = {
  readonly haloOpacity: number;
  readonly haloBloom: number;
};

export const NOTICE: NoticeLook = { haloOpacity: 0.35, haloBloom: 1 };

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

/**
 * The camera's give (step 37): how long the controls take to settle on an
 * input, in seconds, long enough that a wheel's steps read as one continuous
 * zoom and short enough that nothing coasts once the pointer stops, and the
 * shorter settle a drag takes. Under reduced motion the controls settle at
 * once (step 42).
 */
export type CameraLook = {
  readonly smooth: number;
  readonly dragSmooth: number;
};

export const CAMERA: CameraLook = { smooth: 0.1, dragSmooth: 0.05 };

/**
 * The levels of detail's gates (§6): the zoom over the fit each of LOD1 to
 * LOD4 is entered at and left at; the cell's gate beside them (D165): the
 * share of the free screen a cell opens at, the share it holds open at, and
 * the share at which a closed cell's files are home (`libs/scene/src/lod.ts`);
 * and the composite's (step 66): the share a package past 5,000 files opens
 * at from one composite into its cells, and the share it holds open at
 * (`libs/scene/src/composites.ts`).
 */
export type LevelsLook = {
  readonly gates: readonly LodGate[];
  readonly cellOpen: number;
  readonly cellClose: number;
  readonly cellHome: number;
  readonly compositeOpen: number;
  readonly compositeClose: number;
};

export const LEVELS: LevelsLook = {
  gates: LOD_GATES,
  cellOpen: CELL_GATE.open,
  cellClose: CELL_GATE.close,
  cellHome: CELL_GATE.home,
  compositeOpen: COMPOSITE_GATE.open,
  compositeClose: COMPOSITE_GATE.close,
};

/**
 * The minimap at the chrome's bottom left (D154): flat chrome, never glowing
 * (D12). It takes at most this much room, keeps this margin inside its frame,
 * and draws the body flat in one grey; a reached cell's own ground lays the
 * reach's hue over it at its luminance times this share, flattened as the
 * legend flattens the world's one translucent ink; a changed file is a dot of
 * this radius; and the view is outlined in this ink at this width.
 */
export type MinimapLook = {
  readonly width: number;
  readonly height: number;
  readonly pad: number;
  readonly body: string;
  readonly reachShare: number;
  readonly changedR: number;
  readonly view: string;
  readonly viewWidth: number;
};

export const MINIMAP: MinimapLook = { width: 240, height: 180, pad: 6, body: '#333c47', reachShare: 0.55, changedR: 1.5, view: '#e6edf3', viewWidth: 1 };

/**
 * The hover (step 38): the thing under the pointer is outlined in this ink at
 * this width, a flat annotation in the chrome's manner that never blooms
 * (D12); a file answers the pointer this many pixels past its edge, so one too
 * small to aim at still does; and its tag stands this many pixels right of and
 * below the pointer.
 */
export type HoverLook = {
  readonly ink: string;
  readonly width: number;
  readonly slop: number;
  readonly tagGap: number;
};

export const HOVER: HoverLook = { ink: '#e6edf3', width: 1.5, slop: 4, tagGap: 14 };

/**
 * The walk's framing (step 39): a stop the camera flies to fills this share of
 * the free screen in whichever of its width and height it fills first, and a
 * file is framed with this many of its radii of ground round its centre.
 */
export type WalkLook = {
  readonly share: number;
  readonly fileContext: number;
};

export const WALK: WalkLook = { share: 0.8, fileContext: 6 };

/**
 * An opened cell's slide (§5.6's inside, step 40): warm and clinical where
 * the surface is dark. The slide's ground and how opaque it is; the membrane's
 * ink, drawn round the files as the frame; each body's fill and stroke, the
 * stroke this wide in layout units; how much of the change hue a stained body
 * takes; how far above the cell's highest relief the slide floats, in the
 * heightfield's units; and the exploded view's spread, push and gap, which
 * the scene lays the view by. Every body is unlit and nothing here blooms.
 */
export type InteriorLook = InteriorLayout & {
  readonly slide: string;
  readonly slideOpacity: number;
  readonly frame: string;
  readonly body: string;
  readonly bodyStroke: string;
  readonly strokeWidth: number;
  readonly stainShare: number;
  readonly lift: number;
};

export const INTERIOR: InteriorLook = { ...INTERIOR_LAYOUT, slide: '#efe6d3', slideOpacity: 0.94, frame: '#1e2733', body: '#b9a9cc', bodyStroke: '#6f5f8a', strokeWidth: 1, stainShare: 1, lift: 4 };
