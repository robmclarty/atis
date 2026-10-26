/**
 * run: everything impure between the flags and the map.
 *
 * `measure` first resolves what the change is against: the base the
 * reviewer named, a shortcut counted back from the head, or the trunk when
 * they named none, and the head, `HEAD` unless `--head` named another (D99).
 * It scans the merge-base tree and the head's tree, so the terrain
 * comes from the base and the weather from the head (D32) and both sides
 * describe commits rather than a working tree (D46). The base is extracted
 * with `git archive` into a temp directory when the cache does not hold it;
 * the head is read from git's own objects over the base's reads, parsing
 * only what the diff touched, and is extracted only when the checker or the
 * reviewed repo's fallow has to read it from disk (D136, D172). The diff, the manifest delta and the log window
 * come from the repository itself; only `.check/` is read from the working
 * tree, since artifacts are not committed, and only when the head is the
 * checked-out `HEAD`, the one commit it can describe (D135). The base side (its scan, the
 * history window at it and its terrain's layout) is kept per base commit in
 * the terrain cache, so a run on a base it has seen reads it rather than
 * extracting and scanning it again, and reads only its change's own commits on
 * top of the window (D8, D96); `--no-cache` measures it afresh and keeps
 * nothing. A base the cache has not seen is laid out relaxed from the
 * nearest ancestor it has (D97), and the map holds the base's own layout
 * wherever the change left the ground alone (D172), so the ground holds
 * still across bases and under the change. The
 * reviewed repo's own fallow measures both extractions' health, duplication
 * and structure, each kept per commit beside the terrain, so a second run on
 * one change runs it on neither side (D98, D136). The extractions are removed
 * and the sources go to the pure `buildMap`.
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
import type { Commit, Layout, MapJson, Structure } from 'core';
import { renderSvg } from 'svg';

import {
  codeKey,
  configKey,
  entriesPath,
  nearestTerrain,
  readEntries,
  readStructure,
  readTerrain,
  structurePath,
  terrainPath,
  writeAtomic,
  writeEntries,
  writeStructure,
  writeTerrain,
} from './cache.js';
import { serve } from './serve.js';
import type { Served } from './serve.js';
import {
  HISTORY_WINDOW,
  NO_LOCAL_FALLOW,
  checkInferredShapes,
  commitOf,
  localFallow,
  measureStructure,
  readCheck,
  readDiff,
  readLog,
  readCommit,
  readManifests,
  readTree,
  resolveBase,
  shapePaths,
} from './sources/index.js';
import type { BaseAsked, CheckInputs, EntryPoints, LocalFallow, ParsedFiles, Scan, ScanOptions, ScannedTree } from './sources/index.js';

/** The flags for a run that writes files, already parsed: `cli.ts` owns the parsing, `run` owns the work. */
export type Options = {
  /** The repository to read. */
  readonly repo: string;
  /** The base the reviewer asked for, a ref or a shortcut; absent, the trunk (D99). The diff is `merge-base(base, head)..head` (D25). */
  readonly base?: BaseAsked | undefined;
  /** The ref the weather is of; `HEAD` when absent (D99). */
  readonly head?: string | undefined;
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
  /** How many commits of history to read, newest first; 5,000 unless a repository's log is too slow to (D50). */
  readonly history?: number | undefined;
};

/** The flags for the served run (D92, D133). */
export type ServeRunOptions = {
  readonly repo: string;
  readonly base?: BaseAsked | undefined;
  readonly head?: string | undefined;
  /** The built web app's directory, `index.html` and its assets; `pnpm build` fills it. */
  readonly assets: string;
  /** Open the tab once serving; a no-op under a test run. */
  readonly open: boolean;
  readonly verbose: boolean;
  readonly cache?: boolean | undefined;
  readonly history?: number | undefined;
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

/** A commit, and its time in unix seconds. */
type Head = { readonly sha: string; readonly time: number };

/**
 * The commit `ref` names, and its time: for the head, the clock every age is
 * measured back from. The checked-out `HEAD` is the first thing a run reads,
 * so a directory that is not a repository fails here, quietly and by name,
 * before any source has shelled out.
 */
function commitAt(repo: string, ref: string): Head {
  const named = ref === HEAD ? HEAD : commitOf(repo, ref);
  if (named === undefined) throw new Error(`--head ${ref} names no commit`);
  const [sha = '', time = ''] = git(repo, 'show', '-s', '--format=%H%n%ct', named).split('\n');
  if (!SHA.test(sha) || !UNIX_SECONDS.test(time)) throw new Error(`cannot read ${ref} of ${repo}`);
  return { sha, time: Number(time) };
}

/**
 * `.check/` when the head is the checked-out `HEAD`, the one commit whose
 * working tree checkride can have run on; any other head reads git-only and
 * says why (D135, C2).
 */
function checkFor(repo: string, ref: string, head: Head, checkedOut: Head): CheckInputs {
  if (head.sha === checkedOut.sha) return readCheck(repo);
  return { mode: 'git-only', reason: `the head ${ref} is not the checked-out HEAD, so .check/ does not describe it` };
}

/** One extracted commit: `tree` is the extraction the scanner reads, `root` the temp directory holding it. */
type Extraction = { readonly tree: string; readonly root: string };

/** The base side, extracted: the extraction the checker and fallow read again, the scan of it, and what the scan read from each file. */
type Side = { readonly tree: string; readonly scan: Scan; readonly parsed: ParsedFiles };

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

/** What `--verbose` prints: whether the terrain cache, each side's structure and the head's entry points hit, then each source's time. */
function report(measured: Measured): string {
  const { timings, structure } = measured;
  const width = timings.reduce((widest, timing) => Math.max(widest, timing.source.length), 0);
  const lines = timings.map((timing) => `  ${timing.source.padEnd(width)}  ${String(timing.ms)} ms\n`);
  const kept = [
    `  terrain cache ${measured.cache}\n`,
    `  structure base ${structure.base}\n`,
    `  structure head ${structure.head}\n`,
    `  entry points head ${measured.entries}\n`,
  ];
  return [...kept, ...lines].join('');
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

/** The map built, the timings so far, which the caller adds its own to, and what the terrain cache, each side's structure and the head's entry points did. */
type Measured = {
  readonly map: MapJson;
  readonly timings: Timing[];
  readonly cache: string;
  readonly structure: { readonly base: string; readonly head: string };
  readonly entries: string;
};

/** The config every run measures with: core's defaults, since no `atis.config.json` is read yet. */
const CONFIG = DEFAULT_CONFIG;

/**
 * The base side of a run: the base tree's scan, the history window at it and
 * its terrain's own layout, the extraction behind the scan when this run made
 * one, and what the terrain cache did, for `--verbose` to say.
 */
type Ground = {
  readonly scan: Scan;
  readonly parsed: ParsedFiles;
  readonly commits: readonly Commit[];
  readonly layout: Layout;
  readonly tree?: string;
  readonly cache: string;
};

/** How a run reaches the repository: its path, its timings, and the scan of an extracted commit. */
type Reader = {
  readonly repo: string;
  readonly timings: Timing[];
  readonly scanAt: (source: string, sha: string) => Side;
  /** How many commits of history to read (D50). */
  readonly history: number;
};

/**
 * The base side, from the terrain cache when it holds this commit for this
 * code and config, else measured: the tree extracted and scanned, the log
 * walked from the base, and the terrain laid out alone, relaxed from the
 * nearest ancestor the cache holds (D97), all three kept for the next run
 * (D96). With the cache off, the terrain is laid out from nothing and kept
 * nowhere. A cache that will not write leaves the run as it was, since the
 * map never depended on it (C4).
 */
function groundAt(reader: Reader, sha: string, cache: boolean): Ground {
  const { repo, timings, history } = reader;
  const key = cache ? { code: codeKey(), config: configKey(CONFIG, history) } : undefined;
  const read = key === undefined ? undefined : timed(timings, 'cache read', () => readTerrain(repo, sha, key));
  if (read?.hit === true) {
    const { terrain } = read;
    const { scan, parsed, commits, layout } = terrain;
    return { scan, parsed, commits, layout, cache: `hit, ${relative(repo, terrainPath(repo, sha))}` };
  }
  const side = reader.scanAt('scan base', sha);
  const commits = timed(timings, 'log base', () => readLog(repo, sha, history));
  const nearest = key === undefined ? undefined : timed(timings, 'cache near', () => nearestTerrain(repo, sha, key));
  const layout = timed(timings, 'layout base', () => layOutTerrain(side.scan, CONFIG, nearest?.terrain.layout));
  if (key === undefined || read === undefined) return { ...side, commits, layout, cache: 'off (--no-cache)' };
  const from = nearest === undefined ? 'laid out cold' : `relaxed from ${nearest.sha}`;
  try {
    const path = timed(timings, 'cache write', () => writeTerrain(repo, sha, key, { scan: side.scan, parsed: side.parsed, commits, layout }));
    return { ...side, commits, layout, cache: `miss (${read.reason}), ${from}, wrote ${relative(repo, path)}` };
  } catch (error) {
    return { ...side, commits, layout, cache: `miss (${read.reason}), ${from}, not written: ${messageOf(error)}` };
  }
}

/** One side's structure, and what the cache did with it, for `--verbose` to say. */
type Measure = { readonly structure: Structure; readonly cache: string };

/**
 * One commit's structure (D98): kept from an earlier run when this code and
 * this fallow measured it, else measured on its extraction, which `tree`
 * makes only when it is needed, and kept for the next run (D136). Only a
 * structure fallow read whole is kept, since a muted analysis may read on
 * the next run. A cache that will not write leaves the run as it was (C4).
 */
function structureAt(repo: string, sha: string, tree: () => string, fallow: LocalFallow | undefined, cache: boolean): Measure {
  if (fallow === undefined) return { structure: { reason: NO_LOCAL_FALLOW }, cache: 'none (no local fallow)' };
  const key = cache && fallow.version !== undefined ? { code: codeKey(), fallow: fallow.version } : undefined;
  const read = key === undefined ? undefined : readStructure(repo, sha, key);
  if (read?.hit === true) return { structure: read.structure, cache: `hit, ${relative(repo, structurePath(repo, sha))}` };
  const structure = measureStructure(tree(), fallow);
  if (!cache) return { structure, cache: 'off (--no-cache)' };
  if (key === undefined || read === undefined) return { structure, cache: 'measured, not kept: fallow names no version to key it by' };
  if ('reason' in structure || structure.muted.length > 0) return { structure, cache: `miss (${read.reason}), measured, not kept: fallow read only part of it` };
  try {
    return { structure, cache: `miss (${read.reason}), measured, wrote ${relative(repo, writeStructure(repo, sha, key, structure))}` };
  } catch (error) {
    return { structure, cache: `miss (${read.reason}), measured, not written: ${messageOf(error)}` };
  }
}

/** The files of `among` with a name only the checker can print (D118). */
function inferredIn(scan: Scan, among: ReadonlySet<string>): ReadonlySet<string> {
  return new Set(scan.files.filter((file) => among.has(file.path) && file.inferred.length > 0).map((file) => file.path));
}

/** The head's scan, and what the cache did with the entry points fallow listed for it, for `--verbose` to say. */
type HeadRead = { readonly side: ScannedTree; readonly entries: string };

/**
 * The head, read from git's own objects over the base's reads, parsing only
 * the files the diff touched (D136, D172). The entry points the reviewed
 * repo's fallow lists for it are kept per head commit, so a second run on one
 * change extracts the head for nothing; a cache that will not write leaves
 * the run as it was (C4).
 */
function headAt(repo: string, sha: string, prior: NonNullable<ScanOptions['prior']>, tree: () => string, fallow: LocalFallow | undefined, cache: boolean): HeadRead {
  const key = cache && fallow?.version !== undefined ? { code: codeKey(), fallow: fallow.version } : undefined;
  const kept: EntryPoints | undefined = key === undefined ? undefined : readEntries(repo, sha, key);
  const side = readCommit(sha, { repo, prior, entryPoints: kept, extracted: tree });
  if (fallow === undefined) return { side, entries: 'none (no local fallow)' };
  if (kept !== undefined) return { side, entries: `hit, ${relative(repo, entriesPath(repo, sha))}` };
  if (!cache) return { side, entries: 'off (--no-cache)' };
  if (key === undefined) return { side, entries: 'listed, not kept: fallow names no version to key it by' };
  try {
    const path = writeEntries(repo, sha, key, side.entryPoints);
    return { side, entries: path === undefined ? 'listed, not kept: fallow listed none' : `miss, listed, wrote ${relative(repo, path)}` };
  } catch (error) {
    return { side, entries: `listed, not written: ${messageOf(error)}` };
  }
}

/** What a run reads the repository for: the base and the head the reviewer asked for (D99), the cache switch and the history window. */
type Asked = { readonly base?: BaseAsked | undefined; readonly head?: string | undefined; readonly cache: boolean; readonly history?: number | undefined };

/** Read the repository and build the map; throws on a repository it cannot read, with the extractions removed either way. */
function measure(repoPath: string, asked: Asked): Measured {
  const { cache, history = HISTORY_WINDOW } = asked;
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
      return { tree, ...readTree(tree, { repo }) };
    });

  try {
    const checkedOut = commitAt(repo, HEAD);
    const headRef = asked.head ?? HEAD;
    const head = headRef === HEAD ? checkedOut : commitAt(repo, headRef);
    const base = timed(timings, 'base', () => resolveBase(repo, asked.base, headRef));
    const diff = timed(timings, 'diff', () => readDiff(repo, base.ref, head.sha));
    const ground = groundAt({ repo, timings, scanAt, history }, diff.merge_base, cache);
    // Neither side is extracted unless something reads it from disk: the checker, or the reviewed repo's fallow.
    let baseTree = ground.tree;
    const baseTreeOf = (): string => (baseTree ??= treeAt(diff.merge_base));
    let headTree: string | undefined;
    const headTreeOf = (): string => (headTree ??= treeAt(head.sha));
    const fallow = localFallow(repo);
    // The head reads only what the diff touched; every other file holds the base's bytes (D136).
    const touched = new Set(diff.changed.map((file) => file.path));
    const headRead = timed(timings, 'scan head', () => headAt(repo, head.sha, { parsed: ground.parsed, touched }, headTreeOf, fallow, cache));
    const headSide = headRead.side;
    // The names only the checker can print, in the changed interface files alone, each side timed (D118).
    const paths = shapePaths(diff.changed, ground.scan, headSide.scan);
    const inferred = { base: inferredIn(ground.scan, paths.base), head: inferredIn(headSide.scan, paths.head) };
    const baseScan = timed(timings, 'shapes base', () =>
      inferred.base.size === 0 ? ground.scan : checkInferredShapes(baseTreeOf(), ground.scan, inferred.base),
    );
    const headScan = timed(timings, 'shapes head', () =>
      inferred.head.size === 0 ? headSide.scan : checkInferredShapes(headTreeOf(), headSide.scan, inferred.head),
    );
    // Both sides by the same fallow, the base's beside its terrain and the head's per head commit (D98, D136).
    const baseStructure = timed(timings, 'structure base', () => structureAt(repo, diff.merge_base, baseTreeOf, fallow, cache));
    const headStructure = timed(timings, 'structure head', () => structureAt(repo, head.sha, headTreeOf, fallow, cache));
    const manifests = diff.changed.flatMap((file) => (file.from === undefined ? [file.path] : [file.path, file.from]));
    const { deps_added, deps_moved } = timed(timings, 'manifests', () => readManifests(repo, diff.merge_base, manifests, head.sha));
    // The window at the base, with the change's own commits on top, newest first (D8).
    const commits = timed(timings, 'log', () =>
      [...readLog(repo, `${diff.merge_base}..${head.sha}`, history), ...ground.commits].slice(0, history),
    );
    const check = timed(timings, 'check', () => checkFor(repo, headRef, head, checkedOut));

    const map = timed(timings, 'build', () =>
      buildMap({
        meta: {
          repo: basename(repo),
          base: base.ref,
          base_typed: base.typed,
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
        // The map holds the base's own layout wherever the change left the ground alone (D32, D172).
        ground: ground.layout,
        structure: { base: baseStructure.structure, head: headStructure.structure },
      }, CONFIG),
    );
    return { map, timings, cache: ground.cache, structure: { base: baseStructure.cache, head: headStructure.cache }, entries: headRead.entries };
  } finally {
    for (const extraction of extractions) rmSync(extraction.root, { recursive: true, force: true });
  }
}

/** Read the repository, build the map and write it, with the SVG beside it when asked. Exits 0 on a written map, 2 on a repository it cannot read (C4). */
export function run(options: Options): Outcome {
  const out = resolve(options.out);
  try {
    const measured = measure(options.repo, { base: options.base, head: options.head, cache: options.cache !== false, history: options.history });
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
    const measured = measure(options.repo, { base: options.base, head: options.head, cache: options.cache !== false, history: options.history });
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
