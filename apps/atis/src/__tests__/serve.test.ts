import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import type { OutgoingHttpHeaders } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, expect, test } from 'vitest';

import { serve } from '../serve.js';
import type { Served } from '../serve.js';

/**
 * The loopback server in-process over a stub app (D133): it answers the page,
 * the assets, the map and a held slot's raw output, and nothing else; binds
 * loopback alone (C13); and refuses a foreign Host and a missing or wrong
 * token (D134).
 */
const TOKEN = 'a3f1c2d4e5b6a7f8091a2b3c4d5e6f70';
const MAP = '{"meta":{"repo":"stub"}}\n';
const PAGE = '<!doctype html><html><body><canvas id="world"></canvas></body></html>\n';

const temps: string[] = [];
const servers: Served[] = [];

/** A temp directory holding a stub `index.html` and one asset, standing for the built app. */
const stubApp = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'atis-web-'));
  temps.push(dir);
  mkdirSync(join(dir, 'assets'));
  writeFileSync(join(dir, 'index.html'), PAGE);
  writeFileSync(join(dir, 'assets', 'index-abc123.js'), 'console.log("atis");\n');
  return dir;
};

const start = async (assets = stubApp()): Promise<Served> => {
  const served = await serve({ assets, map: MAP, token: TOKEN });
  servers.push(served);
  return served;
};

/** A temp `.check/` holding the raw output of two slots: `test`'s standard output and `lint`'s report, and `summary.json` beside them. */
const stubChecks = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'atis-check-'));
  temps.push(dir);
  writeFileSync(join(dir, 'summary.json'), '{"schema_version":1}\n');
  writeFileSync(join(dir, 'test.stdout.txt'), 'FAIL pm.test.ts\n');
  writeFileSync(join(dir, 'lint.json'), '[{"message":"unused"}]\n');
  return dir;
};

afterAll(async () => {
  await Promise.allSettled(servers.map((served) => served.close()));
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

type Answer = { readonly status: number; readonly type: string | undefined; readonly body: string };

/** One GET on loopback, with the headers given (a `Host` here is sent as written), the way a browser or another tab would send it. */
const get = (port: number, path: string, headers: OutgoingHttpHeaders = {}, method = 'GET'): Promise<Answer> =>
  new Promise((answered, failed) => {
    const sent = request({ host: '127.0.0.1', port, path, method, headers }, (response) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.on('end', () => answered({ status: response.statusCode ?? 0, type: response.headers['content-type'], body: Buffer.concat(chunks).toString('utf8') }));
    });
    sent.on('error', failed);
    sent.end();
  });

test('the server binds loopback alone, at a port of its own, and its URL carries the token', async () => {
  const served = await start();
  expect(served.address).toBe('127.0.0.1');
  expect(served.port).toBeGreaterThan(0);
  expect(served.url).toBe(`http://127.0.0.1:${String(served.port)}/?token=${TOKEN}`);
});

test('it answers the page at /, an asset by its path, and the map at /map.json with the token', async () => {
  const served = await start();
  const page = await get(served.port, `/?token=${TOKEN}`);
  expect(page.status).toBe(200);
  expect(page.type).toBe('text/html; charset=utf-8');
  expect(page.body).toBe(PAGE);

  const asset = await get(served.port, '/assets/index-abc123.js');
  expect(asset.status).toBe(200);
  expect(asset.type).toBe('text/javascript; charset=utf-8');
  expect(asset.body).toContain('atis');

  const map = await get(served.port, `/map.json?token=${TOKEN}`);
  expect(map.status).toBe(200);
  expect(map.type).toBe('application/json; charset=utf-8');
  expect(map.body).toBe(MAP);

  const head = await get(served.port, `/map.json?token=${TOKEN}`, {}, 'HEAD');
  expect(head.status).toBe(200);
  expect(head.body).toBe('');
});

test('any other path is a 404, a directory and a path that climbs out included', async () => {
  const served = await start();
  const paths = ['/nope', '/assets/', '/assets/missing.js', '/../package.json', '/%2e%2e/package.json', '/%zz'];
  const answers = await Promise.all(paths.map((path) => get(served.port, path)));
  expect(answers.map((answer) => answer.status)).toEqual(paths.map(() => 404));
  expect((await get(served.port, '/', {}, 'POST')).status).toBe(405);
});

test('a foreign Host is refused, and localhost is its own host too (D134)', async () => {
  const served = await start();
  const hosts = ['evil.example', `evil.example:${String(served.port)}`, '127.0.0.1:1', 'localhost'];
  const answers = await Promise.all(hosts.map((host) => get(served.port, `/map.json?token=${TOKEN}`, { host })));
  expect(answers.map((answer) => answer.status)).toEqual(hosts.map(() => 403));
  for (const answer of answers) expect(answer.body).toContain('loopback');
  expect((await get(served.port, '/', { host: `localhost:${String(served.port)}` })).status).toBe(200);
});

test('the map is refused without the token, or with another (D134)', async () => {
  const served = await start();
  const paths = ['/map.json', '/map.json?token=', `/map.json?token=${TOKEN.slice(1)}`, `/map.json?token=${TOKEN}0`, '/map.json?other=1'];
  const answers = await Promise.all(paths.map((path) => get(served.port, path)));
  expect(answers.map((answer) => answer.status)).toEqual(paths.map(() => 403));
  for (const answer of answers) expect(answer.body).toContain('token');
  // The page and the assets need none: they are public code, and a reader with the URL has the token anyway.
  expect((await get(served.port, '/')).status).toBe(200);
});

test('close stops it answering', async () => {
  const served = await serve({ assets: stubApp(), map: MAP, token: TOKEN });
  expect((await get(served.port, '/')).status).toBe(200);
  await served.close();
  await expect(get(served.port, '/')).rejects.toThrow();
});

test("a held slot's raw output is served at /check/<slot> with the token: its standard output first, else its report (D93, D134)", async () => {
  const served = await serve({ assets: stubApp(), map: MAP, token: TOKEN, checks: { dir: stubChecks(), slots: ['test', 'lint', 'types'] } });
  servers.push(served);
  const stdout = await get(served.port, `/check/test?token=${TOKEN}`);
  expect(stdout.status).toBe(200);
  expect(stdout.type).toBe('text/plain; charset=utf-8');
  expect(stdout.body).toBe('FAIL pm.test.ts\n');
  const lint = await get(served.port, `/check/lint?token=${TOKEN}`);
  expect(lint.status).toBe(200);
  expect(lint.type).toBe('application/json; charset=utf-8');
  expect(lint.body).toContain('unused');
  // A held slot with no raw file, a slot the map does not hold, and a name that is a path are all not served.
  const paths = ['/check/types', '/check/dead', '/check/summary', '/check/..%2Fsummary.json', '/check/%zz', '/check/', '/check/test/extra'];
  const answers = await Promise.all(paths.map((path) => get(served.port, `${path}?token=${TOKEN}`)));
  expect(answers.map((answer) => answer.status)).toEqual(paths.map(() => 404));
});

test("the raw output is refused without the token, and never served when the run has no checks to serve (D134)", async () => {
  const withChecks = await serve({ assets: stubApp(), map: MAP, token: TOKEN, checks: { dir: stubChecks(), slots: ['test'] } });
  servers.push(withChecks);
  const refused = await Promise.all(['/check/test', '/check/test?token=', `/check/test?token=${TOKEN}0`].map((path) => get(withChecks.port, path)));
  expect(refused.map((answer) => answer.status)).toEqual([403, 403, 403]);
  for (const answer of refused) expect(answer.body).toContain('token');
  const without = await start();
  expect((await get(without.port, `/check/test?token=${TOKEN}`)).status).toBe(404);
});
