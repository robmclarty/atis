# Build order

Step numbers are identities, not order. The undone steps run in this sequence
(re-settled at the 2026-09-22 harvest, after step 22 at 78cf406):

| Order | Step | Title                                                            | How to start it            |
| ----- | ---- | ---------------------------------------------------------------- | -------------------------- |
| 1     | 27   | fix(svg): point a global-slot notice's leader at its storm marker | `/plumbbob:build 27`      |
| 2     | 28   | fix(core): send plugin, MCP and bench JSON to their shore groups | `/plumbbob:build 28`       |
| 3     | 29   | fix(cli): name --svg and --open in the usage text                | `/plumbbob:build 29`       |
| 4     | 30   | chore(fixtures): regenerate the five fixtures on the current toolchain | `/plumbbob:build 30` |
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
history; step 30 replaces its output.

## Notes that ride with a step

- **Step 28**: this may empty fascicle PR 5's only notice, which is today the
  `other` residual. A map with zero notices is honest, but it changes what a
  reader sees in step 23.
- **Step 30**: run `pnpm exec checkride`, never the repo's own `check` script —
  checkride's repo dogfoods itself, so `pnpm check` there runs that commit's
  built CLI instead of the installed binary. Name the worktree after the repo,
  since `meta.repo` is `basename(--repo)`, and pass `--repo` the path through
  `pwd -P`, since a `/tmp` symlink silently empties patch coverage.
- **Step 23**: every `truth.md` line marked `needs Rob` wants his confirmation
  before round one runs.
