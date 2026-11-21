/**
 * selection: what the world makes of a click, of Escape and of a selection
 * the chrome set (D207 (click-selects)), and which cell a selection holds open
 * as a slide (D205 (open-on-select)). A click on a file selects the file, a
 * click on a module's ground the module, and a click on open space clears the
 * selection; Escape clears it; and a selection that came over the line is
 * held to the map the world draws, one that map holds neither a file nor a
 * module for being none. Every selection is built from its target by
 * `selectedOf`, never from a pick's own cell: a file floating in an open
 * slide is picked with the slide's cell, which for a single-file module is
 * the package it floats in, and built from that it would read as a second
 * selection of the one file (D209 (selection-line)).
 *
 * A selected module holds its own slide open, the slide of the package it
 * floats in where it is a single file's (D167), and none where that slide
 * would show no files. A selected file opens nothing, and keeps the slide it
 * floats on open while that one is, so a click on a file inside an open slide
 * leaves the slide be. Nothing selected holds nothing open. The zoom and the
 * share of the screen a module fills are no part of it. Pure, so a test walks
 * it event by event.
 */

import type { MapJson } from 'core';
import type { Pick } from 'scene';

import { selectedOf, targetOf } from './nav.js';
import type { Selected } from './nav.js';

export type SelectEvent =
  /** A click on the canvas: the target of what lay under it, a file's path or a module's cell id, or none on open space. */
  | { readonly kind: 'click'; readonly target: string | undefined }
  | { readonly kind: 'escape' }
  /** The selection as the line holds it, set from either side, or none once it is cleared. */
  | { readonly kind: 'select'; readonly selected: Selected | undefined };

/** The target a pick names, as notices and the hover write it: the file's path, or the cell's id; none where nothing was picked. */
export const targetOfPick = (pick: Pick | undefined): string | undefined => (pick === undefined ? undefined : pick.kind === 'organelle' ? pick.path : pick.cell);

/** The selection a target names in a map, the one already held where it names the same thing, so a selection that did not move is the same value. */
const named = (map: MapJson, state: Selected | undefined, target: string | undefined): Selected | undefined => {
  const next = target === undefined ? undefined : selectedOf(map, target);
  return next !== undefined && state !== undefined && next.kind === state.kind && next.cell === state.cell && targetOf(next) === targetOf(state) ? state : next;
};

/** The selection after an event, in the map the world draws. */
export const selectedBy = (map: MapJson, state: Selected | undefined, event: SelectEvent): Selected | undefined => {
  switch (event.kind) {
    case 'click':
      return named(map, state, event.target);
    case 'escape':
      return undefined;
    case 'select':
      return named(map, state, event.selected === undefined ? undefined : targetOf(event.selected));
    default:
      return state;
  }
};

/**
 * The cell a selection holds open as a slide, or none (D205
 * (open-on-select)): `open` is the cell open now, and `slideOf` says the cell
 * whose slide shows a cell's files, or none where that slide shows none.
 */
export const openedFor = (selected: Selected | undefined, open: string | undefined, slideOf: (cell: string) => string | undefined): string | undefined => {
  if (selected === undefined) return undefined;
  const cell = slideOf(selected.cell);
  if (selected.kind === 'cell') return cell;
  return cell !== undefined && cell === open ? open : undefined;
};
