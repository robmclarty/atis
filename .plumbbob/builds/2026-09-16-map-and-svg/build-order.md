# Build order

Step numbers are identities, not order. The undone steps run in this sequence
(settled at the 2026-09-17 harvest, after step 18 at 8867706):

| Order | Step | Title                                                            | How to start it            |
| ----- | ---- | ---------------------------------------------------------------- | -------------------------- |
| 1     | 19   | feat(svg): render the notice labels and the HUD grade blocks     | `/plumbbob:build`          |
| 2     | 20   | feat(cli): add --svg and --open to write and show the static render | `/plumbbob:build`       |
| 3     | 21   | docs(design): record the colour and chrome tokens the SVG settled | `/plumbbob:build`         |
| 4     | 25   | fix(core): weigh missing co-change notices by rate and support   | `/plumbbob:build 25`       |
| 5     | 26   | fix(core): send TypeScript config files to the config shore group | `/plumbbob:build 26`      |
| 6     | 22   | chore(fixtures): generate map.json and the SVG for five historical PRs | `/plumbbob:build`    |
| 7     | 23   | chore(glance): run glance-test round one and record the verdicts | `/plumbbob:build`          |

Step 24 is already done and never comes up again.

## Why the numbers jump

Plain `/plumbbob:build` picks the lowest undone step number. After step 21
checkpoints it would offer step 22, but steps 25 and 26 fix core's ranking
(D55) and shore classification (D57), and the five fixtures of step 22 must be
generated with those fixes in. So run `/plumbbob:build 25`, then
`/plumbbob:build 26`, and only then let it fall through to 22 and 23.

## Notes that ride with a step

- **Step 19**: storm markers yield the field's top-right corner to the HUD through `STORM_INSET`.
- **Step 20**: use `/plumbbob:step` first to pull in three harvested tangents: gitignore `map.json`, `realpathSync` the `--repo` path in `run.ts` (a symlinked repo silently loses coverage), and a compact writer for contours before step 22 commits five maps.
- **Step 22**: skip the `security` slot (D56) and name skipped slots in each README; name the worktree after the repo, since `meta.repo` is `basename(--repo)`.
