/**
 * cache: the terrain a run keeps for the next one (D96, D137).
 *
 * The base side of a run depends on the base commit alone: its scan and what
 * the scan read from each file, the history window at it (D8), and its
 * terrain's own layout. Each is costly and
 * none changes while the commit does not, so a run on a base it has seen reads
 * them from `.atis/terrain/<sha>.json` under the reviewed repository instead
 * of extracting, scanning and walking the log again. Beside its commit, an
 * entry is keyed by a hash of the code that wrote it, read from atis's own
 * files at startup, and a hash of the config it was laid out under, so changed
 * code or a changed config misses by itself, whatever the version says. Every
 * entry is written atomically, and one that will not read is a miss, never an
 * error. `.atis/.gitignore` holds `*`, so atis never edits the repository's
 * own ignores. A base the cache has not seen is laid out from the nearest
 * ancestor it has, so the terrain holds still across bases (D97).
 *
 * Beside each terrain sits what the reviewed repo's own fallow measured of a
 * commit, at `.atis/structure/<sha>.json`: the base's, read on the same runs
 * the terrain is, and the head's, per head commit, so a second run on one
 * change runs fallow on neither side (D98, D136). It is keyed by the code
 * that read it and the fallow that measured it, since a repository that moves
 * its fallow pin would otherwise compare a base measured by one version with
 * a head measured by another, while its terrain stands as it was.
 *
 * Beside them, at `.atis/entries/<sha>.json`, sit the entry points that
 * fallow listed for a head commit, under the same key, so the head's scan,
 * read from git's own objects, needs no extraction of the head on a second
 * run either (D136, D172).
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Commit, Config, Layout, Structure } from 'core';
import ts from 'typescript';

import type { EntryPoints, ParsedFiles, Scan } from './sources/index.js';

/** One base commit's terrain: what a run would otherwise extract, scan and walk the log for. */
export type BaseTerrain = {
  /** The base tree's scan, before the checker prints the change's inferred names, which depend on the change (D118). */
  readonly scan: Scan;
  /** What the scan read from each file, which the head's scan reuses for every file the diff left alone (D136). */
  readonly parsed: ParsedFiles;
  /** The history window at the base, newest first (D8); a run reads only its change's own commits on top. */
  readonly commits: readonly Commit[];
  /** The base terrain's own layout, as `layOutTerrain` lays it out (D97 starts from it). */
  readonly layout: Layout;
};

/** What an entry is keyed by beside its commit (D137). */
export type TerrainKey = {
  /** A hash of the code that builds a terrain: atis's own files, core's, and the compiler the scan runs on. */
  readonly code: string;
  /** A hash of the config the terrain was laid out under and the history window it read (D50). */
  readonly config: string;
};

/** A hit carries the terrain; a miss says why, for `--verbose` to name. */
export type TerrainRead = { readonly hit: true; readonly terrain: BaseTerrain } | { readonly hit: false; readonly reason: string };

/** A commit's structure as fallow measured all of it; one with a reason or a muted analysis is never kept, since the next run may read it whole. */
export type MeasuredStructure = Extract<Structure, { readonly fallow: string }>;

/** What a structure entry is keyed by beside its commit (D98). */
export type StructureKey = {
  /** The same code key a terrain carries (D137): the parsers that read the reports are atis's own. */
  readonly code: string;
  /** The version of the reviewed repo's own fallow, as its package names it. */
  readonly fallow: string;
};

/** A hit carries the structure; a miss says why. */
export type StructureRead = { readonly hit: true; readonly structure: MeasuredStructure } | { readonly hit: false; readonly reason: string };

const DIRECTORY = '.atis';
const TERRAIN = 'terrain';
const STRUCTURE = 'structure';
const ENTRIES = 'entries';
const ENTRY = '.json';
/** How many commits back from a base the cache looks for an ancestor's terrain to relax from (D97). */
const ANCESTRY = 1000;
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
  return join(repo, DIRECTORY, TERRAIN, `${sha}${ENTRY}`);
}

/** Where a commit's structure is kept, beside the terrains (D98). */
export function structurePath(repo: string, sha: string): string {
  return join(repo, DIRECTORY, STRUCTURE, `${sha}${ENTRY}`);
}

/** Where the entry points fallow listed for a head commit are kept, beside the structures (D136). */
export function entriesPath(repo: string, sha: string): string {
  return join(repo, DIRECTORY, ENTRIES, `${sha}${ENTRY}`);
}

/** Write an entry under `.atis/`, which ignores itself in git, so atis never edits the repository's own ignores. */
function keep(repo: string, path: string, entry: unknown): string {
  const ignore = join(repo, DIRECTORY, '.gitignore');
  if (!existsSync(ignore)) writeAtomic(ignore, IGNORE_ALL);
  writeAtomic(path, JSON.stringify(entry));
  return path;
}

/** An entry's JSON, `undefined` when it will not parse, or no entry at all. */
function entryAt(path: string): { readonly found: false } | { readonly found: true; readonly entry: unknown } {
  if (!existsSync(path)) return { found: false };
  try {
    return { found: true, entry: JSON.parse(readFileSync(path, 'utf8')) };
  } catch {
    return { found: true, entry: undefined };
  }
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

/** The config key: the config and the history window as JSON, which is plain data, so one config is one string. */
export function configKey(config: Config, history: number): string {
  return sha256(JSON.stringify({ config, history }));
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

function isParsed(value: unknown): value is ParsedFiles {
  return isRecord(value) && Object.values(value).every((file) => isRecord(file) && Array.isArray(file['references']));
}

function isCommits(value: unknown): value is readonly Commit[] {
  return Array.isArray(value) && value.every((commit) => isRecord(commit) && Array.isArray(commit['files']));
}

function isLayout(value: unknown): value is Layout {
  return isRecord(value) && isRecord(value['positions']) && Array.isArray(value['bands']);
}

/** Each report is absent, or a record holding the lists `.check/`'s parsers give it. */
function holds(value: unknown, lists: readonly string[]): boolean {
  return value === undefined || (isRecord(value) && lists.every((list) => Array.isArray(value[list])));
}

function isStructure(value: unknown): value is MeasuredStructure {
  return (
    isRecord(value) &&
    typeof value['fallow'] === 'string' &&
    Array.isArray(value['muted']) &&
    holds(value['health'], ['file_scores', 'findings']) &&
    holds(value['dupes'], ['clone_families']) &&
    holds(value['dead'], ['circular_dependencies', 're_export_cycles', 'boundary_violations', 'unused_exports'])
  );
}

/** Read the terrain of `sha`, a hit only when the entry was written for this commit by this code under this config. */
export function readTerrain(repo: string, sha: string, key: TerrainKey): TerrainRead {
  const read = entryAt(terrainPath(repo, sha));
  if (!read.found) return { hit: false, reason: 'no entry' };
  const { entry } = read;
  if (!isRecord(entry) || entry['sha'] !== sha || !isRecord(entry['key'])) return { hit: false, reason: 'unreadable' };
  if (entry['key']['code'] !== key.code) return { hit: false, reason: 'code changed' };
  if (entry['key']['config'] !== key.config) return { hit: false, reason: 'config changed' };
  const { scan, parsed, commits, layout } = entry;
  if (!isScan(scan) || !isParsed(parsed) || !isCommits(commits) || !isLayout(layout)) return { hit: false, reason: 'unreadable' };
  return { hit: true, terrain: { scan, parsed, commits, layout } };
}

/** Keep the terrain of `sha` for the next run, atomically, with `.atis/` ignored by a `.gitignore` of its own. Returns where it went. */
export function writeTerrain(repo: string, sha: string, key: TerrainKey, terrain: BaseTerrain): string {
  return keep(repo, terrainPath(repo, sha), { sha, key, ...terrain });
}

/** Read the structure of `sha`, a hit only when the entry was written for this commit by this code, as this fallow measured it (D98). */
export function readStructure(repo: string, sha: string, key: StructureKey): StructureRead {
  const read = entryAt(structurePath(repo, sha));
  if (!read.found) return { hit: false, reason: 'no entry' };
  const { entry } = read;
  if (!isRecord(entry) || entry['sha'] !== sha || !isRecord(entry['key'])) return { hit: false, reason: 'unreadable' };
  if (entry['key']['code'] !== key.code) return { hit: false, reason: 'code changed' };
  if (entry['key']['fallow'] !== key.fallow) return { hit: false, reason: 'fallow changed' };
  const { structure } = entry;
  return isStructure(structure) ? { hit: true, structure } : { hit: false, reason: 'unreadable' };
}

/** Keep the structure of `sha` for the next run, atomically, beside the terrains. Returns where it went. */
export function writeStructure(repo: string, sha: string, key: StructureKey, structure: MeasuredStructure): string {
  return keep(repo, structurePath(repo, sha), { sha, key, structure });
}

function isEntryList(value: unknown): value is EntryPoints['entries'] {
  return Array.isArray(value) && value.every((entry) => isRecord(entry) && typeof entry['path'] === 'string' && typeof entry['tag'] === 'string');
}

/** Read the entry points fallow listed for `sha`, a hit only when this code kept them as this fallow listed them. */
export function readEntries(repo: string, sha: string, key: StructureKey): EntryPoints | undefined {
  const read = entryAt(entriesPath(repo, sha));
  if (!read.found) return undefined;
  const { entry } = read;
  if (!isRecord(entry) || entry['sha'] !== sha || !isRecord(entry['key'])) return undefined;
  if (entry['key']['code'] !== key.code || entry['key']['fallow'] !== key.fallow || !isEntryList(entry['entries'])) return undefined;
  return { entries: entry['entries'], lookup: { source: 'fallow' } };
}

/** Keep the entry points fallow listed for `sha`, atomically; a lookup that fell back to the manifests is never kept, since fallow may read the next time. Returns where it went. */
export function writeEntries(repo: string, sha: string, key: StructureKey, entryPoints: EntryPoints): string | undefined {
  if (entryPoints.lookup.source !== 'fallow') return undefined;
  return keep(repo, entriesPath(repo, sha), { sha, key, entries: entryPoints.entries });
}

/** The commits the cache holds an entry for, by the names of its files. */
function keptCommits(repo: string): ReadonlySet<string> {
  const dir = join(repo, DIRECTORY, TERRAIN);
  if (!existsSync(dir)) return new Set();
  return new Set(readdirSync(dir).flatMap((name) => (name.endsWith(ENTRY) && !name.startsWith('.') ? [name.slice(0, -ENTRY.length)] : [])));
}

/** `sha` and its ancestors, nearest first, as far back as the cache looks; none when git cannot walk them. */
function ancestorsOf(repo: string, sha: string): readonly string[] {
  try {
    const listed = execFileSync('git', ['rev-list', `--max-count=${String(ANCESTRY)}`, sha], { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return listed.split('\n').filter((line) => line !== '');
  } catch {
    return [];
  }
}

/**
 * The terrain of the nearest ancestor of `sha` the cache holds for this code
 * and config, for a new base's layout to relax from (D97); none when the
 * cache holds no ancestor's, which lays the base out from nothing.
 */
export function nearestTerrain(repo: string, sha: string, key: TerrainKey): { readonly sha: string; readonly terrain: BaseTerrain } | undefined {
  const kept = keptCommits(repo);
  if ([...kept].every((commit) => commit === sha)) return undefined;
  for (const ancestor of ancestorsOf(repo, sha)) {
    if (ancestor === sha || !kept.has(ancestor)) continue;
    const read = readTerrain(repo, ancestor, key);
    if (read.hit) return { sha: ancestor, terrain: read.terrain };
  }
  return undefined;
}
