/**
 * source: one file's text as the inspector's code tab reads it (D211
 * (file-text)). In served mode the CLI answers `/file/<path>` with the run's
 * token, for any file the map lists, as JSON: the path, the text, the git
 * object it was read from, and the repository's path and editor template the
 * diff's answer carries too. The page holds each file's answer in one of
 * seven states and no eighth: a fixture has no server and is `unserved` with
 * no request made, and a request that fails in a way the contract does not
 * name reads as `absent`.
 *
 * The answers are kept in one small store, the diffs beside the texts, by
 * map and by path, so a tab that is opened twice asks once and a map a watch
 * pushed asks afresh (D253 (read-is-ask)): reading an answer is what asks
 * for it, as the world's own diff cache does, which is left as it is. Pure
 * but for the one fetch, which is injected, so a test reads it straight.
 */

import type { Hunk, MapJson } from 'core';

import { loadDiff } from './diff.js';
import type { DiffAnswer, FetchDiff } from './diff.js';

/** Where a file's text is asked for: `/file/<path>`, each segment escaped as the diff's address escapes it, with the run's token (D211 (file-text)). */
export const sourceHref = (path: string, token: string): string => `/file/${path.split('/').map(encodeURIComponent).join('/')}?token=${encodeURIComponent(token)}`;

/** What `/file/<path>` answers: the path asked for, the file's text, the git object it was read from, the repository's absolute path, and the editor's link template. */
export type ServedSource = { readonly path: string; readonly text: string; readonly at: string; readonly root: string; readonly editor: string };

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A served answer held to its shape, or none when it is not one. */
export const readServedSource = (value: unknown): ServedSource | undefined => {
  if (!isRecord(value)) return undefined;
  const { path, text, at, root, editor } = value;
  const held = typeof path === 'string' && typeof text === 'string' && typeof at === 'string' && typeof root === 'string' && typeof editor === 'string';
  return held ? { path, text, at, root, editor } : undefined;
};

/** A file's text as the page holds it, in one of the contract's seven states. */
export type SourceAnswer =
  | { readonly status: 'unserved' }
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly source: ServedSource }
  | { readonly status: 'refused' }
  | { readonly status: 'absent' }
  | { readonly status: 'large' }
  | { readonly status: 'binary' };

/** The one fetch a file's text is read with, the diff's own shape, injected so a test needs no server. */
export type FetchSource = FetchDiff;

/** The states with nothing to carry, one value each, so a reader sees the same answer until it moves. */
const UNSERVED: SourceAnswer = { status: 'unserved' };
const LOADING: SourceAnswer = { status: 'loading' };
const REFUSED: SourceAnswer = { status: 'refused' };
const ABSENT: SourceAnswer = { status: 'absent' };
const LARGE: SourceAnswer = { status: 'large' };
const BINARY: SourceAnswer = { status: 'binary' };

/** The state each refusal the route makes reads as: a wrong token or host, a path the held map does not list, a file over the size cap, a file holding a NUL byte. */
const REFUSALS: Readonly<Record<number, SourceAnswer>> = { 403: REFUSED, 404: ABSENT, 413: LARGE, 415: BINARY };

/**
 * Ask for a file's text and hold the answer to its shape. With no token the
 * page is a fixture's, no request is made and the answer is `unserved`. Every
 * failure comes back as a state and never as a throw: the four the route
 * names by their status, and any other, a broken answer or one for another
 * path among them, as `absent`.
 */
export const loadSource = async (path: string, token: string | undefined, fetchSource: FetchSource): Promise<SourceAnswer> => {
  if (token === undefined) return UNSERVED;
  try {
    const response = await fetchSource(sourceHref(path, token));
    if (!response.ok) return REFUSALS[response.status] ?? ABSENT;
    const source = readServedSource(await response.json());
    return source?.path === path ? { status: 'ready', source } : ABSENT;
  } catch {
    return ABSENT;
  }
};

/** What the code tab says of itself in each state where it shows no text: why, or that the text is on its way; nothing once it shows the file. */
const NOTES: Readonly<Record<SourceAnswer['status'], string>> = {
  unserved: "no server reads a fixture's files, so no code",
  loading: 'reading the file',
  ready: '',
  refused: "the server refused: the token is wrong or missing, or the page is not on this run's address",
  absent: 'the server answered no text for it',
  large: 'the file is larger than the server reads',
  binary: 'the file is not text',
};

/** What the code tab says of an answer that is not the file's text, so a fixture says it has no server rather than showing an empty box; empty once the text is there. */
export const sourceNote = (answer: SourceAnswer): string => NOTES[answer.status];

/** What a map's head is written as where the change runs to uncommitted work, in place of a commit's sha. */
const WORKING_TREE = 'working-tree';

/** How many characters of a commit's sha the note writes. */
const SHORT_SHA = 7;

/**
 * Why a served text takes no mark from a map, in words; none where it may
 * (D271 (marks-of-own-commit)). The server reads a file at the head it
 * holds, and the map on the screen may be of another commit: a frame the
 * scrubber stands at, or a map a watch pushed before the answer caught up.
 * That map's hunks and function lines number another text's lines, so on
 * this one they would mark the wrong lines. A map of the working tree names
 * no commit to hold the answer to, and its text is marked as it comes.
 */
export const otherCommitNote = (head: string, answer: SourceAnswer): string | undefined => {
  if (answer.status !== 'ready' || head === WORKING_TREE || answer.source.at === head) return undefined;
  return `the text is not of this map's commit, ${head.slice(0, SHORT_SHA)}, so no changed line and no function is marked on it`;
};

/** One line of a file as the code tab draws it: its number, its text, whether the change wrote it, and whether the change removed lines just after it (D73). */
export type CodeLine = { readonly line: number; readonly text: string; readonly changed: boolean; readonly cut: boolean };

/**
 * A file's text as numbered lines, each marked from the change's hunks: the
 * head-side lines a hunk spans are `changed`, and the line a hunk that only
 * deleted sits after is `cut`, one at the file's top, after line 0, marking
 * no line. A text that ends in a newline has no empty last line, and an
 * empty text has no lines.
 */
export const codeLines = (text: string, hunks: readonly Hunk[]): readonly CodeLine[] => {
  if (text === '') return [];
  const lines = (text.endsWith('\n') ? text.slice(0, -1) : text).split('\n');
  const changed = new Set(hunks.flatMap((hunk) => Array.from({ length: hunk.count }, (_, at) => hunk.start + at)));
  const cut = new Set(hunks.filter((hunk) => hunk.count === 0).map((hunk) => hunk.start));
  return lines.map((each, at): CodeLine => ({ line: at + 1, text: each.endsWith('\r') ? each.slice(0, -1) : each, changed: changed.has(at + 1), cut: cut.has(at + 1) }));
};

/** What a link into the reader's editor is filled from: the repository's absolute path and the template, as core's `editorLink` takes them. */
export type Editor = { readonly root: string; readonly editor: string };

/** Where the editor's template is read from: the file's own answer once it is served, else its diff's, which carries the same two; none on a fixture, and until either arrives. */
export const editorOf = (source: SourceAnswer, diff: DiffAnswer | undefined): Editor | undefined => {
  if (source.status === 'ready') return { root: source.source.root, editor: source.source.editor };
  return diff?.status === 'served' ? { root: diff.diff.root, editor: diff.diff.editor } : undefined;
};

/**
 * The answers store: each file's text and each changed file's diff, by map
 * and by path. Reading one asks for it the first time and returns the state
 * it is in, the same value until it moves, so React reads it as a snapshot:
 * `useSyncExternalStore(answers.subscribe, () => answers.source(map, path))`.
 * With no token nothing is ever asked: a text is `unserved` and a diff is
 * none, which the diff's own model reads as a fixture's.
 */
export type Answers = {
  /** A file's text over a map: asked for on the first read, then the state it is in. */
  readonly source: (map: MapJson, path: string) => SourceAnswer;
  /** A changed file's diff over a map: asked for on the first read, then the answer; none with no token. */
  readonly diff: (map: MapJson, path: string) => DiffAnswer | undefined;
  /** Hear an answer arrive. */
  readonly subscribe: (listener: () => void) => () => void;
};

/** The one diff answer that is on its way, one value, so a reader sees the same answer until it arrives. */
const DIFF_LOADING: DiffAnswer = { status: 'loading' };

/** One kind of answer by map and path: the held one, or the one it is asked with while `ask` is on its way, and then what `ask` resolved to. */
const kept = <T>(tell: () => void, loading: T, ask: (path: string) => Promise<T>): ((map: MapJson, path: string) => T) => {
  const byMap = new WeakMap<MapJson, Map<string, T>>();
  return (map, path) => {
    const held = byMap.get(map) ?? new Map<string, T>();
    byMap.set(map, held);
    const answer = held.get(path);
    if (answer !== undefined) return answer;
    held.set(path, loading);
    void ask(path).then((arrived) => {
      held.set(path, arrived);
      tell();
    });
    return loading;
  };
};

/** The store for one run: its token, none for a fixture, and the fetch its answers are read with, the page's own unless a test hands one in. */
export const createAnswers = (token: string | undefined, fetchAnswer: FetchSource = (url) => fetch(url)): Answers => {
  const listeners = new Set<() => void>();
  const tell = (): void => listeners.forEach((listener) => listener());
  const sources = kept<SourceAnswer>(tell, LOADING, (path) => loadSource(path, token, fetchAnswer));
  const diffs = token === undefined ? undefined : kept<DiffAnswer>(tell, DIFF_LOADING, (path) => loadDiff(path, token, fetchAnswer));
  return {
    source: (map, path) => (token === undefined ? UNSERVED : sources(map, path)),
    diff: (map, path) => diffs?.(map, path),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};
