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

/** The line's markup on a run whose watch follows the repository, on one with no watch, or on a page with no socket. */
const line = (live: boolean | undefined, state: Parameters<typeof Status>[0]['state'] = READY, rebuilding?: boolean): string =>
  renderToStaticMarkup(<Status state={state} registry={createRegistry()} live={live} rebuilding={rebuilding} />);

test('the status line says live while a watch follows the repository, and nothing of it on a run with no watch or a page with no socket (D106, D336 (watch-says))', () => {
  const ready = READY;
  expect(line(true)).toContain('demo against main · live');
  expect(line(true)).toContain('data-live');
  for (const unwatched of [false, undefined]) {
    expect(line(unwatched)).not.toContain('live');
    expect(line(unwatched)).toContain('>demo against main<');
  }
  // The watch says so before the map is read, and the line says it then too.
  expect(line(true, { status: 'loading', url: '/map.json' })).toContain('reading /map.json · live');
  // Every part the line carries stands in one order: the map, that it is structure only, the demo switch, then live.
  expect(renderToStaticMarkup(<Status state={{ status: 'ready', url: '/map.json', map: UNCHECKED }} registry={createRegistry()} shapes="demo" live />)).toContain('>demo against main · structure only: no checks ran · shapes: demo · live<');
  // The chrome hands the watch's word it was given to its status line.
  expect(renderToStaticMarkup(<Chrome state={ready} registry={createRegistry()} dev={false} live />)).toContain('demo against main · live');
  expect(renderToStaticMarkup(<Chrome state={ready} registry={createRegistry()} dev={false} live={false} />)).not.toContain('· live');
});

test('while the watch measures a map the line says rebuilding after live, so a tab that has not moved yet does not look as if it missed the edit (D336 (watch-says))', () => {
  const building = line(true, READY, true);
  expect(building).toContain('>demo against main · live · rebuilding<');
  expect(building).toContain('data-rebuilding');
  // Following again, the word goes.
  expect(line(true, READY, false)).toContain('>demo against main · live<');
  expect(line(true, READY, false)).not.toContain('data-rebuilding');
  // Nothing rebuilds for a page no watch follows.
  expect(line(false, READY, true)).toContain('>demo against main<');
  expect(line(undefined, READY, true)).not.toContain('rebuilding');
  // The chrome hands it on.
  expect(renderToStaticMarkup(<Chrome state={READY} registry={createRegistry()} dev={false} live rebuilding />)).toContain('demo against main · live · rebuilding');
});

test('a map that departs from its approved shape says by how many, before live; one that keeps its shape, or has none approved, says nothing of it (D339 (departures-in-status))', () => {
  const departure = { kind: 'dependency-added', target: 'kleur', why: 'kleur is imported and the approved shape did not hold it' } as const;
  const one = assertMap({ ...DEMO, approved: { at: DEMO.meta.head, departures: [departure] } });
  const two = assertMap({ ...DEMO, approved: { at: DEMO.meta.head, departures: [{ ...departure, target: 'chalk', why: 'chalk is imported and the approved shape did not hold it' }, departure] } });
  const kept = assertMap({ ...DEMO, approved: { at: DEMO.meta.head, departures: [] } });
  const at = (map: MapJson, live?: boolean): string => line(live, { status: 'ready', url: '/map.json', map });
  expect(at(one)).toContain('>demo against main · 1 departure from the approved shape<');
  expect(at(one)).toContain('data-departed="1"');
  expect(at(two, true)).toContain('>demo against main · 2 departures from the approved shape · live<');
  expect(at(two, true)).toContain('data-departed="2"');
  for (const quiet of [at(kept), at(DEMO)]) {
    expect(quiet).toContain('>demo against main<');
    expect(quiet).not.toContain('data-departed');
  }
  // The chrome's own line says it.
  expect(renderToStaticMarkup(<Chrome state={{ status: 'ready', url: '/map.json', map: one }} registry={createRegistry()} dev={false} />)).toContain('1 departure from the approved shape');
});

test('the chrome never glows: no shadow, blur or gradient in its style', () => {
  const html = markup({ status: 'ready', url: '/map.json', map: DEMO });
  expect(html).not.toMatch(/shadow|blur|gradient|filter/);
});
