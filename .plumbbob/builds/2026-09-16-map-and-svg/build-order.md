# Build order

Step numbers are identities, not order. The undone steps run in this sequence
(re-settled at refine pass three, 2026-09-24, after glance round one failed):

| Order | Step | Title                                                                  | How to start it      |
| ----- | ---- | ---------------------------------------------------------------------- | -------------------- |
| 1     | 31   | feat(cli): read npm, yarn and bun workspaces as scan roots             | `/plumbbob:build 31` |
| —     | —    | the encoding fixes, from `/plumbbob:refine` on Q23 to Q27            | not written yet      |
| 2     | 32   | chore(fixtures): select five reviewed outside PRs and record their ground truth | `/plumbbob:build 32` |
| 3     | 33   | chore(fixtures): generate map.json and the SVG for the five outside PRs | `/plumbbob:build 33` |
| 4     | 34   | chore(glance): retake glance-test round one on the outside fixtures    | `/plumbbob:build 34` |

## The gap before step 32

[D63 (retake-in-this-build)](intent.md#d63) puts the fixes for round one's four
parked encodings ahead of step 32, designed against round one's failures, so
the builder never tunes the encodings to fixtures whose ground truth it has
already read. Those steps do not exist yet. After step 31 lands, run
`/plumbbob:refine` on the five encoding questions, [Q23](intent.md#q23) to [Q27](intent.md#q27),
before `/plumbbob:build`, since a bare build would otherwise pick step 32 next.
The refine pass writes its steps and re-runs `plumbbob order` to seat them
between 31 and 32.

## Blindness from step 32 on

[D62 (retake-reader-blind)](intent.md#d62): Rob is the retake's only reader and
must read blind. Steps 32 and 33 keep every pause, commit body and build-log
entry free of repo names, PR numbers, categories and verdicts, and the fixtures
live under neutral `fixtures/retake-<n>/` folders, because a repo-named folder
would show in every git status and diffstat. Rob approves those two steps on
the check and the counts, and opens nothing under `fixtures/retake-*` until
step 34 has recorded the verdicts.
