# Go fixture 1

An outside project's pull request in Go, step 86's fixture for the language producers, reviewed
at range 24's stop. It is not part of a blind reading, so this README and the truth name the repo
freely. Its ground truth is in [`truth.md`](./truth.md).

## The change

| | |
| --- | --- |
| repo | `gofiber/fiber` (<https://github.com/gofiber/fiber>) |
| pull request | [#4079](https://github.com/gofiber/fiber/pull/4079) `🔥 feat: expand middleware context helpers` |
| base branch | `main` |
| fixture commit | `7ccc68c4b1710c58aaddeb26388f7641d9377de9` `Merge branch 'main' into update-middleware-helpers-for-context-types`: the commit a human review requested changes on |
| merge base | `c64bda1856e531474fa1cd3356f04886a5dbdf39` `Merge pull request #4081 from gofiber/add-nil-safety-for-decode-helpers` |
| size | 17 files, +278 −39; 6 Go source files by the Go producer's rule, 6 `_test.go` files, 5 docs |

The Go source files are `helpers.go` at the module root, which gains `ValueFromContext`, and one
file in each of five middleware packages: `middleware/basicauth/basicauth.go`,
`middleware/csrf/csrf.go`, `middleware/keyauth/keyauth.go`, `middleware/requestid/requestid.go`
and `middleware/session/middleware.go`. Each package's `_test.go` file changes beside it, with
`helpers_test.go`, and the five middlewares' pages under `docs/middleware/`.

The fixture commit is a merge of `main` into the PR's branch, made by the reviewer eight minutes
before the review. The PR later merged with a merge commit, so the fixture commit is on `main`
today and `git merge-base` against `origin/main` returns the fixture commit itself. The merge base
is instead the `main` commit the fixture commit merged in, its second parent `c64bda1`, which was
`main`'s head when the review was submitted: the next commit on `main`, `cdfa624`, landed two
hours after it. The diff from `c64bda1` to the fixture commit is the PR's diff at the review.

## The ecosystem

| | |
| --- | --- |
| module | `github.com/gofiber/fiber/v3`, one module at the root with no `go.work`; `go.mod`'s `go` line is `1.25.0`, with no `toolchain` line and no `tool` directives |
| packages | 38 directories of Go at the fixture commit: the root package `fiber`, `binder`, `client`, `log`, `extractors`, `addon/retry`, three under `internal/`, and 29 middlewares under `middleware/` |
| Go files | 237 tracked, 93 of them `_test.go`, in a tree of 379 tracked files |
| test runner | `go test`; CI's unit job runs `gotestsum -- ./... -race -count=1 -coverprofile=coverage.txt -covermode=atomic -shuffle=on` on Go `1.25.x`, on Ubuntu, macOS and Windows |
| linters | golangci-lint, its `.golangci.yml` in the v2 format with 60 linters enabled and the `gofmt`, `gofumpt` and `goimports` formatters; CI runs `golangci/golangci-lint-action` v9.2.0 at golangci-lint `v2.5.0`, built with `goinstall` on Go `1.25.x`, and the Makefile's `lint` target names the same version |
| other CI | `spell-check.yml` installs cspell's dictionaries with `npm install --no-save` on a runner with no `package.json` and runs `cspell-action`; markdownlint; govulncheck; a benchmark comparison |

## Generation

Step 86 generated `map.json` and `atis.svg` here on 2026-10-29. The worktree, the pins and the
install ran from this session; the checkride run that wrote the `.check/` the map reads ran from a
terminal outside it, for the reason under "The commands". atis then mapped the worktree from its
build at the step's base commit, `3b2bfdc`.

Step 122 regenerated both on 2026-10-31 by the same commands, after a reboot had cleared `/tmp`:
the clone and the shared checkride 0.19.1 were made again, commands 1 to 4 ran from this session,
and command 5 ran from Rob's terminal again, its tests passing 37 packages in 51 seconds. atis was
built from step 86's commit, `5e63185`, plus step 122's change: core now counts a name as a deleted
export only where the base exported it from that file (D188 (deleted-export-at-base)). Every part
of the map but `notices` and the check run's timestamp is as step 86 drew it. What moved is under
"What atis read".

## The toolchain

The tree is historical; the harness is current (D58). checkride runs from a shared copy outside the
tree, since a `package.json` in a Go repo would make checkride read it as TypeScript. The repo's
own Go and golangci-lint are the versions its CI names, pinned through a `--pins` file outside the
tree.

| tool | version | how atis knows |
| --- | --- | --- |
| checkride | 0.19.1 | the shared copy in `/tmp/atis-languages/harness`; the commit pins none |
| checkride summary schema | 1 | required by `readCheck` before anything under `.check/` is read |
| go | 1.25.14 | `go.mod` asks for 1.25.0 and CI for `1.25.x`, so the latest 1.25 patch, installed through mise and pinned in the pins file; checkride records it as each check's `tool_version` and `toolchain_version`, from the `override` source |
| golangci-lint | 2.5.0 | CI's `version: v2.5.0` and the Makefile's; installed through mise and pinned in the pins file, `pin_source: "override"` |
| node | 24.15.0 | the machine's, for checkride and atis |
| mise | 2026.10.4 | the machine's, which the `override` source runs each pinned tool through |
| atis | `3b2bfdc` | this repo's build, `node apps/atis/dist/cli.js` |

## The commands

```sh
# 0. A full clone, not a blobless one. The PR merged with a merge commit, so the fixture commit
#    is on main and needs no PR ref.
git clone https://github.com/gofiber/fiber.git /tmp/atis-languages/clones/gofiber__fiber

# 1. A worktree at the fixture commit, named for the repo so meta.repo reads `fiber`.
git -C /tmp/atis-languages/clones/gofiber__fiber worktree add \
  /tmp/atis-languages/work/go-1/fiber \
  7ccc68c4b1710c58aaddeb26388f7641d9377de9 --detach

# 2. The tree's own toolchain, at the versions CI names, and the pins file outside the tree that
#    makes checkride run them (the `override` source). It changes which copy runs, never which
#    checks run.
mise install go@1.25.14 golangci-lint@2.5.0
mkdir -p /tmp/atis-languages/tools/go-1
printf '[tools]\ngo = "1.25.14"\ngolangci-lint = "2.5.0"\n' > /tmp/atis-languages/tools/go-1/pins.toml

# 3. golangci-lint type-checks through the `go` it finds on PATH, and `mise exec` strips every
#    other mise install from PATH, so with only the pin it loaded Homebrew's Go 1.26 standard
#    library and panicked ("file requires newer Go version go1.26 (application built with
#    go1.25)"). A directory outside mise's installs, linking Go 1.25.14's two binaries, survives
#    the strip, and Go finds its root from the linked binary.
mkdir -p /tmp/atis-languages/tools/go-1/bin
ln -sf ~/.local/share/mise/installs/go/1.25.14/bin/go /tmp/atis-languages/tools/go-1/bin/go
ln -sf ~/.local/share/mise/installs/go/1.25.14/bin/gofmt /tmp/atis-languages/tools/go-1/bin/gofmt
export PATH=/tmp/atis-languages/tools/go-1/bin:$PATH

# 4. The repo's own install. checkride runs Go with GOPROXY=off and GOTOOLCHAIN=local, so the
#    modules are fetched first.
cd /tmp/atis-languages/work/go-1/fiber
GOTOOLCHAIN=local go mod download

# 5. The .check/ atis reads for evidence, from a clean state, run from a terminal this session did
#    not start. fiber's root and client packages test code that recovers the panic a nil call
#    raises, and in a process this agent session starts, a nil call in Go never becomes a panic:
#    the goroutine spins, and those five tests ran to checkride's 600-second limit. fiber's CI
#    passed every unit job at the fixture commit, macOS included, in about two minutes, and so
#    did this run, in 29 seconds. `go run .` in tools/go-1/segv/ tells the two apart: it prints
#    `recovered: ...` where Go's faults work and `hung: ...` where they do not.
rm -rf .check
node /tmp/atis-languages/harness/node_modules/checkride/dist/cli.js \
  --all --skip security,spell --pins /tmp/atis-languages/tools/go-1/pins.toml
cp .check/summary.json /tmp/atis-languages/work/go-1.summary.json

# 6. The map and the still render, from atis's built CLI. --repo takes the resolved path, not the
#    /tmp symlink: on macOS /tmp is /private/tmp.
cd ~/Projects/atis/code/atis
node apps/atis/dist/cli.js \
  --repo "$(cd /tmp/atis-languages/work/go-1/fiber && pwd -P)" \
  --base c64bda1856e531474fa1cd3356f04886a5dbdf39 \
  --out fixtures/go-1/map.json \
  --svg fixtures/go-1/atis.svg

# 7. The worktree is not kept; the clone is.
git -C /tmp/atis-languages/clones/gofiber__fiber worktree remove --force \
  /tmp/atis-languages/work/go-1/fiber
```

## Harness changes in the worktree

None. No tracked file was edited and no file was added to the tree: no `package.json`, no
`checkride.config.json` and no `mise.toml`. The harness lives outside it.

- The pins file, `tools/go-1/pins.toml`, names Go 1.25.14 and golangci-lint 2.5.0 for checkride's
  `override` source.
- The symlink directory, `tools/go-1/bin/`, puts Go 1.25.14 ahead of Homebrew's Go 1.26.1 on
  `PATH`, for golangci-lint (step 3 above).
- `go mod download` filled Go's shared module cache, outside the tree.
- No test was edited, skipped or deleted, and no timeout was raised. Two earlier runs from this
  session were discarded: the first panicked in golangci-lint before the symlink directory existed,
  and the second hung in the five tests step 5 names.

## Skipped slots

Named per D56. 5 of the 11 slots ran.

- `security`: skipped per D56 (`--skip security`). The go pack's `govulncheck` is opt-in, and the
  tree names it in no `tool` directive, so it would not have run anyway.
- `spell`: skipped (`--skip spell`). checkride detects cspell from the tree's `.cspell.json`, but
  fiber installs cspell's dictionaries only in a CI workflow, through `npm install --no-save` and
  a cspell action, and a `package.json` in the tree would make checkride read the repo as
  TypeScript.
- `struct`, `dead`, `docs`, `prose`: checkride 0.19.1 skips these itself ("no tool detected for
  slot"). The tree has no `sgconfig.yml`, no `deadcode` tool directive, and no markdownlint, rumdl
  or vale config at its root, and per the harness policy none was added.
- `types` (go build), `format` (gofmt, opt-in, on through `--all`), `lint` (golangci-lint) and
  `test` (go test): ran and passed. golangci-lint wrote `lint.json` with no issues, as fiber's own
  lint job passed at the fixture commit. `go test -json` passed 37 packages and skipped one with no
  tests (`internal/tlstest`): 2,718 tests passed, none failed and one was skipped.
- `links`: ran and **stayed red** on the tree's own docs: 38 relative links under `docs/` name
  pages the docs site resolves without their `.md` extension, such as `./api/ctx` in
  `docs/intro.md`. It belongs to the tree.

## What atis read

**Cells.** 40: 39 `directory` cells and one `package` cell, `package:.`, the module as the root
member, which holds no file itself. 38 of the directory cells are fiber's Go packages: the root
package (`directory:.`, 30 files), `binder` (12), `client` (8), `log` (3), `extractors`,
`addon/retry`, `internal/memory`, `internal/storage/memory`, `internal/tlstest`, and the 29
middlewares, from `middleware/adaptor` to `middleware/timeout`. The 39th is
`directory:.github/scripts`, whose one `.sh` file the shell producer reads. There are 145
organelles, 144 `.go` and one `.sh`. The cells are the language's modules: one per Go package. The
six changed source files sit in six cells, `directory:.` and the five middlewares'.

**Shore.** All 93 `_test.go` files are in `tests`, as D113 (go-producer) says. `go.mod` and `go.sum`
are in `deps`. The rest are `docs` (80), `ci` (50, which also takes the test fixtures under
`.github/`), `settings` (4), `config` (1, `.golangci.yml`), `prompts` (1) and `other` (3: `Makefile`,
a `.json` and a `.yml`).

**Entry points.** None. `meta.instruments` reads `"entry_points": "manifests"` with the reason
`"go: go list names the main packages; shell: the executable scripts nothing sources are the
entry points"`, and fiber, a library, has no `main` package. So the map has one depth band and 144 of
its 145 organelles read unreachable, which is P90 (a Go library has no entry points) as an earlier
step parked it.

**Evidence.** `meta.instruments`, verbatim where it matters:

```text
"mode": "check"
"muted": [
  "coverage: go-test writes none",
  "types: atis has no parser for go-build"
]
"structure": { "base": { "reason": "no local fallow at node_modules/.bin/fallow" },
               "head": { "reason": "no local fallow at node_modules/.bin/fallow" } }
```

`weather.checks` reads VFR with 5 checks run: `types`, `format`, `lint` and `test` green, `links`
red and global, and the six skipped slots skipped. `weather.evidence` holds 23 stitches, every one
`passed`: each `_test.go` file the change's reach touches, standing on the package events
`test.jsonl` records, as D176 (other-language-evidence) settles. For example `app_integration_test.go`
stitches all five changed middleware files. There is no coverage channel and no file reads as a
gap: the instruments say go-test writes none. go-build's `types` is unread and named. golangci-lint's
findings would be read through checkride's parser, and there were none.

**Notices.** Four, in rank order:

1. `interface-added` on `helpers.go` (primary): `ValueFromContext` added, and 69 files read the
   root package.
2. `missing-cochange` on `middleware/basicauth/config.go` (secondary).
3. `missing-cochange` on `middleware/keyauth/config.go` (secondary).
4. `other-group` on `other` (tertiary): 3 files no shore rule claims, `.json`, `.yml` and
   `Makefile`.

The `interface-added` notice is true and is the PR's new API. The cells, the stitches and the
muted channels read as D176 (other-language-evidence) settles.

**What moved at step 122.** Step 86's map ranked six notices, and three were false
`deleted-export` notices: on `helpers.go` (`App.isASCII`, `App.isEtagStale`, `acceptsOffer` and
more), on `middleware/keyauth/keyauth.go` (`getAuthSchemes`) and on
`middleware/session/middleware.go` (`Middleware.initialize`, `Middleware.saveSession`,
`middlewareContextKey`). Every name they listed is unexported and still declared at the fixture
commit. The Go producer's edges carry the names a file reads from another file of its own package,
unexported ones included, while its exports hold only exported names, and core's candidate
checked a base edge's names against the head's exports without asking whether the base had
exported them. Since D188 (deleted-export-at-base) it asks, so all three are gone, and the
`other` group, which they had crowded out of the budget, takes the fourth place.
