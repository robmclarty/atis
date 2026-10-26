/**
 * frames: a range's weather frames as the app shows them (D100). A map of
 * `--range a..b` holds one frame per commit over its one terrain, the last the
 * map's own weather; the scrubber steps through them and the world and the
 * chrome draw the frame it stands at. `frameMap` is that frame as a map: the
 * same terrain under the commit's weather and notices, its evidence muted
 * where the commit read no `.check/` of its own (D135), so every reader of a
 * map reads a frame unchanged. Pure, so a test reads it straight.
 */

import type { Frame, Instruments, MapJson } from 'core';

/** A range's frames, oldest first; none for a map of one change. */
export const framesOf = (map: MapJson): readonly Frame[] => map.sequence?.frames ?? [];

/** The frame a map opens on: the last, which is the map's own weather; none for a map of one change. */
export const lastFrame = (map: MapJson): number | undefined => {
  const count = framesOf(map).length;
  return count === 0 ? undefined : count - 1;
};

/** The instruments a frame was read with: the map's own where the frame read `.check/`, else git-only with the reason it read none (D135, C2). */
const instrumentsOf = (map: MapJson, frame: Frame): Instruments => {
  const { reason } = frame.weather.checks;
  if (reason === undefined) return map.meta.instruments;
  const { mode: _mode, reason: _reason, stale: _stale, muted: _muted, fallow_schemas: _schemas, ...kept } = map.meta.instruments;
  return { ...kept, mode: 'git-only', reason };
};

/**
 * The map as the frame at `index` shows it: the one terrain under that
 * commit's weather and notices, its head that commit. The map itself for a
 * map of one change, an index it does not hold, or its last frame, which is
 * its own weather.
 */
export const frameMap = (map: MapJson, index: number | undefined): MapJson => {
  const frames = framesOf(map);
  const frame = index === undefined ? undefined : frames[index];
  if (frame === undefined || index === frames.length - 1) return map;
  return { ...map, meta: { ...map.meta, head: frame.commit, instruments: instrumentsOf(map, frame) }, weather: frame.weather, notices: frame.notices };
};

/** The keys that step the scrubber: `,` back a commit and `.` on one, the frame-step keys of a video player. */
const SCRUB_KEYS: Readonly<Record<string, -1 | 1>> = { ',': -1, '.': 1 };

/** The frame a step from `index` lands on, held at the range's two ends; none when the key steps nothing or the map holds no frames. */
export const stepped = (map: MapJson, index: number | undefined, key: string): number | undefined => {
  const step = SCRUB_KEYS[key];
  const last = lastFrame(map);
  if (step === undefined || last === undefined) return undefined;
  return Math.min(last, Math.max(0, (index ?? last) + step));
};

/** How many characters of a commit's sha the scrubber writes. */
const SHORT_SHA = 7;

/** What the scrubber writes of the frame it stands at: where it is in the range, the commit's short sha and its subject. */
export const captionOf = (map: MapJson, index: number): string => {
  const frames = framesOf(map);
  const frame = frames[index];
  if (frame === undefined) return '';
  return `${String(index + 1)}/${String(frames.length)} ${frame.commit.slice(0, SHORT_SHA)} ${frame.subject}`;
};
