# atis design tokens

The still SVG is the far-and-surface frame of §5.6 in one image (D11): a
near-black field, dim tissue, and light only where it means something. This
document records the colours, strokes, fonts and sizes that image settled on,
written from the static SVG as §5.6 asks. It also records the motion the moving
world is timed with (D51), and the materials spike's verdict on the world's look
(phase 1b), which wave 2 builds to.

Two materials share one sheet (D12). The **world** is organic: soft membranes,
translucent bodies, and glow rendered as luminescence from within, so gradients
and the one blur live only under `#world`. The **chrome** is brutalist: flat
blocks, hard edges, high contrast, one monospace face, and nothing that glows,
blurs or grades.

Every channel carries one meaning and no other (P3, C11):

- **hue** means state (change kind, flight category);
- **luminance** means reach and evidence;
- **texture** means history;
- **shape** means conformance;
- **size** means mass.

The sections below are those channels, plus the base tissue the weather is drawn
over and the chrome that frames it. Each mark lands in a named group under the
root `<svg>`: `#world` holds `#field`, `#terraces`, `#shore`, `#membranes`,
`#organelles` and `#weather` (itself `#standing-storms`, `#reach`, `#changed`,
`#history`, `#evidence`, `#edges`, `#ghosts`, `#storms`, bottom up); `#chrome`
holds `#ground`, `#hud`, `#rules`, `#leaders`, `#notices`, `#legend` and `#marks`.
The practice map alone adds `#callouts` over both.

Every value here is read from `libs/svg/src/tokens.ts`, the still renderer's
colours and sizes and the world's motion alike, which is the single source; the
value shown beside each token is a copy for reading, and `tokens.ts` is
authoritative if the two ever disagree. A test
(`libs/svg/src/__tests__/tokens.test.ts`) keeps this document naming every
token the file exports, and every motion token inside §5.5's bounds.

## Type

Local generic families only; the SVG loads no web font (C5). With no font
loaded, the chrome measures its blocks and wraps its text from a monospace
estimate.

| Token | Value | Where it appears |
| --- | --- | --- |
| `FONT_FAMILY` | `ui-monospace, Menlo, Consolas, monospace` | `font-family` on the root `<svg>`; the whole image inherits it |
| `MONO_ADVANCE` | `0.62` | the glyph advance as a share of font size, from which the HUD sizes its blocks and the column wraps its text: the widest among `FONT_FAMILY`'s faces and a viewer's fallback, rounded up (SF Mono, `ui-monospace` on macOS, 1266/2048 ≈ 0.618; Menlo 0.602; Courier New, DejaVu Sans Mono and Liberation Mono 0.600; Consolas 0.550) |
| `LABEL_BASELINE` | `0.35` | how far a label's baseline drops to sit centred on a mark, as a share of its font size: HUD values, notice numerals, the storm and rename labels |

## Base tissue (the dim ground)

Everything here is greyscale and dim, drawn to be found rather than seen (§5.6,
D11). Nothing in this section is luminous; light is the weather's to draw.

| Token | Value | Where it appears |
| --- | --- | --- |
| `FIELD_FILL` | `#0a0c0f` | `#field`, the near-black rectangle the whole map is dim against |
| `TERRACE_FILL` | `#10141a` | each depth band's strip in `#terraces` |
| `TERRACE_LINE` | `#222831` | the contour line at the top of each band |
| `TERRACE_LINE_WIDTH` | `1` | that line's width |
| `SHORE_FILL` | `#161b21` | the shore strip above the top terrace (`#shore`), a shade lighter than a terrace |
| `SHORE_CONTOUR` | `#3b434d` | the small skin around each non-empty shore group |
| `SHORE_CONTOUR_WIDTH` | `1` | that skin's stroke width |
| `SHORE_MARK` | `#2d343c` | each shore file drawn as a faint disc |
| `SHORE_LABEL` | `#5d6670` | the small-caps group name |
| `SHORE_LABEL_SIZE` | `8` | that label's font size |
| `SHORE_LABEL_GAP` | `3` | how far the label sits above the group's skin |
| `MEMBRANE_STROKE` | `#4b535e` | the cell skins in `#membranes`, each width scaled by the cell's interface |
| `MEMBRANE_FILL` | `#7a838e` | the translucent body inside each membrane |
| `MEMBRANE_FILL_OPACITY` | `0.08` | that body's opacity, so nested skins read a shade fuller |
| `ORGANELLE_FILL` | `#333a43` | each file's body in `#organelles` |
| `ORGANELLE_STROKE` | `#5f6873` | each organelle's outline |
| `ORGANELLE_STROKE_WIDTH` | `1` | that outline's width |
| `DENT_VERTICES` | `12` | shape is conformance (§5.1): a dented organelle is a polygon of this many vertices |
| `DENT_PULL` | `1.4` | each breached rule pulls one vertex out to this multiple of the radius |
| `MEMBRANE_DENT_PULL` | `8` | a cell wears its files' breached rules on its membrane: one point per rule pulled this far out of the skin, the teeth spread evenly along the ring with its top left clear for a storm |
| `MEMBRANE_DENT_SPAN` | `6` | how far along the skin either side of that point the cut reaches, so the point reads as a tooth (narrower when the teeth would crowd) |
| `GLYPH_STROKE` | `#7b848f` | repetition is duplication (§5.1): the clone-family glyph beside an organelle, and the same glyph beside the membrane of a cell in that family |
| `GLYPH_OFFSET` | `4` | how far past the organelle's edge that glyph sits, or past the outer edge of a cell's membrane at its upper right |

## State (hue)

Hue means state and nothing else (§5.3, C11): one change hue for what the change
touched, and the four flight-category hues (D6). The category letters always
ride on the category hue.

| Token | Value | Where it appears |
| --- | --- | --- |
| `CHANGE_HUE` | `#5fd8ea` | `#changed`: added and modified files stained, deleted and renamed outlined; also a `new-cross-module` edge and its arrow |
| `CHANGE_OUTLINE_WIDTH` | `1.5` | the outline width of a deleted or renamed file |
| `RENAME_DASH` | `3 2` | the dashed outline of a renamed file at its one position (D40) |
| `RENAME_LABEL_SIZE` | `8` | the old path written beside it |
| `RENAME_LABEL_GAP` | `4` | the gap from the mark to that old-path label |
| `VFR_HUE` | `#4fd37a` | the VFR category block, and the emphasis of a notice under a VFR category |
| `MVFR_HUE` | `#5b8def` | the MVFR category block and its emphasis |
| `IFR_HUE` | `#f0546a` | the IFR category, a torn stitch, and every storm on the change in `#storms` |
| `LIFR_HUE` | `#e35ce0` | the LIFR category, and a `cycle` or `boundary` exceptional edge and its arrow |
| `CATEGORY_LETTERS` | `#0a0c0f` | the near-black ink the category letters and the primary box numeral are written in, on their bright block |
| `EDGE_WIDTH` | `1` | `#edges`: the exceptional edges, the only drawn lines on the map (§5.1) |
| `EDGE_BOW` | `0.15` | how far an edge bows to the right of travel, so a cycle reads as a lens |
| `ARROW_SIZE` | `5` | the rendered size of the arrowhead each exceptional edge ends in, filled by kind |

## Reach and evidence (luminance)

Luminance means reach and evidence (§5.2, C11). These are the only luminous
marks on the map, luminous because each means something (§5.6): a warm glow for
reach, a pale light for evidence. Evidence lights what the tests left open
rather than what they closed (D71), so worse evidence draws more light and a
changed file whose evidence is closed stays a dim stain.

| Token | Value | Where it appears |
| --- | --- | --- |
| `REACH_GLOW` | `#f6e7c9` | `#reach`: the warm light filling a reached cell, blurred to read as glow from within |
| `REACH_ORIGIN_OPACITY` | `0.45` | the glow's opacity in the changed cell itself |
| `REACH_DECAY` | `0.6` | the share of that opacity kept per membrane crossed (D5) |
| `REACH_BLUR` | `6` | the Gaussian blur (`stdDeviation`) the glow is drawn through |
| `CROSSING_PAD` | `3` | a barrel the reach crosses is lit as a disc this far past its edge |
| `CROSSING_OPACITY` | `0.9` | that crossing disc's opacity |
| `EVIDENCE_LIGHT` | `#e6edf3` | a changed file's integrity skin (its gap lit, its closed share a dim hairline), a live mutant's notch, and a stitch that passed |
| `INTEGRITY_PAD` | `1.25` | the integrity skin sits this far past the organelle's edge |
| `INTEGRITY_GAP_WIDTH` | `2.5` | the skin draws its gap, not its closure (D71): the uncovered share of changed lines, lit at full strength from the top clockwise, this wide, which is 2.5px at the canvas's native scale and reads on the smallest organelle (radius 4) |
| `INTEGRITY_CLOSED_WIDTH` | `1` | the covered share of the skin, a hairline this wide; a closed skin is this hairline all round |
| `INTEGRITY_CLOSED_OPACITY` | `0.3` | that hairline's strength, so a closed skin stays dim and a gap is the light |
| `MUTANT_NOTCH_WIDTH` | `4` | a live mutant is a lit notch this wide across the skin's outer edge (D71) |
| `MUTANT_NOTCH_DEPTH` | `2` | how far inside the organelle's edge the notch's point reaches |
| `MUTANT_NOTCH_SPACING` | `π/6` | how far apart the notches spread round the top of the ring |
| `STITCH_LENGTH` | `8` | a stitch is a short stroke across the edge, this long |
| `STITCH_WIDTH` | `2` | the `#evidence` group's stroke width, which the stitch strokes take |
| `STITCH_SPACING` | `π/6` | how far apart stitches spread round the bottom of the ring |
| `STITCH_TEAR` | `2` | a torn (failed) stitch breaks by this gap |
| `STITCH_UNLIT` | `#6b7480` | a stitch whose test was not run: not run is not a pass (C2) |

## History (texture)

Texture means history (§5.2, C11): one neutral ink, laid at an opacity set by the
value, so a hot file reads hot in either pattern.

| Token | Value | Where it appears |
| --- | --- | --- |
| `TEXTURE_INK` | `#cfd6de` | the single ink both the hatch and the stipple are drawn in |
| `TEXTURE_MAX_OPACITY` | `0.7` | the opacity a texture reaches at its full-at value |
| `CHURN_FULL_AT` | `3` | the churn ratio at which the hatch is at full opacity |
| `BUGFIX_FULL_AT` | `0.5` | the bug-fix rate at which the stipple is at full opacity |
| `HATCH_PITCH` | `4` | the tile size of the churn hatching |
| `HATCH_WIDTH` | `1` | the one diagonal stroke per hatch tile |
| `STIPPLE_PITCH` | `4` | the tile size of the bug-fix stipple |
| `STIPPLE_DOT` | `0.7` | the radius of each stipple dot |

## Ghosts and storms

The last two weather marks (§5.2). A ghost is a missing co-change, a dim
outline round a file that did not change: it names an absence, so it does not
glow. A storm is a red slot on the change, its bolt and slot name filled in the
IFR hue above, hung only over a cell where the slot names a changed file (D68).
The same slot over a cell the change did not touch is standing state, and
standing state is terrain: a smaller bolt in graphite with no label, laid
beneath the weather so it reads as texture on the ground and never as red. A
global red slot names no cell and hangs no storm.

| Token | Value | Where it appears |
| --- | --- | --- |
| `GHOST_STROKE` | `#7c8590` | `#ghosts`: the dashed outline round a file that usually changes with these and did not |
| `GHOST_DASH` | `2 2` | that outline's dash |
| `GHOST_PAD` | `3` | how far past the file's edge it sits |
| `STORM_LABEL_SIZE` | `8` | the slot name beside a storm bolt in `#storms` |
| `STORM_LABEL_GAP` | `6` | the gap from the bolt to its label |
| `STORM_LIFT` | `10` | how far a storm hangs above the cell it names, on the change or standing |
| `STORM_ROW` | `14` | the row height when two slots stack over one place, the change's nearest the cell |
| `STANDING_STORM_FILL` | `#58616b` | `#standing-storms`: the graphite bolt of a red slot over a cell the change did not touch |
| `STANDING_STORM_SCALE` | `0.6` | how much smaller that bolt is than a change storm's |

## Chrome (the brutalist frame)

The chrome frames the world rather than covering it (§7, §5.4, D12): a strip of
grade blocks across the top and a column of notices down the right, on a flat
ground with a hard rule wherever it meets the field. Its annotations reach onto
the map in a technical-drawing manner: dotted leaders, numbered boxes and thin
emphasis rings.

| Token | Value | Where it appears |
| --- | --- | --- |
| `CHROME_GROUND` | `#1a1f27` | `#ground`, the sheet the world and chrome sit on; also the fill of a secondary or tertiary numbered box |
| `CHROME_RULE` | `#2b333d` | `#rules`, the hard rules between the chrome and the world |
| `CHROME_STROKE_WIDTH` | `1` | the brutalist hairline: a framed HUD block, a tertiary notice box, and the hard rules |
| `CHROME_INK` | `#e6edf3` | the default ink: HUD labels and values, notice text, secondary boxes, and non-primary box numerals; never a ring on the map, since it is `EVIDENCE_LIGHT`'s colour (D72) |
| `CHROME_MUTED` | `#6b7480` | a muted block or the NOINST category block, a tertiary box frame, and the thresholds line |
| `CHROME_PAD` | `10` | the quiet edge the chrome keeps around what it writes, and the HUD and column insets |
| `MUTED_DASH` | `—` | the dash that stands where a number would be faked (C2, D41) |
| `HUD_PAD` | `8` | the padding above and below the HUD strip |
| `HUD_BLOCK_HEIGHT` | `20` | each grade block's height |
| `HUD_BLOCK_PAD` | `6` | the padding inside a grade block |
| `HUD_BLOCK_GAP` | `3` | the gap between grade blocks, and between wrapped rows |
| `HUD_FONT_SIZE` | `9` | the type in every grade block but the category |
| `CATEGORY_FONT_SIZE` | `13` | the larger type in the category block |
| `NOTICE_COLUMN` | `300` | the width the frame reserves for the notice column beside the world |
| `NOTICE_TEXT_SIZE` | `8` | a notice's target and why lines |
| `NOTICE_SMALL_SIZE` | `7` | a notice's kind, its thresholds, and the primary's label on the map |
| `NOTICE_LEADING` | `1.3` | a notice line's height, as a multiple of its font size |
| `NOTICE_ROW_GAP` | `10` | the gap between notice rows |
| `NOTICE_BOX` | `10` | the numbered box at a row's edge and beside its target |
| `NOTICE_NUMERAL_SIZE` | `7` | the numeral inside that box |
| `NOTICE_BOX_GAP` | `3` | the gap between boxes in a run at one target |
| `NOTICE_TEXT_GAP` | `5` | the gap from a box to its row's text |
| `EMPHASIS_PAD` | `5` | how far a tier ring sits past a target's evidence skin |
| `PRIMARY_RING_WIDTH` | `1.5` | the thin ring in the category hue round a primary's target |
| `SECONDARY_RING_WIDTH` | `3` | the thick ring round a secondary's target, in `LEADER_INK`; its inner edge (`EMPHASIS_PAD` less half this) clears the lit gap's outer edge (`INTEGRITY_PAD` plus half `INTEGRITY_GAP_WIDTH`) by a band of dark field |
| `SECONDARY_BOX_WIDTH` | `2` | the thicker frame on a secondary's numbered box |
| `LEADER_INK` | `#9aa5b1` | `#leaders`, the dotted lines from a notice row to its mark, and the secondary ring round its target, so no mark on the map shares the evidence light's colour (D72) |
| `LEADER_WIDTH` | `1` | a leader's width |
| `LEADER_DASH` | `0.1 3` | a leader's round-dotted dash |

## The legend inset and the practice map's balloons

Every map carries a compact key in its chrome (D87), `#legend` at the foot of the
notice column, below the last row and clear of the world: a hairline frame in
`CHROME_MUTED`, a small-caps title, and one row per mark in `LEGEND`'s order
(`libs/svg/src/legend.ts`), each a numbered balloon, a sample of the mark and a few
words. The samples are the world's own shapes and inks drawn flat (D12): no
opacity, no blur, no pattern. The one ink the world draws at a share is the
hairline, and the inset draws it in `EVIDENCE_LIGHT` already laid at
`INTEGRITY_CLOSED_OPACITY` over `CHROME_GROUND`. When the world is shorter than the
list and the inset together, the canvas grows to hold them.

The practice map (`docs/glance-practice.svg`, `pnpm practice-map`) hangs the same
numbered balloons over a real fixture, `#callouts` over everything else, each
joined to the first instance of its mark by a solid line in `CHROME_INK`. A
balloon is a ring, never a notice's square box, and its line is solid, never a
leader's dots.

| Token | Value | Where it appears |
| --- | --- | --- |
| `LEGEND_ROW` | `18` | each inset row's height |
| `LEGEND_SAMPLE_R` | `5` | the radius of the file each sample is drawn on |
| `LEGEND_SLOT` | `24` | the width of a row's sample slot |
| `LEGEND_FONT_SIZE` | `7` | the inset's words, its title and the category scale's letters |
| `LEGEND_PAD` | `6` | the inset's inner padding and the gaps inside a row |
| `CALLOUT_R` | `7` | a balloon's radius, in the inset and on the practice map |
| `CALLOUT_REACH` | `22` | how far a practice balloon stands off its mark |
| `CALLOUT_FONT_SIZE` | `7` | the number inside a balloon |
| `CALLOUT_CLEARANCE` | `2` | the clear ground a practice balloon keeps off a notice's marks, the column, the HUD strip and the other balloons |

## Motion

Motion means urgency (C11), and it is the world's alone: the still SVG draws none
of it (C10). §5.5 budgets it. There is one continuous mover, the primary's
breathing, and at most one flare in flight. Transients last 600 ms or less and
cross-fades 300 ms or less, and nothing animates outside the one scheduler that
owns them all (C12). A flare is the loud channel, spent once on load and then at
random, so a reviewer who looked away is pulled back without the map ever
twinkling.

These tokens sit where [the materials spike](#phase-1b-the-materials-spike) left
them. Where §5.5 gives a number, the token stands at it, as §5.5's starting
value. Where §5.5 names a motion but not its size, the spike chose the value. Rob
judged the motion on `retake-3` and made no patch.

Each bound is §5.5's, read three ways. Where it states a ceiling or a range, the
bound is that. Where it says "about", the bound is a quarter either way. Where it
gives a starting value or no number at all, the bound is the rule the value
serves. `tokens.test.ts` holds every token inside its bound. A balance patch moves
a token inside its bound and adds a line to the log below (Q3). A patch past a
bound changes §5.5 itself, and moves the bound in the test with it.

| Token | Value | Bound | What it moves |
| --- | --- | --- | --- |
| `SETTLE_MS` | `400` | above 0, at most 600: a transient (§5.5 starts it at 400) | the load settle: the skin drops onto the terrain, the one moment the whole surface moves |
| `SETTLE_LIFT` | `18` | above 0: a drop | how far above the terrain the skin starts, in the heightfield's units (the spike's, where a cell's body swells 9 and a terrace steps 4) |
| `SETTLE_DAMPING` | `0.72` | above 0, at most 1: damped, and landing inside `SETTLE_MS` | the settle spring's damping ratio, which lands the skin with a small overshoot rather than a bounce |
| `FLARE_MS` | `600` | above 0, at most 600: a burst, since only the breathing outlasts a transient | a flare's length, on load and at random |
| `FLARE_GAIN` | `3` | above 0: a flare brightens | the light a flare adds at its peak, as a multiple of the notice's own, so the primary peaks at four times its light |
| `FLARE_GROW` | `0.45` | at least 0: it may swell the glow, never shrink it | how far a flare swells the glow's radius at its peak, as a share of it |
| `BREATHE_PERIOD_MS` | `2000` | 1500 to 2500: about 2 s | one breath of the primary, the one continuous mover |
| `BREATHE_AMPLITUDE` | `0.03` | 0.0225 to 0.0375: about 3% | how far the primary's glow radius swells and shrinks with each breath, as a share of it |
| `PRIMARY_FLARE_MIN_MS` | `8000` | 8000 to 20000, and no later than the max | the shortest wait before the primary flares again |
| `PRIMARY_FLARE_MAX_MS` | `20000` | 8000 to 20000 | the longest; each wait is drawn between the two from the seeded source (D94) |
| `SECONDARY_FLARE_MIN_MS` | `40000` | 40000 to 90000, and no later than the max | the shortest wait before a secondary flares; tertiaries never flare |
| `SECONDARY_FLARE_MAX_MS` | `90000` | 40000 to 90000 | the longest |
| `SECONDARY_FLARE_GAIN` | `0.5` | above 0, below 1: dimmer than the primary (§5.5 starts it at half) | a secondary's flare, as a share of the primary's gain and swell |
| `JIGGLE_MS` | `600` | above 0, at most 600 | the jiggle when the camera lands on a cell or a cell opens; it never repeats on its own |
| `JIGGLE_AMPLITUDE` | `0.22` | above 0, below 1: the relief never turns inside out | how far the jiggle swings the skin's relief, as a share of it |
| `JIGGLE_HZ` | `3.2` | above 0 | the jiggle's frequency, about two swings in its 600 ms |
| `JIGGLE_DECAY` | `4.5` | at least ln 20, about 3.0: heavy damping, a twentieth of the swing or less left when it stops | how many e-folds the swing decays through across `JIGGLE_MS`; at 4.5 about 1% is left |
| `HOVER_MS` | `100` | above 0, at most 600: a transient (§5.5 starts it at 100) | the ease to a hover's highlight; nothing on the hovered thing moves |
| `FLY_TO_MS` | `400` | above 0, at most 400 | the ease of a fly-to from a notice |
| `LOD_FADE_MS` | `300` | above 0, at most 300: a cross-fade, never a blink | the cross-fade between levels of detail at a zoom threshold |

The curves are shapes rather than tokens, and the spike drew them this way, so
the scheduler that owns them can draw what Rob judged. A flare rises over
its first 14% and falls as the square of what remains. The load flare starts
halfway through the settle. The breathing is a sine that starts when the settle
ends, and the random flares' clocks start then too. A flare that arrives while one
is in flight waits in a queue one deep, and a third is dropped.

Measured from the spike's own scheduler on `retake-3`:

- the settle completes at 405 ms, with a 3.8% overshoot;
- the load flare runs 600 ms, from 205 to 781 ms after load, and peaks at 3.9
  times the primary's light 85 ms in;
- the breathing holds ±3.0% on a 2.0 s period;
- the primary's first random flare came 14.0 s after load, inside its 8 to 20 s
  window;
- with three flares requested at once, one ran, one queued and one dropped, and no
  frame of 2,880 had two flares in flight;
- under reduced motion the skin has no lift and no swing, nothing breathes, no
  notice gains light, and the primary keeps a static halo for its load flare.

### Balance patches (Q3)

§5.5's numbers were starting values, to be tuned by eye in the spike and then
frozen here. Q3 stays open on purpose as the log of Rob's balance patches. Each
patch edits its row in the table above and adds a line here: the date, the token,
its old and new value, and what was seen that called for it.

- **2026-10-24, the materials spike.** Every token set at the value in the table.
  No patch: the motion held at §5.5's starting numbers.

## Fixed geometry that carries no token

Some marks are shapes rather than scalar design values, and stay in the renderer
that draws them. They are noted here so the inventory above reads as complete on
purpose, not by omission:

- the clone-family glyphs (`GLYPHS` in `terrain.ts`) and the storm bolt
  (`STORM_GLYPH` in `weather.ts`): fixed path shapes drawn about their own
  origin, coloured by `GLYPH_STROKE`, `IFR_HUE` or `STANDING_STORM_FILL` and
  offset by `GLYPH_OFFSET`;
- the exceptional-edge arrowhead's triangle (`patterns.ts`): a fixed shape in a
  six-unit box, rendered at `ARROW_SIZE` and filled per edge kind;
- the reach glow's filter region (the `-25%`/`150%` bounds in `patterns.ts`):
  SVG plumbing that gives `REACH_BLUR` room, not a look to tune;
- the number precision and indentation of `el.ts` (`PRECISION`, `INDENT`): how
  the file serialises, not how it reads;
- the inset's samples (`legend.ts`): the category scale (`CATEGORIES`), the lit
  arc's share of its sample skin (`ARC_SHARE`) and the three stitch statuses
  (`STITCHES`), which pick one instance of a mark to show rather than set a
  look;
- the turns a practice balloon tries round its mark (`TURNS` in `practice.ts`),
  an eighth of a turn apart: placement, not a look;
- the motion's curves (the flare's rise and fall, the breathing's sine, when each
  clock starts, and the flare queue one deep), described under
  [Motion](#motion): they shape how a token's time is spent rather than set it.

## Phase 1b: the materials spike

The spike put §5.6's look on screen before wave 2 builds it, on real maps rather
than fake data (D89): `retake-3` (tRPC #6976, all six notices placed),
`retake-1` (Apollo Client #12633, the widest reach, across 20 cells) and, for the
shapes inside a cell, `retake-5` (hono). It ran on 2026-10-24 in two throwaway
worktrees that differed only in the skin's material:

- **a, one dark wet skin**, §5.6 read as written: one skin over the terraces, a
  soft swell per cell body and a bump per file, creases where bodies meet, a
  graphite and blue-grey albedo under a clearcoat for the wet sheen, and the
  weather lit in the skin;
- **b, lit jelly**: each cell a taller dome standing apart on a darker floor,
  glossier and with a stronger rim, the reach diffusing up through its thickness
  and every unchanged file glowing faintly through the body.

Both drew with three.js's WebGPU renderer, its node materials and bloom on an
emissive target, in Chrome on an Apple M1 Pro at 1440 by 900. Both held the
display's 120 fps at every level of detail on `retake-3`'s 1,063 placed files.
The [spike's report](../.plumbbob/builds/2026-10-08-phases-1b-to-5/spike-01-materials.md)
holds the technical findings wave 2 builds on. Its code does not land (D89); a
copy beside the repo, `atis-spike-materials-archive/`, keeps it readable for wave
2's builders.

**Verdict: viable, with a** (Rob, 2026-10-24: "a great start"). b dies: its
domes brighten the base tissue until it competes with the weather, and its reach
dims inside the thick bodies. §5.6's dark, withholding field is the look.

The frames below are the ones the verdict was judged on, as the spike captured
them. Rob's first look came after the surface frames, so those still show lines
at the layers' edges and the shore drawn as tissue. The shore pair and the frame
of shapes show a as it was left.

### Far (LOD0, lights on a dark field): holds

![a at the far zoom: a near-black field, the six notices bright, the changed set a dimmer scatter](img/materials-spike/a-1-far.png)

![The same frame at the peak of the primary's load flare, a red haze spreading through the bloom](img/materials-spike/a-1-far-flare.png)

The ten-second frame is the one §5.6 wrote: a near-black field, the six notices
bright, and the rest of the changed set a dimmer scatter. It holds with the key
light and the sky fully off at this zoom, since either left on puts a specular
glint among the lights. At its peak the primary's flare spreads a wide red haze
through the bloom (the second frame); it was seen, and not patched.

### Closer (LOD1, the luminous surface): holds, with changes

![a at the surface, overhead: tissue on terraces, and the reach warm through the changed cells](img/materials-spike/a-2-surface.png)

![a at the surface tilted to 35°, where the wet sheen catches the flanks of the bulges](img/materials-spike/a-2-surface-tilt.png)

![a on retake-1, the widest reach: a warm region across most of src](img/materials-spike/a-2-surface-reach-retake1.png)

The surface resolves into tissue, and the reach flows through it: brightest in
the changed cells, dimmer at each membrane it crosses. It holds with five
changes, all made in a and judged there:

- **The reach is shaped by tissue, and barely blooms.** A broad reach feeds the
  bloom at a fifth of its light; at full weight, `retake-1`'s reach across 20
  cells read as fog rather than light. A container cell, a package holding
  folders, does not stack its glow on its children's: the brightest reach at
  each point wins, which keeps the decay per membrane (D5) legible. On
  `retake-1` most of `src` sits one hop out, so a wide warm region is the true
  picture.
- **No lines at the layers' edges, and softer terraces.** The straight lines
  read as noise. A layer's edge is now drawn from the terrace's slope at a
  strength that defaults to none, and each terrace is a 4-unit step eased over
  36, so the layers read as gentle relief alone.
- **The shore leaves the world.** The shore holds 584 of `retake-3`'s 1,063
  placed files, more than the terrain's 479, and drawn in the same wet tissue it
  read as malformed cells (the first frame below). It became flat, matte land,
  its files small marks and each group labelled with its kind and count (the
  second). At Rob's second look it left the world altogether, for a scrolled rail
  of brutalist blocks in the chrome (the frame of shapes, under Inside). There
  the groups the change touched come first and open on their files, the changed
  ones lit and named, and the rest stay collapsed. Without the shore, `retake-3`'s
  world frames about twice as large at the far zoom. The SVG keeps its shore
  (D48).
- **The sheen needs a sky to mirror.** A clearcoat gives the wet sheen, reading
  a normal of its own, and it reflects a sky made for it: black at the zenith, a
  band below about 60° of elevation, and three soft boxes. Flat tissue stays dark
  and the flanks of the bulges catch the light. Overhead the sheen is faint;
  tilted to 35°, it reads.
- **Stability swells wait for their data.** `map.json` carries no per-file age
  or churn, so §5.1's swells could not be drawn without faking them (C2). The
  relief is terraces and mass alone.

![a before the first look: the shore drawn as wet tissue above the cells, and lines at the layers' edges](img/materials-spike/a-4-shore-before.png)

![a after it: the shore as flat, matte land with its groups labelled, and no lines at the layers' edges](img/materials-spike/a-4-shore-labelled.png)

b at two of the same frames, for the comparison that settled it: base tissue a
brighter blue that competes with the weather, and a reach that dims inside the
thick bodies.

![b at the surface: brighter blue domes that compete with the weather](img/materials-spike/b-2-surface.png)

![b on retake-1: the reach inside the domes](img/materials-spike/b-2-surface-reach-retake1.png)

### Inside (LOD2, the stained cell): holds, with changes

![a inside a cell on retake-3: a stained slide, the files stained bodies with granules, labelled on dotted leaders](img/materials-spike/a-3-inside.png)

![a inside a cell on retake-5 after Rob's second look, every shape level on: the morphing shapes, the shore rail, the shape key and the minimap](img/materials-spike/a-5-shapes-demo.png)

Zooming into a membrane fades in the interior as a stained slide: warm and
clinical where the surface was dark, the files stained bodies with their
functions as granules, and the labels on dotted leaders in the technical
drawing's manner. It holds, with two changes from Rob's second look built into a
(the second frame):

- **Shape is conformance, morphed.** A file's outline travels with the rules it
  breaks, 0 to 6: round, then a soft wobble, lobes, angular protuberances, and
  spiked arms with bulbs at their tips. The higher levels move inside an opened
  cell, faster and further as the level climbs, and nothing moves under reduced
  motion. No fixture file breaks 5 or 6, so the frame cycles every level, and
  its HUD says so.
- **A cell stays open while you move inside it.** It closes when you zoom out
  past it, click open ground or press Esc. Its file labels are tags on the
  chrome's ground, kept in columns on screen, each with its rule count.

Two gaps show, and both belong to other steps. Some files sit across their
cell's membrane, from the simplified ring the layout draws, plain in the first
frame. The granules are equal dots, since the map carries no function sizes yet.

### Motion: holds

At §5.5's starting numbers, measured as recorded under [Motion](#motion). Rob
made no balance patch.

### Open for the refine

The verdict leaves five rulings for the refine before wave 2:

- the shore rail, which amends D48 for the world while the SVG keeps its shore;
- the minimap, new chrome beside §7's HUD: the body's silhouette, how far the
  reach goes, the changed files, the notices and the view's outline, clicked or
  dragged to move;
- the morph, which replaces §5.1's one pulled vertex per rule, so the SVG would
  draw the same shapes still and the two renderers agree;
- the morph's motion, a second mover §5.5's budget does not allow: allow
  conformance motion inside an opened cell, where the reviewer chose to look, or
  keep shapes still;
- an unplaced primary: `retake-1`'s primary targets a test file the layout never
  placed, so the one notice that breathes has no light, in the world or the SVG.
