/**
 * parts: what each HUD block opens on click (§7, step 36), read from the map
 * alone (D93): a red slot's named files, the uncovered lines per file, the
 * live mutants, the reach list with its hops and the interfaces crossed,
 * grouped under the names that carried it where the map records them, the
 * changed files with their sizes, the slots the category was set by, the
 * maintainability each changed file moved and what got better (D98), the
 * notices by rank, and the shore's `other` files. A block whose input the map
 * does not carry opens the one line that says so, never a number (C2). In
 * served mode a red slot also names the slot whose raw output the CLI serves
 * at `/check/<slot>` (D134); the chrome adds the link, so a fixture with no
 * server shows the parts without it. On a whole repo's map the overlay
 * block opens every overlay the map holds, counted, or muted with the map's
 * reason (D101, C2). Pure: no React, no DOM.
 */

import { OTHER_GROUP, OVERLAY_NAMES, changeSize, readRedSplit } from 'core';
import type { CheckSlot, Improvement, MapJson, ReachEntry } from 'core';
import { healthDeltaOf, overlayOf } from 'scene';
import type { OverlayUnit } from 'scene';

import { rowsOf, tallyOf } from './notices.js';

/** One group of lines a block opens: a heading, its lines, and, for a red slot, the slot whose raw output the server can show. */
export type Part = { readonly heading: string; readonly lines: readonly string[]; readonly slot?: string };

/** What a block opens: its parts, or the one line saying why it has none. */
export type Parts = { readonly block: string; readonly parts: readonly Part[]; readonly empty?: string };

/** The minus sign a tally is written with, and the separator between a line's parts. */
const MINUS = '−';
const DOT = '·';

const byPath = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** `1 hop`, `2 hops`. */
const hopsOf = (hops: number): string => `${String(hops)} ${hops === 1 ? 'hop' : 'hops'}`;

/** A slot's verdict in a word. */
const verdictOf = (slot: CheckSlot): string => (slot.skipped ? 'skipped' : slot.ok ? 'green' : 'red');

/** A red slot as a part: the changed files it is on the change through, then the rest of the files it names, or `global`. */
const redSlotPart = (slot: CheckSlot, standing: boolean): Part => {
  const change = slot.change ?? [];
  const rest = slot.scope === 'global' ? [] : slot.scope.filter((path) => !change.includes(path));
  const lines = slot.scope === 'global' ? ['global: no file named'] : [...change.map((path) => `${path} ${DOT} changed`), ...rest];
  return { heading: `${slot.name} ${DOT} red${standing ? ', standing' : ' on the change'}`, lines, slot: slot.name };
};

/** The change's red slots, or the standing ones, as parts; the gate's muted reasons open the line that says why (C2, D41, D70). */
const redParts = (map: MapJson, block: string, standing: boolean): Parts => {
  if (map.meta.instruments.mode !== 'check') return { block, parts: [], empty: 'no .check/ was trusted, so no slot was read' };
  const { slots } = map.weather.checks;
  if (slots.every((slot) => slot.skipped)) return { block, parts: [], empty: 'every slot was skipped, so nothing went through the gate' };
  const split = readRedSplit(slots);
  const names = new Set((standing ? split.standing : split.change).map((slot) => slot.name));
  const parts = slots.filter((slot) => names.has(slot.name)).map((slot) => redSlotPart(slot, standing));
  return parts.length === 0 ? { block, parts, empty: standing ? 'no red is standing' : 'no red is on the change' } : { block, parts };
};

/** The covered share and the uncovered lines of each measured file, then the files no report names (D80). */
const coverageParts = (map: MapJson): Parts => {
  const block = 'patch-cov';
  const { patch_coverage: coverage, unmeasured = [] } = map.weather.evidence;
  if (coverage === undefined) return { block, parts: [], empty: 'no coverage report was read' };
  const parts = coverage.map(
    (file): Part => ({
      heading: `${file.path} ${DOT} ${String(file.covered)} of ${String(file.changed_executable)} changed lines ran`,
      lines: file.changed_executable === 0 ? ['no changed line is executable'] : file.uncovered_lines.length === 0 ? ['every changed line ran'] : [`uncovered: ${file.uncovered_lines.map(String).join(', ')}`],
    }),
  );
  const rest = unmeasured.length === 0 ? [] : [{ heading: `${String(unmeasured.length)} unmeasured: no report names them`, lines: [...unmeasured] }];
  return { block, parts: [...parts, ...rest] };
};

/** The live mutants by file, each its line and its status (D143). */
const mutantParts = (map: MapJson): Parts => {
  const block = 'mutants';
  const mutants = map.weather.evidence.mutants;
  if (mutants === undefined) return { block, parts: [], empty: 'no mutation report was read' };
  if (mutants.length === 0) return { block, parts: [], empty: 'no mutant on a changed line is live' };
  const byFile = new Map<string, string[]>();
  for (const mutant of [...mutants].toSorted((a, b) => byPath(a.path, b.path) || a.line - b.line)) {
    const lines = byFile.get(mutant.path) ?? [];
    lines.push(`line ${String(mutant.line)} ${DOT} ${mutant.status.toLowerCase() === 'nocoverage' ? 'no test reached it' : mutant.status.toLowerCase()}`);
    byFile.set(mutant.path, lines);
  }
  return { block, parts: [...byFile].map(([path, lines]) => ({ heading: path, lines })) };
};

/** `1 file`, `2 files`. */
const filesOf = (count: number): string => `${String(count)} ${count === 1 ? 'file' : 'files'}`;

/**
 * The reach (D5, D45): each file with its hops and the interfaces the reach
 * crossed to get there. Where the map records the names that carried it
 * (D111), the files come under each name, in the names' order, and the files
 * the reach got to at the file level alone, past the importers, come after,
 * by cell and marked so (D181); with no names, by cell alone. Cells nearest
 * first.
 */
const reachParts = (map: MapJson): Parts => {
  const block = 'reach';
  const entries = [...map.weather.reach].toSorted((a, b) => a.hops - b.hops || byPath(a.path, b.path));
  if (entries.length === 0) return { block, parts: [], empty: 'the change reaches no cell' };
  const lineOf = (entry: ReachEntry): string => (entry.via.length === 0 ? `${entry.path} ${DOT} ${hopsOf(entry.hops)}` : `${entry.path} ${DOT} ${hopsOf(entry.hops)} via ${entry.via.join(' › ')}`);
  const byName = new Map<string, string[]>();
  const byCell = new Map<string, { hops: number; readonly lines: string[] }>();
  for (const entry of entries) {
    for (const name of entry.names ?? []) byName.set(name, [...(byName.get(name) ?? []), lineOf(entry)]);
    if (entry.names !== undefined) continue;
    const held = byCell.get(entry.cell) ?? { hops: entry.hops, lines: [] };
    held.hops = Math.min(held.hops, entry.hops);
    held.lines.push(lineOf(entry));
    byCell.set(entry.cell, held);
  }
  const named = [...byName].toSorted(([a], [b]) => byPath(a, b)).map(([name, lines]) => ({ heading: `${name} ${DOT} ${filesOf(lines.length)}`, lines }));
  const level = named.length === 0 ? '' : ` ${DOT} file-level`;
  const cells = [...byCell].toSorted(([a, ha], [b, hb]) => ha.hops - hb.hops || byPath(a, b)).map(([cell, { hops, lines }]) => ({ heading: `${cell} ${DOT} ${hopsOf(hops)}${level}`, lines }));
  return { block, parts: [...named, ...cells] };
};

/**
 * Every changed file with its kind and its lines added and deleted (D40,
 * D120): the terrain's, which the block counts, and the shore's apart,
 * named with its own tally and not counted in (D166).
 */
const sizeParts = (map: MapJson): Parts => {
  const { changed } = map.weather;
  if (changed.length === 0) return { block: 'size', parts: [], empty: 'no file changed' };
  const linesOf = (onTerrain: boolean): readonly string[] =>
    changed
      .filter((file) => (file.cell !== undefined) === onTerrain)
      .toSorted((a, b) => byPath(a.path, b.path))
      .map((file) => `${file.kind} ${file.from === undefined ? file.path : `${file.from} → ${file.path}`} ${DOT} +${String(file.added)} ${MINUS}${String(file.deleted)}`);
  const { terrain, shore } = changeSize(changed);
  const parts: Part[] = [];
  if (terrain.files > 0) parts.push({ heading: `${String(terrain.files)} files`, lines: linesOf(true) });
  if (shore.files > 0) parts.push({ heading: `the shore, not counted ${DOT} ${String(shore.files)} files ${DOT} +${String(shore.added)} ${MINUS}${String(shore.deleted)}`, lines: linesOf(false) });
  return { block: 'size', parts };
};

/** `+3.4`, `−1.5`, `0.0`: a file's movement as the block writes the total. */
const signed = (value: number): string => `${value > 0 ? '+' : value < 0 ? MINUS : ''}${Math.abs(value).toFixed(1)}`;

/** What got better, in words: the function back under a threshold, the dent gone, the clone family dissolved, the cycle broken. */
const improvementLine = (improvement: Improvement): string => {
  const files = improvement.files.join(', ');
  if (improvement.kind === 'threshold') return `${files} ${DOT} ${improvement.function ?? 'a function'} no longer over ${improvement.rule ?? 'a threshold'}`;
  if (improvement.kind === 'dent') return `${files} ${DOT} breaks ${improvement.rule ?? 'a rule'} no longer`;
  if (improvement.kind === 'clone-family') return `${files} ${DOT} no longer duplicate each other`;
  return `${files} ${DOT} no longer import round in a cycle`;
};

/**
 * Health Δ: each changed file both sides scored and the maintainability it
 * moved, then what got better (D98). With no base side measured it opens the
 * one line that says so, never a 0 (C2).
 */
const healthParts = (map: MapJson): Parts => {
  const delta = map.weather.health_delta;
  const improvements = map.weather.improvements ?? [];
  if (delta === undefined && map.weather.improvements === undefined) return { block: 'health', parts: [], empty: 'no base side was measured, so the change has no delta' };
  const parts: Part[] = [];
  if (delta !== undefined) {
    const heading = `${healthDeltaOf(map) ?? signed(delta.maintainability)} maintainability ${DOT} ${String(delta.files.length)} files both sides scored`;
    parts.push({ heading, lines: delta.files.map((file) => `${file.path} ${DOT} ${signed(file.maintainability)}`) });
  }
  if (improvements.length > 0) parts.push({ heading: `${String(improvements.length)} got better`, lines: improvements.map(improvementLine) });
  return { block: 'health', parts };
};

/** What a block opens, by its id. */
/** An overlay's unit, counted more than once. */
const PLURALS: Readonly<Record<OverlayUnit, string>> = { file: 'files', finding: 'findings', family: 'families', cycle: 'cycles' };

/** Every overlay a whole repo's map holds, with how many entries it draws, or why the map holds none of it (D101, C2). */
const overlayParts = (map: MapJson): Parts => {
  const lines = OVERLAY_NAMES.flatMap((name) => {
    const view = overlayOf(map, name);
    if (view === undefined) return [];
    return ['reason' in view ? `${view.title} ${DOT} muted: ${view.reason}` : `${view.title} ${DOT} ${String(view.count)} ${view.count === 1 ? view.unit : PLURALS[view.unit]}`];
  });
  return lines.length === 0 ? { block: 'overlay', parts: [], empty: 'a map of a change holds no overlays' } : { block: 'overlay', parts: [{ heading: 'the whole repo\'s overlays', lines }] };
};

export const partsOf = (map: MapJson, block: string): Parts => {
  switch (block) {
    case 'category': {
      const { slots } = map.weather.checks;
      if (map.meta.instruments.mode !== 'check') return { block, parts: [], empty: `no .check/ was trusted${map.meta.instruments.reason === undefined ? '' : `: ${map.meta.instruments.reason}`}` };
      return { block, parts: [{ heading: `${map.weather.checks.category}, set by the change alone`, lines: slots.map((slot) => `${slot.name} ${DOT} ${verdictOf(slot)}`) }] };
    }
    case 'patch-cov':
      return coverageParts(map);
    case 'mutants':
      return mutantParts(map);
    case 'reach':
      return reachParts(map);
    case 'size':
      return sizeParts(map);
    case 'gate':
      return redParts(map, block, false);
    case 'standing':
      return redParts(map, block, true);
    case 'health':
      return healthParts(map);
    case 'notices':
      return { block, parts: [{ heading: `${tallyOf(map)} by tier`, lines: rowsOf(map).map((row) => `${String(row.rank)} ${DOT} ${row.tier} ${DOT} ${row.kind} ${DOT} ${row.words}`) }] };
    case 'other': {
      const files = map.terrain.groups.find((group) => group.id === OTHER_GROUP)?.files ?? [];
      return files.length === 0 ? { block, parts: [], empty: 'nothing fell to other' } : { block, parts: [{ heading: `${String(files.length)} files no group claims`, lines: [...files].toSorted(byPath) }] };
    }
    case 'overlay':
      return overlayParts(map);
    default:
      return { block, parts: [], empty: 'nothing to open' };
  }
};
