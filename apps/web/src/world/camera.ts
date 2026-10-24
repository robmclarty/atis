/**
 * camera: an orthographic camera hung over the ground plane, which holds the
 * map's x along x and its y along z, looking down with z running down the
 * screen as y does in the SVG. At zoom 1 it fits the layout inside the free
 * screen beside the chrome (`fit.ts`), the far field, and the view's zoom
 * scales from there: the one scalar the levels of detail read (`lod.ts`). A
 * tilt swings it off overhead about the layout's centre, from the south-west
 * as the spike's tilted frames were taken, up to the view's bound. Step 37's
 * controls take over from here.
 */

import { OrthographicCamera } from 'three/webgpu';
import type { MapJson } from 'core';

import { fitFrame } from '../fit.js';
import type { Chrome } from '../fit.js';
import type { View } from '../view.js';

/** The ground the camera frames when the map has no layout to size it by. */
const UNLAID = { width: 1, height: 1 };

/** How far from the layout's centre the camera hangs: an orthographic view does not change with it, so long as the terrain stays between its planes. */
const CAMERA_DISTANCE = 1000;

/** Which way round the centre a tilted camera stands, in radians from the south: the spike's tilted frames. */
const TILT_AZIMUTH = (-25 * Math.PI) / 180;

/** A camera over the ground plane, with the map's top at the top of the screen. */
export const createCamera = (): OrthographicCamera => {
  const camera = new OrthographicCamera();
  camera.up.set(0, 0, -1);
  return camera;
};

/** Fit the layout inside the canvas's free screen, centred there, at the view's zoom and tilt. */
export const frameCamera = (camera: OrthographicCamera, map: MapJson, canvasWidth: number, canvasHeight: number, chrome: Chrome, view: View): void => {
  const layout = map.terrain.layout ?? UNLAID;
  const { halfW, halfH, shift } = fitFrame(layout, canvasWidth, canvasHeight, chrome);
  const polar = (view.tilt * Math.PI) / 180;
  const cx = layout.width / 2;
  const cz = layout.height / 2;
  camera.position.set(
    cx + CAMERA_DISTANCE * Math.sin(polar) * Math.sin(TILT_AZIMUTH),
    CAMERA_DISTANCE * Math.cos(polar),
    cz + CAMERA_DISTANCE * Math.sin(polar) * Math.cos(TILT_AZIMUTH),
  );
  camera.lookAt(cx, 0, cz);
  // The view stands right of the layout's centre by the shift, so the layout centres in the free screen left of the chrome.
  camera.left = -halfW + shift;
  camera.right = halfW + shift;
  camera.top = halfH;
  camera.bottom = -halfH;
  camera.near = 1;
  camera.far = 2 * CAMERA_DISTANCE;
  camera.zoom = view.zoom;
  camera.updateProjectionMatrix();
};
