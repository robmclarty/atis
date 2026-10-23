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

**Current step:** 6 — fix(core): weigh an interface notice by who reads the names that moved
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
- ☐ 6. fix(core): weigh an interface notice by who reads the names that moved
- ☐ 7. fix(core): rank a security advisory only when the change brings it
- ☐ 8. fix(cli): read bare re-exports and .mts barrels as public surface
- ☐ 9. fix(core): keep committed build output off the terrain
- ☐ 10. fix(core): sort the retake's leftover shore files by kind
- ☐ 11. fix(svg): size HUD blocks for the widest fallback monospace face
- ☐ 12. feat(svg): draw a cell's own dents and clone family on its membrane
- ☐ 13. fix(core): keep a neighbour's centre out of another cell's membrane
- ☐ 14. feat(svg): tell an added file from a modified one
- ☐ 15. feat(svg): draw a legend inset and an annotated practice map
- ☐ 16. chore(fixtures): select the tuning half of the precision corpus
- ☐ 17. chore(fixtures): generate maps for the corpus's tuning half
- ☐ 18. chore(glance): score notice precision on the tuning half
- ☐ 19. chore(fixtures): select and generate the corpus's held-out half
- ☐ 20. chore(glance): read five held-out maps blind on the SVG
- ☐ 21. docs(inspiration): cite the corpus repos
- ☐ 22. docs(design): record the materials spike's verdict and motion tokens
- ☐ 23. chore(repo): add the scene library and the web app to the workspace
- ☐ 24. feat(scene): build the heightfield from depth, stability and mass
- ☐ 25. feat(scene): triangulate membranes and lay out organelle instances
- ☐ 26. feat(scene): derive the weather each organelle carries
- ☐ 27. feat(scene): place labels per level of detail without collisions
- ☐ 28. feat(scene): plan levels of detail with hysteresis and cross-fades
- ☐ 29. feat(scene): schedule every animation inside the motion budget
- ☐ 30. feat(web): render the field and the soft skin from a served map
- ☐ 31. feat(cli): serve the world and open it in a tab
- ☐ 32. feat(web): draw cells, organelles and the shore
- ☐ 33. feat(web): draw the weather
- ☐ 34. feat(web): draw the notices with their labels and leaders
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
- ☐ 88. refactor(svg): draw the still map's weather from the scene's derivations
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

- (none yet)

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
