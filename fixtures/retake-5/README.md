# Retake fixture 5

An outside project's pull request, for the blind retake of glance-test round one (D59, D62).
Its ground truth is in [`truth.md`](./truth.md); a reader of the retake opens neither file
until the verdicts are in.

## The change

| | |
| --- | --- |
| repo | `honojs/hono` (<https://github.com/honojs/hono>) |
| pull request | [#5266](https://github.com/honojs/hono/pull/5266) `fix(reg-exp-router): associate wildcard middleware with matching routes` |
| base branch | `main` |
| fixture commit | `0a2157321843847d3f46862b4fdd18ecc79dbd82` `perf(reg-exp-router): compact route registration`: the commit a human review was submitted against |
| merge base | `a19462879716e7b600daed8eb3a1b2af4bd68feb` `fix(pattern-router/linear-router): prevent prefix overmatch on wildcard routes (#5252)` |
| size | 4 files, +175 −101; 4 TypeScript source files (2 of them tests) |

The TypeScript files are `src/router/reg-exp-router/node.ts` and
`src/router/reg-exp-router/router.ts`, with the tests `src/router/common.case.test.ts` and
`src/router/linear-router/router.test.ts`.

## The ecosystem

| | |
| --- | --- |
| package manager | bun 1.2.20, from `packageManager` and `bun.lock` (the text lockfile, lockfileVersion 1); `bunfig.toml` at the root |
| workspaces | none (no `workspaces` field, no workspace file) |
| test runner | vitest `^4.1.9`, from `devDependencies`; the `test` script runs `tsc -p tsconfig.spec.json && vitest --run`, with `vitest.config.ts` at the root |
| node | `>=16.9.0`, from `engines.node`; `.tool-versions` pins nodejs 24.7.0, bun 1.2.19 and deno 2.4.5 |
| TypeScript files at the fixture commit | 359 |

## Generation

Step 33 generates `map.json` and `atis.svg` here by the D58 worktree procedure and records its
commands, skipped slots and harness changes in this section.
