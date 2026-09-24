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
    { id: 'deps', files: ['package.json', 'pnpm-lock.yaml'] },
    { id: 'assets', files: ['logo.png'] },
    { id: OTHER_GROUP, files: ['.gitkeep', 'data.parquet'] },
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
