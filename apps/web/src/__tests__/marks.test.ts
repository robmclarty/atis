import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson } from 'core';
import { ARROW_SIZE, CROSSING_PAD, EMPHASIS_PAD, GHOST_PAD, INTEGRITY_GAP_WIDTH, INTEGRITY_PAD, MUTANT_NOTCH_DEPTH, PRIMARY_RING_WIDTH, RENAME_DASH, RENAME_LEADER_WIDTH, SECONDARY_RING_WIDTH, STANDING_STORM_SCALE, STITCH_LENGTH, STITCH_TEAR, STORM_LABEL_GAP, renameLeaderOf, weatherOf } from 'scene';
import { expect, test } from 'vitest';

import { HUES, marksOf } from '../marks.js';
import type { Sector } from '../marks.js';

/**
 * The world's marks against the scene's weather, mark for mark (D86): one
 * record per mark the SVG draws, with the same sizes and a hue by meaning.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, '..', '..', '..', '..', 'fixtures');
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', '..', 'libs', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));
const RETAKE_3 = assertMap(JSON.parse(readFileSync(join(FIXTURES, 'retake-3', 'map.json'), 'utf8')));

const ofKind = (sectors: readonly Sector[], kind: Sector['kind']): readonly Sector[] => sectors.filter((sector) => sector.kind === kind);
const placedFiles = (map: MapJson) => {
  const positions = map.terrain.layout?.positions ?? {};
  return weatherOf(map).files.filter((file) => positions[file.path] !== undefined);
};

test('every changed placed file has one stain, the edits as discs shown at the far field and the rest as outlines', () => {
  for (const map of [DEMO, RETAKE_3]) {
    const { sectors } = marksOf(map);
    const changed = placedFiles(map).filter((file) => file.change !== undefined);
    const stains = [...ofKind(sectors, 'stain'), ...ofKind(sectors, 'outline')];
    expect(stains.map((stain) => stain.path).toSorted()).toEqual(changed.map((file) => file.path).toSorted());
    const improved = new Set(changed.filter((file) => file.change?.improvements !== undefined).map((file) => file.path));
    for (const stain of ofKind(sectors, 'stain')) {
      // One state per file: the change hue, or the calm-positive one where the change made it healthier (D98).
      expect(stain.hue).toBe(improved.has(stain.path) ? 'improved' : 'change');
      expect(stain.far).toBe(true);
      expect(stain.inner).toBe(-stain.r);
      expect(stain.outer).toBe(0);
      expect(stain.bloom).toBe(1);
    }
  }
});

test('a deleted file is its outline alone and a renamed one a dashed outline with its old path beside it (D40)', () => {
  const changed = DEMO.weather.changed.map((file) =>
    file.path === 'libs/core/src/pm/index.ts' ? { ...file, kind: 'deleted' as const } : file.path === 'libs/core/src/pm/tools.ts' ? { ...file, kind: 'renamed' as const, from: 'libs/core/src/pm/old-tools.ts' } : file,
  );
  const { sectors, labels } = marksOf({ ...DEMO, weather: { ...DEMO.weather, changed } });
  const outlines = ofKind(sectors, 'outline');
  // The demo deletes legacy.ts already; the test deletes index.ts and renames tools.ts beside it.
  expect(outlines.map((outline) => [outline.path, outline.dash])).toEqual([
    ['libs/core/src/pm/index.ts', [0, 0]],
    ['libs/core/src/pm/legacy.ts', [0, 0]],
    ['libs/core/src/pm/tools.ts', [3, 2]],
  ]);
  for (const outline of outlines) {
    expect(outline.inner).toBeLessThan(0);
    expect(outline.outer).toBeGreaterThan(0);
    expect(outline.far).toBe(false);
  }
  const at = DEMO.terrain.layout?.positions['libs/core/src/pm/tools.ts'];
  expect(labels.filter((label) => label.kind === 'rename')).toEqual([{ kind: 'rename', target: 'libs/core/src/pm/tools.ts', text: 'libs/core/src/pm/old-tools.ts', x: (at?.x ?? 0) + (at?.r ?? 0) + 4, y: at?.y, hue: 'change' }]);
});

test("a changed file's skin is a dim hairline and a lit gap from the top for its open share; an unmeasured one is lit whole (D71, D80)", () => {
  const { sectors } = marksOf(RETAKE_3);
  const measured = placedFiles(RETAKE_3).filter((file) => file.evidence?.skin?.measured === true);
  expect(measured.length).toBeGreaterThan(0);
  for (const file of measured) {
    const skin = file.evidence?.skin;
    if (skin === undefined || !skin.measured) throw new Error('measured');
    const hairline = ofKind(sectors, 'hairline').filter((mark) => mark.path === file.path);
    expect(hairline).toHaveLength(1);
    expect(hairline[0]?.opacity).toBeLessThan(1);
    expect(hairline[0]?.bloom).toBe(0);
    expect((hairline[0]?.inner ?? 0) + (hairline[0]?.outer ?? 0)).toBeCloseTo(2 * INTEGRITY_PAD, 10);
    const gaps = ofKind(sectors, 'gap').filter((mark) => mark.path === file.path);
    if (skin.open === 0) {
      expect(gaps).toHaveLength(0);
      continue;
    }
    expect(gaps).toHaveLength(1);
    expect(gaps[0]?.from).toBe(-Math.PI / 2);
    expect((gaps[0]?.to ?? 0) - (gaps[0]?.from ?? 0)).toBeCloseTo(skin.open * 2 * Math.PI, 10);
    expect((gaps[0]?.outer ?? 0) - (gaps[0]?.inner ?? 0)).toBe(INTEGRITY_GAP_WIDTH);
  }
  const unmeasured = { ...DEMO, weather: { ...DEMO.weather, evidence: { ...DEMO.weather.evidence, unmeasured: ['libs/core/src/pm/tools.ts'] } } };
  const whole = ofKind(marksOf(unmeasured).sectors, 'gap').filter((mark) => mark.path === 'libs/core/src/pm/tools.ts');
  expect(whole).toHaveLength(1);
  expect((whole[0]?.to ?? 0) - (whole[0]?.from ?? 0)).toBeCloseTo(2 * Math.PI, 10);
});

test('a mutant is a notch cut from past the skin to inside the file, a stitch a strip across the edge, torn in two when its test failed', () => {
  const { sectors } = marksOf(RETAKE_3);
  const files = placedFiles(RETAKE_3);
  const notches = files.reduce((total, file) => total + (file.evidence?.notches.length ?? 0), 0);
  expect(notches).toBeGreaterThan(0);
  expect(ofKind(sectors, 'notch')).toHaveLength(notches);
  for (const notch of ofKind(sectors, 'notch')) {
    expect(notch.from).toBe(notch.to);
    expect(notch.inner).toBe(-MUTANT_NOTCH_DEPTH);
    expect(notch.outer).toBe(INTEGRITY_PAD + INTEGRITY_GAP_WIDTH / 2);
    expect(notch.innerHalf).toBe(0);
    expect(notch.outerHalf).toBeGreaterThan(0);
  }
  const stitches = files.flatMap((file) => file.evidence?.stitches ?? []);
  const torn = stitches.filter((stitch) => stitch.look === 'torn').length;
  expect(ofKind(sectors, 'stitch')).toHaveLength(stitches.length + torn);
  const lit = ofKind(sectors, 'stitch').find((mark) => mark.hue === 'evidence');
  expect(lit?.inner).toBe(-STITCH_LENGTH / 2);
  expect(lit?.outer).toBe(STITCH_LENGTH / 2);

  const failed = { ...DEMO, weather: { ...DEMO.weather, evidence: { ...DEMO.weather.evidence, stitches: (DEMO.weather.evidence.stitches ?? []).map((stitch) => ({ ...stitch, status: 'failed' })) } } };
  const pieces = ofKind(marksOf(failed).sectors, 'stitch');
  expect(pieces.length).toBeGreaterThan(0);
  expect(pieces.every((piece) => piece.hue === 'ifr')).toBe(true);
  expect(pieces.map((piece) => piece.outer).filter((outer) => outer === -STITCH_TEAR / 2)).toHaveLength(pieces.length / 2);
  const unrun = { ...DEMO, weather: { ...DEMO.weather, evidence: { ...DEMO.weather.evidence, stitches: (DEMO.weather.evidence.stitches ?? []).map((stitch) => ({ ...stitch, status: 'skipped' })) } } };
  expect(ofKind(marksOf(unrun).sectors, 'stitch').every((piece) => piece.hue === 'unlit' && piece.bloom === 0)).toBe(true);
});

test('a ghost is a dashed ring past the file, a crossing a warm disc past it, and history a textured disc over any file that carries a value', () => {
  const { sectors } = marksOf(RETAKE_3);
  const files = placedFiles(RETAKE_3);
  expect(ofKind(sectors, 'ghost').map((mark) => mark.path)).toEqual(files.filter((file) => file.ghost !== undefined).map((file) => file.path));
  for (const ghost of ofKind(sectors, 'ghost')) {
    expect(ghost.dash).toEqual([2, 2]);
    expect(ghost.hue).toBe('ghost');
    expect((ghost.inner + ghost.outer) / 2).toBe(GHOST_PAD);
  }
  expect(ofKind(sectors, 'crossing').map((mark) => mark.path)).toEqual(files.filter((file) => file.crossing === true).map((file) => file.path));
  for (const crossing of ofKind(sectors, 'crossing')) {
    expect(crossing.hue).toBe('reach');
    expect(crossing.outer).toBe(CROSSING_PAD);
    expect(crossing.inner).toBe(-crossing.r);
  }
  const positions = RETAKE_3.terrain.layout?.positions ?? {};
  const churned = RETAKE_3.terrain.organelles.filter((organelle) => positions[organelle.id] !== undefined && (organelle.churn_ratio ?? 0) > 0).length;
  const fixed = RETAKE_3.terrain.organelles.filter((organelle) => positions[organelle.id] !== undefined && (organelle.bugfix_rate ?? 0) > 0).length;
  const history = ofKind(sectors, 'history');
  expect(history.filter((mark) => mark.pattern === 'hatch')).toHaveLength(churned);
  expect(history.filter((mark) => mark.pattern === 'stipple')).toHaveLength(fixed);
  expect(history.every((mark) => mark.hue === 'ink' && mark.opacity > 0 && mark.opacity <= 0.7 && mark.bloom === 0)).toBe(true);
});

test("every storm is a bolt where the scene hangs it: the change's full size in the IFR hue with its slot beside it, standing state smaller and graphite with no label (D68)", () => {
  const { bolts, labels } = marksOf(RETAKE_3);
  const storms = weatherOf(RETAKE_3).storms;
  expect(storms.length).toBeGreaterThan(0);
  expect(bolts).toHaveLength(storms.length);
  storms.forEach((storm, index) => {
    const bolt = bolts[index];
    expect(bolt).toMatchObject({ slot: storm.slot, place: storm.place, x: storm.x, y: storm.y, scale: storm.change ? 1 : STANDING_STORM_SCALE, hue: storm.change ? 'ifr' : 'standing' });
  });
  const named = labels.filter((label) => label.kind === 'storm');
  expect(named).toHaveLength(storms.filter((storm) => storm.change).length);
  for (const label of named) {
    const storm = storms.find((each) => each.change && each.slot === label.text && each.place === label.target && each.x + STORM_LABEL_GAP === label.x && each.y === label.y);
    expect(storm, label.text).toBeDefined();
  }
});

test('an exceptional edge is a ribbon along the bow, pulled back to each file, with the arrowhead on the imported rim in the hue of its kind', () => {
  const map = assertMap(JSON.parse(readFileSync(join(FIXTURES, 'retake-5', 'map.json'), 'utf8')));
  const { ribbons } = marksOf(map);
  const edges = weatherOf(map).edges;
  expect(edges.length).toBeGreaterThan(0);
  expect(ribbons).toHaveLength(edges.length);
  const positions = map.terrain.layout?.positions ?? {};
  ribbons.forEach((ribbon, index) => {
    const edge = edges[index];
    expect([ribbon.from, ribbon.to, ribbon.kind]).toEqual([edge?.from, edge?.to, edge?.kind]);
    expect(ribbon.hue).toBe(edge?.kind === 'new-cross-module' ? 'change' : 'lifr');
    const from = positions[ribbon.from];
    const to = positions[ribbon.to];
    const [first, last] = [ribbon.points[0], ribbon.points.at(-1)];
    expect(Math.hypot((first?.[0] ?? 0) - (from?.x ?? 0), (first?.[1] ?? 0) - (from?.y ?? 0))).toBeCloseTo(from?.r ?? 0, 6);
    expect(Math.hypot((last?.[0] ?? 0) - (to?.x ?? 0), (last?.[1] ?? 0) - (to?.y ?? 0))).toBeCloseTo(to?.r ?? 0, 6);
    expect(ribbon.arrow).toMatchObject({ x: last?.[0], y: last?.[1], size: ARROW_SIZE });
    expect(ribbon.points.length).toBeGreaterThan(8);
  });
});

test("a renamed file's leader is dashed ribbons from where its base put it to its rim, the scene's own, in its state's hue (D40, D90, D97)", () => {
  const BARREL = 'libs/core/src/pm/index.ts';
  const layout = DEMO.terrain.layout;
  if (layout === undefined) throw new Error('the demo map is laid out');
  const renamed = (improvements: MapJson['weather']['improvements']): MapJson => ({
    ...DEMO,
    terrain: { ...DEMO.terrain, layout: { ...layout, renamed_from: { [BARREL]: { x: 170, y: 380, r: 7.45 } } } },
    weather: {
      ...DEMO.weather,
      changed: DEMO.weather.changed.map((file) => (file.path === BARREL ? { ...file, kind: 'renamed' as const, from: 'libs/core/src/pm/main.ts' } : file)),
      ...(improvements === undefined ? {} : { improvements }),
    },
  });
  const map = renamed(DEMO.weather.improvements);
  const leader = renameLeaderOf(weatherOf(map).files.find((file) => file.path === BARREL)?.change, layout.positions[BARREL] ?? { x: 0, y: 0, r: 0 });
  const dashes = marksOf(map).ribbons.filter((ribbon) => ribbon.kind === 'renamed');

  // The SVG's golden draws this leader from (170, 380) to (206.66, 408.4); the world lays the same line in dashes.
  expect(leader?.from).toEqual([170, 380]);
  expect(dashes.length).toBeGreaterThan(3);
  expect(dashes[0]?.points[0]).toEqual([170, 380]);
  const end = dashes.at(-1)?.points[1];
  expect(end?.[0]).toBeCloseTo(leader?.to[0] ?? 0, 6);
  expect(end?.[1]).toBeCloseTo(leader?.to[1] ?? 0, 6);
  const [on, off] = RENAME_DASH.split(' ').map(Number);
  const [a, b] = dashes[0]?.points ?? [];
  expect(Math.hypot((b?.[0] ?? 0) - (a?.[0] ?? 0), (b?.[1] ?? 0) - (a?.[1] ?? 0))).toBeCloseTo(on ?? 0, 6);
  const next = dashes[1]?.points[0];
  expect(Math.hypot((next?.[0] ?? 0) - (b?.[0] ?? 0), (next?.[1] ?? 0) - (b?.[1] ?? 0))).toBeCloseTo(off ?? 0, 6);
  for (const dash of dashes) expect([dash.from, dash.to, dash.hue, dash.width, dash.arrow]).toEqual(['libs/core/src/pm/main.ts', BARREL, 'change', RENAME_LEADER_WIDTH, undefined]);
  // Made healthier, the leader takes the calm-positive hue with its outline and its old path (D98).
  const eased = marksOf(renamed([{ kind: 'dent', files: [BARREL], rule: 'cognitive' }]));
  expect(new Set(eased.ribbons.filter((ribbon) => ribbon.kind === 'renamed').map((ribbon) => ribbon.hue))).toEqual(new Set(['improved']));
  expect(eased.sectors.find((sector) => sector.path === BARREL && sector.kind === 'outline')?.hue).toBe('improved');
  expect(eased.labels.find((label) => label.kind === 'rename')?.hue).toBe('improved');
  // With no layout to relax from, no leader (C2).
  expect(marksOf({ ...map, terrain: { ...map.terrain, layout } }).ribbons.some((ribbon) => ribbon.kind === 'renamed')).toBe(false);
});

test('the hues a mark can name are the twelve the palette holds, and a map with no weather or notices has no marks', () => {
  expect(HUES).toHaveLength(12);
  const unhistoried = DEMO.terrain.organelles.map(({ churn_ratio: _churn, bugfix_rate: _bugfix, ...organelle }) => organelle);
  const quiet: MapJson = { ...DEMO, terrain: { ...DEMO.terrain, organelles: unhistoried, edges_exceptional: [] }, weather: { ...DEMO.weather, changed: [], reach: [], ghosts: [], evidence: {}, checks: { ...DEMO.weather.checks, slots: [] } }, notices: [] };
  expect(marksOf(quiet)).toEqual({ sectors: [], bolts: [], ribbons: [], labels: [] });
});

test("a notice's target wears its tier's emphasis: the primary a halo and a thin ring in the category hue, a secondary a thick ring in the leaders' grey, a tertiary nothing, and each follows its notice's light (§5.4, D72, D148)", () => {
  const { sectors } = marksOf(DEMO);
  const at = DEMO.terrain.layout?.positions['libs/core/src/pm/index.ts'];
  const halos = ofKind(sectors, 'halo');
  expect(halos.map((halo) => [halo.path, halo.hue, halo.inner, halo.outer, halo.notice, halo.far, halo.bloom])).toEqual([['libs/core/src/pm/index.ts', 'category', -(at?.r ?? 0), EMPHASIS_PAD, 0, true, 1]]);
  const rings = ofKind(sectors, 'ring');
  expect(rings.map((ring) => [ring.path, ring.hue, ring.outer - ring.inner, (ring.inner + ring.outer) / 2, ring.notice, ring.bloom, ring.far])).toEqual([['libs/core/src/pm/index.ts', 'category', PRIMARY_RING_WIDTH, EMPHASIS_PAD, 0, 0, false]]);

  // A noticed file's own stain follows its notice's light; every other mark rests.
  const stains = [...ofKind(sectors, 'stain'), ...ofKind(sectors, 'outline')];
  expect(stains.find((stain) => stain.path === 'libs/core/src/pm/index.ts')?.notice).toBe(0);
  expect(stains.find((stain) => stain.path === 'libs/core/src/pm/tools.ts')?.notice).toBe(5);
  expect(stains.find((stain) => stain.path === 'libs/core/src/pm/legacy.ts')?.notice).toBe(-1);
  for (const sector of sectors) if (sector.kind !== 'stain' && sector.kind !== 'halo' && sector.kind !== 'ring') expect(sector.notice).toBe(-1);

  // The halo lies over the stains and under the evidence; the rings lie over everything.
  const kinds = sectors.map((sector) => sector.kind);
  expect(kinds.indexOf('halo')).toBeGreaterThan(kinds.lastIndexOf('stain'));
  expect(kinds.indexOf('halo')).toBeLessThan(kinds.indexOf('hairline'));
  expect(kinds.lastIndexOf('ring')).toBe(kinds.length - 1);

  // A secondary on a file of its own: the thick grey ring, following the secondary's light, and no halo.
  const shared = { ...DEMO, notices: DEMO.notices.map((notice, index) => (index === 1 ? { ...notice, target: 'libs/core/src/pm/tools.ts' } : notice)) };
  const tools = ofKind(marksOf(shared).sectors, 'ring').find((ring) => ring.path === 'libs/core/src/pm/tools.ts');
  expect(tools?.hue).toBe('leader');
  expect((tools?.outer ?? 0) - (tools?.inner ?? 0)).toBeCloseTo(SECONDARY_RING_WIDTH, 10);
  expect(tools?.notice).toBe(1);
  expect(ofKind(marksOf(shared).sectors, 'halo')).toHaveLength(1);

  // A notice on a shore file draws nothing on the field: its box hangs in the rail.
  const ashore = { ...DEMO, notices: DEMO.notices.map((notice) => ({ ...notice, target: 'README.md' })) };
  expect(ofKind(marksOf(ashore).sectors, 'halo')).toHaveLength(0);
  expect(ofKind(marksOf(ashore).sectors, 'ring')).toHaveLength(0);
  expect(HUES).toContain('category');
  expect(HUES).toContain('leader');
});
