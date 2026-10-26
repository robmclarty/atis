# atis performance

What a run of atis costs, leg by leg, on this repository and on the precision corpus's
tuning repositories: the terrain cache that keeps a base's side between runs (D96, D137),
the bound the relaxed layout holds across bases (D97), the ground a change's map holds
where its base put it (D172), the per-source timings `--verbose` prints (D50), and a cached
run's first frame, timed from the command (D136, C14). The world's own budget from the
map's arrival, its frame rates and its first frame on a 5,000-file map, is in
[`design.md`](./design.md#the-worlds-budget).

Every number here was measured on 2026-10-26 on an Apple M1 Pro with 32 GB, macOS (Darwin
25.6.0), Node 24, and Chrome 155 at 1,440 by 900 on the laptop's display.

## The terrain cache

A base commit's side of a run is kept in `.atis/terrain/<merge-base>.json` under the
reviewed repository: the base tree's scan, what the scan read from each TypeScript file,
the history window at the base, and the base terrain's own layout. `.atis/.gitignore` holds
`*`, so the repository's own ignores are never touched. An entry is keyed beside its commit
by a hash of the code that builds a terrain (the directory atis runs from and core's,
tests and declarations left out, and the TypeScript version the scan runs on) and a hash
of the config and the history window, so changed code, a changed config or another
`--history` misses by itself. A wrong key or an entry that will not read is a miss, never
an error, and `--no-cache` measures the base afresh and keeps nothing. `--verbose` names
the hit or the miss, and why.

A run then reads only what its change touched over the cached base:

- the head is read from git's own objects rather than an extraction (D172): its files and
  directories are listed from the commit, the ones `export-ignore` leaves out of an
  archive left out here too, and only the files the diff names and the manifests are
  drawn out, by `git archive` of those files alone, so each holds the bytes an extraction
  would; every other file keeps the base's reads, and the head tree is linked as a full
  scan links it, so its scan is the full scan's (tests pin it on a commit with
  `export-ignore`, `export-subst`, a link, a committed `node_modules` and a path too long
  for a tar header, and on two consecutive commits of this repository);
- the history is the change's own commits on top of the cached window, capped at the
  window;
- the dependency delta reads only the manifests the diff touched, and nothing when it
  touched none;
- the base tree is extracted again only when the type checker has a changed interface
  file with an inferred name to read there (D118), and the head tree likewise.

An entry is 0.5 MB on `inspector`'s 164 files and 11.5 MB on `actual`'s 4,207.

Beside the terrains, `.atis/structure/<sha>.json` keeps what the reviewed repository's own
fallow measured of one commit: its `health`, `dupes` and `dead-code` reports, read by the
parsers `.check/` is read by (D98). The base's is read on the runs its terrain is, and the
head's is kept per head commit, so a second run on one change runs fallow on neither side
(D136). An entry is keyed by the code key and the version of the repository's fallow, so
a moved pin measures both sides again over the terrain as it was, and an entry with an
analysis fallow could not read is never kept. On this repository, measuring a side costs
0.9 to 1.0 s (three fallow runs on its extraction), and reading it back 1 ms.
`.atis/entries/<sha>.json` keeps, under the same key, the entry points that fallow listed
for a head commit, so the head's scan never extracts the head for fallow on a second run
either.

## The relayout's bound

A base the cache has not seen is laid out relaxed from the nearest ancestor the cache
holds (D97). On step 112's commit of this repository and step 113's after it, fourteen
files apart, the files neither changed move by these means from the first commit's layout
to the second's:

| the second commit laid out | mean displacement of unchanged files |
| --- | --- |
| relaxed from the first | 1.7 |
| from nothing | 8.6 |

The test pins the bound between them at 4, in the field's units.

## The ground a change holds

The map of a change does not relax from its base's own layout: it holds it (D172). A file
the change did not add or rename, in the same cell under the same cells, on the same
terrace at the same size, stands exactly where the base put it, edited or not, since the
terrain is the base's (D32). Every other file is placed as the second pass places an added
one, around the held files of its lane and inside the room the base's lane kept; a lane
the base never had stands after its last. A new shore mark takes the next free place of
its group's block, as low as its row of blocks reaches and one row into the gap below, and
what the block cannot take stands at the end of the row, widening the field rather than
pushing the terraces down. The terraces are the base's.

A skin is cut from its members' places and every other file's within its reach, so a
skin whose members are the ones it held, with nothing placed or vacated within its reach,
is the base's skin, kept uncut; that includes a skin the base could not cut a ring for,
which stays without one. Every other skin is cut again, and the tests pin the result equal
to cutting every skin over the held field.

A change the base's field cannot hold relaxes from it instead: one that deepens the abyss
past the seven terraces a map draws, so a terrace spans other depths, or one that brings
the first shore file to a base with none. On every corpus change measured below the
ground held, and only the change's added files were placed: two of `actual`'s 3,939 places
and five of its 283 skins changed. A run with nothing kept holds the same cold base, so
`--no-cache`, a first run and a cached run draw one map.

## What each source costs

Each repository was run twice against its fixture's base, this one against `HEAD~1`: once
on a cache its code no longer keyed (a miss) and once on what that run kept (a hit). The
corpus worktrees hold no `node_modules` and no `.check/`, so their entry points come from
the manifests and their maps are NOINST; this repository's run has both. Milliseconds,
from `--verbose`; `wall` is the whole command.

| repository | files | commits | run | scan base | log base | layout base | scan head | shapes base | build | wall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| atis | 384 | 141 | miss | 1,036 | 1,194 | 167 | 507 | 266 | 26 | 5,309 |
| | | | hit | | | | 225 | 609 | 34 | 1,767 |
| inspector | 164 | 1,820 | miss | 387 | 365 | 107 | 90 | 301 | 67 | 1,921 |
| | | | hit | | | | 178 | 408 | 87 | 1,265 |
| changesets | 291 | 810 | miss | 386 | 406 | 103 | 85 | 259 | 72 | 2,028 |
| | | | hit | | | | 161 | 392 | 90 | 1,364 |
| discord.js | 1,313 | 8,407 | miss | 1,267 | 3,198 | 569 | 113 | 221 | 417 | 6,760 |
| | | | hit | | | | 204 | 514 | 408 | 2,108 |
| mermaid | 1,172 | 13,910 | miss | 1,187 | 2,191 | 703 | 143 | 534 | 172 | 6,114 |
| | | | hit | | | | 264 | 796 | 194 | 2,448 |
| matrix-js-sdk | 466 | 10,726 | miss | 1,198 | 3,360 | 623 | 170 | 725 | 44 | 7,254 |
| | | | hit | | | | 287 | 917 | 50 | 2,379 |
| actual | 4,207 | 5,472 | miss | 4,466 | 4,766 | 5,897 | 184 | 0 | 868 | 17,085 |
| | | | hit | | | | 302 | 0 | 937 | 1,756 |

The diff costs about 90 ms everywhere, the change's own log about 25 ms, and the cache's
read up to 60 ms on `actual`. A head scan on a hit pays about 120 ms the miss does not,
warming the compiler for the touched files' declarations, which the base's scan has
already done on a miss. This repository's miss lists the head's entry points with fallow
on an extraction of the head, which its hit reads back.

Four repositories' `git log` passes two seconds over the 5,000-commit window, all of them
on a miss alone, since a hit reads only the change's commits. So `--history <n>` landed
(D50): it reads the newest `n` commits instead, and the window stays 5,000 unless it is
given.

## What changed to get here

- **The membranes.** Each cell's skin was cut against every file on the field, and the
  Bubble Sets library tests every pair of a skin's members against every one of them as it
  routes the ways between them. On `actual` that was 91 s of a 99 s layout. A skin is now
  cut against the files within its region's reach alone, and every skin of `actual`, of
  the demo map and of every golden came out byte for byte as before; the layout takes 6 s.
- **Reach for the evidence.** Each changed file's cells reached, D27's *high reach*, was a
  whole reach walk per changed file; it is now one walk of each graph for the change,
  equal on the demo inputs and on a forty-file chain.
- **The head's scan, the history and the manifests**, as the cache section says.
- **The held ground.** A change's map laid every lane out again from its base's layout
  and cut every skin again: 5.1 s of `actual`'s build. Holding the ground it left alone
  and cutting only the skins near what it placed takes 0.9 s, of which 0.3 s is the docs
  group's skin, which the change's release note joins. Every cell's fan in and out is now
  counted on one walk of the graph, and each part of a lane outlined once rather than once
  per file.
- **The head read from git.** Extracting the head tree and removing it again was 1.3 s
  of `actual`'s head scan; listing it and drawing out the files the diff names is 0.3 s.

On `actual`, a cached run went from 95 s to 8.1 s at step 50, and to 1.8 s now.

## A cached run's first frame

`apps/web/scripts/first-frame.ts` times it. With Chrome already running and its page open,
it fills a repository's cache with one untimed run, then times a served run per backend
from the command: until it serves, until the map arrives in the page, and until the page's
`atis:ready` mark, raised once the first complete frame is on the screen (D105). The page is
driven to the served URL, so a platform opener's hand-off is no part of it.

```sh
pnpm build && node apps/web/scripts/first-frame.ts [repo=base ...]
```

| repository | backend | served | map arrived | first frame | after the map |
| --- | --- | --- | --- | --- | --- |
| atis, against `HEAD~1` | WebGPU | 1.90 s | 2.02 s | 2.22 s | 0.21 s |
| | WebGL 2 | 1.94 s | 2.02 s | 2.28 s | 0.26 s |
| actual, against its fixture's base | WebGPU | 1.71 s | 1.81 s | 2.93 s | 1.12 s |
| | WebGL 2 | 1.81 s | 1.92 s | 3.03 s | 1.11 s |

At step 50 `actual` drew its first frame 11.18 s and 10.79 s after the command. It now
draws it about a second past the 2 s. Before the map, the command is about 0.25 s of
starting Node and loading the compiler, 0.2 s of the diff, the cache's read and the log,
0.3 s of the head's scan and 0.9 s of the build. Of the build, 0.3 s is the docs group's
skin, which no renderer draws since the shore moved to a rail (D153), and 0.2 s is placing
the one added file, the second pass's forces over its lane. After the map, the world's own
first frame on 4,207 files takes 1.1 s, inside its budget from the map's arrival (C14).

This repository draws its first frame a little over 2 s after the command. Its change
against `HEAD~1` edits interface files whose names only the checker can print, so 1.1 s
of its 1.9 s before serving is the checker's, extracting both commits and reading the
changed files' programs there (D118).
