# Round-two fixture 2

An outside project's pull request, in glance round two (D95; see
[`../round-two.md`](../round-two.md)), read blind in the world at step 47. Its ground truth is
in [`truth.md`](./truth.md); the reader opens neither file until the reading is done (D62).

## The change

| | |
| --- | --- |
| repo | `modelcontextprotocol/typescript-sdk` (<https://github.com/modelcontextprotocol/typescript-sdk>) |
| pull request | [#2441](https://github.com/modelcontextprotocol/typescript-sdk/pull/2441) `fix(server): validate Content-Type by parsed media type instead of substring match` |
| base branch | `main` |
| fixture commit | `b2546a17c59f86bf4fb08b913be33c5b3b5179f9` `Merge branch 'main' into fweinberger/content-type-media-type-validation`: the PR's approved head |
| merge base | `7015d2129bc91e8cf8f143e2cca3ee2ba92808d3` `examples: web-standard twin of the bearer-auth story (#2424)` |
| size | 20 files, +452 −20; 9 TypeScript source files by `classifyFile`'s rule, 4 test files |

The TypeScript source files span five packages and an example:
`packages/core-internal/src/shared/mediaType.ts` (new), with its exports in
`packages/core-internal/src/index.ts` and `packages/core-internal/src/exports/public/index.ts`;
three in `packages/server/src/server/`, `createMcpHandler.ts`, `perRequestTransport.ts` and
`streamableHttp.ts`; `packages/middleware/hono/src/hono.ts`;
`packages/client/src/client/streamableHttp.ts`; and `examples/json-response/client.ts`. The
tests are `packages/core-internal/test/shared/mediaType.test.ts` (new),
`packages/server/test/server/contentTypeValidation.test.ts` (new),
`packages/middleware/hono/test/hono.test.ts` and `packages/client/test/client/middleware.test.ts`.
The other seven files are a changeset, `docs/migration/upgrade-to-v2.md`, a
`no-restricted-syntax` rule in `common/eslint-config/eslint.config.mjs` that bans
substring-matching `'application/json'`, and the dependency move that gives
`packages/core-internal` the `content-type` package: `packages/core-internal/package.json`,
`packages/server-legacy/package.json`, `pnpm-workspace.yaml` (the catalog entry moves from
`runtimeServerOnly` to `runtimeShared`) and `pnpm-lock.yaml`.

The fixture commit is a two-parent merge of `main` into the PR's branch, and its second parent
is the merge base: `git merge-base` of the fixture commit and `origin/main`, which agrees with
the compare API's `merge_base_commit`. The fixture commit is seven commits ahead of it, all the
author's and all on the PR's branch; three of them, the fixture commit among them, merge `main`
into the branch. The PR squash-merged
as `561c6d83456ef98d6c713bbda9837e64337f22c9`, whose one parent is the merge base, so nothing
landed on `main` between the approved head and the merge.

## The ecosystem

| | |
| --- | --- |
| package manager | pnpm 10.26.1, from `packageManager` (no hash) and `pnpm-lock.yaml` (lockfileVersion 9.0). `pnpm-workspace.yaml` sets `minimumReleaseAge: 10080` (seven days, with `@modelcontextprotocol/conformance` excluded), `linkWorkspacePackages: deep`, four named catalogs, and `onlyBuiltDependencies` of `better-sqlite3` (12.8.0, a native module that `examples/shared` uses) and `esbuild` |
| workspaces | `packages/**/*` (except `packages/codemod/batch-test/**`), `common/**/*`, `examples`, `examples/*`, `examples/**/*` and `test/**/*`, from `pnpm-workspace.yaml`; 53 `package.json` files in all. The SDK is `packages/core-internal`, `core`, `client`, `server`, `server-legacy`, `codemod` and the middleware under `packages/middleware/` (`express`, `fastify`, `hono`, `node`) |
| test runner | vitest, catalog `^4.0.15` (the lockfile resolves 4.1.2). Each package's `vitest.config.js` re-exports `@modelcontextprotocol/vitest-config` (`common/vitest-config`: node environment, `test/**/*.test.ts`, `globals`, `vite-tsconfig-paths` 5.1.4), and each package's `tsconfig.json` maps its workspace imports to their `src/`, so the suite runs without a build. Each package's `test` script runs `vitest run`; there is no root `test` script, and CI runs `pnpm -r --filter '!@modelcontextprotocol/test-e2e' test`. The root `vitest.workspace.js` calls `defineWorkspace`, which vitest 4 no longer has. No coverage provider is in the lockfile. typescript 5.9.3, with `@typescript/native-preview` for `typecheck` |
| node | `engines.node` `>=20`; no `.nvmrc` or `.node-version`; CI tests on node 20, 22 and 24 |
| TypeScript files at the fixture commit | 615 |
