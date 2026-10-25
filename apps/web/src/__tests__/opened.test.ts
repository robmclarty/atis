import { expect, test } from 'vitest';

import { CLOSED, cellOf, openedBy, openedOf } from '../opened.js';
import type { OpenEvent, OpenState } from '../opened.js';
import type { Pick } from 'scene';
import { FIELD } from '../walk.js';

/**
 * Which cell is open as a slide, event by event (D155, D165): opened under the
 * view's centre from the surface on where its skin fills the gate's share,
 * held while the view stays inside it at the share it holds at, closed by
 * zooming out past that, Esc, a click on open ground or leaving it, kept by a
 * click on one of its floated files, switched by a click on another cell that
 * would hold, and its exploded view and its wiring toggled. The world says
 * which cell fills the share under the centre (`under`) and which would hold
 * (`holds`); these events stand for its measurements.
 */
const PM = 'folder:libs/core/src/pm';
const UTIL = 'directory:libs/core/src/util';

/** Every cell holds open: in view, and filling the share it holds at. */
const ALL = (): boolean => true;
const frame = (under: string | undefined, lod: 0 | 1 | 2 | 3 | 4 = 1, holds: (cell: string) => boolean = ALL): OpenEvent => ({ kind: 'frame', lod, under, holds });
const click = (pick: Pick | undefined, holds: (cell: string) => boolean = ALL, lod: 0 | 1 | 2 | 3 | 4 = 1): OpenEvent => ({ kind: 'click', lod, pick, holds });
const membrane = (cell: string): OpenEvent => click({ kind: 'membrane', cell });

/** The state after each event in turn. */
const walk = (events: readonly OpenEvent[], from: OpenState = CLOSED): OpenState => events.reduce(openedBy, from);

test("from the surface on the cell that fills the gate's share under the view's centre opens, and nothing opens where none does or at the far field", () => {
  expect(walk([frame(PM)])).toEqual({ open: PM, exploded: false, wired: false });
  expect(walk([frame(undefined)])).toEqual(CLOSED);
  expect(walk([frame(PM, 0)])).toEqual(CLOSED);
  expect(walk([frame(PM, 3)])).toEqual({ open: PM, exploded: false, wired: false });
  expect(openedOf(walk([frame(PM)]))).toEqual({ cell: PM, exploded: false, wired: false });
  expect(openedOf(CLOSED)).toBeUndefined();
});

test('an open cell stays open while it holds, whatever lies under the centre, and closes once the view has left it or zooms out past its share', () => {
  const open = walk([frame(PM)]);
  expect(walk([frame(undefined)], open)).toEqual(open);
  expect(walk([frame(UTIL)], open)).toEqual(open);
  expect(walk([frame(undefined, 1, () => false)], open)).toEqual(CLOSED);
  expect(walk([frame(UTIL, 1, () => false)], open)).toEqual({ open: UTIL, exploded: false, wired: false });
  // Zoomed out until pm fills less than it holds at, with the package's own ground under the centre filling the share, the package opens.
  expect(walk([frame('package:libs/core', 1, (cell) => cell !== PM)], open)).toEqual({ open: 'package:libs/core', exploded: false, wired: false });
  expect(walk([frame(PM, 0)], open)).toEqual(CLOSED);
  expect(walk([{ kind: 'explode' }, frame(PM, 0)], open)).toEqual(CLOSED);
});

test('Esc and a click on open ground close the cell, and it does not spring back open until the centre has left it', () => {
  const open = walk([frame(PM)]);
  const escaped = walk([{ kind: 'escape' }], open);
  expect(escaped).toEqual({ exploded: false, wired: false, dismissed: PM });
  expect(openedOf(escaped)).toBeUndefined();
  expect(walk([frame(PM)], escaped)).toEqual(escaped);
  expect(walk([frame(undefined)], escaped)).toEqual(CLOSED);
  expect(walk([frame(UTIL)], escaped)).toEqual({ open: UTIL, exploded: false, wired: false });
  expect(walk([frame(undefined), frame(PM)], escaped)).toEqual({ open: PM, exploded: false, wired: false });
  expect(walk([click(undefined)], open)).toEqual({ exploded: false, wired: false, dismissed: PM });
  // A click on the open cell's own ground opens it again at once.
  expect(walk([{ kind: 'escape' }, membrane(PM)], open)).toEqual({ open: PM, exploded: false, wired: false });
  // Esc with nothing open changes nothing.
  expect(walk([{ kind: 'escape' }])).toEqual(CLOSED);
});

test("a click on another cell that would hold, or on one of its files, opens that cell instead; a click on the open cell or one of its floated files keeps it, and a click at the far field or on a cell too small to hold does nothing", () => {
  const open = walk([frame(PM), { kind: 'explode' }]);
  expect(walk([membrane(UTIL)], open)).toEqual({ open: UTIL, exploded: false, wired: false });
  expect(walk([click({ kind: 'organelle', path: 'libs/core/src/util/text.ts', cell: UTIL, x: 0, y: 0, r: 1 })], open)).toEqual({ open: UTIL, exploded: false, wired: false });
  expect(walk([membrane(PM)], open)).toEqual(open);
  // A file of the open cell, where it has floated, keeps the cell open (D165).
  expect(walk([click({ kind: 'organelle', path: 'libs/core/src/pm/tools.ts', cell: PM, x: 104, y: 546, r: 10 })], open)).toEqual(open);
  expect(walk([click(undefined, ALL, 0)], open)).toEqual(open);
  expect(walk([click({ kind: 'membrane', cell: UTIL }, (cell) => cell !== UTIL)], open)).toEqual(open);
});

test('the exploded view toggles on the open cell alone, and gathers when the cell closes or another opens', () => {
  expect(walk([{ kind: 'explode' }])).toEqual(CLOSED);
  const spread = walk([frame(PM), { kind: 'explode' }]);
  expect(spread).toEqual({ open: PM, exploded: true, wired: false });
  expect(openedOf(spread)).toEqual({ cell: PM, exploded: true, wired: false });
  expect(walk([{ kind: 'explode' }], spread)).toEqual({ open: PM, exploded: false, wired: false });
  expect(walk([frame(UTIL)], spread)).toEqual(spread);
  expect(walk([membrane(UTIL)], spread)).toEqual({ open: UTIL, exploded: false, wired: false });
  expect(walk([{ kind: 'escape' }], spread)).toEqual({ exploded: false, wired: false, dismissed: PM });
});

test('the wiring toggles on the open cell alone, beside the exploded view, and goes when the cell closes or another opens', () => {
  expect(walk([{ kind: 'wire' }])).toEqual(CLOSED);
  const wired = walk([frame(PM), { kind: 'wire' }]);
  expect(wired).toEqual({ open: PM, exploded: false, wired: true });
  expect(openedOf(wired)).toEqual({ cell: PM, exploded: false, wired: true });
  expect(walk([{ kind: 'explode' }], wired)).toEqual({ open: PM, exploded: true, wired: true });
  expect(walk([{ kind: 'wire' }], wired)).toEqual({ open: PM, exploded: false, wired: false });
  expect(walk([frame(UTIL)], wired)).toEqual(wired);
  expect(walk([membrane(UTIL)], wired)).toEqual({ open: UTIL, exploded: false, wired: false });
  expect(walk([{ kind: 'escape' }], wired)).toEqual({ exploded: false, wired: false, dismissed: PM });
  expect(walk([frame(PM, 0)], wired)).toEqual(CLOSED);
});

test('a stop names the cell it stands in', () => {
  expect(cellOf(FIELD)).toBeUndefined();
  expect(cellOf({ kind: 'cell', cell: PM })).toBe(PM);
  expect(cellOf({ kind: 'organelle', path: 'libs/core/src/pm/index.ts', cell: PM })).toBe(PM);
});
