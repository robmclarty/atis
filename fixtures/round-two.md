# Glance round two

Five fresh outside pull requests, read blind in the world's opening frame (D95). Round two is
§11's phase-2 run (D63): at step 47 each reader sees each map's opening frame for ten seconds,
with motion on and input off, after the legend and an unscored practice map in the world, and
gives a merge or hold and one reason. Each folder holds a `README.md` naming the change and its
ecosystem and a `truth.md` quoting the human review; a later step generates the maps beside
them.

## The five

- [`round-two-1`](./round-two-1/README.md)
- [`round-two-2`](./round-two-2/README.md)
- [`round-two-3`](./round-two-3/README.md)
- [`round-two-4`](./round-two-4/README.md)
- [`round-two-5`](./round-two-5/README.md)

## The rules for choosing

Step 45 chose the five by step 16's rules, amended for round two.

- **Balance (D60).** Five PRs from at least three repos, three of one verdict and two of the
  other, the split kept from the reader, and never two snapshots of one PR. No repo gives more
  than two PRs.
- **Outside, reviewed PRs (D59).** A *hold* is the commit a human reviewer submitted
  `CHANGES_REQUESTED` against (the review's `commit_id`), where the review names a substantive
  problem: a bug, a missing, wrong or failing test, or a behaviour or interface risk, never
  naming, style, docs or changelog. A *merge* is the approved head of a PR whose human reviews
  asked for no change. Bot reviews are ignored, and so is a review by the PR's own author. The
  ground truth is the reviewer's comment, quoted with its link in `truth.md`.
- **Merged and standing.** Every PR merged and was not reverted.
- **Reachable truth.** A hold's flagged problem lives in the PR's own TypeScript, source or test,
  and is present in the code at the fixture commit.
- **TypeScript size (D64, amended by D126).** Between the fixture commit and its merge base, 3 to
  30 changed files are source as `classifyFile` counts them: `.ts`, `.tsx`, `.mts` or `.cts`, not
  a test (`*.test.*`, `*.spec.*`, or under `__tests__/` or `test/`), and not a tool config or
  committed build output.
- **A runner atis can read (D64).** The repo is on pnpm, npm, yarn or bun, and its tests run in
  vitest or jest, so coverage can be pointed at `.check/coverage/coverage-final.json`. At most one
  fixture in five runs git-only.
- **Fresh repos (D95).** No repo is one an earlier reading or corpus used:
  `robmclarty/checkride`, `robmclarty/fascicle`, `trpc/trpc`, `TanStack/form`,
  `apollographql/apollo-client`, `remeda/remeda`, `honojs/hono`,
  `modelcontextprotocol/inspector`, `mermaid-js/mermaid`, `matrix-org/matrix-js-sdk`,
  `discordjs/discord.js`, `actualbudget/actual`, `changesets/changesets`,
  `marmelab/react-admin`, `vercel/swr`, `react-hook-form/react-hook-form`,
  `excalidraw/excalidraw`, `inngest/inngest-js` and `logaretm/vee-validate`. No PR is one
  `robmclarty` took part in.
- **Practical to generate.** Each repo installs with its own package manager and lockfile from
  the public registry, its unit suite runs without a database, browser, docker or network
  service, and it is of modest size: the five hold 155 to 615 TypeScript files at their fixture
  commits. Every PR merged within
  about the last year.

## Blind until the reading (D62)

Round two stays sealed until step 47's reading is done. The builder chooses the fixtures,
generates the maps and holds the key. The fixture steps' pauses and commit bodies give counts
only, never a repo, PR or verdict. The reader opens no round-two folder, `README.md`, `truth.md`
or PR page until the verdicts are in, and a one-reader result says so beside its line.
