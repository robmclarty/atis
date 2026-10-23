# Corpus fixture 6

An outside project's pull request, in the tuning half of the precision corpus (D88, D127,
D128, D129; see [`../corpus.md`](../corpus.md)). Its ground truth is in
[`truth.md`](./truth.md); a reader of the corpus opens neither file until step 20's reading is
done (D62).

## The change

| | |
| --- | --- |
| repo | `changesets/changesets` (<https://github.com/changesets/changesets>) |
| pull request | [#2009](https://github.com/changesets/changesets/pull/2009) `Refactor CLI to cac` |
| base branch | `next` |
| fixture commit | `fca0d4c28eaee07bf2fbd08a37117b22a8a9d426` `add some examples`: the commit a human review was submitted against |
| merge base | `47e7c7d62431b28ca1ac0732cd3f18b33ca52bca` `Remove unused code` |
| size | 24 files, +894 −1204; 12 TypeScript source files by `classifyFile`'s rule, 9 test files |

The TypeScript source files are all under `packages/cli/src/`: `index.ts`, the new
`commands/shared.ts`, the seven command entry points `commands/<name>/index.ts` for `add`,
`init`, `pre`, `publish`, `status`, `tag` and `version`, and three deleted files, `help.ts`,
`run.ts` and `types.ts`. The tests are
`commands/add/__tests__/add.test.ts`, `commands/init/__tests__/command.test.ts`,
`commands/pre/index.test.ts`, `commands/publish/__tests__/index.test.ts`,
`commands/status/__tests__/status.test.ts`, `commands/tag/__tests__/index.test.ts` and
`commands/version/version.test.ts`, with `commands/publish/__tests__/releaseCommand.test.ts`
and `run.test.ts` deleted, all under the same directory. The other three files are a
changeset, `packages/cli/package.json` (which swaps the `mri` dependency for `cac`) and
`pnpm-lock.yaml`.

The base branch is `next`, a long-lived branch that has since been merged into `main`; the PR
was squash-merged into it. The merge base is the PR's recorded base.

## The ecosystem

| | |
| --- | --- |
| package manager | pnpm 11.0.4, from `packageManager` and `pnpm-lock.yaml` (lockfileVersion 9.0) |
| workspaces | `packages/*`, `scripts/*`, from `pnpm-workspace.yaml` (which also sets `allowBuilds`, peer deduplication, an override and `shellEmulator`) and the root `workspaces` field; the root `postinstall` runs `manypkg check` |
| test runner | vitest `^4.1.5` (the lockfile resolves 4.1.5) with `@vitest/coverage-v8` `^4.1.5`, from root `devDependencies`; the root `test` script runs `vitest`, with `vitest.config.mts` at the root. `packages/cli` has no scripts of its own |
| node | `^22.11 \|\| ^24 \|\| >=26`, from `engines.node`; `.node-version` says v22.9.0, below that floor |
| TypeScript files at the fixture commit | 116 |
