import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap, buildMap } from 'core';
import type { MapJson } from 'core';
import { afterAll, expect, test, vi } from 'vitest';

import { PRODUCERS, parsePyproject, parsePythonHelper, pythonKind, pythonScan, pythonUnavailable, readTree } from '../sources/index.js';
import type { Scan } from '../sources/index.js';

/**
 * The Python producer (D115, D139): a helper atis carries as source reads
 * every file with `ast` under `-I -S`, from a directory outside the tree, and
 * nothing in the reviewed tree ever runs. The parsing is tested from output
 * captured off the project below (D30); the runs that need a Python are
 * skipped without one.
 */

const MINUTE = 60_000;
const FIXTURES = fileURLToPath(new URL('../../fixtures/python/', import.meta.url));
const HAS_PYTHON = pythonUnavailable() === undefined;

/** The sample project the fixture was captured from: a src layout with an `__all__` barrel, a star barrel, a namespace package, a script, a `__main__.py`, a guarded module and two tests. */
const SHOP: Readonly<Record<string, string>> = {
  'pyproject.toml': `[project]
name = "shop"
version = "1.0"

[project.scripts]
shop = "shop.cli:main"
`,
  'src/shop/__init__.py': `"""The shop."""
from .store import Store, make
from . import money

__all__ = ["Store", "make", "money", "VERSION"]

VERSION = "1.0"
`,
  'src/shop/__main__.py': `from .cli import main

main()
`,
  'src/shop/cli.py': `import argparse

from shop import Store


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.parse_args(argv)
    return len(Store("cli").name)
`,
  'src/shop/money.py': `import requests

from shop.store.core import Store, make


def total(store: Store) -> int:
    return len(store.items)


if __name__ == "__main__":
    print(total(make()), requests)
`,
  'src/shop/plugins/loader.py': `from ..store import make


def load():
    return make()
`,
  'src/shop/store/__init__.py': `from .core import *
`,
  'src/shop/store/core.py': `import json
from dataclasses import dataclass


@dataclass
class Store:
    name: str
    items: list[str] = None

    def add(self, item: str, count: int = 1) -> None:
        """Add an item."""
        self.items.append(item)

    def _secret(self):
        return json.dumps(self.items)


def make(name: str = "shop") -> Store:
    return Store(name)


LIMIT = 100
_hidden = 1
`,
  'tests/conftest.py': `import pytest


@pytest.fixture
def store():
    return None
`,
  'tests/test_store.py': `from shop.store import make


def test_make():
    assert make().name == "shop"
`,
};

const scratch: string[] = [];

afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

function writeTree(tree: Readonly<Record<string, string>>): string {
  const root = mkdtempSync(join(tmpdir(), 'atis-python-'));
  scratch.push(root);
  for (const [path, content] of Object.entries(tree)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

function capturedScan(): Scan {
  const reads = parsePythonHelper(readFileSync(join(FIXTURES, 'helper.json'), 'utf8'));
  return pythonScan(reads, [{ dir: '', pyproject: parsePyproject(SHOP['pyproject.toml'] ?? '') }]);
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

test('Python is the third producer, claiming .py files (D114, D115)', () => {
  expect(PRODUCERS.map((producer) => producer.id).slice(0, 3)).toEqual(['typescript', 'go', 'python']);
  expect(PRODUCERS.find((producer) => producer.id === 'python')?.extensions).toEqual(['.py']);
});

test("parsePyproject reads the project's name and every script's target, PEP 621's and Poetry's", () => {
  expect(parsePyproject(SHOP['pyproject.toml'] ?? '')).toEqual({ name: 'shop', scripts: ['shop.cli:main'] });
  expect(
    parsePyproject(`[tool.poetry]\nname = 'legacy' # the old name\n\n[tool.poetry.scripts]\nrun = "legacy.run:main"\n\n[project.gui-scripts]\n"open-ui" = "legacy.ui:open"\n\n[tool.ruff]\nname = "not-the-project"\n`),
  ).toEqual({ name: 'legacy', scripts: ['legacy.run:main', 'legacy.ui:open'] });
});

test.each([
  ['tests/test_store.py', 'test'],
  ['src/shop/store_test.py', 'test'],
  ['conftest.py', 'test'],
  ['test/integration/flow.py', 'test'],
  ['src/shop/testing.py', 'source'],
  ['src/shop/__init__.py', 'source'],
])('the Python producer reads %s as %s (D4, D115)', (path, kind) => {
  expect(pythonKind(path)).toBe(kind);
});

test("each module exports its __all__, else its public names, and a barrel the names it imports, with each name's shape (D75, D76, D115)", () => {
  const { files } = capturedScan();
  expect(files.map((file) => [file.path, file.kind, file.barrel ?? false, file.exports])).toEqual([
    ['src/shop/__init__.py', 'source', true, ['Store', 'VERSION', 'make', 'money']],
    ['src/shop/__main__.py', 'source', false, []],
    ['src/shop/cli.py', 'source', false, ['main']],
    ['src/shop/money.py', 'source', false, ['total']],
    ['src/shop/plugins/loader.py', 'source', false, ['load']],
    // A star passes on every public name of its module, as `export *` does.
    ['src/shop/store/__init__.py', 'source', true, ['LIMIT', 'Store', 'make']],
    ['src/shop/store/core.py', 'source', false, ['LIMIT', 'Store', 'make']],
    ['tests/conftest.py', 'test', false, ['store']],
    ['tests/test_store.py', 'test', false, ['test_make']],
  ]);
  const shapes = Object.fromEntries(files.map((file) => [file.path, file.shapes]));
  expect(shapes['src/shop/__init__.py']).toEqual({
    Store: 'from .store import Store',
    VERSION: "VERSION = '1.0'",
    make: 'from .store import make',
    money: 'from . import money',
  });
  // A docstring, a body, a default's value and a private member are no part of a shape.
  expect(shapes['src/shop/store/core.py']).toEqual({
    LIMIT: 'LIMIT = 100',
    Store: '@dataclass\nclass Store:\nname: str\nitems: list[str] = ...\ndef add(self, item: str, count: int=...) -> None:\n...',
    make: 'def make(name: str=...) -> Store:\n...',
  });
  expect(shapes['src/shop/store/__init__.py']).toEqual({ LIMIT: 'from .core import *', Store: 'from .core import *', make: 'from .core import *' });
});

test('absolute imports resolve against the src root, relative ones against their package, and third-party ones are dropped (D75, D115)', () => {
  const { edges } = capturedScan();
  expect(edges.map((edge) => [edge.from, edge.to, edge.names, edge.line, edge.reexports])).toEqual([
    ['src/shop/__init__.py', 'src/shop/store/__init__.py', ['Store', 'make'], 2, [{ name: 'Store', as: 'Store' }, { name: 'make', as: 'make' }]],
    // A submodule taken by name is taken whole, and a barrel passes it on under that name.
    ['src/shop/__init__.py', 'src/shop/money.py', ['*'], 3, [{ name: '*', as: 'money' }]],
    ['src/shop/__main__.py', 'src/shop/cli.py', ['main'], 1, undefined],
    ['src/shop/cli.py', 'src/shop/__init__.py', ['Store'], 3, undefined],
    ['src/shop/money.py', 'src/shop/store/core.py', ['Store', 'make'], 3, undefined],
    // Two packages up from a namespace package.
    ['src/shop/plugins/loader.py', 'src/shop/store/__init__.py', ['make'], 1, undefined],
    ['src/shop/store/__init__.py', 'src/shop/store/core.py', ['*'], 1, [{ name: '*', as: '*' }]],
    ['tests/test_store.py', 'src/shop/store/__init__.py', ['make'], 1, undefined],
  ]);
});

test('a project is a member whose script, __main__.py and guarded module are its entry points (D43, D115)', () => {
  const scan = capturedScan();
  expect(scan.members).toEqual([
    { name: 'shop', dir: '.', entry: ['src/shop/__main__.py', 'src/shop/cli.py', 'src/shop/money.py'], published: false, surface: [] },
  ]);
  expect(scan.entry_points).toEqual({ source: 'manifests', reason: 'pyproject.toml scripts and __main__ name the entry points' });
  const core = scan.files.find((file) => file.path === 'src/shop/store/core.py');
  expect(core?.functions).toEqual([
    { name: 'add', line: 10, line_count: 3 },
    { name: '_secret', line: 14, line_count: 2 },
    { name: 'make', line: 18, line_count: 2 },
  ]);
  // A decorated class spans from its decorator; imports leave no code.
  expect(core?.code).toEqual([
    { start: 5, end: 15 },
    { start: 18, end: 19 },
    { start: 22, end: 22 },
    { start: 23, end: 23 },
  ]);
});

test.skipIf(!HAS_PYTHON)('a real run reads the tree as the captured output does, its packages as cells', () => {
  const { scan } = readTree(writeTree(SHOP));
  const python = { ...scan, files: scan.files.filter((file) => file.kind !== 'other') };
  expect(python.files).toEqual(capturedScan().files);
  expect(python.edges).toEqual(capturedScan().edges);
  expect(scan.members).toEqual(capturedScan().members);

  // Under src/, core's convention makes the top package one folder cell, its subpackages inside it (D45).
  const { terrain } = mapOf(scan);
  expect(terrain.cells.map((cell) => [cell.kind, cell.path])).toEqual([
    ['folder', 'src/shop'],
    ['package', '.'],
  ]);
  expect(terrain.groups.find((group) => group.id === 'deps')?.files).toEqual(['pyproject.toml']);

  // A flat layout makes each package a cell, a namespace package a directory cell all the same.
  const flat = Object.fromEntries(Object.entries(SHOP).map(([path, content]) => [path.replace(/^src\//, ''), content]));
  expect(mapOf(readTree(writeTree(flat)).scan).terrain.cells.map((cell) => [cell.kind, cell.path])).toEqual([
    ['directory', 'shop'],
    ['directory', 'shop/plugins'],
    ['directory', 'shop/store'],
    ['package', '.'],
  ]);
}, MINUTE);

test.skipIf(!HAS_PYTHON)('a planted ast.py never runs, nor anything the site machinery would load (D139)', () => {
  const marker = join(mkdtempSync(join(tmpdir(), 'atis-python-marker-')), 'ran');
  scratch.push(dirname(marker));
  const plant = `open(${JSON.stringify(marker)}, "w").write("ran")\n`;
  const root = writeTree({
    'ast.py': plant,
    'json.py': plant,
    'sys.py': plant,
    'sitecustomize.py': plant,
    'usercustomize.py': plant,
    'planted.pth': `import os; ${plant}`,
    'pkg/__init__.py': `import ast\n\n${plant}`,
    'pkg/os.py': plant,
  });
  const { scan } = readTree(root);
  expect(scan.unread).toBeUndefined();
  expect(scan.files.find((file) => file.path === 'pkg/__init__.py')?.kind).toBe('source');
  expect(existsSync(marker)).toBe(false);
}, MINUTE);

test('with no Python the .py files stay on the shore, and the map says why (C2, D114)', () => {
  const root = writeTree(SHOP);
  const empty = mkdtempSync(join(tmpdir(), 'atis-no-python-'));
  scratch.push(empty);
  vi.stubEnv('PATH', empty);
  try {
    const { scan } = readTree(root);
    expect(scan.files.filter((file) => file.path.endsWith('.py')).every((file) => file.kind === 'other')).toBe(true);
    const map = mapOf(scan);
    expect(map.meta.instruments.unread).toEqual(['python: no python3 or python command on the PATH']);
    expect(map.terrain.cells).toEqual([]);
  } finally {
    vi.unstubAllEnvs();
  }
});
