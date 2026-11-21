import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import { slideCellOf } from 'scene';
import type { Pick } from 'scene';
import { expect, test } from 'vitest';

import { createNav } from '../nav.js';
import type { Selected } from '../nav.js';
import { openedFor, selectedBy, targetOfPick } from '../selection.js';
import type { SelectEvent } from '../selection.js';

/**
 * The selection, event by event (D207 (click-selects)): a click on a file
 * selects the file, on a module's ground the module, on open space nothing;
 * Escape clears it; and a selection set over the line is held to the map.
 * And the cell a selection holds open as a slide (D205 (open-on-select)):
 * a module's own, a file's never, though a file keeps the slide it floats on.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', '..', 'libs', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));

const PM = 'folder:libs/core/src/pm';
const UTIL = 'directory:libs/core/src/util';
const CLI = 'package:apps/cli';
const DOCTOR_CELL = 'single:apps/cli/src/doctor.ts';
const DOCTOR = 'apps/cli/src/doctor.ts';
const TOOLS = 'libs/core/src/pm/tools.ts';

const click = (target: string | undefined): SelectEvent => ({ kind: 'click', target });
const walk = (events: readonly SelectEvent[], from?: Selected): Selected | undefined => events.reduce<Selected | undefined>((state, event) => selectedBy(DEMO, state, event), from);

/** The cell whose slide shows a cell's files on the demo, every slide there showing some. */
const slideOf = (cell: string): string => slideCellOf(DEMO, cell);

test('a click on a file selects the file, on a module its cell, and on open space clears the selection; Escape clears it too', () => {
  expect(walk([click(TOOLS)])).toEqual({ kind: 'organelle', path: TOOLS, cell: PM });
  expect(walk([click(PM)])).toEqual({ kind: 'cell', cell: PM });
  expect(walk([click(TOOLS), click(PM)])).toEqual({ kind: 'cell', cell: PM });
  expect(walk([click(PM), click(undefined)])).toBeUndefined();
  expect(walk([click(PM), { kind: 'escape' }])).toBeUndefined();
  expect(walk([{ kind: 'escape' }])).toBeUndefined();
  expect(walk([click(undefined)])).toBeUndefined();
});

test("a pick names its target as the hover writes it, and a file picked floating on another cell's slide is selected in its own cell (D209 (selection-line))", () => {
  const onGround: Pick = { kind: 'membrane', cell: PM };
  expect(targetOfPick(onGround)).toBe(PM);
  expect(targetOfPick(undefined)).toBeUndefined();
  // The doctor's file floats on the cli package's slide, and is picked there with the package's cell; its selection names its own single-file cell.
  const floating: Pick = { kind: 'organelle', path: DOCTOR, cell: CLI, x: 60, y: 230, r: 13 };
  expect(targetOfPick(floating)).toBe(DOCTOR);
  expect(walk([click(targetOfPick(floating))])).toEqual({ kind: 'organelle', path: DOCTOR, cell: DOCTOR_CELL });
});

test('a click on what is already selected keeps the same selection, so nothing downstream reads it as moved', () => {
  const first = walk([click(TOOLS)]);
  expect(walk([click(TOOLS)], first)).toBe(first);
  const cell = walk([click(PM)]);
  expect(walk([click(PM)], cell)).toBe(cell);
  expect(walk([click(UTIL)], cell)).not.toBe(cell);
});

test('a selection set over the line is held to the map: kept where the map holds it, rebuilt from its target, and none where the terrain holds neither a file nor a module for it', () => {
  const nav = createNav();
  nav.select({ kind: 'cell', cell: PM }, 'fly');
  expect(walk([{ kind: 'select', selected: nav.selected() }])).toEqual({ kind: 'cell', cell: PM });
  // A file handed over with the slide's cell, as a pick's own cell would build it, is read back in its own.
  expect(walk([{ kind: 'select', selected: { kind: 'organelle', path: DOCTOR, cell: CLI } }])).toEqual({ kind: 'organelle', path: DOCTOR, cell: DOCTOR_CELL });
  // A shore file, and a module of some other map, are no selection here.
  expect(walk([{ kind: 'select', selected: { kind: 'organelle', path: 'README.md', cell: PM } }])).toBeUndefined();
  expect(walk([{ kind: 'select', selected: { kind: 'cell', cell: 'folder:gone' } }])).toBeUndefined();
  expect(walk([{ kind: 'select', selected: undefined }], { kind: 'cell', cell: PM })).toBeUndefined();
  expect(walk([click('folder:gone')], { kind: 'cell', cell: PM })).toBeUndefined();
});

test("a selected module holds its slide open, a single-file module the package's it floats on, and one whose slide would show no files none (D205 (open-on-select))", () => {
  expect(openedFor({ kind: 'cell', cell: PM }, undefined, slideOf)).toBe(PM);
  // Selecting another module moves the slide there, whichever is open.
  expect(openedFor({ kind: 'cell', cell: UTIL }, PM, slideOf)).toBe(UTIL);
  expect(openedFor({ kind: 'cell', cell: DOCTOR_CELL }, undefined, slideOf)).toBe(CLI);
  // A package whose files all sit in the folders it holds has nothing to show but holes.
  const bare = (cell: string): string | undefined => (cell === CLI ? undefined : slideOf(cell));
  expect(openedFor({ kind: 'cell', cell: CLI }, undefined, bare)).toBeUndefined();
  expect(openedFor({ kind: 'cell', cell: CLI }, PM, bare)).toBeUndefined();
});

test('a selected file opens no slide, keeps the one it floats on open, and lets any other close; nothing selected holds nothing open (D205 (open-on-select))', () => {
  const tools: Selected = { kind: 'organelle', path: TOOLS, cell: PM };
  expect(openedFor(tools, undefined, slideOf)).toBeUndefined();
  expect(openedFor(tools, PM, slideOf)).toBe(PM);
  expect(openedFor(tools, UTIL, slideOf)).toBeUndefined();
  // The doctor's file floats on the package's slide, so that is the one it keeps.
  const doctor: Selected = { kind: 'organelle', path: DOCTOR, cell: DOCTOR_CELL };
  expect(openedFor(doctor, CLI, slideOf)).toBe(CLI);
  expect(openedFor(doctor, PM, slideOf)).toBeUndefined();
  expect(openedFor(undefined, PM, slideOf)).toBeUndefined();
  expect(openedFor(undefined, undefined, slideOf)).toBeUndefined();
});
