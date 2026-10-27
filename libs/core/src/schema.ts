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

/**
 * One function of a file at head, for the file level (D102): its name, the
 * line it starts on and how many lines it spans, and, where `health.json`
 * was read, every one of fallow's thresholds it breaks, none for one within
 * them; absent with no health read, which is no evidence rather than no
 * breach (C2). A function fallow names that the scan bound to no name, a
 * callback, carries fallow's name for it.
 */
export type FileFunction = { readonly name: string; readonly line: number; readonly line_count: number; readonly breaches?: readonly string[] };

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
  /**
   * Every function the head scan read in it, by the line it starts on
   * (D102); an added key (D85), absent on a deleted file and on a file the
   * head scan read no functions in.
   */
  readonly functions?: readonly FileFunction[];
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

/** One row of package lanes in a field that wraps them (Q73): the stretch of `x` it stands across, and its own ladder of terraces. */
export type LayoutRow = { readonly x0: number; readonly x1: number; readonly bands: readonly LayoutBand[] };

export type Layout = {
  readonly width: number;
  readonly height: number;
  /** The shore strip, above band 0: land above the abyss (D48). */
  readonly shore: { readonly y0: number; readonly y1: number };
  /** The terraces, top to bottom; the first row's when the lanes wrap into rows. */
  readonly bands: readonly LayoutBand[];
  /**
   * The rows the package lanes wrap into, top to bottom, each carrying its
   * own ladder of the same terraces lower down (Q73). Absent while the lanes
   * fit one row, which is a field `bands` alone describes.
   */
  readonly rows?: readonly LayoutRow[];
  readonly positions: Readonly<Record<string, Position>>;
  /**
   * Where each renamed file stood before, by its head path: its place in the
   * layout this one relaxed from, under its old path, carried into this field.
   * Its old-to-new leader runs from here to `positions` (D40, D97); absent
   * with no layout to relax from, or no renamed file that layout placed (C2).
   */
  readonly renamed_from?: Readonly<Record<string, Position>>;
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

/** What got better against the base (D98, §5.1): a function back under a threshold, a file's dent gone, a clone family dissolved, a cycle broken. */
export type ImprovementKind = 'threshold' | 'dent' | 'clone-family' | 'cycle';

/**
 * One improvement, on the files it is about: head paths, a deleted file under
 * its base path (D40), sorted, and at least one of them changed. A threshold
 * names its rule and, where fallow names one, its function; a dent names its
 * rule, one of fallow's thresholds, `cycle` or `boundary`.
 */
export type Improvement = {
  readonly kind: ImprovementKind;
  readonly files: readonly string[];
  readonly rule?: string;
  readonly function?: string;
};

/** One changed file's movement in fallow's maintainability index, head less base, which only a file on both sides has (D98). */
export type FileHealthDelta = { readonly path: string; readonly maintainability: number };

/**
 * The change's net movement in fallow's own measure, its maintainability
 * index, per changed file both sides scored and summed over them; a file
 * that moved nothing is a measured 0 (D98).
 */
export type HealthDelta = { readonly maintainability: number; readonly files: readonly FileHealthDelta[] };

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
  /**
   * What got better against the base, sorted (C3); absent where fallow did
   * not measure both sides alike, which is no evidence rather than nothing
   * improved (D98, C2).
   */
  readonly improvements?: readonly Improvement[];
  /** The change's movement in fallow's own measure, absent where its health was not measured on both sides (D98, C2). */
  readonly health_delta?: HealthDelta;
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

/**
 * What one side of the change was measured with by the reviewed repo's own
 * fallow (D22, D98): the version that ran, and each analysis it could not
 * read as `analysis: reason`; or why it never ran on that side at all (C2).
 */
export type StructureSide = { readonly fallow: string; readonly muted?: readonly string[] } | { readonly reason: string };

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
  /** How the base and the head extractions' health, duplication and structure were measured, absent when the run never asked (D98). */
  readonly structure?: { readonly base: StructureSide; readonly head: StructureSide };
};

/**
 * What a map is of (D101): one change, its weather over the terrain it stands
 * on, or the whole repository at one commit, its overlays over that commit's
 * own terrain. A reader that knows only `change` still reads a `repo` map, as
 * a terrain under a change of nothing (D85).
 */
export type MapMode = 'change' | 'repo';

export type Meta = {
  readonly schema_version: 1;
  readonly generated_at: string;
  readonly repo: string;
  /**
   * The base as resolved: the ref the merge-base is taken against, `main`,
   * `origin/main`, `HEAD~1`, a tag, or the ref `--base` named (D99). On a
   * `repo` map, the head as it was named, since the terrain is the head's own.
   */
  readonly base: string;
  /** The base as typed: `--base <ref>`, `--last-commit` or `--last-tag`; absent when none was, and the run took the trunk (D99). */
  readonly base_typed?: string;
  /** The head commit's sha, or `working-tree` when the head side was read from the working tree (D99). */
  readonly head: string;
  /** The commit the terrain is cut from: the merge-base of a change, or the head itself on a `repo` map. */
  readonly merge_base: string;
  readonly mode: MapMode;
  readonly instruments: Instruments;
};

/** One commit of a range (D100): its weather and notices over the map's one terrain, which it never moves (P2). */
export type Frame = {
  readonly commit: string;
  readonly subject: string;
  readonly weather: Weather;
  readonly notices: readonly Notice[];
  /**
   * The changed files the one terrain does not place, sorted: files this
   * commit had that the range's head renamed or deleted since. Each keeps its
   * changed entry; absent when the terrain places every one.
   */
  readonly unplaced?: readonly string[];
};

/**
 * A range's weather moving over one terrain (D100): one frame per commit of
 * `base..head`, oldest first, the last the map's own weather. An added key
 * (D85), absent on a map of one change.
 */
export type Sequence = { readonly frames: readonly Frame[] };

/**
 * A trouble spot (§8): a file the log keeps changing that is also complex.
 * `commits` counts the window's commits touching it, `complexity` is fallow's
 * total cyclomatic complexity of it, and `score` is their product over the
 * repository's largest, so the worst spot scores 1.
 */
export type TroubleSpot = { readonly path: string; readonly commits: number; readonly complexity: number; readonly score: number };

/** One function over one of fallow's thresholds (D9): its name where fallow gives one, the line it starts on, and every rule it breaks. */
export type Breach = { readonly function?: string; readonly line: number; readonly rules: readonly string[] };

/**
 * An ugly spot (§8): a file fallow measured, with its maintainability index
 * where fallow scored the file, and every threshold its functions break,
 * none for a file that breaks none.
 */
export type UglySpot = { readonly path: string; readonly maintainability?: number; readonly breaches: readonly Breach[] };

/**
 * A coverage gap (§8): a file whose statements the coverage report counts,
 * some of them never run, or a terrain file holding code that the report
 * never names at all, a gap of unknown size (D80).
 */
export type CoverageGap =
  | { readonly path: string; readonly statements: number; readonly uncovered: number }
  | { readonly path: string; readonly unmeasured: true };

/** Dead code (§8): a file nothing imports, or one export nothing reads, by name. */
export type DeadCode = { readonly path: string; readonly kind: 'file' } | { readonly path: string; readonly kind: 'export'; readonly name: string; readonly line?: number };

/**
 * One clone family (§8): the files its copies sit in, under the id its
 * cells and organelles carry as `clone_family`, and the lines it
 * duplicates where fallow counts them.
 */
export type CloneFamily = { readonly id: string; readonly files: readonly string[]; readonly lines?: number };

/** One cycle (§8): an import cycle, its files in import order as fallow lists them, or a cycle of re-exports. */
export type Cycle = { readonly kind: 'import' | 're-export'; readonly files: readonly string[] };

/** The last `commits` commits of the window (§8), and how many of them touched each file they touched. */
export type RecentHeat = { readonly commits: number; readonly files: readonly { readonly path: string; readonly commits: number }[] };

/** What a baselined finding is: a function over a threshold, a dead file or export, a cycle, or a clone family (D49). */
export type BaselinedKind = 'threshold' | 'unused-file' | 'unused-export' | 'cycle' | 'clone-family';

/**
 * A finding checkride's committed baseline grandfathers, drawn muted (D49):
 * the files it stands on, and the function, export or clone family it is.
 */
export type BaselinedFinding = { readonly kind: BaselinedKind; readonly files: readonly string[]; readonly name?: string };

/**
 * Whole-repository state at one commit, drawn over its own terrain in place
 * of a change's weather (D101). Each overlay is absent when its source is,
 * and `muted` then names it with the reason, as `overlay: reason` (C2). Every
 * overlay names only files the map places on its terrain or its shore, never
 * a test (D4), and every list is sorted (C3).
 */
export type Overlays = {
  readonly trouble_spots?: readonly TroubleSpot[];
  readonly ugly_spots?: readonly UglySpot[];
  readonly coverage_gaps?: readonly CoverageGap[];
  readonly dead_code?: readonly DeadCode[];
  readonly duplication?: readonly CloneFamily[];
  readonly cycles?: readonly Cycle[];
  readonly recent_heat?: RecentHeat;
  readonly baselined?: readonly BaselinedFinding[];
  readonly muted?: readonly string[];
};

/** Every overlay a `repo` map can carry, in the order §8 lists them, the baseline last (D49, D101). */
export const OVERLAY_NAMES = ['trouble_spots', 'ugly_spots', 'coverage_gaps', 'dead_code', 'duplication', 'cycles', 'recent_heat', 'baselined'] as const;

export type OverlayName = (typeof OVERLAY_NAMES)[number];

export type MapJson = {
  readonly meta: Meta;
  readonly terrain: Terrain;
  readonly weather: Weather;
  readonly notices: readonly Notice[];
  readonly sequence?: Sequence;
  /** Set exactly on a `repo` map (D101). */
  readonly overlays?: Overlays;
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

/** A file's functions are named, each starts on a line and spans at least one, sorted by line, and a breach names a rule. */
function assertFunctions(value: unknown, path: string): void {
  let previous = 0;
  expectArray(value, path).forEach((raw, index) => {
    const at = `${path}[${String(index)}]`;
    const fn = expectRecord(raw, at);
    expectString(fn['name'], `${at}.name`);
    const line = fn['line'];
    if (!isWholeCount(line) || line < 1) fail(`${at}.line`, 'expected a line of at least 1');
    if (line < previous) fail(`${at}.line`, `expected the functions sorted by line, got ${String(line)} after ${String(previous)}`);
    previous = line;
    const count = fn['line_count'];
    if (!isWholeCount(count) || count < 1) fail(`${at}.line_count`, 'expected at least one line');
    if (fn['breaches'] !== undefined) expectArray(fn['breaches'], `${at}.breaches`).forEach((rule, n) => expectString(rule, `${at}.breaches[${String(n)}]`));
  });
}

/** The rows a field wraps its lanes into (Q73): two or more, each a stretch of `x` and a ladder of terraces, one under the next. */
function assertRows(value: unknown, path: string): void {
  const rows = expectArray(value, path);
  if (rows.length < 2) fail(path, 'expected two rows or more; a field of one row writes none');
  let above = Number.NEGATIVE_INFINITY;
  rows.forEach((raw, index) => {
    const at = `${path}[${String(index)}]`;
    const row = expectRecord(raw, at);
    if (expectFinite(row['x1'], `${at}.x1`) < expectFinite(row['x0'], `${at}.x0`)) fail(`${at}.x1`, 'expected the row to end right of where it starts');
    expectArray(row['bands'], `${at}.bands`).forEach((band, n) => {
      const strip = expectRecord(band, `${at}.bands[${String(n)}]`);
      const y0 = expectFinite(strip['y0'], `${at}.bands[${String(n)}].y0`);
      if (y0 < above) fail(`${at}.bands[${String(n)}].y0`, 'expected each terrace below the one before it');
      above = expectFinite(strip['y1'], `${at}.bands[${String(n)}].y1`);
    });
  });
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

const IMPROVEMENT_KINDS: ReadonlySet<string> = new Set(['threshold', 'dent', 'clone-family', 'cycle']);

/** An improvement names its kind and the files it is about, one of them changed, and a threshold or a dent the rule it no longer breaks. */
function assertImprovement(value: unknown, path: string, changed: ReadonlySet<string>): void {
  const improvement = expectRecord(value, path);
  const kind = improvement['kind'];
  if (typeof kind !== 'string' || !IMPROVEMENT_KINDS.has(kind)) fail(`${path}.kind`, 'expected threshold, dent, clone-family or cycle');
  const files = expectArray(improvement['files'], `${path}.files`);
  if (files.length === 0) fail(`${path}.files`, 'expected at least one file');
  const named = files.map((file, index) => expectString(file, `${path}.files[${String(index)}]`));
  if (!named.some((file) => changed.has(file))) fail(`${path}.files`, 'none of them is a changed file');
  const rule = improvement['rule'];
  if ((kind === 'threshold' || kind === 'dent') && rule === undefined) fail(`${path}.rule`, `a ${kind} names the rule it no longer breaks`);
  if (rule !== undefined) expectString(rule, `${path}.rule`);
  if (improvement['function'] !== undefined) expectString(improvement['function'], `${path}.function`);
}

function expectFinite(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(path, 'expected a finite number');
  return value;
}

/** A health delta is a finite number in total and per file, each file a changed one and named once. */
function assertHealthDelta(value: unknown, path: string, changed: ReadonlySet<string>): void {
  const delta = expectRecord(value, path);
  expectFinite(delta['maintainability'], `${path}.maintainability`);
  const seen = new Set<string>();
  expectArray(delta['files'], `${path}.files`).forEach((raw, index) => {
    const at = `${path}.files[${String(index)}]`;
    const file = expectRecord(raw, at);
    const name = expectString(file['path'], `${at}.path`);
    if (!changed.has(name)) fail(`${at}.path`, `"${name}" is not a changed file`);
    if (seen.has(name)) fail(`${at}.path`, `"${name}" is listed twice`);
    seen.add(name);
    expectFinite(file['maintainability'], `${at}.maintainability`);
  });
}

/**
 * One side's structure (D98): the fallow version that measured it, or why it
 * was not measured, never both and never neither, so an unmeasured side
 * always says why (C2).
 */
function assertStructureSide(value: unknown, path: string): void {
  const side = expectRecord(value, path);
  if ((side['fallow'] === undefined) === (side['reason'] === undefined)) fail(path, 'expected exactly one of fallow and reason');
  if (side['reason'] !== undefined) {
    expectString(side['reason'], `${path}.reason`);
    return;
  }
  expectString(side['fallow'], `${path}.fallow`);
  if (side['muted'] !== undefined) expectArray(side['muted'], `${path}.muted`).forEach((entry, index) => expectString(entry, `${path}.muted[${String(index)}]`));
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
  expectString(meta['base'], 'meta.base');
  if (meta['base_typed'] !== undefined) expectString(meta['base_typed'], 'meta.base_typed');
  const mode = meta['mode'];
  if (mode !== 'change' && mode !== 'repo') fail('meta.mode', 'expected change or repo');

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
  if (instruments['structure'] !== undefined) {
    const structure = expectRecord(instruments['structure'], 'meta.instruments.structure');
    for (const side of ['base', 'head']) assertStructureSide(structure[side], `meta.instruments.structure.${side}`);
  }

  assertNotices(root['notices'], 'notices');

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
    if (organelle['functions'] !== undefined) assertFunctions(organelle['functions'], `terrain.organelles[${String(index)}].functions`);
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
    const renamed = layoutRecord['renamed_from'];
    if (renamed !== undefined) {
      for (const path of Object.keys(expectRecord(renamed, 'terrain.layout.renamed_from'))) {
        if (positions[path] === undefined) fail(`terrain.layout.renamed_from["${path}"]`, `no position for "${path}"`);
      }
    }
    if (layoutRecord['rows'] !== undefined) assertRows(layoutRecord['rows'], 'terrain.layout.rows');
  }

  const placed: Placed = { cells: cellIds, groups: groupIds, files: new Set([...organelleIds, ...groupFiles]) };
  assertWeather(root['weather'], 'weather', placed, new Set());

  const sequence = root['sequence'];
  if (sequence !== undefined) {
    const frames = expectArray(expectRecord(sequence, 'sequence')['frames'], 'sequence.frames');
    frames.forEach((raw, index) => assertFrame(raw, `sequence.frames[${String(index)}]`, placed));
  }

  // A repo map is a terrain under a change of nothing, with the overlays in place of its weather (D101).
  if ((root['overlays'] !== undefined) !== (mode === 'repo')) fail('overlays', 'expected overlays exactly on a repo map');
  if (mode === 'repo') {
    if (expectArray(expectRecord(root['weather'], 'weather')['changed'], 'weather.changed').length > 0) fail('weather.changed', 'a repo map changes no file');
    if (expectArray(root['notices'], 'notices').length > 0) fail('notices', 'a repo map ranks no notice');
    if (sequence !== undefined) fail('sequence', 'a repo map has no range to frame');
    assertOverlays(root['overlays'], placed);
  }
}

const OVERLAY_KEYS: ReadonlySet<string> = new Set([...OVERLAY_NAMES, 'muted']);
const BASELINED_KINDS: ReadonlySet<string> = new Set(['threshold', 'unused-file', 'unused-export', 'cycle', 'clone-family']);

function expectWhole(value: unknown, path: string, least = 0): number {
  if (!isWholeCount(value) || value < least) fail(path, `expected a whole count of at least ${String(least)}`);
  return value;
}

/** A file the map places, an organelle or a group's file. */
function expectPlaced(value: unknown, path: string, placed: Placed): string {
  const file = expectString(value, path);
  if (!placed.files.has(file)) fail(path, `unknown organelle or group file "${file}"`);
  return file;
}

/** At least one file, each one the map places. */
function assertFiles(value: unknown, path: string, placed: Placed): void {
  const files = expectArray(value, path);
  if (files.length === 0) fail(path, 'expected at least one file');
  files.forEach((file, index) => expectPlaced(file, `${path}[${String(index)}]`, placed));
}

/** A list with one entry per file, each a record the map places, sorted by path and named once (C3); hands back the records. */
function expectByPath(value: unknown, path: string, placed: Placed): readonly (readonly [Record<string, unknown>, string])[] {
  let previous: string | undefined;
  return expectArray(value, path).map((raw, index) => {
    const at = `${path}[${String(index)}]`;
    const entry = expectRecord(raw, at);
    const file = expectPlaced(entry['path'], `${at}.path`, placed);
    if (previous !== undefined && previous >= file) fail(`${at}.path`, `expected the paths sorted and unique, got "${file}" after "${previous}"`);
    previous = file;
    return [entry, at] as const;
  });
}

function assertTroubleSpots(value: unknown, placed: Placed): void {
  for (const [spot, at] of expectByPath(value, 'overlays.trouble_spots', placed)) {
    expectWhole(spot['commits'], `${at}.commits`, 1);
    if (expectFinite(spot['complexity'], `${at}.complexity`) <= 0) fail(`${at}.complexity`, 'expected a complexity above zero');
    const score = expectFinite(spot['score'], `${at}.score`);
    if (score <= 0 || score > 1) fail(`${at}.score`, 'expected a score above 0 and at most 1');
  }
}

function assertUglySpots(value: unknown, placed: Placed): void {
  for (const [spot, at] of expectByPath(value, 'overlays.ugly_spots', placed)) {
    if (spot['maintainability'] !== undefined) expectFinite(spot['maintainability'], `${at}.maintainability`);
    expectArray(spot['breaches'], `${at}.breaches`).forEach((raw, index) => {
      const where = `${at}.breaches[${String(index)}]`;
      const breach = expectRecord(raw, where);
      if (breach['function'] !== undefined) expectString(breach['function'], `${where}.function`);
      expectWhole(breach['line'], `${where}.line`);
      const rules = expectArray(breach['rules'], `${where}.rules`);
      if (rules.length === 0) fail(`${where}.rules`, 'expected at least one rule');
      rules.forEach((rule, n) => expectString(rule, `${where}.rules[${String(n)}]`));
    });
  }
}

/** A gap is a measured file with statements that never ran, or a file the report never names; never both. */
function assertCoverageGaps(value: unknown, placed: Placed): void {
  for (const [gap, at] of expectByPath(value, 'overlays.coverage_gaps', placed)) {
    if (gap['unmeasured'] !== undefined) {
      if (gap['unmeasured'] !== true) fail(`${at}.unmeasured`, 'expected true');
      if (gap['statements'] !== undefined || gap['uncovered'] !== undefined) fail(at, 'an unmeasured file counts no statements');
      continue;
    }
    const statements = expectWhole(gap['statements'], `${at}.statements`, 1);
    const uncovered = expectWhole(gap['uncovered'], `${at}.uncovered`, 1);
    if (uncovered > statements) fail(`${at}.uncovered`, 'more statements uncovered than counted');
  }
}

function assertDeadCode(value: unknown, placed: Placed): void {
  expectArray(value, 'overlays.dead_code').forEach((raw, index) => {
    const at = `overlays.dead_code[${String(index)}]`;
    const entry = expectRecord(raw, at);
    expectPlaced(entry['path'], `${at}.path`, placed);
    const kind = entry['kind'];
    if (kind !== 'file' && kind !== 'export') fail(`${at}.kind`, 'expected file or export');
    if (kind === 'export') expectString(entry['name'], `${at}.name`);
    if (entry['line'] !== undefined) expectWhole(entry['line'], `${at}.line`, 1);
  });
}

function assertDuplication(value: unknown, placed: Placed): void {
  expectArray(value, 'overlays.duplication').forEach((raw, index) => {
    const at = `overlays.duplication[${String(index)}]`;
    const family = expectRecord(raw, at);
    expectString(family['id'], `${at}.id`);
    assertFiles(family['files'], `${at}.files`, placed);
    if (family['lines'] !== undefined) expectWhole(family['lines'], `${at}.lines`);
  });
}

function assertCycles(value: unknown, placed: Placed): void {
  expectArray(value, 'overlays.cycles').forEach((raw, index) => {
    const at = `overlays.cycles[${String(index)}]`;
    const cycle = expectRecord(raw, at);
    if (cycle['kind'] !== 'import' && cycle['kind'] !== 're-export') fail(`${at}.kind`, 'expected import or re-export');
    assertFiles(cycle['files'], `${at}.files`, placed);
  });
}

/** The heat is a window of commits, and how many of them touched each file, never more than the window holds. */
function assertRecentHeat(value: unknown, placed: Placed): void {
  const heat = expectRecord(value, 'overlays.recent_heat');
  const held = expectWhole(heat['commits'], 'overlays.recent_heat.commits');
  for (const [file, at] of expectByPath(heat['files'], 'overlays.recent_heat.files', placed)) {
    if (expectWhole(file['commits'], `${at}.commits`, 1) > held) fail(`${at}.commits`, 'more commits than the window holds');
  }
}

function assertBaselined(value: unknown, placed: Placed): void {
  expectArray(value, 'overlays.baselined').forEach((raw, index) => {
    const at = `overlays.baselined[${String(index)}]`;
    const finding = expectRecord(raw, at);
    const kind = finding['kind'];
    if (typeof kind !== 'string' || !BASELINED_KINDS.has(kind)) fail(`${at}.kind`, 'expected threshold, unused-file, unused-export, cycle or clone-family');
    assertFiles(finding['files'], `${at}.files`, placed);
    if (finding['name'] !== undefined) expectString(finding['name'], `${at}.name`);
  });
}

const OVERLAY_ASSERTS: Readonly<Record<OverlayName, (value: unknown, placed: Placed) => void>> = {
  trouble_spots: assertTroubleSpots,
  ugly_spots: assertUglySpots,
  coverage_gaps: assertCoverageGaps,
  dead_code: assertDeadCode,
  duplication: assertDuplication,
  cycles: assertCycles,
  recent_heat: assertRecentHeat,
  baselined: assertBaselined,
};

/**
 * The overlays (D101): only the eight §8 names, each either drawn or muted
 * with its reason as `overlay: reason`, never both and never neither (C2),
 * and each naming only files the map places.
 */
function assertOverlays(value: unknown, placed: Placed): void {
  const overlays = expectRecord(value, 'overlays');
  for (const key of Object.keys(overlays)) {
    if (!OVERLAY_KEYS.has(key)) fail(`overlays.${key}`, 'unknown overlay');
  }
  const muted = new Set(
    (overlays['muted'] === undefined ? [] : expectArray(overlays['muted'], 'overlays.muted')).map((entry, index) => {
      const [name = ''] = expectString(entry, `overlays.muted[${String(index)}]`).split(': ');
      return name;
    }),
  );
  for (const name of OVERLAY_NAMES) {
    const drawn = overlays[name] !== undefined;
    if (drawn && muted.has(name)) fail(`overlays.${name}`, 'drawn and muted both');
    if (!drawn && !muted.has(name)) fail(`overlays.${name}`, 'absent with no reason in overlays.muted');
    if (drawn) OVERLAY_ASSERTS[name](overlays[name], placed);
  }
}

/** What the map's one terrain places: its cells, its shore groups, and every file it holds a place for, an organelle or a group's file. */
type Placed = { readonly cells: ReadonlySet<string>; readonly groups: ReadonlySet<string>; readonly files: ReadonlySet<string> };

/** At most six notices, each tier within its budget (C7). */
function assertNotices(value: unknown, path: string): void {
  const notices = expectArray(value, path);
  if (notices.length > 6) fail(path, `at most 6 notices, got ${String(notices.length)}`);

  const tierCounts: Record<NoticeTier, number> = { primary: 0, secondary: 0, tertiary: 0 };
  notices.forEach((raw, index) => {
    const notice = expectRecord(raw, `${path}[${String(index)}]`);
    if (!isNoticeTier(notice['tier'])) fail(`${path}[${String(index)}].tier`, 'expected a notice tier');
    const tier = notice['tier'];
    tierCounts[tier] += 1;
    if (tierCounts[tier] > NOTICE_BUDGET[tier]) {
      fail(`${path}[${String(index)}]`, `too many ${tier} notices, at most ${String(NOTICE_BUDGET[tier])}`);
    }
  });
}

/**
 * One commit of a range (D100), checked as the map's own weather is, over the
 * map's one terrain. A file it names in `unplaced` is a changed file of its
 * own that the terrain holds no place for, so its changed entry may name a
 * group the terrain lacks.
 */
function assertFrame(value: unknown, path: string, placed: Placed): void {
  const frame = expectRecord(value, path);
  expectString(frame['commit'], `${path}.commit`);
  expectString(frame['subject'], `${path}.subject`);
  const unplaced = new Set<string>();
  if (frame['unplaced'] !== undefined) {
    let previous: string | undefined;
    expectArray(frame['unplaced'], `${path}.unplaced`).forEach((raw, index) => {
      const at = `${path}.unplaced[${String(index)}]`;
      const file = expectString(raw, at);
      if (placed.files.has(file)) fail(at, `the terrain places "${file}"`);
      if (previous !== undefined && previous >= file) fail(at, `expected the paths sorted and unique, got "${file}" after "${previous}"`);
      previous = file;
      unplaced.add(file);
    });
  }
  const changed = assertWeather(frame['weather'], `${path}.weather`, placed, unplaced);
  for (const file of unplaced) {
    if (!changed.has(file)) fail(`${path}.unplaced`, `not a changed file "${file}"`);
  }
  assertNotices(frame['notices'], `${path}.notices`);
}

/** A weather over the terrain `placed` describes, `unplaced` the files of it that terrain holds no place for; hands back the changed paths. */
function assertWeather(value: unknown, path: string, placed: Placed, unplaced: ReadonlySet<string>): ReadonlySet<string> {
  const weather = expectRecord(value, path);

  const reach = expectArray(weather['reach'], `${path}.reach`);
  reach.forEach((raw, index) => {
    const entry = expectRecord(raw, `${path}.reach[${String(index)}]`);
    const cell = expectString(entry['cell'], `${path}.reach[${String(index)}].cell`);
    if (!placed.cells.has(cell)) fail(`${path}.reach[${String(index)}].cell`, `unknown cell "${cell}"`);
  });

  const changed = expectArray(weather['changed'], `${path}.changed`);
  const changedPaths = new Set<string>();
  changed.forEach((raw, index) => {
    const entry = expectRecord(raw, `${path}.changed[${String(index)}]`);
    const hasCell = entry['cell'] !== undefined;
    const hasGroup = entry['group'] !== undefined;
    if (hasCell === hasGroup) {
      fail(`${path}.changed[${String(index)}]`, 'exactly one of cell or group is required');
    }
    if (entry['group'] !== undefined) {
      const group = expectString(entry['group'], `${path}.changed[${String(index)}].group`);
      const own = typeof entry['path'] === 'string' && unplaced.has(entry['path']);
      if (!placed.groups.has(group) && !own) fail(`${path}.changed[${String(index)}].group`, `unknown group "${group}"`);
    }
    if (typeof entry['path'] === 'string') changedPaths.add(entry['path']);
  });

  const wiring = weather['wiring'];
  if (wiring !== undefined) {
    expectArray(wiring, `${path}.wiring`).forEach((raw, index) => {
      const at = `${path}.wiring[${String(index)}]`;
      const edge = expectRecord(raw, at);
      const from = expectString(edge['from'], `${at}.from`);
      const to = expectString(edge['to'], `${at}.to`);
      for (const [end, file] of [['from', from], ['to', to]] as const) {
        if (!placed.files.has(file)) fail(`${at}.${end}`, `unknown organelle or group file "${file}"`);
      }
      if (from === to) fail(at, 'a file does not import itself');
      if (!changedPaths.has(from) && !changedPaths.has(to)) fail(at, 'neither end is a changed file');
    });
  }

  // What got better, and the health that moved, is the change's own: each names a changed file (D98).
  const improvements = weather['improvements'];
  if (improvements !== undefined) {
    expectArray(improvements, `${path}.improvements`).forEach((raw, index) => assertImprovement(raw, `${path}.improvements[${String(index)}]`, changedPaths));
  }
  if (weather['health_delta'] !== undefined) assertHealthDelta(weather['health_delta'], `${path}.health_delta`, changedPaths);

  const dependencies = weather['dependencies'];
  if (dependencies !== undefined) {
    let previous: string | undefined;
    expectArray(dependencies, `${path}.dependencies`).forEach((raw, index) => {
      const at = `${path}.dependencies[${String(index)}]`;
      const name = assertDependency(raw, at);
      if (previous !== undefined && previous >= name) fail(`${at}.name`, `expected the names sorted and unique, got "${name}" after "${previous}"`);
      previous = name;
    });
  }

  const evidence = expectRecord(weather['evidence'], `${path}.evidence`);
  const unmeasured = evidence['unmeasured'];
  if (unmeasured !== undefined) {
    if (evidence['patch_coverage'] === undefined) fail(`${path}.evidence.unmeasured`, 'only a map with patch_coverage names unmeasured files');
    expectArray(unmeasured, `${path}.evidence.unmeasured`).forEach((file, index) => {
      const at = `${path}.evidence.unmeasured[${String(index)}]`;
      if (!changedPaths.has(expectString(file, at))) fail(at, `not a changed file "${String(file)}"`);
    });
  }

  const checks = expectRecord(weather['checks'], `${path}.checks`);
  const slots = expectArray(checks['slots'], `${path}.checks.slots`);
  slots.forEach((raw, index) => {
    const at = `${path}.checks.slots[${String(index)}]`;
    const slot = expectRecord(raw, at);
    const splits = slot['ok'] === false && slot['skipped'] !== true && Array.isArray(slot['scope']);
    if (slot['change'] === undefined) {
      if (splits) fail(`${at}.change`, 'a red slot that names files records the changed files it is on the change through');
      return;
    }
    if (!splits) fail(`${at}.change`, 'only a red slot that names files records a change');
    expectArray(slot['change'], `${at}.change`).forEach((file, entry) => {
      const pathAt = `${at}.change[${String(entry)}]`;
      if (!changedPaths.has(expectString(file, pathAt))) fail(pathAt, `not a changed file "${String(file)}"`);
    });
  });
  return changedPaths;
}

/** Turn an unknown value into a trusted `MapJson`, or throw naming the offending path. */
export function assertMap(value: unknown): MapJson {
  assertShape(value);
  return value;
}
