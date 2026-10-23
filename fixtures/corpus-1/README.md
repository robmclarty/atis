# Corpus fixture 1

An outside project's pull request, in the tuning half of the precision corpus (D88, D127,
D128, D129; see [`../corpus.md`](../corpus.md)). Its ground truth is in
[`truth.md`](./truth.md); a reader of the corpus opens neither file until step 20's reading is
done (D62).

## The change

| | |
| --- | --- |
| repo | `modelcontextprotocol/inspector` (<https://github.com/modelcontextprotocol/inspector>) |
| pull request | [#770](https://github.com/modelcontextprotocol/inspector/pull/770) `Added UI to provide additional _meta values` |
| base branch | `main` |
| fixture commit | `5b9e69f36a191f24d3f33387f9cb7f8200752a25` `Aligned naming`: the commit a human review was submitted against |
| merge base | `c7683b464a3b1bc0c230780a019c0d016120e0d0` `Merge pull request #886 from olaservo/version-bump-0.17.2` |
| size | 12 files, +1772 −84; 8 TypeScript source files by `classifyFile`'s rule, 2 test files |

The TypeScript source files are four in the CLI, `cli/src/index.ts`,
`cli/src/client/prompts.ts`, `cli/src/client/resources.ts` and `cli/src/client/tools.ts`, and
four in the web client, `client/src/App.tsx`, `client/src/components/MetadataTab.tsx` (new),
`client/src/components/ToolsTab.tsx` and `client/src/lib/hooks/useConnection.ts`. The tests
are `client/src/components/__tests__/MetadataTab.test.tsx` (new) and
`client/src/components/__tests__/ToolsTab.test.tsx`. The other two files are `.gitignore` and
`cli/scripts/cli-metadata-tests.js`, a new plain-JavaScript script that drives the CLI.

The PR merged with a two-parent merge commit, so the fixture commit is already on `main`; the
merge base is `git merge-base` of the fixture commit and that merge commit's first parent.

## The ecosystem

| | |
| --- | --- |
| package manager | npm, from `package-lock.json` (lockfileVersion 3); no `packageManager` field |
| workspaces | `client`, `server`, `cli`, from the root `workspaces` field |
| test runner | jest `^29.7.0` (the lockfile resolves 29.7.0) with ts-jest `^29.4.0` (29.4.0) and the `jest-fixed-jsdom` environment, from `client`'s `devDependencies`; `client`'s `test` script runs `jest --config jest.config.cjs`. The root `test` script runs `npm run prettier-check && cd client && npm test`. The `cli` workspace's `test` script runs plain Node scripts (`node scripts/cli-tests.js && ...`), not jest or vitest, and `server` has no tests |
| node | `>=22.7.5`, from `engines.node`; `.node-version` says `22.x.x` |
| TypeScript files at the fixture commit | 106 |
