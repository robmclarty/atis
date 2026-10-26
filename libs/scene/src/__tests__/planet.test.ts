import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { Dependency, MapJson } from 'core';
import { expect, test } from 'vitest';

import { LOD_GATES, lodPlan } from '../lod.js';
import type { LodPlan } from '../lod.js';
import { PLANET_LAYOUT, dependencyStars, facingOf, onPlanet, planetFill, planetLights, planetShown, rimLight, starHue, wrapOf } from '../planet.js';
import type { Rgb, StarHue } from '../planet.js';
import { LOD_FADE_MS } from '../tokens.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));

const LAYOUT = { width: 480, height: 660 };
const GATE = LOD_GATES[0] ?? { enter: 1.7, exit: 1.45 };

/** The demo with its outside packages swapped for these. */
const withDependencies = (dependencies: readonly Dependency[]): MapJson => ({ ...DEMO, weather: { ...DEMO.weather, dependencies } });

/** A room the shape of a 1,280 by 720 free screen at the opening frame, in planet radii. */
const ROOM = { x: 640 / (0.3 * Math.hypot(640, 360)), y: 360 / (0.3 * Math.hypot(640, 360)) };

test('the facing point is the pole, and every point keeps its arc length from it round the sphere, in the direction it lies on the ground', () => {
  const facing = facingOf([240, 330], LAYOUT);
  expect(onPlanet(facing, facing, 100, 100)).toEqual([0, 100, 0]);
  const [x, y, z] = onPlanet([240 + 50, 330], facing, 100, 100);
  expect(x).toBeCloseTo(100 * Math.sin(0.5));
  expect(y).toBeCloseTo(100 * Math.cos(0.5));
  expect(z).toBeCloseTo(0);
  // Down the layout is down the sphere's z, and every point lies on its surface.
  const south = onPlanet([240, 330 + 80], facing, 100, 100);
  expect(south[0]).toBeCloseTo(0);
  expect(south[2]).toBeGreaterThan(0);
  expect(Math.hypot(...south)).toBeCloseTo(100);
});

test('a view past the layout faces its edge, and a small planet presses the whole layout into the cap round the pole, the limb left dark', () => {
  expect(facingOf([-40, 900], LAYOUT)).toEqual([0, 660]);
  const facing = facingOf([240, 330], LAYOUT);
  const radius = 60;
  const wrap = wrapOf(radius, facing, LAYOUT);
  expect(wrap).toBeGreaterThan(radius);
  for (const corner of [
    [0, 0],
    [480, 0],
    [0, 660],
    [480, 660],
  ] as const) {
    const [, up] = onPlanet(corner, facing, radius, wrap);
    expect(Math.acos(up / radius)).toBeLessThanOrEqual(PLANET_LAYOUT.cap + 1e-9);
  }
});

test('at the hand-off the planet keeps arc length wherever the view faces, so the lights land near where the flat world puts them', () => {
  // The layout fills a free screen of its own shape at zoom 1; at the zoom LOD1 is left, the planet's radius is `handFill` half-diagonals of the frame then.
  const halfDiagonal = Math.hypot(LAYOUT.width, LAYOUT.height) / 2 / GATE.exit;
  const radius = planetFill(GATE.exit) * halfDiagonal;
  for (const facing of [facingOf([240, 330], LAYOUT), facingOf([0, 0], LAYOUT), facingOf([480, 660], LAYOUT)]) {
    expect(wrapOf(radius, facing, LAYOUT)).toBe(radius);
    // A point at the frame's corner from the facing point lands within a twentieth of the half-diagonal of where the ground puts it.
    const [x, , z] = onPlanet([facing[0] + halfDiagonal * Math.SQRT1_2, facing[1] + halfDiagonal * Math.SQRT1_2], facing, radius, radius);
    expect(halfDiagonal - Math.hypot(x, z)).toBeLessThan(halfDiagonal / 20);
  }
});

test('the planet opens small, grows as the view comes in, and covers the frame on both sides of the gate it hands off at', () => {
  expect(planetFill(1)).toBeCloseTo(PLANET_LAYOUT.farFill);
  expect(planetFill(0.5)).toBeCloseTo(PLANET_LAYOUT.farFill / 2);
  expect(planetFill(GATE.exit)).toBeCloseTo(PLANET_LAYOUT.handFill);
  // Past 1 the planet's disc reaches beyond the frame's corners.
  expect(planetFill(GATE.exit)).toBeGreaterThan(1);
  expect(planetFill(GATE.enter)).toBeGreaterThan(planetFill(GATE.exit));
  const zooms = [0.5, 0.8, 1, 1.1, 1.2, 1.3, GATE.exit, 1.6, GATE.enter, 2];
  zooms.slice(1).forEach((zoom, index) => expect(planetFill(zoom)).toBeGreaterThan(planetFill(zooms[index] ?? 0)));
});

test("the planet is LOD0's layer alone: it stays whole up to LOD1's gate, fades out past it inside the cross-fade, and fades back in under the gate's exit", () => {
  const frame = 1000 / 60;
  let plan: LodPlan | undefined;
  const at = (zoom: number, ms = frame): number => {
    plan = lodPlan(plan, zoom, ms);
    return planetShown(plan);
  };
  expect(at(1)).toBe(1);
  expect(at(GATE.enter - 0.01)).toBe(1);
  expect(at(GATE.enter + 0.01)).toBeLessThan(1);
  expect(at(GATE.enter + 0.01, LOD_FADE_MS)).toBe(0);
  // Hysteresis: back under the gate's entry the world holds, and only under its exit does the planet return.
  expect(at(GATE.exit + 0.01, LOD_FADE_MS)).toBe(0);
  expect(at(GATE.exit - 0.01, LOD_FADE_MS)).toBe(1);
});

test("the demo's lights are the files its far field lights: the changed ones in the change hue, the primary's file in the category hue, each following its first notice's light", () => {
  expect(planetLights(DEMO).map(({ path, hue, notice }) => ({ path, hue, notice }))).toEqual([
    { path: 'apps/cli/src/doctor.ts', hue: 'change', notice: 4 },
    { path: 'libs/core/src/pm/index.ts', hue: 'category', notice: 0 },
    { path: 'libs/core/src/pm/tools.ts', hue: 'change', notice: 5 },
  ]);
  const placed = DEMO.terrain.layout?.positions['apps/cli/src/doctor.ts'];
  expect(planetLights(DEMO)[0]).toMatchObject({ x: placed?.x, y: placed?.y, r: placed?.r });
});

test("the demo hangs one star per outside package, sized by its importers and lit by its health, none of it read here, so muted but for the change's", () => {
  const stars = dependencyStars(DEMO, ROOM);
  expect(stars.map(({ name, importers, weight, hue }) => ({ name, importers, weight, hue }))).toEqual([
    { name: 'kleur', importers: 2, weight: 1, hue: 'unread' },
    { name: 'picomatch', importers: 2, weight: 1, hue: 'change' },
    { name: 'semver', importers: 1, weight: Math.SQRT1_2, hue: 'unread' },
  ]);
});

test('each star takes a seeded place clear of the planet and its neighbours, inside the free screen, the same twice and kept by its name', () => {
  const names = ['@scope/kit', 'd3-force', 'earcut', 'elkjs', 'kleur', 'picomatch', 'react', 'react-dom', 'semver', 'three', 'typescript', 'vite'];
  const map = withDependencies(names.map((name, index) => ({ name, importers: index + 1 })));
  const stars = dependencyStars(map, ROOM);
  expect(stars).toEqual(dependencyStars(map, ROOM));
  for (const star of stars) {
    expect(Math.hypot(star.x, star.y)).toBeGreaterThanOrEqual(PLANET_LAYOUT.starNear);
    expect(Math.abs(star.x)).toBeLessThanOrEqual(ROOM.x);
    expect(Math.abs(star.y)).toBeLessThanOrEqual(ROOM.y);
    for (const other of stars) if (other !== star) expect(Math.hypot(other.x - star.x, other.y - star.y)).toBeGreaterThanOrEqual(PLANET_LAYOUT.starGap);
  }
  // Another seed hangs another sky; a package added beside the first keeps its place.
  expect(dependencyStars(map, ROOM, { ...PLANET_LAYOUT, starSeed: 2 })).not.toEqual(stars);
  const first = dependencyStars(withDependencies([{ name: '@scope/kit', importers: 1 }]), ROOM)[0];
  expect(stars[0]).toMatchObject({ x: first?.x, y: first?.y });
  const { dependencies: _, ...unread } = DEMO.weather;
  expect(dependencyStars({ ...DEMO, weather: unread }, ROOM)).toEqual([]);
});

test('a star is lit IFR red at high or critical, amber lower, in the change hue where the change brought it, dim white with no finding, and muted with no audit (D170)', () => {
  const hues: readonly (readonly [Dependency, StarHue])[] = [
    [{ name: 'a', importers: 1, change: 'added', advisories: 2, severity: 'critical' }, 'ifr'],
    [{ name: 'b', importers: 1, advisories: 1, severity: 'high' }, 'ifr'],
    [{ name: 'c', importers: 1, change: 'moved', advisories: 1, severity: 'moderate' }, 'amber'],
    [{ name: 'd', importers: 1, advisories: 1, severity: 'low' }, 'amber'],
    [{ name: 'e', importers: 1, change: 'moved', advisories: 0 }, 'change'],
    [{ name: 'f', importers: 1, change: 'added' }, 'change'],
    [{ name: 'g', importers: 1, advisories: 0 }, 'clean'],
    [{ name: 'h', importers: 1 }, 'unread'],
  ];
  for (const [dependency, hue] of hues) expect(starHue(dependency), dependency.name).toBe(hue);
  expect(dependencyStars(withDependencies(hues.map(([dependency]) => dependency)), ROOM).map((star) => star.hue)).toEqual(hues.map(([, hue]) => hue));
});

test("each star's light catches the rim facing it in its own hue, and leaves the far side dark", () => {
  const colours: Readonly<Record<StarHue, Rgb>> = { ifr: [1, 0, 0], amber: [1, 0.6, 0], change: [0, 1, 1], clean: [1, 1, 1], unread: [0.3, 0.3, 0.3] };
  const stars = dependencyStars(withDependencies([{ name: 'react', importers: 4, advisories: 1, severity: 'high' }]), ROOM);
  const [star] = stars;
  const samples = 360;
  const rim = rimLight(stars, samples, (hue) => colours[hue]);
  const sample = (angle: number): Rgb => {
    const i = ((Math.round((angle / (2 * Math.PI)) * samples) % samples) + samples) % samples;
    return [rim[i * 3] ?? 0, rim[i * 3 + 1] ?? 0, rim[i * 3 + 2] ?? 0];
  };
  const towards = Math.atan2(star?.y ?? 0, star?.x ?? 0);
  const [red, green, blue] = sample(towards);
  expect(red).toBeGreaterThan(0.2);
  expect(green).toBe(0);
  expect(blue).toBe(0);
  expect(sample(towards + Math.PI)).toEqual([0, 0, 0]);
  expect(sample(towards + 0.3)[0]).toBeLessThan(red);
});
