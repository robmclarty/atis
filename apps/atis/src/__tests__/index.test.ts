import { readFileSync } from 'node:fs';

import { expect, test } from 'vitest';

import { NAME, VERSION, run } from '../index.js';

test('the version constant matches package.json', () => {
  const manifest = JSON.parse(
    readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
  ) as { name: string; version: string };
  expect(manifest.name).toBe(NAME);
  expect(manifest.version).toBe(VERSION);
});

test('--version prints the version and exits 0', () => {
  expect(run(['--version'])).toEqual({ exitCode: 0, stdout: `${VERSION}\n`, stderr: '' });
  expect(run(['-V']).exitCode).toBe(0);
});

test('--help prints usage on stdout and exits 0', () => {
  const out = run(['--help']);
  expect(out.exitCode).toBe(0);
  expect(out.stdout).toContain('weather map');
  expect(out.stderr).toBe('');
});

test('anything else is misuse: usage on stderr, exit 2', () => {
  for (const argv of [[], ['--base', 'main'], ['--nope'], ['--version', 'extra']]) {
    const out = run(argv);
    expect(out.exitCode).toBe(2);
    expect(out.stdout).toBe('');
    expect(out.stderr).toContain('--help');
  }
});
