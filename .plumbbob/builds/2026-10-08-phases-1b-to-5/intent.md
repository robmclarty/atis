# atis phases 1b to 5, in waves

**Phase:** framed, awaiting approval
**Size:** large (six waves; waves 2 to 5 are sharpened at the boundary before each)
**Scope:** atis

*Source: Rob's request at `/plumbbob:plan` on 2026-10-08, "i want to build all of the remaining items in waves for each phase not yet built and other fixes you identified", expanded against three inputs. The first is `SPEC.md` (draft v0.2, 2026-09-16) for phases 1b to 5, whose sections are preserved verbatim under [Source](#source). The second is the deferred tangents and the two unharvested parks of the map-and-svg build's [report.md](../2026-09-16-map-and-svg/report.md) (2026-09-29). The third is the fixes named in the session that framed this plan: the fake calm in `libs/core/src/evidence.ts`, the `interface-change` noise on the refreshed retake maps, a builder-scored precision corpus, [C1 (core-is-pure)](#c1)'s missing struct rule, and the `cli.test.ts` race. The map-and-svg build's decisions are carried below under their own numbers and slugs, so each means the same thing in both files.*

## Frame

- **Problem:** atis draws a change as one still SVG, and that map has not passed the glance test. Round one scored 2 of 5; the blind retake scored 3 of 5, and 1 of 3 on notice precision. The fifth pass's fixes are unjudged. Two faults can still put a false reading on a map. A changed file the coverage report never names reads as no gap, so a change no test ran can come out VFR. And `interface-change` now sits in the top three on all five refreshed retake maps: three on shapes the scan could not compare, one on a name merely added. Everything else the spec promises is unbuilt: the 2.5D world a reviewer travels through (phase 2), bases beyond the merge-base and the base-side deltas (phase 3), the map as a PR image or comment (phase 4), and reach for agents and other languages (phase 5).
- **Smallest thing that solves it (this build):** six waves, one per unbuilt phase, each ending where the next is sharpened ([D79 (waves)](#d79)).
  - **Wave 0 finishes phase 1.** It lands the content fixes and the report's deferred scan and SVG fixes. Then it scores notice precision on a builder-scored corpus of outside PRs with a held-out half, and reads five held-out maps blind on the SVG.
  - **Wave 1 is phase 1b.** The materials spike runs and is thrown away; only its verdict and the motion tokens land.
  - **Wave 2 is phase 2.** It builds a pure `libs/scene` and a three.js `apps/web`, served by `atis --base <ref>` in a browser tab, and closes with glance round two.
  - **Wave 3 is phase 3.** It adds the terrain cache and incremental relayout, base-side structure with Health Δ and improvements, the trunk and named bases, range sequences, whole-repo overlays, the file and diff levels, and the health radar.
  - **Wave 4 is phase 4.** It adds `--png`, watch mode, the README fingerprint, `--comment`, and a package that installs.
  - **Wave 5 is phase 5.** It adds MCP tools, symbol-level reach, the opt-in tour, and producers for Go, Python, Terraform and shell beside the TypeScript scan.
- **Done looks like:** every step checkpointed on a green `pnpm check` ([C8 (checkride-convention)](#c8)), plus one checkable outcome per wave:
  - **Wave 0:** `docs/glance-test.md` records criterion 5 on the held-out holds and the blind SVG reading.
  - **Wave 1:** `docs/design.md` records the spike's verdict, and `libs/svg/src/tokens.ts` carries the motion tokens.
  - **Wave 2:** `atis --base main` opens a tab on the world, which holds 60 fps on a 5,000-file map, and glance round two is recorded.
  - **Wave 3:** `atis` with no `--base` reads the trunk, a second run on the same base draws its first frame from the cache within 2 s, and the Health Δ block is live.
  - **Wave 4:** `atis --png` writes a byte-stable image of a fixture, and the packed tarball installs into an empty directory and runs.
  - **Wave 5:** an agent highlights a notice in the open tab through `atis mcp`, and one reviewed Go, Python, Terraform and shell PR each renders a map whose cells are that language's modules.

  A glance fail does not fail the build; it parks the encodings to change for `/plumbbob:refine` ([D38 (glance-is-a-step)](#d38)).
- **Explicitly NOT doing:**
  - **Publishing to npm.** Rob publishes by hand ([D53 (pnpm-and-stub)](#d53)).
  - **A cloud service, an account, telemetry, or network** outside the two commands that say so ([C5 (no-network)](#c5)).
  - **Per-person metrics** ([D7 (no-people)](#d7)).
  - **Free-perspective 3D, VR or a city metaphor** (§10).
  - **A native renderer.** §15 keeps one possible behind `map.json`.
  - **§5.5's optional ambient drift.** It is off by default, and it stays unbuilt.
  - **Languages beyond TypeScript, Go, Python, Terraform and shell.**
  - **Running a reviewed repo's tests or harness from atis.** atis reads artifacts ([D64 (fixture-eligibility)](#d64)).
  - **Readers for old `map.json` versions** ([D85 (schema-bumps)](#d85)).
  - **A step for the `CheckArtifacts` conformance tangent.** It is already closed: `readCheck` returns core's `CheckArtifacts` by annotation (`apps/atis/src/sources/check.ts:392`), so the compiler checks it.

## Architecture sketch

```
repo under review                                  atis workspace (by wave 5)
─────────────────                                  ──────────────────────────────────────────────────────────────
git (diff, log, archive) ─┐                        apps/atis  the CLI: sources ─► buildMap ─► map.json
.check/ at head ──────────┤                                   --svg · serve and open (w2) · --png (w4) · --watch (w4)
fallow (head; base, w3) ──┼─ sources (impure) ─►              --comment via gh (w4) · fingerprint (w4) · mcp (w5)
go, py, tf, sh (w5) ──────┘                                   .atis/terrain/<sha>.json cache (w3)
                                                                 │
                                   libs/core (pure)  modules ─► depth ─► history ─► layout (relaxed from cache, w3)
                                                     ─► reach (+ names, w5) ─► evidence (+ base deltas, w3) ─► notices
                                                                 │
                                                   map.json  schema_version 1; bumped only when a key changes
                                         ┌───────────────────────┼───────────────────────────┐
                                  libs/svg (pure)         libs/scene (pure, w2)          apps/tour (w5, opt-in)
                                  renderSvg(map)          heightfield · membrane          fascicle ─► tour.json
                                  the fixture format      triangles · instances ·
                                                          weather · labels · LOD ·
                                                          picking · motion scheduler ·
                                                          colour + motion tokens
                                                                 │
                                                          apps/web (w2)  three.js WebGPURenderer (WebGL 2 fallback),
                                                          TSL materials, bloom, CSS2D labels, React 19 HUD;
                                                          built by Vite, served by atis on 127.0.0.1, captured by --png (w4)
```

| Wave | Phase (SPEC §12) | Steps | Ends with |
| --- | --- | --- | --- |
| 0 | 1, finished: content, scan and SVG fixes | 1 to 21 | criterion 5 on the held-out holds; a blind SVG reading |
| 1 | 1b, the materials spike | 22 | the verdict and the motion tokens |
| 2 | 2, the 2.5D world | 23 to 47, and 88 | glance round two in the world |
| 3 | 3, bases and overlays | 48 to 66 | the trunk by default, a cached first frame, a live Health Δ |
| 4 | 4, delivery | 67 to 73 | PNG, watch, fingerprint, comment, an installable package |
| 5 | 5, later | 74 to 87 | MCP, symbol reach, the tour, producers for Go, Python, Terraform and shell |

## Decisions

**Carried from SPEC.md and the map-and-svg build.** Numbers and slugs are kept, so these anchors are cited the same way in both builds. Each is restated in short. The full text and the evidence behind each is in [the map-and-svg intent.md](../2026-09-16-map-and-svg/intent.md#decisions), and a carried decision not restated here still stands.

- <a id="d1"></a>**D1 (technology)**: three.js `WebGPURenderer` (WebGL 2 fallback) for the world, DOM for the chrome, TypeScript throughout, on npm beside checkride, *because* it is the only candidate where translucency, inner glow, relief, orthographic zoom, picking and headless capture are all first-class and the corpus is deep.
- <a id="d2"></a>**D2 (layout)**: a pnpm workspace of pure libraries (no DOM, no Node APIs) and apps for the CLI and the render, *because* the renderer must never read git or `.check/` and a package boundary enforces it.
- <a id="d3"></a>**D3 (gate)**: checkride is the gate (`pnpm check`); deep modules, no classes, named exports, tests in `__tests__/`, *because* dogfooding the contract atis consumes keeps it honest.
- <a id="d4"></a>**D4 (tests-not-terrain)**: test files are evidence (stitches), never cells or depth entry points, *because* they would flatten depth.
- <a id="d5"></a>**D5 (reach-by-module-hop)**: reach attenuates per membrane crossed, not per file hop, *because* the interface is where the reviewer reads.
- <a id="d6"></a>**D6 (flight-categories)**: VFR / MVFR / IFR / LIFR (green / blue / red / magenta), NOINST with no instruments, *because* a category has a fixed meaning and a score does not.
- <a id="d7"></a>**D7 (no-people)**: no author, ownership or per-person metric anywhere, *because* of CHID's own warning (P9).
- <a id="d8"></a>**D8 (history-window)**: full history up to 5,000 commits, cached per base SHA once a cache exists (wave 3); the bug-fix rate comes from commit subjects and is marked heuristic, *because* PR labels are not local.
- <a id="d9"></a>**D9 (thresholds)**: fallow's four thresholds and CHID's ranges as defaults, all in one config and echoed beside the notice they produced, *because* unexplained coefficients were CHID's main complaint.
- <a id="d10"></a>**D10 (license)**: Apache-2.0, like checkride.
- <a id="d11"></a>**D11 (mood)**: satellite at night, revealed by zoom: a near-black field, dim tissue, luminous only where it means something.
- <a id="d12"></a>**D12 (materials)**: an organic, soft, translucent world with gradients; a brutalist flat UI with technical-drawing annotations; the chrome never glows. Amended by [D151 (dark-wet-skin)](#d151): the skin is dark, and translucency is not modelled.
- <a id="d13"></a>**D13 (geometry)**: depth terraces top to bottom (the abyss), cells as Bubble Sets straddling terraces, *because* a change at the bottom climbs every terrace on its way back up.
- <a id="d14"></a>**D14 (primary-motion)**: the primary notice breathes, flares once on load and at random after; no shake.
- <a id="d16"></a>**D16 (surface)**: one continuous soft skin; cells are bulges in it (jello, a water bed, a bean bag world).
- <a id="d17"></a>**D17 (name-and-path)**: `atis`, at `~/Projects/atis/code/atis`.
- <a id="d18"></a>**D18 (delivery)**: v1 is a local command that opens a browser tab; the PNG and SVG for a PR are phase 4's.
- <a id="d19"></a>**D19 (packages)**: `libs/core` (package `core`) and `apps/atis` (package `@robmclarty/atis`, the CLI), joined by `libs/svg`; the render app lands as `apps/web` in phase 2.
- <a id="d20"></a>**D20 (workspace-exports)**: each lib exports `./dist/index.js` with `./src/index.ts` under a `source` condition that vitest (and, from wave 2, Vite) resolves, *because* Node cannot rewrite the `.js` specifiers checkride's `require-js-extension` rule demands.
- <a id="d21"></a>**D21 (import-graph)**: the import graph comes from one TypeScript compiler API scan in the CLI, *because* one process beats a fallow spawn per file, and one graph feeds depth, layout, reach and stitches.
- <a id="d22"></a>**D22 (local-fallow)**: fallow always runs from the reviewed repo's own `node_modules/.bin/fallow`, run directly, never the global one, *because* the repo's pin is the one its `.check/` numbers came from.
- <a id="d23"></a>**D23 (head-only-check)**: `.check/` is read at head only, so "newly breached" and "introduced" read "present at head and touching a changed file", `improvements` is empty and Health Δ is muted; wave 3 lifts this for the structural slots ([D98 (base-side-structure)](#d98)).
- <a id="d24"></a>**D24 (layout-in-core)**: `terrain.layout` is computed in core (seeded d3-force in bands, Bubble Set contours), *because* every renderer must draw the same terrain (P2).
- <a id="d25"></a>**D25 (base-semantics)**: the diff is `merge-base(base, HEAD)..HEAD`, the way GitHub shows a PR; wave 3 makes `--base` optional ([D99 (named-bases)](#d99)).
- <a id="d27"></a>**D27 (category-defaults)**: a gap is a changed file with any uncovered changed executable line; high reach is 3 cells or more; LIFR also fires on `checks_run: 0` or an unreadable summary; a missing `.check/` is NOINST, never green. Amended by [D69 (category-from-change)](#d69) and [D80 (unmeasured-not-closed)](#d80).
- <a id="d28"></a>**D28 (config-file)**: weights and thresholds default in `libs/core/src/config.ts` and can be overridden by an `atis.config.json` at the reviewed repo's root.
- <a id="d30"></a>**D30 (pure-parsers)**: every CLI source is a thin runner over a pure parser tested from captured text, and the math lives in core, *because* tests should not need a throwaway repo.
- <a id="d32"></a>**D32 (terrain-from-base)**: the terrain is scanned from the merge-base extraction and the weather from a `HEAD` extraction; added files are placed by a second pass with base positions fixed, *because* the weather never moves the ground (P2).
- <a id="d33"></a>**D33 (svg-package)**: `libs/svg` is a pure `renderSvg(map): string`, *because* a renderer that reads only `map.json` stays swappable and golden-tests from fixtures.
- <a id="d34"></a>**D34 (layout-deps)**: `d3-force` (seeded, ticked) and `bubblesets-js` live in core; `earcut` and `elkjs` join at their level of detail, which is wave 2's `libs/scene`.
- <a id="d37"></a>**D37 (no-terrain-cache-yet)**: no terrain cache; a fixed seed and sorted inputs give one layout per base. Superseded in wave 3 by [D96 (terrain-cache)](#d96).
- <a id="d38"></a>**D38 (glance-is-a-step)**: a glance reading is a step the human runs and the builder records; a fail parks the encodings for `/plumbbob:refine` and does not fail the build, *because* §11 says fail means the encodings change.
- <a id="d39"></a>**D39 (two-graphs)**: depth, reach, deleted-export consumers and new cross-module edges each name which scan's graph they walk.
- <a id="d40"></a>**D40 (rename-identity)**: every list is keyed by head path, a deleted file keeps its base path, and a renamed file keeps its one base position with `from` beside it. The old-to-new leader waits for a second position, which wave 3's relayout supplies.
- <a id="d41"></a>**D41 (artifact-trust)**: `.check/` is trusted only through a schema-1 `summary.json`; a raw file is read only when its slot ran this time, and a stale live file is muted with its age.
- <a id="d43"></a>**D43 (scan-roots)**: the file universe is git's tracked files; workspace members (pnpm, npm, yarn, bun) are package cells; entry points are fallow's list unioned with every member's `bin`, `main` and `exports`.
- <a id="d46"></a>**D46 (head-is-a-commit)**: both sides of the map are commits, and only `.check/` is read from the working tree; wave 3's `--working-tree` is the one amendment ([D99 (named-bases)](#d99)).
- <a id="d47"></a>**D47 (dependency-delta)**: every workspace manifest is read at the merge-base and at `HEAD`, and a pure `diffManifests` returns `deps_added`; widened to range moves by [D83 (security-on-change)](#d83).
- <a id="d48"></a>**D48 (shore-groups)**: every tracked file outside the terrain belongs to exactly one shore group by a first-match rule table in config. `other` comes last and stays loud (a HUD block and a notice), *because* a quiet catch-all becomes a dumping ground. Amended by [D153 (shore-rail)](#d153): both renderers draw the shore as flat blocks in the chrome.
- <a id="d49"></a>**D49 (baseline-not-a-base)**: the merge-base is the only anchor; checkride's committed baseline may serve as an overlay that draws baselined findings muted, never as a base.
- <a id="d50"></a>**D50 (history-measured)**: the 5,000-commit window stays; `--verbose` prints per-source timings, and the first repo past about two seconds of `git log` earns a `--history <n>` cap.
- <a id="d51"></a>**D51 (motion-tokens-shared)**: §5.5's motion constants live in `libs/svg/src/tokens.ts` beside the colour tokens, so the still and the moving renderer read one file; [Q3 (flare-and-jiggle-numbers)](#q3) logs Rob's balance patches. From step 23 the file lives in `libs/scene/src/tokens.ts` ([D130 (token-home)](#d130)).
- <a id="d52"></a>**D52 (reach-from-scan)**: reach is computed in core from the scanned graph, with fallow's closure as a spot-check oracle, *because* fallow's flat list has no hop count.
- <a id="d53"></a>**D53 (pnpm-and-stub)**: pnpm throughout; the package is `@robmclarty/atis` and the command `atis`; publishing is Rob's, by hand, never a step.
- <a id="d55"></a>**D55 (cochange-weight)**: a ghost weighs severity × `(1 + rate)` × `(1 + log(1 + support))`.
- <a id="d56"></a>**D56 (fixtures-skip-audit)**: fixture runs skip checkride's `security` slot and name every skipped slot, *because* an audit against today's advisories is the calendar's weather, not the PR's.
- <a id="d58"></a>**D58 (fixtures-current-toolchain)**: a fixture's tree is historical and its harness current (the latest checkride and fallow, run through the installed binary); mutation is kept only where the run completes.
- <a id="d59"></a>**D59 (outside-fixtures)**: fixtures are outside projects' reviewed PRs. A *hold* is the commit a human reviewer requested changes on for a substantive problem; a *merge* is the approved head of a PR whose human reviews asked for nothing. The ground truth is the reviewer's quoted comment, and bot reviews are ignored.
- <a id="d60"></a>**D60 (fixture-balance)**: a reading's five fixtures come from five PRs in at least three repos, three of one verdict and two of the other, with the split kept from the reader and never two snapshots of one PR.
- <a id="d61"></a>**D61 (round-one-fixtures-frozen)**: a finished reading's fixtures stay frozen as its record; later fixtures land beside them in neutral folders.
- <a id="d62"></a>**D62 (retake-reader-blind)**: the reader reads blind. The builder selects and generates the fixtures, prepares shuffled copies and holds the key; pauses and commit bodies name no repo, PR or verdict until the verdicts are in, and a one-reader result says so beside its line.
- <a id="d63"></a>**D63 (retake-in-this-build)**: §11's "round two" means the phase-2 reading; the map-and-svg build's retake was round one's.
- <a id="d64"></a>**D64 (fixture-eligibility)**: any TypeScript or JavaScript repo on pnpm, npm, yarn or bun, with a PR of 3 to 30 changed source files; coverage is pointed at `.check/coverage/coverage-final.json`; at most one git-only fixture in five; Go arrives later as its own producer. Amended by [D126 (typescript-corpus)](#d126): the changed source files are TypeScript, counted as `classifyFile` counts them.
- <a id="d65"></a>**D65 (notice-precision-reading)**: a notice counts for criterion 5 only when it targets the file or cell the truth names *and* its kind bears on the finding; each call is recorded with its reason.
- <a id="d66"></a>**D66 (legend-briefing)**: every reader hears the same fixed legend before the first map: what each mark and block measures, never how to weigh it.
- <a id="d67"></a>**D67 (standing-state-notices)**: a red slot is on the change only through a changed file it names (and `test` through a failing test that imports one); everything else is standing state, drawn and counted but never ranked.
- <a id="d68"></a>**D68 (standing-state-storms)**: only a storm over a changed file keeps its IFR bolt and label; standing storms are small graphite terrain, and a global red slot draws no storm.
- <a id="d69"></a>**D69 (category-from-change)**: the IFR rung for a red slot fires only on the change's red; the LIFR rungs for a broken harness and a vacuous green stay.
- <a id="d70"></a>**D70 (gate-blocks)**: the HUD's `Gate <n> red` or `Gate pass` counts the change's red slots, and `Standing <n> red` counts the wholly standing ones; each red slot sits in exactly one block.
- <a id="d71"></a>**D71 (lit-gaps)**: a changed file's skin lights its uncovered share and draws its covered share as a dim hairline; a live mutant is a lit notch.
- <a id="d72"></a>**D72 (tier-ring-not-evidence)**: a secondary notice's ring is drawn in `LEADER_INK`, clear of the skin, never in the evidence light.
- <a id="d73"></a>**D73 (touched-file-breach)**: a `health` or `dupes` red is on the change only where its finding's lines meet a head-side hunk. Wave 3's base-side delta replaces this line rule with "new, or worse than at the base" ([D98 (base-side-structure)](#d98)). Amended by [D140 (changed-file-reds)](#d140), which extends the rule to `dead`.
- <a id="d74"></a>**D74 (failing-test-rank)**: the heaviest failing test on the change takes the first notice slot, ahead of weight order.
- <a id="d75"></a>**D75 (public-surface-width)**: a name a published member exposes, directly or through re-export chains followed by name, reads as wide whatever its cell's fan-in.
- <a id="d76"></a>**D76 (interface-shape)**: the scan fingerprints each exported declaration's shape with the compiler; an interface notice needs a name added, removed or reshaped, and an inferred type is recorded as not compared, never as unchanged. Amended by [D81 (interface-move-kinds)](#d81) and [D118 (inferred-shapes)](#d118).

**This build's calls.** These are plan-time defaults that stand unless Rob overrules them at the plan pause or at a refine. Each wave's calls are written now so the plan stands alone, and the refine at that wave's boundary may sharpen them.

- <a id="d79"></a>**D79 (waves)**: the build runs in six waves in phase order, each opened by a `### Wave n` heading under Steps: wave 0 finishes phase 1, then phases 1b, 2, 3, 4 and 5 follow. Wave 0's steps are sharp. Each later wave is the plan of record until `/plumbbob:refine` sharpens it at the boundary before it, and `/plumbbob:step` sharpens single steps just in time, *because* Rob asked for every remaining item in waves by phase, and each wave ends on a result (a reading, a spike's verdict, a measured budget) that can reshape the next.
- <a id="d80"></a>**D80 (unmeasured-not-closed)**: a changed source file whose code emits JavaScript, and which a coverage report that exists does not name, is *unmeasured*. It reads as a gap of unknown size: its skin is lit whole; [D27 (category-defaults)](#d27)'s gap rungs apply, so it is never VFR; and `uncovered-high-reach` can name it with a why saying no test run measured it. The Patch cov block counts it beside the measured share. The scan marks which files emit code, so a type-only file is never unmeasured; neither is a deleted file; and a map with no coverage channel stays muted ([C2 (never-fake)](#c2)), *because* VFR means the evidence is closed, and a file the report never names is a file no test is known to have run. Today `hasGap` at `libs/core/src/evidence.ts:602` reads it as closed. Amended by [D122 (excluded-from-coverage)](#d122) and [D141 (unmeasured-lines)](#d141).
- <a id="d81"></a>**D81 (interface-move-kinds)**: `interface-change` splits by what moved. A removed or reshaped name keeps `interface-change` (severity 8, beside `deleted-export`). Names only added raise `interface-added` (severity 3: a new surface to read, nothing broken). A file whose only movement is names the scan could not compare raises `interface-uncompared` (severity 2, its why saying so). Each kind sits in [D9 (thresholds)](#d9)'s severity table, amending [D76 (interface-shape)](#d76), *because* after the fifth pass `interface-change` sat in the top three on all five retake maps (one of five before). Three of those were uncompared shapes and one a name merely added, which pushed remeda's live mutants on the buggy line from first to third. Amended by [D123 (mixed-interface-moves)](#d123).
- <a id="d82"></a>**D82 (moved-name-readers)**: an interface notice (any kind of [D81 (interface-move-kinds)](#d81)) and a `deleted-export` notice weigh by the in-repo files that import a moved name, followed through re-exports by name as [D75 (public-surface-width)](#d75) walks them. The factor is `1 + log(1 + readers)`, beside §5.4's reach, evidence and history, *because* reach counts the cells a file reaches, not who reads the names that moved. trpc's reshaped public key types ranked fifth behind a sibling at the same severity and reach, ordered by history and uncovered share instead. Amended by [D124 (readers-graph)](#d124).
- <a id="d83"></a>**D83 (security-on-change)**: a `security` advisory is the change's when one of its dependency paths runs through a package this change added or whose range it moved. `diffManifests` gains `deps_moved` beside `deps_added`, widening [D47 (dependency-delta)](#d47), and each such package raises one `security-finding` naming it. Every other advisory is standing state, counted in the Standing block and never ranked, which extends [D67 (standing-state-notices)](#d67) to `security`, *because* the candidate today counts every advisory in the lockfile: the calendar's weather, not the PR's ([D56 (fixtures-skip-audit)](#d56) only hid it on fixtures). `security.json`'s advisories already name the module and every path that pulls it in.
- <a id="d84"></a>**D84 (build-output-is-shore)**: files under `dist/`, `build/` or `out/` directly beneath a workspace member or the root form a `build` shore group, a new row in [D48 (shore-groups)](#d48)'s table, and are never terrain; a hand-written `.d.ts` elsewhere stays terrain, *because* a committed `dist/` scans as a second copy of the code with a depth of its own, and the shore table grows a named group rather than leaning on `other`.
- <a id="d85"></a>**D85 (schema-bumps)**: `map.json` stays at `schema_version: 1` while keys are only added, each new key optional and absent when its source is missing ([C2 (never-fake)](#c2)). A key that changes shape or meaning bumps the version, and `assertMap` then reads the current version alone. The bumping step regenerates every map a test or a later reading reads; the maps a finished reading was judged on stay as its record, under the version they were read in ([D61 (round-one-fixtures-frozen)](#d61)), *because* atis is greenfield with no reader outside this repository, and a reader for an old version would be compatibility for a format nothing will send.
- <a id="d86"></a>**D86 (svg-stays-the-fixture)**: the still SVG stays the glance fixture format and `--comment`'s fallback image, and every encoding lands in both renderers from one map ([D33 (svg-package)](#d33), §15's R5), *because* a deterministic still is what fixtures diff, and what a reader can be shown with no GPU.
- <a id="d87"></a>**D87 (legend-inset)**: every map carries a compact legend inset in its chrome (the SVG from wave 0, the world's HUD from wave 2) naming what each mark measures in a few words. Every reading opens with an annotated practice map that is never scored, drawn from a retake fixture, whose truth is already unsealed and whose repo no later reading uses, *because* the retake's reader was "just guessing and intuiting" after one read of [D66 (legend-briefing)](#d66)'s legend, and a key on the map does not depend on memory.
- <a id="d88"></a>**D88 (precision-corpus)**: the builder scores §11's criterion 5 (the reviewed finding in the top three notices), read per [D65 (notice-precision-reading)](#d65), on a corpus of twelve outside PRs. They are chosen by [D59 (outside-fixtures)](#d59)'s rules and eligible per [D64 (fixture-eligibility)](#d64), come from at least five repos that neither round one nor the retake read, and are selected only after wave 0's fixes are checkpointed. Six are the tuning half, scored first. The other six are held out: three holds and three merges, from at least three repos. Their maps are generated only after every fix the tuning half prompts has landed, and they are scored after the blind reading. Five of the held-out six are that reading's ([D119 (svg-reading)](#d119)), so the whole corpus follows [D62 (retake-reader-blind)](#d62) until the reading is done, *because* criterion 5 needs no blind reader, the reader is the scarce resource, and a held-out half keeps the builder from tuning to what it scores. Amended by [D127 (tuning-loop)](#d127), [D128 (held-out-chosen-late)](#d128) and [D129 (precision-on-holds)](#d129).
- <a id="d89"></a>**D89 (spike-on-a-fixture)**: the phase-1b spike runs through `/plumbbob:spike` in a throwaway worktree at the wave-0 boundary, on a retake fixture's real `map.json` rather than on fake data; only its verdict and the motion tokens it settles land (step 22), *because* phase 1 left real maps, taste judged on real terrain is the taste that matters, and the spec makes the spike disposable.
- <a id="d90"></a>**D90 (scene-lib)**: a fourth pure package, `libs/scene`, turns `map.json` into everything the world draws short of a GPU call: the heightfield and its bumps, membrane triangles, organelle instances, weather attributes, label placements, the level-of-detail plan, picking geometry and the motion scheduler. `apps/web` is a thin three.js and DOM shell over it, and `libs/svg` reads its weather derivations so the two renderers cannot drift, *because* render code is hard to test while the decisions inside it are not, and `--png` and any later renderer reuse the same model (§15's R8).
- <a id="d91"></a>**D91 (web-stack)**: `apps/web` ([D19 (packages)](#d19)) is a Vite app. The world is vanilla three.js: `WebGPURenderer` with its automatic WebGL 2 fallback, TSL node materials, and bloom on emissive light only. React 19 draws the DOM chrome. Labels go through `CSS2DRenderer` with SVG leaders, and `camera-controls` drives the orthographic camera. One render loop owns the scheduler and the cross-fades, and every dependency is installed at its latest release, *because* §15 settled this stack under [D1 (technology)](#d1), and greenfield means current versions.
- <a id="d92"></a>**D92 (serve-and-open)**: `atis --base <ref>` with none of `--out`, `--svg` or `--png` builds the map, serves `apps/web`'s built assets and the map on `127.0.0.1` at an ephemeral port, opens the tab unless given `--no-open`, and runs until interrupted, then exits 0. `--out` and `--svg` still write their files and exit, *because* [D18 (delivery)](#d18) makes v1 a command that opens a tab, and [C4 (never-blocks)](#c4)'s exit codes still hold. Amended by [D133 (served-assets)](#d133).
- <a id="d93"></a>**D93 (app-reads-what-it-is-served)**: the app reads only what `atis` serves it: the map, the built assets, and, in served mode only, read-only paths the CLI fills (`/check/<slot>` raw output from wave 2, `/diff/<path>` from wave 3, the watch socket from wave 4). A fixture or a `--png` capture carries the map alone, and every HUD part degrades to what the map holds, *because* §9.2 keeps the renderer off git, `.check/` and fallow, and the glance test must reproduce from a fixture.
- <a id="d94"></a>**D94 (seeded-motion)**: the scheduler takes an injected clock and a seeded random source, so one seed and one time give one frame. Random flares stay random to a reader and reproducible to a test and to `--png`, extending [C3 (deterministic)](#c3) to the world, *because* §5.5's random intervals would otherwise make every capture and every motion test a dice roll.
- <a id="d95"></a>**D95 (round-two-reading)**: glance round two, §11's phase-2 run per [D63 (retake-in-this-build)](#d63), reads five fresh outside fixtures in the world. They come from repos no earlier reading or corpus used. The reading is blind and briefed per [D59 (outside-fixtures)](#d59), [D60 (fixture-balance)](#d60), [D62 (retake-reader-blind)](#d62), [D64 (fixture-eligibility)](#d64) to [D66 (legend-briefing)](#d66) and [D87 (legend-inset)](#d87). Each reader sees the world's opening frame for ten seconds, with motion on and input off. With more than one reader, each is scored alone and the round passes when most readers pass, *because* the opening frame is §5.6's ten-second frame, the load flare is part of the encoding, and how readers collapse to one verdict was the protocol hole parked at round one.
- <a id="d96"></a>**D96 (terrain-cache)**: the base scan, history and layout are cached per base SHA at `.atis/terrain/<sha>.json` under the reviewed repo. Each entry is also keyed by atis's version and a hash of the config, and written atomically. `.atis/.gitignore` holds `*`, so atis never edits the repo's own ignores. `--no-cache` bypasses the cache. It supersedes [D37 (no-terrain-cache-yet)](#d37), *because* §8 caches per base, and §15's 2 s first frame needs it. Amended by [D137 (cache-key)](#d137).
- <a id="d97"></a>**D97 (incremental-relayout)**: a new base's layout starts from the nearest cached ancestor's positions, so a file that kept its path starts where it was, and relaxes with the seeded simulation. The head's own layout, relaxed the same way from the base's, gives a renamed file the second position [D40 (rename-identity)](#d40) waits for. Displacement of unchanged files is measured and bounded in a test, *because* P2's stable terrain must hold across bases, not only within one (Codemap's consistency).
- <a id="d98"></a>**D98 (base-side-structure)**: base-side metrics come from running the reviewed repo's own fallow ([D22 (local-fallow)](#d22)) for `health`, `dupes` and `dead` on both extractions, cached with the terrain. With both sides measured, a `health` or `dupes` finding is the change's when it is new or worse than at the base, replacing [D73 (touched-file-breach)](#d73)'s line rule; a cycle or boundary violation is "introduced" when it is absent at the base; `improvements` and Health Δ come alive; and coverage, mutants and tests keep no base side. This lifts [D23 (head-only-check)](#d23) for the structural slots only, *because* fallow reads a tree without installing it, while a base-side coverage would mean running the repo's tests, which atis never does.
- <a id="d99"></a>**D99 (named-bases)**: `--base` becomes optional; when it is absent, atis resolves the configured `trunk`, else the first of `main`, `master`, `develop` and `trunk` that exists (local, then `origin/`), and diffs from the merge-base as [D25 (base-semantics)](#d25) does. The shortcuts `--last-commit` (`HEAD~1`), `--last-tag` (the newest tag reachable from `HEAD`) and `--head <ref>` (any two refs) join it, and two that conflict are misuse. `--working-tree` reads the head side from the working tree, `meta.head` reads `working-tree`, and [C3 (deterministic)](#c3) holds only on a clean tree, amending [D46 (head-is-a-commit)](#d46), *because* §8 names these bases and a reviewer's first question is usually "against what". Amended by [D135 (evidence-for-head)](#d135).
- <a id="d100"></a>**D100 (sequence-frames)**: `--range a..b` writes one map: its terrain is `merge-base(a, b)`'s, its `weather` and `notices` are `b`'s, and an added `sequence.frames[]` holds each commit's weather and notices in order, so a reader that knows nothing of frames still reads the map, *because* §8's sequence is weather moving over one terrain, and an added key keeps schema 1 ([D85 (schema-bumps)](#d85)). Amended by [D135 (evidence-for-head)](#d135).
- <a id="d101"></a>**D101 (whole-repo-mode)**: `--whole-repo` writes a map with `meta.mode: "repo"`, empty weather and an `overlays` key. The overlays are trouble spots (churn × complexity), ugly spots (thresholds and maintainability), coverage gaps, dead code, duplication, cycles, recent heat over the last N commits, and checkride's committed baseline drawn muted ([D49 (baseline-not-a-base)](#d49)). Each overlay is absent when its source is, *because* §8 makes whole-repo state a mode with overlays, while P6 keeps the delta the default.
- <a id="d102"></a>**D102 (file-and-diff-levels)**: §12's "L2 file level" is §6's LOD3 (one file: functions as granules, hunks, a coverage strip, mutants) and LOD4 (the diff). Organelles gain `functions[]` from the scan and `health.json`. The diff text is served by the CLI at `/diff/<path>` rather than carried in the map, beside an editor deep link built from a configurable URL template, *because* §6 numbers the cell LOD2, and diff text would swell every map for a level few readers open.
- <a id="d103"></a>**D103 (health-radar)**: the health radar is CHID's radar of a changed file's raw metrics (cyclomatic, cognitive, CRAP, size, churn, bug-fix rate, fan-in, fan-out), categorised against [D9 (thresholds)](#d9) or raw by a toggle, drawn in the flat chrome, *because* §7 puts it one click from the HUD.
- <a id="d104"></a>**D104 (subcommands)**: verbs that are not a map (`fingerprint`, `mcp`) are subcommands, `atis <verb>`; no verb means the map, with every flag as before, *because* `util.parseArgs` with no positionals cannot grow verbs, and a flag per verb would read as an option of the map.
- <a id="d105"></a>**D105 (png-capture)**: `--png <file>` serves the world and drives a headless browser ([Q37 (png-browser)](#q37)) to a fixed viewport, with the scheduler frozen at a set time and reduced motion on. It waits for a ready flag the app raises after its first complete frame, using WebGPU where the browser has it and WebGL 2 otherwise, *because* §15 makes the PR image the same render as the tab (R5).
- <a id="d106"></a>**D106 (watch-mode)**: `--watch`, in served mode only, rebuilds the map when `HEAD`, the index or `.check/summary.json` changes, debounced, reusing the cached terrain, and pushes it to the tab over a WebSocket on the same loopback port. Its shape is borrowed from weft's `packages/watch` (in `~/Projects/fascicle/code/weft`) and cited, *because* §12 names weft-watch, and the cache makes a rebuild cheap without moving the terrain (P2).
- <a id="d107"></a>**D107 (fingerprint)**: `atis fingerprint --out <svg>` renders the terrain alone (no weather, no notices) at a small fixed size, byte-identical for one commit, for a README; a documented GitHub Actions workflow may refresh it daily, and atis never installs one, *because* GitHub Next's repo-visualizer showed that structural change becomes noticeable by familiarity.
- <a id="d108"></a>**D108 (pr-comment)**: `--comment` is explicit, and one of the two networked commands. It finds the branch's PR with `gh` and posts, or updates, a single comment holding the HUD as a table, the notices with their whys and thresholds, and the image ([Q38 (comment-image)](#q38)), *because* §12 makes the PR comment optional, and §10 lets only an explicit command reach the network.
- <a id="d109"></a>**D109 (installable-package)**: the published `@robmclarty/atis` bundles core, svg and scene into its `dist/` and ships the built web app beside them, so its `dependencies` name no private workspace package; `typescript` stays a runtime dependency for the scan, *because* `apps/atis/package.json` depends on `core` and `svg` as `workspace:*` today, and pnpm would publish those as version ranges no registry holds. Amended by [D133 (served-assets)](#d133).
- <a id="d110"></a>**D110 (mcp-tools)**: `atis mcp` runs a stdio MCP server with `highlight` (sends the open tab a target to fly to and light, over the watch socket), `reach` (a file's reach from the current map) and `explain` (a notice's why, inputs and thresholds), reading only the map the serving process holds, *because* §12's phase 5 lets an agent point at the map, and wave 4's socket already reaches the tab. Amended by [D138 (mcp-finds-tab)](#d138).
- <a id="d111"></a>**D111 (symbol-reach)**: reach gains a symbol level: each changed exported name reaches the files that import it, followed through re-exports by name, and `weather.reach[]` entries gain the `names` that carried them. Fallow's `--symbol-impact` is the spot-check oracle, as its `--impact-closure` was for file reach ([D52 (reach-from-scan)](#d52)). The file-level glow stays the default, *because* file-level reach over-reads a barrel that re-exports many names.
- <a id="d112"></a>**D112 (tour-is-separate)**: the annotator is a separate, opt-in package, `apps/tour`, that reads a map and writes `tour.json` (ordered stops: a target, one sentence, the notice it explains) through fascicle. atis never imports it, and the world plays a tour only when one is served beside the map, *because* §10 says atis needs no LLM, and fascicle needs Node 24 while atis runs on Node 22.18 and up.
- <a id="d113"></a>**D113 (go-producer)**: Go arrives as a second producer in `apps/atis/src/sources/go.ts` that fills the same `Scan` core reads. Packages are cells, `main` packages are entry points and `_test.go` files are tests, all from `go list -json`. Exported names and their shapes come from a small Go helper the CLI runs with `go run`, so atis ships no per-platform binary and core never learns a language, *because* [D64 (fixture-eligibility)](#d64) parks Go as its own producer, never a widening of the TypeScript scan, and Rob's work is moving to a Go backend. Amended by [D139 (inert-helpers)](#d139).
- <a id="d114"></a>**D114 (producers-compose)**: every producer whose files a commit tracks runs (TypeScript, Go, Python, Terraform, shell), and their scans merge into one `Scan`. A file belongs to the one producer that claims its extension. The scan, not core, gives each file its kind (source, test or other) and names a directory's barrel where the language has one, so core keeps no language's rules. Edges never cross languages in this build. A producer can be switched off in `atis.config.json`, and one whose toolchain is missing leaves its files where the shore table puts them and says why in `meta.instruments` ([C2 (never-fake)](#c2)). No producer executes the reviewed code or reaches the network (Go runs with `GOPROXY=off`), and [D80 (unmeasured-not-closed)](#d80) counts a file unmeasured only against a coverage report for its own language, *because* Rob's repos mix languages (a Go backend, Terraform infrastructure, shell beside TypeScript), one terrain must hold them all for P2's stable picture, and today `classifyFile` knows only TypeScript's extensions (`libs/core/src/modules.ts:56`).
- <a id="d115"></a>**D115 (python-producer)**: Python is a producer in `apps/atis/src/sources/python.ts`. A package is a cell with `__init__.py` as its barrel, and a namespace package is a directory cell. Imports, absolute within the project and relative, are the edges, with third-party imports dropped. Entry points are `[project.scripts]` targets, `__main__.py` and modules with a `__main__` guard; `test_*.py`, `*_test.py`, `conftest.py` and files under `tests/` are tests; exports are `__all__`, else the public top-level names, each shaped by its signature and annotations. A helper the CLI runs with the repo's own Python reads all of it with `ast` alone and never imports the code, *because* Python's packages, barrels and tests map onto cells, membranes and stitches almost one for one, and the repo's own interpreter parses the syntax its code is written in. Amended by [D139 (inert-helpers)](#d139).
- <a id="d116"></a>**D116 (terraform-producer)**: Terraform is a producer in `apps/atis/src/sources/terraform.ts`. A directory of `.tf` files is a module and a cell, each file an organelle. A `module` block with a local `source` is an edge from caller to callee, root modules (called by no other module) are entry points, and `*.tftest.hcl` files are tests. A module's `variable` and `output` blocks are its interface, each shaped by its type and default, so an interface notice fires when one is added, removed or retyped. Registry and git module sources and provider version constraints are its dependencies and join the dependency delta ([D47 (dependency-delta)](#d47)). A JavaScript or WASM HCL parser shipped with atis reads it all, so neither `terraform` nor `terraform init` is needed, *because* a module's variables and outputs are the thin skin over a large body that the membranes and [D5 (reach-by-module-hop)](#d5) already draw, while the plan diff, the true blast radius, needs credentials and state atis never touches ([Q39 (other-language-evidence)](#q39)).
- <a id="d117"></a>**D117 (shell-producer)**: shell is the lightest producer, in `apps/atis/src/sources/shell.ts`. Each `.sh` or `.bash` script is an organelle in its directory's cell. `source` and `.` lines, and invocations of a tracked script by its path, are the edges; executable scripts that nothing sources are entry points; functions defined in a sourced script are its exports, shaped by name alone; and `*.bats` files are tests. A JavaScript or WASM shell parser shipped with atis reads them, and the shore's `*.sh` row then holds only what the producer leaves when it is switched off, *because* Rob asked for shell beside Python and Terraform (2026-10-08), and a sourcing graph, with shellcheck's findings as conformance ([Q39 (other-language-evidence)](#q39)), is the structure shell honestly has.

**Settled at refine pass one.** Rob took the leans on [Q34 (inferred-shapes)](#q34) to [Q36 (added-vs-modified)](#q36) and [Q41 (lib-globals)](#q41) to [Q60 (inert-helpers)](#q60) on 2026-10-22. Each line below records one, and each decision it amends points back to it.

- <a id="d118"></a>**D118 (inferred-shapes)**: the scan compares an inferred export's shape with the type checker, bounded: only names `isolatedDeclarations` flags, only in changed interface files, over a program of the in-tree imports and the bundled default lib, timed under `--verbose`, with step 50 taking the cost if it runs past a few seconds on the largest corpus repo. A name the checker cannot print, or whose checked type reaches an unresolved symbol (the checker's error type, which prints as `any`), stays `interface-uncompared`, amending [D76 (interface-shape)](#d76), *because* three of the five top-three `interface-change` notices on the refreshed retake maps came from inferred shapes, each on an edit that may not have changed a type, while an extracted tree has no `node_modules`, so an external type prints `any` on both sides and would compare equal ([C2 (never-fake)](#c2)) (resolves [Q34 (inferred-shapes)](#q34) and [Q44 (unresolved-shapes)](#q44)).
- <a id="d119"></a>**D119 (svg-reading)**: wave 0 ends with a blind reading on the SVG as well as the builder-scored corpus. Rob reads five of the held-out six at step 20, after the legend and the practice map, recorded as "round one, second retake", so §11's round two stays the reading in the world ([D63 (retake-in-this-build)](#d63)). A fail parks its encodings and a refine runs before wave 1, never stopping the build ([D38 (glance-is-a-step)](#d38)), *because* the corpus scores criterion 5 without a reader but cannot score criteria 3 and 4, and if round two then failed on encodings no reader had passed, nobody could tell the encodings' fault from the material's (resolves [Q35 (svg-reading)](#q35)). Amended by [D144 (working-system-first)](#d144).
- <a id="d120"></a>**D120 (added-vs-modified)**: an added file keeps the one change hue, and its path is written with a leading `+` wherever the map writes paths: notice rows now, and the world's hover tags and labels from wave 2. The legend says so, *because* every free hue already means something (since [D71 (lit-gaps)](#d71) the evidence light is near-white, and the categories and reach hold the rest), [C11 (one-meaning-per-channel)](#c11) forbids a second meaning, and a new file and an edited one are different reviews (resolves [Q36 (added-vs-modified)](#q36)).
- <a id="d121"></a>**D121 (lib-globals)**: step 2's struct rule also fails on what reaches a lib with no import: Node's globals (`process`, `Buffer`, `require`, `__dirname`, `__filename`) and the unseeded clock and random source (`Math.random`, `Date.now`, `performance.now`, an argument-less `new Date()`), in `libs/*/src` outside `__tests__/`, widening [C1 (core-is-pure)](#c1), *because* `libs/scene` runs in the browser, where Vite defines no `process`, so one stray reference breaks the tab while every Node test passes, and [C3 (deterministic)](#c3) and [D94 (seeded-motion)](#d94) already rule the clock and random out of the layout and the scheduler (resolves [Q41 (lib-globals)](#q41)).
- <a id="d122"></a>**D122 (excluded-from-coverage)**: a changed file the repo leaves out of its coverage on purpose stays unmeasured under [D80 (unmeasured-not-closed)](#d80), its why saying the report does not name it, and no exemption list joins `atis.config.json`. A report that names none of the tree's source files is a broken channel: coverage is muted with that reason in `meta.instruments`, as [D41 (artifact-trust)](#d41) mutes a stale file, *because* Vitest 4 reports an unloaded file that matches `include`, so in a repo shaped like this one only excluded files go unnamed (here `cli.ts`, which fifteen later steps edit), an exemption would read VFR over code no run measured, and `parseCoverage` makes the report's keys relative to `--repo`, so a `.check/` from another checkout matches nothing and would light every changed file (resolves [Q42 (excluded-from-coverage)](#q42)).
- <a id="d123"></a>**D123 (mixed-interface-moves)**: a file with names added and others uncompared, and none removed or reshaped, raises `interface-added`, its why naming the uncompared names too, amending [D81 (interface-move-kinds)](#d81), *because* a notice takes the heaviest move the scan can prove, and an uncompared name proves nothing (resolves [Q43 (mixed-interface-moves)](#q43)).
- <a id="d124"></a>**D124 (readers-graph)**: [D82 (moved-name-readers)](#d82) counts readers on the head graph for names added, reshaped or left uncompared, and a `deleted-export` notice counts its live consumers as `liveConsumers` already does: the base graph's importers, kept only where the head still takes the name, *because* [D39 (two-graphs)](#d39) has every walk that straddles base and head name its graph, and the head's readers are who the change reaches (resolves [Q45 (readers-graph)](#q45)).
- <a id="d125"></a>**D125 (practice-map-current)**: step 15 draws the practice map's callouts by script from the legend's list of marks, and step 20 opens by re-rendering `docs/glance-practice.svg` and checking each callout against the legend, *because* the fixes the tuning half prompts land between the two, and a reader briefed on a stale map is briefed on marks the held-out maps no longer carry (resolves [Q46 (practice-map-current)](#q46)).
- <a id="d126"></a>**D126 (typescript-corpus)**: [D88 (precision-corpus)](#d88)'s corpus and [D95 (round-two-reading)](#d95)'s fixtures draw PRs whose 3 to 30 changed source files are TypeScript by `classifyFile`'s rule, amending [D64 (fixture-eligibility)](#d64). JavaScript as terrain, which the TypeScript producer could read through `allowJs`, is weighed at the wave-4 boundary beside the other languages, *because* the scan runs with `allowJs: false` and `classifyFile` takes only `.ts`, `.tsx`, `.mts` and `.cts`, so a JavaScript repo's map has no cells, and the Frame keeps this build to five languages (resolves [Q47 (typescript-corpus)](#q47)).
- <a id="d127"></a>**D127 (tuning-loop)**: the tuning half is scored once, at step 18, and prompts at most one refine pass. Its fixes are judged only on the held-out half, never by re-scoring the tuning six, and any miss that pass leaves is parked past step 20, amending [D88 (precision-corpus)](#d88), *because* re-scoring after each fix is an open loop that tunes the encodings harder to six fixtures the builder chose, and the map-and-svg build ran five refine passes (resolves [Q48 (tuning-loop)](#q48)).
- <a id="d128"></a>**D128 (held-out-chosen-late)**: step 16 selects only the tuning six. The held-out six (three holds and three merges, from at least three repos the tuning half did not use) are selected at step 19, after the tuning half's fixes have landed, and their maps are generated there. The five-repo floor spans both halves, and [D62 (retake-reader-blind)](#d62) covers both, amending [D88 (precision-corpus)](#d88), *because* choosing a hold means reading its finding, so a builder who chose all twelve first would design the tuning fixes already knowing the held-out findings, which is the tuning D88's held-out half exists to prevent (resolves [Q49 (held-out-chosen-late)](#q49)).
- <a id="d129"></a>**D129 (precision-on-holds)**: the tuning six are all holds, the held-out six stay three holds and three merges, and step 20 scores criterion 5 on the held-out holds, with merges n/a as before, amending [D88 (precision-corpus)](#d88), *because* a merge has no finding to rank (round one and the retake scored it n/a), so merges in the tuning half score nothing, while the held-out merges in the blind reading check that tuning on holds has not made the map louder (resolves [Q50 (precision-on-holds)](#q50)).
- <a id="d130"></a>**D130 (token-home)**: `tokens.ts` moves from `libs/svg/src/` to `libs/scene/src/` at step 23, with the step-22 motion tokens, and `libs/svg` and the web app import it from `scene`, so one file still holds every colour and motion constant ([D51 (motion-tokens-shared)](#d51)), *because* step 26's `weatherOf` needs `REACH_DECAY` and step 29's scheduler needs the motion tokens, so a scene reading them from `svg` while `svg` reads the scene's weather would make the two packages import each other, which `tsc --build`'s project references refuse (resolves [Q51 (token-home)](#q51)).
- <a id="d131"></a>**D131 (svg-migration-step)**: step 26 builds and tests `weatherOf` alone, and step 88, built right after it, moves `libs/svg` onto it, proved by `libs/svg/fixtures/demo/atis.svg` and the four category goldens staying byte-identical, *because* rewiring the 602-line `libs/svg/src/weather.ts` in the diff that introduces its derivation is too much to review in one pass, and a golden that moves there cannot tell a drift from an intended change (resolves [Q52 (svg-migration-step)](#q52)).
- <a id="d132"></a>**D132 (world-smoke-test)**: step 30 adds a smoke test to the gate. It renders a fixture's map headless on the WebGL 2 path, served by Vite in-process rather than from a shared `dist/`, and fails on a blank frame or a console error, so [Q37 (png-browser)](#q37) settles at the wave-1 boundary instead of the wave-3 one, *because* the world's GPU code sits outside the coverage thresholds and its steps are judged by screenshots at the pause, so without it 26 later steps could break the world while `pnpm check` stays green, and a test that built into a shared `dist/` would race the `types` slot as step 1's suite did (resolves [Q53 (world-smoke-test)](#q53)).
- <a id="d133"></a>**D133 (served-assets)**: `serve` takes its asset directory as an argument, and its tests pass a temp directory with a stub `index.html`. The CLI finds a `web/` directory beside its own `dist/`, which `pnpm build` fills by building `apps/web` and copying it there, the layout the tarball ships ([D109 (installable-package)](#d109)), and with none there `atis` exits 2 naming `pnpm build`. `--open` keeps opening the SVG beside `--svg`, and served mode takes `--no-open` through `parseArgs`'s `allowNegative`, amending [D92 (serve-and-open)](#d92), *because* `pnpm build` is `tsc --build`, which never runs Vite, a serve test that built the app itself would reopen step 1's race, and a path the workspace and the package share is tried on every run rather than first at step 72's pause (resolves [Q54 (served-assets)](#q54)).
- <a id="d134"></a>**D134 (loopback-trust)**: every server atis starts answers only a `Host` of `127.0.0.1:<port>` or `localhost:<port>`. The URL it opens carries a random token made per run, which the map, `/check`, `/diff`, the socket and `POST /base` require, and the socket and the POST also check `Origin`. `/check/<slot>` and `/diff/<path>` answer only for slots and paths the map holds, and `POST /base` takes only a ref `git rev-parse --verify` resolves to a commit, never one starting with `-`. [C13 (loopback-only)](#c13) gains these rules and names `POST /base` as its one write, *because* binding loopback keeps other machines out but not other tabs: through DNS rebinding a page can read a loopback server's answers (the map, the raw check output, the diff text), a WebSocket has no same-origin rule, and the port can be scanned (resolves [Q55 (loopback-trust)](#q55)).
- <a id="d135"></a>**D135 (evidence-for-head)**: `.check/` is read only when the map's head is the checked-out `HEAD`, or the tree itself under `--working-tree`. Any other head reads git-only with the reason in `meta.instruments`, and a range carries evidence only on a frame whose commit is `HEAD`, amending [D99 (named-bases)](#d99) and [D100 (sequence-frames)](#d100). checkride's `summary.json` is to gain the commit it ran on and whether the tree was dirty (checkride's work, tracked there), after which atis also mutes a `.check/` that predates `HEAD`, *because* `.check/` describes whatever the working tree held when checkride last ran and records no commit, so a map of `--head v1.2` would draw today's coverage and red slots as v1.2's ([C2 (never-fake)](#c2)) (resolves [Q56 (evidence-for-head)](#q56)).
- <a id="d136"></a>**D136 (first-frame-clock)**: wave 3's 2 s runs from the command to the app's first complete frame, the ready flag [D105 (png-capture)](#d105) waits on, with the browser already running. To fit, the head scan re-reads only the files the diff touched over the cached base scan, step 51's head-side fallow run is cached per head commit beside the terrain, and step 50 records each leg per repo. [C14 (world-budget)](#c14) keeps the renderer's 2 s from the map's arrival beside it, *because* the Frame and step 50 promise the reviewer's wait, while [D96 (terrain-cache)](#d96) caches the base side only, and a full head scan and fallow run on a repo of a few thousand files could spend the 2 s alone (resolves [Q57 (first-frame-clock)](#q57)).
- <a id="d137"></a>**D137 (cache-key)**: each terrain cache entry is keyed by a hash of atis's own built files, read at startup (its sources, under vitest), in place of atis's version, beside the config's hash, amending [D96 (terrain-cache)](#d96), *because* the workspace's version stays `0.0.0` while steps 51, 62 and 79 to 84 change what a base scan holds, so a version key would hand an old terrain to every later run on a cached base, and no golden touches the cache to notice (resolves [Q58 (cache-key)](#q58)).
- <a id="d138"></a>**D138 (mcp-finds-tab)**: the serving process writes `.atis/serve.json` under the reviewed repo (port, token and pid, readable by its owner alone, removed on exit), and `atis mcp`, started in that repo, connects to it as a client. With no serving process, `reach` and `explain` read the map `--map <file>` names, and `highlight` returns a tool error saying no tab is open, amending [D110 (mcp-tools)](#d110), *because* an MCP client launches its server as a child over stdio, which has no other way to learn which process serves, on which ephemeral port, with which token (resolves [Q59 (mcp-finds-tab)](#q59)).
- <a id="d139"></a>**D139 (inert-helpers)**: the Python helper ships as a file outside the tree, takes the tree as an argument, and runs with `-I -S` from a working directory outside it. Go runs with `GOTOOLCHAIN=local` beside `GOPROXY=off`, and `go list` is never asked for `-compiled` or `-export`. Steps 81 and 82 each test that a planted module in the tree never runs, amending [D113 (go-producer)](#d113) and [D115 (python-producer)](#d115), *because* Python puts the script's directory, or the working directory under `-c`, ahead of the standard library, so an `ast.py` in a reviewed tree would run at the helper's first import, startup runs any `.pth` file `site` finds, and a `toolchain` line in `go.mod` asking for a newer Go otherwise sends the command looking for one (resolves [Q60 (inert-helpers)](#q60)).
- <a id="d140"></a>**D140 (changed-file-reds)**: a `dead` red is on the change only where a cycle's or a boundary violation's import line, or an unused export's own line, meets a head-side hunk, extending [D73 (touched-file-breach)](#d73)'s line rule to `dead`. A finding with no line atis can read keeps the file rule ([C2 (never-fake)](#c2)), and the LIFR rung and the `cycle-or-boundary` candidate read the same rule until [D98 (base-side-structure)](#d98) replaces it. A red slot raises no `red-check-slot` row on a file where a candidate of its own kind speaks for it: `health` ranks as `threshold-breached`, and `dead`'s cycles and boundary violations as `cycle-or-boundary`, as [D83 (security-on-change)](#d83) has `security` rank as `security-finding`. `test`, `types`, `lint`, `struct`, `dupes` and a `dead` red through an unused export keep their row at severity 10, and the category does not move for this second rule, *because* on the tuning six these reds held 9 of the 18 top-three rows and bore on none of the findings: every `dead` one on `corpus-4` and `corpus-5` was a cycle already there at the base, and a `health` red ranked one complexity finding at twice the severity `threshold-breached` gives it, above the test evidence on the same file (resolves [Q61 (changed-file-reds)](#q61)).
- <a id="d141"></a>**D141 (unmeasured-lines)**: a changed file a coverage report omits is unmeasured only when one of its head-side hunks meets a code span (the lines of a statement `leavesCode` accepts) by [D73 (touched-file-breach)](#d73)'s `meets` rule. The scan records each file's code spans in place of its one `emits` flag, and a file whose changed lines are imports, `export … from`, types or declarations is never unmeasured, amending [D80 (unmeasured-not-closed)](#d80), *because* `corpus-4`'s barrel emits for one untouched constant, yet its seven changed lines were re-exports no test could run, and it read as a gap with high reach and took notice 2 (resolves [Q64 (barrel-unmeasured)](#q64)).
- <a id="d142"></a>**D142 (tuning-misses-left)**: `corpus-4`'s and `corpus-5`'s misses take no encoding of their own beyond [D140 (changed-file-reds)](#d140) and [D141 (unmeasured-lines)](#d141), and what each leaves is parked past step 20 ([D127 (tuning-loop)](#d127)). On `corpus-4`, a file the change adds weighs only by its reach, since §5.4 scales by a history and an uncovered share that a new, fully covered file lacks. On `corpus-5`, no instrument holds evidence on the flagged loop, *because* lifting one fixture's new files means reshaping §5.4's formula to the tuning half, which D127 rules out, and a covered loop no mutation run reached is the most a map can say (resolves [Q62 (tuning-miss-mutants)](#q62) and [Q63 (tuning-miss-no-evidence)](#q63)).
- <a id="d143"></a>**D143 (untested-mutants)**: a mutant no test reached is counted and named apart from one that survived. A `survived-mutants` notice's why and inputs, the HUD's Mutants block and the legend's notch say which is which, and the kind, its severity and its weight stay as they are, *because* all 88 of `corpus-6`'s mutants and 12 of `corpus-1`'s 14 were never reached by a test, and "88 survived" tells a reader the tests ran code they never loaded (step 18's reading, P8).
- <a id="d144"></a>**D144 (working-system-first)**: the second retake's fail (step 20) parks its four encodings as tangents, and no refine runs before wave 1. The build carries on to a coherent, working system, and the encodings are tuned once it works, amending [D119 (svg-reading)](#d119), *because* Rob judges whether the shapes mean anything by using atis on code he understands, and on most of the five maps he could not zoom in or see details, so the reading said more about the sheet's size than about the encodings (Rob, 2026-10-23).

**Settled at the wave-1 boundary's refine.** Step 22 recorded the materials spike's verdict, and Rob answered [Q37 (png-browser)](#q37) and [Q65 (morph-motion)](#q65) to [Q68 (fallback-first-frame)](#q68) on 2026-10-24, then took the rest of the spike's direction and answered [Q70 (organelle-drift)](#q70) and [Q71 (shore-band-position)](#q71). Each line below records one, and each decision or constraint it amends points back to it.

- <a id="d145"></a>**D145 (png-browser)**: `--png` and step 30's smoke test drive a headless browser through `playwright-core`, which downloads none: the installed Chrome (`channel: 'chrome'`), else a Chromium on the `PATH`. With neither, atis exits 2 naming the one install command, CI installs Chromium itself, and with no browser the SVG is `--comment`'s image ([D86 (svg-stays-the-fixture)](#d86)). [C9 (deps-earn-their-place)](#c9) names it, *because* §15's R5 wants the PNG from the same app as the tab, and R6 refuses the per-platform binary Playwright's full package downloads on install (resolves [Q37 (png-browser)](#q37)).
- <a id="d146"></a>**D146 (morph-shapes)**: shape is conformance, drawn as a morph. A file's outline takes one of seven forms by the rules it breaks, 0 to 6 (fallow's four thresholds, a boundary violation and a cycle): round, a soft wobble, lobes, angular protuberances, spikes, and at 5 and 6 spiked arms with bulbs at their tips. One function in `libs/scene` draws the outline for both renderers, seeded by the file's path ([C3 (deterministic)](#c3)). The SVG draws it still ([C10 (svg-is-still)](#c10)), both legends gain a key of the seven forms, and a cell's membrane keeps its teeth (step 12). It replaces §5.1's one pulled vertex per rule for organelles, *because* Rob judged the spike's morph the look he was after, and every encoding lands in both renderers ([D86 (svg-stays-the-fixture)](#d86)) (Rob, 2026-10-24, answering [Q65 (morph-motion)](#q65)).
- <a id="d147"></a>**D147 (alive-motion)**: the spike's motion is the world's new baseline, and the world may move more than §5.5's budget allowed, so long as each motion means something about what it moves. Inside an opened cell each file's morphed shape ([D146 (morph-shapes)](#d146)) moves by its rule count, as in the spike: a breaking file's arms pulse and its body turns, faster and further as the level climbs, and a file within every threshold stays still. The scheduler still owns every animation, seeded ([D94 (seeded-motion)](#d94)), and reduced motion stills it. [C12 (motion-budget)](#c12) drops its one continuous mover, and [C11 (one-meaning-per-channel)](#c11)'s motion carries conformance inside an opened cell beside urgency at the surface. Where the motion goes next is [Q69 (motion-direction)](#q69), *because* zoomed into a cell, the spike's moving shapes made the world feel alive, the feeling Rob was looking for, and §5.5's budget is sparser than the look wants (Rob, 2026-10-24) (resolves [Q65 (morph-motion)](#q65), against its lean).
- <a id="d148"></a>**D148 (notice-anchors)**: a notice anchors to the nearest thing the map draws for its target: its organelle when the layout placed one; else, for a test file, the stitch it draws on the first file it imports, by path; else, for a shore file, its shore group, wherever the renderer draws the shore. `libs/scene` derives the anchor beside the label placements (step 27), the SVG rings it in the same step, and the world breathes and flares the primary there (step 34). "Unplaced" stays only for a target with no anchor at all, *because* `retake-1`'s primary targets a test file, which [D4 (tests-not-terrain)](#d4) leaves without a position, so the map's loudest mark could not be seen in either renderer (resolves [Q66 (unplaced-primary)](#q66)).
- <a id="d149"></a>**D149 (stability-data)**: each organelle the history window saw carries an optional `stability` key, its age in days and its churn ratio across the window, from the counts the history pass already makes, added under [D85 (schema-bumps)](#d85). The SVG never reads it, so every golden stays, and step 24 raises old, quiet files and lowers churny ones by it, drawing no swell where it is absent, *because* the history pass writes `age_days` and `churn_ratio` only for changed files (`libs/core/src/history.ts:83`), the spike could draw no swells without faking them ([C2 (never-fake)](#c2)), and filling those two keys on every file would hatch every file in the SVG (resolves [Q67 (stability-data)](#q67)).
- <a id="d150"></a>**D150 (first-frame-target)**: [C14 (world-budget)](#c14)'s 2 s first frames are targets, not gates: a first frame a little over 2 s passes, and each is measured by a script and recorded on both backends, WebGPU and the WebGL 2 fallback. The frame rates stay held, *because* the spike drew its first frame in 0.57 s on WebGPU and 2.76 s on WebGL 2, where GLSL compiles TSL's physical material slowly, and Rob would rather the build not bend itself around the last second (Rob, 2026-10-24) (resolves [Q68 (fallback-first-frame)](#q68), wider than its lean).
- <a id="d151"></a>**D151 (dark-wet-skin)**: the world's skin is the spike's variant a: one dark skin with the weather glowing in it, a graphite and blue-grey albedo, and no translucency modelled. Base tissue's faint rim and each cell's own faint light never bloom. Terraces are soft, the spike's 4-unit step eased over 36, with no line at a layer's edge. A clearcoat on its own normal gives the wet sheen, reflecting a sky dark overhead (black at the zenith, a band below about 60° of elevation, three soft boxes), and at LOD0 the key light and the sky are off. A broad reach feeds the bloom at a fifth of its light, and nested cells never stack their reach: each point takes the brightest reach over it, container cells skipped. It amends the translucency of [D12 (materials)](#d12) and [D16 (surface)](#d16), and it is provisional: Rob took it for now, and the look stays open to refine as the world comes together, *because* the spike's b, translucent jelly lit from within, brightened the base tissue until it competed with the weather and dimmed the reach inside thick bodies, while a kept §5.6's dark, withholding field (step 22's verdict; Rob, 2026-10-24).
- <a id="d152"></a>**D152 (soft-layers-as-data)**: the skin's soft layers (the tissue with its cell bodies and membrane lines, and the reach field) are grids computed in `libs/scene` beside the heightfield and uploaded as data textures, blurred small in the scene or in a shader. The world never paints a large canvas or puts a CSS filter on one, and every material sets its emissive output explicitly. Provisional, like [D151 (dark-wet-skin)](#d151), *because* in the spike GPU-backed canvases about 2,100 by 3,500 pixels under CSS `blur()` crashed Chrome's GPU process within seconds, a full-size software blur took 27 s, and a `MeshBasicNodeMaterial` writes its colour into the emissive target unless told otherwise, so the slide bloomed (step 22's verdict; Rob, 2026-10-24).
- <a id="d153"></a>**D153 (shore-rail)**: the world draws no shore on the terrain. Its shore is a scrolled rail of flat blocks in the chrome, one per group: the groups the change touched come first and open on their files, the changed ones lit and named, and the rest stay collapsed to their name and count. It holds any number of groups, and a notice on a shore file shows its numbered box on its group's block. The SVG stays still and draws the same blocks, a compact band in the rail's graphic style in place of the organic strip above the top terrace, along the bottom of the sheet ([D158 (shore-band-position)](#d158)). One derivation in `libs/scene` orders the groups for both. Core still places every shore file, and [D48 (shore-groups)](#d48)'s table and its loud `other` stand, amending D48's strip in both renderers, *because* the shore never read visually: on `retake-3` it held 584 of the 1,063 placed files, drawn as tissue it read as malformed cells, and a long shore drew the eye from the body, while as interface it is clear and something to act on (Rob, 2026-10-24).
- <a id="d154"></a>**D154 (minimap)**: the world's chrome gains a minimap at the bottom left: the body's silhouette, how far the reach goes, the changed files, the notices, and the view's outline on the ground. A click or a drag on it moves the camera. It is flat and never glows ([D12 (materials)](#d12)), and its geometry comes from `libs/scene`, *because* a reviewer zoomed into one cell loses where it sits in the body, and Rob asked for it at the spike's second look (Rob, 2026-10-24).
- <a id="d155"></a>**D155 (open-cell-holds)**: an opened cell stays open while the reviewer pans and zooms inside it, and closes on zooming out past it, a click on open ground, or Esc. Its file labels are tags on the chrome's ground, kept in columns on screen however the slide is framed, each with its rule count, *because* in the spike a cell first closed as soon as the screen's centre left it, which made moving inside one impossible (Rob, 2026-10-24).
- <a id="d156"></a>**D156 (dev-panel)**: the world has a dev panel that moves every token live: colours, materials and motion. It is no part of the design a user sees. It is off and invisible by default and its code loads only when opened; a development build shows a toggle for it, and a published build opens it only through a key combination the docs never name, for diagnostics and adjustment in the field. Its changes last for the session, and it copies the changed tokens as a `tokens.ts` patch for [Q3 (flare-and-jiggle-numbers)](#q3)'s log. `--png` and a glance reading never open it. Every world material and the scheduler read their tokens through one registry the panel writes, *because* the spike's tuning panel was how its look was judged and tuned, and Rob wants that instrument for developers and admins without it in the design (Rob, 2026-10-24).
- <a id="d157"></a>**D157 (organelle-drift)**: inside an opened cell each file drifts by its looseness, tethered by its import ties like a cytoskeleton. A file whose ties stay within its cell is held near its layout position, and one whose ties mostly leave the cell, or that has none, floats freely, bumping the membrane and its neighbours. Looseness is the share of a file's ties that leave its cell, counted in either direction on the head graph ([D39 (two-graphs)](#d39)) between terrain files, so tests and the shore do not count ([D4 (tests-not-terrain)](#d4)). A file with no ties is wholly loose; a file alone in its cell, a deleted file, and a file the map gives no `ties` stay still ([C2 (never-fake)](#c2)). A hub, held by many ties, sits still near the centre, so a cell's core reads as its still middle. Core records each organelle's `ties` inside and outside its cell as an added key ([D85 (schema-bumps)](#d85)), and `libs/scene` runs the drift, seeded, under the scheduler ([D94 (seeded-motion)](#d94), [C12 (motion-budget)](#c12)). At rest, in the SVG and under reduced motion, every file sits at its layout position, and [C11 (one-meaning-per-channel)](#c11) names drift as looseness, *because* Rob wants how freely a file floats to mean something the way the real structure behaves, and an import tie is the structure a cell's files actually share: a file that works with none of its cellmates is the one that may belong elsewhere, while a roaming hub would make the most important file the hardest to read, and would look urgent (Rob, 2026-10-24) (resolves [Q70 (organelle-drift)](#q70)).
- <a id="d158"></a>**D158 (shore-band-position)**: the SVG's shore band runs along the bottom of the sheet, under the world at its full width, wrapping in rows: the touched groups first, each with its changed files named, then every untouched group as a one-line block of its name and count, so a long shore costs a row or two rather than a column. The world keeps its rail at the right edge, where a tab can scroll it, *because* the still image's right-hand column already holds the six notices and the legend inset, so the shore there would make it the tallest thing on the sheet, the very pull from the body [D153 (shore-rail)](#d153) fixes, and a PR comment shows the sheet wide (resolves [Q71 (shore-band-position)](#q71)).

## Constraints

- <a id="c1"></a>**C1 (core-is-pure)**: nothing under `libs/core/src`, `libs/svg/src` or `libs/scene/src` imports `node:*`, `fs`, `child_process`, `typescript` or `three`, touches the DOM, or reads Node's globals or the unseeded clock and random source ([D121 (lib-globals)](#d121)). Tests under `__tests__/` are excepted, since the rule covers shipped code. Fallow's `libs → libs` rule and step 2's struct rule enforce it ([D2 (layout)](#d2)).
- <a id="c2"></a>**C2 (never-fake)**: a missing source mutes its channel (an absent key, NOINST, a muted block), never a default number (P8).
- <a id="c3"></a>**C3 (deterministic)**: the same inputs give a byte-identical `map.json` (except `meta.generated_at`), SVG and scene model, and one seed and one time give one frame of the world; every list is sorted, every tie broken by path, and every random source seeded.
- <a id="c4"></a>**C4 (never-blocks)**: the CLI exits 0 whenever it wrote or served its outputs, whatever the weather says. It exits 2 on misuse or a broken input, and never 1 for bad weather (P7).
- <a id="c5"></a>**C5 (no-network)**: no network at runtime, no telemetry, no web fonts. Servers bind loopback only ([C13 (loopback-only)](#c13)). The only commands that reach the network are `--comment` and the separate tour, each only when typed (§10).
- <a id="c6"></a>**C6 (no-people)**: no author, email or ownership field anywhere in a map, an image, a comment or a tour ([D7 (no-people)](#d7)).
- <a id="c7"></a>**C7 (budget)**: at most six notices, 1 primary, 2 secondary and 3 tertiary; when fewer rank, fewer show, never padded (P1).
- <a id="c8"></a>**C8 (checkride-convention)**: `pnpm check` is green at every checkpoint. Folder modules with `index.ts` barrels, no classes, no default exports, `.js` import extensions, and tests in `__tests__/` ([D3 (gate)](#d3)).
- <a id="c9"></a>**C9 (deps-earn-their-place)**: the runtime dependencies are `typescript` (the scan, in `apps/atis`), `d3-force` and `bubblesets-js` (core), `earcut` and `elkjs` (scene), and `three`, `camera-controls`, `react` and `react-dom` (web); in their own waves come `playwright-core` ([D145 (png-browser)](#d145)), a WebSocket server, the MCP SDK, a JavaScript or WASM parser each for HCL and shell, and fascicle (in `apps/tour` alone). `libs/svg` depends on `core` and `scene` and nothing else. The Go and Python producers' helpers ship as source and run on the repo's own toolchain, never as a binary. Each new dependency is installed at its latest release and gets a row in `docs/inspiration.md`.
- <a id="c10"></a>**C10 (svg-is-still)**: the SVG contains no `<animate>`, SMIL, `<script>` or CSS animation.
- <a id="c11"></a>**C11 (one-meaning-per-channel)**: hue means state, luminance evidence and reach, texture history, shape conformance, size mass, repetition duplication, relief the three elevation scales, and motion urgency at the surface and, inside an opened cell, conformance (a shape's pulse and turn, [D147 (alive-motion)](#d147)) and looseness (a file's drift, [D157 (organelle-drift)](#d157)). No other channel is reused in either renderer (P3), and the category letters always accompany the category hue.
- <a id="c12"></a>**C12 (motion-budget)**: nothing animates outside the scheduler, and each motion means something about what it moves. At most one flare is in flight, transients last 600 ms or less and cross-fades 300 ms or less, and `prefers-reduced-motion` is honoured (§5.5). [D147 (alive-motion)](#d147) lifted the budget's one continuous mover.
- <a id="c13"></a>**C13 (loopback-only)**: every server atis starts binds `127.0.0.1` and serves only the app's assets, the map, the read-only paths of [D93 (app-reads-what-it-is-served)](#d93) and one write, `POST /base`. It answers only a `Host` of `127.0.0.1:<port>` or `localhost:<port>`; the map, the read-only paths, the socket and `POST /base` require the run's token, and the socket and the POST also check `Origin` ([D134 (loopback-trust)](#d134)).
- <a id="c14"></a>**C14 (world-budget)**: 60 fps at 5,000 files on an M-series laptop, a first frame about 2 s after the map's arrival, and 30 fps at 20,000 files with composites (§15's R1); from wave 3, a cached run's first frame about 2 s after the command ([D136 (first-frame-clock)](#d136)). The frame rates are held, while the 2 s first frames are targets that a little over still passes, recorded on both backends ([D150 (first-frame-target)](#d150)). Each is measured by a script, never assumed.

## Steps

### Wave 0: finish phase 1, so the map says what the change did

*Sharp now. Steps 16 to 20 follow [D62 (retake-reader-blind)](#d62): their pauses, commit bodies and build-log entries give counts, never a repo, PR or verdict, until step 20's verdicts are in. A tuning-half miss at step 18 is parked. The fix steps one `/plumbbob:refine` pass appends for it are ordered ahead of step 19 with `plumbbob order`, and the tuning half is never scored again ([D127 (tuning-loop)](#d127)).*

1. [x] test(cli): stop the CLI suite racing the types slot's build, **done when:** `apps/atis/src/__tests__/cli.test.ts` never executes a `dist/` that the `types` slot may be rewriting in parallel: not the bin's own, and not `core`'s or `svg`'s. It may build into a private output directory, run the sources through a loader, or drive `run` in-process wherever a child process proves nothing. Ten consecutive `pnpm check --only types,test` runs are green, and the test's comment names the race it closes
   - seam: `apps/atis/src/__tests__/cli.test.ts`, `vitest.config.ts`, `package.json`, `pnpm-lock.yaml`
   - model: sonnet (the race is known; the fix is mechanical)
2. [x] chore(rules): keep Node, the compiler and the DOM out of lib sources, **done when:** an ast-grep rule under `rules/` fails the `struct` slot on any import of `node:*`, `fs`, `child_process`, `typescript` or `three`, any `document` or `window` reference, and any use of `process`, `Buffer`, `require`, `__dirname`, `__filename`, `Math.random`, `Date.now`, `performance.now` or an argument-less `new Date()`, in files under `libs/*/src/` outside `__tests__/` ([C1 (core-is-pure)](#c1), [D121 (lib-globals)](#d121)). A probe file importing `node:fs` in `libs/core/src` turns `struct` red, and so does a second calling `Math.random()`; both are deleted before the checkpoint. A test under `__tests__/` reading a fixture with `node:fs` stays green, and `pnpm check` is green
   - seam: `rules/`, `sgconfig.yml`
   - model: sonnet (one rule, fully specified)
3. [x] fix(core): read a changed file no coverage report names as unmeasured, **done when:** per [D80 (unmeasured-not-closed)](#d80): the scan marks each TypeScript file whether it emits code; a changed (added, modified or renamed) source file that emits code, and that an existing coverage report omits, is listed as unmeasured in `weather.evidence`; the category treats it as a gap (MVFR, or IFR at high reach) and never reads VFR while one exists; `uncovered-high-reach` can target it, with a why saying no test run measured it; its skin is lit whole, and the Patch cov block counts it beside the measured share; type-only files, deleted files and maps with no coverage channel are unchanged; per [D122 (excluded-from-coverage)](#d122), a file the repo excludes from coverage reads unmeasured, its why saying the report does not name it, and a report that names none of the tree's source files mutes coverage, with that reason in `meta.instruments`; tests cover each case, and `libs/core/fixtures/demo/` and `libs/svg/fixtures/demo/` are regenerated if they move
   - seam: `apps/atis/src/sources/imports.ts`, `apps/atis/src/__tests__/imports.test.ts`, `libs/core/src/evidence.ts`, `libs/core/src/notices.ts`, `libs/core/src/schema.ts`, `libs/core/src/map.ts`, `libs/core/src/__tests__/evidence.test.ts`, `libs/core/src/__tests__/notices.test.ts`, `libs/core/src/__tests__/schema.test.ts`, `libs/svg/src/weather.ts`, `libs/svg/src/chrome.ts`, `libs/svg/src/__tests__/weather.test.ts`, `libs/svg/src/__tests__/chrome.test.ts`, `libs/core/fixtures/demo/`, `libs/svg/fixtures/demo/`
   - model: opus (a new evidence state across scan, core and render)
4. [x] fix(core): split interface notices by what moved, **done when:** per [D81 (interface-move-kinds)](#d81), a changed interface file with a removed or reshaped name raises `interface-change` (severity 8). One with names only added raises `interface-added` (3). One whose only movement is names the scan could not compare raises `interface-uncompared` (2), with the "could not be compared" why. The two new kinds sit in `NoticeKind` and in the severity table. Tests cover each kind, plus a file with both an added and a reshaped name, which stays `interface-change`, and one with names added and others uncompared, which raises `interface-added` naming the uncompared ones ([D123 (mixed-interface-moves)](#d123)); the goldens are regenerated if they move
   - seam: `libs/core/src/config.ts`, `libs/core/src/notices.ts`, `libs/core/src/schema.ts`, `libs/core/src/__tests__/notices.test.ts`, `libs/core/src/__tests__/schema.test.ts`, `libs/core/fixtures/demo/`, `libs/svg/fixtures/demo/`
   - model: sonnet (fully specified by its decision)
5. [x] feat(cli): compare inferred export shapes with the type checker, **done when:** per [D118 (inferred-shapes)](#d118), a name `isolatedDeclarations` flags as inferred, in a changed interface file, gets a shape the checker prints over a program of the in-tree imports and the bundled default lib; a class with inferred method returns compares member by member. A body-only edit that leaves every inferred type unchanged then raises nothing, and an edit that changes an inferred return raises `interface-change` naming that name as reshaped. A name the checker cannot print, or whose checked type reaches an unresolved symbol, stays uncompared ([C2 (never-fake)](#c2)), and a test pins an external return type swapped for another as uncompared. `--verbose` reports the checker's time per scan. Tests build the base and head trees from strings in a temp directory, as the scan's tests already do
   - seam: `apps/atis/src/sources/imports.ts`, `apps/atis/src/sources/shapes.ts`, `apps/atis/src/sources/index.ts`, `apps/atis/src/run.ts`, `apps/atis/src/__tests__/imports.test.ts`, `apps/atis/src/__tests__/shapes.test.ts`
   - model: opus (the compiler's checker API is the subtle part)
6. [x] fix(core): weigh an interface notice by who reads the names that moved, **done when:** per [D82 (moved-name-readers)](#d82), each notice of the three kinds of [D81 (interface-move-kinds)](#d81), and each `deleted-export` notice, carries `readers` in its inputs: the in-repo files that import a moved name, with re-exports followed by name, counted on the head graph for names added, reshaped or uncompared, and as its live consumers for `deleted-export` ([D124 (readers-graph)](#d124)). Its weight scales by `1 + log(1 + readers)`. A test pins two reshaped files at one severity and reach ranking by their readers, and the goldens are regenerated if they move
   - seam: `libs/core/src/notices.ts`, `libs/core/src/__tests__/notices.test.ts`, `libs/core/fixtures/demo/`, `libs/svg/fixtures/demo/`
   - model: sonnet
7. [x] fix(core): rank a security advisory only when the change brings it, **done when:** per [D83 (security-on-change)](#d83): `parseSecurity` reads each advisory's module, severity and dependency paths from `security.json`; `diffManifests` also returns `deps_moved` (range moves, each with its `from`); an advisory whose path runs through a package the change added or moved raises one `security-finding` per package, naming it; every other advisory is standing state, counted in the Standing block and never ranked; tests run from captured `security.json` text and two manifest strings
   - seam: `apps/atis/src/sources/check.ts`, `apps/atis/src/sources/git.ts`, `apps/atis/src/__tests__/check.test.ts`, `apps/atis/src/__tests__/git.test.ts`, `apps/atis/fixtures/check/`, `libs/core/src/evidence.ts`, `libs/core/src/notices.ts`, `libs/core/src/map.ts`, `libs/core/src/schema.ts`, `libs/core/src/__tests__/notices.test.ts`, `libs/core/src/__tests__/schema.test.ts`, `libs/svg/src/chrome.ts`, `libs/svg/src/__tests__/chrome.test.ts`
   - model: opus
8. [x] fix(cli): read bare re-exports and .mts barrels as public surface, **done when:** a name imported and then exported bare (`import { a } from './a.js'` then `export { a }`) passes through the public-surface walk the way `export { a } from` does. A member whose `exports` reach an `index.mts` or `index.cts` barrel through `dist/` maps it back to source the way `.ts` targets map ([D75 (public-surface-width)](#d75)). Tests pin both from strings
   - seam: `apps/atis/src/sources/imports.ts`, `apps/atis/src/__tests__/imports.test.ts`, `libs/core/src/notices.ts`, `libs/core/src/__tests__/notices.test.ts`
   - model: sonnet
9. [x] fix(core): keep committed build output off the terrain, **done when:** per [D84 (build-output-is-shore)](#d84), files under `dist/`, `build/` or `out/` directly beneath a workspace member or the root land in a new `build` shore group, and never found a cell or enter a band. A hand-written `.d.ts` elsewhere stays terrain. Tests pin a committed `dist/index.js` and `dist/index.d.ts` (shore) beside a `src/types.d.ts` and a `lib/` source tree (terrain)
   - seam: `libs/core/src/config.ts`, `libs/core/src/modules.ts`, `libs/core/src/groups.ts`, `libs/core/src/__tests__/groups.test.ts`, `libs/core/src/__tests__/modules.test.ts`
   - model: sonnet
10. [x] fix(core): sort the retake's leftover shore files by kind, **done when:** [D48 (shore-groups)](#d48)'s default table gains the rows parked at the map-and-svg build's step 50: `docker-compose*.yml`, `docker-compose*.yaml` and `serverless.yml` to `ci`; `migrations/**` and `migration_lock.toml` to `data`; `vitest.workspace.*` to `config`; `deno.*.json` variants and `package.cjs.json` to `deps`; `robots.txt` to `assets`; `ATTRIBUTION*` to `docs`; kinds the census cannot name (hono's runtime-test static files) stay in the loud `other`; the groups test pins one path per new pattern
    - seam: `libs/core/src/config.ts`, `libs/core/src/__tests__/groups.test.ts`
    - model: sonnet (table rows, fully specified)
11. [x] fix(svg): size HUD blocks for the widest fallback monospace face, **done when:** the chrome's text-width estimate uses the widest advance among `FONT_FAMILY`'s faces and a viewer's fallback, recorded as a token in `docs/design.md`. A test pins that every HUD block's text fits its box at that advance, on the longest Standing tail in the committed fixtures. At the pause, `fixtures/retake-1/`'s map re-rendered in Quick Look no longer overruns its Standing block
    - seam: `libs/svg/src/chrome.ts`, `libs/svg/src/tokens.ts`, `libs/svg/src/__tests__/chrome.test.ts`, `libs/svg/fixtures/demo/`, `docs/design.md`
    - model: sonnet
12. [x] feat(svg): draw a cell's own dents and clone family on its membrane, **done when:** a cell whose `dents[]` is non-empty draws one pulled point on its membrane per breach, as organelles already do (shape is conformance), and a cell in a clone family carries the family's glyph at its membrane (repetition is duplication), per [C11 (one-meaning-per-channel)](#c11). Tests pin both, and the golden is regenerated
    - seam: `libs/svg/src/terrain.ts`, `libs/svg/src/tokens.ts`, `libs/svg/src/__tests__/render.test.ts`, `libs/svg/fixtures/demo/`, `docs/design.md`
    - model: sonnet
13. [x] fix(core): keep a neighbour's centre out of another cell's membrane, **done when:** after the Bubble Set pass, no organelle's centre lies inside the contour of a cell or shore group it does not belong to. This holds on a seeded synthetic field of at least 500 files and on the golden demo. A membranes test pins the property, the layout stays deterministic ([C3 (deterministic)](#c3)), and the goldens are regenerated
    - seam: `libs/core/src/layout/membranes.ts`, `libs/core/src/layout/index.ts`, `libs/core/src/__tests__/membranes.test.ts`, `libs/core/fixtures/demo/`, `libs/svg/fixtures/demo/`
    - model: opus (geometry held by a property test)
14. [x] feat(svg): tell an added file from a modified one, **done when:** per [D120 (added-vs-modified)](#d120) (text, not a new hue), an added file's path is written with a leading `+` wherever the map writes paths. Today that is a notice row's target; from wave 2 it is also the world's hover tags and labels. The stain stays the one change hue, and `docs/glance-test.md`'s legend says so. A chrome test pins the mark on an added target and its absence on a modified one
    - seam: `libs/svg/src/chrome.ts`, `libs/svg/src/__tests__/chrome.test.ts`, `libs/svg/fixtures/demo/`, `docs/glance-test.md`
    - model: sonnet
15. [x] feat(svg): draw a legend inset and an annotated practice map, **done when:** per [D87 (legend-inset)](#d87), every rendered map carries a compact legend inset in its chrome, flat with no gradients ([D12 (materials)](#d12)). It covers the category letters, the lit arc and the hairline, the notch, stitches, the red and the grey bolt, the ghost, the change stain with its `+`, and the unmeasured skin. `docs/glance-practice.svg` is a retake fixture's map rendered with numbered callouts matching the legend in `docs/glance-test.md`, which gains every mark wave 0 added. A script draws the callouts from the legend's list of marks, so re-rendering the practice map is one command ([D125 (practice-map-current)](#d125)). Tests pin that the inset is present and sits clear of the world and the notice column
    - seam: `libs/svg/src/`, `libs/svg/fixtures/demo/`, `docs/glance-test.md`, `docs/glance-practice.svg`, `docs/design.md`, `scripts/`
    - model: opus (layout in a crowded chrome)
16. [x] chore(fixtures): select the tuning half of the precision corpus, **done when:** per [D88 (precision-corpus)](#d88), [D128 (held-out-chosen-late)](#d128) and [D129 (precision-on-holds)](#d129), six folders `fixtures/corpus-1/` to `fixtures/corpus-6/` exist, each a hold, and each carries a `README.md` naming the repo, the PR, the fixture commit, its merge-base and its ecosystem, and a `truth.md` quoting the reviewer's comment with its link. They are chosen by walking review timelines with `gh api`, under [D59 (outside-fixtures)](#d59) and [D64 (fixture-eligibility)](#d64), from PRs whose 3 to 30 changed source files are TypeScript by `classifyFile`'s rule ([D126 (typescript-corpus)](#d126)). `fixtures/corpus.md` names them the tuning six by number; the held-out six are not chosen until step 19. The pause and the commit body report counts only ([D62 (retake-reader-blind)](#d62))
    - seam: `fixtures/`
    - model: opus (judging which review comments are substantive)
17. [x] chore(fixtures): generate maps for the corpus's tuning half, **done when:** each of the six tuning folders holds a `map.json` passing `assertMap` and an `atis.svg`. They are generated by the [D58 (fixtures-current-toolchain)](#d58) worktree procedure, with `security` skipped per [D56 (fixtures-skip-audit)](#d56) and coverage per [D64 (fixture-eligibility)](#d64). Each README records its commands and every harness change, and the pause gives counts only
    - seam: `fixtures/`
    - model: sonnet (the procedure is written; the runs are long)
18. [x] chore(glance): score notice precision on the tuning half, **done when:** `docs/glance-test.md` gains a precision section recording each of the six tuning holds by number alone: its category, its top three notices, and whether the reviewer's finding is among them, read per [D65 (notice-precision-reading)](#d65) with the reason for each call. The half is scored this once ([D127 (tuning-loop)](#d127)): every miss is parked for a single `/plumbbob:refine` pass ([D38 (glance-is-a-step)](#d38)), whose fixes are judged only on the held-out half, and any miss that pass leaves is parked past step 20
    - seam: `docs/glance-test.md`
    - model: opus (the precision reading is judgment)
89. [x] fix(core): hold a dead finding to the lines the change touched, **done when:** per [D140 (changed-file-reds)](#d140), a `dead` red is on the change only where a cycle's or a boundary violation's import line, or an unused export's own line, meets a head-side hunk by [D73 (touched-file-breach)](#d73)'s `meets` rule, and a finding with no line atis can read keeps the file rule. `categoryOf`'s LIFR rung and the `cycle-or-boundary` candidate read the same rule, so a standing cycle through a changed file is standing state. Tests run from captured fallow 3.35 `dead.json` text and cover a standing cycle through a changed file, a cycle whose import line the change wrote, an unused export on and off the hunks, and a finding with no line; the goldens are regenerated if they move
    - seam: `apps/atis/src/sources/check.ts`, `apps/atis/fixtures/check/`, `apps/atis/src/__tests__/check.test.ts`, `libs/core/src/evidence.ts`, `libs/core/src/notices.ts`, `libs/core/src/__tests__/evidence.test.ts`, `libs/core/src/__tests__/notices.test.ts`, `libs/core/fixtures/demo/`, `libs/svg/fixtures/demo/`, `libs/svg/fixtures/categories/`
    - model: opus (the split, the category and the candidate move together)
90. [x] fix(core): rank a health or dead red by the finding behind it, **done when:** per [D140 (changed-file-reds)](#d140), a red slot raises no `red-check-slot` row on a file where a candidate of its own kind speaks for it: `health`'s findings on the change rank as `threshold-breached`, and `dead`'s cycles and boundary violations as `cycle-or-boundary`, as `security` ranks as `security-finding` ([D83 (security-on-change)](#d83)). A row that named several slots names only those left, and `test`, `types`, `lint`, `struct`, `dupes` and a `dead` red through an unused export keep their row at severity 10. The category is unchanged. Tests cover a file with only a `health` red, one with `health` and `lint` red, a `dead` red through a cycle and one through an unused export, and [D74 (failing-test-rank)](#d74)'s failing test still leading; the goldens are regenerated if they move
    - seam: `libs/core/src/notices.ts`, `libs/core/src/__tests__/notices.test.ts`, `libs/core/fixtures/demo/`, `libs/svg/fixtures/demo/`, `libs/svg/fixtures/categories/`
    - model: sonnet (fully specified by its decision)
91. [x] fix(core): read only changed code lines as unmeasured, **done when:** per [D141 (unmeasured-lines)](#d141), the scan records each TypeScript file's code spans, the lines of every statement `leavesCode` accepts, in place of the one `emits` flag. A changed file a coverage report omits is unmeasured only when one of its head-side hunks meets a code span by D73's `meets` rule, so a deletion inside a function counts. A file whose changed lines are imports, `export … from`, types or declarations is never unmeasured, and a type-only file reads as it does today. Tests cover a barrel with one exported constant whose changed lines are re-exports (not unmeasured), the same barrel with its constant edited (unmeasured), and a pure deletion inside a function (unmeasured); the goldens are regenerated if they move
    - seam: `apps/atis/src/sources/imports.ts`, `apps/atis/src/__tests__/imports.test.ts`, `libs/core/src/evidence.ts`, `libs/core/src/map.ts`, `libs/core/src/notices.ts`, `libs/core/src/__tests__/evidence.test.ts`, `libs/core/src/__tests__/map.test.ts`, `libs/core/fixtures/demo/`, `libs/svg/fixtures/demo/`
    - model: opus (a new scan field read across the scan and core)
92. [x] fix(core): tell a mutant no test reached from one that survived, **done when:** per [D143 (untested-mutants)](#d143), a `survived-mutants` notice's why counts the two outcomes apart (survived, and no test reached), naming one alone when the other is zero; its inputs carry `survived` and `untested` beside `mutants`; its kind, severity and weight are unchanged. The HUD's Mutants block reads the same split, and the legend's notch reads as a mutant no test killed. Tests cover each mix; the goldens are regenerated if they move
    - seam: `libs/core/src/notices.ts`, `libs/core/src/__tests__/notices.test.ts`, `libs/svg/src/chrome.ts`, `libs/svg/src/legend.ts`, `libs/svg/src/__tests__/chrome.test.ts`, `libs/svg/src/__tests__/legend.test.ts`, `libs/core/fixtures/demo/`, `libs/svg/fixtures/demo/`, `libs/svg/fixtures/categories/`
    - model: sonnet (wording across core and the HUD)
19. [x] chore(fixtures): select and generate the corpus's held-out half, **done when:** per [D128 (held-out-chosen-late)](#d128), once every fix the tuning half prompted has landed, six folders `fixtures/corpus-7/` to `fixtures/corpus-12/` exist, numbered in a shuffled order that carries no verdict: three holds and three merges, from at least three repos the tuning half did not use, chosen under step 16's rules for eligibility and truth. Each carries step 16's `README.md` and `truth.md`, and a `map.json` and `atis.svg` made by step 17's procedure. `fixtures/corpus.md` names them the held-out six by number alone, and the pause gives counts only
    - seam: `fixtures/`
    - model: opus (judging which review comments are substantive, as step 16 does)
20. [x] chore(glance): read five held-out maps blind on the SVG, **done when:** per [D119 (svg-reading)](#d119), `docs/glance-practice.svg` is first re-rendered by step 15's script and each callout checked against the legend ([D125 (practice-map-current)](#d125)); then `docs/glance-test.md` gains a "round one, second retake" section recording Rob's ten-second merge or hold and one reason on five held-out maps, three of one verdict and two of the other ([D60 (fixture-balance)](#d60)), read blind ([D62 (retake-reader-blind)](#d62)) from shuffled copies after the legend ([D66 (legend-briefing)](#d66)) and the unscored practice map ([D87 (legend-inset)](#d87)); then, with the corpus unsealed, criterion 5 on the three held-out holds per [D65 (notice-precision-reading)](#d65), the merges reading n/a ([D129 (precision-on-holds)](#d129)); then the pass line (at least 4 of 5 verdicts agree, every hold's reason is the reviewer's finding, criterion 5 holds on every hold) or the fail line with its encodings parked ([D38 (glance-is-a-step)](#d38)); the one reader is named beside the result, and repos and PRs are named only after the verdicts are in
    - seam: `docs/glance-test.md`, `docs/glance-practice.svg`, `fixtures/`
    - model: opus
21. [x] docs(inspiration): cite the corpus repos, **done when:** `docs/inspiration.md`'s fixtures section gains one row per corpus repo: the project with its link and licence, its PRs and fixture commits, and what was taken (the tree as a fixture, the reviewer's words as ground truth), per [D59 (outside-fixtures)](#d59). No row claims code
    - seam: `docs/inspiration.md`
    - model: sonnet

### Wave 1: phase 1b, the materials spike

*Before step 22, at the wave-0 boundary, run `/plumbbob:spike materials` per [D89 (spike-on-a-fixture)](#d89): one day of three.js in a throwaway worktree on a retake fixture's `map.json`. It judges §5.6's three reveals (far: lights on a dark field; closer: the luminous surface, with reach flowing through tissue; inside: one stained cell) and §5.5's motion. `plumbbob spike done` removes it, and nothing of its code lands.*

22. [x] docs(design): record the materials spike's verdict and motion tokens, **done when:** `docs/design.md` gains a phase-1b section with the spike's verdict on each of §5.6's three reveals (holds; holds with the changes named; or fails, with the material to rethink), and the screenshots it was judged on, under `docs/img/`. The motion constants of §5.5 become tokens in `libs/svg/src/tokens.ts` ([D51 (motion-tokens-shared)](#d51)), at the values the spike left them, and the design doc's motion table becomes the log [Q3 (flare-and-jiggle-numbers)](#q3) points at. A tokens test pins every motion token within §5.5's bounds. No spike code is in the tree
    - seam: `docs/design.md`, `docs/img/`, `libs/svg/src/tokens.ts`, `libs/svg/src/__tests__/tokens.test.ts`
    - model: fable (taste is the work)

### Wave 2: phase 2, the 2.5D world

*Sharpened at the wave-1 boundary's refine with the spike's verdict in hand ([D145 (png-browser)](#d145) to [D150 (first-frame-target)](#d150)). Steps 88 and 93 to 99, listed after step 47, build where the build order puts them: 95 and 98 before step 24; 88 right after step 26 ([D131 (svg-migration-step)](#d131)), then 94 and 96; 99 right after step 29; 97 right after step 30; and 93 after step 37.*

23. [x] chore(repo): add the scene library and the web app to the workspace, **done when:** `libs/scene` (package `scene`) and `apps/web` (package `web`, private) exist, with smoke tests under `src/__tests__/`. `apps/web` builds with Vite into `apps/web/dist/`, resolving workspace packages through the `source` condition ([D20 (workspace-exports)](#d20)), and it draws an empty field from `?map=<url>` or `/map.json`. The world's GPU code sits in `apps/web/src/world/`, which is excluded from the coverage thresholds as `cli.ts` is, while the chrome in `apps/web/src/chrome/` is covered. Vitest's include and coverage reach `.tsx`. `tsconfig.json` references both packages; fallow's entries and zones admit `apps/web` and keep `libs/scene` under the `libs` rule; and step 2's struct rule covers `libs/scene/src`. Per [D130 (token-home)](#d130), `libs/svg/src/tokens.ts` and its test move to `libs/scene/src/`, `libs/svg` imports them from `scene`, `docs/design.md` names the new path, and every golden is byte-identical. The dependencies are installed at their latest releases ([C9 (deps-earn-their-place)](#c9)): `earcut` and `elkjs` in scene; `three`, `camera-controls`, `react` and `react-dom` in web; and their dev tooling. `pnpm check` and `pnpm build` are green
    - seam: `libs/scene/`, `libs/svg/`, `apps/web/`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `tsconfig.json`, `vitest.config.ts`, `fallow.toml`, `cspell.json`, `rules/`, `.gitignore`, `docs/design.md`
    - model: sonnet (scaffolding against a known pattern)
24. [x] feat(scene): build the heightfield from depth, stability and mass, **done when:** `heightfield(map, resolution)` returns a deterministic grid carrying §5.1's three scales: terraces stepping down by band; broad swells that raise old, quiet files and lower churny ones by each organelle's `stability` ([D149 (stability-data)](#d149)), with none where the map carries none ([C2 (never-fake)](#c2)); and one smooth bump per cell weighted by its `body_loc`, creasing where bumps meet. `bumps(map)` returns the cells' centres, radii and masses for the vertex stage's data texture. Tests pin that terraces are monotone, that a bedrock file sits above a churny one in the same band, that a map without `stability` has no swells, that a bump peaks at its cell's centre, and that output is byte-stable for one map ([C3 (deterministic)](#c3))
    - seam: `libs/scene/src/heightfield.ts`, `libs/scene/src/index.ts`, `libs/scene/src/__tests__/heightfield.test.ts`
    - model: opus (the math and its tests)
25. [x] feat(scene): triangulate membranes and lay out organelle instances, **done when:** every cell's contour from `terrain.layout.contours` is triangulated with `earcut` into indexed triangles for the slide and the picking geometry, and the shore's are not ([D153 (shore-rail)](#d153)). Per [D152 (soft-layers-as-data)](#d152), `tissue(map, resolution)` lays the cell bodies and their membrane lines into a grid at the heightfield's resolution, which the skin samples. Every organelle becomes an instance record (position, radius, band, dents, clone family) in path order. Tests pin a concave contour's triangle area against the polygon's, a membrane line in the tissue grid along its contour, and the instance order ([C3 (deterministic)](#c3))
    - seam: `libs/scene/src/membranes.ts`, `libs/scene/src/instances.ts`, `libs/scene/src/index.ts`, `libs/scene/src/__tests__/membranes.test.ts`, `libs/scene/src/__tests__/instances.test.ts`
    - model: sonnet
26. [x] feat(scene): derive the weather each organelle carries, **done when:** `weatherOf(map)` gives each organelle and membrane its state from the map alone: its change kind; its reach luminance by hop, with the SVG's decay ([D5 (reach-by-module-hop)](#d5)), now a scene token ([D130 (token-home)](#d130)), and the lit crossings; the skin's gap arcs and mutant notches ([D71 (lit-gaps)](#d71)); its stitches by status; storms split by the change ([D68 (standing-state-storms)](#d68)); ghosts, renamed and deleted outlines, and the exceptional edges; `reachField(map, resolution)` rasterises the reach into a grid the skin samples, each point taking the brightest reach of the cells over it and skipping container cells, so nested skins never stack ([D151 (dark-wet-skin)](#d151), [D152 (soft-layers-as-data)](#d152)); a test maps every attribute to its one channel of [C11 (one-meaning-per-channel)](#c11) and fails if two attributes share one; `libs/svg` is left as it is, and step 88 moves it onto these derivations ([D131 (svg-migration-step)](#d131))
    - seam: `libs/scene/src/weather.ts`, `libs/scene/src/index.ts`, `libs/scene/src/__tests__/weather.test.ts`
    - model: opus (the one derivation both renderers will read)
27. [x] feat(scene): place labels per level of detail without collisions, **done when:** `labelsFor(map, lod, viewport)` keeps every notice's label at LOD1 and above, and fills the rest nearest-N by importance (notice tier, then change, then reach), with no two label boxes overlapping and one result per input. It also gives each notice its anchor per [D148 (notice-anchors)](#d148): its organelle, else a test file's stitch on the first file it imports, else a shore file's group, and `libs/svg` draws the notice's ring and box at that anchor, so `retake-1`'s primary is seen. Tests pin the budget per level of detail, the notices' precedence, the no-overlap property on a dense map, and each kind of anchor
    - seam: `libs/scene/src/labels.ts`, `libs/scene/src/index.ts`, `libs/scene/src/__tests__/labels.test.ts`, `libs/svg/src/chrome.ts`, `libs/svg/src/__tests__/chrome.test.ts`, `libs/svg/fixtures/`
    - model: sonnet
28. [ ] feat(scene): plan levels of detail with hysteresis and cross-fades, **done when:** `lodPlan` maps one continuous zoom scalar to §6's levels with separate enter and exit thresholds, and gives each layer's opacity through a cross-fade of at most 300 ms (§5.5). Tests pin that a zoom jittering across one threshold never flips the level, and that no fade exceeds its bound
    - seam: `libs/scene/src/lod.ts`, `libs/scene/src/index.ts`, `libs/scene/src/__tests__/lod.test.ts`
    - model: sonnet
29. [ ] feat(scene): schedule every animation inside the motion budget, **done when:** per [D94 (seeded-motion)](#d94) and [C12 (motion-budget)](#c12), a pure scheduler driven by an injected clock and a seeded random source owns every animation, timed from [D51 (motion-tokens-shared)](#d51)'s tokens: the load settle (400 ms); the primary's load flare (600 ms), then its breathing (about a 2 s period, about 3% amplitude); random primary flares every 8 to 20 s and secondary flares every 40 to 90 s at half intensity; the jiggle (up to 600 ms), hover (100 ms), fly-to (up to 400 ms) and the level fades; it never has two flares in flight (it queues and drops, never stacks), and with reduced motion it keeps only a static halo for the load flare. It reproduces the spike's curves as `docs/design.md` records them. Per [D147 (alive-motion)](#d147) it also moves each file's morphed outline inside an opened cell by its rule count, still at 0, faster and further as the level climbs, timed from motion tokens the design doc's motion table logs ([Q3 (flare-and-jiggle-numbers)](#q3)), and the doc's motion section drops its one continuous mover. Tests replay a minute of seeded time and assert every rule
    - seam: `libs/scene/src/motion.ts`, `libs/scene/src/index.ts`, `libs/scene/src/__tests__/motion.test.ts`, `libs/scene/src/tokens.ts`, `libs/scene/src/__tests__/tokens.test.ts`, `docs/design.md`
    - model: opus (a budget is only as good as its tests)
30. [ ] feat(web): render the field and the soft skin from a served map, **done when:** `apps/web` draws step 24's heightfield as one mesh, displaced in a TSL vertex stage from the bump texture, on the near-black field under an orthographic overhead camera. Per [D151 (dark-wet-skin)](#d151), the skin is dark graphite and blue-grey under one key light and ambient, with soft terraces and no line at a layer's edge, and a clearcoat sheen on its own normal that reflects a sky dark overhead; at LOD0 the key light and the sky are off. Per [D152 (soft-layers-as-data)](#d152), it samples the scene's grids as data textures, and every material sets its emissive output. `WebGPURenderer` falls back to WebGL 2 by itself, and one render loop is owned by the scheduler. At the pause, a Playwright screenshot of the demo map's opening frame shows terraces and swells, and the console is clean on both backends. A smoke test joins the gate ([D132 (world-smoke-test)](#d132)): it renders a fixture's map headless on the WebGL 2 path, through `playwright-core` and the installed Chrome, else a Chromium on the `PATH` ([D145 (png-browser)](#d145)), served by Vite in-process rather than from a shared `dist/`, and fails on a blank frame or a console error
    - seam: `apps/web/src/`, `apps/web/index.html`, `apps/web/package.json`, `vitest.config.ts`, `pnpm-lock.yaml`
    - model: fable (materials are taste)
31. [ ] feat(cli): serve the world and open it in a tab, **done when:** per [D92 (serve-and-open)](#d92), `atis --base <ref>` with none of `--out`, `--svg` or `--png` builds the map and serves the app's built assets and the map from memory on `127.0.0.1` at an ephemeral port ([C13 (loopback-only)](#c13)). Per [D133 (served-assets)](#d133), `serve` takes its asset directory as an argument, and the CLI finds a `web/` directory beside its own `dist/`, which `pnpm build` fills by building `apps/web` and copying it there; with none there, `atis` exits 2 naming `pnpm build`. It opens the tab unless given `--no-open`, through `parseArgs`'s `allowNegative`, prints the URL, and exits 0 on interrupt ([C4 (never-blocks)](#c4)); `--open` keeps opening the SVG beside `--svg`, and `--out` and `--svg` still write files and exit. Per [D134 (loopback-trust)](#d134), the server answers only a `Host` of `127.0.0.1:<port>` or `localhost:<port>`, and the URL it opens carries a random token made per run, which `/map.json` requires. An in-process test serves a temp directory holding a stub `index.html`: it fetches `/` and `/map.json`, gets a 404 on any other path, finds the socket bound to loopback only, and is refused on a foreign `Host` and on a missing or wrong token. The usage text names the new default, and the CLI suite's runs that relied on the old default pass `--out`
    - seam: `apps/atis/src/cli.ts`, `apps/atis/src/run.ts`, `apps/atis/src/serve.ts`, `apps/atis/src/index.ts`, `apps/atis/src/__tests__/serve.test.ts`, `apps/atis/src/__tests__/cli.test.ts`, `apps/atis/package.json`, `apps/web/package.json`, `package.json`, `pnpm-lock.yaml`
    - model: sonnet
32. [ ] feat(web): draw cells and organelles, and the shore in a rail, **done when:** cells swell through the skin with their membranes from step 25's tissue grid, a faint rim and each cell's own faint light ([D151 (dark-wet-skin)](#d151)). Organelles are one instanced mesh in step 94's outlines, emissive only by state. Bloom acts on emissive light alone, so base tissue never blooms ([D11 (mood)](#d11), [D12 (materials)](#d12)). Per [D153 (shore-rail)](#d153), the shore is a scrolled rail of flat blocks in the React chrome, from step 96's derivation: the groups the change touched first and open on their files, the changed ones lit and named, the rest collapsed, and the world frames the terrain alone. A Playwright screenshot of a fixture at LOD1 is reviewed at the pause, and its frame time is logged
    - seam: `apps/web/src/`
    - model: fable
33. [ ] feat(web): draw the weather, **done when:** step 26's attributes drive the world: reach as a warm glow dimming per hop, drawn from step 26's reach field and feeding the bloom at a fifth of its light ([D151 (dark-wet-skin)](#d151)), with lit crossings; change stains, and skins lit by their gaps with mutant notches; stitches; change storms in the IFR hue and standing ones as graphite terrain; dashed ghosts, and renamed and deleted outlines; and the exceptional edges, the only lines drawn; at the pause, screenshots of three fixtures (a calm one, a red one, a rename) match their SVGs mark for mark
    - seam: `apps/web/src/`
    - model: opus
34. [ ] feat(web): draw the notices with their labels and leaders, **done when:** the six notices take §5.4's tier channels. The primary breathes and flares through the scheduler at its anchor ([D148 (notice-anchors)](#d148)), in a saturated hue with its kind labelled; secondaries take a hue and a thick outline; tertiaries take a marker. Labels are DOM text through `CSS2DRenderer`, with dotted SVG leaders at step 27's placements, and the ranked list fills the right-hand column. A notice on a shore file shows its numbered box on its group's block in the rail ([D153 (shore-rail)](#d153)). The chrome never glows ([D12 (materials)](#d12))
    - seam: `apps/web/src/`
    - model: opus
35. [ ] feat(web): render the HUD's grade blocks, **done when:** the React chrome draws §7's row (the category with its letters; `Gate`, and `Standing` when present; Patch cov with the unmeasured count; Mutants, Reach and Size; Health Δ, muted until wave 3; Notices 1·2·3; and Other when non-empty) and [D87 (legend-inset)](#d87)'s inset with its key of the seven shapes ([D146 (morph-shapes)](#d146)), flat and high-contrast with no gradients; DOM tests render each block from fixture maps and compare its text with `libs/svg`'s for the same map
    - seam: `apps/web/src/`, `apps/web/package.json`, `pnpm-lock.yaml`
    - model: sonnet
36. [ ] feat(web): open each HUD block's parts on click, **done when:** each block opens its parts from the map: a red slot's named files and lines, the uncovered lines per file, the live mutants, and the reach list with its hops and the interfaces crossed. In served mode a red slot also links to its raw output, which the CLI serves read-only at `/check/<slot>` ([D93 (app-reads-what-it-is-served)](#d93)), only for a slot the map holds and only with the run's token ([D134 (loopback-trust)](#d134)); a fixture with no server shows the parts without the link. DOM tests cover each block, and a serve test covers the path and its refusals
    - seam: `apps/web/src/`, `apps/atis/src/serve.ts`, `apps/atis/src/__tests__/serve.test.ts`
    - model: sonnet
37. [ ] feat(web): zoom, pan, tilt and rotate the camera continuously, **done when:** `camera-controls` drives the orthographic camera. Scroll and pinch zoom continuously, drag pans, tilt stops at 35° and rotation is on demand; nothing moves on its own (§5.5). Step 28's plan cross-fades LOD0 to LOD2 as the zoom crosses its thresholds, without a blink. This is checked at the pause on a trackpad and a mouse
    - seam: `apps/web/src/`
    - model: sonnet
38. [ ] feat(web): pick and hover at every level of detail, **done when:** the pointer resolves to an organelle or a membrane at every level of detail, and the rail's blocks are DOM and take the pointer themselves ([D153 (shore-rail)](#d153)). The hovered thing eases to a highlight in 100 ms with no motion of its own, and its path shows in a hover tag. The pick resolver lives in `libs/scene` and is tested on fixture geometry
    - seam: `apps/web/src/`, `libs/scene/src/picking.ts`, `libs/scene/src/index.ts`, `libs/scene/src/__tests__/picking.test.ts`
    - model: opus
39. [ ] feat(web): fly to a notice and walk the map from the keyboard, **done when:** clicking a notice row flies the camera to its target within 400 ms, and the skin jiggles on landing. Arrow keys walk sibling cells, Enter descends and Escape ascends, and the HUD's breadcrumb reads field › cell › organelle at every stop. This is checked at the pause; the scheduler's tests already pin the timings
    - seam: `apps/web/src/`
    - model: sonnet
40. [ ] feat(web): open a cell into its stained interior, **done when:** at LOD2 a cell's interior fades in as a stained slide. Its organelles take their morphed outlines ([D146 (morph-shapes)](#d146)) and move by their rule count through the scheduler ([D147 (alive-motion)](#d147)) and drift by their looseness (step 99, [D157 (organelle-drift)](#d157)), and they are stained by change kind, with uncovered lines unstained ([C11 (one-meaning-per-channel)](#c11)), and the barrel's exports are written on the membrane. An exploded view spreads the organelles along dotted leaders on demand. Per [D155 (open-cell-holds)](#d155), the cell stays open while the reviewer pans and zooms inside it, and closes on zooming out past it, a click on open ground, or Esc; its file labels are tags on the chrome's ground, in columns on screen, each with its rule count. The slide's materials are double-sided, since triangulating in layout coordinates flips the winding on the ground plane. The interior's layout lives in `libs/scene` and is tested. At the pause it is checked against the cell's SVG, and Rob answers [Q69 (motion-direction)](#q69) with the interior alive
    - seam: `apps/web/src/`, `libs/scene/src/interior.ts`, `libs/scene/src/index.ts`, `libs/scene/src/__tests__/interior.test.ts`
    - model: fable
41. [ ] feat(web): overlay a changed cell's wiring, **done when:** `map.json` gains `weather.wiring[]`: the import edges from the head scan with a changed file at either end, an added key under [D85 (schema-bumps)](#d85). At LOD2 a toggle lays that subgraph out with `elkjs` in `libs/scene` and draws it in the technical-drawing chrome. Tests pin the edge set on the demo map and a deterministic layout
    - seam: `libs/core/src/map.ts`, `libs/core/src/schema.ts`, `libs/core/src/__tests__/map.test.ts`, `libs/core/src/__tests__/schema.test.ts`, `libs/core/fixtures/demo/`, `libs/scene/src/wiring.ts`, `libs/scene/src/index.ts`, `libs/scene/src/__tests__/wiring.test.ts`, `apps/web/src/`
    - model: opus
42. [ ] feat(web): honour reduced motion, **done when:** under `prefers-reduced-motion` the world keeps the load flare as a static halo and drops random flares, breathing, the settle, the jiggle, and the shapes' motion and drift, and fly-to cuts instead of easing, all through the scheduler ([C12 (motion-budget)](#c12)). A Playwright run with the media emulated shows no frame-to-frame change after load
    - seam: `apps/web/src/`
    - model: sonnet
43. [ ] perf(web): hold 60 fps at 5,000 files and a 2 s first frame, **done when:** a seeded generator in `libs/scene` builds a 5,000-file map. On an M-series laptop the world holds 60 fps through ten seconds of idle and a zoom sweep from LOD0 to LOD2, and draws its first complete frame about 2 s after receiving the map, where a little over passes ([C14 (world-budget)](#c14), [D150 (first-frame-target)](#d150)). The first frame is recorded on WebGPU and on the WebGL 2 fallback. A Playwright script measures both, reading a ready flag the app raises on its first complete frame (the flag step 50 and [D105 (png-capture)](#d105) later wait on), and the result is recorded in `docs/design.md`
    - seam: `libs/scene/src/synthetic.ts`, `libs/scene/src/index.ts`, `libs/scene/src/__tests__/synthetic.test.ts`, `apps/web/src/`, `apps/web/scripts/`, `docs/design.md`
    - model: opus
44. [ ] docs(design): record the world's material tokens and sources, **done when:** `docs/design.md` gains the world's tokens (emissive strengths, the bloom threshold and the reach's share of it, the rim and each cell's own light, the sheen and its sky, the terrace step and its ease, and the skin's heights), each defined in one place in code and moved live by the dev panel ([D156 (dev-panel)](#d156)). `docs/inspiration.md` gains rows for three.js, camera-controls, earcut, elkjs, React and Vite, with their licences and where each lands
    - seam: `docs/design.md`, `docs/inspiration.md`, `apps/web/src/`, `libs/scene/src/`
    - model: sonnet
45. [ ] chore(fixtures): select five fresh outside PRs for glance round two, **done when:** five folders `fixtures/round-two-<n>/`, in a shuffled order, carry a `README.md` and a `truth.md` chosen by step 16's rules, TypeScript included ([D126 (typescript-corpus)](#d126)). They come from repos no earlier reading or corpus used ([D95 (round-two-reading)](#d95)), with three of one verdict and two of the other. The pause gives counts only ([D62 (retake-reader-blind)](#d62))
    - seam: `fixtures/`
    - model: opus
46. [ ] chore(fixtures): generate the round-two maps, **done when:** each round-two folder holds a `map.json` passing `assertMap` and an `atis.svg`, made by step 17's procedure. The pause gives counts only
    - seam: `fixtures/`
    - model: sonnet
47. [ ] chore(glance): read glance round two in the world, **done when:** per [D95 (round-two-reading)](#d95), `docs/glance-test.md` gains round two: Rob's ten-second merge or hold and one reason per map, read blind in the world's opening frame with motion on and input off, after the legend and an unscored practice map in the world; criterion 5 per [D65 (notice-precision-reading)](#d65); and the pass line, or the fail line with its encodings parked ([D38 (glance-is-a-step)](#d38)); the one reader is named beside the result
    - seam: `docs/glance-test.md`, `apps/web/src/`
    - model: opus

*Added at refine pass one, and built right after step 26 ([D131 (svg-migration-step)](#d131)):*

88. [x] refactor(svg): draw the still map's weather from the scene's derivations, **done when:** per [D90 (scene-lib)](#d90) and [D131 (svg-migration-step)](#d131), `libs/svg` reads step 26's `weatherOf` wherever it computed its own (reach by hop and the lit crossings, gap arcs and mutant notches, stitches, the split storms, ghosts, and the renamed and deleted outlines). The code it replaces is deleted and fallow's `dupes` stays green, and `libs/svg/fixtures/demo/atis.svg` and the four goldens under `libs/svg/fixtures/categories/` are byte-identical before and after
    - seam: `libs/svg/src/weather.ts`, `libs/svg/src/__tests__/weather.test.ts`, `libs/scene/src/weather.ts`, `libs/scene/src/__tests__/weather.test.ts`
    - model: opus (a refactor proved byte for byte)

*Added at the wave-1 boundary's refine, and built where the build order puts them:*

93. [ ] feat(web): draw a minimap that moves the camera, **done when:** per [D154 (minimap)](#d154), a flat minimap at the bottom left of the chrome draws the body's silhouette, how far the reach goes, the changed files, the notices and the view's outline on the ground, and a click or a drag on it moves the camera. It never glows ([D12 (materials)](#d12)). Its geometry comes from `libs/scene` and is tested: the silhouette from the cells' contours, and the view's outline from the camera's frustum on the ground. At the pause it is tried beside the camera
    - seam: `apps/web/src/`, `libs/scene/src/minimap.ts`, `libs/scene/src/index.ts`, `libs/scene/src/__tests__/minimap.test.ts`
    - model: sonnet
94. [x] feat(svg): morph a file's outline by the rules it breaks, **done when:** per [D146 (morph-shapes)](#d146), `outlineOf` in `libs/scene` gives a file's outline at its rule count, 0 to 6, seeded by its path ([C3 (deterministic)](#c3)) and at any time, so the scheduler can move it later ([D147 (alive-motion)](#d147)). `libs/svg` draws every organelle with it, still, in place of the pulled vertices, and `DENT_VERTICES` and `DENT_PULL` leave the tokens; a cell's membrane keeps its teeth. The SVG's legend gains a key of the seven forms, the goldens are regenerated on purpose, and `docs/glance-practice.svg` is re-rendered. Tests pin each level's arms and bulbs, that the outline at rest is the one the SVG draws, and byte-stable output for one map
    - seam: `libs/scene/src/shape.ts`, `libs/scene/src/index.ts`, `libs/scene/src/tokens.ts`, `libs/scene/src/__tests__/shape.test.ts`, `libs/scene/src/__tests__/tokens.test.ts`, `libs/svg/src/`, `libs/svg/fixtures/`, `docs/design.md`, `docs/glance-practice.svg`
    - model: opus (one shape both renderers draw)
95. [x] feat(core): record every file's stability in the map, **done when:** per [D149 (stability-data)](#d149), every organelle the history window saw carries an optional `stability` (its `age_days` and `churn_ratio` across the window), from the counts `computeHistory` already makes, an added key under [D85 (schema-bumps)](#d85) that `assertMap` accepts. A changed file's own `age_days` and `churn_ratio` stay as they are. The demo map is regenerated, and `libs/svg/fixtures/demo/atis.svg` and the four category goldens are byte-identical. Tests pin an old, quiet file and a churny one on a captured history, and a file the window never saw carrying no key ([C2 (never-fake)](#c2))
    - seam: `libs/core/src/history.ts`, `libs/core/src/map.ts`, `libs/core/src/schema.ts`, `libs/core/src/__tests__/history.test.ts`, `libs/core/src/__tests__/map.test.ts`, `libs/core/src/__tests__/schema.test.ts`, `libs/core/fixtures/demo/`
    - model: sonnet
96. [x] feat(svg): draw the shore as a compact band of flat blocks, **done when:** per [D153 (shore-rail)](#d153), `shoreRail(map)` in `libs/scene` orders the shore's groups for both renderers: the groups the change touched first, each with its changed files named and marked by kind, then the rest by name and count, with `other` loud as [D48 (shore-groups)](#d48) has it. `libs/svg` draws them still as flat blocks in the chrome's style, in a band wrapping along the bottom of the sheet ([D158 (shore-band-position)](#d158)), in place of the organic strip above the top terrace, so the world's frame holds the terrain alone. The goldens are regenerated on purpose and `docs/glance-practice.svg` is re-rendered. Tests pin the order, a long shore staying compact, and no shore mark left under `#world`
    - seam: `libs/scene/src/shore.ts`, `libs/scene/src/index.ts`, `libs/scene/src/__tests__/shore.test.ts`, `libs/scene/src/tokens.ts`, `libs/svg/src/`, `libs/svg/fixtures/`, `docs/design.md`, `docs/glance-practice.svg`
    - model: opus (the shore both renderers draw)
97. [ ] feat(web): add a hidden dev panel that tunes every token live, **done when:** per [D156 (dev-panel)](#d156), a panel in the chrome lists every token by the sections `docs/design.md` gives them (colours, materials, motion) and moves each live: every world material and the scheduler read their tokens through one registry the panel writes, so a change shows on the next frame. It is off by default and its code loads only when opened; a development build shows a toggle, and a published build opens it only by a key combination the docs never name. Its changes last for the session, and it copies the changed tokens as a `tokens.ts` patch for [Q3 (flare-and-jiggle-numbers)](#q3)'s log. `--png` and a glance reading never open it. DOM tests cover the listing, a live change, the patch text, and the panel's absence by default
    - seam: `apps/web/src/`, `apps/web/package.json`, `pnpm-lock.yaml`
    - model: sonnet
98. [x] feat(core): record each file's import ties inside and outside its cell, **done when:** per [D157 (organelle-drift)](#d157), every organelle carries an optional `ties` key: the count of its import edges, in either direction on the head graph ([D39 (two-graphs)](#d39)), to files in its own cell and to terrain files in other cells, with tests and the shore not counted ([D4 (tests-not-terrain)](#d4)). It is an added key under [D85 (schema-bumps)](#d85) that `assertMap` accepts, and a deleted file carries none. The demo map is regenerated, and `libs/svg/fixtures/demo/atis.svg` and the four category goldens are byte-identical. Tests pin a barrel held by its siblings, a file whose imports all leave its cell, and a file with no ties
    - seam: `libs/core/src/ties.ts`, `libs/core/src/map.ts`, `libs/core/src/schema.ts`, `libs/core/src/index.ts`, `libs/core/src/__tests__/ties.test.ts`, `libs/core/src/__tests__/map.test.ts`, `libs/core/src/__tests__/schema.test.ts`, `libs/core/fixtures/demo/`
    - model: sonnet
99. [ ] feat(scene): drift each file in an opened cell by its looseness, **done when:** per [D157 (organelle-drift)](#d157), the scheduler moves each organelle of an opened cell about its layout position by its looseness, the share of its `ties` that leave its cell. A file held by its cellmates barely moves, and a wholly loose one floats freely, kept inside the membrane and off its neighbours, so it bumps them. A file alone in its cell, a deleted file, and a file without `ties` stay still ([C2 (never-fake)](#c2)). The drift is seeded ([D94 (seeded-motion)](#d94)), stilled under reduced motion, and timed from motion tokens the design doc's table logs ([Q3 (flare-and-jiggle-numbers)](#q3)). Tests replay a minute of seeded time on the demo map: a tethered file stays near its place, a loose one travels further and touches the membrane, no two files' bodies overlap, every file sits at its layout position while its cell is closed or motion is reduced, and one seed and one time give one frame
    - seam: `libs/scene/src/drift.ts`, `libs/scene/src/motion.ts`, `libs/scene/src/index.ts`, `libs/scene/src/tokens.ts`, `libs/scene/src/__tests__/drift.test.ts`, `libs/scene/src/__tests__/motion.test.ts`, `libs/scene/src/__tests__/tokens.test.ts`, `docs/design.md`
    - model: opus (a simulation its tests can replay)

### Wave 3: phase 3, bases and overlays

*Sharpened by `/plumbbob:refine` at the wave-2 boundary, with round two's parks in hand.*

48. [ ] feat(cli): cache the terrain per base commit, **done when:** per [D96 (terrain-cache)](#d96), the base scan, history and layout are written atomically to `.atis/terrain/<sha>.json`, keyed also by a hash of atis's own built files, read at startup (its sources, under vitest), and the config's hash ([D137 (cache-key)](#d137)), with `.atis/.gitignore` holding `*`. A second run on the same base reads the cache, and its map is byte-identical to the first except for `generated_at` ([C3 (deterministic)](#c3)). `--no-cache` bypasses the cache, and `--verbose` names a hit or a miss. Tests cover a hit, a miss on a changed config, a miss on changed code, and a corrupt file read as a miss
    - seam: `apps/atis/src/cache.ts`, `apps/atis/src/run.ts`, `apps/atis/src/cli.ts`, `apps/atis/src/index.ts`, `apps/atis/src/__tests__/cache.test.ts`, `libs/core/src/map.ts`, `libs/core/src/index.ts`
    - model: sonnet
49. [ ] feat(core): relax a new base's layout from the nearest cached one, **done when:** per [D97 (incremental-relayout)](#d97), `buildMap` accepts prior positions and starts the seeded simulation from them, so a file that kept its path starts where it was. The head's layout, relaxed from the base's, gives a renamed file its second position. On two consecutive commits of this repo, the mean displacement of unchanged files stays below a pinned bound, while a cold layout of the second commit exceeds it. The result is deterministic for one prior and one input
    - seam: `libs/core/src/layout/`, `libs/core/src/map.ts`, `libs/core/src/schema.ts`, `libs/core/src/__tests__/layout.test.ts`, `apps/atis/src/run.ts`, `apps/atis/src/cache.ts`
    - model: opus
50. [ ] perf(cli): draw a cached run's first frame within two seconds, **done when:** `computeEvidence` walks reach once for the whole change instead of once per changed file, with each file's `cells_reached` unchanged (a test pins equality on the demo inputs), and the head scan re-reads only the files the diff touched over the cached base scan (a test pins it equal to a full head scan on the demo inputs) ([D136 (first-frame-clock)](#d136)). `--verbose` timings for this repo and the corpus repos are recorded in `docs/performance.md`, and if any repo's `log` source passes about two seconds, `--history <n>` lands per [D50 (history-measured)](#d50). A cached second run draws its first frame within 2 s of the command, timed to the app's ready flag with the browser already running, on this repo and on the largest corpus repo ([C14 (world-budget)](#c14)), measured by a script that records each leg per repo
    - seam: `libs/core/src/evidence.ts`, `libs/core/src/reach.ts`, `libs/core/src/__tests__/evidence.test.ts`, `apps/atis/src/cli.ts`, `apps/atis/src/run.ts`, `apps/atis/src/cache.ts`, `apps/atis/src/sources/git.ts`, `apps/atis/src/sources/imports.ts`, `apps/atis/src/__tests__/imports.test.ts`, `docs/performance.md`
    - model: sonnet
51. [ ] feat(cli): measure health, duplication and structure at the base, **done when:** per [D98 (base-side-structure)](#d98), the reviewed repo's own fallow, run directly ([D22 (local-fallow)](#d22)), runs `health`, `dupes` and `dead` on the base and the head extractions. The output is read by the pure parsers `check.ts` already has; the base side is cached with the terrain, and the head side per head commit beside it ([D136 (first-frame-clock)](#d136)). `meta.instruments` records the base side's fallow version, or why it is absent. Tests run from captured output
    - seam: `apps/atis/src/sources/fallow.ts`, `apps/atis/src/sources/index.ts`, `apps/atis/src/sources/check.ts`, `apps/atis/src/run.ts`, `apps/atis/src/cache.ts`, `apps/atis/src/__tests__/fallow.test.ts`, `libs/core/src/map.ts`, `libs/core/src/schema.ts`
    - model: sonnet
52. [ ] feat(core): compute health deltas, introduced findings and improvements, **done when:** with both sides measured, a `health` or `dupes` finding is the change's when it is new at head or worse than its base self, replacing [D73 (touched-file-breach)](#d73)'s line rule; a cycle or boundary violation is introduced when it is absent at the base, lifting [D23 (head-only-check)](#d23); `weather.improvements[]` lists a threshold no longer breached, a dent gone, a clone family dissolved and a cycle broken; `weather.health_delta` carries the change's net movement per file and in total, in fallow's own measures; with no base side every one of these is absent, never zero ([C2 (never-fake)](#c2)); tests cover each
    - seam: `libs/core/src/evidence.ts`, `libs/core/src/notices.ts`, `libs/core/src/map.ts`, `libs/core/src/schema.ts`, `libs/core/src/__tests__/`, `libs/core/fixtures/demo/`
    - model: opus
53. [ ] feat(svg): draw improvements, the live Health Δ and the rename leader, **done when:** an improved file wears §5.3's calm-positive state, a hue token recorded in `docs/design.md`. The Health Δ block shows the total with its sign. A renamed file draws a dashed leader from its base position to its head position ([D40 (rename-identity)](#d40), [D97 (incremental-relayout)](#d97)). Tests and the golden pin each
    - seam: `libs/svg/src/`, `libs/svg/fixtures/demo/`, `docs/design.md`
    - model: sonnet
54. [ ] feat(web): draw improvements, Health Δ and the rename leader, **done when:** the world shows step 53's three marks from the same derivations as the SVG ([D90 (scene-lib)](#d90)), checked side by side at the pause
    - seam: `apps/web/src/`, `libs/scene/src/`
    - model: sonnet
55. [ ] feat(cli): resolve the trunk and the named bases, **done when:** per [D99 (named-bases)](#d99), `--base` is optional and resolves the configured trunk, or the first of `main`, `master`, `develop` and `trunk` (local, then `origin/`). `--last-commit`, `--last-tag` and `--head <ref>` work, and two that conflict exit 2 as misuse ([C4 (never-blocks)](#c4)). `meta` records the base both as typed and as resolved. Per [D135 (evidence-for-head)](#d135), a head other than the checked-out `HEAD` reads git-only, with the reason in `meta.instruments`. Tests run against temp clones
    - seam: `apps/atis/src/cli.ts`, `apps/atis/src/run.ts`, `apps/atis/src/index.ts`, `apps/atis/src/sources/git.ts`, `apps/atis/src/__tests__/git.test.ts`, `apps/atis/src/__tests__/cli.test.ts`, `libs/core/src/config.ts`, `libs/core/src/schema.ts`
    - model: sonnet
56. [ ] feat(cli): map the working tree's uncommitted weather, **done when:** `--working-tree` reads the head side from the working tree: tracked files, plus the untracked ones git would add. `meta.head` reads `working-tree`, `.check/` is read as the tree's own evidence ([D135 (evidence-for-head)](#d135)), and the usage text says [C3 (deterministic)](#c3) holds only on a clean tree, amending [D46 (head-is-a-commit)](#d46). Tests cover a staged, an unstaged and an untracked change
    - seam: `apps/atis/src/cli.ts`, `apps/atis/src/run.ts`, `apps/atis/src/index.ts`, `apps/atis/src/sources/git.ts`, `apps/atis/src/__tests__/git.test.ts`, `apps/atis/src/__tests__/cli.test.ts`, `libs/core/src/schema.ts`
    - model: sonnet
57. [ ] feat(core): build one weather frame per commit of a range, **done when:** per [D100 (sequence-frames)](#d100), `--range a..b` writes one map whose terrain is `merge-base(a, b)`'s and whose `weather` and `notices` are `b`'s, while `sequence.frames[]` holds each commit's weather and notices in order, and only a frame whose commit is the checked-out `HEAD` carries evidence ([D135 (evidence-for-head)](#d135)). `assertMap` checks every frame. Tests use a three-commit temp repo
    - seam: `libs/core/src/map.ts`, `libs/core/src/schema.ts`, `libs/core/src/__tests__/map.test.ts`, `libs/core/src/__tests__/schema.test.ts`, `apps/atis/src/cli.ts`, `apps/atis/src/run.ts`, `apps/atis/src/__tests__/cli.test.ts`
    - model: opus
58. [ ] feat(web): scrub a range's weather over one terrain, **done when:** a scrubber in the HUD steps through `sequence.frames[]`. Each step is a cross-fade inside the motion budget ([C12 (motion-budget)](#c12)), and the terrain never moves (P2). The keyboard steps the frames too. This is checked at the pause on a range of this repo
    - seam: `apps/web/src/`, `libs/scene/src/`
    - model: sonnet
59. [ ] feat(core): compute the whole-repo overlays, **done when:** per [D101 (whole-repo-mode)](#d101), `--whole-repo` writes a map with `meta.mode: "repo"`, no weather, and an `overlays` key. It holds trouble spots, ugly spots, coverage gaps, dead code, duplication, cycles, recent heat, and baselined findings drawn muted when checkride's baseline is committed. Each overlay is absent when its source is ([C2 (never-fake)](#c2)), and each has its own tests
    - seam: `libs/core/src/overlays.ts`, `libs/core/src/map.ts`, `libs/core/src/schema.ts`, `libs/core/src/index.ts`, `libs/core/src/__tests__/overlays.test.ts`, `apps/atis/src/cli.ts`, `apps/atis/src/run.ts`, `apps/atis/src/sources/check.ts`
    - model: opus
60. [ ] feat(svg): render the whole-repo overlays in the still map, **done when:** `--svg` on a repo-mode map draws one overlay at a time (`--overlay <name>`, trouble spots by default), in the luminance or texture channel its measure owns ([C11 (one-meaning-per-channel)](#c11)), with the HUD naming the overlay. Goldens cover two overlays
    - seam: `libs/svg/src/`, `libs/svg/fixtures/`, `apps/atis/src/cli.ts`, `apps/atis/src/run.ts`
    - model: sonnet
61. [ ] feat(web): toggle overlays and switch bases from the HUD, **done when:** the HUD toggles each overlay on a repo-mode map. In served mode, a base selector lists the trunk, the last tag, `HEAD~1` and the working tree, and asks the serving CLI to rebuild over a loopback `POST /base` ([C13 (loopback-only)](#c13)). The POST requires the run's token and a matching `Origin`, and takes only a ref `git rev-parse --verify` resolves to a commit, never one starting with `-`, with a serve test for each refusal ([D134 (loopback-trust)](#d134)). The terrain stays put when the new base's terrain is cached (P2)
    - seam: `apps/web/src/`, `apps/atis/src/serve.ts`, `apps/atis/src/__tests__/serve.test.ts`
    - model: sonnet
62. [ ] feat(core): record each file's functions for the file level, **done when:** per [D102 (file-and-diff-levels)](#d102), each organelle carries `functions[]` (name, start line, line count, and the thresholds it breaches), taken from the scan and `health.json`, as an added key under [D85 (schema-bumps)](#d85). Tests run from strings
    - seam: `apps/atis/src/sources/imports.ts`, `apps/atis/src/__tests__/imports.test.ts`, `libs/core/src/map.ts`, `libs/core/src/schema.ts`, `libs/core/src/__tests__/map.test.ts`, `libs/core/fixtures/demo/`
    - model: sonnet
63. [ ] feat(web): open a file into its functions, hunks and coverage strip, **done when:** LOD3 shows one organelle's functions as granules sized by lines and dented by breaches, together with its changed hunks, a per-line coverage strip, and its live mutants pinned to their lines (§6). It cross-fades from LOD2 under step 28's plan
    - seam: `apps/web/src/`, `libs/scene/src/`
    - model: opus
64. [ ] feat(web): show a changed file's diff or open it in the editor, **done when:** LOD4 shows a changed file's diff, which the CLI serves read-only from git at `/diff/<path>` ([D93 (app-reads-what-it-is-served)](#d93)), only for a path the map holds and only with the run's token ([D134 (loopback-trust)](#d134)). A link opens the file at a line through a configurable editor URL template, and opens the PR when one is known. A fixture with no server shows the hunks' line ranges alone
    - seam: `apps/web/src/`, `apps/atis/src/serve.ts`, `apps/atis/src/__tests__/serve.test.ts`, `libs/core/src/config.ts`
    - model: sonnet
65. [ ] feat(web): open the health radar from the HUD, **done when:** per [D103 (health-radar)](#d103), a changed file's radar of raw metrics opens one click from the HUD, categorised against [D9 (thresholds)](#d9) or raw by a toggle, in the flat chrome. DOM tests cover it on fixture maps
    - seam: `apps/web/src/`
    - model: sonnet
66. [ ] perf(web): collapse cells into composites past 5,000 files, **done when:** above 5,000 files, LOD1 draws each package cell as one composite until the camera nears it, Nx style. It holds 30 fps at 20,000 files on step 43's generator ([C14 (world-budget)](#c14)), recorded in `docs/design.md`
    - seam: `apps/web/src/`, `libs/scene/src/`, `docs/design.md`
    - model: opus

### Wave 4: phase 4, delivery

*Sharpened at the wave-3 boundary, where [Q38 (comment-image)](#q38) settles. [Q37 (png-browser)](#q37) settles earlier, at the wave-1 boundary ([D132 (world-smoke-test)](#d132)).*

67. [ ] refactor(cli): give atis subcommands beside its map flags, **done when:** per [D104 (subcommands)](#d104), the CLI parses an optional leading verb, and no verb means the map as before. An unknown verb exits 2 with the usage. Tests pin that every existing flag behaves as it did
    - seam: `apps/atis/src/cli.ts`, `apps/atis/src/index.ts`, `apps/atis/src/__tests__/cli.test.ts`, `apps/atis/src/__tests__/index.test.ts`
    - model: sonnet
68. [ ] feat(cli): capture the world headless as a PNG, **done when:** per [D105 (png-capture)](#d105), and [Q37 (png-browser)](#q37) as settled, `atis --png <file>` serves the world and drives a headless browser to the fixed viewport, with the scheduler frozen at a set time and reduced motion on. It waits for the app's ready flag, then writes the screenshot. Two captures of one fixture on one machine and backend are byte-identical. With no browser available it exits 2, naming what to install ([C4 (never-blocks)](#c4))
    - seam: `apps/atis/src/png.ts`, `apps/atis/src/cli.ts`, `apps/atis/src/run.ts`, `apps/atis/src/index.ts`, `apps/atis/src/__tests__/png.test.ts`, `apps/atis/package.json`, `pnpm-lock.yaml`, `apps/web/src/`
    - model: opus
69. [ ] feat(cli): watch the repo and push new weather to the tab, **done when:** per [D106 (watch-mode)](#d106), and after reading weft's `packages/watch`, `--watch` in served mode rebuilds the map when `HEAD`, the index or `.check/summary.json` changes. Changes are debounced, the cached terrain is reused, and the new map is pushed to the open tab over a WebSocket on the same loopback port, which requires the run's token and a matching `Origin` ([D134 (loopback-trust)](#d134)). The world swaps the weather without moving the terrain (P2). Tests drive a temp repo through two commits, and `docs/inspiration.md` cites weft
    - seam: `apps/atis/src/watch.ts`, `apps/atis/src/serve.ts`, `apps/atis/src/cli.ts`, `apps/atis/src/__tests__/watch.test.ts`, `apps/atis/package.json`, `pnpm-lock.yaml`, `apps/web/src/`, `docs/inspiration.md`
    - model: opus
70. [ ] feat(cli): render the terrain fingerprint for a README, **done when:** per [D107 (fingerprint)](#d107), `atis fingerprint --out <svg>` writes the terrain alone at a small fixed size, byte-identical for one commit. `docs/fingerprint.md` gives an optional GitHub Actions workflow that refreshes it daily, which atis never installs. The repo's own `README.md` shows atis's fingerprint
    - seam: `libs/svg/src/`, `apps/atis/src/cli.ts`, `apps/atis/src/run.ts`, `apps/atis/src/index.ts`, `docs/fingerprint.md`, `docs/img/`, `README.md`
    - model: sonnet
71. [ ] feat(cli): post the map to a pull request through gh, **done when:** per [D108 (pr-comment)](#d108), and [Q38 (comment-image)](#q38) as settled, `atis --comment` finds the branch's PR with `gh`. It is explicit, one of the two networked commands ([C5 (no-network)](#c5)). It posts, or updates, one comment carrying the HUD as a markdown table, the six notices with their whys and thresholds, and the image. Without `gh` or a PR it exits 2, naming why. The comment body is built by a pure function and golden-tested from a fixture
    - seam: `apps/atis/src/comment.ts`, `apps/atis/src/cli.ts`, `apps/atis/src/run.ts`, `apps/atis/src/__tests__/comment.test.ts`, `apps/atis/fixtures/`
    - model: sonnet
72. [ ] build(atis): bundle the workspace into a package that installs, **done when:** per [D109 (installable-package)](#d109), `pnpm pack` in `apps/atis` yields a tarball whose `package.json` names no workspace package in `dependencies`, and whose `dist/` carries core, svg and scene bundled, plus the built web app in `dist/web/`, where the workspace build already puts it ([D133 (served-assets)](#d133)). A gate test asserts both from the packed manifest and file list. At the pause, the tarball installs into an empty temp directory, and `atis --version` and `atis --base HEAD~1 --out map.json` run there against a clone of this repo
    - seam: `apps/atis/package.json`, `apps/atis/tsconfig.json`, `apps/atis/scripts/`, `apps/atis/src/__tests__/package.test.ts`, `package.json`, `pnpm-lock.yaml`
    - model: opus (bundling without breaking the source condition)
73. [ ] docs(atis): write the user's README with the legend and the fingerprint, **done when:** `apps/atis/README.md` (the npm page) and the root `README.md` say what atis is and how to install and run it: serving, `--svg`, `--png`, `--watch`, `--comment`, the bases, `--range` and `--whole-repo`. They say what the map means, with `docs/glance-test.md`'s legend made general, and what atis never does (§10), and they show the fingerprint. The `docs`, `links` and `spell` slots are green
    - seam: `README.md`, `apps/atis/README.md`, `cspell.json`
    - model: sonnet

### Wave 5: phase 5, later

*Sharpened at the wave-4 boundary, where [Q39 (other-language-evidence)](#q39) and [Q40 (tour-provider)](#q40) settle and JavaScript as terrain is weighed ([D126 (typescript-corpus)](#d126)). Step 79 moves the language out of core first, so each producer after it is an addition, not a change to core ([D114 (producers-compose)](#d114)).*

74. [ ] feat(cli): serve MCP tools that point at the open map, **done when:** per [D110 (mcp-tools)](#d110), `atis mcp` runs a stdio MCP server with three tools. `highlight` sends the open tab a target to fly to and light, over step 69's socket. `reach` returns a file's reach from the current map. `explain` returns a notice's why, inputs and thresholds. The server reads only the map the serving process holds. Per [D138 (mcp-finds-tab)](#d138), the serving process writes `.atis/serve.json` (port, token and pid, readable by its owner alone, removed on exit), and `atis mcp`, started in that repo, connects to it as a client; with no serving process, `reach` and `explain` read the map `--map <file>` names, and `highlight` returns a tool error saying no tab is open. Tests drive each tool through an in-process client, with a serving process and without one
    - seam: `apps/atis/src/mcp.ts`, `apps/atis/src/serve.ts`, `apps/atis/src/cli.ts`, `apps/atis/src/index.ts`, `apps/atis/src/__tests__/mcp.test.ts`, `apps/atis/package.json`, `pnpm-lock.yaml`, `apps/web/src/`
    - model: sonnet
75. [ ] feat(core): reach exported names through the files that import them, **done when:** per [D111 (symbol-reach)](#d111), each changed exported name reaches the files that import it, followed through re-exports by name, and `weather.reach[]` entries gain the `names` that carried them. Fallow's `--symbol-impact` on checkride PR 4 is the spot-check oracle, recorded in `docs/spike.md` the way `--impact-closure` was. Tests run from strings
    - seam: `libs/core/src/reach.ts`, `libs/core/src/map.ts`, `libs/core/src/schema.ts`, `libs/core/src/__tests__/reach.test.ts`, `libs/core/fixtures/demo/`, `docs/spike.md`
    - model: opus
76. [ ] feat(web): light a symbol's reach where it crosses a membrane, **done when:** at LOD2, the barrel exports written on a membrane light by the names that carried the reach, the HUD's reach list groups by name, and the SVG writes the names in the crossing's label. This is checked at the pause on checkride PR 4's fixture
    - seam: `apps/web/src/`, `libs/scene/src/`, `libs/svg/src/`, `libs/svg/fixtures/demo/`
    - model: sonnet
77. [ ] feat(tour): write an opt-in reviewer's tour with fascicle, **done when:** per [D112 (tour-is-separate)](#d112), and [Q40 (tour-provider)](#q40) as settled, a separate app `apps/tour` reads a `map.json` and writes `tour.json` through fascicle: ordered stops, each a target, one sentence, and the notice it explains. It is its own package and never a dependency of `@robmclarty/atis`. A run against fascicle's stub engine is golden-tested, and nothing in `apps/atis` calls a model ([C5 (no-network)](#c5))
    - seam: `apps/tour/`, `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `fallow.toml`, `cspell.json`
    - model: opus
78. [ ] feat(web): play a tour's stops with fly-to, **done when:** when the serving CLI is handed `--tour <file>`, the world shows a stepper that flies to each stop in order, with its sentence in the chrome. A served map with no tour shows nothing new
    - seam: `apps/web/src/`, `apps/atis/src/serve.ts`, `apps/atis/src/cli.ts`, `apps/atis/src/__tests__/serve.test.ts`
    - model: sonnet
79. [ ] refactor(cli): run every producer a repo needs and merge their scans, **done when:** per [D114 (producers-compose)](#d114), the TypeScript scan becomes the first producer behind one interface (a producer claims files by extension and returns their files, edges, members and entry-point lookup); every producer whose files a commit tracks runs, and their results merge into one `Scan`; each file's kind and its directory's barrel come from the scan, so core's `classifyFile` no longer knows an extension; `atis.config.json` can switch a producer off, and a producer that cannot run leaves its files on the shore and says why in `meta.instruments`; every existing map, the goldens included, is unchanged by the refactor
    - seam: `apps/atis/src/sources/`, `apps/atis/src/run.ts`, `apps/atis/src/__tests__/`, `libs/core/src/modules.ts`, `libs/core/src/groups.ts`, `libs/core/src/map.ts`, `libs/core/src/config.ts`, `libs/core/src/schema.ts`, `libs/core/src/__tests__/`
    - model: opus (moving the language out of core without moving a map)
80. [ ] fix(core): sort other languages' manifests and settings onto the shore, **done when:** [D48 (shore-groups)](#d48)'s default table gains rows by kind: `go.mod`, `go.sum`, `go.work`, `pyproject.toml`, `requirements*.txt`, `uv.lock`, `poetry.lock`, `Pipfile`, `Pipfile.lock` and `.terraform.lock.hcl` to `deps`; `*.tfvars`, `setup.cfg`, `tox.ini`, `pytest.ini`, `mypy.ini`, `ruff.toml`, `.tflint.hcl` and `.shellcheckrc` to `config`; `.python-version` to `settings`; the groups test pins one path per pattern
    - seam: `libs/core/src/config.ts`, `libs/core/src/__tests__/groups.test.ts`
    - model: sonnet (table rows, fully specified)
81. [ ] feat(cli): scan a Go module into the same scan shape, **done when:** per [D113 (go-producer)](#d113), as a producer behind step 79's interface, a repo's Go modules are scanned through `go list -e -json` with `GOPROXY=off` and `GOTOOLCHAIN=local`, never with `-compiled` or `-export` ([D139 (inert-helpers)](#d139)): packages become cells, `main` packages entry points, and `_test.go` files tests; an embedded Go helper, run with `go run`, gives each package's exported names and their shapes; the pure parser is tested from captured `go list` output; with no Go toolchain, `.go` files stay on the shore and `meta.instruments` says why; a test proves that a planted program in the tree never runs
    - seam: `apps/atis/src/sources/go.ts`, `apps/atis/src/sources/go-helper/`, `apps/atis/src/sources/index.ts`, `apps/atis/src/__tests__/go.test.ts`, `apps/atis/fixtures/go/`
    - model: opus
82. [ ] feat(cli): scan a Python project into the same scan shape, **done when:** per [D115 (python-producer)](#d115), the Python producer turns a project's `.py` files into package cells with `__init__.py` barrels (namespace packages as directory cells), resolved absolute and relative imports (third-party dropped), entry points from `[project.scripts]`, `__main__.py` and `__main__` guards, tests, and exports with their shapes, through a helper run with the repo's own Python that uses `ast` and never imports the code: it ships as a file outside the tree, takes the tree as an argument, and runs with `-I -S` from a working directory outside it ([D139 (inert-helpers)](#d139)); the parser of the helper's output is tested from captured JSON, and the helper from a temp tree of strings, where a planted `ast.py` never runs; with no Python found, `.py` files stay on the shore and `meta.instruments` says why
    - seam: `apps/atis/src/sources/python.ts`, `apps/atis/src/sources/python-helper/`, `apps/atis/src/sources/index.ts`, `apps/atis/src/__tests__/python.test.ts`, `apps/atis/fixtures/python/`
    - model: opus
83. [ ] feat(cli): scan Terraform modules into the same scan shape, **done when:** per [D116 (terraform-producer)](#d116), the Terraform producer turns each directory of `.tf` files into a module cell with its files as organelles, local `module` sources into edges, root modules into entry points, `variable` and `output` blocks into exports shaped by type and default, and `*.tftest.hcl` files into tests; registry and git module sources and provider version constraints join the dependency delta ([D47 (dependency-delta)](#d47)); a JavaScript or WASM HCL parser, installed at its latest release, reads it all ([C9 (deps-earn-their-place)](#c9)); tests run from HCL strings in a temp tree
    - seam: `apps/atis/src/sources/terraform.ts`, `apps/atis/src/sources/index.ts`, `apps/atis/src/run.ts`, `apps/atis/src/__tests__/terraform.test.ts`, `apps/atis/package.json`, `pnpm-lock.yaml`, `docs/inspiration.md`
    - model: opus
84. [ ] feat(cli): scan shell scripts into the same scan shape, **done when:** per [D117 (shell-producer)](#d117), the shell producer turns `.sh` and `.bash` scripts into organelles in their directories' cells, `source` and `.` lines and invocations of a tracked script by path into edges, executable scripts nothing sources into entry points, functions in sourced scripts into exports, and `*.bats` files into tests; a JavaScript or WASM shell parser, installed at its latest release, reads them; tests run from script strings in a temp tree; the shore's `*.sh` row keeps only what the producer leaves when switched off
    - seam: `apps/atis/src/sources/shell.ts`, `apps/atis/src/sources/index.ts`, `apps/atis/src/__tests__/shell.test.ts`, `apps/atis/package.json`, `pnpm-lock.yaml`, `libs/core/src/config.ts`, `libs/core/src/__tests__/groups.test.ts`, `docs/inspiration.md`
    - model: sonnet
85. [ ] feat(cli): read each language's evidence as checkride writes it, **done when:** per [Q39 (other-language-evidence)](#q39) as settled, for each language whose checkride shape writes `.check/` by the wave-4 boundary, atis reads that slot's native artifacts through pure parsers tested from captured text ([D30 (pure-parsers)](#d30), [D41 (artifact-trust)](#d41)): coverage into patch coverage, test results into stitches, and findings into `lint` and `security`; a language with no shape has no evidence channel, and `meta.instruments` names why
    - seam: `apps/atis/src/sources/check.ts`, `apps/atis/src/__tests__/check.test.ts`, `apps/atis/fixtures/check/`, `libs/core/src/evidence.ts`, `libs/core/src/schema.ts`
    - model: sonnet
86. [ ] chore(fixtures): render one reviewed PR per new language, **done when:** `fixtures/go-1/`, `fixtures/python-1/`, `fixtures/terraform-1/` and `fixtures/shell-1/` each hold a reviewed outside PR's `map.json` and `atis.svg`, with its README and truth per [D59 (outside-fixtures)](#d59), each from a repo whose main code is that language; each map's cells are that language's modules, and its evidence reads as [Q39 (other-language-evidence)](#q39) settles; `docs/inspiration.md` cites the four repos
    - seam: `fixtures/go-1/`, `fixtures/python-1/`, `fixtures/terraform-1/`, `fixtures/shell-1/`, `docs/inspiration.md`
    - model: sonnet
87. [ ] docs(producers): write the contract a language producer fills, **done when:** `docs/producers.md` documents step 79's producer interface and the `Scan` it fills as the versioned input a language producer writes (files with their kind, lines, exports and shapes; edges with names and re-exports; members with their entries; the entry-point lookup), with the five producers (TypeScript, Go, Python, Terraform, shell) as worked examples, so a sixth language is a producer and never a core change
    - seam: `docs/producers.md`
    - model: sonnet

## Build order

23, 95, 98, 24, 25, 26, 88, 94, 96, 27, 28, 29, 99, 30, 97, 31, 32, 33, 34, 35, 36, 37, 93, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87

## Build ranges

Drive the build with `/plumbbob:run`: each run lands one range and stops where the call is yours. The ranges for waves 2 to 5 are provisional, and the refine at the boundary before each wave re-cuts them with `/plumbbob:refine ranges` ([D79 (waves)](#d79)).

1. `/plumbbob:build 1-11`, **stop:** review what the map now says on the regenerated demo map before the SVG work draws it (unmeasured files lit whole, interface notices split by what moved and weighed by their readers, security only on the change, committed build output on the shore), and open `fixtures/retake-1/`'s re-rendered map in Quick Look to confirm no HUD block overruns its box (step 11's check)
   - model: opus
2. `/plumbbob:build 12-15`, **stop:** review the SVG before the corpus is scored on it: cell dents and clone glyphs on membranes, no organelle inside a cell it does not belong to, the `+` on added paths, the legend inset, and `docs/glance-practice.svg` with its callouts
   - model: opus
3. `/plumbbob:build 16-18`, **stop:** read the tuning half's precision by fixture number alone ([D62 (retake-reader-blind)](#d62)) and its parked misses, then run the one refine pass [D127 (tuning-loop)](#d127) allows; the fix steps it adds join range 4, ahead of step 19
   - model: opus
4. `/plumbbob:build 89-92,19`, **stop:** review the tuning fixes as they landed, and the held-out six by their counts alone, before your blind reading builds on them
   - model: opus
5. `/plumbbob:build 20`, **stop:** at step 20's pause, read the five held-out maps blind from their shuffled copies, ten seconds each, after the legend and the practice map, and give a merge or hold with one reason for each ([D119 (svg-reading)](#d119))
   - model: opus
6. `/plumbbob:build 21-21`, **stop:** wave 0's boundary: settle the reading's result and its parks (the encodings wait for a working system, [D144 (working-system-first)](#d144)), then run `/plumbbob:spike materials` ([D89 (spike-on-a-fixture)](#d89)), whose verdict step 22 records
   - model: sonnet
7. `/plumbbob:build 22`, **stop:** at step 22's pause, approve the spike's verdict and the motion tokens as recorded; once it lands, `/plumbbob:refine` sharpens wave 2 with them and settles [Q37 (png-browser)](#q37) for step 30's smoke test
   - model: fable
8. `/plumbbob:build 23,95,98,24-26,88,94,96,27-29,99`, **stop:** review the scene model, with the stability and the ties it reads (steps 95 and 98) and the drift's seeded replay (step 99); the SVG drawn from it with every golden unchanged (step 88); then the SVG's morphed outlines with their shape key (step 94) and its shore as a band of flat blocks along the bottom (step 96), before the world renders them
   - model: opus
9. `/plumbbob:build 30`, **stop:** at step 30's pause, judge the opening frame's screenshot: the dark skin over soft terraces and swells under one key light, the sheen once tilted, and a far zoom lit only by the notices and the changed set, with a clean console on both backends
   - model: fable
10. `/plumbbob:build 97,31-33`, **stop:** open `atis --base main` in your own tab, with the dev panel to hand (step 97), and review the world at LOD1 before notices are labelled over it: dark tissue with its faint rim, organelles lit only by state, the shore rail, base tissue that never blooms (step 32's review), and three fixtures' weather against their SVGs, mark for mark (step 33's check)
    - model: fable
11. `/plumbbob:build 34-37`, **stop:** try the camera on a trackpad and a mouse (step 37's check: continuous zoom, tilt stopping at 35°, nothing moving on its own, level-of-detail cross-fades without a blink), and review the notices' tiers, labels and leaders and the HUD's blocks and their parts
    - model: opus
12. `/plumbbob:build 93,38-39`, **stop:** try picking and hover at every level of detail, fly-to from a notice row, the keyboard walk with its breadcrumb (step 39's check), and the minimap (step 93), before the cell's interior opens beneath them
    - model: opus
13. `/plumbbob:build 40`, **stop:** at step 40's pause, compare the stained interior and its exploded view with the cell's SVG, then, with the interior alive, answer [Q69 (motion-direction)](#q69)
    - model: fable
14. `/plumbbob:build 41-46`, **stop:** review the finished world before your blind reading in it: the wiring overlay, reduced motion, the 60 fps and 2 s measurements in `docs/design.md`, the material tokens, and the round-two fixtures by their counts alone
    - model: opus
15. `/plumbbob:build 47`, **stop:** at step 47's pause, read round two blind in the world's opening frame, ten seconds each with motion on and input off, after the legend and a practice map in the world ([D95 (round-two-reading)](#d95)); once it lands, `/plumbbob:refine` sharpens wave 3 with round two's parks
    - model: opus
16. `/plumbbob:build 48-54`, **stop:** review the base side in both renderers, side by side (step 54's check): improvements, the live Health Δ and the rename leader, with the cache, the relayout's bound and the cached first frame recorded in `docs/performance.md`
    - model: opus
17. `/plumbbob:build 55-58`, **stop:** scrub a range of this repo over one terrain (step 58's check), and try the trunk default, the named bases and the working tree's weather
    - model: opus
18. `/plumbbob:build 59-66`, **stop:** wave 3's boundary: review the whole-repo overlays, the file and diff levels, the health radar and the composites' budget; then `/plumbbob:refine` sharpens wave 4 and settles [Q38 (comment-image)](#q38)
    - model: opus
19. `/plumbbob:build 67-71`, **stop:** try the deliveries: a fixture's PNG captured twice, byte-identical; watch mode pushing a new commit's weather to an open tab; the fingerprint; and, only if you choose, one real `--comment` on a PR of yours, the one thing in this range that publishes
    - model: opus
20. `/plumbbob:build 72-73`, **stop:** wave 4's boundary: review the packed tarball's install and the README; then `/plumbbob:refine` sharpens wave 5, settling [Q39 (other-language-evidence)](#q39) and [Q40 (tour-provider)](#q40) and weighing JavaScript as terrain ([D126 (typescript-corpus)](#d126))
    - model: opus
21. `/plumbbob:build 74-76`, **stop:** drive `atis mcp`'s three tools against an open tab, and check symbol reach in both renderers on checkride PR 4's fixture (step 76's check)
    - model: opus
22. `/plumbbob:build 77-78`, **stop:** run a real tour on a map of yours only if you choose to spend the model calls (the tests ran fascicle's stub engine), and watch the world play its stops
    - model: opus
23. `/plumbbob:build 79-79`, **stop:** review the producer seam before four producers build on it: every existing map and golden unchanged, and `classifyFile` knowing no extension
    - model: opus
24. `/plumbbob:build 80-87`, **stop:** the build's end: review one reviewed PR per new language (each map's cells are that language's modules, its evidence as [Q39 (other-language-evidence)](#q39) settled) and the producer contract; then `/plumbbob:finish`
    - model: opus

## Open questions

- <a id="q3"></a>**Q3 (flare-and-jiggle-numbers)**: the intervals, intensities and spring constants of §5.5 are starting values, *resolve by:* Rob's balance patches from step 22 on, kept open on purpose as their log ([D51 (motion-tokens-shared)](#d51))
  - *lean:* the spike's values land as tokens at step 22, and each later hand-tune is a one-line token change logged in `docs/design.md`'s motion table.
- <a id="q34"></a>**Q34 (inferred-shapes)**: should the scan pay for the type checker, so a name whose type is inferred can be compared, or should "could not be compared" just read quieter?, *resolved:* 2026-10-22, the lean, with [Q44 (unresolved-shapes)](#q44)'s rider, recorded as [D118 (inferred-shapes)](#d118)
  - *plain:* the scan prints shapes with `transpileDeclaration`, one file at a time and with no type checker, so a name whose type the compiler would have to infer is recorded as not compared. On the refreshed retake maps, three of five top-three `interface-change` notices came from exactly this: apollo-client's `QueryManager`, form's `useForm` and hono's `RegExpRouter`. Each was an edit that may not have changed a type at all. [D81 (interface-move-kinds)](#d81) already drops a file whose only movement is uncompared to `interface-uncompared` at severity 2. That keeps the reading honest, but blind: an edit that really changes an inferred return type would sit near the bottom of the list. A checker can print inferred types, but it must load each changed interface file's imports. The extracted trees have no `node_modules`, so external types read as `any`, the same way on both sides.
  - *lean:* use the checker, bounded: only for names `isolatedDeclarations` flags, only in changed interface files, with a program over the in-tree imports and the bundled default lib, timed under `--verbose`. Anything the checker cannot print stays `interface-uncompared`. If the checker adds more than a few seconds on the largest corpus repo, step 50 takes the cost; the comparison stays.
- <a id="q35"></a>**Q35 (svg-reading)**: should wave 0 end with a blind SVG reading as well as the builder-scored precision corpus, before any three.js is built?, *resolved:* 2026-10-22, the lean, recorded as [D119 (svg-reading)](#d119)
  - *plain:* the corpus scores criterion 5 (is the reviewer's finding in the top three?) without a reader. It cannot score criteria 3 and 4, a ten-second merge or hold with one reason, which is what the glance test is for. Without a reading, wave 2 builds the 2.5D world on encodings no reader has passed, and if round two then fails, nobody can tell whether the encodings or the material were at fault. A reading costs one sitting and five held-out fixtures the corpus already generates.
  - *lean:* yes: read five of the held-out six blind on the SVG at step 20, after the practice map, recorded as "round one, second retake", so §11's round two stays the reading in the world ([D63 (retake-in-this-build)](#d63)). A fail parks its encodings, and a refine runs before wave 1; it does not stop the build ([D38 (glance-is-a-step)](#d38)).
- <a id="q36"></a>**Q36 (added-vs-modified)**: how should an added file differ from a modified one on the map, when every free hue already means something?, *resolved:* 2026-10-22, the lean, recorded as [D120 (added-vs-modified)](#d120)
  - *plain:* §5.2 gives each change kind its own hue, and §5.3 names "white/cyan" for change kinds. Today added and modified files share one cyan fill, so the legend can only say "added or modified". White is taken: since [D71 (lit-gaps)](#d71) the evidence light is near-white (`#e6edf3`), and [C11 (one-meaning-per-channel)](#c11) forbids it a second meaning. Green, blue, red and magenta are the categories, and warm off-white is reach. Yet a new file and an edited one are different reviews: a new file has no readers yet, while an edited one changes what its readers get.
  - *lean:* no new hue. The stain stays one cyan, and an added file is written with a `+` before its path wherever the map writes paths: notice rows now, and the world's hover tags and labels from wave 2. The legend says so (step 14), and the tangent closes as "shown in text, not in hue".
- <a id="q37"></a>**Q37 (png-browser)**: where should `--png`, and from step 30 the gate's smoke test, get its headless browser?, *resolved:* 2026-10-24, the lean, recorded as [D145 (png-browser)](#d145)
  - *plain:* §15's R5 wants the PNG rendered by the same app, and R6 wants no per-platform binaries in atis. Playwright's full package downloads a Chromium of roughly 150 MB per platform on install, which is the binary R6 refuses. `playwright-core` downloads nothing and drives a Chrome or Chromium already on the machine, so a machine without one, CI included, needs its own install.
  - *lean:* use `playwright-core`, driving the installed Chrome (`channel: 'chrome'`) and falling back to a Chromium on the `PATH`. With neither, atis exits 2 and names the one install command. CI installs Chromium itself, and when no browser is found, the SVG is `--comment`'s image ([D86 (svg-stays-the-fixture)](#d86)).
- <a id="q38"></a>**Q38 (comment-image)**: where does a `--comment`'s image live, since `gh` cannot attach an image to a PR comment?, *resolve by:* decide at the wave-3 boundary
  - *plain:* a comment can link an image but not upload one. GitHub strips data URIs, and a gist holds text, not a PNG. Every option publishes the image somewhere: a branch in the same repository, a release asset, or an outside host. An outside host is a service, which §10 refuses.
  - *lean:* push the PNG to an orphan branch, `atis-maps`, in the same repository, one file per head SHA, and link its raw URL from the comment. This happens only under `--comment`, which already publishes, and the comment's footer says so. With no image available, the comment carries the HUD and the notices as text alone.
- <a id="q39"></a>**Q39 (other-language-evidence)**: where does evidence (coverage, test results, findings) come from for Go, Python, Terraform and shell?, *resolve by:* ask at the wave-4 boundary
  - *plain:* atis reads artifacts and never runs a repository's tools ([D64 (fixture-eligibility)](#d64)). For TypeScript those artifacts are checkride's `.check/`, with fallow's health, duplication and dead-code numbers, and neither speaks the other four languages today. So their maps would carry terrain, reach and git weather but no evidence: honest, but thin for Rob's Go backend and its infrastructure. Each language has native artifacts: Go's coverprofile, coverage.py's JSON, JUnit XML from most test runners, and shellcheck's, tflint's and checkov's JSON findings. For Terraform there is also a plan's JSON, the true blast radius, which only a run with credentials and state can produce.
  - *lean:* the evidence comes through checkride's `.check/` contract once checkride has a shape for each language ([D41 (artifact-trust)](#d41): a `summary.json` naming the slots), and atis adds one pure parser per native format a slot writes ([D30 (pure-parsers)](#d30)). Coverage feeds the existing channels, findings feed `lint` and `security`, and a Terraform plan's JSON, when a CI harness leaves one, becomes a notice on a destroyed or replaced resource. Until a language's shape exists its files have no evidence channel and the map says why. Adding the shapes is checkride's work, tracked there.
- <a id="q40"></a>**Q40 (tour-provider)**: which model runs the tour, and how does a user opt in?, *resolve by:* decide at the wave-4 boundary
  - *plain:* §10 says atis needs no LLM, and [C5 (no-network)](#c5) keeps it off the network. The tour is the one place a model earns its keep: an ordered walk through the notices, with a sentence for each. fascicle fronts eight providers, including `claude_cli`, which drives the logged-in Claude Code CLI with no API key. fascicle needs Node 24, while atis runs on Node 22.18 and up.
  - *lean:* make the tour a separate `apps/tour` package with its own engines (Node 24), run only as its own command. It defaults to fascicle's `claude_cli` provider, as fascicle's `pr-improve` does, with `--provider` for the API path and a key from the environment. Its output is cached by head SHA under `.atis/tours/`, and atis itself never imports it.
- <a id="q41"></a>**Q41 (lib-globals)**: should step 2's rule also catch what reaches a lib with no import at all: Node's globals, and the clock and random source [D94 (seeded-motion)](#d94) injects?, *resolved:* 2026-10-22, the lean, recorded as [D121 (lib-globals)](#d121)
  - *plain:* [C1 (core-is-pure)](#c1) names imports and the DOM, so the rule as step 2 writes it passes `process.env`, `Buffer`, `require` and `__dirname`, none of which is imported. None appears in `libs/*/src` today. From wave 2 it matters: `libs/scene` runs in the browser, where Vite defines no `process`, so one stray reference breaks the tab while every Node test passes. `Math.random`, `Date.now` and an argument-less `new Date()` need no import either, and [C3 (deterministic)](#c3) and D94 rule them out of the layout and the scheduler.
  - *lean:* yes. The same rule, scoped the same way, also fails on `process`, `Buffer`, `require`, `__dirname`, `__filename`, `Math.random`, `Date.now`, `performance.now` and a `new Date()` with no argument. A second probe, a `Math.random()` in `libs/core/src`, turns `struct` red before the checkpoint, and C1 names both halves.
- <a id="q42"></a>**Q42 (excluded-from-coverage)**: under [D80 (unmeasured-not-closed)](#d80), how should atis read a file the repo leaves out of its coverage on purpose, and a report written at another path that names none of the tree?, *resolved:* 2026-10-22, the lean, recorded as [D122 (excluded-from-coverage)](#d122)
  - *plain:* D80 reads a changed file the report omits as unmeasured: its skin lit whole, never VFR. Two cases reach that reading with no test left unrun. The first is a deliberate exclusion. This repo's `vitest.config.ts` includes every `src/**/*.ts` but excludes `**/src/cli.ts`, whose tests run the built bin in a child process. Vitest 4 reports an unloaded file with zero hits when it matches `include`, so in a repo shaped like this one the only files a report omits are the excluded ones, and fifteen later steps edit `cli.ts`. The second is a path mismatch. `parseCoverage` makes the report's absolute keys relative to `--repo` (`apps/atis/src/sources/check.ts:83`), so a `.check/` written in another checkout matches no file. Today that reads as no gap anywhere; after D80 every changed file would read unmeasured, a loud map drawn from a broken channel.
  - *lean:* an excluded file stays unmeasured, since no test run measured it, and its why says the report does not name it. No exemption list joins `atis.config.json`, because it would be a quiet way to read VFR over code no run measured. A report that names none of the tree's source files is a broken channel, not a measurement: coverage is muted with that reason in `meta.instruments`, as [D41 (artifact-trust)](#d41) mutes a stale file. Step 3's tests cover both.
- <a id="q43"></a>**Q43 (mixed-interface-moves)**: which kind does [D81 (interface-move-kinds)](#d81) give a file that added names and kept others it could not compare, with nothing removed or reshaped?, *resolved:* 2026-10-22, the lean, recorded as [D123 (mixed-interface-moves)](#d123)
  - *lean:* `interface-added`, its why naming the uncompared names too. A notice takes the heaviest move the scan can prove, and an uncompared name proves nothing. Step 4's tests pin this case beside the added-and-reshaped one.
- <a id="q44"></a>**Q44 (unresolved-shapes)**: if [Q34 (inferred-shapes)](#q34) takes the checker, how does a type the checker could not resolve stay uncompared, rather than compare equal?, *resolved:* 2026-10-22, the lean, folded into [D118 (inferred-shapes)](#d118)
  - *plain:* the extracted trees have no `node_modules`, so the checker gives an external import its error type, which prints as `any`. Q34's plain line notes this happens the same way on both sides, and that is the trouble: `any` against `any` compares equal. A hook whose inferred return moves from one external type to another prints `any` before and after and reads as unchanged, which [C2 (never-fake)](#c2) forbids. Q34's lean keeps uncompared only what the checker cannot print, and it can print this. Workspace packages are safe, since the scan already resolves them by name through the workspace manifests; only true externals fall out.
  - *lean:* a name whose checked type reaches an unresolved symbol anywhere (the checker's error type) stays `interface-uncompared`. Only a type built wholly from in-tree declarations and the bundled lib compares. Step 5's tests pin an external return type swapped for another as uncompared.
- <a id="q45"></a>**Q45 (readers-graph)**: on which graph does [D82 (moved-name-readers)](#d82) count a moved name's readers, since [D39 (two-graphs)](#d39) has every walk that straddles base and head name its graph?, *resolved:* 2026-10-22, the lean, recorded as [D124 (readers-graph)](#d124)
  - *lean:* the head graph for names added, reshaped or left uncompared, since those readers are who the change reaches. A `deleted-export` notice counts its live consumers as `liveConsumers` already does: the base graph's importers, kept only where the head still takes the name. D82 gains the clause.
- <a id="q46"></a>**Q46 (practice-map-current)**: step 15 renders the practice map, and the fixes the tuning half prompts land after it; what keeps the map current for step 20's reading?, *resolved:* 2026-10-22, the lean, recorded as [D125 (practice-map-current)](#d125)
  - *lean:* step 20 opens by re-rendering `docs/glance-practice.svg` and checking each callout against the legend, so the reader is briefed on the marks the held-out maps carry. Step 15 draws the callouts by script from the legend's list of marks, so the re-render is one command.
- <a id="q47"></a>**Q47 (typescript-corpus)**: [D64 (fixture-eligibility)](#d64) admits JavaScript repos, but the scan reads no JavaScript; should the corpus and round two say TypeScript?, *resolved:* 2026-10-22, the lean, recorded as [D126 (typescript-corpus)](#d126)
  - *plain:* `classifyFile` makes terrain only of `.ts`, `.tsx`, `.mts` and `.cts`, and the scan runs with `allowJs: false`, so a JavaScript repo's map has no cells and its `.js` files land on the shore. D64's "3 to 30 changed source files" shuts such a PR out only if source files are counted the way atis counts them, which step 16 does not say. The Frame's NOT-doing list keeps the build to five languages, and JavaScript is not one of them.
  - *lean:* yes. [D88 (precision-corpus)](#d88)'s corpus and [D95 (round-two-reading)](#d95)'s fixtures draw PRs whose 3 to 30 changed source files are TypeScript by `classifyFile`'s rule, and D64 says so. JavaScript as terrain, which the TypeScript producer could read through `allowJs`, is parked for the wave-4 boundary beside the other languages.
- <a id="q48"></a>**Q48 (tuning-loop)**: how many times is the tuning half scored, and how many refine passes may it prompt before the held-out maps are generated?, *resolved:* 2026-10-22, the lean, recorded as [D127 (tuning-loop)](#d127)
  - *plain:* [D88 (precision-corpus)](#d88) generates the held-out maps "only after every fix the tuning half prompts has landed". It does not say whether the tuning half is scored again after those fixes, or how many passes it may prompt. A builder who re-scores after each fix has started an open loop, and every pass tunes the encodings harder to six fixtures the builder chose. The map-and-svg build ran five refine passes.
  - *lean:* once. Step 18 scores the tuning half one time and prompts at most one refine pass. Its fixes are judged only on the held-out half, never by re-scoring the tuning six, and any miss that pass leaves is parked past step 20. D88 gains the clause.
- <a id="q49"></a>**Q49 (held-out-chosen-late)**: should the held-out six be chosen only after the tuning half's fixes land, since step 16 has the builder read every held-out review before designing them?, *resolved:* 2026-10-22, the lean, recorded as [D128 (held-out-chosen-late)](#d128)
  - *plain:* D88's reason for a held-out half is that it "keeps the builder from tuning to what it scores". But step 16 selects all twelve at once, and choosing a hold means reading the reviewer's finding and quoting it in `truth.md`. The builder that designs the tuning fixes at step 18's refine already knows the six held-out findings, and their truth files sit in the repo. Choosing the held-out six afterwards costs a second `gh api` sweep and nothing else, since their maps wait for the fixes anyway.
  - *lean:* yes. Step 16 selects the tuning six. Step 19 selects the held-out six after the fixes have landed (three holds and three merges, from at least three repos the tuning half did not use), then generates their maps. The five-repo floor spans both halves, and [D62 (retake-reader-blind)](#d62) covers both.
- <a id="q50"></a>**Q50 (precision-on-holds)**: criterion 5 reads n/a on a merge, so which of the twelve does the corpus actually score?, *resolved:* 2026-10-22, the lean, recorded as [D129 (precision-on-holds)](#d129)
  - *plain:* criterion 5 asks whether the reviewer's finding is among the top three notices. A merge has no finding: round one and the retake scored it n/a, and the retake's "1 of 3" was its three holds. D88 fixes the held-out half at three holds and three merges, for the blind reading's balance ([D60 (fixture-balance)](#d60)), but leaves the tuning half's split open. A tuning half with three merges scores precision on three maps, and step 20's "criterion 5 on all six held-out maps" can score only three. Tuning on holds alone can only push the map louder, and the held-out merges in the blind reading are the check on that.
  - *lean:* the tuning six are all holds, so the tuning half scores criterion 5 on six maps. The held-out six stay three and three, and step 20 scores criterion 5 on the held-out holds, with merges n/a as before. The Frame's wave-0 line reads "criterion 5 on the held-out holds".
- <a id="q51"></a>**Q51 (token-home)**: where do the shared tokens live once `libs/svg` depends on `libs/scene`, since the scene needs tokens [D51 (motion-tokens-shared)](#d51) keeps in `libs/svg`?, *resolved:* 2026-10-22, the lean, recorded as [D130 (token-home)](#d130)
  - *plain:* [C9 (deps-earn-their-place)](#c9) and step 26 make `libs/svg` depend on `scene`. But step 26's `weatherOf` attenuates reach "with the SVG's decay", which is `REACH_DECAY` in `libs/svg/src/tokens.ts`, and step 29's scheduler is timed from D51's motion tokens, which step 22 writes into that same file. Either one makes `scene` import `svg`, so the two packages import each other: `tsc --build` refuses project references that form a circle, and pnpm warns on a cyclic workspace.
  - *lean:* `tokens.ts` moves to `libs/scene/src/` at step 23. `libs/svg` and the web app import it from `scene`, so one file still holds every colour and motion constant, and the step-22 tokens move with the rest. D51 names the new home.
- <a id="q52"></a>**Q52 (svg-migration-step)**: should step 26 be split, so that moving `libs/svg` onto the scene's weather is a step of its own?, *resolved:* 2026-10-22, the lean, recorded as [D131 (svg-migration-step)](#d131)
  - *plain:* step 26 builds `weatherOf` in `libs/scene` and, in the same diff, rewires `libs/svg/src/weather.ts` (602 lines) to read it. That is too much to review in one pass. It also moves the SVG's goldens in the commit that introduces the code they now depend on, so a drift between the old drawing and the new derivation cannot be told from an intended change.
  - *lean:* split. Step 26 builds and tests `weatherOf` alone. A new step after it moves `libs/svg` onto it, and its done-when is the proof: `libs/svg/fixtures/demo/atis.svg` and the four category goldens are byte-identical before and after. It keeps its own number and is ordered after 26 with `plumbbob order`.
- <a id="q53"></a>**Q53 (world-smoke-test)**: once wave 2 lands, what in `pnpm check` notices that the world has stopped rendering?, *resolved:* 2026-10-22, the lean, recorded as [D132 (world-smoke-test)](#d132)
  - *plain:* step 23 excludes `apps/web/src/world/` from the coverage thresholds, and steps 30, 32, 33, 37, 39 and 40 are verified by a screenshot judged at the pause. That suits the step that builds a render, but nothing in the gate checks it afterwards: 26 later steps touch `apps/web/src/`, and any of them can break the world while `pnpm check` stays green. A headless smoke test needs the browser driver that [Q37 (png-browser)](#q37) only chooses at the wave-3 boundary.
  - *lean:* step 30 adds a smoke test to the gate. It renders a fixture's map headless and asserts a non-blank frame and a clean console, on the WebGL 2 path so it runs on any machine. It serves the app through Vite in-process rather than from a shared `dist/`, so it cannot race the build the way step 1's suite did. Q37 settles at the wave-1 boundary instead.
- <a id="q54"></a>**Q54 (served-assets)**: where does `atis` find the web app's built assets, in the workspace, under test and in the packed tarball?, *resolved:* 2026-10-22, the lean, recorded as [D133 (served-assets)](#d133)
  - *plain:* step 31 serves `apps/web`'s built assets, but `pnpm build` is `tsc --build`, which never runs Vite, and the gate builds only in its `types` slot. So step 31's serve test, which fetches `/`, needs a Vite build that nothing in `pnpm check` makes, or makes one itself and reopens the race step 1 closes. [D109 (installable-package)](#d109) later ships the app "beside" the bundled CLI, and if the workspace finds it by another path, that path is first tried at step 72's pause. Step 31 also meets today's `--open`, which opens the SVG and needs `--svg`, while [D92 (serve-and-open)](#d92) opens the tab by default and adds `--no-open`.
  - *lean:* `serve` takes its asset directory as an argument, and its tests pass a temp directory holding a stub `index.html`, so no test needs a Vite build. The CLI looks for a `web/` directory beside its own `dist/`, which `pnpm build` fills by building `apps/web` and copying it there. That is the layout the tarball ships, so the workspace and the package find the app the same way, and with no build there `atis` exits 2 naming `pnpm build`. `--open` keeps opening the SVG beside `--svg`, and served mode takes `--no-open` through `parseArgs`'s `allowNegative`.
- <a id="q55"></a>**Q55 (loopback-trust)**: what stops another page in the reviewer's browser from reading, or driving, the server atis runs on loopback?, *resolved:* 2026-10-22, the lean, recorded as [D134 (loopback-trust)](#d134)
  - *plain:* [C13 (loopback-only)](#c13) binds `127.0.0.1`, which keeps other machines out but not other tabs. Any page can send requests to a loopback port, and through DNS rebinding it can read the answers. That hands it the map, which names the private repo's files, then `/check/<slot>` from wave 2 and the diff text at `/diff/<path>` from wave 3. A WebSocket has no same-origin rule, so a page could also join wave 4's socket, and through it wave 5's `highlight`. Wave 3's `POST /base` runs git on a ref the request supplies, and it is a write C13 does not allow. The port is ephemeral, but a page can scan for it.
  - *lean:* every server atis starts checks that the `Host` header is `127.0.0.1:<port>` or `localhost:<port>`. The URL it opens carries a random token made per run, which the map, `/check`, `/diff`, the socket and `POST /base` all require, and the socket and the POST also check `Origin`. `/check/<slot>` and `/diff/<path>` answer only for slots and paths the map holds, and `POST /base` takes only a ref that `git rev-parse --verify` resolves to a commit, never one starting with `-`. C13 gains these rules and names `POST /base` as its one write, and step 31's serve test proves each refusal.
- <a id="q56"></a>**Q56 (evidence-for-head)**: once the head can be any ref, how does atis know that `.check/` describes the map's head?, *resolved:* 2026-10-22, the lean, recorded as [D135 (evidence-for-head)](#d135)
  - *plain:* `.check/` describes whatever the working tree held when checkride last ran, and `summary.json` records no commit. Today the head is always `HEAD`, so the evidence is at least that checkout's. Wave 3 changes that: `--head <ref>` ([D99 (named-bases)](#d99)) maps any two refs, and `--range a..b` ([D100 (sequence-frames)](#d100)) builds a frame per commit, while `.check/` still describes the checkout. A map of `--head v1.2` would draw today's coverage and red slots as v1.2's, the fake [C2 (never-fake)](#c2) forbids.
  - *lean:* evidence is read only when the map's head is the checked-out `HEAD`, or the tree itself under `--working-tree`. Any other head is git-only, with the reason in `meta.instruments`, and a range carries evidence only on a frame whose commit is `HEAD`. checkride's `summary.json` gains the commit it ran on and whether the tree was dirty, tracked in checkride as [Q39 (other-language-evidence)](#q39)'s shapes are; once it does, atis also mutes a `.check/` that predates `HEAD`.
- <a id="q57"></a>**Q57 (first-frame-clock)**: when wave 3 promises a cached first frame within 2 s, does the clock start at the command or at the map's arrival?, *resolved:* 2026-10-22, the lean, recorded as [D136 (first-frame-clock)](#d136)
  - *plain:* [C14 (world-budget)](#c14) and step 43 time the first frame from the map's arrival in the tab. The Frame's wave-3 line and step 50 time it from the command, which also covers git, reading `.check/`, the head scan, serving, opening the tab and starting the renderer. [D96 (terrain-cache)](#d96) caches the base side only: the head is scanned in full on every run, and from step 51 the reviewed repo's fallow runs on the head extraction too. On a repo of a few thousand files, those two alone could spend the 2 s.
  - *lean:* from the command, as the Frame says, to the app's ready flag ([D105 (png-capture)](#d105)), with the browser already running. To fit, the head scan re-reads only the files the diff touched, over the cached base scan, and step 51's head-side fallow run is cached per head commit beside the terrain. Step 50 records each leg per repo, so a miss names its leg.
- <a id="q58"></a>**Q58 (cache-key)**: [D96 (terrain-cache)](#d96) keys each entry by atis's version, which stays `0.0.0` in the workspace; what invalidates the cache when the code that builds the terrain changes?, *resolved:* 2026-10-22, the lean, recorded as [D137 (cache-key)](#d137)
  - *plain:* after step 48, steps 51, 62 and 79 to 84 change what a base scan holds (base-side fallow, each file's functions, other languages' cells), and none moves the version. A cache written before one of them hands the old terrain to every later run on that base. `--no-cache` helps only someone who knows to pass it, and the goldens never touch the cache, so no test would notice.
  - *lean:* the key holds a hash of atis's own built files, read at startup (its sources, under vitest), in place of the version. Changed code then misses the cache by itself, in the workspace and in a release alike, and `--no-cache` stays for a bad entry. Step 48's tests cover a miss on changed code.
- <a id="q59"></a>**Q59 (mcp-finds-tab)**: how does `atis mcp`, a separate process an agent starts over stdio, reach the map and the tab another `atis` process is serving?, *resolved:* 2026-10-22, the lean, recorded as [D138 (mcp-finds-tab)](#d138)
  - *plain:* an MCP client launches its server as a child process and talks to it over stdin and stdout. [D110 (mcp-tools)](#d110) has that process read "the map the serving process holds" and send `highlight` "over the watch socket", but nothing tells it which process is serving, on which ephemeral port, or with which token ([Q55 (loopback-trust)](#q55)). With two repos open, or none, it cannot choose.
  - *lean:* the serving process writes `.atis/serve.json` under the reviewed repo (port, token and pid, readable by its owner alone, removed on exit), and `atis mcp`, started in that repo, connects to it as a client. With no serving process, `reach` and `explain` read the map `--map <file>` names, and `highlight` returns a tool error saying no tab is open.
- <a id="q60"></a>**Q60 (inert-helpers)**: how do the Go and Python helpers use the repo's own toolchain without running any of the reviewed code?, *resolved:* 2026-10-22, the lean, recorded as [D139 (inert-helpers)](#d139)
  - *plain:* [D115 (python-producer)](#d115) runs its helper on "the repo's own Python" and says it "never imports the code", but Python puts a directory ahead of the standard library on `sys.path`: the script's own, or the working directory when the code comes through `-c` or stdin. A reviewed tree holding an `ast.py` or a `json.py` there would run at the helper's first import, and the corpus and the fixtures are other people's repos. Startup also runs any `.pth` file in the interpreter's site-packages. On the Go side, [D113 (go-producer)](#d113) sets `GOPROXY=off`, but a `toolchain` line in `go.mod` asking for a newer Go still sends the command looking for one, so it fails on a download rather than reporting a missing toolchain.
  - *lean:* the Python helper ships as a file outside the tree, takes the tree as an argument, and runs with `-I -S` from a working directory outside it: `-I` keeps the script's directory, the working directory and every `PYTHON*` variable off the path, and `-S` skips `site`, so no `.pth` file runs. Go runs with `GOTOOLCHAIN=local` beside `GOPROXY=off`, and `go list` is never asked for `-compiled` or `-export`, which run cgo and the compiler. Steps 81 and 82 each test that a planted module in the tree never runs.
- <a id="q61"></a>**Q61 (changed-file-reds)**: when should a `health` or `dead` red on a changed file outrank the change's own test and interface evidence, since on the tuning six such reds hold 9 of the 18 top-three rows and bear on none of the six findings? (harvested 2026-10-23 from step 18's reading, P6: [D73 (touched-file-breach)](#d73) counts only findings on the changed lines, and the retake's first encoding still leads; these reds pushed `corpus-1`'s hit down to notice 3 and, with [Q64 (barrel-unmeasured)](#q64), kept `corpus-4`'s mutants out of all six; see `docs/glance-test.md`'s tuning half), *resolved:* 2026-10-23, the lean, recorded as [D140 (changed-file-reds)](#d140)
  - *plain:* two rules put these reds on top. First, `dead` comes onto the change through any changed file a finding names, wherever in the file the finding sits; [D73 (touched-file-breach)](#d73) holds only `health` and `dupes` to the changed lines. On `corpus-4` and `corpus-5` every `dead` red on the change is a circular import that was already there at the base: the same cycles show at the base commit, and none of the 25 that name a changed file has an import line inside a hunk. Those standing cycles also make both maps LIFR. Second, a `health` red on the change is the very finding `threshold-breached` raises (a function over a threshold whose lines the change touched), but it ranks as `red-check-slot` at severity 10, where `threshold-breached` weighs 5. So one complexity finding outranks survived mutants (6), uncovered lines (7) and an interface change (8) on the same file, and the threshold notice it repeats is dropped.
  - *lean:* two fixes. (1) D73's line rule extends to `dead`. A cycle or a boundary violation is on the change only where one of its import lines meets a head-side hunk, and an unused export only where its own line does. A finding with no line atis can read keeps the file rule, so nothing is hidden on a guess ([C2 (never-fake)](#c2)). The LIFR rung and the `cycle-or-boundary` candidate read the same rule, until [D98 (base-side-structure)](#d98) replaces it with "new, or worse than at the base". (2) A red slot raises no `red-check-slot` row on a file where a candidate of its own kind speaks for it. `health` ranks as `threshold-breached`, and `dead`'s cycles and boundary violations as `cycle-or-boundary`, the way [D83 (security-on-change)](#d83) has `security` rank as `security-finding`. `test`, `types`, `lint`, `struct`, `dupes`, and a `dead` red through an unused export keep their row at 10, since §5.4 gives them no kind of their own. The category does not move for (2): the gate is still red on the change, so the map still reads IFR.
- <a id="q62"></a>**Q62 (tuning-miss-mutants)**: what would put `corpus-4`'s survived mutants among its top three, when its six notices go to the package barrel and a sibling file's reds and none reaches the builders the reviewer flagged? (harvested 2026-10-23 from step 18's reading, P4: two of the six mutants that survived in the flagged files sit on the length checks the review objects to, and two more inside the flagged methods), *resolved:* 2026-10-23, the lean, recorded as [D142 (tuning-misses-left)](#d142)
  - *plain:* Q61 and Q64 between them clear the three rows that ranked above everything else on `corpus-4`: the barrel's standing cycle, the barrel read as unmeasured, and the standing cycle on the components file beside it. The flagged mutants would still rank low, because both flagged files are new and fully covered. §5.4 scales a notice by its file's reach, uncovered share and history, and a new file with full coverage has neither history nor a gap, so its mutants weigh their bare severity times reach. The older components file beside them carries a churn history and half its changed lines uncovered, which multiplies every notice on it about fourfold, and a `dupes` red on the new files ranks at 10. By an estimate from the map's factors, the flagged mutants would come about eighth.
  - *lean:* no encoding of its own in this pass. Q61 and Q64 fix what put the wrong rows on top. What remains is §5.4's formula weighing a file's past, and reshaping that formula to lift one fixture's new files is the tuning D127 rules out. The rest of the miss is parked past step 20, naming its cause: a file the change adds weighs only by its reach.
- <a id="q63"></a>**Q63 (tuning-miss-no-evidence)**: `corpus-5`'s flagged loop is fully covered and mutation did not finish there, so no notice could bear on it; does the map owe a signal here, or is the miss beyond the evidence any map holds? (harvested 2026-10-23 from step 18's reading, P5: its top three are a `dead` red on the file holding the helper the reviewer wants reused, an interface change on a file the truth does not name, and a `health` red on the flagged file, which [D65 (notice-precision-reading)](#d65) rules out; the new public method is notice 5, as an addition), *resolved:* 2026-10-23, the lean, recorded as [D142 (tuning-misses-left)](#d142)
  - *plain:* the review flags a loop that returns one moved date several times, and a method that reimplements a helper the app already has. The loop's lines are all covered and mutation did not finish there, so the map holds no evidence on them, and its HUD already reads the mutation channel as absent. The reimplemented helper left no trace either: `dupes` names no clone on the change. With Q61, the top notice (a standing cycle on the helper's file) goes, but nothing that bears on the finding rises in its place.
  - *lean:* the map owes no signal here. It says what its instruments hold, and a covered loop no mutation run reached is the most it can say. No encoding changes, and the miss is parked past step 20, as D127 directs.
- <a id="q64"></a>**Q64 (barrel-unmeasured)**: should a package barrel that no test imports read as an unmeasured gap with high reach when its changed lines are re-exports, since [D80 (unmeasured-not-closed)](#d80) counts any file that emits code? (harvested 2026-10-23 from step 18's reading, P7: it took `corpus-4`'s notice 2, a barrel whose seven added lines are exports), *resolved:* 2026-10-23, the lean, recorded as [D141 (unmeasured-lines)](#d141)
  - *plain:* D80 calls a changed file unmeasured when it emits code and the coverage report never names it, and the scan decides "emits" once for the whole file. `corpus-4`'s barrel holds one exported constant, so it emits. But its seven changed lines are all `export … from`, which the scan's own `leavesCode` already says leave no code behind. No test could run them, and a broken one fails the build or the typecheck. Yet the barrel read as a gap of unknown size with high reach, and took notice 2.
  - *lean:* a changed file is unmeasured only when one of its changed lines falls inside a statement that leaves code. In place of the one `emits` flag, the scan records each file's code spans, the lines of every statement `leavesCode` accepts. The evidence reads the hunks against those spans by D73's `meets` rule, so a deletion inside a function still counts. A file whose changed lines are imports, re-exports, types or declarations is never unmeasured, the way a type-only file never is today.
- <a id="q65"></a>**Q65 (morph-motion)**: may a file's morphed shape move inside an opened cell, when §5.5 allows one continuous mover and [C11 (one-meaning-per-channel)](#c11) gives motion to urgency alone? (from step 22's verdict, `docs/design.md`'s phase-1b section), *resolved:* 2026-10-24, against the lean: Rob wants the spike's moving shapes and a livelier world, recorded as [D146 (morph-shapes)](#d146) and [D147 (alive-motion)](#d147), with [Q69 (motion-direction)](#q69) open for where the motion goes next
  - *plain:* in the spike, a shape at a higher rule count pulses its arms and turns, faster and further as the level climbs, only inside an opened cell and never under reduced motion. Two rules stand against it. [C12 (motion-budget)](#c12) allows one continuous mover, the primary's breathing. And C11 gives motion one meaning, urgency, so a pulsing file would read as urgent whether or not the change touched it. Inside an opened cell, a dozen moving shapes would also compete with the breathing, the one motion meant to pull the eye. The outline already carries the count without moving.
  - *lean:* keep the shapes still in both renderers, so C11 and C12 stand as written and the world matches the SVG. Whether motion would help is a question for after glance round two, when a reading can answer it, and the moving morph is parked as a tangent until then.
- <a id="q66"></a>**Q66 (unplaced-primary)**: where does a notice light when the layout never placed its target? (from step 22's verdict), *resolved:* 2026-10-24, the lean, recorded as [D148 (notice-anchors)](#d148)
  - *plain:* `retake-1`'s primary targets a test file. Tests are evidence, not terrain ([D4 (tests-not-terrain)](#d4)), so the layout gives the file no position, and neither renderer has anywhere to light the one notice that breathes; the SVG's row says "unplaced". In the world, a notice on a shore file has the same trouble once the shore leaves the terrain for the rail. The primary is the map's loudest mark, and on that map it cannot be seen.
  - *lean:* a notice anchors to the nearest thing the map draws for its target. A test file anchors to the stitch it draws on the first file it imports, by path, and a shore file to its group: its block in the world's rail, and its group in the SVG's shore. `libs/scene` derives the anchor beside the label placements (step 27), the SVG draws its ring there in the same step, and the world breathes the primary there (step 34). "Unplaced" stays only for a target with no anchor at all.
- <a id="q67"></a>**Q67 (stability-data)**: step 24's swells need every file's age and churn, and the map carries them only for changed files; does core add them, or do the swells wait? (from step 22's verdict), *resolved:* 2026-10-24, the lean, recorded as [D149 (stability-data)](#d149)
  - *plain:* §5.1's middle scale is stability: old, quiet code sits high as bedrock, churny code lies low. Step 24 draws those swells and tests that a bedrock file sits above a churny one. But the history pass writes `age_days` and `churn_ratio` only for changed files (`libs/core/src/history.ts:83`), though it already counts every file's commits in the window. So the spike drew no swells, since faking them is what [C2 (never-fake)](#c2) forbids. Filling the same two keys on every organelle would change the SVG, which hatches any organelle that carries a churn value.
  - *lean:* a new core step, built before 24, records each organelle's stability under a new optional key, `stability` (its age and churn ratio in the window), from the counts the history pass already makes, added under [D85 (schema-bumps)](#d85). The SVG never reads the key, so every golden stays. Step 24 raises and lowers the skin by it where present, and draws no swell where it is absent, as on a frozen fixture.
- <a id="q68"></a>**Q68 (fallback-first-frame)**: does [C14 (world-budget)](#c14)'s 2 s first frame hold on the WebGL 2 fallback, where the spike measured 2.76 s? (from step 22's verdict), *resolved:* 2026-10-24, wider than the lean: every 2 s first frame is a target a little over which passes, recorded as [D150 (first-frame-target)](#d150)
  - *plain:* on WebGPU, the spike's first frame took 0.57 s. Forced onto WebGL 2, it took 2.76 s, because GLSL compiles TSL's physical material slowly. C14 and step 43 promise 2 s and name no backend. Every current browser ships WebGPU (§15), so the fallback is a safety net, and headless runs are where it is used most: [D132 (world-smoke-test)](#d132)'s smoke test runs on it.
  - *lean:* C14's 2 s is measured on WebGPU. On WebGL 2 the world must draw the same frame with a clean console (D132's smoke test), and step 43 records its first frame beside the budget without holding it to 2 s.
- <a id="q69"></a>**Q69 (motion-direction)**: with the world allowed to move more ([D147 (alive-motion)](#d147)), what else should move, and what should each motion mean?, *resolve by:* Rob, in the world, at step 40's pause
  - *plain:* D147 makes the spike's motion the baseline and lifts §5.5's one continuous mover, but it names only the shapes moving inside an opened cell, and [D157 (organelle-drift)](#d157) has since added each file's drift there. Rob wants the motion more involved and still meaningful, and is not yet sure where to take it. What holds meanwhile: the scheduler owns every animation, flares never stack, and reduced motion stills everything. What else might move (the reach, the skin, the weather at the surface), and at which levels of detail, is open.
  - *lean:* build the baseline first. The scheduler (step 29) and the opened cell (step 40) move the shapes as the spike did, and nothing else joins §5.5's list before then. At step 40's pause, with the interior alive on a map Rob knows, he names what should move next and what it means. Each answer lands as a step, with its motion tokens logged under [Q3 (flare-and-jiggle-numbers)](#q3).
- <a id="q70"></a>**Q70 (organelle-drift)**: should each organelle drift inside an opened cell, bumping the membrane and its neighbours, with how freely it floats meaning something about the code? (Rob, 2026-10-24), *resolved:* 2026-10-24, the lean, recorded as [D157 (organelle-drift)](#d157)
  - *plain:* Rob's idea: beyond its spiky shape and its pulse ([D147 (alive-motion)](#d147)), a file could float around its cell, and how freely it floats should mean something, the way the real structure behaves. The candidates he named: how loose or ill-defined the code is, how much it depends on, how heavily it works with the rest of its cell, or how core it is, a hub moving about to hand data to the others. The map carries no import edges beyond the exceptional ones, so any of these needs core to record each file's ties. Drift would be a third meaning for motion beside urgency and conformance, which [C11 (one-meaning-per-channel)](#c11) would have to name.
  - *lean:* tether each file by its import ties inside its cell, like a cytoskeleton. The more of a file's ties stay within its cell, the more tightly it is held at its place; a file whose ties mostly leave the cell, or that has none, floats freely and bumps the membrane and its neighbours. Drift then means looseness: a file that does not work with its cellmates, and may belong elsewhere. A hub stays still near the centre, held by many ties, so the cell's core reads as its still centre; a hub that roamed would make the most important file the hardest to read, and would look urgent. At rest, in the SVG, and under reduced motion, every file sits at its layout position. Core records each organelle's ties inside and outside its cell as an added key, and `libs/scene` runs the drift, seeded, under the scheduler: two steps built before step 40.
- <a id="q71"></a>**Q71 (shore-band-position)**: where does the SVG's band of shore blocks go: along the bottom, or in the right-hand column under the notices and the legend? (Rob, 2026-10-24), *resolved:* 2026-10-24, the lean, recorded as [D158 (shore-band-position)](#d158)
  - *plain:* the world's rail sits at the tab's right edge and scrolls ([D153 (shore-rail)](#d153)). A still image cannot scroll, and its right-hand column already holds the six notices and the legend inset. The shore's blocks there would make that column the tallest thing on the sheet, which is the trouble D153 fixes: some shores run long and pull the eye from the body. Along the bottom, the blocks wrap in rows under the world at the sheet's full width, which a PR comment shows wide.
  - *lean:* along the bottom, as a wrapping band: the touched groups first, each with its changed files named, then every untouched group as a one-line block of its name and count, so a long shore costs a row or two rather than a column. The world keeps its rail on the right, where a tab can scroll it.

## Verdicts

- 2026-10-08: framed from Rob's request to build every remaining phase in waves, with the fixes named in the session. No forks yet. The plan's cold read is in `.plumbbob/detail.md`, and it lands in the build log with the plan commit.
- 2026-10-08: at the plan pause Rob directed Python, Terraform and shell added beside Go ("add all"). Wave 5 grows from 8 steps to 14: a producer seam that moves the language out of core (step 79), shore rows for the new manifests (80), a producer each for Go, Python, Terraform and shell (81 to 84), their evidence through checkride (85), one fixture per language (86) and the producer contract (87). Recorded as [D114 (producers-compose)](#d114) to [D117 (shell-producer)](#d117), with [Q39 (other-language-evidence)](#q39) widened to every new language.
- 2026-10-22: refine pass one, before step 1. Q41 to Q60 surfaced from a cold read of the plan against the code; three of them (Q48, Q52 and Q53) came from the plan commit's cold read in the build log. Rob took every lean, Q34 to Q36's with them, recorded as [D118 (inferred-shapes)](#d118) to [D139 (inert-helpers)](#d139), with [Q44 (unresolved-shapes)](#q44) folded into D118. Step 26 split in two: step 88 moves `libs/svg` onto the scene's weather and is ordered right after 26. Steps 16 and 19 retitled, since the held-out six are now chosen at step 19. [Q37 (png-browser)](#q37) moves to the wave-1 boundary, and Q3 and Q37 to Q40 stay open.
- 2026-10-22: build ranges cut with plumbbob 0.13.3's `/plumbbob:refine ranges`, as Rob approved them: 24 ranges, five of them bare (steps 20, 22, 30, 40 and 47), each step whose done-when puts a human check at its pause ending a range, and the ranges for waves 2 to 5 provisional, to be re-cut at each boundary.
- 2026-10-24: the wave-1 boundary's refine, after step 22 recorded the spike's verdict (variant a). Q65 to Q68 surfaced from the verdict. Rob took the leans on Q37, Q66 and Q67, widened Q68 so that every 2 s first frame is a target, and answered Q65 against its lean: the spike's moving shapes are the new baseline and the world may move more, with [Q69 (motion-direction)](#q69) open for where it goes. Recorded as [D145 (png-browser)](#d145) to [D150 (first-frame-target)](#d150), with C9, C11, C12 and C14 amended and steps 94 and 95 added. Rob then took the rest of the spike's direction, recorded as [D151 (dark-wet-skin)](#d151) to [D156 (dev-panel)](#d156): the dark skin and soft layers as data provisionally, the shore as flat blocks in both renderers, the minimap, cells that stay open, and a hidden dev panel in place of the spike's tuning panel. Steps 93, 96 and 97 added. Two holes opened from his replies: [Q70 (organelle-drift)](#q70), his idea that a file's drift inside its cell could mean something, and [Q71 (shore-band-position)](#q71), where the SVG's shore band goes. Rob took both leans, recorded as [D157 (organelle-drift)](#d157) and [D158 (shore-band-position)](#d158): a file drifts inside an opened cell by its looseness, and the SVG's shore band runs along the bottom. Steps 98 and 99 added, built in range 8.

## Source

*The sections of `SPEC.md` (draft v0.2, 2026-09-16) this build is cut from, verbatim, with headings demoted one level and anchors stripped, so the `[D…](#d…)` links in them land on this file's Decisions. §1 and §2 (the context and the references) are in `SPEC.md` at the repo root.*

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

#### 5.5 Motion grammar (Bartram budget)

Settled: the primary notice **breathes, and flares**. A flare is the loud
channel and is spent deliberately: once on load, then at random, so a
reviewer who looked away is pulled back without the map ever twinkling.

- **Load.** The skin settles onto the terrain (a damped 400 ms drop, the
  one moment the whole surface moves). The primary notice **flares** once
  (a 600 ms bioluminescent burst), then **breathes** (period ~2 s,
  amplitude ~3% of its glow radius). Nothing else moves. At the far zoom
  (§6, LOD0) the changed set is a scatter of static points of light; only
  the primary among them breathes.
- **Random flares.** After the load flare, the primary flares again at a
  random interval drawn from 8 to 20 s. Secondaries flare rarer and dimmer
  (40 to 90 s, half intensity). Never two flares in flight at once; the
  scheduler queues and drops, it never stacks. Tertiaries and everything
  else never flare. The numbers are tuned in the materials spike (§15).
- **Idle.** Between flares, static except the primary's breathing. An
  optional single ambient drift exists behind a setting and is off by default.
- **Jiggle.** The skin gives a brief damped jiggle (≤ 600 ms, spring with
  heavy damping) when the camera lands on a cell or a cell is opened. A
  transient, not a state; it never repeats on its own.
- **Hover.** 100 ms ease to a highlight; no motion on the hovered thing.
- **Camera.** Fly-to on notice click, ≤ 400 ms ease. Zoom, pan, tilt and
  rotate are on demand and never automatic.
- **LOD transitions.** Cross-fades bound to zoom thresholds, ≤ 300 ms. No
  page-like switches; the world never blinks.
- **Budget.** One continuous mover (the primary's breathing), at most one
  flare in flight, plus transient transitions ≤ 600 ms. Enforced in code by
  a motion scheduler that owns every animation; nothing animates outside it.
- **Reduced motion.** `prefers-reduced-motion` keeps the load flare as a
  static halo and disables random flares, breathing, settle and jiggle.

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

### 8. Comparison bases, sequences, and overlays

- **Bases.** `--base <ref>`; default is the merge-base with the trunk
  (auto-detect `main`, `master`, `develop`, `trunk`, `v*` branches; or
  configured). Named shortcuts: last commit (`HEAD~1`), last version (most
  recent tag), working tree vs `HEAD` (uncommitted weather), any two refs.
- **Sequence.** `--range base..head` renders one weather frame per commit,
  scrubbable, over the same terrain (the weather moving over the map).
- **Whole-repo mode.** No single change; overlays instead: trouble spots
  (churn × complexity hotspots), ugly spots (thresholds and maintainability),
  coverage gaps, dead code, duplication, cycles, recent heat (last N commits).
- **Terrain cache.** Layout and history are computed per base SHA and cached
  under `.<name>/terrain/<sha>.json`; incremental relayout starts from the
  previous SHA's positions (Codemap consistency).

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

### 15. Technology (evaluated against UX/DX, not against what weft did)

What the renderer must do, derived from the settled look (§5.6) and
navigation (§6):

- **R1** Continuous zoom through five LODs with cross-fades; 60 fps at
  ≤ 5,000 files on an M-series laptop; first frame ≤ 2 s from a cached terrain.
- **R2** Two materials: luminous, translucent, gradient-capable tissue with
  glow from within; and flat, crisp chrome whose text renders as text.
- **R3** 2.5D: orthographic overhead, relief lighting, tilt and rotate on
  demand.
- **R4** Precise picking and hover at every LOD, with membranes as arbitrary
  polygons and thousands of organelles.
- **R5** Headless capture to PNG (PR image) and a deterministic static
  render (SVG) for glance-test fixtures.
- **R6** Distribution beside checkride: npm, offline, no per-platform
  binaries, launched by a local command.
- **R7** DX for an LLM-driven build: TypeScript end to end, fast reload, a
  pure core with fixtures, and the deepest example corpus available.
- **R8** Renderer swappable behind `map.json`.

Candidates, status checked 2026-09-16:

| Candidate | Fit | Where it fails |
| --- | --- | --- |
| **three.js r186** with `WebGPURenderer` (WebGPU, automatic WebGL 2 fallback), TSL shaders, node-based or `postprocessing` bloom, `camera-controls`, CSS2D or `troika-three-text` labels, instancing, GPU picking | Meets R1 to R8. WebGPU shipped in Chrome, Edge, Safari 26 and Firefox 141+ by late 2025, so the fallback is a safety net. Custom TSL materials give membranes translucency and inner glow; selective bloom gives the bioluminescence; instancing carries thousands of organelles; continuous orthographic zoom is native; headless capture works through Chromium (Playwright). Largest corpus of any candidate. | In-world text is second-class (solved by DOM labels through `CSS2DRenderer`). Bubble Set contours must be triangulated (earcut ships with three). |
| deck.gl 9.4 (`OrthographicView`, layer model, luma.gl) | Excellent semantic zoom and layer model; picking built in; scales to millions; literally "a map with layers". | Organic materials need custom layers with hand-written shaders; relief and translucency fight its flat-layer primitives; postprocessing is thin; DX is shaped for geodata. Strong second if the world were flatter. |
| PixiJS 8.20 (WebGPU/WebGL, 2D) | Superb 2D throughput and filters; simple. | Relief must be faked with normal maps; tilt and rotate (R3) are out; one look only. |
| Native: Rust + wgpu or Bevy; Odin + raylib or sokol | Best raw performance; Rob's own native experience; the right answer for a wall display or a very large monorepo later. | R5 to R7 get heavy: per-platform binaries or 30 to 40 MB WASM, weaker text and UI, a small LLM corpus for wgpu, nothing npm-shaped beside checkride. Keep as a possible second renderer behind `map.json`; not v1. |
| Godot web export | A whole engine with a UI toolkit. | WebGL 2 only, tens of MB, GDScript outside the TypeScript toolchain, not npm-shaped. |

**Decision [D1 (technology)](#d1), confirmed by Rob: three.js
`WebGPURenderer` for the world, DOM for the chrome.** The reveal in §5.6 is a materials-and-glow problem,
and three.js is the only candidate where translucency, inner glow, relief,
continuous orthographic zoom, picking and headless capture are all
first-class *and* the corpus is deep enough for an LLM to build it reliably.

Around it:

- **World**: vanilla three.js, imperative scene, one explicit render loop
  that also owns the motion scheduler and the LOD cross-fades, so the motion
  budget (§5.5) is enforced in one place. react-three-fiber 9.7 (WebGPU
  capable) is not required; adopt it later only if the scene graph turns
  React-shaped.
- **Chrome and HUD**: DOM. React 19 for components and corpus; Svelte 5 is
  the lighter alternative if bundle size starts to matter. Labels through
  `CSS2DRenderer` so text is text and leaders are SVG lines.
- **Layout**: computed in the CLI and cached per base SHA (§8): d3-force
  within terraces (import attraction, collision, set cohesion, deterministic
  seed), `bubblesets-js` 3.0 for membranes, earcut for triangulation,
  elkjs 0.12 only for the LOD2 wiring overlay. GPU compute for layout is
  unnecessary at ≤ 5,000 files and stays out of v1.
- **Materials**: TSL node materials for tissue (translucency, rim glow,
  emissive by state, a wet specular sheen); selective bloom on emissive
  only, so the base tissue never blooms; relief from a heightfield with one
  key light.
- **Soft body**: the skin is a heightfield mesh displaced in the TSL vertex
  stage by the sum of smooth bumps read from a data texture of cell centres,
  radii and masses (terraces and stability swells are baked into the base
  heightfield). Settle and jiggle drive a single amplitude scalar through a
  damped spring, so the whole surface moves as one substance and the cost
  is one uniform per frame. Translucency is approximated from thickness;
  no real subsurface scattering in v1.
- **Zoom semantics**: one continuous zoom scalar; LOD bands with hysteresis;
  cross-fade ≤ 300 ms; label density managed per band (nearest-N by
  importance, no collisions).
- **Bundling and serving**: Vite for the app; the CLI serves the built app,
  `map.json`, and a WebSocket for watch mode.
- **Capture**: Playwright + Chromium for `--png` (WebGPU headless on macOS
  and Linux, SwiftShader WebGL fallback in CI); the phase-1 static SVG
  renderer stays as the fixture format for the glance test.
- **Budget**: first frame ≤ 2 s from cache; 60 fps at 5,000 files; above
  that, LOD1 collapses cells to composites (Nx style) and targets 30 fps at
  20,000 files.

**Phase 1b, materials spike (new).** In parallel with the static SVG, a
one-day three.js spike of the reveal on fake data: dark field with lights,
zoom to a luminous surface, zoom into one stained cell. Its only purpose is
taste: does the look hold up on screen before phase 2 commits to it.
