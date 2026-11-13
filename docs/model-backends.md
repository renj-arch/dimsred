# Model backends

`scripts/lib/ollama.js` is the one place every model lane talks to a model.
It has three backends, tried in this order, and every external one is opt-in
and fails open to the local model.

| Order | Backend | Enabled by | Cost | Requires |
| --- | --- | --- | --- | --- |
| 1 | GitHub Models | `GH_MODELS=1` + `GH_MODELS_TOKEN` | free tier | GitHub token |
| 2 | NVIDIA NIM | `NVAPI=1` + `NVIDIA_API_KEY` | free prototyping tier | NVIDIA API key |
| 3 | Local Ollama | always | free (own hardware) | `OLLAMA_MODEL` running on `OLLAMA_HOST` |

If a backend is not enabled, or it errors, the next one runs. A failed hosted
call never stalls a lane; it only costs quality.

## Why the local model is the default

`AGENTS.md` forbids depending on paid API keys, and every hosted tier above is
free only within limits (rate limits, prototyping-only terms). Nothing in the
content pipeline may *require* them: a lane with no key must still produce
output. That is why both hosted backends are opt-in and both degrade to Ollama.

## NVIDIA NIM

```yaml
env:
  NVAPI: '1'
  NVIDIA_API_KEY: ${{ secrets.NVIDIA_API_KEY }}
  NVIDIA_MODEL: deepseek-v4-pro   # short alias, or a full id
```

Endpoint: `https://integrate.api.nvidia.com/v1/chat/completions` (OpenAI
compatible). `NVIDIA_URL` overrides it. `max_tokens` is clamped to 16384,
which is the documented ceiling.

### Choosing a model

`NVIDIA_MODEL` accepts a short alias from `scripts/lib/nvidia-models.js` or a
full id (a value containing `/` passes through, so a model NVIDIA adds
tomorrow works without a code change). An unrecognised value is sent anyway
and logged once, so a typo shows up instead of silently falling back.

Tiers are a suitability judgement for this repo's work, not a benchmark.
Source: the callable catalogue at
`https://docs.api.nvidia.com/nim/reference/llm-apis`.

| Tier | Alias | Full id |
| --- | --- | --- |
| recommended | `deepseek-v4-pro` | `deepseek-ai/deepseek-v4-pro` |
| recommended | `kimi-k3` | `moonshotai/kimi-k3` |
| recommended | `glm-5.3` | `z-ai/glm-5.3` |
| trial | `nemotron-3-ultra` | `nvidia/nemotron-3-ultra-550b-a55b` |
| trial | `nemotron-3-super` | `nvidia/nemotron-3-super-120b-a12b` |
| trial | `minimax-m2.7` | `minimaxai/minimax-m2.7` |
| trial | `qwen3-next-80b-thinking` | `qwen/qwen3-next-80b-a3b-thinking` |
| trial | `gpt-oss-120b` | `openai/gpt-oss-120b` |
| trial | `glm-5.2` | `z-ai/glm-5.2` |
| trial | `kimi-k2-thinking` | `moonshotai/kimi-k2-thinking` |
| baseline | `deepseek-v4-flash` | `deepseek-ai/deepseek-v4-flash` |
| weaker | `gpt-oss-20b`, `llama-3.3-70b`, `gemma-7b`, ... | smaller/older, listed only so nobody picks one by accident |

The default is `kimi-k3`. Run `node scripts/lib/ollama-nvapi.test.js` after
changing it; the catalogue tests assert every alias resolves to a full id.

### Kimi K3.1 Pro is not callable

`moonshotai/kimi-k3.1-pro` is published on build.nvidia.com, but its own page
states:

> API access for this model is not available yet. This endpoint is published
> for preview and playground use only - it is not open for programmatic
> access, and no API key will authorize it.

Calls with a valid NVAPI key return 404. The NVIDIA model catalogue lists
`moonshotai/kimi-k3`, `kimi-k2-instruct` and `kimi-k2-thinking` as callable;
K3.1 Pro is not among them. So `NVIDIA_MODEL` defaults to `moonshotai/kimi-k3`,
and a 403/404 logs a "may be playground-only" hint rather than looking like an
expired key.

Re-check before changing the default: if NVIDIA enables K3.1 Pro, the id is
`moonshotai/kimi-k3.1-pro` and nothing else in this client needs to change.

## Tests

`node scripts/lib/ollama-nvapi.test.js` covers routing, the model id, the
`max_tokens` clamp, "not wired when disabled", and the 404 hint.