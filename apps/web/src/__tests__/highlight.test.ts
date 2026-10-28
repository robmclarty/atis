import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson } from 'core';
import { expect, test } from 'vitest';

import { litIn, pushedHighlight } from '../highlight.js';
import { destinationOf } from '../walk.js';

/** What `atis mcp` asks the open tab to show (D178): what the page reads off its socket, and what each target lights in the map it draws. */
const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', '..', 'libs', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));

test('the socket carries a highlight by its kind, naming a file or a notice by its rank, one of them; anything else is dropped', () => {
  expect(pushedHighlight('{"kind":"highlight","file":"libs/core/src/pm/tools.ts"}')).toEqual({ kind: 'file', path: 'libs/core/src/pm/tools.ts' });
  expect(pushedHighlight('{"kind":"highlight","notice":2}')).toEqual({ kind: 'notice', rank: 2 });
  const dropped = [
    '{"kind":"map","file":"a.ts"}',
    '{"kind":"highlight"}',
    '{"kind":"highlight","file":"a.ts","notice":1}',
    '{"kind":"highlight","file":""}',
    '{"kind":"highlight","notice":0}',
    '{"kind":"highlight","notice":1.5}',
    '{"kind":"highlight","notice":"1"}',
    'not json',
    '[]',
  ];
  for (const text of dropped) expect(pushedHighlight(text), text).toBeUndefined();
});

test('a file lights at its stop on the walk, and a notice where its row leads, its target written and its flare asked for by index', () => {
  const tools = DEMO.terrain.organelles.find((organelle) => organelle.id === 'libs/core/src/pm/tools.ts');
  if (tools === undefined) throw new Error('the demo lost pm/tools.ts');
  expect(litIn(DEMO, { kind: 'file', path: tools.id })).toEqual({ destination: { kind: 'stop', stop: { kind: 'organelle', path: tools.id, cell: tools.cell } }, target: tools.id });
  const destination = destinationOf(DEMO, 5);
  expect(destination?.kind).toBe('stop');
  expect(litIn(DEMO, { kind: 'notice', rank: 5 })).toEqual({ destination, target: 'apps/cli/src/doctor.ts', flare: 4 });
});

test('a notice on the shore leads to its group\'s block in the rail (D153)', () => {
  const [first, ...rest] = DEMO.notices;
  if (first === undefined) throw new Error('the demo ranks no notice');
  const shore: MapJson = { ...DEMO, notices: [{ ...first, target: 'README.md' }, ...rest] };
  expect(litIn(shore, { kind: 'notice', rank: 1 })).toEqual({ destination: { kind: 'group', group: 'docs' }, target: 'README.md', flare: 0 });
});

test('what the map drawn does not place lights nothing: a shore file, a file it lacks, or a notice past its last', () => {
  expect(litIn(DEMO, { kind: 'file', path: 'README.md' })).toBeUndefined();
  expect(litIn(DEMO, { kind: 'file', path: 'libs/core/src/nope.ts' })).toBeUndefined();
  expect(litIn(DEMO, { kind: 'notice', rank: DEMO.notices.length + 1 })).toBeUndefined();
});
