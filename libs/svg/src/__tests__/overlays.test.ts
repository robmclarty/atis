import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap, buildRepoMap } from 'core';
import type { BuildInputs, CheckArtifacts, MapJson, OverlayName } from 'core';
import { GLYPH_STROKE, LIFR_HUE, OVERLAY_MUTED_STROKE, TEXTURE_MAX_OPACITY } from 'scene';
import { expect, test } from 'vitest';

import { renderSvg } from '../render.js';

/**
 * The whole repo's still map (D101): core's demo inputs mapped as a repo at
 * their head, the way `--whole-repo` maps one, with the demo's health given
 * each file's total complexity so its trouble spots draw. The map is built
 * here by core's own pure `buildRepoMap`, so the goldens are rendered from
 * what core writes. A deliberate change to the drawing is landed with
 * `ATIS_UPDATE_GOLDENS=1` and the diff read before committing it.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const SVG_FIXTURES = join(HERE, '..', '..', 'fixtures');
const DEMO = JSON.parse(readFileSync(join(HERE, '..', '..', '..', 'core', 'fixtures', 'demo', 'inputs.json'), 'utf8')) as BuildInputs;

/** The demo's `.check/`, its health totalling each scored file's complexity. */
function checked(): CheckArtifacts {
  const { check } = DEMO;
  if (check.mode !== 'check' || check.health === undefined) throw new Error("the demo's .check/ holds health.json");
  const totals: Readonly<Record<string, number>> = { 'apps/cli/src/doctor.ts': 41, 'libs/core/src/pm/index.ts': 9, 'libs/core/src/pm/tools.ts': 24, 'libs/core/src/util/format.ts': 7 };
  const file_scores = check.health.file_scores.map((score) => {
    const total = totals[score.path];
    return total === undefined ? score : { ...score, total_cyclomatic: total };
  });
  return { ...check, health: { ...check.health, file_scores } };
}

function repo(check: CheckArtifacts = checked()): MapJson {
  return assertMap(
    buildRepoMap({
      meta: { repo: 'demo', named: 'HEAD', head: DEMO.meta.head, generated_at: '' },
      scan: DEMO.head,
      commits: DEMO.commits,
      head_time: DEMO.head_time,
      check,
      baseline: { slots: { dead: ['dead-code:circular_dependencies:libs/core/src/util/format.ts->libs/core/src/util/text.ts'] } },
    }),
  );
}

/** The overlay layer alone. */
function overlayLayer(svg: string): string {
  const start = svg.indexOf('<g id="overlay"');
  expect(start, '#overlay is drawn').toBeGreaterThanOrEqual(0);
  return svg.slice(start, svg.indexOf('</g>', start));
}

test.each([
  ['trouble_spots', 'trouble-spots.svg'],
  ['coverage_gaps', 'coverage-gaps.svg'],
] as const)('the repo map drawn with %s renders its golden byte for byte, and the same bytes twice', (overlay: OverlayName, file: string) => {
  const map = repo();
  const svg = renderSvg(map, { overlay });
  const path = join(SVG_FIXTURES, 'repo', file);
  if (process.env['ATIS_UPDATE_GOLDENS'] === '1') writeFileSync(path, svg);
  expect(svg).toBe(readFileSync(path, 'utf8'));
  expect(renderSvg(map, { overlay })).toBe(svg);
});

test('a repo map draws trouble spots unless told otherwise, and its HUD names the overlay with what it counts (D101)', () => {
  const svg = renderSvg(repo());

  expect(svg).toBe(renderSvg(repo(), { overlay: 'trouble_spots' }));
  expect(svg).toContain('data-overlay="trouble_spots"');
  expect(svg).toMatch(/<g data-block="repo">.*Whole repo <\/tspan><tspan font-weight="bold">8<\/tspan><tspan> files</s);
  expect(svg).toMatch(/<g data-block="overlay">.*Trouble spots <\/tspan><tspan font-weight="bold">4<\/tspan><tspan> files</s);
  // A repo map changes nothing, so the change's own blocks are not drawn.
  for (const id of ['patch-cov', 'mutants', 'reach', 'size', 'health', 'notices']) expect(svg).not.toContain(`data-block="${id}"`);
});

test('history is hatching at an opacity by its level, the worst trouble spot at full', () => {
  const layer = overlayLayer(renderSvg(repo()));

  expect(layer).toContain('data-channel="texture"');
  expect(layer).toContain(`<circle data-id="apps/cli/src/doctor.ts" data-level="1"`);
  expect(layer).toContain(`fill-opacity="${String(TEXTURE_MAX_OPACITY)}"`);
});

test('what the checks found is a ring of the evidence light, lit by its level, a file the report never names lit whole (D80)', () => {
  const layer = overlayLayer(renderSvg(repo(), { overlay: 'coverage_gaps' }));

  expect(layer).toContain('data-channel="luminance"');
  // 5 of the barrel's 10 statements never ran; the doctor is code the report never names.
  expect(layer).toContain('<circle data-id="libs/core/src/pm/index.ts" data-level="0.5"');
  expect(layer).toMatch(/<circle data-id="apps\/cli\/src\/doctor.ts" data-level="1" [^>]*stroke="#e6edf3"\/>/);
});

test('duplication echoes each family file twice, a cycle rings its files in LIFR, and a baselined finding is muted graphite (C11, D49)', () => {
  const duplication = overlayLayer(renderSvg(repo(), { overlay: 'duplication' }));
  expect(duplication.match(/data-echo="\d"/g)).toHaveLength(4);
  expect(duplication).toContain(`stroke="${GLYPH_STROKE}"`);

  const cycles = overlayLayer(renderSvg(repo(), { overlay: 'cycles' }));
  expect(cycles).toContain('data-channel="state"');
  expect(cycles.match(new RegExp(`stroke="${LIFR_HUE}"`, 'g'))).toHaveLength(2);

  const baselined = overlayLayer(renderSvg(repo(), { overlay: 'baselined' }));
  expect(baselined).toContain('data-channel="muted"');
  expect(baselined.match(new RegExp(`stroke="${OVERLAY_MUTED_STROKE}"`, 'g'))).toHaveLength(2);
});

test("an overlay the map holds muted draws nothing, and its HUD block is muted with the map's reason (C2)", () => {
  const svg = renderSvg(repo(DEMO.check), { overlay: 'trouble_spots' });

  expect(svg).not.toContain('id="overlay"');
  expect(svg).toContain(`<g data-block="overlay" data-muted="true" data-reason="health.json totals no file&#39;s cyclomatic complexity">`);
});

test('a map of a change draws no overlay, whatever it is asked for', () => {
  const change = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));

  expect(renderSvg(change, { overlay: 'cycles' })).toBe(renderSvg(change));
});

test('the repo map is still: no animation, script or style (C10)', () => {
  const svg = renderSvg(repo(), { overlay: 'recent_heat' });
  for (const forbidden of ['<animate', '<set ', '<script', '<style', 'begin=']) expect(svg).not.toContain(forbidden);
});
