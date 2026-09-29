import { expect, test } from 'vitest';

import { DEFAULT_CONFIG } from '../config.js';
import { identifyGroups, OTHER_GROUP } from '../groups.js';
import type { GroupRule } from '../groups.js';

function tracked(...paths: readonly string[]): readonly { path: string }[] {
  return paths.map((path) => ({ path }));
}

function groupOf(path: string, roots: readonly string[] = []): string | undefined {
  return identifyGroups(tracked(path), DEFAULT_CONFIG.groups, roots)[0]?.id;
}

const ONE_PATH_PER_GROUP: readonly [string, string][] = [
  ['prompts', '.claude/settings.json'],
  ['docs', 'docs/prior-art.md'],
  ['config', 'fallow.toml'],
  ['settings', '.editorconfig'],
  ['deps', 'pnpm-lock.yaml'],
  ['ci', '.github/workflows/ci.yml'],
  ['scripts', 'scripts/release.sh'],
  ['examples', 'examples/basic/run.js'],
  ['assets', 'site/fonts/inter.woff2'],
  ['data', 'test/fixtures/existing-biome/biome.json'],
  [OTHER_GROUP, 'notes.xyz'],
];

test.each(ONE_PATH_PER_GROUP)('the default table puts a %s path there', (id, path) => {
  expect(groupOf(path)).toBe(id);
});

test('the default table is D48, every group covered above, other left to the fallback', () => {
  const ids = DEFAULT_CONFIG.groups.map((rule) => rule.id);
  expect(ids).toEqual(['prompts', 'docs', 'config', 'settings', 'deps', 'ci', 'scripts', 'examples', 'assets', 'data']);
  expect(ONE_PATH_PER_GROUP.map(([id]) => id)).toEqual([...ids, OTHER_GROUP]);
});

test('agent instructions are prompts, not docs, though *.md would match them', () => {
  expect(groupOf('AGENTS.md')).toBe('prompts');
  expect(groupOf('CLAUDE.md')).toBe('prompts');
  expect(groupOf('skills/build/SKILL.md')).toBe('prompts');
  expect(groupOf('CHANGELOG.md')).toBe('docs');
});

test('hook folders under .claude/, a skill or a plugin are scripts, whatever their extension', () => {
  expect(groupOf('examples/agent-loop/.claude/hooks/checkride-gate.sh')).toBe('scripts');
  expect(groupOf('examples/agent-loop/.claude/hooks/checkride-protect.cjs')).toBe('scripts');
  expect(groupOf('skills/lodestar/hooks/session-capture.mjs')).toBe('scripts');
  expect(groupOf('plugins/ast-grep-rules/hooks/hooks.json')).toBe('scripts');
  expect(groupOf('.claude/hooks/README.md')).toBe('docs');
  expect(groupOf('.claude/settings.json')).toBe('prompts');
});

test('the agent-era plugin, MCP and tool folders sort by what they steer', () => {
  expect(groupOf('.claude-plugin/plugin.json')).toBe('prompts');
  expect(groupOf('.claude-plugin/marketplace.json')).toBe('prompts');
  expect(groupOf('.claude-plugin/hooks/gate.sh')).toBe('scripts');
  expect(groupOf('.mcp.json')).toBe('config');
  expect(groupOf('.ridgeline/settings.json')).toBe('config');
  expect(groupOf('.codegraph/config.json')).toBe('config');
  // A folder row outranks a bare filename below it, as `.claude/**` and `.vale/**` already do,
  // so a tool's own `.gitignore` goes with the tool rather than to `settings`.
  expect(groupOf('.codegraph/.gitignore')).toBe('config');
  expect(groupOf('.gitignore')).toBe('settings');
});

test('a schema or a benchmark corpus is data wherever it sits', () => {
  expect(groupOf('bench/reviewer/baseline.json')).toBe('data');
  expect(groupOf('bench/reviewer/cases.json')).toBe('data');
  expect(groupOf('packages/core/src/flow-schema.json')).toBe('data');
  expect(groupOf('libs/core/src/map.schema.json')).toBe('data');
});

// One path per pattern the retake's census of five outside repos added, each from that census
// except `.node-version` and a snapshot folder's non-`.snap` file, which it named by kind only.
// A third column names the workspace member a census file sat in, where `examples/**` would claim it.
const CENSUS: readonly [string, string, (readonly string[])?][] = [
  ['docs', 'www/blog/2025-03-21-announcing-trpc-11.mdx'],
  ['config', 'examples/lit/array/.eslintrc.cjs'],
  ['config', '.prettierrc'],
  ['config', '.prettierignore'],
  ['config', '.semgrepignore'],
  ['config', '.ts-prunerc'],
  ['config', 'knip.json'],
  ['config', 'api-extractor.json'],
  ['config', 'tsdoc.json'],
  ['config', '.attw.json'],
  ['config', '.size-limit.cjs'],
  ['config', '.size-limits.json'],
  ['config', 'packages/client/turbo.json'],
  ['config', 'nx.json'],
  ['config', '.nx/workflows/dynamic-changesets.yaml'],
  ['config', 'lerna.json'],
  ['config', 'bunfig.toml'],
  ['config', 'examples/angular/simple/angular.json'],
  ['config', 'packages/angular-form/ng-package.json'],
  ['config', 'examples/cloudflare-workers/wrangler.jsonc'],
  ['config', 'www/vercel.json'],
  ['config', '.changeset/config.json'],
  ['config', 'config/size-limit/index.js'],
  ['settings', '.nvmrc'],
  ['settings', '.node-version'],
  ['settings', '.tool-versions'],
  ['settings', 'examples/.experimental/next-app-dir/.env'],
  ['settings', '.git-blame-ignore-revs'],
  ['settings', 'perf-measures/bundle-check/generated/.gitkeep'],
  ['deps', 'patches/jest-config+29.7.0.patch'],
  ['deps', 'renovate.json'],
  ['deps', '.npmignore'],
  ['deps', 'jsr.json'],
  ['deps', 'runtime-tests/deno/deno.json'],
  ['deps', 'runtime-tests/deno/deno.lock'],
  ['ci', '.circleci/config.yml'],
  ['ci', '.codesandbox/ci.json'],
  ['ci', 'codecov.yml'],
  ['ci', '.kodiak.toml'],
  ['ci', 'perf-measures/.octocov.consolidated.perf-measures.yml'],
  ['ci', '.dockerignore'],
  ['scripts', '.husky/pre-commit'],
  ['assets', 'www/versions.json'],
  ['data', 'src/cache/inmemory/__tests__/__snapshots__/policies.ts.snap'],
  ['data', 'tools/ast-grep/tests/__snapshots__/no-default-export-snapshot.yml'],
  ['data', 'integration-tests/api.har'],
  ['data', 'examples/next-sse-chat/src/server/db/migrations/0000_lyrical_khan.sql', ['examples/next-sse-chat']],
  ['data', 'examples/next-prisma-starter/prisma/schema.prisma', ['examples/next-prisma-starter']],
  ['data', 'benchmarks/utils/src/loop.js'],
];

test.each(CENSUS)('the census puts a %s file there: %s', (id, path, roots = []) => {
  expect(groupOf(path, roots)).toBe(id);
});

test('a root config folder is tool config, but its TypeScript and a nested config folder are not', () => {
  expect(groupOf('config/jest/react-dom-17-client.js')).toBe('config');
  expect(groupOf('config/build.ts')).toBeUndefined();
  expect(groupOf('config/schema.package.json.ts')).toBeUndefined();
  expect(groupOf('src/config/jest/setup.ts')).toBeUndefined();
  expect(groupOf('packages/config/package.json')).toBe('deps');
});

test('a .gitkeep is a git file wherever it sits, even under a folder row below settings', () => {
  expect(groupOf('.gitkeep')).toBe('settings');
  expect(groupOf('test/fixtures/.gitkeep')).toBe('settings');
  expect(groupOf('scripts/autoload/.gitkeep')).toBe('settings');
});

test('code the scan cannot read stays loud in other', () => {
  expect(groupOf('packages/svelte-form/src/Field.svelte')).toBe(OTHER_GROUP);
  expect(groupOf('src/App.vue')).toBe(OTHER_GROUP);
  expect(groupOf('integration-tests/node/test-cjs.cjs')).toBe(OTHER_GROUP);
});

test('other still fires for an extension no row claims, JSON included', () => {
  expect(groupOf('telemetry.json')).toBe(OTHER_GROUP);
  expect(groupOf('vendor/blob.bin')).toBe(OTHER_GROUP);
  expect(groupOf('notes.xyz')).toBe(OTHER_GROUP);
});

test('patterns without a leading slash match at any depth', () => {
  expect(groupOf('apps/atis/fixtures/check/coverage/coverage-final.json')).toBe('data');
  expect(groupOf('libs/core/src/__fixtures__/tree.json')).toBe('data');
  expect(groupOf('packages/core/README.md')).toBe('docs');
  expect(groupOf('apps/atis/tsconfig.json')).toBe('config');
  expect(groupOf('apps/web/Dockerfile')).toBe('ci');
});

test('examples and templates inside a workspace member fall through to the later rules', () => {
  const roots = ['', 'examples/pr-improve'];
  expect(groupOf('examples/pr-improve/fixtures/pr-sample.patch', roots)).toBe('data');
  expect(groupOf('examples/pr-improve/notes.bin', roots)).toBe(OTHER_GROUP);
  expect(groupOf('examples/loose/run.js', roots)).toBe('examples');
  expect(groupOf('templates/starter/main.js', roots)).toBe('examples');
});

test('every shore file lands in exactly one group; terrain, tests and repeats are skipped', () => {
  const groups = identifyGroups(
    tracked(
      'src/index.ts',
      'src/__tests__/index.test.ts',
      'logo.png',
      'README.md',
      'pnpm-lock.yaml',
      'data.parquet',
      'AGENTS.md',
      'docs/design.md',
      'package.json',
      'README.md',
      '.gitkeep',
    ),
    DEFAULT_CONFIG.groups,
  );

  expect(groups).toEqual([
    { id: 'prompts', files: ['AGENTS.md'] },
    { id: 'docs', files: ['README.md', 'docs/design.md'] },
    { id: 'settings', files: ['.gitkeep'] },
    { id: 'deps', files: ['package.json', 'pnpm-lock.yaml'] },
    { id: 'assets', files: ['logo.png'] },
    { id: OTHER_GROUP, files: ['data.parquet'] },
  ]);
});

test('a custom table matches first-wins, anchors on a leading slash and keeps other last', () => {
  const rules: readonly GroupRule[] = [
    { id: OTHER_GROUP, patterns: ['*.tmp'] },
    { id: 'root-notes', patterns: ['/notes/**'] },
    { id: 'notes', patterns: ['notes/**', 'v?.txt'] },
    { id: 'deep', patterns: ['a/**/z.txt', '(x)+.txt'] },
  ];
  const groups = identifyGroups(
    tracked(
      'notes/a.txt',
      'pkg/notes/b.txt',
      'v1.txt',
      'v10.txt',
      'a/z.txt',
      'a/b/c/z.txt',
      '(x)+.txt',
      'xx.txt',
      'x.tmp',
      'y.bin',
    ),
    rules,
  );

  expect(groups).toEqual([
    { id: 'root-notes', files: ['notes/a.txt'] },
    { id: 'notes', files: ['pkg/notes/b.txt', 'v1.txt'] },
    { id: 'deep', files: ['(x)+.txt', 'a/b/c/z.txt', 'a/z.txt'] },
    { id: OTHER_GROUP, files: ['v10.txt', 'x.tmp', 'xx.txt', 'y.bin'] },
  ]);
});
