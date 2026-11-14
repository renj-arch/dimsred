// Curated NVIDIA NIM chat models, for scripts/lib/ollama.js.
//
// EVERY entry here answered a real POST /v1/chat/completions with HTTP 200 on
// 2026-11-13 (probe: probe-live-models.js). "Listed in /v1/models" is NOT
// enough: that endpoint also returns models this account cannot invoke (404
// "Function ... Not found for account") and models that are retired (410).
//
// Do not add a model from the docs page alone. https://docs.api.nvidia.com/
// nim/reference/llm-apis was badly stale on 2026-11-13: it advertised a whole
// "recommended" set that returned 410 end-of-life, including the previous
// default in this file. Verify with a real call before adding anything.
//
// Retired / unusable on 2026-11-13 (do NOT re-add; kept only as a warning):
//   410 end of life:
//     deepseek-ai/deepseek-v4-pro            EOL 2026-08-07
//     moonshotai/kimi-k3                     EOL 2026-10-15
//     z-ai/glm-5.3                           EOL 2026-10-28
//     deepseek-ai/deepseek-v4-flash, deepseek-ai/deepseek-v4-flash-0731
//     minimaxai/minimax-m2.7, minimaxai/minimax-m2.5
//     qwen/qwen3-next-80b-a3b-thinking, qwen/qwen3-next-80b-a3b-instruct
//     openai/gpt-oss-120b, z-ai/glm-5.2, moonshotai/kimi-k2-thinking
//     qwen/qwq-32b, stepfun-ai/step-3.5-flash, poolside/laguna-xs-2-1
//     moonshotai/kimi-k2-instruct, meta/llama-3.3-70b-instruct
//     meta/llama-3.1-70b-instruct, meta/llama-3.1-8b-instruct
//     microsoft/phi-4-mini-instruct, google/gemma-7b
//     mistralai/mixtral-8x7b-instruct, nvidia/nemotron-3-nano-30b-a3b
//     nvidia/nvidia-nemotron-nano-9b-v2
//   404 "not found for account" (listed, but this key cannot call it):
//     nvidia/nemotron-3-super-120b-a12b, nvidia/nemotron-nano-3-30b-a3b
//     nvidia/nemotron-4-340b-instruct, nvidia/llama-3.1-nemotron-ultra-253b-v1
//     nvidia/llama-3.1-nemotron-70b-instruct, moonshotai/kimi-k2.6
//     mistralai/mistral-large-2-instruct, writer/palmyra-creative-122b
//     01-ai/yi-large
//   404 playground-only (never API-callable at all):
//     moonshotai/kimi-k3.1-pro
//   Unverified - answered no probe within 180s, so NOT listed as usable:
//     deepseek-ai/deepseek-v4.1-flash, mistralai/mistral-large-4-1t-a52b,
//     openai/gpt-oss-20b, meta/muse-glimmer-30b, stepfun-ai/step-5-preview,
//     google/gemma-4-31b-it
//
// Tiers are a suitability judgement for this repo's work (long sourced lesson
// prose, HTML/code edits, agentic multi-step), not a benchmark - the only
// measured fact is that the entry answered.
//
// Usage in a workflow:
//   NVIDIA_MODEL: nemotron-3-ultra          # short alias
//   NVIDIA_MODEL: nvidia/nemotron-3-ultra-550b-a55b   # full id also works
const CATALOG = {
  // Verified live and the most capable of the surviving set: 550B (A55B active)
  // general model. Default for the backend.
  recommended: {
    'nemotron-3-ultra': 'nvidia/nemotron-3-ultra-550b-a55b'
  },

  // Verified live; pick by cost/latency or by modality, not by a quality claim.
  trial: {
    'nemotron-3.5-super-vl': 'nvidia/nemotron-3.5-super-vl-120b-a12b',
    'nemotron-3.5-lightning': 'nvidia/nemotron-3.5-lightning-30b-a3b',
    'nemotron-3.5-bolt': 'nvidia/nemotron-3.5-bolt-e4b',
    'minimax-m3.1-flash': 'minimaxai/minimax-m3.1-flash',
    'glm-5.3-flash': 'z-ai/glm-5.3-flash'
  }
};

// alias -> { id, tier }
const INDEX = Object.create(null);
for (const tier of Object.keys(CATALOG)) {
  for (const alias of Object.keys(CATALOG[tier])) {
    INDEX[alias] = { id: CATALOG[tier][alias], tier: tier };
  }
}

// Default model id, exported so the client and tests agree on one source.
const DEFAULT_ID = 'nvidia/nemotron-3-ultra-550b-a55b';

/**
 * Resolve a configured model name to a full NVIDIA model id.
 * A value containing "/" is assumed to be a full id and passes through, so a
 * model NVIDIA adds tomorrow works without touching this file.
 * Returns { id, tier, known }.
 */
function resolve(name) {
  const raw = String(name == null ? '' : name).trim();
  if (!raw) return { id: DEFAULT_ID, tier: 'recommended', known: true };
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

module.exports = { CATALOG: CATALOG, DEFAULT_ID: DEFAULT_ID, resolve: resolve, all: all };
