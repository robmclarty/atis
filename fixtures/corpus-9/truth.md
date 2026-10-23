# Ground truth · corpus fixture 9

**Verdict: hold**, per D59, from the human review below. No recollection, no
`needs Rob` lines.

## The review

`CHANGES_REQUESTED` by `bluebill1049` (MEMBER), 2026-08-24,
[review 5013039966](https://github.com/react-hook-form/react-hook-form/pull/13676#pullrequestreview-5013039966),
submitted against `b929bbbd3df4c0b536d1c38b7cf4c3ee540d2628`.

> Nice PR 👍
>
> Still needs the same | OpaqueTypes[keyof OpaqueTypes] branch added to ArrayPathImpl's two checks and to DeepMap before this is complete/consistent.

No inline comments are attached to this review; its substance is the body above.

## Why it qualifies

The reviewer names an interface defect in the PR's own public types. The PR adds an
`OpaqueTypes` registry, an empty interface a consumer extends by declaration merging, so that
the form's recursive type helpers treat a registered type (a `Dayjs`, a `Decimal`) as a leaf
value instead of recursing into its members. It adds the registry's branch to `PathImpl`,
`DeepPartial`, `DeepPartialSkipArrayKey` and the error types' `DeepRequired`, but not to
`ArrayPathImpl` or `DeepMap`, the two the reviewer names. A registered type is therefore
still walked by `ArrayPath`, which `FieldArrayPath` and so `useFieldArray`'s names build on,
and by `DeepMap`, which `FieldNamesMarkedBoolean` and so `dirtyFields` and `touchedFields`
build on: the behaviour the registry exists to stop. That is not naming, style, docs or
changelog. The PR's type test checks `Path`, `DeepPartial`, `DeepPartialSkipArrayKey` and
`FieldErrors` against a registered type, not `ArrayPath` or `DeepMap`, so nothing caught it.

## The flagged thing

- `src/types/path/eager.ts`: `ArrayPathImpl` at lines 88 to 110, whose two leaf checks,
  `V extends Primitive | BrowserNativeObject` at line 93 and
  `U extends Primitive | BrowserNativeObject` at line 98, lack the
  `| OpaqueTypes[keyof OpaqueTypes]` branch that `PathImpl` gained at line 35.
- `src/types/utils.ts`: `DeepMap` at lines 140 to 149, whose leaf check
  `T extends BrowserNativeObject | NestedValue` at line 143 lacks it, where `DeepPartial`
  (line 79) and `DeepPartialSkipArrayKey` (line 93) have it. The registry itself,
  `export interface OpaqueTypes {}`, is at line 55.

## What followed

The author replied "done, lmk if i missed anything else."
([issue comment 5403101993](https://github.com/react-hook-form/react-hook-form/pull/13676#issuecomment-5403101993))
and force-pushed a rebased series ending in `d546021` (2026-08-25, "🪅 feat: extend
OpaqueTypes leaf checks to ArrayPathImpl and DeepMap"). On that later head the reviewer
flagged, in an issue comment, that `IsFlatObject` had been missed too, which `7c44b9d` and
`c71e5c1` answered. The same reviewer approved
[`c71e5c1`](https://github.com/react-hook-form/react-hook-form/pull/13676/commits/c71e5c1cc50fbcd2889091790d8ba0161f2c2f11)
on 2026-08-25
([review 5014466137](https://github.com/react-hook-form/react-hook-form/pull/13676#pullrequestreview-5014466137),
no body) and squash-merged the PR into `master` twelve seconds later as
`f646948dcca52177512a4778e16789765a00ccf2`. No revert followed: the two reverts on `master`
since (#13918 and #13932) undo other PRs, and `OpaqueType` is still in `src/types/utils.ts`
and `src/types/path/eager.ts`.

## Reviews ignored

- Bot reviews: none, and no automated comments.
- Other human reviews: 1 `APPROVED` by `bluebill1049` at `c71e5c1` (2026-08-25), after the
  fix. The reviewer's issue comment about `IsFlatObject` is on a later head, not the fixture
  commit.
