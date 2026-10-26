/**
 * planet: the far zoom as a dark planet under its dependencies' stars (D170).
 * The terrain is wrapped on a sphere whose pole touches the ground at the
 * point the view faces, each file the far field lights a point of light where
 * it sits on it and the rest of the sphere dark; round it hang the stars, one
 * per outside package the terrain imports, sized by how many files use it and
 * lit by its health, and their light catches the planet's rim.
 *
 * The planet's size is a share of the free screen's half-diagonal, read off
 * the camera's zoom over the fit: small at the opening frame, and growing as
 * the view comes in until, at the zoom LOD1 is left at, it reaches past the
 * frame's corners, so on either side of LOD1's gate the planet fills the
 * frame and the level's cross-fade hands it to the flat world, or back, with
 * no blink. Its layer is LOD0's alone, gone wherever the surface shows.
 *
 * A layout point keeps its arc length from the facing point on the sphere, so
 * a planet many frames wide is the flat ground near the pole and the lights
 * meet the world's own at the hand-off. While the planet is small the whole
 * layout is pressed into a cap round the pole, never past it, so every light
 * stays on the face the reviewer sees and the limb stays dark.
 *
 * The stars hang in the screen's plane round the planet, placed in planet
 * radii inside the free screen at the opening frame, each from its own name
 * and one seed, so a package keeps its place from one map to the next (C3).
 * They scale with the planet, so coming in they part and leave the frame.
 *
 * Pure like the rest of the scene (C1): the world draws it in
 * `apps/web/src/world/planet.ts`.
 */

import type { Dependency, MapJson } from 'core';

import { instances } from './instances.js';
import { noticeAnchors } from './labels.js';
import { LOD_GATES } from './lod.js';
import type { LodGate, LodPlan } from './lod.js';
import type { Point, WorldPoint } from './minimap.js';
import { seeded } from './motion.js';
import { weatherOf } from './weather.js';

/**
 * The planet's shape, which the world takes into its `PLANET` material so the
 * dev panel moves it (D156): its size at the opening frame and at the
 * hand-off, as shares of the free screen's half-diagonal; the widest angle,
 * in radians, the layout wraps to from the pole; and the stars' room, the
 * nearest one sits to the planet's centre and the least between two, in
 * planet radii, their seed, and how narrowly each one's light falls on the
 * rim, a power over the cosine of the angle off it.
 */
export type PlanetLayout = {
  readonly farFill: number;
  readonly handFill: number;
  readonly cap: number;
  readonly starNear: number;
  readonly starGap: number;
  readonly starSeed: number;
  readonly rimSpread: number;
};

export const PLANET_LAYOUT: PlanetLayout = {
  farFill: 0.3,
  handFill: 2.5,
  cap: 1.2,
  starNear: 1.45,
  starGap: 0.3,
  starSeed: 1,
  rimSpread: 6,
};

/** The share of the room's half-extents a star may reach, so its glow stays on the screen. */
const STAR_MARGIN = 0.92;

/** How many places a star tries for one clear of the planet and its neighbours before it takes the clearest it found. */
const STAR_TRIES = 48;

/** The light a star of the fewest importers still casts on the rim, as a share of the busiest one's. */
const RIM_FLOOR = 0.35;

/** The severities that light a star in the IFR hue (§5.3). */
const SEVERE: ReadonlySet<string> = new Set(['critical', 'high']);

/**
 * The planet's radius at a zoom, as a share of the free screen's
 * half-diagonal: `farFill` at the opening frame and under it shrinking with
 * the zoom as anything would, and over it growing as a power of the zoom
 * that reaches `handFill` where LOD1 is left, so the planet covers the frame
 * on both sides of the level's gate.
 */
export function planetFill(zoom: number, gate: LodGate = LOD_GATES[0] ?? { enter: 1.7, exit: 1.45 }, layout: PlanetLayout = PLANET_LAYOUT): number {
  if (zoom <= 1) return layout.farFill * Math.max(0, zoom);
  const hand = Math.max(gate.exit, 1.01);
  const power = Math.max(0, Math.log(layout.handFill / layout.farFill) / Math.log(hand));
  return layout.farFill * zoom ** power;
}

/** How shown the planet is in a level-of-detail plan: LOD0's layer alone, faded out as the surface's fades in. */
export function planetShown(plan: LodPlan): number {
  return Math.max(0, Math.min(1, plan.opacity[0] - plan.opacity[1]));
}

/** The point the planet faces: the view's centre on the ground, held on the layout, so a view past its edge faces the edge. */
export function facingOf(centre: Point, layout: { readonly width: number; readonly height: number }): Point {
  return [Math.min(layout.width, Math.max(0, centre[0])), Math.min(layout.height, Math.max(0, centre[1]))];
}

/**
 * The radius, in layout units, a layout point's distance from the facing
 * point is taken round the sphere at: the sphere's own, so arc length is
 * kept, unless that would wrap the layout's farthest corner past `cap`, when
 * the layout is pressed into the cap instead.
 */
export function wrapOf(radius: number, facing: Point, layout: { readonly width: number; readonly height: number }, cap: number = PLANET_LAYOUT.cap): number {
  const corners: readonly Point[] = [
    [0, 0],
    [layout.width, 0],
    [0, layout.height],
    [layout.width, layout.height],
  ];
  const reach = Math.max(...corners.map(([x, y]) => Math.hypot(x - facing[0], y - facing[1])));
  return Math.max(radius, reach / Math.max(cap, 1e-6));
}

/**
 * Where a layout point lies on the sphere, from its centre, in the world's
 * axes (x across the layout, y up, z down it): the facing point at the pole,
 * straight up, and every other point its distance from the facing point over
 * `wrap` radians round from it, in the direction it lies on the ground.
 */
export function onPlanet(point: Point, facing: Point, radius: number, wrap: number): WorldPoint {
  const dx = point[0] - facing[0];
  const dy = point[1] - facing[1];
  const distance = Math.hypot(dx, dy);
  if (distance === 0) return [0, radius, 0];
  const angle = distance / wrap;
  const across = (Math.sin(angle) * radius) / distance;
  return [dx * across, Math.cos(angle) * radius, dy * across];
}

/** A light on the planet's night side: a file the far field lights, where the layout put it, its hue, and the notice whose light it follows, or -1. */
export type PlanetLight = {
  readonly path: string;
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly hue: 'change' | 'category';
  readonly notice: number;
};

/**
 * The files the far field lights (§5.6), as the planet's lights: each added
 * or modified file's stain in the change hue, and the primary notice's file
 * in the category hue its halo takes, each following the light of the first
 * notice on it. A deleted or renamed file's outline is not lit at the far
 * field, and neither is it here. Path order (C3).
 */
export function planetLights(map: MapJson): readonly PlanetLight[] {
  const placed = new Map(instances(map).map((file) => [file.id, file] as const));
  const noticeOf = new Map<string, number>();
  let primary: string | undefined;
  for (const { rank, notice, anchor } of noticeAnchors(map)) {
    if (anchor?.kind !== 'organelle') continue;
    if (!noticeOf.has(anchor.path)) noticeOf.set(anchor.path, rank - 1);
    if (notice.tier === 'primary') primary ??= anchor.path;
  }
  const lit = new Set(weatherOf(map).files.flatMap((file) => (file.change?.kind === 'added' || file.change?.kind === 'modified' ? [file.path] : [])));
  if (primary !== undefined) lit.add(primary);
  return [...lit]
    .toSorted((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .flatMap((path): PlanetLight[] => {
      const file = placed.get(path);
      if (file === undefined) return [];
      return [{ path, x: file.x, y: file.y, r: file.r, hue: path === primary ? 'category' : 'change', notice: noticeOf.get(path) ?? -1 }];
    });
}

/** What a star's light says (D170): an advisory at high or critical, one lower, a package this change added or moved, no finding, or no audit read. */
export type StarHue = 'ifr' | 'amber' | 'change' | 'clean' | 'unread';

/** A package's hue: its health first, then what the change did to it, then whether the audit read it clean or was never read (C2). */
export function starHue(dependency: Dependency): StarHue {
  if (dependency.severity !== undefined && SEVERE.has(dependency.severity)) return 'ifr';
  if ((dependency.advisories ?? 0) > 0) return 'amber';
  if (dependency.change !== undefined) return 'change';
  return dependency.advisories === undefined ? 'unread' : 'clean';
}

/**
 * One star: the package, how many terrain files import it and that as a
 * share of the busiest package's, where it hangs from the planet's centre in
 * planet radii (x right, y down, the screen's), and its hue.
 */
export type DependencyStar = {
  readonly name: string;
  readonly importers: number;
  readonly weight: number;
  readonly x: number;
  readonly y: number;
  readonly hue: StarHue;
};

/** FNV-1a over a name, so each package draws its places from a stream of its own. */
function hashOf(name: string): number {
  let hash = 0x81_1c_9d_c5;
  for (let i = 0; i < name.length; i += 1) hash = Math.imul(hash ^ name.charCodeAt(i), 0x01_00_01_93);
  return hash >>> 0;
}

/**
 * One star per outside package the map records (D170), placed inside `room`,
 * the free screen's half-extents at the opening frame in planet radii: each
 * draws places from its own name and the seed until one stands `starNear`
 * from the planet's centre and `starGap` from every star placed before it,
 * else takes the clearest it drew. Its size is its importers' share of the
 * busiest package's, under a square root so one file still shows. A map
 * with no `dependencies` key hangs no stars (C2).
 */
export function dependencyStars(map: MapJson, room: { readonly x: number; readonly y: number }, layout: PlanetLayout = PLANET_LAYOUT): readonly DependencyStar[] {
  const dependencies = map.weather.dependencies ?? [];
  const busiest = Math.max(1, ...dependencies.map((dependency) => dependency.importers));
  const placed: DependencyStar[] = [];
  for (const dependency of dependencies.toSorted((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
    const random = seeded((hashOf(dependency.name) ^ layout.starSeed) >>> 0);
    let best: Point = [0, 0];
    let clearest = Number.NEGATIVE_INFINITY;
    for (let attempt = 0; attempt < STAR_TRIES && clearest < 0; attempt += 1) {
      const x = (random() * 2 - 1) * room.x * STAR_MARGIN;
      const y = (random() * 2 - 1) * room.y * STAR_MARGIN;
      const clearance = Math.min(Math.hypot(x, y) - layout.starNear, ...placed.map((star) => Math.hypot(star.x - x, star.y - y) - layout.starGap));
      if (clearance > clearest) {
        best = [x, y];
        clearest = clearance;
      }
    }
    placed.push({ name: dependency.name, importers: dependency.importers, weight: Math.sqrt(dependency.importers / busiest), x: best[0], y: best[1], hue: starHue(dependency) });
  }
  return placed;
}

/** A colour as three linear shares, 0 to 1 and over for a light. */
export type Rgb = readonly [number, number, number];

/**
 * The stars' light on the planet's rim at `samples` angles round it, the
 * first at the right and turning as the screen's y runs down, three values
 * an angle: each star lights the rim facing it in its own colour, falling
 * off as a power of the cosine of the angle off it, and with the square of
 * its distance past the nearest a star sits, a busier package's light the
 * stronger. The world lays it round the limb as it is, so a star's hue is
 * the light the rim catches toward it.
 */
export function rimLight(stars: readonly DependencyStar[], samples: number, colourOf: (hue: StarHue) => Rgb, layout: PlanetLayout = PLANET_LAYOUT): Float32Array {
  const light = new Float32Array(samples * 3);
  for (const star of stars) {
    const towards = Math.atan2(star.y, star.x);
    const distance = Math.max(layout.starNear, Math.hypot(star.x, star.y));
    const strength = (RIM_FLOOR + (1 - RIM_FLOOR) * star.weight) * (layout.starNear / distance) ** 2;
    const colour = colourOf(star.hue);
    for (let i = 0; i < samples; i += 1) {
      const facing = Math.cos((i / samples) * 2 * Math.PI - towards);
      if (facing <= 0) continue;
      const lit = strength * facing ** layout.rimSpread;
      for (let channel = 0; channel < 3; channel += 1) light[i * 3 + channel] = (light[i * 3 + channel] ?? 0) + lit * (colour[channel] ?? 0);
    }
  }
  return light;
}
