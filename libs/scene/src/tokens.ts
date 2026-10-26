/**
 * tokens: every colour, stroke, font and size the still renderer draws with,
 * each named by what it means rather than by what it looks like (P3, C11),
 * and the motion the moving world times its animations with (D51). This file
 * is the single source those numbers are read from; `docs/design.md` is
 * written from it. It lives in the scene, beneath both renderers, so the SVG
 * and the world read one file and neither package imports the other (D130).
 *
 * Everything here is base tissue, and base tissue is greyscale and dim (§5.6,
 * D11): a near-black field, graphite terraces, membranes and organelles in a
 * blue-grey that is there to be found rather than seen. Nothing in this file
 * is luminous. Luminance means evidence and reach, and those are the
 * weather's to draw.
 */

/** Local generic families only: the SVG loads no web font (C5). */
export const FONT_FAMILY = 'ui-monospace, Menlo, Consolas, monospace';

/** The field: the near-black everything else is dim against. */
export const FIELD_FILL = '#0a0c0f';

/** The terraces: one faint strip per depth band, edged by its contour line. */
export const TERRACE_FILL = '#10141a';
export const TERRACE_LINE = '#222831';
export const TERRACE_LINE_WIDTH = 1;

/** The membranes: a dim skin over a dimmer, translucent body. */
export const MEMBRANE_STROKE = '#4b535e';
export const MEMBRANE_FILL = '#7a838e';
export const MEMBRANE_FILL_OPACITY = 0.08;

/** The organelles: the files, a shade above their cell's body. */
export const ORGANELLE_FILL = '#333a43';
export const ORGANELLE_STROKE = '#5f6873';
export const ORGANELLE_STROKE_WIDTH = 1;

/**
 * Shape means conformance (§5.1, D146): a file's outline morphs by how many
 * rules it breaks, 0 to 6 (fallow's four thresholds, a boundary violation and
 * a cycle). Round within every threshold, then a soft wobble, lobes, angular
 * protuberances, spikes, and at 5 and 6 spiked arms with bulbs at their tips.
 * Per level, by rule count: how many `arms` reach out round the body; how far
 * an arm reaches as a share of the radius (`reach`); how narrow it is, 1 a
 * smooth wave and higher a spike (`sharp`); a low two-lobed `wobble` that keeps
 * the gentle levels soft rather than geared; a `bulb` at each arm's tip as a
 * share of the radius; and how many points the outline is drawn through
 * (`samples`), enough to keep the narrowest spike sharp. The values are the
 * materials spike's, which Rob judged.
 */
export const SHAPE_LEVELS: readonly {
  readonly arms: number;
  readonly reach: number;
  readonly sharp: number;
  readonly wobble: number;
  readonly bulb: number;
  readonly samples: number;
}[] = [
  { arms: 0, reach: 0, sharp: 1, wobble: 0, bulb: 0, samples: 48 },
  { arms: 3, reach: 0.06, sharp: 1, wobble: 0.05, bulb: 0, samples: 48 },
  { arms: 4, reach: 0.13, sharp: 1.3, wobble: 0.07, bulb: 0, samples: 64 },
  { arms: 6, reach: 0.24, sharp: 2.4, wobble: 0.05, bulb: 0, samples: 72 },
  { arms: 9, reach: 0.4, sharp: 5, wobble: 0.03, bulb: 0, samples: 96 },
  { arms: 13, reach: 0.62, sharp: 11, wobble: 0.02, bulb: 0.1, samples: 128 },
  { arms: 18, reach: 0.85, sharp: 20, wobble: 0.02, bulb: 0.12, samples: 160 },
];
/** The body gives this share of an arm's reach back, so a spiked file keeps about the size its mass gave it (C11). */
export const SHAPE_CORE_GIVE = 0.2;
/** Each arm's own length varies by up to this share either way, seeded by the file's path, so no two files' spikes match. */
export const SHAPE_ARM_SPREAD = 0.3;
/**
 * A cell breaks a rule when one of its files does, and its membrane wears it
 * the same way: one point per rule pulled this far out of the skin, the skin
 * cut this far along either side of it so the point reads as a tooth.
 */
export const MEMBRANE_DENT_PULL = 8;
export const MEMBRANE_DENT_SPAN = 6;

/** Repetition means duplication (§5.1): the clone glyph, and how far outside the edge it sits, an organelle's or a cell's membrane's. */
export const GLYPH_STROKE = '#7b848f';
export const GLYPH_OFFSET = 4;

/**
 * The weather (§5.2) is the only luminous thing on the map, and each luminous
 * mark is luminous because it means something (§5.6). Hue is state: one
 * change hue for what this change touched, the IFR red of a failed slot and
 * a torn stitch, the LIFR magenta of a cycle or a boundary crossed (§5.3).
 * Luminance is reach and evidence. Texture is history (C11).
 */

/** The change hue (§5.3): added and modified files are stained with it, a deleted or renamed one outlined in it. */
export const CHANGE_HUE = '#5fd8ea';
export const CHANGE_OUTLINE_WIDTH = 1.5;
/** A renamed file: a dashed outline at its one position, its old path beside it (D40). */
export const RENAME_DASH = '3 2';
export const RENAME_LABEL_SIZE = 8;
export const RENAME_LABEL_GAP = 4;
/** Its leader: a dashed line this wide, in the change hue, from where the base put it to where it is (D40, D97). */
export const RENAME_LEADER_WIDTH = 1;

/**
 * Improvement (§5.2, §5.3, D98): health that got better is a calm-positive
 * state of its own, since "nothing to see" and "got better" are different
 * messages. A changed file a threshold, a dent, a clone family or a cycle
 * left wears it in place of the change hue, stained or outlined by its kind
 * as ever, in a pale mint no category block wears.
 */
export const IMPROVED_HUE = '#8be0b4';

/** The category hues the weather marks with (§5.3, D6): IFR for a red slot and a torn stitch, LIFR for a cycle or a boundary crossed. */
export const IFR_HUE = '#f0546a';
export const LIFR_HUE = '#e35ce0';

/**
 * Reach is luminance (C11): a warm light that fills the changed cell and,
 * one membrane on, the next cell dimmer (D5). The opacity at the origin and
 * the share kept per hop are chosen so that seven crossings out the glow
 * still writes a distinct value at two decimals.
 */
export const REACH_GLOW = '#f6e7c9';
export const REACH_ORIGIN_OPACITY = 0.45;
export const REACH_DECAY = 0.6;
export const REACH_BLUR = 6;
/** A barrel the reach crosses is lit at the crossing: a disc this far past its edge, this bright. */
export const CROSSING_PAD = 3;
export const CROSSING_OPACITY = 0.9;

/** Evidence is luminance too (C11): the gap in a changed skin, a live mutant's notch and a stitch that passed, in a pale light. */
export const EVIDENCE_LIGHT = '#e6edf3';
/**
 * The skin draws its gap, not its closure (D71): a ring this far past the
 * edge, the uncovered share lit at full strength this wide, which is 2.5px
 * at the canvas's native scale and so still reads on the smallest organelle,
 * and the covered share a hairline this wide at this strength.
 */
export const INTEGRITY_PAD = 1.25;
export const INTEGRITY_GAP_WIDTH = 2.5;
export const INTEGRITY_CLOSED_WIDTH = 1;
export const INTEGRITY_CLOSED_OPACITY = 0.3;
/** A live mutant: a lit notch cut through the skin, this wide across it, its point this far inside the edge, spread this far apart round the top of the ring. */
export const MUTANT_NOTCH_WIDTH = 4;
export const MUTANT_NOTCH_DEPTH = 2;
export const MUTANT_NOTCH_SPACING = Math.PI / 6;
/** A stitch: a short stroke across the edge, spread this far apart round the bottom of the ring; torn, it breaks by this gap. */
export const STITCH_LENGTH = 8;
export const STITCH_WIDTH = 2;
export const STITCH_SPACING = Math.PI / 6;
export const STITCH_TEAR = 2;
/** An unlit stitch: the test was not run, and not run is not a pass (C2). */
export const STITCH_UNLIT = '#6b7480';

/** An exceptional edge, the only drawn line (§5.1), bowed to the right of travel by this share of its length so a cycle reads as a lens. */
export const EDGE_WIDTH = 1;
export const EDGE_BOW = 0.15;
/** The arrowhead the edge ends in, its rendered size in user units; the triangle's own shape is fixed geometry, drawn in patterns.ts. */
export const ARROW_SIZE = 5;

/** A ghost, a missing co-change (§5.2): a dashed outline in a dim light this far outside the file's edge. */
export const GHOST_STROKE = '#7c8590';
export const GHOST_DASH = '2 2';
export const GHOST_PAD = 3;

/** A storm, a red slot on the change (§5.2, D68): a bolt and the slot's name, this far above the cell where it names a changed file. */
export const STORM_LABEL_SIZE = 8;
export const STORM_LABEL_GAP = 6;
export const STORM_LIFT = 10;
export const STORM_ROW = 14;
/**
 * A standing storm, a red slot over a cell the change did not touch (D68):
 * terrain rather than weather, so a bolt this much smaller, in graphite and
 * with no label, drawn beneath the weather.
 */
export const STANDING_STORM_FILL = '#58616b';
export const STANDING_STORM_SCALE = 0.6;

/** History is texture (C11): hatching for churn, stipple for bug-fix rate, one neutral ink at an opacity by value, full at these values. */
export const TEXTURE_INK = '#cfd6de';
export const TEXTURE_MAX_OPACITY = 0.7;
export const CHURN_FULL_AT = 3;
export const BUGFIX_FULL_AT = 0.5;
export const HATCH_PITCH = 4;
/** The one diagonal stroke each hatch tile is drawn with, this wide. */
export const HATCH_WIDTH = 1;
export const STIPPLE_PITCH = 4;
export const STIPPLE_DOT = 0.7;

/**
 * The whole-repo overlays (D101), each in the channel its measure owns (C11):
 * a dead file is lit full and each dead export a share of it, a clone family
 * echoes a file's outline in rings this far apart, and a baselined finding
 * is drawn in the standing state's graphite, muted (D49).
 */
export const OVERLAY_DEAD_EXPORT_LEVEL = 0.25;
export const OVERLAY_ECHO_GAP = 2.5;
export const OVERLAY_ECHO_WIDTH = 1;
export const OVERLAY_MUTED_STROKE = STANDING_STORM_FILL;

/**
 * The file level (§6's LOD3, D102): one file opened onto a plate of its own,
 * its functions as granules down its lines and a strip of its lines beside
 * them. The plate fills this share of the free screen's shorter side, the
 * strip takes this share of the plate's width, and each granule keeps this
 * share of its slot clear round it, so two functions never touch.
 */
export const FILE_PLATE_SCREEN = 0.72;
export const FILE_STRIP_SHARE = 0.14;
export const FILE_GRANULE_PAD = 0.12;

/**
 * The chrome (§7, D12) is the other material: flat blocks, hard edges, high
 * contrast, one monospace face, and technical-drawing annotations. Nothing
 * here glows, blurs or grades. It frames the world on its own flat ground,
 * a shade above the field so the frame reads as a sheet and not as more
 * field, with a hard rule wherever it meets the world.
 */
export const CHROME_GROUND = '#1a1f27';
export const CHROME_RULE = '#2b333d';
/** The brutalist hairline (D12): the width of a framed HUD block, a tertiary notice box, and the hard rule where the chrome meets the world. */
export const CHROME_STROKE_WIDTH = 1;
/** The default ink, the evidence light's colour, so it stays in the chrome's own blocks and never rings a skin on the map (D72). */
export const CHROME_INK = '#e6edf3';
export const CHROME_MUTED = '#6b7480';
/** The quiet edge the chrome keeps between its ground and what it writes. */
export const CHROME_PAD = 10;
/** A muted block's value: the dash that stands where a number would be faked (C2, D41). */
export const MUTED_DASH = '—';
/**
 * The advance of one monospace glyph as a share of the font size: the widest
 * among `FONT_FAMILY`'s faces and a viewer's fallback. The SVG loads no font
 * (C5), so the chrome sizes its blocks and wraps its text from this estimate,
 * and an estimate narrower than the face a viewer draws with runs the text out
 * of its box. SF Mono, which `ui-monospace` is on macOS, advances 1266/2048,
 * about 0.618, the widest measured (Menlo 0.602; Courier New, DejaVu Sans Mono
 * and Liberation Mono 0.600; Consolas 0.550); rounded up, so every narrower
 * face lands inside the padding.
 */
export const MONO_ADVANCE = 0.62;
/** Where a label's baseline sits to centre it on a mark, as a share of its font size, so a number rides level with the shape it names. */
export const LABEL_BASELINE = 0.35;

/** The category hues (§5.3, D6): VFR green, MVFR blue, IFR red, LIFR magenta; the letters always ride beside the hue (C11). NOINST has none. */
export const VFR_HUE = '#4fd37a';
export const MVFR_HUE = '#5b8def';
/** The ink the category letters are written in, on their solid block. */
export const CATEGORY_LETTERS = '#0a0c0f';

/** The HUD strip: one row of grade blocks, wrapping only when the canvas is too narrow for them. */
export const HUD_PAD = 8;
export const HUD_BLOCK_HEIGHT = 20;
export const HUD_BLOCK_PAD = 6;
export const HUD_BLOCK_GAP = 3;
export const HUD_FONT_SIZE = 9;
export const CATEGORY_FONT_SIZE = 13;

/**
 * The shore (D48, D153): no longer land on the terrain but flat blocks in the
 * chrome, one per group, in the SVG a band wrapping along the foot of the
 * sheet under the world (D158). A block's text is set this size, a line this
 * tall, inside this padding, the blocks this far apart; an open block is at
 * most this wide and names at most this many files before saying how many
 * more; each named file wears its mark, a disc this big, before its path. A
 * touched block opens on a grid of its group's files first (D160): one flat
 * square per file, this big and this far apart, wrapped to the block's width.
 */
export const SHORE_FONT_SIZE = 8;
export const SHORE_LINE = 11;
export const SHORE_BLOCK_PAD = 5;
export const SHORE_BLOCK_GAP = 6;
export const SHORE_BLOCK_WIDTH = 240;
export const SHORE_FILES_SHOWN = 6;
export const SHORE_MARK_R = 2.5;
export const SHORE_GRID_CELL = 4;
export const SHORE_GRID_GAP = 1;

/** The notice column (§5.4): the width the frame reserves, and the type each row is set in. */
export const NOTICE_COLUMN = 300;
export const NOTICE_TEXT_SIZE = 8;
export const NOTICE_SMALL_SIZE = 7;
export const NOTICE_LEADING = 1.3;
export const NOTICE_ROW_GAP = 10;
/** The numbered box each notice is marked with, in its row and at its target. */
export const NOTICE_BOX = 10;
export const NOTICE_NUMERAL_SIZE = 7;
export const NOTICE_BOX_GAP = 3;
export const NOTICE_TEXT_GAP = 5;

/**
 * Tier emphasis on the map (§5.4): a ring past the evidence skin, thin in
 * the category hue for the primary, thick in the leaders' grey for a
 * secondary (D72). The secondary's inner edge, at `EMPHASIS_PAD` less half
 * its width, sits past the lit gap's outer edge, at `INTEGRITY_PAD` plus
 * half the gap's width, so a band of dark field always parts the two.
 */
export const EMPHASIS_PAD = 5;
export const PRIMARY_RING_WIDTH = 1.5;
export const SECONDARY_RING_WIDTH = 3;
export const SECONDARY_BOX_WIDTH = 2;
/** The dotted leader from a notice's row to its mark (§5.6): thin grey ink, round dots. The secondary ring borrows this grey, so the chrome on the map is never the evidence light. */
export const LEADER_INK = '#9aa5b1';
export const LEADER_WIDTH = 1;
export const LEADER_DASH = '0.1 3';
/** How much larger the sheet's type sizes read in the world's chrome, in CSS pixels: the notice text lands at the size the world's labels are set at, and the HUD, the rail and the legend keep step (`apps/web/src/screen.ts`). The still sheet never reads it. */
export const SCREEN_TYPE_UP = 3;

/**
 * The legend inset (D87): a key in the chrome's own flat material at the
 * foot of the notice column, one numbered row per mark, each a small sample
 * of the mark beside a few words. A row is this tall, its sample drawn on a
 * file this big, its words set this size this far past the sample's slot.
 */
export const LEGEND_ROW = 18;
export const LEGEND_SAMPLE_R = 5;
export const LEGEND_SLOT = 24;
export const LEGEND_FONT_SIZE = 7;
export const LEGEND_PAD = 6;
/** The key of the seven shapes under the numbered rows (D146): one form per rule count, this far apart, on a file of `LEGEND_SAMPLE_R`. */
export const LEGEND_KEY_PITCH = 18;

/**
 * The practice map's callouts (D87, D125): a numbered balloon, the
 * technical drawing's own mark, ringed in the chrome's ink on its ground
 * and joined to its mark by a solid line, so it reads as neither a notice's
 * square box nor its dotted leader. It sits this far from the mark, this big.
 */
export const CALLOUT_R = 7;
export const CALLOUT_REACH = 22;
export const CALLOUT_FONT_SIZE = 7;
/** The clear ground a balloon keeps round it: off a notice's marks, the column, the HUD strip and every other balloon. */
export const CALLOUT_CLEARANCE = 2;

/**
 * Motion (§5.5, D51): the timings, intensities and spring constants the
 * world's scheduler animates with, beside the colours so the still and the
 * moving renderer read one file. The still SVG draws none of them (C10).
 * At the surface motion means urgency (C11), and its budget is §5.5's: at
 * most one flare in flight, transients of 600 ms or less and cross-fades of
 * 300 ms or less (C12). Inside an opened cell it also means conformance, each
 * file's shape moving by the rules it breaks (D147), which lifted §5.5's one
 * continuous mover. Each value is where the materials spike left it; a balance
 * patch moves it, and `docs/design.md`'s motion table logs the patch (Q3).
 * Durations are in milliseconds.
 */

/**
 * The load settle, the one moment the whole surface moves: the skin drops
 * from this far above the terrain, in the heightfield's units, onto it
 * inside this long, on a spring with this damping ratio, so it lands with a
 * small overshoot rather than a bounce.
 */
export const SETTLE_MS = 400;
export const SETTLE_LIFT = 18;
export const SETTLE_DAMPING = 0.72;

/**
 * A flare, the loud channel, spent deliberately: a burst this long that adds
 * this many times a notice's own light at its peak and swells its glow by
 * this share. The primary flares once on load, then at random.
 */
export const FLARE_MS = 600;
export const FLARE_GAIN = 3;
export const FLARE_GROW = 0.45;

/** The primary's breathing, the one continuous mover: its glow swells and shrinks by this share of its radius, once each period. */
export const BREATHE_PERIOD_MS = 2000;
export const BREATHE_AMPLITUDE = 0.03;

/**
 * Random flares: the primary's next comes after a wait drawn between these
 * two; a secondary's comes rarer, between these, at this share of the
 * primary's intensity. Tertiaries and everything else never flare.
 */
export const PRIMARY_FLARE_MIN_MS = 8000;
export const PRIMARY_FLARE_MAX_MS = 20000;
export const SECONDARY_FLARE_MIN_MS = 40000;
export const SECONDARY_FLARE_MAX_MS = 90000;
export const SECONDARY_FLARE_GAIN = 0.5;

/**
 * The jiggle when the camera lands on a cell or a cell opens: the skin's
 * relief swings by this share at this frequency, and the swing decays
 * through this many e-folds across this long, so it is at rest by the time
 * it stops. A transient; it never repeats on its own.
 */
export const JIGGLE_MS = 600;
export const JIGGLE_AMPLITUDE = 0.22;
export const JIGGLE_HZ = 3.2;
export const JIGGLE_DECAY = 4.5;

/** The eases: a hover's highlight, a fly-to from a notice, and the cross-fade between levels of detail, which is never a blink. */
export const HOVER_MS = 100;
export const FLY_TO_MS = 400;
export const LOD_FADE_MS = 300;

/**
 * Conformance in motion, inside an opened cell (D147): by rule count, 0 to 6,
 * how fast a file's arms pulse (Hz), how far (a share of their reach), and how
 * fast its body turns (radians a second). Still at 0, faster and further as
 * the level climbs; reduced motion stills them all.
 */
export const SHAPE_PULSE_HZ: readonly number[] = [0, 0.25, 0.4, 0.6, 0.85, 1.15, 1.5];
export const SHAPE_PULSE: readonly number[] = [0, 0.25, 0.3, 0.32, 0.35, 0.38, 0.42];
export const SHAPE_TURN: readonly number[] = [0, 0.03, 0.05, 0.08, 0.11, 0.15, 0.2];

/**
 * Looseness in motion, inside an opened cell (D157), slow and on the screen's
 * scale (D165): each file wanders about its place by the share of its import
 * ties that leave the cell, a hub held by its cellmates barely moving and a
 * file tied to none of them wandering furthest. Its wander runs along two
 * sines at seeded rates between these two (Hz), reaches this share of its
 * cell's radius when it is wholly loose, keeps this far off its neighbours and
 * the membrane, and eases in over this long when the cell opens. Nothing in
 * the float moves a file more than this share of the screen's shorter side a
 * second: zoomed in, the wander's clock slows until it keeps to that, so the
 * float reads as slow at every zoom.
 */
export const DRIFT_HZ_MIN = 0.03;
export const DRIFT_HZ_MAX = 0.08;
export const DRIFT_REACH = 0.15;
export const DRIFT_SPEED = 0.02;
export const DRIFT_GAP = 1;
export const DRIFT_EASE_MS = 600;
