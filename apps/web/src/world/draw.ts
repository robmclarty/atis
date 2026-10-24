/**
 * draw: the world under a map, the three.js half of the app (D91). One
 * `WebGPURenderer`, falling back to WebGL 2 by itself unless the view forces
 * it (D132); the near-black field (§5.6, D11); step 24's heightfield as the
 * one soft skin over step 25's tissue, lit by one key light and an ambient,
 * with a dark sky for its sheen (D151); every placed file as one instanced
 * mesh on it; and one render loop, which asks the scheduler for every frame
 * (step 29, C12): the settle's amplitude and lift, and the levels of detail,
 * which keep the key light and the sky off at the far field and bring them,
 * the organelles and the weather's surface marks up as the surface resolves,
 * the change's stains alone lighting the far field (§5.6). The weather is
 * step 26's derivation drawn: the reach in the skin, every mark on a file as
 * one instanced mesh, the storms as bolts, the exceptional edges as ribbons,
 * and the slot names and old paths as flat tags over the canvas (step 33).
 * The notices take §5.4's tiers (step 34): the primary's halo and ring and
 * every noticed file's stain follow the scheduler's light for their notice,
 * so the primary breathes and flares at its anchor (D148), and the labels
 * layer writes each notice's label with its leader and its run of boxes at
 * step 27's placements, laid again whenever the view, the level of detail
 * or a token changes. The frame goes through one
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
 * for the HUD's breadcrumb (step 39). The canvas says which
 * backend drew it and when the skin has settled, for the smoke test and a
 * screenshot to wait on.
 */

import { AgXToneMapping, AmbientLight, Color, DataUtils, DirectionalLight, RenderPipeline, Scene, Vector3, WebGPUCoordinateSystem, WebGPURenderer } from 'three/webgpu';
import { emissive, mrt, output, pass } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { FIELD_FILL, MOTION_TOKENS, REACH_ORIGIN_OPACITY, RELIEF, createPicker, createScheduler, gridFor, surfacePoint } from 'scene';
import type { Lod, Point } from 'scene';
import type { MapJson } from 'core';

import { RAIL_WIDTH, zoomFor } from '../fit.js';
import { hoverOf } from '../hover.js';
import type { Hovered } from '../hover.js';
import { marksOf } from '../marks.js';
import { BLOOM, HOVER, LIGHTING, NOTICE, SKIN, SKY, WALK, WEATHER } from '../materials.js';
import type { Nav } from '../nav.js';
import type { Registry } from '../registry.js';
import type { View } from '../view.js';
import { FIELD, createWalk, ownsKey } from '../walk.js';
import type { Stop } from '../walk.js';
import { createBolts } from './bolts.js';
import { centreOn, clampZoom, createCamera, createControls, fitCamera, outlineOf, pixelsPerUnit, rayAt, standAt, standOf } from './camera.js';
import type { Stand } from './camera.js';
import { TAG_LOOK, createHover } from './hover.js';
import { LABEL_LOOK, createLabels, viewportOf } from './labels.js';
import { ORGANELLE_LOOK, createOrganelles } from './organelles.js';
import { PALETTE_LOOK, createPalette } from './palette.js';
import { createRibbons } from './ribbons.js';
import { createSectors } from './sectors.js';
import { RESOLUTION, createSkin } from './skin.js';
import { createSky } from './sky.js';

/** How far off the key light stands: far enough that its direction is one across the layout. */
const CAMERA_REACH = 1000;

/** Draw the world for a map into the canvas, keep it fitted to the window beside the rail, run its one loop, and keep the chrome's line to it (`nav.ts`). */
export const drawWorld = async (canvas: HTMLCanvasElement, map: MapJson, view: View, registry: Registry, nav: Nav): Promise<void> => {
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
  const skin = createSkin(map, skinLook, weatherLook, tokens, relief);
  scene.add(skin.mesh);
  const grid = gridFor(map, RESOLUTION);
  const organelles = createOrganelles(map, skin.relief, grid, skin.amp, skin.lift, tokens);
  scene.add(...organelles.meshes);
  const palette = createPalette(tokens, map.weather.checks.category);
  const marks = marksOf(map);
  const sectors = createSectors(marks.sectors, skin.relief, grid, skin.amp, skin.lift, organelles.surface, palette);
  const bolts = createBolts(marks.bolts, skin.relief, grid, skin.amp, skin.lift, organelles.surface, palette);
  const ribbons = createRibbons(marks.ribbons, skin.relief, grid, skin.amp, skin.lift, organelles.surface, palette);
  scene.add(sectors.mesh, ribbons.mesh, bolts.mesh);
  // The tags over the canvas: a layer of their own between the canvas and the chrome, at each point's resting height on the skin.
  const heightAt = (x: number, y: number): number => {
    const column = Math.min(grid.columns - 1, Math.max(0, Math.round(x / grid.resolution)));
    const row = Math.min(grid.rows - 1, Math.max(0, Math.round(y / grid.resolution)));
    const field = skin.relief.image.data;
    const i = (row * grid.columns + column) * 4;
    return field instanceof Uint16Array ? DataUtils.fromHalfFloat(field[i] ?? 0) + DataUtils.fromHalfFloat(field[i + 1] ?? 0) : 0;
  };
  const labels = createLabels(map, marks.labels, heightAt, palette, labelLook);
  // The hover's outline lies under the labels and its tag over them (step 38).
  const hoverLook = registry.view(HOVER, 'HOVER');
  const hover = createHover(heightAt, hoverLook, registry.view(TAG_LOOK));
  canvas.after(hover.outline, ...labels.elements, hover.tag);
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

  // The labels are placed again on the next frame after the view, the level of detail or a token changes.
  let placeLabels = true;
  let placedLod: number | undefined;
  const fit = (): void => {
    const { clientWidth, clientHeight } = canvas;
    renderer.setPixelRatio(globalThis.devicePixelRatio);
    renderer.setSize(clientWidth, clientHeight, false);
    fitCamera(camera, map, clientWidth, clientHeight, { right: RAIL_WIDTH });
    placeLabels = true;
  };
  fit();
  globalThis.addEventListener('resize', fit);
  const controls = createControls(camera, canvas, map, view, { right: RAIL_WIDTH });
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
  /** The thing under a point of the page at a level of detail: where its ray meets the skin, picked with the hover's reach past a file's edge. */
  const hoveredAt = (at: { readonly x: number; readonly y: number }, lod: Lod): Hovered | undefined => {
    const box = canvas.getBoundingClientRect();
    const ground = surfacePoint(...rayAt(camera, ((at.x - box.left) / box.width) * 2 - 1, 1 - ((at.y - box.top) / box.height) * 2), heightAt, top);
    const pick = ground === undefined ? undefined : picker.pick(ground, lod, hoverLook.slop / pixelsPerUnit(camera, canvas.clientWidth));
    return pick === undefined ? undefined : hoverOf(map, pick);
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

  const scheduler = createScheduler({
    clock: () => performance.now(),
    seed: view.seed,
    tiers: map.notices.map((notice) => notice.tier),
    reduced: globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches,
    tokens,
  });
  scheduler.load();

  // The walk (step 39): the stop the view stands at, and the flight under way to the next one, eased by the scheduler's fly-to.
  const walk = createWalk(map);
  const walkLook = registry.view(WALK, 'WALK');
  const layout = map.terrain.layout ?? { width: 1, height: 1 };
  const chrome = { right: RAIL_WIDTH };
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
  };
  canvas.addEventListener('pointerdown', byHand);
  canvas.addEventListener('wheel', byHand, { passive: true });
  controls.addEventListener('rest', () => {
    if (handled) readStop = true;
    handled = false;
  });
  // The minimap asks for a place and the camera eases there (D154); a notice's row asks for a stop and the camera flies there.
  nav.steer({
    lookAt: (point) => {
      byHand();
      centreOn(controls, camera, canvas.clientWidth, chrome, point);
    },
    visit,
  });
  // The arrows walk to a sibling, Enter descends and Escape ascends, unless the key is the focused element's own.
  globalThis.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || ownsKey(event.target, event.key)) return;
    const middle = standOf(controls, camera, canvas.clientWidth, chrome)?.centre;
    const next = middle === undefined ? undefined : walk.key(stop, event.key, middle);
    if (next === undefined) return;
    event.preventDefault();
    visit(next);
  });

  await renderer.setAnimationLoop(() => {
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
    controls.update((now - lastFrame) / 1000);
    lastFrame = now;
    // The minimap hears the view's outline only when it moved.
    nav.show(outlineOf(camera, canvas.clientWidth, { right: RAIL_WIDTH }));
    // The camera's zoom over the fit is the one scalar the levels of detail read.
    const frame = scheduler.frame(camera.zoom);
    // The surface's layer: 0 at the far field, 1 from LOD1 on, cross-faded between (D151).
    const surface = frame.lod?.opacity[1] ?? 0;
    const lod = frame.lod?.lod ?? 0;
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
      const middle = standOf(controls, camera, canvas.clientWidth, chrome)?.centre;
      if (middle !== undefined) settle(walk.stopAt(middle, lod));
      readStop = false;
    }
    skin.amp.value = frame.amp;
    skin.lift.value = frame.lift;
    skin.surface.value = surface;
    skin.restyle();
    organelles.surface.value = surface;
    organelles.restyle();
    palette.restyle();
    sectors.light(frame.notices);
    sectors.halo.opacity.value = noticeLook.haloOpacity;
    sectors.halo.bloom.value = noticeLook.haloBloom;
    sectors.bloom.value = weatherLook.markBloom;
    bolts.bloom.value = weatherLook.markBloom;
    ribbons.bloom.value = weatherLook.ribbonBloom;
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
    if (placeLabels || lod !== placedLod) {
      labels.place(viewportOf(camera, canvas.clientWidth), lod);
      placeLabels = false;
      placedLod = lod;
    }
    labels.render(camera, canvas.clientWidth, canvas.clientHeight, surface);
    if (pickAgain || lod !== pickedLod) {
      const hovered = pointer === undefined ? undefined : hoveredAt(pointer, lod);
      hover.show(hovered, pointer);
      scheduler.hover(hovered !== undefined);
      pickAgain = false;
      pickedLod = lod;
    }
    hover.render(camera, canvas.clientWidth, canvas.clientHeight, frame.hover);
    if (frame.lift === 0) canvas.dataset['world'] = 'settled';
  });
};
