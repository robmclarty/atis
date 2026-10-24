/**
 * shore: the shore as both renderers draw it now, flat blocks in the chrome
 * rather than land on the terrain (D153). Every tracked file outside the
 * terrain still sits in one group of D48's table; this derivation orders
 * those groups and says what each block holds, so the world's scrolled rail
 * and the SVG's band at the foot of the sheet (D158) show one shore.
 *
 * The groups the change touched come first and open on their files: each
 * changed file named with its kind, and any file that usually changes with
 * these and did not, as a ghost. The rest follow, each its name and count.
 * Within each, groups go by name, and `other` last, loud as D48 keeps it, a
 * dumping ground no one can miss. A red slot over a shore file hangs over its
 * group's block, split by the change as on the terrain (D68). The `tests`
 * group is a block like any other: its files are never terrain (D4), but a
 * changed test file is part of the change, and a notice on one that draws no
 * stitch anchors to this block (D148).
 */

import { OTHER_GROUP } from 'core';
import type { MapJson } from 'core';

import { stormPlaces } from './weather.js';
import type { ChangeState } from './weather.js';

/** A file a shore block names: a changed one with its kind, or a ghost. */
export type ShoreFile = { readonly path: string; readonly change?: ChangeState; readonly ghost?: true };

/** A red slot over a shore group: the change's, or standing state. */
export type ShoreStorm = { readonly slot: string; readonly change: boolean };

/** One group's block. */
export type ShoreBlock = {
  readonly group: string;
  /** How many tracked files the group holds. */
  readonly count: number;
  /** The change touched one of its files, so the block opens and leads. */
  readonly touched: boolean;
  /** `other`, which is never quiet (D48). */
  readonly loud: boolean;
  /** The files it names, by path: the changed ones, and the ghosts. */
  readonly files: readonly ShoreFile[];
  readonly storms: readonly ShoreStorm[];
};

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** By name, `other` after every named group. */
function byGroup(a: ShoreBlock, b: ShoreBlock): number {
  return Number(a.loud) - Number(b.loud) || byPath(a.group, b.group);
}

/** The shore's blocks, in the order both renderers lay them: the touched groups first, then the rest, `other` last in each. */
export function shoreRail(map: MapJson): readonly ShoreBlock[] {
  const changes = new Map(map.weather.changed.map((file) => [file.path, file] as const));
  const ghosts = new Set(map.weather.ghosts.map((ghost) => ghost.path));
  const storms = stormPlaces(map);
  const blocks = map.terrain.groups
    .filter((group) => group.files.length > 0)
    .map((group): ShoreBlock => {
      const files = group.files
        .filter((path) => changes.has(path) || ghosts.has(path))
        .toSorted(byPath)
        .map((path): ShoreFile => {
          const change = changes.get(path);
          return {
            path,
            ...(change === undefined ? {} : { change: { kind: change.kind, ...(change.from === undefined ? {} : { from: change.from }) } }),
            ...(change === undefined && ghosts.has(path) ? { ghost: true as const } : {}),
          };
        });
      return {
        group: group.id,
        count: group.files.length,
        touched: files.some((file) => file.change !== undefined),
        loud: group.id === OTHER_GROUP,
        files,
        storms: storms.filter((storm) => storm.place === group.id).map(({ slot, change }) => ({ slot, change })),
      };
    });
  return [...blocks.filter((block) => block.touched).toSorted(byGroup), ...blocks.filter((block) => !block.touched).toSorted(byGroup)];
}
