/**
 * live: the registry read from React (D156). A block that calls `useLive`
 * re-renders whenever a token moves, and reads its tokens from a live view
 * of the registry in the shape it rests at.
 */

import { useSyncExternalStore } from 'react';

import type { Registry } from '../registry.js';

/** Re-render the caller when any token moves; the value is the registry's version, which has no other use. */
export const useLive = (registry: Registry): number => useSyncExternalStore(registry.subscribe, registry.version, registry.version);
