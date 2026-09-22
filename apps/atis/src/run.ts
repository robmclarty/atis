/**
 * run: everything impure between the flags and `map.json`.
 *
 * `run` extracts the merge-base tree and the `HEAD` tree with `git archive`
 * into temp directories and scans each one, so the terrain comes from the base
 * and the weather from the head (D32) and both sides describe commits rather
 * than a working tree (D46). The diff, the manifest delta and the log window
 * come from the repository itself; only `.check/` is read from the working
 * tree, since artifacts are not committed. The extractions are removed, the
 * sources go to the pure `buildMap`, and the map is written atomically.
 *
 * It never blocks: a map that was written exits 0 whatever the weather says,
 * and only misuse or a repository it cannot read exits 2 (C4).
 */

import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { platform, tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

import { buildMap } from 'core';
import { renderSvg } from 'svg';

import { readCheck, readDiff, readLog, readManifests, scanImports } from './sources/index.js';

/** The flags, already parsed: `cli.ts` owns the parsing, `run` owns the work. */
export type Options = {
  /** The repository to read. */
  readonly repo: string;
  /** The ref the change is measured from; the diff is `merge-base(base, HEAD)..HEAD` (D25). */
  readonly base: string;
  /** Where to write the map, resolved against the working directory. */
  readonly out: string;
  /** Where to write the still SVG (D33); when absent, only `map.json` is written. */
  readonly svg?: string | undefined;
  /** Hand the SVG to the platform opener once written; a no-op under a test run. */
  readonly open?: boolean | undefined;
  /** Print the per-source timings D50 asks for on stderr. */
  readonly verbose: boolean;
};

/** What the command prints and how it exits: 0 when it wrote a map, 2 on misuse or an unreadable repo (C4). */
export type Outcome = { exitCode: 0 | 2; stdout: string; stderr: string };

const HEAD = 'HEAD';
const SHA = /^[0-9a-f]{40}$/;
const UNIX_SECONDS = /^\d+$/;

function git(repo: string, ...args: readonly string[]): string {
  return execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

/** A failed command carries its diagnostics on `stderr`, not in `message`; the exit-2 line wants both. */
function messageOf(error: unknown): string {
  const raw = isRecord(error) ? error['stderr'] : undefined;
  const detail = typeof raw === 'string' ? raw.trim() : '';
  const message = error instanceof Error ? error.message : String(error);
  return detail === '' ? message : `${message}: ${detail}`;
}

/**
 * The commit the weather is of, and the clock every age is measured back from.
 * This is the first thing `run` does, so a directory that is not a repository
 * fails here, quietly and by name, before any source has shelled out.
 */
function headOf(repo: string): { readonly sha: string; readonly time: number } {
  const [sha = '', time = ''] = git(repo, 'show', '-s', '--format=%H%n%ct', HEAD).split('\n');
  if (!SHA.test(sha) || !UNIX_SECONDS.test(time)) throw new Error(`cannot read ${HEAD} of ${repo}`);
  return { sha, time: Number(time) };
}

/** One extracted commit: `tree` is the extraction the scanner reads, `root` the temp directory holding it. */
type Extraction = { readonly tree: string; readonly root: string };

/** `git archive <sha> | tar -x` into a temp directory of its own (D32), the archive kept beside the tree, not in it. */
function extract(repo: string, sha: string): Extraction {
  const root = mkdtempSync(join(tmpdir(), 'atis-tree-'));
  const tree = join(root, 'tree');
  const archive = join(root, 'commit.tar');
  mkdirSync(tree);
  git(repo, 'archive', '--format=tar', '-o', archive, sha);
  execFileSync('tar', ['-xf', archive, '-C', tree], { stdio: 'ignore' });
  return { tree, root };
}

/** One source's wall time. The history window's cost is unknown until a big repo shows up, so it is measured (D50). */
type Timing = { readonly source: string; readonly ms: number };

function timed<T>(timings: Timing[], source: string, work: () => T): T {
  const started = performance.now();
  const value = work();
  timings.push({ source, ms: Math.round(performance.now() - started) });
  return value;
}

function report(timings: readonly Timing[]): string {
  const width = timings.reduce((widest, timing) => Math.max(widest, timing.source.length), 0);
  return timings.map((timing) => `  ${timing.source.padEnd(width)}  ${String(timing.ms)} ms\n`).join('');
}

/** Write through a neighbouring temp file and rename, so nothing ever reads half a map. */
function writeAtomic(path: string, text: string): void {
  const directory = dirname(path);
  mkdirSync(directory, { recursive: true });
  const temp = join(directory, `.${basename(path)}.${String(process.pid)}.tmp`);
  writeFileSync(temp, text);
  renameSync(temp, path);
}

/**
 * Hand a file to the platform's opener (`open` on macOS, `xdg-open` elsewhere),
 * detached so this short-lived command never waits on the viewer, and a no-op
 * under a test run so the suite launches nothing. Opening is best-effort: a
 * missing opener never changes the exit code, since the outputs are already on
 * disk (C4).
 */
function openFile(path: string): void {
  if (process.env['VITEST'] !== undefined || process.env['NODE_ENV'] === 'test') return;
  const opener = platform() === 'darwin' ? 'open' : 'xdg-open';
  try {
    const child = spawn(opener, [path], { stdio: 'ignore', detached: true });
    child.on('error', () => {});
    child.unref();
  } catch {
    /* the map and the SVG are written; a viewer that will not launch is not a failure */
  }
}

function counted(total: number, noun: string): string {
  return `${String(total)} ${noun}${total === 1 ? '' : 's'}`;
}

/** The bytes the map is written as: two-space JSON with a trailing newline, the golden's own serialisation. */
function serialize(map: unknown): string {
  return `${JSON.stringify(map, null, 2)}\n`;
}

/** Read the repository, build the map and write it. Exits 0 on a written map, 2 on a repository it cannot read (C4). */
export function run(options: Options): Outcome {
  const repo = resolve(options.repo);
  const out = resolve(options.out);
  const timings: Timing[] = [];
  const extractions: Extraction[] = [];

  const scan = (source: string, sha: string): ReturnType<typeof scanImports> =>
    timed(timings, source, () => {
      const extraction = extract(repo, sha);
      extractions.push(extraction);
      return scanImports(extraction.tree, { repo });
    });

  try {
    const head = headOf(repo);
    const diff = timed(timings, 'diff', () => readDiff(repo, options.base));
    const baseScan = scan('scan base', diff.merge_base);
    const headScan = scan('scan head', head.sha);
    const deps_added = timed(timings, 'manifests', () => readManifests(repo, diff.merge_base));
    const commits = timed(timings, 'log', () => readLog(repo, HEAD));
    const check = timed(timings, 'check', () => readCheck(repo));

    const map = timed(timings, 'build', () =>
      buildMap({
        meta: {
          repo: basename(repo),
          base: options.base,
          head: head.sha,
          merge_base: diff.merge_base,
          generated_at: new Date().toISOString(),
        },
        base: baseScan,
        head: headScan,
        diff: diff.changed,
        deps_added,
        commits,
        head_time: head.time,
        check,
      }),
    );
    timed(timings, 'write', () => {
      writeAtomic(out, serialize(map));
    });

    if (options.svg !== undefined) {
      const svgOut = resolve(options.svg);
      const svg = timed(timings, 'render', () => renderSvg(map));
      timed(timings, 'write svg', () => {
        writeAtomic(svgOut, svg);
      });
      if (options.open === true) openFile(svgOut);
    }

    const { category } = map.weather.checks;
    const wrote = options.svg === undefined ? options.out : `${options.out} and ${options.svg}`;
    return {
      exitCode: 0,
      stdout: `${category}, ${counted(map.weather.changed.length, 'file')} changed, ${counted(map.notices.length, 'notice')}, wrote ${wrote}\n`,
      stderr: options.verbose ? report(timings) : '',
    };
  } catch (error) {
    return { exitCode: 2, stdout: '', stderr: `atis: ${messageOf(error)}\n` };
  } finally {
    for (const extraction of extractions) rmSync(extraction.root, { recursive: true, force: true });
  }
}
