/**
 * map: the one assembly (§9, D32, D39, D40).
 *
 * `buildMap` is the whole of core's contract with the CLI: hand it the two
 * scans, the diff, the manifest delta, the log window and the `.check/`
 * artifacts, and it returns the `map.json` every renderer reads. It is pure
 * (C1), so the clock is an input too, and it decides nothing the parts have
 * not already settled: it rekeys the base terrain by the diff's renames
 * (D40), names the graph each computation runs on (D39), and composes
 * modules, depth, history, reach, evidence and notices in that order, counts
 * the outside packages the terrain imports (D170), and finally lays the
 * terrain out on the field every renderer draws (D24). Every list leaves
 * sorted (C3). Handed a range's commits, it runs the same assembly at each,
 * short of the layout, for the weather frames a reviewer scrubs over the one
 * terrain (D100). `layOutTerrain` runs the same assembly over a base commit
 * alone, for the terrain the CLI caches per base (D96), and `buildRepoMap`
 * runs it over one commit as a change of nothing, with the whole
 * repository's overlays in place of weather (D101).
 */

import { DEFAULT_CONFIG } from './config.js';
import type { Config } from './config.js';
import { computeDependencies } from './dependencies.js';
import { computeDepth } from './depth.js';
import type { Depths, FileDepth } from './depth.js';
import { compareStructure, computeCategory, computeEvidence, dentsFrom, rulesOf, trustCoverage } from './evidence.js';
import type { CheckArtifacts, Dupes, Health, HealthFinding, Structure } from './evidence.js';
import { OTHER_GROUP, identifyGroups, shoreMatcher } from './groups.js';
import { computeHistory } from './history.js';
import type { Commit, CommitFile, FileHistory } from './history.js';
import { computeLayout } from './layout/index.js';
import type { Ground, Prior } from './layout/index.js';
import { classifyFile, identifyModules } from './modules.js';
import type { ImportEdge, ModuleCell, Modules, ScannedFile } from './modules.js';
import { findGhosts, findPublicNames, rankNotices } from './notices.js';
import type { NamedEdge, PublishingMember, ScanFile } from './notices.js';
import { computeOverlays, numberCloneFamilies } from './overlays.js';
import type { CheckBaseline } from './overlays.js';
import { TESTS_GROUP, computeReach } from './reach.js';
import type { DiffFile } from './reach.js';
import { SCHEMA_VERSION } from './schema.js';
import type {
  Cell,
  DepAdded,
  DepMoved,
  ExceptionalEdge,
  FileFunction,
  Frame,
  Group,
  Instruments,
  Layout,
  MapJson,
  Notice,
  Organelle,
  Stability,
  StructureSide,
  Terrain,
  Ties,
  Weather,
  WiringEdge,
} from './schema.js';
import { computePackageTies, computeTies } from './ties.js';

/**
 * One workspace member of a scan: its package name, its directory and its
 * entry points (D43), and whether it publishes the names its surface exposes (D75).
 */
export type ScanMember = PublishingMember & { readonly dir: string; readonly entry: readonly string[] };

/** How a scan's entry points were looked up: through the reviewed repo's fallow (D22), or the manifests alone and why (C2). */
export type EntryPointLookup = { readonly source: 'fallow' } | { readonly source: 'manifests'; readonly reason: string };

/** One named function of a scanned file (D102): its name, the line it starts on and how many lines it spans. */
export type ScanFunction = { readonly name: string; readonly line: number; readonly line_count: number };

/** A scanned file, with the functions the scan read in it where it read them (D102). */
export type ScanFileOf = ScanFile & { readonly functions?: readonly ScanFunction[] };

/**
 * One extracted commit, as the CLI's import scan read it (D21). The shape is
 * declared here rather than beside the scanner because core cannot import the
 * CLI (C1): core owns the contract and the reader conforms to it, the way
 * `history.ts` owns `Commit` and `evidence.ts` owns `CheckArtifacts`.
 */
export type Scan = {
  readonly files: readonly ScanFileOf[];
  readonly edges: readonly NamedEdge[];
  readonly members: readonly ScanMember[];
  readonly entry_points: EntryPointLookup;
};

/** What the map is of: the commits it spans, and the clock a pure `buildMap` cannot read for itself (C3). */
export type MapMeta = {
  readonly repo: string;
  /** The base as resolved, and as typed when it was (D99). */
  readonly base: string;
  readonly base_typed?: string | undefined;
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
  /** The ranges the manifest delta moved (D83); absent reads as none moved. */
  readonly deps_moved?: readonly DepMoved[];
  /** The log window the history math measures (D8, D30). */
  readonly commits: readonly Commit[];
  /** `HEAD`'s commit time in unix seconds: the age every file is measured back from. */
  readonly head_time: number;
  /** The `.check/` artifacts, or the reason there are none to trust (D41). */
  readonly check: CheckArtifacts;
  /** A layout to relax from, keyed by path: a nearest cached ancestor's, as `layOutTerrain` is handed one (D97); absent, the field settles from nothing. */
  readonly prior?: Prior;
  /**
   * The base terrain's own layout, which the CLI keeps per base (D96): the
   * map holds it wherever the change left the ground alone and lays out only
   * the rest (D172), and relaxes from it where the base's field cannot hold
   * the change (D97). It outranks `prior`.
   */
  readonly ground?: Layout;
  /** fallow's measure of the base and the head extractions (D98); absent, the map says nothing of either. */
  readonly structure?: { readonly base: Structure; readonly head: Structure };
  /** A range's commits, oldest first, each read as the head (D100); absent, the map is of one change and has no sequence. */
  readonly frames?: readonly FrameInputs[];
};

/**
 * One commit of a range, as the head side of a change over the map's own
 * base (D100): the commit and its subject, and every input `buildMap` reads
 * from a head, each read at that commit. Its `.check/` is the run's own only
 * when the commit is the checked-out `HEAD`; any other reads git-only (D135).
 */
export type FrameInputs = Pick<BuildInputs, 'head' | 'diff' | 'deps_added' | 'deps_moved' | 'commits' | 'head_time' | 'check' | 'structure'> & {
  readonly commit: string;
  readonly subject: string;
};

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

/** What the terrain is made of: its files and graph, its cells and shore, and the terraces its files stand on (D32, D39). */
type Standing = {
  readonly files: readonly ScannedFile[];
  readonly edges: readonly ImportEdge[];
  readonly roots: readonly string[];
  readonly isShore: (path: string) => boolean;
  readonly modules: Modules;
  readonly groups: readonly Group[];
  readonly depths: Depths;
};

/**
 * The terrain a change stands on: the base tree with the change's added files
 * (D32), its cells and shore, and the terraces of its files. A `.ts`/`.tsx`
 * that configures a tool (D57), or that a build committed (D84), is shore, not
 * terrain: it founds no cell above and never sits on a terrace or ties one
 * below, so depth is handed neither the file nor an edge that touches it.
 */
function standingOf(base: Scan, head: Scan, added: ReadonlySet<string>, config: Config): Standing {
  const files = terrainFiles(base, head, added);
  const edges = terrainEdges(base, head, added);
  const roots = sortUnique([...base.members, ...head.members].map((member) => member.dir));
  const isShore = shoreMatcher(config.groups, roots);
  const modules = identifyModules(files, edges, roots, isShore);
  const groups = shoreGroups(files, roots, config);
  const depths = computeDepth(
    edges.filter((edge) => !isShore(edge.from) && !isShore(edge.to)),
    entryPoints(base, head, added),
    files.filter((file) => !isShore(file.path)).map((file) => file.path),
  );
  return { files, edges, roots, isShore, modules, groups, depths };
}

/**
 * The base's own field as its layout was laid out (D172): the terrain
 * `layOutTerrain` stands on for the base tree alone, which is what a file of
 * the change is compared with to say whether it still stands where the base
 * put it.
 */
function groundOf(layout: Layout, base: Scan, config: Config): Ground {
  const { modules, groups, depths } = standingOf(base, base, new Set(), config);
  const bandOf = new Map(depths.files.map((file) => [file.path, file.band] as const));
  return {
    layout,
    cells: modules.cells,
    organelles: modules.organelles.map((organelle) => ({ id: organelle.id, cell: organelle.cell, band: bandOf.get(organelle.path) ?? 0, loc: organelle.loc })),
    bands: depths.bands,
    groups,
  };
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
  return check.mode === 'check' ? dentsFrom(check.health, check.dead) : new Map();
}

/**
 * Which clone family each file belongs to, under the number the overlays give
 * the same family (C3, D101).
 */
function cloneFamilies(dupes: Dupes | undefined): ReadonlyMap<string, string> {
  const of = new Map<string, string>();
  for (const { id, files } of numberCloneFamilies(dupes)) {
    for (const path of files) {
      if (!of.has(path)) of.set(path, id);
    }
  }
  return of;
}

/** What a function fallow names but the scan bound to no name is called when fallow names it nothing either. */
const ANONYMOUS = '<anonymous>';

/**
 * One file's functions with what fallow found in them (D102): each finding
 * joins the function that starts on its line, the one of its name on that
 * line first, else the one of its name whose lines hold it; a finding no
 * scanned function takes, a callback the scan bound to no name, stands as a
 * function of its own under fallow's name for it. With no findings read, no
 * function carries breaches, since none were looked for (C2).
 */
function joinFunctions(scanned: readonly ScanFunction[], findings: readonly HealthFinding[] | undefined): readonly FileFunction[] {
  const byLine = (a: FileFunction, b: FileFunction): number => a.line - b.line || byPath(a.name, b.name);
  if (findings === undefined) return scanned.map(({ name, line, line_count }): FileFunction => ({ name, line, line_count })).toSorted(byLine);
  const rules = new Map<ScanFunction, Set<string>>(scanned.map((fn) => [fn, new Set<string>()] as const));
  const alone = new Map<string, { readonly fn: FileFunction; readonly rules: Set<string> }>();
  for (const finding of findings) {
    const within = (fn: ScanFunction): boolean => finding.line >= fn.line && finding.line < fn.line + fn.line_count;
    const joined =
      scanned.find((fn) => fn.line === finding.line && fn.name === finding.name) ??
      scanned.find((fn) => fn.line === finding.line) ??
      scanned.find((fn) => fn.name === finding.name && within(fn));
    if (joined !== undefined) {
      for (const rule of rulesOf(finding.exceeded)) rules.get(joined)?.add(rule);
      continue;
    }
    const name = finding.name ?? ANONYMOUS;
    const key = `${String(finding.line)}\n${name}`;
    const own = alone.get(key) ?? { fn: { name, line: finding.line, line_count: finding.line_count }, rules: new Set<string>() };
    for (const rule of rulesOf(finding.exceeded)) own.rules.add(rule);
    alone.set(key, own);
  }
  return [
    ...scanned.map((fn): FileFunction => ({ name: fn.name, line: fn.line, line_count: fn.line_count, breaches: sortUnique(rules.get(fn) ?? []) })),
    ...[...alone.values()].map(({ fn, rules: own }): FileFunction => ({ ...fn, breaches: sortUnique(own) })),
  ].toSorted(byLine);
}

/** Each head file's functions, by path, where the head scan read them (D102); a file it read none in is left out (C2). */
function fileFunctions(files: readonly ScanFileOf[], health: Health | undefined): ReadonlyMap<string, readonly FileFunction[]> {
  const findings = new Map<string, HealthFinding[]>();
  for (const finding of health?.findings ?? []) findings.set(finding.path, [...(findings.get(finding.path) ?? []), finding]);
  return new Map(
    files.flatMap((file) => (file.functions === undefined ? [] : [[file.path, joinFunctions(file.functions, health === undefined ? undefined : (findings.get(file.path) ?? []))] as const])),
  );
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
 * The change's wiring (§6's LOD2 overlay): every import edge on the head graph
 * with a changed file at either end, the importers and importees a reviewer
 * opens a cell to read (D39). A test reads a changed file as any importer
 * does, so its edges stay. An end the map does not place is dropped, since no
 * renderer could draw it, and a repeated edge counts once.
 */
function wiringOf(edges: readonly ImportEdge[], changed: ReadonlySet<string>, placed: ReadonlySet<string>): readonly WiringEdge[] {
  const found = new Map<string, WiringEdge>();
  for (const { from, to } of edges) {
    if (from === to || !placed.has(from) || !placed.has(to)) continue;
    if (changed.has(from) || changed.has(to)) found.set(edgeKey({ from, to }), { from, to });
  }
  return [...found.values()].toSorted((a, b) => byPath(a.from, b.from) || byPath(a.to, b.to));
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

type Fan = { readonly fan_in: number; readonly fan_out: number };

function addTo(sets: Map<string, Set<string>>, cell: string, file: string): void {
  sets.set(cell, (sets.get(cell) ?? new Set<string>()).add(file));
}

/**
 * How many terrain files outside each cell read into it, and how many it
 * reads out; a test is evidence, not a reader (D4). One walk of the graph
 * serves every cell: an edge counts for each cell holding one end and not
 * the other.
 */
function fansOf(inside: ReadonlyMap<string, readonly string[]>, edges: readonly ImportEdge[], terrain: ReadonlySet<string>): ReadonlyMap<string, Fan> {
  const holders = new Map<string, string[]>();
  for (const [cell, files] of inside) {
    for (const file of files) holders.set(file, [...(holders.get(file) ?? []), cell]);
  }
  const readers = new Map<string, Set<string>>();
  const read = new Map<string, Set<string>>();
  for (const { from, to } of edges) {
    if (!terrain.has(from) || !terrain.has(to)) continue;
    const [out, into] = [holders.get(from) ?? [], holders.get(to) ?? []];
    for (const cell of into) if (!out.includes(cell)) addTo(readers, cell, from);
    for (const cell of out) if (!into.includes(cell)) addTo(read, cell, to);
  }
  return new Map([...inside.keys()].map((cell) => [cell, { fan_in: readers.get(cell)?.size ?? 0, fan_out: read.get(cell)?.size ?? 0 }] as const));
}

/** What `.check/`, the terrain graph and the head scan know about every file, joined by path. */
type Signals = {
  readonly depth: ReadonlyMap<string, FileDepth>;
  /** The names each file the head scan read exports (D162). */
  readonly exports: ReadonlyMap<string, readonly string[]>;
  readonly dents: ReadonlyMap<string, readonly string[]>;
  readonly family: ReadonlyMap<string, string>;
  readonly functions: ReadonlyMap<string, number>;
  /** Each head file's functions with fallow's findings joined to them (D102). */
  readonly bodies: ReadonlyMap<string, readonly FileFunction[]>;
  readonly history: ReadonlyMap<string, FileHistory>;
  readonly stability: ReadonlyMap<string, Stability>;
  readonly ties: ReadonlyMap<string, Ties>;
  readonly packageTies: ReadonlyMap<string, Ties>;
};

function shallowest(files: readonly string[], depth: ReadonlyMap<string, FileDepth>): number {
  return files.reduce((band, path) => Math.min(band, depth.get(path)?.band ?? band), Number.POSITIVE_INFINITY);
}

/**
 * The names a cell's interface exports at head (D162): every name the head
 * scan read on the files module identification found it is entered through.
 * None where the head scan read none of them, as when the change deleted the
 * barrel, rather than an empty list that would say the cell exports nothing (C2).
 */
function exportsOf(cell: ModuleCell, exports: ReadonlyMap<string, readonly string[]>): readonly string[] | undefined {
  const read = cell.interface_files.flatMap((path) => {
    const names = exports.get(path);
    return names === undefined ? [] : [names];
  });
  return read.length === 0 ? undefined : sortUnique(read.flat());
}

/**
 * A cell's own numbers on top of what module identification found: the terrace
 * it is entered at (the shallowest its files reach, since that is where a
 * reader arrives), the names its interface exports, how many files read it and
 * how many it reads, and the mass, rules and duplication of everything inside
 * its contour.
 */
function assembleCells(modules: Modules, edges: readonly ImportEdge[], signals: Signals): readonly Cell[] {
  const terrain = new Set(modules.organelles.map((organelle) => organelle.path));
  const inside = filesInside(modules);
  const fans = fansOf(inside, edges, terrain);
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
    const exports = exportsOf(cell, signals.exports);
    return {
      id: cell.id,
      path: cell.path,
      kind: cell.kind,
      ...(cell.parent === undefined ? {} : { parent: cell.parent }),
      ...(cell.barrel === undefined ? {} : { barrel: cell.barrel }),
      organelles: [...cell.organelles].toSorted(byPath),
      band: Number.isFinite(band) ? band : 0,
      interface_size: cell.interface_size,
      ...(exports === undefined ? {} : { exports }),
      body_loc: cell.body_loc,
      ...(counted.length === 0 ? {} : { function_count: counted.reduce((total, count) => total + count, 0) }),
      ...(fans.get(cell.id) ?? { fan_in: 0, fan_out: 0 }),
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
      const settled = signals.stability.get(organelle.path);
      const ties = signals.ties.get(organelle.path);
      const packageTies = signals.packageTies.get(organelle.path);
      const functions = signals.functions.get(organelle.path);
      const bodies = signals.bodies.get(organelle.path);
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
        ...(settled === undefined ? {} : { stability: settled }),
        ...(ties === undefined ? {} : { ties }),
        ...(packageTies === undefined ? {} : { package_ties: packageTies }),
        ...(family === undefined ? {} : { clone_family: family }),
        ...(bodies === undefined ? {} : { functions: bodies }),
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

/** One side's structure as the map records it: the fallow that measured it and what it could not read, or why it was never measured (D98, C2). */
function structureSide(structure: Structure): StructureSide {
  if ('reason' in structure) return { reason: structure.reason };
  const muted = [...structure.muted].toSorted(byPath);
  return { fallow: structure.fallow, ...(muted.length === 0 ? {} : { muted }) };
}

/** What the map was measured with, and what it could not be: the muted channels say so by name (C2, D41, D98, D122). */
function instrumentsOf(check: CheckArtifacts, entries: EntryPointsRead, muted: readonly string[], structure: BuildInputs['structure']): Instruments {
  const measured = structure === undefined ? {} : { structure: { base: structureSide(structure.base), head: structureSide(structure.head) } };
  if (check.mode === 'git-only') return { mode: 'git-only', reason: check.reason, ...entries, ...measured };
  const stale = check.stale
    .map((channel) => `${channel.slot}: ${channel.file}, ${String(channel.age_ms)} ms older than the run`)
    .toSorted(byPath);
  return {
    mode: 'check',
    ...entries,
    ...(Object.keys(check.fallow_schemas).length === 0 ? {} : { fallow_schemas: check.fallow_schemas }),
    ...(stale.length === 0 ? {} : { stale }),
    ...(muted.length === 0 ? {} : { muted: [...muted].toSorted(byPath) }),
    ...measured,
  };
}

/**
 * Assemble `map.json`. The order below is the one the step fixes: rekey, then
 * modules and the shore, then depth, history, reach, evidence and notices,
 * each told which graph it runs on (D39). Nothing here reads a clock, a file
 * or a process; two runs over one input set differ in nothing at all (C3).
 */
export function buildMap(inputs: BuildInputs, config: Config = DEFAULT_CONFIG): MapJson & { readonly terrain: { readonly layout: Layout } } {
  const { lay, ...change } = assemble(inputs, config);
  const map = { ...change, terrain: { ...change.terrain, layout: lay() } };
  if (inputs.frames === undefined) return map;
  const frames = inputs.frames.map((frame) => frameOver(inputs, frame, map.terrain, config));
  return { ...map, sequence: { frames } };
}

/**
 * One commit of a range over the map's one terrain (D100): the weather and
 * notices `buildMap` gives that commit as the head, short of a layout of its
 * own. The terrain is the range head's and never moves (P2), so a file only
 * an earlier commit had (one the head renamed or deleted since) has no place
 * on it. Its changed entry stays, so the frame's counts and notices hold, and
 * it is named in `unplaced`; only what cannot be drawn without a place, its
 * wiring and its reach into a cell the terrain lacks, is left out (C2).
 */
function frameOver(inputs: BuildInputs, frame: FrameInputs, terrain: Terrain, config: Config): Frame {
  const { commit, subject, ...head } = frame;
  const { weather, notices } = assemble({ ...inputs, ...head }, config);
  const placed = new Set([...terrain.organelles.map((organelle) => organelle.path), ...terrain.groups.flatMap((group) => group.files)]);
  const cells = new Set(terrain.cells.map((cell) => cell.id));
  const unplaced = sortUnique(weather.changed.map((file) => file.path).filter((path) => !placed.has(path)));
  const { wiring } = weather;
  const kept: Weather = {
    ...weather,
    reach: weather.reach.filter((entry) => cells.has(entry.cell)),
    ...(wiring === undefined ? {} : { wiring: wiring.filter((edge) => placed.has(edge.from) && placed.has(edge.to)) }),
  };
  return { commit, subject, weather: kept, notices, ...(unplaced.length === 0 ? {} : { unplaced }) };
}

/** Everything `buildMap` derives from one change but the layout, and the layout itself held back until asked for, since a range's frames never lay out (D100). */
type Assembled = Omit<MapJson, 'terrain' | 'sequence'> & {
  readonly terrain: Omit<Terrain, 'layout'>;
  readonly lay: () => Layout;
  readonly weather: Weather;
  readonly notices: readonly Notice[];
};

function assemble(inputs: BuildInputs, config: Config): Assembled {
  const renames = renamesOf(inputs.diff);
  const base = rekeyScan(inputs.base, renames);
  const { head } = inputs;
  const added = new Set(inputs.diff.filter((file) => file.kind === 'added').map((file) => file.path));

  const { edges, isShore, modules, groups, depths } = standingOf(base, head, added, config);
  const history = computeHistory(
    rekeyCommits(inputs.commits, renames),
    new Map(head.files.map((file) => [file.path, file.loc] as const)),
    inputs.diff.map((file) => file.path),
    inputs.head_time,
  );

  // A coverage report that names none of the head tree's source files is some
  // other tree's, and is muted rather than read as every file unmeasured (D122).
  const trusted = trustCoverage(
    inputs.check,
    new Set(head.files.filter((file) => classifyFile(file.path, isShore) === 'source').map((file) => file.path)),
  );
  const check = trusted.check;
  const graphs = { modules, groups, headEdges: head.edges, baseEdges: base.edges } as const;
  const reach = computeReach({ ...graphs, changed: inputs.diff });
  const code = new Map(head.files.flatMap((file) => (file.code === undefined ? [] : [[file.path, file.code] as const])));
  const evidence = computeEvidence({ ...graphs, changed: reach.changed, check, code });
  // What fallow measured the change did against its base, where it measured both sides (D98).
  const terrain = new Set(modules.organelles.map((organelle) => organelle.path));
  const structure = inputs.structure === undefined ? {} : compareStructure({ ...inputs.structure, diff: inputs.diff, terrain });
  const deps_added = [...inputs.deps_added].toSorted((a, b) => byPath(a.manifest, b.manifest) || byPath(a.name, b.name));
  const deps_moved = [...(inputs.deps_moved ?? [])].toSorted((a, b) => byPath(a.manifest, b.manifest) || byPath(a.name, b.name));
  const checks = computeCategory({
    check,
    structure,
    changed: reach.changed,
    files: evidence.files,
    stitches: evidence.evidence.stitches ?? [],
    deps_added,
    deps_moved,
    config,
  });

  const ran = check.mode === 'check' ? check : undefined;
  const deleted = new Set(inputs.diff.filter((file) => file.kind === 'deleted').map((file) => file.path));
  const signals: Signals = {
    depth: new Map(depths.files.map((file) => [file.path, file] as const)),
    exports: new Map(head.files.map((file) => [file.path, file.exports] as const)),
    dents: dentsOf(check),
    family: cloneFamilies(ran?.dupes),
    functions: functionCounts(ran?.health),
    bodies: fileFunctions(head.files.filter((file) => !deleted.has(file.path)), ran?.health),
    history: new Map(history.files.map((file) => [file.path, file] as const)),
    stability: new Map(history.stability.map(({ path, ...settled }) => [path, settled] as const)),
    ties: computeTies(modules.organelles, head.edges, deleted),
    packageTies: computePackageTies(modules.organelles, modules.cells, head.edges, deleted),
  };
  const cells = assembleCells(modules, edges, signals);
  const organelles = assembleOrganelles(modules, signals);
  const dependencies = computeDependencies({
    files: head.files,
    terrain: new Set(modules.organelles.map((organelle) => organelle.path)),
    deps_added,
    deps_moved,
    security: ran?.security,
  });
  const ghosts = findGhosts(history.cochange, inputs.diff.map((file) => file.path), config.notices);
  // Last, because the field is drawn over everything above it: the terrain
  // settles from the base alone and the added files find their place after
  // it, so the weather never moves the ground (D32).
  // A renamed file's old place is read from the prior under its base path (D40, D97).
  // Over its base's own layout, the map holds the ground the change left alone (D172).
  const lay = (): Layout => {
    const { prior, ground } = inputs;
    const renamed = new Map([...renames].map(([from, path]) => [path, from] as const));
    const before = ground === undefined ? (prior === undefined ? {} : { prior }) : { ground: groundOf(ground, inputs.base, config) };
    return computeLayout({ cells, organelles, edges, bands: depths.bands, groups, added, renames: renamed, ...before });
  };

  return {
    lay,
    meta: {
      schema_version: SCHEMA_VERSION,
      generated_at: inputs.meta.generated_at,
      repo: inputs.meta.repo,
      base: inputs.meta.base,
      ...(inputs.meta.base_typed === undefined ? {} : { base_typed: inputs.meta.base_typed }),
      head: inputs.meta.head,
      merge_base: inputs.meta.merge_base,
      mode: 'change',
      instruments: instrumentsOf(
        check,
        entryPointsOf(inputs.base.entry_points, head.entry_points),
        trusted.muted === undefined ? [] : [trusted.muted],
        inputs.structure,
      ),
    },
    terrain: {
      cells,
      organelles,
      bands: depths.bands,
      groups,
      edges_exceptional: exceptionalEdges(
        reach.edges_exceptional,
        check,
        new Set(modules.organelles.map((organelle) => organelle.path)),
      ),
      history: { window_commits: history.window_commits, cochange: history.cochange },
    },
    weather: {
      changed: reach.changed,
      reach: reach.reach,
      wiring: wiringOf(
        head.edges,
        new Set(reach.changed.map((file) => file.path)),
        new Set([...modules.organelles.map((organelle) => organelle.path), ...groups.flatMap((group) => group.files)]),
      ),
      evidence: evidence.evidence,
      checks,
      ghosts,
      deps_added,
      deps_moved,
      ...(dependencies === undefined ? {} : { dependencies }),
      ...(structure.improvements === undefined ? {} : { improvements: structure.improvements }),
      ...(structure.health_delta === undefined ? {} : { health_delta: structure.health_delta }),
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
      deps_moved,
      baseFiles: base.files,
      headFiles: head.files,
      headEdges: head.edges,
      baseEdges: base.edges,
      publicNames: findPublicNames([base, head]),
      check,
      structure,
      config,
    }),
  };
}

/** What a `repo` map is of: the one commit, as the reviewer named it and by its sha, and the clock (D101, C3). */
export type RepoMeta = {
  readonly repo: string;
  /** The head as it was named: `HEAD`, or the ref `--head` named. */
  readonly named: string;
  readonly head: string;
  readonly generated_at: string;
};

/** Everything a `repo` map reads (D101): one commit's scan and log, its `.check/`, and checkride's baseline as it holds one. */
export type RepoInputs = {
  readonly meta: RepoMeta;
  /** The commit's tree, scanned (D21): the terrain and every overlay's files. */
  readonly scan: Scan;
  /** The log window at the commit, newest first (D8): trouble spots' churn and the recent heat. */
  readonly commits: readonly Commit[];
  readonly head_time: number;
  /** The `.check/` artifacts, or the reason there are none to trust (D41, D135). */
  readonly check: CheckArtifacts;
  /** checkride's baseline as the commit holds it, or why it holds none (D49). */
  readonly baseline: CheckBaseline;
  /** The commit's own laid-out terrain, as the CLI keeps it per commit (D96); absent, the field is laid out here. */
  readonly ground?: Layout;
  readonly prior?: Prior;
};

/**
 * Assemble a `repo` map (D101): the commit's terrain under a change of
 * nothing, so its weather is empty and it ranks no notice, and the whole
 * repository's overlays over it. The terrain is the one `layOutTerrain` lays
 * out for the commit, so a change later measured from it stands on the same
 * ground (P2). Its coverage is trusted as a change's is (D122).
 */
export function buildRepoMap(inputs: RepoInputs, config: Config = DEFAULT_CONFIG): MapJson & { readonly terrain: { readonly layout: Layout } } {
  const { meta, scan, commits, head_time, check, ground, prior } = inputs;
  const still: BuildInputs = {
    meta: { repo: meta.repo, base: meta.named, head: meta.head, merge_base: meta.head, generated_at: meta.generated_at },
    base: scan,
    head: scan,
    diff: [],
    deps_added: [],
    commits,
    head_time,
    check,
    ...(ground === undefined ? {} : { ground }),
    ...(prior === undefined ? {} : { prior }),
  };
  const { lay, ...assembled } = assemble(still, config);
  const { terrain } = assembled;
  const files = terrain.organelles.map((organelle) => organelle.path);
  const code = new Map(scan.files.map((file) => [file.path, file.code ?? []] as const));
  const trusted = trustCoverage(check, new Set(files));
  const overlays = computeOverlays({
    // A test is evidence with no place of its own (D4), so the overlays draw on the terrain and the shore alone.
    placed: new Set([...files, ...terrain.groups.filter((group) => group.id !== TESTS_GROUP).flatMap((group) => group.files)]),
    terrain: new Map(files.map((path) => [path, code.get(path) ?? []] as const)),
    commits,
    check: trusted.check,
    coverage_unnamed: trusted.muted !== undefined,
    baseline: inputs.baseline,
    config: config.overlays,
  });
  return { ...assembled, meta: { ...assembled.meta, mode: 'repo' }, terrain: { ...terrain, layout: lay() }, notices: [], overlays };
}

/** No `.check/` stands behind a terrain on its own: the layout never reads it, and nothing else of the map is kept. */
const NO_CHANGE: CheckArtifacts = { mode: 'git-only', reason: 'a terrain alone carries no change' };

/**
 * A base commit's own terrain, laid out: the field `buildMap` draws for a
 * change that changes nothing over `scan`, relaxed from `prior` when one is
 * given, as a nearest cached ancestor's layout is (D97). It depends on the
 * commit, the config and the prior alone, which is what lets the CLI keep it
 * per base commit beside the scan and the history window (D96), for the map
 * of a change over it to relax from. It is `buildMap`'s own pipeline rather
 * than a copy of it, so the two cannot lay one terrain out two ways.
 */
export function layOutTerrain(scan: Scan, config: Config = DEFAULT_CONFIG, prior?: Prior): Layout {
  const meta: MapMeta = { repo: '', base: '', head: '', merge_base: '', generated_at: '' };
  const still = { meta, base: scan, head: scan, diff: [], deps_added: [], commits: [], head_time: 0, check: NO_CHANGE };
  const inputs: BuildInputs = prior === undefined ? still : { ...still, prior };
  return buildMap(inputs, config).terrain.layout;
}
