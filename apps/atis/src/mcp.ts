/**
 * mcp: `atis mcp`, the map an agent can point at (D110). A stdio MCP server
 * on the SDK's `McpServer`, which the bundle inlines, so the package installs
 * nothing new (D179), with three tools. `highlight` flies the open tab to a
 * file the map places, or to a notice by its rank, and lights it: it sends
 * `POST /highlight` to the run serving the tab, with that run's token and
 * that server's own `Origin`, and the server relays it over the page's socket
 * (D178). `reach` says how the change reaches a file: its own change, how
 * many membranes the reach crossed to get there and the interfaces it landed
 * on (D5, D45), and the files the reach went on to through it. `explain`
 * gives a notice's why, the inputs that produced it and the thresholds they
 * crossed (D9).
 *
 * An MCP client launches its server as a child over stdio, so the server
 * learns which run serves the tab from `.atis/serve.json` under the
 * repository it is started in, read again at every call, so a tab opened
 * after the agent started is found, and one whose process died is not
 * (D138). `reach` and `explain` read only the map that run holds, fetched
 * with its token at every call, so a base the page switched to, or a map a
 * watch pushed, is the one they answer from. With no run serving, they read
 * the map `--map` names, and `highlight` says no tab is open. Nothing here
 * reaches past loopback (C5).
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { assertMap } from 'core';
import type { ChangedFile, MapJson, Notice, ReachEntry } from 'core';
import { z } from 'zod';

import type { Outcome } from './run.js';
import { SERVING_FILE, servingIn } from './serve.js';
import type { HighlightRequest, Serving } from './serve.js';

/** What `atis mcp` was started with: the repository whose tab it points at, the map to read when none is served, and the version it names itself by. */
export type McpOptions = {
  /** Where `.atis/serve.json` is looked for: the repository a run serves its tab from. */
  readonly repo: string;
  /** The map `reach` and `explain` read when no run serves the repository (D138). */
  readonly map?: string | undefined;
  readonly version: string;
};

/** How the change reaches a file (D5, D45): its own change, if it touched the file, with its hunks; its reach entry, if the reach got there; and the entries the reach went on to through it. */
export type FileReach = {
  readonly file: string;
  readonly changed?: ChangedFile;
  readonly reached?: ReachEntry;
  readonly onward: readonly ReachEntry[];
};

/** A notice explained: its rank beside every field the map records for it, the why, the inputs and the thresholds among them (D9). */
export type ExplainedNotice = Notice & { readonly rank: number };

/** Why a map cannot answer, in a sentence the agent reads. */
type Refusal = { readonly reason: string };

const LOOPBACK = '127.0.0.1';

/** A failure's message, without a stack. */
const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** The origin of the run serving a tab: its server's own, which the highlight's write requires (D134). */
const originOf = (serving: Serving): string => `http://${LOOPBACK}:${String(serving.port)}`;

/** A file's reach in a map, or why the map does not hold the file at all: not on its terrain, not changed and not reached. */
export const reachOf = (map: MapJson, file: string): FileReach | Refusal => {
  const changed = map.weather.changed.find((own) => own.path === file);
  const reached = map.weather.reach.find((entry) => entry.path === file);
  const onward = map.weather.reach.filter((entry) => entry.path !== file && entry.via.includes(file));
  if (changed === undefined && reached === undefined && !map.terrain.organelles.some((organelle) => organelle.id === file)) return { reason: `the map holds no file ${file}` };
  return { file, ...(changed === undefined ? {} : { changed }), ...(reached === undefined ? {} : { reached }), onward };
};

/** A notice by its rank, 1 the primary, or why the map ranks none there. */
export const explainOf = (map: MapJson, rank: number): ExplainedNotice | Refusal => {
  const notice = map.notices[rank - 1];
  if (notice !== undefined) return { rank, ...notice };
  const ranked = map.notices.length;
  return { reason: ranked === 0 ? 'the map ranks no notice' : `the map ranks ${String(ranked)} notice${ranked === 1 ? '' : 's'}, 1 to ${String(ranked)}; none is ${String(rank)}` };
};

/** The map the run serving a tab holds, fetched with its token; none when that run no longer answers. */
const servedMap = async (serving: Serving): Promise<unknown> => {
  try {
    const response = await fetch(`${originOf(serving)}/map.json?token=${encodeURIComponent(serving.token)}`);
    return response.ok ? await response.json() : undefined;
  } catch {
    return undefined;
  }
};

/** The map a tool answers from, and where it was read: the tab a run serves in the repository, else the file `--map` names (D138). */
type Held = { readonly map: MapJson; readonly source: string } | Refusal;

const heldMap = async (repo: string, file: string | undefined): Promise<Held> => {
  const serving = servingIn(repo);
  const served = serving === undefined ? undefined : await servedMap(serving);
  if (serving !== undefined && served !== undefined) {
    try {
      return { map: assertMap(served), source: `the tab atis serves at ${originOf(serving)}` };
    } catch (error) {
      return { reason: `the map the tab at ${originOf(serving)} holds fails core's guard: ${messageOf(error)}` };
    }
  }
  if (file === undefined) return { reason: `no atis serves a tab in ${repo}, and no --map names a map to read` };
  try {
    return { map: assertMap(JSON.parse(await readFile(file, 'utf8'))), source: file };
  } catch (error) {
    return { reason: `cannot read the map at ${file}: ${messageOf(error)}` };
  }
};

/** A tool's answer: the value as JSON, for an agent to read, with where its map was read. */
const answered = (value: object, source: string): CallToolResult => ({ content: [{ type: 'text', text: `${JSON.stringify({ ...value, source }, null, 2)}\n` }] });

/** A tool's refusal: the reason, as a tool error the agent reads rather than a protocol failure. */
const refused = (reason: string): CallToolResult => ({ isError: true, content: [{ type: 'text', text: reason }] });

/** How many pages a highlight reached, from the server's answer; none when the answer does not say. */
const pagesOf = (text: string): number => {
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === 'object' && value !== null && 'pages' in value && typeof value.pages === 'number' ? value.pages : 0;
  } catch {
    return 0;
  }
};

/** Send the run serving `repo`'s tab a highlight, with its token and its own `Origin` (D178), and say what came of it. */
const highlight = async (repo: string, asked: HighlightRequest): Promise<CallToolResult> => {
  const serving = servingIn(repo);
  if (serving === undefined) return refused(`no tab is open: no atis serves ${repo}, by its ${SERVING_FILE}; run atis there to open one`);
  const origin = originOf(serving);
  let response: Response;
  try {
    response = await fetch(`${origin}/highlight?token=${encodeURIComponent(serving.token)}`, {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify(asked),
    });
  } catch {
    return refused(`no tab is open: the atis that served ${repo} at ${origin} no longer answers`);
  }
  const text = await response.text();
  if (!response.ok) return refused(text.trim());
  const pages = pagesOf(text);
  if (pages === 0) return refused(`no tab is open: atis serves ${repo} at ${origin}, but no page is connected to it`);
  return answered({ highlighted: asked, pages }, `the tab atis serves at ${origin}`);
};

/** The three tools' server, not yet connected: `mcpRun` connects it to stdio, and a test to a client in the same process. */
export const mcpServer = (options: McpOptions): McpServer => {
  const repo = resolve(options.repo);
  const file = options.map === undefined ? undefined : resolve(options.map);
  const server = new McpServer({ name: 'atis', version: options.version });
  /** Answer from the map held, or refuse with why there is none. */
  const fromMap = async (read: (map: MapJson) => object | Refusal): Promise<CallToolResult> => {
    const held = await heldMap(repo, file);
    if ('reason' in held) return refused(held.reason);
    const value = read(held.map);
    return 'reason' in value && typeof value.reason === 'string' ? refused(value.reason) : answered(value, held.source);
  };

  server.registerTool(
    'highlight',
    {
      title: 'Highlight in the open map',
      description:
        "Fly the atis tab open on this repository to a file or a notice, and light it. Name one: a file the map places on its terrain, by its path from the repository's root, or a notice by its rank, 1 the primary. Fails when no tab is open.",
      inputSchema: {
        file: z.string().min(1).optional().describe("a file the map places, by its path from the repository's root"),
        notice: z.number().int().min(1).optional().describe("a notice's rank in the map, 1 the primary"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    ({ file: path, notice }) => {
      if (path !== undefined && notice === undefined) return highlight(repo, { file: path });
      if (notice !== undefined && path === undefined) return highlight(repo, { notice });
      return Promise.resolve(refused('name a file or a notice to highlight, one of them'));
    },
  );

  server.registerTool(
    'reach',
    {
      title: "A file's reach",
      description:
        "How the change in the open map reaches a file: the file's own change, if the change touched it; how many module membranes the reach crossed to get there and the interface files it landed on; and the files the reach went on to through it. Read from the map the open tab holds, else the map --map names.",
      inputSchema: { file: z.string().min(1).describe("the file, by its path from the repository's root") },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ file: path }) => fromMap((map) => reachOf(map, path)),
  );

  server.registerTool(
    'explain',
    {
      title: 'Explain a notice',
      description:
        "Why a notice in the open map ranks where it does: its kind, its target, its why, the inputs that produced it and the thresholds they crossed. Read from the map the open tab holds, else the map --map names.",
      inputSchema: { notice: z.number().int().min(1).describe("the notice's rank in the map, 1 the primary") },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ notice }) => fromMap((map) => explainOf(map, notice)),
  );

  return server;
};

/** Serve the tools over stdio until the client closes its end, then exit 0 (C4); the protocol owns stdout, so the run prints nothing. */
export const mcpRun = async (options: McpOptions): Promise<Outcome> => {
  const server = mcpServer(options);
  const ended = new Promise<void>((done) => {
    process.stdin.once('end', done);
    process.stdin.once('close', done);
  });
  await server.connect(new StdioServerTransport());
  await ended;
  await server.close();
  return { exitCode: 0, stdout: '', stderr: '' };
};
