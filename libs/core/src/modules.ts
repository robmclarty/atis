/**
 * modules: which cell every terrain file lives in (§5.1).
 *
 * Checkride's convention comes first, inside every package: the barrel of
 * `src/` is the package barrel, a file directly in `src/` a single-file cell,
 * and `src/<name>/` with a barrel of its own a folder cell. Every other
 * terrain file falls back to its own directory, whose interface is whatever is
 * imported from outside it, so nothing here depends on a barrel existing
 * (D45). Which files are terrain, which are tests, and which file is its
 * directory's barrel are the scan's to say, since each language has its own
 * rules for them (D114): core reads no extension.
 */

import type { CellKind } from './schema.js';

/** What a tracked file is to the map: terrain, evidence (D4), or shore (D48). */
export type FileKind = 'source' | 'test' | 'other';

/**
 * The parts of a scanned file that module identification reads: its kind as
 * its language's producer gave it (D114), and whether it is the barrel its
 * directory is entered through, where the language has one (`index.ts`,
 * `__init__.py`).
 */
export type ScannedFile = {
  readonly path: string;
  readonly loc: number;
  readonly kind: FileKind;
  readonly barrel?: boolean;
  readonly exports: readonly string[];
};

/** The parts of a resolved import that module identification reads. */
export type ImportEdge = { readonly from: string; readonly to: string };

/**
 * A cell before depth, history and evidence are known. The id is
 * `<kind>:<path>`, so a package and the directory of its loose files never
 * share one, and no cell can collide with a shore group's bare id.
 */
export type ModuleCell = {
  readonly id: string;
  readonly path: string;
  readonly kind: CellKind;
  readonly parent?: string;
  readonly barrel?: string;
  readonly organelles: readonly string[];
  /** The files the cell is entered through: its barrel, its one file, or what outsiders import. */
  readonly interface_files: readonly string[];
  readonly interface_size: number;
  readonly body_loc: number;
};

export type ModuleOrganelle = {
  readonly id: string;
  readonly path: string;
  readonly cell: string;
  readonly loc: number;
};

export type Modules = {
  readonly cells: readonly ModuleCell[];
  readonly organelles: readonly ModuleOrganelle[];
  /** The files the scan named tests, sorted: evidence, set aside rather than placed (D4). */
  readonly tests: readonly string[];
};

/** No shore table in hand: every source file the scan named stays terrain. */
const NOT_SHORE = (): boolean => false;

/**
 * What a scanned file is to the map: the kind its producer gave it (D114),
 * except that a source file the shore's `config` or `build` row takes is
 * shore, since it configures a tool (D57) or a build committed it (D84), so a
 * `vitest.config.ts` or a `dist/index.d.ts` founds no cell. `isShore` is those
 * rows, compiled by `shoreMatcher`; `buildMap` threads the reviewed repo's own
 * table through, so an `atis.config.json` override moves that boundary with
 * it. A test stays a test wherever it sits (D4).
 */
export function classifyFile(file: Pick<ScannedFile, 'path' | 'kind'>, isShore: (path: string) => boolean = NOT_SHORE): FileKind {
  return file.kind === 'source' && isShore(file.path) ? 'other' : file.kind;
}

function normalizeRoot(root: string): string {
  if (root === '.') return '';
  return root.replace(/^\.\//, '').replace(/\/+$/, '');
}

function isInside(root: string, path: string): boolean {
  return root === '' || path.startsWith(`${root}/`);
}

/** The innermost workspace member (`''` for the repo root) whose directory holds `path`. */
export function memberOf(path: string, roots: readonly string[]): string | undefined {
  let owner: string | undefined;
  for (const root of roots.map(normalizeRoot)) {
    if (isInside(root, path) && (owner === undefined || root.length > owner.length)) owner = root;
  }
  return owner;
}

/**
 * The packages that own terrain: the workspace members, or the root alone
 * without a workspace (D43). A root `src/` that no member claims makes the
 * root a package too: the shape of a library whose examples are the members.
 */
function packageRoots(roots: readonly string[], terrain: readonly string[]): readonly string[] {
  const members = [...new Set(roots.map(normalizeRoot))];
  const rootHasSource = terrain.some((path) => path.startsWith('src/') && memberOf(path, members) === undefined);
  return members.length === 0 || rootHasSource ? [...members, ''] : members;
}

function displayPath(dir: string): string {
  return dir === '' ? '.' : dir;
}

function dirname(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash < 0 ? '.' : path.slice(0, slash);
}

/**
 * Each directory's barrel: the terrain file in it the scan marked as one, the
 * first by path where it marked two (`index.ts` before `index.tsx`).
 */
function barrelsOf(sorted: readonly ScannedFile[]): ReadonlyMap<string, string> {
  const barrels = new Map<string, string>();
  for (const file of sorted) {
    const dir = dirname(file.path);
    if (file.barrel === true && !barrels.has(dir)) barrels.set(dir, file.path);
  }
  return barrels;
}

type Placement = { readonly kind: CellKind; readonly path: string; readonly barrel?: string };

/** Where checkride's convention puts a file inside its package; its directory otherwise. */
function place(path: string, member: string | undefined, barrels: ReadonlyMap<string, string>): Placement {
  const fallback: Placement = { kind: 'directory', path: dirname(path) };
  if (member === undefined) return fallback;
  const src = member === '' ? 'src' : `${member}/src`;
  if (!path.startsWith(`${src}/`)) return fallback;
  const [name = '', ...rest] = path.slice(src.length + 1).split('/');
  if (rest.length === 0) {
    return path === barrels.get(src)
      ? { kind: 'package', path: displayPath(member), barrel: path }
      : { kind: 'single', path };
  }
  const folder = `${src}/${name}`;
  const barrel = barrels.get(folder);
  return barrel === undefined ? fallback : { kind: 'folder', path: folder, barrel };
}

type Draft = {
  readonly id: string;
  readonly kind: CellKind;
  readonly path: string;
  readonly parent?: string;
  barrel?: string;
  readonly organelles: string[];
  /** Every terrain file inside the contour: the organelles, or all of a package's descendants. */
  readonly inside: Map<string, ScannedFile>;
};

function draftFor(drafts: Map<string, Draft>, kind: CellKind, path: string, parent?: string): Draft {
  const id = `${kind}:${path}`;
  const existing = drafts.get(id);
  if (existing !== undefined) return existing;
  const draft: Draft = { id, kind, path, ...(parent === undefined ? {} : { parent }), organelles: [], inside: new Map() };
  drafts.set(id, draft);
  return draft;
}

function isInterface(draft: Draft, path: string, importers: ReadonlyMap<string, readonly string[]>): boolean {
  if (draft.barrel !== undefined) return path === draft.barrel;
  if (draft.kind === 'single') return true;
  return (importers.get(path) ?? []).some((from) => !draft.inside.has(from));
}

function finish(draft: Draft, importers: ReadonlyMap<string, readonly string[]>): ModuleCell {
  const inside = [...draft.inside.values()];
  const entrances = inside.filter((file) => isInterface(draft, file.path, importers));
  return {
    id: draft.id,
    path: draft.path,
    kind: draft.kind,
    ...(draft.parent === undefined ? {} : { parent: draft.parent }),
    ...(draft.barrel === undefined ? {} : { barrel: draft.barrel }),
    organelles: draft.organelles,
    interface_files: entrances.map((file) => file.path),
    interface_size: entrances.reduce((total, file) => total + file.exports.length, 0),
    body_loc: inside.reduce((total, file) => total + file.loc, 0),
  };
}

/**
 * Group the terrain into cells. `files` may hold every tracked file: tests,
 * the files the scan called other and the `config` and `build` shore (D57,
 * D84) are skipped here, the tests listed apart. `edges` only decide the
 * interface of a cell without a barrel, and only edges between terrain files
 * count. `roots` are the workspace members' directories, repo-relative.
 * `isShore` is the shore's `config` and `build` rows, so a source file that
 * configures a tool, or one a build committed, founds no cell of its own.
 */
export function identifyModules(
  files: readonly ScannedFile[],
  edges: readonly ImportEdge[],
  roots: readonly string[],
  isShore: (path: string) => boolean = NOT_SHORE,
): Modules {
  const byPath = new Map<string, ScannedFile>();
  const tests = new Set<string>();
  for (const file of files) {
    const kind = classifyFile(file, isShore);
    if (kind === 'test') tests.add(file.path);
    if (kind === 'source' && !byPath.has(file.path)) byPath.set(file.path, file);
  }
  const sorted = [...byPath.values()].toSorted((a, b) => (a.path < b.path ? -1 : 1));
  const terrain = new Set(byPath.keys());
  const barrels = barrelsOf(sorted);
  const members = packageRoots(roots, [...terrain]);
  const drafts = new Map<string, Draft>();
  const organelles: ModuleOrganelle[] = [];

  for (const file of sorted) {
    const { path } = file;
    const member = memberOf(path, members);
    const pkg = member === undefined ? undefined : draftFor(drafts, 'package', displayPath(member));
    pkg?.inside.set(path, file);
    const placement = place(path, member, barrels);
    const cell = draftFor(drafts, placement.kind, placement.path, placement.kind === 'package' ? undefined : pkg?.id);
    if (placement.barrel !== undefined) cell.barrel = placement.barrel;
    cell.organelles.push(path);
    cell.inside.set(path, file);
    organelles.push({ id: path, path, cell: cell.id, loc: file.loc });
  }

  const importers = new Map<string, string[]>();
  for (const { from, to } of edges) {
    if (from === to || !terrain.has(from) || !terrain.has(to)) continue;
    const list = importers.get(to);
    if (list === undefined) importers.set(to, [from]);
    else list.push(from);
  }

  const cells = [...drafts.values()]
    .toSorted((a, b) => (a.id < b.id ? -1 : 1))
    .map((draft) => finish(draft, importers));
  return { cells, organelles, tests: [...tests].toSorted((a, b) => (a < b ? -1 : 1)) };
}
