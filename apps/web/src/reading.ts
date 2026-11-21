/**
 * reading: the inspector's map view, what it says with nothing selected
 * (D208 (side-panels)). A reading of the map from its structure alone: the
 * largest modules and files, the most depended-on and the most
 * outward-reaching modules, the imports that go past an interface, the files
 * no entry point reaches, the longest functions, the outside packages the
 * terrain imports, then the departures from the approved shape.
 *
 * It reads only what git and atis's own scan put on the map (D251
 * (reading-no-checks)): never a rule a file breaks, a clone family, a count
 * a health report gave, the evidence or a check's verdict. So it reads the
 * same where no check ran as where every one did, which is where a review of
 * an app nobody wrote checks for starts. The one thing an audit adds is an
 * outside package's hue, and where none was read the row says so.
 *
 * It is of the head (D254 (reading-of-head)): a file the change deleted is
 * still on the map, and is left out of every list of files and of functions.
 * A module's own counts are the map's, which holds that file until the next
 * terrain.
 *
 * Each list is short and ranked, and each row carries the stop a click on it
 * selects. A list with no rows says which of two things it means: `empty`,
 * that the map measured none, or `muted`, why the map could not say (C2).
 * The outside packages alone are listed whole, worst first, since this list
 * is their only place on the screen now that the planet is gone (D252
 * (packages-whole), D213 (planet-goes)). Pure: no React, no DOM.
 */

import type { Cell, Dependency, MapJson, Organelle } from 'core';
import { starHue } from 'scene';
import type { StarHue } from 'scene';

import { counted, departuresIn } from './inspector.js';
import type { Departures } from './inspector.js';
import type { Selected } from './nav.js';

/** How many rows a ranked list shows at most, until the panel's size is a live token of its own. */
export const READING_ROWS = 5;

/** The lists of a reading, by their id, in the order the map view draws them. */
export const READING_ORDER = ['largest-modules', 'largest-files', 'most-depended-on', 'most-outward', 'past-interface', 'unreachable', 'longest-functions', 'outside-packages'] as const;

export type ReadingId = (typeof READING_ORDER)[number];

/**
 * One row of a list: the thing's name, what it is ranked by in words, and
 * what else the row says. `muted` is something about the row the map did not
 * measure, written muted; `selects` is the stop a click selects, none for an
 * outside package, which is no place on the map; `hue` is a package's health
 * by the scene's rule for a star.
 */
export type ReadingRow = {
  readonly words: string;
  readonly count: string;
  readonly tail?: string;
  readonly muted?: string;
  readonly selects?: Selected;
  readonly hue?: StarHue;
};

/**
 * One list of the reading: its rows, the first `rows.length` of the `of` it
 * ranked. With no rows, exactly one of `empty`, the map measured none, and
 * `muted`, the map could not say and why. `note` is what a reader should
 * know of how the list was measured.
 */
export type ReadingList = {
  readonly id: ReadingId;
  readonly title: string;
  readonly rows: readonly ReadingRow[];
  readonly of: number;
  readonly empty?: string;
  readonly muted?: string;
  readonly note?: string;
};

/** The map view: the structure's lists in their order, then the departures from the approved shape. */
export type Reading = { readonly lists: readonly ReadingList[]; readonly departures: Departures };

const byText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

const cellStop = (cell: Cell): Selected => ({ kind: 'cell', cell: cell.id });
const fileStop = (file: Organelle): Selected => ({ kind: 'organelle', path: file.id, cell: file.cell });

/** A cell in a row's tail: a package or a module, so a package and the loose files at its root, which share a path, read apart (D218 (departure-cell)). */
const nounOf = (cell: Cell): string => (cell.kind === 'package' ? 'package' : cell.kind === 'directory' ? 'module, a directory' : 'module');

/** A ranked list cut to its first `most` rows, or the words for none. */
const ranked = (id: ReadingId, title: string, rows: readonly ReadingRow[], most: number, empty: string): ReadingList =>
  rows.length === 0 ? { id, title, rows, of: 0, empty } : { id, title, rows: rows.slice(0, Math.max(0, most)), of: rows.length };

const mutedList = (id: ReadingId, title: string, muted: string): ReadingList => ({ id, title, rows: [], of: 0, muted });

/** How many files each cell holds inside its contour, its held cells' included, as its lines are counted (D250 (contour-counts)). */
const filesInside = (cells: readonly Cell[]): ReadonlyMap<string, number> => {
  const counts = new Map(cells.map((cell) => [cell.id, cell.organelles.length] as const));
  const byId = new Map(cells.map((cell) => [cell.id, cell] as const));
  for (const cell of cells) {
    const seen = new Set([cell.id]);
    let holder = cell.parent === undefined ? undefined : byId.get(cell.parent);
    while (holder !== undefined && !seen.has(holder.id)) {
      seen.add(holder.id);
      counts.set(holder.id, (counts.get(holder.id) ?? 0) + cell.organelles.length);
      holder = holder.parent === undefined ? undefined : byId.get(holder.parent);
    }
  }
  return counts;
};

const largestModules = (map: MapJson, most: number): ReadingList => {
  const files = filesInside(map.terrain.cells);
  const rows = map.terrain.cells
    .toSorted((a, b) => b.body_loc - a.body_loc || byText(a.id, b.id))
    .map((cell): ReadingRow => ({ words: cell.path, count: counted(cell.body_loc, 'line'), tail: `${nounOf(cell)}, ${counted(files.get(cell.id) ?? 0, 'file')}`, selects: cellStop(cell) }));
  return ranked('largest-modules', 'largest modules', rows, most, 'the map holds no module');
};

const largestFiles = (files: readonly Organelle[], most: number): ReadingList => {
  const rows = files.toSorted((a, b) => b.loc - a.loc || byText(a.id, b.id)).map((file): ReadingRow => ({ words: file.id, count: counted(file.loc, 'line'), selects: fileStop(file) }));
  return ranked('largest-files', 'largest files', rows, most, 'the map holds no file');
};

/** The modules with the most of one fan, those with none left out; muted where the map carries the fan for no module. */
const byFan = (map: MapJson, most: number, id: ReadingId, title: string, fanOf: (cell: Cell) => number | undefined, words: (fan: number) => string, empty: string): ReadingList => {
  const fans = map.terrain.cells.flatMap((cell) => {
    const fan = fanOf(cell);
    return fan === undefined ? [] : [{ cell, fan }];
  });
  if (fans.length === 0 && map.terrain.cells.length > 0) return mutedList(id, title, 'the map carries no fan for its modules');
  const rows = fans
    .filter(({ fan }) => fan > 0)
    .toSorted((a, b) => b.fan - a.fan || byText(a.cell.id, b.cell.id))
    .map(({ cell, fan }): ReadingRow => ({ words: cell.path, count: words(fan), tail: nounOf(cell), selects: cellStop(cell) }));
  return ranked(id, title, rows, most, empty);
};

/**
 * Why a map carries the count for no module (D192, C2). The count is a key
 * of its own, which a map written before it lacks on modules that do have an
 * interface file, so the reason is read from the interface files and never
 * from the count's absence alone: there is none to go past, the change
 * deleted each one, or there are some and the map did not count.
 */
const uncountedWhy = (map: MapJson): string => {
  const { cells } = map.terrain;
  if (cells.length === 0) return 'the map holds no module';
  const interfaces = cells.flatMap((cell) => cell.barrel ?? []);
  if (interfaces.length === 0) return 'no module has an interface file, so nothing can be seen to go past one';
  const deleted = new Set(map.weather.changed.filter((file) => file.kind === 'deleted').map((file) => file.path));
  if (interfaces.every((path) => deleted.has(path))) return 'the change deleted every interface file, so nothing can be seen to go past one';
  return 'the map carries no count of what goes through or past an interface';
};

/**
 * The modules entered past their interface (D192), the most first. Only a
 * module with an interface file at head is measured, so the list is muted
 * where none was, with why, and says how many went unmeasured where some were.
 */
const pastInterface = (map: MapJson, most: number): ReadingList => {
  const id = 'past-interface';
  const title = 'imports past an interface';
  const { cells } = map.terrain;
  const measured = cells.flatMap((cell) => (cell.integrity === undefined ? [] : [{ cell, ...cell.integrity }]));
  if (measured.length === 0) return mutedList(id, title, uncountedWhy(map));
  const rows = measured
    .filter(({ past }) => past > 0)
    .toSorted((a, b) => b.past - a.past || byText(a.cell.id, b.cell.id))
    .map(({ cell, past, through }): ReadingRow => ({ words: cell.path, count: `${String(past)} past`, tail: `${String(through)} through, ${nounOf(cell)}`, selects: cellStop(cell) }));
  const unmeasured = cells.length - measured.length;
  // A directory has no interface file, a single file is its own, and a deleted one is gone: none is one an import could go past.
  const note = unmeasured === 0 ? {} : { note: `${counted(unmeasured, 'module is', 'modules are')} not measured: ${unmeasured === 1 ? 'it has no' : 'none has an'} interface file an import could go past` };
  return { ...ranked(id, title, rows, most, 'no import goes past an interface'), ...note };
};

/** The files no entry point reaches, the largest first, with where the entry points were read from when it was the manifests alone (D22). */
const unreachable = (map: MapJson, files: readonly Organelle[], most: number): ReadingList => {
  const rows = files
    .filter((file) => !file.reachable)
    .toSorted((a, b) => b.loc - a.loc || byText(a.id, b.id))
    .map((file): ReadingRow => ({ words: file.id, count: counted(file.loc, 'line'), selects: fileStop(file) }));
  const { entry_points: source, entry_points_reason: reason } = map.meta.instruments;
  const note = source === 'manifests' ? { note: `the entry points were read from the manifests alone${reason === undefined ? '' : `: ${reason}`}` } : {};
  return { ...ranked('unreachable', 'unreachable files', rows, most, 'an entry point reaches every file'), ...note };
};

/** The longest functions the head scan read, each selecting its file; muted where it read functions in no file (D102). */
const longestFunctions = (files: readonly Organelle[], most: number): ReadingList => {
  const id = 'longest-functions';
  const title = 'longest functions';
  const read = files.filter((file) => file.functions !== undefined);
  if (read.length === 0) return mutedList(id, title, files.length === 0 ? 'the map holds no file' : 'the head scan read no functions');
  const rows = read
    .flatMap((file) => (file.functions ?? []).map((fn) => ({ file, fn })))
    .toSorted((a, b) => b.fn.line_count - a.fn.line_count || byText(a.file.id, b.file.id) || a.fn.line - b.fn.line)
    .map(({ file, fn }): ReadingRow => ({ words: fn.name, count: counted(fn.line_count, 'line'), tail: `${file.id}:${String(fn.line)}`, selects: fileStop(file) }));
  return ranked(id, title, rows, most, 'the files hold no function');
};

/** A package's hues, worst first: the order its list is ranked in before its importers. */
const HUE_ORDER: Readonly<Record<StarHue, number>> = { ifr: 0, amber: 1, change: 2, clean: 3, unread: 3 };

/** What a package's row says past its importers: the advisories that name it, else what the change did to it, else that an audit found none. */
const healthOf = (dependency: Dependency): string | undefined => {
  const advisories = dependency.advisories ?? 0;
  const moved = dependency.change === undefined ? undefined : dependency.change === 'added' ? 'added by this change' : 'range moved by this change';
  if (advisories > 0) return [`${counted(advisories, 'advisory', 'advisories')}${dependency.severity === undefined ? '' : `, ${dependency.severity}`}`, ...(moved === undefined ? [] : [moved])].join(', ');
  return moved ?? (dependency.advisories === undefined ? undefined : 'no advisory');
};

/**
 * The outside packages the terrain imports (D170), every one, worst first
 * and then by how many files import it (D252 (packages-whole)). Its hue is
 * the scene's rule for a star, and a package no audit read says so, muted,
 * since no audit is no evidence and not a clean one (C2).
 */
const outsidePackages = (map: MapJson): ReadingList => {
  const id = 'outside-packages';
  const title = 'outside packages';
  const { dependencies } = map.weather;
  if (dependencies === undefined) return mutedList(id, title, "the head scan recorded no file's imports by package");
  const rows = dependencies
    .map((dependency) => ({ dependency, hue: starHue(dependency) }))
    .toSorted((a, b) => HUE_ORDER[a.hue] - HUE_ORDER[b.hue] || b.dependency.importers - a.dependency.importers || byText(a.dependency.name, b.dependency.name))
    .map(({ dependency, hue }): ReadingRow => {
      const tail = healthOf(dependency);
      return {
        words: dependency.name,
        count: `${counted(dependency.importers, 'file imports', 'files import')} it`,
        ...(tail === undefined ? {} : { tail }),
        ...(dependency.advisories === undefined ? { muted: 'no audit was read' } : {}),
        hue,
      };
    });
  return ranked(id, title, rows, rows.length, 'the terrain imports no outside package');
};

/**
 * The map view's reading of a map, each ranked list cut to `most` rows. The
 * lists come in `READING_ORDER`, every one of them on every map, so a list
 * the map cannot fill still says why.
 */
export const readingOf = (map: MapJson, most: number = READING_ROWS): Reading => {
  const deleted = new Set(map.weather.changed.filter((file) => file.kind === 'deleted').map((file) => file.path));
  const files = map.terrain.organelles.filter((file) => !deleted.has(file.id));
  const lists: Readonly<Record<ReadingId, ReadingList>> = {
    'largest-modules': largestModules(map, most),
    'largest-files': largestFiles(files, most),
    'most-depended-on': byFan(
      map,
      most,
      'most-depended-on',
      'most depended-on',
      (cell) => cell.fan_in,
      (fan) => `${counted(fan, 'file outside reads', 'files outside read')} it`,
      'no module is read from outside it',
    ),
    'most-outward': byFan(
      map,
      most,
      'most-outward',
      'most outward-reaching',
      (cell) => cell.fan_out,
      (fan) => `reads ${counted(fan, 'file')} outside it`,
      'no module reads outside itself',
    ),
    'past-interface': pastInterface(map, most),
    unreachable: unreachable(map, files, most),
    'longest-functions': longestFunctions(files, most),
    'outside-packages': outsidePackages(map),
  };
  return { lists: READING_ORDER.map((id) => lists[id]), departures: departuresIn(map) };
};
