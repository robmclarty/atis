import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson } from 'core';
import { dentedRing, outlineOf, rulesOf } from 'scene';
import { expect, test } from 'vitest';

import { hoverOf } from '../hover.js';

/**
 * What the world shows of the thing under the pointer (step 38): a file's own
 * outline and its path as the rail writes it, a cell's membrane and its
 * folder.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', '..', 'libs', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));

const placed = (map: MapJson, path: string): { readonly kind: 'organelle'; readonly path: string; readonly cell: string; readonly x: number; readonly y: number; readonly r: number } => {
  const at = map.terrain.layout?.positions[path];
  const organelle = map.terrain.organelles.find((each) => each.id === path);
  if (at === undefined || organelle === undefined) throw new Error(`${path} is not a placed file`);
  return { kind: 'organelle', path, cell: organelle.cell, ...at };
};

test('a file shows its own outline, rules and all, and its path, `+` before an added one (D146, D120)', () => {
  const index = placed(DEMO, 'libs/core/src/pm/index.ts');
  const organelle = DEMO.terrain.organelles.find((each) => each.id === index.path);
  expect(hoverOf(DEMO, index)).toEqual({ key: 'organelle:libs/core/src/pm/index.ts', target: 'libs/core/src/pm/index.ts', text: 'libs/core/src/pm/index.ts', ring: outlineOf(index.path, index, rulesOf(organelle?.dents ?? [])).ring });
  expect(hoverOf(DEMO, placed(DEMO, 'libs/core/src/pm/tools.ts'))?.text).toBe('+libs/core/src/pm/tools.ts');
});

test('a renamed file shows where it came from (D40)', () => {
  const renamed: MapJson = {
    ...DEMO,
    weather: { ...DEMO.weather, changed: DEMO.weather.changed.map((file) => (file.path === 'libs/core/src/pm/index.ts' ? { ...file, kind: 'renamed', from: 'libs/core/src/pm/main.ts' } : file)) },
  };
  expect(hoverOf(renamed, placed(renamed, 'libs/core/src/pm/index.ts'))?.text).toBe('libs/core/src/pm/main.ts → libs/core/src/pm/index.ts');
});

test('a cell shows its membrane with its teeth and its folder, and one the layout drew no skin for shows nothing', () => {
  const cell = DEMO.terrain.cells.find((each) => each.id === 'folder:libs/core/src/pm');
  const contour = DEMO.terrain.layout?.contours?.['folder:libs/core/src/pm'];
  if (cell === undefined || contour === undefined) throw new Error('the demo lost its pm folder');
  expect(hoverOf(DEMO, { kind: 'membrane', cell: cell.id })).toEqual({ key: 'membrane:folder:libs/core/src/pm', target: 'folder:libs/core/src/pm', text: 'libs/core/src/pm', ring: dentedRing(contour, cell.dents.length) });
  expect(hoverOf(DEMO, { kind: 'membrane', cell: 'folder:nowhere' })).toBeUndefined();
});
