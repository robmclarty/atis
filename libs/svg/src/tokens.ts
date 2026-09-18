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
