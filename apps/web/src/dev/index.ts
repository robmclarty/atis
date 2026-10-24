/**
 * dev: the dev panel (D156), no part of the design a user sees. The chrome
 * imports this module only when the panel is opened, so Vite splits it into
 * its own chunk and a page that never opens it never loads it.
 */

export * from './panel.js';
export * from './patch.js';
