import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { ChangedFile, Contour, ExceptionalEdge, MapJson, Organelle, Weather } from 'core';
import { expect, test } from 'vitest';

import { num } from '../el.js';
import { GLOW_ID, HATCH_ID, STIPPLE_ID } from '../patterns.js';
import { renderSvg } from '../render.js';
import {
  CHANGE_HUE,
  EMPHASIS_PAD,
  EVIDENCE_LIGHT,
  FIELD_FILL,
  GHOST_PAD,
  GHOST_STROKE,
  IFR_HUE,
  INTEGRITY_CLOSED_OPACITY,
  INTEGRITY_CLOSED_WIDTH,
  INTEGRITY_GAP_WIDTH,
  INTEGRITY_PAD,
  LIFR_HUE,
  MUTANT_NOTCH_DEPTH,
  MUTANT_NOTCH_WIDTH,
  RENAME_DASH,
  RENAME_LABEL_SIZE,
  SECONDARY_RING_WIDTH,
  STANDING_STORM_FILL,
  STANDING_STORM_SCALE,
  STITCH_UNLIT,
  TEXTURE_INK,
  TEXTURE_MAX_OPACITY,
} from '../tokens.js';
import { reachOpacity } from '../weather.js';

/**
 * The demo map is core's own golden, read across the workspace (P2, and see
 * `render.test.ts`); it carries every weather channel at once. The small map
 * below is hand-built for the cases the demo has none of: a rename, a global
 * red slot, a stitch that passed, a map with git and nothing else.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const CORE_FIXTURES = join(HERE, '..', '..', '..', 'core', 'fixtures');

function demo(): MapJson {
  return assertMap(JSON.parse(readFileSync(join(CORE_FIXTURES, 'demo', 'map.json'), 'utf8')));
}

/** The markup of one `<g id>` with everything nested in it, closed at its own indentation, which the serializer keeps one level per depth. */
function group(svg: string, id: string): string | undefined {
  const lines = svg.split('\n');
  const start = lines.findIndex((line) => line.trimStart().startsWith(`<g id="${id}"`));
  if (start === -1) return undefined;
  const opening = lines[start] ?? '';
  const indent = opening.slice(0, opening.length - opening.trimStart().length);
  const end = lines.findIndex((line, index) => index > start && line === `${indent}</g>`);
  return lines.slice(start, end + 1).join('\n');
}

function drawn(svg: string, id: string): string {
  const markup = group(svg, id);
  expect(markup, `#${id} is drawn`).toBeDefined();
  return markup ?? '';
}

function count(markup: string, pattern: RegExp): number {
  return [...markup.matchAll(pattern)].length;
}

type Point = { readonly x: number; readonly y: number };
type Curve = { readonly start: Point; readonly control: Point; readonly end: Point };

/** Which side of the line from start to end a curve's control point lies on: the sign, or 0 when it lies on the line. */
function side(edge: Curve): number {
  return Math.sign((edge.end.x - edge.start.x) * (edge.control.y - edge.start.y) - (edge.end.y - edge.start.y) * (edge.control.x - edge.start.x));
}

function escape(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const A = 'src/a.ts';
const B = 'src/b.ts';
const CELL_A = 'single:src/a.ts';
const CELL_B = 'single:src/b.ts';
const DOC = 'docs/notes.md';
const TEST = 'src/__tests__/a.test.ts';
const AT_A = { x: 70, y: 105, r: 10 };
const AT_B = { x: 170, y: 105, r: 10 };
const AT_DOC = { x: 30, y: 25, r: 4 };

function square(x: number, y: number, half: number): Contour {
  return [
    [x - half, y - half],
    [x + half, y - half],
    [x + half, y + half],
    [x - half, y + half],
    [x - half, y - half],
  ];
}

const MODIFIED_A: ChangedFile = { path: A, kind: 'modified', cell: CELL_A, is_barrel: false, added: 3, deleted: 1, hunks: [{ start: 1, count: 3 }] };

type Small = {
  readonly weather?: Partial<Weather>;
  readonly a?: Partial<Organelle>;
  readonly edges?: readonly ExceptionalEdge[];
};

/** Two single-file cells, one doc on the shore, one test file with no place (D4), and whatever weather the case needs. */
function small({ weather = {}, a = {}, edges = [] }: Small = {}): MapJson {
  const map: MapJson = {
    meta: {
      schema_version: 1,
      generated_at: '',
      repo: 'small',
      base: 'main',
      head: 'a'.repeat(40),
      merge_base: 'b'.repeat(40),
      mode: 'change',
      instruments: { mode: 'git-only', reason: 'no .check/' },
    },
    terrain: {
      cells: [
        { id: CELL_A, path: A, kind: 'single', organelles: [A], band: 0, interface_size: 1, body_loc: 20, dents: [] },
        { id: CELL_B, path: B, kind: 'single', organelles: [B], band: 0, interface_size: 1, body_loc: 20, dents: [] },
      ],
      organelles: [
        { id: A, path: A, cell: CELL_A, band: 0, reachable: true, loc: 20, dents: [], ...a },
        { id: B, path: B, cell: CELL_B, band: 0, reachable: true, loc: 20, dents: [] },
      ],
      bands: [{ index: 0, depth_min: 0, depth_max: 0 }],
      groups: [
        { id: 'docs', files: [DOC] },
        { id: 'tests', files: [TEST] },
      ],
      edges_exceptional: edges,
      history: { window_commits: 0, cochange: [] },
      layout: {
        width: 240,
        height: 160,
        shore: { y0: 0, y1: 50 },
        bands: [{ index: 0, y0: 50, y1: 160 }],
        positions: { [DOC]: AT_DOC, [A]: AT_A, [B]: AT_B },
        contours: { docs: square(AT_DOC.x, AT_DOC.y, 10), [CELL_A]: square(AT_A.x, AT_A.y, 25), [CELL_B]: square(AT_B.x, AT_B.y, 25) },
      },
    },
    weather: {
      changed: [],
      reach: [],
      evidence: {},
      checks: { category: 'NOINST', checks_run: 0, slots: [] },
      ghosts: [],
      deps_added: [],
      improvements: [],
      ...weather,
    },
    notices: [],
  };
  return assertMap(map);
}

test('the weather is drawn inside the world after the organelles, its definitions first and its layers bottom up', () => {
  const svg = renderSvg(demo());
  const order = ['organelles', 'weather', 'standing-storms', 'reach', 'changed', 'history', 'evidence', 'edges', 'ghosts', 'storms'].map((id) => svg.indexOf(`id="${id}"`));
  expect(order.every((at) => at >= 0)).toBe(true);
  expect(order).toEqual([...order].toSorted((a, b) => a - b));
  const weather = drawn(svg, 'weather');
  // The definitions sit under #world, where a filter and a pattern belong (D12), and before anything paints with them.
  expect(weather.indexOf('<defs>')).toBeLessThan(weather.indexOf('id="reach"'));
  expect(svg.indexOf('<defs>')).toBeGreaterThan(svg.indexOf('id="world"'));
  expect(count(svg, /<defs>/g)).toBe(1);
});

test('changed organelles and shore files are stained by kind, and a changed test file is nowhere on the field', () => {
  const svg = renderSvg(demo());
  const changed = drawn(svg, 'changed');
  expect(changed).toContain(`fill="${CHANGE_HUE}" stroke="${CHANGE_HUE}"`);
  const stains = [...changed.matchAll(/<circle data-id="([^"]+)" data-kind="(\w+)" cx="[\d.]+" cy="[\d.]+" r="([\d.]+)"([^/]*)\/>/g)].map(
    ([, id, kind, r, rest]) => ({ id, kind, r: Number(r), rest: rest ?? '' }),
  );
  expect(stains.map((stain) => [stain.id, stain.kind])).toEqual([
    ['README.md', 'modified'],
    ['apps/cli/src/doctor.ts', 'modified'],
    ['libs/core/src/pm/index.ts', 'modified'],
    ['libs/core/src/pm/legacy.ts', 'deleted'],
    ['libs/core/src/pm/tools.ts', 'added'],
    ['notes.xyz', 'modified'],
    ['package.json', 'modified'],
  ]);
  for (const stain of stains) {
    // Added and modified are the hue through, with no rim of their own; deleted is the outline alone, the body gone.
    if (stain.kind === 'deleted') expect(stain.rest).toBe(' fill="none"');
    else expect(stain.rest).toBe(' stroke="none"');
  }
  // A shore file is stained at its own small mark, never drawn as an organelle (D48).
  expect(stains.find((stain) => stain.id === 'README.md')?.r).toBe(4);
  // The changed test file is a stitch, not a stain (D4).
  expect(changed).not.toContain('pm.test.ts');
});

test('a renamed file is a dashed outline at its one position, labelled with the path it came from (D40)', () => {
  const renamed: ChangedFile = { path: A, kind: 'renamed', from: 'src/old.ts', cell: CELL_A, is_barrel: false, added: 0, deleted: 0, hunks: [] };
  const changed = drawn(renderSvg(small({ weather: { changed: [renamed] } })), 'changed');
  expect(changed).toContain(`<circle data-id="${A}" data-kind="renamed" cx="70" cy="105" r="10" fill="none" stroke-dasharray="${RENAME_DASH}"/>`);
  const label = /<text data-id="src\/a\.ts" x="([\d.]+)" y="([\d.]+)"[^>]*stroke="none">([^<]*)<\/text>/.exec(changed);
  expect(label?.[3]).toBe('src/old.ts');
  expect(Number(label?.[1])).toBeGreaterThan(AT_A.x + AT_A.r);
  expect(Math.abs(Number(label?.[2]) - AT_A.y)).toBeLessThan(RENAME_LABEL_SIZE);
});

test('reach glows through a blur, fills each reached cell at an opacity strictly decreasing by hops, and lights each barrel it crossed', () => {
  const map = demo();
  const svg = renderSvg(map);
  expect(svg).toMatch(new RegExp(`<filter id="${GLOW_ID}"[^>]*>\\s*<feGaussianBlur stdDeviation="[\\d.]+"/>`));
  const reach = drawn(svg, 'reach');
  expect(reach).toContain(`filter="url(#${GLOW_ID})"`);
  const glows = [...reach.matchAll(/<path data-id="([^"]+)" data-hops="(\d+)" d="([^"]+)"( fill-rule="evenodd")? opacity="([\d.]+)"\/>/g)].map(
    ([, id, hops, d, evenodd, opacity]) => ({ id: id ?? '', hops: Number(hops), holes: count(d ?? '', /Z/g) - 1, evenodd: evenodd !== undefined, opacity: Number(opacity) }),
  );
  // Every cell the reach enters, dimmest first, so the changed cell's light is laid last.
  expect(glows.map((glow) => glow.id)).toEqual(['package:apps/cli', 'package:libs/core', 'folder:libs/core/src/pm', 'single:apps/cli/src/doctor.ts']);
  expect(new Set(map.weather.reach.map((entry) => entry.cell))).toEqual(new Set(glows.map((glow) => glow.id)));
  const at = (hops: number): number => glows.find((glow) => glow.hops === hops)?.opacity ?? Number.NaN;
  expect(at(0)).toBeGreaterThan(at(1));
  // A package's light is cut around the cells it holds (D45): the pm folder, reached, glows on its own; util, not reached, stays dark.
  const core = glows.find((glow) => glow.id === 'package:libs/core');
  expect(core?.evenodd).toBe(true);
  expect(core?.holes).toBe(2);
  expect(glows.find((glow) => glow.id === 'folder:libs/core/src/pm')?.evenodd).toBe(false);
  // Each interface file crossed is lit at the crossing.
  expect([...reach.matchAll(/<circle data-via="([^"]+)"/g)].map(([, via]) => via)).toEqual(['apps/cli/src/doctor.ts', 'libs/core/src/pm/index.ts']);
  // The attenuation is strictly decreasing as written, two decimals and all, seven crossings out.
  const written = Array.from({ length: 8 }, (_, hops) => Number(num(reachOpacity(hops))));
  expect(written).toEqual([...written].toSorted((a, b) => b - a));
  expect(new Set(written).size).toBe(written.length);
});

type Skin = { readonly id: string; readonly covered: number; readonly changed: number; readonly rings: readonly string[] };

/** Each changed skin in an evidence layer: whose it is, its counts, and the rings it is drawn with, bottom up. */
function skinsIn(evidence: string): readonly Skin[] {
  return [...evidence.matchAll(/<g data-id="([^"]+)" data-covered="(\d+)" data-changed="(\d+)">([\s\S]*?)<\/g>/g)].map(([, id, covered, changed, body]) => ({
    id: id ?? '',
    covered: Number(covered),
    changed: Number(changed),
    rings: [...(body ?? '').matchAll(/<circle [^>]*\/>/g)].map(([ring]) => ring),
  }));
}

/** A ring's numeric attribute, as written. */
function attr(ring: string | undefined, name: string): number {
  return Number(new RegExp(` ${name}="([\\d.]+)"`).exec(ring ?? '')?.[1]);
}

test('a changed skin lights its uncovered share at full strength from the top clockwise over a dim hairline all round (D71)', () => {
  const coverage = [
    { path: A, changed_executable: 19, covered: 13, uncovered_lines: [2, 3, 5, 7, 11, 13] },
    { path: B, changed_executable: 5, covered: 5, uncovered_lines: [] },
  ];
  const modifiedB: ChangedFile = { ...MODIFIED_A, path: B, cell: CELL_B };
  const evidence = drawn(renderSvg(small({ weather: { changed: [MODIFIED_A, modifiedB], evidence: { patch_coverage: coverage } } })), 'evidence');
  const [open, closed] = skinsIn(evidence);
  expect([open?.id, closed?.id]).toEqual([A, B]);

  // Six of nineteen changed lines ran untested: the hairline all round, then six nineteenths of the ring lit over it.
  const [hairline, gap] = open?.rings ?? [];
  expect(open?.rings).toHaveLength(2);
  for (const ring of [hairline, gap]) {
    expect(ring).toContain(`stroke="${EVIDENCE_LIGHT}"`);
    expect(attr(ring, 'r')).toBe(AT_A.r + INTEGRITY_PAD);
  }
  expect(attr(hairline, 'stroke-width')).toBe(INTEGRITY_CLOSED_WIDTH);
  expect(attr(hairline, 'stroke-opacity')).toBe(INTEGRITY_CLOSED_OPACITY);
  expect(hairline).not.toContain('stroke-dasharray');
  expect(attr(gap, 'stroke-width')).toBe(INTEGRITY_GAP_WIDTH);
  expect(gap).not.toContain('stroke-opacity');
  expect(gap).toContain('pathLength="1"');
  expect(Number(/stroke-dasharray="([\d.]+) 1"/.exec(gap ?? '')?.[1])).toBeCloseTo(6 / 19, 2);
  expect(gap).toContain(`transform="rotate(-90 ${AT_A.x} ${AT_A.y})"`);
  // The lit gap reads as heavier than the hairline it rides on, and lies clear of a tier ring past it.
  expect(INTEGRITY_GAP_WIDTH).toBeGreaterThan(2 * INTEGRITY_CLOSED_WIDTH);
  expect(INTEGRITY_PAD + INTEGRITY_GAP_WIDTH / 2).toBeLessThan(EMPHASIS_PAD - SECONDARY_RING_WIDTH / 2);

  // A skin the tests closed is the hairline alone: no light where there is no gap.
  expect(closed?.rings).toHaveLength(1);
  expect(attr(closed?.rings[0], 'stroke-width')).toBe(INTEGRITY_CLOSED_WIDTH);
  expect(attr(closed?.rings[0], 'stroke-opacity')).toBe(INTEGRITY_CLOSED_OPACITY);
});

test("the demo's skins each light the share of their changed lines left uncovered", () => {
  const skins = skinsIn(drawn(renderSvg(demo()), 'evidence'));
  expect(skins.map((skin) => [skin.id, skin.covered, skin.changed])).toEqual([
    ['apps/cli/src/doctor.ts', 4, 7],
    ['libs/core/src/pm/index.ts', 4, 9],
    ['libs/core/src/pm/tools.ts', 7, 9],
  ]);
  for (const skin of skins) {
    const lit = /stroke-dasharray="([\d.]+) 1"/.exec(skin.rings[1] ?? '')?.[1];
    expect(Number(lit)).toBeCloseTo((skin.changed - skin.covered) / skin.changed, 2);
  }
});

test('a live mutant is a lit notch cut through the skin, round the top of the ring (D71)', () => {
  const map = demo();
  const at = map.terrain.layout?.positions['libs/core/src/pm/tools.ts'];
  expect(at).toBeDefined();
  if (at === undefined) return;
  const evidence = drawn(renderSvg(map), 'evidence');
  const notches = [...evidence.matchAll(/<path data-id="([^"]+)" data-line="(\d+)" data-status="(\w+)" d="([^"]+)" fill="([^"]+)"\/>/g)].map(
    ([, id, line, status, d, fill]) => ({
      id,
      line: Number(line),
      status,
      fill,
      points: [...(d ?? '').matchAll(/[ML]([\d.-]+) ([\d.-]+)/g)].map(([, x, y]) => ({ x: Number(x), y: Number(y) })),
    }),
  );
  expect(notches.map((notch) => [notch.id, notch.line, notch.status])).toEqual([
    ['libs/core/src/pm/tools.ts', 27, 'NoCoverage'],
    ['libs/core/src/pm/tools.ts', 64, 'Survived'],
  ]);
  const out = (point: { readonly x: number; readonly y: number } | undefined): number => Math.hypot((point?.x ?? 0) - at.x, (point?.y ?? 0) - at.y);
  for (const notch of notches) {
    // Lit, never the field's dark: a mutant that lived adds light rather than taking it away.
    expect(notch.fill).toBe(EVIDENCE_LIGHT);
    expect(notch.fill).not.toBe(FIELD_FILL);
    const [left, point, right] = notch.points;
    expect(notch.points).toHaveLength(3);
    // Its mouth spans the skin's outer edge, the notch's width across; its point sits inside the organelle's edge.
    expect(Math.hypot((left?.x ?? 0) - (right?.x ?? 0), (left?.y ?? 0) - (right?.y ?? 0))).toBeCloseTo(MUTANT_NOTCH_WIDTH, 1);
    expect(out(left)).toBeGreaterThan(at.r + INTEGRITY_PAD);
    expect(out(point)).toBeCloseTo(at.r - MUTANT_NOTCH_DEPTH, 1);
    expect(point?.y).toBeLessThan(at.y);
  }
  expect(notches[0]?.points[1]?.x).not.toBe(notches[1]?.points[1]?.x);
});

test('stitches are short strokes across the edge: torn in the IFR hue when the test failed, lit when it passed, unlit when it was not run', () => {
  const map = demo();
  const torn = [...drawn(renderSvg(map), 'evidence').matchAll(/<line data-id="([^"]+)" data-test="([^"]+)" data-status="failed" stroke="([^"]+)"/g)].map(
    ([, id, by, stroke]) => ({ id, by, stroke }),
  );
  // The one failed test stitches three files, and each stitch is torn in two.
  expect(torn.map((stitch) => stitch.id)).toEqual([
    'libs/core/src/pm/index.ts',
    'libs/core/src/pm/index.ts',
    'libs/core/src/pm/legacy.ts',
    'libs/core/src/pm/legacy.ts',
    'libs/core/src/pm/tools.ts',
    'libs/core/src/pm/tools.ts',
  ]);
  expect(new Set(torn.map((stitch) => stitch.by))).toEqual(new Set(['libs/core/src/__tests__/pm.test.ts']));
  expect(new Set(torn.map((stitch) => stitch.stroke))).toEqual(new Set([IFR_HUE]));

  const stitched = small({
    weather: {
      changed: [MODIFIED_A],
      evidence: {
        stitches: [
          { test: 'src/__tests__/z.test.ts', targets: [A], status: 'unknown' },
          { test: TEST, targets: [A], status: 'passed' },
        ],
      },
    },
  });
  const lines = [...drawn(renderSvg(stitched), 'evidence').matchAll(/<line data-id="([^"]+)" data-test="([^"]+)" data-status="(\w+)" stroke="([^"]+)" x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"\/>/g)].map(
    ([, id, by, status, stroke, x1, y1, x2, y2]) => ({ id, by, status, stroke, inside: Math.hypot(Number(x1) - AT_A.x, Number(y1) - AT_A.y), outside: Math.hypot(Number(x2) - AT_A.x, Number(y2) - AT_A.y) }),
  );
  expect(lines.map((line) => [line.by, line.status, line.stroke])).toEqual([
    [TEST, 'passed', EVIDENCE_LIGHT],
    ['src/__tests__/z.test.ts', 'unknown', STITCH_UNLIT],
  ]);
  for (const line of lines) {
    expect(line.inside).toBeLessThan(AT_A.r);
    expect(line.outside).toBeGreaterThan(AT_A.r);
  }
});

/** Each storm in a storm layer: its slot, its place, where its bolt hangs, how it is scaled, and its label, if it has one. */
function stormsIn(layer: string): readonly { readonly slot: string; readonly over: string; readonly x: number; readonly y: number; readonly scale?: string; readonly label?: string }[] {
  return [
    ...layer.matchAll(
      /<(?:g|path) data-slot="(\w+)" data-over="([^"]+)"(?:>\s*<path)? d="[^"]+" transform="translate\(([\d.]+) ([\d.]+)\)(?: scale\(([\d.]+)\))?"\/>(?:\s*<text[^>]*>([^<]*)<\/text>)?/g,
    ),
  ].map(([, slot, over, x, y, scale, label]) => ({
    slot: slot ?? '',
    over: over ?? '',
    x: Number(x),
    y: Number(y),
    ...(scale === undefined ? {} : { scale }),
    ...(label === undefined ? {} : { label }),
  }));
}

test("a red slot is a labelled IFR storm only over a cell where it names a changed file, and a small grey bolt beneath the weather over every other cell (D68)", () => {
  const map = demo();
  const svg = renderSvg(map);
  const storms = drawn(svg, 'storms');
  const standing = drawn(svg, 'standing-storms');
  expect(storms).toContain(`fill="${IFR_HUE}"`);
  expect(standing).toContain(`fill="${STANDING_STORM_FILL}"`);
  expect(standing).not.toContain(IFR_HUE);
  // `test` names the changed pm.test.ts, whose torn stitch lands on the changed files in pm: the change's storm, with its label.
  expect(stormsIn(storms).map((storm) => [storm.slot, storm.over, storm.label])).toEqual([['test', 'folder:libs/core/src/pm', 'test']]);
  // `dead` names only files the change did not touch: standing state, a smaller bolt with no label in either layer.
  const grey = stormsIn(standing);
  expect(grey.map((storm) => [storm.slot, storm.over, storm.scale, storm.label])).toEqual([
    ['dead', 'directory:libs/core/src/util', String(STANDING_STORM_SCALE), undefined],
    ['dead', 'package:libs/core', String(STANDING_STORM_SCALE), undefined],
  ]);
  expect(standing).not.toContain('<text');
  expect(storms).not.toContain('data-slot="dead"');
  for (const storm of [...stormsIn(storms), ...grey]) {
    const top = Math.min(...(map.terrain.layout?.contours?.[storm.over] ?? []).map(([, y]) => y));
    expect(storm.y).toBeLessThan(top);
  }
  // Only the red slots: the demo's six green ones and its skipped one hang nothing.
  expect(count(svg, /data-slot=/g)).toBe(3);
});

test('a global red slot hangs no storm; a slot naming a changed and an untouched file splits across the two layers', () => {
  const TEST_B = 'src/__tests__/b.test.ts';
  const svg = renderSvg(
    small({
      weather: {
        changed: [MODIFIED_A],
        evidence: {
          stitches: [
            { test: TEST, targets: [A], status: 'failed' },
            { test: TEST_B, targets: [A], status: 'passed' },
          ],
        },
        checks: {
          category: 'IFR',
          checks_run: 6,
          slots: [
            { name: 'dead', ok: false, skipped: false, scope: [A, B], change: [A] },
            { name: 'docs', ok: false, skipped: false, scope: [DOC], change: [] },
            { name: 'lint', ok: false, skipped: false, scope: 'global' },
            { name: 'security', ok: false, skipped: true, scope: 'global' },
            { name: 'struct', ok: false, skipped: false, scope: [TEST_B], change: [] },
            { name: 'test', ok: false, skipped: false, scope: [TEST], change: [A] },
            { name: 'types', ok: true, skipped: false, scope: 'global' },
          ],
        },
      },
    }),
  );
  // The global slot is nowhere on the field: no corner storm, no grey bolt; the HUD is where it is counted (D70).
  expect(svg).not.toContain('data-slot="lint"');
  expect(svg).not.toContain('data-over="field"');
  expect(svg).not.toContain('data-slot="security"');
  expect(svg).not.toContain('data-slot="types"');

  // `dead` is the change's over A's cell and standing over B's; `test` is on the change through its torn stitch on A.
  const storms = stormsIn(drawn(svg, 'storms'));
  expect(storms.map((storm) => [storm.slot, storm.over, storm.label])).toEqual([
    ['dead', CELL_A, 'dead'],
    ['test', CELL_A, 'test'],
  ]);
  const grey = stormsIn(drawn(svg, 'standing-storms'));
  expect(grey.map((storm) => [storm.slot, storm.over])).toEqual([
    ['dead', CELL_B],
    ['docs', 'docs'],
    ['struct', CELL_A],
  ]);
  // Over A's cell the change's two storms stack nearest the cell, and the standing `struct` above them, so no bolt covers another.
  const overA = [...storms, ...grey].filter((storm) => storm.over === CELL_A).map((storm) => storm.y);
  expect(overA).toEqual([...overA].toSorted((a, b) => b - a));
  expect(new Set(overA).size).toBe(3);
});

test('the storms read the split core recorded: a red naming a changed file hangs grey when none of its findings met a hunk (D73)', () => {
  const stormsFor = (change: readonly string[]): string =>
    renderSvg(
      small({
        weather: {
          changed: [MODIFIED_A],
          checks: { category: 'IFR', checks_run: 1, slots: [{ name: 'health', ok: false, skipped: false, scope: [A, B], change }] },
        },
      }),
    );

  // `health` names the changed A, but core found no hunk inside its finding there: both of its storms are standing state.
  const unmet = stormsFor([]);
  expect(group(unmet, 'storms')).toBeUndefined();
  expect(stormsIn(drawn(unmet, 'standing-storms')).map((storm) => [storm.slot, storm.over])).toEqual([
    ['health', CELL_A],
    ['health', CELL_B],
  ]);

  // The same slot with the finding met is the change's over A, and standing over B alone.
  const met = stormsFor([A]);
  expect(stormsIn(drawn(met, 'storms')).map((storm) => [storm.slot, storm.over, storm.label])).toEqual([['health', CELL_A, 'health']]);
  expect(stormsIn(drawn(met, 'standing-storms')).map((storm) => [storm.slot, storm.over])).toEqual([['health', CELL_B]]);
});

test('a ghost is a dashed outline round the untouched file that usually changes with these', () => {
  const map = demo();
  const at = map.terrain.layout?.positions['libs/core/src/util/format.ts'];
  const ghosts = drawn(renderSvg(map), 'ghosts');
  expect(ghosts).toContain(`stroke="${GHOST_STROKE}" stroke-dasharray=`);
  expect(ghosts).toContain(
    `<circle data-id="libs/core/src/util/format.ts" data-with="libs/core/src/pm/index.ts" data-rate="0.6" cx="${num(at?.x ?? 0)}" cy="${num(at?.y ?? 0)}" r="${num((at?.r ?? 0) + GHOST_PAD)}"/>`,
  );
  expect(count(ghosts, /<circle /g)).toBe(map.weather.ghosts.length);
});

test('churn is hatching and bug-fix rate is stipple, each at an opacity by value, and a zero or absent value is no texture', () => {
  const svg = renderSvg(demo());
  expect(svg).toMatch(new RegExp(`<pattern id="${HATCH_ID}" patternUnits="userSpaceOnUse"[^>]*>\\s*<path [^>]*stroke="${TEXTURE_INK}"`));
  expect(svg).toMatch(new RegExp(`<pattern id="${STIPPLE_ID}" patternUnits="userSpaceOnUse"[^>]*>\\s*<circle [^>]*fill="${TEXTURE_INK}"`));
  const history = drawn(svg, 'history');
  const texture = (pattern: string, key: string): readonly (readonly [string, number, number])[] =>
    [...history.matchAll(new RegExp(`<circle data-id="([^"]+)" ${key}="([\\d.]+)"[^>]*fill="url\\(#${pattern}\\)" fill-opacity="([\\d.]+)"/>`, 'g'))].map(
      ([, id, value, opacity]) => [id ?? '', Number(value), Number(opacity)] as const,
    );
  const hatch = texture(HATCH_ID, 'data-churn');
  const stipple = texture(STIPPLE_ID, 'data-bugfix');
  expect(hatch.map(([id]) => id)).toEqual(['apps/cli/src/doctor.ts', 'libs/core/src/pm/index.ts', 'libs/core/src/pm/tools.ts']);
  expect(stipple.map(([id]) => id)).toEqual(['apps/cli/src/doctor.ts', 'libs/core/src/pm/index.ts']);
  // Hotter is more opaque, up to full.
  const opacities = hatch.map(([, , opacity]) => opacity);
  expect(opacities).toEqual([...opacities].toSorted((a, b) => b - a));
  expect(opacities[0]).toBe(TEXTURE_MAX_OPACITY);
  expect(opacities[2]).toBeLessThan(opacities[1] ?? 0);
  // legacy.ts carries a bug-fix rate of zero and no churn; slots.ts carries neither. Neither is textured.
  expect(history).not.toContain('legacy.ts');
  expect(history).not.toContain('slots.ts');
});

test('the exceptional edges are the only lines drawn, importer to imported, and a cycle bows apart into a lens', () => {
  const map = demo();
  const svg = renderSvg(map);
  const edges = drawn(svg, 'edges');
  const paths = [...edges.matchAll(/<path data-from="([^"]+)" data-to="([^"]+)" data-kind="([\w-]+)" d="M([\d.]+) ([\d.]+)Q([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)" stroke="([^"]+)" marker-end="url\(#arrow-([\w-]+)\)"\/>/g)].map(
    ([, from, to, kind, x1, y1, cx, cy, x2, y2, stroke, arrow]) => ({
      from: from ?? '',
      to: to ?? '',
      kind,
      stroke,
      arrow,
      start: { x: Number(x1), y: Number(y1) },
      control: { x: Number(cx), y: Number(cy) },
      end: { x: Number(x2), y: Number(y2) },
    }),
  );
  expect(paths.length).toBe(map.terrain.edges_exceptional.length);
  expect(paths.map((path) => [path.kind, path.stroke, path.arrow])).toEqual([
    ['new-cross-module', CHANGE_HUE, 'new-cross-module'],
    ['cycle', LIFR_HUE, 'cycle'],
    ['cycle', LIFR_HUE, 'cycle'],
  ]);
  const positions = map.terrain.layout?.positions ?? {};
  for (const path of paths) {
    // Each end sits on its organelle's rim, not at its centre.
    const from = positions[path.from];
    const to = positions[path.to];
    expect(Math.hypot(path.start.x - (from?.x ?? 0), path.start.y - (from?.y ?? 0))).toBeCloseTo(from?.r ?? 0, 1);
    expect(Math.hypot(path.end.x - (to?.x ?? 0), path.end.y - (to?.y ?? 0))).toBeCloseTo(to?.r ?? 0, 1);
  }
  // The cycle's two edges bow to opposite sides of the line between the two files.
  const [there, back] = paths.filter((path) => path.kind === 'cycle');
  expect(side(there ?? paths[0]!)).not.toBe(0);
  expect(side(there ?? paths[0]!)).toBe(side(back ?? paths[0]!));
  // Every other line in the weather is a stitch, and the terrain draws none but the terrace contours.
  const weather = drawn(svg, 'weather');
  expect(count(weather, /<line /g)).toBe(count(drawn(svg, 'evidence'), /<line /g));
  expect(count(svg.slice(0, svg.indexOf('id="weather"')), /<line /g)).toBe(map.terrain.layout?.bands.length);

  // An edge to a file the layout did not place is not on the field; one between two placed files is.
  const unplaced = renderSvg(small({ edges: [{ from: A, to: TEST, kind: 'boundary' }] }));
  expect(group(unplaced, 'edges')).toBeUndefined();
  const boundary = drawn(renderSvg(small({ edges: [{ from: A, to: B, kind: 'boundary' }] })), 'edges');
  expect(boundary).toMatch(new RegExp(`data-kind="boundary" d="M[^"]+" stroke="${escape(LIFR_HUE)}" marker-end="url\\(#arrow-boundary\\)"`));
});

test('a git-only map draws its changed set and its reach and nothing else: no evidence, no history, no storms, no ghosts, and no light it cannot justify (C2)', () => {
  const svg = renderSvg(small({ weather: { changed: [MODIFIED_A], reach: [{ path: A, cell: CELL_A, hops: 0, via: [] }] } }));
  expect(group(svg, 'changed')).toBeDefined();
  expect(group(svg, 'reach')).toBeDefined();
  for (const id of ['evidence', 'history', 'storms', 'ghosts', 'edges']) expect(group(svg, id), `#${id} is not drawn`).toBeUndefined();
  // Past the definitions, nothing in the weather carries a hue or a light the map did not earn.
  const weather = drawn(svg, 'weather');
  const painted = weather.slice(weather.indexOf('</defs>'));
  for (const forbidden of [IFR_HUE, LIFR_HUE, EVIDENCE_LIGHT, GHOST_STROKE, TEXTURE_INK, `url(#${HATCH_ID})`, `url(#${STIPPLE_ID})`, 'url(#arrow-']) {
    expect(painted).not.toContain(forbidden);
  }
  expect(count(painted, /<g id=/g)).toBe(2);
});

test('every mark in the weather names something the layout placed', () => {
  const map = demo();
  const weather = drawn(renderSvg(map), 'weather');
  const placed = new Set([...Object.keys(map.terrain.layout?.positions ?? {}), ...Object.keys(map.terrain.layout?.contours ?? {})]);
  const named = [...weather.matchAll(/data-(?:id|via|from|to|over)="([^"]+)"/g)].map(([, id]) => id ?? '');
  expect(named.length).toBeGreaterThan(20);
  for (const id of named) expect(placed.has(id), `${id} is on the field`).toBe(true);
});
