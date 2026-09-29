/**
 * map: the one assembly (§9, D32, D39, D40).
 *
 * `buildMap` is the whole of core's contract with the CLI: hand it the two
 * scans, the diff, the manifest delta, the log window and the `.check/`
 * artifacts, and it returns the `map.json` every renderer reads. It is pure
 * (C1), so the clock is an input too, and it decides nothing the parts have
 * not already settled: it rekeys the base terrain by the diff's renames
 * (D40), names the graph each computation runs on (D39), and composes
 * modules, depth, history, reach, evidence and notices in that order, and
 * finally lays the terrain out on the field every renderer draws (D24). Every
 * list leaves sorted (C3).
 */

import { DEFAULT_CONFIG } from './config.js';
import type { Config } from './config.js';
import { computeDepth } from './depth.js';
import type { FileDepth } from './depth.js';
import { computeCategory, computeEvidence, pathsOf } from './evidence.js';
import type { CheckArtifacts, Dupes, Health } from './evidence.js';
import { OTHER_GROUP, configMatcher, identifyGroups } from './groups.js';
import { computeHistory } from './history.js';
import type { Commit, CommitFile, FileHistory } from './history.js';
import { computeLayout } from './layout/index.js';
import { classifyFile, identifyModules } from './modules.js';
import type { ImportEdge, ModuleCell, Modules, ScannedFile } from './modules.js';
import { findGhosts, findPublicNames, rankNotices } from './notices.js';
import type { NamedEdge, PublishingMember, ScanFile } from './notices.js';
import { TESTS_GROUP, computeReach } from './reach.js';
import type { DiffFile } from './reach.js';
import { SCHEMA_VERSION } from './schema.js';
import type { Cell, DepAdded, ExceptionalEdge, Group, Instruments, MapJson, Organelle } from './schema.js';

/**
 * One workspace member of a scan: its package name, its directory and its
 * entry points (D43), and whether it publishes the names its surface exposes (D75).
 */
export type ScanMember = PublishingMember & { readonly dir: string; readonly entry: readonly string[] };

/** How a scan's entry points were looked up: through the reviewed repo's fallow (D22), or the manifests alone and why (C2). */
export type EntryPointLookup = { readonly source: 'fallow' } | { readonly source: 'manifests'; readonly reason: string };

/**
 * One extracted commit, as the CLI's import scan read it (D21). The shape is
 * declared here rather than beside the scanner because core cannot import the
 * CLI (C1): core owns the contract and the reader conforms to it, the way
 * `history.ts` owns `Commit` and `evidence.ts` owns `CheckArtifacts`.
 */
export type Scan = {
  readonly files: readonly ScanFile[];
  readonly edges: readonly NamedEdge[];
  readonly members: readonly ScanMember[];
  readonly entry_points: EntryPointLookup;
};

/** What the map is of: the commits it spans, and the clock a pure `buildMap` cannot read for itself (C3). */
export type MapMeta = {
  readonly repo: string;
  readonly base: string;
  readonly head: string;
  readonly merge_base: string;
  readonly generated_at: string;
};

export type BuildInputs = {
  readonly meta: MapMeta;
  /** The merge-base tree: the terrain is scanned from it (D32). */
  readonly base: Scan;
  /** The `HEAD` tree: the weather is scanned from it (D32, D46). */
  readonly head: Scan;
  /** `merge_base..HEAD`, keyed by head path, a rename carrying `from` (D25, D40). */
  readonly diff: readonly DiffFile[];
  /** The manifest delta (D47). */
  readonly deps_added: readonly DepAdded[];
  /** The log window the history math measures (D8, D30). */
  readonly commits: readonly Commit[];
  /** `HEAD`'s commit time in unix seconds: the age every file is measured back from. */
  readonly head_time: number;
  /** The `.check/` artifacts, or the reason there are none to trust (D41). */
  readonly check: CheckArtifacts;
};

/** fallow's compound `exceeded` values, split so the count of dents is the count of rules (§5.1). */
const EXCEEDED_RULES: ReadonlyMap<string, readonly string[]> = new Map([
  ['both', ['cognitive', 'cyclomatic']],
  ['cyclomatic_crap', ['crap', 'cyclomatic']],
  ['cognitive_crap', ['cognitive', 'crap']],
  ['all', ['cognitive', 'crap', 'cyclomatic']],
]);

const CYCLE = 'cycle';
const BOUNDARY = 'boundary';

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function sortUnique(values: Iterable<string>): readonly string[] {
  return [...new Set(values)].toSorted(byPath);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function edgeKey({ from, to }: ImportEdge): string {
  return `${from}\n${to}`;
}

/** The diff's renames, base path to head path. */
function renamesOf(diff: readonly DiffFile[]): ReadonlyMap<string, string> {
  return new Map(
    diff.flatMap((file) => (file.kind === 'renamed' && file.from !== undefined ? [[file.from, file.path] as const] : [])),
  );
}

/**
 * The base scan under head paths: the rekey D40 runs before anything else, so
 * that every list in `map.json` is keyed by the head path and `assertMap` can
 * join positions to organelles by id. A deleted file keeps its base path,
 * which no head file can own.
 */
function rekeyScan(scan: Scan, renames: ReadonlyMap<string, string>): Scan {
  if (renames.size === 0) return scan;
  const at = (path: string): string => renames.get(path) ?? path;
  return {
    ...scan,
    files: scan.files.map((file) => ({ ...file, path: at(file.path) })),
    edges: scan.edges.map((edge) => ({ ...edge, from: at(edge.from), to: at(edge.to) })),
    members: scan.members.map((member) => ({
      ...member,
      entry: member.entry.map(at),
      ...(member.surface === undefined ? {} : { surface: member.surface.map(at) }),
    })),
  };
}

/**
 * The log under head paths too, so a renamed file keeps the history its old
 * name earned. `git log` is read without `-M`, so the rename commit itself
 * lists both names; the two entries fold into one rather than counting the
 * file twice.
 */
function rekeyCommits(commits: readonly Commit[], renames: ReadonlyMap<string, string>): readonly Commit[] {
  if (renames.size === 0) return commits;
  return commits.map((commit) => {
    const files = new Map<string, CommitFile>();
    for (const file of commit.files) {
      const path = renames.get(file.path) ?? file.path;
      const seen = files.get(path);
      files.set(
        path,
        seen === undefined
          ? { path, added: file.added, deleted: file.deleted }
          : { path, added: seen.added + file.added, deleted: seen.deleted + file.deleted },
      );
    }
    return { ...commit, files: [...files.values()] };
  });
}

/** The terrain's files: the base tree, plus the files this change added, which the base has never seen (D32). */
function terrainFiles(base: Scan, head: Scan, added: ReadonlySet<string>): readonly ScannedFile[] {
  const files = new Map(base.files.map((file) => [file.path, file] as const));
  for (const file of head.files) {
    if (added.has(file.path) && !files.has(file.path)) files.set(file.path, file);
  }
  return [...files.values()].toSorted((a, b) => byPath(a.path, b.path));
}

/** The terrain's graph: the base edges, plus every head edge an added file is an end of (D39). */
function terrainEdges(base: Scan, head: Scan, added: ReadonlySet<string>): readonly ImportEdge[] {
  const edges = new Map<string, ImportEdge>();
  for (const edge of base.edges) edges.set(edgeKey(edge), { from: edge.from, to: edge.to });
  for (const edge of head.edges) {
    if (added.has(edge.from) || added.has(edge.to)) edges.set(edgeKey(edge), { from: edge.from, to: edge.to });
  }
  return [...edges.values()].toSorted((a, b) => byPath(a.from, b.from) || byPath(a.to, b.to));
}

/**
 * The entry points depth falls from: the base tree's, plus any the change
 * added, since a file born as a package's `bin` is not deep just because the
 * base never had it.
 */
function entryPoints(base: Scan, head: Scan, added: ReadonlySet<string>): readonly string[] {
  return sortUnique([
    ...base.members.flatMap((member) => member.entry),
    ...head.members.flatMap((member) => member.entry).filter((path) => added.has(path)),
  ]);
}

/**
 * The shore in D48's table order with `other` last, and the tests between
 * them. A test is evidence rather than shore (D4), but a changed one still
 * names exactly one group (D48), so `terrain.groups` carries the group it
 * names; the SVG draws them as stitches, never as a shore contour.
 */
function shoreGroups(files: readonly ScannedFile[], roots: readonly string[], config: Config): readonly Group[] {
  const shore = identifyGroups(files, config.groups, roots);
  const tests = files.filter((file) => classifyFile(file.path) === 'test').map((file) => file.path);
  const named: readonly Group[] = tests.length === 0 ? [] : [{ id: TESTS_GROUP, files: sortUnique(tests) }];
  return [
    ...shore.filter((group) => group.id !== OTHER_GROUP),
    ...named,
    ...shore.filter((group) => group.id === OTHER_GROUP),
  ];
}

/**
 * Every rule each file breaks, which is the count of vertices its shape has
 * pulled out (§5.1): fallow's thresholds from `health.json`, plus a cycle or a
 * boundary violation from `dead.json` naming it. No `.check/` means no dents,
 * never a round shape faked from silence (C2).
 */
function dentsOf(check: CheckArtifacts): ReadonlyMap<string, readonly string[]> {
  const found = new Map<string, Set<string>>();
  if (check.mode !== 'check') return new Map();
  const dent = (path: string, rule: string): void => {
    found.set(path, (found.get(path) ?? new Set<string>()).add(rule));
  };
  for (const finding of check.health?.findings ?? []) {
    for (const rule of EXCEEDED_RULES.get(finding.exceeded) ?? [finding.exceeded]) dent(finding.path, rule);
  }
  for (const finding of [...(check.dead?.circular_dependencies ?? []), ...(check.dead?.re_export_cycles ?? [])]) {
    for (const path of pathsOf(finding)) dent(path, CYCLE);
  }
  for (const finding of check.dead?.boundary_violations ?? []) {
    for (const path of pathsOf(finding)) dent(path, BOUNDARY);
  }
  return new Map([...found].map(([path, rules]) => [path, sortUnique(rules)]));
}

/**
 * Which clone family each file belongs to. fallow names no id for a family,
 * so the map numbers them: the families sorted by their own file lists,
 * `family-1` up, which is what makes two runs over one `dupes.json` mark the
 * same cells with the same glyph (C3).
 */
function cloneFamilies(dupes: Dupes | undefined): ReadonlyMap<string, string> {
  const families = (dupes?.clone_families ?? [])
    .map((family) => sortUnique(pathsOf(family)))
    .filter((files) => files.length > 0)
    .toSorted((a, b) => byPath(a.join('\n'), b.join('\n')));
  const of = new Map<string, string>();
  families.forEach((files, index) => {
    for (const path of files) {
      if (!of.has(path)) of.set(path, `family-${String(index + 1)}`);
    }
  });
  return of;
}

function functionCounts(health: Health | undefined): ReadonlyMap<string, number> {
  return new Map((health?.file_scores ?? []).map((score) => [score.path, score.function_count] as const));
}

/** fallow lists a cycle's files in import order, so `files[i]` imports `files[i + 1]` and the last closes it. */
function cycleEdges(finding: unknown): readonly ImportEdge[] {
  const files = isRecord(finding) ? finding['files'] : undefined;
  if (!Array.isArray(files)) return [];
  const cycle = files.filter((file): file is string => typeof file === 'string');
  if (cycle.length < 2) return [];
  return cycle.map((from, index) => ({ from, to: cycle[(index + 1) % cycle.length] ?? from }));
}

function boundaryEdges(finding: unknown): readonly ImportEdge[] {
  if (!isRecord(finding)) return [];
  const from = finding['from_path'];
  const to = finding['to_path'];
  return typeof from === 'string' && typeof to === 'string' ? [{ from, to }] : [];
}

/**
 * The only lines the map draws (§5.1): the cross-module import this change
 * introduced, which reach found across the two graphs, and the cycles and
 * boundary violations `.check/` reports. An edge whose ends the terrain cannot
 * place is dropped, since there is nowhere to draw it from or to.
 */
function exceptionalEdges(
  introduced: readonly ExceptionalEdge[],
  check: CheckArtifacts,
  terrain: ReadonlySet<string>,
): readonly ExceptionalEdge[] {
  const dead = check.mode === 'check' ? check.dead : undefined;
  const found: ExceptionalEdge[] = [
    ...introduced,
    ...[...(dead?.circular_dependencies ?? []), ...(dead?.re_export_cycles ?? [])].flatMap((finding) =>
      cycleEdges(finding).map((edge): ExceptionalEdge => ({ ...edge, kind: CYCLE })),
    ),
    ...(dead?.boundary_violations ?? []).flatMap((finding) =>
      boundaryEdges(finding).map((edge): ExceptionalEdge => ({ ...edge, kind: BOUNDARY })),
    ),
  ];
  const seen = new Set<string>();
  return found
    .filter((edge) => {
      if (edge.from === edge.to || !terrain.has(edge.from) || !terrain.has(edge.to)) return false;
      const key = `${edge.kind}\n${edgeKey(edge)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .toSorted((a, b) => byPath(a.from, b.from) || byPath(a.to, b.to) || byPath(a.kind, b.kind));
}

/**
 * Every terrain file inside a cell's contour: its own organelles, and every
 * descendant cell's, which is what makes a package cell a contour around all
 * of its descendants rather than around its barrel alone (D45).
 */
function filesInside(modules: Modules): ReadonlyMap<string, readonly string[]> {
  const children = new Map<string, ModuleCell[]>();
  for (const cell of modules.cells) {
    if (cell.parent !== undefined) children.set(cell.parent, [...(children.get(cell.parent) ?? []), cell]);
  }
  const inside = new Map<string, readonly string[]>();
  // Only a package cell is ever a parent and a package cell has no parent of
  // its own, so this descends one level and cannot recur forever.
  const collect = (cell: ModuleCell): readonly string[] => {
    const found = sortUnique([...cell.organelles, ...(children.get(cell.id) ?? []).flatMap(collect)]);
    inside.set(cell.id, found);
    return found;
  };
  for (const cell of modules.cells) collect(cell);
  return inside;
}

/** How many terrain files outside a cell read into it, and how many it reads out; a test is evidence, not a reader (D4). */
function fanOf(inside: ReadonlySet<string>, edges: readonly ImportEdge[], terrain: ReadonlySet<string>): {
  readonly fan_in: number;
  readonly fan_out: number;
} {
  const readers = new Set<string>();
  const read = new Set<string>();
  for (const { from, to } of edges) {
    if (!terrain.has(from) || !terrain.has(to)) continue;
    if (!inside.has(from) && inside.has(to)) readers.add(from);
    if (inside.has(from) && !inside.has(to)) read.add(to);
  }
  return { fan_in: readers.size, fan_out: read.size };
}

/** What `.check/` and the terrain graph know about every file, joined by path. */
type Signals = {
  readonly depth: ReadonlyMap<string, FileDepth>;
  readonly dents: ReadonlyMap<string, readonly string[]>;
  readonly family: ReadonlyMap<string, string>;
  readonly functions: ReadonlyMap<string, number>;
  readonly history: ReadonlyMap<string, FileHistory>;
};

function shallowest(files: readonly string[], depth: ReadonlyMap<string, FileDepth>): number {
  return files.reduce((band, path) => Math.min(band, depth.get(path)?.band ?? band), Number.POSITIVE_INFINITY);
}

/**
 * A cell's own numbers on top of what module identification found: the terrace
 * it is entered at (the shallowest its files reach, since that is where a
 * reader arrives), how many files read it and how many it reads, and the mass,
 * rules and duplication of everything inside its contour.
 */
function assembleCells(modules: Modules, edges: readonly ImportEdge[], signals: Signals): readonly Cell[] {
  const terrain = new Set(modules.organelles.map((organelle) => organelle.path));
  const inside = filesInside(modules);
  return modules.cells.map((cell): Cell => {
    const files = inside.get(cell.id) ?? [];
    const counted = files.flatMap((path) => {
      const count = signals.functions.get(path);
      return count === undefined ? [] : [count];
    });
    const [family] = sortUnique(
      files.flatMap((path) => {
        const id = signals.family.get(path);
        return id === undefined ? [] : [id];
      }),
    );
    const band = shallowest(files, signals.depth);
    return {
      id: cell.id,
      path: cell.path,
      kind: cell.kind,
      ...(cell.parent === undefined ? {} : { parent: cell.parent }),
      ...(cell.barrel === undefined ? {} : { barrel: cell.barrel }),
      organelles: [...cell.organelles].toSorted(byPath),
      band: Number.isFinite(band) ? band : 0,
      interface_size: cell.interface_size,
      body_loc: cell.body_loc,
      ...(counted.length === 0 ? {} : { function_count: counted.reduce((total, count) => total + count, 0) }),
      ...fanOf(new Set(files), edges, terrain),
      dents: sortUnique(files.flatMap((path) => signals.dents.get(path) ?? [])),
      ...(family === undefined ? {} : { clone_family: family }),
    };
  });
}

/** Every terrain file, on its terrace, with the past and the findings that belong to it. */
function assembleOrganelles(modules: Modules, signals: Signals): readonly Organelle[] {
  return modules.organelles
    .map((organelle): Organelle => {
      // Depth is handed exactly this file list, so every organelle has a place.
      const place = signals.depth.get(organelle.path);
      const past = signals.history.get(organelle.path);
      const functions = signals.functions.get(organelle.path);
      const family = signals.family.get(organelle.path);
      return {
        id: organelle.id,
        path: organelle.path,
        cell: organelle.cell,
        band: place?.band ?? 0,
        reachable: place?.reachable ?? false,
        loc: organelle.loc,
        ...(functions === undefined ? {} : { function_count: functions }),
        dents: signals.dents.get(organelle.path) ?? [],
        ...(past?.churn_ratio === undefined ? {} : { churn_ratio: past.churn_ratio }),
        ...(past?.age_days === undefined ? {} : { age_days: past.age_days }),
        ...(past?.bugfix_rate === undefined ? {} : { bugfix_rate: past.bugfix_rate }),
        ...(family === undefined ? {} : { clone_family: family }),
      };
    })
    .toSorted((a, b) => byPath(a.id, b.id));
}

type EntryPointsRead = Pick<Instruments, 'entry_points' | 'entry_points_reason'>;

/**
 * Where the entry points the depth bands hang from came from (D22): fallow
 * only when both scans read it, else the manifests and why, said once when
 * the two sides failed alike and by side when they did not (C2).
 */
function entryPointsOf(base: EntryPointLookup, head: EntryPointLookup): EntryPointsRead {
  if (base.source === 'fallow' && head.source === 'fallow') return { entry_points: 'fallow' };
  if (base.source === 'manifests' && head.source === 'manifests' && base.reason === head.reason) {
    return { entry_points: 'manifests', entry_points_reason: base.reason };
  }
  const reasons = [
    ...(base.source === 'manifests' ? [`base: ${base.reason}`] : []),
    ...(head.source === 'manifests' ? [`head: ${head.reason}`] : []),
  ];
  return { entry_points: 'manifests', entry_points_reason: reasons.join('; ') };
}

/** What the map was measured with, and what it could not be: the muted channels say so by name (C2, D41). */
function instrumentsOf(check: CheckArtifacts, entries: EntryPointsRead): Instruments {
  if (check.mode === 'git-only') return { mode: 'git-only', reason: check.reason, ...entries };
  const stale = check.stale
    .map((channel) => `${channel.slot}: ${channel.file}, ${String(channel.age_ms)} ms older than the run`)
    .toSorted(byPath);
  return {
    mode: 'check',
    ...entries,
    ...(Object.keys(check.fallow_schemas).length === 0 ? {} : { fallow_schemas: check.fallow_schemas }),
    ...(stale.length === 0 ? {} : { stale }),
  };
}

/**
 * Assemble `map.json`. The order below is the one the step fixes: rekey, then
 * modules and the shore, then depth, history, reach, evidence and notices,
 * each told which graph it runs on (D39). Nothing here reads a clock, a file
 * or a process; two runs over one input set differ in nothing at all (C3).
 */
export function buildMap(inputs: BuildInputs, config: Config = DEFAULT_CONFIG): MapJson {
  const renames = renamesOf(inputs.diff);
  const base = rekeyScan(inputs.base, renames);
  const { head } = inputs;
  const added = new Set(inputs.diff.filter((file) => file.kind === 'added').map((file) => file.path));

  const files = terrainFiles(base, head, added);
  const edges = terrainEdges(base, head, added);
  const roots = sortUnique([...base.members, ...head.members].map((member) => member.dir));
  const isConfig = configMatcher(config.groups);
  const modules = identifyModules(files, edges, roots, isConfig);
  const groups = shoreGroups(files, roots, config);

  // A `.ts`/`.tsx` that configures a tool is shore, not terrain (D57): it founds
  // no cell above and never sits on a terrace or ties one below, so depth is
  // handed neither the file nor an edge that touches it.
  const depths = computeDepth(
    edges.filter((edge) => !isConfig(edge.from) && !isConfig(edge.to)),
    entryPoints(base, head, added),
    files.filter((file) => !isConfig(file.path)).map((file) => file.path),
  );
  const history = computeHistory(
    rekeyCommits(inputs.commits, renames),
    new Map(head.files.map((file) => [file.path, file.loc] as const)),
    inputs.diff.map((file) => file.path),
    inputs.head_time,
  );

  const graphs = { modules, groups, headEdges: head.edges, baseEdges: base.edges } as const;
  const reach = computeReach({ ...graphs, changed: inputs.diff });
  const evidence = computeEvidence({ ...graphs, changed: reach.changed, check: inputs.check });
  const checks = computeCategory({
    check: inputs.check,
    changed: reach.changed,
    files: evidence.files,
    stitches: evidence.evidence.stitches ?? [],
    config,
  });

  const ran = inputs.check.mode === 'check' ? inputs.check : undefined;
  const signals: Signals = {
    depth: new Map(depths.files.map((file) => [file.path, file] as const)),
    dents: dentsOf(inputs.check),
    family: cloneFamilies(ran?.dupes),
    functions: functionCounts(ran?.health),
    history: new Map(history.files.map((file) => [file.path, file] as const)),
  };
  const cells = assembleCells(modules, edges, signals);
  const organelles = assembleOrganelles(modules, signals);
  const deps_added = [...inputs.deps_added].toSorted((a, b) => byPath(a.manifest, b.manifest) || byPath(a.name, b.name));
  const ghosts = findGhosts(history.cochange, inputs.diff.map((file) => file.path), config.notices);
  // Last, because the field is drawn over everything above it: the terrain
  // settles from the base alone and the added files find their place after
  // it, so the weather never moves the ground (D32).
  const layout = computeLayout({ cells, organelles, edges, bands: depths.bands, groups, added });

  return {
    meta: {
      schema_version: SCHEMA_VERSION,
      generated_at: inputs.meta.generated_at,
      repo: inputs.meta.repo,
      base: inputs.meta.base,
      head: inputs.meta.head,
      merge_base: inputs.meta.merge_base,
      mode: 'change',
      instruments: instrumentsOf(inputs.check, entryPointsOf(inputs.base.entry_points, head.entry_points)),
    },
    terrain: {
      cells,
      organelles,
      bands: depths.bands,
      groups,
      edges_exceptional: exceptionalEdges(
        reach.edges_exceptional,
        inputs.check,
        new Set(modules.organelles.map((organelle) => organelle.path)),
      ),
      history: { window_commits: history.window_commits, cochange: history.cochange },
      layout,
    },
    weather: {
      changed: reach.changed,
      reach: reach.reach,
      evidence: evidence.evidence,
      checks,
      ghosts,
      deps_added,
      improvements: [],
    },
    notices: rankNotices({
      changed: reach.changed,
      files: evidence.files,
      checks,
      cells,
      groups,
      history: history.files,
      cochange: history.cochange,
      deps_added,
      baseFiles: base.files,
      headFiles: head.files,
      headEdges: head.edges,
      baseEdges: base.edges,
      publicNames: findPublicNames([base, head]),
      check: inputs.check,
      config,
    }),
  };
}
