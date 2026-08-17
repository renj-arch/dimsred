#!/usr/bin/env bash
# Retrying artifact downloader for workflow recovery.
#
# actions/download-artifact@v4 fires every download in parallel and aborts the
# whole step the instant any single blob GET returns a transient 503 ("No server
# is currently available…") — exactly what killed run #441's merge retries and
# the recovery dry-runs on 2026-08-17. This script pulls each artifact
# sequentially with retry/backoff so one flaky blob response can never sink the
# batch, and unzips each archive as it lands (deleting the zip) so it is also
# disk-safe.
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

count=0
while IFS= read -r line; do
  [ -z "$line" ] && continue
  id=${line%% *}
  name=${line#* }
  tmp="${DEST}/.${name}.zip"
  echo "== downloading ${name} (${id})"
  ok=0
  for attempt in 1 2 3 4 5; do
    if curl -sS -L --fail --retry 5 --retry-all-errors --retry-delay 3 \
       -H "Authorization: Bearer ${TOKEN}" \
       -o "$tmp" "https://api.github.com/repos/${REPO}/actions/artifacts/${id}/zip"; then
      ok=1
      break
    else
      echo "   attempt ${attempt} failed, retrying in 5s..."
      sleep 5
    fi
  done
  if [ "$ok" -ne 1 ] || [ ! -s "$tmp" ]; then
    echo "ERROR: failed to download artifact ${name} (${id})"
    exit 1
  fi
  if ! unzip -oq "$tmp" -d "$DEST"; then
    echo "ERROR: unzip failed for ${name}"
    exit 1
  fi
  rm -f "$tmp"
  count=$((count + 1))
  echo "   extracted ${name} (${count} total so far)"
done <<< "$ids"

echo "Downloaded ${count} artifact(s) into ${DEST}"
