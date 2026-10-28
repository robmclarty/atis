/**
 * tour: a reviewer's tour the CLI serves beside the map (D112, D183), as
 * `apps/tour` wrote it: the base and head of the map it was written for,
 * then stops in the order to review them, each a target, one sentence, and
 * the notice it explains by its rank. The page asks for it only when the URL
 * it was opened at says one is served, so a run with none asks for nothing
 * and shows nothing new; it plays the tour only over the map it was written
 * for, which a pushed map or a switched base may no longer be, and drops a
 * stop the map it draws gives the world nowhere to fly. Each stop is flown to
 * as a highlight is (D178): the camera goes to its target, the target's
 * labels are written, and its notice flares. Pure but for the one fetch,
 * injected.
 */

import type { MapJson } from 'core';

import { litIn } from './highlight.js';
import type { Highlight } from './highlight.js';
import type { FetchMap } from './load.js';

/** One stop of a tour: where the world flies, what the chrome says there, and the notice it explains, by rank. */
export type TourStop = { readonly target: string; readonly sentence: string; readonly notice: number };

/** A tour: the base and head of the map it was written for, then its stops in order. */
export type Tour = { readonly base: string; readonly head: string; readonly stops: readonly TourStop[] };

/** Where the served tour is read: `/tour.json` with the run's token, when the page was served one; none for a page the CLI served no tour, or one that names a map of its own (D93). */
export const tourUrl = (search: string): string | undefined => {
  const params = new URLSearchParams(search);
  const token = params.get('token');
  return params.get('map') !== null || token === null || !params.has('tour') ? undefined : `/tour.json?token=${encodeURIComponent(token)}`;
};

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A tour as read from its JSON; none for anything that is not one, a stop that is not one included. */
export const readTour = (value: unknown): Tour | undefined => {
  if (!isRecord(value) || typeof value['base'] !== 'string' || typeof value['head'] !== 'string' || !Array.isArray(value['stops'])) return undefined;
  const listed: readonly unknown[] = value['stops'];
  const stops = listed.flatMap((stop) =>
    isRecord(stop) && typeof stop['target'] === 'string' && typeof stop['sentence'] === 'string' && typeof stop['notice'] === 'number' ? [{ target: stop['target'], sentence: stop['sentence'], notice: stop['notice'] }] : [],
  );
  return stops.length === listed.length ? { base: value['base'], head: value['head'], stops } : undefined;
};

/** Fetch the served tour; one that does not arrive or does not read as a tour is none, and the chrome plays nothing. */
export const loadTour = async (url: string, fetchTour: FetchMap): Promise<Tour | undefined> => {
  try {
    const response = await fetchTour(url);
    return response.ok ? readTour(await response.json()) : undefined;
  } catch {
    return undefined;
  }
};

/** What the world is asked to show for a stop: its target, lit with its notice. */
export const stopHighlight = (stop: TourStop): Highlight => ({ kind: 'stop', target: stop.target, rank: stop.notice });

/** Whether a tour was written for this map: the same base and the same head (D183). */
export const tourFits = (map: MapJson, tour: Tour): boolean => tour.base === map.meta.base && tour.head === map.meta.head;

/** The stops of a tour the world can play over this map: none when it was written for another, and only those the map gives the world somewhere to fly. */
export const playable = (map: MapJson, tour: Tour): readonly TourStop[] => (tourFits(map, tour) ? tour.stops.filter((stop) => litIn(map, stopHighlight(stop)) !== undefined) : []);
