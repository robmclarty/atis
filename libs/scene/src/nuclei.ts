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
 * the whole map's granules are never laid at once (D292
 * (granules-off-composites)): a closed package draws none of its files, and
 * a granule per function on a repo that size is more than a far view needs.
 * There the world lays only the granules of the files in view that are drawn
 * large enough to show one, as the view comes to rest (`nucleiInView`, D343
 * (granules-in-view)). A map none of whose placed files carries function data
 * says so, since no granules there means nobody read the functions, not that
 * there are none (D293 (granules-unmeasured), C2).
 *
 * Pure (C1), and one map and one set of tokens give one list, in path order
 * and then line order (C3).
 */

import type { MapJson, Organelle } from 'core';

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

/** Why a map draws no granules at all: its packages stand as composites, or none of its placed files carries function data. */
export type NucleiOff = 'composites' | 'no function data';

/** The map's granules at rest, files in path order and each file's in line order; or none and why. */
export type RestNuclei = { readonly granules: readonly RestGranule[]; readonly off?: NucleiOff };

/** The lines of the largest file each module's slide shows on a map, kept beside the map so a view laid again reads each module once. */
const mostLines = new WeakMap<MapJson, Map<string, number>>();

function mostLinesOf(map: MapJson, module: string): number {
  const known = mostLines.get(map) ?? new Map<string, number>();
  mostLines.set(map, known);
  const lines = known.get(module) ?? Math.max(0, ...slideFilesOf(map, module).map(({ organelle }) => organelle.loc));
  known.set(module, lines);
  return lines;
}

/** One placed file's granules at rest on the map, in line order; none for a file with no place or no function data (C2). */
function granulesOf(map: MapJson, organelle: Organelle, tokens: NucleusTokens): readonly RestGranule[] {
  const place = map.terrain.layout?.positions[organelle.id];
  if (place === undefined || organelle.functions === undefined) return [];
  const file: NucleusFile = { id: organelle.id, lines: organelle.loc, functions: organelle.functions };
  // The outline the map draws the file in at rest: its trouble's, still.
  const outline = outlineOf(organelle.id, place, troubleOf(organelle).score);
  const nucleus = nucleusOf(file, outline, mostLinesOf(map, slideCellOf(map, organelle.cell)), tokens);
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
}

function byId(a: Organelle, b: Organelle): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Whether any placed file of the map carries function data. */
function measured(map: MapJson): boolean {
  const positions = map.terrain.layout?.positions ?? {};
  return map.terrain.organelles.some((organelle) => organelle.functions !== undefined && positions[organelle.id] !== undefined);
}

/**
 * Every placed file's granules at rest. `composites` are the map's, as
 * `compositesOf` reads them, and `tokens` the nucleus's, live where a
 * registry hands them in (D156).
 */
export function nucleiOf(map: MapJson, composites: readonly Composite[] = compositesOf(map), tokens: NucleusTokens = NUCLEUS_TOKENS): RestNuclei {
  if (composites.length > 0) return { granules: [], off: 'composites' };
  if (!measured(map)) return { granules: [], off: 'no function data' };
  return { granules: map.terrain.organelles.toSorted(byId).flatMap((organelle) => granulesOf(map, organelle, tokens)) };
}

/**
 * The stretch of the map a view shows, and what it can show of it: the box in
 * layout units, the least radius a file must have on the ground for a granule
 * of it to be seen at this zoom, and the most granules to lay.
 */
export type NucleiView = {
  readonly box: { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };
  readonly least: number;
  readonly most: number;
};

/** The granules a view lays, files in path order and each file's in line order, and how many files in view it left unlaid once `most` was reached. */
export type ViewNuclei = { readonly granules: readonly RestGranule[]; readonly left: number };

/**
 * The granules of the files a view shows (D343 (granules-in-view)): each
 * placed file with function data that touches the view's box, is drawn at
 * `least` or more, and that `shut` does not name, as a file of a package that
 * stands closed is. Files are laid in path order until the next would pass
 * `most`; a file is laid whole or not at all, and the count of those left
 * says so, so a full view never reads as a quiet one (C2). Whatever the
 * map's composites, since this is how a map of them draws its granules.
 */
export function nucleiInView(map: MapJson, view: NucleiView, shut: (file: string) => boolean = () => false, tokens: NucleusTokens = NUCLEUS_TOKENS): ViewNuclei {
  const positions = map.terrain.layout?.positions ?? {};
  const seen = map.terrain.organelles.toSorted(byId).filter((organelle) => {
    const place = positions[organelle.id];
    // A file that names no function has nothing to lay, so it is neither laid nor left.
    if (place === undefined || organelle.functions === undefined || organelle.functions.length === 0 || place.r < view.least || shut(organelle.id)) return false;
    return place.x + place.r >= view.box.x0 && place.x - place.r <= view.box.x1 && place.y + place.r >= view.box.y0 && place.y - place.r <= view.box.y1;
  });
  const granules: RestGranule[] = [];
  let left = 0;
  for (const organelle of seen) {
    const next = left > 0 ? [] : granulesOf(map, organelle, tokens);
    if (left > 0 || granules.length + next.length > view.most) {
      left += 1;
      continue;
    }
    granules.push(...next);
  }
  return { granules, left };
}

/** Why a map can draw no granule at any zoom, or nothing where it can: none of its placed files carries function data (D293 (granules-unmeasured)). */
export function nucleiUnread(map: MapJson): NucleiOff | undefined {
  return measured(map) ? undefined : 'no function data';
}
