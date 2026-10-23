import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap, membraneThickness, withinContour } from 'core';
import type { Contour, MapJson } from 'core';
import { expect, test } from 'vitest';

import { renderSvg } from '../render.js';
import { pathOf } from '../terrain.js';
import { DENT_PULL, GLYPH_OFFSET, MEMBRANE_DENT_PULL } from '../tokens.js';

/**
 * The fixture map is core's own demo golden, read across the workspace rather
 * than copied: P2 says every renderer draws the same terrain from one
 * `map.json`, so the SVG golden here is rendered from exactly the bytes core's
 * golden test asserts, and a deliberate change to either is landed by
 * regenerating both. Reading files with `node:fs` is fine in a test; C1 keeps
 * Node out of the code the package ships, and nothing `svg` exports reaches
 * for it.
 *
 * The SVG golden is `renderSvg(demo)`, so a deliberate change to the drawing
 * is landed by writing that string back over `fixtures/demo/atis.svg` and
 * reading the diff before committing it.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const SVG_FIXTURES = join(HERE, '..', '..', 'fixtures');
const CORE_FIXTURES = join(HERE, '..', '..', '..', 'core', 'fixtures');

function demo(): MapJson {
  return assertMap(JSON.parse(readFileSync(join(CORE_FIXTURES, 'demo', 'map.json'), 'utf8')));
}

/** The markup of one layer: from its `id` to the next `id` at any depth, which is the next layer, or the end. */
function layer(svg: string, id: string): string {
  const start = svg.indexOf(`id="${id}"`);
  expect(start, `#${id} is drawn`).toBeGreaterThanOrEqual(0);
  const next = svg.indexOf(' id="', start + 1);
  return svg.slice(start, next === -1 ? svg.length : next);
}

function count(markup: string, pattern: RegExp): number {
  return [...markup.matchAll(pattern)].length;
}

/** The inverse of the renderer's escaping, so a path can be read back out of an attribute. */
function unescape(value: string): string {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&');
}

/** A map small enough to write by hand, with awkward characters wherever a path or a name lands. */
const AWKWARD_FILE = 'src/<weird>&"q\'s".ts';
const AWKWARD_GROUP = 'docs & <notes>';
const AWKWARD_DOC = 'docs/a&b.md';

function awkward(): MapJson {
  const cell = 'single:src/<weird>&"q\'s".ts';
  return {
    meta: {
      schema_version: 1,
      generated_at: '',
      repo: 'awkward',
      base: 'main',
      head: 'a'.repeat(40),
      merge_base: 'b'.repeat(40),
      mode: 'change',
      instruments: { mode: 'git-only', reason: 'no .check/' },
    },
    terrain: {
      cells: [
        { id: cell, path: AWKWARD_FILE, kind: 'single', organelles: [AWKWARD_FILE], band: 0, interface_size: 2, body_loc: 10, dents: [] },
      ],
      organelles: [
        { id: AWKWARD_FILE, path: AWKWARD_FILE, cell, band: 0, reachable: true, loc: 10, dents: [] },
      ],
      bands: [{ index: 0, depth_min: 0, depth_max: 0 }],
      groups: [{ id: AWKWARD_GROUP, files: [AWKWARD_DOC] }],
      edges_exceptional: [],
      history: { window_commits: 0, cochange: [] },
      layout: {
        width: 200,
        height: 150,
        shore: { y0: 0, y1: 50 },
        bands: [{ index: 0, y0: 50, y1: 150 }],
        positions: { [AWKWARD_DOC]: { x: 30, y: 25, r: 4 }, [AWKWARD_FILE]: { x: 100, y: 100, r: 8 } },
        contours: {
          [AWKWARD_GROUP]: [[20, 15], [40, 15], [40, 35], [20, 35], [20, 15]],
          [cell]: [[80, 80], [120, 80], [120, 120], [80, 120], [80, 80]],
        },
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
    },
    notices: [],
  };
}

test('a map without a layout is refused rather than laid out here', () => {
  const map = demo();
  const { layout: _layout, ...terrain } = map.terrain;
  expect(() => renderSvg({ ...map, terrain })).toThrow(/terrain\.layout/);
});

test('paths and names with <, & and quotes round-trip through the attributes and the labels', () => {
  const svg = renderSvg(awkward());

  // Nothing leaves raw: the file's own angle brackets never open a tag.
  expect(svg).not.toContain('<weird>');
  expect(svg).not.toContain('<notes>');

  // Each awkward string lands, escaped, and reads back as itself.
  const ids = [...svg.matchAll(/data-id="([^"]*)"/g)].map(([, id]) => unescape(id ?? ''));
  expect(ids).toContain(AWKWARD_FILE);
  expect(ids).toContain(AWKWARD_DOC);
  expect(ids).toContain('single:src/<weird>&"q\'s".ts');
  const world = svg.slice(0, svg.indexOf('<g id="chrome"'));
  const labels = [...world.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(([, text]) => unescape(text ?? ''));
  expect(labels).toEqual([AWKWARD_GROUP]);
  expect(svg).toContain('data-group="docs &amp; &lt;notes&gt;"');
});

test('the world is drawn bottom up: field, terraces, shore, membranes, organelles', () => {
  const svg = renderSvg(demo());
  expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ')).toBe(true);
  const order = ['world', 'field', 'terraces', 'shore', 'membranes', 'organelles'].map((id) => svg.indexOf(`id="${id}"`));
  expect(order.every((at) => at >= 0)).toBe(true);
  expect(order).toEqual([...order].toSorted((a, b) => a - b));
  expect(layer(svg, 'field')).toMatch(/^id="field" x="0" y="0" width="480" height="660" fill="#[0-9a-f]{6}"/);
});

test('one faint strip and one contour line per band, with band 0 uppermost', () => {
  const map = demo();
  const terraces = layer(renderSvg(map), 'terraces');
  const bands = map.terrain.layout?.bands ?? [];
  expect(count(terraces, /<rect /g)).toBe(bands.length);
  expect(count(terraces, /<line /g)).toBe(bands.length);
  const tops = [...terraces.matchAll(/<g data-band="(\d+)">\s*<rect x="0" y="([\d.]+)"/g)].map(([, band, y]) => [Number(band), Number(y)] as const);
  expect(tops.map(([band]) => band)).toEqual([0, 1, 2, 3, 4, 5]);
  const ys = tops.map(([, y]) => y);
  expect(ys).toEqual(ys.toSorted((a, b) => a - b));
  expect(tops[0]?.[1]).toBe(map.terrain.layout?.shore.y1);
});

test('the shore draws one contour, one small-caps label and its marks per group with a mark on the field', () => {
  const map = demo();
  const shore = layer(renderSvg(map), 'shore');
  const drawn = map.terrain.groups.filter((group) => group.files.some((file) => map.terrain.layout?.positions[file] !== undefined));
  expect(drawn.map((group) => group.id)).toEqual(['build', 'docs', 'config', 'settings', 'deps', 'other']);
  expect([...shore.matchAll(/data-group="([^"]+)"/g)].map(([, id]) => id)).toEqual(drawn.map((group) => group.id));
  expect(count(shore, /<path /g)).toBe(drawn.length);
  expect(count(shore, /font-variant="small-caps"/g)).toBe(drawn.length);
  expect(count(shore, /<circle /g)).toBe(drawn.reduce((total, group) => total + group.files.length, 0));
  // The tests group has files and no marks (D4), so it has no block.
  expect(shore).not.toContain('data-group="tests"');
  expect(shore).not.toContain('pm.test.ts');
});

test('one membrane path per cell, stroked as thick as its interface', () => {
  const map = demo();
  const membranes = layer(renderSvg(map), 'membranes');
  expect(count(membranes, /<path [^>]*data-kind=/g)).toBe(map.terrain.cells.length);
  const widths = new Map(
    [...membranes.matchAll(/data-id="([^"]+)" data-kind="\w+"(?: data-dents="[^"]*")? stroke-width="([\d.]+)"/g)].map(
      ([, id, width]) => [id ?? '', Number(width)] as const,
    ),
  );
  expect([...widths.keys()].toSorted((a, b) => (a < b ? -1 : a > b ? 1 : 0))).toEqual(map.terrain.cells.map((cell) => cell.id));
  // interface_size 3 draws thicker than interface_size 1.
  expect(widths.get('folder:libs/core/src/pm') ?? 0).toBeGreaterThan(widths.get('package:apps/cli') ?? Number.POSITIVE_INFINITY);
  // The package is drawn before the folder it holds, so the inner skin lies on top (D45).
  expect(membranes.indexOf('data-id="package:libs/core"')).toBeLessThan(membranes.indexOf('data-id="folder:libs/core/src/pm"'));
});

type Point = readonly [number, number];

/** A membrane's drawn ring, read back out of its `d`, with the rules it says it wears. */
function skinOf(membranes: string, id: string): { readonly dents: string | undefined; readonly ring: readonly Point[] } {
  const match = new RegExp(`<path data-id="${id}" data-kind="\\w+"(?: data-dents="([^"]*)")? stroke-width="[\\d.]+" d="([^"]+)"`).exec(membranes);
  expect(match, `${id} has a membrane`).not.toBeNull();
  const ring = [...(match?.[2] ?? '').matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map(([, x, y]) => [Number(x), Number(y)] as const);
  return { dents: match?.[1], ring };
}

/** A glyph's family, shape and centre, read back out of the layer it hangs in. */
function glyphOf(markup: string, id: string): { readonly family: string; readonly d: string; readonly at: Point } | undefined {
  const match = new RegExp(`<path data-id="${id}" data-family="([^"]+)" d="([^"]+)"[^>]* transform="translate\\((-?[\\d.]+) (-?[\\d.]+)\\)"`).exec(markup);
  if (match === null) return undefined;
  return { family: match[1] ?? '', d: match[2] ?? '', at: [Number(match[3]), Number(match[4])] };
}

/** How far a point lies from a closed ring: the nearest of its segments. */
function offRing([px, py]: Point, contour: Contour): number {
  return contour.reduce((nearest, [ax, ay], index) => {
    const [bx, by] = contour[(index + 1) % contour.length] ?? [ax, ay];
    const span = (bx - ax) ** 2 + (by - ay) ** 2;
    const t = span === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / span));
    return Math.min(nearest, Math.hypot(px - (ax + t * (bx - ax)), py - (ay + t * (by - ay))));
  }, Number.POSITIVE_INFINITY);
}

/** The uppermost point of a ring, the leftmost of a tie: where the weather hangs a storm. */
function topOf(contour: Contour): Point | undefined {
  return [...contour].toSorted(([ax, ay], [bx, by]) => ay - by || ax - bx)[0];
}

test('a cell with dents pulls one point out of its membrane per rule, and an undented cell is its contour as cut', () => {
  const map = demo();
  const membranes = layer(renderSvg(map), 'membranes');
  const dented = map.terrain.cells.filter((cell) => cell.dents.length > 0).map((cell) => cell.id);
  // The demo has a one-rule directory, a two-rule folder and the three-rule package that holds both.
  expect(dented.toSorted()).toEqual(['directory:libs/core/src/util', 'folder:libs/core/src/pm', 'package:libs/core']);
  for (const cell of map.terrain.cells) {
    const contour = map.terrain.layout?.contours?.[cell.id];
    if (contour === undefined) continue;
    const { dents, ring } = skinOf(membranes, cell.id);
    if (cell.dents.length === 0) {
      expect(dents).toBeUndefined();
      expect(membranes).toContain(`d="${pathOf(contour)}"`);
      continue;
    }
    expect(dents).toBe(cell.dents.join(' '));
    const pulled = ring.filter((point) => offRing(point, contour) > MEMBRANE_DENT_PULL / 2);
    expect(pulled, `${cell.id} has one tooth per rule`).toHaveLength(cell.dents.length);
    for (const point of pulled) expect(withinContour(contour, point[0], point[1]), `${cell.id}'s tooth points out`).toBe(false);
    // Everything else is the skin core cut, and its top is kept for the storm that hangs there.
    for (const point of ring.filter((candidate) => !pulled.includes(candidate))) expect(offRing(point, contour)).toBeLessThan(0.02);
    expect(ring).toContainEqual(topOf(contour));
  }
});

/** A one-cell map whose membrane is a regular 48-gon of radius 30, so where each tooth lands reads off as an angle. */
const RING_CELL = 'single:src/a.ts';
const RING_FILE = 'src/a.ts';

function ringed(dents: readonly string[], family?: string): MapJson {
  const contour = Array.from({ length: 49 }, (_, index) => {
    const angle = (2 * Math.PI * (index % 48)) / 48;
    return [100 + 30 * Math.cos(angle), 100 + 30 * Math.sin(angle)] as const;
  });
  const clone = family === undefined ? {} : { clone_family: family };
  const map = awkward();
  return {
    ...map,
    terrain: {
      ...map.terrain,
      cells: [{ id: RING_CELL, path: RING_FILE, kind: 'single', organelles: [RING_FILE], band: 0, interface_size: 2, body_loc: 10, dents, ...clone }],
      organelles: [{ id: RING_FILE, path: RING_FILE, cell: RING_CELL, band: 0, reachable: true, loc: 10, dents: [], ...clone }],
      groups: [],
      layout: {
        width: 200,
        height: 200,
        shore: { y0: 0, y1: 0 },
        bands: [{ index: 0, y0: 0, y1: 200 }],
        positions: { [RING_FILE]: { x: 100, y: 100, r: 8 } },
        contours: { [RING_CELL]: contour },
      },
    },
  };
}

test.each([1, 2, 3, 6])('%i teeth are spread evenly round the membrane with its top midway between two', (rules) => {
  const dents = ['boundary', 'cognitive', 'crap', 'cycle', 'cyclomatic', 'unit-size'].slice(0, rules);
  const { ring } = skinOf(layer(renderSvg(ringed(dents)), 'membranes'), RING_CELL);
  const pulled = ring.filter(([x, y]) => Math.hypot(x - 100, y - 100) > 30 + MEMBRANE_DENT_PULL / 2);
  expect(pulled).toHaveLength(rules);
  for (const [x, y] of pulled) expect(Math.hypot(x - 100, y - 100)).toBeCloseTo(30 + MEMBRANE_DENT_PULL, 0);
  // The top is -90°; the teeth start half a spacing past it and go on a whole spacing apart.
  const angles = pulled.map(([x, y]) => (((Math.atan2(y - 100, x - 100) * 180) / Math.PI + 90 + 360) % 360)).toSorted((a, b) => a - b);
  const expected = Array.from({ length: rules }, (_, k) => 180 / rules + (k * 360) / rules);
  angles.forEach((angle, k) => expect(Math.abs(angle - (expected[k] ?? 0))).toBeLessThan(1.5));
  expect(ring).toContainEqual([100, 70]);
});

test('a cell in a clone family carries its family glyph just past its membrane, the same glyph its files carry', () => {
  const map = demo();
  const svg = renderSvg(map);
  const membranes = layer(svg, 'membranes');
  const organelles = layer(svg, 'organelles');
  const members = map.terrain.cells.filter((cell) => cell.clone_family !== undefined);
  expect(members.map((cell) => cell.id).toSorted()).toEqual(['folder:libs/core/src/pm', 'package:libs/core']);
  const fileGlyph = glyphOf(organelles, 'libs/core/src/pm/tools.ts');
  for (const cell of members) {
    const glyph = glyphOf(membranes, cell.id);
    expect(glyph?.family).toBe(cell.clone_family);
    expect(glyph?.d).toBe(fileGlyph?.d);
    const contour = map.terrain.layout?.contours?.[cell.id] ?? [];
    const [x, y] = glyph?.at ?? [0, 0];
    expect(withinContour(contour, x, y), `${cell.id}'s glyph hangs outside its skin`).toBe(false);
  }
  // Nobody outside a family wears one on its skin.
  expect(count(membranes, /data-family=/g)).toBe(members.length);

  // On a round cell the glyph hangs at the upper right, the offset past the outer edge of the stroke.
  const round = renderSvg(ringed([], 'family-1'));
  const glyph = glyphOf(layer(round, 'membranes'), RING_CELL);
  const [gx, gy] = glyph?.at ?? [0, 0];
  expect(Math.atan2(gy - 100, gx - 100)).toBeCloseTo(-Math.PI / 4, 1);
  expect(Math.hypot(gx - 100, gy - 100) - 30).toBeCloseTo(GLYPH_OFFSET + membraneThickness(2) / 2, 1);
  expect(glyph?.d).toBe(glyphOf(layer(round, 'organelles'), RING_FILE)?.d);
});

test('one shape per organelle, a circle sized by loc when it conforms', () => {
  const map = demo();
  const organelles = layer(renderSvg(map), 'organelles');
  expect(count(organelles, /<(circle|polygon) /g)).toBe(map.terrain.organelles.length);
  const radii = new Map([...organelles.matchAll(/<circle data-id="([^"]+)" cx="[\d.]+" cy="[\d.]+" r="([\d.]+)"/g)].map(([, id, r]) => [id, Number(r)]));
  const locOf = new Map(map.terrain.organelles.map((organelle) => [organelle.id, organelle.loc]));
  // Bigger file, bigger circle: doctor.ts (212 lines) against index.ts (24).
  expect(radii.get('apps/cli/src/doctor.ts') ?? 0).toBeGreaterThan(radii.get('apps/cli/src/index.ts') ?? Number.POSITIVE_INFINITY);
  expect(locOf.get('apps/cli/src/doctor.ts') ?? 0).toBeGreaterThan(locOf.get('apps/cli/src/index.ts') ?? Number.POSITIVE_INFINITY);
  // Every conforming organelle is a circle and no dented one is.
  for (const organelle of map.terrain.organelles) {
    expect(radii.has(organelle.id)).toBe(organelle.dents.length === 0);
  }
});

test('a two-dent organelle is a polygon with exactly two pulled vertices', () => {
  const map = demo();
  const id = 'libs/core/src/pm/tools.ts';
  const organelle = map.terrain.organelles.find((candidate) => candidate.id === id);
  expect(organelle?.dents).toEqual(['crap', 'cyclomatic']);
  const at = map.terrain.layout?.positions[id];
  expect(at).toBeDefined();
  if (at === undefined) return;

  const organelles = layer(renderSvg(map), 'organelles');
  const polygon = new RegExp(`<polygon data-id="${id}" data-dents="crap cyclomatic" points="([^"]+)"`).exec(organelles);
  expect(polygon).not.toBeNull();
  const points = (polygon?.[1] ?? '').split(' ').map((pair) => pair.split(',').map(Number));
  const distances = points.map(([x = 0, y = 0]) => Math.hypot(x - at.x, y - at.y));
  const pulled = distances.filter((distance) => distance > at.r * 1.1);
  expect(pulled).toHaveLength(2);
  for (const distance of pulled) expect(distance).toBeCloseTo(at.r * DENT_PULL, 1);
  const resting = distances.filter((distance) => distance <= at.r * 1.1);
  for (const distance of resting) expect(distance).toBeCloseTo(at.r, 1);
});

test('every member of a clone family carries the same small glyph, and nobody else carries one', () => {
  const map = demo();
  const organelles = layer(renderSvg(map), 'organelles');
  const glyphs = [...organelles.matchAll(/<path data-id="([^"]+)" data-family="([^"]+)" d="([^"]+)"/g)].map(([, id, family, d]) => ({ id, family, d }));
  const members = map.terrain.organelles.filter((organelle) => organelle.clone_family !== undefined).map((organelle) => organelle.id);
  expect(glyphs.map((glyph) => glyph.id)).toEqual(members);
  expect(new Set(glyphs.map((glyph) => glyph.d)).size).toBe(1);
});

test('the base tissue is greyscale and dim', () => {
  // The terrain is everything before the weather, which is where the luminous marks begin.
  const svg = renderSvg(demo());
  const terrain = svg.slice(0, svg.indexOf('id="weather"'));
  const colours = [...new Set([...terrain.matchAll(/#([0-9a-f]{6})\b/g)].map(([, hex]) => hex ?? ''))];
  expect(colours.length).toBeGreaterThan(4);
  for (const hex of colours) {
    const channels = [0, 2, 4].map((at) => Number.parseInt(hex.slice(at, at + 2), 16));
    const chroma = Math.max(...channels) - Math.min(...channels);
    expect(chroma, `#${hex} is greyscale`).toBeLessThanOrEqual(20);
    expect(Math.max(...channels), `#${hex} is dim`).toBeLessThanOrEqual(0x90);
  }
});

test('the still image is still: no animation, script or style', () => {
  const svg = renderSvg(demo());
  for (const forbidden of ['<animate', '<set ', '<script', '<style', 'begin=']) expect(svg).not.toContain(forbidden);
});

test('the demo map renders the golden byte for byte, and the same bytes twice', () => {
  const map = demo();
  const svg = renderSvg(map);
  expect(svg).toBe(readFileSync(join(SVG_FIXTURES, 'demo', 'atis.svg'), 'utf8'));
  expect(renderSvg(map)).toBe(svg);
});
