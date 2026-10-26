import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson } from 'core';
import { afterAll, expect, test } from 'vitest';

import { codeKey, readStructure, structurePath, writeStructure } from '../cache.js';
import type { MeasuredStructure, StructureKey } from '../cache.js';
import { run } from '../run.js';
import { NO_LOCAL_FALLOW, localFallow, measureStructure, parseDead, parseDupes, parseHealth, structureOf } from '../sources/index.js';
import type { FallowRun } from '../sources/index.js';

/**
 * The reviewed repo's own fallow on both extractions (D22, D98): its three
 * reports read by `.check/`'s own parsers, a run that wrote none muted by
 * name, the side kept per commit beside the terrain (D136), and the version
 * that measured each side in `meta.instruments`. Every report here is
 * captured fallow output, the `.check/` fixtures fallow 3.22 and 3.35 wrote,
 * and the binary is a stub that prints them, so no test runs a real fallow.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const CAPTURED = join(HERE, '..', '..', 'fixtures', 'check');
const MINUTE = 60_000;
const SHA = 'a'.repeat(40);
const OTHER_SHA = 'b'.repeat(40);

const captured = (name: string): string => readFileSync(join(CAPTURED, name), 'utf8');
/** A run that exited `status` having printed `stdout`; fallow exits 1 on findings, so 1 is a report like 0. */
const printed = (stdout: string, status = 0, stderr = ''): FallowRun => ({ status, stdout, stderr });
const RUNS = { health: printed(captured('health.json'), 1), dupes: printed(captured('dupes.json')), dead: printed(captured('dead-findings.json'), 1) };

const workspaces: string[] = [];

afterAll(() => {
  for (const dir of workspaces) rmSync(dir, { recursive: true, force: true });
});

function temp(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), `atis-fallow-${prefix}-`));
  workspaces.push(dir);
  return dir;
}

function write(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

test('three captured reports read through the parsers .check/ uses, with the version that wrote them (D98)', () => {
  const structure = structureOf(RUNS);

  expect(structure).toEqual({
    fallow: '3.22.0',
    health: parseHealth(captured('health.json'))?.value,
    dupes: parseDupes(captured('dupes.json'))?.value,
    dead: parseDead(captured('dead-findings.json'))?.value,
    muted: [],
  });
  // What the parsers read is what the side holds: the one function over its threshold, and the cycles kept whole.
  expect('health' in structure ? structure.health?.findings : undefined).toEqual([{ path: 'src/gate.ts', exceeded: 'cyclomatic', line: 42, line_count: 95 }]);
  expect('dead' in structure ? structure.dead?.circular_dependencies : undefined).toHaveLength(3);
  // The envelope names the report's kind and the fallow that wrote it.
  expect(parseHealth(captured('health.json'))).toMatchObject({ kind: 'health', version: '3.22.0', schema_version: 9 });
  expect(parseDead(captured('dead-findings.json'))).toMatchObject({ kind: 'dead-code', version: '3.35.0', schema_version: 10 });
});

test('a report fallow could not write mutes its analysis by name, the extraction cut out of what it said (C2, C3)', () => {
  const tree = '/private/var/folders/xy/T/atis-tree-1/tree';
  const error = JSON.stringify({ error: true, message: `invalid root path '${tree}': No such file or directory (os error 2)`, exit_code: 2 });
  const structure = structureOf(
    {
      ...RUNS,
      // fallow's own JSON error, on stdout.
      dupes: printed(error, 2),
      // No JSON at all, so what it said went to stderr; and a run that never finished.
      dead: printed('', 101, `\n  thread 'main' panicked at ${tree}/src/a.ts\nnote: run with RUST_BACKTRACE=1\n`),
    },
    [tree, '/var/folders/xy/T/atis-tree-1/tree'],
  );

  expect(structure).toMatchObject({ fallow: '3.22.0', health: expect.anything() as unknown });
  expect('muted' in structure ? structure.muted : undefined).toEqual([
    "dupes: exited 2: invalid root path '.': No such file or directory (os error 2)",
    "dead: exited 101: thread 'main' panicked at ./src/a.ts",
  ]);
  expect(structure).not.toHaveProperty('dupes');
  expect(structure).not.toHaveProperty('dead');

  // A report of another kind is no report of this one: fallow's error envelope parses as a health of nothing.
  expect(structureOf({ ...RUNS, health: printed(captured('dupes.json')) })).toMatchObject({ muted: ['health: exited 0 with no health report'] });
  expect(structureOf({ ...RUNS, health: printed(error, 2) })).not.toHaveProperty('health');
});

test('a side no report came back for is the reasons alone, never a clean measure (C2)', () => {
  expect(
    structureOf({ health: { reason: 'timed out after 60 s' }, dupes: { reason: 'was stopped by SIGKILL' }, dead: printed('', 2, 'error: no such command\n') }),
  ).toEqual({ reason: 'health: timed out after 60 s; dupes: was stopped by SIGKILL; dead: exited 2: error: no such command' });

  // Reports with no version cannot say which fallow measured the side.
  const unversioned = (text: string): FallowRun => {
    const { version: _version, ...rest } = JSON.parse(text) as Record<string, unknown>;
    return printed(JSON.stringify(rest));
  };
  expect(
    structureOf({ health: unversioned(captured('health.json')), dupes: unversioned(captured('dupes.json')), dead: { reason: 'timed out after 60 s' } }),
  ).toEqual({ reason: 'dead: timed out after 60 s; no report named the fallow version that wrote it' });
});

/** Where a stub fallow logs each call it takes: its working directory and its arguments, one line each. */
function stubFallow(repo: string, version = '3.22.0'): string {
  const log = join(temp('log'), 'calls.txt');
  const bin = join(repo, 'node_modules', '.bin', 'fallow');
  write(join(repo, 'node_modules', 'fallow', 'package.json'), `${JSON.stringify({ name: 'fallow', version })}\n`);
  write(
    bin,
    [
      '#!/bin/sh',
      `echo "$PWD $*" >> '${log}'`,
      'case "$1" in',
      `  health) cat '${join(CAPTURED, 'health.json')}'; exit 1 ;;`,
      `  dupes) cat '${join(CAPTURED, 'dupes.json')}' ;;`,
      `  dead-code) cat '${join(CAPTURED, 'dead.json')}' ;;`,
      `  *) echo '{"error":true,"message":"unknown command","exit_code":2}'; exit 2 ;;`,
      'esac',
      '',
    ].join('\n'),
  );
  chmodSync(bin, 0o755);
  writeFileSync(log, '');
  return log;
}

/** The analyses the stub ran, each as its working directory and arguments; the scan's own `list --entry-points` is not one (D43). */
const calls = (log: string): readonly string[] =>
  readFileSync(log, 'utf8')
    .split('\n')
    .filter((line) => / (?:health|dupes|dead-code) /.test(line));

test('the repo’s own fallow runs each analysis on the extraction, as checkride runs it (D22)', () => {
  const repo = temp('local');
  expect(localFallow(repo)).toBeUndefined();

  const log = stubFallow(repo);
  const fallow = localFallow(repo);
  expect(fallow).toEqual({ bin: join(repo, 'node_modules', '.bin', 'fallow'), version: '3.22.0' });

  const tree = temp('tree');
  const structure = measureStructure(tree, fallow ?? { bin: '' });
  expect(structure).toMatchObject({ fallow: '3.22.0', muted: [] });
  // Each runs in the extraction, on it, and reads the commit's own config from there.
  expect(calls(log)).toEqual(['health', 'dupes', 'dead-code'].map((command) => `${realpathSync(tree)} ${command} --format json --quiet --root ${tree}`));

  // A package that names no version leaves the binary to run, with nothing to key a kept measure by.
  writeFileSync(join(repo, 'node_modules', 'fallow', 'package.json'), '{ "name": "fallow" }\n');
  expect(localFallow(repo)).toEqual({ bin: join(repo, 'node_modules', '.bin', 'fallow') });
});

const KEY: StructureKey = { code: 'c'.repeat(64), fallow: '3.22.0' };
const STRUCTURE = structureOf(RUNS) as MeasuredStructure;

test('a structure kept for a commit reads back whole, and misses by name on other code, another fallow or a bad entry', () => {
  const repo = temp('kept');
  const path = writeStructure(repo, SHA, KEY, STRUCTURE);

  expect(path).toBe(structurePath(repo, SHA));
  expect(path).toBe(join(repo, '.atis', 'structure', `${SHA}.json`));
  expect(readFileSync(join(repo, '.atis', '.gitignore'), 'utf8')).toBe('*\n');
  expect(readStructure(repo, SHA, KEY)).toEqual({ hit: true, structure: STRUCTURE });
  expect(readStructure(repo, OTHER_SHA, KEY)).toEqual({ hit: false, reason: 'no entry' });
  expect(readStructure(repo, SHA, { ...KEY, code: 'd'.repeat(64) })).toEqual({ hit: false, reason: 'code changed' });
  expect(readStructure(repo, SHA, { ...KEY, fallow: '3.23.0' })).toEqual({ hit: false, reason: 'fallow changed' });

  const whole = readFileSync(path, 'utf8');
  const entry = JSON.parse(whole) as Record<string, unknown>;
  for (const text of [
    'not json {',
    whole.slice(0, whole.length / 2),
    'null',
    JSON.stringify({ ...entry, sha: OTHER_SHA }),
    JSON.stringify({ ...entry, structure: { reason: 'never kept' } }),
    JSON.stringify({ ...entry, structure: { ...STRUCTURE, health: { findings: [] } } }),
    JSON.stringify({ ...entry, structure: { ...STRUCTURE, dead: [] } }),
  ]) {
    writeFileSync(path, text);
    expect(readStructure(repo, SHA, KEY), text.slice(0, 40)).toEqual({ hit: false, reason: 'unreadable' });
  }
});

/** A throwaway repository of two commits with the stub as its own fallow, installed and ignored the way a real one is. */
function twoCommits(): { readonly repo: string; readonly git: (...args: readonly string[]) => string; readonly log: string } {
  const repo = temp('repo');
  const git = (...args: readonly string[]): string =>
    execFileSync('git', ['-c', 'user.name=atis', '-c', 'user.email=atis@example.invalid', '-c', 'commit.gpgsign=false', ...args], {
      cwd: repo,
      encoding: 'utf8',
    }).trim();
  git('init', '--quiet');
  write(join(repo, '.gitignore'), 'node_modules/\n');
  write(join(repo, 'package.json'), '{ "name": "demo", "private": true, "type": "module" }\n');
  write(join(repo, 'src', 'shapes.ts'), 'export function area(width: number, height: number): number {\n  return width * height;\n}\n');
  git('add', '.');
  git('commit', '--quiet', '-m', 'feat: measure an area');
  write(join(repo, 'src', 'square.ts'), 'export function square(side: number): number {\n  return side * side;\n}\n');
  git('add', '.');
  git('commit', '--quiet', '-m', 'feat: square a side');
  return { repo, git, log: stubFallow(repo) };
}

function mapAt(path: string): MapJson {
  return assertMap(JSON.parse(readFileSync(path, 'utf8')));
}

/** The map's bytes with the one line two runs may differ in, the clock, taken out (C3). */
function bytesBesideTheClock(path: string): string {
  return readFileSync(path, 'utf8').replace(/"generated_at": "[^"]*"/, '"generated_at": ""');
}

test('both sides are measured once, kept per commit beside the terrain, and recorded in meta.instruments (D98, D136)', () => {
  const { repo, git, log } = twoCommits();
  const [base, head] = [git('rev-parse', 'HEAD~1'), git('rev-parse', 'HEAD')];
  const maps = temp('maps');
  const out = (name: string): string => join(maps, `${name}.json`);

  const first = run({ repo, base: 'HEAD~1', out: out('first'), verbose: true });
  expect(first.exitCode, first.stderr).toBe(0);
  expect(first.stderr).toContain(`structure base miss (no entry), measured, wrote .atis/structure/${base}.json`);
  expect(first.stderr).toContain(`structure head miss (no entry), measured, wrote .atis/structure/${head}.json`);
  expect(first.stderr).toMatch(/structure head\s+\d+ ms/);
  expect(mapAt(out('first')).meta.instruments.structure).toEqual({ base: { fallow: '3.22.0' }, head: { fallow: '3.22.0' } });
  // Three analyses on each extraction, never on the working tree itself.
  expect(calls(log)).toHaveLength(6);
  expect(calls(log).every((call) => !call.startsWith(`${realpathSync(repo)} `) && !call.endsWith(` --root ${repo}`))).toBe(true);
  expect(readStructure(repo, head, { code: codeKey(), fallow: '3.22.0' }).hit).toBe(true);

  // The second run reads both sides, the terrain too, and runs fallow on neither.
  const second = run({ repo, base: 'HEAD~1', out: out('second'), verbose: true });
  expect(second.stderr).toContain('terrain cache hit');
  expect(second.stderr).toContain(`structure base hit, .atis/structure/${base}.json`);
  expect(second.stderr).toContain(`structure head hit, .atis/structure/${head}.json`);
  expect(calls(log)).toHaveLength(6);
  expect(bytesBesideTheClock(out('second'))).toBe(bytesBesideTheClock(out('first')));

  // A moved fallow pin measures both sides again over the terrain kept as it was: the base's tree is extracted for it.
  stubFallow(repo, '3.23.0');
  const moved = run({ repo, base: 'HEAD~1', out: out('moved'), verbose: true });
  expect(moved.exitCode, moved.stderr).toBe(0);
  expect(moved.stderr).toContain('terrain cache hit');
  expect(moved.stderr).toContain('structure base miss (fallow changed), measured, wrote');
  expect(moved.stderr).toContain('structure head miss (fallow changed), measured, wrote');
  expect(bytesBesideTheClock(out('moved'))).toBe(bytesBesideTheClock(out('first')));

  // --no-cache measures both sides afresh and keeps nothing.
  rmSync(join(repo, '.atis', 'structure'), { recursive: true });
  const off = run({ repo, base: 'HEAD~1', out: out('off'), verbose: true, cache: false });
  expect(off.stderr).toContain('structure base off (--no-cache)');
  expect(off.stderr).toContain('structure head off (--no-cache)');
  expect(existsSync(join(repo, '.atis', 'structure'))).toBe(false);
  expect(mapAt(out('off')).meta.instruments.structure).toEqual({ base: { fallow: '3.22.0' }, head: { fallow: '3.22.0' } });

  // The repository's own status is untouched: the stub stays ignored and the cache ignores itself.
  expect(git('status', '--porcelain')).toBe('');
}, MINUTE);

test('a repository with no fallow of its own says so on both sides, and a muted analysis is never kept (C2)', () => {
  const { repo, git } = twoCommits();
  const head = git('rev-parse', 'HEAD');
  const maps = temp('none');
  const out = (name: string): string => join(maps, `${name}.json`);

  // A stub whose dupes cannot run: the side is measured, the analysis muted, and nothing kept.
  const bin = join(repo, 'node_modules', '.bin', 'fallow');
  writeFileSync(bin, readFileSync(bin, 'utf8').replace(/ {2}dupes\) cat '[^']*' ;;/, '  dupes) echo \'{"error":true,"message":"dupes failed","exit_code":2}\'; exit 2 ;;'));
  const muted = run({ repo, base: 'HEAD~1', out: out('muted'), verbose: true });
  expect(muted.exitCode, muted.stderr).toBe(0);
  expect(muted.stderr).toContain('structure head miss (no entry), measured, not kept: fallow read only part of it');
  expect(existsSync(structurePath(repo, head))).toBe(false);
  expect(mapAt(out('muted')).meta.instruments.structure?.head).toEqual({ fallow: '3.22.0', muted: ['dupes: exited 2: dupes failed'] });

  rmSync(join(repo, 'node_modules'), { recursive: true });
  const none = run({ repo, base: 'HEAD~1', out: out('none'), verbose: true });
  expect(none.exitCode, none.stderr).toBe(0);
  expect(none.stderr).toContain('structure base none (no local fallow)');
  const map = mapAt(out('none'));
  expect(map.meta.instruments.structure).toEqual({ base: { reason: NO_LOCAL_FALLOW }, head: { reason: NO_LOCAL_FALLOW } });

  // A side is the fallow that measured it or why none did, never both and never neither.
  const withSide = (side: unknown): unknown => ({ ...map, meta: { ...map.meta, instruments: { ...map.meta.instruments, structure: { base: side, head: side } } } });
  expect(() => assertMap(withSide({}))).toThrow('meta.instruments.structure.base: expected exactly one of fallow and reason');
  expect(() => assertMap(withSide({ fallow: '3.22.0', reason: 'both' }))).toThrow('expected exactly one of fallow and reason');
  expect(() => assertMap(withSide({ fallow: 3 }))).toThrow('meta.instruments.structure.base.fallow: expected a string');
  expect(() => assertMap(withSide({ fallow: '3.22.0', muted: [1] }))).toThrow('meta.instruments.structure.base.muted[0]: expected a string');
}, MINUTE);
