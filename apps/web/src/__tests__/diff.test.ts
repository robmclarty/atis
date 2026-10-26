import { DEFAULT_EDITOR, editorLink } from 'core';
import type { ChangedFile } from 'core';
import { expect, test } from 'vitest';

import { diffHref, diffLevelOf, loadDiff, parseDiff, prOf, rangeOf, readServedDiff } from '../diff.js';
import type { FetchDiff, ServedDiff } from '../diff.js';

/**
 * The diff level as the page reads it (§6's LOD4, D102): the served diff
 * parsed into rows with each hunk's head linked to the file at its line
 * through the editor template, the PR's link when the page was told one, and
 * a fixture's hunks' line ranges alone (C2).
 */

const DIFF = [
  'diff --git a/src/shapes.ts b/src/shapes.ts',
  'index 1111111..2222222 100644',
  '--- a/src/shapes.ts',
  '+++ b/src/shapes.ts',
  '@@ -1,3 +1,4 @@',
  ' export function area(width: number, height: number): number {',
  '-  return width * height;',
  '+  const product = width * height;',
  '+  return Math.abs(product);',
  ' }',
  '@@ -20,2 +21 @@ export function perimeter(width: number, height: number): number {',
  '-  // twice each side',
  '   return 2 * (width + height);',
  '\\ No newline at end of file',
  '',
].join('\n');

const MODIFIED: ChangedFile = {
  path: 'src/shapes.ts',
  kind: 'modified',
  cell: 'folder:src',
  is_barrel: false,
  added: 2,
  deleted: 2,
  hunks: [
    { start: 1, count: 4 },
    { start: 21, count: 1 },
  ],
};

const SERVED: ServedDiff = { path: 'src/shapes.ts', diff: DIFF, root: '/Users/reader/My Repo', editor: DEFAULT_EDITOR };

test('a diff is asked for at /diff/<path>, each segment escaped, with the run token', () => {
  expect(diffHref('src/shapes.ts', 'a1')).toBe('/diff/src/shapes.ts?token=a1');
  expect(diffHref('src/odd #name?.ts', 'a&b')).toBe('/diff/src/odd%20%23name%3F.ts?token=a%26b');
});

test("a unified diff parses into each hunk's head and its lines, with each added or kept line's head-side number, the header and git's notes left out", () => {
  expect(parseDiff(DIFF)).toEqual([
    { kind: 'hunk', text: '@@ -1,3 +1,4 @@', line: 1 },
    { kind: 'context', text: ' export function area(width: number, height: number): number {', line: 1 },
    { kind: 'deleted', text: '-  return width * height;' },
    { kind: 'added', text: '+  const product = width * height;', line: 2 },
    { kind: 'added', text: '+  return Math.abs(product);', line: 3 },
    { kind: 'context', text: ' }', line: 4 },
    { kind: 'hunk', text: '@@ -20,2 +21 @@ export function perimeter(width: number, height: number): number {', line: 21 },
    { kind: 'deleted', text: '-  // twice each side' },
    { kind: 'context', text: '   return 2 * (width + height);', line: 21 },
  ]);
  // A binary file's diff, and a new file's that git counts from line 0, read as they are.
  expect(parseDiff('diff --git a/logo.png b/logo.png\nBinary files a/logo.png and b/logo.png differ\n')).toEqual([]);
  expect(parseDiff('@@ -1 +0,0 @@\n-gone\n')).toEqual([
    { kind: 'hunk', text: '@@ -1 +0,0 @@', line: 1 },
    { kind: 'deleted', text: '-gone' },
  ]);
});

test("a hunk's head-side lines read as one line, a run, or where a deletion fell", () => {
  expect(rangeOf({ start: 12, count: 1 })).toBe('line 12');
  expect(rangeOf({ start: 12, count: 7 })).toBe('lines 12-18');
  expect(rangeOf({ start: 40, count: 0 })).toBe('removed after line 40');
});

test('the editor link fills the template, escaping every segment, and never runs a script (D102)', () => {
  expect(editorLink(DEFAULT_EDITOR, { root: '/Users/reader/My Repo/', path: 'src/odd #name.ts', line: 7 })).toBe('vscode://file/Users/reader/My%20Repo/src/odd%20%23name.ts:7');
  expect(editorLink('https://forge.example/o/r/blob/main/{path}#L{line}', { root: '/r', path: 'src/a.ts', line: 0 })).toBe('https://forge.example/o/r/blob/main/src/a.ts#L1');
  // A file's name cannot make a scheme, since its colon is escaped; a template that is one is never filled.
  expect(editorLink('{path}', { root: '/r', path: 'javascript:alert(1)', line: 1 })).toBe('javascript%3Aalert(1)');
  expect(editorLink(' JavaScript:open("{path}")', { root: '/r', path: 'src/a.ts', line: 1 })).toBeUndefined();
});

test('only an https PR is taken from the page, since it is written as a link', () => {
  expect(prOf('?token=a&pr=https%3A%2F%2Fgithub.com%2Fo%2Fr%2Fpull%2F4')).toBe('https://github.com/o/r/pull/4');
  expect(prOf('?pr=javascript:alert(1)')).toBeUndefined();
  expect(prOf('?pr=http://github.com/o/r/pull/4')).toBeUndefined();
  expect(prOf('?pr=not a url')).toBeUndefined();
  expect(prOf('?token=a')).toBeUndefined();
});

test('a served answer is held to its shape', () => {
  expect(readServedDiff(SERVED)).toEqual(SERVED);
  expect(readServedDiff({ ...SERVED, diff: 3 })).toBeUndefined();
  expect(readServedDiff([SERVED])).toBeUndefined();
  expect(readServedDiff(null)).toBeUndefined();
});

test("served, the level shows the diff's rows, each hunk's head linked to the file at its line, and the file at its first hunk beside the PR", () => {
  const level = diffLevelOf(MODIFIED, { status: 'served', diff: SERVED }, 'https://github.com/o/r/pull/4');
  expect(level.title).toBe('src/shapes.ts');
  expect(level.ranges).toEqual(['lines 1-4', 'line 21']);
  expect(level.editor).toBe('vscode://file/Users/reader/My%20Repo/src/shapes.ts:1');
  expect(level.pr).toBe('https://github.com/o/r/pull/4');
  expect(level.note).toBe('');
  expect(level.rows.filter((row) => row.kind === 'hunk').map((row) => row.href)).toEqual(['vscode://file/Users/reader/My%20Repo/src/shapes.ts:1', 'vscode://file/Users/reader/My%20Repo/src/shapes.ts:21']);
  expect(level.rows).toHaveLength(9);
});

test('an added file is written with its +, and a deleted one shows its diff with nothing to open (D120)', () => {
  const added = diffLevelOf({ ...MODIFIED, kind: 'added', hunks: [{ start: 1, count: 3 }] }, { status: 'served', diff: SERVED }, undefined);
  expect(added.title).toBe('+src/shapes.ts');
  expect(added.pr).toBeUndefined();
  const deleted = diffLevelOf({ ...MODIFIED, kind: 'deleted', hunks: [] }, { status: 'served', diff: SERVED }, undefined);
  expect(deleted.editor).toBeUndefined();
  expect(deleted.rows.some((row) => row.kind === 'hunk' && row.href !== undefined)).toBe(false);
  expect(deleted.rows).toHaveLength(9);
  // A template that would run a script is never written as a link.
  const scripted = diffLevelOf(MODIFIED, { status: 'served', diff: { ...SERVED, editor: 'javascript:{path}' } }, undefined);
  expect(scripted.editor).toBeUndefined();
  // A diff git shows no lines for says so.
  expect(diffLevelOf(MODIFIED, { status: 'served', diff: { ...SERVED, diff: 'Binary files differ\n' } }, undefined).note).toBe('git shows no lines for it');
});

test("with no server the level shows the hunks' line ranges alone, and says why; on its way or failed, it says that (C2)", () => {
  const fixture = diffLevelOf(MODIFIED, undefined, undefined);
  expect(fixture.ranges).toEqual(['lines 1-4', 'line 21']);
  expect(fixture.rows).toEqual([]);
  expect(fixture.editor).toBeUndefined();
  expect(fixture.note).toContain("the hunks' line ranges alone");
  expect(diffLevelOf(MODIFIED, { status: 'loading' }, undefined).note).toBe('reading the diff');
  expect(diffLevelOf(MODIFIED, { status: 'failed', reason: 'the server answered 404' }, undefined).note).toBe('the diff could not be read: the server answered 404');
});

test('a diff is fetched with the token and held to its shape; every failure is an answer with its reason', async () => {
  const asked: string[] = [];
  const answering =
    (status: number, body: unknown): FetchDiff =>
    (url) => {
      asked.push(url);
      return Promise.resolve({ ok: status === 200, status, json: () => Promise.resolve(body) });
    };
  expect(await loadDiff('src/shapes.ts', 't0', answering(200, SERVED))).toEqual({ status: 'served', diff: SERVED });
  expect(asked).toEqual(['/diff/src/shapes.ts?token=t0']);
  expect(await loadDiff('src/shapes.ts', 't0', answering(404, 'no diff'))).toEqual({ status: 'failed', reason: 'the server answered 404' });
  expect(await loadDiff('src/other.ts', 't0', answering(200, SERVED))).toEqual({ status: 'failed', reason: 'the server answered no diff for it' });
  expect(await loadDiff('src/shapes.ts', 't0', () => Promise.reject(new Error('offline')))).toEqual({ status: 'failed', reason: 'offline' });
});
