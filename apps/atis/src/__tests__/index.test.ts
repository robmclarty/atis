import { readFileSync } from 'node:fs';

import { expect, test } from 'vitest';

import { NAME, USAGE, VERSION } from '../index.js';

test('the version constant matches package.json', () => {
  const manifest = JSON.parse(
    readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
  ) as { name: string; version: string; bin: Record<string, string> };
  expect(manifest.name).toBe(`@robmclarty/${NAME}`);
  expect(Object.keys(manifest.bin)).toEqual([NAME]);
  expect(manifest.version).toBe(VERSION);
});

test('the usage text names every flag the bin parses', () => {
  for (const flag of [
    '--repo <path>',
    '--base <ref>',
    '--last-commit',
    '--last-tag',
    '--head <ref>',
    '--working-tree',
    '--range <from>..<to>',
    '--out <file>',
    '--svg <file>',
    '--open',
    '--no-open',
    '--no-cache',
    '--history <n>',
    '--verbose',
    '--version',
    '--help',
  ]) {
    expect(USAGE).toContain(flag);
  }
});

test('the usage text names the served default', () => {
  expect(USAGE).toContain('With no --out or --svg, atis serves the world on 127.0.0.1');
});

test('the usage text tells a reader that --open needs --svg', () => {
  const line = USAGE.split('\n').find((text) => text.startsWith('  --open'));
  expect(line).toContain('--svg');
});
