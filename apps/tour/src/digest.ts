/**
 * digest: what the tour's model reads of a map, and nothing else (D182): the
 * change's base and head, its notices with their whys, inputs and
 * thresholds, the changed files with their hunks' line numbers, how far the
 * change reaches and by which names, the cells it touches with their export
 * names, and the functions of the files it touches, by name and line. Every
 * one is a path, a name or a number the map already shows; the map holds no
 * code and no diff, so neither can reach the model. A notice is named by its
 * rank, its place in the map's list, as the world's boxes and `atis mcp`
 * name it. Pure: the same map gives the same prompt, byte for byte (C3).
 */

import type { MapJson } from 'core';

/** A file of the change, by its path, with the lines it moved and the hunks they lie in. */
type ChangedDigest = {
  readonly path: string;
  readonly kind: string;
  readonly from?: string;
  readonly cell?: string;
  readonly added: number;
  readonly deleted: number;
  readonly hunks: readonly (readonly [number, number])[];
};

export type Digest = {
  readonly change: { readonly repo: string; readonly base: string; readonly head: string; readonly mode: string; readonly category: string };
  readonly notices: readonly {
    readonly rank: number;
    readonly tier: string;
    readonly kind: string;
    readonly target: string;
    readonly why: string;
    readonly inputs: Readonly<Record<string, number>>;
    readonly thresholds: Readonly<Record<string, number>>;
  }[];
  readonly changed: readonly ChangedDigest[];
  readonly reach: readonly { readonly path: string; readonly cell: string; readonly hops: number; readonly via: readonly string[]; readonly names?: readonly string[] }[];
  readonly cells: readonly { readonly id: string; readonly path: string; readonly kind: string; readonly exports?: readonly string[] }[];
  readonly functions: readonly { readonly path: string; readonly functions: readonly (readonly [string, number, number])[] }[];
};

const byString = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** The map as the model reads it: only the parts the notices, the change and its reach touch. */
export const digestOf = (map: MapJson): Digest => {
  const { weather, terrain } = map;
  const touched = new Set([...map.notices.map((notice) => notice.target), ...weather.changed.map((file) => file.path), ...weather.reach.map((entry) => entry.path)]);
  const cellsTouched = new Set([
    ...map.notices.map((notice) => notice.target),
    ...weather.changed.flatMap((file) => (file.cell === undefined ? [] : [file.cell])),
    ...weather.reach.map((entry) => entry.cell),
  ]);
  return {
    change: { repo: map.meta.repo, base: map.meta.base, head: map.meta.head, mode: map.meta.mode, category: weather.checks.category },
    notices: map.notices.map((notice, index) => ({ rank: index + 1, tier: notice.tier, kind: notice.kind, target: notice.target, why: notice.why, inputs: notice.inputs, thresholds: notice.thresholds })),
    changed: weather.changed.map((file) => ({
      path: file.path,
      kind: file.kind,
      ...(file.from === undefined ? {} : { from: file.from }),
      ...(file.cell === undefined ? {} : { cell: file.cell }),
      added: file.added,
      deleted: file.deleted,
      hunks: file.hunks.map((hunk) => [hunk.start, hunk.count] as const),
    })),
    reach: weather.reach.map((entry) => ({ path: entry.path, cell: entry.cell, hops: entry.hops, via: entry.via, ...(entry.names === undefined ? {} : { names: entry.names }) })),
    cells: terrain.cells
      .filter((cell) => cellsTouched.has(cell.id))
      .map((cell) => ({ id: cell.id, path: cell.path, kind: cell.kind, ...(cell.exports === undefined ? {} : { exports: cell.exports }) })),
    functions: terrain.organelles
      .filter((organelle) => touched.has(organelle.id) && (organelle.functions?.length ?? 0) > 0)
      .map((organelle) => ({ path: organelle.id, functions: (organelle.functions ?? []).map((fn) => [fn.name, fn.line, fn.line_count] as const) }))
      .toSorted((a, b) => byString(a.path, b.path)),
  };
};

/** The digest as the prompt the model is handed: a line on how to read it, then the digest as JSON. */
export const promptOf = (digest: Digest): string =>
  [
    'The atis map of one code change, as JSON. A hunk is [first line, line count]; a function is [name, first line, line count]; a notice is named by its rank.',
    '',
    JSON.stringify(digest, undefined, 2),
    '',
  ].join('\n');
