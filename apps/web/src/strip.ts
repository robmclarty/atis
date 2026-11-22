/**
 * strip: one file's lines to scale, as the inspector draws them (D348
 * (line-strip)). The file's plate drew a strip of its lines beside its
 * functions (D102), and the plate is parked (D204 (parked-levels)), so where
 * in a file the risk sits had no picture left. This is that strip for a
 * panel: the file's functions as blocks by the lines they span, set in by
 * how deep each nests, the change's hunks, the changed lines no test ran,
 * and the mutants still alive, each in a lane of its own, so a mark is told
 * from another by where it lies and not by its ink alone.
 *
 * Every mark is a span of lines, `from` to `to`, both inside the file's own
 * lines: a hunk or a function that reaches past the text a panel shows is
 * cut to it, and one wholly past it is left out. What the map did not
 * measure is no mark (C2): a file with no coverage read has no untested
 * span, and the panel's facts say why beside it. Pure, so a test reads it
 * straight.
 */

import type { Hunk, Mutant } from 'core';

/** A run of lines, both ends counted, from 1. */
export type Span = { readonly from: number; readonly to: number };

/** A function's span, with its name and how many of the file's other functions hold it. */
export type FunctionSpan = Span & { readonly name: string; readonly depth: number };

/** A mutant still alive, at its line. */
export type MutantMark = Pick<Mutant, 'line' | 'status'>;

/** One file's strip: how many lines it runs to, and the marks along them. */
export type Strip = {
  readonly lines: number;
  readonly functions: readonly FunctionSpan[];
  /** The lines the change wrote, a span to a hunk; a hunk that only deleted lines wrote none and has no span. */
  readonly changed: readonly Span[];
  /** The changed lines no test ran, neighbours run together. */
  readonly untested: readonly Span[];
  readonly mutants: readonly MutantMark[];
};

/** What a strip is laid from: the file's lines, its functions where the scan read them, and what the change did to it where it did anything. */
export type StripInputs = {
  readonly lines: number;
  readonly functions: readonly { readonly name: string; readonly line: number; readonly lines: number; readonly depth: number }[];
  readonly hunks: readonly Hunk[];
  readonly untested: readonly number[];
  readonly mutants: readonly MutantMark[];
};

/** Line numbers as runs of neighbours, in order, each line once. */
export const spansOf = (lines: readonly number[]): readonly Span[] => {
  const spans: { from: number; to: number }[] = [];
  for (const line of [...new Set(lines)].toSorted((a, b) => a - b)) {
    const last = spans.at(-1);
    if (last !== undefined && line === last.to + 1) last.to = line;
    else spans.push({ from: line, to: line });
  }
  return spans;
};

/** A span cut to the strip's own lines, or none where it lies wholly past them. */
const within = <T extends Span>(span: T, lines: number): readonly T[] => (span.from > lines || span.to < 1 ? [] : [{ ...span, from: Math.max(1, span.from), to: Math.min(lines, span.to) }]);

/** A file's strip, every mark cut to its `lines`. */
export const stripOf = (inputs: StripInputs): Strip => {
  const lines = Math.max(1, Math.floor(inputs.lines));
  return {
    lines,
    functions: inputs.functions.flatMap((fn) => within({ name: fn.name, depth: fn.depth, from: fn.line, to: fn.line + Math.max(1, fn.lines) - 1 }, lines)),
    changed: inputs.hunks.flatMap((hunk) => (hunk.count <= 0 ? [] : within({ from: hunk.start, to: hunk.start + hunk.count - 1 }, lines))),
    untested: spansOf(inputs.untested).flatMap((span) => within(span, lines)),
    mutants: inputs.mutants.filter((mutant) => mutant.line >= 1 && mutant.line <= lines),
  };
};

/** Whether a strip has anything to show past its bare lines. */
export const stripMarked = (strip: Strip): boolean => strip.functions.length + strip.changed.length + strip.untested.length + strip.mutants.length > 0;

/** The line a point along the strip stands for: `share` of the way down it, 0 at its head to 1 at its foot. */
export const lineAt = (strip: Pick<Strip, 'lines'>, share: number): number => Math.min(strip.lines, Math.max(1, Math.floor(Math.min(1, Math.max(0, share)) * strip.lines) + 1));

/** What a strip's marks are, in a line of words, the lanes in the order they lie; only the lanes that hold a mark are named. */
export const stripKey = (strip: Strip): string =>
  [
    ...(strip.functions.length === 0 ? [] : ['blocks: functions']),
    ...(strip.changed.length === 0 ? [] : ['cyan: lines the change wrote']),
    ...(strip.untested.length === 0 ? [] : ['light: changed lines no test ran']),
    ...(strip.mutants.length === 0 ? [] : ['tick: a mutant no test killed']),
  ].join(' · ');
