# Retake fixture 2

An outside project's pull request, for the blind retake of glance-test round one (D59, D62).
Its ground truth is in [`truth.md`](./truth.md); a reader of the retake opens neither file
until the verdicts are in.

## The change

| | |
| --- | --- |
| repo | `TanStack/form` (<https://github.com/TanStack/form>) |
| pull request | [#2259](https://github.com/TanStack/form/pull/2259) `fix(vue-form): generate an SSR-safe default formId` |
| base branch | `main` |
| fixture commit | `f3474c79beb28839b7a83e858e56c13e977d8eaa` `test(vue-form): assert real hydration, not just matching ids`: the commit a human review was submitted against |
| merge base | `5d1128141a705ebb24ade1275b3117bb4c8b1bdc` `ci: Version Packages (#2242)` |
| size | 4 files, +106 −1; 3 TypeScript source files (1 of them tests) |

The TypeScript files are `packages/vue-form/src/useForm.tsx` and
`packages/vue-form/src/useFormId.ts`, with the test `packages/vue-form/tests/useFormId.test.tsx`.
The fourth file is a changeset.

## The ecosystem

| | |
| --- | --- |
| package manager | pnpm 11.3.0, from `packageManager` (with its sha512) and `pnpm-lock.yaml` (lockfileVersion 9.0); `engines.pnpm` is `>=11.0.0` |
| workspaces | `packages/**`, `examples/angular/**`, `examples/react/**`, `examples/preact/**`, `examples/solid/**`, `examples/vue/**`, `examples/lit/**`, `examples/svelte/**`, from `pnpm-workspace.yaml` (which also sets `allowBuilds`, a trust policy and an override) |
| test runner | vitest `^3.2.4`, from root `devDependencies`; `packages/vue-form` runs it as `test:lib` (`vitest`). The root `test` script is `pnpm run test:ci`, an nx `run-many` over lint, knip, sherif, docs, types, build and `test:lib` |
| node | 24.8.0, from `.nvmrc`; no `engines.node` |
| TypeScript files at the fixture commit | 381 |

## Generation

Step 33 generates `map.json` and `atis.svg` here by the D58 worktree procedure and records its
commands, skipped slots and harness changes in this section.
