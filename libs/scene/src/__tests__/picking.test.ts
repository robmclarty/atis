import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson } from 'core';
import { expect, test } from 'vitest';

import { instances } from '../instances.js';
import { createPicker, surfacePoint } from '../picking.js';
import { weatherOf } from '../weather.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));
const RETAKE = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', '..', 'fixtures', 'retake-3', 'map.json'), 'utf8')));

const PM = 'folder:libs/core/src/pm';
const CORE = 'package:libs/core';
const INDEX = 'libs/core/src/pm/index.ts';
const CORE_INDEX = 'libs/core/src/index.ts';

const at = (map: MapJson, path: string): { readonly x: number; readonly y: number; readonly r: number } => {
  const place = map.terrain.layout?.positions[path];
  if (place === undefined) throw new Error(`${path} has no place`);
  return place;
};

test('a file answers at its centre and a little past its edge, and the cell beyond that', () => {
  const picker = createPicker(DEMO);
  const index = at(DEMO, INDEX);
  expect(picker.pick([index.x, index.y], 1, 0)).toEqual({ kind: 'organelle', path: INDEX, cell: PM, x: index.x, y: index.y, r: index.r });
  // Two units past its edge: within a slop of three, past a slop of one.
  const past = [index.x + index.r + 2, index.y] as const;
  expect(picker.pick(past, 1, 3)).toMatchObject({ kind: 'organelle', path: INDEX });
  expect(picker.pick(past, 1, 1)).toEqual({ kind: 'membrane', cell: PM });
});

test('between two files the nearer edge wins', () => {
  const picker = createPicker(DEMO);
  const legacy = at(DEMO, 'libs/core/src/pm/legacy.ts');
  const slots = at(DEMO, 'libs/core/src/pm/slots.ts');
  const length = Math.hypot(slots.x - legacy.x, slots.y - legacy.y);
  const [ux, uy] = [(slots.x - legacy.x) / length, (slots.y - legacy.y) / length];
  // A point on the line between their centres, a unit nearer the first's edge than the second's.
  const gap = length - legacy.r - slots.r;
  const along = legacy.r + gap / 2 - 0.5;
  const point = [legacy.x + ux * along, legacy.y + uy * along] as const;
  expect(picker.pick(point, 1, gap)).toMatchObject({ path: 'libs/core/src/pm/legacy.ts' });
  const other = [legacy.x + ux * (along + 1), legacy.y + uy * (along + 1)] as const;
  expect(picker.pick(other, 1, gap)).toMatchObject({ path: 'libs/core/src/pm/slots.ts' });
});

test('a cell nested in another answers before the cell that holds it, and open ground answers nothing', () => {
  const picker = createPicker(DEMO);
  // Inside the pm folder's skin, clear of its files.
  expect(picker.pick([210, 500], 1, 0)).toEqual({ kind: 'membrane', cell: PM });
  // Inside the package, outside both cells it holds.
  expect(picker.pick([220, 420], 1, 0)).toEqual({ kind: 'membrane', cell: CORE });
  expect(picker.pick([400, 600], 1, 0)).toBeUndefined();
});

test("the shore is the rail's: a shore file and a group's ground answer nothing (D153)", () => {
  const picker = createPicker(DEMO);
  const readme = at(DEMO, 'README.md');
  expect(picker.pick([readme.x, readme.y], 1, 2)).toBeUndefined();
  expect(picker.pick([123, 33], 3, 0)).toBeUndefined();
});

test('at the far field only the points of light answer, the change and the notices; the rest is its cell (§6)', () => {
  const picker = createPicker(DEMO);
  const index = at(DEMO, INDEX);
  const core = at(DEMO, CORE_INDEX);
  expect(picker.pick([index.x, index.y], 0, 0)).toMatchObject({ kind: 'organelle', path: INDEX });
  expect(picker.pick([core.x, core.y], 0, 0)).toEqual({ kind: 'membrane', cell: CORE });
  expect(picker.pick([core.x, core.y], 1, 0)).toMatchObject({ kind: 'organelle', path: CORE_INDEX });
  // A notice on a file the change left alone lights it all the same.
  const noticed: MapJson = { ...DEMO, notices: [{ tier: 'primary', kind: 'k', target: CORE_INDEX, why: 'w', inputs: {}, thresholds: {}, weight: 1 }] };
  expect(createPicker(noticed).pick([core.x, core.y], 0, 0)).toMatchObject({ kind: 'organelle', path: CORE_INDEX });
});

test("on retake-3's geometry every placed file answers at its own centre, and at the far field an unlit one answers as a cell", () => {
  const picker = createPicker(RETAKE);
  const changed = new Set(weatherOf(RETAKE).files.flatMap((file) => (file.change === undefined ? [] : [file.path])));
  const files = instances(RETAKE);
  expect(files.length).toBeGreaterThan(400);
  for (const file of files) expect(picker.pick([file.x, file.y], 1, 0)).toMatchObject({ kind: 'organelle', path: file.id });
  const unlit = files.filter((file) => !changed.has(file.id) && !RETAKE.notices.some((notice) => notice.target === file.id));
  for (const file of unlit) expect(picker.pick([file.x, file.y], 0, 0)?.kind).toBe('membrane');
});

/** Ground with no relief. */
const flat = (): number => 0;

test('the point under the pointer is where its ray meets the skin, a raised terrace before the ground behind it', () => {
  expect(surfacePoint([30, 500, 40], [30, -500, 40], flat, 50)).toEqual([30, 40]);
  // Straight down, the relief never moves the point.
  expect(surfacePoint([30, 500, 40], [30, -500, 40], () => 20, 50)).toEqual([30, 40]);
  // Slanting one unit across per unit down, over a plateau 20 high: it lands 20 short of where the ground would take it.
  const slant = [
    [0, 100, 0],
    [200, -100, 0],
  ] as const;
  const plateau = surfacePoint(slant[0], slant[1], () => 20, 40);
  expect(plateau?.[0]).toBeCloseTo(80, 2);
  // A terrace 30 high from x = 70 on: the ray meets its face, not the ground at x = 100.
  const terrace = surfacePoint(slant[0], slant[1], (x) => (x >= 70 ? 30 : 0), 40);
  expect(terrace?.[0]).toBeCloseTo(70, 2);
  expect(surfacePoint([0, 5, 0], [10, 5, 0], flat, 10)).toBeUndefined();
});
