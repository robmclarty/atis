/**
 * run: everything impure between the flags and the map.
 *
 * `measure` first resolves what the change is against: the base the
 * reviewer named, a shortcut counted back from the head, or the trunk when
 * they named none, and the head, `HEAD` unless `--head` named another, or
 * the working tree under `--working-tree`, written as a tree object whose
 * sha stands for the head commit's everywhere below (D99). `--range a..b`
 * reads `b` as the head and `a` as the base, and every commit between as a
 * head of its own over that one base, each a weather frame (D100).
 * It scans the merge-base tree and the head's tree, so the terrain
 * comes from the base and the weather from the head (D32) and both sides
 * describe commits rather than a working tree (D46). The base is extracted
 * with `git archive` into a temp directory when the cache does not hold it;
 * the head is read from git's own objects over the base's reads, parsing
 * only what the diff touched, and is extracted only when the checker or the
 * reviewed repo's fallow has to read it from disk (D136, D172). The diff, the manifest delta and the log window
 * come from the repository itself; only `.check/` is read from the working
 * tree, since artifacts are not committed, and only when the head is the
 * checked-out `HEAD` or the working tree itself, the one tree it can
 * describe (D135). The base side (its scan, the
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
 * `--whole-repo` maps no change: it reads the head's own terrain, kept per
 * commit in the same cache, its log window, its `.check/` under D135's rule,
 * and checkride's baseline as the head commits it, and core draws the whole
 * repository's overlays over that terrain in place of weather (D101).
 *
 * The map then goes one of three ways. `run` writes it atomically, and the
 * still SVG beside it, and exits. `pngRun` writes the same, then serves the
 * world for as long as a headless browser takes to capture it as a PNG
 * (D105), and exits. `serveRun` keeps it in memory and serves it with the
 * built web app on loopback, opening the tab (D92), until the process is
 * interrupted, and under `--watch` rebuilds it when the head side moves and
 * pushes it to the tab (D106). `commentRun` posts it to the branch's pull
 * request through `gh` (D108), one of the two commands that reach the
 * network (C5). None blocks on the weather: a map that was written or served
 * exits 0 whatever it says, and only misuse, a repository it cannot read, a
 * web app that was never built or a machine with no browser to capture with
 * exits 2 (C4).
 */

import { execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { platform, tmpdir } from 'node:os';
import { basename, join, relative, resolve } from 'node:path';

import { DEFAULT_CONFIG, OVERLAY_NAMES, buildMap, buildRepoMap, layOutTerrain } from 'core';
import type { CheckBaseline, Commit, FrameInputs, Layout, MapJson, OverlayName, Structure } from 'core';
import type { Browser } from 'playwright-core';
import { renderCinema, renderFingerprint, renderSvg } from 'svg';

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
import { MAPS_BRANCH, commentBody, findPullRequest, imageUrl, keepImage, postComment, scratchFile } from './comment.js';
import type { CommentImage } from './comment.js';
import { capturePng, launchBrowser } from './png.js';
import type { BrowserCandidate, Captured } from './png.js';
import { SERVING_FILE, dropServing, keepServing, serve } from './serve.js';
import type { BaseRequest, Rebuilt, Served } from './serve.js';
import { WATCH_EVERY_MS, signatureOf, watchRepo, watchedIn } from './watch.js';
import {
  BASELINE_FILE,
  HISTORY_WINDOW,
  NO_LOCAL_FALLOW,
  checkInferredShapes,
  commitOf,
  localFallow,
  measureStructure,
  parseBaseline,
  readCheck,
  readDiff,
  readLog,
  readCommit,
  readManifests,
  readTree,
  resolveBase,
  shapePaths,
  workingTree,
} from './sources/index.js';
import type { BaseAsked, CheckInputs, Diff, EntryPoints, LocalFallow, ParsedFiles, Scan, ScanOptions, ScannedTree } from './sources/index.js';

/** How the reviewer asked for the head (D99): a ref `--head` named, or the working tree, `--working-tree`. */
export type HeadAsked = string | { readonly workingTree: true };

/** A range as `--range <from>..<to>` typed it: the map is `to`'s change over `from`, with a weather frame per commit between (D100). */
export type RangeAsked = { readonly from: string; readonly to: string };

/** What `meta.head` reads for a map whose head side is the working tree (D99). */
export const WORKING_TREE = 'working-tree';

/** The flags for a run that writes files, already parsed: `cli.ts` owns the parsing, `run` owns the work. */
export type Options = {
  /** The repository to read. */
  readonly repo: string;
  /** The base the reviewer asked for, a ref or a shortcut; absent, the trunk (D99). The diff is `merge-base(base, head)..head` (D25). */
  readonly base?: BaseAsked | undefined;
  /** The ref the weather is of, or the working tree; `HEAD` when absent (D99). */
  readonly head?: HeadAsked | undefined;
  /** A range to frame commit by commit; it names the base and the head itself, so neither is set beside it (D100). */
  readonly range?: RangeAsked | undefined;
  /** Map the whole repository at the head, its overlays in place of a change, so no base is set beside it (D101). */
  readonly wholeRepo?: boolean | undefined;
  /** Where to write the map, resolved against the working directory. */
  readonly out: string;
  /** Where to write the still SVG (D33); when absent, only `map.json` is written. */
  readonly svg?: string | undefined;
  /** The overlay the still SVG of the whole repo draws, trouble spots when absent (D101). */
  readonly overlay?: OverlayName | undefined;
  /** Hand the SVG to the platform opener once written; a no-op under a test run. */
  readonly open?: boolean | undefined;
  /** Print the per-source timings D50 asks for on stderr, and whether the terrain cache hit. */
  readonly verbose: boolean;
  /** `false` measures the base side afresh and keeps nothing (`--no-cache`); the terrain cache is read and written otherwise (D96). */
  readonly cache?: boolean | undefined;
  /** How many commits of history to read, newest first; 5,000 unless a repository's log is too slow to (D50). */
  readonly history?: number | undefined;
};

/** The flags for a run that also captures the world as a PNG (D105): a file run's, the PNG's path, the built web app to serve, and the browsers to try, the installed ones unless a test names its own. */
export type PngRunOptions = Options & {
  readonly png: string;
  readonly assets: string;
  readonly browsers?: readonly BrowserCandidate[] | undefined;
};

/** The flags for `--comment` (D108): the change asked for, and the `gh` to run, `gh` itself unless a test names its own. */
export type CommentRunOptions = {
  readonly repo: string;
  readonly base?: BaseAsked | undefined;
  readonly head?: string | undefined;
  readonly range?: RangeAsked | undefined;
  readonly verbose: boolean;
  readonly cache?: boolean | undefined;
  readonly history?: number | undefined;
  readonly gh?: string | undefined;
};

/** The flags for the served run (D92, D133). */
export type ServeRunOptions = {
  readonly repo: string;
  readonly base?: BaseAsked | undefined;
  readonly head?: HeadAsked | undefined;
  readonly range?: RangeAsked | undefined;
  readonly wholeRepo?: boolean | undefined;
  /** The built web app's directory, `index.html` and its assets; `pnpm build` fills it. */
  readonly assets: string;
  /** Open the tab once serving; a no-op under a test run. */
  readonly open: boolean;
  readonly verbose: boolean;
  readonly cache?: boolean | undefined;
  readonly history?: number | undefined;
  /** The run's token (D134); drawn at random unless a test names one. */
  readonly token?: string | undefined;
  /** Rebuild the map when the head side moves, and push it to the tab (D106). */
  readonly watch?: boolean | undefined;
  /** How often the watch reads the repository, in milliseconds; a test shortens it. */
  readonly watchEvery?: number | undefined;
  /** Where the watch says what it did: a line per map pushed, or kept when a rebuild failed; stderr unless a test listens. */
  readonly watchLog?: ((line: string) => void) | undefined;
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
function commitAt(repo: string, ref: string, flag: string = '--head'): Head {
  const named = ref === HEAD ? HEAD : commitOf(repo, ref);
  if (named === undefined) throw new Error(`${flag} ${ref} names no commit`);
  const [sha = '', time = ''] = git(repo, 'show', '-s', '--format=%H%n%ct', named).split('\n');
  if (!SHA.test(sha) || !UNIX_SECONDS.test(time)) throw new Error(`cannot read ${ref} of ${repo}`);
  return { sha, time: Number(time) };
}

/**
 * `.check/` when the head is the checked-out `HEAD`, the one commit whose
 * working tree checkride can have run on, or that working tree itself; any
 * other head, `named` by how the reviewer asked for it, reads git-only and
 * says why (D135, C2).
 */
function checkFor(repo: string, named: string, head: Head, checkedOut: Head, working: boolean): CheckInputs {
  if (working || head.sha === checkedOut.sha) return readCheck(repo);
  return { mode: 'git-only', reason: `${named} is not the checked-out HEAD, so .check/ does not describe it` };
}

/** One commit of a range, oldest first: the head of one weather frame (D100). */
type RangeCommit = Head & { readonly subject: string };

/**
 * The commits of `mergeBase..head` along the head's first parents, oldest
 * first: the states the range's head passed through on its own line, each a
 * descendant of the merge-base the one terrain is cut from (D100). A commit a
 * merge brought in from another line is part of that merge's frame.
 */
function rangeCommits(repo: string, mergeBase: string, head: string): readonly RangeCommit[] {
  const output = git(repo, 'log', '--reverse', '--first-parent', '--ancestry-path', '--format=%H%x00%ct%x00%s', `${mergeBase}..${head}`);
  return output
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => {
      const [sha = '', time = '', subject = ''] = line.split('\0');
      if (!SHA.test(sha) || !UNIX_SECONDS.test(time)) throw new Error(`malformed range line: "${line}"`);
      return { sha, time: Number(time), subject };
    });
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

/** What `--verbose` prints: whether the terrain cache, each side's structure and the head's entry points hit, where a run read them, then each source's time. */
function report(measured: Measured): string {
  const { timings, structure, entries } = measured;
  const width = timings.reduce((widest, timing) => Math.max(widest, timing.source.length), 0);
  const lines = timings.map((timing) => `  ${timing.source.padEnd(width)}  ${String(timing.ms)} ms\n`);
  const kept = [
    `  terrain cache ${measured.cache}\n`,
    ...(structure === undefined ? [] : [`  structure base ${structure.base}\n`, `  structure head ${structure.head}\n`]),
    ...(entries === undefined ? [] : [`  entry points head ${entries}\n`]),
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

/** The short form of a commit's sha a line names it by. */
const shortSha = (sha: string): string => (SHA.test(sha) ? sha.slice(0, 7) : sha);

function counted(total: number, noun: string): string {
  return `${String(total)} ${noun}${total === 1 ? '' : 's'}`;
}

/** The bytes the map is written as: two-space JSON with a trailing newline, the golden's own serialisation. */
function serialize(map: unknown): string {
  return `${JSON.stringify(map, null, 2)}\n`;
}

/** The one line every run prints: the category, the change's size and the notices; or, for the whole repository, its terrain and the overlays it drew (D101). */
function summary(map: MapJson): string {
  if (map.overlays !== undefined) {
    const { overlays } = map;
    const drawn = OVERLAY_NAMES.filter((name) => overlays[name] !== undefined).length;
    return `whole repo, ${counted(map.terrain.organelles.length, 'file')} on the terrain, ${String(drawn)} of ${String(OVERLAY_NAMES.length)} overlays`;
  }
  return `${map.weather.checks.category}, ${counted(map.weather.changed.length, 'file')} changed, ${counted(map.notices.length, 'notice')}`;
}

/** The map built, the timings so far, which the caller adds its own to, and what the terrain cache, each side's structure and the head's entry points did, where the run read them. */
type Measured = {
  readonly map: MapJson;
  readonly timings: Timing[];
  readonly cache: string;
  readonly structure?: { readonly base: string; readonly head: string };
  readonly entries?: string;
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
function groundAt(reader: Reader, sha: string, cache: boolean, side: string = 'base'): Ground {
  const { repo, timings, history } = reader;
  const key = cache ? { code: codeKey(), config: configKey(CONFIG, history) } : undefined;
  const read = key === undefined ? undefined : timed(timings, 'cache read', () => readTerrain(repo, sha, key));
  if (read?.hit === true) {
    const { terrain } = read;
    const { scan, parsed, commits, layout } = terrain;
    return { scan, parsed, commits, layout, cache: `hit, ${relative(repo, terrainPath(repo, sha))}` };
  }
  const scanned = reader.scanAt(`scan ${side}`, sha);
  const commits = timed(timings, `log ${side}`, () => readLog(repo, sha, history));
  const nearest = key === undefined ? undefined : timed(timings, 'cache near', () => nearestTerrain(repo, sha, key));
  const layout = timed(timings, `layout ${side}`, () => layOutTerrain(scanned.scan, CONFIG, nearest?.terrain.layout));
  if (key === undefined || read === undefined) return { ...scanned, commits, layout, cache: 'off (--no-cache)' };
  const from = nearest === undefined ? 'laid out cold' : `relaxed from ${nearest.sha}`;
  try {
    const path = timed(timings, 'cache write', () => writeTerrain(repo, sha, key, { scan: scanned.scan, parsed: scanned.parsed, commits, layout }));
    return { ...scanned, commits, layout, cache: `miss (${read.reason}), ${from}, wrote ${relative(repo, path)}` };
  } catch (error) {
    return { ...scanned, commits, layout, cache: `miss (${read.reason}), ${from}, not written: ${messageOf(error)}` };
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

/** What a run reads the repository for: the base and the head the reviewer asked for (D99), or the whole repository (D101), the cache switch and the history window. */
type Asked = {
  readonly base?: BaseAsked | undefined;
  readonly head?: HeadAsked | undefined;
  readonly range?: RangeAsked | undefined;
  readonly wholeRepo?: boolean | undefined;
  readonly cache: boolean;
  readonly history?: number | undefined;
};

/** One head side of the map before its shapes are checked: the tree it is read from, its change from the merge-base, and the scan of it (D136). */
type HeadSide = { readonly tree: string; readonly changed: Diff['changed']; readonly read: HeadRead };

/** One head side, read whole: every input `buildMap` takes from a head (D100). */
type HeadInputs = Omit<FrameInputs, 'commit' | 'subject' | 'head_time'>;

/** How a run times one leg of a side: alone, under its own name, or folded into a whole range's (D50). */
type Clock = <T>(source: string, work: () => T) => T;

/** A frame's legs, timed only as the whole range's `frames` line. */
const folded: Clock = (_, work) => work();

/** A range's base (D100): its `from`, which must name a commit, recorded as the range was typed. */
function rangeBase(repo: string, range: RangeAsked): { readonly ref: string; readonly typed: string } {
  const typed = `--range ${range.from}..${range.to}`;
  if (commitOf(repo, range.from) === undefined) throw new Error(`${typed}: ${range.from} names no commit`);
  return { ref: range.from, typed };
}

/**
 * checkride's baseline as `sha` commits it (D49), read from git's objects, so
 * a baseline edited and not committed is not the one drawn; or why there is
 * none to read.
 */
function committedBaseline(repo: string, sha: string): CheckBaseline {
  const spec = `${sha}:${BASELINE_FILE}`;
  try {
    git(repo, 'cat-file', '-e', spec);
  } catch {
    return { reason: `no ${BASELINE_FILE} is committed at the head` };
  }
  return parseBaseline(git(repo, 'show', spec));
}

/**
 * Read the whole repository at the head and build its `repo` map (D101): the
 * head's terrain, from the terrain cache as any base's is, so a change later
 * measured from this commit stands on the same ground (D96); its log window;
 * its `.check/`, read only when the head is the checked-out `HEAD` (D135);
 * and the baseline it commits. Throws on a repository it cannot read, with
 * the extraction removed either way.
 */
function measureRepo(repoPath: string, asked: Asked): Measured {
  const { cache, history = HISTORY_WINDOW } = asked;
  const repo = resolve(repoPath);
  const timings: Timing[] = [];
  const extractions: Extraction[] = [];
  const scanAt = (source: string, sha: string): Side =>
    timed(timings, source, () => {
      const extraction = extract(repo, sha);
      extractions.push(extraction);
      return { tree: extraction.tree, ...readTree(extraction.tree, { repo }) };
    });

  try {
    const checkedOut = commitAt(repo, HEAD);
    const named = typeof asked.head === 'string' ? asked.head : HEAD;
    const head = named === HEAD ? checkedOut : commitAt(repo, named);
    const ground = groundAt({ repo, timings, scanAt, history }, head.sha, cache, 'head');
    const check = timed(timings, 'check', () => checkFor(repo, `the head ${named}`, head, checkedOut, false));
    const baseline = timed(timings, 'baseline', () => committedBaseline(repo, head.sha));
    const map = timed(timings, 'build', () =>
      buildRepoMap(
        {
          meta: { repo: basename(repo), named, head: head.sha, generated_at: new Date().toISOString() },
          scan: ground.scan,
          commits: ground.commits,
          head_time: head.time,
          check,
          baseline,
          ground: ground.layout,
        },
        CONFIG,
      ),
    );
    return { map, timings, cache: ground.cache };
  } finally {
    for (const extraction of extractions) rmSync(extraction.root, { recursive: true, force: true });
  }
}

/** Read the repository and build the map; throws on a repository it cannot read, with the extractions removed either way. */
function measure(repoPath: string, asked: Asked): Measured {
  if (asked.wholeRepo === true) return measureRepo(repoPath, asked);
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
    const { range } = asked;
    const working = typeof asked.head === 'object';
    const headRef = range?.to ?? (typeof asked.head === 'string' ? asked.head : HEAD);
    const head = headRef === HEAD ? checkedOut : commitAt(repo, headRef, range === undefined ? '--head' : '--range');
    const base = timed(timings, 'base', () => (range === undefined ? resolveBase(repo, asked.base, headRef) : rangeBase(repo, range)));
    // The head side's tree: the head commit's, or the working tree's, staged, unstaged and untracked (D99).
    const tree = working ? timed(timings, 'working tree', () => workingTree(repo)) : head.sha;
    const diff = timed(timings, 'diff', () => readDiff(repo, base.ref, head.sha, tree));
    const ground = groundAt({ repo, timings, scanAt, history }, diff.merge_base, cache);
    // No tree is extracted unless something reads it from disk: the checker, or the reviewed repo's fallow.
    const trees = new Map<string, string>(ground.tree === undefined ? [] : [[diff.merge_base, ground.tree]]);
    const treeOf = (sha: string): string => {
      const kept = trees.get(sha);
      if (kept !== undefined) return kept;
      const extracted = treeAt(sha);
      trees.set(sha, extracted);
      return extracted;
    };
    const fallow = localFallow(repo);

    // Each head reads only what its diff touched; every other file holds the base's bytes (D136).
    const sideAt = (sideTree: string, changed: Diff['changed']): HeadSide => {
      const touched = new Set(changed.map((file) => file.path));
      return { tree: sideTree, changed, read: headAt(repo, sideTree, { parsed: ground.parsed, touched }, () => treeOf(sideTree), fallow, cache) };
    };
    const top = timed(timings, 'scan head', () => sideAt(tree, diff.changed));
    // A range reads each commit as a head over the one base, its last the map's own head (D100).
    const frameSides =
      range === undefined
        ? []
        : timed(timings, 'frames scan', () =>
            rangeCommits(repo, diff.merge_base, head.sha).map((commit) => ({
              commit,
              side: commit.sha === head.sha ? top : sideAt(commit.sha, readDiff(repo, diff.merge_base, commit.sha).changed),
            })),
          );

    // The names only the checker can print, in the changed interface files alone, each side timed (D118);
    // the base's, once, for every side that reads it.
    const sides = [top, ...frameSides.map((frame) => frame.side)];
    const basePaths = new Set(sides.flatMap((side) => [...shapePaths(side.changed, ground.scan, side.read.side.scan).base]));
    const inferredBase = inferredIn(ground.scan, basePaths);
    const baseScan = timed(timings, 'shapes base', () =>
      inferredBase.size === 0 ? ground.scan : checkInferredShapes(treeOf(diff.merge_base), ground.scan, inferredBase),
    );
    // Both sides by the same fallow, the base's beside its terrain and each head's per head commit (D98, D136).
    const baseStructure = timed(timings, 'structure base', () => structureAt(repo, diff.merge_base, () => treeOf(diff.merge_base), fallow, cache));

    /** One head side, read whole: its shapes, its structure, its manifests, its log and its evidence. */
    const inputsOf = (side: HeadSide, commit: string, check: () => CheckInputs, clock: Clock): { readonly inputs: HeadInputs; readonly cache: string } => {
      const headScan = side.read.side.scan;
      const inferred = inferredIn(headScan, shapePaths(side.changed, ground.scan, headScan).head);
      const scan = clock('shapes head', () => (inferred.size === 0 ? headScan : checkInferredShapes(treeOf(side.tree), headScan, inferred)));
      const structure = clock('structure head', () => structureAt(repo, side.tree, () => treeOf(side.tree), fallow, cache));
      const manifests = side.changed.flatMap((file) => (file.from === undefined ? [file.path] : [file.path, file.from]));
      const { deps_added, deps_moved } = clock('manifests', () => readManifests(repo, diff.merge_base, manifests, side.tree));
      // The window at the base, with the change's own commits on top, newest first (D8); a working tree adds none.
      const window = clock('log', () => [...readLog(repo, `${diff.merge_base}..${commit}`, history), ...ground.commits].slice(0, history));
      const inputs = { head: scan, diff: side.changed, deps_added, deps_moved, commits: window, check: clock('check', check), structure: { base: baseStructure.structure, head: structure.structure } };
      return { inputs, cache: structure.cache };
    };
    const own: Clock = (source, work) => timed(timings, source, work);
    const { inputs: headInputs, cache: structureCache } = inputsOf(top, head.sha, () => checkFor(repo, `the head ${headRef}`, head, checkedOut, working), own);
    const frameOf = ({ commit, side }: (typeof frameSides)[number]): FrameInputs => {
      const read = side === top ? headInputs : inputsOf(side, commit.sha, () => checkFor(repo, `the commit ${commit.sha}`, commit, checkedOut, false), folded).inputs;
      return { commit: commit.sha, subject: commit.subject, ...read, head_time: commit.time };
    };
    const frames = range === undefined ? undefined : timed(timings, 'frames', () => frameSides.map(frameOf));

    const map = timed(timings, 'build', () =>
      buildMap({
        meta: {
          repo: basename(repo),
          base: base.ref,
          base_typed: base.typed,
          head: working ? WORKING_TREE : head.sha,
          merge_base: diff.merge_base,
          generated_at: new Date().toISOString(),
        },
        base: baseScan,
        ...headInputs,
        head_time: head.time,
        // The map holds the base's own layout wherever the change left the ground alone (D32, D172).
        ground: ground.layout,
        ...(frames === undefined ? {} : { frames }),
      }, CONFIG),
    );
    return { map, timings, cache: ground.cache, structure: { base: baseStructure.cache, head: structureCache }, entries: top.read.entries };
  } finally {
    for (const extraction of extractions) rmSync(extraction.root, { recursive: true, force: true });
  }
}

/** Measure the repository and write the map, with the SVG beside it when asked; throws on a repository it cannot read. */
function writeMap(options: Options): Measured {
  const measured = measure(options.repo, { base: options.base, head: options.head, range: options.range, wholeRepo: options.wholeRepo, cache: options.cache !== false, history: options.history });
  const { map, timings } = measured;
  timed(timings, 'write', () => {
    writeAtomic(resolve(options.out), serialize(map));
  });
  if (options.svg !== undefined) {
    const svgOut = resolve(options.svg);
    const svg = timed(timings, 'render', () => renderSvg(map, { overlay: options.overlay }));
    timed(timings, 'write svg', () => {
      writeAtomic(svgOut, svg);
    });
    if (options.open === true) openTarget(svgOut);
  }
  return measured;
}

/** The files a run wrote, as its summary line names them. */
const wroteOf = (files: readonly (string | undefined)[]): string => {
  const named = files.filter((file) => file !== undefined);
  return named.length < 3 ? named.join(' and ') : `${named.slice(0, -1).join(', ')} and ${named.at(-1) ?? ''}`;
};

/** Read the repository, build the map and write it, with the SVG beside it when asked. Exits 0 on a written map, 2 on a repository it cannot read (C4). */
export function run(options: Options): Outcome {
  try {
    const measured = writeMap(options);
    return { exitCode: 0, stdout: `${summary(measured.map)}, wrote ${wroteOf([options.out, options.svg])}\n`, stderr: options.verbose ? report(measured) : '' };
  } catch (error) {
    return failed(error);
  }
}

/** The flags `atis fingerprint` takes (D107): the repository, the commit to draw, `HEAD` unless named, and the SVG to write. */
export type FingerprintOptions = { readonly repo: string; readonly head?: string | undefined; readonly out: string };

/**
 * Write the terrain fingerprint for a README (D107): the whole repository at
 * the head, measured afresh, neither reading nor writing the terrain cache,
 * so one commit gives one layout and one image wherever it runs, and drawn
 * as its terrain alone. Exits 0 once written, 2 on a repository it cannot
 * read (C4).
 */
export function fingerprintRun(options: FingerprintOptions): Outcome {
  try {
    const { map } = measure(options.repo, { head: options.head, wholeRepo: true, cache: false });
    writeAtomic(resolve(options.out), renderFingerprint(map));
    return { exitCode: 0, stdout: `terrain of ${counted(map.terrain.organelles.length, 'file')} at ${shortSha(map.meta.head)}, wrote ${options.out}\n`, stderr: '' };
  } catch (error) {
    return failed(error);
  }
}

/** The world captured for a map: served on loopback with the built app, the map alone as a fixture is (D93), for as long as the capture takes (D105). */
async function captureMap(browser: Browser, assets: string, map: MapJson): Promise<Captured> {
  const served = await serve({ assets, map: serialize(map), token: randomBytes(16).toString('hex') });
  try {
    return await capturePng(browser, served.url);
  } finally {
    await served.close();
  }
}

/** The base a pull request is measured from when none is typed: its base branch, local if there is one, else as `origin` has it. */
function prBase(repo: string, branch: string): string {
  for (const ref of [branch, `origin/${branch}`]) {
    try {
      git(repo, 'rev-parse', '--verify', '--quiet', '--end-of-options', `${ref}^{commit}`);
      return ref;
    } catch {
      // Not here; the remote's may be.
    }
  }
  return branch;
}

/**
 * Post the map to the branch's pull request (D108): the PR found with `gh`
 * before anything is measured, the change measured over the PR's base unless
 * the flags name one, its image kept on `origin`'s `atis-maps` branch (Q38),
 * and one comment posted, or the one posted before updated. A push the
 * remote refuses leaves the comment its text alone, and says why. Exits 0
 * once the comment is posted, and 2 with no `gh`, no PR, a repository it
 * cannot read, or a post `gh` could not make (C4).
 */
export async function commentRun(options: CommentRunOptions): Promise<Outcome> {
  const gh = options.gh ?? 'gh';
  const repo = resolve(options.repo);
  const scratch = mkdtempSync(join(tmpdir(), 'atis-comment-'));
  try {
    const pr = await findPullRequest(gh, repo);
    const base = options.range === undefined ? (options.base ?? prBase(repo, pr.base)) : undefined;
    const measured = measure(options.repo, { base, head: options.head, range: options.range, cache: options.cache !== false, history: options.history });
    const { map } = measured;
    // The image is the cinema still, the minimap zoomed in on the change, drawn with no browser (D174, D175).
    const image = scratchFile(scratch, 'map.svg', renderCinema(map));
    let linked: CommentImage | undefined;
    let unkept = '';
    try {
      const commit = await keepImage(repo, map.meta.head, image, 'svg');
      linked = { url: imageUrl(pr, commit, map.meta.head, 'svg'), kind: 'svg' };
    } catch (error) {
      unkept = `atis: the comment carries no image, since ${MAPS_BRANCH} could not be pushed: ${messageOf(error)}\n`;
    }
    const url = await postComment(gh, repo, pr, commentBody(map, linked));
    const kept = linked === undefined ? '' : ` with its ${linked.kind.toUpperCase()} on ${MAPS_BRANCH}`;
    return { exitCode: 0, stdout: `${summary(map)}, commented on ${url}${kept}\n`, stderr: `${unkept}${options.verbose ? report(measured) : ''}` };
  } catch (error) {
    return failed(error);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

/** The outcome of a run that needs the built web app and finds none (D133). */
const unbuilt = (assets: string): Outcome => ({ exitCode: 2, stdout: '', stderr: `atis: no built web app at ${assets}; run \`pnpm build\` first\n` });

/**
 * Write the map as `run` does, then capture the world as a PNG (D105): a
 * browser launched first, so a machine with none exits 2 before the scan is
 * spent and with nothing written, then the map served on loopback with the
 * built web app, as a fixture is, the map alone (D93), for as long as the
 * capture takes. Exits 0 once the PNG is written, and 2 with no built app,
 * no browser, a repository it cannot read or a world that never drew (C4).
 */
export async function pngRun(options: PngRunOptions): Promise<Outcome> {
  const assets = resolve(options.assets);
  if (!existsSync(join(assets, 'index.html'))) return unbuilt(assets);
  let browser: Browser;
  try {
    browser = await launchBrowser(options.browsers);
  } catch (error) {
    return failed(error);
  }
  try {
    const measured = writeMap(options);
    const { map, timings } = measured;
    const started = performance.now();
    const captured = await captureMap(browser, assets, map);
    timings.push({ source: 'capture', ms: Math.round(performance.now() - started) });
    timed(timings, 'write png', () => {
      writeAtomic(resolve(options.png), captured.png);
    });
    const drawn = captured.backend === undefined ? '' : `, drawn on ${captured.backend}`;
    return { exitCode: 0, stdout: `${summary(map)}, wrote ${wroteOf([options.out, options.svg, options.png])}${drawn}\n`, stderr: options.verbose ? report(measured) : '' };
  } catch (error) {
    return failed(error);
  } finally {
    await browser.close();
  }
}

/**
 * The map over the base a `POST /base` names (D99, C13): measured as a fresh
 * run is, the head the served run's own unless the request asks for the
 * working tree, through the same terrain cache, so a base whose terrain is
 * kept draws the ground it drew before (P2). A range or a whole-repo map
 * gives way to one change over the base asked for.
 */
function mapOver(options: ServeRunOptions, request: BaseRequest): MapJson {
  const base = request.last === undefined ? request.base : { last: request.last };
  const head = request.working_tree === true ? { workingTree: true as const } : options.head;
  return measure(options.repo, { base, head, cache: options.cache !== false, history: options.history }).map;
}

/** A map as the server holds it: its JSON text, and the slots its raw output may be served for. */
const rebuiltOf = (map: MapJson): Rebuilt => ({ map: serialize(map), slots: map.weather.checks.slots.map((slot) => slot.name) });

/**
 * Read the repository, build the map and serve it with the built web app on
 * loopback (D92, D133, D134), opening the tab unless told not to, and rebuild
 * it over another base when the page asks (`POST /base`). Under `--watch` it
 * reads the head side's signature before it measures, so a commit landing
 * mid-scan is never missed, and each time the signature moves it rebuilds
 * the map over the base the page last switched to, else as the flags asked,
 * through the terrain cache, and pushes it to the tab; a rebuild that fails
 * keeps the map the tab holds and says why (D106). While it serves, it says
 * how to reach it in `.atis/serve.json`, so `atis mcp` started in the same
 * repository can point at the tab (D138); a repository that will not take
 * the file is still served, and the run says `atis mcp` will not find it.
 * The outcome carries the server, which the caller closes on interrupt, the
 * watch and the file with it; its exit code is 0 once serving, and 2 with no
 * built app to serve or a repository it cannot read (C4).
 */
export async function serveRun(options: ServeRunOptions): Promise<Outcome> {
  const assets = resolve(options.assets);
  if (!existsSync(join(assets, 'index.html'))) return unbuilt(assets);
  try {
    const repo = resolve(options.repo);
    const watched = options.watch === true ? watchedIn(repo) : undefined;
    const from = watched === undefined ? undefined : await signatureOf(watched);
    const asTyped = { base: options.base, head: options.head, range: options.range, wholeRepo: options.wholeRepo, cache: options.cache !== false, history: options.history };
    const measured = measure(options.repo, asTyped);
    const { map, timings } = measured;
    const token = options.token ?? randomBytes(16).toString('hex');
    const started = performance.now();
    // The raw check output beside the map (D93): the run's `.check/`, for the slots the map holds alone (D134).
    const served = await serve({
      assets,
      map: serialize(map),
      token,
      checks: { dir: join(options.repo, '.check'), slots: map.weather.checks.slots.map((slot) => slot.name) },
      rebase: { repo, rebuild: (request) => Promise.resolve(rebuiltOf(mapOver(options, request))) },
      watch: watched !== undefined,
    });
    timings.push({ source: 'serve', ms: Math.round(performance.now() - started) });
    const log = options.watchLog ?? ((line: string) => process.stderr.write(line));
    const watching =
      watched === undefined || from === undefined
        ? undefined
        : watchRepo(
            watched,
            from,
            async () => {
              try {
                const switched = served.asked();
                const next = switched === undefined ? measure(options.repo, asTyped).map : mapOver(options, switched);
                served.push(rebuiltOf(next));
                log(`atis: watched ${shortSha(next.meta.head)}: ${summary(next)}\n`);
              } catch (error) {
                log(`atis: the watch kept the last map: ${messageOf(error)}\n`);
              }
            },
            options.watchEvery ?? WATCH_EVERY_MS,
          );
    // Where `atis mcp`, started in this repository, finds the tab (D138); taken back as the run closes.
    let unkept = '';
    try {
      keepServing(repo, { port: served.port, token, pid: process.pid });
    } catch (error) {
      unkept = `atis: atis mcp will not find this tab, since ${SERVING_FILE} could not be written: ${messageOf(error)}\n`;
    }
    if (options.open) openTarget(served.url);
    return {
      exitCode: 0,
      stdout: `${summary(map)}, serving at ${served.url}${watching === undefined ? '' : ', watching'} (Ctrl-C to stop)\n`,
      stderr: `${unkept}${options.verbose ? report(measured) : ''}`,
      served: {
        ...served,
        close: () => {
          watching?.close();
          dropServing(repo, process.pid);
          return served.close();
        },
      },
    };
  } catch (error) {
    return failed(error);
  }
}
