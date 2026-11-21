// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson } from 'core';
import { expect, test, vi } from 'vitest';

import { litIn, pushedHighlight, revealGroup } from '../highlight.js';
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

test("a reveal of a shore group asks the shore's fold open by its bare event before it looks for the block, so a shore folded by hand opens for an agent's highlight (D285 (unfold-by-event))", () => {
  const rail = document.createElement('div');
  rail.dataset['rail'] = '';
  document.body.append(rail);
  const asked: unknown[] = [];
  const scrolled = vi.fn();
  // A folded shore holds no block until it hears its name, and has drawn them by the time the event returns, as the chrome's fold does.
  const hear = (event: Event): void => {
    asked.push(event instanceof CustomEvent ? event.detail : undefined);
    const block = document.createElement('div');
    block.dataset['group'] = 'docs';
    block.scrollIntoView = scrolled;
    rail.append(block);
  };
  document.addEventListener('atis:unfold', hear);
  try {
    expect(document.querySelector('[data-rail] [data-group="docs"]')).toBeNull();
    revealGroup('docs');
    expect(asked).toEqual(['shore']);
    // The block is scrolled to in the same turn, with no frame waited for.
    expect(scrolled).toHaveBeenCalledTimes(1);
    expect(scrolled).toHaveBeenCalledWith({ block: 'nearest' });
  } finally {
    document.removeEventListener('atis:unfold', hear);
    rail.remove();
  }
});
