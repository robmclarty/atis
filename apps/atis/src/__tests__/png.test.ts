import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'vite';
import { afterAll, expect, test } from 'vitest';

import { CAPTURE, INSTALL, capturePng, launchBrowser } from '../png.js';
import { pngRun } from '../run.js';
import { serve } from '../serve.js';

/**
 * The world captured headless as a PNG (D105). The real app is built from its
 * sources by Vite in-process into a temp directory, never into a shared
 * `dist/` the `types` slot rewrites (D132, D133), and served by atis's own
 * server with the demo fixture, then captured twice, each in a browser
 * launched afresh as a run launches one: the two images are byte-identical.
 * The run around a capture is driven over a stub app whose canvas raises the
 * ready flag itself, and with no browser to try it exits 2 naming the install
 * and writing nothing (C4).
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..', '..');
const WEB = join(REPO, 'apps', 'web');
const DEMO = join(REPO, 'libs', 'core', 'fixtures', 'demo', 'map.json');
const TOKEN = 'b4e2d3c5f6a7b8091a2b3c4d5e6f7081';
const MINUTE = 60_000;

const temps: string[] = [];

const temp = (prefix: string): string => {
  const dir = mkdtempSync(join(tmpdir(), `atis-png-${prefix}-`));
  temps.push(dir);
  return dir;
};

afterAll(() => {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

/** A PNG's width and height, from its header. */
const sizeOf = (png: Buffer): { readonly width: number; readonly height: number } => ({ width: png.readUInt32BE(16), height: png.readUInt32BE(20) });

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

test("two captures of the demo fixture, each in a browser launched afresh, are byte-identical at the capture's viewport (D105, C3)", async () => {
  const assets = temp('web');
  await build({ root: WEB, configFile: join(WEB, 'vite.config.ts'), logLevel: 'silent', cacheDir: temp('vite'), build: { outDir: assets, emptyOutDir: true } });
  const served = await serve({ assets, map: readFileSync(DEMO, 'utf8'), token: TOKEN });
  try {
    const takes = [];
    for (let take = 0; take < 2; take += 1) {
      const browser = await launchBrowser();
      try {
        takes.push(await capturePng(browser, served.url));
      } finally {
        await browser.close();
      }
    }
    const [first, second] = takes;
    if (first === undefined || second === undefined) throw new Error('two captures were not taken');
    expect(first.png.subarray(0, 8).equals(SIGNATURE)).toBe(true);
    expect(sizeOf(first.png)).toEqual({ width: CAPTURE.width, height: CAPTURE.height });
    expect(first.backend).toMatch(/^(?:webgpu|webgl)$/);
    expect(second.backend).toBe(first.backend);
    expect(second.png.equals(first.png)).toBe(true);
  } finally {
    await served.close();
  }
}, 3 * MINUTE);

/** git in `cwd`, with no author config of the machine running the test. */
const git = (cwd: string, ...args: readonly string[]): string =>
  execFileSync('git', ['-c', 'user.name=atis', '-c', 'user.email=atis@example.invalid', '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8' }).trim();

/** A repository of two commits, the first tagged `v1`, the second adding a module that reads the first. */
const twoCommits = (): string => {
  const repo = temp('repo');
  git(repo, 'init', '--quiet', '--initial-branch=main');
  writeFileSync(join(repo, 'package.json'), '{ "name": "demo", "private": true, "type": "module" }\n');
  mkdirSync(join(repo, 'src'));
  writeFileSync(join(repo, 'src', 'shapes.ts'), 'export function area(width: number, height: number): number {\n  return width * height;\n}\n');
  git(repo, 'add', '.');
  git(repo, 'commit', '--quiet', '-m', 'feat: measure an area');
  git(repo, 'tag', 'v1');
  writeFileSync(join(repo, 'src', 'square.ts'), "import { area } from './shapes.js';\n\nexport function square(side: number): number {\n  return area(side, side);\n}\n");
  git(repo, 'add', '.');
  git(repo, 'commit', '--quiet', '-m', 'feat: square a side');
  return repo;
};

/** A stub of the built app whose canvas raises the ready flag as it loads, so a run captures without a GPU's frame. */
const stubApp = (): string => {
  const dir = temp('stub');
  writeFileSync(join(dir, 'index.html'), '<!doctype html><html><body style="margin:0;background:#0b0d12"><canvas id="world" data-ready="true" data-backend="stub"></canvas></body></html>\n');
  return dir;
};

test('a --png run writes the map and the capture beside it, served as a fixture is, and says what drew it (D105, D93)', async () => {
  const repo = twoCommits();
  const dir = temp('out');
  const [out, png] = [join(dir, 'map.json'), join(dir, 'atis.png')];
  const outcome = await pngRun({ repo, base: 'v1', out, png, assets: stubApp(), verbose: true });
  expect(outcome.stderr).toMatch(/capture\s+\d+ ms/);
  expect(outcome.exitCode).toBe(0);
  expect(outcome.served).toBeUndefined();
  expect(outcome.stdout).toBe(`NOINST, 1 file changed, 0 notices, wrote ${out} and ${png}, drawn on stub\n`);
  expect(existsSync(out)).toBe(true);
  const captured = readFileSync(png);
  expect(captured.subarray(0, 8).equals(SIGNATURE)).toBe(true);
  expect(sizeOf(captured)).toEqual({ width: CAPTURE.width, height: CAPTURE.height });
}, MINUTE);

test('with no browser to try, a --png run exits 2 naming the one install, before it scans or writes anything (D145, C4)', async () => {
  const dir = temp('none');
  const [out, png] = [join(dir, 'map.json'), join(dir, 'atis.png')];
  const outcome = await pngRun({ repo: twoCommits(), base: 'v1', out, png, assets: stubApp(), verbose: false, browsers: [] });
  expect(outcome.exitCode).toBe(2);
  expect(outcome.stdout).toBe('');
  expect(outcome.stderr).toBe(`atis: --png found no browser to capture with: install Google Chrome, put a Chromium on the PATH, or run \`${INSTALL}\`\n`);
  expect(existsSync(out)).toBe(false);
  expect(existsSync(png)).toBe(false);
  // A browser that will not launch is passed over for the next.
  await expect(launchBrowser([{ name: 'gone', launch: () => Promise.reject(new Error('no such browser')) }])).rejects.toThrow(INSTALL);
});

test('a --png run with no built web app exits 2 naming pnpm build (D133, C4)', async () => {
  const outcome = await pngRun({ repo: twoCommits(), base: 'v1', out: join(temp('unbuilt'), 'map.json'), png: 'atis.png', assets: join(temp('empty'), 'web'), verbose: false });
  expect(outcome.exitCode).toBe(2);
  expect(outcome.stderr).toContain('run `pnpm build` first');
});
