/**
 * git: the change itself. `resolveBase` turns the base the reviewer asked
 * for, or the trunk when they asked for none, into a ref (D99);
 * `workingTree` writes the working tree as a tree object, so the head side
 * can be read from it the way it is read from a commit (D99); `readDiff` computes the merge-base (D25) and turns
 * `git diff --name-status`, `--numstat` and `-U0` between it and the head
 * (D46) into `changed[]`; `readManifests` reads every workspace `package.json`
 * at both ends of the diff and `diffManifests` turns two manifests into the
 * dependencies `HEAD` added (D47); `readLog` turns `git log --numstat` into
 * `commits[]` for `computeHistory` (D8), no author field anywhere (C6). Each
 * split into a thin runner that shells out and a pure parser tested from
 * captured text (D30).
 */

import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { CONFIG_FILE, TRUNK_CANDIDATES, configuredTrunk } from 'core';
import type { ChangeKind, Commit, DepAdded, DepMoved, Hunk } from 'core';

import { globToRegExp, parseManifestWorkspaces, parseWorkspaceGlobs } from './imports.js';

/** One changed file between the merge-base and `HEAD`; hunks are on the head side. */
export type DiffChange = {
  readonly path: string;
  readonly kind: ChangeKind;
  readonly from?: string;
  readonly added: number;
  readonly deleted: number;
  readonly hunks: readonly Hunk[];
};

export type Diff = {
  readonly merge_base: string;
  readonly changed: readonly DiffChange[];
};

const MANIFEST = 'package.json';
const WORKSPACE_FILE = 'pnpm-workspace.yaml';
const HEAD = 'HEAD';

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function lines(output: string): readonly string[] {
  return output.split('\n').filter((line) => line.trim() !== '');
}

function git(repo: string, args: readonly string[]): string {
  return execFileSync('git', args, { cwd: repo, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

/** A git command whose failure is an answer rather than an error: its complaint stays off the run's stderr, and the caller reads the throw. */
function quietGit(repo: string, args: readonly string[]): string {
  return execFileSync('git', args, { cwd: repo, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
}

/** `undefined` when `path` does not exist at `sha`, never a thrown error (C2). */
function showFile(repo: string, sha: string, path: string): string | undefined {
  try {
    return quietGit(repo, ['show', `${sha}:${path}`]);
  } catch {
    return undefined;
  }
}

type NameStatusEntry = { readonly path: string; readonly kind: ChangeKind; readonly from?: string };

const STATUS_KIND: Readonly<Record<string, ChangeKind>> = { A: 'added', M: 'modified', D: 'deleted' };

/** `git diff --name-status -M`: one entry per changed file, a rename carrying both paths. */
function parseNameStatus(output: string): readonly NameStatusEntry[] {
  return lines(output).map((line) => {
    const [code, ...fields] = line.split('\t');
    if (code === undefined) throw new Error(`malformed name-status line: "${line}"`);
    if (code.startsWith('R')) {
      const [from, path] = fields;
      if (from === undefined || path === undefined) throw new Error(`malformed rename line: "${line}"`);
      return { path, kind: 'renamed' as const, from };
    }
    const kind = STATUS_KIND[code[0] ?? ''];
    const [path] = fields;
    if (kind === undefined || path === undefined) throw new Error(`unexpected name-status code "${code}"`);
    return { path, kind };
  });
}

/**
 * git's compact rename notation puts the change inside `{old => new}`, with a
 * shared prefix and suffix outside the braces; two unrelated paths are written
 * as a bare `old => new`. Only the new (head-side) path is needed here, since
 * `parseNameStatus` already carries `from`.
 */
function headPathOf(raw: string): string {
  const open = raw.indexOf('{');
  const arrow = open === -1 ? -1 : raw.indexOf(' => ', open);
  const close = arrow === -1 ? -1 : raw.indexOf('}', arrow);
  if (open === -1 || arrow === -1 || close === -1) {
    const bareArrow = raw.indexOf(' => ');
    return bareArrow === -1 ? raw : raw.slice(bareArrow + ' => '.length);
  }
  return `${raw.slice(0, open)}${raw.slice(arrow + ' => '.length, close)}${raw.slice(close + 1)}`;
}

type NumstatEntry = { readonly path: string; readonly added?: number; readonly deleted?: number };

/** `git diff --numstat -M`: added/deleted counts, `-` for a binary file (C2: left unset, never faked as 0). */
function parseNumstat(output: string): readonly NumstatEntry[] {
  return lines(output).map((line) => {
    const [addedRaw, deletedRaw, rawPath] = line.split('\t');
    if (addedRaw === undefined || deletedRaw === undefined || rawPath === undefined) {
      throw new Error(`malformed numstat line: "${line}"`);
    }
    return {
      path: headPathOf(rawPath),
      ...(addedRaw === '-' ? {} : { added: Number(addedRaw) }),
      ...(deletedRaw === '-' ? {} : { deleted: Number(deletedRaw) }),
    };
  });
}

const HEAD_SIDE = 'b/';
const HUNK_HEADER = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/;

/** A hunk's head side; a pure deletion keeps its `+start,0`, the head line it sits after, since that is where it meets a finding (D73). */
function parseHunkHeader(line: string): Hunk | undefined {
  const match = HUNK_HEADER.exec(line);
  if (match === null) return undefined;
  const count = match[2] === undefined ? 1 : Number(match[2]);
  return match[1] === undefined ? undefined : { start: Number(match[1]), count };
}

/** `git diff -U0 -M`: the head-side hunks of each file section, keyed by its `+++` path. */
function parseHunks(output: string): ReadonlyMap<string, readonly Hunk[]> {
  const byFile = new Map<string, Hunk[]>();
  let current: string | undefined;
  for (const line of output.split('\n')) {
    if (line.startsWith('diff --git ')) {
      current = undefined;
    } else if (line.startsWith('+++ ')) {
      const target = line.slice('+++ '.length).trim();
      current = target === '/dev/null' ? undefined : target.startsWith(HEAD_SIDE) ? target.slice(HEAD_SIDE.length) : target;
    } else if (current !== undefined) {
      const hunk = parseHunkHeader(line);
      if (hunk !== undefined) {
        const list = byFile.get(current) ?? [];
        list.push(hunk);
        byFile.set(current, list);
      }
    }
  }
  return byFile;
}

/** The pure parser: three captured command outputs to the sorted `changed[]` list (D30). */
export function parseDiff(nameStatus: string, numstat: string, unified: string): readonly DiffChange[] {
  const counts = new Map(parseNumstat(numstat).map((entry) => [entry.path, entry]));
  const hunks = parseHunks(unified);
  return parseNameStatus(nameStatus)
    .map((entry): DiffChange => {
      const count = counts.get(entry.path);
      return {
        path: entry.path,
        kind: entry.kind,
        ...(entry.from === undefined ? {} : { from: entry.from }),
        added: count?.added ?? 0,
        deleted: count?.deleted ?? 0,
        hunks: hunks.get(entry.path) ?? [],
      };
    })
    .toSorted((a, b) => byPath(a.path, b.path));
}

/** How many commits the history window holds, newest first (D8). */
export const HISTORY_WINDOW = 5000;
const LOG_FORMAT = '%H%x00%ct%x00%s';
const NUL = '\0';

/** `git log --numstat --no-merges --format=%H%x00%ct%x00%s -n 5000 <head>`: one commit per header line, its files following, no blank line between a commit's last file and the next header (D8). */
export function parseLog(output: string): readonly Commit[] {
  const commits: { sha: string; time: number; subject: string; files: { path: string; added: number; deleted: number }[] }[] = [];
  for (const line of lines(output)) {
    if (line.includes(NUL)) {
      const [sha, timeRaw, subject] = line.split(NUL);
      if (sha === undefined || timeRaw === undefined || subject === undefined) {
        throw new Error(`malformed log header line: "${line}"`);
      }
      commits.push({ sha, time: Number(timeRaw), subject, files: [] });
      continue;
    }
    const current = commits.at(-1);
    if (current === undefined) throw new Error(`numstat line before any commit header: "${line}"`);
    const [addedRaw, deletedRaw, path] = line.split('\t');
    if (addedRaw === undefined || deletedRaw === undefined || path === undefined) {
      throw new Error(`malformed log numstat line: "${line}"`);
    }
    current.files.push({ path, added: addedRaw === '-' ? 0 : Number(addedRaw), deleted: deletedRaw === '-' ? 0 : Number(deletedRaw) });
  }
  return commits;
}

/** The newest `window` commits of `head`'s log, or of a range such as `<base>..HEAD`, 5,000 unless capped (D50), no author or email field anywhere (C6). */
export function readLog(repo: string, head: string, window: number = HISTORY_WINDOW): readonly Commit[] {
  return parseLog(git(repo, ['log', '--numstat', '--no-merges', `--format=${LOG_FORMAT}`, '-n', String(window), head]));
}

/**
 * `merge_base(base, head)..head`, the way GitHub shows a PR (D25); the two
 * sides scan from commits only (D46), or, under `--working-tree`, the head
 * side from `tree`, the working tree written as a tree object (D99).
 */
export function readDiff(repo: string, base: string, head: string = HEAD, tree: string = head): Diff {
  const mergeBase = git(repo, ['merge-base', base, head]).trim();
  const changed = parseDiff(
    git(repo, ['diff', '--name-status', '-M', mergeBase, tree]),
    git(repo, ['diff', '--numstat', '-M', mergeBase, tree]),
    git(repo, ['diff', '-U0', '-M', mergeBase, tree]),
  );
  return { merge_base: mergeBase, changed };
}

/**
 * The working tree as a tree object (D99): every tracked file as it is on
 * disk, staged or not, and every untracked one `git add` would take, the
 * ignored left out. It is written through a copy of the repo's index, so the
 * index the reviewer stages into is never touched; its blobs join the
 * object store unreferenced, as `git stash create`'s do. The tree's sha
 * stands for the head's everywhere a commit's would.
 */
export function workingTree(repo: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'atis-index-'));
  const index = join(dir, 'index');
  try {
    // The repo's own index carries each file's stat data, so `git add` rehashes only what changed.
    const own = resolve(repo, git(repo, ['rev-parse', '--git-path', 'index']).trim());
    if (existsSync(own)) copyFileSync(own, index);
    const env = { ...process.env, GIT_INDEX_FILE: index };
    execFileSync('git', ['add', '--all'], { cwd: repo, env, stdio: 'ignore' });
    return execFileSync('git', ['write-tree'], { cwd: repo, env, encoding: 'utf8' }).trim();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * The commit `ref` names, or undefined when it names none. A ref that starts
 * with `-` names none, since git would read it as a flag (D134).
 */
export function commitOf(repo: string, ref: string): string | undefined {
  if (ref === '' || ref.startsWith('-')) return undefined;
  try {
    return quietGit(repo, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]).trim();
  } catch {
    return undefined;
  }
}

/** How the reviewer asked for the base (D99): a ref `--base` named, or a shortcut, which counts back from the head. */
export type BaseAsked = string | { readonly last: 'commit' | 'tag' };

/** The base, resolved (D99): the ref the merge-base is taken against, and how it was typed, absent when nothing was and the trunk was taken. */
export type BaseResolved = { readonly ref: string; readonly typed?: string };

/** The branch `name`, local first and then on `origin/`, as the ref that finds it; undefined when neither exists. */
function branchOf(repo: string, name: string): string | undefined {
  if (commitOf(repo, `refs/heads/${name}`) !== undefined) return name;
  if (commitOf(repo, `refs/remotes/origin/${name}`) !== undefined) return `origin/${name}`;
  return undefined;
}

/**
 * The trunk (D99): the branch the repo's `atis.config.json` names at the head
 * (D28), else the first of `main`, `master`, `develop` and `trunk` that
 * exists, each tried locally and then on `origin/`. A configured trunk that
 * is no branch may still be any ref that names a commit. With no trunk to
 * find, the run cannot say what the change is against, so it throws (C4).
 */
export function resolveTrunk(repo: string, head: string = HEAD): string {
  const configured = configuredTrunk(showFile(repo, head, CONFIG_FILE));
  if (configured !== undefined) {
    const found = branchOf(repo, configured) ?? (commitOf(repo, configured) === undefined ? undefined : configured);
    if (found === undefined) throw new Error(`the trunk ${CONFIG_FILE} names, ${configured}, is no branch here or on origin/`);
    return found;
  }
  for (const name of TRUNK_CANDIDATES) {
    const found = branchOf(repo, name);
    if (found !== undefined) return found;
  }
  throw new Error(`no trunk: none of ${TRUNK_CANDIDATES.join(', ')} is a branch here or on origin/; name the base with --base <ref>`);
}

/**
 * The base the reviewer asked for, as a ref (D99). A ref `--base` named must
 * name a commit; `--last-commit` is the head's parent and `--last-tag` the
 * tag nearest the head among those it reaches; nothing asked takes the
 * trunk. `head` is the ref the head was asked by, `HEAD` unless `--head`
 * named another. Each that finds nothing throws, and the run exits 2 (C4).
 */
export function resolveBase(repo: string, asked: BaseAsked | undefined, head: string = HEAD): BaseResolved {
  if (asked === undefined) return { ref: resolveTrunk(repo, head) };
  if (typeof asked === 'string') {
    if (commitOf(repo, asked) === undefined) throw new Error(`--base ${asked} names no commit`);
    return { ref: asked, typed: `--base ${asked}` };
  }
  if (asked.last === 'commit') {
    const ref = `${head}~1`;
    if (commitOf(repo, ref) === undefined) throw new Error(`--last-commit: ${head} has no parent`);
    return { ref, typed: '--last-commit' };
  }
  let tag: string;
  try {
    tag = quietGit(repo, ['describe', '--tags', '--abbrev=0', head]).trim();
  } catch (error) {
    throw new Error(`--last-tag: no tag is reachable from ${head}`, { cause: error });
  }
  return { ref: tag, typed: '--last-tag' };
}

type Manifest = { readonly dependencies: ReadonlyMap<string, string>; readonly devDependencies: ReadonlyMap<string, string> };

const EMPTY_MANIFEST: Manifest = { dependencies: new Map(), devDependencies: new Map() };

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function dependencyMap(value: unknown): ReadonlyMap<string, string> {
  if (!isRecord(value)) return new Map();
  return new Map(Object.entries(value).flatMap(([name, range]) => (typeof range === 'string' ? [[name, range] as const] : [])));
}

/** A manifest that will not parse names no dependencies: it is terrain like any other, never faked (C2). */
function parseManifest(content: string): Manifest {
  try {
    const value: unknown = JSON.parse(content);
    return isRecord(value)
      ? { dependencies: dependencyMap(value['dependencies']), devDependencies: dependencyMap(value['devDependencies']) }
      : EMPTY_MANIFEST;
  } catch {
    return EMPTY_MANIFEST;
  }
}

/** What the head did to the manifests: the dependencies it added (D47), and the ones whose range it moved (D83). */
export type ManifestDelta = { readonly deps_added: readonly DepAdded[]; readonly deps_moved: readonly DepMoved[] };

/**
 * The pure parser: two manifest texts (either may be absent, a package born
 * or removed) to what `HEAD` added (D47) and which ranges it moved, each with
 * the range it moved `from` (D83). A dependency that only changed lists is
 * new to the list it joined, and moved nowhere.
 */
export function diffManifests(manifest: string, before: string | undefined, after: string | undefined): ManifestDelta {
  const from = before === undefined ? EMPTY_MANIFEST : parseManifest(before);
  const to = after === undefined ? EMPTY_MANIFEST : parseManifest(after);
  const added: DepAdded[] = [];
  const moved: DepMoved[] = [];
  const compare = (was: ReadonlyMap<string, string>, now: ReadonlyMap<string, string>, dev: boolean): void => {
    for (const [name, range] of now) {
      const old = was.get(name);
      if (old === undefined) added.push({ manifest, name, range, dev });
      else if (old !== range) moved.push({ manifest, name, range, from: old, dev });
    }
  };
  compare(from.dependencies, to.dependencies, false);
  compare(from.devDependencies, to.devDependencies, true);
  return { deps_added: added.toSorted((a, b) => byPath(a.name, b.name)), deps_moved: moved.toSorted((a, b) => byPath(a.name, b.name)) };
}

function directoriesOf(paths: Iterable<string>): ReadonlySet<string> {
  const dirs = new Set<string>(['']);
  for (const path of paths) {
    const segments = path.split('/');
    segments.pop();
    let current = '';
    for (const segment of segments) {
      current = current === '' ? segment : `${current}/${segment}`;
      dirs.add(current);
    }
  }
  return dirs;
}

/**
 * The workspace globs at `sha`: `pnpm-workspace.yaml`'s when the file exists,
 * since pnpm never reads `workspaces`, else the root manifest's `workspaces`
 * (D43, D64), the same order the scan reads them in.
 */
function workspaceGlobs(repo: string, sha: string, files: ReadonlySet<string>): readonly string[] {
  if (files.has(WORKSPACE_FILE)) return parseWorkspaceGlobs(showFile(repo, sha, WORKSPACE_FILE) ?? '');
  if (files.has(MANIFEST)) return parseManifestWorkspaces(showFile(repo, sha, MANIFEST) ?? '');
  return [];
}

/** The workspace member directories at `sha`: the root, plus every directory the workspace globs match (D43, D64). */
function memberDirs(repo: string, sha: string, files: ReadonlySet<string>): readonly string[] {
  const globs = workspaceGlobs(repo, sha, files);
  const include = globs.filter((glob) => !glob.startsWith('!')).map(globToRegExp);
  const exclude = globs.filter((glob) => glob.startsWith('!')).map((glob) => globToRegExp(glob.slice(1)));
  const matched = [...directoriesOf(files)].filter(
    (dir) => dir !== '' && include.some((rule) => rule.test(dir)) && !exclude.some((rule) => rule.test(dir)),
  );
  return ['.', ...matched.toSorted(byPath)];
}

/** Every workspace `package.json` path at `sha`, read from the tracked tree, never a working copy (D46). */
function manifestPaths(repo: string, sha: string): readonly string[] {
  const files = new Set(lines(git(repo, ['ls-tree', '-r', '--name-only', sha])));
  return memberDirs(repo, sha, files).flatMap((dir) => {
    const path = dir === '.' ? MANIFEST : `${dir}/${MANIFEST}`;
    return files.has(path) ? [path] : [];
  });
}

/**
 * Every workspace manifest at `mergeBase` and at the head (D46), diffed into
 * `deps_added[]` (D47) and `deps_moved[]` (D83). Handed the paths the diff
 * touched, it reads only the manifests among them: one the change left alone
 * says at the head what it said at the base, so it adds and moves nothing,
 * and a change that touched none is read without asking git anything.
 */
export function readManifests(repo: string, mergeBase: string, touched?: readonly string[], head: string = HEAD): ManifestDelta {
  const named = touched === undefined ? undefined : new Set(touched.filter((path) => path === MANIFEST || path.endsWith(`/${MANIFEST}`)));
  if (named?.size === 0) return { deps_added: [], deps_moved: [] };
  const paths = [...new Set([...manifestPaths(repo, mergeBase), ...manifestPaths(repo, head)])].filter((path) => named?.has(path) ?? true);
  const deltas = [...paths].map((path) => diffManifests(path, showFile(repo, mergeBase, path), showFile(repo, head, path)));
  const order = (a: DepAdded, b: DepAdded): number => byPath(a.manifest, b.manifest) || byPath(a.name, b.name);
  return {
    deps_added: deltas.flatMap((delta) => delta.deps_added).toSorted(order),
    deps_moved: deltas.flatMap((delta) => delta.deps_moved).toSorted(order),
  };
}
