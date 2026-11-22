# atis

## Intent

atis draws a repository as a map and a change as the weather over it, so a
reviewer can see what a change did before reading it, and see what a
repository has become when an agent wrote most of it. The map is the
modules, how deep they sit and how they hold together. The weather is what
moved, how far it reaches, and what evidence covers it.

- **For:** a developer who reviews more code than they can read, their own
  agents' most of all.
- **Good looks like:** in ten seconds they know where to look; they approve
  a good shape, click into a worrying one, and read code last.
- **Not:** a gate, a score, a code editor, a measure of people, or a
  service.

## Principles

- **P1 (attention-budget)**: The reader's attention is the scarce thing. Rank,
  show less when unsure, and keep what is calm quiet.
  - because: reviewers told the research that more to look at slowed them.
- **P2 (stable-ground)**: The map stays where it was; a change relights it and
  never moves it.
  - because: a layout that reshuffles never becomes familiar.
- **P5 (parts-not-a-score)**: Every verdict is a category with its parts one
  click away.
  - because: a single risk number is distrusted.
- **P7 (no-workflow-tax)**: One command, one tab, one image; no account and
  no new process.
  - because: a viewer with its own workflow does not survive.
- **P10 (shape-and-change)**: Read what the repository is as well as what
  moved, and let a shape be approved.
  - because: with an agent writing, approving a shape is cheaper than reading
    lines.
- **P11 (measured-not-narrated)**: Everything drawn is measured from git, the
  checks and the code. A model may name or explain; it never measures.
- **P12 (reader-steers)**: Pan and zoom are the reader's, and zoom only
  magnifies. Nothing opens, moves or changes mode unasked.
  - because: free movement is what gives the feeling of control.

## Map

- **M1 (core)**: Builds `map.json` from scans, history and evidence: modules,
  depth, reach, notices, the approved shape.
  - paths: libs/core/
- **M2 (scene)**: Lays the map out for every renderer, and holds the tokens.
  - paths: libs/scene/
- **M3 (still)**: The still SVG, the fingerprint and the pull request's image.
  - paths: libs/svg/
- **M4 (world)**: The lit surface in the browser.
  - paths: apps/web/src/world/
- **M5 (panels)**: The HUD, notices, folder tree and inspector.
  - paths: apps/web/src/chrome/
- **M6 (command)**: The CLI, the readers of each language and of `.check/`,
  the local server, the watch and the agent's tools.
  - paths: apps/atis/
- **M7 (tour)**: An optional reviewer's tour written by a model.
  - paths: apps/tour/

## Constraints

- **C1 (core-is-pure)**: The three libraries read no file, clock or network.
  - held-by: `file:rules/lib-is-pure.yml#"id: lib-is-pure"`
- **C2 (never-fake)**: A missing source mutes its channel and says why. No
  number is invented, and absent is never zero.
  - held-by: `file:apps/atis/src/__tests__/cli.test.ts#"with the evidence channels absent rather than faked"`,
    review
- **C3 (deterministic)**: One commit and one set of inputs give the same
  bytes: map, still and capture.
  - held-by: `file:libs/core/src/__tests__/map.test.ts#"two runs over one input set produce the same bytes"`,
    `file:libs/svg/src/__tests__/render.test.ts#"the demo map renders the golden byte for byte"`
- **C4 (never-blocks)**: atis informs. Its exit code never depends on the
  weather; checkride gates.
  - held-by: review
- **C5 (no-network)**: No network, telemetry or account. `--comment` is the
  one command that reaches out, and only when typed.
  - held-by: review
- **C6 (no-people)**: No author, owner or anything readable as a measure of a
  person.
  - held-by: `file:apps/atis/src/__tests__/git.test.ts#"no author field anywhere"`
- **C9 (deps-earn-their-place)**: A dependency ships only if it earns it, and
  is checked for staleness first.
  - held-by: review
- **C10 (svg-is-still)**: The still draws the world's marks at rest and never
  animates.
  - held-by: review
- **C11 (one-meaning-per-channel)**: Position, size, shape, hue, light,
  texture and each mover mean one thing each.
  - held-by: `file:libs/scene/src/__tests__/tokens.test.ts#"every row of the motion table is one mover's or a transient's"`,
    review
- **C12 (motion-budget)**: Motion means something or is absent, runs through
  one scheduler, and stills under reduced motion.
  - held-by: `file:libs/scene/src/__tests__/motion.test.ts#"under reduced motion only a static halo stands for the load flare"`
- **C13 (loopback-only)**: The server binds loopback behind the run's token,
  and reads a file only from git objects, by a path the map names.
  - held-by: `file:apps/atis/src/__tests__/serve.test.ts#"the server binds loopback alone"`
- **C15 (every-look-a-token)**: Every look and timing is a live token in the
  dev panel, named in the design doc.
  - held-by: `file:apps/web/src/__tests__/registry.test.ts#"the panel's sections are the design doc's headings"`

## Scenarios

- **S1 (review-a-change)**: On a branch, `atis` opens a tab on the lit map
  with the category, the HUD, at most six notices, and any advisory on an
  outside package said on that first frame.
  - held-by: `file:apps/atis/src/__tests__/cli.test.ts#"the command serves the world, prints its URL"`,
    `file:apps/web/src/__tests__/select.test.ts#"opens framed on the ground the world draws"`,
    `file:apps/web/src/__tests__/status.test.tsx#"a map whose audit names outside packages says how many"`,
    `file:apps/web/src/__tests__/select.test.ts#"the sky hangs a star for each outside package"`
- **S2 (inspect-by-click)**: A click rings a file or module and opens the
  inspector on its facts; the camera stays.
  - held-by: `file:apps/web/src/__tests__/select.test.ts#"a click on a file on the map opens the inspector on its facts"`
- **S3 (find-in-the-tree)**: The folder tree and the map point at each other,
  so the editor's tree leads to the map's shape.
  - held-by: `file:apps/web/src/__tests__/select.test.ts#"a row of the folder tree under the pointer is ringed on the map"`
- **S4 (no-checks)**: A repository with no checks still reads: its structure
  is drawn, and the evidence is muted.
  - held-by: `file:apps/atis/src/__tests__/cli.test.ts#"a copy with no .check/ is NOINST"`
- **S5 (approve-a-shape)**: `atis approve` records a shape, and later maps
  show their departures from it.
  - held-by: `file:apps/atis/src/__tests__/cli.test.ts#"atis approve keeps the shape of the map its flags draw under the git directory"`
- **S6 (follow-an-agent)**: Under a watch the tab follows uncommitted edits.
  - held-by: `file:apps/atis/src/__tests__/watch.test.ts#"while the head is the working tree the signature moves with an unstaged edit"`
- **S7 (read-the-code)**: A served run shows any file's text, read-only, and
  a changed file shows where its untested lines and live mutants sit.
  - held-by: `file:apps/atis/src/__tests__/serve.test.ts#"a file's text is served at /file/<path> with the token"`,
    `file:apps/web/src/__tests__/inspector.test.tsx#"a file's facts open on its lines to scale"`,
    `file:libs/scene/src/__tests__/nuclei.test.ts#"a granule is exposed where its lines hold a changed line no test ran or a live mutant"`
- **S8 (post-to-a-pull-request)**: `atis --comment` posts the HUD, notices
  and image.
  - held-by: `file:apps/atis/src/__tests__/comment.test.ts#"the comment opens on its marker"`
- **S9 (before-a-change)**: `atis reach` says what a change to named files
  would reach.
  - held-by: `file:apps/atis/src/__tests__/cli.test.ts#"atis reach --json answers what a change to a file would reach"`
- **S10 (large-repository)**: Five thousand files open readable: packages as
  bodies, lines between them, detail in view.
  - held-by: review

## Decisions

Numbers and slugs are the ones the code's comments cite. The full record is
in [docs/one-surface.md](docs/one-surface.md) and the build records.

- **D4 (tests-not-terrain)**: Tests are evidence, drawn as stitches, never
  as files on the map.
  - because: a test is about the code it covers.
- **D5 (reach-by-module-hop)**: Reach dims per module crossed, not per file.
  - because: an interface is where a change escapes.
- **D6 (flight-categories)**: A change reads VFR, MVFR, IFR, LIFR or NOINST.
  - because: a fixed category is trusted where a score is not, per
    [P5 (parts-not-a-score)].
- **D13 (geometry)**: Layers run by import depth, entry points on top.
  - because: a change deep down climbs every layer.
- **D32 (terrain-from-base)**: The ground is the base's.
  - because: [P2 (stable-ground)].
- **D41 (artifact-trust)**: A check's file is read only when that check ran,
  by its adapter's parser.
  - because: a stale file would fake evidence, against [C2 (never-fake)].
- **D114 (producers-compose)**: Each language is one producer; core learns
  none.
  - because: a language is then an addition, never a change.
- **D190 (files-in-git-dir)**: Caches and the approved shape live under the
  git directory.
  - because: nothing atis writes should land in the working tree.
- **D204 (parked-levels)**: The slide by zoom, the plate by zoom and the diff
  sheet are off behind `LEVELS.autoOpen`, not deleted. The plate is laid only
  when the inspector's button asks.
  - because: the old and new can be compared on real repositories first.
- **D205 (open-on-select)**: A selected module comes alive in place.
  - because: the moving cells are liked, and zoom must open nothing.
- **D206 (detail-by-size)**: Names and function granules appear by their
  size on the screen.
  - because: detail by closeness needs no mode, per [P12 (reader-steers)].
- **D207 (click-selects)**: A click selects and the camera stays; flying is
  asked for.
  - because: reading must not depend on where the camera is parked.
- **D208 (side-panels)**: An inspector and a folder tree say what the
  selection is.
  - because: words and code need a panel; the map shows.
- **D212 (approved-private)**: The approved shape is private to the clone,
  written by `atis approve`.
  - because: sharing it waits on use.
- **D213 (planet-goes)**: The far zoom's planet is deleted. Outside packages
  are a list, and stars again per [D354 (package-stars)].
  - because: it withheld the map from the ten-second read.
- **D343 (granules-in-view)**: A large map lays granules for the files in
  view alone.
  - because: a far view needs none.
- **D345 (intent-in-keyframes)**: This file is the current statement of
  intent, and the gate checks it. The founding spec is the record.
  - because: the product had outgrown its spec.
- **D348 (line-strip)**: The inspector draws a file's lines to scale, with
  its functions, changed lines, untested lines and live mutants in lanes; on
  the map a function with an untested line or a live mutant is lit.
  - because: with the plate parked, where the risk sits was words alone.
- **D352 (deps-block)**: The HUD's `Deps` block and the status line count the
  packages an advisory names, and the map marks the files that import one.
  No audit read is a dash, never clean.
  - because: an advisory one click away was easy to miss; [C2 (never-fake)].
- **D354 (package-stars)**: Outside packages hang as stars round the ground,
  sized by importers and hued by health; only advised or changed ones are
  named.
  - because: a serious advisory belongs on the opening frame, and calm stays
    quiet per [P1 (attention-budget)].

## Taste

- **T1 (two-materials)**: The world is organic and luminous; the chrome is
  flat, hard-edged and never glows.
- **T2 (sky-and-weather)**: The picture is astronomical and atmospheric:
  clusters as galaxies, a module as one organism, outside packages as stars,
  the change as weather.
- **T3 (plain-nouns)**: Panels say package, module, file, function.
- **T4 (dash-not-zero)**: A missing number is a dash and a reason.
- **T5 (calm-is-still)**: A calm change is a still map.
- **T6 (hue-is-state)**: Colour means state; red and green are never the only
  difference.
- **T7 (slugged-references)**: A cited decision carries its slug.

## Questions

- **Q100 (verdict-proof)**: Does the category tell a hold from a merge? The
  glance test has never passed.
- **Q101 (speed)**: Does the one surface hold its frame budget? Unmeasured
  since [D213 (planet-goes)].
- **Q102 (delete-parked)**: When does the parked code go, after
  [D204 (parked-levels)]? The plate stays, since a button now asks for it.
- **Q103 (import-corridors)**: Should every module-to-module import be a
  standing line, not only those a change added?
- **Q104 (live-speed)**: Can an edit reach the tab in a second?
- **Q105 (shared-shape)**: Should an approved shape be committed and shared?
- **Q106 (still-parity)**: Should the still draw the advisory pip, the stars
  and the lit functions? Only the world does, which bends
  [C10 (svg-is-still)].

## Ideas

- **I1 (rust-producer)**: Read Rust.
- **I2 (styles-as-terrain)**: Draw stylesheets on the map.
- **I3 (cross-language-links)**: Link a front end to the back end it calls.
- **I4 (measures-contract)**: Read coverage, tests and mutants in one shape
  for every language.
- **I5 (named-by-a-model)**: Let a model label modules in plain words, per
  [P11 (measured-not-narrated)].
- **I6 (shape-gate)**: Let checkride gate on departures from the approved
  shape.
