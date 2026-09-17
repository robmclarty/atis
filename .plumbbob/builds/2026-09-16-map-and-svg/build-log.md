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

**Current step:** 24 — fix(core): send hook folders to the scripts shore group
**Heavy check:** checkride (set a "check" key in .plumbbob/settings.json to override)

## Steps

*(Mirror of intent.md's Steps, with live status; CLI-maintained, not hand-edited.
`build`/`checkpoint`/`revert` re-render this from intent.md, and set the Current step
line above. Only ONE step is in flight; a step is done only after a checkpoint:
check green + checkpoint taken, via `/plumbbob:verify` or `/plumbbob:build`.)*

- ☑ 1. chore(repo): scaffold the atis monorepo with checkride init
- ☑ 2. feat(core): define the map.json schema types and assertMap
- ☑ 3. feat(core): identify cells, organelles and shore groups from a file list
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
- ☐ 24. fix(core): send hook folders to the scripts shore group

## Park list

> Mid-step, every new problem / idea / "ooh what if" lands HERE, untouched, and you
> go straight back to the step. Acting the instant an idea arrives is the disease.
> Capture is one line (`/plumbbob:park` composes it). Harvest happens only at the boundary.

- [ ] test and shore patterns: vitest __snapshots__/*.snap and .gitkeep land in other, and a tests/ folder counts as terrain; decide whether the defaults grow once step 14 or 22 shows real repos

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
