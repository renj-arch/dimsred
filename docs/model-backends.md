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
  NVIDIA_MODEL: nemotron-3-ultra   # short alias, or a full id
```

Endpoint: `https://integrate.api.nvidia.com/v1/chat/completions` (OpenAI
compatible). `NVIDIA_URL` overrides it. `max_tokens` is clamped to 16384,
which is the documented ceiling.

### Choosing a model

`NVIDIA_MODEL` accepts a short alias from `scripts/lib/nvidia-models.js` or a
full id (a value containing `/` passes through, so a model NVIDIA adds
tomorrow works without a code change). An unrecognised value is sent anyway
and logged once, so a typo shows up instead of silently falling back. An empty
value resolves to the catalogue default.

**Every catalogue entry answered a real call on 2026-11-13.** NVIDIA's docs
page (`docs.api.nvidia.com/nim/reference/llm-apis`) was badly stale: it
advertised a whole set that returns 410 end-of-life, and `/v1/models` also
lists models this account cannot invoke (404). Listed ≠ usable. Verify with a
real POST before adding anything.

| Tier | Alias | Full id |
| --- | --- | --- |
| recommended | `nemotron-3-ultra` | `nvidia/nemotron-3-ultra-550b-a55b` |
| trial | `nemotron-3.5-super-vl` | `nvidia/nemotron-3.5-super-vl-120b-a12b` |
| trial | `nemotron-3.5-lightning` | `nvidia/nemotron-3.5-lightning-30b-a3b` |
| trial | `nemotron-3.5-bolt` | `nvidia/nemotron-3.5-bolt-e4b` |
| trial | `minimax-m3.1-flash` | `minimaxai/minimax-m3.1-flash` |
| trial | `glm-5.3-flash` | `z-ai/glm-5.3-flash` |

Tiers are a suitability judgement for this repo's work; the only measured fact
is that the entry answered. The default is `nemotron-3-ultra`. Run
`node scripts/lib/ollama-nvapi.test.js` after changing the catalogue; the tests
assert every alias resolves to a full id and that retired ids stay unresolvable.

#### Retired ids (do not re-add)

These were live once and are kept only in the catalogue's comment block as a
warning. `scripts/lib/nvidia-models.js` lists them with their end-of-life dates
and the account-scoped 404s. A test asserts `kimi-k3`, `deepseek-v4-pro` and
`glm-5.3` stay unresolvable.

### Kimi K3.1 Pro is not callable

`moonshotai/kimi-k3.1-pro` is published on build.nvidia.com, but its own page
states:

> API access for this model is not available yet. This endpoint is published
> for preview and playground use only - it is not open for programmatic
> access, and no API key will authorize it.

Calls with a valid NVAPI key return 404. It is deliberately absent from the
catalogue, and a 403/404 logs a "may be playground-only" hint rather than
looking like an expired key.

## Tests

`node scripts/lib/ollama-nvapi.test.js` covers routing, alias resolution, the
default, the `max_tokens` clamp, "not wired when disabled", the 404 hint and
the catalogue invariants (retired ids unresolvable).