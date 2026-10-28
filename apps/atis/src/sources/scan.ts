/**
 * scan: the shape every language producer reads a commit into, and the tree
 * it reads the commit through (D114).
 *
 * A commit is read whole, from an extraction or from git's own objects
 * (D172), as one `Tree`: every tracked file in path order and each file's
 * text on demand. Each producer reads the files it claims out of it into the
 * scan's parts, and the parts merge into one `Scan`, the shape core's own
 * `Scan` declares, so another language is a producer and never a change to
 * core.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import type { CodeSpan, EntryPointLookup, ExportShapes, FileKind, PassedName, ScanFunction, UnreadProducer } from 'core';

const SKIPPED_DIRECTORIES = new Set(['.git', 'node_modules']);
/** How much `git` may print in one go: a whole commit's listing, or the files a scan draws out of it. */
const GIT_BYTES = 1024 * 1024 * 1024;
/** How many paths one `git archive` is handed, so its command line stays well inside the system's limit. */
const ARCHIVE_PATHS = 500;
/** The tar block, and the git modes of a symbolic link and of a submodule. */
const TAR_BLOCK = 512;
const SYMLINK_MODE = '120000';

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * A tracked file of the scanned commit. `loc` counts the non-blank lines its
 * producer parsed; `kind` is what its producer made of it, and `other` for a
 * file no producer read (D114). `barrel` marks the file its directory is
 * entered through, where the language has one.
 */
export type ScannedFile = {
  readonly path: string;
  readonly loc: number;
  readonly kind: FileKind;
  readonly barrel?: boolean;
  readonly exports: readonly string[];
  /** Beside each exported name, its declared shape, or `null` where it cannot be compared (D76). */
  readonly shapes: ExportShapes;
  /** The exported names whose type `isolatedDeclarations` flagged as inferred: the ones only the checker can print (D118). */
  readonly inferred: readonly string[];
  /** The lines of each statement that leaves JavaScript behind once its types are stripped, which is what a coverage report measures (D80, D141). */
  readonly code: readonly CodeSpan[];
  /** The outside packages it imports, by package name and sorted: never a workspace member or a Node built-in (D170). */
  readonly packages: readonly string[];
  /** Every named function it holds, at any depth, by the line it starts on (D102); none for a file no producer parses. */
  readonly functions: readonly ScanFunction[];
};

/**
 * One resolved dependency: `from` takes `names` out of `to`, at `line` of
 * `from`. An `export … from`, `export *` or `export type *` is marked with the
 * names it passes on and the names it gives them (D75).
 */
export type ScannedEdge = {
  readonly from: string;
  readonly to: string;
  readonly names: readonly string[];
  readonly line: number;
  readonly reexports?: readonly PassedName[];
};

/**
 * A workspace member (D43): its package name, its directory and its entry
 * points, whether its manifest publishes it, and the source files its
 * `exports`, `main`, `types` and `module` name, which is where its public
 * names start (D75).
 */
export type ScannedMember = {
  readonly name: string;
  readonly dir: string;
  readonly entry: readonly string[];
  readonly published: boolean;
  readonly surface: readonly string[];
};

/**
 * One commit, every producer's read of it merged (D114): every tracked file,
 * the edges and members the producers found, how the entry points were
 * looked up, and the producers that left their files unread, and why.
 */
export type Scan = {
  readonly files: readonly ScannedFile[];
  readonly edges: readonly ScannedEdge[];
  readonly members: readonly ScannedMember[];
  /** Whether fallow named the entry points or the manifests had to alone, and why (C2). */
  readonly entry_points: EntryPointLookup;
  /** The producers that left the files they claim on the shore, and why; absent when every one the tree needs ran (C2). */
  readonly unread?: readonly UnreadProducer[];
};

/**
 * A commit's files as a producer reads them: every file in path order, every
 * directory, a file's text by its path, and a way to draw out many files at
 * once before they are read. `root` is where a producer is told the files
 * stand; it reads none of them but through `read`.
 */
export type Tree = {
  readonly root: string;
  readonly files: readonly string[];
  readonly directories: ReadonlySet<string>;
  readonly read: (path: string) => string;
  readonly want?: (paths: readonly string[]) => void;
};

/** Every file of the extraction, sorted; an archive holds exactly the tracked ones (D43). */
export function walk(root: string): Tree {
  const files: string[] = [];
  const directories = new Set<string>(['']);
  const pending: string[] = [''];
  for (let current = pending.pop(); current !== undefined; current = pending.pop()) {
    for (const entry of readdirSync(join(root, current), { withFileTypes: true })) {
      const path = current === '' ? entry.name : `${current}/${entry.name}`;
      if (entry.isDirectory()) {
        if (SKIPPED_DIRECTORIES.has(entry.name)) continue;
        directories.add(path);
        pending.push(path);
      } else if (entry.isFile()) files.push(path);
    }
  }
  return { root, files: files.toSorted(byPath), directories, read: (path) => readFileSync(join(root, path), 'utf8') };
}

function gitBytes(repo: string, args: readonly string[], input?: string): Buffer {
  return execFileSync('git', ['--literal-pathspecs', ...args], {
    cwd: repo,
    maxBuffer: GIT_BYTES,
    stdio: ['pipe', 'pipe', 'pipe'],
    ...(input === undefined ? {} : { input }),
  });
}

/** The text of a NUL-terminated field of a tar header. */
function tarField(header: Buffer, start: number, length: number): string {
  const raw = header.subarray(start, start + length);
  const end = raw.indexOf(0);
  return raw.subarray(0, end === -1 ? length : end).toString('utf8');
}

/** The `path` a pax extended header gives the entry after it: records of `<length> <key>=<value>\n`. */
function paxPath(body: Buffer): string | undefined {
  let path: string | undefined;
  for (let at = 0; at < body.length; ) {
    const space = body.indexOf(0x20, at);
    const length = Number(body.subarray(at, space).toString('utf8'));
    if (space === -1 || !Number.isInteger(length) || length <= 0) break;
    const record = body.subarray(space + 1, at + length - 1).toString('utf8');
    const equals = record.indexOf('=');
    if (record.slice(0, equals) === 'path') path = record.slice(equals + 1);
    at += length;
  }
  return path;
}

/** The regular files of a tar archive by path, as `git archive` writes one: ustar headers, a long path in a pax header before its entry. */
function untar(tar: Buffer): ReadonlyMap<string, string> {
  const files = new Map<string, string>();
  let long: string | undefined;
  for (let at = 0; at + TAR_BLOCK <= tar.length; ) {
    const header = tar.subarray(at, at + TAR_BLOCK);
    if (header.every((byte) => byte === 0)) break;
    const size = Number.parseInt(tarField(header, 124, 12).trim() || '0', 8);
    const type = String.fromCodePoint(header[156] ?? 0);
    const body = tar.subarray(at + TAR_BLOCK, at + TAR_BLOCK + size);
    at += TAR_BLOCK + Math.ceil(size / TAR_BLOCK) * TAR_BLOCK;
    if (type === 'x') {
      long = paxPath(body);
      continue;
    }
    if (type === 'g') continue;
    const prefix = tarField(header, 345, 155);
    const name = tarField(header, 0, 100);
    const path = long ?? (prefix === '' ? name : `${prefix}/${name}`);
    long = undefined;
    if (type === '0' || type === '\0') files.set(path, body.toString('utf8'));
  }
  return files;
}

/** Whether a path lies under a directory an extraction's walk never enters. */
function skipped(path: string, directory: boolean): boolean {
  const parts = path.split('/');
  return (directory ? parts : parts.slice(0, -1)).some((part) => SKIPPED_DIRECTORIES.has(part));
}

/**
 * The paths `git archive` leaves out of `sha`: every one whose
 * `export-ignore` attribute is set, read from the commit's own attributes as
 * the archive reads them, and everything beneath a directory that is.
 */
function exportIgnored(repo: string, sha: string, paths: readonly string[]): (path: string) => boolean {
  const said = gitBytes(repo, ['check-attr', `--source=${sha}`, '-z', '--stdin', 'export-ignore'], `${paths.join('\0')}\0`).toString('utf8').split('\0');
  const ignored = new Set<string>();
  for (let at = 0; at + 2 < said.length; at += 3) {
    if (said[at + 2] === 'set') ignored.add(said[at] ?? '');
  }
  if (ignored.size === 0) return () => false;
  return (path) => {
    for (let at = path; at !== ''; at = at.slice(0, Math.max(at.lastIndexOf('/'), 0))) {
      if (ignored.has(at)) return true;
    }
    return false;
  };
}

/**
 * A commit read from git's own objects rather than an extraction (D172): the
 * files and directories the archive of `sha` would hold, listed from the
 * commit, and each file the scan reads drawn out of `git archive` of that file
 * alone, so its bytes are the ones an extraction holds, every attribute the
 * archive applies applied. `want` draws out many at once.
 */
export function gitTree(repo: string, sha: string): Tree {
  const listed = gitBytes(repo, ['ls-tree', '-r', '-t', '-z', '--full-tree', sha])
    .toString('utf8')
    .split('\0')
    .filter((line) => line !== '')
    .map((line) => {
      const tab = line.indexOf('\t');
      const [mode = '', type = ''] = line.slice(0, tab).split(' ');
      return { mode, type, path: line.slice(tab + 1) };
    });
  const ignored = exportIgnored(repo, sha, listed.map((entry) => entry.path));
  const kept = listed.filter((entry) => !ignored(entry.path));
  const files = kept.filter((entry) => entry.type === 'blob' && entry.mode !== SYMLINK_MODE && !skipped(entry.path, false)).map((entry) => entry.path);
  const directories = new Set(['', ...kept.filter((entry) => entry.type !== 'blob' && !skipped(entry.path, true)).map((entry) => entry.path)]);

  const drawn = new Map<string, string>();
  const want = (paths: readonly string[]): void => {
    const missing = [...new Set(paths)].filter((path) => !drawn.has(path));
    for (let at = 0; at < missing.length; at += ARCHIVE_PATHS) {
      const chunk = missing.slice(at, at + ARCHIVE_PATHS);
      for (const [path, content] of untar(gitBytes(repo, ['archive', '--format=tar', sha, '--', ...chunk]))) drawn.set(path, content);
    }
  };
  const read = (path: string): string => {
    if (!drawn.has(path)) want([path]);
    const content = drawn.get(path);
    if (content === undefined) throw new Error(`${path} is not a file of ${sha}`);
    return content;
  };
  return { root: resolve(repo), files: files.toSorted(byPath), directories, read, want };
}
