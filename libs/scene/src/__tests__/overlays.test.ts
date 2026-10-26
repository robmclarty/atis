import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson, Overlays } from 'core';
import { expect, test } from 'vitest';

import { DEFAULT_OVERLAY, overlayNamed, overlayOf } from '../overlays.js';
import { OVERLAY_DEAD_EXPORT_LEVEL } from '../tokens.js';

/**
 * Each overlay comes down to a level per terrain file, in the channel its
 * measure owns (D101, C11), here over the demo's terrain with overlays laid
 * on it by hand, so each level can be read off its numbers.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));

const DOCTOR = 'apps/cli/src/doctor.ts';
const TOOLS = 'libs/core/src/pm/tools.ts';
const FORMAT = 'libs/core/src/util/format.ts';
const README = 'README.md';

function repo(overlays: Overlays): MapJson {
  return { ...DEMO, meta: { ...DEMO.meta, mode: 'repo' }, overlays };
}

test('a map of a change holds no overlay, and a repo map opens on its trouble spots', () => {
  expect(overlayOf(DEMO, 'trouble_spots')).toBeUndefined();
  expect(DEFAULT_OVERLAY).toBe('trouble_spots');
  expect(overlayNamed('dead_code')).toBe('dead_code');
  expect(overlayNamed('dead-code')).toBeUndefined();
});

test('history is texture: a trouble spot at its score, and recent heat by its share of the hottest file', () => {
  const map = repo({
    trouble_spots: [{ path: DOCTOR, commits: 4, complexity: 10, score: 1 }, { path: TOOLS, commits: 1, complexity: 10, score: 0.25 }],
    recent_heat: { commits: 5, files: [{ path: DOCTOR, commits: 4 }, { path: FORMAT, commits: 2 }, { path: README, commits: 5 }] },
  });

  expect(overlayOf(map, 'trouble_spots')).toEqual({
    name: 'trouble_spots',
    title: 'Trouble spots',
    channel: 'texture',
    marks: [{ path: DOCTOR, level: 1 }, { path: TOOLS, level: 0.25 }],
    count: 2,
    unit: 'file',
  });
  // The README is on the shore, not the field, so it gets no mark, though it is the hottest file.
  expect(overlayOf(map, 'recent_heat')).toMatchObject({ channel: 'texture', marks: [{ path: DOCTOR, level: 0.8 }, { path: FORMAT, level: 0.4 }], count: 3 });
});

test("what the checks found is luminance: maintainability's shortfall, the uncovered share, and dead code by file and export", () => {
  const map = repo({
    ugly_spots: [{ path: DOCTOR, maintainability: 61.5, breaches: [] }, { path: TOOLS, breaches: [{ line: 4, rules: ['crap'] }] }, { path: FORMAT, maintainability: 100, breaches: [] }],
    coverage_gaps: [{ path: DOCTOR, unmeasured: true }, { path: TOOLS, statements: 8, uncovered: 2 }],
    dead_code: [{ path: DOCTOR, kind: 'file' }, { path: TOOLS, kind: 'export', name: 'a' }, { path: TOOLS, kind: 'export', name: 'b' }],
  });

  // A file fallow never scored is lit full, and one at 100 is not lit at all.
  expect(overlayOf(map, 'ugly_spots')).toMatchObject({ channel: 'luminance', marks: [{ path: DOCTOR, level: 0.385 }, { path: TOOLS, level: 1 }] });
  expect(overlayOf(map, 'coverage_gaps')).toMatchObject({ channel: 'luminance', marks: [{ path: DOCTOR, level: 1 }, { path: TOOLS, level: 0.25 }] });
  expect(overlayOf(map, 'dead_code')).toMatchObject({
    channel: 'luminance',
    marks: [{ path: DOCTOR, level: 1 }, { path: TOOLS, level: 2 * OVERLAY_DEAD_EXPORT_LEVEL }],
    count: 3,
    unit: 'finding',
  });
});

test('duplication is repetition, a cycle is state, and a baselined finding is muted, each marking its files whole', () => {
  const map = repo({
    duplication: [{ id: 'family-1', files: [TOOLS, FORMAT] }],
    cycles: [{ kind: 'import', files: [FORMAT, DOCTOR] }],
    baselined: [{ kind: 'cycle', files: [FORMAT, DOCTOR] }, { kind: 'threshold', files: [DOCTOR], name: 'run' }],
  });

  expect(overlayOf(map, 'duplication')).toMatchObject({ channel: 'repetition', marks: [{ path: TOOLS, level: 1 }, { path: FORMAT, level: 1 }], unit: 'family' });
  expect(overlayOf(map, 'cycles')).toMatchObject({ channel: 'state', marks: [{ path: DOCTOR, level: 1 }, { path: FORMAT, level: 1 }], unit: 'cycle' });
  expect(overlayOf(map, 'baselined')).toMatchObject({ channel: 'muted', marks: [{ path: DOCTOR, level: 1 }, { path: FORMAT, level: 1 }], count: 2 });
});

test('an overlay the map holds muted carries its reason rather than marks (C2)', () => {
  const map = repo({ recent_heat: { commits: 0, files: [] }, muted: ['trouble_spots: .check/ is absent'] });

  expect(overlayOf(map, 'trouble_spots')).toEqual({ name: 'trouble_spots', title: 'Trouble spots', reason: '.check/ is absent' });
});
