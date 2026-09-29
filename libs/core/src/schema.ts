/**
 * schema: the `map.json` contract, both its TypeScript shape and the runtime
 * guard that turns an unknown value into a trusted `MapJson`.
 */

/** The `map.json` contract version this core writes and the renderers read. */
export const SCHEMA_VERSION = 1;

export type CellKind = 'package' | 'folder' | 'single' | 'directory';
export type ChangeKind = 'added' | 'modified' | 'deleted' | 'renamed';
export type ExceptionalEdgeKind = 'cycle' | 'boundary' | 'new-cross-module';
export type FlightCategory = 'VFR' | 'MVFR' | 'IFR' | 'LIFR' | 'NOINST';
export type NoticeTier = 'primary' | 'secondary' | 'tertiary';
export type InstrumentsMode = 'check' | 'git-only';
/** Where the depth bands' entry points were read from: the reviewed repo's own fallow, or its manifests alone (D22). */
export type EntryPointSource = 'fallow' | 'manifests';

export type Position = { readonly x: number; readonly y: number; readonly r: number };

/** A cell: a package, a folder module, a single-file module, or a fallback directory. */
export type Cell = {
  readonly id: string;
  readonly path: string;
  readonly kind: CellKind;
  readonly parent?: string;
  readonly barrel?: string;
  readonly organelles: readonly string[];
  readonly band: number;
  readonly interface_size: number;
  readonly body_loc: number;
  readonly function_count?: number;
  readonly fan_in?: number;
  readonly fan_out?: number;
  readonly dents: readonly string[];
  readonly clone_family?: string;
};

/** A file inside a cell. `id` is the head path; a deleted file keeps its base path (D40). */
export type Organelle = {
  readonly id: string;
  readonly path: string;
  readonly cell: string;
  readonly band: number;
  readonly reachable: boolean;
  readonly loc: number;
  readonly function_count?: number;
  readonly dents: readonly string[];
  readonly churn_ratio?: number;
  readonly age_days?: number;
  readonly bugfix_rate?: number;
  readonly clone_family?: string;
};

export type Band = { readonly index: number; readonly depth_min: number; readonly depth_max: number };

/** A shore group: every tracked file outside the terrain, grouped by D48's rule table. */
export type Group = { readonly id: string; readonly files: readonly string[] };

export type ExceptionalEdge = {
  readonly from: string;
  readonly to: string;
  readonly kind: ExceptionalEdgeKind;
};

export type Cochange = { readonly a: string; readonly b: string; readonly rate: number; readonly support: number };

export type History = { readonly window_commits: number; readonly cochange: readonly Cochange[] };

export type LayoutBand = { readonly index: number; readonly y0: number; readonly y1: number };

export type Layout = {
  readonly width: number;
  readonly height: number;
  /** The shore strip, above band 0: land above the abyss (D48). */
  readonly shore: { readonly y0: number; readonly y1: number };
  readonly bands: readonly LayoutBand[];
  readonly positions: Readonly<Record<string, Position>>;
  /** One closed contour per cell and per non-empty shore group; absent until step 16 draws them. */
  readonly contours?: Readonly<Record<string, readonly (readonly [number, number])[]>>;
};

export type Terrain = {
  readonly cells: readonly Cell[];
  readonly organelles: readonly Organelle[];
  readonly bands: readonly Band[];
  readonly groups: readonly Group[];
  readonly edges_exceptional: readonly ExceptionalEdge[];
  readonly history: History;
  readonly layout?: Layout;
};

export type Hunk = { readonly start: number; readonly count: number };

/** Exactly one of `cell` or `group` is set (D48). */
export type ChangedFile = {
  readonly path: string;
  readonly kind: ChangeKind;
  readonly from?: string;
  readonly cell?: string;
  readonly group?: string;
  readonly is_barrel: boolean;
  readonly added: number;
  readonly deleted: number;
  readonly hunks: readonly Hunk[];
};

/** `via`: the interface files crossed, in order (D45). */
export type ReachEntry = {
  readonly path: string;
  readonly cell: string;
  readonly hops: number;
  readonly via: readonly string[];
};

export type PatchCoverage = {
  readonly path: string;
  readonly changed_executable: number;
  readonly covered: number;
  readonly uncovered_lines: readonly number[];
};

export type Mutant = { readonly path: string; readonly line: number; readonly status: string };

export type Stitch = { readonly test: string; readonly targets: readonly string[]; readonly status: string };

export type Evidence = {
  readonly patch_coverage?: readonly PatchCoverage[];
  readonly mutants?: readonly Mutant[];
  readonly stitches?: readonly Stitch[];
};

export type CheckSlot = {
  readonly name: string;
  readonly ok: boolean;
  readonly skipped: boolean;
  readonly scope: 'global' | readonly string[];
};

export type Checks = {
  readonly category: FlightCategory;
  readonly checks_run: number;
  readonly timestamp?: string;
  readonly reason?: string;
  readonly slots: readonly CheckSlot[];
};

export type Ghost = {
  readonly path: string;
  readonly with: readonly string[];
  readonly rate: number;
  readonly support: number;
};

export type DepAdded = { readonly manifest: string; readonly name: string; readonly range: string; readonly dev: boolean };

export type Weather = {
  readonly changed: readonly ChangedFile[];
  readonly reach: readonly ReachEntry[];
  readonly evidence: Evidence;
  readonly checks: Checks;
  readonly ghosts: readonly Ghost[];
  readonly deps_added: readonly DepAdded[];
  // D23: base-side metrics need the terrain cache of phase 3, so this build never populates it.
  readonly improvements: readonly [];
};

/** A ranked notice candidate; `inputs` and `thresholds` echo the numbers that produced it (D28). */
export type Notice = {
  readonly tier: NoticeTier;
  readonly kind: string;
  readonly target: string;
  readonly why: string;
  readonly inputs: Readonly<Record<string, number>>;
  readonly thresholds: Readonly<Record<string, number>>;
  readonly weight: number;
};

export type FallowSchemas = { readonly health?: number; readonly dead?: number; readonly dupes?: number };

export type Instruments = {
  readonly mode: InstrumentsMode;
  readonly reason?: string;
  readonly entry_points?: EntryPointSource;
  /** Why fallow was not read, set exactly when `entry_points` is `manifests` (C2). */
  readonly entry_points_reason?: string;
  readonly fallow_schemas?: FallowSchemas;
  readonly stale?: readonly string[];
};

export type Meta = {
  readonly schema_version: 1;
  readonly generated_at: string;
  readonly repo: string;
  readonly base: string;
  readonly head: string;
  readonly merge_base: string;
  readonly mode: 'change';
  readonly instruments: Instruments;
};

export type MapJson = {
  readonly meta: Meta;
  readonly terrain: Terrain;
  readonly weather: Weather;
  readonly notices: readonly Notice[];
};

const NOTICE_BUDGET: Readonly<Record<NoticeTier, number>> = {
  primary: 1,
  secondary: 2,
  tertiary: 3,
};

function fail(path: string, reason: string): never {
  throw new Error(`invalid map at ${path}: ${reason}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNoticeTier(value: unknown): value is NoticeTier {
  return value === 'primary' || value === 'secondary' || value === 'tertiary';
}

function isEntryPointSource(value: unknown): value is EntryPointSource {
  return value === 'fallow' || value === 'manifests';
}

function expectRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) fail(path, 'expected an object');
  return value;
}

function expectArray(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) fail(path, 'expected an array');
  return value;
}

function expectString(value: unknown, path: string): string {
  if (typeof value !== 'string') fail(path, 'expected a string');
  return value;
}

/**
 * Every check below is real runtime narrowing (never a cast): `assertMap`
 * hands back a value the compiler only trusts because this function proved
 * its shape as it went, throwing on the first path that does not match.
 */
function assertShape(value: unknown): asserts value is MapJson {
  const root = expectRecord(value, '');

  const meta = expectRecord(root['meta'], 'meta');
  if (meta['schema_version'] !== SCHEMA_VERSION) {
    fail('meta.schema_version', `expected ${String(SCHEMA_VERSION)}, got ${String(meta['schema_version'])}`);
  }

  const instruments = expectRecord(meta['instruments'], 'meta.instruments');
  const entryPoints = instruments['entry_points'];
  if (entryPoints !== undefined && !isEntryPointSource(entryPoints)) {
    fail('meta.instruments.entry_points', 'expected fallow or manifests');
  }
  const entryReason = instruments['entry_points_reason'];
  if ((entryReason !== undefined) !== (entryPoints === 'manifests')) {
    fail('meta.instruments.entry_points_reason', 'a reason is required exactly when entry_points is manifests');
  }
  if (entryReason !== undefined) expectString(entryReason, 'meta.instruments.entry_points_reason');

  const notices = expectArray(root['notices'], 'notices');
  if (notices.length > 6) fail('notices', `at most 6 notices, got ${String(notices.length)}`);

  const tierCounts: Record<NoticeTier, number> = { primary: 0, secondary: 0, tertiary: 0 };
  notices.forEach((raw, index) => {
    const notice = expectRecord(raw, `notices[${String(index)}]`);
    if (!isNoticeTier(notice['tier'])) fail(`notices[${String(index)}].tier`, 'expected a notice tier');
    const tier = notice['tier'];
    tierCounts[tier] += 1;
    if (tierCounts[tier] > NOTICE_BUDGET[tier]) {
      fail(`notices[${String(index)}]`, `too many ${tier} notices, at most ${String(NOTICE_BUDGET[tier])}`);
    }
  });

  const terrain = expectRecord(root['terrain'], 'terrain');

  const cells = expectArray(terrain['cells'], 'terrain.cells');
  const cellIds = new Set<string>();
  cells.forEach((raw, index) => {
    const cell = expectRecord(raw, `terrain.cells[${String(index)}]`);
    cellIds.add(expectString(cell['id'], `terrain.cells[${String(index)}].id`));
  });

  const groups = expectArray(terrain['groups'], 'terrain.groups');
  const groupIds = new Set<string>();
  const groupFiles = new Set<string>();
  groups.forEach((raw, index) => {
    const group = expectRecord(raw, `terrain.groups[${String(index)}]`);
    const id = expectString(group['id'], `terrain.groups[${String(index)}].id`);
    const files = expectArray(group['files'], `terrain.groups[${String(index)}].files`);
    groupIds.add(id);
    for (const file of files) {
      if (typeof file === 'string') groupFiles.add(file);
    }
  });

  const organelles = expectArray(terrain['organelles'], 'terrain.organelles');
  const organelleIds = new Set<string>();
  organelles.forEach((raw, index) => {
    const organelle = expectRecord(raw, `terrain.organelles[${String(index)}]`);
    organelleIds.add(expectString(organelle['id'], `terrain.organelles[${String(index)}].id`));
  });

  const weather = expectRecord(root['weather'], 'weather');

  const reach = expectArray(weather['reach'], 'weather.reach');
  reach.forEach((raw, index) => {
    const entry = expectRecord(raw, `weather.reach[${String(index)}]`);
    const cell = expectString(entry['cell'], `weather.reach[${String(index)}].cell`);
    if (!cellIds.has(cell)) fail(`weather.reach[${String(index)}].cell`, `unknown cell "${cell}"`);
  });

  const layout = terrain['layout'];
  if (layout !== undefined) {
    const layoutRecord = expectRecord(layout, 'terrain.layout');
    const positions = expectRecord(layoutRecord['positions'], 'terrain.layout.positions');
    for (const path of Object.keys(positions)) {
      if (!organelleIds.has(path) && !groupFiles.has(path)) {
        fail(`terrain.layout.positions["${path}"]`, `unknown organelle or group file "${path}"`);
      }
    }
  }

  const changed = expectArray(weather['changed'], 'weather.changed');
  changed.forEach((raw, index) => {
    const entry = expectRecord(raw, `weather.changed[${String(index)}]`);
    const hasCell = entry['cell'] !== undefined;
    const hasGroup = entry['group'] !== undefined;
    if (hasCell === hasGroup) {
      fail(`weather.changed[${String(index)}]`, 'exactly one of cell or group is required');
    }
    if (entry['group'] !== undefined) {
      const group = expectString(entry['group'], `weather.changed[${String(index)}].group`);
      if (!groupIds.has(group)) fail(`weather.changed[${String(index)}].group`, `unknown group "${group}"`);
    }
  });
}

/** Turn an unknown value into a trusted `MapJson`, or throw naming the offending path. */
export function assertMap(value: unknown): MapJson {
  assertShape(value);
  return value;
}
