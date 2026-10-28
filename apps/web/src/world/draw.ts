/**
 * draw: the world under a map, the three.js half of the app (D91). One
 * `WebGPURenderer`, falling back to WebGL 2 by itself unless the view forces
 * it (D132); the near-black field, a ground like space with faint stars on
 * it and a translucent rule at each band's boundary over the canvas, no band
 * stepping the skin (§5.6, D11, D169); step 24's heightfield as the
 * one soft skin over step 25's tissue, lit by one key light and an ambient,
 * with a dark sky for its sheen (D151); every placed file as one instanced
 * mesh on it; and one render loop, which asks the scheduler for every frame
 * (step 29, C12): the settle's amplitude and lift, and the levels of detail,
 * which keep the key light and the sky off at the far field and bring them,
 * the organelles and the weather's surface marks up as the surface resolves.
 * The far zoom is a dark planet under its dependencies' stars, on a canvas of
 * its own over the world's (D170): it grows as the view comes in until it
 * fills the frame, and LOD1's cross-fade hands it to the flat world; while it
 * shows, the pointer hovers nothing on the flat ground beneath it. The weather is
 * step 26's derivation drawn: the reach in the skin, every mark on a file as
 * one instanced mesh, the storms as bolts, the exceptional edges as ribbons,
 * and the slot names and old paths as flat tags over the canvas (step 33).
 * The notices take §5.4's tiers (step 34): the primary's halo and ring and
 * every noticed file's stain follow the scheduler's light for their notice,
 * so the primary breathes and flares at its anchor (D148), and the labels
 * layer writes each notice's label with its leader and its run of boxes at
 * step 27's placements, laid again whenever the view, the level of detail,
 * a token or what it is asked for changes: it writes no word unasked, only
 * the labels and tags of the file or cell under the pointer and of the
 * target of the notice row the pointer is over, the boxes always (D168). The
 * frame goes through one
 * post-processing pass whose bloom reads the emissive target alone, so base
 * tissue never blooms and only a state's light does (D11, D12, D152). Every
 * material and the scheduler read their tokens through the registry (D156):
 * the cheap ones each frame, and the sky and the relief laid again on the
 * frame after one of their tokens moves. The terrain is framed in the screen
 * left of the shore rail (D153). The pointer is picked against the scene's
 * own geometry where its ray meets the skin, and the thing under it is
 * outlined and tagged at the scheduler's eased hover (step 38). The chrome's
 * line (`nav.ts`) hears the view's outline on the ground for the minimap,
 * and moves the camera where the minimap asks (D154). A notice's row, the
 * arrows, Enter and Escape fly the camera to a stop along the scheduler's
 * fly-to, and the skin swings as it lands; the stop goes back over the line
 * for the HUD's breadcrumb (step 39). A target an agent names over
 * `atis mcp` flies there too, and is lit: its labels written until the
 * reader takes the camera, and a notice flared at its anchor (D178). From the surface on, the innermost cell
 * under the view's centre opens as a stained slide once its skin fills the
 * cell gate's share of the free screen, if its slide shows files (step 40,
 * D155, D165), a single-file module opening as the package it floats in
 * (D167): the scene lays it and
 * its bodies, which float where the scheduler floats them, slowly and on the
 * screen's scale, the surface's files and marks in it give way beneath, the
 * labels leave its files to the slide's own tags, which show in its exploded
 * view or one at a time under the pointer (D168), and the pointer picks and
 * clicks its bodies where they have floated, a click on one keeping the cell
 * open; it holds while the view stays inside it and closes on zooming out
 * past the gate's lesser share, Esc, a click on open ground or leaving it.
 * Once a cell has closed, the surface draws its files, and the marks on them,
 * where they last floated, and the scheduler eases them home only as the view
 * climbs on toward the field, so the slide and the surface read as one. With
 * `x`, or the breadcrumb's button, spreading its exploded view, and `w`, or
 * the breadcrumb's other button, laying its wiring out on a plate in the
 * chrome (step 41). The canvas says which backend drew it, when the skin has
 * settled, which cell is open and whether its wiring is drawn, and how many
 * files the surface draws where they floated, for the smoke test and a
 * screenshot to wait on. The page's `?time=` freezes the scheduler's clock
 * at a set time, so a capture takes one frame (D105), and its `?cinema`
 * frames a still on what the change is about, as the comment's flat still is
 * framed, across the whole canvas, opening no slide (D108, D175). Under
 * `prefers-reduced-motion` the
 * scheduler stills the world (§5.5, C12): the primary keeps a static halo for
 * its load flare, nothing settles, breathes, flares or jiggles, the shapes and
 * the drift hold still, and a fly-to, a slide and the exploded view cut; the
 * camera's controls smooth nothing either, and the canvas says the motion is
 * reduced (step 42). It is read once, as the world is drawn. Once the first
 * complete frame, every layer drawn once, is on the screen, the canvas raises
 * its ready flag and the page marks the moment `atis:ready`, which the budget
 * script times the first frame by and a capture waits on (step 43, D105); the
 * canvas also says which level of detail it draws at. On a map of a range,
 * the scrubber's step to another commit cross-fades the weather over the one
 * terrain (D100): that frame's marks, tags and labels are laid as a layer of
 * their own and fade in as the last frame's fade out, the skin's reach and
 * the planet's lights mixing the same way, at the scheduler's cross-fade and
 * cut under reduced motion (C12), the relief, the tissue and the files never
 * moving (P2); the canvas says which frame it shows and when the fade has
 * settled. A map a watch pushes on the ground drawn cross-fades its weather
 * in the same way, and the canvas counts the maps it took (D106). On a
 * whole repo's map the overlay the HUD's toggles show is laid
 * with the weather's marks, and a toggle cross-fades to the next the same way
 * (D101); the canvas says which overlay it shows and when that fade has
 * settled. Past LOD3's gate the file nearest the view's centre, a floating
 * body of the opened cell first, opens onto its plate: its functions as
 * granules, its hunks, the changed lines no test ran and its live mutants
 * on the strip of its lines, cross-faded in at LOD3's layer (§6, D102); the
 * canvas names the file it opens. Past LOD4's gate a changed file's plate
 * cross-fades to its diff on a sheet of the chrome: the diff the serving
 * CLI answers at `/diff/<path>` with the run's token, its hunks' heads linked
 * to the file in the reader's editor beside the PR the page was told of, or,
 * for a fixture with no server, the hunks' line ranges alone (D93, D102); the
 * canvas names the file whose diff it shows. Past 5,000 files each package
 * stands at the surface as one composite, Nx style, until the view nears it
 * (step 66, C14): the skin wears the package's own tissue with its cells'
 * mass laid flat, its files give way, and the pointer finds the package; a
 * package opens into its cells once its skin fills the composite gate's share
 * of the free screen, at the scheduler's cross-fade, and every package is
 * open from the cell's level on. The canvas says how many stand closed.
 */

import { AgXToneMapping, AmbientLight, Color, DataUtils, DirectionalLight, RenderPipeline, Scene, Vector3, WebGPUCoordinateSystem, WebGPURenderer } from 'three/webgpu';
import { emissive, mrt, output, pass } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { CINEMA, FIELD_FILL, LOD_GATES, MOTION_TOKENS, REACH_ORIGIN_OPACITY, RELIEF, cellSlide, cellWiring, cinemaFocus, compositesOf, compositesOpen, createPicker, createScheduler, fileLevelOf, fillOf, gridFor, instances, interiorOf, planetShown, slideCellOf, surfacePoint } from 'scene';
import type { FileLevel, Lod, Pick, Point, Slide } from 'scene';
import type { MapJson, OverlayName } from 'core';

import { RAIL_WIDTH, zoomFor } from '../fit.js';
import { askedOf, slideWords } from '../asked.js';
import { diffLevelOf, loadDiff } from '../diff.js';
import type { DiffAnswer, DiffLevel } from '../diff.js';
import { litIn, revealGroup } from '../highlight.js';
import type { Highlight } from '../highlight.js';
import { hoverOf } from '../hover.js';
import type { Hovered } from '../hover.js';
import { marksOf } from '../marks.js';
import { BLOOM, CAMERA, HOVER, INTERIOR, LEVELS, LIGHTING, NOTICE, PLANET, SKIN, SKY, SPACE, WALK, WEATHER } from '../materials.js';
import type { Nav } from '../nav.js';
import { frameMap, lastFrame as ownFrame } from '../frames.js';
import { shownOverlay } from '../overlays.js';
import type { OverlayAsk } from '../overlays.js';
import { categoryHue, runsOf } from '../notices.js';
import { CLOSED, OPEN_LOD, openedBy, openedOf } from '../opened.js';
import type { OpenState } from '../opened.js';
import type { Registry } from '../registry.js';
import type { View } from '../view.js';
import { FIELD, createWalk, ownsKey } from '../walk.js';
import type { Stop } from '../walk.js';
import { sameGround } from '../watch.js';
import type { Framing } from '../watch.js';
import { createBolts } from './bolts.js';
import type { Bolts } from './bolts.js';
import { DIFF_LOOK, createDiffSheet } from './diff.js';
import { FILE_LOOK, createFilePlate } from './file.js';
import { centreOn, clampZoom, createCamera, createControls, fitCamera, outlineOf, pixelsPerUnit, rayAt, smoothControls, standAt, standOf } from './camera.js';
import type { Stand } from './camera.js';
import { TAG_LOOK, createHover } from './hover.js';
import { SLIDE_CHROME, createInterior } from './interior.js';
import { LABEL_LOOK, createLabels, viewportOf } from './labels.js';
import type { Labels } from './labels.js';
import { ORGANELLE_LOOK, createOrganelles } from './organelles.js';
import { PALETTE_LOOK, createPalette } from './palette.js';
import type { Palette } from './palette.js';
import { createPlanet } from './planet.js';
import { createRibbons } from './ribbons.js';
import type { Ribbons } from './ribbons.js';
import { createSectors } from './sectors.js';
import type { Sectors } from './sectors.js';
import { createSkin } from './skin.js';
import { createSky } from './sky.js';
import { createSpace } from './space.js';

/** How far off the key light stands: far enough that its direction is one across the layout. */
const CAMERA_REACH = 1000;

/** A press that moves no further than this, in pixels, and lasts no longer than this, is a click. */
const CLICK_SLOP = 4;
const CLICK_MS = 400;

/** A stretch of the layout: the box round some points on it. */
type Box = { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };

const boxOf = (points: readonly Point[] | undefined): Box | undefined =>
  points === undefined || points.length === 0 ? undefined : { x0: Math.min(...points.map(([x]) => x)), y0: Math.min(...points.map(([, y]) => y)), x1: Math.max(...points.map(([x]) => x)), y1: Math.max(...points.map(([, y]) => y)) };

const overlaps = (a: Box, b: Box): boolean => a.x0 <= b.x1 && a.x1 >= b.x0 && a.y0 <= b.y1 && a.y1 >= b.y0;

/** One frame's weather as the world draws it over the one terrain (D100): its map, its palette, its marks on the GPU and its tags and labels over the canvas, taken off the page once it has faded out. */
type WeatherLayer = {
  readonly map: MapJson;
  readonly palette: Palette;
  readonly sectors: Sectors;
  readonly bolts: Bolts;
  readonly ribbons: Ribbons;
  readonly labels: Labels;
  readonly dispose: () => void;
};

/** What the page holds beyond the map: the run's token, which a served path asks for and a fixture has none of (D134), and the PR the page was told of. */
export type PageLinks = { readonly token?: string | undefined; readonly pr?: string | undefined };

/** Draw the world for a map into the canvas, keep it fitted to the window beside the rail, run its one loop, and keep the chrome's line to it (`nav.ts`). */
export const drawWorld = async (canvas: HTMLCanvasElement, map: MapJson, view: View, registry: Registry, nav: Nav, links: PageLinks = {}): Promise<void> => {
  const lighting = registry.view(LIGHTING, 'LIGHTING');
  const skyLook = registry.view(SKY, 'SKY');
  const skinLook = registry.view(SKIN, 'SKIN');
  const bloomLook = registry.view(BLOOM, 'BLOOM');
  const weatherLook = registry.view(WEATHER, 'WEATHER');
  const noticeLook = registry.view(NOTICE, 'NOTICE');
  const labelLook = registry.view(LABEL_LOOK);
  const relief = registry.view(RELIEF, 'RELIEF');
  const tokens = registry.view({ ...MOTION_TOKENS, FIELD_FILL, REACH_ORIGIN_OPACITY, ...ORGANELLE_LOOK, ...PALETTE_LOOK });

  const renderer = new WebGPURenderer({ canvas, antialias: true, forceWebGL: view.backend === 'webgl' });
  await renderer.init();
  // AgX, not the spike's Neutral: Neutral takes a black point off every colour, which zeroes the red of a graphite this dark and leaves blue-black.
  renderer.toneMapping = AgXToneMapping;
  canvas.dataset['backend'] = renderer.coordinateSystem === WebGPUCoordinateSystem ? 'webgpu' : 'webgl';

  const { width, height } = map.terrain.layout ?? { width: 0, height: 0 };
  const centre = new Vector3(width / 2, 0, height / 2);
  const scene = new Scene();
  const camera = createCamera();
  const background = new Color(tokens.FIELD_FILL);
  scene.background = background;
  let sky = createSky(skyLook);
  scene.environment = sky;
  const key = new DirectionalLight(lighting.key, lighting.keyIntensity);
  key.target.position.copy(centre);
  scene.add(key, key.target);
  const ambient = new AmbientLight(lighting.ambient, lighting.ambientIntensity);
  scene.add(ambient);
  // Past 5,000 files each package stands as one composite at the surface until the camera nears it (step 66).
  const composites = compositesOf(map);
  const skin = createSkin(map, skinLook, weatherLook, tokens, relief, composites);
  scene.add(skin.mesh);
  // The field is space (D169): faint stars on the open ground and past it, and a rule at each band's boundary over the canvas.
  const space = createSpace(map, registry.view(SPACE, 'SPACE'));
  scene.add(space.mesh);
  const grid = gridFor(map, skin.resolution);
  const organelles = createOrganelles(map, skin.relief, grid, skin.amp, skin.lift, tokens, composites, skin.composites);
  scene.add(...organelles.meshes);
  // The tags over the canvas: a layer of their own between the canvas and the chrome, at each point's resting height on the skin.
  const heightAt = (x: number, y: number): number => {
    const column = Math.min(grid.columns - 1, Math.max(0, Math.round(x / grid.resolution)));
    const row = Math.min(grid.rows - 1, Math.max(0, Math.round(y / grid.resolution)));
    const field = skin.relief.image.data;
    const i = (row * grid.columns + column) * 4;
    return field instanceof Uint16Array ? DataUtils.fromHalfFloat(field[i] ?? 0) + DataUtils.fromHalfFloat(field[i + 1] ?? 0) : 0;
  };
  /** A frame's weather laid as a layer of its own, with a whole repo's overlay shown: its marks in the scene, in its category's palette, and its tags and labels for the page. */
  const layerOf = (frame: MapJson, overlay: OverlayName | undefined): WeatherLayer => {
    const palette = createPalette(tokens, frame.weather.checks.category);
    const marks = marksOf(frame, overlay);
    const sectors = createSectors(marks.sectors, skin.relief, grid, skin.amp, skin.lift, organelles.surface, palette);
    const bolts = createBolts(marks.bolts, skin.relief, grid, skin.amp, skin.lift, organelles.surface, palette);
    const ribbons = createRibbons(marks.ribbons, skin.relief, grid, skin.amp, skin.lift, organelles.surface, palette);
    scene.add(sectors.mesh, ribbons.mesh, bolts.mesh);
    const labels = createLabels(frame, marks.labels, heightAt, palette, labelLook);
    const dispose = (): void => {
      scene.remove(sectors.mesh, ribbons.mesh, bolts.mesh);
      for (const layer of [sectors, bolts, ribbons, labels]) layer.dispose();
    };
    return { map: frame, palette, sectors, bolts, ribbons, labels, dispose };
  };
  // The overlay a whole repo's map shows, its default until a toggle asks for another (D101).
  let shownName = shownOverlay(map, nav.overlay());
  if (map.overlays !== undefined) canvas.dataset['overlay'] = shownName ?? 'none';
  // The frame of a range shown, the map's own weather at first, and the one it fades from while a scrub's cross-fade runs (D100).
  let current = layerOf(map, shownName);
  let fading: WeatherLayer | undefined;
  const layers = (): readonly WeatherLayer[] => (fading === undefined ? [current] : [current, fading]);
  // The hover's outline lies under the labels and its tag over them (step 38).
  const hoverLook = registry.view(HOVER, 'HOVER');
  const hover = createHover(heightAt, hoverLook, registry.view(TAG_LOOK));
  // The opened cell's slide (step 40): its meshes in the scene, its leaders under the labels, and its words over every other layer the world lays over the canvas (D185).
  const interiorLook = registry.view(INTERIOR, 'INTERIOR');
  const interior = createInterior(heightAt, skin.resolution, interiorLook, registry.view(SLIDE_CHROME));
  scene.add(...interior.meshes);
  // The far zoom's planet (D170): over the rules, which are the flat world's, and under everything else.
  const planet = createPlanet(map, registry.view(PLANET, 'PLANET'), () => ({ change: tokens.CHANGE_HUE, ifr: tokens.IFR_HUE, category: categoryHue(current.map.weather.checks.category, tokens), field: tokens.FIELD_FILL }));
  // The file level's plate (§6's LOD3, D102): over the slide's leaders and the labels, under the hover's tag and the slide's words; the diff level's sheet over the plate it cross-fades from.
  const filePlate = createFilePlate(registry.view(FILE_LOOK));
  const diffSheet = createDiffSheet(registry.view(DIFF_LOOK));
  // The layers over the canvas in the order they stack, each over the one before it and all of them under the chrome.
  canvas.after(space.rules, planet.element, interior.leaders, hover.outline, ...current.labels.elements, filePlate.element, diffSheet.element, hover.tag, interior.words);
  // Which cell is open, the slide laid for it, and the level the last frame was drawn at, which a click is read against.
  let opening: OpenState = CLOSED;
  let slide: Slide | undefined;
  let slideCell: string | undefined;
  let lastLod: Lod = 0;
  let exploded = false;
  // The index of the notice whose light each target's stain follows inside the slide (step 34), for the frame shown.
  let lightOf = new Map(runsOf(map).map((run) => [run.target, run.light] as const));
  // The highest the skin rises at rest, where a ray under the pointer starts its walk down to it.
  const highest = (): number => {
    let top = 0;
    for (let row = 0; row < grid.rows; row += 1) for (let column = 0; column < grid.columns; column += 1) top = Math.max(top, heightAt(column * grid.resolution, row * grid.resolution));
    return top + 1;
  };
  let top = highest();

  // The frame through one pass with an emissive target beside its colour, and the bloom over that target alone (D152).
  const post = new RenderPipeline(renderer);
  const scenePass = pass(scene, camera, { samples: 4 });
  scenePass.setMRT(mrt({ output, emissive }));
  const glow = bloom(scenePass.getTextureNode('emissive'), bloomLook.strength, bloomLook.radius, bloomLook.threshold);
  post.outputNode = scenePass.getTextureNode('output').add(glow);

  // The labels are placed again on the next frame after the view, the level of detail, a token or what they are asked for changes:
  // the file or cell under the pointer on the field, the target of the notice row it is over (D168), else the target an agent lit (D178).
  let placeLabels = true;
  let fieldTarget: string | undefined;
  let rowTarget: string | undefined;
  let litTarget: string | undefined;
  const barrelOf = new Map(map.terrain.cells.map((cell) => [cell.id, cell.barrel] as const));
  let placedLod: number | undefined;
  // The free screen beside the rail, or the whole canvas in a still for a comment, which draws no chrome (D108).
  const chrome = { right: view.cinema === true ? 0 : RAIL_WIDTH };
  const fit = (): void => {
    const { clientWidth, clientHeight } = canvas;
    renderer.setPixelRatio(globalThis.devicePixelRatio);
    renderer.setSize(clientWidth, clientHeight, false);
    fitCamera(camera, map, clientWidth, clientHeight, chrome);
    placeLabels = true;
  };
  fit();
  globalThis.addEventListener('resize', fit);
  const reduced = globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
  canvas.dataset['motion'] = reduced ? 'reduced' : 'full';
  // A still opens on what the change is about, the rail's room given to the world, framed as the comment's flat still frames it (D108, D175).
  const opened = view.cinema === true ? { ...view, ...cinemaFocus(map, canvas.clientWidth, canvas.clientHeight, registry.view(CINEMA, 'CINEMA')) } : view;
  const controls = createControls(camera, canvas, map, opened, chrome, reduced);
  const cameraLook = registry.view(CAMERA, 'CAMERA');
  const levels = registry.view(LEVELS, 'LEVELS');
  // The labels ride their anchors while the camera moves and are laid out afresh once it rests.
  controls.addEventListener('rest', () => {
    placeLabels = true;
  });

  // The pointer is picked again on the next frame after it moves, leaves, or the camera moves under it (step 38).
  const picker = createPicker(map);
  let pointer: { readonly x: number; readonly y: number } | undefined;
  let pickAgain = false;
  let pickedLod: number | undefined;
  canvas.addEventListener('pointermove', (event) => {
    pointer = { x: event.clientX, y: event.clientY };
    pickAgain = true;
  });
  canvas.addEventListener('pointerleave', () => {
    pointer = undefined;
    pickAgain = true;
  });
  controls.addEventListener('update', () => {
    pickAgain = true;
  });
  /** The layout point under a point of the page: where its ray meets the skin. */
  const groundAt = (at: { readonly x: number; readonly y: number }): Point | undefined => {
    const box = canvas.getBoundingClientRect();
    return surfacePoint(...rayAt(camera, ((at.x - box.left) / box.width) * 2 - 1, 1 - ((at.y - box.top) / box.height) * 2), heightAt, top);
  };
  // The packages drawn as one this frame, which answer the pointer as one (step 66).
  let closedComposites: ReadonlySet<string> = new Set();
  // Each placed file's cell and radius, for a file the surface draws where it last floated.
  const placed = new Map(instances(map).map((file) => [file.id, file] as const));
  // The files of a closed cell the surface draws where they last floated (D165), as the scheduler last said.
  let floatedOnSurface: ReadonlyMap<string, Point> = new Map();
  /** The body of the opened cell under a layout point, where it has floated, a file reaching `slop` past its edge. */
  const bodyAt = (ground: Point, slop: number): (typeof bodies)[number] | undefined => {
    if (slide === undefined || opening.open !== slide.cell) return undefined;
    let hit: { readonly body: (typeof bodies)[number]; readonly gap: number } | undefined;
    for (const body of interior.bodies()) {
      const gap = Math.hypot(ground[0] - body.x, ground[1] - body.y) - body.r;
      if (gap <= slop && (hit === undefined || gap < hit.gap)) hit = { body, gap };
    }
    return hit?.body;
  };
  /** A file the surface draws where it last floated, under a layout point, a file reaching `slop` past its edge. */
  const floatedAt = (ground: Point, slop: number): Pick | undefined => {
    let hit: { readonly pick: Pick; readonly gap: number } | undefined;
    for (const [path, [x, y]] of floatedOnSurface) {
      const file = placed.get(path);
      const gap = file === undefined ? Number.POSITIVE_INFINITY : Math.hypot(ground[0] - x, ground[1] - y) - file.r;
      if (file !== undefined && gap <= slop && (hit === undefined || gap < hit.gap)) hit = { pick: { kind: 'organelle', path, cell: file.cell, x, y, r: file.r }, gap };
    }
    return hit?.pick;
  };
  /** What lies under a layout point at a level of detail, as the world draws it: the opened cell's bodies and the surface's floated files where they float, else what the picker finds where the layout put it. */
  const pickAt = (ground: Point, lod: Lod, slop: number): Pick | undefined => {
    const body = bodyAt(ground, slop);
    if (body !== undefined && slide !== undefined) return { kind: 'organelle', path: body.id, cell: slide.cell, x: body.x, y: body.y, r: body.r };
    const floated = lod === 0 ? undefined : floatedAt(ground, slop);
    if (floated !== undefined) return floated;
    const pick = picker.pick(ground, lod, slop, closedComposites);
    // Under the open slide, a module that floats on it answers as the slide's ground, its skin and its file's place alike (D167).
    const shown = slide !== undefined && opening.open === slide.cell ? slide.cell : undefined;
    if (pick !== undefined && shown !== undefined && slideCellOf(map, pick.cell) === shown && (pick.kind === 'organelle' || pick.cell !== shown)) return { kind: 'membrane', cell: shown };
    // A file drawn where it floated has left where the layout put it, so the picker's place for it answers as its cell.
    return pick?.kind === 'organelle' && floatedOnSurface.has(pick.path) ? { kind: 'membrane', cell: pick.cell } : pick;
  };
  /** The thing under a point of the page at a level of detail, picked with the hover's reach past a file's edge; a floated file where it has floated. */
  const hoveredAt = (at: { readonly x: number; readonly y: number }, lod: Lod): Hovered | undefined => {
    const ground = groundAt(at);
    if (ground === undefined) return undefined;
    const pick = pickAt(ground, lod, hoverLook.slop / pixelsPerUnit(camera, canvas.clientWidth));
    // Inside the opened cell a file is hovered in the outline it is drawn in, pulsing as the scheduler moves it.
    const body = pick?.kind === 'organelle' && slide !== undefined && pick.cell === slide.cell ? interior.bodies().find((each) => each.id === pick.path) : undefined;
    const hovered = pick === undefined ? undefined : hoverOf(current.map, pick);
    return hovered === undefined || body === undefined ? hovered : { ...hovered, ring: body.outline.ring };
  };
  let bodies: ReturnType<typeof interiorOf> = [];
  // The file the plate opens, the map it was read from, the plate as the scene lays it, and the change's entry for it, which only a changed file has (D102).
  let fileFocus: string | undefined;
  let fileMap: MapJson | undefined;
  let fileLevel: FileLevel | undefined;
  let fileChanged: MapJson['weather']['changed'][number] | undefined;
  // Each map's diffs as the server answered them, asked for once a file's diff level first shows, and the level as last read (D102).
  const diffAnswers = new WeakMap<MapJson, Map<string, DiffAnswer>>();
  let diffRead: { readonly map: MapJson; readonly path: string; readonly answer: DiffAnswer | undefined; readonly level: DiffLevel } | undefined;
  /** A changed file's diff level in `frame`: its diff asked of the server the first time, when the page has the run's token, and read as far as the answer has come. */
  const diffLevelFor = (frame: MapJson, file: NonNullable<typeof fileChanged>): DiffLevel => {
    const answers = diffAnswers.get(frame) ?? new Map<string, DiffAnswer>();
    diffAnswers.set(frame, answers);
    const { token } = links;
    if (token !== undefined && !answers.has(file.path)) {
      answers.set(file.path, { status: 'loading' });
      void loadDiff(file.path, token, (url) => fetch(url)).then((answer) => answers.set(file.path, answer));
    }
    const answer = answers.get(file.path);
    if (diffRead?.map !== frame || diffRead.path !== file.path || diffRead.answer !== answer) diffRead = { map: frame, path: file.path, answer, level: diffLevelOf(file, answer, links.pr) };
    return diffRead.level;
  };
  /** The file nearest a layout point: among the opened cell's bodies where they float, else among the placed files where they stand. */
  const nearestFile = ([x, y]: Point): { readonly id: string; readonly x: number; readonly y: number } | undefined => {
    const positions = map.terrain.layout?.positions ?? {};
    const candidates = bodies.length > 0 ? bodies.map((body) => ({ id: body.id, x: body.x, y: body.y })) : map.terrain.organelles.flatMap((organelle) => {
      const floated = floatedOnSurface.get(organelle.id);
      const at = floated === undefined ? positions[organelle.id] : { x: floated[0], y: floated[1] };
      return at === undefined ? [] : [{ id: organelle.id, x: at.x, y: at.y }];
    });
    let nearest: { readonly id: string; readonly x: number; readonly y: number } | undefined;
    let gap = Number.POSITIVE_INFINITY;
    for (const candidate of candidates) {
      const away = Math.hypot(candidate.x - x, candidate.y - y);
      if (away < gap) {
        gap = away;
        nearest = candidate;
      }
    }
    return nearest;
  };
  let lastFrame = performance.now();

  // The two layers laid on the CPU are laid again on the next frame after one of their tokens moves, once however many moved.
  let reliefMoved = false;
  let skyMoved = false;
  registry.subscribe((name) => {
    if (name.startsWith('RELIEF.')) reliefMoved = true;
    if (name.startsWith('SKY.')) skyMoved = true;
    placeLabels = true;
  });

  // A capture freezes the clock, so one seed and one time give one frame however long the page took (D94, D105).
  const { time: frozen } = view;
  const scheduler = createScheduler({
    clock: frozen === undefined ? () => performance.now() : () => frozen,
    seed: view.seed,
    tiers: map.notices.map((notice) => notice.tier),
    reduced,
    tokens,
  });
  scheduler.load();

  /** Take the open cell's next state: the scheduler opens or closes the slide, the skin swings as a cell opens, and the chrome hears of it. */
  const apply = (next: OpenState): void => {
    if (next.open !== opening.open) {
      scheduler.open(next.open);
      if (next.open === undefined) delete canvas.dataset['open'];
      else {
        scheduler.jiggle();
        canvas.dataset['open'] = next.open;
      }
    }
    if (next.exploded !== opening.exploded) scheduler.explode(next.exploded);
    if (next.wired) canvas.dataset['wired'] = 'on';
    else delete canvas.dataset['wired'];
    opening = next;
    nav.open(openedOf(next));
  };
  // A click on the canvas, a press of the left button that neither moved nor lingered, opens the cell under it or closes the open one (D155).
  let pressed: { readonly x: number; readonly y: number; readonly at: number } | undefined;
  canvas.addEventListener('pointerdown', (event) => {
    pressed = event.button === 0 ? { x: event.clientX, y: event.clientY, at: performance.now() } : undefined;
  });
  canvas.addEventListener('pointerup', (event) => {
    const press = pressed;
    pressed = undefined;
    if (press === undefined || Math.hypot(event.clientX - press.x, event.clientY - press.y) > CLICK_SLOP || performance.now() - press.at > CLICK_MS) return;
    const ground = groundAt({ x: event.clientX, y: event.clientY });
    // A file of the opened cell answers the click where it has floated, so a click on it keeps its cell open (D165); a module answers as the package it floats in (D167); a cell whose slide shows no files answers as open ground.
    const found = ground === undefined ? undefined : pickAt(ground, lastLod, 0);
    const picked = found === undefined ? undefined : { ...found, cell: slideCellOf(map, found.cell) };
    const pick = picked?.kind === 'membrane' && !withFiles.has(picked.cell) ? undefined : picked;
    apply(openedBy(opening, { kind: 'click', lod: lastLod, pick, holds: holdsIn(boxOf(outlineOf(camera, canvas.clientWidth, chrome))) }));
  });

  // The walk (step 39): the stop the view stands at, and the flight under way to the next one, eased by the scheduler's fly-to.
  const walk = createWalk(map);
  const walkLook = registry.view(WALK, 'WALK');
  const layout = map.terrain.layout ?? { width: 1, height: 1 };

  // The cell's gate (D165): a cell's box, the share of the free screen its skin fills at the camera's zoom, the cell to open under a point, and whether a cell holds open.
  const cellBoxes = new Map<string, Box | undefined>();
  const cellBox = (cell: string): Box | undefined => {
    if (!cellBoxes.has(cell)) cellBoxes.set(cell, walk.box({ kind: 'cell', cell }, 1));
    return cellBoxes.get(cell);
  };
  /** The share of the free screen a stretch of the ground fills at the camera's zoom. */
  const fillOfBox = (box: Box): number => {
    const screen = { width: Math.max(1, canvas.clientWidth - chrome.right), height: canvas.clientHeight, pixelsPerUnit: pixelsPerUnit(camera, canvas.clientWidth) };
    return fillOf({ width: box.x1 - box.x0, height: box.y1 - box.y0 }, screen);
  };
  const fillOfCell = (cell: string): number => {
    const box = cellBox(cell);
    return box === undefined ? 0 : fillOfBox(box);
  };
  // A cell whose slide shows no files, a package whose files all sit in the folders it holds, has nothing to show but holes, so it never opens and its ground is open ground; a package of modules shows them (D167).
  const withFiles = new Set([...placed.values()].map((file) => slideCellOf(map, file.cell)));
  /** The innermost cell under a layout point, or the package a single-file module there floats in (D167), once its skin fills the gate's share of the free screen and its slide shows files: the cell that opens there. A cell that holds it never opens in its stead, so zooming in on a folder opens the folder. */
  const openableAt = (point: Point): string | undefined => {
    // A still for a comment stays on the surface: a slide opens only to a reader's zoom.
    if (view.cinema === true) return undefined;
    const under = picker.pick(point, 1, 0)?.cell;
    const cell = under === undefined ? undefined : slideCellOf(map, under);
    return cell !== undefined && withFiles.has(cell) && fillOfCell(cell) >= levels.cellOpen ? cell : undefined;
  };
  /** Whether a cell holds open with the view on this stretch of the ground: some of it in view, and filling at least the share it holds at. */
  const holdsIn =
    (seen: Box | undefined) =>
    (cell: string): boolean => {
      const box = cellBox(cell);
      return withFiles.has(cell) && box !== undefined && seen !== undefined && overlaps(box, seen) && fillOfCell(cell) >= levels.cellClose;
    };
  let stop: Stop = FIELD;
  let flight: { readonly from: Stand; readonly to: Point; readonly zoom: number } | undefined;
  // A hand on the camera ends any flight, and the stop is read back off the view once it rests; the opening frame is read so too.
  let handled = false;
  let readStop = true;
  const settle = (next: Stop): void => {
    stop = next;
    nav.settle(next);
  };
  const visit = (next: Stop): void => {
    const box = walk.box(next, walkLook.fileContext);
    const from = standOf(controls, camera, canvas.clientWidth, chrome);
    if (box === undefined || from === undefined) return;
    flight = { from, to: [(box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2], zoom: clampZoom(zoomFor(layout, box, canvas.clientWidth, canvas.clientHeight, chrome, walkLook.share)) };
    handled = false;
    readStop = false;
    settle(next);
    scheduler.flyTo();
  };
  const byHand = (): void => {
    flight = undefined;
    handled = true;
    // A hand on the camera puts out what an agent lit.
    if (litTarget === undefined) return;
    litTarget = undefined;
    placeLabels = true;
  };
  canvas.addEventListener('pointerdown', byHand);
  canvas.addEventListener('wheel', byHand, { passive: true });
  controls.addEventListener('rest', () => {
    if (handled) readStop = true;
    handled = false;
  });
  // The open cell's wiring is drawn only where some of the change's wiring reaches it, as the breadcrumb offers it only there.
  const wire = (): void => {
    if (opening.open !== undefined && cellWiring(source, opening.open) !== undefined) apply(openedBy(opening, { kind: 'wire' }));
  };
  // The map the weather comes from: the one drawn, until a watch pushes another over the same ground (D106).
  let source = map;
  // A step of the scrubber lays its frame's weather as the layer shown, and the one shown before fades out beneath it; a step taken mid-fade drops the layer already fading (D100).
  let shownFrame = ownFrame(map);
  let relaySlide = false;
  /** The weather of `next`, with the overlay shown, laid as the layer shown, and the one shown before fading out beneath it. */
  const relay = (next: MapJson): void => {
    fading?.dispose();
    fading = current;
    // The canvas says a fade is under way from the step itself, so a frame it names is never read as settled before the fade is drawn.
    if (shownFrame !== undefined) canvas.dataset['scrub'] = 'fading';
    if (map.overlays !== undefined) canvas.dataset['overlayFade'] = 'fading';
    current = layerOf(next, shownName);
    hover.tag.before(...current.labels.elements);
    skin.reach(next);
    planet.weather(next);
    lightOf = new Map(runsOf(next).map((run) => [run.target, run.light] as const));
    scheduler.scrub(next.notices.map((notice) => notice.tier));
    relaySlide = true;
    placeLabels = true;
  };
  const scrub = (index: number): void => {
    if (index === shownFrame) return;
    shownFrame = index;
    canvas.dataset['frame'] = String(index);
    relay(frameMap(source, index));
  };
  // A toggle shows another overlay of a whole repo's map, or none, cross-faded as a scrub is (D101).
  const overlay = (asked: OverlayAsk): void => {
    const name = shownOverlay(source, asked);
    if (name === shownName) return;
    shownName = name;
    canvas.dataset['overlay'] = name ?? 'none';
    relay(frameMap(source, shownFrame));
  };
  /**
   * A map a watch pushed (D106): on the ground the world draws, its weather
   * cross-fades in as a scrub's does, at its own frame, and the terrain never
   * moves (P2); the canvas counts the maps it took. On other ground, a file
   * added or gone, it names where the reader stands, so the page draws the
   * new ground afresh there.
   */
  const swap = (next: MapJson): Framing | undefined => {
    if (!sameGround(source, next)) {
      return { zoom: camera.zoom, tilt: (controls.polarAngle * 180) / Math.PI, centre: standOf(controls, camera, canvas.clientWidth, chrome)?.centre };
    }
    source = next;
    shownFrame = ownFrame(next);
    if (shownFrame === undefined) delete canvas.dataset['frame'];
    else canvas.dataset['frame'] = String(shownFrame);
    canvas.dataset['pushed'] = String(Number(canvas.dataset['pushed'] ?? '0') + 1);
    relay(frameMap(next, shownFrame));
    return undefined;
  };
  /**
   * What an agent named over `atis mcp` (D178), held to the map the world
   * draws: the camera flies to its stop, or the rail brings its shore
   * group's block into view, its labels are written as a notice row's hover
   * writes them until the reader takes the camera, and a notice flares at its
   * anchor, as the scheduler allows one flare in flight (C12). The canvas
   * names what was lit last.
   */
  const highlight = (asked: Highlight): void => {
    const lit = litIn(source, asked);
    if (lit === undefined) return;
    if (lit.destination.kind === 'stop') visit(lit.destination.stop);
    else revealGroup(lit.destination.group);
    litTarget = lit.target;
    placeLabels = true;
    if (lit.flare !== undefined) scheduler.flare(lit.flare);
    canvas.dataset['highlight'] = asked.kind === 'file' ? asked.path : `notice ${String(asked.rank)}`;
  };
  // The minimap asks for a place and the camera eases there (D154); a notice's row asks for a stop and the camera flies there; the breadcrumb's buttons ask for the exploded view and the wiring; the scrubber asks for a frame.
  nav.steer({
    lookAt: (point) => {
      byHand();
      centreOn(controls, camera, canvas.clientWidth, chrome, point);
    },
    visit,
    explode: () => apply(openedBy(opening, { kind: 'explode' })),
    wire,
    hover: (target) => {
      if (target === rowTarget) return;
      rowTarget = target;
      placeLabels = true;
    },
    scrub,
    overlay,
    swap,
    highlight,
  });
  // The arrows walk to a sibling, Enter descends and Escape ascends, unless the key is the focused element's own or the chrome already took it (an open legend folds away on Escape); with a cell open, Escape closes it first, x spreads or gathers its exploded view (D155), and w draws or takes away its wiring.
  globalThis.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || ownsKey(event.target, event.key)) return;
    if (event.key === 'Escape' && opening.open !== undefined) {
      event.preventDefault();
      apply(openedBy(opening, { kind: 'escape' }));
      return;
    }
    if (event.key === 'x' || event.key === 'X') {
      if (opening.open === undefined) return;
      event.preventDefault();
      apply(openedBy(opening, { kind: 'explode' }));
      return;
    }
    if (event.key === 'w' || event.key === 'W') {
      if (opening.open === undefined) return;
      event.preventDefault();
      wire();
      return;
    }
    const middle = standOf(controls, camera, canvas.clientWidth, chrome)?.centre;
    const next = middle === undefined ? undefined : walk.key(stop, event.key, middle);
    if (next === undefined) return;
    event.preventDefault();
    visit(next);
  });

  // The loop's passes so far: the first draws the first complete frame, and the second finds it on the screen.
  let passes = 0;
  let compositeOpen: readonly boolean[] = [];
  let shownLod: Lod | undefined;
  let floatedShown: number | undefined;
  let planetOn: boolean | undefined;
  await renderer.setAnimationLoop(() => {
    if (passes === 1) {
      performance.mark('atis:ready');
      canvas.dataset['ready'] = 'true';
    }
    passes = Math.min(passes + 1, 2);
    if (reliefMoved) {
      skin.relayer();
      top = highest();
      reliefMoved = false;
    }
    if (skyMoved) {
      sky.dispose();
      sky = createSky(skyLook);
      scene.environment = sky;
      skyMoved = false;
    }
    const now = performance.now();
    smoothControls(controls, cameraLook, reduced);
    controls.update((now - lastFrame) / 1000);
    lastFrame = now;
    // The minimap hears the view's outline only when it moved.
    const outline = outlineOf(camera, canvas.clientWidth, chrome);
    nav.show(outline);
    // Which composites are open: those the view has neared, from the last frame's level, and every one past the surface (step 66).
    const seen = boxOf(outline);
    compositeOpen = compositesOpen(
      compositeOpen,
      composites.map((composite) => ({ fill: fillOfBox(composite.box), seen: seen !== undefined && overlaps(composite.box, seen) })),
      lastLod,
      { open: levels.compositeOpen, close: levels.compositeClose },
    );
    // The camera's zoom over the fit is the one scalar the levels of detail read.
    const frame = scheduler.frame(camera.zoom, levels.gates, compositeOpen);
    if (composites.length > 0) {
      skin.openComposites(frame.composites);
      const closed = new Set(composites.flatMap((composite, index) => ((frame.composites[index] ?? 1) < 0.5 ? [composite.id] : [])));
      if (closed.size !== closedComposites.size || [...closed].some((id) => !closedComposites.has(id))) {
        closedComposites = closed;
        pickAgain = true;
      }
      const shown = `${String(compositeOpen.filter((open) => !open).length)}/${String(composites.length)}`;
      if (canvas.dataset['composites'] !== shown) canvas.dataset['composites'] = shown;
    }
    // The surface's layer: 0 at the far field, 1 from LOD1 on, cross-faded between (D151).
    const surface = frame.lod?.opacity[1] ?? 0;
    const lod = frame.lod?.lod ?? 0;
    lastLod = lod;
    if (lod !== shownLod) {
      shownLod = lod;
      canvas.dataset['lod'] = String(lod);
    }
    const middle = standOf(controls, camera, canvas.clientWidth, chrome)?.centre;
    // The opened cell (D155, D165): from the surface on, the innermost cell under the view's centre opens once it fills the gate's share, and holds while any of it stays in view at the share it holds at.
    const under = middle === undefined || lod < OPEN_LOD ? undefined : openableAt(middle);
    apply(openedBy(opening, { kind: 'frame', lod, under, holds: holdsIn(boxOf(outline)) }));
    // A flight moves the view along the scheduler's ease, centre straight across and zoom by its ratio, and the skin swings once it lands.
    if (flight !== undefined) {
      const progress = frame.fly ?? 1;
      const { from, to, zoom } = flight;
      standAt(controls, from, [from.centre[0] + (to[0] - from.centre[0]) * progress, from.centre[1] + (to[1] - from.centre[1]) * progress], from.zoom * (zoom / from.zoom) ** progress);
      controls.update(0);
      if (progress >= 1) {
        flight = undefined;
        scheduler.jiggle();
      }
    }
    if (readStop && flight === undefined) {
      if (middle !== undefined) settle(walk.stopAt(middle, lod));
      readStop = false;
    }
    // The slide (step 40): laid when the cell it shows changes, its bodies laid every frame where the scene has them, and the surface's files and marks in it giving way as it fades in.
    const open = frame.open;
    if (open.cell !== slideCell || relaySlide) {
      slideCell = open.cell;
      relaySlide = false;
      slide = open.cell === undefined ? undefined : cellSlide(current.map, open.cell, interiorLook);
      interior.slide(slide);
      placeLabels = true;
    }
    // The float (D165): measured on the free screen's shorter side, and a closed cell's files held where they floated until the view climbs on.
    const free = Math.max(1, canvas.clientWidth - chrome.right);
    const floated = scheduler.float(map, { screen: Math.min(free, canvas.clientHeight) / pixelsPerUnit(camera, canvas.clientWidth), fill: fillOfCell, gate: { open: levels.cellOpen, close: levels.cellClose, home: levels.cellHome } });
    floatedOnSurface = floated.surface;
    if (floated.surface.size !== floatedShown) {
      floatedShown = floated.surface.size;
      canvas.dataset['floated'] = String(floatedShown);
    }
    organelles.move(floated.surface);
    for (const layer of layers()) layer.sectors.move(floated.surface);
    bodies = slide === undefined || open.shown <= 0 ? [] : interiorOf(slide, { drifted: floated.open, reduced, explode: open.exploded, shape: scheduler.shape });
    interior.show(bodies, open.shown, (id) => {
      const light = lightOf.get(id);
      return light === undefined ? 1 : (frame.notices[light]?.gain ?? 1);
    });
    organelles.hide(slide?.cell, open.shown);
    for (const layer of layers()) layer.sectors.hide(slide?.cell, open.shown);
    if (open.exploded >= 1 !== exploded) {
      exploded = open.exploded >= 1;
      canvas.dataset['exploded'] = exploded ? 'on' : 'off';
    }
    // A scrub's cross-fade: the frame shown fades in as the one before it fades out, and that one goes once it has (D100).
    const mixed = frame.weather;
    if (fading !== undefined && mixed >= 1) {
      fading.dispose();
      fading = undefined;
    }
    const scrubbing = fading === undefined ? 'settled' : 'fading';
    if (canvas.dataset['scrub'] !== scrubbing && shownFrame !== undefined) canvas.dataset['scrub'] = scrubbing;
    if (canvas.dataset['overlayFade'] !== scrubbing && map.overlays !== undefined) canvas.dataset['overlayFade'] = scrubbing;
    skin.reachMix.value = mixed;
    skin.amp.value = frame.amp;
    skin.lift.value = frame.lift;
    skin.surface.value = surface;
    skin.restyle();
    space.restyle();
    organelles.surface.value = surface;
    // At the far field the files are not drawn at all, rather than drawn at no opacity, once the first frame has drawn them and laid their pipeline.
    for (const mesh of organelles.meshes) mesh.visible = surface > 0 || passes < 2;
    organelles.restyle();
    for (const layer of layers()) {
      layer.palette.restyle();
      layer.sectors.fade.value = layer === current ? mixed : 1 - mixed;
      layer.bolts.fade.value = layer.sectors.fade.value;
      layer.ribbons.fade.value = layer.sectors.fade.value;
      layer.sectors.halo.opacity.value = noticeLook.haloOpacity;
      layer.sectors.halo.bloom.value = noticeLook.haloBloom;
      layer.sectors.bloom.value = weatherLook.markBloom;
      layer.bolts.bloom.value = weatherLook.markBloom;
      layer.ribbons.bloom.value = weatherLook.ribbonBloom;
    }
    // The notices' lights are the shown frame's; the frame fading out holds the last it was given.
    current.sectors.light(frame.notices);
    background.set(tokens.FIELD_FILL);
    key.color.set(lighting.key);
    key.position.set(...lighting.keyFrom).multiplyScalar(CAMERA_REACH).add(centre);
    key.intensity = lighting.keyIntensity * surface;
    ambient.color.set(lighting.ambient);
    ambient.intensity = lighting.ambientIntensity * (lighting.ambientFloor + (1 - lighting.ambientFloor) * surface);
    scene.environmentIntensity = lighting.sky * surface;
    glow.strength.value = bloomLook.strength;
    glow.radius.value = bloomLook.radius;
    glow.threshold.value = bloomLook.threshold;
    post.render();
    space.render(camera, canvas.clientWidth, canvas.clientHeight);
    // The planet is LOD0's layer: whole at the far zoom, and faded out as the surface fades in past LOD1's gate.
    const planetLayer = frame.lod === undefined ? 1 : planetShown(frame.lod);
    planet.render(
      { camera, width: canvas.clientWidth, height: canvas.clientHeight, free, pixelsPerUnit: pixelsPerUnit(camera, canvas.clientWidth), centre: middle, zoom: camera.zoom, gate: levels.gates[0] ?? LOD_GATES[0] ?? { enter: 1.7, exit: 1.45 } },
      planetLayer,
      frame.notices.map((notice) => notice.gain),
      mixed,
    );
    if (planetLayer > 0 !== planetOn) {
      planetOn = planetLayer > 0;
      canvas.dataset['planet'] = planetOn ? 'on' : 'off';
    }
    if (placeLabels || lod !== placedLod) {
      for (const layer of layers()) layer.labels.place(viewportOf(camera, canvas.clientWidth), lod, slide, askedOf(fieldTarget, rowTarget ?? litTarget));
      placeLabels = false;
      placedLod = lod;
    }
    for (const layer of layers()) layer.labels.render(camera, canvas.clientWidth, canvas.clientHeight, surface * (layer === current ? mixed : 1 - mixed));
    // The file level (D102): past LOD3's gate the file nearest the view's centre, a floating body of the opened cell first, opens onto its plate.
    const fileShown = frame.lod?.opacity[3] ?? 0;
    const focus = fileShown <= 0 || middle === undefined ? undefined : nearestFile(middle);
    if (focus?.id !== fileFocus || current.map !== fileMap) {
      fileFocus = focus?.id;
      fileMap = current.map;
      fileLevel = focus === undefined ? undefined : fileLevelOf(current.map, focus.id);
      fileChanged = focus === undefined ? undefined : current.map.weather.changed.find((file) => file.path === focus.id);
      if (fileFocus === undefined) delete canvas.dataset['file'];
      else canvas.dataset['file'] = fileFocus;
    }
    // The diff level (D102): past LOD4's gate a changed file's plate gives way to its diff, on a sheet beneath the HUD.
    const diffShown = fileChanged === undefined ? 0 : (frame.lod?.opacity[4] ?? 0);
    const diffLevel = fileChanged === undefined || diffShown <= 0 ? undefined : diffLevelFor(current.map, fileChanged);
    if (diffLevel?.path !== canvas.dataset['diff']) {
      if (diffLevel === undefined) delete canvas.dataset['diff'];
      else canvas.dataset['diff'] = diffLevel.path;
    }
    filePlate.render(camera, canvas.clientWidth, canvas.clientHeight, free, focus === undefined ? undefined : new Vector3(focus.x, heightAt(focus.x, focus.y), focus.y), fileLevel, fileShown * (1 - diffShown));
    diffSheet.render(canvas.clientHeight, free, diffLevel, diffShown);
    const words = slideWords(open.exploded, fieldTarget, slide === undefined ? undefined : barrelOf.get(slide.cell));
    interior.render(camera, canvas.clientWidth, canvas.clientHeight, canvas.clientWidth - chrome.right, pixelsPerUnit(camera, canvas.clientWidth), open.exploded, words);
    // A slide's files float under a still pointer, so the hover follows them each frame while one shows.
    if (pickAgain || lod !== pickedLod || (bodies.length > 0 && !reduced)) {
      // On the planet the flat ground lies under it, so nothing there answers the pointer (D170).
      const hovered = pointer === undefined || lod === 0 ? undefined : hoveredAt(pointer, lod);
      hover.show(hovered, pointer);
      if (hovered?.target !== fieldTarget) {
        fieldTarget = hovered?.target;
        placeLabels = true;
      }
      scheduler.hover(hovered !== undefined);
      pickAgain = false;
      pickedLod = lod;
    }
    hover.render(camera, canvas.clientWidth, canvas.clientHeight, frame.hover);
    if (frame.lift === 0) canvas.dataset['world'] = 'settled';
  });
};
