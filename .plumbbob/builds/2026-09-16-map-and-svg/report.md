# Report: atis phases 0 and 1: the map.json spike and the static SVG

Built 2026-09-16 to 2026-09-29: 52 steps, five refine passes, two glance-test readings. The
step-by-step history is the build-log's `## Log`; this report adds the why, the harvest and
what is left.

## What shipped

A pnpm workspace with three packages: a pure `libs/core`, a pure string renderer `libs/svg`,
and the `atis` CLI in `apps/atis`. `atis --repo <path> --base <ref> --out map.json` reads
git, checkride's `.check/` and a TypeScript import scan and writes a versioned `map.json`.
`--svg` renders that map as one still image of the whole repository, and `--open` shows it.

The build ran in five arcs, out of numeric order ([build-order.md](build-order.md)):

- **The spike (steps 1 to 14).** The scaffold, the schema and `assertMap`, cells and shore
  groups, depth bands, the import scan, the diff, the history miner, the `.check/` reader,
  reach, evidence, the flight category, the six-slot notice budget and one pure `buildMap`.
  Step 14 spot-checked the map for checkride PR 4 by hand against git, fallow and coverage.
- **The still render (steps 15 to 21).** A seeded force layout inside depth bands, Bubble Set
  membranes, and the SVG's field, terraces, weather, notices and HUD, with the colour and
  chrome tokens recorded in `docs/design.md`.
- **Round one (steps 22 to 30).** Five historical PRs from checkride and fascicle rendered
  into `fixtures/`, and glance-test round one read: **fail**, 2 of 5 verdicts. The map's
  loudest signals described the repository's standing state, not the change. Shore and
  render fixes followed, and the five maps were refreshed.
- **The retake (steps 31 to 42, then 32 to 34).** npm, yarn and bun workspaces, then the
  encoding fixes from refine pass four: red slots split into the change's and the standing
  state for the notices, the storms, the category and the HUD, and the skins lit by their
  gaps. The retake read five outside PRs blind: **fail**, 3 of 5 verdicts and 1 of 3 on
  notice precision. The standing state came back through touched files.
- **The fifth pass (steps 43 to 52).** fallow run directly, `health` and `dupes` counted
  only where they meet a hunk, a failing test ranked first, exported shapes fingerprinted,
  a published package's names read as wide, `.mts` and `.cts` scanned, the outside repos'
  tooling sorted into the shore, and the retake maps refreshed with an unscored
  before-and-after table in `docs/glance-test.md`.

## Decisions and why

The calls that shaped the build most. All 78 are in [intent.md](intent.md#decisions).

**Architecture**

- [D2 (layout)](intent.md#d2), [D19 (packages)](intent.md#d19) and
  [D33 (svg-package)](intent.md#d33): `core` and `svg` stay pure, and every process and
  file read lives in the CLI, so the whole map is testable from strings.
  [D30 (pure-parsers)](intent.md#d30) splits every source into a thin runner and a pure
  parser for the same reason.
- [D21 (import-graph)](intent.md#d21) and [D22 (local-fallow)](intent.md#d22): the graph
  comes from the TypeScript compiler, not per-file fallow calls, and fallow runs from the
  reviewed repo's own binary. Step 43 made that "run directly", after an npm tree showed
  `pnpm exec` failing silently.
- [D32 (terrain-from-base)](intent.md#d32) and [D39 (two-graphs)](intent.md#d39): the
  terrain is scanned from the merge-base and the weather from head, so a change never moves
  the ground it lands on.
- [D24 (layout-in-core)](intent.md#d24), [D34 (layout-deps)](intent.md#d34) and
  [D37 (no-terrain-cache-yet)](intent.md#d37): a seeded layout and sorted inputs make the
  same base produce the same picture, which buys determinism now and defers a cache to
  phase 3.

**What the map means**

- [D4 (tests-not-terrain)](intent.md#d4), [D5 (reach-by-module-hop)](intent.md#d5) and
  [D6 (flight-categories)](intent.md#d6): tests are evidence, reach attenuates at the
  interface, and the verdict is a category with a fixed meaning, never a score.
- [D7 (no-people)](intent.md#d7): no author field anywhere.
- [D48 (shore-groups)](intent.md#d48): every non-code file sits in exactly one shore group,
  with a residual kept loud rather than hidden. Steps 24, 26, 28 and 50 grew the table by
  kind.
- [D23 (head-only-check)](intent.md#d23): `.check/` is read at head only, so nothing in this
  build can say "newly breached". That constraint shaped the fifth pass's
  [D73 (touched-file-breach)](intent.md#d73).

**Fixtures and the glance test**

- [D38 (glance-is-a-step)](intent.md#d38): a glance fail does not fail the build; it parks
  the encodings to change for a refine. Both fails ran that way.
- [D56 (fixtures-skip-audit)](intent.md#d56) and
  [D58 (fixtures-current-toolchain)](intent.md#d58): a fixture's tree is historical but its
  harness is current, with `security` skipped, because atis only ever ships against current
  checkride and an audit against today's advisories is not the PR's weather.
- [D59 (outside-fixtures)](intent.md#d59), [D60 (fixture-balance)](intent.md#d60),
  [D62 (retake-reader-blind)](intent.md#d62) and [D64 (fixture-eligibility)](intent.md#d64):
  the retake read other projects' reviewed PRs, blind, on any JavaScript package manager,
  because Rob wrote every round-one PR and could not read them blind.
- [D63 (retake-in-this-build)](intent.md#d63): one retake, no more, so the fifth pass's
  fixes are left for round two on fresh fixtures.

**The encoding fixes**

- After round one: [D67 (standing-state-notices)](intent.md#d67),
  [D68 (standing-state-storms)](intent.md#d68), [D69 (category-from-change)](intent.md#d69)
  and [D70 (gate-blocks)](intent.md#d70) split red into the change's and the standing
  state, so the category, the notices, the storms and the HUD read the change.
  [D71 (lit-gaps)](intent.md#d71) and [D72 (tier-ring-not-evidence)](intent.md#d72) light
  a skin's gap and keep that light meaning one thing.
- After the retake: [D73 (touched-file-breach)](intent.md#d73) counts a `health` or `dupes`
  red only where its lines meet a hunk. [D74 (failing-test-rank)](intent.md#d74) puts a
  failing test first. [D75 (public-surface-width)](intent.md#d75) and
  [D76 (interface-shape)](intent.md#d76) read a published name as wide and raise
  `interface-change` only when a name or its shape moved.
  [D77 (mts-cts)](intent.md#d77) scans `.mts` and `.cts`, and
  [D78 (retake-refresh)](intent.md#d78) regenerated the retake's maps to show each fix
  moving the map that exposed it.

## Parked & harvested

52 items were parked. 50 went through nine harvests at step boundaries, and Rob confirmed
every proposed class:

| boundary | items | blockers | tangents |
| --- | --- | --- | --- |
| after step 18 | 19 | 3: [D55 (cochange-weight)](intent.md#d55), [D56 (fixtures-skip-audit)](intent.md#d56), [D57 (ts-config-is-shore)](intent.md#d57) | 16: 6 folded into steps, 7 held for fixture evidence, 2 deferred, 1 killed |
| after step 22 | 4 | 1: [D58 (fixtures-current-toolchain)](intent.md#d58) | 3, all into new steps (27 to 29) |
| after step 23 | 13 | 10: round one's fail, into [D59 (outside-fixtures)](intent.md#d59) to [D66 (legend-briefing)](intent.md#d66) and Q23 to Q27 | 3: 1 to phase 2, 1 deferred, 1 killed |
| after step 41 | 3 | 2: step 41, [D72 (tier-ring-not-evidence)](intent.md#d72) | 1 deferred |
| after step 32 | 1 | none | 1, later step 51 |
| after step 33 | 1 | none | 1, later step 43 |
| after step 34 | 5 | 3: the retake's fail, Q28 to Q30 | 2: 1 into step 50, 1 deferred |
| after step 45 | 1 | none | 1 deferred |
| after step 51 | 3 | none | 3 deferred |

That makes 19 blockers, 31 tangents and no pivot signals. Every blocker became a decision
and, where code moved, a fix step. Refine passes three to five seated steps 31 to 52 this
way.

The last two parks came during step 52 and did not go through a harvest. The builder
classes both as **tangents, deferred past this build**. Neither blocks anything the build
claims:

- apollo-client's body-only `QueryManager.ts` edit still raises `interface-change`. The
  class's inferred method returns leave its shape uncompared, which keeps the notice
  ([C2 (never-fake)](intent.md#c2)).
- retake-1's HUD Standing block overruns its box in a Quick Look render. Its geometry is
  unchanged since step 39, so the suspect is the width estimate against a viewer's
  fallback font.

## Final status

**Done.** All 52 steps are checkpointed, each on a green gate
([C8 (checkride-convention)](intent.md#c8)). The frame's three "done looks like" items
hold:

- step 14's spot-check on checkride PR 4;
- five historical PRs rendered into `fixtures/`;
- round one recorded in `docs/glance-test.md` with its list of encodings to change.

The build went past the frame into one retake ([D63 (retake-in-this-build)](intent.md#d63))
and a fifth pass of fixes.

**The glance test has not passed.** Round one failed at 2 of 5 verdicts, and the retake
failed at 3 of 5 verdicts and 1 of 3 on notice precision. Under
[D38 (glance-is-a-step)](intent.md#d38) that does not fail the build. The fifth pass's
fixes are unjudged. The refreshed retake maps show each one moving its map (a dupes primary
gone on two maps, the failing test first, the trpc break on the map at notice 5), but nobody
can read those five blind again. Only round two on fresh fixtures can score them.

**Open:**

- [Q3 (flare-and-jiggle-numbers)](intent.md#q3), open by Rob's choice as the log of motion
  balance patches;
- the two parks above;
- the deferred tangents below.

## Deferred tangents

**Seeds for the next build's frame**

- **Glance round two** on fresh outside fixtures, to judge the fifth pass. Give it a
  practice map or a legend inset before the scored five: one read of
  [D66 (legend-briefing)](intent.md#d66) did not teach the marks ("i'm just guessing and
  intuiting").
- **Uncompared shapes.** An export with an inferred type keeps `interface-change` alive on a
  body-only edit (apollo-client's `QueryManager`, form's `useForm`, hono's `RegExpRouter`).
  [D76 (interface-shape)](intent.md#d76) needs a way to compare these, or a quieter reading
  of "could not be compared".
- **Go** as the next ecosystem: a producer writing the same scan and `.check/` inputs, never
  a widening of the TypeScript scan (Rob, 2026-09-24).
- **`security-finding`** tied to the change's dependency delta rather than the repo's
  standing vulnerabilities.
- **Public-surface gaps:** a bare `export { a }` after an import, and `index.mts` or
  `index.cts` barrels with their `dist/` mappings.
- **The shore residual after step 50:** compose files, migrations, `serverless.yml`,
  `vitest.workspace.*`, `deno.*.json` variants, with candidate rows already named.
- **`cli.test.ts`** racing the `types` slot's parallel rebuild of `dist`.
- **HUD widths:** the Standing block's width estimate against a viewer's fallback fonts.

**Held for fixture evidence since step 18, never picked up** (the snapshot and `.gitkeep`
patterns were settled by step 50):

- **A changed file the coverage report never names yields no gap, so it can read as VFR.**
  This is the one of these that could put a fake calm on a map
  ([C2 (never-fake)](intent.md#c2)), and it is worth checking first.
- A committed `dist/` or `.d.ts` scans as terrain.
- Reach is recomputed per changed file.
- A Bubble Set can leave a neighbour's centre under a skin on dense fields.
- Cells' own dents and clone families are not drawn on membranes.
- Added and modified stains differ only by `data-kind`.

**Infrastructure**

- A type-level `CheckArtifacts` conformance check in `apps/atis`.
- [C1 (core-is-pure)](intent.md#c1)'s struct rule. fallow's boundary rule stops `libs`
  importing `apps`, but nothing yet stops a `node:*` import in `libs/*/src`. A search at
  finish found none. The rule, when it lands, should scope to shipped sources.

**Phase 2:** how three readers collapse to one verdict. The question is moot while Rob
reads alone.

**Killed:** a separate tests group in `terrain.groups` (step 12 already emits it), and
checkride's jest adapter running without `--coverage` (checkride's backlog, since
[D64 (fixture-eligibility)](intent.md#d64)'s harness route covers atis).

## Checkpoints

- baseline 24ae94f99e2031de4b031fa98d9730889aed9858
- plan 86c530f03db6ce53cd7ab855af77586f6ee92f33
- step 1 e5aaa9f66c7d1fa6da861325f0ccaa87cdaa96d2
- step 2 d26089e7f181296112c1c56d8ee539750ce7fa9b
- step 3 f86c31bd40e7a0eec9e743558ecb65efd8346397
- step 24 cfa977b32fc1ea61beb21d3fbc2dc47a3db6199f
- step 4 b01fac5d6465ec64caf1e45ed400a73f55053249
- step 5 637b5602144b7244167ce66fee9ac76312f6f4c5
- step 6 9d919bd62027db7c8d4f9ae3fcab76a7a4600007
- step 7 60013a16676e9edb6d6fd4183dbee7fe80c47587
- step 8 ee0b2ccbf960ecc75ca98bbca10dd4954c1d1eba
- step 9 39d94db86992dd7e41616e9d6ef60e4433318528
- step 10 330effb3b204b51e3a856296ee8cf39b58206056
- step 11 80486a57c2784c88f46d40312a9969b165cfd26b
- step 12 1e752b601968b8723ef4c1bb50a326935f22d280
- step 13 702d79feef7f2baa3264de6efb807ff887e9947c
- step 14 a831f431aca0cf4722b9dcc503fcee05313501b4
- step 15 0a6837066259b58b05eef9cc2d464a5d08b43c5a
- step 16 ab9420b217153751b7a7345707e1b4de2e25f7e3
- step 17 00b8ce6931ffc1e63f098f63bdf1fe834888c857
- step 18 8867706527d8bc06eebc68673add9d5af6306521
- step 19 eb0ef72405b299bcd0ef51a35bc6b7e6897e5f33
- step 20 024ec73e1b307f0358f17c50f5bf7a641de91090
- step 21 e52a6140458736b2d81a2c4ede1cc92b1a84cccd
- step 25 29c322c9dc308c095304964f10cd7010cf2ecf10
- step 26 872f2e4a0e4a0a723e616afacb7c5ab65a458bc9
- step 22 78cf4061cb7cd972b763308d5415103ca4bc43e8
- step 27 2d5e63ff10e795a0341e29bac9471a52831b2b4b
- step 28 2e2d6bf5b06711c5197a2076c8161a26a9ed619c
- step 29 35e3faa91325bc5b9c0c668c20f161f003f70af6
- step 30 73fe57332d6023b40f30341d69e063decd5dccc4
- step 23 fdfe6e1dc49ff4eb3fc14015c52d0fb22064fd28
- step 31 d02e4cc8bc10739ca527f13564de86e6ee656d8f
- step 35 948a5e16f01f9e5fb289a415d09e1e1bf9bffc05
- step 36 77f15b657b6c88babcdb5571a6fc82a8682b942c
- step 37 e92d2f65cdb7763ac435e558f993f5bf7d4ae661
- step 38 7c947cd21ed36eddcc91da2035a619b0695e6fa5
- step 39 bf024ab5219121cd8f06fa2890e40e5afe94df11
- step 40 0a6deb09aa073155d60eae8a13717bf64f97ba66
- step 41 18dc902153bc3e19da0d408fff05aabf83a2702d
- step 42 80953c6122d7cf8f34d929e0ea91147f4290986b
- step 32 220115a37ad11ce6d3fbca4db47ad2c46435908d
- step 33 33369cefdd141523937bf36f75c430694a2adfc5
- step 34 04462a0d3a9e7d841b339826a1077678717cef5c
- step 43 2767cfc66f41e297d959fef9c90658287fb167a5
- step 44 4adb64438740e2a3cc34f53c8ef985f96fbd2c6e
- step 45 e149bbe1a807752d50679b5af7844b7e64d0c94c
- step 46 fc6b66319dd5853d188b9f0ab99faa594740f597
- step 47 46cbcc8c93772a08572a3d05d940a05f769f7656
- step 48 0ef3ec9a230b67b2e4b83e6782992968a9f2be04
- step 49 a3480f0033debae42464c33d2f6f63d3e42dea98
- step 50 ef7bac0e6a401bde1ecb90f7d5136e2aea88ae98
- step 51 abfc18513ec95ebfe1fb6dbb2ba209305cf8cf4c
- step 52 221f9602f6f21d50409e6842ef96373a1a960aa9

## Stats

| step | red checks | drift warnings | reverts | wall-clock |
| ---- | ---------- | -------------- | ------- | ---------- |
| 1 | 0 | 0 | 0 | 2m |
| 2 | 0 | 0 | 0 | 17m |
| 3 | 0 | 0 | 0 | 18m |
| 4 | 0 | 0 | 0 | 4m |
| 5 | 0 | 1 | 0 | 12m |
| 6 | 0 | 1 | 0 | 9m |
| 7 | 0 | 1 | 0 | 85m |
| 8 | 0 | 0 | 0 | 18m |
| 9 | 0 | 0 | 0 | 6m |
| 10 | 0 | 1 | 0 | 17m |
| 11 | 0 | 1 | 0 | 14m |
| 12 | 0 | 0 | 0 | 48m |
| 13 | 0 | 1 | 0 | 11m |
| 14 | 0 | 0 | 0 | 12m |
| 15 | 0 | 1 | 0 | 25m |
| 16 | 0 | 1 | 0 | 20m |
| 17 | 0 | 0 | 0 | 18m |
| 18 | 0 | 1 | 0 | 27m |
| 19 | 0 | 1 | 0 | 71m |
| 20 | 0 | 1 | 0 | 8m |
| 21 | 0 | 1 | 0 | 20m |
| 22 | 0 | 0 | 0 | 1175m |
| 23 | 0 | 0 | 0 | 1616m |
| 24 | 0 | 0 | 0 | 3m |
| 25 | 0 | 1 | 0 | 21m |
| 26 | 0 | 0 | 0 | 30m |
| 27 | 0 | 0 | 0 | 12m |
| 28 | 0 | 0 | 0 | 4m |
| 29 | 0 | 0 | 0 | 6m |
| 30 | 0 | 0 | 0 | 19m |
| 31 | 0 | 0 | 0 | 4m |
| 32 | 0 | 0 | 0 | 151m |
| 33 | 0 | 0 | 0 | 102m |
| 34 | 0 | 0 | 0 | 36m |
| 35 | 0 | 0 | 0 | 14m |
| 36 | 0 | 0 | 0 | 32m |
| 37 | 0 | 1 | 0 | 5m |
| 38 | 0 | 1 | 0 | 30m |
| 39 | 0 | 1 | 0 | 5m |
| 40 | 0 | 1 | 0 | 14m |
| 41 | 0 | 0 | 0 | 2m |
| 42 | 0 | 0 | 0 | 969m |
| 43 | 1 | 1 | 0 | 11m |
| 44 | 0 | 1 | 0 | 19m |
| 45 | 0 | 0 | 0 | 5m |
| 46 | 0 | 0 | 0 | 53m |
| 47 | 0 | 1 | 0 | 10m |
| 48 | 0 | 0 | 0 | 774m |
| 49 | 0 | 0 | 0 | 5m |
| 50 | 0 | 0 | 0 | 11m |
| 51 | 0 | 0 | 0 | 5m |
| 52 | 0 | 0 | 0 | 31m |
| **total** | 1 | 20 | 0 | 5633m |
