/**
 * materials: the world's own look, at the values the materials spike left
 * them (D151): the skin's two albedos and its wet sheen, the key light and the
 * ambient, and the sky the sheen mirrors. They are the world's tokens beside
 * the scene's (`libs/scene/src/tokens.ts`), kept here as data with no three
 * import so the registry (D156) and its tests read them in Node; `world/`
 * reads each through the registry, so the dev panel moves them live, and
 * `docs/design.md` records every field under "World materials". The levels of
 * detail's gates and the camera's give ride with them (step 44), and so does
 * an opened cell's slide (step 40). The
 * minimap's look and a still's framing are the scene's (`MINIMAP`, `CINEMA`),
 * since the comment's still and the fingerprint draw with them too (D175).
 * The levels rest parked, the world one lit surface at every zoom (D204
 * (parked-levels)), and the side panels' sizes ride here too (D208
 * (side-panels)).
 */

import { CELL_GATE, COMPOSITE_GATE, INTERIOR_LAYOUT } from 'scene';
import type { InteriorLayout, LodGate } from 'scene';

/** The skin's material: the albedos, the membrane line, how rough and how wet it is, the share of its albedo kept at the far field, the tissue's own faint light, and the shape of the ripple a membrane imported past its barrel runs with (D195). */
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
  /** The share of the shine, the key light's highlight and the wet sheen, the open field keeps between the cells' bodies; at none it is matte, the space it is (D169), and no lit slab marks the layout's extent. */
  readonly fieldSheen: number;
  /** The share of the albedo the far field keeps, lit only by the ambient's floor. */
  readonly farAlbedo: number;
  /** Base tissue's faint light, which never blooms (D151): a rim where the skin slopes away, in this colour, this strong, falling off this sharply with the facing, and each cell's own faint light over its body, this strong. */
  readonly rimColour: string;
  readonly rimGain: number;
  readonly rimPower: number;
  readonly cellLight: number;
  /** The ripple's shape (D195): how long one swell runs across the field, in layout units, and the heading its swells lie across, in radians from the map's x toward its y. How far a line ripples and how fast are the scene's (`MEMBRANE_WOBBLE`, `MEMBRANE_WOBBLE_HZ`). */
  readonly rippleLength: number;
  readonly rippleHeading: number;
};

export const SKIN: SkinLook = {
  fieldAlbedo: '#07090c',
  tissueAlbedo: '#2b333d',
  membraneLine: '#3c4652',
  roughness: 0.46,
  clearcoat: 1,
  clearcoatRoughness: 0.14,
  fieldSheen: 0,
  farAlbedo: 0.05,
  rimColour: '#7f93a6',
  rimGain: 0.05,
  rimPower: 3,
  cellLight: 0.035,
  rippleLength: 72,
  rippleHeading: 0.6,
};

/**
 * The space the field is (D169): its faint stars, which stay a size on the
 * screen however near the camera comes and never bloom, and the rule at each
 * band's boundary that depth reads from, drawn over the 3D in an ink just
 * visible enough to register, so it sits back from every mark, with each
 * band's quiet label written in the same ink (D196).
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
  /** How much of a band's label shows, in the rule's ink: more than the rule, so its few words read, and still quiet beside every mark. */
  readonly labelOpacity: number;
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
  labelOpacity: 0.5,
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
 * the share of a mark's light the bloom sees, and of a ribbon's; and how
 * long one wave of a swaying ribbon runs along its bow, in layout units
 * (Q84), beside how far and how fast it sways, which are the scene's
 * (`RIBBON_SWAY`, `RIBBON_SWAY_HZ`).
 */
export type WeatherLook = {
  readonly reachGain: number;
  readonly reachBloom: number;
  readonly reachBodyGain: number;
  readonly reachSoften: number;
  readonly markBloom: number;
  readonly ribbonBloom: number;
  readonly ribbonWave: number;
};

// The reach's gain starts under the spike's 1.05: under AgX, added to the lit albedo and bloomed, that read as a white wash where the sheet lays a warm tint, so it opens lower for the panel to tune (D156).
export const WEATHER: WeatherLook = { reachGain: 0.7, reachBloom: 0.2, reachBodyGain: 1.1, reachSoften: 2, markBloom: 1, ribbonBloom: 0.3, ribbonWave: 24 };

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
 *
 * The levels rest parked (D204 (parked-levels)): the world is one lit surface
 * at every zoom, and nothing opens, cross-fades or changes mode as the wheel
 * turns. The first gate rests at 0 and 0, so no zoom the camera reaches reads
 * the far field, which is the map unlit; the two deep gates rest out of
 * the camera's reach, so the file's plate and the diff's sheet never open; and
 * `autoOpen` rests at 0, so no cell opens as a slide by the share of the
 * screen it fills. `autoOpen` is the one switch that brings the old levels
 * back: above 0 the scene's own gates (`LOD_GATES`), which are as they were,
 * stand in for all of `gates` but the first, so the plate and the sheet come
 * back with the slide, and no slide opens by a selection. The first gate
 * stays the token's under the switch (`gatesOf` in `opened.ts`, D240
 * (far-zoom-lit)): the planet that stood over the far field is deleted (D213
 * (planet-goes)), and nothing is left to draw there but the dark.
 * `openOnSelect` is the one way a slide opens at rest (D205
 * (open-on-select)): selecting a module opens it in place, whatever the zoom.
 * What the levels showed resolves by its size on the screen instead (D206
 * (detail-by-size)): a file's name once its radius passes `fileNameFrom`
 * pixels, and its functions' granules between `granuleFrom` and
 * `granuleFull`.
 */
export type LevelsLook = {
  readonly gates: readonly LodGate[];
  readonly cellOpen: number;
  readonly cellClose: number;
  readonly cellHome: number;
  readonly compositeOpen: number;
  readonly compositeClose: number;
  /** Above 0, the old levels are on: the scene's own gates are read in place of `gates` past its first, which is read either way (D240 (far-zoom-lit)), a cell opens as a slide by the share of the free screen it fills, and a click opens one that would hold. At 0 none of it is, and `gates` is read whole. */
  readonly autoOpen: number;
  /** Above 0, selecting a module opens it as the living slide in place, and clearing the selection closes it. At 0, and while `autoOpen` is above 0, a selection is only ringed and named. */
  readonly openOnSelect: number;
  /** The radius on the screen, in pixels, from which a file's name is written unasked, and from which a view moved by hand stands at the file under its centre (D230 (file-stop-by-size)). */
  readonly fileNameFrom: number;
  /** A function's granule fades in as its radius on the screen grows from `granuleFrom` pixels, where none of it shows, to `granuleFull`, where all of it does. */
  readonly granuleFrom: number;
  readonly granuleFull: number;
};

export const LEVELS: LevelsLook = {
  gates: [{ enter: 0, exit: 0 }, { enter: 6, exit: 5 }, { enter: 1000000, exit: 1000000 }, { enter: 1000000, exit: 1000000 }],
  cellOpen: CELL_GATE.open,
  cellClose: CELL_GATE.close,
  cellHome: CELL_GATE.home,
  compositeOpen: COMPOSITE_GATE.open,
  compositeClose: COMPOSITE_GATE.close,
  autoOpen: 0,
  openOnSelect: 1,
  fileNameFrom: 18,
  granuleFrom: 1.5,
  granuleFull: 4,
};

/**
 * The hover (step 38): the thing under the pointer is outlined in this ink at
 * this width, a flat annotation in the chrome's manner that never blooms
 * (D12); a file answers the pointer this many pixels past its edge, so one too
 * small to aim at still does; and its tag stands this many pixels right of and
 * below the pointer. The selection beside it (D207 (click-selects)): what a
 * click selects is ringed steadily in `selectInk` at `selectWidth`, the
 * hover's own ink drawn heavier, so it reads over a hover and claims no
 * state's hue; and a press is a click while it moves no more than `clickSlop`
 * pixels and lasts no longer than `clickMs` milliseconds.
 */
export type HoverLook = {
  readonly ink: string;
  readonly width: number;
  readonly slop: number;
  readonly tagGap: number;
  readonly selectInk: string;
  readonly selectWidth: number;
  readonly clickSlop: number;
  readonly clickMs: number;
};

export const HOVER: HoverLook = { ink: '#e6edf3', width: 1.5, slop: 4, tagGap: 14, selectInk: '#e6edf3', selectWidth: 2.5, clickSlop: 4, clickMs: 400 };

/**
 * The walk's framing (step 39): a stop the camera flies to fills this share of
 * the free screen in whichever of its width and height it fills first, and a
 * file is framed with this many of its radii of ground round its centre. The
 * tab opens with the ground the world draws filling the same share, which is
 * where the walk flies for the field (D222 (terrain-frame)). A view that came
 * to rest under `fieldZoom` times the zoom the field is framed at stands at
 * the field whatever lies under its centre (D219 (field-by-zoom), D223
 * (field-over-frame)): the far field's level said so until it was parked, at
 * the zoom its gate stood at over the fit, which is where the field is framed
 * while the old levels are back.
 */
export type WalkLook = {
  readonly share: number;
  readonly fileContext: number;
  readonly fieldZoom: number;
};

export const WALK: WalkLook = { share: 0.8, fileContext: 6, fieldZoom: 1.7 };

/**
 * An opened cell's slide (§5.6's inside, step 40): warm and clinical where
 * the surface is dark. The slide's ground and how opaque it is; the membrane's
 * ink, drawn round the files as the frame; each body's fill and stroke, the
 * stroke this wide in layout units; how much of the change hue a stained body
 * takes; how much darker than its body a nucleus's granules are drawn, 0 to
 * 1 (D197); how far above the cell's highest relief the slide floats, in the
 * heightfield's units; how the membrane writes the exports; and how far the
 * held files gather toward the slide's middle (D199). Every body is unlit and nothing here blooms.
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
  readonly granuleShade: number;
};

export const INTERIOR: InteriorLook = { ...INTERIOR_LAYOUT, slide: '#efe6d3', slideOpacity: 0.94, frame: '#1e2733', body: '#b9a9cc', bodyStroke: '#6f5f8a', strokeWidth: 1, stainShare: 1, lift: 4, granuleShade: 0.35 };

/**
 * The side panels (D208 (side-panels)): the inspector's width in pixels,
 * laid over the map beside the notice column, and the size its code and diff
 * are set at; and the folder tree's row height and the indent of each depth,
 * in pixels.
 */
export type PanelLook = {
  readonly inspectorWidth: number;
  readonly codeSize: number;
  readonly treeRow: number;
  readonly treeIndent: number;
};

export const PANEL: PanelLook = { inspectorWidth: 420, codeSize: 11, treeRow: 16, treeIndent: 10 };
