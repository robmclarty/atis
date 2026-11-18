/**
 * trouble: where a file sits on the shape spectrum (D194, Q81). Shape means
 * trouble: the rules a file breaks carry the score, and its history shades
 * it, so a rule-abiding file that keeps changing or keeps being fixed leaves
 * the circle while the spiky end stays the rule-breakers'.
 *
 * The rules set a floor, `troubleFrom`: nothing at none, `TROUBLE_RULES_FROM`
 * at one, then an even climb to 1 one step past the last rule. History, the
 * greater of churn and bug-fix rate, each full where its texture is, carries
 * the score from that floor toward the next rule's, so six rules with a
 * calm past score 0.9 and reach 1 only with a full one (Q96), and the score
 * never jumps as a rule is added.
 *
 * Every input is on the map already, so the score is computed here rather
 * than in core (C3). A signal the map lacks is named in `missing` and reads
 * as nothing, never as a default that would lower or raise the score (C2).
 */

import type { Organelle } from 'core';

import { MAX_RULES, rulesOf } from './shape.js';
import { BUGFIX_FULL_AT, CHURN_FULL_AT, TROUBLE_RULES_FROM } from './tokens.js';

/** A signal the score reads off an organelle. */
export type TroubleSignal = 'dents' | 'churn_ratio' | 'bugfix_rate';

/** A file's place on the spectrum, 0 smooth to 1 spiky, with the signals that placed it and the ones the map did not carry. */
export type Trouble = { readonly score: number; readonly used: readonly TroubleSignal[]; readonly missing: readonly TroubleSignal[] };

/** The tokens the score reads, so the dev panel can move them live (D156). */
export type TroubleTokens = { readonly TROUBLE_RULES_FROM: number; readonly CHURN_FULL_AT: number; readonly BUGFIX_FULL_AT: number };

const AT_REST_TOKENS: TroubleTokens = { TROUBLE_RULES_FROM, CHURN_FULL_AT, BUGFIX_FULL_AT };

const unit = (value: number): number => (Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0);

/**
 * The score `rules` broken rules give with no history: 0 at none, `from` at
 * one, climbing evenly to 1 at `MAX_RULES + 1`. A function's breaches read
 * on the same scale, so one breach bends a granule as one rule bends a file
 * (Q97).
 */
export function troubleFrom(rules: number, from: number = TROUBLE_RULES_FROM): number {
  const count = Math.max(0, Math.min(MAX_RULES + 1, rules));
  const floor = unit(from);
  return count <= 1 ? count * floor : floor + ((count - 1) / MAX_RULES) * (1 - floor);
}

/** The trouble score of one file, from its dents and its history. */
export function troubleOf(organelle: Pick<Organelle, 'dents' | 'churn_ratio' | 'bugfix_rate'>, tokens: TroubleTokens = AT_REST_TOKENS): Trouble {
  const rules = rulesOf(organelle.dents);
  const { churn_ratio: churn, bugfix_rate: bugfix } = organelle;
  const used: TroubleSignal[] = ['dents'];
  const missing: TroubleSignal[] = [];
  (churn === undefined ? missing : used).push('churn_ratio');
  (bugfix === undefined ? missing : used).push('bugfix_rate');
  const history = Math.max(churn === undefined ? 0 : unit(churn / tokens.CHURN_FULL_AT), bugfix === undefined ? 0 : unit(bugfix / tokens.BUGFIX_FULL_AT));
  const floor = troubleFrom(rules, tokens.TROUBLE_RULES_FROM);
  return { score: unit(floor + (troubleFrom(rules + 1, tokens.TROUBLE_RULES_FROM) - floor) * history), used, missing };
}
