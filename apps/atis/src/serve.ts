/**
 * serve: the world on loopback (D92, C13). One `node:http` server bound to
 * `127.0.0.1` at a port the system picks, answering three things and nothing
 * else (D93): the built app's `index.html` at `/`, its assets by path under the
 * directory it is handed, and the map at `/map.json`, held in memory. It
 * answers only a `Host` of `127.0.0.1:<port>` or `localhost:<port>`, and the
 * map only to the run's token (D134): a page in another tab can reach a
 * loopback port, and through DNS rebinding read what it answers, so the server
 * trusts neither the port nor the origin but the token the opened URL carries.
 * The asset directory is an argument, so a test serves a stub `index.html` and
 * no test needs a Vite build (D133).
 */

import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, resolve, sep } from 'node:path';

export type ServeOptions = {
  /** The built web app: `index.html` and its assets, served by path beneath it. */
  readonly assets: string;
  /** The map as its JSON text. */
  readonly map: string;
  /** The run's token, which `/map.json` requires as `?token=`. */
  readonly token: string;
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

/** Serve the app and the map on loopback at a port of the system's choosing; resolves once it is listening. */
export const serve = async ({ assets, map, token }: ServeOptions): Promise<Served> => {
  const root = resolve(assets);
  let port = 0;

  const handle = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    const host = request.headers.host;
    if (host !== `${LOOPBACK}:${String(port)}` && host !== `localhost:${String(port)}`) {
      answer(request, response, 403, PLAIN, 'atis answers only its own loopback host\n');
      return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      answer(request, response, 405, PLAIN, 'atis serves; it takes nothing\n');
      return;
    }
    const url = new URL(request.url ?? '/', `http://${host}`);
    if (url.pathname === '/map.json') {
      if (url.searchParams.get('token') !== token) {
        answer(request, response, 403, PLAIN, "the map answers only to this run's token\n");
        return;
      }
      answer(request, response, 200, TYPES['.json'] ?? OCTETS, map);
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
