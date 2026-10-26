/**
 * nav: the one line between the chrome and the world. The world says what
 * its camera shows, the view's outline on the ground, which the chrome's
 * minimap draws (D154), the stop the walk stands at, which the HUD's
 * breadcrumb reads (step 39), and the cell it has opened as a slide, with
 * whether its exploded view is spread (step 40) and its wiring drawn (step
 * 41); the chrome asks the world to look somewhere, to fly to a stop, to
 * explode or wire the open cell, or to write what it writes of the target of
 * a notice row the pointer is over (D168), and the world moves its camera or
 * its slide, or writes the target's words. Neither imports the
 * other: `main.ts` hands both the same line, and an ask made before the world
 * is drawn, or with no world at all, as in a DOM test, goes nowhere. Pure, so
 * a test reads it straight.
 */

import type { Point } from 'scene';

import type { Opened } from './opened.js';
import { FIELD } from './walk.js';
import type { Stop } from './walk.js';

/** What the world does when the chrome asks: centre the view on a layout point, fly to a stop, spread or gather the open cell's exploded view, draw or take away its wiring, or write the words of the target the pointer is over in the chrome, or none. */
export type Steering = {
  readonly lookAt: (point: Point) => void;
  readonly visit: (stop: Stop) => void;
  readonly explode?: () => void;
  readonly wire?: () => void;
  readonly hover?: (target: string | undefined) => void;
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
  /** Hear the outline, the stop or the open cell move. */
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
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    lookAt: (point) => steering?.lookAt(point),
    visit: (next) => steering?.visit(next),
    explode: () => steering?.explode?.(),
    wire: () => steering?.wire?.(),
    hover: (target) => steering?.hover?.(target),
    steer: (next) => {
      steering = next;
      return () => {
        if (steering === next) steering = undefined;
      };
    },
  };
};
