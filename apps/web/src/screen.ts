/**
 * screen: how the sheet's type sizes read on a screen. The shared tokens set
 * the still sheet's sizes for a page (D130); the chrome reads them
 * `SCREEN_TYPE_UP` larger, in CSS pixels, so the notice text lands at the size
 * step 27 sets the world's labels and the rest keeps step with it. The offset
 * is a token like the sizes it moves, read live (D156). Pure, so a test reads
 * the sizes straight.
 */

/** The tokens the chrome's notice type is sized from. */
export type TypeLook = {
  readonly SCREEN_TYPE_UP: number;
  readonly NOTICE_TEXT_SIZE: number;
  readonly NOTICE_SMALL_SIZE: number;
  readonly NOTICE_BOX: number;
  readonly NOTICE_NUMERAL_SIZE: number;
};

/** The notice type as the screen sets it, from the live look: the text and the small type up by the offset, the box and its numeral a step less. */
export const screenType = (look: TypeLook): { readonly text: number; readonly small: number; readonly box: number; readonly numeral: number } => ({
  text: look.NOTICE_TEXT_SIZE + look.SCREEN_TYPE_UP,
  small: look.NOTICE_SMALL_SIZE + look.SCREEN_TYPE_UP,
  box: look.NOTICE_BOX + look.SCREEN_TYPE_UP - 1,
  numeral: look.NOTICE_NUMERAL_SIZE + look.SCREEN_TYPE_UP - 1,
});

/** The tokens the HUD's type is sized from. */
export type HudLook = {
  readonly SCREEN_TYPE_UP: number;
  readonly HUD_FONT_SIZE: number;
  readonly CATEGORY_FONT_SIZE: number;
  readonly HUD_BLOCK_HEIGHT: number;
};

/** The HUD's type as the screen sets it: each block's text and the category's larger letters up by the offset, and the block as tall again at each edge. */
export const hudType = (look: HudLook): { readonly text: number; readonly category: number; readonly height: number } => ({
  text: look.HUD_FONT_SIZE + look.SCREEN_TYPE_UP,
  category: look.CATEGORY_FONT_SIZE + look.SCREEN_TYPE_UP,
  height: look.HUD_BLOCK_HEIGHT + 2 * look.SCREEN_TYPE_UP,
});

/** The tokens the legend's type is sized from. */
export type LegendLook = { readonly SCREEN_TYPE_UP: number; readonly LEGEND_FONT_SIZE: number };

/** The legend's type as the screen sets it, and the scale its samples, drawn in the sheet's units, are shown at so they read at the words' size. */
export const legendType = (look: LegendLook): { readonly text: number; readonly scale: number } => ({
  text: look.LEGEND_FONT_SIZE + look.SCREEN_TYPE_UP,
  scale: (look.LEGEND_FONT_SIZE + look.SCREEN_TYPE_UP) / look.LEGEND_FONT_SIZE,
});
