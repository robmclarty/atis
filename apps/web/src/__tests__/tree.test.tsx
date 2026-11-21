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

import { Column, Tree } from '../chrome/index.js';
import { createNav, selectedOf } from '../nav.js';
import type { Nav } from '../nav.js';
import { createRegistry } from '../registry.js';
import { rowsShown, startsOpen, treeOf } from '../tree.js';
import type * as TreeModel from '../tree.js';

/**
 * The folder tree in a DOM (D208 (side-panels)): its rows as buttons set in
 * by their depth, the directories that open unasked and the ones a press
 * opens, a row pointing the map and selecting through the line, the line
 * lighting a row and opening the way to it (D279 (pointing-opens)), a shore
 * file's row (D280 (shore-row)), the header's line, and the keys the tree
 * keeps from the world (D282 (tree-keys)). No world is drawn: the tree and
 * the test share a line, as the tree and the world do.
 */
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

/** How many rows have been drawn. A row reads what it wears once each time it is drawn, so the readings count the drawings. */
const drawn = vi.hoisted(() => ({ rows: 0 }));
vi.mock('../tree.js', async (original) => {
  const model = await original<typeof TreeModel>();
  const wornBy: typeof model.wornBy = (node, open) => {
    drawn.rows += 1;
    return model.wornBy(node, open);
  };
  return { ...model, wornBy };
});

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const read = (...path: readonly string[]): MapJson => assertMap(JSON.parse(readFileSync(join(ROOT, ...path), 'utf8')));
const DEMO = read('libs', 'core', 'fixtures', 'demo', 'map.json');
const CORPUS = read('fixtures', 'corpus-10', 'map.json');

const TOOLS = 'libs/core/src/pm/tools.ts';
const FORMAT = 'libs/core/src/util/format.ts';
const PM = 'libs/core/src/pm';
const UTIL = 'libs/core/src/util';

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
  vi.restoreAllMocks();
});

const mount = async (nav: Nav = createNav(), map: MapJson = DEMO, registry = createRegistry()): Promise<Nav> => {
  await act(async () => root.render(<Tree map={map} registry={registry} nav={nav} />));
  return nav;
};

/** The tree as the chrome draws it: in the column, between the notices and the shore. */
const mountColumn = async (nav: Nav = createNav(), map: MapJson = DEMO): Promise<Nav> => {
  await act(async () => root.render(<Column map={map} registry={createRegistry()} nav={nav} />));
  return nav;
};

const all = (selector: string): readonly HTMLElement[] => [...host.querySelectorAll<HTMLElement>(selector)];

const row = (path: string): HTMLElement => {
  const found = all('[data-row]').find((each) => each.dataset['row'] === path);
  if (found === undefined) throw new Error(`the tree shows no row for ${path}`);
  return found;
};

const shows = (path: string): boolean => all('[data-row]').some((each) => each.dataset['row'] === path);

const paths = (): readonly (string | undefined)[] => all('[data-row]').map((each) => each.dataset['row']);

const click = (target: Element): Promise<void> =>
  act(async () => {
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

/** The pointer passing onto an element and off it again, as a browser sends it and React reads it. */
const pass = (target: Element, onto: boolean): Promise<void> =>
  act(async () => {
    target.dispatchEvent(new MouseEvent(onto ? 'mouseover' : 'mouseout', { bubbles: true, relatedTarget: onto ? null : document.body }));
  });

/** A key pressed on an element; the event, so a test reads whether the tree took it. */
const press = async (target: Element, key: string): Promise<KeyboardEvent> => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  await act(async () => {
    target.dispatchEvent(event);
  });
  return event;
};

const twisty = (path: string): Element => {
  const mark = row(path).querySelector('[data-twisty]');
  if (mark === null) throw new Error(`${path} has no mark to open it by`);
  return mark;
};

test('each row is a button as high as PANEL.treeRow and set in by PANEL.treeIndent for each directory above it, live through the registry', async () => {
  const registry = createRegistry();
  await mount(createNav(), DEMO, registry);
  expect(all('[data-row]').every((each) => each instanceof HTMLButtonElement)).toBe(true);
  expect(paths()).toEqual(rowsShown(treeOf(DEMO), startsOpen).map((each) => each.node.path));
  const tools = row(TOOLS);
  expect(tools.dataset['depth']).toBe('3');
  expect(tools.style.height).toBe('16px');
  expect(tools.style.padding).toBe('0px 5px 0px 35px');
  expect(row('README.md').style.padding).toBe('0px 5px');
  // A directory is written with a slash, an added file with a plus, and a row's title is its whole path.
  expect(row(PM).querySelector('[data-row-name]')?.textContent).toBe('pm/');
  expect(row('libs/core').querySelector('[data-row-name]')?.textContent).toBe('libs/core/');
  expect(tools.querySelector('[data-row-name]')?.textContent).toBe('+tools.ts');
  expect(tools.title).toBe(TOOLS);
  expect(tools.dataset['target']).toBe(TOOLS);
  expect(row(PM).dataset['target']).toBe('folder:libs/core/src/pm');
  expect(row('libs/core/src').dataset['target']).toBeUndefined();
  act(() => {
    registry.set('PANEL.treeRow', 22);
    registry.set('PANEL.treeIndent', 4);
  });
  expect(row(TOOLS).style.height).toBe('22px');
  expect(row(TOOLS).style.padding).toBe('0px 5px 0px 17px');
  expect(host.querySelector('[data-tree]')?.textContent).not.toMatch(/shadow|blur|gradient/);
});

test('a row wears its marks: a file its change and its notices, a closed directory what it hides, an open one only its own (D277 (closed-wears-hidden))', async () => {
  await mount();
  expect(row(TOOLS).querySelector('[data-row-mark]')?.getAttribute('data-row-mark')).toBe('added');
  expect(row('libs/core/src/pm/legacy.ts').querySelector('[data-row-mark]')?.getAttribute('data-row-mark')).toBe('deleted');
  expect(row('libs/core/src/pm/slots.ts').querySelector('[data-row-mark]')).toBeNull();
  expect([...row('libs/core/src/pm/index.ts').querySelectorAll('[data-mark]')].map((box) => box.textContent)).toEqual(['1', '2', '3', '4']);
  // Open, `pm` wears nothing of what its rows wear; a directory says how many files it holds.
  expect(row(PM).querySelector('[data-row-hides]')).toBeNull();
  expect(row(PM).querySelector('[data-mark]')).toBeNull();
  expect(row(PM).querySelector('[data-row-tail]')?.textContent).toBe('4');
  // Closed, it wears its three changed files and its five notices.
  await click(twisty(PM));
  expect(row(PM).querySelector('[data-row-hides="changed"]')?.textContent).toBe('3');
  expect([...row(PM).querySelectorAll('[data-mark]')].map((box) => box.textContent)).toEqual(['1', '2', '3', '4', '6']);
  // `util` stays closed over a ghost, and wears it.
  expect(row(UTIL).querySelector('[data-row-hides="ghost"]')?.textContent).toBe('1');
  await click(twisty(UTIL));
  expect(row(FORMAT).querySelector('[data-row-mark]')?.getAttribute('data-row-mark')).toBe('ghost');
});

test('a directory holding a change on the map starts open and the rest closed, their rows not drawn; a press on its mark, or on a directory that is no module, opens and closes it', async () => {
  await mount();
  expect(row(PM).getAttribute('aria-expanded')).toBe('true');
  expect(row(UTIL).getAttribute('aria-expanded')).toBe('false');
  expect(shows(FORMAT)).toBe(false);
  expect(shows('libs/core/dist/index.js')).toBe(false);
  // A changed test is not on the map: its directory stays closed and wears the change (D284 (opens-on-map-change)).
  expect(row('libs/core/src/__tests__').getAttribute('aria-expanded')).toBe('false');
  expect(row('libs/core/src/__tests__').querySelector('[data-row-hides="changed"]')?.textContent).toBe('1');
  await click(twisty(UTIL));
  expect(row(UTIL).dataset['open']).toBe('true');
  expect(shows(FORMAT)).toBe(true);
  await click(twisty(UTIL));
  expect(shows(FORMAT)).toBe(false);
  // `libs/core/src` is no module: the row itself opens and closes it, and selects nothing.
  const nav = createNav();
  await mount(nav);
  await click(row('libs/core/src'));
  expect(shows(PM)).toBe(false);
  await click(row('libs/core/src'));
  expect(shows(PM)).toBe(true);
  expect(nav.selected()).toBeUndefined();
  // On a map of 1,244 files only the rows of open directories are drawn.
  await mount(createNav(), CORPUS);
  expect(all('[data-row]')).toHaveLength(rowsShown(treeOf(CORPUS), startsOpen).length);
  expect(all('[data-row]').length).toBeLessThan(400);
});

test('a row under the pointer points the map at what it names, and lets go when the pointer leaves (D209 (selection-line))', async () => {
  const nav = createNav();
  const asked: (string | undefined)[] = [];
  nav.steer({ lookAt: vi.fn(), visit: vi.fn(), point: (target) => asked.push(target) });
  await mount(nav);
  await pass(row(TOOLS), true);
  expect(nav.pointed()).toEqual({ target: TOOLS, from: 'chrome' });
  expect(row(TOOLS).dataset['pointed']).toBe('true');
  expect(row(TOOLS).style.outline).toContain('solid');
  await pass(row(TOOLS), false);
  expect(nav.pointed()).toBeUndefined();
  expect(row(TOOLS).dataset['pointed']).toBeUndefined();
  expect(row(TOOLS).style.outline).toBe('');
  await pass(row(PM), true);
  expect(nav.pointed()).toEqual({ target: 'folder:libs/core/src/pm', from: 'chrome' });
  expect(asked).toEqual([TOOLS, undefined, 'folder:libs/core/src/pm']);
  // A directory that is no module, and a shore file, name nothing on the map: the pointer over one points at nothing.
  await pass(row('libs/core/src'), true);
  expect(nav.pointed()).toBeUndefined();
  await pass(row('README.md'), true);
  expect(nav.pointed()).toBeUndefined();
  // The world's own pointing is not the tree's to let go of.
  act(() => nav.point(TOOLS, 'world'));
  await pass(row('README.md'), false);
  expect(nav.pointed()).toEqual({ target: TOOLS, from: 'world' });
});

test("a row the pointer leaves lets go only of what the tree pointed at: another panel's pointing, taken from the chrome's side since, stands (D265 (own-pointing))", async () => {
  const nav = await mount();
  await pass(row(TOOLS), true);
  expect(nav.pointed()).toEqual({ target: TOOLS, from: 'chrome' });
  // The inspector's row takes the pointing, from the chrome's side as the tree's is, while the pointer still rests on the tree's row.
  act(() => nav.point(FORMAT, 'chrome'));
  await pass(row(TOOLS), false);
  expect(nav.pointed()).toEqual({ target: FORMAT, from: 'chrome' });
  // A row that names nothing on the map, under the pointer, lets go of nothing the tree did not point at either.
  await pass(row('README.md'), true);
  expect(nav.pointed()).toEqual({ target: FORMAT, from: 'chrome' });
  // And what the tree points at next is its own to let go of again.
  await pass(row(TOOLS), true);
  await pass(row(TOOLS), false);
  expect(nav.pointed()).toBeUndefined();
});

test("a press on a file's row, or on a module's, selects it and asks the world to fly there; a module's row opens as well", async () => {
  const nav = createNav();
  const select = vi.fn();
  nav.steer({ lookAt: vi.fn(), visit: vi.fn(), select });
  await mount(nav);
  await click(row(TOOLS));
  expect(nav.selected()).toEqual(selectedOf(DEMO, TOOLS));
  expect(select).toHaveBeenLastCalledWith(selectedOf(DEMO, TOOLS), 'fly');
  expect(row(TOOLS).dataset['selected']).toBe('true');
  expect(row(TOOLS).getAttribute('aria-current')).toBe('true');
  // A second press on the same row flies there again, though the selection did not move.
  await click(row(TOOLS));
  expect(select).toHaveBeenCalledTimes(2);
  // A module's row selects the module, and opens to show what it holds; a second press leaves it open.
  await click(row(UTIL));
  expect(nav.selected()).toEqual({ kind: 'cell', cell: 'directory:libs/core/src/util' });
  expect(select).toHaveBeenLastCalledWith({ kind: 'cell', cell: 'directory:libs/core/src/util' }, 'fly');
  expect(shows(FORMAT)).toBe(true);
  expect(row(UTIL).dataset['selected']).toBe('true');
  expect(row(TOOLS).dataset['selected']).toBeUndefined();
  await click(row(UTIL));
  expect(shows(FORMAT)).toBe(true);
  // A file that is a module of its own is selected as the file, as the line looks one up.
  await click(row('apps/cli/src/doctor.ts'));
  expect(nav.selected()).toEqual({ kind: 'organelle', path: 'apps/cli/src/doctor.ts', cell: 'single:apps/cli/src/doctor.ts' });
});

test('when the world points at something the directories above its row open, the row is lit, and the column scrolls to it (D279 (pointing-opens))', async () => {
  const nav = await mountColumn();
  const column = host.querySelector<HTMLElement>('[data-column]');
  if (column === null) throw new Error('the column is not drawn');
  expect(shows(FORMAT)).toBe(false);
  // The column is 600 pixels high, the tree's header 24, and the row stands 300 pixels under the column's foot.
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const [top, height] = this === column ? [0, 600] : this instanceof HTMLButtonElement && this.dataset['row'] === FORMAT ? [900, 16] : [0, 24];
    return { top, bottom: top + height, height, left: 0, right: 0, width: 0, x: 0, y: top, toJSON: () => ({}) };
  });
  act(() => nav.point(FORMAT, 'world'));
  expect(row(UTIL).getAttribute('aria-expanded')).toBe('true');
  expect(row(FORMAT).dataset['pointed']).toBe('true');
  expect(column.scrollTop).toBe(316);
  // The pointer moving on lights the next row and puts the last one out; the directory stays open.
  act(() => nav.point('folder:libs/core/src/pm', 'world'));
  expect(row(FORMAT).dataset['pointed']).toBeUndefined();
  expect(row(PM).dataset['pointed']).toBe('true');
  expect(shows(FORMAT)).toBe(true);
  // A single file's module lights the file's row, and a target the map does not hold lights none.
  act(() => nav.point('single:apps/cli/src/doctor.ts', 'world'));
  expect(row('apps/cli/src/doctor.ts').dataset['pointed']).toBe('true');
  act(() => nav.point('nowhere.ts', 'world'));
  expect(all('[data-pointed]')).toHaveLength(0);
  // What another panel of the chrome points at is lit where its row shows, and opens nothing.
  await click(twisty(UTIL));
  act(() => nav.point(FORMAT, 'chrome'));
  expect(shows(FORMAT)).toBe(false);
  act(() => nav.point('libs/core/src/pm/slots.ts', 'chrome'));
  expect(row('libs/core/src/pm/slots.ts').dataset['pointed']).toBe('true');
});

test("the world's pointer draws the rows it brings and the rows whose light moved, and never the whole tree, though a directory opens", async () => {
  const nav = await mount();
  const before = all('[data-row]').length;
  let from = drawn.rows;
  const since = (): number => {
    const rows = drawn.rows - from;
    from = drawn.rows;
    return rows;
  };
  // Into a closed directory: its own row, which opens, and the rows it held; the row pointed at is one of them.
  act(() => nav.point(FORMAT, 'world'));
  const brought = all('[data-row]').length - before;
  expect(brought).toBeGreaterThan(0);
  expect(since()).toBe(brought + 1);
  // On to a row already on show, under directories the tree had not yet been asked to open: the row put out and the row lit.
  act(() => nav.point(TOOLS, 'world'));
  expect(since()).toBe(2);
  // A moved selection is the same: the row it fills, and the first row, which gives it the Tab.
  act(() => nav.select(selectedOf(DEMO, 'libs/core/src/pm/slots.ts'), 'stay'));
  expect(since()).toBe(2);
  // On a map of 1,244 files the pointer sweeping over sixty of them draws what each step brings and relights, not the tree once a step: at most a row for each row brought, one for the directory that brought it, and two for the light.
  act(() => root.unmount());
  root = createRoot(host);
  await mount(nav, CORPUS);
  const closed = all('[data-row]').length;
  since();
  const swept = CORPUS.terrain.organelles.slice(0, 60);
  for (const file of swept) act(() => nav.point(file.id, 'world'));
  const opened = all('[data-row]').length - closed;
  expect(opened).toBeGreaterThan(100);
  expect(since()).toBeLessThanOrEqual(2 * opened + 2 * swept.length);
});

test('a path the map lists both as a file and as a directory has a row for each, and each takes its own keys', async () => {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  // A change that replaced a file with a directory of its name lists the path twice: the file that went, and the directory that came.
  const groups = DEMO.terrain.groups.map((group) => (group.id === 'other' ? { ...group, files: [...group.files, PM] } : group));
  await mount(createNav(), { ...DEMO, terrain: { ...DEMO.terrain, groups } });
  const pair = all('[data-row]').filter((each) => each.dataset['row'] === PM);
  expect(pair.map((each) => each.dataset['rowKind'])).toEqual(['directory', 'shore']);
  expect(errors).not.toHaveBeenCalled();
  // An arrow pressed on either goes to the row after it, not the row after its namesake.
  const [directory, file] = pair;
  if (directory === undefined || file === undefined) throw new Error('the pair is not drawn');
  await press(directory, 'ArrowDown');
  expect(document.activeElement).toBe(directory.nextElementSibling);
  await press(file, 'ArrowUp');
  expect(document.activeElement).toBe(file.previousElementSibling);
  expect(errors).not.toHaveBeenCalled();
});

test('when the selection moves the way to its row opens and the row is lit, from the first frame on; a selection the map does not hold lights none', async () => {
  const nav = createNav();
  nav.select(selectedOf(DEMO, FORMAT), 'stay');
  await mountColumn(nav);
  // The directory holding the selection is open from the start.
  expect(row(UTIL).getAttribute('aria-expanded')).toBe('true');
  expect(row(FORMAT).dataset['selected']).toBe('true');
  expect(row(FORMAT).style.color).not.toBe(row(TOOLS).style.color);
  expect(row(FORMAT).tabIndex).toBe(0);
  expect(all('[data-row]').filter((each) => each.tabIndex === 0)).toHaveLength(1);
  await click(twisty(PM));
  expect(shows(TOOLS)).toBe(false);
  act(() => nav.select(selectedOf(DEMO, TOOLS), 'stay'));
  expect(row(TOOLS).dataset['selected']).toBe('true');
  expect(row(FORMAT).dataset['selected']).toBeUndefined();
  act(() => nav.select({ kind: 'cell', cell: 'single:apps/cli/src/doctor.ts' }, 'stay'));
  expect(row('apps/cli/src/doctor.ts').dataset['selected']).toBe('true');
  act(() => nav.select({ kind: 'organelle', path: 'gone.ts', cell: 'package:libs/core' }, 'stay'));
  expect(all('[data-selected]')).toHaveLength(0);
  act(() => nav.select(undefined, 'stay'));
  expect(all('[data-selected]')).toHaveLength(0);
  // A map the scrubber or a watch hands the tree keeps what was opened and does not scroll back to the selection.
  act(() => nav.select(selectedOf(DEMO, TOOLS), 'stay'));
  await click(twisty(PM));
  await act(async () => root.render(<Column map={{ ...DEMO }} registry={createRegistry()} nav={nav} />));
  expect(shows(TOOLS)).toBe(false);
  expect(shows(FORMAT)).toBe(true);
});

test("a shore file's row is muted and says it is not on the map, and a press brings its group's block in the rail into view (D280 (shore-row))", async () => {
  const scrolled = vi.fn();
  Element.prototype.scrollIntoView = scrolled;
  const nav = await mountColumn();
  const readme = row('README.md');
  expect(readme.dataset['rowKind']).toBe('shore');
  expect(readme.dataset['muted']).toBe('true');
  expect(readme.title).toBe('README.md: not on the map (docs)');
  expect(readme.getAttribute('aria-label')).toBe('README.md, not on the map');
  expect(readme.querySelector('[data-row-tail]')?.textContent).toBe('docs');
  expect(readme.style.color).not.toBe(row(TOOLS).style.color);
  expect(readme.dataset['target']).toBeUndefined();
  // A directory that holds nothing on the map says so on its row.
  expect(row('libs/core/dist').dataset['muted']).toBe('true');
  expect(row('libs/core/dist').querySelector('[data-row-tail]')?.textContent).toBe('2 · not on the map');
  expect(row(PM).dataset['muted']).toBeUndefined();
  await click(readme);
  expect(nav.selected()).toBeUndefined();
  expect(scrolled).toHaveBeenCalledTimes(1);
  expect(scrolled.mock.contexts[0]).toBe(host.querySelector('[data-rail] [data-group="docs"]'));
  // With the shore folded away the press opens it first, so the block is there to scroll to.
  await click(host.querySelector('[data-fold="shore"]')!);
  expect(host.querySelector('[data-rail] [data-group="docs"]')).toBeNull();
  await click(row('README.md'));
  expect(scrolled).toHaveBeenCalledTimes(2);
  expect(scrolled.mock.contexts[1]).toBe(host.querySelector('[data-rail] [data-group="docs"]'));
});

test("the header's line says how far the map departs from the approved shape, or, muted, that none was approved; the header folds the tree away", async () => {
  await mount();
  const line = host.querySelector<HTMLElement>('[data-approved]');
  expect(line?.textContent).toBe('no approved shape yet: run atis approve');
  expect(line?.dataset['muted']).toBe('true');
  const mutedInk = line?.style.color;
  expect(host.querySelector('[data-tree] header')?.textContent).toContain('9 on the map · 11 not');
  const approved: MapJson = {
    ...DEMO,
    approved: {
      at: 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678',
      departures: [
        { kind: 'dependency-added', target: 'kleur', why: 'kleur is new' },
        { kind: 'files-grown', target: PM, cell: 'folder:libs/core/src/pm', why: 'pm grew', was: 3, now: 4 },
        { kind: 'lines-grown', target: UTIL, cell: 'directory:libs/core/src/util', why: 'util grew', was: 10, now: 90 },
      ],
    },
  };
  await mount(createNav(), approved);
  const since = host.querySelector<HTMLElement>('[data-approved]');
  expect(since?.textContent).toBe('since approved a1b2c3d: 3 departures');
  expect(since?.dataset['muted']).toBeUndefined();
  expect(since?.style.color).not.toBe(mutedInk);
  // A module's row wears its departures, and a closed directory those of what it holds.
  expect(row(PM).querySelector('[data-departures]')?.textContent).toBe('≠1');
  expect(row(PM).querySelector('[data-departures]')?.getAttribute('title')).toBe('1 departure from the approved shape');
  expect(row(UTIL).querySelector('[data-departures]')?.textContent).toBe('≠1');
  await click(twisty('libs/core'));
  expect(row('libs/core').querySelector('[data-departures]')?.textContent).toBe('≠2');
  // The header folds the tree away, its line with it, and brings it back.
  const fold = host.querySelector('[data-fold="tree"]');
  if (fold === null) throw new Error('the tree has no header to fold it by');
  expect(fold.getAttribute('aria-expanded')).toBe('true');
  await click(fold);
  expect(fold.getAttribute('aria-expanded')).toBe('false');
  expect(all('[data-row]')).toHaveLength(0);
  expect(host.querySelector('[data-approved]')).toBeNull();
  // What was opened and closed is as it was left: `libs/core` is there, still closed.
  await click(fold);
  expect(shows('libs/core')).toBe(true);
  expect(shows(PM)).toBe(false);
});

test('inside the tree the arrows walk the rows and Enter presses one, and the world hears none of them, so the camera stands still (D282 (tree-keys))', async () => {
  const nav = createNav();
  const select = vi.fn();
  nav.steer({ lookAt: vi.fn(), visit: vi.fn(), select });
  await mount(nav);
  // What the world's own listener would see of each key, as `world/draw.ts` reads it.
  const reached: string[] = [];
  const world = (event: KeyboardEvent): void => {
    if (!event.defaultPrevented) reached.push(event.key);
  };
  globalThis.addEventListener('keydown', world);
  // Tab lands on the first row until one is focused.
  expect(all('[data-row]').filter((each) => each.tabIndex === 0).map((each) => each.dataset['row'])).toEqual(['apps/cli']);
  act(() => row(UTIL).focus());
  expect(row(UTIL).tabIndex).toBe(0);
  // The focus points the map at the row, as the pointer does.
  expect(nav.pointed()).toEqual({ target: 'directory:libs/core/src/util', from: 'chrome' });
  // Right opens a closed directory, then steps into it; left steps out to it, then closes it.
  expect((await press(row(UTIL), 'ArrowRight')).defaultPrevented).toBe(true);
  expect(shows(FORMAT)).toBe(true);
  await press(row(UTIL), 'ArrowRight');
  expect(document.activeElement).toBe(row(FORMAT));
  await press(row(FORMAT), 'ArrowDown');
  expect(document.activeElement).toBe(row('libs/core/src/util/text.ts'));
  await press(row('libs/core/src/util/text.ts'), 'ArrowUp');
  expect(document.activeElement).toBe(row(FORMAT));
  await press(row(FORMAT), 'ArrowRight');
  expect(document.activeElement).toBe(row(FORMAT));
  await press(row(FORMAT), 'ArrowLeft');
  expect(document.activeElement).toBe(row(UTIL));
  await press(row(UTIL), 'ArrowLeft');
  expect(shows(FORMAT)).toBe(false);
  await press(row(UTIL), 'ArrowLeft');
  expect(document.activeElement).toBe(row('libs/core/src'));
  // Enter presses the row: a file is selected and flown to, a directory that is no module opens or closes.
  expect((await press(row(TOOLS), 'Enter')).defaultPrevented).toBe(true);
  expect(select).toHaveBeenLastCalledWith(selectedOf(DEMO, TOOLS), 'fly');
  await press(row('libs/core/src'), 'Enter');
  expect(shows(PM)).toBe(false);
  // At the tree's ends an arrow leads nowhere and is still the tree's.
  expect((await press(row('apps/cli'), 'ArrowUp')).defaultPrevented).toBe(true);
  expect((await press(row('tsconfig.json'), 'ArrowDown')).defaultPrevented).toBe(true);
  expect(reached).toEqual([]);
  // Any other key, and an arrow with a modifier, is not the tree's to take.
  expect((await press(row(TOOLS.replace('/pm/tools.ts', '')), 'Escape')).defaultPrevented).toBe(false);
  await act(async () => {
    row('apps/cli').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', metaKey: true, bubbles: true, cancelable: true }));
  });
  expect(reached).toEqual(['Escape', 'ArrowDown']);
  globalThis.removeEventListener('keydown', world);
  // Leaving the tree lets go of what the focus pointed at.
  act(() => row('apps/cli').focus());
  act(() => row('apps/cli').blur());
  expect(nav.pointed()).toBeUndefined();
});
