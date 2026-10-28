/**
 * watch: the page's socket (D106, D178). A page the CLI served carries the
 * run's token in its query, and opens a socket at the served `/socket` with
 * that token (D134), whether or not the run watches: the watch pushes its
 * maps over it, and `atis mcp` its highlights (`highlight.ts`). Under
 * `--watch` every map the watch rebuilds comes as `{ "kind": "map", "map": … }`,
 * the server sending the one it holds as the page connects, so a commit
 * landing while the page loaded is never missed. A kind the page does not
 * know is dropped, as weft's studio drops one, and so is a map that fails
 * core's guard: the page keeps the map it has (C2). A map on the same ground
 * as the one shown, one layout with the same cells and files on it, has its
 * weather cross-faded in over the terrain the world already draws (P2); one
 * on other ground, a file added or gone, is drawn afresh at the framing the
 * reader stands at. Pure, so a test reads it straight.
 */

import { assertMap } from 'core';
import type { MapJson } from 'core';
import type { Point } from 'scene';

import { servedToken } from './load.js';

/** Where the reader stands: the camera's zoom over the fit, its tilt off overhead in degrees, and the layout point the free screen is centred on. */
export type Framing = { readonly zoom: number; readonly tilt: number; readonly centre?: Point | undefined };

/** The socket a served page opens: the served `/socket` with the run's token; none for a page that names a map of its own, which nobody serves who could send one (D178). */
export const socketUrl = (search: string, host: string): string | undefined => {
  const token = servedToken(search);
  return token === undefined ? undefined : `ws://${host}/socket?token=${encodeURIComponent(token)}`;
};

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The map a socket's message pushed, held to the contract; none for a kind the page does not know, text that is not JSON, or a map core's guard refuses. */
export const pushedMap = (text: string): MapJson | undefined => {
  try {
    const message: unknown = JSON.parse(text);
    return isRecord(message) && message['kind'] === 'map' ? assertMap(message['map']) : undefined;
  } catch {
    return undefined;
  }
};

/** Whether a pushed map is the one the page already holds: one build, by the moment it was made and the head it was made of. */
export const sameBuild = (a: MapJson, b: MapJson): boolean => a.meta.generated_at === b.meta.generated_at && a.meta.head === b.meta.head;

/** The files a map places, by id, in its order. */
const placed = (map: MapJson): string => map.terrain.organelles.map((organelle) => organelle.id).join('\n');

/** Whether two maps lie on one ground: the same layout, cells and files, so the second's weather can cross-fade over what the world drew for the first (P2). */
export const sameGround = (a: MapJson, b: MapJson): boolean =>
  a.meta.mode === b.meta.mode && placed(a) === placed(b) && JSON.stringify(a.terrain.layout) === JSON.stringify(b.terrain.layout) && JSON.stringify(a.terrain.cells) === JSON.stringify(b.terrain.cells);

/** A number as a URL carries it: a few places, no more. */
const short = (value: number, places: number): string => String(Number(value.toFixed(places)));

/** The page's address with the framing in its query (`zoom`, `tilt`, `centre`), so a page drawn afresh opens where the reader stood. */
export const framedUrl = (href: string, { zoom, tilt, centre }: Framing): string => {
  const url = new URL(href);
  url.searchParams.set('zoom', short(zoom, 4));
  url.searchParams.set('tilt', short(tilt, 2));
  if (centre === undefined) url.searchParams.delete('centre');
  else url.searchParams.set('centre', `${short(centre[0], 2)},${short(centre[1], 2)}`);
  return url.href;
};
