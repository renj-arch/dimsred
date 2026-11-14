#!/usr/bin/env node
/**
 * poll.js — Telegram control plane for the cloud agent.
 *
 * Runs on a 5-minute schedule inside GitHub Actions. It reads new Telegram
 * messages, turns a small command vocabulary into GitHub API dispatches, and
 * replies in the same chat. Nothing runs on the owner's machine.
 *
 * Commands
 *   /help                 this message
 *   /status               queue depth, open PRs, recent lane results
 *   /queue                the pending lesson list
 *   /deepen [n]           hand-write n queued lessons (default 2)
 *   /expand [lane]        run the expand-course lane on main
 *
 * State (data/telegram-state.json, force-added because data/* is gitignored):
 *   lastUpdateId  Telegram getUpdates cursor
 *   owner         chat id adopted on the first command, so the bot obeys one
 *                 chat only and ignores everyone else
 *
 * Env:
 *   TELEGRAM_TOKEN   bot token (secret)
 *   DISPATCH_TOKEN   PAT with contents:write (secret.PAT); falls back to GITHUB_TOKEN
 *   OWNER_CHAT_ID    optional pre-set chat id (secret); adopted automatically if absent
 */
'use strict';

const fs = require('fs');
const path = require('path');

const TOKEN = process.env.TELEGRAM_TOKEN || '';
const OWNER_ENV = String(process.env.OWNER_CHAT_ID || '').trim();
const REPO = process.env.GITHUB_REPOSITORY || 'renj-arch/dimsred';
const DISPATCH_TOKEN = process.env.DISPATCH_TOKEN || process.env.GITHUB_TOKEN || '';
const ROOT = path.resolve(__dirname, '..', '..');
const STATE = path.join(ROOT, 'data', 'telegram-state.json');
const QUEUE = path.join(ROOT, 'data', 'deep-rewrite-queue.json');

if (!TOKEN) {
  // Do not fail the scheduled run: the workflow is merged before the owner has
  // necessarily created the bot. A red run every five minutes is noise, so
  // warn once per poll and exit green. Commands do nothing until the secret
  // exists, which is the correct behaviour.
  console.log('::warning::poll: TELEGRAM_TOKEN is not set — add it as a repository secret to enable the control plane.');
  process.exit(0);
}

const TG = 'https://api.telegram.org/bot' + TOKEN;
const GH = 'https://api.github.com';

function readJson(file, dflt) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return dflt; }
}

function readState() {
  const s = readJson(STATE, null);
  if (!s || typeof s !== 'object') return { lastUpdateId: 0, owner: null };
  return { lastUpdateId: Number(s.lastUpdateId) || 0, owner: s.owner || null };
}

function writeState(s) {
  fs.mkdirSync(path.dirname(STATE), { recursive: true });
  fs.writeFileSync(STATE, JSON.stringify(s, null, 2) + '\n');
}

async function tg(method, body) {
  const r = await fetch(TG + '/' + method, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) throw new Error('telegram ' + method + ': ' + JSON.stringify(j).slice(0, 200));
  return j.result;
}

async function gh(pathname, opts) {
  opts = opts || {};
  const r = await fetch(GH + pathname, {
    method: opts.method || 'GET',
    headers: {
      Authorization: 'Bearer ' + DISPATCH_TOKEN,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'dimsred-telegram-control',
      ...(opts.headers || {}),
    },
    body: opts.body,
  });
  const t = await r.text();
  if (!r.ok) throw new Error(pathname + ' -> ' + r.status + ' ' + t.slice(0, 200));
  return t ? JSON.parse(t) : null;
}

const HELP = [
  'Cloud agent control',
  '',
  '/status — queue depth, open PRs, recent lane results',
  '/queue — pending lessons',
  '/deepen [n] — hand-write n queued lessons (default 2)',
  '/expand [lane] — run the expand-course lane',
  '/help — this message',
].join('\n');

function queueList() {
  const q = readJson(QUEUE, []);
  if (!Array.isArray(q)) return [];
  return q.map(function (x) { return typeof x === 'string' ? x : (x.file || JSON.stringify(x)); });
}

async function cmdStatus() {
  const q = queueList();
  let openPrs = '?', runs = '?';
  try {
    const prs = await gh('/repos/' + REPO + '/pulls?state=open&per_page=100');
    openPrs = prs.length;
  } catch (e) { openPrs = 'n/a'; }
  try {
    const r = await gh('/repos/' + REPO + '/actions/runs?per_page=5');
    runs = (r.workflow_runs || []).map(function (x) {
      return (x.conclusion || x.status) + ' ' + x.name;
    }).join('\n');
  } catch (e) { runs = 'n/a'; }
  return 'Status\nQueue: ' + q.length + ' lessons pending\nOpen PRs: ' + openPrs + '\n\nRecent runs:\n' + runs;
}

async function cmdQueue() {
  const q = queueList();
  if (!q.length) return 'Queue is empty.';
  return 'Pending (' + q.length + '):\n' + q.map(function (f) { return '• ' + f.split('/').pop(); }).join('\n');
}

async function cmdDeepen(args) {
  const n = Math.max(1, Math.min(10, parseInt(args, 10) || 2));
  await gh('/repos/' + REPO + '/dispatches', {
    method: 'POST',
    body: JSON.stringify({ event_type: 'lesson-writer', client_payload: { batch: n } }),
  });
  return 'Dispatched lesson-writer for up to ' + n + ' lesson(s). I will report back when it finishes.';
}

async function cmdExpand(args) {
  const lane = String(args || '').trim();
  await gh('/repos/' + REPO + '/actions/workflows/expand-course.yml/dispatches', {
    method: 'POST',
    body: JSON.stringify({ ref: 'main', inputs: lane ? { lane: lane } : {} }),
  });
  return 'Dispatched expand-course' + (lane ? ' (lane ' + lane + ')' : '') + '.';
}

async function handle(text) {
  const parts = String(text || '').trim().split(/\s+/);
  const cmd = (parts.shift() || '').toLowerCase().replace(/@\w+$/, '');
  const rest = parts.join(' ');
  switch (cmd) {
    case '/help': case '/start': return HELP;
    case '/status': return await cmdStatus();
    case '/queue': return await cmdQueue();
    case '/deepen': return await cmdDeepen(rest);
    case '/expand': return await cmdExpand(rest);
    default: return 'Unknown command. Send /help.';
  }
}

async function main() {
  const state = readState();
  const offset = state.lastUpdateId ? state.lastUpdateId + 1 : 0;
  const updates = await tg('getUpdates', { offset: offset, timeout: 0, allowed_updates: ['message'] });
  if (!updates.length) {
    console.log('poll: no new messages');
    return;
  }

  let maxId = state.lastUpdateId;
  let dirty = false;
  for (const u of updates) {
    maxId = Math.max(maxId, u.update_id);
    const msg = u.message;
    if (!msg || !msg.text) continue;
    const chatId = msg.chat && msg.chat.id;
    if (chatId == null) continue;

    const owner = state.owner || OWNER_ENV || null;
    if (!owner) {
      state.owner = String(chatId);
      dirty = true;
      console.log('poll: adopted owner chat ' + state.owner);
    } else if (String(chatId) !== String(owner)) {
      console.log('poll: ignoring message from unauthorised chat ' + chatId);
      continue;
    }

    let reply;
    try {
      reply = await handle(msg.text);
    } catch (e) {
      reply = 'Error: ' + e.message;
    }
    try {
      await tg('sendMessage', { chat_id: chatId, text: reply, disable_web_page_preview: true });
    } catch (e) {
      console.error('poll: could not reply — ' + e.message);
    }
  }

  if (maxId !== state.lastUpdateId || dirty) {
    state.lastUpdateId = maxId;
    writeState(state);
    console.log('poll: cursor advanced to ' + maxId);
  }
}

main().catch(function (e) {
  console.error('poll failed: ' + e.message);
  process.exit(1);
});
