import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson } from 'core';
import { afterAll, beforeAll, expect, test } from 'vitest';

import { run } from '../run.js';

/**
 * The command end to end, run the way a user runs it: the built `bin` in a
 * child process, against this repository and against temp copies of it made
 * with `git clone`, so each one carries the history the CLI reads and none of
 * the ignored files (a clone has no `.check/`, which is what makes NOINST the
 * honest verdict there).
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE = join(HERE, '..', '..');
const REPO = join(PACKAGE, '..', '..');
const CLI = join(PACKAGE, 'dist', 'cli.js');
const MINUTE = 60_000;

const workspaces: string[] = [];

function temp(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), `atis-cli-${prefix}-`));
  workspaces.push(dir);
  return dir;
}

afterAll(() => {
  for (const dir of workspaces) rmSync(dir, { recursive: true, force: true });
});

// The gate builds the `bin` in its `types` slot; a bare `vitest run` on a tree
// that has never been built builds it here instead. The build is allowed to
// fail: the `types` slot may be building the same graph in parallel, and what
// this needs is only that the `bin` is there by the time the tests run.
beforeAll(() => {
  if (existsSync(CLI)) return;
  try {
    execFileSync('pnpm', ['exec', 'tsc', '--build'], { cwd: REPO, stdio: 'ignore' });
  } catch {
    /* the check below is the one that matters */
  }
  if (!existsSync(CLI)) throw new Error(`the bin is not built: ${CLI}`);
}, 2 * MINUTE);

type Run = { readonly status: number; readonly stdout: string; readonly stderr: string };

function atis(args: readonly string[]): Run {
  const result = spawnSync(process.execPath, [CLI, ...args], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { status: result.status ?? -1, stdout: result.stdout, stderr: result.stderr };
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

test('the built command writes a map of this repository that passes assertMap', () => {
  const out = join(temp('here'), 'map.json');
  const result = atis(['--repo', REPO, '--base', 'HEAD~1', '--out', out, '--verbose']);
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
}, MINUTE);

test('--svg writes the still render beside the map in one run', () => {
  const dir = temp('svg');
  const out = join(dir, 'map.json');
  const svg = join(dir, 'atis.svg');
  const result = atis(['--repo', REPO, '--base', 'HEAD~1', '--out', out, '--svg', svg]);
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

test('--open is a no-op under a test run, and needs --svg', () => {
  const dir = temp('open');
  const out = join(dir, 'map.json');
  const svg = join(dir, 'atis.svg');

  // With --svg it writes both and exits 0; the opener never launches here.
  const opened = atis(['--repo', REPO, '--base', 'HEAD~1', '--out', out, '--svg', svg, '--open']);
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

  for (const args of [[], ['--nope'], ['--base'], ['main'], ['--base', 'main', 'extra']]) {
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
