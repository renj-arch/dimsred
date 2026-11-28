# Model backends

`scripts/lib/ollama.js` is the one place every model lane talks to a model.
Hosted backends are tried strongest-first, then the local model:

| Order | Backend | Enabled by | Cost | Requires |
| --- | --- | --- | --- | --- |
| 1 | NVIDIA NIM | `NVAPI=1` + `NVIDIA_API_KEY` | free prototyping tier | NVIDIA API key |
| 2 | Groq | `GROQ=1` + `GROQ_API_KEY` | free tier | Groq API key |
| 3 | OpenRouter | `OPENROUTER=1` + `OPENROUTER_API_KEY` | free model ids only | OpenRouter API key |
| 4 | GitHub Models | `GH_MODELS=1` + `GH_MODELS_TOKEN` | free tier | GitHub token |
| 5 | Local Ollama | always | free (own hardware) | `OLLAMA_MODEL` running on `OLLAMA_HOST` |

If a backend is not enabled, or it errors, the next one runs. A failed hosted
call never stalls a lane; it only costs quality. The order is deliberate: the
9B local model is the fallback, not the lead, because it is not good enough for
authored lesson prose.

When `OPENCODE_ZEN=1`, an optional OpenCode CLI route runs **before** NVIDIA.
It is off by default because it is much slower; see below.

## Why the local model is still the floor

`AGENTS.md` forbids depending on paid API keys, and every hosted tier above is
free only within limits (rate limits, prototyping-only terms). Nothing in the
content pipeline may *require* them: a lane with no key must still produce
output. That is why every hosted backend is opt-in and all of them degrade to
Ollama.

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

## Groq

```yaml
env:
  GROQ: '1'
  GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
  GROQ_MODEL: openai/gpt-oss-120b
```

Endpoint: `https://api.groq.com/openai/v1/chat/completions`. Verified live on
2026-11-14. The account exposed `openai/gpt-oss-120b`, `openai/gpt-oss-20b`,
`qwen/qwen3.8-27b` and `allam-2-7b`; **`llama-3.3-70b-versatile` returned 404
model_not_found**, so do not copy an old model name from a blog post. Check
`GET /openai/v1/models` with the real key before changing the default.

## OpenRouter

```yaml
env:
  OPENROUTER: '1'
  OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
  OPENROUTER_MODEL: nvidia/nemotron-3-ultra-550b-a55b:free
```

Endpoint: `https://openrouter.ai/api/v1/chat/completions`. **Only free ids**
(the `:free` suffix) are allowed here; a paid id would violate the no-paid-keys
rule. The default is the same Nemotron 550B that NVIDIA serves directly, so a
NVIDIA outage or rate limit does not stop a lane. The public model list at
`https://openrouter.ai/api/v1/models` shows current free ids without a key.

## Reasoning models

Nemotron and gpt-oss put chain-of-thought in `message.reasoning_content` or
`message.reasoning`, and the answer in `message.content`. If `max_tokens` is
too small, the whole budget is spent thinking, `content` is empty and
`finish_reason` is `length`. The client **fails that call loudly** instead of
returning the reasoning text: splicing private deliberation into a lesson is a
defect, not a fallback. The error names the cause and says to raise the token
budget.

### Token budget and the 5-minute headers cap

Measured on 2026-11-14: `nemotron-3-ultra` wrote 922 words in 35.1 s, about
**35 completion tokens/second**. Node's `fetch` (undici) has a 5-minute
`headersTimeout`, and a non-streaming response sends no headers until
generation finishes. So the completion budget must stay under roughly
**10,000 tokens**:

| Budget | Time at 35 tok/s | Safe? |
| --- | --- | --- |
| 6,000 | ~171 s | yes |
| 8,000 | ~229 s | yes, thin margin |
| 12,000 | ~343 s | **no — headers timeout** |

The writer lane uses `DEEP_NUM_PREDICT=6000` and
`DEEP_TARGET_WORDS=2000-3000`, which leaves room for reasoning tokens inside
the same budget. Raising the budget requires streaming first (or a custom
undici dispatcher), not just a bigger number.

## Not wired: DeepSeek

Probed on 2026-11-14, because the owner asked for it by name:

| Route | Result |
| --- | --- |
| NVIDIA `deepseek-ai/deepseek-v4.1-flash` | no bytes in 200 s (the catalogue already marked it unverified for the same reason) |
| NVIDIA `deepseek-ai/deepseek-v4-pro` | HTTP 410, end of life 2026-08-07 |
| OpenRouter | 20 DeepSeek ids, **all paid**; none carry `:free` |
| Groq | no DeepSeek model on the account |

So DeepSeek is not a free **HTTP** option. It does work through the OpenCode
CLI (the optional route below), which is the only free path; the direct NVIDIA,
OpenRouter and Groq APIs do not serve it for free. Nemotron 550B remains the
default because it answers on a plain API key and is much faster.

## Optional: OpenCode Zen via the CLI

The owner's free DeepSeek V4.1 Flash model is real, but Zen gates it:

| Route | Result (2026-11-15) |
| --- | --- |
| raw API, `deepseek-v4.1-flash-free` | HTTP 429 `FreeUsageLimitError` — "Free models work in OpenCode" |
| `opencode run -m opencode/deepseek-v4.1-flash-free#max` | `UnknownError: Unexpected server error` — `#max` is not part of the model id |
| `opencode run -m opencode/deepseek-v4.1-flash-free` (bare id) | resolves the model, then hangs headless for the full deadline and never answers |
| raw API, `nemotron-3-ultra-free` | HTTP 400 "Model is unavailable" |

`scripts/lib/opencode-zen.js` shells out to the CLI, writes the key to
`~/.local/share/opencode/auth.json`, parses the CLI's JSON event stream, and
returns the text. It is **off by default** and enabled per lane with
`OPENCODE_ZEN=1` + `OPENCODE_API_KEY`.

The route was removed from every expand lane in #149: even with a real key the
CLI never answered headless, so one Zen call burned the entire 90-minute expand
deadline before NVIDIA/Groq/OpenRouter/GitHub Models were tried. The module and
the `zen-probe.yml` diagnostic stay; re-enable with one probe run if the CLI
ever starts answering headless.

## Optional: Refuseless (paid, off by default)

`REFUSELESS=1` adds an OpenAI-compatible backend at
`https://api.refuseless.com/v1/chat/completions` (override with `REFUSELESS_URL`).
This one is **paid**: credit-based, per-million-token pricing, so it is off by
default and sits **last before the local model**, after every free route.
Enable it only after a top-up.

- `REFUSELESS_API_KEY` (repo secret) — key starts with `abl_`.
- `REFUSELESS_MODEL` — default `deepseek-v4.1-flash-fast` (cheapest paid id,
  $0.01/$0.08 per M). The lineup also lists `glm-5.3-abliterated`,
  `glm-5.3-flash-abliterated`, `deepseek-v4.1-flash-abliterated`,
  `minimax-m3.1-flash`, `kimi-k3.1-pro` and a `-free` DeepSeek variant.
- `reasoning_effort` accepts `off`, `low`, `high`, `max`.

Live state on **2026-11-15** for the owner's key: `GET /v1/models` returns 8
models, the `-free` model answers **429 `model_busy`** ("Free slots at
capacity. Top up or retry later."), and the paid models answer **402
`insufficient_credits`**. Until either changes, enabling `REFUSELESS=1` only
adds a failed attempt before the local fallback.

## Tests

`node scripts/lib/ollama-nvapi.test.js` covers routing, alias resolution, the
default, the `max_tokens` clamp, "not wired when disabled", the 404 hint, the
catalogue invariants, NVIDIA-before-Groq ordering, the reasoning-only failure,
OpenRouter headers, and Groq-to-OpenRouter fallthrough.
