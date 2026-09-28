# Build order

Step numbers are identities, not order. The undone steps run in this sequence
(re-settled at the step-41 harvest, 2026-09-27):

| Order | Step | Title                                                                           | How to start it      |
| ----- | ---- | ------------------------------------------------------------------------------- | -------------------- |
| 1     | 42   | fix(svg): draw a secondary notice's ring in chrome grey, clear of the lit skin  | `/plumbbob:build 42` |
| 2     | 32   | chore(fixtures): select five reviewed outside PRs and record their ground truth | `/plumbbob:build 32` |
| 3     | 33   | chore(fixtures): generate map.json and the SVG for the five outside PRs         | `/plumbbob:build 33` |
| 4     | 34   | chore(glance): retake glance-test round one on the outside fixtures             | `/plumbbob:build 34` |

## The gap before step 32

[D63 (retake-in-this-build)](intent.md#d63) puts the fixes for round one's
parked encodings ahead of step 32, designed against round one's failures, so
the builder never tunes the encodings to fixtures whose ground truth it has
already read. Refine pass four settled [Q23](intent.md#q23) to [Q27](intent.md#q27)
as steps 35 to 40, and they have landed; step 41 closed the dependency-delta
gap step 31 parked. Step 42 is the last render fix, and it goes before step 33
so the outside maps render with it.

## Blindness from step 32 on

[D62 (retake-reader-blind)](intent.md#d62): Rob is the retake's only reader and
must read blind. Steps 32 and 33 keep every pause, commit body and build-log
entry free of repo names, PR numbers, categories and verdicts, and the fixtures
live under neutral `fixtures/retake-<n>/` folders, because a repo-named folder
would show in every git status and diffstat. Rob approves those two steps on
the check and the counts, and opens nothing under `fixtures/retake-*` until
step 34 has recorded the verdicts.
