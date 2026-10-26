import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import type { OutgoingHttpHeaders } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, expect, test } from 'vitest';

import { assertMap } from 'core';

import { serveRun } from '../run.js';
import { serve } from '../serve.js';
import type { BaseRequest, Served } from '../serve.js';

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
const get = (port: number, path: string, headers: OutgoingHttpHeaders = {}, method = 'GET', body?: string): Promise<Answer> =>
  new Promise((answered, failed) => {
    const sent = request({ host: '127.0.0.1', port, path, method, headers }, (response) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.on('end', () => answered({ status: response.statusCode ?? 0, type: response.headers['content-type'], body: Buffer.concat(chunks).toString('utf8') }));
    });
    sent.on('error', failed);
    sent.end(body);
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

/** git in `cwd`, with no author config of the machine running the test. */
const git = (cwd: string, ...args: readonly string[]): string =>
  execFileSync('git', ['-c', 'user.name=atis', '-c', 'user.email=atis@example.invalid', '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8' }).trim();

/** A repository of two commits, the first tagged `v1`, each adding a module to one small package. */
const twoCommits = (): string => {
  const repo = mkdtempSync(join(tmpdir(), 'atis-rebase-'));
  temps.push(repo);
  git(repo, 'init', '--quiet', '--initial-branch=main');
  writeFileSync(join(repo, 'package.json'), '{ "name": "demo", "private": true, "type": "module" }\n');
  mkdirSync(join(repo, 'src'));
  writeFileSync(join(repo, 'src', 'shapes.ts'), 'export function area(width: number, height: number): number {\n  return width * height;\n}\n');
  git(repo, 'add', '.');
  git(repo, 'commit', '--quiet', '-m', 'feat: measure an area');
  git(repo, 'tag', 'v1');
  writeFileSync(join(repo, 'src', 'square.ts'), "import { area } from './shapes.js';\n\nexport function square(side: number): number {\n  return area(side, side);\n}\n");
  git(repo, 'add', '.');
  git(repo, 'commit', '--quiet', '-m', 'feat: square a side');
  return repo;
};

/** A server whose rebuild records each request it is handed and answers a map naming it. */
const rebasing = async (): Promise<{ readonly served: Served; readonly asked: BaseRequest[] }> => {
  const asked: BaseRequest[] = [];
  const served = await serve({
    assets: stubApp(),
    map: MAP,
    token: TOKEN,
    rebase: {
      repo: twoCommits(),
      rebuild: (base) => {
        asked.push(base);
        if (base.last === 'commit') return Promise.reject(new Error('--last-commit: the head has no parent'));
        return Promise.resolve({ map: `{"rebuilt":${JSON.stringify(base)}}\n`, slots: [] });
      },
    },
  });
  servers.push(served);
  return { served, asked };
};

/** A `POST /base` as the page sends it: JSON, from the page's own origin, unless told otherwise; an origin of `null` sends none. */
const postBase = (served: Served, body: unknown, { token = TOKEN, origin = `http://127.0.0.1:${String(served.port)}` }: { readonly token?: string; readonly origin?: string | null } = {}): Promise<Answer> =>
  get(served.port, `/base?token=${token}`, { 'content-type': 'application/json', ...(origin === null ? {} : { origin }) }, 'POST', typeof body === 'string' ? body : JSON.stringify(body));

test('POST /base rebuilds the map over the base it names, holds the new map in place of the old, and answers it (C13)', async () => {
  const { served, asked } = await rebasing();
  const answer = await postBase(served, { base: 'v1', working_tree: false });
  expect(answer.status).toBe(200);
  expect(answer.type).toBe('application/json; charset=utf-8');
  expect(JSON.parse(answer.body)).toEqual({ rebuilt: { base: 'v1', working_tree: false } });
  expect((await get(served.port, `/map.json?token=${TOKEN}`)).body).toBe(answer.body);
  // A named base, and the trunk by naming none, go to the rebuild as asked; localhost is its own origin too.
  expect((await postBase(served, { last: 'tag' })).status).toBe(200);
  const local = `localhost:${String(served.port)}`;
  const fromLocalhost = await get(served.port, `/base?token=${TOKEN}`, { host: local, origin: `http://${local}`, 'content-type': 'application/json' }, 'POST', JSON.stringify({ working_tree: true }));
  expect(fromLocalhost.status).toBe(200);
  expect(asked).toEqual([{ base: 'v1', working_tree: false }, { last: 'tag' }, { working_tree: true }]);
});

test("POST /base is refused without this run's token, or from any origin but the page's own (D134)", async () => {
  const { served, asked } = await rebasing();
  const tokens = await Promise.all(['', TOKEN.slice(1), `${TOKEN}0`].map((token) => postBase(served, { base: 'v1' }, { token })));
  expect(tokens.map((refused) => refused.status)).toEqual([403, 403, 403]);
  for (const refused of tokens) expect(refused.body).toContain('token');
  const origins = [null, 'http://evil.example', `http://evil.example:${String(served.port)}`, 'http://127.0.0.1:1', 'null'];
  const strangers = await Promise.all(origins.map((origin) => postBase(served, { base: 'v1' }, { origin })));
  expect(strangers.map((refused) => refused.status)).toEqual(origins.map(() => 403));
  for (const refused of strangers) expect(refused.body).toContain('this page');
  expect(asked).toEqual([]);
});

test('POST /base takes only a ref git resolves to a commit, never one opening with -, and never a body it cannot read (D134)', async () => {
  const { served, asked } = await rebasing();
  const bases = ['--output=/tmp/x', '-v', 'nowhere', 'v1^{tree}', 'HEAD~9'];
  const unresolved = await Promise.all(bases.map((base) => postBase(served, { base })));
  expect(unresolved.map((refused) => refused.status)).toEqual(bases.map(() => 400));
  expect(unresolved.map((refused) => refused.body)).toEqual(bases.map((base) => `${base} names no commit\n`));
  const bodies = [
    ['{', 'the body is not JSON'],
    ['[]', 'the body is not a JSON object'],
    [{ base: '' }, 'base must name a ref'],
    [{ base: 'v1', last: 'tag' }, 'base and last each name the base; give one of them'],
    [{ last: 'yesterday' }, 'last must be commit or tag'],
    [{ working_tree: 'yes' }, 'working_tree must be true or false'],
    [JSON.stringify({ base: 'x'.repeat(5000) }), 'the body is too long'],
  ] as const;
  const unread = await Promise.all(bodies.map(([body]) => postBase(served, body)));
  expect(unread.map((refused) => refused.status)).toEqual(bodies.map(() => 400));
  expect(unread.map((refused) => refused.body)).toEqual(bodies.map(([, reason]) => `${reason}\n`));
  expect(asked).toEqual([]);
  // A base the rebuild cannot measure from says why, and the map held stays the map it was.
  const failed = await postBase(served, { last: 'commit' });
  expect(failed.status).toBe(400);
  expect(failed.body).toBe('--last-commit: the head has no parent\n');
  expect((await get(served.port, `/map.json?token=${TOKEN}`)).body).toBe(MAP);
});

test('a server handed no way to rebuild takes no base, and no other path takes a POST', async () => {
  const served = await start();
  expect((await postBase(served, { base: 'v1' })).status).toBe(405);
  expect((await get(served.port, `/map.json?token=${TOKEN}`, {}, 'POST')).status).toBe(405);
});

test('served for real, a base switched away and back draws the terrain it drew, read from the terrain cache (P2, D96)', async () => {
  const repo = twoCommits();
  const outcome = await serveRun({ repo, base: 'v1', assets: stubApp(), open: false, verbose: false, token: TOKEN });
  const { served } = outcome;
  if (served === undefined) throw new Error(outcome.stderr);
  servers.push(served);
  const first = assertMap(JSON.parse((await get(served.port, `/map.json?token=${TOKEN}`)).body));
  expect(first.weather.changed.map((file) => file.path)).toEqual(['src/square.ts']);

  const away = await postBase(served, { base: 'HEAD' });
  expect(away.status).toBe(200);
  expect(assertMap(JSON.parse(away.body)).weather.changed).toEqual([]);
  const back = assertMap(JSON.parse((await postBase(served, { base: 'v1' })).body));
  expect(back.terrain.layout).toEqual(first.terrain.layout);
  expect(back.weather.changed).toEqual(first.weather.changed);
}, 60_000);
