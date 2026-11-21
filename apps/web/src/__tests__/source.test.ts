import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEFAULT_EDITOR, assertMap, editorLink } from 'core';
import type { MapJson } from 'core';
import { afterEach, expect, test, vi } from 'vitest';

import type { DiffAnswer, ServedDiff } from '../diff.js';
import { codeLines, createAnswers, editorOf, loadSource, readServedSource, sourceHref, sourceNote } from '../source.js';
import type { FetchSource, ServedSource, SourceAnswer } from '../source.js';

/**
 * One file's text as the code tab reads it (D211 (file-text)): asked for at
 * `/file/<path>` with the run's token, held in one of the contract's seven
 * states and no eighth, and kept with the diffs in one store by map and by
 * path, where reading an answer is what asks for it (D253 (read-is-ask)).
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', '..', 'libs', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));

const PATH = 'libs/core/src/pm/tools.ts';
const TEXT = ['import { join } from "node:path";', '', 'export const localBin = (root: string): string => join(root, "node_modules", ".bin");', ''].join('\n');
const SERVED: ServedSource = { path: PATH, text: TEXT, at: DEMO.meta.head, root: '/Users/reader/My Repo', editor: DEFAULT_EDITOR };
const SERVED_DIFF: ServedDiff = { path: PATH, diff: '@@ -0,0 +1 @@\n+import { join } from "node:path";\n', root: '/Users/reader/My Repo', editor: DEFAULT_EDITOR };

/** A server that answers one status and one body, and writes down what it was asked. */
const server = (status: number, body: unknown): { readonly fetch: FetchSource; readonly asked: string[] } => {
  const asked: string[] = [];
  return {
    asked,
    fetch: async (url) => {
      asked.push(url);
      return { ok: status >= 200 && status < 300, status, json: async () => body };
    },
  };
};

/** A server that answers when a test lets it, so the state on the way is read too. */
const held = (): { readonly fetch: FetchSource; readonly asked: string[]; readonly answer: (url: string, status: number, body: unknown) => void } => {
  const asked: string[] = [];
  const waiting = new Map<string, (response: Awaited<ReturnType<FetchSource>>) => void>();
  return {
    asked,
    fetch: (url) =>
      new Promise((resolve) => {
        asked.push(url);
        waiting.set(url, resolve);
      }),
    answer: (url, status, body) => waiting.get(url)?.({ ok: status === 200, status, json: async () => body }),
  };
};

/** A server whose 200 is not JSON. */
const broken: FetchSource = async () => ({ ok: true, status: 200, json: async () => Promise.reject(new SyntaxError('not JSON')) });

/** Let every answer that was let go arrive. */
const settled = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

afterEach(() => {
  vi.unstubAllGlobals();
});

test("a file's text is asked for at /file/<path>, each segment escaped as the diff's address escapes it, with the run token", () => {
  expect(sourceHref(PATH, 'a1')).toBe('/file/libs/core/src/pm/tools.ts?token=a1');
  expect(sourceHref('src/odd #name?.ts', 'a&b')).toBe('/file/src/odd%20%23name%3F.ts?token=a%26b');
});

test('a served answer is held to its five strings, and anything else is none', () => {
  expect(readServedSource({ ...SERVED, extra: 1 })).toEqual(SERVED);
  expect(readServedSource({ ...SERVED, text: '' })).toEqual({ ...SERVED, text: '' });
  for (const key of ['path', 'text', 'at', 'root', 'editor'] as const) {
    const { [key]: _dropped, ...rest } = SERVED;
    expect(readServedSource(rest)).toBeUndefined();
    expect(readServedSource({ ...SERVED, [key]: 7 })).toBeUndefined();
  }
  expect(readServedSource(null)).toBeUndefined();
  expect(readServedSource('text')).toBeUndefined();
  expect(readServedSource([SERVED])).toBeUndefined();
});

test('with no token the page is a fixture: the answer is unserved and no request is made', async () => {
  const { fetch, asked } = server(200, SERVED);
  expect(await loadSource(PATH, undefined, fetch)).toEqual({ status: 'unserved' });
  expect(asked).toEqual([]);
});

test('a 200 with the frozen answer naming the path asked for is ready, with the text and where it was read from', async () => {
  const { fetch, asked } = server(200, SERVED);
  expect(await loadSource(PATH, 'a1', fetch)).toEqual({ status: 'ready', source: SERVED });
  expect(asked).toEqual(['/file/libs/core/src/pm/tools.ts?token=a1']);
});

test('each refusal the route makes reads as its own state', async () => {
  const states: readonly (readonly [number, SourceAnswer['status']])[] = [
    [403, 'refused'],
    [404, 'absent'],
    [413, 'large'],
    [415, 'binary'],
  ];
  const answers = await Promise.all(states.map(([status]) => loadSource(PATH, 'a1', server(status, { error: 'no' }).fetch)));
  expect(answers).toEqual(states.map(([, status]) => ({ status })));
});

test('there is no eighth state: a request that fails any other way reads as absent', async () => {
  const absent: SourceAnswer = { status: 'absent' };
  expect(await loadSource(PATH, 'a1', server(500, {}).fetch)).toEqual(absent);
  expect(await loadSource(PATH, 'a1', server(401, {}).fetch)).toEqual(absent);
  // A 200 that is not the answer, and one for another path than the one asked for.
  expect(await loadSource(PATH, 'a1', server(200, { path: PATH }).fetch)).toEqual(absent);
  expect(await loadSource(PATH, 'a1', server(200, { ...SERVED, path: 'libs/core/src/pm/slots.ts' }).fetch)).toEqual(absent);
  // A network that fails, and a body that is not JSON.
  expect(await loadSource(PATH, 'a1', async () => Promise.reject(new Error('offline')))).toEqual(absent);
  expect(await loadSource(PATH, 'a1', broken)).toEqual(absent);
});

test('every state but ready says why the tab shows no text, so a fixture says it has no server', () => {
  const notes = (['unserved', 'loading', 'refused', 'absent', 'large', 'binary'] as const).map((status) => sourceNote({ status }));
  expect(notes).toEqual([
    "no server reads a fixture's files, so no code",
    'reading the file',
    "the server refused: the token is wrong or missing, or the page is not on this run's address",
    'the server answered no text for it',
    'the file is larger than the server reads',
    'the file is not text',
  ]);
  expect(sourceNote({ status: 'ready', source: SERVED })).toBe('');
});

test("a file's text becomes numbered lines, the change's lines marked from its hunks and the line a deletion sits after marked cut", () => {
  const lines = codeLines('one\ntwo\nthree\nfour\n', [
    { start: 2, count: 2 },
    { start: 4, count: 0 },
  ]);
  expect(lines).toEqual([
    { line: 1, text: 'one', changed: false, cut: false },
    { line: 2, text: 'two', changed: true, cut: false },
    { line: 3, text: 'three', changed: true, cut: false },
    { line: 4, text: 'four', changed: false, cut: true },
  ]);
});

test('a text keeps its blank lines, loses only its closing newline and its carriage returns, and an empty one has no lines', () => {
  expect(codeLines('', [])).toEqual([]);
  expect(codeLines('\n', []).map((line) => line.text)).toEqual(['']);
  expect(codeLines('a\n\nb', []).map((line) => line.text)).toEqual(['a', '', 'b']);
  expect(codeLines('a\r\nb\r\n', []).map((line) => line.text)).toEqual(['a', 'b']);
  // A deletion at the file's top sits after line 0, which no line is, and a hunk past the text marks nothing.
  expect(codeLines('a\nb\n', [{ start: 0, count: 0 }, { start: 9, count: 3 }]).some((line) => line.changed || line.cut)).toBe(false);
});

test("the editor's template is read from the file's own answer, else from its diff's, and from neither on a fixture", () => {
  const ready: SourceAnswer = { status: 'ready', source: { ...SERVED, root: '/from/the/file' } };
  const diff: DiffAnswer = { status: 'served', diff: SERVED_DIFF };
  expect(editorOf(ready, diff)).toEqual({ root: '/from/the/file', editor: DEFAULT_EDITOR });
  expect(editorOf({ status: 'loading' }, diff)).toEqual({ root: '/Users/reader/My Repo', editor: DEFAULT_EDITOR });
  expect(editorOf({ status: 'unserved' }, undefined)).toBeUndefined();
  expect(editorOf({ status: 'binary' }, { status: 'loading' })).toBeUndefined();
  expect(editorOf({ status: 'absent' }, { status: 'failed', reason: 'the server answered 404' })).toBeUndefined();

  const editor = editorOf(ready, undefined);
  expect(editor === undefined ? undefined : editorLink(editor.editor, { root: editor.root, path: PATH, line: 41 })).toBe(editorLink(DEFAULT_EDITOR, { root: '/from/the/file', path: PATH, line: 41 }));
});

test('the store of a fixture asks for nothing: a text is unserved and a diff is none', async () => {
  const { fetch, asked } = server(200, SERVED);
  const answers = createAnswers(undefined, fetch);
  const heard = vi.fn();
  answers.subscribe(heard);
  expect(answers.source(DEMO, PATH)).toEqual({ status: 'unserved' });
  expect(answers.diff(DEMO, PATH)).toBeUndefined();
  await settled();
  expect(asked).toEqual([]);
  expect(heard).not.toHaveBeenCalled();
});

test('reading a text asks for it once: loading, the same value until it moves, then ready, and whoever listens hears it arrive', async () => {
  const { fetch, asked, answer } = held();
  const answers = createAnswers('a1', fetch);
  const heard = vi.fn();
  const quiet = vi.fn();
  answers.subscribe(heard);
  const leave = answers.subscribe(quiet);
  leave();

  const first = answers.source(DEMO, PATH);
  expect(first).toEqual({ status: 'loading' });
  expect(answers.source(DEMO, PATH)).toBe(first);
  expect(asked).toEqual(['/file/libs/core/src/pm/tools.ts?token=a1']);
  expect(heard).not.toHaveBeenCalled();

  answer('/file/libs/core/src/pm/tools.ts?token=a1', 200, SERVED);
  await settled();
  expect(heard).toHaveBeenCalledTimes(1);
  expect(quiet).not.toHaveBeenCalled();
  const ready = answers.source(DEMO, PATH);
  expect(ready).toEqual({ status: 'ready', source: SERVED });
  expect(answers.source(DEMO, PATH)).toBe(ready);
  expect(asked).toHaveLength(1);
});

test('a refusal is kept as its state and not asked for again', async () => {
  const { fetch, asked } = server(413, {});
  const answers = createAnswers('a1', fetch);
  answers.source(DEMO, PATH);
  await settled();
  expect(answers.source(DEMO, PATH)).toEqual({ status: 'large' });
  expect(answers.source(DEMO, PATH)).toBe(answers.source(DEMO, PATH));
  expect(asked).toHaveLength(1);
});

test("the store keeps a changed file's diff beside its text, each asked for once at its own address", async () => {
  const asked: string[] = [];
  const fetch: FetchSource = async (url) => {
    asked.push(url);
    return { ok: true, status: 200, json: async () => (url.startsWith('/diff/') ? SERVED_DIFF : SERVED) };
  };
  const answers = createAnswers('a1', fetch);
  const heard = vi.fn();
  answers.subscribe(heard);

  const loading = answers.diff(DEMO, PATH);
  expect(loading).toEqual({ status: 'loading' });
  expect(answers.diff(DEMO, PATH)).toBe(loading);
  expect(answers.source(DEMO, PATH)).toEqual({ status: 'loading' });
  await settled();

  expect(answers.diff(DEMO, PATH)).toEqual({ status: 'served', diff: SERVED_DIFF });
  expect(answers.source(DEMO, PATH)).toEqual({ status: 'ready', source: SERVED });
  expect(asked.toSorted()).toEqual(['/diff/libs/core/src/pm/tools.ts?token=a1', '/file/libs/core/src/pm/tools.ts?token=a1']);
  expect(heard).toHaveBeenCalledTimes(2);
});

test('answers are kept by map and by path: another file and another map each ask afresh', async () => {
  const { fetch, asked } = server(200, SERVED);
  const answers = createAnswers('a1', fetch);
  answers.source(DEMO, PATH);
  await settled();
  expect(asked).toHaveLength(1);

  // Another path of the same map: a new request, whose answer names another path and so reads as absent.
  answers.source(DEMO, 'libs/core/src/pm/slots.ts');
  await settled();
  expect(asked).toEqual(['/file/libs/core/src/pm/tools.ts?token=a1', '/file/libs/core/src/pm/slots.ts?token=a1']);
  expect(answers.source(DEMO, 'libs/core/src/pm/slots.ts')).toEqual({ status: 'absent' });

  // A map a watch pushed is another map, so the file is read again; the first map's answer stands.
  const pushed: MapJson = { ...DEMO };
  expect(answers.source(pushed, PATH)).toEqual({ status: 'loading' });
  await settled();
  expect(asked).toHaveLength(3);
  expect(answers.source(pushed, PATH)).toEqual({ status: 'ready', source: SERVED });
  expect(answers.source(DEMO, PATH)).toEqual({ status: 'ready', source: SERVED });
  expect(asked).toHaveLength(3);
});

test("a store handed no fetch reads with the page's own", async () => {
  const page = vi.fn(async () => ({ ok: true, status: 200, json: async () => SERVED }));
  vi.stubGlobal('fetch', page);
  const answers = createAnswers('a1');
  answers.source(DEMO, PATH);
  await settled();
  expect(page).toHaveBeenCalledWith('/file/libs/core/src/pm/tools.ts?token=a1');
  expect(answers.source(DEMO, PATH)).toEqual({ status: 'ready', source: SERVED });
});
