/**
 * opened: which cell is open as a stained slide, and what opens and closes it
 * (§6, D155). At the cell's level of detail the innermost cell under the
 * view's centre opens, and it stays open while the reviewer pans and zooms
 * inside it: it closes on zooming out past the level, on Esc, on a click on
 * open ground, or once the view has left it altogether, and a click on another
 * cell at that level opens that one instead. A cell closed by hand stays
 * closed while the view's centre is still in it, so it does not spring back
 * open on the next frame. The exploded view is a toggle on the open cell, and
 * gathers when the cell closes. Pure, so a test walks it event by event.
 */

import type { Lod, Pick } from 'scene';

import type { Stop } from './walk.js';

/** The level of detail a cell opens at: §6's LOD2, the cell. */
export const CELL_LOD: Lod = 2;

/** What the chrome hears of the open cell: which, and whether its exploded view is spread. */
export type Opened = { readonly cell: string; readonly exploded: boolean };

/** The open cell, whether its view is exploded, and a cell closed by hand that must not reopen under the view's centre. */
export type OpenState = { readonly open?: string; readonly exploded: boolean; readonly dismissed?: string };

export const CLOSED: OpenState = { exploded: false };

export type OpenEvent =
  /** A frame: the level the camera is at, the cell under the view's centre, and whether a cell still shows in the view. */
  | { readonly kind: 'frame'; readonly lod: Lod; readonly under: string | undefined; readonly shows: (cell: string) => boolean }
  | { readonly kind: 'escape' }
  /** A click on the canvas: what lay under it at the camera's level. */
  | { readonly kind: 'click'; readonly lod: Lod; readonly pick: Pick | undefined }
  | { readonly kind: 'explode' };

/** The cell a stop stands in, if any. */
export const cellOf = (stop: Stop): string | undefined => (stop.kind === 'field' ? undefined : stop.cell);

/** What the chrome hears of a state. */
export const openedOf = (state: OpenState): Opened | undefined => (state.open === undefined ? undefined : { cell: state.open, exploded: state.exploded });

/** Close the open cell by hand: it stays closed while the centre stays in it. */
const dismiss = (state: OpenState): OpenState => ({ exploded: false, ...(state.open === undefined ? {} : { dismissed: state.open }) });

const openCell = (cell: string): OpenState => ({ open: cell, exploded: false });

/** The state after an event. */
export const openedBy = (state: OpenState, event: OpenEvent): OpenState => {
  switch (event.kind) {
    case 'frame': {
      if (event.lod < CELL_LOD) return CLOSED;
      // A dismissed cell is free to reopen once the centre has left it.
      const dismissed = state.dismissed !== undefined && event.under === state.dismissed ? state.dismissed : undefined;
      if (state.open === undefined) {
        if (event.under !== undefined && event.under !== dismissed) return openCell(event.under);
        return { exploded: false, ...(dismissed === undefined ? {} : { dismissed }) };
      }
      if (event.shows(state.open)) return state;
      // The view has left the open cell altogether: whatever lies under the centre now opens, or nothing.
      return event.under === undefined ? CLOSED : openCell(event.under);
    }
    case 'escape':
      return dismiss(state);
    case 'click': {
      if (event.lod < CELL_LOD) return state;
      if (event.pick === undefined) return dismiss(state);
      return event.pick.cell === state.open ? state : openCell(event.pick.cell);
    }
    case 'explode':
      return state.open === undefined ? state : { ...state, exploded: !state.exploded };
    default:
      return state;
  }
};
