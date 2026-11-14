# Telegram control plane

Run the content agent from your phone. Nothing runs on your laptop: a scheduled
GitHub Action polls Telegram, dispatches a workflow, and the workflow reports
back to the same chat.

```
Telegram app (phone)
  │  /deepen 3
  ▼
telegram-control.yml   (cron */5, ubuntu-latest)
  │  scripts/telegram/poll.js  → getUpdates, parse, dispatch
  ▼
lesson-writer.yml      (repository_dispatch: lesson-writer)
  │  scripts/deep-rewrite.js  → hosted model writes sections
  │  guard: data/handwritten-lessons.json protected lessons are skipped
  ▼
commit to main (scripts/ci-push.sh)  →  scripts/telegram/notify.js → Telegram
```

## One-time setup

1. **Create the bot.** In Telegram, talk to `@BotFather`, run `/newbot`, pick a
   name. Copy the token (`123456:ABC...`).

2. **Add the token as a repository secret.** Repo → Settings → Secrets and
   variables → Actions → New repository secret:
   - `TELEGRAM_TOKEN` = the BotFather token  ← **the only required secret**

   Optional, but recommended:
   - `TELEGRAM_CHAT_ID` — pins the owner chat up front. Skip it and the bot
     adopts whichever chat messages it first, then ignores all others.
   - `NVIDIA_API_KEY` — free NVIDIA NIM key; the writer lane prefers it.
     Without it the lane uses GitHub Models through the built-in token.

3. **Merge this branch.** The control workflow only runs from the default
   branch, so it starts polling once merged.

4. **Say hello.** Open your bot in Telegram and send `/help`. Within ~5 minutes
   you get a reply and the owner chat is pinned in
   `data/telegram-state.json`.

## Commands

| Command | Effect |
| --- | --- |
| `/help` | Command list |
| `/status` | Queue depth, open PRs, recent lane results |
| `/queue` | Pending lesson list |
| `/deepen [n]` | Hand-write up to `n` queued lessons (default 2) |
| `/expand [lane]` | Run the expand-course lane on `main` |

## Models

`scripts/lib/ollama.js` tries, in order:

1. **NVIDIA NIM** — `NVIDIA_API_KEY` + `NVAPI=1` (default
   `nemotron-3-ultra`, a 550B model).
2. **Groq** — `GROQ_API_KEY` + `GROQ=1` (default `openai/gpt-oss-120b`).
3. **OpenRouter** — `OPENROUTER_API_KEY` + `OPENROUTER=1` (free
   `nvidia/nemotron-3-ultra-550b-a55b:free`).
4. **GitHub Models** — `GH_MODELS=1`; uses the built-in `GITHUB_TOKEN` with
   `permissions: models: read`. Free, no extra secret.
5. **Local Ollama** — not present on a hosted runner, so if 1-4 all fail the
   run ends by reporting the failure rather than hanging.

All four hosted routes are free-tier. A missing key skips that route; a failed
call falls through to the next one. The preflight step logs which keys are set
(names only, never values).

Override a model per repo (Settings → Variables): `NVIDIA_MODEL` (a short alias
from `scripts/lib/nvidia-models.js`, e.g. `nemotron-3-ultra`), `GROQ_MODEL`,
`OPENROUTER_MODEL`, or `GH_MODELS_MODEL` (default `gpt-4o-mini`).

**OpenCode Zen is not used**: its free models only work inside the OpenCode
client, and its paid models would break the no-paid-keys rule. See
`docs/model-backends.md`.

## Cost and limits

- Public repo → GitHub Actions minutes are free. Telegram is free. Both model
  backends have free tiers.
- A single job is capped at 6 hours. This lane writes a **batch** per run and
  stops, so a long backlog becomes many short runs on the schedule rather than
  one marathon.

## Safety

- Every lesson in `data/handwritten-lessons.json` is **protected**; the lane
  skips it (`scripts/lib/handwritten.js`), and the guard test runs before any
  writing so a broken manifest fails the run early.
- The bot obeys a **single** chat id. Messages from any other chat are ignored.
- Publishing goes through `scripts/ci-push.sh`, the same rebase-and-retry
  publisher every other lane uses.

## Turning it off

Delete or disable `telegram-control.yml`. The writer lane only runs when
dispatched, so nothing else keeps polling.
