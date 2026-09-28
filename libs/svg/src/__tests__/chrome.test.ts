import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { FlightCategory, MapJson, Notice, NoticeTier, Organelle } from 'core';
import { expect, test } from 'vitest';

import { CATEGORY_HUES, HUD_ORDER, NOTICE_BUDGET, wrap } from '../chrome.js';
import { renderSvg } from '../render.js';
import {
  CHROME_INK,
  CHROME_MUTED,
  IFR_HUE,
  LEADER_DASH,
  MUTED_DASH,
  NOTICE_BOX,
  PRIMARY_RING_WIDTH,
  SECONDARY_RING_WIDTH,
} from '../tokens.js';

/**
 * The demo map is core's own golden, read across the workspace (P2, and see
 * `render.test.ts`). Its verdict is IFR; the other four categories are the
 * same map with the verdict swapped by `variant`, so one terrain carries
 * every hue of §5.3 and the chrome is golden-tested once per category.
 *
 * The five goldens are `renderSvg(variant(category))`. A deliberate change
 * to the chrome is landed by writing them back: `ATIS_UPDATE_GOLDENS=1 pnpm
 * vitest run libs/svg` rewrites every golden this file and `render.test.ts`
 * share, and the diff is read before it is committed.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const SVG_FIXTURES = join(HERE, '..', '..', 'fixtures');
const CORE_FIXTURES = join(HERE, '..', '..', '..', 'core', 'fixtures');

const CATEGORIES: readonly FlightCategory[] = ['VFR', 'MVFR', 'IFR', 'LIFR', 'NOINST'];

const GOLDENS: Readonly<Record<FlightCategory, string>> = {
  VFR: join('categories', 'VFR.svg'),
  MVFR: join('categories', 'MVFR.svg'),
  IFR: join('demo', 'atis.svg'),
  LIFR: join('categories', 'LIFR.svg'),
  NOINST: join('categories', 'NOINST.svg'),
};

function demo(): MapJson {
  return assertMap(JSON.parse(readFileSync(join(CORE_FIXTURES, 'demo', 'map.json'), 'utf8')));
}

/** The demo with its verdict swapped: green slots and passed stitches for a VFR or MVFR, nothing trusted for a NOINST. */
function variant(category: FlightCategory): MapJson {
  const map = demo();
  const { weather } = map;
  if (category === 'IFR') return map;
  if (category === 'NOINST') {
    return {
      ...map,
      meta: { ...map.meta, instruments: { mode: 'git-only', reason: 'no .check/' } },
      weather: { ...weather, checks: { category, checks_run: 0, slots: [] }, evidence: {} },
    };
  }
  if (category === 'LIFR') return { ...map, weather: { ...weather, checks: { ...weather.checks, category } } };
  return {
    ...map,
    weather: {
      ...weather,
      checks: {
        ...weather.checks,
        category,
        slots: weather.checks.slots.map((slot) => ({ ...slot, ok: true, scope: 'global' as const })),
      },
      evidence: {
        ...weather.evidence,
        stitches: (weather.evidence.stitches ?? []).map((stitch) => ({ ...stitch, status: 'passed' })),
      },
    },
  };
}

/** The chrome's markup: from its group to the end of the file, since it is the last thing drawn. */
function chromeOf(svg: string): string {
  const at = svg.indexOf('<g id="chrome"');
  expect(at, '#chrome is drawn').toBeGreaterThanOrEqual(0);
  return svg.slice(at);
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

/** One HUD block's markup, by its `data-block`. */
function blockOf(chrome: string, id: string): string | undefined {
  return new RegExp(`<g data-block="${id}"[^>]*>[\\s\\S]*?</g>`).exec(chrome)?.[0];
}

/** What a piece of markup reads as: each `<text>` a run, the runs joined by one space, the tags inside them gone. */
function textOf(markup: string): string {
  return markup
    .replace(/<\/text>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function blockIds(chrome: string): readonly string[] {
  return [...drawn(chrome, 'hud').matchAll(/data-block="([^"]+)"/g)].map(([, id]) => id ?? '');
}

/** A box's centre from its `<rect x y>`; the numbered boxes in a row and on the map share one size. */
function boxCentre(markup: string, rank: number): readonly [number, number] {
  const box = new RegExp(`<g data-mark="${String(rank)}"[^>]*>\\s*<rect x="([\\d.]+)" y="([\\d.]+)"`).exec(markup);
  expect(box, `mark ${String(rank)} is drawn`).not.toBeNull();
  return [Number(box?.[1]) + NOTICE_BOX / 2, Number(box?.[2]) + NOTICE_BOX / 2];
}

/** A hand-built notice: its why names its kind and its target, and its one threshold is its severity. */
function noticeOf(tier: NoticeTier, kind: string, target: string): Notice {
  return { tier, kind, target, why: `${kind} on ${target}`, inputs: {}, thresholds: { severity: 5 }, weight: 5 };
}

/** A small map with three placed files and one notice of each tier, each on its own file; the third sits at the field's right edge. */
function tiered(): MapJson {
  const cell = 'folder:src';
  const files = ['src/a.ts', 'src/b.ts', 'src/c.ts'];
  const organelle = (path: string): Organelle => ({ id: path, path, cell, band: 0, reachable: true, loc: 10, dents: [] });
  return {
    meta: {
      schema_version: 1,
      generated_at: '',
      repo: 'tiered',
      base: 'main',
      head: 'a'.repeat(40),
      merge_base: 'b'.repeat(40),
      mode: 'change',
      instruments: { mode: 'check' },
    },
    terrain: {
      cells: [{ id: cell, path: 'src', kind: 'folder', organelles: files, band: 0, interface_size: 1, body_loc: 30, dents: [] }],
      organelles: files.map(organelle),
      bands: [{ index: 0, depth_min: 0, depth_max: 0 }],
      groups: [],
      edges_exceptional: [],
      history: { window_commits: 0, cochange: [] },
      layout: {
        width: 480,
        height: 200,
        shore: { y0: 0, y1: 0 },
        bands: [{ index: 0, y0: 0, y1: 200 }],
        positions: { 'src/a.ts': { x: 100, y: 100, r: 8 }, 'src/b.ts': { x: 240, y: 100, r: 8 }, 'src/c.ts': { x: 470, y: 100, r: 8 } },
      },
    },
    weather: {
      changed: [],
      reach: [],
      evidence: {},
      checks: { category: 'IFR', checks_run: 1, slots: [{ name: 'lint', ok: true, skipped: false, scope: 'global' }] },
      ghosts: [],
      deps_added: [],
      improvements: [],
    },
    notices: [
      noticeOf('primary', 'deleted-export', 'src/a.ts'),
      noticeOf('secondary', 'interface-change', 'src/b.ts'),
      noticeOf('tertiary', 'bedrock-change', 'src/c.ts'),
    ],
  };
}

test('the HUD draws the blocks of §7 in order, with Other only when the other group has files', () => {
  const map = demo();
  expect(blockIds(chromeOf(renderSvg(map)))).toEqual(HUD_ORDER);

  const groups = map.terrain.groups.filter((entry) => entry.id !== 'other');
  const without = chromeOf(renderSvg({ ...map, terrain: { ...map.terrain, groups } }));
  expect(blockIds(without)).toEqual(HUD_ORDER.filter((id) => id !== 'other'));
});

test('every HUD number is read from the map', () => {
  const chrome = chromeOf(renderSvg(demo()));
  const read = (id: string): string => textOf(blockOf(chrome, id) ?? '');
  // Six of the eight slots that ran are green; security was skipped and counts in neither.
  expect(read('checks')).toBe('Checks 6/8');
  // 4 + 4 + 7 covered of 7 + 9 + 9 changed executable lines.
  expect(read('patch-cov')).toBe('Patch cov 60%');
  expect(read('mutants')).toBe('Mutants 2 survived');
  expect(read('reach')).toBe('Reach 4 cells');
  expect(read('size')).toBe('Size +243 −102, 8 files');
  expect(read('health')).toBe(`Health Δ ${MUTED_DASH}`);
  expect(read('notices')).toBe('Notices 1·2·3');
  expect(read('other')).toBe('Other 1');
  // The value is the big numeral: bold, after a plain label.
  expect(blockOf(chrome, 'checks')).toMatch(/<tspan>Checks <\/tspan><tspan font-weight="bold">6\/8<\/tspan>/);
});

test('a block whose input is absent or stale is muted with a dash, and the category letters are always present', () => {
  const muted = (chrome: string, id: string): string | undefined =>
    /data-muted="true" data-reason="([\w-]+)"/.exec(blockOf(chrome, id) ?? '')?.[1];
  const live = chromeOf(renderSvg(demo()));
  for (const id of ['category', 'checks', 'patch-cov', 'mutants', 'reach', 'size', 'notices', 'other']) {
    expect(muted(live, id), `${id} is live`).toBeUndefined();
  }
  // The delta needs a base-side run this build never makes (D23).
  expect(muted(live, 'health')).toBe('head-only');
  expect(textOf(blockOf(live, 'health') ?? '')).toContain(MUTED_DASH);

  // No `.check/` was trusted: the verdict is NOINST and every evidence block is a dash (C2, D41).
  const none = chromeOf(renderSvg(variant('NOINST')));
  expect(muted(none, 'checks')).toBe('absent');
  expect(muted(none, 'patch-cov')).toBe('absent');
  expect(muted(none, 'mutants')).toBe('absent');
  expect(textOf(blockOf(none, 'checks') ?? '')).toBe(`Checks ${MUTED_DASH}`);
  expect(textOf(blockOf(none, 'category') ?? '')).toBe('NOINST');
  expect(blockOf(none, 'category')).toContain(`fill="${CHROME_MUTED}"`);
  expect(muted(none, 'reach')).toBeUndefined();
  expect(muted(none, 'size')).toBeUndefined();

  // A slot whose raw file predated the run mutes its block even when the map still carries a value (D41).
  const map = demo();
  const stale = chromeOf(
    renderSvg({ ...map, meta: { ...map.meta, instruments: { ...map.meta.instruments, stale: ['mutation: mutation.json, 5000 ms older than the run'] } } }),
  );
  expect(muted(stale, 'mutants')).toBe('stale');
  expect(muted(stale, 'patch-cov')).toBeUndefined();

  // Coverage that measured no changed executable line has no share to report.
  const empty = chromeOf(
    renderSvg({
      ...map,
      weather: {
        ...map.weather,
        evidence: { ...map.weather.evidence, patch_coverage: [{ path: 'README.md', changed_executable: 0, covered: 0, uncovered_lines: [] }] },
      },
    }),
  );
  expect(muted(empty, 'patch-cov')).toBe('empty');

  // Every category writes its letters on its own hue; NOINST, which has none, on the muted grey (C11).
  for (const category of CATEGORIES) {
    const block = blockOf(chromeOf(renderSvg(variant(category))), 'category') ?? '';
    expect(textOf(block), `${category} letters`).toBe(category);
    expect(block).toContain(`data-category="${category}"`);
    expect(block).toContain(`fill="${CATEGORY_HUES[category] ?? CHROME_MUTED}"`);
  }
});

test('the notice list draws at most six rows in rank order, each with its why and the thresholds that produced it', () => {
  const map = demo();
  const rows = [...drawn(chromeOf(renderSvg(map)), 'notices').matchAll(/<g data-notice="(\d)" data-tier="(\w+)" data-kind="([\w-]+)" data-target="([^"]+)">([\s\S]*?)\n {6}<\/g>/g)].map(
    ([, rank, tier, kind, target, body]) => ({ rank: Number(rank), tier, kind, target, text: textOf(body ?? '') }),
  );
  expect(rows.map((row) => row.rank)).toEqual([1, 2, 3, 4, 5, 6]);
  expect(rows.map((row) => row.tier)).toEqual(map.notices.map((notice) => notice.tier));
  expect(rows.map((row) => row.kind)).toEqual(map.notices.map((notice) => notice.kind));
  expect(rows.map((row) => row.target)).toEqual(map.notices.map((notice) => notice.target));
  for (const [index, notice] of map.notices.entries()) {
    const row = rows[index];
    expect(row?.text).toContain(notice.target);
    expect(row?.text).toContain(notice.why);
    for (const [key, value] of Object.entries(notice.thresholds)) expect(row?.text).toContain(`${key} ${String(value)}`);
  }
  expect(rows.find((row) => row.kind === 'large-hot-change')?.text).toContain('severity 4 · large_lines 100 · hot_churn_ratio 2 · hot_bugfix_rate 0.3');

  // A seventh notice has no row: the budget is C7's, whatever the renderer is handed.
  const extra: Notice = { ...(map.notices[5] ?? map.notices[0]), kind: 'bedrock-change', why: 'a seventh' } as Notice;
  const seven = chromeOf(renderSvg({ ...map, notices: [...map.notices, extra] }));
  expect([...drawn(seven, 'notices').matchAll(/<g data-notice="(\d)"/g)]).toHaveLength(NOTICE_BUDGET);
  expect(seven).not.toContain('a seventh');
  expect(textOf(blockOf(seven, 'notices') ?? '')).toBe('Notices 1·2·3');

  // No notices, no rows, and the tally says so (C7: never padded).
  const calm = chromeOf(renderSvg({ ...map, notices: [] }));
  expect(calm).toContain('<g id="notices"/>');
  expect(textOf(blockOf(calm, 'notices') ?? '')).toBe('Notices 0·0·0');
  expect(group(calm, 'leaders')).toBeUndefined();
  expect(group(calm, 'marks')).toBeUndefined();
});

test('one dotted leader per placed notice, from the centre of its row box to the centre of its mark on the map', () => {
  const map = demo();
  const chrome = chromeOf(renderSvg(map));
  const leaders = drawn(chrome, 'leaders');
  expect(leaders).toContain(`stroke-dasharray="${LEADER_DASH}"`);
  const lines = [...leaders.matchAll(/<line data-notice="(\d)" x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"\/>/g)].map(
    ([, rank, x1, y1, x2, y2]) => ({ rank: Number(rank), from: [Number(x1), Number(y1)], to: [Number(x2), Number(y2)] }),
  );
  expect(lines.map((line) => line.rank)).toEqual([1, 2, 3, 4, 5, 6]);
  const rows = drawn(chrome, 'notices');
  const marks = drawn(chrome, 'marks');
  for (const line of lines) {
    expect(line.from).toEqual(boxCentre(rows, line.rank));
    expect(line.to).toEqual(boxCentre(marks, line.rank));
  }
  // The leaders are laid under the rows and the marks, so each ends where its box begins.
  expect(chrome.indexOf('id="leaders"')).toBeLessThan(chrome.indexOf('id="notices"'));
  expect(chrome.indexOf('id="notices"')).toBeLessThan(chrome.indexOf('id="marks"'));

  // A target no slot claims and the field cannot place keeps its row and gets no leader and no mark.
  const stray: Notice = { tier: 'tertiary', kind: 'red-check-slot', target: 'nowhere', why: 'the `nowhere` check is red for the whole repository', inputs: {}, thresholds: { severity: 10 }, weight: 10 };
  const unplaced = chromeOf(renderSvg({ ...map, notices: [...map.notices.slice(0, 5), stray] }));
  expect(drawn(unplaced, 'notices')).toMatch(/<g data-notice="6" data-tier="tertiary" data-kind="red-check-slot" data-target="nowhere" data-unplaced="true">/);
  expect([...drawn(unplaced, 'leaders').matchAll(/<line data-notice="(\d)"/g)].map(([, rank]) => rank)).toEqual(['1', '2', '3', '4', '5']);
  expect(drawn(unplaced, 'marks')).not.toContain('data-mark="6"');

});

test('a notice naming a red global slot keeps its row and draws no leader, since the slot hangs no storm (D68)', () => {
  const map = demo();

  // `lint` turns red for the whole repository, and the sixth notice names it rather than a file.
  const slot: Notice = { tier: 'tertiary', kind: 'red-check-slot', target: 'lint', why: 'the `lint` check is red for the whole repository', inputs: {}, thresholds: { severity: 10 }, weight: 10 };
  const svg = renderSvg({
    ...map,
    weather: { ...map.weather, checks: { ...map.weather.checks, slots: map.weather.checks.slots.map((each) => (each.name === 'lint' ? { ...each, ok: false } : each)) } },
    notices: [...map.notices.slice(0, 5), slot],
  });
  expect(svg).not.toContain('data-slot="lint"');

  const chrome = chromeOf(svg);
  expect(drawn(chrome, 'notices')).toMatch(/<g data-notice="6" data-tier="tertiary" data-kind="red-check-slot" data-target="lint" data-unplaced="true">/);
  expect([...drawn(chrome, 'leaders').matchAll(/<line data-notice="(\d)"/g)].map(([, rank]) => rank)).toEqual(['1', '2', '3', '4', '5']);
  expect(drawn(chrome, 'marks')).not.toContain('data-mark="6"');
});

test('tier emphasis on the map: the primary a ring in the category hue and its kind, a secondary a thick ring in ink, a tertiary the mark alone', () => {
  const map = tiered();
  const marks = drawn(chromeOf(renderSvg(map)), 'marks');
  const rings = [...marks.matchAll(/<circle data-target="([^"]+)" data-tier="(\w+)" fill="none" stroke="([^"]+)" stroke-width="([\d.]+)"/g)].map(
    ([, target, tier, stroke, width]) => ({ target, tier, stroke, width: Number(width) }),
  );
  expect(rings).toEqual([
    { target: 'src/a.ts', tier: 'primary', stroke: IFR_HUE, width: PRIMARY_RING_WIDTH },
    { target: 'src/b.ts', tier: 'secondary', stroke: CHROME_INK, width: SECONDARY_RING_WIDTH },
  ]);
  // The primary's kind is written in the hue under its mark; nobody else gets a label.
  const labels = [...marks.matchAll(/<text data-target="([^"]+)"[^>]*fill="([^"]+)">([^<]*)<\/text>/g)].map(([, target, fill, text]) => [target, fill, text]);
  expect(labels).toEqual([['src/a.ts', IFR_HUE, 'deleted-export']]);
  // One mark per notice, at its target's lower right, and at its lower left when the run would leave the field.
  const boxes = [1, 2, 3].map((rank) => boxCentre(marks, rank));
  expect(boxes[0]?.[0]).toBeGreaterThan(100);
  expect(boxes[1]?.[0]).toBeGreaterThan(240);
  expect(boxes[2]?.[0]).toBeLessThan(470);
  for (const [, y] of boxes) expect(y).toBeGreaterThan(100);
});

test('a target with several notices carries one ring, for its strongest tier, and one mark per notice side by side', () => {
  const map = demo();
  const marks = drawn(chromeOf(renderSvg(map)), 'marks');
  const runs = [...marks.matchAll(/<g data-target="([^"]+)">/g)].map(([, target]) => target);
  expect(runs).toEqual(['libs/core/src/pm/index.ts', 'libs/core/src/pm/tools.ts', 'apps/cli/src/doctor.ts']);
  expect([...marks.matchAll(/<circle data-target="([^"]+)" data-tier="(\w+)"/g)].map(([, target, tier]) => [target, tier])).toEqual([
    ['libs/core/src/pm/index.ts', 'primary'],
  ]);
  expect([...marks.matchAll(/data-mark="(\d)"/g)].map(([, rank]) => rank)).toEqual(['1', '2', '3', '4', '5', '6']);
  const [one, two, three] = [1, 2, 3].map((rank) => boxCentre(marks, rank));
  expect(one?.[1]).toBe(two?.[1]);
  expect(two?.[1]).toBe(three?.[1]);
  expect(one?.[0] ?? 0).toBeLessThan(two?.[0] ?? 0);
  expect(two?.[0] ?? 0).toBeLessThan(three?.[0] ?? 0);
});

test('the chrome is flat, hard-edged and still: no gradient, filter, opacity or animation under #chrome (D12, C10)', () => {
  for (const map of [demo(), variant('NOINST'), tiered()]) {
    const chrome = chromeOf(renderSvg(map));
    for (const forbidden of ['<linearGradient', '<radialGradient', '<filter', '<animate', '<set ', 'filter=', 'url(#', 'opacity=', '<style', '<script', 'font-family=']) {
      expect(chrome, `no ${forbidden} under #chrome`).not.toContain(forbidden);
    }
    for (const [, paint] of chrome.matchAll(/(?:fill|stroke)="([^"]+)"/g)) expect(paint).toMatch(/^(?:none|#[0-9a-f]{6})$/);
  }
});

test('the chrome frames the world and never covers it', () => {
  const map = demo();
  const svg = renderSvg(map);
  const layout = map.terrain.layout;
  expect(layout).toBeDefined();
  if (layout === undefined) return;
  // The canvas is the world plus the strip above it and the column beside it; the world is set down under the strip.
  const canvas = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  expect(Number(canvas?.[1])).toBe(layout.width + 300);
  expect(Number(canvas?.[2])).toBeGreaterThanOrEqual(layout.height);
  const shift = /<g id="world" transform="translate\(0 ([\d.]+)\)">/.exec(svg);
  const worldY = Number(shift?.[1]);
  expect(worldY).toBeGreaterThan(0);
  const chrome = chromeOf(svg);
  for (const [, y, height] of drawn(chrome, 'hud').matchAll(/<rect x="[\d.]+" y="([\d.]+)" width="[\d.]+" height="([\d.]+)"/g)) {
    expect(Number(y) + Number(height)).toBeLessThanOrEqual(worldY);
  }
  for (const [, x] of drawn(chrome, 'notices').matchAll(/<(?:rect|text) x="([\d.]+)"/g)) expect(Number(x)).toBeGreaterThanOrEqual(layout.width);
  // Hard rules where the chrome meets the field.
  expect(drawn(chrome, 'rules')).toContain(`<line x1="0" y1="${String(worldY)}" x2="${String(layout.width + 300)}" y2="${String(worldY)}"/>`);
  expect(drawn(chrome, 'rules')).toContain(`<line x1="${String(layout.width)}" y1="${String(worldY)}"`);
  // The ground is the first thing drawn, and it is flat.
  expect(svg).toMatch(/^<svg [^>]+>\n {2}<rect id="ground" x="0" y="0" width="[\d.]+" height="[\d.]+" fill="#[0-9a-f]{6}"\/>\n {2}<g id="world"/);
});

test('wrap breaks at a character budget and cuts a word longer than the budget', () => {
  expect(wrap('the quick brown fox', 9)).toEqual(['the quick', 'brown fox']);
  expect(wrap('a', 9)).toEqual(['a']);
  expect(wrap('', 9)).toEqual([]);
  expect(wrap('abcdefghijkl end', 5)).toEqual(['abcde', 'fghij', 'kl', 'end']);
});

test.each(CATEGORIES)('the %s golden renders byte for byte', (category) => {
  const svg = renderSvg(variant(category));
  const path = join(SVG_FIXTURES, GOLDENS[category]);
  if (process.env['ATIS_UPDATE_GOLDENS'] === '1') writeFileSync(path, svg);
  expect(svg).toBe(readFileSync(path, 'utf8'));
});
