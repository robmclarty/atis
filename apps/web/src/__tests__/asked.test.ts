import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import { expect, test } from 'vitest';

import { askedOf, asksFor, slideWords } from '../asked.js';
import { marksOf } from '../marks.js';

/**
 * What the world writes over the field, only what it is asked for (D168): at
 * load nothing; the file or cell under the pointer, and the target of the
 * notice row the pointer is over, and nothing again once it leaves; a
 * storm's slot for the cell it hangs over or a file in it; and an opened
 * cell's tags and exports in its exploded view or under the pointer.
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
