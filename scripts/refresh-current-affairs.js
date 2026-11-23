#!/usr/bin/env node
/**
 * refresh-current-affairs.js — keep the Current Affairs lesson dated and current.
 *
 * The news wire (data/news.json) refreshes constantly, but no lesson carried it:
 * a student reading the Current Affairs lesson could not see what happened this
 * week. This lane writes a dated "Recent developments" block from the wire into
 * the lesson (page + source store), grouped by GS subject, with the source link.
 *
 * It only lists real headlines with their links — no model prose, so nothing can
 * be invented. The block is replaced, not appended, so the page does not grow.
 *
 *   node scripts/refresh-current-affairs.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const NEWS = path.join(ROOT, 'data', 'news.json');
const PAGE = path.join(ROOT, 'upsc', 'course', 'gs', 'lesson-current-affairs.html');
const DATA = path.join(ROOT, 'scripts', 'course-data.json');
const KEY = 'gs/current-affairs';
const DAYS = parseInt(process.env.CA_REFRESH_DAYS || '14', 10) || 14;

// News desk -> GS subject label.
const GROUP = {
  top: 'Top developments', national: 'Polity, Governance & Society',
  international: 'International Relations', business: 'Economy & Business',
  tech: 'Science & Technology', health: 'Health & Social Sector',
  science: 'Science & Environment', environment: 'Environment & Ecology',
  education: 'Education & Welfare', sports: 'Sports', entertainment: 'Culture & Media',
  opinion: 'Opinion & Analysis', trending: 'Trending (not independently verified)'
};
const ORDER = ['Polity, Governance & Society', 'International Relations', 'Economy & Business',
  'Science & Technology', 'Science & Environment', 'Environment & Ecology', 'Health & Social Sector',
  'Education & Welfare', 'Top developments', 'Sports', 'Culture & Media', 'Opinion & Analysis', 'Trending (not independently verified)'];

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const START = '<!-- recent-developments -->';
const END = '<!-- /recent-developments -->';
let used = 0;

function build() {
  let news;
  try { news = JSON.parse(fs.readFileSync(NEWS, 'utf8')); } catch (e) { console.log('no news store'); return ''; }
  const cutoff = Date.now() - DAYS * 86400000;
  const byGroup = {};
  used = 0;
  for (const sec of news.sections || []) {
    const group = GROUP[sec.id] || null;
    if (!group) continue;
    for (const item of (sec.items || []).slice(0, 40)) {
      const t = Date.parse(item.publishedAt || '');
      if (!item.title || (isFinite(t) && t < cutoff)) continue;
      (byGroup[group] = byGroup[group] || []).push(item);
      used++;
    }
  }
  if (!used) return '';
  const today = new Date().toISOString().slice(0, 10);
  let html = START + '\n<h2 id="recent-developments">Recent developments — as of ' + today + '</h2>\n' +
    '<p>Headlines from the site\'s news wire over the last ' + DAYS + ' days, grouped by the GS paper they touch. Each links to its source; this block is rebuilt automatically, so it is current without any model rewriting.</p>\n';
  for (const group of ORDER) {
    const items = byGroup[group];
    if (!items || !items.length) continue;
    const seen = {};
    html += '<h3>' + esc(group) + '</h3><ul>';
    for (const it of items.slice(0, 15)) {
      const key = String(it.title).slice(0, 80);
      if (seen[key]) continue;
      seen[key] = 1;
      html += '<li>' + esc(it.title) + (it.link ? ' — <a href="' + esc(it.link) + '" rel="nofollow">source</a>' : '') + '</li>';
    }
    html += '</ul>';
  }
  html += '<p style="color:#94a3b8;font-size:.9em">Wire headlines are not independently verified; use them to spot what to read, then confirm from the linked source or an official release.</p>\n' + END;
  return html;
}

function replaceBlock(text, block) {
  const s = text.indexOf(START);
  const e = text.indexOf(END);
  if (s !== -1 && e !== -1 && e > s) return text.slice(0, s) + block + text.slice(e + END.length);
  // First time: put it right after the opening of the lesson body so it is the
  // first thing a reader sees on the Current Affairs page.
  const marker = '<div class="lesson-body"';
  const i = text.indexOf(marker);
  if (i !== -1) {
    const close = text.indexOf('>', i);
    if (close !== -1) return text.slice(0, close + 1) + '\n' + block + '\n' + text.slice(close + 1);
  }
  // Source store: the value is the lesson body itself, with no wrapper.
  return block + '\n' + text;
}

const block = build();
if (!block) { console.log('refresh-current-affairs: nothing fresh to add'); process.exit(0); }

let changed = 0;
if (fs.existsSync(PAGE)) {
  const html = fs.readFileSync(PAGE, 'utf8');
  const next = replaceBlock(html, block);
  if (next) { fs.writeFileSync(PAGE, next, 'utf8'); changed++; }
}
try {
  const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  if (typeof data[KEY] === 'string') {
    const next = replaceBlock(data[KEY], block);
    if (next) { data[KEY] = next; fs.writeFileSync(DATA, JSON.stringify(data, null, 2) + '\n', 'utf8'); changed++; }
  }
} catch (e) { console.log('course-data not updated: ' + e.message); }

console.log('refresh-current-affairs: updated ' + changed + ' file(s), ' + used + ' headline(s)');