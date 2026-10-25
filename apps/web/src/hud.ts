/**
 * hud: the grade blocks of §7 and the legend's list of marks (D87), as the
 * world's chrome reads them from the map. The words are the still sheet's,
 * block for block and row for row: every number is read from the map (D33),
 * a block whose input the map does not carry, or carries as stale, is muted
 * with a dash where the number would be, never a number (C2, D41), the gate
 * and the standing block count the change's red and the rest apart (D70),
 * the Mutants block counts the survivors apart from those no test reached
 * (D143), and Health Δ waits for wave 3's base side (D23). A DOM test holds
 * the two renderers' words together on every fixture. Pure: no React, no
 * DOM, so a test reads the blocks straight.
 */

import { OTHER_GROUP, mutantOutcomes, readRedSplit } from 'core';
import type { MapJson } from 'core';
import { MUTED_DASH } from 'scene';

import { tallyOf } from './notices.js';

/**
 * One grade block: a label, a bold value, and a tail after it. A muted
 * block's value is the dash, and `muted` says why: `absent` when the map
 * never carried the input, `stale` when its slot's file predated the run
 * (D41), `empty` when there was nothing to measure, `head-only` for the
 * delta this build cannot take (D23).
 */
export type Block = {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly tail: string;
  readonly muted?: string;
};

/** The HUD blocks of §7, by their id, in the order the row draws them: the change's own evidence beside the category, then the red slots (D70). */
export const HUD_ORDER: readonly string[] = ['category', 'patch-cov', 'mutants', 'reach', 'size', 'gate', 'standing', 'health', 'notices', 'other'];

/** The minus sign a tally is written with. */
const MINUS = '−';

const block = (id: string, label: string, value: string, tail = ''): Block => ({ id, label, value, tail });
const muted = (id: string, label: string, reason: string): Block => ({ id, label, value: MUTED_DASH, tail: '', muted: reason });

/** Whether a slot's raw file was stale in this run: `meta.instruments.stale` names each as `slot: file, …` (D41). */
const isStale = (map: MapJson, slot: string): boolean => (map.meta.instruments.stale ?? []).some((entry) => entry.startsWith(`${slot}:`));

/**
 * `Gate n red` and `Standing n red`: the red slots, counted and never passed,
 * each in exactly one block by core's split as the map records it (D67, D70,
 * D73). The gate counts the change's red and reads `pass` with no numeral
 * when there is none; it is muted when no `.check/` was trusted, and when no
 * slot ran, since a gate nothing went through has passed nothing (C2). The
 * standing block counts the slots whose red is wholly standing, names the
 * global ones in its tail, and is not drawn when there are none.
 */
const gateBlocks = (map: MapJson): readonly Block[] => {
  if (map.meta.instruments.mode !== 'check') return [muted('gate', 'Gate', 'absent')];
  const { checks } = map.weather;
  if (checks.slots.every((slot) => slot.skipped)) return [muted('gate', 'Gate', 'empty')];
  const red = readRedSplit(checks.slots);
  const gate = red.change.length === 0 ? block('gate', 'Gate', 'pass') : block('gate', 'Gate', String(red.change.length), ' red');
  if (red.standing.length === 0) return [gate];
  const global = red.standing.filter((slot) => slot.global).map((slot) => slot.name);
  const tail = global.length === 0 ? ' red' : ` red, global: ${global.join(', ')}`;
  return [gate, block('standing', 'Standing', String(red.standing.length), tail)];
};

/**
 * `Patch cov x%`: the covered share of every changed executable line the
 * report measured, over the whole change, with the changed files it never
 * named counted beside it (`, 2 unmeasured`, D80). With nothing measured and
 * something unmeasured, the share is the dash and the count still speaks.
 */
const coverageBlock = (map: MapJson): Block => {
  if (isStale(map, 'test')) return muted('patch-cov', 'Patch cov', 'stale');
  const { patch_coverage: coverage, unmeasured = [] } = map.weather.evidence;
  if (coverage === undefined) return muted('patch-cov', 'Patch cov', 'absent');
  const tail = unmeasured.length === 0 ? '' : `, ${String(unmeasured.length)} unmeasured`;
  const executable = coverage.reduce((total, file) => total + file.changed_executable, 0);
  if (executable === 0) return tail === '' ? muted('patch-cov', 'Patch cov', 'empty') : block('patch-cov', 'Patch cov', MUTED_DASH, tail);
  const covered = coverage.reduce((total, file) => total + file.covered, 0);
  return block('patch-cov', 'Patch cov', `${String(Math.round((covered / executable) * 100))}%`, tail);
};

/**
 * `Mutants k survived`: the mutants still alive on the changed lines, which is
 * what core counted (§5.2), with those no test reached counted apart
 * (`, n untested`), and alone as `Mutants n untested` when none survived the
 * tests (D143).
 */
const mutantBlock = (map: MapJson): Block => {
  if (isStale(map, 'mutation')) return muted('mutants', 'Mutants', 'stale');
  const mutants = map.weather.evidence.mutants;
  if (mutants === undefined) return muted('mutants', 'Mutants', 'absent');
  const { survived, untested } = mutantOutcomes(mutants);
  if (survived === 0 && untested > 0) return block('mutants', 'Mutants', String(untested), ' untested');
  return block('mutants', 'Mutants', String(survived), untested === 0 ? ' survived' : ` survived, ${String(untested)} untested`);
};

/** The HUD row of §7 in `HUD_ORDER`; `Standing` only when some red is wholly standing (D70), `Other` only when the shore's `other` group is non-empty (D48). */
export const blocksOf = (map: MapJson): readonly Block[] => {
  const { changed, reach, checks } = map.weather;
  const cells = new Set(reach.map((entry) => entry.cell)).size;
  const added = changed.reduce((total, file) => total + file.added, 0);
  const deleted = changed.reduce((total, file) => total + file.deleted, 0);
  const other = map.terrain.groups.find((group) => group.id === OTHER_GROUP);
  const blocks: readonly Block[] = [
    block('category', '', checks.category),
    coverageBlock(map),
    mutantBlock(map),
    block('reach', 'Reach', String(cells), ' cells'),
    block('size', 'Size', `+${String(added)} ${MINUS}${String(deleted)}`, `, ${String(changed.length)} files`),
    ...gateBlocks(map),
    muted('health', 'Health Δ', 'head-only'),
    block('notices', 'Notices', tallyOf(map)),
    ...(other === undefined || other.files.length === 0 ? [] : [block('other', 'Other', String(other.files.length))]),
  ];
  const byId = new Map(blocks.map((entry) => [entry.id, entry] as const));
  return HUD_ORDER.flatMap((id) => {
    const entry = byId.get(id);
    return entry === undefined ? [] : [entry];
  });
};

/** What a block reads as, its three parts run together. */
export const blockText = (entry: Block): string => (entry.label === '' ? `${entry.value}${entry.tail}` : `${entry.label} ${entry.value}${entry.tail}`);

/** One mark the legend keys: its id, and the few words its row says. */
export type LegendMark = { readonly id: string; readonly words: string };

/**
 * The marks the inset keys, numbered from 1 in this order, as the still
 * sheet's inset and the practice map's callouts number them (D87, D125): the
 * category first, then the evidence on a changed file's skin, the storms, the
 * ghost, and the change itself; then the reach's light and its crossings, and
 * last the history's two textures (D166). A test holds the list to
 * `libs/svg`'s.
 */
export const LEGEND: readonly LegendMark[] = [
  { id: 'category', words: 'category: set by the change alone' },
  { id: 'lit-arc', words: 'lit arc: changed lines no test ran' },
  { id: 'hairline', words: 'hairline: changed lines the tests ran' },
  { id: 'notch', words: 'notch: a mutant no test killed' },
  { id: 'stitches', words: 'stitches: its tests passed, not run, failed' },
  { id: 'red-bolt', words: 'red bolt: a failing check names a changed file' },
  { id: 'grey-bolt', words: 'grey bolt: fails on files the change left alone' },
  { id: 'ghost', words: 'ghost: usually changes with these, and did not' },
  { id: 'stain', words: 'cyan: a changed file; +path in a row: added' },
  { id: 'unmeasured', words: 'skin lit whole: no coverage report names it' },
  { id: 'reach', words: 'warm light: the reach, dimmer each module out' },
  { id: 'crossing', words: 'lit halo: where the reach leaves a module' },
  { id: 'hatching', words: 'hatching: how much of it was rewritten lately' },
  { id: 'stipple', words: 'stipple: how many of its commits fixed bugs' },
];

/** What the key of the seven shapes says beside them (D146). */
export const SHAPE_KEY_WORDS = 'shape: rules it breaks, 0 to 6';

const channel = (hex: string, at: number): number => Number.parseInt(hex.slice(at, at + 2), 16);

/** A `#rrggbb` colour laid at `share` over another, flattened to the colour the eye sees: how the chrome draws the world's one translucent ink flat (D12). */
export const over = (top: string, under: string, share: number): string =>
  `#${[1, 3, 5]
    .map((at) => Math.round(channel(top, at) * share + channel(under, at) * (1 - share)))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`;
