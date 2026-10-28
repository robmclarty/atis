import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson } from 'core';
import type { Engine, EngineConfig, GenerateOptions } from 'fascicle';
import { make_stub_engine, text_of } from 'fascicle/testing';
import { afterEach, beforeEach, expect, test } from 'vitest';

import { cachePath } from '../cache.js';
import { tourCommand } from '../command.js';
import type { TourIo } from '../command.js';
import { CLAUDE_CLI_ARGS } from '../providers.js';
import { TOUR_SYSTEM, writeTour } from '../tour.js';

/**
 * The tour run whole on fascicle's stub engine (D112, D177, D182, D183): on
 * the demo map it writes `tour.json` byte for byte as the golden holds it,
 * the base and head the map was written for and then the stops in the order
 * the model gave them, and says which provider and model the engine reports
 * it called. The prompt is golden too, so what the model reads of a map, and
 * that it is the map alone, is pinned: paths, names, line numbers and the
 * notices, never a line of code. Asked again for the same base and head, it
 * takes the tour `.atis/tours/` keeps and calls nothing. The goldens are
 * written back under `ATIS_UPDATE_GOLDENS=1` and read before committing.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO_MAP = join(HERE, '..', '..', '..', '..', 'libs', 'core', 'fixtures', 'demo', 'map.json');
const GOLDEN = join(HERE, '..', '..', 'fixtures', 'demo');
const DEMO: MapJson = assertMap(JSON.parse(readFileSync(DEMO_MAP, 'utf8')));

/** The demo's stops as a model might order them: the barrel's interface first, then what the change did beneath it. */
const STOPS = {
  stops: [
    { notice: 2, target: 'libs/core/src/pm/index.ts', sentence: "Start at pm's barrel, which no longer exports legacyResolve while a file still imports it, because the rest of the change hangs off that interface." },
    { notice: 4, target: 'libs/core/src/pm/index.ts', sentence: 'The same barrel adds resolveTool for the two files that read it, so read the new name against the one it drops.' },
    { notice: 1, target: 'libs/core/src/pm/index.ts', sentence: 'The test check is red on the barrel, and it comes after the interface because the dropped export may be what breaks it.' },
    { notice: 3, target: 'libs/core/src/pm/index.ts', sentence: 'Five changed lines there ran under no test while the change reaches four cells, so the uncovered reach starts at the barrel too.' },
    { notice: 6, target: 'libs/core/src/pm/tools.ts', sentence: 'tools.ts is red as well, and it comes once the barrel that exports its names is read.' },
    { notice: 5, target: 'apps/cli/src/doctor.ts', sentence: 'doctor.ts changed 136 lines in a file that churns and often takes fixes, and it comes last as the caller the change lands on.' },
  ],
};

let root: string;
let mapPath: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tour-test-'));
  // The map sits in a repository of its own, which keeps the tour.
  mkdirSync(join(root, '.git'));
  mapPath = join(root, 'map.json');
  cpSync(DEMO_MAP, mapPath);
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

/** The command's world: no environment, typed in the repository, lines kept, the engine made by `engineOf`, and a scratch directory that says whether it was cleared. */
const ioOf = (engineOf: (config: EngineConfig) => Engine): TourIo & { readonly lines: string[]; readonly scratches: string[] } => {
  const lines: string[] = [];
  const scratches: string[] = [];
  return {
    env: {},
    cwd: root,
    out: (line) => lines.push(line),
    engineOf,
    scratch: () => {
      const path = mkdtempSync(join(tmpdir(), 'tour-scratch-'));
      scratches.push(path);
      return { path, remove: () => rmSync(path, { recursive: true, force: true }) };
    },
    lines,
    scratches,
  };
};

/** Every string a JSON value holds, however deep. */
const strings = (value: unknown): readonly string[] => (typeof value === 'string' ? [value] : Array.isArray(value) ? value.flatMap(strings) : typeof value === 'object' && value !== null ? Object.values(value).flatMap(strings) : []);

/** An engine maker for a run that must make none. */
const none = (): Engine => {
  throw new Error('no engine is made');
};

/** Run the command, and read its exit code and its lines. */
const runOf = async (argv: readonly string[], io = ioOf(none)): Promise<readonly [number, string]> => [await tourCommand(argv, io), io.lines.join('\n')];

/** The golden at `name`, written back under `ATIS_UPDATE_GOLDENS=1`. */
const golden = (name: string, actual: string): string => {
  const path = join(GOLDEN, name);
  if (process.env['ATIS_UPDATE_GOLDENS'] === '1') {
    mkdirSync(GOLDEN, { recursive: true });
    writeFileSync(path, actual);
  }
  return readFileSync(path, 'utf8');
};

test('on the stub engine the demo map gets the tour the golden holds, written beside the map and kept by its head, and the command names the provider and the model the engine reports', async () => {
  const configs: EngineConfig[] = [];
  const io = ioOf((config) => {
    configs.push(config);
    return make_stub_engine([{ prefix: 'atis/tour', content: STOPS }], { model_id: 'stub-model' });
  });
  expect(await tourCommand(['map.json'], io)).toBe(0);
  const written = readFileSync(join(root, 'tour.json'), 'utf8');
  expect(written).toBe(golden('tour.json', written));
  expect(JSON.parse(written)).toMatchObject({ base: 'main', head: DEMO.meta.head });
  // claude_cli is the default, logged in by the user's own session, no key (D177).
  expect(configs).toEqual([{ providers: { claude_cli: { auth_mode: 'oauth', default_cwd: io.scratches[0] } } }]);
  expect(io.lines[0]).toBe(`tour: asking claude_cli · sonnet for a tour of main..a1b2c3d4e5f6's 6 notices, sending the map alone, never the code or its diff`);
  expect(io.lines[1]).toBe('tour: stub · stub-model answered with 6 stops');
  const kept = cachePath(root, DEMO.meta.head) ?? '';
  expect(io.lines.slice(2)).toEqual([`tour: wrote ${join(root, 'tour.json')}`, `tour: kept it at ${kept}`]);
  expect(readFileSync(kept, 'utf8')).toBe(written);
  expect(readFileSync(join(root, '.atis', '.gitignore'), 'utf8')).toBe('*\n');
  // The CLI's scratch directory is cleared once the call is done.
  expect(existsSync(io.scratches[0] ?? '')).toBe(false);

  // Asked again for the same base and head, the kept tour is written and no engine is made.
  const again = ioOf(none);
  rmSync(join(root, 'tour.json'));
  expect(await tourCommand(['map.json', '--out', 'again.json'], again)).toBe(0);
  expect(readFileSync(join(root, 'again.json'), 'utf8')).toBe(written);
  expect(again.lines[0]).toBe(`tour: ${kept} already keeps the tour of main..a1b2c3d4e5f6, so no model was called`);
  // A tour kept for another base is no tour of this map's, so it is asked for again.
  writeFileSync(kept, written.replace('"base": "main"', '"base": "develop"'));
  const rebased = ioOf(() => make_stub_engine([{ prefix: 'atis/tour', content: STOPS }]));
  expect(await tourCommand(['map.json'], rebased)).toBe(0);
  expect(rebased.lines[0]).toContain('asking claude_cli');
  expect(readFileSync(kept, 'utf8')).toBe(written);
});

test("the model is sent the map alone, as the golden prompt holds it, under the tour's system and through a CLI with its tools off (D182)", async () => {
  const calls: GenerateOptions[] = [];
  const engine = make_stub_engine([
    {
      prefix: 'atis/tour',
      content: (opts) => {
        calls.push(opts);
        return STOPS;
      },
    },
  ]);
  const io = ioOf(() => engine);
  expect(await tourCommand(['map.json'], io)).toBe(0);
  expect(calls).toHaveLength(1);
  const [call] = calls;
  if (call === undefined) throw new Error('the model was not called');
  const prompt = text_of(call);
  expect(prompt).toBe(golden('prompt.txt', prompt));
  expect(call.system).toBe(TOUR_SYSTEM);
  expect(call.provider_options).toEqual({ claude_cli: { tool_bridge: 'forbid', extra_args: CLAUDE_CLI_ARGS } });
  expect(CLAUDE_CLI_ARGS).toEqual(['--strict-mcp-config', '--tools', '']);
  // Every string the prompt carries is a path, a name, a kind or a why the map holds, and nothing else.
  const digest: unknown = JSON.parse(prompt.slice(prompt.indexOf('\n\n') + 2));
  const mapped = new Set(strings(DEMO));
  expect(strings(digest).filter((text) => !mapped.has(text))).toEqual([]);
});

test('a map with no notices gets a tour with no stops, and calls no model', async () => {
  writeFileSync(mapPath, JSON.stringify({ ...DEMO, notices: [] }));
  const io = ioOf(none);
  expect(await tourCommand(['map.json'], io)).toBe(0);
  expect(JSON.parse(readFileSync(join(root, 'tour.json'), 'utf8'))).toEqual({ base: 'main', head: DEMO.meta.head, stops: [] });
  expect(io.lines[0]).toContain('holds no notices');
  const written = await writeTour({ ...DEMO, notices: [] }, make_stub_engine([]), { provider: 'claude_cli', model: 'sonnet' });
  expect(written).toEqual({ tour: { base: 'main', head: DEMO.meta.head, stops: [] } });
});

test('a working tree names no commit, so its tour is written but never kept', async () => {
  writeFileSync(mapPath, JSON.stringify({ ...DEMO, meta: { ...DEMO.meta, head: 'working-tree' } }));
  const io = ioOf(() => make_stub_engine([{ prefix: 'atis/tour', content: STOPS }]));
  expect(await tourCommand(['map.json'], io)).toBe(0);
  expect(io.lines.at(-1)).toBe('tour: a working tree names no commit, so the tour is not kept');
  expect(existsSync(join(root, '.atis'))).toBe(false);
});

test('misuse and a map it cannot read exit 2, a failed call exits 1, and --help prints the usage (C4)', async () => {
  expect(await runOf([])).toEqual([2, expect.stringContaining('tour: name one map.json')]);
  expect(await runOf(['map.json', 'other.json'])).toEqual([2, expect.stringContaining('name one map.json')]);
  expect(await runOf(['map.json', '--provider', 'gemini'])).toEqual([2, expect.stringContaining('--provider is one of claude_cli, anthropic, openai, openrouter, not gemini')]);
  expect(await runOf(['map.json', '--colour'])).toEqual([2, expect.stringContaining("Unknown option '--colour'")]);
  expect(await runOf(['map.json', '--provider', 'openai'])).toEqual([2, 'tour: --provider openai needs --model <id>']);
  expect(await runOf(['map.json', '--provider', 'anthropic'])).toEqual([2, 'tour: --provider anthropic reads its key from ANTHROPIC_API_KEY, which is not set']);
  writeFileSync(join(root, 'broken.json'), '{"meta":{}}');
  expect((await runOf(['broken.json']))[0]).toBe(2);
  expect(await runOf(['missing.json'])).toEqual([2, expect.stringContaining(`tour: ${join(root, 'missing.json')} is not an atis map`)]);
  expect(await runOf(['--help'])).toEqual([0, expect.stringContaining('pnpm --filter tour start <map.json>')]);
  // A model that answers with a stop the map does not hold fails the call, after fascicle's repair pass.
  const wrong = { stops: STOPS.stops.map((stop, index) => (index === 0 ? { ...stop, target: 'nowhere.ts' } : stop)) };
  const failed = ioOf(() => make_stub_engine([{ prefix: 'atis/tour', content: wrong }]));
  const [code, lines] = await runOf(['map.json'], failed);
  expect(code).toBe(1);
  expect(lines).toContain('tour: the call to claude_cli · sonnet failed:');
  expect(existsSync(join(root, 'tour.json'))).toBe(false);
  expect(existsSync(failed.scratches[0] ?? '')).toBe(false);
});

test('an API provider is called with its key from the environment, and the repository and the output can be named', async () => {
  const configs: EngineConfig[] = [];
  const io = { ...ioOf((config) => (configs.push(config), make_stub_engine([{ prefix: 'atis/tour', content: STOPS }]))), env: { ANTHROPIC_API_KEY: 'sk-test' } };
  const elsewhere = mkdtempSync(join(tmpdir(), 'tour-repo-'));
  try {
    expect(await tourCommand(['map.json', '--provider', 'anthropic', '--repo', elsewhere, '--out', 'out/../named.json'], io)).toBe(0);
    expect(configs).toEqual([{ providers: { anthropic: { api_key: 'sk-test', transport: 'native' } } }]);
    expect(io.lines[0]).toContain('asking anthropic · claude-sonnet-5-5');
    expect(existsSync(join(root, 'named.json'))).toBe(true);
    expect(existsSync(cachePath(elsewhere, DEMO.meta.head) ?? '')).toBe(true);
  } finally {
    rmSync(elsewhere, { recursive: true, force: true });
  }
});
