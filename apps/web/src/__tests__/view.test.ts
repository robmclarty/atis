import { expect, test } from 'vitest';

import { DEFAULT_SEED, MAX_TILT, viewOf } from '../view.js';

test('a page that asks for nothing opens on the far field, overhead, on WebGPU, with the default seed', () => {
  expect(viewOf('')).toEqual({ backend: 'webgpu', zoom: 1, tilt: 0, seed: DEFAULT_SEED });
  expect(viewOf('?map=/map.json')).toEqual({ backend: 'webgpu', zoom: 1, tilt: 0, seed: DEFAULT_SEED });
});

test('only webgl forces the fallback backend', () => {
  expect(viewOf('?backend=webgl').backend).toBe('webgl');
  expect(viewOf('?backend=webgpu').backend).toBe('webgpu');
  expect(viewOf('?backend=software').backend).toBe('webgpu');
});

test('the zoom is any positive number, else the fit', () => {
  expect(viewOf('?zoom=2.5').zoom).toBe(2.5);
  expect(viewOf('?zoom=0').zoom).toBe(1);
  expect(viewOf('?zoom=-3').zoom).toBe(1);
  expect(viewOf('?zoom=far').zoom).toBe(1);
  expect(viewOf('?zoom=').zoom).toBe(1);
});

test('the tilt is held between overhead and the camera bound', () => {
  expect(viewOf('?tilt=20').tilt).toBe(20);
  expect(viewOf('?tilt=90').tilt).toBe(MAX_TILT);
  expect(viewOf('?tilt=-10').tilt).toBe(0);
  expect(viewOf('?tilt=steep').tilt).toBe(0);
});

test('the seed is a whole number', () => {
  expect(viewOf('?seed=42').seed).toBe(42);
  expect(viewOf('?seed=4.7').seed).toBe(4);
  expect(viewOf('?seed=lucky').seed).toBe(DEFAULT_SEED);
});
