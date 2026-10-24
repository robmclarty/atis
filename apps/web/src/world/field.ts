/**
 * field: the world's ground, and for now the whole world: the near-black
 * field the terrain will rise from (§5.6, D11), under an orthographic camera
 * looking straight down on the map's layout. three's `WebGPURenderer` falls
 * back to WebGL 2 by itself (D1, D91). Nothing here animates; a frame is
 * drawn when the map arrives and again when the window resizes, until the
 * scheduler takes the loop (step 30).
 */

import { Color, OrthographicCamera, Scene, WebGPURenderer } from 'three/webgpu';
import { FIELD_FILL } from 'scene';
import type { MapJson } from 'core';

/** The ground the camera frames when the map has no layout to size it by. */
const UNLAID = { width: 1, height: 1 };

/** How high over the ground the camera hangs; an orthographic view does not change with it, so long as the terrain stays below. */
const CAMERA_HEIGHT = 100;

/**
 * The camera hangs over the ground plane, which holds the map's x along x
 * and its y along z, and looks straight down with z running down the screen,
 * as y does in the SVG. It fits the layout's width and height inside the
 * canvas, centred.
 */
const frame = (camera: OrthographicCamera, map: MapJson, aspect: number): void => {
  const { width, height } = map.terrain.layout ?? UNLAID;
  const halfH = Math.max(height, width / aspect) / 2;
  const halfW = halfH * aspect;
  camera.position.set(width / 2, CAMERA_HEIGHT, height / 2);
  camera.lookAt(width / 2, 0, height / 2);
  camera.left = -halfW;
  camera.right = halfW;
  camera.top = halfH;
  camera.bottom = -halfH;
  camera.updateProjectionMatrix();
};

/** Draw the empty field for a map into the canvas, and keep it fitted to the window. */
export const drawField = async (canvas: HTMLCanvasElement, map: MapJson): Promise<void> => {
  const renderer = new WebGPURenderer({ canvas, antialias: true });
  await renderer.init();
  const scene = new Scene();
  scene.background = new Color(FIELD_FILL);
  const camera = new OrthographicCamera();
  camera.up.set(0, 0, -1);
  const draw = (): void => {
    const { clientWidth, clientHeight } = canvas;
    renderer.setPixelRatio(globalThis.devicePixelRatio);
    renderer.setSize(clientWidth, clientHeight, false);
    frame(camera, map, clientWidth / Math.max(1, clientHeight));
    renderer.render(scene, camera);
  };
  draw();
  globalThis.addEventListener('resize', draw);
};
