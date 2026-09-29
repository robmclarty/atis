<!--
build-log.md: your live ledger for execution. Append constantly; reorganize at
step boundaries. The antidote to "my plan got lost in the noise."

  Steps     : where you are. One step in flight at a time. CLI-maintained: `build`,
              `checkpoint`, and `revert` keep this mirror and the Current step line
              in sync with intent.md; you never hand-edit them.
  Park list : where ideas go so you do not chase them. CAPTURE, never act inline.
  Harvest   : the boundary ritual that keeps you on one branch.
  Log       : the build's history. `plumbbob checkpoint` appends a line per step as it
              lands; feeds the /plumbbob:finish report, which rides the branch into the PR.
-->

# Build log: atis phases 0 and 1: the map.json spike and the static SVG

**Current step:** 34 — chore(glance): retake glance-test round one on the outside fixtures
**Heavy check:** checkride (set a "check" key in .plumbbob/settings.json to override)

## Steps

*(Mirror of intent.md's Steps, with live status; CLI-maintained, not hand-edited.
`build`/`checkpoint`/`revert` re-render this from intent.md, and set the Current step
line above. Only ONE step is in flight; a step is done only after a checkpoint:
check green + checkpoint taken, via `/plumbbob:verify` or `/plumbbob:build`.)*

- ☑ 1. chore(repo): scaffold the atis monorepo with checkride init
- ☑ 2. feat(core): define the map.json schema types and assertMap
- ☑ 3. feat(core): identify cells, organelles and shore groups from a file list
- ☑ 4. feat(core): compute topological depth bands over the import graph
- ☑ 5. feat(cli): scan TypeScript imports into files, exports and edges
- ☑ 6. feat(cli): read the git diff into change kinds, sizes and head-side hunks
- ☑ 7. feat(history): mine git log into churn, age, bug-fix rate and co-change
- ☑ 8. feat(cli): read checkride's .check artifacts into evidence inputs
- ☑ 9. feat(core): compute the changed set and reach by module hop
- ☑ 10. feat(core): compute evidence and the flight category
- ☑ 11. feat(core): rank notice candidates into the six-slot budget
- ☑ 12. feat(core): assemble map.json through one pure buildMap
- ☑ 13. feat(cli): add the atis command that writes map.json for a base ref
- ☑ 14. chore(spike): generate and spot-check map.json for checkride's PR 4
- ☑ 15. feat(core): lay out organelles within bands with a seeded force simulation
- ☑ 16. feat(core): draw cell membranes as Bubble Set contours over the layout
- ☑ 17. feat(svg): render the field, terraces, membranes and organelles
- ☑ 18. feat(svg): render the weather layer over the terrain
- ☑ 19. feat(svg): render the notice labels and the HUD grade blocks
- ☑ 20. feat(cli): add --svg and --open to write and show the static render
- ☑ 21. docs(design): record the colour and chrome tokens the SVG settled
- ☑ 22. chore(fixtures): generate map.json and the SVG for five historical PRs
- ☑ 23. chore(glance): run glance-test round one and record the verdicts
- ☑ 24. fix(core): send hook folders to the scripts shore group
- ☑ 25. fix(core): weigh missing co-change notices by rate and support
- ☑ 26. fix(core): send TypeScript config files to the config shore group
- ☑ 27. fix(svg): point a global-slot notice's leader at its storm marker
- ☑ 28. fix(core): send plugin, MCP and bench JSON to their shore groups
- ☑ 29. fix(cli): name --svg and --open in the usage text
- ☑ 30. chore(fixtures): refresh the five maps after the render and shore fixes
- ☑ 31. feat(cli): read npm, yarn and bun workspaces as scan roots
- ☑ 32. chore(fixtures): select five reviewed outside PRs and record their ground truth
- ☑ 33. chore(fixtures): generate map.json and the SVG for the five outside PRs
- ☐ 34. chore(glance): retake glance-test round one on the outside fixtures
- ☑ 35. feat(cli): name the files a red lint or struct slot reports
- ☑ 36. fix(core): set the flight category from the change's red slots
- ☑ 37. fix(core): spend the notice budget only on the change's red slots
- ☑ 38. fix(svg): draw standing-state storms as grey terrain
- ☑ 39. fix(svg): count red slots in the HUD's Gate and Standing blocks
- ☑ 40. fix(svg): light a skin's uncovered arc instead of its covered one
- ☑ 41. fix(cli): read npm, yarn and bun packages for the dependency delta
- ☑ 42. fix(svg): draw a secondary notice's ring in chrome grey, clear of the lit skin

## Park list

> Mid-step, every new problem / idea / "ooh what if" lands HERE, untouched, and you
> go straight back to the step. Acting the instant an idea arrives is the disease.
> Capture is one line (`/plumbbob:park` composes it). Harvest happens only at the boundary.

- [x] test and shore patterns: vitest __snapshots__/*.snap and .gitkeep land in other, and a tests/ folder counts as terrain; decide whether the defaults grow once step 14 or 22 shows real repos
- [x] generated TypeScript is terrain today: a committed dist/ or a .d.ts file scans like source; decide whether the scan drops it once step 14 or 22 shows a repo that commits one
- [x] changed test files need a home in changed[]: step 9 gives them the group id 'tests' (D4 keeps them off the terrain, D48 demands exactly one cell or group), so step 12 must list a tests group in terrain.groups or assertMap rejects every PR that touches a test
- [x] a changed source file the coverage report never names yields no gap, so an uninstrumented new file can read as VFR; D27's gap rule needs a third state (unmeasured) or the notices step needs an 'untested changed file' candidate
- [x] core's CheckArtifacts is the .check contract but nothing proves apps/atis still satisfies it once step 12 stops importing every field; consider a type-level conformance assertion in apps/atis
- [x] computeEvidence runs computeReach once per changed file, which recomputes newCrossModule each time; harmless at spike scale, worth a narrow per-file reach export if a large PR shows up in step 14
- [x] notices.ts: the deleted-export `why` says "1 files still import it"; pluralise the consumer count
- [x] C1's struct rule, when it lands, scopes to shipped sources: tests under __tests__/ may import node:* to read fixtures (Rob, 2026-09-17)
- [x] atis writes map.json into the working directory by default; .gitignore does not cover it, so a run in this repo leaves an untracked file
- [x] the fixture procedure must name the worktree directory after the repo: meta.repo is basename(--repo), so /tmp/atis-spike-cr-pr4 wrote repo: "atis-spike-cr-pr4" into the map; step 22's five fixtures need the same care, or the CLI should read the name from the origin remote
- [x] readCheck loses the coverage and test channels when --repo reaches the repository through a symlink: on macOS /tmp is /private/tmp, so relativeToRepo() in apps/atis/src/sources/check.ts falls back to the absolute coverage key and nothing joins to a changed path; patch_coverage came back [] with no reason. A realpathSync on the repo in run.ts (or in relativeToRepo) fixes it. Found by the step-14 spike; the fixture is generated from the realpath as a workaround.
- [x] the notice tie-break is alphabetical, so the strongest missing-cochange loses to markdown: on checkride PR 4 all four tertiary candidates weigh exactly 2 (severity 2, cells_reached 0, history_weight 0) and byPath cut src/pm/translate.ts (rate 0.857, support 6, a source file in the changed cell) in favour of README.md (rate 0.5) and package.json. score() gives a co-change candidate no credit for rate or support, so the alphabet is doing the ranking in the tertiary tier (P1, C7).
- [x] pnpm check --all on a historical commit runs pnpm audit against today's advisory database, so the security slot goes red for reasons the PR did not cause and the map reads IFR: checkride PR 4's fixture carries a red-check-slot notice and an IFR category from 15 advisories in a 2026 lockfile. Step 22's five fixtures need a call: skip security beside mutation, or record in each README that the category includes an audit the PR is not responsible for.
- [x] contours are two thirds of the demo golden's lines: the CLI's pretty-printed map.json puts every coordinate on its own line, so a compact writer for contours (one point per line, or a flat array) is worth deciding before step 22 commits five fixtures
- [x] on synthetic fields packed at the collide pad (480 to 2000 files) the bubble-set routing leaves a neighbour's centre under a skin a handful of times even after the harder second cut; revisit the field or the layout's cell spacing if a step-22 repo shows one
- [x] a root vitest.config.ts is terrain: it draws as a one-file directory cell named '.' on band 0 (with an empty package:. beside it) because classifyFile sends every .ts to terrain before D48's config rule (*.config.*) can claim it; decide whether TypeScript config files are shore
- [x] svg: draw a cell's own dents and clone_family on its membrane (§5.1 names cells too; step 17 drew them on organelles only, as the done-when scoped)
- [x] svg: added and modified stains are the same disc, told apart only by data-kind; if the glance test wants them distinct, a rim or a value is the change
- [x] svg: global storm markers hang at the field's top-right corner; step 19's HUD may want that corner and can move them through STORM_INSET
- [x] chrome: a notice on a global slot name (red-check-slot, security-finding) keeps its row and gets no leader; point it at that slot's storm in the field's corner once weather.ts exports the storm anchor
- [x] USAGE text in apps/atis/src/index.ts omits --svg and --open (index.ts is outside step 20's seam)
- [x] checkride v0.1.1 summary.json omits checks_run yet says schema_version:1, so atis reads PR2 evidence as harness_broken -> LIFR git-only; decide if atis should tolerate the older schema-1 shape or if this is the intended glance case (matters for step 23, a reader may hold for the harness not the change)
- [x] shore table leaves common .json to the loud 'other' residual (.claude-plugin/plugin.json in checkride; .mcp.json, .ridgeline/settings.json, .codegraph/config.json, bench/*.json, packages/core/src/flow-schema.json in fascicle); on fascicle PR5's 3-file git-only change the other-group is the PRIMARY notice, so repo census headlines a small fix -- D48 wants the table to grow; candidate rules: .claude-plugin/**->prompts, .mcp.json/.ridgeline/**/.codegraph/**->config, bench/**->data (matters for step 23 glance reading)
- [x] repo-wide red slots crowd out change-specific notices: under D58 every fascicle notice is a red-check-slot (dead/dupes on the tool files, attw global) and the interface-change notice that used to be primary is pushed out of the six-slot budget entirely; fascicle PR4 and PR5 now render nearly identical maps despite 18 vs 3 changed files. Decide whether a red slot naming an unchanged file, or a global slot, should compete on equal footing with a notice about the change (P1, C7; compare D55's cochange-weight fix)
- [x] glance-test blinding is impossible as written: Rob wrote all five fixture PRs (ae5078cc, 937bb1d7, 9511268f on checkride; 13ef5143, c7407b50 on fascicle) and under D44 authors their ground truth too, so SPEC 11's 'three readers who did not write or review the PR' and the step-23 done-when's 'Rob plus two' cannot both hold; the sheet records Rob's row as unblinded and leans on the two recruited readers, but whether his verdicts count toward the 4-of-5 needs Rob's ruling
- [x] SPEC 11 criterion 5 does not say whether naming the right file for the wrong reason counts as the flagged thing landing in the top three: on fascicle PR4 and PR5 the primary notice is run_shell.ts for a dead-code slot, not for the byte cap, the timeout or the symlink TOCTOU the review found, so round one scores 3 of 5 strict or 5 of 5 generous off the same table; decide the reading before it decides a pass
- [x] a blanket 'hold' passes glance-test criterion 4's verdict half: four of the five fixtures expect hold (only fascicle PR5 is merge), so a reader who holds on everything scores 4 of 5 without reading the map, and only the hold-reason half stands between that and a pass; the five need a calmer PR or two, or the pass line needs a merge-side floor
- [x] SPEC 11 counts 'four of five verdicts' but never says how three readers collapse to one verdict per PR; the round-one sheet takes majority (2 of 3), the alternative reads all fifteen verdicts and needs twelve, a strictly harder bar -- fix the rule in the spec so round two scores the same way
- [x] glance round one encoding: standing-state storms outshout the change -- a red slot naming cells the change did not touch draws the same bolt as one naming a changed file (69 of 71 storms on each fascicle map sit off the changed cell); recede untouched-cell storms into the terrain so the change's own red reads first (docs/glance-test.md round one, fail line 1)
- [x] glance round one encoding: the flight category is set by the repo's standing state -- repo-wide red slots make four of five fixtures IFR, so the category cannot tell the changes apart; derive it from the change's own evidence and report standing state beside it (fail line 2; see the red-slot budget park)
- [x] glance round one encoding: 'Checks 17/17' reads as the verdict -- it is the HUD's most legible number and says only that the gate passed, which it did on every PR checkride let merge; the reader merged checkride PR 5 over an IFR category on the strength of it (fail line 3)
- [x] glance round one encoding: the change's own evidence is too quiet for ten seconds -- the open skin on src/doctor.ts (6 untested changed lines reaching 3 cells, the file aa2a08a later repaired) was checkride PR 5's whole signal and read as calm; skins, bites and glow need to out-rank the terrain at a glance (fail line 4)
- [x] glance round two fixtures: use other projects' TypeScript PRs with public reviews -- the commit a reviewer asked changes on is a hold, the commit they approved a merge, ground truth in the reviewer's words; balances verdicts, takes the author out of the reader's chair, replaces recollection with a record (Rob, 2026-09-24; changes D54 and D44)
- [x] glance protocol: give every reader the same one-minute legend before the first map, saying what each mark and HUD block measures and not how to weigh it; round one ran with none and SPEC 11 is silent on it
- [x] Go is the next ecosystem atis must read (Rob, 2026-09-24: 'our new product at work is using a Go backend ... that is the direction we need to move in'): a Go producer (go list -json for the import graph, go test -coverprofile for coverage, a Go-aware history filter) writing the same scan and .check inputs, not a widening of the TypeScript scan; SPEC 12 puts languages beyond TypeScript in phase 5, and Rob wants it sooner
- [x] checkride's jest adapter runs 'jest --ci --json' without --coverage, so a jest repo yields test results but no patch coverage; worth giving it the same coverage run vitest gets (checkride's repo, not atis's), found at refine pass three while settling Q19
- [x] git.ts memberDirs still reads only pnpm-workspace.yaml, so readManifests' deps_added (D47) misses npm/yarn/bun member manifests; route it through parseManifestWorkspaces before step 33
- [x] security-finding counts the repo's vulnerabilities at head, which is standing state by D67's reading; now that a global red security slot no longer suppresses it, should it spend the budget only when the change's dependency delta touches it?
- [x] a secondary notice's tier ring (CHROME_INK, SECONDARY_RING_WIDTH 3, EMPHASIS_PAD 5) is the evidence light's own colour and heavier than the lit skin 1 unit inside it, so a secondary target's skin reads lit all round (checkride PR 5's src/doctor.ts); chrome.ts, outside step 40's seam
- [x] D54 wants a docs/inspiration.md row per outside source: cite the retake's five repos there once step 34's verdicts are in, since adding them now would leak through the diff (D62)
- [x] fallowEntryPoints in imports.ts runs `pnpm exec fallow list` whatever the repo's manager: on an npm, yarn or bun tree pnpm re-lays node_modules and narrates on stdout, the JSON parse throws, and the catch silently returns [] (manifest-only entry points, no trace in meta.instruments); run node_modules/.bin/fallow directly, or pass --config.verify-deps-before-run=false, and record a failed lookup rather than swallow it (C2)
- [ ] glance retake (D38): a health or dupes red on a touched file counts as the change's red (D67), though those slots name a file for what it already is; touching an already-complex or already-duplicated file makes the category IFR and takes the primary notice: 4 of 5 retake primaries, and the whole of hono #5266's IFR on an approved merge. Candidates: count such a finding as the change's only where its lines meet a head-side hunk, or hold it standing until phase 3's base-side delta
- [ ] glance retake (D38): every red-check-slot notice carries severity 10 whatever the slot, and a test file reaches 0 cells, so a failing test on the change ranks below any red on a file with reach: apollo-client #12633's failing useLazyQuery tests, the reviewer's own finding, were notice 6 behind two health rows
- [ ] glance retake (D38): interface-change reads a cell as wide only by in-repo fan-in (>= p95) or depth, so a published package's exported types read as narrow: trpc #6976's breaking change to TRPCQueryKey and TRPCMutationKey in internals/types.ts (cell fan-in 1, band 1) drew no notice; a library's readers are outside its repo (package.json exports, not private)
- [ ] glance protocol for round two: one read of the D66 legend does not teach the marks; Rob after the retake: 'i just need to better learn what the graphics actually mean. i'm just guessing and intuiting', and read copy A as 'moved or renamed' on a change that renamed nothing; candidates: a practice map before the scored five, or a legend inset on the map
- [ ] the shore rules were written against checkride and fascicle: on the retake's outside repos the Other block reads 43 to 106 files (apollo-client, TanStack form, hono, trpc), so common tooling files fall through; group them by kind rather than widen the residual

## Harvest  *(run `/plumbbob:harvest` at each step boundary, after green)*

Classify each parked item as exactly ONE. Naming it before acting is what keeps you
from sprawling across branches.

| Class            | Meaning                                   | Action                               |
| ---------------- | ----------------------------------------- | ------------------------------------ |
| **blocker**      | Plan was wrong/incomplete; can't proceed  | `/plumbbob:revert`, fold into intent |
| **tangent**      | A different path, not clearly better      | Defer or kill. Default here.         |
| **pivot signal** | Evidence the whole approach is wrong      | Stop. Replan deliberately.           |

> Reality check: almost everything that *feels* like a pivot is a tangent. Require a
> failed assumption, not a shinier idea, before you pivot.

Harvest results this boundary:

- 2026-09-17, boundary after step 18 (8867706), 19 items; Rob confirmed every proposed class:
  - build order after this harvest: 19, 20, 21, 25, 26, 22, 23; see [build-order.md](build-order.md)
  - **blocker** · the notice tie-break is alphabetical → [D55 (cochange-weight)](intent.md#d55), fix step 25
  - **blocker** · pnpm audit at a historical commit reads IFR → [D56 (fixtures-skip-audit)](intent.md#d56), folded into step 22's procedure (it regenerates PR 4 anyway, so no separate step)
  - **blocker** · a root vitest.config.ts is terrain → [D57 (ts-config-is-shore)](intent.md#d57), fix step 26
  - **tangent**, fold into step 20 · map.json is not gitignored; readCheck loses coverage through a symlinked `--repo` (a `realpathSync` in run.ts); a compact writer for contours before step 22 commits five maps
  - **tangent**, fold into step 22's procedure · name the worktree after the repo, since meta.repo is basename(--repo)
  - **tangent**, fold into step 19 · storm markers yield the corner to the HUD through STORM_INSET
  - **tangent**, rides with step 25 · pluralise the deleted-export consumer count
  - **tangent**, wait for step 22's fixtures or step 23's glance · snapshot and .gitkeep patterns; committed dist/ and .d.ts as terrain; an unmeasured changed file reads as VFR (a blocker the moment a fixture PR adds a file the coverage report never names); reach recomputed per changed file; a bubble set leaving a neighbour under a skin; dents and clone_family on membranes; added and modified stains alike (D38 lets the glance decide the last two)
  - **tangent**, defer past this build · a type-level CheckArtifacts conformance in apps/atis; C1's struct rule scoping to shipped sources (kept in memory; amend C1 when the rule lands)
  - **tangent**, kill · a tests group in terrain.groups: step 12 already emits it from shoreGroups in map.ts

- 2026-09-22, boundary after step 22 (78cf406), 4 items; Rob confirmed every class and overrode two actions:
  - **blocker** · checkride v0.1.1's summary omits `checks_run` → [D58 (fixtures-current-toolchain)](intent.md#d58). Rob's call, and it reversed the proposal: the fix is not a tolerance branch in atis's parser but running the *current* harness on the historical tree. Proved at the boundary — PR 2 goes from LIFR / git-only / 0 notices to IFR / 6 notices led by `survived-mutants` on `src/cli.ts`, a real finding about the PR's own changed lines. The builder had mis-read [D22 (local-fallow)](intent.md#d22) (pinned-versus-global) as licensing a historical harness.
  - **tangent**, into the new step (Rob: "i'd like this in the build") · a global-slot notice keeps its row and gets no leader. The builder proposed deferring it as unexercised; that was an artifact of the wrong harness, and under D58 `red-check-slot` notices carry 4 of PR 2's 6 rows, so it fires constantly.
  - **tangent**, into the new step (Rob: "fix it") · `USAGE` in `apps/atis/src/index.ts` omits `--svg` and `--open`.
  - **tangent**, into the new step (Rob: "this has value outside of step 23 right? if so, let's do it") · grow D48's shore table so common `.json` stops falling to the loud `other` residual; candidate rules `.claude-plugin/**`→prompts, `.mcp.json` / `.ridgeline/**` / `.codegraph/**`→config, `bench/**`→data.
  - consequence · all five fixtures are regenerated under D58, and PR 2's `truth.md` is rewritten: it currently reads "calm — the fix held", which the mutation finding contradicts. Rob also ruled (i) on the open question the proof raised: findings current fallow rules raise on older code stay as real weather, folded into D58.

- 2026-09-24, boundary after step 23 (fdfe6e1), 13 items; Rob confirmed every proposed class:
  - build order unchanged: 31, then the encodings refine seats its steps, then 32, 33, 34; see [build-order.md](build-order.md)
  - **blocker**, already folded · glance-test blinding is impossible as written → [D62 (retake-reader-blind)](intent.md#d62)
  - **blocker**, already folded · a blanket "hold" passes criterion 4's verdict half → [D60 (fixture-balance)](intent.md#d60)
  - **blocker**, already folded · use other projects' reviewed PRs as fixtures → [D59 (outside-fixtures)](intent.md#d59), steps 32 to 34
  - **blocker** · repo-wide red slots crowd change-specific notices out of the budget → [Q23 (standing-state-notices)](intent.md#q23), for the encodings refine
  - **blocker** · standing-state storms outshout the change → [Q24 (standing-state-storms)](intent.md#q24), for the encodings refine
  - **blocker** · the category is set by the repo's standing state → [Q25 (category-from-change)](intent.md#q25), for the encodings refine
  - **blocker** · "Checks 17/17" reads as the verdict → [Q26 (checks-block)](intent.md#q26), for the encodings refine
  - **blocker** · the change's own evidence is too quiet for ten seconds → [Q27 (quiet-evidence)](intent.md#q27), for the encodings refine
  - **blocker** · criterion 5's "right file for the wrong reason" → [D65 (notice-precision-reading)](intent.md#d65); step 34 scores by it
  - **blocker** · a fixed legend before the first map → [D66 (legend-briefing)](intent.md#d66); step 34 writes and reads it
  - **tangent**, defer to phase 2 · how three readers collapse to one verdict: moot while Rob reads alone (D62), back if round two finds readers
  - **tangent**, defer past this build · Go as the next ecosystem, Rob's quote with it: seed for the next build's frame
  - **tangent**, kill here · checkride's jest adapter runs without `--coverage`: D64's harness route covers atis's need, and the adapter fix is checkride's backlog

- 2026-09-27, boundary after step 41 (18dc902), 3 items; Rob confirmed every proposed class:
  - build order after this harvest: 42, 32, 33, 34; see [build-order.md](build-order.md)
  - **blocker**, already folded · `memberDirs` read only `pnpm-workspace.yaml`, so `deps_added` missed npm, yarn and bun members → step 41 (18dc902), under [D64 (fixture-eligibility)](intent.md#d64) and [D47 (dependency-delta)](intent.md#d47); nothing new in intent
  - **blocker** · a secondary notice's ring is the evidence light's own colour, 1 unit outside the lit gap, so its target reads as wholly uncovered → [D72 (tier-ring-not-evidence)](intent.md#d72), fix step 42, ordered ahead of step 33 so the outside SVGs render with it
  - **tangent**, defer past this build · `security-finding` spends the budget on standing vulnerabilities, by [D67 (standing-state-notices)](intent.md#d67)'s reading: no fixture runs the `security` slot ([D56 (fixtures-skip-audit)](intent.md#d56), [D58 (fixtures-current-toolchain)](intent.md#d58)), so the retake cannot see it, and tying it to the change needs per-package advisories `security.json` does not carry; seed for the next build's frame, with step 41's complete `deps_added` as the other half of that link

- 2026-09-28, boundary after step 32 (220115a), 1 item; Rob confirmed the proposed class:
  - build order unchanged: 33, 34; see [build-order.md](build-order.md)
  - **tangent**, defer until after step 34 · a `docs/inspiration.md` row for each of the retake's outside repos, as [D54 (glance-prs)](intent.md#d54) asks: neither step 33 nor step 34 needs it, and it cannot land before the verdicts without breaking [D62 (retake-reader-blind)](intent.md#d62); pick it up at the boundary after step 34

- 2026-09-29, boundary after step 33 (33369ce), 1 item; Rob confirmed the proposed class:
  - build order unchanged: 34; see [build-order.md](build-order.md)
  - **tangent**, defer until after step 34 · `fallowEntryPoints` in `apps/atis/src/sources/imports.ts` runs `pnpm exec fallow list` whatever the repo's manager, so on an npm, yarn or bun tree the JSON parse throws and the scan silently falls back to manifest-only entry points, a [C2 (never-fake)](intent.md#c2) gap in shipped code: step 33 generated the five retake maps with `pnpm_config_verify_deps_before_run=false`, so step 34 reads correct terrain and nothing else in this build calls the lookup on a non-pnpm repo; pick it up at the boundary after step 34 as a fix step or a seed for the next build's frame, and the retake fixtures need no regeneration either way

## Log

*(The build's history, oldest first. `plumbbob checkpoint` appends an entry here
every time a step lands (via `/plumbbob:build` or `/plumbbob:verify`): the dated line,
and beneath it the pause as you approved it, so this fills in as you go, not at the
end, and an older step's detail is a scroll away. Add your own decision/event lines too: this is what
you point at to say "I did that: the LLM helped, but those were my calls."
`/plumbbob:finish` reads this for the report; `plumbbob finish` commits it with the build
folder, so it rides the branch into the PR.)*

- 2026-09-16: at Rob's request, step 1's scaffold (`checkride init --shape monorepo --no-hook`) and a publishable `apps/atis` stub were built by hand ahead of `/plumbbob:build`: `pnpm check --strict` green (8 of 8), `node apps/atis/dist/cli.js --version` prints `0.0.0`, `pnpm publish --dry-run` resolves to `atis@0.0.0` with no dependencies. The `core` `workspace:*` dependency and core's [D20 (workspace-exports)](intent.md#d20) conditions are deliberately left for after Rob publishes the stub ([D53 (pnpm-and-stub)](intent.md#d53)), so the published package never points at an unpublished `core`; step 1 then closes with `/plumbbob:verify`.
- 2026-09-17 — plan committed · 86c530f03

  **Recommendation**: Approve it. The read checked every seam against the real scaffold tree, every artifact shape against checkride's live `.check/`, and fallow's flags against both installed versions; the two holes that touch steps (Q4 at step 9, Q6 at step 22) both have leans and sit eight and twenty-one checkpoints away, so each can be settled at a boundary before it lands. Finding 3 is a scoping note rather than a hole (`expand 3`). Answer Q4, Q5 and Q6 in the approving message if you want them recorded now.

  **1.** The spec's reach source cannot satisfy D5 (Q4 in Open questions; step 9)

  §5.2 and §9.1 name `fallow dead-code --impact-closure` as the reach source. Run on checkride with the fallow 3.22 the scaffold pins, it returns a flat `affected_not_shown[]` list (test files included) plus a `coordination_gap[]` of consumer files and symbols. There is no hop count and no membrane crossing, so the attenuation per membrane that D5 (reach-by-module-hop) asks for cannot be drawn from it, and step 18's glow-by-hop would have nothing to draw. Step 9 therefore walks atis's own scanned graph and step 14 uses fallow's list as the oracle. Closing it takes one word from Rob on Q4; the plan is built on the lean.

  **2.** Steps 22 and 23 wait on inputs only Rob has (Q6 in Open questions; D36)

  The glance test needs five merged PRs with ground truth and two readers besides Rob. checkride has four merged PRs on GitHub, no weft folder exists under `~/Projects`, and ground truth drafted from review comments is a draft until Rob confirms it. Steps 1 to 21 need nothing from Rob and can run unaided; the build stalls at 22 without the list. This is also where D27's invented thresholds first meet evidence: a miss in round one may be a threshold, not a bug, and D38 routes a fail to `/plumbbob:refine` rather than failing the build. Closing it takes the PR list on Q6, any time before step 22.

  **3.** Three of the spec's signals are head-only approximations (D23; steps 10, 11 and 19)

  "Threshold newly breached", "boundary or cycle introduced", `improvements` and the HUD's Health Δ block all need `.check/` at the base as well as at head. This build reads `.check/` at head only, so the first two become "present at head and touching a changed file", labelled in each notice's `why`, and the other two stay muted. The cost: a pre-existing cycle through a changed file reads as LIFR on an innocent PR. D32 now extracts the base tree anyway, so one extra step running `fallow health` and `dead-code` in that extraction would close most of it cheaply; it is left out because neither the spot-check nor the glance test asks for deltas. Rob can pull it in.

  Checked and found sound: step 1's seam against the real scaffold tree (28 files from `checkride init --shape monorepo`, run for real in /tmp), including the 34 markdownlint hits in `docs/` that step 1 now owns; the scaffold's `.gitignore` does not exclude `.plumbbob/`, so the build folder rides the branch; fallow 3.22 (pinned by the scaffold) has `--impact-closure` and the global 2.56 does not (D22); every `.check/` shape named in step 8, read from checkride's live run (health schema 11, dead 9, dupes 9, Stryker 1.0, vitest JSON, istanbul); PR 4's merge `07d95bb` with parents `fee5ed6` and `ae5078c` (D29); `d3-force` seeds through `randomSource` and `bubblesets-js` is pure geometry, so both fit C1 and C3 (D34); the plan commit runs no check gate, so the vacuous-green warning from `start` cannot refuse it, and `.plumbbob/settings.json` already carries `"check": "pnpm check --strict"` for step 1 onward. Sizes: steps 17 to 19 are the largest in the plan; each is one package layer with its own golden file, which is the smallest cut that still reviews as one picture.

- 2026-09-17 — step 1 checkpointed · e5aaa9f66 — chore(repo): scaffold the atis monorepo with checkride init (2m)

  **Summary**: Closes the scaffold: `apps/atis` depends on `core` as a `workspace:*` package, core exports its TypeScript source under a `source` condition beside `dist/` for Node, vitest resolves that condition on the node side so the tests pass with no build at all, `apps/atis` references `libs/core` so `tsc --build` orders the two projects, and core takes ownership of `SCHEMA_VERSION`, which the CLI's help now reports.

  1. Most of the seam is already on main, landed out of band at Rob's direction
  2. planned title → proposed subject: `chore(repo): wire core into atis and close the checkride scaffold`
  3. The `source` condition had to go into Vite's node-side list
  4. core owns `SCHEMA_VERSION` one step early
  5. `apps/atis/tsconfig.json` now references `libs/core`

  **Readout**: Step 1 - chore(repo): scaffold the atis monorepo with checkride init

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    honored:
               - D19 (packages), D20 (workspace-exports)
               - D31 (no-hooks-yet), D42 (committed-files-vs-gate)
               - D53 (pnpm-and-stub)
  constraints  11 of 11 honored
  seam         held: 4 of 23 declared, no strays
  diff         +38 -7 across 8 files
  spent        2 min · 1 turn · 2s gate · green first run
  ```

  **Verdict**: ◐ A hair off (2 commits outside the ledger)

  **Recommendation**: Checkpoint it, with the reconciled subject if you take highlight 2. Every clause of the done-when holds, the remainder is 38 lines across 8 files, and the earlier commits it completes are already on main.

  **1.** Most of the seam is already on main, landed out of band at Rob's direction

  The scaffold, the publishable stub and the docs lint fixes landed in `75b7094`, the plan and its receipt in `86c530f` and `9198a10`, and the scoped rename in `d4d72b7`, all before this tick, because Rob wanted the `0.0.0` stub published before `apps/atis` gained a dependency on the unpublished `core`. The registry then refused the bare name as too similar to `atob`, `ansis` and `axios`, so the package is `@robmclarty/atis` and the command stays `atis`; D53 records it. This diff is the remainder the plan held back, so the seam row will name the earlier files as absent from it.

  **2.** planned title → proposed subject: `chore(repo): wire core into atis and close the checkride scaffold`

  The planned title describes the whole step, but the commit this tick lands carries only the wiring: the dependency, the export conditions, the vitest and tsconfig plumbing and the schema constant. A subject naming that keeps `git log` honest about what each commit did. Unapproved, the planned title lands as is.

  **3.** The `source` condition had to go into Vite's node-side list

  With only `resolve.conditions: ['source']`, vitest still resolved `core` through Node's default conditions and failed on the missing `dist/`, because Vite 6 and later read the server-side list from `ssr.resolve.conditions`. That list now carries `source` ahead of Vite's own server defaults (`module`, `node`, `development|production`). Proven by deleting both `dist/` folders and running the tests: 5 pass in 2 files. Node still takes `default`, so the built CLI runs from `dist/`.

  **4.** core owns `SCHEMA_VERSION` one step early

  A `workspace:*` dependency that nothing imports would trip fallow's unused-dependency rule, and a smoke constant printed in the help would be decoration. The `map.json` contract version is the one constant the sketch already gives to core, so core's index exports `SCHEMA_VERSION = 1` and the CLI's help reports the schema it will write. Step 2 moves the constant into `schema.ts` and re-exports it; nothing else changes.

  **5.** `apps/atis/tsconfig.json` now references `libs/core`

  `tsc --build` needs the dependency edge to build core before atis; the reference supplies it, and the `types` condition resolves to core's `dist/index.d.ts` from that build. No `customConditions` is needed: TypeScript reads `types`, vitest reads `source`, Node reads `default`, each from the same three-condition export.

- 2026-09-17 — step 2 checkpointed · d26089e7f — feat(core): define the map.json schema types and assertMap (17m)

  **Summary**: `libs/core/src/schema.ts` now carries the full `map.json` type sketch (terrain, weather, notices, with `layout` optional) plus `SCHEMA_VERSION` and a cast-free `assertMap` that narrows an unknown value into `MapJson`, throwing a path-naming error on each of the seven invariants the done-when lists.

  1. assertMap narrows without ever casting to MapJson
  2. the seven checks, each with its own path
  3. nine tests: two valid shapes, seven rejections

  **Readout**: Step 2 - feat(core): define the map.json schema types and assertMap

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    1 of 1 honored
  constraints  11 of 11 honored
  seam         held: 3 of 3 declared, no strays
  diff         +522 -2 across 3 files
  spent        17 min · 1 turn · 3s gate · green first run
  ```

  **Verdict**: ● Plumb

  **Recommendation**: Land it as planned. The done-when's seven checks are each independently tested, `pnpm check` is green end to end, and the seam stayed to the three declared files.

  **1.** assertMap narrows without ever casting to MapJson

  oxlint's type-aware `no-unsafe-type-assertion` rejects `value as MapJson` outright, so
  `assertMap` is built as a TypeScript assertion function (`asserts value is MapJson`)
  backed by three tiny generic guards (`expectRecord`, `expectArray`, `expectString`).
  Each guard is a single `if`-throw, reused at every field instead of one inline check
  per field, which keeps the branch count (and the untested "malformed input" branches)
  small enough for the global 70% branch-coverage gate.

  **2.** the seven checks, each with its own path

  Wrong `schema_version`, more than six notices, a tier over its 1/2/3 budget, a
  `weather.reach[].cell` naming an unknown cell, a `layout.positions` key naming neither
  a known organelle nor a group file, a `changed` entry with both or neither of
  `cell`/`group`, and a `changed.group` naming an unknown group (D48) — each throws
  `Error` with the offending path in its message (e.g. `weather.changed[0].group`).

  **3.** nine tests: two valid shapes, seven rejections

  `schema.test.ts` builds a minimal valid map and a layout-bearing variant, then exercises
  each of the seven rejections once via small fixture builders (`notice`, `changedEntry`,
  `groupChangedEntry`, `layoutFixture`).

- 2026-09-17 — step 3 checkpointed · f86c31bd4 — feat(core): identify cells, organelles and shore groups from a file list (18m)

  **Summary**: Core can now sort any file list three ways: `identifyModules` puts every TypeScript file that isn't a test into a cell, `identifyGroups` puts every other non-test file into one shore group, and test files go to neither. Together they cover every repo shape in the plan (flat `src/`, folder modules, `apps/*` with `libs/*`, `packages/*`, barrel-less directories, and fascicle's library root with example members), and 38 new tests pin those shapes.

  1. Cell ids carry their kind, so no two cells and no cell and group can share a key
  2. A root src/ that no member claims makes the root a package too
  3. D48 bent: prompts is tried before docs, or AGENTS.md could never be a prompt
  4. Shore patterns match at any depth unless they start with a slash
  5. identifyGroups takes an optional third argument, the workspace roots

  **Readout**: Step 3 - feat(core): identify cells, organelles and shore groups from a file list

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    bent: D48 (shore-groups), prompts is tried before docs
  constraints  11 of 11 honored
  seam         held: 6 of 6 declared, no strays
  diff         +826 -0 across 6 files
  spent        18 min · 1 turn · 2s gate · green first run
  ```

  **Verdict**: ○ Out of plumb (decisions bent)

  **Recommendation**: Land it as planned, and approve the prompts-before-docs reorder with it. Every clause of the done-when is tested, the gate passed on the first run, and the reorder is the only way the files D48 names as prompts can end up in prompts.

  **1.** Cell ids carry their kind, so no two cells and no cell and group can share a key

  A cell's id is `<kind>:<path>`, for example `package:libs/core`, `folder:libs/core/src/layout`, `single:src/doctor.ts` or `directory:.`. Plain paths would collide twice. First, a package and the directory holding its loose files are both `libs/core`. D45 keeps the barrel as the package's only direct organelle, so a file like `packages/core/vite.config.ts` needs a directory cell of its own. Second, a workspace member called `docs` (a docs site) would share `docs` with the shore group, and `layout.contours` is keyed by cell or group in one record. The `path` field stays the plain path for labels. The cells carry no `band`, `reachable` or history yet: `identifyModules` returns a `ModuleCell` without those fields rather than filling them with made-up values (C2 (never-fake)), and step 12 merges them in. For a package, `body_loc` sums every file under the package outline, not just its barrel, because the package is the body that its barrel's exports sit on top of.

  **2.** A root src/ that no member claims makes the root a package too

  D43 says workspace members become packages, and the repo root is a package only when there is no workspace. fascicle breaks that rule: its library is the root `src/`, and only `examples/*` are members. Without a root package, `src/index.ts` would be a barrel for nothing. So when a root `src/` file belongs to no member, the root becomes `package:.` alongside the members. This repo doesn't have that shape, so `vitest.config.ts` gets a top-level `directory:.` cell with no parent. A member with no TypeScript files (a docs site) gets no cell, since an empty outline has nothing to draw. Folder modules are one level deep, as checkride's convention defines them: everything under `src/pm/` belongs to `folder:src/pm`. A folder under `src/` with no barrel, and any directory outside `src/`, becomes a cell for its own files only, with no nesting. Its interface is the files imported from outside that cell, and imports from tests don't count (D4 (tests-not-terrain)).

  **3.** D48 bent: prompts is tried before docs, or AGENTS.md could never be a prompt

  The rule table is first-match, and D48 lists `docs` (`*.md`) ahead of `prompts` (`AGENTS.md`, `CLAUDE.md`). In that literal order the two named files, and every `SKILL.md`, land in `docs` and the prompts entries never match anything. `config.ts` moves `prompts` up by one place and says why in a comment, and a test pins it. The order matters again at step 15, which lays out the shore "in the table order of D48", so prompts will come first there. D48's descriptive entries are now actual patterns: lockfiles (`pnpm-lock.yaml`, `package-lock.json`, `npm-shrinkwrap.json`, `yarn.lock`, `bun.lock`, `bun.lockb`), images (`png jpg jpeg gif webp avif ico`) and fonts (`woff woff2 ttf otf`). `compose*.yml` sits beside `compose*.yaml`. Nothing else was added: `.gitkeep`, `LICENSE.txt` and snapshots go to `other`, which should be noisy so the table gets extended (parked).

  **4.** Shore patterns match at any depth unless they start with a slash

  Read as root-only (gitignore's rule for `docs/**`), `fixtures/**` would miss `apps/atis/fixtures/` and `libs/core/fixtures/`, which steps 6, 8 and 12 commit. It would also miss fascicle's `src/viewer/__tests__/fixtures/*.jsonl`, so all of them would go to `other`. The patterns therefore match at any depth: `*.md` tests the file name, and `docs/**` matches any folder named `docs`. A leading `/` pins a pattern to the repo root, for anyone who wants that in `atis.config.json`. The small glob engine handles `*`, `?`, `**` and `**/`, escapes everything else (tested with `(x)+.txt`), and keeps each group's files sorted.

  **5.** identifyGroups takes an optional third argument, the workspace roots

  D48 says the `examples` group only takes `examples/**` and `templates/**` files "not claimed by a workspace member", and a function with only `(files, rules)` can't tell which files those are. The examples rule sets `outside_members: true`, and `identifyGroups(files, rules, roots)` skips that rule for files inside a member. The repo root never counts as a member for this. As a result, fascicle's `examples/pr-improve/fixtures/pr-sample.patch` falls through to `data`. The planned two-argument call still works. Both functions accept the whole tracked-file list and use one shared `classifyFile` (`source | test | other`) to split it, so every file ends up in exactly one of cells, tests or groups. Step 5 can reuse that function for its `kind` field instead of writing a second test-file rule.

- 2026-09-17 — step 24 checkpointed · cfa977b32 — fix(core): send hook folders to the scripts shore group (3m)

  **Summary**: A shore rule can now list `except` patterns. The default `prompts` rule excepts `hooks/**`, and `scripts` now includes `hooks/**`, so hook files inside `.claude/` or a skill count as scripts. A test checks each hook location the done-when names.

  1. A rule can now skip some of the paths it matches
  2. D48's default table changes again, at Rob's direction
  3. Across every local repo, only files in hooks/ folders change groups
  4. The test now covers plugin hooks/ folders too

  **Readout**: Step 24 - fix(core): send hook folders to the scripts shore group

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    bent: D48 (shore-groups), hooks/ leave prompts for scripts
  constraints  11 of 11 honored
  seam         held: 3 of 3 declared, no strays
  diff         +29 -7 across 3 files
  spent        3 min · 1 turn · 3s gate · green first run
  ```

  **Verdict**: ○ Out of plumb (decisions bent)

  **Recommendation**: Land it. Every part of the done-when is now tested, and in the cross-repo check the only files that changed groups were in `hooks/` folders.

  **1.** A rule can now skip some of the paths it matches

  `GroupRule` has a new optional `except` list, compiled with the same glob engine as `patterns`. A rule only takes a file when a pattern matches and no `except` pattern does, so a later rule can pick the file up. `prompts` sets `except: ['hooks/**']`, and `scripts` adds `hooks/**` to its patterns. The order of the groups doesn't change. I didn't use the other way to do this, a second `scripts` rule placed before `prompts`, because it would have moved `scripts` to the top of the group order and made one group span two rules.

  **2.** D48's default table changes again, at Rob's direction

  D48 puts everything under `.claude/**` and `skills/**` in `prompts`. Rob asked for the hook scripts in those folders to be scripts instead, so the default table departs from D48's list a second time (the first was trying `prompts` before `docs` in step 3). A Markdown file in a hooks folder still ends up in `docs`, because the `docs` rule's `*.md` comes before `scripts`. `.claude/settings.json` stays in `prompts`.

  **3.** Across every local repo, only files in hooks/ folders change groups

  I sorted every tracked file in every repo under `~/Projects/*/code/` with the old and new rules, and 17 of 25,449 non-source, non-test files changed groups. Seven moved from `prompts` to `scripts`: checkride's three `examples/agent-loop/.claude/hooks/` files, the `.claude/hooks/checkride-gate.sh` in plumbbob and shinbun, and the `skills/*/hooks/session-capture.mjs` in lodestar and rob-ot. Ten moved from `other` to `scripts`: plugin `hooks/` folders in agent-tools, plumbbob and trellis (`hooks.json` files and trellis's Python hooks), plus trellis-exec's `hooks/.gitkeep`. No other file moved. Moving whole groups up the list, the alternative I rejected, would also have moved `CLAUDE.md` test fixtures, fascicle's `.vale` example docs and several `rules/README.md` files.

  **4.** The test now covers plugin hooks/ folders too

  At the first pause, the new test covered `.claude/hooks/` and `skills/*/hooks/` but no plugin `hooks/` folder, which the done-when also names. At Rob's direction it now also checks `plugins/ast-grep-rules/hooks/hooks.json` goes to `scripts`, beside the `.sh`, `.cjs` and `.mjs` hooks, the Markdown file that stays in `docs` and the `.claude/settings.json` that stays in `prompts`. The gate is still green.

- 2026-09-17 — step 4 checkpointed · b01fac5d6 — feat(core): compute topological depth bands over the import graph (4m)

  **Summary**: `computeDepth(edges, entryPoints, files?)` groups each import cycle into one node (Tarjan's algorithm), gives every file the length of the longest import path from any entry point, and sorts those depths into at most seven bands. Files that no entry point reaches go in the deepest band with `reachable: false` and no `depth` field. Thirteen tests cover the five cases the done-when names, plus a few edge cases.

  1. computeDepth takes an optional third argument, the full list of terrain files
  2. An entry point that another entry point imports sits below it
  3. Deep graphs are cut into seven equal-width bands, so the last band can be thinner
  4. With no entry points, every file is unreachable and sits in a single band 0
  5. Tarjan runs on an explicit stack, and output order doesn't depend on input order

  **Readout**: Step 4 - feat(core): compute topological depth bands over the import graph

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    3 of 3 honored
  constraints  11 of 11 honored
  seam         held: 3 of 3 declared, no strays
  diff         +334 -0 across 3 files
  spent        4 min · 1 turn · 3s gate · green first run
  ```

  **Verdict**: ● Plumb

  **Recommendation**: Land it. Every case the done-when names is tested, and the gate is green. Highlights 2 and 4 are the two choices worth a second look before step 12 starts using this.

  **1.** computeDepth takes an optional third argument, the full list of terrain files

  A file with no imports in or out (dead code, usually) appears in no edge, so with only `(edges, entryPoints)` the function would never see it, and D26 couldn't put it in the deepest band. The optional `files` list fixes that. Step 3 set the precedent when `identifyGroups` got an optional third argument, and the planned two-argument call still works. Step 12 should pass the base file paths here. Tests and non-TypeScript paths are dropped wherever they appear, whether in `files`, in edges or in entry points, using the same `classifyFile` as step 3. So a test file is never an entry point and never gets a depth (D4 (tests-not-terrain)).

  **2.** An entry point that another entry point imports sits below it

  I took "longest path from any entry point" literally: an entry point starts at depth 0 only when nothing above it imports it. If `apps/atis/src/cli.ts` imports `libs/core/src/index.ts` and both are entry points (D43 counts every member's `exports`), core's barrel ends up at depth 1, below the app. The other option, putting every entry point at depth 0, would place every library barrel at the top next to the apps. That flattens depth, the same problem D4 avoids by keeping tests out. One test pins this: `cli > index > doctor` gives depths 0, 1 and 2.

  **3.** Deep graphs are cut into seven equal-width bands, so the last band can be thinner

  When the maximum depth is 6 or less, each file's band equals its depth. Past that, `band = floor(depth × 7 / (max + 1))`, which splits the depths `0..max` into seven equal slices. Every band then holds at least one depth, bands never decrease as depth grows, and the deepest file always lands in band 6. Integer inputs make the floor exact. With the done-when's depth-12 chain, bands 0 to 5 hold two depths each and band 6 holds only depth 12. Each `bands[]` entry records its `depth_min` and `depth_max`, and a test pins all seven.

  **4.** With no entry points, every file is unreachable and sits in a single band 0

  If a reviewed repo yields no entry points (no fallow, no manifest targets), nothing is reachable, so the deepest band is band 0. `bands` then contains one entry, `{ index: 0, depth_min: 0, depth_max: 0 }`, so these files have a band to be drawn in. That depth range is nominal, because no reachable file actually has depth 0. With no files at all, `bands` is empty. This is the one place where C2 (never-fake) comes close to bending. I chose it over an empty `bands` list, because an empty list would leave files pointing at a band that doesn't exist.

  **5.** Tarjan runs on an explicit stack, and output order doesn't depend on input order

  A recursive Tarjan overflows the call stack on an import chain around 10k files deep, so this one keeps its own stack of frames. A test runs a 20,000-file chain to prove it. Nodes and each file's import list are sorted by path and duplicates removed. Self-imports are dropped. The longest-path pass walks the grouped graph in topological order, which is Tarjan's output reversed. A test shows that reversed input, duplicate edges and a self-import give the same result (C3 (deterministic)).

- 2026-09-17 — step 5 checkpointed · 637b56021 — feat(cli): scan TypeScript imports into files, exports and edges (1 drift, 12m)

  **Summary**: `scanImports(dir)` reads one extracted commit into `{ files, edges, members }`: every file of the tree is listed with its kind, the `.ts` and `.tsx` ones are parsed with the TypeScript compiler API for their exports and for every static import, `export … from` and `import()` specifier, and each specifier is resolved under NodeNext, so `./foo.js` lands on `foo.ts` and a workspace package resolves by name through `pnpm-workspace.yaml` and its own manifest. Eight tests cover it, six against a fixture tree written into a `mkdtemp` directory from strings and two against the two pure parsers. Beyond the tests I ran it over this repo, checkride and fascicle: 41 edges here, 1409 at checkride, and fascicle's seven `examples/*` members all found behind the comment lines in its workspace file.

  1. Resolution can only see the files the extraction holds
  2. A barrel's `export * from` names are expanded to a fixed point
  3. A manifest's entry point resolves to the source a built target came from
  4. `scanImports` takes an optional second argument for fallow's sake
  5. `pnpm-lock.yaml` is the one file outside the seam

  **Readout**: Step 5 - feat(cli): scan TypeScript imports into files, exports and edges

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    honored
               - D21 (import-graph), D32 (terrain-from-base), D43 (scan-roots)
               - D20 (workspace-exports), D22 (local-fallow), D30 (pure-parsers)
               - D42 (committed-files-vs-gate), D4 (tests-not-terrain)
  constraints  11 of 11 honored
  seam         strayed: 1 path outside the seam
               → pnpm-lock.yaml
  diff         +844 -1 across 5 files
  spent        12 min · 1 turn · 3s gate · green first run
  ```

  **Verdict**: ◐ A hair off (seam strayed)

  **Recommendation**: Land it. The done-when's file, member and edge lists are pinned by the fixture tree and the gate is green; highlights 2, 3 and 4 are the three places I went past the plan's literal words, and they are the ones to look at before step 12 leans on this.

  **1.** Resolution can only see the files the extraction holds

  The compiler is handed a module resolution host backed by the walk's own file list rather than by the filesystem, so a specifier that leaves the extraction, or dives into a `node_modules` an archive never had, resolves to nothing at all: "never through `node_modules`" is a property of the host, not a filter after the fact. The host also has no `realpath`, so resolution never escapes through a symlink, which is what keeps a `mkdtemp` directory under macOS's `/var` symlink from resolving into `/private/var` and falling outside the scan. `.git` and `node_modules` are skipped in the walk itself, for the live tree the CLI will point at before step 13 extracts archives.

  Every tracked file is listed, not only the parsed ones, because the shore groups of [D48 (shore-groups)](#d48) are built from the same list. A file the scan does not parse carries `loc: 0` and no exports: `loc` counts the non-blank lines the scan read, and a PNG has none. That is the one number here that a reader could mistake for a measurement, so it is documented on the type.

  **2.** A barrel's `export * from` names are expanded to a fixed point

  The done-when asks only for an `exports[]` per file, and taken literally a barrel that re-exports with `export *` would carry zero names, which would give `interface_size` (step 3) a zero for the widest interface in the repo and hide every deleted export behind a barrel from step 11's candidate. So a star re-export whose target is inside the scan contributes that target's names, transitively, taken to a fixed point so a cycle of barrels settles instead of recursing. On this repo `libs/core/src/index.ts` now reports its 53 re-exported names instead of nothing. A star through a specifier that does not resolve (an npm package) adds nothing, because those names are not knowable from this scan ([C2 (never-fake)](#c2)). Dropping the expansion is a five-line change if you would rather keep the scan literal.

  **3.** A manifest's entry point resolves to the source a built target came from

  `bin` and the `default` condition point at `./dist/cli.js`, and the done-when drops non-TypeScript paths, so read literally a published package contributes no entry points at all and depth collapses to "nothing is reachable" on any repo without a local fallow. A `dist/…js` or `.d.ts` target is therefore also tried as `src/….ts`, and the recovered source is preferred over the target as written, so a repo that commits its `dist/` does not enter itself through generated code. Here that turns `bin: ./dist/cli.js` into `apps/atis/src/cli.ts` and the three conditions of the `.` export into one `src/index.ts`.

  **4.** `scanImports` takes an optional second argument for fallow's sake

  Entry points are the union of the reviewed repo's fallow list and the manifest targets, but an extracted commit has no `node_modules` to hold a fallow, so the binary cannot be looked for where the scan is reading. `scanImports(dir, { repo })` names the working tree it lives in, defaulting to `dir`, and the call in the done-when still works as written. The run is guarded on `node_modules/.bin/fallow` existing before `pnpm exec` is spawned, so the machine's stale global 2.56 can never answer ([D22 (local-fallow)](#d22)); a missing or failing fallow just means the entry points come from the manifests alone. Parsing its output is a pure function tested from a string, per [D30 (pure-parsers)](#d30), and it collapses the `./` segments fallow leaves in workspace paths (`libs/core/./src/index.ts`).

  **5.** `pnpm-lock.yaml` is the one file outside the seam

  `typescript` is now a dependency of `apps/atis` rather than only a root dev tool, which [C9 (deps-earn-their-place)](#c9) asks for by name, and `pnpm install` recorded that in the lockfile. Three lines, no version change, and the gate is green with it.

- 2026-09-17 — step 6 checkpointed · 9d919bd62 — feat(cli): read the git diff into change kinds, sizes and head-side hunks (1 drift, 9m)

  **Summary**: `readDiff` and `readManifests` land in `apps/atis/src/sources/git.ts`: thin git-shelling runners over pure parsers, tested from captured diff text and inline manifest strings, plus one integration test against this repo's own history.

  1. readDiff composes three git commands into sorted changed[]
  2. readManifests derives workspace membership from git itself, not the working tree
  3. diffManifests is the pure delta: new name in a manifest's dependency map, never a bumped range

  **Readout**: Step 6 - feat(cli): read the git diff into change kinds, sizes and head-side hunks

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    5 of 5 honored
  constraints  11 of 11 honored
  seam         strayed: 1 path outside the seam
               → apps/atis/src/sources/imports.ts
  diff         +382 -1 across 7 files
  spent        9 min · 1 turn · 2s gate · green first run
  ```

  **Verdict**: ◐ A hair off (seam strayed)

  **Recommendation**: Land it as planned. `pnpm check` is green, all four new tests (fixture-driven `parseDiff`, two `diffManifests` cases, and the `HEAD~1` integration test against this repo) pass, and the diff stayed inside the declared seam plus one minimal export in `imports.ts`.

  **1.** readDiff composes three git commands into sorted changed[]

  `readDiff(repo, base)` resolves `merge_base(base, HEAD)` (D25), then runs `--name-status -M`, `--numstat -M` and `-U0 -M` between it and `HEAD` and hands their raw text to the pure `parseDiff`. The trickiest bit was `--numstat`'s compact rename notation (`src/{old.ts => new.ts}`, or a bare `old => new` when the paths share no prefix) — `headPathOf` expands it without regex, matched against `--name-status`'s unambiguous tab-separated rename rows, which already carry `from` directly. A binary file's numstat counts (`-\t-`) are left unset rather than parsed as `0`, and only collapse to `0` at the very end since `DiffChange.added`/`deleted` are non-optional numbers in the shape the plan specifies.

  **2.** readManifests derives workspace membership from git itself, not the working tree

  `readManifests(repo, mergeBase)` reads `pnpm-workspace.yaml` and the full tracked-file list at each commit via `git ls-tree`, applies the same glob-matching `scanImports` uses (D43), and reads each matched member's `package.json` at both ends with `git show <sha>:<path>` — never the working tree (D46). A manifest that exists at only one end (a package born or removed) is treated as an empty manifest on the missing side, so a born package's initial deps all read as "added" and a removed package contributes nothing, rather than a thrown error or a faked default (C2). I exported `globToRegExp` from `imports.ts` (one keyword) so this glob-matching logic has one tested home instead of two.

  **3.** diffManifests is the pure delta: new name in a manifest's dependency map, never a bumped range

  `diffManifests(manifest, before, after)` compares `dependencies`/`devDependencies` by key presence only: a name absent from `before`'s same-kind map that appears in `after` is `deps_added`; a version bump on an existing name is not (D47). Malformed JSON on either side is read as no dependencies, matching the "a manifest that will not parse names no package" precedent already in `imports.ts`.

- 2026-09-18 — step 7 checkpointed · 60013a166 — feat(history): mine git log into churn, age, bug-fix rate and co-change (1 drift, 85m)

  **Summary**: `readLog`/`parseLog` in `apps/atis/src/sources/git.ts` turn `git log --numstat --no-merges` into `commits[]`, and `computeHistory` in the new `libs/core/src/history.ts` turns those commits into per-changed-file churn ratio, age and bug-fix rate plus directional co-change pairs.

  1. A thin runner, a pure parser, no author field anywhere
  2. computeHistory scopes both the per-file stats and the co-change pairs to `changed`
  3. Wall time recorded, not yet capped

  **Readout**: Step 7 - feat(history): mine git log into churn, age, bug-fix rate and co-change

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    3 of 3 honored
  seam         strayed: 1 path outside the seam
               → apps/atis/fixtures/log/log.txt
  diff         +267 -4 across 6 files
  spent        85 min · 1 turn · 3s gate · green first run
  ```

  **Verdict**: ◐ A hair off (seam strayed)

  **Recommendation**: Land it. The gate is green, the CHID co-change test matches the plan's numbers exactly, and the only judgment call — omitting a stats field rather than faking a zero when the window has no data for a path — follows C2 the same way `readDiff`'s numstat parsing already does.

  **1.** A thin runner, a pure parser, no author field anywhere

  `readLog(repo, head)` shells out to `git log --numstat --no-merges --format=%H%x00%ct%x00%s -n 5000 <head>`; `parseLog` is the pure text-to-struct half (D30), tested against a hand-built fixture (`apps/atis/fixtures/log/log.txt`, real NUL bytes) covering multiple files per commit and a binary `-`/`-` marker. Neither function reads or emits an author or email field (C6), and the integration test asserts that on every commit from this repo's real log.

  **2.** computeHistory scopes both the per-file stats and the co-change pairs to `changed`

  `(commits, loc, changed, headTime)` returns, per changed file: `churn_ratio` (window's added+deleted over the `loc` map's current count, omitted when that count is unknown or zero), `age_days` (floor days since the file's first commit in the window) and `bugfix_rate` (share of its commits whose subject matches `/\b(fix|bug|regression|hotfix)\b/i`); a changed file with zero commits in the window carries only its `path`, nothing faked (C2). Co-change is directional per CHID eq. 3: for a changed file `a`, every `b` it ever shared a commit with gets `{ a, b, rate: support / occurrences(a), support }` — the scripted-commit test asserts the specified 3-of-4 case exactly (rate 0.75, support 3).

  **3.** Wall time recorded, not yet capped

  Per D50, this step only measures: the integration test times `readLog(repo, 'HEAD')` on this repo and logs it (12 commits, ~74ms here) rather than asserting a threshold. No `--history <n>` cap and no `--verbose` per-source timings are added — D50 defers both until a slow repo actually shows up, and `--verbose` is step 13's CLI-wiring concern, outside this step's seam.

- 2026-09-18 — step 8 checkpointed · ee0b2ccbf — feat(cli): read checkride's .check artifacts into evidence inputs (18m)

  **Summary**: `readCheck(repo)` trusts `.check/` only through a schema-1 `summary.json`, gates every raw file by a fixed slot-to-file table rather than `output_file`, mutes a stale or missing channel instead of faking it, and records fallow's own schema numbers without rejecting them; a trimmed copy of checkride's real `.check/` and three synthetic edge cases back it.

  1. Seven readers, one gate, one runner
  2. The fixture is checkride's own unlisted-mutation case
  3. A judgment call: `readCheckDir` alongside `readCheck`

  **Readout**: Step 8 - feat(cli): read checkride's .check artifacts into evidence inputs

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    3 of 3 honored
  seam         held: 5 of 5 declared, no strays
  diff         +1101 -0 across 12 files
  spent        18 min · 1 turn · 3s gate · green first run
  ```

  **Verdict**: ● Plumb

  **Recommendation**: Land it. `pnpm check --strict` is green, all 24 new tests pass, coverage on `check.ts` is 100% lines / 89% statements / 75% branches, and the done-when's three named edge cases (stale-mutation, unlisted-slot, summary-less) each have a dedicated test alongside the fixture-backed integration coverage.

  **1.** Seven readers, one gate, one runner

  `check.ts` splits into pure parsers (`parseSummary`, `parseHealth`, `parseDead`,
  `parseDupes`, `parseCoverage`, `parseMutation`, `parseTest`, `parseSecurity`) and a thin
  runner (`readCheckDir`/`readCheck`) that resolves `summary.json` first — `git-only` with a
  `reason` when it's absent, empty, missing or the wrong `schema_version`, `harness_broken`
  when `schema_version: 1` lies about the rest of the shape — then reads each raw file only
  when its slot ran and wasn't skipped, comparing mtime against the run window
  `[timestamp − total_duration_ms, ∞)` and muting a stale channel into `stale[]` with its
  age recorded.

  **2.** The fixture is checkride's own unlisted-mutation case

  `apps/atis/fixtures/check/` is a trimmed copy of checkride's real `.check/`: the same
  summary that lists 18 slots, none named `mutation`, beside a `mutation.json` still on
  disk — exactly the case D41 cites for why the slot table gates by `checks[]`, never by a
  file's mere presence. `dead.json`, `dupes.json` and `security.json` are the real (clean)
  files; `health.json`, `test.json`, `mutation.json` and `coverage-final.json` are hand-
  trimmed to a handful of entries, one health finding kept so `exceeded` has something to
  assert on.

  **3.** A judgment call: `readCheckDir` alongside `readCheck`

  `.check/` is globally gitignored (any directory with that literal name, anywhere), so a
  committed fixture cannot itself be named `.check/` without disappearing from git even
  with the `coverage/` negation. I split the runner into `readCheckDir(dir)` (the real
  logic) and `readCheck(repo) = readCheckDir(join(repo, '.check'))` (the documented entry
  point), so the fixture test reads the flat `fixtures/check/` directory directly while
  `readCheck` still behaves exactly as the done-when specifies. The synthetic stale/
  skipped/unlisted-slot cases build real `.check/` folders under `mkdtemp`, never committed,
  so they exercise `readCheck` itself.

- 2026-09-18 — step 9 checkpointed · 39d94db86 — feat(core): compute the changed set and reach by module hop (6m)

  **Summary**: `computeReach` now turns the diff and the two import graphs into the whole weather layer this step owns: every changed file placed on its cell or in one shore group, every file the change reaches carrying its minimum hop count and the interfaces it crossed to get there, and every cross-cell import this change introduced. Hops price membranes rather than files, so a change whose exports never leave its cell reaches no other cell at all and the deep-module payoff falls straight out of the walk instead of being special-cased. Nine tests cover the six cases the plan named plus three edges I judged sharp enough to pin.

  1. Reach walks two graphs and charges one hop per membrane, never per file
  2. `via` records the file the edge actually took, not the barrel it went around
  3. Changed test files needed a home in `changed[]`, and got the group `tests`
  4. The walk cannot be reordered into a different map
  5. Nine tests, the six the plan named plus three edges

  **Readout**: Step 9 - feat(core): compute the changed set and reach by module hop

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    honored: 5
               - D5 (reach-by-module-hop), D45 (nested-cells): hops price membranes, not files
               - D39 (two-graphs): head edges for live files, base edges for deleted ones
               - D48 (shore-groups), D4 (tests-not-terrain): every changed file placed once
  constraints  11 of 11 honored
  seam         held: 3 of 3 declared, no strays
  diff         +496 -0 across 3 files
  spent        6 min · 1 turn · 3s gate · green first run
  ```

  **Verdict**: ● Plumb

  **Recommendation**: Approve it, and say yes or no to the `tests` group while it is cheap. The done-when is met clause by clause and `pnpm check --strict` is green on all eight slots, so the two things worth your eye are both judgment rather than defect: the `via` reading in highlight 2, which is one line and one test to flip, and the `tests` group in highlight 3, which step 12 has to honour three steps from now.

  **1.** Reach walks two graphs and charges one hop per membrane, never per file

  The walk is over reverse edges: from each changed file out to whoever imports it. A step that stays inside one innermost cell is free, and a step into another costs one hop and appends the interface file it landed on, so `via` is the list of interfaces a reviewer has to read to follow the change out. Added, modified and renamed files walk the head graph; a deleted file walks the base graph, where the consumers it breaks still import it (D39), and the test pins both directions on one file: deleted it reaches two consumers, modified it reaches nothing, because the head graph lost that import along with the file.

  Nesting is handled by asking only which *innermost* cell each end sits in, which is what makes a package contour cost nothing of its own (D45). The package test walks an edge that leaves the `libs/core` contour and enters the `apps/atis` one on its way into `cli.ts`, and it still costs the single hop that leaving a folder module costs.

  **2.** `via` records the file the edge actually took, not the barrel it went around

  This is the one place I read D45's parenthetical as descriptive rather than as an override, so it is the line to overturn if you disagree. D45 says `via` records "the file the edge lands on in the target cell, the barrel when there is one and otherwise the imported file itself". Where an import enters a cell through its barrel, the file landed on *is* the barrel and both readings agree, which is every case the done-when names: all six planned tests passed unchanged when I switched from one reading to the other.

  They differ only when an import reaches past a barrel and takes a file inside the cell directly. Recording the barrel there would name a file that had nothing to do with the crossing, while §5.2 says the crossing is "the public interface through which the change escapes, which is exactly where a reviewer should read", and your own rider on D45 is that nothing may depend on a barrel existing. So the crossing records the file that was imported, which is on that cell's interface by definition. A test pins it, and it is a one-line change plus that test to flip.

  **3.** Changed test files needed a home in `changed[]`, and got the group `tests`

  D4 keeps tests off the terrain and step 3 keeps them out of the shore table too, but D48 gives every `changed[]` entry exactly one cell or group and `assertMap` rejects an entry with neither, while step 14's first row wants the changed set to equal `git diff --name-status`, tests included. Those three cannot all hold, so a changed test file now carries the group id `tests`: grouped by what it is, the way D48 groups every other leftover, rather than dumped into `other`, which stays the loud residual. Nothing about the drawing changes; tests are still stitches on the organelles they import.

  This is parked, because the other half lands outside this seam: step 12 has to list a `tests` group in `terrain.groups` or `assertMap` will reject every PR that touches a test. Worth one word from you now, since step 12 is three steps out.

  **4.** The walk cannot be reordered into a different map

  Reach is a shortest-path problem where the label is `(hops, via)`, and two paths of equal length would otherwise leave `via` to whatever order the queue happened to take. The label carries a total order, fewest hops first and then the lexicographically smaller `via`, and relaxation runs to a fixpoint rather than settling each file once, so the result is the minimum under that order no matter what order the queue ran in (C3). The diamond test pins it: a file reachable both directly and through a longer arm reports the short one.

  **5.** Nine tests, the six the plan named plus three edges

  The planned six are the three-cell chain at hops 0/1/2 with `via`, the contained change, the deleted file reached through base edges, the new cross-cell import against an edited old one, the barrel-less directory cell, and the package cell that costs no hop of its own. The three I added are the diamond above, the barrel-bypassing import from highlight 2, and one placement test covering cells, barrels, all four shore groups a real PR hits, the `tests` group and the residual. Each builds its fixture through the real `identifyModules` and `identifyGroups` rather than a hand-written cell list, so the cell ids and barrels in the assertions are the ones step 12 will actually see.

- 2026-09-18 — step 10 checkpointed · 330effb3b — feat(core): compute evidence and the flight category (1 drift, 17m)

  **Summary**: `libs/core/src/evidence.ts` now turns a change and a `.check/` run into the two things the map opens with: the evidence on each changed file (which of its changed executable lines the tests covered, which mutants are still alive on them, which test files stitch it to a result) and the flight category, §5.3's ladder walked worst-first with D27's numbers. Eighteen tests pin it, one fixture per category plus NOINST, and the `.check/` input contract moved into core so the reader in `apps/atis` conforms to one declaration instead of a second copy.

  1. Evidence reads the head-side hunks, and a channel the run did not produce is simply absent
  2. The category is a ladder, and its one number is now config
  3. A red slot's scope comes from fallow's real shapes, not its documented ones
  4. The `.check/` contract moved into core, which put one file outside the seam
  5. Three parks, and one of them is a real hole in D27

  **Readout**: Step 10 - feat(core): compute evidence and the flight category

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    honored
               - D27 (category-defaults): the one number, `high_reach_cells: 3`, in config.ts
               - D41 (artifact-trust): `harness_broken` is LIFR, an absent `.check/` is NOINST
               - D39 (two-graphs): stitches walk base edges for a deleted file, head for the rest
  constraints  11 of 11 honored
  seam         strayed: 1 path outside the seam
               → apps/atis/src/sources/check.ts
  diff         +889 -70 across 5 files
  spent        17 min · 1 turn · 3s gate · green first run
  ```

  **Verdict**: ◐ A hair off (seam strayed)

  **Recommendation**: Approve and checkpoint. `pnpm check` is green on all eight slots, the done-when is met clause by clause, and the one thing worth your judgement is park 1: whether D27's gap rule should grow an unmeasured state before step 11 builds notices on top of it.

  **1.** Evidence reads the head-side hunks, and a channel the run did not produce is simply absent

  `computeEvidence` joins each changed file's hunks to three instruments independently. Patch coverage takes the statements whose start line falls in a hunk and folds them onto lines the way istanbul's own `getLineCoverage` does, taking the highest hit count of the statements starting on a line, so a line two statements share is covered when either ran and `changed_executable` counts lines rather than statements, which is what step 18 draws the closed fraction of the membrane from. Mutation is joined to the hunk lines rather than to the covered ones, so survived and no-coverage mutants still report when coverage is missing: they are separate instruments and C2 says a missing one mutes itself rather than poisoning its neighbour. Stitches come from the import graph and take their status from `test.json`; a test the report never names is `unknown` rather than a pass.

  Each of the three keys on `weather.evidence` is present only when its channel is, so a git-only map carries `{}` there and says nothing about coverage rather than saying zero. A test asserts exactly that with `Object.keys`.

  **2.** The category is a ladder, and its one number is now config

  `computeCategory` checks, in order: a summary that ran no check at all (vacuous green, LIFR), a cycle or boundary violation naming a changed file (LIFR), any red slot (IFR), a gap on a file whose reach touches three or more cells (IFR), any gap or escaped interface (MVFR), else VFR. No `.check/` is NOINST and is never green; a `summary.json` that claimed schema 1 and then failed its shape comes back from step 8 as `git-only` with the reason `harness_broken`, and that one reason is LIFR rather than NOINST, which is the line D41 draws between a broken harness and an absent one.

  D27's only number, *high reach* at three cells, is `config.category.high_reach_cells` in `config.ts`, so step 11 can echo it beside the notice it produced. *Gap* and *escaped interface* are shapes rather than numbers and needed none. An escaped interface is measured the way D45 measures a hop, by innermost cell, and a test importer is evidence rather than a consumer, so it does not count.

  **3.** A red slot's scope comes from fallow's real shapes, not its documented ones

  D27 scopes a red `test`, `health`, `dead` or `dupes` slot to the paths its own raw output names. Rather than guess, I ran fallow 3.22 against a throwaway repo with a real cycle, a real boundary violation and a real clone family, because the committed fixture has all of those arrays empty and the shipped `cli-reference.md` documents the schema-7 shapes. At schema 9 a circular dependency carries `files[]` and `edges[].path` (not the documented `cycle[]`), a boundary violation carries `from_path` and `to_path`, and a clone family carries `files[]` plus `groups[].instances[].file`. `pathsOf` reads that fixed key set and nothing else, so a finding shape atis does not know names nothing and its slot falls back to `global` rather than to a guess, which is D41's "read by key, never reject on the number" applied to the findings themselves.

  **4.** The `.check/` contract moved into core, which put one file outside the seam

  Core computes evidence from `.check/` data but cannot import the reader that gathers it (C1, and fallow's `libs → libs` boundary rule enforces it). That leaves two options: core redeclares the eleven artifact types, or core owns them and `apps/atis` imports them. I took the second. `libs/core/src/evidence.ts` now declares `CheckArtifacts` and its parts, `apps/atis/src/sources/check.ts` imports them and keeps `CheckInputs` as an alias so its own tests are untouched, and the file gets 60 lines shorter. This is the same shape as `history.ts` owning `Commit` while the git runner produces it. The cost is one file outside the declared seam, which the seam row will name; the alternative was two declarations of one contract that have to be kept in sync by hand, with no compiler anywhere checking that they agree.

  **5.** Three parks, and one of them is a real hole in D27

  D27 says a *gap* is a changed file with any uncovered changed executable line. A changed source file that the coverage report never names has no changed executable lines at all, so it has no gap, so an entirely uninstrumented new file reads as VFR. That is the literal rule and I built it, but vitest only emits uncovered files when `coverage.all` is on, so this is reachable on a real repo. Parked, because it wants either a third state (unmeasured) on the gap rule or an "untested changed file" notice candidate in step 11, and either is a decision rather than a build call. The other two parks are smaller: nothing currently proves `apps/atis` still satisfies `CheckArtifacts` once step 12 stops importing every field, and `computeEvidence` calls `computeReach` once per changed file (reusing D5's one implementation rather than walking again), which recomputes `newCrossModule` each time and is worth revisiting only if step 14 meets a large PR.

- 2026-09-18 — step 11 checkpointed · 80486a57c — feat(core): rank notice candidates into the six-slot budget (1 drift, 14m)

  **Summary**: `rankNotices` builds every candidate of §5.4 plus D48's `other` group, scores each as severity scaled by reach, evidence gap and history, and keeps the six the map has room for. The ladder, the gates and the thresholds are all in `config.ts`, and every notice carries both the measurements and the coefficients that produced it, so a reviewer who disagrees argues with a number rather than with the tool.

  1. Thirteen kinds cover §5.4's twelve rows, and the last row is two of them
  2. Every coefficient is in `config.ts` and rides on the notice that used it
  3. The ranking is one total order, so two runs and a shuffled input give one map
  4. `evidence.ts` gained two exports, outside the seam
  5. The D27 park is still open, and I did not close it here

  **Readout**: Step 11 - feat(core): rank notice candidates into the six-slot budget

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    honored
               - D23 (head-only-check), D28 (config-file), D9 (thresholds)
               - D39 (two-graphs), D47 (dependency-delta), D48 (shore-groups), D45 (nested-cells)
  constraints  11 of 11 honored
  seam         strayed: 1 path outside the seam
               → libs/core/src/evidence.ts
  diff         +1040 -2 across 5 files
  spent        14 min · 1 turn · 3s gate · green first run
  ```

  **Verdict**: ◐ A hair off (seam strayed)

  **Recommendation**: Approve and checkpoint. `pnpm check` is green on all eight slots and the done-when is met clause by clause; the one thing worth your judgement is the park in highlight 5, which step 12 will build `buildMap` on top of either way.

  **1.** Thirteen kinds cover §5.4's twelve rows, and the last row is two of them

  The eleven rows of §5.4 and D48's `other` group produce thirteen kind strings, because §5.4's last row is two instruments in one line: a `package.json` delta and `security.json`. They have different targets, different `why` and different inputs, so `new-dependency` and `security-finding` are separate kinds; a notice reading "new dependency or security finding" would say neither. The test drives one scenario per row from a quiet repository and asserts that each fires its own kind and nothing else.

  Two of the rows needed a rule the plan names but does not spell out. `deleted-export` follows D39 (base importers of a name missing from the head `exports[]`) with one refinement: a consumer whose head version no longer takes that name has already moved on and is not counted, which keeps a PR that removes an export *and* updates its callers from earning a severity-8 primary notice for work it already did. The one case that cannot be told apart is a deleted file, where a consumer that kept a broken import and one that removed it both leave no head edge; the base importer is kept and the comment says so. `interface-change` treats a changed file as interface when it is its cell's barrel *or* something outside the cell imports it, so nothing depends on a barrel existing (D45).

  One rule I added that the done-when does not ask for: when a slot is red, it already names its findings on the map, so a candidate built from that same slot's own artifact and pointing at the same target is dropped rather than spending a second of the six (C7). It is narrow on purpose — only `dead`, `health` and `security` can be spoken for, and only by their own red slot — and a test pins both sides of it.

  **2.** Every coefficient is in `config.ts` and rides on the notice that used it

  `NoticeConfig` carries the severity ladder and every gate: fan-in high (the run's own `fan_in_p95` when `health.json` has one, else 7), deep band 4, large 100 lines, hot at churn 2 or a bug-fix rate of 0.3, bedrock at 365 days and churn 0.5, a ghost at rate 0.5 over 3 commits. The ladder runs 10 for a red slot down to the floor of 2 the step pins for co-change, bedrock and `other`; two pairs share a rung because they sit at the same altitude rather than because a number ran out, and the comment says which and why.

  One number the step names but does not define is the history weight. I made it `churn_ratio + bugfix_rate`, both dimensionless and both absent-as-zero (C2), and put both in the notice's `inputs` rather than hiding a coefficient between them. Every notice echoes `cells_reached`, `uncovered_fraction` and `history_weight` in `inputs` and at least `severity` in `thresholds`, so the D28 echo is structural rather than per-kind.

  **3.** The ranking is one total order, so two runs and a shuffled input give one map

  Candidates sort by weight, then path, then kind, then `why`. The last of those is beyond the step's "path then kind", and it is there because two red slots can name one file and would otherwise tie completely. The six slots are an array of tiers, so the budget *is* the array: a seventh candidate has nowhere to go and a lone candidate is one primary with nothing behind it. The determinism test runs one input twice and then again with every list reversed, and all three stringify identically.

  Worth knowing from the crowded fixture: a `cycle-or-boundary` notice outranked a red check slot there, because the file it names has churned four times its own length and one commit in two says "fix", and the history factor multiplies. That is the formula the step specifies doing its job rather than a bug, but it means the gate's own verdict is not automatically the primary notice, which the glance test in step 23 will judge.

  **4.** `evidence.ts` gained two exports, outside the seam

  The cycle-and-boundary candidate needs fallow's finding-path extraction, which already exists in `evidence.ts` as `pathsOf` and `structuralFindings`. Copying those thirty lines into `notices.ts` would give one tricky convention two homes, so I added the `export` keyword to each instead: two words, no behaviour change, and `pnpm check` covers it. It is the only file touched outside the four the seam names.

  **5.** The D27 park is still open, and I did not close it here

  Step 10 parked a real hole: a changed source file the coverage report never names has no changed executable lines, so it has no gap, so an entirely uninstrumented new file reads as VFR. The park says the fix is either a third state on D27's gap rule or an "untested changed file" candidate in this step. Neither is in the done-when's list of kinds, and inventing a fourteenth candidate would be deciding it rather than building it, so the hole is exactly where step 10 left it. One word from you turns it into a step; it is cheap to add once the shape is yours.

- 2026-09-18 — step 12 checkpointed · 1e752b601 — feat(core): assemble map.json through one pure buildMap (48m)

  **Summary**: `buildMap` now turns the two scans, the diff, the manifest delta, the log window and the `.check/` artifacts into a whole `map.json`, and a committed fixture repository proves it: eight changed files across five cells and six shore groups, IFR, six ranked notices, byte-identical across runs. It decides nothing the parts had not already settled; what it adds is the rename rekey, the graph each computation runs on, and the terrain's own numbers.

  1. One pure function composes the eight parts, each told which graph it runs on
  2. The rename rekey runs first, and now reaches the git log too
  3. `terrain.groups` gained a `tests` group, because a changed test file was dangling
  4. The terrain's own numbers are assembled here, and survive a missing `.check/`
  5. The golden test reads its fixtures with `node:fs`, which C1 leaves alone

  **Readout**: Step 12 - feat(core): assemble map.json through one pure buildMap

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    honored:
               - D32 (terrain-from-base), D39 (two-graphs), D40 (rename-identity)
               - D24 (layout-in-core), D45 (nested-cells), D48 (shore-groups)
  constraints  11 of 11 honored
  seam         held: 4 of 4 declared, no strays
  diff         +2325 -0 across 6 files
  spent        48 min · 4 turns · 4s gate · green first run
  ```

  **Verdict**: ● Plumb

  **Recommendation**: Approve and checkpoint. The check is green across all eight slots, the seam held, and the golden pins the whole composition so step 13 can wire the CLI to it and step 15 can regenerate it with a layout.

  **1.** One pure function composes the eight parts, each told which graph it runs on

  `buildMap(inputs, config)` is a straight line: rekey, then cells and the shore from the base files plus the added ones, depth over the base edges plus the head edges an added file is an end of, reach and stitches over the head edges with the base edges for deleted files, deleted-export consumers over the base edges, then evidence, the category and the ranking. Nothing reads a clock, a file or a process, so `generated_at` is an input like everything else and two runs over one input set differ in nothing at all ([C3 (deterministic)](#c3)). `terrain.layout` is absent, waiting for step 15 ([D24 (layout-in-core)](#d24)).

  **2.** The rename rekey runs first, and now reaches the git log too

  [D40 (rename-identity)](#d40) asks that every list come out keyed by the head path, so the base scan's files, edges and entry points are rekeyed before anything else runs. The log needed the same treatment or a renamed file would lose the history its old name earned and a co-change ghost could point at a path no longer on the map. `git log` is read without `-M`, so the rename commit lists both names; the two entries fold into one rather than counting the file twice. The rename fixture comes out with one organelle at the head path, `changed[].from` set, and no new-cross-module edge invented by the rename.

  **3.** `terrain.groups` gained a `tests` group, because a changed test file was dangling

  `computeReach` puts a changed test file in the `tests` group ([D4 (tests-not-terrain)](#d4) meets [D48 (shore-groups)](#d48): a test is evidence, but every changed entry still names exactly one cell or group). `assertMap` checks that name against `terrain.groups`, which `identifyGroups` never emits, so any change touching a test produced a map that failed its own guard. `terrain.groups` now carries the tracked test files under `tests`, between the shore table and the loud `other` residual. The SVG still draws them as stitches, never as a shore contour.

  **4.** The terrain's own numbers are assembled here, and survive a missing `.check/`

  A cell's band is the shallowest terrace its files reach, since that is where a reader arrives; `fan_in` and `fan_out` count the terrain files outside its contour that read into it and that it reads, computed from the import graph rather than from `health.json`, so they still mean something when there is no `.check/` at all ([D52 (reach-from-scan)](#d52)). Dents are the rules a file breaks, with fallow's compound `exceeded` values split so the count of dents is the count of rules; cycles and boundary violations dent every file they name and are the only lines the map draws beside the new cross-module import. fallow names no id for a clone family, so the map numbers them by their sorted file lists, which is what makes two runs mark the same cells with the same glyph. Every one of these is absent rather than defaulted when its channel is missing ([C2 (never-fake)](#c2)).

  **5.** The golden test reads its fixtures with `node:fs`, which C1 leaves alone

  `libs/core/src/__tests__/map.test.ts` imports `node:fs`, `node:path` and `node:url` to reach the fixture input set and the golden under `libs/core/fixtures/`. I first flagged that as bending [C1 (core-is-pure)](#c1) by its letter ("nothing under `libs/core/src` imports `node:*`"); Rob's reading, 2026-09-17, is that C1 is about the code core ships and a test is a special case. On that reading it is honoured outright: `map.ts` and everything the package exports are Node-free, and no consumer of `core` gains a Node dependency. The test's comment now says so, and a park records that C1's promised struct rule should scope to non-test sources when it lands, so this test does not go red under it. The JSON-import version I tried on the way (which trips `no-deep-sibling-import` on any `../../…` specifier) is not needed and is not in the diff. I also parked one nit from step 11: the deleted-export notice says "1 files still import it".

- 2026-09-18 — step 13 checkpointed · 702d79fee — feat(cli): add the atis command that writes map.json for a base ref (1 drift, 11m)

  **Summary**: `atis --base <ref>` now reads a real repository end to end and writes a real `map.json`. Run on this repo at `HEAD~1` it prints `MVFR, 10 files changed, 0 notices` in about 1.5 seconds, and the file it leaves passes `assertMap`. Everything impure lives in the new `run.ts`; `cli.ts` parses flags and nothing else.

  1. The bin parses flags, `run.ts` does the work, and `index.ts` stays the package's surface
  2. Two `git archive` extractions, removed in a `finally`, are the whole of D32 and D46
  3. `--verbose` measures every source, which is the measurement D50 asked this build to take
  4. The three artifact tests run the real bin over `git clone` copies of this repo
  5. One stray, and a model note

  **Readout**: Step 13 - feat(cli): add the atis command that writes map.json for a base ref

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    honored:
               - D32 (terrain-from-base), D46 (head-is-a-commit), D50 (history-measured)
               - D25 (base-semantics), D30 (pure-parsers), D41 (artifact-trust)
  constraints  11 of 11 honored
  seam         strayed: 1 path outside the seam
               → apps/atis/src/__tests__/index.test.ts
  diff         +402 -42 across 5 files
  spent        11 min · 1 turn · 10s gate · green first run
  ```

  **Verdict**: ◐ A hair off (seam strayed)

  **Recommendation**: Approve and checkpoint. The gate is green across all eight slots, the command produces a real map of this repository that passes its own schema guard, and step 14 is the spike that points it at checkride's PR 4 and reads the result.

  **1.** The bin parses flags, `run.ts` does the work, and `index.ts` stays the package's surface

  `cli.ts` is now `util.parseArgs` in strict mode with `allowPositionals: false`, a small `Flags` shape, and four early returns: `--version`, `--help`, a missing `--base`, and otherwise `run(...)`. A parse throw (an unknown flag, a stray positional, `--base` with no value) becomes an exit-2 line plus the usage text rather than a stack trace. `run.ts` owns the rest: two `git archive` extractions, the six sources, `buildMap`, the atomic write. `index.ts` keeps `NAME`, `VERSION` and a `USAGE` that now names every flag, and re-exports `run`, so a library caller can build a map without the `bin`.

  The exit codes are [C4 (never-blocks)](#c4) exactly: 0 whenever the map was written, whatever the weather says, and 2 only for misuse or a repository that cannot be read. `MVFR` on this repo's own change exits 0.

  **2.** Two `git archive` extractions, removed in a `finally`, are the whole of D32 and D46

  `extract` makes a temp directory per side, writes `git archive --format=tar -o` into it and untars into a `tree/` subdirectory, so the archive itself never lands inside the tree the scanner walks. The merge-base tree feeds the terrain and the `HEAD` tree feeds the weather ([D32 (terrain-from-base)](#d32), [D46 (head-is-a-commit)](#d46)); the working tree is read for one thing only, `.check/`, which is never committed. Both extractions are removed in a `finally`, so a throw mid-scan does not leave them behind.

  `headOf` is deliberately the first call `run` makes: one quiet `git show -s --format=%H%n%ct HEAD` that yields both `meta.head` and the `head_time` every age is measured back from, and that fails by name on a directory that is no repository before any source has shelled out. That is what the fifth test asserts, in process, since a clean exit-2 path is not reachable through a clone.

  **3.** `--verbose` measures every source, which is the measurement D50 asked this build to take

  Each source is wrapped in a `timed` call and the list prints on stderr, so stdout stays the one line. On this repo: `diff 89 ms`, `scan base 593 ms`, `scan head 516 ms`, `manifests 174 ms`, `log 104 ms`, `check 1 ms`, `build 9 ms`, `write 1 ms`. The history window is not the cost here; the two TypeScript scans are, at roughly 1.1 seconds of a 1.5 second run. [D50 (history-measured)](#d50) says the first repo past about two seconds earns a `--history <n>` cap, and on this evidence the cap it earns first may be on the scan instead. Step 14 runs this on checkride's PR 4, which is the bigger repo that will say.

  **4.** The three artifact tests run the real bin over `git clone` copies of this repo

  A clone is the honest temp copy: it carries the history the CLI reads and none of the ignored files, so `.check/` is absent in it by construction and NOINST is what the map should say. One test asserts `git-only`, `NOINST`, no slots and `Object.keys(evidence)` empty, so a muted channel is an absent key and not a faked zero ([C2 (never-fake)](#c2)); another makes `.check/` and leaves it empty and asserts the `reason` reaches both `weather.checks.reason` and `meta.instruments.reason`. The first test runs against this repo itself with `--base HEAD~1` and checks `assertMap`, the one-line stdout and the `--verbose` timings. Five tests, 5.9 seconds, each with a one-minute timeout since a clone plus two scans will never fit vitest's default five seconds.

  `beforeAll` builds the `bin` only when `dist/cli.js` is missing, and tolerates a failed build as long as the file then exists: checkride runs its slots from a pool, so `types` can be building the same graph in parallel with `test`, and the second gate run above did exactly that.

  **5.** One stray, and a model note

  `apps/atis/src/__tests__/index.test.ts` is outside the declared seam. It had three tests calling `run(['--version'])` against the placeholder `run(argv)`, and `run` no longer takes argv, so those moved to `cli.test.ts` where they now exercise the built bin; what stays is the manifest check and a new assertion that `USAGE` names every flag `cli.ts` parses. Two declared seam paths needed no edit: `fallow.toml` already lists `apps/atis/src/cli.ts` as an entry and globs the tests, and `apps/atis/package.json` already points `bin` at `dist/cli.js`. The step recommended `sonnet` and this ran on Opus 5; I should have flagged that before implementing rather than here.

- 2026-09-18 — step 14 checkpointed · a831f431a — chore(spike): generate and spot-check map.json for checkride's PR 4 (12m)

  **Summary**: All four spot-check rows are ✓, and the two that could be exact are exact: atis's changed set is git's, eleven for eleven, and its reach set for `src/pm/tools.ts` is fallow's impact closure minus test files, thirty-two for thirty-two with an empty symmetric difference. Patch coverage is 12 of 12 against `coverage-final.json` counted by hand, and the `src/pm/index.ts` interface change is not merely in the top three but the primary notice. The spike also did what a spike is for and found three problems, all parked: a symlinked `--repo` path silently empties the coverage channel, the tertiary notice tier is ranked by the alphabet, and the red `security` slot that sets this fixture's IFR category is today's advisory database rather than anything PR 4 did.

  1. Four rows checked, and the two that could be exact are exact
  2. A symlinked repo path silently empties the coverage channel
  3. The tertiary notice tier is ranked by the alphabet
  4. The IFR category is today's advisory database, not PR 4
  5. meta.repo is the directory's basename, so the worktree must be named for the repo

  **Readout**: Step 14 - chore(spike): generate and spot-check map.json for checkride's PR 4

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    honored:
               - D29 (spike-target), D52 (reach-from-scan), D41 (artifact-trust)
               - D22 (local-fallow), D25 (base-semantics), D24 (layout-in-core), D23 (head-only-check)
  constraints  11 of 11 honored
  seam         held: 2 of 2 declared, no strays
  diff         +7079 -0 across 3 files
  spent        12 min · 1 turn · 9s gate · green first run
  ```

  **Verdict**: ● Plumb

  **Recommendation**: Approve and checkpoint. The four rows the plan asked for are ✓ with reproducible evidence behind each, two of them exact set equality against an outside oracle, and the three problems the spike turned up are parked for `/plumbbob:refine` rather than smuggled into a step whose seam is two files. Step 15 starts the layout and wants opus.

  **1.** Four rows checked, and the two that could be exact are exact

  The done-when asked for four rows, each ✓ with the command behind it, and `docs/spike.md` carries them with the evidence rather than the verdict alone.

  **The changed set** is eleven paths, ten modified and one added, matching `git diff --name-status fee5ed6...ae5078c` exactly, with `added`/`deleted` summing to +473 −21 — the same size D29 recorded for the PR. The half git cannot check is where each file landed: three on terrain (two single-file cells and `folder:src/pm`), four on the `docs` and `prompts` shores, three test files in the `tests` group, which is how a changed test names exactly one cell or group (D48) while staying a stitch and never an organelle (D4).

  **The reach set** is the strong row. fallow returns 56 files in `affected_not_shown`; removing the 24 test files leaves 32. atis returns 33 reach entries when the diff is narrowed to `src/pm/tools.ts` alone; removing the seed itself, which fallow reports separately, leaves 32. The symmetric difference is empty — nothing in one that the other lacks. The narrowing was done by running the shipped pipeline with `diff.changed` filtered to that one path, so the code under test is `computeReach` as it ships and not a re-implementation. What atis has beyond the flat list is D5's attenuation: 2 files at 0 hops, 13 at 1, 8 at 2, 10 at 3, each carrying the barrels crossed. That is exactly the thing D52 says the oracle cannot witness, so the oracle proves set equality and then stops.

  **Patch coverage** had one subtlety worth the "by eye" the plan asked for. istanbul's `statementMap` for `src/pm/tools.ts` holds 15 statements, all inside the file's single hunk and none with a zero hit count; atis reports `changed_executable: 12`. Fifteen against twelve is right: lines 30, 66 and 68 each carry two statements, and step 10 counts changed executable *lines*. I did the same arithmetic by hand over the other three changed files with coverage and all three agree — `src/doctor.ts` 4 of 4 over six hunks, `src/orchestrator.ts` 9 of 9 over three, and `src/pm/index.ts` 0 of 0, a barrel of pure re-exports having no executable line in its hunks, which is an absent measurement and not a zero-percent one (C2).

  **The interface change** ranks first, carrying the numbers that put it there: `fan_in: 8` against a threshold of 6 read from `health.json`'s `fan_in_p95`, `band: 4` against a deep-band threshold of 4, `cells_reached: 14`, history weight 1.773. The budget came out 1 + 2 + 3 with more candidates than slots, so C7 is filled rather than padded.

  **2.** A symlinked repo path silently empties the coverage channel

  The first run produced `weather.evidence.patch_coverage: []`, with no reason given, on a repository whose `.check/coverage/coverage-final.json` holds 52 files including every changed one.

  macOS is the cause. `/tmp` is a symlink to `/private/tmp`, istanbul writes absolute keys under the resolved path, and `relativeToRepo` in `apps/atis/src/sources/check.ts` computes `relative('/tmp/…', '/private/tmp/…')`, gets a `../../..` path, and falls back to keeping the key absolute. Nothing then joins to a repo-relative changed path, so coverage and stitches both come back empty. Passing the resolved path restores 4 patch-coverage entries and 9 stitches.

  It fakes nothing, so C2 holds by the letter, but a wrongly muted channel is worse than an absent one because it cannot be told apart from a repository with no tests at all. A `realpathSync` on `--repo` in `run.ts` is the fix; it is parked rather than done here because `apps/atis/src/` is outside this step's seam. The fixture is generated from the resolved path in the meantime, which is why the README's command reads `pwd -P`, and `docs/spike.md` records the whole diagnosis so the repair does not have to rediscover it.

  **3.** The tertiary notice tier is ranked by the alphabet

  Four candidates tied at weight 2 — `README.md`, `other`, `package.json` and `src/pm/translate.ts` — for three tertiary slots. The tie-break is `byPath`, so `R` beat `o` beat `p` beat `s`, and `src/pm/translate.ts` was cut.

  That is the wrong one to cut. It is a source file inside the very cell the PR changes, and it co-changes with `src/__tests__/pm.test.ts` at rate 0.857 over 6 commits, against 0.5 over 4 for the `README.md` that took a slot instead. The cause is in `score()`: it multiplies severity by reach, uncovered fraction and history weight, and a file that did *not* change has none of the three, so every missing-cochange candidate scores its bare severity and the alphabet does the rest of the ranking. The attention budget is the product (P1, C7), and spending two of three tertiary slots on markdown housekeeping while dropping a source file in the changed cell is that budget being spent badly, deterministically. Feeding a ghost's `rate` and `support` into its weight is the obvious repair and is a `config.ts` and `notices.ts` change, not a schema one. Parked.

  **4.** The IFR category is today's advisory database, not PR 4

  `pnpm check --all --skip mutation` is what the done-when specified, and on a 2026 lockfile its `security` slot runs `pnpm audit` against the advisory database as it stands today: 15 findings, 5 moderate and 10 high. That red slot is what makes the map IFR, and it produces the third-ranked notice.

  The map is honest about it — the notice reads *the `security` check is red for the whole repository*, scoped `global` — and the ranking handles it rather well, which is worth noticing on its own. `red-check-slot` carries the highest severity in the config, 10 against the interface change's 8, and still lands third, because a global slot failure reaches no cell and has no history and so scores its bare severity, while a deep barrel that fourteen cells read is amplified to 82.3. The map's answer to "what should I look at" is the barrel, and the red gate slot is reported without being allowed to shout down a change it has nothing to do with.

  The problem is downstream. Step 22 generates five of these fixtures and step 23 asks readers to judge merge or hold from them; a category carrying an audit the PR did not cause will collect holds for the wrong reason. Parked as a call for step 22: skip `security` beside `mutation`, or record the caveat in each README. This fixture's README records it.

  **5.** meta.repo is the directory's basename, so the worktree must be named for the repo

  `run.ts` fills `meta.repo` with `basename(resolve(options.repo))`. The first worktree was at `/tmp/atis-spike-cr-pr4`, so the map came out carrying `"repo": "atis-spike-cr-pr4"`. I regenerated it from a worktree named `checkride` and the fixture now reads `"repo": "checkride"`, but step 22 does this five more times and the trap is one careless path away each time. Parked, with reading the name from the origin remote as the alternative.

  Two properties nobody asked for held while I was there, and both are in the doc: two runs produced byte-identical files at 185,534 bytes once `generated_at` was blanked (C3), and the command exited 0 on a map it wrote while the reviewed repository's own `pnpm check` exited 1 (C4). Wall time was 2.67 seconds across the eight measured sources, 1.97 of it the two TypeScript scans; the history window was 0.47 but over only 182 commits against D8's cap of 5,000, so that number says little and the doc says so rather than dressing it up as a D50 data point.

- 2026-09-18 — step 15 checkpointed · 0a6837066 — feat(core): lay out organelles within bands with a seeded force simulation (1 drift, 25m)

  **Summary**: `buildMap` now emits `terrain.layout`: a shore grid above band 0, one strip per terrace, and a position for every organelle settled by a seeded `d3-force` simulation that is stopped before `d3-timer` can take a frame and advanced only by `tick(300)`. The four forces the step names are there, plus a fifth that turns the terrace from a preference into a guarantee; the step's four invariants hold on the fixture, on a 180-file stress case and on this repository's own map.

  1. The band strip needed a fifth force, because a clamp at the end stacks files on top of each other
  2. The terrain settles first and the second pass cannot move it
  3. The field is measured off the terrain, not the other way round
  4. Test files get no place on the shore
  5. One line outside the seam: map.test.ts asserted the layout was absent

  **Readout**: Step 15 - feat(core): lay out organelles within bands with a seeded force simulation

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    4 of 4 honored
  constraints  11 of 11 honored
  seam         strayed: 1 path outside the seam
               → libs/core/src/__tests__/map.test.ts
  diff         +1021 -7 across 11 files
  spent        25 min · 1 turn · 39s gate · green first run
  ```

  **Verdict**: ◐ A hair off (seam strayed)

  **Recommendation**: Approve and checkpoint. The gate is green under `--strict`, the four invariants the done-when names are asserted on a realistic fixture and verified by hand on a 180-file stress case and on this repository, and the golden's diff is the `layout` block and nothing else.

  **1.** The band strip needed a fifth force, because a clamp at the end stacks files on top of each other

  `forceY` fades with alpha and `forceCollide` does not, so on a busy terrace collision wins the last hundred ticks and pushes the crowd over the strip's edges. Clamping `y` back at the end then puts several files on the same boundary line: measured on a 180-file synthetic, two files in one cell ended 4.9 px apart with radii summing to 31.7. So `forceTerrace` runs after the other four and trims each tick to what the strip can hold, which leaves collision's push in `x` where the field has room for it. Overlap on that case went from 26.8 px to 0. Each file also gets its own rest height inside the strip rather than all of them being pulled to one centre line, so the terrace fills instead of packing into a thread.

  **2.** The terrain settles first and the second pass cannot move it

  Pass one lays out the base organelles alone, slides them onto the margin and rounds them; pass two pins exactly those numbers with `fx`/`fy` and places only what the change added, seeding each new file beside its own cell's existing files rather than across the field. A test drives `simulate` directly with a `fixed` map and asserts every pinned placement comes back byte-identical, which is D32's promise stated as an assertion rather than as a hope.

  **3.** The field is measured off the terrain, not the other way round

  A nominal width sets the starting spread of the cell columns, the shore's wrap and the band heights, but the width `map.json` carries is the settled terrain's own extent plus a margin, floored at 480 and at whatever the shore needed. A tightly coupled repository is drawn as the narrow column it is rather than padded out to look wider: this repo comes out 480 × 942, the demo fixture 480 × 660.

  **4.** Test files get no place on the shore

  The shore grid walks `terrain.groups` in D48's table order, but skips any file `classifyFile` calls a test. D4 makes a test evidence, and D48 draws it as a stitch on the organelle it imports; giving it a shore mark would have drawn it twice and put it inside a shore contour it does not belong to. The `tests` group still exists so a changed test names a group, it just has no position, and a test asserts exactly that.

  **5.** One line outside the seam: map.test.ts asserted the layout was absent

  Step 12's test carried `expect(map.terrain.layout).toBeUndefined()`, which this step makes false. It now asserts the field's strips run in the same order as the bands they were quantised from. `libs/core/src/__tests__/map.test.ts` is the one path the diff touches that the seam does not name.

- 2026-09-18 — step 16 checkpointed · ab9420b21 — feat(core): draw cell membranes as Bubble Set contours over the layout (1 drift, 20m)

  **Summary**: Every cell and every shore group with a mark on the field now carries one closed contour in `terrain.layout.contours`, cut by `bubblesets-js` over the settled field, and `membraneThickness` turns a cell's `interface_size` into the stroke width the SVG will draw its skin at. The tests prove every member centre inside its contour and every other centre outside, a cell on two terraces stretched across the line between them, a package's skin holding the folder beneath it, and the same bytes twice; the demo golden carries the contours and the gate is green in full.

  1. A package's skin holds every cell beneath it, and the folder's own skin sits inside it
  2. The skin is checked, and re-cut with a harder push when a neighbour ends up under it
  3. The ring is thinned to a third before it is smoothed, so the golden grew by 2,378 lines rather than 5,518
  4. A group of test files has no skin, and a file the layout did not place is neither held nor routed around
  5. Two paths outside the seam: map.ts hands the cells to the layout, and layout.test.ts asserted the contours were absent

  **Readout**: Step 16 - feat(core): draw cell membranes as Bubble Set contours over the layout

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    honored
               - D13 (geometry)
               - D24 (layout-in-core)
               - D34 (layout-deps)
               - D45 (nested-cells)
               - D48 (shore-groups)
               - D4 (tests-not-terrain)
  constraints  11 of 11 honored
  seam         strayed: 2 paths outside the seam
               - libs/core/src/__tests__/layout.test.ts
               - libs/core/src/map.ts
  diff         +2877 -12 across 8 files
  spent        20 min · 2 turns · 8s gate · green first run
  ```

  **Verdict**: ◐ A hair off (seam strayed)

  **Recommendation**: Approve and checkpoint. The gate is green in full, the four properties the done-when names are asserted on a purpose-built fixture and on the demo map, the renders of the demo and a 30-cell field were checked by eye, and the two strays are the one word `map.ts` needs to hand the cells over and the assertion step 15 left for this step to flip.

  **1.** A package's skin holds every cell beneath it, and the folder's own skin sits inside it

  D45 makes a package a contour around all of its descendants with its barrel as its only direct organelle, so a cell's members are its own organelles plus those of every cell whose `parent` chain reaches it, walked as a tree rather than assumed to be one level deep. Everything else placed on the field, including the parent's barrel for a child cell and the shore's marks for any cell, is pushed as a non-member, which is what routes the skin around a neighbour rather than over it. On the demo map `package:libs/core`'s contour holds `pm/` and `util/` and not the CLI, and `pm/`'s contour holds its four files and not the package barrel; the render shows the folder's skin nested inside the package's, both stretched down the terraces. The cells therefore had to reach the layout: `LayoutInput` gains a `cells` field narrowed to `id`, `parent` and `organelles`, so a test can hand over three lines rather than a full `Cell`.

  **2.** The skin is checked, and re-cut with a harder push when a neighbour ends up under it

  The library loosens its field until every member's centre is inside the ring and says nothing about whose else is, so on a terrace packed tighter than its routing can bend around, a virtual edge runs straight through a neighbour and the neighbour's centre lands under the skin. Measured on synthetic fields laid out by step 15's own forces: none on the 8-cell fixture, the 30-cell one or the demo, and 1 of 480, 5 of 1000 and 4 of 2000 files at the default push. A stronger push everywhere trades those for a cell's own file falling outside its skin, which is worse (2 members out at -1.2 on 2000 files, 1 at -1.5), so the module checks the stored ring itself with the same ray test the tests use, and only when a member is out or a neighbour is in does it cut again at -1.5 and keep that ring only if the check now passes. That resolved 4 of the 5 on 1000 files and none of the 4 on 2000; the first cut stands when neither holds, since a skin with a neighbour under it is still the cell's skin and a missing one would say the cell has no membrane (C2). The residue is parked against step 22's real repos.

  **3.** The ring is thinned to a third before it is smoothed, so the golden grew by 2,378 lines rather than 5,518

  The marching squares return one point per grid step, and a B-spline sampled six times per point turned the demo's ten contours into 1,374 points and a golden 5,518 lines longer, because the CLI's pretty-printed JSON puts every coordinate on its own line. The tolerance the ring is thinned to is now per field, 3 px for a cell and 2 px for the shore, and the spline is sampled three times per control point, which is 589 points for the same ten contours with the inside-and-outside property intact on every field measured. The tolerance stops at 3 because 4 pulled the shore's small marks out of their skin after smoothing: the shore field rests only 6 px beyond a mark, a third of a cell's margin, and the same thinning that is invisible on a cell eats that. Whether contours should be written more compactly than one number per line is parked for before step 22 commits five fixtures.

  **4.** A group of test files has no skin, and a file the layout did not place is neither held nor routed around

  The `tests` group exists so a changed test can name a group, but D4 gave its files no position, so it gets no contour rather than an empty one, and step 17's "one contour per non-empty group" reads as per group with a mark on the field. The same rule covers any id without a position: it is not a member and not an obstacle, because a file the layout did not place is not on the field at all; a cell whose every organelle is unplaced gets no key, which the tests assert alongside the empty-contour case of `withinContour`.

  **5.** Two paths outside the seam: map.ts hands the cells to the layout, and layout.test.ts asserted the contours were absent

  `buildMap` had to pass `cells` into `computeLayout`, one word on one line of `libs/core/src/map.ts`. Step 15's test carried `expect(layout.contours).toBeUndefined()`, which this step makes false, and its fixture needed cells for the new input; it now asserts one contour per cell, and its empty-field case expects an empty `contours` record beside the empty `positions` one. Both are the diff touching what the seam did not name.

- 2026-09-18 — step 17 checkpointed · 00b8ce693 — feat(svg): render the field, terraces, membranes and organelles (18m)

  **Summary**: `libs/svg` exists and `renderSvg(map)` turns a laid-out `map.json` into one still SVG: a near-black field, one faint strip and contour line per terrace with band 0 at the top, the shore above it with one dim skin and small-caps label per group that has a mark, one membrane path per cell stroked as thick as its interface over a translucent body, and one shape per organelle, a circle sized by mass or a polygon with a vertex pulled per dent, with the same small glyph on every member of a clone family. Every element goes through one `el` helper that escapes attributes and text, the palette is greyscale and dim and a test holds every colour in the output to that, the demo map renders a golden byte for byte, and the gate is green in full.

  1. The renderer draws only what the map carries, and refuses a map that carries no layout
  2. One `el` helper builds every element, so a file named `a<b>&"c".ts` survives the trip
  3. The CLI's `svg` dependency waits for step 20, because fallow flags a dependency nothing imports
  4. The golden is rendered from core's demo golden, read across the workspace rather than copied
  5. Dents and clone glyphs are drawn on organelles only; the cell-level versions are parked

  **Readout**: Step 17 - feat(svg): render the field, terraces, membranes and organelles

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    honored
               - D33 (svg-package)
               - D24 (layout-in-core)
               - D48 (shore-groups)
               - D13 (geometry)
               - D11 (mood)
               - D45 (nested-cells)
               - D4 (tests-not-terrain)
               - D35 (static-encodings)
  constraints  11 of 11 honored
  seam         held: 3 of 4 declared, no strays
  diff         +879 -0 across 12 files
  spent        18 min · 2 turns · 8s gate · green first run
  ```

  **Verdict**: ● Plumb

  **Recommendation**: Approve and checkpoint. The gate is green in full, every element the done-when names is drawn in the order it names and asserted on the demo map and on a hand-built one, the render was checked by eye, and the only seam path untouched is the CLI manifest, deferred to the step that imports the package.

  **1.** The renderer draws only what the map carries, and refuses a map that carries no layout

  `renderSvg` throws on a missing `terrain.layout` rather than laying anything out itself (D24). Every number it draws is read, not derived: an organelle's radius is the layout's `r`, which core made from `loc`, and the test asserts that a bigger file draws a bigger circle rather than recomputing one; a membrane's stroke width is core's own `membraneThickness(interface_size)`, the package's one runtime import and a workspace dependency, not a third-party one (C9); a contour is traced as `M…L…Z` from the points core stored. Membranes are drawn outermost first so a folder's skin lies over the skin of the package that holds it (D45), and the translucent fills stack where they nest, which is the nesting made visible. The terrace strips are one tone on purpose: darkening them by depth would spend luminance, which C11 keeps for evidence and reach, so the contour lines carry the terraces and position carries depth. The colours live in `tokens.ts` named by meaning, greyscale with a chroma of at most 20 and no channel above `#90`; two started a hair too blue and the test caught them.

  **2.** One `el` helper builds every element, so a file named `a<b>&"c".ts` survives the trip

  `el(tag, attrs, children)` returns a small `Markup` wrapper, and a plain string among the children is text: escaped, and kept inline so no whitespace lands inside a `<text>`. An attribute set to `undefined` is left out, which is how `data-reachable="false"` costs one expression, and numbers are written at two decimals with trailing zeros dropped, the layout's own precision, so the SVG reads and diffs like `map.json`. The round-trip test hand-builds a map with `src/<weird>&"q's".ts` as a file and cell id and a shore group named `docs & <notes>`, asserts the raw angle brackets never open a tag, and reads each string back through the inverse escape to the characters it left with.

  **3.** The CLI's `svg` dependency waits for step 20, because fallow flags a dependency nothing imports

  The seam names `apps/atis/package.json`, and the first pass added `svg: workspace:*` there so the lockfile would carry it now. Fallow's `unused-dependencies` rule is an error in `fallow.toml` and went red on it, since nothing in the CLI imports the package until step 20 wires `--svg`. Adding `svg` to fallow's ignore list would be a file outside the seam papering over a true finding, so the dependency was reverted: `apps/atis/package.json` is byte-identical to `main`, and the lockfile gains only the `libs/svg` importer. Step 20 adds the dependency beside the import that uses it; its one lockfile line will be a small stray there, since step 20's seam does not name the lockfile.

  **4.** The golden is rendered from core's demo golden, read across the workspace rather than copied

  `libs/svg/fixtures/demo/atis.svg` is 83 lines rendered from `libs/core/fixtures/demo/map.json`, which the test reads by relative path. P2 says every renderer draws the same terrain from one `map.json`, so the SVG golden is made from exactly the bytes core's golden test asserts, and a deliberate change to either is landed by regenerating both; a copy would drift from core's golden silently. The recipe is in the test header: `pnpm build`, then write `renderSvg(demo)` back over the file and read the diff. The render was checked by eye at 2× in headless Chromium: the package skin holds the `pm/` folder's skin, `tools.ts` with two dents shows two teeth at top and bottom, the one-dent `util/` files read as teardrops, and both `family-1` members carry the double bar.

  **5.** Dents and clone glyphs are drawn on organelles only; the cell-level versions are parked

  §5.1 gives cells `dents` and a `clone_family` too, and the demo's `package:libs/core` carries three dents and a family, but the done-when scopes the polygon and the glyph to `#organelles`, so a membrane carries its `data-kind` and its thickness and nothing else this step. That is parked as one line rather than built. Two smaller calls in the same spirit: an unreachable organelle gets `data-reachable="false"` and no invented look, since D26 already puts it in the deepest band and C2 forbids faking a channel; and the `tests` group, whose files got no place on the field (D4), draws no block, no label and no empty contour.

- 2026-09-18 — step 18 checkpointed · 886770652 — feat(svg): render the weather layer over the terrain (1 drift, 27m)

  **Summary**: `#weather` now draws every channel of §5.2 over the terrain, each in the one channel P3 gives it: the changed set stained by kind, a deleted file as a hollow outline and a renamed one as a dashed outline labelled with its old path, reach as a warm blurred glow that fills each reached cell dimmer per membrane crossed and lights each barrel it crossed, patch coverage as a skin closed for the covered share and dark for the rest, live mutants as bites in that skin, stitches as short strokes torn red where the test failed, storms over the field or the cells a red slot names, ghosts as dashed rings, churn and bug-fix rate as hatching and stipple by value, and the exceptional edges as the only lines, bowed apart in a cycle. Thirteen tests assert each encoding on the demo map or a hand-built one, a git-only map draws its changed set and its reach and nothing else, the demo golden is regenerated, both renders were checked by eye, and the gate is green in full.

  1. Every channel of §5.2 is drawn, and each keeps its one meaning: fill is state, the rim is evidence, the glow is reach, the pattern is history
  2. A package's glow is cut around the cells it holds, so util stays dark under a reached libs/core
  3. The skin is a dark open ring with the closed arc laid over it, because a pale arc alone vanished against the glow
  4. A red slot naming a test file hangs its storm over the cells that test stitches
  5. Three paths outside the seam: the tokens, one exported pathOf, and the greyscale test scoped to the terrain

  **Readout**: Step 18 - feat(svg): render the weather layer over the terrain

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    honored
               - D35 (static-encodings)
               - D40 (rename-identity)
               - D5 (reach-by-module-hop)
               - D45 (nested-cells)
               - D4 (tests-not-terrain)
               - D48 (shore-groups)
               - D12 (materials)
               - D11 (mood)
               - D6 (flight-categories)
               - D33 (svg-package)
  constraints  11 of 11 honored
  seam         strayed: 3 paths outside the seam
               - libs/svg/src/__tests__/render.test.ts
               - libs/svg/src/terrain.ts
               - libs/svg/src/tokens.ts
  diff         +1238 -6 across 9 files
  spent        27 min · 1 turn · 8s gate · green first run
  ```

  **Verdict**: ◐ A hair off (seam strayed)

  **Recommendation**: Approve and checkpoint. The gate is green in full, every encoding the done-when names is asserted on the demo map or a hand-built one and was checked by eye at 2× and 4×, and the three strays are the file the tokens belong in, one `export` keyword, and the terrain test the weather's own light would otherwise fail.

  **1.** Every channel of §5.2 is drawn, and each keeps its one meaning: fill is state, the rim is evidence, the glow is reach, the pattern is history

  Hue is state and nothing else. The change hue fills an added or modified organelle and stains a changed shore file at its small mark; a deleted file is that hue as an outline with `fill="none"` over the base tissue's dim body; a renamed file is a dashed outline at its one position with `from` written beside it in the same hue (D40). IFR red marks a torn stitch and a storm; LIFR magenta a cycle or a boundary edge; a cross-cell import this change introduced is the change's own hue. Luminance is reach and evidence: the glow is a warm off-white blurred through one `feGaussianBlur`, the skin and a passed stitch are a pale light, and a stitch whose test was not run is unlit, since not run is not a pass (C2). Texture is history: one `<pattern>` for hatching and one for stipple, both in a neutral ink, overlaid on every organelle that carries a value at an opacity proportional to it and full at a churn of 3 or a bug-fix rate of 0.5, so a measured zero draws nothing. The stain deliberately has no rim of its own: the rim is where evidence draws, so a git-only map's stained disc has no outline rather than one that could be read as a closed skin. Every list is sorted by path and the glow's opacity is `0.45 × 0.6^hops`, which stays strictly decreasing at two decimals seven crossings out; a test walks that sequence. The stain is a circle at the organelle's radius, so a dented file keeps its teeth in the base grey and shape stays conformance. The mutant dent is §5.2's own "soft dent", drawn as a dark bite in the evidence light rather than as a pulled vertex, for the same reason.

  **2.** A package's glow is cut around the cells it holds, so util stays dark under a reached libs/core

  D45 makes a package's contour a ring around all of its descendants, so filling `package:libs/core` at one hop would have lit `util/` too, which the reach never enters and which the map draws as a ghost. Each reached cell's glow is therefore its own territory: the contour with its direct children's contours appended as subpaths under `fill-rule="evenodd"`, so a child the reach entered glows on its own at its own hop and a child it did not enter stays dark. The first render had util lit; the second does not, and the test asserts the package path carries two holes and the folder's none. The glows are laid dimmest first, so the changed cell's light lands on top, and each `via` file is lit as a disc just past its edge. Where the barrel sits inside the changed cell, as both of the demo's do, the crossing reads as a brighter spot in the cell's own glow rather than as a separate light; that is the geometry, not a gap.

  **3.** The skin is a dark open ring with the closed arc laid over it, because a pale arc alone vanished against the glow

  The first pass drew the coverage arc as a pale stroke on the organelle's own edge, and at 2× it was invisible: the changed cell glows warm white under it and the stain is a light cyan, so a pale arc had nothing to contrast with. The skin is now a ring one pixel past the edge, drawn first as an open ring in the field's own dark and then as the closed arc over it, from the top clockwise, using `pathLength="1"` so the dash length is the fraction itself and a test reads it straight off the attribute (`0.57 1` for 4 of 7). The gap now reads as a gap even over a lit cell, and a survived mutant is a bite through both. The mutant dents lost the pale rims the first pass gave them, which at 2× read as a pair of eyes; the stitches grew from 7 to 8 pixels at a stroke of 2 so a torn one is legible at 1×. A file whose coverage entry has no changed executable line gets no ring rather than a closed one.

  **4.** A red slot naming a test file hangs its storm over the cells that test stitches

  A scoped slot names files, and the done-when hangs its storm over their cells. Three kinds of named file have no cell of their own: a test file, which is evidence and has no place on the field (D4); a shore file, which has a group; and a path the map does not know. The storm resolves a test file through `evidence.stitches` to the cells of the files it imports, which is a join on data the map already carries and not an invention, so the demo's red `test` slot, scoped to `pm.test.ts`, hangs over `pm/`, exactly where its three torn stitches are; a shore file hangs its storm over its group's contour; an unknown path hangs nothing. Global red slots stack at the field's top-right corner with the label to the left of the bolt, and two slots naming one cell stack above it. Green and skipped slots draw nothing, and a test asserts the demo's six green slots and one skipped slot hang no storm.

  **5.** Three paths outside the seam: the tokens, one exported pathOf, and the greyscale test scoped to the terrain

  The weather's colours, widths and spacings went into `libs/svg/src/tokens.ts`, whose header names it the single source of every colour and size the still renderer draws with and which step 21 documents; a second home for them in `weather.ts` would have been the drift D51 warns of. `terrain.ts` changed by one word, `export` on `pathOf`, so the glow is traced through the very same path the membrane is, and the two can never disagree. Step 17's test that every colour in the output is greyscale and dim now reads only the markup before `id="weather"`, since the weather is luminous by design; the assertion on the terrain is unchanged. Two things worth your eye are parked rather than built: added and modified stains are the same disc, distinguished only by `data-kind`, and the global storms sit in the corner step 19's HUD may want.

- 2026-09-22 — step 19 checkpointed · eb0ef7240 — feat(svg): render the notice labels and the HUD grade blocks (1 drift, 71m)

  **Summary**: `#chrome` now frames the world: a strip of nine grade blocks across the top in §7's order, the category solid in its hue with its letters on it and every other block outlined with a bold numeral, a block muted to a dash when its input is absent, stale, empty or head-only; a column of at most six notice rows down the right, each a numbered tier box, the target, the kind in small caps, the why and the thresholds that produced it; one dotted leader from each row's box to the same numbered box beside its target on the map; and on the map a thin ring in the category hue and the kind written under the primary's box, a thick ink ring round a secondary, the box alone for a tertiary. Fifteen tests assert the block order, the numbers, the muting, the six-row cap, one leader per placed notice, the tier emphasis, that nothing under `#chrome` grades, filters, fades or animates, and a golden per category; the render was checked by eye for IFR, VFR and NOINST, and the gate is green in full.

  1. The chrome frames the world instead of overlaying it, so the storms keep the field's corner and STORM_INSET is untouched
  2. Every HUD number is read from the map, and a muted block names why in `data-reason`
  3. The primary's ring and label borrow the category hue, so hue keeps its one meaning
  4. Each notice is one numbered box in its row and beside its target, joined by one dotted leader, and a target carries one ring for its strongest tier
  5. Two lines of `render.test.ts` strayed outside the seam, and the five goldens regenerate with one env var

  **Readout**: Step 19 - feat(svg): render the notice labels and the HUD grade blocks

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    honored
               - D12 (materials)
               - D23 (head-only-check)
               - D41 (artifact-trust)
               - D48 (shore-groups)
               - D9 (thresholds)
               - D6 (flight-categories)
               - D33 (svg-package)
               - D11 (mood)
  constraints  11 of 11 honored
  seam         strayed: 1 path outside the seam
               → libs/svg/src/__tests__/render.test.ts
  diff         +2510 -14 across 11 files
  spent        71 min · 1 turn · 9s gate · green first run
  ```

  **Verdict**: ◐ A hair off (seam strayed)

  **Recommendation**: Approve and checkpoint. The gate is green in full, every element the done-when names is drawn in its order and asserted on the demo map or a hand-built one, the three states were checked by eye at 2×, and the two strays are the render test's own assumptions about a world-sized canvas.

  **1.** The chrome frames the world instead of overlaying it, so the storms keep the field's corner and STORM_INSET is untouched

  The build-order note expected the HUD to take the field's top-right corner from the global storms. Overlaying the strip on the world would have covered the shore, whose groups run along the top and reach the corner on a wide repo, so the chrome is a frame instead: the canvas is the world plus a HUD strip above it and a 300-pixel notice column beside it, the world is set down under the strip by a `translate`, and a hard rule runs where each meets the field. The strip is one row on the demo's 780-pixel canvas and wraps only when a canvas is too narrow for the blocks, so a wide Size numeral cannot push a block off the sheet. Nothing in `#world` moved and no storm token changed; the note is resolved by the framing rather than by a new inset. The whole sheet sits on one flat `#ground` rect drawn first, a shade above the field so the frame reads as chrome and the world as a dark window in it.

  **2.** Every HUD number is read from the map, and a muted block names why in `data-reason`

  `Checks n/m` counts the slots that passed over the slots that ran, so a skipped slot is in neither (the demo reads 6/8 with security skipped); `Patch cov` is the covered share of every changed executable line over the whole change; `Mutants k survived` is the length of `evidence.mutants`, the live mutants core already joined to the changed lines; `Reach` counts distinct cells; `Size` sums the changed set with a true minus sign; `Notices p·s·t` tallies the six drawn; `Other n` appears only when the `other` group has files. A block mutes with `data-muted="true"`, the dash in place of its numeral and a `data-reason` of `absent` (no `.check/` trusted, or the channel never produced), `stale` (the owning slot is named in `meta.instruments.stale`, checked before the value so it fires even if a map ever carried both), `empty` (coverage that measured no executable line, which has no share to report) or `head-only` (the Health Δ block, D23). The category block is never muted: NOINST is a verdict, so its letters sit on the muted grey with no hue rather than on a dash.

  **3.** The primary's ring and label borrow the category hue, so hue keeps its one meaning

  §5.4 gives the primary a saturated hue and C11 says hue means state and nothing else, so rather than mint an attention hue the primary's ring, its box and its label take the verdict's own: red on an IFR map, green on a VFR one, and plain ink on NOINST, which has no hue. That keeps the map's one red thing the IFR thing, and the letters still ride beside every hue in the category block. VFR green and MVFR blue are new tokens beside the IFR and LIFR hues from step 18; the blue is set apart from the change cyan so the two never read as one. The tertiary box on the map is a small dark box with a muted frame, so it marks without shouting.

  **4.** Each notice is one numbered box in its row and beside its target, joined by one dotted leader, and a target carries one ring for its strongest tier

  The boxes hang off the lower right of a placed file, just past the emphasis ring, clear of the clone glyph at the upper right, the old name at the right and the stitches below, and flip to the lower left when a run would leave the field; under a skinned group they hang from its foot. Several notices on one target line up side by side in rank order, so the demo's `pm/index.ts` reads `[1][2][3]` with `deleted-export` under them, and its skin carries one ring for the strongest tier rather than three nested ones. The leaders are laid under the rows and the marks, so each visibly ends where its box begins, and a test checks every leader's two ends against the two box centres. A target the field cannot place, a global slot's name say, keeps its row with `data-unplaced="true"` and gets no leader and no mark; pointing it at the slot's storm is parked, since that anchor lives in `weather.ts`. Rows are word-wrapped from the monospace estimate the blocks are sized by (C5), and a lone word past the budget is cut rather than left to run off the column.

  **5.** Two lines of `render.test.ts` strayed outside the seam, and the five goldens regenerate with one env var

  The canvas is no longer the world's size, so the render test's `viewBox="0 0 480 660"` prefix now checks only the prefix (the field's own 480×660 is still asserted on the rect), and its label round-trip on the awkward map now reads the world's text only, since the chrome writes text of its own. Nothing else outside the seam moved. The demo golden is regenerated and four more sit under `fixtures/categories/`, each the demo with its verdict swapped by the test's own `variant` (green slots and passed stitches for VFR and MVFR, nothing trusted for NOINST); `ATIS_UPDATE_GOLDENS=1 pnpm vitest run libs/svg` writes them all back, which is the recipe the test header records.

- 2026-09-22 — step 20 checkpointed · 024ec73e1 — feat(cli): add --svg and --open to write and show the static render (1 drift, 8m)

  **Summary**: `atis --svg <file>` now renders the built map to a still SVG in the same run that writes `map.json`, and `--open` hands that SVG to the platform viewer as a no-op under tests. Wiring the existing `renderSvg` in made `svg` a workspace dependency of `apps/atis`; the gate is green and an end-to-end run against this repo writes both outputs and exits 0 (VFR).

  1. `--svg <file>` renders the map in the same run that writes it
  2. `--open` opens the SVG and no-ops in tests
  3. Wiring the renderer touched two files outside the seam
  4. The done-when's `#world`/`#chrome` is a selector, so the test reads the ids

  **Readout**: Step 20 - feat(cli): add --svg and --open to write and show the static render

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    honored:
               - D33 (svg-package)
               - D18 (delivery)
               - D24 (layout-in-core)
  constraints  11 of 11 honored
  seam         strayed: 2 paths outside the seam
               - apps/atis/tsconfig.json
               - pnpm-lock.yaml
  diff         +91 -3 across 6 files
  spent        8 min · 1 turn · 13s gate · green first run
  ```

  **Verdict**: ◐ A hair off (seam strayed)

  **Recommendation**: Approve and checkpoint step 20. Every done-when clause is verified against this repo and the gate is green; the only latitude taken, the two out-of-seam wiring files and the id-selector reading of the done-when, is disclosed above.

  **1.** `--svg <file>` renders the map in the same run that writes it

  `run.ts`, after the atomic `map.json` write, renders the already-built map with `renderSvg` from the `svg` package and writes the SVG atomically too. The stdout line now names both outputs (`wrote map.json and atis.svg`) and `--verbose` gains `render` and `write svg` timings.

  **2.** `--open` opens the SVG and no-ops in tests

  A detached, best-effort `open` (macOS) / `xdg-open` (elsewhere) spawn that swallows a missing opener so it never changes the exit code (C4), and returns early under `VITEST`/`NODE_ENV=test` so the suite launches nothing. `--open` without `--svg` is misuse (exit 2), guarded at the flag layer.

  **3.** Wiring the renderer touched two files outside the seam

  Adding `svg` as a `workspace:*` dependency of `apps/atis` (in seam: `package.json`) also required a project reference in `apps/atis/tsconfig.json` and a `pnpm-lock.yaml` entry from `pnpm install`, both outside the declared seam but mechanically required to resolve and build against the composite `svg` project. It adds no npm dependency (C9): `svg` is the internal renderer package of D33.

  **4.** The done-when's `#world`/`#chrome` is a selector, so the test reads the ids

  The renderer emits `<g id="world">` and `<g id="chrome">`, not a literal `#world`; the plan uses the `#`-prefix the way `intent.md` names groups throughout, so the test asserts `id="world"` and `id="chrome"` are present rather than a substring that never appears.

- 2026-09-22 — step 21 checkpointed · e52a61404 — docs(design): record the colour and chrome tokens the SVG settled (1 drift, 20m)

  **Summary**: The look the SVG settled on is now recorded. `libs/svg/src/tokens.ts` is the single source of every colour, stroke, font and size the renderer draws with (three stray literals extracted, one duplicated constant folded in), and `docs/design.md` documents all 99 tokens by channel and where each appears, held to completeness by a test. The rendered bytes did not change, so the goldens still hold.

  1. tokens.ts is now the single source
  2. design.md documents every token, written from the SVG
  3. A test holds the doc to the file
  4. Motion (§5.5) tokens deferred on purpose
  5. Three renderer files edited beyond the seam

  **Readout**: Step 21 - docs(design): record the colour and chrome tokens the SVG settled

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    3 of 3 honored
  constraints  11 of 11 honored
  seam         strayed: 3 paths outside the seam
               - libs/svg/src/chrome.ts
               - libs/svg/src/patterns.ts
               - libs/svg/src/weather.ts
  diff         +268 -14 across 6 files
  spent        20 min · 3 turns · 14s gate · green first run
  ```

  **Verdict**: ◐ A hair off (seam strayed)

  **Recommendation**: Approve and checkpoint step 21. The gate is green on all eight slots, the rendered SVG is byte-identical so the goldens still hold, and a test now keeps the doc naming every token the renderer reads.

  **1.** tokens.ts is now the single source

  An audit of the renderer turned up no stray hex colours, but three visual literals lived outside the file: the hatch stroke width, the chrome hairline (the framed HUD block, the tertiary notice box and the hard rule all drew it as a bare `1`), and the arrowhead's rendered size. These became `HATCH_WIDTH`, `CHROME_STROKE_WIDTH` and `ARROW_SIZE`. A fourth, the `0.35` baseline share, was duplicated in `weather.ts` and `chrome.ts`; it is now one `LABEL_BASELINE`. Each new token is named by its meaning and placed in its channel's section.

  **2.** design.md documents every token, written from the SVG

  The doc opens on the two materials (D12) and the one-meaning-per-channel rule (C11), then runs a table per channel (type, base tissue, state, reach and evidence, history, ghosts and storms, chrome), each row a token with its value and where it lands in the SVG's named groups. A closing section lists the fixed geometry that carries no token (the clone glyphs, the arrowhead triangle, the glow filter region) so the inventory reads as complete on purpose.

  **3.** A test holds the doc to the file

  `tokens.test.ts` reads `design.md` and asserts every export of `tokens.ts` is named in it, with word-boundary matching so `NOTICE_BOX` is not satisfied by `NOTICE_BOX_GAP`. It is the forward direction only: the doc deliberately also names non-token geometry, which a reverse check would flag.

  **4.** Motion (§5.5) tokens deferred on purpose

  D51 makes `tokens.ts` the shared home for the motion constants "from step 21 on", but this build does not touch §5.5 (the still renderer animates nothing, C10) and Q3 stays open by Rob's choice as the log of his balance patches. So no motion numbers were invented; step 21 establishes the file as their future home and leaves the values to the phase 1b spike (C2).

  **5.** Three renderer files edited beyond the seam

  `chrome.ts`, `weather.ts` and `patterns.ts` were edited to read the newly extracted tokens. That is outside the declared seam paths but is what the done-when's "single source" requires; the values are unchanged, so the rendered bytes and the goldens are untouched.

- 2026-09-22 — step 25 checkpointed · 29c322c9d — fix(core): weigh missing co-change notices by rate and support (1 drift, 21m)

  **Summary**: The missing-cochange notice is now weighed by the two numbers a ghost actually has, how often and how reliably it co-changed, so the co-change budget stops being settled by the path alphabet; the deleted-export line now reads as English when a single file still imports the removed symbol.

  1. The ghost's weight is now severity × (1 + rate) × (1 + log(1 + support))
  2. The deleted-export why pluralises its consumer count
  3. A test proves the alphabet lost
  4. The pluralisation cascaded to six goldens beyond the seam

  **Readout**: Step 25 - fix(core): weigh missing co-change notices by rate and support

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    2 of 2 honored
  constraints  11 of 11 honored
  seam         strayed: 6 paths outside the seam
               - libs/core/fixtures/demo/map.json
               - libs/svg/fixtures/categories/LIFR.svg
               - libs/svg/fixtures/categories/MVFR.svg
               - libs/svg/fixtures/categories/NOINST.svg
               - libs/svg/fixtures/categories/VFR.svg
               - libs/svg/fixtures/demo/atis.svg
  diff         +105 -16 across 8 files
  spent        21 min · 1 turn · 13s gate · green first run
  ```

  **Verdict**: ◐ A hair off (seam strayed)

  **Recommendation**: Approve and checkpoint. The formula and the pluralisation are exactly D55 and the done-when, the new test shows rate and support beat the path sort, and the six regenerated goldens are the deterministic consequence of the mandated `why` change, each carrying only the one-versus-many flip.

  **1.** The ghost's weight is now severity × (1 + rate) × (1 + log(1 + support))

  `rankNotices` branches `missing-cochange` to a new `cochangeWeight`, while every other kind keeps §5.4's reach, coverage and churn factors. A ghost is the file that did *not* change, so those three factors are all zero for it; its `inputs` now carry rate and support alone, with no zeroed factors dragged in, beside the `cochange_rate` and `cochange_support` thresholds (D9).

  **2.** The deleted-export why pluralises its consumer count

  A small `stillImports` helper renders `1 file still imports it` for a lone consumer and `3 files still import it` otherwise, replacing the old always-plural `N files still import it`.

  **3.** A test proves the alphabet lost

  Four equal-severity ghosts, and the one at rate 0.857 over 6 commits ranks above the one at rate 0.5 over 2 in both path orderings (strong sorted last, then strong sorted first). The pluralisation is pinned for one and three consumers alongside it.

  **4.** The pluralisation cascaded to six goldens beyond the seam

  The demo map's lone-consumer `why` changed, and the five SVG goldens render that same core map, so all six were regenerated deterministically through the sanctioned `ATIS_UPDATE_GOLDENS=1` path; the only change in each is `1 files still import it` → `1 file still imports it` (the SVG wrap re-broke `import it` → `imports it`). `fixtures/checkride-pr4/map.json` is left for step 22 to regenerate, as the plan asks.

- 2026-09-22 — step 26 checkpointed · 872f2e4a0 — fix(core): send TypeScript config files to the config shore group (30m)

  **Summary**: A `.ts`/`.tsx` that configures a tool now reads as shore, not terrain: `classifyFile` consults the shore's `config` row and returns `other`, so a `vitest.config.ts` founds no cell, sits on no terrace, and lands in the `config` group. The rule has one home (the config table) and stays override-aware, and it cost no new import edge, so the `dead` slot stays green.

  1. `classifyFile` reads the `config` row through an injected matcher (D57)
  2. The matcher is single-source and override-aware (D48, D28)
  3. Config files enter neither depth nor reach
  4. No cycle, and the seam stayed loose
  5. One flag: the no-table path and the fixture

  **Readout**: Step 26 - fix(core): send TypeScript config files to the config shore group

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    3 of 3 honored
  constraints  11 of 11 honored
  seam         held: 5 of 7 declared, no strays
  diff         +100 -25 across 5 files
  spent        30 min · 1 turn · 15s gate · green first run
  ```

  **Verdict**: ● Plumb

  **Recommendation**: Approve and checkpoint. The done-when is met with the gate green and the demo golden byte-identical, the rule has a single home and honors overrides, and the diff stayed inside the seam.

  **1.** `classifyFile` reads the `config` row through an injected matcher (D57)

  `classifyFile(path, isConfig?)` gains an optional predicate: a `.ts`/`.tsx` that matches the `config` row is `other`, checked after the test read so a `*.config.test.ts` stays evidence (D4). The predicate is injected rather than imported, so `modules.ts` stays a leaf and nothing new points back into it.

  **2.** The matcher is single-source and override-aware (D48, D28)

  `configMatcher(rules)` in `groups.ts` compiles the `config` row's own patterns with the glob compiler already there, so there is no second copy of the rule to drift, and `buildMap` builds it from the reviewed repo's `config.groups` — an `atis.config.json` override of that row moves the terrain/shore boundary with it.

  **3.** Config files enter neither depth nor reach

  `buildMap` threads the matcher into `identifyModules` (no cell), hands `computeDepth` the file list and edges with config paths filtered out (no terrace), and `identifyGroups` claims the file for `config`. Reach needs no change: a file that founds no cell is skipped by the walk and routed to its group by the existing shore logic.

  **4.** No cycle, and the seam stayed loose

  Passing a predicate (not importing the compiler into `modules.ts`) kept the module graph acyclic, which `dead` confirms. `config.ts` and `reach.ts` were in the seam as orientation but needed no change: `CONFIG_GROUP_ID` sits beside `OTHER_GROUP` in `groups.ts`, matching the existing style.

  **5.** One flag: the no-table path and the fixture

  Two older `identifyModules` tests still pass config-named files without the table, exercising the name-only fallback the graph sources take; the new tests cover the with-table (D57) behavior. The committed `fixtures/checkride-pr4/map.json` still carries the old `directory:.`/`package:.` shape and is left for step 22 to regenerate, as the done-when directs.

- 2026-09-23 — step 22 checkpointed · 78cf4061c — chore(fixtures): generate map.json and the SVG for five historical PRs (1175m)

  **Summary**: Five fixtures now sit under `fixtures/<repo>-pr<n>/`, each with a `map.json` that passes `assertMap`, an `atis.svg`, a `README.md`, and a `truth.md`, and `docs/glance-test.md` lists all five with their ground truth beside the §11 protocol, ready for step 23. They were built by running the step-14 worktree procedure against real checkride and fascicle history, and they span every flight category — MVFR, IFR, LIFR, and two NOINST — because each reads the repo's real state rather than a tuned one. The gate is green across all eight slots.

  1. The five span every category by using each repo's real state, not by tuning
  2. checkride PR 4 came back MVFR, not step 14's IFR, exactly as D56 intended
  3. checkride PR 2 is a git-only LIFR, and it is parked
  4. fascicle is git-only too, yet its terrain is full, and PR 4 has the one review
  5. truth.md is drafted from history, every unconfirmed line marked needs Rob

  **Readout**: Step 22 - chore(fixtures): generate map.json and the SVG for five historical PRs

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    3 of 3 honored
               - D44 (ground-truth-source), D43 (scan-roots), D41 (artifact-trust)
  constraints  11 of 11 honored
  seam         held: 2 of 2 declared, no strays
  diff         +109575 -239 across 21 files
  spent        19h 35m · 1 turn · 15s gate · green first run
  ```

  **Verdict**: ● Plumb

  **Recommendation**: Approve and checkpoint. The gate is green, all five maps pass `assertMap` with a real spread across the categories, and the ground truth is drafted honestly and left to Rob rather than overclaimed, which is what step 23 needs to run round one.

  **1.** The five span every category by using each repo's real state, not by tuning

  checkride PR 4 is MVFR, PR 5 IFR, PR 2 LIFR; fascicle PR 4 and PR 5 are NOINST. Two carry
  real checkride evidence, one has evidence atis cannot read, two are git-only workspaces.

  **2.** checkride PR 4 came back MVFR, not step 14's IFR, exactly as D56 intended

  Skipping the `security` slot drops the calendar's 15 advisories, so the regenerated map
  carries the PR's weather (covered lines, bounded reach) instead of the lockfile's age.
  `mutation` is skipped and named because stryker ran past ten minutes without completing, so
  D56's "where the run completes" applies; `format` is checkride's own default skip.

  **3.** checkride PR 2 is a git-only LIFR, and it is parked

  checkride v0.1.1's `.check/summary.json` declares `schema_version: 1` but omits `checks_run`,
  which atis's schema-1 parser requires, so atis reads it `harness_broken` and falls to
  git-only (D41). The map's LIFR is the unreadable harness, not the two-file change — a real
  confound for step 23, parked for `/plumbbob:refine`.

  **4.** fascicle is git-only too, yet its terrain is full, and PR 4 has the one review

  fascicle's own `scripts/check.mjs` writes a summary with no `schema_version`, so atis reads
  it git-only whether or not it runs — no install needed. D43's workspace-member scan still
  draws the whole 117-cell workspace from `examples/pr-improve`, and PR 4 carries a real
  7-suggestion review (run_shell byte cap/timeout, symlink TOCTOU) that is the richest ground
  truth of the five.

  **5.** truth.md is drafted from history, every unconfirmed line marked needs Rob

  Each `truth.md` lists the follow-up commits within the next thirty that touch the PR's files,
  with subject and stat; reasons are cautious and marked **needs Rob** for Rob to confirm
  before step 23, and the two calm PRs (checkride 2, fascicle 5) are recorded as such. The loud
  `other` residual (D48) is parked: it ranks *primary* on fascicle PR 5's small change.

- 2026-09-24 — step 27 checkpointed · 2d5e63ff1 — fix(svg): point a global-slot notice's leader at its storm marker (12m)

  **Summary**: A notice that names a red global slot rather than a file now points somewhere. `weather.ts` exports `globalStormAnchors`, the field-corner position each global slot's storm already hung at, and draws its own storms from it, so the two can no longer drift. `chrome.ts` reads that map as a third and last fallback in `anchorOf`, which turns the slot notice into an ordinary point anchor and lets the existing leader and mark geometry carry it the rest of the way. The five goldens render byte for byte, so nothing that was already pointing at an organelle moved.

  1. The corner the storms hung at is now a named export rather than an inline expression
  2. A slot-named notice becomes an ordinary point anchor, so it gets the leader geometry unchanged
  3. A slot with no storm still gets no leader, which is the C2 half of the change
  4. The test pins the pointing case and both not-pointing cases
  5. Two committed fixtures will gain leaders when step 30 regenerates them

  **Readout**: Step 27 - fix(svg): point a global-slot notice's leader at its storm marker

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    2 of 2 honored
  constraints  11 of 11 honored
  seam         held: 3 of 3 declared, no strays
  diff         +101 -14 across 3 files
  spent        12 min · 1 turn · 14s gate · green first run
  ```

  **Verdict**: ◐ A hair off (2 commits outside the ledger)

  **Recommendation**: Approve and checkpoint. The gate is green, the diff is the three seam files and nothing else, and the five goldens render byte for byte, so the only thing still moving is the fixture refresh step 30 already owns.

  **1.** The corner the storms hung at is now a named export rather than an inline expression

  `drawStorms` computed `layout.width - STORM_INSET` and its stacking row inline, in the branch that draws a `scope: global` slot. That expression is now `globalStormAnchors(weather, layout)`, a `ReadonlyMap<string, Position>` from slot name to the bolt's own spot, and `drawStorms` maps over the same sorted red-slot list and reads its corner from there. The stacking order is unchanged by construction: the exported map indexes the global red slots in the same name order the storms are drawn in, which is what the old `row('field')` counter counted. A `STORM_RADIUS` of 6, the bolt glyph's own half height, sits beside `STORM_GLYPH` rather than in `tokens.ts`, since it is a property of that path string and the glyph already lives here.

  **2.** A slot-named notice becomes an ordinary point anchor, so it gets the leader geometry unchanged

  `anchorOf` tried the layout's positions, then its contours, then gave up. It now tries the storm anchors last, and a hit returns `{ kind: 'point', at: storm }`. Everything downstream is untouched: `marksFor` hangs the run off the anchor, flips it to the lower left because the field's right corner leaves no room on the right, `boxCentre` finds the box, and `drawLeaders` draws the same dotted line it draws for a file. A file wins a name collision, since positions and contours are keyed by path and only the third lookup is keyed by a slot.

  **3.** A slot with no storm still gets no leader, which is the C2 half of the change

  The anchor map holds only slots that are red and not skipped, the exact condition a storm is drawn under. A notice naming a green global slot, or a name no slot in the map claims, finds nothing, keeps its `data-unplaced="true"` row and draws no leader and no mark. That is deliberate: pointing at a corner where no bolt is drawn would be a mark with nothing behind it.

  **4.** The test pins the pointing case and both not-pointing cases

  The new test turns the demo's `lint` slot red, hands the sixth notice its name, and asserts three joins: the bolt is at `(width − STORM_INSET, STORM_INSET)` in `#storms`, the sixth leader ends exactly at the centre of the sixth mark, and that mark sits to the storm's left rather than off an organelle. It also re-checks that the primary's mark is still at its own file. The pre-existing case that used a green `lint` was retargeted to an unclaimed name so it keeps testing "no slot claims this", and a green-slot case was added beside it. Reverting the `anchorOf` branch fails the new test and nothing else.

  **5.** Two committed fixtures will gain leaders when step 30 regenerates them

  `fixtures/checkride-pr2/` carries two global-slot notices (`dead`, `snippets`) and `fixtures/fascicle-pr5/` carries one (`attw`); those three rows are exactly the ones drawing no leader today. Their `atis.svg` files are left untouched here, as the done-when asks. The five `libs/svg` goldens are unaffected, because no map behind them pairs a red global slot with a notice naming it.

- 2026-09-24 — step 28 checkpointed · 2e2d6bf5b — fix(core): send plugin, MCP and bench JSON to their shore groups (4m)

  **Summary**: Six patterns joined the default shore table and the loud `other` residual now empties on all five fixture repos. `.claude-plugin/**` goes to `prompts`, `.mcp.json` with `.ridgeline/**` and `.codegraph/**` to `config`, and `bench/**` with `*.schema.json` and `*-schema.json` to `data`. `groups.ts` needed no change: step 24's `except` support and the glob compiler already carry everything the new rows ask for, so this is a table edit plus its tests.

  1. The agent-era folders sort by what they steer, not by extension
  2. flow-schema.json is claimed, not left loud
  3. The residual verified against the five committed maps, not just the tests
  4. One move the step did not ask for, pinned on purpose
  5. The D48 decision text is left as the plan-time record

  **Readout**: Step 28 - fix(core): send plugin, MCP and bench JSON to their shore groups

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    2 of 2 honored
  constraints  11 of 11 honored
  seam         held: 2 of 3 declared, no strays
  diff         +48 -2 across 2 files
  spent        4 min · 1 turn · 14s gate · green first run
  ```

  **Verdict**: ● Plumb

  **Recommendation**: Approve and checkpoint. The check is green, the residual empties on every fixture, and the one move beyond the brief is named above with a one-line undo if you want it the other way.

  **1.** The agent-era folders sort by what they steer, not by extension

  `.claude-plugin/` packages prompts and skills, so it joins `prompts` beside `.claude/**` and inherits that row's `hooks/**` exception, which keeps a plugin's hook scripts in `scripts` exactly as step 24 left them. `.mcp.json`, `.ridgeline/**` and `.codegraph/**` configure a tool the way `fallow.toml` does, so they join `config`. `bench/**` is a benchmark corpus, which is recorded input and output rather than code, so it joins `data`.

  **2.** flow-schema.json is claimed, not left loud

  The step asked me to rule on `packages/core/src/flow-schema.json` either way. It is a JSON Schema document (`$schema`, `$defs`, a `title` of "fascicle Flow DSL"), and D48 already sends `schema/**` to `data`, so the kind is settled and only the location was novel. Claiming `*.schema.json` and `*-schema.json` for `data` says a schema is data wherever it sits, which also empties fascicle's residual completely rather than leaving one file behind. The alternative, a new row for schemas, would have added a group id to the table for a single file, and the narrow globs avoid blanket-claiming `*.json`.

  **3.** The residual verified against the five committed maps, not just the tests

  I re-sorted every shore path out of each committed `map.json` through the new table in a scratch test. `other` comes back empty on all five, and nine files move in total: one `.claude-plugin/plugin.json` on each checkride fixture, seven on each fascicle fixture. That scratch test is deleted; the committed fixtures are untouched, left for step 30 as the done-when asks.

  **4.** One move the step did not ask for, pinned on purpose

  `.codegraph/.gitignore` moves from `settings` to `config`, because `.codegraph/**` is tried before the `settings` row's bare `.gitignore`. That is the table's existing grain rather than a new wrinkle: `.claude/**` and `.vale/**` already outrank `settings` for everything inside them, and a tool's own ignore file belongs with the tool. I pinned both it and the root `.gitignore` in the test so the boundary is deliberate. Say the word and I will except it instead.

  **5.** The D48 decision text is left as the plan-time record

  Step 24 changed the same table and amended only its own step checkbox in `intent.md`, not D48's enumerated defaults, so the decision reads as what was decided on 2026-09-16 and `config.ts` is the live table. I followed that precedent rather than editing the decision under it.

- 2026-09-24 — step 29 checkpointed · 35e3faa91 — fix(cli): name --svg and --open in the usage text (6m)

  **Summary**: The shipped `--help` now names the two flags step 20 added: `--svg <file>` and `--open` sit between `--out` and `--verbose`, on the same one-line-per-flag grid as everything else, and `--open`'s line carries its prerequisite. Two lines of string and two test assertions; no behaviour moved.

  1. Both flags land in the parser's order, on the column the other six already use
  2. The --open line names its prerequisite in the words the misuse message already uses
  3. The test walks all eight flags and pins the --open line on its own
  4. The step asked for haiku and this ran on Opus 5

  **Readout**: Step 29 - fix(cli): name --svg and --open in the usage text

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    1 of 1 honored
  constraints  11 of 11 honored
  seam         held: 2 of 2 declared, no strays
  diff         +17 -1 across 2 files
  spent        6 min · 1 turn · 14s gate · green first run
  ```

  **Verdict**: ● Plumb

  **Recommendation**: Approve and checkpoint. The check is green first run, the real `--help` was run and read back, and the change is two documentation lines and their tests inside the declared seam.

  **1.** Both flags land in the parser's order, on the column the other six already use

  `cli.ts` declares its options `repo, base, out, svg, open, verbose, version, help`, so the two new lines go after `--out` and before `--verbose` and the help text reads in the same order the parser does. Every description in that block starts at column 18, and `--svg <file>` and `--open` are padded to match, so the column is unbroken. I built `apps/atis` and ran the real `node dist/cli.js --help` rather than trusting the string in isolation: the grid holds in a terminal.

  **2.** The --open line names its prerequisite in the words the misuse message already uses

  `cli.ts` refuses `--open` without `--svg` with `atis: --open needs --svg <file>`, and that refusal prints `USAGE` underneath it. The line now reads `open the rendered SVG in the platform viewer (needs --svg)`, so a reader who trips the refusal finds the same phrase in the text printed below it instead of a second wording for one rule. Naming the viewer rather than the mechanism keeps the line honest about what the flag does without promising which opener runs, which is `open` or `xdg-open` by platform and best-effort either way.

  **3.** The test walks all eight flags and pins the --open line on its own

  The existing `the usage text names every flag the bin parses` test grew from six entries to eight; past 120 columns as one line, it reformats to one flag per line, which is why its diff is larger than the two entries it gained. That loop proves both flags are named but not that `--open` explains itself, so a second test finds the `  --open` line in the text and asserts it contains `--svg`. Splitting them means a future edit that drops the prerequisite fails with the reason in the test name rather than inside a loop over eight strings.

  **4.** The step asked for haiku and this ran on Opus 5

  The plan's `- model: haiku (one string and its test)` was the right call for the size of this change, and the session model was never switched. Nothing about the diff needed the bigger model; flagging it so the record matches what actually ran. No action needed unless you want the step rebuilt to honour the recommendation.

- 2026-09-24 — step 30 checkpointed · 73fe57332 — chore(fixtures): refresh the five maps after the render and shore fixes (19m)

  **Summary**: All five fixtures re-ran through the D58 procedure recorded in their own READMEs, and every `map.json` passes `assertMap`. The refresh is remarkably contained: every category, every terrain and weather count, every cell membrane, every band assignment and every one of the organelle positions came back unchanged on all five. Only the shore repacked, and only one notice moved — checkride PR 4 drops from six to five, because its sixth was the loud `other` residual that step 28 has now claimed. The `other` group is empty on all five maps, which is what this step was sent to confirm.

  1. The `other` residual is gone from all five, and only checkride PR 4 paid a notice for it
  2. Step 27's leaders landed on exactly the three notices that needed them
  3. Both fascicle maps are 18 units narrower, and the shore is why
  4. One group move step 28 did not name, recorded rather than left unexplained
  5. The reconciliation covers the five-row table by confirming it needs no change

  **Readout**: Step 30 - chore(fixtures): refresh the five maps after the render and shore fixes

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    honored:
               - D58 (fixtures-current-toolchain)
               - D56 (fixtures-skip-audit)
               - D48 (shore-groups)
  constraints  11 of 11 honored
  seam         held: 2 of 2 declared, no strays
  diff         +1189 -1326 across 21 files
  spent        19 min · 1 turn · 14s gate · green first run
  ```

  **Verdict**: ● Plumb

  **Recommendation**: Land it. The gate is green, the done-when is met point by point, and the refresh turned out to be a narrow one: the terrain is byte-stable across all five, so the only things step 23 reads differently are the empty `other` residual, checkride PR 4's five-notice budget and three new leaders.

  **1.** The `other` residual is gone from all five, and only checkride PR 4 paid a notice for it

  Step 28's rules land exactly as its done-when predicted: `.claude-plugin/plugin.json` joins `prompts` on the two checkride maps, and fascicle's `.mcp.json`, `.ridgeline/settings.json` and `.codegraph/config.json` join `config` while `bench/reviewer/{baseline,cases}.json` and `packages/core/src/flow-schema.json` join `data`. checkride PR 4 is the only fixture that had ranked the residual into its notice budget, so it is the only one whose notice count moved, 6 down to 5 with nothing behind it to take the slot — C7 (budget) does not pad, and the README now says so. checkride PR 5 and both fascicle maps had `other` files but never a residual notice, because their sixth slot was already held by something weighing more than the residual's flat 2. checkride PR 2 had no residual at all, and its map came back unchanged apart from its two timestamps, which is a live confirmation of C3 (deterministic) on a re-run a day later.

  **2.** Step 27's leaders landed on exactly the three notices that needed them

  Three notices across the five maps target a slot rather than a file: `dead` and `snippets` on checkride PR 2, and `attw` on fascicle PR 5. Each now draws a dotted leader from its HUD row to the storm marker in the field corner, where before it was the one row on the map a reader could not trace to anything. checkride PR 2 gains two and fascicle PR 5 gains one; checkride PR 4 loses one, the leader that belonged to the residual notice. I noted in fascicle PR 5's README that this bears directly on the crowding question parked for step 23: the `attw` row is the one notice with nothing to do with the three changed files, and a reader can now see that it points at the whole field.

  **3.** Both fascicle maps are 18 units narrower, and the shore is why

  `terrain.layout.width` is the largest of a minimum, the shore extent and the terrain extent, and on fascicle's workspace the shore strip is what binds. Losing one group block shortened the strip, so the width fell from 672 to 654, the `viewBox` went from `0 0 972 1090` to `0 0 954 1090`, and the HUD column moved from x 687 to x 669. checkride's width is set by its terrain, so dropping a group there changed nothing. Fifty-seven shore marks took new grid positions on each fascicle map as the blocks resized around them, and I checked that none of them is an organelle: zero of the 165 moved, and the only contours that differ are shore-group contours.

  **4.** One group move step 28 did not name, recorded rather than left unexplained

  `.codegraph/.gitignore` moved from `settings` to `config` on both fascicle maps. It was never in `other`, so it is not part of the residual this step was clearing; it moves because the shore table is first-match and step 28's new `.codegraph/**` pattern on the `config` row now wins ahead of the bare `.gitignore` on the `settings` row below it. Grouping a tool's dotfolder with that tool's config is the reading D48's own ordering implies, so I let it stand and tabulated it in fascicle PR 4's README, rather than leave a `settings` count of 4 with no account of the fifth file.

  **5.** The reconciliation covers the five-row table by confirming it needs no change

  Every category in `docs/glance-test.md`'s five-row table survived the re-run, so the table itself is untouched; I recorded that explicitly in the prose above it along with the two deltas that do matter for round one, so step 23 can see the table was checked rather than merely left alone. Each fixture's `README.md` "What it says" and each `truth.md` comparison section now name their own shifts, and the two fascicle READMEs carry the seven-row group-move table and the width story.

- 2026-09-25 — step 23 checkpointed · fdfe6e1dc — chore(glance): run glance-test round one and record the verdicts (1616m)

  **Summary**: Round one ran with one reader and failed: Rob scored 2 of 5 against the history, and could not tell merge from hold at a glance. The map separated the five by the repository's standing state (storms, red, the Checks block, the category they drive) rather than by the change, and the change's own evidence was too quiet to compete. Four encodings to change are parked for refine, with two protocol changes for round two.

  1. Ground truth came from the commit messages, and two of my drafted verdicts were wrong
  2. The reader followed the map four times out of five, and the map was wrong on two of those
  3. Four encodings to change, each parked
  4. Two protocol changes for round two, parked beside them

  **Readout**: Step 23 - chore(glance): run glance-test round one and record the verdicts

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    bent: D44 (ground-truth-source)
               → truth read from the follow-up commits at Rob's ask, not recollection
  seam         held: 1 of 1 declared, no strays
  diff         +138 -29 across 1 file
  spent        26h 56m · 10 turns · 14s gate · green first run
  ```

  **Verdict**: ○ Out of plumb (decisions bent)

  **Recommendation**: Land step 23 as a recorded fail, then run `/plumbbob:refine` on the parked encodings. D38 says a fail parks the encodings rather than failing the build, and the round-two fixture change wants deciding before any encoding work, since the current five cannot score a fix fairly.

  **1.** Ground truth came from the commit messages, and two of my drafted verdicts were wrong

  Rob could not recall the PRs, so the verdicts come from what the follow-ups say. `aa2a08a` names "three defects in the tool-resolution work merged by #4 and #5", which makes both of those holds. `414f336` says fascicle PR 5 left `pnpm check` failing on main, so it is a hold, not the near-calm merge I had drafted. checkride PR 2 is a merge: nothing repaired it, and my earlier hold took the map's own notice as ground truth, which is circular.

  **2.** The reader followed the map four times out of five, and the map was wrong on two of those

  Rob merged checkride 4 and 5 and held the other three, reading calm against stormy. The map agreed with that on every PR except checkride 5, where it said IFR and flagged `src/doctor.ts`, the file `aa2a08a` later repaired, but the signal was one small open skin and "Checks 17/17" out-shouted it. On the fascicle maps 69 of 71 storms sit off the changed cell.

  **3.** Four encodings to change, each parked

  Standing-state storms outshout the change; the category is set by standing state, making four of five IFR; "Checks 17/17" reads as the verdict; the change's own evidence is too quiet for ten seconds.

  **4.** Two protocol changes for round two, parked beside them

  Fixtures from other projects' reviewed PRs, where the commit a reviewer asked changes on is a hold and the approved commit a merge, and a fixed one-minute legend before the first map.

- 2026-09-25 — step 31 checkpointed · d02e4cc8b — feat(cli): read npm, yarn and bun workspaces as scan roots (4m)

  **Summary**: When a repo has no `pnpm-workspace.yaml`, the scan now reads its members from the `workspaces` field in `package.json`. Both shapes work: the array npm and bun write, and yarn's `{ "packages": [...] }` object. They go through the same globbing and `!` exclusions as the yaml. Members still resolve by name and become `kind: package` cells, and the yaml wins when both are present.

  1. A pure `parseManifestWorkspaces` reads both shapes of the field
  2. `pnpm-workspace.yaml` wins as soon as the file exists
  3. `globToRegExp` now drops a leading `./`, which `git.ts` also picks up
  4. The tests assert members, name-resolved edges and package cells for each shape
  5. Parked: the dependency delta still reads only `pnpm-workspace.yaml`

  **Readout**: Step 31 - feat(cli): read npm, yarn and bun workspaces as scan roots

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    2 of 2 honored
               - D30 (pure-parsers), D42 (committed-files-vs-gate)
  constraints  11 of 11 honored
  seam         held: 2 of 2 declared, no strays
  diff         +153 -12 across 2 files
  spent        4 min · 1 turn · 14s gate · green first run
  ```

  **Verdict**: ● Plumb

  **Recommendation**: Approve and checkpoint step 31. It meets the done-when, the gate is green, and the one gap it leaves is parked with a deadline ahead of step 33.

  **1.** A pure `parseManifestWorkspaces` reads both shapes of the field

  It sits beside `parseWorkspaceGlobs` in `imports.ts` and follows the same D30 (pure-parsers) pattern: it takes a manifest string and returns the globs in order, keeping `!` exclusions. It takes the array, or the `packages` array of yarn's object (bun accepts that object too). It returns nothing for a missing field, an object with no `packages`, entries that aren't strings, or JSON that won't parse. That last case matches how `readManifest` already treats a broken manifest. A new `workspaceGlobs` picks which source to read, and `readMembers` runs the same include and exclude matching over its result as before.

  **2.** `pnpm-workspace.yaml` wins as soon as the file exists

  The check is whether the file exists, not whether it has a `packages:` key, because pnpm itself never reads `workspaces`. So a pnpm repo that also carries a `workspaces` field, maybe left over from a migration, maps the way pnpm installs it. The "both" test uses a yaml listing only `libs/*` beside a field listing `apps/*` and `libs/*`. Only `libs/util` becomes a member, and `apps/web` stays in the root package cell.

  **3.** `globToRegExp` now drops a leading `./`, which `git.ts` also picks up

  npm's docs write members as `./packages/a`, and a raw `./` would never match a directory path. The fix is one `normalizePath` call inside `globToRegExp`, so it also applies to the pnpm reader and to the copy of that matcher in `git.ts`, which imports it. For globs without `./` the result is byte-identical; with `./` the pattern now matches what pnpm matches.

  **4.** The tests assert members, name-resolved edges and package cells for each shape

  Each of the npm, yarn and both-present trees is written from strings into its own `mkdtemp` directory (D42 (committed-files-vs-gate)). Each test checks the member list, an edge resolved by package name, and the package cells `identifyModules` from `core` makes from those members. The npm tree also shows that an excluded `packages/legacy` neither becomes a member nor resolves by name. The "neither" case is the existing flat test, renamed. The package-cell checks also show that the root `.` becomes a package cell whenever it holds files no member claims.

  **5.** Parked: the dependency delta still reads only `pnpm-workspace.yaml`

  `git.ts`'s `memberDirs`, which feeds D47's `deps_added`, has its own yaml-only copy of the member reader, and it is outside this seam. On an npm, yarn or bun fixture, a dependency added to a member's manifest would go unnoticed. I parked it with a note to route it through `parseManifestWorkspaces` before step 33 generates the outside fixtures.

- 2026-09-28 — step 35 checkpointed · 948a5e16f — feat(cli): name the files a red lint or struct slot reports (14m)

  **Summary**: A red `lint` or `struct` slot now lands on the files its own JSON names instead of covering the whole field. That makes six file-scoped slots, and a missing, stale, unparseable or file-less report still falls back to global.

  1. A red slot names only the files carrying an error, the way `test` names only failed tests
  2. The two parsers read real oxlint and ast-grep output, tested from captured strings
  3. `readCheck` gains two slot-table rows and nothing else
  4. The evidence tests show the done-when case and the edges

  **Readout**: Step 35 - feat(cli): name the files a red lint or struct slot reports

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    honored:
               - D27 (category-defaults)
               - D30 (pure-parsers)
               - D41 (artifact-trust)
               - D67 (standing-state-notices)
  constraints  11 of 11 honored
  seam         held: 4 of 4 declared, no strays
  diff         +224 -11 across 4 files
  spent        14 min · 1 turn · 15s gate · green first run
  ```

  **Verdict**: ● Plumb

  **Recommendation**: Approve and land step 35. Choosing error over warning is the one judgment beyond the plan's letter, and if you'd rather a red slot name every finding, removing `failingPaths`'s error filter is the only change.

  **1.** A red slot names only the files carrying an error, the way `test` names only failed tests

  Neither D67 nor the done-when says which severities count, so I had to decide. oxlint and ast-grep both write `severity: "error"` or `"warning"` on every finding, and only errors fail the slot by default. If every finding counted, a red lint in a repo like volley (104 warnings) would pull in every warned file the change touches, the same mis-attribution D67 exists to stop. So `failingPaths` in `libs/core/src/evidence.ts` takes the error files, and falls back to every finding only when a red slot carries no error at all. That fallback covers a run that denies warnings. The parsers keep each finding's severity and core makes the call, matching how `parseTest` keeps every status and core filters `failed`.

  **2.** The two parsers read real oxlint and ast-grep output, tested from captured strings

  `parseLint` reads `diagnostics[].filename` and `parseStruct` reads the bare array's `[].file`. Each keeps the path and severity, drops `./`, sorts by path, and drops a finding that is missing either key. A non-record `lint.json` or a non-array `struct.json` is `undefined`, so the channel mutes. A probe over the real artifacts on disk read all 104 of volley's diagnostics and all 97 of storium's matches. Biome's `lint.json` (tiny-kit) parses to no diagnostics, so a red biome slot stays global: an unknown shape names nothing rather than guessing.

  **3.** `readCheck` gains two slot-table rows and nothing else

  `lint` owns `lint.json` and `struct` owns `struct.json`, both through the existing `readChannel`, so the ran/skipped/unlisted gating and stale muting come for free. The gated fixture now also carries a skipped `struct` with its file present and an unlisted `lint.json`, and both stay unread. `map.ts` needed no change, because stale entries are already generic, and the sources barrel re-exports with `export *`.

  **4.** The evidence tests show the done-when case and the edges

  One test has a red lint with errors on changed `src/pm/tools.ts` and a warning on `src/doctor.ts`, and it scopes to `['src/pm/tools.ts']`. Another has a warnings-only red struct, which scopes to every file it names. The old "four slots" test is now six, with `types` standing in as the global example. The unread test also covers red `lint` and `struct` with no channel, or with empty reports, and all stay global.

- 2026-09-28 — step 36 checkpointed · 77f15b657 — fix(core): set the flight category from the change's red slots (32m)

  **Summary**: A red slot now makes the change IFR only when it names a changed file or tears a stitch on one. Standing and global red leave the category to the change's own evidence, so checkride PR 2's shape reads MVFR.

  1. One exported helper, `splitRedSlots`, splits every red slot into the change's red and the standing state
  2. A torn stitch puts the files it imports on the change, not the failing test itself
  3. `categoryOf`'s red-slot rung reads `split.change`, and `buildMap` passes the stitches in
  4. The old "any red slot is IFR" test is gone, because D69 reverses it

  **Readout**: Step 36 - fix(core): set the flight category from the change's red slots

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    3 of 3 honored
  constraints  11 of 11 honored
  seam         held: 4 of 4 declared, no strays
  diff         +217 -8 across 4 files
  spent        32 min · 1 turn · 15s gate · green first run
  ```

  **Verdict**: ● Plumb

  **Recommendation**: Approve and land step 36. The split is exactly D67's rule and the category reads only its change half, per D69. Its output shape was chosen with steps 37 to 39 in mind, so those steps can read it without widening it.

  **1.** One exported helper, `splitRedSlots`, splits every red slot into the change's red and the standing state

  It lives in `evidence.ts` and reaches the `core` barrel through the existing `export *`. It takes `{ slots, changed, stitches }`, all of which sit on `map.json`, so steps 37 to 39 (notices, storms, the Gate and Standing blocks) can make the same split from the map without re-deriving it. It returns `{ change, standing }`. Each red slot sits in exactly one list, and each entry carries `name`, `global`, the changed files it is on the change through (`change`), and the other files it names (`standing`). Green and skipped slots appear in neither list. The `global` flag is what step 39's Standing tail will name. `changed` is typed `Pick<ChangedFile, 'path'>[]` because the split reads only paths, which also lets the tests pass the diff straight in.

  **2.** A torn stitch puts the files it imports on the change, not the failing test itself

  Under a red `test`, a named test file whose stitch status is `failed` contributes the changed files it imports to `change`. The test path goes into neither list, since per D4 (tests-not-terrain) it is evidence, not the change. If it were in `standing`, step 38's storms would draw a grey bolt over the same cells the red one sits on. A failing test that is itself a changed file (the demo's `pm.test.ts`) counts both ways: its own path plus its torn targets. That choice sets what step 37 targets, one `red-check-slot` per changed file, so it is worth a look now.

  **3.** `categoryOf`'s red-slot rung reads `split.change`, and `buildMap` passes the stitches in

  `CategoryInputs` gains a required `stitches` field, and `buildMap` passes `evidence.evidence.stitches ?? []`. Both LIFR rungs (vacuous green, and a structural finding on a changed file) are unchanged and still run first. The demo golden stays IFR because its failing test is itself in the diff, so no fixture moved.

  **4.** The old "any red slot is IFR" test is gone, because D69 reverses it

  That test proved IFR from a global `lint` with no channel, which is now standing state and reads VFR. It is replaced by six tests in `evidence.test.ts`:

  - a changed-file red, which reads IFR
  - an untouched-file red, which reads VFR and is still reported in `slots`
  - a global red, which reads VFR
  - a torn stitch, which reads IFR, beside the same failure on a change it imports nothing of, which reads VFR
  - checkride PR 2's shape (global `dead` and `snippets`, `dupes` and `health` on untouched files, one uncovered changed line on a one-cell file), which reads MVFR with all four red slots standing
  - a direct unit test of the split

  `map.test.ts` adds a buildMap-level pair: the demo with its test file left out of the diff reads IFR when the stitch tears and MVFR when it holds.

- 2026-09-28 — step 37 checkpointed · e92d2f65c — fix(core): spend the notice budget only on the change's red slots (1 drift, 5m)

  **Summary**: Red-slot notices now come only from the change's red, one row per changed file with its `why` listing every slot that names it, so standing and global red no longer spend any of the six rows.

  1. `redSlotCandidates` and the suppression both read step 36's split
  2. The stitches reach `rankNotices` through one line in `map.ts`, outside the seam
  3. The demo golden changed, and six more files outside the seam changed with it
  4. The tests cover the three cases the done-when names, plus two more
  5. I parked the security-finding question

  **Readout**: Step 37 - fix(core): spend the notice budget only on the change's red slots

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    1 of 1 honored
  constraints  11 of 11 honored
  seam         strayed: 9 paths outside the seam
               - libs/core/fixtures/demo/map.json
               - libs/core/src/__tests__/map.test.ts
               - libs/core/src/map.ts
               - libs/svg/fixtures/categories/LIFR.svg
               - libs/svg/fixtures/categories/MVFR.svg
               - libs/svg/fixtures/categories/NOINST.svg
               - libs/svg/fixtures/categories/VFR.svg
               - libs/svg/fixtures/demo/atis.svg
               - libs/svg/src/__tests__/chrome.test.ts
  diff         +437 -364 across 11 files
  spent        5 min · 1 turn · 15s gate · green first run
  ```

  **Verdict**: ◐ A hair off (seam strayed)

  **Recommendation**: Approve and land step 37 with its planned subject. The step does what the done-when asks, the gate is green, and everything outside the seam is either the one-line threading or a golden rebuilt deterministically from the new ranking.

  **1.** `redSlotCandidates` and the suppression both read step 36's split

  `rankNotices` calls `splitRedSlots` once. `redSlotCandidates` walks `red.change` and groups each slot's changed files into one candidate per path. The `why` reads "the `lint` check is red on this changed file", or "the `health` and `lint` checks are red on this changed file" when two slots name it. The candidate's `inputs` carries `slots: n` as the measurement echo (D9, D28), and it does not change the weight. `redTargets`, which drops a finding a red slot already speaks for, now keys only the change's red slots to their changed files. A global slot yields nothing and suppresses nothing. The old `GLOBAL` constant and the local `isRed` are gone because the split owns both.

  **2.** The stitches reach `rankNotices` through one line in `map.ts`, outside the seam

  The split needs the stitches to see a torn `test`, so `NoticeInputs` gains a required `stitches` field. `buildMap` passes `evidence.evidence.stitches ?? []` the same way step 36 threaded them to `computeCategory`. I made the field required rather than optional so production can't silently drop a torn stitch.

  **3.** The demo golden changed, and six more files outside the seam changed with it

  The demo's failing `pm.test.ts` imports `pm/index.ts` and `pm/tools.ts`, which the change touched. That torn stitch now puts a red `test` notice on each of them. Before, the red candidate sat on the test file itself, which had no reach and never ranked. The red notice on `pm/index.ts` (weight 169) is now primary, and `large-hot-change` moves to the last row. So `libs/core/fixtures/demo/map.json` was rewritten from `buildMap`. The five SVG goldens that render it were regenerated with `ATIS_UPDATE_GOLDENS=1`, as in step 25. Three assertions in other tests followed:
  - `map.test.ts` pins the new primary.
  - `chrome.test.ts` finds the `large-hot-change` row by kind instead of by index 3.
  - `chrome.test.ts` expects the marks' target order index, tools, doctor.

  **4.** The tests cover the three cases the done-when names, plus two more

  - **checkride PR 2's shape:** global `dead` and `snippets`, plus `dupes` and `health` on untouched files, ranks only the `survived-mutants` notice on the changed file.
  - **Two slots on one file:** a file named by `lint` and `health` takes one row that lists both, and `health`'s untouched `doctor.ts` takes none.
  - **A global red slot:** it yields nothing.
  - **A torn stitch (added):** the notice lands on the changed file, not on the test.
  - **A global red `security` slot (added):** it no longer hides the `security-finding` notice.

  `ONE_OF_EACH` now drives the red row with a `lint` slot naming the changed file instead of a global `types`.

  **5.** I parked the security-finding question

  With a global red `security` slot no longer suppressing it, `security-finding` still counts the repo's vulnerabilities at head. By D67's reading that is standing state. It rarely bites, because the fixtures skip `security` (D56). But whether it should spend the budget only when the change's dependency delta touches it is a design call, so it's a park line, not an edit.

- 2026-09-28 — step 38 checkpointed · 7c947cd21 — fix(svg): draw standing-state storms as grey terrain (1 drift, 30m)

  **Summary**: A storm now keeps its red bolt and label only over a cell where its slot names a changed file. Every other storm is a smaller graphite bolt with no label, drawn under the weather, and a global red slot draws nothing. Step 27's corner anchors and slot leader are gone.

  1. Storms read core's `splitRedSlots`, the same split the category and notices use
  2. Standing storms are the bottom layer inside `#weather`, under reach
  3. Two tokens, not one: `STANDING_STORM_FILL` #58616b and `STANDING_STORM_SCALE` 0.6
  4. The chrome's anchor lookup is back to position, then contour
  5. Two SVG goldens regenerated outside the seam

  **Readout**: Step 38 - fix(svg): draw standing-state storms as grey terrain

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    2 of 2 honored
  constraints  11 of 11 honored
  seam         strayed: 2 paths outside the seam
               - libs/svg/fixtures/categories/LIFR.svg
               - libs/svg/fixtures/demo/atis.svg
  diff         +227 -189 across 8 files
  spent        30 min · 1 turn · 15s gate · green first run
  ```

  **Verdict**: ◐ A hair off (seam strayed)

  **Recommendation**: Approve and land step 38. The split, the removal and the token are all in place, the gate is green, and the only strays are the two goldens this change is meant to move.

  **1.** Storms read core's `splitRedSlots`, the same split the category and notices use

  `stormsOf` in `weather.ts` calls step 36's helper. For each red slot it places the `change` files as change storms and the `standing` files as standing storms. A place that already has the slot's change storm gets no grey one from the same slot, so each (slot, place) pair draws exactly once. A global slot has empty `change` and `standing` lists, so it places nowhere. No special case was needed: "no storm for a global slot" falls out of the split. The `test` slot still reaches cells through its stitches (`placesOf` is unchanged), so a torn stitch on a changed file is a change storm over that file's cell.

  **2.** Standing storms are the bottom layer inside `#weather`, under reach

  The new `#standing-storms` group comes first after the defs, beneath `#reach`, so the warm glow lies over the grey bolts the way it lies over tissue. I kept it inside `#weather` instead of moving it into the terrain groups because `render.ts` is outside the seam, and `#weather` carries no attributes of its own, so the pixels are the same either way. Change and standing storms at one place share one row counter, change storms first, so the red sits nearest the cell and the grey stacks above it without overlapping. A test pins that stacking.

  **3.** Two tokens, not one: `STANDING_STORM_FILL` #58616b and `STANDING_STORM_SCALE` 0.6

  The done-when names one graphite token, but tokens.ts holds every size the renderer draws with, so the scale is a token too. Both are recorded in `docs/design.md` under Ghosts and storms, along with D68's prose. The graphite sits between the membrane stroke (#4b535e) and the organelle stroke (#5f6873): easy to find, never loud. `STORM_INSET` and the in-file `STORM_RADIUS` served only the corner anchors, so they went with `globalStormAnchors`. `drawStorm`'s `atEdge` flag only ever fired for a corner storm, so it went too.

  **4.** The chrome's anchor lookup is back to position, then contour

  `anchorOf` no longer takes a storms map. A notice whose target is a slot name gets `data-unplaced` and no leader or mark, and a rewritten chrome test pins that for a red global `lint`. The two weather tests pin a change storm (demo `test` over pm; small-map `dead` and `test` over A's cell), standing storms (demo `dead` over util and `package:libs/core`; small-map `dead` over B, `docs`, and an untouched `struct` over A), and a global `lint` drawing nothing anywhere.

  **5.** Two SVG goldens regenerated outside the seam

  `libs/svg/fixtures/demo/atis.svg` and `categories/LIFR.svg` were rewritten with `ATIS_UPDATE_GOLDENS=1`, as step 37 did. The diff is exactly the demo's two `dead` storms moving from labelled red in `#storms` to grey unlabelled bolts in `#standing-storms`. VFR, MVFR and NOINST have no red slots, so they are unchanged. Round one's frozen fixtures under `fixtures/` are left alone per D61 (round-one-fixtures-frozen).

- 2026-09-28 — step 39 checkpointed · bf024ab52 — fix(svg): count red slots in the HUD's Gate and Standing blocks (1 drift, 5m)

  **Summary**: The HUD's `Checks n/m` block is gone. A `Gate` block now counts only the red slots on the change (`Gate 1 red`, or `Gate pass` with no numeral), and a `Standing n red` block counts the wholly standing red and names the global slots. Both sit after size, so the change's own evidence is what sits beside the category.

  1. Both blocks read core's `splitRedSlots`, the same split the category, the notices and the storms use
  2. A run where every slot was skipped mutes the gate as `empty` instead of reading `Gate pass`
  3. The Standing tail reads `, global: lint, types`, a format I chose
  4. Gate and Standing sit right after Size, ahead of the muted Health Δ
  5. The five SVG goldens under `libs/svg/fixtures` changed too, outside the seam

  **Readout**: Step 39 - fix(svg): count red slots in the HUD's Gate and Standing blocks

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    2 of 2 honored
  constraints  11 of 11 honored
  seam         strayed: 5 paths outside the seam
               - libs/svg/fixtures/categories/LIFR.svg
               - libs/svg/fixtures/categories/MVFR.svg
               - libs/svg/fixtures/categories/NOINST.svg
               - libs/svg/fixtures/categories/VFR.svg
               - libs/svg/fixtures/demo/atis.svg
  diff         +319 -242 across 7 files
  spent        5 min · 1 turn · 15s gate · green first run
  ```

  **Verdict**: ◐ A hair off (seam strayed)

  **Recommendation**: Approve and checkpoint. The done-when is met and the gate is green. The two judgment calls, the `empty` mute and the tail format, are both small and easy to revert if you'd rather keep strictly to D70's text.

  **1.** Both blocks read core's `splitRedSlots`, the same split the category, the notices and the storms use

  `gateBlocks` in `chrome.ts` calls `splitRedSlots` with the map's slots, changed set and stitches, exactly as `weather.ts` does for the storms. The gate counts `red.change` and the standing block counts `red.standing`, so each red slot lands in exactly one block. A test adds the two numerals and checks the total equals every red slot. On the demo, `test` tears a stitch on the change and `dead` names only untouched files, so the row reads `Gate 1 red` and then `Standing 1 red`.

  **2.** A run where every slot was skipped mutes the gate as `empty` instead of reading `Gate pass`

  The done-when names three gate states: n red, pass, and muted `absent` with no trusted `.check/`. A fourth case exists: a trusted `.check/` in which no slot ran, the vacuous green that core already calls LIFR. Under the literal three states that run would read `Gate pass`, a pass nothing went through. I muted it as `empty` instead, the reason the coverage block already uses for "nothing to measure", per C2 (never-fake). A test pins it. This is a small addition beyond the done-when. Drop it if you want exactly the three states.

  **3.** The Standing tail reads `, global: lint, types`, a format I chose

  D70 says the tail names the global slots but gives no format. The block follows the existing `Size +a −d, f files` pattern: a comma, then the phrase. The colon keeps `global` from reading as part of the first slot's name. The slots are listed in name order (C3). With no global slot the tail is just ` red`.

  **4.** Gate and Standing sit right after Size, ahead of the muted Health Δ

  D70 lists the change's blocks as patch coverage, mutants, reach and size, so both new blocks follow Size immediately and `Health Δ` comes after them. The new `HUD_ORDER` is category, patch-cov, mutants, reach, size, gate, standing, health, notices, other. A test pins that literal list. Health Δ is arguably change evidence too; if you want it ahead of the gate, it's a one-line swap.

  **5.** The five SVG goldens under `libs/svg/fixtures` changed too, outside the seam

  They were regenerated with `ATIS_UPDATE_GOLDENS=1`, the same way step 38 regenerated them. The VFR, MVFR and NOINST goldens only swap the Checks block for Gate. On the 780-wide demo and LIFR canvases the extra Standing block pushes `Notices` and `Other` onto a second HUD row. That drops the world by one row (23 px), which accounts for most of their diff lines. `layOutHud` already wraps like this when a row doesn't fit.

- 2026-09-28 — step 40 checkpointed · 0a6deb09a — fix(svg): light a skin's uncovered arc instead of its covered one (1 drift, 14m)

  **Summary**: A changed file's skin now draws its gap instead of its closure. Untested changed lines are lit at full strength from the top clockwise over a dim hairline, a closed skin is hairline all round, and a live mutant is a lit notch. On checkride PR 5's `src/doctor.ts` (6 of 19 uncovered), 6/19 of the ring is now the brightest mark on that file.

  1. The skin lights its uncovered share over a dim hairline
  2. The lit stroke went from 1.5 to 2.5, clear of the tier rings
  3. A live mutant is a lit notch
  4. Four SVG goldens outside the seam were regenerated
  5. I parked a clash with the secondary tier ring

  **Readout**: Step 40 - fix(svg): light a skin's uncovered arc instead of its covered one

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    2 of 2 honored
  constraints  11 of 11 honored
  seam         strayed: 4 paths outside the seam
               - libs/svg/fixtures/categories/LIFR.svg
               - libs/svg/fixtures/categories/MVFR.svg
               - libs/svg/fixtures/categories/VFR.svg
               - libs/svg/fixtures/demo/atis.svg
  diff         +188 -98 across 8 files
  spent        14 min · 2 turns · 15s gate · green first run
  ```

  **Verdict**: ◐ A hair off (seam strayed)

  **Recommendation**: Approve and checkpoint step 40. The done-when is met, the gate is green, and the one visual clash it exposed is parked for a chrome step rather than stretched into this seam.

  **1.** The skin lights its uncovered share over a dim hairline

  `drawIntegrity` now draws a full hairline ring in `EVIDENCE_LIGHT` (`INTEGRITY_CLOSED_WIDTH` 1, `INTEGRITY_CLOSED_OPACITY` 0.3). On top of it, the uncovered share `(changed_executable - covered) / changed_executable` is drawn at full strength, `INTEGRITY_GAP_WIDTH` wide, from the top clockwise. The lit arc covers its own share of the hairline, so what shows as hairline is exactly the covered share. A closed skin skips the lit arc and is hairline all round. The old dark under-ring in `FIELD_FILL` is gone, since the gap is no longer dark. The uncovered count is clamped at zero. Core never writes `covered > changed_executable`, but a negative dash would make SVG ignore the whole dasharray and light a full ring.

  **2.** The lit stroke went from 1.5 to 2.5, clear of the tier rings

  The lit stroke was 1.5 before. It is now 2.5px at the canvas's native scale (the SVG is 1 unit to 1px), which leaves a readable arc on a radius-4 organelle, the layout's minimum. `INTEGRITY_PAD` moved from 1 to 1.25, so the skin spans r+0 to r+2.5 and ends 1 unit short of a secondary tier ring (r+3.5). A test pins that clearance so a later width change can't merge the two. `INTEGRITY_WIDTH` is gone. `INTEGRITY_GAP_WIDTH` keeps its name, because it was already the width of the open part; now it is lit instead of dark.

  **3.** A live mutant is a lit notch

  `drawDents` keeps its name, since the done-when cites it. Each live mutant is now a filled `EVIDENCE_LIGHT` wedge: its mouth spans the skin's outer edge, `MUTANT_NOTCH_WIDTH` (4) wide along the tangent, and its point sits `MUTANT_NOTCH_DEPTH` (2) inside the organelle's edge. The notches are still spread round the top. `MUTANT_DENT_RADIUS` and `MUTANT_DENT_SPACING` are renamed to `MUTANT_NOTCH_*`, which also keeps "dent" meaning only conformance (`DENT_VERTICES`). `docs/design.md` records the new rows, plus a sentence in the luminance section that evidence lights what the tests left open.

  **4.** Four SVG goldens outside the seam were regenerated

  The demo, VFR, MVFR and LIFR goldens under `libs/svg/fixtures/` were rewritten with `ATIS_UPDATE_GOLDENS=1`, as step 38 did. Each diff is 8 lines: the three skins and the two demo notches, nothing else. NOINST carries no evidence and did not move. The seam row will name these four files.

  **5.** I parked a clash with the secondary tier ring

  I rendered checkride PR 5 and looked at `src/doctor.ts` zoomed in. The 6/19 arc reads plainly over the hairline, and the closed skin on `src/pm/tools.ts` stays a dim stain. But `doctor.ts` is a secondary notice target, and its tier ring is `CHROME_INK` (the same pale as the evidence light) at width 3, just past the skin. At native scale that ring can make the whole skin look lit. The ring lives in `chrome.ts`, outside this seam, so I parked it rather than editing it.

- 2026-09-28 — step 41 checkpointed · 18dc90215 — fix(cli): read npm, yarn and bun packages for the dependency delta (2m)

  **Summary**: The git source now finds workspace members the same way the scan does. It reads `pnpm-workspace.yaml` when the repo has one, and otherwise the root `package.json`'s `workspaces`. So on an npm, yarn or bun repo, a dependency added to a member's manifest lands in `deps_added`. Before this, only the root manifest was diffed.

  1. memberDirs reads its globs through a new workspaceGlobs helper that mirrors the scan's order
  2. A temp-repo test shows a member's new dependency landing and a non-member's staying out
  3. The source no longer prints git's missing-file error on repos that don't use pnpm

  **Readout**: Step 41 - fix(cli): read npm, yarn and bun packages for the dependency delta

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    3 of 3 honored
  constraints  11 of 11 honored
  seam         held: 2 of 2 declared, no strays
  diff         +57 -6 across 2 files
  spent        2 min · 1 turn · 16s gate · green first run
  ```

  **Verdict**: ● Plumb

  **Recommendation**: Approve and land step 41. The done-when is met, the new test failed before the fix and passes after it, and every check passes. That clears the gap step 31 parked, before step 32 picks outside fixtures that may well use npm or yarn.

  **1.** memberDirs reads its globs through a new workspaceGlobs helper that mirrors the scan's order

  `git.ts` gains a three-line `workspaceGlobs(repo, sha, files)`. It checks `pnpm-workspace.yaml` first, because pnpm never reads `workspaces`, and then the root `package.json` through step 31's `parseManifestWorkspaces`. That is the same order `imports.ts` uses. Both readers now share both parsers and `globToRegExp`, so yarn's `{ "packages": [...] }` form and `!` exclusions work here with no new code. The order logic itself is still written twice: once over the filesystem in `imports.ts` and once over `git show` in `git.ts`. Folding those together would have meant a reader interface that crosses the seam, and three lines didn't seem worth that.

  **2.** A temp-repo test shows a member's new dependency landing and a non-member's staying out

  The new test in `git.test.ts` builds a throwaway repo. Its root `package.json` names `workspaces: ["packages/*"]`, and there is no pnpm file. It commits a base, then adds `zod` to `packages/a` and `chalk` to `examples/demo`, which is not a member. `readManifests` returns only the `zod` row. I ran the test against the old `git.ts` first: it failed with `[]` and passes with the fix. The repo's commits carry an `atis` identity through `-c` flags, so the test never depends on the machine's git config, and nothing reads an author field ([C6 (no-people)](#c6)).

  **3.** The source no longer prints git's missing-file error on repos that don't use pnpm

  The old `memberDirs` called `git show <sha>:pnpm-workspace.yaml` without checking first. On every repo without the file, git wrote `fatal: path 'pnpm-workspace.yaml' does not exist` to stderr, twice per run. The new helper checks the `ls-tree` file set first, so that output is gone. It is a side effect of the fix, not a separate change.

- 2026-09-28 — step 42 checkpointed · 80953c612 — fix(svg): draw a secondary notice's ring in chrome grey, clear of the lit skin (969m)

  **Summary**: A secondary notice's ring is now drawn in the leaders' grey instead of the chrome's ink, whether it circles a file or re-traces a cell. The chrome's ink is the same `#e6edf3` as the evidence light, so a ring round a skin can no longer be mistaken for a gap lit all the way round.

  1. The secondary ring takes `LEADER_INK`, round a file or along a cell
  2. The clearance is pinned from the tokens, which stay as they were
  3. On checkride PR 5's `src/doctor.ts` the lit arc now reads apart from the ring
  4. This step recommended sonnet; it ran on Opus

  **Readout**: Step 42 - fix(svg): draw a secondary notice's ring in chrome grey, clear of the lit skin

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    2 of 2 honored
  constraints  11 of 11 honored
  seam         held: 4 of 4 declared, no strays
  diff         +61 -10 across 4 files
  spent        16h 9m · 1 turn · 15s gate · green first run
  ```

  **Verdict**: ● Plumb

  **Recommendation**: Approve and land step 42. The ring now keeps its tier meaning and the lit gap keeps its evidence meaning, per D72. If the fixture pass at step 33 still sees the ring and gap run together at native scale, raising `EMPHASIS_PAD` from 5 to 6 would double the band, as a follow-up.

  **1.** The secondary ring takes `LEADER_INK`, round a file or along a cell

  `drawEmphasis` builds one set of attributes for both of its shapes, the circle round a placed file and the path that re-traces a skinned group's contour, so changing that one stroke from `CHROME_INK` to `LEADER_INK` covers both. The primary ring still takes the category hue. The header comment in `chrome.ts` and the function's own doc comment now say why the ring avoids the chrome's ink (D72, C11 (one-meaning-per-channel)). The secondary's numbered box keeps its `CHROME_INK` frame. It sits off the ring's lower right, not on the skin, and the done-when only covers the ring.

  **2.** The clearance is pinned from the tokens, which stay as they were

  The new chrome test works out the dark band from the tokens alone: the ring's inner edge (`EMPHASIS_PAD` 5 less half of `SECONDARY_RING_WIDTH` 3, so 3.5) against the lit gap's outer edge (`INTEGRITY_PAD` 1.25 plus half of `INTEGRITY_GAP_WIDTH` 2.5, so 2.5). It asserts the band is positive, then measures the ring drawn round `src/b.ts` from its own `r` and `stroke-width`. It also pins `CHROME_INK === EVIDENCE_LIGHT` and `LEADER_INK !== EVIDENCE_LIGHT`, so if either colour drifts the test says why, and it checks that a secondary on `folder:src`, given a contour, draws its path in `LEADER_INK`. The tier-emphasis test's expected secondary stroke moved from `CHROME_INK` to `LEADER_INK`. `weather.test.ts` already had the same inequality from step 40. The band is still 1 unit, because D72's cause was the shared colour and the done-when compares the tokens without asking to widen them. The token comment above `EMPHASIS_PAD` and the three `docs/design.md` rows now say where the ring's colour comes from and how the band is measured.

  **3.** On checkride PR 5's `src/doctor.ts` the lit arc now reads apart from the ring

  I rendered `fixtures/checkride-pr5/map.json` from the rebuilt `dist` and cropped round `src/doctor.ts` at about 3x. The 6/19 lit arc, from the top clockwise, is clearly white. The ring outside it is a distinct mid-grey, with a thin darker band between them. The organelle sits inside a reach-lit cell, so the "dark field" there is lit tissue in a middle tone, not black. At native scale the band is one pixel. The committed fixture SVGs were not regenerated. No golden changed, because the demo map draws no secondary ring.

  **4.** This step recommended sonnet; it ran on Opus

  The plan's `- model:` line for this step is sonnet. The session ran on Opus 5.5, and the diff is small either way.

- 2026-09-29 — step 32 checkpointed · 220115a37 — chore(fixtures): select five reviewed outside PRs and record their ground truth (151m)

  **Summary**: The five retake fixtures are in place as `fixtures/retake-1` to `fixtures/retake-5`. Each has a `README.md` and a `truth.md`, and each fixture is an outside PR whose human review record is public. A second agent re-checked every pick against GitHub and the clones and found that all five qualify. Round one's five `truth.md` files each gain one line pointing at round one's verdict. Nothing in this pause names a repo, a PR or a verdict.

  1. The five come from five different repos, split three and two, and are numbered by a random shuffle
  2. An independent second agent re-checked every claim and found that all five qualify
  3. I required TypeScript source with at least two non-test files changed, and three fixtures sit right at that floor
  4. The work ran in hidden agents, but their reports came back into this session as messages
  5. Round one's `truth.md` files point at its record, and one follow-up is parked

  **Readout**: Step 32 - chore(fixtures): select five reviewed outside PRs and record their ground truth

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    honored:
               - D59 (outside-fixtures)
               - D60 (fixture-balance)
               - D61 (round-one-fixtures-frozen)
               - D62 (retake-reader-blind)
               - D64 (fixture-eligibility)
  constraints  11 of 11 honored
  seam         held: 1 of 1 declared, no strays
  diff         +490 -0 across 15 files
  spent        2h 31m · 5 turns · 16s gate · green first run
  ```

  **Verdict**: ● Plumb

  **Recommendation**: Approve and land step 32, unless highlight 4's report reached your screen. Every pick passed an independent re-check against the public record, the gate is green, and the pause names nothing.

  **1.** The five come from five different repos, split three and two, and are numbered by a random shuffle

  A hidden agent walked the review timelines with `gh api`. It flipped a coin for which verdict gets three fixtures. For each pick it confirmed four things in a real clone: the merge, the review's `commit_id`, the merge base on the base branch, and the diff counts. Once all five were verified, it numbered the folders with a Fisher-Yates shuffle and re-rolled whenever a verdict came out as one contiguous block. The scratch clones are still in `/tmp/atis-retake/` for step 33. Every README calls its fixture commit "the commit a human review was submitted against". That wording is true for both kinds of fixture, so none of the five READMEs contains a verdict word. I grepped all five to confirm it.

  **2.** An independent second agent re-checked every claim and found that all five qualify

  The verifier re-read nine things through `gh api` and in the clones, and every row passed:

  - each PR merged;
  - each review is from a human, and its state and commit match;
  - a merge has no human request for a change, and its approval sits at the merged head;
  - each quote is verbatim and its link resolves;
  - each hold's comment names a substantive problem that is really present in the code at that commit;
  - the merge bases and diff counts match;
  - the ecosystems match;
  - no PR was reverted;
  - `robmclarty` appears in none of them.

  It searched for reverts on all five, not only on the merges, so its report does not show which fixtures are merges. Its lowest confidence, which it still rated moderately high, is a hold whose blocking review is one line. The reasoning behind that review is in the same reviewer's comments on the same commit about 90 minutes earlier, and that `truth.md` quotes both and says where each comes from. The verifier confirmed the problem those comments name in the exported types.

  **3.** I required TypeScript source with at least two non-test files changed, and three fixtures sit right at that floor

  D64 admits "TypeScript or JavaScript", but the scan reads only `.ts` and `.tsx` (`TYPESCRIPT` in `imports.ts`), so a JavaScript-only repo would draw an empty terrain. I therefore counted D64's "3 to 30 changed source files" as `.ts`/`.tsx` files only, and added a floor of two non-test files so the change lands on the terrain. The five change between 3 and 10 such files. Three of them change exactly two non-test files, and in one of those the second file is a one-line re-export. All five have a vitest or jest runner, so none is git-only.

  **4.** The work ran in hidden agents, but their reports came back into this session as messages

  Tool calls show commands in the terminal, so I handed the search, the writing and the verification to subagents. Their calls stay out of your view, and my own messages named nothing. The verifier's report names nothing either. The selection agent's report does name all five with their verdicts. It reached me as an incoming message, and I can't tell whether your terminal displayed it. If you saw a table of repos and PRs, the blind is broken for the retake. Say so, and I'll re-pick five from the rejected pool before step 33 generates anything.

  **5.** Round one's `truth.md` files point at its record, and one follow-up is parked

  Under each round-one title there is now one line giving the ground truth that round one settled, what the reader called, and a link to `docs/glance-test.md#ground-truth-from-the-history`. The line also says that the record supersedes the draft and that the draft stays frozen (D61). D54 asks for a `docs/inspiration.md` row for each outside source. Adding those rows now would leak through the diff (D62), so I parked them for after step 34's verdicts.

- 2026-09-29 — step 33 checkpointed · 33369cefd — chore(fixtures): generate map.json and the SVG for the five outside PRs (102m)

  **Summary**: All five `fixtures/retake-<n>/` folders now hold a `map.json` and an `atis.svg`, and each `README.md` records its toolchain, its commands, every harness change and its skipped slots. Five of five fixtures were generated, five of five maps pass `assertMap`, and coverage is present in all five, so none ran git-only. Mutation completed and was kept in four fixtures, and was dropped in one where stryker could not load the test setup. One reply from the hidden agent said more about a fixture than counts, and highlight 5 is the question that raises.

  1. Every fixture ran the current harness with coverage and passes `assertMap`
  2. I chose which slots the harness switches on, and it is a call you may want to overrule
  3. The foreign runners fought back in predictable ways, and every workaround is written into its README
  4. atis's entry-point lookup fails silently on npm, yarn and bun repos, and I parked the fix
  5. A follow-up I asked the agent may have leaked one fixture's weather to your screen

  **Readout**: Step 33 - chore(fixtures): generate map.json and the SVG for the five outside PRs

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    bent: D62 (retake-reader-blind)
               → an agent reply described one fixture's red test slot
  constraints  11 of 11 honored
  seam         held: 1 of 1 declared, no strays
  diff         +430906 -0 across 15 files
  spent        102 min · 4 turns · 14s gate · green first run
  ```

  **Verdict**: ○ Out of plumb (decisions bent)

  **Recommendation**: Approve and land step 33, unless highlight 5's reply reached your screen. All five maps pass, every one has coverage, and the gate is green. If you did see the reply, say so and I'll swap that fixture for a same-verdict spare from step 32's rejected pool before step 34, which keeps the three-and-two split.

  **1.** Every fixture ran the current harness with coverage and passes `assertMap`

  A hidden agent on sonnet (the plan's model for this step) worked through the five fixtures one at a time, so nothing it ran showed up in your terminal. For each one it did the following:

  - made a worktree at the fixture commit and installed with the repo's own package manager;
  - added checkride 0.13.0 and fallow 3.30.0;
  - redirected the test runner's istanbul JSON to `.check/coverage/` (D64);
  - ran `checkride --all --skip security` through the installed binary (D56, D58);
  - ran the built atis CLI against the resolved worktree path.

  I re-checked the output myself, printing counts only: 5 of 5 maps pass `assertMap`, 5 of 5 SVGs begin with `<svg`, all 5 maps are in `check` mode with `patch_coverage` present, and `mutants` is present in 4. `git status` shows three files per folder: `README.md` modified, and `map.json` and `atis.svg` new. No `truth.md` changed, and nothing outside `fixtures/retake-*/` moved. No README carries a category letter (grep count 0). The worktrees are removed. The scratch clones stay in `/tmp/atis-retake/`.

  **2.** I chose which slots the harness switches on, and it is a call you may want to overrule

  The foreign repos don't use checkride, and checkride runs a slot only when that slot's detect file exists. So I set a policy before the runs:

  - **Added `fallow.toml`**, so `dead`, `health` and `dupes` run. atis's notices read their output: thresholds, cycles, clone families and the fan-in p95.
  - **Added coverage and a scoped stryker config**, because the done-when asks for both.
  - **Added nothing that only turns on a style slot** the project never adopted: no oxlint, ast-grep, markdownlint, cspell, prettier or vale config. Those would judge a PR by rules its reviewers never held it to.

  Where a repo already had one of those files, its slot ran as it was. `--all` also opts in `snippets`, which is red on all five because none has tagged fences. The publish slots are red or skipped at private roots in most fixtures. All of that is global or standing red, so under D69 it moves no category and sits in the HUD's Standing block. If you'd rather the retake see checkride's full lint opinion too, say so and I'll rerun with those configs added.

  **3.** The foreign runners fought back in predictable ways, and every workaround is written into its README

  Across the five fixtures:

  - the blobless scratch clones were refetched in full, because `git log --numstat` needs the blobs;
  - two suites ran under a scratch Node that matches the repo's engines or CI era, because the machine's Node 24 failed them for environmental reasons;
  - two workspace-root `eslint .` runs had their heap raised;
  - one runner config clears the `NO_COLOR` that checkride sets, which had broken that repo's colour tests;
  - one runner config keeps coverage when a test fails;
  - one run sets `CI=true` so the repo's own test retries apply;
  - one lockfile needed `npm install` rather than `npm ci`, and no locked version moved;
  - harness files that tripped the repo's own format and dead-dependency slots were ignored.

  Every change is a bullet with its reason under "Harness changes in the worktree". Tests were only ever retried, never deleted or skipped.

  **4.** atis's entry-point lookup fails silently on npm, yarn and bun repos, and I parked the fix

  `fallowEntryPoints` in `apps/atis/src/sources/imports.ts` runs `pnpm exec fallow list` whatever the repo's package manager. On a non-pnpm tree, pnpm re-lays `node_modules` and prints its narration on stdout ahead of fallow's JSON. The JSON parse then throws, and the `catch` returns `[]`, so the scan quietly falls back to manifest-only entry points and `meta.instruments` records nothing. The agent's first map on such a repo came out materially different in reachability and layout. It regenerated with `pnpm_config_verify_deps_before_run=false`, which is the same workaround checkride's `tools.md` documents. Fixing the lookup is atis code outside this seam, so it is parked, not edited. It is also a C2 (never-fake) gap: the fallback should be recorded, not swallowed.

  **5.** A follow-up I asked the agent may have leaked one fixture's weather to your screen

  One map had a red `test` slot. I needed to know whether it was a flake, which would be spurious weather in the sense D56 rules out. The probe that found it printed aggregate counts about red test slots and stitches. My follow-up then asked the agent whether the red was environmental and whether it lands on the change. The agent answered in more than counts: it said where that red comes from and where it lands, and it described the failing assertion in one line. It named no fixture number, repo or PR. The red is left as it ran, which is the right call for real weather. But if that reply reached your screen, you now know something about one fixture's weather before you read it. The first report also tied the dropped mutation to a fixture number. That is not a verdict, and step 34's shuffled copies renumber the fixtures anyway.
