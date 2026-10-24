/**
 * box: the numbered box a notice wears wherever the chrome marks it (§5.4):
 * at its row's edge in the list, on its shore group's block in the rail
 * (D153), and, through the labels layer, beside its target on the field.
 * One style for all three, from `notices.ts`, in the brutalist material
 * (D12): solid in the category hue for the primary, a thick ink frame for a
 * secondary, a thin muted frame for a tertiary.
 */

import type { ReactElement } from 'react';
import type { NoticeTier } from 'core';

import { boxStyle } from '../notices.js';
import type { BoxLook } from '../notices.js';

export const NoticeBox = ({ rank, tier, look, hue, side, numeral }: { readonly rank: number; readonly tier: NoticeTier; readonly look: BoxLook; readonly hue: string; readonly side: number; readonly numeral: number }): ReactElement => (
  <span data-mark={rank} data-tier={tier} style={boxStyle(tier, look, hue, side, numeral)}>
    {rank}
  </span>
);
