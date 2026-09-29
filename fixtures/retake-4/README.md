# Retake fixture 4

An outside project's pull request, for the blind retake of glance-test round one (D59, D62).
Its ground truth is in [`truth.md`](./truth.md); a reader of the retake opens neither file
until the verdicts are in.

## The change

| | |
| --- | --- |
| repo | `remeda/remeda` (<https://github.com/remeda/remeda>) |
| pull request | [#793](https://github.com/remeda/remeda/pull/793) `feat(randomInt): add randomInt` |
| base branch | `main` |
| fixture commit | `77ac0658d2ad84fb9b9c6d3e75355ce935efb873` `allow floats`: the commit a human review was submitted against |
| merge base | `71be3884e05c30860e9db28b1c2d439669b877b0` `chore(deps-dev): bump eslint-plugin-unicorn from 54.0.0 to 55.0.0 (#800)` |
| size | 6 files, +138 −1; 4 TypeScript source files (2 of them tests) |

The TypeScript files are `src/randomInt.ts` and `src/index.ts`, with the tests
`src/randomInt.test.ts` and `src/randomInt.test-d.ts` (a type test). The other two files are
docs pages under `docs/src/content/mapping/lodash/`.

## The ecosystem

| | |
| --- | --- |
| package manager | npm, from `package-lock.json` (lockfileVersion 3); no `packageManager` field |
| workspaces | none (no `workspaces` field, no workspace file) |
| test runner | vitest `^2.0.1`, from `devDependencies`; the `test` script runs `tsc --project tsconfig.tests.json && vitest --typecheck.enabled --typecheck.ignoreSourceErrors`, with `vitest.config.ts` at the root |
| node | 22, from `.nvmrc`; no `engines` |
| TypeScript files at the fixture commit | 422 |

## Generation

Step 33 generates `map.json` and `atis.svg` here by the D58 worktree procedure and records its
commands, skipped slots and harness changes in this section.
