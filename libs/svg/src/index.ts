/**
 * svg: the still renderer. A pure `renderSvg(map): string` with no DOM and no
 * Node, so it golden-tests from a fixture and stays swappable for the moving
 * renderer of phase 2 (D33).
 */

export * from './el.js';
export * from './render.js';
export * from './terrain.js';
export * from './tokens.js';
