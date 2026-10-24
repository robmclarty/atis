/**
 * sky: what the wet sheen mirrors (D151). An overhead camera sees the zenith
 * in every flat face, so the sky is black overhead and a blue-grey band below
 * about 60° of elevation, with three soft boxes round the key light: flat
 * tissue reflects darkness, and only the flanks of a swell catch the light.
 * The spike found three's room environment greyed the whole field this way.
 * It is an equirectangular data texture laid on the CPU, as the scene's other
 * soft layers are (D152), which the physical material filters into its
 * reflection levels.
 */

import { Color, DataTexture, DataUtils, EquirectangularReflectionMapping, HalfFloatType, LinearFilter, LinearSRGBColorSpace, RGBAFormat } from 'three/webgpu';

/** The sky's light, at the values the materials spike left them (D151), one object for the dev panel to move (D156). */
type SkyLook = {
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

const SKY: SkyLook = {
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

/** Texels round the sky and up it; soft light needs few. */
const WIDTH = 256;
const HEIGHT = 128;

/** A smooth step from 0 at `from` to 1 at `to`, either way round. */
const ease = (from: number, to: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

/** The sky as a texture, laid once; its light is linear, so the texture says so. */
export const createSky = (look: SkyLook = SKY): DataTexture => {
  const band = new Color(look.band);
  const box = new Color(look.box);
  const boxes = look.boxes.map(([x, y, z, gain]) => {
    const length = Math.hypot(x, y, z);
    return { x: x / length, y: y / length, z: z / length, gain };
  });
  const data = new Uint16Array(WIDTH * HEIGHT * 4);
  for (let row = 0; row < HEIGHT; row += 1) {
    // three reads an equirectangular texture with v rising from the nadir to the zenith and u round from +x through +z.
    const elevation = ((row + 0.5) / HEIGHT - 0.5) * Math.PI;
    const y = Math.sin(elevation);
    const level = Math.cos(elevation);
    const bandAt = ease(look.bandTop[1], look.bandTop[0], y) * ease(look.horizon[0], look.horizon[1], y) * look.bandGain;
    for (let column = 0; column < WIDTH; column += 1) {
      const azimuth = ((column + 0.5) / WIDTH - 0.5) * 2 * Math.PI;
      const x = level * Math.cos(azimuth);
      const z = level * Math.sin(azimuth);
      const boxesAt = boxes.reduce((sum, b) => sum + Math.max(0, x * b.x + y * b.y + z * b.z) ** look.boxFocus * b.gain, 0);
      const i = (row * WIDTH + column) * 4;
      data[i] = DataUtils.toHalfFloat(band.r * bandAt + box.r * boxesAt);
      data[i + 1] = DataUtils.toHalfFloat(band.g * bandAt + box.g * boxesAt);
      data[i + 2] = DataUtils.toHalfFloat(band.b * bandAt + box.b * boxesAt);
      data[i + 3] = DataUtils.toHalfFloat(1);
    }
  }
  const sky = new DataTexture(data, WIDTH, HEIGHT, RGBAFormat, HalfFloatType);
  sky.mapping = EquirectangularReflectionMapping;
  sky.colorSpace = LinearSRGBColorSpace;
  sky.minFilter = LinearFilter;
  sky.magFilter = LinearFilter;
  sky.generateMipmaps = false;
  sky.needsUpdate = true;
  return sky;
};
