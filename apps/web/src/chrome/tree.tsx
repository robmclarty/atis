/**
 * tree: the folder tree in the chrome's right-hand column, between the
 * notices and the shore rail (D208 (side-panels)): every file the map lists
 * under its directories, a row for each, lit where the map points and
 * pointing the map where a row is under the pointer. It reads the selection
 * and what is pointed at over the line to the world, and selects and points
 * through it too (D209 (selection-line)), so it is drawn and tested with no
 * world.
 *
 * It draws nothing yet: this is the mount and the props it is given, which
 * the column already hands it.
 */

import type { ReactElement } from 'react';
import type { MapJson } from 'core';

import type { Nav } from '../nav.js';
import type { Registry } from '../registry.js';

export type TreeProps = {
  /** The map as the frame the scrubber stands at shows it. */
  readonly map: MapJson;
  readonly registry: Registry;
  /** The line to the world (`nav.ts`): the selection and the pointing are read from it and set through it. */
  readonly nav: Nav;
};

export const Tree = (_props: TreeProps): ReactElement | null => null;
