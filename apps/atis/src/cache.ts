/**
 * cache: the terrain a run keeps for the next one (D96, D137).
 *
 * The base side of a run depends on the base commit alone: its scan, the
 * history window at it (D8), and its terrain's own layout. Each is costly and
 * none changes while the commit does not, so a run on a base it has seen reads
 * them from `.atis/terrain/<sha>.json` under the reviewed repository instead
 * of extracting, scanning and walking the log again. Beside its commit, an
 * entry is keyed by a hash of the code that wrote it, read from atis's own
 * files at startup, and a hash of the config it was laid out under, so changed
 * code or a changed config misses by itself, whatever the version says. Every
 * entry is written atomically, and one that will not read is a miss, never an
 * error. `.atis/.gitignore` holds `*`, so atis never edits the repository's
 * own ignores.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Commit, Config, Layout } from 'core';
import ts from 'typescript';

import type { Scan } from './sources/index.js';

/** One base commit's terrain: what a run would otherwise extract, scan and walk the log for. */
export type BaseTerrain = {
  /** The base tree's scan, before the checker prints the change's inferred names, which depend on the change (D118). */
  readonly scan: Scan;
  /** The history window at the base, newest first (D8); a run reads only its change's own commits on top. */
  readonly commits: readonly Commit[];
  /** The base terrain's own layout, as `layOutTerrain` lays it out (D97 starts from it). */
  readonly layout: Layout;
};

/** What an entry is keyed by beside its commit (D137). */
export type TerrainKey = {
  /** A hash of the code that builds a terrain: atis's own files, core's, and the compiler the scan runs on. */
  readonly code: string;
  /** A hash of the config the terrain was laid out under. */
  readonly config: string;
};

/** A hit carries the terrain; a miss says why, for `--verbose` to name. */
export type TerrainRead = { readonly hit: true; readonly terrain: BaseTerrain } | { readonly hit: false; readonly reason: string };

const DIRECTORY = '.atis';
const TERRAIN = 'terrain';
const IGNORE_ALL = '*\n';
const TESTS = '__tests__';
/** The files that are code: TypeScript sources under a test run, JavaScript once built; never a declaration or a source map. */
const CODE = /\.(?:[cm]?js|[cm]?ts|tsx)$/;
const DECLARATION = /\.d\.[cm]?ts$/;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

/** Write through a neighbouring temp file and rename, so nothing ever reads half a file. */
export function writeAtomic(path: string, text: string): void {
  const directory = dirname(path);
  mkdirSync(directory, { recursive: true });
  const temp = join(directory, `.${basename(path)}.${String(process.pid)}.tmp`);
  writeFileSync(temp, text);
  renameSync(temp, path);
}

/** Where a base commit's terrain is kept, under the reviewed repository. */
export function terrainPath(repo: string, sha: string): string {
  return join(repo, DIRECTORY, TERRAIN, `${sha}.json`);
}

/** Every code file under `dir`, by its path relative to `root`, tests left out: they never build a terrain. */
function codeFiles(root: string, dir: string): readonly string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === TESTS ? [] : codeFiles(root, path);
    return entry.isFile() && CODE.test(entry.name) && !DECLARATION.test(entry.name) ? [relative(root, path)] : [];
  });
}

/**
 * A hash of the code files under each of `dirs`, by their paths and their
 * bytes, and of anything else named in `also`. One changed byte, one added or
 * one removed file changes it; the order the disk lists them in does not.
 */
export function hashCode(dirs: readonly string[], also: readonly string[] = []): string {
  const hash = createHash('sha256');
  for (const dir of dirs) {
    for (const path of codeFiles(dir, dir).toSorted()) {
      hash.update(`${path.split(sep).join('/')}\0`);
      hash.update(readFileSync(join(dir, path)));
      hash.update('\0');
    }
  }
  for (const value of also) hash.update(`${value}\0`);
  return hash.digest('hex');
}

/**
 * Where the code that builds a terrain lives: the directory this file runs
 * from (atis's `dist/` once built, its `src/` under a test run), and core's,
 * wherever the running process resolves it. Core missing from resolution
 * means it was bundled into the first.
 */
function codeDirs(): readonly string[] {
  const own = dirname(fileURLToPath(import.meta.url));
  try {
    return [own, dirname(fileURLToPath(import.meta.resolve('core')))];
  } catch {
    return [own];
  }
}

let ownCode: string | undefined;

/** The code key of this process, read once, at the first run that asks (D137). */
export function codeKey(): string {
  ownCode ??= hashCode(codeDirs(), [`typescript ${ts.version}`]);
  return ownCode;
}

/** The config key: the config as JSON, which is plain data, so one config is one string. */
export function configKey(config: Config): string {
  return sha256(JSON.stringify(config));
}

/*
 * The checks an entry's parts must pass to be read. They look at the parts'
 * kinds and no deeper: the writer was this same code, as its key says, so a
 * well-formed entry holds exactly what it wrote, and anything less is a miss.
 */

function isScan(value: unknown): value is Scan {
  return (
    isRecord(value) &&
    Array.isArray(value['files']) &&
    Array.isArray(value['edges']) &&
    Array.isArray(value['members']) &&
    isRecord(value['entry_points'])
  );
}

function isCommits(value: unknown): value is readonly Commit[] {
  return Array.isArray(value) && value.every((commit) => isRecord(commit) && Array.isArray(commit['files']));
}

function isLayout(value: unknown): value is Layout {
  return isRecord(value) && isRecord(value['positions']) && Array.isArray(value['bands']);
}

/** Read the terrain of `sha`, a hit only when the entry was written for this commit by this code under this config. */
export function readTerrain(repo: string, sha: string, key: TerrainKey): TerrainRead {
  const path = terrainPath(repo, sha);
  if (!existsSync(path)) return { hit: false, reason: 'no entry' };
  let entry: unknown;
  try {
    entry = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return { hit: false, reason: 'unreadable' };
  }
  if (!isRecord(entry) || entry['sha'] !== sha || !isRecord(entry['key'])) return { hit: false, reason: 'unreadable' };
  if (entry['key']['code'] !== key.code) return { hit: false, reason: 'code changed' };
  if (entry['key']['config'] !== key.config) return { hit: false, reason: 'config changed' };
  const { scan, commits, layout } = entry;
  if (!isScan(scan) || !isCommits(commits) || !isLayout(layout)) return { hit: false, reason: 'unreadable' };
  return { hit: true, terrain: { scan, commits, layout } };
}

/** Keep the terrain of `sha` for the next run, atomically, with `.atis/` ignored by a `.gitignore` of its own. Returns where it went. */
export function writeTerrain(repo: string, sha: string, key: TerrainKey, terrain: BaseTerrain): string {
  const ignore = join(repo, DIRECTORY, '.gitignore');
  if (!existsSync(ignore)) writeAtomic(ignore, IGNORE_ALL);
  const path = terrainPath(repo, sha);
  writeAtomic(path, JSON.stringify({ sha, key, ...terrain }));
  return path;
}
