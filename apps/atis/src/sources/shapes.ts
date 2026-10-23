/**
 * shapes: the checker's print of an export whose type the scan could only
 * infer (D118).
 *
 * The scan prints each exported declaration from its file alone (D76), and a
 * name whose type is inferred cannot be printed that way: `isolatedDeclarations`
 * flags it, and it reads as not compared. Three in five of the top-three
 * interface notices on the refreshed retake maps came from such names, on
 * edits that may not have changed a type. So the names the scan flagged, in
 * the changed interface files only, are printed once more by the type checker,
 * over a program of the tree's own imports and the bundled default library,
 * and compared like any other shape.
 *
 * An extracted tree has no `node_modules`, so a type from an npm package is
 * the checker's error type, which prints as `any` on both sides and would
 * compare equal while the type behind it changed. A name whose checked type
 * reaches an unresolved symbol, or one the checker's declaration emit cannot
 * name, stays not compared (C2).
 */

import { dirname, join, relative, resolve, sep } from 'node:path';

import { findPublicNames, identifyModules } from 'core';
import type { DiffFile, ExportShapes } from 'core';
import ts from 'typescript';

import { declaredShapes, treeResolver } from './imports.js';
import type { Scan, ScannedFile, TreeResolver } from './imports.js';

/**
 * The checker's settings, the same on both sides of a change so a printed
 * type compares with its twin: strict, as a type a reviewer reads is, with
 * the bundled default library and no `@types` package, which an extraction
 * does not hold anyway.
 */
const OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.Latest,
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  strict: true,
  declaration: true,
  emitDeclarationOnly: true,
  skipLibCheck: true,
  allowJs: false,
  types: [],
};

/**
 * How many types the walk for an unresolved symbol visits before it gives up.
 * A walk that runs out has not proved the type resolved, so the name stays
 * not compared rather than read as unchanged (C2).
 */
const WALK_BUDGET = 4_000;

/** The declaration file extensions, longest first, so `.d.mts` is never read as `.mts`. */
const EXTENSIONS: readonly (readonly [string, ts.Extension])[] = [
  ['.d.mts', ts.Extension.Dmts],
  ['.d.cts', ts.Extension.Dcts],
  ['.d.ts', ts.Extension.Dts],
  ['.mts', ts.Extension.Mts],
  ['.cts', ts.Extension.Cts],
  ['.tsx', ts.Extension.Tsx],
  ['.ts', ts.Extension.Ts],
];

/** Where the bundled default library lives: its files are the same for every program, whichever tree it reads. */
const LIBRARY = dirname(ts.getDefaultLibFilePath(OPTIONS));

/**
 * The default library's files, parsed once per process. The two sides of a
 * change are two programs over one library, and parsing it is most of what a
 * program costs, so each later program takes the parsed files as the language
 * service's document registry would. Only the library is held: a tree's own
 * files belong to its one program.
 */
const parsedLibrary = new Map<string, ts.SourceFile>();

/** The paths to hand the checker on each side of the change. */
export type ShapePaths = { readonly base: ReadonlySet<string>; readonly head: ReadonlySet<string> };

/**
 * The files a reader enters a cell through (its barrel, its one file, or what
 * another cell imports) and the files a published member exposes names from:
 * the interface files core raises interface notices on (D45, D75, D76).
 */
function interfaceFiles(scan: Scan): ReadonlySet<string> {
  const modules = identifyModules(
    scan.files,
    scan.edges,
    scan.members.map((member) => member.dir),
  );
  return new Set([...modules.cells.flatMap((cell) => cell.interface_files), ...findPublicNames([scan]).keys()]);
}

/**
 * The changed files whose inferred names the checker prints, on each side by
 * that side's path: a file the change kept, under its base path at the base
 * and its head path at head, where either side reads it as an interface file
 * (D118). An added file has no base side to compare with and a deleted one no
 * head side, so neither is worth a checker's time.
 */
export function shapePaths(diff: readonly DiffFile[], base: Scan, head: Scan): ShapePaths {
  const atBase = interfaceFiles(base);
  const atHead = interfaceFiles(head);
  const kept = diff.filter((file) => file.kind === 'modified' || file.kind === 'renamed');
  const pairs = kept
    .map((file) => ({ base: file.from ?? file.path, head: file.path }))
    .filter((pair) => atBase.has(pair.base) || atHead.has(pair.head));
  return { base: new Set(pairs.map((pair) => pair.base)), head: new Set(pairs.map((pair) => pair.head)) };
}

function extensionOf(path: string): ts.Extension | undefined {
  return EXTENSIONS.find(([suffix]) => path.endsWith(suffix))?.[1];
}

/** A compiler host whose module resolution is the scan's own, so the program is the tree's files and the default library alone. */
function treeHost(root: string, resolveIn: TreeResolver): ts.CompilerHost {
  const host = ts.createCompilerHost(OPTIONS, true);
  const inTree = (name: string): string | undefined => {
    const path = relative(root, name);
    return path.startsWith('..') ? undefined : path.split(sep).join('/');
  };
  return {
    ...host,
    getSourceFile: (fileName, languageVersion, onError, shouldCreate) => {
      if (!fileName.startsWith(LIBRARY)) return host.getSourceFile(fileName, languageVersion, onError, shouldCreate);
      const cached = parsedLibrary.get(fileName);
      if (cached !== undefined) return cached;
      const parsed = host.getSourceFile(fileName, languageVersion, onError, shouldCreate);
      if (parsed !== undefined) parsedLibrary.set(fileName, parsed);
      return parsed;
    },
    getCurrentDirectory: () => root,
    resolveModuleNameLiterals: (literals, containingFile) => {
      const from = inTree(containingFile);
      return literals.map((literal) => {
        const to = from === undefined ? undefined : resolveIn(literal.text, from);
        const extension = to === undefined ? undefined : extensionOf(to);
        return {
          resolvedModule:
            to === undefined || extension === undefined
              ? undefined
              : { resolvedFileName: join(root, to), extension, isExternalLibraryImport: false },
        };
      });
    },
    resolveTypeReferenceDirectiveReferences: (references) => references.map(() => ({ resolvedTypeReferenceDirective: undefined })),
  };
}

/** Whether a type carries a flag: the checker's own test, which the predicates below narrow on. */
function carries(type: ts.Type, flag: ts.TypeFlags): boolean {
  return (type.flags & flag) !== 0;
}

function isObject(type: ts.Type): type is ts.ObjectType {
  return carries(type, ts.TypeFlags.Object);
}

function isReference(type: ts.Type): type is ts.TypeReference {
  return isObject(type) && (type.objectFlags & ts.ObjectFlags.Reference) !== 0;
}

function isIndexedAccess(type: ts.Type): type is ts.IndexedAccessType {
  return carries(type, ts.TypeFlags.IndexedAccess);
}

function isIndex(type: ts.Type): type is ts.IndexType {
  return carries(type, ts.TypeFlags.Index);
}

function isConditional(type: ts.Type): type is ts.ConditionalType {
  return carries(type, ts.TypeFlags.Conditional);
}

function isSubstitution(type: ts.Type): type is ts.SubstitutionType {
  return carries(type, ts.TypeFlags.Substitution);
}

function isTemplateLiteral(type: ts.Type): type is ts.TemplateLiteralType {
  return carries(type, ts.TypeFlags.TemplateLiteral);
}

function isStringMapping(type: ts.Type): type is ts.StringMappingType {
  return carries(type, ts.TypeFlags.StringMapping);
}

/** A type the default library declares (`Array`, `Promise`, `Map`): its own members are the library's, and only its arguments are the tree's. */
function fromLibrary(type: ts.Type, program: ts.Program): boolean {
  const declarations = type.getSymbol()?.getDeclarations() ?? [];
  return declarations.length > 0 && declarations.every((declaration) => program.isSourceFileDefaultLibrary(declaration.getSourceFile()));
}

/** The types one type is made of, as far as the public API exposes them. */
function partsOf(type: ts.Type, checker: ts.TypeChecker, program: ts.Program): readonly ts.Type[] {
  const parts: ts.Type[] = [...(type.aliasTypeArguments ?? [])];
  if (type.isUnionOrIntersection()) parts.push(...type.types);
  if (type.isTypeParameter()) parts.push(...[type.getConstraint(), type.getDefault()].filter((part) => part !== undefined));
  if (isIndexedAccess(type)) parts.push(type.objectType, type.indexType);
  if (isIndex(type)) parts.push(type.type);
  if (isConditional(type)) parts.push(type.checkType, type.extendsType);
  if (isSubstitution(type)) parts.push(type.baseType, type.constraint);
  if (isTemplateLiteral(type)) parts.push(...type.types);
  if (isStringMapping(type)) parts.push(type.type);
  if (!isObject(type)) return parts;
  if (isReference(type)) parts.push(...checker.getTypeArguments(type));
  if (fromLibrary(type, program)) return parts;
  for (const property of checker.getPropertiesOfType(type)) parts.push(checker.getTypeOfSymbol(property));
  for (const kind of [ts.SignatureKind.Call, ts.SignatureKind.Construct]) {
    for (const signature of checker.getSignaturesOfType(type, kind)) {
      parts.push(...signature.getParameters().map((parameter) => checker.getTypeOfSymbol(parameter)), signature.getReturnType());
      parts.push(...(signature.getTypeParameters() ?? []));
    }
  }
  for (const info of checker.getIndexInfosOfType(type)) parts.push(info.keyType, info.type);
  return parts;
}

/**
 * Whether a type reaches a symbol the program could not resolve. The checker
 * types such a symbol with its error type, an `any` that is not the `any` a
 * declaration writes, so any `any` but that one marks it. A walk past its
 * budget has proved nothing, and answers yes (C2).
 */
function reachesUnresolved(start: readonly ts.Type[], checker: ts.TypeChecker, program: ts.Program): boolean {
  const written = checker.getAnyType();
  const seen = new Set<ts.Type>();
  const pending = [...start];
  for (let type = pending.pop(); type !== undefined; type = pending.pop()) {
    if (seen.has(type)) continue;
    if (seen.size >= WALK_BUDGET) return true;
    seen.add(type);
    if (carries(type, ts.TypeFlags.Any) && type !== written) return true;
    pending.push(...partsOf(type, checker, program));
  }
  return false;
}

/** The symbol a module exports under `name`, past any alias to the declaration that gives it its type. */
function exportedSymbol(source: ts.SourceFile, name: string, checker: ts.TypeChecker): ts.Symbol | undefined {
  const module = checker.getSymbolAtLocation(source);
  const symbol = module === undefined ? undefined : checker.getExportsOfModule(module).find((found) => found.getName() === name);
  if (symbol === undefined) return undefined;
  return (symbol.flags & ts.SymbolFlags.Alias) === 0 ? symbol : checker.getAliasedSymbol(symbol);
}

/** The types a name stands for: its value's type, and a class's instance type beside its constructor's (D118's member-by-member read). */
function typesOf(symbol: ts.Symbol, checker: ts.TypeChecker): readonly ts.Type[] {
  const value = checker.getTypeOfSymbol(symbol);
  return (symbol.flags & ts.SymbolFlags.Class) === 0 ? [value] : [value, checker.getDeclaredTypeOfSymbol(symbol)];
}

/** Whether a diagnostic falls inside one of a symbol's declarations. */
function within(diagnostics: readonly ts.Diagnostic[], symbol: ts.Symbol, source: ts.SourceFile): boolean {
  const declarations = (symbol.getDeclarations() ?? []).filter((declaration) => declaration.getSourceFile() === source);
  return declarations.some((declaration) =>
    diagnostics.some(({ start }) => start !== undefined && start >= declaration.getStart(source) && start <= declaration.end),
  );
}

/** The checker's declaration emit of one file, held in memory. */
function emitted(program: ts.Program, source: ts.SourceFile): ts.SourceFile | undefined {
  let text: string | undefined;
  let name = '';
  program.emit(
    source,
    (fileName, data) => {
      name = fileName;
      text = data;
    },
    undefined,
    true,
  );
  return text === undefined ? undefined : ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

/** The checked shape of each inferred name of one file, `null` where the checker could not name it or it reaches an unresolved symbol. */
function checkedShapes(file: ScannedFile, root: string, program: ts.Program): ExportShapes {
  const source = program.getSourceFile(join(root, file.path));
  if (source === undefined) return {};
  const checker = program.getTypeChecker();
  const declarations = emitted(program, source);
  const printed = declarations === undefined ? {} : declaredShapes(declarations, file.inferred);
  const unnameable = program.getDeclarationDiagnostics(source);
  return Object.fromEntries(
    file.inferred.map((name) => {
      const symbol = exportedSymbol(source, name, checker);
      const shape = printed[name] ?? null;
      if (symbol === undefined || shape === null) return [name, null];
      if (within(unnameable, symbol, source) || reachesUnresolved(typesOf(symbol, checker), checker, program)) return [name, null];
      return [name, shape];
    }),
  );
}

/**
 * The scan with each inferred name of `paths` printed by the checker (D118).
 * Only those files are the program's roots, and only their in-tree imports
 * and the default library join them. A name the checker cannot print, or
 * whose type reaches an unresolved symbol, stays `null` (C2); every other
 * name keeps the shape the scan printed from its file alone.
 */
export function checkInferredShapes(dir: string, scan: Scan, paths: ReadonlySet<string>): Scan {
  const root = resolve(dir);
  const roots = scan.files.filter((file) => paths.has(file.path) && file.inferred.length > 0);
  if (roots.length === 0) return scan;
  const program = ts.createProgram({
    rootNames: roots.map((file) => join(root, file.path)),
    options: OPTIONS,
    host: treeHost(root, treeResolver(root)),
  });
  const checked = new Map(roots.map((file) => [file.path, checkedShapes(file, root, program)] as const));
  return {
    ...scan,
    files: scan.files.map((file) => {
      const shapes = checked.get(file.path);
      return shapes === undefined ? file : { ...file, shapes: { ...file.shapes, ...shapes } };
    }),
  };
}
