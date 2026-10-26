/**
 * file: one file opened onto §6's file level (LOD3, D102), laid out once for
 * every renderer (D90). The file is a plate, a unit square: its functions are
 * granules down the plate in the order of their lines, each sized by the
 * lines it spans and dented by the thresholds it breaks, as a file's outline
 * is by its rules (D146), and a function nested in another stands in a
 * column to its right; beside them runs a strip of the file's lines, on the
 * same scale, so a granule sits level with its own lines. The strip carries
 * the change's hunks, the changed lines no test ran, or every changed line
 * of a file no coverage report names (D80), and the live mutants pinned to
 * their lines. What the map does not carry is not drawn: a file the head
 * scan read no functions in has no granules, and one with no coverage
 * channel lights no line (C2). Pure, so a test reads it straight.
 */

import type { Hunk, MapJson, Mutant } from 'core';

import { MAX_RULES, outlineOf } from './shape.js';
import { FILE_GRANULE_PAD, FILE_STRIP_SHARE } from './tokens.js';

/** One function as a granule on the plate: what it is, how deep it nests, and where it lies, its outline dented once per rule it breaks. */
export type Granule = {
  readonly name: string;
  readonly line: number;
  readonly line_count: number;
  readonly rules: readonly string[];
  readonly depth: number;
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly ring: readonly (readonly [number, number])[];
};

/** One file at the file level, on a unit plate: its lines, its granules, and the strip's marks, by line. */
export type FileLevel = {
  readonly path: string;
  /** How many lines the strip runs to: the file's own, or more where a function or a hunk reaches past them. */
  readonly lines: number;
  readonly granules: readonly Granule[];
  /** Where the strip lies across the plate. */
  readonly strip: { readonly x0: number; readonly x1: number };
  readonly hunks: readonly Hunk[];
  /** The changed lines no test ran: the report's, or every changed line of a file it never names (D80); none with no coverage read. */
  readonly uncovered: readonly number[];
  /** Whether a coverage report measured the file at all; false where none was read, so nothing on its strip is lit (C2). */
  readonly measured: boolean;
  /** The mutants still alive on its changed lines, by line. */
  readonly mutants: readonly Pick<Mutant, 'line' | 'status'>[];
};

/** The last line a function spans. */
function endOf(fn: { readonly line: number; readonly line_count: number }): number {
  return fn.line + fn.line_count - 1;
}

/** Every head-side line a hunk spans. */
function hunkLines(hunks: readonly Hunk[]): readonly number[] {
  return hunks.flatMap((hunk) => Array.from({ length: hunk.count }, (_, i) => hunk.start + i));
}

/**
 * The file at `path` at the file level, or undefined where the terrain holds
 * no such file. A function's depth is how many of the others hold its lines,
 * and the granules fill as many columns as the deepest needs.
 */
export function fileLevelOf(map: MapJson, path: string): FileLevel | undefined {
  const organelle = map.terrain.organelles.find((each) => each.path === path);
  if (organelle === undefined) return undefined;
  const hunks = map.weather.changed.find((file) => file.path === path)?.hunks ?? [];
  const functions = organelle.functions ?? [];
  const lines = Math.max(1, organelle.loc, ...functions.map(endOf), ...hunks.map((hunk) => hunk.start + Math.max(hunk.count, 1) - 1));
  const holds = (outer: (typeof functions)[number], inner: (typeof functions)[number]): boolean =>
    outer !== inner && outer.line <= inner.line && endOf(outer) >= endOf(inner) && (outer.line !== inner.line || endOf(outer) !== endOf(inner));
  const depths = functions.map((fn) => functions.filter((outer) => holds(outer, fn)).length);
  const columns = Math.max(1, ...depths.map((depth) => depth + 1));
  const width = (1 - FILE_STRIP_SHARE * 1.5) / columns;
  const granules = functions.map((fn, index): Granule => {
    const depth = depths[index] ?? 0;
    const top = (fn.line - 1) / lines;
    const height = fn.line_count / lines;
    const at = { x: (depth + 0.5) * width, y: top + height / 2, r: (Math.min(width, height) / 2) * (1 - FILE_GRANULE_PAD) };
    const rules = fn.breaches ?? [];
    return { name: fn.name, line: fn.line, line_count: fn.line_count, rules, depth, ...at, ring: outlineOf(`${path}#${fn.name}@${String(fn.line)}`, at, Math.min(rules.length, MAX_RULES)).ring };
  });
  const { evidence } = map.weather;
  const report = evidence.patch_coverage?.find((file) => file.path === path);
  const unmeasured = (evidence.unmeasured ?? []).includes(path);
  const uncovered = report !== undefined ? report.uncovered_lines : unmeasured ? hunkLines(hunks) : [];
  const mutants = (evidence.mutants ?? [])
    .filter((mutant) => mutant.path === path)
    .map(({ line, status }) => ({ line, status }))
    .toSorted((a, b) => a.line - b.line || (a.status < b.status ? -1 : a.status > b.status ? 1 : 0));
  return {
    path,
    lines,
    granules,
    strip: { x0: 1 - FILE_STRIP_SHARE, x1: 1 },
    hunks,
    uncovered: [...uncovered].toSorted((a, b) => a - b),
    measured: report !== undefined || unmeasured,
    mutants,
  };
}
