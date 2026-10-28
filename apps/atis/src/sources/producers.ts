/**
 * producers: every language a commit holds, read into one scan (D114).
 *
 * A producer claims files by their extension, and a file belongs to the first
 * producer that claims it. Every producer whose files a commit tracks runs and
 * reads them into the scan's parts: each file with its kind and, where the
 * language has one, its directory's barrel; the edges between them; the
 * members they belong to; and how their entry points were looked up. The parts
 * merge into one `Scan`, every other tracked file listed as `other`, so core
 * reads no language's rules. A producer `atis.config.json` switches off, or one
 * that cannot run here, reads nothing: its files stay where the shore table
 * puts them, and the scan says which producer and why (C2).
 *
 * TypeScript is the first producer. Another language is a module of its own
 * beside it and one more entry in `PRODUCERS`, never a change to core.
 */

import { resolve } from 'node:path';

import type { EntryPointLookup, UnreadProducer } from 'core';

import { TYPESCRIPT_EXTENSIONS, fallowEntryPoints, readTypeScript } from './imports.js';
import type { EntryPoints, ParsedFiles, Prior } from './imports.js';
import { gitTree, walk } from './scan.js';
import type { Scan, ScannedFile, Tree } from './scan.js';

/**
 * What a producer reads a commit through: the tree, the files of it the
 * producer claims, in path order, what an earlier read of an earlier commit
 * left for it to reuse (D136), and the reviewed repo's own entry points for
 * the tree, asked only by a producer that wants them (D22).
 */
export type ProducerInput = {
  readonly tree: Tree;
  readonly files: readonly string[];
  readonly prior?: Prior | undefined;
  readonly entryPoints: () => EntryPoints;
};

/** What a producer read: the scan of its own files, what it parsed from each for a later read to reuse, and the entry points it asked for. */
export type Produced = { readonly scan: Scan; readonly parsed: ParsedFiles; readonly entryPoints?: EntryPoints };

/** One language's reader of a commit (D114). */
export type Producer = {
  /** The id `atis.config.json` switches it by, and the one `meta.instruments.unread` names it by. */
  readonly id: string;
  /** The extensions it claims, each with its dot. */
  readonly extensions: readonly string[];
  /** Why it cannot run here, a toolchain missing; nothing when it can. */
  readonly unavailable: () => string | undefined;
  readonly read: (input: ProducerInput) => Produced;
};

/** The TypeScript producer: the compiler it parses with ships with atis (C9), so it can always run. */
const TYPESCRIPT: Producer = {
  id: 'typescript',
  extensions: TYPESCRIPT_EXTENSIONS,
  unavailable: () => undefined,
  read: ({ tree, files, prior, entryPoints }) => readTypeScript(tree, files, prior, entryPoints),
};

/** Every producer atis runs, in the order a file's extension is offered to them. */
export const PRODUCERS: readonly Producer[] = [TYPESCRIPT];

/** Why a producer `atis.config.json` switched off read nothing. */
const SWITCHED_OFF = 'switched off in atis.config.json';

/** The entry-point lookup of a tree no producer read. */
const NONE_READ: EntryPointLookup = { source: 'manifests', reason: 'no producer read the tree' };

export type ScanOptions = {
  /**
   * Where the reviewed repo's own fallow is installed (D22). An extracted
   * commit carries no `node_modules`, so the binary is looked for here while
   * the scan itself stays on `dir`. Defaults to `dir`.
   */
  readonly repo?: string;
  /** What a scan of an earlier commit read from each file, and the paths the diff since then touched (D136). */
  readonly prior?: Prior;
  /** The producers `atis.config.json` switches off, by id (D114). */
  readonly off?: readonly string[];
  /** The producers to run, `PRODUCERS` unless a test hands its own. */
  readonly producers?: readonly Producer[];
};

/** How a commit is read from git's objects (D172). */
export type CommitOptions = Omit<ScanOptions, 'repo' | 'prior'> & {
  /** The reviewed repository, which holds the commit's objects and its own fallow (D22). */
  readonly repo: string;
  readonly prior?: Prior | undefined;
  /** fallow's entry points for this commit, kept from an earlier run (D136); fallow lists them afresh when absent. */
  readonly entryPoints?: EntryPoints | undefined;
  /** The commit extracted whole, made only when the reviewed repo's fallow has to list its entry points from one. */
  readonly extracted: () => string;
};

/** A scan, what its producers read from each file to make it, and the entry points fallow named for it, or why none did. */
export type ScannedTree = { readonly scan: Scan; readonly parsed: ParsedFiles; readonly entryPoints: EntryPoints };

/** One producer's scan of the files it claims, under its id. */
export type ProducerScan = { readonly producer: string; readonly scan: Scan };

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * The producers an `atis.config.json` switches off, each checked against the
 * ones atis runs: an id that names none is a typo the run would otherwise
 * ignore, so it throws as misuse (C4).
 */
export function producersOff(ids: readonly string[], producers: readonly Producer[] = PRODUCERS): readonly string[] {
  const known = new Set(producers.map((producer) => producer.id));
  const unknown = ids.filter((id) => !known.has(id));
  if (unknown.length > 0) {
    throw new Error(`atis.config.json switches off ${unknown.join(', ')}, which names no producer; the producers are ${[...known].join(', ')}`);
  }
  return ids;
}

/** A tracked file no producer read: `other`, with nothing read from it (C2). */
function unclaimed(path: string): ScannedFile {
  return { path, loc: 0, kind: 'other', exports: [], shapes: {}, inferred: [], code: [], packages: [], functions: [] };
}

/**
 * How the merged scan's entry points were looked up: one producer's lookup as
 * it said it; fallow only when every producer's was; else the manifests, with
 * each producer's reason under its id; and a tree no producer read, said so.
 */
function lookupOf(read: readonly ProducerScan[]): EntryPointLookup {
  const [only] = read;
  if (only === undefined) return NONE_READ;
  if (read.length === 1) return only.scan.entry_points;
  const reasons = read.flatMap(({ producer, scan }) => (scan.entry_points.source === 'manifests' ? [`${producer}: ${scan.entry_points.reason}`] : []));
  return reasons.length === 0 ? { source: 'fallow' } : { source: 'manifests', reason: reasons.join('; ') };
}

/**
 * Merge the producers' scans into one over every tracked path (D114): each
 * file as the producer that read it gave it, every other path `other`, in
 * `paths`' order; every producer's edges, sorted as one; their members in
 * producer order; one entry-point lookup; and the producers that read nothing,
 * absent when none. Pure, so the merge is tested from scans built by hand (D30).
 */
export function mergeScans(paths: readonly string[], read: readonly ProducerScan[], unread: readonly UnreadProducer[]): Scan {
  const files = new Map(read.flatMap(({ scan }) => scan.files.map((file) => [file.path, file] as const)));
  return {
    files: paths.map((path) => files.get(path) ?? unclaimed(path)),
    edges: read.flatMap(({ scan }) => scan.edges).toSorted((a, b) => byPath(a.from, b.from) || a.line - b.line || byPath(a.to, b.to)),
    members: read.flatMap(({ scan }) => scan.members),
    entry_points: lookupOf(read),
    ...(unread.length === 0 ? {} : { unread }),
  };
}

type Run = { readonly prior?: Prior | undefined; readonly entryPoints: () => EntryPoints; readonly off?: readonly string[]; readonly producers?: readonly Producer[] };

/**
 * Run every producer whose files `tree` tracks and merge what they read: a
 * file goes to the first producer claiming its extension, and a producer
 * switched off or unable to run reads nothing and says why.
 */
function scanTree(tree: Tree, run: Run): ScannedTree {
  const producers = run.producers ?? PRODUCERS;
  const off = new Set(run.off ?? []);
  const claimed = new Map<Producer, string[]>();
  for (const path of tree.files) {
    const producer = producers.find((each) => each.extensions.some((extension) => path.endsWith(extension)));
    if (producer === undefined) continue;
    const files = claimed.get(producer);
    if (files === undefined) claimed.set(producer, [path]);
    else files.push(path);
  }
  const read: ProducerScan[] = [];
  const unread: UnreadProducer[] = [];
  const parsed: Record<string, ParsedFiles[string]> = {};
  let entryPoints: EntryPoints | undefined;
  for (const producer of producers) {
    const files = claimed.get(producer);
    if (files === undefined) continue;
    const reason = off.has(producer.id) ? SWITCHED_OFF : producer.unavailable();
    if (reason !== undefined) {
      unread.push({ producer: producer.id, reason });
      continue;
    }
    const produced = producer.read({ tree, files, prior: run.prior, entryPoints: run.entryPoints });
    read.push({ producer: producer.id, scan: produced.scan });
    Object.assign(parsed, produced.parsed);
    entryPoints ??= produced.entryPoints;
  }
  const scan = mergeScans(tree.files, read, unread);
  return { scan, parsed, entryPoints: entryPoints ?? { entries: [], lookup: scan.entry_points } };
}

/**
 * Read one extracted commit into the files, edges and members `buildMap` needs.
 * `dir` is the extraction; `options.repo` is the working tree its fallow lives
 * in, when the reviewed repo has one.
 */
export function scanImports(dir: string, options: ScanOptions = {}): Scan {
  return readTree(dir, options).scan;
}

/**
 * `scanImports`, with what each producer read from each file beside the scan,
 * for a later commit's scan to reuse. Handed an earlier commit's, a producer
 * reads only the files the diff touched and links the tree the same way, so
 * its scan is the one a full read would give (D136).
 */
export function readTree(dir: string, options: ScanOptions = {}): ScannedTree {
  const root = resolve(dir);
  return scanTree(walk(root), { ...options, entryPoints: () => fallowEntryPoints(() => root, options.repo ?? dir) });
}

/**
 * `readTree` of a commit read from git's own objects rather than an
 * extraction of it (D172). Its scan is the one an extraction's would be: the
 * same files and directories, and the bytes of each it reads.
 */
export function readCommit(sha: string, options: CommitOptions): ScannedTree {
  const { repo, entryPoints, extracted } = options;
  return scanTree(gitTree(repo, sha), { ...options, entryPoints: () => entryPoints ?? fallowEntryPoints(extracted, repo) });
}
