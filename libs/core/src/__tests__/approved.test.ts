import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

import { APPROVED_KIND, APPROVED_SCHEMA_VERSION, DEPARTURE_LIMITS, approvedOf, assertApproved, departuresOf, sharesTerrain, withApproved } from '../approved.js';
import type { Approved, ApprovedModule, DepartureLimits } from '../approved.js';
import { DEFAULT_CONFIG } from '../config.js';
import { buildMap } from '../map.js';
import type { BuildInputs } from '../map.js';
import { DEPARTURE_KINDS, assertMap } from '../schema.js';
import type { Cell, Departure, MapJson, Organelle } from '../schema.js';

/**
 * The maps are read from committed JSON with `node:fs`, as the map's own
 * test reads its fixtures: C1 keeps Node out of the code core ships, and a
 * test is not shipped. The demo map is built here from its inputs, so every
 * case stands on cells core itself identified; the corpus maps are the
 * repo's own goldens of real repositories.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO_INPUTS = JSON.parse(readFileSync(join(HERE, '..', '..', 'fixtures', 'demo', 'inputs.json'), 'utf8')) as BuildInputs;
const DEMO: MapJson = buildMap(DEMO_INPUTS, DEFAULT_CONFIG);

function corpus(name: string): MapJson {
  return assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', '..', 'fixtures', name, 'map.json'), 'utf8')));
}

const CLI = 'package:apps/cli';
const CORE = 'package:libs/core';
const PM = 'folder:libs/core/src/pm';
const UTIL = 'directory:libs/core/src/util';
const DOCTOR = 'single:apps/cli/src/doctor.ts';
const UTIL_FOLDER = 'folder:libs/core/src/util';
const FORMAT = 'libs/core/src/util/format.ts';
const THREE = ['libs/core/src/pm/a.ts', 'libs/core/src/pm/b.ts', 'libs/core/src/pm/c.ts'];

/** The map with one of its cells changed. */
function recell(map: MapJson, id: string, change: (cell: Cell) => Cell): MapJson {
  return { ...map, terrain: { ...map.terrain, cells: map.terrain.cells.map((cell) => (cell.id === id ? change(cell) : cell)) } };
}

const file = (path: string, cell: string, loc: number): Organelle => ({ id: path, path, cell, band: 0, reachable: true, loc, dents: [] });

/** The map with files more in one of its cells, each of `loc` lines. */
function grow(map: MapJson, cell: string, paths: readonly string[], loc = 1): MapJson {
  const grown = recell(map, cell, (each) => ({ ...each, organelles: [...each.organelles, ...paths] }));
  return { ...grown, terrain: { ...grown.terrain, organelles: [...grown.terrain.organelles, ...paths.map((path) => file(path, cell, loc))] } };
}

/** The map with a directory module more inside `libs/core`, holding `files` files of one line each. */
function found(map: MapJson, path: string, files: readonly string[]): MapJson {
  const cell: Cell = { id: `directory:${path}`, path, kind: 'directory', parent: CORE, organelles: [], band: 4, interface_size: 0, body_loc: files.length, dents: [] };
  return grow({ ...map, terrain: { ...map.terrain, cells: [...map.terrain.cells, cell] } }, cell.id, files.map((name) => `${path}/${name}`));
}

/** The map with one file's lines set. */
function reline(map: MapJson, path: string, loc: number): MapJson {
  return { ...map, terrain: { ...map.terrain, organelles: map.terrain.organelles.map((organelle) => (organelle.path === path ? { ...organelle, loc } : organelle)) } };
}

/** The map short of one cell: the cell, its files, their places, and the reach into it. */
function without(map: MapJson, id: string): MapJson {
  const { layout } = map.terrain;
  const gone = new Set(map.terrain.organelles.filter((organelle) => organelle.cell === id).map((organelle) => organelle.path));
  const positions = Object.fromEntries(Object.entries(layout?.positions ?? {}).filter(([path]) => !gone.has(path)));
  return {
    ...map,
    terrain: {
      ...map.terrain,
      cells: map.terrain.cells.filter((cell) => cell.id !== id),
      organelles: map.terrain.organelles.filter((organelle) => organelle.cell !== id),
      ...(layout === undefined ? {} : { layout: { ...layout, positions } }),
    },
    weather: { ...map.weather, reach: map.weather.reach.filter((entry) => entry.cell !== id) },
  };
}

/** The map with `util` given an interface file: a folder now, under a new id, with imports counted at its barrel. */
function barrelled(map: MapJson): MapJson {
  const folder: Partial<Cell> = { id: UTIL_FOLDER, kind: 'folder', barrel: 'libs/core/src/util/index.ts', integrity: { through: 2, past: 4 } };
  return {
    ...map,
    terrain: {
      ...map.terrain,
      cells: map.terrain.cells.map((cell) => (cell.id === UTIL ? { ...cell, ...folder } : cell)),
      organelles: map.terrain.organelles.map((organelle) => (organelle.cell === UTIL ? { ...organelle, cell: UTIL_FOLDER } : organelle)),
    },
  };
}

function moduleAt(doc: Approved, path: string, kind?: ApprovedModule['kind']): ApprovedModule {
  const held = doc.modules.find((module) => module.path === path && (kind === undefined || module.kind === kind));
  if (held === undefined) throw new Error(`no module at ${path}`);
  return held;
}

/** A departure as the list is ordered by: its target, its kind and its cell. */
const told = (departures: readonly Departure[]): readonly string[] => departures.map((departure) => [departure.target, departure.kind, departure.cell ?? '-'].join(' '));

const APPROVED = approvedOf(DEMO);

/** Limits of nothing: every count that grew at all is told. */
const ANY = { by: 0, ratio: 0 };
const LOOSE: DepartureLimits = { 'files-grown': ANY, 'lines-grown': ANY, 'interface-widened': ANY, 'past-interface-up': ANY, 'fan-out-up': ANY };

const mapOf = (inputs: BuildInputs): MapJson => buildMap(inputs, DEFAULT_CONFIG);

/** The inputs with one head file's lines set, as a change that edited the file leaves them. */
function edited(inputs: BuildInputs, path: string, loc: number): BuildInputs {
  return { ...inputs, head: { ...inputs.head, files: inputs.head.files.map((each) => (each.path === path ? { ...each, loc } : each)) } };
}

/** The inputs with imports more in the head's graph, each of one name. */
function importing(inputs: BuildInputs, imports: readonly (readonly [from: string, to: string, name: string])[]): BuildInputs {
  const edges = imports.map(([from, to, name]) => ({ from, to, names: [name], line: 9 }));
  return { ...inputs, head: { ...inputs.head, edges: [...inputs.head.edges, ...edges] } };
}

/**
 * The inputs' head as a change of nothing over itself: the terrain a
 * whole-repo map cuts, and the one a later change stands on once this head
 * is its base.
 */
function atHead(inputs: BuildInputs): BuildInputs {
  const { structure: _structure, ...rest } = inputs;
  return { ...rest, base: inputs.head, diff: [], deps_added: [], meta: { ...inputs.meta, merge_base: inputs.meta.head } };
}

test('the demo map reduces to its head, the commit its terrain is cut from, every module the head holds sorted by path, and its outside packages', () => {
  // `pm` lists four files on the terrain and the change deleted one of them,
  // so the head holds three, and `libs/core` holds one fewer in its contour
  // with it (D300 (held-at-head)). The directory `util` has no barrel, so it
  // carries no `through` and no `past` (C2).
  expect(APPROVED).toEqual({
    schema_version: 1,
    kind: 'atis.approved',
    approved_at: 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678',
    over: '0f1e2d3c4b5a69788796a5b4c3d2e1f098765432',
    modules: [
      { path: 'apps/cli', kind: 'package', band: 0, files: 2, loc: 236, interface_size: 1, exports: ['main'], fan_in: 0, fan_out: 2, through: 0, past: 0 },
      { path: 'apps/cli/src/doctor.ts', kind: 'single', band: 1, files: 1, loc: 212, interface_size: 1, exports: ['runDoctor'], fan_in: 1, fan_out: 2 },
      { path: 'libs/core', kind: 'package', band: 2, files: 6, loc: 318, interface_size: 3, exports: ['legacyResolve', 'listSlots', 'resolveSlot'], fan_in: 1, fan_out: 0, through: 1, past: 1 },
      { path: 'libs/core/src/pm', kind: 'folder', band: 3, files: 3, loc: 215, interface_size: 3, exports: ['listSlots', 'resolveSlot', 'resolveTool'], fan_in: 2, fan_out: 1, through: 2, past: 0 },
      { path: 'libs/core/src/util', kind: 'directory', band: 5, files: 2, loc: 89, interface_size: 1, exports: ['formatSlot'], fan_in: 2, fan_out: 0 },
    ],
    dependencies: ['kleur', 'picomatch', 'semver'],
  });
  expect(APPROVED.schema_version).toBe(APPROVED_SCHEMA_VERSION);
  expect(APPROVED.kind).toBe(APPROVED_KIND);
  expect(assertApproved(JSON.parse(JSON.stringify(APPROVED)))).toEqual(APPROVED);
});

test('the reduction holds no clock: a map generated at another time reduces to the same bytes (C3)', () => {
  const later: MapJson = { ...DEMO, meta: { ...DEMO.meta, generated_at: '2031-01-01T00:00:00.000Z' } };
  expect(JSON.stringify(approvedOf(later))).toBe(JSON.stringify(APPROVED));
  expect(JSON.stringify(approvedOf(DEMO))).toBe(JSON.stringify(APPROVED));
});

test('a map held against its own approved shape keeps it, which is a block with no departures and not an absent one', () => {
  expect(departuresOf(APPROVED, DEMO, DEPARTURE_LIMITS)).toEqual([]);
  const kept = withApproved(DEMO, APPROVED);
  expect(kept.approved).toEqual({ at: DEMO.meta.head, departures: [] });
  expect(() => assertMap(kept)).not.toThrow();
  expect({ ...kept, approved: undefined }).toEqual({ ...DEMO, approved: undefined });
});

test('with no document nothing was approved, and the map comes back as it was', () => {
  expect(withApproved(DEMO, undefined)).toBe(DEMO);
  expect(withApproved(DEMO, undefined)).not.toHaveProperty('approved');
});

test.each(['round-two-3', 'corpus-12', 'corpus-6', 'go-1', 'corpus-8'])('the corpus map %s reduces to a document its guard accepts, and keeps its own shape', (name) => {
  const map = corpus(name);
  const doc = approvedOf(map);
  expect(assertApproved(JSON.parse(JSON.stringify(doc)))).toEqual(doc);
  expect(departuresOf(doc, map)).toEqual([]);
  expect(() => assertMap(withApproved(map, doc))).not.toThrow();

  // Where the change deleted nothing inside a module, what the head holds of
  // it is what the map counts of it: its files and its `body_loc`.
  const deleted = new Set(map.weather.changed.filter((changed) => changed.kind === 'deleted').map((changed) => changed.path));
  const nested = (cell: Cell): readonly string[] => [...cell.organelles, ...map.terrain.cells.filter((each) => each.parent === cell.id).flatMap((each) => each.organelles)];
  const whole = map.terrain.cells.filter((cell) => !nested(cell).some((path) => deleted.has(path)));
  expect(whole.length).toBeGreaterThan(0);
  for (const cell of whole) {
    expect(moduleAt(doc, cell.path, cell.kind)).toMatchObject({ files: nested(cell).length, loc: cell.body_loc });
  }
});

test('a module whose every file the change deleted is no module of the head, and is not told removed while the terrain keeps its cell (D300 (held-at-head), D304 (removed-off-terrain))', () => {
  const map = corpus('corpus-6');
  const cell = 'single:packages/cli/src/help.ts';
  expect(map.terrain.cells.map((each) => each.id)).toContain(cell);
  expect(approvedOf(map).modules.map((module) => module.path)).not.toContain('packages/cli/src/help.ts');

  // The shape as it stood before the change: the same terrain, nothing deleted.
  const before = approvedOf({ ...map, weather: { ...map.weather, changed: [] } });
  expect(moduleAt(before, 'packages/cli/src/help.ts')).toMatchObject({ kind: 'single', files: 1 });
  const departures = departuresOf(before, map);
  expect(departures.filter((departure) => departure.kind === 'module-removed' || departure.kind === 'module-added')).toEqual([]);
  expect(() => assertMap(withApproved(map, before))).not.toThrow();
});

test('a module the approved shape did not hold is told added, with the files it holds', () => {
  const later = found(DEMO, 'libs/core/src/net', ['fetch.ts']);
  expect(departuresOf(APPROVED, later)).toEqual([
    { kind: 'module-added', target: 'libs/core/src/net', cell: 'directory:libs/core/src/net', why: 'a module the approved shape did not hold', now: 1 },
  ]);
  expect(() => assertMap(withApproved(later, APPROVED))).not.toThrow();
});

test('a module the approved shape held and the terrain no longer does is told removed, under the id it had (D304 (removed-off-terrain))', () => {
  const earlier = approvedOf(found(DEMO, 'libs/core/src/old', ['a.ts', 'b.ts']));
  expect(departuresOf(earlier, DEMO)).toEqual([
    { kind: 'module-removed', target: 'libs/core/src/old', cell: 'directory:libs/core/src/old', why: 'a module the approved shape held', was: 2 },
  ]);
  expect(() => assertMap(withApproved(DEMO, earlier))).not.toThrow();
});

test('files grown past the limit are told for the module and for the package whose contour holds them, and fewer are not', () => {
  const three = grow(DEMO, PM, ['libs/core/src/pm/a.ts', 'libs/core/src/pm/b.ts', 'libs/core/src/pm/c.ts']);
  expect(departuresOf(APPROVED, three)).toEqual([
    { kind: 'files-grown', target: 'libs/core', cell: CORE, why: 'it holds more files than approved', was: 6, now: 9 },
    { kind: 'files-grown', target: 'libs/core/src/pm', cell: PM, why: 'it holds more files than approved', was: 3, now: 6 },
  ]);
  expect(() => assertMap(withApproved(three, APPROVED))).not.toThrow();
  expect(departuresOf(APPROVED, grow(DEMO, PM, ['libs/core/src/pm/a.ts', 'libs/core/src/pm/b.ts']))).toEqual([]);
});

test('lines grown past the limit are told, and the limits handed in decide it (D303 (departure-limits))', () => {
  const longer = reline(DEMO, 'apps/cli/src/doctor.ts', 400);
  expect(departuresOf(APPROVED, longer)).toEqual([
    { kind: 'lines-grown', target: 'apps/cli', cell: CLI, why: 'it holds more lines than approved', was: 236, now: 424 },
    { kind: 'lines-grown', target: 'apps/cli/src/doctor.ts', cell: DOCTOR, why: 'it holds more lines than approved', was: 212, now: 400 },
  ]);
  expect(() => assertMap(withApproved(longer, APPROVED))).not.toThrow();

  // 99 lines more is under `by`; twice the lines is a `ratio` neither reaches.
  expect(departuresOf(APPROVED, reline(DEMO, 'apps/cli/src/doctor.ts', 311))).toEqual([]);
  expect(departuresOf(APPROVED, longer, { ...DEPARTURE_LIMITS, 'lines-grown': { by: 100, ratio: 2 } })).toEqual([]);
  // A limit of nothing still tells only what grew.
  expect(departuresOf(APPROVED, DEMO, LOOSE)).toEqual([]);
  expect(told(departuresOf(APPROVED, reline(DEMO, 'apps/cli/src/doctor.ts', 213), LOOSE))).toEqual([`apps/cli lines-grown ${CLI}`, `apps/cli/src/doctor.ts lines-grown ${DOCTOR}`]);
});

test('an interface that exports more names than approved is told widened by the names it gained, and one that only renamed a name is not (D302 (interface-by-name))', () => {
  const wider = recell(DEMO, PM, (cell) => ({ ...cell, exports: [...(cell.exports ?? []), 'resolveAll', 'detectTool'] }));
  expect(departuresOf(APPROVED, wider)).toEqual([
    { kind: 'interface-widened', target: 'libs/core/src/pm', cell: PM, why: 'its interface exports more names than approved', was: 3, now: 5, names: ['detectTool', 'resolveAll'] },
  ]);
  expect(() => assertMap(withApproved(wider, APPROVED))).not.toThrow();

  const renamed = recell(DEMO, PM, (cell) => ({ ...cell, exports: ['listSlots', 'resolveSlot', 'resolveTools'] }));
  expect(departuresOf(APPROVED, renamed)).toEqual([]);
  // The terrain's own count is the base's on a change map, so it alone widens nothing.
  expect(departuresOf(APPROVED, recell(DEMO, PM, (cell) => ({ ...cell, interface_size: 9 })))).toEqual([]);
});

test('more imports past an interface than approved are told, and more fan out past its limit', () => {
  const past = recell(DEMO, CORE, (cell) => ({ ...cell, integrity: { through: 1, past: 3 } }));
  expect(departuresOf(APPROVED, past)).toEqual([
    { kind: 'past-interface-up', target: 'libs/core', cell: CORE, why: 'more imports enter past its interface than approved', was: 1, now: 3 },
  ]);
  expect(() => assertMap(withApproved(past, APPROVED))).not.toThrow();
  // More through the interface is what an interface is for.
  expect(departuresOf(APPROVED, recell(DEMO, CORE, (cell) => ({ ...cell, integrity: { through: 40, past: 1 } })))).toEqual([]);

  const reaching = recell(DEMO, CLI, (cell) => ({ ...cell, fan_out: 5 }));
  expect(departuresOf(APPROVED, reaching)).toEqual([
    { kind: 'fan-out-up', target: 'apps/cli', cell: CLI, why: 'it reads more files outside itself than approved', was: 2, now: 5 },
  ]);
  expect(() => assertMap(withApproved(reaching, APPROVED))).not.toThrow();
  expect(departuresOf(APPROVED, recell(DEMO, CLI, (cell) => ({ ...cell, fan_out: 4 })))).toEqual([]);
});

test('an outside package the approved shape did not import is told added, about no module', () => {
  const dependencies = [...(DEMO.weather.dependencies ?? []), { name: 'zod', importers: 1 }];
  const later: MapJson = { ...DEMO, weather: { ...DEMO.weather, dependencies } };
  expect(departuresOf(APPROVED, later)).toEqual([{ kind: 'dependency-added', target: 'zod', why: 'an outside package the approved shape did not import' }]);
  expect(() => assertMap(withApproved(later, APPROVED))).not.toThrow();
  // One the shape imported and the map no longer does is no departure.
  expect(departuresOf({ ...APPROVED, dependencies: [...(APPROVED.dependencies ?? []), 'zod'] }, DEMO)).toEqual([]);
});

test('every kind at once comes in the order the map\'s guard requires: by target, then kind, then cell', () => {
  const earlier = approvedOf(found(DEMO, 'libs/core/src/old', ['a.ts']));
  const steps: readonly ((map: MapJson) => MapJson)[] = [
    (map) => found(map, 'libs/core/src/net', ['fetch.ts']),
    (map) => grow(map, PM, ['libs/core/src/pm/a.ts', 'libs/core/src/pm/b.ts', 'libs/core/src/pm/c.ts']),
    (map) => reline(map, 'apps/cli/src/doctor.ts', 400),
    (map) => recell(map, PM, (cell) => ({ ...cell, exports: [...(cell.exports ?? []), 'resolveAll'] })),
    (map) => recell(map, CORE, (cell) => ({ ...cell, integrity: { through: 1, past: 3 } })),
    (map) => recell(map, CLI, (cell) => ({ ...cell, fan_out: 5 })),
    (map) => ({ ...map, weather: { ...map.weather, dependencies: [...(map.weather.dependencies ?? []), { name: 'zod', importers: 1 }] } }),
  ];
  const later = steps.reduce((map, step) => step(map), DEMO);
  const { approved } = withApproved(later, earlier);

  expect(told(approved?.departures ?? [])).toEqual([
    `apps/cli fan-out-up ${CLI}`,
    `apps/cli lines-grown ${CLI}`,
    `apps/cli/src/doctor.ts lines-grown ${DOCTOR}`,
    `libs/core files-grown ${CORE}`,
    `libs/core past-interface-up ${CORE}`,
    'libs/core/src/net module-added directory:libs/core/src/net',
    'libs/core/src/old module-removed directory:libs/core/src/old',
    `libs/core/src/pm files-grown ${PM}`,
    `libs/core/src/pm interface-widened ${PM}`,
    'zod dependency-added -',
  ]);
  expect(new Set(approved?.departures.map((departure) => departure.kind))).toEqual(new Set(DEPARTURE_KINDS));
  expect(approved?.at).toBe(DEMO.meta.head);
  expect(() => assertMap(withApproved(later, earlier))).not.toThrow();
});

test('a module with no barrel has no imports past an interface on either side, so none is told and none reads as zero (C2)', () => {
  const util = moduleAt(APPROVED, 'libs/core/src/util');
  expect(util).not.toHaveProperty('past');
  expect(util).not.toHaveProperty('through');

  // The directory gains an interface file: a folder now, under a new id, with
  // imports counted past its barrel. It is the same module, matched by its
  // path, so it is neither removed nor added, and a count approved as nothing
  // measured is not a count of none to have grown from.
  const folder = barrelled(DEMO);
  expect(departuresOf(APPROVED, folder)).toEqual([]);
  // What does grow in it is told under the id the map gives it now.
  expect(departuresOf(APPROVED, grow(folder, UTIL_FOLDER, ['libs/core/src/util/a.ts', 'libs/core/src/util/b.ts', 'libs/core/src/util/c.ts']))).toEqual([
    { kind: 'files-grown', target: 'libs/core', cell: CORE, why: 'it holds more files than approved', was: 6, now: 9 },
    { kind: 'files-grown', target: 'libs/core/src/util', cell: UTIL_FOLDER, why: 'it holds more files than approved', was: 2, now: 5 },
  ]);

  // The other way round: approved with a count, and the map carries none now.
  const unbarrelled = recell(DEMO, CORE, ({ integrity: _integrity, ...cell }) => cell);
  expect(moduleAt(approvedOf(unbarrelled), 'libs/core')).not.toHaveProperty('past');
  expect(departuresOf(APPROVED, unbarrelled)).toEqual([]);
});

test('a count or a list either side carries none of yields nothing (C2, D301 (unread-lists))', () => {
  // Fan out: approved with none, and the map with none.
  const unfanned: Approved = { ...APPROVED, modules: APPROVED.modules.map(({ fan_out: _fan, ...module }) => module) };
  expect(departuresOf(unfanned, recell(DEMO, CLI, (cell) => ({ ...cell, fan_out: 50 })))).toEqual([]);
  expect(departuresOf(APPROVED, recell(DEMO, CLI, ({ fan_out: _fan, ...cell }) => cell))).toEqual([]);

  // An interface the map counts names of and read none of: the names are not
  // known, so the document lists none, and it widens from nothing later.
  const unread = recell(DEMO, PM, ({ exports: _exports, ...cell }) => cell);
  const unnamed = approvedOf(unread);
  expect(moduleAt(unnamed, 'libs/core/src/pm')).not.toHaveProperty('exports');
  expect(moduleAt(unnamed, 'libs/core/src/pm').interface_size).toBe(3);
  expect(() => assertApproved(unnamed)).not.toThrow();
  expect(departuresOf(unnamed, recell(DEMO, PM, (cell) => ({ ...cell, exports: [...(cell.exports ?? []), 'resolveAll'] })))).toEqual([]);
  expect(departuresOf(APPROVED, unread)).toEqual([]);

  // An interface that counts no name exports none, which is known, and a name it gains is told.
  const closed = recell(DEMO, UTIL, ({ exports: _exports, ...cell }) => ({ ...cell, interface_size: 0 }));
  expect(moduleAt(approvedOf(closed), 'libs/core/src/util').exports).toEqual([]);
  expect(departuresOf(approvedOf(closed), DEMO)).toEqual([
    { kind: 'interface-widened', target: 'libs/core/src/util', cell: UTIL, why: 'its interface exports more names than approved', was: 0, now: 1, names: ['formatSlot'] },
  ]);

  // Outside packages: a map that lists none approves none, and tells none added either way.
  const { dependencies: _dependencies, ...weather } = DEMO.weather;
  const unlisted: MapJson = { ...DEMO, weather };
  expect(approvedOf(unlisted)).not.toHaveProperty('dependencies');
  expect(() => assertApproved(approvedOf(unlisted))).not.toThrow();
  expect(departuresOf(approvedOf(unlisted), DEMO)).toEqual([]);
  expect(departuresOf(APPROVED, unlisted)).toEqual([]);
});

test('a package and the directory of loose files at its root share a path and are held apart by whether the kind is package (D218 (departure-cell))', () => {
  const map = corpus('round-two-3');
  const doc = approvedOf(map);
  // Sorted by path, then by kind: the directory before the package.
  expect(doc.modules.filter((module) => module.path === '.').map((module) => [module.kind, module.files, module.loc])).toEqual([
    ['directory', 3, 130],
    ['package', 76, 7472],
  ]);

  // One loose file grows, and both contours that hold it grow with it: two
  // departures of one kind at one path, told apart by the cell.
  const longer = reline(map, 'dangerfile.ts', 2000 + (map.terrain.organelles.find((organelle) => organelle.path === 'dangerfile.ts')?.loc ?? 0));
  expect(departuresOf(doc, longer)).toEqual([
    { kind: 'lines-grown', target: '.', cell: 'directory:.', why: 'it holds more lines than approved', was: 130, now: 2130 },
    { kind: 'lines-grown', target: '.', cell: 'package:.', why: 'it holds more lines than approved', was: 7472, now: 9472 },
  ]);
  expect(() => assertMap(withApproved(longer, doc))).not.toThrow();

  // The directory half goes and the package stays at the path.
  const halved = without(map, 'directory:.');
  expect(departuresOf(doc, halved)).toEqual([{ kind: 'module-removed', target: '.', cell: 'directory:.', why: 'a module the approved shape held', was: 3 }]);
  expect(() => assertMap(withApproved(halved, doc))).not.toThrow();

  // A shape that held one of the pair never has it compared with the other: the other is new.
  const only = (kind: ApprovedModule['kind']): Approved => ({ ...doc, modules: doc.modules.filter((module) => module.path !== '.' || module.kind === kind) });
  expect(departuresOf(only('package'), map)).toEqual([{ kind: 'module-added', target: '.', cell: 'directory:.', why: 'a module the approved shape did not hold', now: 3 }]);
  expect(departuresOf(only('directory'), map)).toEqual([{ kind: 'module-added', target: '.', cell: 'package:.', why: 'a module the approved shape did not hold', now: 76 }]);
});

test('a map built with no check artifacts approves the same shape and departs from it the same way', () => {
  const bare: MapJson = buildMap({ ...DEMO_INPUTS, check: { mode: 'git-only', reason: '.check/ is absent' } }, DEFAULT_CONFIG);
  expect(bare.meta.instruments.mode).toBe('git-only');
  expect(bare.weather.checks.category).toBe('NOINST');

  expect(approvedOf(bare)).toEqual(APPROVED);
  expect(withApproved(bare, APPROVED).approved).toEqual({ at: DEMO.meta.head, departures: [] });
  expect(() => assertMap(withApproved(bare, APPROVED))).not.toThrow();

  const later = found(grow(bare, PM, ['libs/core/src/pm/a.ts', 'libs/core/src/pm/b.ts', 'libs/core/src/pm/c.ts']), 'libs/core/src/net', ['fetch.ts']);
  expect(told(departuresOf(APPROVED, later))).toEqual([
    `libs/core files-grown ${CORE}`,
    'libs/core/src/net module-added directory:libs/core/src/net',
    `libs/core/src/pm files-grown ${PM}`,
  ]);
  expect(() => assertMap(withApproved(later, APPROVED))).not.toThrow();
});

/** What the demo's change does besides: it grows a file that already stood, and reads three files more out of `apps/cli`. */
const FURTHER = importing(edited(DEMO_INPUTS, FORMAT, 900), [
  ['apps/cli/src/doctor.ts', 'libs/core/src/util/text.ts', 'indent'],
  ['apps/cli/src/doctor.ts', FORMAT, 'formatSlot'],
  ['apps/cli/src/doctor.ts', 'libs/core/src/pm/slots.ts', 'listSlots'],
]);

test('a shape approved from a change tells nothing of that change\'s own edits when its head is mapped over another base (D308 (same-terrain))', () => {
  const doc = approvedOf(mapOf(FURTHER));
  const whole = mapOf(atHead(FURTHER));
  const exact = approvedOf(whole);

  // A change map's terrain is its base's, so the document holds the base's
  // lines, fan out and edge-found interface under the head's name; the same
  // head over itself reads its own.
  expect(doc.approved_at).toBe(exact.approved_at);
  expect([doc.over, exact.over]).toEqual([DEMO.meta.merge_base, exact.approved_at]);
  expect(moduleAt(doc, 'libs/core/src/util')).toMatchObject({ loc: 89, exports: ['formatSlot'] });
  expect(moduleAt(exact, 'libs/core/src/util')).toMatchObject({ loc: 937, exports: ['formatSlot', 'indent'] });
  expect([moduleAt(doc, 'apps/cli').fan_out, moduleAt(exact, 'apps/cli').fan_out]).toEqual([2, 5]);

  // Nothing moved since the shape was approved, and nothing is told, at any limit.
  expect(sharesTerrain(doc, whole)).toBe(false);
  expect(departuresOf(doc, whole)).toEqual([]);
  expect(departuresOf(doc, whole, LOOSE)).toEqual([]);
  expect(withApproved(whole, doc).approved).toEqual({ at: doc.approved_at, departures: [] });
  expect(() => assertMap(withApproved(whole, doc))).not.toThrow();

  // What the head itself holds is told across the two terrains as ever: a
  // module more, files more, a name more on a barrel and on a single file.
  const steps: readonly ((map: MapJson) => MapJson)[] = [
    (map) => found(map, 'libs/core/src/net', ['fetch.ts']),
    (map) => grow(map, PM, THREE),
    (map) => recell(map, PM, (cell) => ({ ...cell, exports: [...(cell.exports ?? []), 'resolveAll'] })),
    (map) => recell(map, DOCTOR, (cell) => ({ ...cell, exports: [...(cell.exports ?? []), 'runAll'] })),
  ];
  const later = steps.reduce((map, step) => step(map), whole);
  const head = [
    `apps/cli/src/doctor.ts interface-widened ${DOCTOR}`,
    `libs/core files-grown ${CORE}`,
    'libs/core/src/net module-added directory:libs/core/src/net',
    `libs/core/src/pm files-grown ${PM}`,
    `libs/core/src/pm interface-widened ${PM}`,
  ];
  expect(told(departuresOf(doc, later))).toEqual(head);
  expect(() => assertMap(withApproved(later, doc))).not.toThrow();

  // What the terrain gives is not, however far it moved; nor is an interface
  // either side found by who imported it, as `util` was before its barrel.
  const far = barrelled(recell(reline(later, FORMAT, 9000), CLI, (cell) => ({ ...cell, fan_out: 50 })));
  const named = recell(far, UTIL_FOLDER, (cell) => ({ ...cell, exports: ['formatSlot', 'indent', 'pad'] }));
  expect(told(departuresOf(doc, named))).toEqual(head);
});

test('two terrains that are each their head\'s own are held against each other in every count (D308 (same-terrain))', () => {
  const before = approvedOf(mapOf(atHead(DEMO_INPUTS)));
  const after = mapOf(atHead({ ...FURTHER, meta: { ...FURTHER.meta, head: 'b'.repeat(40) } }));
  expect(before.over).not.toBe(after.meta.merge_base);
  expect(sharesTerrain(before, after)).toBe(true);
  expect(departuresOf(before, after)).toEqual([
    { kind: 'fan-out-up', target: 'apps/cli', cell: CLI, why: 'it reads more files outside itself than approved', was: 2, now: 5 },
    { kind: 'fan-out-up', target: 'apps/cli/src/doctor.ts', cell: DOCTOR, why: 'it reads more files outside itself than approved', was: 2, now: 5 },
    { kind: 'lines-grown', target: 'libs/core', cell: CORE, why: 'it holds more lines than approved', was: 325, now: 1173 },
    { kind: 'past-interface-up', target: 'libs/core', cell: CORE, why: 'more imports enter past its interface than approved', was: 1, now: 4 },
    { kind: 'past-interface-up', target: 'libs/core/src/pm', cell: PM, why: 'more imports enter past its interface than approved', was: 0, now: 1 },
    { kind: 'interface-widened', target: 'libs/core/src/util', cell: UTIL, why: 'its interface exports more names than approved', was: 1, now: 2, names: ['indent'] },
    { kind: 'lines-grown', target: 'libs/core/src/util', cell: UTIL, why: 'it holds more lines than approved', was: 89, now: 937 },
  ]);
  expect(() => assertMap(withApproved(after, before))).not.toThrow();

  // A shape that is its head's own shares the terrain of a change cut from that head, and of no other.
  expect(sharesTerrain(before, mapOf({ ...FURTHER, meta: { ...FURTHER.meta, merge_base: before.approved_at } }))).toBe(true);
  expect(sharesTerrain(before, mapOf(FURTHER))).toBe(false);
});

test('over one base a file the change only edited moves no count, and one it added does (D309 (no-diff-estimate))', () => {
  // The terrain keeps the base's lines and edges for a file that stood at
  // the base (D32), so the edit and the new imports of `FURTHER` move only
  // what the head's own graph counts: the imports past an interface.
  const further = mapOf(FURTHER);
  expect(sharesTerrain(APPROVED, further)).toBe(true);
  expect(told(departuresOf(APPROVED, further, LOOSE))).toEqual([`libs/core past-interface-up ${CORE}`, `libs/core/src/pm past-interface-up ${PM}`]);

  // `tools.ts` is a file the demo's change added, so its lines are the head's.
  expect(departuresOf(APPROVED, mapOf(edited(DEMO_INPUTS, 'libs/core/src/pm/tools.ts', 900)))).toEqual([
    { kind: 'lines-grown', target: 'libs/core', cell: CORE, why: 'it holds more lines than approved', was: 318, now: 1122 },
    { kind: 'lines-grown', target: 'libs/core/src/pm', cell: PM, why: 'it holds more lines than approved', was: 215, now: 1019 },
  ]);
});

test('a document that names no commit its terrain was cut from is held against no terrain (D308 (same-terrain))', () => {
  const { over: _over, ...unnamed } = APPROVED;
  expect(() => assertApproved(unnamed)).not.toThrow();
  expect(sharesTerrain(unnamed, DEMO)).toBe(false);
  expect(sharesTerrain(APPROVED, DEMO)).toBe(true);

  const moved = recell(reline(grow(DEMO, PM, THREE), 'apps/cli/src/doctor.ts', 400), CLI, (cell) => ({ ...cell, fan_out: 5 }));
  expect(told(departuresOf(unnamed, moved))).toEqual([`libs/core files-grown ${CORE}`, `libs/core/src/pm files-grown ${PM}`]);
  expect(told(departuresOf(APPROVED, moved))).toEqual([
    `apps/cli fan-out-up ${CLI}`,
    `apps/cli lines-grown ${CLI}`,
    `apps/cli/src/doctor.ts lines-grown ${DOCTOR}`,
    `libs/core files-grown ${CORE}`,
    `libs/core/src/pm files-grown ${PM}`,
  ]);
});

test('the guard accepts a document with only what every module carries, and one with no outside packages listed', () => {
  const lean = { schema_version: 1, kind: 'atis.approved', approved_at: 'working-tree', modules: [{ path: '.', kind: 'directory', band: 0, files: 1, loc: 0, interface_size: 0 }] };
  expect(assertApproved(lean)).toEqual(lean);
  expect(assertApproved({ ...lean, modules: [] })).toEqual({ ...lean, modules: [] });
  const pair = [
    { path: '.', kind: 'directory', band: 0, files: 1, loc: 4, interface_size: 0, exports: [] },
    { path: '.', kind: 'package', band: 0, files: 3, loc: 40, interface_size: 2, exports: ['a', 'b'], fan_in: 0, fan_out: 0, through: 0, past: 0 },
  ];
  expect(assertApproved({ ...lean, modules: pair, dependencies: [] })).toEqual({ ...lean, modules: pair, dependencies: [] });
});

test('the guard rejects a document that is not one, a module out of shape or out of order, and two modules one path cannot hold', () => {
  const [cli, doctor] = APPROVED.modules;
  const one = (change: Record<string, unknown>): unknown => ({ ...APPROVED, modules: [{ ...cli, ...change }] });
  const cases: readonly [unknown, RegExp][] = [
    [undefined, /invalid approved shape at \$: expected an object/],
    ['approved', /\$: expected an object/],
    [{ ...APPROVED, schema_version: 2 }, /\$\.schema_version: expected 1/],
    [{ ...APPROVED, kind: 'atis.reach' }, /\$\.kind: expected "atis\.approved"/],
    [{ ...APPROVED, approved_at: undefined }, /\$\.approved_at: expected the head/],
    [{ ...APPROVED, approved_at: '' }, /\$\.approved_at: expected the head/],
    [{ ...APPROVED, over: '' }, /\$\.over: expected the commit the terrain was cut from/],
    [{ ...APPROVED, over: 7 }, /\$\.over: expected the commit the terrain was cut from/],
    [{ ...APPROVED, modules: undefined }, /\$\.modules: expected an array/],
    [{ ...APPROVED, modules: ['apps/cli'] }, /\$\.modules\[0\]: expected an object/],
    [one({ path: '' }), /\$\.modules\[0\]\.path: expected a module path/],
    [one({ path: 7 }), /\$\.modules\[0\]\.path: expected a module path/],
    [one({ kind: 'module' }), /\$\.modules\[0\]\.kind: expected one of package, folder, single, directory/],
    [one({ band: undefined }), /\$\.modules\[0\]\.band: expected a non-negative number/],
    [one({ files: '2' }), /\$\.modules\[0\]\.files: expected a non-negative number/],
    [one({ loc: -1 }), /\$\.modules\[0\]\.loc: expected a non-negative number/],
    [one({ interface_size: Number.NaN }), /\$\.modules\[0\]\.interface_size: expected a non-negative number/],
    [one({ fan_in: -1 }), /\$\.modules\[0\]\.fan_in: expected a non-negative number/],
    [one({ fan_out: null }), /\$\.modules\[0\]\.fan_out: expected a non-negative number/],
    [one({ through: 'none' }), /\$\.modules\[0\]\.through: expected a non-negative number/],
    [one({ past: -2 }), /\$\.modules\[0\]\.past: expected a non-negative number/],
    [one({ exports: 'main' }), /\$\.modules\[0\]\.exports: expected an array/],
    [one({ exports: ['main', 7] }), /\$\.modules\[0\]\.exports\[1\]: expected a name/],
    [one({ exports: ['main', ''] }), /\$\.modules\[0\]\.exports\[1\]: expected a name/],
    [one({ exports: ['run', 'main'] }), /\$\.modules\[0\]\.exports\[1\]: expected the names sorted and unique, got "main" after "run"/],
    [one({ exports: ['main', 'main'] }), /\$\.modules\[0\]\.exports\[1\]: expected the names sorted and unique/],
    [{ ...APPROVED, modules: [doctor, cli] }, /\$\.modules\[1\]: expected the modules sorted by path, then by kind/],
    [{ ...APPROVED, modules: [cli, cli] }, /\$\.modules\[1\]: expected the modules sorted by path, then by kind, and each listed once/],
    [{ ...APPROVED, modules: [cli, { ...cli, kind: 'directory' }] }, /\$\.modules\[1\]: expected the modules sorted by path, then by kind/],
    [{ ...APPROVED, modules: [{ ...cli, kind: 'directory' }, { ...cli, kind: 'folder' }] }, /\$\.modules\[1\]: two modules at "apps\/cli" and neither is a package/],
    [{ ...APPROVED, dependencies: 'kleur' }, /\$\.dependencies: expected an array/],
    [{ ...APPROVED, dependencies: ['semver', 'kleur'] }, /\$\.dependencies\[1\]: expected the names sorted and unique/],
    [{ ...APPROVED, dependencies: [7] }, /\$\.dependencies\[0\]: expected a name/],
  ];
  for (const [value, error] of cases) expect(() => assertApproved(value)).toThrow(error);
});
