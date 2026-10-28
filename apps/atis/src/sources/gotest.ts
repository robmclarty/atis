/**
 * gotest: Go's `go test -json` events, as checkride's go pack writes them to
 * `test.jsonl` (D176). The pure parsers read each package's outcome from its
 * package-level action, and a module's path from its `go.mod` and the
 * modules a workspace's `go.work` uses (D30). The runner puts each package
 * in its directory and its outcome on that directory's `_test.go` files: Go
 * reports a package, never a file, so a package's events stand for its tests.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import type { TestReport, TestResult } from 'core';

/** One package's outcome: its import path, and `passed`, `failed` or `skipped` as its package-level action said. */
export type GoPackageResult = { readonly package: string; readonly status: string };

/** `go test -json`'s package-level actions, as the statuses a test report carries; `skip` is a package with no test files. */
const OUTCOMES: Readonly<Record<string, string>> = { pass: 'passed', fail: 'failed', skip: 'skipped' };

const TEST_SUFFIX = '_test.go';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * The pure parser: each package's outcome, from the last action its events
 * gave with no `Test`, which is the package's own; a test's events say
 * nothing of their package on their own. `undefined` when no line is an
 * event at all, so a file that is not `go test -json` is never read as a run
 * of nothing (C2).
 */
export function parseGoTestEvents(text: string): readonly GoPackageResult[] | undefined {
  const outcomes = new Map<string, string>();
  let events = 0;
  for (const line of text.split('\n')) {
    const event = line.trim() === '' ? undefined : parseJson(line);
    if (!isRecord(event)) continue;
    events += 1;
    const { Package: name, Action: action, Test: test } = event;
    const status = typeof action === 'string' ? OUTCOMES[action] : undefined;
    if (typeof name === 'string' && test === undefined && status !== undefined) outcomes.set(name, status);
  }
  if (events === 0) return undefined;
  return [...outcomes].map(([name, status]) => ({ package: name, status })).toSorted((a, b) => byPath(a.package, b.package));
}

/** A `go.mod`'s module path, unquoted, or `undefined` when it declares none. */
export function goModulePath(goMod: string): string | undefined {
  const match = /^\s*module\s+"?([^\s"]+)"?\s*(?:\/\/.*)?$/m.exec(goMod);
  return match?.[1];
}

/** The directories a `go.work` uses, as written, from its single `use` lines and its `use ( … )` blocks. */
export function goWorkUses(goWork: string): readonly string[] {
  const lines = goWork.split('\n').map((line) => line.replace(/\/\/.*$/, '').trim());
  const uses: string[] = [];
  let block = false;
  for (const line of lines) {
    if (block) {
      if (line === ')') block = false;
      else if (line !== '') uses.push(line.replaceAll('"', ''));
      continue;
    }
    if (/^use\s*\($/.test(line)) block = true;
    else if (line.startsWith('use ')) uses.push(line.slice(4).trim().replaceAll('"', ''));
  }
  return uses;
}

/** Repo-relative and slash-separated, with `.` and empty segments dropped. */
function normalized(path: string): string {
  return path
    .split('/')
    .filter((part) => part !== '' && part !== '.')
    .join('/');
}

function readText(path: string): string | undefined {
  return existsSync(path) && statSync(path).isFile() ? readFileSync(path, 'utf8') : undefined;
}

/** The modules a check run from `root` tested, each with its path and its directory in the repo: a workspace's, or the one at `root`. */
function modulesAt(repo: string, root: string): readonly { readonly path: string; readonly dir: string }[] {
  const work = readText(join(repo, root, 'go.work'));
  const dirs = work === undefined ? ['.'] : goWorkUses(work);
  return dirs.flatMap((dir) => {
    const path = goModulePath(readText(join(repo, root, dir, 'go.mod')) ?? '');
    return path === undefined ? [] : [{ path, dir: normalized(`${root}/${dir}`) }];
  });
}

/**
 * A `go test -json` run's results as a test report: each package's outcome
 * on every `_test.go` file in its directory, which the module it belongs to,
 * the longest whose path its import path starts with, places in the repo. A
 * package outside every module, or a directory no longer there, names no
 * file. `undefined` where the events are not a run's (C2).
 */
export function readGoTestResults(text: string, repo: string, root: string): TestReport | undefined {
  const packages = parseGoTestEvents(text);
  if (packages === undefined) return undefined;
  const modules = modulesAt(repo, root).toSorted((a, b) => b.path.length - a.path.length);
  const results = packages.flatMap(({ package: name, status }): readonly TestResult[] => {
    const module = modules.find(({ path }) => name === path || name.startsWith(`${path}/`));
    if (module === undefined) return [];
    const dir = normalized(`${module.dir}/${name.slice(module.path.length)}`);
    const at = join(repo, dir);
    if (!existsSync(at) || !statSync(at).isDirectory()) return [];
    return readdirSync(at)
      .filter((file) => file.endsWith(TEST_SUFFIX))
      .map((file) => ({ path: dir === '' ? file : `${dir}/${file}`, status }));
  });
  return { results: results.toSorted((a, b) => byPath(a.path, b.path)) };
}
