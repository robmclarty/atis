/**
 * first-frame: time a cached run of atis from the command to the world's
 * first complete frame (D136, C14), each leg of it, per repository.
 *
 * For each `repo=base` it is given (this repository against `HEAD~1` when it
 * is given none), it runs atis once to fill the terrain cache, untimed, and
 * then, with the browser already running and its page already open, times a
 * second, cached run on each backend: the command until it serves, each
 * source it reads (its `--verbose` timings), the page until the map arrives,
 * and the map until the page's `atis:ready` mark, which the world raises
 * once its first complete frame is on the screen (D105). The page is driven
 * to the served URL rather than opened by the platform's opener, so the time
 * an opener takes to hand a tab the URL is no part of it.
 *
 * Run it on the laptop the budget names, after a build, the window in front:
 *
 *   pnpm build && node apps/web/scripts/first-frame.ts [repo=base ...]
 */

import { spawn, spawnSync } from 'node:child_process';
import { cpus, platform, release, totalmem } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright-core';
import type { Page } from 'playwright-core';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const CLI = join(ROOT, 'apps', 'atis', 'dist', 'cli.js');
const WEB = join(ROOT, 'apps', 'atis', 'web');
const VIEWPORT = { width: 1440, height: 900 } as const;
const SERVED = /serving at (http:\/\/127\.0\.0\.1:\d+\/\?token=[0-9a-f]+)/;
const TIMING = /^ {2}(\S.*?) {2,}(\d+) ms$/;
const MINUTES = 10 * 60_000;

/** One repository and the base it is measured against. */
type Target = { readonly repo: string; readonly base: string };

/** One timed run: the source timings the command printed, and the legs from the command to the first frame, in milliseconds. */
type Run = {
  readonly backend: string;
  readonly cache: string;
  readonly sources: readonly (readonly [string, number])[];
  readonly served: number;
  readonly arrived: number;
  readonly drawn: number;
};

const targets: readonly Target[] = (process.argv.length > 2 ? process.argv.slice(2) : [`${ROOT}=HEAD~1`]).map((given) => {
  const at = given.lastIndexOf('=');
  return at === -1 ? { repo: resolve(given), base: 'HEAD~1' } : { repo: resolve(given.slice(0, at)), base: given.slice(at + 1) };
});

/** Fill the terrain cache for a target, untimed: the run being measured is the second one. */
const warm = (target: Target): void => {
  const out = join(target.repo, '.atis', 'first-frame.json');
  const done = spawnSync(process.execPath, [CLI, '--repo', target.repo, '--base', target.base, '--out', out], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (done.status !== 0) throw new Error(`atis would not map ${target.repo}: ${done.stderr}`);
};

/** The served run, timed from the command to the page's first complete frame on `backend`. */
const timed = async (page: Page, target: Target, backend: 'webgpu' | 'webgl'): Promise<Run> => {
  const started = performance.timeOrigin + performance.now();
  const child = spawn(process.execPath, [CLI, '--repo', target.repo, '--base', target.base, '--no-open', '--verbose'], {
    env: { ...process.env, ATIS_WEB: WEB },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk: string) => (stderr += chunk));
  try {
    const url = await new Promise<string>((found, failed) => {
      child.stdout.on('data', (chunk: string) => {
        stdout += chunk;
        const served = SERVED.exec(stdout)?.[1];
        if (served !== undefined) found(served);
      });
      child.once('exit', (code) => failed(new Error(`atis exited ${String(code)} before serving: ${stderr}`)));
    });
    const served = performance.timeOrigin + performance.now() - started;
    await page.goto(backend === 'webgl' ? `${url}&backend=webgl` : url);
    await page.waitForSelector('#world[data-ready="true"]', { timeout: MINUTES });
    const marks = await page.evaluate(() => {
      const ready = performance.getEntriesByName('atis:ready')[0];
      const map = performance.getEntriesByType('resource').find((entry) => entry.name.split('?')[0]?.endsWith('/map.json'));
      const arrived = map instanceof PerformanceResourceTiming ? map.responseEnd : Number.NaN;
      return { arrived: performance.timeOrigin + arrived, drawn: performance.timeOrigin + (ready?.startTime ?? Number.NaN) };
    });
    const lines = stderr.split('\n');
    return {
      backend: (await page.getAttribute('#world', 'data-backend')) ?? backend,
      cache: lines.find((line) => line.startsWith('  terrain cache '))?.slice('  terrain cache '.length) ?? 'unknown',
      sources: lines.flatMap((line) => {
        const match = TIMING.exec(line);
        return match?.[1] === undefined || match[2] === undefined ? [] : [[match[1], Number(match[2])] as const];
      }),
      served,
      arrived: marks.arrived - started,
      drawn: marks.drawn - started,
    };
  } finally {
    child.kill('SIGINT');
  }
};

const seconds = (ms: number): string => `${(ms / 1000).toFixed(2)} s`;

const browser = await chromium.launch({ channel: 'chrome', headless: false });
try {
  const page = await browser.newPage({ viewport: VIEWPORT });
  await page.goto('about:blank');
  process.stdout.write(`${VIEWPORT.width}x${VIEWPORT.height}; ${cpus()[0]?.model ?? 'unknown cpu'}, ${String(Math.round(totalmem() / 2 ** 30))} GB, ${platform()} ${release()}; Chrome ${browser.version()}\n`);
  // One run at a time: two at once would share the machine and the page, and time each other.
  const jobs = targets.flatMap((target) => (['webgpu', 'webgl'] as const).map((backend) => ({ target, backend })));
  await jobs.reduce(async (before, { target, backend }) => {
    await before;
    if (backend === 'webgpu') warm(target);
    const run = await timed(page, target, backend);
    process.stdout.write(`\n${target.repo} against ${target.base}, ${backend} (drew on ${run.backend}); terrain cache ${run.cache}\n`);
    for (const [source, ms] of run.sources) process.stdout.write(`  ${source.padEnd(12)} ${String(ms)} ms\n`);
    process.stdout.write(`  served       ${seconds(run.served)} after the command\n`);
    process.stdout.write(`  map arrived  ${seconds(run.arrived)} after the command\n`);
    process.stdout.write(`  first frame  ${seconds(run.drawn)} after the command, ${seconds(run.drawn - run.arrived)} after the map arrived\n`);
  }, Promise.resolve());
} finally {
  await browser.close();
}
