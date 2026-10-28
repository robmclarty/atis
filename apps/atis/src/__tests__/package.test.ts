import { execFileSync, spawn } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { isBuiltin } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/sdk/types.js';
import { assertMap } from 'core';
import { afterAll, beforeAll, expect, test } from 'vitest';

import { VERSION } from '../index.js';

/**
 * The package as npm installs it (D109). The tarball is made the way
 * `pnpm pack` makes the real one, from a copy of the package's manifest
 * beside a bundle the package's own script writes into the copy. It never
 * reads the `dist/` the `types` slot rewrites under this suite (D132): the
 * bundle reads core, svg and scene through the `source` condition, and a
 * stub stands in for the built web app, as D133's tests use one. The copy
 * links the package's `node_modules`, where pnpm reads the versions
 * `workspace:` resolves to, and its scripts are not run, since `prepack` is
 * the whole workspace build. The tarball is then unpacked beside links to
 * the packages its manifest names and no others, so the bin runs with
 * nothing else in reach. The MCP SDK and zod are devDependencies the bundle
 * inlines, so the manifest still names three packages alone (D179).
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE = join(HERE, '..', '..');
const REPO = join(PACKAGE, '..', '..');
const MINUTE = 60_000;
const STUB = '<!doctype html><title>atis stub</title>\n';

const temps: string[] = [];

const temp = (prefix: string): string => {
  const dir = mkdtempSync(join(tmpdir(), `atis-package-${prefix}-`));
  temps.push(dir);
  return dir;
};

afterAll(() => {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

type Manifest = {
  readonly bin: Readonly<Record<string, string>>;
  readonly exports: Readonly<Record<string, Readonly<Record<string, string>>>>;
  readonly dependencies: Readonly<Record<string, string>>;
};

/** The unpacked tarball: its manifest, the paths it packed, and the directory it was unpacked into. */
type Packed = { readonly manifest: Manifest; readonly files: readonly string[]; readonly root: string };

let packed: Packed;

beforeAll(() => {
  const stage = temp('stage');
  for (const file of ['package.json', 'README.md', 'LICENSE']) cpSync(join(PACKAGE, file), join(stage, file));
  execFileSync(process.execPath, [join(PACKAGE, 'scripts', 'bundle.ts'), '--out', join(stage, 'dist')], { stdio: 'pipe' });
  // A declaration of a test, as tsc writes one beside the bundle, which the manifest's `files` leaves out.
  mkdirSync(join(stage, 'dist', '__tests__'));
  writeFileSync(join(stage, 'dist', '__tests__', 'package.test.d.ts'), 'export {};\n');
  mkdirSync(join(stage, 'web'));
  writeFileSync(join(stage, 'web', 'index.html'), STUB);
  symlinkSync(join(PACKAGE, 'node_modules'), join(stage, 'node_modules'));

  const tarballs = temp('tarball');
  const report = JSON.parse(
    execFileSync('pnpm', ['pack', '--json', '--pack-destination', tarballs, '--config.ignore-scripts=true'], { cwd: stage, encoding: 'utf8' }),
  ) as { readonly filename: string; readonly files: readonly { readonly path: string }[] };

  const unpacked = temp('installed');
  execFileSync('tar', ['-xzf', report.filename, '-C', unpacked]);
  const root = join(unpacked, 'package');
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as Manifest;
  for (const name of Object.keys(manifest.dependencies)) {
    const link = join(root, 'node_modules', name);
    mkdirSync(dirname(link), { recursive: true });
    symlinkSync(realpathSync(join(PACKAGE, 'node_modules', name)), link);
  }
  packed = { manifest, files: report.files.map((file) => file.path).toSorted(), root };
}, MINUTE);

/** The names of the workspace's own packages, which no registry holds. */
const workspacePackages = (): readonly string[] =>
  ['apps', 'libs'].flatMap((group) =>
    readdirSync(join(REPO, group))
      .filter((dir) => existsSync(join(REPO, group, dir, 'package.json')))
      .map((dir) => (JSON.parse(readFileSync(join(REPO, group, dir, 'package.json'), 'utf8')) as { readonly name: string }).name),
  );

/** The bare specifiers the packed scripts import: at the head of each, and late anywhere in one. */
const bareImports = (): readonly string[] => {
  const found = new Set<string>();
  for (const file of packed.files.filter((path) => path.endsWith('.js'))) {
    const text = readFileSync(join(packed.root, file), 'utf8');
    for (const match of text.matchAll(/^(?:import|export)\b[^;]*?\bfrom\s*"([^"]+)";?$|^import\s*"([^"]+)";?$|\bimport\(\s*"([^"]+)"\s*\)/gm)) {
      const specifier = match[1] ?? match[2] ?? match[3];
      if (specifier !== undefined && !specifier.startsWith('.')) found.add(specifier);
    }
  }
  return [...found].toSorted();
};

/** The package a bare specifier loads: its first segment, or its first two under a scope. */
const packageOf = (specifier: string): string => specifier.split('/').slice(0, specifier.startsWith('@') ? 2 : 1).join('/');

/** The path a manifest field names, as the tarball's file list spells it. */
const packedPath = (field: string | undefined): string => (field ?? '').replace(/^\.\//, '');

test('the packed manifest names no workspace package among its dependencies, and the bundle imports nothing it does not name (D109)', () => {
  const workspace = workspacePackages();
  expect(workspace).toEqual(expect.arrayContaining(['core', 'scene', 'svg']));
  for (const [name, range] of Object.entries(packed.manifest.dependencies)) {
    expect(workspace, name).not.toContain(name);
    expect(range, name).not.toMatch(/^workspace:/);
  }
  // The scan's compiler stays a runtime dependency, and the MCP SDK installs nothing beside the three (D179).
  expect(Object.keys(packed.manifest.dependencies).toSorted()).toEqual(['playwright-core', 'typescript', 'ws']);

  const imports = bareImports();
  expect(imports.map(packageOf)).toEqual(expect.arrayContaining(['playwright-core', 'typescript', 'ws']));
  expect(imports.filter((specifier) => !isBuiltin(specifier) && !(packageOf(specifier) in packed.manifest.dependencies))).toEqual([]);
});

test('the tarball carries the bundled bin and library entry, the licenses of what they inline, and the web app beside dist/, and none of the sources (D109, D133)', () => {
  expect(packed.files).toEqual(expect.arrayContaining(['dist/cli.js', 'dist/index.js', 'dist/licenses.md', 'web/index.html', 'README.md', 'LICENSE', 'package.json']));
  expect(packed.files).toContain(packedPath(packed.manifest.bin['atis']));
  expect(packed.files).toContain(packedPath(packed.manifest.exports['.']?.['default']));
  const stray = packed.files.filter((path) => !/^(?:dist|web)\//.test(path) && !['README.md', 'LICENSE', 'package.json'].includes(path));
  expect(stray).toEqual([]);
  expect(packed.files.filter((path) => path.includes('__tests__') || (path.endsWith('.ts') && !path.endsWith('.d.ts')))).toEqual([]);

  // Core reaches d3-force and bubblesets-js, and `atis mcp` the MCP SDK and zod, which ride inside the bundle with their licenses (D179).
  const licenses = readFileSync(join(packed.root, 'dist', 'licenses.md'), 'utf8');
  expect(licenses).toContain('## d3-force');
  expect(licenses).toContain('## bubblesets-js');
  expect(licenses).toContain('## @modelcontextprotocol/sdk');
  expect(licenses).toContain('## zod');
  expect(readFileSync(join(packed.root, 'dist', 'cli.js'), 'utf8')).toMatch(/^#!\/usr\/bin\/env node\n/);
});

/** git in `cwd`, with no author config of the machine running the test. */
const git = (cwd: string, ...args: readonly string[]): string =>
  execFileSync('git', ['-c', 'user.name=atis', '-c', 'user.email=atis@example.invalid', '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8' }).trim();

/** A repository of two commits, the second adding a module that reads the first. */
const twoCommits = (): string => {
  const repo = temp('repo');
  git(repo, 'init', '--quiet', '--initial-branch=main');
  writeFileSync(join(repo, 'package.json'), '{ "name": "demo", "private": true, "type": "module" }\n');
  mkdirSync(join(repo, 'src'));
  writeFileSync(join(repo, 'src', 'shapes.ts'), 'export function area(width: number, height: number): number {\n  return width * height;\n}\n');
  git(repo, 'add', '.');
  git(repo, 'commit', '--quiet', '-m', 'feat: measure an area');
  writeFileSync(join(repo, 'src', 'square.ts'), "import { area } from './shapes.js';\n\nexport function square(side: number): number {\n  return area(side, side);\n}\n");
  git(repo, 'add', '.');
  git(repo, 'commit', '--quiet', '-m', 'feat: square a side');
  return repo;
};

/** The unpacked bin served on loopback: the first line it printed, and a way to interrupt it and read its exit code. */
const served = async (bin: string, repo: string): Promise<{ readonly line: string; readonly stop: () => Promise<number | null> }> => {
  const env = { ...process.env };
  delete env['ATIS_WEB'];
  const child = spawn(process.execPath, [bin, '--repo', repo, '--base', 'HEAD~1', '--no-open'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk: string) => (stderr += chunk));
  const line = await new Promise<string>((printed, failed) => {
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
      if (stdout.includes('\n')) printed(stdout.split('\n')[0] ?? '');
    });
    child.once('exit', (code) => failed(new Error(`the bin exited ${String(code)} before serving: ${stderr}`)));
  });
  const stop = (): Promise<number | null> => {
    const exit = new Promise<number | null>((exited) => child.once('exit', (code) => exited(code)));
    child.kill('SIGINT');
    return exit;
  };
  return { line, stop };
};

test('the unpacked bin runs with only its dependencies installed: it prints its version, writes a map and its SVG, and serves the web app beside dist/ (D109, D133, C4)', async () => {
  const bin = join(packed.root, packedPath(packed.manifest.bin['atis']));
  expect(execFileSync(process.execPath, [bin, '--version'], { encoding: 'utf8' })).toBe(`${VERSION}\n`);

  const repo = twoCommits();
  const out = temp('map');
  execFileSync(process.execPath, [bin, '--repo', repo, '--base', 'HEAD~1', '--out', join(out, 'map.json'), '--svg', join(out, 'atis.svg')], { encoding: 'utf8' });
  const map = assertMap(JSON.parse(readFileSync(join(out, 'map.json'), 'utf8')));
  expect(map.meta.base).toBe('HEAD~1');
  expect(map.weather.changed.map((file) => file.path)).toEqual(['src/square.ts']);
  expect(readFileSync(join(out, 'atis.svg'), 'utf8')).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);

  const { line, stop } = await served(bin, repo);
  const url = /serving at (http:\/\/127\.0\.0\.1:\d+\/\?token=[0-9a-f]{32}) /.exec(line)?.[1];
  expect(url, line).toBeDefined();
  try {
    const page = await fetch(url ?? '');
    expect(page.status).toBe(200);
    expect(await page.text()).toBe(STUB);
  } finally {
    expect(await stop()).toBe(0);
  }
}, 2 * MINUTE);

/** One JSON-RPC message, as MCP's stdio transport writes them: a line each. */
type Message = { readonly id?: number; readonly result?: unknown; readonly error?: unknown };

test("the unpacked bin's atis mcp answers an agent over stdio with only its dependencies installed, and exits 0 when the agent closes it (D110, D179, C4)", async () => {
  const bin = join(packed.root, packedPath(packed.manifest.bin['atis']));
  const map = join(REPO, 'libs', 'core', 'fixtures', 'demo', 'map.json');
  const child = spawn(process.execPath, [bin, 'mcp', '--repo', temp('mcp'), '--map', map], { stdio: ['pipe', 'pipe', 'pipe'] });
  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk: string) => (stderr += chunk));
  const exited = new Promise<number | null>((done) => child.once('exit', (code) => done(code)));
  const answers = new Map<number, (message: Message) => void>();
  let pending = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => {
    pending += chunk;
    const lines = pending.split('\n');
    pending = lines.pop() ?? '';
    for (const line of lines.filter((each) => each.trim() !== '')) {
      const message = JSON.parse(line) as Message;
      if (message.id !== undefined) answers.get(message.id)?.(message);
    }
  });
  const ask = (id: number, method: string, params: unknown): Promise<Message> =>
    new Promise((answered) => {
      answers.set(id, answered);
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
    });

  const hello = await ask(1, 'initialize', { protocolVersion: LATEST_PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: 'atis-package-test', version: '0.0.0' } });
  expect(hello.result).toMatchObject({ serverInfo: { name: 'atis', version: VERSION } });
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
  const listed = (await ask(2, 'tools/list', {})).result as { readonly tools: readonly { readonly name: string }[] };
  expect(listed.tools.map((tool) => tool.name).toSorted()).toEqual(['explain', 'highlight', 'reach']);
  const explained = (await ask(3, 'tools/call', { name: 'explain', arguments: { notice: 1 } })).result as { readonly content: readonly { readonly text: string }[] };
  const [primary] = assertMap(JSON.parse(readFileSync(map, 'utf8'))).notices;
  expect(JSON.parse(explained.content[0]?.text ?? '')).toEqual({ rank: 1, ...primary, source: map });

  child.stdin.end();
  expect(await exited).toBe(0);
  expect(stderr).toBe('');
}, MINUTE);
