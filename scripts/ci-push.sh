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

try_push() {
  # $1 = label for logs. Echoes server output to stdout, returns push status.
  local out
  git pull --rebase --autostash 2>/dev/null || true
  out=$(git push 2>&1)
  local st=$?
  echo "$out"
  if [ $st -eq 0 ]; then return 0; fi
  if echo "$out" | grep -qi "403\|401\|authentication failed\|invalid credentials\|could not read Username\|permission denied (.*token)"; then
    return 2
  fi
  return 1
}

for i in 1 2 3; do
  echo "[ci-push] push attempt $i (PAT)..."
  try_push "pat"
  ST=$?
  if [ $ST -eq 0 ]; then echo "[ci-push] Pushed with PAT"; exit 0; fi
  if [ $ST -eq 2 ]; then echo "[ci-push] PAT looks dead"; break; fi
  echo "[ci-push] transient push failure, retrying..."
  sleep 5
done

# --- PAT-death fallback: same push via GITHUB_TOKEN ---
if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "::error::ci-push: PAT push failed AND no GITHUB_TOKEN available — work is committed locally but UNPUBLISHED"
  exit 1
fi
echo "::warning::ci-push: PAT push failed — falling back to GITHUB_TOKEN (downstream workflows will NOT trigger for this run)"
git remote set-url origin "https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"
mkdir -p data
printf '{"status":"PAT-DEAD","detail":"PAT push failed %s — published via GITHUB_TOKEN fallback; renew secrets.PAT or downstream triggers stay skipped.","checked":"%s"}\n' \
  "$(date -u +'%Y-%m-%d %H:%M UTC')" "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" > data/auth-status.json
git add data/auth-status.json 2>/dev/null || true
git commit -m "ci-push: PAT-dead fallback marker" 2>/dev/null || true
for i in 1 2 3; do
  echo "[ci-push] fallback push attempt $i (GITHUB_TOKEN)..."
  if git pull --rebase --autostash 2>/dev/null && git push 2>&1; then
    echo "::error::ci-push: published via GITHUB_TOKEN fallback — PAT IS DEAD, renew secrets.PAT"
    exit 1
  fi
  sleep 5
done
echo "::error::ci-push: TOTAL AUTH FAILURE — neither PAT nor GITHUB_TOKEN can push. Renew secrets. Work is committed in the runner workspace only."
exit 1
