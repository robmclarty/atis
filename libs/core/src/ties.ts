/**
 * ties: how many import edges hold each file to its own cell, and how many
 * reach out of it (D157), the count an opened cell drifts its files by. A
 * file whose ties stay home is held near its place, a hub most of all; one
 * whose ties mostly leave its cell, or that has none, floats free, as a file
 * that works with none of its cellmates may belong elsewhere.
 *
 * The edges are the head graph's, in either direction (D39), between terrain
 * files alone: a test or a shore file is no organelle, so an edge to one ties
 * nothing (D4). A deleted file has no head edges to count, and is given no
 * ties rather than a faked count of none (C2).
 */

import type { ImportEdge, ModuleOrganelle } from './modules.js';
import type { Ties } from './schema.js';

/** Each terrain file's ties by path; a deleted file is left out. */
export function computeTies(
  organelles: readonly Pick<ModuleOrganelle, 'path' | 'cell'>[],
  headEdges: readonly ImportEdge[],
  deleted: ReadonlySet<string>,
): ReadonlyMap<string, Ties> {
  const cellOf = new Map(organelles.map((organelle) => [organelle.path, organelle.cell] as const));
  const counts = new Map<string, { inside: number; outside: number }>();
  for (const { path } of organelles) {
    if (!deleted.has(path)) counts.set(path, { inside: 0, outside: 0 });
  }
  const seen = new Set<string>();
  for (const { from, to } of headEdges) {
    const key = `${from}\n${to}`;
    const fromCell = cellOf.get(from);
    const toCell = cellOf.get(to);
    if (from === to || seen.has(key) || fromCell === undefined || toCell === undefined) continue;
    seen.add(key);
    const side = fromCell === toCell ? 'inside' : 'outside';
    for (const end of [from, to]) {
      const count = counts.get(end);
      if (count !== undefined) count[side] += 1;
    }
  }
  return counts;
}
