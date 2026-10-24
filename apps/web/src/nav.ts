/**
 * nav: the one line between the chrome and the world. The world says what
 * its camera shows, the view's outline on the ground, and the chrome's
 * minimap draws it (D154); the chrome asks the world to look somewhere, and
 * the world moves its camera there. Neither imports the other: `main.ts`
 * hands both the same line, and an ask made before the world is drawn, or
 * with no world at all, as in a DOM test, goes nowhere. Pure, so a test
 * reads it straight.
 */

import type { Point } from 'scene';

/** What the world does when the chrome asks: centre the view on a layout point. */
export type Steering = { readonly lookAt: (point: Point) => void };

export type Nav = {
  /** The view's outline on the ground, in layout units, as the world last showed it; none before it has. */
  readonly outline: () => readonly Point[] | undefined;
  /** The world shows its view; the chrome hears only an outline that moved. */
  readonly show: (outline: readonly Point[] | undefined) => void;
  /** Hear the outline move. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Ask the world to centre the view on a layout point. */
  readonly lookAt: (point: Point) => void;
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
  let steering: Steering | undefined;
  return {
    outline: () => outline,
    show: (next) => {
      if (same(outline, next)) return;
      outline = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    lookAt: (point) => steering?.lookAt(point),
    steer: (next) => {
      steering = next;
      return () => {
        if (steering === next) steering = undefined;
      };
    },
  };
};
