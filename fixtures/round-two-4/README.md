# Round-two fixture 4

An outside project's pull request, in glance round two (D95; see
[`../round-two.md`](../round-two.md)), read blind in the world at step 47. Its ground truth is
in [`truth.md`](./truth.md); the reader opens neither file until the reading is done (D62).

## The change

| | |
| --- | --- |
| repo | `lingui/js-lingui` (<https://github.com/lingui/js-lingui>) |
| pull request | [#2583](https://github.com/lingui/js-lingui/pull/2583) `feat: add pseudolocalize options` |
| base branch | `main` |
| fixture commit | `a5215b97d151212b8584c5d803c59dc1e142bc89` `add pseudolocalize options`: the commit a human review was submitted against |
| merge base | `5070bcae400a7d457cccc84cb4634e7dea921cda` `docs: highlight native SolidJS support across landing and README (#2577)` |
| size | 18 files, +275 −22; 13 TypeScript source files by `classifyFile`'s rule, 3 test files |

The TypeScript source files span six packages. Five are in `packages/conf/`:
`src/getPseudoLocale.ts` (new), `src/index.ts`, `src/makeConfig.ts`, `src/types.ts`, and
`__typetests__/index.tst.ts`, a tstyche type test that counts as source because its name matches
neither `*.test.*` nor `*.spec.*`. Five are in `packages/cli/src/`: `api/compile.ts`,
`api/compile/compileLocale.ts`, `api/pseudoLocalize.ts`, `api/stats.ts` and
`services/translationIO.ts`. The other three are `packages/loader/src/webpackLoader.ts`,
`packages/metro-transformer/src/metroTransformer.ts` and `packages/vite-plugin/src/index.ts`.
The tests are `packages/cli/src/api/compile.test.ts`, `packages/cli/src/api/pseudoLocalize.test.ts`
and `packages/conf/src/getPseudoLocale.test.ts` (new). The other two files are
`packages/cli/src/api/__snapshots__/compile.test.ts.snap` and `website/docs/ref/conf.md`.

The merge base is `git merge-base` of the fixture commit and `origin/main`, and agrees with the
compare API's `merge_base_commit`; the fixture commit is the PR's first commit, one ahead of it.
The PR squash-merged as `35476887e8601b9a3dd0361c8c1a04ed2e8669a3`, on top of the later `main`
commit `8aa816a868` (`chore(cli): raise esbuild dependency floor (#2604)`).

## The ecosystem

| | |
| --- | --- |
| package manager | yarn 4.14.1, from `packageManager` and `.yarnrc.yml` (`yarnPath` `.yarn/releases/yarn-4.14.1.cjs`, `nodeLinker: node-modules`, `enableGlobalCache: false`, and a `catalog` pinning vitest, `@vitest/coverage-v8`, typescript and unbuild); `yarn.lock` is berry format (`__metadata` version 9). `prepare` runs `husky install` |
| workspaces | `packages/*` and `test/*`, from the root `workspaces` field; 19 packages under `packages/` and three end-to-end packages under `test/`. The packages' `exports` point at their built `dist/` (`test-utils` alone has none), which `unbuild` 3.6.1 writes |
| test runner | vitest, catalog 4.1.5 (the lockfile resolves 4.1.5), with `@vitest/coverage-v8` 4.1.5, from root `devDependencies`. The root `vitest.config.ts` lists `projects: ["packages/*"]` and sets the v8 provider over `packages/**/*.{ts,tsx}`, excluding build output, fixtures, `test/`, `__typetests__/`, configs and declarations; each package has its own `vitest.config.ts`. The `test` script runs `vitest --run`, `test:ci:coverage` adds `--coverage`, and CI runs `yarn release:build` (every package's build, in topological order) before either. Type tests run separately in tstyche (`test:types`) and end-to-end tests in `test/*` (`test:e2e`). typescript 5.9.3 |
| node | `.nvmrc` `22`; `engines.node` `>=22.19.0`; CI tests node 22 and 24 on Ubuntu and Windows |
| TypeScript files at the fixture commit | 435 |
