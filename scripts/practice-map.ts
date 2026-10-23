/**
 * practice-map: write `docs/glance-practice.svg`, the annotated practice map
 * every reading opens with (D87), from a retake fixture's `map.json`, its
 * numbered balloons drawn from the legend's own list of marks (D125).
 *
 * One command re-renders it: `pnpm practice-map`, or `pnpm practice-map
 * retake-2` to draw it from another fixture. It runs on the built libraries,
 * which that command builds first, and says which balloons it hung and which
 * of the legend's marks the fixture has no instance of.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from '../libs/core/dist/index.js';
import { renderPractice } from '../libs/svg/dist/index.js';

/** The fixture it draws by default: a retake's, whose truth is unsealed and whose repo no later reading uses (D87), and the most legible of the five. */
const FIXTURE = 'retake-5';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join('docs', 'glance-practice.svg');

const fixture = process.argv[2] ?? FIXTURE;
const map = assertMap(JSON.parse(readFileSync(join(ROOT, 'fixtures', fixture, 'map.json'), 'utf8')));
const practice = renderPractice(map);
writeFileSync(join(ROOT, OUT), practice.svg);

const hung = practice.callouts.map((callout) => `${String(callout.number)} ${callout.mark}`).join(', ');
process.stdout.write(`${OUT} from fixtures/${fixture}: balloons ${hung}\n`);
if (practice.missing.length > 0) {
  process.stdout.write(`no instance on this map, so no balloon: ${practice.missing.join(', ')}\n`);
}
