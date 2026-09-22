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

/**
 * One row of the shore table. A pattern matches at any depth unless it opens
 * with `/`, which anchors it at the repo root: `*.md` tests the file name and
 * `docs/**` any `docs` folder. `*` and `?` stay inside one path segment, `**`
 * crosses them. `except` carves paths out of a row so a later row can take
 * them; `outside_members` skips files inside a workspace member, as D48 asks
 * of `examples` and `templates`.
 */
export type GroupRule = {
  readonly id: string;
  readonly patterns: readonly string[];
  readonly except?: readonly string[];
  readonly outside_members?: boolean;
};

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

/**
 * Whether a path matches the shore's `config` row (D48): `classifyFile` reads a
 * `.ts`/`.tsx` that does as tool configuration and sends it to the shore rather
 * than the terrain (D57). Built from the same `rules` the shore is sorted by,
 * so overriding the `config` row in an `atis.config.json` moves that boundary
 * too; an absent row (a custom table with no `config`) matches nothing.
 */
export function configMatcher(rules: readonly GroupRule[]): (path: string) => boolean {
  const row = rules.find((rule) => rule.id === CONFIG_GROUP_ID);
  const patterns = (row?.patterns ?? []).map(globToRegExp);
  const except = (row?.except ?? []).map(globToRegExp);
  return (path) => patterns.some((pattern) => pattern.test(path)) && !except.some((pattern) => pattern.test(path));
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
  const table = rules.map((rule) => ({
    rule,
    patterns: rule.patterns.map(globToRegExp),
    except: (rule.except ?? []).map(globToRegExp),
  }));
  const isConfig = configMatcher(rules);
  const shore = [...new Set(files.map((file) => file.path))].filter((path) => classifyFile(path, isConfig) === 'other');
  const placed = shore.map((path) => {
    const claimed = (memberOf(path, roots) ?? '') !== '';
    const row = table.find(
      ({ rule, patterns, except }) =>
        !(claimed && rule.outside_members === true) &&
        patterns.some((pattern) => pattern.test(path)) &&
        !except.some((pattern) => pattern.test(path)),
    );
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
