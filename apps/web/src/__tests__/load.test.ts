import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

import { loadMap, mapUrl } from '../load.js';
import type { FetchMap } from '../load.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO: unknown = JSON.parse(readFileSync(join(HERE, '..', '..', '..', '..', 'libs', 'core', 'fixtures', 'demo', 'map.json'), 'utf8'));

/** A fetch that answers every url with one status and body, and records the urls it was asked for. */
const serving = (status: number, body: unknown): FetchMap & { readonly asked: string[] } => {
  const asked: string[] = [];
  const fetchMap = async (url: string) => {
    asked.push(url);
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  };
  return Object.assign(fetchMap, { asked });
};

test('the map comes from the page parameter when it names one', () => {
  expect(mapUrl('?map=fixtures/retake-1/map.json')).toBe('fixtures/retake-1/map.json');
  expect(mapUrl('?map=https%3A%2F%2F127.0.0.1%3A4000%2Fmap.json')).toBe('https://127.0.0.1:4000/map.json');
});

test('the map comes from the served /map.json when the page names none, with the token the page was opened with (D134)', () => {
  expect(mapUrl('')).toBe('/map.json');
  expect(mapUrl('?other=1')).toBe('/map.json');
  expect(mapUrl('?token=a3f1')).toBe('/map.json?token=a3f1');
  expect(mapUrl('?zoom=2&token=a%2Fb')).toBe('/map.json?token=a%2Fb');
  expect(mapUrl('?map=/fixture.json&token=a3f1')).toBe('/fixture.json');
});

test('a served map that passes the guard is ready', async () => {
  const fetchMap = serving(200, DEMO);
  const state = await loadMap('/map.json', fetchMap);
  expect(fetchMap.asked).toEqual(['/map.json']);
  expect(state.status).toBe('ready');
  expect(state.status === 'ready' && state.map.meta.repo).toBe('demo');
});

test('a server that answers with an error fails with its status', async () => {
  expect(await loadMap('/map.json', serving(404, null))).toEqual({
    status: 'failed',
    url: '/map.json',
    reason: 'the server answered 404',
  });
});

test('a body that is not a map fails with the guard reason, never a default map', async () => {
  const state = await loadMap('/map.json', serving(200, { meta: {} }));
  expect(state.status).toBe('failed');
  expect(state.status === 'failed' && state.reason).toMatch(/^invalid map at /);
});

test('a fetch that throws fails with its message', async () => {
  const state = await loadMap('/map.json', async () => {
    throw new Error('connection refused');
  });
  expect(state).toEqual({ status: 'failed', url: '/map.json', reason: 'connection refused' });
});
