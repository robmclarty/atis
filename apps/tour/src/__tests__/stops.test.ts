import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson } from 'core';
import { expect, test } from 'vitest';

import { stopsSchema } from '../stops.js';

/**
 * The shape the tour's model answers in, held to the map it read (D183):
 * every notice explained once by its rank, each stop's sentence words, and
 * its target a file or a cell the map places or the notice's own target, so
 * the world can fly to every stop. The JSON Schema the model is shown says
 * the same, as far as JSON Schema can.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO: MapJson = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', '..', 'libs', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));

const ALL = [1, 2, 3, 4, 5, 6].map((notice) => ({ notice, target: DEMO.notices[notice - 1]?.target ?? '', sentence: `Stop ${String(notice)}.` }));

const check = (map: MapJson, value: unknown): unknown => stopsSchema(map)['~standard'].validate(value);
const messages = (result: unknown): readonly string[] => (typeof result === 'object' && result !== null && 'issues' in result && Array.isArray(result.issues) ? result.issues.map((issue: { readonly message: string }) => issue.message) : []);

test('an answer that explains every notice once, at a target the map places, is read as the stops, in its own order', () => {
  const reversed = ALL.toReversed();
  expect(check(DEMO, { stops: reversed })).toEqual({ value: { stops: reversed } });
  // A file or a cell the map places is a target too, and a sentence is trimmed.
  const elsewhere = ALL.map((stop, index) => (index === 0 ? { ...stop, target: 'folder:libs/core/src/pm', sentence: '  Look at the folder.  ' } : stop));
  expect(check(DEMO, { stops: elsewhere })).toEqual({ value: { stops: elsewhere.map((stop, index) => (index === 0 ? { ...stop, sentence: 'Look at the folder.' } : stop)) } });
});

test('an answer that drops or repeats a notice, names one the map lacks, or aims where the world cannot fly is no tour', () => {
  expect(messages(check(DEMO, { stops: ALL.slice(1) }))).toEqual(['every notice is explained: missing 1', 'every notice is explained once: 6 stops, not 5']);
  expect(messages(check(DEMO, { stops: [...ALL.slice(1), ALL[1]] }))).toEqual(['every notice is explained: missing 1']);
  expect(messages(check(DEMO, { stops: [...ALL, { ...ALL[0], notice: 7 }] }))).toContain('notice is a rank from 1 to 6');
  expect(messages(check(DEMO, { stops: ALL.map((stop, index) => (index === 0 ? { ...stop, target: 'nowhere.ts' } : stop)) }))).toEqual(['target is a file or a cell the map places, or the target of the notice the stop explains']);
  expect(messages(check(DEMO, { stops: ALL.map((stop, index) => (index === 0 ? { ...stop, sentence: ' ' } : stop)) }))).toEqual(['sentence is one sentence of words']);
  expect(messages(check(DEMO, { stops: [...ALL.slice(1), 'stop'] }))).toContain('a stop is an object');
  expect(messages(check(DEMO, 'stops'))).toEqual(['the answer is an object holding a stops array']);
  expect(messages(check(DEMO, { stops: {} }))).toEqual(['the answer is an object holding a stops array']);
});

test("a notice whose target the map does not place, a shore file, may still be its stop's target", () => {
  const shore = { ...DEMO, notices: DEMO.notices.map((notice, index) => (index === 0 ? { ...notice, target: 'README.md' } : notice)) };
  const stops = ALL.map((stop, index) => (index === 0 ? { ...stop, target: 'README.md' } : stop));
  expect(check(shore, { stops })).toEqual({ value: { stops } });
  // But only for the notice that names it.
  expect(messages(check(shore, { stops: stops.map((stop, index) => (index === 1 ? { ...stop, target: 'README.md' } : stop)) }))).toHaveLength(1);
});

test('the JSON Schema the model is shown asks for one stop per notice, each a rank, a target and a sentence', () => {
  const json = stopsSchema(DEMO)['~standard'].jsonSchema.output({ target: 'draft-2020-12' });
  expect(json).toMatchObject({
    type: 'object',
    required: ['stops'],
    properties: { stops: { type: 'array', minItems: 6, maxItems: 6, items: { required: ['notice', 'target', 'sentence'], properties: { notice: { type: 'integer', minimum: 1, maximum: 6 } } } } },
  });
  expect(stopsSchema(DEMO)['~standard'].jsonSchema.input({ target: 'draft-07' })).toEqual(json);
  expect(stopsSchema(DEMO)['~standard'].vendor).toBe('atis-tour');
});
