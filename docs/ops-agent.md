# Cloud ops agent

The repository now has a GitHub-native operations agent. It runs on GitHub's
runners, so it keeps working when the owner's laptop is off. Telegram is **not**
required.

## What it does

Every 15 minutes `ops-agent.yml`:

1. lists Actions runs that failed in the last 45 minutes;
2. skips runs already reported and its own workflow;
3. reads the failed log tail, the workflow YAML and the script named in the
   log;
4. redacts token-shaped strings;
5. asks the shared hosted-model router (NVIDIA NIM -> Groq -> OpenRouter ->
   GitHub Models) for a diagnosis;
6. takes one of three actions:
   - **rerun** — a clearly transient failure (network, stale ref, rate limit)
     gets one rerun of the failed jobs;
   - **patch** — a small fix in `scripts/`, `.github/workflows/`, `docs/` or
     `.gitignore` is applied to an `ops/fix-*` branch and opened as a PR;
   - **issue** — everything else becomes an issue labelled `ops-agent` with
     the diagnosis, root cause, next action and log excerpt.

It never pushes to `main`, never merges a PR, and never edits reader-facing
content (`upsc/`, `languages/`, `data/`, `*.html`).

## Using it from a phone

Open any issue in the repository and comment:

```text
/ops status
/ops diagnose <run-id>
/ops rerun <run-id>
/ops fix <run-id>
```

Only the repository owner, members and collaborators are accepted. The agent
replies in the same issue. This is the GitHub-native replacement for the
Telegram control plane.

You can also run it manually: **Actions -> Ops Agent -> Run workflow**, with an
optional run id.

## Where the results appear

- **Issue** label `ops-agent` — diagnosis for a failure that needs judgement.
- **Pull request** title prefix `[ops]` — a proposed code fix. Review and merge
  manually.
- **Actions run log** — the agent's own trace, including which model served.

## Safety rails

- Path allowlist is enforced in code and tested by `scripts/ops-agent.test.js`.
- A patch must pass `git apply --check`; JavaScript must pass `node --check`;
  YAML must parse.
- Logs are redacted for GitHub/NVIDIA/Groq/OpenRouter token shapes before they
  are sent to a hosted model.
- At most two runs are diagnosed per poll, so a mass failure cannot spend the
  whole Actions budget.
- A run is reported once; the issue body carries a `<!-- ops-run:<id> -->`
  marker for deduplication.

## Limits

- Detection is up to 15 minutes after a failure.
- The model can be wrong. A PR is a proposal, not an approval.
- Editorial judgement (is this lesson good? is this relation true?) still needs
  a human.
- If the hosted keys are exhausted, the agent still opens an issue with the raw
  log tail and says diagnosis was unavailable.

## Turning it off

Actions -> **Ops Agent** -> **Disable workflow**. The scheduled pipelines are
separate and keep running.

Repo Agent: the scheduled audit-fix agent opens PRs and never merges.