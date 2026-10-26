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

test('--version and --help exit 0; an unknown flag, a stray positional and a --base with no ref are misuse', () => {
  expect(atis(['--version']).stdout).toBe('0.0.0\n');
  expect(atis(['-V']).status).toBe(0);
  expect(atis(['--help']).stdout).toContain('--base <ref>');

  for (const args of [['--nope'], ['--base'], ['main'], ['--base', 'main', 'extra'], ['--base', 'main', '--history', '0'], ['--base', 'main', '--history', '2.5'], ['--base', 'main', '--history', 'all']]) {
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

/** git in `cwd`, with no author config of the machine running the test. */
function git(cwd: string, ...args: readonly string[]): string {
  return execFileSync('git', ['-c', 'user.name=atis', '-c', 'user.email=atis@example.invalid', '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8' }).trim();
}

function write(root: string, path: string, text: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
}

/**
 * A clone of a small package whose trunk lives only on `origin/`: `main` holds
 * two commits, the first tagged `v1`, and the clone is on `feature`, one
 * commit past `main`, with its local `main` deleted.
 */
function featureClone(prefix: string): { readonly repo: string; readonly sha: (ref: string) => string } {
  const origin = join(temp(`${prefix}-origin`), 'repo');
  mkdirSync(origin);
  git(origin, 'init', '--quiet', '--initial-branch=main');
  write(origin, 'package.json', '{ "name": "demo", "private": true, "type": "module" }\n');
  write(origin, 'src/index.ts', "export { area } from './shapes.js';\n");
  write(origin, 'src/shapes.ts', 'export function area(width: number, height: number): number {\n  return width * height;\n}\n');
  git(origin, 'add', '.');
  git(origin, 'commit', '--quiet', '-m', 'feat: measure an area');
  git(origin, 'tag', 'v1');
  write(origin, 'src/square.ts', 'export function square(side: number): number {\n  return side * side;\n}\n');
  git(origin, 'add', '.');
  git(origin, 'commit', '--quiet', '-m', 'feat: square a side');

  const repo = join(temp(`${prefix}-clone`), 'repo');
  execFileSync('git', ['clone', '--quiet', origin, repo], { stdio: 'ignore' });
  git(repo, 'checkout', '--quiet', '-b', 'feature');
  git(repo, 'branch', '--quiet', '-D', 'main');
  write(repo, 'src/cube.ts', "import { square } from './square.js';\n\nexport function cube(side: number): number {\n  return square(side) * side;\n}\n");
  git(repo, 'add', '.');
  git(repo, 'commit', '--quiet', '-m', 'feat: cube a side');
  return { repo, sha: (ref) => git(repo, 'rev-parse', ref) };
}

test('with no base named, the run takes the trunk, on origin/ when no local branch holds it, and records it as resolved alone (D99)', () => {
  const { repo, sha } = featureClone('trunk');
  const out = join(temp('trunk-map'), 'map.json');

  const result = atis(['--repo', repo, '--out', out]);
  expect(result.status, result.stderr).toBe(0);
  const map = mapAt(out);
  expect(map.meta.base).toBe('origin/main');
  expect(map.meta.base_typed).toBeUndefined();
  expect(map.meta.merge_base).toBe(sha('origin/main'));
  expect(map.meta.head).toBe(sha('HEAD'));
  expect(map.weather.changed.map((file) => file.path)).toEqual(['src/cube.ts']);
}, MINUTE);

test('--base, --last-commit and --last-tag each record the base as typed and as resolved (D99)', () => {
  const { repo, sha } = featureClone('named');
  const dir = temp('named-maps');
  const mapOf = (name: string, base: Parameters<typeof run>[0]['base']): MapJson => {
    const out = join(dir, `${name}.json`);
    const outcome = run({ repo, base, out, verbose: false });
    expect(outcome.exitCode, outcome.stderr).toBe(0);
    return mapAt(out);
  };

  const typed = mapOf('typed', 'v1');
  expect([typed.meta.base, typed.meta.base_typed, typed.meta.merge_base]).toEqual(['v1', '--base v1', sha('v1')]);
  expect(typed.weather.changed.map((file) => file.path)).toEqual(['src/cube.ts', 'src/square.ts']);

  const commit = mapOf('commit', { last: 'commit' });
  expect([commit.meta.base, commit.meta.base_typed, commit.meta.merge_base]).toEqual(['HEAD~1', '--last-commit', sha('HEAD~1')]);
  expect(commit.weather.changed.map((file) => file.path)).toEqual(['src/cube.ts']);

  const tag = mapOf('tag', { last: 'tag' });
  expect([tag.meta.base, tag.meta.base_typed, tag.meta.merge_base]).toEqual(['v1', '--last-tag', sha('v1')]);
}, MINUTE);

test('a head other than the checked-out HEAD reads git-only and says why; the checked-out one reads .check/ (D99, D135)', () => {
  const { repo, sha } = featureClone('head');
  const dir = temp('head-maps');

  const other = join(dir, 'other.json');
  expect(run({ repo, base: 'v1', head: 'origin/main', out: other, verbose: false }).exitCode).toBe(0);
  const map = mapAt(other);
  expect(map.meta.head).toBe(sha('origin/main'));
  expect(map.weather.changed.map((file) => file.path)).toEqual(['src/square.ts']);
  expect(map.meta.instruments.mode).toBe('git-only');
  expect(map.meta.instruments.reason).toBe('the head origin/main is not the checked-out HEAD, so .check/ does not describe it');
  expect(map.weather.checks.category).toBe('NOINST');

  // The checked-out commit named another way is still HEAD: its .check/ is read, here an absent one.
  const same = join(dir, 'same.json');
  expect(run({ repo, base: 'v1', head: 'feature', out: same, verbose: false }).exitCode).toBe(0);
  expect(mapAt(same).meta.instruments.reason).toBe('.check/ is absent');
}, MINUTE);

test('two flags that name the base are misuse, and a ref that names no commit exits 2 (C4)', () => {
  const { repo } = featureClone('misuse');
  const out = join(temp('misuse-map'), 'map.json');
  for (const args of [['--base', 'v1', '--last-commit'], ['--base', 'v1', '--last-tag'], ['--last-commit', '--last-tag']]) {
    const result = atis(['--repo', repo, '--out', out, ...args]);
    expect(result.status).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('--base, --last-commit and --last-tag each name the base');
  }
  for (const [args, reason] of [[['--base', 'nowhere'], '--base nowhere names no commit'], [['--head', 'nowhere'], '--head nowhere names no commit']] as const) {
    const result = atis(['--repo', repo, '--out', out, ...args]);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain(reason);
  }
  expect(existsSync(out)).toBe(false);
}, MINUTE);

test('--working-tree maps the staged, the unstaged and the untracked change, with .check/ read as the tree\'s own (D99, D135)', () => {
  const { repo, sha } = featureClone('working');
  write(repo, 'src/shapes.ts', 'export function area(width: number, height: number): number {\n  return Math.abs(width * height);\n}\n');
  git(repo, 'add', 'src/shapes.ts');
  write(repo, 'src/cube.ts', "import { square } from './square.js';\n\nexport function cube(side: number): number {\n  return Math.abs(square(side) * side);\n}\n");
  write(repo, 'src/line.ts', 'export function line(length: number): number {\n  return length;\n}\n');
  mkdirSync(join(repo, '.check'));
  const out = join(temp('working-map'), 'map.json');

  const result = atis(['--repo', repo, '--base', 'HEAD', '--working-tree', '--out', out]);
  expect(result.status, result.stderr).toBe(0);
  const map = mapAt(out);
  expect(map.meta.head).toBe('working-tree');
  expect(map.meta.merge_base).toBe(sha('HEAD'));
  expect(map.weather.changed.map((file) => [file.path, file.kind])).toEqual([
    ['src/cube.ts', 'modified'],
    ['src/line.ts', 'added'],
    ['src/shapes.ts', 'modified'],
  ]);
  // The tree's own .check/ is read, here an empty one, rather than muted for the head.
  expect(map.meta.instruments.reason).toBe('.check/ is empty');

  const both = atis(['--repo', repo, '--working-tree', '--head', 'HEAD', '--out', out]);
  expect(both.status).toBe(2);
  expect(both.stderr).toContain('--head and --working-tree each name the head');
}, MINUTE);

/**
 * A small package tagged `base`, then three commits on top: one adds a
 * square, one a cube that squares, and the last reshapes the area. Beside
 * it, an ignored `.check/` whose one slot ran green, which only the
 * checked-out commit may read as its own (D135).
 */
function threeCommits(prefix: string): { readonly repo: string; readonly sha: (ref: string) => string } {
  const repo = join(temp(prefix), 'repo');
  mkdirSync(repo);
  git(repo, 'init', '--quiet', '--initial-branch=main');
  write(repo, '.gitignore', '.check/\n');
  write(repo, 'package.json', '{ "name": "demo", "private": true, "type": "module" }\n');
  write(repo, 'src/index.ts', "export { area } from './shapes.js';\n");
  write(repo, 'src/shapes.ts', 'export function area(width: number, height: number): number {\n  return width * height;\n}\n');
  git(repo, 'add', '.');
  git(repo, 'commit', '--quiet', '-m', 'feat: measure an area');
  git(repo, 'tag', 'base');
  write(repo, 'src/square.ts', 'export function square(side: number): number {\n  return side * side;\n}\n');
  git(repo, 'add', '.');
  git(repo, 'commit', '--quiet', '-m', 'feat: square a side');
  write(repo, 'src/cube.ts', "import { square } from './square.js';\n\nexport function cube(side: number): number {\n  return square(side) * side;\n}\n");
  git(repo, 'add', '.');
  git(repo, 'commit', '--quiet', '-m', 'feat: cube a side');
  write(repo, 'src/shapes.ts', "import { square } from './square.js';\n\nexport function area(width: number, height: number): number {\n  return width === height ? square(width) : width * height;\n}\n");
  git(repo, 'add', '.');
  git(repo, 'commit', '--quiet', '-m', 'fix: square a square');
  const ran = { name: 'lint', adapter: 'oxlint', ok: true, exit_code: 0, duration_ms: 1, output_file: null };
  write(repo, '.check/summary.json', `${JSON.stringify({ schema_version: 1, ok: true, checks_run: 1, timestamp: new Date().toISOString(), total_duration_ms: 1, checks: [ran] })}\n`);
  return { repo, sha: (ref) => git(repo, 'rev-parse', ref) };
}

test('--range writes one map over the merge-base\'s terrain, the head\'s weather, and a frame per commit in order (D100, D135)', () => {
  const { repo, sha } = threeCommits('range');
  const dir = temp('range-maps');
  const ranged = join(dir, 'ranged.json');
  const plain = join(dir, 'plain.json');

  const result = run({ repo, range: { from: 'base', to: 'HEAD' }, out: ranged, verbose: true });
  expect(result.exitCode, result.stderr).toBe(0);
  expect(result.stderr).toMatch(/frames\s+\d+ ms/);
  expect(run({ repo, base: 'base', out: plain, verbose: false }).exitCode).toBe(0);
  const map = mapAt(ranged);
  const change = mapAt(plain);

  expect([map.meta.base, map.meta.base_typed, map.meta.merge_base, map.meta.head]).toEqual(['base', '--range base..HEAD', sha('base'), sha('HEAD')]);
  // One terrain, and the head's own weather and notices: the map of the change, with its frames beside.
  expect(map.terrain).toEqual(change.terrain);
  expect(map.weather).toEqual(change.weather);
  expect(map.notices).toEqual(change.notices);

  const frames = map.sequence?.frames ?? [];
  expect(frames.map((frame) => [frame.commit, frame.subject])).toEqual([
    [sha('HEAD~2'), 'feat: square a side'],
    [sha('HEAD~1'), 'feat: cube a side'],
    [sha('HEAD'), 'fix: square a square'],
  ]);
  // Each frame is its commit's change over the one base, so the weather builds up commit by commit.
  expect(frames.map((frame) => frame.weather.changed.map((file) => file.path))).toEqual([
    ['src/square.ts'],
    ['src/cube.ts', 'src/square.ts'],
    ['src/cube.ts', 'src/shapes.ts', 'src/square.ts'],
  ]);
  expect(frames.at(-1)?.weather).toEqual(map.weather);
  expect(frames.at(-1)?.notices).toEqual(map.notices);

  // Only the checked-out commit's frame reads .check/; the others say why they read none.
  expect(map.meta.instruments.mode).toBe('check');
  expect(frames.map((frame) => frame.weather.checks.slots.map((slot) => slot.name))).toEqual([[], [], ['lint']]);
  expect(frames[0]?.weather.checks.reason).toBe(`the commit ${sha('HEAD~2')} is not the checked-out HEAD, so .check/ does not describe it`);
}, MINUTE);

test('a range whose head is not the checked-out HEAD carries no evidence in any frame (D135)', () => {
  const { repo, sha } = threeCommits('range-back');
  const out = join(temp('range-back-map'), 'map.json');

  expect(run({ repo, range: { from: 'base', to: 'HEAD~1' }, out, verbose: false }).exitCode).toBe(0);
  const map = mapAt(out);
  expect(map.meta.head).toBe(sha('HEAD~1'));
  expect(map.meta.instruments.reason).toBe('the head HEAD~1 is not the checked-out HEAD, so .check/ does not describe it');
  expect(map.sequence?.frames.map((frame) => frame.weather.checks.category)).toEqual(['NOINST', 'NOINST']);
}, MINUTE);

test('--range beside a flag that names the base or the head, or not two refs, is misuse (C4)', () => {
  const { repo } = threeCommits('range-misuse');
  const out = join(temp('range-misuse-map'), 'map.json');
  for (const [args, reason] of [
    [['--range', 'base..HEAD', '--base', 'base'], '--range names the base and the head itself; drop --base'],
    [['--range', 'base..HEAD', '--working-tree', '--last-tag'], 'drop --last-tag and --working-tree'],
    [['--range', 'base...HEAD'], '--range takes two refs as <from>..<to>'],
    [['--range', 'base..'], '--range takes two refs as <from>..<to>'],
    [['--range', 'base..HEAD..main'], '--range takes two refs as <from>..<to>'],
    [['--range', 'nowhere..HEAD'], '--range nowhere..HEAD: nowhere names no commit'],
    [['--range', 'base..nowhere'], '--range nowhere names no commit'],
  ] as const) {
    const result = atis(['--repo', repo, '--out', out, ...args]);
    expect(result.status, args.join(' ')).toBe(2);
    expect(result.stderr).toContain(reason);
  }
  expect(existsSync(out)).toBe(false);
}, MINUTE);

/**
 * A `.check/` whose fallow slots ran, written now and holding `files`; its run
 * window opens an hour back, so every file reads as this run's (D41).
 */
function writeCheck(repo: string, files: Readonly<Record<string, unknown>>): void {
  const slots = ['dead', 'dupes', 'health'];
  const summary = { schema_version: 1, ok: true, checks_run: slots.length, timestamp: new Date().toISOString(), total_duration_ms: 3_600_000, checks: slots.map((name) => ({ name, ok: true })) };
  write(repo, '.check/summary.json', JSON.stringify(summary));
  for (const [name, value] of Object.entries(files)) write(repo, `.check/${name}`, JSON.stringify(value));
}

test("--whole-repo maps the head's own terrain with its overlays, and draws muted only the findings a committed baseline grandfathers (D101, D49)", () => {
  const { repo, sha } = featureClone('whole');
  const dir = temp('whole-maps');
  writeCheck(repo, {
    'health.json': { file_scores: [{ path: 'src/cube.ts', lines: 5, function_count: 1, maintainability_index: 88, crap_max: 2, total_cyclomatic: 3 }], findings: [] },
    'dead.json': { unused_exports: [{ path: 'src/shapes.ts', export_name: 'area', line: 1, col: 16 }] },
  });
  write(repo, 'checkride.baseline.json', JSON.stringify({ schema_version: 1, slots: { dead: ['dead-code:unused_exports:src/shapes.ts:area'] } }));

  // Written but not committed, the baseline is not the head's, so it draws nothing muted.
  const before = join(dir, 'before.json');
  const outcome = run({ repo, wholeRepo: true, out: before, verbose: false });
  expect(outcome.exitCode).toBe(0);
  expect(outcome.stdout).toMatch(/^whole repo, 4 files on the terrain, 5 of 8 overlays, wrote /);
  const map = mapAt(before);
  expect(map.meta).toMatchObject({ mode: 'repo', base: 'HEAD', head: sha('HEAD'), merge_base: sha('HEAD') });
  expect(map.weather.changed).toEqual([]);
  expect(map.notices).toEqual([]);
  expect(map.overlays?.trouble_spots).toEqual([{ path: 'src/cube.ts', commits: 1, complexity: 3, score: 1 }]);
  expect(map.overlays?.dead_code).toEqual([{ path: 'src/shapes.ts', kind: 'export', name: 'area', line: 1 }]);
  expect(map.overlays?.recent_heat?.commits).toBe(3);
  expect(map.overlays?.muted).toEqual([
    'baselined: no checkride.baseline.json is committed at the head',
    'coverage_gaps: .check/ ran no test slot',
    'duplication: .check/dupes.json is missing or unreadable',
  ]);

  git(repo, 'add', 'checkride.baseline.json');
  git(repo, 'commit', '--quiet', '-m', 'chore: baseline the unused export');
  const after = join(dir, 'after.json');
  expect(run({ repo, wholeRepo: true, out: after, verbose: false }).exitCode).toBe(0);
  expect(mapAt(after).overlays?.baselined).toEqual([{ kind: 'unused-export', files: ['src/shapes.ts'], name: 'area' }]);

  // The head's terrain is kept per commit like any base's, so a change measured from it stands on the same ground (D96, P2).
  expect(run({ repo, base: 'HEAD', out: join(dir, 'change.json'), verbose: true }).stderr).toContain('terrain cache hit');

  // Another head reads git-only, so every overlay .check/ feeds is muted with D135's reason.
  const other = join(dir, 'other.json');
  expect(run({ repo, wholeRepo: true, head: 'origin/main', out: other, verbose: false }).exitCode).toBe(0);
  const elsewhere = mapAt(other);
  expect(elsewhere.meta).toMatchObject({ base: 'origin/main', head: sha('origin/main') });
  expect(elsewhere.overlays?.muted).toContain('dead_code: the head origin/main is not the checked-out HEAD, so .check/ does not describe it');
}, MINUTE);

test('--whole-repo beside a flag that names a base, a range or the working tree is misuse (C4)', () => {
  for (const [args, reason] of [
    [['--whole-repo', '--base', 'main'], '--whole-repo maps one commit with no change; drop --base'],
    [['--whole-repo', '--range', 'main..HEAD'], 'drop --range'],
    [['--whole-repo', '--working-tree', '--last-tag'], 'drop --last-tag and --working-tree'],
  ] as const) {
    const result = atis([...args, '--out', join(temp('whole-misuse'), 'map.json')]);
    expect(result.status, args.join(' ')).toBe(2);
    expect(result.stderr).toContain(reason);
  }
}, MINUTE);

test('--overlay names the one overlay the still map of the whole repo draws, and its HUD names it too (D101)', () => {
  const { repo } = featureClone('overlay');
  const dir = temp('overlay-maps');
  writeCheck(repo, { 'dead.json': { unused_exports: [{ path: 'src/shapes.ts', export_name: 'area', line: 1 }] } });

  const svg = join(dir, 'dead.svg');
  expect(run({ repo, wholeRepo: true, out: join(dir, 'map.json'), svg, overlay: 'dead_code', verbose: false }).exitCode).toBe(0);
  const drawn = readFileSync(svg, 'utf8');
  expect(drawn).toContain('<g id="overlay" data-overlay="dead_code" data-channel="luminance"');
  expect(drawn).toContain('<tspan>Dead code </tspan><tspan font-weight="bold">1</tspan><tspan> finding</tspan>');

  for (const [args, reason] of [
    [['--base', 'HEAD~1', '--svg', svg, '--overlay', 'cycles'], '--overlay draws one overlay of the whole repo; it needs --whole-repo'],
    [['--whole-repo', '--out', join(dir, 'm.json'), '--overlay', 'cycles'], '--overlay names what the still map draws; it needs --svg <file>'],
    [['--whole-repo', '--svg', svg, '--overlay', 'dead_code'], '--overlay takes one of trouble-spots, ugly-spots, coverage-gaps, dead-code, duplication, cycles, recent-heat, baselined'],
  ] as const) {
    const result = atis(['--repo', repo, ...args]);
    expect(result.status, args.join(' ')).toBe(2);
    expect(result.stderr).toContain(reason);
  }
}, MINUTE);
