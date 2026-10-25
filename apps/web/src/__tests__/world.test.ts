/**
 * The world's smoke test (D132): the gate's one eye on the GPU code the
 * coverage thresholds leave out. It serves the app from Vite in-process with
 * the demo map, never from a shared `dist/`, opens it headless on the WebGL 2
 * path in the installed Chrome, else a Chromium on the PATH (D145), and fails
 * on a console error or a blank frame. It looks at the lit surface, past
 * LOD1's gate, since the far field is dark by design until the weather lights
 * it (D151). A second frame opens on one cell where it fills the screen, and
 * the cell opens as a stained slide (step 40, D165): the canvas names the
 * open cell, the slide tags each of its files, a click on a floating file
 * keeps it open, `x` spreads the exploded view, and `w` lays the cell's wiring
 * out on a plate in the chrome (step 41); Esc closes it, the surface holds its
 * files where they floated, and zooming out toward the field brings them
 * home. Framed on a package, the world opens it on its modules, the file of
 * the single-file cell it holds tagged beside its barrel (D167), and there the
 * legend, closed at load, opens from the HUD's `key` block and folds away on
 * Esc while the cell stays open (D166). A fourth
 * emulates `prefers-reduced-motion` and holds the frames still after load, in
 * an opened cell and across a fly-to, beside a page with motion on whose
 * frames move (step 42).
 */

import { accessSync, constants, readFileSync } from 'node:fs';
import { delimiter, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright-core';
import type { Browser, Page } from 'playwright-core';
import { createServer } from 'vite';
import type { Plugin, ViteDevServer } from 'vite';
import { expect, test } from 'vitest';

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

/** The app on loopback from its sources, on a port the system picks. */
const serve = async (): Promise<{ readonly server: ViteDevServer; readonly url: string }> => {
  const server = await createServer({
    root: WEB,
    configFile: join(WEB, 'vite.config.ts'),
    logLevel: 'silent',
    clearScreen: false,
    server: { host: '127.0.0.1', port: 0, strictPort: false, open: false, hmr: false },
    plugins: [serveMap(readFileSync(DEMO, 'utf8'))],
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

    expect(complaints).toEqual([]);
    // A blank frame is the field alone: nothing clear of it, in one shade. The lit skin covers the frame in hundreds.
    expect(reading.lit / reading.pixels).toBeGreaterThan(0.2);
    expect(reading.shades).toBeGreaterThan(64);
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
    // The slide tags every file the layout placed in the cell, each with its rule count, and writes the barrel's exports on the membrane.
    await page.waitForSelector('[data-interior-tag]', { timeout: 30_000 });
    const tags = await page.$$eval('[data-interior-tag]', (elements) => elements.map((element) => element.textContent));
    expect(tags.toSorted()).toEqual(['+tools.ts · 2', 'index.ts', 'legacy.ts', 'slots.ts']);
    expect(await page.textContent('[data-interior-exports]')).toBe('index.ts · 3 exports\nlistSlots  resolveSlot  resolveTool');
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
    await page.mouse.click(onBody[0], onBody[1]);
    await page.waitForTimeout(500);
    expect(await page.getAttribute('#world', 'data-open')).toBe(cell);
    expect(await page.$$eval('[data-interior-tag]', (elements) => elements.length)).toBe(4);
    expect(await page.textContent('[data-explode]')).toBe('explode');
    // The exploded view spreads on x, and the breadcrumb's button reads so.
    await page.keyboard.press('x');
    await page.waitForSelector('#world[data-exploded="on"]', { timeout: 30_000 });
    expect(await page.textContent('[data-explode]')).toBe('gather');
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
  await page.waitForSelector('[data-interior-tag]', { timeout: 30_000 });
  return { page, complaints };
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
    const { page, complaints } = await openedOn(browser, url, cell, 'reduce');
    expect(await page.getAttribute('#world', 'data-motion')).toBe('reduced');
    const [still, later] = await twoFrames(page, 1500);
    expect(still.equals(later)).toBe(true);
    // A fly-to cuts: a frame just after the notice's row is clicked is already where the view lands, and the landing
    // does not swing. The world's own frame is judged, the layers over it hidden, since Chrome sharpens the text of a
    // tag that has just moved a moment after it stops, which is the browser's raster and no motion of the world's.
    await page.click('[data-notices] [data-notice="1"]');
    await page.evaluate(() => {
      for (const element of document.body.children) if (element instanceof HTMLElement && element.id !== 'world') element.style.visibility = 'hidden';
    });
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
