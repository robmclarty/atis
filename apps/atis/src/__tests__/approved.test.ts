import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { approvedOf, assertApproved, assertMap } from 'core';
import type { MapJson } from 'core';
import { afterAll, expect, test } from 'vitest';

import { holdToApproved, keepApproved } from '../approved.js';
import { approveRun, run } from '../run.js';
import type { Options } from '../run.js';

/**
 * `atis approve` and the approved shape every map build reads
 * (D212 (approved-private)), driven in this process against small temp
 * repositories: the document kept under the git directory with the moment it
 * was approved (D320 (approved-time)), the block each map carries after, a
 * shape approved from the working tree, a map over another base saying what
 * was left out (D308 (same-terrain)), and a document that will not read
 * (D321 (approved-unreadable)). The command through the `bin` is in
 * `cli.test.ts`.
 */
const temps: string[] = [];

const temp = (prefix: string): string => {
  const dir = mkdtempSync(join(tmpdir(), `atis-approved-${prefix}-`));
  temps.push(dir);
  return dir;
};

afterAll(() => {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

/** git in `cwd`, with no author config of the machine running the test. */
const git = (cwd: string, ...args: readonly string[]): string =>
  execFileSync('git', ['-c', 'user.name=atis', '-c', 'user.email=atis@example.invalid', '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8' }).trim();

const write = (root: string, path: string, text: string): void => {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
};

/** A small package on `main`, its one commit tagged `v1`: a module with a barrel, `src/shapes`, under the package's own. */
const shapesRepo = (prefix: string): string => {
  const repo = join(temp(prefix), 'repo');
  mkdirSync(repo);
  git(repo, 'init', '--quiet', '--initial-branch=main');
  write(repo, 'package.json', '{ "name": "demo", "private": true, "type": "module", "dependencies": { "kleur": "^4.0.0" } }\n');
  write(repo, 'src/index.ts', "export { area } from './shapes/index.js';\n");
  write(repo, 'src/shapes/index.ts', "export { area } from './area.js';\n");
  write(repo, 'src/shapes/area.ts', 'export function area(width: number, height: number): number {\n  return width * height;\n}\n');
  git(repo, 'add', '.');
  git(repo, 'commit', '--quiet', '-m', 'feat: measure an area');
  git(repo, 'tag', 'v1');
  return repo;
};

/** Three edits that stage nothing: a new module that imports an outside package, and a name more on the barrel of one that stood. */
const paint = (repo: string): void => {
  write(repo, 'src/paint/colour.ts', "import kleur from 'kleur';\n\nexport const red = (text: string): string => kleur.red(text);\n");
  write(repo, 'src/shapes/square.ts', "import { area } from './area.js';\n\nexport const square = (side: number): number => area(side, side);\n");
  write(repo, 'src/shapes/index.ts', "export { area } from './area.js';\nexport { square } from './square.js';\n");
};

/** What `paint` departs by, from a shape approved before it, in the order the map's guard holds the list to. */
const PAINTED = [
  { kind: 'dependency-added', target: 'kleur', why: 'an outside package the approved shape did not import' },
  { kind: 'module-added', target: 'src/paint', cell: 'directory:src/paint', why: 'a module the approved shape did not hold', now: 1 },
  { kind: 'interface-widened', target: 'src/shapes', cell: 'folder:src/shapes', why: 'its interface exports more names than approved', was: 1, now: 2, names: ['square'] },
];

/** The map a file run writes for `repo`, held to the map's guard as the page holds it, and what the run printed on stderr. */
const mapped = (repo: string, asked: Partial<Options> = {}): { readonly map: MapJson; readonly stderr: string } => {
  const out = join(temp('map'), 'map.json');
  const outcome = run({ repo, out, verbose: false, ...asked });
  expect(outcome.exitCode, outcome.stderr).toBe(0);
  return { map: assertMap(JSON.parse(readFileSync(out, 'utf8'))), stderr: outcome.stderr };
};

const keptAt = (repo: string): string => join(repo, '.git', 'atis', 'approved.json');

const NOON = new Date('2026-11-20T12:00:00.000Z');

/** A test that builds several maps is given a minute: each build is a second or two alone and many times that beside the rest of the suite, on a machine under load. */
const MINUTE = 60_000;

test('atis approve keeps the shape of the head under the git directory, with the moment it was approved, and --show prints it as kept (D212 (approved-private), D320 (approved-time))', () => {
  const repo = shapesRepo('keep');
  const head = git(repo, 'rev-parse', 'HEAD');

  // Before anything is approved: nothing to show, said in the words the panels write, and a map with no block.
  expect(approveRun({ repo, show: true, verbose: false })).toEqual({ exitCode: 0, stdout: '', stderr: 'atis: no approved shape yet: run atis approve\n' });
  const { map: before, stderr } = mapped(repo);
  expect('approved' in before).toBe(false);
  expect(stderr).toBe('');

  const approved = approveRun({ repo, verbose: false, now: NOON });
  expect(approved).toEqual({ exitCode: 0, stdout: `approved the shape at ${head.slice(0, 7)}: 2 modules, 0 outside packages, wrote .git/atis/approved.json\n`, stderr: '' });

  // Core's document of the map those flags draw, with the moment after the commits it names.
  const text = readFileSync(keptAt(repo), 'utf8');
  const kept = JSON.parse(text) as Readonly<Record<string, unknown>>;
  expect(Object.keys(kept)).toEqual(['schema_version', 'kind', 'approved_at', 'over', 'approved_on', 'modules', 'dependencies']);
  expect(kept['approved_on']).toBe('2026-11-20T12:00:00.000Z');
  expect(text).toBe(`${JSON.stringify(kept, null, 2)}\n`);
  const doc = assertApproved(kept);
  expect([doc.approved_at, doc.over]).toEqual([head, head]);
  expect(doc.modules.map((module) => `${module.kind}:${module.path}`)).toEqual(['package:.', 'folder:src/shapes']);
  expect(kept).toEqual({ ...approvedOf(before), approved_on: '2026-11-20T12:00:00.000Z' });

  // Nothing landed in the working tree, and the write left no temp file beside the document.
  expect(git(repo, 'status', '--porcelain', '--untracked-files=all')).toBe('');
  expect(readdirSync(join(repo, '.git', 'atis')).filter((name) => name.includes('approved'))).toEqual(['approved.json']);

  expect(approveRun({ repo, show: true, verbose: false })).toEqual({ exitCode: 0, stdout: text, stderr: '' });

  // One map gives one document: approved again later, only the moment moved.
  expect(approveRun({ repo, verbose: false, now: new Date('2026-11-21T08:30:00.000Z') }).exitCode).toBe(0);
  expect(JSON.parse(readFileSync(keptAt(repo), 'utf8'))).toEqual({ ...kept, approved_on: '2026-11-21T08:30:00.000Z' });

  // --verbose times the write beside the sources.
  expect(approveRun({ repo, verbose: true }).stderr).toMatch(/approve\s+\d+ ms/);
}, MINUTE);

test('every map built after an approval carries its departures: none while the shape is kept, then what a change added, at a working tree, a commit and the whole repository', () => {
  const repo = shapesRepo('held');
  const head = git(repo, 'rev-parse', 'HEAD');
  expect(approveRun({ repo, verbose: false }).exitCode).toBe(0);

  // Kept: a block with no departure, which is not the same as no block.
  const kept = mapped(repo);
  expect(kept.map.approved).toEqual({ at: head, departures: [] });
  expect(kept.stderr).toBe('');

  // The working tree, over the commit the shape was approved at.
  paint(repo);
  const working = mapped(repo, { base: 'HEAD', head: { workingTree: true }, verbose: true });
  expect(working.map.approved).toEqual({ at: head, departures: PAINTED });
  expect(working.stderr).toMatch(/approved\s+\d+ ms/);
  expect(working.stderr).not.toContain('atis:');

  // Committed, the head is its own terrain, as the approved one was: the same departures, from the commit and from the whole repository.
  git(repo, 'add', '.');
  git(repo, 'commit', '--quiet', '-m', 'feat: paint a shape');
  for (const asked of [{}, { wholeRepo: true }]) {
    const { map, stderr } = mapped(repo, asked);
    expect(map.meta.head).toBe(git(repo, 'rev-parse', 'HEAD'));
    expect(map.approved).toEqual({ at: head, departures: PAINTED });
    expect(stderr).toBe('');
  }

  // Approving the new head accepts them.
  expect(approveRun({ repo, verbose: false }).stdout).toMatch(/^approved the shape at [0-9a-f]{7}: 3 modules, 1 outside package, wrote /);
  expect(mapped(repo).map.approved).toEqual({ at: git(repo, 'rev-parse', 'HEAD'), departures: [] });
}, MINUTE);

test('a shape approved from the working tree names it in words, and a map of that tree keeps it (D210 (approved-block))', () => {
  const repo = shapesRepo('working');
  const head = git(repo, 'rev-parse', 'HEAD');
  paint(repo);
  const status = git(repo, 'status', '--porcelain', '--untracked-files=all');

  const approved = approveRun({ repo, base: 'HEAD', head: { workingTree: true }, verbose: false, now: NOON });
  expect(approved).toEqual({ exitCode: 0, stdout: `approved the shape of the working tree over ${head.slice(0, 7)}: 3 modules, 1 outside package, wrote .git/atis/approved.json\n`, stderr: '' });
  const doc = assertApproved(JSON.parse(readFileSync(keptAt(repo), 'utf8')));
  expect([doc.approved_at, doc.over]).toEqual(['working-tree', head]);
  // Approving staged nothing and wrote nothing the tree holds.
  expect(git(repo, 'status', '--porcelain', '--untracked-files=all')).toBe(status);

  // `at` is the map's own word for the head, which the panels write as `since approved working tree`.
  const { map, stderr } = mapped(repo, { base: 'HEAD', head: { workingTree: true } });
  expect(map.approved).toEqual({ at: 'working-tree', departures: [] });
  expect(stderr).toBe('');

  // The commit under it holds no `src/paint` yet: the one module the approved tree held and this terrain does not. Nothing is told for what only shrank.
  expect(mapped(repo, { base: 'HEAD' }).map.approved).toEqual({
    at: 'working-tree',
    departures: [{ kind: 'module-removed', target: 'src/paint', cell: 'directory:src/paint', why: 'a module the approved shape held', was: 1 }],
  });
}, MINUTE);

test('a map over another base than the shape was approved over says what was left out, once on stderr, and a map over the same base says nothing (D308 (same-terrain))', () => {
  const repo = shapesRepo('over');
  paint(repo);
  git(repo, 'add', '.');
  git(repo, 'commit', '--quiet', '-m', 'feat: paint a shape');
  const [base, head] = [git(repo, 'rev-parse', 'v1'), git(repo, 'rev-parse', 'HEAD')];

  const approved = approveRun({ repo, base: 'v1', verbose: false });
  expect(approved.stdout).toBe(`approved the shape at ${head.slice(0, 7)} over ${base.slice(0, 7)}: 3 modules, 1 outside package, wrote .git/atis/approved.json\n`);

  const same = mapped(repo, { base: 'v1' });
  expect(same.map.approved).toEqual({ at: head, departures: [] });
  expect(same.stderr).toBe('');

  // The head as its own terrain shares none with a shape cut over `v1`: the block is still written, and the line says what it could not.
  const note = `atis: the approved shape was cut over ${base.slice(0, 7)} and this map over ${head.slice(0, 7)}, so lines, fan out and interfaces with no barrel were not compared; run atis approve with this map's flags to compare them\n`;
  const other = mapped(repo, { base: 'HEAD' });
  expect(other.map.approved).toEqual({ at: head, departures: [] });
  expect(other.stderr).toBe(note);
  expect(mapped(repo, { wholeRepo: true }).stderr).toBe(note);
  // Under --verbose the line comes ahead of the timings.
  expect(mapped(repo, { base: 'HEAD', verbose: true }).stderr.startsWith(`${note}  terrain cache `)).toBe(true);
}, MINUTE);

test('a kept shape that will not read mutes the departures and says why, never as a map that keeps its shape, and approving again repairs it (D321 (approved-unreadable))', () => {
  const repo = shapesRepo('unread');
  mkdirSync(dirname(keptAt(repo)), { recursive: true });

  for (const [text, reason] of [
    ['approved\n', 'it is not JSON'],
    ['{ "schema_version": 2, "kind": "atis.approved" }\n', 'invalid approved shape at $.schema_version: expected 1'],
    ['{ "schema_version": 1, "kind": "atis.approved", "approved_at": "working-tree", "modules": [{ "path": "" }] }\n', 'invalid approved shape at $.modules[0].path: expected a module path'],
  ] as const) {
    writeFileSync(keptAt(repo), text);
    const { map, stderr } = mapped(repo);
    expect('approved' in map).toBe(false);
    expect(stderr).toBe(`atis: the approved shape at ${keptAt(repo)} could not be read (${reason}), so this map tells no departures; run atis approve to write it again\n`);
    // There is no document to print, and a script must not take the broken text for one.
    expect(approveRun({ repo, show: true, verbose: false })).toEqual({ exitCode: 2, stdout: '', stderr: `atis: the approved shape at ${keptAt(repo)} could not be read (${reason}); run atis approve to write it again\n` });
  }

  expect(approveRun({ repo, verbose: false }).exitCode).toBe(0);
  const { map, stderr } = mapped(repo);
  expect(map.approved).toEqual({ at: git(repo, 'rev-parse', 'HEAD'), departures: [] });
  expect(stderr).toBe('');
}, MINUTE);

test('a block the map\'s guard would refuse is left off the map and said so, since the page drops a map it refuses (D322 (approved-guarded))', () => {
  const repo = shapesRepo('guard');
  const { map } = mapped(repo);
  keepApproved(repo, map, NOON);

  // As core writes it, the block passes the guard and nothing is said.
  const held = holdToApproved(repo, map);
  expect(held.notes).toEqual([]);
  expect(held.map.approved).toEqual({ at: map.meta.head, departures: [] });

  // A block that names no head is one the guard refuses.
  const refused = holdToApproved(repo, map, (given) => ({ ...given, approved: { at: '', departures: [] } }));
  expect(refused.map).toBe(map);
  expect(refused.notes).toEqual(['the departures from the approved shape were left off this map, since its guard refuses them: invalid map at approved.at: expected the head the shape was approved at']);
  expect(refused.read).toBe(true);
});

test('every worktree of a repository holds to the one approved shape, and none keeps it in its working tree (D212 (approved-private))', () => {
  const repo = shapesRepo('linked');
  const head = git(repo, 'rev-parse', 'HEAD');
  const linked = join(temp('linked-tree'), 'tree');
  git(repo, 'worktree', 'add', '--quiet', '-b', 'other', linked);

  // Approved from the linked worktree, the document lands in the shared git directory, named whole since it is outside that tree.
  const approved = approveRun({ repo: linked, base: 'main', verbose: false });
  expect(approved.exitCode, approved.stderr).toBe(0);
  const shared = resolve(linked, git(linked, 'rev-parse', '--git-common-dir'));
  expect(approved.stdout.endsWith(`, wrote ${join(shared, 'atis', 'approved.json')}\n`)).toBe(true);
  expect(assertApproved(JSON.parse(readFileSync(keptAt(repo), 'utf8'))).approved_at).toBe(head);
  expect(git(linked, 'status', '--porcelain', '--untracked-files=all')).toBe('');

  expect(mapped(repo).map.approved).toEqual({ at: head, departures: [] });
  expect(mapped(linked, { base: 'main' }).map.approved).toEqual({ at: head, departures: [] });
}, MINUTE);

test('atis approve in a directory that is no repository exits 2 and keeps nothing (C4)', () => {
  const directory = temp('bare');
  for (const show of [false, true]) {
    const outcome = approveRun({ repo: directory, show, verbose: false });
    expect(outcome.exitCode).toBe(2);
    expect(outcome.stdout).toBe('');
    expect(outcome.stderr.startsWith('atis: ')).toBe(true);
  }
  expect(readdirSync(directory)).toEqual([]);
});

test('the demo map, which no repository approved, is handed back as it was by a repository that keeps no shape', () => {
  const demo = assertMap(JSON.parse(readFileSync(fileURLToPath(new URL('../../../../libs/core/fixtures/demo/map.json', import.meta.url)), 'utf8')));
  const held = holdToApproved(shapesRepo('none'), demo);
  expect(held).toEqual({ map: demo, notes: [], read: false });
  expect(held.map).toBe(demo);
});
