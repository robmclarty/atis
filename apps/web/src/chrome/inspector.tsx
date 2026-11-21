/**
 * inspector: the panel beside the notice column that says what is selected
 * (D208 (side-panels)): a module's facts, files, exports and wiring, a file's
 * facts, functions, code and diff, and with nothing selected a reading of the
 * map from its structure alone. It reads the selection and what is pointed at
 * over the line to the world, and selects and points through it too (D209
 * (selection-line)), so it is drawn and tested with no world. The run's token
 * is what a served file's text and diff are asked with, none for a fixture,
 * and the PR's link stands beside a diff when the page was told one.
 *
 * It draws nothing yet: this is the mount and the props it is given, which
 * the frame already hands it.
 */

import type { ReactElement } from 'react';
import type { MapJson } from 'core';

import type { Nav } from '../nav.js';
import type { Registry } from '../registry.js';

export type InspectorProps = {
  /** The map as the frame the scrubber stands at shows it. */
  readonly map: MapJson;
  readonly registry: Registry;
  /** The line to the world (`nav.ts`): the selection and the pointing are read from it and set through it. */
  readonly nav: Nav;
  /** The run's token when the map is served (D134); none for a fixture, whose files no server reads. */
  readonly token?: string | undefined;
  /** The PR the page was told of, when it was. */
  readonly pr?: string | undefined;
};

export const Inspector = (_props: InspectorProps): ReactElement | null => null;
