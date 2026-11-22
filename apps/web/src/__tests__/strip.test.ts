import { expect, test } from 'vitest';

import { lineAt, spansOf, stripKey, stripMarked, stripOf } from '../strip.js';

test('line numbers run together into spans of neighbours, in order, each line once', () => {
  expect(spansOf([9, 8, 25, 8, 31, 26])).toEqual([
    { from: 8, to: 9 },
    { from: 25, to: 26 },
    { from: 31, to: 31 },
  ]);
  expect(spansOf([])).toEqual([]);
});

test("a strip holds each mark as a span inside the file's own lines (D348 (line-strip))", () => {
  const strip = stripOf({
    lines: 40,
    functions: [
      { name: 'outer', line: 2, lines: 20, depth: 0 },
      { name: 'inner', line: 5, lines: 3, depth: 1 },
      // One that reaches past the text is cut to it, and one wholly past it is left out.
      { name: 'tail', line: 38, lines: 10, depth: 0 },
      { name: 'beyond', line: 50, lines: 2, depth: 0 },
    ],
    hunks: [
      { start: 6, count: 4 },
      // A hunk that only deleted lines wrote none.
      { start: 19, count: 0 },
    ],
    untested: [8, 9, 44],
    mutants: [
      { line: 8, status: 'Survived' },
      { line: 41, status: 'Survived' },
    ],
  });
  expect(strip.lines).toBe(40);
  expect(strip.functions).toEqual([
    { name: 'outer', depth: 0, from: 2, to: 21 },
    { name: 'inner', depth: 1, from: 5, to: 7 },
    { name: 'tail', depth: 0, from: 38, to: 40 },
  ]);
  expect(strip.changed).toEqual([{ from: 6, to: 9 }]);
  expect(strip.untested).toEqual([{ from: 8, to: 9 }]);
  expect(strip.mutants).toEqual([{ line: 8, status: 'Survived' }]);
  expect(stripMarked(strip)).toBe(true);
});

test('a file with nothing measured on it has a bare strip, of one line at the least', () => {
  const strip = stripOf({ lines: 0, functions: [], hunks: [], untested: [], mutants: [] });
  expect(strip).toEqual({ lines: 1, functions: [], changed: [], untested: [], mutants: [] });
  expect(stripMarked(strip)).toBe(false);
  expect(stripKey(strip)).toBe('');
});

test('a point along the strip names a line, the first at its head and the last at its foot', () => {
  const strip = { lines: 200 };
  expect(lineAt(strip, 0)).toBe(1);
  expect(lineAt(strip, 0.5)).toBe(101);
  expect(lineAt(strip, 1)).toBe(200);
  expect(lineAt(strip, -3)).toBe(1);
  expect(lineAt(strip, 7)).toBe(200);
});

test('the key names only the lanes that hold a mark, in the order they lie', () => {
  const marked = stripOf({ lines: 10, functions: [{ name: 'f', line: 1, lines: 4, depth: 0 }], hunks: [{ start: 2, count: 1 }], untested: [2], mutants: [{ line: 2, status: 'Survived' }] });
  expect(stripKey(marked)).toBe('blocks: functions · cyan: lines the change wrote · light: changed lines no test ran · tick: a mutant no test killed');
  expect(stripKey(stripOf({ lines: 10, functions: [], hunks: [{ start: 2, count: 1 }], untested: [], mutants: [] }))).toBe('cyan: lines the change wrote');
});
