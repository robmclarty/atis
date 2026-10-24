/**
 * instances: every file the layout placed, as one record the world draws in
 * a single instanced mesh. Each carries where it sits and how big (size means
 * mass, C11), the terrace it sits on, the rules it breaks (shape means
 * conformance) and its clone family (repetition means duplication), all read
 * from the map and nothing else. Records come in path order (C3), so instance
 * `i` is the same file on every load.
 */

import type { MapJson } from 'core';

export type Instance = {
  readonly id: string;
  readonly cell: string;
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly band: number;
  readonly dents: readonly string[];
  readonly clone_family?: string;
};

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** One record per placed organelle, in path order; a file the layout gave no position draws nothing (C2). */
export function instances(map: MapJson): readonly Instance[] {
  const positions = map.terrain.layout?.positions ?? {};
  return map.terrain.organelles
    .toSorted((a, b) => byPath(a.id, b.id))
    .flatMap((organelle): Instance[] => {
      const place = positions[organelle.id];
      if (place === undefined) return [];
      return [
        {
          id: organelle.id,
          cell: organelle.cell,
          x: place.x,
          y: place.y,
          r: place.r,
          band: organelle.band,
          dents: organelle.dents,
          ...(organelle.clone_family === undefined ? {} : { clone_family: organelle.clone_family }),
        },
      ];
    });
}
