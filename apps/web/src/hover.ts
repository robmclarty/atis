/**
 * hover: what the world shows of the thing under the pointer (step 38): the
 * outline it highlights, the file's own morphed shape (D146) or the cell's
 * membrane with its teeth (D159), and the path its hover tag writes, a file's
 * as the rail writes it, `+` before an added one and the old path before a
 * renamed one (D40, D120), and a cell's folder. The world eases the outline
 * and the tag in through the scheduler (§5.5), and neither moves of its own.
 * Pure: no three, no DOM, so a test reads it straight.
 */

import { dentedRing, outlineOf, rulesOf } from 'scene';
import type { Pick, Point } from 'scene';
import type { MapJson } from 'core';

/** The thing under the pointer as the world shows it: who it is, the words its tag writes, and the outline it highlights, in layout units. */
export type Hovered = { readonly key: string; readonly text: string; readonly ring: readonly Point[] };

/** The words a file's tag writes, as the rail writes a changed file. */
const wordsOf = (map: MapJson, path: string): string => {
  const change = map.weather.changed.find((file) => file.path === path);
  if (change?.kind === 'added') return `+${path}`;
  if (change?.kind === 'renamed' && change.from !== undefined) return `${change.from} → ${path}`;
  return path;
};

/** What the world shows of a pick: the file's outline and path, or the cell's membrane and folder; none for a cell the layout drew no skin for. */
export const hoverOf = (map: MapJson, pick: Pick): Hovered | undefined => {
  if (pick.kind === 'organelle') {
    const organelle = map.terrain.organelles.find((each) => each.id === pick.path);
    const { ring } = outlineOf(pick.path, pick, rulesOf(organelle?.dents ?? []));
    return { key: `organelle:${pick.path}`, text: wordsOf(map, pick.path), ring };
  }
  const cell = map.terrain.cells.find((each) => each.id === pick.cell);
  const contour = map.terrain.layout?.contours?.[pick.cell];
  if (cell === undefined || contour === undefined) return undefined;
  return { key: `membrane:${pick.cell}`, text: cell.path, ring: dentedRing(contour, cell.dents.length) };
};
