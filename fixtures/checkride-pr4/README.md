# checkride PR 4

The spike fixture, regenerated for the glance test. This is the change step 14 first pointed
atis at; it is now rebuilt under D58 (historical tree, current harness) with the `security`
slot skipped per D56, so it carries the PR's weather rather than the calendar's.

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

## The toolchain

The tree is historical; the harness is current (D58). checkride and fallow are installed
into the worktree at their latest versions rather than the ones `ae5078c` pinned, because
atis only ever ships against current checkride. Fallow files are read by key and their
`schema_version` is recorded in `meta.instruments`, never gated on (D41).

| tool | version | how atis knows |
| --- | --- | --- |
| checkride | 0.13.0 | installed into the worktree by the D58 procedure, not the 0.9.4 the commit pinned |
| fallow | 3.28.0 | installed into the worktree, not the 3.9.1 the commit pinned |
| checkride summary schema | 1 | required by `readCheck` before anything under `.check/` is read |
| node | 22 | the engine the package declares |

## The commands

```sh
# 1. A worktree at the head of the PR, named for the repo so meta.repo reads `checkride`.
git -C ~/Projects/checkride/code/checkride worktree add /tmp/atis-fixtures/checkride ae5078c --detach

# 2. The current harness, and the .check/ atis reads for evidence (D58). Run the installed
#    binary, never `pnpm check`: checkride's repo dogfoods itself, so its own check script
#    runs that commit's built CLI instead of the checkride we just installed.
cd /tmp/atis-fixtures/checkride
pnpm install
pnpm add -D checkride@0.13.0 fallow@3.28.0 --config.minimumReleaseAge=0
pnpm exec checkride --all --skip security,mutation

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

Named per D56. All 17 slots that ran came back green; nothing is red on this fixture.

- `security` — skipped on purpose (D56). `pnpm audit` runs against today's advisory
  database, not the one that existed when PR 4 merged, so it earns a red slot and an IFR
  category the PR did not cause (15 advisories on this lockfile). Skipping it is what makes
  this map read MVFR.
- `mutation` — skipped: stryker on this suite ran past fifteen minutes without writing a
  `summary.json`, so per D56 ("mutation included where the run completes") it is dropped and
  named here. It *does* complete on checkride PR 2's much smaller tree, which is why that
  fixture keeps it; the clause is judged per fixture, not once for all five.
- `format`, `prose` — checkride 0.13.0 skips these itself (`prose` finds no tool for the
  slot); atis records them skipped.

## What it says

`MVFR, 11 files changed, 5 notices`. The terrain now carries `layout` (step 15), so this is
terrain, weather, notices and positions.

| | |
| --- | --- |
| category | MVFR — the changed lines are covered, the reach is bounded, no slot is red |
| terrain | 43 cells, 91 organelles, 7 bands, 11 shore groups |
| weather | 11 changed, 33 files reached, 3 co-change ghosts, 0 new dependencies |
| notices | 5 — 1 primary, 2 secondary, 2 tertiary; one under the C7 budget, and C7 does not pad |
| primary | `interface-change` on `src/pm/index.ts` (8 readers, band 4) |
| improvements | empty, and the HUD's Health Δ block is muted: `.check/` is read at head only (D23) |

The sixth notice used to be the loud `other` residual (D48): one `.json` file,
`.claude-plugin/plugin.json`, that no shore rule claimed. Step 28 gave `.claude-plugin/**` to
the `prompts` row, so `other` is empty here, the shore is 11 groups rather than 12, and the
tertiary row that named the residual is gone with nothing ranked behind it to take the slot
([C7 (budget)](../../.plumbbob/builds/2026-09-16-map-and-svg/intent.md#c7) never pads). No
other number moved: the terrain, the weather and the four surviving notices are byte-identical
to the step-22 map, and no organelle changed position — only the shore repacked around the
file that left `other`.

## Ground truth

See [`truth.md`](./truth.md) for the follow-up commits that reworked PR 4's files, drafted
from history and awaiting Rob's confirmation before step 23.
