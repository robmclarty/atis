import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap, buildRepoMap } from 'core';
import type { BuildInputs, MapJson } from 'core';

/**
 * Core's demo inputs mapped as a whole repo at their head, the way
 * `--whole-repo` maps one (D101): the demo's health totals each scored file's
 * complexity, so its trouble spots draw, and its baseline grandfathers the
 * demo's one cycle, so the baselined overlay draws. Built by core's own pure
 * `buildRepoMap`, as the still map's tests build theirs, so the world reads
 * what core writes. Reading with `node:fs` is a test's to do (C1).
 */
const HERE = dirname(fileURLToPath(import.meta.url));

/** Core's demo inputs, by the keys a repo map reads; core's own golden test holds the rest of their shape. */
const isInputs = (value: unknown): value is BuildInputs => typeof value === 'object' && value !== null && 'head' in value && 'commits' in value && 'check' in value && 'meta' in value;

const read: unknown = JSON.parse(readFileSync(join(HERE, '..', '..', '..', '..', 'libs', 'core', 'fixtures', 'demo', 'inputs.json'), 'utf8'));
if (!isInputs(read)) throw new Error("core's demo inputs lost their shape");
const DEMO = read;

const TOTALS: Readonly<Record<string, number>> = { 'apps/cli/src/doctor.ts': 41, 'libs/core/src/pm/index.ts': 9, 'libs/core/src/pm/tools.ts': 24, 'libs/core/src/util/format.ts': 7 };

export const repoMap = (): MapJson => {
  const { check } = DEMO;
  if (check.mode !== 'check' || check.health === undefined) throw new Error("the demo's .check/ holds health.json");
  const file_scores = check.health.file_scores.map((score) => {
    const total = TOTALS[score.path];
    return total === undefined ? score : { ...score, total_cyclomatic: total };
  });
  return assertMap(
    buildRepoMap({
      meta: { repo: 'demo', named: 'HEAD', head: DEMO.meta.head, generated_at: '' },
      scan: DEMO.head,
      commits: DEMO.commits,
      head_time: DEMO.head_time,
      check: { ...check, health: { ...check.health, file_scores } },
      baseline: { slots: { dead: ['dead-code:circular_dependencies:libs/core/src/util/format.ts->libs/core/src/util/text.ts'] } },
    }),
  );
};
