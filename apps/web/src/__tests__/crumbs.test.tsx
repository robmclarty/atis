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
import { createNav } from '../nav.js';
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
