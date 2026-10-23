# Ground truth · corpus fixture 6

**Verdict: hold**, per D59, from the human review below. No recollection, no
`needs Rob` lines.

## The review

`CHANGES_REQUESTED` by `Andarist` (MEMBER), 2026-05-16,
[review 4303843009](https://github.com/changesets/changesets/pull/2009#pullrequestreview-4303843009),
submitted against `fca0d4c28eaee07bf2fbd08a37117b22a8a9d426`.

> I have not finished reviewing yet, but this one definitely feels blocking

The review's one inline comment, on `packages/cli/src/commands/version/index.ts:39`
([discussion r3253030309](https://github.com/changesets/changesets/pull/2009#discussion_r3253030309)):

> For some reason, we end up here with:
>
> ```ts
> pnpm run changeset version --snapshot
> ```
>
> In this situation, the `options` are getting parsed into:
>
> ```json
> {
>   "--": [
>   ],
>   snapshot: true,
>   ignore: [
>     "undefined",
>   ],
> }
> ```
>
> 1. That `ignore: ["undefined"]` is not added without `--snapshot`
> 2. But it's also added when using `pnpm run changeset version --snapshot foo`

The author replied in the thread: "This looks like a very strange cac bug. I think I can
workaround for now by passing a custom type/validator", then "I pushed a fix with manual
normalization instead. The `type` isn't very reliable to be used unfortunately".

## Why it qualifies

The reviewer names a behaviour bug the refactor introduced. The PR moves the CLI onto `cac`
and declares the `version` command's `--ignore` option with `{ type: [String] }`. With that
declaration, `changeset version --snapshot` (with or without a snapshot name) is parsed with
`ignore: ["undefined"]` although no `--ignore` was given. Parsing those arguments with the
lockfile's `cac` 7.0.0 and the fixture's option list gives exactly that. The `version` command
then takes the `--ignore` path: in a repo whose config already lists ignored packages it adds
the "trying to use the `--ignore` option while ignore is defined in the config file" message
(the line the comment is on), and in every repo `validateIgnoredPackageNames` adds one saying
a package named `undefined` is not found. Either way `changeset version --snapshot`, which the command's own
help lists as an example, fails. That is a bug in the PR's own TypeScript, not naming, style,
docs or changelog. The rewritten `version.test.ts` calls `version()` with an options object,
so the CLI's parsing is never under test.

## The flagged thing

- `packages/cli/src/index.ts`: the `version` command at lines 45 to 58, whose
  `.option("--ignore <pkg>", "Packages to ignore", { type: [String] })` at line 49 produces
  the stray `ignore` value.
- `packages/cli/src/commands/version/index.ts`: `version`, from line 27; the
  `options.ignore != null` branch at lines 37 to 46, which pushes the config-conflict message
  at line 39; and `validateIgnoredPackageNames(packages, options.ignore, messages)` at line
  59 (the function at lines 159 to 180), which reports `undefined` as an unknown package.

## What followed

The author answered with
[`9515636`](https://github.com/changesets/changesets/pull/2009/commits/951563626902c9d060519ba21938078f17fce0ed)
(2026-05-16, "Fix ignore parsing"), which drops `{ type: [String] }` from the option and
normalises `options.ignore` to an array inside the action. The same reviewer approved
`9515636` that evening
([review 4304456653](https://github.com/changesets/changesets/pull/2009#pullrequestreview-4304456653)).
After one more commit,
[`26135a6`](https://github.com/changesets/changesets/pull/2009/commits/26135a6b2fbdc48dcc6256a3951a7a4ea192c98e)
("Update"), the PR was squash-merged into `next` on 2026-05-17 as
`44df27d25745609bcf0c66ae244de2b0464a1b2d`, which `next` later carried into `main`.

## Reviews ignored

- Bot reviews: none.
- Other human reviews: 1 `APPROVED` by `beeequeue` (MEMBER) at `acd01cc` (2026-05-16),
  before the fixture commit; 14 `COMMENTED` reviews by `Andarist`, inline threads on other
  parts of the refactor (a redundant `bin.js`, `changeset help` styles, where `cwd` and
  `ensureChangesetFolder` belong, a wish for a test of `index.ts`); 3 `COMMENTED` by
  `beeequeue`; 12 `COMMENTED` by the author `bluwy`, thread replies; 1 `APPROVED` by
  `Andarist` at `9515636` (2026-05-16), after the fix.
