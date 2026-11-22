import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import { expect, test, vi } from 'vitest';

import { createNav, selectedOf, targetOf } from '../nav.js';
import type { Move, Selected, Steering } from '../nav.js';

/**
 * The selection and the pointing on the line between the chrome and the
 * world (D209 (selection-line)): the line keeps both itself, so a panel reads
 * and sets them with no world drawn; either side sets them and both hear
 * them; and the world is asked to take a selection, to fly to one, and to
 * ring what the chrome points at, never what it pointed at itself.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', '..', 'libs', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));

const PM: Selected = { kind: 'cell', cell: 'folder:libs/core/src/pm' };
const INDEX: Selected = { kind: 'organelle', path: 'libs/core/src/pm/index.ts', cell: 'folder:libs/core/src/pm' };
const TOOLS = 'libs/core/src/pm/tools.ts';

/** A world that only writes down what it is asked. */
const world = (): { readonly steering: Steering; readonly selects: [Selected | undefined, Move][]; readonly points: (string | undefined)[] } => {
  const selects: [Selected | undefined, Move][] = [];
  const points: (string | undefined)[] = [];
  const steering: Steering = { lookAt: () => undefined, visit: () => undefined, select: (selected, move) => selects.push([selected, move]), point: (target) => points.push(target) };
  return { steering, selects, points };
};

test('with no world the line keeps the selection and the pointing itself, and tells whoever listens', () => {
  const nav = createNav();
  const heard = vi.fn();
  nav.subscribe(heard);
  expect(nav.selected()).toBeUndefined();
  expect(nav.pointed()).toBeUndefined();

  nav.select(INDEX, 'fly');
  expect(nav.selected()).toEqual(INDEX);
  expect(heard).toHaveBeenCalledTimes(1);

  nav.point(TOOLS, 'chrome');
  expect(nav.pointed()).toEqual({ target: TOOLS, from: 'chrome' });
  expect(heard).toHaveBeenCalledTimes(2);

  nav.select(undefined, 'stay');
  nav.point(undefined, 'chrome');
  expect(nav.selected()).toBeUndefined();
  expect(nav.pointed()).toBeUndefined();
  expect(heard).toHaveBeenCalledTimes(4);
});

test('a selection that did not move is heard by nobody and stays the same value, so React reads it as a snapshot', () => {
  const nav = createNav();
  const heard = vi.fn();
  nav.subscribe(heard);
  nav.select(INDEX, 'stay');
  const held = nav.selected();
  nav.select({ ...INDEX }, 'stay');
  // The same file written down in another order is the same selection.
  nav.select({ cell: INDEX.cell, path: 'libs/core/src/pm/index.ts', kind: 'organelle' }, 'fly');
  expect(nav.selected()).toBe(held);
  expect(heard).toHaveBeenCalledTimes(1);

  nav.point(TOOLS, 'world');
  const pointed = nav.pointed();
  nav.point(TOOLS, 'world');
  expect(nav.pointed()).toBe(pointed);
  expect(heard).toHaveBeenCalledTimes(2);

  // Clearing what is already clear moves nothing.
  nav.select(undefined, 'stay');
  nav.select(undefined, 'fly');
  expect(heard).toHaveBeenCalledTimes(3);
});

test('the world is asked to take each selection that moved, to fly again to one that did not, and nothing for a clear that changed nothing', () => {
  const nav = createNav();
  const { steering, selects } = world();
  nav.steer(steering);

  nav.select(PM, 'stay');
  nav.select(PM, 'stay');
  nav.select(PM, 'fly');
  nav.select(INDEX, 'fly');
  nav.select(undefined, 'stay');
  nav.select(undefined, 'fly');
  expect(selects).toEqual([
    [PM, 'stay'],
    [PM, 'fly'],
    [INDEX, 'fly'],
    [undefined, 'stay'],
  ]);

  // A module and a file in it are two selections, and so are two files of one module.
  nav.select(PM, 'stay');
  nav.select(INDEX, 'stay');
  nav.select({ kind: 'organelle', path: TOOLS, cell: PM.cell }, 'stay');
  expect(selects.slice(4).map(([selected]) => (selected === undefined ? undefined : targetOf(selected)))).toEqual([PM.cell, INDEX.path, TOOLS]);
});

test('the listeners hear a selection before the world is asked to take it, and a world that lets go is asked no more', () => {
  const nav = createNav();
  const order: string[] = [];
  nav.subscribe(() => order.push(`heard ${nav.selected()?.kind ?? 'none'}`));
  const release = nav.steer({ lookAt: () => undefined, visit: () => undefined, select: (selected) => order.push(`asked ${selected?.kind ?? 'none'}`) });
  nav.select(PM, 'stay');
  release();
  nav.select(INDEX, 'fly');
  expect(order).toEqual(['heard cell', 'asked cell', 'heard organelle']);
  expect(nav.selected()).toEqual(INDEX);
});

test('the world is asked to ring what the chrome points at and never what it pointed at itself', () => {
  const nav = createNav();
  const { steering, points } = world();
  nav.steer(steering);

  nav.point(TOOLS, 'world');
  nav.point(undefined, 'world');
  expect(points).toEqual([]);

  nav.point(TOOLS, 'chrome');
  nav.point(TOOLS, 'chrome');
  nav.point(PM.cell, 'chrome');
  nav.point(undefined, 'chrome');
  expect(points).toEqual([TOOLS, PM.cell, undefined]);
});

test("either side's pointing takes the other's place, and a side lets go only of what it pointed at", () => {
  const nav = createNav();
  const { steering, points } = world();
  nav.steer(steering);
  const heard = vi.fn();
  nav.subscribe(heard);

  // The pointer leaves a row for the map: the world points first, and the row's leave comes after.
  nav.point(TOOLS, 'chrome');
  nav.point(INDEX.path, 'world');
  expect(nav.pointed()).toEqual({ target: INDEX.path, from: 'world' });
  // The world's pointing took the chrome's place, so the ring the chrome asked for goes.
  expect(points).toEqual([TOOLS, undefined]);
  nav.point(undefined, 'chrome');
  expect(nav.pointed()).toEqual({ target: INDEX.path, from: 'world' });
  expect(heard).toHaveBeenCalledTimes(2);

  // And the other way: the chrome points at what the world pointed at, and the world's leave lets nothing go.
  nav.point(INDEX.path, 'chrome');
  nav.point(undefined, 'world');
  expect(nav.pointed()).toEqual({ target: INDEX.path, from: 'chrome' });
  expect(points).toEqual([TOOLS, undefined, INDEX.path]);
  expect(heard).toHaveBeenCalledTimes(3);
});

test('a world with no select and no point of its own leaves the line working, and the older asks go where they went', () => {
  const nav = createNav();
  const visit = vi.fn();
  const hover = vi.fn();
  nav.steer({ lookAt: () => undefined, visit, hover });
  nav.select(INDEX, 'fly');
  nav.point(TOOLS, 'chrome');
  expect(nav.selected()).toEqual(INDEX);
  expect(nav.pointed()).toEqual({ target: TOOLS, from: 'chrome' });
  // Selecting asks the world through `select` alone: the line flies nowhere by itself.
  expect(visit).not.toHaveBeenCalled();
  nav.visit(INDEX);
  nav.hover(TOOLS);
  expect(visit).toHaveBeenCalledWith(INDEX);
  expect(hover).toHaveBeenCalledWith(TOOLS);
});

test('the selection and the pointing leave the stop, the open cell and the frame alone', () => {
  const nav = createNav();
  nav.settle(PM);
  nav.open({ cell: PM.cell, exploded: false, wired: false });
  nav.scrub(1);
  nav.select(INDEX, 'stay');
  nav.point(TOOLS, 'world');
  expect(nav.stop()).toEqual(PM);
  expect(nav.opened()).toEqual({ cell: PM.cell, exploded: false, wired: false });
  expect(nav.frame()).toBe(1);
});

test('a target names its selection in a map, a file before a module, and a selection its target', () => {
  expect(selectedOf(DEMO, INDEX.path)).toEqual(INDEX);
  expect(selectedOf(DEMO, PM.cell)).toEqual(PM);
  expect(selectedOf(DEMO, 'apps/cli/src/doctor.ts')).toEqual({ kind: 'organelle', path: 'apps/cli/src/doctor.ts', cell: 'single:apps/cli/src/doctor.ts' });
  // Neither a file of the terrain nor a cell: a path the map does not hold, a shore file's among them.
  expect(selectedOf(DEMO, 'libs/core/src/gone.ts')).toBeUndefined();
  expect(DEMO.terrain.groups.flatMap((group) => group.files)).toContain('README.md');
  expect(selectedOf(DEMO, 'README.md')).toBeUndefined();
  expect(targetOf(INDEX)).toBe(INDEX.path);
  expect(targetOf(PM)).toBe(PM.cell);
  for (const target of [INDEX.path, PM.cell]) {
    const selected = selectedOf(DEMO, target);
    expect(selected === undefined ? undefined : targetOf(selected)).toBe(target);
  }
});

test('the line holds the file whose plate was asked for, tells who listens, and puts it away when the selection moves (D350 (plate-by-ask))', () => {
  const nav = createNav();
  let heard = 0;
  nav.subscribe(() => (heard += 1));
  expect(nav.plated()).toBeUndefined();
  nav.plate('libs/core/src/pm/tools.ts');
  expect(nav.plated()).toBe('libs/core/src/pm/tools.ts');
  expect(heard).toBe(1);
  // Asked for again, nothing moved and nobody hears.
  nav.plate('libs/core/src/pm/tools.ts');
  expect(heard).toBe(1);
  nav.select({ kind: 'cell', cell: 'folder:libs/core/src/pm' }, 'stay');
  expect(nav.plated()).toBeUndefined();
  nav.plate('libs/core/src/pm/tools.ts');
  nav.plate(undefined);
  expect(nav.plated()).toBeUndefined();
});
