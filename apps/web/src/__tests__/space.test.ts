import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { LayoutBand } from 'core';
import { expect, test } from 'vitest';

import { SPACE } from '../materials.js';
import { STAR_GRID, bandRules, starField } from '../space.js';

/**
 * The world's ground as space (D169): a faint star field one seed draws the
 * same every time, and one rule at each band's boundary, drawn across the
 * screen in a translucent ink so it sits back from every mark.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', '..', 'libs', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));

/** A field's stars as their brightness, cell by cell. */
const lights = (cells: Float32Array): readonly number[] => Array.from({ length: STAR_GRID * STAR_GRID }, (_unused, cell) => cells[cell * 4] ?? 0);

test('one rule a band boundary, at the height the band below begins, top to bottom', () => {
  const bands = DEMO.terrain.layout?.bands ?? [];
  expect(bands.length).toBeGreaterThan(2);
  const rules = bandRules(DEMO);
  expect(rules).toHaveLength(bands.length - 1);
  expect(rules).toEqual(bands.toSorted((a, b) => a.index - b.index).slice(1).map((band) => ({ band: band.index, y: band.y0 })));
  const { layout: _layout, ...unlaid } = DEMO.terrain;
  expect(bandRules({ ...DEMO, terrain: unlaid })).toEqual([]);
});

/** Where each band after a ladder's first begins: its boundaries, top to bottom. */
const boundaries = (bands: readonly LayoutBand[]): readonly number[] => bands.toSorted((a, b) => a.index - b.index).slice(1).map((band) => band.y0);

test("a field whose lanes wrap into rows rules each row's boundaries across that row alone (Q73)", () => {
  const layout = DEMO.terrain.layout;
  if (layout === undefined) throw new Error('the demo has a layout');
  const ladder = layout.bands.reduce((total, band) => total + (band.y1 - band.y0), 0);
  const lower = layout.bands.map((band) => ({ ...band, y0: band.y0 + ladder + 104, y1: band.y1 + ladder + 104 }));
  const rows = [
    { x0: 0, x1: layout.width, bands: layout.bands },
    { x0: 0, x1: 200, bands: lower },
  ];
  const rules = bandRules({ ...DEMO, terrain: { ...DEMO.terrain, layout: { ...layout, rows } } });
  expect(rules.map((rule) => rule.y)).toEqual([...boundaries(layout.bands), ...boundaries(lower)]);
  expect(rules.filter((rule) => rule.row?.[1] === 200).map((rule) => rule.y)).toEqual(boundaries(lower));
  expect(rules.every((rule) => rule.row !== undefined)).toBe(true);
  // A field of one row keeps its rules running across the screen.
  expect(bandRules(DEMO).every((rule) => rule.row === undefined)).toBe(true);
});

test("the rule's ink is translucent and a pixel wide, so it is just visible and sits back from every mark", () => {
  expect(SPACE.ruleOpacity).toBeGreaterThan(0);
  expect(SPACE.ruleOpacity).toBeLessThan(0.5);
  expect(SPACE.ruleWidth).toBe(1);
  expect(SPACE.ruleInk).toMatch(/^#[0-9a-f]{6}$/u);
});

test('one seed draws one star field, another seed another, each star faint at most and whole within its cell (C3)', () => {
  const field = starField(SPACE.starSeed, SPACE.starDensity);
  expect(field).toHaveLength(STAR_GRID * STAR_GRID * 4);
  expect(starField(SPACE.starSeed, SPACE.starDensity)).toEqual(field);
  expect(starField(SPACE.starSeed + 1, SPACE.starDensity)).not.toEqual(field);
  const shown = lights(field).filter((light) => light > 0);
  // About the share of cells the density asks for hold a star, most of them dim.
  expect(shown.length / (STAR_GRID * STAR_GRID)).toBeCloseTo(SPACE.starDensity, 1);
  expect(Math.max(...shown)).toBeLessThanOrEqual(1);
  expect(shown.filter((light) => light < 0.5).length).toBeGreaterThan(shown.length / 2);
  for (let cell = 0; cell < STAR_GRID * STAR_GRID; cell += 1) {
    for (const share of [field[cell * 4 + 1] ?? 0, field[cell * 4 + 2] ?? 0]) {
      expect(share).toBeGreaterThanOrEqual(0.2);
      expect(share).toBeLessThanOrEqual(0.8);
    }
  }
  expect(lights(starField(SPACE.starSeed, 0)).every((light) => light === 0)).toBe(true);
});
