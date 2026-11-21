/**
 * approved: the shape of a repository its owner accepted
 * (D212 (approved-private)).
 *
 * `approvedOf` reduces a map to a small document of its own, beside
 * `map.json` as the reach answer is, and `assertApproved` guards one read
 * back from disk. It stands on what a map already carries, so it needs no
 * check to have run, and it reads no clock (C1, C3).
 */

import type { Cell, CellKind, MapJson } from './schema.js';

/** The approved document's contract version: its own, as the reach answer's is, so it leaves the map's alone (D85). */
export const APPROVED_SCHEMA_VERSION = 1;

/** What an approved document says it is. */
export const APPROVED_KIND = 'atis.approved';

/**
 * One module as it was approved: a cell, named by its path and its kind and
 * never by its id, which carries the kind and so changes when a directory
 * gains an interface file. `files` and `loc` count what the head holds inside
 * its contour, a package's nested modules included (D300 (held-at-head)).
 * `exports` are the names its interface exports, sorted, and are absent
 * where the map read none of an interface it counts above zero; the fans
 * and the imports `through` and `past` its interface are absent where the map
 * carries none, as a module with no barrel has no `past` (C2,
 * D301 (unread-lists)).
 */
export type ApprovedModule = {
  readonly path: string;
  readonly kind: CellKind;
  readonly band: number;
  readonly files: number;
  readonly loc: number;
  readonly interface_size: number;
  readonly exports?: readonly string[];
  readonly fan_in?: number;
  readonly fan_out?: number;
  readonly through?: number;
  readonly past?: number;
};

/**
 * The approved shape (D212 (approved-private)): the head it was approved at,
 * as that map's `meta.head` wrote it, every module that head holds, sorted by
 * path and then by kind, and the outside packages it imports, sorted, absent
 * where the map listed none (D301 (unread-lists)).
 */
export type Approved = {
  readonly schema_version: typeof APPROVED_SCHEMA_VERSION;
  readonly kind: typeof APPROVED_KIND;
  readonly approved_at: string;
  readonly modules: readonly ApprovedModule[];
  readonly dependencies?: readonly string[];
};

const CELL_KINDS: readonly CellKind[] = ['package', 'folder', 'single', 'directory'];

function byText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function sortUnique(values: Iterable<string>): readonly string[] {
  return [...new Set(values)].toSorted(byText);
}

/** The order the document lists its modules in: by path, then by kind, each as `<` orders two strings (C3). */
function byModule(a: ApprovedModule, b: ApprovedModule): number {
  return byText(a.path, b.path) || byText(a.kind, b.kind);
}

/**
 * What names one module on either side: its path, and whether it is a
 * package (D218 (departure-cell)). A path is shared only by a `package` and
 * the `directory` of loose files at its root, so the two together name one
 * module, a `directory` that became a `folder` is still itself, and a package
 * is never held against the loose files beside it.
 */
function keyOf(module: Pick<ApprovedModule, 'path' | 'kind'>): string {
  return `${module.kind === 'package' ? 'package' : 'module'}\n${module.path}`;
}

/** What the head holds inside one contour: how many files, and their lines. */
type Tally = { readonly files: number; readonly loc: number };

/**
 * Each cell's files as the head holds them, by cell id (D300 (held-at-head)):
 * every file of the cell and of each cell nested in it, short of the files
 * the map's own change deleted, which a change map's terrain keeps a place
 * for (D32). A cell the head holds no file of has no tally. On a map whose
 * change deleted nothing this is the cell's own count of files and its
 * `body_loc`.
 */
function talliesOf(map: MapJson): ReadonlyMap<string, Tally> {
  const parents = new Map(map.terrain.cells.map((cell) => [cell.id, cell.parent] as const));
  const gone = new Set(map.weather.changed.filter((file) => file.kind === 'deleted').map((file) => file.path));
  const tallies = new Map<string, Tally>();
  for (const organelle of map.terrain.organelles) {
    if (gone.has(organelle.path)) continue;
    const counted = new Set<string>();
    let id: string | undefined = organelle.cell;
    while (id !== undefined && !counted.has(id)) {
      counted.add(id);
      const tally = tallies.get(id) ?? { files: 0, loc: 0 };
      tallies.set(id, { files: tally.files + 1, loc: tally.loc + organelle.loc });
      id = parents.get(id);
    }
  }
  return tallies;
}

/**
 * The names a cell's interface exports, or nothing where they are not known
 * (D301 (unread-lists)). A cell with no `exports` whose interface counts no
 * name exports none, which is known; one whose interface counts some is a
 * cell the map read no name of, as an older map and a cell whose barrel the
 * change deleted are, and an empty list there would say it exports nothing
 * (C2).
 */
function namesOf(cell: Cell): readonly string[] | undefined {
  if (cell.exports !== undefined) return sortUnique(cell.exports);
  return cell.interface_size === 0 ? [] : undefined;
}

/** One cell reduced to what is approved of it, each field left out where the map carries none (C2). */
function moduleOf(cell: Cell, tally: Tally): ApprovedModule {
  const exports = namesOf(cell);
  return {
    path: cell.path,
    kind: cell.kind,
    band: cell.band,
    files: tally.files,
    loc: tally.loc,
    interface_size: cell.interface_size,
    ...(exports === undefined ? {} : { exports }),
    ...(cell.fan_in === undefined ? {} : { fan_in: cell.fan_in }),
    ...(cell.fan_out === undefined ? {} : { fan_out: cell.fan_out }),
    ...(cell.integrity === undefined ? {} : { through: cell.integrity.through, past: cell.integrity.past }),
  };
}

/** A module the head holds, with the id of the cell of this map it is. */
type Held = { readonly cell: string; readonly module: ApprovedModule };

/** Every module the map's head holds, in the terrain's order: each cell with a file left in it. */
function heldOf(map: MapJson): readonly Held[] {
  const tallies = talliesOf(map);
  return map.terrain.cells.flatMap((cell): Held[] => {
    const tally = tallies.get(cell.id);
    return tally === undefined ? [] : [{ cell: cell.id, module: moduleOf(cell, tally) }];
  });
}

/**
 * Reduce a map to the shape its owner approves (D212 (approved-private)):
 * the head it is of, every module that head holds, and the outside packages
 * it imports where the map lists them. It reads the map alone and holds no
 * clock, so one map reduces to one document, byte for byte (C3).
 */
export function approvedOf(map: MapJson): Approved {
  const dependencies = map.weather.dependencies?.map((dependency) => dependency.name);
  return {
    schema_version: APPROVED_SCHEMA_VERSION,
    kind: APPROVED_KIND,
    approved_at: map.meta.head,
    modules: heldOf(map)
      .map((held) => held.module)
      .toSorted(byModule),
    ...(dependencies === undefined ? {} : { dependencies: sortUnique(dependencies) }),
  };
}

function fail(path: string, reason: string): never {
  throw new Error(`invalid approved shape at ${path}: ${reason}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isCellKind(value: unknown): value is CellKind {
  return CELL_KINDS.some((kind) => kind === value);
}

/** A list of names, each a string that is not empty, sorted and named once (C3). */
function assertNames(value: unknown, path: string): void {
  if (!Array.isArray(value)) fail(path, 'expected an array');
  let previous: string | undefined;
  value.forEach((name: unknown, index) => {
    const at = `${path}[${String(index)}]`;
    if (typeof name !== 'string' || name === '') fail(at, 'expected a name');
    if (previous !== undefined && previous >= name) fail(at, `expected the names sorted and unique, got "${name}" after "${previous}"`);
    previous = name;
  });
}

/** The counts every module carries, and the ones it carries only where the map measured them. */
const MEASURED = ['band', 'files', 'loc', 'interface_size'] as const;
const WHERE_MEASURED = ['fan_in', 'fan_out', 'through', 'past'] as const;

/** One module: where it is, what kind it is, and its counts; hands back what the list is sorted and matched by. */
function assertModule(value: unknown, path: string): Pick<ApprovedModule, 'path' | 'kind'> {
  if (!isRecord(value)) fail(path, 'expected an object');
  const at = value['path'];
  if (typeof at !== 'string' || at === '') fail(`${path}.path`, 'expected a module path');
  const kind = value['kind'];
  if (!isCellKind(kind)) fail(`${path}.kind`, `expected one of ${CELL_KINDS.join(', ')}`);
  for (const field of MEASURED) {
    if (!isCount(value[field])) fail(`${path}.${field}`, 'expected a non-negative number');
  }
  for (const field of WHERE_MEASURED) {
    if (value[field] !== undefined && !isCount(value[field])) fail(`${path}.${field}`, 'expected a non-negative number');
  }
  if (value['exports'] !== undefined) assertNames(value['exports'], `${path}.exports`);
  return { path: at, kind };
}

/**
 * The modules: sorted by path and then by kind, and no two naming one module,
 * which two of one path are unless exactly one of them is a package
 * (D218 (departure-cell)).
 */
function assertModules(value: unknown, path: string): void {
  if (!Array.isArray(value)) fail(path, 'expected an array');
  const named = new Set<string>();
  let previous: Pick<ApprovedModule, 'path' | 'kind'> | undefined;
  value.forEach((raw: unknown, index) => {
    const at = `${path}[${String(index)}]`;
    const module = assertModule(raw, at);
    if (previous !== undefined && (byText(previous.path, module.path) || byText(previous.kind, module.kind)) >= 0) {
      fail(at, 'expected the modules sorted by path, then by kind, and each listed once');
    }
    if (named.has(keyOf(module))) fail(at, `two modules at "${module.path}" and neither is a package`);
    named.add(keyOf(module));
    previous = module;
  });
}

/** Every check is real runtime narrowing, as the map's is: the compiler trusts the value only because this proved its shape as it went. */
function assertShape(value: unknown): asserts value is Approved {
  if (!isRecord(value)) fail('$', 'expected an object');
  if (value['schema_version'] !== APPROVED_SCHEMA_VERSION) fail('$.schema_version', `expected ${String(APPROVED_SCHEMA_VERSION)}`);
  if (value['kind'] !== APPROVED_KIND) fail('$.kind', `expected "${APPROVED_KIND}"`);
  if (typeof value['approved_at'] !== 'string' || value['approved_at'] === '') fail('$.approved_at', 'expected the head the shape was approved at');
  assertModules(value['modules'], '$.modules');
  if (value['dependencies'] !== undefined) assertNames(value['dependencies'], '$.dependencies');
}

/** Turn an unknown value into a trusted approved document, or throw naming the offending path. */
export function assertApproved(value: unknown): Approved {
  assertShape(value);
  return value;
}
