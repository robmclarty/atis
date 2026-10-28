// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson } from 'core';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, test } from 'vitest';

import { Chrome, Hud, rawOutputHref } from '../chrome/index.js';
import { HUD_ORDER } from '../hud.js';
import { servedToken } from '../load.js';
import { partsOf } from '../parts.js';
import { createRegistry } from '../registry.js';

/**
 * What each HUD block opens on click (§7, step 36), from the map alone
 * (D93): the parts of every block on the demo, the one line a block with
 * nothing to open says, the raw-output link a red slot carries only when
 * the run is served with its token (D134), and the panel's opening, switching
 * and closing in the DOM.
 */
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', '..', 'libs', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));
const TOKEN = 'a3f1c2d4e5b6a7f8091a2b3c4d5e6f70';

/** The demo with nothing trusted: no `.check/`, no evidence, no slots. */
const NOINST: MapJson = { ...DEMO, meta: { ...DEMO.meta, instruments: { mode: 'git-only', reason: 'no .check/' } }, weather: { ...DEMO.weather, checks: { category: 'NOINST', checks_run: 0, slots: [] }, evidence: {} } };

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

const click = (selector: string): Promise<void> =>
  act(async () => {
    host.querySelector(selector)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

test("the gate opens the change's red slots with the changed files they name, and the standing block the rest (D70)", () => {
  const gate = partsOf(DEMO, 'gate');
  expect(gate.empty).toBeUndefined();
  expect(gate.parts.map((part) => [part.heading, part.slot])).toEqual([['test · red on the change', 'test']]);
  expect(gate.parts[0]?.lines).toEqual(['libs/core/src/__tests__/pm.test.ts · changed', 'libs/core/src/pm/index.ts · changed', 'libs/core/src/pm/legacy.ts · changed', 'libs/core/src/pm/tools.ts · changed']);
  const standing = partsOf(DEMO, 'standing');
  expect(standing.parts.map((part) => [part.heading, part.slot, part.lines])).toEqual([['dead · red, standing', 'dead', ['libs/core/src/index.ts', 'libs/core/src/util/format.ts', 'libs/core/src/util/text.ts']]]);
  // A global red slot names no file; every slot green leaves the line that says so.
  const global = { ...DEMO, weather: { ...DEMO.weather, checks: { ...DEMO.weather.checks, slots: DEMO.weather.checks.slots.map((slot) => (slot.name === 'types' ? { ...slot, ok: false } : slot)) } } };
  expect(partsOf(global, 'standing').parts.find((part) => part.slot === 'types')?.lines).toEqual(['global: no file named']);
  const green = { ...DEMO, weather: { ...DEMO.weather, checks: { ...DEMO.weather.checks, slots: DEMO.weather.checks.slots.map((slot) => ({ ...slot, ok: true })) } } };
  expect(partsOf(green, 'gate')).toEqual({ block: 'gate', parts: [], empty: 'no red is on the change' });
  expect(partsOf(NOINST, 'gate').empty).toContain('no .check/');
});

test('coverage opens the uncovered lines per file and the unmeasured files; mutants open by file with their status (D80, D143)', () => {
  const coverage = partsOf(DEMO, 'patch-cov');
  expect(coverage.parts.map((part) => [part.heading, part.lines])).toEqual([
    ['libs/core/src/pm/index.ts · 4 of 9 changed lines ran', ['uncovered: 8, 9, 25, 28, 31']],
    ['libs/core/src/pm/tools.ts · 7 of 9 changed lines ran', ['uncovered: 27, 64']],
    ['1 unmeasured: no report names them', ['apps/cli/src/doctor.ts']],
  ]);
  const mutants = partsOf(DEMO, 'mutants');
  expect(mutants.parts).toEqual([{ heading: 'libs/core/src/pm/tools.ts', lines: ['line 27 · no test reached it', 'line 64 · survived'] }]);
  expect(partsOf(NOINST, 'patch-cov').empty).toBe('no coverage report was read');
  expect(partsOf(NOINST, 'mutants').empty).toBe('no mutation report was read');
  expect(partsOf({ ...DEMO, weather: { ...DEMO.weather, evidence: { ...DEMO.weather.evidence, mutants: [] } } }, 'mutants').empty).toContain('live');
});

test('the reach opens under each name that carried it, then the files it got to at the file level alone by cell, each with its hops and the interfaces crossed (D5, D45, D111, D181)', () => {
  const reach = partsOf(DEMO, 'reach');
  expect(reach.parts.map((part) => part.heading)).toEqual([
    'legacyResolve · 2 files',
    'listSlots · 1 file',
    'resolveSlot · 2 files',
    'resolveTool · 2 files',
    'runDoctor · 1 file',
    'folder:libs/core/src/pm · 0 hops · file-level',
  ]);
  // A file sits under every name that reached it, nearest first.
  expect(reach.parts[2]?.lines).toEqual(['apps/cli/src/doctor.ts · 0 hops', 'libs/core/src/index.ts · 1 hop via libs/core/src/pm/index.ts']);
  expect(reach.parts[4]?.lines).toEqual(['apps/cli/src/index.ts · 1 hop via apps/cli/src/doctor.ts']);
  // The changed files no moved name reached keep their cell.
  expect(reach.parts[5]?.lines).toEqual(['libs/core/src/pm/legacy.ts · 0 hops', 'libs/core/src/pm/tools.ts · 0 hops']);
  expect(partsOf({ ...DEMO, weather: { ...DEMO.weather, reach: [] } }, 'reach').empty).toContain('reaches no cell');
});

test('a reach that carries no names opens by cell alone, nearest first, as before symbol reach (D5, D45)', () => {
  const unnamed = {
    ...DEMO,
    weather: {
      ...DEMO.weather,
      reach: DEMO.weather.reach.map((named) => {
        const { names: _, ...entry } = named;
        return entry;
      }),
    },
  };
  const reach = partsOf(unnamed, 'reach');
  expect(reach.parts.map((part) => part.heading)).toEqual(['folder:libs/core/src/pm · 0 hops', 'single:apps/cli/src/doctor.ts · 0 hops', 'package:apps/cli · 1 hop', 'package:libs/core · 1 hop']);
  expect(reach.parts[2]?.lines).toEqual(['apps/cli/src/index.ts · 1 hop via apps/cli/src/doctor.ts']);
  expect(reach.parts[0]?.lines[0]).toBe('libs/core/src/pm/index.ts · 0 hops');
});

test('size opens every changed file with its kind and lines, the category its slots, the notices their ranks, other its files, and health its movement', () => {
  const size = partsOf(DEMO, 'size');
  // The terrain's files, which the block counts, then the shore's, named with their own tally and not counted in (D166).
  expect(size.parts.map((part) => part.heading)).toEqual(['4 files', 'the shore, not counted · 4 files · +33 −8']);
  expect(size.parts[0]?.lines).toContain('modified libs/core/src/pm/index.ts · +18 −9');
  expect(size.parts[0]?.lines).toContain('deleted libs/core/src/pm/legacy.ts · +0 −' + String(DEMO.weather.changed.find((file) => file.path === 'libs/core/src/pm/legacy.ts')?.deleted ?? 0));
  expect(size.parts[1]?.lines).toEqual(['modified README.md · +6 −2', 'modified libs/core/src/__tests__/pm.test.ts · +22 −5', 'modified notes.xyz · +3 −1', 'modified package.json · +2 −0']);
  const category = partsOf(DEMO, 'category');
  expect(category.parts[0]?.heading).toBe('IFR, set by the change alone');
  expect(category.parts[0]?.lines).toEqual(DEMO.weather.checks.slots.map((slot) => `${slot.name} · ${slot.skipped ? 'skipped' : slot.ok ? 'green' : 'red'}`));
  expect(partsOf(NOINST, 'category').empty).toBe('no .check/ was trusted: no .check/');
  const notices = partsOf(DEMO, 'notices');
  expect(notices.parts[0]?.heading).toBe('1·2·3 by tier');
  expect(notices.parts[0]?.lines[0]).toBe('1 · primary · red-check-slot · libs/core/src/pm/index.ts');
  expect(notices.parts[0]?.lines[5]).toBe('6 · tertiary · red-check-slot · +libs/core/src/pm/tools.ts');
  expect(partsOf(DEMO, 'other').parts).toEqual([{ heading: '1 files no group claims', lines: ['notes.xyz'] }]);
  // Health Δ opens the maintainability each changed file moved, then what got better against the base (D98).
  expect(partsOf(DEMO, 'health').parts).toEqual([
    { heading: '+1.9 maintainability · 2 files both sides scored', lines: ['apps/cli/src/doctor.ts · +3.4', 'libs/core/src/pm/index.ts · −1.5'] },
    {
      heading: '5 got better',
      lines: [
        'libs/core/src/pm/legacy.ts, libs/core/src/pm/slots.ts · no longer duplicate each other',
        'apps/cli/src/doctor.ts · breaks cognitive no longer',
        'libs/core/src/pm/legacy.ts · breaks cyclomatic no longer',
        'apps/cli/src/doctor.ts · runChecks no longer over cognitive',
        'libs/core/src/pm/legacy.ts · resolveLegacy no longer over cyclomatic',
      ],
    },
  ]);
  // With no base side measured, it says so in one line, never a 0 (C2).
  const { health_delta: _delta, improvements: _improvements, ...unmeasured } = DEMO.weather;
  expect(partsOf({ ...DEMO, weather: unmeasured }, 'health').empty).toContain('no base side');
  expect(partsOf(DEMO, 'nothing').empty).toBe('nothing to open');
  for (const id of HUD_ORDER) expect(partsOf(DEMO, id).block).toBe(id);
});

test('a click opens a block\'s parts beneath the row, another switches, and a second click on the same block closes it', async () => {
  await act(async () => root.render(<Hud map={DEMO} registry={createRegistry()} />));
  expect(host.querySelector('[data-parts]')).toBeNull();
  await click('[data-block="patch-cov"]');
  expect(host.querySelector('[data-parts]')?.getAttribute('data-parts')).toBe('patch-cov');
  expect(host.querySelector('[data-block="patch-cov"]')?.getAttribute('aria-expanded')).toBe('true');
  expect(all('[data-parts="patch-cov"] [data-part]')).toHaveLength(3);
  expect(host.querySelector('[data-parts="patch-cov"]')?.textContent).toContain('uncovered: 8, 9, 25, 28, 31');
  await click('[data-block="reach"]');
  expect(all('[data-parts]').map((panel) => panel.getAttribute('data-parts'))).toEqual(['reach']);
  expect(host.querySelector('[data-block="patch-cov"]')?.getAttribute('aria-expanded')).toBe('false');
  await click('[data-block="reach"]');
  expect(host.querySelector('[data-parts]')).toBeNull();
  await click('[data-block="health"]');
  expect(host.querySelector('[data-parts="health"]')?.textContent).toContain('apps/cli/src/doctor.ts · +3.4');
  expect(host.innerHTML).not.toMatch(/gradient|shadow|blur|opacity/);
});

test('a red slot links to its raw output only when the run is served with its token, never from a fixture (D93, D134)', async () => {
  await act(async () => root.render(<Hud map={DEMO} registry={createRegistry()} token={TOKEN} />));
  await click('[data-block="gate"]');
  const link = host.querySelector('[data-parts="gate"] a[data-raw="test"]');
  expect(link?.getAttribute('href')).toBe(`/check/test?token=${TOKEN}`);
  expect(link?.getAttribute('target')).toBe('_blank');
  await click('[data-block="standing"]');
  expect(host.querySelector('[data-parts="standing"] a[data-raw="dead"]')?.getAttribute('href')).toBe(`/check/dead?token=${TOKEN}`);
  await click('[data-block="patch-cov"]');
  expect(host.querySelector('[data-parts] a')).toBeNull();

  await act(async () => root.render(<Hud map={DEMO} registry={createRegistry()} />));
  await click('[data-block="gate"]');
  expect(host.querySelector('[data-parts="gate"]')).not.toBeNull();
  expect(host.querySelector('[data-parts="gate"] a')).toBeNull();
  expect(rawOutputHref('te st', 'a&b')).toBe('/check/te%20st?token=a%26b');
});

test('the page carries the token only when the map is served, and the chrome hands it to the HUD', async () => {
  expect(servedToken(`?token=${TOKEN}`)).toBe(TOKEN);
  expect(servedToken(`?map=/fixtures/map.json&token=${TOKEN}`)).toBeUndefined();
  expect(servedToken('')).toBeUndefined();
  const registry = createRegistry();
  await act(async () => root.render(<Chrome state={{ status: 'ready', url: '/map.json', map: DEMO }} registry={registry} dev={false} token={TOKEN} />));
  await click('[data-block="gate"]');
  expect(host.querySelector('[data-parts="gate"] a[data-raw="test"]')).not.toBeNull();
});
