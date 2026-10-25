# Round-two fixture 5

An outside project's pull request, in glance round two (D95; see
[`../round-two.md`](../round-two.md)), read blind in the world at step 47. Its ground truth is
in [`truth.md`](./truth.md); the reader opens neither file until the reading is done (D62).

## The change

| | |
| --- | --- |
| repo | `vuejs/router` (<https://github.com/vuejs/router>) |
| pull request | [#2829](https://github.com/vuejs/router/pull/2829) `fix(unplugin): support definePage with webpack and rspack` |
| base branch | `main` |
| fixture commit | `47f174217a5dc77f6974937c5751e91edccb8c19` `fix(unplugin): support definePage with webpack and rspack`: the PR's approved head |
| merge base | `596d4816a5d524853dc9785827860ca858e3b799` `release: vue-router@5.4.0` |
| size | 6 files, +66 −13; 5 TypeScript source files by `classifyFile`'s rule, 1 test file |

The TypeScript source files are all in `packages/router/src/unplugin/`:
`codegen/generateRouteRecords.ts`, `codegen/generateRouteResolver.ts`,
`core/moduleConstants.ts`, `index.ts` and `options.ts`. The test is
`packages/router/src/unplugin/codegen/generateRouteRecords.spec.ts`. There are no other files.

The merge base is `git merge-base` of the fixture commit and `origin/main`, and agrees with the
compare API's `merge_base_commit`; the fixture commit is the PR's only commit, one ahead of it.
The PR squash-merged as `8c91f980bd7294bac30c368ba650fe93f1e8610a`, whose one parent is the merge
base.

## The ecosystem

| | |
| --- | --- |
| package manager | pnpm 12.9.1, from `packageManager`. `pnpm-lock.yaml` holds two YAML documents, both lockfileVersion 9.0: the first pins pnpm 12.9.1 under `packageManagerDependencies`, the second is the lockfile proper. `pnpm-workspace.yaml` sets `shamefullyHoist: true`, overrides for vite, vue, the babel packages and `@types/node`, and `allowBuilds` for esbuild, `simple-git-hooks`, chromedriver and geckodriver (the last two no longer in the lockfile). `postinstall` runs `simple-git-hooks` |
| workspaces | `packages/*`, from `pnpm-workspace.yaml` and the root `workspaces` field: `router` (the library), `docs`, `playground`, `playground-file-based` and `experiments-playground` |
| test runner | vitest `^5.0.3` (the lockfile resolves 5.0.3) with `@vitest/coverage-v8` 5.0.3, from root `devDependencies`, and happy-dom 20.14.5 from the router's. The root `vitest.config.ts` has one project, `router`, extending `packages/router/vitest.config.ts`: `__tests__/**/*.spec.ts` and `src/**/*.spec.ts`, the playwright HMR tests excluded, compile-time flags such as `__DEV__` and `__TEST__` defined, `@vitejs/plugin-vue` loaded, typecheck off, and coverage over `src/**/*.ts` minus the entry points (`src/unplugin/index.ts` among them) and `src/volar/**`. The router's `test:unit` runs `vitest --coverage run`; its `test` runs the build, `test:unit`, `tsgo` type tests and playwright end-to-end tests, and the root `test` runs `pnpm run -r test`. typescript 6.0.3, with `@typescript/native-preview` for `test:types` |
| node | `.node-version` 26.9.0; `engines.node` `>=22.18.0` |
| TypeScript files at the fixture commit | 307 |
