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
  NVIDIA_MODEL: moonshotai/kimi-k3
```

Endpoint: `https://integrate.api.nvidia.com/v1/chat/completions` (OpenAI
compatible). `NVIDIA_URL` overrides it. `max_tokens` is clamped to 16384,
which is the documented ceiling.

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