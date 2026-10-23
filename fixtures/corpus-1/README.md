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

## Generation

Step 17 generated `map.json` and `atis.svg` here by the D58 worktree procedure.

## The toolchain

The tree is historical; the harness is current (D58). checkride, fallow and stryker are
installed into the worktree at their latest versions, because atis only ever ships against
current checkride. The repo's own runner, transformer and lockfile stay as the commit had them.

| tool | version | how atis knows |
| --- | --- | --- |
| checkride | 0.17.0 | installed into the worktree; the commit pinned none |
| fallow | 3.35.0 | installed into the worktree; the commit pinned none |
| checkride summary schema | 1 | required by `readCheck` before anything under `.check/` is read |
| node | 24.15.0 | the machine's; `engines.node` asks for `>=22.7.5` and `.node-version` says `22.x.x`, and the suite ran without environmental trouble on 24 |
| npm | 11.12.1 | the machine's; `package-lock.json` (lockfileVersion 3) is honoured by `npm ci` |
| jest | 29.7.0 | the lockfile's, unchanged |
| ts-jest | 29.4.0 | the lockfile's, unchanged |
| `jest-fixed-jsdom` | 0.0.9 | the lockfile's, unchanged |
| `@stryker-mutator/core` | 10.0.0 | added for the `mutation` slot |
| `@stryker-mutator/jest-runner` | 10.0.0 | added for the `mutation` slot; its peer range admits jest 29.7.0 |

## The commands

```sh
# 0. The scratch clone was a blobless partial clone, and `git log --numstat` (which atis runs
#    over up to 5000 commits) failed on objects the promisor remote would not hand back. Make
#    it a full clone first, then fetch the fixture commit, the merge base and any object still
#    missing.
cd /tmp/atis-corpus/clones/modelcontextprotocol__inspector
rm -f .git/objects/info/commit-graph
git config --unset remote.origin.partialclonefilter
git config --unset remote.origin.promisor
git fetch --refetch --no-tags origin
git fetch --no-tags origin 5b9e69f36a191f24d3f33387f9cb7f8200752a25
git fetch --no-tags origin c7683b464a3b1bc0c230780a019c0d016120e0d0
for oid in $(git rev-list --objects --missing=print \
    5b9e69f36a191f24d3f33387f9cb7f8200752a25 c7683b464a3b1bc0c230780a019c0d016120e0d0 \
    | grep '^?' | tr -d '?'); do git fetch --no-tags origin "$oid"; done

# 1. A worktree at the fixture commit, named for the repo so meta.repo reads `inspector`.
git -C /tmp/atis-corpus/clones/modelcontextprotocol__inspector worktree add \
  /tmp/atis-corpus/work/corpus-1/inspector \
  5b9e69f36a191f24d3f33387f9cb7f8200752a25 --detach

# 2. The repo's own package manager, honouring its lockfile (`npm ci` is frozen and worked).
#    HUSKY=0 keeps the `prepare` script (`husky && npm run build`) from pointing the shared
#    clone's core.hooksPath at the worktree; the build half of `prepare` still runs.
cd /tmp/atis-corpus/work/corpus-1/inspector
HUSKY=0 npm ci

# 3. The current harness (D58), plus stryker for the mutation slot, at the root.
npm install -D --save-exact --ignore-scripts \
  checkride@0.17.0 fallow@3.35.0 \
  @stryker-mutator/core@10.0.0 @stryker-mutator/jest-runner@10.0.0

# 4. Harness edits (see the next section for why).
cat > jest.config.mjs <<'CONFIG'
import base from "./client/jest.config.cjs";

// The client's config is written to run from client/: its ts-jest `tsconfig` is a bare
// relative path that ts-jest resolves against the working directory. Run from the root, it
// is anchored to the client's own rootDir instead; nothing else of the config changes.
const [tsJest, tsJestOptions] = base.transform["^.+\\.tsx?$"];

export default {
  ...base,
  rootDir: "client",
  transform: {
    "^.+\\.tsx?$": [
      tsJest,
      { ...tsJestOptions, tsconfig: "<rootDir>/tsconfig.jest.json" },
    ],
  },
  collectCoverage: true,
  coverageReporters: ["json"],
  coverageDirectory: new URL("./.check/coverage", import.meta.url).pathname,
};
CONFIG
cat > fallow.toml <<'CONFIG'
# Fixture harness: fallow's defaults. checkride is installed only to drive the run, so it
# is not an unused dependency.
ignoreDependencies = ["checkride"]
CONFIG
cat > stryker.config.json <<'CONFIG'
{
  "packageManager": "npm",
  "testRunner": "jest",
  "plugins": ["@stryker-mutator/jest-runner"],
  "reporters": ["clear-text", "json"],
  "jsonReporter": { "fileName": ".check/mutation.json" },
  "mutate": [
    "cli/src/index.ts",
    "cli/src/client/prompts.ts",
    "cli/src/client/resources.ts",
    "cli/src/client/tools.ts",
    "client/src/App.tsx",
    "client/src/components/MetadataTab.tsx",
    "client/src/components/ToolsTab.tsx",
    "client/src/lib/hooks/useConnection.ts"
  ],
  "coverageAnalysis": "perTest",
  "tempDirName": ".stryker-tmp",
  "cleanTempDir": true
}
CONFIG
printf '\n.check\n' >> .prettierignore

# 5. The .check/ atis reads for evidence. Run the installed binary, never the repo's own
#    `test` script. Mutation is kept; it completed in about nine minutes on the eight scoped
#    source files, run on its own first and then inside the full run.
rm -rf .check
HUSKY=0 npx --no-install checkride --all --skip security

# 6. The map and the still render. --repo takes the resolved path, not the /tmp symlink:
#    on macOS /tmp is /private/tmp, and istanbul's absolute coverage keys will not
#    relativise against the unresolved one, which silently empties patch_coverage.
#    atis runs the worktree's own node_modules/.bin/fallow for the entry points, and
#    meta.instruments.entry_points records whether it read them.
cd ~/Projects/atis/code/atis
node apps/atis/dist/cli.js \
  --repo "$(cd /tmp/atis-corpus/work/corpus-1/inspector && pwd -P)" \
  --base c7683b464a3b1bc0c230780a019c0d016120e0d0 \
  --out fixtures/corpus-1/map.json \
  --svg fixtures/corpus-1/atis.svg

# 7. The worktree is not kept; the clone is.
git -C /tmp/atis-corpus/clones/modelcontextprotocol__inspector worktree remove --force \
  /tmp/atis-corpus/work/corpus-1/inspector
```

## Harness changes in the worktree

Every change lives in the worktree and is discarded with it; none of it reaches the reviewed
repo.

- `package.json` and `package-lock.json` — four dev dependencies added at the root
  (`checkride`, `fallow`, `@stryker-mutator/core`, `@stryker-mutator/jest-runner`), all
  exact-pinned. The lockfile keeps its version 3 format and gains 185 entries. Three
  transitive entries moved when npm de-duplicated against stryker's newer ranges:
  `@jridgewell/sourcemap-codec` 1.5.0 to 1.6.0, `@jridgewell/trace-mapping` 0.3.29 to 0.3.31
  and `qs` 6.14.0 to 6.15.1. Restoring the old three made `npm ci` refuse the lockfile, so
  the moved lockfile stands. jest, ts-jest, typescript, react and every other direct
  dependency stay at the versions the lockfile locked.
- `jest.config.mjs` — created at the root. The repo keeps its jest config in the `client`
  workspace (`client/jest.config.cjs`) and runs it from there; checkride's `test` slot
  detects jest from a root config and runs plain `jest` from the root. The file re-exports
  the client's own config, sets its `rootDir` to `client`, and adds the three coverage
  options: turn coverage on, `json` reporter, `coverageDirectory` `.check/coverage`, which
  writes `.check/coverage/coverage-final.json` where atis reads it. One line of the client's
  config is rewritten: ts-jest resolves the bare `tsconfig.jest.json` against the working
  directory, so from the root it looked for the file there and no suite could load; it is
  now `<rootDir>/tsconfig.jest.json`. It is `.mjs` so no TypeScript project has to include it. The
  `cli` workspace's tests are plain Node scripts, not jest, so this config does not reach
  them (they are not part of the `test` script the repo's CI runs either).
- `fallow.toml` — created with fallow's defaults and no entry points, since fallow finds
  them itself. One line, `ignoreDependencies = ["checkride"]`, keeps the harness's own
  install from showing up as an unused dev dependency. The stryker packages and fallow
  itself needed no entry.
- `stryker.config.json` — created; `mutate` is limited to the PR's eight changed non-test
  TypeScript source files (`git diff --name-only` between the merge base and the fixture
  commit, minus the two tests, `.gitignore` and the plain-JavaScript script), and the JSON
  reporter writes `.check/mutation.json`, the file atis reads. Stryker's jest runner picks up
  the root `jest.config.mjs` without a `jest` block.
- `.prettierignore` — `.check` appended, so the `format` slot does not check checkride's own
  `.check/*.json` artifacts.
- Run-time settings, not files: `HUSKY=0` at install time and on the checkride run, so no
  `prepare` script rewrites the shared clone's `core.hooksPath`; it stayed unset throughout.

## Skipped slots

Named per D56. 11 slots ran.

- `security` — skipped per D56 (`--skip security`): the audit runs against today's advisory
  database, not the one that existed when the PR was open. It is also `pnpm audit`, which
  checkride reports unavailable under npm.
- `mutation` — **not** skipped. It completed in about nine minutes, with the machine under
  load from a second run, and wrote `.check/mutation.json`.
- `types` — checkride 0.17.0 skips it ("no tool detected for slot"): the repo has no
  `tsconfig.json` at the root, only one in each workspace, and per the harness policy none
  was added.
- `lint` — checkride 0.17.0 skips it: the repo's ESLint config is in `client/` and checkride
  looks for one at the root; per the harness policy none was added.
- `struct`, `docs`, `spell`, `prose`, `publint`, `attw` — checkride 0.17.0 skips these
  itself ("no tool detected for slot"); the repo has none of their detect files, and per the
  harness policy none was added.
- `snippets` — ran: an opted-in slot with nothing to check, and `--all` opts it in.
- `build`, `pack`, `smoke` — ran as checkride runs them at the repo root; the repo's build
  script and manifest are what they read.
