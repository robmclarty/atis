/**
 * asked: what the world writes over the field, which is only what it is
 * asked for (D168). A file's name and its notices' labels, and a renamed
 * file's old path, show while the pointer is over that file on the field or
 * over its row in the notice column, for as long as it is selected
 * (D207 (click-selects)), and while a row of the chrome's tree or inspector
 * points at it (D209 (selection-line)); a storm's slot shows so for the cell it
 * hangs over, or a file that cell holds; and a cell a notice names shows that
 * notice's label so. An opened cell's tags show in its exploded view, as it
 * spreads, or one at a time while the pointer is over a body, a row points at
 * it or the body is the selected file, and the barrel's exports with them, or
 * while the pointer is over the barrel. The
 * numbered notice boxes, the HUD, the notice column, the shore rail and the
 * minimap are not asked for: they stay as they are.
 *
 * One thing is written unasked (D206 (detail-by-size)): the name of a file
 * large enough on the screen, once its radius there passes
 * `LEVELS.fileNameFrom` pixels. `namedBySize` says which files those are for
 * a view; the labels' collision rule and budget then cap them, after
 * everything asked for has its place. Pure, so a test reads it straight.
 */

import type { MapJson } from 'core';
import type { Viewport } from 'scene';

/** The targets the world is asked about: the file or cell under the pointer on the field, the target of the notice row the pointer is over, the selection's, which stays asked for until it is cleared (D207 (click-selects)), and the one a row of the chrome points at (D209 (selection-line)). */
export const askedOf = (field: string | undefined, row: string | undefined, selected?: string, pointed?: string): ReadonlySet<string> =>
  new Set([field, row, selected, pointed].filter((target): target is string => target !== undefined));

/** A file where the map draws it: its path, its centre and its radius, in layout units. */
type Placed = { readonly id: string; readonly x: number; readonly y: number; readonly r: number };

/**
 * The files large enough on the screen to be named unasked (D206
 * (detail-by-size)): those whose centre the view shows and whose radius there
 * is at least `from` pixels. At `0` that is every file in view, and at a
 * threshold no file reaches it is none, so a name is written only when asked
 * for.
 */
export const namedBySize = (files: Iterable<Placed>, viewport: Viewport, from: number): ReadonlySet<string> => {
  const named = new Set<string>();
  for (const file of files) {
    if (file.x < viewport.x || file.x > viewport.x + viewport.width || file.y < viewport.y || file.y > viewport.y + viewport.height) continue;
    if (file.r * viewport.pixelsPerUnit >= from) named.add(file.id);
  }
  return named;
};

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
 * pointer, of the selected file and of the file a row of the chrome points at
 * in full; the exports with the tags, and in full under the pointer on the
 * barrel.
 */
export const slideWords = (spread: number, hovered: string | undefined, barrel: string | undefined, selected?: string, pointed?: string): SlideWords => ({
  tag: (id) => (id === hovered || id === selected || id === pointed ? 1 : spread),
  exports: hovered !== undefined && hovered === barrel ? 1 : spread,
});
