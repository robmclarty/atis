/**
 * watch: the repository watched for a new map (D106). Its shape is weft's
 * `packages/watch` (in `~/Projects/fascicle/code/weft`, cited in
 * `docs/inspiration.md`): a loop that notices the source change, lets it
 * settle the way weft's watcher waits for a write to finish, and hands the
 * new state on, the served world pushing it to the tab over a socket that
 * keeps the last good map when a rebuild fails. What it watches is what a
 * map is made of: the commit `HEAD` names, the index, and checkride's
 * `.check/summary.json`, read together as one signature. It reads that
 * signature on a timer rather than through file events, since git writes
 * `HEAD`, the index and its refs by renaming lock files over them, which a
 * watch on one file loses track of, and a branch's ref can live in a nested
 * folder or in `packed-refs`; asking git for `HEAD`'s commit and two `stat`s
 * a tick is the one reading that holds on every platform and layout. A
 * signature that moved is handed on once it has held still a whole tick, so
 * a commit's several writes, or checkride writing a run, rebuild the map
 * once (debounced), and no rebuild starts while one runs.
 */

import { execFile, execFileSync } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';

/** How often the watch reads the signature, in milliseconds; a signature that moved waits as long again to be handed on. */
export const WATCH_EVERY_MS = 500;

/** The files a map's head side is read from beside `HEAD`: the index, wherever git keeps it, and checkride's summary. */
export type Watched = { readonly repo: string; readonly index: string; readonly summary: string };

/** Where `repo` keeps what the watch reads; git names the index, since a worktree keeps its own. */
export const watchedIn = (repo: string): Watched => {
  const index = execFileSync('git', ['rev-parse', '--git-path', 'index'], { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  return { repo, index: isAbsolute(index) ? index : join(repo, index), summary: join(repo, '.check', 'summary.json') };
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

/** What a map's head side is made of, as one string: `HEAD`'s commit, the index's stamp and the summary's. */
export const signatureOf = async (watched: Watched): Promise<string> => {
  const [head, index, summary] = await Promise.all([headOf(watched.repo), stamp(watched.index), stamp(watched.summary)]);
  return `${head} ${index} ${summary}`;
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
