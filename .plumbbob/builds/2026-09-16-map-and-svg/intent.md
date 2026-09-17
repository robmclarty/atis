# atis phases 0 and 1: the map.json spike and the static SVG

**Phase:** framed, awaiting approval
**Size:** medium
**Scope:** core

*Source: `SPEC.md` (draft v0.2, 2026-09-16), absorbed by `/plumbbob:plan`; this build is its §12 phase 0 (scaffold and the `map.json` spike) plus phase 1 (static SVG and glance-test round one), folded in at Rob's direction. The sections this build is cut from are preserved verbatim under [Source](#source) at the end of this file. The sections it does not touch (§1–2, §5.5 motion, §8 bases, §15 technology) stay in `SPEC.md` at the repo root, tracked since the baseline commit.*

## Frame

- **Problem:** Reviewers cannot see a change; they can only read it, and reading no longer keeps up with generated code. Git, checkride's `.check/` and fallow already know what changed, what it reaches, what evidence covers it and which rules it breaks, but none of that is visible at a glance and no tool fuses the three into one picture.
- **Smallest thing that solves it (this build):** a pnpm workspace with a pure `libs/core`, a pure string renderer `libs/svg`, and the CLI `apps/atis`. First, `atis --repo <path> --base <ref> --out map.json` reads git, `.check/` and a TypeScript import scan and writes a versioned `map.json`: terrain (cells, organelles, depth bands, history, a seeded layout with Bubble Set membranes), weather (changed set, reach by module hop, evidence, flight category) and at most six ranked notices. Then `--svg` renders that file as one still image of the whole-repo map: field, terraces, membranes, weather, six labelled notices and the HUD grade blocks. Five historical PRs get rendered into `fixtures/` and glance-tested once against §11.
- **Done looks like:** the phase-0 spot-check passes on checkride PR 4 (changed set, reach, patch coverage and top-three notices each verified by hand against git, fallow and `coverage-final.json`); `atis --svg` renders five historical PRs into `fixtures/<repo>-pr<n>/`; and `docs/glance-test.md` records glance-test round one: pass, or the list of encodings to change, which `/plumbbob:refine` turns into further steps. `pnpm check` green at every checkpoint.
- **Explicitly NOT doing:** three.js, the 2.5D world, motion, zoom and LOD transitions (phase 2; the SVG is still and shows the whole map, never the inside of a cell); the three elevation scales (relief is phase 2's material); the phase 1b materials spike (a `/plumbbob:spike` at any boundary, thrown away by design); serving, a browser tab beyond `--open`, watch mode, PNG, PR comment (phases 2 and 4); base-side metrics, so no health Δ, no "newly breached", no "introduced", an empty `improvements` and a muted Health Δ block (they need `.check/` at the base, phase 3); the terrain cache and incremental relayout (phase 3; see [D37 (no-terrain-cache-yet)](#d37)); trunk auto-detect, `--range` sequences, working-tree mode, whole-repo overlays (phase 3); symbol-level reach, MCP, annotators, languages beyond TypeScript (phase 5); glance-test rounds after the first (each fail is a `/plumbbob:refine`); publishing the npm stub, `@robmclarty/atis` (Rob does it by hand with pnpm before step 1, never a step: [D53 (pnpm-and-stub)](#d53)).

## Architecture sketch

```
repo under review                                  atis workspace
─────────────────                                  ──────────────────────────────────────────────────
git archive <merge_base>  ─► temp dir ─┐
                                        ├─ scan ──►  apps/atis/src/sources/imports.ts   (terrain: base tree)
git archive HEAD          ─► temp dir ─┘                                                (weather: head tree)
git  ── diff / numstat / log ────────────────────►  apps/atis/src/sources/git.ts
.check/ (working tree) ──────────────────────────►  apps/atis/src/sources/check.ts
                                                                  │
                                                                  ▼
                              libs/core  (pure: no fs, no Node, no DOM; d3-force + bubblesets-js)
                              modules ─► depth ─► history ─► layout ─► reach ─► evidence ─► notices ─► buildMap
                                                                  │
                                                                  ▼
                              map.json  { meta, terrain(+layout), weather, notices[≤6] }   schema_version 1
                                                                  │
                              libs/svg  renderSvg(map): string  ──►  atis.svg   (this build: still, whole map)
                              phase 2: three.js app reads the same file
```

`map.json` shape for this build (types in `libs/core/src/schema.ts`; a `?` key is absent when its source is missing, never faked):

```text
meta       { schema_version: 1, generated_at, repo, base, head, merge_base, mode: "change", instruments{ mode: "check" | "git-only", reason?, fallow_schemas?{ health, dead, dupes }, stale?[] } }
terrain    { cells[], organelles[], bands[], groups[], edges_exceptional[], history, layout? }
  cells[]         { id, path, kind: package|folder|single|directory, parent?, barrel?, organelles[], band,
                    interface_size, body_loc, function_count?, fan_in?, fan_out?, dents[], clone_family? }
  organelles[]    { id, path, cell, band, reachable, loc, function_count?, dents[], churn_ratio?, age_days?, bugfix_rate?, clone_family? }   // id = head path; a deleted file keeps its base path (D40)
  bands[]         { index, depth_min, depth_max }                                 // at most 7
  groups[]        { id, files[] }   // the shore: ids from the rule table of D48; default docs|prompts|config|settings|deps|ci|scripts|examples|assets|data|other
  edges_exceptional[] { from, to, kind: cycle | boundary | new-cross-module }
  history         { window_commits, cochange[ { a, b, rate, support } ] }
  layout          { width, height, shore{ y0, y1 }, bands[ { index, y0, y1 } ], positions{ path: { x, y, r } }, contours{ cell_or_group: [ [x, y], … ] } }
weather    { changed[], reach[], evidence, checks, ghosts[], deps_added[], improvements: [] }
  changed[]       { path, kind: added|modified|deleted|renamed, from?, cell?, group?, is_barrel, added, deleted, hunks[ { start, count } ] }   // exactly one of cell, group (D48)
  reach[]         { path, cell, hops, via[] }                                      // via: interface files crossed, in order (D45)
  evidence        { patch_coverage?[ { path, changed_executable, covered, uncovered_lines[] } ],
                    mutants?[ { path, line, status } ], stitches?[ { test, targets[], status } ] }
  checks          { category: VFR|MVFR|IFR|LIFR|NOINST, checks_run, timestamp?, reason?, slots[ { name, ok, skipped, scope: "global" | paths[] } ] }
  ghosts[]        { path, with[], rate, support }
  deps_added[]    { manifest, name, range, dev }
notices[]  { tier: primary|secondary|tertiary, kind, target, why, inputs{}, thresholds{}, weight }   // 1 + 2 + 3
```

## Decisions

Settled by Rob in the spec (2026-09-16). Numbering and slugs are kept so the spec and this file cite the same anchors:

- <a id="d1"></a>**D1 (technology)**: three.js `WebGPURenderer` (WebGL 2 fallback) for the world, DOM for the chrome, TypeScript throughout, on npm beside checkride, *because* it is the only candidate where translucency, inner glow, relief, orthographic zoom, picking and headless capture are all first-class and the corpus is deep. Not exercised in this build.
- <a id="d2"></a>**D2 (layout)**: a pnpm workspace with a pure `core` (schema, depth, layout, notices; no DOM, no Node APIs), a `cli` (sources, cache, serve, export) and later an `app` (render), *because* the renderer must never read git or `.check/` and a package boundary enforces it.
- <a id="d3"></a>**D3 (gate)**: checkride is the gate (`pnpm check`); deep modules, no classes, named exports, tests in `__tests__/`, *because* dogfooding the contract atis consumes is the cheapest way to keep it honest.
- <a id="d4"></a>**D4 (tests-not-terrain)**: test files are evidence (stitches), never cells and never depth entry points, *because* they are entry points of their own and would flatten depth.
- <a id="d5"></a>**D5 (reach-by-module-hop)**: reach attenuates per membrane crossed, not per file hop, *because* the interface is where the reviewer reads.
- <a id="d6"></a>**D6 (flight-categories)**: the verdict scale is VFR / MVFR / IFR / LIFR (green / blue / red / magenta), *because* it is a category with a fixed meaning, not a score, and keeps checkride's aviation lineage.
- <a id="d7"></a>**D7 (no-people)**: no author merge rate, ownership grade or any per-person metric; the history miner never emits an author field, *because* of CHID's own warning (P9).
- <a id="d8"></a>**D8 (history-window)**: full history up to 5,000 commits, cached per base SHA in a later phase; bug-fix frequency from commit subjects matching `fix|bug|regression|hotfix`, marked heuristic, *because* PR labels are not available locally.
- <a id="d9"></a>**D9 (thresholds)**: reuse fallow's four thresholds and CHID's category ranges as defaults, all in one config, all echoed beside the notice they produced, *because* unexplained coefficients were the CHID participants' main complaint.
- <a id="d10"></a>**D10 (license)**: Apache-2.0, like checkride.
- <a id="d11"></a>**D11 (mood)**: satellite at night, revealed by zoom; in this build the still SVG is the far-and-surface frame of §5.6 in one image: near-black field, dim tissue, luminous only where it means something.
- <a id="d12"></a>**D12 (materials)**: organic, soft, translucent world with gradients; brutalist flat UI with technical-drawing annotations. The SVG honours the split: gradients and blur only under `#world`, none under `#chrome`.
- <a id="d13"></a>**D13 (geometry)**: depth terraces top-to-bottom (the abyss), cells as Bubble Sets straddling terraces, *because* a change at the bottom climbs every terrace on its way back up and the reviewer sees the ascent.
- <a id="d14"></a>**D14 (primary-motion)**: the primary notice breathes, flares once on load and at random after; no shake. Render-side, phase 2; the SVG is still.
- <a id="d16"></a>**D16 (surface)**: one continuous soft skin; cells are bulges in it. Phase 2's material; not exercised in this build.
- <a id="d17"></a>**D17 (name-and-path)**: `atis`, at `~/Projects/atis/code/atis`; renaming the folder is a one-line move if a different name wins.
- <a id="d18"></a>**D18 (delivery)**: v1 is a local command that opens a browser tab; static PNG/SVG for the PR arrives in phase 4. This build stops at `map.json` and a local `atis.svg` (with `--open` for the glance test).

Plan-time calls for this build (defaults that stand unless overruled):

- <a id="d19"></a>**D19 (packages)**: `checkride init --shape monorepo` scaffolds `libs/core` (package `core`) and `apps/atis` (package `atis`); `apps/atis` *is* the `cli` of [D2 (layout)](#d2), *because* the published `atis` command is the package a user runs; `libs/svg` joins in step 17 ([D33 (svg-package)](#d33)); the render app lands as `apps/web` in phase 2.
- <a id="d20"></a>**D20 (workspace-exports)**: each lib exports `./dist/index.js` (`default`, `types`) and `./src/index.ts` under a `source` condition that `vitest.config.ts` and the import scan resolve; the CLI runs from `dist/` after `pnpm build`, *because* Node cannot rewrite the `.js` specifiers checkride's `require-js-extension` rule demands, and tests should not need a build.
- <a id="d21"></a>**D21 (import-graph)**: the import graph comes from a TypeScript compiler API scan in the CLI (`ts.resolveModuleName` per specifier, NodeNext), not from a per-file `fallow --trace-file` loop, *because* one process over 120 files beats 120 fallow spawns, and the same graph feeds depth, layout, reach, stitches and deleted-export consumers.
- <a id="d22"></a>**D22 (local-fallow)**: every fallow call uses the workspace-pinned binary (`pnpm exec fallow`, 3.22.0 from the scaffold), never the global one (2.56.0 on this machine, which has no `--impact-closure`), *because* the global 2.56.0 lacks `--impact-closure`, every fallow the reviewed repos pin (3.9.1 at checkride PR 4, 3.22.0 today) has it, and the reviewed repo's own pin is the one whose numbers its `.check/` carries.
- <a id="d23"></a>**D23 (head-only-check)**: `.check/` is read at head only; the two notice kinds that need a base ("threshold newly breached", "boundary or cycle introduced") are computed as "present at head and touching a changed file" and say so in their `why`; `improvements` stays empty and the HUD's Health Δ block is muted, *because* base-side metrics need the terrain cache of §8 (phase 3) and neither the phase-0 done-when nor the glance test asks for deltas.
- <a id="d24"></a>**D24 (layout-in-core)**: `terrain.layout` is computed by core's `buildMap` from step 15 on (positions from a seeded d3-force within bands, contours from `bubblesets-js`) and is absent before that; `assertMap` accepts both, the SVG renderer requires it, *because* [D2 (layout)](#d2) puts layout in core, and a renderer that computes positions would break P2 (every renderer must draw the same terrain).
- <a id="d25"></a>**D25 (base-semantics)**: `--base <ref>` is required in this build and the diff is `merge-base(ref, head)..head`, the way GitHub shows a PR, *because* a stale branch must not show trunk's own commits as weather. Trunk auto-detect and the other bases of §8 are phase 3.
- <a id="d26"></a>**D26 (unreachable-files)**: a non-test file with no path from any entry point sits in the deepest band with `reachable: false`, *because* nothing above reaches it, dead code lives at the bottom of the abyss, and hiding it would fake a channel (P8).
- <a id="d27"></a>**D27 (category-defaults)**: the words in §5.3 get starting numbers, all in the config of [D9 (thresholds)](#d9): a *gap* is a changed file with any uncovered changed executable line; an *escaped interface* is a changed barrel whose exports are consumed outside its cell; *high reach* is a changed file whose reach touches ≥ 3 cells; LIFR also fires on `checks_run: 0` (vacuous green) or an unreadable `summary.json` (harness broken); a missing `.check/` is NOINST, never green, *because* the spec names the categories but not the numbers, and the glance test (step 23) is where they first meet evidence.
- <a id="d28"></a>**D28 (config-file)**: weights and thresholds live in `libs/core/src/config.ts` as defaults and may be overridden by an optional `atis.config.json` at the reviewed repo's root; every notice carries the numbers that produced it, *because* of [D9 (thresholds)](#d9).
- <a id="d29"></a>**D29 (spike-target)**: the spike renders checkride PR 4 (`fix(pm): resolve a slot's tool locally`, base `fee5ed6`, head `ae5078c`, merge `07d95bb`, 11 files, +473 −21), *because* it changes a barrel (`src/pm/index.ts`), adds a module file (`src/pm/tools.ts`), touches two consumers (`doctor.ts`, `orchestrator.ts`) and has tests, so reach, evidence and the interface-change notice all get exercised; PR 5 (merge `0ae85a6`) is the spare.
- <a id="d30"></a>**D30 (pure-parsers)**: each CLI source splits into a thin runner that shells out (git, fs) and a pure parser (text → struct) tested from fixture strings; the history *math* (churn ratio, age, bug-fix rate, co-change) lives in `libs/core`, *because* tests should not need a throwaway git repo and the metrics belong to terrain.
- <a id="d31"></a>**D31 (no-hooks-yet)**: the scaffold runs with `--no-hook`, so checkride's Claude stop-gate, dirty and protect hooks are not installed in this build, *because* plumbbob's checkpoint already gates on `pnpm check` and two gates per turn would fight; `checkride agent-setup` adds them in one command later.
- <a id="d32"></a>**D32 (terrain-from-base)**: the terrain (files, cells, depth, layout) is scanned from the merge-base tree, extracted with `git archive <merge_base> | tar -x` into a temp dir; the weather is scanned from a second extraction of `HEAD` ([D46 (head-is-a-commit)](#d46)); added files get a place by a second layout pass with base positions fixed; deleted and renamed files keep their base position, *because* §5.1 takes terrain from the base ref, P2 says weather never moves it, and a deleted file's outline needs a position only the base knows.
- <a id="d33"></a>**D33 (svg-package)**: the static renderer is a third workspace package, `libs/svg`, a pure `renderSvg(map): string` with no DOM and no `d3-selection`, consumed by `apps/atis` for `--svg`, *because* a renderer that reads only `map.json` stays swappable (§9.2), and a string renderer golden-tests from fixtures.
- <a id="d34"></a>**D34 (layout-deps)**: `d3-force` (seeded through `randomSource`, advanced by `tick(n)`, never the timer) and `bubblesets-js` join `libs/core`; `earcut` and `elkjs` wait for their LOD, *because* both are pure computation and [C3 (deterministic)](#c3) needs a seed, not a cache.
- <a id="d35"></a>**D35 (static-encodings)**: the SVG carries every channel of §5.1–5.4 that a flat, still image can (position, size, shape dents, hue, luminance as glow by hop, texture as patterns, repetition as glyphs, drawn exceptional edges, membrane integrity, stitches, storm markers, ghosts, labels, HUD) and leaves out the three elevation scales, motion and zoom, *because* those are relief and time, which phase 2's 2.5D world owns, and the glance test judges the encodings, not the material.
- <a id="d36"></a>**D36 (glance-fixtures)**: five merged PRs with known ground truth, generated by the step-14 worktree procedure into `fixtures/<repo>-pr<n>/` (`map.json`, `atis.svg`, `README.md`, `truth.md`); the five are fixed in [D54 (glance-prs)](#d54); ground truth is Rob's, drafted by the builder from the follow-up commits per [D44 (ground-truth-source)](#d44), *because* §11 is the acceptance test and its ground truth cannot be invented.
- <a id="d37"></a>**D37 (no-terrain-cache-yet)**: no `.atis/terrain/<sha>.json` cache in this build; a fixed seed and sorted inputs make the same base give the same layout, *because* determinism buys the "same map for the same base" property the cache exists for, and incremental relayout across bases is phase 3's.
- <a id="d38"></a>**D38 (glance-is-a-step)**: glance-test round one is a step the human runs and the builder records; a fail does not fail the build, it parks the encodings to change and `/plumbbob:refine` turns them into steps, *because* §11 says fail means the encodings change, not the test.
- <a id="d39"></a>**D39 (two-graphs)**: `buildMap` takes the base scan and the head scan and each consumer names its graph: depth runs on the base edges plus every head edge touching an added file; reach walks head reverse edges for added, modified and renamed files and base reverse edges for deleted ones; deleted-export consumers are base importers of a name missing from the head `exports[]`; `new-cross-module` is a head edge between cells whose `(from, to)` pair is absent from the base edges, *because* [D32 (terrain-from-base)](#d32) splits the scans and four computations straddle the split, and "import line inside a hunk" also fires on an old import whose names were edited (resolves [Q8 (two-graphs)](#q8)).
- <a id="d40"></a>**D40 (rename-identity)**: `buildMap` rekeys the base terrain by the diff's renames before anything else runs, so every list in `map.json` is keyed by the head path; a deleted file keeps its base path, which no head file can own; an organelle's `id` is that path; a renamed file keeps its one base position under the new key and `changed[].from` carries the old path, which the SVG shows as a dashed outline labelled with it (the old-to-new leader of §5.2 needs two positions and waits for phase 3's relayout), *because* the base scan and the head scan know a renamed file by different names and `assertMap` joins positions to organelles by id (resolves [Q9 (rename-identity)](#q9)).
- <a id="d41"></a>**D41 (artifact-trust)**: `readCheck` trusts a `.check/` only through a `summary.json` with `schema_version: 1`; a missing, empty or pre-contract folder (weft, ridgeline and ts-check-scaffold carry summaries with no schema) is NOINST with a `reason`, and a summary that fails the schema-1 shape is `harness_broken` (LIFR); a raw file is read only when the slot that owns it appears in this run's `checks[]` and was not skipped, by a fixed slot-to-file table (`test` owns `test.json` and `coverage/`, `mutation` owns `mutation.json`, `health`, `dead`, `dupes` and `security` own their `.json`), never by `output_file`, which is `null` for `test` in every surveyed repo; on a live folder a file whose mtime predates the run window `[timestamp − total_duration_ms, ∞)` is stale by checkride's own `classifyFreshness` and its channel is muted with the age recorded, while a committed fixture carries no mtimes and skips the test; fallow's files are read by key with their `schema_version` recorded under `meta.instruments` and never rejected on the number (schema 7, 9 and 11 carry the keys step 8 reads; fallow 2.x's combined schema-3 report does not and mutes its channels), *because* checkride's own `.check/` holds a July `mutation.json` beside a September summary that lists no mutation slot, every surveyed public repo has undeclared `test.json` and `coverage/` files, and a summary is stamped seconds before the commit it gates, so "older than HEAD" would call every fresh run stale (resolves [Q10 (artifact-trust)](#q10)).
- <a id="d42"></a>**D42 (committed-files-vs-gate)**: no `.ts` fixture tree is committed: the import-scan test writes its tree into a `mkdtemp` directory from strings; the `.check/` fixture's `coverage/` directory is freed from the scaffold's `.gitignore` with `!apps/atis/fixtures/**/coverage/`; `.plumbbob/**` is added to the markdownlint ignores, *because* fallow's `unused-files`, oxlint's type-aware rules and the `docs` slot all reach files the plan meant as inert, and the scaffold's `coverage/` ignore would drop the fixture from the checkpoint commit (resolves [Q11 (committed-files-vs-gate)](#q11)).
- <a id="d43"></a>**D43 (scan-roots)**: the file universe is git's, not a directory convention: terrain candidates are every tracked `.ts` and `.tsx` file in the commit being scanned (the archive *is* that list), the changed set is git's diff, and neither depends on checkride or fallow being present; workspace members from `pnpm-workspace.yaml` globs (else the root alone) become `kind: package` cells, so fascicle's `examples/pr-improve` and weft's `packages/core` are cells; entry points are fallow's list, when the reviewed repo has a local fallow, unioned with every member's `bin`, `main` and `exports` targets; fallow's `ignorePatterns` are not applied, *because* atis draws what git and pnpm see, checkride is a source of signal and not the definition of a repo, and the fixture repos are shaped every way at once (fascicle under `examples/`, weft and paceline under `packages/*`, ts-check-scaffold under `apps/*` and `libs/*`) (resolves [Q12 (scan-roots)](#q12)).
- <a id="d44"></a>**D44 (ground-truth-source)**: ground truth is what broke after plus Rob's recollection: for each fixture PR the builder lists every later commit that touches the PR's files within the next thirty, with subject and stat, each as a `needs Rob` line in `truth.md`; Rob confirms, edits or adds the reason before step 23; a PR with no follow-up and no recollection is recorded as calm (merge, no reason); fixture READMEs cite local merge SHAs beside GitHub numbers, *because* checkride's four merged PRs and all but one of fascicle's carry no review comments or reviews, weft has no PRs, and fascicle's GitHub merge SHAs are absent from its rewritten local history (resolves [Q13 (ground-truth-source)](#q13)).
- <a id="d45"></a>**D45 (nested-cells)**: a hop is an edge whose endpoints lie in different innermost cells; `via` records the file the edge lands on in the target cell, the barrel when there is one and otherwise the imported file itself, which is by definition on that cell's interface; a package cell is a contour around all of its descendants, with its barrel (when it has one) as its only direct organelle, and is never a hop of its own, *because* leaving `libs/core` through `src/index.ts` should cost what leaving `pm/` costs, and not every project organises by barrels, so nothing may depend on a barrel existing (resolves [Q14 (nested-cells)](#q14)).
- <a id="d46"></a>**D46 (head-is-a-commit)**: the diff is `merge_base..HEAD` and the head scan reads a second `git archive HEAD` extraction; the working tree is read only for `.check/`; uncommitted weather is §8's phase-3 mode, *because* both sides of the map must describe commits for `meta.head` to be true and for [C3 (deterministic)](#c3) to hold on a dirty tree; amends [D32 (terrain-from-base)](#d32) (resolves [Q15 (head-is-working-tree)](#q15)).
- <a id="d47"></a>**D47 (dependency-delta)**: the git source reads every workspace manifest at the merge-base (`git show <sha>:<path>`) and at `HEAD`, and a pure `diffManifests` returns `deps_added[{ manifest, name, range, dev }]` that `buildMap` receives, *because* the "new dependency" candidate of §5.4 needs a parsed manifest delta and no other step produced one (resolves [Q16 (dependency-delta)](#q16)).
- <a id="d48"></a>**D48 (shore-groups)**: every tracked file outside the terrain belongs to exactly one *shore group* by a first-match rule table in the config of [D28 (config-file)](#d28), whose defaults are `docs` (`*.md`, `docs/**`, `research/**`, `.plumbbob/**`, `LICENSE`), `prompts` (`AGENTS.md`, `CLAUDE.md`, `.claude/**`, `.cursor/**`, `skills/**`, `prompts/**`), `config` (`tsconfig*`, `*.config.*`, `fallow.toml`, `sgconfig.yml`, `rules/**`, `cspell.json`, `.markdownlint*`, `.oxlintrc*`, `.vale/**`), `settings` (`.npmrc`, `.editorconfig`, `.gitignore`, `.gitattributes`, `.vscode/**`, `.env.example`), `deps` (`package.json`, `pnpm-workspace.yaml`, lockfiles), `ci` (`.github/**`, `Dockerfile`, `compose*.yaml`), `scripts` (`scripts/**`, `bin/**`, `*.sh`, `*.mjs`), `examples` (`examples/**` and `templates/**` not claimed by a workspace member), `assets` (`site/**`, images, fonts, `*.css`, `*.html`, `*.svg`), `data` (`fixtures/**`, `**/__fixtures__/**`, `schema/**`, `*.csv`, non-test files under `test/**`) and `other` last, which is loud rather than absorbent: when non-empty it is a HUD block and a tertiary notice naming the extensions, so the table grows instead of the dump; group ids are strings from the table, so renaming a group is a config edit and not a schema change; `terrain.groups[]` carries `{ id, files[] }`, a `changed[]` entry has exactly one of `cell` or `group`, and the SVG draws the shore as a strip above the entry-point terrace (land above the abyss), one small labelled contour per non-empty group, changed members stained by kind and never as organelles; changed test files stay stitches ([D4 (tests-not-terrain)](#d4)), *because* an "off the map" bucket becomes a dumping ground whenever a file does not line up (Rob, 2026-09-16), and a census of checkride, fascicle, weft and plumbbob puts the non-source mass in exactly these directories (resolves [Q7 (off-terrain-changes)](#q7)).
- <a id="d49"></a>**D49 (baseline-not-a-base)**: the merge-base is the only anchor in v1; checkride's committed baseline is the gate's memory of grandfathered findings, not a tree, and if it ever serves it is an overlay that draws baselined findings muted, never a base, *because* a base must be a commit the terrain can be scanned from. Not exercised in this build (resolves [Q1 (trunk-anchor)](#q1)).
- <a id="d50"></a>**D50 (history-measured)**: the history window stays at 5,000 commits; step 7's integration test records the `git log --numstat` wall time on this repo and the CLI prints per-source timings under `--verbose`; the first repo past about two seconds earns a `--history <n>` cap, and a background pass is built only after that, *because* the cost is unknown until a big repo shows up and a measurement beats a guess (resolves [Q2 (history-cost)](#q2)).
- <a id="d51"></a>**D51 (motion-tokens-shared)**: the motion constants of §5.5 live in `libs/svg/src/tokens.ts` beside the colour and chrome tokens from step 21 on, so the still renderer and phase 2's moving one read a single file, and Rob tunes them by hand as balance patches from the phase 1b spike onward, *because* a constant with two homes drifts; [Q3 (flare-and-jiggle-numbers)](#q3) stays open on purpose as the log of those patches.
- <a id="d52"></a>**D52 (reach-from-scan)**: reach is computed in core from the scanned graph (step 9, [D39 (two-graphs)](#d39)) and fallow's `--impact-closure` is the spot-check oracle of step 14 (set equality minus test files); §9.1's "reach muted without fallow" reads "reach muted without a TypeScript scan", *because* fallow's closure is a flat file list with no hop count and no membrane crossing, so the attenuation of [D5 (reach-by-module-hop)](#d5) cannot come from it (resolves [Q4 (reach-source)](#q4)).
- <a id="d53"></a>**D53 (pnpm-and-stub)**: pnpm is the package manager throughout (the workspace, `pnpm exec` for every tool, `pnpm publish` for releases; no npm or yarn commands in scripts or docs), and Rob publishes the stub by hand with pnpm before step 1 to hold the name; the registry refused the bare `atis` on 2026-09-16 (too similar to `atob`, `ansis`, `axios` and others), so the package is `@robmclarty/atis` and the command stays `atis`; publishing is never a build step, *because* the name was free on 2026-09-16 and nothing holds it until a stub exists, and [D17 (name-and-path)](#d17) and every path in this plan hang on it (resolves [Q5 (npm-stub)](#q5)).
- <a id="d54"></a>**D54 (glance-prs)**: the five fixture PRs are checkride 4, 5 and 2 and fascicle 4 and 5 (local merges `a3ef265` and `c7407b5`); spares are checkride 1, tiny-kit 1 and ridgeline's seven local merges; weft and ts-check-scaffold supply commit ranges only; other open-source projects are fair sources of shapes to replicate and test (workspace layouts, module conventions, repos with no `.check/`), read for their patterns and never their code, each cited with a row in `docs/inspiration.md` per §2, *because* one author's repos are one author's shape and the glance test must not overfit to it (resolves [Q6 (glance-prs)](#q6)).

## Constraints

- <a id="c1"></a>**C1 (core-is-pure)**: nothing under `libs/core/src` or `libs/svg/src` imports `node:*`, `fs`, `child_process`, `typescript` or touches the DOM; fallow's `libs → libs` boundary rule plus a struct rule enforce it ([D2 (layout)](#d2)).
- <a id="c2"></a>**C2 (never-fake)**: a missing source mutes its channel (an absent key, the `NOINST` category, a muted HUD block), never a default number (P8).
- <a id="c3"></a>**C3 (deterministic)**: the same inputs produce a byte-identical `map.json` (except `meta.generated_at`) and a byte-identical SVG; every list is sorted, every tie broken by path, every random source seeded.
- <a id="c4"></a>**C4 (never-blocks)**: the CLI exits 0 whenever it wrote its outputs, whatever the weather says; 2 on misuse or a broken input; never 1 for "bad weather" (P7: checkride gates, atis informs).
- <a id="c5"></a>**C5 (no-network)**: no network at runtime, no telemetry, no web fonts in the SVG (§10).
- <a id="c6"></a>**C6 (no-people)**: no author, email or ownership field anywhere in `map.json` or the SVG ([D7 (no-people)](#d7)).
- <a id="c7"></a>**C7 (budget)**: `notices` holds at most six, 1 primary + 2 secondary + 3 tertiary; when fewer candidates rank, fewer show, never padded (P1).
- <a id="c8"></a>**C8 (checkride-convention)**: `pnpm check` green at every checkpoint; folder modules with `index.ts` barrels, no classes, no default exports, `.js` import extensions, tests in `__tests__/` ([D3 (gate)](#d3)).
- <a id="c9"></a>**C9 (deps-earn-their-place)**: the runtime dependencies this build adds are `typescript` (the scan, in `apps/atis`), `d3-force` and `bubblesets-js` (in `libs/core`); `libs/svg` has none; no `three`, `react`, `earcut` or `elkjs` until their phase.
- <a id="c10"></a>**C10 (svg-is-still)**: the SVG contains no `<animate>`, SMIL, `<script>` or CSS animation; P4's idle is static and this build is all idle.
- <a id="c11"></a>**C11 (one-meaning-per-channel)**: hue means state only (change kind, category, improvement), luminance means evidence and reach, texture means history, shape means conformance, size means mass; no channel is reused in the SVG (P3), and the category letters always accompany the category hue.

## Steps

1. [x] chore(repo): scaffold the atis monorepo with checkride init, **done when:** `pnpm check` exits 0 with `libs/core` and `apps/atis` type-checked and each carrying a smoke test under `src/__tests__/`; `pnpm build` emits `dist/` for both and `node apps/atis/dist/cli.js --version` prints `0.0.0` (the `bin`, with `core` as a `workspace:*` dependency resolved per [D20 (workspace-exports)](#d20)); `docs/prior-art.md` and `docs/inspiration.md` pass the `docs` slot (34 markdownlint hits today, mostly MD034 bare URLs to wrap in `<…>`); `.plumbbob/settings.json` carries `"check": "pnpm check --strict"`; `.plumbbob/**` is in the markdownlint ignores ([D42 (committed-files-vs-gate)](#d42))
   - seam: `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `tsconfig.json`, `tsconfig.base.json`, `vitest.config.ts`, `fallow.toml`, `sgconfig.yml`, `rules/`, `cspell.json`, `.markdownlint-cli2.jsonc`, `.oxlintrc.json`, `.npmrc`, `.gitignore`, `AGENTS.md`, `CLAUDE.md`, `LICENSE`, `README.md`, `libs/core/`, `apps/atis/`, `docs/prior-art.md`, `docs/inspiration.md`, `.plumbbob/settings.json`
   - model: sonnet (mechanical: checkride init with shape monorepo, name atis, license Apache-2.0, author Rob McLarty, no hooks per D31, then the exports and the bin)
2. [x] feat(core): define the map.json schema types and assertMap, **done when:** `libs/core/src/schema.ts` exports the types of the sketch (with `layout` optional) and `SCHEMA_VERSION = 1` and `assertMap(value): MapJson`, which throws an error naming the offending path on a wrong `schema_version`, more than six notices, a tier count other than ≤1/≤2/≤3, a `weather.reach` entry naming an unknown cell, a `layout.positions` entry naming an unknown organelle or group file, a `changed` entry with both or neither of `cell` and `group`, or a `group` naming an unknown group ([D48 (shore-groups)](#d48)); tests cover a minimal valid map, one with a layout, and each rejection
   - seam: `libs/core/src/schema.ts`, `libs/core/src/index.ts`, `libs/core/src/__tests__/schema.test.ts`
   - model: sonnet (fully specified by the sketch)
3. [x] feat(core): identify cells, organelles and shore groups from a file list, **done when:** `identifyModules(files, edges, roots)` maps checkride's convention (`src/<name>.ts` single-file cell, `src/<name>/index.ts` folder cell, `src/index.ts` package barrel, under each workspace member or a flat `src/`, each member a `kind: package` cell whose only direct organelle is its barrel when it has one, [D43 (scan-roots)](#d43) and [D45 (nested-cells)](#d45)) and otherwise falls back to directory = cell with interface = the files imported from outside it; `interface_size` counts the barrel's exports, `body_loc` sums the organelles; test files (`__tests__/`, `*.test.ts`, `*.spec.ts`, `test/`) are excluded per [D4 (tests-not-terrain)](#d4); tests cover flat, folder-module, `apps/*` with `libs/*`, `packages/*` and barrel-less non-checkride fixtures; `identifyGroups(files, rules)` puts every tracked non-source file into exactly one shore group by the first-match rule table of [D48 (shore-groups)](#d48), `other` last, with the defaults in `config.ts`, and tests cover one path per default group plus an unmatched extension landing in `other`
   - seam: `libs/core/src/modules.ts`, `libs/core/src/groups.ts`, `libs/core/src/config.ts`, `libs/core/src/index.ts`, `libs/core/src/__tests__/modules.test.ts`, `libs/core/src/__tests__/groups.test.ts`
   - model: opus (the edge cases are the work)
4. [ ] feat(core): compute topological depth bands over the import graph, **done when:** `computeDepth(edges, entryPoints)` condenses cycles (Tarjan SCC), takes the longest path from any non-test entry point, and quantises into ≤ 7 bands (`band = depth` when max depth ≤ 6, else proportional); a cycle collapses to one depth, a diamond takes the longer path, and an unreachable file lands in the deepest band with `reachable: false` per [D26 (unreachable-files)](#d26); tests cover chain, diamond, cycle, orphan, and the seven-band cap on a depth-12 chain
   - seam: `libs/core/src/depth.ts`, `libs/core/src/index.ts`, `libs/core/src/__tests__/depth.test.ts`
   - model: opus (graph algorithms; the tests do the thinking)
5. [ ] feat(cli): scan TypeScript imports into files, exports and edges, **done when:** `scanImports(dir)` walks every tracked file in an extracted commit, parsing the `.ts` and `.tsx` ones (the base or the head archive, [D32 (terrain-from-base)](#d32), [D46 (head-is-a-commit)](#d46)) with the `typescript` compiler API, reads the workspace members from `pnpm-workspace.yaml` ([D43 (scan-roots)](#d43)), resolves every static import, `export … from` and `import()` specifier with `ts.resolveModuleName` (NodeNext, so `./foo.js` resolves to `foo.ts`), resolves workspace packages by name through `pnpm-workspace.yaml` globs and their manifests to `src/index.ts` (never through `node_modules`), drops bare npm packages, and returns `{ files[{ path, loc, kind: "source" | "test" | "other", exports[] }], edges[{ from, to, names[], line }], members[{ name, dir, entry[] }] }`; entry points are the union of `pnpm exec fallow list --entry-points --format json --root <dir>` (when the reviewed repo has a local fallow) and every member's `package.json` `bin`/`main`/`exports` targets, test files and non-TypeScript paths removed; a fixture tree written into a `mkdtemp` directory from strings inside the test ([D42 (committed-files-vs-gate)](#d42)) yields the expected file, member and edge lists
   - seam: `apps/atis/src/sources/imports.ts`, `apps/atis/src/sources/index.ts`, `apps/atis/src/__tests__/imports.test.ts`, `apps/atis/package.json`
   - model: opus (module resolution has subtleties: extensions, index files, workspace names)
6. [ ] feat(cli): read the git diff into change kinds, sizes and head-side hunks, **done when:** `readDiff(repo, base)` computes `merge_base` with `git merge-base <base> HEAD` per [D25 (base-semantics)](#d25), runs `git diff --name-status -M`, `git diff --numstat -M` and `git diff -U0 -M` between it and `HEAD` ([D46 (head-is-a-commit)](#d46)), and returns `changed[{ path, kind, from?, added, deleted, hunks[{ start, count }] }]` for added, modified, deleted and renamed files with hunks on the head side; `readManifests(repo, merge_base)` reads every workspace `package.json` at both commits with `git show <sha>:<path>` and a pure `diffManifests` returns `deps_added[{ manifest, name, range, dev }]` ([D47 (dependency-delta)](#d47)); the parsers are pure and tested from captured diff text under `apps/atis/fixtures/diff/` and two manifest strings, and one integration test runs against this repo with `--base HEAD~1`
   - seam: `apps/atis/src/sources/git.ts`, `apps/atis/src/sources/index.ts`, `apps/atis/src/__tests__/git.test.ts`, `apps/atis/fixtures/diff/`
   - model: sonnet (parsing, fully specified)
7. [ ] feat(history): mine git log into churn, age, bug-fix rate and co-change, **done when:** the CLI runner turns `git log --numstat --no-merges --format=%H%x00%ct%x00%s -n 5000 <head>` into `commits[{ sha, time, subject, files[{ path, added, deleted }] }]` with no author field ([C6 (no-people)](#c6)), and `computeHistory(commits, loc, changed, head_time)` in core returns per-file churn ratio (added + deleted over the window, divided by current loc), age in days since first commit, bug-fix rate (share of subjects matching `/\b(fix|bug|regression|hotfix)\b/i`, [D8 (history-window)](#d8)) and co-change pairs `{ a, b, rate, support }` per CHID eq. 3 for every changed file; tests from a scripted commit list assert 3-of-4 co-commits → rate 0.75, support 3, and the integration test records the `git log` wall time on this repo ([D50 (history-measured)](#d50))
   - seam: `apps/atis/src/sources/git.ts`, `libs/core/src/history.ts`, `libs/core/src/index.ts`, `libs/core/src/__tests__/history.test.ts`, `apps/atis/src/__tests__/git.test.ts`
   - model: sonnet (arithmetic over a fixture; fully specified)
8. [ ] feat(cli): read checkride's .check artifacts into evidence inputs, **done when:** `readCheck(repo)` returns `undefined` with a `reason` when `.check/` is absent, empty or has no `summary.json` with `schema_version: 1`, reports a summary that fails the schema-1 shape as `harness_broken`, otherwise parses `summary.json` (schema 1: `ok`, `checks_run`, `timestamp`, `total_duration_ms`, `checks[{ name, ok, skipped?, output_file }]`) and reads each raw file only when its owning slot ran in this summary and was not skipped, by the slot-to-file table of [D41 (artifact-trust)](#d41), never by `output_file`: `health.json` (`file_scores[{ path, fan_in, fan_out, lines, function_count, maintainability_index, crap_max }]`, `findings[]` by path with the exceeded threshold, `target_thresholds.fan_in_p95`), `dead.json` (`circular_dependencies`, `re_export_cycles`, `boundary_violations`, `unused_exports`), `dupes.json` (`clone_families`), `coverage/coverage-final.json` (istanbul: absolute-path keys, `statementMap`, `s`), `mutation.json` (Stryker 1.0: `files[path].mutants[{ status, location.start.line }]`), `test.json` (vitest: `testResults[{ name, status }]`) and `security.json` (`metadata.vulnerabilities`); each missing file yields `undefined` for its channel ([C2 (never-fake)](#c2)), a live file whose mtime predates the run window `[timestamp − total_duration_ms, ∞)` is muted as stale with its age recorded, each fallow file's `schema_version` is recorded and never rejected, paths are normalised repo-relative; tests run on a trimmed copy of checkride's own `.check/` under `apps/atis/fixtures/check/` (its `coverage/` freed in `.gitignore` per [D42 (committed-files-vs-gate)](#d42)) plus a stale-mutation case, an unlisted-slot case and a summary-less case
   - seam: `apps/atis/src/sources/check.ts`, `apps/atis/src/sources/index.ts`, `apps/atis/src/__tests__/check.test.ts`, `apps/atis/fixtures/check/`, `.gitignore`
   - model: sonnet (readers; every shape is named above)
9. [ ] feat(core): compute the changed set and reach by module hop, **done when:** `computeReach` maps each changed file to its cell (with `is_barrel`) or its shore group ([D48 (shore-groups)](#d48)), then walks reverse edges from the changed set, head edges for added, modified and renamed files and base edges for deleted ones ([D39 (two-graphs)](#d39)): a step within the same innermost cell costs 0 hops, crossing into another costs 1 and appends the interface file landed on (the barrel when there is one) to `via` ([D45 (nested-cells)](#d45)); each reached non-test file carries its minimum `hops`; a changed file whose exports are not re-exported by its barrel and are imported only in-cell reaches 0 other cells (the deep-module payoff); a head edge between cells whose `(from, to)` pair is absent from the base edges lands in `edges_exceptional` as `new-cross-module`; tests cover the 3-cell chain (hops 0/1/2 with `via`), the contained change, a deleted file reached through base edges, the new cross-cell import against an edited old one, a barrel-less directory cell, and a package cell that costs no hop of its own
   - seam: `libs/core/src/reach.ts`, `libs/core/src/index.ts`, `libs/core/src/__tests__/reach.test.ts`
   - model: opus (the semantics of D5 are the product)
10. [ ] feat(core): compute evidence and the flight category, **done when:** `computeEvidence` derives per changed file the changed executable lines (statements in `statementMap` whose start line falls in a head-side hunk), covered against uncovered from `s`, survived and no-coverage mutants on those lines, and stitches (test files importing the changed file, joined to `test.json` status, torn when failed); `computeCategory` applies §5.3 with the numbers of [D27 (category-defaults)](#d27): LIFR for `checks_run: 0`, an unreadable summary, or a cycle or boundary violation touching a changed file; IFR for any red slot or an uncovered high-reach change; MVFR for a gap or an escaped interface; else VFR; NOINST when `.check/` is absent; a red slot's `scope` is the paths its raw output names for `test`, `health`, `dead` and `dupes`, else `global`; tests pin one fixture per category plus NOINST
    - seam: `libs/core/src/evidence.ts`, `libs/core/src/config.ts`, `libs/core/src/index.ts`, `libs/core/src/__tests__/evidence.test.ts`
    - model: opus (the category rules are the verdict; the tests must be strong)
11. [ ] feat(core): rank notice candidates into the six-slot budget, **done when:** `rankNotices` builds candidates for the eleven kinds of §5.4 and the `other`-group kind of [D48 (shore-groups)](#d48) (red slot; cycle or boundary violation touching a changed file; interface change on a high-fan-in or deep cell; uncovered changed lines in a high-reach file; survived mutants on changed lines; threshold breached at head in a changed file; large change on a hot or buggy file; missing co-change with rate ≥ 0.5 and support ≥ 3; exported symbol deleted with live consumers (base importers of a name missing from the head `exports[]`, [D39 (two-graphs)](#d39)); new dependency (`deps_added`, [D47 (dependency-delta)](#d47)) or security finding; change in bedrock; files in the `other` shore group), scores each as `severity × (1 + log(1 + cells reached)) × (1 + uncovered fraction) × (1 + history weight)`, breaks ties by path then kind, keeps 1 + 2 + 3 ([C7 (budget)](#c7)) and echoes `inputs` and `thresholds` on every notice ([D28 (config-file)](#d28)); the defaults (severity 10 for a red slot down to 2 for co-change, bedrock and the `other` group; fan-in high = `fan_in_p95` else 7; deep = band ≥ 4; large ≥ 100 lines; hot = churn ≥ 2 or bug-fix ≥ 0.3; bedrock = age ≥ 365 days and churn ≤ 0.5) live in `config.ts`; tests assert the budget, determinism across two runs, the two head-only kinds naming their approximation in `why`, and that a lone candidate yields one primary with nothing padded
    - seam: `libs/core/src/notices.ts`, `libs/core/src/config.ts`, `libs/core/src/index.ts`, `libs/core/src/__tests__/notices.test.ts`
    - model: opus (strong-assertion test authoring; the ranking is the attention budget)
12. [ ] feat(core): assemble map.json through one pure buildMap, **done when:** `buildMap(inputs, config): MapJson` takes a base scan, a head scan, the diff, `deps_added`, the history and the `.check/` inputs ([D32 (terrain-from-base)](#d32)), rekeys the base terrain by the diff's renames first ([D40 (rename-identity)](#d40)), builds cells and shore groups from the base files plus the added files, depth from the base edges plus the head edges touching added files, reach and stitches from the head edges (base edges for deleted files) and deleted-export consumers from the base edges ([D39 (two-graphs)](#d39)), composes modules → depth → history → reach → evidence → notices with `meta` filled and `terrain.layout` still omitted ([D24 (layout-in-core)](#d24)), sorts every list ([C3 (deterministic)](#c3)), and an end-to-end test from a fixture input set under `libs/core/fixtures/` produces a map that passes `assertMap` and equals a committed golden file byte-for-byte after blanking `generated_at`, and a rename fixture comes out keyed by the head path with `from` set
    - seam: `libs/core/src/map.ts`, `libs/core/src/index.ts`, `libs/core/src/__tests__/map.test.ts`, `libs/core/fixtures/`
    - model: sonnet (composition; the parts are already tested)
13. [ ] feat(cli): add the atis command that writes map.json for a base ref, **done when:** `apps/atis/src/cli.ts` (the `bin`) parses `--repo <path>` (default cwd), `--base <ref>` (required), `--out <file>` (default `map.json`), `--verbose` (per-source timings, [D50 (history-measured)](#d50)) and `--version` with `util.parseArgs`; `run.ts` extracts the merge-base tree and the `HEAD` tree with `git archive` into temp dirs for the two scans ([D32 (terrain-from-base)](#d32), [D46 (head-is-a-commit)](#d46)), reads `.check/` from the working tree, removes the temp dirs, wires the sources into `buildMap`, writes the file atomically, exits 0 on a written map and 2 on misuse or an unreadable repo ([C4 (never-blocks)](#c4)), and prints one line naming the category, the changed-file count and the notice count; one test runs the built CLI against this repo with `--base HEAD~1` and asserts `assertMap` passes, another runs it on a temp copy with `.check/` removed and asserts `NOINST` with the evidence keys absent, and a third on a copy with an empty `.check/` asserts `NOINST` with its `reason`
    - seam: `apps/atis/src/cli.ts`, `apps/atis/src/run.ts`, `apps/atis/src/index.ts`, `apps/atis/package.json`, `apps/atis/src/__tests__/cli.test.ts`, `fallow.toml`
    - model: sonnet (wiring, fully specified)
14. [ ] chore(spike): generate and spot-check map.json for checkride's PR 4, **done when:** a worktree of `~/Projects/checkride/code/checkride` at `ae5078c` has run `pnpm install && pnpm check --all --skip mutation` (which writes its `.check/`), `atis --repo <worktree> --base fee5ed6 --out fixtures/checkride-pr4/map.json` wrote the fixture (committed, beside a `fixtures/checkride-pr4/README.md` naming repo, base, head, the toolchain at that commit (checkride 0.9.4, fallow 3.9.1, read by key per [D41 (artifact-trust)](#d41)) and the commands), and `docs/spike.md` records four rows each marked ✓ with the command that produced the evidence: the changed set equals `git diff --name-status fee5ed6...ae5078c`; the reach set for `src/pm/tools.ts` equals `pnpm exec fallow dead-code --impact-closure src/pm/tools.ts --format json` minus test files ([D52 (reach-from-scan)](#d52)); patch coverage for `src/pm/tools.ts` matches its hunk lines against `coverage-final.json` by eye; the top-three notices include the `src/pm/index.ts` interface change; the worktree is removed afterwards
    - seam: `fixtures/checkride-pr4/`, `docs/spike.md`
    - model: opus (the spot-check is judgement, and a wrong ✓ poisons phase 1)
15. [ ] feat(core): lay out organelles within bands with a seeded force simulation, **done when:** `layout/force.ts` runs a `d3-force` simulation with a seeded `randomSource` (`layout/random.ts`, a 32-bit LCG) advanced by `tick(300)` and never the timer ([D34 (layout-deps)](#d34)): `forceY` toward the organelle's band strip, `forceCollide` on a radius from `loc`, `forceLink` along import edges, and a cohesion force toward the cell centroid; base organelles are laid out first, then added files in a second pass with base positions fixed so the weather never moves the terrain ([D32 (terrain-from-base)](#d32)); `buildMap` now emits `terrain.layout` with `width`, `height`, the shore strip above band 0 (shore files on a deterministic grid, group by group in the table order of [D48 (shore-groups)](#d48)), band strips and `positions`, and step 12's golden file is regenerated; tests assert byte-identical positions across two runs, every organelle's `y` inside its band strip, no two organelles overlapping beyond 1 px, and a cell's organelles closer to each other on average than to any other cell's
    - seam: `libs/core/src/layout/index.ts`, `libs/core/src/layout/force.ts`, `libs/core/src/layout/random.ts`, `libs/core/src/schema.ts`, `libs/core/src/map.ts`, `libs/core/src/index.ts`, `libs/core/src/__tests__/layout.test.ts`, `libs/core/package.json`, `libs/core/fixtures/`, `pnpm-lock.yaml`
    - model: opus (force tuning and the fixed-terrain second pass need judgement)
16. [ ] feat(core): draw cell membranes as Bubble Set contours over the layout, **done when:** `layout/membranes.ts` computes one contour per cell, and one per non-empty shore group, with `bubblesets-js` (`circle` members from the cell's organelles at their positions and radii, every other cell's organelles as non-members, `compute()` then `simplify()` and `bSplines()` on the returned `PointPath`, whose `withinArea` serves the point-in-polygon test), stores it in `terrain.layout.contours` as a closed point list, and a membrane thickness hint from `interface_size` on the cell; tests assert every member centre inside its contour and every non-member centre outside (point-in-polygon), a cell spanning two bands yielding one contour that crosses the strip boundary, and byte-identical output across two runs
    - seam: `libs/core/src/layout/membranes.ts`, `libs/core/src/layout/index.ts`, `libs/core/src/__tests__/membranes.test.ts`, `libs/core/package.json`, `libs/core/fixtures/`, `pnpm-lock.yaml`
    - model: opus (contour correctness is geometric and the tests must prove it)
17. [ ] feat(svg): render the field, terraces, membranes and organelles, **done when:** a new `libs/svg` package ([D33 (svg-package)](#d33)) exports `renderSvg(map): string`, which refuses a map without `layout`, builds every element through one `el(tag, attrs, children)` helper that escapes attributes and text, and emits `<svg viewBox>` with `#world` containing, in order, `#field` (near-black rect), `#terraces` (one faint strip and contour line per band, entry points at the top), `#shore` (the strip above the top terrace: one dim contour and small-caps label per non-empty group of [D48 (shore-groups)](#d48), its files as faint marks), `#membranes` (one `<path>` per cell from `contours`, stroke width scaled by `interface_size`, dim translucent fill), and `#organelles` (a `<circle>` sized by `loc` per organelle, a polygon with one pulled vertex per dent when `dents` is non-empty, a small repeated glyph per `clone_family`); base tissue is greyscale and dim per §5.6; tests round-trip paths containing `<`, `&` and quotes, assert one path per cell and one shape per organelle, a 2-dent organelle rendering as a polygon with exactly 2 pulled vertices, and a golden SVG for a small fixture map
    - seam: `libs/svg/`, `tsconfig.json`, `apps/atis/package.json`, `pnpm-lock.yaml`
    - model: opus (the terrain layer sets the visual grammar everything else builds on)
18. [ ] feat(svg): render the weather layer over the terrain, **done when:** `#weather` draws, per §5.2 and [D35 (static-encodings)](#d35): changed organelles and shore files stained by kind (added and modified in the change hue, deleted as outline only with no fill, renamed as a dashed outline at its one position, labelled with `from` per [D40 (rename-identity)](#d40)); reach as a blurred glow (`feGaussianBlur`) filling each reached cell with opacity strictly decreasing by `hops`, and each barrel in `via` lit at the crossing; patch coverage as membrane integrity (the changed organelle's outline drawn as an arc whose closed fraction equals `covered / changed_executable`, gaps for the rest); survived and no-coverage mutants as small dents; stitches as short strokes on the organelle's edge, torn (broken, IFR hue) when the test failed; a storm marker over the field for a global red slot and over the named cells for a scoped one; ghosts as dashed outlines; churn as a hatching `<pattern>` and bug-fix rate as a stipple `<pattern>` with opacity by value; `edges_exceptional` as the only drawn lines; tests assert each encoding on a fixture map and that a `git-only` map renders no `#evidence` or `#history` groups and fakes nothing ([C2 (never-fake)](#c2)); a golden SVG for the fixture
    - seam: `libs/svg/src/weather.ts`, `libs/svg/src/patterns.ts`, `libs/svg/src/render.ts`, `libs/svg/src/index.ts`, `libs/svg/src/__tests__/weather.test.ts`, `libs/svg/fixtures/`
    - model: fable (the weather encodings are the product's whole argument; taste and P3 discipline over mechanics)
19. [ ] feat(svg): render the notice labels and the HUD grade blocks, **done when:** `#chrome` (flat, hard-edged, monospace, no gradient or filter, [D12 (materials)](#d12)) draws the HUD row of §7 in order (`[CATEGORY]` with its letters always present, `[Checks n/m]`, `[Patch cov x%]`, `[Mutants k survived]`, `[Reach n cells]`, `[Size +a −d, f files]`, `[Health Δ]` muted per [D23 (head-only-check)](#d23), `[Notices p·s·t]`, and `[Other n]` only when the `other` shore group is non-empty, [D48 (shore-groups)](#d48)), a block carrying `data-muted="true"` and a dash whenever its input is absent or stale ([D41 (artifact-trust)](#d41)); the notice list of at most six rows, tier-marked, each with its `why` and the thresholds that produced it ([D9 (thresholds)](#d9)); and one dotted leader from each notice's label to its target, with tier emphasis on the map (primary: saturated hue and label; secondary: thick outline; tertiary: marker only); tests assert block order, muting, the six-row cap, one leader per notice, no `<linearGradient>`, `<filter>` or `<animate>` under `#chrome` ([C10 (svg-is-still)](#c10)), and a golden SVG per category
    - seam: `libs/svg/src/chrome.ts`, `libs/svg/src/tokens.ts`, `libs/svg/src/render.ts`, `libs/svg/src/index.ts`, `libs/svg/src/__tests__/chrome.test.ts`, `libs/svg/fixtures/`
    - model: fable (brutalist chrome that still reads in ten seconds is a design call)
20. [ ] feat(cli): add --svg and --open to write and show the static render, **done when:** `atis --repo <path> --base <ref> --svg <file>` writes `map.json` and the SVG in one run, `--open` hands the SVG to the platform opener (`open` on macOS, `xdg-open` elsewhere) and is a no-op in tests, the exit codes of [C4 (never-blocks)](#c4) hold, and tests run the built CLI against this repo with `--base HEAD~1 --svg` and assert the file begins with `<svg` and contains `#world` and `#chrome`
    - seam: `apps/atis/src/cli.ts`, `apps/atis/src/run.ts`, `apps/atis/src/__tests__/cli.test.ts`, `apps/atis/package.json`
    - model: sonnet (wiring)
21. [ ] docs(design): record the colour and chrome tokens the SVG settled, **done when:** `libs/svg/src/tokens.ts` is the single source of every colour, stroke, font and size the renderer uses, each token named by its meaning under P3 (state, evidence, history, chrome), and `docs/design.md` documents every token with its channel and where it appears, written from the SVG as §5.6 asks; a test asserts `design.md` names every exported token
    - seam: `docs/design.md`, `libs/svg/src/tokens.ts`, `libs/svg/src/__tests__/tokens.test.ts`
    - model: sonnet (documentation of what exists)
22. [ ] chore(fixtures): generate map.json and the SVG for five historical PRs, **done when:** five folders `fixtures/<repo>-pr<n>/` exist for the five PRs of [D54 (glance-prs)](#d54) per [D36 (glance-fixtures)](#d36), each with `map.json` passing `assertMap`, `atis.svg`, a `README.md` naming repo, base, head, merge (local SHAs beside GitHub numbers) and the commands (the step-14 worktree procedure, mutation included where the run completes), and a `truth.md` drafted per [D44 (ground-truth-source)](#d44) from the follow-up commits that touch the PR's files within the next thirty, each with subject and stat, every line Rob has not confirmed marked `needs Rob` and a PR with no follow-up recorded as calm; `docs/glance-test.md` lists the five with their ground truth and the §11 protocol ready to run
    - seam: `fixtures/`, `docs/glance-test.md`
    - model: opus (drafting ground truth from history takes judgement and must not overclaim)
23. [ ] chore(glance): run glance-test round one and record the verdicts, **done when:** `docs/glance-test.md` records, per PR and per reader (Rob plus two, none of whom wrote or reviewed the PR), the merge/hold verdict, the one reason and whether it matches ground truth, then the pass line (≥ 4 of 5 verdicts agree, every hold's reason matches a real finding, the flagged thing sits in the top three notices) or the fail line with the encodings to change, each parked with `/plumbbob:park` for `/plumbbob:refine` per [D38 (glance-is-a-step)](#d38)
    - seam: `docs/glance-test.md`
    - model: sonnet (human-run; the builder prepares the sheet and records what the readers said)
24. [ ] fix(core): send hook folders to the scripts shore group, **done when:** a `GroupRule` can carry an `except` pattern list that removes paths from its row so a later row can claim them; the default `prompts` row of [D48 (shore-groups)](#d48) excepts `hooks/**` and `scripts` gains `hooks/**`, so hook files under `.claude/hooks/`, `skills/*/hooks/` and plugin `hooks/` folders land in `scripts` whatever their extension, while a Markdown file in a hooks folder stays in `docs` and `.claude/settings.json` stays in `prompts`; a test pins those paths
    - seam: `libs/core/src/groups.ts`, `libs/core/src/config.ts`, `libs/core/src/__tests__/groups.test.ts`
    - model: sonnet (already built in the working tree after step 3; this step records it)

## Open questions

- <a id="q1"></a>**Q1 (trunk-anchor)**: should the committed checkride baseline (`checkride baseline`) be usable as the "against trunk" anchor beside the merge-base?, *resolved:* 2026-09-16, the lean, recorded as [D49 (baseline-not-a-base)](#d49)
  - *lean:* no: the merge-base stays the only anchor, and the committed baseline is checkride's gate memory (grandfathered findings), not a tree; if it ever serves, it is as an overlay that draws baselined findings muted, never as a base.
- <a id="q2"></a>**Q2 (history-cost)**: co-change ghosts and stability need `git log --numstat` over the 5,000-commit window; fine for these repos, a large monorepo may need a smaller window or a background pass, *resolved:* 2026-09-16, the lean, recorded as [D50 (history-measured)](#d50)
  - *lean:* keep 5,000 and measure: step 7's integration test records the `git log --numstat` wall time and the CLI prints it under `--verbose`; the first repo past about two seconds earns a `--history <n>` cap before any background pass is built.
- <a id="q3"></a>**Q3 (flare-and-jiggle-numbers)**: the intervals, intensities and spring constants of §5.5 are starting values, *resolve by:* Rob's balance patches, from the phase 1b spike on; kept open on purpose as their log, the shared tokens file being [D51 (motion-tokens-shared)](#d51)
  - *lean:* leave the numbers as written; the phase 1b spike freezes what it settles into `libs/svg/src/tokens.ts` beside the colour tokens of step 21, so the still and the moving renderer read one file.
- <a id="q4"></a>**Q4 (reach-source)**: does reach come from atis's own import graph ([D21 (import-graph)](#d21)) or from `fallow dead-code --impact-closure`, as §5.2 and §9.1 say?, *resolved:* 2026-09-16, the lean, recorded as [D52 (reach-from-scan)](#d52)
  - *plain:* the spec names fallow's `--impact-closure` as the reach source. Its output, checked on checkride with fallow 3.22, is a flat `affected_not_shown[]` file list plus `coordination_gap[]`: no hop count, no membrane crossings, and test files included. [D5 (reach-by-module-hop)](#d5) needs hops per membrane, so the flat list cannot drive the glow's attenuation on its own; atis has to walk its own graph regardless. Getting this wrong means two graphs that disagree in the spike, or a reach with no attenuation.
  - *lean:* compute reach in core from the one scanned graph (step 9) and use fallow's closure as the spot-check oracle in step 14 (set equality minus tests). When fallow is absent nothing changes; when the scan is wrong the oracle catches it. §9.1's "reach muted without fallow" becomes "reach muted without a TypeScript scan".
- <a id="q5"></a>**Q5 (npm-stub)**: reserve `atis` on npm now with a `0.0.0` stub, or wait?, *resolved:* 2026-09-16, yes, by hand with pnpm before step 1, recorded as [D53 (pnpm-and-stub)](#d53)
  - *plain:* the spec records that `atis`, `@robmclarty/atis` and the GitHub name were free on 2026-09-16 and that nothing is reserved until a stub is published. Publishing is outward-facing, so it is never a build step; but if the name is taken before the fixtures go public, [D17 (name-and-path)](#d17) has to change and every path in this plan with it.
  - *lean:* publish `atis@0.0.0` by hand once this plan is approved, before step 1, so the name is held while the code is still private.
- <a id="q6"></a>**Q6 (glance-prs)**: which five merged PRs carry the glance test, and where is weft?, *resolved:* 2026-09-16, the lean, widened to other open-source projects as sources of patterns, recorded as [D54 (glance-prs)](#d54)
  - *plain:* §11 wants five merged PRs from checkride, fascicle and weft with known ground truth. checkride has four merged PRs on GitHub (1: a one-file CI bump, 2: a two-file bin fix, 4: the spike target, 5: the doctor fix). `~/Projects/fascicle/code/fascicle` has five merged PRs (4 and 5 under `examples/pr-improve`, local merges `a3ef265` and `c7407b5`); weft is at `~/Projects/fascicle/code/weft`, a `packages/*` monorepo with 108 commits, no PRs and no checkride, so it can supply commit ranges only. Without the list, steps 22 and 23 stall, and ground truth the builder invents would make the test measure nothing.
  - *lean:* checkride 4, 5 and 2, plus fascicle 4 (18 files under `examples/pr-improve`, the one PR with a review, local merge `a3ef265`) and fascicle 5 (a three-file fix on the same tools, local merge `c7407b5`); spares are checkride 1, tiny-kit's PR 1 and ridgeline's seven local merges; weft and ts-check-scaffold (public, `apps/*` and `libs/*`, no PRs) supply commit ranges only; the builder drafts `truth.md` from follow-up commits per [D44 (ground-truth-source)](#d44) and Rob confirms each line before step 23 runs.
- <a id="q7"></a>**Q7 (off-terrain-changes)**: where do changed files that belong to no cell go?, *resolved:* 2026-09-16, the shore-groups lean with the names as config, recorded as [D48 (shore-groups)](#d48)
  - *plain:* PR 4 changes 11 files and 7 are outside the terrain: `AGENTS.md`, `CHANGELOG.md`, two docs pages and three test files (evidence, never cells, per [D4 (tests-not-terrain)](#d4)). The sketch's `changed[]` requires a `cell`, step 9 "maps each changed file to its cell", and step 14's first row demands the changed set equal `git diff --name-status`. The three cannot all hold: the set comes up short, `cell` gets faked, or the first real PR crashes the build. The HUD's Size block, the `package.json` behind the "new dependency" candidate and the SVG all wait on the answer. Rob's read (2026-09-16): an "off the map" bucket becomes a dumping ground whenever a file does not line up, so what is left must be grouped by what it is. A census of checkride, fascicle, weft and plumbbob puts the non-source mass in `examples/`, `docs/`, `rules/`, `.github/`, `scripts/`, `site/`, `.vale/`, `.plumbbob/`, `skills/`, `templates/`, `research/` and root JSON and YAML.
  - *lean:* every tracked file outside the terrain belongs to exactly one *shore group* by a rule table in the config of [D28 (config-file)](#d28), first match wins: `docs` (`*.md`, `docs/**`, `research/**`, `.plumbbob/**`, `LICENSE`), `prompts` (`AGENTS.md`, `CLAUDE.md`, `.claude/**`, `.cursor/**`, `skills/**`, `prompts/**`), `config` (`tsconfig*`, `*.config.*`, `fallow.toml`, `sgconfig.yml`, `rules/**`, `cspell.json`, `.markdownlint*`, `.oxlintrc*`, `.vale/**`), `settings` (`.npmrc`, `.editorconfig`, `.gitignore`, `.gitattributes`, `.vscode/**`, `.env.example`), `deps` (`package.json`, `pnpm-workspace.yaml`, lockfiles), `ci` (`.github/**`, `Dockerfile`, `compose*.yaml`), `scripts` (`scripts/**`, `bin/**`, `*.sh`, `*.mjs`), `examples` (`examples/**` and `templates/**` not claimed by a workspace member), `assets` (`site/**`, images, fonts, `*.css`, `*.html`, `*.svg`), `data` (`fixtures/**`, `**/__fixtures__/**`, `schema/**`, `*.csv`, anything else under `test/**` that is not a test file); the last rule is `other`, and it is loud rather than absorbent: when non-empty it is a HUD block and a tertiary notice naming the extensions, so the table grows instead of the dump. `terrain.groups[]` carries `{ id, kind, files[] }`, a `changed[]` entry has exactly one of `cell` or `group`, and the SVG draws the shore as a strip above the entry-point terrace (land above the abyss), one small labelled contour per non-empty group, changed members stained by kind and never as organelles; changed test files stay stitches, lit on the organelles they import ([D4 (tests-not-terrain)](#d4)).
- <a id="q8"></a>**Q8 (two-graphs)**: which edge set feeds each computation that straddles base and head?, *resolved:* 2026-09-16, the lean as written, recorded as [D39 (two-graphs)](#d39)
  - *plain:* [D32 (terrain-from-base)](#d32) scans terrain at the merge-base and weather at head, and step 12 composes "cells and depth from the base files plus the added files, reach … from the head edges". Four computations straddle the split and the plan names a graph for none: an added file's band (it has no base edges), a deleted file's reach (it has no head edges, yet its base importers are exactly what it breaks), "exported symbol deleted with live consumers" (no head edge can import a symbol that is gone) and `new-cross-module`, where step 9's "import line inside an added hunk" also fires on an old import whose names were edited.
  - *lean:* `buildMap` takes both scans and each consumer names its graph: depth runs on the base edges plus every head edge touching an added file; reach walks head reverse edges for added, modified and renamed files and base reverse edges for deleted ones; deleted-export consumers are base importers of a name missing from the head `exports[]`; `new-cross-module` is a head edge whose `(from, to)` pair is absent from the base edges. Steps 9 and 12 get those words.
- <a id="q9"></a>**Q9 (rename-identity)**: which path names a renamed file across terrain, positions, reach and the diff?, *resolved:* 2026-09-16, the lean, with the rename leader deferred to phase 3 since a renamed file has one position in this build, recorded as [D40 (rename-identity)](#d40)
  - *plain:* the base scan knows a renamed file by its old path (organelles, positions, contours), while the diff, the head scan, reach, coverage and stitches know it by the new one. `assertMap` checks positions against organelle ids, so without a rule the map either fails validation or draws the file twice (deleted here, added there) and never the dashed leader step 18 promises. No candidate PR renames a file, so nothing in the spike would catch it.
  - *lean:* `buildMap` rekeys the base terrain by the diff's renames before anything else runs, so every list is keyed by the head path; a deleted file keeps its base path, which no head file can own; `id` is that path; `changed[].from` carries the old path and step 18 draws the leader from the old position, which the base layout still holds.
- <a id="q10"></a>**Q10 (artifact-trust)**: which `.check/` files does step 8 trust, and does it pin fallow's schema numbers?, *resolved:* 2026-09-16, the lean checked against every public repo under `~/Projects` with a `.check/`, freshness borrowed from checkride's run window, recorded as [D41 (artifact-trust)](#d41)
  - *plain:* checkride's own `.check/` today holds a `mutation.json` from 29 July beside a `summary.json` from 4 September that lists no mutation slot, so "read what is on disk" pins July's mutants to September's diff; `coverage/` is never a slot's `output_file` (the test slot's is `null`), so "read only what the summary names" drops coverage; this repo has an empty `.check/` right now, neither absent nor a run; and PR 4's own toolchain (checkride 0.9.4 with fallow 3.9.1, run on its tree) writes health, dead and dupes at schema 7 where today's fallow writes 11, 9 and 9, with every key step 8 reads identical in both.
  - *lean:* a raw file is read only when its slot appears in this run's `checks[]` and was not skipped (`mutation.json` needs a listed `mutation` check; `coverage/` needs `test`); a `.check/` with no `summary.json` is NOINST and a summary failing its schema-1 shape is `harness_broken` (LIFR); fallow's files are read by key, their `schema_version` recorded under `meta.instruments`, never rejected on the number; `checks.timestamp` lands in `map.json`, and a summary older than the head commit marks the Checks block `stale` and renders it muted ([C2 (never-fake)](#c2)).
- <a id="q11"></a>**Q11 (committed-files-vs-gate)**: how do fixture trees and plumbbob's own files stay out of the gate and inside git?, *resolved:* 2026-09-16, the lean as written, recorded as [D42 (committed-files-vs-gate)](#d42)
  - *plain:* three collisions with the real scaffold, each checked. Step 5 commits a `.ts` tree under `apps/atis/fixtures/scan/`; the scaffold's `fallow.toml` sets `unused-files = "error"` with no `ignorePatterns`, so `dead` goes red on files no entry point reaches, and oxlint's type-aware rules run on files outside every `tsconfig`. Step 8 commits `apps/atis/fixtures/check/coverage/coverage-final.json`, and the scaffold's `.gitignore` line `coverage/` matches that directory at any depth (`git check-ignore` agrees), so the fixture passes locally and vanishes from the checkpoint. The `docs` slot globs `**/*.md`, and with the scaffold's config `.plumbbob/` already carries five hits (two in this file, three in `detail.md`) beside the 34 in `docs/`, so step 1's first `pnpm check` is red before any code exists; `spell` is safe, its mode only reports common typos.
  - *lean:* step 5 writes its fixture tree into a `mkdtemp` directory from strings inside the test, so no `.ts` fixture is ever committed ([D30 (pure-parsers)](#d30) in spirit); step 8's seam gains `.gitignore` with the line `!apps/atis/fixtures/**/coverage/`, which frees exactly that directory (verified); step 1 adds `.plumbbob/**` to the markdownlint ignores, since the CLI writes those files.
- <a id="q12"></a>**Q12 (scan-roots)**: which directories are terrain in a repo that is not checkride-shaped?, *resolved:* 2026-09-16, the lean with git as the file universe (git diffs and workspace members, not checkride or fallow conventions), recorded as [D43 (scan-roots)](#d43)
  - *plain:* step 5 walks only `apps/*/src`, `libs/*/src` and `src/`. fascicle is a root package plus seven `examples/*` workspace members, and its PRs 4 and 5 live entirely under `examples/pr-improve/src`; at PR 2's base it was a `packages/*` monorepo; weft is `packages/*` with `.tsx` files. On all of them the walk yields an empty or partial terrain, so every non-checkride fixture in [Q6 (glance-prs)](#q6) stays blank until this is settled.
  - *lean:* walk the root `src/` plus every workspace member resolved from `pnpm-workspace.yaml` globs, each member a `kind: package` cell (so `examples/pr-improve` and `packages/core` are cells); include `.tsx`; entry points are fallow's list unioned with every member's `bin`, `main` and `exports` targets; fallow's `ignorePatterns` are not applied, since atis draws what pnpm sees; step 3's fixtures gain a `packages/*` case.
- <a id="q13"></a>**Q13 (ground-truth-source)**: where does ground truth come from when the PRs have no reviews?, *resolved:* 2026-09-16, the lean as written, recorded as [D44 (ground-truth-source)](#d44)
  - *plain:* [D36 (glance-fixtures)](#d36) and step 22 draft `truth.md` "from the PR's review comments and follow-up commits". checkride's four merged PRs carry zero review comments and zero reviews; fascicle's PR 4 has one review and its PRs 2, 3, 5 and 6 none; weft has no PRs at all (108 commits, no merges). The follow-up leg is real: PR 5 (`9511268`, the Yarn PnP doctor fix) and `aa2a08a` (bounding the tool search) both rework the files PR 4 added. fascicle's history was rewritten, so GitHub's merge SHAs are not in the clone; the merges are local `a3ef265` (#4), `c7407b5` (#5) and `7c29ffe` (#2).
  - *lean:* ground truth is "what broke after" plus Rob's recollection: the builder lists every later commit that touches the PR's files within the next thirty, with subject and stat, each as a `needs Rob` line; Rob confirms, edits or adds the reason before step 23; a PR with no follow-up and no recollection is recorded as calm (merge, no reason). D36 and step 22 drop "review comments", and fascicle fixtures cite the local merge SHAs beside the GitHub numbers.
- <a id="q14"></a>**Q14 (nested-cells)**: how do hops and membranes count when a cell contains cells?, *resolved:* 2026-09-16, the lean, with Rob's rider that nothing may depend on a barrel existing, recorded as [D45 (nested-cells)](#d45)
  - *plain:* checkride has `src/index.ts`, a package barrel over single-file cells like `doctor.ts` and folder cells like `pm/`; atis will have `libs/core/src/index.ts` over `depth.ts` and `layout/`. The sketch gives cells a `parent?`, so nesting is intended, but step 9 prices "crossing into another cell" at one hop without saying whether leaving the package contour is a second, and step 16 draws "one contour per cell" without saying whether a package contour contains its children's.
  - *lean:* a hop is an edge whose endpoints lie in different innermost cells, and `via` records the barrel only when the edge lands on one; a package cell is a contour around all of its descendants with its barrel as its only direct organelle, and is never a hop of its own, so leaving `libs/core` through `src/index.ts` costs the same one hop as leaving `pm/`.
- <a id="q15"></a>**Q15 (head-is-working-tree)**: is head the commit or the working tree?, *resolved:* 2026-09-16, the lean as written, recorded as [D46 (head-is-a-commit)](#d46)
  - *plain:* [D32 (terrain-from-base)](#d32) scans the working tree for weather and step 6 diffs from the merge-base with no second ref, so uncommitted edits become weather while `meta.head` names HEAD's SHA, and step 13's test runs against this very repo mid-step, dirty. Two runs on one SHA can disagree ([C3 (deterministic)](#c3)), and §8 reserves "working tree vs HEAD" for phase 3.
  - *lean:* the diff is `merge_base..HEAD` and the head scan reads a second `git archive HEAD` extraction, so both sides describe commits; the working tree is read only for `.check/`; uncommitted weather is §8's phase-3 mode. Cost: one more archive through the code path step 13 already builds.
- <a id="q16"></a>**Q16 (dependency-delta)**: who produces the `package.json` dependency delta the "new dependency" candidate of step 11 needs, since steps 6 to 8 return hunks, history and `.check/` and none of them a parsed manifest?, *resolved:* 2026-09-16, the lean as written, recorded as [D47 (dependency-delta)](#d47); *lean:* step 6's runner reads every workspace manifest at the merge-base (`git show <sha>:<path>`) and at head, a pure `diffManifests` returns `deps_added[{ manifest, name, range, dev }]`, and step 12 threads it into `buildMap`.

## Verdicts

- 2026-09-16: spec absorbed into this plan; phase 1 folded in at Rob's direction; no forks yet. The plan's cold read is in `.plumbbob/detail.md` and lands in the build log with the plan commit.
- 2026-09-16: refine pass one. Q7 to Q16 surfaced from a cold read against the real scaffold, checkride's live `.check/`, PR 4's own toolchain and the fixture repos; Rob settled Q8 to Q16 into [D39 (two-graphs)](#d39) to [D47 (dependency-delta)](#d47) and approved three repairs (D22's reason, step 16's bubblesets API, Q6's weft facts); Q7 reframed around shore groups at Rob's direction and still open; leans added to Q1 to Q3 for Rob's read.
- 2026-09-16: refine pass two. Rob took the shore-groups lean for Q7 and the leans on Q1, Q2, Q4, Q5 and Q6, recorded as [D48 (shore-groups)](#d48) to [D54 (glance-prs)](#d54); Q3 stays open by his choice as the log of his balance patches ([D51 (motion-tokens-shared)](#d51)); step 3 retitled to name the shore groups it now identifies; pnpm confirmed as the package manager and other open-source projects admitted as pattern sources.

## Source

*The sections of `SPEC.md` (draft v0.2, 2026-09-16) this build is cut from, verbatim, with headings demoted one level and anchors stripped so the `[D…](#d…)` links above land on this file's Decisions. The sections this build does not touch (§1–2, §5.5 motion, §8 bases, §15 technology) are in `SPEC.md` at the repo root.*

### 3. Frame

**Problem.** Reviewers cannot see a change; they can only read it, and reading
no longer keeps up.

**Smallest thing that solves it.** A local command that renders one change
against one base as a 2.5D map with a ranked notice list and a grade-block
HUD, fed by git plus checkride's `.check/` plus fallow, and passes the glance
test (§11) on real PRs.

**Done looks like.** `<name> --base main` opens a browser tab; within ten
seconds a cold reviewer states merge / hold and one reason that matches a real
finding, on four of five historical PRs.

**Explicitly not doing.** See §10.

### 4. Principles

- **P1 Attention budget.** At most one primary, two secondary, three tertiary
  notices on screen (six total). Everything else is calm and muted. If the
  tool cannot rank, it shows less, never more. (CHID participants: "the
  number of things to look at increased".)
- **P2 Terrain is stable; weather never moves it.** Positions derive from the
  trunk and change slowly and incrementally. A change recolours, relights,
  outlines, and moves the camera. It never re-lays out the map.
- **P3 One meaning per channel.** Position = structure (depth, coupling,
  membership). Size = mass. Shape regularity = conformance. Hue = state.
  Luminance = evidence. Texture = history. Motion = urgency. Repetition =
  duplication. A channel is never reused for a second meaning in the same view.
- **P4 Motion is a budget, not a palette.** Idle is static. One mover at a
  time, plus short transitions. Respect `prefers-reduced-motion`.
- **P5 Categories and components, not a score.** Every rollup is a category
  with its components one click away. No single risk number.
- **P6 Delta, not state.** The default frame is what changed between base and
  head. Whole-repo state is a mode, not the default.
- **P7 Zero workflow tax.** One command, one tab, one image. No account, no
  service, no new review process. Informs; never blocks. checkride is the gate.
- **P8 Degrade gracefully.** Git alone still renders terrain and weather.
  checkride adds evidence and verdicts. Fallow adds reach and conformance.
  Missing data mutes a channel; it never fakes one.
- **P9 Never about people.** No author scores, no ownership grades, nothing
  that could be read as a performance metric. (CHID §7.3.3.)

### 5. The visual model

#### 5.1 Terrain (from the base ref)

**Geometry: the abyss.** The map is organised top-to-bottom by *topological
depth*: entry points at the top edge, leaf utilities and data at the bottom
(settled: [D13 (geometry)](#d13)). Depth is computed on the import graph with
cycles collapsed: `depth(f)` = longest path from any entry point to `f`.
Depth is quantised into at most seven bands drawn as contour terraces. A
change at the bottom of the abyss climbs every terrace on its way back up;
the reviewer sees the ascent. For a REST service the bands fall out as
edge → auth/validation → handlers → domain → services → stores → raw data,
which is the layering Rob already draws by hand.

**One soft skin.** The surface is a single continuous soft body stretched
over the terrain, and everything on it is a bulge in that skin: think a
water bed with things under it, a bean bag world, jello. It is a heightfield
displaced by summed smooth bumps, one per cell weighted by mass, so cells
swell up through the skin rather than sitting on it, and where two bulges
meet the skin folds into a crease. The material reads wet and translucent
with a soft specular sheen. The skin is not rigid: it settles when the camera
lands and gives a brief damped jiggle when a cell is opened (§5.5).

**Cells and organelles.** A module is a cell; its files are organelles inside
it; its barrel (`index.ts`) is the membrane. The membrane is the crease line
around the module's bulge, computed as a Bubble Set isocontour around the
module's files *over* the depth layout, so a module whose files span several
bands is visibly stretched across terraces. That stretch is information: a
module doing work at many depths.

Module identification follows checkride's convention when present
(`src/<name>.ts` single-file module, `src/<name>/index.ts` folder module,
`src/index.ts` package barrel) and falls back to "directory = module,
files imported from outside the directory = interface" elsewhere.

**Depth of a module (Ousterhout).** Membrane thickness = interface size
(exports of the barrel, or of the file for single-file modules). Body volume
= implementation mass (non-test LOC, function count). A deep module is a big
body with a thin skin. A shallow module is mostly skin. Opening a cell (§6)
shows the organelles the skin hides.

**Shape = conformance.** Within thresholds a cell or organelle is round. Each
breached threshold pulls one vertex out: cyclomatic, cognitive, CRAP, unit
size (fallow's four), plus a boundary violation or a cycle. A wobbly polygon
is a cell that breaks the rules; the count of dents is the count of rules.

**Elevation = three things, at three scales.** Terraces (large scale) are
depth. Broad, gentle swells (medium scale) are stability: old, rarely
changed code sits high as bedrock, churny code lies low. Local bulges (small
scale) are mass. All three are relief under one light, never a colour. A
change in bedrock is notable and is a notice candidate.

**Coupling = proximity.** Within a band, cells that import each other sit
close (force layout with import attraction, collision, and set cohesion).
Ordinary import edges are **never drawn**. A drawn line always means "look
here": a boundary violation, a cycle, or a cross-module import introduced by
this change.

**Repetition = duplication.** Members of a clone family (fallow `dupes`) carry
the same small glyph. Seeing the same mark on three cells *is* the finding.

**Tests are not terrain.** Test files are evidence (§5.2), rendered as
stitches on the membranes of the files they import, never as cells.

#### 5.2 Weather (from base → head)

- **Changed set.** Touched files light up. Hue by change kind: added,
  modified, deleted (outline only, body gone), renamed (dashed outline from
  old position to new). Unchanged terrain stays muted.
- **Reach.** Transitive importers of the changed files (fallow
  `--impact-closure`, file level in v1; symbol level via `--symbol-impact`
  later). Rendered as a warm glow that attenuates by *module hops*, not file
  hops: the glow fills the changed cell, then crosses a membrane and fills the
  next cell dimmer, and so on. A membrane the reach crosses glows at the
  crossing; that is the public interface through which the change escapes,
  which is exactly where a reviewer should read. A change whose exports are
  not re-exported stays inside its cell, and the map shows the deep-module
  payoff directly.
- **Evidence = membrane integrity.** Patch coverage (changed executable lines
  covered by the test run, from `coverage-final.json` and the diff hunks)
  renders as how closed the changed organelle's skin is: full coverage is a
  closed skin; uncovered changed lines are gaps. Survived mutants on changed
  lines (`mutation.json`) are soft dents. Test files that import the changed
  file (`--trace-file` importers ∩ `test.json`) are stitches; a failing test
  is a torn stitch. A red check slot is a storm marker over the cells it
  names, or over the whole field when it is global.
- **History (from git, CHID).** Churn ratio (cumulative changed LOC / LOC)
  and bug-fix frequency (share of a file's commits whose message matches
  fix/bug patterns; a heuristic stand-in for CHID's PR labels) render as
  *texture*: hatching for churn, stipple for bugginess. A large change on a
  hot, buggy file is a notice candidate.
- **Missing co-change ghost.** Files with a high historical co-change rate
  with the changed set (CHID eq. 3, computed over commits) that were not
  touched render as a dashed ghost outline. Possibly fine (a refactor broke
  the pattern), possibly an omission; either way, a tertiary notice.
- **Improvement.** Health that got better, a dent that went away, coverage
  that closed: rendered as a distinct calm-positive state, because
  reinforcement matters (CodeScene) and because "nothing to see" and
  "got better" are different messages.

#### 5.3 State vocabulary (hue)

Hue is reserved for state. Proposal, borrowed from aviation flight
categories so the scale is a *category* with a fixed meaning, not a score
(see [D6 (flight-categories)](#d6)):

| Category | Meaning here | Aviation meaning | Hue |
| --- | --- | --- | --- |
| VFR | Glance-mergeable: checks green, evidence closed, reach contained | Visual flight rules: fly by sight | green |
| MVFR | Mergeable with a look: one gap or one escaped interface, nothing red | Marginal VFR | blue |
| IFR | Needs instrument review: a red slot, or uncovered high-reach change | Instrument flight rules | red |
| LIFR | Do not approach: harness broken (exit 2), vacuous green, or a boundary/cycle introduced | Low IFR | magenta |

Change kinds and improvement use white/cyan and a calm positive respectively;
unchanged terrain is greyscale. Red/green are never the *only* distinction:
every category block also carries its letters, and shape/outline redundancy
covers the map.

#### 5.4 The notice list (attention tiers)

The tool ranks candidate notices and shows at most six: 1 primary, 2
secondary, 3 tertiary. Candidates and inputs:

| Candidate | Inputs |
| --- | --- |
| Red check slot | `summary.json` (which slot, global or file-scoped) |
| Boundary violation or cycle introduced | `dead.json` delta |
| Interface change on a high-fan-in or deep module | barrel diff, `fan_in`, depth |
| Uncovered changed lines in a high-reach file | patch coverage, reach size |
| Survived mutants on changed lines | `mutation.json` |
| Threshold newly breached (cyc / cog / CRAP / size) | `health.json` findings delta |
| Large change on a hot or buggy file | churn, bug frequency, hunk size |
| Missing co-change | co-change rate ≥ 0.5 with support ≥ 3 |
| Exported symbol deleted with live consumers | diff + `--trace-file` |
| New dependency or security finding | `package.json` diff, `security.json` |
| Change in bedrock | age/churn |

Rank = severity weight × (1 + log module-reach) × (1 + evidence gap) ×
(1 + history weight), deterministic tie-break by path. Weights and thresholds
live in a config file with fallow's defaults and are shown next to every
notice, because unexplained coefficients were the CHID participants' main
complaint. Tier → emphasis:

| Tier | Count | Channels |
| --- | --- | --- |
| Primary | 1 | motion (flare, then breathe) + saturated hue + label + first in list |
| Secondary | 2 | saturated hue + thick outline, no motion |
| Tertiary | 3 | outline or marker only |
| Everything else | n | muted, static |

#### 5.6 Look (settled)

**Mood: satellite at night, revealed by zoom.** The whole point of the look
is that it *withholds*. Far away there is nothing to see but lights; every
step closer reveals a layer, and each layer is a different material.

1. **Far (LOD0, the field).** A near-black field. Only points of
   bioluminescence: the six notices, bright, and the rest of the changed set
   as a dimmer scatter. Terrace contours are barely there. This is the
   ten-second frame; a calm PR at this distance is a dark field with a few
   faint lights, and that darkness is the message.
2. **Closer (LOD1, the surface).** The surface resolves into an organic
   texture of membranes, the cells, each with its own luminescence. Where
   the change flows, the surface glows along the path: the changed cell
   brightest, the membranes the reach crosses lit at the crossing, the
   next cells dimmer. Relief and terraces become readable. Data visibly
   flowing through tissue.
3. **Inside (LOD2, the cell).** Zooming *into* a membrane fades in the
   interior like a stained slide under a light field: organelles (files) and
   their granules (functions), stained by state, the membrane now the frame
   around them. Warm and clinical where the surface was dark and luminous.
4. **Closer still (LOD3, LOD4).** One organelle, then the diff.

**Rendering: two materials, two rule sets.**

- *The world is organic.* One bulging, blobby soft body: jello, a water
  bed, a bean bag world. Soft, translucent membranes; gradients allowed;
  glow rendered as luminescence from within (emissive plus bloom), not as a
  hard outline; a wet specular sheen on the skin. Every luminous thing is
  luminous because it means something (reach, notice, improvement); the
  base tissue is dim.
- *The UI is brutalist.* Flat blocks, hard edges, high contrast, no
  gradients, big numerals, monospace or grotesk. Labels, leaders and
  annotations are drawn in a technical-drawing style (the Discovery credits):
  thin ink lines, dotted leaders from a label to its cell, small-caps
  annotations, and an exploded view when a cell is opened. The chrome never
  glows.

**Camera: 2.5D.** Orthographic, overhead by default; relief from one key
light plus ambient; continuous zoom is the primary navigation; tilt to ≤ 35°
and rotation on demand; no free perspective camera in v1.

**Colour.** Field near-black; terrain graphite and blue-grey; base tissue
desaturated and dim; state hues per §5.3 on the surface; inside a cell the
stains carry state (changed organelles stained by change kind, uncovered
lines unstained) so hue keeps its one meaning (P3). Exact tokens belong in a
`design.md` written during phase 1, from the static SVG, not before.

### 6. Levels of detail and navigation

| LOD | What it shows | Material |
| --- | --- | --- |
| 0 Field | Dark field; notices and the changed set as points of light; faint terraces; HUD | Lights on black |
| 1 Surface | Whole repo as cells on terraces; weather (reach glow, evidence, ghosts, history texture); the six notices labelled | Organic, luminous |
| 2 Cell | One module: organelles as stained bodies; barrel exports on the membrane; optional *wiring* overlay showing the change-only subgraph with importers and importees (the useful part of CodeSee, the graph part of Nx); optional *exploded view* that spreads the organelles along dotted leaders | Stained slide, technical-drawing chrome |
| 3 Organelle | One file: functions as granules sized by LOC and dented by thresholds; changed hunks; a per-line coverage strip; survived mutants pinned | Stripes and granules |
| 4 Diff | The diff itself, inline or a deep link to the editor / PR | Text |

**Navigation is continuous.** Scroll or pinch zooms; LODs cross-fade at
zoom thresholds; there is no mode switch and nothing reloads. Click a cell to
fly into it; click the notice list to fly to the notice; keyboard walks
siblings and ascends/descends; a breadcrumb in the HUD shows depth
(field › cell › organelle). Every level keeps the HUD. The goal is that the
reviewer *travels* through the change rather than opening panels.

### 7. HUD

A single row (or column) of grade blocks, rendered in the brutalist style Rob
liked in CodeScene's PR comment, never followed by prose:

`[CATEGORY] [Checks 18/19] [Patch cov 84%] [Mutants 2 survived] [Reach 3 cells]
[Size +412 −88, 9 files] [Health Δ −1.2] [Notices 1·2·3]`

Each block opens its components on click: the failing slot's raw output,
the uncovered lines, the survived mutants, the reach list, the health radar
(CHID's radar of raw metrics, categorised or raw by toggle). The base
selector and overlay toggles (§8) live in the HUD too.

### 9. Data

#### 9.1 Sources and degradation

| Source | Gives | If absent |
| --- | --- | --- |
| git | diff, hunks, change kinds, log (churn, age, bug-fix heuristic, co-change), tags, merge-base | required |
| checkride `.check/` (contract: `summary.json` schema v1, per-slot raw files, atomic writes) | verdict per slot; `health.json` per-file metrics and findings; `coverage-final.json`; `mutation.json`; `test.json`; `dead.json`; `dupes.json`; `struct.json`; `security.json` | evidence and conformance channels muted; category falls back to a git-only "no instruments" state |
| fallow CLI | `--trace-file` import edges and importers; `--impact-closure` reach; `audit --base` diff attribution; health at base when no cache | reach muted; import graph from a built-in TypeScript import scan instead |

Import edges: v1 loops `fallow dead-code --trace-file` per file (no full-graph
dump exists in fallow 3.22's `--help`), or scans imports with the TypeScript
compiler API. If this proves slow, ask fallow for a graph export or vendor
`dependency-cruiser --output-type json`.

Base-side metrics (health at base, for Δ): from the terrain cache, else from
checkride's committed baseline if it carries per-file scores, else by running
fallow in a temporary worktree of the base and caching.

#### 9.2 `map.json` (the contract between core and render)

Versioned (`schema_version`), produced by a pure function from the sources,
consumed by the renderer and by the static exporters. Shape sketch:

```text
map.json
  meta        { schema_version, generated_at, repo, base, head, trunk, mode }
  terrain     { cells[], organelles[], bands[], edges_exceptional[], layout{ positions, contours }, history{ churn, age, bugfix, cochange } }
  weather     { changed[], reach[], evidence{ patch_coverage, mutants, stitches }, checks{ category, slots[] }, ghosts[], improvements[] }
  notices     [ { tier, kind, target, why, inputs, weight } ]   // at most six
```

Everything the renderer draws is in this file. The renderer never reads git,
`.check/`, or fallow. This keeps the render layer swappable (SVG first,
three.js second) and the glance test reproducible from a fixture.

### 10. Non-goals

- Not a general codebase explorer or architecture-diagram product.
- Not a gate. checkride gates; this informs.
- No cloud service, no account, no telemetry, no network at runtime (the
  optional `gh` PR comment is an explicit command).
- No LLM required. A fascicle annotator (tours, explanations) is a later,
  optional layer.
- No per-person metrics, ever (P9).
- No free-perspective 3D, no VR, no city metaphor.
- Not TypeScript-only by design, but TypeScript-first: git-only mode works
  anywhere; evidence and reach need checkride and fallow.

### 11. Acceptance: the glance test

Protocol, run at the end of phases 1 and 2:

1. Pick five merged historical PRs from checkride, fascicle, and weft with
   known ground truth (what the review actually found, or what broke after).
2. Three readers (Rob plus two) who did not write or review the PR.
3. Show the map for ten seconds. The reader states *merge* or *hold* and one
   reason.
4. Pass: four of five verdicts agree with ground truth, and for every "hold"
   the stated reason matches a real finding.
5. Notice precision: for each PR, the thing the real review flagged appears
   in the top three notices.

Fail means the encodings change, not the test.

### 12. Build sequence (plumbbob phases)

0. **Scaffold and spike.** Scaffold with `checkride init --shape monorepo
   --name atis --license Apache-2.0` (workspace packages per §13 D2), then
   build the `map.json` spike for checkride itself: CLI runs sources →
   terrain → weather → notices and writes JSON for a real historical PR. Done
   when the changed set, reach, patch coverage, and notices spot-check
   correct by hand.
1. **Static SVG.** d3 pack/force plus `bubblesets-js`, L0 only, notices and
   HUD, `--svg`. Glance test round one. Iterate encodings until it passes or
   the encodings are reworked. No three.js yet.
1b. **Materials spike.** One day of three.js on fake data to test the
   reveal (§15). Taste only; throw it away.
2. **2.5D app.** three.js terrain, cells, weather, HUD, LOD0 to LOD2, notice
   fly-to, motion scheduler, reduced-motion path. Glance test round two.
3. **Bases and overlays.** Sequence scrub, tags, working tree, whole-repo
   overlays, L2 file level, health radar.
4. **Delivery.** `--png` (headless browser render of the same app), watch
   mode borrowed from `weft-watch`, README fingerprint, optional
   `--comment` via `gh`.
5. **Later.** MCP tools (highlight, reach, explain) so an agent can point at
   the map; symbol-level reach; fascicle annotator for tours; language
   plugins beyond TypeScript.

### 13. Decisions

Settled by Rob (2026-09-16):

- **D11 (mood)**: satellite at night, revealed by zoom (§5.6).
- **D12 (materials)**: organic, soft, translucent world with
  gradients allowed; brutalist flat UI with technical-drawing annotations.
- **D13 (geometry)**: depth terraces top-to-bottom (the
  abyss), cells as Bubble Sets straddling terraces.
- **D14 (primary motion)**: breathe, plus a flare on load
  and random flares thereafter (§5.5). No shake.
- **D16 (surface)**: one continuous soft skin; cells are
  bulges in it; jello, water bed, bean bag world (§5.1).
- **D17 (name and path)**: `atis`, at
  `~/Projects/atis/code/atis`, following the existing project layout.
  The name follows Rob's request to test `atis` first; renaming the folder
  is a one-line move if a different name wins.
- **D18 (delivery)**: v1 is a local command that opens a
  browser tab. Static PNG/SVG for the PR arrives in phase 4.
- **D1 (technology)**: three.js (`WebGPURenderer`, WebGL 2
  fallback) for the world, DOM for the chrome, TypeScript throughout, on npm
  beside checkride. Evaluation in §15.

Defaults chosen to keep the spec concrete (silence means keep):

- **D2 (layout)**: a small pnpm workspace with a pure `core`
  (schema, depth, layout, notices; no DOM, no Node APIs), a `cli` (sources,
  cache, serve, export) and an `app` (render). Because the renderer must
  not touch git or `.check/` (§9.2) and a package boundary enforces that,
  and because a second renderer (native, later) then plugs into the same
  `map.json`.
- **D3 (gate)**: checkride is the gate (`pnpm check`), deep
  modules, no classes, named exports, tests in `__tests__/`. Dogfood.
- **D4 (tests-not-terrain)**: test files are evidence, never
  cells. Because they are entry points of their own and would flatten depth.
- **D5 (reach-by-module-hop)**: reach attenuates per membrane
  crossed, not per file hop. Because the interface is where the reviewer reads.
- **D6 (flight-categories)**: the verdict scale is
  VFR / MVFR / IFR / LIFR with the hues in §5.3. Because it is a category
  with fixed meaning, it keeps checkride's aviation lineage, and it maps onto
  the red/white/blue/green Rob named. Alternative: plain green/amber/red.
- **D7 (no-people)**: CHID's author merge rate and any
  ownership grade are excluded. Knowledge overlays are deferred and, if ever
  built, are informational and opt-in.
- **D8 (history-window)**: full history up to 5,000 commits,
  cached per base SHA; bug-fix frequency from commit-message patterns
  (`fix`, `bug`, `regression`, `hotfix`) marked as heuristic in the HUD.
- **D9 (thresholds)**: reuse fallow's four thresholds and
  CHID's category ranges as defaults, all in one config file, all displayed
  beside the notice they produced.
- **D10 (license)**: Apache-2.0, like checkride.

### 14. Open questions (plan-time detail, none blocking)

- **Q1 (trunk anchor)**: is the base for "against trunk"
  always the merge-base with the trunk branch, or should the committed
  checkride baseline (`checkride baseline`) be usable as the anchor when it
  exists? Default: merge-base; the baseline as an opt-in flag.
- **Q2 (history cost)**: co-change ghosts and stability need
  `git log --name-only` over the history window (D8: 5,000 commits). Fine
  for these repos; for a large monorepo the window may need to shrink or
  the mining move to a background pass. Decide when a big repo shows up.
- **Q3 (flare and jiggle numbers)**: the intervals,
  intensities and spring constants in §5.5 are starting values, to be tuned
  by eye in the materials spike and then frozen as design tokens.

