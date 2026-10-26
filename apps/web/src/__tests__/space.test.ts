import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import { expect, test } from 'vitest';

import { SPACE } from '../materials.js';
import { STAR_GRID, across, bandRules, starField } from '../space.js';

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

test("the rule's ink is translucent and a pixel wide, so it is just visible and sits back from every mark", () => {
  expect(SPACE.ruleOpacity).toBeGreaterThan(0);
  expect(SPACE.ruleOpacity).toBeLessThan(0.5);
  expect(SPACE.ruleWidth).toBe(1);
  expect(SPACE.ruleInk).toMatch(/^#[0-9a-f]{6}$/u);
});

test("a rule runs across the whole screen, whichever way the camera has turned the ground, and one that misses the screen is not drawn", () => {
  expect(across([100, 300], [500, 300], 800, 600)).toEqual([
    [0, 300],
    [800, 300],
  ]);
  const slanted = across([100, 100], [200, 150], 800, 600);
  expect(slanted?.[0]).toEqual([0, 50]);
  expect(slanted?.[1]).toEqual([800, 450]);
  expect(across([100, 700], [500, 700], 800, 600)).toBeUndefined();
  expect(across([100, 100], [100, 100], 800, 600)).toBeUndefined();
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
