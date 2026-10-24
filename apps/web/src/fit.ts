/**
 * fit: how the world is framed beside the chrome. The shore rail stands at
 * the canvas's right edge (D153), so the terrain is fitted into the screen
 * left of it, not under it: the world frames the terrain alone. Pure
 * arithmetic over pixels and layout units, so a test needs no camera.
 */

/** The rail's width in CSS pixels, the chrome's claim on the canvas's right edge. */
export const RAIL_WIDTH = 260;

/** The free screen the terrain is fitted into: the canvas less what the chrome covers on the right. */
export type Chrome = { readonly right: number };

/**
 * An orthographic frame over the layout: half the view's height and width in
 * layout units, and how far the view's centre stands right of the layout's,
 * so the layout sits centred in the free area. At zoom 1 the layout fits the
 * free area with no margin; a canvas narrower than the chrome frames into
 * what is left, never into nothing.
 */
export type Frame = { readonly halfW: number; readonly halfH: number; readonly shift: number };

export const fitFrame = (layout: { readonly width: number; readonly height: number }, canvasWidth: number, canvasHeight: number, chrome: Chrome): Frame => {
  const width = Math.max(1, canvasWidth);
  const height = Math.max(1, canvasHeight);
  const free = Math.max(1, width - chrome.right);
  // Layout units per pixel: the larger of what the free width and the height each demand.
  const perPixel = Math.max(layout.width / free, layout.height / height);
  const halfH = (perPixel * height) / 2;
  const halfW = (perPixel * width) / 2;
  // The free area's centre is half the rail left of the canvas's; the view moves right by that much so the layout centres in the free area.
  return { halfW, halfH, shift: (perPixel * (width - free)) / 2 };
};

/** A stretch of the layout to frame: its left, top, right and bottom, in layout units. */
export type Box = { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };

/**
 * The camera's zoom over the fit at which a box fills `share` of the free
 * screen in whichever of its width and height it fills first, so a fly-to
 * frames its stop with room round it. A box with no extent is taken as a
 * unit across.
 */
export const zoomFor = (layout: { readonly width: number; readonly height: number }, box: Box, canvasWidth: number, canvasHeight: number, chrome: Chrome, share: number): number => {
  const { halfH } = fitFrame(layout, canvasWidth, canvasHeight, chrome);
  const height = Math.max(1, canvasHeight);
  const perPixel = (2 * halfH) / height;
  const free = Math.max(1, Math.max(1, canvasWidth) - chrome.right);
  return Math.min((free * perPixel * share) / Math.max(1, box.x1 - box.x0), (height * perPixel * share) / Math.max(1, box.y1 - box.y0));
};
