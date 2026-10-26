/**
 * serve: the world on loopback (D92, C13). One `node:http` server bound to
 * `127.0.0.1` at a port the system picks, answering four things to read and
 * one to write, and nothing else (D93): the built app's `index.html` at `/`,
 * its assets by path under the directory it is handed, the map at
 * `/map.json`, held in memory, and, when it is handed the run's `.check/`, a
 * slot's raw output at `/check/<slot>`, read only, for the slots the map
 * holds and no other (D134); and, when it is handed a way to rebuild, the one
 * write C13 allows, `POST /base`, which asks for the map over another base
 * and holds the one it gets in place of the map it held. It answers only a
 * `Host` of `127.0.0.1:<port>` or `localhost:<port>`, and the map, the raw
 * output and the write only to the run's token: a page in another tab can
 * reach a loopback port, and through DNS rebinding read what it answers, so
 * the server trusts neither the port nor the origin but the token the opened
 * URL carries. The write checks the `Origin` too, since a form in another
 * tab could send one, and takes only a ref `git rev-parse --verify` resolves
 * to a commit, never one opening with `-`, which git would read as a flag.
 * The asset directory is an argument, so a test serves a stub `index.html`
 * and no test needs a Vite build (D133).
 */

import { execFile } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';

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
  /** The run's token, which `/map.json` and `/check/<slot>` require as `?token=`. */
  readonly token: string;
  /** The check artifacts to serve raw at `/check/<slot>`; left out, as a fixture or a test leaves it, the path is not served. */
  readonly checks?: ServedChecks | undefined;
  /** How `POST /base` rebuilds the map; left out, the write is not taken. */
  readonly rebase?: Rebase | undefined;
};

export type Served = {
  /** What to open: the page with the token in its query. */
  readonly url: string;
  readonly port: number;
  /** The interface the socket is bound to: always the loopback address. */
  readonly address: string;
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

/** A path segment decoded, or left as it came when it does not decode, which no slot is named like. */
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

/** Serve the app, the map and the raw check output on loopback at a port of the system's choosing, and take `POST /base` when handed a way to rebuild; resolves once it is listening. */
export const serve = async ({ assets, map: first, token, checks: given, rebase }: ServeOptions): Promise<Served> => {
  const root = resolve(assets);
  let port = 0;
  let map = first;
  let checks = given;

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
    map = rebuilt.map;
    checks = checks === undefined ? undefined : { dir: checks.dir, slots: rebuilt.slots };
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
  const bound = server.address();
  if (bound === null || typeof bound === 'string') throw new Error('the server bound no TCP port');
  port = bound.port;

  return {
    url: `http://${LOOPBACK}:${String(port)}/?token=${token}`,
    port,
    address: bound.address,
    close: () =>
      new Promise<void>((closed, failed) => {
        server.closeAllConnections();
        server.close((error) => (error === undefined ? closed() : failed(error)));
      }),
  };
};
