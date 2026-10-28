/**
 * scanned: what the CLI's TypeScript producer says of a path, for tests that
 * build a scan by hand. Core reads no extension (D114), so a hand-built scan
 * names each file's kind and barrel as a producer would; this restates the
 * TypeScript producer's rule for strings. `typescriptKind` in `apps/atis` is
 * the rule itself, tested there.
 */

import type { FileKind, ScannedFile } from '../modules.js';

const TYPESCRIPT = /\.(?:[cm]?ts|tsx)$/;
const TEST = /\.(?:test|spec)\.(?:[cm]?ts|tsx)$|(?:^|\/)(?:__tests__|test)\//;
const BARREL = /(?:^|\/)index\.tsx?$/;

/** A path's kind as the TypeScript producer gives it: a test by its name or folder (D4), other TypeScript source, and anything else other. */
function kindOf(path: string): FileKind {
  if (!TYPESCRIPT.test(path)) return 'other';
  return TEST.test(path) ? 'test' : 'source';
}

/** A path's kind, and its barrel flag where it is its directory's `index.ts` or `index.tsx`. */
export function typed(path: string): Pick<ScannedFile, 'path' | 'kind' | 'barrel'> {
  const kind = kindOf(path);
  return kind === 'source' && BARREL.test(path) ? { path, kind, barrel: true } : { path, kind };
}
