#!/usr/bin/env node
'use strict';
// Pick the next slice of course work for one expansion lane.
//
// The four expand-course lanes each re-dispatch themselves when they finish, so
// the course grows back-to-back instead of waiting for a clock slot. The scope
// of each lane used to be a frozen list of lesson keys hardcoded in the
// workflow. That works until the list reaches its depth target -- and then the
// lane keeps re-queuing itself every 25 seconds while it writes nothing:
//
//   Course worklist: 0 empty slot(s), 0 thin lesson(s), 0 depth candidate(s)
//   Nothing to fill.
//
// That is not a cosmetic problem. It burns a runner slot, it makes the Actions
// list unreadable, and it hides the fact that 330 lessons are still under
// target and only one lane is actually working on them.
//
// This script asks the expander for the live worklist (a dry run: no model
// calls, ~1 second), then hands back the slice that belongs to one lane. The
// slice is a stable hash of the key, so two lanes can never pick the same
// lesson, and a lane whose slice is empty ends its chain honestly instead of
// spinning.
//
//   node scripts/course-lane.js --lane 1 --lanes 4 --limit 20
//   node scripts/course-lane.js --lane 1 --lanes 4 --limit 20 --json
//
// stdout is the comma-separated key list (empty when this lane has no work).
// Diagnostics go to stderr so `KEYS=$(...)` stays clean.

var cp = require('child_process');
var fs = require('fs');
var os = require('os');
var path = require('path');

var ROOT = path.join(__dirname, '..');

function arg(name, dflt) {
  var i = process.argv.indexOf('--' + name);
  if (i === -1) return dflt;
  var v = process.argv[i + 1];
  return v == null || v.indexOf('--') === 0 ? true : v;
}

var lane = parseInt(arg('lane', '0'), 10);
var lanes = parseInt(arg('lanes', '1'), 10);
var limit = parseInt(arg('limit', '20'), 10);
var asJson = !!arg('json', false);

if (!(lane >= 0)) fail('--lane must be 0 or greater');
if (!(lanes >= 1)) fail('--lanes must be 1 or greater');
if (lane >= lanes) fail('--lane ' + lane + ' is outside --lanes ' + lanes);
if (!(limit >= 1)) fail('--limit must be 1 or greater');

function fail(msg) {
  console.error('course-lane: ' + msg);
  process.exit(1);
}

function hash(s) {
  var h = 0;
  for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

var tmp = path.join(os.tmpdir(), 'course-worklist-' + process.pid + '.json');
var env = {};
Object.keys(process.env).forEach(function (k) { env[k] = process.env[k]; });
env.EXPAND_DRY = '1';
env.EXPAND_WORKLIST_JSON = tmp;
// The lane is choosing its own scope, so the caller's key filter must not leak
// into the dry run -- otherwise the worklist is just the old frozen list again.
env.EXPAND_ONLY_KEYS = '';
env.EXPAND_DEEPEN = '1';
env.EXPAND_THIN_THRESHOLD = env.EXPAND_THIN_THRESHOLD || '6000';
env.EXPAND_DEPTH_TARGET_WORDS = env.EXPAND_DEPTH_TARGET_WORDS || '8000';
env.EXPAND_DEPTH_TARGET_WORDS_BUILT = env.EXPAND_DEPTH_TARGET_WORDS_BUILT || '45000';

try {
  cp.execFileSync(process.execPath, [path.join(__dirname, 'expand-course.js')], {
    cwd: ROOT,
    env: env,
    stdio: ['ignore', 'ignore', 'inherit']
  });
} catch (e) {
  fail('the expander could not list its worklist (exit ' + (e.status == null ? '?' : e.status) + ')');
}

var work;
try {
  work = JSON.parse(fs.readFileSync(tmp, 'utf8'));
} catch (e) {
  fail('the expander wrote no worklist: ' + e.message);
} finally {
  try { fs.unlinkSync(tmp); } catch (e) { /* already gone */ }
}

// The expander already ordered each list by its own policy (hubs first, then
// widest coverage, then shortest stub). Interleave depth with fill the same way
// expand-course.js builds its run queue: a lane must not spend every run on
// depth while empty slots wait, or on fills while the depth lane starves.
var fillQueue = (work.fills || []).concat(work.thins || []);
var deepQueue = work.deeps || [];
var order = [];
var fi = 0, di = 0;
while (fi < fillQueue.length || di < deepQueue.length) {
  if (di < deepQueue.length) order.push(deepQueue[di++]);
  if (fi < fillQueue.length) order.push(fillQueue[fi++]);
}

var seen = {};
var mine = [];
order.forEach(function (g) {
  if (!g || !g.key || seen[g.key]) return;
  seen[g.key] = 1;
  if (hash(g.key) % lanes !== lane) return;
  mine.push(g);
});

// UPSC first. It is the flagship course: the mains papers are the ones a
// reader pays for elsewhere, so they must never wait behind an optional
// subject or a general hub page. The sort is stable within each group, so the
// expander's own hubs-then-widest ordering survives.
function isUpsc(key) {
  return /^(mains-|csat\/|upsc\/)/.test(key);
}
mine.sort(function (a, b) {
  var au = isUpsc(a.key) ? 0 : 1;
  var bu = isUpsc(b.key) ? 0 : 1;
  return au - bu;
});

var picked = mine.slice(0, limit);
var keys = picked.map(function (g) { return g.key; });

console.error('course-lane ' + lane + '/' + lanes + ': ' + order.length + ' lesson(s) under target, ' +
  mine.length + ' in this slice, handing over ' + keys.length);

if (asJson) {
  process.stdout.write(JSON.stringify({
    lane: lane, lanes: lanes, limit: limit,
    total: order.length, slice: mine.length, keys: keys
  }) + '\n');
} else {
  process.stdout.write(keys.join(','));
}
