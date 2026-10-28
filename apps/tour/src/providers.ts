/**
 * providers: which engine the tour's one call runs on (D177). By default it
 * is fascicle's `claude_cli`, which drives the Claude Code CLI the user is
 * already logged into, with no API key: started in a scratch directory
 * outside the repository, with every tool of its own switched off and no MCP
 * server, so the model reads the prompt and nothing else, and never the code
 * (D182). `--provider` takes an API provider instead, on fascicle's native
 * transport so no SDK comes with it, its key read from the environment.
 * Pure: the caller makes the scratch directory and the engine.
 */

import type { EngineConfig } from 'fascicle';

import type { Call } from './tour.js';

/** The providers the tour can call, the default first. */
export const PROVIDERS = ['claude_cli', 'anthropic', 'openai', 'openrouter'] as const;
export type Provider = (typeof PROVIDERS)[number];

export const isProvider = (name: string): name is Provider => (PROVIDERS as readonly string[]).includes(name);

/** The model each provider calls when `--model` names none; a provider with none here needs `--model`. */
export const DEFAULT_MODELS: Readonly<Partial<Record<Provider, string>>> = { claude_cli: 'sonnet', anthropic: 'claude-sonnet-5-5' };

/** Where each API provider's key is read from. */
export const KEYS: Readonly<Record<Exclude<Provider, 'claude_cli'>, string>> = { anthropic: 'ANTHROPIC_API_KEY', openai: 'OPENAI_API_KEY', openrouter: 'OPENROUTER_API_KEY' };

/** The CLI's own flags for the call: no MCP server, and every built-in tool off, the last so its list ends the line. */
export const CLAUDE_CLI_ARGS: readonly string[] = ['--strict-mcp-config', '--tools', ''];

/** The engine and the call for a provider, or why there is none. */
export type Plan = { readonly engine: EngineConfig; readonly call: Call } | { readonly refused: string };

/** The plan for `provider`, its model `model` or its default, keys read from `env`, the CLI started in `scratch`. */
export const planFor = (provider: Provider, model: string | undefined, env: Readonly<Record<string, string | undefined>>, scratch: string): Plan => {
  const chosen = model ?? DEFAULT_MODELS[provider];
  if (chosen === undefined) return { refused: `--provider ${provider} needs --model <id>` };
  if (provider === 'claude_cli') {
    return {
      engine: { providers: { claude_cli: { auth_mode: 'oauth', default_cwd: scratch } } },
      call: { provider, model: chosen, options: { claude_cli: { tool_bridge: 'forbid', extra_args: CLAUDE_CLI_ARGS } } },
    };
  }
  const variable = KEYS[provider];
  const key = env[variable];
  if (key === undefined || key.length === 0) return { refused: `--provider ${provider} reads its key from ${variable}, which is not set` };
  const providers: EngineConfig['providers'] = provider === 'anthropic' ? { anthropic: { api_key: key, transport: 'native' } } : provider === 'openai' ? { openai: { api_key: key, transport: 'native' } } : { openrouter: { api_key: key, transport: 'native' } };
  return { engine: { providers }, call: { provider, model: chosen } };
};
