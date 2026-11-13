// Curated NVIDIA NIM chat models, for scripts/lib/ollama.js.
//
// Source: https://docs.api.nvidia.com/nim/reference/llm-apis (read 2026-11-13).
// Only models that appear in that callable catalogue are listed here. Models
// that are playground-only on build.nvidia.com (e.g. moonshotai/kimi-k3.1-pro)
// are deliberately absent: a valid key still returns 404 for them.
//
// Tiers are a suitability judgement for this repo's work (long sourced lesson
// prose, HTML/code edits, agentic multi-step), not a benchmark. Re-check the
// catalogue before trusting an entry; NVIDIA adds and retires models quickly.
//
// Usage in a workflow:
//   NVIDIA_MODEL: deepseek-v4-pro        # short alias
//   NVIDIA_MODEL: deepseek-ai/deepseek-v4-pro   # full id also works
const CATALOG = {
  // Clear upgrades over the previous default (qwen3.5:9b) and over a
  // DeepSeek v4 flash tier: stronger reasoning, same or better instruction
  // following.
  recommended: {
    'deepseek-v4-pro': 'deepseek-ai/deepseek-v4-pro',
    'kimi-k3': 'moonshotai/kimi-k3',
    'glm-5.3': 'z-ai/glm-5.3'
  },

  // Worth A/B testing for a specific lane; no clear winner without data.
  trial: {
    'nemotron-3-ultra': 'nvidia/nemotron-3-ultra-550b-a55b',
    'nemotron-3-super': 'nvidia/nemotron-3-super-120b-a12b',
    'minimax-m2.7': 'minimaxai/minimax-m2.7',
    'minimax-m2.5': 'minimaxai/minimax-m2.5',
    'qwen3-next-80b-thinking': 'qwen/qwen3-next-80b-a3b-thinking',
    'qwen3-next-80b': 'qwen/qwen3-next-80b-a3b-instruct',
    'gpt-oss-120b': 'openai/gpt-oss-120b',
    'glm-5.2': 'z-ai/glm-5.2',
    'kimi-k2-thinking': 'moonshotai/kimi-k2-thinking',
    'qwq-32b': 'qwen/qwq-32b',
    'step-3.5-flash': 'stepfun-ai/step-3.5-flash',
    'laguna-xs-2-1': 'poolside/laguna-xs-2-1'
  },

  // Same generation as the flash tier this repo used to rely on. Useful as a
  // control in an A/B run, not as an upgrade.
  baseline: {
    'deepseek-v4-flash': 'deepseek-ai/deepseek-v4-flash',
    'deepseek-v4-flash-0731': 'deepseek-ai/deepseek-v4-flash-0731',
    'kimi-k2-instruct': 'moonshotai/kimi-k2-instruct'
  },

  // Smaller or older than the current default. Listed so a lane does not pick
  // one by accident; no reason to choose these for content generation.
  weaker: {
    'gpt-oss-20b': 'openai/gpt-oss-20b',
    'llama-3.3-70b': 'meta/llama-3.3-70b-instruct',
    'llama-3.1-70b': 'meta/llama-3.1-70b-instruct',
    'llama-3.1-8b': 'meta/llama-3.1-8b-instruct',
    'phi-4-mini': 'microsoft/phi-4-mini-instruct',
    'gemma-7b': 'google/gemma-7b',
    'mixtral-8x7b': 'mistralai/mixtral-8x7b-instruct',
    'nemotron-3-nano': 'nvidia/nemotron-3-nano-30b-a3b',
    'nemotron-nano-9b': 'nvidia/nvidia-nemotron-nano-9b-v2'
  }
};

// alias -> { id, tier }
const INDEX = Object.create(null);
for (const tier of Object.keys(CATALOG)) {
  for (const alias of Object.keys(CATALOG[tier])) {
    INDEX[alias] = { id: CATALOG[tier][alias], tier: tier };
  }
}

/**
 * Resolve a configured model name to a full NVIDIA model id.
 * A value containing "/" is assumed to be a full id and passes through, so a
 * model NVIDIA adds tomorrow works without touching this file.
 * Returns { id, tier, known }.
 */
function resolve(name) {
  const raw = String(name == null ? '' : name).trim();
  if (!raw) return { id: '', tier: 'unknown', known: false };
  if (raw.indexOf('/') !== -1) {
    const hit = Object.keys(INDEX).find(function (a) { return INDEX[a].id === raw; });
    return { id: raw, tier: hit ? INDEX[hit].tier : 'unknown', known: !!hit };
  }
  const hit = INDEX[raw];
  if (hit) return { id: hit.id, tier: hit.tier, known: true };
  return { id: raw, tier: 'unknown', known: false };
}

/** Flat alias -> full id map, for docs and tests. */
function all() {
  const out = {};
  for (const tier of Object.keys(CATALOG)) {
    for (const alias of Object.keys(CATALOG[tier])) out[alias] = CATALOG[tier][alias];
  }
  return out;
}

module.exports = { CATALOG: CATALOG, resolve: resolve, all: all };