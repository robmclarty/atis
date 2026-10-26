/**
 * atis: a weather map for code changes.
 *
 * The package's surface: the constants the command prints, `run`, which turns
 * a parsed set of flags into `map.json` on disk, `serveRun`, which serves the
 * world instead (D92), and `serve`, the loopback server beneath it.
 */

import { SCHEMA_VERSION } from 'core';

export * from './run.js';
export * from './serve.js';

export const NAME = 'atis';
export const VERSION = '0.0.0';

export const USAGE = `${NAME} ${VERSION}: a weather map for code changes.

  atis --base <ref> [options]

With no --out or --svg, atis serves the world on 127.0.0.1 at a port of its own,
opens it in a tab, and runs until interrupted.

  --repo <path>   the repository to read (default: the working directory)
  --base <ref>    the ref the change is measured from (required)
  --out <file>    write the map to <file> and exit (default with --svg: map.json)
  --svg <file>    render the map as a static SVG at <file> and exit
  --open          open the rendered SVG in the platform viewer (needs --svg)
  --no-open       serve without opening the tab
  --no-cache      measure the base afresh, neither reading nor writing the
                  terrain kept per base commit in .atis/terrain/
  --history <n>   read the newest <n> commits of history (default 5000)
  --verbose       print per-source timings, and the terrain cache's hit or
                  miss, on stderr
  --version, -V   print the version
  --help, -h      print this text

The map is written at schema ${SCHEMA_VERSION}: terrain scanned from the merge
base of <ref> and HEAD, weather from HEAD, and at most six ranked notices.
The terrain is kept per merge base under .atis/, which ignores itself in git.
https://github.com/robmclarty/atis
`;
