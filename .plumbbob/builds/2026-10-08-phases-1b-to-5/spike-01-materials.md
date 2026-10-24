<!--
spike-report.md: the durable receipt for a spike (a fork the plan couldn't settle
on paper). One per spike, numbered and named `spike-NN-<slug>.md`, riding the build
folder into the PR beside intent.md / report.md. Fill it while the experiment is
live; the worktrees and their learnings are torn down at `spike done`, but this stays.

Two ways a spike is born, both landing here:
  - `/plumbbob:spike <slug>`: an explicit mid-build fork with throwaway worktrees.
  - a planned step titled `spike: …`: the increment IS the experiment.
Record the Verdict before you close the spike (or check off the step).
-->

# Spike: materials

**Via:** /plumbbob:spike — worktrees (a, b)
**Opened:** 2026-10-24

## Question

Does §5.6's look hold up on screen before wave 2 commits to it: lights on a dark field
far away, a luminous surface with the reach flowing through tissue closer in, a stained
cell inside, and §5.5's motion at its starting numbers? And which reading of "one soft,
wet, translucent skin" should the world build: one dark creased skin with the weather in
it (a), or translucent jelly bodies lit from within (b)? Either answer commits step 22's
verdict and motion tokens, and step 30's first material.

## Options tried

- **a · one dark wet skin** (`atis-spike-materials-a/spike`, port 5181): §5.6 read as
  written. One heightfield skin over terraces, a soft swell per cell body and a bump per
  file, creases where bodies meet. A dark graphite and blue-grey albedo, clearcoat for the
  wet sheen, and the weather (reach, crossings, changed files, evidence gaps) as emissive
  in the skin.
- **b · lit jelly** (`atis-spike-materials-b/spike`, port 5182): the same code with
  `variant.ts` changed. Each cell is a taller dome that stands apart on a darker floor,
  with lower roughness and a stronger rim. The reach diffuses up through the dome's
  thickness, and every unchanged file's nucleus glows faintly through the body.
- Both share everything else: three.js 0.186.1 `WebGPURenderer` with TSL node materials,
  node bloom (`BloomNode`) on an `emissive` MRT target, camera-controls 3.1.2 on an
  orthographic camera, Vite 8.3.5. Also shared: the §5.5 scheduler (injected clock,
  seeded random), LOD on one zoom scalar with hysteresis, the stained interior, DOM
  chrome with dotted leaders, and a tuning panel. The data is real: `retake-3` (tRPC
  #6976, all six notices placed) and `retake-1` (Apollo Client #12633, the widest reach,
  20 cells). Run in Chrome 155 on an Apple M1 Pro (Metal-3 adapter), 1440 by 900 at 1x.
  It took about four hours, a third of it chasing the GPU crash below.

## Findings

- **Frame rate and first frame.** Both variants held 120 fps (the display cap) at every
  LOD on `retake-3`: 247 cells, 1,063 placed files, a skin of about 116k vertices. The
  first frame, including the JSON and the painted layers, took 0.57 s (a) and 0.79 s (b)
  on WebGPU. On the WebGL 2 fallback (`forceWebGL`) it took 2.76 s, past §15's 2 s,
  because GLSL compiles the TSL physical material slowly. The fallback rendered the same
  frame with a clean console.
- **A GPU crash from canvas paint.** GPU-backed 2D canvases about 2,100 by 3,500 pixels,
  painted with CSS `blur()` filters, crashed Chrome's GPU process 5 to 13 s after load:
  the device was lost with "A valid external Instance reference no longer exists", and
  the browser then refused WebGL too. Bisected: an empty scene crashed the same way while
  the canvases were painted, and survived when they were not. CPU-backed canvases
  (`willReadFrequently`) stopped the crash, but a full-size software blur made the first
  frame take 27 s. Blurring each soft layer small (about 3 px at a reduced scale) and
  upscaling brought it back to 0.6 s. For wave 2: compute these layers in `libs/scene`
  as data, and blur small or in a shader; never filter large GPU canvases.
- **Selective bloom.** "Base tissue never blooms" works by overriding each material's
  `emissive` MRT output (`mrtNode`). Gotcha: a `MeshBasicNodeMaterial` writes its colour
  into the emissive target unless overridden, so the slide and its stains bloomed into a
  blur until zeroed. A broad reach must feed the bloom only faintly (0.2 of its light).
  At full weight, `retake-1`'s reach across 20 cells read as fog rather than luminance.
- **Reach through nested skins.** Container cells (a package holding folders) must not
  stack their fills. Taking the brightest reach at each point and skipping containers
  keeps the per-hop decay (D5) legible. On `retake-1` most of `src` sits one hop out, so
  a wide warm region is the true picture.
- **The wet sheen.** TSL's clearcoat reads its own normal (`clearcoatNormalNode`). Left
  alone it takes the flat grid's normal and never glints. The sheen also needs something
  to mirror. three's `RoomEnvironment` reflects its bright ceiling into every flat face
  under an overhead camera and greys the field. A custom sky works: black at the zenith,
  a band below about 60° of elevation, three soft boxes. Flat tissue stays dark and the
  flanks of bulges catch the light. Under the overhead camera the sheen is faint, and it
  reads clearly once tilted (the 35° shots). At the far zoom the key light and the sky
  must be fully off, or a specular glint shows among the lights.
- **Relief without swells.** `map.json` carries no per-file age or churn (history holds
  only `window_commits` and `cochange`), so §5.1's stability swells could not be drawn
  without faking them (C2). The relief is terraces and mass only.
- **Inside a cell.** The interior needed double-sided materials, because triangulating in
  layout coordinates flips the winding on the ground plane. Granules are counted from
  `function_count`. The map carries no function sizes until step 62, so they are equal
  dots. Some files sit across their cell's membrane at LOD2, the simplified-ring effect P3
  recorded, and it is plainly visible in the inside shots.
- **Unplaced notices.** `retake-1`'s primary targets a test file the layout never placed,
  so the world has no light for the one notice that breathes. The SVG has the same gap.
  The world needs a rule for an unplaced primary.
- **Motion, measured** from the scheduler's own frames on `retake-3`:
  - The settle completes at 405 ms with 3.8% overshoot.
  - The load flare runs 600 ms (from 205 to 781 ms), peaking at 3.9× gain 85 ms in.
  - Breathing holds ±3.0% scale on a 2.0 s period.
  - The primary's random flare came 14.0 s after load, inside its 8 to 20 s window.
  - Three flares requested at once: flare 2 ran, 3 queued, 1 dropped. No frame had two
    flares in flight, across 2,880 frames.
  - Under reduced motion: amplitude 1, no lift, no gains, a static halo on the primary.
  - At the far zoom, the flare's bloom spreads a wide red haze at its peak.
- **The variants side by side.** a keeps the field dark and withholding, with the weather
  the brightest thing on the surface. b's domes read more literally as jelly and catch a
  stronger sheen, but its base tissue is brighter blue and competes with the weather, and
  its reach dims inside thick bodies. Unlike every other region of the spike, b's
  interior and far view are a's unchanged.
- **Rob's first look (2026-10-24).**
  - He prefers a.
  - The straight lines at the depth layers' edges read as noise. They are no longer
    painted: a layer edge is drawn from the terrace's slope at a `layerEdges` strength
    that defaults to 0. The terraces are softer too (a 4-unit step eased over 36 units),
    so the layers read as gentle relief alone.
  - The shore's groups looked disconnected from the cells below, because they were drawn
    in the same wet tissue and read as malformed cells. On `retake-3` the shore holds 584
    files against 479 source files, so it is nearly half the map. It is now flat, matte
    land with no swell, no sheen and no rim: its files are small marks, and each group is
    labelled with its kind and count at the surface zoom. `?shore=tissue` shows the old
    treatment for comparison (`a-4-shore-before` against `a-4-shore-labelled`).
- **Rob's second look (2026-10-24), built into a.**
  - **The shore as chrome.** The shore should float like UI, not sit on the map. The
    world is now the abyss alone. The shore is a scrolled rail of brutalist blocks on the
    right, one per group: the groups a change touched come first and open to show their
    files, with the changed ones lit and named; untouched groups stay collapsed. It holds
    any number of groups. A notice on a shore file shows its numbered box in the rail.
    Without the shore, `retake-3`'s world frames about twice as large at the far zoom.
  - **The tuning panel** is hidden until its TUNE button or `t` opens it.
  - **A minimap** (bottom left) shows the body's silhouette, how far the reach goes, the
    changed files, the notices, and the view's outline on the ground. Click or drag it to
    move.
  - **Shape as conformance, morphed.** A file's outline now travels with its breached
    rules (0 to 6): round, then a soft wobble, then lobes, then angular protuberances,
    then spiked arms with bulbs at their tips, like a virus. Higher levels move more:
    their arms pulse and the body turns, faster and further as the level climbs.
    Movement is inside an opened cell only, and none under reduced motion. Levels 0 to 4
    are real on `retake-5`'s `src/jsx` (27 files, 11 moving, 16 still); no fixture file
    reaches 5 or 6, so `?shapes=demo` cycles every level, and the HUD says so while it is
    on. A shape key above the minimap draws the seven levels.
  - **Navigation inside a cell.** An opened cell now stays open while you pan and zoom
    inside it. It closes when you zoom out past it, click open ground, or press Esc.
    Before, it closed as soon as the screen's centre left it. Its file labels are tags
    on the chrome's ground, kept in columns on screen however the slide is framed, each
    with its rule count.
  - **Decisions these need at the refine.** The rail moves the shore out of the world,
    amending D48 for the world (the SVG still draws it). The minimap is a new piece of
    chrome beside §7's HUD. The morph replaces §5.1's one-pulled-vertex-per-rule, and
    the SVG would draw the same shapes still. The moving shapes break §5.5's budget
    ("one continuous mover"; nothing else moves), which needs a ruling: allow conformance
    motion inside an opened cell, where the reviewer chose to look, or keep shapes still.
- **Screenshots** are in the main tree's local-only `.playwright-mcp/spike/final/`:
  `a-1-far`, `a-1-far-flare`, `a-2-surface`, `a-2-surface-tilt`,
  `a-2-surface-reach-retake1`, `a-3-inside`, and the same names for `b`. Step 22 copies
  the ones the verdict is judged on into `docs/img/`.

## Verdict

**Verdict:** viable, with a (Rob, 2026-10-24: "a great start").

- **Far** (LOD0, lights on a dark field): holds, with the key light and the sky off at
  that zoom.
- **Closer** (LOD1, the luminous surface): holds with changes, all made in a:
  - the reach is shaped by tissue and barely blooms, and containers don't stack;
  - no layer lines, and softer terraces;
  - the shore is out of the world, in a rail;
  - the sheen comes from a dark-zenith sky and reads once tilted;
  - stability swells wait for the data.
- **Inside** (LOD2, the stained cell): holds, with the morphing shapes and a cell that
  stays open while you move. Its gaps are the layout's membrane crossings and granule
  sizes, which belong to other steps.
- **Motion**: holds at §5.5's starting numbers. Rob has made no balance patches yet (Q3).
  Whether shapes may move inside an opened cell is the refine's ruling.

## What this decides

- **a wins and b dies.** Translucent jelly domes brighten the base tissue until it
  competes with the weather, and dim the reach inside thick bodies. §5.6's dark,
  withholding field is the look Rob chose.
- **Step 22 records it.** It writes the verdict on each reveal and its screenshots
  (copied from `.playwright-mcp/spike/final/` into `docs/img/`) to `docs/design.md`, and
  §5.5's motion constants, at the values above, to `libs/svg/src/tokens.ts`.
- **The refine after step 22 folds the rest into wave 2.** That means Rob's direction
  (the shore rail, the minimap, the shape morph, the motion ruling, cells that stay
  open, the tuning panel not shipped) and the technical findings above.
- **The SVG stays (Rob, 2026-10-24).** The 3D world does not replace the still SVG. It
  stays an output in its own right, for uses like a static image posted in a pull
  request's comment. The plan keeps it already: step 88 draws its weather from the
  scene's derivations, steps 53 and 60 extend it, step 71 posts the map, and Q38 settles
  the comment's image. The refine should carry the morph into it as still shapes, so the
  two renderers agree.
- **The world is the next thing to refine (Rob).** It is a tool of investigation for a
  solo developer looking at their own change before posting it, and for a reviewer who
  pulls the branch down and looks at it this way. The plan's local loop serves both:
  step 31 serves the world, step 55 resolves the trunk, step 56 maps the working tree's
  uncommitted weather, and step 69 watches the repo.
- **The spike's code does not land (D89).** A copy outside the repo,
  `../atis-spike-materials-archive/`, keeps it readable for wave 2's builders.
