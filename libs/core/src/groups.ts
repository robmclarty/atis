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
  const shore = [...new Set(files.map((file) => file.path))].filter((path) => classifyFile(path) === 'other');
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
