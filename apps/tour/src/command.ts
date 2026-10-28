/**
 * command: `pnpm --filter tour start <map.json>` (D183), with its world
 * handed in so a test runs it whole on fascicle's stub engine. It reads the
 * map, takes a tour kept for the map's base and head if `.atis/tours/` holds
 * one, else asks the provider for one, printing the provider and the model
 * before and after the call (D182), and writes `tour.json` beside the map, or
 * where `--out` says, then keeps it by the head's sha. It exits 0 once it has
 * written the tour, 2 on misuse or a map it cannot read (C4), and 1 when the
 * call fails.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { assertMap } from 'core';
import type { MapJson } from 'core';
import type { Engine, EngineConfig } from 'fascicle';

import { keepTour, keptTour, tourText } from './cache.js';
import { PROVIDERS, isProvider, planFor } from './providers.js';
import type { Provider } from './providers.js';
import { writeTour } from './tour.js';

export const USAGE = `tour: an opt-in reviewer's tour of an atis map, written by a model.

  pnpm --filter tour start <map.json> [--provider <name>] [--model <id>]
                                      [--repo <path>] [--out <file>]

It sends the model the map alone: paths, export and function names, line
numbers, and the notices' whys and thresholds, never the code or its diff.

  --provider <name>  ${PROVIDERS.join(', ')} (default: claude_cli, the logged-in
                     Claude Code CLI, with no API key); an API provider reads
                     its key from ANTHROPIC_API_KEY, OPENAI_API_KEY or
                     OPENROUTER_API_KEY
  --model <id>       the model to call (default: sonnet on claude_cli,
                     claude-sonnet-5-5 on anthropic; openai and openrouter
                     need one)
  --repo <path>      the repository whose .atis/tours/ keeps the tour by its
                     head's sha (default: the one holding the map)
  --out <file>       where to write the tour (default: tour.json beside the map)
`;

/** What the command is handed of the world: the environment, the directory it was typed in, where its lines go, the engine maker, and a scratch directory for the CLI. */
export type TourIo = {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly cwd: string;
  readonly out: (line: string) => void;
  readonly engineOf: (config: EngineConfig) => Engine;
  readonly scratch: () => { readonly path: string; readonly remove: () => void };
};

/** The arguments as read, or what is wrong with them. */
type Args = { readonly map: string; readonly provider: Provider; readonly model?: string; readonly repo?: string; readonly out?: string } | { readonly misuse: string } | { readonly help: true };

const OPTIONS = { provider: { type: 'string' }, model: { type: 'string' }, repo: { type: 'string' }, out: { type: 'string' }, help: { type: 'boolean', short: 'h' } } as const;

const parsedArgs = (argv: readonly string[]): ReturnType<typeof parseArgs<{ args: string[]; allowPositionals: true; options: typeof OPTIONS }>> | string => {
  try {
    return parseArgs({ args: [...argv], allowPositionals: true, options: OPTIONS });
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
};

const readArgs = (argv: readonly string[]): Args => {
  const parsed = parsedArgs(argv);
  if (typeof parsed === 'string') return { misuse: parsed };
  const { values, positionals } = parsed;
  if (values.help === true) return { help: true };
  const [map, ...rest] = positionals;
  if (map === undefined || rest.length > 0) return { misuse: 'name one map.json' };
  const provider = values.provider ?? 'claude_cli';
  if (!isProvider(provider)) return { misuse: `--provider is one of ${PROVIDERS.join(', ')}, not ${provider}` };
  return { map, provider, ...(values.model === undefined ? {} : { model: values.model }), ...(values.repo === undefined ? {} : { repo: values.repo }), ...(values.out === undefined ? {} : { out: values.out }) };
};

/** The repository a map was written in: the nearest directory above it that holds a `.git`, else the directory the command was typed in. */
const repoOf = (mapPath: string, typedIn: string): string => {
  for (let directory = dirname(mapPath); ; directory = dirname(directory)) {
    if (existsSync(join(directory, '.git'))) return directory;
    if (dirname(directory) === directory) return typedIn;
  }
};

const readMap = (path: string): MapJson | string => {
  try {
    return assertMap(JSON.parse(readFileSync(path, 'utf8')));
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
};

/** Run the command; resolves to its exit code. */
export const tourCommand = async (argv: readonly string[], io: TourIo): Promise<number> => {
  const args = readArgs(argv);
  if ('help' in args) {
    io.out(USAGE);
    return 0;
  }
  if ('misuse' in args) {
    io.out(`tour: ${args.misuse}\n\n${USAGE}`);
    return 2;
  }
  const mapPath = resolve(io.cwd, args.map);
  const map = readMap(mapPath);
  if (typeof map === 'string') {
    io.out(`tour: ${mapPath} is not an atis map: ${map}`);
    return 2;
  }
  const outPath = args.out === undefined ? join(dirname(mapPath), 'tour.json') : resolve(io.cwd, args.out);
  const repo = args.repo === undefined ? repoOf(mapPath, io.cwd) : resolve(io.cwd, args.repo);
  const { base, head } = map.meta;
  const range = `${base}..${head.slice(0, 12)}`;

  const kept = keptTour(repo, base, head);
  if (kept !== undefined) {
    writeFileSync(outPath, tourText(kept.tour));
    io.out(`tour: ${kept.path} already keeps the tour of ${range}, so no model was called`);
    io.out(`tour: wrote ${outPath}: ${String(kept.tour.stops.length)} stops`);
    return 0;
  }
  if (map.notices.length === 0) {
    writeFileSync(outPath, tourText({ base, head, stops: [] }));
    io.out(`tour: the map of ${range} holds no notices, so the tour has no stops and no model was called`);
    io.out(`tour: wrote ${outPath}`);
    return 0;
  }

  const scratch = io.scratch();
  try {
    const plan = planFor(args.provider, args.model, io.env, scratch.path);
    if ('refused' in plan) {
      io.out(`tour: ${plan.refused}`);
      return 2;
    }
    const engine = io.engineOf(plan.engine);
    try {
      io.out(`tour: asking ${plan.call.provider} · ${plan.call.model} for a tour of ${range}'s ${String(map.notices.length)} notices, sending the map alone, never the code or its diff`);
      const written = await writeTour(map, engine, plan.call);
      if (written.called !== undefined) io.out(`tour: ${written.called.provider} · ${written.called.model} answered with ${String(written.tour.stops.length)} stops`);
      writeFileSync(outPath, tourText(written.tour));
      io.out(`tour: wrote ${outPath}`);
      const keptAt = keepTour(repo, written.tour);
      io.out(keptAt === undefined ? 'tour: a working tree names no commit, so the tour is not kept' : `tour: kept it at ${keptAt}`);
      return 0;
    } catch (error) {
      io.out(`tour: the call to ${plan.call.provider} · ${plan.call.model} failed: ${error instanceof Error ? error.message : String(error)}`);
      return 1;
    } finally {
      await engine.dispose();
    }
  } finally {
    scratch.remove();
  }
};
