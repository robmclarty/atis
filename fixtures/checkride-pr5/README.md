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

## The toolchain at that commit

| tool | version | how atis knows |
| --- | --- | --- |
| checkride | 0.9.4 | `package.json` `version` at `9511268` |
| fallow | 3.9.1 | `devDependencies.fallow` at `9511268` |
| fallow `health` / `dead` / `dupes` schema | 7 | `meta.instruments.fallow_schemas` |
| checkride summary schema | 1 | required by `readCheck` before anything under `.check/` is read |
| node | 22 | the engine the package declares |

## The commands

```sh
# 1. A worktree at the head of the PR, named for the repo so meta.repo reads `checkride`.
git -C ~/Projects/checkride/code/checkride worktree add /tmp/atis-fixtures/checkride 9511268 --detach

# 2. Its own pinned toolchain and the .check/ atis reads. Security and mutation skipped.
cd /tmp/atis-fixtures/checkride
pnpm install
pnpm check --all --skip security,mutation

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

Named per D56. Everything else in checkride 0.9.4's `--all` set ran green.

- `security` — skipped per D56 (the calendar's advisory database, not the PR's weather).
- `mutation` — skipped: does not complete in a bounded run on this suite (see PR 4).
- `format` — checkride 0.9.4 skips this slot itself under `--all`.

## What it says

`IFR, 7 files changed, 6 notices`.

| | |
| --- | --- |
| category | IFR — the change has uncovered lines that reach across cells |
| terrain | 43 cells, 91 organelles, 7 bands, 12 shore groups |
| weather | 7 changed, 33 files reached, 4 co-change ghosts, 0 new dependencies |
| notices | 6 — 1 primary, 2 secondary, 3 tertiary |
| primary | `interface-change` on `src/pm/index.ts` (8 readers, band 4) |
| secondary | `uncovered-high-reach` on `src/doctor.ts` — 6 changed lines uncovered, reaching 3 cells |

The `uncovered-high-reach` notice is what earns the IFR category: `src/doctor.ts` is the
file the change is really about, and its new lines are not covered where they reach.

## Ground truth

See [`truth.md`](./truth.md).
