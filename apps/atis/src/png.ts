/**
 * png: the world captured headless as a PNG (D105), the same render as the
 * tab (§15's R5). The CLI serves the world on loopback as it always does, and
 * this drives a headless browser to it through `playwright-core`, which
 * downloads none (D145): the installed Chrome, else a Chromium on the PATH,
 * else the one `npx playwright-core install chromium` puts in Playwright's
 * own cache, the one install a machine with none is told to run. The page
 * opens at a fixed viewport, one pixel a point, with reduced motion on and
 * the scheduler's clock frozen at a set time (`?time=`), so one map, machine
 * and backend give one image (C3, D94). It waits for the ready flag the world
 * raises once its first complete frame is on the screen, and two frames more
 * so the chrome has drawn what that frame told it, then takes the screenshot.
 */

import { accessSync, constants } from 'node:fs';
import { delimiter, join } from 'node:path';

import { chromium } from 'playwright-core';
import type { Browser } from 'playwright-core';

/** The frame a capture takes (D105): its viewport in points at one pixel a point, the time the scheduler is frozen at, and how long the world has to draw it. */
export const CAPTURE = { width: 1280, height: 800, time: 0, timeout_ms: 60_000 } as const;

/** The one command that gives a machine with no Chrome and no Chromium a browser to capture with. */
export const INSTALL = 'npx playwright-core install chromium';

/** A browser to try, by the name a failure would give it. */
export type BrowserCandidate = { readonly name: string; readonly launch: () => Promise<Browser> };

/** The names a Chromium goes by on a PATH, tried in order. */
const CHROMIUM_NAMES = ['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable', 'chrome'];

/** Whether a file is there to be run. */
const runnable = (file: string): boolean => {
  try {
    accessSync(file, constants.X_OK);
    return true;
  } catch {
    return false;
  }
};

/** Every Chromium on `path`, by directory and then by name, each once. */
const chromiumsOn = (path: string): readonly string[] => [
  ...new Set(
    path
      .split(delimiter)
      .filter((dir) => dir !== '')
      .flatMap((dir) => CHROMIUM_NAMES.map((name) => join(dir, name)))
      .filter(runnable),
  ),
];

/** The browsers a capture tries, in order (D145): the installed Chrome, each Chromium on `path`, and Playwright's own. */
export const installedBrowsers = (path: string = process.env['PATH'] ?? ''): readonly BrowserCandidate[] => [
  { name: 'Google Chrome', launch: () => chromium.launch({ channel: 'chrome', headless: true }) },
  ...chromiumsOn(path).map((file) => ({ name: file, launch: () => chromium.launch({ executablePath: file, headless: true }) })),
  { name: "Playwright's Chromium", launch: () => chromium.launch({ headless: true }) },
];

/** The first of `candidates` that launches; with none, a failure naming the one install, which the CLI exits 2 on (C4). */
export const launchBrowser = async (candidates: readonly BrowserCandidate[] = installedBrowsers()): Promise<Browser> => {
  const launched = await candidates.reduce<Promise<Browser | undefined>>(
    (prior, candidate) => prior.then((found) => found ?? candidate.launch().catch(() => undefined)),
    Promise.resolve(undefined),
  );
  if (launched !== undefined) return launched;
  throw new Error(`--png found no browser to capture with: install Google Chrome, put a Chromium on the PATH, or run \`${INSTALL}\``);
};

/** A capture: the PNG's bytes, and the backend that drew the world, since one image holds only for one machine and backend. */
export type Captured = { readonly png: Buffer; readonly backend: string | undefined };

/** Two frames, the first so the chrome renders what the ready frame told it, the second so it is on the screen; a string, since this package's types know no DOM. */
const TWO_FRAMES = 'new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(true))))';

/**
 * Open the served world at `url` in `browser` at the capture's frame and take
 * it, once its ready flag is up (D105): the tab as it opens, or, for a pull
 * request's comment, a cinema still, the world alone framed on what the
 * change is about (`?cinema`, D108).
 */
export const capturePng = async (browser: Browser, url: string, { cinema = false }: { readonly cinema?: boolean } = {}): Promise<Captured> => {
  const context = await browser.newContext({ viewport: { width: CAPTURE.width, height: CAPTURE.height }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  try {
    const page = await context.newPage();
    const faults: string[] = [];
    page.on('pageerror', (error) => faults.push(error.message));
    const frozen = new URL(url);
    frozen.searchParams.set('time', String(CAPTURE.time));
    if (cinema) frozen.searchParams.set('cinema', '1');
    await page.goto(frozen.href);
    try {
      await page.waitForSelector('#world[data-ready="true"]', { state: 'attached', timeout: CAPTURE.timeout_ms });
    } catch (error) {
      const fault = faults[0] === undefined ? '' : `: ${faults[0]}`;
      throw new Error(`the world drew no complete frame within ${String(CAPTURE.timeout_ms / 1000)} s${fault}`, { cause: error });
    }
    await page.evaluate(TWO_FRAMES);
    const backend = (await page.getAttribute('#world', 'data-backend')) ?? undefined;
    return { png: await page.screenshot({ type: 'png', animations: 'disabled', caret: 'hide' }), backend };
  } finally {
    await context.close();
  }
};
