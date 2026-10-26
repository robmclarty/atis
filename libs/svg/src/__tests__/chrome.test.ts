import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { CheckSlot, FlightCategory, MapJson, Notice, NoticeTier, Organelle } from 'core';
import {
  CHANGE_HUE,
  CHROME_INK,
  CHROME_MUTED,
  EMPHASIS_PAD,
  EVIDENCE_LIGHT,
  HUD_BLOCK_PAD,
  IFR_HUE,
  INTEGRITY_GAP_WIDTH,
  INTEGRITY_PAD,
  LEADER_DASH,
  LEADER_INK,
  MONO_ADVANCE,
  MUTED_DASH,
  NOTICE_BOX,
  PRIMARY_RING_WIDTH,
  SECONDARY_RING_WIDTH,
  noticeAnchors,
} from 'scene';
import { expect, test } from 'vitest';

import { CATEGORY_HUES, HUD_ORDER, NOTICE_BUDGET, wrap } from '../chrome.js';
import { LEGEND, SHAPE_KEY_WORDS } from '../legend.js';
import { renderSvg } from '../render.js';

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
/** The repository's committed fixtures: the outside PRs each reading drew, every one a real HUD to fit. */
const REPO_FIXTURES = join(HERE, '..', '..', '..', '..', 'fixtures');

/** SF Mono's advance, 1266 of its 2048 units: `ui-monospace` on macOS, and the widest face a viewer is likely to draw the SVG in. */
const WIDEST_FACE = 1266 / 2048;

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

/** A slot turned green, which records no split and names no file. */
function greened(slot: CheckSlot, skipped = slot.skipped): CheckSlot {
  return { name: slot.name, ok: true, skipped, scope: 'global' };
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
        slots: weather.checks.slots.map((slot) => greened(slot)),
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

/** A red slot's scope as the map records it: global, or the files it names with the changed files core's split put it on the change through. */
type RedScope = 'global' | { readonly scope: readonly string[]; readonly change: readonly string[] };

/** The demo with some slots' verdicts swapped: `red` names the slots to turn red, each with its scope, and `green` the slots to turn green. */
function slotsSet(map: MapJson, red: Readonly<Record<string, RedScope>>, green: readonly string[] = []): MapJson {
  const slots = map.weather.checks.slots.map((slot): CheckSlot => {
    const turned = red[slot.name];
    if (turned === 'global') return { name: slot.name, ok: false, skipped: false, scope: 'global' };
    if (turned !== undefined) return { name: slot.name, ok: false, skipped: false, ...turned };
    return green.includes(slot.name) ? greened(slot) : slot;
  });
  return { ...map, weather: { ...map.weather, checks: { ...map.weather.checks, slots } } };
}

test('the HUD draws the blocks of §7 in order, with Standing only when some red is standing and Other only when the other group has files', () => {
  // The change's own evidence sits beside the category; the gate and the standing state follow it (D70).
  expect(HUD_ORDER).toEqual(['category', 'patch-cov', 'mutants', 'reach', 'size', 'gate', 'standing', 'health', 'notices', 'other']);
  const map = demo();
  expect(blockIds(chromeOf(renderSvg(map)))).toEqual(HUD_ORDER);

  const groups = map.terrain.groups.filter((entry) => entry.id !== 'other');
  const without = chromeOf(renderSvg({ ...map, terrain: { ...map.terrain, groups } }));
  expect(blockIds(without)).toEqual(HUD_ORDER.filter((id) => id !== 'other'));

  // `dead` names only untouched files; green, nothing is standing and the block is not drawn.
  const clear = chromeOf(renderSvg(slotsSet(map, {}, ['dead'])));
  expect(blockIds(clear)).toEqual(HUD_ORDER.filter((id) => id !== 'standing'));
});

test('every HUD number is read from the map', () => {
  const chrome = chromeOf(renderSvg(demo()));
  const read = (id: string): string => textOf(blockOf(chrome, id) ?? '');
  // `test` tore a stitch on the change; `dead` names only files the change never touched (D67).
  expect(read('gate')).toBe('Gate 1 red');
  expect(read('standing')).toBe('Standing 1 red');
  // 4 + 7 covered of 9 + 9 changed executable lines, and `doctor.ts`, which the report never names, counted beside them (D80).
  expect(read('patch-cov')).toBe('Patch cov 61%, 1 unmeasured');
  // One mutant survived the tests and one no test reached, counted apart (D143).
  expect(read('mutants')).toBe('Mutants 1 survived, 1 untested');
  expect(read('reach')).toBe('Reach 4 cells');
  // The size is the terrain's four files; the shore's README, test, manifest and stray are named apart (D166).
  expect(read('size')).toBe('Size +210 −94, 4 files');
  // The maintainability the demo's fallow measured the change move, with its sign (D98).
  expect(read('health')).toBe('Health Δ +1.9');
  expect(read('notices')).toBe('Notices 1·2·3');
  expect(read('other')).toBe('Other 1');
  // The value is the big numeral: bold, after a plain label.
  expect(blockOf(chrome, 'gate')).toMatch(/<tspan>Gate <\/tspan><tspan font-weight="bold">1<\/tspan><tspan> red<\/tspan>/);
});

test("the Size block counts the terrain's lines and files alone, so a change of source and fixtures reads as its source (D166)", () => {
  const map = demo();
  const fixture = { path: 'libs/core/fixtures/demo/map.json', kind: 'modified' as const, group: 'data', is_barrel: false, added: 2000, deleted: 1800, hunks: [] };
  const changed = [...map.weather.changed.filter((file) => file.path === 'libs/core/src/pm/index.ts'), fixture];
  const read = textOf(blockOf(chromeOf(renderSvg({ ...map, weather: { ...map.weather, changed } })), 'size') ?? '');
  expect(read).toBe('Size +18 −9, 1 files');
});

/** The demo with its live mutants on `tools.ts` given these statuses, one per changed line. */
function mutantsSet(map: MapJson, statuses: readonly string[]): MapJson {
  const mutants = statuses.map((status, index) => ({ path: 'libs/core/src/pm/tools.ts', line: 20 + index, status }));
  return { ...map, weather: { ...map.weather, evidence: { ...map.weather.evidence, mutants } } };
}

test('the Mutants block counts the mutants that survived apart from those no test reached, and names one alone when the other is none (D143)', () => {
  const read = (statuses: readonly string[]): string => textOf(blockOf(chromeOf(renderSvg(mutantsSet(demo(), statuses))), 'mutants') ?? '');

  expect(read([])).toBe('Mutants 0 survived');
  expect(read(['Survived', 'Survived'])).toBe('Mutants 2 survived');
  expect(read(['NoCoverage', 'NoCoverage', 'NoCoverage'])).toBe('Mutants 3 untested');
  expect(read(['Survived', 'NoCoverage', 'NoCoverage'])).toBe('Mutants 1 survived, 2 untested');
});

test('the gate counts the change\'s red and never passes a ratio; the standing block counts the rest and names the global slots (D70)', () => {
  const map = demo();
  const read = (source: MapJson, id: string): string | undefined => {
    const markup = blockOf(chromeOf(renderSvg(source)), id);
    return markup === undefined ? undefined : textOf(markup);
  };

  // Nothing red on the change: the gate passes with no numeral, bold like any value, and the standing red stays in its own block.
  const standingOnly = slotsSet(map, {}, ['test']);
  expect(read(standingOnly, 'gate')).toBe('Gate pass');
  expect(blockOf(chromeOf(renderSvg(standingOnly)), 'gate')).toMatch(/<tspan>Gate <\/tspan><tspan font-weight="bold">pass<\/tspan><\/text>/);
  expect(read(standingOnly, 'standing')).toBe('Standing 1 red');

  // Every slot green: the gate passes and there is no standing block.
  expect(read(variant('VFR'), 'gate')).toBe('Gate pass');
  expect(read(variant('VFR'), 'standing')).toBeUndefined();

  // Two slots red on changed files count two; a slot that names a changed file and untouched ones is the change's alone.
  const two = slotsSet(map, { lint: { scope: ['apps/cli/src/doctor.ts', 'libs/core/src/util/text.ts'], change: ['apps/cli/src/doctor.ts'] } });
  expect(read(two, 'gate')).toBe('Gate 2 red');
  expect(read(two, 'standing')).toBe('Standing 1 red');

  // The blocks read the split core recorded rather than remaking it from paths: a `health` red naming the changed
  // `doctor.ts` whose finding no hunk met is standing state, and the same slot with the finding met is the change's (D73).
  const unmet = slotsSet(map, { health: { scope: ['apps/cli/src/doctor.ts'], change: [] } });
  expect(read(unmet, 'gate')).toBe('Gate 1 red');
  expect(read(unmet, 'standing')).toBe('Standing 2 red');
  const met = slotsSet(map, { health: { scope: ['apps/cli/src/doctor.ts'], change: ['apps/cli/src/doctor.ts'] } });
  expect(read(met, 'gate')).toBe('Gate 2 red');
  expect(read(met, 'standing')).toBe('Standing 1 red');

  // Global red is wholly standing: counted with the untouched-file red and named in the tail, in name order (C3).
  const global = slotsSet(map, { types: 'global', lint: 'global' });
  expect(read(global, 'gate')).toBe('Gate 1 red');
  expect(read(global, 'standing')).toBe('Standing 3 red, global: lint, types');

  // Each red slot sits in exactly one block: the two counts add up to every red slot.
  const count = (id: string): number => Number(/(\d+) red/.exec(read(global, id) ?? '')?.[1]);
  expect(count('gate') + count('standing')).toBe(global.weather.checks.slots.filter((slot) => !slot.ok && !slot.skipped).length);
});

test('a red security stands in the Standing block unless the change brought an advisory, and the gate counts it then (D83, D70)', () => {
  const map = demo();
  const read = (source: MapJson, id: string): string => textOf(blockOf(chromeOf(renderSvg(source)), id) ?? '');

  // Every advisory was in the lockfile before: the slot names the root manifest, the demo's changed `package.json`, and is standing.
  const standing = slotsSet(map, { security: { scope: ['package.json'], change: [] } });
  expect(read(standing, 'gate')).toBe('Gate 1 red');
  expect(read(standing, 'standing')).toBe('Standing 2 red');

  // A package this change added pulls one in: the same red is the change's, through the manifest that added it.
  const brought = slotsSet(map, { security: { scope: ['package.json'], change: ['package.json'] } });
  expect(read(brought, 'gate')).toBe('Gate 2 red');
  expect(read(brought, 'standing')).toBe('Standing 1 red');
});

/** Each HUD block of a rendered map: its id, its box's width, its text and the size it is set in. */
function hudBlocks(svg: string): readonly { readonly id: string; readonly width: number; readonly text: string; readonly size: number }[] {
  const found = svg.matchAll(/<g data-block="([^"]+)"[^>]*>\s*<rect [^>]* width="([\d.]+)"[^>]*\/>\s*<text [^>]*font-size="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g);
  return [...found].map(([, id = '', width, size, inner = '']) => ({
    id,
    width: Number(width),
    size: Number(size),
    text: inner.replace(/<[^>]+>/g, ''),
  }));
}

/**
 * Every committed fixture map that reads under the current contract. A map a
 * finished reading was judged on stays as it was read, under an older shape
 * (D61, D85), and has no HUD to measure here.
 */
function committedMaps(): readonly MapJson[] {
  return readdirSync(REPO_FIXTURES)
    .map((name) => join(REPO_FIXTURES, name, 'map.json'))
    .filter((path) => existsSync(path))
    .flatMap((path) => {
      try {
        return [assertMap(JSON.parse(readFileSync(path, 'utf8')))];
      } catch {
        return [];
      }
    });
}

test('every HUD block fits its text at the widest fallback face, on the longest Standing tail the fixtures carry', () => {
  const maps = committedMaps();
  expect(maps.length).toBeGreaterThanOrEqual(5);
  const blocks = [demo(), ...maps].flatMap((map) => hudBlocks(renderSvg(map)));
  const [longest] = blocks.filter((block) => block.id === 'standing').toSorted((a, b) => b.text.length - a.text.length);

  // The retake's Standing tail names nine global slots: the block a narrow estimate ran out of its box.
  expect(longest?.text.length ?? 0).toBeGreaterThan(80);
  for (const block of blocks) {
    expect(block.text.length * block.size * WIDEST_FACE + 2 * HUD_BLOCK_PAD, `${block.id}: ${block.text}`).toBeLessThanOrEqual(block.width);
  }
  // The estimate the chrome sizes and wraps by is no narrower than that face.
  expect(MONO_ADVANCE).toBeGreaterThanOrEqual(WIDEST_FACE);
});

test('a block whose input is absent or stale is muted with a dash, and the category letters are always present', () => {
  const muted = (chrome: string, id: string): string | undefined =>
    /data-muted="true" data-reason="([\w-]+)"/.exec(blockOf(chrome, id) ?? '')?.[1];
  const live = chromeOf(renderSvg(demo()));
  for (const id of ['category', 'patch-cov', 'mutants', 'reach', 'size', 'gate', 'standing', 'health', 'notices', 'other']) {
    expect(muted(live, id), `${id} is live`).toBeUndefined();
  }
  // With no base side measured, the delta is a dash, never a 0 (D98, C2).
  const { health_delta: _measured, ...unmeasured } = demo().weather;
  const headOnly = chromeOf(renderSvg({ ...demo(), weather: unmeasured }));
  expect(muted(headOnly, 'health')).toBe('absent');
  expect(textOf(blockOf(headOnly, 'health') ?? '')).toContain(MUTED_DASH);

  // No `.check/` was trusted: the verdict is NOINST, every evidence block is a dash, and there is no standing state to count (C2, D41).
  const none = chromeOf(renderSvg(variant('NOINST')));
  expect(muted(none, 'gate')).toBe('absent');
  expect(muted(none, 'patch-cov')).toBe('absent');
  expect(muted(none, 'mutants')).toBe('absent');
  expect(textOf(blockOf(none, 'gate') ?? '')).toBe(`Gate ${MUTED_DASH}`);
  expect(blockOf(none, 'standing')).toBeUndefined();
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
  const nothing = [{ path: 'README.md', changed_executable: 0, covered: 0, uncovered_lines: [] }];
  const empty = chromeOf(
    renderSvg({ ...map, weather: { ...map.weather, evidence: { ...map.weather.evidence, patch_coverage: nothing, unmeasured: [] } } }),
  );
  expect(muted(empty, 'patch-cov')).toBe('empty');

  // With nothing measured and a file left unmeasured, the share is the dash and the count still speaks, unmuted (D80).
  const unnamed = chromeOf(renderSvg({ ...map, weather: { ...map.weather, evidence: { ...map.weather.evidence, patch_coverage: nothing } } }));
  expect(muted(unnamed, 'patch-cov')).toBeUndefined();
  expect(textOf(blockOf(unnamed, 'patch-cov') ?? '')).toBe(`Patch cov ${MUTED_DASH}, 1 unmeasured`);

  // A run in which every slot was skipped put nothing through the gate, so it cannot pass (C2).
  const vacuous = { ...map, weather: { ...map.weather, checks: { ...map.weather.checks, checks_run: 0, slots: map.weather.checks.slots.map((slot) => greened(slot, true)) } } };
  expect(muted(chromeOf(renderSvg(vacuous)), 'gate')).toBe('empty');
  expect(textOf(blockOf(chromeOf(renderSvg(vacuous)), 'gate') ?? '')).toBe(`Gate ${MUTED_DASH}`);

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

test('a row writes an added target with a leading +, a modified one without, and both keep the one change hue (D120)', () => {
  const map = demo();
  const kinds = new Map(map.weather.changed.map((file) => [file.path, file.kind] as const));
  const svg = renderSvg(map);
  const rows = [...drawn(chromeOf(svg), 'notices').matchAll(/<g data-notice="\d" [^>]*data-target="([^"]+)">\n\s*<g data-mark[\s\S]*?<\/g>\n\s*<text [^>]*font-weight="bold"[^>]*>([^<]*)<\/text>/g)].map(
    ([, target, first]) => ({ target: target ?? '', first: first ?? '' }),
  );
  // The demo's sixth notice is on the file the change added; the others are on files it modified.
  const added = rows.filter((row) => kinds.get(row.target) === 'added');
  const modified = rows.filter((row) => kinds.get(row.target) === 'modified');
  expect(added.map((row) => row.target)).toEqual(['libs/core/src/pm/tools.ts']);
  expect(modified.length).toBeGreaterThan(0);
  for (const row of added) expect(row.first).toBe(`+${row.target}`);
  for (const row of modified) expect(row.first).toBe(row.target);
  // The mark is text alone: the row keeps its target as the map keys it, and the stain on the field is the one hue.
  expect(svg).toContain('data-target="libs/core/src/pm/tools.ts"');
  expect(svg).not.toContain('data-target="+');
  const changed = drawn(svg, 'changed');
  expect(changed.trimStart().startsWith(`<g id="changed" fill="${CHANGE_HUE}"`)).toBe(true);
  // The one hue, that is, but where the change made a file healthier, which wears the calm-positive state instead (D98).
  const stains = [...changed.matchAll(/<circle data-id="[^"]+" data-kind="(added|modified)"([^>]*)\/>/g)].filter(([, , attrs = '']) => !attrs.includes('data-improved'));
  expect(stains.map(([, kind]) => kind)).toContain('added');
  for (const [, , attrs] of stains) expect(attrs).not.toContain('fill=');

  // The same file, modified instead, loses its mark.
  const edited = renderSvg({
    ...map,
    weather: { ...map.weather, changed: map.weather.changed.map((file) => (file.kind === 'added' ? { ...file, kind: 'modified' } : file)) },
  });
  expect(textOf(drawn(chromeOf(edited), 'notices'))).not.toContain('+libs/');
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

test('tier emphasis on the map: the primary a ring in the category hue and its kind, a secondary a thick ring in the leaders\' grey, a tertiary the mark alone', () => {
  const map = tiered();
  const marks = drawn(chromeOf(renderSvg(map)), 'marks');
  const rings = [...marks.matchAll(/<circle data-target="([^"]+)" data-tier="(\w+)" fill="none" stroke="([^"]+)" stroke-width="([\d.]+)"/g)].map(
    ([, target, tier, stroke, width]) => ({ target, tier, stroke, width: Number(width) }),
  );
  expect(rings).toEqual([
    { target: 'src/a.ts', tier: 'primary', stroke: IFR_HUE, width: PRIMARY_RING_WIDTH },
    { target: 'src/b.ts', tier: 'secondary', stroke: LEADER_INK, width: SECONDARY_RING_WIDTH },
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

test('a secondary ring never shares the evidence light and clears the lit gap by dark field, round a file or along a cell (D72, C11)', () => {
  // The chrome's ink is the evidence light's colour, which is the whole reason the ring cannot be drawn in it.
  expect(CHROME_INK).toBe(EVIDENCE_LIGHT);
  expect(LEADER_INK).not.toBe(EVIDENCE_LIGHT);

  // The dark band between the lit gap's outer edge and the ring's inner edge, from the tokens alone.
  const gapOuter = INTEGRITY_PAD + INTEGRITY_GAP_WIDTH / 2;
  const ringInner = EMPHASIS_PAD - SECONDARY_RING_WIDTH / 2;
  expect(ringInner - gapOuter).toBeGreaterThan(0);

  // Round a file: the drawn ring, measured off its own radius.
  const map = tiered();
  const layout = map.terrain.layout;
  expect(layout).toBeDefined();
  if (layout === undefined) return;
  const ring = /<circle data-target="src\/b\.ts" data-tier="secondary" fill="none" stroke="([^"]+)" stroke-width="([\d.]+)" cx="[\d.]+" cy="[\d.]+" r="([\d.]+)"/.exec(
    drawn(chromeOf(renderSvg(map)), 'marks'),
  );
  expect(ring, 'the secondary ring is drawn').not.toBeNull();
  expect(ring?.[1]).not.toBe(EVIDENCE_LIGHT);
  expect(Number(ring?.[3]) - Number(ring?.[2]) / 2).toBeGreaterThan((layout.positions['src/b.ts']?.r ?? 0) + gapOuter);

  // Along a cell: the contour re-traced in the same grey.
  const cellular: MapJson = {
    ...map,
    terrain: { ...map.terrain, layout: { ...layout, contours: { 'folder:src': [[80, 80], [480, 80], [480, 120], [80, 120], [80, 80]] } } },
    notices: map.notices.map((notice) => (notice.tier === 'secondary' ? { ...notice, target: 'folder:src' } : notice)),
  };
  const traced = /<path data-target="folder:src" data-tier="secondary" fill="none" stroke="([^"]+)"/.exec(drawn(chromeOf(renderSvg(cellular)), 'marks'));
  expect(traced?.[1]).toBe(LEADER_INK);
});

test('a target with several notices carries one ring, for its strongest tier, and one mark per notice side by side', () => {
  const map = demo();
  const marks = drawn(chromeOf(renderSvg(map)), 'marks');
  const runs = [...marks.matchAll(/<g data-target="([^"]+)">/g)].map(([, target]) => target);
  expect(runs).toEqual(['libs/core/src/pm/index.ts', 'apps/cli/src/doctor.ts', 'libs/core/src/pm/tools.ts']);
  expect([...marks.matchAll(/<circle data-target="([^"]+)" data-tier="(\w+)"/g)].map(([, target, tier]) => [target, tier])).toEqual([
    ['libs/core/src/pm/index.ts', 'primary'],
  ]);
  // The barrel's run holds its four marks, 1 to 4, side by side in rank order, before the other targets' runs.
  expect([...marks.matchAll(/data-mark="(\d)"/g)].map(([, rank]) => rank)).toEqual(['1', '2', '3', '4', '5', '6']);
  const [one, two, three, four] = [1, 2, 3, 4].map((rank) => boxCentre(marks, rank));
  expect(one?.[1]).toBe(two?.[1]);
  expect(two?.[1]).toBe(three?.[1]);
  expect(three?.[1]).toBe(four?.[1]);
  expect(one?.[0] ?? 0).toBeLessThan(two?.[0] ?? 0);
  expect(two?.[0] ?? 0).toBeLessThan(three?.[0] ?? 0);
  expect(three?.[0] ?? 0).toBeLessThan(four?.[0] ?? 0);
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
  // The canvas is the world plus the strip above it, the band below it and the column beside it; the world is
  // cropped to its terrain and set down under the strip, so its field starts where the strip's hard rule runs.
  const canvas = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  expect(Number(canvas?.[1])).toBe(layout.width + 300);
  const shift = /<g id="world" transform="translate\(0 ([\d.-]+)\)">/.exec(svg);
  const top = Number(/<rect id="field" x="0" y="([\d.]+)"/.exec(svg)?.[1]);
  const worldY = Number(shift?.[1]) + top;
  expect(worldY).toBeGreaterThan(0);
  const worldBottom = worldY + layout.height - top;
  const band = /<line x1="0" y1="([\d.]+)" x2="([\d.]+)" y2="\1"\/>/g;
  const ruled = [...drawn(chromeOf(svg), 'rules').matchAll(band)].map(([, y]) => Number(y));
  expect(ruled).toEqual([worldY, worldBottom]);
  expect(Number(canvas?.[2])).toBeGreaterThan(worldBottom);
  const chrome = chromeOf(svg);
  // The shore's band lies under the world and beside nothing but the column.
  for (const [, x, y, width] of drawn(chrome, 'shore').matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)"/g)) {
    expect(Number(y)).toBeGreaterThan(worldBottom);
    expect(Number(x) + Number(width)).toBeLessThanOrEqual(layout.width);
  }
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

test('every map carries the legend inset at the foot of the notice column, clear of the world and of every notice row (D87)', () => {
  for (const map of [demo(), variant('NOINST'), tiered(), { ...demo(), notices: [] }]) {
    const svg = renderSvg(map);
    const layout = map.terrain.layout;
    expect(layout).toBeDefined();
    if (layout === undefined) return;
    const [canvasWidth, canvasHeight] = (/viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg) ?? []).slice(1).map(Number);
    const chrome = chromeOf(svg);
    const legend = drawn(chrome, 'legend');
    const frame = /<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/.exec(legend);
    const [x = 0, y = 0, width = 0, height = 0] = (frame ?? []).slice(1).map(Number);

    // Clear of the world, inside the canvas, and below the last line of the last notice row.
    expect(x).toBeGreaterThanOrEqual(layout.width);
    expect(x + width).toBeLessThanOrEqual(canvasWidth ?? 0);
    expect(y + height).toBeLessThanOrEqual(canvasHeight ?? 0);
    const notices = chrome.includes('<g id="notices"/>') ? '' : drawn(chrome, 'notices');
    const baselines = [...notices.matchAll(/<text x="[\d.]+" y="([\d.]+)"/g)].map(([, at]) => Number(at));
    expect(y).toBeGreaterThan(Math.max(0, ...baselines));

    // One row per mark in the legend's order, each with its balloon numbered as its place, its words inside the frame.
    expect([...legend.matchAll(/<g data-mark="([^"]+)">/g)].map(([, id]) => id)).toEqual(LEGEND.map((mark) => mark.id));
    expect([...legend.matchAll(/<g data-balloon="(\d+)">/g)].map(([, number]) => Number(number))).toEqual(LEGEND.map((_, index) => index + 1));
    for (const mark of LEGEND) {
      const escaped = mark.words.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const words = new RegExp(`<text x="([\\d.]+)"[^>]*font-size="([\\d.]+)" fill="#[0-9a-f]{6}">${escaped}</text>`).exec(legend);
      expect(words, `${mark.id} has its words`).not.toBeNull();
      const [left = 0, size = 0] = (words ?? []).slice(1).map(Number);
      expect(left + mark.words.length * size * WIDEST_FACE, `${mark.id}'s words fit the inset`).toBeLessThanOrEqual(x + width);
    }

    // Under the marks, the key of the seven shapes: one form per rule count, round first, then its words, inside the frame (D146).
    const key = legend.slice(legend.indexOf('<g data-key="shapes">'));
    expect([...key.matchAll(/<g data-rules="(\d)">/g)].map(([, rules]) => Number(rules))).toEqual([0, 1, 2, 3, 4, 5, 6]);
    const keyWords = new RegExp(`<text x="([\\d.]+)" y="([\\d.]+)"[^>]*font-size="([\\d.]+)"[^>]*>${SHAPE_KEY_WORDS}</text>`).exec(key);
    expect(keyWords, 'the shape key has its words').not.toBeNull();
    const [keyLeft = 0, keyBaseline = 0, keySize = 0] = (keyWords ?? []).slice(1).map(Number);
    expect(keyLeft + SHAPE_KEY_WORDS.length * keySize * WIDEST_FACE, "the shape key's words fit the inset").toBeLessThanOrEqual(x + width);
    expect(keyBaseline).toBeLessThan(y + height);
  }
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

test('a notice on a test file rings the stitch it draws, and the scene says where (D148)', () => {
  const map: MapJson = { ...demo(), notices: [noticeOf('primary', 'red-check-slot', 'libs/core/src/__tests__/pm.test.ts')] };
  const [anchored] = noticeAnchors(map);
  if (anchored?.anchor?.kind !== 'stitch') throw new Error('the demo test file draws a stitch');
  const svg = renderSvg(map);
  const shift = Number(/<g id="world" transform="translate\(0 ([\d.-]+)\)">/.exec(svg)?.[1]);
  const ring = /<circle data-target="libs\/core\/src\/__tests__\/pm\.test\.ts" data-tier="primary"[^>]* cx="([\d.]+)" cy="([\d.]+)"/.exec(svg);
  expect(Number(ring?.[1])).toBeCloseTo(anchored.anchor.x, 1);
  expect(Number(ring?.[2])).toBeCloseTo(anchored.anchor.y + shift, 1);
  expect(boxCentre(drawn(chromeOf(svg), 'marks'), 1)).toBeDefined();
});

test("retake-1's primary, a test file that draws no stitch, is seen: its box hangs on the tests block in the band (D148)", () => {
  const map = assertMap(JSON.parse(readFileSync(join(REPO_FIXTURES, 'retake-1', 'map.json'), 'utf8')));
  const target = map.notices[0]?.target ?? '';
  expect(noticeAnchors(map)[0]?.anchor).toEqual({ kind: 'group', group: 'tests' });
  const svg = renderSvg(map);
  const marks = drawn(chromeOf(svg), 'marks');
  expect(marks).toContain(`<g data-target="${target}">`);
  expect(marks).toMatch(/<rect data-target="[^"]+" data-tier="primary"/);
  expect(svg).toMatch(/<line data-notice="1" /);
});
