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

# A merge fallback once staged a marker-laden working copy with `git add -A`,
# and 246 files were published with `<<<<<<< HEAD` blocks. Strip markers from
# content files before the commit, then refuse to publish if anything remains
# or a generated store no longer parses.
if git diff --cached -U0 | grep -q '^+<<<<<<< '; then
  echo "[ci-push] conflict markers in staged files — repairing before commit"
  node scripts/resolve-conflict-markers.js || true
  git add -A 2>/dev/null || true
fi
if git diff --cached -U0 | grep -q '^+<<<<<<< '; then
  echo "[ci-push] refusing to commit files that still carry conflict markers"
  exit 1
fi
if [ -f scripts/check-generated-state.js ] && [ -f scripts/course-addons.json ]; then
  if ! node scripts/check-generated-state.js; then
    echo "[ci-push] refusing to commit a corrupt generated state file"
    exit 1
  fi
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
  # The checkout is typically fetch-depth: 1, so the run's base commit is the
  # shallow root. A fixed depth stops short of it once origin/main has moved
  # further than that many commits during the run. The rebase then replays
  # against unrelated history, the `-X ours` merge dies with "refusing to
  # merge unrelated histories", and the push is rejected as "behind its
  # remote counterpart" (Wiki Fill 2026-11-16, run #664: 364-368 commits
  # ahead, five rejected pushes). Deepen from the TIP until HEAD and the
  # fetched tip share a merge base. The checkout is a blob:none partial
  # clone, so this transfers commits and trees only, never blobs.
  if [ -f .git/shallow ]; then
    git fetch --depth=1 --no-tags origin main 2>/dev/null || true
    if ! git merge-base HEAD origin/main >/dev/null 2>&1; then
      local have_base="" depth
      for depth in 200 800 3200 12800; do
        timeout 240 git fetch --depth="$depth" --no-tags origin main 2>/dev/null || continue
        if git merge-base HEAD origin/main >/dev/null 2>&1; then
          have_base=1
          break
        fi
      done
      if [ -z "$have_base" ]; then
        echo "[ci-push] WARNING: no merge base with origin/main within 12,800 commits - rebase will replay unrelated history"
      fi
    fi
  fi
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
    # Resolve EVERY unmerged path, not a hardcoded list. The old code named
    # four course-state files and then ran `git add -A`, which staged the
    # conflict-marker working copies of everything else (scripts/course-addons
    # .json grew `<<<<<<< HEAD` markers this way and stopped parsing). Keep our
    # side here; the union_* steps below re-merge the append-only stores.
    while IFS= read -r f; do
      [ -n "$f" ] || continue
      git checkout --ours -- "$f" 2>/dev/null || true
      git add -- "$f" 2>/dev/null || true
    done < <(git diff --name-only --diff-filter=U 2>/dev/null)
    git add -A 2>/dev/null || true
    git commit --no-edit >/dev/null 2>&1 || true
  fi
  # Last resort: if we are still not a descendant of the fetched tip, put our
  # commit on top of it. The generated state files are union-merged afterwards
  # by union_course_state(), so a clean linear rebase is safe here.
  if ! git merge-base --is-ancestor FETCH_HEAD HEAD 2>/dev/null; then
    OUR=$(git rev-parse HEAD 2>/dev/null || true)
    if [ -n "$OUR" ]; then
      echo "[ci-push] still behind after merge - replaying $OUR onto FETCH_HEAD"
      git reset --hard FETCH_HEAD 2>/dev/null || true
      if ! git cherry-pick "$OUR" >/dev/null 2>&1; then
        while IFS= read -r f; do
          [ -n "$f" ] || continue
          git checkout --theirs -- "$f" 2>/dev/null || true
          git add -- "$f" 2>/dev/null || true
        done < <(git diff --name-only --diff-filter=U 2>/dev/null)
        git add -A 2>/dev/null || true
        git -c core.editor=true cherry-pick --continue >/dev/null 2>&1 || {
          git cherry-pick --abort >/dev/null 2>&1 || true
          git reset --hard "$OUR" >/dev/null 2>&1 || true
        }
      fi
    fi
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

# data/mains-fresh.json is rewritten wholesale by long site-agent runs. A run
# that started before a repair finished used to publish its stale copy through
# the `-X ours` fallback, silently reverting the repair (2026-11-07: the DPI
# answer lost the anchors added hours earlier). Union by id with the remote
# copy, then re-apply the quality rubric; anything that fails is dropped with
# a log line instead of failing the deploy gate.
union_mains_fresh() {
  local f=data/mains-fresh.json
  [ -f "$f" ] || return 0
  local ref="" cand
  for cand in FETCH_HEAD origin/main MERGE_HEAD; do
    if git cat-file -e "$cand:$f" 2>/dev/null; then ref="$cand"; break; fi
  done
  [ -n "$ref" ] || return 0
  git show "$ref:$f" > "$f.remote.json" 2>/dev/null || { rm -f "$f.remote.json"; return 0; }
  # Ours may be a conflicted mixture from the -X ours fallback: it can parse
  # as garbage. Use the committed version for our side instead.
  if git cat-file -e "HEAD:$f" 2>/dev/null; then
    git show "HEAD:$f" > "$f.ours.json" 2>/dev/null || cp "$f" "$f.ours.json" 2>/dev/null || true
  else
    cp "$f" "$f.ours.json" 2>/dev/null || true
  fi
  node scripts/merge-mains-fresh.js "$f.remote.json" "$f.ours.json" "$f" || {
    echo "[ci-push] WARNING: mains-fresh merge failed; keeping the remote pool"
    cp "$f.remote.json" "$f" 2>/dev/null || true
  }
  rm -f "$f.remote.json" "$f.ours.json"
  git add "$f" 2>/dev/null || true
  if ! git diff --cached --quiet 2>/dev/null; then
    git commit --amend --no-edit >/dev/null 2>&1 || true
  fi
  return 0
}

# data/questions/archive-cat-index.json is the registry the archive page and the
# Ask question bank read. It must never shrink: on 2026-11-07 a merge resolved a
# conflict with "-X ours" and published a 424-byte one-category index over the
# 21 MB, 145-category file, hiding 15.9 million questions. Keep whichever side
# declares more questions (see scripts/guard-archive-index.js). Only runs when
# this checkout actually carries the corpus file.
guard_archive_index() {
  local f=data/questions/archive-cat-index.json
  [ -f "$f" ] || return 0
  local ref="" cand
  for cand in FETCH_HEAD origin/main HEAD; do
    if git cat-file -e "$cand:$f" 2>/dev/null; then ref="$cand"; break; fi
  done
  [ -n "$ref" ] || return 0
  git show "$ref:$f" > "$f.remote.json" 2>/dev/null || { rm -f "$f.remote.json"; return 0; }
  node scripts/guard-archive-index.js "$f" "$f.remote.json" || true
  rm -f "$f.remote.json"
  git add "$f" 2>/dev/null || true
  if ! git diff --cached --quiet 2>/dev/null; then
    git commit --amend --no-edit >/dev/null 2>&1 || true
  fi
  return 0
}

# scripts/course-versions.json and course-depth.json are generated by parallel
# expand lanes. A whole-file "-X ours" loses the other lane's lessons; merge by
# key instead. Only runs when this checkout carries the files.
union_course_state() {
  local f ref cand
  for f in scripts/course-versions.json scripts/course-depth.json scripts/course-data.json scripts/course-practice.json scripts/course-addons.json; do
    [ -f "$f" ] || continue
    ref=""
    for cand in FETCH_HEAD origin/main MERGE_HEAD; do
      if git cat-file -e "$cand:$f" 2>/dev/null; then ref="$cand"; break; fi
    done
    [ -n "$ref" ] || continue
    git show "$ref:$f" > "$f.remote.json" 2>/dev/null || { rm -f "$f.remote.json"; continue; }
    node scripts/merge-course-state.js "$f.remote.json" "$f" "$f" || true
    rm -f "$f.remote.json"
    git add "$f" 2>/dev/null || true
    if ! git diff --cached --quiet 2>/dev/null; then
      git commit --amend --no-edit >/dev/null 2>&1 || true
    fi
  done
}

# data/figures/invented.json is append-only and keyed by figure id. A lane
# whose checkout predates another lane's figures used to overwrite the whole
# library (254 -> 17 on 2026-11-21), collapsing the figure hub. Union by id.
union_figures() {
  local f=data/figures/invented.json
  [ -f "$f" ] || return 0
  local ref="" cand
  for cand in FETCH_HEAD origin/main MERGE_HEAD; do
    if git cat-file -e "$cand:$f" 2>/dev/null; then ref="$cand"; break; fi
  done
  [ -n "$ref" ] || return 0
  git show "$ref:$f" > "$f.remote.json" 2>/dev/null || { rm -f "$f.remote.json"; return 0; }
  node scripts/merge-figure-store.js "$f.remote.json" "$f" "$f" || true
  rm -f "$f.remote.json"
  git add "$f" 2>/dev/null || true
  if ! git diff --cached --quiet 2>/dev/null; then
    git commit --amend --no-edit >/dev/null 2>&1 || true
  fi
}

try_push() {
  # $1 = label for logs. Echoes server output to stdout, returns push status.
  local out
  sync_remote
  union_invented
  union_mains_fresh
  guard_archive_index
  union_course_state
  union_figures
  out=$(git push origin HEAD:main 2>&1)
  local st=$?
  echo "$out"
  if [ $st -eq 0 ]; then return 0; fi
  if echo "$out" | grep -qi "403\|401\|authentication failed\|invalid credentials\|could not read Username\|permission denied (.*token)"; then
    return 2
  fi
  return 1
}

PAT_AUTH=0
# Parallel lanes finish within the same minute and race the push: each
# attempt re-syncs, but another lane can land in the pull->push gap. Eight
# jittered attempts (~2 min of coverage) beat the observed collision rate;
# three fixed 5s retries lost whole 90-minute runs on 2026-11-13.
for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
  echo "[ci-push] push attempt $i (PAT)..."
  try_push "pat"
  ST=$?
  if [ $ST -eq 0 ]; then echo "[ci-push] Pushed with PAT"; exit 0; fi
  if [ $ST -eq 2 ]; then PAT_AUTH=1; echo "[ci-push] PAT looks dead"; break; fi
  echo "[ci-push] transient push failure, retrying..."
  sleep $((4 + RANDOM % 10 + i))
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
for i in 1 2 3 4 5 6 7 8 9 10; do
  echo "[ci-push] fallback push attempt $i (GITHUB_TOKEN)..."
  sync_remote
  union_invented
  union_mains_fresh
  union_course_state
  union_figures
  if git push origin HEAD:main 2>&1; then
    if [ "$PAT_AUTH" = "1" ]; then
      # PAT is dead but GITHUB_TOKEN fallback published the work. This is not
      # a failure — the commit reached main. Warn so the skipped downstream
      # trigger and the expired PAT stay visible, but keep the run green so
      # the content-expansion pipeline isn't blocked by an expired PAT secret.
      echo "::warning::ci-push: published via GITHUB_TOKEN fallback — PAT IS DEAD, renew secrets.PAT, but content is published"
      exit 0
    else
      # The work IS published. A transient PAT race (another workflow pushing
      # at the same second) is not a failure: exiting 1 here turned routine
      # back-to-back publishes into red runs (Search index, Slim live mirror)
      # even though main received the commit. Warn so the skipped downstream
      # trigger stays visible, but keep the run green.
      echo "::warning::ci-push: published via GITHUB_TOKEN fallback after TRANSIENT PAT failures — downstream triggers skipped for this run"
      exit 0
    fi
  fi
  sleep $((4 + RANDOM % 10 + i))
done
# Not necessarily auth: sustained non-fast-forward races between parallel
# lanes land here too. The message says both so nobody chases a dead secret.
echo "::error::ci-push: push failed after all retries (auth OR sustained push races between lanes). Check for a live-branch/main lock or renew secrets if auth-shaped. Work is committed in the runner workspace only."
exit 1
