#!/usr/bin/env node
/**
 * notify.js — push a status line from a workflow back to the owner's Telegram.
 *
 * Usage:
 *   node scripts/telegram/notify.js "lesson-writer done: wrote 2 lessons, PR #92"
 *
 * The chat id comes from TELEGRAM_CHAT_ID if set; otherwise it is read from
 * data/telegram-state.json, which the control plane pins when the owner first
 * messages the bot. That means the only mandatory secret is TELEGRAM_TOKEN.
 *
 * Never fails the calling workflow: a notification problem must not turn a
 * successful render into a red run. Failures are logged and swallowed.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const TOKEN = process.env.TELEGRAM_TOKEN || '';
const ROOT = path.resolve(__dirname, '..', '..');
const STATE = path.join(ROOT, 'data', 'telegram-state.json');

function ownerFromState() {
  try {
    const s = JSON.parse(fs.readFileSync(STATE, 'utf8'));
    return s && s.owner ? String(s.owner) : '';
  } catch (e) { return ''; }
}

async function main() {
  const text = process.argv.slice(2).join(' ').trim();
  if (!text) { console.log('notify: nothing to send'); return; }
  if (!TOKEN) { console.log('notify: TELEGRAM_TOKEN unset — skipping'); return; }

  const chatId = String(process.env.TELEGRAM_CHAT_ID || '').trim() || ownerFromState();
  if (!chatId) { console.log('notify: no chat id yet — message the bot once, then retry'); return; }

  const r = await fetch('https://api.telegram.org/bot' + TOKEN + '/sendMessage', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 3900), disable_web_page_preview: true }),
  });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) { console.log('notify: telegram rejected — ' + JSON.stringify(j).slice(0, 200)); return; }
  console.log('notify: sent (' + text.length + ' chars)');
}

main().catch(function (e) {
  console.log('notify: swallowed error — ' + e.message);
});
