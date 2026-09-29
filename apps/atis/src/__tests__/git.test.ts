import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, expect, test } from 'vitest';

import { diffManifests, parseDiff, parseLog, readDiff, readLog, readManifests } from '../sources/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, '..', '..', 'fixtures', 'diff');
const LOG_FIXTURES = join(HERE, '..', '..', 'fixtures', 'log');

function fixture(name: string): string {
  return readFileSync(join(FIXTURES, name), 'utf8');
}

function logFixture(name: string): string {
  return readFileSync(join(LOG_FIXTURES, name), 'utf8');
}

const repos: string[] = [];

afterAll(() => {
  for (const dir of repos) rmSync(dir, { recursive: true, force: true });
});

/** A throwaway repo whose commits carry no author config of the machine running the test. */
function tempRepo(prefix: string): { readonly dir: string; readonly git: (args: readonly string[]) => string } {
  const dir = mkdtempSync(join(tmpdir(), `atis-git-${prefix}-`));
  repos.push(dir);
  const git = (args: readonly string[]): string =>
    execFileSync('git', ['-c', 'user.name=atis', '-c', 'user.email=atis@example.invalid', '-c', 'commit.gpgsign=false', ...args], {
      cwd: dir,
      encoding: 'utf8',
    });
  git(['init', '--quiet']);
  return { dir, git };
}

function writeJson(dir: string, path: string, value: unknown): void {
  mkdirSync(dirname(join(dir, path)), { recursive: true });
  writeFileSync(join(dir, path), `${JSON.stringify(value, null, 2)}\n`);
}

test('parseDiff turns captured name-status, numstat and unified text into sorted changed[]', () => {
  const changed = parseDiff(fixture('name-status.txt'), fixture('numstat.txt'), fixture('unified.txt'));
  expect(changed).toEqual([
    { path: 'src/keep/added.ts', kind: 'added', added: 1, deleted: 0, hunks: [{ start: 1, count: 1 }] },
    { path: 'src/keep/deleted.ts', kind: 'deleted', added: 0, deleted: 1, hunks: [] },
    { path: 'src/keep/logo.png', kind: 'added', added: 0, deleted: 0, hunks: [] },
    { path: 'src/keep/modified.ts', kind: 'modified', added: 1, deleted: 1, hunks: [{ start: 2, count: 1 }] },
    {
      path: 'src/other/renamed.ts',
      kind: 'renamed',
      from: 'src/dir/old.ts',
      added: 1,
      deleted: 0,
      hunks: [{ start: 3, count: 1 }],
    },
  ]);
});

test('parseDiff keeps a pure deletion as a hunk of no lines at the head line it follows (D73)', () => {
  const unified = [
    'diff --git a/src/keep/modified.ts b/src/keep/modified.ts',
    '--- a/src/keep/modified.ts',
    '+++ b/src/keep/modified.ts',
    '@@ -5,2 +4,0 @@ export function f() {',
    '-  const a = 1;',
    '-  const b = 2;',
    '@@ -9 +7 @@ export function f() {',
    '-  return a;',
    '+  return 0;',
    '',
  ].join('\n');
  const [file] = parseDiff('M\tsrc/keep/modified.ts\n', '1\t3\tsrc/keep/modified.ts\n', unified);
  expect(file?.hunks).toEqual([
    { start: 4, count: 0 },
    { start: 7, count: 1 },
  ]);
});

test('diffManifests reports a new dependency or devDependency, never a bumped range', () => {
  const before = JSON.stringify({
    name: 'pkg',
    dependencies: { 'left-pad': '^1.0.0' },
    devDependencies: { vitest: '^2.0.0' },
  });
  const after = JSON.stringify({
    name: 'pkg',
    dependencies: { 'left-pad': '^1.0.1', chalk: '^5.0.0' },
    devDependencies: { vitest: '^2.0.0', eslint: '^9.0.0' },
  });
  expect(diffManifests('apps/pkg/package.json', before, after)).toEqual([
    { manifest: 'apps/pkg/package.json', name: 'chalk', range: '^5.0.0', dev: false },
    { manifest: 'apps/pkg/package.json', name: 'eslint', range: '^9.0.0', dev: true },
  ]);
});

test('diffManifests treats a manifest born or removed at HEAD without faking a delta (C2)', () => {
  expect(diffManifests('libs/new/package.json', undefined, JSON.stringify({ dependencies: { zod: '^3.0.0' } }))).toEqual([
    { manifest: 'libs/new/package.json', name: 'zod', range: '^3.0.0', dev: false },
  ]);
  expect(diffManifests('libs/gone/package.json', JSON.stringify({ dependencies: { zod: '^3.0.0' } }), undefined)).toEqual([]);
  expect(diffManifests('libs/broken/package.json', '{ not json', JSON.stringify({ dependencies: { zod: '^3.0.0' } }))).toEqual([
    { manifest: 'libs/broken/package.json', name: 'zod', range: '^3.0.0', dev: false },
  ]);
});

test('parseLog turns captured header and numstat lines into commits[], no blank line needed between a commit and the next header', () => {
  const commits = parseLog(logFixture('log.txt'));
  expect(commits).toEqual([
    { sha: 'c3', time: 1_700_007_200, subject: 'chore: binary asset', files: [{ path: 'assets/logo.png', added: 0, deleted: 0 }] },
    { sha: 'c2', time: 1_700_003_600, subject: 'fix: bug in a', files: [{ path: 'src/a.ts', added: 1, deleted: 1 }] },
    {
      sha: 'c1',
      time: 1_700_000_000,
      subject: 'feat: add a and b',
      files: [
        { path: 'src/a.ts', added: 3, deleted: 0 },
        { path: 'src/b.ts', added: 2, deleted: 0 },
      ],
    },
  ]);
});

test('readLog against this repo with HEAD: no author field anywhere (C6), and the git log wall time is recorded', () => {
  const repo = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: HERE, encoding: 'utf8' }).trim();

  const started = performance.now();
  const commits = readLog(repo, 'HEAD');
  const elapsedMs = performance.now() - started;
  // eslint-disable-next-line no-console -- D50: the integration test records the git log wall time on this repo.
  console.log(`readLog(HEAD) over ${String(commits.length)} commits took ${elapsedMs.toFixed(1)}ms`);

  expect(commits.length).toBeGreaterThan(0);
  expect(commits.length).toBeLessThanOrEqual(5000);
  const shas = commits.map((commit) => commit.sha);
  expect(new Set(shas).size).toBe(shas.length);
  for (const commit of commits) {
    expect(commit.sha).toMatch(/^[0-9a-f]{40}$/);
    expect(Number.isInteger(commit.time)).toBe(true);
    expect(commit).not.toHaveProperty('author');
    expect(commit).not.toHaveProperty('email');
    for (const file of commit.files) {
      expect(file.added).toBeGreaterThanOrEqual(0);
      expect(file.deleted).toBeGreaterThanOrEqual(0);
    }
  }
});

test('readDiff against this repo with --base HEAD~1', () => {
  const repo = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: HERE, encoding: 'utf8' }).trim();
  const expectedMergeBase = execFileSync('git', ['rev-parse', 'HEAD~1'], { cwd: repo, encoding: 'utf8' }).trim();

  const diff = readDiff(repo, 'HEAD~1');
  expect(diff.merge_base).toBe(expectedMergeBase);
  expect(diff.changed.length).toBeGreaterThan(0);
  const paths = diff.changed.map((change) => change.path);
  expect(paths).toEqual(paths.toSorted());
  for (const change of diff.changed) {
    expect(['added', 'modified', 'deleted', 'renamed']).toContain(change.kind);
    expect(change.added).toBeGreaterThanOrEqual(0);
    expect(change.deleted).toBeGreaterThanOrEqual(0);
  }

  const depsAdded = readManifests(repo, diff.merge_base);
  expect(Array.isArray(depsAdded)).toBe(true);
  for (const dep of depsAdded) {
    expect(typeof dep.manifest).toBe('string');
    expect(typeof dep.name).toBe('string');
  }
});

test('readManifests reads the members of a package.json workspaces repo, with no pnpm-workspace.yaml (D64)', () => {
  const { dir, git } = tempRepo('workspaces');
  writeJson(dir, 'package.json', { name: 'root', private: true, workspaces: ['packages/*'] });
  writeJson(dir, 'packages/a/package.json', { name: 'a', dependencies: { 'left-pad': '^1.0.0' } });
  writeJson(dir, 'examples/demo/package.json', { name: 'demo' });
  git(['add', '--all']);
  git(['commit', '--quiet', '--no-verify', '-m', 'base']);
  const base = git(['rev-parse', 'HEAD']).trim();

  writeJson(dir, 'packages/a/package.json', { name: 'a', dependencies: { 'left-pad': '^1.0.0', zod: '^3.0.0' } });
  writeJson(dir, 'examples/demo/package.json', { name: 'demo', dependencies: { chalk: '^5.0.0' } });
  git(['commit', '--quiet', '--no-verify', '--all', '-m', 'head']);

  expect(readManifests(dir, base)).toEqual([{ manifest: 'packages/a/package.json', name: 'zod', range: '^3.0.0', dev: false }]);
});
