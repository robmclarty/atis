# Build order

Step numbers are identities, not order. The undone steps run in this sequence
(settled at refine pass five, 2026-09-29):

| Order | Step | Title                                                                                  | How to start it      |
| ----- | ---- | -------------------------------------------------------------------------------------- | -------------------- |
| 1     | 43   | fix(cli): run the reviewed repo's fallow directly and record a failed entry-point lookup | `/plumbbob:build 43` |
| 2     | 44   | fix(core): count a health or dupes red as the change's only where its lines meet a hunk | `/plumbbob:build 44` |
| 3     | 45   | fix(core): rank a failing test on the change ahead of every weighed notice              | `/plumbbob:build 45` |
| 4     | 46   | feat(cli): fingerprint the shape of each exported declaration                            | `/plumbbob:build 46` |
| 5     | 47   | fix(core): raise interface-change only when an exported name or shape moved              | `/plumbbob:build 47` |
| 6     | 48   | feat(cli): read a published package's exported names as wide                             | `/plumbbob:build 48` |
| 7     | 49   | fix(cli): scan .mts and .cts files as TypeScript                                         | `/plumbbob:build 49` |
| 8     | 50   | fix(core): sort the outside repos' tooling files into shore groups by kind               | `/plumbbob:build 50` |
| 9     | 51   | docs(inspiration): cite the five outside repos the retake read                           | `/plumbbob:build 51` |
| 10    | 52   | chore(fixtures): refresh the five retake maps after the fifth pass                       | `/plumbbob:build 52` |

## Why this order

- **43 before 48.** [D75 (public-surface-width)](intent.md#d75) keeps fallow's
  `package.json` entries and their tag, so the lookup must stop failing silently
  on npm, yarn and bun trees ([D22 (local-fallow)](intent.md#d22)) before the
  public surface reads it.
- **44 before 45.** [D73 (touched-file-breach)](intent.md#d73) settles which
  `health` and `dupes` reds are on the change, and that moves both the category
  and the primary notice that [D74 (failing-test-rank)](intent.md#d74) ranks
  ahead of.
- **46, 47, then 48.** [D76 (interface-shape)](intent.md#d76) is the rule that
  raises `interface-change`, and D75's public width only widens it. Width without
  the shape rule would flood (15 files across seven fixtures).
- **49 before 50.** [D77 (mts-cts)](intent.md#d77) moves `.mts` files into the
  terrain first, so step 50's before-and-after `other` counts are shore files
  only.
- **50 before 51.** The inspiration rows cite the tooling names step 50's
  patterns learned from the outside repos ([D54 (glance-prs)](intent.md#d54)).
- **52 last.** [D78 (retake-refresh)](intent.md#d78) regenerates the five retake
  maps under every fix, so it waits for all of them.

## After the retake

The retake is read. The five fixtures' truth is unsealed, so
[D62 (retake-reader-blind)](intent.md#d62)'s blindness rules no longer bind
these steps, and pauses and commit bodies may name repos and PRs. Nobody reads
the five blind again ([D63 (retake-in-this-build)](intent.md#d63)): step 52's
table is unscored, and round two judges the fixes on fresh fixtures.
