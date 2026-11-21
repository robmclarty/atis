/**
 * tree: the folder tree the chrome's column draws (D208 (side-panels)),
 * folded from the paths the map lists: every file on the map, and every file
 * the shore's groups hold, which is not on the map, each under the
 * directories its path names. A row names what it selects on the map by its
 * target, as the line writes one (D209 (selection-line)): a file's id, or
 * the cell whose path is the directory; a shore file has none, and names its
 * group instead. A row wears what the map marks it with: its change, a
 * ghost, the notices on it by rank, and how far its module departs from the
 * approved shape. A directory counts what stands beneath it, so a closed one
 * can wear what it hides (D277 (closed-wears-hidden)), and a chain of
 * directories that each hold one directory and nothing else is one row
 * (D276 (chain-row)). Pure: no DOM, no React, so a test reads the tree
 * straight.
 */

import { noticeAnchors } from 'scene';
import type { Cell, ChangeKind, Departure, MapJson } from 'core';

import type { Marked } from './notices.js';

/** The path of the repo's own root, as a cell there writes it. */
const ROOT = '.';

/** What a row wears of its own: its change, whether it is a ghost, the notices on it in rank order, and its module's departures from the approved shape. */
type Badges = {
  readonly change?: ChangeKind;
  readonly ghost: boolean;
  readonly notices: readonly Marked[];
  readonly departures: number;
};

/** What stands at and beneath a directory: every file listed, those of them on the map, the changed, those of the changed on the map, the ghosts, every notice in rank order, and every departure. */
export type Counts = {
  readonly files: number;
  readonly placed: number;
  readonly changed: number;
  readonly changedOnMap: number;
  readonly ghosts: number;
  readonly notices: readonly Marked[];
  readonly departures: number;
};

type Named = {
  /** The row's path from the repo's root, which names the row. */
  readonly path: string;
  /** What the row is written as: its path below the row that holds it. */
  readonly name: string;
  readonly badges: Badges;
};

/** A directory; its target is the module standing at its path, when one does. */
export type DirectoryNode = Named & { readonly kind: 'directory'; readonly target?: string; readonly children: readonly TreeNode[]; readonly counts: Counts };

/** A file on the map. */
export type FileNode = Named & { readonly kind: 'file'; readonly target: string };

/** A file the map lists beside the terrain, in a shore group: not on the map, so it has no target. */
export type ShoreNode = Named & { readonly kind: 'shore'; readonly group: string };

export type TreeNode = DirectoryNode | FileNode | ShoreNode;

/** The approved shape as the tree's header says it: the head it was approved at, and how many departures the map holds. */
type Approval = { readonly at: string; readonly departures: number };

export type TreeModel = {
  /** The rows at the top: the repo's root where a module stands at it, else what the root holds. */
  readonly roots: readonly TreeNode[];
  /** The row each target lights, by its path: a file's id, and every cell's id, a single file's module among them. */
  readonly index: ReadonlyMap<string, string>;
  /** The row that holds each row, by path; none for a row at the top. */
  readonly parents: ReadonlyMap<string, string>;
  /** Everything the tree lists. */
  readonly counts: Counts;
  /** None where no shape was approved (D210 (approved-block)). */
  readonly approved?: Approval;
};

/** One row as it is drawn: a node, and how deep it stands. */
export type TreeRow = { readonly node: TreeNode; readonly depth: number };

type Leaf = { readonly path: string; readonly name: string } & ({ readonly kind: 'file'; readonly target: string } | { readonly kind: 'shore'; readonly group: string });

type Dir = { readonly path: string; readonly name: string; readonly dirs: Map<string, Dir>; readonly leaves: Leaf[] };

/** What the map marks, each by the path of the row that wears it. */
type Marks = {
  readonly changes: ReadonlyMap<string, ChangeKind>;
  readonly ghosts: ReadonlySet<string>;
  readonly notices: ReadonlyMap<string, readonly Marked[]>;
  readonly departures: ReadonlyMap<string, number>;
  /** The module standing at each directory. */
  readonly targets: ReadonlyMap<string, string>;
};

function byName(a: { readonly name: string }, b: { readonly name: string }): number {
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

const byRank = (a: Marked, b: Marked): number => a.rank - b.rank;

const below = (dir: string, name: string): string => (dir === ROOT ? name : `${dir}/${name}`);

/** The directory above a path; the root's own for a path at the top, and none above the root. */
const above = (path: string): string | undefined => {
  if (path === ROOT) return undefined;
  const cut = path.lastIndexOf('/');
  return cut < 0 ? ROOT : path.slice(0, cut);
};

/** Every listed file under the directories its path names: the map's files first, so a path listed twice is the map's. */
const foldPaths = (map: MapJson): Dir => {
  const root: Dir = { path: ROOT, name: ROOT, dirs: new Map(), leaves: [] };
  const seen = new Set<string>();
  const place = (path: string, leaf: (name: string) => Leaf): void => {
    if (seen.has(path)) return;
    seen.add(path);
    const names = path.split('/');
    const last = names.pop() ?? path;
    let dir = root;
    for (const name of names) {
      const held: Dir = dir.dirs.get(name) ?? { path: below(dir.path, name), name, dirs: new Map(), leaves: [] };
      dir.dirs.set(name, held);
      dir = held;
    }
    dir.leaves.push(leaf(last));
  };
  for (const file of map.terrain.organelles) place(file.path, (name) => ({ kind: 'file', path: file.path, name, target: file.id }));
  for (const group of map.terrain.groups) for (const path of group.files) place(path, (name) => ({ kind: 'shore', path, name, group: group.id }));
  return root;
};

/** Every path a row could stand at, each with whether it is a directory's. */
const standing = (root: Dir): ReadonlyMap<string, 'directory' | 'leaf'> => {
  const paths = new Map<string, 'directory' | 'leaf'>();
  const walk = (dir: Dir): void => {
    paths.set(dir.path, 'directory');
    for (const leaf of dir.leaves) paths.set(leaf.path, 'leaf');
    for (const held of dir.dirs.values()) walk(held);
  };
  walk(root);
  return paths;
};

/**
 * The module a directory's row selects (D275 (tree-row-target)): where a
 * package and a directory share the path, the package, the outer body
 * (D218 (departure-cell)); the loose files at its root are rows of their own
 * beneath it.
 */
const moduleAt = (cells: readonly Cell[]): Cell | undefined => cells.find((cell) => cell.kind === 'package') ?? cells[0];

/** The nearest row still standing at a path or above it, where a module that is gone once stood; none where nothing above it has a row. */
const standingAt = (paths: ReadonlyMap<string, 'directory' | 'leaf'>, rooted: boolean, from: string): string | undefined => {
  let path: string | undefined = from;
  while (path !== undefined && (path === ROOT ? !rooted : !paths.has(path))) path = above(path);
  return path;
};

/** How many departures each row wears (D283 (lost-departure)): a module's own on its row, and a module that is gone on the nearest row still standing; an outside package's on none, which the header's count alone holds. */
const departuresOn = (departures: readonly Departure[], index: ReadonlyMap<string, string>, lost: (path: string) => string | undefined): ReadonlyMap<string, number> => {
  const held = new Map<string, number>();
  for (const departure of departures) {
    if (departure.kind === 'dependency-added') continue;
    const row = (departure.cell === undefined ? undefined : index.get(departure.cell)) ?? lost(departure.target);
    if (row !== undefined) held.set(row, (held.get(row) ?? 0) + 1);
  }
  return held;
};

/** The notices each row wears, in rank order: a file's and a module's on its row, and a shore file's on its own. */
const noticesOn = (map: MapJson, index: ReadonlyMap<string, string>, paths: ReadonlyMap<string, 'directory' | 'leaf'>): ReadonlyMap<string, readonly Marked[]> => {
  const held = new Map<string, Marked[]>();
  for (const { rank, notice } of noticeAnchors(map)) {
    const row = index.get(notice.target) ?? (paths.get(notice.target) === 'leaf' ? notice.target : undefined);
    if (row === undefined) continue;
    const marks = held.get(row) ?? [];
    marks.push({ rank, tier: notice.tier });
    held.set(row, marks);
  }
  return held;
};

const badgesOf = (path: string, marks: Marks): Badges => {
  const change = marks.changes.get(path);
  return {
    ...(change === undefined ? {} : { change }),
    ghost: change === undefined && marks.ghosts.has(path),
    notices: marks.notices.get(path) ?? [],
    departures: marks.departures.get(path) ?? 0,
  };
};

const NONE: Counts = { files: 0, placed: 0, changed: 0, changedOnMap: 0, ghosts: 0, notices: [], departures: 0 };

const sum = (a: Counts, b: Counts): Counts => ({
  files: a.files + b.files,
  placed: a.placed + b.placed,
  changed: a.changed + b.changed,
  changedOnMap: a.changedOnMap + b.changedOnMap,
  ghosts: a.ghosts + b.ghosts,
  notices: [...a.notices, ...b.notices],
  departures: a.departures + b.departures,
});

/** What one row counts for: a file for itself and its marks, a directory for all it holds and its own marks. */
const countsOf = (node: TreeNode): Counts => {
  if (node.kind === 'directory') return node.counts;
  const placed = node.kind === 'file' ? 1 : 0;
  const changed = node.badges.change === undefined ? 0 : 1;
  return { files: 1, placed, changed, changedOnMap: placed * changed, ghosts: node.badges.ghost ? 1 : 0, notices: node.badges.notices, departures: node.badges.departures };
};

/**
 * A directory as a row, with the rows it holds: directories first, then
 * files, each by name. One that holds a single directory and nothing else is
 * written into that directory's row, `apps/cli`, unless it is a module or
 * wears a mark of its own, which would have no row to stand on
 * (D276 (chain-row)).
 */
const directoryOf = (dir: Dir, marks: Marks, name: string): DirectoryNode => {
  const children: readonly TreeNode[] = [
    ...[...dir.dirs.values()].toSorted(byName).map((held) => directoryOf(held, marks, held.name)),
    ...dir.leaves.toSorted(byName).map((leaf): TreeNode => ({ ...leaf, badges: badgesOf(leaf.path, marks) })),
  ];
  const badges = badgesOf(dir.path, marks);
  const target = marks.targets.get(dir.path);
  const only = children.length === 1 ? children[0] : undefined;
  if (only?.kind === 'directory' && target === undefined && badges.departures === 0 && dir.path !== ROOT) return { ...only, name: `${name}/${only.name}` };
  const within = children.map(countsOf).reduce(sum, { ...NONE, notices: badges.notices, departures: badges.departures });
  return { kind: 'directory', path: dir.path, name, badges, ...(target === undefined ? {} : { target }), children, counts: { ...within, notices: within.notices.toSorted(byRank) } };
};

/** The row that holds each row beneath these, by path. */
const parentsOf = (roots: readonly TreeNode[]): ReadonlyMap<string, string> => {
  const parents = new Map<string, string>();
  const walk = (node: TreeNode): void => {
    if (node.kind !== 'directory') return;
    for (const child of node.children) {
      parents.set(child.path, node.path);
      walk(child);
    }
  };
  roots.forEach(walk);
  return parents;
};

/** The folder tree of a map: every file it lists, under its directories, each row with what it selects and what it wears. */
export const treeOf = (map: MapJson): TreeModel => {
  const root = foldPaths(map);
  const paths = standing(root);
  const cellsAt = Map.groupBy(map.terrain.cells, (cell) => cell.path);
  const rooted = cellsAt.has(ROOT);
  // A cell lights the row at its path, a single file's module the file's; then a file's id lights its own row, as the line looks a file up before a module (D275 (tree-row-target)).
  const index = new Map<string, string>();
  for (const cell of map.terrain.cells) if (cell.path === ROOT ? rooted : paths.has(cell.path)) index.set(cell.id, cell.path);
  for (const file of map.terrain.organelles) index.set(file.id, file.path);
  const targets = new Map<string, string>();
  for (const [path, cells] of cellsAt) {
    const owner = moduleAt(cells);
    if (owner !== undefined && paths.get(path) === 'directory') targets.set(path, owner.id);
  }
  const marks: Marks = {
    changes: new Map(map.weather.changed.map((file) => [file.path, file.kind] as const)),
    ghosts: new Set(map.weather.ghosts.map((ghost) => ghost.path)),
    notices: noticesOn(map, index, paths),
    departures: departuresOn(map.approved?.departures ?? [], index, (path) => standingAt(paths, rooted, path)),
    targets,
  };
  // A module at the repo's root is the one row at the top, named for the repo; with none there, the top rows are what the root holds.
  const top = directoryOf(root, marks, map.meta.repo === '' ? ROOT : map.meta.repo);
  const roots = rooted ? [top] : top.children;
  return {
    roots,
    index,
    parents: parentsOf(roots),
    counts: top.counts,
    ...(map.approved === undefined ? {} : { approved: { at: map.approved.at, departures: map.approved.departures.length } }),
  };
};

/** The rows above a row, the nearest first: the directories to open so it shows. */
export const lineOf = (model: TreeModel, path: string): readonly string[] => {
  const line: string[] = [];
  let parent = model.parents.get(path);
  while (parent !== undefined) {
    line.push(parent);
    parent = model.parents.get(parent);
  }
  return line;
};

/**
 * Whether a directory opens unasked (D284 (opens-on-map-change)): one that
 * holds a changed file on the map does, and the repo's root, which holds
 * everything. One whose only changes are to files not on the map stays
 * closed and wears their count, so a directory of changed notes or tests
 * does not stand open over the rows the map can light.
 */
export const startsOpen = (node: DirectoryNode): boolean => node.path === ROOT || node.counts.changedOnMap > 0;

/** The rows on show, top to bottom: every row at the top, and beneath each open directory what it holds; a closed one's rows are not made at all. */
export const rowsShown = (model: TreeModel, open: (node: DirectoryNode) => boolean): readonly TreeRow[] => {
  const rows: TreeRow[] = [];
  const walk = (node: TreeNode, depth: number): void => {
    rows.push({ node, depth });
    if (node.kind === 'directory' && open(node)) for (const child of node.children) walk(child, depth + 1);
  };
  for (const node of model.roots) walk(node, 0);
  return rows;
};

/** What a row wears on the screen: how many changed files and ghosts it hides, the notices' boxes, and the departures. */
export type Worn = { readonly changed: number; readonly ghosts: number; readonly notices: readonly Marked[]; readonly departures: number };

/**
 * What a row wears (D277 (closed-wears-hidden)): a closed directory wears
 * all it holds, since nothing beneath it shows; an open one wears only its
 * own, since each row beneath wears its own; and a file wears its own, with
 * its change as its mark and never as a count.
 */
export const wornBy = (node: TreeNode, open: boolean): Worn =>
  node.kind === 'directory' && !open
    ? { changed: node.counts.changed, ghosts: node.counts.ghosts, notices: node.counts.notices, departures: node.counts.departures }
    : { changed: 0, ghosts: 0, notices: node.badges.notices, departures: node.badges.departures };

/** How many characters of a commit's sha the header writes. */
const SHORT_SHA = 7;

/** The head a shape was approved at, as words: a sha's first seven characters, or the working tree. */
const headWords = (at: string): string => (at === 'working-tree' ? 'working tree' : at.slice(0, SHORT_SHA));

/** A count of departures as words. */
export const departureWords = (count: number): string => (count === 0 ? 'no departures' : count === 1 ? '1 departure' : `${String(count)} departures`);

/** The tree's header line (D210 (approved-block)): how far the map departs from the approved shape and since when, or, muted, that no shape was approved yet. */
export const approvedLine = (model: TreeModel): { readonly words: string; readonly muted: boolean } =>
  model.approved === undefined ? { words: 'no approved shape yet: run atis approve', muted: true } : { words: `since approved ${headWords(model.approved.at)}: ${departureWords(model.approved.departures)}`, muted: false };

/**
 * How far to scroll so a row shows: up until its top clears the `head` that
 * stands over the rows, down until its bottom is in view, and not at all
 * while it already shows. Every edge is a distance from the viewport's top.
 */
export const nudge = (view: { readonly top: number; readonly bottom: number }, row: { readonly top: number; readonly bottom: number }, head: number): number => {
  if (row.top < view.top + head) return row.top - view.top - head;
  return row.bottom > view.bottom ? row.bottom - view.bottom : 0;
};
