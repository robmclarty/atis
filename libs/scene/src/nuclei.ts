/**
 * nuclei: every placed file's functions as granules on the map itself, at
 * rest (D206 (detail-by-size)). The slide laid a file's nucleus only once its
 * cell was opened; here each file with function data carries the same
 * nucleus where the layout put it, in layout units, so the world can draw it
 * at any zoom and let it resolve by its size on the screen.
 *
 * A file's nucleus is the one the slide lays (D197, `nucleusOf`), inside the
 * outline the map draws the file in at rest, and filled against the largest
 * file of the file's own module: the cell whose slide shows it, so a
 * single-file module is measured among the files of the package it floats in
 * (D167), and a file reads as full on the map as it did on its slide
 * (D291 (granules-per-module)). A file the scan read no functions in has no
 * granules, never one made from a count (C2).
 *
 * Past 5,000 placed files, where each package stands as one composite (C14),
 * the map draws none and says why (D292 (granules-off-composites)): a closed
 * package draws none of its files, and the cost of a granule per function on
 * a repo that size is not measured.
 *
 * Pure (C1), and one map and one set of tokens give one list, in path order
 * and then line order (C3).
 */

import type { MapJson } from 'core';

import { compositesOf } from './composites.js';
import type { Composite } from './composites.js';
import { slideCellOf, slideFilesOf } from './drift.js';
import { NUCLEUS_TOKENS, nucleusOf } from './interior.js';
import type { NucleusFile, NucleusTokens } from './interior.js';
import { outlineOf } from './shape.js';
import { troubleOf } from './trouble.js';

/**
 * One function as a granule at rest on the map: the file it is in and that
 * file's cell, the function's name and first line, where its middle lies and
 * how big it is, in layout units, and whether it breaks a threshold.
 */
export type RestGranule = {
  readonly file: string;
  readonly cell: string;
  readonly name: string;
  readonly line: number;
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly breached: boolean;
};

/** The map's granules at rest, files in path order and each file's in line order; or none and why, on a map whose packages stand as composites. */
export type RestNuclei = { readonly granules: readonly RestGranule[]; readonly off?: 'composites' };

/**
 * Every placed file's granules at rest. `composites` are the map's, as
 * `compositesOf` reads them, and `tokens` the nucleus's, live where a
 * registry hands them in (D156).
 */
export function nucleiOf(map: MapJson, composites: readonly Composite[] = compositesOf(map), tokens: NucleusTokens = NUCLEUS_TOKENS): RestNuclei {
  if (composites.length > 0) return { granules: [], off: 'composites' };
  const positions = map.terrain.layout?.positions ?? {};
  // The lines of the largest file each module's slide shows, read once a module.
  const most = new Map<string, number>();
  const mostLinesOf = (module: string): number => {
    const known = most.get(module);
    if (known !== undefined) return known;
    const lines = Math.max(0, ...slideFilesOf(map, module).map(({ organelle }) => organelle.loc));
    most.set(module, lines);
    return lines;
  };
  const granules = map.terrain.organelles
    .toSorted((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .flatMap((organelle): RestGranule[] => {
      const place = positions[organelle.id];
      if (place === undefined || organelle.functions === undefined) return [];
      const file: NucleusFile = { id: organelle.id, lines: organelle.loc, functions: organelle.functions };
      // The outline the map draws the file in at rest: its trouble's, still.
      const outline = outlineOf(organelle.id, place, troubleOf(organelle).score);
      const nucleus = nucleusOf(file, outline, mostLinesOf(slideCellOf(map, organelle.cell)), tokens);
      return (nucleus?.granules ?? []).map((granule) => ({
        file: organelle.id,
        cell: organelle.cell,
        name: granule.name,
        line: granule.line,
        x: place.x + granule.x,
        y: place.y + granule.y,
        r: granule.r,
        breached: granule.rules.length > 0,
      }));
    });
  return { granules };
}
