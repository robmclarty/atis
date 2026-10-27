/**
 * bundle: the package's JavaScript as the tarball ships it (D109). Vite, with
 * Rolldown beneath it, bundles the `bin` and the library entry from their
 * sources. Core, svg and scene resolve through the `source` condition (D20)
 * and are inlined with the code they carry, so `dist/` needs no workspace
 * package at runtime and no `tsc --build` of the libs before it. What the
 * package's `dependencies` name stays an import, as do Node's builtins, and
 * the licenses of what was inlined are written beside the bundle. tsc writes
 * only the declarations there, so every script under the out directory is a
 * bundle's, and a past one is cleared before the next is written.
 *
 *   node scripts/bundle.ts [--out <dir>]   (default: the package's dist/)
 */

import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { isBuiltin } from 'node:module';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { build } from 'vite';

const PACKAGE = fileURLToPath(new URL('..', import.meta.url));

/** The names the package's manifest installs beside it: the only bare imports the bundle may keep. */
function dependencies(): readonly string[] {
  const manifest: unknown = JSON.parse(readFileSync(join(PACKAGE, 'package.json'), 'utf8'));
  const declared = typeof manifest === 'object' && manifest !== null && 'dependencies' in manifest ? manifest.dependencies : undefined;
  return typeof declared === 'object' && declared !== null ? Object.keys(declared) : [];
}

/** Every script and its map under `dir`, a past bundle's or a past tsc's, removed; the declarations stay. */
function clearScripts(dir: string): void {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true, recursive: true })) {
    if (entry.isFile() && /\.js(?:\.map)?$/.test(entry.name)) rmSync(join(entry.parentPath, entry.name));
  }
}

const { values } = parseArgs({ options: { out: { type: 'string' } } });
const out = resolve(values.out ?? join(PACKAGE, 'dist'));
const installed = dependencies();
const external = (id: string): boolean => isBuiltin(id) || installed.some((name) => id === name || id.startsWith(`${name}/`));

clearScripts(out);

await build({
  root: PACKAGE,
  configFile: false,
  logLevel: 'warn',
  mode: 'production',
  ssr: {
    noExternal: true,
    resolve: { conditions: ['source', 'module', 'node', 'development|production'] },
  },
  build: {
    ssr: true,
    target: 'node22',
    outDir: out,
    emptyOutDir: false,
    minify: false,
    sourcemap: false,
    copyPublicDir: false,
    reportCompressedSize: false,
    license: { fileName: 'licenses.md' },
    rolldownOptions: {
      input: { cli: join(PACKAGE, 'src', 'cli.ts'), index: join(PACKAGE, 'src', 'index.ts') },
      external,
      output: { entryFileNames: '[name].js', chunkFileNames: 'atis.js' },
    },
  },
});
