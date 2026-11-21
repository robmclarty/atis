// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson, Notice } from 'core';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { CHROME_INK } from 'scene';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { Chrome, Crumbs } from '../chrome/index.js';
import { createNav, selectedOf } from '../nav.js';
import { createRegistry } from '../registry.js';
import { FIELD } from '../walk.js';
import type { Stop } from '../walk.js';

/**
 * The HUD's breadcrumb and the notices' rows as the ways the chrome walks the
 * map (§6, step 39): the breadcrumb reads the world's stop over the line at
 * every stop, and a row's click asks the world to fly to its target, or
 * brings a shore target's block into view in the rail.
 */
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', '..', 'libs', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));
const INDEX: Stop = { kind: 'organelle', path: 'libs/core/src/pm/index.ts', cell: 'folder:libs/core/src/pm' };

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

/** A `#rrggbb` colour as the DOM reads it back. */
const rgb = (hex: string): string => `rgb(${[1, 3, 5].map((at) => String(Number.parseInt(hex.slice(at, at + 2), 16))).join(', ')})`;

const notice = (target: string): Notice => ({ tier: 'primary', kind: 'k', target, why: 'w', inputs: {}, thresholds: {}, weight: 1 });

test('the line carries the stop the world settles on, and each visit asked of it, to whichever world steers', () => {
  const nav = createNav();
  const heard = vi.fn();
  nav.subscribe(heard);
  expect(nav.stop()).toEqual(FIELD);
  nav.settle(FIELD);
  expect(heard).not.toHaveBeenCalled();
  nav.settle(INDEX);
  expect(nav.stop()).toEqual(INDEX);
  expect(heard).toHaveBeenCalledTimes(1);
  // Nothing steers yet, so the ask goes nowhere; once a world steers, it hears it.
  nav.visit(FIELD);
  const visit = vi.fn();
  nav.steer({ lookAt: vi.fn(), visit });
  nav.visit(INDEX);
  expect(visit).toHaveBeenCalledWith(INDEX);
});

test('the breadcrumb reads the stop down from the field, the stop it stands at in ink, at every stop', async () => {
  const nav = createNav();
  await act(async () => root.render(<Crumbs map={DEMO} registry={createRegistry()} nav={nav} />));
  expect(element('[data-crumbs]').textContent).toBe('field');
  expect(element('[data-crumbs]').dataset['crumbs']).toBe('field');
  act(() => nav.settle({ kind: 'cell', cell: 'folder:libs/core/src/pm' }));
  expect(element('[data-crumbs]').textContent).toBe('field › libs/core › src/pm');
  act(() => nav.settle(INDEX));
  expect(element('[data-crumbs]').textContent).toBe('field › libs/core › src/pm › index.ts');
  expect(element('[data-crumbs]').dataset['crumbs']).toBe('organelle');
  // The stop itself is in the ink; the way down to it takes the line's muted grey.
  expect(element('[data-crumb="3"]').style.color).toBe(rgb(CHROME_INK));
  expect(element('[data-crumb="0"]').style.color).toBe('');
});

test("while something is selected the breadcrumb reads the selection in the stop's place, the walk's stop again once it is cleared, and a selection the map shown does not hold as none (D207 (click-selects))", async () => {
  const nav = createNav();
  await act(async () => root.render(<Crumbs map={DEMO} registry={createRegistry()} nav={nav} />));
  expect(element('[data-crumbs]').dataset['crumbsOf']).toBe('walk');
  // A click moves no camera, so the stop stays the field and the line reads what was selected.
  act(() => nav.select(selectedOf(DEMO, 'folder:libs/core/src/pm'), 'stay'));
  expect(nav.stop()).toEqual(FIELD);
  expect(element('[data-crumbs]').textContent).toBe('field › libs/core › src/pm');
  expect(element('[data-crumbs]').dataset['crumbs']).toBe('cell');
  expect(element('[data-crumbs]').dataset['crumbsOf']).toBe('selection');
  // A file, the added one marked as the walk marks it; the selection is read over a stop the walk has since settled on.
  act(() => nav.select(selectedOf(DEMO, 'libs/core/src/pm/tools.ts'), 'stay'));
  act(() => nav.settle({ kind: 'cell', cell: 'package:apps/cli' }));
  expect(element('[data-crumbs]').textContent).toBe('field › libs/core › src/pm › +tools.ts');
  expect(element('[data-crumbs]').dataset['crumbs']).toBe('organelle');
  expect(element('[data-crumb="3"]').style.color).toBe(rgb(CHROME_INK));
  // A file selected inside a package's slide is the same file wherever it was picked: the line reads it by its target.
  act(() => nav.select({ kind: 'organelle', path: 'apps/cli/src/doctor.ts', cell: 'package:apps/cli' }, 'stay'));
  expect(element('[data-crumbs]').textContent).toBe('field › apps/cli › src/doctor.ts › doctor.ts');
  // Cleared, the walk's stop shows again.
  act(() => nav.select(undefined, 'stay'));
  expect(element('[data-crumbs]').textContent).toBe('field › apps/cli');
  expect(element('[data-crumbs]').dataset['crumbsOf']).toBe('walk');
  // A selection the map shown holds neither a file nor a module for reads as none.
  act(() => nav.select({ kind: 'cell', cell: 'folder:gone' }, 'stay'));
  expect(element('[data-crumbs]').textContent).toBe('field › apps/cli');
  expect(element('[data-crumbs]').dataset['crumbsOf']).toBe('walk');
});

test("the HUD's reach opens on the selected module, on the cell the world has open while a file or nothing is selected, and on the whole reach with neither (D232 (reach-by-module))", async () => {
  const nav = createNav();
  await act(async () => root.render(<Chrome state={{ status: 'ready', url: '/map.json', map: DEMO }} registry={createRegistry()} nav={nav} dev={false} />));
  await click('[data-block="reach"]');
  const headings = (): readonly (string | null)[] => [...host.querySelectorAll('[data-parts="reach"] [data-part] h4')].map((heading) => heading.textContent);
  const whole = headings();
  const pm = ['listSlots · 1 file', 'resolveSlot · 2 files', 'resolveTool · 1 file'];
  expect(whole).not.toEqual(pm);
  // A selected module is what the reach opens on, with no slide open: one the token keeps shut, or one whose slide shows no files.
  await act(async () => nav.select(selectedOf(DEMO, 'folder:libs/core/src/pm'), 'stay'));
  expect(headings()).toEqual(pm);
  // A selected file names no module, so the reach falls back to the open cell: the slide the file floats on.
  await act(async () => nav.open({ cell: 'folder:libs/core/src/pm', exploded: false, wired: false }));
  await act(async () => nav.select(selectedOf(DEMO, 'libs/core/src/pm/tools.ts'), 'stay'));
  expect(headings()).toEqual(pm);
  // The file selected on the map, where no slide is open, leaves the reach whole; so does nothing selected.
  await act(async () => nav.open(undefined));
  expect(headings()).toEqual(whole);
  await act(async () => nav.select(undefined, 'stay'));
  expect(headings()).toEqual(whole);
  // The selected module is read before the open cell where they differ.
  await act(async () => nav.open({ cell: 'folder:libs/core/src/pm', exploded: false, wired: false }));
  await act(async () => nav.select(selectedOf(DEMO, 'package:apps/cli'), 'stay'));
  expect(headings()).not.toEqual(pm);
});

test('while a cell is open the breadcrumb ends in a button that asks the world to explode its view, or gather it (step 40)', async () => {
  const nav = createNav();
  const explode = vi.fn();
  nav.steer({ lookAt: vi.fn(), visit: vi.fn(), explode });
  const heard = vi.fn();
  nav.subscribe(heard);
  await act(async () => root.render(<Crumbs map={DEMO} registry={createRegistry()} nav={nav} />));
  expect(host.querySelector('[data-explode]')).toBeNull();
  act(() => nav.open({ cell: 'folder:libs/core/src/pm', exploded: false, wired: false }));
  expect(nav.opened()).toEqual({ cell: 'folder:libs/core/src/pm', exploded: false, wired: false });
  expect(heard).toHaveBeenCalledTimes(1);
  expect(element('[data-explode]').textContent).toBe('explode');
  await click('[data-explode]');
  expect(explode).toHaveBeenCalledTimes(1);
  // The world answers by spreading the view; the same state said again is not news.
  act(() => nav.open({ cell: 'folder:libs/core/src/pm', exploded: true, wired: false }));
  act(() => nav.open({ cell: 'folder:libs/core/src/pm', exploded: true, wired: false }));
  expect(heard).toHaveBeenCalledTimes(2);
  expect(element('[data-explode]').dataset['explode']).toBe('on');
  expect(element('[data-explode]').textContent).toBe('gather');
  act(() => nav.open(undefined));
  expect(host.querySelector('[data-explode]')).toBeNull();
  // A world that does not steer the explode takes the ask and does nothing.
  nav.steer({ lookAt: vi.fn(), visit: vi.fn() });
  nav.explode();
  expect(explode).toHaveBeenCalledTimes(1);
});

test("where the change's wiring reaches the open cell, a second button asks the world to draw it, or take it away, and a map that records none offers none (step 41)", async () => {
  const nav = createNav();
  const wire = vi.fn();
  nav.steer({ lookAt: vi.fn(), visit: vi.fn(), wire });
  await act(async () => root.render(<Crumbs map={DEMO} registry={createRegistry()} nav={nav} />));
  expect(host.querySelector('[data-wire]')).toBeNull();
  act(() => nav.open({ cell: 'folder:libs/core/src/pm', exploded: false, wired: false }));
  expect(element('[data-wire]').textContent).toBe('wire');
  await click('[data-wire]');
  expect(wire).toHaveBeenCalledTimes(1);
  act(() => nav.open({ cell: 'folder:libs/core/src/pm', exploded: false, wired: true }));
  expect(element('[data-wire]').dataset['wire']).toBe('on');
  expect(element('[data-wire]').textContent).toBe('unwire');
  // A map written before the wiring was recorded mutes the toggle (C2), and the explode stays.
  const { wiring: _, ...weather } = DEMO.weather;
  await act(async () => root.render(<Crumbs map={{ ...DEMO, weather }} registry={createRegistry()} nav={nav} />));
  expect(host.querySelector('[data-wire]')).toBeNull();
  expect(host.querySelector('[data-explode]')).not.toBeNull();
  // A world that does not steer the wiring takes the ask and does nothing.
  nav.steer({ lookAt: vi.fn(), visit: vi.fn() });
  nav.wire();
  expect(wire).toHaveBeenCalledTimes(1);
});

test("a notice's row flies the world to its target, and a shore target's row brings its block into view (D148, D153)", async () => {
  const nav = createNav();
  const visit = vi.fn();
  nav.steer({ lookAt: vi.fn(), visit });
  const scrolled = vi.fn();
  Element.prototype.scrollIntoView = scrolled;
  const map: MapJson = { ...DEMO, notices: [...DEMO.notices.slice(0, 1), notice('README.md'), notice('nowhere.ts')] };
  await act(async () => root.render(<Chrome state={{ status: 'ready', url: '/map.json', map }} registry={createRegistry()} nav={nav} dev={false} />));
  await click('[data-notice="1"]');
  expect(visit).toHaveBeenCalledWith(INDEX);
  await click('[data-notice="2"]');
  expect(scrolled).toHaveBeenCalledTimes(1);
  expect(scrolled.mock.contexts[0]).toBe(host.querySelector('[data-rail] [data-group="docs"]'));
  // An unplaced notice leads nowhere, and says so by taking no click.
  await click('[data-notice="3"]');
  expect(visit).toHaveBeenCalledTimes(1);
  expect(element('[data-notice="3"]').style.cursor).toBe('default');
  expect(element('[data-notice="1"]').style.cursor).toBe('pointer');
  // The breadcrumb stands under the status line.
  expect(element('[role="status"]').nextElementSibling?.hasAttribute('data-crumbs')).toBe(true);
});
