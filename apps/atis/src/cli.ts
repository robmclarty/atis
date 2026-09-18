#!/usr/bin/env node
/**
 * cli: the `bin`. It parses the flags with `util.parseArgs` and nothing else;
 * `run` does the work and decides the exit code (C4).
 */

import { parseArgs } from 'node:util';

import { USAGE, VERSION } from './index.js';
import { run } from './run.js';
import type { Outcome } from './run.js';

const FLAGS = {
  repo: { type: 'string' },
  base: { type: 'string' },
  out: { type: 'string' },
  verbose: { type: 'boolean' },
  version: { type: 'boolean', short: 'V' },
  help: { type: 'boolean', short: 'h' },
} as const;

type Flags = {
  readonly repo?: string | undefined;
  readonly base?: string | undefined;
  readonly out?: string | undefined;
  readonly verbose?: boolean | undefined;
  readonly version?: boolean | undefined;
  readonly help?: boolean | undefined;
};

const DEFAULT_OUT = 'map.json';

function misuse(reason: string): Outcome {
  return { exitCode: 2, stdout: '', stderr: `atis: ${reason}\n\n${USAGE}` };
}

/** `parseArgs` in its strict mode, with the throw an unknown flag or a stray positional earns turned into a message. */
function parseFlags(argv: readonly string[]): { readonly flags: Flags } | { readonly reason: string } {
  try {
    const { values } = parseArgs({ args: [...argv], options: FLAGS, allowPositionals: false });
    return { flags: values };
  } catch (error) {
    return { reason: error instanceof Error ? error.message : String(error) };
  }
}

function main(argv: readonly string[]): Outcome {
  const parsed = parseFlags(argv);
  if ('reason' in parsed) return misuse(parsed.reason);

  const { flags } = parsed;
  if (flags.version === true) return { exitCode: 0, stdout: `${VERSION}\n`, stderr: '' };
  if (flags.help === true) return { exitCode: 0, stdout: USAGE, stderr: '' };
  if (flags.base === undefined) return misuse('--base <ref> is required');

  return run({
    repo: flags.repo ?? process.cwd(),
    base: flags.base,
    out: flags.out ?? DEFAULT_OUT,
    verbose: flags.verbose === true,
  });
}

const outcome = main(process.argv.slice(2));
process.stdout.write(outcome.stdout);
process.stderr.write(outcome.stderr);
process.exitCode = outcome.exitCode;
