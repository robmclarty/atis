/**
 * integrity: how a cell with a barrel is entered from outside (D192), the
 * count its membrane ripples by. An import from a file outside the cell's
 * contour onto its barrel came `through` the interface; one onto any other
 * file inside the contour went `past` it.
 *
 * The contour is the cell's own files and every nested cell's, as the fans
 * read it (D45): an import onto a folder's barrel from another package comes
 * through the folder and past the package it sits in. An import between two
 * files of one contour enters nothing, so it counts for neither.
 *
 * The edges are the head graph's, between terrain files alone: a test or a
 * shore file is no importer (D4), and a repeated edge counts once. A
 * directory cell's interface is whatever outsiders import and a single-file
 * cell is its own, so `past` would be 0 there by construction; neither is
 * given a count, nor is a cell whose barrel the change deleted, which has no
 * interface at head to be entered through (C2).
 */

import type { ImportEdge, ModuleCell } from './modules.js';
import type { Integrity } from './schema.js';

type IntegrityCell = Pick<ModuleCell, 'id' | 'parent' | 'barrel' | 'organelles'>;

/** Every cell whose contour holds each terrain file: its own cell, and each ancestor of it. */
function holdersOf(cells: readonly IntegrityCell[]): ReadonlyMap<string, readonly IntegrityCell[]> {
  const byId = new Map(cells.map((cell) => [cell.id, cell] as const));
  const holders = new Map<string, readonly IntegrityCell[]>();
  for (const cell of cells) {
    const chain: IntegrityCell[] = [];
    let at: IntegrityCell | undefined = cell;
    while (at !== undefined && !chain.includes(at)) {
      chain.push(at);
      at = at.parent === undefined ? undefined : byId.get(at.parent);
    }
    for (const path of cell.organelles) holders.set(path, chain);
  }
  return holders;
}

/**
 * Each barrelled cell's integrity by cell id. A cell with no barrel, or one
 * whose barrel is deleted, is left out; a barrelled cell nothing outside
 * imports carries two zeros, which is a count of none, not an absent key.
 */
export function computeIntegrity(
  cells: readonly IntegrityCell[],
  headEdges: readonly ImportEdge[],
  deleted: ReadonlySet<string>,
): ReadonlyMap<string, Integrity> {
  const holders = holdersOf(cells);
  const counts = new Map<string, { through: number; past: number }>();
  for (const { id, barrel } of cells) {
    if (barrel !== undefined && !deleted.has(barrel)) counts.set(id, { through: 0, past: 0 });
  }
  const seen = new Set<string>();
  for (const { from, to } of headEdges) {
    const key = `${from}\n${to}`;
    const outside = holders.get(from);
    const entered = holders.get(to);
    if (from === to || seen.has(key) || outside === undefined || entered === undefined) continue;
    seen.add(key);
    for (const cell of entered) {
      const count = counts.get(cell.id);
      if (count === undefined || outside.includes(cell)) continue;
      count[to === cell.barrel ? 'through' : 'past'] += 1;
    }
  }
  return counts;
}
