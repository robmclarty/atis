import { expect, test } from 'vitest';

import { LEVELS } from '../materials.js';
import { CLOSED, cellOf, gatesOf, openedBy, openedOf } from '../opened.js';
import type { OpenEvent, OpenState } from '../opened.js';
import { LOD_GATES, levelAt, lodPlan } from 'scene';
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
/** The selection holds a cell open, or none. */
const select = (cell: string | undefined): OpenEvent => ({ kind: 'select', cell });

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

test('on the one surface the selection alone says which cell is open: it opens, moves and closes with it, keeps its exploded view and wiring while it stays, and remembers no cell as closed by hand (D205 (open-on-select))', () => {
  expect(walk([select(PM)])).toEqual({ open: PM, exploded: false, wired: false });
  // Read again frame after frame, the same cell stays as it is, exploded and wired.
  const spread = walk([select(PM), { kind: 'explode' }, { kind: 'wire' }]);
  expect(walk([select(PM), select(PM)], spread)).toBe(spread);
  // Another cell selected moves the slide there, gathered and unwired.
  expect(walk([select(UTIL)], spread)).toEqual({ open: UTIL, exploded: false, wired: false });
  // Nothing held open closes it, and leaves no cell dismissed, so selecting it again opens it at once.
  expect(walk([select(undefined)], spread)).toEqual(CLOSED);
  expect(walk([select(undefined), select(PM)], spread)).toEqual({ open: PM, exploded: false, wired: false });
  expect(walk([select(undefined)])).toEqual(CLOSED);
  // A cell an old level closed by hand is no longer held closed once the selection speaks.
  expect(walk([frame(PM), { kind: 'escape' }, select(undefined)])).toEqual(CLOSED);
  expect(walk([frame(PM), { kind: 'escape' }, select(PM)])).toEqual({ open: PM, exploded: false, wired: false });
});

test('a stop names the cell it stands in', () => {
  expect(cellOf(FIELD)).toBeUndefined();
  expect(cellOf({ kind: 'cell', cell: PM })).toBe(PM);
  expect(cellOf({ kind: 'organelle', path: 'libs/core/src/pm/index.ts', cell: PM })).toBe(PM);
});

/** The nearest and the farthest the camera zooms, over the fit, and the scene's own gates between. */
const ZOOMS = [0.5, 1, 1.45, 1.7, 5, 6, 20, 24, 66, 80, 200];

test("the old levels' switch reads the scene's gates for the cell, the file and the diff and leaves the first to its token, so no zoom is the far field unlit now the planet is gone (D240 (far-zoom-lit))", () => {
  // At rest the token's own gates are read, as they are.
  expect(gatesOf(LEVELS)).toBe(LEVELS.gates);
  const old = gatesOf({ ...LEVELS, autoOpen: 1 });
  expect(old).toEqual([LEVELS.gates[0], LOD_GATES[1], LOD_GATES[2], LOD_GATES[3]]);
  expect(old[0]).toEqual({ enter: 0, exit: 0 });
  for (const zoom of ZOOMS) {
    // Read afresh as the opening frame is, and coming out from every level: never the far field, and the surface's layer whole.
    for (const from of [0, 1, 2, 3, 4] as const) expect(levelAt(from, zoom, old), `zoom ${String(zoom)} from level ${String(from)}`).toBeGreaterThanOrEqual(1);
    expect(lodPlan(undefined, zoom, 0, 300, old).opacity[1]).toBe(1);
  }
  // The plate and the sheet come back at the zooms they had.
  expect(levelAt(0, 25, old)).toBe(3);
  expect(levelAt(0, 81, old)).toBe(4);
  // The first gate is still the token's to move: set by hand, it is read with the switch on and off.
  const far = { enter: 1.7, exit: 1.45 };
  expect(gatesOf({ gates: [far, ...LEVELS.gates.slice(1)], autoOpen: 1 })[0]).toEqual(far);
  expect(levelAt(0, 1, gatesOf({ gates: [far, ...LEVELS.gates.slice(1)], autoOpen: 0 }))).toBe(0);
});
