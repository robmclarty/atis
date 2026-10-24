import { expect, test } from 'vitest';

import { CLOSED, cellOf, openedBy, openedOf } from '../opened.js';
import type { OpenEvent, OpenState } from '../opened.js';
import { FIELD } from '../walk.js';

/**
 * Which cell is open as a slide, event by event (D155): opened under the
 * view's centre at the cell's level, held while the view stays inside it,
 * closed by zooming out, Esc, a click on open ground or leaving it, switched
 * by a click on another cell, and its exploded view toggled.
 */
const PM = 'folder:libs/core/src/pm';
const UTIL = 'directory:libs/core/src/util';

const frame = (under: string | undefined, lod: 0 | 1 | 2 | 3 | 4 = 2, shows: (cell: string) => boolean = () => true): OpenEvent => ({ kind: 'frame', lod, under, shows });
const membrane = (cell: string): OpenEvent => ({ kind: 'click', lod: 2, pick: { kind: 'membrane', cell } });

/** The state after each event in turn. */
const walk = (events: readonly OpenEvent[], from: OpenState = CLOSED): OpenState => events.reduce(openedBy, from);

test("at the cell's level the cell under the view's centre opens, and nothing opens on open ground or at the surface", () => {
  expect(walk([frame(PM)])).toEqual({ open: PM, exploded: false });
  expect(walk([frame(undefined)])).toEqual(CLOSED);
  expect(walk([frame(PM, 1)])).toEqual(CLOSED);
  expect(walk([frame(PM, 3)])).toEqual({ open: PM, exploded: false });
  expect(openedOf(walk([frame(PM)]))).toEqual({ cell: PM, exploded: false });
  expect(openedOf(CLOSED)).toBeUndefined();
});

test('an open cell stays open while the view stays inside it, whatever lies under the centre, and closes once the view has left it or zooms out past it', () => {
  const open = walk([frame(PM)]);
  expect(walk([frame(undefined)], open)).toEqual(open);
  expect(walk([frame(UTIL)], open)).toEqual(open);
  expect(walk([frame(undefined, 2, () => false)], open)).toEqual(CLOSED);
  expect(walk([frame(UTIL, 2, () => false)], open)).toEqual({ open: UTIL, exploded: false });
  expect(walk([frame(PM, 1)], open)).toEqual(CLOSED);
  expect(walk([{ kind: 'explode' }, frame(PM, 1)], open)).toEqual(CLOSED);
});

test('Esc and a click on open ground close the cell, and it does not spring back open until the centre has left it', () => {
  const open = walk([frame(PM)]);
  const escaped = walk([{ kind: 'escape' }], open);
  expect(escaped).toEqual({ exploded: false, dismissed: PM });
  expect(openedOf(escaped)).toBeUndefined();
  expect(walk([frame(PM)], escaped)).toEqual(escaped);
  expect(walk([frame(undefined)], escaped)).toEqual(CLOSED);
  expect(walk([frame(UTIL)], escaped)).toEqual({ open: UTIL, exploded: false });
  expect(walk([frame(undefined), frame(PM)], escaped)).toEqual({ open: PM, exploded: false });
  expect(walk([{ kind: 'click', lod: 2, pick: undefined }], open)).toEqual({ exploded: false, dismissed: PM });
  // A click on the open cell's own ground opens it again at once.
  expect(walk([{ kind: 'escape' }, membrane(PM)], open)).toEqual({ open: PM, exploded: false });
  // Esc with nothing open changes nothing.
  expect(walk([{ kind: 'escape' }])).toEqual(CLOSED);
});

test("a click on another cell, or on one of its files, opens that cell instead; a click on the open cell keeps it, and a click at the surface does nothing", () => {
  const open = walk([frame(PM), { kind: 'explode' }]);
  expect(walk([membrane(UTIL)], open)).toEqual({ open: UTIL, exploded: false });
  expect(walk([{ kind: 'click', lod: 2, pick: { kind: 'organelle', path: 'libs/core/src/util/text.ts', cell: UTIL, x: 0, y: 0, r: 1 } }], open)).toEqual({ open: UTIL, exploded: false });
  expect(walk([membrane(PM)], open)).toEqual(open);
  expect(walk([{ kind: 'click', lod: 1, pick: undefined }], open)).toEqual(open);
});

test('the exploded view toggles on the open cell alone, and gathers when the cell closes or another opens', () => {
  expect(walk([{ kind: 'explode' }])).toEqual(CLOSED);
  const spread = walk([frame(PM), { kind: 'explode' }]);
  expect(spread).toEqual({ open: PM, exploded: true });
  expect(openedOf(spread)).toEqual({ cell: PM, exploded: true });
  expect(walk([{ kind: 'explode' }], spread)).toEqual({ open: PM, exploded: false });
  expect(walk([frame(UTIL)], spread)).toEqual(spread);
  expect(walk([membrane(UTIL)], spread)).toEqual({ open: UTIL, exploded: false });
  expect(walk([{ kind: 'escape' }], spread)).toEqual({ exploded: false, dismissed: PM });
});

test('a stop names the cell it stands in', () => {
  expect(cellOf(FIELD)).toBeUndefined();
  expect(cellOf({ kind: 'cell', cell: PM })).toBe(PM);
  expect(cellOf({ kind: 'organelle', path: 'libs/core/src/pm/index.ts', cell: PM })).toBe(PM);
});
