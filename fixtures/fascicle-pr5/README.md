# fascicle PR 5

A three-file fix on the same tools PR 4 added, and the smallest change of the five. It is
git-only like PR 4, and quiet: the map has almost nothing to flag, which is itself the point
of including it.

## The change

| | |
| --- | --- |
| repo | `fascicle` — `~/Projects/fascicle/code/fascicle` (`robmclarty/fascicle`) |
| pull request | [#5](https://github.com/robmclarty/fascicle/pull/5) `fascicle/improve-4` |
| base | `b991c585b4fd47029627c02e54211d87e678a6dd` |
| head | `13ef514381c6e2712bf115f5f6e6047c70756df7` `fascicle: apply improvement spec for PR #4` |
| merge | `c7407b500c850f60e15704619d37a2450f72de01` |
| merge base | `b991c585b4fd47029627c02e54211d87e678a6dd` |
| size | 3 files, +50 −23 (`edit_file.ts`, `read_file.ts`, `run_shell.ts`) |

Local SHAs, per D44 — fascicle's history was rewritten. The merge `c7407b5` is the same
commit that serves as PR 4's head in the fixture next door: PR 5 was merged into PR 4's
branch before PR 4 landed, so the two share that SHA. PR 5 is the improvement pass that
applied the review spec to three of the tool files PR 4 had just added.

## The toolchain at that commit

| tool | version | how atis knows |
| --- | --- | --- |
| fascicle | 0.4.1 | `package.json` `version` at `13ef514` |
| fallow | 2.40.3 | `devDependencies.fallow` at `13ef514` |
| harness | `scripts/check.mjs` (not checkride) | `package.json` `scripts.check` |
| node | 22 | the engine the package declares |

## The commands

```sh
# 1. A worktree at the head of the PR, named for the repo so meta.repo reads `fascicle`.
git -C ~/Projects/fascicle/code/fascicle worktree add /tmp/atis-fixtures/fascicle 13ef514 --detach

# 2. No check is run: git-only for the same reason as PR 4 (see that README). atis reads the
#    git trees at base and head directly.
cd ~/Projects/atis/code/atis
node apps/atis/dist/cli.js \
  --repo "$(cd /tmp/atis-fixtures/fascicle && pwd -P)" \
  --base b991c58 \
  --out fixtures/fascicle-pr5/map.json \
  --svg fixtures/fascicle-pr5/atis.svg

# 3. The worktree is not kept.
git -C ~/Projects/fascicle/code/fascicle worktree remove --force /tmp/atis-fixtures/fascicle
```

## Why it is git-only

Same as PR 4: fascicle's `scripts/check.mjs` writes a `summary.json` with no
`schema_version`, so atis reads it git-only (D41). The security-equivalent slot and mutation
would be skipped under D56 regardless.

## What it says

`NOINST, 3 files changed, 1 notice`, git-only.

| | |
| --- | --- |
| category | NOINST — no instruments |
| terrain | 117 cells, 165 organelles, 7 bands, 10 shore groups |
| weather | 3 changed, 4 files reached, 0 ghosts, 0 new dependencies |
| notices | 1 — the loud `other` residual (D48): 6 `.json` files no shore rule claims |

Note the one notice is the `other` residual, not a finding about the three changed tool
files: with no evidence and a small localized fix, the most notable thing the map can rank is
the repo's unclaimed `.json`. That the residual can rank *primary* on a small change is
parked for `/plumbbob:refine`, and matters for how step 23 reads this map.

## Ground truth

See [`truth.md`](./truth.md).
