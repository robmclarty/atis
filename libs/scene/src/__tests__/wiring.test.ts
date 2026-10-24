import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson } from 'core';
import { expect, test } from 'vitest';

import { MONO_ADVANCE } from '../tokens.js';
import { WIRING_SPACING, cellWiring, layWiring } from '../wiring.js';
import type { Plate, PlateBox, Wiring } from '../wiring.js';

/**
 * A changed cell's wiring (step 41): the map's wires with an end in the
 * opened cell, each file in the frame of its home, laid out by elkjs as a
 * plate with importers left of importees, the same plate every time.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));
const PM = 'folder:libs/core/src/pm';
const UTIL = 'directory:libs/core/src/util';

function wiringOf(cell: string, map: MapJson = DEMO): Wiring {
  const wiring = cellWiring(map, cell);
  if (wiring === undefined) throw new Error(`the demo has no wiring for ${cell}`);
  return wiring;
}

/** Whether `inner` lies within `outer`, edges included. */
const within = (inner: PlateBox, outer: PlateBox): boolean => inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.width <= outer.x + outer.width && inner.y + inner.height <= outer.y + outer.height;

const overlap = (a: PlateBox, b: PlateBox): boolean => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6;

/** Whether a point lies on a box's outline, to a hair. */
const onEdge = ([x, y]: readonly [number, number], box: PlateBox): boolean => {
  const across = x >= box.x - 1e-6 && x <= box.x + box.width + 1e-6;
  const down = y >= box.y - 1e-6 && y <= box.y + box.height + 1e-6;
  return (across && (near(y, box.y) || near(y, box.y + box.height))) || (down && (near(x, box.x) || near(x, box.x + box.width)));
};

test("the pm folder's wiring is every wire with an end in it, each file in its home's frame, the folder's own first, named within its home with the added file marked", () => {
  const wiring = wiringOf(PM);
  expect(wiring.homes).toEqual([
    {
      id: PM,
      text: 'libs/core/src/pm',
      inside: true,
      files: [
        { id: 'libs/core/src/pm/index.ts', text: 'index.ts', change: 'modified' },
        { id: 'libs/core/src/pm/slots.ts', text: 'slots.ts' },
        { id: 'libs/core/src/pm/tools.ts', text: '+tools.ts', change: 'added' },
      ],
    },
    { id: UTIL, text: 'libs/core/src/util', inside: false, files: [{ id: 'libs/core/src/util/format.ts', text: 'format.ts' }] },
    { id: 'package:libs/core', text: 'libs/core', inside: false, files: [{ id: 'libs/core/src/index.ts', text: 'src/index.ts' }] },
    // A single-file module's one file is its home, so it is named by its last part.
    { id: 'single:apps/cli/src/doctor.ts', text: 'apps/cli/src/doctor.ts', inside: false, files: [{ id: 'apps/cli/src/doctor.ts', text: 'doctor.ts', change: 'modified' }] },
    // A test lives in its shore group, which has no path to be named within.
    { id: 'tests', text: 'tests', inside: false, files: [{ id: 'libs/core/src/__tests__/pm.test.ts', text: 'pm.test.ts', change: 'modified' }] },
  ]);
  expect(wiring.edges).toEqual([
    { from: 'apps/cli/src/doctor.ts', to: 'libs/core/src/pm/index.ts' },
    { from: 'libs/core/src/__tests__/pm.test.ts', to: 'libs/core/src/pm/index.ts' },
    { from: 'libs/core/src/__tests__/pm.test.ts', to: 'libs/core/src/pm/tools.ts' },
    { from: 'libs/core/src/index.ts', to: 'libs/core/src/pm/index.ts' },
    { from: 'libs/core/src/pm/index.ts', to: 'libs/core/src/pm/slots.ts' },
    { from: 'libs/core/src/pm/index.ts', to: 'libs/core/src/pm/tools.ts' },
    { from: 'libs/core/src/pm/tools.ts', to: 'libs/core/src/util/format.ts' },
  ]);
  // The deleted legacy.ts is on the slide but on no wire of the head graph.
  expect(wiring.homes.flatMap((home) => home.files.map((file) => file.id))).not.toContain('libs/core/src/pm/legacy.ts');
});

test('a cell nothing in the change touches still shows the changed file that reads it, and slots.ts, which reads it unchanged, stays off', () => {
  expect(wiringOf(UTIL)).toEqual({
    cell: UTIL,
    homes: [
      { id: UTIL, text: 'libs/core/src/util', inside: true, files: [{ id: 'libs/core/src/util/format.ts', text: 'format.ts' }] },
      { id: PM, text: 'libs/core/src/pm', inside: false, files: [{ id: 'libs/core/src/pm/tools.ts', text: '+tools.ts', change: 'added' }] },
    ],
    edges: [{ from: 'libs/core/src/pm/tools.ts', to: 'libs/core/src/util/format.ts' }],
  });
});

test('a map that records no wiring, a cell the map lacks, and a cell no wire reaches have none to show (C2)', () => {
  const { wiring: _, ...weather } = DEMO.weather;
  expect(cellWiring({ ...DEMO, weather }, PM)).toBeUndefined();
  expect(cellWiring(DEMO, 'folder:nowhere')).toBeUndefined();
  const unwired = { ...DEMO, weather: { ...DEMO.weather, wiring: (DEMO.weather.wiring ?? []).filter((edge) => edge.to !== 'libs/core/src/util/format.ts') } };
  expect(cellWiring(unwired, UTIL)).toBeUndefined();
});

test('the plate holds every file in its frame, no two frames or files overlapping, each frame as wide as its name, and every wire running from its importer to its importee', async () => {
  const wiring = wiringOf(PM);
  const plate = await layWiring(wiring);
  const plateBox: PlateBox = { x: 0, y: 0, width: plate.width, height: plate.height };
  expect(plate.cell).toBe(PM);
  expect(plate.homes.map((home) => home.id)).toEqual(wiring.homes.map((home) => home.id));
  expect(plate.files.map((file) => file.id).toSorted()).toEqual(wiring.homes.flatMap((home) => home.files.map((file) => file.id)).toSorted());
  for (const home of plate.homes) {
    expect(within(home, plateBox), `${home.id} runs off the plate`).toBe(true);
    expect(home.width).toBeGreaterThanOrEqual(home.text.length * WIRING_SPACING.fontSize * MONO_ADVANCE + 2 * WIRING_SPACING.pad + 2 * WIRING_SPACING.framePad);
    for (const other of plate.homes) if (other !== home) expect(overlap(home, other), `${home.id} overlaps ${other.id}`).toBe(false);
  }
  for (const file of plate.files) {
    const home = plate.homes.find((each) => each.id === file.home);
    expect(home && within(file, home), `${file.id} lies outside its frame`).toBe(true);
    expect(file.width).toBeCloseTo(file.text.length * WIRING_SPACING.fontSize * MONO_ADVANCE + 2 * WIRING_SPACING.pad);
    for (const other of plate.files) if (other !== file) expect(overlap(file, other), `${file.id} overlaps ${other.id}`).toBe(false);
  }
  const fileOf = new Map(plate.files.map((file) => [file.id, file] as const));
  expect(plate.lines.map(({ from, to }) => ({ from, to }))).toEqual(wiring.edges);
  for (const line of plate.lines) {
    const from = fileOf.get(line.from);
    const to = fileOf.get(line.to);
    const start = line.points[0];
    const end = line.points.at(-1);
    if (from === undefined || to === undefined || start === undefined || end === undefined) throw new Error(`a wire lost an end: ${line.from} → ${line.to}`);
    expect(onEdge(start, from), `${line.from} → ${line.to} starts off its importer`).toBe(true);
    expect(onEdge(end, to), `${line.from} → ${line.to} ends off its importee`).toBe(true);
    // The demo's pm wiring has no cycle, so every importer sits left of what it imports.
    expect(from.x + from.width).toBeLessThanOrEqual(to.x);
    // Orthogonal: each leg runs straight across or straight down.
    line.points.slice(1).forEach(([x, y], index) => {
      const [px, py] = line.points[index] ?? [x, y];
      expect(near(x, px) || near(y, py)).toBe(true);
    });
  }
});

test('one wiring lays one plate, and a wider spacing lays a wider one', async () => {
  const wiring = wiringOf(PM);
  const first: Plate = await layWiring(wiring);
  expect(await layWiring(wiring)).toEqual(first);
  const wider = await layWiring(wiring, { ...WIRING_SPACING, layerGap: WIRING_SPACING.layerGap * 2 });
  expect(wider.width).toBeGreaterThan(first.width);
});
