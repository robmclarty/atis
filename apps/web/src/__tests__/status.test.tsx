import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import { renderToStaticMarkup } from 'react-dom/server';
import { CHROME_INK, CHROME_MUTED, IFR_HUE } from 'scene';
import { expect, test } from 'vitest';

import { Status } from '../chrome/index.js';
import { createRegistry } from '../registry.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', '..', 'libs', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));

/** The markup the status line renders to; a smoke test of the chrome needs no DOM. */
const markup = (state: Parameters<typeof Status>[0]['state'], registry = createRegistry()): string => renderToStaticMarkup(<Status state={state} registry={registry} />);

test('the status line names the map while it loads, in the muted ink', () => {
  const html = markup({ status: 'loading', url: '/map.json' });
  expect(html).toContain('reading /map.json');
  expect(html).toContain('data-status="loading"');
  expect(html).toContain(`color:${CHROME_MUTED}`);
});

test("the status line names the map's repo and base once it is read", () => {
  const html = markup({ status: 'ready', url: '/map.json', map: DEMO });
  expect(html).toContain('demo against main');
  expect(html).toContain(`color:${CHROME_INK}`);
});

test('the status line says why the map did not arrive, in the IFR hue', () => {
  const html = markup({ status: 'failed', url: '/map.json', reason: 'the server answered 404' });
  expect(html).toContain('no map from /map.json: the server answered 404');
  expect(html).toContain(`color:${IFR_HUE}`);
});

test('the status line reads its ink through the registry (D156)', () => {
  const registry = createRegistry();
  registry.set('CHROME_INK', '#ffffff');
  expect(markup({ status: 'ready', url: '/map.json', map: DEMO }, registry)).toContain('color:#ffffff');
});

test('the chrome never glows: no shadow, blur or gradient in its style', () => {
  const html = markup({ status: 'ready', url: '/map.json', map: DEMO });
  expect(html).not.toMatch(/shadow|blur|gradient|filter/);
});
