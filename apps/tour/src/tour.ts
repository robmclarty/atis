/**
 * tour: a reviewer's tour of an atis map, written by a model through
 * fascicle (D112, D177): the base and head of the map it was written for
 * (D183), then the stops in the order to review them, each a target, one
 * sentence, and the notice it explains. The flow is one model call between
 * two plain steps: the map becomes its digest, the map alone and never the
 * code or its diff (D182), and the model answers through a schema the map
 * bounds (`stops.ts`). A map with no notices has nothing to explain, so its
 * tour has no stops and calls no model.
 */

import type { MapJson } from 'core';
import { model_call, run, sequence, step } from 'fascicle';
import type { Engine } from 'fascicle';

import { digestOf, promptOf } from './digest.js';
import { stopsSchema } from './stops.js';
import type { Stop } from './stops.js';

/** The tour of one map: the base and head it was written for, then its stops in order. */
export type Tour = { readonly base: string; readonly head: string; readonly stops: readonly Stop[] };

/** Where the call goes: the provider, the model, and that provider's options for the call. */
export type Call = { readonly provider: string; readonly model: string; readonly options?: Readonly<Record<string, unknown>> };

/** The provider and the model as the engine reports it called them. */
export type Called = { readonly provider: string; readonly model: string };

/** A tour, and what was called to write it; nothing, when no model was. */
export type Written = { readonly tour: Tour; readonly called?: Called };

/**
 * What the model is told. Its first line is the tour's stable prefix, which
 * the stub engine in the tests routes by.
 */
export const TOUR_SYSTEM = [
  "atis/tour: write a reviewer's tour of one code change from its atis map.",
  'The map is all you have: paths, export and function names, line numbers, and the notices atis ranked, each with why it fired, the inputs it read and the thresholds it crossed. You see no code and no diff, so say only what the map shows.',
  'Order the notices the way a reviewer should take them, which need not be their rank: what the rest depends on comes first, and what follows from it after.',
  "Give each notice exactly one stop. Its target is where to look: the notice's own target, or a file or cell the map places that shows it better.",
  'Its sentence is one plain sentence on why the notice matters and why it comes at this point in the order. No markdown, no lists, no preamble.',
].join('\n');

/** Write the tour of `map` with the engine, through the call; a map with no notices gets no stops and calls nothing. */
export const writeTour = async (map: MapJson, engine: Engine, call: Call): Promise<Written> => {
  const { base, head } = map.meta;
  if (map.notices.length === 0) return { tour: { base, head, stops: [] } };
  const flow = sequence([
    step('digest', (read: MapJson) => promptOf(digestOf(read))),
    model_call({
      id: 'tour',
      description: "the stops of a reviewer's tour, from the map alone",
      engine,
      provider: call.provider,
      model: call.model,
      system: TOUR_SYSTEM,
      schema: stopsSchema(map),
      ...(call.options === undefined ? {} : { provider_options: call.options }),
    }),
  ]);
  const result = await run(flow, map);
  return { tour: { base, head, stops: result.content.stops }, called: { provider: result.model_resolved.provider, model: result.model_resolved.model_id } };
};
