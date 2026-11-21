/**
 * The selection in the browser (D207 (click-selects), D205 (open-on-select)):
 * the world's second smoke test, on the demo map headless on WebGL 2
 * (`browser.ts` serves and launches). A click on a file selects the file: the
 * canvas names it, it is ringed steadily in the selection's ink, its words
 * stay written with the pointer gone, and no slide opens. A click on a
 * module's ground selects the module and opens it in place as the living
 * slide; a click on another module moves the slide there; Escape clears the
 * selection and closes it; a click on a file floating in the slide selects
 * the file and keeps its module's slide open, its tag written. The slide
 * then holds while the wheel runs far out and deep in, and a click on open
 * space clears the selection and closes it, its files coming home with the
 * view still deep in, where the old levels held them floated (D221
 * (home-by-time)). With `LEVELS.openOnSelect` at `0` a click only rings and
 * names. And a tab that names no zoom and no centre opens framed on the
 * ground the world draws, in the middle of the free screen, not on the layout
 * with the shore's strip the world never draws (D222 (terrain-frame)).
 *
 * The pointer on a file or a module's ground tells the line what it points
 * at, which the canvas names with the side that points, and lets go on
 * leaving (D209 (selection-line)). A file large enough on the screen is named
 * unasked and a smaller one beside it is not, until `LEVELS.fileNameFrom`
 * says otherwise (D206 (detail-by-size)); `LEVELS.fileNameBudget` caps how
 * many are (D245 (name-budget-token)), and none is written under a block of
 * the chrome (D246 (names-off-chrome)). A single-file module, selected, is
 * ringed where its file floats on the slide of the package it floats in, and
 * that file's tag stays written (D247 (single-as-its-file)). Enter walks in and selects where it
 * lands, an arrow carries the selection to the sibling it walks to, and
 * Escape clears the selection before it ascends (D231 (keys-walk-selection),
 * D225 (escape-clears)); under the old levels it first closes the slide the
 * zoom opened. And a view moved by hand stands at the file under its centre
 * once that file is large enough to be named (D230 (file-stop-by-size)).
 */

import { readFileSync } from 'node:fs';

import type { Page } from 'playwright-core';
import { expect, test } from 'vitest';

import { assertMap, withinContour } from 'core';
import { LABELING, instances } from 'scene';

import { namedBySize } from '../asked.js';
import { RAIL_WIDTH, fitFrame } from '../fit.js';
import { HOVER, LEVELS, WALK } from '../materials.js';
import { bandRules } from '../space.js';
import { FIELD, createWalk } from '../walk.js';
import type { Stop } from '../walk.js';
import { DEMO, launch, legacy, serve, withTokens } from './browser.js';

type Point = readonly [number, number];

const VIEWPORT = { width: 960, height: 720 };
const MAP = assertMap(JSON.parse(readFileSync(DEMO, 'utf8')));
const { layout: LAID } = MAP.terrain;
if (LAID === undefined) throw new Error('the demo lays nothing out');
const LAYOUT = LAID;

const PM = 'folder:libs/core/src/pm';
const CLI = 'package:apps/cli';
const DOCTOR = 'apps/cli/src/doctor.ts';
const UTIL = 'directory:libs/core/src/util';
const TOOLS = 'libs/core/src/pm/tools.ts';
const SLOTS = 'libs/core/src/pm/slots.ts';
const TEXT = 'libs/core/src/util/text.ts';

/** The frame the selection is judged in: both modules on the free screen, with open ground beside them. */
const ZOOM = 2;
const CENTRE: Point = [190, 540];

/** The free screen's middle, where the page's `?centre=` stands, and how many pixels a layout unit takes at the frame's zoom. */
const MIDDLE: Point = [(VIEWPORT.width - RAIL_WIDTH) / 2, VIEWPORT.height / 2];
const PER_UNIT = (ZOOM * VIEWPORT.height) / (2 * fitFrame(LAYOUT, VIEWPORT.width, VIEWPORT.height, { right: RAIL_WIDTH }).halfH);

/** Where a layout point lies on the screen at the frame. */
const screenOf = ([x, y]: Point): Point => [MIDDLE[0] + (x - CENTRE[0]) * PER_UNIT, MIDDLE[1] + (y - CENTRE[1]) * PER_UNIT];

/** The part of the free screen the chrome leaves clear at this viewport: under the HUD, over the minimap, left of the column. */
const clear = ([x, y]: Point): boolean => x > 120 && x < VIEWPORT.width - RAIL_WIDTH - 40 && y > 160 && y < 500;

/** Every cell's skin, and every placed file, on the demo's layout. */
const SKINS = MAP.terrain.cells.flatMap((cell) => {
  const contour = LAYOUT.contours?.[cell.id];
  return contour === undefined ? [] : [{ cell: cell.id, contour }];
});
const FILES = MAP.terrain.organelles.flatMap((organelle) => {
  const at = LAYOUT.positions[organelle.id];
  return at === undefined ? [] : [at];
});

/** The layout's points on a grid two units apart, row by row. */
const COLUMNS = Math.ceil(LAYOUT.width / 2);
const GRID: readonly Point[] = Array.from({ length: COLUMNS * Math.ceil(LAYOUT.height / 2) }, (_, index): Point => [(index % COLUMNS) * 2, Math.floor(index / COLUMNS) * 2]);

/** Of some points, the one that keeps farthest from what it must keep off. */
const farthest = (points: readonly Point[], off: (point: Point) => number): Point => {
  const [best] = points.map((point) => ({ point, room: off(point) })).toSorted((a, b) => b.room - a.room);
  if (best === undefined) throw new Error('the demo has no such ground on the screen at this frame');
  return best.point;
};

/** How far a point keeps from every skin's edge, by the nearest point any contour is drawn through. */
const offEdges = ([x, y]: Point): number => Math.min(...SKINS.flatMap((each) => each.contour.map(([sx, sy]) => Math.hypot(sx - x, sy - y))));

/** A point of a module's own ground, on the clear screen at the frame unless told where else it shows, as far from every file and every skin's edge as its skin lets it be: a click there is on the module, on no file, and on no other module. */
const groundOf = (cell: string, shown: (point: Point) => boolean = (point) => clear(screenOf(point))): Point => {
  const skin = SKINS.find((each) => each.cell === cell)?.contour ?? [];
  const inner = SKINS.filter((each) => each.cell !== cell && each.contour.every(([x, y]) => withinContour(skin, x, y)));
  return farthest(
    GRID.filter((point) => shown(point) && withinContour(skin, point[0], point[1]) && inner.every((each) => !withinContour(each.contour, point[0], point[1]))),
    (point) => Math.min(offEdges(point), ...FILES.map((file) => Math.hypot(file.x - point[0], file.y - point[1]) - file.r)),
  );
};

/** A point of open space, under no skin, on the clear screen, as far from every skin as the frame lets it be. */
const OPEN = farthest(
  GRID.filter((point) => clear(screenOf(point)) && SKINS.every((each) => !withinContour(each.contour, point[0], point[1]))),
  offEdges,
);

/** A page on the demo at the frame, with its console's complaints collected. */
const framed = async (page: Page, url: string): Promise<readonly string[]> => {
  const complaints: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') complaints.push(`${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', (error) => complaints.push(`pageerror: ${error.message}`));
  await page.goto(`${url}/?backend=webgl&zoom=${String(ZOOM)}&centre=${CENTRE.join(',')}`);
  await page.waitForSelector('#world[data-world="settled"]', { timeout: 90_000 });
  return complaints;
};

/** Where a layout point lies on the screen, once the canvas is found to take the pointer there. */
const onCanvas = async (page: Page, point: Point, what: string): Promise<Point> => {
  const [x, y] = screenOf(point);
  expect(await page.evaluate(([px, py]) => document.elementFromPoint(px ?? 0, py ?? 0)?.id, [x, y]), `${what} lies where the canvas takes the pointer`).toBe('world');
  return [x, y];
};

/** The selection's ring as the page draws it: whether it shows, its ink, its width, and how wide it lies on the screen. */
const ringOf = async (page: Page): Promise<{ readonly shown: boolean; readonly ink: string | null; readonly width: string | null; readonly across: number }> =>
  page.$eval('[data-hover] [data-ring="selected"]', (ring) => ({
    shown: ring instanceof SVGElement && ring.style.display !== 'none' && ring.parentElement instanceof SVGElement && ring.parentElement.style.display !== 'none',
    ink: ring.getAttribute('stroke'),
    width: ring.getAttribute('stroke-width'),
    across: ring.getBoundingClientRect().width,
  }));

/** Turn the wheel a step at a time, the pointer where it is, until the selection's ring has passed a width or the turns run out. */
const wheelUntil = async (page: Page, delta: number, passed: (across: number) => boolean, turns: number): Promise<void> => {
  if (turns === 0 || passed((await ringOf(page)).across)) return;
  await page.mouse.wheel(0, delta);
  await page.waitForTimeout(80);
  await wheelUntil(page, delta, passed, turns - 1);
};

/** A point just inside the rim of a file floating in the open slide, where its leader ends and the canvas takes the pointer. */
const floatingBody = async (page: Page): Promise<Point> => {
  const onBody = await page.$$eval('[data-interior-leader]', (lines) =>
    lines
      .map((line) => {
        const [, , x1, y1, x2, y2] = (line.getAttribute('points') ?? '').split(/[ ,]/).map(Number);
        const length = Math.hypot((x2 ?? 0) - (x1 ?? 0), (y2 ?? 0) - (y1 ?? 0)) || 1;
        return [(x2 ?? 0) + (((x2 ?? 0) - (x1 ?? 0)) / length) * 4, (y2 ?? 0) + (((y2 ?? 0) - (y1 ?? 0)) / length) * 4] as const;
      })
      .find(([px, py]) => document.elementFromPoint(px, py)?.id === 'world'),
  );
  if (onBody === undefined) throw new Error('no floating file of the open slide lies where the canvas takes the pointer');
  return onBody;
};

/** The breadcrumb as the page reads it: the kind of stop it stands at, whether that is the selection or the walk's stop, and its line. */
const crumbsOf = async (page: Page): Promise<{ readonly kind: string | null; readonly of: string | null; readonly line: string }> =>
  page.$eval('[data-crumbs]', (line) => ({ kind: line.getAttribute('data-crumbs'), of: line.getAttribute('data-crumbs-of'), line: [...line.querySelectorAll('[data-crumb]')].map((crumb) => crumb.textContent).join(' › ') }));

test('a click selects a file or a module and rings and names it, a selected module opens in place as a slide that moves with the selection and holds at any zoom, and Escape or a click on open space clears it and closes the slide, with a clean console (D207 (click-selects), D205 (open-on-select))', { timeout: 180_000 }, async () => {
  const { server, url } = await serve();
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: VIEWPORT });
    const complaints = await framed(page, url);
    const open = await onCanvas(page, OPEN, 'open space');
    const selected = async (): Promise<string | null> => page.getAttribute('#world', 'data-selected');
    const opened = async (): Promise<string | null> => page.getAttribute('#world', 'data-open');

    // Nothing is selected at load: the canvas names nothing, no ring is drawn and no slide is open.
    expect(await selected()).toBeNull();
    expect(await opened()).toBeNull();
    expect((await ringOf(page)).shown).toBe(false);

    // A click on a file selects the file. It is ringed in the selection's ink at its width, and it opens no slide.
    const file = await onCanvas(page, [LAYOUT.positions[TOOLS]?.x ?? 0, LAYOUT.positions[TOOLS]?.y ?? 0], 'the file');
    await page.mouse.click(file[0], file[1]);
    await page.waitForSelector(`#world[data-selected="${TOOLS}"]`, { timeout: 30_000 });
    await page.waitForSelector(`[data-labels] [data-target="${TOOLS}"]`, { state: 'attached', timeout: 30_000 });
    // The pointer gone to open space, where it hovers nothing, the ring stays and the file's words stay written.
    await page.mouse.move(open[0], open[1]);
    await page.waitForFunction(() => document.querySelector<HTMLElement>('[data-hover-tag]')?.style.display === 'none', undefined, { timeout: 30_000 });
    await page.waitForTimeout(600);
    expect(await ringOf(page)).toMatchObject({ shown: true, ink: HOVER.selectInk, width: String(HOVER.selectWidth) });
    // Of the words asked for, its are the only ones; a name the world writes for a file's size is no ask (D206 (detail-by-size)).
    expect(await page.$$eval('[data-labels] [data-target]:not([data-named])', (labels) => [...new Set(labels.map((label) => label.getAttribute('data-target')))])).toEqual([TOOLS]);
    expect(await opened()).toBeNull();

    // A click on a module's ground selects the module, and it opens in place as the slide, tagging its files.
    const util = await onCanvas(page, groundOf(UTIL), "the util module's ground");
    await page.mouse.click(util[0], util[1]);
    await page.waitForSelector(`#world[data-selected="${UTIL}"][data-open="${UTIL}"]`, { timeout: 30_000 });
    await page.waitForSelector('[data-interior-tag]', { state: 'attached', timeout: 30_000 });
    expect(new Set(await page.$$eval('[data-interior-tag]', (tags) => tags.map((tag) => tag.getAttribute('data-interior-tag'))))).toEqual(new Set(['libs/core/src/util/format.ts', 'libs/core/src/util/text.ts']));
    expect((await ringOf(page)).shown).toBe(true);

    // Selecting another module moves the slide there.
    const pm = await onCanvas(page, groundOf(PM), "the pm module's ground");
    await page.mouse.click(pm[0], pm[1]);
    await page.waitForSelector(`#world[data-selected="${PM}"][data-open="${PM}"]`, { timeout: 30_000 });
    await page.waitForFunction(() => document.querySelectorAll('[data-interior-tag]').length === 4, undefined, { timeout: 30_000 });

    // Escape clears the selection, and the slide closes with it; the module's ground opens it again.
    await page.keyboard.press('Escape');
    await page.waitForSelector('#world:not([data-selected]):not([data-open])', { timeout: 30_000 });
    expect((await ringOf(page)).shown).toBe(false);
    await page.mouse.click(pm[0], pm[1]);
    await page.waitForSelector(`#world[data-selected="${PM}"][data-open="${PM}"]`, { timeout: 30_000 });
    await page.waitForFunction(() => document.querySelectorAll('[data-interior-leader]').length === 4, undefined, { timeout: 30_000 });

    // A click on a file floating in the slide, just inside its rim where its leader ends, selects the file and keeps its module's slide open.
    const onBody = await floatingBody(page);
    await page.mouse.click(onBody[0], onBody[1]);
    await page.waitForSelector('#world[data-selected^="libs/core/src/pm/"]', { timeout: 30_000 });
    expect(await opened()).toBe(PM);
    // Its tag stays written on the slide with the pointer gone, and no other's.
    await page.mouse.move(open[0], open[1]);
    await page.waitForFunction(() => document.querySelector<HTMLElement>('[data-hover-tag]')?.style.display === 'none', undefined, { timeout: 30_000 });
    await page.waitForTimeout(400);
    const kept = (await selected()) ?? '';
    expect(await page.$$eval('[data-interior-tag]', (tags) => tags.filter((tag) => tag instanceof HTMLElement && tag.style.display !== 'none').map((tag) => tag.getAttribute('data-interior-tag')))).toEqual([kept]);

    // The wheel runs far out and then deep in, about the pointer on open space: the slide holds at every zoom, whatever share of the screen its module fills, and the selection with it.
    const { across } = await ringOf(page);
    expect(across).toBeGreaterThan(0);
    await wheelUntil(page, 240, (now) => now < across / 3, 60);
    await page.waitForTimeout(600);
    expect((await ringOf(page)).across).toBeLessThan(across / 3);
    expect([await opened(), await selected()]).toEqual([PM, kept]);
    await wheelUntil(page, -240, (now) => now > across * 6, 120);
    await page.waitForTimeout(600);
    expect((await ringOf(page)).across).toBeGreaterThan(across * 6);
    expect(await page.getAttribute('#world', 'data-lod')).toBe('2');
    expect([await opened(), await selected()]).toEqual([PM, kept]);

    // The pointer never left open space, which the wheel zooms about. A click there clears the selection and closes the slide, and its files come home though the view is still deep in.
    await page.mouse.click(open[0], open[1]);
    await page.waitForSelector('#world:not([data-selected]):not([data-open])', { timeout: 30_000 });
    expect((await ringOf(page)).shown).toBe(false);
    await page.waitForSelector('#world[data-floated="0"]', { timeout: 30_000 });
    await page.waitForFunction(() => document.querySelectorAll('[data-interior-tag]').length === 0, undefined, { timeout: 30_000 });
    expect(complaints).toEqual([]);
  } finally {
    await browser.close();
    await server.close();
  }
});

test('with LEVELS.openOnSelect at 0 a click on a module only rings and names it, and nothing opens, with a clean console (D205 (open-on-select))', { timeout: 120_000 }, async () => {
  const { server, url } = await serve();
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: VIEWPORT });
    await withTokens(page, { 'LEVELS.openOnSelect': 0 });
    const complaints = await framed(page, url);
    const pm = await onCanvas(page, groundOf(PM), "the pm module's ground");
    await page.mouse.click(pm[0], pm[1]);
    await page.waitForSelector(`#world[data-selected="${PM}"]`, { timeout: 30_000 });
    await page.waitForTimeout(800);
    expect(await ringOf(page)).toMatchObject({ shown: true, ink: HOVER.selectInk, width: String(HOVER.selectWidth) });
    expect(await page.getAttribute('#world', 'data-open')).toBeNull();
    expect(await page.$$eval('[data-interior-tag]', (tags) => tags.length)).toBe(0);
    // A file selected there is ringed and named the same way, and still nothing opens.
    const file = await onCanvas(page, [LAYOUT.positions[TOOLS]?.x ?? 0, LAYOUT.positions[TOOLS]?.y ?? 0], 'the file');
    await page.mouse.click(file[0], file[1]);
    await page.waitForSelector(`#world[data-selected="${TOOLS}"]`, { timeout: 30_000 });
    await page.waitForTimeout(400);
    expect(await page.getAttribute('#world', 'data-open')).toBeNull();
    expect(complaints).toEqual([]);
  } finally {
    await browser.close();
    await server.close();
  }
});

/** The files whose names the world wrote for their size, in path order. */
const namedOn = async (page: Page): Promise<readonly string[]> => (await page.$$eval('[data-labels] [data-target][data-named="size"]', (labels) => labels.map((label) => label.getAttribute('data-target') ?? ''))).toSorted();

/** The path the hover's tag writes with the pointer on a point of the screen, once the tag shows. */
const hoveredAt = async (page: Page, [x, y]: Point): Promise<string | null> => {
  expect(await page.evaluate(([px, py]) => document.elementFromPoint(px ?? 0, py ?? 0)?.id, [x, y]), 'the canvas takes the pointer there').toBe('world');
  // Off whatever it was on first, so the tag read is this point's.
  await page.mouse.move(x, y);
  await page.waitForFunction(() => document.querySelector<HTMLElement>('[data-hover-tag]')?.style.display !== 'none', undefined, { timeout: 30_000 });
  return page.textContent('[data-hover-tag]');
};

test('a tab that names no zoom and no centre opens framed on the ground the world draws, in the middle of the free screen, and one that names a zoom is framed on the layout as ever, with a clean console (D222 (terrain-frame))', { timeout: 120_000 }, async () => {
  const { server, url } = await serve();
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: VIEWPORT });
    const complaints: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') complaints.push(`${message.type()}: ${message.text()}`);
    });
    page.on('pageerror', (error) => complaints.push(`pageerror: ${error.message}`));
    const ground = createWalk(MAP).ground();
    if (ground === undefined) throw new Error('the demo lays no ground out');
    const rules = bandRules(MAP);
    /** Where each band's rule lies on the screen, by the band it opens. */
    const rulesAt = async (): Promise<ReadonlyMap<number, number>> =>
      new Map(await page.$$eval('[data-rules] [data-rule]', (lines) => lines.map((line) => [Number(line.getAttribute('data-rule')), Number(line.getAttribute('y1'))] as const)));
    /** The files at the ground's left, its foot and its right: each is under the pointer where a frame puts it only if the frame is the one meant, across and down. */
    const probes = ['apps/cli/src/doctor.ts', 'libs/core/src/util/format.ts', TOOLS].map((path) => ({ path, at: LAYOUT.positions[path] ?? { x: 0, y: 0, r: 0 } }));
    /** A frame is the one meant when every rule and every probe lies where it puts them: `centre` in the middle of the free screen, at `perUnit` pixels a layout unit. A level rule is drawn on a pixel's middle, so it lies within a pixel of its place. */
    const framedAt = async (centre: Point, perUnit: number): Promise<void> => {
      const place = ([x, y]: Point): Point => [MIDDLE[0] + (x - centre[0]) * perUnit, MIDDLE[1] + (y - centre[1]) * perUnit];
      const drawn = await rulesAt();
      expect(drawn.size).toBe(rules.length);
      for (const rule of rules) expect(Math.abs((drawn.get(rule.band) ?? Number.NaN) - place([0, rule.y])[1]), `band ${String(rule.band)}'s rule`).toBeLessThanOrEqual(1);
      const hovered = await probes.reduce<Promise<readonly (string | null)[]>>(async (before, probe) => [...(await before), await hoveredAt(page, place([probe.at.x, probe.at.y]))], Promise.resolve([]));
      expect(hovered.map((text) => (text ?? '').replace(/^\+/, ''))).toEqual(probes.map((probe) => probe.path));
    };

    // The opening frame: the ground fills the walk's share of the free screen in the side it fills first, and its middle stands in the middle of the free screen. The shore's strip above it, which the world never draws, takes no room.
    await page.goto(`${url}/?backend=webgl`);
    await page.waitForSelector('#world[data-world="settled"]', { timeout: 90_000 });
    expect(await page.getAttribute('[data-crumbs]', 'data-crumbs')).toBe('field');
    const share = Math.min(((VIEWPORT.width - RAIL_WIDTH) * WALK.share) / (ground.x1 - ground.x0), (VIEWPORT.height * WALK.share) / (ground.y1 - ground.y0));
    await framedAt([(ground.x0 + ground.x1) / 2, (ground.y0 + ground.y1) / 2], share);
    // And that is not the layout's own frame: the layout is taller than the ground by the shore's strip.
    expect((ground.y0 + ground.y1) / 2).toBeGreaterThan(LAYOUT.height / 2);

    // A page that names a zoom is framed on the whole layout at that zoom over the fit, about the layout's middle, as it always was.
    await page.goto(`${url}/?backend=webgl&zoom=1`);
    await page.waitForSelector('#world[data-world="settled"]', { timeout: 90_000 });
    await framedAt([LAYOUT.width / 2, LAYOUT.height / 2], VIEWPORT.height / (2 * fitFrame(LAYOUT, VIEWPORT.width, VIEWPORT.height, { right: RAIL_WIDTH }).halfH));
    expect(complaints).toEqual([]);
  } finally {
    await browser.close();
    await server.close();
  }
});

test('the pointer on a file or a module tells the line what it points at and lets go on leaving, and a file large enough on the screen is named unasked where a smaller one is not, until its token says otherwise, with a clean console (D209 (selection-line), D206 (detail-by-size))', { timeout: 180_000 }, async () => {
  const { server, url } = await serve();
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: VIEWPORT });
    const complaints = await framed(page, url);
    const open = await onCanvas(page, OPEN, 'open space');
    const pointed = async (): Promise<readonly (string | null)[]> => [await page.getAttribute('#world', 'data-pointed'), await page.getAttribute('#world', 'data-pointed-by')];
    /** The files whose names the world wrote for their size, and those it wrote because it was asked. */
    const bySize = async (): Promise<readonly string[]> => namedOn(page);
    const asked = async (): Promise<readonly (string | null)[]> => page.$$eval('[data-labels] [data-target]:not([data-named])', (labels) => [...new Set(labels.map((label) => label.getAttribute('data-target')))]);

    // What the frame shows of the layout, as the labels are placed over it, and the files in it large enough to be named and too small to be.
    const viewport = { x: CENTRE[0] - MIDDLE[0] / PER_UNIT, y: CENTRE[1] - MIDDLE[1] / PER_UNIT, width: VIEWPORT.width / PER_UNIT, height: VIEWPORT.height / PER_UNIT, pixelsPerUnit: PER_UNIT };
    const files = instances(MAP);
    const large = [...namedBySize(files, viewport, LEVELS.fileNameFrom)].toSorted();
    const inView = [...namedBySize(files, viewport, 0)];
    expect(large).toContain(SLOTS);
    expect(inView).toContain(TEXT);
    expect(large).not.toContain(TEXT);

    // At load, the pointer on open space, nothing is pointed at and nothing is asked for; the large files are named, each once, and no smaller one.
    await page.mouse.move(open[0], open[1]);
    await expect.poll(bySize, { timeout: 30_000 }).toEqual(large);
    expect(await asked()).toEqual([]);
    expect(await pointed()).toEqual([null, null]);

    // The pointer on a file too small to be named: the line hears it from the world, the canvas names it, and its name is written because it is asked for.
    const text = await onCanvas(page, [LAYOUT.positions[TEXT]?.x ?? 0, LAYOUT.positions[TEXT]?.y ?? 0], 'the small file');
    await page.mouse.move(text[0], text[1]);
    await page.waitForSelector(`#world[data-pointed="${TEXT}"][data-pointed-by="world"]`, { timeout: 30_000 });
    await page.waitForSelector(`[data-labels] [data-target="${TEXT}"]:not([data-named])`, { state: 'attached', timeout: 30_000 });
    expect(await asked()).toEqual([TEXT]);
    expect(await bySize()).toEqual(large);
    // Off it, onto open space, the world lets go, and the name goes with the ask.
    await page.mouse.move(open[0], open[1]);
    await page.waitForSelector('#world:not([data-pointed]):not([data-pointed-by])', { timeout: 30_000 });
    await page.waitForSelector(`[data-labels] [data-target="${TEXT}"]`, { state: 'detached', timeout: 30_000 });

    // A module is pointed at by its ground.
    const util = await onCanvas(page, groundOf(UTIL), "the util module's ground");
    await page.mouse.move(util[0], util[1]);
    await page.waitForSelector(`#world[data-pointed="${UTIL}"][data-pointed-by="world"]`, { timeout: 30_000 });

    // On a file already named for its size, the name is asked for now, and is written once; off it, it is written for its size again.
    const slots = await onCanvas(page, [LAYOUT.positions[SLOTS]?.x ?? 0, LAYOUT.positions[SLOTS]?.y ?? 0], 'the large file');
    await page.mouse.move(slots[0], slots[1]);
    await page.waitForSelector(`#world[data-pointed="${SLOTS}"][data-pointed-by="world"]`, { timeout: 30_000 });
    await page.waitForSelector(`[data-labels] [data-target="${SLOTS}"]:not([data-named])`, { state: 'attached', timeout: 30_000 });
    expect(await page.$$eval(`[data-labels] [data-target="${SLOTS}"]`, (labels) => labels.length)).toBe(1);
    expect(await bySize()).toEqual(large.filter((path) => path !== SLOTS));
    await page.mouse.move(open[0], open[1]);
    await page.waitForSelector('#world:not([data-pointed])', { timeout: 30_000 });
    await expect.poll(bySize, { timeout: 30_000 }).toEqual(large);
    expect(await asked()).toEqual([]);
    expect(complaints).toEqual([]);

    // With the threshold out of any file's reach, a name is written only when asked for.
    const quiet = await browser.newPage({ viewport: VIEWPORT });
    await withTokens(quiet, { 'LEVELS.fileNameFrom': 1_000_000 });
    const quietComplaints = await framed(quiet, url);
    await quiet.mouse.move(open[0], open[1]);
    await quiet.waitForTimeout(600);
    expect(await quiet.$$eval('[data-labels] [data-target]', (labels) => labels.length)).toBe(0);
    await quiet.mouse.move(slots[0], slots[1]);
    await quiet.waitForSelector(`[data-labels] [data-target="${SLOTS}"]:not([data-named])`, { state: 'attached', timeout: 30_000 });
    expect(quietComplaints).toEqual([]);
  } finally {
    await browser.close();
    await server.close();
  }
});

/** A closer frame, for what is judged by its place on the screen: how many pixels a layout unit takes there, and where a layout point lies with `centre` in the middle of the free screen. */
const NEAR = 3;
const NEAR_UNIT = (PER_UNIT * NEAR) / ZOOM;
const nearOf = (centre: Point, [x, y]: Point): Point => [MIDDLE[0] + (x - centre[0]) * NEAR_UNIT, MIDDLE[1] + (y - centre[1]) * NEAR_UNIT];

/** A page on the demo at the closer frame about a layout point, with its console's complaints collected. */
const near = async (page: Page, url: string, centre: Point): Promise<readonly string[]> => {
  const complaints: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') complaints.push(`${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', (error) => complaints.push(`pageerror: ${error.message}`));
  await page.goto(`${url}/?backend=webgl&zoom=${String(NEAR)}&centre=${centre.join(',')}`);
  await page.waitForSelector('#world[data-world="settled"]', { timeout: 90_000 });
  return complaints;
};

test('the names written unasked are capped by their budget, and none is written under a block of the chrome, with a clean console (D245 (name-budget-token), D246 (names-off-chrome))', { timeout: 150_000 }, async () => {
  const { server, url } = await serve();
  const browser = await launch();
  try {
    const files = instances(MAP);
    const viewport = { x: CENTRE[0] - MIDDLE[0] / PER_UNIT, y: CENTRE[1] - MIDDLE[1] / PER_UNIT, width: VIEWPORT.width / PER_UNIT, height: VIEWPORT.height / PER_UNIT, pixelsPerUnit: PER_UNIT };
    const large = [...namedBySize(files, viewport, LEVELS.fileNameFrom)];
    expect(large.length).toBeGreaterThan(1);

    // With a budget of one name, one of the large files is named and the others are not; with none, none is, and a name is still written when asked for.
    const one = await browser.newPage({ viewport: VIEWPORT });
    await withTokens(one, { 'LEVELS.fileNameBudget': 1 });
    const oneComplaints = await framed(one, url);
    const open = await onCanvas(one, OPEN, 'open space');
    await one.mouse.move(open[0], open[1]);
    await expect.poll(async () => (await namedOn(one)).length, { timeout: 30_000 }).toBe(1);
    await one.waitForTimeout(600);
    const named = await namedOn(one);
    expect(named).toHaveLength(1);
    expect(large).toContain(named[0]);
    expect(oneComplaints).toEqual([]);
    await one.close();
    const none = await browser.newPage({ viewport: VIEWPORT });
    await withTokens(none, { 'LEVELS.fileNameBudget': 0 });
    const noneComplaints = await framed(none, url);
    await none.mouse.move(open[0], open[1]);
    await none.waitForTimeout(600);
    expect(await namedOn(none)).toEqual([]);
    const slots = await onCanvas(none, [LAYOUT.positions[SLOTS]?.x ?? 0, LAYOUT.positions[SLOTS]?.y ?? 0], 'the large file');
    await none.mouse.move(slots[0], slots[1]);
    await none.waitForSelector(`[data-labels] [data-target="${SLOTS}"]:not([data-named])`, { state: 'attached', timeout: 30_000 });
    expect(noneComplaints).toEqual([]);
    await none.close();

    // Framed so a file large enough to be named, which no notice names, lies under the HUD, every place its name could take covered by it: the name is not written, where the others in view are, and no name written unasked lies on a block of the chrome.
    const at = LAYOUT.positions[SLOTS] ?? { x: 0, y: 0, r: 0 };
    expect(MAP.notices.map((notice) => notice.target)).not.toContain(SLOTS);
    const under: Point = [MIDDLE[0], 40];
    const centre: Point = [at.x, at.y + (MIDDLE[1] - under[1]) / NEAR_UNIT];
    const page = await browser.newPage({ viewport: VIEWPORT });
    const complaints = await near(page, url, centre);
    const frame = { x: centre[0] - MIDDLE[0] / NEAR_UNIT, y: centre[1] - MIDDLE[1] / NEAR_UNIT, width: VIEWPORT.width / NEAR_UNIT, height: VIEWPORT.height / NEAR_UNIT, pixelsPerUnit: NEAR_UNIT };
    expect([...namedBySize(files, frame, LEVELS.fileNameFrom)]).toContain(SLOTS);
    const hud = await page.$eval('[data-hud]', (block) => block.getBoundingClientRect().toJSON() as { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number });
    const [x, y] = nearOf(centre, [at.x, at.y]);
    // A name stands a gap off its file's edge, to a side, above or below, and is a line of type tall.
    const reach = at.r * NEAR_UNIT + LABELING.gap + LABELING.fontSize + 2 * LABELING.pad;
    expect(x - 200 > hud.left && x + 200 < hud.right && y + reach < hud.bottom, "every place the file's name could take lies under the HUD").toBe(true);
    await expect.poll(async () => (await namedOn(page)).length, { timeout: 30_000 }).toBeGreaterThan(0);
    await page.waitForTimeout(600);
    expect(await namedOn(page)).not.toContain(SLOTS);
    const covered = await page.evaluate(() => {
      const blocks = ['[data-hud]', '[data-legend]', '[data-minimap]', '[data-column]'].flatMap((selector) => {
        const block = document.querySelector(selector)?.getBoundingClientRect();
        return block === undefined || block.height <= 0 ? [] : [block];
      });
      return [...document.querySelectorAll('[data-labels] [data-target][data-named="size"]')].flatMap((label) => {
        const box = label.firstElementChild?.getBoundingClientRect();
        return box !== undefined && blocks.some((block) => box.left < block.right && box.right > block.left && box.top < block.bottom && box.bottom > block.top) ? [label.getAttribute('data-target')] : [];
      });
    });
    expect(covered).toEqual([]);
    expect(complaints).toEqual([]);
  } finally {
    await browser.close();
    await server.close();
  }
});

test('a single-file module, selected, opens the slide of the package it floats in, is ringed there where its file floats, and keeps that file\'s tag written, with a clean console (D247 (single-as-its-file))', { timeout: 120_000 }, async () => {
  const { server, url } = await serve();
  const browser = await launch();
  try {
    const single = `single:${DOCTOR}`;
    const at = LAYOUT.positions[DOCTOR] ?? { x: 0, y: 0, r: 0 };
    const centre: Point = [at.x, at.y];
    const page = await browser.newPage({ viewport: VIEWPORT });
    const complaints = await near(page, url, centre);
    const contour = LAYOUT.contours?.[single] ?? [];
    const across = (Math.max(...contour.map(([x]) => x)) - Math.min(...contour.map(([x]) => x))) * NEAR_UNIT;
    // The module's skin is far wider than its one file, so a ring round the one is told from a ring round the other by its width.
    expect(across * 0.75).toBeGreaterThan(2 * at.r * NEAR_UNIT * 1.2);

    // A click on the module's own ground, off its file, selects the module, which is ringed along its skin, and opens its package's slide.
    const [gx, gy] = nearOf(centre, groundOf(single, () => true));
    expect(await page.evaluate(([px, py]) => document.elementFromPoint(px ?? 0, py ?? 0)?.id, [gx, gy]), "the module's ground lies where the canvas takes the pointer").toBe('world');
    await page.mouse.click(gx, gy);
    await page.waitForSelector(`#world[data-selected="${single}"][data-open="${CLI}"]`, { timeout: 30_000 });
    // The slide covers the module's skin, so the ring leaves it for the file's body, far smaller, where the slide floats it.
    await expect.poll(async () => (await ringOf(page)).across, { timeout: 30_000 }).toBeLessThan(across * 0.75);
    const ring = await ringOf(page);
    expect(ring).toMatchObject({ shown: true, ink: HOVER.selectInk, width: String(HOVER.selectWidth) });
    expect(ring.across).toBeGreaterThan(at.r * NEAR_UNIT);
    expect(await page.getAttribute('#world', 'data-selected')).toBe(single);
    // The pointer gone to open space, the file's tag stays written on the slide, and no other's.
    const [ox, oy] = nearOf(centre, [at.x + 60, at.y]);
    expect(await page.evaluate(([px, py]) => document.elementFromPoint(px ?? 0, py ?? 0)?.id, [ox, oy]), 'open space lies where the canvas takes the pointer').toBe('world');
    await page.mouse.move(ox, oy);
    await page.waitForFunction(() => document.querySelector<HTMLElement>('[data-hover-tag]')?.style.display === 'none', undefined, { timeout: 30_000 });
    await page.waitForTimeout(400);
    expect(await page.$$eval('[data-interior-tag]', (tags) => tags.filter((tag) => tag instanceof HTMLElement && tag.style.display !== 'none').map((tag) => tag.getAttribute('data-interior-tag')))).toEqual([DOCTOR]);

    // Escape clears the selection and closes the slide, and the ring goes.
    await page.keyboard.press('Escape');
    await page.waitForSelector('#world:not([data-selected]):not([data-open])', { timeout: 30_000 });
    expect((await ringOf(page)).shown).toBe(false);
    expect(complaints).toEqual([]);
  } finally {
    await browser.close();
    await server.close();
  }
});

/** The middle of a stop's own ground, where the camera stands once it has flown there. */
const standOf = (walk: ReturnType<typeof createWalk>, stop: Stop): Point => {
  const box = walk.box(stop, WALK.fileContext);
  if (box === undefined) throw new Error('the demo frames no ground for the stop');
  return [(box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2];
};

/** A stop that is a module, or the test has walked somewhere the demo does not lead. */
const moduleOf = (stop: Stop | undefined, what: string): Extract<Stop, { readonly kind: 'cell' }> => {
  if (stop?.kind !== 'cell') throw new Error(`${what} is no module on the demo`);
  return stop;
};

test('Enter walks in and selects where it lands, an arrow carries the selection to the sibling it walks to, Escape clears the selection before it ascends, and a view moved by hand stands at the file under its centre once it is large enough, with a clean console (D231 (keys-walk-selection), D225 (escape-clears), D230 (file-stop-by-size))', { timeout: 180_000 }, async () => {
  const { server, url } = await serve();
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: VIEWPORT });
    const complaints: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') complaints.push(`${message.type()}: ${message.text()}`);
    });
    page.on('pageerror', (error) => complaints.push(`pageerror: ${error.message}`));
    const walk = createWalk(MAP);
    const ground = walk.ground();
    if (ground === undefined) throw new Error('the demo lays no ground out');
    const lineOf = (stop: Stop): string => walk.crumbs(stop).join(' › ');
    /** Wait for the breadcrumb to stand where it is meant to, and for the flight there to land. */
    const standing = async (kind: string, of: string, line: string): Promise<void> => {
      await expect.poll(() => crumbsOf(page), { timeout: 30_000 }).toEqual({ kind, of, line });
      await page.waitForTimeout(1_000);
    };
    const selected = async (): Promise<string | null> => page.getAttribute('#world', 'data-selected');

    // The tab opens at the field with nothing selected. The stops the keys lead to are the walk's own, from where the camera stands.
    await page.goto(`${url}/?backend=webgl`);
    await page.waitForSelector('#world[data-world="settled"]', { timeout: 90_000 });
    await standing('field', 'walk', 'field');
    expect(await selected()).toBeNull();
    const first = moduleOf(walk.key(FIELD, 'Enter', [(ground.x0 + ground.x1) / 2, (ground.y0 + ground.y1) / 2]), 'the first step in');
    const second = moduleOf(walk.key(first, 'Enter', standOf(walk, first)), 'the second step in');
    const down = walk.key(second, 'ArrowDown', standOf(walk, second));
    const beside = moduleOf(down ?? walk.key(second, 'ArrowUp', standOf(walk, second)), "the second step's sibling");
    const [there, back] = down === undefined ? ['ArrowUp', 'ArrowDown'] : ['ArrowDown', 'ArrowUp'];

    // Enter walks in to the module under the view, selects it, and the selection opens it; the breadcrumb reads the selection.
    await page.keyboard.press('Enter');
    await page.waitForSelector(`#world[data-selected="${first.cell}"][data-open="${first.cell}"]`, { timeout: 30_000 });
    await standing('cell', 'selection', lineOf(first));
    // Enter again walks in from the selection, and the slide moves with it.
    await page.keyboard.press('Enter');
    await page.waitForSelector(`#world[data-selected="${second.cell}"][data-open="${second.cell}"]`, { timeout: 30_000 });
    await standing('cell', 'selection', lineOf(second));
    // An arrow carries the selection to the sibling it walks to.
    await page.keyboard.press(there);
    await page.waitForSelector(`#world[data-selected="${beside.cell}"][data-open="${beside.cell}"]`, { timeout: 30_000 });
    await standing('cell', 'selection', lineOf(beside));

    // Escape clears the selection and closes its slide, and the camera stays: the breadcrumb falls back to the walk's stop, which is where the arrow flew.
    await page.keyboard.press('Escape');
    await page.waitForSelector('#world:not([data-selected]):not([data-open])', { timeout: 30_000 });
    await standing('cell', 'walk', lineOf(beside));
    // With nothing selected an arrow walks and selects nothing.
    await page.keyboard.press(back);
    await standing('cell', 'walk', lineOf(second));
    expect(await selected()).toBeNull();
    // And Escape now ascends, a step at a time, to the field and no further.
    await page.keyboard.press('Escape');
    await standing('cell', 'walk', lineOf(first));
    await page.keyboard.press('Escape');
    await standing('field', 'walk', 'field');
    await page.keyboard.press('Escape');
    await standing('field', 'walk', 'field');
    expect(await selected()).toBeNull();
    expect(await page.getAttribute('#world', 'data-open')).toBeNull();

    // A view moved by hand: framed on a file still too small to be named, the walk stands at its module; the wheel turned in about it, it stands at the file, and turned out again, at the module.
    const at = LAYOUT.positions[TEXT] ?? { x: 0, y: 0, r: 0 };
    expect(at.r * PER_UNIT).toBeLessThan(LEVELS.fileNameFrom);
    await page.goto(`${url}/?backend=webgl&zoom=${String(ZOOM)}&centre=${String(at.x)},${String(at.y)}`);
    await page.waitForSelector('#world[data-world="settled"]', { timeout: 90_000 });
    await standing('cell', 'walk', lineOf({ kind: 'cell', cell: UTIL }));
    expect(await page.evaluate(([px, py]) => document.elementFromPoint(px ?? 0, py ?? 0)?.id, MIDDLE), 'the canvas takes the pointer at the middle of the free screen').toBe('world');
    await page.mouse.move(MIDDLE[0], MIDDLE[1]);
    /** Turn the wheel a step at a time, letting the view rest after each, until the breadcrumb stands at a kind of stop or the turns run out. */
    const wheelTo = async (delta: number, kind: string, turns: number): Promise<void> => {
      if (turns === 0 || (await crumbsOf(page)).kind === kind) return;
      await page.mouse.wheel(0, delta);
      await page.waitForTimeout(700);
      await wheelTo(delta, kind, turns - 1);
    };
    await wheelTo(-240, 'organelle', 12);
    await standing('organelle', 'walk', lineOf({ kind: 'organelle', path: TEXT, cell: UTIL }));
    await wheelTo(240, 'cell', 12);
    await standing('cell', 'walk', lineOf({ kind: 'cell', cell: UTIL }));
    expect(complaints).toEqual([]);
  } finally {
    await browser.close();
    await server.close();
  }
});

test('under the old levels Escape first closes the slide the zoom opened and leaves the selection, then clears the selection, and only then ascends, with a clean console (D225 (escape-clears), D204 (parked-levels))', { timeout: 150_000 }, async () => {
  const { server, url } = await serve();
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: VIEWPORT });
    const complaints: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') complaints.push(`${message.type()}: ${message.text()}`);
    });
    page.on('pageerror', (error) => complaints.push(`pageerror: ${error.message}`));
    const walk = createWalk(MAP);
    const pm: Stop = { kind: 'cell', cell: PM };
    // Framed on the pm module's middle where it fills the screen, the old levels open it by the zoom.
    const contour = LAYOUT.contours?.[PM] ?? [];
    const middle: Point = [contour.reduce((total, [x]) => total + x, 0) / contour.length, contour.reduce((total, [, y]) => total + y, 0) / contour.length];
    await legacy(page);
    await page.goto(`${url}/?backend=webgl&zoom=8&centre=${middle.join(',')}`);
    await page.waitForSelector('#world[data-world="settled"]', { timeout: 90_000 });
    await page.waitForSelector(`#world[data-open="${PM}"]`, { timeout: 30_000 });
    await page.waitForFunction(() => document.querySelectorAll('[data-interior-leader]').length === 4, undefined, { timeout: 30_000 });
    await expect.poll(() => crumbsOf(page), { timeout: 30_000 }).toEqual({ kind: 'cell', of: 'walk', line: walk.crumbs(pm).join(' › ') });

    // A click on a file floating in the slide selects it, and the slide the zoom opened holds.
    const onBody = await floatingBody(page);
    await page.mouse.click(onBody[0], onBody[1]);
    await page.waitForSelector(`#world[data-selected^="libs/core/src/pm/"][data-open="${PM}"]`, { timeout: 30_000 });
    expect((await crumbsOf(page)).of).toBe('selection');

    // The first Escape closes the slide and leaves the selection; the second clears the selection and leaves the camera; the third ascends.
    await page.keyboard.press('Escape');
    await page.waitForSelector('#world[data-selected^="libs/core/src/pm/"]:not([data-open])', { timeout: 30_000 });
    await page.keyboard.press('Escape');
    await page.waitForSelector('#world:not([data-selected]):not([data-open])', { timeout: 30_000 });
    await expect.poll(() => crumbsOf(page), { timeout: 30_000 }).toEqual({ kind: 'cell', of: 'walk', line: walk.crumbs(pm).join(' › ') });
    await page.keyboard.press('Escape');
    const up = walk.ascend(pm);
    if (up === undefined) throw new Error('the pm module has nothing above it on the demo');
    await expect.poll(() => crumbsOf(page), { timeout: 30_000 }).toEqual({ kind: up.kind, of: 'walk', line: walk.crumbs(up).join(' › ') });
    expect(complaints).toEqual([]);
  } finally {
    await browser.close();
    await server.close();
  }
});
