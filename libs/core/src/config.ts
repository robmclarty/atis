/**
 * config: the defaults atis measures with (D28). Every rule and number a map
 * leans on lives here, so a reviewed repo's `atis.config.json` can override it
 * and every notice can echo the values that produced it (D9).
 */

import type { GroupRule } from './groups.js';

/** The numbers §5.3 names only in words, with D27's starting values. */
export type CategoryConfig = {
  /**
   * How many cells a changed file's reach must touch, its own included, to
   * count as *high reach*: an uncovered change at or above this is IFR rather
   * than MVFR, because the reviewer cannot see where it lands.
   */
  readonly high_reach_cells: number;
};

/**
 * The eleven candidate kinds of §5.4 plus the `other`-group notice of D48.
 * §5.4's last row is two instruments in one line, and they are two kinds here:
 * a notice says which one it is or it says nothing. An interface that moved is
 * split by what moved (D81): a name removed or reshaped, names only added, or
 * names the scan could not compare.
 */
export type NoticeKind =
  | 'red-check-slot'
  | 'cycle-or-boundary'
  | 'deleted-export'
  | 'interface-change'
  | 'interface-added'
  | 'interface-uncompared'
  | 'uncovered-high-reach'
  | 'survived-mutants'
  | 'threshold-breached'
  | 'security-finding'
  | 'large-hot-change'
  | 'new-dependency'
  | 'missing-cochange'
  | 'bedrock-change'
  | 'other-group';

/** The coefficients and gates §5.4 names only in words, with the step's starting values. */
export type NoticeConfig = {
  /** What a kind is worth before the change's own numbers scale it (D9). */
  readonly severity: Readonly<Record<NoticeKind, number>>;
  /** A cell's fan-in is high at or above this, when `health.json` carries no `fan_in_p95` of its own. */
  readonly fan_in_high: number;
  /** A cell is deep at or below this terrace; the bands count down from the entry points (D13). */
  readonly deep_band: number;
  /** A change is large at or above this many lines added and deleted. */
  readonly large_lines: number;
  /** A file is hot at or above either of these: it churns, or its commits keep saying "fix" (D8). */
  readonly hot_churn_ratio: number;
  readonly hot_bugfix_rate: number;
  /** Bedrock is old and quiet: at or above this age, at or below this churn. */
  readonly bedrock_age_days: number;
  readonly bedrock_churn_ratio: number;
  /** A ghost: a file that comes along at least this often, over at least this many commits (CHID eq. 3). */
  readonly cochange_rate: number;
  readonly cochange_support: number;
};

export type Config = {
  /** The shore's first-match table (D48); a file no row matches lands in `other`. */
  readonly groups: readonly GroupRule[];
  /** The flight-category thresholds of §5.3 (D27). */
  readonly category: CategoryConfig;
  /** The notice ladder and its gates (§5.4). */
  readonly notices: NoticeConfig;
};

/** The file D28 names at the reviewed repo's root; for now atis reads only its `trunk` (D99). */
export const CONFIG_FILE = 'atis.config.json';

/** The branches tried for the trunk when the repo configures none, in order, each local and then on `origin/` (D99). */
export const TRUNK_CANDIDATES: readonly string[] = ['main', 'master', 'develop', 'trunk'];

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The trunk an `atis.config.json` names (D28, D99), or undefined when there
 * is no file or it names none. A file that will not parse, or a `trunk` that
 * is not a branch name, throws: a broken config is misuse, never a quiet
 * fall back to the candidates (C4).
 */
export function configuredTrunk(text: string | undefined): string | undefined {
  if (text === undefined) return undefined;
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new Error(`${CONFIG_FILE} is not JSON: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
  if (!isRecord(value)) throw new Error(`${CONFIG_FILE} is not a JSON object`);
  const trunk = value['trunk'];
  if (trunk === undefined) return undefined;
  if (typeof trunk !== 'string' || trunk === '' || trunk.startsWith('-')) throw new Error(`${CONFIG_FILE}'s trunk must name a branch`);
  return trunk;
}

const IMAGES = ['*.png', '*.jpg', '*.jpeg', '*.gif', '*.webp', '*.avif', '*.ico'];
const FONTS = ['*.woff', '*.woff2', '*.ttf', '*.otf'];
const LOCKFILES = ['pnpm-lock.yaml', 'package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'bun.lock', 'bun.lockb'];

/**
 * The ladder of §5.4, worst first. The table's own order is the spine: the
 * gate saying no outranks a structural break, which outranks an interface
 * moving, which outranks a change the tests never saw. Kinds share a rung
 * because they sit at the same altitude rather than because a number ran out:
 * a deleted export *is* an interface change, the destructive kind, and a
 * counted vulnerability weighs what a big change to a troubled file weighs.
 * An interface that only grew is new surface to read with nothing broken, so
 * it weighs what a new dependency does; one whose only movement the scan
 * could not compare proves nothing and sits on the floor (D81). The floor is
 * 2, where a notice is worth drawing and nothing more.
 */
const SEVERITY: Readonly<Record<NoticeKind, number>> = {
  'red-check-slot': 10,
  'cycle-or-boundary': 9,
  'deleted-export': 8,
  'interface-change': 8,
  'uncovered-high-reach': 7,
  'survived-mutants': 6,
  'threshold-breached': 5,
  'security-finding': 4,
  'large-hot-change': 4,
  'interface-added': 3,
  'new-dependency': 3,
  'interface-uncompared': 2,
  'missing-cochange': 2,
  'bedrock-change': 2,
  'other-group': 2,
};

export const DEFAULT_CONFIG: Config = {
  category: { high_reach_cells: 3 },
  notices: {
    severity: SEVERITY,
    fan_in_high: 7,
    deep_band: 4,
    large_lines: 100,
    hot_churn_ratio: 2,
    hot_bugfix_rate: 0.3,
    bedrock_age_days: 365,
    bedrock_churn_ratio: 0.5,
    cochange_rate: 0.5,
    cochange_support: 3,
  },
  // D48's groups in its order, except that `build` is tried first and `prompts` before `docs`:
  // first match wins, so a committed `dist/` keeps its `.md`, `.css` and `.mjs` together (D84),
  // and `*.md` would otherwise swallow AGENTS.md and CLAUDE.md.
  // Hook folders inside `.claude/` or a skill are code, so they fall through to `scripts`.
  // The agent-era dotfolders sort by what they steer: `.claude-plugin/` packages prompts
  // and skills, while `.mcp.json`, `.ridgeline/` and `.codegraph/` configure a tool the
  // way `fallow.toml` does. A schema and a benchmark corpus are data wherever they sit.
  // The rows below `.codegraph/**` and their like in the later groups come from the retake's
  // census of five outside repos; code the scan cannot read (`.svelte`, `.vue`, loose
  // JavaScript) is left to `other` on purpose, so the residual stays loud about it.
  groups: [
    // Build output directly beneath a package or the repo root: a second copy of the code, never terrain (D84).
    { id: 'build', patterns: ['/dist/**', '/build/**', '/out/**'], at_member_root: true },
    {
      id: 'prompts',
      patterns: ['AGENTS.md', 'CLAUDE.md', '.claude/**', '.claude-plugin/**', '.cursor/**', 'skills/**', 'prompts/**'],
      except: ['hooks/**'],
    },
    { id: 'docs', patterns: ['*.md', '*.mdx', 'docs/**', 'research/**', '.plumbbob/**', 'LICENSE', 'ATTRIBUTION*'] },
    {
      id: 'config',
      patterns: [
        'tsconfig*',
        '*.config.*',
        'fallow.toml',
        'sgconfig.yml',
        'rules/**',
        'cspell.json',
        '.markdownlint*',
        '.oxlintrc*',
        '.vale/**',
        '.mcp.json',
        '.ridgeline/**',
        '.codegraph/**',
        '.eslintrc*',
        '.prettierrc*',
        '.prettierignore',
        '.semgrepignore',
        '.ts-prunerc',
        'knip.json',
        'api-extractor.json',
        'tsdoc.json',
        '.attw.json',
        '.size-limit*',
        'turbo.json',
        'nx.json',
        '.nx/**',
        'lerna.json',
        'bunfig.toml',
        'angular.json',
        'ng-package.json',
        'wrangler.json*',
        'vercel.json',
        '.changeset/**',
        'vitest.workspace.*',
        '/config/**',
      ],
      // A root `config/` holds a tool's settings beside the build code that reads them, and
      // this row is also what makes a `.ts` file tool config rather than terrain (D57). So the
      // row is anchored, leaving a `src/config/` module or a package named `config` alone, and
      // its TypeScript stays terrain, as it does under `scripts/**`. A `rules/` folder holds a
      // linter's rules, but an eslint plugin's source is a `rules/` folder too, so its
      // TypeScript stays terrain at any depth while its YAML and JSON stay here (D164).
      except: [
        '/config/**/*.ts',
        '/config/**/*.tsx',
        '/config/**/*.mts',
        '/config/**/*.cts',
        'rules/**/*.ts',
        'rules/**/*.tsx',
        'rules/**/*.mts',
        'rules/**/*.cts',
      ],
    },
    {
      id: 'settings',
      patterns: [
        '.npmrc',
        '.editorconfig',
        '.gitignore',
        '.gitattributes',
        '.vscode/**',
        '.env.example',
        '.nvmrc',
        '.node-version',
        '.tool-versions',
        '.env',
        '.git-blame-ignore-revs',
        '.gitkeep',
      ],
    },
    {
      id: 'deps',
      patterns: [
        'package.json',
        'pnpm-workspace.yaml',
        ...LOCKFILES,
        'patches/**',
        'renovate.json',
        '.npmignore',
        'jsr.json',
        'deno.json',
        'deno.*.json',
        'deno.lock',
        'package.cjs.json',
      ],
    },
    {
      id: 'ci',
      patterns: [
        '.github/**',
        'Dockerfile',
        'compose*.yaml',
        'compose*.yml',
        'docker-compose*.yaml',
        'docker-compose*.yml',
        'serverless.yml',
        '.circleci/**',
        '.codesandbox/**',
        'codecov.yml',
        '.kodiak.toml',
        '.octocov*',
        '.dockerignore',
      ],
    },
    { id: 'scripts', patterns: ['scripts/**', 'bin/**', 'hooks/**', '.husky/**', '*.sh', '*.mjs'] },
    { id: 'examples', patterns: ['examples/**', 'templates/**'], outside_members: true },
    { id: 'assets', patterns: ['site/**', 'www/**', ...IMAGES, ...FONTS, '*.css', '*.html', '*.svg', 'robots.txt'] },
    // Only non-test files reach the table, so `test/**` holds just the fixtures and data beside the tests.
    // A JSON Schema is the `schema/**` row's kind of file, so it lands in `data` even when
    // it sits beside the source it describes (fascicle's `packages/core/src/flow-schema.json`).
    {
      id: 'data',
      patterns: [
        'fixtures/**',
        '**/__fixtures__/**',
        'schema/**',
        '*.schema.json',
        '*-schema.json',
        'bench/**',
        'benchmarks/**',
        '*.csv',
        'test/**',
        '__snapshots__/**',
        '*.snap',
        '*.har',
        '*.sql',
        '*.prisma',
        'migrations/**',
        'migration_lock.toml',
      ],
    },
  ],
};
