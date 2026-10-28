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

/** The numbers §8's whole-repo overlays name only in words (D101). */
export type OverlayConfig = {
  /** How many of the newest commits count as recent, for the recent heat overlay. */
  readonly heat_commits: number;
};

export type Config = {
  /**
   * The language producers `atis.config.json` switches off, by id, sorted
   * (D114): their files stay where the shore table puts them. Core reads no
   * producer; the switch rides here so a terrain kept per base is kept per
   * switch too (D96).
   */
  readonly producers_off: readonly string[];
  /** The shore's first-match table (D48); a file no row matches lands in `other`. */
  readonly groups: readonly GroupRule[];
  /** The flight-category thresholds of §5.3 (D27). */
  readonly category: CategoryConfig;
  /** The notice ladder and its gates (§5.4). */
  readonly notices: NoticeConfig;
  /** The whole-repo overlays (§8, D101). */
  readonly overlays: OverlayConfig;
};

/** The file D28 names at the reviewed repo's root; for now atis reads only its `trunk` (D99), its `editor` (D102) and its `producers` (D114). */
export const CONFIG_FILE = 'atis.config.json';

/** The branches tried for the trunk when the repo configures none, in order, each local and then on `origin/` (D99). */
export const TRUNK_CANDIDATES: readonly string[] = ['main', 'master', 'develop', 'trunk'];

/**
 * How a changed file opens in the reader's editor at a line (D102): a URL
 * template whose `{root}` is the repository's absolute path, `{path}` the
 * file's path inside it and `{line}` the line, VS Code's unless an
 * `atis.config.json` names its own `editor`, such as
 * `zed://file{root}/{path}:{line}` or a forge's `.../blob/main/{path}#L{line}`.
 */
export const DEFAULT_EDITOR = 'vscode://file{root}/{path}:{line}';

/** The schemes a link the page writes may never carry: each runs, embeds or reads what it holds rather than opening it in an editor (D173). */
const UNSAFE_SCHEMES: ReadonlySet<string> = new Set(['javascript', 'data', 'vbscript', 'blob', 'file']);

/** A URL's scheme: a letter, then letters, digits, `+`, `-` and `.`, up to its first colon. */
const SCHEME = /^([a-z][a-z0-9+.-]*):/i;

/** Any control character, C0, DEL or C1: none belongs in a URL template a person typed. */
const CONTROL = /\p{Cc}/u;

/**
 * A link's scheme as a browser reads it, by the WHATWG URL parser (D173):
 * the C0 controls and spaces at either end trimmed, every tab and newline
 * inside dropped, and the scheme lowercased; none when the link names none,
 * which the page resolves against its own address.
 */
function schemeOf(link: string): string | undefined {
  let start = 0;
  let end = link.length;
  while (start < end && link.charCodeAt(start) <= 0x20) start += 1;
  while (end > start && link.charCodeAt(end - 1) <= 0x20) end -= 1;
  return SCHEME.exec(link.slice(start, end).replaceAll(/[\t\n\r]/g, ''))?.[1]?.toLowerCase();
}

/** The scheme of a link that, read as a browser reads it, would run, embed or read what it holds rather than open an editor; none for any other link (D173). */
const unsafeScheme = (link: string): string | undefined => {
  const scheme = schemeOf(link);
  return scheme !== undefined && UNSAFE_SCHEMES.has(scheme) ? scheme : undefined;
};

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** An `atis.config.json`'s text as its object; a file that will not parse, or is not an object, throws (C4). */
function configObject(text: string): Readonly<Record<string, unknown>> {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new Error(`${CONFIG_FILE} is not JSON: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
  if (!isRecord(value)) throw new Error(`${CONFIG_FILE} is not a JSON object`);
  return value;
}

/**
 * The trunk an `atis.config.json` names (D28, D99), or undefined when there
 * is no file or it names none. A file that will not parse, or a `trunk` that
 * is not a branch name, throws: a broken config is misuse, never a quiet
 * fall back to the candidates (C4).
 */
export function configuredTrunk(text: string | undefined): string | undefined {
  if (text === undefined) return undefined;
  const trunk = configObject(text)['trunk'];
  if (trunk === undefined) return undefined;
  if (typeof trunk !== 'string' || trunk === '' || trunk.startsWith('-')) throw new Error(`${CONFIG_FILE}'s trunk must name a branch`);
  return trunk;
}

/**
 * The editor template an `atis.config.json` names (D102), or undefined when
 * there is no file or it names none, so `DEFAULT_EDITOR` stands. One that
 * names no `{path}` opens no file; one holding a control character is no
 * template a person typed, and a browser drops its tabs and newlines; and
 * one in a scheme that runs what it holds would hand a reviewed repo's
 * config a script in the page that holds the run's token (D134, D173). So
 * each throws as misuse, as a broken file does (C4).
 */
export function configuredEditor(text: string | undefined): string | undefined {
  if (text === undefined) return undefined;
  const editor = configObject(text)['editor'];
  if (editor === undefined) return undefined;
  if (typeof editor !== 'string' || !editor.includes('{path}')) throw new Error(`${CONFIG_FILE}'s editor must be a URL template naming {path}`);
  if (CONTROL.test(editor)) throw new Error(`${CONFIG_FILE}'s editor must hold no control character`);
  const unsafe = unsafeScheme(editor);
  if (unsafe !== undefined) throw new Error(`${CONFIG_FILE}'s editor must open an editor, never a ${unsafe}: link, which runs or reads what it holds`);
  return editor;
}

/**
 * The language producers an `atis.config.json` switches off (D114), by id and
 * sorted: each key of its `producers` object set to `false`, as in
 * `{ "producers": { "typescript": false } }`; none when there is no file or it
 * names none. A `producers` that is not an object, or a value that is not a
 * boolean, throws as misuse, as a broken file does (C4). Which ids name a
 * producer is the CLI's to check, since core knows no language.
 */
export function configuredProducersOff(text: string | undefined): readonly string[] {
  if (text === undefined) return [];
  const producers = configObject(text)['producers'];
  if (producers === undefined) return [];
  if (!isRecord(producers)) throw new Error(`${CONFIG_FILE}'s producers must be an object of producer ids to true or false`);
  const off = Object.entries(producers).flatMap(([id, on]) => {
    if (typeof on !== 'boolean') throw new Error(`${CONFIG_FILE}'s producers.${id} must be true or false`);
    return on ? [] : [id];
  });
  return off.toSorted((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/** A path's segments each escaped for a URL, its slashes kept. */
const escapedPath = (path: string): string => path.split('/').map(encodeURIComponent).join('/');

/**
 * The link that opens `path` at `line` in the reader's editor: `template`
 * with its `{root}`, `{path}` and `{line}` filled, each segment of a path
 * escaped so a file's name cannot reshape the URL; none when the filled link,
 * read as a browser reads it, would run a script or read a page rather than
 * open an editor (D102, D173).
 */
export function editorLink(template: string, at: { readonly root: string; readonly path: string; readonly line: number }): string | undefined {
  const link = template
    .replaceAll('{root}', escapedPath(at.root.replace(/\/+$/, '')))
    .replaceAll('{path}', escapedPath(at.path))
    .replaceAll('{line}', String(Math.max(1, Math.trunc(at.line))));
  return unsafeScheme(link) === undefined ? link : undefined;
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
  producers_off: [],
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
  overlays: { heat_commits: 50 },
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
