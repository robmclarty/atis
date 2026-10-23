# Corpus fixture 5

An outside project's pull request, in the tuning half of the precision corpus (D88, D127,
D128, D129; see [`../corpus.md`](../corpus.md)). Its ground truth is in
[`truth.md`](./truth.md); a reader of the corpus opens neither file until step 20's reading is
done (D62).

## The change

| | |
| --- | --- |
| repo | `actualbudget/actual` (<https://github.com/actualbudget/actual>) |
| pull request | [#9020](https://github.com/actualbudget/actual/pull/9020) `[AI] Add getScheduleDates to the API` |
| base branch | `master` |
| fixture commit | `f25eab0686dd13a1683cff5eec740a9f8f594a4e` `[AI] Add getScheduleDates to the API`: the commit a human review was submitted against |
| merge base | `bfa850ca618ca78c556ded61274602f1fca7a4a4` `experimental sidebar: respect light theme sidebar overrides (#9003)` |
| size | 10 files, +609 −8; 5 TypeScript source files by `classifyFile`'s rule, 2 test files |

The TypeScript source files are `packages/api/methods.ts` and four in `packages/loot-core/src/`:
`server/api.ts`, `server/schedules/occurrences.ts` (new), `shared/schedules.ts` and
`types/api-handlers.ts`. The tests are `packages/api/methods.test.ts` and
`packages/loot-core/src/server/schedules/occurrences.test.ts` (new). The other three files are
`packages/api/vite.config.mts`, a tool config that `classifyFile` leaves out (it makes vitest
resolve the ES builds of `@rschedule`), the API reference page
`packages/docs/docs/api/reference.md` and a release note under `upcoming-release-notes/`.

The fixture commit is the PR's only commit at the time, one commit ahead of the merge base.

## The ecosystem

<!-- cspell:ignore lage -->

| | |
| --- | --- |
| package manager | yarn 4.17.1, from `packageManager`, `.yarnrc.yml` (`yarnPath` `.yarn/releases/yarn-4.17.1.cjs`, `nodeLinker: node-modules`) and `yarn.lock` (`__metadata` version 10); `engines.yarn` is `^4.9.1` |
| workspaces | `packages/*`, from the root `workspaces` field; lage `^2.15.17` runs the workspace tasks |
| test runner | vitest `^5.0.0` (the lockfile resolves 5.0.0), from the root and package `devDependencies`; the root `vitest.config.ts` lists per-package projects. `packages/loot-core` (`@actual-app/core`) runs `test:node` (`ENV=node vitest --run`) and `test:web` (`ENV=web vitest --run -c vitest.web.config.ts`); `packages/api` runs `vitest --run`; the root `test` script runs `lage test --continue` |
| node | `>=22.18.0`, from `engines.node`; `.nvmrc` says v24.18.1 |
| TypeScript files at the fixture commit | 2012 |
