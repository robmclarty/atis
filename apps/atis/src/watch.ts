/**
 * watch: the repository watched for a new map (D106). Its shape is weft's
 * `packages/watch` (in `~/Projects/fascicle/code/weft`, cited in
 * `docs/inspiration.md`): a loop that notices the source change, lets it
 * settle the way weft's watcher waits for a write to finish, and hands the
 * new state on, the served world pushing it to the tab over a socket that
 * keeps the last good map when a rebuild fails. What it watches is what a
 * map is made of: the commit `HEAD` names, the index, checkride's
 * `.check/summary.json` and the approved shape's document, so approving
 * rebuilds (D314 (approved-stamp)), read together as one signature. While
 * the map's head is the working tree, by the flag or because the page
 * switched to it, the signature has one term more, which moves with what
 * that tree holds uncommitted (D313 (watch-working-term)): a coding agent's
 * edit stages nothing, so it moves neither `HEAD` nor the index, and without
 * the term the tab would stand still while the files changed under it. It
 * reads that signature on a timer rather than through file events, since
 * git writes `HEAD`, the index and its refs by renaming lock files over
 * them, which a watch on one file loses track of, and a branch's ref can
 * live in a nested folder or in `packed-refs`; asking git for `HEAD`'s
 * commit and a few `stat`s a tick is the one reading that holds on every
 * platform and layout. A signature that moved is handed on once it has held
 * still a whole tick, so a commit's several writes, an agent's burst of
 * edits, or checkride writing a run, rebuild the map once (debounced), and
 * no rebuild starts while one runs. The working tree's term is the first
 * that a file nobody is editing can move, as a log or a database written all
 * the time does, so the wait has a ceiling and the rebuilds a floor
 * (D328 (watch-bounds)): a signature that has moved at every tick for
 * `WATCH_RESTLESS_TICKS` ticks is handed on as it stands, or the tab would
 * stand still for as long as the file kept moving, commits and all; and
 * after a rebuild the watch rests as long as that rebuild took, so a file
 * that never settles cannot keep the server, which answers nothing while it
 * measures, busy more than half the time.
 */

import { execFile, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstat, stat } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';

import { approvedPath } from './cache.js';

/** How often the watch reads the signature, in milliseconds; a signature that moved waits as long again to be handed on. */
export const WATCH_EVERY_MS = 500;

/**
 * How many ticks running a signature may move at every reading before the
 * watch hands it on without waiting for it to hold still
 * (D328 (watch-bounds)): ten, five seconds at the tick the watch rests at.
 * Long enough that an agent's burst of edits or a package install is over
 * first; short enough that a tab is not left on a map minutes old.
 */
const WATCH_RESTLESS_TICKS = 10;

/** The words the working tree's term is when git's status could not be read: fixed, so the other terms still move the signature. */
const UNREAD = 'unread';

/** The most `git status` may say in one reading, for a tree with a great many files uncommitted. */
const STATUS_LIMIT = 64 * 1024 * 1024;

/**
 * What a map's head side is read from beside `HEAD`: the index, wherever git
 * keeps it; checkride's summary; the approved shape's document
 * (D314 (approved-stamp)); the working tree's root, which git's status names
 * its paths from; and whether the map's head is the working tree now, which
 * the page can switch while the watch runs (D313 (watch-working-term)).
 */
export type Watched = {
  readonly repo: string;
  readonly index: string;
  readonly summary: string;
  readonly approved: string;
  readonly root: string;
  readonly working: () => boolean;
};

/** What git answers to `rev-parse` with `args` in `repo`. */
const revParse = (repo: string, ...args: readonly string[]): string => execFileSync('git', ['rev-parse', ...args], { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

/** The root of the working tree `repo` is in; a repository with none, a bare one, has no working tree for a head to be, so `repo` stands in and is never read from. */
const rootOf = (repo: string): string => {
  try {
    return revParse(repo, '--show-toplevel');
  } catch {
    return repo;
  }
};

/**
 * Where `repo` keeps what the watch reads; git names the index, since a
 * worktree keeps its own. `working` says whether the map's head is the
 * working tree at each reading; left out, it never is.
 */
export const watchedIn = (repo: string, working: () => boolean = () => false): Watched => {
  const index = revParse(repo, '--git-path', 'index');
  return { repo, index: isAbsolute(index) ? index : join(repo, index), summary: join(repo, '.check', 'summary.json'), approved: approvedPath(repo), root: rootOf(repo), working };
};

/** The commit `HEAD` names, or nothing before the first commit. */
const headOf = (repo: string): Promise<string> =>
  new Promise((done) => {
    execFile('git', ['rev-parse', '--verify', '--quiet', 'HEAD'], { cwd: repo, encoding: 'utf8' }, (error, stdout) => done(error === null ? stdout.trim() : ''));
  });

/**
 * A file's last write and size, or a dash when it is not there. `read` is
 * `stat`, which follows a link to the file it names, for the few files the
 * watch names itself; a path git's status lists is read with `lstat`, since
 * the tree holds a link as the link's own text, and what it points at may
 * lie outside the working tree, where its changes are no part of the map.
 */
const stamp = async (file: string, read: typeof stat = stat): Promise<string> => {
  try {
    const { mtimeMs, size } = await read(file);
    return `${String(mtimeMs)}:${String(size)}`;
  } catch {
    return '-';
  }
};

/**
 * What git's status lists in `repo`, in the form it keeps stable for a
 * program to read, a NUL after each path: every file staged, unstaged or
 * untracked, the ignored left out, as the tree the working tree is written
 * as leaves them out (D99). `--no-optional-locks` keeps git from refreshing
 * the index as it reads, which would move the index's own stamp and rebuild
 * a map nothing changed under.
 */
const statusOf = (repo: string): Promise<string> =>
  new Promise((done, failed) => {
    execFile('git', ['--no-optional-locks', 'status', '--porcelain=v1', '-z', '--untracked-files=all'], { cwd: repo, encoding: 'utf8', maxBuffer: STATUS_LIMIT }, (error, stdout) => {
      if (error === null) done(stdout);
      else failed(error);
    });
  });

/** A status entry of a rename or a copy, in the index or in the working tree: the path it came from follows it as a field of its own. */
const MOVED = /^(?:[RC].|.[RC]) /;

/** The paths a status names, from the working tree's root: each entry's own after its two letters and a space, and the one a rename or a copy came from. */
const listedIn = (status: string): readonly string[] => {
  const paths: string[] = [];
  let origin = false;
  for (const field of status.split('\0')) {
    if (field === '') continue;
    paths.push(origin ? field : field.slice(3));
    origin = !origin && MOVED.test(field);
  }
  return paths;
};

/**
 * What moves with the working tree's uncommitted content, as one hash
 * (D313 (watch-working-term)): what git's status lists, and the last write
 * and size of each file it lists. The listing alone moves when a file is
 * first edited, added or removed, and stands still at a second edit to a
 * file it already names; that file's stamp moves then. A reading git
 * refuses, or one past `STATUS_LIMIT`, is the one fixed word `unread`: the
 * signature's other terms still move it, so a commit is still followed,
 * where a reading that failed whole would stop the watch without a word.
 */
const workingOf = async (watched: Watched): Promise<string> => {
  let status: string;
  try {
    status = await statusOf(watched.repo);
  } catch {
    return UNREAD;
  }
  const stamps = await Promise.all(listedIn(status).map((path) => stamp(join(watched.root, path), lstat)));
  return createHash('sha256').update(status).update('\0').update(stamps.join(' ')).digest('hex');
};

/**
 * One reading of `watched`: its signature, and whether the working tree's
 * term was asked for and could not be read. The signature is what a map's
 * head side is made of, as one string: `HEAD`'s commit, the index's stamp,
 * the summary's and the approved document's, and, while the head is the
 * working tree, the term that moves with what it holds uncommitted. A head
 * that is a commit has no such term, so an edit that is not committed
 * rebuilds nothing under it.
 */
const readingOf = async (watched: Watched): Promise<{ readonly signature: string; readonly unread: boolean }> => {
  const [head, index, summary, approved, working] = await Promise.all([
    headOf(watched.repo),
    stamp(watched.index),
    stamp(watched.summary),
    stamp(watched.approved),
    watched.working() ? workingOf(watched) : undefined,
  ]);
  return { signature: [head, index, summary, approved, ...(working === undefined ? [] : [working])].join(' '), unread: working === UNREAD };
};

/** The signature of `watched` as it reads now: what the watch is started from, read before the map is measured. */
export const signatureOf = async (watched: Watched): Promise<string> => (await readingOf(watched)).signature;

/** A watch running: `close` stops it after the tick in hand. */
export type Watching = { readonly close: () => void };

/**
 * How a move was handed on (D328 (watch-bounds)): `restless` when the
 * signature never held still and the watch stopped waiting for it to, and
 * `unread` when git could not list what the working tree holds uncommitted,
 * so the signature it was handed on at follows no edit that stages nothing.
 */
export type Moved = { readonly restless: boolean; readonly unread: boolean };

/** How long a signature read every `every` milliseconds may keep moving before it is handed on as it stands, in milliseconds. */
export const restlessAfter = (every: number = WATCH_EVERY_MS): number => every * WATCH_RESTLESS_TICKS;

/**
 * Read `watched`'s signature every `every` milliseconds and call `changed`
 * once it has moved from `from`, the signature the served map was built at,
 * and held still a whole tick, or has moved at every tick for
 * `restlessAfter(every)`; the next tick waits for `changed` to settle, and
 * no move is handed on until as long again has passed as `changed` took
 * (D328 (watch-bounds)). No reading fails, each term standing for what it
 * could not read, and a `changed` that throws is let go: the watch reads on.
 */
export const watchRepo = (watched: Watched, from: string, changed: (moved: Moved) => Promise<void>, every = WATCH_EVERY_MS): Watching => {
  const ceiling = restlessAfter(every);
  let built = from;
  let seen = from;
  // When the signature began to move at every tick; nothing once it has held still for one.
  let stirred: number | undefined;
  // When the rest after the last rebuild is over.
  let rested = 0;
  let open = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const tick = async (): Promise<void> => {
    const { signature: now, unread } = await readingOf(watched);
    if (now === seen) stirred = undefined;
    else stirred ??= performance.now();
    seen = now;
    const restless = stirred !== undefined && performance.now() - stirred >= ceiling;
    if (now === built || (stirred !== undefined && !restless) || performance.now() < rested) return;
    built = now;
    stirred = undefined;
    const started = performance.now();
    try {
      await changed({ restless, unread });
    } finally {
      const ended = performance.now();
      rested = ended + (ended - started);
    }
  };
  const next = (): void => {
    if (!open) return;
    timer = setTimeout(() => {
      tick().then(next, next);
    }, every);
  };
  next();
  return {
    close: () => {
      open = false;
      if (timer !== undefined) clearTimeout(timer);
    },
  };
};
