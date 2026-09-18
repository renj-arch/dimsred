#!/usr/bin/env bash
# Retrying artifact downloader for workflow recovery.
#
# actions/download-artifact@v4 fires every download in parallel and aborts the
# whole step the instant any single blob GET returns a transient 503 ("No server
# is currently available…") — exactly what killed run #441's merge retries and
# the recovery dry-runs on 2026-08-17. This script pulls each artifact
# sequentially (disk-safe: unzips + deletes each archive as it lands) and, when
# the artifact service is in a flaky window where individual blobs 503 for
# minutes, keeps sweeping the failing set across multiple rounds instead of
# aborting the batch.
#
# Usage:
#   GITHUB_TOKEN=... bash scripts/download-run-artifacts.sh RUN_ID '^chunk-[0-9]+$' DEST
#
# Env:
#   GITHUB_TOKEN  required (in Actions it is pre-populated)
#   REPO          default $GITHUB_REPOSITORY

set -uo pipefail

RUN_ID="${1:?run id required}"
PATTERN="${2:?artifact name regex required}"
DEST="${3:?destination dir required}"
REPO="${REPO:-${GITHUB_REPOSITORY:-}}"
TOKEN="${GITHUB_TOKEN:?GITHUB_TOKEN required}"
API="https://api.github.com/repos/${REPO}/actions/runs/${RUN_ID}/artifacts"
MAX_ROUNDS="${MAX_ROUNDS:-10}"
ROUND_SLEEP="${ROUND_SLEEP:-30}"

mkdir -p "$DEST"

# Page through the run's artifact list, collect id + name of matches.
ids=""
page=1
while :; do
  resp=$(curl -sS --retry 5 --retry-all-errors --retry-delay 3 \
    -H "Authorization: Bearer ${TOKEN}" -H "Accept: application/vnd.github+json" \
    "${API}?per_page=100&page=${page}") || { echo "ERROR: artifact list request failed"; exit 1; }
  hits=$(printf '%s' "$resp" | node -e '
    const d = JSON.parse(require("fs").readFileSync(0, "utf8"));
    const p = process.argv[1];
    (d.artifacts || []).forEach(a => {
      if (a.expired !== true && new RegExp(p).test(a.name)) console.log(a.id + " " + a.name);
    });
  ' "$PATTERN") || { echo "ERROR: failed to parse artifact list"; exit 1; }
  [ -n "$hits" ] && ids+="${hits}"$'\n'
  total=$(printf '%s' "$resp" | node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));process.stdout.write(String(d.total_count||0))')
  pages=$(( (10#${total:-0} + 99) / 100 ))
  [ "$page" -ge "$pages" ] && break
  page=$((page + 1))
done

[ -z "$ids" ] && { echo "No artifacts matched pattern '${PATTERN}' in run ${RUN_ID}"; exit 1; }

mapfile -t items <<< "$ids"

count=0
round=1
while [ "$round" -le "$MAX_ROUNDS" ]; do
  remaining=()
  for line in "${items[@]}"; do
    [ -z "$line" ] && continue
    id=${line%% *}
    name=${line#* }
    marker="${DEST}/.${name}.ok"
    [ -f "$marker" ] && continue
    tmp="${DEST}/.${name}.zip"
    if curl -sS -L --fail --retry 8 --retry-all-errors --retry-delay 5 \
       -H "Authorization: Bearer ${TOKEN}" \
       -o "$tmp" "https://api.github.com/repos/${REPO}/actions/artifacts/${id}/zip" \
       && [ -s "$tmp" ] \
       && unzip -oq "$tmp" -d "$DEST"; then
      rm -f "$tmp"
      touch "$marker"
      count=$((count + 1))
      echo "extracted ${name} (${count} total so far)"
    else
      rm -f "$tmp"
      remaining+=("$line")
    fi
  done
  if [ "${#remaining[@]}" -eq 0 ]; then
    echo "Downloaded ${count} artifact(s) into ${DEST}"
    exit 0
  fi
  echo "round ${round}/${MAX_ROUNDS}: ${#remaining[@]} artifact(s) still failing " \
      "(chunk-14 style 503 windows) — sleeping ${ROUND_SLEEP}s before next sweep"
  items=("${remaining[@]}")
  round=$((round + 1))
  [ "$round" -le "$MAX_ROUNDS" ] && sleep "$ROUND_SLEEP"
done

echo "ERROR: still failing after ${MAX_ROUNDS} rounds:"
for line in "${items[@]}"; do echo "  ${line%% *} ${line#* }"; done
exit 1