/**
 * cache: a written tour kept by its head's sha under the reviewed
 * repository's `.atis/tours/` (D177), so asking again for the same change
 * calls no model. A kept tour is used only when it was written for the same
 * base and head as the map asked about (D183); a working tree's map names no
 * commit, so it is never kept. `.atis/` ignores itself in git, as atis's own
 * cache leaves it, so the tour never edits the repository's ignores.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Tour } from './tour.js';

/** What a working tree's map names as its head, which no commit is. */
const WORKING_TREE = 'working-tree';

/** Where the tour of `head` is kept in `repo`, or none for a working tree. */
export const cachePath = (repo: string, head: string): string | undefined => (head === WORKING_TREE || !/^[0-9a-f]{7,64}$/.test(head) ? undefined : join(repo, '.atis', 'tours', `${head}.json`));

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** A tour as written, read back: its base, head and stops, or none when the text holds no tour. */
export const readTour = (text: string): Tour | undefined => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (!isRecord(parsed) || typeof parsed['base'] !== 'string' || typeof parsed['head'] !== 'string' || !Array.isArray(parsed['stops'])) return undefined;
  const stops = parsed['stops'].flatMap((stop: unknown) =>
    isRecord(stop) && typeof stop['target'] === 'string' && typeof stop['sentence'] === 'string' && typeof stop['notice'] === 'number' ? [{ target: stop['target'], sentence: stop['sentence'], notice: stop['notice'] }] : [],
  );
  return stops.length === parsed['stops'].length ? { base: parsed['base'], head: parsed['head'], stops } : undefined;
};

/** The tour as `tour.json` holds it: the base, the head, then the stops, two-space indented with a closing newline. */
export const tourText = (tour: Tour): string => `${JSON.stringify({ base: tour.base, head: tour.head, stops: tour.stops.map(({ target, sentence, notice }) => ({ target, sentence, notice })) }, undefined, 2)}\n`;

/** The tour kept for this base and head in `repo`, if one is. */
export const keptTour = (repo: string, base: string, head: string): { readonly tour: Tour; readonly path: string } | undefined => {
  const path = cachePath(repo, head);
  if (path === undefined || !existsSync(path)) return undefined;
  const tour = readTour(readFileSync(path, 'utf8'));
  return tour?.base === base && tour.head === head ? { tour, path } : undefined;
};

/** Keep `tour` for its head in `repo`, atomically, under a `.atis/` that ignores itself. Returns where it went, or none for a working tree. */
export const keepTour = (repo: string, tour: Tour): string | undefined => {
  const path = cachePath(repo, tour.head);
  if (path === undefined) return undefined;
  const directory = join(repo, '.atis');
  mkdirSync(join(directory, 'tours'), { recursive: true });
  const ignore = join(directory, '.gitignore');
  if (!existsSync(ignore)) writeFileSync(ignore, '*\n');
  const partial = `${path}.partial`;
  writeFileSync(partial, tourText(tour));
  renameSync(partial, path);
  return path;
};
