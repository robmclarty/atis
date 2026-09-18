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
 * a notice says which one it is or it says nothing.
 */
export type NoticeKind =
  | 'red-check-slot'
  | 'cycle-or-boundary'
  | 'deleted-export'
  | 'interface-change'
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

const IMAGES = ['*.png', '*.jpg', '*.jpeg', '*.gif', '*.webp', '*.avif', '*.ico'];
const FONTS = ['*.woff', '*.woff2', '*.ttf', '*.otf'];
const LOCKFILES = ['pnpm-lock.yaml', 'package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'bun.lock', 'bun.lockb'];

/**
 * The ladder of §5.4, worst first. The table's own order is the spine: the
 * gate saying no outranks a structural break, which outranks an interface
 * moving, which outranks a change the tests never saw. Two pairs share a rung
 * because they sit at the same altitude rather than because a number ran out:
 * a deleted export *is* an interface change, the destructive kind, and a
 * counted vulnerability weighs what a big change to a troubled file weighs.
 * The floor is 2, where a notice is worth drawing and nothing more.
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
  'new-dependency': 3,
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
  // D48's groups in its order, except that `prompts` is tried before `docs`:
  // first match wins, and `*.md` would otherwise swallow AGENTS.md and CLAUDE.md.
  // Hook folders inside `.claude/` or a skill are code, so they fall through to `scripts`.
  groups: [
    {
      id: 'prompts',
      patterns: ['AGENTS.md', 'CLAUDE.md', '.claude/**', '.cursor/**', 'skills/**', 'prompts/**'],
      except: ['hooks/**'],
    },
    { id: 'docs', patterns: ['*.md', 'docs/**', 'research/**', '.plumbbob/**', 'LICENSE'] },
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
      ],
    },
    {
      id: 'settings',
      patterns: ['.npmrc', '.editorconfig', '.gitignore', '.gitattributes', '.vscode/**', '.env.example'],
    },
    { id: 'deps', patterns: ['package.json', 'pnpm-workspace.yaml', ...LOCKFILES] },
    { id: 'ci', patterns: ['.github/**', 'Dockerfile', 'compose*.yaml', 'compose*.yml'] },
    { id: 'scripts', patterns: ['scripts/**', 'bin/**', 'hooks/**', '*.sh', '*.mjs'] },
    { id: 'examples', patterns: ['examples/**', 'templates/**'], outside_members: true },
    { id: 'assets', patterns: ['site/**', ...IMAGES, ...FONTS, '*.css', '*.html', '*.svg'] },
    // Only non-test files reach the table, so `test/**` holds just the fixtures and data beside the tests.
    { id: 'data', patterns: ['fixtures/**', '**/__fixtures__/**', 'schema/**', '*.csv', 'test/**'] },
  ],
};
