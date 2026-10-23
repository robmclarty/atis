/**
 * groups: the shore (D48). Every tracked file that is neither terrain nor a
 * test lands in exactly one group, by the first rule with a matching pattern;
 * whatever no rule claims lands in `other`, last, so the table grows instead
 * of the dump.
 */

import { classifyFile, memberOf } from './modules.js';
import type { Group } from './schema.js';

/** The group every unmatched file lands in; always listed last. */
export const OTHER_GROUP = 'other';

/** The shore row whose `.ts`/`.tsx` members are tool config, not terrain (D48, D57). */
export const CONFIG_GROUP_ID = 'config';

/** The shore row of committed build output, whose `.d.ts` and every other file are never terrain (D84). */
export const BUILD_GROUP_ID = 'build';

/** The rows whose TypeScript is shore: a tool's config (D57) and a build's output (D84). */
const NOT_TERRAIN: ReadonlySet<string> = new Set([CONFIG_GROUP_ID, BUILD_GROUP_ID]);

/**
 * One row of the shore table. A pattern matches at any depth unless it opens
 * with `/`, which anchors it at the repo root: `*.md` tests the file name and
 * `docs/**` any `docs` folder. `*` and `?` stay inside one path segment, `**`
 * crosses them. `except` carves paths out of a row so a later row can take
 * them; `outside_members` skips files inside a workspace member, as D48 asks
 * of `examples` and `templates`; `at_member_root` anchors the patterns at the
 * innermost workspace member holding the file, or the repo root when none
 * does, so `/dist/**` means a `dist/` directly beneath a package (D84).
 */
export type GroupRule = {
  readonly id: string;
  readonly patterns: readonly string[];
  readonly except?: readonly string[];
  readonly outside_members?: boolean;
  readonly at_member_root?: boolean;
};

/** A row with its patterns compiled. */
type CompiledRule = { readonly rule: GroupRule; readonly patterns: readonly RegExp[]; readonly except: readonly RegExp[] };

const GLOB_TOKEN = /\*\*\/|\*\*|\*|\?|[^*?]+/g;

const GLOB_SOURCE: ReadonlyMap<string, string> = new Map([
  ['**/', '(?:.*/)?'],
  ['**', '.*'],
  ['*', '[^/]*'],
  ['?', '[^/]'],
]);

function globToRegExp(pattern: string): RegExp {
  const anchored = pattern.startsWith('/');
  const tokens = (anchored ? pattern.slice(1) : pattern).match(GLOB_TOKEN) ?? [];
  const source = tokens
    .map((token) => GLOB_SOURCE.get(token) ?? token.replace(/[.+^${}()|[\]\\]/g, '\\$&'))
    .join('');
  return new RegExp(`${anchored ? '^' : '(?:^|/)'}${source}$`);
}

function compile(rule: GroupRule): CompiledRule {
  return { rule, patterns: rule.patterns.map(globToRegExp), except: (rule.except ?? []).map(globToRegExp) };
}

/** Whether a row's patterns take a path: the path itself, or for a row anchored at a member's root, the part beneath that member. */
function matches({ rule, patterns, except }: CompiledRule, path: string, roots: readonly string[]): boolean {
  const member = rule.at_member_root === true ? (memberOf(path, roots) ?? '') : '';
  const tested = member === '' ? path : path.slice(member.length + 1);
  return patterns.some((pattern) => pattern.test(tested)) && !except.some((pattern) => pattern.test(tested));
}

/**
 * Whether a path matches a shore row whose TypeScript is not terrain (D48):
 * the `config` row, whose `.ts`/`.tsx` is tool configuration (D57), and the
 * `build` row, whose `.d.ts` is a second copy of the code with no depth of its
 * own (D84). `classifyFile` sends such a file to the shore. Built from the same
 * `rules` the shore is sorted by, so overriding either row in an
 * `atis.config.json` moves that boundary too; an absent row matches nothing.
 * `roots` are the workspace members a `build` row is anchored at.
 */
export function shoreMatcher(rules: readonly GroupRule[], roots: readonly string[] = []): (path: string) => boolean {
  const rows = rules.filter((rule) => NOT_TERRAIN.has(rule.id)).map(compile);
  return (path) => rows.some((row) => matches(row, path, roots));
}

/**
 * Sort the shore into groups, in table order with `other` last and empty
 * groups left out. `files` may hold every tracked file: terrain and tests are
 * skipped here. `roots` are the workspace members' directories; the repo root
 * never counts as claiming a file.
 */
export function identifyGroups(
  files: readonly { readonly path: string }[],
  rules: readonly GroupRule[],
  roots: readonly string[] = [],
): readonly Group[] {
  const table = rules.map(compile);
  const isShore = shoreMatcher(rules, roots);
  const shore = [...new Set(files.map((file) => file.path))].filter((path) => classifyFile(path, isShore) === 'other');
  const placed = shore.map((path) => {
    const claimed = (memberOf(path, roots) ?? '') !== '';
    const row = table.find((compiled) => !(claimed && compiled.rule.outside_members === true) && matches(compiled, path, roots));
    return { path, id: row?.rule.id ?? OTHER_GROUP };
  });
  const order = new Set([...rules.map((rule) => rule.id).filter((id) => id !== OTHER_GROUP), OTHER_GROUP]);
  return [...order]
    .map((id) => ({
      id,
      files: placed
        .filter((entry) => entry.id === id)
        .map((entry) => entry.path)
        .toSorted(),
    }))
    .filter((group) => group.files.length > 0);
}
