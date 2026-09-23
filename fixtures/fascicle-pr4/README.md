# fascicle PR 4

The largest fixture, and the only one of the five with a real review. fascicle is not a
checkride repo, so atis reads it git-only; but it is a pnpm workspace, and PR 4 lives inside
one member (`examples/pr-improve`), which is what exercises D43's workspace-member scan.

## The change

| | |
| --- | --- |
| repo | `fascicle` — `~/Projects/fascicle/code/fascicle` (`robmclarty/fascicle`) |
| pull request | [#4](https://github.com/robmclarty/fascicle/pull/4) `feat/pr-improve-tools` |
| base | `46df40e6a346ac5518f6243c5b1a704379a1b154` (`v0.4.1`) |
| head | `c7407b500c850f60e15704619d37a2450f72de01` (the branch tip) |
| merge | `a3ef265e97dd28639faaf6a5a30ab98b64f4f8d8` |
| merge base | `46df40e6a346ac5518f6243c5b1a704379a1b154` |
| size | 18 files, +1257 −8 |

fascicle's GitHub history was rewritten, so the merge SHAs on GitHub are not in the local
clone; the SHAs above are local (D44). One knot follows from that rewrite: PR 4's branch tip
`c7407b5` is itself titled *Merge pull request #5*, because PR 5 was merged into PR 4's
branch before PR 4 landed. `c7407b5` is therefore PR 4's head here and PR 5's merge in the
next fixture over. The base–head diff is the same 18 files whether the head is read as
`c7407b5` or the merge `a3ef265`.

## The toolchain at that commit

| tool | version | how atis knows |
| --- | --- | --- |
| fascicle | 0.4.1 | `package.json` `version` at `c7407b5` |
| fallow | 2.40.3 | `devDependencies.fallow` at `c7407b5` |
| harness | `scripts/check.mjs` (not checkride) | `package.json` `scripts.check` |
| node | 22 | the engine the package declares |

## The commands

```sh
# 1. A worktree at the head of the PR, named for the repo so meta.repo reads `fascicle`.
git -C ~/Projects/fascicle/code/fascicle worktree add /tmp/atis-fixtures/fascicle c7407b5 --detach

# 2. No check is run for this fixture: see "Why it is git-only" below. atis reads the git
#    trees at base and head directly and needs no install to draw the terrain.
cd ~/Projects/atis/code/atis
node apps/atis/dist/cli.js \
  --repo "$(cd /tmp/atis-fixtures/fascicle && pwd -P)" \
  --base 46df40e \
  --out fixtures/fascicle-pr4/map.json \
  --svg fixtures/fascicle-pr4/atis.svg

# 3. The worktree is not kept.
git -C ~/Projects/fascicle/code/fascicle worktree remove --force /tmp/atis-fixtures/fascicle
```

## Why it is git-only

fascicle's harness is its own `scripts/check.mjs`, not checkride. It writes a
`.check/summary.json`, but that summary carries no `schema_version`, so atis's schema-1
parser rejects it before reading any slot (D41): with no `schema_version: 1`, the folder is
not a harness atis will quote. The result is `instruments: git-only` whether the check is run
or not, so step 22 does not run it. The security-equivalent slot (`pnpm audit`) and mutation
would both be skipped under D56 regardless.

## What it says

`NOINST, 18 files changed, 2 notices`, git-only.

| | |
| --- | --- |
| category | NOINST — no instruments; the map is terrain, git weather and positions |
| terrain | 117 cells, 165 organelles, 7 bands, 10 shore groups (the whole workspace, D43) |
| weather | 18 changed, 8 files reached, 0 ghosts, 0 new dependencies |
| notices | 2 — 1 primary, 1 secondary |
| primary | `interface-change` on `examples/pr-improve/src/tools/index.ts` — the tools barrel |
| secondary | the loud `other` residual (D48): 6 `.json` files no shore rule claims |

The primary notice points at `examples/pr-improve/src/tools/` — the directory the review's
findings cluster in (see `truth.md`). The map has no evidence to add, so it says where to
look, not what is wrong.

## Ground truth

See [`truth.md`](./truth.md) — the richest of the five, because PR 4 carries a real review.
