/**
 * terraform: the Terraform producer (D116, D114).
 *
 * A directory of `.tf` files is a module, so core draws it as a directory
 * cell with each file an organelle. Each file is read by an HCL parser atis
 * carries (C9), HashiCorp's own HCL library compiled to JavaScript, so neither
 * `terraform` nor `terraform init` is needed and nothing of the tree runs.
 * Each file is also walked for where its top-level blocks start and end,
 * which the parser does not say.
 *
 * A module's `variable` and `output` blocks are its interface, exported as
 * `var.<name>` and `output.<name>`, each shaped by its type and default (D76).
 * A `module` block with a local `source` is an edge from its file to every
 * file of the module it calls, which it reads whole. A file that reads a
 * called module's output reaches the file declaring it, and a file reaches
 * the file of its own module declaring each `var`, `local`, `module`, `data`
 * or resource it names. A root module, one no other module calls, is an entry
 * point, and a `*.tftest.hcl` file is a test of the module it sits in or
 * beside. Registry and git module sources and provider version constraints
 * are the module's dependencies: each file records them as outside packages
 * (D170), and `readTerraformDependencies` diffs them into the dependency delta
 * the way `readManifests` diffs a `package.json` (D47, D83). The reading is
 * pure, so it is tested from strings (D30).
 */

import { posix } from 'node:path';

import type { CodeSpan, DepAdded, DepMoved, ExportShapes } from 'core';
import hcl from 'hcl2-parser';

import { showFile } from './git.js';
import type { ManifestDelta } from './git.js';
import type { Scan, ScannedEdge, ScannedFile, Tree } from './scan.js';

/** The extensions the Terraform producer claims: its configuration, and its test files (D116). */
export const TERRAFORM_EXTENSIONS: readonly string[] = ['.tf', '.tftest.hcl'];

/** The name a module call takes of the module it calls: the whole of it, as a namespace import does. */
const STAR = '*';
const TEST_FILE = /\.tftest\.hcl$/;
const TF_FILE = /\.tf$/;
/** A provider named with no `source` is HashiCorp's, as Terraform reads it. */
const DEFAULT_NAMESPACE = 'hashicorp';

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

/** The bodies of a block the parser lists under a key, every repeat of it: `variable.x` is a list of one body. */
function bodies(value: unknown): readonly Readonly<Record<string, unknown>>[] {
  return Array.isArray(value) ? value.filter(isRecord) : isRecord(value) ? [value] : [];
}

/** Each label of a labelled block kind, with its first body: `{ x: [{…}] }` to `[['x', {…}]]`. */
function labelled(value: unknown): readonly (readonly [string, Readonly<Record<string, unknown>>])[] {
  if (!isRecord(value)) return [];
  return Object.keys(value)
    .toSorted(byPath)
    .flatMap((label) => {
      const [body] = bodies(value[label]);
      return body === undefined ? [] : [[label, body] as const];
    });
}

/** A top-level block of a file: its kind, its labels, and the lines it runs from and to. */
export type TerraformBlock = { readonly kind: string; readonly labels: readonly string[]; readonly start: number; readonly end: number };

const HEADER = /^\s*([A-Za-z_][\w-]*)((?:\s+(?:"[^"]*"|[A-Za-z_][\w-]*))*)\s*$/;

function labelsOf(header: string): readonly string[] {
  return [...header.matchAll(/"([^"]*)"|([A-Za-z_][\w-]*)/g)].map((match) => match[1] ?? match[2] ?? '');
}

/**
 * Where each top-level block of an HCL file starts and ends, by line. Braces
 * are counted outside strings, comments and heredocs; a string's `${…}` is
 * counted as the code it holds, so a quote inside it does not end the string.
 * Pure, so it is tested from strings (D30).
 */
export function terraformBlocks(source: string): readonly TerraformBlock[] {
  const blocks: TerraformBlock[] = [];
  const lines = source.split('\n');
  /** What the scanner is inside: code at some brace depth, a string, or a string's `${…}`. */
  const modes: ('code' | 'string' | 'interp')[] = ['code'];
  let depth = 0;
  let heredoc: string | undefined;
  let comment = false;
  let open: { kind: string; labels: readonly string[]; start: number } | undefined;
  for (const [index, line] of lines.entries()) {
    const number = index + 1;
    if (heredoc !== undefined) {
      if (line.trim() === heredoc) heredoc = undefined;
      continue;
    }
    for (let at = 0; at < line.length; at += 1) {
      const char = line[at];
      const mode = modes.at(-1);
      if (comment) {
        if (char === '*' && line[at + 1] === '/') {
          comment = false;
          at += 1;
        }
        continue;
      }
      if (mode === 'string') {
        if (char === '\\') at += 1;
        else if (char === '"') modes.pop();
        else if (char === '$' && line[at + 1] === '{') {
          modes.push('interp');
          at += 1;
        }
        continue;
      }
      if (char === '#' || (char === '/' && line[at + 1] === '/')) break;
      if (char === '/' && line[at + 1] === '*') {
        comment = true;
        at += 1;
      } else if (char === '"') modes.push('string');
      else if (char === '<' && line[at + 1] === '<') {
        const tag = /^<<-?([A-Za-z_]\w*)/.exec(line.slice(at));
        if (tag !== null) {
          heredoc = tag[1];
          break;
        }
      } else if (char === '{') {
        if (mode === 'interp') modes.push('interp');
        else {
          if (depth === 0) {
            const header = HEADER.exec(line.slice(0, at));
            open = header === null ? undefined : { kind: header[1] ?? '', labels: labelsOf(header[2] ?? ''), start: number };
          }
          depth += 1;
        }
      } else if (char === '}') {
        if (mode === 'interp') modes.pop();
        else {
          depth = Math.max(depth - 1, 0);
          if (depth === 0 && open !== undefined) {
            blocks.push({ ...open, end: number });
            open = undefined;
          }
        }
      }
    }
  }
  return blocks;
}

/** The parser's one call: `[object, null]` for a file it reads, `[null, error]` for one it cannot. The package declares no types of its own. */
type HclParser = { readonly parseToObject: (input: string) => unknown };

function isParser(value: unknown): value is HclParser {
  return isRecord(value) && typeof value['parseToObject'] === 'function';
}

/** A file's HCL as the parser reads it, or `undefined` for one it cannot. */
function parsed(source: string): Readonly<Record<string, unknown>> | undefined {
  if (!isParser(hcl)) return undefined;
  try {
    const result = hcl.parseToObject(source);
    const [body] = Array.isArray(result) ? result : [];
    return isRecord(body) ? body : undefined;
  } catch {
    return undefined;
  }
}

/** An HCL expression the parser wrote as `${…}`, bare. */
function expression(value: unknown): string | undefined {
  const written = text(value);
  if (written === undefined) return undefined;
  const bare = /^\$\{([\s\S]*)\}$/.exec(written);
  return (bare?.[1] ?? written).replace(/\s+/g, ' ').trim();
}

/** `type = list(string), default = ["a"]`: what a variable's readers depend on (D76, D116). */
function variableShape(name: string, body: Readonly<Record<string, unknown>>): string {
  const type = expression(body['type']);
  const parts = [
    ...(type === undefined ? [] : [`type = ${type}`]),
    ...(Object.hasOwn(body, 'default') ? [`default = ${JSON.stringify(body['default'])}`] : []),
    ...(body['sensitive'] === true ? ['sensitive = true'] : []),
  ];
  return `variable "${name}"${parts.length === 0 ? '' : ` { ${parts.join(', ')} }`}`;
}

function outputShape(name: string, body: Readonly<Record<string, unknown>>): string {
  return `output "${name}"${body['sensitive'] === true ? ' { sensitive = true }' : ''}`;
}

/** What one module's dependency is named and pinned by: the source without its `git::` or query, and its `version` or `ref`. */
type Dependency = { readonly name: string; readonly range: string };

function isLocal(source: string): boolean {
  return source.startsWith('./') || source.startsWith('../');
}

/** A non-local module source as a dependency: a registry address with its `version`, or a git or archive address with its `ref`. */
function moduleDependency(source: string, version: string | undefined): Dependency {
  const bare = source.replace(/^git::/, '');
  const query = bare.indexOf('?');
  const ref = query < 0 ? undefined : new URLSearchParams(bare.slice(query + 1)).get('ref');
  return { name: query < 0 ? bare : bare.slice(0, query), range: version ?? ref ?? '' };
}

/**
 * The dependencies an HCL body declares: each non-local module source, and
 * each provider `required_providers` pins, `aws = "~> 5.0"` naming
 * `hashicorp/aws` as Terraform does.
 */
function dependenciesOf(body: Readonly<Record<string, unknown>>): readonly Dependency[] {
  const modules = labelled(body['module']).flatMap(([, block]) => {
    const source = text(block['source']);
    return source === undefined || isLocal(source) ? [] : [moduleDependency(source, text(block['version']))];
  });
  const providers = bodies(body['terraform']).flatMap((block) =>
    bodies(block['required_providers']).flatMap((required) =>
      Object.keys(required)
        .toSorted(byPath)
        .map((local) => {
          const value = required[local];
          if (typeof value === 'string') return { name: `${DEFAULT_NAMESPACE}/${local}`, range: value };
          const pinned = isRecord(value) ? value : {};
          return { name: text(pinned['source']) ?? `${DEFAULT_NAMESPACE}/${local}`, range: text(pinned['version']) ?? '' };
        }),
    ),
  );
  return [...modules, ...providers];
}

/** One file of the tree as the producer reads it. */
export type TerraformSource = { readonly path: string; readonly text: string };

/** What one file says: its blocks, its parsed body, and the names it declares by its module's way of naming them. */
type Read = {
  readonly path: string;
  readonly text: string;
  readonly blocks: readonly TerraformBlock[];
  readonly body: Readonly<Record<string, unknown>> | undefined;
  readonly declared: readonly string[];
};

/** The names a file declares for its own module to read: `var.x`, `output.x`, `local.x`, `module.x`, `data.t.n` and `t.n`. */
function declaredBy(blocks: readonly TerraformBlock[], body: Readonly<Record<string, unknown>> | undefined): readonly string[] {
  const named = blocks.flatMap(({ kind, labels }) => {
    const [first, second] = labels;
    if (kind === 'variable' && first !== undefined) return [`var.${first}`];
    if (kind === 'output' && first !== undefined) return [`output.${first}`];
    if (kind === 'module' && first !== undefined) return [`module.${first}`];
    if (kind === 'data' && first !== undefined && second !== undefined) return [`data.${first}.${second}`];
    if (kind === 'resource' && first !== undefined && second !== undefined) return [`${first}.${second}`];
    return [];
  });
  const locals = bodies(body?.['locals']).flatMap((block) => Object.keys(block).map((key) => `local.${key}`));
  return sorted([...named, ...locals]);
}

/** The names a file reads, each at the line it is first read, comments left out. */
function referencesIn(source: string): ReadonlyMap<string, number> {
  const found = new Map<string, number>();
  const pattern = /\b(?:(var|local|module)\.([A-Za-z_][\w-]*)(?:\.([A-Za-z_][\w-]*))?|data\.([A-Za-z_][\w-]*)\.([A-Za-z_][\w-]*)|([a-z][a-z0-9]*_[\w-]+)\.([A-Za-z_][\w-]*))/g;
  for (const [index, raw] of source.split('\n').entries()) {
    const line = raw.replace(/^\s*(?:#|\/\/).*$/, '');
    for (const match of line.matchAll(pattern)) {
      const [, scope, name, attribute, dataType, dataName, type, resource] = match;
      const names =
        scope === 'module' && name !== undefined
          ? [`module.${name}`, ...(attribute === undefined ? [] : [`module.${name}.${attribute}`])]
          : scope !== undefined && name !== undefined
            ? [`${scope}.${name}`]
            : dataType !== undefined && dataName !== undefined
              ? [`data.${dataType}.${dataName}`]
              : type !== undefined && resource !== undefined
                ? [`${type}.${resource}`]
                : [];
      for (const each of names) if (!found.has(each)) found.set(each, index + 1);
    }
  }
  return found;
}

/** A local module source from `dir`, as the directory it names, or nothing for one that leaves the tree. */
function calledDir(dir: string, source: string): string | undefined {
  const joined = posix.normalize(posix.join(dir === '' ? '.' : dir, source));
  if (joined === '..' || joined.startsWith('../')) return undefined;
  return joined === '.' ? '' : joined.replace(/\/$/, '');
}

function dirOf(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash < 0 ? '' : path.slice(0, slash);
}

/** Edges gathered by their two ends, so a file reaches another once, its names together. */
type Gathered = Map<string, { from: string; to: string; names: Set<string>; line: number }>;

function gather(edges: Gathered, from: string, to: string, names: readonly string[], line: number): void {
  if (from === to) return;
  const key = `${from}\n${to}`;
  const edge = edges.get(key) ?? { from, to, names: new Set<string>(), line };
  for (const name of names) edge.names.add(name);
  edge.line = Math.min(edge.line, line);
  edges.set(key, edge);
}

/**
 * One commit's Terraform as the scan's parts (D116, D114): every file with
 * its kind, its interface and their shapes, its blocks as its code and its
 * dependencies as its outside packages; an edge for each module call, each
 * output it reads and each name of its own module it reads; and the root
 * modules as the entry points of one member at the root. Pure, so it is
 * tested from strings (D30).
 */
export function terraformScan(sources: readonly TerraformSource[]): Scan {
  const reads: readonly Read[] = sources.map(({ path, text: source }) => {
    const blocks = terraformBlocks(source);
    const body = parsed(source);
    return { path, text: source, blocks, body, declared: declaredBy(blocks, body) };
  });
  const modules = new Map<string, Read[]>();
  for (const read of reads) {
    if (!TF_FILE.test(read.path)) continue;
    const dir = dirOf(read.path);
    modules.set(dir, [...(modules.get(dir) ?? []), read]);
  }
  const declaring = (dir: string, name: string): string | undefined => modules.get(dir)?.find((read) => read.declared.includes(name))?.path;

  const edges: Gathered = new Map();
  const called = new Set<string>();
  for (const read of reads.filter((each) => TF_FILE.test(each.path))) {
    const dir = dirOf(read.path);
    const calls = new Map<string, string>();
    for (const [label, block] of labelled(read.body?.['module'])) {
      const source = text(block['source']);
      const callee = source === undefined || !isLocal(source) ? undefined : calledDir(dir, source);
      if (callee === undefined || !modules.has(callee) || callee === dir) continue;
      called.add(callee);
      calls.set(label, callee);
      const line = read.blocks.find((each) => each.kind === 'module' && each.labels[0] === label)?.start ?? 1;
      for (const file of modules.get(callee) ?? []) gather(edges, read.path, file.path, [STAR], line);
    }
    // The module blocks of the whole module, so a file reading another file's module's output reaches the callee.
    const calleeOf = (label: string): string | undefined => {
      if (calls.has(label)) return calls.get(label);
      const owner = modules.get(dir)?.find((each) => each.declared.includes(`module.${label}`));
      const source = text(labelled(owner?.body?.['module']).find(([name]) => name === label)?.[1]['source']);
      return source === undefined || !isLocal(source) ? undefined : calledDir(dir, source);
    };
    for (const [name, line] of referencesIn(read.text)) {
      const output = /^module\.([^.]+)\.(.+)$/.exec(name);
      if (output !== null) {
        const callee = calleeOf(output[1] ?? '');
        const to = callee === undefined ? undefined : declaring(callee, `output.${output[2] ?? ''}`);
        if (to !== undefined && !(edges.get(`${read.path}\n${to}`)?.names.has(STAR) ?? false)) gather(edges, read.path, to, [`output.${output[2] ?? ''}`], line);
        continue;
      }
      const to = declaring(dir, name);
      if (to !== undefined) gather(edges, read.path, to, [name], line);
    }
  }
  for (const read of reads.filter((each) => TEST_FILE.test(each.path))) {
    const dir = dirOf(read.path);
    const tested = modules.has(dir) ? dir : posix.basename(dir) === 'tests' && modules.has(dirOf(dir)) ? dirOf(dir) : undefined;
    if (tested === undefined) continue;
    const first = read.blocks.find((block) => block.kind === 'run')?.start ?? 1;
    for (const file of modules.get(tested) ?? []) gather(edges, read.path, file.path, [STAR], first);
    for (const [label, run] of labelled(read.body?.['run'])) {
      const source = bodies(run['module']).map((block) => text(block['source'])).find((each) => each !== undefined);
      const callee = source === undefined || !isLocal(source) ? undefined : calledDir(tested, source);
      const line = read.blocks.find((block) => block.kind === 'run' && block.labels[0] === label)?.start ?? first;
      for (const file of callee === undefined ? [] : (modules.get(callee) ?? [])) gather(edges, read.path, file.path, [STAR], line);
    }
  }

  const files: ScannedFile[] = reads.map((read) => {
    const test = TEST_FILE.test(read.path);
    const variables = labelled(read.body?.['variable']).map(([name, block]) => [`var.${name}`, variableShape(name, block)] as const);
    const outputs = labelled(read.body?.['output']).map(([name, block]) => [`output.${name}`, outputShape(name, block)] as const);
    // A file the parser cannot read still declares the blocks its walk found, each shape uncompared (C2).
    const exports = test ? [] : read.declared.filter((name) => name.startsWith('var.') || name.startsWith('output.'));
    const shaped = new Map<string, string>([...variables, ...outputs]);
    const shapes: ExportShapes = Object.fromEntries(exports.map((name) => [name, shaped.get(name) ?? null]));
    const code: readonly CodeSpan[] = read.blocks.map((block) => ({ start: block.start, end: block.end }));
    return {
      path: read.path,
      loc: read.text.split('\n').filter((line) => line.trim() !== '').length,
      kind: test ? 'test' : 'source',
      exports,
      shapes,
      inferred: [],
      code,
      packages: test || read.body === undefined ? [] : sorted(dependenciesOf(read.body).map((dependency) => dependency.name)),
      functions: [],
    };
  });
  const roots = [...modules.keys()].filter((dir) => !called.has(dir)).toSorted(byPath);
  return {
    files: files.toSorted((a, b) => byPath(a.path, b.path)),
    edges: [...edges.values()]
      .map(({ from, to, names, line }): ScannedEdge => ({ from, to, names: sorted(names), line }))
      .toSorted((a, b) => byPath(a.from, b.from) || a.line - b.line || byPath(a.to, b.to)),
    members:
      modules.size === 0
        ? []
        : [{ name: '.', dir: '.', entry: sorted(roots.flatMap((dir) => (modules.get(dir) ?? []).map((read) => read.path))), published: false, surface: [] }],
    entry_points: { source: 'manifests', reason: 'the root modules, which no module calls, are the entry points' },
  };
}

/** Read the Terraform files of one commit's tree (D116): `files` are the ones the producer claims. */
export function readTerraform(tree: Tree, files: readonly string[]): Scan {
  tree.want?.(files);
  return terraformScan(files.map((path) => ({ path, text: tree.read(path) })));
}

/**
 * Two texts of one `.tf` file (either may be absent, a file born or removed)
 * to the dependencies the head added and the ones whose version it moved
 * (D47, D83), as `diffManifests` reads a `package.json`. A file the parser
 * cannot read declares nothing (C2). Pure, so it is tested from strings (D30).
 */
export function diffTerraform(path: string, before: string | undefined, after: string | undefined): ManifestDelta {
  const declared = (source: string | undefined): ReadonlyMap<string, string> => {
    const body = source === undefined ? undefined : parsed(source);
    const found = new Map<string, string>();
    for (const { name, range } of body === undefined ? [] : dependenciesOf(body)) if (!found.has(name)) found.set(name, range);
    return found;
  };
  const [was, now] = [declared(before), declared(after)];
  const added: DepAdded[] = [];
  const moved: DepMoved[] = [];
  for (const [name, range] of now) {
    const old = was.get(name);
    if (old === undefined) added.push({ manifest: path, name, range, dev: false });
    else if (old !== range) moved.push({ manifest: path, name, range, from: old, dev: false });
  }
  return { deps_added: added.toSorted((a, b) => byPath(a.name, b.name)), deps_moved: moved.toSorted((a, b) => byPath(a.name, b.name)) };
}

/**
 * Every `.tf` file the diff touched, read at `mergeBase` and at the head
 * (D46) and diffed into the dependency delta (D47, D83), each by the file
 * that declares it. `touched` holds every path the diff named, a rename's old
 * path among them.
 */
export function readTerraformDependencies(repo: string, mergeBase: string, touched: readonly string[], head: string): ManifestDelta {
  const deltas = sorted(touched.filter((path) => TF_FILE.test(path))).map((path) => diffTerraform(path, showFile(repo, mergeBase, path), showFile(repo, head, path)));
  return { deps_added: deltas.flatMap((delta) => delta.deps_added), deps_moved: deltas.flatMap((delta) => delta.deps_moved) };
}
