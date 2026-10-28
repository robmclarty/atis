import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

/**
 * The tour stays apart from atis (D112, D177, C5): it is a private
 * workspace app needing Node 24, fascicle is its dependency alone, and
 * nothing atis ships imports it, fascicle, or any model's SDK, so the only
 * model call is the one this command makes when typed.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const APPS = join(HERE, '..', '..', '..');

type Manifest = { readonly private?: boolean; readonly engines?: Readonly<Record<string, string>>; readonly dependencies?: Readonly<Record<string, string>>; readonly devDependencies?: Readonly<Record<string, string>> };
const manifest = (app: string): Manifest => JSON.parse(readFileSync(join(APPS, app, 'package.json'), 'utf8')) as Manifest;

/** Every TypeScript source under a directory, tests and all. */
const sources = (directory: string): readonly string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? sources(join(directory, entry.name)) : /\.tsx?$/.test(entry.name) ? [join(directory, entry.name)] : []));

/** What a model is reached through: the tour, fascicle, and the SDKs a provider rides. */
const MODEL_PACKAGES = /^(tour|fascicle|ai|openai|@ai-sdk\/.*|@anthropic-ai\/.*|@openrouter\/.*)(\/.*)?$/;

test('the tour is a private app on Node 24 whose only package beyond the workspace is fascicle', () => {
  const tour = manifest('tour');
  expect(tour.private).toBe(true);
  expect(tour.engines?.['node']).toBe('>=24.0.0');
  expect(Object.keys(tour.dependencies ?? {}).toSorted()).toEqual(['core', 'fascicle']);
});

test('nothing atis or its world ships names the tour, fascicle or a model SDK, in its manifest or its imports (C5)', () => {
  for (const app of ['atis', 'web']) {
    const { dependencies = {}, devDependencies = {} } = manifest(app);
    expect(Object.keys({ ...dependencies, ...devDependencies }).filter((name) => MODEL_PACKAGES.test(name))).toEqual([]);
    const imported = sources(join(APPS, app, 'src')).flatMap((file) => [...readFileSync(file, 'utf8').matchAll(/\bfrom\s+['"]([^'"]+)['"]|\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)].map((match) => match[1] ?? match[2] ?? ''));
    expect(imported.length).toBeGreaterThan(0);
    expect(imported.filter((specifier) => MODEL_PACKAGES.test(specifier))).toEqual([]);
  }
});
