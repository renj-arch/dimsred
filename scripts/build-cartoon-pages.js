#!/usr/bin/env node
'use strict';
/**
 * build-cartoon-pages.js — give every passage cartoon its own page and a hub.
 *
 * Cartoons live as inline SVG inside lessons (floated beside the passage), so
 * there is no image file to link to. This writes:
 *   cartoons/<id>.html   one page per cartoon (full-size SVG + lesson link)
 *   cartoons/index.html  a grid of every cartoon
 *
 *   node scripts/build-cartoon-pages.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'cartoons');

function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

function lessons() {
  const out = [];
  (function walk(dir) {
    let es = []; try { es = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
    for (const e of es) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/^lesson-.*\.html$/.test(e.name)) out.push(p);
    }
  })(path.join(ROOT, 'upsc', 'course'));
  return out.sort();
}

const items = [];
for (const file of lessons()) {
  let html; try { html = fs.readFileSync(file, 'utf8'); } catch (e) { continue; }
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const clean = rel.replace(/\.html$/, '');
  const lessonTitle = ((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [, ''])[1] || '').replace(/<[^>]+>/g, '').trim() || rel;
  const re = /<figure class="passage-cartoon" data-cartoon="([a-z0-9]+)">([\s\S]*?)<\/figure>/g;
  let m;
  while ((m = re.exec(html))) {
    const id = m[1];
    const block = m[0];
    const svg = (block.match(/<svg[\s\S]*?<\/svg>/i) || [])[0];
    if (!svg) continue;
    const cap = ((block.match(/<figcaption>([\s\S]*?)<\/figcaption>/) || [, ''])[1] || '').replace(/<[^>]+>/g, '').trim();
    // nearest preceding heading
    const before = html.slice(0, m.index);
    const h = [...before.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/g)].pop();
    const heading = h ? h[1].replace(/<[^>]+>/g, '').trim() : cap;
    items.push({ id, svg, cap, heading, lessonTitle, clean });
  }
}

fs.mkdirSync(OUT, { recursive: true });
const page = (title, body) => `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} | vlymbooq</title>
<link rel="stylesheet" href="/css/style.css">
<style>
body{background:#09090b;color:#fafafa;font-family:Inter,system-ui,sans-serif;margin:0}
.wrap{max-width:1000px;margin:0 auto;padding:24px}
a{color:#a78bfa;text-decoration:none}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:16px}
.card{background:#111113;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px;transition:border-color .2s}
.card:hover{border-color:#a78bfa}
.card .fr{background:#fbf7ec;border-radius:8px;padding:6px}
.card svg{width:100%;height:auto;display:block}
.card .t{font-size:.82em;color:#d4d4d8;margin:8px 2px 2px;line-height:1.35}
.card .l{font-size:.7em;color:#71717a;margin:0 2px 6px}
.hero{background:#fbf7ec;border-radius:12px;padding:14px;margin:16px 0}
.hero svg{width:100%;height:auto;display:block}
.meta{color:#a1a1aa;font-size:.85em;line-height:1.6}
h1{font-size:1.5em;margin:0 0 6px}
</style></head><body><div class="wrap">${body}</div></body></html>`;

for (const it of items) {
  const body = `<p><a href="/cartoons/">← All cartoons</a></p>
<h1>${esc(it.heading)}</h1>
<p class="meta">${esc(it.lessonTitle)} · <a href="/${esc(it.clean)}">Read the lesson →</a></p>
<div class="hero">${it.svg}</div>
<p class="meta">${esc(it.cap)}</p>`;
  fs.writeFileSync(path.join(OUT, it.id + '.html'), page('Cartoon: ' + it.heading, body), 'utf8');
}

const cards = items.map((it) => `<a class="card" href="/cartoons/${it.id}.html">
  <div class="fr">${it.svg}</div>
  <div class="t">${esc(it.heading)}</div>
  <div class="l">${esc(it.lessonTitle)}</div>
</a>`).join('\n');

const index = `<h1>Passage Cartoons</h1>
<p class="meta">${items.length} mini editorial cartoon${items.length === 1 ? '' : 's'} — one per UPSC passage, showing the section in a nutshell. <a href="/upsc/course/">Browse the course →</a></p>
<div class="grid">${cards || '<p class="meta">No cartoons yet.</p>'}</div>`;
fs.writeFileSync(path.join(OUT, 'index.html'), page('Passage Cartoons', index), 'utf8');
console.log('cartoon pages: ' + items.length + ' | hub: cartoons/index.html');