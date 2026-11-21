/**
 * inspector: what the inspector says of the selection, in words, read from
 * the map alone (D208 (side-panels)). A module is its facts, the files inside
 * it with the change's and the notices' marks, the modules it holds, its
 * exports with the names the reach crossed its membrane by lit, the notices
 * on it and its departures from the approved shape. A file is its facts, what
 * the change did to it with the changed lines no test ran and the mutants
 * still alive, the notices on it, and its functions. With nothing selected,
 * or a selection the map no longer holds, it is the map view, which
 * `reading.ts` reads.
 *
 * Nothing here is a number the map did not measure (C2). Every fact is
 * `Measured`: a value, or the reason it has none, which the panel writes
 * muted. A count of none is a value; a count nothing took is a reason.
 *
 * A module is counted by its whole contour (D250 (contour-counts)): its own
 * files and those of every module it holds, as the map counts its fans and
 * what goes through and past its interface. Its files and its lines are what
 * the head holds there (D332 (counts-of-head)): a file the map's change
 * deleted still has a place on the terrain, and is counted for neither, as
 * the approved shape counts neither (D300 (held-at-head)), so a departure's
 * `was` and `now` are the numbers the facts beside it give. How many the
 * change deleted is said after the count. Its departures are its contour's
 * too (D270 (departures-by-contour)).
 *
 * The words are the panels' plain nouns (D216 (plain-nouns)): package,
 * module, file and function, beside the map's own. Pure: no React, no DOM,
 * so a test reads the models straight.
 */

import type { Cell, ChangeKind, ChangedFile, Departure, DepartureKind, Hunk, MapJson, Mutant, NoticeTier, Organelle } from 'core';
import { crossingsOf, fileLevelOf } from 'scene';
import type { FileLevel } from 'scene';

import { rangeOf } from './diff.js';
import { selectedOf } from './nav.js';
import type { Selected } from './nav.js';
import { thresholdsOf } from './notices.js';

/** What an added file's path is written with, wherever the map writes it (D120). */
const ADDED = '+';
/** The minus sign a tally is written with, and the separator between a line's parts. */
const MINUS = '−';
const DOT = '·';

/** How many characters of a commit's sha a panel writes. */
const SHORT_SHA = 7;

/** A value the map measured, or the reason it has none, which is written muted and never as a number (C2). */
export type Measured<T> = { readonly value: T } | { readonly muted: string };

/** One fact about the selection: what it is called, and its value in words or why the map has none. */
export type Fact = { readonly label: string } & Measured<string>;

/** One step of the way down to the selection, from the map: its name there, and what a click on it selects, the map's own step clearing the selection. */
export type Crumb = { readonly words: string; readonly selects?: Selected };

/** A notice on the selection: its rank in the list, its tier and kind, and why it was raised, with the thresholds that raised it. */
export type NoticeMark = { readonly rank: number; readonly tier: NoticeTier; readonly kind: string; readonly why: string; readonly thresholds: string };

/** One file inside a module: what a click on its row selects, its name below the module, its lines, the module it sits in where that is one the module holds, what the change did to it, and the ranks of the notices on it. */
export type FileRow = {
  readonly selects: Selected;
  readonly path: string;
  readonly words: string;
  readonly lines: number;
  readonly held?: string;
  readonly change?: ChangeKind;
  readonly notices: readonly number[];
};

/** One module a module holds: what a click on its row selects, its name below its holder, and its files and lines as the head holds them. */
export type ModuleRow = { readonly selects: Selected; readonly words: string; readonly files: number; readonly lines: number };

/** One exported name: lit where the reach crossed the module's membrane by it, with the files outside the module it carried the reach to, nearest first. */
export type ExportRow = { readonly name: string; readonly lit: boolean; readonly reached: readonly string[] };

/**
 * A module's interface: how many names it exports and, where the head scan
 * read them, each name (D162), else why there are none to write. `unlit` is
 * why no name can be lit, set where the change reaches files and the map
 * records no name that carried it (D111, C2).
 */
export type Exports = { readonly count: number; readonly names: Measured<readonly ExportRow[]>; readonly unlit?: string };

/**
 * One departure from the approved shape (D210 (approved-block)): what
 * happened, in words, to the module or the outside package `target` names,
 * and why it is told. `cell` is the module the map says it is about, none
 * for an outside package, and what tells two rows of one kind at one path
 * apart: a package and the loose files at its root share a path (D218
 * (departure-cell)), and `loose` says the row is about the loose files,
 * which a panel writes beside the path (D255 (loose-files)). `selects` is
 * the module a click on its row selects, none for a module that is gone,
 * which the panel writes muted, and none for an outside package. `count` is
 * what the kind counts, as approved and as it stands, a side that was not
 * measured left out.
 */
export type DepartureRow = {
  readonly kind: DepartureKind;
  readonly words: string;
  readonly target: string;
  readonly cell?: string;
  readonly loose: boolean;
  readonly selects?: Selected;
  readonly gone: boolean;
  readonly why: string;
  readonly count?: string;
  readonly names: readonly string[];
};

/** A map's departures from the approved shape, or a module's: no shape approved yet, in the words that say so, or the head it was approved at and each departure since, none where the shape is kept. */
export type Departures = { readonly approved: false; readonly words: string } | { readonly approved: true; readonly words: string; readonly rows: readonly DepartureRow[] };

/** A selected module. */
export type ModuleModel = {
  readonly kind: 'module';
  readonly selected: Selected;
  /** `package` for a workspace package, `module` for every other body. */
  readonly noun: 'package' | 'module';
  readonly path: string;
  readonly trail: readonly Crumb[];
  readonly facts: readonly Fact[];
  /** Every file inside its contour, by path (D250 (contour-counts)). */
  readonly files: readonly FileRow[];
  readonly holds: readonly ModuleRow[];
  readonly exports: Exports;
  /** The notices on the module itself and on the files inside it, in rank order. */
  readonly notices: readonly NoticeMark[];
  readonly departures: Departures;
};

/** One function of a file: where it starts, how many lines it spans, how many of the file's other functions hold it, and the thresholds it breaks where a health report was read. */
export type FunctionRow = { readonly name: string; readonly line: number; readonly lines: number; readonly depth: number; readonly breaches: Measured<readonly string[]> };

/**
 * What the change did to a file: its kind, the path it was renamed from, its
 * lines added and deleted, its hunks and their line ranges in words, the
 * changed lines no test ran, and the mutants still alive on them. `unnamed`
 * says the lines are every changed line, since no report names the file (D80).
 */
export type FileChange = {
  readonly kind: ChangeKind;
  readonly from?: string;
  readonly added: number;
  readonly deleted: number;
  readonly hunks: readonly Hunk[];
  readonly ranges: readonly string[];
  readonly untested: Measured<readonly number[]>;
  readonly unnamed?: string;
  readonly mutants: Measured<readonly Pick<Mutant, 'line' | 'status'>[]>;
};

/** A selected file. */
export type FileModel = {
  readonly kind: 'file';
  readonly selected: Selected;
  readonly path: string;
  /** The path as the map writes it, an added file's with its leading `+` (D120). */
  readonly title: string;
  readonly trail: readonly Crumb[];
  readonly facts: readonly Fact[];
  /** Set exactly where the change touched the file. */
  readonly change?: FileChange;
  readonly notices: readonly NoticeMark[];
  readonly functions: Measured<readonly FunctionRow[]>;
};

/** What the inspector shows: the map view, a module, or a file. */
export type Inspected = { readonly kind: 'map' } | ModuleModel | FileModel;

const byText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

const fact = (label: string, value: string): Fact => ({ label, value });
const mutedFact = (label: string, muted: string): Fact => ({ label, muted });

/** `1 file`, `2 files`. */
export const counted = (count: number, one: string, many = `${one}s`): string => `${String(count)} ${count === 1 ? one : many}`;

/** Line numbers in words, each run of neighbours written by its two ends: `12-18, 31`. */
export const runsIn = (lines: readonly number[]): string => {
  const runs: [number, number][] = [];
  for (const line of [...new Set(lines)].toSorted((a, b) => a - b)) {
    const last = runs.at(-1);
    if (last !== undefined && line === last[1] + 1) last[1] = line;
    else runs.push([line, line]);
  }
  return runs.map(([from, to]) => (from === to ? String(from) : `${String(from)}-${String(to)}`)).join(', ');
};

/** What a cell is called in a panel: a package, or a module and what makes it one. */
const MODULE_WORDS: Readonly<Record<Cell['kind'], string>> = {
  package: 'package',
  folder: 'module, a folder with an interface file',
  single: 'module, a single file',
  directory: 'module, a directory with no interface file',
};

/** A path below the path of what holds it, and whole where its holder's is not above it. */
const below = (path: string, holder: string | undefined): string => (holder !== undefined && path.startsWith(`${holder}/`) ? path.slice(holder.length + 1) : path);

/** What the directory at a package's own path is written as, since its path names the package (D255 (loose-files)). */
export const LOOSE_FILES = 'loose files';

/**
 * A module's name under the module that holds it: its path below its
 * holder's, as the breadcrumb names a cell. The loose files at a package's
 * root are a directory with the package's own path (D218 (departure-cell)),
 * which would read as the package twice, so they are named for what they are
 * (D255 (loose-files)).
 */
const moduleWords = (path: string, holder: string | undefined): string => (path === holder ? LOOSE_FILES : below(path, holder));

/** A file's name in a module's list: its path below the module's, and its own last segment where it is the whole of a single-file module. */
const fileWords = (path: string, holder: string): string => (path === holder ? path.slice(path.lastIndexOf('/') + 1) : below(path, holder));

/** The selection a module's row sets, as `selectedOf` writes it for the cell's id. */
const cellSelection = (cell: Cell): Selected => ({ kind: 'cell', cell: cell.id });

/** The selection a file's row sets, as `selectedOf` writes it for the file's path: its own cell beside it, never a slide's (D209 (selection-line)). */
const fileSelection = (file: Organelle): Selected => ({ kind: 'organelle', path: file.id, cell: file.cell });

/** What the head holds inside one module's contour: how many files and their lines, and how many files there the map's change deleted, which are counted for neither. */
export type HeadTally = { readonly files: number; readonly lines: number; readonly deleted: number };

const NO_TALLY: HeadTally = { files: 0, lines: 0, deleted: 0 };

/**
 * Each module's files and lines as the head holds them, by cell id (D332
 * (counts-of-head)): every file of the cell and of each cell it holds,
 * short of the files the map's own change deleted, which a change map's
 * terrain keeps a place for. It is the count the approved shape takes
 * (D300 (held-at-head)), so the two are one number. A cell with no file
 * left tallies none, and is still in the answer.
 */
export const heldAtHead = (map: MapJson): ReadonlyMap<string, HeadTally> => {
  const parents = new Map(map.terrain.cells.map((cell) => [cell.id, cell.parent] as const));
  const gone = new Set(map.weather.changed.filter((file) => file.kind === 'deleted').map((file) => file.path));
  const tallies = new Map<string, HeadTally>(map.terrain.cells.map((cell) => [cell.id, NO_TALLY] as const));
  for (const file of map.terrain.organelles) {
    const deleted = gone.has(file.path);
    const seen = new Set<string>();
    let id: string | undefined = file.cell;
    while (id !== undefined && !seen.has(id)) {
      seen.add(id);
      const tally = tallies.get(id) ?? NO_TALLY;
      tallies.set(id, deleted ? { ...tally, deleted: tally.deleted + 1 } : { ...tally, files: tally.files + 1, lines: tally.lines + file.loc });
      id = parents.get(id);
    }
  }
  return tallies;
};

/** What the model is read through: the map's cells, files and changed files by their ids, the cells each cell holds and what the head holds in each, each looked up once. */
type Index = {
  readonly map: MapJson;
  readonly cells: ReadonlyMap<string, Cell>;
  readonly held: ReadonlyMap<string, readonly Cell[]>;
  readonly files: ReadonlyMap<string, Organelle>;
  readonly changed: ReadonlyMap<string, ChangedFile>;
  readonly tallies: ReadonlyMap<string, HeadTally>;
};

const indexOf = (map: MapJson): Index => {
  const held = new Map<string, Cell[]>();
  for (const cell of map.terrain.cells) {
    if (cell.parent !== undefined) held.set(cell.parent, [...(held.get(cell.parent) ?? []), cell]);
  }
  return {
    map,
    cells: new Map(map.terrain.cells.map((cell) => [cell.id, cell] as const)),
    held,
    files: new Map(map.terrain.organelles.map((file) => [file.id, file] as const)),
    changed: new Map(map.weather.changed.map((file) => [file.path, file] as const)),
    tallies: heldAtHead(map),
  };
};

/** A cell and every cell it holds, however deep, itself first. */
const contourOf = (index: Index, cell: Cell): readonly Cell[] => {
  const found = new Set([cell]);
  // A set walks what is added to it while it is walked, and holds each cell once, so a map whose parents ran in a ring would still end.
  for (const each of found) {
    for (const inner of index.held.get(each.id) ?? []) found.add(inner);
  }
  return [...found];
};

/** The way down to a cell from the map: each cell that holds it, outermost first, each named below its holder as the breadcrumb names it. */
const trailOf = (index: Index, cell: Cell): readonly Crumb[] => {
  const chain: Cell[] = [];
  let at: Cell | undefined = cell;
  while (at !== undefined && !chain.includes(at)) {
    chain.unshift(at);
    at = at.parent === undefined ? undefined : index.cells.get(at.parent);
  }
  const steps = chain.map((each): Crumb => ({ words: moduleWords(each.path, each.parent === undefined ? undefined : index.cells.get(each.parent)?.path), selects: cellSelection(each) }));
  return [{ words: 'map' }, ...steps];
};

/** The map's notices as marks, by rank, the list's own order (C7). */
const noticesOf = (map: MapJson, on: (target: string) => boolean): readonly NoticeMark[] =>
  map.notices.flatMap((notice, at): NoticeMark[] => (on(notice.target) ? [{ rank: at + 1, tier: notice.tier, kind: notice.kind, why: notice.why, thresholds: thresholdsOf(notice) }] : []));

/** `since approved 3c0ee0a`, or `since approved working tree` for a shape approved over uncommitted work. */
const sinceOf = (at: string): string => `since approved ${at === 'working-tree' ? 'working tree' : at.slice(0, SHORT_SHA)}`;

/** What the panels write where no shape was approved. */
export const NO_APPROVED_SHAPE = 'no approved shape yet: run atis approve';

/** Each kind of departure in the panels' words. */
const DEPARTURE_WORDS: Readonly<Record<DepartureKind, string>> = {
  'module-added': 'module added',
  'module-removed': 'module removed',
  'files-grown': 'more files',
  'lines-grown': 'more lines',
  'interface-widened': 'interface widened',
  'past-interface-up': 'more imports past the interface',
  'fan-out-up': 'more fan out',
  'dependency-added': 'outside package added',
};

/** What a departure counts, as approved and as it stands: both, or the one side that was measured, and nothing where neither was (C2). */
const countOf = ({ was, now }: Departure): string | undefined => {
  if (was !== undefined && now !== undefined) return `${String(was)} → ${String(now)}`;
  if (now !== undefined) return `now ${String(now)}`;
  return was === undefined ? undefined : `was ${String(was)}`;
};

/** The id core writes for a package's cell at a path. */
const packageAt = (path: string): string => `package:${path}`;

/** The paths a package stands at or stood at: each package of the map, and each the departures say came or went. */
const packagePaths = (map: MapJson, departures: readonly Departure[]): ReadonlySet<string> =>
  new Set([...map.terrain.cells.filter((cell) => cell.kind === 'package').map((cell) => cell.path), ...departures.filter((departure) => departure.cell === packageAt(departure.target)).map((departure) => departure.target)]);

/** A departure as its row. Its module is looked up by the cell it names, never by its path, which a package and the loose files at its root share (D218 (departure-cell)). */
const departureRow = (map: MapJson, departure: Departure, packages: ReadonlySet<string>): DepartureRow => {
  const selects = departure.cell === undefined ? undefined : selectedOf(map, departure.cell);
  const count = countOf(departure);
  return {
    kind: departure.kind,
    words: DEPARTURE_WORDS[departure.kind],
    target: departure.target,
    ...(departure.cell === undefined ? {} : { cell: departure.cell }),
    loose: departure.cell === `directory:${departure.target}` && packages.has(departure.target),
    ...(selects === undefined ? {} : { selects }),
    gone: departure.kind === 'module-removed',
    why: departure.why,
    ...(count === undefined ? {} : { count }),
    names: departure.names ?? [],
  };
};

/** How far in a package stands, by its path's length. The root's package is written `.` and holds every path, the outermost of them. */
const depthOf = (cell: Cell): number => (cell.path === '.' ? 0 : cell.path.length);

/**
 * The package of this map a module that is gone stood in: the innermost one
 * whose path holds the module's, as core places a file in its workspace
 * member. A module that is gone is no cell of the map, so its path is all
 * there is to place it by; a package that is gone stood in none.
 */
const heldIn = (map: MapJson, departure: Departure): string | undefined => {
  if (departure.kind !== 'module-removed' || departure.cell === undefined || departure.cell === packageAt(departure.target)) return undefined;
  return map.terrain.cells
    .filter((cell) => cell.kind === 'package' && (cell.path === '.' || departure.target === cell.path || departure.target.startsWith(`${cell.path}/`)))
    .toSorted((a, b) => depthOf(b) - depthOf(a))[0]?.id;
};

/**
 * The map's departures in the map's order: every one, or with a set of cell
 * ids those of the modules it names (D270 (departures-by-contour)). A module
 * that is gone is told with the package it stood in.
 */
const departuresAmong = (map: MapJson, within: ReadonlySet<string> | undefined): Departures => {
  const { approved } = map;
  if (approved === undefined) return { approved: false, words: NO_APPROVED_SHAPE };
  const inside = (id: string | undefined): boolean => id !== undefined && within?.has(id) === true;
  const told = within === undefined ? approved.departures : approved.departures.filter((departure) => inside(departure.cell) || inside(heldIn(map, departure)));
  const packages = packagePaths(map, approved.departures);
  return { approved: true, words: sinceOf(approved.at), rows: told.map((departure) => departureRow(map, departure, packages)) };
};

/**
 * The map's departures from the approved shape, in the map's order, or with
 * a cell's id those of that module (D210 (approved-block)). A module's are
 * its whole contour's (D270 (departures-by-contour)): those about its own
 * cell and about each module it holds, a module that is gone from it among
 * them, as its files, its lines and its notices are counted (D250
 * (contour-counts)). So a package whose module grew does not read as keeping
 * its shape. A map with no approved block says no shape was approved, which
 * is not a shape kept: that one carries the block with no departures.
 */
export const departuresIn = (map: MapJson, cell?: string): Departures => {
  if (cell === undefined) return departuresAmong(map, undefined);
  const index = indexOf(map);
  const at = index.cells.get(cell);
  return departuresAmong(map, new Set(at === undefined ? [cell] : contourOf(index, at).map((each) => each.id)));
};

/** Why a cell carries no count of what goes through and past its interface (D192). */
const unenteredWhy = (index: Index, cell: Cell): string => {
  if (cell.kind === 'directory') return 'a directory has no interface file to go through or past';
  if (cell.kind === 'single') return 'a single file is its own interface';
  if (cell.barrel === undefined) return 'it has no interface file';
  if (index.changed.get(cell.barrel)?.kind === 'deleted') return 'the change deleted its interface file';
  return 'the map carries no count for it';
};

/** A fan as a fact: the count the map carries, or that it carries none. */
const fanFact = (label: string, fan: number | undefined): Fact => (fan === undefined ? mutedFact(label, 'the map carries no count for it') : fact(label, String(fan)));

/** How many files a module holds at the head: all of them, where it holds modules how many are its own, and how many more the change deleted (D332 (counts-of-head)). */
const filesWords = (index: Index, cell: Cell, tally: HeadTally, held: number): string => {
  const own = cell.organelles.filter((path) => index.changed.get(path)?.kind !== 'deleted').length;
  const parts = [String(tally.files), ...(held === 0 ? [] : [`${String(own)} its own, ${String(tally.files - own)} in ${counted(held, 'module')} it holds`]), ...(tally.deleted === 0 ? [] : [`${String(tally.deleted)} deleted by the change`])];
  return parts.join(` ${DOT} `);
};

const moduleFacts = (index: Index, cell: Cell, held: number): readonly Fact[] => {
  const { integrity } = cell;
  const tally = index.tallies.get(cell.id) ?? NO_TALLY;
  const entered = (label: string, count: (entries: NonNullable<Cell['integrity']>) => number): Fact => (integrity === undefined ? mutedFact(label, unenteredWhy(index, cell)) : fact(label, String(count(integrity))));
  return [
    fact('kind', MODULE_WORDS[cell.kind]),
    fact('band', String(cell.band)),
    fact('files', filesWords(index, cell, tally, held)),
    fact('lines', String(tally.lines)),
    fact('interface', counted(cell.exports?.length ?? cell.interface_size, 'export')),
    fanFact('fan in', cell.fan_in),
    fanFact('fan out', cell.fan_out),
    entered('through the interface', (entries) => entries.through),
    entered('past the interface', (entries) => entries.past),
  ];
};

/** A module's interface, its names lit by the reach where the map records the names that carried it (D111, D181). */
const exportsOf = (map: MapJson, cell: Cell): Exports => {
  const count = cell.exports?.length ?? cell.interface_size;
  if (cell.exports === undefined) return { count, names: { muted: 'the head scan read no interface file of it, so its names are not known' } };
  const crossings = new Map((crossingsOf(map, cell.id) ?? []).map((crossing) => [crossing.name, crossing.entries] as const));
  const rows = cell.exports.map((name): ExportRow => {
    const entries = [...(crossings.get(name) ?? [])].toSorted((a, b) => a.hops - b.hops || byText(a.path, b.path));
    return { name, lit: entries.length > 0, reached: entries.map((entry) => entry.path) };
  });
  const named = map.weather.reach.length === 0 || map.weather.reach.some((entry) => entry.names !== undefined);
  return { count, names: { value: rows }, ...(named ? {} : { unlit: 'the map records no name the reach carried, so none is lit' }) };
};

const moduleOf = (index: Index, cell: Cell): ModuleModel => {
  const { map } = index;
  const contour = contourOf(index, cell);
  const files = contour
    .flatMap((each) => each.organelles.flatMap((path) => index.files.get(path) ?? []))
    .toSorted((a, b) => byText(a.id, b.id))
    .map((file): FileRow => {
      const change = index.changed.get(file.id)?.kind;
      return {
        selects: fileSelection(file),
        path: file.id,
        words: `${change === 'added' ? ADDED : ''}${fileWords(file.id, cell.path)}`,
        lines: file.loc,
        ...(file.cell === cell.id ? {} : { held: file.cell }),
        ...(change === undefined ? {} : { change }),
        notices: noticesOf(map, (target) => target === file.id).map((notice) => notice.rank),
      };
    });
  const inside = new Set([...contour.map((each) => each.id), ...files.map((file) => file.path)]);
  const holds = (index.held.get(cell.id) ?? [])
    .toSorted((a, b) => byText(a.id, b.id))
    .map((each): ModuleRow => ({ selects: cellSelection(each), words: moduleWords(each.path, cell.path), files: (index.tallies.get(each.id) ?? NO_TALLY).files, lines: (index.tallies.get(each.id) ?? NO_TALLY).lines }));
  return {
    kind: 'module',
    selected: cellSelection(cell),
    noun: cell.kind === 'package' ? 'package' : 'module',
    path: cell.path,
    trail: trailOf(index, cell),
    facts: moduleFacts(index, cell, contour.length - 1),
    files,
    holds,
    exports: exportsOf(map, cell),
    notices: noticesOf(map, (target) => inside.has(target)),
    departures: departuresAmong(map, new Set(contour.map((each) => each.id))),
  };
};

/** Whether a slot's raw file was stale in this run, which mutes what was read from it (D41): `meta.instruments.stale` names each as `slot: file, …`. */
const staleSlot = (map: MapJson, slot: string): boolean => (map.meta.instruments.stale ?? []).some((entry) => entry.startsWith(`${slot}:`));

/** The rules a file breaks, which is what bends its outline (D146): muted where no `.check/` was trusted or no report that names a rule was read, since the map then writes an empty list and not an absent one (C2). */
const rulesFact = (map: MapJson, file: Organelle): Fact => {
  const label = 'rules broken';
  const { mode, reason, fallow_schemas: read } = map.meta.instruments;
  if (mode !== 'check') return mutedFact(label, `no .check/ was trusted${reason === undefined ? '' : `: ${reason}`}`);
  if (read === undefined || (read.health === undefined && read.dead === undefined)) return mutedFact(label, 'no health or dead-code report was read');
  const unread = read.health === undefined ? ` ${DOT} thresholds not read` : read.dead === undefined ? ` ${DOT} cycles and boundaries not read` : '';
  return fact(label, `${file.dents.length === 0 ? 'none' : file.dents.join(', ')}${unread}`);
};

/** What the change did to a file, in a line; on a whole repo's map, which is of no change, the reason there is nothing to say (D101). */
const changeFact = (map: MapJson, changed: ChangedFile | undefined): Fact => {
  if (map.meta.mode === 'repo') return mutedFact('change', "a whole repo's map is of no change");
  if (changed === undefined) return fact('change', 'unchanged');
  const moved = changed.from === undefined ? changed.kind : `${changed.kind} from ${changed.from}`;
  return fact('change', `${moved} ${DOT} +${String(changed.added)} ${MINUS}${String(changed.deleted)}`);
};

/**
 * Whether an entry point reaches a file (D22). A file one reaches is
 * reached, wherever the entry points were read from. One that none reaches
 * is known to be unreached only where fallow read them: the manifests alone
 * name no page's script and no entry a tool finds by convention, so there
 * the map cannot say, and the fact is muted with why, as any fact the map
 * did not measure is (C2, D338 (reach-by-manifests)).
 */
const reachableFact = (map: MapJson, file: Organelle): Fact => {
  if (file.reachable) return fact('reachable', 'yes');
  const { entry_points: source, entry_points_reason: reason } = map.meta.instruments;
  if (source !== 'manifests') return fact('reachable', 'no');
  return mutedFact('reachable', `no manifest's entry point reaches it, and the entry points were read from the manifests alone${reason === undefined ? '' : `: ${reason}`}`);
};

const fileFacts = (map: MapJson, file: Organelle, changed: ChangedFile | undefined): readonly Fact[] => {
  const gone = changed?.kind === 'deleted';
  const age = file.stability?.age_days ?? file.age_days;
  // A file's own churn wins, and stability's is read where it has none, as its shape reads it (D203).
  const churn = file.churn_ratio ?? file.stability?.churn_ratio;
  return [
    fact('lines', String(file.loc)),
    fact('band', String(file.band)),
    reachableFact(map, file),
    file.ties === undefined
      ? mutedFact('ties', gone ? 'a deleted file ties nothing at head' : 'the map carries no ties for it')
      : fact('ties', `${String(file.ties.inside)} inside its module, ${String(file.ties.outside)} outside`),
    age === undefined ? mutedFact('age', 'the history window never saw it') : fact('age', counted(Math.round(age), 'day')),
    churn === undefined ? mutedFact('churn', age === undefined ? 'the history window never saw it' : 'its size is unknown or zero') : fact('churn', churn.toFixed(2)),
    changeFact(map, changed),
    rulesFact(map, file),
  ];
};

/** The changed lines of a file no test ran, or why none can be named (D80, C2). */
const untestedOf = (map: MapJson, changed: ChangedFile, level: FileLevel): Measured<readonly number[]> => {
  if (staleSlot(map, 'test')) return { muted: "the test slot's report is older than the run" };
  if (map.weather.evidence.patch_coverage === undefined) return { muted: 'no coverage report was read' };
  if (changed.kind === 'deleted') return { muted: 'a deleted file has no line to run' };
  return level.measured ? { value: level.uncovered } : { muted: 'the coverage report counts no changed line of it' };
};

const changeOf = (map: MapJson, changed: ChangedFile, level: FileLevel): FileChange => {
  const unnamed = (map.weather.evidence.unmeasured ?? []).includes(changed.path) && !staleSlot(map, 'test');
  const mutants: FileChange['mutants'] = staleSlot(map, 'mutation')
    ? { muted: "the mutation slot's report is older than the run" }
    : map.weather.evidence.mutants === undefined
      ? { muted: 'no mutation report was read' }
      : { value: level.mutants };
  return {
    kind: changed.kind,
    ...(changed.from === undefined ? {} : { from: changed.from }),
    added: changed.added,
    deleted: changed.deleted,
    hunks: changed.hunks,
    ranges: changed.hunks.map(rangeOf),
    untested: untestedOf(map, changed, level),
    ...(unnamed ? { unnamed: 'no coverage report names the file, so every changed line counts as untested' } : {}),
    mutants,
  };
};

/** A file's functions in line order, each with how deep it nests and the thresholds it breaks; a breach list the map lacks is no evidence, not no breach (D102, C2). */
const functionsOf = (file: Organelle, gone: boolean, level: FileLevel): Measured<readonly FunctionRow[]> => {
  if (file.functions === undefined) return { muted: gone ? 'a deleted file has no functions at head' : 'the head scan read no functions in it' };
  const rows = file.functions.map(
    (fn, at): FunctionRow => ({
      name: fn.name,
      line: fn.line,
      lines: fn.line_count,
      depth: level.granules[at]?.depth ?? 0,
      breaches: fn.breaches === undefined ? { muted: 'no health report was read' } : { value: fn.breaches },
    }),
  );
  return { value: rows };
};

const fileOf = (index: Index, file: Organelle, level: FileLevel): FileModel => {
  const { map } = index;
  const changed = index.changed.get(file.id);
  const cell = index.cells.get(file.cell);
  const name = file.id.slice(file.id.lastIndexOf('/') + 1);
  const mark = changed?.kind === 'added' ? ADDED : '';
  const selected = fileSelection(file);
  return {
    kind: 'file',
    selected,
    path: file.id,
    title: `${mark}${file.id}`,
    trail: [...(cell === undefined ? [{ words: 'map' }] : trailOf(index, cell)), { words: `${mark}${name}`, selects: selected }],
    facts: fileFacts(map, file, changed),
    ...(changed === undefined ? {} : { change: changeOf(map, changed, level) }),
    notices: noticesOf(map, (target) => target === file.id),
    functions: functionsOf(file, changed?.kind === 'deleted', level),
  };
};

/**
 * What the inspector shows for a selection over a map: the module or the
 * file it names, or the map view with nothing selected and for a selection
 * this map no longer holds, since the line keeps a selection across a
 * scrubbed frame and a pushed map (D209 (selection-line)).
 */
export const inspect = (map: MapJson, selected: Selected | undefined): Inspected => {
  if (selected === undefined) return { kind: 'map' };
  const index = indexOf(map);
  if (selected.kind === 'cell') {
    const cell = index.cells.get(selected.cell);
    return cell === undefined ? { kind: 'map' } : moduleOf(index, cell);
  }
  const file = index.files.get(selected.path);
  const level = file === undefined ? undefined : fileLevelOf(map, file.path);
  return file === undefined || level === undefined ? { kind: 'map' } : fileOf(index, file, level);
};
