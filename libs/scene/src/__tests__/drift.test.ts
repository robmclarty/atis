import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson, Ties } from 'core';
import { expect, test } from 'vitest';

import { driftOf, loosenessOf } from '../drift.js';
import type { Drifted } from '../drift.js';
import { createScheduler } from '../motion.js';
import { DRIFT_EASE_MS, DRIFT_GAP } from '../tokens.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));
const PM = 'folder:libs/core/src/pm';
const FRAME_MS = 1000 / 60;
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
const LOOSE = tied({ 'libs/core/src/pm/tools.ts': { inside: 0, outside: 3 }, 'libs/core/src/pm/slots.ts': { inside: 4, outside: 0 } });

/** Every frame of a minute at sixty a second, for the opened cell. */
function minute(map: MapJson, seed = 7): readonly (readonly Drifted[])[] {
  return Array.from({ length: Math.round(MINUTE_MS / FRAME_MS) + 1 }, (_, frame) => driftOf(map, PM, frame * FRAME_MS, seed));
}

/** The loose cell's minute, replayed once and read by every test that walks it. */
let looseMinute: readonly (readonly Drifted[])[] | undefined;
function looseFrames(): readonly (readonly Drifted[])[] {
  looseMinute ??= minute(LOOSE);
  return looseMinute;
}

function restOf(id: string): { readonly x: number; readonly y: number; readonly r: number } {
  const at = DEMO.terrain.layout?.positions[id];
  if (at === undefined) throw new Error(`the demo places ${id}`);
  return at;
}

/** How far a file ever got from its place over the frames. */
function farthest(frames: readonly (readonly Drifted[])[], id: string): number {
  const rest = restOf(id);
  return Math.max(...frames.map((frame) => frame.find((file) => file.id === id)).map((file) => (file === undefined ? 0 : Math.hypot(file.x - rest.x, file.y - rest.y))));
}

/** The distance from a point to the nearest point of a ring. */
function toRing(ring: readonly (readonly [number, number])[], x: number, y: number): number {
  let best = Number.POSITIVE_INFINITY;
  ring.forEach(([ax, ay], index) => {
    const [bx, by] = ring[(index + 1) % ring.length] ?? [ax, ay];
    const dx = bx - ax;
    const dy = by - ay;
    const length2 = dx * dx + dy * dy;
    const t = length2 === 0 ? 0 : Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / length2));
    best = Math.min(best, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)));
  });
  return best;
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

test('a file held by its cellmates stays at its place, and a loose one travels the cell', () => {
  const frames = looseFrames();
  expect(farthest(frames, 'libs/core/src/pm/slots.ts')).toBeLessThan(DRIFT_GAP + 1);
  expect(farthest(frames, 'libs/core/src/pm/tools.ts')).toBeGreaterThan(5 * restOf('libs/core/src/pm/tools.ts').r);
  expect(farthest(frames, 'libs/core/src/pm/tools.ts')).toBeGreaterThan(farthest(frames, 'libs/core/src/pm/index.ts'));
});

test('a loose file reaches the membrane and is kept inside it', () => {
  const contour = DEMO.terrain.layout?.contours?.[PM] ?? [];
  const tools = looseFrames().map((frame) => frame.find((file) => file.id === 'libs/core/src/pm/tools.ts'));
  const r = restOf('libs/core/src/pm/tools.ts').r;
  const gaps = tools.map((file) => (file === undefined ? Number.POSITIVE_INFINITY : toRing(contour, file.x, file.y) - r));
  // It comes within a hair of the membrane at least once, and never pokes through it.
  expect(Math.min(...gaps)).toBeLessThan(DRIFT_GAP + 0.5);
  expect(Math.min(...gaps)).toBeGreaterThan(-0.5);
});

test("no two files' bodies overlap in any frame", () => {
  for (const frame of looseFrames()) {
    frame.forEach((a, index) => {
      for (const b of frame.slice(index + 1)) expect(Math.hypot(a.x - b.x, a.y - b.y), `${a.id} and ${b.id}`).toBeGreaterThanOrEqual(a.r + b.r - 1e-6);
    });
  }
});

test('a deleted file, a file without ties, and a file alone in its cell stay still', () => {
  const frames = minute(tied({ 'libs/core/src/pm/index.ts': undefined }));
  expect(farthest(frames, 'libs/core/src/pm/legacy.ts')).toBe(0);
  expect(farthest(frames, 'libs/core/src/pm/index.ts')).toBeLessThan(DRIFT_GAP + 1);
  // libs/core's own index.ts is wholly loose, but the package holds no other file of its own.
  expect(DEMO.terrain.organelles.find((organelle) => organelle.id === 'libs/core/src/index.ts')?.ties).toEqual({ inside: 0, outside: 2 });
  const alone = Array.from({ length: 60 }, (_, frame) => driftOf(DEMO, 'package:libs/core', frame * 1000, 7));
  for (const frame of alone) expect(frame).toEqual([{ id: 'libs/core/src/index.ts', ...restOf('libs/core/src/index.ts'), looseness: undefined }]);
});

test('every file sits at its place while its cell is closed or motion is reduced, and the drift eases in as the cell opens', () => {
  const rest = DEMO.terrain.organelles.filter((organelle) => organelle.cell === PM).map((organelle) => organelle.id).toSorted();
  for (const frame of [driftOf(LOOSE, PM, undefined, 7), driftOf(LOOSE, PM, 30_000, 7, true)]) {
    expect(frame.map((file) => [file.id, file.x, file.y])).toEqual(rest.map((id) => [id, restOf(id).x, restOf(id).y]));
  }
  expect(farthest([driftOf(LOOSE, PM, 0, 7)], 'libs/core/src/pm/tools.ts')).toBe(0);
  const early = farthest([driftOf(LOOSE, PM, DRIFT_EASE_MS / 10, 7)], 'libs/core/src/pm/tools.ts');
  expect(early).toBeLessThan(farthest(looseFrames(), 'libs/core/src/pm/tools.ts') / 10);
});

test('one seed and one time give one frame; another seed wanders another way (D94, C3)', () => {
  expect(driftOf(LOOSE, PM, 12_345, 7)).toEqual(driftOf(LOOSE, PM, 12_345, 7));
  expect(driftOf(LOOSE, PM, 12_345, 7)).not.toEqual(driftOf(LOOSE, PM, 12_345, 8));
  const shuffled: MapJson = { ...LOOSE, terrain: { ...LOOSE.terrain, organelles: LOOSE.terrain.organelles.toReversed() } };
  expect(driftOf(shuffled, PM, 12_345, 7)).toEqual(driftOf(LOOSE, PM, 12_345, 7));
});

test('the scheduler drifts the cell it opened from the moment it opened it, and nothing once it closes or under reduced motion', () => {
  let now = 0;
  const scheduler = createScheduler({ clock: () => now, seed: 7, tiers: ['primary'], reduced: false });
  scheduler.load();
  expect(scheduler.drift(LOOSE)).toEqual([]);
  now = 5000;
  scheduler.open(PM);
  now = 5000 + 9000;
  expect(scheduler.drift(LOOSE)).toEqual(driftOf(LOOSE, PM, 9000, 7));
  scheduler.open(undefined);
  expect(scheduler.drift(LOOSE)).toEqual([]);
  const still = createScheduler({ clock: () => now, seed: 7, tiers: ['primary'], reduced: true });
  still.open(PM);
  now += 9000;
  for (const file of still.drift(LOOSE)) expect([file.x, file.y]).toEqual([restOf(file.id).x, restOf(file.id).y]);
});
