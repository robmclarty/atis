import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

import { APPROVED_KIND, APPROVED_SCHEMA_VERSION, approvedOf, assertApproved } from '../approved.js';
import type { Approved, ApprovedModule } from '../approved.js';
import { DEFAULT_CONFIG } from '../config.js';
import { buildMap } from '../map.js';
import type { BuildInputs } from '../map.js';
import { assertMap } from '../schema.js';
import type { Cell, MapJson } from '../schema.js';

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

const CORE = 'package:libs/core';
const PM = 'folder:libs/core/src/pm';
const UTIL = 'directory:libs/core/src/util';

/** The map with one of its cells changed. */
function recell(map: MapJson, id: string, change: (cell: Cell) => Cell): MapJson {
  return { ...map, terrain: { ...map.terrain, cells: map.terrain.cells.map((cell) => (cell.id === id ? change(cell) : cell)) } };
}

function moduleAt(doc: Approved, path: string, kind?: ApprovedModule['kind']): ApprovedModule {
  const held = doc.modules.find((module) => module.path === path && (kind === undefined || module.kind === kind));
  if (held === undefined) throw new Error(`no module at ${path}`);
  return held;
}

const APPROVED = approvedOf(DEMO);

test('the demo map reduces to its head, every module the head holds sorted by path, and its outside packages', () => {
  // `pm` lists four files on the terrain and the change deleted one of them,
  // so the head holds three, and `libs/core` holds one fewer in its contour
  // with it (D300 (held-at-head)). The directory `util` has no barrel, so it
  // carries no `through` and no `past` (C2).
  expect(APPROVED).toEqual({
    schema_version: 1,
    kind: 'atis.approved',
    approved_at: 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678',
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

test.each(['round-two-3', 'corpus-12', 'corpus-6', 'go-1', 'corpus-8'])('the corpus map %s reduces to a document its guard accepts', (name) => {
  const map = corpus(name);
  const doc = approvedOf(map);
  expect(assertApproved(JSON.parse(JSON.stringify(doc)))).toEqual(doc);

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

test('a module whose every file the change deleted is no module of the head (D300 (held-at-head))', () => {
  const map = corpus('corpus-6');
  expect(map.terrain.cells.map((each) => each.id)).toContain('single:packages/cli/src/help.ts');
  expect(approvedOf(map).modules.map((module) => module.path)).not.toContain('packages/cli/src/help.ts');

  // The shape as it stood before the change: the same terrain, nothing deleted.
  const before = approvedOf({ ...map, weather: { ...map.weather, changed: [] } });
  expect(moduleAt(before, 'packages/cli/src/help.ts')).toMatchObject({ kind: 'single', files: 1 });
});

test('what the map carries none of is left out of the document, never written as a zero or an empty list (C2, D301 (unread-lists))', () => {
  // A directory has no barrel, so no import goes through or past one.
  const util = moduleAt(APPROVED, 'libs/core/src/util');
  expect(util).not.toHaveProperty('past');
  expect(util).not.toHaveProperty('through');
  const unbarrelled = recell(DEMO, CORE, ({ integrity: _integrity, ...cell }) => cell);
  expect(moduleAt(approvedOf(unbarrelled), 'libs/core')).not.toHaveProperty('past');

  // An interface the map counts names of and read none of: the names are not known.
  const unnamed = approvedOf(recell(DEMO, PM, ({ exports: _exports, ...cell }) => cell));
  expect(moduleAt(unnamed, 'libs/core/src/pm')).not.toHaveProperty('exports');
  expect(moduleAt(unnamed, 'libs/core/src/pm').interface_size).toBe(3);
  expect(() => assertApproved(unnamed)).not.toThrow();

  // An interface that counts no name exports none, which is known.
  const closed = recell(DEMO, UTIL, ({ exports: _exports, ...cell }) => ({ ...cell, interface_size: 0 }));
  expect(moduleAt(approvedOf(closed), 'libs/core/src/util').exports).toEqual([]);

  // A map that lists no outside packages approves none.
  const { dependencies: _dependencies, ...weather } = DEMO.weather;
  const unlisted: MapJson = { ...DEMO, weather };
  expect(approvedOf(unlisted)).not.toHaveProperty('dependencies');
  expect(() => assertApproved(approvedOf(unlisted))).not.toThrow();
});

test('a package and the directory of loose files at its root share a path, and are listed by kind under it (D218 (departure-cell))', () => {
  const doc = approvedOf(corpus('round-two-3'));
  expect(doc.modules.filter((module) => module.path === '.').map((module) => [module.kind, module.files, module.loc])).toEqual([
    ['directory', 3, 130],
    ['package', 76, 7472],
  ]);
});

test('a map built with no check artifacts approves the same shape', () => {
  const bare: MapJson = buildMap({ ...DEMO_INPUTS, check: { mode: 'git-only', reason: '.check/ is absent' } }, DEFAULT_CONFIG);
  expect(bare.meta.instruments.mode).toBe('git-only');
  expect(bare.weather.checks.category).toBe('NOINST');
  expect(approvedOf(bare)).toEqual(APPROVED);
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
