import { expect, test } from 'vitest';

import { computeDependencies } from '../dependencies.js';
import type { DependencyInputs } from '../dependencies.js';
import type { Security } from '../evidence.js';

/** Three terrain files, a test and a shore file, as the head scan records what each imports by package. */
const FILES = [
  { path: 'src/cli/main.ts', packages: ['express', 'kleur'] },
  { path: 'src/pm/slots.ts', packages: ['kleur'] },
  { path: 'src/pm/tools.ts', packages: ['picomatch'] },
  { path: 'src/pm/__tests__/tools.test.ts', packages: ['picomatch', 'vitest'] },
  { path: 'vite.config.ts', packages: ['vite'] },
];

const TERRAIN: ReadonlySet<string> = new Set(['src/cli/main.ts', 'src/pm/slots.ts', 'src/pm/tools.ts']);

function inputs(overrides: Partial<DependencyInputs> = {}): DependencyInputs {
  return { files: FILES, terrain: TERRAIN, deps_added: [], deps_moved: [], security: undefined, ...overrides };
}

/**
 * pnpm's audit as `parseSecurity` reads it: `qs` at high through `express`,
 * `express` itself at moderate, and `vite` at critical, imported only by the shore.
 */
const SECURITY: Security = {
  vulnerabilities: { moderate: 1, high: 1, critical: 1 },
  advisories: [
    { module: 'express', severity: 'moderate', paths: [{ manifest: 'package.json', packages: ['express'] }] },
    { module: 'qs', severity: 'high', paths: [{ manifest: 'package.json', packages: ['express', 'body-parser', 'qs'] }] },
    { module: 'vite', severity: 'critical', paths: [{ manifest: 'package.json', packages: ['vite'] }] },
  ],
};

test('a package two terrain files import counts both, and a test or a shore file counts for none (D4)', () => {
  expect(computeDependencies(inputs())).toEqual([
    { name: 'express', importers: 1 },
    { name: 'kleur', importers: 2 },
    { name: 'picomatch', importers: 1 },
  ]);
});

test('a package an advisory names at high carries the worst severity among all that name it, through a path or as their module (D83)', () => {
  const dependencies = computeDependencies(inputs({ security: SECURITY }));
  expect(dependencies?.find((dependency) => dependency.name === 'express')).toEqual({
    name: 'express',
    importers: 1,
    advisories: 2,
    severity: 'high',
  });
});

test('with the audit read, a package no advisory names carries a count of none and no severity', () => {
  const dependencies = computeDependencies(inputs({ security: SECURITY }));
  expect(dependencies?.find((dependency) => dependency.name === 'kleur')).toEqual({ name: 'kleur', importers: 2, advisories: 0 });
});

test('a package the change added, or whose range it moved, says which, and added wins where it did both (D83)', () => {
  const dependencies = computeDependencies(
    inputs({
      deps_added: [{ manifest: 'package.json', name: 'picomatch', range: '^4.0.2', dev: false }],
      deps_moved: [
        { manifest: 'package.json', name: 'kleur', range: '^4.1.5', from: '^4.1.0', dev: false },
        { manifest: 'apps/cli/package.json', name: 'picomatch', range: '^4.0.2', from: '^3.0.1', dev: false },
      ],
    }),
  );
  expect(dependencies).toEqual([
    { name: 'express', importers: 1 },
    { name: 'kleur', importers: 2, change: 'moved' },
    { name: 'picomatch', importers: 1, change: 'added' },
  ]);
});

test('no audit read, or one that named no advisories, gives no severity and no count, never a clean audit (C2)', () => {
  const unread = computeDependencies(inputs({ security: undefined })) ?? [];
  const counted = computeDependencies(inputs({ security: { vulnerabilities: { high: 1 } } })) ?? [];
  for (const dependency of [...unread, ...counted]) {
    expect(dependency).not.toHaveProperty('advisories');
    expect(dependency).not.toHaveProperty('severity');
  }
});

test('a scan that recorded no imports by package gives no list at all, while one that read none gives an empty list (C2)', () => {
  expect(computeDependencies(inputs({ files: [{ path: 'src/cli/main.ts' }] }))).toBeUndefined();
  expect(computeDependencies(inputs({ files: [{ path: 'src/cli/main.ts', packages: [] }] }))).toEqual([]);
});
