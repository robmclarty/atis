import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertMap } from 'core';
import type { MapJson } from 'core';
import { hudBlocks } from 'svg';
import { afterAll, expect, test } from 'vitest';

import { COMMENT_MARKER, MAPS_BRANCH, commentBody } from '../comment.js';
import { commentRun } from '../run.js';

/**
 * `--comment` (D108): the body is a pure function of the map, golden-tested
 * from core's demo fixture with an image and without one. The run around it
 * is driven against a fake `gh`, a script that answers as `gh` does and keeps
 * the pull request's comments in a file beside it, and a bare repository
 * standing for `origin`, so no test reaches the network (C5): the image is
 * kept on `atis-maps` there, one comment is posted and then updated, and
 * with no `gh` or no PR the run exits 2 naming why (C4).
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, '..', '..', 'fixtures', 'comment');
const DEMO = assertMap(JSON.parse(readFileSync(join(HERE, '..', '..', '..', '..', 'libs', 'core', 'fixtures', 'demo', 'map.json'), 'utf8')));
const IMAGE = { url: 'https://github.com/owner/repo/raw/0123456789abcdef0123456789abcdef01234567/head.png', kind: 'png' } as const;
const MINUTE = 60_000;

const temps: string[] = [];
const temp = (prefix: string): string => {
  const dir = mkdtempSync(join(tmpdir(), `atis-comment-${prefix}-`));
  temps.push(dir);
  return dir;
};

afterAll(() => {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

/** The golden at `name`, written back under `ATIS_UPDATE_GOLDENS=1` and read before it is committed. */
const golden = (name: string, text: string): string => {
  const path = join(FIXTURES, name);
  if (process.env['ATIS_UPDATE_GOLDENS'] === '1') {
    mkdirSync(FIXTURES, { recursive: true });
    writeFileSync(path, text);
  }
  return readFileSync(path, 'utf8');
};

test("the demo's comment is its golden, with the image and without one, and the same text twice", () => {
  const body = commentBody(DEMO, IMAGE);
  expect(body).toBe(golden('demo.md', body));
  expect(commentBody(DEMO, IMAGE)).toBe(body);
  const text = commentBody(DEMO);
  expect(text).toBe(golden('demo-text.md', text));
  expect(text).not.toContain('![');
  expect(text).toContain('carries the map as text alone');
});

test("the comment opens on its marker, writes the sheet's HUD as a table, and every notice with its kind, why and thresholds (D108, D9)", () => {
  const body = commentBody(DEMO, IMAGE);
  const lines = body.split('\n');
  expect(lines[0]).toBe(COMMENT_MARKER);
  const table = lines.filter((line) => line.startsWith('| '));
  const blocks = hudBlocks(DEMO);
  expect(table).toHaveLength(3);
  for (const row of table) expect(row.split(' | ')).toHaveLength(blocks.length);
  for (const block of blocks) expect(table[2]).toContain(block.value);
  expect(body).toContain(`](${IMAGE.url})`);
  for (const [index, notice] of DEMO.notices.entries()) {
    expect(body).toContain(`${String(index + 1)}. **\``);
    expect(body).toContain(notice.why);
    expect(body).toContain(` · ${notice.kind} · ${notice.tier}<br>`);
  }
});

test('a file the change added is written with a + before its path, and a change with no notices says so', () => {
  const [first] = DEMO.notices;
  if (first === undefined) throw new Error('the demo has notices');
  const added: MapJson = { ...DEMO, weather: { ...DEMO.weather, changed: DEMO.weather.changed.map((file) => (file.path === first.target ? { ...file, kind: 'added' as const } : file)) } };
  expect(commentBody(added)).toContain(`1. **\`+${first.target}\`**`);
  expect(commentBody({ ...DEMO, notices: [] })).toContain('Nothing to look at first: the change raised no notice.');
});

/** git in `cwd`, with an author of its own. */
const git = (cwd: string, ...args: readonly string[]): string =>
  execFileSync('git', ['-c', 'user.name=atis', '-c', 'user.email=atis@example.invalid', '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8' }).trim();

/** A repository whose `main` holds one module and whose checked-out `feature` adds another, with a bare repository as its `origin`. */
const branch = (withOrigin = true): string => {
  const repo = temp('repo');
  git(repo, 'init', '--quiet', '--initial-branch=main');
  git(repo, 'config', 'user.name', 'atis');
  git(repo, 'config', 'user.email', 'atis@example.invalid');
  git(repo, 'config', 'commit.gpgsign', 'false');
  writeFileSync(join(repo, 'package.json'), '{ "name": "demo", "private": true, "type": "module" }\n');
  mkdirSync(join(repo, 'src'));
  writeFileSync(join(repo, 'src', 'shapes.ts'), 'export function area(width: number, height: number): number {\n  return width * height;\n}\n');
  git(repo, 'add', '.');
  git(repo, 'commit', '--quiet', '-m', 'feat: measure an area');
  git(repo, 'checkout', '--quiet', '-b', 'feature');
  writeFileSync(join(repo, 'src', 'square.ts'), "import { area } from './shapes.js';\n\nexport function square(side: number): number {\n  return area(side, side);\n}\n");
  git(repo, 'add', '.');
  git(repo, 'commit', '--quiet', '-m', 'feat: square a side');
  if (withOrigin) {
    const origin = temp('origin');
    git(origin, 'init', '--quiet', '--bare');
    git(repo, 'remote', 'add', 'origin', origin);
  }
  return repo;
};

/** A fake `gh`: it answers `--version`, `pr view`, and the `api` calls `--comment` makes, keeping the PR's comments in `state.json` beside it; a `no-pr` file beside it makes the branch have none. */
const FAKE_GH = `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const statePath = path.join(__dirname, 'state.json');
const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : { comments: [], calls: [] };
const args = process.argv.slice(2);
state.calls.push(args);
const save = () => fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
const answer = (text) => { save(); process.stdout.write(text); process.exit(0); };
const posted = (id) => answer(JSON.stringify({ id, html_url: 'https://github.com/owner/repo/pull/7#issuecomment-' + id }));
if (args[0] === '--version') answer('gh version 2.0.0 (fake)\\n');
if (args[0] === 'pr' && args[1] === 'view') {
  if (fs.existsSync(path.join(__dirname, 'no-pr'))) { save(); process.stderr.write('no pull requests found for branch "feature"\\n'); process.exit(1); }
  answer(JSON.stringify({ number: 7, url: 'https://github.com/owner/repo/pull/7', baseRefName: 'main' }));
}
if (args[0] === 'api' && args[1] === 'user') answer('rob\\n');
if (args[0] === 'api' && args[1] === '--paginate') answer(state.comments.filter((c) => c.user === 'rob' && c.body.startsWith('${COMMENT_MARKER}')).map((c) => c.id + '\\n').join(''));
if (args[0] === 'api' && args[1] === '-X') {
  const { body } = JSON.parse(fs.readFileSync(0, 'utf8'));
  if (args[2] === 'POST') { const id = state.comments.length + 1; state.comments.push({ id, user: 'rob', body }); posted(id); }
  const id = Number(args[3].split('/').pop());
  state.comments.find((c) => c.id === id).body = body;
  posted(id);
}
save();
process.stderr.write('fake gh: nothing answers ' + args.join(' ') + '\\n');
process.exit(1);
`;

type FakeGh = { readonly path: string; readonly state: () => { readonly comments: readonly { readonly id: number; readonly body: string }[]; readonly calls: readonly (readonly string[])[] } };

const fakeGh = (): FakeGh => {
  const dir = temp('gh');
  const path = join(dir, 'gh');
  writeFileSync(path, FAKE_GH);
  chmodSync(path, 0o755);
  return { path, state: () => JSON.parse(readFileSync(join(dir, 'state.json'), 'utf8')) as ReturnType<FakeGh['state']> };
};

/** No built app beside it, so the image is the still SVG and no browser is launched (D86). */
const unbuilt = (): string => join(temp('web'), 'web');

test("a --comment run keeps the image on origin's atis-maps, posts one comment on the branch's PR, and updates it on the next run (D108, Q38)", async () => {
  const repo = branch();
  const gh = fakeGh();
  const outcome = await commentRun({ repo, assets: unbuilt(), verbose: false, gh: gh.path });
  expect(outcome.stderr).toBe('');
  expect(outcome.exitCode).toBe(0);
  expect(outcome.stdout).toBe(`NOINST, 1 file changed, 0 notices, commented on https://github.com/owner/repo/pull/7#issuecomment-1 with its SVG on ${MAPS_BRANCH}\n`);

  // The change is measured over the PR's base, and its image is kept by its head on the orphan branch, the working tree untouched.
  const head = git(repo, 'rev-parse', 'HEAD');
  const origin = git(repo, 'remote', 'get-url', 'origin');
  const kept = git(origin, 'rev-parse', `refs/heads/${MAPS_BRANCH}`);
  expect(git(origin, 'ls-tree', '--name-only', kept)).toBe(`${head}.svg`);
  expect(git(origin, 'show', `${kept}:${head}.svg`)).toMatch(/^<svg /);
  expect(git(repo, 'status', '--porcelain')).toBe('');
  expect(git(origin, 'rev-list', '--count', kept)).toBe('1');

  const [comment] = gh.state().comments;
  expect(comment?.body.split('\n')[0]).toBe(COMMENT_MARKER);
  expect(comment?.body).toContain(`](https://github.com/owner/repo/raw/${kept}/${head}.svg)`);
  expect(comment?.body).toContain('`main` → `');

  // A second run updates the comment it posted rather than posting another, and keeps its image over the branch's tip.
  const again = await commentRun({ repo, assets: unbuilt(), verbose: false, gh: gh.path });
  expect(again.exitCode).toBe(0);
  expect(again.stdout).toContain('commented on https://github.com/owner/repo/pull/7#issuecomment-1 ');
  const state = gh.state();
  expect(state.comments).toHaveLength(1);
  expect(state.calls.filter((call) => call.includes('PATCH'))).toHaveLength(1);
  expect(state.calls.filter((call) => call.includes('POST'))).toHaveLength(1);
  const tip = git(origin, 'rev-parse', `refs/heads/${MAPS_BRANCH}`);
  expect(git(origin, 'rev-parse', `${tip}^`)).toBe(kept);
  expect(state.comments[0]?.body).toContain(`/raw/${tip}/${head}.svg)`);
}, MINUTE);

test('with no origin to keep the image on, the comment carries the map as text alone and says why (Q38)', async () => {
  const gh = fakeGh();
  const outcome = await commentRun({ repo: branch(false), assets: unbuilt(), verbose: false, gh: gh.path });
  expect(outcome.exitCode).toBe(0);
  expect(outcome.stdout).not.toContain(MAPS_BRANCH);
  expect(outcome.stderr).toMatch(/^atis: the comment carries no image, since atis-maps could not be pushed: /);
  expect(gh.state().comments[0]?.body).toContain('carries the map as text alone');
}, MINUTE);

test('with no gh, or no pull request for the branch, --comment exits 2 naming why, before it measures or posts anything (C4)', async () => {
  const repo = branch();
  const none = await commentRun({ repo, assets: unbuilt(), verbose: false, gh: join(temp('nowhere'), 'gh') });
  expect(none.exitCode).toBe(2);
  expect(none.stderr).toMatch(/^atis: --comment needs the GitHub CLI, gh, on the PATH \(https:\/\/cli\.github\.com\)/);

  const gh = fakeGh();
  writeFileSync(join(dirname(gh.path), 'no-pr'), '');
  const nopr = await commentRun({ repo, assets: unbuilt(), verbose: false, gh: gh.path });
  expect(nopr.exitCode).toBe(2);
  expect(nopr.stderr).toBe('atis: --comment found no pull request for this branch: no pull requests found for branch "feature"\n');
  expect(gh.state().calls.map((call) => call.slice(0, 2).join(' '))).toEqual(['--version', 'pr view']);
  expect(existsSync(join(repo, '.atis'))).toBe(false);
}, MINUTE);
