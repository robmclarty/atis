/**
 * atis: a weather map for code changes.
 *
 * The package's surface: the constants the command prints, `run`, which turns
 * a parsed set of flags into `map.json` on disk, `pngRun`, which captures the
 * world beside it as a PNG (D105), `serveRun`, which serves the world instead
 * (D92), `serve`, the loopback server beneath both, and `fingerprintRun`,
 * which writes the terrain alone for a README (D107).
 */

import { SCHEMA_VERSION } from 'core';

export * from './png.js';
export * from './run.js';
export * from './serve.js';

export const NAME = 'atis';
export const VERSION = '0.0.0';

export const USAGE = `${NAME} ${VERSION}: a weather map for code changes.

  atis [--base <ref> | --last-commit | --last-tag]
       [--head <ref> | --working-tree] [options]
  atis --range <from>..<to> [options]
  atis --whole-repo [--head <ref>] [options]
  atis fingerprint --out <svg> [--repo <path>] [--head <ref>]

With no --out, --svg or --png, atis serves the world on 127.0.0.1 at a port of
its own, opens it in a tab, and runs until interrupted.

atis fingerprint writes the terrain alone, no weather and no notices, as a
480 x 300 SVG for a README: the whole repository at the head (HEAD unless
--head names another), measured afresh, the same bytes for one commit.

  --repo <path>   the repository to read (default: the working directory)
  --base <ref>    the ref the change is measured from (default: the trunk, the
                  trunk atis.config.json names, else the first of main, master,
                  develop and trunk, each local and then on origin/)
  --last-commit   measure from the head's parent, HEAD~1
  --last-tag      measure from the newest tag the head reaches
  --head <ref>    map the change at <ref> rather than at HEAD; .check/ is read
                  only for the checked-out HEAD, so another head is git-only
  --range <from>..<to>
                  map <to>'s change over <from>, with a weather frame for each
                  commit between, oldest first, over the one terrain; only the
                  frame of the checked-out HEAD reads .check/
  --working-tree  map the change in the working tree, staged, unstaged and
                  untracked, rather than at HEAD, with .check/ as its evidence;
                  with --base HEAD it is the uncommitted change alone. The
                  same inputs write the same map only on a clean tree: a dirty
                  one maps what it holds at the moment it is read
  --whole-repo    map the whole repository at the head rather than a change:
                  no weather, and overlays of its trouble spots, ugly spots,
                  coverage gaps, dead code, duplication, cycles, recent heat
                  and the findings a committed checkride.baseline.json
                  grandfathers; an overlay whose source is missing says why
  --overlay <name>
                  the one overlay --svg draws of the whole repo: trouble-spots
                  (the default), ugly-spots, coverage-gaps, dead-code,
                  duplication, cycles, recent-heat or baselined
  --out <file>    write the map to <file> and exit (default with --svg or
                  --png: map.json)
  --svg <file>    render the map as a static SVG at <file> and exit
  --png <file>    capture the world as a PNG at <file> and exit, drawn headless
                  at 1280 x 800 with motion stilled, in the installed Chrome,
                  else a Chromium on the PATH, else the one
                  \`npx playwright-core install chromium\` installs
  --open          open the rendered SVG in the platform viewer (needs --svg)
  --no-open       serve without opening the tab
  --watch         keep serving the world and, when HEAD, the index or
                  .check/summary.json changes, rebuild the map and push its
                  weather to the open tab over the terrain it already shows
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
