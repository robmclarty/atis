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

**Current step:** 13 — feat(cli): add the atis command that writes map.json for a base ref
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
- ☑ 24. fix(core): send hook folders to the scripts shore group

## Park list

> Mid-step, every new problem / idea / "ooh what if" lands HERE, untouched, and you
> go straight back to the step. Acting the instant an idea arrives is the disease.
> Capture is one line (`/plumbbob:park` composes it). Harvest happens only at the boundary.

- [ ] test and shore patterns: vitest __snapshots__/*.snap and .gitkeep land in other, and a tests/ folder counts as terrain; decide whether the defaults grow once step 14 or 22 shows real repos
- [ ] generated TypeScript is terrain today: a committed dist/ or a .d.ts file scans like source; decide whether the scan drops it once step 14 or 22 shows a repo that commits one
- [ ] changed test files need a home in changed[]: step 9 gives them the group id 'tests' (D4 keeps them off the terrain, D48 demands exactly one cell or group), so step 12 must list a tests group in terrain.groups or assertMap rejects every PR that touches a test
- [ ] a changed source file the coverage report never names yields no gap, so an uninstrumented new file can read as VFR; D27's gap rule needs a third state (unmeasured) or the notices step needs an 'untested changed file' candidate
- [ ] core's CheckArtifacts is the .check contract but nothing proves apps/atis still satisfies it once step 12 stops importing every field; consider a type-level conformance assertion in apps/atis
- [ ] computeEvidence runs computeReach once per changed file, which recomputes newCrossModule each time; harmless at spike scale, worth a narrow per-file reach export if a large PR shows up in step 14
- [ ] notices.ts: the deleted-export `why` says "1 files still import it"; pluralise the consumer count
- [ ] C1's struct rule, when it lands, scopes to shipped sources: tests under __tests__/ may import node:* to read fixtures (Rob, 2026-09-17)
- [ ] atis writes map.json into the working directory by default; .gitignore does not cover it, so a run in this repo leaves an untracked file

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
