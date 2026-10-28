# check-targets

A `.check/` split into targets, as checkride 0.19.1 writes it, for the reader's
tests (D180). It is checkride's own `examples/polyglot-stack`: a TypeScript app
in `web/`, a Go service in `api/` and shell scripts in `scripts/`, checked as
three targets from their own roots. Five of the plants its `expected.json`
lists are in, so the run is red across all three:

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
golangci-lint and ShellCheck on `PATH`. Then copy the `.check/` it writes here.
