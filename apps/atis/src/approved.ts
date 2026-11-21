/**
 * approved: the approved shape as the command keeps it and as every map build
 * reads it (D212 (approved-private)).
 *
 * `atis approve` reduces a map to core's document and keeps it at
 * `<git-common-dir>/atis/approved.json`, written atomically over the one
 * before: one shape for the repository, which every worktree of it holds to,
 * and nothing in a working tree. Core's document holds no clock, so the
 * moment of approval is stamped here, as `approved_on`
 * (D320 (approved-time)). A shape approved from the working tree names no
 * commit, and there the moment is all that says which state of it was
 * accepted.
 *
 * Every map build then reads the document, where there is one, and core
 * writes the map's departures from it on the map. With none, the map comes
 * back as it was, not a byte moved. A document that will not read tells no
 * departure and says why (D321 (approved-unreadable)), and so does a block
 * the map's own guard would refuse, which the page would otherwise drop the
 * whole map for (D322 (approved-guarded)). Lines, fan out and an interface
 * with no barrel are held only against a map cut over the base the shape was
 * approved over (D308 (same-terrain)), and a map over another says in words
 * that they were left out, since the block on the map has no place to
 * (D324 (unshared-said)).
 */

import { existsSync, readFileSync } from 'node:fs';

import { approvedOf, assertApproved, assertMap, sharesTerrain, withApproved } from 'core';
import type { Approved, MapJson } from 'core';

import { approvedPath, writeAtomic } from './cache.js';

/** The key the moment of approval is kept under, beside core's own keys (D320 (approved-time)). */
const APPROVED_ON = 'approved_on';

const SHA = /^[0-9a-f]{40}$/;

/** A commit as a line names it: its first seven characters; anything that is no sha, whole. */
const short = (sha: string): string => (SHA.test(sha) ? sha.slice(0, 7) : sha);

function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** The shape `atis approve` kept: where, and core's document of it. */
export type Kept = { readonly path: string; readonly doc: Approved };

/**
 * Approve a map's shape (D212 (approved-private)): core's reduction of it,
 * with the moment of approval after the commits it names
 * (D320 (approved-time)), as two-space JSON with a trailing newline, the
 * map's own serialisation. Written through a neighbouring temp file and a
 * rename, so a build reading it meanwhile reads the shape before or this
 * one, never half of either.
 */
export function keepApproved(repo: string, map: MapJson, now: Date): Kept {
  const doc = approvedOf(map);
  const { schema_version, kind, approved_at, over, ...rest } = doc;
  const kept = { schema_version, kind, approved_at, ...(over === undefined ? {} : { over }), [APPROVED_ON]: now.toISOString(), ...rest };
  const path = approvedPath(repo);
  writeAtomic(path, `${JSON.stringify(kept, null, 2)}\n`);
  return { path, doc };
}

/** The approved shape as it is kept: its file's own text, and the document in it, or why it is none. */
export type Shape = { readonly path: string; readonly text: string } & ({ readonly doc: Approved } | { readonly reason: string });

/** Read the approved shape of `repo`; nothing where none was approved. Throws where git finds no repository. */
export function readApproved(repo: string): Shape | undefined {
  const path = approvedPath(repo);
  if (!existsSync(path)) return undefined;
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch (error) {
    return { path, text: '', reason: reasonOf(error) };
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { path, text, reason: 'it is not JSON' };
  }
  try {
    return { path, text, doc: assertApproved(value) };
  } catch (error) {
    return { path, text, reason: reasonOf(error) };
  }
}

/** A map held against the approved shape: the map, with its departures where a shape was read; what must be said in words beside it; and whether there was a document to read. */
export type Held = { readonly map: MapJson; readonly notes: readonly string[]; readonly read: boolean };

/** Why the three readings a terrain gives were left out of a map's departures (D308 (same-terrain), D324 (unshared-said)). */
function unshared(doc: Approved, map: MapJson): string {
  const cut = doc.over === undefined ? 'names no commit its terrain was cut from' : `was cut over ${short(doc.over)}`;
  return `the approved shape ${cut} and this map over ${short(map.meta.merge_base)}, so lines, fan out and interfaces with no barrel were not compared; run atis approve with this map's flags to compare them`;
}

/**
 * Hold a map against the approved shape of `repo`, as every map build does:
 * with no document the map is handed back untouched, and with one core
 * writes the block on it. Nothing here throws for the document's sake, since
 * a map never depended on one (C4): a document that will not read, and a
 * block the map's guard refuses, each leave the map without the block and
 * say so, so a channel that could not be measured is muted and not shown as
 * no departures (C2). `attach` is core's `withApproved` unless a test names
 * its own.
 */
export function holdToApproved(repo: string, map: MapJson, attach: (map: MapJson, doc: Approved) => MapJson = withApproved): Held {
  const shape = readApproved(repo);
  if (shape === undefined) return { map, notes: [], read: false };
  if ('reason' in shape) {
    return { map, notes: [`the approved shape at ${shape.path} could not be read (${shape.reason}), so this map tells no departures; run atis approve to write it again`], read: true };
  }
  const held = attach(map, shape.doc);
  try {
    assertMap(held);
  } catch (error) {
    // Only the block's own failure is the block's; a map the guard refuses elsewhere is as it was before the shape was read.
    const reason = reasonOf(error);
    if (reason.startsWith('invalid map at approved')) return { map, notes: [`the departures from the approved shape were left off this map, since its guard refuses them: ${reason}`], read: true };
  }
  return { map: held, notes: sharesTerrain(shape.doc, map) ? [] : [unshared(shape.doc, map)], read: true };
}
