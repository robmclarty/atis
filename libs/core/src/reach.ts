/**
 * reach: the changed set and how far it reaches (§5.2, D5).
 *
 * Reach is the transitive importers of the changed files, walked over reverse
 * edges and priced per *membrane* rather than per file: a step inside one
 * innermost cell is free, and crossing into another costs one hop and records
 * the interface it landed on. A change whose exports never leave its cell
 * therefore reaches no other cell at all, which draws the deep-module payoff
 * directly. Added, modified and renamed files walk the head graph; a deleted
 * file walks the base graph, where the consumers it breaks still import it
 * (D39).
 */

import { OTHER_GROUP } from './groups.js';
import { classifyFile } from './modules.js';
import type { ImportEdge, Modules } from './modules.js';
import type { ChangedFile, ExceptionalEdge, Group, ReachEntry } from './schema.js';

/** A changed file as the diff knows it, before the map places it on the terrain or the shore. */
export type DiffFile = Omit<ChangedFile, 'cell' | 'group' | 'is_barrel'>;

/**
 * Where a changed test file lands in `changed[]`. Tests are evidence, never
 * terrain and never shore (D4), but every changed entry names exactly one cell
 * or group (D48), so they are grouped by what they are, like every other
 * leftover. The SVG still draws them as stitches on the organelles they
 * import, never as a shore contour.
 */
export const TESTS_GROUP = 'tests';

export type ReachInputs = {
  /** The diff's changed files, keyed by head path; a deleted file keeps its base path (D40). */
  readonly changed: readonly DiffFile[];
  /** The terrain's cells and organelles, already rekeyed by the diff's renames (D40). */
  readonly modules: Modules;
  /** The shore, for the changed files that are not terrain (D48). */
  readonly groups: readonly Group[];
  /** The head graph: added, modified and renamed files walk it, and `new-cross-module` is found in it (D39). */
  readonly headEdges: readonly ImportEdge[];
  /** The base graph: a deleted file's consumers live only here, since no head edge can import it (D39). */
  readonly baseEdges: readonly ImportEdge[];
};

export type ReachResult = {
  readonly changed: readonly ChangedFile[];
  readonly reach: readonly ReachEntry[];
  /** `new-cross-module` only; cycles and boundary violations come from `.check/`. */
  readonly edges_exceptional: readonly ExceptionalEdge[];
};

/** How far a file sits from the changed set, and the interfaces crossed to get there; one `via` entry per hop. */
type Label = { readonly hops: number; readonly via: readonly string[] };

const ORIGIN: Label = { hops: 0, via: [] };

/** The cell every terrain file lives in, and the barrel every cell is entered through. */
type CellIndex = {
  readonly cellOf: ReadonlyMap<string, string>;
  readonly barrelOf: ReadonlyMap<string, string>;
};

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Order two labels: fewer hops first, then the lexicographically smaller
 * `via`. A file two equally short paths reach always reports the same one, so
 * the walk's queue order cannot change the map (C3).
 */
function compareLabels(a: Label, b: Label): number {
  if (a.hops !== b.hops) return a.hops - b.hops;
  for (const [index, crossing] of a.via.entries()) {
    const other = b.via[index] ?? '';
    if (crossing !== other) return byPath(crossing, other);
  }
  return 0;
}

function indexCells(modules: Modules): CellIndex {
  const cellOf = new Map<string, string>();
  for (const organelle of modules.organelles) cellOf.set(organelle.path, organelle.cell);
  const barrelOf = new Map<string, string>();
  for (const cell of modules.cells) {
    if (cell.barrel !== undefined) barrelOf.set(cell.id, cell.barrel);
  }
  return { cellOf, barrelOf };
}

/** Who imports each terrain file, sorted. An edge touching a test or a shore file is not terrain (D4, D48). */
function importersOf(edges: readonly ImportEdge[], cells: CellIndex): Map<string, readonly string[]> {
  const importers = new Map<string, string[]>();
  for (const { from, to } of edges) {
    if (from === to || !cells.cellOf.has(from) || !cells.cellOf.has(to)) continue;
    const list = importers.get(to);
    if (list === undefined) importers.set(to, [from]);
    else if (!list.includes(from)) list.push(from);
  }
  for (const list of importers.values()) list.sort(byPath);
  return importers;
}

/**
 * One reverse step, from the imported file to one of its importers. Staying
 * inside the innermost cell is free; crossing into another costs a hop and
 * appends the interface file the edge landed on, which is the barrel whenever
 * the cell has one and is entered through it, and otherwise the imported file
 * itself, on that cell's interface by definition (D45).
 *
 * An import that reaches past a barrel into the cell therefore records the
 * file it actually took, not the barrel it went around: that file is the
 * public interface through which this change escapes, and so it is the one the
 * reviewer should read (§5.2), while D45's rider is that nothing may depend on
 * a barrel existing.
 */
function cross(label: Label, imported: string, importer: string, cells: CellIndex): Label {
  if (cells.cellOf.get(imported) === cells.cellOf.get(importer)) return label;
  return { hops: label.hops + 1, via: [...label.via, imported] };
}

/**
 * Every terrain file the seeds reach, each with its minimum label. Relaxation
 * runs to a fixpoint rather than settling nodes in one pass, so a file reached
 * late by a shorter path still ends up with the shorter one.
 */
function walk(seeds: readonly string[], importers: ReadonlyMap<string, readonly string[]>, cells: CellIndex): Map<string, Label> {
  const best = new Map<string, Label>();
  const queue: string[] = [];
  for (const seed of seeds.toSorted(byPath)) {
    if (!cells.cellOf.has(seed) || best.has(seed)) continue;
    best.set(seed, ORIGIN);
    queue.push(seed);
  }
  for (let next = 0; next < queue.length; next += 1) {
    const imported = queue[next];
    const label = imported === undefined ? undefined : best.get(imported);
    if (imported === undefined || label === undefined) continue;
    for (const importer of importers.get(imported) ?? []) {
      const reached = cross(label, imported, importer, cells);
      const current = best.get(importer);
      if (current !== undefined && compareLabels(reached, current) >= 0) continue;
      best.set(importer, reached);
      queue.push(importer);
    }
  }
  return best;
}

/** The best label each file earned across the two graphs (D39). */
function merge(walks: readonly ReadonlyMap<string, Label>[]): Map<string, Label> {
  const best = new Map<string, Label>();
  for (const walked of walks) {
    for (const [path, label] of walked) {
      const current = best.get(path);
      if (current === undefined || compareLabels(label, current) < 0) best.set(path, label);
    }
  }
  return best;
}

function edgeKey({ from, to }: ImportEdge): string {
  return `${from}\n${to}`;
}

/** A head edge between two cells that the base graph never had: the import this change introduced. */
function newCrossModule(inputs: ReachInputs, cells: CellIndex): readonly ExceptionalEdge[] {
  const before = new Set(inputs.baseEdges.map(edgeKey));
  const seen = new Set<string>();
  const introduced: ExceptionalEdge[] = [];
  for (const edge of inputs.headEdges) {
    const from = cells.cellOf.get(edge.from);
    const to = cells.cellOf.get(edge.to);
    if (from === undefined || to === undefined || from === to) continue;
    const key = edgeKey(edge);
    if (before.has(key) || seen.has(key)) continue;
    seen.add(key);
    introduced.push({ from: edge.from, to: edge.to, kind: 'new-cross-module' });
  }
  return introduced.toSorted((a, b) => byPath(a.from, b.from) || byPath(a.to, b.to));
}

/** The one group a changed file that is not terrain belongs to (D48); a test is never shore (D4). */
function shoreGroup(path: string, groupOf: ReadonlyMap<string, string>): string {
  if (classifyFile(path) === 'test') return TESTS_GROUP;
  return groupOf.get(path) ?? OTHER_GROUP;
}

function place(file: DiffFile, cells: CellIndex, groupOf: ReadonlyMap<string, string>): ChangedFile {
  const cell = cells.cellOf.get(file.path);
  return cell === undefined
    ? { ...file, group: shoreGroup(file.path, groupOf), is_barrel: false }
    : { ...file, cell, is_barrel: cells.barrelOf.get(cell) === file.path };
}

/**
 * Place the changed set on the map and walk what it reaches. Every list comes
 * back sorted by path (C3), `reach` holds terrain files only, and the changed
 * files themselves sit in it at zero hops, where the glow is brightest.
 */
export function computeReach(inputs: ReachInputs): ReachResult {
  const cells = indexCells(inputs.modules);
  const groupOf = new Map<string, string>();
  for (const group of inputs.groups) {
    for (const file of group.files) groupOf.set(file, group.id);
  }

  const changed = inputs.changed
    .map((file) => place(file, cells, groupOf))
    .toSorted((a, b) => byPath(a.path, b.path));
  const seeds = (deleted: boolean): readonly string[] =>
    changed.filter((file) => (file.kind === 'deleted') === deleted).map((file) => file.path);

  const reached = merge([
    walk(seeds(false), importersOf(inputs.headEdges, cells), cells),
    walk(seeds(true), importersOf(inputs.baseEdges, cells), cells),
  ]);

  return {
    changed,
    reach: [...reached]
      .flatMap(([path, label]): ReachEntry[] => {
        const cell = cells.cellOf.get(path);
        return cell === undefined ? [] : [{ path, cell, hops: label.hops, via: label.via }];
      })
      .toSorted((a, b) => byPath(a.path, b.path)),
    edges_exceptional: newCrossModule(inputs, cells),
  };
}
