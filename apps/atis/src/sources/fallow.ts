/**
 * fallow: the reviewed repo's own fallow, run on an extracted commit (D22, D98).
 *
 * `health`, `dupes` and `dead-code` each run on the extraction the way
 * checkride runs them on the working tree, `--format json --quiet`, so a
 * commit's three reports are the ones its `.check/` would hold, read by the
 * same pure parsers (D30). fallow reads a tree without installing it, which is
 * what lets the base side be measured at all, while coverage, mutants and
 * tests keep no base side. It reads the commit's own `fallow.toml` from
 * `--root` and keeps its cache there too, so nothing lands in the repository.
 * fallow's exit code says only whether it found something, so the report on
 * stdout is what is read: a run that wrote none mutes its analysis by name,
 * and no local fallow mutes the side (C2).
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';

import type { Structure } from 'core';

import { parseDead, parseDupes, parseHealth } from './check.js';
import type { FallowParse } from './check.js';

/** The reviewed repo's own fallow, relative to its working tree (D22). */
const FALLOW_BIN = 'node_modules/.bin/fallow';
/** The package behind the binary, whose version keys what a run keeps of fallow's measure (D98). */
const FALLOW_MANIFEST = 'node_modules/fallow/package.json';
const FALLOW_TIMEOUT_MS = 60_000;
/** A health report names every scored file, which is megabytes on a big repository; past this, the run is muted rather than cut. */
const REPORT_BYTES = 256 * 1024 * 1024;
/** fallow's flags for a report, checkride's own, so the numbers are the ones `.check/` holds. */
const REPORT_FLAGS = ['--format', 'json', '--quiet'];

/** The reviewed repo's own fallow: where its binary is, and the version its package says, when it says one. */
export type LocalFallow = { readonly bin: string; readonly version?: string };

/** One analysis as fallow ran it: what it printed and how it exited, or why it never finished. */
export type FallowRun = { readonly status: number; readonly stdout: string; readonly stderr: string } | { readonly reason: string };

/** The three analyses, by the slot name the map knows each by; fallow runs `dead` as `dead-code`. */
export type Analysis = 'health' | 'dupes' | 'dead';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The reviewed repo's own fallow, never the machine's (D22); none when the repository installs none. */
export function localFallow(repo: string): LocalFallow | undefined {
  const bin = resolve(repo, FALLOW_BIN);
  if (!existsSync(bin)) return undefined;
  try {
    const manifest: unknown = JSON.parse(readFileSync(join(repo, FALLOW_MANIFEST), 'utf8'));
    const version = isRecord(manifest) ? manifest['version'] : undefined;
    return typeof version === 'string' ? { bin, version } : { bin };
  } catch {
    return { bin };
  }
}

/**
 * One analysis on `tree`, run as the binary itself: `pnpm exec` would re-lay
 * an npm, yarn or bun tree and narrate over the JSON on stdout.
 */
function runFallow(bin: string, command: string, tree: string): FallowRun {
  const ran = spawnSync(bin, [command, ...REPORT_FLAGS, '--root', tree], {
    cwd: tree,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: FALLOW_TIMEOUT_MS,
    maxBuffer: REPORT_BYTES,
  });
  const code = isRecord(ran.error) ? ran.error['code'] : undefined;
  if (code === 'ETIMEDOUT') return { reason: `timed out after ${String(FALLOW_TIMEOUT_MS / 1000)} s` };
  if (code === 'ENOBUFS') return { reason: `printed more than ${String(REPORT_BYTES / 1024 / 1024)} MB` };
  if (ran.error !== undefined) return { reason: `could not run: ${typeof code === 'string' ? code : 'no error code'}` };
  if (ran.status === null) return { reason: `was stopped by ${ran.signal ?? 'a signal'}` };
  return { status: ran.status, stdout: ran.stdout, stderr: ran.stderr };
}

/** What fallow said when it wrote no report: the `message` of its JSON error, else its first line of stderr. */
function fallowSaid(stdout: string, stderr: string): string | undefined {
  try {
    const value: unknown = JSON.parse(stdout);
    const message = isRecord(value) ? value['message'] : undefined;
    if (typeof message === 'string') return message;
  } catch {
    // Not fallow's JSON error, so whatever it said went to stderr.
  }
  return stderr
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line !== '');
}

/** Each path in `cut` written `.`, the longest first, so a reason never names the extraction's temp directory (C3). */
function cutPaths(text: string, cut: readonly string[]): string {
  return [...cut].toSorted((a, b) => b.length - a.length).reduce((said, path) => said.split(path).join('.'), text);
}

/** One run's report, or why it is muted: fallow's own error, or a report of another kind, is no report (C2). */
function reportOf<T>(run: FallowRun, command: string, parse: (text: string) => FallowParse<T> | undefined): FallowParse<T> | { readonly reason: string } {
  if ('reason' in run) return run;
  const parsed = parse(run.stdout);
  if (parsed?.kind === command) return parsed;
  const said = fallowSaid(run.stdout, run.stderr);
  return { reason: `exited ${String(run.status)}${said === undefined ? ` with no ${command} report` : `: ${said}`}` };
}

/**
 * The pure half (D30): the three runs on one extraction to that commit's
 * structure. Each report is read by `.check/`'s own parser, and one fallow
 * could not write is muted as `analysis: reason`, with `cut`, the
 * extraction's paths, taken out of what fallow said (C3). The version is the
 * one the reports carry; a side none of them came back for is the reasons
 * alone, so it never reads as measured and clean (C2).
 */
export function structureOf(runs: Readonly<Record<Analysis, FallowRun>>, cut: readonly string[] = []): Structure {
  const muted: string[] = [];
  const versions: string[] = [];
  let reports = 0;
  const read = <T>(analysis: Analysis, command: string, parse: (text: string) => FallowParse<T> | undefined): T | undefined => {
    const report = reportOf(runs[analysis], command, parse);
    if ('reason' in report) {
      muted.push(`${analysis}: ${cutPaths(report.reason, cut)}`);
      return undefined;
    }
    reports += 1;
    if (report.version !== undefined) versions.push(report.version);
    return report.value;
  };
  const health = read('health', 'health', parseHealth);
  const dupes = read('dupes', 'dupes', parseDupes);
  const dead = read('dead', 'dead-code', parseDead);
  const [fallow] = versions;
  // A report with no version cannot say which fallow measured the side, so the side is not measured (C2).
  if (fallow === undefined) return { reason: [...muted, ...(reports === 0 ? [] : ['no report named the fallow version that wrote it'])].join('; ') };
  return {
    fallow,
    ...(health === undefined ? {} : { health }),
    ...(dupes === undefined ? {} : { dupes }),
    ...(dead === undefined ? {} : { dead }),
    muted,
  };
}

/** The reason a side carries when the repository installs no fallow of its own (D22, C2). */
export const NO_LOCAL_FALLOW = `no local fallow at ${FALLOW_BIN}`;

/** Measure one extracted commit with the reviewed repo's own fallow, or say why it could not be (D98, C2). */
export function measureStructure(tree: string, fallow: LocalFallow): Structure {
  const run = (command: string): FallowRun => runFallow(fallow.bin, command, tree);
  // fallow may name the extraction by its real path, which differs where `/var` is a link to `/private/var`.
  return structureOf({ health: run('health'), dupes: run('dupes'), dead: run('dead-code') }, [realpathSync(tree), tree]);
}
