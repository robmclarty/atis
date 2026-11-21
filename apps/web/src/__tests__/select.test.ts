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
 */

import { readFileSync } from 'node:fs';

import type { Page } from 'playwright-core';
import { expect, test } from 'vitest';

import { assertMap, withinContour } from 'core';

import { RAIL_WIDTH, fitFrame } from '../fit.js';
import { HOVER, WALK } from '../materials.js';
import { bandRules } from '../space.js';
import { createWalk } from '../walk.js';
import { DEMO, launch, serve, withTokens } from './browser.js';

type Point = readonly [number, number];

const VIEWPORT = { width: 960, height: 720 };
const MAP = assertMap(JSON.parse(readFileSync(DEMO, 'utf8')));
const { layout: LAID } = MAP.terrain;
if (LAID === undefined) throw new Error('the demo lays nothing out');
const LAYOUT = LAID;

const PM = 'folder:libs/core/src/pm';
const UTIL = 'directory:libs/core/src/util';
const TOOLS = 'libs/core/src/pm/tools.ts';

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

/** A point of a module's own ground, on the clear screen, as far from every file and every skin's edge as its skin lets it be: a click there is on the module, on no file, and on no other module. */
const groundOf = (cell: string): Point => {
  const skin = SKINS.find((each) => each.cell === cell)?.contour ?? [];
  const inner = SKINS.filter((each) => each.cell !== cell && each.contour.every(([x, y]) => withinContour(skin, x, y)));
  return farthest(
    GRID.filter((point) => clear(screenOf(point)) && withinContour(skin, point[0], point[1]) && inner.every((each) => !withinContour(each.contour, point[0], point[1]))),
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
