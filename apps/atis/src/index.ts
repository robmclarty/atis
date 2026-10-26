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

  atis [--base <ref> | --last-commit | --last-tag] [--head <ref>] [options]

With no --out or --svg, atis serves the world on 127.0.0.1 at a port of its own,
opens it in a tab, and runs until interrupted.

  --repo <path>   the repository to read (default: the working directory)
  --base <ref>    the ref the change is measured from (default: the trunk, the
                  trunk atis.config.json names, else the first of main, master,
                  develop and trunk, each local and then on origin/)
  --last-commit   measure from the head's parent, HEAD~1
  --last-tag      measure from the newest tag the head reaches
  --head <ref>    map the change at <ref> rather than at HEAD; .check/ is read
                  only for the checked-out HEAD, so another head is git-only
  --working-tree  map the change in the working tree, staged, unstaged and
                  untracked, rather than at HEAD, with .check/ as its evidence;
                  with --base HEAD it is the uncommitted change alone. The
                  same inputs write the same map only on a clean tree: a dirty
                  one maps what it holds at the moment it is read
  --out <file>    write the map to <file> and exit (default with --svg: map.json)
  --svg <file>    render the map as a static SVG at <file> and exit
  --open          open the rendered SVG in the platform viewer (needs --svg)
  --no-open       serve without opening the tab
  --no-cache      measure afresh, neither reading nor writing the terrain kept
                  per base commit in .atis/terrain/ or the structure fallow
                  measured per commit in .atis/structure/
  --history <n>   read the newest <n> commits of history (default 5000)
  --verbose       print per-source timings, and each cache's hit or miss, on
                  stderr
  --version, -V   print the version
  --help, -h      print this text

The map is written at schema ${SCHEMA_VERSION}: terrain scanned from the merge
base of the base and the head, weather from the head, and at most six ranked
notices.
The terrain is kept per merge base under .atis/, which ignores itself in git.
https://github.com/robmclarty/atis
`;
