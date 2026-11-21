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

test('the time freezes the scheduler at a number of milliseconds, none or nonsense leaving the clock to run', () => {
  expect(viewOf('?time=0').time).toBe(0);
  expect(viewOf('?time=1500.5').time).toBe(1500.5);
  expect(viewOf('?time=-1')).not.toHaveProperty('time');
  expect(viewOf('?time=now')).not.toHaveProperty('time');
  expect(viewOf('?time=')).not.toHaveProperty('time');
  expect(viewOf('')).not.toHaveProperty('time');
});

test('the centre is a layout point, `x,y`, else the frame opens on the layout\'s middle', () => {
  expect(viewOf('?centre=120,340').centre).toEqual([120, 340]);
  expect(viewOf('?centre=12.5,-4').centre).toEqual([12.5, -4]);
  expect(viewOf('?centre=120').centre).toBeUndefined();
  expect(viewOf('?centre=120,').centre).toBeUndefined();
  expect(viewOf('?centre=here,there').centre).toBeUndefined();
  expect(viewOf('?centre=1,2,3').centre).toBeUndefined();
  expect(viewOf('')).not.toHaveProperty('centre');
});

test('a page that names a zoom or a centre is framed where it says, and one that names neither, or gets the zoom wrong, leaves the opening frame to the world (D222 (terrain-frame))', () => {
  expect(viewOf('')).not.toHaveProperty('framed');
  expect(viewOf('?backend=webgl&tilt=20&seed=3')).not.toHaveProperty('framed');
  expect(viewOf('?zoom=far')).not.toHaveProperty('framed');
  expect(viewOf('?zoom=0')).not.toHaveProperty('framed');
  expect(viewOf('?zoom=1').framed).toBe(true);
  expect(viewOf('?zoom=2.5').framed).toBe(true);
  expect(viewOf('?centre=120,340')).toMatchObject({ zoom: 1, framed: true });
  expect(viewOf('?centre=120')).not.toHaveProperty('framed');
});

test('only ?shapes=demo turns the demo switch on; any other value is ignored (D202)', () => {
  expect(viewOf('?shapes=demo').shapes).toBe('demo');
  expect(viewOf('?zoom=2&shapes=demo&tilt=10')).toMatchObject({ zoom: 2, tilt: 10, shapes: 'demo' });
  expect(viewOf('?shapes=Demo')).not.toHaveProperty('shapes');
  expect(viewOf('?shapes=1')).not.toHaveProperty('shapes');
  expect(viewOf('?shapes=')).not.toHaveProperty('shapes');
  expect(viewOf('?shapes')).not.toHaveProperty('shapes');
  expect(viewOf('')).not.toHaveProperty('shapes');
});

test('the page asks for a still with ?cinema, framed by the scene as the comment frames its own (D175)', () => {
  expect(viewOf('?cinema=1').cinema).toBe(true);
  expect(viewOf('')).not.toHaveProperty('cinema');
});

test('a page may name what it opens with selected, a file by its path or a module by its cell, and names none by leaving it out or empty (D337 (selection-carried))', () => {
  expect(viewOf('?select=libs%2Fcore%2Fsrc%2Fpm%2Ftools.ts').select).toBe('libs/core/src/pm/tools.ts');
  expect(viewOf('?zoom=2&select=folder%3Alibs%2Fcore%2Fsrc%2Fpm').select).toBe('folder:libs/core/src/pm');
  expect(viewOf('?select=')).not.toHaveProperty('select');
  expect(viewOf('')).not.toHaveProperty('select');
  // A selection frames nothing: the camera opens where the rest of the address puts it.
  expect(viewOf('?select=libs%2Fcore%2Fsrc%2Fpm%2Ftools.ts')).not.toHaveProperty('framed');
});
