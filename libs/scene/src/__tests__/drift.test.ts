import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson, Ties } from 'core';
import { expect, test } from 'vitest';

import { DRIFT_STEP_MS, driftOf, homeFloat, loosenessOf, startFloat, stepFloat } from '../drift.js';
import type { Drifted, Float } from '../drift.js';
import { CELL_GATE, homewardAt } from '../lod.js';
import { dentedRing } from '../membranes.js';
import { createScheduler } from '../motion.js';
import type { FloatView } from '../motion.js';
import { openRing } from '../raster.js';
import type { Ring } from '../raster.js';
import { DRIFT_GAP, DRIFT_HZ_MAX, DRIFT_REACH, DRIFT_SPEED } from '../tokens.js';

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

function restOf(map: MapJson, id: string): { readonly x: number; readonly y: number; readonly r: number } {
  const at = map.terrain.layout?.positions[id];
  if (at === undefined) throw new Error(`the map places ${id}`);
  return at;
}

function fileOf(files: readonly Drifted[], id: string): Drifted {
  const file = files.find((each) => each.id === id);
  if (file === undefined) throw new Error(`the float has no ${id}`);
  return file;
}

/** How far a file ever got from its place over the floats. */
function farthest(map: MapJson, floats: readonly Float[], id: string): number {
  const rest = restOf(map, id);
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

/** A cell's membrane as the slide draws it, teeth and all, and the skins of the cells it holds. */
function skinsOf(map: MapJson, cell: string): { readonly membrane: Ring; readonly held: readonly Ring[] } {
  const contours = map.terrain.layout?.contours ?? {};
  const dentsOf = (id: string): number => map.terrain.cells.find((each) => each.id === id)?.dents.length ?? 0;
  return {
    membrane: openRing(dentedRing(contours[cell] ?? [], dentsOf(cell))),
    held: map.terrain.cells.filter((each) => each.parent === cell).map((each) => openRing(dentedRing(contours[each.id] ?? [], dentsOf(each.id)))),
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
  return new Map(files.filter((file) => file.x !== restOf(map, file.id).x || file.y !== restOf(map, file.id).y).map((file) => [file.id, [file.x, file.y] as const]));
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
  expect(farthest(LOOSE, floats, TOOLS)).toBeGreaterThan(restOf(LOOSE, TOOLS).r / 4);
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
  // At its rates the wander keeps under the bound by itself at the zoom the cell opens at, so nothing caps it there.
  expect(DRIFT_REACH * (spanOf(LOOSE, PM) / 2) * Math.PI * DRIFT_HZ_MAX).toBeLessThan(DRIFT_SPEED * opening);
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
  expect(driftOf(DEMO, 'package:libs/core', 30_000, { seed: 7, screen: 400 })).toEqual([{ id: 'libs/core/src/index.ts', ...restOf(DEMO, 'libs/core/src/index.ts'), looseness: undefined }]);
  const rest = DEMO.terrain.organelles.filter((organelle) => organelle.cell === PM).map((organelle) => organelle.id).toSorted();
  for (const files of [driftOf(LOOSE, PM, undefined, { seed: 7, screen: 400 }), driftOf(LOOSE, PM, 30_000, { seed: 7, screen: 400, reduced: true })]) {
    expect(files.map((file) => [file.id, file.x, file.y])).toEqual(rest.map((id) => [id, restOf(LOOSE, id).x, restOf(LOOSE, id).y]));
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
    const rest = restOf(LOOSE, file.id);
    const from = fileOf(float.files, file.id);
    expect(file.x).toBeCloseTo((from.x + rest.x) / 2, 9);
    expect(file.y).toBeCloseTo((from.y + rest.y) / 2, 9);
  }
  expect(homeFloat(LOOSE, float, 1).files.map((file) => [file.x, file.y])).toEqual(float.files.map((file) => [restOf(LOOSE, file.id).x, restOf(LOOSE, file.id).y]));
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
  expect(fileOf(floated, TOOLS)).not.toEqual({ ...fileOf(floated, TOOLS), ...restOf(LOOSE, TOOLS) });
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
    const rest = restOf(LOOSE, file.id);
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
