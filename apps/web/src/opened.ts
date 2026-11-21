/**
 * opened: which cell is open as a stained slide, and what opens and closes it
 * (§6, D155, D165). From the surface on, the innermost cell under the view's
 * centre opens once its skin fills the cell gate's share of the free screen,
 * so the whole cell is seen as it opens, and it stays open while the reviewer
 * pans and zooms inside it: it closes on zooming out until it fills less than
 * the share it holds at, on Esc, on a click on open ground, or once the view
 * has left it altogether. A click on one of its files, where it has floated,
 * keeps it open, and a click on another cell that would hold open at this
 * view opens that one instead. A single-file module a package holds opens as
 * that package, whose slide floats its file beside the package's own (D167).
 * A cell whose slide shows no files, a package whose files all sit in the
 * folders it holds, never opens: its slide would be holes and nothing else,
 * so the world never names it under the centre, never says it holds, and
 * reads its ground as open ground. A cell
 * closed by hand stays closed while the
 * view's centre is still in it, so it does not spring back open on the next
 * frame. The exploded view and the wiring overlay (step 41) are toggles on the
 * open cell, and both go when the cell closes or another opens.
 *
 * On the one surface none of that opens a cell (D204 (parked-levels)): there
 * the selection does (D205 (open-on-select)). The world reads the cell the
 * selection holds open (`selection.ts`) and hands it in as a `select` event,
 * frame after frame, so the open cell is whatever the selection says and
 * nothing else: no share of the screen opens or closes it, at any zoom, and
 * none is remembered as closed by hand. The exploded view and the wiring stay
 * while the same cell stays.
 *
 * Pure, so a test walks it event by event; the world measures the shares
 * (`fillOf`).
 */

import { LOD_GATES } from 'scene';
import type { Lod, LodGate, Pick } from 'scene';

import type { Stop } from './walk.js';

/** The level of detail a cell may open from: §6's LOD1, the surface; the far field withholds the cells (§5.6). */
export const OPEN_LOD: Lod = 1;

/**
 * The gates the levels of detail are read through. At rest they are the
 * token's own, parked (D204 (parked-levels)). With the old levels' switch on
 * the scene's stand in for the cell's, the file's and the diff's, and the
 * first stays the token's (D240 (far-zoom-lit)): the planet that stood over
 * the far field is gone (D213 (planet-goes)), and read through the scene's
 * first gate the far zoom would be the map unlit with nothing over it. So the
 * switch brings back the slide, the plate and the sheet, and never the dark.
 */
export const gatesOf = (levels: { readonly gates: readonly LodGate[]; readonly autoOpen: number }): readonly LodGate[] => (levels.autoOpen > 0 ? [...levels.gates.slice(0, 1), ...LOD_GATES.slice(1)] : levels.gates);

/** What the chrome hears of the open cell: which, whether its exploded view is spread, and whether its wiring is drawn. */
export type Opened = { readonly cell: string; readonly exploded: boolean; readonly wired: boolean };

/** The open cell, whether its view is exploded and its wiring drawn, and a cell closed by hand that must not reopen under the view's centre. */
export type OpenState = { readonly open?: string; readonly exploded: boolean; readonly wired: boolean; readonly dismissed?: string };

export const CLOSED: OpenState = { exploded: false, wired: false };

export type OpenEvent =
  /** A frame: the level the camera is at, the cell to open under the view's centre, the innermost there once its skin fills the gate's share, and whether a cell holds open at this view, still in it and filling at least the share it holds at. */
  | { readonly kind: 'frame'; readonly lod: Lod; readonly under: string | undefined; readonly holds: (cell: string) => boolean }
  | { readonly kind: 'escape' }
  /** A click on the canvas: what lay under it at the camera's level, a file of the open cell where it has floated, and whether a cell would hold open at this view. */
  | { readonly kind: 'click'; readonly lod: Lod; readonly pick: Pick | undefined; readonly holds: (cell: string) => boolean }
  | { readonly kind: 'explode' }
  | { readonly kind: 'wire' }
  /** The cell the selection holds open as a slide, or none (D205 (open-on-select)): it opens, moves there or closes, whatever the view. */
  | { readonly kind: 'select'; readonly cell: string | undefined };

/** The cell a stop stands in, if any. */
export const cellOf = (stop: Stop): string | undefined => (stop.kind === 'field' ? undefined : stop.cell);

/** What the chrome hears of a state. */
export const openedOf = (state: OpenState): Opened | undefined => (state.open === undefined ? undefined : { cell: state.open, exploded: state.exploded, wired: state.wired });

/** Close the open cell by hand: it stays closed while the centre stays in it. */
const dismiss = (state: OpenState): OpenState => ({ ...CLOSED, ...(state.open === undefined ? {} : { dismissed: state.open }) });

const openCell = (cell: string): OpenState => ({ ...CLOSED, open: cell });

/** The state after an event. */
export const openedBy = (state: OpenState, event: OpenEvent): OpenState => {
  switch (event.kind) {
    case 'frame': {
      if (event.lod < OPEN_LOD) return CLOSED;
      // A dismissed cell is free to reopen once the centre has left it.
      const dismissed = state.dismissed !== undefined && event.under === state.dismissed ? state.dismissed : undefined;
      if (state.open === undefined) {
        if (event.under !== undefined && event.under !== dismissed) return openCell(event.under);
        return { ...CLOSED, ...(dismissed === undefined ? {} : { dismissed }) };
      }
      if (event.holds(state.open)) return state;
      // Zoomed out past the open cell, or the view has left it: whatever opens under the centre now opens, or nothing.
      return event.under === undefined ? CLOSED : openCell(event.under);
    }
    case 'escape':
      return dismiss(state);
    case 'click': {
      if (event.lod < OPEN_LOD) return state;
      if (event.pick === undefined) return dismiss(state);
      if (event.pick.cell === state.open) return state;
      // Another cell opens on a click only where it would hold open, so a cell too small to read as a slide leaves the open one be.
      return event.holds(event.pick.cell) ? openCell(event.pick.cell) : state;
    }
    case 'explode':
      return state.open === undefined ? state : { ...state, exploded: !state.exploded };
    case 'wire':
      return state.open === undefined ? state : { ...state, wired: !state.wired };
    case 'select':
      if (event.cell === undefined) return CLOSED;
      return event.cell === state.open ? state : openCell(event.cell);
    default:
      return state;
  }
};
