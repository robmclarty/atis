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

import { BASE_CHOICES, baseUrl, currentBase } from '../bases.js';
import type { PostBase } from '../bases.js';
import { Bases, Chrome } from '../chrome/index.js';
import { createNav } from '../nav.js';
import { createRegistry } from '../registry.js';
import { repoMap } from './repo-map.js';

/**
 * The base selector in served mode (§8, D99, C13): the trunk, the last tag,
 * the head's parent and the working tree, the one the map was built over
 * pressed; a press posts its body to `/base` with the run's token and, once
 * the CLI answers with the new map, reads the page afresh; a refusal is
 * written in the CLI's words; and a fixture, with no server, shows none.
 */
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', '..', 'libs', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));
const TOKEN = 'a3f1c2d4';

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

const button = (selector: string): HTMLButtonElement => {
  const found = host.querySelector(selector);
  if (!(found instanceof HTMLButtonElement)) throw new Error(`${selector} is not a button`);
  return found;
};

const withMeta = (meta: Partial<MapJson['meta']>): MapJson => ({ ...DEMO, meta: { ...DEMO.meta, ...meta } });

test('the selector offers the trunk, the last tag, HEAD~1 and the working tree, each a body the CLI checks, and knows which the map was built over', () => {
  expect(BASE_CHOICES.map((choice) => [choice.label, choice.body])).toEqual([
    ['trunk', {}],
    ['last tag', { last: 'tag' }],
    ['HEAD~1', { base: 'HEAD~1' }],
    ['working tree', { base: 'HEAD', working_tree: true }],
  ]);
  expect(baseUrl('a b')).toBe('/base?token=a%20b');
  const { base_typed: _typed, ...untyped } = DEMO.meta;
  expect(currentBase({ ...DEMO, meta: untyped })).toBe('trunk');
  expect(currentBase(withMeta({ base_typed: '--last-tag' }))).toBe('last-tag');
  expect(currentBase(withMeta({ base_typed: '--base HEAD~1' }))).toBe('last-commit');
  expect(currentBase(withMeta({ base_typed: '--last-commit' }))).toBe('last-commit');
  expect(currentBase(withMeta({ head: 'working-tree', base_typed: '--base HEAD' }))).toBe('working-tree');
  expect(currentBase(withMeta({ base_typed: '--base v1' }))).toBeUndefined();
  expect(currentBase(repoMap())).toBeUndefined();
});

test('a press posts its body with the run\'s token and reads the page afresh once the CLI answers', async () => {
  const post = vi.fn<PostBase>(() => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('{}') }));
  const reload = vi.fn();
  await act(async () => root.render(<Bases map={withMeta({ base_typed: '--last-tag' })} registry={createRegistry()} token={TOKEN} post={post} reload={reload} />));
  expect(button('[data-base="last-tag"]').getAttribute('aria-pressed')).toBe('true');

  await act(async () => button('[data-base="working-tree"]').click());
  expect(post).toHaveBeenCalledWith(`/base?token=${TOKEN}`, '{"base":"HEAD","working_tree":true}');
  expect(reload).toHaveBeenCalledOnce();
});

test("a refusal is written in the CLI's words, and the page stays as it is", async () => {
  const post = vi.fn<PostBase>(() => Promise.resolve({ ok: false, status: 400, text: () => Promise.resolve('--last-tag finds no tag the head reaches\n') }));
  const reload = vi.fn();
  await act(async () => root.render(<Bases map={DEMO} registry={createRegistry()} token={TOKEN} post={post} reload={reload} />));

  await act(async () => button('[data-base="last-tag"]').click());
  expect(host.querySelector('[data-base-refused]')?.textContent).toBe('--last-tag finds no tag the head reaches');
  expect(reload).not.toHaveBeenCalled();
});

test('the chrome shows the selector only when served, with the token the run opened the page with (D93, D134)', async () => {
  const state = { status: 'ready' as const, url: '/map.json', map: DEMO };
  await act(async () => root.render(<Chrome state={state} registry={createRegistry()} nav={createNav()} dev={false} />));
  expect(host.querySelector('[data-bases]')).toBeNull();
  await act(async () => root.render(<Chrome state={state} registry={createRegistry()} nav={createNav()} dev={false} token={TOKEN} />));
  expect(host.querySelectorAll('[data-bases] [data-base]')).toHaveLength(4);
});
