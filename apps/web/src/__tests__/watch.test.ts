import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson } from 'core';
import { expect, test } from 'vitest';

import { createNav } from '../nav.js';
import { framedUrl, pushedMap, sameBuild, sameGround, socketUrl } from '../watch.js';

/** The page's socket (D106, D178): where it listens, what it reads off the socket, and which pushes keep the ground. */
const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO_TEXT = readFileSync(join(HERE, '..', '..', '..', '..', 'libs', 'core', 'fixtures', 'demo', 'map.json'), 'utf8');
const DEMO = assertMap(JSON.parse(DEMO_TEXT));

/** The demo rebuilt at a later commit: the same ground under new weather, one notice fewer. */
const later: MapJson = { ...DEMO, meta: { ...DEMO.meta, head: 'f'.repeat(40), generated_at: '2026-10-27T09:00:00.000Z' }, notices: DEMO.notices.slice(1) };

test("a served page listens at the served /socket with the run's token, watched or not (D178)", () => {
  expect(socketUrl('?token=abc', '127.0.0.1:4173')).toBe('ws://127.0.0.1:4173/socket?token=abc');
  expect(socketUrl('?token=a%2Bb&zoom=2', 'localhost:9')).toBe('ws://localhost:9/socket?token=a%2Bb');
  expect(socketUrl('?zoom=2', '127.0.0.1:4173')).toBeUndefined();
  // A page that names a map of its own is a fixture, served by nobody who could send one.
  expect(socketUrl('?map=/m.json&token=abc', '127.0.0.1:4173')).toBeUndefined();
});

test('the socket carries a map by its kind; any other kind, text that is not JSON, or a map core refuses is dropped', () => {
  expect(pushedMap(`{"kind":"map","map":${DEMO_TEXT.trimEnd()}}`)).toEqual(DEMO);
  expect(pushedMap(`{"kind":"event","map":${DEMO_TEXT.trimEnd()}}`)).toBeUndefined();
  expect(pushedMap('{"kind":"map","map":{"meta":{}}}')).toBeUndefined();
  expect(pushedMap('not json')).toBeUndefined();
  expect(pushedMap('[]')).toBeUndefined();
});

test('a map is the one shown when it is the same build, and lies on the same ground when its layout, cells and files are', () => {
  expect(sameBuild(DEMO, assertMap(JSON.parse(DEMO_TEXT)))).toBe(true);
  expect(sameBuild(DEMO, later)).toBe(false);
  expect(sameGround(DEMO, later)).toBe(true);
  const [first] = DEMO.terrain.organelles;
  if (first === undefined || DEMO.terrain.layout === undefined) throw new Error('the demo lost its terrain');
  const moved = DEMO.terrain.layout.positions[first.id];
  if (moved === undefined) throw new Error('the demo does not place its first file');
  // A file nudged, a file gone, or a cell recut is other ground.
  expect(sameGround(DEMO, { ...later, terrain: { ...later.terrain, layout: { ...DEMO.terrain.layout, positions: { ...DEMO.terrain.layout.positions, [first.id]: { ...moved, x: moved.x + 1 } } } } })).toBe(false);
  expect(sameGround(DEMO, { ...later, terrain: { ...later.terrain, organelles: DEMO.terrain.organelles.slice(1) } })).toBe(false);
  expect(sameGround(DEMO, { ...later, terrain: { ...later.terrain, cells: DEMO.terrain.cells.slice(1) } })).toBe(false);
});

test('a page drawn afresh opens where the reader stood: the zoom, the tilt and the centre in its query, the rest kept', () => {
  expect(framedUrl('http://127.0.0.1:9/?token=abc&backend=webgl', { zoom: 2.345678, tilt: 12.3456, centre: [120.456, 80.004] })).toBe('http://127.0.0.1:9/?token=abc&backend=webgl&zoom=2.3457&tilt=12.35&centre=120.46%2C80');
  expect(framedUrl('http://127.0.0.1:9/?token=abc&zoom=1&centre=1%2C2', { zoom: 3, tilt: 0 })).toBe('http://127.0.0.1:9/?token=abc&zoom=3&tilt=0');
});

test('a push brings the scrubber back to the map\'s own weather and asks the world, which says whether it took the weather in place', () => {
  const nav = createNav();
  expect(nav.swap(later)).toBeUndefined();
  nav.scrub(0);
  let heard = 0;
  nav.subscribe(() => {
    heard += 1;
  });
  const taken: MapJson[] = [];
  nav.steer({ lookAt: () => undefined, visit: () => undefined, swap: (map) => (taken.push(map), map === later ? undefined : { zoom: 2, tilt: 0 }) });
  expect(nav.swap(later)).toBeUndefined();
  expect(nav.frame()).toBeUndefined();
  expect(heard).toBe(1);
  expect(nav.swap(DEMO)).toEqual({ zoom: 2, tilt: 0 });
  expect(taken).toEqual([later, DEMO]);
});
