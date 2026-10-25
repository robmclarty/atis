# Round-two fixture 3

An outside project's pull request, in glance round two (D95; see
[`../round-two.md`](../round-two.md)), read blind in the world at step 47. Its ground truth is
in [`truth.md`](./truth.md); the reader opens neither file until the reading is done (D62).

## The change

| | |
| --- | --- |
| repo | `jest-community/eslint-plugin-jest` (<https://github.com/jest-community/eslint-plugin-jest>) |
| pull request | [#1845](https://github.com/jest-community/eslint-plugin-jest/pull/1845) ``feat: create new `valid-mock-module-path` rule`` |
| base branch | `main` |
| fixture commit | `fee7e7af6bebecd66ee8522b648ffbf950f83ea0` ``build(dev-deps): update `markdown-link-check` ``: the commit a human review was submitted against |
| merge base | `2557a2029390287620dc7b6fbe6a3ae15f6763e2` ``chore: downgrade `eslint-plugin-eslint-plugin` (#1841)`` |
| size | 14 files, +243 −14; 3 TypeScript source files by `classifyFile`'s rule, 4 test files |

The TypeScript source files are all in `src/rules/`: the new rule,
`valid-mocked-module-path.ts` (renamed `valid-mock-module-path` later in the PR), and the move
of its helper `findModuleName` out of `no-untyped-mock-factory.ts` into `utils/misc.ts`. The
tests are `src/rules/__tests__/valid-mocked-module-path.test.ts` (new),
`src/__tests__/rules.test.ts`, and two fixture modules the rule's tests resolve against,
`src/rules/__tests__/fixtures/module/foo.ts` and `index.ts`, which count as tests because they
sit under `__tests__/`. The other seven files are `README.md`,
`docs/rules/valid-mocked-module-path.md`, `src/__tests__/__snapshots__/rules.test.ts.snap`, a
third fixture module `src/rules/__tests__/fixtures/module/foo.js`, and a link-checker change the
reviewer asked to have reverted: `markdown_link_check_config.json`, and `package.json` with
`yarn.lock`, which bump `markdown-link-check` from `^3.13.7` to `^3.14.1`.

The merge base is `git merge-base` of the fixture commit and `origin/main`, and agrees with the
compare API's `merge_base_commit`; the fixture commit is five commits ahead of it, all the
author's and all on the PR's branch, and it and its parent are the link-checker change. The PR
squash-merged as `a8625f1e77758aacb1daedc4eb628050a797082a`, on top of the later `main` commit
`59927d91c3` (`ci: don't update uses-with in actions (#1856)`).

## The ecosystem

| | |
| --- | --- |
| package manager | yarn 4.10.3, from `packageManager` and `.yarnrc.yml` (`yarnPath` `.yarn/releases/yarn-4.10.3.cjs`, `nodeLinker: node-modules`, `enableGlobalCache: true`); `yarn.lock` is berry format (`__metadata` version 8). `postinstall` runs `is-ci \|\| husky` |
| workspaces | none: one package, its source in `src/`, built by babel into `lib/` |
| test runner | jest `^30.0.0` (the lockfile resolves 30.2.0) with babel-jest 30.2.0 and `babel.config.js` (`@babel/preset-typescript` and `@babel/preset-env`, `@babel/core` 7.28.5), from root `devDependencies`. `jest.config.ts`, read through ts-node 10.9.2, defines two projects: `test`, the unit suite, and `lint`, which runs `jest-runner-eslint` 2.3.0 over every `.js` and `.ts` file as a test. It sets a 100% global coverage threshold on branches, functions, lines and statements. The `test` script runs `jest`, and CI runs `yarn test --coverage` on its eslint 8 legs. The lockfile resolves typescript 5.9.3, eslint 8.57.1 and `@typescript-eslint/utils` 8.46.2 |
| node | `engines.node` `^20.12.0 \|\| ^22.0.0 \|\| >=24.0.0`; no `.nvmrc` or `.node-version`; CI tests node 20.x, 22.x and 24.x against eslint 8 and 9 |
| TypeScript files at the fixture commit | 155 |
