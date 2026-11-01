# atis's language producers

A producer is how atis reads one language. It takes the files of a commit that it claims and
writes what it found into a `Scan`: each file's kind, size and exported names, the edges between
files, the packages they belong to, and where their entry points are. Core builds the whole map
from the merged scans and never learns a language's rules, so another language is one more
producer and never a change to core (D114 (producers-compose)).

This page is the contract a producer fills: the interface it implements, the `Scan` it writes,
what core does with each part, the five producers atis ships as worked examples, and the evidence
each language's checkride pack gives atis (D176 (other-language-evidence)).

## The interface

A producer is a value of type `Producer`, declared in `apps/atis/src/sources/producers.ts`:

```ts
type Producer = {
  readonly id: string;
  readonly extensions: readonly string[];
  readonly unavailable: () => string | undefined;
  readonly read: (input: ProducerInput) => Produced;
};
```

- `id` is the name `atis.config.json` switches it off by (`{ "producers": { "go": false } }`),
  and the name `meta.instruments.unread` gives it when it reads nothing.
- `extensions` are the endings it claims, each with its dot (`.go`, `.tftest.hcl`).
- `unavailable` says why it cannot run here, a missing toolchain, or nothing when it can.
- `read` reads the files it claimed.

What `read` is handed, and what it returns:

```ts
type ProducerInput = {
  readonly tree: Tree;
  readonly files: readonly string[];
  readonly prior?: Prior | undefined;
  readonly entryPoints: () => EntryPoints;
};

type Produced = {
  readonly scan: Scan;
  readonly parsed: ParsedFiles;
  readonly entryPoints?: EntryPoints;
  readonly unread?: string;
};
```

- `tree` is the commit: every tracked file in path order, every directory, `read(path)` for a
  file's text, `executable(path)` for its mode, and an optional `want(paths)` that draws many
  files out of git at once before they are read. A commit is read from an extraction or from
  git's own objects (D172 (cached-layout-reuse)), and a producer cannot tell which.
- `files` are the tree's files this producer claimed, in path order.
- `prior` is what an earlier read of an earlier commit read from each file, with the paths the
  diff since then touched. A producer may reuse what it read of an untouched file and read only
  the rest (D136 (first-frame-clock)). Only the TypeScript producer does today.
- `entryPoints` asks the reviewed repo's own fallow for its entry points (D22 (local-fallow)).
  It is a function, so a producer that does not want them never pays for them.
- `scan` is the producer's own scan, of its own files only.
- `parsed` is whatever it wants handed back as `prior` next time; `{}` when it reuses nothing.
- `unread` says why it left some of its files unread after all, as when its toolchain refused a
  module.

### How producers run together

`PRODUCERS` lists every producer in the order a file's extension is offered to them:
TypeScript, Go, Python, Terraform, shell. A file belongs to the first producer that claims it.
Every producer whose files the commit tracks runs; one switched off, or one whose `unavailable`
gives a reason, reads nothing, and its reason lands in `meta.instruments.unread`. Its files stay
wherever the shore table puts them, so nothing reads as calm that was never read (C2
(never-fake)).

`mergeScans` then merges the scans into one: every tracked path in path order, each file as the
producer that read it gave it and every other path as `other`; every producer's edges, sorted;
the members in producer order; and one entry-point lookup. Edges never cross languages in this
build.

Three rules hold for every producer:

- It never runs the reviewed code and never reaches the network. The Go producer runs `go list`
  under `GOPROXY=off` and `GOTOOLCHAIN=local`, and the Python helper runs under `-I -S` from a
  directory outside the tree (D139 (inert-helpers)).
- It keeps its parsing pure, so the parsing is tested from strings or captured output, with a
  thin runner around it (D30 (pure-parsers)).
- What it ships earns its place: a parser atis carries, or a toolchain the reviewed repo already
  has (C9 (deps-earn-their-place)).

## The scan

`Scan` is declared in core, in `libs/core/src/map.ts`, because core owns the contract and the
reader conforms to it (C1 (core-is-pure)). The CLI's own copy, in
`apps/atis/src/sources/scan.ts`, is the same shape, with the fields core reads as optional
always written.

```ts
type Scan = {
  readonly files: readonly ScannedFile[];
  readonly edges: readonly ScannedEdge[];
  readonly members: readonly ScannedMember[];
  readonly entry_points: EntryPointLookup;
  readonly unread?: readonly UnreadProducer[];
};
```

**How it is versioned.** The scan carries no version field of its own. It is a type core
declares, so it moves with core, and every producer is checked against it when atis builds.
What a scan feeds is versioned in two places. The terrain atis caches for a base is keyed by a
hash of atis's own code, core's included, so a changed producer or a changed `Scan` misses the
cache by itself and the commit is read again (D137 (cache-key)). The map built from the scan
carries `meta.schema_version`, 1 today. A producer outside this repository would have no
version to declare against; the five here are modules of atis, built with it.

### Files

One entry per tracked file of the producer's own:

| field | what it holds |
| --- | --- |
| `path` | repo-relative, slash-separated |
| `loc` | the non-blank lines the producer read |
| `kind` | `source`, `test` or `other`, as the language's own rules say (D4 (tests-not-terrain)) |
| `barrel` | `true` on the file its directory is entered through, where the language has one: `index.ts`, `__init__.py` |
| `exports` | the names it exports, sorted |
| `shapes` | beside each exported name, its declared shape as a string, or `null` where it cannot be compared (D76 (interface-shape)) |
| `inferred` | the exported names whose type only the checker can print (D118 (inferred-shapes)); `[]` for every language but TypeScript |
| `code` | the line spans of each statement that is code, which is what a coverage report measures (D141 (unmeasured-lines)) |
| `packages` | the outside packages it imports, by name and sorted, never a workspace member or a standard library (D170 (planet-far-field)) |
| `functions` | each named function, with the line it starts on and how many lines it spans (D102 (file-and-diff-levels)) |

A `null` shape is the honest answer for a name nothing declares a type for: core reads it as
uncompared, never as unchanged (C2 (never-fake)).

### Edges

```ts
type ScannedEdge = {
  readonly from: string;
  readonly to: string;
  readonly names: readonly string[];
  readonly line: number;
  readonly reexports?: readonly PassedName[];
};
```

`from` takes `names` out of `to`, at `line` of `from`. Both ends are tracked files of the same
language. A whole-module import takes `*`, as a namespace import does. An edge that passes names
on (`export … from`, `export *`, a Python `__init__.py` importing a public name) lists each one
in `reexports` as `{ name, as }`, the name it takes and the name it gives (D75
(public-surface-width)).

### Members

```ts
type ScannedMember = {
  readonly name: string;
  readonly dir: string;
  readonly entry: readonly string[];
  readonly published: boolean;
  readonly surface: readonly string[];
};
```

A member is a package of the repository, as the language defines one: a workspace member, a Go
module, a Python project, or the repository itself (D43 (scan-roots)). `entry` lists its entry
points, which are where depth is measured from. `published` and `surface` say whether it publishes
names to outside the repository and through which files (D75 (public-surface-width)); only the
TypeScript producer reads a manifest that says so, and every other producer writes `false` and
`[]`.

### The entry-point lookup

`entry_points` says how the entry points were found: `{ source: 'fallow' }` when the reviewed
repo's fallow named them, or `{ source: 'manifests', reason }` when the language's own manifests
had to alone, and why. The merged scan's lookup is one producer's own when one ran, `fallow`
only when every producer's was, and otherwise `manifests` with each producer's reason under its
id. It lands in `meta.instruments.entry_points`, so a reader of the map knows how deep the depth
bands go and on what.

`unread` is the merge's, never a producer's: each producer that read nothing, and why.

## What core does with it

Each part feeds one thing, so a producer that fills a part well gives the map that much:

- `kind` decides what is terrain. A `source` file is an organelle unless the shore's `config` or
  `build` row takes it; a `test` is evidence, set apart in the shore's `tests` group and drawn
  as stitches; `other` is shore.
- `barrel` decides the cells, by checkride's convention inside a package's `src/`: the barrel of
  `src/` is the package's, a file directly in `src/` is a cell of its own, `src/<name>/` with a
  barrel is a folder cell, and so is each directory inside it with a barrel of its own (D45
  (nested-cells), D187 (nested-barrel-cells)). Every other file falls back to its directory's
  cell. A language with no barrels gets directory cells, which is right for Go's packages and
  Terraform's modules.
- `edges` give depth, reach, the wiring, the interface files a cell is entered through, and the
  stitches from tests to the files they import.
- `members` and their `entry` give the depth bands; a file no entry point reaches sits in the
  deepest, unreachable.
- `exports` and `shapes`, compared across the base and head scans, give the interface notices: a
  name removed or reshaped, added, or uncompared (D81 (interface-move-kinds)).
- `code` lets patch coverage count only changed lines that are code.
- `packages` give the outside packages the terrain uses, with their health.
- `functions` give the world's file level, where a file opens into its functions (D102
  (file-and-diff-levels)).

## The five producers

Each is a module in `apps/atis/src/sources/` and one entry in `PRODUCERS`, and each has a
reviewed outside pull request rendered as a fixture (D59 (outside-fixtures)).

### TypeScript, reading JavaScript too

`imports.ts`, id `typescript`, D114 (producers-compose) and D184 (javascript-terrain). Fixture:
`fixtures/javascript-1/` (svelte).

- **Claims** `.ts`, `.tsx`, `.mts`, `.cts`, and JavaScript's `.js`, `.jsx`, `.mjs`, `.cjs`.
- **Kind**: a test by its name (`.test.` or `.spec.`) or its folder (`__tests__/`, `test/` or
  `tests/` at any depth, D189 (tests-folder-is-tests)); otherwise source.
- **Barrel**: `index.ts` or `index.tsx`, or `index.js` or `index.jsx` where the directory has no
  TypeScript one.
- **Edges**: every static import, `export … from` and literal `import()`, resolved with the
  compiler's NodeNext resolution, so `./foo.js` lands on `foo.ts`; workspace packages resolve by
  name through `pnpm-workspace.yaml` or the root manifest's `workspaces`. In JavaScript, a
  `require()` with a literal specifier is an edge too. Nothing resolves through `node_modules`.
- **Exports and shapes**: the file's emitted declarations, printed, so a body-only edit moves
  nothing. A name whose type the compiler would infer is `null` and listed in `inferred`. Every
  JavaScript name is `null`, since JavaScript declares no types, so its interface notices weigh
  names added and removed, never reshaped. `module.exports` and `exports.<name>` give a CommonJS
  file its names.
- **Members**: each workspace member from its `package.json`, its entries from the manifest's
  fields and from fallow, and whether it publishes (not `private`, or carrying `publishConfig`)
  through `exports`, `main`, `types` and `module`.
- **Entry points**: the reviewed repo's own `node_modules/.bin/fallow`, else the manifests.
- **Also**: `code` from the statements that survive type stripping, `functions` at any depth,
  `packages` by the bare specifiers it imports. It reuses `prior`.
- **Needs**: nothing; the compiler ships with atis, so it can always run.

### Go

`go.ts`, id `go`, D113 (go-producer) and D139 (inert-helpers). Fixture: `fixtures/go-1/` (fiber).

- **Claims** `.go`.
- **Kind**: `_test.go` files are tests.
- **Barrel**: none. A package is a directory, so core draws it as a directory cell.
- **Edges**: from a file to each file that declares a name it reads, across an import or within
  its own package; reading a type brings its methods with it.
- **Exports and shapes**: the exported names a small Go helper, which atis carries as source and
  runs with `go run`, reads with `go/parser`, each with its declared shape.
- **Members**: each module, from `go list -e -json`, with its `main` packages' files as entry
  points.
- **Also**: `code` and `functions` from the helper; `packages` by the module `go.mod` requires
  that provides an import the tree does not hold. The standard library is neither.
- **Needs**: a `go` on the `PATH`; without one it reads nothing and says "no go command on the
  PATH".

### Python

`python.ts`, id `python`, D115 (python-producer) and D139 (inert-helpers). Fixture:
`fixtures/python-1/` (openai-agents-python).

- **Claims** `.py`.
- **Kind**: `test_*.py`, `*_test.py`, `conftest.py` and files under `tests/` or `test/` are
  tests.
- **Barrel**: `__init__.py`, so a package is a cell; a namespace package, with none, is a
  directory cell.
- **Edges**: absolute imports resolved against the tree's own roots (the root, each project's
  directory and every `src/` holding Python) and relative ones against their package. An import
  the tree cannot answer is the standard library's or a third party's, and is dropped. An
  `__init__.py` that imports a public name passes it on as a re-export.
- **Exports and shapes**: `__all__`, else the public top-level names, each shaped by its
  signature and annotations; a name with no signature to print, such as a module-level
  assignment, is `null`.
- **Members**: each project with a `pyproject.toml`, and the root for entry points no project
  holds.
- **Entry points**: `[project.scripts]` targets, `__main__.py` files and modules with a
  `__main__` guard.
- **Also**: `code` and `functions` from the helper, which reads every file with `ast` alone and
  never imports it. `packages` is empty, since third-party imports are dropped.
- **Needs**: the repo's own `python3` or `python`; without one it reads nothing and says why.

### Terraform

`terraform.ts`, id `terraform`, D116 (terraform-producer). Fixture: `fixtures/terraform-1/`.

- **Claims** `.tf` and `.tftest.hcl`.
- **Kind**: a `.tftest.hcl` file is a test of the module it sits in or beside.
- **Barrel**: none. A directory of `.tf` files is a module, drawn as a directory cell.
- **Edges**: a `module` block with a local `source` is an edge from its file to every file of
  the module it calls. A file that reads a called module's output reaches the file declaring it,
  and a file reaches the file of its own module declaring each `var`, `local`, `module`, `data`
  or resource it names.
- **Exports and shapes**: a module's `variable` and `output` blocks are its interface, exported
  as `var.<name>` and `output.<name>`, each shaped by its type and default.
- **Members**: the repository, with the root modules (the ones no module calls) as its entry
  points.
- **Also**: `code` is each top-level block. `packages` are the registry and git module sources
  and provider version constraints, which also join the dependency delta (D47
  (dependency-delta)). `functions` is empty.
- **Needs**: nothing; HashiCorp's HCL library, compiled to JavaScript, ships with atis, so neither
  `terraform` nor `terraform init` is needed.

### Shell

`shell.ts`, id `shell`, D117 (shell-producer). Fixture: `fixtures/shell-1/`.

- **Claims** `.sh`, `.bash` and `.bats`.
- **Kind**: a `.bats` file is a test.
- **Barrel**: none. Each script is an organelle in its directory's cell.
- **Edges**: a `source` or `.` line, a bats `load`, and a command that runs a tracked script by
  its path. A path a script spells from its own place (`$0`, `${BASH_SOURCE[0]}`,
  `$BATS_TEST_DIRNAME`) resolves against that script, and a `# shellcheck source=` directive
  names the path outright.
- **Exports and shapes**: the functions a sourced script defines, each shaped by its name alone
  (`name()`). A source edge names the ones the sourcing file calls.
- **Members**: the repository, with each executable script that nothing sources as an entry
  point.
- **Also**: `code` is each top-level command; `functions` are the functions it defines;
  `packages` is empty.
- **Needs**: nothing to install; tree-sitter's bash grammar, compiled to WASM, ships with atis,
  and the producer says why when it fails to load.

## The evidence each language gives

The scan is half of a map; the other half is the evidence checkride writes to `.check/`. atis
reads a file only when the check that owns it ran in the summary and was not skipped, by the
parser its adapter names, never by the slot or the file name alone (D41 (artifact-trust), D180
(check-targets)). One table in `apps/atis/src/sources/check.ts`, `READERS`, is where each
adapter's file meets its parser.

| pack | slot | adapter | file atis reads | what it feeds |
| --- | --- | --- | --- | --- |
| ts (TypeScript, JavaScript) | `test` | vitest, jest | `test.json`, `coverage/coverage-final.json` | test results and stitches; patch coverage and unmeasured lines |
| ts | `mutation` | stryker | `mutation.json` | survived and untested mutants on changed lines |
| ts | `health`, `dead`, `dupes` | fallow | `health.json`, `dead.json`, `dupes.json` | health deltas and findings on the change, clone families |
| ts | `lint` | oxlint | `lint.json` | findings |
| any, with an `sgconfig.yml` | `struct` | ast-grep | `struct.json` | findings |
| ts | `security` | pnpm-audit | `security.json` | advisories the change brings |
| go | `test` | go-test | `test.jsonl` | stitches, a package's events standing for its `_test.go` files |
| go | `lint` | golangci-lint, staticcheck | `lint.json`, `lint.jsonl` | findings |
| python | `lint` | ruff | `lint.json` | findings |
| python | `types` | mypy, basedpyright | `types.jsonl`, `types.json` | findings |
| python | `test` | pytest | none | the check's pass or fail alone |
| terraform | `lint` | tflint | `lint.json` | findings |
| terraform | `types` | terraform-validate | `types.json` | findings |
| terraform | `security` | trivy-config | `security.json` | findings |
| bash | `lint` | shellcheck | `lint.json` | findings |

The findings of golangci-lint, staticcheck, ruff, mypy, basedpyright, tflint,
`terraform validate`, trivy and shellcheck are read through checkride's own parsers
(`parseFindings` from `checkride/findings`, inlined into atis's bundle), so atis reads a finding
exactly as the baseline that keys it does (D176 (other-language-evidence)). Every other slot
that ran (`format`, `links`, `build`, `pack` and the rest) is read for its pass or fail alone,
from the summary.

What a language does not give is said, never faked (C2 (never-fake)). Each gap a check that ran
leaves is a line in `meta.instruments.muted`:

- No pack but TypeScript's writes coverage, so a Go, Python, Terraform or shell file has no
  coverage channel, which is never a gap in its skin: `coverage: go-test writes none`,
  `coverage: pytest writes none` (D80 (unmeasured-not-closed)). A file is counted unmeasured only
  against a coverage report for its own language.
- pytest writes no report: `test: pytest writes no report, so the run counts as its verdict
  alone`.
- An adapter atis has no parser for is muted by name: `lint: atis has no parser for eslint`
  where a JavaScript repo lints with eslint, `types: atis has no parser for go-build`. tsc and
  go-build are type checkers atis does not read, so a red they report stays standing state.
- No Terraform plan is read, since a plan needs credentials and state atis never touches.
- A pack with no test check, bash always and Terraform with no `.tftest.hcl` tests to run,
  writes no `muted` line at all, since each line names what a check that ran did not write, and
  no test check ran. `fixtures/shell-1/` and `fixtures/terraform-1/` carry none, so such a map's
  silence on coverage is the channel's absence, not a reading of it (P99 (pack without a test
  check)).

When a pack learns to write coverage, atis reads each report as it lands; that is checkride's
work, and a line in `READERS` and `MEASURES` here.

## Adding a language

1. Write `apps/atis/src/sources/<language>.ts`: its extensions, a pure reader from the tree's
   text to a `Scan`, and `unavailable` when it needs a toolchain. Give every file a kind, mark a
   barrel where the language has one, write `null` for every shape it cannot compare, and leave
   the reviewed code unrun.
2. Add it to `PRODUCERS`, after any producer whose extensions overlap its own.
3. Test the reader from strings in a temp tree, or from captured toolchain output, and add a
   test that a planted module in the tree never runs when the producer runs a helper.
4. If the language's checkride pack writes findings checkride's own parser reads, add its
   adapter to `READERS` and `FINDINGS` in `check.ts`; if it writes nothing atis can read, the
   muted line names it.
5. Render one reviewed outside pull request whose main code is that language as a fixture, with
   its README and truth (D59 (outside-fixtures)), and read its cells against the language's
   modules.

None of these steps touches `libs/core/`.
