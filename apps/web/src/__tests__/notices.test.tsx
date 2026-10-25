// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson, Notice, NoticeTier } from 'core';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { IFR_HUE, SECONDARY_BOX_WIDTH, STITCH_LENGTH } from 'scene';
import { afterEach, beforeEach, expect, test } from 'vitest';

import { Chrome, Column, Notices, Rail } from '../chrome/index.js';
import { boxStyle, categoryHue, marksOnShore, rowsOf, runsOf, tallyOf, thresholdsOf } from '../notices.js';
import { createRegistry } from '../registry.js';
import { screenType } from '../screen.js';

/**
 * The notices as the world draws them (§5.4, step 34): each target's run of
 * boxes with its strongest tier and its light, the ranked list's rows and
 * tally, the boxes a shore block wears (D153), and the chrome's column
 * carrying the list over the rail, each box in its tier's style.
 */
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', '..', 'libs', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));

/** A hand-built notice: its why names its kind and its target, and its one threshold is its severity. */
const noticeOf = (tier: NoticeTier, kind: string, target: string): Notice => ({ tier, kind, target, why: `${kind} on ${target}`, inputs: {}, thresholds: { severity: 5 }, weight: 1 });

/** The demo with these notices in its list. */
const withNotices = (notices: readonly Notice[]): MapJson => ({ ...DEMO, notices: [...notices] });

/** A primary on a shore file, a secondary on a shore group, and a tertiary nothing draws. */
const ASHORE = withNotices([noticeOf('primary', 'red-check-slot', 'README.md'), noticeOf('secondary', 'new-dependency', 'deps'), noticeOf('tertiary', 'red-check-slot', 'lint')]);

let host: HTMLElement;
let root: Root;
beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const all = (selector: string): readonly Element[] => [...host.querySelectorAll(selector)];

const element = (selector: string): HTMLElement => {
  const found = host.querySelector(selector);
  if (!(found instanceof HTMLElement)) throw new Error(`${selector} is not an HTML element`);
  return found;
};

test('each target is one run of boxes in rank order, with the strongest tier its emphasis, the light it follows, and the primary its kind', () => {
  const runs = runsOf(DEMO);
  expect(runs.map((run) => [run.target, run.marked.map((each) => each.rank), run.strongest, run.light])).toEqual([
    ['libs/core/src/pm/index.ts', [1, 2, 3, 4], 'primary', 0],
    ['apps/cli/src/doctor.ts', [5], 'tertiary', 4],
    ['libs/core/src/pm/tools.ts', [6], 'tertiary', 5],
  ]);
  expect(runs[0]?.primaryKind).toBe('red-check-slot');
  expect(runs[1]?.primaryKind).toBeUndefined();
  expect(runs[0]?.spot).toEqual(DEMO.terrain.layout?.positions['libs/core/src/pm/index.ts']);

  // A secondary and a tertiary on one file: the secondary's emphasis, and the secondary's light.
  const shared = withNotices(DEMO.notices.map((notice, index) => (index === 1 ? { ...notice, target: 'libs/core/src/pm/tools.ts' } : notice)));
  const tools = runsOf(shared).find((run) => run.target === 'libs/core/src/pm/tools.ts');
  expect(tools?.marked.map((each) => each.rank)).toEqual([2, 6]);
  expect(tools?.strongest).toBe('secondary');
  expect(tools?.light).toBe(1);
});

test("a notice on a test file hangs at the stitch it draws, ringed at half a stitch's length, as the still sheet rings it (D148)", () => {
  const stitched = withNotices([noticeOf('primary', 'red-check-slot', 'libs/core/src/__tests__/pm.test.ts')]);
  const [run] = runsOf(stitched);
  expect(run?.target).toBe('libs/core/src/__tests__/pm.test.ts');
  expect(run?.spot.r).toBe(STITCH_LENGTH / 2);
  expect(DEMO.terrain.layout?.positions['libs/core/src/__tests__/pm.test.ts']).toBeUndefined();
});

test("a notice on a shore file or a group has no run and marks its group's block; one nothing draws is unplaced", () => {
  expect(runsOf(ASHORE)).toEqual([]);
  expect([...marksOnShore(ASHORE)]).toEqual([
    ['docs', [{ rank: 1, tier: 'primary' }]],
    ['deps', [{ rank: 2, tier: 'secondary' }]],
  ]);
  expect(rowsOf(ASHORE).map((row) => row.placed)).toEqual([true, true, false]);
  expect(marksOnShore(DEMO).size).toBe(0);
});

test('the rows are the notices in rank order with their words, the thresholds as the sheet writes them, an added target with a plus, and the tally (C7, D120)', () => {
  const rows = rowsOf(DEMO);
  expect(rows.map((row) => [row.rank, row.tier, row.kind, row.target, row.why])).toEqual(DEMO.notices.map((notice, index) => [index + 1, notice.tier, notice.kind, notice.target, notice.why]));
  expect(rows[0]?.thresholds).toBe('severity 10');
  expect(rows[3]?.thresholds).toBe('severity 3 · fan_in_high 2 · deep_band 4');
  expect(rows[5]?.words).toBe('+libs/core/src/pm/tools.ts');
  expect(rows[0]?.words).toBe('libs/core/src/pm/index.ts');
  expect(thresholdsOf({ ...noticeOf('tertiary', 'x', 'y'), thresholds: {} })).toBe('');
  expect(tallyOf(DEMO)).toBe('1·2·3');
  expect(tallyOf(withNotices([]))).toBe('0·0·0');
  expect(rowsOf(withNotices([]))).toEqual([]);
});

test("a box is solid in the category hue for the primary, framed thick in ink for a secondary and thin in the muted grey for a tertiary; NOINST's hue is the muted grey", () => {
  const registry = createRegistry();
  const look = registry.view({ SCREEN_TYPE_UP: 0, CHROME_GROUND: '', CHROME_INK: '', CHROME_MUTED: '', CHROME_STROKE_WIDTH: 0, SECONDARY_BOX_WIDTH: 0, CATEGORY_LETTERS: '', FONT_FAMILY: '', VFR_HUE: '', MVFR_HUE: '', IFR_HUE: '', LIFR_HUE: '', NOTICE_TEXT_SIZE: 0, NOTICE_SMALL_SIZE: 0, NOTICE_BOX: 0, NOTICE_NUMERAL_SIZE: 0 });
  const hue = categoryHue('IFR', look);
  expect(hue).toBe(IFR_HUE);
  expect(categoryHue('NOINST', look)).toBe(look.CHROME_MUTED);
  const primary = boxStyle('primary', look, hue, 12, 9);
  expect(primary.background).toBe(IFR_HUE);
  expect(primary.border).toBe('none');
  expect(primary.color).toBe(look.CATEGORY_LETTERS);
  const secondary = boxStyle('secondary', look, hue, 12, 9);
  expect(secondary.background).toBe(look.CHROME_GROUND);
  expect(secondary.border).toBe(`${String(SECONDARY_BOX_WIDTH)}px solid ${look.CHROME_INK}`);
  expect(secondary.color).toBe(look.CHROME_INK);
  expect(boxStyle('tertiary', look, hue, 12, 9).border).toBe(`1px solid ${look.CHROME_MUTED}`);
  expect(screenType(look)).toEqual({ text: 11, small: 10, box: 12, numeral: 9 });
});

test('the list draws every row with its box, kind, target, why and thresholds, names an unplaced one, and writes the tally', async () => {
  await act(async () => root.render(<Notices map={ASHORE} registry={createRegistry()} />));
  const rows = all('[data-notice]');
  expect(rows.map((row) => [row.getAttribute('data-notice'), row.getAttribute('data-tier'), row.getAttribute('data-kind'), row.getAttribute('data-target')])).toEqual([
    ['1', 'primary', 'red-check-slot', 'README.md'],
    ['2', 'secondary', 'new-dependency', 'deps'],
    ['3', 'tertiary', 'red-check-slot', 'lint'],
  ]);
  for (const [index, notice] of ASHORE.notices.entries()) {
    const row = rows[index];
    expect(row?.querySelector('[data-mark]')?.textContent).toBe(String(index + 1));
    expect(row?.textContent).toContain(notice.kind);
    expect(row?.textContent).toContain(notice.target);
    expect(row?.textContent).toContain(notice.why);
    expect(row?.textContent).toContain('severity 5');
  }
  expect(all('[data-notice][data-unplaced]').map((row) => row.getAttribute('data-notice'))).toEqual(['3']);
  expect(element('[data-notice="3"] [data-unplaced-tag]').textContent).toBe('unplaced');
  expect(element('[data-tally]').textContent).toBe('1·1·1');
  expect(element('[data-notice="1"] [data-mark]').style.background).toBe('rgb(240, 84, 106)');
  expect(element('[data-notice="2"] [data-mark]').style.borderWidth).toBe('2px');
  expect(element('[data-notice="3"] [data-mark]').style.borderWidth).toBe('1px');
  expect(host.querySelector('[data-notices]')?.textContent).not.toMatch(/shadow|blur|gradient/);
});

test('the list holds no rows and a tally of nought when the map has no notices (C7: never padded)', async () => {
  await act(async () => root.render(<Notices map={withNotices([])} registry={createRegistry()} />));
  expect(all('[data-notice]')).toHaveLength(0);
  expect(element('[data-tally]').textContent).toBe('0·0·0');
});

test("a notice on a shore file wears its box on its group's block in the rail, after the block's storms (D153)", async () => {
  await act(async () => root.render(<Rail map={ASHORE} registry={createRegistry()} />));
  expect(all('[data-group="docs"] button [data-mark]').map((box) => [box.getAttribute('data-mark'), box.getAttribute('data-tier'), box.textContent])).toEqual([['1', 'primary', '1']]);
  expect(all('[data-group="deps"] button [data-mark]').map((box) => box.getAttribute('data-mark'))).toEqual(['2']);
  expect(all('[data-group="build"] [data-mark]')).toHaveLength(0);
  expect(element('[data-group="docs"] button [data-mark]').style.background).toBe('rgb(240, 84, 106)');
});

test('the chrome carries the column once the map is read, the list at its head and the rail beneath', async () => {
  const registry = createRegistry();
  await act(async () => root.render(<Chrome state={{ status: 'loading', url: '/map.json' }} registry={registry} dev={false} />));
  expect(host.querySelector('[data-column]')).toBeNull();
  await act(async () => root.render(<Chrome state={{ status: 'ready', url: '/map.json', map: DEMO }} registry={registry} dev={false} />));
  const column = element('[data-column]');
  expect([...column.children].map((child) => child.getAttribute('aria-label'))).toEqual(['notices', 'shore']);
  expect(all('[data-column] [data-notice]')).toHaveLength(6);
  await act(async () => root.render(<Column map={ASHORE} registry={registry} />));
  expect(all('[data-column] [data-notice]')).toHaveLength(3);
});
