/**
 * hover: what the world shows of the thing under the pointer (step 38): the
 * outline it highlights, the file's own shape on the spectrum (D194) or the cell's
 * membrane with its teeth (D159), and the path its hover tag writes, a file's
 * as the rail writes it, `+` before an added one and the old path before a
 * renamed one (D40, D120), and a cell's folder, with how many imports enter
 * it through its interface and how many past it where the map counted them
 * (D195, Q95). The world eases the outline
 * and the tag in through the scheduler (§5.5), and neither moves of its own.
 * Pure: no three, no DOM, so a test reads it straight.
 */

import { dentedRing, outlineOf, troubleOf } from 'scene';
import type { Pick, Point } from 'scene';
import type { Cell, MapJson } from 'core';

/** The thing under the pointer as the world shows it: who it is, the file or cell it is, the words its tag writes, and the outline it highlights, in layout units. */
export type Hovered = { readonly key: string; readonly target: string; readonly text: string; readonly ring: readonly Point[] };

/** The words a file's tag writes, as the rail writes a changed file. */
const wordsOf = (map: MapJson, path: string): string => {
  const change = map.weather.changed.find((file) => file.path === path);
  if (change?.kind === 'added') return `+${path}`;
  if (change?.kind === 'renamed' && change.from !== undefined) return `${change.from} → ${path}`;
  return path;
};

/**
 * The words a cell's tag writes: its folder, and the two counts its membrane
 * ripples by, so the size behind a ripple is one pointer away (Q95). A cell
 * the map gives no `integrity` says its folder alone: nothing was counted
 * there, and a `0 past` would read as a containment nothing measured (C2).
 */
const cellWords = (cell: Cell): string => (cell.integrity === undefined ? cell.path : `${cell.path} · ${String(cell.integrity.through)} through, ${String(cell.integrity.past)} past`);

/** What the world shows of a pick: the file's outline and path, or the cell's membrane and folder; none for a cell the layout drew no skin for. */
export const hoverOf = (map: MapJson, pick: Pick): Hovered | undefined => {
  if (pick.kind === 'organelle') {
    const organelle = map.terrain.organelles.find((each) => each.id === pick.path);
    const { ring } = outlineOf(pick.path, pick, organelle === undefined ? 0 : troubleOf(organelle).score);
    return { key: `organelle:${pick.path}`, target: pick.path, text: wordsOf(map, pick.path), ring };
  }
  const cell = map.terrain.cells.find((each) => each.id === pick.cell);
  const contour = map.terrain.layout?.contours?.[pick.cell];
  if (cell === undefined || contour === undefined) return undefined;
  return { key: `membrane:${pick.cell}`, target: pick.cell, text: cellWords(cell), ring: dentedRing(contour, cell.dents.length) };
};
