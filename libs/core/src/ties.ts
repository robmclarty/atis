/**
 * ties: how many import edges hold each file to its own cell, and how many
 * reach out of it (D157), the count an opened cell drifts its files by. A
 * file whose ties stay home is held near its place, a hub most of all; one
 * whose ties mostly leave its cell, or that has none, floats free, as a file
 * that works with none of its cellmates may belong elsewhere.
 *
 * The same count is taken a second time with the package for home (D167):
 * checkride's convention makes each `src/<name>.ts` a cell of one file, so
 * inside an opened package those modules float by the share of their ties
 * that leave the package rather than a cell they are alone in.
 *
 * The edges are the head graph's, in either direction (D39), between terrain
 * files alone: a test or a shore file is no organelle, so an edge to one ties
 * nothing (D4). A deleted file has no head edges to count, and is given no
 * ties rather than a faked count of none (C2).
 */

import type { ImportEdge, ModuleCell, ModuleOrganelle } from './modules.js';
import type { Ties } from './schema.js';

/**
 * Each file's ties to the files sharing its home and to the rest of the
 * terrain, by path. A file with no home, or deleted, is left out, though an
 * edge to it still ties the file at its other end.
 */
function countTies(
  organelles: readonly Pick<ModuleOrganelle, 'path' | 'cell'>[],
  homeOf: (cell: string) => string | undefined,
  headEdges: readonly ImportEdge[],
  deleted: ReadonlySet<string>,
): ReadonlyMap<string, Ties> {
  const cellOf = new Map(organelles.map((organelle) => [organelle.path, organelle.cell] as const));
  const counts = new Map<string, { inside: number; outside: number }>();
  for (const { path, cell } of organelles) {
    if (!deleted.has(path) && homeOf(cell) !== undefined) counts.set(path, { inside: 0, outside: 0 });
  }
  const seen = new Set<string>();
  for (const { from, to } of headEdges) {
    const key = `${from}\n${to}`;
    const fromCell = cellOf.get(from);
    const toCell = cellOf.get(to);
    if (from === to || seen.has(key) || fromCell === undefined || toCell === undefined) continue;
    seen.add(key);
    const fromHome = homeOf(fromCell);
    const side = fromHome !== undefined && fromHome === homeOf(toCell) ? 'inside' : 'outside';
    for (const end of [from, to]) {
      const count = counts.get(end);
      if (count !== undefined) count[side] += 1;
    }
  }
  return counts;
}

/** Each terrain file's ties by path; a deleted file is left out. */
export function computeTies(
  organelles: readonly Pick<ModuleOrganelle, 'path' | 'cell'>[],
  headEdges: readonly ImportEdge[],
  deleted: ReadonlySet<string>,
): ReadonlyMap<string, Ties> {
  return countTies(organelles, (cell) => cell, headEdges, deleted);
}

/**
 * Each terrain file's ties within its package by path (D167): its edges to
 * files in the same package, and to terrain files outside it. A file's
 * package is its cell when the cell is one, else the cell's nearest package
 * ancestor; a deleted file and a file in no package are left out.
 */
export function computePackageTies(
  organelles: readonly Pick<ModuleOrganelle, 'path' | 'cell'>[],
  cells: readonly Pick<ModuleCell, 'id' | 'kind' | 'parent'>[],
  headEdges: readonly ImportEdge[],
  deleted: ReadonlySet<string>,
): ReadonlyMap<string, Ties> {
  const byId = new Map(cells.map((cell) => [cell.id, cell] as const));
  const packageOf = new Map<string, string>();
  for (const cell of cells) {
    const seen = new Set<string>();
    let at: Pick<ModuleCell, 'id' | 'kind' | 'parent'> | undefined = cell;
    while (at !== undefined && at.kind !== 'package' && !seen.has(at.id)) {
      seen.add(at.id);
      at = at.parent === undefined ? undefined : byId.get(at.parent);
    }
    if (at?.kind === 'package') packageOf.set(cell.id, at.id);
  }
  return countTies(organelles, (cell) => packageOf.get(cell), headEdges, deleted);
}
