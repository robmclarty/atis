import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { assertMap } from 'core';
import type { MapJson } from 'core';
import { afterAll, expect, test } from 'vitest';

import { run, serveRun } from '../run.js';

/**
 * The command end to end, run the way a user runs it: the `bin` in a child
 * process, against this repository and against temp copies of it made with
 * `git clone`, so each one carries the history the CLI reads and none of the
 * ignored files (a clone has no `.check/`, which is what makes NOINST the
 * honest verdict there).
 *
 * The child runs the bin's TypeScript source, never a build. The gate's
 * `types` slot runs `tsc --build` beside this suite, rewriting `dist/` under
 * `apps/atis`, `libs/core` and `libs/svg` while the tests run, so a child
 * that executed the built `bin`, or a built `core` or `svg` it imports, could
 * load a half-written file and fail for no reason of its own. Node strips the
 * types itself; `--conditions=source` resolves the workspace packages to
 * their `src/index.ts` (D20), and the hook below maps the `.js` specifiers
 * the sources import by to the `.ts` files beside them, and refuses any file
 * under a workspace `dist/`, so the race cannot creep back in. A run against
 * this repository passes `--no-cache`, so the suite never keeps a terrain in
 * the working copy it reads (D96); the copies keep theirs and are removed.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE = join(HERE, '..', '..');
const REPO = join(PACKAGE, '..', '..');
const CLI = join(PACKAGE, 'src', 'cli.ts');
const MINUTE = 60_000;

const HOOK = `
import { registerHooks } from 'node:module';
const workspace = ${JSON.stringify(pathToFileURL(REPO).href)} + '/';
registerHooks({
  resolve(specifier, context, nextResolve) {
    const fromSource = context.parentURL?.endsWith('.ts') === true;
    const relativeJs = specifier.startsWith('.') && specifier.endsWith('.js');
    const resolved = nextResolve(fromSource && relativeJs ? specifier.slice(0, -3) + '.ts' : specifier, context);
    const inside = resolved.url.startsWith(workspace) ? resolved.url.slice(workspace.length) : '';
    if (/(^|\\/)dist\\//.test(inside) && !inside.includes('node_modules/')) {
      throw new Error('the CLI test loaded a build: ' + resolved.url);
    }
    return resolved;
  },
});
`;

const NODE_FLAGS = [
  '--conditions=source',
  '--disable-warning=ExperimentalWarning',
  '--import',
  `data:text/javascript,${encodeURIComponent(HOOK)}`,
];

const workspaces: string[] = [];

function temp(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), `atis-cli-${prefix}-`));
  workspaces.push(dir);
  return dir;
}

afterAll(() => {
  for (const dir of workspaces) rmSync(dir, { recursive: true, force: true });
});

type Run = { readonly status: number; readonly stdout: string; readonly stderr: string };

function atis(args: readonly string[], env: Readonly<Record<string, string>> = {}): Run {
  const result = spawnSync(process.execPath, [...NODE_FLAGS, CLI, ...args], {
    cwd: REPO,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...env },
  });
  return { status: result.status ?? -1, stdout: result.stdout, stderr: result.stderr };
}

/** A stub of the built web app (D133): a directory with an `index.html`, so the served default has something to serve. */
function stubWeb(prefix: string): string {
  const dir = join(temp(prefix), 'web');
  mkdirSync(dir);
  writeFileSync(join(dir, 'index.html'), '<!doctype html><title>atis stub</title>\n');
  return dir;
}

function mapAt(path: string): MapJson {
  return assertMap(JSON.parse(readFileSync(path, 'utf8')));
}

/** A temp copy of this repository, made with git's own copy so the commits the CLI reads come with it. */
function copyOfThisRepo(prefix: string): string {
  const copy = join(temp(prefix), 'repo');
  execFileSync('git', ['clone', '--quiet', '--local', '--no-hardlinks', REPO, copy], { stdio: 'ignore' });
  return copy;
}

test('the command writes a map of this repository that passes assertMap', () => {
  const out = join(temp('here'), 'map.json');
  const result = atis(['--repo', REPO, '--base', 'HEAD~1', '--no-cache', '--out', out, '--verbose']);
  expect(result.status).toBe(0);

  const map = mapAt(out);
  expect(map.meta.schema_version).toBe(1);
  expect(map.meta.mode).toBe('change');
  expect(map.meta.base).toBe('HEAD~1');
  expect(map.meta.head).toMatch(/^[0-9a-f]{40}$/);
  expect(map.meta.merge_base).toMatch(/^[0-9a-f]{40}$/);
  expect(map.terrain.organelles.length).toBeGreaterThan(0);
  expect(map.weather.changed.length).toBeGreaterThan(0);
  expect(map.notices.length).toBeLessThanOrEqual(6);

  // One line, naming the category, the changed files and the notices.
  expect(result.stdout.trimEnd().split('\n')).toHaveLength(1);
  expect(result.stdout).toContain(map.weather.checks.category);
  expect(result.stdout).toContain(`${String(map.weather.changed.length)} file`);
  expect(result.stdout).toContain(`${String(map.notices.length)} notice`);

  // --verbose measures every source, the history window included (D50).
  expect(result.stderr).toMatch(/scan base\s+\d+ ms/);
  expect(result.stderr).toMatch(/log\s+\d+ ms/);
  // And the type checker's pass over the inferred shapes, one line per side (D118).
  expect(result.stderr).toMatch(/shapes base\s+\d+ ms/);
  expect(result.stderr).toMatch(/shapes head\s+\d+ ms/);
}, MINUTE);

test('--svg writes the still render beside the map in one run', () => {
  const dir = temp('svg');
  const out = join(dir, 'map.json');
  const svg = join(dir, 'atis.svg');
  const result = atis(['--repo', REPO, '--base', 'HEAD~1', '--no-cache', '--out', out, '--svg', svg]);
  expect(result.status).toBe(0);

  // The map is still written, and passes assertMap.
  expect(mapAt(out).meta.schema_version).toBe(1);

  // The SVG is a whole document carrying both materials of D12: the #world
  // group (the organic layer) and the #chrome group (the brutalist frame).
  const image = readFileSync(svg, 'utf8');
  expect(image.startsWith('<svg')).toBe(true);
  expect(image).toContain('id="world"');
  expect(image).toContain('id="chrome"');

  // One line, naming both outputs it wrote.
  expect(result.stdout.trimEnd().split('\n')).toHaveLength(1);
  expect(result.stdout).toContain(out);
  expect(result.stdout).toContain(svg);
}, MINUTE);

test('with no --out or --svg the command serves the world, prints its URL, and exits 0 on interrupt (D92, C4)', async () => {
  const web = stubWeb('served');
  const child = spawn(process.execPath, [...NODE_FLAGS, CLI, '--repo', REPO, '--base', 'HEAD~1', '--no-cache', '--no-open'], {
    cwd: REPO,
    env: { ...process.env, ATIS_WEB: web },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk: string) => (stderr += chunk));
  const line = await new Promise<string>((printed, failed) => {
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
      if (stdout.includes('\n')) printed(stdout.split('\n')[0] ?? '');
    });
    child.once('exit', (code) => failed(new Error(`the command exited ${String(code)} before serving: ${stderr}`)));
  });
  const url = /serving at (http:\/\/127\.0\.0\.1:\d+\/\?token=[0-9a-f]{32}) \(Ctrl-C to stop\)$/.exec(line)?.[1];
  expect(url, line).toBeDefined();
  expect(line).toMatch(/^(VFR|MVFR|IFR|LIFR|NOINST), \d+ files? changed, \d+ notices?, serving at /);

  // The page is the stub's, and the map behind the token is this repository's.
  const page = await fetch(url ?? '');
  expect(page.status).toBe(200);
  expect(await page.text()).toContain('atis stub');
  const map = await fetch(new URL(`/map.json${new URL(url ?? '').search}`, url));
  expect(map.status).toBe(200);
  expect(assertMap(await map.json()).meta.base).toBe('HEAD~1');
  expect((await fetch(new URL('/map.json', url))).status).toBe(403);

  const exit = new Promise<number | null>((exited) => child.once('exit', (code) => exited(code)));
  child.kill('SIGINT');
  expect(await exit).toBe(0);
}, MINUTE);

test('the served default exits 2 and names pnpm build when the web app was never built (D133)', () => {
  const result = atis(['--repo', REPO, '--base', 'HEAD~1', '--no-open'], { ATIS_WEB: join(temp('unbuilt'), 'web') });
  expect(result.status).toBe(2);
  expect(result.stdout).toBe('');
  expect(result.stderr).toContain('pnpm build');
  expect(result.stderr).toContain('no built web app');

  const outcome = serveRun({ repo: REPO, base: 'HEAD~1', assets: join(temp('unbuilt-2'), 'web'), open: false, verbose: false });
  return outcome.then((served) => {
    expect(served.exitCode).toBe(2);
    expect(served.served).toBeUndefined();
  });
}, MINUTE);

test('--open is a no-op under a test run, and needs --svg', () => {
  const dir = temp('open');
  const out = join(dir, 'map.json');
  const svg = join(dir, 'atis.svg');

  // With --svg it writes both and exits 0; the opener never launches here.
  const opened = atis(['--repo', REPO, '--base', 'HEAD~1', '--no-cache', '--out', out, '--svg', svg, '--open']);
  expect(opened.status).toBe(0);
  expect(existsSync(svg)).toBe(true);

  // Without an SVG to open, --open is misuse (C4: exit 2, nothing written).
  const bare = atis(['--repo', REPO, '--base', 'HEAD~1', '--out', out, '--open']);
  expect(bare.status).toBe(2);
  expect(bare.stdout).toBe('');
  expect(bare.stderr).toContain('--open needs --svg');
}, MINUTE);

test('a copy with no .check/ is NOINST, with the evidence channels absent rather than faked', () => {
  const copy = copyOfThisRepo('noinst');
  rmSync(join(copy, '.check'), { recursive: true, force: true });
  const out = join(copy, 'map.json');

  const result = atis(['--repo', copy, '--base', 'HEAD~1', '--out', out]);
  expect(result.status).toBe(0);

  const map = mapAt(out);
  expect(map.meta.instruments.mode).toBe('git-only');
  expect(map.weather.checks.category).toBe('NOINST');
  expect(map.weather.checks.slots).toEqual([]);
  expect(map.weather.checks.checks_run).toBe(0);
  expect(Object.keys(map.weather.evidence)).toEqual([]);
}, MINUTE);

test('a copy with an empty .check/ is NOINST and says which way it was empty', () => {
  const copy = copyOfThisRepo('empty');
  mkdirSync(join(copy, '.check'), { recursive: true });
  const out = join(copy, 'map.json');

  const result = atis(['--repo', copy, '--base', 'HEAD~1', '--out', out]);
  expect(result.status).toBe(0);

  const map = mapAt(out);
  expect(map.weather.checks.category).toBe('NOINST');
  expect(map.weather.checks.reason).toBe('.check/ is empty');
  expect(map.meta.instruments.reason).toBe('.check/ is empty');
}, MINUTE);

test('--version and --help exit 0; an unknown flag, a stray positional and a missing --base are misuse', () => {
  expect(atis(['--version']).stdout).toBe('0.0.0\n');
  expect(atis(['-V']).status).toBe(0);
  expect(atis(['--help']).stdout).toContain('--base <ref>');

  for (const args of [[], ['--nope'], ['--base'], ['main'], ['--base', 'main', 'extra'], ['--base', 'main', '--history', '0'], ['--base', 'main', '--history', '2.5'], ['--base', 'main', '--history', 'all']]) {
    const result = atis(args);
    expect(result.status).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('--help');
  }
}, MINUTE);

test('a directory that is no repository exits 2 and writes nothing (C4)', () => {
  const directory = temp('bare');
  const out = join(directory, 'map.json');

  const outcome = run({ repo: directory, base: 'main', out, verbose: false });
  expect(outcome.exitCode).toBe(2);
  expect(outcome.stdout).toBe('');
  expect(outcome.stderr).toContain('atis:');
  expect(existsSync(out)).toBe(false);
});
