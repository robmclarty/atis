# Corpus fixture 3

An outside project's pull request, in the tuning half of the precision corpus (D88, D127,
D128, D129; see [`../corpus.md`](../corpus.md)). Its ground truth is in
[`truth.md`](./truth.md); a reader of the corpus opens neither file until step 20's reading is
done (D62).

## The change

| | |
| --- | --- |
| repo | `matrix-org/matrix-js-sdk` (<https://github.com/matrix-org/matrix-js-sdk>) |
| pull request | [#5080](https://github.com/matrix-org/matrix-js-sdk/pull/5080) `Import room key bundles received after invite.` |
| base branch | `develop` |
| fixture commit | `fe0baa62e410379869345ba2cd8b743aa9f81aa1` `Merge branch 'develop' into kaylendog/msc4268/pending-bundles`: the commit a human review was submitted against |
| merge base | `3d1bcb73c1a0fb4f7a19f792072ef51f4a7c84c3` `Allow msc4354_sticky_key to be optional on sticky events. (#5073)` |
| size | 4 files, +177 −5; 3 TypeScript source files by `classifyFile`'s rule, 1 test file |

The TypeScript source files are `src/client.ts`, `src/common-crypto/CryptoBackend.ts` and
`src/rust-crypto/rust-crypto.ts`, with the test `spec/integ/crypto/history-sharing.spec.ts`.
There are no other files.

The fixture commit merges `develop` into the PR branch, and the merge base is the `develop`
commit it brought in, so the diff holds only the PR's own work.

## The ecosystem

| | |
| --- | --- |
| package manager | yarn classic, from `yarn.lock` (yarn lockfile v1); no `packageManager` field |
| workspaces | none (no `workspaces` field, no workspace file) |
| test runner | jest `^30.0.0` (the lockfile resolves 30.2.0) with babel-jest `^30.0.0` (30.2.0), from `devDependencies`; the `test` script runs `jest`, with `jest.config.ts` at the root (node environment, `spec/**/*.spec.{js,ts}`, setup in `spec/setupTests.ts`, results processed by `@casualbot/jest-sonar-reporter`) |
| node | `>=22.0.0`, from `engines.node`; no `.nvmrc` or `.node-version`; CI runs jest on `lts/*` and 22 |
| TypeScript files at the fixture commit | 384 |
