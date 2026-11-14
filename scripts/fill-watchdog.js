// Fill watchdog — the hand that restarts a dead corpus-growth chain.
//
// Why this exists: the archive/question count only moves when a fill run
// (Wiki Fill / Wiki Fill Recovery / Feed Fill) reaches its commit step, and a
// cancelled run never self-dispatches a successor — the chain only continues
// after a successful commit. GitHub job caps cancel long runs; a shared
// concurrency group once cancelled queued runs whenever a newer one entered;
// a stalled chain therefore leaves every surface looking "finished"
// (archive-refresh keeps re-stamping the page timestamp from an unchanged
// corpus) while nothing is actually running and no new questions land.
//
// This is the missing sensor + hand: when no fill workflow has succeeded
// within FILL_STALE_HOURS (default 30) and none is queued/running, dispatch a
// fresh Wiki Fill run. fault-status.yml runs it every 6h; run it by hand with
// `node scripts/fill-watchdog.js` (FILL_DRY=1 to only report). Always exits
// 0 — a healer, never a gate.
//
// Requires: gh CLI + GITHUB_TOKEN/GH_TOKEN (both present on Actions runners).

const { execFileSync } = require('child_process');

const STALE_HOURS = parseInt(process.env.FILL_STALE_HOURS || '30', 10);
const FILL_WORKFLOWS = ['daily-wiki-fill.yml', 'recover-wiki-fill.yml', 'daily-feed-fill.yml'];
const NEXT_RUN_WORKFLOW = 'daily-wiki-fill.yml';

function summary(line) {
  console.log(line);
  if (process.env.GITHUB_STEP_SUMMARY) {
    try { require('fs').appendFileSync(process.env.GITHUB_STEP_SUMMARY, line + '\n'); } catch (e) { /* summary optional */ }
  }
}

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', timeout: 30000 });
}

function main() {
  const all = [];
  FILL_WORKFLOWS.forEach(function (wf) {
    try {
      JSON.parse(gh(['run', 'list', '--workflow', wf, '--limit', '12',
        '--json', 'status,conclusion,updatedAt,number']))
        .forEach(function (r) { r.workflow = wf; all.push(r); });
    } catch (e) {
      console.log('fill-watchdog: history unavailable for ' + wf + ' — ' + (e.message || e));
    }
  });
  if (!all.length) { summary('fill-watchdog: no run history available (no token or gh missing) — nothing to judge'); return; }

  const now = Date.now();
  const active = all.filter(function (r) { return r.status !== 'completed'; });
  let lastSuccess = null;
  all.forEach(function (r) {
    const at = Date.parse(r.updatedAt || '') || 0;
    if (r.conclusion === 'success' && (!lastSuccess || at > lastSuccess.at)) {
      lastSuccess = { at: at, workflow: r.workflow, updatedAt: r.updatedAt };
    }
  });
  const lastText = lastSuccess
    ? String(lastSuccess.updatedAt).replace('T', ' ').slice(0, 16) + 'Z (' + lastSuccess.workflow.replace(/\.yml$/, '') + ')'
    : 'none in the last 12 runs of each fill workflow';

  if (active.length) {
    summary('fill-watchdog: chain alive — ' + active.map(function (r) {
      return r.workflow.replace(/\.yml$/, '') + ' #' + r.number + ' ' + r.status;
    }).join(', ') + ' · last success: ' + lastText + ' — no action');
    return;
  }

  const hours = lastSuccess ? (now - lastSuccess.at) / 3600000 : null;
  if (lastSuccess && hours <= STALE_HOURS) {
    summary('fill-watchdog: last success ' + Math.round(hours) + 'h ago (' + lastText + ') — within the ' + STALE_HOURS + 'h window, no action');
    return;
  }

  const staleDesc = lastSuccess
    ? Math.round(hours) + 'h since the last success (' + lastText + ')'
    : 'no success in the recent run history';
  if (process.env.FILL_DRY === '1' || process.env.FILL_DRY === 'true') {
    summary('fill-watchdog: STALLED — ' + staleDesc + ' — dry run, would dispatch ' + NEXT_RUN_WORKFLOW);
    return;
  }
  if (!process.env.GITHUB_TOKEN && !process.env.GH_TOKEN) {
    summary('fill-watchdog: STALLED — ' + staleDesc + ' — no token to dispatch with');
    return;
  }
  try {
    gh(['workflow', 'run', NEXT_RUN_WORKFLOW, '--ref', 'main']);
    summary('fill-watchdog: STALLED — ' + staleDesc + ' — dispatched ' + NEXT_RUN_WORKFLOW + ' to restart the chain');
  } catch (e) {
    summary('fill-watchdog: STALLED — ' + staleDesc + ' — dispatch failed: ' + (e.message || e));
  }
}

try { main(); } catch (e) {
  console.log('fill-watchdog: unexpected error — ' + (e && e.message || e));
}
process.exit(0);
