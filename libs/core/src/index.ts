/**
 * core: the pure heart of atis. No Node, no DOM, no filesystem; it turns the
 * scanned repository, the diff and the check artifacts into `map.json`.
 */

/** The `map.json` contract version this core writes and the renderers read. */
export const SCHEMA_VERSION = 1;
