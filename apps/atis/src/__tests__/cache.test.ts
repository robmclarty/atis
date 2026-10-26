import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEFAULT_CONFIG, assertMap, computeMembranes, layOutTerrain } from 'core';
import type { Layout } from 'core';
import { afterAll, expect, test } from 'vitest';

import { codeKey, configKey, entriesPath, hashCode, readEntries, readTerrain, terrainPath, writeEntries, writeTerrain } from '../cache.js';
import type { BaseTerrain, StructureKey, TerrainKey } from '../cache.js';
import { run } from '../run.js';
import { HISTORY_WINDOW, readCommit, readTree, scanImports } from '../sources/index.js';
import type { Scan } from '../sources/index.js';

/**
 * The terrain cache (D96, D137): an entry read back whole, a miss for each
 * reason an entry stops being this run's, and the command end to end on a
 * throwaway repository, where a second run reads what the first kept and
 * writes the same map.
 */

const MINUTE = 60_000;
const SHA = 'a'.repeat(40);
const OTHER_SHA = 'b'.repeat(40);

const workspaces: string[] = [];

afterAll(() => {
  for (const dir of workspaces) rmSync(dir, { recursive: true, force: true });
});

function temp(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), `atis-cache-${prefix}-`));
  workspaces.push(dir);
  return dir;
}

function write(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

const KEY: TerrainKey = { code: 'c'.repeat(64), config: configKey(DEFAULT_CONFIG, HISTORY_WINDOW) };

const TERRAIN: BaseTerrain = {
  scan: { files: [], edges: [], members: [], entry_points: { source: 'manifests', reason: 'no fallow in the tree' } },
  parsed: { 'src/a.ts': { loc: 3, code: [{ start: 1, end: 3 }], exports: ['a'], shapes: { a: 'const a: number;' }, inferred: [], references: [], stars: [], functions: [] } },
  commits: [{ sha: SHA, time: 1_700_000_000, subject: 'feat: the first', files: [{ path: 'src/a.ts', added: 3, deleted: 0 }] }],
  layout: { width: 480, height: 96, shore: { y0: 0, y1: 0 }, bands: [{ index: 0, y0: 0, y1: 96 }], positions: { 'src/a.ts': { x: 60, y: 48, r: 6 } } },
};

test('a terrain kept for a commit reads back whole, under an .atis/ that ignores itself (D96)', () => {
  const repo = temp('kept');
  const path = writeTerrain(repo, SHA, KEY, TERRAIN);

  expect(path).toBe(terrainPath(repo, SHA));
  expect(path).toBe(join(repo, '.atis', 'terrain', `${SHA}.json`));
  expect(readFileSync(join(repo, '.atis', '.gitignore'), 'utf8')).toBe('*\n');
  expect(readTerrain(repo, SHA, KEY)).toEqual({ hit: true, terrain: TERRAIN });

  // Another commit has no entry until a run keeps one.
  expect(readTerrain(repo, OTHER_SHA, KEY)).toEqual({ hit: false, reason: 'no entry' });
});

test('an entry misses on a changed config, and says so', () => {
  const repo = temp('config');
  writeTerrain(repo, SHA, KEY, TERRAIN);

  const moved = { ...DEFAULT_CONFIG, notices: { ...DEFAULT_CONFIG.notices, large_lines: DEFAULT_CONFIG.notices.large_lines + 1 } };
  expect(configKey(DEFAULT_CONFIG, HISTORY_WINDOW)).toBe(configKey({ ...DEFAULT_CONFIG }, HISTORY_WINDOW));
  expect(configKey(moved, HISTORY_WINDOW)).not.toBe(configKey(DEFAULT_CONFIG, HISTORY_WINDOW));
  expect(readTerrain(repo, SHA, { ...KEY, config: configKey(moved, HISTORY_WINDOW) })).toEqual({ hit: false, reason: 'config changed' });
  // A window read under another --history is another terrain (D50).
  expect(readTerrain(repo, SHA, { ...KEY, config: configKey(DEFAULT_CONFIG, 100) })).toEqual({ hit: false, reason: 'config changed' });
});

test('an entry misses on changed code: a byte, a file or the compiler, never a test or a declaration (D137)', () => {
  const code = temp('code');
  write(join(code, 'run.ts'), 'export const a = 1;\n');
  write(join(code, 'sources', 'git.js'), 'export const b = 2;\n');
  write(join(code, 'run.d.ts'), 'export declare const a: number;\n');
  write(join(code, 'run.js.map'), '{}\n');
  write(join(code, 'README.md'), '# notes\n');
  write(join(code, '__tests__', 'run.test.ts'), 'test();\n');
  const before = hashCode([code]);
  expect(before).toMatch(/^[0-9a-f]{64}$/);

  // What never builds a terrain moves nothing.
  write(join(code, '__tests__', 'run.test.ts'), 'test(); test();\n');
  write(join(code, 'run.d.ts'), 'export declare const a: 1;\n');
  write(join(code, 'run.js.map'), '{"version":3}\n');
  write(join(code, 'README.md'), '# other notes\n');
  expect(hashCode([code])).toBe(before);

  // One changed byte, one added file and another compiler each do.
  write(join(code, 'sources', 'git.js'), 'export const b = 3;\n');
  const edited = hashCode([code]);
  expect(edited).not.toBe(before);
  write(join(code, 'cache.ts'), 'export const c = 4;\n');
  expect(hashCode([code])).not.toBe(edited);
  expect(hashCode([code], ['typescript 6.0.3'])).not.toBe(hashCode([code], ['typescript 6.0.4']));

  // This process's own key is one hash, read once.
  expect(codeKey()).toMatch(/^[0-9a-f]{64}$/);
  expect(codeKey()).toBe(codeKey());

  const repo = temp('code-entry');
  writeTerrain(repo, SHA, KEY, TERRAIN);
  expect(readTerrain(repo, SHA, { ...KEY, code: before })).toEqual({ hit: false, reason: 'code changed' });
});

test('a corrupt entry reads as a miss, never an error', () => {
  const repo = temp('corrupt');
  const path = writeTerrain(repo, SHA, KEY, TERRAIN);
  const whole = readFileSync(path, 'utf8');
  const unreadable = { hit: false, reason: 'unreadable' };

  for (const text of ['not json {', whole.slice(0, whole.length / 2), '[]', 'null', '']) {
    writeFileSync(path, text);
    expect(readTerrain(repo, SHA, KEY), text.slice(0, 20)).toEqual(unreadable);
  }

  // Well-formed JSON with a part of the wrong kind, or another commit's entry under this one's name.
  const entry: unknown = JSON.parse(whole);
  writeFileSync(path, JSON.stringify({ ...(entry as object), scan: { files: 'none' } }));
  expect(readTerrain(repo, SHA, KEY)).toEqual(unreadable);
  writeFileSync(path, JSON.stringify({ ...(entry as object), layout: [] }));
  expect(readTerrain(repo, SHA, KEY)).toEqual(unreadable);
  writeFileSync(path, JSON.stringify({ ...(entry as object), commits: [1, 2] }));
  expect(readTerrain(repo, SHA, KEY)).toEqual(unreadable);
  writeFileSync(path, JSON.stringify({ ...(entry as object), parsed: { 'src/a.ts': { loc: 3 } } }));
  expect(readTerrain(repo, SHA, KEY)).toEqual(unreadable);
  writeFileSync(path, JSON.stringify({ ...(entry as object), sha: OTHER_SHA }));
  expect(readTerrain(repo, SHA, KEY)).toEqual(unreadable);
});

/** A throwaway repository of two commits: a package whose second commit edits one file and adds another. */
function twoCommits(): { readonly repo: string; readonly git: (...args: readonly string[]) => string } {
  const repo = temp('repo');
  const git = (...args: readonly string[]): string =>
    execFileSync('git', ['-c', 'user.name=atis', '-c', 'user.email=atis@example.invalid', '-c', 'commit.gpgsign=false', ...args], {
      cwd: repo,
      encoding: 'utf8',
    }).trim();
  git('init', '--quiet');
  write(join(repo, 'package.json'), '{ "name": "demo", "private": true, "type": "module" }\n');
  write(join(repo, 'src', 'index.ts'), "export { area } from './shapes.js';\n");
  write(join(repo, 'src', 'shapes.ts'), 'export function area(width: number, height: number): number {\n  return width * height;\n}\n');
  git('add', '.');
  git('commit', '--quiet', '-m', 'feat: measure an area');
  write(join(repo, 'src', 'shapes.ts'), "import { square } from './square.js';\n\nexport function area(width: number, height: number): number {\n  return width === height ? square(width) : width * height;\n}\n");
  write(join(repo, 'src', 'square.ts'), 'export function square(side: number): number {\n  return side * side;\n}\n');
  git('add', '.');
  git('commit', '--quiet', '-m', 'fix: square a square');
  return { repo, git };
}

/** The map's bytes with the one line two runs may differ in, the clock, taken out (C3). */
function bytesBesideTheClock(path: string): string {
  return readFileSync(path, 'utf8').replace(/"generated_at": "[^"]*"/, '"generated_at": ""');
}

test('a second run on the same base reads the cache, and writes the map the first wrote but for the clock (C3)', () => {
  const { repo, git } = twoCommits();
  const out = temp('maps');
  const base = git('rev-parse', 'HEAD~1');
  const entry = terrainPath(repo, base);

  const first = run({ repo, base: 'HEAD~1', out: join(out, 'first.json'), verbose: true });
  expect(first.exitCode, first.stderr).toBe(0);
  expect(first.stderr).toContain(`terrain cache miss (no entry), laid out cold, wrote .atis/terrain/${base}.json`);
  expect(first.stderr).toMatch(/scan base\s+\d+ ms/);
  expect(existsSync(entry)).toBe(true);

  const second = run({ repo, base: 'HEAD~1', out: join(out, 'second.json'), verbose: true });
  expect(second.exitCode, second.stderr).toBe(0);
  expect(second.stderr).toContain(`terrain cache hit, .atis/terrain/${base}.json`);
  expect(second.stderr).not.toMatch(/scan base/);
  expect(bytesBesideTheClock(join(out, 'second.json'))).toBe(bytesBesideTheClock(join(out, 'first.json')));

  // --no-cache measures afresh to the same map, and leaves the entry as it found it.
  writeFileSync(entry, 'kept by hand');
  const bypassed = run({ repo, base: 'HEAD~1', out: join(out, 'bypassed.json'), verbose: true, cache: false });
  expect(bypassed.exitCode, bypassed.stderr).toBe(0);
  expect(bypassed.stderr).toContain('terrain cache off (--no-cache)');
  expect(bytesBesideTheClock(join(out, 'bypassed.json'))).toBe(bytesBesideTheClock(join(out, 'first.json')));
  expect(readFileSync(entry, 'utf8')).toBe('kept by hand');

  // A corrupt entry is a miss, measured afresh and written over.
  const mended = run({ repo, base: 'HEAD~1', out: join(out, 'mended.json'), verbose: true });
  expect(mended.exitCode, mended.stderr).toBe(0);
  expect(mended.stderr).toContain('terrain cache miss (unreadable), laid out cold, wrote');
  expect(bytesBesideTheClock(join(out, 'mended.json'))).toBe(bytesBesideTheClock(join(out, 'first.json')));

  // An entry another build of atis wrote, or one laid out under another config, misses by name.
  for (const [part, reason] of [
    ['code', 'code changed'],
    ['config', 'config changed'],
  ] as const) {
    const kept: unknown = JSON.parse(readFileSync(entry, 'utf8'));
    const { key } = kept as { readonly key: TerrainKey };
    writeFileSync(entry, JSON.stringify({ ...(kept as object), key: { ...key, [part]: '0'.repeat(64) } }));
    const missed = run({ repo, base: 'HEAD~1', out: join(out, `${part}.json`), verbose: true });
    expect(missed.exitCode, missed.stderr).toBe(0);
    expect(missed.stderr).toContain(`terrain cache miss (${reason}), laid out cold, wrote`);
    expect(bytesBesideTheClock(join(out, `${part}.json`))).toBe(bytesBesideTheClock(join(out, 'first.json')));
  }

  // The cache ignores itself: the repository's own status and ignores are untouched.
  expect(git('status', '--porcelain')).toBe('');
  expect(existsSync(join(repo, '.gitignore'))).toBe(false);
}, MINUTE);

test('a change that changes nothing holds its base\'s kept layout exactly (D172)', () => {
  const { repo, git } = twoCommits();
  const out = join(temp('still'), 'map.json');

  const result = run({ repo, base: 'HEAD', out, verbose: false });
  expect(result.exitCode, result.stderr).toBe(0);
  const map = assertMap(JSON.parse(readFileSync(out, 'utf8')));
  expect(map.weather.changed).toEqual([]);

  const kept = readTerrain(repo, git('rev-parse', 'HEAD'), { code: codeKey(), config: configKey(DEFAULT_CONFIG, HISTORY_WINDOW) });
  expect(kept.hit).toBe(true);
  const layout = kept.hit ? kept.terrain.layout : undefined;
  expect(Object.keys(layout?.positions ?? {})).toEqual(['package.json', 'src/index.ts', 'src/shapes.ts', 'src/square.ts']);
  expect(map.terrain.layout).toEqual(layout);
}, MINUTE);

test('a cached run keeps every file and skin the change left alone where the base\'s kept layout has them, as a run with nothing kept does (D172)', () => {
  const { repo, git } = twoCommits();
  const out = temp('held');
  const base = git('rev-parse', 'HEAD~1');

  const cold = run({ repo, base: 'HEAD~1', out: join(out, 'cold.json'), verbose: false, cache: false });
  const first = run({ repo, base: 'HEAD~1', out: join(out, 'first.json'), verbose: false });
  const cached = run({ repo, base: 'HEAD~1', out: join(out, 'cached.json'), verbose: true });
  for (const one of [cold, first, cached]) expect(one.exitCode, one.stderr).toBe(0);
  expect(cached.stderr).toContain('terrain cache hit');
  // Nothing kept, a first run on an empty cache and a cached run draw one map.
  for (const one of ['first.json', 'cached.json']) expect(bytesBesideTheClock(join(out, one)), one).toBe(bytesBesideTheClock(join(out, 'cold.json')));

  const kept = readTerrain(repo, base, { code: codeKey(), config: configKey(DEFAULT_CONFIG, HISTORY_WINDOW) });
  const ground = kept.hit ? kept.terrain.layout : undefined;
  const map = assertMap(JSON.parse(readFileSync(join(out, 'cached.json'), 'utf8')));
  const layout = map.terrain.layout;
  // The edited file and the untouched ones stand where the base put them; only the added file is new.
  const moved = Object.keys(layout?.positions ?? {}).filter((id) => JSON.stringify(layout?.positions[id]) !== JSON.stringify(ground?.positions[id]));
  expect(moved).toEqual(['src/square.ts']);
  expect(layout?.contours).toEqual(computeMembranes({ cells: map.terrain.cells, groups: map.terrain.groups, positions: layout?.positions ?? {} }));
}, MINUTE);

test('a base the cache has not seen relaxes from the nearest ancestor it has, and never from a descendant (D97)', () => {
  const { repo, git } = twoCommits();
  write(join(repo, 'src', 'cube.ts'), "import { square } from './square.js';\n\nexport function cube(side: number): number {\n  return square(side) * side;\n}\n");
  git('add', '.');
  git('commit', '--quiet', '-m', 'feat: measure a cube');
  const [first, second, third] = [git('rev-parse', 'HEAD~2'), git('rev-parse', 'HEAD~1'), git('rev-parse', 'HEAD')];
  const out = (name: string): string => join(temp('near'), `${name}.json`);

  expect(run({ repo, base: first, out: out('first'), verbose: true }).stderr).toContain('miss (no entry), laid out cold');
  expect(run({ repo, base: third, out: out('third'), verbose: true }).stderr).toContain(`miss (no entry), relaxed from ${first}`);
  // The middle commit's nearest kept ancestor is the first; the third, kept too, is its descendant.
  expect(run({ repo, base: second, out: out('second'), verbose: true }).stderr).toContain(`miss (no entry), relaxed from ${first}`);

  // An ancestor kept under other code is no prior.
  rmSync(terrainPath(repo, second));
  const kept: unknown = JSON.parse(readFileSync(terrainPath(repo, first), 'utf8'));
  writeFileSync(terrainPath(repo, first), JSON.stringify({ ...(kept as object), key: { code: '0'.repeat(64), config: KEY.config } }));
  expect(run({ repo, base: second, out: out('again'), verbose: true }).stderr).toContain('miss (no entry), laid out cold');

  // With the cache off, nothing is looked for and the base is laid out from nothing.
  const off = run({ repo, base: second, out: out('off'), verbose: true, cache: false });
  expect(off.stderr).toContain('terrain cache off (--no-cache)');
  expect(off.stderr).not.toMatch(/cache near/);
}, MINUTE);

test('the entry points fallow listed for a head commit read back under the key they were kept by, and a fallback is never kept (D136, D172)', () => {
  const repo = temp('entries');
  const key: StructureKey = { code: 'c'.repeat(64), fallow: '3.22.0' };
  const listed = { entries: [{ path: 'src/index.ts', tag: 'package.json main' }], lookup: { source: 'fallow' } } as const;

  expect(readEntries(repo, SHA, key)).toBeUndefined();
  expect(writeEntries(repo, SHA, key, listed)).toBe(entriesPath(repo, SHA));
  expect(readEntries(repo, SHA, key)).toEqual(listed);
  expect(readEntries(repo, SHA, { ...key, fallow: '3.23.0' })).toBeUndefined();
  expect(readEntries(repo, SHA, { ...key, code: 'd'.repeat(64) })).toBeUndefined();
  expect(readEntries(repo, OTHER_SHA, key)).toBeUndefined();
  writeFileSync(entriesPath(repo, SHA), '{ not json');
  expect(readEntries(repo, SHA, key)).toBeUndefined();

  // The manifests standing in for a fallow that would not run say nothing of the next run's.
  expect(writeEntries(repo, OTHER_SHA, key, { entries: [], lookup: { source: 'manifests', reason: 'fallow list timed out after 60 s' } })).toBeUndefined();
  expect(existsSync(entriesPath(repo, OTHER_SHA))).toBe(false);
});

/** A commit's extraction that must never be made. */
function neverExtracted(): string {
  throw new Error('the commit was extracted');
}

/** The mean distance the files both layouts place moved from the first to the second, over those `kept` keeps. */
function meanDisplacement(from: Layout | undefined, to: Layout | undefined, kept: (path: string) => boolean = () => true): number {
  const moved = Object.keys(to?.positions ?? {}).flatMap((path) => {
    const was = from?.positions[path];
    const now = to?.positions[path];
    return was === undefined || now === undefined || !kept(path) ? [] : [Math.hypot(now.x - was.x, now.y - was.y)];
  });
  return moved.reduce((total, distance) => total + distance, 0) / moved.length;
}

/**
 * Two consecutive commits of this repository (D97): step 112's, which
 * recorded the outside packages, and step 113's, which drew the planet over
 * them. Fourteen files changed between them, three of them added.
 */
const BEFORE = '3af7b74d1c0f926d461c7c8c9565dd0148ba4f4c';
const AFTER = 'f4f44ba4e7896dcf72dd111d80d85a452d746fb3';
/** The mean distance, in the field's units, the unchanged files may move when the second commit relaxes from the first. */
const DISPLACEMENT_BOUND = 4;

test('on two consecutive commits of this repo, unchanged files move less than the pinned bound relaxed, and more laid out cold (D97, D136)', () => {
  const repo = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: dirname(fileURLToPath(import.meta.url)), encoding: 'utf8' }).trim();
  const changed = new Set(execFileSync('git', ['diff', '--name-only', BEFORE, AFTER], { cwd: repo, encoding: 'utf8' }).trim().split('\n'));
  const treeAt = (sha: string): string => {
    const root = temp('commit');
    const tree = join(root, 'tree');
    mkdirSync(tree);
    execFileSync('git', ['archive', '--format=tar', '-o', join(root, 'commit.tar'), sha], { cwd: repo });
    execFileSync('tar', ['-xf', join(root, 'commit.tar'), '-C', tree]);
    return tree;
  };
  const [beforeTree, afterTree] = [treeAt(BEFORE), treeAt(AFTER)];
  const first = readTree(beforeTree, { repo });
  const before = layOutTerrain(first.scan, DEFAULT_CONFIG);
  const after: Scan = scanImports(afterTree, { repo });

  // The second commit's scan, reading only the files the diff touched over the first's reads, is the full scan (D136),
  // and so is the one read from git's own objects, which never extracts the commit when the entry points are kept (D172).
  expect(readTree(afterTree, { repo, prior: { parsed: first.parsed, touched: changed } }).scan).toEqual(after);
  const fromGit = readCommit(AFTER, { repo, prior: { parsed: first.parsed, touched: changed }, extracted: () => afterTree });
  expect(fromGit.scan).toEqual(after);
  expect(readCommit(AFTER, { repo, prior: { parsed: first.parsed, touched: changed }, entryPoints: fromGit.entryPoints, extracted: neverExtracted }).scan).toEqual(after);

  const relaxed = layOutTerrain(after, DEFAULT_CONFIG, before);
  const cold = layOutTerrain(after, DEFAULT_CONFIG);
  const unchanged = (path: string): boolean => !changed.has(path);

  expect(meanDisplacement(before, relaxed, unchanged)).toBeLessThan(DISPLACEMENT_BOUND);
  expect(meanDisplacement(before, cold, unchanged)).toBeGreaterThan(DISPLACEMENT_BOUND);
  // One prior and one input lay out one field.
  expect(JSON.stringify(layOutTerrain(after, DEFAULT_CONFIG, before))).toBe(JSON.stringify(relaxed));
}, MINUTE);

test('--history caps the window a run reads, and a terrain kept under one cap is not read under another (D50)', () => {
  const { repo } = twoCommits();
  const dir = temp('history');
  const out = (name: string): string => join(dir, `${name}.json`);

  const capped = run({ repo, base: 'HEAD', out: out('capped'), verbose: true, history: 1 });
  expect(capped.exitCode, capped.stderr).toBe(0);
  expect(assertMap(JSON.parse(readFileSync(out('capped'), 'utf8'))).terrain.history.window_commits).toBe(1);

  const whole = run({ repo, base: 'HEAD', out: out('whole'), verbose: true });
  expect(whole.stderr).toContain('terrain cache miss (config changed)');
  expect(assertMap(JSON.parse(readFileSync(out('whole'), 'utf8'))).terrain.history.window_commits).toBe(2);
}, MINUTE);
