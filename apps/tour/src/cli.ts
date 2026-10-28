#!/usr/bin/env node
/**
 * cli: the tour's bin, run as `pnpm --filter tour start <map.json>` (D183).
 * pnpm runs it from `apps/tour`, so paths are read from the directory the
 * command was typed in, which pnpm passes as `INIT_CWD`. The model's engine
 * is fascicle's, and the Claude Code CLI it may start runs in a scratch
 * directory of its own, outside the repository (D182).
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { create_engine } from 'fascicle';

import { tourCommand } from './command.js';

process.exitCode = await tourCommand(process.argv.slice(2), {
  env: process.env,
  cwd: process.env['INIT_CWD'] ?? process.cwd(),
  out: (line) => process.stdout.write(`${line}\n`),
  engineOf: create_engine,
  scratch: () => {
    const path = mkdtempSync(join(tmpdir(), 'atis-tour-'));
    return { path, remove: () => rmSync(path, { recursive: true, force: true }) };
  },
});
