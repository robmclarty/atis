// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEFAULT_EDITOR, assertMap, editorLink } from 'core';
import type { ApprovedBlock, MapJson } from 'core';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { CHANGE_HUE, CHROME_INK, CHROME_MUTED, CHROME_RULE, MUTED_DASH } from 'scene';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { Chrome, Inspector } from '../chrome/index.js';
import { RAIL_WIDTH } from '../fit.js';
import { NO_APPROVED_SHAPE, inspect } from '../inspector.js';
import { createNav, selectedOf } from '../nav.js';
import type { Nav, Selected } from '../nav.js';
import { READING_ORDER, readingOf } from '../reading.js';
import { createRegistry } from '../registry.js';
import type { Registry } from '../registry.js';
import type { ServedSource } from '../source.js';

/**
 * The inspector as the chrome draws it (D208 (side-panels)): one thin tab
 * with nothing selected, which opens the map view; a module's facts, files,
 * exports and wiring; a file's facts, functions, diff and code. Its rows
 * select and point over the line to the world (D209 (selection-line)), with
 * no world drawn, a fact the map did not measure is written muted with its
 * reason and never as a number (C2), and the keys are its own while the
 * focus is inside it (D262 (panel-keys)).
 */
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', '..', 'libs', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));

const PM = 'folder:libs/core/src/pm';
const CORE = 'package:libs/core';
const UTIL = 'directory:libs/core/src/util';
const INDEX = 'libs/core/src/pm/index.ts';
const TOOLS = 'libs/core/src/pm/tools.ts';
const SLOTS = 'libs/core/src/pm/slots.ts';
const LEGACY = 'libs/core/src/pm/legacy.ts';
const DOCTOR = 'apps/cli/src/doctor.ts';

/** The demo with no `.check/` trusted, as the HUD's test strips it: git-only instruments, no slot and no evidence. */
const UNCHECKED: MapJson = { ...DEMO, meta: { ...DEMO.meta, instruments: { mode: 'git-only', reason: 'no .check/' } }, weather: { ...DEMO.weather, checks: { category: 'NOINST', checks_run: 0, slots: [] }, evidence: {} } };

/** A block the map's own guard accepts: a new outside package, a module that grew, and a module that is gone. */
const APPROVED: ApprovedBlock = {
  at: DEMO.meta.head,
  departures: [
    { kind: 'dependency-added', target: 'kleur', why: 'kleur is imported and the approved shape did not hold it' },
    { kind: 'files-grown', target: 'libs/core/src/pm', cell: PM, why: 'it holds more files than approved', was: 3, now: 4 },
    { kind: 'interface-widened', target: 'libs/core/src/pm', cell: PM, why: 'its interface exports more', was: 2, now: 3, names: ['resolveTool'] },
    { kind: 'module-removed', target: 'src/gone', cell: 'directory:src/gone', why: 'the approved shape held it and the map does not' },
  ],
};
const DEPARTED = assertMap({ ...DEMO, approved: APPROVED });

const ROOT = '/Users/reader/My Repo';
const TOKEN = 'a1';

/** The thirty-one lines the demo's `pm/index.ts` holds, each saying which it is. */
const TEXT = `${Array.from({ length: 31 }, (_, at) => `// line ${String(at + 1)}`).join('\n')}\n`;
const SERVED: ServedSource = { path: INDEX, text: TEXT, at: DEMO.meta.head, root: ROOT, editor: DEFAULT_EDITOR };
const DIFF = ['diff --git a/libs/core/src/pm/index.ts b/libs/core/src/pm/index.ts', '--- a/libs/core/src/pm/index.ts', '+++ b/libs/core/src/pm/index.ts', '@@ -6,2 +6,4 @@ export', ' const kept = 1;', '-const gone = 2;', '+const came = 2;', '+const also = 3;', ''].join('\n');

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
  vi.unstubAllGlobals();
});

const all = (selector: string): readonly HTMLElement[] => [...host.querySelectorAll<HTMLElement>(selector)];

const element = (selector: string): HTMLElement => {
  const found = host.querySelector(selector);
  if (!(found instanceof HTMLElement)) throw new Error(`nothing matches ${selector}`);
  return found;
};

/** A strip of a file's lines, which is an SVG and so no `HTMLElement`. */
const svgAt = (selector: string): SVGElement => {
  const found = host.querySelector(selector);
  if (!(found instanceof SVGElement)) throw new Error(`nothing matches ${selector}`);
  return found;
};

const click = (selector: string): Promise<void> =>
  act(async () => {
    element(selector).dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

/** Move the pointer onto an element, or off it to the page. */
const over = (selector: string): Promise<void> =>
  act(async () => {
    element(selector).dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  });
const out = (selector: string): Promise<void> =>
  act(async () => {
    element(selector).dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }));
  });

/** Press a key on an element and say whether something marked it handled. */
const press = async (key: string, target: EventTarget, init: KeyboardEventInit = {}): Promise<boolean> => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  await act(async () => {
    target.dispatchEvent(event);
  });
  return event.defaultPrevented;
};

/** Let every answer a server gave arrive and the panel draw it. */
const settle = (): Promise<void> => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

/** Wait, a tick at a time, until something shows; each tick lets the panel draw what arrived in it. */
const until = async (shown: () => boolean, ticks = 2000): Promise<void> => {
  if (shown() || ticks === 0) return;
  await act(async () => new Promise((resolve) => setTimeout(resolve, 10)));
  await until(shown, ticks - 1);
};

/** The selection a target names in a map, which a test here always expects to be one. */
const pick = (map: MapJson, target: string): Selected => {
  const selected = selectedOf(map, target);
  if (selected === undefined) throw new Error(`the map holds no ${target}`);
  return selected;
};

const select = (nav: Nav, target: string, map: MapJson = DEMO): Promise<void> => act(async () => nav.select(pick(map, target), 'stay'));

type Drawn = { readonly nav: Nav; readonly registry: Registry; readonly asked: { readonly selected: (readonly [Selected | undefined, string])[]; readonly pointed: (string | undefined)[] } };

/** Draw the panel over a map on a line of its own, with a stand-in for the world that writes down what it is asked. */
const draw = async (map: MapJson = DEMO, served: { readonly token?: string; readonly pr?: string } = {}): Promise<Drawn> => {
  const nav = createNav();
  const registry = createRegistry();
  const asked: Drawn['asked'] = { selected: [], pointed: [] };
  nav.steer({ lookAt: vi.fn(), visit: vi.fn(), select: (selected, move) => asked.selected.push([selected, move]), point: (target) => asked.pointed.push(target) });
  await act(async () => root.render(<Inspector map={map} registry={registry} nav={nav} token={served.token} pr={served.pr} />));
  return { nav, registry, asked };
};

/** A server for the page's own fetch: each address it knows by its path, and every address it was asked for. Handed a gate, it answers nothing until the gate opens, so the state on the way is read too. */
const serve = (known: Readonly<Record<string, { readonly status: number; readonly body: unknown }>>, gate?: Promise<void>): string[] => {
  const asked: string[] = [];
  vi.stubGlobal('fetch', async (url: string) => {
    asked.push(url);
    await gate;
    const answer = known[url.slice(0, url.indexOf('?'))];
    return { ok: answer?.status === 200, status: answer?.status ?? 404, json: async () => answer?.body };
  });
  return asked;
};

/** A `#rrggbb` colour as the DOM reads it back. */
const rgb = (hex: string): string => `rgb(${[1, 3, 5].map((at) => String(Number.parseInt(hex.slice(at, at + 2), 16))).join(', ')})`;

const sections = (): readonly (string | null)[] => all('[data-inspector-section]').map((section) => section.getAttribute('data-inspector-section'));
const tabs = (): readonly (string | null)[] => all('[data-inspector-tab]').map((tab) => tab.getAttribute('data-inspector-tab'));
const fact = (label: string): HTMLElement => element(`[data-inspector-fact="${label}"]`);

test('with nothing selected the panel is one thin tab at the rail, which opens the map view and covers nothing unasked (D261 (map-tab))', async () => {
  const { nav } = await draw();
  const tab = element('[data-inspector="closed"]');
  expect(host.querySelector('aside')).toBeNull();
  expect(tab.textContent).toBe('map');
  expect(tab.style.position).toBe('fixed');
  expect(tab.style.right).toBe(`${String(RAIL_WIDTH)}px`);
  expect(tab.style.pointerEvents).toBe('auto');

  await click('[data-inspector="closed"]');
  const panel = element('aside[data-inspector="map"]');
  expect(panel.getAttribute('aria-label')).toBe('inspector');
  expect(host.querySelector('[data-inspector="closed"]')).toBeNull();
  // The structure's eight lists in their order, then the departures.
  expect(sections()).toEqual([...READING_ORDER, 'departures']);
  const reading = readingOf(DEMO);
  for (const list of reading.lists) {
    const section = element(`[data-inspector-section="${list.id}"]`);
    expect(section.querySelector('h4 span')?.textContent).toBe(list.title);
    expect(section.querySelectorAll('[data-inspector-row]')).toHaveLength(list.rows.length);
    for (const row of list.rows) expect(section.textContent).toContain(row.words);
  }
  // A path may break after each slash, so a long one wraps between its segments; its words read the same.
  const longest = element(`[data-inspector-section="largest-files"] [data-inspector-row="${DOCTOR}"]`);
  expect(longest.querySelectorAll('wbr')).toHaveLength(3);
  expect(longest.textContent).toBe(`${DOCTOR}212 lines`);
  // No shape was approved: the one muted line, and no row.
  const departures = element('[data-inspector-section="departures"]');
  expect(departures.querySelector('[data-inspector-muted]')?.textContent).toBe(NO_APPROVED_SHAPE);
  expect(departures.querySelectorAll('[data-inspector-row]')).toHaveLength(0);
  // Nothing is selected by opening it, and its close folds it back to the tab.
  expect(nav.selected()).toBeUndefined();
  await click('[data-inspector-close]');
  expect(host.querySelector('aside')).toBeNull();
  expect(element('[data-inspector="closed"]').textContent).toBe('map');
});

test('the map view lists every outside package with its hue, and says muted where no audit read one (D252 (packages-whole), C2)', async () => {
  await draw();
  await click('[data-inspector="closed"]');
  const packages = element('[data-inspector-section="outside-packages"]');
  const rows = [...packages.querySelectorAll<HTMLElement>('[data-inspector-row]')];
  // A package is no place on the map, so its row is no button.
  expect(rows.map((row) => row.tagName)).toEqual(['DIV', 'DIV', 'DIV']);
  expect(rows.map((row) => row.querySelector('[data-inspector-hue]')?.getAttribute('data-inspector-hue'))).toEqual(['change', 'unread', 'unread']);
  expect(rows[0]?.textContent).toContain('picomatch');
  expect(rows[0]?.textContent).toContain('2 files import it');
  expect(rows[0]?.textContent).toContain('added by this change');
  expect(rows[0]?.querySelector<HTMLElement>('[data-inspector-hue]')?.style.background).toBe('rgb(95, 216, 234)');
  expect(rows[1]?.querySelector('[data-inspector-muted]')?.textContent).toContain('no audit was read');
  // A list the map measured none for says so in the ink; the two never stand together.
  const past = element('[data-inspector-section="past-interface"]');
  expect(past.querySelectorAll('[data-inspector-row]').length + past.querySelectorAll('[data-inspector-none]').length).toBeGreaterThan(0);
  for (const section of all('[data-inspector-section]')) expect(section.querySelectorAll('[data-inspector-none]').length * section.querySelectorAll(':scope > p[data-inspector-muted]').length).toBe(0);
});

test("the panel's own looks are live through the registry: how many rows a ranked list shows, and the amber of a package a lesser advisory names (D156)", async () => {
  const [first, ...rest] = DEMO.weather.dependencies ?? [];
  if (first === undefined) throw new Error('the demo imports no outside package');
  // One package a moderate advisory names, which the scene's rule for a star marks amber (D170).
  const audited: MapJson = { ...DEMO, weather: { ...DEMO.weather, dependencies: [{ ...first, advisories: 1, severity: 'moderate' }, ...rest] } };
  const { registry } = await draw(audited);
  await click('[data-inspector="closed"]');
  const rowsOf = (id: string): number => element(`[data-inspector-section="${id}"]`).querySelectorAll('[data-inspector-row]').length;
  const amber = (): string | undefined => element('[data-inspector-section="outside-packages"]').querySelector<HTMLElement>('[data-inspector-hue="amber"]')?.style.background;
  expect(rowsOf('largest-files')).toBe(5);
  expect(amber()).toBe(rgb('#e9a93c'));
  act(() => registry.set('PANEL.readingRows', 2));
  expect(rowsOf('largest-files')).toBe(2);
  // The outside packages are listed whole whatever the rows (D252 (packages-whole)).
  expect(rowsOf('outside-packages')).toBe(3);
  act(() => registry.set('PANEL.amber', '#ffcc00'));
  expect(amber()).toBe(rgb('#ffcc00'));
});

test('the map view reads the same on a map no check was read for (D251 (reading-no-checks))', async () => {
  await draw(UNCHECKED);
  await click('[data-inspector="closed"]');
  expect(sections()).toEqual([...READING_ORDER, 'departures']);
  const bare = all('[data-inspector-section]').map((section) => section.textContent);
  act(() => root.unmount());
  root = createRoot(host);
  await draw();
  await click('[data-inspector="closed"]');
  expect(all('[data-inspector-section]').map((section) => section.textContent)).toEqual(bare);
});

test('a row that names a module or a file selects it and asks the world to fly there, and the panel turns to it (D209 (selection-line))', async () => {
  const { nav, asked } = await draw();
  await click('[data-inspector="closed"]');
  const row = `[data-inspector-section="largest-files"] [data-inspector-row="${DOCTOR}"]`;
  expect(element(row).tagName).toBe('BUTTON');
  await click(row);
  expect(nav.selected()).toEqual(pick(DEMO, DOCTOR));
  expect(asked.selected).toEqual([[pick(DEMO, DOCTOR), 'fly']]);
  expect(element('aside').getAttribute('data-inspector')).toBe('file');
  expect(element('aside').getAttribute('data-inspector-target')).toBe(DOCTOR);
  // A module's row does the same.
  await click('[data-inspector-close]');
  await click(`[data-inspector-section="largest-modules"] [data-inspector-row="${PM}"]`);
  expect(nav.selected()).toEqual({ kind: 'cell', cell: PM });
  expect(asked.selected.at(-1)).toEqual([{ kind: 'cell', cell: PM }, 'fly']);
  expect(element('aside').getAttribute('data-inspector')).toBe('module');
});

test('the pointer over a row points at what it names from the chrome, and a row is lit while either side points at it (D209 (selection-line))', async () => {
  const { nav, asked } = await draw();
  await click('[data-inspector="closed"]');
  const row = `[data-inspector-section="largest-files"] [data-inspector-row="${DOCTOR}"]`;
  await over(row);
  expect(nav.pointed()).toEqual({ target: DOCTOR, from: 'chrome' });
  expect(asked.pointed).toEqual([DOCTOR]);
  expect(element(row).hasAttribute('data-inspector-pointed')).toBe(true);
  expect(element(row).style.background).toBe('rgb(43, 51, 61)');
  await out(row);
  expect(nav.pointed()).toBeUndefined();
  expect(asked.pointed).toEqual([DOCTOR, undefined]);
  expect(element(row).hasAttribute('data-inspector-pointed')).toBe(false);

  // The pointer over the file on the map lights every row that names it, and the row's leaving does not take the world's pointing away.
  await act(async () => nav.point(DOCTOR, 'world'));
  expect(all(`[data-inspector-row="${DOCTOR}"][data-inspector-pointed]`).length).toBeGreaterThan(0);
  await out(row);
  expect(nav.pointed()).toEqual({ target: DOCTOR, from: 'world' });

  // Another panel's row took the chrome's pointing since: this one lets go of its own alone.
  await over(row);
  await act(async () => nav.point(TOOLS, 'chrome'));
  await out(row);
  expect(nav.pointed()).toEqual({ target: TOOLS, from: 'chrome' });
});

test('a row that goes while the pointer rests on it lets go of what it pointed at', async () => {
  const { nav } = await draw();
  await select(nav, PM);
  await click('[data-inspector-tab="files"]');
  const row = `[data-inspector-row="${SLOTS}"]`;
  await over(row);
  expect(nav.pointed()).toEqual({ target: SLOTS, from: 'chrome' });
  // The click turns the panel to the file, and the row is gone with no leave.
  await click(row);
  expect(host.querySelector(row)).toBeNull();
  expect(nav.pointed()).toBeUndefined();
  // The panel going lets go as well.
  await over('[data-inspector-step="folder:libs/core/src/pm"]');
  expect(nav.pointed()).toEqual({ target: PM, from: 'chrome' });
  act(() => root.unmount());
  expect(nav.pointed()).toBeUndefined();
  root = createRoot(host);
});

test('the departures from the approved shape are rows that select their module; a module that is gone is muted and selects nothing (D210 (approved-block))', async () => {
  const { nav, asked } = await draw(DEPARTED);
  await click('[data-inspector="closed"]');
  const departures = element('[data-inspector-section="departures"]');
  expect(departures.querySelector('[data-inspector-adds]')?.textContent).toBe('since approved a1b2c3d');
  const rows = [...departures.querySelectorAll<HTMLElement>('[data-inspector-row]')];
  expect(rows.map((row) => row.querySelector('[data-inspector-departure]')?.getAttribute('data-inspector-departure'))).toEqual(['dependency-added', 'files-grown', 'interface-widened', 'module-removed']);
  // An outside package and a module that is gone are no place to go; the gone one is written muted.
  expect(rows.map((row) => row.tagName)).toEqual(['DIV', 'BUTTON', 'BUTTON', 'DIV']);
  expect(rows.map((row) => row.hasAttribute('data-inspector-muted'))).toEqual([false, false, false, true]);
  expect(rows[3]?.style.color).toBe('rgb(107, 116, 128)');
  expect(rows[1]?.textContent).toContain('more files · libs/core/src/pm');
  expect(rows[1]?.textContent).toContain('3 → 4');
  expect(rows[2]?.textContent).toContain('its interface exports more · resolveTool');
  await act(async () => rows[1]?.click());
  expect(nav.selected()).toEqual({ kind: 'cell', cell: PM });
  expect(asked.selected).toEqual([[{ kind: 'cell', cell: PM }, 'fly']]);
  // The module shows the departures about itself, and a module that kept its shape says so.
  const own = element('[data-inspector-section="departures"]');
  expect([...own.querySelectorAll('[data-inspector-departure]')].map((row) => row.getAttribute('data-inspector-departure'))).toEqual(['files-grown', 'interface-widened']);
  await select(nav, 'package:apps/cli', DEPARTED);
  expect(element('[data-inspector-section="departures"] [data-inspector-none]').textContent).toBe('none: the package keeps its approved shape');
  // The package that holds the module that grew shows its departures too, and does not say it keeps its shape (D270 (departures-by-contour)).
  await select(nav, CORE, DEPARTED);
  const held = element('[data-inspector-section="departures"]');
  expect([...held.querySelectorAll('[data-inspector-departure]')].map((row) => row.getAttribute('data-inspector-departure'))).toEqual(['files-grown', 'interface-widened']);
  expect(held.querySelector('[data-inspector-none]')).toBeNull();
  await click(`[data-inspector-section="departures"] [data-inspector-row="${PM}"]`);
  expect(nav.selected()).toEqual({ kind: 'cell', cell: PM });
});

test('a package that is gone and the loose files that went with it are two rows at one path, told apart (D218 (departure-cell), D255 (loose-files))', async () => {
  const why = 'the approved shape held it and the map does not';
  const pair = assertMap({
    ...DEMO,
    approved: {
      at: DEMO.meta.head,
      departures: [
        { kind: 'module-removed', target: 'libs/gone', cell: 'directory:libs/gone', why },
        { kind: 'module-removed', target: 'libs/gone', cell: 'package:libs/gone', why },
      ],
    },
  });
  // React says so on the console where two rows share a key.
  const said = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  await draw(pair);
  await click('[data-inspector="closed"]');
  const rows = all('[data-inspector-section="departures"] [data-inspector-row]');
  expect(rows.map((row) => row.querySelector('[data-inspector-departure]')?.textContent)).toEqual(['module removed · libs/gone · loose files', 'module removed · libs/gone']);
  expect(rows.map((row) => row.querySelector('[data-inspector-departure]')?.hasAttribute('data-inspector-loose'))).toEqual([true, false]);
  expect(rows.every((row) => row.tagName === 'DIV' && row.hasAttribute('data-inspector-muted'))).toBe(true);
  expect(said).not.toHaveBeenCalled();
  said.mockRestore();
});

test('a map that keeps its approved shape says so, which is not the muted line of a map with none', async () => {
  await draw(assertMap({ ...DEMO, approved: { at: 'working-tree', departures: [] } }));
  await click('[data-inspector="closed"]');
  const departures = element('[data-inspector-section="departures"]');
  expect(departures.querySelector('[data-inspector-adds]')?.textContent).toBe('since approved working tree');
  expect(departures.querySelector('[data-inspector-none]')?.textContent).toBe('none: the map keeps its approved shape');
  expect(departures.querySelector('[data-inspector-muted]')).toBeNull();
});

test("a module's head is the way down to it, each step a button, with a fly to; its tabs are facts, files, exports and wiring", async () => {
  const { nav, asked } = await draw();
  await select(nav, PM);
  const panel = element('aside[data-inspector="module"]');
  expect(panel.getAttribute('data-inspector-target')).toBe(PM);
  expect(element('[data-inspector-trail]').textContent).toBe('map › libs/core › src/pm');
  expect(all('[data-inspector-step]').map((step) => [step.tagName, step.getAttribute('data-inspector-step')])).toEqual([
    ['BUTTON', 'map'],
    ['BUTTON', CORE],
    ['BUTTON', PM],
  ]);
  expect(element('[data-inspector-title]').textContent).toBe('module · libs/core/src/pm');
  expect(tabs()).toEqual(['facts', 'files', 'exports', 'wiring']);
  expect(element('[data-inspector-tab="facts"]').getAttribute('aria-selected')).toBe('true');
  // The facts are the model's, label for label.
  const model = inspect(DEMO, pick(DEMO, PM));
  if (model.kind !== 'module') throw new Error('the demo holds the module');
  expect(all('[data-inspector-facts] dt').map((label) => label.textContent)).toEqual(model.facts.map((each) => each.label));
  expect(fact('files').textContent).toBe('3 · 1 deleted by the change');
  expect(fact('through the interface').textContent).toBe('2');
  expect(fact('through the interface').hasAttribute('data-inspector-muted')).toBe(false);
  // The notices on it and on its files, each its numbered box.
  expect(all('[data-inspector-section="notices"] [data-inspector-notice]').map((notice) => notice.getAttribute('data-inspector-notice'))).toEqual(model.notices.map((notice) => String(notice.rank)));
  expect(element('[data-inspector-notice="1"] [data-mark]').style.background).toBe('rgb(240, 84, 106)');

  // The fly to asks the world again for the selection it already holds.
  await click('[data-inspector-fly]');
  expect(asked.selected).toEqual([
    [{ kind: 'cell', cell: PM }, 'stay'],
    [{ kind: 'cell', cell: PM }, 'fly'],
  ]);
  // A step up selects the package that holds it, which lists the modules it holds, each a row.
  await click(`[data-inspector-step="${CORE}"]`);
  expect(nav.selected()).toEqual({ kind: 'cell', cell: CORE });
  expect(element('[data-inspector-title]').textContent).toBe('package · libs/core');
  expect(fact('files').textContent).toBe('6 · 1 its own, 5 in 2 modules it holds · 1 deleted by the change');
  expect(all('[data-inspector-section="holds"] [data-inspector-row]').map((row) => row.getAttribute('data-inspector-row'))).toEqual([UTIL, PM]);
  await click(`[data-inspector-section="holds"] [data-inspector-row="${UTIL}"]`);
  expect(nav.selected()).toEqual({ kind: 'cell', cell: UTIL });
  // The map's step clears the selection and shows the map view.
  await click('[data-inspector-step="map"]');
  expect(nav.selected()).toBeUndefined();
  expect(element('aside').getAttribute('data-inspector')).toBe('map');
});

test('a fact the map did not measure is the dash and its reason in the muted ink, never a number (C2)', async () => {
  const { nav } = await draw();
  await select(nav, UTIL);
  for (const label of ['through the interface', 'past the interface']) {
    const muted = fact(label);
    expect(muted.hasAttribute('data-inspector-muted')).toBe(true);
    expect(muted.textContent).toBe(`${MUTED_DASH} a directory has no interface file to go through or past`);
    expect(muted.textContent).not.toMatch(/\d/);
    expect(muted.style.color).toBe('rgb(107, 116, 128)');
  }
  expect(fact('fan in').textContent).toBe('2');
  expect(fact('fan in').style.color).toBe('rgb(230, 237, 243)');
  // On a map no check was read for, what only a check measures is muted on a file too.
  act(() => root.unmount());
  root = createRoot(host);
  const bare = await draw(UNCHECKED);
  await select(bare.nav, TOOLS, UNCHECKED);
  expect(fact('rules broken').textContent).toBe(`${MUTED_DASH} no .check/ was trusted: no .check/`);
  expect(fact('untested lines').textContent).toBe(`${MUTED_DASH} no coverage report was read`);
  expect(fact('mutants').hasAttribute('data-inspector-muted')).toBe(true);
});

test("a module's files tab lists each file with what the change did to it and the notices on it, and a row selects its file", async () => {
  const { nav, asked } = await draw();
  await select(nav, PM);
  await click('[data-inspector-tab="files"]');
  expect(element('[data-inspector-tab="files"]').getAttribute('aria-selected')).toBe('true');
  expect(element('[data-inspector-section="files"] [data-inspector-adds]').textContent).toBe('4');
  const rows = all('[data-inspector-section="files"] [data-inspector-row]');
  expect(rows.map((row) => row.getAttribute('data-inspector-row'))).toEqual([INDEX, LEGACY, SLOTS, TOOLS]);
  expect(rows.map((row) => row.querySelector('[data-inspector-change]')?.textContent)).toEqual(['modified', 'deleted', undefined, 'added']);
  expect(element(`[data-inspector-row="${TOOLS}"] [data-inspector-change]`).style.color).toBe('rgb(95, 216, 234)');
  expect(element(`[data-inspector-row="${TOOLS}"]`).textContent).toBe('+tools.tsadded696 lines');
  expect([...element(`[data-inspector-row="${INDEX}"]`).querySelectorAll('[data-mark]')].map((box) => box.textContent)).toEqual(['1', '2', '3', '4']);
  await click(`[data-inspector-row="${TOOLS}"]`);
  expect(nav.selected()).toEqual(pick(DEMO, TOOLS));
  expect(asked.selected.at(-1)).toEqual([pick(DEMO, TOOLS), 'fly']);
  expect(element('[data-inspector-trail]').textContent).toBe('map › libs/core › src/pm › +tools.ts');
  expect(element('[data-inspector-title]').textContent).toBe(`file · +${TOOLS}`);
});

test("a module's exports tab writes the names the reach crossed its membrane by in the ink and the rest muted, with the files each reached (D181)", async () => {
  const { nav } = await draw();
  await select(nav, CORE);
  await click('[data-inspector-tab="exports"]');
  expect(element('[data-inspector-section="exports"] [data-inspector-adds]').textContent).toBe('3');
  expect(all('[data-inspector-export]').map((row) => row.getAttribute('data-inspector-export'))).toEqual(['legacyResolve', 'listSlots', 'resolveSlot']);
  expect(all('[data-inspector-export][data-inspector-lit]').map((row) => row.getAttribute('data-inspector-export'))).toEqual(['resolveSlot']);
  expect(all('[data-inspector-export] > div').map((name) => name.style.color)).toEqual([CHROME_MUTED, CHROME_MUTED, CHROME_INK].map(rgb));
  // A file the reach was carried to is a row of its own, which selects it.
  expect(all('[data-inspector-export] [data-inspector-row]').map((reached) => reached.textContent)).toEqual([`reached ${DOCTOR}`]);
  await click(`[data-inspector-export="resolveSlot"] [data-inspector-row="${DOCTOR}"]`);
  expect(nav.selected()).toEqual(pick(DEMO, DOCTOR));
  // Every name of the module beside it carried the reach somewhere.
  await select(nav, PM);
  expect(all('[data-inspector-export][data-inspector-lit]').map((row) => row.getAttribute('data-inspector-export'))).toEqual(['listSlots', 'resolveSlot', 'resolveTool']);
  expect(all('[data-inspector-export="resolveSlot"] [data-inspector-row]').map((reached) => reached.getAttribute('data-inspector-row'))).toEqual([DOCTOR, 'libs/core/src/index.ts']);
  // A module whose interface the head scan did not read says so, muted.
  const cells = DEMO.terrain.cells.map(({ exports: names, ...cell }) => (cell.id === PM ? cell : { ...cell, ...(names === undefined ? {} : { exports: names }) }));
  const map: MapJson = { ...DEMO, terrain: { ...DEMO.terrain, cells } };
  act(() => root.unmount());
  root = createRoot(host);
  const bare = await draw(map);
  await select(bare.nav, PM, map);
  await click('[data-inspector-tab="exports"]');
  expect(element('[data-inspector-section="exports"] [data-inspector-muted]').textContent).toBe('the head scan read no interface file of it, so its names are not known');
  expect(all('[data-inspector-export]')).toHaveLength(0);
});

test("a module's wiring tab hosts its plate in the panel, with no cell open in the world (D260 (wiring-hosted))", async () => {
  const { nav, registry } = await draw();
  await select(nav, PM);
  await click('[data-inspector-tab="wiring"]');
  expect(element('[data-inspector-body="wiring"]').textContent).toBe('laying out the wiring');
  // The scene's own layout lays it, which loads elk the first time and may take a while on a busy machine.
  await until(() => host.querySelector('[data-wiring-hosted]') !== null);
  const plate = element(`[data-inspector-body="wiring"] [data-wiring="${PM}"]`);
  expect(nav.opened()).toBeUndefined();
  expect(plate.style.position).toBe('');
  // It is given the panel's width less its pads and its rule, and follows the token.
  expect(plate.style.width).toBe('399px');
  act(() => registry.set('PANEL.inspectorWidth', 520));
  expect(element(`[data-wiring="${PM}"]`).style.width).toBe('499px');
  expect(all('[data-wiring-file]')).toHaveLength(7);
}, 30_000);

test("a file's tabs are facts, diff where the change touched it, and code; its facts carry what the change did and the notices on it", async () => {
  const { nav } = await draw();
  await select(nav, TOOLS);
  expect(element('aside').getAttribute('data-inspector')).toBe('file');
  expect(tabs()).toEqual(['facts', 'diff', 'code']);
  const model = inspect(DEMO, pick(DEMO, TOOLS));
  if (model.kind !== 'file') throw new Error('the demo holds the file');
  expect(all('[data-inspector-body="facts"] > [data-inspector-facts] dt').map((label) => label.textContent)).toEqual(model.facts.map((each) => each.label));
  expect(fact('lines').textContent).toBe('96');
  expect(fact('change').textContent).toBe('added · +96 −0');
  const change = element('[data-inspector-section="change"]');
  expect(change.querySelector('[data-inspector-adds]')?.textContent).toBe('+96 −0');
  expect(fact('changed').textContent).toBe('lines 1-96');
  expect([...change.querySelectorAll('dt')].map((label) => label.textContent)).toEqual(['changed', 'untested lines', 'mutants']);
  expect(all('[data-inspector-notice]').map((notice) => notice.getAttribute('data-inspector-notice'))).toEqual(['6']);

  // A file the change did not touch has no diff to show; held on the diff tab, the panel shows its facts.
  await click('[data-inspector-tab="diff"]');
  expect(host.querySelector('[data-inspector-body="diff"]')).not.toBeNull();
  await select(nav, SLOTS);
  expect(tabs()).toEqual(['facts', 'code']);
  expect(host.querySelector('[data-inspector-body="facts"]')).not.toBeNull();
  expect(host.querySelector('[data-inspector-section="change"]')).toBeNull();
  expect(fact('change').textContent).toBe('unchanged');
  // Back on a changed file the diff tab it was left on shows again.
  await select(nav, DOCTOR);
  expect(host.querySelector('[data-inspector-body="diff"]')).not.toBeNull();
});

test("a file's untested lines are written as runs, a list measured empty says none, and what the lines stand on is said beneath", async () => {
  const { nav } = await draw();
  await select(nav, DOCTOR);
  expect(fact('changed').textContent).toBe('lines 31-58, lines 150-217');
  expect(fact('untested lines').textContent).toBe('31-58, 150-217');
  expect(fact('untested lines').hasAttribute('data-inspector-muted')).toBe(false);
  // No mutant on its changed lines is a measured none, in the ink, and not a muted dash.
  expect(fact('mutants').textContent).toBe('none');
  expect(fact('mutants').hasAttribute('data-inspector-muted')).toBe(false);
  expect(element('[data-inspector-section="change"] [data-inspector-note]').textContent).toBe('no coverage report names the file, so every changed line counts as untested');
});

test("a file's functions rest behind a toggle that is off: on, each is its name, where it starts, its size and the thresholds it breaks", async () => {
  const { nav, registry } = await draw();
  await select(nav, TOOLS);
  const toggle = element('[data-inspector-functions]');
  expect(toggle.getAttribute('data-inspector-functions')).toBe('off');
  expect(toggle.getAttribute('aria-pressed')).toBe('false');
  expect(host.querySelector('[data-inspector-functions-list]')).toBeNull();

  await click('[data-inspector-functions]');
  expect(element('[data-inspector-functions]').getAttribute('data-inspector-functions')).toBe('on');
  expect(element('[data-inspector-functions]').getAttribute('aria-pressed')).toBe('true');
  const list = element('[data-inspector-functions-list]');
  expect(list.querySelector('[data-inspector-adds]')?.textContent).toBe('3');
  // The list takes at most its share of the panel's height before it scrolls, live through the registry.
  expect(list.style.maxHeight).toBe('40%');
  act(() => registry.set('PANEL.functionsShare', '60%'));
  expect(element('[data-inspector-functions-list]').style.maxHeight).toBe('60%');
  expect([...list.querySelectorAll('[data-inspector-function]')].map((fn) => fn.textContent)).toEqual(['localBin', 'resolveTool', 'toolName']);
  expect([...list.querySelectorAll('[data-inspector-row]')].map((row) => row.textContent)).toEqual(['localBinbreaks no thresholdline 4 · 30 lines', 'resolveToolbreaks crap, cyclomaticline 41 · 38 lines', 'toolNamebreaks no thresholdline 82 · 10 lines']);
  // A breach is in the ink, and none is muted.
  expect([...list.querySelectorAll<HTMLElement>('[data-inspector-breaches]')].map((breach) => breach.style.color)).toEqual(['rgb(107, 116, 128)', 'rgb(230, 237, 243)', 'rgb(107, 116, 128)']);
  // A fixture has no server, so no row links into an editor.
  expect(list.querySelectorAll('a')).toHaveLength(0);
  // The functions stand beneath whichever tab is shown, and stay on from file to file.
  await click('[data-inspector-tab="code"]');
  expect(host.querySelector('[data-inspector-functions-list]')).not.toBeNull();
  await select(nav, SLOTS);
  expect(all('[data-inspector-function]').map((fn) => fn.textContent)).toEqual(['slotOf', 'orderSlots']);
  // A file whose functions the head scan did not read says why, muted, and lists none.
  await select(nav, LEGACY);
  expect(element('[data-inspector-functions-list] [data-inspector-muted]').textContent).toBe('a deleted file has no functions at head');
  expect(all('[data-inspector-function]')).toHaveLength(0);
  await click('[data-inspector-functions]');
  expect(host.querySelector('[data-inspector-functions-list]')).toBeNull();
});

test('where no health report was read a function says so, muted, and not that it breaks nothing (C2)', async () => {
  const organelles = UNCHECKED.terrain.organelles.map((file) => (file.functions === undefined ? file : { ...file, functions: file.functions.map(({ breaches: _breaches, ...fn }) => fn) }));
  const map: MapJson = { ...UNCHECKED, terrain: { ...UNCHECKED.terrain, organelles } };
  const { nav } = await draw(map);
  await select(nav, TOOLS, map);
  await click('[data-inspector-functions]');
  expect(all('[data-inspector-breaches]').map((breach) => breach.textContent)).toEqual(Array.from({ length: 3 }, () => `${MUTED_DASH} no health report was read`));
});

test("on a fixture the diff tab shows the hunks' line ranges and says why there is no more, and the code tab says it has no server and shows no empty box", async () => {
  const asked = serve({});
  const { nav } = await draw();
  await select(nav, INDEX);
  await click('[data-inspector-tab="diff"]');
  expect(element('[data-inspector-diff-note]').textContent).toBe("no server reads git for a fixture, so the hunks' line ranges alone");
  expect(all('[data-inspector-ranges] li').map((range) => range.textContent)).toEqual(['lines 6-9', 'lines 19-32']);
  expect(host.querySelector('[data-inspector-diff]')).toBeNull();

  await click('[data-inspector-tab="code"]');
  const body = element('[data-inspector-body="code"]');
  expect(element('[data-inspector-code-note]').getAttribute('data-inspector-code-note')).toBe('unserved');
  expect(body.textContent).toBe("no server reads a fixture's files, so no code");
  expect(body.children).toHaveLength(1);
  expect(host.querySelector('[data-inspector-code]')).toBeNull();
  // Nothing was asked of any server.
  await settle();
  expect(asked).toEqual([]);
});

test('served, the code tab shows the text a row to a line, the changed lines marked from the hunks, and a function start linked to the editor (D211 (file-text))', async () => {
  const gate = Promise.withResolvers<void>();
  const asked = serve({ [`/file/${INDEX}`]: { status: 200, body: SERVED } }, gate.promise);
  const { nav, registry } = await draw(DEMO, { token: TOKEN });
  await select(nav, INDEX);
  expect(asked).toEqual([]);
  await click('[data-inspector-tab="code"]');
  // The request is on its way, and the tab says so.
  expect(asked).toEqual([`/file/${INDEX}?token=${TOKEN}`]);
  expect(element('[data-inspector-code-note]').textContent).toBe('reading the file');
  gate.resolve();
  await settle();
  expect(host.querySelector('[data-inspector-code-note]')).toBeNull();
  expect(element('[data-inspector-code-head]').textContent).toBe('read at a1b2c3d · 31 lines · 5 untestedopen in the editor');
  expect(element('[data-inspector-code-head] [data-inspector-editor]').getAttribute('href')).toBe(editorLink(DEFAULT_EDITOR, { root: ROOT, path: INDEX, line: 1 }));

  const sheet = element(`[data-inspector-code="${INDEX}"]`);
  const lines = [...sheet.querySelectorAll<HTMLElement>('[data-inspector-line]')];
  expect(lines.map((line) => line.getAttribute('data-inspector-line'))).toEqual(Array.from({ length: 31 }, (_, at) => String(at + 1)));
  expect(lines[5]?.textContent).toBe('6// line 6');
  // The changed lines no test ran are 8, 9, 25, 28 and 31: each carries a bar beside its number, and no other line a mark (D348 (line-strip)).
  expect(lines.filter((line) => line.hasAttribute('data-inspector-untested')).map((line) => Number(line.getAttribute('data-inspector-line')))).toEqual([8, 9, 25, 28, 31]);
  expect(lines[7]?.textContent).toBe('8▌// line 8');
  expect(lines.filter((line) => line.hasAttribute('data-inspector-mutant'))).toEqual([]);
  // Down the sheet's side runs the file's strip, to its scale: the two functions, the two hunks, and the untested lines as three runs.
  const strip = svgAt('[data-inspector-body="code"] [data-strip="down"]');
  expect(strip.getAttribute('viewBox')).toBe('0 0 1 31');
  expect([...strip.querySelectorAll('[data-strip-function]')].map((mark) => mark.getAttribute('data-strip-function'))).toEqual(['resolveSlot', 'listSlots']);
  expect([...strip.querySelectorAll('[data-strip-changed]')].map((mark) => [mark.getAttribute('y'), mark.getAttribute('height')])).toEqual([
    ['5', '4'],
    ['18', '13'],
  ]);
  expect([...strip.querySelectorAll('[data-strip-untested]')].map((mark) => [mark.getAttribute('y'), mark.getAttribute('height')])).toEqual([
    ['7', '2'],
    ['24', '1'],
    ['27', '1'],
    ['30', '1'],
  ]);
  // The hunks are lines 6-9 and 19-32: those lines are marked down their edge in the change hue and no other.
  const changed = lines.filter((line) => line.hasAttribute('data-inspector-changed')).map((line) => Number(line.getAttribute('data-inspector-line')));
  expect(changed).toEqual([6, 7, 8, 9, ...Array.from({ length: 13 }, (_, at) => 19 + at)]);
  expect(lines[5]?.style.borderLeft).toBe('2px solid rgb(95, 216, 234)');
  expect(lines[0]?.style.borderLeft).toBe('2px solid transparent');
  // The two functions start on lines 6 and 28: each number there opens the file at it in the editor.
  expect(lines.filter((line) => line.hasAttribute('data-inspector-function')).map((line) => [line.getAttribute('data-inspector-line'), line.getAttribute('data-inspector-function')])).toEqual([
    ['6', 'resolveSlot'],
    ['28', 'listSlots'],
  ]);
  expect(element('[data-inspector-function-link="listSlots"]').getAttribute('href')).toBe(editorLink(DEFAULT_EDITOR, { root: ROOT, path: INDEX, line: 28 }));
  expect(sheet.querySelectorAll('a')).toHaveLength(2);
  // An editor's link is handed to the editor, never opened as a page.
  expect(element('[data-inspector-function-link="listSlots"]').hasAttribute('target')).toBe(false);
  // Plain monospace at the code's size, live through the registry.
  expect(sheet.style.fontSize).toBe('11px');
  expect(sheet.style.whiteSpace).toBe('pre');
  act(() => registry.set('PANEL.codeSize', 14));
  expect(element(`[data-inspector-code="${INDEX}"]`).style.fontSize).toBe('14px');
  expect(element(`[data-inspector-code="${INDEX}"]`).style.lineHeight).toBe('1.45');
  act(() => registry.set('PANEL.codeLeading', 1.8));
  expect(element(`[data-inspector-code="${INDEX}"]`).style.lineHeight).toBe('1.8');

  // The functions' rows link into the editor once the text's answer carries the template.
  await click('[data-inspector-functions]');
  expect(element('[data-inspector-editor="resolveSlot"]').getAttribute('href')).toBe(editorLink(DEFAULT_EDITOR, { root: ROOT, path: INDEX, line: 6 }));
  // The text was asked for once, and coming back to the file asks no more.
  await select(nav, SLOTS);
  await settle();
  await select(nav, INDEX);
  expect(asked.filter((url) => url.startsWith(`/file/${INDEX}`))).toHaveLength(1);
  expect(host.querySelector(`[data-inspector-code="${INDEX}"]`)).not.toBeNull();
});

test('a map a watch pushed leaves the sheets of code and diff where they are, with their scroll and the focus, while their text is read again (D335 (answer-stands))', async () => {
  const edited: ServedSource = { ...SERVED, text: `${TEXT}// line 32\n` };
  let text = SERVED;
  const asked: string[] = [];
  // The first map's answers come at once; a pushed map's wait to be let go.
  let hold: { readonly promise: Promise<void>; readonly resolve: () => void } | undefined;
  vi.stubGlobal('fetch', async (url: string) => {
    asked.push(url);
    await hold?.promise;
    return url.startsWith('/diff/') ? { ok: true, status: 200, json: async () => ({ path: INDEX, diff: DIFF, root: ROOT, editor: DEFAULT_EDITOR }) } : { ok: true, status: 200, json: async () => text };
  });
  const { nav, registry } = await draw(DEMO, { token: TOKEN });
  await select(nav, INDEX);
  await click('[data-inspector-tab="diff"]');
  await click('[data-inspector-tab="code"]');
  await settle();
  const sheet = element(`[data-inspector-code="${INDEX}"]`);
  sheet.scrollTop = 120;
  act(() => sheet.focus());
  expect(document.activeElement).toBe(sheet);

  // The watch pushes a map over the same ground: another object, so the text is asked for again, and the sheet is the one the reader was in.
  text = edited;
  hold = Promise.withResolvers<void>();
  const pushed: MapJson = { ...DEMO };
  await act(async () => root.render(<Inspector map={pushed} registry={registry} nav={nav} token={TOKEN} />));
  expect(asked.filter((url) => url.startsWith(`/file/${INDEX}`))).toHaveLength(2);
  expect(host.querySelector('[data-inspector-code-note]')).toBeNull();
  expect(element(`[data-inspector-code="${INDEX}"]`)).toBe(sheet);
  expect(sheet.scrollTop).toBe(120);
  expect(document.activeElement).toBe(sheet);
  expect(all(`[data-inspector-code="${INDEX}"] [data-inspector-line]`)).toHaveLength(31);

  // The fresh text lands in the same sheet.
  hold.resolve();
  await settle();
  expect(element(`[data-inspector-code="${INDEX}"]`)).toBe(sheet);
  expect(all(`[data-inspector-code="${INDEX}"] [data-inspector-line]`)).toHaveLength(32);
  expect(sheet.scrollTop).toBe(120);
  expect(document.activeElement).toBe(sheet);

  // The diff's sheet stands the same way while its own answer is read again.
  await click('[data-inspector-tab="diff"]');
  const diff = element(`[data-inspector-diff="${INDEX}"]`);
  hold = Promise.withResolvers<void>();
  await act(async () => root.render(<Inspector map={{ ...DEMO }} registry={registry} nav={nav} token={TOKEN} />));
  expect(host.querySelector('[data-inspector-diff-note]')).toBeNull();
  expect(element(`[data-inspector-diff="${INDEX}"]`)).toBe(diff);
  hold.resolve();
  await settle();
  expect(element(`[data-inspector-diff="${INDEX}"]`)).toBe(diff);
});

test("a text read at another commit than the map's is shown bare, with why: no changed line and no function is marked on it (D271 (marks-of-own-commit))", async () => {
  serve({ [`/file/${INDEX}`]: { status: 200, body: SERVED } });
  // A frame the scrubber stands at: the map is of an earlier commit, and the server still reads the head it holds.
  const frame: MapJson = { ...DEMO, meta: { ...DEMO.meta, head: `9f8e7d6${'0'.repeat(33)}` } };
  const { nav, registry } = await draw(frame, { token: TOKEN });
  await select(nav, INDEX, frame);
  await click('[data-inspector-tab="code"]');
  await settle();
  expect(element('[data-inspector-code-head]').textContent).toBe('read at a1b2c3d · 31 linesopen in the editor');
  expect(element('[data-inspector-code-apart]').textContent).toBe("the text is not of this map's commit, 9f8e7d6, so no changed line and no function is marked on it");
  expect(element('[data-inspector-code-apart]').style.color).toBe(rgb(CHROME_MUTED));
  // The text is all there, and nothing of the other commit is drawn on it.
  expect(all(`[data-inspector-code="${INDEX}"] [data-inspector-line]`)).toHaveLength(31);
  expect(all('[data-inspector-changed], [data-inspector-cut], [data-inspector-line][data-inspector-function]')).toHaveLength(0);
  expect(all(`[data-inspector-code="${INDEX}"] a`)).toHaveLength(0);

  // A map of the working tree names no commit to hold the text to, and the text is marked as it comes.
  const tree: MapJson = { ...DEMO, meta: { ...DEMO.meta, head: 'working-tree' } };
  await act(async () => root.render(<Inspector map={tree} registry={registry} nav={nav} token={TOKEN} />));
  await settle();
  expect(host.querySelector('[data-inspector-code-apart]')).toBeNull();
  expect(all('[data-inspector-changed]')).toHaveLength(17);
  expect(all('[data-inspector-line][data-inspector-function]')).toHaveLength(2);
});

test('an answer that is not the text says what it is, and a file the change deleted is never asked for', async () => {
  const asked = serve({ [`/file/${SLOTS}`]: { status: 413, body: { error: 'too large' } }, [`/file/${TOOLS}`]: { status: 200, body: { ...SERVED, path: TOOLS, text: '' } } });
  const { nav } = await draw(DEMO, { token: TOKEN });
  await select(nav, SLOTS);
  await click('[data-inspector-tab="code"]');
  await settle();
  expect(element('[data-inspector-code-note]').getAttribute('data-inspector-code-note')).toBe('large');
  expect(element('[data-inspector-body="code"]').textContent).toBe('the file is larger than the server reads');
  // A path the server does not answer for.
  await select(nav, DOCTOR);
  await settle();
  expect(element('[data-inspector-code-note]').getAttribute('data-inspector-code-note')).toBe('absent');
  // A file with no text says it is empty and draws no sheet.
  await select(nav, TOOLS);
  await settle();
  expect(element('[data-inspector-code-note]').textContent).toBe('the file is empty');
  expect(host.querySelector('[data-inspector-code]')).toBeNull();
  // A deleted file has no text at the head: said, and not asked for, with its functions on too.
  await click('[data-inspector-functions]');
  await select(nav, LEGACY);
  await settle();
  expect(element('[data-inspector-body="code"]').textContent).toBe('the change deleted the file, so it has no text at the head');
  expect(asked.some((url) => url.includes('legacy.ts'))).toBe(false);
});

test('served, the diff tab shows the diff a row to a line, each hunk a link to its line, with the links to the editor and the PR', async () => {
  const gate = Promise.withResolvers<void>();
  const asked = serve({ [`/diff/${INDEX}`]: { status: 200, body: { path: INDEX, diff: DIFF, root: ROOT, editor: DEFAULT_EDITOR } } }, gate.promise);
  const { nav, registry } = await draw(DEMO, { token: TOKEN, pr: 'https://example.com/pr/7' });
  await select(nav, INDEX);
  await click('[data-inspector-tab="diff"]');
  expect(asked).toEqual([`/diff/${INDEX}?token=${TOKEN}`]);
  expect(element('[data-inspector-diff-note]').textContent).toBe('reading the diff');
  // On its way, the hunks' ranges stand in from the map.
  expect(all('[data-inspector-ranges] li').map((range) => range.textContent)).toEqual(['lines 6-9', 'lines 19-32']);
  gate.resolve();
  await settle();
  const sheet = element(`[data-inspector-diff="${INDEX}"]`);
  const rows = [...sheet.querySelectorAll<HTMLElement>('[data-inspector-diff-row]')];
  expect(rows.map((row) => row.getAttribute('data-inspector-diff-row'))).toEqual(['hunk', 'context', 'deleted', 'added', 'added']);
  expect(rows.map((row) => row.getAttribute('data-inspector-line'))).toEqual(['6', '6', null, '7', '8']);
  expect(rows[0]?.querySelector('a')?.getAttribute('href')).toBe(editorLink(DEFAULT_EDITOR, { root: ROOT, path: INDEX, line: 6 }));
  expect(rows[3]?.textContent).toBe('7+const came = 2;');
  expect(rows[2]?.textContent).toBe('-const gone = 2;');
  // Hue is state: an added line in the change hue, a deleted one muted, a kept one in the ink.
  expect(rows.map((row) => row.style.color)).toEqual([CHROME_MUTED, CHROME_INK, CHROME_MUTED, CHANGE_HUE, CHANGE_HUE].map(rgb));
  expect(element('[data-inspector-diff-head] [data-inspector-editor]').getAttribute('href')).toBe(editorLink(DEFAULT_EDITOR, { root: ROOT, path: INDEX, line: 6 }));
  const pr = element('[data-inspector-diff-head] [data-inspector-pr]');
  expect(pr.getAttribute('href')).toBe('https://example.com/pr/7');
  expect(pr.getAttribute('target')).toBe('_blank');
  expect(pr.getAttribute('rel')).toBe('noreferrer');
  expect(sheet.style.fontSize).toBe('11px');
  act(() => registry.set('PANEL.codeSize', 9));
  expect(element(`[data-inspector-diff="${INDEX}"]`).style.fontSize).toBe('9px');
});

test('while the focus is inside the panel Escape clears the selection, and with none folds the map view away (D262 (panel-keys))', async () => {
  const { nav } = await draw();
  await select(nav, PM);
  const tab = element('[data-inspector-tab="files"]');
  tab.focus();
  expect(await press('Escape', tab)).toBe(true);
  expect(nav.selected()).toBeUndefined();
  expect(element('[data-inspector="closed"]').textContent).toBe('map');

  await click('[data-inspector="closed"]');
  const panel = element('aside');
  panel.focus();
  expect(document.activeElement).toBe(panel);
  expect(await press('Escape', panel)).toBe(true);
  expect(host.querySelector('aside')).toBeNull();
  // Closed, the tab takes no key: Escape there is the world's to read.
  expect(await press('Escape', element('[data-inspector="closed"]'))).toBe(false);
});

/** Something that takes a key before the panel reads it. */
const taken = (event: KeyboardEvent): void => event.preventDefault();

test('a key pressed outside the panel is not its own, nor is one held with a modifier or one already taken', async () => {
  const { nav } = await draw();
  await select(nav, PM);
  expect(await press('Escape', document.body)).toBe(false);
  expect(await press('Enter', document.body)).toBe(false);
  expect(await press('ArrowDown', document.body)).toBe(false);
  expect(nav.selected()).toEqual({ kind: 'cell', cell: PM });
  const panel = element('aside');
  expect(await press('ArrowDown', panel, { ctrlKey: true })).toBe(false);
  expect(await press('Escape', panel, { metaKey: true })).toBe(false);
  expect(await press('x', panel)).toBe(false);
  expect(nav.selected()).toEqual({ kind: 'cell', cell: PM });
  // Something before the panel took the key, as an open legend takes Escape: the selection stays.
  globalThis.addEventListener('keydown', taken, { capture: true });
  await press('Escape', panel);
  globalThis.removeEventListener('keydown', taken, { capture: true });
  expect(nav.selected()).toEqual({ kind: 'cell', cell: PM });
});

test('the arrows step the focus through the panel and never reach the camera, and Enter is left to a button', async () => {
  const { nav } = await draw();
  await select(nav, PM);
  const panel = element('aside');
  const stops = all('aside button');
  // From the panel's own ground an arrow lands on its first stop.
  panel.focus();
  expect(await press('ArrowDown', panel)).toBe(true);
  expect(document.activeElement).toBe(stops[0]);
  expect(await press('ArrowRight', stops[0] ?? panel)).toBe(true);
  expect(document.activeElement).toBe(stops[1]);
  expect(await press('ArrowUp', stops[1] ?? panel)).toBe(true);
  expect(document.activeElement).toBe(stops[0]);
  // At either end the focus stays where it is, and the key is still the panel's.
  expect(await press('ArrowLeft', stops[0] ?? panel)).toBe(true);
  expect(document.activeElement).toBe(stops[0]);
  const last = stops.at(-1) ?? panel;
  last.focus();
  expect(await press('ArrowDown', last)).toBe(true);
  expect(document.activeElement).toBe(last);
  // Enter on a button is the button's, which the world leaves be; anywhere else in the panel it is taken, so the camera does not walk in.
  expect(await press('Enter', last)).toBe(false);
  expect(await press('Enter', panel)).toBe(true);
  expect(nav.selected()).toEqual({ kind: 'cell', cell: PM });
  // A row with the focus points at what it names, as one under the pointer does.
  await click('[data-inspector-tab="files"]');
  await act(async () => element(`[data-inspector-row="${SLOTS}"]`).focus());
  expect(nav.pointed()).toEqual({ target: SLOTS, from: 'chrome' });
  await act(async () => element(`[data-inspector-row="${SLOTS}"]`).blur());
  expect(nav.pointed()).toBeUndefined();
});

test("the focus stays in the panel when a row's click swaps its view, so the next key is still the panel's (D272 (focus-stays))", async () => {
  const { nav } = await draw();
  await select(nav, PM);
  await click('[data-inspector-tab="files"]');
  const row = element(`[data-inspector-row="${SLOTS}"]`);
  await act(async () => row.focus());
  expect(document.activeElement).toBe(row);
  // Enter on the row is its click: the panel turns to the file and the row goes with the list.
  await act(async () => row.click());
  const panel = element('aside');
  expect(panel.getAttribute('data-inspector-target')).toBe(SLOTS);
  expect(row.isConnected).toBe(false);
  expect(document.activeElement).toBe(panel);
  // The next arrow is the panel's, never the camera's, and lands on its first stop.
  expect(await press('ArrowDown', panel)).toBe(true);
  const first = element('[data-inspector-step="map"]');
  expect(document.activeElement).toBe(first);
  // The map's step goes with the head it stood in, and the map view keeps the focus too.
  await act(async () => first.click());
  expect(element('aside').getAttribute('data-inspector')).toBe('map');
  expect(document.activeElement).toBe(element('aside'));
  expect(await press('Enter', element('aside'))).toBe(true);

  // A step that stays where it is keeps the focus itself.
  await select(nav, PM);
  const up = element(`[data-inspector-step="${CORE}"]`);
  await act(async () => up.focus());
  await act(async () => up.click());
  expect(nav.selected()).toEqual({ kind: 'cell', cell: CORE });
  expect(document.activeElement).toBe(element(`[data-inspector-step="${CORE}"]`));
});

test('the panel takes no focus it was not left: not from a click with the focus elsewhere, nor from a selection made on the map', async () => {
  const { nav } = await draw();
  await click('[data-inspector="closed"]');
  // The pointer clicks a row while the focus is on the page: the view swaps and the focus stays where it was.
  await click(`[data-inspector-section="largest-modules"] [data-inspector-row="${PM}"]`);
  expect(element('aside').getAttribute('data-inspector-target')).toBe(PM);
  expect(document.activeElement).toBe(document.body);
  // The fly to asks for the selection the panel already shows, which swaps no view.
  const fly = element('[data-inspector-fly]');
  await act(async () => fly.focus());
  await act(async () => fly.click());
  expect(document.activeElement).toBe(fly);
  // The reader goes back to the map and selects there: the panel turns to it and leaves the focus on the page.
  await act(async () => fly.blur());
  await select(nav, DOCTOR);
  expect(element('aside').getAttribute('data-inspector-target')).toBe(DOCTOR);
  expect(document.activeElement).toBe(document.body);
  expect(await press('ArrowDown', document.body)).toBe(false);
});

test('an arrow scrolls a sheet of code that has the focus, in place of stepping off it', async () => {
  serve({ [`/file/${INDEX}`]: { status: 200, body: SERVED } });
  const { nav } = await draw(DEMO, { token: TOKEN });
  await select(nav, INDEX);
  await click('[data-inspector-tab="code"]');
  await settle();
  const sheet = element('[data-inspector-sheet]');
  sheet.focus();
  expect(document.activeElement).toBe(sheet);
  expect(await press('ArrowDown', sheet)).toBe(true);
  expect(await press('ArrowDown', sheet)).toBe(true);
  expect(await press('ArrowUp', sheet)).toBe(true);
  expect(sheet.scrollTop).toBe(40);
  expect(await press('ArrowRight', sheet)).toBe(true);
  expect(sheet.scrollLeft).toBe(40);
  expect(document.activeElement).toBe(sheet);
});

/** Press a control and hold what the panel then draws to the brutalist material: nothing that glows, blurs, grades or fades. */
const flatAt = async (selector: string): Promise<void> => {
  await click(selector);
  expect(host.innerHTML).not.toMatch(/gradient|shadow|blur|opacity|filter/);
};

test('the panel lies over the map at the rail, as wide as its token, live through the registry, and nothing in it glows (D215 (inspector-overlay), D156, D12)', async () => {
  const { nav, registry } = await draw();
  await select(nav, PM);
  const panel = element('aside');
  expect(panel.style.position).toBe('fixed');
  // With no HUD drawn above it, as here, it starts at the top.
  expect(panel.style.top).toBe('0px');
  expect(panel.style.bottom).toBe('0px');
  // It stands at the rail's left edge and claims no screen of its own: the rail's width is the one claim, as it was.
  expect(panel.style.right).toBe(`${String(RAIL_WIDTH)}px`);
  expect(RAIL_WIDTH).toBe(260);
  expect(panel.style.width).toBe('420px');
  expect(panel.style.pointerEvents).toBe('auto');
  act(() => registry.set('PANEL.inspectorWidth', 520));
  expect(element('aside').style.width).toBe('520px');
  act(() => registry.set('CHROME_INK', '#ffffff'));
  expect(element('aside').style.color).toBe('rgb(255, 255, 255)');
  act(() => registry.reset());

  await flatAt('[data-inspector-tab="facts"]');
  await flatAt('[data-inspector-tab="files"]');
  await flatAt('[data-inspector-tab="exports"]');
  await select(nav, TOOLS);
  await flatAt('[data-inspector-functions]');
  await flatAt('[data-inspector-tab="diff"]');
  await flatAt('[data-inspector-tab="code"]');
  await flatAt('[data-inspector-step="map"]');
  expect(host.innerHTML).toContain(rgb(CHROME_RULE));
});

test("the panel starts beneath the HUD's row of grade blocks and follows its foot as the row wraps, so a selection covers no grade (D263 (below-the-grades))", async () => {
  // A stand-in for the row the HUD draws, and for the observer the page follows its size with.
  const grades = document.createElement('nav');
  grades.setAttribute('data-hud', '');
  document.body.append(grades);
  let foot = 67.4;
  grades.getBoundingClientRect = () => new DOMRect(0, 0, 900, foot);
  const watched: { readonly row: Element; readonly resized: () => void; live: boolean }[] = [];
  vi.stubGlobal('ResizeObserver', function Following(this: { observe: (row: Element) => void; disconnect: () => void }, resized: () => void) {
    this.observe = (row) => watched.push({ row, resized, live: true });
    this.disconnect = () => watched.forEach((each) => Object.assign(each, { live: false }));
  });
  const { nav } = await draw();
  expect(watched.map((each) => each.row)).toEqual([grades]);
  await select(nav, PM);
  // A whole pixel under the row, never a part of one over it.
  expect(element('aside').style.top).toBe('68px');
  expect(element('aside').style.bottom).toBe('0px');
  // The screen narrows and the row wraps to a third line: the panel moves down with it.
  foot = 101;
  await act(async () => watched[0]?.resized());
  expect(element('aside').style.top).toBe('101px');
  // The thin tab stands half way down the rail, wherever the row ends.
  await act(async () => nav.select(undefined, 'stay'));
  expect(element('[data-inspector="closed"]').style.top).toBe('50%');
  act(() => root.unmount());
  expect(watched.every((each) => !each.live)).toBe(true);
  root = createRoot(host);
  grades.remove();
});

test('a selection the map no longer holds reads as none, and the panel comes back when a map that holds it is drawn', async () => {
  const { nav, registry } = await draw();
  await select(nav, TOOLS);
  expect(element('aside').getAttribute('data-inspector-target')).toBe(TOOLS);
  // A frame before the file was added, or a pushed map without it: the line keeps the selection and the panel shows none.
  const before: MapJson = { ...DEMO, terrain: { ...DEMO.terrain, organelles: DEMO.terrain.organelles.filter((file) => file.id !== TOOLS) } };
  await act(async () => root.render(<Inspector map={before} registry={registry} nav={nav} />));
  expect(nav.selected()).toEqual(pick(DEMO, TOOLS));
  expect(host.querySelector('aside')).toBeNull();
  expect(element('[data-inspector="closed"]').textContent).toBe('map');
  await act(async () => root.render(<Inspector map={DEMO} registry={registry} nav={nav} />));
  expect(element('aside').getAttribute('data-inspector-target')).toBe(TOOLS);
});

test('the chrome mounts the panel over the map it draws, and a selection on its line opens it', async () => {
  const nav = createNav();
  await act(async () => root.render(<Chrome state={{ status: 'ready', url: '/map.json', map: DEMO }} registry={createRegistry()} nav={nav} dev={false} />));
  expect(element('[data-inspector="closed"]').textContent).toBe('map');
  // The tab stands beside the column, never inside it.
  expect(element('[data-column]').contains(element('[data-inspector]'))).toBe(false);
  await select(nav, TOOLS);
  expect(element('aside[data-inspector="file"]').getAttribute('data-inspector-target')).toBe(TOOLS);
  // While the map is not read there is no panel.
  await act(async () => root.render(<Chrome state={{ status: 'loading', url: '/map.json' }} registry={createRegistry()} nav={nav} dev={false} />));
  expect(host.querySelector('[data-inspector]')).toBeNull();
});

test("a file's facts open on its lines to scale, with the lanes that hold a mark named, and a press on the strip opens its code at that line (D348 (line-strip))", async () => {
  serve({ [`/file/${TOOLS}`]: { status: 200, body: { ...SERVED, path: TOOLS } } });
  const { nav } = await draw(DEMO, { token: TOKEN });
  await select(nav, TOOLS);
  const shape = element('[data-inspector-section="shape"]');
  const strip = svgAt('[data-inspector-section="shape"] [data-strip="across"]');
  // tools.ts has two mutants still alive, on lines 27 and 64, each a tick in its own lane.
  expect([...strip.querySelectorAll('[data-strip-mutant]')].map((mark) => mark.getAttribute('data-strip-mutant'))).toEqual(['27', '64']);
  expect(strip.querySelectorAll('[data-strip-changed]').length).toBeGreaterThan(0);
  expect(element('[data-inspector-strip-key]').textContent).toContain('tick: a mutant no test killed');
  expect(shape.textContent).toContain(`${strip.getAttribute('data-strip-lines') ?? ''} lines`);
  // A press half way along it turns the panel to the file's code.
  await act(async () => {
    strip.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 0, clientY: 0 }));
    await Promise.resolve();
  });
  await settle();
  expect(element('[data-inspector-tabs] [aria-selected="true"]').getAttribute('data-inspector-tab')).toBe('code');
});

test('a file the scan read no function in and the change left alone shows no strip, in its facts or beside its code', async () => {
  const bare = assertMap({ ...DEMO, terrain: { ...DEMO.terrain, organelles: DEMO.terrain.organelles.map(({ functions: _functions, ...file }) => file) } });
  const quiet = bare.terrain.organelles.find((file) => !bare.weather.changed.some((changed) => changed.path === file.id));
  expect(quiet).toBeDefined();
  const { nav } = await draw(bare);
  await select(nav, quiet?.id ?? '');
  expect(host.querySelector('[data-inspector-section="shape"]')).toBeNull();
  expect(host.querySelector('[data-strip]')).toBeNull();
});

test("a file's plate button asks the world for its plate and puts it away again, and the plate goes when the selection moves (D350 (plate-by-ask))", async () => {
  const { nav } = await draw();
  await select(nav, TOOLS);
  const button = element('[data-inspector-plate]');
  expect(button.getAttribute('data-inspector-plate')).toBe('off');
  expect(button.getAttribute('aria-pressed')).toBe('false');
  expect(nav.plated()).toBeUndefined();

  await click('[data-inspector-plate]');
  expect(nav.plated()).toBe(TOOLS);
  expect(element('[data-inspector-plate]').getAttribute('data-inspector-plate')).toBe('on');
  expect(element('[data-inspector-plate]').getAttribute('aria-pressed')).toBe('true');
  await click('[data-inspector-plate]');
  expect(nav.plated()).toBeUndefined();

  // Escape inside the panel puts the plate away first, and the selection stays; a second clears the selection.
  await click('[data-inspector-plate]');
  await act(async () => {
    element('[data-inspector-plate]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await Promise.resolve();
  });
  expect(nav.plated()).toBeUndefined();
  expect(nav.selected()).toEqual(pick(DEMO, TOOLS));

  // Asked for again, it is the plate of this file alone: another file selected has none.
  await click('[data-inspector-plate]');
  await select(nav, INDEX);
  expect(nav.plated()).toBeUndefined();
  expect(element('[data-inspector-plate]').getAttribute('data-inspector-plate')).toBe('off');
});
