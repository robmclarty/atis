import { expect, test } from 'vitest';

import { CLAUDE_CLI_ARGS, PROVIDERS, isProvider, planFor } from '../providers.js';

/**
 * Which engine the tour's one call runs on (D177): `claude_cli` by default,
 * the user's own logged-in CLI with no key, started outside the repository
 * with its tools and MCP servers off so it reads the prompt alone (D182); an
 * API provider on fascicle's native transport with its key from the
 * environment; and a refusal, never a guess, when a key or a model is
 * missing.
 */

test('claude_cli runs the logged-in CLI in the scratch directory with its tools off, sonnet unless a model is named', () => {
  expect(planFor('claude_cli', undefined, {}, '/tmp/scratch')).toEqual({
    engine: { providers: { claude_cli: { auth_mode: 'oauth', default_cwd: '/tmp/scratch' } } },
    call: { provider: 'claude_cli', model: 'sonnet', options: { claude_cli: { tool_bridge: 'forbid', extra_args: CLAUDE_CLI_ARGS } } },
  });
  // A key in the environment changes nothing: the CLI is the user's session.
  expect(planFor('claude_cli', 'opus', { ANTHROPIC_API_KEY: 'sk-test' }, '/tmp/scratch')).toMatchObject({ call: { model: 'opus' } });
  expect(CLAUDE_CLI_ARGS.slice(-2)).toEqual(['--tools', '']);
});

test('an API provider takes its key from the environment on the native transport, and refuses without a key or a model', () => {
  expect(planFor('anthropic', undefined, { ANTHROPIC_API_KEY: 'sk-a' }, '/tmp')).toEqual({ engine: { providers: { anthropic: { api_key: 'sk-a', transport: 'native' } } }, call: { provider: 'anthropic', model: 'claude-sonnet-5-5' } });
  expect(planFor('openai', 'gpt-test', { OPENAI_API_KEY: 'sk-o' }, '/tmp')).toEqual({ engine: { providers: { openai: { api_key: 'sk-o', transport: 'native' } } }, call: { provider: 'openai', model: 'gpt-test' } });
  expect(planFor('openrouter', 'some/model', { OPENROUTER_API_KEY: 'sk-r' }, '/tmp')).toEqual({ engine: { providers: { openrouter: { api_key: 'sk-r', transport: 'native' } } }, call: { provider: 'openrouter', model: 'some/model' } });
  expect(planFor('openai', undefined, { OPENAI_API_KEY: 'sk-o' }, '/tmp')).toEqual({ refused: '--provider openai needs --model <id>' });
  expect(planFor('openrouter', 'some/model', { OPENROUTER_API_KEY: '' }, '/tmp')).toEqual({ refused: '--provider openrouter reads its key from OPENROUTER_API_KEY, which is not set' });
  expect(PROVIDERS.filter((name) => isProvider(name))).toEqual(PROVIDERS);
  expect(isProvider('gemini')).toBe(false);
});
