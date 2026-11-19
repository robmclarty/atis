/**
 * budget: measure the world against its budget (C14, D150) on step 43's
 * seeded 5,000-file map: the first complete frame after the map arrives, on
 * WebGPU and on the WebGL 2 fallback, and the frame rate through ten seconds
 * of idle and a zoom sweep from the far field to the cell's level; and, on a
 * page opened at the surface (LOD1, `?zoom=4`), ten seconds held still and
 * five under a pointer crossing it, where past 5,000 files the packages stand
 * as composites (step 66).
 *
 * It measures the surface's two movers with them (C14): the membranes'
 * ripple (D195) and the ribbons' sway (Q84). The seeded repo wires every
 * import across packages onto a barrel, so its own map draws no ribbon and
 * nothing on it sways; the change is therefore given a few stray imports
 * past another package's barrels (`STRAYS`), which core finds as it finds
 * any, so the map has ribbons that sway and package membranes that ripple
 * beside its folders'. Each backend is then read twice, on that map and on
 * the same map with nothing for the two to move, so what the movers cost is
 * read beside what they are measured against.
 *
 * It builds the app as atis serves it, serves the map beside it on loopback,
 * and drives Google Chrome headed, since headless Chrome has no WebGPU here
 * and paces its frames by no display. Run it on the laptop the budget names,
 * the window in front and the machine otherwise quiet:
 *
 *   pnpm exec tsc --build && node apps/web/scripts/budget.ts [files] [seed]
 *
 * It prints how many cells the map ripples and how many ribbons it sways,
 * then four readings: each backend with the movers on, then off.
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

import { assertMap, buildMap } from '../../../libs/core/dist/index.js';
import type { BuildInputs, MapJson, NamedEdge } from '../../../libs/core/dist/index.js';
import { seeded, syntheticInputs, weatherOf, wobbleOf } from '../../../libs/scene/dist/index.js';

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

/**
 * How many imports the change adds past another package's barrels, so the
 * map has ribbons to sway: a pull request's worth of strays and then some,
 * where `corpus-7`, the committed fixture with the most, has two.
 */
const STRAYS = 24;
/** Where the page finds the map with nothing for the movers to move, beside `/map.json`. */
const STILL_PATH = '/still.json';

const files = Number(process.argv[2] ?? 5000);
const seed = Number(process.argv[3] ?? 1);

const byPath = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** A package's place in the seeded repo, from its folder's name: a package imports only the packages before it. */
const packageAt = (path: string): number => Number(/^packages\/[a-z]+-(\d+)\//.exec(path)?.[1] ?? Number.NaN);

/**
 * The seeded repo's inputs with the strays added to its head: each from a
 * file of one package to a file inside a folder of a package before it, past
 * that folder's barrel and its package's. The head gains them and the base
 * has none, so core reads each as an import the change introduced, and since
 * every import across packages already runs that way the graph gains no
 * cycle. Drawn from the seed, so one size and one seed still give one map.
 */
const strayed = (): BuildInputs => {
  const inputs = syntheticInputs({ files, seed });
  const chance = seeded(seed);
  const pick = <T>(items: readonly T[]): T | undefined => items[Math.floor(chance() * items.length)];
  const sources = inputs.head.files.filter((file) => file.kind === 'source' && !Number.isNaN(packageAt(file.path)));
  const fronted = new Set(sources.filter((file) => file.barrel === true).map((file) => dirname(file.path)));
  const inside = sources.filter((file) => file.barrel !== true && fronted.has(dirname(file.path)) && !dirname(file.path).endsWith('/src'));
  const had = new Set(inputs.head.edges.map((edge) => `${edge.from}\n${edge.to}`));
  const strays: NamedEdge[] = [];
  for (let tries = 0; strays.length < STRAYS && tries < STRAYS * 20; tries += 1) {
    const to = pick(inside);
    const from = to === undefined ? undefined : pick(sources.filter((file) => packageAt(file.path) > packageAt(to.path)));
    if (to === undefined || from === undefined || had.has(`${from.path}\n${to.path}`)) continue;
    had.add(`${from.path}\n${to.path}`);
    strays.push({ from: from.path, to: to.path, names: to.exports.slice(0, 1) });
  }
  const edges = [...inputs.head.edges, ...strays].toSorted((a, b) => byPath(a.from, b.from) || byPath(a.to, b.to));
  return { ...inputs, head: { ...inputs.head, edges } };
};

/** What a map gives the surface's two movers to move: the cells whose membranes ripple, and the ribbons, with how many of them sway. */
type Movers = { readonly cells: number; readonly ripple: number; readonly ribbons: number; readonly sway: number };

const moversOf = (map: MapJson): Movers => {
  const ribbons = weatherOf(map).edges;
  return { cells: map.terrain.cells.length, ripple: map.terrain.cells.filter((cell) => wobbleOf(cell) > 0).length, ribbons: ribbons.length, sway: ribbons.filter((edge) => edge.sway).length };
};

/**
 * The same map with nothing for the two movers to move: no cell carries
 * `integrity`, so no membrane ripples and the skin lays no ripple grid, and
 * no exceptional edge is drawn, so no ribbon sways. It is what the movers'
 * reading is set beside.
 */
const stilled = (map: MapJson): MapJson => ({
  ...map,
  terrain: {
    ...map.terrain,
    cells: map.terrain.cells.map((cell) => {
      const { integrity, ...rest } = cell;
      return integrity === undefined ? cell : rest;
    }),
    edges_exceptional: [],
  },
});

/**
 * The map, made once and kept: core's layout is the slow part, and it is no
 * part of the world's budget. A kept map that ripples or sways nothing was
 * made by a core older than the readings they move by, and is made again.
 */
const madeMap = (): MapJson => {
  const kept = join(tmpdir(), `atis-synthetic-${String(files)}-${String(seed)}-${String(STRAYS)}.json`);
  if (existsSync(kept)) {
    const map = assertMap(JSON.parse(readFileSync(kept, 'utf8')));
    const movers = moversOf(map);
    if (movers.ripple > 0 && movers.sway > 0) {
      process.stdout.write(`map: ${kept} (kept from an earlier run)\n`);
      return map;
    }
    process.stdout.write(`map: ${kept} ripples ${String(movers.ripple)} cells and sways ${String(movers.sway)} ribbons, so it is made again\n`);
  }
  process.stdout.write(`map: laying out ${String(files)} files with seed ${String(seed)} and ${String(STRAYS)} strays; core takes minutes at this size\n`);
  const started = performance.now();
  const map = buildMap(strayed());
  const text = JSON.stringify(map);
  writeFileSync(kept, text);
  process.stdout.write(`map: ${String(Math.round((performance.now() - started) / 1000))} s to make, ${(text.length / 1e6).toFixed(1)} MB, kept at ${kept}\n`);
  return map;
};

/** Serve the movers' map at `/map.json`, where the app looks when the page names none (D93), and the stilled one beside it. */
const serveMaps = (moving: string, still: string): Plugin => ({
  name: 'atis-budget-map',
  configurePreviewServer(server) {
    server.middlewares.use((request, response, next) => {
      const path = request.url?.split('?')[0];
      if (path !== '/map.json' && path !== STILL_PATH) {
        next();
        return;
      }
      response.setHeader('content-type', 'application/json');
      response.end(path === STILL_PATH ? still : moving);
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
  /** Whether the page was served the movers' map or the stilled one. */
  readonly movers: 'on' | 'off';
  readonly drawn: string;
  /** The page's own word for its motion: `full`, or `reduced` where nothing this script measures would move. */
  readonly motion: string;
  readonly firstFrame: number;
  readonly idle: Rate;
  readonly sweep: Rate;
  readonly reached: number;
  readonly surface: Rate;
  readonly hover: Rate;
  readonly composites: string;
};

/** The page's query for a backend and a map: none for WebGPU on the movers' map, which is the page as atis serves it. */
const queryOf = (backend: 'webgpu' | 'webgl', movers: 'on' | 'off', zoom?: number): string => {
  const params = new URLSearchParams();
  if (zoom !== undefined) params.set('zoom', String(zoom));
  if (backend === 'webgl') params.set('backend', 'webgl');
  if (movers === 'off') params.set('map', STILL_PATH);
  const query = params.toString();
  return query === '' ? '' : `?${query}`;
};

/** A page with its motion on, whatever the machine's own setting: under reduced motion nothing this script measures would move (C12). */
const openPage = (browser: Browser): Promise<Page> => browser.newPage({ viewport: VIEWPORT, reducedMotion: 'no-preference' });

/** One backend's reading on one of the two maps, in a window of its own. */
const read = async (browser: Browser, url: string, backend: 'webgpu' | 'webgl', movers: 'on' | 'off'): Promise<Reading> => {
  const page = await openPage(browser);
  try {
    await page.goto(`${url}/${queryOf(backend, movers)}`);
    await page.waitForSelector('#world[data-ready="true"]', { timeout: 180_000 });
    const drawn = (await page.getAttribute('#world', 'data-backend')) ?? 'unknown';
    const motion = (await page.getAttribute('#world', 'data-motion')) ?? 'unknown';
    const firstFrame = await page.evaluate((served) => {
      const ready = performance.getEntriesByName('atis:ready')[0];
      const map = performance.getEntriesByType('resource').find((entry) => entry.name.split('?')[0]?.endsWith(served));
      return ready === undefined || !(map instanceof PerformanceResourceTiming) ? Number.NaN : ready.startTime - map.responseEnd;
    }, movers === 'off' ? STILL_PATH : '/map.json');
    await page.waitForSelector('#world[data-world="settled"]', { timeout: 30_000 });
    const idle = rateOf(await sample(page, { ms: IDLE_MS }));
    // The sweep zooms in toward the middle of the screen left of the rail, a wheel step at a time, until the cell's level.
    await page.mouse.move(VIEWPORT.width / 2 - 150, VIEWPORT.height / 2);
    const [frames] = await Promise.all([sample(page, { ms: SWEEP_MS, lod: SWEEP_TO }), wheelIn(page, Date.now() + SWEEP_MS)]);
    const sweep = rateOf(frames);
    const reached = Number((await page.getAttribute('#world', 'data-lod')) ?? 0);
    return { asked: backend, movers, drawn, motion, firstFrame, idle, sweep, reached, ...(await readSurface(browser, url, backend, movers)) };
  } finally {
    await page.close();
  }
};

/** The surface's reading, on a page of its own opened at the surface: held still, then crossed by the pointer, and how many composites stand closed. */
const readSurface = async (browser: Browser, url: string, backend: 'webgpu' | 'webgl', movers: 'on' | 'off'): Promise<Pick<Reading, 'surface' | 'hover' | 'composites'>> => {
  const page = await openPage(browser);
  try {
    await page.goto(`${url}/${queryOf(backend, movers, SURFACE_ZOOM)}`);
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

const map = madeMap();
const movers = moversOf(map);
process.stdout.write(`map: ${String(movers.ripple)} of ${String(movers.cells)} cells ripple, and ${String(movers.sway)} of ${String(movers.ribbons)} ribbons sway\n`);
if (movers.ripple === 0) process.stdout.write('map: no cell on this map is entered past its barrel, so the ripple is not measured\n');
if (movers.sway === 0) process.stdout.write('map: no ribbon on this map enters a module past its interface, so the sway is not measured\n');
await build({ root: WEB, configFile: CONFIG, logLevel: 'warn' });
const server = await preview({ root: WEB, configFile: CONFIG, logLevel: 'warn', preview: { host: '127.0.0.1', port: 0, strictPort: false, open: false }, plugins: [serveMaps(JSON.stringify(map), JSON.stringify(stilled(map)))] });
const address = server.httpServer.address();
if (address === null || typeof address === 'string') throw new Error('vite preview did not bind a loopback port');
const url = `http://127.0.0.1:${String(address.port)}`;
const browser = await chromium.launch({ channel: 'chrome', headless: false });
try {
  const readings = [await read(browser, url, 'webgpu', 'on'), await read(browser, url, 'webgpu', 'off'), await read(browser, url, 'webgl', 'on'), await read(browser, url, 'webgl', 'off')];
  process.stdout.write(`\n${String(files)} files, seed ${String(seed)}, ${String(STRAYS)} strays, ${VIEWPORT.width}x${VIEWPORT.height}; ${cpus()[0]?.model ?? 'unknown cpu'}, ${String(Math.round(totalmem() / 2 ** 30))} GB, ${platform()} ${release()}; Chrome ${browser.version()}\n`);
  for (const reading of readings) {
    process.stdout.write(`\n${reading.asked} (drew on ${reading.drawn}), movers ${reading.movers}, motion ${reading.motion}\n`);
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
