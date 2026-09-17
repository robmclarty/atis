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

**Current step:** 1 — chore(repo): scaffold the atis monorepo with checkride init
**Heavy check:** checkride (set a "check" key in .plumbbob/settings.json to override)

## Steps

*(Mirror of intent.md's Steps, with live status; CLI-maintained, not hand-edited.
`build`/`checkpoint`/`revert` re-render this from intent.md, and set the Current step
line above. Only ONE step is in flight; a step is done only after a checkpoint:
check green + checkpoint taken, via `/plumbbob:verify` or `/plumbbob:build`.)*

- ☐ 1. chore(repo): scaffold the atis monorepo with checkride init
- ☐ 2. feat(core): define the map.json schema types and assertMap
- ☐ 3. feat(core): identify cells, organelles and shore groups from a file list
- ☐ 4. feat(core): compute topological depth bands over the import graph
- ☐ 5. feat(cli): scan TypeScript imports into files, exports and edges
- ☐ 6. feat(cli): read the git diff into change kinds, sizes and head-side hunks
- ☐ 7. feat(history): mine git log into churn, age, bug-fix rate and co-change
- ☐ 8. feat(cli): read checkride's .check artifacts into evidence inputs
- ☐ 9. feat(core): compute the changed set and reach by module hop
- ☐ 10. feat(core): compute evidence and the flight category
- ☐ 11. feat(core): rank notice candidates into the six-slot budget
- ☐ 12. feat(core): assemble map.json through one pure buildMap
- ☐ 13. feat(cli): add the atis command that writes map.json for a base ref
- ☐ 14. chore(spike): generate and spot-check map.json for checkride's PR 4
- ☐ 15. feat(core): lay out organelles within bands with a seeded force simulation
- ☐ 16. feat(core): draw cell membranes as Bubble Set contours over the layout
- ☐ 17. feat(svg): render the field, terraces, membranes and organelles
- ☐ 18. feat(svg): render the weather layer over the terrain
- ☐ 19. feat(svg): render the notice labels and the HUD grade blocks
- ☐ 20. feat(cli): add --svg and --open to write and show the static render
- ☐ 21. docs(design): record the colour and chrome tokens the SVG settled
- ☐ 22. chore(fixtures): generate map.json and the SVG for five historical PRs
- ☐ 23. chore(glance): run glance-test round one and record the verdicts

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
