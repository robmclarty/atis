// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson } from 'core';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { CHROME_MUTED, IFR_HUE } from 'scene';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { Chrome, Scrubber } from '../chrome/index.js';
import { captionOf, frameMap, framesOf, lastFrame, stepped } from '../frames.js';
import { createNav } from '../nav.js';
import { createRegistry } from '../registry.js';

/**
 * A range's frames in the app (D100): the map as each frame shows it, the
 * scrubber that steps them in the HUD by click and by `,` and `.`, and the
 * step going over the line to the world, while every block of the chrome
 * reads the frame it stands at.
 */
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', '..', 'libs', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));
const FIRST = 'a'.repeat(40);
const reason = `the commit ${FIRST} is not the checked-out HEAD, so .check/ does not describe it`;

/** The demo map as a range of two commits: the first touched the README alone and read no `.check/`; the second is the map's own weather. */
const { health_delta: _moved, ...unmeasured } = DEMO.weather;
const RANGED: MapJson = assertMap({
  ...DEMO,
  sequence: {
    frames: [
      {
        commit: FIRST,
        subject: 'docs: say what the doctor does',
        weather: { ...unmeasured, changed: DEMO.weather.changed.filter((file) => file.path === 'README.md'), reach: [], wiring: [], evidence: {}, checks: { category: 'NOINST', checks_run: 0, reason, slots: [] }, improvements: [] },
        notices: [],
      },
      { commit: DEMO.meta.head, subject: 'feat(cli): run the doctor', weather: DEMO.weather, notices: DEMO.notices },
    ],
  },
});

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

const element = (selector: string): HTMLElement => {
  const found = host.querySelector(selector);
  if (!(found instanceof HTMLElement)) throw new Error(`nothing matches ${selector}`);
  return found;
};

const click = (selector: string): Promise<void> =>
  act(async () => {
    element(selector).dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

const press = (key: string, target: EventTarget = document.body): Promise<void> =>
  act(async () => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  });

/** A `#rrggbb` colour as the DOM reads it back. */
const rgb = (hex: string): string => `rgb(${[1, 3, 5].map((at) => String(Number.parseInt(hex.slice(at, at + 2), 16))).join(', ')})`;

test("a frame shows the one terrain under its commit's weather and notices, its evidence muted where it read no .check/ (D100, D135)", () => {
  expect(framesOf(DEMO)).toEqual([]);
  expect(lastFrame(DEMO)).toBeUndefined();
  expect(frameMap(DEMO, 0)).toBe(DEMO);
  expect(lastFrame(RANGED)).toBe(1);
  // The last frame is the map's own weather, and so is no frame at all.
  expect(frameMap(RANGED, 1)).toBe(RANGED);
  expect(frameMap(RANGED, undefined)).toBe(RANGED);

  const first = frameMap(RANGED, 0);
  expect(first.terrain).toBe(RANGED.terrain);
  expect(first.weather.changed.map((file) => file.path)).toEqual(['README.md']);
  expect(first.notices).toEqual([]);
  expect(first.meta.head).toBe(FIRST);
  expect(first.meta.instruments).toEqual({ mode: 'git-only', reason, entry_points: 'fallow', structure: RANGED.meta.instruments.structure });
  expect(() => assertMap(first)).not.toThrow();
});

test('`,` steps back a commit and `.` on one, held at the ends, and the caption names the commit', () => {
  expect(stepped(RANGED, undefined, ',')).toBe(0);
  expect(stepped(RANGED, 0, ',')).toBe(0);
  expect(stepped(RANGED, 0, '.')).toBe(1);
  expect(stepped(RANGED, 1, '.')).toBe(1);
  expect(stepped(RANGED, 0, 'ArrowLeft')).toBeUndefined();
  expect(stepped(DEMO, undefined, '.')).toBeUndefined();
  expect(captionOf(RANGED, 0)).toBe('1/2 aaaaaaa docs: say what the doctor does');
});

test('the line carries the frame the scrubber stands at to the world, once per step', () => {
  const nav = createNav();
  const heard = vi.fn();
  nav.subscribe(heard);
  const scrub = vi.fn();
  nav.steer({ lookAt: vi.fn(), visit: vi.fn(), scrub });
  expect(nav.frame()).toBeUndefined();
  nav.scrub(0);
  nav.scrub(0);
  expect(nav.frame()).toBe(0);
  expect(scrub).toHaveBeenCalledTimes(1);
  expect(heard).toHaveBeenCalledTimes(1);
});

test('a map of one change has no scrubber', async () => {
  await act(async () => root.render(<Scrubber map={DEMO} registry={createRegistry()} nav={createNav()} />));
  expect(host.querySelector('[data-scrubber]')).toBeNull();
});

test("the scrubber opens on the map's own frame, a tick per commit in its category's hue, and steps by click, by arrow and by key", async () => {
  const nav = createNav();
  const scrub = vi.fn();
  nav.steer({ lookAt: vi.fn(), visit: vi.fn(), scrub });
  await act(async () => root.render(<Scrubber map={RANGED} registry={createRegistry()} nav={nav} />));
  expect(element('[data-scrubber]').dataset['scrubber']).toBe('1');
  expect(element('[data-frame="1"]').dataset['shown']).toBe('on');
  expect(element('[data-frame="0"]').style.background).toBe(rgb(CHROME_MUTED));
  expect(element('[data-frame="1"]').style.background).toBe(rgb(IFR_HUE));
  expect(element('[data-caption]').textContent).toBe(captionOf(RANGED, 1));
  expect(element('[data-step="on"]')).toHaveProperty('disabled', true);

  await click('[data-step="back"]');
  expect(scrub).toHaveBeenLastCalledWith(0);
  expect(element('[data-frame="0"]').dataset['shown']).toBe('on');
  expect(element('[data-caption]').textContent).toBe('1/2 aaaaaaa docs: say what the doctor does');

  await press('.');
  expect(nav.frame()).toBe(1);
  await click('[data-frame="0"]');
  expect(nav.frame()).toBe(0);

  // A key typed into a field is the field's, and a modified one is the browser's.
  const field = document.createElement('input');
  host.append(field);
  await press('.', field);
  expect(nav.frame()).toBe(0);
  await act(async () => {
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '.', metaKey: true, bubbles: true }));
  });
  expect(nav.frame()).toBe(0);
});

test('every block of the chrome reads the frame the scrubber stands at', async () => {
  const nav = createNav();
  await act(async () => root.render(<Chrome state={{ status: 'ready', url: '/map.json', map: RANGED }} registry={createRegistry()} nav={nav} dev={false} />));
  expect(host.querySelectorAll('[data-notice]').length).toBe(RANGED.notices.length);
  expect(element('[data-block="category"]').textContent).toContain('IFR');

  await act(async () => nav.scrub(0));
  expect(host.querySelectorAll('[data-notice]').length).toBe(0);
  expect(element('[data-block="category"]').textContent).toContain('NOINST');
});
