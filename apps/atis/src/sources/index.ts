/**
 * sources: the readers at the CLI's edge. Each one shells out or touches the
 * filesystem and hands core a plain structure, with the parsing split off into
 * pure functions that are tested from strings (D30). The language producers
 * read a commit into one scan (D114).
 */

export * from './check.js';
export * from './fallow.js';
export * from './git.js';
export * from './imports.js';
export * from './producers.js';
export * from './scan.js';
export * from './shapes.js';
