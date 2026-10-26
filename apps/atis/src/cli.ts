#!/usr/bin/env node
/**
 * cli: the `bin`. It parses the flags with `util.parseArgs` and nothing else;
 * `run` and `serveRun` do the work and decide the exit code (C4). With no
 * `--out` or `--svg` the command serves the world and opens it in a tab (D92),
 * and this file is what waits for the interrupt that ends it, exiting 0.
 */

import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

import { USAGE, VERSION } from './index.js';
import { run, serveRun } from './run.js';
import type { HeadAsked, Outcome } from './run.js';
import type { BaseAsked } from './sources/index.js';

const FLAGS = {
  repo: { type: 'string' },
  base: { type: 'string' },
  'last-commit': { type: 'boolean' },
  'last-tag': { type: 'boolean' },
  head: { type: 'string' },
  'working-tree': { type: 'boolean' },
  out: { type: 'string' },
  svg: { type: 'string' },
  open: { type: 'boolean' },
  cache: { type: 'boolean' },
  history: { type: 'string' },
  verbose: { type: 'boolean' },
  version: { type: 'boolean', short: 'V' },
  help: { type: 'boolean', short: 'h' },
} as const;

type Flags = {
  readonly repo?: string | undefined;
  readonly base?: string | undefined;
  readonly 'last-commit'?: boolean | undefined;
  readonly 'last-tag'?: boolean | undefined;
  readonly head?: string | undefined;
  readonly 'working-tree'?: boolean | undefined;
  readonly out?: string | undefined;
  readonly svg?: string | undefined;
  /** `--open` is true, `--no-open` false, and neither leaves it undefined. */
  readonly open?: boolean | undefined;
  /** Only `--no-cache` sets it, to false: the terrain cache is on unless told otherwise (D96). */
  readonly cache?: boolean | undefined;
  /** `--history <n>`, as typed: read as a whole number of commits, at least one (D50). */
  readonly history?: string | undefined;
  readonly verbose?: boolean | undefined;
  readonly version?: boolean | undefined;
  readonly help?: boolean | undefined;
};

/** Where the map goes when `--svg` asks for a file run but names no `--out`. */
const DEFAULT_OUT = 'map.json';

/**
 * The built web app: a `web/` directory beside this file's own `dist/`, which
 * `pnpm build` fills by building `apps/web` and copying it there, the layout
 * the package ships (D133). `ATIS_WEB` points the test suite at a stub, so no
 * test needs a Vite build.
 */
const webDir = (): string => process.env['ATIS_WEB'] ?? fileURLToPath(new URL('../web/', import.meta.url));

function misuse(reason: string): Outcome {
  return { exitCode: 2, stdout: '', stderr: `atis: ${reason}\n\n${USAGE}` };
}

/** `parseArgs` in its strict mode, with `--no-open` and `--no-cache` allowed, and the throw an unknown flag or a stray positional earns turned into a message. */
function parseFlags(argv: readonly string[]): { readonly flags: Flags } | { readonly reason: string } {
  try {
    const { values } = parseArgs({ args: [...argv], options: FLAGS, allowPositionals: false, allowNegative: true });
    return { flags: values };
  } catch (error) {
    return { reason: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * The base the flags ask for (D99): `--base <ref>`, `--last-commit` or
 * `--last-tag`, or none, which takes the trunk. Each of the three names the
 * base, so two of them together are misuse (C4).
 */
function baseOf(flags: Flags): { readonly base: BaseAsked | undefined } | { readonly reason: string } {
  const asked: readonly BaseAsked[] = [
    ...(flags.base === undefined ? [] : [flags.base]),
    ...(flags['last-commit'] === true ? [{ last: 'commit' } as const] : []),
    ...(flags['last-tag'] === true ? [{ last: 'tag' } as const] : []),
  ];
  if (asked.length > 1) return { reason: '--base, --last-commit and --last-tag each name the base; give one of them' };
  return { base: asked[0] };
}

/** The head the flags ask for (D99): `--head <ref>`, `--working-tree`, or neither, which is `HEAD`. Both name the head, so the two together are misuse (C4). */
function headOf(flags: Flags): { readonly head: HeadAsked | undefined } | { readonly reason: string } {
  const working = flags['working-tree'] === true;
  if (working && flags.head !== undefined) return { reason: '--head and --working-tree each name the head; give one of them' };
  return { head: working ? { workingTree: true } : flags.head };
}

async function main(argv: readonly string[]): Promise<Outcome> {
  const parsed = parseFlags(argv);
  if ('reason' in parsed) return misuse(parsed.reason);

  const { flags } = parsed;
  if (flags.version === true) return { exitCode: 0, stdout: `${VERSION}\n`, stderr: '' };
  if (flags.help === true) return { exitCode: 0, stdout: USAGE, stderr: '' };
  const asked = baseOf(flags);
  if ('reason' in asked) return misuse(asked.reason);
  const { base } = asked;
  const headAsked = headOf(flags);
  if ('reason' in headAsked) return misuse(headAsked.reason);
  const { head } = headAsked;

  const repo = flags.repo ?? process.cwd();
  const verbose = flags.verbose === true;
  const cache = flags.cache !== false;
  const history = flags.history === undefined ? undefined : Number(flags.history);
  if (history !== undefined && (!Number.isSafeInteger(history) || history < 1 || !/^\d+$/.test(flags.history ?? ''))) {
    return misuse('--history <n> takes a whole number of commits, at least 1');
  }
  const serves = flags.out === undefined && flags.svg === undefined;
  if (serves) return serveRun({ repo, base, head, assets: webDir(), open: flags.open !== false, verbose, cache, history });

  if (flags.open === true && flags.svg === undefined) return misuse('--open needs --svg <file>');
  return run({ repo, base, head, out: flags.out ?? DEFAULT_OUT, svg: flags.svg, open: flags.open === true, verbose, cache, history });
}

const outcome = await main(process.argv.slice(2));
process.stdout.write(outcome.stdout);
process.stderr.write(outcome.stderr);
const { served } = outcome;
if (served === undefined) {
  process.exitCode = outcome.exitCode;
} else {
  // Serve until interrupted, then close and let the loop drain: a served map exits 0 (C4).
  const stop = (): void => {
    served.close().then(
      () => {
        process.exitCode = 0;
      },
      () => {
        process.exitCode = 0;
      },
    );
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}
