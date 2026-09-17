/**
 * config: the defaults atis measures with (D28). Every rule and number a map
 * leans on lives here, so a reviewed repo's `atis.config.json` can override it
 * and every notice can echo the values that produced it (D9).
 */

import type { GroupRule } from './groups.js';

export type Config = {
  /** The shore's first-match table (D48); a file no row matches lands in `other`. */
  readonly groups: readonly GroupRule[];
};

const IMAGES = ['*.png', '*.jpg', '*.jpeg', '*.gif', '*.webp', '*.avif', '*.ico'];
const FONTS = ['*.woff', '*.woff2', '*.ttf', '*.otf'];
const LOCKFILES = ['pnpm-lock.yaml', 'package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'bun.lock', 'bun.lockb'];

export const DEFAULT_CONFIG: Config = {
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
