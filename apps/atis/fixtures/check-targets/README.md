# check-targets

What checkride 0.19 writes for languages other than TypeScript, for the
reader's tests (D176, D180). It stands for a small repo. `check/` is its
`.check/`, `api/` is the Go module that run tested, and `findings/` holds the
other packs' tools' own output.

## `check/`: a run split into targets

`check/` is checkride 0.19.1 running its own `examples/polyglot-stack`: a
TypeScript app in `web/`, a Go service in `api/` and shell scripts in
`scripts/`, checked as three targets from their own roots. Five of the plants
its `expected.json` lists are in, so the run is red across all three:

| Plant | Check it fails | Tool |
| --- | --- | --- |
| an ignored error return in Go | `api:lint` | golangci-lint 2.14.0 |
| a failing Go test | `api:test` | `go test` on Go 1.26.1 |
| a TypeScript type error | `web:types` | tsc 6.0.3 |
| an unquoted variable in a script (SC2086) | `scripts:lint` | ShellCheck 0.11.0 |
| a dot import in Go | `struct` | ast-grep 0.45.3 |

Every file is the run's own bytes. Each target's files sit in its directory
(`api/lint.json`, `api/test.jsonl`, `scripts/lint.json`,
`web/types.stdout.txt`), and the checks of the repo as a whole write at the
root (`struct.json`, `links.json`, `unclaimed.json`).

To capture it again, copy the example out of checkride's repository, pin
`checkride` in its `package.json` to the release, install, plant the five
edits from `expected.json`, commit, and run `pnpm exec checkride` with
golangci-lint and ShellCheck on `PATH`. Then copy the `.check/` it writes to
`check/`.

## `api/`: the module the run tested

`api/` is the example's Go service as the run saw it, the plants in. Go reports
a test run by package, so the reader finds a package's `_test.go` files
through this `go.mod`.

## `findings/`: the other packs' tools

`findings/` is checkride's own captures of the tools the polyglot example does
not run, copied from its `src/__tests__/fixtures/` at 0.19.1. Each was printed
by the tool against a scratch repo, which its absolute paths still name.

| File | Tool | Captured from |
| --- | --- | --- |
| `findings-ruff.json` | ruff 0.17.1 | a Python target in `py/` |
| `findings-mypy.jsonl` | mypy 2.4.0 | the same target |
| `findings-basedpyright.json` | basedpyright 1.40.2 | the same target |
| `findings-staticcheck.jsonl` | staticcheck | a Go module in `svc/` |
| `findings-tflint.json` | tflint 0.64.0 | a root module in `infra/` |
| `findings-terraform-validate.json` | `tofu validate`, OpenTofu 1.13.1 | the same module |
| `findings-trivy-config.json` | trivy 0.76.0 | the same module |
