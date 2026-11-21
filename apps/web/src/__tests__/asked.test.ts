import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import { expect, test } from 'vitest';

import { instances } from 'scene';

import { askedOf, asksFor, namedBySize, slideWords } from '../asked.js';
import { marksOf } from '../marks.js';

/**
 * What the world writes over the field, only what it is asked for (D168): at
 * load nothing; the file or cell under the pointer, and the target of the
 * notice row the pointer is over, and nothing again once it leaves; a
 * storm's slot for the cell it hangs over or a file in it; and an opened
 * cell's tags and exports in its exploded view or under the pointer. The one
 * thing written unasked is the name of a file large enough on the screen
 * (D206 (detail-by-size)).
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', '..', 'libs', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));

const INDEX = 'libs/core/src/pm/index.ts';
const PM = 'folder:libs/core/src/pm';

test('at load nothing is asked for, a hovered file or a hovered notice row asks for its target, and leaving asks for nothing again', () => {
  expect([...askedOf(undefined, undefined)]).toEqual([]);
  expect([...askedOf(INDEX, undefined)]).toEqual([INDEX]);
  expect([...askedOf(undefined, PM)]).toEqual([PM]);
  expect([...askedOf(INDEX, PM)].toSorted()).toEqual([PM, INDEX].toSorted());
  expect([...askedOf(undefined, undefined)]).toEqual([]);
});

test("a tag is asked for by its own target, and a cell's by any file it holds, however deep, but a file's never by its cell", () => {
  const asks = asksFor(DEMO, askedOf(INDEX, undefined));
  expect(asks(INDEX)).toBe(true);
  expect(asks(PM)).toBe(true);
  expect(asks('package:libs/core')).toBe(true);
  expect(asks('libs/core/src/pm/slots.ts')).toBe(false);
  expect(asks('package:apps/cli')).toBe(false);
  const byCell = asksFor(DEMO, askedOf(PM, undefined));
  expect(byCell(PM)).toBe(true);
  expect(byCell(INDEX)).toBe(false);
  expect(asksFor(DEMO, askedOf(undefined, undefined))(PM)).toBe(false);
});

test("a storm's slot shows only while its cell, or a file in it, is asked for", () => {
  const storms = marksOf(DEMO).labels.filter((label) => label.kind === 'storm');
  expect(storms.map((label) => [label.target, label.text])).toEqual([[PM, 'test']]);
  const [storm] = storms;
  if (storm === undefined) return;
  expect(asksFor(DEMO, askedOf(undefined, undefined))(storm.target)).toBe(false);
  expect(asksFor(DEMO, askedOf(PM, undefined))(storm.target)).toBe(true);
  expect(asksFor(DEMO, askedOf(undefined, INDEX))(storm.target)).toBe(true);
  expect(asksFor(DEMO, askedOf('libs/core/src/util/text.ts', undefined))(storm.target)).toBe(false);
});

test("an opened cell's tags show as its exploded view spreads, or one at a time under the pointer, and its exports with them or under the pointer on the barrel", () => {
  const rest = slideWords(0, undefined, INDEX);
  expect([rest.tag(INDEX), rest.tag('libs/core/src/pm/slots.ts'), rest.exports]).toEqual([0, 0, 0]);
  const over = slideWords(0, 'libs/core/src/pm/slots.ts', INDEX);
  expect([over.tag('libs/core/src/pm/slots.ts'), over.tag(INDEX), over.exports]).toEqual([1, 0, 0]);
  const onBarrel = slideWords(0, INDEX, INDEX);
  expect([onBarrel.tag(INDEX), onBarrel.tag('libs/core/src/pm/slots.ts'), onBarrel.exports]).toEqual([1, 0, 1]);
  const spreading = slideWords(0.5, undefined, INDEX);
  expect([spreading.tag(INDEX), spreading.tag('libs/core/src/pm/slots.ts'), spreading.exports]).toEqual([0.5, 0.5, 0.5]);
  const spread = slideWords(1, 'libs/core/src/pm/slots.ts', undefined);
  expect([spread.tag(INDEX), spread.tag('libs/core/src/pm/slots.ts'), spread.exports]).toEqual([1, 1, 1]);
});

test("the selection's target stays asked for with nothing under the pointer, beside what the pointer and a row ask for, and inside an opened cell the selected file's tag stays written (D207 (click-selects))", () => {
  const SLOTS = 'libs/core/src/pm/slots.ts';
  expect([...askedOf(undefined, undefined, INDEX)]).toEqual([INDEX]);
  expect([...askedOf(SLOTS, PM, INDEX)].toSorted()).toEqual([PM, INDEX, SLOTS].toSorted());
  // Selected and hovered at once, the target is asked for once.
  expect([...askedOf(INDEX, undefined, INDEX)]).toEqual([INDEX]);
  // A selected file asks for its cell's storm as a hovered one does, and a selected cell for its own.
  const asks = asksFor(DEMO, askedOf(undefined, undefined, SLOTS));
  expect([asks(SLOTS), asks(PM), asks(INDEX)]).toEqual([true, true, false]);
  expect(asksFor(DEMO, askedOf(undefined, undefined, PM))(PM)).toBe(true);
  // On the slide, the selected file's tag is written in full at rest, the pointer's beside it, and the exports are not.
  const kept = slideWords(0, undefined, INDEX, SLOTS);
  expect([kept.tag(SLOTS), kept.tag(INDEX), kept.exports]).toEqual([1, 0, 0]);
  const both = slideWords(0, 'libs/core/src/pm/tools.ts', INDEX, SLOTS);
  expect([both.tag(SLOTS), both.tag('libs/core/src/pm/tools.ts'), both.tag(INDEX)]).toEqual([1, 1, 0]);
});

test("what a row of the chrome points at is asked for beside the pointer's, a notice row's and the selection's, and inside an opened cell its tag is written (D209 (selection-line))", () => {
  const SLOTS = 'libs/core/src/pm/slots.ts';
  const TOOLS = 'libs/core/src/pm/tools.ts';
  expect([...askedOf(undefined, undefined, undefined, SLOTS)]).toEqual([SLOTS]);
  expect([...askedOf(TOOLS, PM, INDEX, SLOTS)].toSorted()).toEqual([PM, INDEX, SLOTS, TOOLS].toSorted());
  // A row that points at the selection asks for it once, and a pointed module for its own storm.
  expect([...askedOf(undefined, undefined, INDEX, INDEX)]).toEqual([INDEX]);
  expect(asksFor(DEMO, askedOf(undefined, undefined, undefined, PM))(PM)).toBe(true);
  // On the slide, the pointed file's tag is written in full at rest beside the selection's, and no other's.
  const words = slideWords(0, undefined, INDEX, SLOTS, TOOLS);
  expect([words.tag(SLOTS), words.tag(TOOLS), words.tag(INDEX), words.exports]).toEqual([1, 1, 0, 0]);
  expect(slideWords(0, undefined, INDEX, undefined, TOOLS).tag(TOOLS)).toBe(1);
});

test('a file is named unasked once its radius on the screen reaches the threshold, where the view shows its centre: every file in view at none, and none at a threshold no file reaches (D206 (detail-by-size))', () => {
  const files = instances(DEMO);
  const layout = DEMO.terrain.layout ?? { width: 0, height: 0 };
  const whole = { x: 0, y: 0, width: layout.width, height: layout.height, pixelsPerUnit: 2 };
  const radius = new Map(files.map((file) => [file.id, file.r] as const));
  // At two pixels a unit and eighteen pixels, the files nine units across the radius and more, and no smaller one.
  const named = namedBySize(files, whole, 18);
  expect([...named].toSorted()).toEqual(files.filter((file) => file.r >= 9).map((file) => file.id).toSorted());
  expect(named.size).toBeGreaterThan(0);
  expect(named.size).toBeLessThan(files.length);
  // The threshold is met at the radius itself, and missed a hair past it.
  const doctor = 'apps/cli/src/doctor.ts';
  expect(namedBySize(files, whole, (radius.get(doctor) ?? 0) * 2).has(doctor)).toBe(true);
  expect(namedBySize(files, whole, (radius.get(doctor) ?? 0) * 2 + 0.01).has(doctor)).toBe(false);
  // Nearer, more of them pass it; at none every file in view is named; at a threshold out of reach none is.
  expect(namedBySize(files, { ...whole, pixelsPerUnit: 4 }, 18).size).toBeGreaterThan(named.size);
  expect(namedBySize(files, whole, 0).size).toBe(files.length);
  expect(namedBySize(files, { ...whole, pixelsPerUnit: 200 }, 1_000_000).size).toBe(0);
  // A file whose centre the view does not show is not named, however large it is drawn.
  const at = DEMO.terrain.layout?.positions[doctor] ?? { x: 0, y: 0, r: 0 };
  const beside = { x: at.x + 1, y: 0, width: layout.width, height: layout.height, pixelsPerUnit: 8 };
  expect(namedBySize(files, beside, 18).has(doctor)).toBe(false);
  expect(namedBySize(files, { ...beside, x: at.x - 1 }, 18).has(doctor)).toBe(true);
});
