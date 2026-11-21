import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { Cell, Dependency, MapJson, Organelle } from 'core';
import { expect, test } from 'vitest';

import { NO_APPROVED_SHAPE } from '../inspector.js';
import { selectedOf } from '../nav.js';
import { READING_ORDER, READING_ROWS, readingOf } from '../reading.js';
import type { ReadingId, ReadingList } from '../reading.js';

/**
 * The map view's reading (D208 (side-panels)): short ranked lists read from
 * the map's structure alone, on the demo map with its checks stripped, each
 * row carrying the stop it selects, and a list the map cannot fill saying
 * why rather than reading as none (C2).
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const DEMO = assertMap(JSON.parse(readFileSync(join(ROOT, 'libs', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));

const PM = 'folder:libs/core/src/pm';
const CORE = 'package:libs/core';
const CLI = 'package:apps/cli';
const UTIL = 'directory:libs/core/src/util';
const DOCTOR = 'apps/cli/src/doctor.ts';
const TOOLS = 'libs/core/src/pm/tools.ts';
const SLOTS = 'libs/core/src/pm/slots.ts';

/** A cell with everything a `.check/` put on it taken off: the rules its files break, its clone family and the health report's count. */
const bareCell = (cell: Cell): Cell => {
  const { function_count: _count, clone_family: _family, ...rest } = cell;
  return { ...rest, dents: [] };
};

/** A file with everything a `.check/` put on it taken off, its functions kept as the scan read them and their breaches gone. */
const bareFile = (file: Organelle): Organelle => {
  const { function_count: _count, clone_family: _family, functions, ...rest } = file;
  return { ...rest, dents: [], ...(functions === undefined ? {} : { functions: functions.map(({ breaches: _breaches, ...fn }) => fn) }) };
};

/**
 * The demo with its checks stripped: no `.check/` trusted, no slot and no
 * evidence, as the HUD's test strips it, and beyond that every key a check
 * alone puts on the terrain gone, so what is left is what git and the scan
 * give a repo nobody wrote checks for.
 */
const STRIPPED: MapJson = {
  ...DEMO,
  meta: { ...DEMO.meta, instruments: { mode: 'git-only', reason: 'no .check/' } },
  terrain: { ...DEMO.terrain, cells: DEMO.terrain.cells.map(bareCell), organelles: DEMO.terrain.organelles.map(bareFile) },
  weather: { ...DEMO.weather, checks: { category: 'NOINST', checks_run: 0, slots: [] }, evidence: {} },
  notices: [],
};

const listOf = (map: MapJson, id: ReadingId, most?: number): ReadingList => {
  const list = readingOf(map, most).lists.find((each) => each.id === id);
  if (list === undefined) throw new Error(`the reading holds no ${id}`);
  return list;
};

const cell = (id: string): { readonly kind: 'cell'; readonly cell: string } => ({ kind: 'cell', cell: id });

test('the stripped demo still passes the guard, and reads exactly as the checked one does: the reading is of the structure alone', () => {
  expect(() => assertMap(STRIPPED)).not.toThrow();
  expect(readingOf(STRIPPED)).toEqual(readingOf(DEMO));
});

test('every list is there on every map, in the order the map view draws them, then the departures', () => {
  const reading = readingOf(STRIPPED);
  expect(reading.lists.map((list) => list.id)).toEqual([...READING_ORDER]);
  expect(reading.lists.map((list) => list.title)).toEqual([
    'largest modules',
    'largest files',
    'most depended-on',
    'most outward-reaching',
    'imports past an interface',
    'unreachable files',
    'longest functions',
    'outside packages',
  ]);
  expect(reading.departures).toEqual({ approved: false, words: NO_APPROVED_SHAPE });
});

test('the largest modules are ranked by their lines, each a package or a module with the files inside its contour', () => {
  expect(listOf(STRIPPED, 'largest-modules')).toEqual({
    id: 'largest-modules',
    title: 'largest modules',
    of: 5,
    rows: [
      { words: 'libs/core', count: '363 lines', tail: 'package, 7 files', selects: cell(CORE) },
      { words: 'libs/core/src/pm', count: '260 lines', tail: 'module, 4 files', selects: cell(PM) },
      { words: 'apps/cli', count: '236 lines', tail: 'package, 2 files', selects: cell(CLI) },
      { words: DOCTOR, count: '212 lines', tail: 'module, 1 file', selects: cell(`single:${DOCTOR}`) },
      { words: 'libs/core/src/util', count: '89 lines', tail: 'module, a directory, 2 files', selects: cell(UTIL) },
    ],
  });
});

test('the largest files are ranked by their lines and cut to a short list that says how many it ranked, a deleted file left out', () => {
  const list = listOf(STRIPPED, 'largest-files');
  expect(READING_ROWS).toBe(5);
  expect(list.of).toBe(8);
  expect(list.rows.map((row) => [row.words, row.count])).toEqual([
    [DOCTOR, '212 lines'],
    [TOOLS, '96 lines'],
    [SLOTS, '88 lines'],
    ['libs/core/src/util/format.ts', '52 lines'],
    ['libs/core/src/util/text.ts', '37 lines'],
  ]);
  const all = listOf(STRIPPED, 'largest-files', 20);
  expect(all.rows).toHaveLength(8);
  expect(all.rows.map((row) => row.words)).not.toContain('libs/core/src/pm/legacy.ts');
  expect(listOf(STRIPPED, 'largest-files', 2).rows).toHaveLength(2);
  expect(listOf(STRIPPED, 'largest-files', -1)).toMatchObject({ rows: [], of: 8 });
});

test('every row that names a place on the map carries the stop selectedOf builds for it', () => {
  for (const list of readingOf(STRIPPED, 100).lists) {
    for (const row of list.rows) {
      if (list.id === 'outside-packages') {
        expect(row.selects).toBeUndefined();
        continue;
      }
      const target = row.selects?.kind === 'cell' ? row.selects.cell : row.selects?.path;
      expect(target).toBeDefined();
      expect(row.selects).toEqual(selectedOf(STRIPPED, target ?? ''));
    }
  }
});

test('the most depended-on and the most outward-reaching modules are ranked by their fans, a module with none left out', () => {
  expect(listOf(STRIPPED, 'most-depended-on')).toEqual({
    id: 'most-depended-on',
    title: 'most depended-on',
    of: 4,
    rows: [
      { words: 'libs/core/src/util', count: '2 files outside read it', tail: 'module, a directory', selects: cell(UTIL) },
      { words: 'libs/core/src/pm', count: '2 files outside read it', tail: 'module', selects: cell(PM) },
      { words: 'libs/core', count: '1 file outside reads it', tail: 'package', selects: cell(CORE) },
      { words: DOCTOR, count: '1 file outside reads it', tail: 'module', selects: cell(`single:${DOCTOR}`) },
    ],
  });
  expect(listOf(STRIPPED, 'most-outward')).toEqual({
    id: 'most-outward',
    title: 'most outward-reaching',
    of: 3,
    rows: [
      { words: 'apps/cli', count: 'reads 2 files outside it', tail: 'package', selects: cell(CLI) },
      { words: DOCTOR, count: 'reads 2 files outside it', tail: 'module', selects: cell(`single:${DOCTOR}`) },
      { words: 'libs/core/src/pm', count: 'reads 1 file outside it', tail: 'module', selects: cell(PM) },
    ],
  });
});

/** The note under the list on the demo: its directory and its single file are the two no import could go past. */
const UNMEASURED = '2 modules are not measured: none has an interface file an import could go past';

test('imports past an interface are ranked by how many go past, and the modules with no interface file to go past are counted as not measured', () => {
  expect(listOf(STRIPPED, 'past-interface')).toEqual({
    id: 'past-interface',
    title: 'imports past an interface',
    of: 1,
    rows: [{ words: 'libs/core', count: '1 past', tail: '1 through, package', selects: cell(CORE) }],
    note: UNMEASURED,
  });
});

test('a map that counted no module mutes the list with the reason its interface files give, where one that measured none says none', () => {
  const muted = (map: MapJson, why: string): void => expect(listOf(map, 'past-interface')).toEqual({ id: 'past-interface', title: 'imports past an interface', rows: [], of: 0, muted: why });
  const uncounted = STRIPPED.terrain.cells.map(({ integrity: _integrity, ...rest }) => rest);

  // No module has an interface file: there is nothing to go past.
  const unentered = { ...STRIPPED, terrain: { ...STRIPPED.terrain, cells: uncounted.map(({ barrel: _barrel, ...rest }) => rest) } };
  muted(unentered, 'no module has an interface file, so nothing can be seen to go past one');

  // The modules have interface files and the map carries the count for none, as one written before the count does: that is no count, and never no interface.
  expect(uncounted.some((each) => each.barrel !== undefined)).toBe(true);
  muted({ ...STRIPPED, terrain: { ...STRIPPED.terrain, cells: uncounted } }, 'the map carries no count of what goes through or past an interface');

  // Every interface file the modules had is one the change deleted, which core counts for none.
  const interfaces = new Set(uncounted.flatMap((each) => each.barrel ?? []));
  const changed = [...interfaces].map((path) => ({ path, kind: 'deleted' as const, is_barrel: true, added: 0, deleted: 1, hunks: [] }));
  muted({ ...STRIPPED, terrain: { ...STRIPPED.terrain, cells: uncounted }, weather: { ...STRIPPED.weather, changed } }, 'the change deleted every interface file, so nothing can be seen to go past one');

  const tidy = { ...STRIPPED, terrain: { ...STRIPPED.terrain, cells: STRIPPED.terrain.cells.map((each) => (each.integrity === undefined ? each : { ...each, integrity: { ...each.integrity, past: 0 } })) } };
  expect(listOf(tidy, 'past-interface')).toEqual({
    id: 'past-interface',
    title: 'imports past an interface',
    rows: [],
    of: 0,
    empty: 'no import goes past an interface',
    note: UNMEASURED,
  });

  const one = { ...STRIPPED, terrain: { ...STRIPPED.terrain, cells: STRIPPED.terrain.cells.filter((each) => each.kind !== 'single') } };
  expect(listOf(one, 'past-interface').note).toBe('1 module is not measured: it has no interface file an import could go past');
});

test('on the committed fixtures a map with interface files never says it has none: it says the count is missing, or shows what it counted', () => {
  const told = readdirSync(join(ROOT, 'fixtures')).flatMap((name) => {
    const path = join(ROOT, 'fixtures', name, 'map.json');
    if (!existsSync(path)) return [];
    try {
      const map = assertMap(JSON.parse(readFileSync(path, 'utf8')));
      return map.terrain.cells.some((each) => each.barrel !== undefined) ? [listOf(map, 'past-interface').muted] : [];
    } catch {
      // A map an older contract wrote has no reading to hold.
      return [];
    }
  });
  expect(told.length).toBeGreaterThan(10);
  expect(told.filter((muted) => muted?.startsWith('no module has an interface file'))).toEqual([]);
}, 30_000);

test('a map that carries no fan for its modules mutes both fan lists, where fans of none say none', () => {
  const fanless = { ...STRIPPED, terrain: { ...STRIPPED.terrain, cells: STRIPPED.terrain.cells.map(({ fan_in: _in, fan_out: _out, ...rest }) => rest) } };
  expect(listOf(fanless, 'most-depended-on')).toMatchObject({ rows: [], of: 0, muted: 'the map carries no fan for its modules' });
  expect(listOf(fanless, 'most-outward')).toMatchObject({ rows: [], of: 0, muted: 'the map carries no fan for its modules' });

  const apart = { ...STRIPPED, terrain: { ...STRIPPED.terrain, cells: STRIPPED.terrain.cells.map((each) => ({ ...each, fan_in: 0, fan_out: 0 })) } };
  expect(listOf(apart, 'most-depended-on')).toMatchObject({ rows: [], of: 0, empty: 'no module is read from outside it' });
  expect(listOf(apart, 'most-outward')).toMatchObject({ rows: [], of: 0, empty: 'no module reads outside itself' });
  expect(listOf(apart, 'most-depended-on').muted).toBeUndefined();
});

test('the unreachable files are the ones no entry point reaches, the largest first, and none is said as none', () => {
  expect(listOf(STRIPPED, 'unreachable')).toEqual({ id: 'unreachable', title: 'unreachable files', rows: [], of: 0, empty: 'an entry point reaches every file' });

  const adrift = new Set([SLOTS, 'libs/core/src/util/text.ts', 'libs/core/src/pm/legacy.ts']);
  const organelles = STRIPPED.terrain.organelles.map((file) => (adrift.has(file.id) ? { ...file, reachable: false } : file));
  const map: MapJson = {
    ...STRIPPED,
    meta: { ...STRIPPED.meta, instruments: { ...STRIPPED.meta.instruments, entry_points: 'manifests', entry_points_reason: 'fallow is not installed' } },
    terrain: { ...STRIPPED.terrain, organelles },
  };
  expect(listOf(map, 'unreachable')).toEqual({
    id: 'unreachable',
    title: 'unreachable files',
    of: 2,
    rows: [
      { words: SLOTS, count: '88 lines', selects: { kind: 'organelle', path: SLOTS, cell: PM } },
      { words: 'libs/core/src/util/text.ts', count: '37 lines', selects: { kind: 'organelle', path: 'libs/core/src/util/text.ts', cell: UTIL } },
    ],
    note: 'the entry points were read from the manifests alone: fallow is not installed',
  });
});

test('the longest functions are ranked by the lines they span, each naming its file and line and selecting the file', () => {
  expect(listOf(STRIPPED, 'longest-functions')).toEqual({
    id: 'longest-functions',
    title: 'longest functions',
    of: 14,
    rows: [
      { words: 'runDoctor', count: '64 lines', tail: `${DOCTOR}:12`, selects: { kind: 'organelle', path: DOCTOR, cell: `single:${DOCTOR}` } },
      { words: 'checkSlot', count: '42 lines', tail: `${DOCTOR}:80`, selects: { kind: 'organelle', path: DOCTOR, cell: `single:${DOCTOR}` } },
      { words: 'resolveTool', count: '38 lines', tail: `${TOOLS}:41`, selects: { kind: 'organelle', path: TOOLS, cell: PM } },
      { words: 'report', count: '36 lines', tail: `${DOCTOR}:130`, selects: { kind: 'organelle', path: DOCTOR, cell: `single:${DOCTOR}` } },
      { words: 'slotOf', count: '30 lines', tail: `${SLOTS}:4`, selects: { kind: 'organelle', path: SLOTS, cell: PM } },
    ],
  });
});

test('a map whose scan read no functions mutes the list, where files that hold none say none', () => {
  const unread = { ...STRIPPED, terrain: { ...STRIPPED.terrain, organelles: STRIPPED.terrain.organelles.map(({ functions: _functions, ...rest }) => rest) } };
  expect(listOf(unread, 'longest-functions')).toEqual({ id: 'longest-functions', title: 'longest functions', rows: [], of: 0, muted: 'the head scan read no functions' });

  const hollow = { ...STRIPPED, terrain: { ...STRIPPED.terrain, organelles: STRIPPED.terrain.organelles.map((file) => ({ ...file, functions: [] })) } };
  expect(listOf(hollow, 'longest-functions')).toEqual({ id: 'longest-functions', title: 'longest functions', rows: [], of: 0, empty: 'the files hold no function' });
});

test('the outside packages are listed whole with their importers, the one the change added first, and each says no audit was read', () => {
  expect(listOf(STRIPPED, 'outside-packages')).toEqual({
    id: 'outside-packages',
    title: 'outside packages',
    of: 3,
    rows: [
      { words: 'picomatch', count: '2 files import it', tail: 'added by this change', muted: 'no audit was read', hue: 'change' },
      { words: 'kleur', count: '2 files import it', muted: 'no audit was read', hue: 'unread' },
      { words: 'semver', count: '1 file imports it', muted: 'no audit was read', hue: 'unread' },
    ],
  });
});

test("an audit's findings rank a package first by the scene's hue for a star, and the list is never cut short", () => {
  const dependencies: readonly Dependency[] = [
    { name: 'alpha', importers: 9, advisories: 0 },
    { name: 'bravo', importers: 1, advisories: 2, severity: 'critical', change: 'moved' },
    { name: 'charlie', importers: 4, advisories: 1, severity: 'moderate' },
    { name: 'delta', importers: 3, change: 'moved', advisories: 0 },
    { name: 'echo', importers: 2, advisories: 1, severity: 'high' },
    { name: 'foxtrot', importers: 12 },
    { name: 'golf', importers: 9, advisories: 0 },
  ];
  const list = listOf({ ...STRIPPED, weather: { ...STRIPPED.weather, dependencies } }, 'outside-packages', 2);
  expect(list.of).toBe(7);
  expect(list.rows).toEqual([
    { words: 'echo', count: '2 files import it', tail: '1 advisory, high', hue: 'ifr' },
    { words: 'bravo', count: '1 file imports it', tail: '2 advisories, critical, range moved by this change', hue: 'ifr' },
    { words: 'charlie', count: '4 files import it', tail: '1 advisory, moderate', hue: 'amber' },
    { words: 'delta', count: '3 files import it', tail: 'range moved by this change', hue: 'change' },
    { words: 'foxtrot', count: '12 files import it', muted: 'no audit was read', hue: 'unread' },
    { words: 'alpha', count: '9 files import it', tail: 'no advisory', hue: 'clean' },
    { words: 'golf', count: '9 files import it', tail: 'no advisory', hue: 'clean' },
  ]);
});

test('a map that records no imports by package mutes the list, where a terrain that imports none says none', () => {
  const { dependencies: _dependencies, ...weather } = STRIPPED.weather;
  expect(listOf({ ...STRIPPED, weather }, 'outside-packages')).toEqual({
    id: 'outside-packages',
    title: 'outside packages',
    rows: [],
    of: 0,
    muted: "the head scan recorded no file's imports by package",
  });
  expect(listOf({ ...STRIPPED, weather: { ...weather, dependencies: [] } }, 'outside-packages')).toEqual({
    id: 'outside-packages',
    title: 'outside packages',
    rows: [],
    of: 0,
    empty: 'the terrain imports no outside package',
  });
});

test('a map that holds nothing says so in every list, and none of them reads as a count', () => {
  const empty: MapJson = { ...STRIPPED, terrain: { ...STRIPPED.terrain, cells: [], organelles: [] }, weather: { ...STRIPPED.weather, changed: [], reach: [], dependencies: [] } };
  for (const list of readingOf(empty).lists) {
    expect(list.rows).toEqual([]);
    expect(list.of).toBe(0);
    expect((list.empty === undefined) !== (list.muted === undefined)).toBe(true);
  }
  expect(listOf(empty, 'past-interface').muted).toBe('the map holds no module');
  expect(listOf(empty, 'longest-functions').muted).toBe('the map holds no file');
  expect(listOf(empty, 'most-depended-on').empty).toBe('no module is read from outside it');
});

test('the departures stand after the lists: every one the map carries, each selecting its module', () => {
  const approved = { at: DEMO.meta.head, departures: [{ kind: 'files-grown', target: 'libs/core/src/pm', cell: PM, why: 'it holds more files than approved', was: 3, now: 4 }] };
  expect(readingOf(assertMap({ ...STRIPPED, approved })).departures).toEqual({
    approved: true,
    words: 'since approved a1b2c3d',
    rows: [{ kind: 'files-grown', words: 'more files', target: 'libs/core/src/pm', selects: cell(PM), gone: false, why: 'it holds more files than approved', count: '3 → 4', names: [] }],
  });
});

/** How long the sweep of every committed fixture may take: it reads some thirty maps, and the suite shares the machine. */
const SWEEP_MS = 30_000;

test('on every committed fixture each list is rows, or none, or a reason, and every stop is one the map holds', () => {
  const names = readdirSync(join(ROOT, 'fixtures')).filter((name) => existsSync(join(ROOT, 'fixtures', name, 'map.json')));
  let read = 0;
  for (const name of names) {
    let map: MapJson;
    try {
      map = assertMap(JSON.parse(readFileSync(join(ROOT, 'fixtures', name, 'map.json'), 'utf8')));
    } catch {
      // A map an older contract wrote has no reading to hold.
      continue;
    }
    read += 1;
    const cells = new Set(map.terrain.cells.map((each) => each.id));
    const files = new Map(map.terrain.organelles.map((file) => [file.id, file.cell] as const));
    const reading = readingOf(map);
    expect(reading.lists.map((list) => list.id), name).toEqual([...READING_ORDER]);
    for (const list of reading.lists) {
      const said = [list.rows.length > 0, list.empty !== undefined, list.muted !== undefined].filter(Boolean);
      expect(said, `${name} ${list.id}`).toHaveLength(1);
      expect(list.of, `${name} ${list.id}`).toBeGreaterThanOrEqual(list.rows.length);
      if (list.id !== 'outside-packages') expect(list.rows.length, `${name} ${list.id}`).toBeLessThanOrEqual(READING_ROWS);
      for (const row of list.rows) {
        if (row.selects?.kind === 'cell') expect(cells.has(row.selects.cell), `${name} ${row.words}`).toBe(true);
        if (row.selects?.kind === 'organelle') expect(files.get(row.selects.path), `${name} ${row.words}`).toBe(row.selects.cell);
        expect(row.selects === undefined, `${name} ${row.words}`).toBe(list.id === 'outside-packages');
      }
    }
  }
  expect(read).toBeGreaterThan(10);
}, SWEEP_MS);
