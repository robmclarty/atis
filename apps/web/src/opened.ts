/**
 * opened: which cell is open as a stained slide, and what opens and closes it
 * (§6, D155, D165). From the surface on, the innermost cell under the view's
 * centre opens once its skin fills the cell gate's share of the free screen,
 * so the whole cell is seen as it opens, and it stays open while the reviewer
 * pans and zooms inside it: it closes on zooming out until it fills less than
 * the share it holds at, on Esc, on a click on open ground, or once the view
 * has left it altogether. A click on one of its files, where it has floated,
 * keeps it open, and a click on another cell that would hold open at this
 * view opens that one instead. A cell that holds no files of its own, a
 * package whose files all sit in the cells it holds, never opens: its slide
 * would be holes and nothing else, so the world never names it under the
 * centre, never says it holds, and reads its ground as open ground. A cell
 * closed by hand stays closed while the
 * view's centre is still in it, so it does not spring back open on the next
 * frame. The exploded view and the wiring overlay (step 41) are toggles on the
 * open cell, and both go when the cell closes or another opens. Pure, so a
 * test walks it event by event; the world measures the shares (`fillOf`).
 */

import type { Lod, Pick } from 'scene';

import type { Stop } from './walk.js';

/** The level of detail a cell may open from: §6's LOD1, the surface; the far field withholds the cells (§5.6). */
export const OPEN_LOD: Lod = 1;

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
  | { readonly kind: 'wire' };

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
    default:
      return state;
  }
};
