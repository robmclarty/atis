// @vitest-environment jsdom
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { CheckSlot, FlightCategory, MapJson } from 'core';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import {
  CHROME_GROUND,
  CHROME_MUTED,
  CROSSING_OPACITY,
  CROSSING_PAD,
  HATCH_WIDTH,
  IFR_HUE,
  LEGEND_SAMPLE_R,
  MAX_RULES,
  MUTED_DASH,
  ORGANELLE_FILL,
  REACH_DECAY,
  REACH_GLOW,
  REACH_ORIGIN_OPACITY,
  STIPPLE_DOT,
  TEXTURE_INK,
  TEXTURE_MAX_OPACITY,
} from 'scene';
import { LEGEND as SHEET_LEGEND, SHAPE_KEY_WORDS as SHEET_SHAPE_KEY_WORDS, renderSvg } from 'svg';
import { afterEach, beforeEach, expect, test } from 'vitest';

import { Chrome, Hud, Legend } from '../chrome/index.js';
import { HUD_ORDER, LEGEND, SHAPE_KEY_WORDS, blockText, blocksOf, over } from '../hud.js';
import { createRegistry } from '../registry.js';

/**
 * The HUD's grade blocks and the legend inset in the world's chrome (§7,
 * D87), held to the still sheet's: every block's words on every fixture map
 * equal the SVG's for the same map, block for block (D33, D86), the legend
 * keys the same marks in the same words, and the DOM draws them flat.
 */
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const DEMO = assertMap(JSON.parse(readFileSync(join(ROOT, 'libs', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));
const REPO_FIXTURES = join(ROOT, 'fixtures');

/** A slot turned green, which records no split and names no file. */
const greened = (slot: CheckSlot): CheckSlot => ({ name: slot.name, ok: true, skipped: slot.skipped, scope: 'global' });

/** The demo with its verdict swapped: green slots and passed stitches for a VFR or MVFR, nothing trusted for a NOINST, as the sheet's own test varies it. */
const variant = (category: FlightCategory): MapJson => {
  const { weather } = DEMO;
  if (category === 'IFR') return DEMO;
  if (category === 'NOINST') {
    return { ...DEMO, meta: { ...DEMO.meta, instruments: { mode: 'git-only', reason: 'no .check/' } }, weather: { ...weather, checks: { category, checks_run: 0, slots: [] }, evidence: {} } };
  }
  if (category === 'LIFR') return { ...DEMO, weather: { ...weather, checks: { ...weather.checks, category } } };
  return {
    ...DEMO,
    weather: {
      ...weather,
      checks: { ...weather.checks, category, slots: weather.checks.slots.map((slot) => greened(slot)) },
      evidence: { ...weather.evidence, stitches: (weather.evidence.stitches ?? []).map((stitch) => ({ ...stitch, status: 'passed' })) },
    },
  };
};

/** Every committed fixture map that reads under the current contract; one an older reading was judged on has no HUD to compare. */
const committedMaps = (): readonly (readonly [string, MapJson])[] =>
  readdirSync(REPO_FIXTURES)
    .map((name) => [name, join(REPO_FIXTURES, name, 'map.json')] as const)
    .filter(([, path]) => existsSync(path))
    .flatMap(([name, path]) => {
      try {
        return [[name, assertMap(JSON.parse(readFileSync(path, 'utf8')))] as const];
      } catch {
        return [];
      }
    });

/** The sheet's HUD blocks for a map: each `data-block`'s id, its muted reason, and what it reads as, the tags inside its text gone. */
const sheetBlocks = (map: MapJson): readonly { readonly id: string; readonly reason: string | undefined; readonly text: string }[] =>
  [...renderSvg(map).matchAll(/<g data-block="([^"]+)"([^>]*)>[\s\S]*?<text[^>]*>([\s\S]*?)<\/text>/g)].map(([, id = '', attrs = '', inner = '']) => ({
    id,
    reason: /data-reason="([\w-]+)"/.exec(attrs)?.[1],
    text: inner.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
  }));

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

const element = (selector: string): HTMLElement => {
  const found = host.querySelector(selector);
  if (!(found instanceof HTMLElement)) throw new Error(`${selector} is not an HTML element`);
  return found;
};

test("the world's blocks are the sheet's, block for block, on the demo, its four other categories and every committed fixture", () => {
  const maps: readonly (readonly [string, MapJson])[] = [['demo', DEMO], ...(['VFR', 'MVFR', 'LIFR', 'NOINST'] as const).map((category) => [category, variant(category)] as const), ...committedMaps()];
  expect(maps.length).toBeGreaterThan(10);
  for (const [name, map] of maps) {
    const sheet = sheetBlocks(map);
    const world = blocksOf(map);
    expect(world.map((block) => block.id), name).toEqual(sheet.map((block) => block.id));
    expect(world.map(blockText), name).toEqual(sheet.map((block) => block.text));
    expect(world.map((block) => block.muted), name).toEqual(sheet.map((block) => block.reason));
    for (const block of world) expect(HUD_ORDER, `${name}: ${block.id}`).toContain(block.id);
  }
  // Every block on the demo, in §7's order, with Standing and Other present; the delta waits for wave 3.
  const demo = blocksOf(DEMO);
  expect(demo.map((block) => block.id)).toEqual(HUD_ORDER);
  expect(demo.find((block) => block.id === 'health')).toEqual({ id: 'health', label: 'Health Δ', value: MUTED_DASH, tail: '', muted: 'head-only' });
  expect(blockText(demo[0] ?? { id: '', label: '', value: '', tail: '' })).toBe('IFR');
});

test("the world's Size counts the terrain alone, as the sheet's does, so a change of source and fixtures reads as its source (D166)", () => {
  const fixture = { path: 'libs/core/fixtures/demo/map.json', kind: 'modified' as const, group: 'data', is_barrel: false, added: 2000, deleted: 1800, hunks: [] };
  const changed = [...DEMO.weather.changed.filter((file) => file.path === 'libs/core/src/pm/index.ts'), fixture];
  const map: MapJson = { ...DEMO, weather: { ...DEMO.weather, changed } };
  const size = blocksOf(map).find((block) => block.id === 'size');
  expect(size === undefined ? '' : blockText(size)).toBe('Size +18 −9, 1 files');
  expect(blocksOf(map).map(blockText)).toEqual(sheetBlocks(map).map((block) => block.text));
});

test('the legend keys the same marks in the same words as the sheet, and the shape key says the same', () => {
  expect(LEGEND).toEqual(SHEET_LEGEND);
  expect(SHAPE_KEY_WORDS).toBe(SHEET_SHAPE_KEY_WORDS);
  expect(over('#ffffff', '#000000', 0.5)).toBe('#808080');
  expect(over('#e6edf3', '#1a1f27', 0)).toBe('#1a1f27');
});

test('the HUD draws every block in order with its words: the category solid in its hue, a muted block in the muted grey with the dash', async () => {
  await act(async () => root.render(<Hud map={DEMO} registry={createRegistry()} />));
  const blocks = all('[data-block]');
  expect(blocks.map((block) => block.getAttribute('data-block'))).toEqual(HUD_ORDER);
  expect(blocks.map((block) => block.textContent)).toEqual(blocksOf(DEMO).map(blockText));
  const category = element('[data-block="category"]');
  expect(category.getAttribute('data-category')).toBe('IFR');
  expect(category.style.background).toBe('rgb(240, 84, 106)');
  expect(category.textContent).toBe('IFR');
  const health = element('[data-block="health"]');
  expect(health.getAttribute('data-muted')).toBe('true');
  expect(health.getAttribute('data-reason')).toBe('head-only');
  expect(health.style.color).toBe('rgb(107, 116, 128)');
  expect(health.textContent).toContain(MUTED_DASH);
  expect(element('[data-block="gate"]').querySelector('b')?.textContent).toBe('1');
  expect(element('[data-block="gate"]').hasAttribute('data-muted')).toBe(false);
  expect(host.innerHTML).not.toMatch(/gradient|shadow|blur|opacity/);
});

test('a map with nothing trusted draws NOINST on the muted grey, its evidence blocks muted and no Standing block', async () => {
  await act(async () => root.render(<Hud map={variant('NOINST')} registry={createRegistry()} />));
  const category = element('[data-block="category"]');
  expect(category.textContent).toBe('NOINST');
  expect(category.style.background).toBe('rgb(107, 116, 128)');
  expect(element('[data-block="gate"]').getAttribute('data-reason')).toBe('absent');
  expect(element('[data-block="patch-cov"]').getAttribute('data-reason')).toBe('absent');
  expect(host.querySelector('[data-block="standing"]')).toBeNull();
  expect(element('[data-block="reach"]').hasAttribute('data-muted')).toBe(false);
});

test('the legend inset draws one numbered row per mark with its words, and the key of the seven shapes, flat', async () => {
  await act(async () => root.render(<Legend registry={createRegistry()} />));
  const rows = all('[data-legend] [data-mark]');
  expect(rows.map((row) => row.getAttribute('data-mark'))).toEqual(LEGEND.map((mark) => mark.id));
  expect(rows.map((row) => row.querySelector('[data-balloon]')?.textContent)).toEqual(LEGEND.map((_, index) => String(index + 1)));
  for (const [index, mark] of LEGEND.entries()) expect(rows[index]?.textContent).toContain(mark.words);
  expect(all('[data-legend] [data-mark="category"] span span').map((block) => block.textContent)).toEqual(['VFR', 'MVFR', 'IFR', 'LIFR']);
  expect(all('[data-legend] [data-mark]:not([data-mark="category"]) svg')).toHaveLength(LEGEND.length - 1);
  expect(all('[data-legend] [data-key="shapes"] [data-rules]').map((form) => form.getAttribute('data-rules'))).toEqual(Array.from({ length: MAX_RULES + 1 }, (_, rules) => String(rules)));
  expect(element('[data-legend] [data-key="shapes"]').textContent).toContain(SHAPE_KEY_WORDS);
  expect(element('[data-legend]').textContent).toContain('legend');
  expect(host.innerHTML).not.toMatch(/gradient|shadow|blur|opacity/);
  expect(host.innerHTML).toContain(CHROME_MUTED);
  expect(host.innerHTML).toContain(IFR_HUE);
});

/** One row of the still sheet's inset on the demo, by its mark's id, to count its marks against the world's. */
const sheetRow = (id: string): string => {
  const svg = renderSvg(DEMO);
  const start = svg.indexOf(`<g data-mark="${id}">`);
  const next = svg.indexOf('<g data-mark=', start + 1);
  return svg.slice(start, next === -1 ? svg.indexOf('<g data-key=', start) : next);
};

test("the reach, its crossings and the history's two textures each draw their sample from the tokens their marks are drawn with, as the sheet's do (D166)", async () => {
  await act(async () => root.render(<Legend registry={createRegistry()} />));
  const sample = (id: string): Element => {
    const found = host.querySelector(`[data-legend] [data-mark="${id}"] svg`);
    if (found === null) throw new Error(`${id} draws no sample`);
    return found;
  };

  // The reach steps down a module at a time, each block the warm glow at its hop's share over the chrome's ground.
  const blocks = [...sample('reach').querySelectorAll('rect')];
  expect(blocks.map((block) => block.getAttribute('data-hops'))).toEqual(['0', '1', '2']);
  expect(blocks.map((block) => block.getAttribute('fill'))).toEqual([0, 1, 2].map((hops) => over(REACH_GLOW, CHROME_GROUND, REACH_ORIGIN_OPACITY * REACH_DECAY ** hops)));

  // The crossing's warm disc past the file's edge, at its strength.
  const [halo, outline] = [...sample('crossing').querySelectorAll('circle')];
  expect(halo?.getAttribute('r')).toBe(String(LEGEND_SAMPLE_R + CROSSING_PAD));
  expect(halo?.getAttribute('fill')).toBe(over(REACH_GLOW, CHROME_GROUND, CROSSING_OPACITY));
  expect(outline?.getAttribute('fill')).toBe('none');

  // Hatching and stipple in the history's ink over the file, line for line and dot for dot with the sheet's.
  const ink = over(TEXTURE_INK, ORGANELLE_FILL, TEXTURE_MAX_OPACITY);
  const lines = [...sample('hatching').querySelectorAll('line')];
  expect(lines).toHaveLength([...sheetRow('hatching').matchAll(/<line /g)].length);
  for (const line of lines) {
    expect(line.getAttribute('stroke')).toBe(ink);
    expect(line.getAttribute('stroke-width')).toBe(String(HATCH_WIDTH));
  }
  const dots = [...sample('stipple').querySelectorAll('circle')].filter((dot) => dot.getAttribute('r') === String(STIPPLE_DOT));
  expect(dots).toHaveLength([...sheetRow('stipple').matchAll(new RegExp(`r="${String(STIPPLE_DOT)}"`, 'g'))].length);
  expect(dots.length).toBeGreaterThan(1);
  for (const dot of dots) expect(dot.getAttribute('fill')).toBe(ink);
});

test("a new row's sample follows its token live from the registry, as every look the dev panel moves does", async () => {
  const registry = createRegistry();
  await act(async () => root.render(<Legend registry={registry} />));
  await act(async () => {
    registry.set('REACH_GLOW', '#ff0000');
    registry.set('TEXTURE_INK', '#00ff00');
  });
  const [first] = [...host.querySelectorAll('[data-legend] [data-mark="reach"] svg rect')];
  expect(first?.getAttribute('fill')).toBe(over('#ff0000', CHROME_GROUND, REACH_ORIGIN_OPACITY));
  expect(host.querySelector('[data-legend] [data-mark="hatching"] svg line')?.getAttribute('stroke')).toBe(over('#00ff00', ORGANELLE_FILL, TEXTURE_MAX_OPACITY));
});

test('the chrome carries the HUD over the status line once the map is read, and not before, with the legend folded into its key block, closed', async () => {
  const registry = createRegistry();
  await act(async () => root.render(<Chrome state={{ status: 'loading', url: '/map.json' }} registry={registry} dev={false} />));
  expect(host.querySelector('[data-hud]')).toBeNull();
  expect(host.querySelector('[data-hud-key]')).toBeNull();
  await act(async () => root.render(<Chrome state={{ status: 'ready', url: '/map.json', map: DEMO }} registry={registry} dev={false} />));
  // The row and the panel it opens share a wrapper, and the status line follows it.
  const hud = element('[data-hud]');
  expect(hud.parentElement?.nextElementSibling?.getAttribute('role')).toBe('status');
  expect(all('[data-hud] [data-block]')).toHaveLength(HUD_ORDER.length);
  // The key block stands last in the row, and the legend it folds is not drawn until it is opened (D166).
  const key = element('[data-hud] [data-hud-key]');
  expect(hud.lastElementChild).toBe(key);
  expect(key.textContent).toBe('key');
  expect(key.getAttribute('aria-expanded')).toBe('false');
  expect(host.querySelector('[data-legend]')).toBeNull();
});

/** A key pressed on the page, as the world hears it, with whether something before it took it. */
const press = (key: string): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  globalThis.dispatchEvent(event);
  return event;
};

test('the key block opens the legend beneath the row and a second click folds it away, one panel at a time with the blocks\' parts', async () => {
  await act(async () => root.render(<Hud map={DEMO} registry={createRegistry()} />));
  const key = element('[data-hud-key]');
  await act(async () => key.click());
  expect(key.getAttribute('aria-expanded')).toBe('true');
  const legend = element('[data-legend]');
  expect(all('[data-legend] [data-mark]').map((row) => row.getAttribute('data-mark'))).toEqual(LEGEND.map((mark) => mark.id));
  // Beneath the row, in the panel's place, and not in the row itself.
  expect(element('[data-hud]').contains(legend)).toBe(false);
  expect(host.querySelector('[data-parts]')).toBeNull();
  // A grade block's parts take the panel's place, and the legend folds away.
  await act(async () => element('[data-block="gate"]').click());
  expect(host.querySelector('[data-legend]')).toBeNull();
  expect(host.querySelector('[data-parts]')).not.toBeNull();
  await act(async () => key.click());
  expect(host.querySelector('[data-parts]')).toBeNull();
  await act(async () => key.click());
  expect(host.querySelector('[data-legend]')).toBeNull();
  expect(key.getAttribute('aria-expanded')).toBe('false');
});

test('Esc folds an open legend away and marks the key taken, so an open cell beneath stays open; with the legend closed, Esc passes to the world', async () => {
  await act(async () => root.render(<Hud map={DEMO} registry={createRegistry()} />));
  expect(press('Escape').defaultPrevented).toBe(false);
  await act(async () => element('[data-hud-key]').click());
  expect(host.querySelector('[data-legend]')).not.toBeNull();
  // Another key leaves it open and untaken.
  expect(press('x').defaultPrevented).toBe(false);
  expect(host.querySelector('[data-legend]')).not.toBeNull();
  let escape: KeyboardEvent | undefined;
  await act(async () => {
    escape = press('Escape');
  });
  expect(escape?.defaultPrevented).toBe(true);
  expect(host.querySelector('[data-legend]')).toBeNull();
  expect(element('[data-hud-key]').getAttribute('aria-expanded')).toBe('false');
  expect(press('Escape').defaultPrevented).toBe(false);
});
