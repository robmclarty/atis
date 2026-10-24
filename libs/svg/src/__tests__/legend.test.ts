import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson } from 'core';
import { CALLOUT_R } from 'scene';
import { expect, test } from 'vitest';

import { LEGEND } from '../legend.js';
import { FINDERS, calloutsOf, renderPractice } from '../practice.js';
import { frameOf } from '../render.js';

/**
 * The legend's one list of marks is read three ways: the inset on every
 * map, the practice map's balloons, and the numbered list in
 * `docs/glance-test.md` that every reader hears (D87, D125). These pin the
 * three to one another. Reading the doc and the fixtures with `node:fs` is
 * fine in a test; C1 keeps Node out of the code the package ships.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const CORE_FIXTURES = join(ROOT, 'libs', 'core', 'fixtures');

function demo(): MapJson {
  return assertMap(JSON.parse(readFileSync(join(CORE_FIXTURES, 'demo', 'map.json'), 'utf8')));
}

function fixture(name: string): MapJson {
  return assertMap(JSON.parse(readFileSync(join(ROOT, 'fixtures', name, 'map.json'), 'utf8')));
}

/** The numbered marks in the current legend of `docs/glance-test.md`: its `1. **words**` lines, in order. */
function docMarks(): readonly (readonly [number, string])[] {
  const doc = readFileSync(join(ROOT, 'docs', 'glance-test.md'), 'utf8');
  const start = doc.indexOf('## The legend (D66, D87)');
  expect(start, 'the current legend is in the doc').toBeGreaterThanOrEqual(0);
  const end = doc.indexOf('\n## ', start + 1);
  const section = doc.slice(start, end === -1 ? doc.length : end);
  return [...section.matchAll(/^(\d+)\. \*\*(.+?)\*\*/gm)].map(([, number, words]) => [Number(number), words ?? ''] as const);
}

test('the doc a reader hears numbers the same marks, in the same words, as the inset and the balloons (D125)', () => {
  expect(docMarks()).toEqual(LEGEND.map((mark, index) => [index + 1, mark.words]));
});

test('the notch reads as a mutant no test killed, whether it survived the tests or none reached it (D143)', () => {
  expect(LEGEND.find((mark) => mark.id === 'notch')?.words).toBe('notch: a mutant no test killed');
});

test('every mark the legend keys has a finder, so a balloon can be hung on it', () => {
  expect(Object.keys(FINDERS).toSorted()).toEqual(LEGEND.map((mark) => mark.id).toSorted());
});

test('the demo carries every mark, so its practice render hangs all ten balloons in the legend\'s order', () => {
  const practice = renderPractice(demo());
  expect(practice.missing).toEqual([]);
  expect(practice.callouts.map((callout) => [callout.number, callout.mark])).toEqual(LEGEND.map((mark, index) => [index + 1, mark.id]));
  const drawn = [...practice.svg.matchAll(/<g data-callout="(\d+)" data-mark="([^"]+)">/g)].map(([, number, mark]) => [Number(number), mark]);
  expect(drawn).toEqual(LEGEND.map((mark, index) => [index + 1, mark.id]));
  expect(renderPractice(demo()).svg).toBe(practice.svg);
});

test('each balloon stands off its mark, on the field, clear of the notices\' marks and of every other balloon', () => {
  for (const map of [demo(), fixture('retake-5')]) {
    const { layout, chrome } = frameOf(map);
    const callouts = calloutsOf(map, layout, chrome);
    expect(callouts.length).toBeGreaterThan(0);
    for (const [index, { mark, at, balloon }] of callouts.entries()) {
      const [x, y] = balloon;
      expect(Math.hypot(x - at[0], y - at[1]), `${mark} stands off its mark`).toBeGreaterThan(CALLOUT_R);
      // On the field: below the HUD strip and left of the notice column.
      expect(y - CALLOUT_R, `${mark} is below the HUD`).toBeGreaterThanOrEqual(chrome.worldY);
      expect(x + CALLOUT_R, `${mark} is left of the column`).toBeLessThanOrEqual(layout.width);
      for (const box of chrome.marks) {
        const apart = x + CALLOUT_R <= box.x || x - CALLOUT_R >= box.x + box.width || y + CALLOUT_R <= box.y || y - CALLOUT_R >= box.y + box.height;
        expect(apart, `${mark}'s balloon is off the notices' marks`).toBe(true);
      }
      for (const other of callouts.slice(index + 1)) {
        expect(Math.hypot(other.balloon[0] - x, other.balloon[1] - y), `${mark} and ${other.mark} stand apart`).toBeGreaterThanOrEqual(2 * CALLOUT_R);
      }
    }
  }
});

/** A real fixture's practice render re-cuts every skin core drew, a second or two on its own and more under coverage. */
const PRACTICE_RENDER_MS = 30_000;

test(
  'a fixture without a mark gets no balloon for it, and the render says which marks those are',
  () => {
    // retake-5 has every skin closed and no file outside its coverage report.
    const practice = renderPractice(fixture('retake-5'));
    expect(practice.missing).toEqual(['lit-arc', 'unmeasured']);
    expect(practice.callouts.map((callout) => callout.number)).toEqual([1, 3, 4, 5, 6, 7, 8, 9]);
  },
  PRACTICE_RENDER_MS,
);

test('the balloons are flat chrome laid over everything, and the committed practice map carries them and the inset', () => {
  const practice = renderPractice(demo());
  const callouts = practice.svg.slice(practice.svg.indexOf('<g id="callouts"'));
  expect(practice.svg.indexOf('<g id="callouts"')).toBeGreaterThan(practice.svg.indexOf('<g id="chrome"'));
  for (const forbidden of ['opacity=', 'url(#', 'filter=', '<animate', 'stroke-dasharray']) expect(callouts).not.toContain(forbidden);

  const committed = readFileSync(join(ROOT, 'docs', 'glance-practice.svg'), 'utf8');
  expect(committed.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
  expect(committed).toContain('<g id="legend">');
  expect([...committed.matchAll(/<g data-callout="(\d+)"/g)].length).toBeGreaterThan(0);
});
