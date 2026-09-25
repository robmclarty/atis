/**
 * imports: the TypeScript scan the terrain and reach are built on (D21).
 *
 * `scanImports` is handed a directory holding one extracted commit (D32, D46)
 * and reads it the way the compiler would: every tracked file is listed, the
 * `.ts` and `.tsx` ones are parsed for their exports and for every static
 * import, `export … from` and `import()` specifier, and each specifier is
 * resolved with `ts.resolveModuleName` under NodeNext, so `./foo.js` lands on
 * `foo.ts`. Workspace packages resolve by name through `pnpm-workspace.yaml`,
 * or the root manifest's `workspaces` when there is none, and their own
 * manifests; bare npm packages are dropped. Nothing resolves through
 * `node_modules`, which an extracted commit does not have anyway.
 *
 * One process reads the whole tree, so the graph that feeds depth, layout,
 * reach and stitches is scanned once, not once per file.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

import { classifyFile, memberOf } from 'core';
import type { FileKind } from 'core';
import ts from 'typescript';

/** A tracked file of the scanned commit. `loc` counts the non-blank lines the scan parsed. */
export type ScannedFile = {
  readonly path: string;
  readonly loc: number;
  readonly kind: FileKind;
  readonly exports: readonly string[];
};

/** One resolved dependency: `from` takes `names` out of `to`, at `line` of `from`. */
export type ScannedEdge = {
  readonly from: string;
  readonly to: string;
  readonly names: readonly string[];
  readonly line: number;
};

/** A workspace member (D43): its package name, its directory and its entry points. */
export type ScannedMember = {
  readonly name: string;
  readonly dir: string;
  readonly entry: readonly string[];
};

export type Scan = {
  readonly files: readonly ScannedFile[];
  readonly edges: readonly ScannedEdge[];
  readonly members: readonly ScannedMember[];
};

export type ScanOptions = {
  /**
   * Where the reviewed repo's own fallow is installed (D22). An extracted
   * commit carries no `node_modules`, so the binary is looked for here while
   * the scan itself stays on `dir`. Defaults to `dir`.
   */
  readonly repo?: string;
};

/** The name a namespace import takes, and the one `export * from` takes. */
const STAR = '*';
const TYPESCRIPT = /\.tsx?$/;
const MANIFEST = 'package.json';
const WORKSPACE_FILE = 'pnpm-workspace.yaml';
const SKIPPED_DIRECTORIES = new Set(['.git', 'node_modules']);

/** The export conditions a workspace target is read through, source first (D20). */
const CONDITIONS = ['source', 'import', 'module', 'node', 'require', 'default', 'types'];

const RESOLUTION: ts.CompilerOptions = {
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  allowJs: false,
};

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

/** Repo-relative and slash-separated, with the `./` segments fallow leaves in its paths dropped. */
function normalizePath(path: string): string {
  return path
    .split('/')
    .filter((part) => part !== '' && part !== '.')
    .join('/');
}

/** Where `name` sits under `root`, or `undefined` when it sits outside it. */
function relativeTo(root: string, name: string): string | undefined {
  const path = relative(root, name);
  if (path.startsWith('..') || isAbsolute(path)) return undefined;
  return path.split(sep).join('/');
}

type Tree = { readonly files: readonly string[]; readonly directories: ReadonlySet<string> };

/** Every file of the extraction, sorted; an archive holds exactly the tracked ones (D43). */
function walk(root: string): Tree {
  const files: string[] = [];
  const directories = new Set<string>(['']);
  const pending: string[] = [''];
  for (let current = pending.pop(); current !== undefined; current = pending.pop()) {
    for (const entry of readdirSync(join(root, current), { withFileTypes: true })) {
      const path = current === '' ? entry.name : `${current}/${entry.name}`;
      if (entry.isDirectory()) {
        if (SKIPPED_DIRECTORIES.has(entry.name)) continue;
        directories.add(path);
        pending.push(path);
      } else if (entry.isFile()) files.push(path);
    }
  }
  return { files: files.toSorted(byPath), directories };
}

/**
 * The scan is the file universe the compiler is given: a specifier that leaves
 * the extraction, or dives into a `node_modules` the archive never had, simply
 * does not resolve. Symbolic links are left alone, so every resolved path stays
 * under the directory the caller named.
 */
function resolutionHost(root: string, tree: Tree, paths: ReadonlySet<string>): ts.ModuleResolutionHost {
  const known = (name: string): string | undefined => {
    const path = relativeTo(root, name);
    return path !== undefined && paths.has(path) ? path : undefined;
  };
  return {
    fileExists: (name) => known(name) !== undefined,
    readFile: (name) => (known(name) === undefined ? undefined : readFileSync(name, 'utf8')),
    directoryExists: (name) => {
      const path = relativeTo(root, name);
      return path !== undefined && tree.directories.has(path);
    },
    getCurrentDirectory: () => root,
    useCaseSensitiveFileNames: true,
  };
}

type Reference = { readonly specifier: string; readonly names: readonly string[]; readonly line: number };

type Parsed = {
  readonly loc: number;
  readonly exports: readonly string[];
  readonly references: readonly Reference[];
  /** The specifiers of `export * from …`, whose names this file passes on. */
  readonly stars: readonly string[];
};

function lineOf(source: ts.SourceFile, node: ts.Node): number {
  return source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
}

function specifierOf(node: ts.Expression | undefined): string | undefined {
  return node !== undefined && ts.isStringLiteral(node) ? node.text : undefined;
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  return ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((modifier) => modifier.kind === kind);
}

function bindingNames(name: ts.BindingName): readonly string[] {
  if (ts.isIdentifier(name)) return [name.text];
  return name.elements.flatMap((element) => (ts.isBindingElement(element) ? bindingNames(element.name) : []));
}

/** The names an exported declaration adds to its file. */
function declaredNames(statement: ts.Statement): readonly string[] {
  if (hasModifier(statement, ts.SyntaxKind.DefaultKeyword)) return ['default'];
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations.flatMap((declaration) => bindingNames(declaration.name));
  }
  if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) {
    return statement.name === undefined ? [] : [statement.name.text];
  }
  if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) return [statement.name.text];
  if (ts.isEnumDeclaration(statement) || ts.isModuleDeclaration(statement)) return [statement.name.text];
  return [];
}

/** The names an `export … from` adds to its file; a bare `export *` adds whatever the target has. */
function givenNames(clause: ts.NamedExportBindings | undefined): readonly string[] {
  if (clause === undefined) return [];
  if (ts.isNamespaceExport(clause)) return [clause.name.text];
  return clause.elements.map((element) => element.name.text);
}

/** The names an `export … from` takes out of its target: `export { a as b }` takes `a`. */
function takenNames(clause: ts.NamedExportBindings | undefined): readonly string[] {
  if (clause === undefined || ts.isNamespaceExport(clause)) return [STAR];
  return clause.elements.map((element) => (element.propertyName ?? element.name).text);
}

/** The names an import takes out of its target; a side-effect import takes none. */
function importedNames(clause: ts.ImportClause | undefined): readonly string[] {
  if (clause === undefined) return [];
  const names = clause.name === undefined ? [] : ['default'];
  const bindings = clause.namedBindings;
  if (bindings === undefined) return names;
  if (ts.isNamespaceImport(bindings)) return [...names, STAR];
  return [...names, ...bindings.elements.map((element) => (element.propertyName ?? element.name).text)];
}

/** `import('./lazy.js')` anywhere in the file; the names it takes are not written down. */
function dynamicImports(source: ts.SourceFile): readonly Reference[] {
  const found: Reference[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const [first] = node.arguments;
      if (first !== undefined && ts.isStringLiteral(first)) {
        found.push({ specifier: first.text, names: [], line: lineOf(source, node) });
      }
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(source, visit);
  return found;
}

function parseSource(path: string, content: string): Parsed {
  const kind = path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, false, kind);
  const exports: string[] = [];
  const references: Reference[] = [];
  const stars: string[] = [];
  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement)) {
      const specifier = specifierOf(statement.moduleSpecifier);
      if (specifier === undefined) continue;
      references.push({ specifier, names: importedNames(statement.importClause), line: lineOf(source, statement) });
    } else if (ts.isExportDeclaration(statement)) {
      exports.push(...givenNames(statement.exportClause));
      const specifier = specifierOf(statement.moduleSpecifier);
      if (specifier === undefined) continue;
      references.push({ specifier, names: takenNames(statement.exportClause), line: lineOf(source, statement) });
      if (statement.exportClause === undefined) stars.push(specifier);
    } else if (ts.isExportAssignment(statement)) {
      exports.push('default');
    } else if (hasModifier(statement, ts.SyntaxKind.ExportKeyword)) {
      exports.push(...declaredNames(statement));
    }
  }
  return {
    loc: content.split('\n').filter((line) => line.trim() !== '').length,
    exports: sorted(exports),
    references: [...references, ...dynamicImports(source)],
    stars,
  };
}

/**
 * The `packages:` globs of a `pnpm-workspace.yaml`, in order, with the shapes
 * pnpm writes: a block list of quoted or bare globs, or a flow list on the
 * `packages:` line itself. A `!` glob keeps its mark, as an exclusion.
 */
export function parseWorkspaceGlobs(yaml: string): readonly string[] {
  const lines = yaml.split('\n');
  const start = lines.findIndex((line) => line.startsWith('packages:'));
  if (start < 0) return [];
  const inline = lines[start]?.slice('packages:'.length).trim() ?? '';
  if (inline.startsWith('[')) {
    return inline
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map(unquote)
      .filter((glob) => glob !== '');
  }
  const globs: string[] = [];
  for (const line of lines.slice(start + 1)) {
    const item = /^\s+-\s*(.+?)\s*$/.exec(line);
    if (item?.[1] !== undefined) globs.push(unquote(item[1]));
    else if (line.trim() !== '' && !line.trim().startsWith('#')) break;
  }
  return globs;
}

function unquote(value: string): string {
  const trimmed = value.trim();
  return /^(['"]).*\1$/.test(trimmed) ? trimmed.slice(1, -1) : trimmed;
}

/**
 * The `workspaces` globs of a root `package.json`, in order (D64): the array
 * npm and bun write, or yarn's `{ "packages": [...] }` object. A `!` glob keeps
 * its mark, as an exclusion, and a manifest that will not parse names none.
 */
export function parseManifestWorkspaces(json: string): readonly string[] {
  let manifest: unknown;
  try {
    manifest = JSON.parse(json);
  } catch {
    return [];
  }
  const field = isRecord(manifest) ? manifest['workspaces'] : undefined;
  const globs = isRecord(field) ? field['packages'] : field;
  if (!Array.isArray(globs)) return [];
  return globs.flatMap((glob) => {
    const value = text(glob);
    return value === undefined ? [] : [value];
  });
}

const GLOB_TOKEN = /\*\*\/|\*\*|\*|\?|[^*?]+/g;

const GLOB_SOURCE: ReadonlyMap<string, string> = new Map([
  ['**/', '(?:.*/)?'],
  ['**', '.*'],
  ['*', '[^/]*'],
  ['?', '[^/]'],
]);

/** A workspace glob, anchored at the repo root the way pnpm reads it; npm's `./packages/a` is `packages/a`. */
export function globToRegExp(glob: string): RegExp {
  const tokens = normalizePath(glob).match(GLOB_TOKEN) ?? [];
  const source = tokens
    .map((token) => GLOB_SOURCE.get(token) ?? token.replace(/[.+^${}()|[\]\\]/g, '\\$&'))
    .join('');
  return new RegExp(`^${source}$`);
}

type Member = { readonly name: string; readonly dir: string; readonly manifest: Readonly<Record<string, unknown>> };

function readManifest(root: string, dir: string, paths: ReadonlySet<string>): Readonly<Record<string, unknown>> | undefined {
  const path = dir === '.' ? MANIFEST : `${dir}/${MANIFEST}`;
  if (!paths.has(path)) return undefined;
  try {
    const value: unknown = JSON.parse(readFileSync(join(root, path), 'utf8'));
    return isRecord(value) ? value : undefined;
  } catch {
    // A manifest that will not parse names no package: the directory is terrain
    // like any other, and nothing resolves to it by name.
    return undefined;
  }
}

/**
 * The workspace globs: `pnpm-workspace.yaml`'s when the file exists, since pnpm
 * never reads `workspaces`, else the root manifest's `workspaces` (D43, D64).
 */
function workspaceGlobs(root: string, paths: ReadonlySet<string>): readonly string[] {
  if (paths.has(WORKSPACE_FILE)) return parseWorkspaceGlobs(readFileSync(join(root, WORKSPACE_FILE), 'utf8'));
  if (paths.has(MANIFEST)) return parseManifestWorkspaces(readFileSync(join(root, MANIFEST), 'utf8'));
  return [];
}

/** The workspace members: the root, plus every directory the workspace globs match (D43, D64). */
function readMembers(root: string, tree: Tree, paths: ReadonlySet<string>): readonly Member[] {
  const globs = workspaceGlobs(root, paths);
  const include = globs.filter((glob) => !glob.startsWith('!')).map(globToRegExp);
  const exclude = globs.filter((glob) => glob.startsWith('!')).map((glob) => globToRegExp(glob.slice(1)));
  const matched = [...tree.directories].filter(
    (dir) => dir !== '' && include.some((rule) => rule.test(dir)) && !exclude.some((rule) => rule.test(dir)),
  );
  return ['.', ...matched.toSorted(byPath)].flatMap((dir) => {
    const manifest = readManifest(root, dir, paths);
    if (manifest === undefined) return [];
    return [{ name: text(manifest['name']) ?? dir, dir, manifest }];
  });
}

/** Every path an `exports` value offers, source condition first. */
function conditionTargets(value: unknown, found: string[]): void {
  const direct = text(value);
  if (direct !== undefined) {
    found.push(direct);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) conditionTargets(item, found);
    return;
  }
  if (!isRecord(value)) return;
  for (const condition of CONDITIONS) {
    if (condition in value) conditionTargets(value[condition], found);
  }
}

function isSubpathMap(value: Readonly<Record<string, unknown>>): boolean {
  return Object.keys(value).some((key) => key === '.' || key.startsWith('./'));
}

/** The `exports` entry for one subpath; a bare condition map is the `.` entry. */
function exportsEntry(value: unknown, subpath: string): unknown {
  if (typeof value === 'string') return subpath === '.' ? value : undefined;
  if (!isRecord(value)) return undefined;
  if (!isSubpathMap(value)) return subpath === '.' ? value : undefined;
  return value[subpath];
}

/**
 * The source file a manifest target names: the file a built target was emitted
 * from first (D20), since a repo that commits its `dist/` would otherwise enter
 * itself through generated code, then the target as written.
 */
function candidates(target: string): readonly string[] {
  const clean = normalizePath(target);
  const stem = clean.replace(/^dist\//, 'src/').replace(/\.d\.ts$|\.js$/, '');
  if (stem === clean) return [clean];
  return [`${stem}.ts`, `${stem}.tsx`, `${stem}/index.ts`, clean];
}

/** The scanned TypeScript file a manifest target names, tests and other paths dropped. */
function sourceFor(dir: string, target: string, paths: ReadonlySet<string>): string | undefined {
  for (const candidate of candidates(target)) {
    const path = dir === '.' ? candidate : `${dir}/${candidate}`;
    if (paths.has(path) && classifyFile(path) === 'source') return path;
  }
  return undefined;
}

/** What a workspace package's name, or one of its subpaths, points at. */
function memberTargets(member: Member, subpath: string): readonly string[] {
  const found: string[] = [];
  conditionTargets(exportsEntry(member.manifest['exports'], subpath), found);
  if (subpath !== '.') return [...found, subpath];
  const main = text(member.manifest['main']);
  return [...found, ...(main === undefined ? [] : [main]), 'src/index.ts'];
}

/** Every entry point a member's own manifest declares: its `bin`, `main` and `exports` targets. */
function manifestEntries(member: Member, paths: ReadonlySet<string>): readonly string[] {
  const targets: string[] = [];
  const bin = member.manifest['bin'];
  if (isRecord(bin)) for (const value of Object.values(bin)) conditionTargets(value, targets);
  else conditionTargets(bin, targets);
  conditionTargets(member.manifest['main'], targets);
  const exported = member.manifest['exports'];
  if (isRecord(exported) && isSubpathMap(exported)) {
    for (const value of Object.values(exported)) conditionTargets(value, targets);
  } else conditionTargets(exported, targets);
  return targets.flatMap((target) => {
    const path = sourceFor(member.dir, target, paths);
    return path === undefined ? [] : [path];
  });
}

type Context = {
  readonly root: string;
  readonly paths: ReadonlySet<string>;
  readonly members: readonly Member[];
  readonly host: ts.ModuleResolutionHost;
  readonly cache: ts.ModuleResolutionCache;
};

/** A workspace package by name, never through `node_modules`; an npm package resolves to nothing. */
function resolveWorkspace(specifier: string, context: Context): string | undefined {
  for (const member of context.members) {
    const subpath =
      specifier === member.name ? '.' : specifier.startsWith(`${member.name}/`) ? `./${specifier.slice(member.name.length + 1)}` : undefined;
    if (subpath === undefined) continue;
    for (const target of memberTargets(member, subpath)) {
      const path = sourceFor(member.dir, target, context.paths);
      if (path !== undefined) return path;
    }
  }
  return undefined;
}

/** NodeNext, so `./foo.js` lands on `foo.ts` and `./bar` on `bar/index.ts`. */
function resolveRelative(specifier: string, from: string, context: Context): string | undefined {
  const { resolvedModule } = ts.resolveModuleName(
    specifier,
    join(context.root, from),
    RESOLUTION,
    context.host,
    context.cache,
  );
  if (resolvedModule === undefined) return undefined;
  const path = relativeTo(context.root, resolvedModule.resolvedFileName);
  return path !== undefined && context.paths.has(path) ? path : undefined;
}

function resolveSpecifier(specifier: string, from: string, context: Context): string | undefined {
  if (specifier.startsWith('.') || specifier.startsWith('/')) return resolveRelative(specifier, from, context);
  return resolveWorkspace(specifier, context);
}

/**
 * `export * from './x.js'` gives a barrel every name `x` exports, and `x` may
 * be a barrel too. The union is taken to a fixed point, so a cycle of stars
 * settles instead of recursing. A star through an unresolved specifier (an npm
 * package) adds nothing: those names are not knowable from this scan (C2).
 */
function expandStars(
  own: ReadonlyMap<string, readonly string[]>,
  stars: ReadonlyMap<string, readonly string[]>,
): ReadonlyMap<string, readonly string[]> {
  const names = new Map([...own].map(([path, list]) => [path, new Set(list)]));
  for (let changed = true; changed; ) {
    changed = false;
    for (const [path, targets] of stars) {
      const here = names.get(path) ?? new Set<string>();
      for (const target of targets) {
        for (const name of names.get(target) ?? []) {
          if (here.has(name)) continue;
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
 * fallow's `list --entry-points --format json`: the `path` of every entry, with
 * the `./` segments it leaves in workspace paths collapsed. Pure, so the shape
 * is tested from a string and not from a fallow run (D30).
 */
export function parseFallowEntryPoints(stdout: string): readonly string[] {
  const value: unknown = JSON.parse(stdout);
  const listed = isRecord(value) ? value['entry_points'] : undefined;
  if (!Array.isArray(listed)) throw new Error('fallow list: no entry_points array in the output');
  return sorted(
    listed.flatMap((entry) => {
      const path = isRecord(entry) ? text(entry['path']) : undefined;
      return path === undefined ? [] : [normalizePath(path)];
    }),
  );
}

/**
 * The reviewed repo's own fallow, never the machine's (D22): the pinned binary
 * knows the conventions its `.check/` was measured with. No local fallow, or a
 * run that fails, simply means the entry points come from the manifests alone.
 */
function fallowEntryPoints(dir: string, repo: string): readonly string[] {
  if (!existsSync(join(repo, 'node_modules', '.bin', 'fallow'))) return [];
  try {
    const stdout = execFileSync('pnpm', ['exec', 'fallow', 'list', '--entry-points', '--format', 'json', '--root', dir], {
      cwd: repo,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 60_000,
    });
    return parseFallowEntryPoints(stdout);
  } catch {
    return [];
  }
}

/** The entry points of each member: fallow's list, if there is one, and every manifest target. */
function entryPoints(dir: string, context: Context, options: ScanOptions): ReadonlyMap<string, readonly string[]> {
  const dirs = context.members.map((member) => member.dir);
  const found = new Map<string, string[]>(dirs.map((memberDir) => [memberDir, []]));
  const fromFallow = fallowEntryPoints(dir, options.repo ?? dir).filter(
    (path) => context.paths.has(path) && classifyFile(path) === 'source',
  );
  for (const member of context.members) found.get(member.dir)?.push(...manifestEntries(member, context.paths));
  for (const path of fromFallow) {
    // A root package claims every path, so only a repo without one can have an
    // entry point that belongs to no member; it has no manifest to hang on.
    const owner = memberOf(path, dirs);
    if (owner !== undefined) found.get(owner === '' ? '.' : owner)?.push(path);
  }
  return found;
}

/**
 * Read one extracted commit into the files, edges and members `buildMap` needs.
 * `dir` is the extraction; `options.repo` is the working tree its fallow lives
 * in, when the reviewed repo has one.
 */
export function scanImports(dir: string, options: ScanOptions = {}): Scan {
  const root = resolve(dir);
  const tree = walk(root);
  const paths = new Set(tree.files);
  const members = readMembers(root, tree, paths);
  const context: Context = {
    root,
    paths,
    members,
    host: resolutionHost(root, tree, paths),
    cache: ts.createModuleResolutionCache(root, (name) => name, RESOLUTION),
  };

  const parsed = new Map<string, Parsed>();
  const edges: ScannedEdge[] = [];
  const stars = new Map<string, readonly string[]>();
  for (const path of tree.files) {
    if (!TYPESCRIPT.test(path)) continue;
    const file = parseSource(path, readFileSync(join(root, path), 'utf8'));
    parsed.set(path, file);
    for (const reference of file.references) {
      const to = resolveSpecifier(reference.specifier, path, context);
      if (to !== undefined && to !== path) edges.push({ from: path, to, names: reference.names, line: reference.line });
    }
    stars.set(
      path,
      file.stars.flatMap((specifier) => {
        const to = resolveSpecifier(specifier, path, context);
        return to === undefined ? [] : [to];
      }),
    );
  }

  const exports = expandStars(
    new Map([...parsed].map(([path, file]) => [path, file.exports])),
    stars,
  );
  const files = tree.files.map((path) => ({
    path,
    loc: parsed.get(path)?.loc ?? 0,
    kind: classifyFile(path),
    exports: exports.get(path) ?? [],
  }));
  const entries = entryPoints(dir, context, options);
  return {
    files,
    edges: edges.toSorted((a, b) => byPath(a.from, b.from) || a.line - b.line || byPath(a.to, b.to)),
    members: members.map((member) => ({
      name: member.name,
      dir: member.dir,
      entry: sorted(entries.get(member.dir) ?? []),
    })),
  };
}
