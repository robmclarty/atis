# Corpus fixture 2

An outside project's pull request, in the tuning half of the precision corpus (D88, D127,
D128, D129; see [`../corpus.md`](../corpus.md)). Its ground truth is in
[`truth.md`](./truth.md); a reader of the corpus opens neither file until step 20's reading is
done (D62).

## The change

| | |
| --- | --- |
| repo | `mermaid-js/mermaid` (<https://github.com/mermaid-js/mermaid>) |
| pull request | [#6995](https://github.com/mermaid-js/mermaid/pull/6995) `Deprecate flowchart-level htmlLabels config option` |
| base branch | `develop` |
| fixture commit | `19cd1ed230123ab3f5ee33760f51f26756376ed9` `Merge branch 'deprecate-flowchart.htmlLabels' of https://github.com/mermaid-js/mermaid into deprecate-flowchart.htmlLabels`: the commit a human review was submitted against |
| merge base | `66f0c6c91a6a6247f922aa04b8f0cb1551d4dae7` `Merge pull request #7296 from mermaid-js/requirement-and-ER-diagram-edge-labels` |
| size | 47 files, +378 −153; 14 TypeScript source files by `classifyFile`'s rule, 2 test files |

The TypeScript source files are all under `packages/mermaid/src/`: `assignWithDepth.ts`,
`config.ts`, `config.type.ts`, `mermaidAPI.ts`, `diagrams/class/classRenderer-v2.ts`,
`diagrams/class/shapeUtil.ts`, `diagrams/common/common.ts`, `diagrams/mindmap/svgDraw.ts`,
and six shapes under `rendering-util/rendering-elements/shapes/` (`classBox.ts`, `erBox.ts`,
`note.ts`, `rectWithTitle.ts`, `triangle.ts`, `util.ts`). The tests are
`packages/mermaid/src/config.spec.ts` and `packages/mermaid/src/mermaidAPI.spec.ts`. The other
31 files are nine plain-JavaScript renderers (six under `packages/mermaid/src/dagre-wrapper/`,
three under `packages/mermaid/src/rendering-util/rendering-elements/`), 17 generated docs
pages under `docs/`, three doc sources under `packages/mermaid/src/docs/`, the config schema
`packages/mermaid/src/schemas/config.schema.yaml` and a changeset.

The fixture commit merges the remote branch into the author's local copy of it; every commit
between the merge base and the fixture commit is in the PR's own commit list.

## The ecosystem

| | |
| --- | --- |
| package manager | pnpm 10.4.1, from `packageManager` (with its sha512) and `pnpm-lock.yaml` (lockfileVersion 9.0); no `engines` |
| workspaces | `packages/*`, `packages/mermaid/src/docs`, `packages/mermaid/src/vitepress`, `tests/*`, from `pnpm-workspace.yaml` |
| test runner | vitest `^3.2.4` (the lockfile resolves 3.2.4) with `@vitest/coverage-v8` `^3.2.4`, from root `devDependencies`; `vitest.workspace.js` names the root `vite.config.ts` (jsdom environment) and `packages/mermaid/src/docs/vite.config.ts`. The root `test` script runs `pnpm lint && vitest run`, and `ci` runs `vitest run`. jest `^30.1.3` is also a root dev dependency, with no jest config in the tree; Cypress drives the e2e suite |
| node | 22.14.0, from `.node-version`; no `engines.node` |
| TypeScript files at the fixture commit | 472 |
