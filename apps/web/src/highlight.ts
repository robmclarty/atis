/**
 * highlight: what `atis mcp` asks the open tab to show (D110, D178). The
 * server relays an agent's `POST /highlight` over the page's socket as
 * `{ "kind": "highlight", "file": <path> }` or
 * `{ "kind": "highlight", "notice": <rank> }`, having held it to the map it
 * serves; the page holds it again to the map it draws, which a push may have
 * replaced since, and drops what that map does not place. A file leads to its
 * stop on the walk; a notice leads where its row does, to its file, its cell,
 * or its shore group's block in the rail (D148, D153). The world flies there,
 * writes the target's labels as a notice row's hover writes them (D168), and
 * flares a notice at its anchor. A tour's stop is lit the same way (D112): it
 * leads to its target, a file or a cell the map places, or else where its
 * notice's row does, and flares that notice; it comes from the chrome's
 * stepper, never over the socket. Pure but for `revealGroup`, which scrolls
 * the rail.
 */

import type { MapJson } from 'core';

import { destinationOf } from './walk.js';
import type { Destination } from './walk.js';

/** A target an agent named, a file by its path or a notice by its rank, 1 the primary; or a tour's stop, its target and the notice it explains. */
export type Highlight = { readonly kind: 'file'; readonly path: string } | { readonly kind: 'notice'; readonly rank: number } | { readonly kind: 'stop'; readonly target: string; readonly rank: number };

/** Where a highlight leads in a map, the target whose labels it writes, and the notice it flares, by its index, when it names one. */
export type Lit = { readonly destination: Destination; readonly target: string; readonly flare?: number };

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The highlight a socket's message carries; none for another kind, text that is not JSON, or a target named neither way or both. */
export const pushedHighlight = (text: string): Highlight | undefined => {
  let message: unknown;
  try {
    message = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (!isRecord(message) || message['kind'] !== 'highlight') return undefined;
  const { file, notice } = message;
  if (typeof file === 'string' && file !== '' && notice === undefined) return { kind: 'file', path: file };
  if (typeof notice === 'number' && Number.isSafeInteger(notice) && notice >= 1 && file === undefined) return { kind: 'notice', rank: notice };
  return undefined;
};

/** Where a tour's stop leads: its target, the file or the cell the map places, else where its notice's row does when the target is the notice's own; none when neither is. */
const stopLit = (map: MapJson, target: string, rank: number): Lit | undefined => {
  const notice = map.notices[rank - 1];
  if (notice === undefined) return undefined;
  const flare = rank - 1;
  const layout = map.terrain.layout;
  const organelle = map.terrain.organelles.find((each) => each.id === target);
  if (organelle !== undefined && layout?.positions[organelle.id] !== undefined) return { destination: { kind: 'stop', stop: { kind: 'organelle', path: organelle.id, cell: organelle.cell } }, target, flare };
  if (map.terrain.cells.some((cell) => cell.id === target) && layout?.contours?.[target] !== undefined) return { destination: { kind: 'stop', stop: { kind: 'cell', cell: target } }, target, flare };
  const destination = target === notice.target ? destinationOf(map, rank) : undefined;
  return destination === undefined ? undefined : { destination, target, flare };
};

/** What a highlight lights in a map; none for a file its layout does not place, a notice it does not rank or cannot place (D148), or a stop it gives nowhere to fly. */
export const litIn = (map: MapJson, highlight: Highlight): Lit | undefined => {
  if (highlight.kind === 'stop') return stopLit(map, highlight.target, highlight.rank);
  if (highlight.kind === 'file') {
    const organelle = map.terrain.organelles.find((each) => each.id === highlight.path);
    if (organelle === undefined || map.terrain.layout?.positions[organelle.id] === undefined) return undefined;
    return { destination: { kind: 'stop', stop: { kind: 'organelle', path: organelle.id, cell: organelle.cell } }, target: organelle.id };
  }
  const notice = map.notices[highlight.rank - 1];
  const destination = destinationOf(map, highlight.rank);
  return notice === undefined || destination === undefined ? undefined : { destination, target: notice.target, flare: highlight.rank - 1 };
};

/** Bring a shore group's block in the rail into view, as a notice row on the shore does (D153). */
export const revealGroup = (group: string): void => {
  document.querySelector(`[data-rail] [data-group="${group}"]`)?.scrollIntoView({ block: 'nearest' });
};
