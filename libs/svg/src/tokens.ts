/**
 * tokens: every colour, stroke, font and size the still renderer draws with,
 * each named by what it means rather than by what it looks like (P3, C11).
 * This file is the single source those numbers are read from; step 21 writes
 * `docs/design.md` from it.
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

/** The shore: land above the abyss (D48), a shade lighter than the terraces. */
export const SHORE_FILL = '#161b21';
export const SHORE_CONTOUR = '#3b434d';
export const SHORE_CONTOUR_WIDTH = 1;
export const SHORE_MARK = '#2d343c';
export const SHORE_LABEL = '#5d6670';
export const SHORE_LABEL_SIZE = 8;
/** How far a group's label sits above the top of its skin. */
export const SHORE_LABEL_GAP = 3;

/** The membranes: a dim skin over a dimmer, translucent body. */
export const MEMBRANE_STROKE = '#4b535e';
export const MEMBRANE_FILL = '#7a838e';
export const MEMBRANE_FILL_OPACITY = 0.08;

/** The organelles: the files, a shade above their cell's body. */
export const ORGANELLE_FILL = '#333a43';
export const ORGANELLE_STROKE = '#5f6873';
export const ORGANELLE_STROKE_WIDTH = 1;

/**
 * Shape means conformance (§5.1): an organelle with dents is a polygon of this
 * many vertices, and each breached rule pulls one of them out to this multiple
 * of the radius.
 */
export const DENT_VERTICES = 12;
export const DENT_PULL = 1.4;

/** Repetition means duplication (§5.1): the clone glyph, and how far outside the edge it sits. */
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

/** Evidence is luminance too (C11): the closed part of a changed skin and a stitch that passed, in a pale light. */
export const EVIDENCE_LIGHT = '#e6edf3';
/** The skin: a ring this far past the edge, open all round in the dark this wide, closed in the light this wide. */
export const INTEGRITY_PAD = 1;
export const INTEGRITY_GAP_WIDTH = 2.5;
export const INTEGRITY_WIDTH = 1.5;
/** A live mutant: a small dent in the skin, this big, spread this far apart round the top of the ring. */
export const MUTANT_DENT_RADIUS = 2.5;
export const MUTANT_DENT_SPACING = Math.PI / 6;
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

/** A storm, a red slot (§5.2): a bolt and the slot's name, this far above the cell it names or in from the field's corner. */
export const STORM_LABEL_SIZE = 8;
export const STORM_LABEL_GAP = 6;
export const STORM_LIFT = 10;
export const STORM_ROW = 14;
export const STORM_INSET = 12;

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
export const CHROME_INK = '#e6edf3';
export const CHROME_MUTED = '#6b7480';
/** The quiet edge the chrome keeps between its ground and what it writes. */
export const CHROME_PAD = 10;
/** A muted block's value: the dash that stands where a number would be faked (C2, D41). */
export const MUTED_DASH = '—';
/**
 * The advance of one monospace glyph as a share of the font size. The SVG
 * loads no font (C5), so the chrome sizes its blocks and wraps its text from
 * this estimate; the local face lands within the padding either way.
 */
export const MONO_ADVANCE = 0.6;
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

/** Tier emphasis on the map (§5.4): a ring past the evidence skin, thin in the category hue for the primary, thick in ink for a secondary. */
export const EMPHASIS_PAD = 5;
export const PRIMARY_RING_WIDTH = 1.5;
export const SECONDARY_RING_WIDTH = 3;
export const SECONDARY_BOX_WIDTH = 2;
/** The dotted leader from a notice's row to its mark (§5.6): thin ink, round dots. */
export const LEADER_INK = '#9aa5b1';
export const LEADER_WIDTH = 1;
export const LEADER_DASH = '0.1 3';
