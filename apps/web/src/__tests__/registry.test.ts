import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as scene from 'scene';
import { MOTION_TOKENS, createScheduler } from 'scene';
import { expect, test } from 'vitest';

import { BLOOM, CAMERA, HOVER, INTERIOR, LEVELS, LIGHTING, MINIMAP, NOTICE, PLANET, SKIN, SKY, SPACE, WALK, WEATHER } from '../materials.js';
import { MATERIALS_TITLE, SECTIONS, createRegistry, kindOf } from '../registry.js';
import type { Store } from '../registry.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const DESIGN = readFileSync(join(HERE, '..', '..', '..', '..', 'docs', 'design.md'), 'utf8');

/** The design doc's token tables, by the heading each sits under: the sections the panel lists by (D156). */
const documented = (): ReadonlyMap<string, readonly string[]> => {
  const tables = new Map<string, string[]>();
  let heading = '';
  for (const line of DESIGN.split('\n')) {
    const title = /^## (.+)$/.exec(line);
    if (title?.[1] !== undefined) heading = title[1];
    const row = /^\| `([A-Z][A-Z0-9_]*(?:\.[a-z][A-Za-z0-9]*)?)` \|/.exec(line);
    if (row?.[1] !== undefined) tables.set(heading, [...(tables.get(heading) ?? []), row[1]]);
  }
  return tables;
};

/** A store in memory, standing for the tab's session. */
const memory = (text: string | null = null): Store & { readonly text: () => string | null } => {
  let held = text;
  return { read: () => held, write: (next) => (held = next), text: () => held };
};

test("the panel's sections are the design doc's headings, each listing its table's tokens in order", () => {
  const tables = documented();
  expect([...tables.keys()].length).toBeGreaterThan(5);
  for (const [heading, names] of tables) {
    const section = SECTIONS.find((each) => each.title === heading);
    expect(section, `the registry has no section for the doc's "${heading}"`).toBeDefined();
    expect(section?.names).toEqual(names);
  }
  // Every section is the doc's, the world's materials included (step 44).
  expect(SECTIONS.filter((section) => !tables.has(section.title)).map((section) => section.title)).toEqual([]);
  const motion = SECTIONS.findIndex((section) => section.title === 'Motion');
  expect(SECTIONS[motion - 1]?.title).toBe(MATERIALS_TITLE);
});

/** A material object's fields as the registry names them. */
const fields = (object: string, from: object): string[] => Object.keys(from).map((field) => `${object}.${field}`);

test("the materials section lists every field of the world's skin, space, planet, lights, sky, bloom, weather, notices, relief, levels and camera, hover and walk, the minimap's, the slide's and the wiring's", () => {
  const section = SECTIONS.find((each) => each.title === MATERIALS_TITLE);
  expect(section?.names).toEqual([
    ...fields('SKIN', SKIN),
    ...fields('SPACE', SPACE),
    ...fields('PLANET', PLANET),
    ...fields('LIGHTING', LIGHTING),
    ...fields('SKY', SKY),
    ...fields('BLOOM', BLOOM),
    ...fields('WEATHER', WEATHER),
    ...fields('NOTICE', NOTICE),
    ...fields('RELIEF', scene.RELIEF),
    ...fields('LEVELS', LEVELS),
    ...fields('CAMERA', CAMERA),
    ...fields('HOVER', HOVER),
    ...fields('WALK', WALK),
    ...fields('MINIMAP', MINIMAP),
    ...fields('INTERIOR', INTERIOR),
    ...fields('WIRING', scene.WIRING_SPACING),
  ]);
});

test('every listed token rests at a value, named once', () => {
  const registry = createRegistry();
  expect(new Set(registry.names).size).toBe(registry.names.length);
  for (const name of registry.names) expect(registry.rest(name), `${name} rests nowhere`).toBeDefined();
  expect(registry.rest('FLARE_MS')).toBe(scene.FLARE_MS);
  expect(registry.rest('SKIN.roughness')).toBe(SKIN.roughness);
});

test('a token moves through get, the changes and the live view, and comes back to rest', () => {
  const registry = createRegistry();
  const motion = registry.view(MOTION_TOKENS);
  expect(registry.changes()).toEqual([]);
  registry.set('FLARE_MS', 500);
  expect(registry.get('FLARE_MS')).toBe(500);
  expect(motion.FLARE_MS).toBe(500);
  expect(registry.rest('FLARE_MS')).toBe(scene.FLARE_MS);
  expect(registry.changes()).toEqual([{ name: 'FLARE_MS', from: scene.FLARE_MS, to: 500 }]);
  registry.set('FLARE_MS', scene.FLARE_MS);
  expect(registry.changes()).toEqual([]);
  expect(motion.FLARE_MS).toBe(scene.FLARE_MS);
});

test("a material's fields move through its own view, and the other objects' do not", () => {
  const registry = createRegistry();
  const skin = registry.view(SKIN, 'SKIN');
  const lighting = registry.view(LIGHTING, 'LIGHTING');
  registry.set('SKIN.roughness', 0.7);
  expect(skin.roughness).toBe(0.7);
  expect(skin.fieldAlbedo).toBe(SKIN.fieldAlbedo);
  expect(lighting).toEqual(LIGHTING);
  expect(Object.keys(skin)).toEqual(Object.keys(SKIN));
  expect(registry.view(MOTION_TOKENS)).not.toHaveProperty('roughness');
  expect({ ...skin }).toEqual({ ...SKIN, roughness: 0.7 });
});

test('subscribers hear each token as it moves, and a reset puts them all back', () => {
  const registry = createRegistry();
  const heard: string[] = [];
  const stop = registry.subscribe((name) => heard.push(name));
  registry.set('SETTLE_MS', 300);
  registry.set('CHROME_INK', '#ffffff');
  expect(heard).toEqual(['SETTLE_MS', 'CHROME_INK']);
  registry.reset('SETTLE_MS');
  expect(registry.get('SETTLE_MS')).toBe(scene.SETTLE_MS);
  registry.reset();
  expect(registry.changes()).toEqual([]);
  expect(heard).toEqual(['SETTLE_MS', 'CHROME_INK', 'SETTLE_MS', 'CHROME_INK']);
  stop();
  registry.set('SETTLE_MS', 300);
  expect(heard).toHaveLength(4);
});

test('the changes last for the session through the store, and a stale or mistyped entry is dropped', () => {
  const store = memory();
  const first = createRegistry(store);
  first.set('FLARE_MS', 500);
  first.set('SKIN.tissueAlbedo', '#334455');
  expect(JSON.parse(store.text() ?? '{}')).toEqual({ FLARE_MS: 500, 'SKIN.tissueAlbedo': '#334455' });
  const second = createRegistry(store);
  expect(second.get('FLARE_MS')).toBe(500);
  expect(second.get('SKIN.tissueAlbedo')).toBe('#334455');
  second.reset();
  expect(JSON.parse(store.text() ?? '{}')).toEqual({});

  const stale = createRegistry(memory(JSON.stringify({ RETIRED_TOKEN: 1, FLARE_MS: 'fast', CHROME_INK: 'red', SETTLE_MS: 300, JIGGLE_MS: scene.JIGGLE_MS })));
  expect(stale.changes()).toEqual([{ name: 'SETTLE_MS', from: scene.SETTLE_MS, to: 300 }]);
  expect(createRegistry(memory('not json')).changes()).toEqual([]);
  expect(createRegistry(memory('[1]')).changes()).toEqual([]);
});

test('a name the registry does not know is refused, and so is a value of another kind', () => {
  const registry = createRegistry();
  expect(() => registry.set('FLARE_WIDTH', 1)).toThrow('no token is named FLARE_WIDTH');
  expect(() => registry.set('FLARE_MS', 'fast')).toThrow('FLARE_MS is a number, not fast');
  expect(() => registry.set('CHROME_INK', 'red')).toThrow('CHROME_INK is a colour, not red');
  expect(() => registry.set('SHAPE_PULSE_HZ', [1, 'two'])).toThrow('SHAPE_PULSE_HZ is a numbers, not [1,"two"]');
  expect(registry.changes()).toEqual([]);
});

test('the version counts every move, for the chrome to re-render on', () => {
  const registry = createRegistry();
  expect(registry.version()).toBe(0);
  registry.set('FLARE_MS', 500);
  registry.set('FLARE_MS', 400);
  registry.reset();
  expect(registry.version()).toBe(3);
});

test('the scheduler reads its tokens through the registry: a settle shortened mid-flight lands sooner', () => {
  const registry = createRegistry();
  let now = 0;
  const scheduler = createScheduler({ clock: () => now, seed: 7, tiers: ['primary'], reduced: false, tokens: registry.view(MOTION_TOKENS) });
  scheduler.load();
  now = 100;
  expect(scheduler.frame().lift).toBeGreaterThan(0);
  registry.set('SETTLE_MS', 50);
  expect(scheduler.frame().lift).toBe(0);
  registry.set('SETTLE_MS', 1000);
  now = 600;
  expect(scheduler.frame().lift).toBeGreaterThan(0);
  registry.set('SETTLE_LIFT', 0);
  expect(scheduler.frame().lift).toBe(0);
});

test('a kind is read from the value, which picks the control', () => {
  expect(kindOf(3)).toBe('number');
  expect(kindOf('#5fd8ea')).toBe('colour');
  expect(kindOf('#5FD8EA')).toBe('colour');
  expect(kindOf('#fff')).toBe('text');
  expect(kindOf('3 2')).toBe('text');
  expect(kindOf([0, 0.25, 0.4])).toBe('numbers');
  expect(kindOf([{ arms: 0 }])).toBe('json');
  expect(kindOf({ a: 1 })).toBe('json');
});
