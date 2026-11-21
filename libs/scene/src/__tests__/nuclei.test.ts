import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson, Organelle } from 'core';
import { expect, test } from 'vitest';

import { compositesOf } from '../composites.js';
import { slideCellOf } from '../drift.js';
import { cellSlide, interiorOf } from '../interior.js';
import { nucleiOf } from '../nuclei.js';
import type { RestGranule } from '../nuclei.js';
import { outlineOf } from '../shape.js';
import { NUCLEUS_FILL, NUCLEUS_MOST, NUCLEUS_PAD } from '../tokens.js';
import { troubleOf } from '../trouble.js';

/**
 * Every placed file's functions as granules at rest on the map (D206
 * (detail-by-size)), read on the demo, the one fixture that carries
 * per-function data: eight of its nine files name their functions, one of
 * those names none, and one carries no function data at all.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));
const DOCTOR = 'apps/cli/src/doctor.ts';
const CLI_INDEX = 'apps/cli/src/index.ts';
const CORE_INDEX = 'libs/core/src/index.ts';
const LEGACY = 'libs/core/src/pm/legacy.ts';
const TOOLS = 'libs/core/src/pm/tools.ts';

function organelleOf(id: string, map: MapJson = DEMO): Organelle {
  const organelle = map.terrain.organelles.find((each) => each.id === id);
  if (organelle === undefined) throw new Error(`the demo lost ${id}`);
  return organelle;
}

function placeOf(id: string, map: MapJson = DEMO): { readonly x: number; readonly y: number; readonly r: number } {
  const place = map.terrain.layout?.positions[id];
  if (place === undefined) throw new Error(`the demo placed no ${id}`);
  return place;
}

/** The demo with one file changed. */
function withFile(id: string, change: (organelle: Organelle) => Organelle): MapJson {
  return { ...DEMO, terrain: { ...DEMO.terrain, organelles: DEMO.terrain.organelles.map((organelle) => (organelle.id === id ? change(organelle) : organelle)) } };
}

function of(granules: readonly RestGranule[], file: string): readonly RestGranule[] {
  return granules.filter((granule) => granule.file === file);
}

function areaOf(granules: readonly RestGranule[]): number {
  return granules.reduce((total, granule) => total + Math.PI * granule.r ** 2, 0);
}

test('every placed file with function data has a granule per function, files in path order and each file in line order; a file with none has none (C2, C3)', () => {
  const nuclei = nucleiOf(DEMO);
  expect(nuclei.off).toBeUndefined();
  expect(Object.keys(nuclei)).toEqual(['granules']);
  const expected = DEMO.terrain.organelles
    .toSorted((a, b) => (a.id < b.id ? -1 : 1))
    .flatMap((organelle) => (organelle.functions ?? []).map((fn) => [organelle.id, organelle.cell, fn.name, fn.line, (fn.breaches ?? []).length > 0]));
  expect(nuclei.granules.map((granule) => [granule.file, granule.cell, granule.name, granule.line, granule.breached])).toEqual(expected);
  expect(nuclei.granules).toHaveLength(14);
  // The scan read no functions in one file and named none in another: neither has a granule.
  expect(organelleOf(LEGACY).functions).toBeUndefined();
  expect(organelleOf(CORE_INDEX).functions).toEqual([]);
  expect(of(nuclei.granules, LEGACY)).toEqual([]);
  expect(of(nuclei.granules, CORE_INDEX)).toEqual([]);
  // Only the function that breaks a threshold says so.
  expect(of(nuclei.granules, TOOLS).map((granule) => granule.breached)).toEqual([false, true, false]);
  // One map gives one list.
  expect(nucleiOf(DEMO)).toEqual(nuclei);
  expect(nucleiOf(structuredClone(DEMO))).toEqual(nuclei);
});

test('a count of functions alone makes no granule, and neither does a file the layout did not place (C2)', () => {
  const counted = withFile(TOOLS, ({ functions: _functions, ...rest }) => ({ ...rest, function_count: 12 }));
  expect(of(nucleiOf(counted).granules, TOOLS)).toEqual([]);
  expect(nucleiOf(counted).granules).toHaveLength(11);
  const { [TOOLS]: _place, ...positions } = DEMO.terrain.layout?.positions ?? {};
  const unplaced: MapJson = { ...DEMO, terrain: { ...DEMO.terrain, ...(DEMO.terrain.layout === undefined ? {} : { layout: { ...DEMO.terrain.layout, positions } }) } };
  expect(of(nucleiOf(unplaced).granules, TOOLS)).toEqual([]);
});

test('a map none of whose placed files carries function data has no granules and says nobody read them, which a file that names no functions does not (C2)', () => {
  const unread: MapJson = { ...DEMO, terrain: { ...DEMO.terrain, organelles: DEMO.terrain.organelles.map(({ functions: _functions, ...rest }) => ({ ...rest, function_count: 3 })) } };
  expect(nucleiOf(unread)).toEqual({ granules: [], off: 'no function data' });
  // A map the layout placed nothing on has no file to carry any.
  const { layout: _layout, ...bare } = DEMO.terrain;
  expect(nucleiOf({ ...DEMO, terrain: bare })).toEqual({ granules: [], off: 'no function data' });
  // Function data that names no function is read, and is none: no reason is given.
  const empty: MapJson = { ...DEMO, terrain: { ...DEMO.terrain, organelles: DEMO.terrain.organelles.map((organelle) => (organelle.functions === undefined ? organelle : { ...organelle, functions: [] })) } };
  expect(nucleiOf(empty)).toEqual({ granules: [] });
});

test("each granule lies inside its file's padded core, in layout units, about the place the layout gave the file", () => {
  const { granules } = nucleiOf(DEMO);
  for (const granule of granules) {
    const place = placeOf(granule.file);
    const { core } = outlineOf(granule.file, place, troubleOf(organelleOf(granule.file)).score);
    expect(granule.r).toBeGreaterThan(0);
    expect(Math.hypot(granule.x - place.x, granule.y - place.y) + granule.r, `${granule.file} ${granule.name}`).toBeLessThanOrEqual(core * (1 - NUCLEUS_PAD) + 1e-9);
  }
  // A lone function sits at its file's middle.
  const [lone] = of(granules, CLI_INDEX);
  expect([lone?.x, lone?.y]).toEqual([placeOf(CLI_INDEX).x, placeOf(CLI_INDEX).y]);
});

test("a file's granules at rest are the nucleus its module's slide lays, moved to the file's place on the map (D197)", () => {
  const { granules } = nucleiOf(DEMO);
  const files = [...new Set(granules.map((granule) => granule.file))];
  expect(files).toHaveLength(7);
  for (const file of files) {
    const slide = cellSlide(DEMO, slideCellOf(DEMO, organelleOf(file).cell));
    if (slide === undefined) throw new Error(`no slide shows ${file}`);
    const laid = interiorOf(slide).find((body) => body.id === file)?.nucleus?.granules ?? [];
    const place = placeOf(file);
    const rest = of(granules, file);
    expect(rest.map((granule) => granule.name)).toEqual(laid.map((granule) => granule.name));
    rest.forEach((granule, index) => {
      expect(granule.x - place.x).toBeCloseTo(laid[index]?.x ?? Number.NaN, 9);
      expect(granule.y - place.y).toBeCloseTo(laid[index]?.y ?? Number.NaN, 9);
      expect(granule.r).toBeCloseTo(laid[index]?.r ?? Number.NaN, 9);
    });
  }
});

test("a file is filled against the largest file of its own module, the package's for a single-file module, and never against another module's (D167)", () => {
  const { granules } = nucleiOf(DEMO);
  // doctor.ts is a module of one file, and is measured with the files of the package it floats in: it is the largest there, so it reads full.
  expect(slideCellOf(DEMO, organelleOf(DOCTOR).cell)).toBe('package:apps/cli');
  const doctorCore = outlineOf(DOCTOR, placeOf(DOCTOR), troubleOf(organelleOf(DOCTOR)).score).core;
  expect(areaOf(of(granules, DOCTOR))).toBeLessThanOrEqual(NUCLEUS_FILL * Math.PI * doctorCore ** 2 + 1e-9);
  expect(areaOf(of(granules, DOCTOR))).toBeGreaterThan((NUCLEUS_FILL * Math.PI * doctorCore ** 2) / 2);
  // The package's own index.ts reads by its lines over doctor.ts's.
  const indexCore = outlineOf(CLI_INDEX, placeOf(CLI_INDEX), troubleOf(organelleOf(CLI_INDEX)).score).core;
  const share = organelleOf(CLI_INDEX).loc / organelleOf(DOCTOR).loc;
  expect(areaOf(of(granules, CLI_INDEX))).toBeCloseTo(NUCLEUS_FILL * share * Math.PI * indexCore ** 2, 9);
  // Doubling the largest file of one module thins that module's other files and leaves every other module as it was.
  const grown = nucleiOf(withFile(DOCTOR, (organelle) => ({ ...organelle, loc: organelle.loc * 2 }))).granules;
  expect(areaOf(of(grown, CLI_INDEX))).toBeCloseTo(areaOf(of(granules, CLI_INDEX)) / 2, 9);
  expect(grown.filter((granule) => granule.file.startsWith('libs/'))).toEqual(granules.filter((granule) => granule.file.startsWith('libs/')));
});

test('the nucleus tokens are read as handed in (D156): half the fill is half the area, and past the most a file draws its largest functions', () => {
  const { granules } = nucleiOf(DEMO);
  const halved = nucleiOf(DEMO, [], { NUCLEUS_FILL: NUCLEUS_FILL / 2, NUCLEUS_PAD, NUCLEUS_MOST }).granules;
  expect(halved).toHaveLength(granules.length);
  expect(areaOf(of(halved, CLI_INDEX))).toBeCloseTo(areaOf(of(granules, CLI_INDEX)) / 2, 9);
  const one = nucleiOf(DEMO, [], { NUCLEUS_FILL, NUCLEUS_PAD, NUCLEUS_MOST: 1 }).granules;
  expect(one).toHaveLength(7);
  for (const granule of one) {
    const longest = Math.max(...(organelleOf(granule.file).functions ?? []).map((fn) => fn.line_count));
    expect(organelleOf(granule.file).functions?.find((fn) => fn.name === granule.name)?.line_count).toBe(longest);
  }
});

test('a map whose packages stand as composites has no granules, and says why', () => {
  const placed = DEMO.terrain.organelles.filter((organelle) => DEMO.terrain.layout?.positions[organelle.id] !== undefined).length;
  expect(nucleiOf(DEMO, compositesOf(DEMO, placed))).toEqual(nucleiOf(DEMO));
  const composites = compositesOf(DEMO, placed - 1);
  expect(composites.length).toBeGreaterThan(0);
  expect(nucleiOf(DEMO, composites)).toEqual({ granules: [], off: 'composites' });
  // The composites are the first reason given, whatever the files carry.
  const unread: MapJson = { ...DEMO, terrain: { ...DEMO.terrain, organelles: DEMO.terrain.organelles.map(({ functions: _functions, ...rest }) => rest) } };
  expect(nucleiOf(unread, composites).off).toBe('composites');
});
