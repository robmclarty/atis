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

## Generation

Step 17 generated `map.json` and `atis.svg` here by the D58 worktree procedure.

## The toolchain

The tree is historical; the harness is current (D58). checkride and fallow are installed into
the worktree at their latest versions, because atis only ever ships against current
checkride. The repo's own runner, coverage provider, lockfile and package manager stay as the
commit had them.

| tool | version | how atis knows |
| --- | --- | --- |
| checkride | 0.17.0 | installed into the worktree; the commit pinned none |
| fallow | 3.35.0 | installed into the worktree; the commit pinned none |
| checkride summary schema | 1 | required by `readCheck` before anything under `.check/` is read |
| node | 24.15.0 | the machine's; `engines.node` is `>=18`, which admits it, and CI at the commit used Node 20. The suites that ran passed on 24, so no older Node was installed |
| pnpm | 9.8.0 | `packageManager`; corepack fetched it |
| vitest | 2.1.9 | the lockfile's, unchanged |
| `@vitest/coverage-v8` | 2.1.9 | already a dev dependency at the repo's vitest version, unchanged |
| typescript | 5.5.4 | the lockfile's, unchanged |
| `@stryker-mutator/core` | 10.0.0 | added for the `mutation` slot |
| `@stryker-mutator/vitest-runner` | 10.0.0 | added for the `mutation` slot; its peer range (`vitest >=2.0.0`) admits 2.1.9 |

## The commands

```sh
# 0. The scratch clone was a blobless partial clone, and `git log --numstat` (which atis runs
#    over up to 5000 commits) failed on objects the promisor remote would not hand back. Make
#    it a full clone first, then fetch the fixture commit, its merge base and any object
#    still missing.
cd /tmp/atis-corpus/clones/discordjs__discord.js
rm -f .git/objects/info/commit-graph
git config --unset remote.origin.partialclonefilter
git config --unset remote.origin.promisor
git fetch --refetch --no-tags origin
for oid in 4d0e88d62f335633b27c1cce54b4ddc1d9e8e830 4476fadd19bcfdd3b9f13f2045ef513182cd6033; do
  git fetch --no-tags origin "$oid"
  for missing in $(git rev-list --objects --missing=print "$oid" | grep '^?' | tr -d '?'); do
    git fetch --no-tags origin "$missing"
  done
done

# 1. A worktree at the fixture commit, named for the repo so meta.repo reads `discord.js`.
git -C /tmp/atis-corpus/clones/discordjs__discord.js worktree add \
  /tmp/atis-corpus/work/corpus-4/discord.js \
  4d0e88d62f335633b27c1cce54b4ddc1d9e8e830 --detach

# 2. The repo's own package manager, honouring its lockfile (`--frozen-lockfile` works, as in
#    the repo's CI). HUSKY=0 keeps the `prepare` script from rewriting the clone's hooks;
#    the other variables stop corepack and turbo prompting or phoning home.
cd /tmp/atis-corpus/work/corpus-4/discord.js
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0 TURBO_TELEMETRY_DISABLED=1 DO_NOT_TRACK=1
HUSKY=0 pnpm install --frozen-lockfile

# 3. The build the repo's CI runs ahead of its tests (the packages import each other's
#    `dist/`). `--continue` builds everything that can be built.
HUSKY=0 pnpm exec turbo run build --concurrency=4 --continue

# 4. The current harness (D58), plus stryker for the mutation slot. The lockfile is edited
#    first and installed frozen, so no locked version moves: a plain `pnpm add` re-resolved
#    dtslint's `latest`-tagged dependencies and pulled a newer `@types/node` into the tree.
HUSKY=0 pnpm add -D -w --save-exact --lockfile-only --config.dedupe-peer-dependents=false \
  checkride@0.17.0 fallow@3.35.0 \
  @stryker-mutator/core@10.0.0 @stryker-mutator/vitest-runner@10.0.0
HUSKY=0 pnpm install --frozen-lockfile

# 5. Harness edits (see the next section for why).
cat > vitest.config.ts <<'CONFIG'
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['**/node_modules', '**/dist', '.idea', '.git', '.cache'],
    passWithNoTests: true,
    typecheck: {
      enabled: true,
      include: ['**/__tests__/types.test.ts'],
    },
    coverage: {
      enabled: true,
      all: true,
      reporter: ['json'],
      reportsDirectory: '.check/coverage',
      provider: 'v8',
      include: ['packages/{actions,brokers,builders,collection,formatters,next,proxy,rest,util,ws}/src'],
      exclude: [
        // All ts files that only contain types, due to ALL
        '**/*.{interface,type,d}.ts',
        '**/{interfaces,types}/*.ts',
        // All index files that *should* only contain exports from other files
        '**/index.{js,ts}',
        // All exports files that make subpackages available as submodules
        '**/exports/*.{js,ts}',
      ],
    },
  },
});
CONFIG
cat > vitest.workspace.ts <<'CONFIG'
import { defineWorkspace } from 'vitest/config';

// The packages whose tests run under vitest (`packages/voice` runs jest). Each one is the
// project the package's own `vitest run` would be: the root config, rooted at the package.
const packages = ['actions', 'brokers', 'builders', 'collection', 'formatters', 'next', 'proxy', 'util', 'ws'];

export default defineWorkspace([
  ...packages.map((name) => ({
    extends: './vitest.config.ts',
    test: { name, root: `./packages/${name}` },
  })),
  // `packages/rest` has a vitest config of its own.
  'packages/rest',
]);
CONFIG
cat > fallow.toml <<'CONFIG'
# Fixture harness: fallow's defaults. checkride is installed only to drive the run, so it
# is not an unused dependency.
ignoreDependencies = ["checkride"]
CONFIG
cat > stryker.config.json <<'CONFIG'
{
  "packageManager": "pnpm",
  "testRunner": "vitest",
  "plugins": ["@stryker-mutator/vitest-runner"],
  "reporters": ["clear-text", "json"],
  "jsonReporter": { "fileName": ".check/mutation.json" },
  "mutate": [
    "packages/builders/src/components/Components.ts",
    "packages/builders/src/components/checkbox/Assertions.ts",
    "packages/builders/src/components/checkbox/Checkbox.ts",
    "packages/builders/src/components/checkbox/CheckboxGroup.ts",
    "packages/builders/src/components/checkbox/CheckboxGroupOption.ts",
    "packages/builders/src/components/checkbox/RadioGroup.ts",
    "packages/builders/src/components/checkbox/RadioGroupOption.ts",
    "packages/builders/src/components/label/Assertions.ts",
    "packages/builders/src/components/label/Label.ts",
    "packages/builders/src/index.ts"
  ],
  "coverageAnalysis": "perTest",
  "tempDirName": ".stryker-tmp",
  "cleanTempDir": true
}
CONFIG
printf '.check\n' >> .prettierignore
# The repo formats with tabs (`useTabs` in `.prettierrc.json`); its own prettier re-indents the
# three files above to match.
node_modules/.bin/prettier --write vitest.config.ts vitest.workspace.ts stryker.config.json

# 6. The .check/ atis reads for evidence. Run the installed binary, never the repo's own
#    `test` script. Mutation is kept; it completed in about two minutes on the ten scoped
#    source files and wrote `.check/mutation.json`.
rm -rf .check .stryker-tmp
HUSKY=0 node_modules/.bin/checkride --all --skip security

# 7. The map and the still render. --repo takes the resolved path, not the /tmp symlink:
#    on macOS /tmp is /private/tmp, and istanbul's absolute coverage keys will not
#    relativise against the unresolved one, which silently empties patch_coverage.
#    atis runs the worktree's own node_modules/.bin/fallow for the entry points, and
#    meta.instruments.entry_points records whether it read them.
cd ~/Projects/atis/code/atis
node apps/atis/dist/cli.js \
  --repo "$(cd /tmp/atis-corpus/work/corpus-4/discord.js && pwd -P)" \
  --base 4476fadd19bcfdd3b9f13f2045ef513182cd6033 \
  --out fixtures/corpus-4/map.json \
  --svg fixtures/corpus-4/atis.svg

# 8. The worktree is not kept.
git -C /tmp/atis-corpus/clones/discordjs__discord.js worktree remove --force \
  /tmp/atis-corpus/work/corpus-4/discord.js
```

## Harness changes in the worktree

Every change lives in the worktree and is discarded with it; none of it reaches the reviewed
repo.

- `package.json` and `pnpm-lock.yaml` — four dev dependencies added at the workspace root
  (`checkride`, `fallow`, `@stryker-mutator/core`, `@stryker-mutator/vitest-runner`), all
  exact-pinned. The lockfile is edited with `--lockfile-only --config.dedupe-peer-dependents=false`
  and then installed frozen. No package it locked before is dropped or moved to another
  version; it gains the new packages' entries, and 24 snapshots that carried a root-level
  `@types/node` peer suffix lose it. A plain `pnpm add` moved ten locked versions
  (dtslint's `latest`-tagged `@definitelytyped` dependencies and their requirements), dropped 41
  packages and pulled `@types/node` 25.9.9 into the tree, which changed what the root
  type-check read, so it was discarded.
- `vitest.config.ts` — edited, three settings. `coverage.reporter` is `['json']` and
  `coverage.reportsDirectory` is `.check/coverage`, so the `test` slot's `--coverage` writes
  istanbul JSON to `.check/coverage/coverage-final.json`, where atis reads it; the v8 provider
  the repo already used is kept. `coverage.include` was `['src']`, which matches a package's own
  `src` when `vitest run` is started inside that package, but matches nothing when checkride
  starts vitest at the root, so it is widened to the `src` of the ten packages the workspace
  runs. The repo's `exclude` list, `all: true`, the typecheck settings and everything else are
  unchanged.
- `vitest.workspace.ts` — created at the root. The repo runs each package's tests from inside
  the package (`turbo run test`, each package's `vitest run`, which finds the root config by
  walking up); checkride's `test` slot runs one `vitest run` from the root. Left alone, that
  root run would pick up every test file in every package, including `packages/voice`, which
  runs jest. The workspace lists the nine packages that have no vitest config of their own as
  projects that extend the root config, rooted at the package (what the package's own
  `vitest run` would see), plus `packages/rest`, which has its own config. `packages/voice` is
  not listed: its tests are jest's.
- `fallow.toml` — created with fallow's defaults and no entry points, since fallow finds them
  itself, so `dead`, `dupes` and `health` run. One line, `ignoreDependencies = ["checkride"]`,
  keeps the harness's own install from showing up as an unused dev dependency. The two stryker
  packages did not show up as unused, so they are not listed.
- `stryker.config.json` — created; `mutate` is limited to the PR's ten changed non-test source
  files, and the JSON reporter writes `.check/mutation.json`, the file atis reads. The repo's own
  prettier formats it (tabs, to the repo's config), so the `format` slot does not report the
  harness's own file.
- `.prettierignore` — `.check` appended. Without it the `format` slot checked checkride's own
  `.check/*.json` artifacts, so it went red or green depending on which files existed when it
  ran, not on the repo's formatting.
- Run-time settings, not files: `HUSKY=0`, `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`,
  `TURBO_TELEMETRY_DISABLED=1` and `DO_NOT_TRACK=1`.

## Skipped slots

Named per D56. 13 slots ran, of 20.

- `security` — skipped per D56 (`--skip security`): the audit runs against today's advisory
  database, not the one that existed when the PR was open.
- `mutation` — **not** skipped. It completed in about two minutes on the ten scoped source
  files and wrote `.check/mutation.json`.
- `struct`, `docs`, `spell`, `prose`, `attw`, `publint` — checkride 0.17.0 skips these itself
  ("no tool detected for slot"); the repo has none of their detect files, and per the harness
  policy none was added.
- `lint` — ran, as the repo has it. The repo commits a `biome.json`, which is what checkride
  detects for the slot, but biome is installed nowhere in the tree (the repo's own `lint`
  scripts run prettier and eslint), so the slot reports the command not found. Per the policy
  that a slot the repo already has runs as it is, no `checkride.config.json` was added to name
  eslint instead.
- `test` — ran. The lockfile resolves `discord-api-types` 0.38.33, which does not export the
  component types the PR's source imports, and the repo's vitest config turns on typecheck
  mode, which reports those as unhandled source errors and fails the run. The 624 tests
  themselves ran with none failing, and the coverage file landed.
- `build`, `types` — ran, and report the same missing exports (`packages/builders` runs
  `tsc --noEmit` before `tsup`) and, for `types`, the root `tsc --build` reading the type
  declarations of dependencies. The install was left as the lockfile has it.
- `snippets` — ran, and reports failure on a repo with no tagged doc fences: an opted-in slot
  with nothing to check refuses to pass vacuously, and `--all` opts it in. It is left as run.
- `smoke`, `pack` — ran at the repo root, which is a private package with no `exports` or
  `main` to import, and whose dry-run tarball would hold the whole tree. They are left as run.
- `format` — ran, as the repo has it; its files outside the harness's own are the repo's.
