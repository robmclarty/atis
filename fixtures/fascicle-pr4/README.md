# fascicle PR 4

The largest fixture, and the only one of the five with a real review. fascicle does not use
checkride — its own harness is `scripts/check.mjs` — so under step 22's procedure this map was
blind (`NOINST`, two notices, pointing only at the tools barrel). Under D58 the current
checkride is installed into the worktree and the map names the exact files the review flagged.

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
`c7407b5` is itself titled *Merge pull request #5*, because PR 5 was merged into PR 4's branch
before PR 4 landed. `c7407b5` is therefore PR 4's head here and PR 5's merge in the next
fixture over.

## The toolchain

The tree is historical; the harness is current (D58), and here it is also *foreign* — fascicle
ships no checkride, so the procedure installs one rather than reading the repo's own
`scripts/check.mjs`, whose `summary.json` carries no `schema_version` and which atis therefore
cannot trust (D41).

| tool | version | how atis knows |
| --- | --- | --- |
| checkride | 0.13.0 | installed into the worktree; fascicle ships none |
| fallow | 3.28.0 | installed into the worktree, not the 2.40.3 the commit pinned |
| checkride summary schema | 1 | `checks_run` present, so `readCheck` trusts the folder |
| node | 22 | the engine the package declares |

## The commands

```sh
# 1. A worktree at the head of the PR, named for the repo so meta.repo reads `fascicle`.
git -C ~/Projects/fascicle/code/fascicle worktree add /tmp/atis-fixtures/fascicle c7407b5 --detach
cd /tmp/atis-fixtures/fascicle
pnpm install

# 2. Approve esbuild's build script first. checkride shells out to `pnpm install`, and
#    pnpm 11 exits 1 while any build script is unapproved, which aborts the whole run:
#    set `esbuild: true` under allowBuilds in pnpm-workspace.yaml.
#    -w is required: fascicle is a workspace root, and a bare `pnpm add` refuses.
pnpm add -D -w checkride@0.13.0 fallow@3.28.0 --config.minimumReleaseAge=0
pnpm exec checkride --all --skip security,mutation

# 3. The map and the still render, --repo resolved past the /tmp symlink.
cd ~/Projects/atis/code/atis
node apps/atis/dist/cli.js \
  --repo "$(cd /tmp/atis-fixtures/fascicle && pwd -P)" \
  --base 46df40e \
  --out fixtures/fascicle-pr4/map.json \
  --svg fixtures/fascicle-pr4/atis.svg

# 4. The worktree is not kept.
git -C ~/Projects/fascicle/code/fascicle worktree remove --force /tmp/atis-fixtures/fascicle
```

## Skipped slots

Named per D56. 15 slots ran.

- `security` — skipped per D56.
- `mutation` — skipped: stryker ran past fifteen minutes on this workspace without writing a
  `summary.json`, so D56's "where the run completes" clause drops it.
- `publint` — checkride finds no tool for the slot here.
- `format`, `prose` — checkride 0.13.0 skips these itself.

## What it says

`IFR, 18 files changed, 6 notices`.

| | |
| --- | --- |
| category | IFR |
| terrain | 117 cells, 165 organelles, 7 bands, 10 shore groups (the whole workspace, D43) |
| weather | 18 changed, 8 files reached, 0 ghosts, 0 new dependencies |
| notices | 6 — all `red-check-slot` |
| primary | `red-check-slot` on `examples/pr-improve/src/tools/run_shell.ts` (`dead` is red and names it) |
| red slots | `attw`, `dead`, `dupes`, `health`, `lint`, `snippets` |

The primary notice names `run_shell.ts` — the single file carrying three of the review's seven
findings (see `truth.md`). The rest of the budget names `read_file.ts`, `edit_file.ts` and
`list_dir.ts`, which is where the remaining findings live. That is a real gain over the
step-22 map, which could only point at the tools barrel.

It comes with a caveat worth carrying into step 23: **every** notice here is a
`red-check-slot`, and the `interface-change` notice that used to be primary is pushed out of
the six-slot budget entirely. The map is reporting the repository's standing state, which on
this fixture happens to coincide with the changed files. PR 5 next door renders almost
identically despite changing 3 files rather than 18. That crowding is parked.

## Ground truth

See [`truth.md`](./truth.md) — the richest of the five, because PR 4 carries a real review.
