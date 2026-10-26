/**
 * bases: what the base selector offers in served mode (§8, D99), and what
 * each asks the serving CLI for over `POST /base` (C13): the trunk, the last
 * tag, the head's parent and the working tree's uncommitted change. Each is a
 * body the CLI checks before it rebuilds: the trunk names nothing, the tag is
 * found by name, the parent is a ref `git rev-parse --verify` resolves, and
 * the working tree is the head side read from the tree over `HEAD` (D134).
 * Pure, so a test reads it straight.
 */

import type { MapJson } from 'core';

/** One base the selector offers: its id, what its button says, and the body its `POST /base` sends. */
export type BaseChoice = { readonly id: 'trunk' | 'last-tag' | 'last-commit' | 'working-tree'; readonly label: string; readonly body: Readonly<Record<string, unknown>> };

export const BASE_CHOICES: readonly BaseChoice[] = [
  { id: 'trunk', label: 'trunk', body: {} },
  { id: 'last-tag', label: 'last tag', body: { last: 'tag' } },
  { id: 'last-commit', label: 'HEAD~1', body: { base: 'HEAD~1' } },
  { id: 'working-tree', label: 'working tree', body: { base: 'HEAD', working_tree: true } },
];

/** What `meta.head` reads for a map of the working tree (D99). */
const WORKING_TREE = 'working-tree';

/**
 * The choice the map was built over, read from its meta: the working tree as
 * its head, the last tag or the head's parent as the base typed, or the
 * trunk when no base was typed; none for a range, a whole repo, or a base
 * typed by name, which the selector does not offer.
 */
export const currentBase = (map: MapJson): BaseChoice['id'] | undefined => {
  const { meta } = map;
  if (meta.mode !== 'change' || map.sequence !== undefined) return undefined;
  if (meta.head === WORKING_TREE) return 'working-tree';
  if (meta.base_typed === undefined) return 'trunk';
  if (meta.base_typed === '--last-tag') return 'last-tag';
  if (meta.base_typed === '--last-commit' || meta.base_typed === '--base HEAD~1') return 'last-commit';
  return undefined;
};

/** The one request the selector makes, injected so a test needs no server: the status the CLI answered and its words. */
export type PostBase = (url: string, body: string) => Promise<{ readonly ok: boolean; readonly status: number; readonly text: () => Promise<string> }>;

/** Where a choice is posted: `/base` with the run's token (D134). */
export const baseUrl = (token: string): string => `/base?token=${encodeURIComponent(token)}`;
