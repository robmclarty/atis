/**
 * view: how the page asks to see the world, read from its query string: the
 * opening frame, which the camera's controls move from (step 37), and the
 * instruments the smoke test and a screenshot set it by. `?backend=webgl`
 * forces three's WebGL 2 fallback, the path the smoke test renders on (D132).
 * `?zoom=2` is the camera's zoom over the zoom that fits the whole layout, the
 * one scalar the levels of detail read (`lod.ts`), so 1 opens on the far field
 * and 1.7 enters the surface. `?tilt=35` tips the camera that many degrees
 * off overhead, where the wet sheen reads (D151). `?seed=7` seeds the
 * scheduler, so one seed and one time give one frame (D94, C3).
 */

/** The renderer's backend: three's `WebGPURenderer`, falling back by itself, or its WebGL 2 backend forced. */
export type Backend = 'webgpu' | 'webgl';

export type View = {
  readonly backend: Backend;
  /** The camera's zoom over the fit zoom; 1 is the opening frame. */
  readonly zoom: number;
  /** Degrees off overhead, 0 to `MAX_TILT`. */
  readonly tilt: number;
  /** The scheduler's seed. */
  readonly seed: number;
};

/** How far the camera tips off overhead, where the materials spike's controls stopped; step 37's camera keeps the bound. */
export const MAX_TILT = 35;
/** The seed the world opens with when the page names none: the spike's. */
export const DEFAULT_SEED = 7;

/** A parameter as a number, or the fallback when it is absent or not one. */
const numberOr = (value: string | null, fallback: number): number => {
  const n = value === null || value === '' ? Number.NaN : Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/** The view the page asks for; every parameter it leaves out or gets wrong takes the opening frame's value. */
export const viewOf = (search: string): View => {
  const params = new URLSearchParams(search);
  const zoom = numberOr(params.get('zoom'), 1);
  return {
    backend: params.get('backend') === 'webgl' ? 'webgl' : 'webgpu',
    zoom: zoom > 0 ? zoom : 1,
    tilt: Math.min(MAX_TILT, Math.max(0, numberOr(params.get('tilt'), 0))),
    seed: Math.trunc(numberOr(params.get('seed'), DEFAULT_SEED)),
  };
};
