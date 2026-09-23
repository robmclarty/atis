# checkride PR 2

The oldest fixture, and the one atis cannot read the evidence for. checkride was `v0.1.1`
when PR 2 merged, and its `.check/summary.json` from that era omits a field the schema-1
contract now requires, so atis falls back to a git-only map. It is here on purpose: the
glance test needs a change atis can only see through git.

## The change

| | |
| --- | --- |
| repo | `checkride` — `~/Projects/checkride/code/checkride` (`robmclarty/checkride`) |
| pull request | [#2](https://github.com/robmclarty/checkride/pull/2) `fix/cli-bin-symlink-entrypoint` |
| base | `bffc4d96bf7fd385b25476735ed28024483c35b1` (PR 1, `ci: bump actions to node24 runtime`) |
| head | `937bb1d7f316aeb9ab347bcb9b2317af4eae86ab` `fix: run CLI when invoked through the bin symlink (#2)` |
| merge | `937bb1d7f316aeb9ab347bcb9b2317af4eae86ab` — PR 2 was squash-merged, so the head commit is the merge commit |
| merge base | `bffc4d96bf7fd385b25476735ed28024483c35b1` |
| size | 2 files, +76 −4 (`src/cli.ts`, `test/e2e/bin-entrypoint.e2e.test.ts`) |

## The toolchain at that commit

| tool | version | how atis knows |
| --- | --- | --- |
| checkride | 0.1.1 | `package.json` `version` at `937bb1d` |
| fallow | 2.48.0 | `devDependencies.fallow` at `937bb1d` |
| node | 24 | the engine the package declares (`>=24.0.0`) |
| checkride summary schema | 1 (declared) | `.check/summary.json` says `schema_version: 1` but omits `checks_run` |

## The commands

```sh
# 1. A worktree at the head of the PR, named for the repo.
git -C ~/Projects/checkride/code/checkride worktree add /tmp/atis-fixtures/checkride 937bb1d --detach

# 2. checkride v0.1.1 builds and runs itself. --all --skip is honoured, but this version has
#    no security or mutation slot, so nothing is skipped; nine slots run green.
cd /tmp/atis-fixtures/checkride
pnpm install
pnpm check --all --skip security,mutation

# 3. The map and the still render, --repo resolved past the /tmp symlink.
cd ~/Projects/atis/code/atis
node apps/atis/dist/cli.js \
  --repo "$(cd /tmp/atis-fixtures/checkride && pwd -P)" \
  --base bffc4d9 \
  --out fixtures/checkride-pr2/map.json \
  --svg fixtures/checkride-pr2/atis.svg

# 4. The worktree is not kept.
git -C ~/Projects/checkride/code/checkride worktree remove --force /tmp/atis-fixtures/checkride
```

## Skipped slots

There is nothing to skip. checkride 0.1.1 has no `security` and no `mutation` slot, so
`--skip security,mutation` is a no-op; the nine slots it does run (`types`, `lint`,
`struct`, `dead`, `test`, `docs`, `links`, `spell`, `typecheck-tests`) all pass. atis reads
none of them, for the reason below.

## Why it is git-only

The check runs green and writes `.check/summary.json`, but that file declares
`schema_version: 1` while omitting `checks_run`, a number atis's schema-1 parser requires.
So atis reads the summary as `harness_broken` and refuses to trust anything under `.check/`
(D41): a harness it cannot parse is not a harness it will quote. The map falls to
`instruments: git-only`.

This is a real, and useful, state: a reader looking at this map sees `LIFR` — the worst
category — sourced entirely from the unreadable harness, not from anything about the two-file
change. That confound is exactly what step 23 should watch for, and step 22 parked it for
`/plumbbob:refine`: should atis tolerate the older schema-1 shape, or is this the intended
"old repo" fixture?

## What it says

`LIFR, 2 files changed, 0 notices`, git-only.

| | |
| --- | --- |
| category | LIFR — `harness_broken`; no instruments atis will trust |
| terrain | 8 cells, 8 organelles, 5 bands, 9 shore groups |
| weather | 2 changed, 1 file reached, no evidence, no ghosts |
| notices | 0 — nothing cleared the budget without evidence or reach |

## Ground truth

See [`truth.md`](./truth.md).
