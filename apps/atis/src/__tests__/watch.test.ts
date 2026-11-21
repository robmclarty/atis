import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { assertMap } from 'core';
import type { MapJson } from 'core';
import { afterAll, expect, test } from 'vitest';
import { WebSocket } from 'ws';

import { approveRun, serveRun } from '../run.js';
import type { HeadAsked } from '../run.js';
import { serve } from '../serve.js';
import type { Served, ServedFile } from '../serve.js';
import { signatureOf, watchRepo, watchedIn } from '../watch.js';

/**
 * `--watch` (D106): a served run reads the head side's signature (`HEAD`'s
 * commit, the index and `.check/summary.json`), rebuilds the map once it has
 * moved and held still, and pushes it to the tab over a socket on the same
 * loopback port that answers only the run's token from the page's own
 * `Origin` (D134). Driven here through two commits of a temp repo, each map
 * pushed lying on the terrain the first was drawn on (P2). While the head is
 * the working tree the signature has a term that moves with what the tree
 * holds uncommitted, so an edit that stages nothing is pushed too
 * (D313 (watch-working-term)), and the approved shape's document is stamped
 * in every signature, so approving rebuilds (D314 (approved-stamp)) and the
 * tab is pushed a map that carries its departures (D212 (approved-private)).
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
  const socket = new WebSocket(`ws://127.0.0.1:${String(served.port)}/socket?token=${TOKEN}`, { origin });
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

/** A served run of `repo` over `v1` under a watch, at `HEAD` unless another head is asked for, its lines collected. */
const watching = async (repo: string, head?: HeadAsked): Promise<{ readonly served: Served; readonly lines: string[]; readonly stdout: string }> => {
  const lines: string[] = [];
  const outcome = await serveRun({ repo, base: 'v1', head, assets: stubApp(), open: false, verbose: false, token: TOKEN, watch: true, watchEvery: EVERY, watchLog: (line) => lines.push(line) });
  const { served } = outcome;
  if (served === undefined) throw new Error(outcome.stderr);
  closers.push(served.close);
  return { served, lines, stdout: outcome.stdout };
};

test('under --watch, each new commit is rebuilt and pushed to the open socket, on the terrain the first map was drawn on (D106, P2)', async () => {
  const repo = twoCommits();
  const { served, lines, stdout } = await watching(repo);
  expect(served.url).toBe(`http://127.0.0.1:${String(served.port)}/?token=${TOKEN}`);
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

test("the socket answers only the run's token from the page's own origin on loopback, on every served run, and only a watch sends the map held as a page connects (D134, D178)", async () => {
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
    refused('/socket', { origin }),
    refused(`/socket?token=${TOKEN}0`, { origin }),
    refused(`/socket?token=${TOKEN}`, {}),
    refused(`/socket?token=${TOKEN}`, { origin: 'http://evil.example' }),
    refused(`/socket?token=${TOKEN}`, { origin, host: `evil.example:${port}` }),
    refused(`/watch?token=${TOKEN}`, { origin }),
    refused(`/socket?token=${TOKEN}`, { origin: `http://localhost:${port}`, host: `localhost:${port}` }),
  ]);
  expect(answers).toEqual([403, 403, 403, 403, 403, 404, 101]);

  // A run served without a watch takes the socket too, for a highlight to ride (D178), and sends nothing as the page connects.
  const still = await serve({ assets: stubApp(), map: '{}\n', token: TOKEN });
  closers.push(still.close);
  expect(still.url).toBe(`http://127.0.0.1:${String(still.port)}/?token=${TOKEN}`);
  const heard: string[] = [];
  const socket = new WebSocket(`ws://127.0.0.1:${String(still.port)}/socket?token=${TOKEN}`, { origin: `http://127.0.0.1:${String(still.port)}` });
  socket.on('message', (data: Buffer) => heard.push(data.toString('utf8')));
  await new Promise<void>((opened, failed) => {
    socket.once('open', () => opened());
    socket.once('error', failed);
  });
  closers.push(() => {
    socket.terminate();
    return Promise.resolve();
  });
  // A round trip on loopback, so a map sent as the page connected would have arrived.
  await fetch(`http://127.0.0.1:${String(still.port)}/map.json?token=${TOKEN}`);
  expect(heard).toEqual([]);
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

/** `src/square.ts` with a body of its own, written and not staged. */
const editSquare = (repo: string, body: string): string => {
  const text = `import { area } from './shapes.js';\n\nexport function square(side: number): number {\n  ${body}\n}\n`;
  writeFileSync(join(repo, 'src', 'square.ts'), text);
  return text;
};

/** A file's text as a served run answers it, and the git object it read it from. */
const textAt = async (served: Served, path: string): Promise<ServedFile> => {
  const answered = await fetch(`http://127.0.0.1:${String(served.port)}/file/${path}?token=${TOKEN}`);
  expect(answered.status).toBe(200);
  return (await answered.json()) as ServedFile;
};

/** Long enough for a signature that moved to have been read, held still and handed on. */
const settled = (): Promise<void> => new Promise((done) => setTimeout(done, EVERY * 8));

test('while the head is the working tree the signature moves with an unstaged edit, a second edit to the same file and a new untracked file, and a head that is a commit has no such term (D313 (watch-working-term))', async () => {
  const repo = twoCommits();
  const square = readFileSync(join(repo, 'src', 'square.ts'), 'utf8');
  /** What git's status lists, read as the watch reads it, without refreshing the index, whose stamp is a term of the signature. */
  const status = (): string => git(repo, '--no-optional-locks', 'status', '--porcelain');
  const commit = watchedIn(repo);
  const working = watchedIn(repo, () => true);
  const committed = await signatureOf(commit);
  const clean = await signatureOf(working);
  // The working tree's signature is the commit's with one term more.
  expect(clean.startsWith(`${committed} `)).toBe(true);
  expect(clean.slice(committed.length + 1)).toMatch(/^[0-9a-f]{64}$/);
  expect(await signatureOf(working)).toBe(clean);

  const seen = [clean];
  const moved = async (): Promise<void> => {
    const now = await signatureOf(working);
    expect(seen).not.toContain(now);
    seen.push(now);
  };
  // An edit that stages nothing; then a second to the same file, which git's status lists as it did.
  editSquare(repo, 'return area(side, side) + 0;');
  const listed = status();
  await moved();
  editSquare(repo, 'return Math.abs(area(side, side));');
  expect(status()).toBe(listed);
  await moved();
  // A file git has never been told of, and a second write to it.
  writeFileSync(join(repo, 'src', 'circle.ts'), 'export const TAU = Math.PI * 2;\n');
  await moved();
  writeFileSync(join(repo, 'src', 'circle.ts'), 'export const TAU = 2 * Math.PI;\nexport const PI = Math.PI;\n');
  await moved();
  // A tracked file removed, and one put back as the commit has it, which clears it from the listing.
  rmSync(join(repo, 'src', 'shapes.ts'));
  await moved();
  writeFileSync(join(repo, 'src', 'square.ts'), square);
  expect(status()).not.toContain('square');
  await moved();

  // An ignored file is no part of the working tree's tree, so it moves nothing (D99).
  writeFileSync(join(repo, '.git', 'info', 'exclude'), '*.log\n');
  const before = await signatureOf(working);
  writeFileSync(join(repo, 'debug.log'), 'noise\n');
  expect(await signatureOf(working)).toBe(before);
  // None of it moved the signature of a head that is a commit, which rebuilds nothing for an edit that is not committed.
  expect(await signatureOf(commit)).toBe(committed);
});

test('reading the working tree never writes the index, and a rename is followed through the path it went to (D313 (watch-working-term))', async () => {
  const repo = twoCommits();
  const working = watchedIn(repo, () => true);
  // A file written again as it was: its stamp moved and its content did not, which is when git's status would refresh the index.
  await new Promise((later) => setTimeout(later, 20));
  writeFileSync(join(repo, 'src', 'shapes.ts'), readFileSync(join(repo, 'src', 'shapes.ts')));
  const index = statSync(working.index).mtimeMs;
  const first = await signatureOf(working);
  expect(await signatureOf(working)).toBe(first);
  expect(statSync(working.index).mtimeMs).toBe(index);

  git(repo, 'mv', 'src/shapes.ts', 'src/area.ts');
  const renamed = await signatureOf(working);
  expect(renamed).not.toBe(first);
  writeFileSync(join(repo, 'src', 'area.ts'), 'export function area(width: number, height: number): number {\n  return Math.abs(width * height);\n}\n');
  const edited = await signatureOf(working);
  expect(edited).not.toBe(renamed);
  writeFileSync(join(repo, 'src', 'area.ts'), 'export function area(width: number, height: number): number {\n  return Math.abs(width) * Math.abs(height);\n}\n');
  expect(await signatureOf(working)).not.toBe(edited);
});

test("the approved shape's document is stamped in every signature, so approving rebuilds, whatever the head (D314 (approved-stamp))", async () => {
  const repo = twoCommits();
  const [commit, working] = [watchedIn(repo), watchedIn(repo, () => true)];
  expect(commit.approved).toBe(join(repo, '.git', 'atis', 'approved.json'));
  const before = [await signatureOf(commit), await signatureOf(working)];
  mkdirSync(join(repo, '.git', 'atis'), { recursive: true });
  writeFileSync(commit.approved, '{"schema_version":1,"kind":"atis.approved"}\n');
  const approved = [await signatureOf(commit), await signatureOf(working)];
  expect(approved[0]).not.toBe(before[0]);
  expect(approved[1]).not.toBe(before[1]);
  // The document lies under the git directory, so writing it is no uncommitted change: only its own stamp moved.
  expect(approved[1]?.split(' ').at(-1)).toBe(before[1]?.split(' ').at(-1));
  expect(git(repo, 'status', '--porcelain')).toBe('');

  // Approving again is handed on by the watch as any move is.
  let changes = 0;
  const watch = watchRepo(commit, approved[0] ?? '', () => {
    changes += 1;
    return Promise.resolve();
  }, EVERY);
  closers.push(() => {
    watch.close();
    return Promise.resolve();
  });
  writeFileSync(commit.approved, '{"schema_version":1,"kind":"atis.approved","modules":[]}\n');
  await expect.poll(() => changes, { timeout: 5000 }).toBe(1);
  watch.close();
});

test("under --watch with the working tree as the head, an edit that stages nothing is rebuilt and pushed, then a second edit to the same file, then a new untracked file, each file's text read from the tree that map was measured from (D313 (watch-working-term), D312 (tree-beside-map))", async () => {
  const repo = twoCommits();
  const head = git(repo, 'rev-parse', 'HEAD');
  const { served, lines } = await watching(repo, { workingTree: true });
  const { next } = await listen(served);
  const first = await next();
  expect(first.meta.head).toBe('working-tree');
  expect(first.weather.changed.map((file) => file.path)).toEqual(['src/square.ts']);
  const clean = await textAt(served, 'src/square.ts');

  const trees = [clean.at];
  for (const body of ['return area(side, side) + 0;', 'return Math.abs(area(side, side));']) {
    const text = editSquare(repo, body);
    const pushed = await next();
    expect(pushed.meta.head).toBe('working-tree');
    expect(pushed.weather.changed.map((file) => file.path)).toEqual(['src/square.ts']);
    expect(pushed.terrain.layout).toEqual(first.terrain.layout);
    // The text is the edit's, read from a tree no map before this one was measured from.
    const read = await textAt(served, 'src/square.ts');
    expect(read.text).toBe(text);
    expect(trees).not.toContain(read.at);
    trees.push(read.at);
  }
  writeFileSync(join(repo, 'src', 'circle.ts'), 'export const TAU = Math.PI * 2;\n');
  const added = await next();
  expect(added.weather.changed.map((file) => [file.path, file.kind])).toEqual([['src/circle.ts', 'added'], ['src/square.ts', 'added']]);
  expect((await textAt(served, 'src/circle.ts')).text).toBe('export const TAU = Math.PI * 2;\n');

  // Three edits, three maps: reading the tree moved nothing the watch reads, so no map was rebuilt for nothing.
  await settled();
  expect(lines).toEqual([1, 1, 2].map((files) => `atis: watched working-tree: NOINST, ${String(files)} file${files === 1 ? '' : 's'} changed, 0 notices\n`));
  // Nothing was staged or committed for it.
  expect(git(repo, 'rev-parse', 'HEAD')).toBe(head);
  expect(git(repo, 'status', '--porcelain', '--untracked-files=all').split('\n').map((line) => line.trim())).toEqual(['M src/square.ts', '?? src/circle.ts']);
}, MINUTE);

test('a watch at a commit rebuilds nothing for an edit that stages nothing, and follows the working tree once the page has switched to it (D313 (watch-working-term))', async () => {
  const repo = twoCommits();
  const { served, lines } = await watching(repo);
  const origin = `http://127.0.0.1:${String(served.port)}`;
  const { next } = await listen(served);
  expect((await next()).meta.head).toBe(git(repo, 'rev-parse', 'HEAD'));
  editSquare(repo, 'return area(side, side) + 0;');
  await settled();
  expect(lines).toEqual([]);

  const switched = await fetch(`${origin}/base?token=${TOKEN}`, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ base: 'v1', working_tree: true }) });
  expect(switched.status).toBe(200);
  expect(assertMap(await switched.json()).meta.head).toBe('working-tree');
  // The signature has a term more from here, which is a move: the watch measures the working tree once more, and settles.
  expect((await next()).meta.head).toBe('working-tree');
  await settled();
  expect(lines).toHaveLength(1);

  const text = editSquare(repo, 'return Math.abs(area(side, side));');
  expect((await next()).meta.head).toBe('working-tree');
  expect((await textAt(served, 'src/square.ts')).text).toBe(text);
  await settled();
  expect(lines).toHaveLength(2);
}, MINUTE);

test('under --watch, approving pushes a map that carries the approved block, the next commit brings its departures, and a switch to another base says once what was left out (D314 (approved-stamp), D212 (approved-private), D308 (same-terrain))', async () => {
  const repo = twoCommits();
  const head = git(repo, 'rev-parse', 'HEAD');
  git(repo, 'tag', 'v2');
  const { served, lines } = await watching(repo);
  const origin = `http://127.0.0.1:${String(served.port)}`;
  const { next } = await listen(served);
  const first = await next();
  expect('approved' in first).toBe(false);

  // Approved with the flags the run maps with, while it runs: the document's stamp moves, and the map is rebuilt with the block on it.
  expect(approveRun({ repo, base: 'v1', verbose: false }).exitCode).toBe(0);
  const kept = await next();
  expect(kept.approved).toEqual({ at: head, departures: [] });
  expect(kept.terrain.layout).toEqual(first.terrain.layout);

  // A commit that founds a module departs from it, on the map the tab is pushed.
  mkdirSync(join(repo, 'src', 'paint'));
  writeFileSync(join(repo, 'src', 'paint', 'colour.ts'), 'export const RED = 0xff0000;\n');
  git(repo, 'add', '.');
  git(repo, 'commit', '--quiet', '-m', 'feat: name a colour');
  const painted = await next();
  expect(painted.approved).toEqual({ at: head, departures: [{ kind: 'module-added', target: 'src/paint', cell: 'directory:src/paint', why: 'a module the approved shape did not hold', now: 1 }] });
  // Over the base the shape was approved over, nothing was left out, so nothing is said beside the two maps.
  await settled();
  expect(lines).toHaveLength(2);
  expect(lines.every((line) => line.startsWith('atis: watched '))).toBe(true);

  // The page switches to another base: the block is still on the map, and the line says which three readings it lacks.
  const switched = await fetch(`${origin}/base?token=${TOKEN}`, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ base: 'v2' }) });
  expect(switched.status).toBe(200);
  expect(assertMap(await switched.json()).approved?.at).toBe(head);
  const note = `atis: the approved shape was cut over ${git(repo, 'rev-parse', '--short=7', 'v1')} and this map over ${head.slice(0, 7)}, so lines, fan out and interfaces with no barrel were not compared; run atis approve with this map's flags to compare them\n`;
  expect(lines.at(-1)).toBe(note);

  // Rebuilt over that base again, the line stands and is not said twice.
  const sha = commitSquare(repo, 'return area(side, side) + 0;', 'fix: square a side again');
  await expect.poll(() => lines.at(-1), { timeout: 10_000 }).toBe(`atis: watched ${sha.slice(0, 7)}: NOINST, 2 files changed, 0 notices\n`);
  await settled();
  expect(lines.filter((line) => line === note)).toHaveLength(1);
}, MINUTE);
