/**
 * load: where the app finds its map, and the one read of it. The app reads
 * only what it is served (D93): the map at `?map=<url>` when the page names
 * one, else the `/map.json` the CLI serves beside the assets. A map that does
 * not arrive, or does not pass core's guard, is a failure the chrome names,
 * never a map drawn from a default (C2).
 */

import { assertMap } from 'core';
import type { MapJson } from 'core';

/** Where the map comes from: the page's `map` parameter, else the served `/map.json`. */
export const mapUrl = (search: string): string => new URLSearchParams(search).get('map') ?? '/map.json';

/** The map as the app holds it: on its way, read and trusted, or failed with the reason. */
export type MapState =
  | { readonly status: 'loading'; readonly url: string }
  | { readonly status: 'ready'; readonly url: string; readonly map: MapJson }
  | { readonly status: 'failed'; readonly url: string; readonly reason: string };

/** The one fetch the load makes, injected so a test needs no server. */
export type FetchMap = (url: string) => Promise<Pick<Response, 'ok' | 'status' | 'json'>>;

/** Fetch the map and hold it to the contract; every failure comes back as a state with its reason, never as a throw. */
export const loadMap = async (url: string, fetchMap: FetchMap): Promise<MapState> => {
  try {
    const response = await fetchMap(url);
    if (!response.ok) return { status: 'failed', url, reason: `the server answered ${response.status}` };
    return { status: 'ready', url, map: assertMap(await response.json()) };
  } catch (error) {
    return { status: 'failed', url, reason: error instanceof Error ? error.message : String(error) };
  }
};
