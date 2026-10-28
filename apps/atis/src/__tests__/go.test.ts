import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap, buildMap } from 'core';
import type { MapJson } from 'core';
import { afterAll, expect, test, vi } from 'vitest';

import { PRODUCERS, goScan, goUnavailable, parseGoHelper, parseGoList, parseGoMod, readTree } from '../sources/index.js';
import type { GoModule, Scan } from '../sources/index.js';

/**
 * The Go producer (D113, D139): `go list` names a module's packages, a helper
 * atis carries as source reads each file with `go/parser`, and nothing in the
 * reviewed tree ever runs. The parsing is tested from output captured off the
 * tree below (D30); the runs that need a Go toolchain are skipped without one.
 */

const MINUTE = 60_000;
const FIXTURES = fileURLToPath(new URL('../../fixtures/go/', import.meta.url));
/** Where the captured `go list` ran: the sample tree, its temp path cut back to `/repo`. */
const CAPTURED_ROOT = '/repo';
const HAS_GO = goUnavailable() === undefined;

/** The sample module the fixtures were captured from: a `main` package, a package of two files and two kinds of test, one with a file a build constraint leaves out, and a stray under `testdata/`. */
const SHOP: Readonly<Record<string, string>> = {
  'go.mod': `module example.com/shop

go 1.22

require (
\tgithub.com/google/uuid v1.6.0
\tgolang.org/x/text v0.14.0 // indirect
)
`,
  'cmd/shop/main.go': `package main

import (
\t"fmt"

\t"example.com/shop/internal/store"
\t"github.com/google/uuid"
)

func main() {
\ts := store.New()
\ts.Add(uuid.NewString())
\tfmt.Println(s.Len())
}
`,
  'internal/store/store.go': `// Package store keeps the shop's items.
package store

// Store holds items in the order they were added.
type Store struct {
\tName  string
\titems []string
}

// New makes an empty store.
func New() *Store {
\treturn &Store{Name: defaultName}
}
`,
  'internal/store/items.go': `package store

const defaultName = "shop"

// Add appends one item.
func (s *Store) Add(item string) {
\ts.items = append(s.items, item)
}

// Len is how many items the store holds.
func (s *Store) Len() int {
\treturn len(s.items)
}

var Limit = 100
`,
  'internal/store/store_test.go': `package store

import "testing"

func TestAdd(t *testing.T) {
\ts := New()
\ts.Add("a")
\tif s.Len() != 1 {
\t\tt.Fatal(len(s.items))
\t}
}
`,
  'internal/store/new_test.go': `package store_test

import (
\t"testing"

\t"example.com/shop/internal/store"
)

func TestNew(t *testing.T) {
\tif store.New().Name != "shop" {
\t\tt.Fail()
\t}
}
`,
  'pkg/money/money.go': `package money

import "golang.org/x/text/currency"

type Amount int64

const (
\tCents Amount = iota
\tDollars
)

func Format(a Amount) string {
\treturn currency.USD.String()
}
`,
  'pkg/money/money_windows.go': `//go:build windows

package money

func platform() string { return "windows" }
`,
  'testdata/fixture.go': `package fixture
`,
};

const scratch: string[] = [];

afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

function writeTree(tree: Readonly<Record<string, string>>): string {
  const root = mkdtempSync(join(tmpdir(), 'atis-go-'));
  scratch.push(root);
  for (const [path, content] of Object.entries(tree)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

function captured(): readonly GoModule[] {
  const packages = parseGoList(readFileSync(join(FIXTURES, 'list.txt'), 'utf8'), [CAPTURED_ROOT]);
  return [{ dir: '', mod: parseGoMod(SHOP['go.mod'] ?? ''), packages }];
}

function capturedScan(): Scan {
  return goScan(captured(), parseGoHelper(readFileSync(join(FIXTURES, 'helper.json'), 'utf8')));
}

/** A tree's map as a change of nothing, so its terrain and its instruments are what the scan alone made. */
function mapOf(scan: Scan): MapJson {
  const map = buildMap({
    meta: { repo: 'shop', base: 'main', head: 'h'.repeat(40), merge_base: 'b'.repeat(40), generated_at: '' },
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

test('Go is the second producer, claiming .go files, and it runs only where a go command answers (D113, D114)', () => {
  expect(PRODUCERS.map((producer) => [producer.id, producer.extensions])).toEqual([
    ['typescript', ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']],
    ['go', ['.go']],
  ]);
});

test("parseGoMod reads the module's path and every module it requires, alone or in a block", () => {
  expect(parseGoMod(SHOP['go.mod'] ?? '')).toEqual({ path: 'example.com/shop', requires: ['github.com/google/uuid', 'golang.org/x/text'] });
  expect(parseGoMod('module "example.com/quoted" // the path\n\nrequire example.com/one v1.0.0\nrequire (\n\t// a comment\n\texample.com/two v2.0.0\n)\n')).toEqual({
    path: 'example.com/quoted',
    requires: ['example.com/one', 'example.com/two'],
  });
});

test('parseGoList reads each package by its directory, a file a build constraint leaves out among its sources, and its tests apart (C3, D30)', () => {
  expect(captured()[0]?.packages).toEqual([
    { dir: 'cmd/shop', importPath: 'example.com/shop/cmd/shop', name: 'main', sources: ['cmd/shop/main.go'], tests: [] },
    {
      dir: 'internal/store',
      importPath: 'example.com/shop/internal/store',
      name: 'store',
      sources: ['internal/store/items.go', 'internal/store/store.go'],
      tests: ['internal/store/new_test.go', 'internal/store/store_test.go'],
    },
    { dir: 'pkg/money', importPath: 'example.com/shop/pkg/money', name: 'money', sources: ['pkg/money/money.go', 'pkg/money/money_windows.go'], tests: [] },
  ]);
  // A package outside the tree the command ran in is none of the scan's.
  expect(parseGoList('{"Dir": "/elsewhere/x", "ImportPath": "x"}', [CAPTURED_ROOT])).toEqual([]);
});

test("each Go file is source or test, with its exported names, methods as Type.Method, and each name's shape printed bare (D76, D113)", () => {
  const { files } = capturedScan();
  expect(files.map((file) => [file.path, file.kind, file.exports])).toEqual([
    ['cmd/shop/main.go', 'source', []],
    ['internal/store/items.go', 'source', ['Limit', 'Store.Add', 'Store.Len']],
    ['internal/store/new_test.go', 'test', ['TestNew']],
    ['internal/store/store.go', 'source', ['New', 'Store']],
    ['internal/store/store_test.go', 'test', ['TestAdd']],
    ['pkg/money/money.go', 'source', ['Amount', 'Cents', 'Dollars', 'Format']],
    ['pkg/money/money_windows.go', 'source', []],
  ]);
  const shapes = Object.fromEntries(files.map((file) => [file.path, file.shapes]));
  // An unexported field is no reader's, and a doc comment no part of a shape.
  expect(shapes['internal/store/store.go']).toEqual({ New: 'func New() *Store', Store: 'type Store struct {\nName string\n}' });
  // A variable whose type only the checker could name reads as uncompared (C2).
  expect(shapes['internal/store/items.go']).toEqual({ Limit: null, 'Store.Add': 'func (*Store) Add(item string)', 'Store.Len': 'func (*Store) Len() int' });
  // A constant of an iota group carries the type the group gave it.
  expect(shapes['pkg/money/money.go']).toEqual({
    Amount: 'type Amount int64',
    Cents: 'const Cents Amount',
    Dollars: 'const Dollars Amount',
    Format: 'func Format(a Amount) string',
  });
});

test('an edge runs to each file declaring a name read across an import or within the package, a type bringing its methods (D113)', () => {
  const { edges, files } = capturedScan();
  expect(edges.map((edge) => [edge.from, edge.to, edge.names, edge.line])).toEqual([
    ['cmd/shop/main.go', 'internal/store/store.go', ['New'], 6],
    ['internal/store/items.go', 'internal/store/store.go', ['Store'], 6],
    ['internal/store/new_test.go', 'internal/store/store.go', ['New'], 6],
    ['internal/store/store.go', 'internal/store/items.go', ['defaultName'], 12],
    ['internal/store/store_test.go', 'internal/store/store.go', ['New'], 6],
  ]);
  // The standard library is no outside package; a required module is, by the module that provides it (D170).
  expect(Object.fromEntries(files.map((file) => [file.path, file.packages]))).toMatchObject({
    'cmd/shop/main.go': ['github.com/google/uuid'],
    'pkg/money/money.go': ['golang.org/x/text'],
  });
});

test('a module is a member and its main packages are its entry points; its functions and code are read for the file level (D43, D102, D113)', () => {
  const scan = capturedScan();
  expect(scan.members).toEqual([{ name: 'example.com/shop', dir: '.', entry: ['cmd/shop/main.go'], published: false, surface: [] }]);
  expect(scan.entry_points).toEqual({ source: 'manifests', reason: 'go list names the main packages' });
  const items = scan.files.find((file) => file.path === 'internal/store/items.go');
  expect(items?.functions).toEqual([
    { name: 'Store.Add', line: 6, line_count: 3 },
    { name: 'Store.Len', line: 11, line_count: 3 },
  ]);
  expect(items?.code).toEqual([
    { start: 6, end: 8 },
    { start: 11, end: 13 },
    { start: 15, end: 15 },
  ]);
  expect(items?.loc).toBe(11);
});

test.skipIf(!HAS_GO)('a real run reads the tree as the captured output does, its packages as directory cells and a stray under testdata/ on the shore', () => {
  const { scan } = readTree(writeTree(SHOP));
  const go = { ...scan, files: scan.files.filter((file) => file.kind !== 'other') };
  expect(go.files).toEqual(capturedScan().files);
  expect(go.edges).toEqual(capturedScan().edges);
  expect(scan.members).toEqual(capturedScan().members);
  expect(scan.files.find((file) => file.path === 'testdata/fixture.go')?.kind).toBe('other');

  const { terrain } = mapOf(scan);
  expect(terrain.cells.filter((cell) => cell.kind === 'directory').map((cell) => cell.path)).toEqual(['cmd/shop', 'internal/store', 'pkg/money']);
  expect(terrain.groups.find((group) => group.id === 'deps')?.files).toEqual(['go.mod']);
}, MINUTE);

test.skipIf(!HAS_GO)('a planted program never runs: no init, generate directive, cgo preamble or newer toolchain the tree asks for (D139)', () => {
  const marker = join(mkdtempSync(join(tmpdir(), 'atis-go-marker-')), 'ran');
  scratch.push(dirname(marker));
  const root = writeTree({
    // A toolchain line asking for a Go this machine lacks would send `go` looking for one under GOTOOLCHAIN=auto.
    'go.mod': 'module example.com/planted\n\ngo 1.22\n\ntoolchain go1.99.0\n',
    'main.go': `package main

import "os"

//go:generate touch ${marker}

func init() {
\t_ = os.WriteFile(${JSON.stringify(marker)}, nil, 0o600)
}

func main() {}
`,
    'cgo.go': `package main

// #include <stdlib.h>
// static void ran(void) { system("touch ${marker}"); }
import "C"

func Ran() { C.ran() }
`,
    // An executable the tree carries is never run in the tree's place.
    go: `#!/bin/sh\ntouch ${marker}\n`,
  });
  const { scan } = readTree(root);
  expect(scan.files.filter((file) => file.path.endsWith('.go')).map((file) => [file.path, file.kind])).toEqual([
    ['cgo.go', 'source'],
    ['main.go', 'source'],
  ]);
  expect(scan.unread).toBeUndefined();
  expect(existsSync(marker)).toBe(false);
}, MINUTE);

test.skipIf(!HAS_GO)('a module its toolchain refuses is left unread, its files on the shore, and the map says which and why (C2, D114)', () => {
  const root = writeTree({ 'go.mod': 'module example.com/newer\n\ngo 1.99\n', 'main.go': 'package main\n\nfunc main() {}\n' });
  const { scan } = readTree(root);
  expect(scan.files.find((file) => file.path === 'main.go')?.kind).toBe('other');
  const [said] = mapOf(scan).meta.instruments.unread ?? [];
  expect(said).toMatch(/^go: go list in \. exited 1: go: go\.mod requires go >= 1\.99 \(running go [\d.]+; GOTOOLCHAIN=local\)$/);
}, MINUTE);

test('with no Go toolchain the .go files stay on the shore, and the map says why (C2, D114)', () => {
  const root = writeTree(SHOP);
  const empty = mkdtempSync(join(tmpdir(), 'atis-no-go-'));
  scratch.push(empty);
  vi.stubEnv('PATH', empty);
  try {
    const { scan } = readTree(root);
    expect(scan.files.filter((file) => file.path.endsWith('.go')).every((file) => file.kind === 'other')).toBe(true);
    const map = mapOf(scan);
    expect(map.meta.instruments.unread).toEqual(['go: no go command on the PATH']);
    expect(map.terrain.cells).toEqual([]);
    expect(map.terrain.groups.find((group) => group.id === 'other')?.files).toContain('cmd/shop/main.go');
  } finally {
    vi.unstubAllEnvs();
  }
});
