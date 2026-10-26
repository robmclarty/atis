// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { OVERLAY_NAMES, assertMap } from 'core';
import type { MapJson } from 'core';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { Chrome, OverlayToggles } from '../chrome/index.js';
import { createNav } from '../nav.js';
import { shownOverlay, toggled } from '../overlays.js';
import { partsOf } from '../parts.js';
import { createRegistry } from '../registry.js';
import { repoMap } from './repo-map.js';

/**
 * A whole repo's overlays in the world's chrome (D101): the HUD's toggles
 * show one overlay at a time, trouble spots at first as on the still map,
 * pressing the one shown takes it away, a muted one is a disabled toggle
 * titled with the map's reason (C2), and every press goes over the line to
 * the world while the HUD names the overlay shown.
 */
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', '..', 'libs', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));

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

const all = (selector: string): readonly HTMLElement[] => [...host.querySelectorAll<HTMLElement>(selector)];

const button = (selector: string): HTMLButtonElement => {
  const found = host.querySelector(selector);
  if (!(found instanceof HTMLButtonElement)) throw new Error(`${selector} is not a button`);
  return found;
};

test('a repo map shows trouble spots at first, another when asked, and none once the one shown is asked for again; a map of a change shows none', () => {
  const map = repoMap();
  expect(shownOverlay(map, undefined)).toBe('trouble_spots');
  expect(shownOverlay(map, 'cycles')).toBe('cycles');
  expect(shownOverlay(map, 'none')).toBeUndefined();
  expect(toggled(map, undefined, 'trouble_spots')).toBe('none');
  expect(toggled(map, undefined, 'dead_code')).toBe('dead_code');
  expect(toggled(map, 'none', 'trouble_spots')).toBe('trouble_spots');
  expect(shownOverlay(DEMO, 'cycles')).toBeUndefined();
});

test('the toggles name every overlay, press the one shown, and send each press over the line to the world', async () => {
  const map = repoMap();
  const nav = createNav();
  const asked: unknown[] = [];
  nav.steer({ lookAt: vi.fn(), visit: vi.fn(), overlay: (overlay) => asked.push(overlay) });
  await act(async () => root.render(<OverlayToggles map={map} registry={createRegistry()} nav={nav} />));

  expect(all('[data-overlay]').map((toggle) => toggle.getAttribute('data-overlay'))).toEqual([...OVERLAY_NAMES]);
  expect(all('[data-overlay]').map((toggle) => toggle.textContent)).toEqual(['Trouble spots', 'Ugly spots', 'Coverage gaps', 'Dead code', 'Duplication', 'Cycles', 'Recent heat', 'Baselined']);
  expect(button('[data-overlay="trouble_spots"]').getAttribute('aria-pressed')).toBe('true');

  await act(async () => button('[data-overlay="coverage_gaps"]').click());
  expect(nav.overlay()).toBe('coverage_gaps');
  expect(button('[data-overlay="coverage_gaps"]').getAttribute('aria-pressed')).toBe('true');
  expect(button('[data-overlay="trouble_spots"]').getAttribute('aria-pressed')).toBe('false');
  await act(async () => button('[data-overlay="coverage_gaps"]').click());
  expect(host.querySelector('[data-overlays]')?.getAttribute('data-overlays')).toBe('none');
  expect(asked).toEqual(['coverage_gaps', 'none']);
});

test("an overlay the map holds muted is a disabled toggle titled with the map's reason, and the overlay block opens every overlay's count or reason (C2)", async () => {
  const { dead_code: _dead, ...rest } = repoMap().overlays ?? {};
  const map: MapJson = { ...repoMap(), overlays: { ...rest, muted: ['dead_code: .check/ ran no dead slot'] } };
  await act(async () => root.render(<OverlayToggles map={map} registry={createRegistry()} nav={createNav()} />));

  const dead = button('[data-overlay="dead_code"]');
  expect(dead.disabled).toBe(true);
  expect(dead.title).toBe('.check/ ran no dead slot');
  expect(partsOf(map, 'overlay').parts[0]?.lines).toContain('Dead code · muted: .check/ ran no dead slot');
  expect(partsOf(map, 'overlay').parts[0]?.lines).toContain('Duplication · 1 family');
  expect(partsOf(DEMO, 'overlay').empty).toBe('a map of a change holds no overlays');
});

test('in the chrome the HUD names the overlay the toggles show, and a map of a change has no toggles', async () => {
  const nav = createNav();
  await act(async () => root.render(<Chrome state={{ status: 'ready', url: '/map.json', map: repoMap() }} registry={createRegistry()} nav={nav} dev={false} />));
  expect(host.querySelector('[data-block="overlay"]')?.textContent).toBe('Trouble spots 4 files');
  expect(host.querySelector('[role="status"]')?.textContent).toMatch(/^demo, the whole repo at [0-9a-f]{7}$/);

  await act(async () => button('[data-overlay="cycles"]').click());
  expect(host.querySelector('[data-block="overlay"]')?.textContent).toBe('Cycles 1 cycle');

  await act(async () => root.render(<Chrome state={{ status: 'ready', url: '/map.json', map: DEMO }} registry={createRegistry()} nav={createNav()} dev={false} />));
  expect(host.querySelector('[data-overlays]')).toBeNull();
});
