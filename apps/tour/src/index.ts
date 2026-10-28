/**
 * tour: an opt-in reviewer's tour of an atis map (D112, D177, D182, D183), a
 * private workspace app atis never imports. Run as `pnpm --filter tour start
 * <map.json>`, it writes `tour.json`: the base and head of the map it read,
 * then ordered stops, each a target, one sentence, and the notice it
 * explains, written by a model through fascicle from the map alone.
 */

export { cachePath, keepTour, keptTour, readTour, tourText } from './cache.js';
export { USAGE, tourCommand } from './command.js';
export type { TourIo } from './command.js';
export { digestOf, promptOf } from './digest.js';
export type { Digest } from './digest.js';
export { CLAUDE_CLI_ARGS, DEFAULT_MODELS, KEYS, PROVIDERS, isProvider, planFor } from './providers.js';
export type { Plan, Provider } from './providers.js';
export { stopsSchema } from './stops.js';
export type { Stop, Stops } from './stops.js';
export { TOUR_SYSTEM, writeTour } from './tour.js';
export type { Call, Called, Tour, Written } from './tour.js';
