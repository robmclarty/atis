/**
 * The world's smoke test (D132): the gate's one eye on the GPU code the
 * coverage thresholds leave out. It serves the app from Vite in-process with
 * the demo map, never from a shared `dist/`, opens it headless on the WebGL 2
 * path in the installed Chrome, else a Chromium on the PATH (D145), and fails
 * on a console error or a blank frame. It looks at the lit surface, past
 * LOD1's gate, since the far field is dark by design until the weather lights
 * it (D151).
 */

import { accessSync, constants, readFileSync } from 'node:fs';
import { delimiter, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright-core';
import type { Browser } from 'playwright-core';
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
