/**
 * comment: the map posted to the branch's pull request (D108). It is one of
 * the two commands that reach the network, and only when typed (C5): it finds
 * the branch's PR with `gh`, and posts one comment there, or updates the one
 * it posted before, which it knows by a marker on its first line. The body
 * is built by `commentBody`, a pure function of the map: the HUD as a
 * markdown table in the sheet's own words (`hudBlocks`), the image, and the
 * notices, each with its kind, its why and the thresholds that produced it
 * (D9), so the comment says what both renderers say.
 *
 * A PR comment can link an image but not upload one, so the image is kept in
 * the repository itself, as Q38's lean has it: one file per head commit on an
 * orphan branch, `atis-maps`, written with git's plumbing so the working tree
 * and the index are never touched, and pushed to `origin`. It is the PNG the
 * headless world captures (D105) as a cinema still, the world alone framed
 * on what the change is about, when a browser and the built app are there,
 * else the still SVG (D86, D145). The comment links it by the commit that
 * holds it, so a later push never changes an older comment's picture, and its
 * footer says where it lives. With no image to link, the push refused, the
 * comment carries the HUD and the notices as text alone.
 */

import { execFile } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { MapJson, Notice } from 'core';
import { hudBlocks, thresholdsOf } from 'svg';
import type { HudBlock } from 'svg';

/** The first line of every comment atis posts: how a later run finds the one to update. */
export const COMMENT_MARKER = '<!-- atis:map -->';

/** The orphan branch the comment's images are kept on, one file per head commit (Q38). */
export const MAPS_BRANCH = 'atis-maps';

/** The image a comment links: where it is served from, and what it is. */
export type CommentImage = { readonly url: string; readonly kind: 'png' | 'svg' };

/** A sha as the comment names it. */
const short = (sha: string): string => (/^[0-9a-f]{40,64}$/.test(sha) ? sha.slice(0, 7) : sha);

/** A table cell's text, its pipes escaped so they stay inside the cell. */
const cell = (text: string): string => text.replaceAll('|', '\\|');

/** One HUD block's cell: the value in bold and the tail after it, or the dash alone when the block is muted (C2). */
const valueOf = (block: HudBlock): string => cell(block.muted === undefined ? `**${block.value}**${block.tail}` : block.value);

/** The HUD as a two-row table: each block's label over its value (D108). */
const hudTable = (map: MapJson): readonly string[] => {
  const blocks = hudBlocks(map);
  return [
    `| ${blocks.map((block) => cell(block.label === '' ? 'Category' : block.label)).join(' | ')} |`,
    `| ${blocks.map(() => ':-:').join(' | ')} |`,
    `| ${blocks.map(valueOf).join(' | ')} |`,
  ];
};

/** One notice as a numbered item: its target, `+` first when the change added it (D120), its kind and tier, its why, and its thresholds (D9). */
const noticeItem =
  (added: ReadonlySet<string>) =>
  (notice: Notice, index: number): readonly string[] => {
    const thresholds = thresholdsOf(notice);
    return [
      `${String(index + 1)}. **\`${added.has(notice.target) ? '+' : ''}${notice.target}\`** · ${notice.kind} · ${notice.tier}<br>`,
      `   ${notice.why}${thresholds === '' ? '' : '<br>'}`,
      ...(thresholds === '' ? [] : [`   <sub>${thresholds}</sub>`]),
    ];
  };

/**
 * The comment's markdown for a map (D108): the marker, the category and the
 * change it reads, the HUD as a table, the image when there is one, the
 * notices with their whys and thresholds, and a footer naming the sides and
 * where the image is kept. The same map and image give the same text.
 */
export function commentBody(map: MapJson, image?: CommentImage): string {
  const { meta, weather, notices } = map;
  const added = new Set(weather.changed.flatMap((file) => (file.kind === 'added' ? [file.path] : [])));
  const base = meta.base ?? 'the trunk';
  const kept = image === undefined ? 'no image could be kept with this comment, so it carries the map as text alone' : `the image is kept on this repository's \`${MAPS_BRANCH}\` branch, which only \`atis --comment\` writes`;
  return [
    COMMENT_MARKER,
    `### atis · ${weather.checks.category}`,
    '',
    `\`${base}\` → \`${short(meta.head)}\` · ${String(weather.changed.length)} ${weather.changed.length === 1 ? 'file' : 'files'} changed · ${String(notices.length)} ${notices.length === 1 ? 'notice' : 'notices'}`,
    '',
    ...hudTable(map),
    '',
    ...(image === undefined ? [] : [`![the weather map of this change at ${short(meta.head)}](${image.url})`, '']),
    ...(notices.length === 0 ? ['Nothing to look at first: the change raised no notice.'] : ['#### Look here first', '', ...notices.flatMap(noticeItem(added))]),
    '',
    `<sub>atis · \`${base}\`, merge base \`${short(meta.merge_base)}\`, to \`${short(meta.head)}\` · ${kept} · run \`atis --comment\` again to update this comment</sub>`,
    '',
  ].join('\n');
}

/** What a command answered: its exit, its output and its complaint. */
export type Answered = { readonly code: number; readonly stdout: string; readonly stderr: string };

/** Run a command in `cwd`, handing `input` to its stdin; a command that is not there answers with code -1 rather than throwing. */
export const runCommand = (command: string, args: readonly string[], cwd: string, input?: string, env?: NodeJS.ProcessEnv): Promise<Answered> =>
  new Promise((done) => {
    const child = execFile(command, args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...(env === undefined ? {} : { env }) }, (error, stdout, stderr) => {
      const code = error === null ? 0 : typeof error.code === 'number' ? error.code : -1;
      done({ code, stdout, stderr: error !== null && code === -1 && stderr === '' ? error.message : stderr });
    });
    if (input !== undefined) child.stdin?.end(input);
  });

/** The pull request a branch has open, as `gh pr view` names it. */
export type PullRequest = { readonly number: number; readonly url: string; readonly base: string; readonly owner: string; readonly name: string };

/** The PR's owner and repository, from its URL on the forge. */
const PR_URL = /^https:\/\/[^/]+\/([^/]+)\/([^/]+)\/pull\/\d+$/;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A JSON object a command printed, or none when it printed something else. */
const parsed = (text: string): Readonly<Record<string, unknown>> | undefined => {
  try {
    const value: unknown = JSON.parse(text);
    return isRecord(value) ? value : undefined;
  } catch {
    return undefined;
  }
};

/** The first line of a command's complaint, for a message. */
const firstLine = (text: string): string => text.trim().split('\n')[0] ?? '';

/**
 * The branch's pull request through `gh` (D108): a machine with no `gh`, a
 * `gh` that is not signed in, or a branch with no PR throws, naming why, and
 * the run exits 2 on it (C4).
 */
export const findPullRequest = async (gh: string, repo: string): Promise<PullRequest> => {
  const version = await runCommand(gh, ['--version'], repo);
  if (version.code === -1) throw new Error(`--comment needs the GitHub CLI, gh, on the PATH (https://cli.github.com): ${firstLine(version.stderr)}`);
  const viewed = await runCommand(gh, ['pr', 'view', '--json', 'number,url,baseRefName'], repo);
  if (viewed.code !== 0) throw new Error(`--comment found no pull request for this branch: ${firstLine(viewed.stderr) || 'gh pr view failed'}`);
  const pr = parsed(viewed.stdout);
  const { number, url, baseRefName: base } = pr ?? {};
  const parts = typeof url === 'string' ? PR_URL.exec(url) : null;
  if (typeof number !== 'number' || typeof url !== 'string' || typeof base !== 'string' || parts === null) throw new Error(`--comment could not read gh's pull request: ${viewed.stdout.trim()}`);
  return { number, url, base, owner: parts[1] ?? '', name: parts[2] ?? '' };
};

/** git in `repo`, failing with its complaint; the image's index, when named, stands in for the repository's own. */
const git = async (repo: string, args: readonly string[], index?: string): Promise<string> => {
  const answered = await runCommand('git', args, repo, undefined, index === undefined ? undefined : { ...process.env, GIT_INDEX_FILE: index });
  if (answered.code !== 0) throw new Error(`git ${args[0] ?? ''} failed: ${firstLine(answered.stderr)}`);
  return answered.stdout.trim();
};

/**
 * Keep an image on `origin`'s `atis-maps` branch (Q38) and say the commit
 * that holds it: the branch's tip fetched if it has one, the image added to
 * its tree as `<head>.<kind>` in an index of its own, committed over the tip
 * and pushed, so neither the working tree nor the repository's index moves.
 */
export const keepImage = async (repo: string, head: string, file: string, kind: CommentImage['kind']): Promise<string> => {
  const fetched = await runCommand('git', ['fetch', '--quiet', 'origin', `refs/heads/${MAPS_BRANCH}`], repo);
  const parent = fetched.code === 0 ? await git(repo, ['rev-parse', 'FETCH_HEAD']) : undefined;
  const scratch = mkdtempSync(join(tmpdir(), 'atis-maps-'));
  try {
    const index = join(scratch, 'index');
    const blob = await git(repo, ['hash-object', '-w', '--', file]);
    await git(repo, parent === undefined ? ['read-tree', '--empty'] : ['read-tree', parent], index);
    await git(repo, ['update-index', '--add', '--cacheinfo', `100644,${blob},${head}.${kind}`], index);
    const tree = await git(repo, ['write-tree'], index);
    const commit = await git(repo, ['commit-tree', tree, ...(parent === undefined ? [] : ['-p', parent]), '-m', `atis: the map of ${short(head)}`]);
    await git(repo, ['push', '--quiet', 'origin', `${commit}:refs/heads/${MAPS_BRANCH}`]);
    return commit;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
};

/** Where the forge serves a file kept on the maps branch, pinned to the commit that holds it. */
export const imageUrl = (pr: PullRequest, commit: string, head: string, kind: CommentImage['kind']): string =>
  `https://github.com/${pr.owner}/${pr.name}/raw/${commit}/${head}.${kind}`;

/** Write an image's bytes to a scratch file, for git to read. */
export const scratchFile = (dir: string, name: string, bytes: string | Uint8Array): string => {
  const file = join(dir, name);
  writeFileSync(file, bytes);
  return file;
};

/**
 * Post `body` to the pull request, or update the comment atis posted there
 * before: the one whose body opens with the marker, written by whoever `gh`
 * is signed in as. Says the comment's URL.
 */
export const postComment = async (gh: string, repo: string, pr: PullRequest, body: string): Promise<string> => {
  const api = async (args: readonly string[], input?: string): Promise<string> => {
    const answered = await runCommand(gh, ['api', ...args], repo, input);
    if (answered.code !== 0) throw new Error(`gh api ${args.join(' ')} failed: ${firstLine(answered.stderr)}`);
    return answered.stdout;
  };
  const login = (await api(['user', '--jq', '.login'])).trim();
  const issue = `repos/${pr.owner}/${pr.name}/issues`;
  const mine = `.[] | select(.user.login == ${JSON.stringify(login)} and (.body | startswith(${JSON.stringify(COMMENT_MARKER)}))) | .id`;
  const id = (await api(['--paginate', `${issue}/${String(pr.number)}/comments`, '--jq', mine])).split('\n').find((line) => line.trim() !== '');
  const payload = JSON.stringify({ body });
  const answered = id === undefined ? await api(['-X', 'POST', `${issue}/${String(pr.number)}/comments`, '--input', '-'], payload) : await api(['-X', 'PATCH', `${issue}/comments/${id.trim()}`, '--input', '-'], payload);
  const link = parsed(answered)?.['html_url'];
  return typeof link === 'string' ? link : pr.url;
};
