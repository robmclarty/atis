# Ground truth · corpus fixture 5

**Verdict: hold**, per D59, from the human review below. No recollection, no
`needs Rob` lines.

## The review

`CHANGES_REQUESTED` by `matt-fidd` (MEMBER), 2026-10-04,
[review 5403550058](https://github.com/actualbudget/actual/pull/9020#pullrequestreview-5403550058),
submitted against `f25eab0686dd13a1683cff5eec740a9f8f594a4e`.

> Schedules that skip weekends can return the same date more than once (e.g. a daily schedule with "after" gives the same Monday three times), and the repeats would go towards the count.
>
> I added getNextDateAfter in #8854 and it already handles this for the front end, so could you build the list using that instead? It would also keep the API in line with what the app shows. It's probably worth adding an API test to make sure that doesn't drift

No inline comments are attached to this review; its substance is the body above.

## Why it qualifies

The reviewer names a correctness bug in the new API method and asks for a test. For a
schedule that skips weekends, `getScheduleDates` moves each raw occurrence off the weekend and
pushes the moved day without checking whether it is already in the list, so with
`weekendSolveMode` `after` a daily schedule's Saturday, Sunday and Monday all come back as the
same Monday. Because `count` is checked against the list's length, the repeats also use up
the count, and a caller gets fewer distinct dates than it asked for. The reviewer also points
out that the method reimplements expansion the app already does in `getNextDateAfter`, so the
API can drift from what the app shows. That is a bug and a missing test in the PR's own
TypeScript, not naming, style, docs or changelog. The PR's weekend tests in
`occurrences.test.ts` use monthly schedules, where a moved date never lands on another
occurrence, so none of them meets the repeats.

## The flagged thing

- `packages/loot-core/src/server/schedules/occurrences.ts`: `getScheduleDates`, from line
  35; the loop at lines 74 to 95, which moves each occurrence with
  `getDateWithSkippedWeekend` (line 78), pushes the day at line 88 and stops when
  `dates.length >= count` at line 89, with no de-duplication.
- `packages/loot-core/src/server/api.ts`: the `api/schedule-dates-get` handler at lines 971 to
  990, which returns `getScheduleDates(date, { start, end, count })`.
- `packages/api/methods.ts`: the public `getScheduleDates` at line 436.
- `packages/loot-core/src/shared/schedules.ts`: `getNextDateAfter` at line 326, the existing
  helper the reviewer asks the method to build on (unchanged by the PR).

## What followed

The author merged `master` into the branch
([`8273d48`](https://github.com/actualbudget/actual/pull/9020/commits/8273d486797600b83fe2a9c2bc9a43f4bf5bd275))
and answered with
[`0d45809`](https://github.com/actualbudget/actual/pull/9020/commits/0d45809dfcaf99cf8c70bf0f13a4ea03bb219db5)
(2026-10-11, "[AI] Build getScheduleDates on getNextDateAfter"), which rewrites the loop in
`occurrences.ts` to step through the schedule with `getNextDateAfter`, so `count` counts
distinct dates, and adds tests to `occurrences.test.ts` and `packages/api/methods.test.ts`.
The same reviewer approved `0d45809` on 2026-10-12
([review 5489671266](https://github.com/actualbudget/actual/pull/9020#pullrequestreview-5489671266),
"Thanks! The user facing API looks sensible, so if there are any improvements needed in the
future they won't be breaking"). The PR was squash-merged into `master` the same day as
`89384e0b7b50c1884e1d44a1901a4a462bf0c61f`.

## Reviews ignored

- Bot reviews: 2, from `coderabbitai[bot]`, a `DISMISSED` review at `f25eab0` (2026-09-27)
  and an `APPROVED` one at `0d45809` (2026-10-11), both with empty bodies. Its walkthrough
  comment does not raise the repeated dates. Comments from `netlify[bot]` and
  `github-actions[bot]` are also ignored.
- Other human reviews: 1 `APPROVED` by `matt-fidd` at `0d45809` (2026-10-12), after the fix.
