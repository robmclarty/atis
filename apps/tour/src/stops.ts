/**
 * stops: the shape the tour's model answers in, bounded by the map it read
 * (D112, D183): the stops in the order to review them, each explaining one
 * notice by its rank, every notice once, with one sentence on why it matters
 * and why it comes there, at a target the world can fly to, a file or a cell
 * the map places or the notice's own target. It is a Standard Schema that
 * carries its JSON Schema (fascicle's `ToolSchema`), written by hand so the
 * tour needs no schema library: the JSON Schema shows the model the shape,
 * and the validator holds it to the map, so a stop the world could not fly to
 * fails the call, which fascicle answers with a repair pass, rather than
 * reaching `tour.json`.
 */

import type { MapJson } from 'core';
import type { ToolSchema } from 'fascicle';

/** One stop of the tour: where the world flies, what it says there, and the notice it explains, by rank. */
export type Stop = { readonly target: string; readonly sentence: string; readonly notice: number };

/** The model's answer: the stops in the order to review them. */
export type Stops = { readonly stops: readonly Stop[] };

/** One thing wrong with an answer, and where. */
type Issue = { readonly message: string; readonly path: readonly (string | number)[] };

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** What the map bounds a stop by: how many notices it ranks, what it places, and each notice's own target. */
type Bounds = { readonly ranks: number; readonly places: ReadonlySet<string>; readonly targetOf: (rank: number) => string | undefined };

/** One stop of an answer as read against the map: the stop, or what is wrong with it. */
const readStop = (value: unknown, at: number, bounds: Bounds): { readonly stop: Stop } | { readonly issues: readonly Issue[] } => {
  const path = ['stops', at];
  if (!isRecord(value)) return { issues: [{ message: 'a stop is an object', path }] };
  const { target, sentence, notice } = value;
  const issues: Issue[] = [];
  const rank = typeof notice === 'number' && Number.isInteger(notice) && notice >= 1 && notice <= bounds.ranks ? notice : undefined;
  if (rank === undefined) issues.push({ message: `notice is a rank from 1 to ${String(bounds.ranks)}`, path: [...path, 'notice'] });
  const words = typeof sentence === 'string' ? sentence.trim() : '';
  if (words.length === 0) issues.push({ message: 'sentence is one sentence of words', path: [...path, 'sentence'] });
  const place = typeof target === 'string' && (bounds.places.has(target) || (rank !== undefined && target === bounds.targetOf(rank))) ? target : undefined;
  if (place === undefined) issues.push({ message: 'target is a file or a cell the map places, or the target of the notice the stop explains', path: [...path, 'target'] });
  return rank === undefined || place === undefined || issues.length > 0 ? { issues } : { stop: { target: place, sentence: words, notice: rank } };
};

/** The schema an answer about `map` is held to. */
export const stopsSchema = (map: MapJson): ToolSchema<Stops> => {
  const ranks = map.notices.length;
  const places = new Set([...map.terrain.cells.map((cell) => cell.id), ...map.terrain.organelles.map((organelle) => organelle.id)]);
  const targetOf = (rank: number): string | undefined => map.notices[rank - 1]?.target;
  const json = {
    type: 'object',
    properties: {
      stops: {
        type: 'array',
        description: `The stops in the order a reviewer should take them: one for each of the ${String(ranks)} notices, each notice once.`,
        minItems: ranks,
        maxItems: ranks,
        items: {
          type: 'object',
          properties: {
            notice: { type: 'integer', minimum: 1, maximum: ranks, description: 'The rank of the notice this stop explains.' },
            target: { type: 'string', description: "The file path or cell id to look at for it: the notice's own target, or a file or cell the map places." },
            sentence: { type: 'string', description: 'One sentence: why the notice matters, and why it comes at this point in the order.' },
          },
          required: ['notice', 'target', 'sentence'],
          additionalProperties: false,
        },
      },
    },
    required: ['stops'],
    additionalProperties: false,
  };
  const bounds: Bounds = { ranks, places, targetOf };
  const validate = (value: unknown): { readonly value: Stops } | { readonly issues: readonly Issue[] } => {
    const listed: unknown = isRecord(value) ? value['stops'] : undefined;
    if (!Array.isArray(listed)) return { issues: [{ message: 'the answer is an object holding a stops array', path: [] }] };
    const read = listed.map((stop: unknown, at) => readStop(stop, at, bounds));
    const issues = read.flatMap((each) => ('issues' in each ? each.issues : []));
    const stops = read.flatMap((each) => ('stop' in each ? [each.stop] : []));
    // The notices the answer names, whatever else is wrong with their stops, so a bad target is not also read as a missing notice.
    const explained = new Set(listed.flatMap((stop: unknown) => (isRecord(stop) ? [stop['notice']] : [])));
    const missing = Array.from({ length: ranks }, (_, index) => index + 1).filter((rank) => !explained.has(rank));
    if (missing.length > 0) issues.push({ message: `every notice is explained: missing ${missing.join(', ')}`, path: ['stops'] });
    if (read.length !== ranks) issues.push({ message: `every notice is explained once: ${String(ranks)} stops, not ${String(read.length)}`, path: ['stops'] });
    return issues.length > 0 ? { issues } : { value: { stops } };
  };
  return { '~standard': { version: 1, vendor: 'atis-tour', validate, jsonSchema: { input: () => json, output: () => json } } };
};
