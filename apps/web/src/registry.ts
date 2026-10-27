/**
 * registry: every token the world draws and times with, in the one place the
 * dev panel writes (D156). The scene's tokens (`libs/scene/src/tokens.ts`) and
 * the world's materials (`materials.ts`) rest at their exported values; the
 * registry holds the session's overrides over them, and every world material
 * and the scheduler read their tokens through it, so a change shows on the
 * next frame. It lists them by the sections `docs/design.md` gives them, the
 * world's materials among them.
 *
 * Overrides last for the session, in the store the registry is handed (the
 * tab's `sessionStorage`), so a reload keeps a tuning under way. A fresh tab
 * starts at rest, which is what a `--png` capture and a glance reading open.
 */

import * as scene from 'scene';

import { BLOOM, CAMERA, HOVER, INTERIOR, LEVELS, LIGHTING, NOTICE, PLANET, SKIN, SKY, SPACE, WALK, WEATHER } from './materials.js';

/** One section of the panel: the design doc's heading and the tokens its table names, in the table's order. */
export type Section = { readonly title: string; readonly names: readonly string[] };

/** The world's material objects, each field a token named `OBJECT.field`. */
const MATERIALS: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {
  SKIN,
  SPACE,
  PLANET,
  LIGHTING,
  SKY,
  BLOOM,
  WEATHER,
  NOTICE,
  RELIEF: scene.RELIEF,
  LEVELS,
  CAMERA,
  CINEMA: scene.CINEMA,
  HOVER,
  WALK,
  MINIMAP: scene.MINIMAP,
  INTERIOR,
  WIRING: scene.WIRING_SPACING,
};

const fieldsOf = (object: string): readonly string[] => Object.keys(MATERIALS[object] ?? {}).map((field) => `${object}.${field}`);

/** The world's materials, under the design doc's heading for them; each field is `OBJECT.field`. */
export const MATERIALS_TITLE = 'World materials';

/** The sections, `docs/design.md`'s headings and tables verbatim, with the materials before the motion. */
export const SECTIONS: readonly Section[] = [
  { title: 'Type', names: ['FONT_FAMILY', 'MONO_ADVANCE', 'LABEL_BASELINE'] },
  {
    title: 'Base tissue (the dim ground)',
    names: [
      'FIELD_FILL',
      'TERRACE_FILL',
      'TERRACE_LINE',
      'TERRACE_LINE_WIDTH',
      'MEMBRANE_STROKE',
      'MEMBRANE_FILL',
      'MEMBRANE_FILL_OPACITY',
      'ORGANELLE_FILL',
      'ORGANELLE_STROKE',
      'ORGANELLE_STROKE_WIDTH',
      'SHAPE_LEVELS',
      'SHAPE_CORE_GIVE',
      'SHAPE_ARM_SPREAD',
      'MEMBRANE_DENT_PULL',
      'MEMBRANE_DENT_SPAN',
      'GLYPH_STROKE',
      'GLYPH_OFFSET',
    ],
  },
  {
    title: 'State (hue)',
    names: [
      'CHANGE_HUE',
      'CHANGE_OUTLINE_WIDTH',
      'RENAME_DASH',
      'RENAME_LABEL_SIZE',
      'RENAME_LABEL_GAP',
      'RENAME_LEADER_WIDTH',
      'IMPROVED_HUE',
      'VFR_HUE',
      'MVFR_HUE',
      'IFR_HUE',
      'LIFR_HUE',
      'CATEGORY_LETTERS',
      'EDGE_WIDTH',
      'EDGE_BOW',
      'ARROW_SIZE',
    ],
  },
  {
    title: 'Reach and evidence (luminance)',
    names: [
      'REACH_GLOW',
      'REACH_ORIGIN_OPACITY',
      'REACH_DECAY',
      'REACH_BLUR',
      'CROSSING_PAD',
      'CROSSING_OPACITY',
      'EVIDENCE_LIGHT',
      'INTEGRITY_PAD',
      'INTEGRITY_GAP_WIDTH',
      'INTEGRITY_CLOSED_WIDTH',
      'INTEGRITY_CLOSED_OPACITY',
      'MUTANT_NOTCH_WIDTH',
      'MUTANT_NOTCH_DEPTH',
      'MUTANT_NOTCH_SPACING',
      'STITCH_LENGTH',
      'STITCH_WIDTH',
      'STITCH_SPACING',
      'STITCH_TEAR',
      'STITCH_UNLIT',
    ],
  },
  {
    title: 'History (texture)',
    names: ['TEXTURE_INK', 'TEXTURE_MAX_OPACITY', 'CHURN_FULL_AT', 'BUGFIX_FULL_AT', 'HATCH_PITCH', 'HATCH_WIDTH', 'STIPPLE_PITCH', 'STIPPLE_DOT'],
  },
  {
    title: 'Ghosts and storms',
    names: ['GHOST_STROKE', 'GHOST_DASH', 'GHOST_PAD', 'STORM_LABEL_SIZE', 'STORM_LABEL_GAP', 'STORM_LIFT', 'STORM_ROW', 'STANDING_STORM_FILL', 'STANDING_STORM_SCALE'],
  },
  {
    title: "The whole repo's overlays",
    names: ['OVERLAY_DEAD_EXPORT_LEVEL', 'OVERLAY_ECHO_GAP', 'OVERLAY_ECHO_WIDTH', 'OVERLAY_MUTED_STROKE'],
  },
  {
    title: 'The file level',
    names: ['FILE_PLATE_SCREEN', 'FILE_STRIP_SHARE', 'FILE_GRANULE_PAD'],
  },
  {
    title: 'Chrome (the brutalist frame)',
    names: [
      'CHROME_GROUND',
      'CHROME_RULE',
      'CHROME_STROKE_WIDTH',
      'CHROME_INK',
      'CHROME_MUTED',
      'CHROME_PAD',
      'MUTED_DASH',
      'HUD_PAD',
      'HUD_BLOCK_HEIGHT',
      'HUD_BLOCK_PAD',
      'HUD_BLOCK_GAP',
      'HUD_FONT_SIZE',
      'CATEGORY_FONT_SIZE',
      'NOTICE_COLUMN',
      'NOTICE_TEXT_SIZE',
      'NOTICE_SMALL_SIZE',
      'NOTICE_LEADING',
      'NOTICE_ROW_GAP',
      'NOTICE_BOX',
      'NOTICE_NUMERAL_SIZE',
      'NOTICE_BOX_GAP',
      'NOTICE_TEXT_GAP',
      'EMPHASIS_PAD',
      'PRIMARY_RING_WIDTH',
      'SECONDARY_RING_WIDTH',
      'SECONDARY_BOX_WIDTH',
      'LEADER_INK',
      'LEADER_WIDTH',
      'LEADER_DASH',
      'SCREEN_TYPE_UP',
    ],
  },
  {
    title: "The shore's band",
    names: ['SHORE_FONT_SIZE', 'SHORE_LINE', 'SHORE_BLOCK_PAD', 'SHORE_BLOCK_GAP', 'SHORE_BLOCK_WIDTH', 'SHORE_FILES_SHOWN', 'SHORE_MARK_R', 'SHORE_GRID_CELL', 'SHORE_GRID_GAP'],
  },
  {
    title: "The legend inset and the practice map's balloons",
    names: ['LEGEND_ROW', 'LEGEND_SAMPLE_R', 'LEGEND_SLOT', 'LEGEND_FONT_SIZE', 'LEGEND_PAD', 'LEGEND_KEY_PITCH', 'CALLOUT_R', 'CALLOUT_REACH', 'CALLOUT_FONT_SIZE', 'CALLOUT_CLEARANCE'],
  },
  { title: MATERIALS_TITLE, names: [...fieldsOf('SKIN'), ...fieldsOf('SPACE'), ...fieldsOf('PLANET'), ...fieldsOf('LIGHTING'), ...fieldsOf('SKY'), ...fieldsOf('BLOOM'), ...fieldsOf('WEATHER'), ...fieldsOf('NOTICE'), ...fieldsOf('RELIEF'), ...fieldsOf('LEVELS'), ...fieldsOf('CAMERA'), ...fieldsOf('CINEMA'), ...fieldsOf('HOVER'), ...fieldsOf('WALK'), ...fieldsOf('MINIMAP'), ...fieldsOf('INTERIOR'), ...fieldsOf('WIRING')] },
  {
    title: 'Motion',
    names: [
      'SETTLE_MS',
      'SETTLE_LIFT',
      'SETTLE_DAMPING',
      'FLARE_MS',
      'FLARE_GAIN',
      'FLARE_GROW',
      'BREATHE_PERIOD_MS',
      'BREATHE_AMPLITUDE',
      'PRIMARY_FLARE_MIN_MS',
      'PRIMARY_FLARE_MAX_MS',
      'SECONDARY_FLARE_MIN_MS',
      'SECONDARY_FLARE_MAX_MS',
      'SECONDARY_FLARE_GAIN',
      'JIGGLE_MS',
      'JIGGLE_AMPLITUDE',
      'JIGGLE_HZ',
      'JIGGLE_DECAY',
      'HOVER_MS',
      'FLY_TO_MS',
      'LOD_FADE_MS',
      'SHAPE_PULSE_HZ',
      'SHAPE_PULSE',
      'SHAPE_TURN',
      'DRIFT_HZ_MIN',
      'DRIFT_HZ_MAX',
      'DRIFT_REACH',
      'DRIFT_SPEED',
      'DRIFT_GAP',
      'DRIFT_EASE_MS',
    ],
  },
];

/** What a token's value is, which picks the panel's control for it: a number, a `#rrggbb` colour, other text, a list of numbers, or anything else as JSON. */
export type Kind = 'number' | 'colour' | 'text' | 'numbers' | 'json';

/** A `#rrggbb` colour, the one string the colour control can hold. */
export const isColour = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

/** A list of numbers, one control per entry. */
export const isNumbers = (value: unknown): value is readonly number[] => Array.isArray(value) && value.every((each) => typeof each === 'number');

export const kindOf = (value: unknown): Kind => {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') return isColour(value) ? 'colour' : 'text';
  if (isNumbers(value)) return 'numbers';
  return 'json';
};

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** The scene's exports by name; a token is one of them. */
const SCENE: Readonly<Record<string, unknown>> = { ...scene };

/** Where a token rests: its exported value, `OBJECT.field` read from the material object. */
const restOf = (name: string): unknown => {
  const dot = name.indexOf('.');
  if (dot < 0) return SCENE[name];
  return MATERIALS[name.slice(0, dot)]?.[name.slice(dot + 1)];
};

/** Where the session's overrides are kept between reloads: a read and a write of one text. */
export type Store = { readonly read: () => string | null; readonly write: (text: string) => void };

/** A token that has moved: from where it rests to where it is. */
export type Change = { readonly name: string; readonly from: unknown; readonly to: unknown };

export type Registry = {
  readonly sections: readonly Section[];
  /** Every token's name, in the sections' order. */
  readonly names: readonly string[];
  /** A token's value now. */
  readonly get: (name: string) => unknown;
  /** Where the token rests. */
  readonly rest: (name: string) => unknown;
  /** Move a token; setting it back to where it rests clears the override. An unknown name, or a value of another kind than the token rests at, is refused. */
  readonly set: (name: string, value: unknown) => void;
  /** Put one token back where it rests, or every token. */
  readonly reset: (name?: string) => void;
  /** Every token that has moved, in the sections' order. */
  readonly changes: () => readonly Change[];
  /** Hear the name of each token as it moves. */
  readonly subscribe: (listener: (name: string) => void) => () => void;
  /** How many times a token has moved, for a hook to re-render on. */
  readonly version: () => number;
  /**
   * A live view in the shape of a resting object: each of its properties reads
   * the registry as it is read, so whoever holds it sees a change on its next
   * read. Given a material's name (`SKIN`), the shape's fields are that
   * object's; with none, they are scene tokens.
   */
  readonly view: <T extends object>(shape: T, object?: string) => T;
};

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** The stored overrides, or none when the store holds nothing readable. */
const stored = (store: Store | undefined): Readonly<Record<string, unknown>> => {
  try {
    const parsed: unknown = JSON.parse(store?.read() ?? 'null');
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

export const createRegistry = (store?: Store): Registry => {
  const names = SECTIONS.flatMap((section) => section.names);
  const known = new Set(names);
  const overrides = new Map<string, unknown>();
  const listeners = new Set<(name: string) => void>();
  let version = 0;

  // A stored entry stands only for a token this build knows, of the kind it rests at, and off its rest value.
  for (const [name, value] of Object.entries(stored(store))) {
    if (known.has(name) && kindOf(value) === kindOf(restOf(name)) && !same(value, restOf(name))) overrides.set(name, value);
  }

  const persist = (): void => store?.write(JSON.stringify(Object.fromEntries(overrides)));
  const notify = (name: string): void => {
    version += 1;
    listeners.forEach((listener) => listener(name));
  };
  const get = (name: string): unknown => (overrides.has(name) ? overrides.get(name) : restOf(name));

  const set = (name: string, value: unknown): void => {
    if (!known.has(name)) throw new Error(`no token is named ${name}`);
    const kind = kindOf(restOf(name));
    if (kindOf(value) !== kind) throw new Error(`${name} is a ${kind}, not ${kindOf(value) === 'json' ? JSON.stringify(value) : String(value)}`);
    if (same(value, restOf(name))) overrides.delete(name);
    else overrides.set(name, value);
    persist();
    notify(name);
  };

  const reset = (name?: string): void => {
    if (name !== undefined) {
      set(name, restOf(name));
      return;
    }
    const moved = [...overrides.keys()];
    overrides.clear();
    persist();
    moved.forEach(notify);
  };

  const view = <T extends object>(shape: T, object?: string): T => {
    const prefix = object === undefined ? '' : `${object}.`;
    return new Proxy(shape, {
      get: (target, key, receiver): unknown => (typeof key === 'string' && known.has(prefix + key) ? get(prefix + key) : Reflect.get(target, key, receiver)),
    });
  };

  return {
    sections: SECTIONS,
    names,
    get,
    rest: restOf,
    set,
    reset,
    changes: () => names.filter((name) => overrides.has(name)).map((name) => ({ name, from: restOf(name), to: overrides.get(name) })),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    version: () => version,
    view,
  };
};

/** Where the overrides live in the tab. */
const KEY = 'atis.tokens';

/** The tab's `sessionStorage` as a store, or none where the page has no storage. */
export const sessionStore = (): Store | undefined => {
  if (!('sessionStorage' in globalThis)) return undefined;
  const storage = globalThis.sessionStorage;
  return { read: () => storage.getItem(KEY), write: (text) => storage.setItem(KEY, text) };
};
