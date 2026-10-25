# Ground truth · round-two fixture 3

Glance round two (D95; see [`../round-two.md`](../round-two.md)), read blind in the world at
step 47; the reader opens neither this file nor [`README.md`](./README.md) until the reading is
done (D62).

**Verdict: hold**, per D59, from the human review below. No recollection, no
`needs Rob` lines.

## The review

`CHANGES_REQUESTED` by `G-Rath` (COLLABORATOR), 2025-11-09,
[review 3440233642](https://github.com/jest-community/eslint-plugin-jest/pull/1845#pullrequestreview-3440233642),
submitted against `fee7e7af6bebecd66ee8522b648ffbf950f83ea0`.

The body:

> looks good, just a few bits to cleanup - I'm also on the fence about the name: I think "mock"
> might be slightly better than "mocked" because we're dealing about something that is going to
> be mocked, rather something that has already been mocked, but then I'm not sure if it should
> be `valid-mock-module-path` or `valid-module-mock-path` 😅
>
> also please revert the changes re link checking - I've landed #1846 which addresses the issue,
> and we don't need to update the package

Seven inline comments go with it, all on `src/rules/valid-mocked-module-path.ts`. Three name
the rule's behaviour. On line 86, the `catch` that returns early for any error other than
`MODULE_NOT_FOUND` or `ENOENT`
([discussion r2508248849](https://github.com/jest-community/eslint-plugin-jest/pull/1845#discussion_r2508248849)):

> I don't think we should be swallowing all other errors like this - we should either report or
> rethrow.
>
> The two situations I can think of where we'd have an error is a bug in our code, or an issue
> with accessing the path.
>
> Ideally for the former we'd want to rethrow, but the latter we probably want to report since
> its reasonable to expect Jest itself would have the same error - unfortunately I don't think
> we can reliably distinguish those situations so we probably just need to pick one action and
> change it later if it turns out to be noisy

On line 55, the end of the `throw` that runs when the first argument is not a string literal
([discussion r2508242468](https://github.com/jest-community/eslint-plugin-jest/pull/1845#discussion_r2508242468)):

> this is a very possible path as the requirement is "something other than a string is passed
> as the first argument", which includes variables but also silly stuff like an inline function
> (i.e. `jest.mock(() => {})`)

On line 64, the extensions the rule tries
([discussion r2508251166](https://github.com/jest-community/eslint-plugin-jest/pull/1845#discussion_r2508251166)):

> This should probably be configurable, and I'm 98% sure this is related to
> [`moduleFileExtensions`](https://jestjs.io/docs/configuration#modulefileextensions-arraystring),
> so it might be best to have Jest v30s default as our default
>
> (technically `moduleNameMapper` matters too, but that's complex enough that I think we can save
> that option for another time)

The other four are the message's wording, two variables that need not exist, and an early return
in place of an `else`; with the name and the link-checker revert in the body, those are naming,
style and tooling, and are not counted.

## Why it qualifies

The reviewer names a crash and two behaviour risks in the PR's own TypeScript. The new rule
reports a `jest.mock` or `jest.doMock` whose module path does not exist. When the first
argument is anything but a string literal, `findModuleName` returns `null` and the rule throws
an `Error` asking the user to file an issue, so linting a file with `jest.mock(modulePath)` or
`jest.mock(() => {})` fails outright instead of skipping the call. Any error other than
`MODULE_NOT_FOUND` or `ENOENT` while resolving is swallowed and the call passes, so a bug in the
rule or a path that cannot be read goes unreported. And a relative path is checked only against
`''`, `.js` and `.ts`, so a mock of a `.tsx`, `.jsx` or `.json` module is reported as missing
when it exists. The PR's tests cover present and missing modules, by relative path and by package
name, and none of the three cases. None of it is naming, style, docs or changelog.

## The flagged thing

- `src/rules/valid-mocked-module-path.ts`: the `if (!moduleName)` branch at lines 50 to 55, which
  throws for a first argument that is not a string literal (`findModuleName`, now in
  `src/rules/utils/misc.ts`, returns `null` for anything else).
- The same file: the `catch` at lines 82 to 88, which returns without reporting for any error
  code other than `MODULE_NOT_FOUND` and `ENOENT`.
- The same file: the extension list `['', '.js', '.ts']` at line 64, used for every relative
  path.

## What followed

The author, `hainenber`, answered with
[`bf6127f`](https://github.com/jest-community/eslint-plugin-jest/pull/1845/commits/bf6127f993ebd8f5979bdb34ab56f13f85317283)
(2025-11-10, "feat: apply suggestions from @G-Rath code review"), two reverts of the
link-checker commits, and `80063e6` (2025-11-11, "feat: change rule name + add tests +
configurable module file extensions + faster return branches"). `G-Rath` requested changes once
more at `a6782da` (2025-11-11: no `err: any` and no errors for control flow, more tests for the
new option, docs wording), and approved `d60997c` on 2025-11-13 and the head `8c9730b` on
2025-11-20 ([review 3489191918](https://github.com/jest-community/eslint-plugin-jest/pull/1845#pullrequestreview-3489191918)),
squash-merging it into `main` that day as `a8625f1e77758aacb1daedc4eb628050a797082a`, released as
29.2.0. In the merged rule a first argument that is not a string literal returns early, the
extensions come from a `moduleFileExtensions` option defaulting to `.js`, `.ts`, `.tsx`, `.jsx`
and `.json`, and an error other than `MODULE_NOT_FOUND` is rethrown. No revert followed: the two
later commits to the rule on `main` are fixes on top of it, `6cd4e89` (#1860, 2025-11-23,
report on `ERR_PACKAGE_PATH_NOT_EXPORTED`) and `a1916d1` (#1946, 2026-04-09, don't report
virtual mocks).

## Reviews ignored

- Bot reviews: none. The one bot comment is `github-actions[bot]`'s release note.
- Other human reviews: 1 `CHANGES_REQUESTED` by `G-Rath` at `a6782da` (2025-11-11, above); 1
  `APPROVED` by `G-Rath` at `d60997c` (2025-11-13, asking for a test of the error path if there
  was time); 1 `APPROVED` by `G-Rath` at `8c9730b` (2025-11-20).
- Reviews by the PR's author: 3 `COMMENTED` by `hainenber`, thread replies.
