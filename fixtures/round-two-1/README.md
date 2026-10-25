# Round-two fixture 1

An outside project's pull request, in glance round two (D95; see
[`../round-two.md`](../round-two.md)), read blind in the world at step 47. Its ground truth is
in [`truth.md`](./truth.md); the reader opens neither file until the reading is done (D62).

## The change

| | |
| --- | --- |
| repo | `azat-io/eslint-plugin-perfectionist` (<https://github.com/azat-io/eslint-plugin-perfectionist>) |
| pull request | [#673](https://github.com/azat-io/eslint-plugin-perfectionist/pull/673) `feat: fallback sort subgroup order` |
| base branch | `main` |
| fixture commit | `b34bffb601f91a67f1d1413457e5d6041325e57e` `fix: removed extra blank lines`: the commit a human review was submitted against |
| merge base | `de28a71501081f044ece00064dc45e9a3a137848` `docs: add missing fallback sort documentation` |
| size | 15 files, +346 −49; 9 TypeScript source files by `classifyFile`'s rule, 4 test files |

The TypeScript source files are four rules' comparator computers,
`rules/sort-enums/build-comparator-by-options-computer.ts`,
`rules/sort-imports/comparator-by-options-computer.ts`,
`rules/sort-modules/build-comparator-by-options-computer.ts` and
`rules/sort-object-types/comparator-by-options-computer.ts`; `types/common-options.ts`; and four
under `utils/`, `compare/build-subgroup-order-comparator.ts` (new),
`compare/default-comparator-by-options-computer.ts`, `json-schemas/common-json-schemas.ts` and
`sort-nodes-by-groups.ts`. The tests are `test/rules/sort-classes.test.ts`,
`test/utils/json-schemas/common-json-schemas.test.ts`,
`test/utils/sort-nodes-by-groups.subgroup-order.test.ts` (new) and
`test/utils/sort-nodes-by-groups.test.ts`. The other two files are
`docs/content/rules/sort-imports.mdx` and `pnpm-workspace.yaml`.

The merge base is `git merge-base` of the fixture commit and `origin/main`, and agrees with the
compare API's `merge_base_commit`; the fixture commit is five commits ahead of it, all the PR
author's and all on the PR's branch. The branch was rebased onto the merge base after the PR's
first review, so the commit that first review was submitted against,
`10578872db954f6592ec895bfffa3a9f6e43c195` (a merge of `main` into the branch's earlier
history), is not in the PR's final commit list. The fixture commit is, and so is reachable from
`refs/pull/673/head`. The PR squash-merged as `3c8fecfb61ff6cce606a375a2c35c257b89ca97c`, whose
one parent is the merge base.

## The ecosystem

| | |
| --- | --- |
| package manager | pnpm, with no `packageManager` field; CI's `pnpm/action-setup` asks for version 10 and runs `pnpm install --frozen-lockfile --ignore-scripts`, then `pnpm exec astro sync`. `pnpm-lock.yaml` is lockfileVersion 9.0 with a `pnpmfileChecksum`; `pnpm-workspace.yaml` loads the config dependency `@pnpm/plugin-trusted-deps` 0.2.1 and takes `onlyBuiltDependenciesFile` from it |
| workspaces | none: one package whose code sits at the root, in `index.ts`, `rules/`, `types/` and `utils/`, with no `src/`. The fixture commit's `pnpm-workspace.yaml` carries the PR's own `packages: ['.']`, which the owner later asked to drop |
| test runner | vitest `^4.0.16` (the lockfile resolves 4.0.16) with `@vitest/coverage-v8` `^4.0.16` (4.0.16), from root `devDependencies`. `vitest.config.ts` merges `vite.config.ts` (which loads `vite-plugin-dts` and `vite-plugin-prettier-format`) and sets the v8 provider with 100% thresholds on statements, functions, branches and lines. `test:unit` runs `vitest --run --coverage`; the root `test` script runs every `test:*` script, among them `astro check`, stylelint, prettier, eslint, cspell, `svelte-check` and `tsc --noEmit`. The lockfile resolves typescript 5.9.3, eslint 9.39.2 and `@typescript-eslint/parser` 8.51.0 |
| node | `engines.node` `^20.0.0 \|\| >=22.0.0`; no `.nvmrc` or `.node-version`; CI sets up node 24 |
| TypeScript files at the fixture commit | 267 |
