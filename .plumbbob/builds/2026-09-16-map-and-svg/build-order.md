# Build order

Step numbers are identities, not order. The undone steps run in this sequence
(re-settled at the 2026-09-22 harvest, after step 22 at 78cf406):

| Order | Step | Title                                                            | How to start it            |
| ----- | ---- | ---------------------------------------------------------------- | -------------------------- |
| 1     | 27   | fix(svg): point a global-slot notice's leader at its storm marker | `/plumbbob:build 27`      |
| 2     | 28   | fix(core): send plugin, MCP and bench JSON to their shore groups | `/plumbbob:build 28`       |
| 3     | 29   | fix(cli): name --svg and --open in the usage text                | `/plumbbob:build 29`       |
| 4     | 30   | chore(fixtures): refresh the five maps after the render and shore fixes | `/plumbbob:build 30` |
| 5     | 23   | chore(glance): run glance-test round one and record the verdicts | `/plumbbob:build`          |

Steps 19 to 22, 24, 25 and 26 are done and never come up again.

## Why the numbers jump

Plain `/plumbbob:build` picks the lowest undone step number, which is 23. But
steps 27, 28 and 29 all change what a map or an SVG says, and step 30
regenerates the five fixtures the glance test reads, so 23 must run last. Run
`/plumbbob:build 27`, `28`, `29`, `30`, and only then let it fall through to 23.

## Why the fixtures are built twice

Step 22 generated the five fixtures with the toolchain each commit pinned, on a
misreading of [D22 (local-fallow)](intent.md#d22), which is pinned-versus-global
and says nothing about historical-versus-current. checkride v0.1.1's
`summary.json` omits `checks_run`, so PR 2 came out `harness_broken`: LIFR,
git-only, zero notices. [D58 (fixtures-current-toolchain)](intent.md#d58)
settles it — the tree is historical, the harness is current — and under it the
same PR 2 reads IFR with six notices led by `survived-mutants` on `src/cli.ts`,
a real finding about the PR's own changed lines. Step 22 stays checkpointed as
history, and the regeneration itself landed at that boundary in `262ed7e`,
outside plumbbob's ledger by Rob's call; step 30 is only what steps 27 and 28
still owe those files.

## Notes that ride with a step

- **Step 28**: smaller than it looked when it was harvested. After the D58
  regeneration the `other` residual no longer surfaces as a notice on any of
  the five — `red-check-slot` findings fill the six-slot budget ahead of it —
  so the rules still want adding (the residual is still in `terrain.groups`)
  but they will not change what a glance-test reader sees.
- **Step 30**: the D58 regeneration already happened at the step-22 boundary
  (`262ed7e`), so this step only re-runs the procedure to pick up what steps 27
  and 28 change, and reconciles the numbers. Each fixture's `README.md` carries
  its own commands; the traps they encode are `pnpm exec checkride` rather than
  the repo's own `check` script (checkride's repo dogfoods itself), `-w` and an
  approved `esbuild` build script on fascicle (checkride shells out to `pnpm
  install`, which exits 1 while any build script is unapproved), a worktree
  named after the repo since `meta.repo` is `basename(--repo)`, and `--repo`
  passed through `pwd -P` since a `/tmp` symlink silently empties patch
  coverage. Mutation is judged per fixture: kept on checkride PR 2, skipped and
  named elsewhere.
- **Step 23**: every `truth.md` line marked `needs Rob` wants his confirmation
  before round one runs.
