import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, expect, test } from 'vitest';

import { commitOf, diffManifests, parseDiff, parseLog, readDiff, readLog, readManifests, resolveBase, resolveTrunk, workingTree } from '../sources/index.js';

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

test('diffManifests reports a new dependency or devDependency as added, and a bumped range as moved with its from (D47, D83)', () => {
  const before = JSON.stringify({
    name: 'pkg',
    dependencies: { 'left-pad': '^1.0.0' },
    devDependencies: { vitest: '^2.0.0', typescript: '~5.9.0' },
  });
  const after = JSON.stringify({
    name: 'pkg',
    dependencies: { 'left-pad': '^1.0.1', chalk: '^5.0.0' },
    devDependencies: { vitest: '^2.0.0', eslint: '^9.0.0', typescript: '~6.0.0' },
  });
  expect(diffManifests('apps/pkg/package.json', before, after)).toEqual({
    deps_added: [
      { manifest: 'apps/pkg/package.json', name: 'chalk', range: '^5.0.0', dev: false },
      { manifest: 'apps/pkg/package.json', name: 'eslint', range: '^9.0.0', dev: true },
    ],
    deps_moved: [
      { manifest: 'apps/pkg/package.json', name: 'left-pad', range: '^1.0.1', from: '^1.0.0', dev: false },
      { manifest: 'apps/pkg/package.json', name: 'typescript', range: '~6.0.0', from: '~5.9.0', dev: true },
    ],
  });
});

test('diffManifests treats a manifest born or removed at HEAD without faking a delta (C2)', () => {
  expect(diffManifests('libs/new/package.json', undefined, JSON.stringify({ dependencies: { zod: '^3.0.0' } }))).toEqual({
    deps_added: [{ manifest: 'libs/new/package.json', name: 'zod', range: '^3.0.0', dev: false }],
    deps_moved: [],
  });
  expect(diffManifests('libs/gone/package.json', JSON.stringify({ dependencies: { zod: '^3.0.0' } }), undefined)).toEqual({
    deps_added: [],
    deps_moved: [],
  });
  expect(diffManifests('libs/broken/package.json', '{ not json', JSON.stringify({ dependencies: { zod: '^3.0.0' } }))).toEqual({
    deps_added: [{ manifest: 'libs/broken/package.json', name: 'zod', range: '^3.0.0', dev: false }],
    deps_moved: [],
  });
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
  // This repository's log takes about two seconds alone, and more beside the whole suite: it is measured, never raced (D50).
}, 60_000);

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

  const delta = readManifests(repo, diff.merge_base);
  for (const dep of [...delta.deps_added, ...delta.deps_moved]) {
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

  writeJson(dir, 'packages/a/package.json', { name: 'a', dependencies: { 'left-pad': '^1.1.0', zod: '^3.0.0' } });
  writeJson(dir, 'examples/demo/package.json', { name: 'demo', dependencies: { chalk: '^5.0.0' } });
  git(['commit', '--quiet', '--no-verify', '--all', '-m', 'head']);

  const delta = {
    deps_added: [{ manifest: 'packages/a/package.json', name: 'zod', range: '^3.0.0', dev: false }],
    deps_moved: [{ manifest: 'packages/a/package.json', name: 'left-pad', range: '^1.1.0', from: '^1.0.0', dev: false }],
  };
  expect(readManifests(dir, base)).toEqual(delta);

  // Handed the diff's paths it reads only the manifests among them, and one it was not handed moved nothing (D136).
  expect(readManifests(dir, base, ['examples/demo/package.json', 'packages/a/package.json'])).toEqual(delta);
  expect(readManifests(dir, base, ['packages/a/src/index.ts'])).toEqual({ deps_added: [], deps_moved: [] });
  expect(readManifests(dir, base, [])).toEqual({ deps_added: [], deps_moved: [] });
});

/**
 * An origin repository whose first branch is `first`, with one commit on it
 * and one more branch at that commit for each of `others`, cloned: the clone
 * has `first` checked out and every branch on `origin/`.
 */
function clonedOrigin(prefix: string, first: string, others: readonly string[] = [], files: Readonly<Record<string, unknown>> = {}): { readonly dir: string; readonly git: (args: readonly string[]) => string } {
  const origin = tempRepo(`${prefix}-origin`);
  origin.git(['checkout', '--quiet', '-b', first]);
  writeJson(origin.dir, 'package.json', { name: prefix });
  for (const [path, value] of Object.entries(files)) writeJson(origin.dir, path, value);
  origin.git(['add', '--all']);
  origin.git(['commit', '--quiet', '--no-verify', '-m', 'first']);
  for (const branch of others) origin.git(['branch', branch]);

  const clone = tempRepo(`${prefix}-clone`);
  rmSync(clone.dir, { recursive: true, force: true });
  execFileSync('git', ['clone', '--quiet', origin.dir, clone.dir], { stdio: 'ignore' });
  return clone;
}

test('the trunk is the first of main, master, develop and trunk, local before origin/ (D99)', () => {
  expect(resolveTrunk(clonedOrigin('main', 'main', ['master', 'develop']).dir)).toBe('main');
  expect(resolveTrunk(clonedOrigin('develop', 'feature', ['trunk', 'develop']).dir)).toBe('origin/develop');

  // A clone on a feature branch with no local trunk finds it on origin/.
  const { dir, git } = clonedOrigin('remote', 'master');
  expect(resolveTrunk(dir)).toBe('master');
  git(['checkout', '--quiet', '-b', 'feature']);
  git(['branch', '--quiet', '-D', 'master']);
  expect(resolveTrunk(dir)).toBe('origin/master');

  expect(() => resolveTrunk(clonedOrigin('none', 'work').dir)).toThrow(/no trunk: none of main, master, develop, trunk is a branch/);
});

test('a trunk atis.config.json names at the head outranks the candidates; a broken one throws (D28, D99)', () => {
  expect(resolveTrunk(clonedOrigin('configured', 'main', ['release'], { 'atis.config.json': { trunk: 'release' } }).dir)).toBe('origin/release');
  expect(resolveTrunk(clonedOrigin('silent', 'main', [], { 'atis.config.json': {} }).dir)).toBe('main');
  expect(() => resolveTrunk(clonedOrigin('missing', 'main', [], { 'atis.config.json': { trunk: 'gone' } }).dir)).toThrow(/the trunk atis.config.json names, gone, is no branch/);
  expect(() => resolveTrunk(clonedOrigin('typed', 'main', [], { 'atis.config.json': { trunk: 7 } }).dir)).toThrow(/trunk must name a branch/);

  const broken = clonedOrigin('broken', 'main');
  writeFileSync(join(broken.dir, 'atis.config.json'), '{ "trunk": ');
  broken.git(['add', '--all']);
  broken.git(['commit', '--quiet', '--no-verify', '-m', 'break the config']);
  expect(() => resolveTrunk(broken.dir)).toThrow(/atis.config.json is not JSON/);
});

test('resolveBase reads a typed ref, the last commit and the last tag, and says how each was asked (D99)', () => {
  const { dir, git } = clonedOrigin('bases', 'main');
  const commit = (message: string): void => {
    writeJson(dir, 'package.json', { name: message });
    git(['commit', '--quiet', '--no-verify', '--all', '-m', message]);
  };
  expect(() => resolveBase(dir, { last: 'commit' })).toThrow(/--last-commit: HEAD has no parent/);
  expect(() => resolveBase(dir, { last: 'tag' })).toThrow(/--last-tag: no tag is reachable from HEAD/);

  git(['tag', 'v1']);
  commit('second');
  git(['tag', '-a', '-m', 'v2', 'v2']);
  commit('third');

  expect(resolveBase(dir, undefined)).toEqual({ ref: 'main' });
  expect(resolveBase(dir, 'v1')).toEqual({ ref: 'v1', typed: '--base v1' });
  expect(resolveBase(dir, { last: 'commit' })).toEqual({ ref: 'HEAD~1', typed: '--last-commit' });
  expect(resolveBase(dir, { last: 'tag' })).toEqual({ ref: 'v2', typed: '--last-tag' });
  // A shortcut counts back from the head it was asked against.
  expect(resolveBase(dir, { last: 'commit' }, 'v2')).toEqual({ ref: 'v2~1', typed: '--last-commit' });
  expect(resolveBase(dir, { last: 'tag' }, 'v2~1')).toEqual({ ref: 'v1', typed: '--last-tag' });

  expect(() => resolveBase(dir, 'nowhere')).toThrow(/--base nowhere names no commit/);
  // A ref that starts with a dash names no commit: git would read it as a flag (D134).
  expect(commitOf(dir, '--all')).toBeUndefined();
  expect(() => resolveBase(dir, '--all')).toThrow(/names no commit/);
});

test('readDiff and readManifests read the change at a head other than HEAD (D99)', () => {
  const { dir, git } = tempRepo('other-head');
  writeJson(dir, 'package.json', { name: 'demo' });
  git(['add', '--all']);
  git(['commit', '--quiet', '--no-verify', '-m', 'base']);
  const base = git(['rev-parse', 'HEAD']).trim();
  writeJson(dir, 'package.json', { name: 'demo', dependencies: { zod: '^3.0.0' } });
  git(['commit', '--quiet', '--no-verify', '--all', '-m', 'add zod']);
  const head = git(['rev-parse', 'HEAD']).trim();
  git(['checkout', '--quiet', base]);

  expect(readDiff(dir, base).changed).toEqual([]);
  expect(readDiff(dir, base, head).changed.map((change) => change.path)).toEqual(['package.json']);
  expect(readManifests(dir, base, ['package.json'], head).deps_added).toEqual([{ manifest: 'package.json', name: 'zod', range: '^3.0.0', dev: false }]);
});

test('workingTree writes the tree as it stands, staged, unstaged and untracked, the ignored left out and the index untouched (D99)', () => {
  const { dir, git } = tempRepo('working');
  writeFileSync(join(dir, '.gitignore'), 'ignored.txt\n');
  writeJson(dir, 'package.json', { name: 'demo' });
  writeFileSync(join(dir, 'staged.txt'), 'before\n');
  writeFileSync(join(dir, 'unstaged.txt'), 'before\n');
  git(['add', '--all']);
  git(['commit', '--quiet', '--no-verify', '-m', 'base']);
  const base = git(['rev-parse', 'HEAD']).trim();

  writeFileSync(join(dir, 'staged.txt'), 'staged\n');
  git(['add', 'staged.txt']);
  writeFileSync(join(dir, 'unstaged.txt'), 'unstaged\n');
  writeFileSync(join(dir, 'untracked.txt'), 'untracked\n');
  writeFileSync(join(dir, 'ignored.txt'), 'ignored\n');
  const status = git(['status', '--porcelain']);

  const tree = workingTree(dir);
  expect(git(['ls-tree', '-r', '--name-only', tree]).trim().split('\n')).toEqual(['.gitignore', 'package.json', 'staged.txt', 'unstaged.txt', 'untracked.txt']);
  expect(git(['show', `${tree}:unstaged.txt`])).toBe('unstaged\n');
  // The reviewer's own index still stages what it staged, and nothing more.
  expect(git(['status', '--porcelain'])).toBe(status);
  expect(git(['diff', '--cached', '--name-only']).trim()).toBe('staged.txt');

  const diff = readDiff(dir, base, 'HEAD', tree);
  expect(diff.merge_base).toBe(base);
  expect(diff.changed.map((change) => [change.path, change.kind])).toEqual([
    ['staged.txt', 'modified'],
    ['unstaged.txt', 'modified'],
    ['untracked.txt', 'added'],
  ]);
  // A clean tree is the head commit's own tree.
  git(['add', '--all']);
  git(['commit', '--quiet', '--no-verify', '-m', 'head']);
  expect(workingTree(dir)).toBe(git(['rev-parse', 'HEAD^{tree}']).trim());
});
