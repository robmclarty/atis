#!/usr/bin/env node
/**
 * cli: the `bin`. It parses the flags with `util.parseArgs` and nothing else;
 * `run` and `serveRun` do the work and decide the exit code (C4). A leading
 * word that is no flag names a command that is not a map, which parses its
 * own flags; with none, the flags ask for a map, as they always have (D104).
 * With no `--out` or `--svg` the map is served as the world and opened in a
 * tab (D92), and this file is what waits for the interrupt that ends it,
 * exiting 0.
 */

import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

import { OVERLAY_NAMES } from 'core';
import type { OverlayName } from 'core';

import { USAGE, VERSION } from './index.js';
import { run, serveRun } from './run.js';
import type { HeadAsked, Outcome, RangeAsked } from './run.js';
import type { BaseAsked } from './sources/index.js';

const FLAGS = {
  repo: { type: 'string' },
  base: { type: 'string' },
  'last-commit': { type: 'boolean' },
  'last-tag': { type: 'boolean' },
  head: { type: 'string' },
  'working-tree': { type: 'boolean' },
  range: { type: 'string' },
  'whole-repo': { type: 'boolean' },
  overlay: { type: 'string' },
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
  /** `--range <from>..<to>`, as typed (D100). */
  readonly range?: string | undefined;
  /** `--whole-repo`: the repository at the head, with its overlays, rather than a change (D101). */
  readonly 'whole-repo'?: boolean | undefined;
  /** `--overlay <name>`, as typed: the one overlay the still map of the whole repo draws (D101). */
  readonly overlay?: string | undefined;
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

/** One end of a range: a ref, with no dot at either end, which git's `...` would leave. */
function isRangeEnd(part: string): boolean {
  return part !== '' && !part.startsWith('.') && !part.endsWith('.');
}

/**
 * The range the flags ask for (D100): `--range <from>..<to>` names the base
 * and the head both, so any other flag that names either is misuse beside
 * it, and so is a range that is not two refs and `..` (C4).
 */
function rangeOf(flags: Flags): { readonly range: RangeAsked | undefined } | { readonly reason: string } {
  if (flags.range === undefined) return { range: undefined };
  const named = [flags.base === undefined ? [] : ['--base'], flags['last-commit'] === true ? ['--last-commit'] : [], flags['last-tag'] === true ? ['--last-tag'] : [], flags.head === undefined ? [] : ['--head'], flags['working-tree'] === true ? ['--working-tree'] : []].flat();
  if (named.length > 0) return { reason: `--range names the base and the head itself; drop ${named.join(' and ')}` };
  // Two refs and `..` between them; git's `...` is misuse here.
  const [from = '', to = '', ...rest] = flags.range.split('..');
  if (rest.length > 0 || !isRangeEnd(from) || !isRangeEnd(to)) return { reason: '--range takes two refs as <from>..<to>' };
  return { range: { from, to } };
}

/**
 * Whether the flags ask for the whole repository (D101): `--whole-repo` maps
 * the head with no change, so a flag that names a base, a range or the
 * working tree is misuse beside it (C4); `--head` still names the commit.
 */
function wholeRepoOf(flags: Flags): { readonly wholeRepo: boolean } | { readonly reason: string } {
  if (flags['whole-repo'] !== true) return { wholeRepo: false };
  const named = [
    flags.base === undefined ? [] : ['--base'],
    flags['last-commit'] === true ? ['--last-commit'] : [],
    flags['last-tag'] === true ? ['--last-tag'] : [],
    flags.range === undefined ? [] : ['--range'],
    flags['working-tree'] === true ? ['--working-tree'] : [],
  ].flat();
  if (named.length > 0) return { reason: `--whole-repo maps one commit with no change; drop ${named.join(' and ')}` };
  return { wholeRepo: true };
}

/** An overlay as the command line names it: `trouble-spots` for the map's `trouble_spots`. */
function flagName(name: OverlayName): string {
  return name.replaceAll('_', '-');
}

/**
 * The overlay the flags ask the still map to draw (D101): `--overlay <name>`
 * draws one overlay of the whole repo's map, so it needs `--whole-repo` and
 * `--svg` beside it, and a name the map knows (C4); none takes the renderer's
 * default, trouble spots.
 */
function overlayOf(flags: Flags, wholeRepo: boolean): { readonly overlay: OverlayName | undefined } | { readonly reason: string } {
  if (flags.overlay === undefined) return { overlay: undefined };
  if (!wholeRepo) return { reason: '--overlay draws one overlay of the whole repo; it needs --whole-repo' };
  if (flags.svg === undefined) return { reason: '--overlay names what the still map draws; it needs --svg <file>' };
  const overlay = OVERLAY_NAMES.find((name) => flagName(name) === flags.overlay);
  if (overlay === undefined) return { reason: `--overlay takes one of ${OVERLAY_NAMES.map(flagName).join(', ')}` };
  return { overlay };
}

/** The map the flags ask for, written or served (D92); the command with no verb. */
async function mapCommand(argv: readonly string[]): Promise<Outcome> {
  const parsed = parseFlags(argv);
  if ('reason' in parsed) return misuse(parsed.reason);

  const { flags } = parsed;
  if (flags.version === true) return { exitCode: 0, stdout: `${VERSION}\n`, stderr: '' };
  if (flags.help === true) return { exitCode: 0, stdout: USAGE, stderr: '' };
  const whole = wholeRepoOf(flags);
  if ('reason' in whole) return misuse(whole.reason);
  const { wholeRepo } = whole;
  const drawn = overlayOf(flags, wholeRepo);
  if ('reason' in drawn) return misuse(drawn.reason);
  const { overlay } = drawn;
  const ranged = rangeOf(flags);
  if ('reason' in ranged) return misuse(ranged.reason);
  const { range } = ranged;
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
  if (serves) return serveRun({ repo, base, head, range, wholeRepo, assets: webDir(), open: flags.open !== false, verbose, cache, history });

  if (flags.open === true && flags.svg === undefined) return misuse('--open needs --svg <file>');
  return run({ repo, base, head, range, wholeRepo, out: flags.out ?? DEFAULT_OUT, svg: flags.svg, overlay, open: flags.open === true, verbose, cache, history });
}

/** A command that is not a map (D104): the words after its verb, parsed by the command itself. */
type Command = (argv: readonly string[]) => Promise<Outcome>;

/** The verbs atis takes ahead of its flags, each a command that is not a map (D104); `fingerprint` and `mcp` are to be the first. */
const COMMANDS: ReadonlyMap<string, Command> = new Map();

/**
 * The command a leading verb names, or the map when the first word is a flag
 * or there is none, so every flag reads as it did before verbs (D104). A verb
 * atis does not know is misuse (C4); a word anywhere after the first flag is
 * the map's, and `parseArgs` refuses it as a stray positional.
 */
function main(argv: readonly string[]): Promise<Outcome> {
  const [verb, ...rest] = argv;
  if (verb === undefined || verb.startsWith('-')) return mapCommand(argv);
  const command = COMMANDS.get(verb);
  if (command === undefined) return Promise.resolve(misuse(`${verb} is no command atis knows; with none, atis maps a change`));
  return command(rest);
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
