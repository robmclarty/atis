/**
 * browser: what the world's browser tests share (D132). The app served from
 * Vite in-process with a map, never from a shared `dist/`, and the installed
 * Chrome launched headless, else a Chromium on the PATH (D145).
 */

import { accessSync, constants, readFileSync } from 'node:fs';
import { delimiter, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright-core';
import type { Browser } from 'playwright-core';
import { createServer } from 'vite';
import type { Plugin, ViteDevServer } from 'vite';

const HERE = dirname(fileURLToPath(import.meta.url));

/** The web app's package, which Vite serves from its sources. */
export const WEB = join(HERE, '..', '..');

/** The demo map, which a page is served unless it is handed another. */
export const DEMO = join(WEB, '..', '..', 'libs', 'core', 'fixtures', 'demo', 'map.json');

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
export const launch = async (): Promise<Browser> => {
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
export const serveDiff = (path: string, token: string, body: string): Plugin => ({
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
export const serve = async (body: string = readFileSync(DEMO, 'utf8'), served: readonly Plugin[] = []): Promise<{ readonly server: ViteDevServer; readonly url: string }> => {
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
