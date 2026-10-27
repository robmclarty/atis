/**
 * serve: the world on loopback (D92, C13). One `node:http` server bound to
 * `127.0.0.1` at a port the system picks, answering five things to read and
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
 * open the file at a line. It answers only a `Host` of `127.0.0.1:<port>` or
 * `localhost:<port>`, and the map, the raw output, the diff and the write
 * only to the run's token: a page in another tab can
 * reach a loopback port, and through DNS rebinding read what it answers, so
 * the server trusts neither the port nor the origin but the token the opened
 * URL carries. The write checks the `Origin` too, since a form in another
 * tab could send one, and takes only a ref `git rev-parse --verify` resolves
 * to a commit, never one opening with `-`, which git would read as a flag.
 * Under `--watch` it takes one socket path too, `/watch`, on the same port
 * (D106): a WebSocket the page opens with the run's token, from its own
 * `Origin`, over which every map the watch rebuilds is pushed as
 * `{ "kind": "map", "map": … }`, a message kind as weft's watch sends, the
 * page reading only the kinds it knows; as weft's does, it sends the map it
 * holds as the page connects. The page sends nothing on it.
 * The asset directory is an argument, so a test serves a stub `index.html`
 * and no test needs a Vite build (D133).
 */

import { execFile } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { STATUS_CODES, createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Duplex } from 'node:stream';
import { extname, join, resolve, sep } from 'node:path';

import { CONFIG_FILE, DEFAULT_EDITOR, configuredEditor } from 'core';
import { WebSocket, WebSocketServer } from 'ws';

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

/** A map rebuilt over another base: its JSON text, and the slots its raw output may now be served for. */
export type Rebuilt = { readonly map: string; readonly slots: readonly string[] };

/**
 * What `/diff/<path>` answers (D102): the file's diff between the map's two
 * sides as git prints it, the repository's absolute path, and the editor
 * template the page fills to open the file at a line.
 */
export type ServedDiff = { readonly path: string; readonly diff: string; readonly root: string; readonly editor: string };

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
  /** The run's token, which `/map.json`, `/check/<slot>`, `/diff/<path>` and `POST /base` require as `?token=`. */
  readonly token: string;
  /** The check artifacts to serve raw at `/check/<slot>`; left out, as a fixture or a test leaves it, the path is not served. */
  readonly checks?: ServedChecks | undefined;
  /** How `POST /base` rebuilds the map, and the repository `/diff/<path>` reads; left out, neither is served. */
  readonly rebase?: Rebase | undefined;
  /** Take the page's socket at `/watch`, and name it in the URL to open, so the watch can push each map it rebuilds (D106); left out, no socket is taken. */
  readonly watch?: boolean | undefined;
};

export type Served = {
  /** What to open: the page with the token in its query. */
  readonly url: string;
  readonly port: number;
  /** The interface the socket is bound to: always the loopback address. */
  readonly address: string;
  /** The base the page last switched to over `POST /base`, which a rebuild keeps to; none while the run's own base stands. */
  readonly asked: () => BaseRequest | undefined;
  /** Hold a rebuilt map in place of the one held, and push it to every open socket (D106). */
  readonly push: (rebuilt: Rebuilt) => void;
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

/** The path the page opens its socket at, under `--watch` (D106). */
const WATCH_PATH = '/watch';
/** The most one message from the page may hold on the socket, which carries nothing from it. */
const SOCKET_LIMIT = 1024;

/** The most one file's diff may run to before git's answer is cut off as a failure. */
const DIFF_LIMIT = 32 * 1024 * 1024;
/** A commit's full sha, SHA-1 or SHA-256: the only form a side is handed to git in, so a map can never name a flag. */
const SHA = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
/** The head a map reads from the working tree names in place of a commit (D99). */
const WORKING_TREE = 'working-tree';

/** One answer: the status, the type, and the body, left off a HEAD. */
const answer = (request: IncomingMessage, response: ServerResponse, status: number, type: string, body: string | Buffer): void => {
  response.writeHead(status, { 'content-type': type, 'content-length': Buffer.byteLength(body), 'cache-control': 'no-store' });
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

/** A path segment decoded, or left as it came when it does not decode, which no slot or changed path is named like. */
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

/** Serve the app, the map and the raw check output on loopback at a port of the system's choosing, take `POST /base` and serve the diffs when handed a way to rebuild, and take the page's socket under a watch; resolves once it is listening. */
export const serve = async ({ assets, map: first, token, checks: given, rebase, watch = false }: ServeOptions): Promise<Served> => {
  const root = resolve(assets);
  let port = 0;
  let map = first;
  let checks = given;
  // The base the page last switched to, which a watch's rebuild keeps to (D106).
  let switched: BaseRequest | undefined;
  // The page's sockets, under a watch alone; each hears every map pushed and is heard from not at all.
  const sockets = watch ? new WebSocketServer({ noServer: true, maxPayload: SOCKET_LIMIT }) : undefined;
  // The diff's repository and editor, read once, so a broken editor fails the run before it serves (C4).
  const repo = rebase === undefined ? undefined : resolve(rebase.repo);
  const editor = repo === undefined ? undefined : await editorOf(repo);
  /** The held map as the socket carries it, a kind and the map, without parsing the map the server only serves. */
  const pushed = (): string => `{"kind":"map","map":${map.trimEnd()}}`;
  /** Hold a rebuilt map in place of the one held, its raw output served for the slots it holds. */
  const hold = (rebuilt: Rebuilt): void => {
    map = rebuilt.map;
    checks = checks === undefined ? undefined : { dir: checks.dir, slots: rebuilt.slots };
  };
  // The held map's sides, read again only when a base replaces it.
  let sidesRead: { readonly text: string; readonly sides: Sides | undefined } | undefined;
  const sides = (): Sides | undefined => {
    if (sidesRead?.text !== map) sidesRead = { text: map, sides: sidesOf(map) };
    return sidesRead.sides;
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
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      answer(request, response, 405, PLAIN, 'atis serves; it takes nothing but a base\n');
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
   * The page's socket at `/watch` (D106, D134): the loopback host, the run's
   * token and an `Origin` of this server's own, as the write asks, since a
   * socket has no same-origin rule and any tab could open one; anything else
   * is refused before it is upgraded.
   */
  server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const host = request.headers.host;
    if (host !== `${LOOPBACK}:${String(port)}` && host !== `localhost:${String(port)}`) {
      refuseUpgrade(socket, 403);
      return;
    }
    const url = new URL(request.url ?? '/', `http://${host}`);
    if (sockets === undefined || url.pathname !== WATCH_PATH) {
      refuseUpgrade(socket, 404);
      return;
    }
    if (url.searchParams.get('token') !== token || request.headers.origin !== `http://${host}`) {
      refuseUpgrade(socket, 403);
      return;
    }
    sockets.handleUpgrade(request, socket, head, (client) => {
      client.on('error', () => client.terminate());
      client.send(pushed());
    });
  });
  const bound = server.address();
  if (bound === null || typeof bound === 'string') throw new Error('the server bound no TCP port');
  port = bound.port;

  return {
    url: `http://${LOOPBACK}:${String(port)}/?token=${token}${watch ? '&watch=1' : ''}`,
    port,
    address: bound.address,
    asked: () => switched,
    push: (rebuilt) => {
      hold(rebuilt);
      const message = pushed();
      for (const client of sockets?.clients ?? []) if (client.readyState === WebSocket.OPEN) client.send(message);
    },
    close: () =>
      new Promise<void>((closed, failed) => {
        for (const client of sockets?.clients ?? []) client.terminate();
        sockets?.close();
        server.closeAllConnections();
        server.close((error) => (error === undefined ? closed() : failed(error)));
      }),
  };
};
