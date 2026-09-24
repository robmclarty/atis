# fascicle PR 5

A three-file fix on the same tools PR 4 added, and the smallest change of the five. Under step
22's procedure this map was blind (`NOINST`) and its only notice was the shore residual. Under
D58 it carries real evidence — and renders almost identically to PR 4, which is the most
interesting thing about it.

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

Local SHAs, per D44 — fascicle's history was rewritten. The merge `c7407b5` is the same commit
that serves as PR 4's head in the fixture next door: PR 5 was merged into PR 4's branch before
PR 4 landed. PR 5 is the improvement pass that applied the review spec to three of the tool
files PR 4 had just added.

## The toolchain

The tree is historical; the harness is current and foreign (D58) — fascicle ships no
checkride, so the procedure installs one. Its own `scripts/check.mjs` writes a `summary.json`
with no `schema_version`, which atis will not trust (D41).

| tool | version | how atis knows |
| --- | --- | --- |
| checkride | 0.13.0 | installed into the worktree; fascicle ships none |
| fallow | 3.28.0 | installed into the worktree, not the 2.40.3 the commit pinned |
| checkride summary schema | 1 | `checks_run` present, so `readCheck` trusts the folder |
| node | 22 | the engine the package declares |

## The commands

```sh
# 1. A worktree at the head of the PR, named for the repo so meta.repo reads `fascicle`.
git -C ~/Projects/fascicle/code/fascicle worktree add /tmp/atis-fixtures/fascicle 13ef514 --detach
cd /tmp/atis-fixtures/fascicle
pnpm install

# 2. Approve esbuild's build script first (set `esbuild: true` under allowBuilds in
#    pnpm-workspace.yaml): checkride shells out to `pnpm install`, and pnpm 11 exits 1
#    while a build script is unapproved. -w is required at a workspace root.
pnpm add -D -w checkride@0.13.0 fallow@3.28.0 --config.minimumReleaseAge=0
pnpm exec checkride --all --skip security,mutation

# 3. The map and the still render, --repo resolved past the /tmp symlink.
cd ~/Projects/atis/code/atis
node apps/atis/dist/cli.js \
  --repo "$(cd /tmp/atis-fixtures/fascicle && pwd -P)" \
  --base b991c58 \
  --out fixtures/fascicle-pr5/map.json \
  --svg fixtures/fascicle-pr5/atis.svg

# 4. The worktree is not kept.
git -C ~/Projects/fascicle/code/fascicle worktree remove --force /tmp/atis-fixtures/fascicle
```

## Skipped slots

Named per D56. 15 slots ran. Same set as PR 4: `security` (D56), `mutation` (runs past fifteen
minutes without a `summary.json`), `publint` (no tool detected), `format` and `prose`
(checkride skips them itself).

## What it says

`IFR, 3 files changed, 6 notices`.

| | |
| --- | --- |
| category | IFR |
| terrain | 117 cells, 165 organelles, 7 bands, 10 shore groups |
| weather | 3 changed, 4 files reached, 0 ghosts, 0 new dependencies |
| notices | 6 — all `red-check-slot` |
| primary | `red-check-slot` on `examples/pr-improve/src/tools/run_shell.ts` (`dead` is red and names it) |
| red slots | `attw`, `dead`, `dupes`, `health`, `lint`, `snippets` |

This fixture is the clearest evidence for the parked notice-crowding problem. PR 5 changes
three files; PR 4 changes eighteen; the two maps carry the same category and nearly the same
six notices, because all twelve are `red-check-slot` findings about the repository's standing
state rather than about either change. One of PR 5's six notices — `attw` red for the whole
repository — has nothing to do with the three changed files at all.

For the glance test that makes PR 5 a useful adversarial case: the ground truth is near-calm,
but the map presents an IFR grade and six red rows. If a reader holds here, the reason will
say whether they were reading the change or the repository.

## Ground truth

See [`truth.md`](./truth.md).
