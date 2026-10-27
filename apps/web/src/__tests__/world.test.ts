/**
 * The world's smoke test (D132): the gate's one eye on the GPU code the
 * coverage thresholds leave out. It serves the app from Vite in-process with
 * the demo map, never from a shared `dist/`, opens it headless on the WebGL 2
 * path in the installed Chrome, else a Chromium on the PATH (D145), and fails
 * on a console error or a blank frame. It looks at the lit surface, past
 * LOD1's gate, since the far field is dark by design until the weather lights
 * it (D151); its field is space ruled at each band's boundary (D169), and
 * there it writes no label at load, and the pointer over a file
 * writes that file's and takes it away on leaving (D168). A second frame
 * opens on one cell where it fills the screen, and
 * the cell opens as a stained slide (step 40, D165): the canvas names the
 * open cell, the slide tags each of its files but shows a tag only for the
 * pointer on its body or in the exploded view (D168), a click on a floating file
 * keeps it open, `x` spreads the exploded view, and `w` lays the cell's wiring
 * out on a plate in the chrome (step 41); Esc closes it, the surface holds its
 * files where they floated, and zooming out toward the field brings them
 * home. Framed on a package, the world opens it on its modules, the file of
 * the single-file cell it holds tagged beside its barrel (D167), and there the
 * legend, closed at load, opens from the HUD's `key` block and folds away on
 * Esc while the cell stays open (D166). A fourth
 * emulates `prefers-reduced-motion` and holds the frames still after load, in
 * an opened cell and across a fly-to, beside a page with motion on whose
 * frames move (step 42). And at the opening frame the world is a dark planet
 * under one star per outside package the map records, which the wheel zooms
 * through LOD1's gate to the flat world (D170). Served as a range, the demo's
 * scrubber steps its frames by key: the canvas names the frame it shows, the
 * weather cross-fades and settles, the notices' boxes follow the frame, and
 * the terrain beneath never settles again (D100). Served as a whole repo,
 * the demo opens on its trouble spots, and a toggle in the HUD cross-fades
 * the world to another overlay and then to none (D101). Framed on one file
 * past LOD3's gate, the file opens onto its plate: its functions as
 * granules, the strip of its lines with its hunk, its uncovered lines and its
 * mutants (§6, D102). Past LOD4's gate the changed file's plate gives way to
 * its diff: a page with no token shows its hunk's line range alone, and one
 * served with the token shows the diff `/diff/<path>` answers, its hunk's head
 * and its head linked to the file in the editor, beside the PR the page was
 * told of (D102). Opened watching, the world takes the maps the watch pushes
 * over its socket, stood in for here by the browser's own: one on the ground
 * it draws cross-fades its weather in without the page reloading, and one on
 * other ground is drawn afresh where the reader stood (D106). As a still for
 * a pull request's comment (`?cinema`), it draws no chrome and stands at the
 * surface framed on the change, never the planet, opening no slide (D108).
 */

import { accessSync, constants, readFileSync } from 'node:fs';
import { delimiter, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright-core';
import type { Browser, Page } from 'playwright-core';
import { createServer } from 'vite';
import type { Plugin, ViteDevServer } from 'vite';
import { expect, test } from 'vitest';

import { repoMap } from './repo-map.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB = join(HERE, '..', '..');
const DEMO = join(WEB, '..', '..', 'libs', 'core', 'fixtures', 'demo', 'map.json');

/** The names a Chromium goes by on a PATH, tried in order when Chrome is not installed. */
const CHROMIUM_NAMES = ['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable', 'chrome'];

const chromiumOnPath = (): string | undefined => {
  for (const dir of (process.env['PATH'] ?? '').split(delimiter)) {
    for (const name of CHROMIUM_NAMES) {
      const candidate = join(dir, name);
      try {
        accessSync(candidate, constants.X_OK);
        return candidate;
      } catch {
        // Not here; the next name or directory may have it.
      }
    }
  }
  return undefined;
};

/** The installed Chrome, else a Chromium on the PATH; with neither the gate fails and says what it needs, since a world no test can open is no gate. */
const launch = async (): Promise<Browser> => {
  try {
    return await chromium.launch({ channel: 'chrome', headless: true });
  } catch (chrome) {
    const found = chromiumOnPath();
    if (found === undefined) {
      const reason = chrome instanceof Error ? chrome.message.split('\n')[0] : String(chrome);
      throw new Error(`the world's smoke test needs Google Chrome installed, or a Chromium on the PATH as one of ${CHROMIUM_NAMES.join(', ')} (${reason ?? 'no Chrome'})`, { cause: chrome });
    }
    return chromium.launch({ executablePath: found, headless: true });
  }
};

/** Serve the map at `/map.json`, where the app looks when the page names none (D93). */
const serveMap = (body: string): Plugin => ({
  name: 'atis-serve-map',
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      if (request.url?.split('?')[0] !== '/map.json') {
        next();
        return;
      }
      response.setHeader('content-type', 'application/json');
      response.end(body);
    });
  },
});

/** Answer `/diff/<path>` for one path and the run's token, as the CLI does (D102, D134), with `body` as the served diff. */
const serveDiff = (path: string, token: string, body: string): Plugin => ({
  name: 'atis-serve-diff',
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');
      if (url.pathname !== `/diff/${path}`) {
        next();
        return;
      }
      response.statusCode = url.searchParams.get('token') === token ? 200 : 403;
      response.setHeader('content-type', 'application/json');
      response.end(response.statusCode === 200 ? body : '"refused"');
    });
  },
});

/** The app on loopback from its sources, on a port the system picks, serving the demo map unless handed another, and whatever else the plugins handed in answer. */
const serve = async (body: string = readFileSync(DEMO, 'utf8'), served: readonly Plugin[] = []): Promise<{ readonly server: ViteDevServer; readonly url: string }> => {
  const server = await createServer({
    root: WEB,
    configFile: join(WEB, 'vite.config.ts'),
    logLevel: 'silent',
    clearScreen: false,
    server: { host: '127.0.0.1', port: 0, strictPort: false, open: false, hmr: false },
    plugins: [serveMap(body), ...served],
  });
  await server.listen();
  const address = server.httpServer?.address();
  if (address === null || address === undefined || typeof address === 'string') throw new Error('vite did not bind a loopback port');
  return { server, url: `http://127.0.0.1:${String(address.port)}` };
};

/** What a frame holds: how many of its pixels rise clear of the field, how many distinct colours it has, and how many pixels there are. */
type FrameReading = { readonly lit: number; readonly shades: number; readonly pixels: number };

test('the world draws the demo map headless on WebGL 2, lit at the surface, with a clean console', { timeout: 120_000 }, async () => {
  const { server, url } = await serve();
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
    const complaints: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') complaints.push(`${message.type()}: ${message.text()}`);
    });
    page.on('pageerror', (error) => complaints.push(`pageerror: ${error.message}`));

    await page.goto(`${url}/?backend=webgl&zoom=2`);
    await page.waitForSelector('#world[data-world="settled"]', { timeout: 90_000 });
    expect(await page.getAttribute('#world', 'data-backend')).toBe('webgl');
    // The ready flag a capture waits on is up, and the page marked when its first complete frame was on the screen (step 43, D105).
    expect(await page.getAttribute('#world', 'data-ready')).toBe('true');
    expect(await page.evaluate(() => performance.getEntriesByName('atis:ready').length)).toBe(1);
    expect(await page.getAttribute('#world', 'data-lod')).toBe('1');
    // The field is space with a rule at each band's boundary over the canvas, one a boundary (D169).
    const bands = (JSON.parse(readFileSync(DEMO, 'utf8')) as { terrain: { layout: { bands: readonly unknown[] } } }).terrain.layout.bands.length;
    expect(await page.$$eval('[data-rules] line', (lines) => lines.length)).toBe(bands - 1);
    // A rule off the screen at this framing is not drawn; those on it run across it.
    expect(await page.$$eval('[data-rules] line', (lines) => lines.filter((line) => line instanceof SVGElement && line.style.display !== 'none').length)).toBeGreaterThan(0);

    // The chrome's status line sits over the canvas; the frame judged is the world's alone.
    await page.evaluate(() => document.querySelector<HTMLElement>('#chrome')?.style.setProperty('visibility', 'hidden'));
    const png = (await page.screenshot({ type: 'png' })).toString('base64');
    const reading = await page.evaluate(async (encoded: string): Promise<FrameReading> => {
      const blob = await (await fetch(`data:image/png;base64,${encoded}`)).blob();
      const bitmap = await createImageBitmap(blob);
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const context = canvas.getContext('2d');
      if (context === null) throw new Error('no 2d context to read the frame with');
      context.drawImage(bitmap, 0, 0);
      const { data } = context.getImageData(0, 0, bitmap.width, bitmap.height);
      const shades = new Set<number>();
      let lit = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i] ?? 0;
        const g = data[i + 1] ?? 0;
        const b = data[i + 2] ?? 0;
        shades.add((r << 16) | (g << 8) | b);
        if (Math.max(r, g, b) > 24) lit += 1;
      }
      return { lit, shades: shades.size, pixels: data.length / 4 };
    }, png);

    // A blank frame is the field alone: nothing clear of it, in one shade. The cells' lit tissue covers a share of the frame in hundreds of shades,
    // the open field between them as dark as the space it is (D169, `SKIN.fieldSheen`), so a share well clear of none is a world drawn.
    expect(reading.lit / reading.pixels).toBeGreaterThan(0.05);
    expect(reading.shades).toBeGreaterThan(64);

    // The world writes no word unasked (D168): at load no label and no storm's slot, only the numbered boxes; the pointer
    // over a file writes its labels, and leaving it takes them away again. A target's run of boxes hangs from its point,
    // so the file hovered is a noticed one whose point lies on the canvas.
    const written = async (): Promise<readonly (string | null)[]> =>
      page.$$eval('[data-labels] [data-target], [data-labels] [data-label="storm"], [data-labels] [data-label="rename"]', (elements) =>
        elements.filter((element) => element instanceof HTMLElement && element.style.display !== 'none').map((element) => element.getAttribute('data-target') ?? element.textContent),
      );
    expect(await written()).toEqual([]);
    expect(await page.$$eval('[data-labels] [data-mark]', (elements) => elements.length)).toBe(6);
    const hovered = await page.$$eval('[data-run]', (runs) =>
      runs
        .map((run) => {
          const box = run.getBoundingClientRect();
          return { target: run.getAttribute('data-run') ?? '', x: box.left, y: box.top };
        })
        .find(({ x, y }) => document.elementFromPoint(x, y)?.id === 'world'),
    );
    if (hovered === undefined) throw new Error('no noticed file of the demo lies on the canvas at the surface');
    await page.mouse.move(hovered.x, hovered.y);
    // A label hangs from a hanger of no size, so it is waited on as there rather than as seen.
    await page.waitForSelector(`[data-labels] [data-target="${hovered.target}"]`, { state: 'attached', timeout: 30_000 });
    expect(new Set(await page.$$eval('[data-labels] [data-target]', (elements) => elements.map((element) => element.getAttribute('data-target'))))).toEqual(new Set([hovered.target]));
    expect(await page.getAttribute(`[data-labels] [data-target="${hovered.target}"]`, 'data-label')).toBe('notice');
    await page.mouse.move(2, 715);
    await page.waitForSelector(`[data-labels] [data-target="${hovered.target}"]`, { state: 'detached', timeout: 30_000 });
    expect(await written()).toEqual([]);
    expect(complaints).toEqual([]);
  } finally {
    await browser.close();
    await server.close();
  }
});

test("the world opens on a dark planet under its dependencies' stars, lit where the far field lights, and zooms through LOD1's gate to the flat world, with a clean console (D170)", { timeout: 120_000 }, async () => {
  const { server, url } = await serve();
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
    const complaints: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') complaints.push(`${message.type()}: ${message.text()}`);
    });
    page.on('pageerror', (error) => complaints.push(`pageerror: ${error.message}`));

    await page.goto(`${url}/?backend=webgl`);
    await page.waitForSelector('#world[data-world="settled"]', { timeout: 90_000 });
    expect(await page.getAttribute('#world', 'data-lod')).toBe('0');
    expect(await page.getAttribute('#world', 'data-planet')).toBe('on');
    // One star per outside package the demo's map records.
    const dependencies = (JSON.parse(readFileSync(DEMO, 'utf8')) as { weather: { dependencies: readonly unknown[] } }).weather.dependencies.length;
    expect(await page.getAttribute('[data-planet-layer]', 'data-stars')).toBe(String(dependencies));
    expect(await page.$eval('[data-planet-layer]', (element) => element instanceof HTMLElement && element.style.display !== 'none')).toBe(true);

    // The planet's own canvas: dark, with points of light on it and round it, never blank.
    const reading = await page.$eval('[data-planet-layer]', (element): FrameReading => {
      if (!(element instanceof HTMLCanvasElement)) throw new Error('the planet is not a canvas');
      const context = element.getContext('2d');
      if (context === null) throw new Error('the planet has no 2d context');
      const { data } = context.getImageData(0, 0, element.width, element.height);
      const shades = new Set<number>();
      let lit = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i] ?? 0;
        const g = data[i + 1] ?? 0;
        const b = data[i + 2] ?? 0;
        shades.add((r << 16) | (g << 8) | b);
        if (Math.max(r, g, b) > 96) lit += 1;
      }
      return { lit, shades: shades.size, pixels: data.length / 4 };
    });
    expect(reading.lit).toBeGreaterThan(0);
    expect(reading.lit / reading.pixels).toBeLessThan(0.05);
    expect(reading.shades).toBeGreaterThan(32);

    // A wheel step at a time toward the middle of the free screen, the planet grows past LOD1's gate and hands off to the world.
    await page.mouse.move(350, 360);
    const descend = async (turns: number): Promise<void> => {
      if (turns === 0 || (await page.getAttribute('#world', 'data-lod')) !== '0') return;
      await page.mouse.wheel(0, -60);
      await page.waitForTimeout(100);
      await descend(turns - 1);
    };
    await descend(60);
    expect(await page.getAttribute('#world', 'data-lod')).not.toBe('0');
    await page.waitForSelector('#world[data-planet="off"]', { timeout: 30_000 });
    expect(await page.$eval('[data-planet-layer]', (element) => element instanceof HTMLElement && element.style.display === 'none')).toBe(true);
    expect(complaints).toEqual([]);
  } finally {
    await browser.close();
    await server.close();
  }
});

/** The middle of a cell's contour on the demo, where a frame centred on it opens the cell. */
const middleOf = (cell: string): readonly [number, number] => {
  const parsed: unknown = JSON.parse(readFileSync(DEMO, 'utf8'));
  const contour = (parsed as { terrain: { layout: { contours: Record<string, readonly (readonly [number, number])[]> } } }).terrain.layout.contours[cell] ?? [];
  return [contour.reduce((total, [x]) => total + x, 0) / contour.length, contour.reduce((total, [, y]) => total + y, 0) / contour.length];
};

test("framed on one cell where it fills the screen, the world opens it as a slide that tags each of its files and holds open on a click on one, x spreads the exploded view and w lays its wiring out, and closed, the surface holds its files where they floated until the view climbs on, with a clean console", { timeout: 120_000 }, async () => {
  const { server, url } = await serve();
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
    const complaints: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') complaints.push(`${message.type()}: ${message.text()}`);
    });
    page.on('pageerror', (error) => complaints.push(`pageerror: ${error.message}`));

    const cell = 'folder:libs/core/src/pm';
    const [x, y] = middleOf(cell);
    await page.goto(`${url}/?backend=webgl&zoom=8&centre=${String(x)},${String(y)}`);
    await page.waitForSelector('#world[data-world="settled"]', { timeout: 90_000 });
    await page.waitForSelector(`#world[data-open="${cell}"]`, { timeout: 30_000 });
    // The slide tags every file the layout placed in the cell, each with its rule count, and writes the barrel's exports on the membrane,
    // but shows none of it unasked (D168): the tags and the exports wait for the exploded view, or a tag for the pointer on its body.
    await page.waitForSelector('[data-interior-tag]', { state: 'attached', timeout: 30_000 });
    const tags = await page.$$eval('[data-interior-tag]', (elements) => elements.map((element) => element.textContent));
    expect(tags.toSorted()).toEqual(['+tools.ts · 2', 'index.ts', 'legacy.ts', 'slots.ts']);
    expect(await page.textContent('[data-interior-exports]')).toBe('index.ts · 3 exports\nlistSlots  resolveSlot  resolveTool');
    const shownTags = async (): Promise<readonly (string | null)[]> =>
      page.$$eval('[data-interior-tag], [data-interior-exports]', (elements) => elements.filter((element) => element instanceof HTMLElement && element.style.display !== 'none').map((element) => element.textContent));
    expect(await shownTags()).toEqual([]);
    // A click on a file of the open cell, where it has floated, keeps the cell open (D165): just inside a body's rim, past its leader's end, where the canvas takes the pointer.
    const onBody = await page.$$eval('[data-interior-leader]', (lines) =>
      lines
        .map((line) => {
          const [x1, y1, x2, y2] = ['x1', 'y1', 'x2', 'y2'].map((name) => Number(line.getAttribute(name)));
          const length = Math.hypot((x2 ?? 0) - (x1 ?? 0), (y2 ?? 0) - (y1 ?? 0)) || 1;
          return [(x2 ?? 0) + (((x2 ?? 0) - (x1 ?? 0)) / length) * 4, (y2 ?? 0) + (((y2 ?? 0) - (y1 ?? 0)) / length) * 4] as const;
        })
        .find(([px, py]) => document.elementFromPoint(px, py)?.id === 'world'),
    );
    if (onBody === undefined) throw new Error('no floating file of the open cell lies where the canvas takes the pointer');
    // The pointer on a body writes that body's tag alone.
    await page.mouse.move(onBody[0], onBody[1]);
    await page.waitForFunction(() => [...document.querySelectorAll('[data-interior-tag]')].some((element) => element instanceof HTMLElement && element.style.display !== 'none'), undefined, { timeout: 30_000 });
    expect(await shownTags()).toHaveLength(1);
    await page.mouse.click(onBody[0], onBody[1]);
    await page.waitForTimeout(500);
    expect(await page.getAttribute('#world', 'data-open')).toBe(cell);
    expect(await page.$$eval('[data-interior-tag]', (elements) => elements.length)).toBe(4);
    expect(await page.textContent('[data-explode]')).toBe('explode');
    // The exploded view spreads on x, and the breadcrumb's button reads so.
    await page.keyboard.press('x');
    await page.waitForSelector('#world[data-exploded="on"]', { timeout: 30_000 });
    expect(await page.textContent('[data-explode]')).toBe('gather');
    // Spread, the slide writes every tag and the exports.
    expect(new Set(await shownTags())).toEqual(new Set(['+tools.ts · 2', 'index.ts', 'index.ts · 3 exports\nlistSlots  resolveSlot  resolveTool', 'legacy.ts', 'slots.ts']));
    const sockets = await page.$$eval('[data-interior-socket]', (elements) => elements.filter((element) => element instanceof SVGElement && element.style.display !== 'none').length);
    expect(sockets).toBe(4);
    // The wiring is laid on w, its plate drawing a box per wired file and a line per wire, and taken away on w again.
    expect(await page.textContent('[data-wire]')).toBe('wire');
    await page.keyboard.press('w');
    await page.waitForSelector(`[data-wiring="${cell}"] svg`, { timeout: 30_000 });
    expect(await page.getAttribute('#world', 'data-wired')).toBe('on');
    expect(await page.textContent('[data-wire]')).toBe('unwire');
    expect(await page.$$eval('[data-wiring-file]', (elements) => elements.length)).toBe(7);
    expect(await page.$$eval('[data-wiring-line]', (elements) => elements.length)).toBe(7);
    await page.keyboard.press('w');
    await page.waitForSelector('[data-wiring]', { state: 'detached', timeout: 30_000 });
    // Escape closes the cell, and the surface draws its loose files where they last floated while the view stays at it.
    await page.keyboard.press('Escape');
    await page.waitForSelector('#world:not([data-open])', { timeout: 30_000 });
    await page.waitForFunction(() => Number(document.querySelector('#world')?.getAttribute('data-floated') ?? '0') > 0, undefined, { timeout: 30_000 });
    // Zoomed out on toward the field, a wheel step at a time, they come home.
    await page.mouse.move(onBody[0], onBody[1]);
    const climb = async (turns: number): Promise<void> => {
      if (turns === 0 || (await page.getAttribute('#world', 'data-floated')) === '0') return;
      await page.mouse.wheel(0, 240);
      await page.waitForTimeout(100);
      await climb(turns - 1);
    };
    await climb(60);
    expect(await page.getAttribute('#world', 'data-floated')).toBe('0');
    expect(complaints).toEqual([]);
  } finally {
    await browser.close();
    await server.close();
  }
});

/** A page on the world framed on a cell past the cell's gate, opened, with its console's complaints collected. */
const openedOn = async (browser: Browser, url: string, cell: string, reducedMotion: 'reduce' | 'no-preference'): Promise<{ readonly page: Page; readonly complaints: readonly string[] }> => {
  const page = await browser.newPage({ viewport: { width: 960, height: 720 }, reducedMotion });
  const complaints: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') complaints.push(`${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', (error) => complaints.push(`pageerror: ${error.message}`));
  const [x, y] = middleOf(cell);
  await page.goto(`${url}/?backend=webgl&zoom=8&centre=${String(x)},${String(y)}`);
  await page.waitForSelector('#world[data-world="settled"]', { timeout: 90_000 });
  await page.waitForSelector(`#world[data-open="${cell}"]`, { timeout: 30_000 });
  await page.waitForSelector('[data-interior-tag]', { state: 'attached', timeout: 30_000 });
  return { page, complaints };
};

/** Show or hide every layer the page draws over the world's own canvas. */
const layersShown = async (page: Page, shown: boolean): Promise<void> => {
  await page.evaluate((visibility) => {
    for (const element of document.body.children) if (element instanceof HTMLElement && element.id !== 'world') element.style.visibility = visibility;
  }, shown ? '' : 'hidden');
};

/** Two frames of a page, `apart` milliseconds apart. */
const twoFrames = async (page: Page, apart: number): Promise<readonly [Buffer, Buffer]> => {
  const first = await page.screenshot({ type: 'png' });
  await page.waitForTimeout(apart);
  return [first, await page.screenshot({ type: 'png' })];
};

test('framed on a package, the world opens it on its modules, tagging the file of the single-file cell it holds beside its barrel, and the key block opens the legend over it until Esc, with a clean console (D167, D166)', { timeout: 120_000 }, async () => {
  const { server, url } = await serve();
  const browser = await launch();
  try {
    const cell = 'package:apps/cli';
    const { page, complaints } = await openedOn(browser, url, cell, 'no-preference');
    const tags = await page.$$eval('[data-interior-tag]', (elements) => elements.map((element) => element.textContent));
    expect(tags.toSorted()).toEqual(['doctor.ts', 'index.ts']);
    // No surface label lies on the slide's own tags, which stand alone beside it (D166).
    const crowded = await page.evaluate(() => {
      const tagBoxes = [...document.querySelectorAll('[data-interior-tag]')].map((element) => element.getBoundingClientRect()).filter((box) => box.width > 0);
      return [...document.querySelectorAll('[data-labels] [data-target] > div')]
        .map((element) => element.getBoundingClientRect())
        .filter((label) => label.width > 0 && tagBoxes.some((tag) => label.left < tag.right && tag.left < label.right && label.top < tag.bottom && tag.top < label.bottom)).length;
    });
    expect(crowded).toBe(0);
    // The legend never covers the world unasked: closed at load, opened by the key block, folded away by Esc before Esc reaches the open cell (D166).
    expect(await page.$$eval('[data-legend]', (elements) => elements.length)).toBe(0);
    await page.click('[data-hud-key]');
    await page.waitForSelector('[data-legend]', { timeout: 30_000 });
    expect(await page.$$eval('[data-legend] [data-mark]', (elements) => elements.length)).toBe(14);
    await page.keyboard.press('Escape');
    await page.waitForSelector('[data-legend]', { state: 'detached', timeout: 30_000 });
    expect(await page.getAttribute('#world', 'data-open')).toBe(cell);
    expect(complaints).toEqual([]);
  } finally {
    await browser.close();
    await server.close();
  }
});

test('under reduced motion nothing changes from frame to frame after load, in an opened cell or across a fly-to, while with motion on the same frames move, with a clean console', { timeout: 120_000 }, async () => {
  const { server, url } = await serve();
  const browser = await launch();
  try {
    const cell = 'folder:libs/core/src/pm';
    // With motion on, the opened cell's breaking shapes pulse and its loose files drift, so two frames differ: the check can see motion.
    const moving = await openedOn(browser, url, cell, 'no-preference');
    expect(await moving.page.getAttribute('#world', 'data-motion')).toBe('full');
    const [before, after] = await twoFrames(moving.page, 1000);
    expect(before.equals(after)).toBe(false);
    await moving.page.close();

    // Reduced: the slide cut in, nothing settles, breathes, flares, pulses or drifts, so the frames are the same to the pixel.
    // The world's own frame is judged, the layers over it hidden, since Chrome sharpens the text of a tag that has just
    // moved or appeared a moment after it stops, which is the browser's raster and no motion of the world's.
    const { page, complaints } = await openedOn(browser, url, cell, 'reduce');
    expect(await page.getAttribute('#world', 'data-motion')).toBe('reduced');
    await layersShown(page, false);
    const [still, later] = await twoFrames(page, 1500);
    expect(still.equals(later)).toBe(true);
    // A fly-to cuts: a frame just after the notice's row is clicked is already where the view lands, and the landing
    // does not swing.
    await layersShown(page, true);
    await page.click('[data-notices] [data-notice="1"]');
    await layersShown(page, false);
    await page.waitForTimeout(150);
    const [landed, rested] = await twoFrames(page, 1000);
    expect(landed.equals(rested)).toBe(true);
    expect(landed.equals(still)).toBe(false);
    expect(complaints).toEqual([]);
  } finally {
    await browser.close();
    await server.close();
  }
});

/** The demo map as a range of two commits (D100): the first touched the README alone and read no `.check/`, the second is the map's own weather. */
const rangedDemo = (): string => {
  const demo = JSON.parse(readFileSync(DEMO, 'utf8')) as { meta: { head: string }; weather: Record<string, unknown> & { changed: readonly { path: string }[] }; notices: readonly unknown[] };
  const { health_delta: _moved, ...unmeasured } = demo.weather;
  const reason = 'the commit is not the checked-out HEAD, so .check/ does not describe it';
  const first = { ...unmeasured, changed: demo.weather.changed.filter((file) => file.path === 'README.md'), reach: [], wiring: [], evidence: {}, checks: { category: 'NOINST', checks_run: 0, reason, slots: [] }, improvements: [] };
  const frames = [
    { commit: 'a'.repeat(40), subject: 'docs: say what the doctor does', weather: first, notices: [] },
    { commit: demo.meta.head, subject: 'feat(cli): run the doctor', weather: demo.weather, notices: demo.notices },
  ];
  return JSON.stringify({ ...demo, sequence: { frames } });
};

test("served as a range, the scrubber steps its frames by key and the weather cross-fades over a terrain that never settles again, with a clean console (D100)", { timeout: 120_000 }, async () => {
  const { server, url } = await serve(rangedDemo());
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
    const complaints: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') complaints.push(`${message.type()}: ${message.text()}`);
    });
    page.on('pageerror', (error) => complaints.push(`pageerror: ${error.message}`));

    await page.goto(`${url}/?backend=webgl&zoom=2`);
    await page.waitForSelector('#world[data-world="settled"]', { timeout: 90_000 });
    // The world opens on the map's own frame, its six notices boxed.
    expect(await page.getAttribute('[data-scrubber]', 'data-scrubber')).toBe('1');
    expect(await page.$$eval('[data-labels] [data-mark]', (elements) => elements.length)).toBe(6);
    const rules = await page.$$eval('[data-rules] line', (lines) => lines.map((line) => [line.getAttribute('x1'), line.getAttribute('y1'), line.getAttribute('x2'), line.getAttribute('y2')].join(',')));

    // `,` steps back a commit: the canvas names the frame, the weather fades and settles, and the first commit boxes no notice.
    await page.keyboard.press(',');
    await page.waitForSelector('#world[data-frame="0"][data-scrub="settled"]', { timeout: 30_000 });
    expect(await page.getAttribute('[data-scrubber]', 'data-scrubber')).toBe('0');
    expect(await page.$$eval('[data-labels] [data-mark]', (elements) => elements.length)).toBe(0);
    await page.keyboard.press('.');
    await page.waitForSelector('#world[data-frame="1"][data-scrub="settled"]', { timeout: 30_000 });
    expect(await page.$$eval('[data-labels] [data-mark]', (elements) => elements.length)).toBe(6);

    // The terrain never moved: the skin is still settled, and the rules lie where they lay (P2).
    expect(await page.getAttribute('#world', 'data-world')).toBe('settled');
    expect(await page.$$eval('[data-rules] line', (lines) => lines.map((line) => [line.getAttribute('x1'), line.getAttribute('y1'), line.getAttribute('x2'), line.getAttribute('y2')].join(',')))).toEqual(rules);
    expect(complaints).toEqual([]);
  } finally {
    await browser.close();
    await server.close();
  }
});

test("served as a whole repo, the world opens on its trouble spots and the HUD's toggles cross-fade it to another overlay and to none, with a clean console (D101)", { timeout: 120_000 }, async () => {
  const { server, url } = await serve(JSON.stringify(repoMap()));
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
    const complaints: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') complaints.push(`${message.type()}: ${message.text()}`);
    });
    page.on('pageerror', (error) => complaints.push(`pageerror: ${error.message}`));

    await page.goto(`${url}/?backend=webgl&zoom=2`);
    await page.waitForSelector('#world[data-world="settled"]', { timeout: 90_000 });
    expect(await page.getAttribute('#world', 'data-overlay')).toBe('trouble_spots');
    expect(await page.textContent('[data-block="overlay"]')).toBe('Trouble spots 4 files');

    // The toggles are named as the canvas names the overlay it shows, so a click is held to the strip.
    await page.click('[data-overlays] [data-overlay="coverage_gaps"]');
    await page.waitForSelector('#world[data-overlay="coverage_gaps"][data-overlay-fade="settled"]', { timeout: 30_000 });
    expect(await page.textContent('[data-block="overlay"]')).toBe('Coverage gaps 8 files');
    await page.click('[data-overlays] [data-overlay="coverage_gaps"]');
    await page.waitForSelector('#world[data-overlay="none"][data-overlay-fade="settled"]', { timeout: 30_000 });
    expect(await page.textContent('[data-block="overlay"]')).toBe('Overlay off');

    // The terrain never moved beneath the overlays: the skin is still settled (P2).
    expect(await page.getAttribute('#world', 'data-world')).toBe('settled');
    expect(complaints).toEqual([]);
  } finally {
    await browser.close();
    await server.close();
  }
});

test('framed on one file past LOD3, it opens onto its plate: its functions, its hunk, its uncovered lines and its mutants, with a clean console (D102)', { timeout: 120_000 }, async () => {
  const { server, url } = await serve();
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
    const complaints: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') complaints.push(`${message.type()}: ${message.text()}`);
    });
    page.on('pageerror', (error) => complaints.push(`pageerror: ${error.message}`));

    const tools = (JSON.parse(readFileSync(DEMO, 'utf8')) as { terrain: { layout: { positions: Record<string, { x: number; y: number }> } } }).terrain.layout.positions['libs/core/src/pm/tools.ts'];
    await page.goto(`${url}/?backend=webgl&zoom=30&centre=${String(tools?.x)},${String(tools?.y)}`);
    await page.waitForSelector('#world[data-world="settled"][data-file="libs/core/src/pm/tools.ts"]', { timeout: 90_000 });
    expect(await page.getAttribute('#world', 'data-lod')).toBe('3');
    // The plate holds the file's three functions, the one that breaks two rules dented, and its strip's marks.
    expect(await page.$$eval('[data-file-plate] [data-function]', (granules) => granules.map((granule) => [granule.getAttribute('data-function'), granule.getAttribute('data-rules')]))).toEqual([
      ['localBin', '0'],
      ['resolveTool', '2'],
      ['toolName', '0'],
    ]);
    expect(await page.$$eval('[data-file-plate] [data-hunk]', (hunks) => hunks.length)).toBe(1);
    expect(await page.$$eval('[data-file-plate] [data-uncovered]', (lines) => lines.map((line) => line.getAttribute('data-uncovered')))).toEqual(['27', '64']);
    expect(await page.$$eval('[data-file-plate] [data-mutant]', (mutants) => mutants.length)).toBe(2);
    expect(await page.$eval('[data-file-plate]', (plate) => plate instanceof SVGElement && plate.style.display !== 'none')).toBe(true);
    expect(complaints).toEqual([]);
  } finally {
    await browser.close();
    await server.close();
  }
});

test("past LOD4 the changed file's plate gives way to its diff: its hunk's line range with no token, and the served diff with links to the editor and the PR with one (D102)", { timeout: 180_000 }, async () => {
  const path = 'libs/core/src/pm/tools.ts';
  const diff = { path, diff: `diff --git a/${path} b/${path}\nnew file mode 100644\n--- /dev/null\n+++ b/${path}\n@@ -0,0 +1,2 @@\n+export const localBin = 'node_modules/.bin';\n+export const toolName = (name: string): string => name;\n`, root: '/work/demo', editor: 'vscode://file{root}/{path}:{line}' };
  const { server, url } = await serve(undefined, [serveDiff(path, 't0', JSON.stringify(diff))]);
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
    const complaints: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') complaints.push(`${message.type()}: ${message.text()}`);
    });
    page.on('pageerror', (error) => complaints.push(`pageerror: ${error.message}`));
    const tools = (JSON.parse(readFileSync(DEMO, 'utf8')) as { terrain: { layout: { positions: Record<string, { x: number; y: number }> } } }).terrain.layout.positions[path];
    const framed = `backend=webgl&zoom=100&centre=${String(tools?.x)},${String(tools?.y)}&pr=${encodeURIComponent('https://github.com/o/r/pull/4')}`;

    // No token, as a fixture has none: the hunk's line range alone, and why, with nothing to open but the PR.
    await page.goto(`${url}/?${framed}`);
    await page.waitForSelector(`#world[data-world="settled"][data-diff="${path}"]`, { timeout: 90_000 });
    expect(await page.getAttribute('#world', 'data-lod')).toBe('4');
    expect(await page.$eval('[data-diff-sheet] [data-diff-title]', (title) => title.textContent)).toBe(`+${path}`);
    expect(await page.$$eval('[data-diff-sheet] [data-range]', (ranges) => ranges.map((range) => range.textContent))).toEqual(['lines 1-96']);
    expect(await page.$eval('[data-diff-sheet] [data-diff-note]', (note) => note.textContent)).toContain("the hunks' line ranges alone");
    expect(await page.$$('[data-diff-sheet] [data-editor]')).toHaveLength(0);
    expect(await page.getAttribute('[data-diff-sheet] [data-pr]', 'href')).toBe('https://github.com/o/r/pull/4');
    // The plate it cross-faded from has faded out under it.
    expect(await page.$eval('[data-file-plate]', (plate) => plate instanceof SVGElement && (plate.style.display === 'none' || Number(plate.style.opacity) === 0))).toBe(true);

    // Served with the token: the diff `/diff/<path>` answers, its hunk's head and the sheet's head linked to the file in the editor.
    await page.goto(`${url}/?token=t0&${framed}`);
    await page.waitForSelector('[data-diff-sheet] [data-diff-row="added"]', { timeout: 90_000 });
    expect(await page.$$eval('[data-diff-sheet] [data-diff-row]', (rows) => rows.map((row) => [row.getAttribute('data-diff-row'), row.getAttribute('data-line')]))).toEqual([
      ['hunk', '1'],
      ['added', '1'],
      ['added', '2'],
    ]);
    expect(await page.getAttribute('[data-diff-sheet] [data-diff-row="hunk"]', 'href')).toBe(`vscode://file/work/demo/${path}:1`);
    expect(await page.getAttribute('[data-diff-sheet] [data-editor]', 'href')).toBe(`vscode://file/work/demo/${path}:1`);
    expect(await page.getAttribute('[data-diff-sheet] [data-pr]', 'href')).toBe('https://github.com/o/r/pull/4');
    expect(complaints).toEqual([]);
  } finally {
    await browser.close();
    await server.close();
  }
});

test('opened watching, a pushed map on the ground drawn cross-fades its weather in without a reload, and one on other ground is drawn afresh where the reader stood, with a clean console (D106)', { timeout: 120_000 }, async () => {
  const text = readFileSync(DEMO, 'utf8');
  const demo = JSON.parse(text) as { meta: { generated_at: string; head: string }; notices: unknown[]; terrain: { layout: { positions: Record<string, { x: number; y: number }> } } };
  const { server, url } = await serve(text);
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
    const complaints: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') complaints.push(`${message.type()}: ${message.text()}`);
    });
    page.on('pageerror', (error) => complaints.push(`pageerror: ${error.message}`));
    // The browser stands in for the server's socket: it hears each connection, and the test says what it pushes.
    const sockets: { send: (message: string) => void }[] = [];
    await page.routeWebSocket(/\/watch\?token=watched$/, (socket) => {
      sockets.push(socket);
      // As the server does, the map held is sent as the page connects: the one the page drew, so it is dropped.
      if (sockets.length === 1) socket.send(JSON.stringify({ kind: 'map', map: demo }));
    });

    await page.goto(`${url}/?backend=webgl&zoom=2&token=watched&watch=1`);
    await page.waitForSelector('#world[data-world="settled"]', { timeout: 90_000 });
    await expect.poll(() => sockets.length).toBe(1);
    expect(await page.$$eval('[data-labels] [data-mark]', (elements) => elements.length)).toBe(6);
    await page.evaluate(() => {
      document.body.dataset['before'] = 'push';
    });

    // A later commit on the same ground: its three notices take the place of the six, and the page never reloads.
    const later = { ...demo, meta: { ...demo.meta, head: 'f'.repeat(40), generated_at: '2026-10-27T09:00:00.000Z' }, notices: demo.notices.slice(0, 3) };
    sockets[0]?.send(JSON.stringify({ kind: 'map', map: later }));
    await page.waitForSelector('#world[data-pushed="1"]', { timeout: 30_000 });
    await expect.poll(() => page.$$eval('[data-labels] [data-mark]', (elements) => elements.length), { timeout: 30_000 }).toBe(3);
    expect(await page.evaluate(() => document.body.dataset['before'])).toBe('push');
    expect(await page.getAttribute('#world', 'data-world')).toBe('settled');

    // A commit that moves a file is other ground: the page is drawn afresh at the zoom and the tilt the reader stood at.
    const [first] = Object.keys(demo.terrain.layout.positions);
    const moved = first === undefined ? undefined : demo.terrain.layout.positions[first];
    if (first === undefined || moved === undefined) throw new Error('the demo places no file');
    const elsewhere = { ...later, meta: { ...later.meta, generated_at: '2026-10-27T09:05:00.000Z' }, terrain: { ...demo.terrain, layout: { ...demo.terrain.layout, positions: { ...demo.terrain.layout.positions, [first]: { ...moved, x: moved.x + 1 } } } } };
    sockets[0]?.send(JSON.stringify({ kind: 'map', map: elsewhere }));
    await page.waitForURL(/centre=/, { timeout: 30_000 });
    const framed = new URL(page.url()).searchParams;
    expect(Number(framed.get('zoom'))).toBeCloseTo(2, 3);
    expect(framed.get('tilt')).toBe('0');
    expect(framed.get('token')).toBe('watched');
    expect(framed.get('watch')).toBe('1');
    await page.waitForSelector('#world[data-world="settled"]', { timeout: 90_000 });
    expect(await page.evaluate(() => document.body.dataset['before'])).toBeUndefined();
    expect(complaints).toEqual([]);
  } finally {
    await browser.close();
    await server.close();
  }
});

test("as a still for a pull request's comment, the world draws no chrome and stands at the surface on the change, never the planet, opening no slide, with a clean console (D108)", { timeout: 120_000 }, async () => {
  const { server, url } = await serve();
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
    const complaints: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') complaints.push(`${message.type()}: ${message.text()}`);
    });
    page.on('pageerror', (error) => complaints.push(`pageerror: ${error.message}`));

    await page.goto(`${url}/?backend=webgl&cinema=1&time=0`);
    await page.waitForSelector('#world[data-ready="true"]', { timeout: 90_000 });
    expect(await page.evaluate(() => document.querySelector<HTMLElement>('#chrome')?.style.display)).toBe('none');
    expect(await page.getAttribute('#world', 'data-lod')).toBe('1');
    expect(await page.getAttribute('#world', 'data-planet')).toBe('off');
    expect(await page.getAttribute('#world', 'data-open')).toBeNull();
    // The notices' numbered boxes are the world's, not the chrome's, so the comment's list still points into the still.
    expect(await page.$$eval('[data-labels] [data-mark]', (elements) => elements.length)).toBe(6);
    expect(complaints).toEqual([]);
  } finally {
    await browser.close();
    await server.close();
  }
});
