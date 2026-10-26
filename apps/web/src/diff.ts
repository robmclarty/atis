/**
 * diff: §6's diff level (LOD4, D102) as the page reads it. In served mode
 * the CLI answers a changed file's diff at `/diff/<path>`, with the run's
 * token (D93, D134), beside the repository's path and the editor template
 * its config names. The page parses the diff into rows, and each hunk's head
 * becomes a link that opens the file at that hunk's first line, through
 * core's `editorLink`. A link to the file at its first hunk heads the level,
 * and a link to the PR stands beside it when the page was told one. A
 * fixture has no server and so no diff text, and the level shows the hunks'
 * line ranges alone, from the map (C2). Pure but for the one fetch, which is
 * injected, so a test reads it straight.
 */

import { editorLink } from 'core';
import type { ChangedFile, Hunk } from 'core';

/** What an added file's path is written with, wherever the map writes it (D120). */
const ADDED = '+';

/** Where a changed file's diff is asked for: `/diff/<path>`, each segment escaped, with the run's token (D134). */
export const diffHref = (path: string, token: string): string => `/diff/${path.split('/').map(encodeURIComponent).join('/')}?token=${encodeURIComponent(token)}`;

/** What `/diff/<path>` answers: the file's diff as git prints it, the repository's absolute path, and the editor template (`apps/atis/src/serve.ts`). */
export type ServedDiff = { readonly path: string; readonly diff: string; readonly root: string; readonly editor: string };

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A served answer held to its shape, or none when it is not one. */
export const readServedDiff = (value: unknown): ServedDiff | undefined => {
  if (!isRecord(value)) return undefined;
  const { path, diff, root, editor } = value;
  return typeof path === 'string' && typeof diff === 'string' && typeof root === 'string' && typeof editor === 'string' ? { path, diff, root, editor } : undefined;
};

/** One row of a diff: a hunk's head, with the head-side line it opens at, or one line added, deleted or kept, the added and kept with their head-side line. */
export type DiffRow =
  | { readonly kind: 'hunk'; readonly text: string; readonly line: number; readonly href?: string }
  | { readonly kind: 'added' | 'context'; readonly text: string; readonly line: number }
  | { readonly kind: 'deleted'; readonly text: string };

/** A hunk's head: `@@ -a,b +c,d @@`, the counts left off where they are one. */
const HUNK_HEAD = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

/**
 * A unified diff as rows: each hunk's head and the lines under it, the
 * file's header lines above the first hunk left out, as is git's note that
 * a file ends with no newline. A diff with no hunk, a binary file's, has no
 * rows.
 */
export const parseDiff = (text: string): readonly DiffRow[] => {
  const rows: DiffRow[] = [];
  let line: number | undefined;
  for (const raw of text.split('\n')) {
    const head = HUNK_HEAD.exec(raw);
    if (head !== null) {
      line = Number(head[1]);
      rows.push({ kind: 'hunk', text: raw, line: Math.max(1, line) });
      continue;
    }
    if (line === undefined) continue;
    if (raw.startsWith('diff --git ')) {
      line = undefined;
      continue;
    }
    const mark = raw[0];
    if (mark === '+') rows.push({ kind: 'added', text: raw, line: line++ });
    else if (mark === '-') rows.push({ kind: 'deleted', text: raw });
    else if (mark === ' ') rows.push({ kind: 'context', text: raw, line: line++ });
  }
  return rows;
};

/** A hunk's head-side lines in words: one line, a run of them, or, for a hunk that only deleted, where the deletion fell. */
export const rangeOf = (hunk: Hunk): string => {
  if (hunk.count === 0) return `removed after line ${String(hunk.start)}`;
  if (hunk.count === 1) return `line ${String(hunk.start)}`;
  return `lines ${String(hunk.start)}-${String(hunk.start + hunk.count - 1)}`;
};

/** The PR the page was told of, by its `pr` parameter: an `https:` URL alone, since the page writes it as a link. */
export const prOf = (search: string): string | undefined => {
  const named = new URLSearchParams(search).get('pr');
  if (named === null) return undefined;
  try {
    const url = new URL(named);
    return url.protocol === 'https:' ? url.href : undefined;
  } catch {
    return undefined;
  }
};

/** A file's diff as the page holds it: asked for, read, or failed with the reason. */
export type DiffAnswer =
  | { readonly status: 'loading' }
  | { readonly status: 'served'; readonly diff: ServedDiff }
  | { readonly status: 'failed'; readonly reason: string };

/** The one fetch the level makes, injected so a test needs no server. */
export type FetchDiff = (url: string) => Promise<Pick<Response, 'ok' | 'status' | 'json'>>;

/** Fetch a changed file's diff and hold it to its shape; every failure comes back as an answer with its reason, never as a throw. */
export const loadDiff = async (path: string, token: string, fetchDiff: FetchDiff): Promise<DiffAnswer> => {
  try {
    const response = await fetchDiff(diffHref(path, token));
    if (!response.ok) return { status: 'failed', reason: `the server answered ${String(response.status)}` };
    const diff = readServedDiff(await response.json());
    return diff?.path === path ? { status: 'served', diff } : { status: 'failed', reason: 'the server answered no diff for it' };
  } catch (error) {
    return { status: 'failed', reason: error instanceof Error ? error.message : String(error) };
  }
};

/** One changed file at the diff level: its path as the map writes it, its hunks' line ranges, and, once served, its rows and links. */
export type DiffLevel = {
  readonly path: string;
  /** The path as the map writes it, an added file's with its leading `+` (D120). */
  readonly title: string;
  /** Each hunk's head-side lines in words, from the map, which is all a fixture shows. */
  readonly ranges: readonly string[];
  /** The served diff's rows, each hunk's head linked to the file at its line; none until a diff is served. */
  readonly rows: readonly DiffRow[];
  /** The link that opens the file at its first hunk; none unserved, for a deleted file, or for a template that would run a script. */
  readonly editor?: string;
  /** The PR's link, when the page was told one. */
  readonly pr?: string;
  /** What the level says of itself where it shows less than the diff: why, or that it is on its way; empty when it shows the diff. */
  readonly note: string;
};

/** The diff level for one changed file, from the map's entry, the answer the server gave (none with no server), and the PR the page was told of. */
export const diffLevelOf = (file: ChangedFile, answer: DiffAnswer | undefined, pr: string | undefined): DiffLevel => {
  const shown = {
    path: file.path,
    title: file.kind === 'added' ? `${ADDED}${file.path}` : file.path,
    ranges: file.hunks.map(rangeOf),
    ...(pr === undefined ? {} : { pr }),
  };
  if (answer === undefined) return { ...shown, rows: [], note: "no server reads git for a fixture, so the hunks' line ranges alone" };
  if (answer.status === 'loading') return { ...shown, rows: [], note: 'reading the diff' };
  if (answer.status === 'failed') return { ...shown, rows: [], note: `the diff could not be read: ${answer.reason}` };
  const { root, editor: template } = answer.diff;
  // A deleted file is not there to open; its diff still shows.
  const link = (line: number): string | undefined => (file.kind === 'deleted' ? undefined : editorLink(template, { root, path: file.path, line }));
  const rows = parseDiff(answer.diff.diff).map((row): DiffRow => {
    if (row.kind !== 'hunk') return row;
    const href = link(row.line);
    return href === undefined ? row : { ...row, href };
  });
  const editor = link(file.hunks[0]?.start ?? 1);
  return { ...shown, rows, ...(editor === undefined ? {} : { editor }), note: rows.length === 0 ? 'git shows no lines for it' : '' };
};
