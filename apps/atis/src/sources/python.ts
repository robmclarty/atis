/**
 * python: the Python producer (D115, D114, D139).
 *
 * A commit's `.py` files are drawn out of its tree into a directory of their
 * own, beside its `pyproject.toml` files and nothing else. A Python helper
 * atis carries as source is written into another directory, outside the
 * tree, and run there with the repo's own Python under `-I -S`, the tree
 * handed it as an argument: so neither the tree, the working directory nor
 * `site` puts a module ahead of the standard library's, and the helper reads
 * every file with `ast` alone, never importing it.
 *
 * A package is a directory of the terrain, its `__init__.py` its barrel, and a
 * namespace package, with none, a directory cell all the same. An absolute
 * import resolves against the tree's own roots (the root, each project's
 * directory and every `src/` holding Python) and a relative one against its
 * package; one the tree cannot answer is the standard library's or a third
 * party's, and is dropped. A module exports its `__all__`, else its public
 * top-level names, and an `__init__.py` the public names it imports too,
 * which it passes on as `export … from` does (D75). Entry points are
 * `[project.scripts]` targets, `__main__.py` files and modules with a
 * `__main__` guard; `test_*.py`, `*_test.py`, `conftest.py` and files under
 * `tests/` or `test/` are tests (D4). The parsing is split into pure
 * functions, tested from captured output (D30).
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

import type { CodeSpan, ExportShapes, PassedName, ScanFunction } from 'core';

import { PYTHON_HELPER } from './python-helper/index.js';
import { drawOut } from './scan.js';
import type { Scan, ScannedEdge, ScannedFile, ScannedMember, Tree } from './scan.js';

/** The extension the Python producer claims. */
export const PYTHON_EXTENSIONS: readonly string[] = ['.py'];

/** The name an import that takes a whole module takes, as a namespace import does. */
const STAR = '*';
const PYPROJECT = 'pyproject.toml';
const INIT = '__init__.py';
/** The commands tried for the repo's own Python, in order. */
const PYTHONS = ['python3', 'python'];
/** The oldest Python whose `ast` prints a signature back (`ast.unparse`). */
const OLDEST: readonly [number, number] = [3, 9];
const PYTHON_TIMEOUT_MS = 120_000;
const PYTHON_BYTES = 1024 * 1024 * 1024;
/** A test by its name, `test_*.py`, `*_test.py` or `conftest.py`, or by its folder, `tests/` or `test/` (D4, D115). */
const TEST_NAME = /(?:^|\/)(?:test_[^/]*|[^/]*_test|conftest)\.py$/;
const TEST_DIR = /(?:^|\/)tests?\//;

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function sorted(values: Iterable<string>): readonly string[] {
  return [...new Set(values)].toSorted(byPath);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) ? value : 0;
}

function records(value: unknown): readonly Readonly<Record<string, unknown>>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function dirOf(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash < 0 ? '' : path.slice(0, slash);
}

function under(dir: string, path: string): string {
  return dir === '' ? path : `${dir}/${path}`;
}

/** What a `pyproject.toml` says of its project: its name, and the `module:function` targets its scripts run. */
export type Pyproject = { readonly name?: string; readonly scripts: readonly string[] };

/** The tables whose keys are scripts: PEP 621's and Poetry's. */
const SCRIPT_TABLES: ReadonlySet<string> = new Set(['project.scripts', 'project.gui-scripts', 'tool.poetry.scripts']);
/** The tables whose `name` is the project's. */
const NAME_TABLES: ReadonlySet<string> = new Set(['project', 'tool.poetry']);

/** A TOML basic or literal string's value, or nothing for any other value. */
function tomlString(value: string): string | undefined {
  const match = /^(?:"((?:[^"\\]|\\.)*)"|'([^']*)')/.exec(value.trim());
  if (match === null) return undefined;
  return match[2] ?? (match[1] ?? '').replace(/\\(.)/g, '$1');
}

/**
 * A `pyproject.toml`'s project name and its scripts' targets, from its
 * `[project]`, `[project.scripts]`, `[project.gui-scripts]`, `[tool.poetry]`
 * and `[tool.poetry.scripts]` tables. Only the plain `key = "value"` lines
 * those tables hold are read. Pure, so it is tested from a string (D30).
 */
export function parsePyproject(source: string): Pyproject {
  let table = '';
  let name: string | undefined;
  const scripts: string[] = [];
  for (const raw of source.split('\n')) {
    const line = raw.trim();
    const header = /^\[([^\]]+)\]/.exec(line);
    if (header !== null) {
      table = (header[1] ?? '').trim();
      continue;
    }
    const pair = /^("?[\w.-]+"?)\s*=\s*(.+)$/.exec(line);
    if (pair === null) continue;
    const value = tomlString(pair[2] ?? '');
    if (value === undefined) continue;
    if (SCRIPT_TABLES.has(table)) scripts.push(value);
    else if (NAME_TABLES.has(table) && pair[1] === 'name') name ??= value;
  }
  return { ...(name === undefined ? {} : { name }), scripts };
}

/** One name a `from … import` takes, and the name it binds it to. */
export type PythonName = { readonly name: string; readonly bound: string };

/**
 * One import as written: `import a.b` takes no names and binds `a`; `from .m
 * import x as y` takes `x` from `m`, one package up, and binds `y`. `top` is
 * whether it runs at module scope, where what it binds is the module's own.
 */
export type PythonImport = {
  readonly module: string;
  readonly level: number;
  readonly names: readonly PythonName[];
  readonly bound?: string;
  readonly line: number;
  readonly top: boolean;
};

/** A name a module binds at its top level, with its shape where it is public and printable. */
export type PythonDecl = { readonly name: string; readonly shape: string | null };

/** What the helper read of one Python file. */
export type PythonFileRead = {
  readonly path: string;
  readonly loc: number;
  readonly imports: readonly PythonImport[];
  readonly decls: readonly PythonDecl[];
  /** The names its `__all__` lists, or `null` where it has none the helper could read. */
  readonly all: readonly string[] | null;
  readonly mainGuard: boolean;
  readonly functions: readonly ScanFunction[];
  readonly code: readonly CodeSpan[];
};

/**
 * The helper's JSON: one record per file it was handed, in its order. Pure,
 * so it is tested from captured output (D30).
 */
export function parsePythonHelper(stdout: string): readonly PythonFileRead[] {
  const value: unknown = JSON.parse(stdout);
  if (!Array.isArray(value)) throw new Error('the Python helper printed no array');
  return records(value).map((file) => {
    const all = file['all'];
    return {
      path: text(file['path']) ?? '',
      loc: count(file['loc']),
      imports: records(file['imports']).map((spec) => {
        const bound = text(spec['bound']);
        return {
          module: text(spec['module']) ?? '',
          level: count(spec['level']),
          names: records(spec['names']).map((name) => ({ name: text(name['name']) ?? '', bound: text(name['bound']) ?? '' })),
          ...(bound === undefined ? {} : { bound }),
          line: count(spec['line']),
          top: spec['top'] === true,
        };
      }),
      decls: records(file['decls']).map((decl) => ({ name: text(decl['name']) ?? '', shape: text(decl['shape']) ?? null })),
      all: Array.isArray(all) ? all.flatMap((name) => (typeof name === 'string' ? [name] : [])) : null,
      mainGuard: file['main_guard'] === true,
      functions: records(file['functions']).map((fn) => ({ name: text(fn['name']) ?? '', line: count(fn['line']), line_count: count(fn['line_count']) })),
      code: records(file['code']).map((span) => ({ start: count(span['start']), end: count(span['end']) })),
    };
  });
}

/** A project of the tree: the directory its `pyproject.toml` sits in (`''` for the root), and what it says. */
export type PythonProject = { readonly dir: string; readonly pyproject: Pyproject };

/** Where a dotted module lands: its file, or none for a namespace package, which is a directory alone. */
type Landing = { readonly file?: string; readonly dir: string };

/** The tree's Python as the resolver reads it: its files, every directory holding one, and the roots an absolute import starts from. */
type Layout = { readonly files: ReadonlySet<string>; readonly packages: ReadonlySet<string>; readonly roots: readonly string[] };

function layoutOf(paths: readonly string[], projects: readonly PythonProject[]): Layout {
  const packages = new Set<string>();
  for (const path of paths) {
    for (let dir = dirOf(path); dir !== ''; dir = dirOf(dir)) packages.add(dir);
  }
  const sources = [...packages].filter((dir) => basename(dir) === 'src');
  const roots = sorted(['', ...projects.map((project) => project.dir), ...sources]);
  return { files: new Set(paths), packages, roots };
}

/** The module `parts` names beneath `base`: `m.py`, or the package `m/` with its `__init__.py` or without (a namespace). */
function landing(layout: Layout, base: string, parts: readonly string[]): Landing | undefined {
  const dir = parts.reduce((at, part) => under(at, part), base);
  if (parts.length > 0 && layout.files.has(`${dir}.py`)) return { file: `${dir}.py`, dir: dirOf(dir) };
  if (layout.files.has(under(dir, INIT))) return { file: under(dir, INIT), dir };
  return dir === base || layout.packages.has(dir) ? { dir } : undefined;
}

/** The roots an absolute import from `from` is tried against: those holding it, innermost first, then the rest. */
function rootsFor(layout: Layout, from: string): readonly string[] {
  const holding = layout.roots.filter((root) => root === '' || from.startsWith(`${root}/`)).toSorted((a, b) => b.length - a.length);
  return [...holding, ...layout.roots.filter((root) => !holding.includes(root))];
}

/** Where an import from `from` lands: a relative one counted up from its package, an absolute one in the first root holding its top package. */
function resolveImport(layout: Layout, from: string, module: string, level: number): Landing | undefined {
  const parts = module === '' ? [] : module.split('.');
  if (level > 0) {
    let base = dirOf(from);
    for (let up = 1; up < level; up += 1) {
      if (base === '') return undefined;
      base = dirOf(base);
    }
    return landing(layout, base, parts);
  }
  const [top] = parts;
  if (top === undefined) return undefined;
  for (const root of rootsFor(layout, from)) {
    if (layout.files.has(`${under(root, top)}.py`) || layout.packages.has(under(root, top))) return landing(layout, root, parts);
  }
  return undefined;
}

/** The kind the Python producer gives a path (D4, D115). */
export function pythonKind(path: string): 'source' | 'test' {
  return TEST_NAME.test(path) || TEST_DIR.test(path) ? 'test' : 'source';
}

function isPublic(name: string): boolean {
  return !name.startsWith('_');
}

/** One edge as it is gathered: the names it takes, and what it passes on. */
type Gathered = { names: string[]; reexports: PassedName[]; line: number };

/** What one file says once its imports resolve: its edges, the names it binds from the tree, and the barrels it passes every name of on. */
type Resolved = {
  readonly edges: readonly ScannedEdge[];
  readonly bound: ReadonlyMap<string, string>;
  readonly stars: readonly { readonly to: string; readonly shape: string }[];
};

/** `from .m import x`, as a re-export's shape says where its name comes from. */
function written(spec: PythonImport, name: string, bound: string): string {
  const from = `${'.'.repeat(spec.level)}${spec.module}`;
  return `from ${from} import ${name}${bound === name ? '' : ` as ${bound}`}`;
}

/**
 * The edges of one file and what it binds. Each name a `from … import` takes
 * goes to the submodule it names, whole, or else to the module's own file; an
 * `import a.b` takes `a.b` whole. In an `__init__.py` with no `__all__`, a
 * public name bound at module scope is the package's to pass on, and a `*`
 * passes every name of its module on (D75).
 */
function resolveFile(read: PythonFileRead, layout: Layout): Resolved {
  const barrel = basename(read.path) === INIT;
  const passes = barrel && read.all === null;
  const exported = (bound: string, top: boolean): boolean => barrel && top && isPublic(bound) && (read.all === null || read.all.includes(bound));
  const edges = new Map<string, Gathered>();
  const bound = new Map<string, string>();
  const stars: { to: string; shape: string }[] = [];
  const gather = (to: string, line: number): Gathered => {
    const found = edges.get(to) ?? { names: [], reexports: [], line };
    edges.set(to, found);
    return found;
  };
  for (const spec of read.imports) {
    const target = resolveImport(layout, read.path, spec.module, spec.level);
    if (target === undefined) continue;
    if (spec.names.length === 0) {
      if (target.file !== undefined && target.file !== read.path) gather(target.file, spec.line).names.push(STAR);
      continue;
    }
    for (const { name, bound: as } of spec.names) {
      if (name === STAR) {
        if (target.file === undefined || target.file === read.path) continue;
        const edge = gather(target.file, spec.line);
        edge.names.push(STAR);
        if (passes && spec.top) {
          edge.reexports.push({ name: STAR, as: STAR });
          stars.push({ to: target.file, shape: written(spec, STAR, STAR) });
        }
        continue;
      }
      const submodule = landing(layout, target.file === undefined || basename(target.file) === INIT ? target.dir : dirOf(target.file), [name]);
      const to = submodule?.file !== undefined && (target.file === undefined || basename(target.file) === INIT) ? submodule.file : target.file;
      if (to === undefined || to === read.path) continue;
      const whole = to !== target.file;
      const edge = gather(to, spec.line);
      edge.names.push(whole ? STAR : name);
      if (exported(as, spec.top)) {
        edge.reexports.push({ name: whole ? STAR : name, as });
        bound.set(as, written(spec, name, as));
      }
    }
  }
  return {
    edges: [...edges].map(([to, { names, reexports, line }]) => ({
      from: read.path,
      to,
      names: [...new Set(names)],
      line,
      ...(reexports.length === 0 ? {} : { reexports }),
    })),
    bound,
    stars,
  };
}

/**
 * The names a barrel's `*` passes on, taken to a fixed point so a star of a
 * star settles, as the TypeScript producer's `export *` does.
 */
function expandStars(own: ReadonlyMap<string, readonly string[]>, stars: ReadonlyMap<string, readonly string[]>): ReadonlyMap<string, readonly string[]> {
  const names = new Map([...own].map(([path, list]) => [path, new Set(list)]));
  for (let changed = true; changed; ) {
    changed = false;
    for (const [path, targets] of stars) {
      const here = names.get(path) ?? new Set<string>();
      for (const target of targets) {
        for (const name of names.get(target) ?? []) {
          if (here.has(name) || !isPublic(name)) continue;
          here.add(name);
          changed = true;
        }
      }
      names.set(path, here);
    }
  }
  return new Map([...names].map(([path, list]) => [path, sorted(list)]));
}

/**
 * One commit's Python and the helper's read of it, as the scan's parts (D115,
 * D114): every read file with its kind, its barrel, its exports and their
 * shapes, its code and its functions; an edge for each import the tree
 * answers; each project a member whose scripts, `__main__.py` files and
 * guarded modules are its entry points, and the root one where an entry point
 * falls in no project. Pure, so it is tested from captured output (D30).
 */
export function pythonScan(reads: readonly PythonFileRead[], projects: readonly PythonProject[]): Scan {
  const layout = layoutOf(reads.map((read) => read.path), projects);
  const resolved = new Map(reads.map((read) => [read.path, resolveFile(read, layout)] as const));
  const own = new Map(
    reads.map((read) => {
      const names = read.all ?? [...read.decls.map((decl) => decl.name), ...(resolved.get(read.path)?.bound.keys() ?? [])].filter(isPublic);
      return [read.path, sorted(names)] as const;
    }),
  );
  const exports = expandStars(own, new Map([...resolved].map(([path, file]) => [path, file.stars.map((star) => star.to)])));
  const files: ScannedFile[] = reads.map((read) => {
    const names = exports.get(read.path) ?? [];
    const file = resolved.get(read.path);
    const declared = new Map(read.decls.map((decl) => [decl.name, decl.shape] as const));
    const shapes: ExportShapes = Object.fromEntries(
      names.map((name) => {
        if (declared.has(name)) return [name, declared.get(name) ?? null];
        const binding = file?.bound.get(name);
        if (binding !== undefined) return [name, binding];
        const star = file?.stars.find(({ to }) => exports.get(to)?.includes(name) === true);
        return [name, star?.shape ?? null];
      }),
    );
    const kind = pythonKind(read.path);
    return {
      path: read.path,
      loc: read.loc,
      kind,
      ...(kind === 'source' && basename(read.path) === INIT ? { barrel: true } : {}),
      exports: names,
      shapes,
      inferred: [],
      code: read.code,
      packages: [],
      functions: read.functions,
    };
  });

  const entries = sorted([
    ...reads.filter((read) => pythonKind(read.path) === 'source' && (basename(read.path) === '__main__.py' || read.mainGuard)).map((read) => read.path),
    ...projects.flatMap((project) =>
      project.pyproject.scripts.flatMap((script) => {
        const target = resolveImport(layout, under(project.dir, PYPROJECT), script.split(':')[0]?.trim() ?? '', 0);
        return target?.file === undefined ? [] : [target.file];
      }),
    ),
  ]);
  const dirs = projects.map((project) => project.dir).toSorted((a, b) => b.length - a.length);
  const ownerOf = (path: string): string | undefined => dirs.find((dir) => dir === '' || path.startsWith(`${dir}/`));
  const homeless = entries.filter((path) => ownerOf(path) === undefined);
  const members: ScannedMember[] = [
    ...projects.map((project) => ({
      name: project.pyproject.name ?? (project.dir === '' ? '.' : project.dir),
      dir: project.dir === '' ? '.' : project.dir,
      entry: entries.filter((path) => ownerOf(path) === project.dir),
      published: false,
      surface: [],
    })),
    ...(homeless.length === 0 ? [] : [{ name: '.', dir: '.', entry: homeless, published: false, surface: [] }]),
  ];
  return {
    files: files.toSorted((a, b) => byPath(a.path, b.path)),
    edges: [...resolved.values()].flatMap((file) => file.edges).toSorted((a, b) => byPath(a.from, b.from) || a.line - b.line || byPath(a.to, b.to)),
    members: members.toSorted((a, b) => byPath(a.dir, b.dir)),
    entry_points: { source: 'manifests', reason: 'pyproject.toml scripts and __main__ name the entry points' },
  };
}

function isOlder([major, minor]: readonly [number, number], [oldestMajor, oldestMinor]: readonly [number, number]): boolean {
  return major < oldestMajor || (major === oldestMajor && minor < oldestMinor);
}

/** The repo's own Python, the first of `python3` and `python` that answers and is new enough, or why there is none. */
function findPython(): { readonly command: string } | { readonly reason: string } {
  const said: string[] = [];
  for (const command of PYTHONS) {
    let version: string;
    try {
      version = execFileSync(command, ['-I', '-S', '-c', 'import sys; print("%d.%d" % sys.version_info[:2])'], {
        cwd: tmpdir(),
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: PYTHON_TIMEOUT_MS,
      }).trim();
    } catch {
      continue;
    }
    const [major = 0, minor = 0] = version.split('.').map(Number);
    if (!isOlder([major, minor], OLDEST)) return { command };
    said.push(`${command} is ${version}`);
  }
  if (said.length === 0) return { reason: 'no python3 or python command on the PATH' };
  return { reason: `${said.join(' and ')}; the helper needs Python ${OLDEST.join('.')} or later` };
}

/** Why the Python producer cannot run here: no Python answers, or none new enough. */
export function pythonUnavailable(): string | undefined {
  const found = findPython();
  return 'reason' in found ? found.reason : undefined;
}

/** What the helper's run threw, as one line, the temp tree's path cut back to `.` (C3). */
function helperFailure(error: unknown, root: string): string {
  const failed = isRecord(error) ? error : {};
  if (failed['code'] === 'ETIMEDOUT') return `timed out after ${String(PYTHON_TIMEOUT_MS / 1000)} s`;
  const said = text(failed['stderr'])
    ?.split('\n')
    .map((line) => line.trim())
    .findLast((line) => line !== '');
  const status = failed['status'];
  const how = typeof status === 'number' ? `exited ${String(status)}` : `could not run: ${text(failed['code']) ?? 'no error code'}`;
  return said === undefined ? how : `${how}: ${[realpathSync(root), root].reduce((message, path) => message.split(path).join('.'), said)}`;
}

/** What the Python producer read of a tree: its scan, and why it read nothing where its helper failed. */
export type PythonRead = { readonly scan: Scan; readonly unread?: string };

const NOTHING_READ: Scan = { files: [], edges: [], members: [], entry_points: { source: 'manifests', reason: 'the python helper read nothing' } };

/**
 * Read the Python files of one commit's tree (D115): `files` are the ones the
 * producer claims. The helper reads each from a copy of the tree's Python and
 * projects alone (D139); a helper that fails leaves every file unread, and
 * the read says why (C2).
 */
export function readPython(tree: Tree, files: readonly string[]): PythonRead {
  const found = findPython();
  if ('reason' in found) return { scan: NOTHING_READ, unread: found.reason };
  const pyprojects = tree.files.filter((path) => basename(path) === PYPROJECT);
  const root = drawOut(tree, [...files, ...pyprojects], 'atis-python-tree-');
  const helper = mkdtempSync(join(tmpdir(), 'atis-python-helper-'));
  try {
    writeFileSync(join(helper, 'helper.py'), PYTHON_HELPER);
    let stdout: string;
    try {
      stdout = execFileSync(found.command, ['-I', '-S', join(helper, 'helper.py'), root], {
        cwd: helper,
        input: `${files.join('\n')}\n`,
        encoding: 'utf8',
        maxBuffer: PYTHON_BYTES,
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: PYTHON_TIMEOUT_MS,
      });
    } catch (error) {
      return { scan: NOTHING_READ, unread: `the python helper ${helperFailure(error, root)}` };
    }
    const projects = pyprojects.map((path) => ({ dir: dirOf(path), pyproject: parsePyproject(tree.read(path)) }));
    return { scan: pythonScan(parsePythonHelper(stdout), projects) };
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(helper, { recursive: true, force: true });
  }
}
