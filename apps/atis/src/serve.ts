/**
 * serve: the world on loopback (D92, C13). One `node:http` server bound to
 * `127.0.0.1` at a port the system picks, answering six things to read and
 * one to write, and nothing else (D93): the built app's `index.html` at `/`,
 * its assets by path under the directory it is handed, the map at
 * `/map.json`, held in memory, and, when it is handed the run's `.check/`, a
 * slot's raw output at `/check/<slot>`, read only, for the slots the map
 * holds and no other (D134); and, when it is handed a way to rebuild, the one
 * write C13 allows, `POST /base`, which asks for the map over another base
 * and holds the one it gets in place of the map it held, and beside it a
 * changed file's diff at `/diff/<path>`, read from git in the repository the
 * base is resolved in, between the two sides of the map it holds, for the
 * paths that map changed and no other (D102, D134), with the repository's
 * path and the editor template its `atis.config.json` names, so the page can
 * open the file at a line. The sixth is a file's text at `/file/<path>`
 * (D211 (file-text)), in the same repository, for a path the held map names
 * on its terrain or its shore and no other. It is read from git's objects
 * alone, never from the disk: from the head commit by its full sha, or, for
 * a head that is the working tree, from the tree that head was written as,
 * handed in beside the map (D312 (tree-beside-map)), so the text is the
 * bytes the map was measured from and no path a request names is ever joined
 * onto a directory. `git cat-file` does the reading, since it takes a path
 * as that path whatever it spells, where `git show` reads two dots in a
 * file's name as a range of commits (D311 (file-blob)). It answers JSON
 * with the diff's root and editor, never a type the file's name suggests,
 * with `nosniff`; a file past the size cap is a 413 (D310 (file-cap)), one
 * holding a NUL byte a 415, and anything that is no file in that object a
 * 404 (D311 (file-blob)). It answers only a
 * `Host` of `127.0.0.1:<port>` or `localhost:<port>`, and the map, the raw
 * output, the diff, the file's text and the write only to the run's token: a
 * page in another tab can reach a loopback port, and through DNS rebinding
 * read what it answers, so the server trusts neither the port nor the origin
 * but the token the opened URL carries. The write checks the `Origin` too,
 * since a form in another tab could send one, and takes only a ref
 * `git rev-parse --verify` resolves to a commit, never one opening with `-`,
 * which git would read as a flag.
 * It takes one socket path too, `/socket`, on the same port, on every run
 * (D178): a WebSocket the page opens with the run's token, from its own
 * `Origin`. Under `--watch` every map the watch rebuilds is pushed over it as
 * `{ "kind": "map", "map": … }`, a message kind as weft's watch sends, the
 * page reading only the kinds it knows, and as weft's does, the server sends
 * the map it holds as the page connects (D106). A watching run also says
 * what the watch is doing, `{ "kind": "watch", "state": … }`, to each page
 * as it connects and whenever it moves: `following`, or `rebuilding` while a
 * map is measured, so the page says `live` only where something follows the
 * repository and says when a map is on its way (D336 (watch-says)). A run
 * with no watch says neither. The page sends nothing on it.
 * The second write, `POST /highlight`, is how `atis mcp` points at the map
 * (D110): with the token and this server's own `Origin`, as the first, it
 * names a file the held map places or a notice by its rank, anything else
 * refused, and is relayed to each open page as `{ "kind": "highlight", … }`;
 * the answer says how many pages it reached, so the agent hears when no tab
 * is open. A served run says where to send it in `atis/serve.json` under
 * its working tree's own git directory, readable by its owner alone, since
 * the token in it opens the map (D138, D190). A run handed a tour written
 * for its map serves it beside the map at `/tour.json`, read only and to the
 * run's token as the map is (D112, D183), and the URL it opens carries
 * `tour`, so the page asks for one only when one is served and a run with
 * none shows nothing new.
 * The asset directory is an argument, so a test serves a stub `index.html`
 * and no test needs a Vite build (D133).
 */

import { execFile } from 'node:child_process';
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { STATUS_CODES, createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Duplex } from 'node:stream';
import { dirname, extname, join, resolve, sep } from 'node:path';

import { CONFIG_FILE, DEFAULT_EDITOR, configuredEditor } from 'core';
import { WebSocket, WebSocketServer } from 'ws';

import { worktreeDirectory } from './cache.js';

/** The run's check artifacts: where checkride wrote them, and the slots the map holds, the only ones served. */
export type ServedChecks = {
  readonly dir: string;
  readonly slots: readonly string[];
};

/**
 * What `POST /base` asks for (D99): a ref to measure from, or the head's
 * parent or the newest tag it reaches by name, or neither, the trunk; and
 * whether the head is the working tree rather than the commit.
 */
export type BaseRequest = { readonly base?: string; readonly last?: 'commit' | 'tag'; readonly working_tree?: boolean };

/**
 * A map rebuilt over another base: its JSON text, the slots its raw output
 * may now be served for, and, when its head is the working tree, the tree
 * that head was written as, which `/file/<path>` reads in place of a commit
 * (D312 (tree-beside-map)).
 */
export type Rebuilt = { readonly map: string; readonly slots: readonly string[]; readonly tree?: string | undefined };

/**
 * What `/diff/<path>` answers (D102): the file's diff between the map's two
 * sides as git prints it, the repository's absolute path, and the editor
 * template the page fills to open the file at a line.
 */
export type ServedDiff = { readonly path: string; readonly diff: string; readonly root: string; readonly editor: string };

/**
 * What `/file/<path>` answers (D211 (file-text)): the path asked for, as the
 * map writes it; the file's text; the git object it was read from, the
 * head's full sha or the working tree's tree sha; and the repository's
 * absolute path and the editor template, as a diff's answer carries them.
 */
export type ServedFile = { readonly path: string; readonly text: string; readonly at: string; readonly root: string; readonly editor: string };

/** How the server rebuilds the map over another base: the repository a ref is resolved in, and the rebuild itself, which throws on a base it cannot measure from. */
export type Rebase = {
  readonly repo: string;
  readonly rebuild: (request: BaseRequest) => Promise<Rebuilt>;
};

export type ServeOptions = {
  /** The built web app: `index.html` and its assets, served by path beneath it. */
  readonly assets: string;
  /** The map as its JSON text. */
  readonly map: string;
  /** The run's token, which `/map.json`, `/tour.json`, `/check/<slot>`, `/diff/<path>`, `/file/<path>`, the socket, `POST /base` and `POST /highlight` require as `?token=`. */
  readonly token: string;
  /** The check artifacts to serve raw at `/check/<slot>`; left out, as a fixture or a test leaves it, the path is not served. */
  readonly checks?: ServedChecks | undefined;
  /** How `POST /base` rebuilds the map, and the repository `/diff/<path>` and `/file/<path>` read; left out, none of the three is served. */
  readonly rebase?: Rebase | undefined;
  /** The tree the map's head was written as, when that head is the working tree: what `/file/<path>` reads, since no commit holds it (D312 (tree-beside-map)); left out, a working tree's map serves no file's text. */
  readonly tree?: string | undefined;
  /** Send each page what the watch is doing and the map held as its socket connects, so a map the watch rebuilt while the page loaded is never missed (D106, D336 (watch-says)); the socket itself is taken on every run (D178). */
  readonly watch?: boolean | undefined;
  /** A tour written for the map, as its JSON text, served at `/tour.json` (D112, D183); left out, the path is not served and the page plays none. */
  readonly tour?: string | undefined;
};

/** What `POST /highlight` names (D178): a file the held map places, by its path, or a notice by its rank, 1 the primary. */
export type HighlightRequest = { readonly file: string } | { readonly notice: number };

/** What `POST /highlight` answers once it relays: how many open pages it reached, none when no tab is open. */
export type Highlighted = { readonly pages: number };

/** What a watching run says of its watch on the socket (D336 (watch-says)): it follows the repository, or it is measuring the map the repository moved to. */
export type WatchState = 'following' | 'rebuilding';

/** How `atis mcp` reaches the run serving a repository's tab (D138): its port on loopback, its token, and its process. */
export type Serving = { readonly port: number; readonly token: string; readonly pid: number };

export type Served = {
  /** What to open: the page with the token in its query, and `tour` when a tour is served beside the map. */
  readonly url: string;
  readonly port: number;
  /** The interface the socket is bound to: always the loopback address. */
  readonly address: string;
  /** The base the page last switched to over `POST /base`, which a rebuild keeps to; none while the run's own base stands. */
  readonly asked: () => BaseRequest | undefined;
  /** Hold a rebuilt map in place of the one held, and push it to every open socket (D106). */
  readonly push: (rebuilt: Rebuilt) => void;
  /** Say what the watch is doing to every open socket, and to each page that connects from here on (D336 (watch-says)). */
  readonly say: (state: WatchState) => void;
  /** Stop answering and drop every connection. */
  readonly close: () => Promise<void>;
};

const LOOPBACK = '127.0.0.1';

/** What each asset is served as; Vite writes the first few, the rest keep a hand-made build honest. */
const TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.woff2': 'font/woff2',
};
const OCTETS = 'application/octet-stream';
const PLAIN = 'text/plain; charset=utf-8';

/** A slot's name as checkride writes it: one plain word, never a path. */
const SLOT_NAME = /^[a-z0-9_-]+$/i;
/** A slot's raw output, by the files checkride writes beside its summary: its standard output first, else its structured report. */
const RAW_FILES = ['.stdout.txt', '.json'] as const;

/** The most a `POST /base` body may hold: a ref and two words, never a file. */
const BODY_LIMIT = 4096;

/** The path the page opens its socket at, on every run (D106, D178). */
const SOCKET_PATH = '/socket';
/** The most one message from the page may hold on the socket, which carries nothing from it. */
const SOCKET_LIMIT = 1024;

/** The file a serving run says how to reach it in (D138). */
const SERVING_FILE = 'serve.json';
/** Read and write for the owner alone: the token in the file opens the map. */
const OWNER_ONLY = 0o600;

/** The most one file's diff may run to before git's answer is cut off as a failure. */
const DIFF_LIMIT = 32 * 1024 * 1024;
/** A commit's full sha, SHA-1 or SHA-256: the only form a side is handed to git in, so a map can never name a flag. */
const SHA = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
/** The head a map reads from the working tree names in place of a commit (D99). */
const WORKING_TREE = 'working-tree';

/**
 * The most a file's text may run to, in bytes as git stores it, before
 * `/file/<path>` answers 413 in its place (D310 (file-cap)): a megabyte,
 * which no file a person reads in a panel is past, and which keeps a
 * lockfile or a bundle from being escaped into one JSON string.
 */
const FILE_LIMIT = 1024 * 1024;
/** The most git's answer to a blob's type or its size may hold: a word or a number, never a file. */
const FACT_LIMIT = 256;
/** What `/file/<path>` sends beside every answer: the type it names is the type, whatever the bytes look like. */
const NOSNIFF = { 'x-content-type-options': 'nosniff' } as const;

/** One answer: the status, the type, and the body, left off a HEAD, with any headers a path adds. */
const answer = (request: IncomingMessage, response: ServerResponse, status: number, type: string, body: string | Buffer, headers: Readonly<Record<string, string>> = {}): void => {
  response.writeHead(status, { 'content-type': type, 'content-length': Buffer.byteLength(body), 'cache-control': 'no-store', ...headers });
  response.end(request.method === 'HEAD' ? undefined : body);
};

/** The file a path names beneath the asset root, or none when it would reach outside it or does not parse. */
const fileFor = (root: string, pathname: string): string | undefined => {
  try {
    const file = pathname === '/' ? resolve(root, 'index.html') : resolve(root, `.${decodeURIComponent(pathname)}`);
    return file.startsWith(root + sep) ? file : undefined;
  } catch {
    return undefined;
  }
};

/** A path segment decoded, or left as it came when it does not decode, which no slot, changed path or file is named like. */
const decodedOr = (segment: string): string => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

/** Whether a path is a file that exists. */
const isFile = async (file: string): Promise<boolean> => {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
};

/** The first raw file a held slot has, or none; a slot the map does not hold, or a name that is not one, is never looked for. */
const rawFileFor = async (checks: ServedChecks | undefined, slot: string): Promise<string | undefined> => {
  if (checks === undefined || !SLOT_NAME.test(slot) || !checks.slots.includes(slot)) return undefined;
  const files = RAW_FILES.map((suffix) => join(resolve(checks.dir), `${slot}${suffix}`));
  const present = await Promise.all(files.map(isFile));
  return files.find((_, index) => present[index] === true);
};

/** A request's body as text, refused past `BODY_LIMIT`. */
const bodyOf = (request: IncomingMessage): Promise<string | undefined> =>
  new Promise((done, failed) => {
    const chunks: Buffer[] = [];
    let size = 0;
    request.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size <= BODY_LIMIT) chunks.push(chunk);
    });
    request.on('end', () => done(size > BODY_LIMIT ? undefined : Buffer.concat(chunks).toString('utf8')));
    request.on('error', failed);
  });

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A `POST /base` body as a request, or why it is not one: JSON naming at most one base, each field the type it must be. */
export const parseBaseRequest = (text: string): BaseRequest | { readonly reason: string } => {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { reason: 'the body is not JSON' };
  }
  if (!isRecord(value)) return { reason: 'the body is not a JSON object' };
  const { base, last, working_tree: working } = value;
  if (base !== undefined && (typeof base !== 'string' || base === '')) return { reason: 'base must name a ref' };
  if (last !== undefined && last !== 'commit' && last !== 'tag') return { reason: 'last must be commit or tag' };
  if (base !== undefined && last !== undefined) return { reason: 'base and last each name the base; give one of them' };
  if (working !== undefined && typeof working !== 'boolean') return { reason: 'working_tree must be true or false' };
  return { ...(base === undefined ? {} : { base }), ...(last === undefined ? {} : { last }), ...(working === undefined ? {} : { working_tree: working }) };
};

/** A `POST /highlight` body as a request, or why it is not one: JSON naming a file by its path or a notice by its rank from 1, one of them and nothing else (D178). */
export const parseHighlight = (text: string): HighlightRequest | { readonly reason: string } => {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { reason: 'the body is not JSON' };
  }
  if (!isRecord(value)) return { reason: 'the body is not a JSON object' };
  const others = Object.keys(value).filter((key) => key !== 'file' && key !== 'notice');
  if (others.length > 0) return { reason: `a highlight names a file or a notice, never ${others.join(' or ')}` };
  const { file, notice } = value;
  if (file !== undefined && notice !== undefined) return { reason: 'file and notice each name the target; give one of them' };
  if (typeof file === 'string' && file !== '') return { file };
  if (typeof notice === 'number' && Number.isSafeInteger(notice) && notice >= 1) return { notice };
  return { reason: 'a highlight names a file by its path, or a notice by its rank from 1' };
};

/** What a highlight may name in a map: the files its layout places on the terrain, and how many notices it ranks. */
type Targets = { readonly files: ReadonlySet<string>; readonly notices: number };

/** A map's targets, read loosely from its text as the sides are; a map that does not parse places nothing and ranks nothing. */
const targetsOf = (text: string): Targets => {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { files: new Set(), notices: 0 };
  }
  const terrain = isRecord(value) ? value['terrain'] : undefined;
  const layout = isRecord(terrain) ? terrain['layout'] : undefined;
  const positions = isRecord(layout) && isRecord(layout['positions']) ? layout['positions'] : {};
  const organelles: unknown = isRecord(terrain) ? terrain['organelles'] : undefined;
  const files = (Array.isArray(organelles) ? (organelles as readonly unknown[]) : []).flatMap((organelle) =>
    isRecord(organelle) && typeof organelle['id'] === 'string' && Object.hasOwn(positions, organelle['id']) ? [organelle['id']] : [],
  );
  const notices: unknown = isRecord(value) ? value['notices'] : undefined;
  return { files: new Set(files), notices: Array.isArray(notices) ? notices.length : 0 };
};

/** Why a map refuses a highlight's target, or none when it places the file or ranks the notice. */
const refusalOf = (asked: HighlightRequest, held: Targets): string | undefined => {
  if ('file' in asked) return held.files.has(asked.file) ? undefined : `the map places no file ${asked.file}`;
  if (asked.notice <= held.notices) return undefined;
  return held.notices === 0 ? 'the map ranks no notice' : `the map ranks ${String(held.notices)} notice${held.notices === 1 ? '' : 's'}; none is ${String(asked.notice)}`;
};

/**
 * Where a run serving `repo`'s working tree says how to reach it: under that
 * working tree's own git directory, never the tree itself, so a linked
 * worktree's run and the main one's each keep their own (D138, D190). Throws
 * where git finds no repository.
 */
export const servingPath = (repo: string): string => join(worktreeDirectory(repo), SERVING_FILE);

/**
 * Say how to reach this run in the `atis/serve.json` of `repo`'s git
 * directory (D138, D190): its port, its token and its process, written whole
 * or not at all, readable and writable by its owner alone. Returns where it
 * went; throws on a repository it cannot write to.
 */
export const keepServing = (repo: string, serving: Serving): string => {
  const path = servingPath(repo);
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.${String(serving.pid)}.tmp`;
  rmSync(temp, { force: true });
  writeFileSync(temp, `${JSON.stringify(serving)}\n`, { mode: OWNER_ONLY });
  renameSync(temp, path);
  return path;
};

/** Whether a process is running; one owned by another user is, though this one cannot signal it. */
const isRunning = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return isRecord(error) && error['code'] === 'EPERM';
  }
};

/** What `repo`'s `atis/serve.json` names, whatever its process's state; none when there is none, it does not read as one, or `repo` is in no repository. */
const servingFile = (repo: string): Serving | undefined => {
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(servingPath(repo), 'utf8'));
  } catch {
    return undefined;
  }
  if (!isRecord(value)) return undefined;
  const { port, token, pid } = value;
  if (typeof port !== 'number' || !Number.isSafeInteger(port) || port < 1 || port > 65_535) return undefined;
  if (typeof token !== 'string' || token === '' || typeof pid !== 'number' || !Number.isSafeInteger(pid) || pid < 1) return undefined;
  return { port, token, pid };
};

/** The run serving `repo`'s tab, as its `atis/serve.json` names it, while that process runs; none when no run serves it, or the one that did has died without taking the file back (D138). */
export const servingIn = (repo: string): Serving | undefined => {
  const serving = servingFile(repo);
  return serving !== undefined && isRunning(serving.pid) ? serving : undefined;
};

/** Take back what `keepServing` wrote, when the file still names process `pid`; a later run serving the same repository keeps its own. */
export const dropServing = (repo: string, pid: number): void => {
  if (servingFile(repo)?.pid === pid) rmSync(servingPath(repo), { force: true });
};

/** Whether `ref` names a commit in `repo`, by `git rev-parse --verify`; a ref opening with `-` is never handed to git, which would read it as a flag. */
const isCommit = (repo: string, ref: string): Promise<boolean> =>
  ref.startsWith('-')
    ? Promise.resolve(false)
    : new Promise((done) => {
        execFile('git', ['rev-parse', '--verify', '--quiet', '--end-of-options', `${ref}^{commit}`], { cwd: repo }, (error) => done(error === null));
      });

/** A failure's message, without a stack. */
const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** One changed file a diff may be read for: its kind, and the path it was renamed from. */
type Diffable = { readonly kind: string; readonly from?: string };

/** What a diff is read between, from the map the server holds: its two sides and each path it changed; none when it holds no change git can be asked about. */
type Sides = { readonly mergeBase: string; readonly head: string; readonly changed: ReadonlyMap<string, Diffable> };

/** The sides of a map's change, read loosely from its text, since the server holds the map as text and only serves it; a map with a side that is no commit's sha, or no change, has none. */
const sidesOf = (text: string): Sides | undefined => {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (!isRecord(value) || !isRecord(value['meta']) || !isRecord(value['weather'])) return undefined;
  const { merge_base: mergeBase, head } = value['meta'];
  const changed = value['weather']['changed'];
  if (typeof mergeBase !== 'string' || !SHA.test(mergeBase) || typeof head !== 'string' || !(SHA.test(head) || head === WORKING_TREE) || !Array.isArray(changed)) return undefined;
  const files = new Map<string, Diffable>();
  for (const file of changed as readonly unknown[]) {
    if (!isRecord(file) || typeof file['path'] !== 'string' || typeof file['kind'] !== 'string') continue;
    const from = file['from'];
    files.set(file['path'], { kind: file['kind'], ...(typeof from === 'string' ? { from } : {}) });
  }
  return { mergeBase, head, changed: files };
};

/** git's answer to `args` in `repo`; `git diff --no-index` exits 1 when the two files differ, which is the answer asked for. */
const gitText = (repo: string, args: readonly string[]): Promise<string> =>
  new Promise((done, failed) => {
    execFile('git', args, { cwd: repo, encoding: 'utf8', maxBuffer: DIFF_LIMIT }, (error, stdout) => {
      if (error === null || (args.includes('--no-index') && error.code === 1)) done(stdout);
      else failed(error);
    });
  });

/**
 * One changed file's diff between the map's sides, renames followed through
 * the path it came from. A working tree's head is the tree on disk, where a
 * file `git add` would take but never has is untracked, so an added file git
 * shows nothing for there is diffed against nothing (D99).
 */
const diffOf = async (repo: string, sides: Sides, path: string, file: Diffable): Promise<string> => {
  const working = sides.head === WORKING_TREE;
  const paths = file.from === undefined ? [path] : [file.from, path];
  const diff = await gitText(repo, ['diff', '--no-color', '--no-ext-diff', '--find-renames', sides.mergeBase, ...(working ? [] : [sides.head]), '--', ...paths]);
  if (diff !== '' || !working || file.kind !== 'added') return diff;
  return gitText(repo, ['diff', '--no-color', '--no-ext-diff', '--no-index', '--', '/dev/null', path]);
};

/** What a file's text may be read for, from the map the server holds: the head it is read at, and every path that map names. */
type Listed = { readonly head: string; readonly files: ReadonlySet<string> };

/**
 * The files a map names, read loosely from its text as its sides are: every
 * file on its terrain and every file of a shore group, with the head they
 * are read at. A map whose head is neither a commit's sha nor the working
 * tree names none.
 */
const listedOf = (text: string): Listed | undefined => {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (!isRecord(value) || !isRecord(value['meta']) || !isRecord(value['terrain'])) return undefined;
  const { head } = value['meta'];
  if (typeof head !== 'string' || !(SHA.test(head) || head === WORKING_TREE)) return undefined;
  const { organelles, groups } = value['terrain'];
  const files = new Set<string>();
  for (const organelle of Array.isArray(organelles) ? (organelles as readonly unknown[]) : []) {
    if (isRecord(organelle) && typeof organelle['path'] === 'string') files.add(organelle['path']);
  }
  for (const group of Array.isArray(groups) ? (groups as readonly unknown[]) : []) {
    const held: unknown = isRecord(group) ? group['files'] : undefined;
    for (const file of Array.isArray(held) ? (held as readonly unknown[]) : []) {
      if (typeof file === 'string') files.add(file);
    }
  }
  return { head, files };
};

/**
 * Whether a path is one a tree holds a file at, from its root: parts joined
 * by `/`, none of them empty, `.` or `..`, and no NUL anywhere. An absolute
 * path, one that climbs, and one git would read from the directory it runs
 * in rather than from the tree's root are each refused by it, whatever the
 * map names (D311 (file-blob)).
 */
const isTreePath = (path: string): boolean => !path.includes('\0') && path.split('/').every((part) => part !== '' && part !== '.' && part !== '..');

/** git's answer to `args` in `repo` as bytes, at most `limit` of them; none when git refuses, as it does a path an object does not hold, or says more than that. */
const gitBytes = (repo: string, args: readonly string[], limit: number): Promise<Buffer | undefined> =>
  new Promise((done) => {
    execFile('git', args, { cwd: repo, encoding: 'buffer', maxBuffer: limit }, (error, stdout) => done(error === null ? stdout : undefined));
  });

/** Why `/file/<path>` answers no text, by the status it answers in its place; each is plain words that name no path. */
const UNREAD = {
  404: 'no text for that path\n',
  413: `that file is past ${String(FILE_LIMIT)} bytes\n`,
  415: 'that file holds a NUL byte, so it is not text\n',
} as const;

/**
 * The file at `path` in the commit or the tree `at`, as git stores it, or
 * the status that stands in its place (D311 (file-blob)). Git is asked what
 * stands there before it is read. Only a blob is a file: a directory, a
 * submodule, and a path the object does not hold, as a file the change
 * deleted, are each a 404, and a symlink is the link's own few bytes, never
 * the file it points at. The size is read before the bytes, so a file past
 * the cap is never read (D310 (file-cap)), and a NUL byte makes it no text.
 * `at` is a full sha, so what git is handed can never be a flag, and `path`
 * follows its colon, where git reads it from the tree's root.
 *
 * All three readings are `git cat-file`, which takes `<sha>:<path>` as one
 * object's name and nothing else (D311 (file-blob)). `git show` reads the
 * same words as a range of commits first: a file named `src/a..private`
 * answered the log of a branch called `private`, with its authors and its
 * patches, in place of its own text, and a repository under review names its
 * files as it likes. `cat-file blob` also refuses what is no blob, so the
 * bytes can only be those of the file asked about.
 */
const storedAt = async (repo: string, at: string, path: string): Promise<Buffer | keyof typeof UNREAD> => {
  const object = `${at}:${path}`;
  const [type, size] = await Promise.all([gitBytes(repo, ['cat-file', '-t', object], FACT_LIMIT), gitBytes(repo, ['cat-file', '-s', object], FACT_LIMIT)]);
  const bytes = size === undefined ? Number.NaN : Number(size.toString('utf8').trim());
  if (type?.toString('utf8').trim() !== 'blob' || !Number.isSafeInteger(bytes)) return 404;
  if (bytes > FILE_LIMIT) return 413;
  const stored = await gitBytes(repo, ['cat-file', 'blob', object], FILE_LIMIT);
  if (stored === undefined) return 404;
  return stored.includes(0) ? 415 : stored;
};

/** The editor template the repository's `atis.config.json` names, else VS Code's (D102); a config that names a broken one throws, as misuse (C4). */
const editorOf = async (repo: string): Promise<string> => {
  let text: string | undefined;
  try {
    text = await readFile(join(repo, CONFIG_FILE), 'utf8');
  } catch {
    text = undefined;
  }
  return configuredEditor(text) ?? DEFAULT_EDITOR;
};

/** Refuse a socket's upgrade with a status and no body, and drop the connection. */
const refuseUpgrade = (socket: Duplex, status: number): void => {
  socket.end(`HTTP/1.1 ${String(status)} ${STATUS_CODES[status] ?? ''}\r\nconnection: close\r\ncontent-length: 0\r\n\r\n`);
};

/** Serve the app, the map and the raw check output on loopback at a port of the system's choosing, take `POST /base` and serve the diffs and the files' text when handed a way to rebuild, and take the page's socket and `POST /highlight`; resolves once it is listening. */
export const serve = async ({ assets, map: first, token, checks: given, rebase, tree: written, watch = false, tour }: ServeOptions): Promise<Served> => {
  const root = resolve(assets);
  let port = 0;
  let map = first;
  let checks = given;
  // The tree a working tree's head was written as, held with the map it was measured for and replaced with it (D312 (tree-beside-map)).
  let tree = written;
  // The base the page last switched to, which a watch's rebuild keeps to (D106).
  let switched: BaseRequest | undefined;
  // The page's sockets, on every run (D178); each hears every map pushed and every highlight relayed, and is heard from not at all.
  const sockets = new WebSocketServer({ noServer: true, maxPayload: SOCKET_LIMIT });
  // The diff's repository and editor, read once, so a broken editor fails the run before it serves (C4).
  const repo = rebase === undefined ? undefined : resolve(rebase.repo);
  const editor = repo === undefined ? undefined : await editorOf(repo);
  /** The held map as the socket carries it, a kind and the map, without parsing the map the server only serves. */
  const pushed = (): string => `{"kind":"map","map":${map.trimEnd()}}`;
  // What the watch is doing, as the socket carries it (D336 (watch-says)).
  let watching: WatchState = 'following';
  const said = (): string => JSON.stringify({ kind: 'watch', state: watching });
  /** Hold a rebuilt map in place of the one held, its raw output served for the slots it holds and its files' text read from the tree it came with, or from its commit when it came with none. */
  const hold = (rebuilt: Rebuilt): void => {
    map = rebuilt.map;
    checks = checks === undefined ? undefined : { dir: checks.dir, slots: rebuilt.slots };
    tree = rebuilt.tree;
  };
  /** A reading of the held map, made again only when a base or a watch replaces it. */
  const reading = <T>(read: (text: string) => T): (() => T) => {
    let last: { readonly text: string; readonly value: T } | undefined;
    return () => {
      if (last?.text !== map) last = { text: map, value: read(map) };
      return last.value;
    };
  };
  const sides = reading(sidesOf);
  const targets = reading(targetsOf);
  const listed = reading(listedOf);
  /** Send every open page a message, and say how many it reached. */
  const relay = (message: string): number => {
    let pages = 0;
    for (const client of sockets.clients) {
      if (client.readyState !== WebSocket.OPEN) continue;
      client.send(message);
      pages += 1;
    }
    return pages;
  };

  /** `/diff/<path>` (D102, D134): the run's token, then a path the held map changed, diffed between its sides in the repository the server reads. */
  const diffed = async (request: IncomingMessage, response: ServerResponse, url: URL, path: string): Promise<void> => {
    if (url.searchParams.get('token') !== token) {
      answer(request, response, 403, PLAIN, "a diff answers only to this run's token\n");
      return;
    }
    const held = sides();
    const file = held?.changed.get(path);
    if (repo === undefined || editor === undefined || held === undefined || file === undefined) {
      answer(request, response, 404, PLAIN, 'no diff for that path\n');
      return;
    }
    const served: ServedDiff = { path, diff: await diffOf(repo, held, path, file), root: repo, editor };
    answer(request, response, 200, TYPES['.json'] ?? OCTETS, `${JSON.stringify(served)}\n`);
  };

  /**
   * `/file/<path>` (D211 (file-text)): the run's token, then a path the held
   * map names, read from the object that map's head is, its commit or the
   * tree handed in beside a working tree's map, in the repository the server
   * reads. The request's path is looked up in the map and handed to git
   * after a sha and a colon; it is never joined onto a directory, and the
   * answer's type is JSON whatever the file is called.
   */
  const filed = async (request: IncomingMessage, response: ServerResponse, url: URL, path: string): Promise<void> => {
    const say = (status: number, type: string, body: string): void => answer(request, response, status, type, body, NOSNIFF);
    if (url.searchParams.get('token') !== token) {
      say(403, PLAIN, "a file's text answers only to this run's token\n");
      return;
    }
    const held = listed();
    const at = held?.head === WORKING_TREE ? tree : held?.head;
    if (repo === undefined || editor === undefined || held === undefined || at === undefined || !SHA.test(at) || !isTreePath(path) || !held.files.has(path)) {
      say(404, PLAIN, UNREAD[404]);
      return;
    }
    const stored = await storedAt(repo, at, path);
    if (typeof stored === 'number') {
      say(stored, PLAIN, UNREAD[stored]);
      return;
    }
    const served: ServedFile = { path, text: stored.toString('utf8'), at, root: repo, editor };
    say(200, TYPES['.json'] ?? OCTETS, `${JSON.stringify(served)}\n`);
  };

  /**
   * `POST /base` (D134): the run's token, an `Origin` of this server's own,
   * and a body naming a base the repository resolves to a commit; then the
   * map rebuilt over it, held in place of the last and answered.
   */
  const rebased = async (request: IncomingMessage, response: ServerResponse, url: URL, host: string): Promise<void> => {
    if (rebase === undefined) {
      answer(request, response, 405, PLAIN, 'this run takes no base\n');
      return;
    }
    if (url.searchParams.get('token') !== token) {
      answer(request, response, 403, PLAIN, "a base is taken only with this run's token\n");
      return;
    }
    if (request.headers.origin !== `http://${host}`) {
      answer(request, response, 403, PLAIN, 'a base is taken only from this page\n');
      return;
    }
    const text = await bodyOf(request);
    const asked = text === undefined ? { reason: 'the body is too long' } : parseBaseRequest(text);
    if ('reason' in asked) {
      answer(request, response, 400, PLAIN, `${asked.reason}\n`);
      return;
    }
    if (asked.base !== undefined && !(await isCommit(rebase.repo, asked.base))) {
      answer(request, response, 400, PLAIN, `${asked.base} names no commit\n`);
      return;
    }
    let rebuilt: Rebuilt;
    try {
      rebuilt = await rebase.rebuild(asked);
    } catch (error) {
      answer(request, response, 400, PLAIN, `${messageOf(error)}\n`);
      return;
    }
    hold(rebuilt);
    switched = asked;
    answer(request, response, 200, TYPES['.json'] ?? OCTETS, map);
  };

  /**
   * `POST /highlight` (D178): the run's token, an `Origin` of this server's
   * own, and a body naming a file the held map places or a notice it ranks;
   * then relayed to each open page, and answered with how many it reached.
   */
  const highlighted = async (request: IncomingMessage, response: ServerResponse, url: URL, host: string): Promise<void> => {
    if (url.searchParams.get('token') !== token) {
      answer(request, response, 403, PLAIN, "a highlight is taken only with this run's token\n");
      return;
    }
    if (request.headers.origin !== `http://${host}`) {
      answer(request, response, 403, PLAIN, "a highlight is taken only from this server's own origin\n");
      return;
    }
    const text = await bodyOf(request);
    const asked = text === undefined ? { reason: 'the body is too long' } : parseHighlight(text);
    if ('reason' in asked) {
      answer(request, response, 400, PLAIN, `${asked.reason}\n`);
      return;
    }
    const refused = refusalOf(asked, targets());
    if (refused !== undefined) {
      answer(request, response, 400, PLAIN, `${refused}\n`);
      return;
    }
    const reached: Highlighted = { pages: relay(JSON.stringify({ kind: 'highlight', ...asked })) };
    answer(request, response, 200, TYPES['.json'] ?? OCTETS, `${JSON.stringify(reached)}\n`);
  };

  const handle = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    const host = request.headers.host;
    if (host !== `${LOOPBACK}:${String(port)}` && host !== `localhost:${String(port)}`) {
      answer(request, response, 403, PLAIN, 'atis answers only its own loopback host\n');
      return;
    }
    const url = new URL(request.url ?? '/', `http://${host}`);
    if (request.method === 'POST' && url.pathname === '/base') {
      await rebased(request, response, url, host);
      return;
    }
    if (request.method === 'POST' && url.pathname === '/highlight') {
      await highlighted(request, response, url, host);
      return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      answer(request, response, 405, PLAIN, 'atis serves; it takes nothing but a base or a highlight\n');
      return;
    }
    if (url.pathname === '/map.json') {
      if (url.searchParams.get('token') !== token) {
        answer(request, response, 403, PLAIN, "the map answers only to this run's token\n");
        return;
      }
      answer(request, response, 200, TYPES['.json'] ?? OCTETS, map);
      return;
    }
    if (url.pathname === '/tour.json') {
      if (url.searchParams.get('token') !== token) {
        answer(request, response, 403, PLAIN, "the tour answers only to this run's token\n");
        return;
      }
      if (tour === undefined) answer(request, response, 404, PLAIN, 'no tour is served\n');
      else answer(request, response, 200, TYPES['.json'] ?? OCTETS, tour);
      return;
    }
    const slot = /^\/check\/([^/]+)$/.exec(url.pathname)?.[1];
    if (slot !== undefined) {
      if (url.searchParams.get('token') !== token) {
        answer(request, response, 403, PLAIN, "a check's raw output answers only to this run's token\n");
        return;
      }
      const file = await rawFileFor(checks, decodedOr(slot));
      if (file === undefined) {
        answer(request, response, 404, PLAIN, 'no raw output for that slot\n');
        return;
      }
      answer(request, response, 200, TYPES[extname(file)] ?? PLAIN, await readFile(file));
      return;
    }
    const changed = /^\/diff\/(.+)$/.exec(url.pathname)?.[1];
    if (changed !== undefined) {
      await diffed(request, response, url, decodedOr(changed));
      return;
    }
    const named = /^\/file\/(.+)$/.exec(url.pathname)?.[1];
    if (named !== undefined) {
      await filed(request, response, url, decodedOr(named));
      return;
    }
    const file = fileFor(root, url.pathname);
    if (file === undefined) {
      answer(request, response, 404, PLAIN, 'not served\n');
      return;
    }
    try {
      if (!(await stat(file)).isFile()) throw new Error('not a file');
      answer(request, response, 200, TYPES[extname(file)] ?? OCTETS, await readFile(file));
    } catch {
      answer(request, response, 404, PLAIN, 'not served\n');
    }
  };

  const server = createServer((request, response) => {
    handle(request, response).catch(() => {
      if (!response.headersSent) answer(request, response, 500, PLAIN, 'atis could not answer\n');
      else response.end();
    });
  });
  await new Promise<void>((listening, failed) => {
    server.once('error', failed);
    server.listen(0, LOOPBACK, () => listening());
  });
  /**
   * The page's socket at `/socket` (D106, D134, D178): the loopback host, the
   * run's token and an `Origin` of this server's own, as the writes ask,
   * since a socket has no same-origin rule and any tab could open one;
   * anything else is refused before it is upgraded.
   */
  server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const host = request.headers.host;
    if (host !== `${LOOPBACK}:${String(port)}` && host !== `localhost:${String(port)}`) {
      refuseUpgrade(socket, 403);
      return;
    }
    const url = new URL(request.url ?? '/', `http://${host}`);
    if (url.pathname !== SOCKET_PATH) {
      refuseUpgrade(socket, 404);
      return;
    }
    if (url.searchParams.get('token') !== token || request.headers.origin !== `http://${host}`) {
      refuseUpgrade(socket, 403);
      return;
    }
    sockets.handleUpgrade(request, socket, head, (client) => {
      client.on('error', () => client.terminate());
      if (!watch) return;
      client.send(said());
      client.send(pushed());
    });
  });
  const bound = server.address();
  if (bound === null || typeof bound === 'string') throw new Error('the server bound no TCP port');
  port = bound.port;

  return {
    url: `http://${LOOPBACK}:${String(port)}/?token=${token}${tour === undefined ? '' : '&tour'}`,
    port,
    address: bound.address,
    asked: () => switched,
    push: (rebuilt) => {
      hold(rebuilt);
      relay(pushed());
    },
    say: (state) => {
      watching = state;
      relay(said());
    },
    close: () =>
      new Promise<void>((closed, failed) => {
        for (const client of sockets.clients) client.terminate();
        sockets.close();
        server.closeAllConnections();
        server.close((error) => (error === undefined ? closed() : failed(error)));
      }),
  };
};
