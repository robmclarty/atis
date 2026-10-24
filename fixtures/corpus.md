# The precision corpus

Twelve outside pull requests on which the builder scores §11's criterion 5: whether the
reviewer's finding sits in a map's top three notices, read per D65 (D88). Criterion 5 needs
no blind reader, so the corpus can be wider than a reading. Each folder holds a `README.md`
naming the change and its ecosystem, a `truth.md` quoting the human review, and, once
generated, a `map.json` and an `atis.svg`.

## The two halves

| half | folders | verdicts | chosen | maps made | scored |
| --- | --- | --- | --- | --- | --- |
| tuning | `corpus-1` to `corpus-6` | six holds (D129) | step 16 | step 17 | once, at step 18 (D127) |
| held-out | `corpus-7` to `corpus-12` | three holds and three merges, numbered in a shuffled order (D128) | step 19, after every fix the tuning half prompts has landed | step 19 | at step 20, after the blind reading, holds only (D129) |

The tuning half is scored once. Each miss is parked for a single refine pass. That pass's
fixes are judged only on the held-out half, never by re-scoring the tuning six, and any miss
it leaves is parked past step 20 (D127). The held-out six are chosen after those fixes land,
so the fixes are designed without their findings in hand (D128). Five of the held-out six
are step 20's blind reading on the SVG (D119).

## The tuning six

Six holds, one from each of six repos:

- [`corpus-1`](./corpus-1/README.md)
- [`corpus-2`](./corpus-2/README.md)
- [`corpus-3`](./corpus-3/README.md)
- [`corpus-4`](./corpus-4/README.md)
- [`corpus-5`](./corpus-5/README.md)
- [`corpus-6`](./corpus-6/README.md)

## The held-out six

Three holds and three merges from six repos, numbered in a shuffled order:

- [`corpus-7`](./corpus-7/README.md)
- [`corpus-8`](./corpus-8/README.md)
- [`corpus-9`](./corpus-9/README.md)
- [`corpus-10`](./corpus-10/README.md)
- [`corpus-11`](./corpus-11/README.md)
- [`corpus-12`](./corpus-12/README.md)

## The rules for choosing

Step 16 chose the tuning six by these rules, and step 19 chooses the held-out six by the same
ones.

- **Outside, reviewed PRs (D59).** A *hold* is the commit a human reviewer submitted
  `CHANGES_REQUESTED` against (the review's `commit_id`), where the review names a
  substantive problem: a bug, a missing, wrong or failing test, or a behaviour or interface
  risk, never naming, style, docs or changelog. A *merge* is the approved head of a PR whose
  human reviews asked for no change. Bot reviews are ignored, and so is a review by the PR's
  own author. The ground truth is the reviewer's comment, quoted with its link in
  `truth.md`.
- **Merged and standing.** Every PR merged and was not reverted, so its review was answered
  and its change kept.
- **Reachable truth.** A hold's flagged problem lives in the PR's own TypeScript, source or
  test, and is present in the code at the fixture commit. A finding outside the terrain could
  never be a notice on any map, so it would score the corpus rather than the encodings.
- **TypeScript size (D64, amended by D126).** Between the fixture commit and its merge base,
  3 to 30 changed files are source as `classifyFile` counts them: `.ts`, `.tsx`, `.mts` or
  `.cts`, not a test (`*.test.*`, `*.spec.*`, or under `__tests__/` or `test/`), and not a
  tool config or committed build output.
- **A runner atis can read (D64).** The repo is on pnpm, npm, yarn or bun, and its tests run
  in vitest or jest, so the fixture procedure can point coverage at
  `.check/coverage/coverage-final.json`. At most one fixture in five runs git-only.
- **Fresh repos (D88).** No corpus repo is one round one or the retake read:
  `robmclarty/checkride`, `robmclarty/fascicle`, `trpc/trpc`, `TanStack/form`,
  `apollographql/apollo-client`, `remeda/remeda` and `honojs/hono`. No PR is one
  `robmclarty` took part in.
- **Spread (D88, D128).** The twelve come from at least five repos, and the held-out six from
  at least three repos the tuning half did not use. No repo gives more than two PRs to a half.

## Blind until the reading (D62)

The corpus stays sealed until step 20's reading is done. The builder chooses the fixtures,
generates the maps and holds the key. The fixture steps' pauses and commit bodies give counts
only, never a repo, PR or verdict. Rob opens no corpus folder, `truth.md` or PR page until
the verdicts are in. The tuning half's precision is recorded in `docs/glance-test.md` by
fixture number alone.

**Unsealed on 2026-10-23.** Step 20's reading is done, and its verdicts are recorded in
[`docs/glance-test.md`](../docs/glance-test.md#round-one-second-retake-fail-2026-10-23). That
section names each held-out fixture's repo and PR. Each folder's `README.md` names its own, the
tuning six's included.
