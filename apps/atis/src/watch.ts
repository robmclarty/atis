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
 * no rebuild starts while one runs.
 */

import { execFile, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { stat } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';

import { approvedPath } from './cache.js';

/** How often the watch reads the signature, in milliseconds; a signature that moved waits as long again to be handed on. */
export const WATCH_EVERY_MS = 500;

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

/** A file's last write and size, or a dash when it is not there. */
const stamp = async (file: string): Promise<string> => {
  try {
    const { mtimeMs, size } = await stat(file);
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
 * refuses fails, and the tick it was read on is skipped.
 */
const workingOf = async (watched: Watched): Promise<string> => {
  const status = await statusOf(watched.repo);
  const stamps = await Promise.all(listedIn(status).map((path) => stamp(join(watched.root, path))));
  return createHash('sha256').update(status).update('\0').update(stamps.join(' ')).digest('hex');
};

/**
 * What a map's head side is made of, as one string: `HEAD`'s commit, the
 * index's stamp, the summary's and the approved document's, and, while the
 * head is the working tree, the term that moves with what it holds
 * uncommitted. A head that is a commit has no such term, so an edit that is
 * not committed rebuilds nothing under it.
 */
export const signatureOf = async (watched: Watched): Promise<string> => {
  const [head, index, summary, approved, working] = await Promise.all([
    headOf(watched.repo),
    stamp(watched.index),
    stamp(watched.summary),
    stamp(watched.approved),
    watched.working() ? workingOf(watched) : undefined,
  ]);
  return [head, index, summary, approved, ...(working === undefined ? [] : [working])].join(' ');
};

/** A watch running: `close` stops it after the tick in hand. */
export type Watching = { readonly close: () => void };

/**
 * Read `watched`'s signature every `every` milliseconds and call `changed`
 * once it has moved from `from`, the signature the served map was built at,
 * and held still a whole tick; the next tick waits for `changed` to settle,
 * and a tick whose reading fails is skipped.
 */
export const watchRepo = (watched: Watched, from: string, changed: () => Promise<void>, every = WATCH_EVERY_MS): Watching => {
  let built = from;
  let seen = from;
  let open = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const tick = async (): Promise<void> => {
    const now = await signatureOf(watched);
    if (now !== built && now === seen) {
      built = now;
      await changed();
    }
    seen = now;
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
