# Changelog

## v0.2.0 — 2026-11-21

Initial release: atis draws a repository as a map and a change as the weather over it.

### Added

- `atis` on a branch builds a map of the change and opens it in a local tab: packages, modules and files laid out by import depth, with what changed, how far it reaches and what evidence covers it.
- A flight category for every change (VFR, MVFR, IFR, LIFR or NOINST), a row of grade blocks, and at most six ranked notices saying where to look first.
- One lit surface to pan and zoom: a click selects a module or a file, a selected module opens in place, and names and function granules appear by their size on the screen.
- An inspector beside the map with a module's facts, files, exports and wiring, and a file's facts, diff and code, read-only; a folder tree that points at the map and is pointed at by it.
- Evidence read from checkride's `.check/`: patch coverage, surviving mutants, red checks and the change in health. A repository with no checks still reads, as structure only.
- Where a file's risk sits: untested lines and live mutants marked in its code, on a strip of its lines to scale, and as lit functions on the map; the file's plate on request.
- Dependency health on the opening frame: each outside package a star coloured by its advisories, a `Deps` block, and a mark on every file that imports a seriously advised package.
- An approved shape: `atis approve` records one, and later maps show their departures from it.
- Live review with `--working-tree --watch`, which follows uncommitted edits in the open tab.
- Whole-repository maps with `--whole-repo` and nine overlays, among them trouble spots, coverage gaps, dead code, cycles and advisories; a range of commits steps through its weather one commit at a time.
- A still image with `--svg` and `--png`, and `--comment` to post the grades, notices and image to a pull request.
- `atis reach` to ask what a change to named files would reach before making it, and `atis mcp` so a coding agent can ask the same and point the tab at what it found.
- Readers for TypeScript and JavaScript, Python, Go, shell and Terraform.
- Maps of five thousand files and more, each package drawn as one body until the view nears it.
