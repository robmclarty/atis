/**
 * git: the change itself. `readDiff` computes the merge-base (D25) and turns
 * `git diff --name-status`, `--numstat` and `-U0` between it and `HEAD`
 * (D46) into `changed[]`; `readManifests` reads every workspace `package.json`
 * at both ends of the diff and `diffManifests` turns two manifests into the
 * dependencies `HEAD` added (D47). Each split into a thin runner that shells
 * out and a pure parser tested from captured text (D30).
 */

import { execFileSync } from 'node:child_process';

import type { ChangeKind, DepAdded, Hunk } from 'core';

import { globToRegExp, parseWorkspaceGlobs } from './imports.js';

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

/** `undefined` when `path` does not exist at `sha`, never a thrown error (C2). */
function showFile(repo: string, sha: string, path: string): string | undefined {
  try {
    return git(repo, ['show', `${sha}:${path}`]);
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

function parseHunkHeader(line: string): Hunk | undefined {
  const match = HUNK_HEADER.exec(line);
  if (match === null) return undefined;
  const count = match[2] === undefined ? 1 : Number(match[2]);
  return count === 0 || match[1] === undefined ? undefined : { start: Number(match[1]), count };
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

/** `merge_base(base, HEAD)..HEAD`, the way GitHub shows a PR (D25); the two sides scan from commits only (D46). */
export function readDiff(repo: string, base: string): Diff {
  const mergeBase = git(repo, ['merge-base', base, HEAD]).trim();
  const changed = parseDiff(
    git(repo, ['diff', '--name-status', '-M', mergeBase, HEAD]),
    git(repo, ['diff', '--numstat', '-M', mergeBase, HEAD]),
    git(repo, ['diff', '-U0', '-M', mergeBase, HEAD]),
  );
  return { merge_base: mergeBase, changed };
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

/** The pure parser: two manifest texts (either may be absent, a package born or removed) to what `HEAD` added (D47). */
export function diffManifests(manifest: string, before: string | undefined, after: string | undefined): readonly DepAdded[] {
  const from = before === undefined ? EMPTY_MANIFEST : parseManifest(before);
  const to = after === undefined ? EMPTY_MANIFEST : parseManifest(after);
  const added: DepAdded[] = [];
  for (const [name, range] of to.dependencies) {
    if (!from.dependencies.has(name)) added.push({ manifest, name, range, dev: false });
  }
  for (const [name, range] of to.devDependencies) {
    if (!from.devDependencies.has(name)) added.push({ manifest, name, range, dev: true });
  }
  return added.toSorted((a, b) => byPath(a.name, b.name));
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

/** The workspace member directories at `sha`: `pnpm-workspace.yaml`'s globs, else the root alone (D43). */
function memberDirs(repo: string, sha: string, files: ReadonlySet<string>): readonly string[] {
  const yaml = showFile(repo, sha, WORKSPACE_FILE);
  const globs = yaml === undefined ? [] : parseWorkspaceGlobs(yaml);
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

/** Every workspace manifest at `mergeBase` and at `HEAD` (D46), diffed into `deps_added[]` (D47). */
export function readManifests(repo: string, mergeBase: string): readonly DepAdded[] {
  const paths = new Set([...manifestPaths(repo, mergeBase), ...manifestPaths(repo, HEAD)]);
  return [...paths]
    .flatMap((path) => diffManifests(path, showFile(repo, mergeBase, path), showFile(repo, HEAD, path)))
    .toSorted((a, b) => byPath(a.manifest, b.manifest) || byPath(a.name, b.name));
}
