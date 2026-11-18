import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson, Ties } from 'core';
import { expect, test } from 'vitest';

import { DRIFT_STEP_MS, DRIFT_TOKENS, GATHER, driftOf, homeFloat, loosenessOf, restOf, startFloat, stepFloat } from '../drift.js';
import type { Drifted, Float } from '../drift.js';
import { CELL_GATE, homewardAt } from '../lod.js';
import { dentedRing } from '../membranes.js';
import { createScheduler } from '../motion.js';
import type { FloatView } from '../motion.js';
import { openRing } from '../raster.js';
import type { Ring } from '../raster.js';
import { DRIFT_CURVE, DRIFT_GAP, DRIFT_REACH, DRIFT_SPEED } from '../tokens.js';

/**
 * The float inside an opened cell (D157, D165): each file wanders about its
 * place by its looseness, slowly and on the screen's scale, never leaving its
 * membrane or jumping, and the surface holds a closed cell's files where they
 * last floated until the view climbs on toward the field.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));
const ROUND_TWO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', '..', 'fixtures', 'round-two-3', 'map.json'), 'utf8')));
const PM = 'folder:libs/core/src/pm';
const RULES = 'directory:src/rules';
const TOOLS = 'libs/core/src/pm/tools.ts';
const SLOTS = 'libs/core/src/pm/slots.ts';
const INDEX = 'libs/core/src/pm/index.ts';
const CLI = 'package:apps/cli';
const DOCTOR = 'apps/cli/src/doctor.ts';
const CLI_BARREL = 'apps/cli/src/index.ts';
const MINUTE_MS = 60_000;

/** The demo with these files' ties set as given. */
function tied(ties: Readonly<Record<string, Ties | undefined>>): MapJson {
  return {
    ...DEMO,
    terrain: {
      ...DEMO.terrain,
      organelles: DEMO.terrain.organelles.map((organelle) => {
        if (!(organelle.id in ties)) return organelle;
        const { ties: _ties, ...rest } = organelle;
        const set = ties[organelle.id];
        return set === undefined ? rest : { ...rest, ties: set };
      }),
    },
  };
}

/** The pm cell with `tools.ts` tied to nothing in it, and `slots.ts` held by its cellmates alone. */
const LOOSE = tied({ [TOOLS]: { inside: 0, outside: 3 }, [SLOTS]: { inside: 4, outside: 0 } });

/** A cell's skin across, in layout units: its contour's wider side. */
function spanOf(map: MapJson, cell: string): number {
  const contour = map.terrain.layout?.contours?.[cell] ?? [];
  const xs = contour.map(([x]) => x);
  const ys = contour.map(([, y]) => y);
  return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
}

/** The screen a cell opens at: its skin filling the gate's share of the free screen's shorter side. */
function openingScreen(map: MapJson, cell: string): number {
  return spanOf(map, cell) / CELL_GATE.open;
}

/** Every step of a minute of a cell's float at one screen, from rest. */
function minute(map: MapJson, cell: string, screen: number, seed = 7): readonly Float[] {
  const floats: Float[] = [startFloat(map, cell)];
  for (let step = 1; step <= Math.round(MINUTE_MS / DRIFT_STEP_MS); step += 1) floats.push(stepFloat(map, floats.at(-1) ?? startFloat(map, cell), step * DRIFT_STEP_MS, { seed, screen }));
  return floats;
}

/** The loose pm cell's minute at the screen it opens at, replayed once and read by every test that walks it. */
let looseMinute: readonly Float[] | undefined;
function looseFloats(): readonly Float[] {
  looseMinute ??= minute(LOOSE, PM, openingScreen(LOOSE, PM));
  return looseMinute;
}

/** Where the layout put a file, which the surface and a closed cell draw it at. */
function placeOf(map: MapJson, id: string): { readonly x: number; readonly y: number; readonly r: number } {
  const at = map.terrain.layout?.positions[id];
  if (at === undefined) throw new Error(`the map places ${id}`);
  return at;
}

function fileOf(files: readonly Drifted[], id: string): Drifted {
  const file = files.find((each) => each.id === id);
  if (file === undefined) throw new Error(`the float has no ${id}`);
  return file;
}

/** How far a file ever got from its rest over the floats, which open on it (D199). */
function farthest(_map: MapJson, floats: readonly Float[], id: string): number {
  const rest = fileOf(floats[0]?.files ?? [], id);
  return Math.max(...floats.map((float) => fileOf(float.files, id)).map((file) => Math.hypot(file.x - rest.x, file.y - rest.y)));
}

/** The distance from a point to the nearest point of a ring. */
function toRing(ring: Ring, x: number, y: number): number {
  let best = Number.POSITIVE_INFINITY;
  for (let index = 0; index < ring.length; index += 1) {
    const [ax, ay] = ring[index] ?? [0, 0];
    const [bx, by] = ring[(index + 1) % ring.length] ?? [ax, ay];
    const dx = bx - ax;
    const dy = by - ay;
    const length2 = dx * dx + dy * dy;
    const t = length2 === 0 ? 0 : Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / length2));
    best = Math.min(best, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)));
  }
  return best;
}

function inside(ring: Ring, x: number, y: number): boolean {
  let within = false;
  for (let index = 0; index < ring.length; index += 1) {
    const [ax, ay] = ring[index] ?? [0, 0];
    const [bx, by] = ring[(index + 1) % ring.length] ?? [ax, ay];
    if (ay > y !== by > y && x < ax + ((y - ay) / (by - ay)) * (bx - ax)) within = !within;
  }
  return within;
}

/** A cell's membrane as the slide draws it, teeth and all, and the skins of the cells it holds, but a single-file module, whose file floats on it (D167). */
function skinsOf(map: MapJson, cell: string): { readonly membrane: Ring; readonly held: readonly Ring[] } {
  const contours = map.terrain.layout?.contours ?? {};
  const dentsOf = (id: string): number => map.terrain.cells.find((each) => each.id === id)?.dents.length ?? 0;
  return {
    membrane: openRing(dentedRing(contours[cell] ?? [], dentsOf(cell))),
    held: map.terrain.cells.filter((each) => each.parent === cell && each.kind !== 'single').map((each) => openRing(dentedRing(contours[each.id] ?? [], dentsOf(each.id)))),
  };
}

/** Every way a float's files are out of bounds: outside the membrane, nearer it than they rest or than their radius and the gap, or into a cell their cell holds. */
function strays(map: MapJson, cell: string, floats: readonly Float[]): readonly string[] {
  const { membrane, held } = skinsOf(map, cell);
  const found: string[] = [];
  // Each file at rest: inside its membrane or not, how far it rests from the membrane and each held cell, and the clearance it must keep from each.
  const resting = new Map(
    (floats[0]?.files ?? []).map((file) => {
      const toMembrane = toRing(membrane, file.x, file.y);
      const toHeld = held.map((hole) => toRing(hole, file.x, file.y));
      return [file.id, { file, placed: inside(membrane, file.x, file.y), toMembrane, keep: Math.min(toMembrane, file.r + DRIFT_GAP), toHeld, keepHeld: toHeld.map((away) => Math.min(away, file.r + DRIFT_GAP)) }] as const;
    }),
  );
  floats.forEach((float, step) => {
    for (const file of float.files) {
      const rest = resting.get(file.id);
      if (rest === undefined || !rest.placed) continue;
      // A file nearer its place than its rest's clearance less what it must keep is inside by that much, by the triangle inequality.
      const moved = Math.hypot(file.x - rest.file.x, file.y - rest.file.y);
      if (moved > rest.toMembrane - rest.keep && (!inside(membrane, file.x, file.y) || toRing(membrane, file.x, file.y) < rest.keep - 1e-6)) found.push(`${file.id} left its membrane at step ${String(step)}`);
      held.forEach((hole, h) => {
        const keepHole = rest.keepHeld[h] ?? 0;
        if (moved > (rest.toHeld[h] ?? 0) - keepHole && (inside(hole, file.x, file.y) || toRing(hole, file.x, file.y) < keepHole - 1e-6)) found.push(`${file.id} went into a held cell at step ${String(step)}`);
      });
    }
  });
  return found;
}

/** A square ring from one corner to the other, closed. */
function square(x0: number, y0: number, x1: number, y1: number): (readonly [number, number])[] {
  return [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
    [x0, y0],
  ];
}

/** The files the surface should draw off their places: each one off its place, where it is. */
function offPlace(map: MapJson, files: readonly Drifted[]): ReadonlyMap<string, readonly [number, number]> {
  return new Map(files.filter((file) => file.x !== placeOf(map, file.id).x || file.y !== placeOf(map, file.id).y).map((file) => [file.id, [file.x, file.y] as const]));
}

/** Run a scheduler's float frame by frame, sixty a second, until the clock reads `until`, as the world asks for it. */
function floatUntil(clock: { now: number }, until: number, ask: () => unknown): void {
  while (clock.now + DRIFT_STEP_MS <= until + 1e-9) {
    clock.now += DRIFT_STEP_MS;
    ask();
  }
  clock.now = until;
  ask();
}

/** The most any file moved in one step of the floats, in layout units. */
function fastestStep(floats: readonly Float[]): number {
  let most = 0;
  floats.slice(1).forEach((float, index) => {
    const before = floats[index]?.files ?? [];
    float.files.forEach((file, i) => {
      const from = before[i] ?? file;
      most = Math.max(most, Math.hypot(file.x - from.x, file.y - from.y));
    });
  });
  return most;
}

test("a file's looseness is the share of its ties that leave its cell, a file with none is wholly loose, and one with no ties has none (C2)", () => {
  const [first] = DEMO.terrain.organelles;
  if (first === undefined) throw new Error('the demo has organelles');
  const of = (ties: Ties): number | undefined => loosenessOf({ ...first, ties });
  expect(of({ inside: 3, outside: 1 })).toBe(0.25);
  expect(of({ inside: 4, outside: 0 })).toBe(0);
  expect(of({ inside: 0, outside: 2 })).toBe(1);
  expect(of({ inside: 0, outside: 0 })).toBe(1);
  const { ties: _ties, ...untied } = first;
  expect(loosenessOf(untied)).toBeUndefined();
});

test('a file held by its cellmates stays at its place, and a loose one wanders about it, the looser further, within its reach of the cell', () => {
  const floats = looseFloats();
  const radius = spanOf(LOOSE, PM) / 2;
  expect(farthest(LOOSE, floats, SLOTS)).toBe(0);
  expect(farthest(LOOSE, floats, TOOLS)).toBeGreaterThan(placeOf(LOOSE, TOOLS).r / 4);
  expect(farthest(LOOSE, floats, TOOLS)).toBeGreaterThan(farthest(LOOSE, floats, INDEX));
  // It wanders about its place, not across the cell: never past twice its reach (D165 amends D157's).
  expect(farthest(LOOSE, floats, TOOLS)).toBeLessThanOrEqual(2 * DRIFT_REACH * 2 * radius);
});

test('no step moves a file more than its share of the screen a second, at the zoom the cell opens at, zoomed in close and zoomed out to its close, and the float eases in (D165)', () => {
  const opening = openingScreen(LOOSE, PM);
  for (const screen of [opening, opening / 4, opening * (CELL_GATE.open / CELL_GATE.close)]) {
    const floats = screen === opening ? looseFloats() : minute(LOOSE, PM, screen);
    const bound = (DRIFT_SPEED * screen * DRIFT_STEP_MS) / 1000;
    expect(fastestStep(floats), `at a screen of ${screen.toFixed(0)}`).toBeLessThanOrEqual(bound + 1e-9);
    // It moves at all: the bound is a ceiling, not a stillness.
    expect(fastestStep(floats)).toBeGreaterThan(bound / 4);
  }
  // Eased: it starts from rest, slowly, and gathers speed over its first second.
  const floats = looseFloats();
  const tools = (step: number): Drifted => fileOf(floats[step]?.files ?? [], TOOLS);
  const moved = (step: number): number => Math.hypot(tools(step).x - tools(step - 1).x, tools(step).y - tools(step - 1).y);
  expect(moved(1)).toBeLessThan((DRIFT_SPEED * opening * DRIFT_STEP_MS) / 1000 / 100);
  expect(moved(1)).toBeLessThan(moved(30));
  // At the raised reach the wander would outrun the speed at the zoom the cell opens at, so its clock runs a little slow there to keep to it, and never stops (D193 leaves DRIFT_SPEED where D165 put it).
  const last = floats.at(-1);
  expect((last?.wander ?? 0) / (last?.t ?? 1)).toBeLessThan(1);
  expect((last?.wander ?? 0) / (last?.t ?? 1)).toBeGreaterThan(0.75);
});

/** A cell's radius as the drift reads it: the furthest its drawn membrane gets from its own middle. */
function radiusOf(map: MapJson, cell: string): number {
  const { membrane } = skinsOf(map, cell);
  const cx = membrane.reduce((total, [x]) => total + x, 0) / membrane.length;
  const cy = membrane.reduce((total, [, y]) => total + y, 0) / membrane.length;
  return Math.max(...membrane.map(([x, y]) => Math.hypot(x - cx, y - cy)));
}

test('a file moves by its looseness through the curve: one a fifth loose barely moves, a wholly loose one comes within a tenth of the full reach, and none outruns the speed (D193)', () => {
  // The pm cell with `slots.ts` wholly loose, `tools.ts` a fifth loose, and its barrel held.
  const map = tied({ [SLOTS]: { inside: 0, outside: 3 }, [TOOLS]: { inside: 4, outside: 1 }, [INDEX]: { inside: 4, outside: 0 } });
  const screen = openingScreen(map, PM);
  const floats = minute(map, PM, screen);
  const full = DRIFT_REACH * radiusOf(map, PM);
  expect(floats[0]?.files.map((file) => [file.id, file.looseness])).toContainEqual([TOOLS, 0.2]);
  // Ten seconds in, and through the whole minute, the fifth-loose file is inside its curved share of the reach, and the gap a neighbour's push may carry it.
  const held = 0.2 ** DRIFT_CURVE * full + DRIFT_GAP;
  const tenSeconds = floats.slice(0, Math.round(10_000 / DRIFT_STEP_MS) + 1);
  expect(farthest(map, tenSeconds, TOOLS)).toBeGreaterThan(0);
  expect(farthest(map, tenSeconds, TOOLS)).toBeLessThanOrEqual(held);
  expect(farthest(map, floats, TOOLS)).toBeLessThanOrEqual(held);
  // The wholly loose one uses the reach: the curve leaves 1 at 1.
  expect(farthest(map, floats, SLOTS)).toBeGreaterThanOrEqual(0.9 * full);
  expect(farthest(map, floats, SLOTS)).toBeLessThanOrEqual(2 * full);
  // The contrast the curve is for: the loose file wanders more than ten times as far as the fifth-loose one, where a straight share would give five.
  expect(farthest(map, floats, SLOTS) / farthest(map, floats, TOOLS)).toBeGreaterThan(10);
  expect(fastestStep(floats)).toBeLessThanOrEqual((DRIFT_SPEED * screen) / 60 + 1e-9);
  // The curve is read live (D156): at 1 the fifth-loose file wanders its straight share, further than through the curve.
  const straight: Float[] = [startFloat(map, PM)];
  for (let step = 1; step <= Math.round(MINUTE_MS / DRIFT_STEP_MS); step += 1) straight.push(stepFloat(map, straight.at(-1) ?? startFloat(map, PM), step * DRIFT_STEP_MS, { seed: 7, screen, tokens: { ...DRIFT_TOKENS, DRIFT_CURVE: 1 } }));
  expect(farthest(map, straight, TOOLS)).toBeGreaterThan(farthest(map, floats, TOOLS));
  expect(farthest(map, straight, TOOLS)).toBeLessThanOrEqual(0.2 * full + DRIFT_GAP);
});

test('every body keeps inside its membrane through a minute of seeded time, on the demo and on a tight cell of an outside repo', { timeout: 60_000 }, () => {
  expect(strays(LOOSE, PM, looseFloats())).toEqual([]);
  const rules = minute(ROUND_TWO, RULES, openingScreen(ROUND_TWO, RULES));
  expect(strays(ROUND_TWO, RULES, rules)).toEqual([]);
  // Its files are loose, and they float: most of them move.
  const moving = (rules.at(-1)?.files ?? []).filter((file) => farthest(ROUND_TWO, rules, file.id) > 0);
  expect(moving.length).toBeGreaterThan((rules.at(-1)?.files.length ?? 0) / 2);
  expect(fastestStep(rules)).toBeLessThanOrEqual((DRIFT_SPEED * openingScreen(ROUND_TWO, RULES) * DRIFT_STEP_MS) / 1000 + 1e-9);
});

test('a file keeps out of the cells its cell holds', () => {
  // The demo's package laid out as a square holding pm as a square in its middle, util far off, and three loose files of its own about pm.
  const CORE = 'package:libs/core';
  const own = DEMO.terrain.organelles.find((organelle) => organelle.cell === CORE);
  if (own === undefined || DEMO.terrain.layout === undefined) throw new Error('the demo package holds a file');
  const files = ['libs/core/src/a.ts', 'libs/core/src/b.ts', 'libs/core/src/c.ts'];
  const map: MapJson = {
    ...DEMO,
    terrain: {
      ...DEMO.terrain,
      organelles: [...DEMO.terrain.organelles.filter((organelle) => organelle.cell !== CORE), ...files.map((id) => ({ ...own, id, ties: { inside: 0, outside: 1 } }))],
      layout: {
        ...DEMO.terrain.layout,
        positions: { ...DEMO.terrain.layout.positions, [files[0] ?? '']: { x: 30, y: 60, r: 6 }, [files[1] ?? '']: { x: 90, y: 60, r: 6 }, [files[2] ?? '']: { x: 60, y: 30, r: 6 } },
        contours: { ...DEMO.terrain.layout.contours, [CORE]: square(0, 0, 120, 120), [PM]: square(45, 45, 75, 75), 'directory:libs/core/src/util': square(400, 400, 420, 420) },
      },
    },
  };
  const floats = minute(map, CORE, 120 / CELL_GATE.open);
  expect(strays(map, CORE, floats)).toEqual([]);
  expect(Math.max(...files.map((id) => farthest(map, floats, id)))).toBeGreaterThan(0);
});

test('a deleted file, a file without ties, and a file alone in its cell stay still, and so does every file under reduced motion', () => {
  const map = tied({ [INDEX]: undefined });
  const floats = minute(map, PM, openingScreen(map, PM));
  expect(farthest(map, floats, 'libs/core/src/pm/legacy.ts')).toBe(0);
  expect(farthest(map, floats, INDEX)).toBe(0);
  expect(farthest(map, floats, TOOLS)).toBeGreaterThan(0);
  // libs/core's own index.ts is wholly loose, but the package holds no other file of its own.
  expect(DEMO.terrain.organelles.find((organelle) => organelle.id === 'libs/core/src/index.ts')?.ties).toEqual({ inside: 0, outside: 2 });
  expect(driftOf(DEMO, 'package:libs/core', 30_000, { seed: 7, screen: 400 })).toEqual([{ id: 'libs/core/src/index.ts', ...placeOf(DEMO, 'libs/core/src/index.ts'), looseness: undefined }]);
  // Closed, and under reduced motion, every file sits at its rest (D199), still.
  const rests = [...restOf(LOOSE, PM)].map(([id, at]) => [id, at.x, at.y]);
  for (const files of [driftOf(LOOSE, PM, undefined, { seed: 7, screen: 400 }), driftOf(LOOSE, PM, 30_000, { seed: 7, screen: 400, reduced: true })]) {
    expect(files.map((file) => [file.id, file.x, file.y])).toEqual(rests);
  }
});

test('one seed, one start and one run of screens give one frame at any frame rate; another seed floats another way (D94, C3)', () => {
  const screen = openingScreen(LOOSE, PM);
  const at = { seed: 7, screen };
  const sixty = looseFloats().at(Math.round(12_000 / DRIFT_STEP_MS));
  expect(stepFloat(LOOSE, startFloat(LOOSE, PM), 12_000, at)).toEqual(sixty);
  // Drawn at thirty frames a second, or in one go, the float takes the same steps.
  let thirty = startFloat(LOOSE, PM);
  for (let frame = 1; frame <= 360; frame += 1) thirty = stepFloat(LOOSE, thirty, frame * (1000 / 30), at);
  expect(thirty).toEqual(sixty);
  expect(driftOf(LOOSE, PM, 12_000, at)).toEqual(sixty?.files);
  expect(driftOf(LOOSE, PM, 12_000, { seed: 8, screen })).not.toEqual(sixty?.files);
  const shuffled: MapJson = { ...LOOSE, terrain: { ...LOOSE.terrain, organelles: LOOSE.terrain.organelles.toReversed() } };
  expect(driftOf(shuffled, PM, 12_000, at)).toEqual(sixty?.files);
});

test('a float eased home moves each file that share of the way back to its place, its clocks where they stood', () => {
  const float = looseFloats().at(-1);
  if (float === undefined) throw new Error('the minute floated');
  expect(homeFloat(LOOSE, float, 0)).toBe(float);
  const half = homeFloat(LOOSE, float, 0.5);
  expect([half.t, half.wander]).toEqual([float.t, float.wander]);
  for (const file of half.files) {
    const rest = placeOf(LOOSE, file.id);
    const from = fileOf(float.files, file.id);
    expect(file.x).toBeCloseTo((from.x + rest.x) / 2, 9);
    expect(file.y).toBeCloseTo((from.y + rest.y) / 2, 9);
  }
  expect(homeFloat(LOOSE, float, 1).files.map((file) => [file.x, file.y])).toEqual(float.files.map((file) => [placeOf(LOOSE, file.id).x, placeOf(LOOSE, file.id).y]));
});

test('the scheduler floats the cell it opened from the moment it opened it, and nothing under reduced motion', () => {
  const clock = { now: 0 };
  const screen = openingScreen(LOOSE, PM);
  const view: FloatView = { screen, fill: () => CELL_GATE.open };
  const scheduler = createScheduler({ clock: () => clock.now, seed: 7, tiers: ['primary'], reduced: false });
  scheduler.load();
  expect(scheduler.float(LOOSE, view)).toEqual({ open: [], surface: new Map() });
  clock.now = 5000;
  scheduler.open(PM);
  expect(scheduler.float(LOOSE, view).open).toEqual(startFloat(LOOSE, PM).files);
  floatUntil(clock, 5000 + 9000, () => scheduler.float(LOOSE, view));
  expect(scheduler.float(LOOSE, view).open).toEqual(driftOf(LOOSE, PM, 9000, { seed: 7, screen }));
  // A clock that jumps, as when the tab was hidden, floats on a second of it and no more.
  clock.now += 60_000;
  expect(scheduler.float(LOOSE, view).open).toEqual(driftOf(LOOSE, PM, 10_000, { seed: 7, screen }));
  const still = createScheduler({ clock: () => clock.now, seed: 7, tiers: ['primary'], reduced: true });
  still.open(PM);
  clock.now += 9000;
  expect(still.float(LOOSE, view)).toEqual({ open: [], surface: new Map() });
  still.open(undefined);
  expect(still.float(LOOSE, view)).toEqual({ open: [], surface: new Map() });
});

test('as a cell closes the surface holds its files where they last floated while the view stays at the cell, eases them home as it climbs on, and a cell opened again floats on from there (D165)', () => {
  const clock = { now: 0 };
  let fill = CELL_GATE.open;
  const screen = openingScreen(LOOSE, PM);
  const view: FloatView = { screen, fill: () => fill };
  const scheduler = createScheduler({ clock: () => clock.now, seed: 7, tiers: [], reduced: false });
  scheduler.load();
  // The world's frame: the scheduler's frame, then the float.
  const ask = (): void => {
    scheduler.frame();
    scheduler.float(LOOSE, view);
  };
  scheduler.open(PM);
  floatUntil(clock, 20_000, ask);
  const floated = scheduler.float(LOOSE, view).open;
  expect(floated).toEqual(driftOf(LOOSE, PM, 20_000, { seed: 7, screen }));
  expect(fileOf(floated, TOOLS)).not.toEqual({ ...fileOf(floated, TOOLS), ...placeOf(LOOSE, TOOLS) });
  // Closed where the cell still fills the screen, as on Esc: the slide fades out on its files where they floated, and the surface draws them there, still.
  scheduler.open(undefined);
  scheduler.frame();
  const closing = scheduler.float(LOOSE, view);
  expect(closing.open).toEqual(floated);
  expect(closing.surface).toEqual(offPlace(LOOSE, floated));
  expect(closing.surface.size).toBeGreaterThan(0);
  // Once the slide has gone the surface still holds them there, while the view stays at the cell.
  floatUntil(clock, clock.now + 5000, ask);
  const later = scheduler.float(LOOSE, view);
  expect(later.open).toEqual([]);
  expect(later.surface).toEqual(offPlace(LOOSE, floated));
  // Zoomed out to where it closes, they hold still where they floated; on toward the field they ease home, halfway between its close and its home.
  fill = CELL_GATE.close;
  expect(scheduler.float(LOOSE, view).surface).toEqual(offPlace(LOOSE, floated));
  fill = (CELL_GATE.close + CELL_GATE.home) / 2;
  expect(homewardAt(fill)).toBeCloseTo(0.5, 9);
  const halfway = scheduler.float(LOOSE, view).surface;
  const eased = floated.map((file) => {
    const rest = placeOf(LOOSE, file.id);
    const at = halfway.get(file.id) ?? [rest.x, rest.y];
    expect(at[0]).toBeCloseTo((file.x + rest.x) / 2, 9);
    expect(at[1]).toBeCloseTo((file.y + rest.y) / 2, 9);
    return { ...file, x: at[0], y: at[1] };
  });
  // Zoomed back in, it opens again and floats on from where the surface drew it: its first frame is the surface's.
  scheduler.open(PM);
  expect(scheduler.float(LOOSE, view).open.map((file) => [file.x, file.y])).toEqual(eased.map((file) => [file.x, file.y]));
  floatUntil(clock, clock.now + DRIFT_STEP_MS * 3, ask);
  const resumed = scheduler.float(LOOSE, view).open;
  expect(fastestStep([{ cell: PM, t: 0, wander: 0, files: eased }, { cell: PM, t: 0, wander: 0, files: resumed }])).toBeLessThanOrEqual(
    (3 * DRIFT_SPEED * screen * DRIFT_STEP_MS) / 1000 + 1e-9,
  );
  // Closed again and climbed past its home, the surface draws its files at their places and lets the cell go.
  scheduler.open(undefined);
  floatUntil(clock, clock.now + 1000, ask);
  fill = CELL_GATE.home;
  expect(scheduler.float(LOOSE, view).surface.size).toBe(0);
  fill = CELL_GATE.open;
  expect(scheduler.float(LOOSE, view).surface.size).toBe(0);
});

test("an opened package floats its single-file modules on its slide by their package ties, every body inside the slide's membrane through a minute of seeded time, and still under reduced motion (D167)", () => {
  const floats = minute(DEMO, CLI, openingScreen(DEMO, CLI));
  expect(floats[0]?.files.map((file) => [file.id, file.looseness])).toEqual([
    [DOCTOR, 2 / 3],
    [CLI_BARREL, 0],
  ]);
  expect(strays(DEMO, CLI, floats)).toEqual([]);
  // doctor.ts reaches out of apps/cli for two of its three ties, so it wanders; the barrel, held by doctor.ts alone, stays home.
  expect(farthest(DEMO, floats, DOCTOR)).toBeGreaterThan(0);
  expect(farthest(DEMO, floats, CLI_BARREL)).toBe(0);
  expect(fastestStep(floats)).toBeLessThanOrEqual((DRIFT_SPEED * openingScreen(DEMO, CLI) * DRIFT_STEP_MS) / 1000 + 1e-9);
  // Its own cell of one file floats nothing, and under reduced motion the package's bodies sit where the layout put them.
  expect(driftOf(DEMO, 'single:apps/cli/src/doctor.ts', 30_000, { seed: 7, screen: 400 })).toEqual([]);
  const stilled = driftOf(DEMO, CLI, 30_000, { seed: 7, screen: 400, reduced: true });
  expect(stilled.map((file) => [file.id, file.x, file.y])).toEqual([DOCTOR, CLI_BARREL].map((id) => [id, restOf(DEMO, CLI).get(id)?.x, restOf(DEMO, CLI).get(id)?.y]));
  // A module the map gives no package ties stays still there (C2).
  const untied: MapJson = {
    ...DEMO,
    terrain: {
      ...DEMO.terrain,
      organelles: DEMO.terrain.organelles.map((organelle) => {
        if (organelle.id !== DOCTOR) return organelle;
        const { package_ties: _, ...rest } = organelle;
        return rest;
      }),
    },
  };
  expect(farthest(untied, minute(untied, CLI, openingScreen(untied, CLI)), DOCTOR)).toBe(0);
});

test('as a package closes the surface holds its module where it last floated, and eases it home as the view climbs on (D165, D167)', () => {
  const clock = { now: 0 };
  let fill = CELL_GATE.open;
  const screen = openingScreen(DEMO, CLI);
  const view: FloatView = { screen, fill: () => fill };
  const scheduler = createScheduler({ clock: () => clock.now, seed: 7, tiers: [], reduced: false });
  scheduler.load();
  const ask = (): void => {
    scheduler.frame();
    scheduler.float(DEMO, view);
  };
  scheduler.open(CLI);
  floatUntil(clock, 20_000, ask);
  const floated = scheduler.float(DEMO, view).open;
  expect(floated).toEqual(driftOf(DEMO, CLI, 20_000, { seed: 7, screen }));
  const doctor = fileOf(floated, DOCTOR);
  expect([doctor.x, doctor.y]).not.toEqual([placeOf(DEMO, DOCTOR).x, placeOf(DEMO, DOCTOR).y]);
  // Closed where the package still fills the screen: the surface draws the module where it floated, and the barrel, which never floated, at the rest it gathered to (D199).
  scheduler.open(undefined);
  floatUntil(clock, clock.now + 5000, ask);
  const closed = scheduler.float(DEMO, view).surface;
  const barrel = restOf(DEMO, CLI).get(CLI_BARREL);
  expect(closed).toEqual(
    new Map([
      [DOCTOR, [doctor.x, doctor.y]],
      [CLI_BARREL, [barrel?.x, barrel?.y]],
    ]),
  );
  // Halfway between the gate's close and its home it is halfway home, and past its home it is home.
  fill = (CELL_GATE.close + CELL_GATE.home) / 2;
  const halfway = scheduler.float(DEMO, view).surface.get(DOCTOR) ?? [0, 0];
  expect(halfway[0]).toBeCloseTo((doctor.x + placeOf(DEMO, DOCTOR).x) / 2, 9);
  expect(halfway[1]).toBeCloseTo((doctor.y + placeOf(DEMO, DOCTOR).y) / 2, 9);
  fill = CELL_GATE.home;
  expect(scheduler.float(DEMO, view).surface.size).toBe(0);
});

/** Every way a slide's rests are out of bounds: outside the membrane or nearer it than the layout had them or their radius and the gap, in or too near a cell their cell holds, or one body over another. */
function badRests(map: MapJson, cell: string, rests: ReadonlyMap<string, { readonly x: number; readonly y: number; readonly r: number }>): readonly string[] {
  const { membrane, held } = skinsOf(map, cell);
  const found: string[] = [];
  const all = [...rests];
  all.forEach(([id, at], index) => {
    const place = placeOf(map, id);
    if (!inside(membrane, place.x, place.y)) return;
    if (!inside(membrane, at.x, at.y) || toRing(membrane, at.x, at.y) < Math.min(toRing(membrane, place.x, place.y), at.r + DRIFT_GAP) - 1e-6) found.push(`${id} rests off its membrane`);
    for (const hole of held) if (inside(hole, at.x, at.y) || toRing(hole, at.x, at.y) < Math.min(toRing(hole, place.x, place.y), at.r + DRIFT_GAP) - 1e-6) found.push(`${id} rests in a held cell`);
    for (const [other, there] of all.slice(index + 1)) {
      const apart = Math.min(at.r + there.r, Math.hypot(placeOf(map, other).x - place.x, placeOf(map, other).y - place.y));
      if (Math.hypot(there.x - at.x, there.y - at.y) < apart - 1e-6) found.push(`${id} rests over ${other}`);
    }
  });
  return found;
}

/** The demo's package as a square of 120 with these files on it, each at a place and with ties, pm as a square in its middle or far off, and util far off. */
function squared(files: Readonly<Record<string, { readonly x: number; readonly y: number; readonly ties?: Ties }>>, hole: boolean): MapJson {
  const CORE = 'package:libs/core';
  const own = DEMO.terrain.organelles.find((organelle) => organelle.cell === CORE);
  if (own === undefined || DEMO.terrain.layout === undefined) throw new Error('the demo package holds a file');
  // A package's slide reads its files' package ties (D167).
  const { ties: _ties, package_ties: _package, ...bare } = own;
  return {
    ...DEMO,
    terrain: {
      ...DEMO.terrain,
      organelles: [...DEMO.terrain.organelles.filter((organelle) => organelle.cell !== CORE), ...Object.entries(files).map(([id, file]) => (file.ties === undefined ? { ...bare, id } : { ...bare, id, ties: file.ties, package_ties: file.ties }))],
      layout: {
        ...DEMO.terrain.layout,
        positions: { ...DEMO.terrain.layout.positions, ...Object.fromEntries(Object.entries(files).map(([id, file]) => [id, { x: file.x, y: file.y, r: 6 }])) },
        contours: { ...DEMO.terrain.layout.contours, 'package:libs/core': square(0, 0, 120, 120), [PM]: hole ? square(45, 45, 75, 75) : square(300, 300, 320, 320), 'directory:libs/core/src/util': square(400, 400, 420, 420) },
      },
    },
  };
}

test('of two files as far from the middle, the one its cellmates hold more rests nearer it, the one they hold less further out, and one held as the cell is on average where the layout put it (D199)', () => {
  const CORE = 'package:libs/core';
  const [held, loose, middling, untied] = ['libs/core/src/a.ts', 'libs/core/src/b.ts', 'libs/core/src/c.ts', 'libs/core/src/d.ts'];
  const map = squared({ [held]: { x: 30, y: 60, ties: { inside: 4, outside: 0 } }, [loose]: { x: 90, y: 60, ties: { inside: 0, outside: 3 } }, [middling]: { x: 60, y: 30, ties: { inside: 2, outside: 2 } }, [untied]: { x: 60, y: 95 } }, false);
  const rests = restOf(map, CORE);
  const away = (id: string): number => Math.hypot((rests.get(id)?.x ?? 0) - 60, (rests.get(id)?.y ?? 0) - 60);
  // Held 1, 0 and a half about a mean of a half: the held file comes in by the gather's share of half its distance, and the loose one goes out by as much.
  expect(away(held)).toBeCloseTo(30 - GATHER * 0.5 * 30, 0);
  expect(away(loose)).toBeCloseTo(30 + GATHER * 0.5 * 30, 0);
  expect(away(held)).toBeLessThan(away(loose));
  expect(rests.get(middling)).toEqual(placeOf(map, middling));
  // A file the map gives no ties rests where the layout put it, and counts toward no mean (C2).
  expect(rests.get(untied)).toEqual(placeOf(map, untied));
  expect(badRests(map, CORE, rests)).toEqual([]);
  // The gather is the dial: none of it rests every file where the layout put it, and all of it gathers further.
  expect([...restOf(map, CORE, 0)]).toEqual([held, loose, middling, untied].map((id) => [id, placeOf(map, id)]));
  expect(Math.hypot((restOf(map, CORE, 1).get(held)?.x ?? 0) - 60, 0)).toBeLessThan(away(held));
  // The float opens on the rests and wanders about them; closed and eased home, every file is back where the layout put it.
  expect(startFloat(map, CORE).files.map((file) => [file.id, file.x, file.y])).toEqual([...rests].map(([id, at]) => [id, at.x, at.y]));
  expect(homeFloat(map, startFloat(map, CORE), 1).files.map((file) => [file.x, file.y])).toEqual([held, loose, middling, untied].map((id) => [placeOf(map, id).x, placeOf(map, id).y]));
});

test('a cell whose files are held alike rests them where the layout put them: a flat signal invents no gathering (D199)', () => {
  // The demo's pm folder holds three tied files, each half loose, and a deleted one.
  expect(DEMO.terrain.organelles.filter((organelle) => organelle.cell === PM).map((organelle) => loosenessOf(organelle))).toEqual([0.5, undefined, 0.5, 0.5]);
  expect([...restOf(DEMO, PM)]).toEqual([INDEX, 'libs/core/src/pm/legacy.ts', SLOTS, TOOLS].map((id) => [id, placeOf(DEMO, id)]));
  // With its ties set apart the same cell gathers, and its deleted file still rests where it was.
  const rests = restOf(LOOSE, PM);
  expect(rests.get(SLOTS)).not.toEqual(placeOf(LOOSE, SLOTS));
  expect(rests.get('libs/core/src/pm/legacy.ts')).toEqual(placeOf(LOOSE, 'libs/core/src/pm/legacy.ts'));
});

test('no rest lies outside its membrane, in a cell its cell holds, or over another body, on a hand-built cell at every gather and on a tight cell of an outside repo (D199)', () => {
  const CORE = 'package:libs/core';
  // A held file whose way in is the held cell in the middle, a loose one a body from the rim, and two neighbours that would gather onto one another.
  const map = squared(
    {
      'libs/core/src/a.ts': { x: 30, y: 60, ties: { inside: 4, outside: 0 } },
      'libs/core/src/b.ts': { x: 110, y: 60, ties: { inside: 0, outside: 3 } },
      'libs/core/src/c.ts': { x: 60, y: 22, ties: { inside: 4, outside: 0 } },
      'libs/core/src/d.ts': { x: 60, y: 8, ties: { inside: 5, outside: 0 } },
      'libs/core/src/e.ts': { x: 60, y: 100, ties: { inside: 1, outside: 1 } },
    },
    true,
  );
  for (const gather of [0.2, GATHER, 0.7, 1]) {
    const rests = restOf(map, CORE, gather);
    expect(badRests(map, CORE, rests), `at a gather of ${String(gather)}`).toEqual([]);
    expect([...rests].some(([id, at]) => at.x !== placeOf(map, id).x || at.y !== placeOf(map, id).y)).toBe(true);
  }
  // Stepped from the rests, the float keeps every body in bounds as it did from the layout's places.
  expect(strays(map, CORE, minute(map, CORE, 120 / CELL_GATE.open).slice(0, 600))).toEqual([]);
  const rules = restOf(ROUND_TWO, RULES);
  expect(badRests(ROUND_TWO, RULES, rules)).toEqual([]);
  expect([...rules].filter(([id, at]) => at.x !== placeOf(ROUND_TWO, id).x || at.y !== placeOf(ROUND_TWO, id).y).length).toBeGreaterThan(rules.size / 2);
  // One map and one gather give one set of rests (C3).
  expect([...restOf(structuredClone(ROUND_TWO), RULES)]).toEqual([...rules]);
});

test('a held file the surface eased home heads back to its rest as its cell opens again, no faster than the speed, and stops on it (D199, D165)', () => {
  const screen = openingScreen(LOOSE, PM);
  const rest = restOf(LOOSE, PM).get(SLOTS);
  const home = homeFloat(LOOSE, startFloat(LOOSE, PM), 1);
  expect(fileOf(home.files, SLOTS)).toMatchObject({ x: placeOf(LOOSE, SLOTS).x, y: placeOf(LOOSE, SLOTS).y });
  const floats: Float[] = [home];
  for (let step = 1; step <= 600; step += 1) floats.push(stepFloat(LOOSE, floats.at(-1) ?? home, step * DRIFT_STEP_MS, { seed: 7, screen }));
  expect(fastestStep(floats)).toBeLessThanOrEqual((DRIFT_SPEED * screen * DRIFT_STEP_MS) / 1000 + 1e-9);
  expect(fileOf(floats.at(-1)?.files ?? [], SLOTS)).toMatchObject({ x: rest?.x, y: rest?.y });
});
