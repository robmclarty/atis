import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap, membraneThickness } from 'core';
import type { MapJson } from 'core';
import { expect, test } from 'vitest';

import { driftOf } from '../drift.js';
import { INTERIOR_LAYOUT, cellSlide, exportsWords, interiorOf, tagsOf } from '../interior.js';
import type { Body, Slide } from '../interior.js';
import { LABELING } from '../labels.js';
import { dentedRing } from '../membranes.js';
import type { Point } from '../minimap.js';
import { createScheduler } from '../motion.js';
import { openRing } from '../raster.js';
import { AT_REST, outlineOf } from '../shape.js';
import { LOD_FADE_MS, MONO_ADVANCE } from '../tokens.js';

/**
 * An opened cell as a stained slide (step 40): the membrane as the frame with
 * the barrel's exports on it, each file stained by what the change did to it
 * with its uncovered share unstained, the bodies drifting and morphing under
 * the scheduler, the exploded view spreading them clear of one another, and
 * the tags kept in two columns on the screen.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));
const PM = 'folder:libs/core/src/pm';
const CORE = 'package:libs/core';
const INDEX = 'libs/core/src/pm/index.ts';
const TOOLS = 'libs/core/src/pm/tools.ts';
const LEGACY = 'libs/core/src/pm/legacy.ts';
const SLOTS = 'libs/core/src/pm/slots.ts';
const CLI = 'package:apps/cli';
const DOCTOR = 'apps/cli/src/doctor.ts';

function slideOf(cell: string, map: MapJson = DEMO): Slide {
  const slide = cellSlide(map, cell);
  if (slide === undefined) throw new Error(`the demo has no slide for ${cell}`);
  return slide;
}

function bodyOf(bodies: readonly Body[], id: string): Body {
  const body = bodies.find((each) => each.id === id);
  if (body === undefined) throw new Error(`no body for ${id}`);
  return body;
}

/** A projection that scales the layout up and shifts it, as a camera does. */
const project = (x: number, y: number): Point => [x * 2 + 100, y * 2 + 50];
const SCREEN = { width: 1200, height: 900, pixelsPerUnit: 2 };

test("a cell's slide is its dented membrane with the barrel's exports on it, its files at rest in path order, and the cells it holds cut out", () => {
  const slide = slideOf(PM);
  const cell = DEMO.terrain.cells.find((each) => each.id === PM);
  const contour = DEMO.terrain.layout?.contours?.[PM];
  if (cell === undefined || contour === undefined) throw new Error('the demo lost its pm folder');
  expect(slide.path).toBe('libs/core/src/pm');
  expect(slide.ring).toEqual(openRing(dentedRing(contour, cell.dents.length)));
  expect(slide.holes).toEqual([]);
  expect(slide.thickness).toBe(membraneThickness(cell.interface_size));
  expect(slide.files.map((file) => file.id)).toEqual([INDEX, LEGACY, SLOTS, TOOLS]);
  for (const file of slide.files) expect(file.rest).toEqual(DEMO.terrain.layout?.positions[file.id]);
  // The barrel's exports sit on the membrane nearest the barrel's own body, the head's names under their count (D162).
  expect(slide.exports.count).toBe(cell.interface_size);
  expect(slide.exports.names).toEqual(['listSlots', 'resolveSlot', 'resolveTool']);
  expect(slide.exports.barrel).toBe('index.ts');
  const index = slide.files.find((file) => file.id === INDEX);
  const nearest = Math.min(...slide.ring.map(([x, y]) => Math.hypot(x - (index?.rest.x ?? 0), y - (index?.rest.y ?? 0))));
  expect(Math.hypot(slide.exports.x - (index?.rest.x ?? 0), slide.exports.y - (index?.rest.y ?? 0))).toBeLessThanOrEqual(nearest + 1e-9);
  expect(exportsWords(slide.exports)).toEqual(['index.ts · 3 exports', 'listSlots  resolveSlot  resolveTool']);
  expect(exportsWords({ count: 1, x: 0, y: 0 })).toEqual(['1 export']);
  // The slide is cut into triangles over every point of its ring.
  expect(slide.vertices.length).toBe(slide.ring.length * 2);
  expect(slide.triangles.length).toBeGreaterThanOrEqual((slide.ring.length - 2) * 3);

  // A package's slide cuts out the folders it holds, so their own files stay in view beneath it.
  const core = slideOf(CORE);
  // The holes come in the held cells' id order, the util directory before the pm folder.
  expect(core.holes.map((hole) => hole.length)).toEqual(['directory:libs/core/src/util', PM].map((held) => openRing(DEMO.terrain.layout?.contours?.[held] ?? []).length));
  expect(core.vertices.length).toBe((core.ring.length + core.holes.reduce((total, hole) => total + hole.length, 0)) * 2);
  expect(core.files.map((file) => file.id)).toEqual(['libs/core/src/index.ts']);
  // A cell with no barrel writes its count and its entrance's names, at the membrane's top.
  const util = slideOf('directory:libs/core/src/util');
  expect(util.exports.barrel).toBeUndefined();
  expect(exportsWords(util.exports)).toEqual(['1 export', 'formatSlot']);
  expect([util.exports.x, util.exports.y]).toEqual(util.ring.toSorted((a, b) => a[1] - b[1] || a[0] - b[0])[0]);
  expect(cellSlide(DEMO, 'folder:nowhere')).toBeUndefined();
});

test("a package's slide holds the file of each single-file cell it holds as a body beside its own, floating by its package ties, and cuts holes only for its folders and directories (D167)", () => {
  // apps/cli holds its barrel and the single-file module doctor.ts, and no folder: one slide, two bodies, no holes.
  const cli = slideOf(CLI);
  expect(cli.files.map((file) => file.id)).toEqual([DOCTOR, 'apps/cli/src/index.ts']);
  expect(cli.holes).toEqual([]);
  expect(cli.vertices.length).toBe(cli.ring.length * 2);
  for (const file of cli.files) expect(file.rest).toEqual(DEMO.terrain.layout?.positions[file.id]);
  // doctor.ts is held once from inside apps/cli and reaches out twice; the barrel's one tie is to doctor.ts beside it.
  expect(cli.files.map((file) => [file.id, file.looseness])).toEqual([
    [DOCTOR, 2 / 3],
    ['apps/cli/src/index.ts', 0],
  ]);
  // The module floats on its package's slide, so it has none of its own.
  expect(cellSlide(DEMO, 'single:apps/cli/src/doctor.ts')).toBeUndefined();
  // libs/core holds a folder and a directory and no single-file module: holes for both, and its barrel alone on the slide.
  const core = slideOf(CORE);
  expect(core.holes).toHaveLength(2);
  expect(core.files.map((file) => file.id)).toEqual(['libs/core/src/index.ts']);
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
  expect(slideOf(CLI, untied).files.find((file) => file.id === DOCTOR)?.looseness).toBeUndefined();
});

test("the membrane writes the names a few to a line in columns as wide as their longest, the rest counted past a dozen, and the count alone where the map records no names (D162, C2)", () => {
  const names = Array.from({ length: 14 }, (_, index) => `name${'x'.repeat(index % 3)}${String(index).padStart(2, '0')}`);
  expect(exportsWords({ count: names.length, names, barrel: 'index.ts', x: 0, y: 0 })).toEqual([
    'index.ts · 14 exports',
    'name00  namex01  namexx02',
    'name03  namex04  namexx05',
    'name06  namex07  namexx08',
    'name09  namex10  namexx11',
    'and 2 more',
  ]);
  // A dozen exactly is written whole; the last line holds what is left, its columns still aligned.
  expect(exportsWords({ count: 4, names: ['a', 'bbbb', 'cc', 'ddd'], x: 0, y: 0 })).toEqual(['4 exports', 'a    bbbb  cc', 'ddd']);
  expect(exportsWords({ count: 12, names: names.slice(0, 12), x: 0, y: 0 }).at(-1)).toBe('name09  namex10  namexx11');
  // The panel's tokens move the lines: two to a line, four shown.
  expect(exportsWords({ count: 5, names: ['a', 'b', 'c', 'd', 'e'], x: 0, y: 0 }, { ...INTERIOR_LAYOUT, exportsPerLine: 2, exportsShown: 4 })).toEqual(['5 exports', 'a  b', 'c  d', 'and 1 more']);
  // A map with no names on the cell writes the count the terrain holds, and no names at all.
  const cells = DEMO.terrain.cells.map((cell) => {
    const { exports: _, ...bare } = cell;
    return bare;
  });
  const bare = slideOf(PM, { ...DEMO, terrain: { ...DEMO.terrain, cells } });
  expect(bare.exports.names).toBeUndefined();
  expect(exportsWords(bare.exports)).toEqual(['index.ts · 3 exports']);
});

test('each file is stained by what the change did to it, with the share of its changed lines no test ran unstained, a file nobody measured unstained whole (C11, D71, D80)', () => {
  const slide = slideOf(PM);
  const stain = (id: string): unknown => slide.files.find((file) => file.id === id)?.stain;
  expect(stain(INDEX)).toEqual({ kind: 'modified', open: 5 / 9 });
  expect(stain(TOOLS)).toEqual({ kind: 'added', open: 2 / 9 });
  expect(stain(LEGACY)).toEqual({ kind: 'deleted', open: 0 });
  expect(stain(SLOTS)).toBeUndefined();
  // doctor.ts floats on its package's slide, and its stain rides with it there (D167).
  expect(slideOf(CLI).files.find((file) => file.id === DOCTOR)?.stain).toEqual({ kind: 'modified', open: 1 });
  const renamed: MapJson = { ...DEMO, weather: { ...DEMO.weather, changed: DEMO.weather.changed.map((file) => (file.path === INDEX ? { ...file, kind: 'renamed', from: 'libs/core/src/pm/main.ts' } : file)) } };
  expect(slideOf(PM, renamed).files.find((file) => file.id === INDEX)?.stain).toEqual({ kind: 'renamed', from: 'libs/core/src/pm/main.ts', open: 5 / 9 });
  // The rules each file breaks, and how loosely its cell holds it, ride with it.
  expect(slide.files.map((file) => [file.id, file.rules, file.looseness])).toEqual([
    [INDEX, 0, 0.5],
    [LEGACY, 0, undefined],
    [SLOTS, 0, 0.5],
    [TOOLS, 2, 0.5],
  ]);
});

test('at rest every body sits where the layout put it in its still outline; opened, it floats where the scheduler floats it and moves by its rules (D147, D157)', () => {
  const slide = slideOf(PM);
  const rest = interiorOf(slide);
  for (const body of rest) {
    expect([body.x, body.y, body.r]).toEqual([body.rest.x, body.rest.y, body.rest.r]);
    expect(body.outline).toEqual(outlineOf(body.id, body.rest, body.rules));
  }
  const scheduler = createScheduler({ clock: () => 9000, seed: 7, tiers: [], reduced: false });
  scheduler.load();
  const floated = driftOf(DEMO, PM, 9000, { seed: 7, screen: 400 });
  const moving = interiorOf(slide, { drifted: floated, shape: scheduler.shape });
  const drifted = new Map(floated.map((file) => [file.id, file] as const));
  for (const body of moving) expect([body.x, body.y]).toEqual([drifted.get(body.id)?.x, drifted.get(body.id)?.y]);
  expect(moving.some((body) => body.x !== body.rest.x || body.y !== body.rest.y)).toBe(true);
  // A file the float leaves out sits where the layout put it.
  expect(interiorOf(slide, { drifted: floated.filter((file) => file.id !== TOOLS) }).find((body) => body.id === TOOLS)).toMatchObject({ x: bodyOf(rest, TOOLS).rest.x, y: bodyOf(rest, TOOLS).rest.y });
  // A file within every threshold keeps its still outline; one breaking rules is pulsing and turned.
  expect(bodyOf(moving, SLOTS).outline).toEqual(outlineOf(SLOTS, bodyOf(moving, SLOTS), 0));
  expect(bodyOf(moving, TOOLS).outline).not.toEqual(outlineOf(TOOLS, bodyOf(moving, TOOLS), 2, AT_REST));
  expect(bodyOf(moving, TOOLS).outline).toEqual(outlineOf(TOOLS, bodyOf(moving, TOOLS), 2, scheduler.shape(2)));
  // Under reduced motion nothing moves, and one seed and one time give one frame (C3).
  for (const body of interiorOf(slide, { drifted: floated, reduced: true, shape: scheduler.shape })) expect(body).toEqual(bodyOf(rest, body.id));
  expect(interiorOf(slide, { drifted: floated, shape: scheduler.shape })).toEqual(moving);
});

test('the exploded view spreads every body out from the middle along its leader, clear of the others, and gathers them back by how far it has spread', () => {
  const slide = slideOf(PM);
  const out = (point: Point): number => Math.hypot(point[0] - slide.centre[0], point[1] - slide.centre[1]);
  for (const file of slide.files) expect(out(file.exploded)).toBeGreaterThan(out([file.rest.x, file.rest.y]));
  slide.files.forEach((a, index) => {
    for (const b of slide.files.slice(index + 1)) {
      expect(Math.hypot(a.exploded[0] - b.exploded[0], a.exploded[1] - b.exploded[1]), `${a.id} and ${b.id}`).toBeGreaterThanOrEqual(a.rest.r + b.rest.r + INTERIOR_LAYOUT.explodeGap - 1e-6);
    }
  });
  const drifted = driftOf(DEMO, PM, 9000, { seed: 7, screen: 400 });
  const spread = interiorOf(slide, { drifted, explode: 1 });
  for (const body of spread) expect([body.x, body.y]).toEqual(body.exploded);
  const half = interiorOf(slide, { drifted, explode: 0.5 });
  const moving = interiorOf(slide, { drifted });
  for (const body of half) {
    const from = bodyOf(moving, body.id);
    expect(body.x).toBeCloseTo((from.x + body.exploded[0]) / 2, 9);
    expect(body.y).toBeCloseTo((from.y + body.exploded[1]) / 2, 9);
  }
  // The layout's tokens move the spread live (D156).
  const wider = cellSlide(DEMO, PM, { ...INTERIOR_LAYOUT, explodeSpread: 3 });
  for (const file of wider?.files ?? []) expect(out(file.exploded)).toBeGreaterThan(out(bodyOf(spread, file.id).exploded));
});

test('the tags stand in two columns beside the slide, each on its body\'s side, stacked down the column clear of one another, with a leader to the body\'s rim', () => {
  const slide = slideOf(PM);
  const bodies = interiorOf(slide);
  const tags = tagsOf(slide, bodies, project, SCREEN);
  expect(tags.map((tag) => tag.text).toSorted()).toEqual(['+tools.ts · 2', 'index.ts', 'legacy.ts', 'slots.ts']);
  const onScreen = slide.ring.map(([x, y]) => project(x, y));
  const x0 = Math.min(...onScreen.map(([x]) => x));
  const x1 = Math.max(...onScreen.map(([x]) => x));
  const middle = (x0 + x1) / 2;
  const height = LABELING.fontSize + 2 * LABELING.pad;
  for (const tag of tags) {
    const body = bodyOf(bodies, tag.id);
    const [sx, sy] = project(body.x, body.y);
    expect(tag.side).toBe(sx < middle ? 'left' : 'right');
    expect(tag.box.height).toBe(height);
    expect(tag.box.width).toBeCloseTo(tag.text.length * LABELING.fontSize * MONO_ADVANCE + 2 * LABELING.pad, 9);
    // Against the slide's edge, and the leader from the tag's inner edge to the body's rim.
    if (tag.side === 'left') expect(tag.box.x + tag.box.width).toBe(x0 - LABELING.gap);
    else expect(tag.box.x).toBe(x1 + LABELING.gap);
    expect(tag.leader.from).toEqual([tag.side === 'left' ? tag.box.x + tag.box.width : tag.box.x, tag.box.y + height / 2]);
    expect(Math.hypot(tag.leader.to[0] - sx, tag.leader.to[1] - sy)).toBeCloseTo(body.r * SCREEN.pixelsPerUnit, 6);
  }
  for (const side of ['left', 'right'] as const) {
    const column = tags.filter((tag) => tag.side === side);
    column.slice(1).forEach((tag, index) => {
      const above = column[index];
      expect(tag.box.y).toBeGreaterThanOrEqual((above?.box.y ?? 0) + height);
      expect(project(bodyOf(bodies, tag.id).x, bodyOf(bodies, tag.id).y)[1]).toBeGreaterThanOrEqual(project(bodyOf(bodies, above?.id ?? '').x, bodyOf(bodies, above?.id ?? '').y)[1]);
    });
  }
  // However the slide is framed, the columns stay on the screen: a slide wider than the screen pulls them in from its edges.
  const [cx, cy] = [(Math.min(...slide.ring.map(([x]) => x)) + Math.max(...slide.ring.map(([x]) => x))) / 2, (Math.min(...slide.ring.map(([, y]) => y)) + Math.max(...slide.ring.map(([, y]) => y))) / 2];
  const close = tagsOf(slide, bodies, (x, y) => [(x - cx) * 20 + 400, (y - cy) * 20 + 300], { width: 800, height: 600, pixelsPerUnit: 20 });
  for (const tag of close) {
    expect(tag.box.x).toBeGreaterThanOrEqual(0);
    expect(tag.box.x + tag.box.width).toBeLessThanOrEqual(800);
    expect(tag.box.y + tag.box.height).toBeLessThanOrEqual(600);
  }
  expect(tagsOf(slide, bodies, project, SCREEN)).toEqual(tags);
});

test("the scheduler fades a slide in over the cross-fade's time as a cell opens, holds it open, fades it out as it closes, and spreads the exploded view the same way", () => {
  let now = 0;
  const scheduler = createScheduler({ clock: () => now, seed: 7, tiers: [], reduced: false });
  scheduler.load();
  expect(scheduler.frame().open).toEqual({ cell: undefined, shown: 0, exploded: 0 });
  now = 1000;
  scheduler.frame();
  scheduler.open(PM);
  now = 1000 + LOD_FADE_MS / 2;
  const half = scheduler.frame().open;
  expect(half.cell).toBe(PM);
  expect(half.shown).toBeCloseTo(0.5, 9);
  now = 1000 + LOD_FADE_MS;
  expect(scheduler.frame().open.shown).toBe(1);
  // The exploded view spreads at the same rate, and gathers.
  scheduler.explode(true);
  now += LOD_FADE_MS / 2;
  expect(scheduler.frame().open.exploded).toBeCloseTo(0.5, 9);
  now += LOD_FADE_MS;
  expect(scheduler.frame().open.exploded).toBe(1);
  scheduler.explode(false);
  now += LOD_FADE_MS;
  expect(scheduler.frame().open.exploded).toBe(0);
  // Closing fades the slide out, the cell still named, until it is gone; opened again as it fades, it fades back in from there.
  now = 5000;
  scheduler.frame();
  scheduler.open(undefined);
  now = 5000 + LOD_FADE_MS / 2;
  const closing = scheduler.frame().open;
  expect(closing).toEqual({ cell: PM, shown: 0.5, exploded: 0 });
  scheduler.open(PM);
  now += LOD_FADE_MS / 4;
  expect(scheduler.frame().open.shown).toBeCloseTo(0.75, 9);
  scheduler.open(undefined);
  now += LOD_FADE_MS;
  expect(scheduler.frame().open).toEqual({ cell: undefined, shown: 0, exploded: 0 });
  // Another cell opening over one fades in from nothing, and the exploded view gathers.
  scheduler.open(PM);
  now += LOD_FADE_MS;
  scheduler.frame();
  scheduler.explode(true);
  now += LOD_FADE_MS;
  expect(scheduler.frame().open.exploded).toBe(1);
  scheduler.open(CORE);
  const switched = scheduler.frame().open;
  expect(switched).toEqual({ cell: CORE, shown: 0, exploded: 0 });
  // Under reduced motion the slide and the exploded view cut.
  const still = createScheduler({ clock: () => now, seed: 7, tiers: [], reduced: true });
  still.open(PM);
  still.explode(true);
  expect(still.frame().open).toEqual({ cell: PM, shown: 1, exploded: 1 });
  still.open(undefined);
  expect(still.frame().open).toEqual({ cell: undefined, shown: 0, exploded: 0 });
});
