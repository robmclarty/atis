/**
 * go: the Go producer (D113, D114, D139).
 *
 * A commit's Go files are drawn out of its tree into a directory of their
 * own, beside each module's `go.mod` and `go.sum` and nothing else, so no
 * other file of the reviewed tree is there to run. Each module is listed with
 * `go list -e -json` under `GOPROXY=off` and `GOTOOLCHAIN=local`, never with
 * `-compiled` or `-export`, which names its packages, their directories and
 * import paths, and their files. A Go helper atis carries as source, run with
 * `go run` from a directory outside the tree, reads every listed file with
 * `go/parser` alone: what it declares and each exported name's shape, what it
 * imports, the names it reads off each import, and the names it leaves to the
 * rest of its package.
 *
 * A package is a directory of the terrain, so core draws it as a cell; a
 * module is a member, its `main` packages its entry points, and `_test.go`
 * files are tests. An edge runs from a file to each file that declares a name
 * it reads, across an import or within its own package, and a type read
 * brings its methods with it. An import the tree does not hold is an outside
 * package, by the module `go.mod` requires that provides it (D170), and the
 * standard library is neither. The parsing is split into pure functions,
 * tested from captured output (D30).
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';

import type { CodeSpan, ExportShapes, ScanFunction } from 'core';

import { GO_HELPER_MAIN, GO_HELPER_MOD } from './go-helper/index.js';
import { drawOut } from './scan.js';
import type { Scan, ScannedEdge, ScannedFile, ScannedMember, Tree } from './scan.js';

/** The extension the Go producer claims. */
export const GO_EXTENSIONS: readonly string[] = ['.go'];

/** The name an import that reads a whole package takes, as a namespace import does. */
const STAR = '*';
const GO_MOD = 'go.mod';
/** What each module's `go list` is drawn out with beside its Go files. */
const MODULE_FILES: ReadonlySet<string> = new Set([GO_MOD, 'go.sum']);
const TEST_FILE = /_test\.go$/;
/** How long one `go list`, or the helper's run, may take. */
const GO_TIMEOUT_MS = 120_000;
const GO_BYTES = 1024 * 1024 * 1024;
/** The fields `go list` prints of each package: where it is, what it is called, and its files. */
const LIST_FIELDS = 'Dir,ImportPath,Name,GoFiles,CgoFiles,IgnoredGoFiles,TestGoFiles,XTestGoFiles';

/**
 * The environment every `go` command runs under (D139): no module is fetched,
 * no newer toolchain is looked for, and neither the user's flags nor a
 * workspace file decides what is listed.
 */
function goEnv(): NodeJS.ProcessEnv {
  return { ...process.env, GOPROXY: 'off', GOTOOLCHAIN: 'local', GOFLAGS: '', GOWORK: 'off', GO111MODULE: 'on' };
}

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

function texts(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.flatMap((item) => (typeof item === 'string' ? [item] : [])) : [];
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) ? value : 0;
}

/** A module's `go.mod` as the producer reads it: the module's path and every module it requires. */
export type GoMod = { readonly path: string; readonly requires: readonly string[] };

/** A `go.mod` path, bare or quoted. */
function unquote(value: string): string {
  return /^(["`]).*\1$/.test(value) ? value.slice(1, -1) : value;
}

/**
 * The `module` path of a `go.mod` and the modules its `require` lines name,
 * one at a time or in a block, comments dropped. Pure, so it is tested from a
 * string (D30).
 */
export function parseGoMod(source: string): GoMod {
  let path = '';
  const requires: string[] = [];
  let block = false;
  for (const raw of source.split('\n')) {
    const line = raw.replace(/\/\/.*$/, '').trim();
    if (line === '') continue;
    if (block) {
      if (line === ')') block = false;
      else requires.push(unquote(line.split(/\s+/)[0] ?? ''));
      continue;
    }
    const [keyword, first = ''] = line.split(/\s+/);
    if (keyword === 'module') path = unquote(first);
    else if (keyword === 'require' && first === '(') block = true;
    else if (keyword === 'require') requires.push(unquote(first));
  }
  return { path, requires: sorted(requires.filter((name) => name !== '')) };
}

/** One package `go list` named: its directory and import path in the tree, its package name, and its files, the tests apart. */
export type GoPackage = {
  readonly dir: string;
  readonly importPath: string;
  readonly name: string;
  readonly sources: readonly string[];
  readonly tests: readonly string[];
};

/** The objects of a stream of JSON values printed back to back, as `go list -json` prints one per package. */
function jsonValues(stream: string): readonly unknown[] {
  const values: unknown[] = [];
  let depth = 0;
  let start = -1;
  let quoted = false;
  for (let at = 0; at < stream.length; at += 1) {
    const char = stream[at];
    if (quoted) {
      if (char === '\\') at += 1;
      else if (char === '"') quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === '{') {
      if (depth === 0) start = at;
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) values.push(JSON.parse(stream.slice(start, at + 1)));
    }
  }
  return values;
}

/** `dir` under `root`, slash-separated, `''` for the root itself, or `undefined` outside it. */
function within(dir: string, roots: readonly string[]): string | undefined {
  for (const root of roots) {
    if (dir === root) return '';
    if (dir.startsWith(`${root}/`)) return dir.slice(root.length + 1);
  }
  return undefined;
}

/**
 * The packages of `go list -e -json` output, each with its directory and
 * files relative to the tree `roots` names (the directory it was run in, and
 * that directory's real path), sorted by directory. A file a build constraint
 * leaves out on this machine is one of the package's all the same, so the
 * terrain is the same on every machine (C3); a `_test.go` file is a test
 * whichever list names it. A package outside `roots` is dropped. Pure, so it
 * is tested from captured output (D30).
 */
export function parseGoList(stdout: string, roots: readonly string[]): readonly GoPackage[] {
  const packages: GoPackage[] = [];
  for (const value of jsonValues(stdout)) {
    if (!isRecord(value)) continue;
    const dir = within(text(value['Dir']) ?? '', roots);
    const importPath = text(value['ImportPath']);
    if (dir === undefined || importPath === undefined) continue;
    const names = ['GoFiles', 'CgoFiles', 'IgnoredGoFiles', 'TestGoFiles', 'XTestGoFiles'].flatMap((field) => texts(value[field]));
    const paths = sorted(names.map((name) => (dir === '' ? name : `${dir}/${name}`)));
    packages.push({
      dir,
      importPath,
      name: text(value['Name']) ?? '',
      sources: paths.filter((path) => !TEST_FILE.test(path)),
      tests: paths.filter((path) => TEST_FILE.test(path)),
    });
  }
  return packages.toSorted((a, b) => byPath(a.dir, b.dir));
}

/** A name a file declares at its top level: a method as `Type.Method`, its receiver beside it, and its shape where it is exported and printable. */
export type GoDecl = { readonly name: string; readonly exported: boolean; readonly shape: string | null; readonly receiver?: string };

/** An import as written: its path, its alias (`''` for none, `_` or `.`), and its line. */
export type GoImport = { readonly path: string; readonly alias: string; readonly line: number };

/** A name read off a qualifier the file does not declare, `store.New`, at the line it is first read. */
export type GoUse = { readonly qualifier: string; readonly name: string; readonly line: number };

/** A name the file reads but does not declare, at the line it is first read. */
export type GoName = { readonly name: string; readonly line: number };

/** What the helper read of one Go file. */
export type GoFileRead = {
  readonly path: string;
  readonly loc: number;
  readonly package: string;
  readonly imports: readonly GoImport[];
  readonly decls: readonly GoDecl[];
  readonly uses: readonly GoUse[];
  readonly unresolved: readonly GoName[];
  readonly functions: readonly ScanFunction[];
  readonly code: readonly CodeSpan[];
};

function records(value: unknown): readonly Readonly<Record<string, unknown>>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

/**
 * The helper's JSON: one record per file it was handed, in its order. Pure,
 * so it is tested from captured output (D30).
 */
export function parseGoHelper(stdout: string): readonly GoFileRead[] {
  const value: unknown = JSON.parse(stdout);
  if (!Array.isArray(value)) throw new Error('the Go helper printed no array');
  return records(value).map((file) => ({
    path: text(file['path']) ?? '',
    loc: count(file['loc']),
    package: text(file['package']) ?? '',
    imports: records(file['imports']).map((spec) => ({ path: text(spec['path']) ?? '', alias: text(spec['alias']) ?? '', line: count(spec['line']) })),
    decls: records(file['decls']).map((decl) => {
      const receiver = text(decl['receiver']);
      return {
        name: text(decl['name']) ?? '',
        exported: decl['exported'] === true,
        shape: text(decl['shape']) ?? null,
        ...(receiver === undefined || receiver === '' ? {} : { receiver }),
      };
    }),
    uses: records(file['uses']).map((use) => ({ qualifier: text(use['qualifier']) ?? '', name: text(use['name']) ?? '', line: count(use['line']) })),
    unresolved: records(file['unresolved']).map((name) => ({ name: text(name['name']) ?? '', line: count(name['line']) })),
    functions: records(file['functions']).map((fn) => ({ name: text(fn['name']) ?? '', line: count(fn['line']), line_count: count(fn['line_count']) })),
    code: records(file['code']).map((span) => ({ start: count(span['start']), end: count(span['end']) })),
  }));
}

/** One module as the producer listed it: its directory in the tree (`''` for the root), its `go.mod`, and its packages. */
export type GoModule = { readonly dir: string; readonly mod: GoMod; readonly packages: readonly GoPackage[] };

/** The names a package declares, each by the file that declares it, and each type's methods. */
type Scope = { readonly declared: ReadonlyMap<string, string>; readonly methods: ReadonlyMap<string, readonly string[]> };

function scopeOf(files: readonly GoFileRead[], exportedOnly: boolean): Scope {
  const declared = new Map<string, string>();
  const methods = new Map<string, string[]>();
  for (const file of files) {
    for (const decl of file.decls) {
      if (exportedOnly && !decl.exported) continue;
      if (!declared.has(decl.name)) declared.set(decl.name, file.path);
      if (decl.receiver !== undefined) methods.set(decl.receiver, [...(methods.get(decl.receiver) ?? []), decl.name]);
    }
  }
  return { declared, methods };
}

/** Edges from `from` to each file of `scope` declaring one of `taken`, a type's methods brought with it, at the line each was first taken (or `line`). */
function edgesTo(from: string, taken: readonly GoName[], scope: Scope, line?: number): readonly ScannedEdge[] {
  const byFile = new Map<string, { names: Set<string>; line: number }>();
  const take = (name: string, at: number): void => {
    const to = scope.declared.get(name);
    if (to === undefined || to === from) return;
    const edge = byFile.get(to) ?? { names: new Set<string>(), line: line ?? at };
    edge.names.add(name);
    edge.line = Math.min(edge.line, line ?? at);
    byFile.set(to, edge);
  };
  for (const { name, line: at } of taken) {
    take(name, at);
    for (const method of scope.methods.get(name) ?? []) take(method, at);
  }
  return [...byFile].map(([to, edge]) => ({ from, to, names: sorted(edge.names), line: edge.line }));
}

/** Whether an import path is the standard library's, whose first element never holds a dot, or cgo's `C`. */
function isStandard(path: string): boolean {
  return !(path.split('/')[0] ?? '').includes('.');
}

/** The module `requires` names that provides `path`, the longest that does; the path itself where none does. */
function providerOf(path: string, requires: readonly string[]): string {
  const providers = requires.filter((name) => path === name || path.startsWith(`${name}/`));
  return providers.toSorted((a, b) => b.length - a.length)[0] ?? path;
}

/** A listed package, the module it belongs to, and its package name: `go list`'s, or the clause its files declare. */
type Listed = { readonly pkg: GoPackage; readonly module: GoModule; readonly name: string };

/**
 * One commit's Go modules and the helper's read of their files, as the scan's
 * parts (D113, D114): every listed file with its kind, its exports and their
 * shapes, its code and its functions; an edge from each file to each file
 * declaring a name it reads; each module a member whose `main` packages are
 * its entry points. Pure, so it is tested from captured output (D30).
 */
export function goScan(modules: readonly GoModule[], reads: readonly GoFileRead[]): Scan {
  const readOf = new Map(reads.map((read) => [read.path, read] as const));
  const listed = new Map<string, Listed>();
  for (const module of modules) {
    for (const pkg of module.packages) {
      const clause = pkg.sources.map((path) => readOf.get(path)?.package ?? '').find((name) => name !== '');
      listed.set(pkg.importPath, { pkg, module, name: pkg.name === '' ? (clause ?? '') : pkg.name });
    }
  }
  const files: ScannedFile[] = [];
  const edges: ScannedEdge[] = [];
  for (const { pkg, module } of listed.values()) {
    const inPackage = (paths: readonly string[]): readonly GoFileRead[] => paths.flatMap((path) => readOf.get(path) ?? []);
    for (const path of [...pkg.sources, ...pkg.tests]) {
      const read = readOf.get(path);
      if (read === undefined) continue;
      const test = TEST_FILE.test(path);
      // A file reads its own package's names unqualified: a source the sources', a test the tests' of its clause too.
      const own = inPackage(test ? [...pkg.sources, ...pkg.tests] : pkg.sources).filter((file) => file.package === read.package);
      edges.push(...edgesTo(path, read.unresolved, scopeOf(own, false)));
      const outside: string[] = [];
      for (const spec of read.imports) {
        const target = listed.get(spec.path);
        if (target === undefined) {
          if (!isStandard(spec.path)) outside.push(providerOf(spec.path, module.mod.requires));
          continue;
        }
        const theirs = inPackage(target.pkg.sources);
        const scope = scopeOf(theirs, true);
        if (spec.alias === '_') {
          edges.push(...theirs.filter((file) => file.path !== path).map((file) => ({ from: path, to: file.path, names: [], line: spec.line })));
          continue;
        }
        const qualifier = spec.alias === '' ? target.name : spec.alias;
        const taken = spec.alias === '.' ? read.unresolved : read.uses.filter((use) => use.qualifier === qualifier);
        const found = edgesTo(path, taken, scope, spec.line);
        // An import whose names were not found reads the whole package, as a namespace import does.
        edges.push(...(found.length > 0 ? found : theirs.filter((file) => file.path !== path).map((file) => ({ from: path, to: file.path, names: [STAR], line: spec.line }))));
      }
      const exported = read.decls.filter((decl) => decl.exported);
      const shapes: ExportShapes = Object.fromEntries(exported.map((decl) => [decl.name, decl.shape]));
      files.push({
        path,
        loc: read.loc,
        kind: test ? 'test' : 'source',
        exports: sorted(exported.map((decl) => decl.name)),
        shapes,
        inferred: [],
        code: read.code,
        packages: sorted(outside),
        functions: read.functions.toSorted((a, b) => a.line - b.line || byPath(a.name, b.name)),
      });
    }
  }
  const members: ScannedMember[] = modules.map((module) => ({
    name: module.mod.path,
    dir: module.dir === '' ? '.' : module.dir,
    entry: sorted(module.packages.filter((pkg) => (listed.get(pkg.importPath)?.name ?? pkg.name) === 'main').flatMap((pkg) => pkg.sources)),
    published: false,
    surface: [],
  }));
  return {
    files: files.toSorted((a, b) => byPath(a.path, b.path)),
    edges: edges.toSorted((a, b) => byPath(a.from, b.from) || a.line - b.line || byPath(a.to, b.to)),
    members: members.toSorted((a, b) => byPath(a.dir, b.dir)),
    entry_points: { source: 'manifests', reason: 'go list names the main packages' },
  };
}

/** What `execFileSync` threw, as one line: the command's first line of stderr, else how it ended. */
function goFailure(error: unknown, root: string): string {
  const failed = isRecord(error) ? error : {};
  if (failed['code'] === 'ETIMEDOUT') return `timed out after ${String(GO_TIMEOUT_MS / 1000)} s`;
  const stderr = text(failed['stderr']) ?? (Buffer.isBuffer(failed['stderr']) ? failed['stderr'].toString('utf8') : undefined);
  const said = stderr
    ?.split('\n')
    .map((line) => line.trim())
    .find((line) => line !== '');
  const status = failed['status'];
  const how = typeof status === 'number' ? `exited ${String(status)}` : `could not run: ${text(failed['code']) ?? 'no error code'}`;
  // The tree is drawn into a fresh temp directory every run, so its path is cut back to `.` (C3).
  const where = [realpathSync(root), root];
  return said === undefined ? how : `${how}: ${where.reduce((message, path) => message.split(path).join('.'), said)}`;
}

/** Why the Go producer cannot run here: no `go` command answers. */
export function goUnavailable(): string | undefined {
  try {
    execFileSync('go', ['version'], { env: goEnv(), stdio: ['ignore', 'pipe', 'pipe'], timeout: GO_TIMEOUT_MS });
    return undefined;
  } catch (error) {
    return isRecord(error) && error['code'] === 'ENOENT' ? 'no go command on the PATH' : `go version ${goFailure(error, tmpdir())}`;
  }
}

/** What the Go producer read of a tree: its scan, and why any module of it was left unread. */
export type GoRead = { readonly scan: Scan; readonly unread?: string };

/** The helper written into a directory of its own, run on `paths` under `root`, and its read of each. */
function runHelper(root: string, paths: readonly string[]): readonly GoFileRead[] {
  const helper = mkdtempSync(join(tmpdir(), 'atis-go-helper-'));
  try {
    writeFileSync(join(helper, 'go.mod'), GO_HELPER_MOD);
    writeFileSync(join(helper, 'main.go'), GO_HELPER_MAIN);
    const stdout = execFileSync('go', ['run', '.', root], {
      cwd: helper,
      env: goEnv(),
      input: `${paths.join('\n')}\n`,
      encoding: 'utf8',
      maxBuffer: GO_BYTES,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: GO_TIMEOUT_MS,
    });
    return parseGoHelper(stdout);
  } finally {
    rmSync(helper, { recursive: true, force: true });
  }
}

/**
 * Read the Go files of one commit's tree (D113): `files` are the ones the
 * producer claims. Each module is listed, and the helper reads every file a
 * listed package holds; a file no package holds (under `testdata/` or
 * `vendor/`, or in no module) is left to the shore. A module `go list`
 * refuses, as one asking for a newer Go than the toolchain here, is left
 * unread, and the read says which and why (C2).
 */
export function readGo(tree: Tree, files: readonly string[]): GoRead {
  const mods = tree.files.filter((path) => basename(path) === GO_MOD);
  const root = drawOut(tree, [...files, ...tree.files.filter((path) => MODULE_FILES.has(basename(path)))], 'atis-go-tree-');
  try {
    const roots = [root, realpathSync(root)];
    const modules: GoModule[] = [];
    const refused: string[] = [];
    for (const mod of mods.toSorted(byPath)) {
      const dir = dirname(mod) === '.' ? '' : dirname(mod);
      try {
        const stdout = execFileSync('go', ['list', '-e', `-json=${LIST_FIELDS}`, './...'], {
          cwd: join(root, dir),
          env: goEnv(),
          encoding: 'utf8',
          maxBuffer: GO_BYTES,
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: GO_TIMEOUT_MS,
        });
        modules.push({ dir, mod: parseGoMod(tree.read(mod)), packages: parseGoList(stdout, roots) });
      } catch (error) {
        refused.push(`go list in ${dir === '' ? '.' : dir} ${goFailure(error, root)}`);
      }
    }
    const listed = sorted(modules.flatMap((module) => module.packages.flatMap((pkg) => [...pkg.sources, ...pkg.tests])));
    const scan = goScan(modules, listed.length === 0 ? [] : runHelper(root, listed));
    return { scan, ...(refused.length === 0 ? {} : { unread: refused.join('; ') }) };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
