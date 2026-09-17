import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

import { diffManifests, parseDiff, readDiff, readManifests } from '../sources/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, '..', '..', 'fixtures', 'diff');

function fixture(name: string): string {
  return readFileSync(join(FIXTURES, name), 'utf8');
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
