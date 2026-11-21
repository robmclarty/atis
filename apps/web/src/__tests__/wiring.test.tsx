// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson } from 'core';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { CHANGE_HUE, CHROME_INK, CHROME_MUTED, LEADER_DASH, WIRING_SPACING, layWiring } from 'scene';
import type { Plate, Wiring, WiringSpacing } from 'scene';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { WiringPlate } from '../chrome/index.js';
import { createNav } from '../nav.js';
import type { Nav } from '../nav.js';
import { createRegistry } from '../registry.js';

/**
 * The open cell's wiring as a plate in the chrome (step 41): absent until the
 * toggle wires the open cell, then each home a frame, the opened cell's in
 * ink and the rest dotted, each file a box outlined in the change hue where
 * the change touched it, and each wire a line ending on an arrowhead; laid
 * again when a spacing token moves, and saying so when it cannot be laid.
 * The inspector hosts the same plate for the module it shows (D260
 * (wiring-hosted)): in the panel's flow, whatever the world has open, saying
 * so while it is laid and where no wire reaches the module.
 */
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', '..', 'libs', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));
const PM = 'folder:libs/core/src/pm';

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

const all = (selector: string): readonly Element[] => [...host.querySelectorAll(selector)];

/** Let the layout's promise settle and the plate render. */
const settle = (): Promise<void> => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

const wired = (nav: Nav, on: boolean): void => act(() => nav.open({ cell: PM, exploded: false, wired: on }));

test('the plate shows only while the open cell is wired, its frames, files and wires laid by the scene', async () => {
  const nav = createNav();
  const lay = vi.fn(layWiring);
  await act(async () => root.render(<WiringPlate map={DEMO} registry={createRegistry()} nav={nav} lay={lay} />));
  expect(host.querySelector('[data-wiring]')).toBeNull();
  act(() => nav.open({ cell: PM, exploded: false, wired: false }));
  await settle();
  expect(host.querySelector('[data-wiring]')).toBeNull();

  expect(lay).not.toHaveBeenCalled();
  wired(nav, true);
  await act(async () => {
    await lay.mock.results[0]?.value;
  });
  expect(host.querySelector(`[data-wiring="${PM}"] svg`)).not.toBeNull();
  expect(host.querySelector('figcaption')?.textContent).toBe('wiring · libs/core/src/pm');
  expect(all('[data-wiring-home]').map((home) => home.getAttribute('data-wiring-home'))).toEqual([PM, 'directory:libs/core/src/util', 'package:libs/core', 'single:apps/cli/src/doctor.ts', 'tests']);
  // The opened cell's frame is solid ink; every other is a dotted phantom line.
  const frames = all('[data-wiring-home] rect');
  expect(frames[0]?.getAttribute('stroke')).toBe(CHROME_INK);
  expect(frames[0]?.hasAttribute('stroke-dasharray')).toBe(false);
  expect(frames.slice(1).every((frame) => frame.getAttribute('stroke') === CHROME_MUTED && frame.getAttribute('stroke-dasharray') === LEADER_DASH)).toBe(true);
  // Seven files, the four the change touched outlined in the change hue, the added one named with its +.
  const files = all('[data-wiring-file]');
  expect(files).toHaveLength(7);
  const changed = files.flatMap((file) => (file.querySelector('rect')?.getAttribute('stroke') === CHANGE_HUE ? [file.getAttribute('data-wiring-file') ?? ''] : []));
  expect(changed.toSorted()).toEqual(['apps/cli/src/doctor.ts', 'libs/core/src/__tests__/pm.test.ts', 'libs/core/src/pm/index.ts', 'libs/core/src/pm/tools.ts']);
  expect(host.querySelector('[data-wiring-file="libs/core/src/pm/tools.ts"] text')?.textContent).toBe('+tools.ts');
  // Seven wires, each a line ending on the arrowhead.
  const lines = all('[data-wiring-line]');
  expect(lines).toHaveLength(7);
  expect(lines.every((line) => line.getAttribute('marker-end') === 'url(#atis-wiring-arrow)' && (line.getAttribute('points') ?? '').split(' ').length >= 2)).toBe(true);
  expect(host.querySelector('[data-wiring-line="libs/core/src/pm/tools.ts → libs/core/src/util/format.ts"]')).not.toBeNull();

  wired(nav, false);
  expect(host.querySelector('[data-wiring]')).toBeNull();
});

test('a spacing token moved in the panel lays the plate again with it, and a plate that cannot be laid says why (D156, C2)', async () => {
  const nav = createNav();
  const registry = createRegistry();
  const plate: Plate = { cell: PM, width: 40, height: 20, homes: [], files: [], lines: [] };
  const lay = vi.fn((_wiring: Wiring, _spacing: WiringSpacing): Promise<Plate> => Promise.resolve(plate));
  await act(async () => root.render(<WiringPlate map={DEMO} registry={registry} nav={nav} lay={lay} />));
  wired(nav, true);
  await settle();
  expect(lay).toHaveBeenCalledTimes(1);
  expect(lay.mock.calls[0]?.[1]).toEqual(WIRING_SPACING);
  act(() => registry.set('WIRING.layerGap', 80));
  await settle();
  expect(lay).toHaveBeenCalledTimes(2);
  expect(lay.mock.calls[1]?.[1]).toEqual({ ...WIRING_SPACING, layerGap: 80 });

  const failing = vi.fn((): Promise<Plate> => Promise.reject(new Error('elk refused')));
  await act(async () => root.render(<WiringPlate map={DEMO} registry={registry} nav={nav} lay={failing} />));
  await settle();
  expect(host.querySelector('[data-wiring-failed]')?.textContent).toBe('the wiring could not be laid out: elk refused');
});

test("a panel hosts a module's plate with no cell open: in its own flow at the width it is given, saying so while the plate is laid (D260 (wiring-hosted))", async () => {
  const nav = createNav();
  const laying = Promise.withResolvers<Plate>();
  const lay = vi.fn((_wiring: Wiring, _spacing: WiringSpacing): Promise<Plate> => laying.promise);
  await act(async () => root.render(<WiringPlate map={DEMO} registry={createRegistry()} nav={nav} cell={PM} width={380} lay={lay} />));
  // The world has nothing open, and the plate is asked for all the same.
  expect(nav.opened()).toBeUndefined();
  expect(lay).toHaveBeenCalledTimes(1);
  expect(lay.mock.calls[0]?.[0].cell).toBe(PM);
  expect(host.querySelector('[data-wiring-laying]')?.textContent).toBe('laying out the wiring');
  expect(host.querySelector('[data-wiring]')).toBeNull();

  const plate = await layWiring(lay.mock.calls[0]?.[0] ?? { cell: PM, homes: [], edges: [] });
  await act(async () => laying.resolve(plate));
  const figure = host.querySelector<HTMLElement>(`[data-wiring="${PM}"]`);
  expect(figure?.hasAttribute('data-wiring-hosted')).toBe(true);
  // It stands in the panel's flow and takes the pointer, so the panel scrolls it; the plate over the world is fixed and lets the pointer through.
  expect(figure?.style.position).toBe('');
  expect(figure?.style.width).toBe('380px');
  expect(figure?.style.overflow).toBe('auto');
  expect(figure?.style.pointerEvents).toBe('auto');
  expect(all('[data-wiring-file]')).toHaveLength(7);
  // The plate is drawn at the size it was laid, never shrunk to the panel.
  expect(host.querySelector('svg')?.getAttribute('width')).toBe(String(plate.width));
  expect(host.querySelector<SVGElement>('svg')?.style.maxWidth).toBe('');

  // The open cell's own plate still stands over the world, apart from the hosted one.
  await act(async () => root.render(<WiringPlate map={DEMO} registry={createRegistry()} nav={nav} lay={() => Promise.resolve(plate)} />));
  expect(host.querySelector('[data-wiring]')).toBeNull();
  wired(nav, true);
  await settle();
  const over = host.querySelector<HTMLElement>(`[data-wiring="${PM}"]`);
  expect(over?.hasAttribute('data-wiring-hosted')).toBe(false);
  expect(over?.style.position).toBe('fixed');
  expect(over?.style.pointerEvents).toBe('none');
});

test('a hosted plate says why it has nothing to draw, where the plate over the world shows nothing (C2)', async () => {
  const nav = createNav();
  const lay = vi.fn(layWiring);
  // No wire of the change ends in the module.
  const unwired: MapJson = { ...DEMO, weather: { ...DEMO.weather, wiring: [] } };
  await act(async () => root.render(<WiringPlate map={unwired} registry={createRegistry()} nav={nav} cell={PM} lay={lay} />));
  expect(host.querySelector('[data-wiring-none]')?.textContent).toBe("no import with a changed file at either end touches this module's own files");
  // A map written before the wiring was recorded has none to read.
  const { wiring: _wiring, ...weather } = DEMO.weather;
  await act(async () => root.render(<WiringPlate map={{ ...DEMO, weather }} registry={createRegistry()} nav={nav} cell={PM} lay={lay} />));
  expect(host.querySelector('[data-wiring-none]')?.textContent).toBe('the map records no wiring');
  expect(lay).not.toHaveBeenCalled();
  // Over the world the same map draws no plate and says nothing.
  wired(nav, true);
  await act(async () => root.render(<WiringPlate map={unwired} registry={createRegistry()} nav={nav} lay={lay} />));
  expect(host.innerHTML).toBe('');
});
