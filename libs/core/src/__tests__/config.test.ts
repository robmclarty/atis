import { expect, test } from 'vitest';

import { DEFAULT_EDITOR, configuredEditor, editorLink } from '../config.js';

/**
 * The editor link (D102) read as a browser reads it (D173): a browser trims
 * the C0 controls and spaces at a URL's ends, drops every tab and newline
 * inside it and lowercases its scheme, so a pattern read off the raw text
 * lets `java\tscript:` through to a page that holds the run's token (D134).
 */
const AT = { root: '/Users/reader/My Repo', path: 'src/a.ts', line: 7 } as const;

const configured = (editor: unknown): string | undefined => configuredEditor(JSON.stringify({ editor }));

test("VS Code's default, and an editor's or a forge's own template, still link", () => {
  expect(editorLink(DEFAULT_EDITOR, AT)).toBe('vscode://file/Users/reader/My%20Repo/src/a.ts:7');
  expect(editorLink('zed://file{root}/{path}:{line}', AT)).toBe('zed://file/Users/reader/My%20Repo/src/a.ts:7');
  expect(editorLink('https://forge.example/o/r/blob/main/{path}#L{line}', AT)).toBe('https://forge.example/o/r/blob/main/src/a.ts#L7');
  expect(configured('zed://file{root}/{path}:{line}')).toBe('zed://file{root}/{path}:{line}');
  expect(configuredEditor(undefined)).toBeUndefined();
  expect(configuredEditor('{ "trunk": "main" }')).toBeUndefined();
});

test('a template whose scheme runs or reads what it holds builds no link, however it is spelled', () => {
  const spellings = [
    'javascript:alert(1)//{path}',
    'java\tscript:alert(1)//{path}',
    'java\nscript:alert(1)//{path}',
    'java\r\nscript:alert(1)//{path}',
    'JavaScript:alert(1)//{path}',
    'JAVA\tSCRIPT:alert(1)//{path}',
    ' javascript:alert(1)//{path}',
    '\u0000\u001f javascript:alert(1)//{path}',
    'data:text/html,{path}',
    ' Data:text/html,{path}',
    'vbscript:msgbox(1)//{path}',
    'blob:http://127.0.0.1/{path}',
    'file://{root}/{path}',
    'FILE:{root}/{path}',
  ];
  for (const template of spellings) expect(editorLink(template, AT), JSON.stringify(template)).toBeUndefined();
});

test('a link names a scheme only where a browser would read one, so a file named like a scheme opens as itself', () => {
  // A path's colon is escaped, so the filled link has no scheme and resolves against the page.
  expect(editorLink('{path}', { root: '/r', path: 'javascript:alert(1)', line: 1 })).toBe('javascript%3Aalert(1)');
  // A scheme opens with a letter and runs to its first colon: a digit first, or a control inside, is no scheme at all.
  expect(editorLink('{line}javascript:{path}', AT)).toBe('7javascript:src/a.ts');
  expect(editorLink('vscode-insiders://file{root}/{path}:{line}', AT)).toBe('vscode-insiders://file/Users/reader/My%20Repo/src/a.ts:7');
});

test("atis.config.json's editor in an unsafe scheme, however spelled, is misuse that names the scheme (C4)", () => {
  expect(() => configured('JavaScript:alert(1)//{path}')).toThrow('never a javascript: link');
  expect(() => configured(' Data:text/html,{path}')).toThrow('never a data: link');
  expect(() => configured('file://{root}/{path}')).toThrow('never a file: link');
});

test("atis.config.json's editor holding a control character is misuse, a tab or newline in its scheme included (C4)", () => {
  for (const editor of ['java\tscript:alert(1)//{path}', 'java\nscript:alert(1)//{path}', 'vscode://file{root}/{path}:{line}\r', '\u0000vscode://file{root}/{path}', 'vscode://file{root}/{path}\u007f', 'vscode://file{root}/{path}\u0085']) {
    expect(() => configured(editor), JSON.stringify(editor)).toThrow('must hold no control character');
  }
});
