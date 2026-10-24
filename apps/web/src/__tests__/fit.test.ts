import { expect, test } from 'vitest';

import { RAIL_WIDTH, fitFrame, zoomFor } from '../fit.js';

const LAYOUT = { width: 800, height: 600 };

test('with no chrome the layout fits the canvas exactly, centred', () => {
  expect(fitFrame(LAYOUT, 1600, 1200, { right: 0 })).toEqual({ halfW: 400, halfH: 300, shift: 0 });
  // A wide canvas: the height decides, and the width has room either side.
  expect(fitFrame(LAYOUT, 2400, 1200, { right: 0 })).toEqual({ halfW: 600, halfH: 300, shift: 0 });
  // A tall canvas: the width decides.
  expect(fitFrame(LAYOUT, 800, 1200, { right: 0 })).toEqual({ halfW: 400, halfH: 600, shift: 0 });
});

test('the rail takes the right edge, and the layout centres in what is left (D153)', () => {
  const frame = fitFrame(LAYOUT, 1600 + RAIL_WIDTH, 1200, { right: RAIL_WIDTH });
  // The free area is 1600 wide, so the layout fits it at half a unit per pixel; the view spans the whole canvas.
  expect(frame.halfH).toBe(300);
  expect(frame.halfW).toBe((1600 + RAIL_WIDTH) / 4);
  // The view's centre sits half the rail right of the layout's, in layout units.
  expect(frame.shift).toBe(RAIL_WIDTH / 4);
  // So the layout's left edge lands at the canvas's left edge, and its right edge at the rail.
  const left = frame.shift - frame.halfW;
  const right = frame.shift + frame.halfW;
  expect(left).toBe(-400);
  expect(right - 400).toBeCloseTo(RAIL_WIDTH / 2, 10);
});

test('a canvas narrower than the chrome still frames into what is left', () => {
  const frame = fitFrame(LAYOUT, 100, 100, { right: RAIL_WIDTH });
  expect(Number.isFinite(frame.halfW) && frame.halfW > 0).toBe(true);
  expect(Number.isFinite(frame.shift)).toBe(true);
  expect(fitFrame(LAYOUT, 0, 0, { right: 0 }).halfW).toBe(400);
});

test('a box is framed at the zoom that fills the share of the free screen it fills first (step 39)', () => {
  // The free area is 1600 by 1200 over an 800 by 600 layout: half a unit per pixel at zoom 1.
  const canvas = [1600 + RAIL_WIDTH, 1200] as const;
  // The whole layout at a share of 1 is the fit itself.
  expect(zoomFor(LAYOUT, { x0: 0, y0: 0, x1: 800, y1: 600 }, ...canvas, { right: RAIL_WIDTH }, 1)).toBeCloseTo(1);
  // A 100-unit square over half the screen: the height fills first, half of 600 units at zoom 1 over 100.
  expect(zoomFor(LAYOUT, { x0: 10, y0: 10, x1: 110, y1: 110 }, ...canvas, { right: RAIL_WIDTH }, 0.5)).toBeCloseTo(3);
  // A wide strip fills its width first.
  expect(zoomFor(LAYOUT, { x0: 0, y0: 0, x1: 400, y1: 10 }, ...canvas, { right: RAIL_WIDTH }, 1)).toBeCloseTo(2);
  // A point is a unit across, never a division by nothing.
  expect(Number.isFinite(zoomFor(LAYOUT, { x0: 5, y0: 5, x1: 5, y1: 5 }, ...canvas, { right: RAIL_WIDTH }, 1))).toBe(true);
});
