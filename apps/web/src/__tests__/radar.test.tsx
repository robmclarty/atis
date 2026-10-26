// @vitest-environment jsdom
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEFAULT_CONFIG, assertMap } from 'core';
import type { MapJson } from 'core';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { MUTED_DASH } from 'scene';
import { afterEach, beforeEach, expect, test } from 'vitest';

import { HealthRadar, Hud } from '../chrome/index.js';
import { RADAR_MEASURES, firstRadarFile, radarFiles, radarOf, spokeWords } from '../radar.js';
import type { Radar } from '../radar.js';
import { createRegistry } from '../registry.js';
import { repoMap } from './repo-map.js';

/**
 * The health radar (D103): a changed file's eight measures read from the map
 * alone (D93), raw against the largest the map holds or categorised against
 * D9's thresholds, every measure the map does not carry muted with its reason
 * (C2); and in the DOM, opened one click from the HUD's Health Δ block, its
 * toggle and its file picker, on the demo and on every committed fixture map.
 */
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const DEMO = assertMap(JSON.parse(readFileSync(join(ROOT, 'libs', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));

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

const click = (selector: string): Promise<void> =>
  act(async () => {
    host.querySelector(selector)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

/** Each spoke of a radar as it reads in both modes. */
const readings = (radar: Radar | undefined): Readonly<Record<string, readonly [string, string]>> =>
  Object.fromEntries((radar?.spokes ?? []).map((spoke) => [spoke.id, [spokeWords(spoke, true), spokeWords(spoke, false)]]));

test("a radar is drawn for each changed file the terrain places, a deleted one left out, opening on the one the worst notice names", () => {
  expect(radarFiles(DEMO)).toEqual(['apps/cli/src/doctor.ts', 'libs/core/src/pm/index.ts', 'libs/core/src/pm/tools.ts']);
  expect(firstRadarFile(DEMO)).toBe('libs/core/src/pm/index.ts');
  // No notice names a charted file, and the first is taken; a path the change did not place has none.
  expect(firstRadarFile({ ...DEMO, notices: [] })).toBe('apps/cli/src/doctor.ts');
  expect(radarOf(DEMO, 'README.md')).toBeUndefined();
  expect(radarOf(DEMO, 'libs/core/src/util/text.ts')).toBeUndefined();
  expect(firstRadarFile(repoMap())).toBeUndefined();
});

test("each spoke reads its number raw and where it stands against D9 categorised, and what the map does not carry is muted (C2)", () => {
  const index = radarOf(DEMO, 'libs/core/src/pm/index.ts');
  expect(index?.spokes.map((spoke) => spoke.id)).toEqual(RADAR_MEASURES.map((measure) => measure.id));
  expect(readings(index)).toEqual({
    cyclomatic: [MUTED_DASH, "within fallow's"],
    cognitive: [MUTED_DASH, "within fallow's"],
    crap: [MUTED_DASH, "within fallow's"],
    size: ['31', MUTED_DASH],
    churn: ['2.76', 'over ≥ 2'],
    bugfix: ['0.40', 'over ≥ 0.30'],
    fan_in: ['2', 'within ≥ 7'],
    fan_out: ['2', MUTED_DASH],
  });
  // The tools module breaks two of fallow's thresholds; the test importing it is no dependent (D4).
  expect(readings(radarOf(DEMO, 'libs/core/src/pm/tools.ts'))).toMatchObject({ cyclomatic: [MUTED_DASH, "over fallow's"], cognitive: [MUTED_DASH, "within fallow's"], crap: [MUTED_DASH, "over fallow's"], fan_in: ['1', 'within ≥ 7'], fan_out: ['1', MUTED_DASH] });
  // Each raw spoke runs to the largest the map holds for it: the doctor is the demo's largest file.
  const size = index?.spokes.find((spoke) => spoke.id === 'size')?.raw;
  expect(size !== undefined && 'reach' in size ? size.reach : undefined).toBeCloseTo(31 / 212);
  // Every muted spoke says why.
  for (const spoke of index?.spokes ?? []) {
    if ('muted' in spoke.raw) expect(spoke.raw.muted).not.toBe('');
    if ('muted' in spoke.category) expect(spoke.category.muted).toMatch(/D9 sets no threshold/);
  }
});

test("a tighter config moves a spoke over its gate, and with no health, no history and no wiring read, the spokes say so rather than read 0 (D9, C2)", () => {
  const tight = { ...DEFAULT_CONFIG, notices: { ...DEFAULT_CONFIG.notices, fan_in_high: 1 } };
  expect(readings(radarOf(DEMO, 'libs/core/src/pm/index.ts', tight))['fan_in']).toEqual(['2', 'over ≥ 1']);
  const bare: MapJson = {
    ...DEMO,
    meta: { ...DEMO.meta, instruments: { mode: 'git-only', reason: 'no .check/' } },
    terrain: { ...DEMO.terrain, organelles: DEMO.terrain.organelles.map(({ churn_ratio: _churn, bugfix_rate: _bugfix, ...organelle }) => organelle) },
    weather: (({ wiring: _wiring, ...weather }) => weather)(DEMO.weather),
  };
  const radar = radarOf(bare, 'libs/core/src/pm/index.ts');
  expect(readings(radar)).toEqual({
    cyclomatic: [MUTED_DASH, MUTED_DASH],
    cognitive: [MUTED_DASH, MUTED_DASH],
    crap: [MUTED_DASH, MUTED_DASH],
    size: ['31', MUTED_DASH],
    churn: [MUTED_DASH, MUTED_DASH],
    bugfix: [MUTED_DASH, MUTED_DASH],
    fan_in: [MUTED_DASH, MUTED_DASH],
    fan_out: [MUTED_DASH, MUTED_DASH],
  });
  const why = Object.fromEntries((radar?.spokes ?? []).map((spoke) => [spoke.id, 'muted' in spoke.category ? spoke.category.muted : '']));
  expect(why).toMatchObject({ cyclomatic: 'no health was read for the head', churn: 'the history window saw no churn for it', fan_in: 'the map records no wiring for the change' });
});

test('the Health Δ block opens the radar beneath its parts, one click from the HUD, categorised first, in the flat chrome', async () => {
  await act(async () => root.render(<Hud map={DEMO} registry={createRegistry()} />));
  expect(host.querySelector('[data-radar]')).toBeNull();
  await click('[data-block="health"]');
  const radar = host.querySelector('[data-radar]');
  expect(radar?.getAttribute('data-radar')).toBe('libs/core/src/pm/index.ts');
  expect(radar?.getAttribute('data-mode')).toBe('categorised');
  expect([...host.querySelectorAll('[data-spoke]')].map((spoke) => spoke.getAttribute('data-spoke'))).toEqual(RADAR_MEASURES.map((measure) => measure.id));
  // Size and fan-out have no D9 threshold: muted, with no point, and the reason as their title.
  expect([...host.querySelectorAll('[data-spoke][data-muted]')].map((spoke) => spoke.getAttribute('data-spoke'))).toEqual(['size', 'fan_out']);
  expect(host.querySelector('[data-spoke="size"] title')?.textContent).toBe("D9 sets no threshold for a file's size");
  expect([...host.querySelectorAll('[data-reading]')].map((point) => point.getAttribute('data-reading'))).toEqual(['cyclomatic', 'cognitive', 'crap', 'churn', 'bugfix', 'fan_in']);
  expect(host.querySelector('[data-spoke="churn"] [data-words]')?.textContent).toBe('over ≥ 2');
  expect(host.querySelector('[data-outline]')).not.toBeNull();
  expect(host.innerHTML).not.toMatch(/gradient|shadow|blur|opacity/);
  // A second click closes it with the parts.
  await click('[data-block="health"]');
  expect(host.querySelector('[data-radar]')).toBeNull();
});

test('the toggle reads it raw and back, and the picker charts another changed file', async () => {
  await act(async () => root.render(<HealthRadar map={DEMO} registry={createRegistry()} size={12} />));
  await click('[data-radar-mode="raw"]');
  expect(host.querySelector('[data-radar]')?.getAttribute('data-mode')).toBe('raw');
  expect(host.querySelector('[data-radar-mode="raw"]')?.getAttribute('aria-pressed')).toBe('true');
  expect([...host.querySelectorAll('[data-spoke][data-muted]')].map((spoke) => spoke.getAttribute('data-spoke'))).toEqual(['cyclomatic', 'cognitive', 'crap']);
  expect(host.querySelector('[data-spoke="size"] [data-words]')?.textContent).toBe('31');
  expect(host.querySelector('[data-spoke="cyclomatic"] [data-words]')?.textContent).toBe(MUTED_DASH);

  const picker = host.querySelector<HTMLSelectElement>('[data-radar-file]');
  expect([...(picker?.options ?? [])].map((option) => option.value)).toEqual(radarFiles(DEMO));
  await act(async () => {
    if (picker === null) return;
    picker.value = 'apps/cli/src/doctor.ts';
    picker.dispatchEvent(new Event('change', { bubbles: true }));
  });
  expect(host.querySelector('[data-radar]')?.getAttribute('data-radar')).toBe('apps/cli/src/doctor.ts');
  expect(host.querySelector('[data-spoke="size"] [data-words]')?.textContent).toBe('212');
  await click('[data-radar-mode="categorised"]');
  expect(host.querySelector('[data-spoke="bugfix"] [data-words]')?.textContent).toBe('over ≥ 0.30');
});

test('a whole repo has no changed file to chart, and says so', async () => {
  await act(async () => root.render(<HealthRadar map={repoMap()} registry={createRegistry()} size={12} />));
  expect(host.querySelector('[data-radar] [data-empty]')?.textContent).toBe('the change placed no file on the terrain to chart');
  expect(host.querySelector('[data-spoke]')).toBeNull();
});

test('every committed fixture map opens a radar of eight spokes, each muted one with its reason, or says it has none to chart', async () => {
  const maps = readdirSync(join(ROOT, 'fixtures'))
    .map((name) => [name, join(ROOT, 'fixtures', name, 'map.json')] as const)
    .filter(([, path]) => existsSync(path))
    .flatMap(([name, path]) => {
      try {
        return [[name, assertMap(JSON.parse(readFileSync(path, 'utf8')))] as const];
      } catch {
        return [];
      }
    });
  expect(maps.length).toBeGreaterThan(0);
  for (const [name, map] of maps) {
    await act(async () => root.render(<HealthRadar key={name} map={map} registry={createRegistry()} size={12} />));
    const spokes = [...host.querySelectorAll('[data-spoke]')];
    if (firstRadarFile(map) === undefined) {
      expect(host.querySelector('[data-radar] [data-empty]'), name).not.toBeNull();
      continue;
    }
    expect(spokes, name).toHaveLength(RADAR_MEASURES.length);
    for (const spoke of spokes) {
      if (spoke.hasAttribute('data-muted')) expect(spoke.querySelector('title')?.textContent, `${name} ${String(spoke.getAttribute('data-spoke'))}`).not.toBe('');
    }
  }
});
