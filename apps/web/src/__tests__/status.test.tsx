import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson } from 'core';
import { renderToStaticMarkup } from 'react-dom/server';
import { CHROME_INK, CHROME_MUTED, IFR_HUE } from 'scene';
import { expect, test } from 'vitest';

import { Chrome, Status } from '../chrome/index.js';
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

test('the status line says shapes: demo while the demo switch is on, and nothing of it otherwise (D202)', () => {
  const ready = { status: 'ready', url: '/map.json', map: DEMO } as const;
  const on = renderToStaticMarkup(<Status state={ready} registry={createRegistry()} shapes="demo" />);
  expect(on).toContain('demo against main · shapes: demo');
  expect(on).toContain('data-shapes="demo"');
  const off = markup(ready);
  expect(off).not.toContain('shapes');
  // While the map loads, and when it fails, the line still says the switch is on.
  expect(renderToStaticMarkup(<Status state={{ status: 'loading', url: '/map.json' }} registry={createRegistry()} shapes="demo" />)).toContain('reading /map.json · shapes: demo');
  // The chrome hands the switch it was given to its status line.
  expect(renderToStaticMarkup(<Chrome state={ready} registry={createRegistry()} dev={false} shapes="demo" />)).toContain('shapes: demo');
  expect(renderToStaticMarkup(<Chrome state={ready} registry={createRegistry()} dev={false} />)).not.toContain('shapes: demo');
});

/** The demo with no `.check/` trusted, as the HUD's test strips it: git-only instruments, no slot and no evidence. */
const UNCHECKED: MapJson = { ...DEMO, meta: { ...DEMO.meta, instruments: { mode: 'git-only', reason: 'no .check/' } }, weather: { ...DEMO.weather, checks: { category: 'NOINST', checks_run: 0, slots: [] }, evidence: {} } };

test('a map no check was read for says it is structure only, and a checked map says nothing of it (C2)', () => {
  const bare = markup({ status: 'ready', url: '/map.json', map: UNCHECKED });
  expect(bare).toContain('demo against main · structure only: no checks ran');
  expect(bare).toContain('data-structure-only');
  const checked = markup({ status: 'ready', url: '/map.json', map: DEMO });
  expect(checked).not.toContain('structure only');
  expect(checked).not.toContain('data-structure-only');
  // A map that has not arrived is not one with no checks: the line says nothing of it while it loads or after it fails.
  expect(markup({ status: 'loading', url: '/map.json' })).not.toContain('structure only');
  expect(markup({ status: 'failed', url: '/map.json', reason: 'the server answered 404' })).not.toContain('structure only');
  // The chrome's own line says it.
  expect(renderToStaticMarkup(<Chrome state={{ status: 'ready', url: '/map.json', map: UNCHECKED }} registry={createRegistry()} dev={false} />)).toContain('structure only: no checks ran');
});

const READY = { status: 'ready', url: '/map.json', map: DEMO } as const;

/** The line's markup with the socket open, closed, or none. */
const line = (live: boolean | undefined, state: Parameters<typeof Status>[0]['state'] = READY): string => renderToStaticMarkup(<Status state={state} registry={createRegistry()} live={live} />);

test('the status line says live while the socket to the CLI is open, and nothing of it once it closes or where there is none (D106)', () => {
  const ready = READY;
  expect(line(true)).toContain('demo against main · live');
  expect(line(true)).toContain('data-live');
  for (const closed of [false, undefined]) {
    expect(line(closed)).not.toContain('live');
    expect(line(closed)).toContain('>demo against main<');
  }
  // The socket opens before the map is read, and the line says so then too.
  expect(line(true, { status: 'loading', url: '/map.json' })).toContain('reading /map.json · live');
  // Every part the line carries stands in one order: the map, that it is structure only, the demo switch, then live.
  expect(renderToStaticMarkup(<Status state={{ status: 'ready', url: '/map.json', map: UNCHECKED }} registry={createRegistry()} shapes="demo" live />)).toContain('>demo against main · structure only: no checks ran · shapes: demo · live<');
  // The chrome hands the socket's state it was given to its status line.
  expect(renderToStaticMarkup(<Chrome state={ready} registry={createRegistry()} dev={false} live />)).toContain('demo against main · live');
  expect(renderToStaticMarkup(<Chrome state={ready} registry={createRegistry()} dev={false} live={false} />)).not.toContain('· live');
});

test('the chrome never glows: no shadow, blur or gradient in its style', () => {
  const html = markup({ status: 'ready', url: '/map.json', map: DEMO });
  expect(html).not.toMatch(/shadow|blur|gradient|filter/);
});
