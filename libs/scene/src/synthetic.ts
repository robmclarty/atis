/**
 * synthetic: a seeded repository of any size, turned into `map.json` by
 * core's own `buildMap`, so the world can be measured on a map the size of a
 * large repo before atis has read one (C14, step 43). The repo is laid out as
 * checkride lays one out: workspace packages, each with a barrel over folder
 * modules, single-file modules and a loose directory or two; imports running
 * down from each barrel to what it gathers, deeper inside a package, and
 * across to the barrels of the packages below it, so the graph has depth and
 * no cycle; a test beside some folders; and the shore a repo carries. The
 * change is a pull request's worth of files, modified, added, deleted and
 * renamed, over a log window of a few hundred commits, and `.check/` reports
 * on it: the gate with its test slot red, coverage of the changed files with
 * gaps in it, health with a few thresholds broken, a clone family, mutants
 * and the test results.
 *
 * Pure and seeded (C1, C3): one size and one seed give one map, its clock a
 * fixed one, so a measurement can be repeated on the same ground.
 */

import { buildMap } from 'core';
import type { BuildInputs, CheckArtifacts, Commit, CoverageFile, DiffFile, HealthFileScore, HealthFinding, Hunk, MapJson, MutationFile, NamedEdge, ScanFile, ScanMember } from 'core';

import { seeded } from './motion.js';

/** The repo to make: how many terrain files it holds, the seed it is drawn from, and how many files the change touches, about. */
export type SyntheticOptions = { readonly files: number; readonly seed?: number; readonly changed?: number };

/** About how many terrain files one workspace package holds. */
const FILES_PER_PACKAGE = 300;
/** A pull request's worth of changed files, when the options name none. */
const CHANGED = 60;
/** How many commits the log window holds, and how many files are hot in it. */
const COMMITS = 400;
const HOT = 40;
/** The clock the map is made at: fixed, so two runs make one map (C3). */
const HEAD_TIME = 1_790_000_000;
const GENERATED_AT = '2026-10-01T00:00:00.000Z';
const DAY = 86_400;
const WORDS = ['core', 'util', 'parse', 'model', 'store', 'render', 'io', 'auth', 'cache', 'graph', 'query', 'event', 'config', 'log', 'net', 'plan', 'scan', 'view', 'task', 'route'];
const RULES = ['cognitive', 'cyclomatic', 'crap', 'both', 'all'];
const SLOTS = ['types', 'lint', 'struct', 'dead', 'health', 'dupes', 'test', 'mutation'];

type Draw = {
  readonly chance: () => number;
  /** A whole number from `lo` to `hi`, both included. */
  readonly int: (lo: number, hi: number) => number;
  readonly pick: <T>(items: readonly T[]) => T;
};

function drawFrom(seed: number): Draw {
  const chance = seeded(seed);
  const int = (lo: number, hi: number): number => lo + Math.floor(chance() * (hi - lo + 1));
  return {
    chance,
    int,
    pick: <T>(items: readonly T[]): T => {
      const item = items[int(0, items.length - 1)];
      if (item === undefined) throw new Error('nothing to pick from');
      return item;
    },
  };
}

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** A module inside a package: a folder with its barrel, a loose directory with none, or a single file. */
type Module = { readonly barrel?: string; readonly files: string[] };

type Repo = {
  readonly members: ScanMember[];
  readonly files: Map<string, ScanFile>;
  readonly edges: NamedEdge[];
  /** Per package, its modules in the order they were laid, the deeper later. */
  readonly modules: Module[][];
  readonly tests: string[];
};

/** A source file of so many lines exporting a few names drawn from its stem, its folder's barrel when it is an `index.ts`, as a TypeScript scan marks one (D114). */
function source(path: string, draw: Draw): ScanFile {
  const stem = path.slice(path.lastIndexOf('/') + 1).replace(/\.ts$/, '');
  const loc = draw.int(20, 360);
  const exports = Array.from({ length: draw.int(1, 4) }, (_, at) => `${stem}${String.fromCodePoint(65 + at)}`);
  return { path, loc, kind: 'source', ...(stem === 'index' ? { barrel: true } : {}), exports, code: [{ start: 1, end: loc }] };
}

function shore(path: string, loc: number): ScanFile {
  return { path, loc, kind: 'other', exports: [], code: [] };
}

/** One package: its barrel, then folders, loose directories and single files until its share is spent. */
function layPackage(repo: Repo, index: number, share: number, draw: Draw): void {
  const dir = `packages/${WORDS[index % WORDS.length] ?? 'pkg'}-${String(index)}`;
  const barrel = `${dir}/src/index.ts`;
  repo.members.push({ name: `@synthetic/${dir.slice('packages/'.length)}`, dir, entry: [barrel] });
  repo.files.set(barrel, source(barrel, draw));
  for (const file of ['package.json', 'README.md', 'tsconfig.json']) repo.files.set(`${dir}/${file}`, shore(`${dir}/${file}`, draw.int(5, 60)));
  const modules: Module[] = [];
  let left = share - 1;
  let n = 0;
  while (left > 0) {
    n += 1;
    const name = `${draw.pick(WORDS)}${String(n)}`;
    const roll = draw.chance();
    if (roll < 0.15 || left < 3) {
      const path = `${dir}/src/${name}.ts`;
      repo.files.set(path, source(path, draw));
      modules.push({ files: [path] });
      left -= 1;
      continue;
    }
    const folder = roll >= 0.27;
    const size = Math.min(left, folder ? draw.int(4, 16) : draw.int(3, 8));
    const files = Array.from({ length: folder ? size - 1 : size }, (_, at) => `${dir}/src/${name}/${draw.pick(WORDS)}${String(at)}.ts`);
    for (const path of files) repo.files.set(path, source(path, draw));
    if (folder) {
      const front = `${dir}/src/${name}/index.ts`;
      repo.files.set(front, source(front, draw));
      modules.push({ barrel: front, files });
      if (draw.chance() < 0.3) {
        const test = `${dir}/src/${name}/__tests__/${name}.test.ts`;
        repo.files.set(test, { ...source(test, draw), kind: 'test', exports: [] });
        repo.tests.push(test);
      }
    } else modules.push({ files });
    left -= size;
  }
  repo.modules.push(modules);
}

function edge(repo: Repo, from: string, to: string): void {
  const names = repo.files.get(to)?.exports.slice(0, 1) ?? [];
  repo.edges.push({ from, to, names });
}

/** The imports: each barrel gathers what it fronts, each file reads a few of its siblings and deeper modules, and now and then a package below's barrel. */
function wire(repo: Repo, draw: Draw): void {
  repo.modules.forEach((modules, p) => {
    const barrel = repo.members[p + 1]?.entry[0];
    if (barrel === undefined) return;
    modules.forEach((module, m) => {
      for (const front of module.barrel === undefined ? module.files.slice(0, 1) : [module.barrel]) edge(repo, barrel, front);
      if (module.barrel !== undefined) for (const file of module.files) edge(repo, module.barrel, file);
      module.files.forEach((file, at) => {
        const later = module.files.slice(at + 1);
        for (let k = draw.int(0, 2); k > 0 && later.length > 0; k -= 1) edge(repo, file, draw.pick(later));
        const deeper = modules.slice(m + 1);
        if (deeper.length > 0 && draw.chance() < 0.35) edge(repo, file, draw.pick(draw.pick(deeper).files));
        const below = repo.members.slice(1, p + 1);
        if (below.length > 0 && draw.chance() < 0.12) edge(repo, file, draw.pick(below).entry[0] ?? barrel);
      });
    });
  });
  for (const test of repo.tests) {
    const folder = test.slice(0, test.indexOf('/__tests__/'));
    const near = [...repo.files.keys()].filter((path) => path.startsWith(`${folder}/`) && path !== test && !path.includes('/__tests__/'));
    for (let k = draw.int(1, 2); k > 0 && near.length > 0; k -= 1) edge(repo, test, draw.pick(near));
  }
}

function layRepo(files: number, draw: Draw): Repo {
  const repo: Repo = { members: [{ name: 'synthetic', dir: '.', entry: [] }], files: new Map(), edges: [], modules: [], tests: [] };
  for (const path of ['package.json', 'pnpm-workspace.yaml', 'tsconfig.json', '.gitignore', 'README.md', 'docs/guide.md']) repo.files.set(path, shore(path, draw.int(3, 120)));
  const packages = Math.max(1, Math.round(files / FILES_PER_PACKAGE));
  let left = files;
  for (let p = 0; p < packages; p += 1) {
    const share = p === packages - 1 ? left : Math.round(files / packages);
    layPackage(repo, p, share, draw);
    left -= share;
  }
  wire(repo, draw);
  return repo;
}

/** A modified file's hunks: one to three runs of lines inside it. */
function hunksIn(loc: number, draw: Draw): readonly Hunk[] {
  const hunks: Hunk[] = [];
  let at = 1;
  for (let k = draw.int(1, 3); k > 0 && at < loc; k -= 1) {
    const start = draw.int(at, Math.max(at, loc - 1));
    const count = Math.min(loc - start + 1, draw.int(2, 30));
    hunks.push({ start, count });
    at = start + count + 1;
  }
  return hunks;
}

/** The change: the base is the repo as laid, and the head modifies, adds, deletes and renames a pull request's worth of its files. */
function change(repo: Repo, count: number, draw: Draw): { readonly head: Repo; readonly diff: readonly DiffFile[] } {
  const terrain = [...repo.files.keys()].filter((path) => path.endsWith('.ts') && !path.includes('/__tests__/')).toSorted(byPath);
  const folders = repo.modules.flat().filter((module) => module.barrel !== undefined);
  const chosen = new Set<string>();
  const fresh = (pool: readonly string[]): string | undefined => {
    for (let tries = 0; tries < 20; tries += 1) {
      const path = draw.pick(pool);
      if (!chosen.has(path)) {
        chosen.add(path);
        return path;
      }
    }
    return undefined;
  };
  const diff: DiffFile[] = [];
  const files = new Map(repo.files);
  const renamed = new Map<string, string>();
  const removed = new Set<string>();
  const extra: NamedEdge[] = [];

  for (let k = 0; k < Math.round(count * 0.7); k += 1) {
    const path = fresh(terrain);
    const loc = path === undefined ? 0 : (files.get(path)?.loc ?? 0);
    if (path === undefined || loc === 0) continue;
    const hunks = hunksIn(loc, draw);
    const added = hunks.reduce((total, hunk) => total + hunk.count, 0);
    diff.push({ path, kind: 'modified', added, deleted: draw.int(0, added), hunks });
  }
  for (let k = 0; k < Math.max(1, Math.round(count * 0.1)); k += 1) {
    const folder = draw.pick(folders);
    const path = `${folder.files[0]?.slice(0, folder.files[0].lastIndexOf('/')) ?? 'src'}/fresh${String(k)}.ts`;
    const file = source(path, draw);
    files.set(path, file);
    if (folder.barrel !== undefined) extra.push({ from: folder.barrel, to: path, names: file.exports.slice(0, 1) });
    const sibling = folder.files[0];
    if (sibling !== undefined) extra.push({ from: path, to: sibling, names: files.get(sibling)?.exports.slice(0, 1) ?? [] });
    diff.push({ path, kind: 'added', added: file.loc, deleted: 0, hunks: [{ start: 1, count: file.loc }] });
  }
  for (let k = 0; k < Math.max(1, Math.round(count * 0.05)); k += 1) {
    const path = fresh(terrain.filter((each) => !each.endsWith('/index.ts')));
    if (path === undefined) continue;
    removed.add(path);
    diff.push({ path, kind: 'deleted', added: 0, deleted: files.get(path)?.loc ?? 0, hunks: [] });
    files.delete(path);
  }
  for (let k = 0; k < Math.max(1, Math.round(count * 0.05)); k += 1) {
    const from = fresh(terrain.filter((each) => !each.endsWith('/index.ts')));
    const file = from === undefined ? undefined : files.get(from);
    if (from === undefined || file === undefined) continue;
    const path = from.replace(/\.ts$/, '-moved.ts');
    renamed.set(from, path);
    files.delete(from);
    files.set(path, { ...file, path });
    diff.push({ path, kind: 'renamed', from, added: 4, deleted: 4, hunks: [{ start: 1, count: 4 }] });
  }
  for (let k = 0; k < Math.round(count * 0.07) && repo.tests.length > 0; k += 1) {
    const path = fresh(repo.tests);
    if (path !== undefined) diff.push({ path, kind: 'modified', added: 12, deleted: 3, hunks: [{ start: 5, count: 12 }] });
  }
  diff.push({ path: 'README.md', kind: 'modified', added: 6, deleted: 2, hunks: [{ start: 3, count: 6 }] });

  const at = (path: string): string => renamed.get(path) ?? path;
  const edges = [...repo.edges, ...extra]
    .filter((each) => !removed.has(each.from) && !removed.has(each.to))
    .map((each) => ({ ...each, from: at(each.from), to: at(each.to) }));
  return { head: { ...repo, files, edges }, diff: diff.toSorted((a, b) => byPath(a.path, b.path)) };
}

/** The log window: a few hundred commits, newest first, each touching a few files and the hot ones most, a fifth of them fixes. */
function logOf(repo: Repo, diff: readonly DiffFile[], draw: Draw): readonly Commit[] {
  const paths = [...repo.files.keys()].filter((path) => path.endsWith('.ts')).toSorted(byPath);
  const hot = Array.from({ length: HOT }, () => draw.pick(paths));
  const own: Commit = { sha: 'f'.repeat(40), time: HEAD_TIME, subject: 'feat: the change under review', files: diff.map(({ path, added, deleted }) => ({ path, added, deleted })) };
  let time = HEAD_TIME;
  const past = Array.from({ length: COMMITS - 1 }, (_, k): Commit => {
    time -= draw.int(1, 6) * (DAY / 4);
    const touched = new Set(Array.from({ length: draw.int(1, 6) }, () => (draw.chance() < 0.3 ? draw.pick(hot) : draw.pick(paths))));
    return {
      sha: k.toString(16).padStart(40, '0'),
      time,
      subject: draw.chance() < 0.2 ? `fix: ${draw.pick(WORDS)}` : `feat: ${draw.pick(WORDS)}`,
      files: [...touched].map((path) => ({ path, added: draw.int(1, 40), deleted: draw.int(0, 20) })),
    };
  });
  return [own, ...past];
}

/** What `.check/` says of the head: the gate with its test slot red, and every report on the change. */
function checkOf(head: Repo, diff: readonly DiffFile[], draw: Draw): CheckArtifacts {
  const sources = [...head.files.values()].filter((file) => file.path.endsWith('.ts') && !file.path.includes('/__tests__/')).toSorted((a, b) => byPath(a.path, b.path));
  const changed = diff.filter((file) => file.kind !== 'deleted' && file.path.endsWith('.ts') && !file.path.includes('/__tests__/'));
  const coverage = changed.map((file): CoverageFile => {
    const gappy = draw.chance() < 0.3;
    const loc = head.files.get(file.path)?.loc ?? 0;
    const statements = Array.from({ length: Math.floor(loc / 3) }, (_, at) => ({ line: at * 3 + 1, hits: gappy && draw.chance() < 0.4 ? 0 : draw.int(1, 20) }));
    return { path: file.path, statements };
  });
  const scores = sources.map((file): HealthFileScore => ({
    path: file.path,
    lines: file.loc,
    function_count: Math.max(1, Math.round(file.loc / 30)),
    maintainability_index: draw.int(40, 95),
    crap_max: draw.int(1, 40),
  }));
  const findings = sources.filter(() => draw.chance() < 0.03).map((file): HealthFinding => ({ path: file.path, exceeded: draw.pick(RULES), line: draw.int(1, Math.max(1, file.loc - 10)), line_count: draw.int(10, 60) }));
  const family = Array.from({ length: 3 }, () => draw.pick(sources).path);
  const mutation = changed.slice(0, 5).map((file): MutationFile => ({
    path: file.path,
    mutants: (file.hunks[0] === undefined ? [] : [file.hunks[0].start, file.hunks[0].start + 1]).map((line) => ({ line, status: draw.pick(['Killed', 'Killed', 'Survived', 'NoCoverage']) })),
  }));
  const failing = head.tests[0];
  return {
    mode: 'check',
    summary: { ok: false, checks_run: SLOTS.length, timestamp: GENERATED_AT, total_duration_ms: 42_000, checks: SLOTS.map((name) => ({ name, ok: name !== 'test', skipped: false })) },
    fallow_schemas: { health: 9, dead: 9, dupes: 9 },
    stale: [],
    health: { file_scores: scores, findings },
    dead: { circular_dependencies: [], re_export_cycles: [], boundary_violations: [], unused_exports: [] },
    dupes: { clone_families: [{ files: [...new Set(family)], groups: [], total_duplicated_lines: 40, total_duplicated_tokens: 220 }] },
    coverage,
    mutation,
    test: { results: head.tests.map((path) => ({ path, status: path === failing ? 'failed' : 'passed' })) },
  };
}

/** The inputs a run of the CLI over the synthetic repo would hand core. */
export function syntheticInputs({ files, seed = 1, changed = CHANGED }: SyntheticOptions): BuildInputs {
  const draw = drawFrom(seed);
  const base = layRepo(files, draw);
  const { head, diff } = change(base, changed, draw);
  const scan = (repo: Repo): BuildInputs['base'] => ({
    files: [...repo.files.values()].toSorted((a, b) => byPath(a.path, b.path)),
    edges: repo.edges.toSorted((a, b) => byPath(a.from, b.from) || byPath(a.to, b.to)),
    members: repo.members,
    entry_points: { source: 'manifests', reason: 'a synthetic repo has no fallow run' },
  });
  return {
    meta: { repo: `synthetic-${String(files)}`, base: 'main', head: 'f'.repeat(40), merge_base: '0'.repeat(40), generated_at: GENERATED_AT },
    base: scan(base),
    head: scan(head),
    diff,
    deps_added: [],
    deps_moved: [],
    commits: logOf(base, diff, draw),
    head_time: HEAD_TIME,
    check: checkOf(head, diff, draw),
  };
}

/** A synthetic repo's map, as core builds it. */
export function syntheticMap(options: SyntheticOptions): MapJson {
  return buildMap(syntheticInputs(options));
}
