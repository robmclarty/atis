/**
 * shell: the shell producer (D117, D114).
 *
 * Each `.sh` or `.bash` script is an organelle in its directory's cell, and
 * each `*.bats` file is a test. Every file is parsed by tree-sitter's bash
 * grammar compiled to WASM, which atis carries (C9), so no shell runs and
 * nothing of the tree executes. The grammar loads once, as this module does.
 *
 * A `source` or `.` line, a bats `load`, and a command that runs a tracked
 * script by its path are the edges. A path a script spells from its own place
 * (`$0`, `${BASH_SOURCE[0]}` or `$BATS_TEST_DIRNAME`, through `dirname`,
 * `cd … && pwd` and the variables that keep them) resolves against that
 * script, and so does `git rev-parse --show-toplevel` against the tree's root.
 * A relative path resolves against the script's directory, then the tree's
 * root, and a path whose start no reading of the file can know resolves by
 * its end, when exactly one tracked script ends that way. A `# shellcheck
 * source=` directive above a `source` line names the path outright. The
 * functions a sourced script defines are its exports, each shaped by its name
 * alone, and a source edge names the ones the sourcing file calls. An
 * executable script nothing sources is an entry point. Past the parser the
 * reading is pure, so it is tested from strings (D30).
 */

import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { CodeSpan, ExportShapes, ScanFunction } from 'core';
import { Language, Parser } from 'web-tree-sitter';
import type { Node } from 'web-tree-sitter';

import type { Scan, ScannedEdge, ScannedFile, Tree } from './scan.js';

/** The extensions the shell producer claims: its scripts, and bats' tests (D117). */
export const SHELL_EXTENSIONS: readonly string[] = ['.sh', '.bash', '.bats'];

const TEST_FILE = /\.bats$/;
/** Where the tree's root stands in a spelled path, so a path a script spells from its own place is told from a real absolute one. */
const ROOT = '/\u0000tree';
/** What a spelled path holds where no reading of the file can know the text: a variable set elsewhere, `$HOME`, a command's output. */
const UNKNOWN = '\u0001';
/** Commands that run the command their later words spell, past their own flags: `exec ./x.sh`, bats' `run ./x.sh`. */
const WRAPPERS: ReadonlySet<string> = new Set(['exec', 'command', 'nohup', 'env', 'sudo', 'time', 'run']);
const WRAPPER_FLAG = /^(?:-|!$|\w+=)/;
/** Shells that run the script their first operand names: `bash deploy.sh`. */
const SHELLS: ReadonlySet<string> = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh', 'mksh']);
/** The variables a script names its own path by, and the one bats names a test's directory by. */
const OWN_PATH: ReadonlySet<string> = new Set(['0', 'BASH_SOURCE', 'BATS_TEST_FILENAME']);
const OWN_DIR = 'BATS_TEST_DIRNAME';
/** `${NAME}`, `${BASH_SOURCE[0]}` and `${0%/*}`: the expansions a path is spelled with. */
const EXPANSION = /^\$\{(\w+)(?:\[[0@*]\])?(%\/\*)?\}$/;
const DIRECTIVE = /^#\s*shellcheck\s.*\bsource=(\S+)/;
const SCRIPT_DIR = 'SCRIPTDIR/';
/** What shellcheck's `source=` names when a line sources nothing worth following. */
const NOTHING = '/dev/null';

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function sorted(values: Iterable<string>): readonly string[] {
  return [...new Set(values)].toSorted(byPath);
}

function dirOf(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash < 0 ? '' : path.slice(0, slash);
}

/** A path of the tree, spelled from its root. */
function anchored(path: string): string {
  return path === '' ? ROOT : `${ROOT}/${path}`;
}

const require = createRequire(import.meta.url);

/** A WASM file the parser loads: the copy beside the bundle (`scripts/bundle.ts` writes it), or the installed package's when atis runs from source. */
function wasm(name: string, installed: () => string): Uint8Array {
  const bundled = join(dirname(fileURLToPath(import.meta.url)), name);
  return readFileSync(existsSync(bundled) ? bundled : installed());
}

/**
 * The bash grammar, loaded as this module loads, since tree-sitter's runtime
 * starts only asynchronously while a producer reads synchronously; or why it
 * did not load, which leaves the shell on the shore (C2).
 */
async function loadBash(): Promise<Language | string> {
  try {
    await Parser.init({ wasmBinary: wasm('web-tree-sitter.wasm', () => require.resolve('web-tree-sitter/web-tree-sitter.wasm')) });
    return await Language.load(wasm('tree-sitter-bash.wasm', () => require.resolve('tree-sitter-bash/tree-sitter-bash.wasm')));
  } catch (error) {
    return `the bash grammar did not load: ${error instanceof Error ? error.message : String(error)}`;
  }
}

const BASH: Language | string = await loadBash();

/** Why the shell producer cannot run here: the grammar it parses with did not load (C2). */
export function shellUnavailable(): string | undefined {
  return typeof BASH === 'string' ? BASH : undefined;
}

/** What a file's words are spelled against: its own path, and the variables it sets, each spelled as it was set. */
type Scope = { readonly path: string; readonly vars: ReadonlyMap<string, string> };

function variable(name: string, scope: Scope): string {
  if (OWN_PATH.has(name)) return anchored(scope.path);
  if (name === OWN_DIR) return anchored(dirOf(scope.path));
  return scope.vars.get(name) ?? UNKNOWN;
}

/** The directory a spelled path stands in, as `dirname` prints it. */
function parentOf(spelled: string): string {
  return spelled === '' || spelled.includes(UNKNOWN) ? UNKNOWN : posix.dirname(spelled);
}

/** The literal name a command node runs, or nothing for one spelled with an expansion. */
function nameOf(command: Node, scope: Scope): string | undefined {
  const name = spell(command.childForFieldName('name'), scope);
  return name.includes(UNKNOWN) || name.startsWith(ROOT) ? undefined : name;
}

/** The first operand of a command, past its flags: `cd -P "$dir"` operates on `$dir`. */
function operand(command: Node, scope: Scope): string {
  const word = command.childrenForFieldName('argument').find((each) => !each.text.startsWith('-'));
  return word === undefined ? UNKNOWN : spell(word, scope);
}

/** A statement without the redirects that wrap it: `cd "$dir" &> /dev/null` prints what `cd "$dir"` does. */
function unwrapped(node: Node): Node {
  return node.type === 'redirected_statement' ? (node.childForFieldName('body') ?? node) : node;
}

/** What a command substitution prints, where it prints a path the file spells: `dirname`, `realpath`, `readlink`, `cd … && pwd`, and git's top level. */
function substituted(node: Node, scope: Scope): string {
  const commands = node.namedChildren.flatMap((child) => (child.type === 'list' ? child.namedChildren : [child])).map(unwrapped);
  const [first, second] = commands;
  if (first?.type !== 'command') return UNKNOWN;
  const name = nameOf(first, scope);
  if (commands.length === 2 && second?.type === 'command' && name === 'cd' && nameOf(second, scope) === 'pwd') return operand(first, scope);
  if (commands.length !== 1) return UNKNOWN;
  if (name === 'dirname') return parentOf(operand(first, scope));
  if (name === 'realpath' || name === 'readlink') return operand(first, scope);
  const words = first.childrenForFieldName('argument').map((word) => word.text);
  return name === 'git' && words.join(' ') === 'rev-parse --show-toplevel' ? ROOT : UNKNOWN;
}

/**
 * A word as the path it spells: its literal text, the script's own path or
 * directory where an expansion names them, and `UNKNOWN` where no reading of
 * the file can know what the shell would put there.
 */
function spell(node: Node | null, scope: Scope): string {
  if (node === null) return UNKNOWN;
  switch (node.type) {
    case 'word':
    case 'number':
      return node.text.startsWith('~') ? UNKNOWN : node.text.replace(/\\(.)/gs, '$1');
    case 'raw_string':
      return node.text.slice(1, -1);
    case 'string_content':
      return node.text.replace(/\\([$`"\\])/g, '$1');
    case 'string':
    case 'concatenation':
    case 'command_name':
      return node.namedChildren.map((child) => spell(child, scope)).join('');
    case 'simple_expansion':
      return variable(node.namedChildren[0]?.text ?? '', scope);
    case 'expansion': {
      const match = EXPANSION.exec(node.text);
      if (match === null) return UNKNOWN;
      const value = variable(match[1] ?? '', scope);
      return match[2] === undefined ? value : parentOf(value);
    }
    case 'command_substitution':
      return substituted(node, scope);
    default:
      return UNKNOWN;
  }
}

/** Every variable a file sets, spelled as it set it, the last setting standing. */
function variablesOf(root: Node, path: string): ReadonlyMap<string, string> {
  const vars = new Map<string, string>();
  for (const assignment of root.descendantsOfType('variable_assignment')) {
    const name = assignment.childForFieldName('name')?.text;
    if (name === undefined) continue;
    const value = assignment.childForFieldName('value');
    vars.set(name, value === null ? '' : spell(value, { path, vars }));
  }
  return vars;
}

/** A path a file sources, loads or runs, as it spelled it, at the line it does so. */
type Use = { readonly how: 'source' | 'load' | 'run'; readonly spelled: string; readonly line: number };

/** What one command sources, loads or runs, through any wrapper, and the name it calls when that is a plain word. */
function useOf(command: Node, scope: Scope, test: boolean, directive: (line: number) => string | undefined): { readonly use?: Use; readonly call?: string } {
  const line = command.startPosition.row + 1;
  let words = [command.childForFieldName('name'), ...command.childrenForFieldName('argument')].filter((word) => word !== null);
  while (words.length > 0) {
    const [head = null, ...rest] = words;
    const name = spell(head, scope);
    const [first] = rest;
    if (name === 'source' || name === '.') {
      const said = directive(line);
      if (said === NOTHING || (said === undefined && first === undefined)) return {};
      const spelled = said === undefined ? spell(first ?? null, scope) : said.startsWith(SCRIPT_DIR) ? `${anchored(dirOf(scope.path))}/${said.slice(SCRIPT_DIR.length)}` : said;
      return { use: { how: 'source', spelled, line } };
    }
    if (name === 'load' && test) return first === undefined ? {} : { use: { how: 'load', spelled: spell(first, scope), line } };
    if (WRAPPERS.has(name)) {
      const at = rest.findIndex((word) => !WRAPPER_FLAG.test(word.text));
      words = at < 0 ? [] : rest.slice(at);
      continue;
    }
    if (SHELLS.has(name)) {
      if (rest.some((word) => word.text === '-c')) return {};
      const script = rest.find((word) => !word.text.startsWith('-'));
      return script === undefined ? {} : { use: { how: 'run', spelled: spell(script, scope), line } };
    }
    if (name.includes('/')) return { use: { how: 'run', spelled: name, line } };
    return name.includes(UNKNOWN) ? {} : { call: name };
  }
  return {};
}

/** The line a node's last character stands on. */
function lastLine(node: Node): number {
  const { startPosition: start, endPosition: end } = node;
  return end.column === 0 && end.row > start.row ? end.row : end.row + 1;
}

/** One file of the tree as the producer reads it: its path, its text, and whether its mode lets it run. */
export type ShellSource = { readonly path: string; readonly text: string; readonly executable: boolean };

/** What one file says: its functions, the names it calls, its statements' lines, and the paths it sources, loads and runs. */
type Read = {
  readonly source: ShellSource;
  readonly test: boolean;
  readonly functions: readonly ScanFunction[];
  readonly calls: ReadonlySet<string>;
  readonly code: readonly CodeSpan[];
  readonly uses: readonly Use[];
};

function read(parser: Parser, source: ShellSource): Read {
  const parsed = parser.parse(source.text);
  if (parsed === null) throw new Error(`the bash grammar read nothing of ${source.path}`);
  try {
    const root = parsed.rootNode;
    const test = TEST_FILE.test(source.path);
    const scope: Scope = { path: source.path, vars: variablesOf(root, source.path) };
    const comments = new Map(root.descendantsOfType('comment').map((comment) => [comment.startPosition.row + 1, comment.text] as const));
    // A shellcheck directive governs the command beneath its comment block.
    const directive = (line: number): string | undefined => {
      for (let above = line - 1; comments.has(above); above -= 1) {
        const said = DIRECTIVE.exec(comments.get(above) ?? '');
        if (said !== null) return said[1];
      }
      return undefined;
    };
    const uses: Use[] = [];
    const calls = new Set<string>();
    for (const command of root.descendantsOfType('command')) {
      const { use, call } = useOf(command, scope, test, directive);
      if (use !== undefined) uses.push(use);
      if (call !== undefined) calls.add(call);
    }
    const functions = root.descendantsOfType('function_definition').flatMap((definition): ScanFunction[] => {
      const name = definition.childForFieldName('name')?.text;
      const line = definition.startPosition.row + 1;
      return name === undefined ? [] : [{ name, line, line_count: lastLine(definition) - line + 1 }];
    });
    const code = root.namedChildren.filter((node) => node.type !== 'comment').map((node): CodeSpan => ({ start: node.startPosition.row + 1, end: lastLine(node) }));
    return { source, test, functions, calls, code, uses };
  } finally {
    parsed.delete();
  }
}

/** Every tracked script whose path ends with `tail`, a `/` and at least one segment. */
function endingWith(scripts: readonly string[], tail: string): readonly string[] {
  return scripts.filter((path) => `/${path}`.endsWith(tail));
}

/**
 * The tracked script a use names, or nothing. A bats `load` tries the name
 * with `.bash` first and resolves against the test's directory alone, as bats
 * does; a relative path to source or run, against the script's directory and
 * then the tree's root; and a path that opens with what no reading can know,
 * by its end when exactly one script ends that way.
 */
function resolved(use: Use, from: string, scripts: ReadonlySet<string>, listed: readonly string[]): string | undefined {
  const candidates = (spelled: string): readonly string[] => (use.how === 'load' ? [`${spelled}.bash`, spelled] : [spelled]);
  const inTree = (spelled: string): string | undefined => {
    const normal = posix.normalize(spelled);
    const path = normal.startsWith(`${ROOT}/`) ? normal.slice(ROOT.length + 1) : undefined;
    return path !== undefined && scripts.has(path) ? path : undefined;
  };
  const { spelled } = use;
  if (spelled.includes(UNKNOWN)) {
    const tail = spelled.slice(spelled.lastIndexOf(UNKNOWN) + 1);
    if (!tail.startsWith('/') || tail.split('/').some((segment) => segment === '..' || segment === '.') || tail.endsWith('/')) return undefined;
    for (const each of candidates(tail)) {
      const [only, ...more] = endingWith(listed, each);
      if (only !== undefined && more.length === 0) return only;
    }
    return undefined;
  }
  if (spelled === '' || (spelled.startsWith('/') && !spelled.startsWith(ROOT))) return undefined;
  const bases = spelled.startsWith(ROOT) ? [''] : use.how === 'load' ? [anchored(dirOf(from))] : [anchored(dirOf(from)), ROOT];
  for (const base of bases) {
    for (const each of candidates(base === '' ? spelled : `${base}/${spelled}`)) {
      const path = inTree(each);
      if (path !== undefined) return path;
    }
  }
  return undefined;
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
 * One commit's shell as the scan's parts (D117, D114): every script and test
 * with its kind, its functions and its statements' lines, a sourced script's
 * functions as its exports; an edge for each script a file sources, loads or
 * runs, a source edge naming the functions it calls there; and the executable
 * scripts nothing sources as the entry points of one member at the root.
 * Pure past the parser, so it is tested from strings (D30).
 */
export function shellScan(sources: readonly ShellSource[]): Scan {
  if (typeof BASH === 'string') throw new Error(BASH);
  const parser = new Parser();
  let reads: readonly Read[];
  try {
    parser.setLanguage(BASH);
    reads = sources.map((source) => read(parser, source));
  } finally {
    parser.delete();
  }
  const listed = reads.filter((each) => !each.test).map((each) => each.source.path);
  const scripts = new Set(listed);
  const functionsOf = new Map(reads.map((each) => [each.source.path, each.functions.map((fn) => fn.name)] as const));

  const edges: Gathered = new Map();
  const sourced = new Set<string>();
  for (const each of reads) {
    const from = each.source.path;
    for (const use of each.uses) {
      const to = resolved(use, from, scripts, listed);
      if (to === undefined || to === from) continue;
      if (use.how === 'run') {
        gather(edges, from, to, [], use.line);
        continue;
      }
      sourced.add(to);
      gather(edges, from, to, (functionsOf.get(to) ?? []).filter((name) => each.calls.has(name)), use.line);
    }
  }

  const files: ScannedFile[] = reads.map(({ source, test, functions, code }) => {
    const exports = test || !sourced.has(source.path) ? [] : sorted(functions.map((fn) => fn.name));
    const shapes: ExportShapes = Object.fromEntries(exports.map((name) => [name, `${name}()`]));
    return {
      path: source.path,
      loc: source.text.split('\n').filter((line) => line.trim() !== '').length,
      kind: test ? 'test' : 'source',
      exports,
      shapes,
      inferred: [],
      code,
      packages: [],
      functions: functions.toSorted((a, b) => a.line - b.line || byPath(a.name, b.name)),
    };
  });
  const entry = sorted(reads.filter(({ source, test }) => !test && source.executable && !sourced.has(source.path)).map(({ source }) => source.path));
  return {
    files: files.toSorted((a, b) => byPath(a.path, b.path)),
    edges: [...edges.values()]
      .map(({ from, to, names, line }): ScannedEdge => ({ from, to, names: sorted(names), line }))
      .toSorted((a, b) => byPath(a.from, b.from) || a.line - b.line || byPath(a.to, b.to)),
    members: listed.length === 0 ? [] : [{ name: '.', dir: '.', entry, published: false, surface: [] }],
    entry_points: { source: 'manifests', reason: 'the executable scripts nothing sources are the entry points' },
  };
}

/** Read the shell scripts and bats tests of one commit's tree (D117): `files` are the ones the producer claims. */
export function readShell(tree: Tree, files: readonly string[]): Scan {
  tree.want?.(files);
  return shellScan(files.map((path) => ({ path, text: tree.read(path), executable: tree.executable(path) })));
}
