// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson, Notice } from 'core';
import { expect, test } from 'vitest';

import { FIELD, createWalk, destinationOf, ownsKey } from '../walk.js';
import type { Stop } from '../walk.js';

/**
 * The map's stops and the ways between them (§6, step 39), walked on the
 * demo's own cells: the breadcrumb at every stop, the arrows to a sibling
 * that way, Enter into what lies under the view's centre, Escape back out,
 * the stop a view shows when moved by hand, and where a notice's row leads.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', '..', 'libs', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));
const WALK = createWalk(DEMO);

const cell = (id: string): Stop => ({ kind: 'cell', cell: id });
const file = (path: string, id: string): Stop => ({ kind: 'organelle', path, cell: id });

const CLI = cell('package:apps/cli');
const CORE = cell('package:libs/core');
const PM = cell('folder:libs/core/src/pm');
const UTIL = cell('directory:libs/core/src/util');
const INDEX = file('libs/core/src/pm/index.ts', 'folder:libs/core/src/pm');
/** A point inside the pm folder's skin, clear of its files. */
const IN_PM = [190, 500] as const;

const notice = (target: string): Notice => ({ tier: 'primary', kind: 'k', target, why: 'w', inputs: {}, thresholds: {}, weight: 1 });
const noticed = (target: string): MapJson => ({ ...DEMO, notices: [notice(target)] });

test('the breadcrumb reads down from the field, each cell by its path below the one that holds it, `+` before an added file', () => {
  expect(WALK.crumbs(FIELD)).toEqual(['field']);
  expect(WALK.crumbs(CORE)).toEqual(['field', 'libs/core']);
  expect(WALK.crumbs(PM)).toEqual(['field', 'libs/core', 'src/pm']);
  expect(WALK.crumbs(INDEX)).toEqual(['field', 'libs/core', 'src/pm', 'index.ts']);
  expect(WALK.crumbs(file('libs/core/src/pm/tools.ts', 'folder:libs/core/src/pm'))).toEqual(['field', 'libs/core', 'src/pm', '+tools.ts']);
  expect(WALK.crumbs(cell('single:apps/cli/src/doctor.ts'))).toEqual(['field', 'apps/cli', 'src/doctor.ts']);
});

test('Escape ascends a step at a time to the field, and no further', () => {
  expect(WALK.key(INDEX, 'Escape', IN_PM)).toEqual(PM);
  expect(WALK.key(PM, 'Escape', IN_PM)).toEqual(CORE);
  expect(WALK.key(CORE, 'Escape', IN_PM)).toEqual(FIELD);
  expect(WALK.key(FIELD, 'Escape', IN_PM)).toBeUndefined();
});

test('Enter descends into whatever lies under the view, a step at a time, else into the child nearest it', () => {
  expect(WALK.key(FIELD, 'Enter', IN_PM)).toEqual(CORE);
  expect(WALK.key(CORE, 'Enter', IN_PM)).toEqual(PM);
  const index = DEMO.terrain.layout?.positions['libs/core/src/pm/index.ts'];
  expect(WALK.key(PM, 'Enter', [index?.x ?? 0, index?.y ?? 0])).toEqual(INDEX);
  // Over open ground at the top right, the top cell whose middle lies nearest.
  expect(WALK.key(FIELD, 'Enter', [400, 100])).toEqual(CLI);
  // A file is the deepest stop until the file level opens.
  expect(WALK.key(INDEX, 'Enter', IN_PM)).toBeUndefined();
});

test('an arrow walks to the sibling that way, cells among cells and files among files, and to nothing past the last', () => {
  expect(WALK.key(CORE, 'ArrowUp', IN_PM)).toEqual(CLI);
  expect(WALK.key(CLI, 'ArrowDown', IN_PM)).toEqual(CORE);
  expect(WALK.key(CLI, 'ArrowUp', IN_PM)).toBeUndefined();
  expect(WALK.key(PM, 'ArrowDown', IN_PM)).toEqual(UTIL);
  expect(WALK.key(UTIL, 'ArrowUp', IN_PM)).toEqual(PM);
  // The pm folder settles alone as a column, one file a terrace: index.ts, slots.ts and legacy.ts down it, the added tools.ts beside its foot.
  expect(WALK.key(INDEX, 'ArrowDown', IN_PM)).toEqual(file('libs/core/src/pm/slots.ts', 'folder:libs/core/src/pm'));
  expect(WALK.key(file('libs/core/src/pm/tools.ts', 'folder:libs/core/src/pm'), 'ArrowUp', IN_PM)).toEqual(file('libs/core/src/pm/legacy.ts', 'folder:libs/core/src/pm'));
  expect(WALK.key(FIELD, 'ArrowLeft', IN_PM)).toBeUndefined();
  expect(WALK.key(PM, 'Tab', IN_PM)).toBeUndefined();
});

test('a view moved by hand shows the field from far off, the cell under its centre from the surface, and the file there at its level', () => {
  const index = DEMO.terrain.layout?.positions['libs/core/src/pm/index.ts'];
  const at = [index?.x ?? 0, index?.y ?? 0] as const;
  expect(WALK.stopAt(at, 0)).toEqual(FIELD);
  expect(WALK.stopAt(IN_PM, 1)).toEqual(PM);
  expect(WALK.stopAt(at, 2)).toEqual(PM);
  expect(WALK.stopAt(at, 3)).toEqual(INDEX);
  expect(WALK.stopAt([400, 600], 3)).toEqual(FIELD);
});

test('each stop frames its own ground: the layout, a cell’s skin, a file with room round it', () => {
  const layout = DEMO.terrain.layout;
  expect(WALK.box(FIELD, 4)).toEqual({ x0: 0, y0: 0, x1: layout?.width, y1: layout?.height });
  const contour = layout?.contours?.['folder:libs/core/src/pm'] ?? [];
  expect(WALK.box(PM, 4)).toEqual({ x0: Math.min(...contour.map(([x]) => x)), y0: Math.min(...contour.map(([, y]) => y)), x1: Math.max(...contour.map(([x]) => x)), y1: Math.max(...contour.map(([, y]) => y)) });
  const index = layout?.positions['libs/core/src/pm/index.ts'] ?? { x: 0, y: 0, r: 0 };
  expect(WALK.box(INDEX, 4)).toEqual({ x0: index.x - 4 * index.r, y0: index.y - 4 * index.r, x1: index.x + 4 * index.r, y1: index.y + 4 * index.r });
});

test("a notice's row leads to where its target is drawn: its file, the file a test's stitch sits on, its cell, or its group's block (D148, D153)", () => {
  expect(destinationOf(DEMO, 1)).toEqual({ kind: 'stop', stop: INDEX });
  expect(destinationOf(noticed('libs/core/src/__tests__/pm.test.ts'), 1)).toEqual({ kind: 'stop', stop: INDEX });
  expect(destinationOf(noticed('folder:libs/core/src/pm'), 1)).toEqual({ kind: 'stop', stop: PM });
  expect(destinationOf(noticed('README.md'), 1)).toEqual({ kind: 'group', group: 'docs' });
  expect(destinationOf(noticed('nowhere.ts'), 1)).toBeUndefined();
  expect(destinationOf(DEMO, 9)).toBeUndefined();
});

test('a key typed into a field is its own, and Enter on a button is the button’s; anywhere else the walk takes it', () => {
  const input = document.createElement('input');
  const button = document.createElement('button');
  const plain = document.createElement('div');
  expect(ownsKey(input, 'ArrowLeft')).toBe(true);
  expect(ownsKey(button, 'Enter')).toBe(true);
  expect(ownsKey(button, 'ArrowLeft')).toBe(false);
  expect(ownsKey(plain, 'Enter')).toBe(false);
  expect(ownsKey(null, 'Escape')).toBe(false);
});
