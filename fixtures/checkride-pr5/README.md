# checkride PR 5

The doctor fix that landed the day after PR 4, on the same toolchain. Its changed lines are
uncovered where they reach, so the map reads IFR while PR 4 reads MVFR: the two fixtures
differ on evidence, not on shape.

## The change

| | |
| --- | --- |
| repo | `checkride` — `~/Projects/checkride/code/checkride` (`robmclarty/checkride`) |
| pull request | [#5](https://github.com/robmclarty/checkride/pull/5) `fix/doctor-yarn-pnp` |
| base | `ae5078cc8b570a3ba5247ff7d6723966797ef0a2` (PR 4's head) |
| head | `9511268f300bef8f49cbbb633ac04f90f634eb88` `fix(doctor): stop reporting a healthy Yarn PnP project as broken` |
| merge | `0ae85a6831f87f2926ec1db8482348f5ffb994e6` |
| merge base | `ae5078cc8b570a3ba5247ff7d6723966797ef0a2` — the base is an ancestor of the head |
| size | 7 files, +229 −21 |

PR 5 reworks `src/doctor.ts` and `src/pm/tools.ts`, touches the barrel `src/pm/index.ts`,
and carries tests. It sits on top of PR 4, so the terrain is the same tree one commit later.

## The toolchain

The tree is historical; the harness is current (D58).

| tool | version | how atis knows |
| --- | --- | --- |
| checkride | 0.13.0 | installed into the worktree, not the 0.9.4 `9511268` pinned |
| fallow | 3.28.0 | installed into the worktree, not the 3.9.1 `9511268` pinned |
| checkride summary schema | 1 | required by `readCheck` before anything under `.check/` is read |
| node | 22 | the engine the package declares |

## The commands

```sh
# 1. A worktree at the head of the PR, named for the repo so meta.repo reads `checkride`.
git -C ~/Projects/checkride/code/checkride worktree add /tmp/atis-fixtures/checkride 9511268 --detach

# 2. The current harness (D58). Run the installed binary, never `pnpm check`: checkride's
#    repo dogfoods itself, so its own check script runs that commit's built CLI.
cd /tmp/atis-fixtures/checkride
pnpm install
pnpm add -D checkride@0.13.0 fallow@3.28.0 --config.minimumReleaseAge=0
pnpm exec checkride --all --skip security,mutation

# 3. The map and the still render, --repo resolved past the /tmp symlink.
cd ~/Projects/atis/code/atis
node apps/atis/dist/cli.js \
  --repo "$(cd /tmp/atis-fixtures/checkride && pwd -P)" \
  --base ae5078c \
  --out fixtures/checkride-pr5/map.json \
  --svg fixtures/checkride-pr5/atis.svg

# 4. The worktree is not kept.
git -C ~/Projects/checkride/code/checkride worktree remove --force /tmp/atis-fixtures/checkride
```

## Skipped slots

Named per D56. All 17 slots that ran came back green; nothing is red on this fixture.

- `security` — skipped per D56 (the calendar's advisory database, not the PR's weather).
- `mutation` — skipped: stryker ran past fifteen minutes on this suite without writing a
  `summary.json`. It completes on checkride PR 2's smaller tree, so D56's clause is judged
  per fixture.
- `format`, `prose` — checkride 0.13.0 skips these itself; atis records them skipped.

## What it says

`IFR, 7 files changed, 6 notices`.

| | |
| --- | --- |
| category | IFR — the change has uncovered lines that reach across cells |
| terrain | 43 cells, 91 organelles, 7 bands, 11 shore groups |
| weather | 7 changed, 33 files reached, 4 co-change ghosts, 0 new dependencies |
| notices | 6 — 1 primary, 2 secondary, 3 tertiary |
| primary | `interface-change` on `src/pm/index.ts` (8 readers, band 4) |
| secondary | `uncovered-high-reach` on `src/doctor.ts` — 6 changed lines uncovered, reaching 3 cells |

The `uncovered-high-reach` notice is what earns the IFR category: `src/doctor.ts` is the
file the change is really about, and its new lines are not covered where they reach.

The shore is 11 groups rather than the 12 of the step-22 map: step 28 gave
`.claude-plugin/**` to the `prompts` row, which emptied the loud `other` residual (D48). It
cost this fixture no notice — `other` never ranked into the budget here, because the sixth
slot was already held by a co-change ghost weighing more than the residual's flat 2 — so the
six notices, the category and every terrain and weather count are byte-identical to step 22,
and no organelle moved. Only the shore repacked.

## Ground truth

See [`truth.md`](./truth.md).
