/**
 * Model Router — routes AI requests to the correct backend.
 *
 * Prefixes:
 *   @cf/        → Cloudflare Workers AI (env.AI.run)
 *   local/      → sm3lly llama-server (OpenAI-compatible API via tunnel)
 *
 * Convention:
 *   local/heretic  = ablated uncensored Qwen3.8-27B on sm3lly:8002
 *   local/safe     = safety-tuned Qwen3.6-27B on sm3lly:8001
 *   local/default  = alias for local/heretic
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ModelRouterEnv {
  AI?: any;                   // Cloudflare Workers AI binding
  LOCAL_LLM_URL?: string;     // base URL for local model (e.g. https://llm.b00t.promptexecution.com)
  LOCAL_LLM_API_KEY?: string; // optional bearer token
}

const MODEL_ENDPOINTS: Record<string, string> = {
  'heretic':   ':8002',
  'safe':      ':8001',
  'default':   ':8002',
};

/**
 * Resolve a model name to its absolute form.
 * - @cf/...    → passed through to Workers AI
 * - local/...  → resolved to sm3lly endpoint
 */
export function resolveModel(model: string): { backend: 'cf' | 'local'; model: string; baseUrl: string } {
  if (model.startsWith('@cf/')) {
    return { backend: 'cf', model, baseUrl: '' };
  }

  if (model.startsWith('local/')) {
    const alias = model.replace('local/', '');
    const port = MODEL_ENDPOINTS[alias] || MODEL_ENDPOINTS['default'];
    // sm3lly LAN address — worker will tunnel through if LOCAL_LLM_URL is set
    return { backend: 'local', model: alias, baseUrl: port };
  }

  // Default: treat as CF model
  return { backend: 'cf', model, baseUrl: '' };
}

/**
 * Unified chat completion — routes to the right backend.
 */
export async function chatCompletion(
  env: ModelRouterEnv,
  model: string,
  messages: ChatMessage[],
  options: { max_tokens?: number; temperature?: number; stream?: boolean } = {},
): Promise<{ response: string; model: string; backend: string }> {
  const route = resolveModel(model);

  if (route.backend === 'cf') {
    if (!env.AI) throw new Error('Workers AI binding required for @cf/ models');
    const result = await env.AI.run(route.model as any, {
      messages,
      max_tokens: options.max_tokens ?? 1500,
      ...(options.temperature != null ? { temperature: options.temperature } : {}),
    });
    const text = typeof result === 'object' && result !== null && 'response' in result
      ? (result as any).response
      : String(result);
    return { response: text, model: route.model, backend: 'cf' };
  }

  // Local model — OpenAI-compatible API
  const baseUrl = env.LOCAL_LLM_URL || `http://192.168.1.137${route.baseUrl}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (env.LOCAL_LLM_API_KEY) headers['Authorization'] = `Bearer ${env.LOCAL_LLM_API_KEY}`;

  const resp = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: 'local',
      messages,
      max_tokens: options.max_tokens ?? 1500,
      temperature: options.temperature ?? 0.7,
      stream: false,
    }),
  });

  if (!resp.ok) {
    const errBody = await resp.text().catch(() => '');
    throw new Error(`Local LLM error ${resp.status}: ${errBody}`);
  }

  const data = await resp.json() as any;
  const text = data.choices?.[0]?.message?.content || '';
  return { response: text, model: `local/${route.model}`, backend: 'local' };
}

/**
 * Build the humor showdown lineup:
 *   Variant A = random @cf/ model (censored, Cloudflare)
 *   Variant B = local/heretic (uncensored, ablated)
 *
 * When SHOWDOWN_MODE=1 env var is set, forces this pairing.
 */
export function buildShowdownLineup(env: ModelRouterEnv): [string, string] {
  const cfModels = [
    '@cf/openai/gpt-oss-120b',
    '@cf/google/gemma-4-26b-a4b-it',
    '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    '@cf/qwen/qwen3-30b-a3b-fp8',
    '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
    '@cf/moonshotai/kimi-k2.6',
  ];
  const chosen = cfModels[Math.floor(Math.random() * cfModels.length)];
  return [chosen, 'local/heretic'];
}