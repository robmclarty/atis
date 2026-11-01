/**
 * cache: a written tour kept by its head's sha in `atis/tours/` under the
 * reviewed repository's git directory, `git rev-parse --git-common-dir`, as
 * atis keeps its own cache (D177, D190), so asking again for the same change
 * calls no model, from any worktree of it, and nothing is written in the
 * working tree. A kept tour is used only when it was written for the same
 * base and head as the map asked about (D183); a working tree's map names no
 * commit, and a directory git finds no repository in has no git directory, so
 * neither is ever kept. A `.atis/tours/` an older tour left in the working
 * tree is neither read nor removed.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import type { Tour } from './tour.js';

/** What a working tree's map names as its head, which no commit is. */
const WORKING_TREE = 'working-tree';

/** Where a tour is kept, or why it is not. */
type CachePlace = { readonly path: string } | { readonly unkept: string };

/** The git directory every worktree of `repo` shares, as git names it there; none where git finds no repository. */
const commonDirectory = (repo: string): string | undefined => {
  try {
    return resolve(repo, execFileSync('git', ['rev-parse', '--git-common-dir'], { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim());
  } catch {
    return undefined;
  }
};

/** Where the tour of `head` is kept in `repo`, or why it is not: a working tree names no commit, and no repository has no git directory. */
export const cachePath = (repo: string, head: string): CachePlace => {
  if (head === WORKING_TREE || !/^[0-9a-f]{7,64}$/.test(head)) return { unkept: 'a working tree names no commit' };
  const common = commonDirectory(repo);
  return common === undefined ? { unkept: `git finds no repository at ${repo}` } : { path: join(common, 'atis', 'tours', `${head}.json`) };
};

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
  const place = cachePath(repo, head);
  if ('unkept' in place || !existsSync(place.path)) return undefined;
  const tour = readTour(readFileSync(place.path, 'utf8'));
  return tour?.base === base && tour.head === head ? { tour, path: place.path } : undefined;
};

/** Keep `tour` for its head in `repo`, atomically, under its git directory. Returns where it went, or why it was not kept. */
export const keepTour = (repo: string, tour: Tour): CachePlace => {
  const place = cachePath(repo, tour.head);
  if ('unkept' in place) return place;
  mkdirSync(dirname(place.path), { recursive: true });
  const partial = `${place.path}.partial`;
  writeFileSync(partial, tourText(tour));
  renameSync(partial, place.path);
  return place;
};
