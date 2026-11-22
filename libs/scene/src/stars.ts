/**
 * stars: the outside packages as stars in the sky round the map (D354
 * (package-stars)). The planet hung one star per package round itself (D170)
 * and went with the far zoom (D213 (planet-goes)); these are the same stars
 * with no planet, standing just off the ground the world draws, so they are
 * on the opening frame and the picture stays astronomical: the terrain's
 * galaxies, and the packages they lean on as the stars about them.
 *
 * A star's size is how many terrain files import its package, as a share of
 * the busiest package's under a square root, so one file still shows; its
 * hue is its health by the planet's own rule (`starHue`): an advisory at
 * high or critical, a lesser one, a package this change added or moved, an
 * audit that read it clean, or no audit read (C2).
 *
 * Each star keeps its place from one map to the next (C3, P2): it draws
 * places from its own name and one seed, along the ground's edge and a
 * little way out from it, until one stands clear of every star placed before
 * it, else takes the clearest it drew. A map with no `dependencies` key hangs
 * none (C2), and so does one that lays no ground out. Pure (C1).
 */

import type { MapJson } from 'core';

import { seeded } from './motion.js';
import { starHue } from './planet.js';
import type { StarHue } from './planet.js';

/** A stretch of the layout: the box round the ground the world draws. */
export type GroundBox = { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };

/**
 * Where the stars hang (D354 (package-stars)): the nearest and the farthest
 * a star stands off the ground's edge and the least gap between two stars,
 * each a share of the ground's longer side, and the seed their places are
 * drawn from.
 */
export type StarSky = { readonly near: number; readonly far: number; readonly gap: number; readonly seed: number };

export const STAR_SKY: StarSky = { near: 0.03, far: 0.1, gap: 0.035, seed: 7 };

/**
 * One package's star: its name, how many terrain files import it and that as
 * a share of the busiest package's, where it hangs on the layout, and its
 * hue.
 */
export type PackageStar = {
  readonly name: string;
  readonly importers: number;
  readonly weight: number;
  readonly x: number;
  readonly y: number;
  readonly hue: StarHue;
};

/** How many places a star draws before it takes the clearest. */
const TRIES = 24;

/** FNV-1a over a name, so each package draws its places from a stream of its own. */
function hashOf(name: string): number {
  let hash = 0x81_1c_9d_c5;
  for (let i = 0; i < name.length; i += 1) hash = Math.imul(hash ^ name.charCodeAt(i), 0x01_00_01_93);
  return hash >>> 0;
}

/** The point `along` of the way round a box's edge, 0 to 1 from its top left clockwise, pushed `out` past the edge. */
function onEdge(box: GroundBox, along: number, out: number): readonly [number, number] {
  const width = box.x1 - box.x0;
  const height = box.y1 - box.y0;
  const round = 2 * (width + height);
  let at = (((along % 1) + 1) % 1) * round;
  if (at < width) return [box.x0 + at, box.y0 - out];
  at -= width;
  if (at < height) return [box.x1 + out, box.y0 + at];
  at -= height;
  if (at < width) return [box.x1 - at, box.y1 + out];
  return [box.x0 - out, box.y1 - (at - width)];
}

/**
 * One star per outside package the map records, round `ground`, by name
 * (C3). None where the map records no packages, or the ground has no size.
 */
export function packageStarsOf(map: MapJson, ground: GroundBox | undefined, sky: StarSky = STAR_SKY): readonly PackageStar[] {
  const dependencies = map.weather.dependencies ?? [];
  if (ground === undefined || dependencies.length === 0) return [];
  const longer = Math.max(ground.x1 - ground.x0, ground.y1 - ground.y0);
  if (!(longer > 0)) return [];
  const near = Math.max(0, sky.near) * longer;
  const far = Math.max(near, sky.far * longer);
  const gap = Math.max(0, sky.gap) * longer;
  const busiest = Math.max(1, ...dependencies.map((dependency) => dependency.importers));
  const placed: PackageStar[] = [];
  for (const dependency of dependencies.toSorted((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
    const random = seeded((hashOf(dependency.name) ^ sky.seed) >>> 0);
    let best: readonly [number, number] = onEdge(ground, 0, near);
    let clearest = Number.NEGATIVE_INFINITY;
    for (let attempt = 0; attempt < TRIES && clearest < 0; attempt += 1) {
      const [x, y] = onEdge(ground, random(), near + random() * (far - near));
      const clearance = Math.min(Number.POSITIVE_INFINITY, ...placed.map((star) => Math.hypot(star.x - x, star.y - y) - gap));
      if (clearance > clearest) {
        best = [x, y];
        clearest = clearance;
      }
    }
    placed.push({ name: dependency.name, importers: dependency.importers, weight: Math.sqrt(dependency.importers / busiest), x: best[0], y: best[1], hue: starHue(dependency) });
  }
  return placed;
}

/** Whether a star is named beside it unasked (D354 (package-stars)): one an advisory names or the change touched; a calm star keeps quiet, and the map view lists it. */
export function starNamed(star: Pick<PackageStar, 'hue'>): boolean {
  return star.hue === 'ifr' || star.hue === 'amber' || star.hue === 'change';
}
