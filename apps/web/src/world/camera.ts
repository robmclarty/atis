/**
 * camera: an orthographic camera hung over the ground plane, which holds the
 * map's x along x and its y along z, looking down with the map's top at the
 * top of the screen, driven by `camera-controls` (D91, step 37). Scroll and
 * pinch zoom continuously toward the cursor, a drag pans, the right button or
 * three fingers tilt and rotate, and the tilt stops at the view's bound (§5.6);
 * nothing moves on its own (§5.5): no inertia, only a short smoothing so a
 * wheel's steps read as one continuous zoom. At zoom 1 the frustum fits the
 * layout inside the free screen beside the chrome (`fit.ts`), the far field,
 * and the camera's zoom over that is the one scalar the levels of detail read
 * (`lod.ts`). The page's `?zoom=` and `?tilt=` set the opening frame, a tilt
 * from the south-west as the spike's tilted frames were taken.
 */

import CameraControls from 'camera-controls';
import { Box3, Matrix4, OrthographicCamera, Quaternion, Raycaster, Sphere, Spherical, Vector2, Vector3, Vector4 } from 'three/webgpu';
import type { MapJson } from 'core';

import { fitFrame } from '../fit.js';
import type { Chrome } from '../fit.js';
import { MAX_TILT } from '../view.js';
import type { View } from '../view.js';

// The controls take the subset of three they do their arithmetic with, from the build the world draws with, so one copy of three loads.
CameraControls.install({ THREE: { Vector2, Vector3, Vector4, Quaternion, Matrix4, Spherical, Box3, Sphere, Raycaster } });

/** The ground the camera frames when the map has no layout to size it by. */
const UNLAID = { width: 1, height: 1 };

/** How far from the layout's centre the camera hangs: an orthographic view does not change with it, so long as the terrain stays between its planes. */
const CAMERA_DISTANCE = 1000;

/** Which way round the centre a tilted opening frame stands, in radians from the south: the spike's tilted frames. Overhead, the view keeps north up. */
const TILT_AZIMUTH = (-25 * Math.PI) / 180;

/** How far the zoom may go: a little out past the fit, and in past the deepest level's gate (`lod.ts`). */
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 200;

/**
 * How long the camera takes to settle on an input, in seconds: long enough
 * that a wheel's steps read as one continuous zoom, short enough that nothing
 * coasts once the pointer stops. Baked here until the world's own tokens are
 * recorded (step 44).
 */
const SMOOTH_S = 0.1;
const DRAG_SMOOTH_S = 0.05;

/** A camera over the ground plane, between planes the terrain never leaves. */
export const createCamera = (): OrthographicCamera => {
  const camera = new OrthographicCamera();
  camera.near = 1;
  camera.far = 2 * CAMERA_DISTANCE;
  return camera;
};

/**
 * Fit the frustum to the canvas, symmetric about the camera's target, so the
 * controls' zoom toward the cursor holds the point under it still; the
 * controls own the position and the zoom. The layout centres in the free
 * screen beside the chrome by where the target starts (`createControls`),
 * not by the frustum.
 */
export const fitCamera = (camera: OrthographicCamera, map: MapJson, canvasWidth: number, canvasHeight: number, chrome: Chrome): void => {
  const { halfW, halfH } = fitFrame(map.terrain.layout ?? UNLAID, canvasWidth, canvasHeight, chrome);
  camera.left = -halfW;
  camera.right = halfW;
  camera.top = halfH;
  camera.bottom = -halfH;
  camera.updateProjectionMatrix();
};

/** The pointer's actions on the camera: the left button or one finger pans, the wheel or two fingers zoom, the right button or three fingers tilt and rotate. */
const bind = (controls: CameraControls): void => {
  controls.mouseButtons.left = CameraControls.ACTION.TRUCK;
  controls.mouseButtons.middle = CameraControls.ACTION.TRUCK;
  controls.mouseButtons.right = CameraControls.ACTION.ROTATE;
  controls.mouseButtons.wheel = CameraControls.ACTION.ZOOM;
  controls.touches.one = CameraControls.ACTION.TOUCH_TRUCK;
  controls.touches.two = CameraControls.ACTION.TOUCH_ZOOM_TRUCK;
  controls.touches.three = CameraControls.ACTION.TOUCH_ROTATE;
};

/**
 * Hang the controls on the canvas, the camera over the layout's centre at the
 * view's zoom and tilt, and apply them once so the first frame is framed. The
 * target stands right of the layout's centre by the fit's shift, so the layout
 * opens centred in the free screen left of the chrome (`fit.ts`).
 */
export const createControls = (camera: OrthographicCamera, canvas: HTMLCanvasElement, map: MapJson, view: View, chrome: Chrome): CameraControls => {
  const layout = map.terrain.layout ?? UNLAID;
  const { shift } = fitFrame(layout, canvas.clientWidth, canvas.clientHeight, chrome);
  const cx = layout.width / 2 + shift;
  const cz = layout.height / 2;
  const controls = new CameraControls(camera, canvas);
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = (MAX_TILT * Math.PI) / 180;
  controls.minZoom = MIN_ZOOM;
  controls.maxZoom = MAX_ZOOM;
  controls.dollyToCursor = true;
  controls.smoothTime = SMOOTH_S;
  controls.draggingSmoothTime = DRAG_SMOOTH_S;
  bind(controls);
  void controls.setLookAt(cx, CAMERA_DISTANCE, cz, cx, 0, cz, false);
  void controls.rotateTo(view.tilt > 0 ? TILT_AZIMUTH : 0, (view.tilt * Math.PI) / 180, false);
  void controls.zoomTo(view.zoom, false);
  controls.update(0);
  return controls;
};
