import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson } from 'core';
import {
  CALLOUT_R,
  CHROME_GROUND,
  CROSSING_OPACITY,
  CROSSING_PAD,
  HATCH_WIDTH,
  LEGEND_SAMPLE_R,
  ORGANELLE_FILL,
  REACH_DECAY,
  REACH_GLOW,
  REACH_ORIGIN_OPACITY,
  STIPPLE_DOT,
  TEXTURE_INK,
  TEXTURE_MAX_OPACITY,
} from 'scene';
import { expect, test } from 'vitest';

import { LEGEND, drawLegend } from '../legend.js';
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

test('the demo carries every mark, so its practice render hangs every balloon in the legend\'s order', () => {
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
    expect(practice.callouts.map((callout) => callout.number)).toEqual([1, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14]);
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

/** One channel of a `#rrggbb` colour. */
function channelOf(hex: string, from: number): number {
  return Number.parseInt(hex.slice(from, from + 2), 16);
}

/** A `#rrggbb` colour laid at `share` over another, as the eye sees it: worked here by hand, so the test does not borrow the inset's own sum. */
function laid(top: string, under: string, share: number): string {
  return `#${[1, 3, 5].map((from) => Math.round(channelOf(top, from) * share + channelOf(under, from) * (1 - share)).toString(16).padStart(2, '0')).join('')}`;
}

/** One row of the inset drawn at the origin, by its mark's id. */
function row(id: string): string {
  const inset = drawLegend(0, 0, 280).markup;
  const start = inset.indexOf(`<g data-mark="${id}">`);
  expect(start, `${id} has a row`).toBeGreaterThanOrEqual(0);
  const next = inset.indexOf('<g data-mark=', start + 1);
  return inset.slice(start, next === -1 ? inset.indexOf('<g data-key=') : next);
}

/** A number attribute of every element of one tag in a row. */
function attrs(markup: string, tag: string, name: string): readonly number[] {
  return [...markup.matchAll(new RegExp(`<${tag} [^>]*?\\b${name}="([\\d.-]+)"`, 'g'))].map(([, value]) => Number(value));
}

/** The centre of the file a row's sample is laid on, past the row's balloon. */
function fileOf(markup: string): readonly [number, number] {
  const file = new RegExp(`<circle cx="([\\d.-]+)" cy="([\\d.-]+)" r="${String(LEGEND_SAMPLE_R)}" fill="${ORGANELLE_FILL}"`).exec(markup);
  expect(file, 'the row draws its file').not.toBeNull();
  return [Number(file?.[1]), Number(file?.[2])];
}

test('the reach, its crossings and the two history textures each have a row after the ten marks, in the words a reader hears (D166)', () => {
  expect(LEGEND.slice(10)).toEqual([
    { id: 'reach', words: 'warm light: the reach, dimmer each module out' },
    { id: 'crossing', words: 'lit halo: where the reach leaves a module' },
    { id: 'hatching', words: 'hatching: how much of it was rewritten lately' },
    { id: 'stipple', words: 'stipple: how many of its commits fixed bugs' },
  ]);
});

test("the reach's row steps the warm glow down a module at a time, each block the share the world lights that hop at, laid flat on the chrome", () => {
  const reach = row('reach');
  expect(attrs(reach, 'rect', 'data-hops')).toEqual([0, 1, 2]);
  const fills = [...reach.matchAll(/<rect [^>]*fill="(#[0-9a-f]{6})"/g)].map(([, fill]) => fill);
  expect(fills).toEqual([0, 1, 2].map((hops) => laid(REACH_GLOW, CHROME_GROUND, REACH_ORIGIN_OPACITY * REACH_DECAY ** hops)));
  expect(new Set(fills).size).toBe(3);
});

test("the crossing's row is the warm disc past a file's edge at the crossing's strength, flat, round the file's outline", () => {
  const crossing = row('crossing');
  expect(crossing).toContain(`r="${String(LEGEND_SAMPLE_R + CROSSING_PAD)}" fill="${laid(REACH_GLOW, CHROME_GROUND, CROSSING_OPACITY)}"`);
  expect(crossing).toMatch(new RegExp(`r="${String(LEGEND_SAMPLE_R)}" fill="none" stroke=`));
});

test("churn's row hatches a file with the world's diagonals and bug-fix rate's stipples it with the world's dots, in the history's ink, inside the file", () => {
  const ink = laid(TEXTURE_INK, ORGANELLE_FILL, TEXTURE_MAX_OPACITY);
  const hatching = row('hatching');
  const [cx, cy] = fileOf(hatching);
  const lines = [...hatching.matchAll(/<line x1="([\d.-]+)" y1="([\d.-]+)" x2="([\d.-]+)" y2="([\d.-]+)" stroke="(#[0-9a-f]{6})" stroke-width="([\d.]+)"/g)];
  expect(lines.length).toBeGreaterThan(1);
  for (const [, x1, y1, x2, y2, stroke, width] of lines) {
    expect(stroke).toBe(ink);
    expect(Number(width)).toBe(HATCH_WIDTH);
    // A diagonal rising to the right, both ends on the file's disc.
    expect(Number(x2) - Number(x1)).toBeCloseTo(Number(y1) - Number(y2), 1);
    for (const [x, y] of [[x1, y1], [x2, y2]]) expect(Math.hypot(Number(x) - cx, Number(y) - cy)).toBeLessThanOrEqual(LEGEND_SAMPLE_R);
  }

  const stipple = row('stipple');
  const [sx, sy] = fileOf(stipple);
  const dots = [...stipple.matchAll(/<circle cx="([\d.-]+)" cy="([\d.-]+)" r="([\d.]+)" fill="(#[0-9a-f]{6})"\/>/g)];
  expect(dots.length).toBeGreaterThan(1);
  for (const [, x, y, r, fill] of dots) {
    expect(Number(r)).toBe(STIPPLE_DOT);
    expect(fill).toBe(ink);
    expect(Math.hypot(Number(x) - sx, Number(y) - sy) + STIPPLE_DOT).toBeLessThanOrEqual(LEGEND_SAMPLE_R);
  }
});

test('the inset stays flat with its new rows: no opacity, no filter, no pattern', () => {
  const inset = drawLegend(0, 0, 280).markup;
  for (const forbidden of ['opacity=', 'url(#', 'filter=', '<pattern']) expect(inset).not.toContain(forbidden);
});

test('the practice map hangs a balloon on the brightest reach, a crossing and each texture, on the demo', () => {
  const callouts = renderPractice(demo()).callouts;
  expect(callouts.filter((callout) => callout.number > 10).map((callout) => callout.mark)).toEqual(['reach', 'crossing', 'hatching', 'stipple']);
});
