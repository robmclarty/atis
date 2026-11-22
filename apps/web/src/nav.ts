/**
 * nav: the one line between the chrome and the world. The world says what
 * its camera shows, the view's outline on the ground, which the chrome's
 * minimap draws (D154), the stop the walk stands at, which the HUD's
 * breadcrumb reads (step 39), and the cell it has opened as a slide, with
 * whether its exploded view is spread (step 40) and its wiring drawn (step
 * 41); the chrome asks the world to look somewhere, to fly to a stop, to
 * explode or wire the open cell, or to write what it writes of the target of
 * a notice row the pointer is over (D168), and the world moves its camera or
 * its slide, or writes the target's words. It carries the frame of a range
 * the scrubber stands at, too (D100): the chrome steps it, and the world
 * cross-fades to that frame's weather, and the overlay of a whole repo's
 * map the HUD's toggles ask for (D101), which the world cross-fades to the
 * same way, and a map a watch pushed (D106), whose weather the world
 * cross-fades in over the ground it shows, or whose new ground it names the
 * framing to draw afresh at, and a target `atis mcp` asked the tab to show,
 * which the world flies to and lights (D178). It holds the selection as
 * well, the one module or file a click on the map or a row in the chrome
 * chose, and what is pointed at, the thing under the pointer on the map or
 * under it in a row (D209 (selection-line)): either side sets them, both hear
 * them, and the line keeps them itself, so the chrome's panels select and
 * point with no world drawn. It holds the file whose plate the inspector
 * asked for, too (D350 (plate-by-ask)): the world reads it each frame and
 * lays the plate, and it goes when the selection moves. Neither imports the
 * other: `main.ts` hands both the same line, and an ask made before the world
 * is drawn, or with no world at all, as in a DOM test, goes nowhere. Pure, so
 * a test reads it straight.
 */

import type { MapJson } from 'core';
import type { Point } from 'scene';

import type { Highlight } from './highlight.js';
import type { Opened } from './opened.js';
import type { OverlayAsk } from './overlays.js';
import { FIELD } from './walk.js';
import type { Stop } from './walk.js';
import type { Framing } from './watch.js';

/** What is selected (D209 (selection-line)): a stop that is not the field, so a module, by its cell, or a file, by its path and the cell that holds it. */
export type Selected = Exclude<Stop, { readonly kind: 'field' }>;

/** Whether a selection also flies the camera to what it selects, or leaves the view where it stands. */
export type Move = 'fly' | 'stay';

/** Which side points: the world, at what lies under the pointer on the map, or the chrome, at what a row under the pointer names. */
export type PointFrom = 'world' | 'chrome';

/** What is pointed at: a target, a file's path or a cell's id as notices and the hover write them, and the side that points at it. */
export type Pointed = { readonly target: string; readonly from: PointFrom };

/** A selection's target: the file's path or the module's cell id, as notices and the hover write them. */
export const targetOf = (selected: Selected): string => (selected.kind === 'cell' ? selected.cell : selected.path);

/** Whether two selections name the same thing, however each was written down. */
const alike = (a: Selected | undefined, b: Selected | undefined): boolean => a === b || (a !== undefined && b !== undefined && a.kind === b.kind && a.cell === b.cell && targetOf(a) === targetOf(b));

/** The selection a target names in a map: the file with that path, else the module with that cell id; none for a target the map's terrain holds neither of, a shore file's among them. */
export const selectedOf = (map: MapJson, target: string): Selected | undefined => {
  const file = map.terrain.organelles.find((each) => each.id === target);
  if (file !== undefined) return { kind: 'organelle', path: file.id, cell: file.cell };
  return map.terrain.cells.some((cell) => cell.id === target) ? { kind: 'cell', cell: target } : undefined;
};

/** What the world does when the chrome asks: centre the view on a layout point, fly to a stop, spread or gather the open cell's exploded view, draw or take away its wiring, or write the words of the target the pointer is over in the chrome, or none. */
export type Steering = {
  readonly lookAt: (point: Point) => void;
  readonly visit: (stop: Stop) => void;
  readonly explode?: () => void;
  readonly wire?: () => void;
  readonly hover?: (target: string | undefined) => void;
  readonly scrub?: (frame: number) => void;
  readonly overlay?: (asked: OverlayAsk) => void;
  /** Take a map a watch pushed: none when its weather now shows over the ground drawn, else the framing to draw its new ground afresh at. */
  readonly swap?: (map: MapJson) => Framing | undefined;
  /** Fly to what an agent named over `atis mcp`, and light it (D178). */
  readonly highlight?: (highlight: Highlight) => void;
  /** Take the selection, or none once it is cleared: ring it and keep its name written, and fly to it when the move is `fly` (D209 (selection-line)). */
  readonly select?: (selected: Selected | undefined, move: Move) => void;
  /** Ring and name what a row in the chrome points at, or nothing once the chrome points at none (D209 (selection-line)). */
  readonly point?: (target: string | undefined) => void;
};

export type Nav = {
  /** The view's outline on the ground, in layout units, as the world last showed it; none before it has. */
  readonly outline: () => readonly Point[] | undefined;
  /** The world shows its view; the chrome hears only an outline that moved. */
  readonly show: (outline: readonly Point[] | undefined) => void;
  /** The stop the walk stands at, the field until the world says otherwise. */
  readonly stop: () => Stop;
  /** The world settles on a stop. */
  readonly settle: (stop: Stop) => void;
  /** The cell the world has opened as a slide, whether its exploded view is spread, and whether its wiring is drawn; none while every cell is closed. */
  readonly opened: () => Opened | undefined;
  /** The world opens a cell, spreads or gathers its view, draws or takes away its wiring, or closes it. */
  readonly open: (opened: Opened | undefined) => void;
  /** The selection, a module or a file; none until something is selected and once it is cleared. The same value until it moves, so React reads it as a snapshot. */
  readonly selected: () => Selected | undefined;
  /**
   * Select a module or a file, or clear the selection with none, from either
   * side (D209 (selection-line)). A selection that moved is kept and heard,
   * and the world is asked to take it; one that did not move is heard by
   * nobody, and the world is asked again only to fly to it.
   */
  readonly select: (next: Selected | undefined, move: Move) => void;
  /** What is pointed at, and from which side; none while nothing is. The same value until it moves. */
  readonly pointed: () => Pointed | undefined;
  /**
   * Point at a target from one side, or let go of it with none (D209
   * (selection-line)). Either side's pointing takes the other's place, and a
   * side lets go only of what it pointed at itself. A pointing that moved is
   * heard, and the world is asked to ring what the chrome now points at, or
   * nothing; its own pointing it is never asked back.
   */
  readonly point: (target: string | undefined, from: PointFrom) => void;
  /** The file whose plate the chrome asked the world to lay, by its path (D350 (plate-by-ask)); none while none is asked for. */
  readonly plated: () => string | undefined;
  /** Ask for a file's plate, or put it away with none. The plate is the selection's: it is put away whenever the selection moves. */
  readonly plate: (path: string | undefined) => void;
  /** Hear the outline, the stop, the open cell, the selection, the pointing or the plate asked for move. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Ask the world to centre the view on a layout point. */
  readonly lookAt: (point: Point) => void;
  /** Ask the world to fly to a stop. */
  readonly visit: (stop: Stop) => void;
  /** Ask the world to spread the open cell's exploded view, or gather it. */
  readonly explode: () => void;
  /** Ask the world to draw the open cell's wiring, or take it away. */
  readonly wire: () => void;
  /** Ask the world to write what it writes of a target the pointer is over in the chrome, or of none once it leaves (D168). */
  readonly hover: (target: string | undefined) => void;
  /** The frame of a range the scrubber stands at; none until it has stepped, when the map's own weather shows (D100). */
  readonly frame: () => number | undefined;
  /** Step the scrubber to a frame: the chrome hears it, and the world cross-fades to its weather. */
  readonly scrub: (frame: number) => void;
  /** The overlay the HUD's toggles asked for; nothing until one is pressed, when the map's default shows (D101). */
  readonly overlay: () => OverlayAsk;
  /** Ask for an overlay, or none: the chrome hears it, and the world cross-fades to it. */
  readonly showOverlay: (asked: OverlayAsk) => void;
  /**
   * Hand the world a map a watch pushed (D106): the scrubber stands at its
   * own weather again, and the world says none when it cross-faded the
   * weather in over the ground it draws, else the framing to draw the new
   * ground afresh at; none too with no world drawn.
   */
  readonly swap: (map: MapJson) => Framing | undefined;
  /** Ask the world to fly to what an agent named over `atis mcp`, and light it (D178). */
  readonly highlight: (highlight: Highlight) => void;
  /** The world takes the chrome's asks; the latest to steer is the one asked, until it lets go. */
  readonly steer: (steering: Steering) => () => void;
};

/** How far apart two outlines' points must lie, in layout units, before the chrome hears of it. */
const STILL = 1e-3;

const same = (a: readonly Point[] | undefined, b: readonly Point[] | undefined): boolean =>
  a === b || (a !== undefined && b !== undefined && a.length === b.length && a.every(([x, y], index) => Math.abs(x - (b[index]?.[0] ?? Number.NaN)) < STILL && Math.abs(y - (b[index]?.[1] ?? Number.NaN)) < STILL));

export const createNav = (): Nav => {
  const listeners = new Set<() => void>();
  let outline: readonly Point[] | undefined;
  let stop: Stop = FIELD;
  let opened: Opened | undefined;
  let steering: Steering | undefined;
  let frame: number | undefined;
  let overlay: OverlayAsk;
  let selected: Selected | undefined;
  let pointed: Pointed | undefined;
  let plated: string | undefined;
  /** What the chrome points at, which is all of the pointing the world is asked to draw. */
  const fromChrome = (): string | undefined => (pointed?.from === 'chrome' ? pointed.target : undefined);
  const tell = (): void => listeners.forEach((listener) => listener());
  return {
    outline: () => outline,
    show: (next) => {
      if (same(outline, next)) return;
      outline = next;
      tell();
    },
    stop: () => stop,
    settle: (next) => {
      if (JSON.stringify(next) === JSON.stringify(stop)) return;
      stop = next;
      tell();
    },
    opened: () => opened,
    open: (next) => {
      if (JSON.stringify(next) === JSON.stringify(opened)) return;
      opened = next;
      tell();
    },
    selected: () => selected,
    select: (next, move) => {
      const moved = !alike(next, selected);
      if (moved) {
        selected = next;
        // A plate was asked for of the selection that was (D350 (plate-by-ask)).
        plated = undefined;
        tell();
      }
      if (moved || (move === 'fly' && next !== undefined)) steering?.select?.(next, move);
    },
    plated: () => plated,
    plate: (path) => {
      if (path === plated) return;
      plated = path;
      tell();
    },
    pointed: () => pointed,
    point: (target, from) => {
      // A side lets go only of what it pointed at, and pointing again at what it points at moves nothing.
      if (target === undefined ? pointed?.from !== from : pointed?.target === target && pointed.from === from) return;
      const was = fromChrome();
      pointed = target === undefined ? undefined : { target, from };
      tell();
      const now = fromChrome();
      if (now !== was) steering?.point?.(now);
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    lookAt: (point) => steering?.lookAt(point),
    visit: (next) => steering?.visit(next),
    explode: () => steering?.explode?.(),
    wire: () => steering?.wire?.(),
    hover: (target) => steering?.hover?.(target),
    frame: () => frame,
    scrub: (next) => {
      if (next === frame) return;
      frame = next;
      tell();
      steering?.scrub?.(next);
    },
    overlay: () => overlay,
    showOverlay: (next) => {
      if (next === overlay) return;
      overlay = next;
      tell();
      steering?.overlay?.(next);
    },
    swap: (map) => {
      if (frame !== undefined) {
        frame = undefined;
        tell();
      }
      return steering?.swap?.(map);
    },
    highlight: (highlight) => steering?.highlight?.(highlight),
    steer: (next) => {
      steering = next;
      return () => {
        if (steering === next) steering = undefined;
      };
    },
  };
};
