import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { assertMap } from 'core';
import { afterAll, expect, test } from 'vitest';
import { WebSocket } from 'ws';

import { mcpServer } from '../mcp.js';
import { keepServing, serve } from '../serve.js';
import type { Served } from '../serve.js';

/**
 * `atis mcp` (D110), driven through a client in the same process, as an
 * agent drives it over stdio: its three tools against a tab a run serves,
 * found by the repository's `.atis/serve.json` (D138), and with none, where
 * `reach` and `explain` read the map `--map` names and `highlight` says no
 * tab is open. A highlight rides `POST /highlight` to each page on the
 * served socket (D178).
 */
const TOKEN = 'e7a9b1c3d5f7091b2d4f6a8c0e2a4c6e';
const DEMO_FILE = fileURLToPath(new URL('../../../../libs/core/fixtures/demo/map.json', import.meta.url));
const DEMO_TEXT = readFileSync(DEMO_FILE, 'utf8');
const DEMO = assertMap(JSON.parse(DEMO_TEXT));

const temps: string[] = [];
const closers: (() => Promise<void>)[] = [];

const temp = (prefix: string): string => {
  const dir = mkdtempSync(join(tmpdir(), `atis-mcp-${prefix}-`));
  temps.push(dir);
  return dir;
};

afterAll(async () => {
  await Promise.allSettled(closers.map((close) => close()));
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

/** The demo with only its first three notices, written to a file of its own: a map unlike the one a tab serves. */
const threeNotices = (): string => {
  const file = join(temp('map'), 'map.json');
  writeFileSync(file, `${JSON.stringify({ ...DEMO, notices: DEMO.notices.slice(0, 3) }, null, 2)}\n`);
  return file;
};

/** A client in this process linked to the tools' server, started in `repo`, as an agent's is over stdio. */
const connect = async (repo: string, map?: string): Promise<Client> => {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const server = mcpServer({ repo, map, version: '0.0.0' });
  await server.connect(serverSide);
  const client = new Client({ name: 'atis-test', version: '0.0.0' });
  await client.connect(clientSide);
  closers.push(() => client.close());
  return client;
};

/** One call: whether the tool refused, and its text, read as JSON when it answered. */
type Called = { readonly error: boolean; readonly text: string; readonly value: unknown };

const call = async (client: Client, name: string, args: Readonly<Record<string, unknown>>): Promise<Called> => {
  const result = await client.callTool({ name, arguments: { ...args } });
  const content = Array.isArray(result.content) ? (result.content as readonly { readonly type: string; readonly text?: string }[]) : [];
  const text = content[0]?.type === 'text' ? (content[0].text ?? '') : '';
  const error = result.isError === true;
  return { error, text, value: error ? undefined : JSON.parse(text) };
};

/** A stub of the built app, standing for it as the serve tests' does (D133). */
const stubApp = (): string => {
  const dir = temp('web');
  writeFileSync(join(dir, 'index.html'), '<!doctype html><title>atis stub</title>\n');
  return dir;
};

/** The demo served from `repo` with no watch, as a plain `atis` serves it, and the file that says how to reach it (D138). */
const tabIn = async (repo: string): Promise<Served> => {
  const served = await serve({ assets: stubApp(), map: DEMO_TEXT, token: TOKEN });
  closers.push(served.close);
  keepServing(repo, { port: served.port, token: TOKEN, pid: process.pid });
  return served;
};

/** A page open on a served run's socket, and every message it hears. */
const pageOn = async (served: Served): Promise<{ readonly heard: unknown[] }> => {
  const heard: unknown[] = [];
  const socket = new WebSocket(`ws://127.0.0.1:${String(served.port)}/socket?token=${TOKEN}`, { origin: `http://127.0.0.1:${String(served.port)}` });
  socket.on('message', (data: Buffer) => heard.push(JSON.parse(data.toString('utf8'))));
  await new Promise<void>((opened, failed) => {
    socket.once('open', () => opened());
    socket.once('error', failed);
  });
  closers.push(() => {
    socket.terminate();
    return Promise.resolve();
  });
  return { heard };
};

test('atis mcp serves three tools, each with the input it takes, the two that read the map marked read-only (D110)', async () => {
  const client = await connect(temp('repo'), DEMO_FILE);
  const { tools } = await client.listTools();
  const byName = new Map(tools.map((tool) => [tool.name, tool] as const));
  expect([...byName.keys()].toSorted()).toEqual(['explain', 'highlight', 'reach']);
  expect(Object.keys(byName.get('highlight')?.inputSchema.properties ?? {}).toSorted()).toEqual(['file', 'notice']);
  expect(byName.get('highlight')?.inputSchema.required ?? []).toEqual([]);
  expect(byName.get('reach')?.inputSchema.required).toEqual(['file']);
  expect(byName.get('explain')?.inputSchema.required).toEqual(['notice']);
  expect(byName.get('reach')?.annotations?.readOnlyHint).toBe(true);
  expect(byName.get('explain')?.annotations?.readOnlyHint).toBe(true);
  expect(byName.get('highlight')?.annotations?.readOnlyHint).toBe(false);
});

test('with no tab open, reach and explain read the map --map names, and highlight says no tab is open (D138)', async () => {
  const repo = temp('repo');
  const client = await connect(repo, DEMO_FILE);
  const pm = 'libs/core/src/pm/index.ts';
  const reached = await call(client, 'reach', { file: pm });
  expect(reached.value).toEqual({
    file: pm,
    changed: DEMO.weather.changed.find((file) => file.path === pm),
    reached: DEMO.weather.reach.find((entry) => entry.path === pm),
    onward: DEMO.weather.reach.filter((entry) => entry.path !== pm && entry.via.includes(pm)),
    source: DEMO_FILE,
  });
  // A changed file the reach crosses to get on: the files beyond it, each by the interfaces it landed on.
  const doctor = (await call(client, 'reach', { file: 'apps/cli/src/doctor.ts' })).value as { readonly onward: readonly { readonly path: string }[] };
  expect(doctor.onward.map((entry) => entry.path)).toContain('apps/cli/src/index.ts');
  // A file on the terrain the change never reached has no entry, and goes on to nothing.
  expect((await call(client, 'reach', { file: 'libs/core/src/util/text.ts' })).value).toEqual({ file: 'libs/core/src/util/text.ts', onward: [], source: DEMO_FILE });

  const [primary] = DEMO.notices;
  expect((await call(client, 'explain', { notice: 1 })).value).toEqual({ rank: 1, ...primary, source: DEMO_FILE });
  const explained = (await call(client, 'explain', { notice: 2 })).value as { readonly why: string; readonly inputs: unknown; readonly thresholds: unknown };
  expect(explained.why).toBe(DEMO.notices[1]?.why);
  expect(explained.inputs).toEqual(DEMO.notices[1]?.inputs);
  expect(explained.thresholds).toEqual(DEMO.notices[1]?.thresholds);

  const lit = await call(client, 'highlight', { notice: 1 });
  expect(lit.error).toBe(true);
  expect(lit.text).toBe(`no tab is open: no atis serves ${repo}, by its .atis/serve.json; run atis there to open one`);
});

test('a file the map does not hold, a notice it does not rank, or no map to read at all is a tool error saying which', async () => {
  const client = await connect(temp('repo'), DEMO_FILE);
  expect(await call(client, 'reach', { file: 'libs/core/src/nope.ts' })).toEqual({ error: true, text: 'the map holds no file libs/core/src/nope.ts', value: undefined });
  expect(await call(client, 'explain', { notice: 7 })).toEqual({ error: true, text: 'the map ranks 6 notices, 1 to 6; none is 7', value: undefined });

  const repo = temp('repo');
  const none = await connect(repo);
  expect(await call(none, 'reach', { file: 'libs/core/src/pm/index.ts' })).toEqual({ error: true, text: `no atis serves a tab in ${repo}, and no --map names a map to read`, value: undefined });
  const missing = join(repo, 'missing.json');
  const unread = await call(await connect(repo, missing), 'explain', { notice: 1 });
  expect(unread.error).toBe(true);
  expect(unread.text).toMatch(new RegExp(`^cannot read the map at ${missing.replaceAll(/[.*+?^${}()|[\]\\/]/g, '\\$&')}: ENOENT`));
});

test('with a tab served, reach and explain read the map it holds now, never --map, and highlight flies each open page to its target (D138, D178)', async () => {
  const repo = temp('repo');
  const served = await tabIn(repo);
  const origin = `http://127.0.0.1:${String(served.port)}`;
  const source = `the tab atis serves at ${origin}`;
  const client = await connect(repo, threeNotices());
  // The tab's map ranks six notices; the file --map names, three.
  expect((await call(client, 'explain', { notice: 6 })).value).toEqual({ rank: 6, ...DEMO.notices[5], source });
  expect(((await call(client, 'reach', { file: 'libs/core/src/pm/index.ts' })).value as { readonly source: string }).source).toBe(source);

  // No page on the socket yet: atis serves, but no tab is open.
  expect(await call(client, 'highlight', { notice: 1 })).toEqual({ error: true, text: `no tab is open: atis serves ${repo} at ${origin}, but no page is connected to it`, value: undefined });

  const { heard } = await pageOn(served);
  expect((await call(client, 'highlight', { notice: 2 })).value).toEqual({ highlighted: { notice: 2 }, pages: 1, source });
  expect((await call(client, 'highlight', { file: 'libs/core/src/pm/tools.ts' })).value).toEqual({ highlighted: { file: 'libs/core/src/pm/tools.ts' }, pages: 1, source });
  await expect.poll(() => heard.length).toBe(2);
  expect(heard).toEqual([
    { kind: 'highlight', notice: 2 },
    { kind: 'highlight', file: 'libs/core/src/pm/tools.ts' },
  ]);

  // The server holds the target to its map, and the tool says why it refused.
  expect(await call(client, 'highlight', { file: 'README.md' })).toEqual({ error: true, text: 'the map places no file README.md', value: undefined });
  expect(await call(client, 'highlight', { notice: 7 })).toEqual({ error: true, text: 'the map ranks 6 notices; none is 7', value: undefined });
  for (const both of [{}, { file: 'libs/core/src/pm/tools.ts', notice: 1 }]) {
    expect(await call(client, 'highlight', both)).toEqual({ error: true, text: 'name a file or a notice to highlight, one of them', value: undefined });
  }

  // A map a watch pushed is the one held now.
  served.push({ map: `${JSON.stringify({ ...DEMO, notices: DEMO.notices.slice(0, 4) })}\n`, slots: [] });
  expect(await call(client, 'explain', { notice: 6 })).toEqual({ error: true, text: 'the map ranks 4 notices, 1 to 4; none is 6', value: undefined });
});

test('a tab whose run stopped answering, or whose process has exited, is no tab: highlight says so, and reach and explain read --map (D138)', async () => {
  const repo = temp('repo');
  const served = await tabIn(repo);
  const origin = `http://127.0.0.1:${String(served.port)}`;
  const map = threeNotices();
  const client = await connect(repo, map);
  await served.close();
  expect(await call(client, 'highlight', { notice: 1 })).toEqual({ error: true, text: `no tab is open: the atis that served ${repo} at ${origin} no longer answers`, value: undefined });
  expect((await call(client, 'explain', { notice: 3 })).value).toEqual({ rank: 3, ...DEMO.notices[2], source: map });

  const exited = spawnSync(process.execPath, ['-e', '']).pid;
  keepServing(repo, { port: served.port, token: TOKEN, pid: exited });
  expect((await call(client, 'highlight', { notice: 1 })).text).toBe(`no tab is open: no atis serves ${repo}, by its .atis/serve.json; run atis there to open one`);
  expect(((await call(client, 'reach', { file: 'libs/core/src/pm/index.ts' })).value as { readonly source: string }).source).toBe(map);
});
