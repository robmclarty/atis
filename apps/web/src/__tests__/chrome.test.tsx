// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { CHROME_MUTED, FLARE_MS, SETTLE_MS } from 'scene';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { Chrome } from '../chrome/index.js';
import type { PanelModule } from '../chrome/index.js';
import { DevPanel, patchOf } from '../dev/index.js';
import type { MapState } from '../load.js';
import { SECTIONS, createRegistry } from '../registry.js';
import type { Registry } from '../registry.js';

/**
 * The chrome in a DOM (D156): the panel is absent by default, a development
 * build shows its toggle, a published one opens it only by the key
 * combination, its code loads only then, it lists every token by section,
 * a change in it moves the registry live, and its patch is the changed
 * tokens as tokens.ts writes them.
 */
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const LOADING: MapState = { status: 'loading', url: '/map.json' };

/** The panel's module as the chrome would load it, counted so a test can see when. */
const panel = (): LoadPanelSpy => vi.fn(async (): Promise<PanelModule> => ({ DevPanel }));
type LoadPanelSpy = ReturnType<typeof vi.fn<() => Promise<PanelModule>>>;

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

const mount = async (dev: boolean, load: LoadPanelSpy = panel(), registry: Registry = createRegistry()): Promise<{ readonly registry: Registry; readonly load: LoadPanelSpy }> => {
  await act(async () => root.render(<Chrome state={LOADING} registry={registry} dev={dev} load={load} />));
  return { registry, load };
};

const find = (selector: string): Element => {
  const found = host.querySelector(selector);
  if (found === null) throw new Error(`nothing matches ${selector}`);
  return found;
};

const element = (selector: string): HTMLElement => {
  const found = find(selector);
  if (!(found instanceof HTMLElement)) throw new Error(`${selector} is not an HTML element`);
  return found;
};

const input = (selector: string): HTMLInputElement => {
  const found = find(selector);
  if (!(found instanceof HTMLInputElement)) throw new Error(`${selector} is not an input`);
  return found;
};

const textarea = (selector: string): HTMLTextAreaElement => {
  const found = find(selector);
  if (!(found instanceof HTMLTextAreaElement)) throw new Error(`${selector} is not a textarea`);
  return found;
};

const button = (selector: string): HTMLButtonElement => {
  const found = find(selector);
  if (!(found instanceof HTMLButtonElement)) throw new Error(`${selector} is not a button`);
  return found;
};

/** Type into a control the way a browser does: the value through the element's own setter, past React's tracker, then the input event React listens for. */
const type = async (control: HTMLInputElement | HTMLTextAreaElement, value: string): Promise<void> => {
  const prototype = control instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Reflect.set(prototype, 'value', value, control);
    control.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

const click = (target: Element): Promise<void> =>
  act(async () => {
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

const pressCombination = (): Promise<void> =>
  act(async () => {
    globalThis.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyT', ctrlKey: true, altKey: true, shiftKey: true }));
  });

test('the panel is absent by default, and a published build shows no toggle', async () => {
  const { load } = await mount(false);
  expect(host.querySelector('[data-dev-panel]')).toBeNull();
  expect(host.querySelector('[data-dev-toggle]')).toBeNull();
  expect(find('[role="status"]').textContent).toBe('reading /map.json');
  expect(load).not.toHaveBeenCalled();
});

test('a development build shows a toggle, and the panel and its code arrive only when it is pressed', async () => {
  const { load } = await mount(true);
  const toggle = find('[data-dev-toggle]');
  expect(host.querySelector('[data-dev-panel]')).toBeNull();
  expect(load).not.toHaveBeenCalled();
  await click(toggle);
  expect(load).toHaveBeenCalledTimes(1);
  expect(host.querySelector('[data-dev-panel]')).not.toBeNull();
  await click(toggle);
  expect(host.querySelector('[data-dev-panel]')).toBeNull();
  await click(toggle);
  expect(load).toHaveBeenCalledTimes(1);
  await click(find('[data-dev-panel] [aria-label="close"]'));
  expect(host.querySelector('[data-dev-panel]')).toBeNull();
});

test('a published build opens the panel by the key combination alone', async () => {
  await mount(false);
  await act(async () => {
    globalThis.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyT', ctrlKey: true, shiftKey: true }));
  });
  expect(host.querySelector('[data-dev-panel]')).toBeNull();
  await pressCombination();
  expect(host.querySelector('[data-dev-panel]')).not.toBeNull();
  await pressCombination();
  expect(host.querySelector('[data-dev-panel]')).toBeNull();
});

test("the panel lists every token under the design doc's sections", async () => {
  const { registry } = await mount(true);
  await click(find('[data-dev-toggle]'));
  for (const section of SECTIONS) {
    const block = find(`[data-section="${section.title}"]`);
    expect(block.querySelector('h3')?.textContent).toBe(section.title);
    expect([...block.querySelectorAll('[data-token]')].map((row) => row.getAttribute('data-token'))).toEqual(section.names);
  }
  expect(host.querySelectorAll('[data-token]')).toHaveLength(registry.names.length);
  expect(host.querySelectorAll('[data-changed]')).toHaveLength(0);
  expect(find('[data-dev-panel] header').textContent).toContain('at rest');
});

test('a change in the panel moves the token live, through the registry and into the chrome', async () => {
  const { registry } = await mount(true);
  await click(find('[data-dev-toggle]'));

  const flare = input('[data-token="FLARE_MS"] input[type="number"]');
  expect(flare.value).toBe(String(FLARE_MS));
  await type(flare, '500');
  expect(registry.get('FLARE_MS')).toBe(500);
  expect(find('[data-token="FLARE_MS"]').hasAttribute('data-changed')).toBe(true);
  expect(find('[data-dev-panel] header').textContent).toContain('1 moved');

  const slider = input('[data-token="SETTLE_MS"] input[type="range"]');
  await type(slider, '300');
  expect(registry.get('SETTLE_MS')).toBe(300);
  expect(input('[data-token="SETTLE_MS"] input[type="number"]').value).toBe('300');

  const status = element('[role="status"]');
  expect(status.style.color).toBe('rgb(107, 116, 128)');
  await type(input('[data-token="CHROME_MUTED"] input[type="color"]'), '#ff0000');
  expect(registry.get('CHROME_MUTED')).toBe('#ff0000');
  expect(status.style.color).toBe('rgb(255, 0, 0)');

  await type(input('[data-token="SHAPE_PULSE_HZ"] input[type="number"]'), '0.5');
  expect(registry.get('SHAPE_PULSE_HZ')).toEqual([0.5, 0.25, 0.4, 0.6, 0.85, 1.15, 1.5]);

  const levels = textarea('[data-token="SHAPE_LEVELS"] textarea');
  await type(levels, '[{"arms": 0');
  expect(levels.hasAttribute('data-invalid')).toBe(true);
  expect(registry.changes().map((change) => change.name)).not.toContain('SHAPE_LEVELS');
  await type(levels, '[{"arms": 0}]');
  expect(registry.get('SHAPE_LEVELS')).toEqual([{ arms: 0 }]);

  await click(find('[aria-label="reset FLARE_MS"]'));
  expect(registry.get('FLARE_MS')).toBe(FLARE_MS);
  expect(input('[data-token="FLARE_MS"] input[type="number"]').value).toBe(String(FLARE_MS));
  expect(find('[data-token="FLARE_MS"]').hasAttribute('data-changed')).toBe(false);

  await click(find('[data-dev-panel] header button:nth-of-type(2)'));
  expect(registry.changes()).toEqual([]);
  expect(registry.get('SETTLE_MS')).toBe(SETTLE_MS);
  expect(registry.get('CHROME_MUTED')).toBe(CHROME_MUTED);
  expect(status.style.color).toBe('rgb(107, 116, 128)');
});

test('the patch is the changed tokens as tokens.ts writes them, and copying hands it over', async () => {
  const copy = vi.fn(async (): Promise<void> => undefined);
  const registry = createRegistry();
  await act(async () => root.render(<DevPanel registry={registry} onClose={() => undefined} copy={copy} />));
  expect(host.querySelector('[data-patch]')).toBeNull();
  expect(button('[data-copy-patch]').disabled).toBe(true);

  await act(async () => {
    registry.set('FLARE_MS', 500);
    registry.set('SKIN.roughness', 0.7);
  });
  const patch = find('[data-patch]').textContent;
  expect(patch).toBe(patchOf(registry.changes()));
  expect(patch).toContain('-export const FLARE_MS = 600;\n+export const FLARE_MS = 500;');
  expect(patch).toContain('--- a/apps/web/src/materials.ts');
  expect(patch).toContain('-  roughness: 0.46,\n+  roughness: 0.7,');

  await click(find('[data-copy-patch]'));
  expect(copy).toHaveBeenCalledWith(patch);
  expect(find('[data-copy-patch]').textContent).toBe('copied');
});
