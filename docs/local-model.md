# The local model

The film pipeline's writer tier runs from open weights that are pinned by
commit and checked by digest. There is no API key in the path and no hosted
endpoint to retire. The same bytes produce the same storyboard next year.

## The choice

**Qwen3.6-35B-A3B** — 35,951,822,704 parameters, 3B active, Apache-2.0, text
and image input, 262K context.

It is the largest open model that can actually run inside the free pipeline.
A dense 40B needs about 24 GB at 4-bit; the runner has 16 GB and no GPU. The
MoE layout is what makes the size work: only 3B parameters are read per token,
so a 36B model decodes at a usable rate while the whole file sits in RAM or
pages from disk.

The alternative at this size is **Gemma 4 31B** (31.3B dense, Apache-2.0). It
is excellent at structured JSON and worse per-token on speed. Keep it as a
second opinion, not the default.

Anything marketed as "40B" in 2026 that is actually 700B–2.8T total with 40B
active (GLM-5.3, Kimi K3) is not a local model at any quant. It is a GPU
server.

## The pins

| what | value |
| --- | --- |
| weights | `unsloth/Qwen3.6-35B-A3B-GGUF` @ `a483e9e6cbd595906af30beda3187c2663a1118c` |
| Q2_K_XL | 12.29 GB, sha256 `96b9c0af5c77a4ecaabe3983175112b5ece763261c1ece12b2494b692a70dad7` |
| Q3_K_M | 16.60 GB, sha256 `1b715841683f960bd9a49f008181bd910ee169b78d4cf465b6fde7f4d929ff99` |
| IQ4_XS | 17.73 GB, sha256 `649d7508507b84638732c4f52c24c8b15843c6dca2f3ff793ae07c14a67ebbb3` |
| Q4_K_M | 22.13 GB, sha256 `ac0e2c1189e055faa36eff361580e79c5bd6f8e76bffb4ce547f167d53e31a61` |
| runtime | llama.cpp `b11890`, `llama-b11890-bin-ubuntu-x64.tar.gz` |
| workflow | `.github/workflows/local-model.yml` |
| runner script | `scripts/film/local-model.js` |

The exact upstream model is `Qwen/Qwen3.6-35B-A3B` @
`995ad96eacd98c81ed38be0c5b274b04031597b0` if the GGUF needs rebuilding.

## Memory, honestly

| quant | file | fits 16 GB runner | note |
| --- | --- | --- | --- |
| Q2_K_XL | 12.29 GB | yes, with KV | the default on the free runner |
| Q3_K_M | 16.60 GB | marginal | swaps; only with more RAM |
| IQ4_XS | 17.73 GB | pages from disk | quality probe, not a default |
| Q4_K_M | 22.13 GB | no | needs 32 GB+ or a 24 GB GPU |

A film is authored once, so decode speed is not the constraint. Four tokens per
second is fine when the alternative is a model that changes under you.

## What the model is allowed to do

It designs shots for a scene whose narration is already written and already
carries a source id. It does not research, it does not add a number, date, name
or quote, and its output is rejected mechanically if it invents a plate, cites
an unknown source, uses `dip` inside the film, or repeats the previous
transition on the scene's first cut.

The validators and the QC gate are the reason a weaker model cannot ship a bad
film. The model is a writer, not an authority.

## Fallback ladder

1. **Q2_K_XL on GitHub Actions** — always available, no external account.
2. **Q3_K_M** — same weights, more RAM, better quality.
3. **Gemma 4 31B** — second opinion from a different family, same pins.
4. **A hosted free tier** (Flint, Opus) — optional cross-check only. Nothing in
   the pipeline may depend on it, precisely because it can disappear.

## Restoring after a disaster

```bash
HF_REV=a483e9e6cbd595906af30beda3187c2663a1118c
curl -fL -o model.gguf \
  "https://huggingface.co/unsloth/Qwen3.6-35B-A3B-GGUF/resolve/${HF_REV}/Qwen3.6-35B-A3B-UD-Q2_K_XL.gguf"
echo "96b9c0af5c77a4ecaabe3983175112b5ece763261c1ece12b2494b692a70dad7  model.gguf" | sha256sum -c -
```

Keep one copy off the Hub: Cloudflare R2 holds the Q2 file for about $0.04 a
month, and the owner keeps a copy on external storage. If Hugging Face ever
removes the repo, the workflow still runs from the mirror because the digest,
not the URL, is the contract.
