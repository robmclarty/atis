# Retake fixture 3

An outside project's pull request, for the blind retake of glance-test round one (D59, D62).
Its ground truth is in [`truth.md`](./truth.md); a reader of the retake opens neither file
until the verdicts are in.

## The change

| | |
| --- | --- |
| repo | `trpc/trpc` (<https://github.com/trpc/trpc>) |
| pull request | [#6976](https://github.com/trpc/trpc/pull/6976) `feat(tanstack-react-query): Add QueryKey and MutationKey Prefix option` |
| base branch | `main` |
| fixture commit | `e11a7d2410fff83e45a0c7da14b6be50d952673e` `Format`: the commit a human review was submitted against |
| merge base | `cd64ab3b9684b24ceec8bc8d5b247db3db23cd06` `fix(client): do not emit "connecting" when initializing websocket subscription (#6970)` |
| size | 12 files, +245 −54; 10 TypeScript source files (3 of them tests) |

The TypeScript files are six under `packages/tanstack-react-query/src/internals/`
(`Context.tsx`, `createOptionsProxy.ts`, `mutationOptions.ts`, `subscriptionOptions.ts`,
`types.ts`, `utils.ts`) and `examples/.experimental/next-app-dir/src/trpc/rq-server.tsx`, with
three under `packages/tanstack-react-query/test/` (`__helpers.tsx`, `queryKeyable.test.tsx`,
`utils.test.ts`). The other two files are docs pages under `www/docs/`.

## The ecosystem

| | |
| --- | --- |
| package manager | pnpm 9.12.2, from `packageManager` and `pnpm-lock.yaml` (lockfileVersion 9.0); `engines.pnpm` is `^9.12.2` |
| workspaces | `packages/*`, `examples/*`, `examples/.*/*`, `examples/minimal/*`, `examples/minimal-react/*`, `examples/minimal-content-types/*`, `www`, `www/og-image`, from `pnpm-workspace.yaml` |
| test runner | vitest `^3.1.2` (the lockfile resolves 3.1.3), from root `devDependencies` and the root `test` script (`vitest`, with `vitest.workspace.json`) |
| node | `^22.18.0`, from `engines.node`; `.nvmrc` says 22.18.0 (a stale `.tool-versions` says nodejs 20.10.0 and pnpm 8.15.5) |
| TypeScript files at the fixture commit | 748 |

## Generation

Step 33 generates `map.json` and `atis.svg` here by the D58 worktree procedure and records its
commands, skipped slots and harness changes in this section.
