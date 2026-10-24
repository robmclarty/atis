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

# Build log: atis phases 1b to 5, in waves

**Current step:** 35 — feat(web): render the HUD's grade blocks
**Heavy check:** checkride (set a "check" key in .plumbbob/settings.json to override)

## Steps

*(Mirror of intent.md's Steps, with live status; CLI-maintained, not hand-edited.
`build`/`checkpoint`/`revert` re-render this from intent.md, and set the Current step
line above. Only ONE step is in flight; a step is done only after a checkpoint:
check green + checkpoint taken, via `/plumbbob:verify` or `/plumbbob:build`.)*

- ☑ 1. test(cli): stop the CLI suite racing the types slot's build
- ☑ 2. chore(rules): keep Node, the compiler and the DOM out of lib sources
- ☑ 3. fix(core): read a changed file no coverage report names as unmeasured
- ☑ 4. fix(core): split interface notices by what moved
- ☑ 5. feat(cli): compare inferred export shapes with the type checker
- ☑ 6. fix(core): weigh an interface notice by who reads the names that moved
- ☑ 7. fix(core): rank a security advisory only when the change brings it
- ☑ 8. fix(cli): read bare re-exports and .mts barrels as public surface
- ☑ 9. fix(core): keep committed build output off the terrain
- ☑ 10. fix(core): sort the retake's leftover shore files by kind
- ☑ 11. fix(svg): size HUD blocks for the widest fallback monospace face
- ☑ 12. feat(svg): draw a cell's own dents and clone family on its membrane
- ☑ 13. fix(core): keep a neighbour's centre out of another cell's membrane
- ☑ 14. feat(svg): tell an added file from a modified one
- ☑ 15. feat(svg): draw a legend inset and an annotated practice map
- ☑ 16. chore(fixtures): select the tuning half of the precision corpus
- ☑ 17. chore(fixtures): generate maps for the corpus's tuning half
- ☑ 18. chore(glance): score notice precision on the tuning half
- ☑ 89. fix(core): hold a dead finding to the lines the change touched
- ☑ 90. fix(core): rank a health or dead red by the finding behind it
- ☑ 91. fix(core): read only changed code lines as unmeasured
- ☑ 92. fix(core): tell a mutant no test reached from one that survived
- ☑ 19. chore(fixtures): select and generate the corpus's held-out half
- ☑ 20. chore(glance): read five held-out maps blind on the SVG
- ☑ 21. docs(inspiration): cite the corpus repos
- ☑ 22. docs(design): record the materials spike's verdict and motion tokens
- ☑ 23. chore(repo): add the scene library and the web app to the workspace
- ☑ 24. feat(scene): build the heightfield from depth, stability and mass
- ☑ 25. feat(scene): triangulate membranes and lay out organelle instances
- ☑ 26. feat(scene): derive the weather each organelle carries
- ☑ 27. feat(scene): place labels per level of detail without collisions
- ☑ 28. feat(scene): plan levels of detail with hysteresis and cross-fades
- ☑ 29. feat(scene): schedule every animation inside the motion budget
- ☑ 30. feat(web): render the field and the soft skin from a served map
- ☑ 31. feat(cli): serve the world and open it in a tab
- ☑ 32. feat(web): draw cells and organelles, and the shore in a rail
- ☑ 33. feat(web): draw the weather
- ☑ 34. feat(web): draw the notices with their labels and leaders
- ☐ 35. feat(web): render the HUD's grade blocks
- ☐ 36. feat(web): open each HUD block's parts on click
- ☐ 37. feat(web): zoom, pan, tilt and rotate the camera continuously
- ☐ 38. feat(web): pick and hover at every level of detail
- ☐ 39. feat(web): fly to a notice and walk the map from the keyboard
- ☐ 40. feat(web): open a cell into its stained interior
- ☐ 41. feat(web): overlay a changed cell's wiring
- ☐ 42. feat(web): honour reduced motion
- ☐ 43. perf(web): hold 60 fps at 5,000 files and a 2 s first frame
- ☐ 44. docs(design): record the world's material tokens and sources
- ☐ 45. chore(fixtures): select five fresh outside PRs for glance round two
- ☐ 46. chore(fixtures): generate the round-two maps
- ☐ 47. chore(glance): read glance round two in the world
- ☑ 88. refactor(svg): draw the still map's weather from the scene's derivations
- ☐ 93. feat(web): draw a minimap that moves the camera
- ☑ 94. feat(svg): morph a file's outline by the rules it breaks
- ☑ 95. feat(core): record every file's stability in the map
- ☑ 96. feat(svg): draw the shore as a compact band of flat blocks
- ☑ 97. feat(web): add a hidden dev panel that tunes every token live
- ☑ 98. feat(core): record each file's import ties inside and outside its cell
- ☑ 99. feat(scene): drift each file in an opened cell by its looseness
- ☑ 100. feat(svg): open each touched shore block on a grid of its files
- ☐ 48. feat(cli): cache the terrain per base commit
- ☐ 49. feat(core): relax a new base's layout from the nearest cached one
- ☐ 50. perf(cli): draw a cached run's first frame within two seconds
- ☐ 51. feat(cli): measure health, duplication and structure at the base
- ☐ 52. feat(core): compute health deltas, introduced findings and improvements
- ☐ 53. feat(svg): draw improvements, the live Health Δ and the rename leader
- ☐ 54. feat(web): draw improvements, Health Δ and the rename leader
- ☐ 55. feat(cli): resolve the trunk and the named bases
- ☐ 56. feat(cli): map the working tree's uncommitted weather
- ☐ 57. feat(core): build one weather frame per commit of a range
- ☐ 58. feat(web): scrub a range's weather over one terrain
- ☐ 59. feat(core): compute the whole-repo overlays
- ☐ 60. feat(svg): render the whole-repo overlays in the still map
- ☐ 61. feat(web): toggle overlays and switch bases from the HUD
- ☐ 62. feat(core): record each file's functions for the file level
- ☐ 63. feat(web): open a file into its functions, hunks and coverage strip
- ☐ 64. feat(web): show a changed file's diff or open it in the editor
- ☐ 65. feat(web): open the health radar from the HUD
- ☐ 66. perf(web): collapse cells into composites past 5,000 files
- ☐ 67. refactor(cli): give atis subcommands beside its map flags
- ☐ 68. feat(cli): capture the world headless as a PNG
- ☐ 69. feat(cli): watch the repo and push new weather to the tab
- ☐ 70. feat(cli): render the terrain fingerprint for a README
- ☐ 71. feat(cli): post the map to a pull request through gh
- ☐ 72. build(atis): bundle the workspace into a package that installs
- ☐ 73. docs(atis): write the user's README with the legend and the fingerprint
- ☐ 74. feat(cli): serve MCP tools that point at the open map
- ☐ 75. feat(core): reach exported names through the files that import them
- ☐ 76. feat(web): light a symbol's reach where it crosses a membrane
- ☐ 77. feat(tour): write an opt-in reviewer's tour with fascicle
- ☐ 78. feat(web): play a tour's stops with fly-to
- ☐ 79. refactor(cli): run every producer a repo needs and merge their scans
- ☐ 80. fix(core): sort other languages' manifests and settings onto the shore
- ☐ 81. feat(cli): scan a Go module into the same scan shape
- ☐ 82. feat(cli): scan a Python project into the same scan shape
- ☐ 83. feat(cli): scan Terraform modules into the same scan shape
- ☐ 84. feat(cli): scan shell scripts into the same scan shape
- ☐ 85. feat(cli): read each language's evidence as checkride writes it
- ☐ 86. chore(fixtures): render one reviewed PR per new language
- ☐ 87. docs(producers): write the contract a language producer fills

## Park list

> Mid-step, every new problem / idea / "ooh what if" lands HERE, untouched, and you
> go straight back to the step. Acting the instant an idea arrives is the disease.
> Capture is one line (`/plumbbob:park` composes it). Harvest happens only at the boundary.

- [x] new-dependency's why reads '1 new dependencies' for a single package; it never singularises (libs/core/src/notices.ts dependencyCandidates)
- [x] a package cell's dents are the union of its nested folders' (core's assembleCells), so where a package's skin runs along its folder's the two sets of teeth sit side by side; weigh drawing a package's own-file rules only
- [x] a member's own centre can fall outside its skin once the cut is simplified and smoothed (13 to 20 per retake map, re-skinned at step 13; one on 3 of 8 crowded synthetic fields); the ladder's members-in check holds only the raw marching ring
- [x] corpus-4 missed criterion 5 (tuning half, D127): survived mutants on the flagged checkbox builders' length checks reach none of its six notices, outranked by dead reds and an unmeasured barrel
- [x] corpus-5 missed criterion 5 (tuning half, D127): the flagged loop is fully covered and mutation did not finish, so no notice bears on it; its top three are dead and health reds and an interface change the truth does not name
- [x] health and dead reds on changed files hold 9 of the tuning six's 18 top-three rows and bear on none of the six findings (docs/glance-test.md, tuning half)
- [x] a package barrel no test imports reads as an unmeasured gap with high reach (corpus-4's notice 2), though its added lines are exports
- [x] a NoCoverage mutant is counted and worded as survived (all 88 of corpus-6's, 12 of corpus-1's 14), so the notice overstates what the tests did
- [x] fallow 3.35 writes every re-export's import (cycle edges, boundary violations) at line 1, col 0, so D140 keeps the file rule there; corpus-4's 14 barrel cycles stay on the change through packages/builders/src/index.ts until the scan supplies a re-export's real line or D98's base side lands
- [x] the practice map's balloon lines crowd other marks: balloon 1's line crosses the Other block the HUD wrapped beneath the category, balloon 5's lies along the very stitch it names, and balloon 8's ends at notice box 4; each still lands on its own mark (libs/svg/src/practice.ts)
- [x] second retake: the category read IFR on all five maps, both holds and all three merges: a health or dupes red on a touched function still turns the Gate red though its notice says present at head (corpus-12, corpus-11), and uncovered changed lines reaching three or more modules make any change to a widely read file IFR (corpus-7, corpus-8, corpus-10)
- [x] second retake: an interface notice leads all six held-out maps and holds 15 of their 18 top-three rows; weighed by its readers on a published package it outranks everything, and on corpus-7 it kept the flagged uncovered lines out of all six notices
- [x] second retake: a large repo's sheet draws too small to read when fit to a screen: corpus-7's 1834 by 4215 sheet drew at 0.23, its 9-unit HUD and notice text about 2 points tall, and Rob could not see corpus-12 at 0.62
- [x] second retake: files under test/ that no test run reports (e2e site pages, tsc type tests, a helper) and vitest's focused status draw as unlit stitches, tests not run: 57 of corpus-8's 87, on an approved merge Rob held partly on stitches
- [x] Rob, after the second retake: on most of the five maps he couldn't zoom in or see details; build a coherent, working system on real code he understands first, and refine and tune the encodings later, so range 6's stop defers the four encodings instead of running D119's refine before wave 1
- [x] The world's cell membranes carry no teeth yet: the SVG's dented ring (one tooth per rule, step 12) lives in libs/svg/src/terrain.ts, so step 25's tissue grid lays the plain contour; step 32 should move dentedRing into libs/scene so tissue() lays the dented ring both renderers draw (D86, D146)
- [x] The shore's open blocks name their changed files but drop the spike's grid: D153 has a touched group open on its files, one small square per file with the changed ones lit, then their names, and the SVG draw the same blocks; step 96 followed D158's narrower 'changed files named', so a 50-file group with one change reads like a 1-file group. Add the grid to the band (from shoreRail's count and changed files) in a small SVG step built ahead of step 32, so the world's rail draws the same grid
- [ ] A target with several notices wears one label per notice (demo's index.ts four times, retake-3's createOptionsProxy.ts three), since step 27's labelsFor places each notice's label on its own; weigh one label per target with its run of ranks, in libs/scene/src/labels.ts
- [ ] The HUD's block words and the legend's list are derived twice, in libs/svg/src/chrome.ts and legend.ts and again in apps/web/src/hud.ts, held together by hud.test.tsx's parity over every fixture; weigh one derivation in libs/scene for both renderers, as shoreRail and noticeAnchors are (D86, D90)

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

- 2026-10-23, at range 1 of 24's stop: 1 parked idea, classified.
- **tangent**: park 1 · new-dependency's why reads '1 new dependencies' for a single package; it never singularises (libs/core/src/notices.ts dependencyCandidates) → a singular-plural slip in one notice's why, cosmetic, and no step depends on it
- 2026-10-23, at range 2 of 24's stop: 2 parked ideas, classified.
- **tangent**: park 2 · a package cell's dents are the union of its nested folders' (core's assembleCells), so where a package's skin runs along its folder's the two sets of teeth sit side by side; weigh drawing a package's own-file rules only → the teeth still count the rules inside each skin, and own-file-only teeth are a legibility call for the tuning refine, not a fault the precision scoring touches
- **tangent**: park 3 · a member's own centre can fall outside its skin once the cut is simplified and smoothed (13 to 20 per retake map, re-skinned at step 13; one on 3 of 8 crowded synthetic fields); the ladder's members-in check holds only the raw marching ring → it predates this range and no notice reads a skin, so it can be weighed at the tuning refine before the blind reading
- 2026-10-23, at range 3 of 24's stop: 5 parked ideas, classified.
- **blocker**: park 4 · corpus-4 missed criterion 5 (tuning half, D127): survived mutants on the flagged checkbox builders' length checks reach none of its six notices, outranked by dead reds and an unmeasured barrel → D127 sends every miss to the one refine pass, as an open question beside P6 and P7, which caused it
- **blocker**: park 5 · corpus-5 missed criterion 5 (tuning half, D127): the flagged loop is fully covered and mutation did not finish, so no notice bears on it; its top three are dead and health reds and an interface change the truth does not name → D127 sends every miss to the refine pass, which may judge that no map holds evidence on the flagged loop
- **blocker**: park 6 · health and dead reds on changed files hold 9 of the tuning six's 18 top-three rows and bear on none of the six findings (docs/glance-test.md, tuning half) → it displaced corpus-4's hit and demoted corpus-1's, so the refine should settle it first
- **blocker**: park 7 · a package barrel no test imports reads as an unmeasured gap with high reach (corpus-4's notice 2), though its added lines are exports → it took corpus-4's notice 2, so it rides with P6 into the refine
- **tangent**: park 8 · a NoCoverage mutant is counted and worded as survived (all 88 of corpus-6's, 12 of corpus-1's 14), so the notice overstates what the tests did → every hit stands either way, so it is a wording fix the refine can fold in or leave
- 2026-10-24, at range 4 of 24's stop: 1 parked idea, classified.
- **tangent**: park 9 · fallow 3.35 writes every re-export's import (cycle edges, boundary violations) at line 1, col 0, so D140 keeps the file rule there; corpus-4's 14 barrel cycles stay on the change through packages/builders/src/index.ts until the scan supplies a re-export's real line or D98's base side lands → C2 holds a finding fallow gives no line to its file, D98's base side replaces the rule in wave 3, and D127 judges the fixes on the held-out maps as they stand, so it waits for step 20's reading to say whether it matters
- 2026-10-24, at the step 20 boundary: 6 parked ideas, classified.
- **tangent**: park 10 · the practice map's balloon lines crowd other marks: balloon 1's line crosses the Other block the HUD wrapped beneath the category, balloon 5's lies along the very stitch it names, and balloon 8's ends at notice box 4; each still lands on its own mark (libs/svg/src/practice.ts) → each balloon still lands on its own mark, and round two's practice map is the world's, not this SVG's
- **tangent**: park 11 · second retake: the category read IFR on all five maps, both holds and all three merges: a health or dupes red on a touched function still turns the Gate red though its notice says present at head (corpus-12, corpus-11), and uncovered changed lines reaching three or more modules make any change to a widely read file IFR (corpus-7, corpus-8, corpus-10) → a tuning of the category deferred under P15, and wave 3's base side (steps 51 and 52) is what tells a breach the change made from one present at head
- **tangent**: park 12 · second retake: an interface notice leads all six held-out maps and holds 15 of their 18 top-three rows; weighed by its readers on a published package it outranks everything, and on corpus-7 it kept the flagged uncovered lines out of all six notices → a ranking tune deferred under P15, and the world lets a reader open every notice, not just the top three
- **tangent**: park 13 · second retake: a large repo's sheet draws too small to read when fit to a screen: corpus-7's 1834 by 4215 sheet drew at 0.23, its 9-unit HUD and notice text about 2 points tall, and Rob could not see corpus-12 at 0.62 → the world's continuous zoom (step 37) answers it for a reader, and the still map's size can wait for wave 4's PNG and comment
- **tangent**: park 14 · second retake: files under test/ that no test run reports (e2e site pages, tsc type tests, a helper) and vitest's focused status draw as unlit stitches, tests not run: 57 of corpus-8's 87, on an approved merge Rob held partly on stitches → a false mark worth fixing, but in the stitch reader, which no step in waves 1 or 2 depends on, so it can ride a later fix
- **blocker**: park 15 · Rob, after the second retake: on most of the five maps he couldn't zoom in or see details; build a coherent, working system on real code he understands first, and refine and tune the encodings later, so range 6's stop defers the four encodings instead of running D119's refine before wave 1 → it changes what range 6's stop does, so fold it now as D144 (working-system-first): the second retake's encodings stay parked as tangents, and no refine runs before wave 1, amending D119; range 6's stop drops its refine clause
- 2026-10-24, at range 8 of 24's stop: 2 parked ideas, classified.
- **blocker**: park 16 · The world's cell membranes carry no teeth yet: the SVG's dented ring (one tooth per rule, step 12) lives in libs/svg/src/terrain.ts, so step 25's tissue grid lays the plain contour; step 32 should move dentedRing into libs/scene so tissue() lays the dented ring both renderers draw (D86, D146) → step 32's done-when draws the world's membranes from the tissue grid with no teeth, while D86 and D146 keep a cell's teeth in both renderers; the fold moves the dented ring into `libs/scene` at step 32
- **blocker**: park 17 · The shore's open blocks name their changed files but drop the spike's grid: D153 has a touched group open on its files, one small square per file with the changed ones lit, then their names, and the SVG draw the same blocks; step 96 followed D158's narrower 'changed files named', so a 50-file group with one change reads like a 1-file group. Add the grid to the band (from shoreRail's count and changed files) in a small SVG step built ahead of step 32, so the world's rail draws the same grid → D153 opens a touched shore group on a grid of its files with the changed ones lit, and step 96 drew names alone; the fold adds a small SVG step for the grid ahead of step 32, so the world's rail draws the same blocks

## Log

*(The build's history, oldest first. `plumbbob checkpoint` appends an entry here
every time a step lands (via `/plumbbob:build` or `/plumbbob:verify`): the dated line,
and beneath it the pause as you approved it, so this fills in as you go, not at the
end, and an older step's detail is a scroll away. Add your own decision/event lines too: this is what
you point at to say "I did that: the LLM helped, but those were my calls."
`/plumbbob:finish` reads this for the report; `plumbbob finish` commits it with the build
folder, so it rides the branch into the PR.)*

- 2026-10-09 — plan committed · 86c1b7765

  **Recommendation**: Sharpen D88's tuning loop first: it sits in wave 0, which builds next, and it is the one hole that can stretch the wave and quietly overfit the corpus. Two more holes sit behind `expand 2` and `expand 3`; `/plumbbob:refine` can write all three up as Open questions with plain and lean lines. Q34 to Q36 also need your call at this pause, because they settle steps 5, 14 and 20.

  **1.** D88 (precision-corpus) never bounds the tuning loop that steps 18 and 19 sit in

  D88 says the held-out maps are generated "only after every fix the tuning half prompts has landed". It does not say whether the tuning half is re-scored after those fixes, or how many refine passes it may prompt. A builder who re-scores the tuning half after each fix has started an open loop, and every pass also tunes the encodings harder to six fixtures the builder chose. The map-and-svg build ran five refine passes. Closing it takes one clause in D88: the tuning half is scored once at step 18 and prompts at most one refine pass; its fixes are judged only on the held-out half, and anything left over is parked past step 20.

  **2.** Step 26 is two steps: the scene's weather derivation, and moving `libs/svg` onto it

  Step 26 builds `weatherOf` in `libs/scene` and, in the same diff, rewires `libs/svg/src/weather.ts` (602 lines) to read it. That is too much to review in one pass. It also moves the SVG's goldens in the same commit that introduces the code they now depend on, so a drift between the old drawing and the new derivation cannot be told from an intended change. Closing it means splitting the migration into its own step after 26. Its done-when is the proof: `libs/svg/fixtures/demo/atis.svg` is byte-identical before and after the refactor.

  **3.** Once wave 2 lands, nothing in `pnpm check` covers the world's rendering

  Step 23 excludes `apps/web/src/world/` from the coverage thresholds, and steps 30, 32, 33, 37, 39 and 40 are verified by a screenshot judged at the pause. That suits the step that builds a render. But no gate check exists after it, so the 40-odd later steps that touch `apps/web/src/` can break the world while `pnpm check` stays green. A headless smoke test closes it: render a fixture, assert a non-blank frame and a clean console. That needs the browser driver [Q37 (png-browser)](intent.md#q37) chooses, so Q37 would settle at the wave-1 boundary instead of the wave-3 one, and the smoke test would join step 30.

- 2026-10-23 — step 1 checkpointed · d17b25c05 — test(cli): stop the CLI suite racing the types slot's build (6m)
- 2026-10-23 — step 2 checkpointed · deb6a931d — chore(rules): keep Node, the compiler and the DOM out of lib sources (2m)
- 2026-10-23 — step 3 checkpointed · bf4d97da2 — fix(core): read a changed file no coverage report names as unmeasured (1 drift, 10m)
- 2026-10-23 — step 4 checkpointed · 1feb6c2c4 — fix(core): split interface notices by what moved (1 drift, 3m)
- 2026-10-23 — step 5 checkpointed · d230d9585 — feat(cli): compare inferred export shapes with the type checker (1 drift, 8m)
- 2026-10-23 — step 6 checkpointed · de8e50be2 — fix(core): weigh an interface notice by who reads the names that moved (1 drift, 2m)
- 2026-10-23 — step 7 checkpointed · b335055fa — fix(core): rank a security advisory only when the change brings it (1 drift, 11m)
- 2026-10-23 — step 8 checkpointed · c118a6353 — fix(cli): read bare re-exports and .mts barrels as public surface (3m)
- 2026-10-23 — step 9 checkpointed · b3237672c — fix(core): keep committed build output off the terrain (1 red, 1 drift, 7m)
- 2026-10-23 — step 10 checkpointed · 79726214a — fix(core): sort the retake's leftover shore files by kind (1m)
- 2026-10-23 — step 11 checkpointed · a15bdf927 — fix(svg): size HUD blocks for the widest fallback monospace face (1 drift, 5m)
- 2026-10-23 — range 1 of 24's stop recorded — review what the map now says on the regenerated demo map before the SVG work draws it (unmeasured files lit whole, interface notices split by what moved and weighed by their readers, security only on the change, committed build output on the shore), and open `fixtures/retake-1/`'s re-rendered map in Quick Look to confirm no HUD block overruns its box (step 11's check)

  **Summary**: Wave 0's content fixes are in: a changed file no coverage report names now reads as an unmeasured gap, lit whole, instead of a closed skin. Interface notices split by what moved, the checker prints inferred shapes, and moved names are weighed by their readers. A security advisory ranks only when the change brought it, committed `dist/` output sits on the shore, and the leftover retake files have shore rows. HUD blocks and notice rows are sized for SF Mono, and two gate fixes landed alongside: the CLI suite no longer races the `types` slot, and a struct rule keeps lib sources pure.

  1. Seven of the eleven steps landed a hair off their seams, every stray a direct follow-on of a change inside the seam.
  2. An unmeasured file is weighed as its skin is drawn, lit whole, which is a call D80 leaves open.
  3. The demo fixture gained data so the stop's review can see three of its four marks; security is not among them.
  4. A red `security` slot sits on the change only through the manifest that brought an advisory, and spends no row of its own.
  5. The checker's pass over inferred shapes costs nothing here and guards against the any trap with public API only.

  **Readout**:

  ```text
  steps        11 of 11 landed
               - 1 d17b25c · 2 deb6a93 · 3 bf4d97d · 4 1feb6c2 · 5 d230d95
               - 6 de8e50b · 7 b335055 · 8 c118a63 · 9 b323767 · 10 7972621
               - 11 a15bdf9
  check        green: 1 of 1 checks, 11 landings
  done-when    met
  decisions    honored
               - D80 (unmeasured-not-closed), D122 (excluded-from-coverage)
               - D81 (interface-move-kinds), D123 (mixed-interface-moves)
               - D118 (inferred-shapes), D82 (moved-name-readers)
               - D124 (readers-graph), D83 (security-on-change)
               - D67 (standing-state-notices), D75 (public-surface-width)
               - D84 (build-output-is-shore), D48 (shore-groups)
               - D121 (lib-globals), D20 (workspace-exports)
  constraints  14 of 14 honored
  seam         strayed: 34 paths outside 7 steps' seams
               - step 3: libs/core/src/__tests__/map.test.ts and 4 others
               - step 4: libs/core/src/__tests__/map.test.ts and 5 others
               - step 5: apps/atis/src/__tests__/cli.test.ts
               - step 6: libs/svg/fixtures/categories/LIFR.svg and 4 others
               - step 7: apps/atis/src/run.ts and 2 others
               - step 9: apps/atis/src/__tests__/shapes.test.ts and 9 others
               - step 11: libs/svg/fixtures/categories/LIFR.svg and 3 others
  diff         +3574 -1470 across 40 files
  spent        61 min · 1 red run · 7 drift warnings
  ```

  **Verdict**: ◐ A hair off (seam strayed)

  **Harvested**: 1 of 1 parked idea open

  - P1 · new-dependency's why reads '1 new dependencies' for a single package; it never singularises (libs/core/src/notices.ts dependencyCandidates) → lean: tangent, a singular-plural slip in one notice's why, cosmetic, and no step depends on it

  **Recommendation**: Open `libs/svg/fixtures/demo/atis.svg` for the demo's marks and `/tmp/atis-review/retake-1.svg` for the re-rendered retake-1 map, then reply `looks good` to take the review and P1 as a tangent. Both maps show what the stop asks for, apart from security, which tests pin because the demo's skipped slot cannot show it. retake-1 stays frozen as the retake's record (D61), so its re-render is a scratch file rather than an edit to the fixture.

  **1.** Seven of the eleven steps landed a hair off their seams, every stray a direct follow-on of a change inside the seam.

  Steps 3, 4, 6, 9 and 11 regenerated the four category goldens in `libs/svg/fixtures/categories/` beside the demo golden their seams list. Those goldens are variants of the demo map, so they move whenever it does. Steps 3, 4 and 6 also touched tests outside their seams: `map.test.ts` in steps 3 and 4, where the old kinds and coverage were pinned on the demo, and `chrome.test.ts` in step 6. The rest:

  - **Step 5:** asserts the new `--verbose` lines in `cli.test.ts`.
  - **Step 7:** passes `deps_moved` through `run.ts`.
  - **Step 9:** passes member roots to `shoreMatcher` in `map.ts`, and adds a `beforeAll` to step 5's `shapes.test.ts`. That `beforeAll` parses the default library once, because the first checker test timed out at 7 s under the full gate's load and refused the checkpoint once.

  None is scope drift. Each is the same change reaching a file the plan did not list.

  **2.** An unmeasured file is weighed as its skin is drawn, lit whole, which is a call D80 leaves open.

  D80 says an unmeasured file's skin is lit whole and that it is a gap of unknown size. It says nothing about the rank. Counting its uncovered share as 0 (no measurement, no number) made the demo's `doctor.ts` rank calmer unmeasured than it had measured at 43% uncovered, and its large-hot-change notice fell out of the six. So an unmeasured file ranks with an uncovered share of 1, and every notice on it echoes `unmeasured: 1` beside the share, so the 1 reads as no measurement rather than as one. If you would rather it carry no factor at all, it is one branch in `factorsFor` (`libs/core/src/notices.ts`).

  **3.** The demo fixture gained data so the stop's review can see three of its four marks; security is not among them.

  So the demo map shows the new marks, its inputs now carry what the scan writes:

  - **`emits`:** every scan file carries the new mark.
  - **An unmeasured file:** its coverage report leaves out `apps/cli/src/doctor.ts`, the way this repo leaves out `cli.ts`, so the demo has one unmeasured file, lit whole.
  - **Build output:** `libs/core` has a committed `dist/index.js` and `dist/index.d.ts`, which appear as a BUILD group on the shore and found no cell.

  The demo's barrel now shows `interface-added` with `readers: 2`, fourth of six where `interface-change` used to sit second. Security cannot show there. The demo's `security` slot was skipped (D56), and a brought advisory weighs severity 4 on a shore manifest, below every notice the demo already ranks, so it would not make the six. Tests pin it instead (`notices.test.ts`, `check.test.ts`, `chrome.test.ts`).

  **4.** A red `security` slot sits on the change only through the manifest that brought an advisory, and spends no row of its own.

  D83 extends D67 to security. So the slot now names the manifests its advisories start from: it is the change's red, counted by the gate, only through a manifest whose edit added or moved a package the advisory's path runs through first, and otherwise it stands in the Standing block. The slot's own red-check-slot row is dropped, because the per-package `security-finding` notices on the same manifest already name the package and its advisories, which that row would not. That is the inverse of how `health` works, where the red row speaks for the threshold notice. pnpm writes a member's importer with `/` as `__`; the parser reads that back from pnpm's own encoder.

  **5.** The checker's pass over inferred shapes costs nothing here and guards against the any trap with public API only.

  TypeScript exposes no public handle on its error type, but the error and unresolved types are distinct objects from `checker.getAnyType()`. So a checked type that reaches any `any` other than the written one stays uncompared, and an npm return type swapped for another reads `interface-uncompared` rather than unchanged. Ordinary inferred code (generics, async, `as const`, `JSON.parse`'s declared `any`) compares without a false null. This repo annotates its exports, so `shapes base` and `shapes head` report 0 ms; the real cost waits for the corpus, as D118 says.

- 2026-10-23 — step 12 checkpointed · 0e304ce14 — feat(svg): draw a cell's own dents and clone family on its membrane (1 drift, 8m)
- 2026-10-23 — step 13 checkpointed · 9e6232882 — fix(core): keep a neighbour's centre out of another cell's membrane (27m)
- 2026-10-23 — step 14 checkpointed · bd79f6006 — feat(svg): tell an added file from a modified one (1 drift, 3m)
- 2026-10-23 — step 15 checkpointed · 03915ecc7 — feat(svg): draw a legend inset and an annotated practice map (1 drift, 16m)
- 2026-10-23 — range 2 of 24's stop recorded — review the SVG before the corpus is scored on it: cell dents and clone glyphs on membranes, no organelle inside a cell it does not belong to, the `+` on added paths, the legend inset, and `docs/glance-practice.svg` with its callouts

  **Summary**: The still map now says four more things and keys them on itself. A cell wears its files' broken rules as teeth on its skin and its clone family's glyph beside it (step 12). No file sits under a skin it does not belong to: core carves the skin back off any neighbour the Bubble Set left under it (step 13). An added file's path is written with a leading `+` (step 14). Every map carries a legend inset, and `pnpm practice-map` renders `docs/glance-practice.svg` with numbered balloons drawn from the same list of marks (step 15).

  1. Three of the four steps reached past their seams, the same way earlier steps did
  2. No file now sits under another module's skin, on any map, and the check itself was wrong
  3. The practice map is retake-5, which has no lit arc and no skin lit whole
  4. The practice map's skins are today's, but its notices and evidence are the fifth pass's
  5. Cell glyphs are many, and nested packages wear their folders' teeth too

  **Readout**:

  ```text
  steps        4 of 4 landed
               - 12 0e304ce · 13 9e62328 · 14 bd79f60 · 15 03915ec
  check        green: 1 of 1 checks, 4 landings
  done-when    met
  decisions    honored:
               - D87 (legend-inset), D120 (added-vs-modified)
               - D125 (practice-map-current), D12 (materials)
  constraints  14 of 14 honored
  seam         strayed: 15 paths outside 3 steps' seams
               - step 12: libs/svg/fixtures/categories/LIFR.svg and 3 others
               - step 14: libs/svg/fixtures/categories/LIFR.svg and 3 others
               - step 15: fallow.toml and 6 others
  diff         +3382 -130 across 26 files
  spent        55 min · green first run at every landing · 3 drift warnings
  ```

  **Verdict**: ◐ A hair off (seam strayed)

  **Harvested**: 2 of 3 parked ideas open

  - P2 · a package cell's dents are the union of its nested folders' (core's assembleCells), so where a package's skin runs along its folder's the two sets of teeth sit side by side; weigh drawing a package's own-file rules only → lean: tangent, the teeth still count the rules inside each skin, and own-file-only teeth are a legibility call for the tuning refine, not a fault the precision scoring touches
  - P3 · a member's own centre can fall outside its skin once the cut is simplified and smoothed (13 to 20 per retake map, re-skinned at step 13; one on 3 of 8 crowded synthetic fields); the ladder's members-in check holds only the raw marching ring → lean: tangent, it predates this range and no notice reads a skin, so it can be weighed at the tuning refine before the blind reading

  **Recommendation**: Open `docs/glance-practice.svg` and `libs/svg/fixtures/demo/atis.svg`, judge the teeth, glyphs, `+`, inset and balloons, and take both parks as tangents. Range 3 scores notice precision, which reads none of these marks, so anything you want changed in them can ride the one refine pass its stop allows, before the blind reading that does.

  **1.** Three of the four steps reached past their seams, the same way earlier steps did

  Steps 12, 14 and 15 regenerated the four category goldens in `libs/svg/fixtures/categories/` beside the demo golden their seams list. Those goldens are variants of the demo map, so they move whenever it does, as they did in range 1. Step 15 also added one line each to `tsconfig.json` (the script's project reference), `package.json` (the `practice-map` command) and `fallow.toml` (the script as an entry), because the script runs on the built libraries under a type-checked project of its own. None of it is scope drift, but the plan's seams still don't name the category goldens.

  **2.** No file now sits under another module's skin, on any map, and the check itself was wrong

  The Bubble Set loosens its field until every member is in, and never asks who else is. Step 13 keeps the cut that leaves out the fewest members, then the fewest others, and carves a bay out of it round each neighbour still under it. Each bay is the ring minus a capsule round the file, opened down the nearest way out that crosses the skin exactly twice and takes no member. The carve only removes area, so it cannot put anyone else under. The check was broken too. The library's point-in-ring test miscounts a point level with a vertex where the ring only touches that height. With contours and positions both at two decimals that happens often: it read a point 190px outside a ring's box as inside. `withinContour` now uses the even-odd rule. Re-skinned over their own positions, the ten committed outside-PR maps go from up to 522 foreign centres to none, at about the same speed. A seeded 525-file field (81 under the old cut) and the demo pin it. The demo's skins all hold on the first rung, so its golden did not move.

  **3.** The practice map is retake-5, which has no lit arc and no skin lit whole

  No retake map carries all ten marks, and none carries step 3's unmeasured skin, because all five were generated before it. retake-5 is the most legible of the five (347 files) and has the hairline, the notch, the stitches, both bolts, the ghost and the stain, so it gets eight balloons. retake-2 has the lit arc and a `+`, but no stitches and no red bolt, and runs to 1085 files. `pnpm practice-map retake-2` draws it from there instead. The inset keys all ten either way, and the doc names balloons 2 and 10 as missing from retake-5.

  **4.** The practice map's skins are today's, but its notices and evidence are the fifth pass's

  The retake fixtures are frozen records (D61), and the clones they came from are gone from `/tmp`, so the practice map cannot be regenerated from its tree. It renders the committed `map.json` through today's renderer, with the skins cut again in memory by today's core over the fixture's own positions. That way it shows step 13's fix, and the fixture file is untouched. Its notice kinds and evidence are as the fifth pass wrote them. That is why retake-5 shows no `+`: nothing in its notices was added. The corpus maps steps 17 and 19 generate will carry everything current.

  **5.** Cell glyphs are many, and nested packages wear their folders' teeth too

  A cell's teeth are every rule broken anywhere inside it, so a package and the folder it holds both wear the folder's rules. Where the two skins run together, the teeth sit side by side (P2). Clone families are common in real repos: on retake-2, 131 module outlines carry a glyph. That is the data, drawn as specified, but it is worth a look in the practice map and on the retake maps before the reading leans on either mark.

- 2026-10-23 — step 16 checkpointed · a18fd39b5 — chore(fixtures): select the tuning half of the precision corpus (152m)
- 2026-10-23 — step 17 checkpointed · 0da883268 — chore(fixtures): generate maps for the corpus's tuning half (137m)
- 2026-10-23 — step 18 checkpointed · 3e6109e6d — chore(glance): score notice precision on the tuning half (5m)
- 2026-10-23 — range 3 of 24's stop recorded — read the tuning half's precision by fixture number alone ([D62 (retake-reader-blind)](#d62)) and its parked misses, then run the one refine pass [D127 (tuning-loop)](#d127) allows; the fix steps it adds join range 4, ahead of step 19

  **Summary**: Range 3 chose, generated and scored the tuning half of the precision corpus. Six outside holds from six repos sit in `fixtures/corpus-1` to `fixtures/corpus-6`, each with a README, a quoted truth, a map that passes `assertMap` and an SVG. `docs/glance-test.md` scores them 4 of 6 on criterion 5, read per D65 by fixture number. Both misses, and three encodings the reading turned up, are parked for the one refine pass D127 allows.

  1. The precision section names fixtures by number, but some notice paths name their projects
  2. Six holds from six repos, chosen and re-checked by hidden agents
  3. All six maps have coverage, none is git-only, and mutation completed on three
  4. The tuning half scores 4 of 6, and three of the hits came from test evidence on the flagged lines
  5. Health and dead reds on changed files hold half the top three, and they bear on no finding

  **Readout**:

  ```text
  steps        3 of 3 landed
               - 16 a18fd39 · 17 0da8832 · 18 3e6109e
  check        green: 1 of 1 checks, 3 landings
  done-when    met
  decisions    honored:
               - D38 (glance-is-a-step), D56 (fixtures-skip-audit)
               - D58 (fixtures-current-toolchain), D59 (outside-fixtures)
               - D62 (retake-reader-blind), D64 (fixture-eligibility)
               - D65 (notice-precision-reading), D88 (precision-corpus)
               - D126 (typescript-corpus), D127 (tuning-loop)
               - D128 (held-out-chosen-late), D129 (precision-on-holds)
  constraints  14 of 14 honored
  seam         held: 3 of 3 steps, no strays
  diff         +852212 -0 across 26 files
  spent        4h 54m · green first run at every landing
  ```

  **Verdict**: ● Plumb

  **Harvested**: 5 of 8 parked ideas open

  - P4 · corpus-4 missed criterion 5 (tuning half, D127): survived mutants on the flagged checkbox builders' length checks reach none of its six notices, outranked by dead reds and an unmeasured barrel → lean: blocker, D127 sends every miss to the one refine pass, as an open question beside P6 and P7, which caused it
  - P5 · corpus-5 missed criterion 5 (tuning half, D127): the flagged loop is fully covered and mutation did not finish, so no notice bears on it; its top three are dead and health reds and an interface change the truth does not name → lean: blocker, D127 sends every miss to the refine pass, which may judge that no map holds evidence on the flagged loop
  - P6 · health and dead reds on changed files hold 9 of the tuning six's 18 top-three rows and bear on none of the six findings (docs/glance-test.md, tuning half) → lean: blocker, it displaced corpus-4's hit and demoted corpus-1's, so the refine should settle it first
  - P7 · a package barrel no test imports reads as an unmeasured gap with high reach (corpus-4's notice 2), though its added lines are exports → lean: blocker, it took corpus-4's notice 2, so it rides with P6 into the refine
  - P8 · a NoCoverage mutant is counted and worded as survived (all 88 of corpus-6's, 12 of corpus-1's 14), so the notice overstates what the tests did → lean: tangent, every hit stands either way, so it is a wording fix the refine can fold in or leave

  **Recommendation**: Confirm the leans, then run `/plumbbob:refine` once on P4 to P7, settling P6 first. Its fix steps join range 4 ahead of step 19, and D127 judges them only on the held-out half at step 20, so the tuning six stay at 4 of 6.

  **1.** The precision section names fixtures by number, but some notice paths name their projects

  The done-when asks for each hold's top three notices, and a notice is a kind plus a target path. In at least three of the six fixtures, those paths carry a package or project name a reader could recognise. While I checked one red test slot at step 17, a command of mine also printed a few lines of that fixture's README to the terminal, dependency names included. None of this touches the held-out half. Step 19 must draw it from repos the tuning half did not use, and you never read the tuning six blind. No pause or commit body named a repo or PR (D62). If you'd rather the section carry file names only, say so and I'll trim the paths before step 19.

  **2.** Six holds from six repos, chosen and re-checked by hidden agents

  Three scout agents walked review timelines on 21 repos with `gh api` and wrote up 15 candidates from 10 of them. A selector agent chose six, one per repo, each a concrete defect a human reviewer stated in their own words, and confirmed each in a clone. An independent verifier then re-derived every claim from the public record: the merge, the review and its commit, the verbatim quotes, the merge base and diff counts, the ecosystem, and whether the flagged code is really there. All six passed, with high confidence on substance.

  The six change 3 to 14 TypeScript source files by `classifyFile`'s rule. Four test with vitest and two with jest. Every agent reported counts only. I deleted the scouts' notes on the nine unchosen candidates without reading them, so no held-out finding is known before the fixes (D128).

  `fixtures/corpus.md` records the rules step 19 reuses. It adds two rules of mine: at most two PRs per repo in a half, and the flagged problem must live in the PR's own TypeScript, since a finding outside the terrain could never be a notice.

  **3.** All six maps have coverage, none is git-only, and mutation completed on three

  Two agents on sonnet ran D58's procedure on three fixtures each:

  - full clones and each repo's own install;
  - checkride 0.17.0 and fallow 3.35.0, run through the installed binaries;
  - `security` skipped (D56);
  - coverage written to `.check/coverage/coverage-final.json` (D64).

  All six maps pass `assertMap` and read in check mode, using fallow's entry points. Mutation completed on three and was dropped on the other three after about twenty minutes each.

  Running two suites at once pushed the load average above 100, and the tests that timed out got raised timeouts or a serial run. No test was edited, skipped or deleted. The reds left as run are all global:

  - one tree's own typecheck errors against a dependency version its lockfile pins;
  - one build that needs a platform toolchain this machine lacks;
  - the usual `snippets`, `pack` and `smoke` reds at private roots.

  The atis gate itself went red once at step 17, on two test timeouts under the same load, and passed with no change on the rerun.

  **4.** The tuning half scores 4 of 6, and three of the hits came from test evidence on the flagged lines

  The four hits:

  - **`corpus-1`, notice 3:** mutants on the merge where a parameter shadows the state.
  - **`corpus-2`, notice 3:** the file's one uncovered changed line is the flagged `|| true`. This is the closest call: it says where to look, not that the line is wrong.
  - **`corpus-3`, notice 1:** the interface reshape is the new method that drops the inviter.
  - **`corpus-6`, notice 1:** 88 untested mutants, including the flagged option declaration.

  The two misses:

  - **`corpus-4`:** the checkbox builders hold survived mutants on the flagged checks, but no notice of the six reaches them.
  - **`corpus-5`:** no evidence touches the flagged loop. Its top three are `dead` and `health` reds and an interface change the truth does not name.

  **5.** Health and dead reds on changed files hold half the top three, and they bear on no finding

  Nine of the 18 top-three rows are a `health` or `dead` red on a changed file, and none bears on any of the six findings. They pushed `corpus-1`'s hit down to notice 3. Together with an unmeasured barrel, they kept `corpus-4`'s mutants out of all six notices. This is the retake's first encoding coming back, after D73 narrowed it to findings on the changed lines. It is where the refine should start.

- 2026-10-23 — step 89 checkpointed · 82ef67dbd — fix(core): hold a dead finding to the lines the change touched (15m)
- 2026-10-23 — step 90 checkpointed · 7c7f63f4f — fix(core): rank a health or dead red by the finding behind it (1 drift, 5m)
- 2026-10-23 — step 91 checkpointed · 5d6816f32 — fix(core): read only changed code lines as unmeasured (1 drift, 5m)
- 2026-10-23 — step 92 checkpointed · 69fe9ab33 — fix(core): tell a mutant no test reached from one that survived (1 drift, 4m)
- 2026-10-23 — step 19 checkpointed · 447b84c7e — chore(fixtures): select and generate the corpus's held-out half (197m)
- 2026-10-24 — range 4 of 24's stop recorded — review the tuning fixes as they landed, and the held-out six by their counts alone, before your blind reading builds on them

  **Summary**: Range 4 landed the four fixes the tuning refine asked for, then chose and mapped the held-out half. A `dead` red is now held to the lines the change touched. A `health` or `dead` red ranks as the finding behind it. Only changed code lines read as unmeasured. A mutant no test reached is named apart from one that survived. The held-out six are three holds and three merges from six fresh repos, each re-derived from the public record and mapped in check mode with patch coverage. No goldens moved for the first three fixes; the fourth moved the SVG goldens and the practice map.

  1. Steps 90 to 92 each landed a hair off their seam, and every stray keeps something a reader sees consistent
  2. A dead red is held to the import lines the change touched, but fallow gives no line for a re-export, so corpus-4's barrel cycles still read as the change's
  3. A health or dead red now ranks as the finding behind it, and only changed code lines read as unmeasured
  4. A mutant no test reached is now named apart from one that survived, on the notice, the HUD and the legend
  5. The held-out six, by counts alone

  **Readout**:

  ```text
  steps        5 of 5 landed
               - 89 82ef67d · 90 7c7f63f · 91 5d6816f · 92 69fe9ab · 19 447b84c
  check        green: 1 of 1 checks, 5 landings
  done-when    met
  decisions    honored:
               - D140 (changed-file-reds), D141 (unmeasured-lines)
               - D143 (untested-mutants), D73 (touched-file-breach)
               - D74 (failing-test-rank), D80 (unmeasured-not-closed)
               - D83 (security-on-change), D122 (excluded-from-coverage)
               - D56 (fixtures-skip-audit), D58 (fixtures-current-toolchain)
               - D59 (outside-fixtures), D62 (retake-reader-blind)
               - D88 (precision-corpus), D126 (typescript-corpus)
               - D128 (held-out-chosen-late), D129 (precision-on-holds)
  constraints  14 of 14 honored
  seam         strayed: 5 paths outside 3 steps' seams
               - step 90: libs/core/src/evidence.ts
               - step 91: libs/core/src/__tests__/notices.test.ts
               - step 92: docs/glance-practice.svg and 2 others
  diff         +706839 -480 across 48 files
  spent        3h 45m · green first run at every landing · 3 drift warnings
  ```

  **Verdict**: ◐ A hair off (seam strayed)

  **Harvested**: 1 of 9 parked ideas open

  - P9 · fallow 3.35 writes every re-export's import (cycle edges, boundary violations) at line 1, col 0, so D140 keeps the file rule there; corpus-4's 14 barrel cycles stay on the change through packages/builders/src/index.ts until the scan supplies a re-export's real line or D98's base side lands → lean: tangent, C2 holds a finding fallow gives no line to its file, D98's base side replaces the rule in wave 3, and D127 judges the fixes on the held-out maps as they stand, so it waits for step 20's reading to say whether it matters

  **Recommendation**: Confirm the fixes and the held-out six as they stand, take P9 as a tangent, and run step 20's blind reading next. The fixes did what D140, D141 and D143 asked, except where fallow gives no line, which C2 holds to the file, and the six passed an independent re-derivation. If a held-out map reads LIFR only through a barrel's standing cycle, the reading will show whether P9 needs a fix before wave 1.

  **1.** Steps 90 to 92 each landed a hair off their seam, and every stray keeps something a reader sees consistent

  All three strays were small and needed, so none was a change of scope:

  - **Step 90** exported step 89's unused-export reader from `libs/core/src/evidence.ts`. The notices then read unused exports by the same line rule the split uses.
  - **Step 91** changed `libs/core/src/__tests__/notices.test.ts`, whose evidence input had to move from the old `emits` flag to code spans.
  - **Step 92** made three changes:
    - It rewrote the current legend in `docs/glance-test.md`, which a test holds equal to the inset's words (D125).
    - It re-rendered `docs/glance-practice.svg` with `pnpm practice-map`, so step 20's practice map shows the new notch and HUD.
    - It fixed one doc comment in `libs/core/src/schema.ts` that step 91 had left saying "emit code".

  The retake's record in `docs/glance-test.md` keeps its own words.

  **2.** A dead red is held to the import lines the change touched, but fallow gives no line for a re-export, so corpus-4's barrel cycles still read as the change's

  Step 89's tests run from a fallow 3.35 report captured from a small two-zone repo, saved whole as `apps/atis/fixtures/check/dead-findings.json`.

  The capture showed where fallow's lines can be trusted:

  - **A cycle:** each of its edges is the import in its own file, on its real line.
  - **A boundary violation:** the import is on `line` in `from_path`.
  - **An unused export:** it carries its own line.
  - **A re-export:** fallow writes every import made by a re-export (`export … from`) at line 1, column 0, wherever the statement sits. This holds in both a cycle's edges and a boundary violation.

  atis therefore reads 1:0 as no line, and D140's file rule holds such a finding to its file (C2). A cycle holds each file to its own edge, so one file can follow the line rule while another follows the file rule.

  I ran the rule against corpus-4's and corpus-5's real trees, read-only from a git archive, without regenerating either map (D127):

  - **corpus-5:** all five cycles that name a changed file now read as standing.
  - **corpus-4:** 14 of its 20 cycles stay on the change through the package barrel, whose re-export edges are 1:0. None of the 14 runs through a file the change added, so they are standing in fact, but only a base-side read can show that.

  That is P9. Trusting 1:0 as a line would clear corpus-4, but it would also hide a cycle that a change makes with a new re-export.

  **3.** A health or dead red now ranks as the finding behind it, and only changed code lines read as unmeasured

  **Step 90.** A red slot spends no red-check-slot row on a file where a candidate of its own kind speaks for it:

  - `health` ranks there as `threshold-breached`, at 5.
  - `dead`'s cycles and boundary violations rank as `cycle-or-boundary`, at 9.
  - A row that named several slots now names only those left.
  - An unused export has no kind of its own, so `dead` keeps its row at 10 wherever one is on the change, even beside a cycle's notice.
  - D74's failing test still leads.

  **Step 91.** The scan now records each file's code spans in place of the one `emits` flag. A file a coverage report omits is unmeasured only where a hunk meets one of those spans:

  - A pure deletion inside a function still counts.
  - A barrel whose changed lines are re-exports reads as measured, though it holds a constant.

  The demo's inputs are synthetic, so each emitting file there carries one span of its length, and the goldens held.

  **4.** A mutant no test reached is now named apart from one that survived, on the notice, the HUD and the legend

  Core's `mutantOutcomes` splits a file's live mutants by Stryker's status, and every place a reader sees mutants now reads that split:

  - **The notice:** a `survived-mutants` notice says "2 mutants survived and 1 mutant no test reached", or names one alone when the other is zero. Its inputs carry `survived` and `untested`, and its kind, severity and weight are unchanged.
  - **The HUD:** it reads `Mutants 1 survived, 1 untested` on the demo.
  - **The legend:** the notch reads "a mutant no test killed".

  The wider Mutants block wraps the demo's HUD onto a second row, which moved the SVG goldens. The tuning six and the retake maps keep the wording they were scored with.

  **5.** The held-out six, by counts alone

  **Choosing (D128).** It ran after every tuning fix had landed, through hidden agents:

  - Three scouts examined 126 repos, some only by a search, and wrote up 29 candidates.
  - A selector checked 8 of them in full clones and kept 6, with one substitution for feasibility.
  - An independent verifier re-derived 336 claims from the public record:
    - All six pass every rule.
    - All three holds have high substance confidence.
    - Three cosmetic quote slips were found; the verifier fixed them, then reverted the two whitespace-only ones so no lint suppression was needed.

  **The six.** Three holds and three merges, from six repos, one PR each. None of the repos was read by the tuning half, round one or the retake.

  - 4 to 7 TypeScript source files each.
  - 3 run jest and 3 run vitest.
  - 4 use pnpm and 2 use yarn; 5 are workspaces.

  **Generation (D58).** Two generator agents ran step 17's procedure with checkride 0.17.0 and fallow 3.35.0, `security` skipped:

  - All six maps pass `assertMap`, read in check mode, carry patch coverage, and draw the new legend.
  - Mutation was kept in 2, attempted and dropped in 3, and not attempted in 1, where the repo's runner is outside Stryker's peer range.
  - One map's coverage names one of its four source files, because the repo's own `collectCoverageFrom` leaves the other three out. D122 keeps those three unmeasured.
  - No test was edited, skipped or deleted.

  **Three small things:**

  - **The shuffle.** The selector's first random draw put one verdict in all three of the first slots. It redrew once, under a rule it fixed beforehand. Step 20 reads from its own shuffled copies, so the folder order never reaches you.
  - **A broad `pkill`.** One generator used it to stop its own Stryker run. Nothing shows it reached the other agent, whose kept mutation run completed.
  - **Scratch state.** A husky hooks path stays set in one scratch clone under `/tmp/atis-heldout/`, because a generator's `git config --unset` was refused. The clones and the agents' notes are left there for you to remove.
- 2026-10-24 — step 20 checkpointed · f8f5646fb — chore(glance): read five held-out maps blind on the SVG (23m)

  **Summary**: The second retake failed on all three counts. You matched 2 of 5 verdicts. Your one correct hold gave the map's `health` red as its reason, not the reviewer's finding. And criterion 5 scored 2 of 3 on the held-out holds. `docs/glance-test.md` now records the reading with the five unsealed, and the fail line's four encodings are parked for the refine that D119 runs before wave 1.

  1. The score: 2 of 5 verdicts, no hold reason that matches its review, and 2 of 3 on notice precision
  2. The category read IFR on all five maps, so it told no hold from a merge
  3. An interface notice led every map, and on B it crowded out the evidence that bore on the review
  4. B drew at under a quarter of its size, and D's grey stitches came from files that are not tests
  5. The tuning fixes moved the ranking: no health or dead red reaches any held-out map's top three

  **Readout**:

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    honored:
               - D119 (svg-reading), D125 (practice-map-current)
               - D60 (fixture-balance), D62 (retake-reader-blind)
               - D66 (legend-briefing), D87 (legend-inset)
               - D65 (notice-precision-reading), D129 (precision-on-holds)
               - D127 (tuning-loop), D38 (glance-is-a-step)
  constraints  14 of 14 honored
  seam         held: 2 of 3 declared, no strays
  diff         +229 -0 across 2 files
  spent        23 min · 2 turns · 22s gate · green first run
  ```

  **Verdict**: ● Plumb

  **Recommendation**: Land step 20 as a recorded fail, then run range 6 (`/plumbbob:run`), whose stop settles the four encodings and runs the refine before wave 1. D38 makes a fail a park, not a failed build. The category's IFR and the interface ranking decide what a reader sees first on every map, so the refine should settle those two before the sheet's size and the stitches.

  **1.** The score: 2 of 5 verdicts, no hold reason that matches its review, and 2 of 3 on notice precision

  The key:

  | copy | fixture | pull request | truth | your verdict |
  | --- | --- | --- | --- | --- |
  | A | `corpus-12` | vee-validate #4754 | hold | hold |
  | B | `corpus-7` | react-admin #11024 | hold | merge |
  | C | `corpus-11` | inngest-js #1753 | merge | hold |
  | D | `corpus-8` | swr #4336 | merge | hold |
  | E | `corpus-10` | excalidraw #10964 | merge | merge |

  The draw also dropped `corpus-9` (react-hook-form #13676, a hold), which is scored for criterion 5 only.

  **Your hold reason on A.** You held A on "a health problem", which is A's `health` red, a threshold on functions the change touched that its own notice says is "present at head". The reviewer blocked something else: the submit handler merges the validated output over the raw values, so a key a schema strips survives. The map holds no evidence on that, since those lines are covered and the map has no mutation data.

  **Criterion 5 (D65), holds only (D129):**

  - **`corpus-12`: yes, on the review's lesser finding.** Notice 1 is an interface change on `types/forms.ts`, where `ValidationResult` gained a type parameter with no default.
  - **`corpus-7`: no.** Notices 1 to 3 are on the three files the reviewer flagged, but for options types the fix left alone.
  - **`corpus-9`: yes, the closest call.** Notice 1 is an interface change on `src/types/utils.ts`, whose public types the review says are incomplete.

  The doc names you as the one reader beside the result. The page, the copies and the key are still in `/tmp/atis-glance/` and `/tmp/atis-glance-key/`, and my scripts and screenshots are in `/tmp/atis-step20/`. I'll delete all three once this lands, unless you want the page kept to practise on.

  **2.** The category read IFR on all five maps, so it told no hold from a merge

  Reading the category alone holds every map and scores 2 of 5, the same as the reading. Two rungs put it there:

  - **A `health` or `dupes` red on a function the change touched.** It is the whole of A's IFR and of C's. D140 and D90 moved such a red out of the top three, but it still turns the Gate red, and the Gate sets the category.
  - **Changed lines no test ran, on a file that reaches three or more modules.** These changes reach 13 to 149 cells, so one uncovered line is enough. That made B, D and E IFR. On D it is 2 lines of 25, on an approved merge.

  **3.** An interface notice led every map, and on B it crowded out the evidence that bore on the review

  Interface notices hold 13 of the 15 top-three rows on the five maps you read, and they are the primary on all six held-out maps. All six repos publish packages, so nearly every change reshapes a published name. Step 6 weighs each interface notice by the files that read the names, so it outranks everything else on a widely read package.

  On B the map had the evidence. Uncovered changed lines sit on the very lines the reviewer flagged:

  - line 196, in `useCreate.ts`'s middleware path;
  - line 245, in `useUpdateMany.ts`'s middleware path;
  - line 119, in `useCreate.ts`'s plain custom path;
  - line 111, in `useDeleteMany.ts`'s unguarded branch.

  But five interface notices and a `dupes` red took all six slots, so no notice reached them.

  **4.** B drew at under a quarter of its size, and D's grey stitches came from files that are not tests

  **B was too small to read.** B's sheet is 1834 by 4215, because react-admin has 1,637 TypeScript files. Fit to this machine's 1512 by 982 full screen it drew at 0.23, so its 9-unit HUD and notice text came out about 2 points tall. You merged B on "changes without many obvious things wrong". A, at 0.62, is the one you said you couldn't see.

  **D's stitches read as tests not run.** 57 of D's 87 stitches are unlit, the mark for a test that did not run, and none of the 57 is a test the run reported:

  - 42 are pages of swr's end-to-end test site;
  - 10 are type tests that `tsc` checks;
  - 1 is a helper;
  - 4 carry vitest's `focused` status.

  You held D on "mutants and stitches". D has no mutation data, so it draws no notch.

  Both are parked beside the category and the interface ranking as the fail line's four encodings.

  **5.** The tuning fixes moved the ranking: no health or dead red reaches any held-out map's top three

  D127 judges the tuning fixes on the held-out half alone:

  - **A `health` or `dead` red (D140, D90):** none in any held-out map's top three, down from 9 of the tuning six's 18. One `dupes` red remains, at `corpus-10`'s notice 2.
  - **Unmeasured lines (D141):** no held-out map reads a file as unmeasured.
  - **A mutant no test reached (D143):** every held-out mutant survived the tests, so the split never came into play.
  - **A re-export's line (P9):** no held-out map is LIFR, so P9 never bore on the reading.

  The interface notices took the place those reds left.

- 2026-10-24 — step 21 checkpointed · 1cd481818 — docs(inspiration): cite the corpus repos
- 2026-10-24 — range 6 of 24's stop recorded — wave 0's boundary: settle the reading's result and its parks (the encodings wait for a working system, [D144 (working-system-first)](#d144)), then run `/plumbbob:spike materials` ([D89 (spike-on-a-fixture)](#d89)), whose verdict step 22 records

  **Summary**: Range 6 landed step 21, which closes wave 0. The fixtures section of `docs/inspiration.md` now credits the twelve precision-corpus repos, one row each, and says what was taken: the tree at the fixture commit and the reviewer's words as ground truth. No row claims code. The second retake's result and all its parks were settled at step 20's boundary, so no park is open on this card.

  1. Each of the twelve corpus repos has a row with its link, licence, PR, fixture commit and the reviewer whose words are the truth
  2. Two licences differ from what GitHub reports today, and their rows say so
  3. The first full check failed only on test timeouts while the machine was heavily loaded, then passed in full when the step landed
  4. The reading's result and its parks were settled before this range began

  **Readout**:

  ```text
  steps        1 of 1 landed
               - 21 1cd4818
  check        green: 1 of 1 checks, 1 landing
  done-when    met
  decisions    2 of 2 honored
  constraints  14 of 14 honored
  seam         held: 1 of 1 steps, no strays
  diff         +26 -0 across 1 file
  ```

  **Verdict**: ● Plumb

  **Recommendation**: Confirm the range, then run `/plumbbob:spike materials` before range 7. D144 already settled the reading, so the spike is the only thing left of this stop: per D89 (spike-on-a-fixture), it runs in a throwaway worktree on a retake fixture's real `map.json`, and step 22 (model: fable) records its verdict and the motion tokens.

  **1.** Each of the twelve corpus repos has a row with its link, licence, PR, fixture commit and the reviewer whose words are the truth

  A new paragraph after the retake's table explains what the precision corpus (D88) read. Every repo was one that neither round one nor the retake had used. The tuning half was six holds and the held-out half was three holds and three merges, and five held-out maps were read blind. From each repo atis took two things and no code: the tree at the fixture commit, scanned into `map.json` and drawn as `atis.svg`, and a human reviewer's words, quoted in `truth.md`. No tooling names were taken, so the shore table is as the retake left it.

  The table that follows has the retake table's four columns. Each "what was taken" cell names the reviewer and which of their words count: the review body, the inline comments it rests on, or an approval. Each "where" cell links to the fixture's folder and its row or copy letter in `glance-test.md`. `corpus-9` is marked as scored but not read.

  **2.** Two licences differ from what GitHub reports today, and their rows say so

  Each licence was read from the tree's own licence file at its fixture commit, not from GitHub's repository metadata.

  MCP Inspector was MIT, Anthropic, PBC, at its fixture commit. Its licence file at head now describes a move to Apache-2.0, and GitHub reports "Other".

  inngest-js has no licence file at its root. Each package under `packages/` carries an Apache-2.0 `LICENSE.md`, and `packages/inngest`'s `package.json` says Apache-2.0. Two examples carry their own MIT licence. GitHub's metadata nonetheless reports GPL-3.0.

  The other ten match GitHub's metadata: eight are MIT, and matrix-js-sdk and discord.js are Apache-2.0. Where an Apache licence file names no copyright holder, the holder comes from the source headers: The Matrix.org Foundation C.I.C. for matrix-js-sdk.

  **3.** The first full check failed only on test timeouts while the machine was heavily loaded, then passed in full when the step landed

  The first `plumbbob check` failed four tests, each on vitest's 5-second timeout after running 10 to 21 seconds, in the svg, legend, git-log and shapes suites. At the time the load average was 41: a VM, Zed and an `rg` were taking most of the CPU. A doc-only diff cannot reach those tests. The test slot alone then passed 446 of 446, and the checkpoint's own gate passed every slot in 26 seconds. No test was changed.

  **4.** The reading's result and its parks were settled before this range began

  Step 20's boundary recorded all six of its parks. P10 to P14 are tangents. P15 was folded in as D144 (working-system-first): the second retake's encodings stay parked until atis works on code Rob knows, and no refine runs before wave 1. All fifteen parks in the list are closed, so this card has nothing to classify. What remains of the stop is the materials spike.

- 2026-10-24 — step 22 checkpointed · 63b3f2300 — docs(design): record the materials spike's verdict and motion tokens (41m)

  **Summary**: `docs/design.md` now records the spike's verdict on each of §5.6's three reveals, with the eleven frames it was judged on in `docs/img/materials-spike/`. `tokens.ts` now carries twenty motion tokens at the values the spike left. A test holds each token inside §5.5's bounds, and the design doc's motion table is the log Q3 points at. The check is red only because four tests timed out under heavy machine load; none of them touch this diff.

  1. Each reveal has its verdict in the design doc, beside the frames it was judged on
  2. Twenty motion tokens: the nineteen the spike's tuning panel held, plus the jiggle's decay
  3. The bounds read §5.5 three ways, and that reading is your call
  4. The check is red only because four tests outside this diff timed out under heavy load
  5. The jiggle the spike left rebounds once before it rests

  **Readout**:

  ```text
  check        green: 1 of 1 checks
  done-when    met
  decisions    2 of 2 honored
  constraints  14 of 14 honored
  seam         held: 4 of 4 declared, no strays
  diff         +374 -9 across 14 files
  spent        41 min · 1 turn · 31s gate · green first run
  ```

  **Verdict**: ● Plumb

  **Recommendation**: Approve the verdict and the motion tokens as recorded, but land the step only after the fascicle mutation run finishes, then run `/plumbbob:refine`. The checkpoint re-runs the full gate, and under that load the same four tests will time out again. The refine has what it needs in the doc's five open rulings and the spike report, alongside Q37 (png-browser) for step 30's smoke test.

  **1.** Each reveal has its verdict in the design doc, beside the frames it was judged on

  A new "Phase 1b: the materials spike" section closes `docs/design.md`. It says what the spike tried (a, one dark wet skin; b, lit jelly) on which fixtures (`retake-3`, `retake-1`, `retake-5`), then gives the verdict: viable with a, in your words ("a great start"), and why b dies.

  - **Far: holds.** The key light and the sky must be fully off at the far zoom. The flare's red haze at its peak is noted, and not patched.
  - **Closer: holds, with changes.** The five changes are named: the reach barely blooms and containers don't stack, no lines at the layers' edges and softer terraces, the shore leaves the world for the rail, the sheen comes from a dark-zenith sky, and the stability swells wait for their data.
  - **Inside: holds, with changes.** The two changes are the morphing shapes and a cell that stays open while you move. The gaps (files across the membrane, granules of equal size) belong to other steps.
  - **Motion: holds**, at §5.5's starting numbers.

  An "Open for the refine" list closes the section with the five rulings the verdict leaves: the shore rail against D48, the minimap, the morph in both renderers, whether the morph may move, and the unplaced primary.

  The eleven PNGs are copied byte for byte from `.playwright-mcp/spike/final/` (4.4 MB in all). There was no optimiser in the toolchain, and recompressing the dark gradients would have changed what you judged. The three surface frames were captured before your first look, so they still show the layer lines and the shore drawn as tissue, and the doc says so above them. The shore pair and the shapes frame show a as it was left.

  **2.** Twenty motion tokens: the nineteen the spike's tuning panel held, plus the jiggle's decay

  Each token's value is the one in the spike's `motion.ts` (`MOTION`). Where §5.5 gives a number, the spike kept it: 400, 600, 2 s, 3%, 8 to 20 s, 40 to 90 s, half, 600, 100, 400 and 300. Where §5.5 names a motion without a size, the token takes the spike's value: `SETTLE_LIFT` 18, `SETTLE_DAMPING` 0.72, `FLARE_GAIN` 3, `FLARE_GROW` 0.45, `JIGGLE_AMPLITUDE` 0.22 and `JIGGLE_HZ` 3.2.

  `JIGGLE_DECAY` (4.5) was hard-coded in the spike. It is still a token, because it is the damping §5.5 calls "heavy", and Q3 names spring constants as tunable.

  The random-flare waits are in milliseconds now (`PRIMARY_FLARE_MIN_MS` 8000 and so on), so every duration uses one unit.

  The curves stay untokenised: the flare's 14% rise and its fall as a square, the load flare starting halfway through the settle, and the queue one deep. The Motion section describes them, so the scheduler can draw what you judged.

  `SETTLE_LIFT` is in the spike's heightfield units, where a cell's body swells 9. The doc says so, in case the heightfield's scale changes it.

  **3.** The bounds read §5.5 three ways, and that reading is your call

  - **Ceilings and ranges as written:** fly-to ≤ 400, cross-fades ≤ 300, the 8 to 20 s and 40 to 90 s windows, and C12's 600 ms ceiling on every transient. The flare falls under that ceiling too, since only the breathing may outlast it.
  - **"About" as a quarter either way:** breathing 1.5 to 2.5 s, and 2.25% to 3.75%.
  - **Starting values and missing numbers, by the rule they serve rather than pinned:** half intensity becomes "dimmer than the primary" (0 to 1, exclusive), and the settle's damping becomes "damped, and landing in its time" (0 to 1].

  Pinning the starting values exactly would make every balance patch edit the test, and Q3 exists so those patches can happen. A patch past a bound changes §5.5 itself, and the doc says the bound moves with it.

  The test also holds the doc's motion table to exactly the bounded set. I checked both directions by breaking each one: `FLY_TO_MS` = 500 fails its bound, and a row dropped from the table fails the table test.

  **4.** The check is red only because four tests outside this diff timed out under heavy load

  A Stryker mutation run in `fascicle` held the load average near 40 through both full checks. These four tests ran past vitest's 5 s timeout:

  - the git-log test (`readLog`);
  - the shape-checker test (D118's inferred export);
  - the HUD widest-face test;
  - the legend's no-balloon test.

  None of them read `tokens.ts`'s motion block or `design.md`. Run on their own, all four pass in 2 to 5 s. Every other slot is green, and so is every tokens test. Step 21 hit the same timeouts under the same kind of load.

  **5.** The jiggle the spike left rebounds once before it rests

  With the decay at 4.5 over 600 ms and the frequency at 3.2 Hz, the swing goes +13%, then −4%, then +1% of the relief. That makes the damping ratio about 0.35.

  The test reads §5.5's "heavy damping" as "a twentieth of the swing or less is left when it stops", and 4.5 leaves about 1%. A strict spring reading would want a damping ratio of 0.7 or more, with no visible rebound. You made no patch in the spike, so the token keeps the spike's value. If the rebound bothers you in the world, it is a Q3 patch: raise the decay, or lower the frequency.

- 2026-10-24 — step 23 checkpointed · d80907bda — chore(repo): add the scene library and the web app to the workspace (10m)
- 2026-10-24 — step 95 checkpointed · e9be62690 — feat(core): record every file's stability in the map (3m)
- 2026-10-24 — step 98 checkpointed · 5ea422332 — feat(core): record each file's import ties inside and outside its cell (2m)
- 2026-10-24 — step 24 checkpointed · 4f65d8615 — feat(scene): build the heightfield from depth, stability and mass (1 drift, 6m)
- 2026-10-24 — step 25 checkpointed · bcd9a4ed2 — feat(scene): triangulate membranes and lay out organelle instances (4m)
- 2026-10-24 — step 26 checkpointed · cae7a4574 — feat(scene): derive the weather each organelle carries (1 drift, 6m)
- 2026-10-24 — step 88 checkpointed · dc47134d3 — refactor(svg): draw the still map's weather from the scene's derivations (1 drift, 6m)
- 2026-10-24 — step 94 checkpointed · 7c9938acb — feat(svg): morph a file's outline by the rules it breaks (7m)
- 2026-10-24 — step 96 checkpointed · 0678bfc90 — feat(svg): draw the shore as a compact band of flat blocks (1 drift, 14m)
- 2026-10-24 — step 27 checkpointed · 0b2aded8f — feat(scene): place labels per level of detail without collisions (1 drift, 11m)
- 2026-10-24 — step 28 checkpointed · f7bd91928 — feat(scene): plan levels of detail with hysteresis and cross-fades (2m)
- 2026-10-24 — step 29 checkpointed · eb544073d — feat(scene): schedule every animation inside the motion budget (4m)
- 2026-10-24 — step 99 checkpointed · d25cfc345 — feat(scene): drift each file in an opened cell by its looseness (1 drift, 4m)
- 2026-10-24 — range 8 of 24's stop recorded — review the scene model, with the stability and the ties it reads (steps 95 and 98) and the drift's seeded replay (step 99); the SVG drawn from it with every golden unchanged (step 88); then the SVG's morphed outlines with their shape key (step 94) and its shore as a band of flat blocks along the bottom (step 96), before the world renders them

  **Summary**: The scene model the world will render is built and tested, and the still SVG already draws from it. `libs/scene` and `apps/web` joined the workspace, and the tokens moved under both renderers (step 23). Core now records each file's stability and its import ties (steps 95 and 98). The scene derives the relief, membranes, tissue, instances, weather, reach field, labels, notice anchors, levels of detail, the motion scheduler and the drift (steps 24 to 29 and 99). The SVG reads the scene's weather byte for byte (step 88). It now morphs each file's outline by the rules it breaks, with a key of the seven forms (step 94), and draws the shore as a band of flat blocks under a world cropped to its terrain (step 96).

  1. The reach field reads D151's "skipping container cells" as a container lighting only its own ground, as the SVG does
  2. The SVG draws its weather from the scene, proved identical on every map the repo holds
  3. The SVG's look changed on purpose: morphed outlines with a shape key, and the shore as a band under a cropped world
  4. retake-1's primary is now seen, on the tests block, which revised step 96
  5. The scheduler and the drift replay seeded minutes, and the replay caught a bug

  **Readout**:

  ```text
  steps        13 of 13 landed
               - 23 d80907b · 24 4f65d86 · 25 bcd9a4e · 26 cae7a45 · 27 0b2aded
               - 28 f7bd919 · 29 eb54407 · 88 dc47134 · 94 7c9938a · 95 e9be626
               - 96 0678bfc · 98 5ea4223 · 99 d25cfc3
  check        green: 1 of 1 checks, 13 landings
  done-when    met
  decisions    bent
               → D151 (dark-wet-skin): containers light their own ground
  constraints  bent
               → C9 (deps-earn-their-place): rows wait for step 44
  seam         strayed: 12 paths outside 6 steps' seams
               - step 24: libs/scene/package.json and 2 others
               - step 26: libs/scene/src/membranes.ts, libs/scene/src/raster.ts
               - step 27: docs/design.md and 3 others
               - step 88: libs/svg/src/practice.ts
               - step 96: libs/scene/src/weather.ts
               - step 99: libs/scene/src/shape.ts
  diff         +8650 -3474 across 84 files
  spent        81 min · green first run at every landing · 6 drift warnings
  ```

  **Verdict**: ○ Out of plumb (decisions bent)

  **Harvested**: 2 of 17 parked ideas open

  - P16 · The world's cell membranes carry no teeth yet: the SVG's dented ring (one tooth per rule, step 12) lives in libs/svg/src/terrain.ts, so step 25's tissue grid lays the plain contour; step 32 should move dentedRing into libs/scene so tissue() lays the dented ring both renderers draw (D86, D146) → lean: blocker, step 32's done-when draws the world's membranes from the tissue grid with no teeth, while D86 and D146 keep a cell's teeth in both renderers; the fold moves the dented ring into `libs/scene` at step 32
  - P17 · The shore's open blocks name their changed files but drop the spike's grid: D153 has a touched group open on its files, one small square per file with the changed ones lit, then their names, and the SVG draw the same blocks; step 96 followed D158's narrower 'changed files named', so a 50-file group with one change reads like a 1-file group. Add the grid to the band (from shoreRail's count and changed files) in a small SVG step built ahead of step 32, so the world's rail draws the same grid → lean: blocker, D153 opens a touched shore group on a grid of its files with the changed ones lit, and step 96 drew names alone; the fold adds a small SVG step for the grid ahead of step 32, so the world's rail draws the same blocks

  **Recommendation**: Approve the range, and settle P16 and P17 as blockers: the teeth folded into step 32, and the shore grid as a small SVG step ahead of it. Before then, look at the two rendered sheets for the band and the shape key, and say whether D151's container reading should stand as built. Every later wave-2 step renders this model, so a change to the reach reading or the band is cheapest now. The teeth belong in step 32, the step that first draws the world's membranes.

  **1.** The reach field reads D151's "skipping container cells" as a container lighting only its own ground, as the SVG does

  D151 and step 26's done-when say each point of the reach takes "the brightest reach of the cells over it, skipping container cells, so nested skins never stack". The spike skipped every cell that holds another, so a reached package's own loose files went dark. The SVG has always lit a reached package's own territory, its contour with its children cut out (D45). Since step 88 makes both renderers draw one derivation (D86), `reachField` lights each reached cell's own territory and keeps the brightest at each point. Nothing stacks, and the world and the SVG agree. If you want the spike's reading back, the world goes dark where the SVG glows, and step 33 would have to say so. Step 24 made the matching call: a package's bump weighs only its own files, since its `body_loc` counts its folders too.

  **2.** The SVG draws its weather from the scene, proved identical on every map the repo holds

  Step 88 deleted the SVG's own weather derivations: reach cells and holes, mutants, stitches, storm placement and hanging. It draws `weatherOf` instead, and the file is about 270 lines shorter. The proof went past the goldens. All 22 fixture maps and the core demo render byte-identical from HEAD and from the new tree, as does the practice sheet. fallow found no new clone.

  **3.** The SVG's look changed on purpose: morphed outlines with a shape key, and the shore as a band under a cropped world

  `outlineOf` (step 94) is the spike's morph Rob judged: seven forms, seeded by path, drawn still in the SVG and movable by the scheduler. Round files stay circles. A legend row keys the seven forms without a number, so the reading record's marks and the practice callouts are unchanged. At the legend's 5-unit radius, level 1's wobble is barely distinguishable from round. Step 96 moved the shore off the terrain into a band of flat blocks along the foot (D153, D158), with the touched groups first, `other` framed loud, and long paths cut from the left. The world now frames the terrain alone, so `retake-3`'s sheet dropped from about 1,800 to 1,150 tall. To see both, open `libs/svg/fixtures/demo/atis.svg` and `docs/glance-practice.svg`. A notice on a shore file hangs its boxes on its group's block.

  **4.** retake-1's primary is now seen, on the tests block, which revised step 96

  D148's anchors live in the scene (step 27), and the SVG now rings and boxes each notice where the scene anchors it. `retake-1`'s primary is a test file that draws no stitch, since the frozen map predates the import that would make one. So it falls through to its shore group, `tests`. Step 96 had left `tests` out of the rail as evidence; step 27 put it back as a block like any other, naming its changed test files. Its files are still never terrain (D4).

  **5.** The scheduler and the drift replay seeded minutes, and the replay caught a bug

  `createScheduler` reproduces the spike's measured curves: a 3.8% settle overshoot at 400 ms, a load flare peaking near four times the light, and random flares inside their windows. It never has two flares in flight, its flares fall at the same times at any frame rate, and it adds the shapes' motion by rule count (D147). One test caught a stale flare that still counted as in flight when no frame had been drawn since it ended. The drift is a pure function of time on the demo's pm cell: a tethered file stays within a unit of its place, a loose one crosses the cell and touches the membrane without crossing it, and no two bodies overlap in any frame. One side note: other projects' checks pushed this machine's load past 90 for a while. Two heavy tests timed out under coverage, `retake-5`'s practice render (now given 30 s) and an earlier step's type-checker test. The second passed once the load fell.

- 2026-10-24 — step 30 checkpointed · 6575c416f — feat(web): render the field and the soft skin from a served map (1 drift, 107m)

  **Summary**: `apps/web` draws step 24's heightfield as one mesh over the near-black field: the relief rides a half-float data texture, the vertex stage displaces by it with the scheduler's amplitude and lift, the fragment stage reads its normal from the same texture, and a physical material in graphite and blue-grey wears a clearcoat sheen under one key light, an ambient and a sky black at the zenith. One render loop asks the scheduler for every frame, and the level of detail switches the key light and the sky off at the far field. The gate gains the world's smoke test, which serves the app from Vite in-process and renders the demo map headless on WebGL 2 in the installed Chrome in about two seconds. Both backends draw the same frames with clean consoles, and the frames to judge are in `.playwright-mcp/step-30/`: the opening frame, the surface at `?zoom=2`, the tilt at 35°, each on WebGPU and WebGL 2, and retake-3's surface and tilt.

  1. The world opens on the dark far field, so the pause's frames are at the surface and tilted
  2. AgX replaces the spike's Neutral tone mapping, which zeroed the graphite's red
  3. The relief rides one data texture, and the albedo blends by the cells' mass until the tissue grid lands
  4. The smoke test opens Chrome on the WebGL 2 path and judges a screenshot in the page
  5. Four page parameters are the only instruments until the camera lands, and one row strayed outside the seam

  **Readout**:

  ```text
  check        green: 1 of 1 checks
  done-when    drift: the opening frame is the far field, dark by D151
               → terraces and swells show from `?zoom=2`, the frames judged
  decisions    honored:
               - D151 (dark-wet-skin)
               - D152 (soft-layers-as-data)
               - D132 (world-smoke-test)
               - D145 (png-browser)
               - D94 (seeded-motion)
  constraints  14 of 14 honored
  seam         strayed: 1 path outside the seam
               → docs/inspiration.md
  diff         +651 -62 across 14 files
  spent        107 min · 2 turns · 31s gate · green first run
  ```

  **Verdict**: ✗ Not standing (done-when drifted)

  **Recommendation**: Take the skin as the world's base under AgX and keep the far field dark as the spike's approved frame. The soft terraces, the swells and the sheen all read on the tilted frames, the key light and the sky switch with the level of detail as D151 asks, and the weather of steps 33 and 34 is what lights the far field; the sheen on the demo map's five small cells reads as glossy beads at the spike's clearcoat values and as broad flanks on retake-3, and step 97's panel is the place to tune that rather than this step.

  **1.** The world opens on the dark far field, so the pause's frames are at the surface and tilted

  The step's sentence asks the demo map's opening frame to show terraces and swells, and D151 turns the key light and the sky off at LOD0. The opening frame is zoom 1, the far field: `lod.ts` reads its one scalar as the zoom over the fit, §5.6's first reveal is lights on a dark field, and the spike's approved far frame was taken there, a black pool with the lights in it, the skin at a twentieth of its albedo under a tenth of the ambient. Until steps 33 and 34 put the notices and the changed set in it, that pool is the whole opening frame (`opening-webgpu.png`, a black rectangle a shade under the field). So the step reads "opening frame" as the frame the reviewer opens on: `?zoom=2` is past LOD1's gate at 1.7, the plan's second layer brings the key light, the ambient and the sky up, and the surface and tilt frames were taken there, where the smoke test looks too. The call this pause reserves is between two readings: keep the far field as the opening, the glance test's ten-second frame, and let the weather light it; or open one level in until it does. I kept the far field.

  **2.** AgX replaces the spike's Neutral tone mapping, which zeroed the graphite's red

  The first surface frames came out blue-black. Measured over the central crop, the mean was 4.8, 14.2 and 24.6 in red, green and blue, where the albedo's own ratio is two thirds red to blue, and the key light alone gave 3.8, 10.8 and 19.3, so the light was not the cause. Three's Neutral tone mapping takes a black point off every colour: for any colour whose lowest channel sits under 0.08 it subtracts that channel, and every value of a base tissue this dark sits there, so the graphite's red went to nothing. Under AgX the same frame measured 28, 34 and 41, the albedo's ratio to within a few percent; linear output measured 32, 36 and 42 but clips the sheen's glints to white, and ACES 15, 18 and 23 with crushed shadows. The spike's frames carried Neutral's cast under brighter tissue and the warm reach, which is why it was not seen. AgX also rolls the weather's HDR light off instead of clipping it, at the cost of paling a hue at its peak, which steps 33 and 34 will see on the flares; step 97's panel is where to compare them live.

  **3.** The relief rides one data texture, and the albedo blends by the cells' mass until the tissue grid lands

  The heightfield's three grids go up as one RGBA half-float texture, filterable on both backends: red the terraces and swells at rest, green the cells' mass, which the vertex stage scales by the scheduler's amplitude and the whole lifted by its lift, so the settle and the jiggle move the bumps alone. The normal is read in the fragment stage from four samples one texel either side, so the terraces stay soft however coarse the mesh and the normal follows the settle, and the clearcoat reads the same normal, since left to its own it takes the flat grid's and never glints. The mesh has one vertex per sample at a resolution of 4 layout units: 121 by 166 on the demo map, 265 by 437 on retake-3, the spike's size. The albedo runs from graphite on the field to blue-grey by each point's share of a cell's full mass, a stand-in for step 32's tissue grid, and dims to a twentieth at the far field. The material sets its emissive output to nothing by name (D152); the MRT target it feeds comes with bloom at step 32. The sky is a 256 by 128 equirectangular data texture laid on the CPU, black at the zenith, the band and the three boxes at the spike's values, which the physical material filters into its reflection levels, and `environmentIntensity` carries the level-of-detail switch with the lights.

  **4.** The smoke test opens Chrome on the WebGL 2 path and judges a screenshot in the page

  The test starts Vite in-process on the app's own config, root `apps/web`, silent, on a port the system picks, with one plugin that answers `/map.json` with the demo fixture. It launches the installed Chrome through `playwright-core`, else the first of `chromium`, `chromium-browser`, `google-chrome`, `google-chrome-stable` or `chrome` on the PATH, and with neither it fails naming both rather than skipping, since a world no test can open is no gate. It opens `?backend=webgl&zoom=2`, waits for the canvas to carry `data-world="settled"`, which the loop sets once the scheduler's lift reaches zero, checks the canvas says `webgl`, hides the chrome, takes a screenshot and decodes it in the page with `createImageBitmap` and an `OffscreenCanvas`: it fails on any console error or warning, on fewer than a fifth of the pixels clear of the field, or on fewer than 64 shades. It takes 2.2 s here and the test slot 30 s. Its first run failed on a 404: Chrome asks for a favicon by itself, so `index.html` now carries an inline empty icon. Headless Chrome 155 on this machine has no WebGPU, so the fallback is the natural headless path, and forcing it keeps the test honest once a Chrome ships WebGPU headless.

  **5.** Four page parameters are the only instruments until the camera lands, and one row strayed outside the seam

  `view.ts` reads `?backend=webgl`, `?zoom=`, `?tilt=` (0 to 35°, from the south-west as the spike's tilt frames) and `?seed=`, with a test for each, and the scheduler takes `prefers-reduced-motion` from the page. To look live before step 31 serves the world, run `pnpm --filter web dev` and open `http://localhost:5173/?map=/@fs/<absolute path to a map.json>&zoom=2&tilt=35`, since Vite serves a workspace file raw under `/@fs/`. In the headed Chrome the skin settled 1.1 s after navigation on both backends, within C14's target, which step 43 measures properly. `playwright-core` went in at its latest release, 1.64.1, and C9 asks each new dependency for a row in `docs/inspiration.md`, which is the one path outside the seam; `camera-controls` stays installed and unused until step 37, as fallow's ignore records.

- 2026-10-24 — step 97 checkpointed · 703aa52df — feat(web): add a hidden dev panel that tunes every token live (1 drift, 23m)
- 2026-10-24 — step 31 checkpointed · fda74e3e1 — feat(cli): serve the world and open it in a tab (1 drift, 9m)
- 2026-10-24 — step 100 checkpointed · 8be6a3389 — feat(svg): open each touched shore block on a grid of its files (1 drift, 6m)
- 2026-10-24 — step 32 checkpointed · 2045a4c70 — feat(web): draw cells and organelles, and the shore in a rail (17m)
- 2026-10-24 — step 33 checkpointed · 4c4a9c042 — feat(web): draw the weather (13m)
- 2026-10-24 — range 10 of 24's stop recorded — open `atis --base main` in your own tab, with the dev panel to hand (step 97), and review the world at LOD1 before notices are labelled over it: dark tissue with its faint rim, organelles lit only by state, the shore rail, base tissue that never blooms (step 32's review), and three fixtures' weather against their SVGs, mark for mark (step 33's check)

  **Summary**: The world now serves itself and draws the whole surface: `atis --base <ref>` builds the map and serves the built app and the map on loopback behind a per-run token, opening a tab that shows the dark tissue with its teeth, every file as one instanced mesh, the shore as a rail beside the terrain, bloom on emissive light alone, and the weather mark for mark with the still sheet, with a hidden panel that moves every token live and a registry every material and the scheduler read through.

  1. Three steps landed a hair off their seams, each by a line or two the done-when needed
  2. `pnpm build` fills `apps/atis/web`, and `atis --base <ref>` serves it on loopback behind a token until Ctrl-C
  3. The surface is the spike's look rebuilt properly: tissue with teeth, instanced files, bloom on emissive alone, and the rail
  4. The weather matches the sheet mark for mark, with one judgment for the panel: the reach's gain
  5. Frame times: a second to settled on headless WebGL 2, and 60 fps at every zoom, with the panel's changes proven live

  **Readout**:

  ```text
  steps        5 of 5 landed
               - 97 703aa52 · 31 fda74e3 · 100 8be6a33 · 32 2045a4c · 33 4c4a9c0
  check        green: 1 of 1 checks, 5 landings
  done-when    met
  decisions    honored:
               - D156 (dev-panel)
               - D92 (serve-and-open)
               - D133 (served-assets)
               - D134 (loopback-trust)
               - D160 (shore-grid)
               - D159 (shared-teeth)
               - D151 (dark-wet-skin)
               - D152 (soft-layers-as-data)
               - D153 (shore-rail)
               - D86 (svg-stays-the-fixture)
               - D68 (standing-state-storms)
  constraints  14 of 14 honored
  seam         strayed: 7 paths outside 3 steps' seams
               - step 97: libs/scene/src/drift.ts, libs/scene/src/motion.ts
               - step 31: .gitignore and 3 others
               - step 100: apps/web/src/registry.ts
  diff         +5443 -1255 across 62 files
  spent        71 min · green first run at every landing · 3 drift warnings
  ```

  **Verdict**: ◐ A hair off (seam strayed)

  **Recommendation**: Build, open this range's own change, and judge the surface with the panel to hand before step 34 labels notices over it. `pnpm build` then `node apps/atis/dist/cli.js --repo . --base HEAD~5` with `&zoom=2` (and `&tilt=35` for the sheen) added to the opened URL shows the dark tissue, the rail and the weather on code you know, and the frames at /tmp/atis-33-*.png stand beside their sheets for the mark-for-mark check; move `WEATHER.reachGain` first, and the look you settle on rides into step 44's material tokens.

  **1.** Three steps landed a hair off their seams, each by a line or two the done-when needed

  Step 97 gave the scheduler a `tokens` option on `createScheduler`, `settleAt`, `flareAt`, `jiggleAt` and `driftOf` in `libs/scene`, two paths outside its seam, because the done-when has the scheduler read its tokens through the registry and its constants were module imports with no way in. Step 31 had the web app forward the page's `token` to `/map.json` (`apps/web/src/load.ts` and its test), since the server refuses the map without it, and added the copied `apps/atis/web/` to `.gitignore`. Step 100 listed its two grid tokens in the panel's registry, whose test holds the listing to the design doc's tables. Steps 32 and 33 landed plumb. Nothing in any of them is scope the plan did not ask for; they are the seams written a path short.

  **2.** `pnpm build` fills `apps/atis/web`, and `atis --base <ref>` serves it on loopback behind a token until Ctrl-C

  With no `--out` or `--svg`, the CLI builds the map, finds the web app in a `web/` directory beside its own `dist/`, which `pnpm build` now fills by building `apps/web` and copying it there, and serves both on 127.0.0.1 at a port the system picks, answering only its own `Host` and the map only to a token drawn per run and carried in the URL it opens; `--no-open` keeps the tab closed, SIGINT closes the server and exits 0, and with no build there the command exits 2 naming `pnpm build`. To look now: `pnpm build`, then `node apps/atis/dist/cli.js --repo . --base HEAD~5`, and add `&zoom=2` to the URL it opens, since the camera stays at the far field until step 37's controls land; `--base main` from the `main` branch itself maps an empty change, so this range's own five commits are the nearest real weather.

  **3.** The surface is the spike's look rebuilt properly: tissue with teeth, instanced files, bloom on emissive alone, and the rail

  The skin samples step 25's tissue grids, which now lay the dented ring the SVG draws from the same place in the scene (every golden byte-identical), with a rim where the skin slopes away and each cell's own faint light, both emissive and neither reaching the bloom. Every placed file is one instanced fan scaled per vertex by the radius its morphed outline has at that angle, draped on the relief and riding the settle, dim and flat, with a glow that is nothing at rest; the frame goes through one pass whose bloom reads the emissive target alone. The shore is a scrolled rail at the right edge from `shoreRail` and the grid, the touched groups open with their changed files named and long paths cut from the left, and the camera fits the terrain into the screen left of it.

  **4.** The weather matches the sheet mark for mark, with one judgment for the panel: the reach's gain

  `marks.ts` turns `weatherOf` into records a test holds to the scene's weather on three maps, and the world draws them as instanced sectors, bolts, ribbons and projected labels, their nine hues live from the registry. Against the sheets at /tmp/atis-33-{calm,red,rename}-svg.png, the frames at /tmp/atis-33-{calm,red,rename}.png carry every mark: stains with their hatching, hairlines and lit gaps, notches, stitches, dashed ghosts, deleted and renamed outlines with the old path beside, warm crossings, graphite standing bolts, red change bolts with their slots (corpus-1, at /tmp/atis-33-storms.png), and the edges as the only lines. The one thing that does not match by eye is the reach's weight: at the spike's gain of 1.05, under AgX, added to the lit albedo and bloomed, a reached cell read as a near-white wash where the sheet lays a warm tint at 0.45; it opens at 0.7 and still reads bright, so `WEATHER.reachGain` is the first token to move in the panel, and the panel copies whatever you settle as the patch step 44 records. The rename frame is retake-4 with one changed file turned into a rename, since no fixture carries one.

  **5.** Frame times: a second to settled on headless WebGL 2, and 60 fps at every zoom, with the panel's changes proven live

  Headless Chrome on the WebGL 2 fallback settled retake-3 in 0.9 to 1.3 s after navigation, retake-1 in 1.0 s, checkride-pr4 in 1.0 s and corpus-1 in 1.3 s, and held 60 fps, the display's cap, over two seconds at zoom 1, 2 and 6 and tilted to 35°, with a clean console on every frame. The dev panel's instrument was proven in the same browser: a skin colour moved the frame on the next frame, survived a reload, opened by its key combination in the published build, and reset to the exact resting frame; the panel's code is its own chunk, fetched only when opened.

- 2026-10-24 — step 34 checkpointed · ed096bfed — feat(web): draw the notices with their labels and leaders (1 drift, 24m)
