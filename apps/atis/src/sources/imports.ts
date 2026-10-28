/**
 * imports: the TypeScript producer, the first of the scans the terrain and
 * reach are built on (D21, D114).
 *
 * `readTypeScript` is handed one commit's tree (D32, D46) and the files of it
 * the producer claims, and reads them the way the compiler would: the
 * `.ts`, `.tsx`, `.mts` and `.cts` files are parsed for their exports and for
 * every static import, `export … from` and `import()` specifier, and each
 * specifier is resolved with `ts.resolveModuleName` under NodeNext, so
 * `./foo.js` lands on `foo.ts` and `./foo.mjs` on `foo.mts`. Workspace
 * packages resolve by name through `pnpm-workspace.yaml`, or the root
 * manifest's `workspaces` when there is none, and their own manifests; bare
 * npm packages resolve to no file, and each file records instead the outside
 * packages it imports by name (D170). Nothing resolves through
 * `node_modules`, which an extracted commit does not have anyway.
 *
 * Beside each exported name the scan records the shape the compiler declares
 * for it (D76): the file's emitted declarations, printed, so a body-only edit
 * moves nothing and a tuple gaining an element does. A name whose type the
 * compiler would have to infer is recorded as not compared (C2).
 *
 * Each member's manifest is read for whether it publishes (not `private:
 * true`, or carrying `publishConfig`) and for the files it publishes through
 * (D75), and each re-export edge is marked with the names it passes on, so
 * core can follow a published name from the entry that exposes it to the file
 * that declares it.
 *
 * Each file it claims is given its kind, source or test, and an `index.ts`
 * or `index.tsx` is marked as its directory's barrel, so core reads neither
 * from a name (D114). One process reads the whole tree, so the graph that
 * feeds depth, layout, reach and stitches is scanned once, not once per file.
 * Handed an earlier commit's reads, it parses only the files the diff touched
 * and draws out, with the manifests, only those (D136, D172).
 */

import { execFileSync } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { isBuiltin } from 'node:module';
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path';

import { memberOf } from 'core';
import type { CodeSpan, EntryPointLookup, ExportShapes, FileKind, PassedName, ScanFunction } from 'core';
import ts from 'typescript';

import { walk } from './scan.js';
import type { Scan, ScannedEdge, ScannedFile, Tree } from './scan.js';

/** What the TypeScript producer read from each file of a tree, by path: what a later read of a later commit reuses (D136). */
export type ParsedFiles = Readonly<Record<string, ParsedFile>>;

/** fallow's entry points for a tree, and whether it was read at all (C2): what a later run on the same commit reuses (D136). */
export type EntryPoints = { readonly entries: readonly FallowEntry[]; readonly lookup: EntryPointLookup };

/**
 * What an earlier read of an earlier commit read from each file, and the
 * paths the diff since then touched (D136). A file the diff left alone holds
 * the same bytes at the same path, so what it read stands and the file is not
 * read again; only the touched ones, and any it never read, are.
 */
export type Prior = { readonly parsed: ParsedFiles; readonly touched: ReadonlySet<string> };

/** What the TypeScript producer read of a tree: the scan of its own files, what it parsed from each, and the entry points it was handed. */
export type TypeScriptRead = { readonly scan: Scan; readonly parsed: ParsedFiles; readonly entryPoints: EntryPoints };

/** The name a namespace import takes, and the one `export * from` takes. */
const STAR = '*';
/** The extensions the TypeScript producer claims: `.ts`, `.tsx`, and the `.mts` and `.cts` NodeNext modules, declarations included (D77, D114). */
export const TYPESCRIPT_EXTENSIONS: readonly string[] = ['.ts', '.tsx', '.mts', '.cts'];
const TYPESCRIPT = /\.(?:[cm]?ts|tsx)$/;
/** A test by its name, `.test.ts` or `.spec.tsx`, or by its folder, `__tests__/` or `test/` (D4). */
const TEST_NAME = /\.(?:test|spec)\.(?:[cm]?ts|tsx)$/;
const TEST_DIR = /(?:^|\/)(?:__tests__|test)\//;
/** The barrel a directory is entered through (D45): its `index.ts`, or its `index.tsx`. */
const BARREL = /(?:^|\/)index\.tsx?$/;
const MANIFEST = 'package.json';
const WORKSPACE_FILE = 'pnpm-workspace.yaml';
/** The reviewed repo's own fallow, relative to its working tree (D22). */
const FALLOW_BIN = 'node_modules/.bin/fallow';
const FALLOW_TIMEOUT_MS = 60_000;

/** A package name npm would take, scoped or not, as a bare specifier opens with it. */
const PACKAGE_NAME = /^(?:@[a-z0-9][\w.~-]*\/)?[a-z0-9][\w.~-]*$/i;

/** The export conditions a workspace target is read through, source first (D20). */
const CONDITIONS = ['source', 'import', 'module', 'node', 'require', 'default', 'types'];

/** What a build emits for one source file: a script in each module format, and its declarations (D75). */
const EMITTED = /\.d\.[cm]?ts$|\.[cm]?js$/;

/** The folder a build writes one module format into, beside the others, under `dist/` (D75). */
const FORMAT_FOLDER = /^src\/(?:cjs|es|esm|mjs|types)\//;

/** The manifest fields a published member exposes its names through, beside `exports` (D75). */
const PUBLISHED_FIELDS = ['main', 'types', 'module'];

/** fallow's tags for the entries it read from those same fields; it reads no `types` (D75). */
const PUBLISHED_TAGS: ReadonlySet<string> = new Set(['package.json exports', 'package.json main', 'package.json module']);

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

/**
 * What the TypeScript producer makes of a path (D114): TypeScript (`.mts`
 * and `.cts` too, D77) is source unless its name or its folder says it is a
 * test (D4), and any other path is none of its own. The shore's `config` and
 * `build` rows may still take a source file, which is core's to apply (D57,
 * D84).
 */
export function typescriptKind(path: string): FileKind {
  if (!TYPESCRIPT.test(path)) return 'other';
  return TEST_NAME.test(path) || TEST_DIR.test(path) ? 'test' : 'source';
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

/**
 * The scan is the file universe the compiler is given: a specifier that leaves
 * the extraction, or dives into a `node_modules` the archive never had, simply
 * does not resolve. Symbolic links are left alone, so every resolved path stays
 * under the directory the caller named.
 */
function resolutionHost(tree: Tree, paths: ReadonlySet<string>): ts.ModuleResolutionHost {
  const known = (name: string): string | undefined => {
    const path = relativeTo(tree.root, name);
    return path !== undefined && paths.has(path) ? path : undefined;
  };
  return {
    fileExists: (name) => known(name) !== undefined,
    readFile: (name) => {
      const path = known(name);
      return path === undefined ? undefined : tree.read(path);
    },
    directoryExists: (name) => {
      const path = relativeTo(tree.root, name);
      return path !== undefined && tree.directories.has(path);
    },
    getCurrentDirectory: () => tree.root,
    useCaseSensitiveFileNames: true,
  };
}

type Reference = {
  readonly specifier: string;
  readonly names: readonly string[];
  readonly line: number;
  /** What an `export … from` passes on, absent on an import. */
  readonly reexports?: readonly PassedName[];
};

/** An `export * from …`, and the shape it gives every name it passes on. */
type Star = { readonly specifier: string; readonly shape: string };

/** What one TypeScript file says, read from its source alone: a pure function of its path and its bytes. */
export type ParsedFile = {
  readonly loc: number;
  /** The lines of each statement that survives type stripping (D80, D141). */
  readonly code: readonly CodeSpan[];
  readonly exports: readonly string[];
  /** The shape of each name in `exports`; a name a star passes on is the scan's to add. */
  readonly shapes: ExportShapes;
  /** The names in `exports` whose type the declaration emit flagged as inferred. */
  readonly inferred: readonly string[];
  readonly references: readonly Reference[];
  /** The file's `export * from …`, whose names it passes on. */
  readonly stars: readonly Star[];
  /** Every named function in it, by the line it starts on (D102). */
  readonly functions: readonly ScanFunction[];
};

function lineOf(source: ts.SourceFile, node: ts.Node): number {
  return source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
}

/** A statement's lines, from its first token to its last, leading comments left out. */
function spanOf(source: ts.SourceFile, node: ts.Node): CodeSpan {
  return { start: lineOf(source, node), end: source.getLineAndCharacterOfPosition(node.getEnd()).line + 1 };
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

/**
 * What an `export … from` passes on out of its target, and as what:
 * `export { a as b }` passes `a` as `b`, `export * as ns` the whole target as
 * `ns`, and a bare `export *` or `export type *` every name as itself (D75).
 */
function passedNames(clause: ts.NamedExportBindings | undefined): readonly PassedName[] {
  if (clause === undefined) return [{ name: STAR, as: STAR }];
  if (ts.isNamespaceExport(clause)) return [{ name: STAR, as: clause.name.text }];
  return clause.elements.map((element) => ({ name: (element.propertyName ?? element.name).text, as: element.name.text }));
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

/**
 * Whether a statement leaves JavaScript behind once the types are stripped.
 * An import and an `export … from` carry no line a coverage report counts; a
 * type, an interface, anything `declare`d and an overload signature carry
 * nothing at all; and a namespace emits only when something inside it does.
 * Everything else (a variable, a function with a body, a class, an enum, an
 * expression, an `export default` or `export =`) is code a test can run (D80).
 */
function leavesCode(statement: ts.Statement): boolean {
  if (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement) || ts.isEmptyStatement(statement)) return false;
  if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) return false;
  if (hasModifier(statement, ts.SyntaxKind.DeclareKeyword)) return false;
  if (ts.isImportEqualsDeclaration(statement)) return !statement.isTypeOnly;
  if (ts.isFunctionDeclaration(statement)) return statement.body !== undefined;
  if (ts.isModuleDeclaration(statement)) return namespaceLeavesCode(statement);
  return true;
}

/** A namespace is instantiated, and emits, only when a statement inside it does; `namespace a.b {}` nests one in another. */
function namespaceLeavesCode(declaration: ts.ModuleDeclaration): boolean {
  const { body } = declaration;
  if (body === undefined) return false;
  if (ts.isModuleBlock(body)) return body.statements.some(leavesCode);
  return ts.isModuleDeclaration(body) && namespaceLeavesCode(body);
}

/** Comments are no part of a shape, so an edit to a doc comment moves nothing (D76). */
const PRINTER = ts.createPrinter({ removeComments: true });

/** How a declaration is exported, which is no part of its shape. */
const EXPORT_MODIFIERS: ReadonlySet<ts.SyntaxKind> = new Set([
  ts.SyntaxKind.ExportKeyword,
  ts.SyntaxKind.DefaultKeyword,
  ts.SyntaxKind.DeclareKeyword,
]);

/** A name bound from another module: `name` as that module exports it, `*` for the whole of it. */
type Bound = { readonly name: string; readonly specifier: string; readonly typeOnly: boolean };

/**
 * What an exported name stands for: declarations of its own file, or a
 * binding another module owns. A binding's shape is the binding itself, since
 * the declaration it names is read in its own file, where a move shows (D76).
 */
type Target =
  | { readonly bound: Bound }
  | { readonly nodes: readonly ts.Node[]; readonly typeOnly: boolean };

/** A local name the file exports: `export { a as b }` exports `a` as `b`. */
type LocalExport = { readonly local: string; readonly typeOnly: boolean };

function boundShape({ name, specifier, typeOnly }: Bound): string {
  return `${typeOnly ? 'type ' : ''}${name} from ${JSON.stringify(specifier)}`;
}

function push<T>(map: Map<string, T[]>, key: string, value: T): void {
  const list = map.get(key);
  if (list === undefined) map.set(key, [value]);
  else list.push(value);
}

/** The top-level names a statement declares, exported or not; a variable's node is its own declaration. */
function localDeclarations(statement: ts.Statement): readonly (readonly [string, ts.Node])[] {
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations.flatMap((declaration) =>
      bindingNames(declaration.name).map((name) => [name, declaration] as const),
    );
  }
  if (
    ts.isFunctionDeclaration(statement) ||
    ts.isClassDeclaration(statement) ||
    ts.isInterfaceDeclaration(statement) ||
    ts.isTypeAliasDeclaration(statement) ||
    ts.isEnumDeclaration(statement)
  ) {
    return statement.name === undefined ? [] : [[statement.name.text, statement]];
  }
  if (ts.isModuleDeclaration(statement) && ts.isIdentifier(statement.name)) return [[statement.name.text, statement]];
  return [];
}

/** The names an import binds in its file. */
function importBindings(statement: ts.ImportDeclaration): readonly (readonly [string, Bound])[] {
  const specifier = specifierOf(statement.moduleSpecifier);
  const clause = statement.importClause;
  if (specifier === undefined || clause === undefined) return [];
  const typeOnly = clause.phaseModifier === ts.SyntaxKind.TypeKeyword;
  const bound: (readonly [string, Bound])[] = [];
  if (clause.name !== undefined) bound.push([clause.name.text, { name: 'default', specifier, typeOnly }]);
  const bindings = clause.namedBindings;
  if (bindings === undefined) return bound;
  if (ts.isNamespaceImport(bindings)) return [...bound, [bindings.name.text, { name: STAR, specifier, typeOnly }]];
  for (const element of bindings.elements) {
    const name = (element.propertyName ?? element.name).text;
    bound.push([element.name.text, { name, specifier, typeOnly: typeOnly || element.isTypeOnly }]);
  }
  return bound;
}

/**
 * What each name a file exports itself stands for. It is read the same way
 * from the source, where the compiler's diagnostics sit, and from the
 * declarations the compiler emits for it, which are printed, so the two line
 * up by name. A bare `export *` adds no name here: the scan adds its names once
 * the star resolves.
 */
function exportTargets(file: ts.SourceFile): ReadonlyMap<string, Target> {
  const declared = new Map<string, ts.Node[]>();
  const imported = new Map<string, Bound>();
  const locals = new Map<string, LocalExport>();
  const defaults: ts.Node[] = [];
  const targets = new Map<string, Target>();
  for (const statement of file.statements) {
    if (ts.isImportDeclaration(statement)) {
      for (const [name, bound] of importBindings(statement)) imported.set(name, bound);
    } else if (ts.isExportDeclaration(statement)) {
      const specifier = specifierOf(statement.moduleSpecifier);
      const clause = statement.exportClause;
      if (clause === undefined) continue;
      if (ts.isNamespaceExport(clause)) {
        if (specifier === undefined) continue;
        targets.set(clause.name.text, { bound: { name: STAR, specifier, typeOnly: statement.isTypeOnly } });
        continue;
      }
      for (const element of clause.elements) {
        const name = (element.propertyName ?? element.name).text;
        const typeOnly = statement.isTypeOnly || element.isTypeOnly;
        if (specifier === undefined) locals.set(element.name.text, { local: name, typeOnly });
        else targets.set(element.name.text, { bound: { name, specifier, typeOnly } });
      }
    } else if (ts.isExportAssignment(statement)) {
      // `export default v` names a local; any other expression is its own declaration.
      if (ts.isIdentifier(statement.expression)) locals.set('default', { local: statement.expression.text, typeOnly: false });
      else defaults.push(statement);
    } else {
      for (const [name, node] of localDeclarations(statement)) push(declared, name, node);
      if (!hasModifier(statement, ts.SyntaxKind.ExportKeyword)) continue;
      if (hasModifier(statement, ts.SyntaxKind.DefaultKeyword)) defaults.push(statement);
      else for (const name of declaredNames(statement)) locals.set(name, { local: name, typeOnly: false });
    }
  }
  // A local may be declared after the line that exports it, so locals resolve once the file is read.
  for (const [name, { local, typeOnly }] of locals) {
    const bound = imported.get(local);
    targets.set(name, bound === undefined ? { nodes: declared.get(local) ?? [], typeOnly } : { bound: { ...bound, typeOnly: bound.typeOnly || typeOnly } });
  }
  if (defaults.length > 0) targets.set('default', { nodes: defaults, typeOnly: false });
  return targets;
}

/** The declarations the compiler emits for a file, and what it said while emitting them. */
type Emitted = { readonly file: ts.SourceFile; readonly diagnostics: readonly ts.Diagnostic[] };

/**
 * The compiler's own declaration emit, one file at a time. It reports, under
 * `isolatedDeclarations`, every declaration whose type it had to infer, and
 * any that would not parse. A declaration file already is its emit. An emit
 * the compiler fails outright leaves nothing to compare (C2).
 */
function emitDeclarations(source: ts.SourceFile): Emitted | undefined {
  if (source.isDeclarationFile) return { file: source, diagnostics: [] };
  let output: ts.TranspileOutput;
  try {
    output = ts.transpileDeclaration(source.text, {
      fileName: source.fileName,
      reportDiagnostics: true,
      compilerOptions: { removeComments: true },
    });
  } catch {
    return undefined;
  }
  return {
    file: ts.createSourceFile(source.fileName, output.outputText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS),
    diagnostics: output.diagnostics ?? [],
  };
}

/** Whether a diagnostic sits inside the declarations a name stands for: an inferred type, or one that would not parse. */
function flagged(target: Target, diagnostics: readonly ts.Diagnostic[], source: ts.SourceFile): boolean {
  if ('bound' in target) return false;
  return target.nodes.some((node) =>
    diagnostics.some(({ start }) => start !== undefined && start >= node.getStart(source) && start <= node.end),
  );
}

/** A variable in a statement of its own, so `export const a = 1, b = 2` gives each name its own print. */
function alone(declaration: ts.VariableDeclaration): ts.Node {
  const list = declaration.parent;
  if (!ts.isVariableDeclarationList(list) || !ts.isVariableStatement(list.parent)) return declaration;
  return ts.factory.updateVariableStatement(
    list.parent,
    list.parent.modifiers,
    ts.factory.updateVariableDeclarationList(list, [declaration]),
  );
}

/** A declaration as it reads whatever exports it: `export`, `default` and `declare` dropped. */
function bare(node: ts.Node): ts.Node {
  const statement = ts.isVariableDeclaration(node) ? alone(node) : node;
  if (!ts.canHaveModifiers(statement)) return statement;
  const kept = (ts.getModifiers(statement) ?? []).filter((modifier) => !EXPORT_MODIFIERS.has(modifier.kind));
  return ts.factory.replaceModifiers(statement, kept);
}

function printed(target: Target, file: ts.SourceFile): string | null {
  if ('bound' in target) return boundShape(target.bound);
  if (target.nodes.length === 0) return null;
  const prints = target.nodes.map((node) => PRINTER.printNode(ts.EmitHint.Unspecified, bare(node), file));
  return `${target.typeOnly ? 'type ' : ''}${prints.join('\n')}`;
}

/** Each exported name's shape, and the names whose type the emit could only infer. */
type Shapes = { readonly shapes: ExportShapes; readonly inferred: readonly string[] };

/**
 * The shape of each of `names` (D76): the declarations the compiler emits for
 * the file, printed, so bodies and initializers are gone and every overload
 * and merged declaration is in. A name the compiler flagged while emitting,
 * or one it emitted nothing for, is `null`: not compared, never unchanged (C2).
 * The flagged names are listed apart, since the checker can print some of
 * them where a file read on its own cannot (D118).
 */
function shapesOf(source: ts.SourceFile, names: readonly string[]): Shapes {
  if (names.length === 0) return { shapes: {}, inferred: [] };
  const emitted = emitDeclarations(source);
  const own = exportTargets(source);
  const out = emitted === undefined ? new Map<string, Target>() : exportTargets(emitted.file);
  const inferred: string[] = [];
  const shapes = Object.fromEntries(
    names.map((name) => {
      const declared = own.get(name);
      const target = out.get(name);
      if (emitted === undefined || declared === undefined || target === undefined) return [name, null];
      if (!flagged(declared, emitted.diagnostics, source)) return [name, printed(target, emitted.file)];
      inferred.push(name);
      return [name, null];
    }),
  );
  return { shapes, inferred };
}

/**
 * The shape of each of `names` as a declaration file declares it, printed the
 * way `shapesOf` prints the emit of a file read on its own, so the checker's
 * emit of an inferred name compares with a name written out by hand (D118).
 * A name the file does not declare is `null` (C2).
 */
export function declaredShapes(declarations: ts.SourceFile, names: readonly string[]): ExportShapes {
  const targets = exportTargets(declarations);
  return Object.fromEntries(
    names.map((name) => {
      const target = targets.get(name);
      return [name, target === undefined ? null : printed(target, declarations)];
    }),
  );
}

/**
 * The local names a file exports with no `from` of its own, each with the
 * names it exports it as: `export { a as b }` and `export default a`. One
 * that an import bound is a re-export by another road (D75).
 */
function bareExports(source: ts.SourceFile): ReadonlyMap<string, readonly string[]> {
  const exported = new Map<string, string[]>();
  for (const statement of source.statements) {
    if (ts.isExportDeclaration(statement) && statement.moduleSpecifier === undefined && statement.exportClause !== undefined) {
      if (!ts.isNamedExports(statement.exportClause)) continue;
      for (const element of statement.exportClause.elements) push(exported, (element.propertyName ?? element.name).text, element.name.text);
    } else if (ts.isExportAssignment(statement) && !statement.isExportEquals && ts.isIdentifier(statement.expression)) {
      push(exported, statement.expression.text, 'default');
    }
  }
  return exported;
}

/**
 * What an import passes on when the file exports a name it bound: `import {
 * a } from './a.js'` and then `export { a }` passes `a` on as `a`, exactly as
 * `export { a } from './a.js'` would, so the public-name walk follows it
 * through (D75). A namespace import exported whole passes `*` under its name.
 */
function passedThrough(statement: ts.ImportDeclaration, exported: ReadonlyMap<string, readonly string[]>): readonly PassedName[] {
  return importBindings(statement).flatMap(([local, bound]) => (exported.get(local) ?? []).map((as) => ({ name: bound.name, as })));
}

/** What a function-like node is called where it is declared, or nothing for one bound to no name. */
function nameOfFunction(node: ts.Node, source: ts.SourceFile): string | undefined {
  if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) return node.name?.text ?? boundName(node, source);
  if (ts.isConstructorDeclaration(node)) return 'constructor';
  if (ts.isMethodDeclaration(node) || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) return node.name.getText(source);
  if (ts.isArrowFunction(node)) return boundName(node, source);
  return undefined;
}

/** The name a function expression or an arrow is bound to: the variable, the property or the class field it initialises. */
function boundName(node: ts.Node, source: ts.SourceFile): string | undefined {
  const { parent } = node;
  if ((ts.isVariableDeclaration(parent) || ts.isPropertyAssignment(parent) || ts.isPropertyDeclaration(parent)) && parent.initializer === node) {
    return ts.isIdentifier(parent.name) || ts.isPrivateIdentifier(parent.name) ? parent.name.text : parent.name.getText(source);
  }
  return undefined;
}

/**
 * Every named function in a file, at any depth (D102): a declaration, a
 * method, an accessor or a constructor, and a function expression or an
 * arrow bound to a variable, a property or a class field, each by the line it
 * starts on and the lines it spans. An overload with no body is no function,
 * and a callback bound to no name is not recorded here; fallow names one that
 * breaks a threshold, and core adds it from there.
 */
function functionsOf(source: ts.SourceFile): readonly ScanFunction[] {
  const found: ScanFunction[] = [];
  const visit = (node: ts.Node): void => {
    const name = ts.isFunctionLike(node) && 'body' in node && node.body !== undefined ? nameOfFunction(node, source) : undefined;
    if (name !== undefined) {
      const { start, end } = spanOf(source, node);
      found.push({ name, line: start, line_count: end - start + 1 });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found.toSorted((a, b) => a.line - b.line || byPath(a.name, b.name));
}

function parseSource(path: string, content: string): ParsedFile {
  // The compiler gives `.mts` and `.cts` no kind of their own: they parse as
  // `.ts` does, and a `.d.mts` or `.d.cts` is a declaration file by its name (D77).
  const kind = path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true, kind);
  const exports: string[] = [];
  const references: Reference[] = [];
  const stars: Star[] = [];
  const exported = bareExports(source);
  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement)) {
      const specifier = specifierOf(statement.moduleSpecifier);
      if (specifier === undefined) continue;
      const passes = passedThrough(statement, exported);
      references.push({
        specifier,
        names: importedNames(statement.importClause),
        line: lineOf(source, statement),
        ...(passes.length === 0 ? {} : { reexports: passes }),
      });
    } else if (ts.isExportDeclaration(statement)) {
      exports.push(...givenNames(statement.exportClause));
      const specifier = specifierOf(statement.moduleSpecifier);
      if (specifier === undefined) continue;
      const reexports = passedNames(statement.exportClause);
      references.push({ specifier, names: reexports.map((pass) => pass.name), line: lineOf(source, statement), reexports });
      if (statement.exportClause === undefined) {
        stars.push({ specifier, shape: boundShape({ name: STAR, specifier, typeOnly: statement.isTypeOnly }) });
      }
    } else if (ts.isExportAssignment(statement)) {
      exports.push('default');
    } else if (hasModifier(statement, ts.SyntaxKind.ExportKeyword)) {
      exports.push(...declaredNames(statement));
    }
  }
  const names = sorted(exports);
  const { shapes, inferred } = shapesOf(source, names);
  return {
    loc: content.split('\n').filter((line) => line.trim() !== '').length,
    // A declaration file is all types by its name, whatever it holds (D77).
    code: source.isDeclarationFile ? [] : source.statements.filter(leavesCode).map((statement) => spanOf(source, statement)),
    exports: names,
    shapes,
    inferred,
    references: [...references, ...dynamicImports(source)],
    stars,
    functions: source.isDeclarationFile ? [] : functionsOf(source),
  };
}

/**
 * The shape beside each name a TypeScript file exports itself (D76), read
 * from its source alone, so it is tested from strings (D30). A name a bare
 * `export *` passes on is absent: the scan adds it once the star resolves.
 */
export function parseExportShapes(path: string, content: string): ExportShapes {
  return parseSource(path, content).shapes;
}

/**
 * The lines of each statement in a TypeScript file that leaves code a
 * coverage report could measure, read from its source alone (D30, D80,
 * D141): types, imports, `export … from` and ambient declarations leave none,
 * so a change among them leaves no gap where a report never names the file.
 */
export function parseCodeSpans(path: string, content: string): readonly CodeSpan[] {
  return parseSource(path, content).code;
}

/**
 * Every named function in a TypeScript file, read from its source alone
 * (D30, D102): its name, the line it starts on and how many lines it spans.
 */
export function parseFunctions(path: string, content: string): readonly ScanFunction[] {
  return parseSource(path, content).functions;
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

function readManifest(tree: Tree, dir: string, paths: ReadonlySet<string>): Readonly<Record<string, unknown>> | undefined {
  const path = dir === '.' ? MANIFEST : `${dir}/${MANIFEST}`;
  if (!paths.has(path)) return undefined;
  try {
    const value: unknown = JSON.parse(tree.read(path));
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
function workspaceGlobs(tree: Tree, paths: ReadonlySet<string>): readonly string[] {
  if (paths.has(WORKSPACE_FILE)) return parseWorkspaceGlobs(tree.read(WORKSPACE_FILE));
  if (paths.has(MANIFEST)) return parseManifestWorkspaces(tree.read(MANIFEST));
  return [];
}

/** The workspace members: the root, plus every directory the workspace globs match (D43, D64). */
function readMembers(tree: Tree, paths: ReadonlySet<string>): readonly Member[] {
  const globs = workspaceGlobs(tree, paths);
  const include = globs.filter((glob) => !glob.startsWith('!')).map(globToRegExp);
  const exclude = globs.filter((glob) => glob.startsWith('!')).map((glob) => globToRegExp(glob.slice(1)));
  const matched = [...tree.directories].filter(
    (dir) => dir !== '' && include.some((rule) => rule.test(dir)) && !exclude.some((rule) => rule.test(dir)),
  );
  return ['.', ...matched.toSorted(byPath)].flatMap((dir) => {
    const manifest = readManifest(tree, dir, paths);
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
 * itself through generated code, then the target as written. A build emits
 * each module format and its declarations (D75), and may write the formats
 * side by side in a folder each, which the source tree does not have.
 */
/** The sources a built stem may come from: an `.mjs` or `.d.mts` from a NodeNext `.mts` as well as from a bundled `.ts`, and a `.cjs` from a `.cts` (D77). */
function sourcesOf(stem: string): readonly string[] {
  return [`${stem}.ts`, `${stem}.tsx`, `${stem}.mts`, `${stem}.cts`, `${stem}/index.ts`, `${stem}/index.mts`, `${stem}/index.cts`];
}

function candidates(target: string): readonly string[] {
  const clean = normalizePath(target);
  const stem = clean.replace(/^dist\//, 'src/').replace(EMITTED, '');
  if (stem === clean) return [clean];
  const flat = clean.startsWith('dist/') ? stem.replace(FORMAT_FOLDER, 'src/') : stem;
  const stems = flat === stem ? [stem] : [stem, flat];
  return [...stems.flatMap(sourcesOf), clean];
}

/** The scanned TypeScript file a manifest target names, tests and other paths dropped. */
function sourceFor(dir: string, target: string, paths: ReadonlySet<string>): string | undefined {
  for (const candidate of candidates(target)) {
    const path = dir === '.' ? candidate : `${dir}/${candidate}`;
    if (paths.has(path) && typescriptKind(path) === 'source') return path;
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

/**
 * Whether a member's manifest publishes it (D75): anything not `private:
 * true`, and a private one that carries `publishConfig`, since apollo-client
 * flips `private` at publish time.
 */
function isPublished(member: Member): boolean {
  return member.manifest['private'] !== true || isRecord(member.manifest['publishConfig']);
}

function targetsOf(value: unknown): readonly string[] {
  const found: string[] = [];
  conditionTargets(value, found);
  return found;
}

/** Every target `exports` offers, across each subpath. */
function exportsTargets(member: Member): readonly string[] {
  const exported = member.manifest['exports'];
  if (!isRecord(exported) || !isSubpathMap(exported)) return targetsOf(exported);
  return Object.values(exported).flatMap((value) => targetsOf(value));
}

/** Every entry point a member's own manifest declares: its `bin`, `main` and `exports` targets (D43). */
function entryTargets(member: Member): readonly string[] {
  const bin = member.manifest['bin'];
  const bins = isRecord(bin) ? Object.values(bin).flatMap((value) => targetsOf(value)) : targetsOf(bin);
  return [...bins, ...targetsOf(member.manifest['main']), ...exportsTargets(member)];
}

/** Every target a member publishes through: each `exports` subpath, `main`, `types` and `module` (D75). */
function publishedTargets(member: Member): readonly string[] {
  return [...exportsTargets(member), ...PUBLISHED_FIELDS.flatMap((field) => targetsOf(member.manifest[field]))];
}

/** The scanned source files `targets` name, a target that maps to none dropped. */
function sourcesFor(member: Member, targets: readonly string[], paths: ReadonlySet<string>): readonly string[] {
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
 * The outside package a specifier no tree file answers imports (D170): the
 * `@scope/name` or `name` a bare specifier opens with, where that names no
 * workspace member and the specifier no Node built-in, `fs` or `node:fs`. A
 * path, a `#` subpath import or a URL names no package.
 */
function outsidePackage(specifier: string, context: Context): string | undefined {
  if (isBuiltin(specifier)) return undefined;
  const parts = specifier.split('/');
  const name = (specifier.startsWith('@') ? parts.slice(0, 2) : parts.slice(0, 1)).join('/');
  if (!PACKAGE_NAME.test(name) || context.members.some((member) => member.name === name)) return undefined;
  return name;
}

function contextOf(tree: Tree): Context {
  const paths = new Set(tree.files);
  return {
    root: tree.root,
    paths,
    members: readMembers(tree, paths),
    host: resolutionHost(tree, paths),
    cache: ts.createModuleResolutionCache(tree.root, (name) => name, RESOLUTION),
  };
}

/** Where a file of the tree, by its repo-relative path, takes an import specifier: a tree file the scan's own rules reach, or nothing. */
export type TreeResolver = (specifier: string, from: string) => string | undefined;

/**
 * The scan's resolution as a function, for the checker's program (D118): a
 * relative specifier the way NodeNext reads it, a workspace package by its
 * manifest, and nothing outside the extraction, so the program holds the
 * in-tree imports and an npm package stays unresolved.
 */
export function treeResolver(dir: string): TreeResolver {
  const context = contextOf(walk(resolve(dir)));
  return (specifier, from) => resolveSpecifier(specifier, from, context);
}

/** A resolved `export * from …`: the file it passes names on from, and the shape it gives them. */
type Passed = { readonly to: string; readonly shape: string };

/**
 * `export * from './x.js'` gives a barrel every name `x` exports, and `x` may
 * be a barrel too. The union is taken to a fixed point, so a cycle of stars
 * settles instead of recursing. A star through an unresolved specifier (an npm
 * package) adds nothing: those names are not knowable from this scan (C2).
 */
function expandStars(
  own: ReadonlyMap<string, readonly string[]>,
  stars: ReadonlyMap<string, readonly Passed[]>,
): ReadonlyMap<string, readonly string[]> {
  const names = new Map([...own].map(([path, list]) => [path, new Set(list)]));
  for (let changed = true; changed; ) {
    changed = false;
    for (const [path, targets] of stars) {
      const here = names.get(path) ?? new Set<string>();
      for (const { to: target } of targets) {
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
 * The file's own shapes, and for each name a star passed on, the shape of the
 * first star that passes it: the binding the barrel declares, not the
 * target's declaration, whose moves show in the target's own file (D76).
 */
function withStars(
  names: readonly string[],
  own: ExportShapes,
  stars: readonly Passed[],
  exports: ReadonlyMap<string, readonly string[]>,
): ExportShapes {
  return Object.fromEntries(
    names.map((name) => {
      if (Object.hasOwn(own, name)) return [name, own[name] ?? null];
      const star = stars.find(({ to }) => exports.get(to)?.includes(name) === true);
      return [name, star?.shape ?? null];
    }),
  );
}

/** One entry point fallow named, with its tag for where it found it: `package.json main`, `vitest`, `manual entry`. */
export type FallowEntry = { readonly path: string; readonly tag: string };

/**
 * fallow's `list --entry-points --format json`: the `path` of every entry, with
 * the `./` segments it leaves in workspace paths collapsed, and its `source`
 * tag kept, since the `package.json` ones are a member's published surface
 * (D75). Pure, so the shape is tested from a string and not from a fallow run
 * (D30).
 */
export function parseFallowEntryPoints(stdout: string): readonly FallowEntry[] {
  const value: unknown = JSON.parse(stdout);
  const listed = isRecord(value) ? value['entry_points'] : undefined;
  if (!Array.isArray(listed)) throw new Error('no entry_points array in the output');
  const entries = new Map<string, FallowEntry>();
  for (const entry of listed) {
    const path = isRecord(entry) ? text(entry['path']) : undefined;
    if (path === undefined) continue;
    const found = { path: normalizePath(path), tag: (isRecord(entry) ? text(entry['source']) : undefined) ?? '' };
    entries.set(`${found.path}\n${found.tag}`, found);
  }
  return [...entries.values()].toSorted((a, b) => byPath(a.path, b.path) || byPath(a.tag, b.tag));
}

function manifestsOnly(reason: string): EntryPoints {
  return { entries: [], lookup: { source: 'manifests', reason } };
}

/**
 * fallow names files by absolute path, and the extraction's is a fresh temp
 * directory every run, so it is cut back to `.` before a reason is recorded
 * (C3). The real path goes first, since it is the longer where `/var` is a
 * link to `/private/var`.
 */
function withinTree(message: string, root: string): string {
  return [realpathSync(root), root].reduce((said, path) => said.split(path).join('.'), message);
}

/** fallow's own account of a failed run: the `message` of the JSON error it prints, else its first line of stderr. */
function fallowSaid(stdout: string | undefined, stderr: string | undefined): string | undefined {
  try {
    const value: unknown = JSON.parse(stdout ?? '');
    const message = isRecord(value) ? text(value['message']) : undefined;
    if (message !== undefined) return message;
  } catch {
    // Not fallow's JSON error, so whatever it said went to stderr.
  }
  return stderr
    ?.split('\n')
    .map((line) => line.trim())
    .find((line) => line !== '');
}

/** Why a run failed, from what `execFileSync` threw, never from its message, which quotes the temp path. */
function runFailure(error: unknown): string {
  const failed = isRecord(error) ? error : {};
  const status = failed['status'];
  const signal = text(failed['signal']);
  if (failed['code'] === 'ETIMEDOUT') return `timed out after ${String(FALLOW_TIMEOUT_MS / 1000)} s`;
  if (typeof status === 'number') {
    const said = fallowSaid(text(failed['stdout']), text(failed['stderr']));
    return said === undefined ? `exited ${String(status)}` : `exited ${String(status)}: ${said}`;
  }
  if (signal !== undefined) return `was stopped by ${signal}`;
  return `could not run: ${text(failed['code']) ?? 'no error code'}`;
}

/**
 * The reviewed repo's own fallow, never the machine's (D22), run as the binary
 * itself: `pnpm exec` would re-lay an npm, yarn or bun tree and narrate over
 * the JSON on stdout. No local fallow, or a run or a parse that fails, leaves
 * the manifests to name the entry points alone, and the lookup says why (C2).
 */
export function fallowEntryPoints(tree: () => string, repo: string): EntryPoints {
  const bin = resolve(repo, FALLOW_BIN);
  if (!existsSync(bin)) return manifestsOnly(`no local fallow at ${FALLOW_BIN}`);
  const root = tree();
  let stdout: string;
  try {
    stdout = execFileSync(bin, ['list', '--entry-points', '--format', 'json', '--root', root], {
      cwd: repo,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: FALLOW_TIMEOUT_MS,
    });
  } catch (error) {
    return manifestsOnly(`fallow list ${withinTree(runFailure(error), root)}`);
  }
  try {
    return { entries: parseFallowEntryPoints(stdout), lookup: { source: 'fallow' } };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return manifestsOnly(`fallow list printed no entry points: ${withinTree(message, root)}`);
  }
}

/** A member's entry points, which depth falls from, and the ones it publishes through (D43, D75). */
type Entries = { readonly entry: string[]; readonly surface: string[] };

/**
 * The entries of each member: its manifest's entry points and every one
 * fallow named (D43), and apart from them its surface, the published targets
 * and fallow's entries tagged from those same fields (D75).
 */
function memberEntries(context: Context, fallow: readonly FallowEntry[]): ReadonlyMap<string, Entries> {
  const dirs = context.members.map((member) => member.dir);
  const found = new Map<string, Entries>(dirs.map((memberDir) => [memberDir, { entry: [], surface: [] }]));
  for (const member of context.members) {
    found.get(member.dir)?.entry.push(...sourcesFor(member, entryTargets(member), context.paths));
    found.get(member.dir)?.surface.push(...sourcesFor(member, publishedTargets(member), context.paths));
  }
  for (const { path, tag } of fallow) {
    if (!context.paths.has(path) || typescriptKind(path) !== 'source') continue;
    // A root package claims every path, so only a repo without one can have an
    // entry point that belongs to no member; it has no manifest to hang on.
    const owner = memberOf(path, dirs);
    const entries = owner === undefined ? undefined : found.get(owner === '' ? '.' : owner);
    entries?.entry.push(path);
    if (PUBLISHED_TAGS.has(tag)) entries?.surface.push(path);
  }
  return found;
}

/**
 * Read the TypeScript files of one commit's tree into the scan's parts (D21,
 * D114): `files` are the ones the producer claims, in path order; the
 * manifests and every other path of `tree` resolve specifiers and name the
 * members. Handed `prior`, a file the diff left alone is not parsed again
 * (D136). `entryPoints` is the reviewed repo's fallow, asked only here.
 */
export function readTypeScript(tree: Tree, files: readonly string[], prior: Prior | undefined, entryPoints: () => EntryPoints): TypeScriptRead {
  const kept = (path: string): ParsedFile | undefined =>
    prior === undefined || prior.touched.has(path) || !Object.hasOwn(prior.parsed, path) ? undefined : prior.parsed[path];
  const claimed = new Set(files);
  // Everything the scan will read, drawn out at once: the manifests and the files it parses again.
  tree.want?.(tree.files.filter((path) => basename(path) === MANIFEST || path === WORKSPACE_FILE || (claimed.has(path) && kept(path) === undefined)));
  const context = contextOf(tree);
  const { members } = context;

  const parsed = new Map<string, ParsedFile>();
  const edges: ScannedEdge[] = [];
  const stars = new Map<string, readonly Passed[]>();
  const packages = new Map<string, readonly string[]>();
  for (const path of files) {
    const file = kept(path) ?? parseSource(path, tree.read(path));
    parsed.set(path, file);
    const outside: string[] = [];
    for (const { specifier, names, line, reexports } of file.references) {
      const to = resolveSpecifier(specifier, path, context);
      if (to === undefined) {
        const name = outsidePackage(specifier, context);
        if (name !== undefined) outside.push(name);
        continue;
      }
      if (to === path) continue;
      edges.push({ from: path, to, names, line, ...(reexports === undefined ? {} : { reexports }) });
    }
    packages.set(path, sorted(outside));
    stars.set(
      path,
      file.stars.flatMap((star) => {
        const to = resolveSpecifier(star.specifier, path, context);
        return to === undefined ? [] : [{ to, shape: star.shape }];
      }),
    );
  }

  const exports = expandStars(
    new Map([...parsed].map(([path, file]) => [path, file.exports])),
    stars,
  );
  const scanned = files.map((path): ScannedFile => {
    const names = exports.get(path) ?? [];
    const kind = typescriptKind(path);
    return {
      path,
      loc: parsed.get(path)?.loc ?? 0,
      kind,
      ...(kind === 'source' && BARREL.test(path) ? { barrel: true } : {}),
      exports: names,
      shapes: withStars(names, parsed.get(path)?.shapes ?? {}, stars.get(path) ?? [], exports),
      inferred: parsed.get(path)?.inferred ?? [],
      code: parsed.get(path)?.code ?? [],
      packages: packages.get(path) ?? [],
      functions: parsed.get(path)?.functions ?? [],
    };
  });
  const fallow = entryPoints();
  const entries = memberEntries(context, fallow.entries);
  const scan: Scan = {
    files: scanned,
    edges: edges.toSorted((a, b) => byPath(a.from, b.from) || a.line - b.line || byPath(a.to, b.to)),
    members: members.map((member) => ({
      name: member.name,
      dir: member.dir,
      entry: sorted(entries.get(member.dir)?.entry ?? []),
      published: isPublished(member),
      surface: sorted(entries.get(member.dir)?.surface ?? []),
    })),
    entry_points: fallow.lookup,
  };
  return { scan, parsed: Object.fromEntries(parsed), entryPoints: fallow };
}
