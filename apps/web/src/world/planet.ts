/**
 * planet: the far zoom drawn as a dark planet under its dependencies' stars
 * (D170), from `libs/scene/src/planet.ts`'s model, on a canvas of its own
 * over the world's, beneath the rules' and every other layer. Where LOD0's
 * layer shows, it lays the field's space over the world, then the stars,
 * then the sphere: a dark body whose pole touches the ground where the view
 * faces, so the camera's tilt and turn tip it as they tip the ground, each
 * lit file a light where it sits on it, the primary's breathing with its
 * notice, and the stars' light caught round its rim. Its layer fades as the
 * surface's fades in, so the cross-fade at LOD1's gate hands the planet,
 * filling the frame by then, to the flat world. Nothing on it moves of its
 * own: under reduced motion the notice's light holds, and so does it (C12).
 * The look comes through the registry (D156), each frame.
 */

import { Vector3 } from 'three/webgpu';
import type { Camera } from 'three/webgpu';
import { dependencyStars, facingOf, onPlanet, planetFill, planetLights, rimLight, wrapOf } from 'scene';
import type { DependencyStar, LodGate, Point, Rgb, StarHue } from 'scene';
import type { MapJson } from 'core';

import type { PlanetLook } from '../materials.js';

/** The hues the planet borrows from the sheet's tokens: the change's, IFR's, the map's category's, and the field's ground. */
export type PlanetHues = { readonly change: string; readonly ifr: string; readonly category: string; readonly field: string };

/** Where the view stands this frame: the camera, the canvas's size, the free screen's width beside the chrome, how many pixels a layout unit takes, the ground point it faces, the zoom over the fit, and LOD1's gate. */
export type PlanetFrame = {
  readonly camera: Camera;
  readonly width: number;
  readonly height: number;
  readonly free: number;
  readonly pixelsPerUnit: number;
  readonly centre: Point | undefined;
  readonly zoom: number;
  readonly gate: LodGate;
};

export type Planet = {
  /** The planet's canvas, over the world's. */
  readonly element: HTMLCanvasElement;
  /** Draw it for this frame, `shown` its layer's share, the notices' gains as the scheduler eases them; hidden at none. */
  readonly render: (frame: PlanetFrame, shown: number, gains: readonly number[]) => void;
};

/** How many samples round the rim the stars' light is laid at. */
const RIM_SAMPLES = 180;

/** A `#rrggbb` token as three shares of its sRGB value. */
const rgbOf = (hex: string): Rgb => {
  const n = Number.parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

const css = ([r, g, b]: Rgb, alpha = 1): string => `rgba(${String(Math.round(Math.min(1, r) * 255))}, ${String(Math.round(Math.min(1, g) * 255))}, ${String(Math.round(Math.min(1, b) * 255))}, ${String(Math.min(1, Math.max(0, alpha)))})`;

/** A point of light: a crisp core, and a faint glow from `share` of its brightness falling off round it, both added over what lies beneath. */
const glow = (context: CanvasRenderingContext2D, x: number, y: number, core: number, reach: number, colour: Rgb, alpha: number, share: number): void => {
  const halo = context.createRadialGradient(x, y, core, x, y, Math.max(reach, core + 0.5));
  halo.addColorStop(0, css(colour, alpha * share));
  halo.addColorStop(1, css(colour, 0));
  context.fillStyle = halo;
  context.beginPath();
  context.arc(x, y, Math.max(reach, core + 0.5), 0, 2 * Math.PI);
  context.fill();
  context.fillStyle = css(colour, alpha);
  context.beginPath();
  context.arc(x, y, core, 0, 2 * Math.PI);
  context.fill();
};

export const createPlanet = (map: MapJson, look: PlanetLook, hues: () => PlanetHues): Planet => {
  const layout = map.terrain.layout ?? { width: 1, height: 1 };
  const lights = planetLights(map);
  const element = document.createElement('canvas');
  element.dataset['planetLayer'] = '';
  element.dataset['stars'] = String(map.weather.dependencies?.length ?? 0);
  Object.assign(element.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', display: 'none' });
  const context = element.getContext('2d');
  // The rim is laid on a canvas of its own and masked to the limb before it is added over the planet.
  const rimCanvas = document.createElement('canvas');
  const rimContext = rimCanvas.getContext('2d');

  // The stars and the rim's light change only with the room, the look's shape or a hue, so they are laid again only then.
  let laid: { readonly key: string; readonly stars: readonly DependencyStar[]; readonly rim: Float32Array } | undefined;
  const starsFor = (room: { readonly x: number; readonly y: number }, colourOf: (hue: StarHue) => Rgb): NonNullable<typeof laid> => {
    const key = JSON.stringify([room, look.starNear, look.starGap, look.starSeed, look.rimSpread, (['ifr', 'amber', 'change', 'clean', 'unread'] as const).map(colourOf)]);
    if (laid?.key === key) return laid;
    const stars = dependencyStars(map, room, look);
    laid = { key, stars, rim: rimLight(stars, RIM_SAMPLES, colourOf, look) };
    return laid;
  };

  const point = new Vector3();
  const view = new Vector3();
  const project = (camera: Camera, width: number, height: number, x: number, y: number, z: number): Point => {
    point.set(x, y, z).project(camera);
    return [((point.x + 1) / 2) * width, ((1 - point.y) / 2) * height];
  };

  const render = (frame: PlanetFrame, shown: number, gains: readonly number[]): void => {
    if (shown <= 0 || context === null || rimContext === null || frame.centre === undefined) {
      element.style.display = 'none';
      return;
    }
    const { camera, width, height, free } = frame;
    const ratio = globalThis.devicePixelRatio;
    if (element.width !== Math.round(width * ratio) || element.height !== Math.round(height * ratio)) {
      for (const canvas of [element, rimCanvas]) {
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
      }
    }
    element.style.display = '';
    element.style.opacity = String(shown);
    const colours = hues();
    const hueOf: Readonly<Record<StarHue, string>> = { ifr: colours.ifr, amber: look.amber, change: colours.change, clean: look.clean, unread: look.unread };
    const colourOf = (hue: StarHue): Rgb => rgbOf(hueOf[hue]);

    // The planet's size on the screen, then in layout units, from the zoom; and the sphere under the facing point, its pole on the ground there.
    const halfDiagonal = Math.hypot(free, height) / 2;
    const radiusPx = planetFill(frame.zoom, frame.gate, look) * halfDiagonal;
    const radius = radiusPx / Math.max(frame.pixelsPerUnit, 1e-9);
    const facing = facingOf(frame.centre, layout);
    const wrap = wrapOf(radius, facing, layout, look.cap);
    const [cx, cy] = project(camera, width, height, facing[0], -radius, facing[1]);

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.globalCompositeOperation = 'source-over';
    context.fillStyle = colours.field;
    context.fillRect(0, 0, width, height);

    // The stars, placed in planet radii at the opening frame's size, part and leave the frame as the planet grows.
    const farRadius = look.farFill * halfDiagonal;
    const { stars, rim } = starsFor({ x: free / 2 / farRadius, y: height / 2 / farRadius }, colourOf);
    context.globalCompositeOperation = 'lighter';
    for (const star of stars) {
      const core = look.starMin + (look.starMax - look.starMin) * star.weight;
      glow(context, cx + star.x * radiusPx, cy + star.y * radiusPx, core, core * look.starGlow, colourOf(star.hue), look.starGain, look.glowShare);
    }

    // The dark body, a hair lighter at its middle.
    context.globalCompositeOperation = 'source-over';
    const body = context.createRadialGradient(cx, cy, 0, cx, cy, radiusPx);
    body.addColorStop(0, look.bodyCore);
    body.addColorStop(1, look.body);
    context.fillStyle = body;
    context.beginPath();
    context.arc(cx, cy, radiusPx, 0, 2 * Math.PI);
    context.fill();

    // Each lit file on the face the camera sees, dimming toward the limb, the size of its own disc on the sphere or at least `lightMin`.
    camera.getWorldDirection(view);
    context.save();
    context.clip();
    context.globalCompositeOperation = 'lighter';
    const scale = (radius / wrap) * frame.pixelsPerUnit;
    for (const light of lights) {
      const [x, y, z] = onPlanet([light.x, light.y], facing, radius, wrap);
      const facingCamera = -(x * view.x + y * view.y + z * view.z) / radius;
      if (facingCamera <= 0) continue;
      const [sx, sy] = project(camera, width, height, facing[0] + x, y - radius, facing[1] + z);
      const core = Math.max(look.lightMin, light.r * scale);
      const gain = light.notice < 0 ? 1 : (gains[light.notice] ?? 1);
      const colour = rgbOf(light.hue === 'category' ? colours.category : colours.change);
      glow(context, sx, sy, core, core * look.lightGlow, colour, look.lightGain * gain * Math.min(1, facingCamera / Math.max(look.limbFade, 1e-6)), look.glowShare);
    }
    context.restore();

    // The rim the stars light: their colours laid round the limb, masked to a band from inside it to a haze past it, added over the planet.
    if (stars.length > 0) {
      rimContext.setTransform(ratio, 0, 0, ratio, 0, 0);
      rimContext.globalCompositeOperation = 'source-over';
      rimContext.clearRect(0, 0, width, height);
      const round = rimContext.createConicGradient(0, cx, cy);
      for (let i = 0; i <= RIM_SAMPLES; i += 1) {
        const at = (i % RIM_SAMPLES) * 3;
        round.addColorStop(i / RIM_SAMPLES, css([(rim[at] ?? 0) * look.rimGain, (rim[at + 1] ?? 0) * look.rimGain, (rim[at + 2] ?? 0) * look.rimGain]));
      }
      const outer = radiusPx * (1 + look.rimHaze);
      rimContext.fillStyle = round;
      rimContext.fillRect(0, 0, width, height);
      rimContext.globalCompositeOperation = 'destination-in';
      const band = rimContext.createRadialGradient(cx, cy, Math.max(0, radiusPx * (1 - look.rimDepth)), cx, cy, outer);
      band.addColorStop(0, 'rgba(0, 0, 0, 0)');
      band.addColorStop(Math.min(0.99, (radiusPx - radiusPx * (1 - look.rimDepth)) / Math.max(1e-6, outer - radiusPx * (1 - look.rimDepth))), 'rgba(0, 0, 0, 1)');
      band.addColorStop(1, 'rgba(0, 0, 0, 0)');
      rimContext.fillStyle = band;
      rimContext.fillRect(0, 0, width, height);
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.globalCompositeOperation = 'lighter';
      context.drawImage(rimCanvas, 0, 0);
    }
    context.globalCompositeOperation = 'source-over';
  };

  return { element, render };
};
