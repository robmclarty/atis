import { execFileSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { assertMap, buildMap } from 'core';
import type { MapJson } from 'core';
import { afterAll, expect, test } from 'vitest';

import { PRODUCERS, readCommit, readTree, shellScan } from '../sources/index.js';
import type { Scan, ShellSource } from '../sources/index.js';

/**
 * The shell producer (D117): tree-sitter's bash grammar, which atis carries,
 * reads every `.sh`, `.bash` and `.bats` file, and no shell runs. Each tree
 * is written from these strings into a `mkdtemp` directory (D42), the scripts
 * named in `EXECUTABLE` with their mode set to run.
 */

const MINUTE = 60_000;

/** A deploy script and the libraries it sources, a script it runs, a release script that runs it, and a bats test of it with its helper. */
const SCRIPTS: Readonly<Record<string, string>> = {
  'bin/deploy.sh': `#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$DIR")"
source "$ROOT/lib/log.sh"
. "$DIR/../lib/net.bash"

main() {
  log_info "deploying"
  fetch "$1"
  "$DIR/notify.sh" done
}

main "$@"
`,
  'bin/notify.sh': `#!/bin/sh
. "\${0%/*}/../lib/log.sh"
log_info "$1"
`,
  'lib/log.sh': `log_info() { echo "info: $*"; }

log_warn() {
  echo "warn: $*" >&2
}
`,
  'lib/net.bash': `source "$LIB_HOME/log.sh"

fetch() {
  curl -fsSL "$1" || log_warn "fetch failed"
}
`,
  'scripts/release.sh': `#!/usr/bin/env bash
cd "$(git rev-parse --show-toplevel)"
bash bin/deploy.sh production
exec ./scripts/tag.sh
`,
  'scripts/tag.sh': `git tag "v$(date +%s)"
`,
  'scripts/old.sh': `echo "nothing runs me"
`,
  'test/deploy.bats': `load test_helper

@test "deploy runs" {
  run "$BATS_TEST_DIRNAME/../bin/deploy.sh" staging
  [ "$status" -eq 0 ]
}
`,
  'test/test_helper.bash': `setup() {
  export PATH="$BATS_TEST_DIRNAME/../bin:$PATH"
}
`,
  'README.md': '# deploy\n',
};

const EXECUTABLE: ReadonlySet<string> = new Set(['bin/deploy.sh', 'bin/notify.sh', 'scripts/release.sh']);

const scratch: string[] = [];

afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

function writeTree(tree: Readonly<Record<string, string>>): string {
  const root = mkdtempSync(join(tmpdir(), 'atis-shell-'));
  scratch.push(root);
  for (const [path, content] of Object.entries(tree)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
    if (EXECUTABLE.has(path)) chmodSync(join(root, path), 0o755);
  }
  return root;
}

function sources(tree: Readonly<Record<string, string>>): readonly ShellSource[] {
  return Object.entries(tree)
    .filter(([path]) => /\.(?:sh|bash|bats)$/.test(path))
    .map(([path, text]) => ({ path, text, executable: EXECUTABLE.has(path) }));
}

/** A tree's map as a change of nothing, so its terrain and its instruments are what the scan alone made. */
function mapOf(scan: Scan): MapJson {
  const map = buildMap({
    meta: { repo: 'deploy', base: 'main', head: 'h'.repeat(40), merge_base: 'b'.repeat(40), generated_at: '' },
    base: scan,
    head: scan,
    diff: [],
    deps_added: [],
    commits: [],
    head_time: 0,
    check: { mode: 'git-only', reason: '.check/ is absent' },
  });
  assertMap(map);
  return map;
}

test('shell is the fifth producer, claiming .sh, .bash and .bats files, and its grammar loaded (D114, D117)', () => {
  const shell = PRODUCERS.find((producer) => producer.id === 'shell');
  expect(PRODUCERS.map((producer) => producer.id)).toEqual(['typescript', 'go', 'python', 'terraform', 'shell']);
  expect(shell?.extensions).toEqual(['.sh', '.bash', '.bats']);
  expect(shell?.unavailable()).toBeUndefined();
});

test('source and . lines, a bats load, and a command running a tracked script by its path are the edges, however the path is spelled (D117)', () => {
  const { edges } = shellScan(sources(SCRIPTS));
  expect(edges.map((edge) => [edge.from, edge.to, edge.names, edge.line])).toEqual([
    // From the script's own directory, through `cd … && pwd`, `dirname` and the variables that keep them.
    ['bin/deploy.sh', 'lib/log.sh', ['log_info'], 5],
    ['bin/deploy.sh', 'lib/net.bash', ['fetch'], 6],
    ['bin/deploy.sh', 'bin/notify.sh', [], 11],
    // `${0%/*}` is the script's directory too.
    ['bin/notify.sh', 'lib/log.sh', ['log_info'], 2],
    // A directory no reading can know resolves by the path's end, when one script ends that way.
    ['lib/net.bash', 'lib/log.sh', ['log_warn'], 1],
    // A relative path resolves against the script's directory, then the root; a shell or `exec` runs what it names.
    ['scripts/release.sh', 'bin/deploy.sh', [], 3],
    ['scripts/release.sh', 'scripts/tag.sh', [], 4],
    // bats loads a helper from the test's directory, `.bash` added, and `run` runs what it names.
    ['test/deploy.bats', 'test/test_helper.bash', [], 1],
    ['test/deploy.bats', 'bin/deploy.sh', [], 4],
  ]);
});

test("a sourced script's functions are its exports, each shaped by its name alone; a script nothing sources exports nothing; a bats file is a test (D76, D117)", () => {
  const { files } = shellScan(sources(SCRIPTS));
  expect(files.map((file) => [file.path, file.kind, file.exports])).toEqual([
    ['bin/deploy.sh', 'source', []],
    ['bin/notify.sh', 'source', []],
    ['lib/log.sh', 'source', ['log_info', 'log_warn']],
    ['lib/net.bash', 'source', ['fetch']],
    ['scripts/old.sh', 'source', []],
    ['scripts/release.sh', 'source', []],
    ['scripts/tag.sh', 'source', []],
    ['test/deploy.bats', 'test', []],
    ['test/test_helper.bash', 'source', ['setup']],
  ]);
  const of = (path: string): Scan['files'][number] | undefined => files.find((file) => file.path === path);
  expect(of('lib/log.sh')?.shapes).toEqual({ log_info: 'log_info()', log_warn: 'log_warn()' });
  // Every function is the file level's, sourced or not, and every statement but a comment is code.
  expect(of('bin/deploy.sh')).toMatchObject({
    loc: 12,
    functions: [{ name: 'main', line: 8, line_count: 5 }],
    code: [
      { start: 2, end: 2 },
      { start: 3, end: 3 },
      { start: 4, end: 4 },
      { start: 5, end: 5 },
      { start: 6, end: 6 },
      { start: 8, end: 12 },
      { start: 14, end: 14 },
    ],
    packages: [],
  });
  expect(of('lib/log.sh')?.functions).toEqual([
    { name: 'log_info', line: 1, line_count: 1 },
    { name: 'log_warn', line: 3, line_count: 3 },
  ]);
});

/** The ways a script spells its way to a library beside it: from its own path or directory, git's top level, and a relative path. */
const IDIOMS: readonly string[] = [
  'source "$(dirname "$0")/../lib/log.sh"',
  'source "${BASH_SOURCE%/*}/../lib/log.sh"',
  'DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"\nsource "$DIR/../lib/log.sh"',
  'source "$(dirname "$(readlink -f "$0")")/../lib/log.sh"',
  'source "$(realpath "$(dirname "$0")/..")/lib/log.sh"',
  'ROOT="$(git rev-parse --show-toplevel)"\n. "$ROOT/lib/log.sh"',
  'source lib/log.sh',
  "source '../lib/log.sh'",
];

test.each(IDIOMS)('a script spelling its way to a library reaches it: %s', (text) => {
  const { edges } = shellScan([
    { path: 'bin/run.sh', text: `${text}\nlog hi\n`, executable: true },
    { path: 'lib/log.sh', text: 'log() { echo "$*"; }\n', executable: false },
  ]);
  expect(edges.map((edge) => [edge.from, edge.to, edge.names])).toEqual([['bin/run.sh', 'lib/log.sh', ['log']]]);
});

test('a shellcheck source= directive names the path a line sources, and /dev/null sources nothing (D117)', () => {
  const { edges } = shellScan([
    {
      path: 'tools/a.sh',
      text: `CONFIG_DIR="$(mktemp -d)"
# shellcheck source=SCRIPTDIR/b.sh
source "$CONFIG_DIR/settings.sh"
# shellcheck disable=SC1091 source=/dev/null
source "$HOME/.profile.sh"
b_fn
`,
      executable: true,
    },
    { path: 'tools/b.sh', text: 'b_fn() { :; }\n', executable: false },
    { path: 'dotfiles/.profile.sh', text: 'export EDITOR=vi\n', executable: false },
  ]);
  expect(edges.map((edge) => [edge.from, edge.to, edge.names, edge.line])).toEqual([['tools/a.sh', 'tools/b.sh', ['b_fn'], 3]]);
});

test('a path two scripts end with, one outside the tree, and a command string reach nothing, never a guess (C2)', () => {
  const { edges } = shellScan([
    {
      path: 'run.sh',
      text: `source "$SOMEWHERE/common.sh"
source /etc/profile.d/common.sh
bash -c "./a/common.sh"
for f in "$DIR"/*.sh; do source "$f"; done
`,
      executable: true,
    },
    { path: 'a/common.sh', text: 'a() { :; }\n', executable: false },
    { path: 'b/common.sh', text: 'b() { :; }\n', executable: false },
  ]);
  expect(edges).toEqual([]);
});

test('executable scripts nothing sources are the entry points; each directory of scripts is a cell; the bats test is evidence (D117)', () => {
  const scan = readTree(writeTree(SCRIPTS)).scan;
  expect(scan.members).toEqual([{ name: '.', dir: '.', entry: ['bin/deploy.sh', 'bin/notify.sh', 'scripts/release.sh'], published: false, surface: [] }]);
  expect(scan.entry_points).toEqual({ source: 'manifests', reason: 'the executable scripts nothing sources are the entry points' });
  expect(scan.files.find((file) => file.path === 'README.md')?.kind).toBe('other');
  const { terrain } = mapOf(scan);
  expect(terrain.cells.filter((cell) => cell.kind === 'directory').map((cell) => cell.path)).toEqual(['bin', 'lib', 'scripts', 'test']);
  expect(terrain.groups.find((group) => group.id === 'tests')?.files).toEqual(['test/deploy.bats']);
  // Read, no script is shore.
  expect(terrain.groups.find((group) => group.id === 'scripts')).toBeUndefined();
  // Depth falls from the entry points along the longest path (D26).
  const band = (path: string): number => terrain.organelles.find((organelle) => organelle.path === path)?.band ?? -1;
  expect(band('scripts/release.sh')).toBe(0);
  expect(band('bin/deploy.sh')).toBeGreaterThan(band('scripts/release.sh'));
  expect(band('lib/net.bash')).toBeGreaterThan(band('bin/deploy.sh'));
  expect(band('lib/log.sh')).toBeGreaterThan(band('lib/net.bash'));
});

test("switched off, the shell producer reads nothing, and the shore's scripts row holds what it left (D114, D117, C2)", () => {
  const scan = readTree(writeTree(SCRIPTS), { off: ['shell'] }).scan;
  expect(scan.unread).toEqual([{ producer: 'shell', reason: 'switched off in atis.config.json' }]);
  expect(scan.edges).toEqual([]);
  const { terrain } = mapOf(scan);
  expect(terrain.groups.find((group) => group.id === 'scripts')?.files).toEqual(Object.keys(SCRIPTS).filter((path) => path !== 'README.md').toSorted());
});

test("a commit read from git's objects knows which scripts git records as executable (D117, D172)", { timeout: MINUTE }, () => {
  const repo = writeTree(SCRIPTS);
  const git = (...args: readonly string[]): string =>
    execFileSync('git', ['-c', 'user.name=atis', '-c', 'user.email=atis@example.invalid', '-c', 'commit.gpgsign=false', ...args], { cwd: repo, encoding: 'utf8' }).trim();
  git('init', '--quiet');
  git('add', '.');
  git('commit', '--quiet', '-m', 'feat: deploy');
  const fromGit = readCommit(git('rev-parse', 'HEAD'), { repo, extracted: () => repo }).scan;
  expect(fromGit.members).toEqual(readTree(repo).scan.members);
});
