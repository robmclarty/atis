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
  /**
   * The names its interface exports at head (D162): the barrel's for a
   * package or a folder module, the file's own for a single-file module, and
   * the entrance files' for a directory, sorted. Absent where the head scan
   * read none of those files (C2); `interface_size` still counts the terrain's.
   */
  readonly exports?: readonly string[];
  readonly body_loc: number;
  readonly function_count?: number;
  readonly fan_in?: number;
  readonly fan_out?: number;
  readonly dents: readonly string[];
  readonly clone_family?: string;
};

/**
 * How settled a file is over the log window (D149): its age in days since the
 * window first saw it, and its churn ratio, absent where its current size is
 * unknown or zero (C2). Old, quiet files are the bedrock §5.1 raises.
 */
export type Stability = { readonly age_days: number; readonly churn_ratio?: number };

/**
 * How a file is held in its cell (D157): its import edges on the head graph,
 * in either direction, to files in its own cell and to terrain files in other
 * cells. Tests and the shore are no terrain, so they tie nothing (D4).
 */
export type Ties = { readonly inside: number; readonly outside: number };

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
  /** Set on every file the history window saw, changed or not; the SVG never reads it (D149). */
  readonly stability?: Stability;
  /** Set on every file the head holds, a file with no ties included; a deleted file has none (D157). */
  readonly ties?: Ties;
  /**
   * The same edges counted with its package for home (D167): to terrain files
   * in the package its cell is or sits in, and to terrain files outside it.
   * Absent on a deleted file and on a file in no package.
   */
  readonly package_ties?: Ties;
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

/** Head-side lines `start` onward, `count` of them; a `count` of 0 is a pure deletion, sitting just after line `start` (D73). */
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
  /**
   * The changed source files whose changed lines touch code and that the
   * coverage report never names: a gap of unknown size, never a closed skin
   * (D80, D122, D141).
   * Present exactly when `patch_coverage` is, sorted (C3).
   */
  readonly unmeasured?: readonly string[];
  readonly mutants?: readonly Mutant[];
  readonly stitches?: readonly Stitch[];
};

export type CheckSlot = {
  readonly name: string;
  readonly ok: boolean;
  readonly skipped: boolean;
  readonly scope: 'global' | readonly string[];
  /**
   * The changed files core's split put this red slot on the change through,
   * sorted, and empty when all of its red is standing state (D67, D73). Set
   * exactly on a red slot whose scope names files, so a renderer reads the
   * split rather than remaking it from paths.
   */
  readonly change?: readonly string[];
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

/** A dependency both sides of a manifest name, at a range this change moved `from` another (D83). */
export type DepMoved = DepAdded & { readonly from: string };

/** What this change did to an outside package in a manifest (D83): added it, or moved its range. */
export type DependencyChange = 'added' | 'moved';

/**
 * An outside package the terrain imports at head (D170), one star the far
 * zoom hangs around the planet: never a workspace member or a Node built-in.
 */
export type Dependency = {
  readonly name: string;
  /** How many terrain files import it at head; a test or a shore file is no terrain (D4). */
  readonly importers: number;
  /** Absent where this change neither added it to a manifest nor moved its range; `added` where it did both. */
  readonly change?: DependencyChange;
  /**
   * How many advisories name it, as their module or on a path that pulls
   * their module in. Absent where no audit's advisories were read, which is
   * no evidence rather than a clean audit (C2).
   */
  readonly advisories?: number;
  /** The worst severity among those advisories, lower-cased as the audit writes it; set exactly when `advisories` is above zero. */
  readonly severity?: string;
};

/** An import edge on the head graph with a changed file at one end or both: `from` imports `to` (§6's wiring). */
export type WiringEdge = { readonly from: string; readonly to: string };

export type Weather = {
  readonly changed: readonly ChangedFile[];
  readonly reach: readonly ReachEntry[];
  /**
   * The change's wiring (§6): every import edge on the head graph with a
   * changed file at either end, a test's included, between files the map
   * places, sorted (C3). An added key (D85), so a map written before it
   * reads with no wiring.
   */
  readonly wiring?: readonly WiringEdge[];
  readonly evidence: Evidence;
  readonly checks: Checks;
  readonly ghosts: readonly Ghost[];
  readonly deps_added: readonly DepAdded[];
  /** The ranges this change moved, beside the dependencies it added (D83); absent where no manifest delta was read (C2). */
  readonly deps_moved?: readonly DepMoved[];
  /**
   * The outside packages the terrain imports at head, sorted by name (D170).
   * An added key (D85), absent where the head scan recorded no file's
   * imports by package (C2).
   */
  readonly dependencies?: readonly Dependency[];
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
  /** Channels muted for what they hold rather than their age, each as `channel: reason` (D122). */
  readonly muted?: readonly string[];
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

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isWholeCount(value: unknown): value is number {
  return isCount(value) && Number.isInteger(value);
}

/** A stability is an age, and a churn ratio only where one was measured; neither is ever negative. */
function assertStability(value: unknown, path: string): void {
  const stability = expectRecord(value, path);
  if (!isCount(stability['age_days'])) fail(`${path}.age_days`, 'expected a non-negative number');
  const churn = stability['churn_ratio'];
  if (churn !== undefined && !isCount(churn)) fail(`${path}.churn_ratio`, 'expected a non-negative number');
}

/** Ties are two counts of edges, whole and never negative. */
function assertTies(value: unknown, path: string): void {
  const ties = expectRecord(value, path);
  for (const side of ['inside', 'outside'] as const) {
    if (!isWholeCount(ties[side])) fail(`${path}.${side}`, 'expected a whole count');
  }
}

/**
 * An outside package (D170): a name read by at least one terrain file, and a
 * severity exactly where some advisory names it, so a clean audit and no
 * audit stay two different things (C2).
 */
function assertDependency(value: unknown, path: string): string {
  const dependency = expectRecord(value, path);
  const name = expectString(dependency['name'], `${path}.name`);
  const importers = dependency['importers'];
  if (!isWholeCount(importers) || importers === 0) fail(`${path}.importers`, 'expected a whole count above zero');
  const change = dependency['change'];
  if (change !== undefined && change !== 'added' && change !== 'moved') fail(`${path}.change`, 'expected added or moved');
  const advisories = dependency['advisories'];
  if (advisories !== undefined && !isWholeCount(advisories)) fail(`${path}.advisories`, 'expected a whole count');
  const severity = dependency['severity'];
  if ((severity !== undefined) !== (typeof advisories === 'number' && advisories > 0)) {
    fail(`${path}.severity`, 'a severity is required exactly when an advisory names the package');
  }
  if (severity !== undefined) expectString(severity, `${path}.severity`);
  return name;
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
    if (cell['exports'] !== undefined) {
      expectArray(cell['exports'], `terrain.cells[${String(index)}].exports`).forEach((name, at) => expectString(name, `terrain.cells[${String(index)}].exports[${String(at)}]`));
    }
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
    if (organelle['stability'] !== undefined) assertStability(organelle['stability'], `terrain.organelles[${String(index)}].stability`);
    if (organelle['ties'] !== undefined) assertTies(organelle['ties'], `terrain.organelles[${String(index)}].ties`);
    if (organelle['package_ties'] !== undefined) {
      assertTies(organelle['package_ties'], `terrain.organelles[${String(index)}].package_ties`);
    }
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
  const changedPaths = new Set<string>();
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
    if (typeof entry['path'] === 'string') changedPaths.add(entry['path']);
  });

  const wiring = weather['wiring'];
  if (wiring !== undefined) {
    expectArray(wiring, 'weather.wiring').forEach((raw, index) => {
      const at = `weather.wiring[${String(index)}]`;
      const edge = expectRecord(raw, at);
      const from = expectString(edge['from'], `${at}.from`);
      const to = expectString(edge['to'], `${at}.to`);
      for (const [end, path] of [['from', from], ['to', to]] as const) {
        if (!organelleIds.has(path) && !groupFiles.has(path)) fail(`${at}.${end}`, `unknown organelle or group file "${path}"`);
      }
      if (from === to) fail(at, 'a file does not import itself');
      if (!changedPaths.has(from) && !changedPaths.has(to)) fail(at, 'neither end is a changed file');
    });
  }

  const dependencies = weather['dependencies'];
  if (dependencies !== undefined) {
    let previous: string | undefined;
    expectArray(dependencies, 'weather.dependencies').forEach((raw, index) => {
      const at = `weather.dependencies[${String(index)}]`;
      const name = assertDependency(raw, at);
      if (previous !== undefined && previous >= name) fail(`${at}.name`, `expected the names sorted and unique, got "${name}" after "${previous}"`);
      previous = name;
    });
  }

  const evidence = expectRecord(weather['evidence'], 'weather.evidence');
  const unmeasured = evidence['unmeasured'];
  if (unmeasured !== undefined) {
    if (evidence['patch_coverage'] === undefined) fail('weather.evidence.unmeasured', 'only a map with patch_coverage names unmeasured files');
    expectArray(unmeasured, 'weather.evidence.unmeasured').forEach((path, index) => {
      const at = `weather.evidence.unmeasured[${String(index)}]`;
      if (!changedPaths.has(expectString(path, at))) fail(at, `not a changed file "${String(path)}"`);
    });
  }

  const checks = expectRecord(weather['checks'], 'weather.checks');
  const slots = expectArray(checks['slots'], 'weather.checks.slots');
  slots.forEach((raw, index) => {
    const at = `weather.checks.slots[${String(index)}]`;
    const slot = expectRecord(raw, at);
    const splits = slot['ok'] === false && slot['skipped'] !== true && Array.isArray(slot['scope']);
    if (slot['change'] === undefined) {
      if (splits) fail(`${at}.change`, 'a red slot that names files records the changed files it is on the change through');
      return;
    }
    if (!splits) fail(`${at}.change`, 'only a red slot that names files records a change');
    expectArray(slot['change'], `${at}.change`).forEach((path, entry) => {
      const pathAt = `${at}.change[${String(entry)}]`;
      if (!changedPaths.has(expectString(path, pathAt))) fail(pathAt, `not a changed file "${String(path)}"`);
    });
  });
}

/** Turn an unknown value into a trusted `MapJson`, or throw naming the offending path. */
export function assertMap(value: unknown): MapJson {
  assertShape(value);
  return value;
}
