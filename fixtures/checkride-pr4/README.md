# checkride PR 4

The spike fixture, regenerated for the glance test. This is the change step 14 first
pointed atis at; step 22 rebuilds it under the D56 procedure (the `security` slot skipped)
so it carries the PR's weather rather than the calendar's, and adds the still render.

## The change

| | |
| --- | --- |
| repo | `checkride` — `~/Projects/checkride/code/checkride` (`robmclarty/checkride`) |
| pull request | [#4](https://github.com/robmclarty/checkride/pull/4) `fix/resolve-slot-tools-locally` |
| base | `fee5ed6b65e25a0c8c4e6dd2a6163068f9ffb039` (`v0.9.4`) |
| head | `ae5078cc8b570a3ba5247ff7d6723966797ef0a2` `fix(pm): resolve a slot's tool locally instead of trusting the launcher cache` |
| merge | `07d95bbb51a361fde3d9d3fa2a6d248826ddb033` |
| merge base | `fee5ed6b65e25a0c8c4e6dd2a6163068f9ffb039` — the base is an ancestor of the head, so `merge-base` is the base itself |
| size | 11 files, +473 −21 |

PR 4 changes a barrel (`src/pm/index.ts`), adds a module file (`src/pm/tools.ts`), touches
two consumers (`src/doctor.ts`, `src/orchestrator.ts`) and carries tests, so reach,
evidence and the interface-change notice are all exercised by one change.

## The toolchain at that commit

Read from the worktree's own `package.json` and lockfile, never from this machine's global
installs (D22). Fallow files are read by key and their `schema_version` is recorded in
`meta.instruments`, never gated on (D41).

| tool | version | how atis knows |
| --- | --- | --- |
| checkride | 0.9.4 | the repository is checkride; `package.json` `version` at `ae5078c` |
| fallow | 3.9.1 | `devDependencies.fallow` at `ae5078c` |
| fallow `health` / `dead` / `dupes` schema | 7 | `meta.instruments.fallow_schemas` |
| checkride summary schema | 1 | required by `readCheck` before anything under `.check/` is read |
| node | 22 | the engine both packages declare |

## The commands

```sh
# 1. A worktree at the head of the PR, named for the repo so meta.repo reads `checkride`.
git -C ~/Projects/checkride/code/checkride worktree add /tmp/atis-fixtures/checkride ae5078c --detach

# 2. Its own pinned toolchain, and the .check/ atis reads for evidence. The security and
#    mutation slots are skipped (see "Skipped slots" below); every other slot runs.
cd /tmp/atis-fixtures/checkride
pnpm install
pnpm check --all --skip security,mutation

# 3. The map and the still render. --repo takes the resolved path, not the /tmp symlink:
#    on macOS /tmp is /private/tmp, and istanbul's absolute coverage keys will not
#    relativise against the unresolved one, which silently empties patch_coverage.
cd ~/Projects/atis/code/atis
node apps/atis/dist/cli.js \
  --repo "$(cd /tmp/atis-fixtures/checkride && pwd -P)" \
  --base fee5ed6 \
  --out fixtures/checkride-pr4/map.json \
  --svg fixtures/checkride-pr4/atis.svg

# 4. The worktree is not kept.
git -C ~/Projects/checkride/code/checkride worktree remove --force /tmp/atis-fixtures/checkride
```

## Skipped slots

Named per D56. Everything else in checkride 0.9.4's `--all` set ran green.

- `security` — skipped on purpose (D56). `pnpm audit` runs against today's advisory
  database, not the one that existed when PR 4 merged, so it earns a red slot and an IFR
  category the PR did not cause (15 advisories on this lockfile). At step 14 this slot was
  red and made the map IFR; skipping it is what makes the regenerated map read MVFR.
- `mutation` — skipped because it does not complete in a bounded run: stryker on
  checkride's suite ran past ten minutes without finishing, so per D56 ("mutation included
  where the run completes") it is dropped and named here rather than left to hang.
- `format` — checkride 0.9.4 skips this slot itself under `--all`; atis records it skipped.

## What it says

`MVFR, 11 files changed, 6 notices`. The terrain now carries `layout` (step 15), so this is
terrain, weather, notices and positions.

| | |
| --- | --- |
| category | MVFR — the changed lines are covered, the reach is bounded, no slot is red |
| terrain | 43 cells, 91 organelles, 7 bands, 12 shore groups |
| weather | 11 changed, 33 files reached, 3 co-change ghosts, 0 new dependencies |
| notices | 6 — 1 primary, 2 secondary, 3 tertiary, the full budget of C7 |
| primary | `interface-change` on `src/pm/index.ts` (8 readers, band 4) |
| improvements | empty, and the HUD's Health Δ block is muted: `.check/` is read at head only (D23) |

The sixth notice is the loud `other` residual (D48): one `.json` file
(`.claude-plugin/plugin.json`) that no shore rule claims. It is surfaced, not dumped.

## Ground truth

See [`truth.md`](./truth.md) for the follow-up commits that reworked PR 4's files, drafted
from history and awaiting Rob's confirmation before step 23.
