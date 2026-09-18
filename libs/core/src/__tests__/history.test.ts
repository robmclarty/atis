import { expect, test } from 'vitest';

import { computeHistory } from '../history.js';
import type { Commit } from '../history.js';

const DAY = 86_400;

function commit(sha: string, time: number, subject: string, files: readonly [string, number, number][]): Commit {
  return { sha, time, subject, files: files.map(([path, added, deleted]) => ({ path, added, deleted })) };
}

test('3-of-4 co-commits with a changed file gives its co-change rate 0.75 and support 3 (CHID eq. 3)', () => {
  const commits: Commit[] = [
    commit('c1', 1_000, 'feat: a', [['src/a.ts', 1, 0]]),
    commit('c2', 2_000, 'feat: a and b', [
      ['src/a.ts', 1, 0],
      ['src/b.ts', 1, 0],
    ]),
    commit('c3', 3_000, 'feat: a and b again', [
      ['src/a.ts', 1, 0],
      ['src/b.ts', 1, 0],
    ]),
    commit('c4', 4_000, 'feat: a and b once more', [
      ['src/a.ts', 1, 0],
      ['src/b.ts', 1, 0],
    ]),
  ];

  const { cochange } = computeHistory(commits, new Map(), ['src/a.ts'], 4_000);
  expect(cochange).toEqual([{ a: 'src/a.ts', b: 'src/b.ts', rate: 0.75, support: 3 }]);
});

test('churn ratio is the window\'s added+deleted lines over current loc, age in days since the first commit, bug-fix rate the matching share', () => {
  const commits: Commit[] = [
    commit('c1', 0, 'feat: add a', [['src/a.ts', 10, 0]]),
    commit('c2', 5 * DAY, 'fix: a regression', [['src/a.ts', 2, 3]]),
  ];

  const [file] = computeHistory(commits, new Map([['src/a.ts', 30]]), ['src/a.ts'], 10 * DAY).files;
  expect(file).toEqual({ path: 'src/a.ts', churn_ratio: 15 / 30, age_days: 10, bugfix_rate: 0.5 });
});

test('a changed file with no commit in the window carries no history field, never a faked zero (C2)', () => {
  const { files, cochange } = computeHistory([], new Map([['src/untouched.ts', 10]]), ['src/untouched.ts'], 0);
  expect(files).toEqual([{ path: 'src/untouched.ts' }]);
  expect(cochange).toEqual([]);
});

test('an unknown current loc leaves churn ratio unset rather than dividing by a faked value (C2)', () => {
  const commits: Commit[] = [commit('c1', 0, 'feat: add a', [['src/a.ts', 4, 0]])];
  const [file] = computeHistory(commits, new Map(), ['src/a.ts'], 0).files;
  expect(file).toEqual({ path: 'src/a.ts', age_days: 0, bugfix_rate: 0 });
});

test('window_commits counts every commit handed in, and results are sorted by path (C3)', () => {
  const commits: Commit[] = [
    commit('c1', 0, 'feat: b', [['src/b.ts', 1, 0]]),
    commit('c2', 1, 'feat: a', [['src/a.ts', 1, 0]]),
  ];
  const result = computeHistory(commits, new Map(), ['src/b.ts', 'src/a.ts'], 1);
  expect(result.window_commits).toBe(2);
  expect(result.files.map((file) => file.path)).toEqual(['src/a.ts', 'src/b.ts']);
});

test('cochange only ever names a changed file as `a`, and only files it actually shares a commit with', () => {
  const commits: Commit[] = [
    commit('c1', 0, 'feat: a, b and c', [
      ['src/a.ts', 1, 0],
      ['src/b.ts', 1, 0],
      ['src/c.ts', 1, 0],
    ]),
  ];
  const { cochange } = computeHistory(commits, new Map(), ['src/a.ts'], 0);
  expect(cochange).toEqual([
    { a: 'src/a.ts', b: 'src/b.ts', rate: 1, support: 1 },
    { a: 'src/a.ts', b: 'src/c.ts', rate: 1, support: 1 },
  ]);
});
