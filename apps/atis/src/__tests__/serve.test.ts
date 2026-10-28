import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import type { OutgoingHttpHeaders } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, expect, test } from 'vitest';
import { WebSocket } from 'ws';

import { DEFAULT_EDITOR, assertMap } from 'core';

import { serveRun } from '../run.js';
import { dropServing, keepServing, serve, servingIn } from '../serve.js';
import type { BaseRequest, Rebuilt, Served, ServedDiff } from '../serve.js';

/**
 * The loopback server in-process over a stub app (D133): it answers the page,
 * the assets, the map, a held slot's raw output and a changed file's diff,
 * and nothing else; binds loopback alone (C13); and refuses a foreign Host
 * and a missing or wrong token (D134). Its second write, `POST /highlight`,
 * relays a target the held map places to each open page and refuses any
 * other, and a served run says how to reach it in `.atis/serve.json` while it
 * serves (D138, D178).
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

/** As much of a map as the server reads for a diff: the change's two sides and the files it changed. */
const changeMap = (mergeBase: string, head: string, changed: readonly { readonly path: string; readonly kind: string; readonly from?: string }[]): string =>
  `${JSON.stringify({ meta: { repo: 'stub', merge_base: mergeBase, head }, weather: { changed } })}\n`;

/** A server reading diffs in `repo` for the map given, its rebuild the one handed in, else one that measures nothing. */
const diffing = async (repo: string, map: string, rebuild: (request: BaseRequest) => Promise<Rebuilt> = () => Promise.reject(new Error('no base here'))): Promise<Served> => {
  const served = await serve({ assets: stubApp(), map, token: TOKEN, rebase: { repo, rebuild } });
  servers.push(served);
  return served;
};

const diffAt = async (served: Served, path: string): Promise<ServedDiff> => {
  const answered = await get(served.port, `/diff/${path}?token=${TOKEN}`);
  expect(answered.status).toBe(200);
  expect(answered.type).toBe('application/json; charset=utf-8');
  return JSON.parse(answered.body) as ServedDiff;
};

test("a changed file's diff is served at /diff/<path> with the token, read from git between the map's sides, beside the repo's path and VS Code's editor template (D102)", async () => {
  const repo = twoCommits();
  const served = await diffing(repo, changeMap(git(repo, 'rev-parse', 'v1'), git(repo, 'rev-parse', 'HEAD'), [{ path: 'src/square.ts', kind: 'added' }]));
  const diff = await diffAt(served, 'src/square.ts');
  expect(diff.path).toBe('src/square.ts');
  expect(diff.root).toBe(repo);
  expect(diff.editor).toBe(DEFAULT_EDITOR);
  expect(diff.diff).toContain('+++ b/src/square.ts');
  expect(diff.diff).toContain('@@ -0,0 +1,5 @@');
  expect(diff.diff).toContain('+export function square(side: number): number {');
  // An escaped path is the path it names.
  expect((await diffAt(served, 'src%2Fsquare.ts')).path).toBe('src/square.ts');
});

test('a diff is refused without the token, and served only for a path the map changed, never one it climbs to (D134)', async () => {
  const repo = twoCommits();
  const served = await diffing(repo, changeMap(git(repo, 'rev-parse', 'v1'), git(repo, 'rev-parse', 'HEAD'), [{ path: 'src/square.ts', kind: 'added' }]));
  const refused = await Promise.all(['/diff/src/square.ts', '/diff/src/square.ts?token=', `/diff/src/square.ts?token=${TOKEN}0`].map((path) => get(served.port, path)));
  expect(refused.map((answer) => answer.status)).toEqual([403, 403, 403]);
  for (const answer of refused) expect(answer.body).toContain('token');
  // A file the change left alone, one that is not there, and paths that climb out or do not decode.
  const paths = ['src/shapes.ts', 'src/nowhere.ts', 'src/..%2Fsquare.ts', '..%2Fpackage.json', '%2e%2e/package.json', '%zz', 'src/square.ts/'];
  const answers = await Promise.all(paths.map((path) => get(served.port, `/diff/${path}?token=${TOKEN}`)));
  expect(answers.map((answer) => answer.status)).toEqual(paths.map(() => 404));
  expect((await get(served.port, `/diff/?token=${TOKEN}`)).status).toBe(404);
});

test("a diff follows a rename through the path it came from, and a map whose sides are not commits' shas, or a run that reads no repository, serves none (D134)", async () => {
  const repo = twoCommits();
  const before = git(repo, 'rev-parse', 'HEAD');
  git(repo, 'mv', 'src/shapes.ts', 'src/area.ts');
  git(repo, 'commit', '--quiet', '-m', 'refactor: name the module for what it measures');
  const renamed = await diffing(repo, changeMap(before, git(repo, 'rev-parse', 'HEAD'), [{ path: 'src/area.ts', kind: 'renamed', from: 'src/shapes.ts' }]));
  const diff = await diffAt(renamed, 'src/area.ts');
  expect(diff.diff).toContain('rename from src/shapes.ts');
  expect(diff.diff).toContain('rename to src/area.ts');

  // A side that would be a flag to git, or a branch's name, is never handed to it.
  for (const side of ['--output=/tmp/x', 'main']) {
    const strange = await diffing(repo, changeMap(side, git(repo, 'rev-parse', 'HEAD'), [{ path: 'src/area.ts', kind: 'renamed' }]));
    expect((await get(strange.port, `/diff/src/area.ts?token=${TOKEN}`)).status).toBe(404);
  }
  const stub = await diffing(repo, MAP);
  expect((await get(stub.port, `/diff/src/area.ts?token=${TOKEN}`)).status).toBe(404);
  const without = await start();
  expect((await get(without.port, `/diff/src/area.ts?token=${TOKEN}`)).status).toBe(404);
});

test("a working tree's diff is the tree on disk, an untracked added file diffed against nothing (D99)", async () => {
  const repo = twoCommits();
  writeFileSync(join(repo, 'src', 'shapes.ts'), 'export function area(width: number, height: number): number {\n  return Math.abs(width * height);\n}\n');
  writeFileSync(join(repo, 'src', 'circle.ts'), 'export const TAU = Math.PI * 2;\n');
  const served = await diffing(repo, changeMap(git(repo, 'rev-parse', 'HEAD'), 'working-tree', [{ path: 'src/circle.ts', kind: 'added' }, { path: 'src/shapes.ts', kind: 'modified' }]));
  const modified = await diffAt(served, 'src/shapes.ts');
  expect(modified.diff).toContain('-  return width * height;');
  expect(modified.diff).toContain('+  return Math.abs(width * height);');
  const added = await diffAt(served, 'src/circle.ts');
  expect(added.diff).toContain('+export const TAU = Math.PI * 2;');
});

test("a diff reads the sides of the map a base put in place, never the map it replaced", async () => {
  const repo = twoCommits();
  const [first, head] = [git(repo, 'rev-parse', 'v1'), git(repo, 'rev-parse', 'HEAD')];
  const served = await diffing(repo, changeMap(first, head, [{ path: 'src/square.ts', kind: 'added' }]), () => Promise.resolve({ map: changeMap(head, head, []), slots: [] }));
  expect((await get(served.port, `/diff/src/square.ts?token=${TOKEN}`)).status).toBe(200);
  expect((await postBase(served, { base: 'HEAD' })).status).toBe(200);
  expect((await get(served.port, `/diff/src/square.ts?token=${TOKEN}`)).status).toBe(404);
});

test("the editor template is the repo's atis.config.json's, and one that would run a script, holds a control character, or names no path, fails the run before it serves (D102, D173, C4)", async () => {
  const repo = twoCommits();
  const map = changeMap(git(repo, 'rev-parse', 'v1'), git(repo, 'rev-parse', 'HEAD'), [{ path: 'src/square.ts', kind: 'added' }]);
  writeFileSync(join(repo, 'atis.config.json'), '{ "editor": "zed://file{root}/{path}:{line}" }\n');
  expect((await diffAt(await diffing(repo, map), 'src/square.ts')).editor).toBe('zed://file{root}/{path}:{line}');
  const broken = [
    ['{ "editor": "javascript:alert(1)//{path}" }', 'never a javascript: link'],
    ['{ "editor": " Data:text/html,{path}" }', 'never a data: link'],
    ['{ "editor": "FILE://{root}/{path}" }', 'never a file: link'],
    // A browser drops the tab, so this reads as javascript: in the page; the config refuses it first.
    ['{ "editor": "java\\tscript:alert(1)//{path}" }', 'no control character'],
    ['{ "editor": "vscode://file{root}" }', 'naming {path}'],
    ['{ "editor": 3 }', 'naming {path}'],
    ['{ "editor": ', 'not JSON'],
  ] as const;
  for (const [config, reason] of broken) {
    writeFileSync(join(repo, 'atis.config.json'), config);
    await expect(serve({ assets: stubApp(), map, token: TOKEN, rebase: { repo, rebuild: () => Promise.reject(new Error('no base here')) } })).rejects.toThrow(reason);
  }
});

test('a served run whose atis.config.json names an editor with a control character exits 2, naming it, and serves nothing (D173, C4)', async () => {
  const repo = twoCommits();
  writeFileSync(join(repo, 'atis.config.json'), '{ "editor": "java\\nscript:alert(1)//{path}" }\n');
  const outcome = await serveRun({ repo, base: 'v1', assets: stubApp(), open: false, verbose: false, token: TOKEN });
  expect(outcome.served).toBeUndefined();
  expect(outcome.exitCode).toBe(2);
  expect(outcome.stderr).toBe("atis: atis.config.json's editor must hold no control character\n");
}, 60_000);

/** The demo map, which places files on its terrain and ranks six notices: what a highlight is held to. */
const DEMO = readFileSync(fileURLToPath(new URL('../../../../libs/core/fixtures/demo/map.json', import.meta.url)), 'utf8');

/** A `POST /highlight` as `atis mcp` sends it: JSON, from the server's own origin, unless told otherwise; an origin of `null` sends none. */
const postHighlight = (served: Served, body: unknown, { token = TOKEN, origin = `http://127.0.0.1:${String(served.port)}` }: { readonly token?: string; readonly origin?: string | null } = {}): Promise<Answer> =>
  get(served.port, `/highlight?token=${token}`, { 'content-type': 'application/json', ...(origin === null ? {} : { origin }) }, 'POST', typeof body === 'string' ? body : JSON.stringify(body));

/** A page's socket on a served run, opened as the page opens it, and every message it hears. */
const pageOn = async (served: Served): Promise<{ readonly heard: unknown[] }> => {
  const heard: unknown[] = [];
  const socket = new WebSocket(`ws://127.0.0.1:${String(served.port)}/socket?token=${TOKEN}`, { origin: `http://127.0.0.1:${String(served.port)}` });
  socket.on('message', (data: Buffer) => heard.push(JSON.parse(data.toString('utf8'))));
  await new Promise<void>((opened, failed) => {
    socket.once('open', () => opened());
    socket.once('error', failed);
  });
  return { heard };
};

/** The demo served with no watch, as a plain `atis` serves it (D178). */
const demoServed = async (): Promise<Served> => {
  const served = await serve({ assets: stubApp(), map: DEMO, token: TOKEN });
  servers.push(served);
  return served;
};

test('POST /highlight relays a file the held map places, or a notice it ranks, to each open page, and answers how many it reached (D178)', async () => {
  const served = await demoServed();
  const alone = await postHighlight(served, { notice: 1 });
  expect(alone.status).toBe(200);
  expect(alone.type).toBe('application/json; charset=utf-8');
  expect(JSON.parse(alone.body)).toEqual({ pages: 0 });

  const pages = [await pageOn(served), await pageOn(served)];
  expect(JSON.parse((await postHighlight(served, { file: 'libs/core/src/pm/tools.ts' })).body)).toEqual({ pages: 2 });
  expect(JSON.parse((await postHighlight(served, { notice: 6 })).body)).toEqual({ pages: 2 });
  for (const { heard } of pages) {
    await expect.poll(() => heard.length).toBe(2);
    expect(heard).toEqual([
      { kind: 'highlight', file: 'libs/core/src/pm/tools.ts' },
      { kind: 'highlight', notice: 6 },
    ]);
  }
});

test("POST /highlight is refused without this run's token, or from any origin but the server's own (D134, D178)", async () => {
  const served = await demoServed();
  const { heard } = await pageOn(served);
  const tokens = await Promise.all(['', TOKEN.slice(1), `${TOKEN}0`].map((token) => postHighlight(served, { notice: 1 }, { token })));
  expect(tokens.map((refused) => refused.status)).toEqual([403, 403, 403]);
  for (const refused of tokens) expect(refused.body).toContain('token');
  const origins = [null, 'http://evil.example', `http://evil.example:${String(served.port)}`, 'http://127.0.0.1:1', 'null'];
  const strangers = await Promise.all(origins.map((origin) => postHighlight(served, { notice: 1 }, { origin })));
  expect(strangers.map((refused) => refused.status)).toEqual(origins.map(() => 403));
  for (const refused of strangers) expect(refused.body).toContain('own origin');
  // A round trip after the refusals, so a relay one of them made would have arrived.
  await get(served.port, `/map.json?token=${TOKEN}`);
  expect(heard).toEqual([]);
});

test('POST /highlight names only a file the held map places or a notice it ranks, held to the map held now, and refuses anything else with a 400 (D178)', async () => {
  const served = await demoServed();
  const { heard } = await pageOn(served);
  const named = 'a highlight names a file by its path, or a notice by its rank from 1';
  const bodies = [
    [{ file: 'README.md' }, 'the map places no file README.md'],
    [{ file: 'libs/core/src/nope.ts' }, 'the map places no file libs/core/src/nope.ts'],
    [{ notice: 7 }, 'the map ranks 6 notices; none is 7'],
    [{ notice: 0 }, named],
    [{ notice: 1.5 }, named],
    [{ notice: '1' }, named],
    [{ file: '' }, named],
    [{}, named],
    [{ file: 'libs/core/src/pm/tools.ts', notice: 1 }, 'file and notice each name the target; give one of them'],
    [{ notice: 1, base: 'v1' }, 'a highlight names a file or a notice, never base'],
    ['{', 'the body is not JSON'],
    ['[]', 'the body is not a JSON object'],
    [JSON.stringify({ file: 'x'.repeat(5000) }), 'the body is too long'],
  ] as const;
  const refused = await Promise.all(bodies.map(([body]) => postHighlight(served, body)));
  expect(refused.map((answer) => answer.status)).toEqual(bodies.map(() => 400));
  expect(refused.map((answer) => answer.body)).toEqual(bodies.map(([, reason]) => `${reason}\n`));

  // A map a watch pushed ranks three notices: the sixth is gone from it.
  const demo = JSON.parse(DEMO) as { readonly notices: readonly unknown[] };
  served.push({ map: `${JSON.stringify({ ...demo, notices: demo.notices.slice(0, 3) })}\n`, slots: [] });
  await expect.poll(() => heard.length).toBe(1);
  const gone = await postHighlight(served, { notice: 6 });
  expect([gone.status, gone.body]).toEqual([400, 'the map ranks 3 notices; none is 6\n']);
  await get(served.port, `/map.json?token=${TOKEN}`);
  // The page heard the map pushed, and no highlight before or after it.
  expect(heard.map((message) => (message as { readonly kind: string }).kind)).toEqual(['map']);
});

test('a served run says how to reach it in .atis/serve.json, readable by its owner alone and ignored by git, and takes it back as it closes (D138)', async () => {
  const repo = twoCommits();
  const outcome = await serveRun({ repo, base: 'v1', assets: stubApp(), open: false, verbose: false, token: TOKEN });
  const { served } = outcome;
  if (served === undefined) throw new Error(outcome.stderr);
  servers.push(served);
  const path = join(repo, '.atis', 'serve.json');
  const serving = { port: served.port, token: TOKEN, pid: process.pid };
  expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual(serving);
  expect(statSync(path).mode & 0o777).toBe(0o600);
  expect(servingIn(repo)).toEqual(serving);
  expect(git(repo, 'status', '--porcelain')).toBe('');
  expect(outcome.stderr).toBe('');
  await served.close();
  expect(existsSync(path)).toBe(false);
  expect(servingIn(repo)).toBeUndefined();
}, 60_000);

test('a repository that will not take .atis/serve.json is still served, and the run says atis mcp will not find the tab (D138, C4)', async () => {
  const repo = twoCommits();
  // A file where the directory would go, so nothing can be written under it.
  writeFileSync(join(repo, '.atis'), 'not a directory\n');
  const outcome = await serveRun({ repo, base: 'v1', assets: stubApp(), open: false, verbose: false, token: TOKEN, cache: false });
  const { served } = outcome;
  if (served === undefined) throw new Error(outcome.stderr);
  servers.push(served);
  expect(outcome.exitCode).toBe(0);
  expect(outcome.stderr).toMatch(/^atis: atis mcp will not find this tab, since \.atis\/serve\.json could not be written: /);
  expect((await get(served.port, `/map.json?token=${TOKEN}`)).status).toBe(200);
}, 60_000);

test('.atis/serve.json names a run only while its process runs and the file reads as one, and a run closing takes back only the file it wrote (D138)', () => {
  const repo = mkdtempSync(join(tmpdir(), 'atis-serving-'));
  temps.push(repo);
  const path = keepServing(repo, { port: 4173, token: TOKEN, pid: process.pid });
  expect(path).toBe(join(repo, '.atis', 'serve.json'));
  expect(servingIn(repo)).toEqual({ port: 4173, token: TOKEN, pid: process.pid });
  // Another run's close leaves this run's file where it is.
  dropServing(repo, process.pid + 1);
  expect(existsSync(path)).toBe(true);

  const exited = spawnSync(process.execPath, ['-e', '']).pid;
  keepServing(repo, { port: 4173, token: TOKEN, pid: exited });
  expect(servingIn(repo)).toBeUndefined();
  dropServing(repo, process.pid);
  expect(existsSync(path)).toBe(true);
  dropServing(repo, exited);
  expect(existsSync(path)).toBe(false);

  for (const text of ['not json', '[]', `{"port":"4173","token":"${TOKEN}","pid":${String(process.pid)}}`, `{"port":4173,"token":"","pid":${String(process.pid)}}`, '{"port":4173,"token":"t","pid":0}']) {
    writeFileSync(path, text);
    expect(servingIn(repo), text).toBeUndefined();
  }
});
