// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson } from 'core';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { shoreRail } from 'scene';
import { afterEach, beforeEach, expect, test } from 'vitest';

import { Chrome, Rail } from '../chrome/index.js';
import { createRegistry } from '../registry.js';

/**
 * The shore rail in a DOM (D153, D160): one block per group in the rail's
 * order, the touched ones open on a grid of their files and their changed
 * names, the rest collapsed to their name and count, a click opening any
 * block that has something to show, and the whole chrome carrying it once the
 * map is read.
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

const mount = async (map: MapJson = DEMO): Promise<void> => {
  await act(async () => root.render(<Rail map={map} registry={createRegistry()} />));
};

const all = (selector: string): readonly Element[] => [...host.querySelectorAll(selector)];

const click = (selector: string): Promise<void> =>
  act(async () => {
    host.querySelector(selector)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

test("the rail lists one block per group in the rail's order, with the shore's count in its header", async () => {
  await mount();
  const rail = shoreRail(DEMO);
  expect(all('[data-group]').map((block) => block.getAttribute('data-group'))).toEqual(rail.map((block) => block.group));
  expect(host.querySelector('[data-rail] header')?.textContent).toContain(`${String(rail.reduce((total, block) => total + block.count, 0))} files · ${String(rail.length)} groups`);
  for (const block of rail) {
    const header = host.querySelector(`[data-group="${block.group}"] button`);
    expect(header?.textContent).toContain(block.group);
    expect(header?.textContent).toContain(String(block.count));
  }
  expect(host.querySelector('[data-group="other"]')?.hasAttribute('data-loud')).toBe(true);
});

test('a touched block opens on a grid of every file, the changed first and lit, with the changed files named beneath', async () => {
  await mount();
  const deps = shoreRail(DEMO).find((block) => block.group === 'deps');
  const block = host.querySelector('[data-group="deps"]');
  expect(block?.hasAttribute('data-touched')).toBe(true);
  expect(block?.hasAttribute('data-open')).toBe(true);
  const squares = all('[data-group="deps"] [data-grid] [data-file]');
  expect(squares.map((square) => square.getAttribute('data-file'))).toEqual(deps?.files.map((file) => file.path));
  expect(squares.map((square) => square.getAttribute('data-kind'))).toEqual(['modified', 'file', 'file', 'file']);
  expect(all('[data-group="deps"] li').map((row) => [row.getAttribute('data-id'), row.textContent])).toEqual([['package.json', 'package.json']]);
});

test('an untouched block stays its name and count, and opens on nothing', async () => {
  await mount();
  const build = host.querySelector('[data-group="build"]');
  expect(build?.hasAttribute('data-touched')).toBe(false);
  expect(build?.hasAttribute('data-open')).toBe(false);
  expect(all('[data-group="build"] [data-file]')).toHaveLength(0);
  expect(all('[data-group="build"] li')).toHaveLength(0);
  await click('[data-group="build"] button');
  expect(host.querySelector('[data-group="build"]')?.hasAttribute('data-open')).toBe(false);
});

test('a click on a touched header closes its block and another opens it again', async () => {
  await mount();
  await click('[data-group="docs"] button');
  expect(host.querySelector('[data-group="docs"]')?.hasAttribute('data-open')).toBe(false);
  expect(all('[data-group="docs"] [data-file]')).toHaveLength(0);
  await click('[data-group="docs"] button');
  expect(host.querySelector('[data-group="docs"]')?.hasAttribute('data-open')).toBe(true);
  expect(all('[data-group="docs"] [data-file]')).toHaveLength(1);
});

test("a long path is cut from its left, so the file's own name survives, as the SVG's band cuts it", async () => {
  const path = 'www/docs/client/tanstack-react-query/server-components-and-streaming.mdx';
  const changed = [...DEMO.weather.changed, { path, kind: 'modified' as const, group: 'docs', is_barrel: false, added: 1, deleted: 0, hunks: [] }];
  const groups = DEMO.terrain.groups.map((group) => (group.id === 'docs' ? { ...group, files: [...group.files, path] } : group));
  await mount({ ...DEMO, terrain: { ...DEMO.terrain, groups }, weather: { ...DEMO.weather, changed } });
  const row = host.querySelector(`[data-group="docs"] li[data-id="${path}"]`);
  expect(row?.textContent?.startsWith('…')).toBe(true);
  expect(row?.textContent?.endsWith('server-components-and-streaming.mdx')).toBe(true);
  expect(row?.getAttribute('title')).toBe(path);
});

test('an added file is named with a plus, a renamed one from its old path, and a ghost on an untouched block names it dashed (D120)', async () => {
  const changed = DEMO.weather.changed.map((file) => (file.path === 'README.md' ? { ...file, kind: 'added' as const } : file.path === 'notes.xyz' ? { ...file, kind: 'renamed' as const, from: 'old.xyz' } : file));
  const ghosts = [{ path: 'tsconfig.json', with: ['libs/core/src/pm/index.ts'], rate: 0.5, support: 2 }];
  await mount({ ...DEMO, weather: { ...DEMO.weather, changed, ghosts } });
  expect(host.querySelector('[data-group="docs"] li')?.textContent).toBe('+README.md');
  expect(host.querySelector('[data-group="other"] li')?.textContent).toBe('old.xyz → notes.xyz');
  const config = host.querySelector('[data-group="config"]');
  expect(config?.hasAttribute('data-touched')).toBe(false);
  expect(config?.hasAttribute('data-open')).toBe(false);
  await click('[data-group="config"] button');
  expect(host.querySelector('[data-group="config"] li')?.getAttribute('data-kind')).toBe('ghost');
  expect(all('[data-group="config"] [data-file]')).toHaveLength(0);
});

test("a red slot over a shore group hangs its bolt on the block's header, the change's with its slot (D68)", async () => {
  const slots = [...DEMO.weather.checks.slots, { name: 'spell', ok: false, skipped: false, scope: ['README.md'], change: ['README.md'] }, { name: 'docs', ok: false, skipped: false, scope: ['README.md', 'tsconfig.json'], change: [] }];
  await mount({ ...DEMO, weather: { ...DEMO.weather, checks: { ...DEMO.weather.checks, slots } } });
  const storms = all('[data-group="docs"] button [data-slot]').map((storm) => [storm.getAttribute('data-slot'), storm.getAttribute('data-change'), storm.textContent]);
  expect(storms).toEqual([
    ['spell', 'true', 'spell'],
    ['docs', 'false', ''],
  ]);
  expect(all('[data-group="config"] button [data-slot]').map((storm) => storm.getAttribute('data-slot'))).toEqual(['docs']);
});

test('the chrome carries the rail once the map is read, and not before', async () => {
  const registry = createRegistry();
  await act(async () => root.render(<Chrome state={{ status: 'loading', url: '/map.json' }} registry={registry} dev={false} />));
  expect(host.querySelector('[data-rail]')).toBeNull();
  await act(async () => root.render(<Chrome state={{ status: 'ready', url: '/map.json', map: DEMO }} registry={registry} dev={false} />));
  expect(host.querySelector('[data-rail]')).not.toBeNull();
  expect(host.querySelector('[data-rail]')?.textContent).not.toMatch(/shadow|blur|gradient/);
});
