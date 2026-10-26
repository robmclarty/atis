/**
 * run: everything impure between the flags and the map.
 *
 * `measure` extracts the merge-base tree and the `HEAD` tree with `git archive`
 * into temp directories and scans each one, so the terrain comes from the base
 * and the weather from the head (D32) and both sides describe commits rather
 * than a working tree (D46). The diff, the manifest delta and the log window
 * come from the repository itself; only `.check/` is read from the working
 * tree, since artifacts are not committed. The base side (its scan, the
 * history window at it and its terrain's layout) is kept per base commit in
 * the terrain cache, so a run on a base it has seen reads it rather than
 * extracting and scanning it again, and reads only its change's own commits on
 * top of the window (D8, D96); `--no-cache` measures it afresh and keeps
 * nothing. The extractions are removed and the sources go to the pure
 * `buildMap`.
 *
 * The map then goes one of two ways. `run` writes it atomically, and the still
 * SVG beside it, and exits. `serveRun` keeps it in memory and serves it with
 * the built web app on loopback, opening the tab (D92), until the process is
 * interrupted. Neither blocks on the weather: a map that was written or served
 * exits 0 whatever it says, and only misuse, a repository it cannot read or a
 * web app that was never built exits 2 (C4).
 */

import { execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { platform, tmpdir } from 'node:os';
import { basename, join, relative, resolve } from 'node:path';

import { DEFAULT_CONFIG, buildMap, layOutTerrain } from 'core';
import type { Commit, MapJson } from 'core';
import { renderSvg } from 'svg';

import { codeKey, configKey, readTerrain, terrainPath, writeAtomic, writeTerrain } from './cache.js';
import { serve } from './serve.js';
import type { Served } from './serve.js';
import {
  HISTORY_WINDOW,
  checkInferredShapes,
  readCheck,
  readDiff,
  readLog,
  readManifests,
  scanImports,
  shapePaths,
} from './sources/index.js';
import type { Scan } from './sources/index.js';

/** The flags for a run that writes files, already parsed: `cli.ts` owns the parsing, `run` owns the work. */
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
  /** Print the per-source timings D50 asks for on stderr, and whether the terrain cache hit. */
  readonly verbose: boolean;
  /** `false` measures the base side afresh and keeps nothing (`--no-cache`); the terrain cache is read and written otherwise (D96). */
  readonly cache?: boolean | undefined;
};

/** The flags for the served run (D92, D133). */
export type ServeRunOptions = {
  readonly repo: string;
  readonly base: string;
  /** The built web app's directory, `index.html` and its assets; `pnpm build` fills it. */
  readonly assets: string;
  /** Open the tab once serving; a no-op under a test run. */
  readonly open: boolean;
  readonly verbose: boolean;
  readonly cache?: boolean | undefined;
  /** The run's token (D134); drawn at random unless a test names one. */
  readonly token?: string | undefined;
};

/** What the command prints and how it exits: 0 when it wrote or served a map, 2 on misuse or an unreadable repo (C4); `served` while a server runs. */
export type Outcome = { readonly exitCode: 0 | 2; readonly stdout: string; readonly stderr: string; readonly served?: Served };

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

/** The exit-2 outcome every failure comes back as (C4). */
function failed(error: unknown): Outcome {
  return { exitCode: 2, stdout: '', stderr: `atis: ${messageOf(error)}\n` };
}

/**
 * The commit the weather is of, and the clock every age is measured back from.
 * This is the first thing a run does, so a directory that is not a repository
 * fails here, quietly and by name, before any source has shelled out.
 */
function headOf(repo: string): { readonly sha: string; readonly time: number } {
  const [sha = '', time = ''] = git(repo, 'show', '-s', '--format=%H%n%ct', HEAD).split('\n');
  if (!SHA.test(sha) || !UNIX_SECONDS.test(time)) throw new Error(`cannot read ${HEAD} of ${repo}`);
  return { sha, time: Number(time) };
}

/** One extracted commit: `tree` is the extraction the scanner reads, `root` the temp directory holding it. */
type Extraction = { readonly tree: string; readonly root: string };

/** One side of the change: its extraction, which the checker reads again, and the scan of it. */
type Side = { readonly tree: string; readonly scan: Scan };

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

/** What `--verbose` prints: whether the terrain cache hit, then each source's time. */
function report(measured: Measured): string {
  const { timings } = measured;
  const width = timings.reduce((widest, timing) => Math.max(widest, timing.source.length), 0);
  const lines = timings.map((timing) => `  ${timing.source.padEnd(width)}  ${String(timing.ms)} ms\n`);
  return [`  terrain cache ${measured.cache}\n`, ...lines].join('');
}

/**
 * Hand a file or a URL to the platform's opener (`open` on macOS, `xdg-open`
 * elsewhere), detached so the command never waits on the viewer, and a no-op
 * under a test run so the suite launches nothing. Opening is best-effort: a
 * missing opener never changes the exit code, since the outputs are already
 * on disk or on the wire (C4).
 */
function openTarget(target: string): void {
  if (process.env['VITEST'] !== undefined || process.env['NODE_ENV'] === 'test') return;
  const opener = platform() === 'darwin' ? 'open' : 'xdg-open';
  try {
    const child = spawn(opener, [target], { stdio: 'ignore', detached: true });
    child.on('error', () => {});
    child.unref();
  } catch {
    /* the outputs are written or served; a viewer that will not launch is not a failure */
  }
}

function counted(total: number, noun: string): string {
  return `${String(total)} ${noun}${total === 1 ? '' : 's'}`;
}

/** The bytes the map is written as: two-space JSON with a trailing newline, the golden's own serialisation. */
function serialize(map: unknown): string {
  return `${JSON.stringify(map, null, 2)}\n`;
}

/** The one line every run prints: the category, the change's size and the notices. */
function summary(map: MapJson): string {
  return `${map.weather.checks.category}, ${counted(map.weather.changed.length, 'file')} changed, ${counted(map.notices.length, 'notice')}`;
}

/** The map built, the timings so far, which the caller adds its own to, and what the terrain cache did. */
type Measured = { readonly map: MapJson; readonly timings: Timing[]; readonly cache: string };

/** The config every run measures with: core's defaults, since no `atis.config.json` is read yet. */
const CONFIG = DEFAULT_CONFIG;

/**
 * The base side of a run: the base tree's scan and the history window at it,
 * the extraction behind the scan when this run made one, and what the terrain
 * cache did, for `--verbose` to say.
 */
type Ground = { readonly scan: Scan; readonly commits: readonly Commit[]; readonly tree?: string; readonly cache: string };

/** How a run reaches the repository: its path, its timings, and the scan of an extracted commit. */
type Reader = { readonly repo: string; readonly timings: Timing[]; readonly scanAt: (source: string, sha: string) => Side };

/**
 * The base side, from the terrain cache when it holds this commit for this
 * code and config, else measured: the tree extracted and scanned, the log
 * walked from the base, and the terrain laid out alone, all three kept for the
 * next run (D96). A cache that will not write leaves the run as it was, since
 * the map never depended on it (C4).
 */
function groundAt(reader: Reader, sha: string, cache: boolean): Ground {
  const { repo, timings } = reader;
  const key = cache ? { code: codeKey(), config: configKey(CONFIG) } : undefined;
  const read = key === undefined ? undefined : timed(timings, 'cache read', () => readTerrain(repo, sha, key));
  if (read?.hit === true) {
    return { scan: read.terrain.scan, commits: read.terrain.commits, cache: `hit, ${relative(repo, terrainPath(repo, sha))}` };
  }
  const side = reader.scanAt('scan base', sha);
  const commits = timed(timings, 'log base', () => readLog(repo, sha));
  if (key === undefined || read === undefined) return { ...side, commits, cache: 'off (--no-cache)' };
  const layout = timed(timings, 'layout base', () => layOutTerrain(side.scan, CONFIG));
  try {
    const path = timed(timings, 'cache write', () => writeTerrain(repo, sha, key, { scan: side.scan, commits, layout }));
    return { ...side, commits, cache: `miss (${read.reason}), wrote ${relative(repo, path)}` };
  } catch (error) {
    return { ...side, commits, cache: `miss (${read.reason}), not written: ${messageOf(error)}` };
  }
}

/** Read the repository and build the map; throws on a repository it cannot read, with the extractions removed either way. */
function measure(repoPath: string, base: string, cache: boolean): Measured {
  const repo = resolve(repoPath);
  const timings: Timing[] = [];
  const extractions: Extraction[] = [];

  const treeAt = (sha: string): string => {
    const extraction = extract(repo, sha);
    extractions.push(extraction);
    return extraction.tree;
  };
  const scanAt = (source: string, sha: string): Side =>
    timed(timings, source, () => {
      const tree = treeAt(sha);
      return { tree, scan: scanImports(tree, { repo }) };
    });

  try {
    const head = headOf(repo);
    const diff = timed(timings, 'diff', () => readDiff(repo, base));
    const ground = groundAt({ repo, timings, scanAt }, diff.merge_base, cache);
    const headSide = scanAt('scan head', head.sha);
    // The names only the checker can print, in the changed interface files alone, each side timed (D118).
    // A base read from the cache has no tree, so it is extracted only when one of those files has such a name.
    const paths = shapePaths(diff.changed, ground.scan, headSide.scan);
    const inferred = new Set(ground.scan.files.filter((file) => paths.base.has(file.path) && file.inferred.length > 0).map((file) => file.path));
    const baseScan = timed(timings, 'shapes base', () =>
      inferred.size === 0 ? ground.scan : checkInferredShapes(ground.tree ?? treeAt(diff.merge_base), ground.scan, inferred),
    );
    const headScan = timed(timings, 'shapes head', () => checkInferredShapes(headSide.tree, headSide.scan, paths.head));
    const { deps_added, deps_moved } = timed(timings, 'manifests', () => readManifests(repo, diff.merge_base));
    // The window at the base, with the change's own commits on top, newest first (D8).
    const commits = timed(timings, 'log', () =>
      [...readLog(repo, `${diff.merge_base}..${HEAD}`), ...ground.commits].slice(0, HISTORY_WINDOW),
    );
    const check = timed(timings, 'check', () => readCheck(repo));

    const map = timed(timings, 'build', () =>
      buildMap({
        meta: {
          repo: basename(repo),
          base,
          head: head.sha,
          merge_base: diff.merge_base,
          generated_at: new Date().toISOString(),
        },
        base: baseScan,
        head: headScan,
        diff: diff.changed,
        deps_added,
        deps_moved,
        commits,
        head_time: head.time,
        check,
      }, CONFIG),
    );
    return { map, timings, cache: ground.cache };
  } finally {
    for (const extraction of extractions) rmSync(extraction.root, { recursive: true, force: true });
  }
}

/** Read the repository, build the map and write it, with the SVG beside it when asked. Exits 0 on a written map, 2 on a repository it cannot read (C4). */
export function run(options: Options): Outcome {
  const out = resolve(options.out);
  try {
    const measured = measure(options.repo, options.base, options.cache !== false);
    const { map, timings } = measured;
    timed(timings, 'write', () => {
      writeAtomic(out, serialize(map));
    });

    if (options.svg !== undefined) {
      const svgOut = resolve(options.svg);
      const svg = timed(timings, 'render', () => renderSvg(map));
      timed(timings, 'write svg', () => {
        writeAtomic(svgOut, svg);
      });
      if (options.open === true) openTarget(svgOut);
    }

    const wrote = options.svg === undefined ? options.out : `${options.out} and ${options.svg}`;
    return { exitCode: 0, stdout: `${summary(map)}, wrote ${wrote}\n`, stderr: options.verbose ? report(measured) : '' };
  } catch (error) {
    return failed(error);
  }
}

/**
 * Read the repository, build the map and serve it with the built web app on
 * loopback (D92, D133, D134), opening the tab unless told not to. The outcome
 * carries the server, which the caller closes on interrupt; its exit code is
 * 0 once serving, and 2 with no built app to serve or a repository it cannot
 * read (C4).
 */
export async function serveRun(options: ServeRunOptions): Promise<Outcome> {
  const assets = resolve(options.assets);
  if (!existsSync(join(assets, 'index.html'))) {
    return { exitCode: 2, stdout: '', stderr: `atis: no built web app at ${assets}; run \`pnpm build\` first\n` };
  }
  try {
    const measured = measure(options.repo, options.base, options.cache !== false);
    const { map, timings } = measured;
    const token = options.token ?? randomBytes(16).toString('hex');
    const started = performance.now();
    // The raw check output beside the map (D93): the run's `.check/`, for the slots the map holds alone (D134).
    const served = await serve({ assets, map: serialize(map), token, checks: { dir: join(options.repo, '.check'), slots: map.weather.checks.slots.map((slot) => slot.name) } });
    timings.push({ source: 'serve', ms: Math.round(performance.now() - started) });
    if (options.open) openTarget(served.url);
    return {
      exitCode: 0,
      stdout: `${summary(map)}, serving at ${served.url} (Ctrl-C to stop)\n`,
      stderr: options.verbose ? report(measured) : '',
      served,
    };
  } catch (error) {
    return failed(error);
  }
}
