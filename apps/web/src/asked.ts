/**
 * asked: what the world writes over the field, which is only what it is
 * asked for (D168). A file's name and its notices' labels, and a renamed
 * file's old path, show while the pointer is over that file on the field or
 * over its row in the notice column; a storm's slot shows so for the cell it
 * hangs over, or a file that cell holds; and a cell a notice names shows that
 * notice's label so. An opened cell's tags show in its exploded view, as it
 * spreads, or one at a time while the pointer is over a body, and the
 * barrel's exports with them, or while the pointer is over the barrel. The
 * numbered notice boxes, the HUD, the notice column, the shore rail and the
 * minimap are not asked for: they stay as they are. Pure, so a test reads it
 * straight.
 */

import type { MapJson } from 'core';

/** The targets the world is asked about: the file or cell under the pointer on the field, and the target of the notice row the pointer is over. */
export const askedOf = (field: string | undefined, row: string | undefined): ReadonlySet<string> =>
  new Set([field, row].filter((target): target is string => target !== undefined));

/** Whether a tag that belongs to `target` is asked for: the target itself, or a cell that holds an asked file, however deep. */
export const asksFor = (map: MapJson, asked: ReadonlySet<string>): ((target: string) => boolean) => {
  const parentOf = new Map(map.terrain.cells.flatMap((cell) => (cell.parent === undefined ? [] : [[cell.id, cell.parent] as const])));
  const holders = new Set<string>();
  for (const organelle of map.terrain.organelles) {
    if (!asked.has(organelle.id)) continue;
    for (let cell: string | undefined = organelle.cell; cell !== undefined && !holders.has(cell); cell = parentOf.get(cell)) holders.add(cell);
  }
  return (target) => asked.has(target) || holders.has(target);
};

/** How strongly an opened cell's words show, 0 to 1: each file's tag, and the barrel's exports. */
export type SlideWords = { readonly tag: (id: string) => number; readonly exports: number };

/**
 * An opened cell's words at its exploded view's spread, 0 at rest and 1
 * spread: every tag as the view spreads, and the tag of the body under the
 * pointer in full; the exports with the tags, and in full under the pointer
 * on the barrel.
 */
export const slideWords = (spread: number, hovered: string | undefined, barrel: string | undefined): SlideWords => ({
  tag: (id) => (id === hovered ? 1 : spread),
  exports: hovered !== undefined && hovered === barrel ? 1 : spread,
});
