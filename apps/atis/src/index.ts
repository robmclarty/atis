/**
 * atis: a weather map for code changes.
 *
 * The package's surface: the constants the command prints, and `run`, which
 * turns a parsed set of flags into `map.json` on disk.
 */

import { SCHEMA_VERSION } from 'core';

export * from './run.js';

export const NAME = 'atis';
export const VERSION = '0.0.0';

export const USAGE = `${NAME} ${VERSION}: a weather map for code changes.

  atis --base <ref> [options]

  --repo <path>   the repository to read (default: the working directory)
  --base <ref>    the ref the change is measured from (required)
  --out <file>    where to write the map (default: map.json)
  --svg <file>    also render that map as a static SVG at <file>
  --open          open the rendered SVG in the platform viewer (needs --svg)
  --verbose       print per-source timings on stderr
  --version, -V   print the version
  --help, -h      print this text

The map is written at schema ${SCHEMA_VERSION}: terrain scanned from the merge
base of <ref> and HEAD, weather from HEAD, and at most six ranked notices.
https://github.com/robmclarty/atis
`;
