/**
 * budget: measure the world against its budget (C14, D150) on step 43's
 * seeded 5,000-file map: the first complete frame after the map arrives, on
 * WebGPU and on the WebGL 2 fallback, and the frame rate through ten seconds
 * of idle and a zoom sweep from the far field to the cell's level; and, on a
 * page opened at the surface (LOD1, `?zoom=4`), ten seconds held still and
 * five under a pointer crossing it, where past 5,000 files the packages stand
 * as composites (step 66).
 *
 * It builds the app as atis serves it, serves the map beside it on loopback,
 * and drives Google Chrome headed, since headless Chrome has no WebGPU here
 * and paces its frames by no display. Run it on the laptop the budget names,
 * the window in front and the machine otherwise quiet:
 *
 *   pnpm exec tsc --build && node apps/web/scripts/budget.ts [files] [seed]
 *
 * The first frame is the page's `atis:ready` mark, raised once the first
 * complete frame is on the screen, less the moment the map's bytes arrived,
 * its resource timing's `responseEnd`. A frame rate is read from the page's
 * own animation frames. Core takes minutes to lay a 5,000-file map out, so
 * the map is kept in the system's temporary directory after its first run.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { cpus, platform, release, tmpdir, totalmem } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright-core';
import type { Browser, Page } from 'playwright-core';
import { build, preview } from 'vite';
import type { Plugin } from 'vite';

import { syntheticMap } from '../../../libs/scene/dist/index.js';

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = join(WEB, 'vite.config.ts');
const VIEWPORT = { width: 1440, height: 900 } as const;
/** How long the idle reading lasts, and the most a sweep may take before it is called short. */
const IDLE_MS = 10_000;
const SWEEP_MS = 15_000;
/** A wheel step and the pause between steps: about a notch of a mouse wheel, eighteen to the second. */
const WHEEL_STEP = -60;
const WHEEL_PAUSE_MS = 55;
/** The level the sweep zooms to: §6's cell. */
const SWEEP_TO = 2;
/** The zoom over the fit the surface is read at: inside LOD1, a few packages across the screen. */
const SURFACE_ZOOM = 4;
/** How long the pointer crosses the surface. */
const CROSS_MS = 5_000;
/** The longest frame 60 fps allows, with a millisecond of a display's jitter. */
const HELD_MS = 1000 / 60 + 1;

const files = Number(process.argv[2] ?? 5000);
const seed = Number(process.argv[3] ?? 1);

/** The map, made once and kept: core's layout is the slow part, and it is no part of the world's budget. */
const mapText = (): string => {
  const kept = join(tmpdir(), `atis-synthetic-${String(files)}-${String(seed)}.json`);
  if (existsSync(kept)) {
    process.stdout.write(`map: ${kept} (kept from an earlier run)\n`);
    return readFileSync(kept, 'utf8');
  }
  process.stdout.write(`map: laying out ${String(files)} files with seed ${String(seed)}; core takes minutes at this size\n`);
  const started = performance.now();
  const text = JSON.stringify(syntheticMap({ files, seed }));
  writeFileSync(kept, text);
  process.stdout.write(`map: ${String(Math.round((performance.now() - started) / 1000))} s to make, ${(text.length / 1e6).toFixed(1)} MB, kept at ${kept}\n`);
  return text;
};

/** Serve the map at `/map.json`, where the app looks when the page names none (D93). */
const serveMap = (body: string): Plugin => ({
  name: 'atis-budget-map',
  configurePreviewServer(server) {
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

/** A frame as the page kept it: how long it took, in milliseconds, and the level of detail the canvas was at when it ended. */
type Frame = { readonly ms: number; readonly lod: string };

/**
 * The frames the page's own animation frames keep: for `ms`, or, given a
 * level, until half a second after the canvas reaches it, or `ms` at most.
 */
const sample = (page: Page, until: { readonly ms: number; readonly lod?: number }): Promise<readonly Frame[]> =>
  page.evaluate(
    ({ ms, lod }) =>
      new Promise<Frame[]>((resolve) => {
        const frames: Frame[] = [];
        let start: number | undefined;
        let last: number | undefined;
        let reached: number | undefined;
        const tick = (time: number): void => {
          const at = document.querySelector<HTMLElement>('#world')?.dataset['lod'] ?? '?';
          if (last !== undefined) frames.push({ ms: time - last, lod: at });
          start ??= time;
          last = time;
          if (lod !== undefined && reached === undefined && Number(at) >= lod) reached = time;
          if (time - start >= ms || (reached !== undefined && time - reached >= 500)) resolve(frames);
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    until,
  );

/** Zoom in a wheel step at a time until the canvas reaches the sweep's level, or the sweep runs out of time. */
const wheelIn = async (page: Page, until: number): Promise<void> => {
  if (Date.now() >= until || Number((await page.getAttribute('#world', 'data-lod')) ?? 0) >= SWEEP_TO) return;
  await page.mouse.wheel(0, WHEEL_STEP);
  await page.waitForTimeout(WHEEL_PAUSE_MS);
  await wheelIn(page, until);
};

/** Cross the screen left of the rail with the pointer, a step about a frame apart, until `until`. */
const crossing = async (page: Page, until: number, step = 0): Promise<void> => {
  if (Date.now() >= until) return;
  const share = (step % 120) / 120;
  await page.mouse.move(80 + share * (VIEWPORT.width - 460), VIEWPORT.height / 2 + 200 * Math.sin(share * 2 * Math.PI));
  await page.waitForTimeout(16);
  await crossing(page, until, step + 1);
};

/** A reading's rate: frames a second, the median, 95th-percentile and worst frame, and every frame over 60 fps's, with the level it ended at. */
type Rate = { readonly fps: number; readonly median: number; readonly p95: number; readonly worst: number; readonly over: readonly Frame[]; readonly frames: number };

const rateOf = (frames: readonly Frame[]): Rate => {
  const sorted = frames.map((frame) => frame.ms).toSorted((a, b) => a - b);
  const at = (share: number): number => sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))] ?? 0;
  const total = sorted.reduce((sum, each) => sum + each, 0);
  return { fps: total === 0 ? 0 : (frames.length * 1000) / total, median: at(0.5), p95: at(0.95), worst: sorted.at(-1) ?? 0, over: frames.filter((frame) => frame.ms > HELD_MS), frames: frames.length };
};

type Reading = {
  readonly asked: string;
  readonly drawn: string;
  readonly firstFrame: number;
  readonly idle: Rate;
  readonly sweep: Rate;
  readonly reached: number;
  readonly surface: Rate;
  readonly hover: Rate;
  readonly composites: string;
};

/** One backend's reading, in a window of its own. */
const read = async (browser: Browser, url: string, backend: 'webgpu' | 'webgl'): Promise<Reading> => {
  const page = await browser.newPage({ viewport: VIEWPORT });
  try {
    await page.goto(`${url}/${backend === 'webgl' ? '?backend=webgl' : ''}`);
    await page.waitForSelector('#world[data-ready="true"]', { timeout: 180_000 });
    const drawn = (await page.getAttribute('#world', 'data-backend')) ?? 'unknown';
    const firstFrame = await page.evaluate(() => {
      const ready = performance.getEntriesByName('atis:ready')[0];
      const map = performance.getEntriesByType('resource').find((entry) => entry.name.split('?')[0]?.endsWith('/map.json'));
      return ready === undefined || !(map instanceof PerformanceResourceTiming) ? Number.NaN : ready.startTime - map.responseEnd;
    });
    await page.waitForSelector('#world[data-world="settled"]', { timeout: 30_000 });
    const idle = rateOf(await sample(page, { ms: IDLE_MS }));
    // The sweep zooms in toward the middle of the screen left of the rail, a wheel step at a time, until the cell's level.
    await page.mouse.move(VIEWPORT.width / 2 - 150, VIEWPORT.height / 2);
    const [frames] = await Promise.all([sample(page, { ms: SWEEP_MS, lod: SWEEP_TO }), wheelIn(page, Date.now() + SWEEP_MS)]);
    const sweep = rateOf(frames);
    const reached = Number((await page.getAttribute('#world', 'data-lod')) ?? 0);
    return { asked: backend, drawn, firstFrame, idle, sweep, reached, ...(await readSurface(browser, url, backend)) };
  } finally {
    await page.close();
  }
};

/** The surface's reading, on a page of its own opened at the surface: held still, then crossed by the pointer, and how many composites stand closed. */
const readSurface = async (browser: Browser, url: string, backend: 'webgpu' | 'webgl'): Promise<Pick<Reading, 'surface' | 'hover' | 'composites'>> => {
  const page = await browser.newPage({ viewport: VIEWPORT });
  try {
    await page.goto(`${url}/?zoom=${String(SURFACE_ZOOM)}${backend === 'webgl' ? '&backend=webgl' : ''}`);
    await page.waitForSelector('#world[data-world="settled"]', { timeout: 180_000 });
    await page.waitForTimeout(1000);
    const surface = rateOf(await sample(page, { ms: IDLE_MS }));
    const composites = (await page.getAttribute('#world', 'data-composites')) ?? 'none';
    const [crossed] = await Promise.all([sample(page, { ms: CROSS_MS }), crossing(page, Date.now() + CROSS_MS)]);
    return { surface, hover: rateOf(crossed), composites };
  } finally {
    await page.close();
  }
};

const ms = (value: number): string => `${value.toFixed(1)} ms`;
const rate = (value: Rate): string =>
  `${value.fps.toFixed(1)} fps, median ${ms(value.median)}, p95 ${ms(value.p95)}, worst ${ms(value.worst)}, ${String(value.over.length)} of ${String(value.frames)} over ${ms(HELD_MS)}${value.over.length === 0 ? '' : ` (${value.over.map((frame) => `${ms(frame.ms)} at LOD${frame.lod}`).join(', ')})`}`;

const body = mapText();
await build({ root: WEB, configFile: CONFIG, logLevel: 'warn' });
const server = await preview({ root: WEB, configFile: CONFIG, logLevel: 'warn', preview: { host: '127.0.0.1', port: 0, strictPort: false, open: false }, plugins: [serveMap(body)] });
const address = server.httpServer.address();
if (address === null || typeof address === 'string') throw new Error('vite preview did not bind a loopback port');
const browser = await chromium.launch({ channel: 'chrome', headless: false });
try {
  const readings = [await read(browser, `http://127.0.0.1:${String(address.port)}`, 'webgpu'), await read(browser, `http://127.0.0.1:${String(address.port)}`, 'webgl')];
  process.stdout.write(`\n${String(files)} files, seed ${String(seed)}, ${VIEWPORT.width}x${VIEWPORT.height}; ${cpus()[0]?.model ?? 'unknown cpu'}, ${String(Math.round(totalmem() / 2 ** 30))} GB, ${platform()} ${release()}; Chrome ${browser.version()}\n`);
  for (const reading of readings) {
    process.stdout.write(`\n${reading.asked} (drew on ${reading.drawn})\n`);
    process.stdout.write(`  first frame  ${ms(reading.firstFrame)} after the map arrived\n`);
    process.stdout.write(`  idle         ${rate(reading.idle)}\n`);
    process.stdout.write(`  sweep        ${rate(reading.sweep)}, reached LOD${String(reading.reached)}\n`);
    process.stdout.write(`  surface      ${rate(reading.surface)}; composites ${reading.composites}\n`);
    process.stdout.write(`  hover        ${rate(reading.hover)}\n`);
  }
} finally {
  await browser.close();
  await server.close();
}
