# Corpus fixture 4

An outside project's pull request, in the tuning half of the precision corpus (D88, D127,
D128, D129; see [`../corpus.md`](../corpus.md)). Its ground truth is in
[`truth.md`](./truth.md); a reader of the corpus opens neither file until step 20's reading is
done (D62).

## The change

| | |
| --- | --- |
| repo | `discordjs/discord.js` (<https://github.com/discordjs/discord.js>) |
| pull request | [#11410](https://github.com/discordjs/discord.js/pull/11410) `feat(builders): add checkbox, checkboxgroup, and radiogroup builders` |
| base branch | `v14` |
| fixture commit | `4d0e88d62f335633b27c1cce54b4ddc1d9e8e830` `feat(builders): add checkbox, checkboxgroup, and radiogroup builders`: the commit a human review was submitted against |
| merge base | `4476fadd19bcfdd3b9f13f2045ef513182cd6033` `chore(builders): release @discordjs/builders@1.13.1` |
| size | 11 files, +1163 −0; 10 TypeScript source files by `classifyFile`'s rule, 1 test file |

The TypeScript source files are all under `packages/builders/src/`: six new files under
`components/checkbox/` (`Assertions.ts`, `Checkbox.ts`, `CheckboxGroup.ts`,
`CheckboxGroupOption.ts`, `RadioGroup.ts`, `RadioGroupOption.ts`), and four changed ones,
`components/Components.ts`, `components/label/Assertions.ts`, `components/label/Label.ts`
and `index.ts`. The test is the new `packages/builders/__tests__/components/checkbox.test.ts`.
There are no other files.

The base branch is `v14`, the maintained v14 line, not the repo's default `main`. The fixture
commit is the PR's only commit at the time, one commit ahead of the merge base.

## The ecosystem

| | |
| --- | --- |
| package manager | pnpm 9.8.0, from `packageManager` and `pnpm-lock.yaml` (lockfileVersion 9.0) |
| workspaces | `packages/*`, from `pnpm-workspace.yaml`; turbo `^2.0.14` runs the workspace tasks |
| test runner | vitest `^2.0.5` (the lockfile resolves 2.1.9) with `@vitest/coverage-v8` `^2.0.5`, from the root and `packages/builders` `devDependencies`; `packages/builders` runs `vitest run`, and the root `test` script runs `turbo run test --concurrency=4`. The root `vitest.config.ts` turns coverage on and type-checks `**/__tests__/types.test.ts` |
| node | `>=18`, from the root `engines.node` (`packages/builders` says `>=16.11.0`); no `.nvmrc` or `.node-version`; CI's test workflow uses Node 20 |
| TypeScript files at the fixture commit | 498 |
