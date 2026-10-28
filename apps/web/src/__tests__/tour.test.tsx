// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson } from 'core';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { Chrome } from '../chrome/index.js';
import { litIn } from '../highlight.js';
import type { Highlight } from '../highlight.js';
import { createNav } from '../nav.js';
import { createRegistry } from '../registry.js';
import { loadTour, playable, readTour, stopHighlight, tourFits, tourUrl } from '../tour.js';
import type { Tour } from '../tour.js';
import { destinationOf } from '../walk.js';

/**
 * A tour served beside the map (D112, D183): the page asks for it only when
 * the URL says one is served, reads it only as a tour, plays it only over
 * the map it was written for, and lights each stop as a highlight lights its
 * target (D178). The stepper under the breadcrumb opens on the count of
 * stops, and its arrows step through them in order, each step asking the
 * world to fly there and writing the stop's notice, target and sentence.
 */
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO: MapJson = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', '..', 'libs', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));
// The tour `apps/tour` writes for the demo on fascicle's stub engine, its golden.
const TOUR_TEXT = readFileSync(join(HERE, '..', '..', '..', 'tour', 'fixtures', 'demo', 'tour.json'), 'utf8');
const TOUR = readTour(JSON.parse(TOUR_TEXT));

const tourOf = (): Tour => {
  if (TOUR === undefined) throw new Error("the tour's golden is no tour");
  return TOUR;
};

/** A fetch that answers `body`, with a 200 or a 404. */
const answer = (ok: boolean, body: unknown) => (): Promise<{ readonly ok: boolean; readonly status: number; readonly json: () => Promise<unknown> }> => Promise.resolve({ ok, status: ok ? 200 : 404, json: () => Promise.resolve(body) });

let host: HTMLElement;
let root: Root;
beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const click = (selector: string): Promise<void> =>
  act(async () => {
    host.querySelector(selector)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

test('the page asks for a tour only when the CLI served one, with the run\'s token, never for a map the page names itself', () => {
  expect(tourUrl('?token=ab12&tour')).toBe('/tour.json?token=ab12');
  expect(tourUrl('?token=a%26b&tour=')).toBe('/tour.json?token=a%26b');
  expect(tourUrl('?token=ab12')).toBeUndefined();
  expect(tourUrl('?tour')).toBeUndefined();
  expect(tourUrl('?map=/fixtures/map.json&token=ab12&tour')).toBeUndefined();
});

test('a tour reads as its base, its head and its stops, and anything else, or one that does not arrive, is none', async () => {
  expect(TOUR).toEqual({ base: 'main', head: DEMO.meta.head, stops: expect.any(Array) });
  expect(tourOf().stops).toHaveLength(6);
  expect(readTour({ base: 'main', head: 'x', stops: [{ target: 'a.ts', sentence: 'A.', notice: 1 }, { target: 'b.ts', notice: 2 }] })).toBeUndefined();
  expect(readTour({ base: 'main', stops: [] })).toBeUndefined();
  expect(readTour([])).toBeUndefined();
  expect(await loadTour('/tour.json', answer(true, JSON.parse(TOUR_TEXT)))).toEqual(TOUR);
  expect(await loadTour('/tour.json', answer(false, {}))).toBeUndefined();
  expect(await loadTour('/tour.json', () => Promise.reject(new Error('offline')))).toBeUndefined();
});

test("a stop lights its target, a file or a cell the map places, or where its notice's row leads, and flares its notice", () => {
  const tools = DEMO.terrain.organelles.find((organelle) => organelle.id === 'libs/core/src/pm/tools.ts');
  if (tools === undefined) throw new Error('the demo lost pm/tools.ts');
  expect(litIn(DEMO, { kind: 'stop', target: tools.id, rank: 6 })).toEqual({ destination: { kind: 'stop', stop: { kind: 'organelle', path: tools.id, cell: tools.cell } }, target: tools.id, flare: 5 });
  expect(litIn(DEMO, { kind: 'stop', target: 'folder:libs/core/src/pm', rank: 1 })).toEqual({ destination: { kind: 'stop', stop: { kind: 'cell', cell: 'folder:libs/core/src/pm' } }, target: 'folder:libs/core/src/pm', flare: 0 });
  // A notice on the shore: its stop leads where the notice's row does, to its group's block.
  const [first, ...rest] = DEMO.notices;
  if (first === undefined) throw new Error('the demo ranks no notice');
  const shore: MapJson = { ...DEMO, notices: [{ ...first, target: 'README.md' }, ...rest] };
  expect(litIn(shore, { kind: 'stop', target: 'README.md', rank: 1 })).toEqual({ destination: destinationOf(shore, 1), target: 'README.md', flare: 0 });
  // A shore file that is not its notice's own target, or a notice past the last, gives the world nowhere to fly.
  expect(litIn(shore, { kind: 'stop', target: 'README.md', rank: 2 })).toBeUndefined();
  expect(litIn(DEMO, { kind: 'stop', target: tools.id, rank: 7 })).toBeUndefined();
  expect(stopHighlight({ target: tools.id, sentence: 'Look.', notice: 6 })).toEqual({ kind: 'stop', target: tools.id, rank: 6 });
});

test('a tour plays over the map it was written for, every stop the map gives somewhere to fly, and over another map plays nothing (D183)', () => {
  const tour = tourOf();
  expect(tourFits(DEMO, tour)).toBe(true);
  expect(playable(DEMO, tour)).toEqual(tour.stops);
  expect(playable({ ...DEMO, meta: { ...DEMO.meta, base: 'develop' } }, tour)).toEqual([]);
  expect(playable({ ...DEMO, meta: { ...DEMO.meta, head: 'f'.repeat(40) } }, tour)).toEqual([]);
  const stray = { ...tour, stops: [...tour.stops, { target: 'nowhere.ts', sentence: 'Nowhere.', notice: 1 }] };
  expect(playable(DEMO, stray)).toEqual(tour.stops);
});

test('the stepper opens on the count of stops, and each arrow flies the world to the next stop and writes its notice, its target and its sentence', async () => {
  const nav = createNav();
  const asked: Highlight[] = [];
  nav.steer({ lookAt: vi.fn(), visit: vi.fn(), highlight: (highlight) => asked.push(highlight) });
  const tour = tourOf();
  await act(async () => root.render(<Chrome state={{ status: 'ready', url: '/map.json', map: DEMO }} registry={createRegistry()} nav={nav} dev={false} tour={tour} />));
  expect(host.querySelector('[data-tour]')?.getAttribute('data-tour')).toBe('start');
  expect(host.querySelector('[data-tour-place]')?.textContent).toBe('tour · 6 stops');
  expect(host.querySelector('[data-tour-sentence]')).toBeNull();
  expect(host.querySelector<HTMLButtonElement>('[data-tour-step="back"]')?.disabled).toBe(true);
  expect(asked).toEqual([]);

  await click('[data-tour-step="on"]');
  const [first, second, , , fifth, last] = tour.stops;
  expect(host.querySelector('[data-tour]')?.getAttribute('data-tour')).toBe('1');
  expect(host.querySelector('[data-tour-place]')?.textContent).toBe('tour · 1 of 6');
  expect(host.querySelector('[data-tour-notice]')?.textContent).toBe(`notice ${String(first?.notice)} · ${first?.target ?? ''}`);
  expect(host.querySelector('[data-tour-sentence]')?.textContent).toBe(first?.sentence);
  await click('[data-tour-step="on"]');
  expect(host.querySelector('[data-tour-sentence]')?.textContent).toBe(second?.sentence);
  await click('[data-tour-step="back"]');
  expect(host.querySelector('[data-tour]')?.getAttribute('data-tour')).toBe('1');
  for (let step = 0; step < 5; step += 1) await click('[data-tour-step="on"]');
  expect(host.querySelector('[data-tour]')?.getAttribute('data-tour')).toBe('6');
  expect(host.querySelector('[data-tour-stop]')?.getAttribute('data-tour-stop')).toBe(last?.target);
  expect(host.querySelector<HTMLButtonElement>('[data-tour-step="on"]')?.disabled).toBe(true);
  // Each step asked the world for its stop, in the order taken.
  expect(asked.map((highlight) => (highlight.kind === 'stop' ? highlight.rank : 0))).toEqual([first, second, first, second, tour.stops[2], tour.stops[3], fifth, last].map((stop) => stop?.notice ?? 0));
  expect(host.innerHTML).not.toMatch(/gradient|shadow|blur/);
});

test('a tour written for another map plays nothing and says so, and a map served with no tour shows nothing of one', async () => {
  const nav = createNav();
  const highlight = vi.fn();
  nav.steer({ lookAt: vi.fn(), visit: vi.fn(), highlight });
  const elsewhere = { ...tourOf(), head: 'b'.repeat(40) };
  await act(async () => root.render(<Chrome state={{ status: 'ready', url: '/map.json', map: DEMO }} registry={createRegistry()} nav={nav} dev={false} tour={elsewhere} />));
  expect(host.querySelector('[data-tour]')?.getAttribute('data-tour')).toBe('none');
  expect(host.querySelector('[data-tour]')?.textContent).toBe('tour · written for main..bbbbbbb, not this map');
  expect(host.querySelector('[data-tour-step]')).toBeNull();
  const unplaced = { ...tourOf(), stops: [{ target: 'nowhere.ts', sentence: 'Nowhere.', notice: 1 }] };
  await act(async () => root.render(<Chrome state={{ status: 'ready', url: '/map.json', map: DEMO }} registry={createRegistry()} nav={nav} dev={false} tour={unplaced} />));
  expect(host.querySelector('[data-tour]')?.textContent).toBe('tour · no stop of it lands on this map');
  await act(async () => root.render(<Chrome state={{ status: 'ready', url: '/map.json', map: DEMO }} registry={createRegistry()} nav={nav} dev={false} />));
  expect(host.querySelector('[data-tour]')).toBeNull();
  expect(highlight).not.toHaveBeenCalled();
});
