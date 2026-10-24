/**
 * draw: the world under a map, the three.js half of the app (D91). One
 * `WebGPURenderer`, falling back to WebGL 2 by itself unless the view forces
 * it (D132); the near-black field (§5.6, D11); step 24's heightfield as the
 * one soft skin over step 25's tissue, lit by one key light and an ambient,
 * with a dark sky for its sheen (D151); every placed file as one instanced
 * mesh on it; and one render loop, which asks the scheduler for every frame
 * (step 29, C12): the settle's amplitude and lift, and the levels of detail,
 * which keep the key light and the sky off at the far field and bring them,
 * and the organelles, up as the surface resolves. The frame goes through one
 * post-processing pass whose bloom reads the emissive target alone, so base
 * tissue never blooms and only a state's light does (D11, D12, D152). Every
 * material and the scheduler read their tokens through the registry (D156):
 * the cheap ones each frame, and the sky and the relief laid again on the
 * frame after one of their tokens moves. The terrain is framed in the screen
 * left of the shore rail (D153). The canvas says which backend drew it and
 * when the skin has settled, for the smoke test and a screenshot to wait on.
 */

import { AgXToneMapping, AmbientLight, Color, DirectionalLight, RenderPipeline, Scene, Vector3, WebGPUCoordinateSystem, WebGPURenderer } from 'three/webgpu';
import { emissive, mrt, output, pass } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { FIELD_FILL, MOTION_TOKENS, RELIEF, createScheduler, gridFor } from 'scene';
import type { MapJson } from 'core';

import { RAIL_WIDTH } from '../fit.js';
import { BLOOM, LIGHTING, SKIN, SKY } from '../materials.js';
import type { Registry } from '../registry.js';
import type { View } from '../view.js';
import { createCamera, frameCamera } from './camera.js';
import { ORGANELLE_LOOK, createOrganelles } from './organelles.js';
import { RESOLUTION, createSkin } from './skin.js';
import { createSky } from './sky.js';

/** How far off the key light stands: far enough that its direction is one across the layout. */
const CAMERA_REACH = 1000;

/** Draw the world for a map into the canvas, keep it fitted to the window beside the rail, and run its one loop. */
export const drawWorld = async (canvas: HTMLCanvasElement, map: MapJson, view: View, registry: Registry): Promise<void> => {
  const lighting = registry.view(LIGHTING, 'LIGHTING');
  const skyLook = registry.view(SKY, 'SKY');
  const skinLook = registry.view(SKIN, 'SKIN');
  const bloomLook = registry.view(BLOOM, 'BLOOM');
  const relief = registry.view(RELIEF, 'RELIEF');
  const tokens = registry.view({ ...MOTION_TOKENS, FIELD_FILL, ...ORGANELLE_LOOK });

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
  const skin = createSkin(map, skinLook, relief);
  scene.add(skin.mesh);
  const organelles = createOrganelles(map, skin.relief, gridFor(map, RESOLUTION), skin.amp, skin.lift, tokens);
  scene.add(...organelles.meshes);

  // The frame through one pass with an emissive target beside its colour, and the bloom over that target alone (D152).
  const post = new RenderPipeline(renderer);
  const scenePass = pass(scene, camera, { samples: 4 });
  scenePass.setMRT(mrt({ output, emissive }));
  const glow = bloom(scenePass.getTextureNode('emissive'), bloomLook.strength, bloomLook.radius, bloomLook.threshold);
  post.outputNode = scenePass.getTextureNode('output').add(glow);

  const fit = (): void => {
    const { clientWidth, clientHeight } = canvas;
    renderer.setPixelRatio(globalThis.devicePixelRatio);
    renderer.setSize(clientWidth, clientHeight, false);
    frameCamera(camera, map, clientWidth, clientHeight, { right: RAIL_WIDTH }, view);
  };
  fit();
  globalThis.addEventListener('resize', fit);

  // The two layers laid on the CPU are laid again on the next frame after one of their tokens moves, once however many moved.
  let reliefMoved = false;
  let skyMoved = false;
  registry.subscribe((name) => {
    if (name.startsWith('RELIEF.')) reliefMoved = true;
    if (name.startsWith('SKY.')) skyMoved = true;
  });

  const scheduler = createScheduler({
    clock: () => performance.now(),
    seed: view.seed,
    tiers: map.notices.map((notice) => notice.tier),
    reduced: globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches,
    tokens,
  });
  scheduler.load();
  await renderer.setAnimationLoop(() => {
    if (reliefMoved) {
      skin.relayer();
      reliefMoved = false;
    }
    if (skyMoved) {
      sky.dispose();
      sky = createSky(skyLook);
      scene.environment = sky;
      skyMoved = false;
    }
    const frame = scheduler.frame(view.zoom);
    // The surface's layer: 0 at the far field, 1 from LOD1 on, cross-faded between (D151).
    const surface = frame.lod?.opacity[1] ?? 0;
    skin.amp.value = frame.amp;
    skin.lift.value = frame.lift;
    skin.surface.value = surface;
    skin.restyle();
    organelles.surface.value = surface;
    organelles.restyle();
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
    if (frame.lift === 0) canvas.dataset['world'] = 'settled';
  });
};
