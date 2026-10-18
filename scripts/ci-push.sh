#!/bin/bash
# ci-push.sh — the ONLY way workflows publish. PAT → GITHUB_TOKEN fallback.
#
# Usage (call AFTER your `git add`s):
#   bash scripts/ci-push.sh "commit message"
#   GITHUB_TOKEN env must carry ${{ secrets.GITHUB_TOKEN }} (callers set it).
#
# Normal path: commit staged work, pull --rebase + push with the checkout's
# PAT credential (PAT pushes trigger downstream workflows like slim-live).
#
# PAT-death path: if the push fails with 403/401/auth errors, the remote is
# switched to GITHUB_TOKEN and main is pushed anyway. Downstream triggers are
# skipped for that run, but NO WORK IS LOST. data/auth-status.json records
# PAT-DEAD and the job exits 1 (red run notifies) instead of dying silent.
#
# Total-auth-failure path: both credentials dead → exit 1 loud. Nothing more
# is automatically possible; a human must renew secrets (the sentinel + this
# alert say so plainly).
set -uo pipefail

MSG="${1:-agent publish}"
echo "[ci-push] $MSG"

if git diff --staged --quiet; then
  echo "[ci-push] nothing staged — nothing to publish"
  exit 0
fi

git commit -m "$MSG" || { echo "[ci-push] commit failed"; exit 1; }

# Bring the local branch up to date with origin. Concurrent runs publish
# constantly, and two runs can touch the same append-only journals
# (data/agent-log.json, autofix-log.json): the rebase then stops CONFLICTED
# with a detached HEAD, every following `git push` dies with "not currently
# on a branch", and the run ends in a fake "TOTAL AUTH FAILURE" while the
# real work sits stranded on the runner (observed 2026-10-18, run
# 39130826980 — 12 invented practice items lost). So: if the rebase cannot
# finish, abort it and merge instead, keeping OUR side of conflicts — the
# work this run just generated. Losing an overlapping log line beats losing
# the whole publish. One exception folds on top of that merge:
# data/invented/questions.json is unioned (see union_invented) because there
# a dropped line IS a lost question.
sync_remote() {
  git pull --rebase --autostash 2>/dev/null && return 0
  git rebase --abort 2>/dev/null || true
  # -X ours resolves content conflicts, but git still refuses modify/delete
  # conflicts (e.g. an archive-refresh run deletes
  # data/questions/00-27b-archive.json in the same window the 27B lane
  # rewrites it) — they surface as an unmerged index. Every following push
  # then dies non-fast-forward and the run ends in a fake "TOTAL AUTH
  # FAILURE" while the real work sits on the runner (observed 2026-10-18,
  # run 39151431625, ~30 min of 27B answers lost). Resolve whatever is left
  # keeping OUR side, then finish the merge so a push can actually happen.
  git merge --no-edit -X ours FETCH_HEAD 2>/dev/null || true
  if [ -f .git/MERGE_HEAD ]; then
    git add -A 2>/dev/null || true
    git commit --no-edit >/dev/null 2>&1 || true
  fi
  return 0
}

# The invented-questions pool (data/invented/questions.json) is append-only,
# so "-X ours" above can drop a racing invent run's questions (observed
# 2026-10-18: a 27B publish replaced the 9b run's 9 questions). Union the
# arrays instead: remote questions first, ours appended by id; fold the
# result into the commit this run is publishing. Idempotent, and a no-op
# for the many workflows whose checkout has no data/invented at all.
union_invented() {
  local f=data/invented/questions.json
  [ -f "$f" ] || return 0
  local ref="" cand
  for cand in FETCH_HEAD origin/main MERGE_HEAD; do
    if git cat-file -e "$cand:$f" 2>/dev/null; then ref="$cand"; break; fi
  done
  [ -n "$ref" ] || return 0
  git show "$ref:$f" > "$f.remote.json" 2>/dev/null || { rm -f "$f.remote.json"; return 0; }
  node scripts/union-invented.js "$f.remote.json" "$f" || true
  rm -f "$f.remote.json"
  git add "$f" 2>/dev/null || true
  if ! git diff --cached --quiet 2>/dev/null; then
    git commit --amend --no-edit >/dev/null 2>&1 || true
  fi
  return 0
}

try_push() {
  # $1 = label for logs. Echoes server output to stdout, returns push status.
  local out
  sync_remote
  union_invented
  out=$(git push 2>&1)
  local st=$?
  echo "$out"
  if [ $st -eq 0 ]; then return 0; fi
  if echo "$out" | grep -qi "403\|401\|authentication failed\|invalid credentials\|could not read Username\|permission denied (.*token)"; then
    return 2
  fi
  return 1
}

PAT_AUTH=0
for i in 1 2 3; do
  echo "[ci-push] push attempt $i (PAT)..."
  try_push "pat"
  ST=$?
  if [ $ST -eq 0 ]; then echo "[ci-push] Pushed with PAT"; exit 0; fi
  if [ $ST -eq 2 ]; then PAT_AUTH=1; echo "[ci-push] PAT looks dead"; break; fi
  echo "[ci-push] transient push failure, retrying..."
  sleep 5
done

# --- Fallback: same push via GITHUB_TOKEN ---
if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "::error::ci-push: PAT push failed AND no GITHUB_TOKEN available — work is committed locally but UNPUBLISHED"
  exit 1
fi
# Only an auth-shaped rejection proves the PAT is dead; a transient failure
# (push race, conflict left by sync_remote) just means retry via the token.
# Never write PAT-DEAD for a transient failure — that is how a false
# "renew secrets" alarm shipped on 2026-10-18 (run 39151431625).
if [ "$PAT_AUTH" = "1" ]; then
  echo "::warning::ci-push: PAT push rejected as unauthorized — falling back to GITHUB_TOKEN (downstream workflows will NOT trigger for this run)"
else
  echo "::warning::ci-push: PAT push failed transiently (not an auth error) — falling back to GITHUB_TOKEN (downstream workflows will NOT trigger for this run)"
fi
git remote set-url origin "https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"
if [ "$PAT_AUTH" = "1" ]; then
  mkdir -p data
  printf '{"status":"PAT-DEAD","detail":"PAT push failed %s — published via GITHUB_TOKEN fallback; renew secrets.PAT or downstream triggers stay skipped.","checked":"%s"}\n' \
    "$(date -u +'%Y-%m-%d %H:%M UTC')" "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" > data/auth-status.json
  git add data/auth-status.json 2>/dev/null || true
  git commit -m "ci-push: PAT-dead fallback marker" 2>/dev/null || true
fi
for i in 1 2 3; do
  echo "[ci-push] fallback push attempt $i (GITHUB_TOKEN)..."
  sync_remote
  union_invented
  if git push 2>&1; then
    if [ "$PAT_AUTH" = "1" ]; then
      echo "::error::ci-push: published via GITHUB_TOKEN fallback — PAT IS DEAD, renew secrets.PAT"
    else
      echo "::error::ci-push: published via GITHUB_TOKEN fallback after TRANSIENT PAT failures (PAT not proven dead — check auth-sentinel) — downstream triggers skipped for this run"
    fi
    exit 1
  fi
  sleep 5
done
echo "::error::ci-push: TOTAL AUTH FAILURE — neither PAT nor GITHUB_TOKEN can push. Renew secrets. Work is committed in the runner workspace only."
exit 1
