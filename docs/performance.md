# atis performance

What a run of atis costs, leg by leg, on this repository and on the precision corpus's
tuning repositories: the terrain cache that keeps a base's side between runs (D96, D137),
the bound the relaxed layout holds across bases (D97), the per-source timings `--verbose`
prints (D50), and a cached run's first frame, timed from the command (D136, C14). The
world's own budget from the map's arrival, its frame rates and its first frame on a
5,000-file map, is in [`design.md`](./design.md#the-worlds-budget).

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

- the head's scan reads the files the diff names and keeps every other file's reads, then
  links the head tree as a full scan does, so its scan is the full scan's (a test pins it,
  on a tree of strings and on two consecutive commits of this repository);
- the history is the change's own commits on top of the cached window, capped at the
  window;
- the dependency delta reads only the manifests the diff touched, and nothing when it
  touched none;
- the base tree is extracted again only when the type checker has a changed interface
  file with an inferred name to read there (D118).

An entry is 0.5 MB on `inspector`'s 164 files and 11.5 MB on `actual`'s 4,207.

Beside the terrains, `.atis/structure/<sha>.json` keeps what the reviewed repository's own
fallow measured of one commit: its `health`, `dupes` and `dead-code` reports, read by the
parsers `.check/` is read by (D98). The base's is read on the runs its terrain is, and the
head's is kept per head commit, so a second run on one change runs fallow on neither side
(D136). An entry is keyed by the code key and the version of the repository's fallow, so
a moved pin measures both sides again over the terrain as it was, and an entry with an
analysis fallow could not read is never kept. On this repository, measuring a side costs
0.9 to 1.0 s (three fallow runs on its extraction), and reading it back 1 ms.

## The relayout's bound

A base the cache has not seen is laid out relaxed from the nearest ancestor the cache
holds, and the map of a change relaxes from its base's own layout (D97). On step 112's
commit of this repository and step 113's after it, fourteen files apart, the files neither
changed move by these means from the first commit's layout to the second's:

| the second commit laid out | mean displacement of unchanged files |
| --- | --- |
| relaxed from the first | 1.7 |
| from nothing | 8.6 |

The test pins the bound between them at 4, in the field's units.

## What each source costs

Each repository was run twice against its fixture's base: once on an empty cache (a miss)
and once on what that run kept (a hit). The corpus worktrees hold no `node_modules` and no
`.check/`, so their entry points come from the manifests and their maps are NOINST; this
repository's run has both. Milliseconds, from `--verbose`; `wall` is the whole command.

| repository | files | commits | run | scan base | log base | layout base | scan head | shapes base | build | wall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| atis | 376 | 137 | miss | 1,220 | 1,735 | 218 | 538 | 0 | 135 | |
| | | | hit | | | | 695 | 0 | 184 | |
| inspector | 164 | 1,820 | miss | 487 | 490 | 134 | 112 | 368 | 155 | 2,410 |
| | | | hit | | | | 208 | 494 | 192 | 1,513 |
| changesets | 291 | 810 | miss | 476 | 468 | 131 | 130 | 320 | 162 | 2,449 |
| | | | hit | | | | 212 | 473 | 158 | 1,588 |
| discord.js | 1,313 | 8,407 | miss | 1,567 | 3,818 | 650 | 353 | 262 | 906 | 8,402 |
| | | | hit | | | | 452 | 587 | 953 | 2,840 |
| mermaid | 1,172 | 13,910 | miss | 1,557 | 2,687 | 788 | 389 | 628 | 737 | 7,918 |
| | | | hit | | | | 549 | 1,005 | 741 | 3,393 |
| matrix-js-sdk | 466 | 10,726 | miss | 1,503 | 3,906 | 680 | 282 | 863 | 510 | 8,916 |
| | | | hit | | | | 463 | 1,203 | 534 | 3,412 |
| actual | 4,207 | 5,472 | miss | 5,893 | 6,040 | 6,591 | 1,400 | 0 | 5,446 | 26,775 |
| | | | hit | | | | 1,433 | 0 | 5,688 | 8,131 |

The diff costs about 90 ms everywhere, the change's own log about 30 ms, and the cache's
read up to 71 ms on `actual`.

Four repositories' `git log` passes two seconds over the 5,000-commit window, all of them
on a miss alone, since a hit reads only the change's commits. So `--history <n>` landed
(D50): it reads the newest `n` commits instead, and the window stays 5,000 unless it is
given.

## What changed to get here

- **The membranes.** Each cell's skin was cut against every file on the field, and the
  Bubble Sets library tests every pair of a skin's members against every one of them as it
  routes the ways between them. On `actual` that was 91 s of a 99 s layout. A skin is now
  cut against the files within its region's reach alone, and every skin of `actual`, of
  the demo map and of every golden came out byte for byte as before; the layout takes 6.4 s.
- **Reach for the evidence.** Each changed file's cells reached, D27's *high reach*, was a
  whole reach walk per changed file; it is now one walk of each graph for the change,
  equal on the demo inputs and on a forty-file chain.
- **The head's scan, the history and the manifests**, as the cache section says.

On `actual`, a cached run went from 95 s to 8.1 s.

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
| atis, against `HEAD~1` | WebGPU | 1.37 s | 1.46 s | 1.72 s | 0.26 s |
| | WebGL 2 | 1.86 s | 1.94 s | 2.24 s | 0.29 s |
| actual, against its fixture's base | WebGPU | 9.65 s | 9.76 s | 11.18 s | 1.42 s |
| | WebGL 2 | 9.36 s | 9.51 s | 10.79 s | 1.28 s |

A first run of the script on a machine whose browser had not drawn the world yet took
2.86 s and 2.76 s on this repository, 1.34 s and 0.89 s of it after the map arrived.

This repository draws its first frame about 2 s after the command, a little over on WebGL
2 (D150). `actual` does not: 6.8 s of its 9.7 s before serving is the map's build, which
lays every lane out again from the base's layout and cuts every skin again, and 1.7 s is
the head's scan, which extracts the whole head tree and links it, though it reads only
the files the diff touched.
