import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap, membraneThickness } from 'core';
import type { FileFunction, MapJson } from 'core';
import { expect, test } from 'vitest';

import { driftOf, restOf } from '../drift.js';
import { INTERIOR_LAYOUT, cellSlide, crossingsOf, exportsTable, exportsWords, interiorOf, nucleusOf, tagsOf } from '../interior.js';
import type { Body, Slide } from '../interior.js';
import { LABELING } from '../labels.js';
import { dentedRing } from '../membranes.js';
import type { Point } from '../minimap.js';
import { createScheduler } from '../motion.js';
import { openRing } from '../raster.js';
import { AT_REST, outlineOf } from '../shape.js';
import { troubleFrom } from '../trouble.js';
import { LOD_FADE_MS, MONO_ADVANCE, TAG_ELBOW, TAG_ROW_FLOOR, NUCLEUS_FILL, NUCLEUS_MOST, NUCLEUS_PAD, SHAPE_JITTER, SHAPE_PULSE, SHAPE_PULSE_HZ, SHAPE_TURN } from '../tokens.js';

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
  // Each rests where its package ties gather it (D199), and where the layout put it once the gather is 0.
  for (const file of cli.files) expect(file.rest).toEqual(restOf(DEMO, CLI).get(file.id));
  expect(cli.files.map((file) => file.rest)).not.toEqual(cli.files.map((file) => DEMO.terrain.layout?.positions[file.id]));
  for (const file of cellSlide(DEMO, CLI, { ...INTERIOR_LAYOUT, gather: 0 })?.files ?? []) expect(file.rest).toEqual(DEMO.terrain.layout?.positions[file.id]);
  expect(INTERIOR_LAYOUT.gather).toBeGreaterThan(0);
  expect(INTERIOR_LAYOUT.gather).toBeLessThanOrEqual(1);
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

/** The demo with each reach entry's names as given, by path, and none on any other. */
const namedReach = (names: Readonly<Record<string, readonly string[]>>): MapJson => ({
  ...DEMO,
  weather: {
    ...DEMO.weather,
    reach: DEMO.weather.reach.map((named) => {
      const { names: _, ...entry } = named;
      const carried = names[entry.path];
      return carried === undefined ? entry : { ...entry, names: carried };
    }),
  },
});

test('an opened cell marks the names its membrane writes that the reach crossed it by: those a reach entry outside the cell carries, never one inside (D181, D111)', () => {
  // On the demo, doctor.ts and libs/core's barrel take all three of pm's names from outside it.
  expect(slideOf(PM).exports.reached).toEqual(['listSlots', 'resolveSlot', 'resolveTool']);
  // doctor.ts alone carries two of them out; the barrel inside pm carries names too, which crossed no membrane of pm's.
  const doctorOnly = namedReach({ 'apps/cli/src/doctor.ts': ['resolveSlot', 'resolveTool'], 'libs/core/src/pm/index.ts': ['listSlots', 'resolveTool'] });
  expect(slideOf(PM, doctorOnly).exports.reached).toEqual(['resolveSlot', 'resolveTool']);
  expect(exportsTable(slideOf(PM, doctorOnly).exports).rows).toEqual([
    [
      { name: 'listSlots', text: 'listSlots', reached: false },
      { name: 'resolveSlot', text: 'resolveSlot', reached: true },
      { name: 'resolveTool', text: 'resolveTool', reached: true },
    ],
  ]);
  // Names carried only inside the cell, or by no entry at all, mark none.
  expect(slideOf(PM, namedReach({ 'libs/core/src/pm/index.ts': ['listSlots'] })).exports.reached).toBeUndefined();
  expect(slideOf(PM, namedReach({})).exports.reached).toBeUndefined();
  // libs/core's barrel is outside pm and inside libs/core: the names it carries cross pm's membrane, and none of libs/core's.
  const coreBarrel = namedReach({ 'libs/core/src/index.ts': ['listSlots', 'resolveSlot'] });
  expect(slideOf(PM, coreBarrel).exports.reached).toEqual(['listSlots', 'resolveSlot']);
  expect(slideOf(CORE, coreBarrel).exports.reached).toBeUndefined();
});

/** A cell's crossings as each name and the paths of the entries it carried. */
const crossed = (map: MapJson, cell: string): readonly (readonly [string, readonly string[]])[] | undefined => crossingsOf(map, cell)?.map(({ name, entries }) => [name, entries.map((entry) => entry.path)]);

test('each name the reach crossed a membrane by comes with the entries outside the cell that carried it, in the membrane\'s order, and a cell the map records no names for has none to give (D181, D186)', () => {
  // On the demo, pm/index.ts carries resolveTool too, but from inside pm, so only doctor.ts's crossing counts.
  expect(crossed(DEMO, PM)).toEqual([
    ['listSlots', ['libs/core/src/index.ts']],
    ['resolveSlot', ['apps/cli/src/doctor.ts', 'libs/core/src/index.ts']],
    ['resolveTool', ['apps/cli/src/doctor.ts']],
  ]);
  // Everything in libs/core is inside it, so only doctor.ts crosses its membrane, by the one name libs/core exports.
  expect(crossed(DEMO, CORE)).toEqual([['resolveSlot', ['apps/cli/src/doctor.ts']]]);
  expect(crossed(DEMO, 'directory:libs/core/src/util')).toEqual([]);
  const unnamed: MapJson = {
    ...DEMO,
    terrain: {
      ...DEMO.terrain,
      cells: DEMO.terrain.cells.map((cell) => {
        if (cell.id !== PM) return cell;
        const { exports: _, ...bare } = cell;
        return bare;
      }),
    },
  };
  expect(crossingsOf(unnamed, PM)).toBeUndefined();
  expect(crossingsOf(DEMO, 'folder:nowhere')).toBeUndefined();
});

test('the names the reach crossed by are kept among those a long list shows, in the list\'s own order, and the lines read as they did (D181)', () => {
  const names = Array.from({ length: 14 }, (_, index) => `name${String(index).padStart(2, '0')}`);
  const table = exportsTable({ count: names.length, names, reached: ['name13', 'name05'], barrel: 'index.ts', x: 0, y: 0 });
  const shown = table.rows.flat();
  expect(shown.map((cell) => cell.name)).toEqual([...names.slice(0, 11).filter((name) => name !== 'name11'), 'name13'].toSorted().slice(0, 12));
  expect(shown.filter((cell) => cell.reached).map((cell) => cell.name)).toEqual(['name05', 'name13']);
  expect(table.tail).toBe('and 2 more');
  // With nothing reached, the table writes the lines exportsWords always wrote.
  expect(exportsWords({ count: names.length, names, x: 0, y: 0 })).toEqual(['14 exports', 'name00  name01  name02', 'name03  name04  name05', 'name06  name07  name08', 'name09  name10  name11', 'and 2 more']);
});

test('each file is stained by what the change did to it, with the share of its changed lines no test ran unstained, a file nobody measured unstained whole (C11, D71, D80)', () => {
  const slide = slideOf(PM);
  const stain = (id: string): unknown => slide.files.find((file) => file.id === id)?.stain;
  expect(stain(INDEX)).toEqual({ kind: 'modified', open: 5 / 9 });
  expect(stain(TOOLS)).toEqual({ kind: 'added', open: 2 / 9 });
  // The deleted legacy file left its threshold and its clone: an improved stain, the calm-positive hue's (D98).
  expect(stain(LEGACY)).toEqual({ kind: 'deleted', open: 0, improved: true });
  expect(stain(SLOTS)).toBeUndefined();
  // doctor.ts floats on its package's slide, and its stain rides with it there (D167); it eased a function too.
  expect(slideOf(CLI).files.find((file) => file.id === DOCTOR)?.stain).toEqual({ kind: 'modified', open: 1, improved: true });
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

test('at rest every body sits where the layout put it in its still outline; opened, it floats where the scheduler floats it and moves by its trouble score (D147, D157, D194)', () => {
  const slide = slideOf(PM);
  const rest = interiorOf(slide);
  for (const body of rest) {
    expect([body.x, body.y, body.r]).toEqual([body.rest.x, body.rest.y, body.rest.r]);
    expect(body.outline).toEqual(outlineOf(body.id, body.rest, body.score));
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
  // Every body moves as the scheduler moves its own score: one at 0 keeps its still outline, one in trouble is pulsing and turned.
  for (const body of moving) expect(body.outline, body.id).toEqual(outlineOf(body.id, body, body.score, scheduler.shape(body.score)));
  for (const body of moving.filter((each) => each.score === 0)) expect(body.outline, body.id).toEqual(outlineOf(body.id, body, 0));
  const tools = bodyOf(moving, TOOLS);
  expect(tools.score).toBeGreaterThan(0);
  expect(tools.outline).not.toEqual(outlineOf(TOOLS, tools, tools.score, AT_REST));
  // A file with no broken rule and some history moves too, where its rule count alone held it still.
  const shaded = moving.filter((body) => body.rules === 0 && body.score > 0);
  for (const body of shaded) expect(body.outline, body.id).not.toEqual(outlineOf(body.id, body, body.score, AT_REST));
  // Under reduced motion nothing moves, and one seed and one time give one frame (C3).
  for (const body of interiorOf(slide, { drifted: floated, reduced: true, shape: scheduler.shape })) expect(body).toEqual(bodyOf(rest, body.id));
  expect(interiorOf(slide, { drifted: floated, shape: scheduler.shape })).toEqual(moving);
});

test("under the demo switch the slide's bodies take scores by their index in path order, across the whole spectrum, in place of their trouble (D202)", () => {
  const slide = slideOf(PM);
  const rest = interiorOf(slide);
  const demo = interiorOf(slide, { shapes: 'demo' });
  const paths = slide.files.map((file) => file.id).toSorted();
  expect(paths.length).toBeGreaterThan(1);
  for (const body of demo) {
    const score = paths.indexOf(body.id) / (paths.length - 1);
    expect(body.score, body.id).toBe(score);
    expect(body.outline, body.id).toEqual(outlineOf(body.id, body.rest, score));
    // Only the score and the outline it draws change: the body sits where it sat, with the rules and the stain it had.
    expect({ ...body, score: 0, outline: undefined, nucleus: undefined }, body.id).toEqual({ ...bodyOf(rest, body.id), score: 0, outline: undefined, nucleus: undefined });
  }
  expect(demo.map((body) => body.score).toSorted((a, b) => a - b)).toEqual(paths.map((_, index) => index / (paths.length - 1)));
  expect(Math.min(...demo.map((body) => body.score))).toBe(0);
  expect(Math.max(...demo.map((body) => body.score))).toBe(1);
  // The scheduler moves each body by its demo score, and the slide itself keeps every file's own trouble.
  const scheduler = createScheduler({ clock: () => 9000, seed: 7, tiers: [], reduced: false });
  scheduler.load();
  for (const body of interiorOf(slide, { shapes: 'demo', shape: scheduler.shape })) expect(body.outline, body.id).toEqual(outlineOf(body.id, body, body.score, scheduler.shape(body.score)));
  expect(slide.files.map((file) => file.score)).toEqual(rest.map((body) => body.score));
  // A lone file scores 0.
  const [only] = slide.files;
  if (only === undefined) throw new Error('the slide has no file');
  expect(interiorOf({ ...slide, files: [only] }, { shapes: 'demo' }).map((body) => body.score)).toEqual([0]);
  // One slide gives one demo (C3).
  expect(interiorOf(slide, { shapes: 'demo' })).toEqual(demo);
});

test('no body moves for the exploded view: each stays where the float has it, and the slide carries no exploded places (D198)', () => {
  const slide = slideOf(PM);
  const drifted = driftOf(DEMO, PM, 9000, { seed: 7, screen: 400 });
  for (const body of interiorOf(slide, { drifted })) {
    const at = drifted.find((file) => file.id === body.id);
    expect([body.x, body.y]).toEqual([at?.x, at?.y]);
  }
  expect(slide.files.some((file) => 'exploded' in file)).toBe(false);
  expect(Object.keys(INTERIOR_LAYOUT).toSorted()).toEqual(['exportsPerLine', 'exportsShown', 'gather']);
});

test('the tags stand in two columns just outside the slide, each on its body\'s side, stacked down the column clear of one another, on a leader that runs straight out to its elbow and then to the body\'s rim (D198)', () => {
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
    const leader = tag.leader;
    if (leader === undefined) throw new Error(`${tag.id} has a leader`);
    expect(tag.side).toBe(sx < middle ? 'left' : 'right');
    expect(tag.more).toBeUndefined();
    expect(tag.box.height).toBe(height);
    expect(tag.fontSize).toBe(LABELING.fontSize);
    expect(tag.box.width).toBeCloseTo(tag.text.length * LABELING.fontSize * MONO_ADVANCE + 2 * LABELING.pad, 9);
    // An elbow's length off the slide's edge, where the screen has the room.
    if (tag.side === 'left') expect(tag.box.x + tag.box.width).toBeCloseTo(x0 - LABELING.gap - TAG_ELBOW, 9);
    else expect(tag.box.x).toBeCloseTo(x1 + LABELING.gap + TAG_ELBOW, 9);
    // The leader leaves the tag's inner edge straight toward the slide for the elbow's length, then turns for the body's rim.
    expect(leader.from[0]).toBeCloseTo(tag.side === 'left' ? tag.box.x + tag.box.width : tag.box.x, 9);
    expect(leader.from[1]).toBeCloseTo(tag.box.y + height / 2, 9);
    expect(leader.elbow[1]).toBe(leader.from[1]);
    expect((leader.elbow[0] - leader.from[0]) * (tag.side === 'left' ? 1 : -1)).toBeCloseTo(TAG_ELBOW, 9);
    expect(Math.hypot(leader.to[0] - sx, leader.to[1] - sy)).toBeCloseTo(body.r * SCREEN.pixelsPerUnit, 6);
  }
  for (const side of ['left', 'right'] as const) {
    const column = tags.filter((tag) => tag.side === side);
    column.slice(1).forEach((tag, index) => {
      const above = column[index];
      expect(tag.box.y).toBeGreaterThanOrEqual((above?.box.y ?? 0) + height);
      expect(project(bodyOf(bodies, tag.id).x, bodyOf(bodies, tag.id).y)[1]).toBeGreaterThanOrEqual(project(bodyOf(bodies, above?.id ?? '').x, bodyOf(bodies, above?.id ?? '').y)[1]);
    });
  }
  // However the slide is framed, the columns stay on the screen: a slide wider than the screen pulls them in from its edges, and a leader never runs past its body.
  const [cx, cy] = [(Math.min(...slide.ring.map(([x]) => x)) + Math.max(...slide.ring.map(([x]) => x))) / 2, (Math.min(...slide.ring.map(([, y]) => y)) + Math.max(...slide.ring.map(([, y]) => y))) / 2];
  const close = tagsOf(slide, bodies, (x, y) => [(x - cx) * 20 + 400, (y - cy) * 20 + 300], { width: 800, height: 600, pixelsPerUnit: 20 });
  for (const tag of close) {
    expect(tag.box.x).toBeGreaterThanOrEqual(0);
    expect(tag.box.x + tag.box.width).toBeLessThanOrEqual(800);
    expect(tag.box.y + tag.box.height).toBeLessThanOrEqual(600);
    expect(tag.leader?.elbow[1]).toBe(tag.leader?.from[1]);
    expect(Math.abs((tag.leader?.elbow[0] ?? 0) - (tag.leader?.from[0] ?? 0))).toBeLessThanOrEqual(TAG_ELBOW);
  }
  // The elbow is a token, read as handed in (D156).
  const short = tagsOf(slide, bodies, project, SCREEN, LABELING, { TAG_ELBOW: 10, TAG_ROW_FLOOR });
  for (const tag of short) expect(Math.abs((tag.leader?.elbow[0] ?? 0) - (tag.leader?.from[0] ?? 0))).toBeCloseTo(10, 9);
  expect(tagsOf(slide, bodies, project, SCREEN)).toEqual(tags);
});

/** The demo with its pm folder as a square of 400 holding 80 files: seven columns of eight on its left and three on its right. */
function crowded(): MapJson {
  const own = DEMO.terrain.organelles.find((organelle) => organelle.id === SLOTS);
  if (own === undefined || DEMO.terrain.layout === undefined) throw new Error('the demo lost slots.ts');
  const { ties: _ties, package_ties: _package, functions: _functions, ...bare } = own;
  const columns = [20, 46, 72, 98, 124, 150, 176, 260, 310, 360];
  const files = columns.flatMap((x, column) => Array.from({ length: 8 }, (_, row) => ({ id: `libs/core/src/pm/f${String(column)}${String(row)}.ts`, x, y: 30 + row * 48 })));
  return {
    ...DEMO,
    terrain: {
      ...DEMO.terrain,
      organelles: [...DEMO.terrain.organelles.filter((organelle) => organelle.cell !== PM), ...files.map(({ id }) => ({ ...bare, id, path: id }))],
      layout: {
        ...DEMO.terrain.layout,
        positions: { ...DEMO.terrain.layout.positions, ...Object.fromEntries(files.map(({ id, x, y }) => [id, { x, y, r: 6 }])) },
        contours: {
          ...DEMO.terrain.layout.contours,
          [PM]: [
            [0, 0],
            [400, 0],
            [400, 400],
            [0, 400],
            [0, 0],
          ],
        },
      },
    },
  };
}

test('on a 16:9 screen a crowded cell\'s tags keep off one another, on the screen and inside the chrome\'s margins, in their bodies\' order, a full column ending on a footer that counts the rest, level, tilted and zoomed past the screen, and no body moves (D198, Q89, P25)', () => {
  const slide = slideOf(PM, crowded());
  const bodies = interiorOf(slide);
  expect(bodies).toHaveLength(80);
  // Every body is where the layout rests it, inside its membrane.
  for (const body of bodies) {
    expect([body.x, body.y]).toEqual([body.rest.x, body.rest.y]);
    expect(insideRing(slide.ring, body.x, body.y)).toBe(true);
  }
  // The chrome's claims: the HUD at the top, the legend and the minimap at the foot, the rail on the right.
  const margins = { top: 96, bottom: 220, left: 0, right: 320 };
  const tilt = Math.cos((35 * Math.PI) / 180);
  const views: readonly { readonly name: string; readonly project: (x: number, y: number) => Point; readonly pixelsPerUnit: number }[] = [
    { name: 'level', project: (x, y) => [x * 2 + 320, y * 2 + 50], pixelsPerUnit: 2 },
    { name: 'tilted to 35 degrees', project: (x, y) => [x * 2 + 320, y * 2 * tilt + 120], pixelsPerUnit: 2 },
    { name: 'zoomed past the screen', project: (x, y) => [(x - 200) * 6 + 560, (y - 200) * 6 + 400], pixelsPerUnit: 6 },
  ];
  for (const view of views) {
    const screen = { width: 1440, height: 900, pixelsPerUnit: view.pixelsPerUnit, margins };
    const tags = tagsOf(slide, bodies, view.project, screen);
    tags.forEach((a, index) => {
      // On the screen, inside the margins, at a row no smaller than the floor.
      expect(a.box.x, view.name).toBeGreaterThanOrEqual(margins.left);
      expect(a.box.x + a.box.width, view.name).toBeLessThanOrEqual(screen.width - margins.right);
      expect(a.box.y, view.name).toBeGreaterThanOrEqual(margins.top);
      expect(a.box.y + a.box.height, view.name).toBeLessThanOrEqual(screen.height - margins.bottom);
      expect(a.box.height).toBeGreaterThanOrEqual(TAG_ROW_FLOOR);
      expect(a.fontSize).toBeLessThanOrEqual(LABELING.fontSize);
      for (const b of tags.slice(index + 1)) {
        const apart = a.box.x + a.box.width <= b.box.x || b.box.x + b.box.width <= a.box.x || a.box.y + a.box.height <= b.box.y || b.box.y + b.box.height <= a.box.y;
        expect(apart, `${a.id} and ${b.id}, ${view.name}`).toBe(true);
      }
      // Every leader's first segment is horizontal.
      if (a.leader !== undefined) expect(a.leader.elbow[1]).toBe(a.leader.from[1]);
    });
    const middle = (Math.min(...slide.ring.map(([x, y]) => view.project(x, y)[0])) + Math.max(...slide.ring.map(([x, y]) => view.project(x, y)[0]))) / 2;
    const centre: Point = [(margins.left + screen.width - margins.right) / 2, (margins.top + screen.height - margins.bottom) / 2];
    for (const side of ['left', 'right'] as const) {
      const column = tags.filter((tag) => tag.side === side);
      const named = column.filter((tag) => tag.more === undefined);
      const footer = column.find((tag) => tag.more !== undefined);
      const onSide = bodies.filter((body) => (view.project(body.x, body.y)[0] < middle ? 'left' : 'right') === side);
      // The column's order is its bodies' order down the screen, the footer last.
      const ys = named.map((tag) => view.project(bodyOf(bodies, tag.id).x, bodyOf(bodies, tag.id).y)[1]);
      expect(ys, view.name).toEqual(ys.toSorted((a, b) => a - b));
      expect(named.map((tag) => tag.box.y)).toEqual(named.map((tag) => tag.box.y).toSorted((a, b) => a - b));
      if (footer !== undefined) expect(column.at(-1)).toBe(footer);
      // Every body on the side is named or counted.
      expect(named.length + (footer?.more ?? 0), `${side}, ${view.name}`).toBe(onSide.length);
      if (footer === undefined) continue;
      expect(footer.text).toBe(`and ${String(footer.more)} more`);
      expect(footer.leader).toBeUndefined();
      expect(footer.box.height).toBe(TAG_ROW_FLOOR);
      // The named are the bodies nearest the view's middle: none it dropped stands nearer than one it kept.
      const away = (id: string): number => Math.hypot(view.project(bodyOf(bodies, id).x, bodyOf(bodies, id).y)[0] - centre[0], view.project(bodyOf(bodies, id).x, bodyOf(bodies, id).y)[1] - centre[1]);
      const kept = new Set(named.map((tag) => tag.id));
      const dropped = onSide.filter((body) => !kept.has(body.id));
      expect(Math.max(...named.map((tag) => away(tag.id)))).toBeLessThanOrEqual(Math.min(...dropped.map((body) => away(body.id))));
    }
    // The left column holds 56 bodies, more than it has rows for; the right holds 24, at rows it need not shrink far.
    expect(tags.find((tag) => tag.side === 'left' && tag.more !== undefined)?.more, view.name).toBeGreaterThan(0);
    expect(tags.some((tag) => tag.side === 'right' && tag.more !== undefined)).toBe(false);
    expect(tagsOf(slide, bodies, view.project, screen)).toEqual(tags);
  }
  // With no margins claimed the same column has the rows for more of its tags.
  const [level] = views;
  if (level === undefined) throw new Error('a level view');
  const claimed = tagsOf(slide, bodies, level.project, { width: 1440, height: 900, pixelsPerUnit: 2, margins }).filter((tag) => tag.more === undefined).length;
  expect(tagsOf(slide, bodies, level.project, { width: 1440, height: 900, pixelsPerUnit: 2 }).filter((tag) => tag.more === undefined).length).toBeGreaterThan(claimed);
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

/** The demo with one file's functions set as given, or taken away. */
function withFunctions(id: string, functions: readonly FileFunction[] | undefined): MapJson {
  return {
    ...DEMO,
    terrain: {
      ...DEMO.terrain,
      organelles: DEMO.terrain.organelles.map((organelle) => {
        if (organelle.id !== id) return organelle;
        const { functions: _functions, ...rest } = organelle;
        return functions === undefined ? { ...rest, function_count: 12 } : { ...rest, functions };
      }),
    },
  };
}

/** This many functions down a file, their lengths cycling from 1 to 23 lines, every eleventh breaking a threshold. */
function functionsOf(count: number): readonly FileFunction[] {
  let line = 1;
  return Array.from({ length: count }, (_, index): FileFunction => {
    const fn: FileFunction = { name: `fn${String(index)}`, line, line_count: 1 + ((index * 7) % 23), ...(index % 11 === 0 ? { breaches: ['complexity'] } : {}) };
    line += fn.line_count + 1;
    return fn;
  });
}

function insideRing(ring: readonly (readonly [number, number])[], x: number, y: number): boolean {
  let within = false;
  ring.forEach(([ax, ay], index) => {
    const [bx, by] = ring[(index + 1) % ring.length] ?? [ax, ay];
    if (ay > y !== by > y && x < ax + ((y - ay) / (by - ay)) * (bx - ax)) within = !within;
  });
  return within;
}

test("a file's functions are a nucleus of granules inside its body, one each in line order, sized by their lines and dented by their breaches; a file the scan read none in has no nucleus, whatever its count (D197, C2)", () => {
  const functions = functionsOf(9);
  const slide = slideOf(PM, withFunctions(TOOLS, functions));
  const tools = bodyOf(interiorOf(slide), TOOLS);
  const nucleus = tools.nucleus;
  if (nucleus === undefined) throw new Error('tools.ts has a nucleus');
  expect(nucleus.more).toBe(0);
  expect(nucleus.granules.map((granule) => [granule.name, granule.line, granule.line_count, granule.rules])).toEqual(functions.map((fn) => [fn.name, fn.line, fn.line_count, fn.breaches ?? []]));
  // Each stands further from the body's middle than the one before it, turned the golden angle from it; a lone function sits at the middle.
  const away = nucleus.granules.map((granule) => Math.hypot(granule.x, granule.y));
  away.slice(1).forEach((distance, index) => expect(distance).toBeGreaterThan(away[index] ?? 0));
  const turned = (index: number): number => Math.atan2(nucleus.granules[index]?.y ?? 0, nucleus.granules[index]?.x ?? 0);
  expect(Math.cos(turned(1) - turned(0))).toBeCloseTo(Math.cos(Math.PI * (3 - Math.sqrt(5))), 9);
  const lone = bodyOf(interiorOf(slideOf(PM, withFunctions(TOOLS, functionsOf(1)))), TOOLS).nucleus?.granules ?? [];
  expect(lone.map((granule) => [granule.x, granule.y])).toEqual([[0, 0]]);
  // More lines, a larger granule, and as many lines the same.
  const bySize = nucleus.granules.toSorted((a, b) => a.line_count - b.line_count);
  bySize.slice(1).forEach((granule, index) => {
    const smaller = bySize[index];
    if (smaller === undefined) return;
    if (granule.line_count === smaller.line_count) expect(granule.r).toBeCloseTo(smaller.r, 12);
    else expect(granule.r).toBeGreaterThan(smaller.r);
  });
  // An unbroken granule is the plate's circle about its place, and a breached one is dented, by the same outline (D102, Q97).
  const [first, , second] = nucleus.granules;
  if (first === undefined || second === undefined) throw new Error('nine granules');
  expect(first.rules).toEqual(['complexity']);
  outlineOf(`${TOOLS}#fn0@1`, { x: first.x, y: first.y, r: first.r }, troubleFrom(1)).ring.forEach(([x, y], index) => {
    expect(first.ring[index]?.[0]).toBeCloseTo(x, 9);
    expect(first.ring[index]?.[1]).toBeCloseTo(y, 9);
  });
  for (const [x, y] of second.ring) expect(Math.hypot(x - second.x, y - second.y)).toBeCloseTo(second.r, 9);
  // The same file gives the same nucleus, on this slide and on one laid afresh (C3).
  expect(bodyOf(interiorOf(slide), TOOLS).nucleus).toBe(nucleus);
  expect(bodyOf(interiorOf(slideOf(PM, withFunctions(TOOLS, functionsOf(9)))), TOOLS).nucleus).toEqual(nucleus);
  // A count alone makes no nucleus, and neither does a deleted file.
  const counted = interiorOf(slideOf(PM, withFunctions(TOOLS, undefined)));
  expect(bodyOf(counted, TOOLS).nucleus).toBeUndefined();
  expect(slideOf(PM, withFunctions(TOOLS, undefined)).files.find((file) => file.id === TOOLS)?.functions).toBeUndefined();
  expect(bodyOf(counted, LEGACY).nucleus).toBeUndefined();
});

/** The summed area of a body's granules. */
function areaOf(body: Body): number {
  return (body.nucleus?.granules ?? []).reduce((total, granule) => total + Math.PI * granule.r ** 2, 0);
}

test('the largest file on the slide fills its share of its core and the rest by their lines, shrinking before a nucleus spills (D197, Q92)', () => {
  const map = withFunctions(TOOLS, functionsOf(40));
  const slide = slideOf(PM, map);
  const bodies = interiorOf(slide);
  expect(slide.mostLines).toBe(Math.max(...slide.files.map((file) => file.lines)));
  for (const body of bodies) {
    if (body.nucleus === undefined) continue;
    const full = NUCLEUS_FILL * (body.lines / slide.mostLines) * Math.PI * body.outline.core ** 2;
    // Its granules' summed area is its share of the core, or less where the whole nucleus shrank to keep inside it.
    expect(areaOf(body)).toBeLessThanOrEqual(full + 1e-9);
    expect(areaOf(body)).toBeGreaterThan(full / 2);
    for (const granule of body.nucleus.granules) for (const [x, y] of granule.ring) expect(Math.hypot(x, y)).toBeLessThanOrEqual(body.outline.core * (1 - NUCLEUS_PAD) + 1e-9);
  }
  // Equal granules keep clear of one another on the spiral.
  const even = Array.from({ length: 60 }, (_, index): FileFunction => ({ name: `fn${String(index)}`, line: index * 6 + 1, line_count: 5 }));
  const evenly = bodyOf(interiorOf(slideOf(PM, withFunctions(TOOLS, even))), TOOLS).nucleus?.granules ?? [];
  expect(evenly).toHaveLength(60);
  evenly.forEach((a, index) => {
    for (const b of evenly.slice(index + 1)) expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeGreaterThanOrEqual(a.r + b.r);
  });
  // The tokens are read as handed in (D156): half the fill, half the area.
  const tools = bodyOf(bodies, TOOLS);
  const halved = nucleusOf(tools, tools.outline, slide.mostLines, { NUCLEUS_FILL: NUCLEUS_FILL / 2, NUCLEUS_PAD, NUCLEUS_MOST });
  expect((halved?.granules ?? []).reduce((total, granule) => total + Math.PI * granule.r ** 2, 0)).toBeLessThan(areaOf(tools) * 0.75);
});

test('past the most a nucleus draws, the largest functions are drawn and the rest counted on the tag, and every granule keeps inside the core while the shape pulses, turns and jitters at the spiky end (D197)', () => {
  const functions = functionsOf(400);
  const slide = slideOf(PM, withFunctions(TOOLS, functions));
  // Under the demo switch the last file in path order stands at the spiky end, where the shape moves most.
  const at = (t: number): Body => bodyOf(interiorOf(slide, { shapes: 'demo', shape: () => ({ t, pulseHz: SHAPE_PULSE_HZ.at(-1) ?? 0, pulse: SHAPE_PULSE.at(-1) ?? 0, turn: SHAPE_TURN.at(-1) ?? 0, jitter: SHAPE_JITTER }) }), TOOLS);
  const rest = at(0);
  expect(rest.score).toBe(1);
  const nucleus = rest.nucleus;
  if (nucleus === undefined) throw new Error('tools.ts has a nucleus');
  expect(nucleus.granules).toHaveLength(NUCLEUS_MOST);
  expect(nucleus.more).toBe(200);
  // The drawn are the largest, still in line order.
  const smallestDrawn = Math.min(...nucleus.granules.map((granule) => granule.line_count));
  const drawn = new Set(nucleus.granules.map((granule) => granule.name));
  for (const fn of functions) if (!drawn.has(fn.name)) expect(fn.line_count).toBeLessThanOrEqual(smallestDrawn);
  expect(nucleus.granules.map((granule) => granule.line)).toEqual(nucleus.granules.map((granule) => granule.line).toSorted((a, b) => a - b));
  for (const t of [0, 1, 2, 7]) {
    const body = at(t);
    // The nucleus neither pulses nor turns: it is the one laid, riding the body.
    expect(body.nucleus).toBe(nucleus);
    for (const granule of nucleus.granules) {
      for (const [x, y] of granule.ring) {
        expect(Math.hypot(x, y)).toBeLessThanOrEqual(body.outline.core * (1 - NUCLEUS_PAD) + 1e-9);
        expect(insideRing(body.outline.ring, body.x + x, body.y + y), `${granule.name} at ${String(t)} s`).toBe(true);
      }
    }
  }
  const tag = tagsOf(slide, [rest], project, SCREEN).find((each) => each.id === TOOLS);
  expect(tag?.text.endsWith(' · +200 fn')).toBe(true);
});
