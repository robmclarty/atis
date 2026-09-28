# atis design tokens

The still SVG is the far-and-surface frame of §5.6 in one image (D11): a
near-black field, dim tissue, and light only where it means something. This
document records the colours, strokes, fonts and sizes that image settled on,
written from the static SVG as §5.6 asks.

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
holds `#ground`, `#hud`, `#rules`, `#leaders`, `#notices` and `#marks`.

Every value here is read by the renderer from `libs/svg/src/tokens.ts`, which is
the single source; the value shown beside each token is a copy for reading, and
`tokens.ts` is authoritative if the two ever disagree. A test
(`libs/svg/src/__tests__/tokens.test.ts`) keeps this document naming every
token the file exports.

## Type

Local generic families only; the SVG loads no web font (C5). With no font
loaded, the chrome measures its blocks and wraps its text from a monospace
estimate.

| Token | Value | Where it appears |
| --- | --- | --- |
| `FONT_FAMILY` | `ui-monospace, Menlo, Consolas, monospace` | `font-family` on the root `<svg>`; the whole image inherits it |
| `MONO_ADVANCE` | `0.6` | the glyph advance as a share of font size, from which the HUD sizes its blocks and the column wraps its text |
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
| `GLYPH_STROKE` | `#7b848f` | repetition is duplication (§5.1): the clone-family glyph beside an organelle |
| `GLYPH_OFFSET` | `4` | how far past the organelle's edge that glyph sits |

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
| `CHROME_INK` | `#e6edf3` | the default ink: HUD labels and values, notice text, secondary rings and boxes, and non-primary box numerals |
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
| `SECONDARY_RING_WIDTH` | `3` | the thick ink ring round a secondary's target |
| `SECONDARY_BOX_WIDTH` | `2` | the thicker frame on a secondary's numbered box |
| `LEADER_INK` | `#9aa5b1` | `#leaders`, the dotted lines from a notice row to its mark |
| `LEADER_WIDTH` | `1` | a leader's width |
| `LEADER_DASH` | `0.1 3` | a leader's round-dotted dash |

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
  the file serialises, not how it reads.
