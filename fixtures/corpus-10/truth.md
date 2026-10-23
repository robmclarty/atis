# Ground truth · corpus fixture 10

**Verdict: merge**, per D59, from the human review below. No recollection, no
`needs Rob` lines.

## The review

`APPROVED` by `dwelle` (MEMBER), 2026-07-22,
[review 4753611547](https://github.com/excalidraw/excalidraw/pull/10964#pullrequestreview-4753611547),
submitted against `87a99e6309a45a31f48cd94ef38db5260c2d1770`, the PR's final head.

The review has no body.

## Why it qualifies

A maintainer approved the PR, and it is the only review of any kind. No human review, inline
comment or issue comment asked for a change to the code: the PR has no inline comments, and its
one human issue comment is the author's own (2026-07-07), asking the approver which of two
behaviours he preferred when an arrow starts outside a shape. All three commits are the
author's. The approved commit `87a99e6309a45a31f48cd94ef38db5260c2d1770` is the PR's head when
it merged, so nothing was pushed after the approval. No revert followed: no commit on `master`
since the merge mentions a revert of #10964, and the one later commit to
`packages/element/src/arrows/focus.ts`, `4850bf3` (#10753, "Binding hit test based on
distance"), is a separate binding fix, not a revert.

## The flagged thing

Nothing (merge).

## What followed

Squash-merged into `master` by the author on 2026-07-22 as
`a3b90897b5d770a27d53773db670ddfda983ae85`, ten minutes after the approval.

## Reviews ignored

- Bot reviews: none. Automated comments from `vercel[bot]` (preview deployments) and
  `github-actions[bot]` (a coverage report) are ignored.
- Other human reviews: none. The author's issue comment is his own and is ignored too.
