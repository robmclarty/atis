/**
 * patch: the changed tokens as a patch to the files they rest in, for the
 * design doc's log of balance patches (Q3, D156). Each moved token is one
 * removed line and one added, written as the source writes it, under the
 * header of its file, so the text pastes into the log and reads in a review.
 */

import type { Change } from '../registry.js';

/** Where the scene's tokens rest. */
const TOKENS = 'libs/scene/src/tokens.ts';

/** Where the world's own materials rest. */
const MATERIALS = 'apps/web/src/materials.ts';

/** Where each material object rests: the world's own in its materials, the scene's each in its own file. */
const SOURCE_OF: Readonly<Record<string, string>> = {
  SKIN: MATERIALS,
  SPACE: MATERIALS,
  PLANET: MATERIALS,
  LIGHTING: MATERIALS,
  SKY: MATERIALS,
  BLOOM: MATERIALS,
  WEATHER: MATERIALS,
  NOTICE: MATERIALS,
  RELIEF: 'libs/scene/src/heightfield.ts',
  LEVELS: MATERIALS,
  CAMERA: MATERIALS,
  CINEMA: 'libs/scene/src/cinema.ts',
  HOVER: MATERIALS,
  WALK: MATERIALS,
  MINIMAP: 'libs/scene/src/minimap.ts',
  INTERIOR: MATERIALS,
  WIRING: 'libs/scene/src/wiring.ts',
  PANEL: MATERIALS,
};

/** A value as the source writes it: single-quoted strings, bare keys, a space inside each bracket. */
export const literal = (value: unknown): string => {
  if (typeof value === 'string') return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
  if (Array.isArray(value)) return `[${value.map(literal).join(', ')}]`;
  if (value !== null && typeof value === 'object') {
    return `{ ${Object.entries(value)
      .map(([key, each]) => `${key}: ${literal(each)}`)
      .join(', ')} }`;
  }
  return String(value);
};

/** The line a token is declared on: an export for a scene token, a field for a material's. */
const lineOf = (name: string, value: unknown): string => {
  const dot = name.indexOf('.');
  return dot < 0 ? `export const ${name} = ${literal(value)};` : `  ${name.slice(dot + 1)}: ${literal(value)},`;
};

/** The patch for every change, grouped by the file each token rests in; empty when nothing moved. */
export const patchOf = (changes: readonly Change[]): string => {
  const byFile = new Map<string, string[]>();
  for (const change of changes) {
    const dot = change.name.indexOf('.');
    const file = dot < 0 ? TOKENS : (SOURCE_OF[change.name.slice(0, dot)] ?? TOKENS);
    const lines = byFile.get(file) ?? [];
    lines.push(`-${lineOf(change.name, change.from)}`, `+${lineOf(change.name, change.to)}`);
    byFile.set(file, lines);
  }
  return [...byFile].map(([file, lines]) => [`--- a/${file}`, `+++ b/${file}`, ...lines].join('\n')).join('\n\n');
};
