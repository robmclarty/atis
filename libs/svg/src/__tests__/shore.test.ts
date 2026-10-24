import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson } from 'core';
import { CHROME_INK, SECONDARY_BOX_WIDTH, SHORE_BLOCK_GAP, SHORE_FILES_SHOWN, SHORE_LINE, shoreRail } from 'scene';
import { expect, test } from 'vitest';

import { renderSvg } from '../render.js';
import { layOutShore } from '../shore.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));

/** The markup of the band, `#shore`, from a rendered sheet. */
function bandOf(svg: string): string {
  const start = svg.indexOf('<g id="shore">');
  return start < 0 ? '' : svg.slice(start, svg.indexOf('<g id="legend">'));
}

/** Each block the band drew: its group and its frame. */
function blocksIn(band: string): readonly { readonly group: string; readonly x: number; readonly y: number; readonly width: number; readonly height: number }[] {
  return [...band.matchAll(/<g data-group="([^"]+)"[^>]*>\s*<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map(([, group, x, y, width, height]) => ({
    group: group ?? '',
    x: Number(x),
    y: Number(y),
    width: Number(width),
    height: Number(height),
  }));
}

/** The demo with its shore replaced by these groups and this change on it. */
function withShore(groups: MapJson['terrain']['groups'], changed: MapJson['weather']['changed'] = []): MapJson {
  const terrainChanged = DEMO.weather.changed.filter((file) => file.cell !== undefined);
  return { ...DEMO, terrain: { ...DEMO.terrain, groups }, weather: { ...DEMO.weather, changed: [...terrainChanged, ...changed], ghosts: [] }, notices: [] };
}

test("the band lays the rail's blocks in its order, inside the world's width, never overlapping", () => {
  const svg = renderSvg(DEMO);
  const blocks = blocksIn(bandOf(svg));
  expect(blocks.map((block) => block.group)).toEqual(shoreRail(DEMO).map((block) => block.group));
  const width = DEMO.terrain.layout?.width ?? 0;
  blocks.forEach((block, index) => {
    expect(block.x + block.width).toBeLessThanOrEqual(width);
    for (const other of blocks.slice(index + 1)) {
      const apart = block.x + block.width <= other.x || other.x + other.width <= block.x || block.y + block.height <= other.y || other.y + other.height <= block.y;
      expect(apart, `${block.group} and ${other.group}`).toBe(true);
    }
  });
});

test('a long shore stays compact: forty untouched groups cost a few rows, not a column', () => {
  const groups = Array.from({ length: 40 }, (_, index) => ({ id: `group-${String(index).padStart(2, '0')}`, files: [`g${String(index)}/readme.md`] }));
  const band = layOutShore(shoreRail(withShore(groups)), new Map(), 0, 0, 960);
  const closed = SHORE_LINE + 10;
  expect(band.height).toBeLessThan(6 * (closed + SHORE_BLOCK_GAP));
  expect(band.blocks.size).toBe(40);
});

test("an open block names its changed files, `+` before an added one, and says how many more past the ones it has room for", () => {
  const files = Array.from({ length: SHORE_FILES_SHOWN + 3 }, (_, index) => `docs/page-${String(index)}.md`);
  const changed = files.map((path, index) => ({ path, kind: index === 0 ? ('added' as const) : ('modified' as const), group: 'docs', is_barrel: false, added: 1, deleted: 0, hunks: [] }));
  const band = bandOf(renderSvg(withShore([{ id: 'docs', files }], changed)));
  const named = [...band.matchAll(/<g data-id="([^"]+)" data-kind="(\w+)">/g)].map(([, path, kind]) => [path, kind]);
  expect(named).toHaveLength(SHORE_FILES_SHOWN);
  expect(named[0]).toEqual(['docs/page-0.md', 'added']);
  expect(band).toContain('>+docs/page-0.md</text>');
  expect(band).toContain('>and 3 more</text>');
});

test('`other` is framed heavier, in the ink, since it is never quiet (D48)', () => {
  const band = bandOf(renderSvg(DEMO));
  expect(band).toMatch(new RegExp(`<g data-group="other" data-touched="true" data-loud="true">\\s*<rect [^>]*stroke="${CHROME_INK}" stroke-width="${String(SECONDARY_BOX_WIDTH)}"`));
  expect(band).not.toMatch(/<g data-group="docs"[^>]*data-loud/);
});

test("a notice on a shore file hangs its numbered box at the end of its group's first line, and its leader runs to it", () => {
  const notice = { tier: 'primary' as const, kind: 'dependency-added', target: 'package.json', why: 'a dependency was added', inputs: {}, thresholds: {}, weight: 9 };
  const svg = renderSvg({ ...DEMO, notices: [notice] });
  const deps = blocksIn(bandOf(svg)).find((block) => block.group === 'deps');
  const marks = svg.slice(svg.indexOf('<g id="marks">'));
  const box = /<g data-target="package\.json">[\s\S]*?<rect x="([\d.]+)" y="([\d.]+)"/.exec(marks);
  const [x = 0, y = 0] = (box ?? []).slice(1).map(Number);
  expect(deps).toBeDefined();
  expect(x).toBeGreaterThan(deps?.x ?? 0);
  expect(x).toBeLessThan((deps?.x ?? 0) + (deps?.width ?? 0));
  expect(y).toBeGreaterThan(deps?.y ?? 0);
  expect(y).toBeLessThan((deps?.y ?? 0) + SHORE_LINE + 10);
  // The primary's emphasis re-traces the block it sits on, and a leader joins its row to it.
  expect(marks).toMatch(/<rect data-target="package\.json" data-tier="primary"/);
  expect(svg).toMatch(/<line data-notice="1" x1="[\d.]+" y1="[\d.]+" x2="[\d.]+" y2="[\d.]+"\/>/);
});

test('a map with no shore draws no band and no rule for one', () => {
  const svg = renderSvg(withShore([]));
  expect(svg).not.toContain('id="shore"');
  expect([...svg.matchAll(/<line x1="0" y1="([\d.]+)" x2="[\d.]+" y2="\1"\/>/g)]).toHaveLength(1);
});
