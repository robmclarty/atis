// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { CHANGE_HUE, MINIMAP, REACH_DECAY, REACH_GLOW, minimapOf, toInset, toLayout } from 'scene';
import type { Point } from 'scene';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { Chrome, Minimap } from '../chrome/index.js';
import { over } from '../hud.js';
import { createNav } from '../nav.js';
import { createRegistry } from '../registry.js';

/**
 * The minimap (D154) and the line it moves the camera along: the inset draws
 * the scene's minimap flat, the view's outline as the world shows it, and a
 * click or a drag on it asks the world to look there; the line carries the
 * asks to whichever world steers, and the outline only when it moved.
 */
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', '..', 'libs', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));
const BOX = { width: MINIMAP.width, height: MINIMAP.height, pad: MINIMAP.pad };
const DRAWN = minimapOf(DEMO, BOX);

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

const element = (selector: string): Element => {
  const found = host.querySelector(selector);
  if (found === null) throw new Error(`nothing matches ${selector}`);
  return found;
};

const all = (selector: string): readonly Element[] => [...host.querySelectorAll(selector)];

/** A pointer event of a kind at a point of the page; jsdom's inset sits at the page's origin. */
const pointer = (target: Element, type: string, [clientX, clientY]: Point): void => {
  act(() => {
    target.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX, clientY }));
  });
};

test('the line carries the outline only when it moves, and each ask to the world that steers, until it lets go', () => {
  const nav = createNav();
  const heard = vi.fn();
  nav.subscribe(heard);
  expect(nav.outline()).toBeUndefined();
  nav.lookAt([1, 2]);
  const square: readonly Point[] = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
  ];
  nav.show(square);
  nav.show(square.map(([x, y]) => [x + 1e-6, y]));
  expect(heard).toHaveBeenCalledTimes(1);
  nav.show(square.map(([x, y]) => [x + 5, y]));
  expect(heard).toHaveBeenCalledTimes(2);
  expect(nav.outline()?.[0]).toEqual([5, 0]);

  const first = vi.fn();
  const second = vi.fn();
  const letGoFirst = nav.steer({ lookAt: first, visit: vi.fn() });
  const letGoSecond = nav.steer({ lookAt: second, visit: vi.fn() });
  nav.lookAt([3, 4]);
  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalledWith([3, 4]);
  // The first to steer letting go leaves the second steering.
  letGoFirst();
  nav.lookAt([5, 6]);
  expect(second).toHaveBeenCalledTimes(2);
  letGoSecond();
  nav.lookAt([7, 8]);
  expect(second).toHaveBeenCalledTimes(2);
});

test('the inset draws the body flat: its silhouette, the reach by luminance, the changed files, and the notices in their runs', async () => {
  if (DRAWN === undefined) throw new Error('the demo drew no minimap');
  const registry = createRegistry();
  await act(async () => root.render(<Minimap map={DEMO} registry={registry} nav={createNav()} />));
  const inset = element('[data-minimap]');
  expect(inset.querySelector('svg')?.getAttribute('width')).toBe(String(DRAWN.frame.width));
  expect(element('[data-silhouette]').getAttribute('fill')).toBe(MINIMAP.body);
  expect(element('[data-silhouette]').getAttribute('d')?.match(/M/g)).toHaveLength(DRAWN.silhouette.length);
  expect(all('[data-reach]').map((path) => [path.getAttribute('data-reach'), path.getAttribute('fill')])).toEqual(
    DRAWN.reach.map((reach) => [reach.cell, over(REACH_GLOW, MINIMAP.body, reach.luminance * MINIMAP.reachShare)]),
  );
  expect(element('[data-reach="package:libs/core"]').getAttribute('fill')).toBe(over(REACH_GLOW, MINIMAP.body, REACH_DECAY * MINIMAP.reachShare));
  expect(element('[data-reach="package:libs/core"]').getAttribute('fill-rule')).toBe('evenodd');
  expect(all('[data-changed]').map((dot) => dot.getAttribute('data-changed'))).toEqual(DRAWN.changed.map((file) => file.path));
  expect(element('[data-changed="libs/core/src/pm/tools.ts"]').getAttribute('fill')).toBe(CHANGE_HUE);
  // A deleted file is hollow: the change hue's ring, nothing inside.
  expect(element('[data-changed="libs/core/src/pm/legacy.ts"]').getAttribute('fill')).toBe('none');
  expect(element('[data-changed="libs/core/src/pm/legacy.ts"]').getAttribute('stroke')).toBe(CHANGE_HUE);
  expect(all('[data-run]').map((run) => [...run.querySelectorAll('[data-mark]')].map((box) => box.getAttribute('data-mark')))).toEqual([['1', '2', '3', '4'], ['5'], ['6']]);
  // Flat, and never a glow (D12).
  expect(inset.outerHTML).not.toMatch(/gradient|filter|shadow|blur|opacity/);
});

test("the view's outline is drawn where the world shows it, and moves with it", async () => {
  if (DRAWN === undefined) throw new Error('the demo drew no minimap');
  const nav = createNav();
  await act(async () => root.render(<Minimap map={DEMO} registry={createRegistry()} nav={nav} />));
  expect(host.querySelector('[data-view]')).toBeNull();
  const outline: readonly Point[] = [
    [100, 100],
    [300, 100],
    [300, 400],
    [100, 400],
  ];
  act(() => nav.show(outline));
  const points = (): readonly number[] => (element('[data-view]').getAttribute('points') ?? '').split(/[ ,]/).map(Number);
  expect(points()).toEqual(outline.flatMap((point) => toInset(DRAWN.frame, point).map((n) => Number(n.toFixed(1)))));
  act(() => nav.show(outline.map(([x, y]) => [x + 50, y])));
  expect(points()[0]).toBeCloseTo(toInset(DRAWN.frame, [150, 100])[0], 1);
  expect(element('[data-view]').getAttribute('stroke')).toBe(MINIMAP.view);
});

test('a click on the inset asks the world to look there, and a drag keeps asking until the button lifts', async () => {
  if (DRAWN === undefined) throw new Error('the demo drew no minimap');
  const nav = createNav();
  const looked = vi.fn();
  nav.steer({ lookAt: looked, visit: vi.fn() });
  await act(async () => root.render(<Minimap map={DEMO} registry={createRegistry()} nav={nav} />));
  const svg = element('[data-minimap] svg');
  pointer(svg, 'pointerdown', [40, 30]);
  expect(looked).toHaveBeenLastCalledWith(toLayout(DRAWN.frame, [40, 30]));
  pointer(svg, 'pointermove', [60, 50]);
  expect(looked).toHaveBeenLastCalledWith(toLayout(DRAWN.frame, [60, 50]));
  pointer(svg, 'pointerup', [60, 50]);
  pointer(svg, 'pointermove', [80, 70]);
  expect(looked).toHaveBeenCalledTimes(2);
});

test('the inset takes its size and its inks live from the registry (D156)', async () => {
  const registry = createRegistry();
  await act(async () => root.render(<Minimap map={DEMO} registry={registry} nav={createNav()} />));
  const before = Number(element('[data-minimap] svg').getAttribute('width'));
  act(() => {
    registry.set('MINIMAP.height', 90);
    registry.set('MINIMAP.body', '#445566');
  });
  expect(Number(element('[data-minimap] svg').getAttribute('width'))).toBeLessThan(before);
  expect(element('[data-silhouette]').getAttribute('fill')).toBe('#445566');
});

test("a map with no layout draws no inset, and the chrome's corner holds the minimap alone once the map is read, the legend folded into the HUD (D166)", async () => {
  const { layout: _layout, ...terrain } = DEMO.terrain;
  await act(async () => root.render(<Minimap map={{ ...DEMO, terrain }} registry={createRegistry()} nav={createNav()} />));
  expect(host.querySelector('[data-minimap]')).toBeNull();
  await act(async () => root.render(<Chrome state={{ status: 'loading', url: '/map.json' }} registry={createRegistry()} dev={false} />));
  expect(host.querySelector('[data-minimap]')).toBeNull();
  await act(async () => root.render(<Chrome state={{ status: 'ready', url: '/map.json', map: DEMO }} registry={createRegistry()} dev={false} />));
  expect(host.querySelector('[data-legend]')).toBeNull();
  const minimap = element('[data-minimap]');
  expect(minimap.previousElementSibling).toBeNull();
  expect(minimap.nextElementSibling).toBeNull();
});
