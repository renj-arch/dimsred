# Telegram control plane

Run the content agent from your phone. Nothing runs on your laptop: a scheduled
GitHub Action polls Telegram, dispatches a workflow, and the workflow reports
back to the same chat.

```
Telegram app (phone)
  |  /deepen 3
  v
telegram-control.yml   (cron */5, ubuntu-latest)
  |  scripts/telegram/poll.js  -> getUpdates, parse, dispatch
  v
lesson-writer.yml      (repository_dispatch: lesson-writer)
  |  scripts/deep-rewrite.js  -> hosted model writes sections
  |  guard: data/handwritten-lessons.json protected lessons are skipped
  v
commit to main (scripts/ci-push.sh)  ->  scripts/telegram/notify.js -> Telegram
```

Both workflows use a **sparse checkout** because the repository is about 18 GB;
a full clone hung for 13+ minutes. Only `scripts`, `upsc/course` and two data
files are fetched (about 40 MB).

## One-time setup

1. **Create the bot.** In Telegram, talk to `@BotFather`, run `/newbot`, pick a
   name. Copy the token (`123456:ABC...`).

2. **Add the token as a repository secret.** Repo -> Settings -> Secrets and
   variables -> Actions -> New repository secret:
   - `TELEGRAM_TOKEN` = the BotFather token  <- **the only required secret**

   Optional, but recommended:
   - `TELEGRAM_CHAT_ID` - pins the owner chat up front. Skip it and the bot
     adopts whichever chat messages it first, then ignores all others.
   - `NVIDIA_API_KEY` - free NVIDIA NIM key; the writer prefers it.
   - `GROQ_API_KEY`, `OPENROUTER_API_KEY` - free fallback routes.
   - `OPENCODE_API_KEY` - only needed for the optional DeepSeek CLI route.

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

1. **NVIDIA NIM** - `NVIDIA_API_KEY` + `NVAPI=1` (default
   `nemotron-3-ultra`, a 550B model).
2. **Groq** - `GROQ_API_KEY` + `GROQ=1` (default `openai/gpt-oss-120b`).
3. **OpenRouter** - `OPENROUTER_API_KEY` + `OPENROUTER=1` (free
   `nvidia/nemotron-3-ultra-550b-a55b:free`).
4. **GitHub Models** - `GH_MODELS=1`; uses the built-in `GITHUB_TOKEN` with
   `permissions: models: read`. Free, no extra secret.
5. **Local Ollama** - not present on a hosted runner, so if 1-4 all fail the
   run ends by reporting the failure rather than hanging.

All four hosted routes are free-tier. A missing key skips that route; a failed
call falls through to the next one. The preflight step logs which keys are set
(names only, never values).

Optional **DeepSeek V4.1 Flash Free** via the OpenCode CLI: pass
`deepseek: true` when dispatching the writer manually. The raw Zen API rejects
free models with HTTP 429 ("Free models work in OpenCode"), so the lane shells
out to `opencode run` instead. It is off by default because the CLI is much
slower than the direct NVIDIA API; any failure falls through to NVIDIA. See
`docs/model-backends.md`.

Override a model per repo (Settings -> Variables): `NVIDIA_MODEL` (a short alias
from `scripts/lib/nvidia-models.js`, e.g. `nemotron-3-ultra`), `GROQ_MODEL`,
`OPENROUTER_MODEL`, `OPENCODE_ZEN_MODEL`, or `GH_MODELS_MODEL` (default
`gpt-4o-mini`).

## Cost and limits

- Public repo -> GitHub Actions minutes are free. Telegram is free. Both model
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
- The Telegram poller exits green with a warning when `TELEGRAM_TOKEN` is not
  set, so the 5-minute cron does not spam red runs before the bot exists.

## Turning it off

Delete or disable `telegram-control.yml`. The writer lane only runs when
dispatched, so nothing else keeps polling.
