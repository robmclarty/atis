import { expect, test } from 'vitest';

import { el, escapeMarkup, num, serialize } from '../el.js';

test('attributes and text are escaped, and an undefined attribute is left out', () => {
  const built = el('text', { 'data-id': 'a<b>&"c\'d".ts', x: 1.5, hidden: undefined }, ['x < y & "z"']);
  expect(built.markup).toBe('<text data-id="a&lt;b&gt;&amp;&quot;c&#39;d&quot;.ts" x="1.5">x &lt; y &amp; &quot;z&quot;</text>');
});

test('an element with no children closes in place, and markup children are nested one per line', () => {
  const leaf = el('rect', { x: 0, y: 0 });
  expect(leaf.markup).toBe('<rect x="0" y="0"/>');
  const nested = el('g', { id: 'a' }, [el('g', { id: 'b' }, [leaf]), leaf]);
  expect(nested.markup).toBe(['<g id="a">', '  <g id="b">', '    <rect x="0" y="0"/>', '  </g>', '  <rect x="0" y="0"/>', '</g>'].join('\n'));
});

test('a raw string is never nested as markup: the same characters in a child are text', () => {
  const smuggled = el('g', {}, ['<script>alert(1)</script>']);
  expect(smuggled.markup).not.toContain('<script>');
  expect(smuggled.markup).toContain('&lt;script&gt;');
});

test('numbers are written at two decimals with no trailing zeros, and -0 as 0', () => {
  expect(num(1)).toBe('1');
  expect(num(1.5)).toBe('1.5');
  expect(num(1.005)).toBe('1');
  expect(num(2.345)).toBe('2.35');
  expect(num(-0)).toBe('0');
  expect(num(-0.001)).toBe('0');
});

test('escapeMarkup leaves everything but the five unsafe characters alone', () => {
  expect(escapeMarkup('src/pm/tools.ts')).toBe('src/pm/tools.ts');
  expect(escapeMarkup('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;');
});

test('serialize ends the file with exactly one newline', () => {
  expect(serialize(el('svg'))).toBe('<svg/>\n');
});
