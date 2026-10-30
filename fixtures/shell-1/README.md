# Shell fixture 1

An outside project's pull request in shell (bash), step 86's fixture for the language producers,
reviewed at range 24's stop. It is not part of a blind reading, so this README and the truth name
the repo freely. Its ground truth is in [`truth.md`](./truth.md).

## The change

| | |
| --- | --- |
| repo | `Bash-it/bash-it` (<https://github.com/Bash-it/bash-it>), MIT: `LICENSE` at the fixture commit opens `MIT License`, `Copyright (c) 2020-2021 Bash-it` |
| pull request | [#2366](https://github.com/Bash-it/bash-it/pull/2366) `command duration fix` |
| base branch | `master` |
| fixture commit | `9e88c2a345d84713e1f314dfd333674c299344d6` `Ignore last shellcheck error in vendor bats tests`: the commit a human review was submitted against |
| merge base | `0f04edce0ca93fbe66f1fe23c8d9b7a01e53f94c` `All themes cleaned up (#2360)` |
| size | 10 files, +249 −133; 3 shell scripts by the producer's rule (`.sh` and `.bash`), 4 bats test files, 3 other files |

The three shell scripts are `lib/command_duration.bash`,
`plugins/available/cmd-returned-notify.plugin.bash` and the vendored
`vendor/github.com/rcaloras/bash-preexec/bash-preexec.sh`. The four tests are
`test/lib/preexec.bats`, `test/plugins/cmd-returned-notify.plugin.bats` and, under the vendored
copy, `test/bash-preexec.bats` and `test/include-test.bats`. The other three are the vendored
copy's `README.md`, its `.travis.yml` (deleted) and its `.github/workflows/bats.yaml` (added).
Three source files is the bottom of the 3 to 30 range. The PR reworks the prompt's command
duration (`EPOCHREALTIME` read without a subshell, the decimal point made locale-proof) and
replaces the vendored `bash-preexec` (version 0.4.1 by its header) with upstream's 0.6.0.

The merge base is `git merge-base` of the fixture commit and `origin/master`, and agrees with the
compare API's `merge_base_commit`. The fixture commit is 18 commits ahead of it, all the PR
author's (`BarbUk`), and all on the PR's branch; the PR as merged has 37 commits, 12 files,
+410 −140, so the fixture commit is the middle of the PR, not its head. It is reachable from
`refs/pull/2366/head`. The PR squash-merged on 2026-02-13 as
`bc7e726f4fda220fb094665246c922a6513b6104`, whose one parent is
`f4443b147be00b0c198efcf7adbf546d761418d1` (`barbuk theme more tools (#2367)`), one commit past
the merge base.

## The ecosystem

| | |
| --- | --- |
| language | bash. At the fixture commit the tree tracks 483 entries: 329 `.bash`, 11 `.sh` and 23 `.bats` files, and four submodule gitlinks (`test_lib/bats-core`, `bats-support`, `bats-assert`, `bats-file`) |
| layout | no manifest of any kind. `lib/*.bash` are loaded by `bash_it.sh` in a glob loop, after `source`ing `lib/log.bash`; components sit one file each in `aliases/available/`, `completion/available/` and `plugins/available/`; each theme is a folder, `themes/<name>/<name>.theme.bash`; `vendor/github.com/<owner>/<repo>/` holds third-party scripts; `hooks/` holds three scripts `pre-commit` runs; `docs/` is a Sphinx project (`docs/conf.py`, `docs/requirements.txt`) |
| test runner | bats-core, pinned by `.gitmodules` to `tags/v1.11.1` as the `test_lib/bats-core` submodule, with `bats-support`, `bats-assert` and `bats-file`. `test/run` does `git submodule init && git submodule update`, then runs `test/{bash_it,completion,install,lib,plugins,themes}`, in parallel when GNU `parallel` is on `PATH`. CI's `bats-test` job runs it on ubuntu-24.04 and macos-14 |
| linters | `.pre-commit-config.yaml`: a `shellcheck` hook for `\.(bash)$`, a `shfmt` hook, whitespace and line-ending hooks, and local hooks `hooks/dot-sh.sh`, `hooks/dot-bash.sh` and `hooks/check-clean-files-txt.sh`; it excludes `docs/_build/` and `vendor/`. `lint_clean_files.sh` feeds it the paths in `clean_files.txt` (41 lines, directories allowed, among them `lib/` and `plugins/`). CI's `lint-differential` job also runs `redhat-plumbers-in-action/differential-shellcheck@v5`. There is no `.shellcheckrc`; shfmt takes its style from `.editorconfig` (tab indent for `**.*sh`, `test/run` and `**.bats`, `binary_next_line`, `switch_case_indent`, `space_redirects`) |
| CI's versions | the `lint` job installs shellcheck from the release named `stable` and shfmt with `go install mvdan.cc/sh/v3/cmd/shfmt@latest` under Go 1.21.0, and pre-commit under Python 3.8; nothing in the tree pins either tool (no `mise.toml`, `.tool-versions` or `go.mod`) |
| toolchain markers | none: no `package.json`, `go.mod`, `pyproject.toml`, `setup.py` or `*.tf`, so checkride's `unclaimed` has nothing to claim |
| shell files at the fixture commit | 340 by the producer's rule, plus 4 extensionless scripts with a shell shebang that checkride lints and the producer does not claim |

## Generation

Step 86 generated `map.json` and `atis.svg` here on 2026-10-28 by the D58 worktree procedure,
adapted to shell: a full clone, a worktree at the fixture commit, the current checkride (0.19.1)
run from outside the tree, one declared bash target, and the two tools the bash pack runs pinned
at their latest releases, as CI's `stable` and `@latest` name them. The checkride run took 13.2
seconds from a clean `.check/` and atis's run took 3.2 seconds. The tree needs no install, so
there is none; the `test_lib` submodules stayed uninitialised because checkride's bash pack has
no test slot.

## The toolchain

The tree is historical; the harness is current (D58). checkride runs from the shared copy outside
the tree. shellcheck and shfmt are pinned in a pins file outside the tree, because the tree pins
neither and CI asks for "stable" and "latest", which are the latest releases.

| tool | version | how atis knows |
| --- | --- | --- |
| checkride | 0.19.1 | the shared copy at `/tmp/atis-languages/harness/node_modules/checkride`; the commit has no `package.json` to pin it in |
| checkride summary schema | 1 | required by `readCheck` before anything under `.check/` is read |
| shellcheck | 0.11.0 | `--pins` file (`pin_source: "override"`, `tool_version: "0.11.0"` in `.check/summary.json`). CI's `stable` is the latest release, which is 0.11.0 (published 2025-08-04) |
| shfmt | 3.14.1 | `--pins` file (`pin_source: "override"`, `tool_version: "3.14.1"`). CI's `@latest` is the latest release, which is 3.14.1 (published 2026-09-06) |
| mise | 2026.10.4 | resolves both pins: `mise exec shellcheck@0.11.0 -- shellcheck`, `mise exec shfmt@3.14.1 -- shfmt` |
| node | 24.15.0 | the machine's; runs checkride |
| bats-core | not run | the tree pins v1.11.1 as a submodule; checkride's bash pack has no test slot |
| tree-sitter-bash | 0.25.1, with web-tree-sitter 0.27.1 | atis's own parser for the shell producer (apps/atis `package.json`); no shell runs and nothing of the tree executes |
| atis | `apps/atis/dist/cli.js` as built from ATIS `3b2bfdc` | `feat(cli): read each language's evidence as checkride writes it`; the build is newer than that commit |

checkride records each tool's version as the check's `tool_version` in `.check/summary.json`, and
both tools above match it.

## The commands

```sh
# 0. A full clone, not a blobless or shallow one. The PR squash-merged and its branch lived on a
#    fork, so the fixture commit is fetched from the PR's head ref.
git clone https://github.com/Bash-it/bash-it.git \
  /tmp/atis-languages/clones/Bash-it__bash-it
git -C /tmp/atis-languages/clones/Bash-it__bash-it fetch origin pull/2366/head

# 1. A worktree at the fixture commit, named for the repo so meta.repo reads `bash-it`.
git -C /tmp/atis-languages/clones/Bash-it__bash-it worktree add \
  /tmp/atis-languages/work/shell-1/bash-it \
  9e88c2a345d84713e1f314dfd333674c299344d6 --detach

# 2. Keep any installer off git hooks.
export HUSKY=0 LEFTHOOK=0 SKIP_INSTALL_SIMPLE_GIT_HOOKS=1

# 3. The repo's own install: none. The tree has no manifest, and the `test_lib` submodules that
#    CI's `test/run` initialises are left alone, since bats is not run (see "Skipped slots").

# 4. The two tools the bash pack runs, as a pins file outside the tree (D58). It changes which
#    copy runs, never which checks run. Both versions are installed through mise already.
mkdir -p /tmp/atis-languages/tools/shell-1
cat > /tmp/atis-languages/tools/shell-1/pins.toml <<'EOF'
# Fixture harness (shell-1): the copies of the two bash-pack tools that run. Bash-it's CI
# installs shellcheck as "stable" (the latest release) and shfmt with `go install ...@latest`,
# and nothing in the tree pins either, so each takes its latest release.
[tools]
shellcheck = "0.11.0"
shfmt = "3.14.1"
EOF

# 5. The harness edit (see the next section for why): the bash pack has no root marker, so a
#    bash target must be declared, and neither tool has a config file in the tree, so the
#    target names both adapters.
cd /tmp/atis-languages/work/shell-1/bash-it
cat > checkride.config.json <<'EOF'
{
  "targets": {
    "shell": {
      "lang": "bash",
      "root": ".",
      "checks": { "lint": "shellcheck", "format": "shfmt" }
    }
  }
}
EOF
node /tmp/atis-languages/harness/node_modules/checkride/dist/cli.js doctor \
  --pins /tmp/atis-languages/tools/shell-1/pins.toml

# 6. The .check/ atis reads for evidence, from a clean state. `--skip security` is refused
#    here (exit 2, "unknown token 'security' in --skip"), since a bash target has no security
#    slot, so the run is `--all` alone. It took 13.2 seconds and exits 1 (see "Skipped slots").
rm -rf .check
node /tmp/atis-languages/harness/node_modules/checkride/dist/cli.js --all \
  --pins /tmp/atis-languages/tools/shell-1/pins.toml
cp .check/summary.json /tmp/atis-languages/work/shell-1.summary.json

# 7. The map and the still render, from atis's current build. --repo takes the resolved path,
#    not the /tmp symlink: on macOS /tmp is /private/tmp.
cd ~/Projects/atis/code/atis
node apps/atis/dist/cli.js \
  --repo "$(cd /tmp/atis-languages/work/shell-1/bash-it && pwd -P)" \
  --base 0f04edce0ca93fbe66f1fe23c8d9b7a01e53f94c \
  --out fixtures/shell-1/map.json \
  --svg fixtures/shell-1/atis.svg

# 8. Inspect the map.
node /tmp/atis-languages/tools/summarize.cjs fixtures/shell-1/map.json --cells

# 9. The worktree is not kept; the clone is.
git -C /tmp/atis-languages/clones/Bash-it__bash-it worktree remove --force \
  /tmp/atis-languages/work/shell-1/bash-it
```

## Harness changes in the worktree

Every change lives in the worktree and is discarded with it; none of it reaches the reviewed
repo.

- `checkride.config.json`: created, one target, `shell`, `"lang": "bash"`, `"root": "."`. The
  bash pack has no root marker, so without a declared target checkride treats the repo as ts and
  every slot stands down. The target's `checks` name `shellcheck` for `lint` and `shfmt` for
  `format`: the tree has no `.shellcheckrc` and no repo pin (`mise.toml`) for either, so naming
  the adapter is what turns the slots on. shfmt is in because the repo uses it
  (the pre-commit `shfmt` hook, CI's `go install ...@latest`, the style in `.editorconfig`). The
  target keeps the pack's default file list (every `.sh` and `.bash` file, and each
  extensionless file with a shell shebang) with no `include` or `exclude`, so the vendored
  scripts, which the PR changes, are checked too, although the repo's own pre-commit excludes
  `vendor/`. Declaring a target also brings the repo pack's checks and `unclaimed` into the run.
- Run-time settings, not files: `--pins /tmp/atis-languages/tools/shell-1/pins.toml` (outside the
  tree), and `HUSKY=0`, `LEFTHOOK=0` and `SKIP_INSTALL_SIMPLE_GIT_HOOKS=1` throughout.
- No test was edited, skipped or deleted, no timeout was raised, and the run left only `.check/`
  and `checkride.config.json` untracked in the worktree (`git status`).

## Skipped slots

Named per D56. 4 checks ran, of the 8 the run listed (`checks_run` is 4 in `.check/summary.json`;
the bash pack has two slots and the repo pack six).

- `security`: not a slot of the bash pack, so there is nothing to skip. `--skip security` is
  refused by checkride 0.19.1 as an unknown token, and the run omitted the flag. D56's reason
  (an audit against today's advisories is the calendar's weather) has nothing to apply to.
- `test`: the bash pack has no test slot, so the 23 bats tests (`test/**/*.bats`, three under
  `vendor/`) are **not run** by checkride, and no coverage or test-result file exists for any of
  them. The `test_lib` submodules that `test/run` initialises stayed uninitialised. atis reads
  the `.bats` files as tests and stitches them by their `load` and `source` lines, but takes no
  result from them.
- `struct`, `docs`, `spell`, `prose`: checkride skips these itself ("no tool detected for slot");
  the tree has none of their detect files (`sgconfig.yml`, a `.markdownlint-cli2.*` or
  `.rumdl.toml`, a cspell config or `_typos.toml`, `.vale.ini`), and per the harness policy none
  was added. `typos` is on `PATH` but nothing in the repo turns the slot on.
- `unclaimed`: ran and passed ("every marker sits in a target"): the tree has no toolchain
  markers.
- `shell:lint`: ran and **stayed red** on the tree's own code: shellcheck 0.11.0 reports 79
  findings (38 info, 36 warning, 5 style, no error) in 12 files, none of them in the PR's three
  scripts. 71 are in five vendored files: `vendor/github.com/erichs/composure/composure.sh` (30),
  `vendor/github.com/erichs/composure/c_extras.sh` (27),
  `vendor/github.com/gaelicWizard/bash-progcomp/defaults.completion.bash` (9),
  `vendor/github.com/vigo/apm-bash-completion/apm` (3, an extensionless script) and
  `vendor/github.com/erichs/composure/test/runshellcheck.sh` (2). The other 8 are one SC1091
  "not following" note each in `aliases/available/git-omz.aliases.bash`,
  `completion/available/django.completion.bash`, `jboss5.completion.bash`,
  `jboss7.completion.bash`, `yarn.completion.bash` and
  `themes/liquidprompt/liquidprompt.theme.bash`, and two SC2128 warnings at lines 53 and 55 of `lib/preexec.bash`, a file the PR does not change
  but which sources the PR's `bash-preexec.sh`. The most common codes are SC2086 (29), SC2155
  (24) and SC1091 (6). It belongs to the tree.
- `shell:format`: ran and **stayed red**: shfmt 3.14.1 `-d` prints diffs for 7 of the 344 files
  it was handed: the PR's own `vendor/github.com/rcaloras/bash-preexec/bash-preexec.sh` (upstream's
  style, in a folder the repo's pre-commit excludes), five other vendored scripts (`c_extras.sh`,
  `composure.sh`, `runshellcheck.sh`, `defaults.completion.bash` and `apm`) and
  `themes/liquidprompt/liquidprompt.theme.bash`. It belongs to the tree.
- `links`: ran and **stayed red**: one broken relative link, `docs/README.md` line 3,
  `../../../workflows/CI/badge.svg?event=push` (a GitHub badge URL written relative to the web
  page, resolved on disk as `../../workflows/CI/badge.svg?event=push`). It belongs to the tree.
- `mutation`: JavaScript only; not attempted.

## What atis read

atis ran in `check` mode (`meta.instruments.mode`) against the worktree's `.check/` and read the
shell as terrain by D117.

**Cells.** 102: 101 directory cells and 1 package cell. The package cell, `package:.`, is the
shell producer's one root member; it holds no organelles of its own and is the parent of every
directory cell. The directory cells are the scripts' folders, as the producer intends:
`aliases/available` (50 files), `completion/available` (88), `plugins/available` (81), `lib`
(11), the root `.` (4: `bash_it.sh`, `install.sh`, `lint_clean_files.sh`, `uninstall.sh`),
`hooks` (3), 84 cells under `themes/` (the `themes` folder itself and 83 theme folders, 91 files,
five of them holding two), four under `vendor/` (`.../erichs/composure`,
`.../erichs/composure/test`, `.../gaelicWizard/bash-progcomp`, `.../rcaloras/bash-preexec`), and
`custom`, `docs`, `scripts` and `template` with one file each. The PR's three scripts sit in
`directory:lib`, `directory:plugins/available` and
`directory:vendor/github.com/rcaloras/bash-preexec`. 87 of the 101 directory cells hold a single
organelle, most of them single-theme folders. There are 341 organelles in all (329 `.bash`, 11
`.sh`, 1 `.py`) and 20,811 lines.

**The cells are the language's modules**, with two things to name. First, `docs/conf.py`, the
Sphinx configuration, is read by the Python producer as an organelle of its own cell,
`directory:docs`; it is not one of the repo's shell modules, and there is no `*.config.*`-style
rule that would put a Python config file on the shore. It is the only Python file in the tree,
and it also puts "python: pyproject.toml scripts and `__main__` name the entry points" in the
first half of `meta.instruments.entry_points_reason`, though the tree has no `pyproject.toml`.
Second, `test/test_helper.bash` and the three `.bash` files under `test/fixtures/` are terrain
(three cells: `test`, `test/fixtures/bash_it/aliases/available` and
`test/fixtures/bash_it/plugins/available`), because the producer's tests are `*.bats` files alone
(D117).

**The shore.** The 23 `.bats` files are the `tests` group, all of them. The other groups hold
what no shell rule claims: `docs` 64, `other` 21, `data` 12, `settings` 8, `ci` 6, `scripts` 3
(`.keep` files) and `prompts` 1. Extensionless scripts are not claimed (D117) and stay on the
shore: `test/run` and `test/fixtures/svn/{broken,working}/svn` (all with a bash shebang) are in
`data`; `vendor/github.com/vigo/apm-bash-completion/apm` (bash shebang) and four vendored
completion scripts with no shebang (`django_bash_completion`, `yarn`, `jboss5` and `jboss7`) are
in `other`. checkride lints the four with a shebang and atis does not claim them, so
`apm`'s 3 findings are filed against a shore file. The tree has no language manifest; its
`.gitmodules`, `.pre-commit-config.yaml`, `clean_files.txt` and `.readthedocs.yml` are in
`other` too.

**Entry points.** Seven, `meta.instruments.entry_points` being `manifests`: the executable
scripts nothing sources, `hooks/check-clean-files-txt.sh`, `hooks/dot-bash.sh`,
`hooks/dot-sh.sh`, `install.sh`, `lint_clean_files.sh`, `uninstall.sh` and
`vendor/github.com/erichs/composure/test/runshellcheck.sh`, which are the band 0 organelles.
`bash_it.sh` is executable too, but the bats files `load` it, so it is not one.

**Edges.** `weather.wiring` holds eight edges around the change: `lib/preexec.bash` sources
`vendor/github.com/rcaloras/bash-preexec/bash-preexec.sh` (a path spelled `${BASH_IT?}/vendor/...`,
resolved by its end), and seven more run from the four changed `.bats` files to the scripts they
load, among them `test/test_helper.bash` and the PR's `bash-preexec.sh`,
`plugins/available/cmd-returned-notify.plugin.bash` and `lib/preexec.bash`. The PR's
`lib/command_duration.bash` and the plugin have no edge from another script: `bash_it.sh` loads
`lib/*.bash` in a glob loop, and plugins are sourced from an `enabled/` folder that exists only on
a user's machine (`scripts/reloader.bash`), which no reading of the files can resolve.
`weather.reach` therefore holds the three changed scripts and one more file,
`lib/preexec.bash`, one hop out.

**Evidence.** `meta.instruments`, verbatim:

```json
"instruments": {
  "mode": "check",
  "entry_points": "manifests",
  "entry_points_reason": "python: pyproject.toml scripts and __main__ name the entry points; shell: the executable scripts nothing sources are the entry points",
  "structure": {
    "base": { "reason": "no local fallow at node_modules/.bin/fallow" },
    "head": { "reason": "no local fallow at node_modules/.bin/fallow" }
  }
}
```

There is no `muted` or `unread` key, and no coverage or test reason, anywhere in `meta`. D176 says
these languages' files have no coverage channel and `meta.instruments` says why; for this tree it
does not, because atis writes those reasons only for a `test` check that ran (`unwritten` in
`apps/atis/src/sources/check.ts`) and the bash pack has no test check. The absence shows instead
as `weather.evidence` being `{}` (the TypeScript fixtures carry `patch_coverage`, `unmeasured`,
`mutants` and `stitches` there), with no `unmeasured` list, so no file reads as a coverage gap.
The `structure` reason is fallow's, which is JavaScript's analyzer and has no bearing on shell; a
Go, Python or Terraform map carries the same line.

`weather.checks` is `category: VFR` with `checks_run: 4`, and its slots read as the run was:
`lint` red with a `scope` of 12 files, the ones shellcheck's JSON names, and an empty `change`
list, because none of the 79 findings is in a changed file; `format` and `links` red with scope
`global`; `unclaimed` green; and `docs`, `prose`, `spell` and `struct` skipped. The shfmt failure
is read as the slot's verdict alone, with no per-file scope.

**Notices**, as ranked:

1. `large-hot-change` on `vendor/github.com/rcaloras/bash-preexec/bash-preexec.sh` (primary,
   weight 40.176): "105 lines changed in a file with churn 3.786 and a bug-fix rate of 0",
   reaching 2 cells.
2. `other-group` on `other` (secondary, weight 2): "21 files no shore rule claims: .TXT, .ackrc,
   .bash_it, .gitmodules, .python, .txt, .yaml, .yml, .zsh, AUTHORS, Makefile, apm,
   django_bash_completion, jboss5, jboss7, yarn".

There is no `interface-change` notice: the one function the PR renames, `_shell_duration_en` to
`_command_duration_current_time` in `lib/command_duration.bash`, is in a script nothing sources,
and a function counts as an export only in a sourced script. `bash-preexec.sh`, which is sourced,
gains and loses no function. Nor is there an
`uncovered-high-reach` notice, since the language has no coverage channel to be uncovered in.

**Whether the evidence reads as D176 settles.** The findings are shellcheck's, read through
checkride's own parser and filed by path in the `lint` slot, as D176 says. The tree-sitter parse
read every script, the cells are the language's modules, the tests are the `.bats` files, and no
coverage channel exists. The two things that do not match what the contract promises are the
absence of a coverage reason in `meta.instruments` and `docs/conf.py` standing as a Python cell
in a shell repo. Both are recorded here rather than worked around.
