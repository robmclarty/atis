# Terraform fixture 1

An outside project's pull request in Terraform, step 86's fixture for the language producers,
reviewed at range 24's stop. It is not part of a blind reading, so this README and the truth name
the repo freely. Its ground truth is in [`truth.md`](./truth.md).

## The change

| | |
| --- | --- |
| repo | `braintrustdata/terraform-aws-braintrust-data-plane` (<https://github.com/braintrustdata/terraform-aws-braintrust-data-plane>), Apache-2.0 (the `LICENSE` file at the fixture commit is the Apache License 2.0 text with its copyright line left unfilled, `Copyright [yyyy] [name of copyright owner]`); GitHub's primary language for it is HCL (926,454 bytes, against 28,484 of Shell and 13,317 of Python) |
| pull request | [#405](https://github.com/braintrustdata/terraform-aws-braintrust-data-plane/pull/405) `Make Loop sandbox egress restricted-only and add the egress gateway`, opened 2026-09-29 by `alexr17` |
| base branch | `main` |
| fixture commit | `a6518ac715fd592ca61af65796a11dfffcf29028` `Preserve restricted connector state and scope sandbox DNS egress`: the commit a human review requesting changes was submitted against |
| merge base | `5985aa5d744978cf8ae5cd8f4272108f3da4f1b9` `INF-711 Harden Loop Runtime network design and Terraform integration (#397)` |
| size | 18 files, +707 −107 between the merge base and the fixture commit; 13 Terraform source files by the producer's rule (`.tf`; one of them, `moved_state.tf`, new), 3 test files (`tests/*.tftest.hcl`, one new), one test mock (`tests/mocks/aws/data.tfmock.hcl`, which the producer does not claim) and the root `README.md` |

The 13 source files are in seven module directories: the root (`main.tf`, `outputs.tf`,
`variables.tf`), the four examples' `main.tf` (`examples/braintrust-data-plane`,
`examples/braintrust-data-plane-sandbox`, `examples/braintrust-data-plane-external-eks-quarantine`
and `examples/cloudfront-logging`), `modules/loop-runtime-ecs` (`main.tf`, `variables.tf`) and
`modules/loop-runtime-sandbox-aws-microvm` (`main.tf`, `moved_state.tf`, `outputs.tf`,
`variables.tf`). The examples' change is one line each, dropping
`loop_runtime_sandbox_egress_mode`; the weight is in the sandbox module's `main.tf` (+217 −33).

The merge base is `git merge-base` of the fixture commit and `origin/main`, and agrees with the
compare API's `merge_base_commit`. The fixture commit is ten commits ahead of it, all by the
PR's author and all on the PR's branch; it is in the PR's final commit list of 16, so it is
reachable from `refs/pull/405/head`, which the clone fetches. The PR squash-merged as
`8ce5e25046931eb3e19b8eb3473cdb0d462512f6`, whose one parent is
`9c6648dffd5e1c37a5ade0efb55313a87498e7e9`, not the merge base: the branch merged `main` in three
times, all after the review, so the PR's final diff, 19 files +786 −108, is not the fixture
commit's.

## The ecosystem

| | |
| --- | --- |
| layout | a Terraform module, published for customers to call: a root module (9 files: `main.tf`, `variables.tf`, `outputs.tf`, `data.tf`, `versions.tf`, `secrets.tf`, `moved_state.tf`, `quarantine-privatelink.tf`, `remote_support.tf`), 19 child modules under `modules/` and 4 examples under `examples/`. 152 tracked `.tf` files in 24 directories, 18,683 lines of them; 214 tracked files in all |
| module edges | the root calls 17 of the child modules by `source = "./modules/<name>"` (`modules/vpc` twice); `modules/vpc-peering-accepter` and `modules/vpc-peering-requester` are called by nothing, for customers' own stacks. Three examples call the published module by git source (`github.com/braintrustdata/terraform-braintrust-data-plane`), and `examples/braintrust-data-plane-external-eks-quarantine/main.tf` calls the root locally with `source = "../../"` |
| providers | `required_version = ">= 1.10.0"`; `hashicorp/aws` `>= 6.23.0, < 7.0.0` at the root, in each module and in each example, plus `hashicorp/http` (in `modules/services` and `modules/loop-runtime-sandbox-aws-microvm`) and `hashicorp/random` (in `modules/services` and `modules/database`). No backend block, and one provider block, in `examples/braintrust-data-plane-external-eks-quarantine/provider.tf`: the repo's `.gitignore` excludes a root `terraform.tf` and `provider.tf` (the tree carries `terraform.tf_example` and `providers.tf_example`) and `.terraform.lock.hcl` |
| tests | 16 `tests/*.tftest.hcl` files for `terraform test` (58 `run` blocks, 56 of them `command = plan` and 2 `apply`), with `mock_provider "aws" { source = "./tests/mocks/aws" }` mocks in `tests/mocks/`. checkride's terraform pack has no test slot, so they are not run here |
| tflint | `.tflint.hcl` enables the bundled `terraform` ruleset at its `recommended` preset and the `aws` ruleset, `github.com/terraform-linters/tflint-ruleset-aws` pinned to 0.40.0, which needs `tflint --init` |
| tool pins | `mise.toml`: `tflint = "latest"`, `terraform = "1.10"`, `opentofu = "1.10"`, `pre-commit = "latest"`, `uv = "latest"`, and the tasks CI runs. No `.terraform-version` or `.opentofu-version` |
| CI | `.github/workflows/terraform-ci.yml` runs `jdx/mise-action`, then `mise run setup` (`pre-commit install`, `tflint --init`), `lint` (`terraform fmt -recursive`, `tflint --recursive`), `validate` (`terraform init -upgrade` and `terraform validate`, at the root and in `examples/braintrust-data-plane` with a `main_override.tf` pointing the module at `../../`), `validate-tofu` (the same with `tofu init -upgrade -test-directory=nope` and `tofu validate -no-tests`) and `test` (`terraform init -backend=false -upgrade`, a `uv run` script, `terraform test`) |
| scripts | 5 `.sh` files (`managed-byoc/` 2, `scripts/` 2, `modules/remote-support/bastion-user-data.sh`) and 2 extensionless scripts in `scripts/` |

## Generation

Step 86 generated `map.json` and `atis.svg` here on 2026-10-28 by the D58 worktree procedure,
adapted to Terraform: a full clone, a detached worktree at the fixture commit, the repo's own
install as its CI runs it (`tflint --init` and a `tofu init`), the shared checkride 0.19.1 from
outside the tree, a clean `checkride --all --skip security`, then atis over the worktree with
`--base` at the merge base. The whole checkride run took 4 seconds and atis 6 seconds. The tree
is historical and the harness current (D58): checkride is the latest, and the Terraform, OpenTofu
and tflint copies are the ones the commit's own `mise.toml` pins.

## The toolchain

| tool | version | how atis knows |
| --- | --- | --- |
| checkride | 0.19.1 | the shared copy at `/tmp/atis-languages/harness/node_modules/checkride`, run from the worktree root; the commit pins none and has no `package.json` |
| checkride summary schema | 1 | required by `readCheck` before anything under `.check/` is read |
| OpenTofu | 1.10.10 | the commit's `mise.toml` pins `opentofu = "1.10"`, which mise resolved to 1.10.10 (installed with `mise install opentofu@1.10`); checkride picks `tofu` as the CLI because that file pins OpenTofu, and records `pin_source` `mise`, `tool_version` 1.10.10 for `types` and `format` |
| Terraform | 1.10.5 | the commit's `mise.toml` pins `terraform = "1.10"`, resolved to 1.10.5 (installed with `mise install terraform@1.10`). checkride does not run it here; it ran only in a side check, below |
| tflint | 0.65.0 | the commit's `mise.toml` pins `tflint = "latest"`, which mise resolved to the installed 0.65.0; recorded as `tool_version` 0.65.0 |
| tflint-ruleset-aws | 0.40.0 | `.tflint.hcl`'s `plugin "aws"` block; fetched by `tflint --init` into a plugin directory outside the tree |
| tflint-ruleset-terraform | bundled | `.tflint.hcl`'s `plugin "terraform"` block, preset `recommended` |
| `hashicorp/aws`, `http`, `random` | 6.70.0, 3.6.3, 3.9.1 | what `tofu init -upgrade` resolved today from `registry.opentofu.org` within the commit's constraints, as CI's `-upgrade` does; the commit tracks no lock file |
| trivy | none | the pack's `security` slot; skipped (see below) |
| mise | 2026.10.4 | the machine's |
| node | 24.15.0 | the machine's; runs checkride |

checkride records each tool's version as the check's `tool_version` in `.check/summary.json`;
the three that ran (`types` and `format` through `tofu`, `lint` through `tflint`) match the
table.

## The commands

```sh
# 0. A full clone, not a blobless one. The PR squash-merged, so the fixture commit is fetched
#    from the PR's head ref.
git clone https://github.com/braintrustdata/terraform-aws-braintrust-data-plane.git \
  /tmp/atis-languages/clones/braintrustdata__terraform-aws-braintrust-data-plane
git -C /tmp/atis-languages/clones/braintrustdata__terraform-aws-braintrust-data-plane \
  fetch origin pull/405/head

# 1. A worktree at the fixture commit, named for the repo so meta.repo reads
#    `terraform-aws-braintrust-data-plane`.
git -C /tmp/atis-languages/clones/braintrustdata__terraform-aws-braintrust-data-plane worktree add \
  /tmp/atis-languages/work/terraform-1/terraform-aws-braintrust-data-plane \
  a6518ac715fd592ca61af65796a11dfffcf29028 --detach

# 2. The tree's own tools. Its mise.toml pins terraform 1.10, opentofu 1.10 and tflint latest;
#    tflint 0.65.0 was already installed, the other two were not. The run-time settings keep
#    installers off git hooks, trust the worktree's own mise.toml for this run only (mise
#    refuses an untrusted one, and checkride resolves these tools through it), stop mise
#    installing anything else it names, and keep tflint's plugin and the providers' cache
#    outside the tree.
mise install terraform@1.10 opentofu@1.10
export HUSKY=0 LEFTHOOK=0 SKIP_INSTALL_SIMPLE_GIT_HOOKS=1
export MISE_TRUSTED_CONFIG_PATHS=/private/tmp/atis-languages/work/terraform-1
export MISE_EXEC_AUTO_INSTALL=false MISE_NOT_FOUND_AUTO_INSTALL=false
export TFLINT_PLUGIN_DIR=/tmp/atis-languages/tools/terraform-1/tflint-plugins
export TF_PLUGIN_CACHE_DIR=/tmp/atis-languages/tools/terraform-1/plugin-cache
mkdir -p "$TFLINT_PLUGIN_DIR" "$TF_PLUGIN_CACHE_DIR"

# 3. The repo's own install, as its CI runs it: `mise run setup` runs `tflint --init`, and
#    `mise run validate-tofu` runs `tofu init -upgrade -test-directory=nope`. `-backend=false`
#    is what checkride's docs ask for; the root declares no backend, so it changes nothing.
#    The tree gitignores `.terraform.lock.hcl`, so this init is what writes it, and with it
#    the `types` slot has a root module to validate (see "Harness changes").
cd /tmp/atis-languages/work/terraform-1/terraform-aws-braintrust-data-plane
mise exec -- tflint --init
mise exec -- tofu init -backend=false -upgrade -test-directory=nope

# 4. The current harness (D58): the shared checkride 0.19.1, run from outside the tree. The
#    commit has no package.json and none is added, so checkride reads it as one Terraform
#    project at its root.
CHECKRIDE="node /tmp/atis-languages/harness/node_modules/checkride/dist/cli.js"

# 5. The .check/ atis reads for evidence, from a clean state. No --pins file: the tree's
#    mise.toml pins every tool the run uses. --all adds the opt-in format slot;
#    --skip security is D56.
rm -rf .check
$CHECKRIDE --all --skip security
cp .check/summary.json /tmp/atis-languages/work/terraform-1.summary.json

# 6. The map and the still render, from atis as built. --repo takes the resolved path, not the
#    /tmp symlink.
cd ~/Projects/atis/code/atis
node apps/atis/dist/cli.js \
  --repo "$(cd /tmp/atis-languages/work/terraform-1/terraform-aws-braintrust-data-plane && pwd -P)" \
  --base 5985aa5d744978cf8ae5cd8f4272108f3da4f1b9 \
  --out fixtures/terraform-1/map.json \
  --svg fixtures/terraform-1/atis.svg

# 7. The worktree is not kept; the clone is.
git -C /tmp/atis-languages/clones/braintrustdata__terraform-aws-braintrust-data-plane worktree remove --force \
  /tmp/atis-languages/work/terraform-1/terraform-aws-braintrust-data-plane
```

## Harness changes in the worktree

None to any tracked file: no `checkride.config.json`, no `--pins` file, no `package.json`, no
edit to a test or to `.tflint.hcl`. What the worktree gained is untracked, and discarded with it.

- `.terraform/` and `.terraform.lock.hcl`, written by step 3's `tofu init` (both gitignored by the
  repo). The tree commits no lock file and says so on purpose, and CI makes one the same way:
  every `validate` and `validate-tofu` run starts with `init -upgrade`. Without the lock file,
  checkride's `types` slot stands down with `no .terraform.lock.hcl marks a root module here`
  (`checkride doctor` showed that before the init). The init covers the root module only, which
  is the one directory checkride's implicit Terraform target validates; CI also runs its
  `validate` task in `examples/braintrust-data-plane` through a `main_override.tf`, which this
  run does not repeat. The lock file resolved `hashicorp/aws` to 6.70.0, `http` to 3.6.3 and
  `random` to 3.9.1.
- `.check/`, checkride's own output.
- Run-time settings, not files: `MISE_TRUSTED_CONFIG_PATHS` for the worktree (mise refuses an
  untrusted `mise.toml`, and the `mise` source is how checkride runs the tree's pinned tools, so
  nothing global was trusted), `MISE_EXEC_AUTO_INSTALL=false` and
  `MISE_NOT_FOUND_AUTO_INSTALL=false`, `TFLINT_PLUGIN_DIR` and `TF_PLUGIN_CACHE_DIR` pointing
  under `/tmp/atis-languages/tools/terraform-1/` so no plugin or provider lands in the home
  directory, and `HUSKY=0`, `LEFTHOOK=0` and `SKIP_INSTALL_SIMPLE_GIT_HOOKS=1` throughout. The
  repo's `.pre-commit-config.yaml` was never installed. One slip: the first
  `mise exec -- tflint --init` ran before those mise switches were set, and mise installed the
  `pre-commit` 4.7.0 the commit's `mise.toml` names, into its shared installs directory; nothing
  used it.
- No test was edited, skipped or deleted, and no timeout was raised.

## Skipped slots

Named per D56. 4 slots ran, of 9: checkride's terraform pack has `types`, `format`, `lint` and
`security`, and the repo pack adds `struct`, `docs`, `links`, `spell` and `prose`.

- `security`: skipped per D56 (`--skip security`): the trivy scan runs against today's checks, not
  the ones that existed when the PR was open. It would not have run anyway: the commit pins no
  trivy, and `checkride doctor` reported the slot unavailable (`no tool detected`) before the
  skip.
- `types`: ran and **stayed red**, with 45 `terraform validate` diagnostics, every one in a
  `tests/*.tftest.hcl` file (16 files; 27 `Unsupported argument`, 16 `Resource instance address
  with keys is not allowed`, 2 `Module instance address with keys is not allowed`). checkride
  runs `tofu validate -json`, because the commit's `mise.toml` pins OpenTofu, and OpenTofu 1.10.10
  does not read the Terraform syntax the tree's tests are written in, such as
  `mock_provider "aws" { source = "./tests/mocks/aws" }`. The repo's own CI avoids it in its
  `validate-tofu` task with `tofu validate -no-tests`; its `validate` task runs `terraform
  validate`, with the tests. As a side check, outside the fixture, Terraform 1.10.5 over a
  copy of the same tree after `terraform init -backend=false -upgrade` answers
  `{"valid": true, "error_count": 0, "warning_count": 0}`. The red belongs to the tree's tests and
  the CLI checkride chose, not to the PR's source, and is left as run.
- `format`: ran and passed (`tofu fmt -check -recursive -diff`, 0.96 s). The adapter is opt-in;
  `--all` turned it on.
- `lint`: ran and passed (`tflint --recursive --format=json` with the `aws` ruleset 0.40.0 over
  every directory, 3.3 s): `lint.json` is `{"issues":[],"errors":[]}`. The tree has no tflint
  findings at this commit, so the `lint` channel is read and empty.
- `links`: ran and passed (built in, 7 ms).
- `struct`, `docs`, `spell`, `prose`: checkride 0.19.1 skips these itself ("no tool detected for
  slot"); the repo has none of their detect files, and none was added. `typos` is on the
  machine's `PATH`, but nothing in the repo turns the slot on.
- No test, coverage or mutation slot exists for Terraform. The 16 `.tftest.hcl` files are the
  repo's tests and CI runs them with `terraform test`, but the pack has no adapter for it, so they
  were not run here, and no plan was run either (D176).

## What atis read

The cells are the language's modules. 27 cells: 26 `directory` cells and the one `package` cell
`package:.` that holds them all and has no files of its own. 24 of the directory cells are
Terraform modules, one per directory of `.tf` files: the root (`directory:.`, 9 files), the four
examples (`directory:examples/braintrust-data-plane`, `…-external-eks-quarantine`, `…-sandbox`,
`directory:examples/cloudfront-logging`) and the 19 modules (`directory:modules/api-ecs`,
`modules/brainstore-ec2`, `modules/database`, `modules/loop-runtime-ecs`,
`modules/loop-runtime-sandbox-aws-microvm`, `modules/services`, `modules/services-common`,
`modules/vpc` and the rest). The other two are shell cells that the shell producer made in the
same run, `directory:managed-byoc` and `directory:scripts` (2 `.sh` files each). The map holds 157
organelles: 152 `.tf` and 5 `.sh`, the fifth being `modules/remote-support/bastion-user-data.sh`,
which sits inside its Terraform module's cell.

The module edges are there: the root cell has a `fan_out` of 116 into the modules it calls, the
head graph's `weather.wiring` holds 221 import edges (tests' included), and one
`new-cross-module` edge is in the change (`main.tf` to
`modules/loop-runtime-sandbox-aws-microvm/moved_state.tf`, the new file). A module's interface
is its `var.<name>` and `output.<name>` blocks: `modules/api-ecs` has an `interface_size` of 103
(its 103 `variable` and `output` blocks), `modules/services` 73, `modules/loop-runtime-ecs` 54,
`modules/loop-runtime-sandbox-aws-microvm` 28. The dependency delta lists four outside packages
(`hashicorp/aws` declared by 24 files, `hashicorp/http` 2, `hashicorp/random` 2, and the git
source `github.com/braintrustdata/terraform-braintrust-data-plane` 3), and `deps_added` and
`deps_moved` are empty because the PR touched no provider constraint or module source.

Where the files went. Tests, 16 `tests/*.tftest.hcl` files, are the shore group `tests`, and the
two `tests/mocks/*/data.tfmock.hcl` files, which the producer does not claim, are in `other`.
The Terraform manifests: `.tflint.hcl` is `config`; `mise.toml` is `other`; `versions.tf` is a
terrain file in each module (it carries the provider dependencies); the lock file is untracked.
Also on the shore: `docs` 12 (11 `.md` and `LICENSE`), `prompts` 1 (`AGENTS.md`), `settings` 1
(`.gitignore`), `ci` 2 (the two workflows), `assets` 5 (`.png`), `examples` 1 (a `.tpl` under
`modules/brainstore-ec2/templates/`), `scripts` 2 (the extensionless
`scripts/check-loop-network-dependencies` and `scripts/delete-quarantine-lambdas`, which the
shell producer does not claim, D117) and `other` 16 (`.pre-commit-config.yaml`, `lock_versions`,
9 `.json` of which five are modules' `VERSIONS.json`, `mise.toml`, the two `.tf_example` files
and the two `.tfmock.hcl` files).

Entry points. `meta.instruments` records the rule, not the list:

```text
"entry_points": "manifests",
"entry_points_reason": "terraform: the root modules, which no module calls, are the entry points; shell: the executable scripts nothing sources are the entry points",
```

Read by hand from the `module` blocks, the modules no `module` block calls are the four examples
and `modules/vpc-peering-accepter` and `modules/vpc-peering-requester`; atis's reading adds the
root (see the second misreading below). 156 of the 157 organelles are reachable; the one that is
not is `modules/remote-support/bastion-user-data.sh`, which is mode 100644 and loaded by
`templatefile("${path.module}/bastion-user-data.sh", …)`, a reference atis reads as no edge.

The evidence, verbatim from `meta.instruments`, the whole of it:

```text
"mode": "check",
"structure": {
  "base": { "reason": "no local fallow at node_modules/.bin/fallow" },
  "head": { "reason": "no local fallow at node_modules/.bin/fallow" }
}
```

The `structure` reasons are the TypeScript structure pass looking for a fallow this tree has no
use for. There is no `muted`, `unread` or coverage line, and the reason is plain: those lines
come from a `test` check that ran, and Terraform's pack has none, so no coverage or test channel
is claimed, absent or a gap; nothing was muted either, as every check that ran has a parser in
atis. `weather.checks` has the nine slots as atis read them:

| slot | as atis read it |
| --- | --- |
| `types` | `ok: false`, not skipped; `scope` is the 16 `tests/*.tftest.hcl` files and `change` the 3 of them the PR touched. The diagnostics are on shore files, so no terrain organelle carries one |
| `format`, `links`, `lint` | `ok: true`, not skipped, scope global |
| `docs`, `prose`, `security`, `spell`, `struct` | `ok: true`, `skipped: true` |

`weather.evidence` is empty: `lint` has no issues and the `types` diagnostics sit on test files.

The notices atis ranked are six, all of kind `deleted-export`: `main.tf` (primary tier),
`modules/loop-runtime-ecs/main.tf` and `examples/braintrust-data-plane/main.tf` (secondary), and
`modules/loop-runtime-sandbox-aws-microvm/main.tf`, `examples/braintrust-data-plane-sandbox/main.tf`
and `variables.tf` (tertiary). **All six are false**, and two producer faults show in this map:

1. The `deleted-export` notices claim 62 names are "no longer exported" (44 `local.*` and
   `module.*` on `main.tf`, 4 resource addresses on `modules/loop-runtime-ecs/main.tf`, 1
   `module.braintrust-data-plane` on each of the two examples, 4 on the sandbox module's
   `main.tf`, 8 `local.*` on `variables.tf`). The PR removed none of them: every one is declared
   at the fixture commit and at the merge base (checked against the two trees with
   `/tmp/atis-languages/tools/terraform-1/verify-notices.cjs`, which matches each `locals` key and
   each `module`, `data` and `resource` header). The cause is in how the
   names travel. The Terraform producer gives an edge the names a file reads of a sibling
   (`local.x`, `module.x`, `data.t.n`, `type.name`), but a file's `exports` hold only `var.*` and
   `output.*` (`apps/atis/src/sources/terraform.ts`, `terraformScan`), and `liveConsumers` in
   `libs/core/src/notices.ts` counts every edge name that the head's `exports` lack as removed,
   for any changed file another file in its module reads. Any PR touching a Terraform file whose
   locals, module calls or resources a sibling reads would draw them, so the ranked notices say
   nothing true about this PR.
2. The call `source = "../../"` in
   `examples/braintrust-data-plane-external-eks-quarantine/main.tf` (line 14), the one local call
   of the root, makes no edge. `calledDir` joins the example's directory with `../../` and gets
   `./`, strips the slash to `.`, and looks for a module keyed `.`, while the root is keyed by
   the empty string; `../..` without the trailing slash would have matched. So `directory:.` has
   `fan_in` 0 and an `interface_size` of 0 though its `variables.tf` and `outputs.tf` declare 280
   `variable` and `output` blocks, the example cell has `fan_out` 0, and the root counts as a
   module no one calls (an entry point).

Not Terraform's own and not counted as faults: the two ghosts, `loop-runtime.tf` (deleted by the
merge base) and `tests/loop_sandbox_egress_gateway.tftest.hcl` (added and deleted inside the PR),
name files that exist at neither the base nor the head, the way older fixtures' ghosts do.

Whether the evidence reads as D176 settles: yes, for what this tree exercises. `terraform
validate`'s diagnostics came through checkride's parser into the `types` slot (red here, on shore
files), `lint` was read as a clean slot, the dependency delta carries the git module source and
the provider constraints, and no coverage, test or plan is read. Not exercised: a tflint finding,
since this tree has none, so no finding reached a terrain file. Nothing in the evidence is wrongly
muted. What does not read as settled is the notices: all six are the `deleted-export` misreading
above.
