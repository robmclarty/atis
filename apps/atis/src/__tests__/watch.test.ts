import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { assertMap } from 'core';
import type { MapJson } from 'core';
import { afterAll, expect, test } from 'vitest';
import { WebSocket } from 'ws';

import { serveRun } from '../run.js';
import { serve } from '../serve.js';
import type { Served } from '../serve.js';
import { signatureOf, watchRepo, watchedIn } from '../watch.js';

/**
 * `--watch` (D106): a served run reads the head side's signature (`HEAD`'s
 * commit, the index and `.check/summary.json`), rebuilds the map once it has
 * moved and held still, and pushes it to the tab over a socket on the same
 * loopback port that answers only the run's token from the page's own
 * `Origin` (D134). Driven here through two commits of a temp repo, each map
 * pushed lying on the terrain the first was drawn on (P2).
 */
const TOKEN = 'c5f3e4d6a7b8c9d0e1f2a3b4c5d6e7f8';
const MINUTE = 60_000;
/** The watch's tick in a test: short, so a commit is pushed in well under a second. */
const EVERY = 40;

const temps: string[] = [];
const closers: (() => Promise<void>)[] = [];

const temp = (prefix: string): string => {
  const dir = mkdtempSync(join(tmpdir(), `atis-watch-${prefix}-`));
  temps.push(dir);
  return dir;
};

afterAll(async () => {
  await Promise.allSettled(closers.map((close) => close()));
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

/** git in `cwd`, with no author config of the machine running the test. */
const git = (cwd: string, ...args: readonly string[]): string =>
  execFileSync('git', ['-c', 'user.name=atis', '-c', 'user.email=atis@example.invalid', '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8' }).trim();

/** A repository of two commits, the first tagged `v1`, the second adding a module that reads the first. */
const twoCommits = (): string => {
  const repo = temp('repo');
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

/** Commit a new body for `src/square.ts`, and say the commit's sha. */
const commitSquare = (repo: string, body: string, subject: string): string => {
  writeFileSync(join(repo, 'src', 'square.ts'), `import { area } from './shapes.js';\n\nexport function square(side: number): number {\n  ${body}\n}\n`);
  git(repo, 'commit', '--quiet', '-am', subject);
  return git(repo, 'rev-parse', 'HEAD');
};

/** A stub of the built app, standing for it as the serve tests' does (D133). */
const stubApp = (): string => {
  const dir = temp('web');
  writeFileSync(join(dir, 'index.html'), '<!doctype html><title>atis stub</title>\n');
  return dir;
};

/** The maps a socket hears, in order: each read waits for the next to arrive. */
type Listening = { readonly next: () => Promise<MapJson>; readonly socket: WebSocket };

/** Open the page's socket on a served run, as the page opens it: the token in its query, the page's own `Origin`. */
const listen = async (served: Served, origin = `http://127.0.0.1:${String(served.port)}`): Promise<Listening> => {
  const socket = new WebSocket(`ws://127.0.0.1:${String(served.port)}/watch?token=${TOKEN}`, { origin });
  const heard: MapJson[] = [];
  const waiting: ((map: MapJson) => void)[] = [];
  socket.on('message', (data: Buffer) => {
    const message = JSON.parse(data.toString('utf8')) as { readonly kind: string; readonly map: unknown };
    expect(message.kind).toBe('map');
    const map = assertMap(message.map);
    const waiter = waiting.shift();
    if (waiter === undefined) heard.push(map);
    else waiter(map);
  });
  await new Promise<void>((opened, failed) => {
    socket.once('open', () => opened());
    socket.once('error', failed);
  });
  closers.push(() => {
    socket.terminate();
    return Promise.resolve();
  });
  const next = (): Promise<MapJson> => {
    const ready = heard.shift();
    return ready === undefined ? new Promise((arrived) => waiting.push(arrived)) : Promise.resolve(ready);
  };
  return { next, socket };
};

/** A served run of `repo` over `v1` under a watch, its lines collected. */
const watching = async (repo: string): Promise<{ readonly served: Served; readonly lines: string[]; readonly stdout: string }> => {
  const lines: string[] = [];
  const outcome = await serveRun({ repo, base: 'v1', assets: stubApp(), open: false, verbose: false, token: TOKEN, watch: true, watchEvery: EVERY, watchLog: (line) => lines.push(line) });
  const { served } = outcome;
  if (served === undefined) throw new Error(outcome.stderr);
  closers.push(served.close);
  return { served, lines, stdout: outcome.stdout };
};

test('under --watch, each new commit is rebuilt and pushed to the open socket, on the terrain the first map was drawn on (D106, P2)', async () => {
  const repo = twoCommits();
  const { served, lines, stdout } = await watching(repo);
  expect(served.url).toBe(`http://127.0.0.1:${String(served.port)}/?token=${TOKEN}&watch=1`);
  expect(stdout).toContain(', watching (Ctrl-C to stop)');
  const { next } = await listen(served);

  // The socket hears the map the server holds as it opens, so a commit landing while the page loads is never missed.
  const first = await next();
  expect(first.meta.head).toBe(git(repo, 'rev-parse', 'HEAD'));
  expect(first.weather.changed.map((file) => file.path)).toEqual(['src/square.ts']);

  for (const [body, subject] of [
    ['return area(side, side) + 0;', 'fix: square a side again'],
    ['return Math.abs(area(side, side));', 'fix: square a negative side'],
  ] as const) {
    const sha = commitSquare(repo, body, subject);
    const pushed = await next();
    expect(pushed.meta.head).toBe(sha);
    expect(pushed.meta.merge_base).toBe(first.meta.merge_base);
    // The weather moved with the commit; the ground it lies on did not (P2).
    expect(pushed.terrain.layout).toEqual(first.terrain.layout);
    expect(pushed.terrain.cells).toEqual(first.terrain.cells);
    expect(lines.at(-1)).toBe(`atis: watched ${sha.slice(0, 7)}: NOINST, 1 file changed, 0 notices\n`);
    // The map the server serves is the one it pushed.
    const held = await fetch(`http://127.0.0.1:${String(served.port)}/map.json?token=${TOKEN}`);
    expect(assertMap(await held.json()).meta.head).toBe(sha);
  }
  expect(lines).toHaveLength(2);
}, MINUTE);

test('a watch keeps to the base the page switched to, and a rebuild that fails keeps the last map and says why (D106)', async () => {
  const repo = twoCommits();
  const { served, lines } = await watching(repo);
  const origin = `http://127.0.0.1:${String(served.port)}`;
  const switched = await fetch(`${origin}/base?token=${TOKEN}`, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ base: 'HEAD~1' }) });
  expect(switched.status).toBe(200);
  expect(served.asked()).toEqual({ base: 'HEAD~1' });
  const { next } = await listen(served);
  expect((await next()).meta.base_typed).toBe('--base HEAD~1');

  // The base is kept as the page typed it, so HEAD~1 is read again at the new head: the change is the newest commit alone.
  const sha = commitSquare(repo, 'return area(side, side) * 1;', 'fix: square once more');
  const pushed = await next();
  expect(pushed.meta.head).toBe(sha);
  expect(pushed.meta.base_typed).toBe('--base HEAD~1');
  expect(pushed.meta.merge_base).toBe(git(repo, 'rev-parse', 'HEAD~1'));
  expect(pushed.weather.changed.map((file) => [file.path, file.kind])).toEqual([['src/square.ts', 'modified']]);

  // A head git cannot read is a rebuild that fails: the watch says so and pushes nothing.
  writeFileSync(join(repo, '.git', 'refs', 'heads', 'main'), '0000000000000000000000000000000000000000\n');
  await expect.poll(() => lines.at(-1), { timeout: 10_000 }).toMatch(/^atis: the watch kept the last map: /);
  const held = await fetch(`${origin}/map.json?token=${TOKEN}`);
  expect(assertMap(await held.json()).meta.head).toBe(sha);
}, MINUTE);

test("the socket answers only the run's token from the page's own origin on loopback, and only on a watching server (D134)", async () => {
  const { served } = await watching(twoCommits());
  const port = String(served.port);
  const refused = async (path: string, headers: Readonly<Record<string, string>>): Promise<number> =>
    new Promise((settled) => {
      const socket = new WebSocket(`ws://127.0.0.1:${port}${path}`, { headers });
      socket.on('unexpected-response', (_request, response) => {
        settled(response.statusCode ?? 0);
        socket.terminate();
      });
      socket.on('open', () => {
        settled(101);
        socket.terminate();
      });
      socket.on('error', () => settled(-1));
    });
  const origin = `http://127.0.0.1:${port}`;
  const answers = await Promise.all([
    refused('/watch', { origin }),
    refused(`/watch?token=${TOKEN}0`, { origin }),
    refused(`/watch?token=${TOKEN}`, {}),
    refused(`/watch?token=${TOKEN}`, { origin: 'http://evil.example' }),
    refused(`/watch?token=${TOKEN}`, { origin, host: `evil.example:${port}` }),
    refused(`/elsewhere?token=${TOKEN}`, { origin }),
    refused(`/watch?token=${TOKEN}`, { origin: `http://localhost:${port}`, host: `localhost:${port}` }),
  ]);
  expect(answers).toEqual([403, 403, 403, 403, 403, 404, 101]);

  const still = await serve({ assets: stubApp(), map: '{}\n', token: TOKEN });
  closers.push(still.close);
  expect(still.url).toBe(`http://127.0.0.1:${String(still.port)}/?token=${TOKEN}`);
  const without = await new Promise<number>((settled) => {
    const socket = new WebSocket(`ws://127.0.0.1:${String(still.port)}/watch?token=${TOKEN}`, { origin: `http://127.0.0.1:${String(still.port)}` });
    socket.on('unexpected-response', (_request, response) => settled(response.statusCode ?? 0));
    socket.on('open', () => settled(101));
  });
  expect(without).toBe(404);
}, MINUTE);

test('the signature moves with HEAD, the index and the summary, and the watch hands on a move once it has held still (D106)', async () => {
  const repo = twoCommits();
  const watched = watchedIn(repo);
  const before = await signatureOf(watched);
  mkdirSync(join(repo, '.check'));
  writeFileSync(join(repo, '.check', 'summary.json'), '{"schema_version":1}\n');
  const summarised = await signatureOf(watched);
  expect(summarised).not.toBe(before);
  writeFileSync(join(repo, 'src', 'circle.ts'), 'export const TAU = Math.PI * 2;\n');
  git(repo, 'add', 'src/circle.ts');
  const staged = await signatureOf(watched);
  expect(staged).not.toBe(summarised);
  git(repo, 'commit', '--quiet', '-m', 'feat: a turn');
  expect(await signatureOf(watched)).not.toBe(staged);

  // Three writes in one burst are one change handed on; a later write is another.
  let changes = 0;
  const watch = watchRepo(watched, await signatureOf(watched), () => {
    changes += 1;
    return Promise.resolve();
  }, EVERY);
  closers.push(() => {
    watch.close();
    return Promise.resolve();
  });
  for (const run of [1, 2, 3]) writeFileSync(join(repo, '.check', 'summary.json'), `{"schema_version":1,"run":${String(run)}}\n`);
  await expect.poll(() => changes, { timeout: 5000 }).toBe(1);
  await new Promise((settled) => setTimeout(settled, EVERY * 5));
  expect(changes).toBe(1);
  writeFileSync(join(repo, '.check', 'summary.json'), '{"schema_version":1,"run":4}\n');
  await expect.poll(() => changes, { timeout: 5000 }).toBe(2);
  watch.close();
});
