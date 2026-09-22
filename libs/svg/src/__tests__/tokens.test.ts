import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

import * as tokens from '../tokens.js';

/**
 * docs/design.md is the human-facing record of the look the SVG settled on,
 * written from the static SVG as §5.6 asks, and tokens.ts is the single source
 * the renderer reads it from (D51, step 21). The two drift the moment a token
 * is added or renamed with no line in the doc, so this test holds the doc to
 * naming every token the file exports.
 *
 * It is the forward direction only: the doc may also name fixed geometry that
 * is not a token (the clone glyphs, the arrowhead), which it lists on purpose,
 * so a reverse check would flag those. Reading files with node:fs is fine in a
 * test; C1 keeps Node out of the code the package ships, and nothing svg
 * exports reaches for it.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const DESIGN = join(HERE, '..', '..', '..', '..', 'docs', 'design.md');

/** Every export of tokens.ts is a token; the module carries nothing else. */
const NAMES = Object.keys(tokens);

test('tokens.ts exports the tokens the design doc is written from', () => {
  expect(NAMES.length).toBeGreaterThan(50);
});

test('design.md names every exported token', () => {
  const doc = readFileSync(DESIGN, 'utf8');
  const missing = NAMES.filter((name) => !new RegExp(`\\b${name}\\b`).test(doc));
  expect(missing, `tokens exported but not documented: ${missing.join(', ')}`).toEqual([]);
});
