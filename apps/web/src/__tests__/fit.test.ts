import { expect, test } from 'vitest';

import { RAIL_WIDTH, fitFrame } from '../fit.js';

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
