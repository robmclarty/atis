# Retake fixture 1

An outside project's pull request, for the blind retake of glance-test round one (D59, D62).
Its ground truth is in [`truth.md`](./truth.md); a reader of the retake opens neither file
until the verdicts are in.

## The change

| | |
| --- | --- |
| repo | `apollographql/apollo-client` (<https://github.com/apollographql/apollo-client>) |
| pull request | [#12633](https://github.com/apollographql/apollo-client/pull/12633) ``Cancel running `ObservableQuery` link on unsubscribe`` |
| base branch | `release-4.0` |
| fixture commit | `ea36754a35da7e9fa628d77a81c2713c8bb7d77a` ``do not autocall `.retain` in the `useLazyQuery` `execute` function, expose it instead``: the commit a human review was submitted against |
| merge base | `d2a60d45e734a2518dad2443f85d82553cd6456a` ``only advance `previousData` if `data` changed (#12637)`` |
| size | 12 files, +215 −115; 6 TypeScript source files (2 of them tests) |

The TypeScript files are `src/core/ObservableQuery.ts`, `src/core/QueryManager.ts`,
`src/react/hooks/useLazyQuery.ts` and `src/react/internal/types.ts`, with the tests
`src/core/__tests__/ApolloClient/general.test.ts` and
`src/react/hooks/__tests__/useLazyQuery.test.tsx`. The other six files are API reports under
`.api-reports/`, a changeset and `.size-limits.json`.

## The ecosystem

| | |
| --- | --- |
| package manager | npm, from `package-lock.json` (lockfileVersion 3); no `packageManager` field, `devEngines.packageManager` asks for npm `>=10.8.2` |
| workspaces | none (no `workspaces` field, no workspace file) |
| test runner | jest 29.7.0 with ts-jest 29.2.3, from root `devDependencies`; the `test` script runs `jest --config ./config/jest.config.ts` through `node --expose-gc --experimental-import-meta-resolve` |
| node | `>=23.6.0`, from `devEngines.runtime` in `package.json`; no `engines`, `.nvmrc` or `.node-version` |
| TypeScript files at the fixture commit | 490 |

## Generation

Step 33 generates `map.json` and `atis.svg` here by the D58 worktree procedure and records its
commands, skipped slots and harness changes in this section.
