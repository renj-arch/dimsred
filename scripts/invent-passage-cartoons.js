#!/usr/bin/env node
'use strict';
/**
 * invent-passage-cartoons.js — one mini editorial cartoon per passage.
 *
 * The request: every passage of a UPSC lesson should carry a small cartoon,
 * in the spirit of The Hindu's editorial cartoons, that conveys the passage's
 * whole argument at a glance — "a lengthy passage in a nutshell".
 *
 * Design:
 *   - A PASSAGE is a major section (each <h2> and the <h3> subsections under
 *     it) by default, or each <h3> with --granularity h3.
 *   - The model returns ONLY an <svg> single-panel ink cartoon: one central
 *     metaphor, 4-8 short labels taken from the passage.
 *   - The figure is inserted immediately after the section heading, so it
 *     floats beside the passage (CSS .passage-cartoon).
 *   - Idempotent: a hash of the section text is stored in the figure marker, so
 *     a second run never doubles a cartoon.
 *
 *   node scripts/invent-passage-cartoons.js --file upsc/course/gs/lesson-polity-prelims.html --max 2 --dry
 *   node scripts/invent-passage-cartoons.js --file <lesson> --max 2
 *   node scripts/invent-passage-cartoons.js --all --limit 5 --max 4 --workers 3
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const STORE = path.join(ROOT, 'data', 'passage-cartoons.json');

// Opt in to hosted routes from the key itself (same convention as invent-figure).
const ROUTES = { NVAPI: 'NVIDIA_API_KEY', GROQ: 'GROQ_API_KEY', OPENROUTER: 'OPENROUTER_API_KEY', GH_MODELS: 'GH_MODELS_TOKEN', GEMINI: 'GEMINI_API_KEY' };
for (const flag of Object.keys(ROUTES)) {
  if (process.env[ROUTES[flag]] && process.env[flag] !== '0') process.env[flag] = '1';
}

function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  if (i === -1) return dflt;
  const v = process.argv[i + 1];
  return v == null || v.indexOf('--') === 0 ? true : v;
}
function has(name) { return process.argv.indexOf('--' + name) !== -1; }

const DRY = has('dry');
const GRAN = String(arg('granularity', 'h2')).toLowerCase(); // h2 | h3
const MAX_PER_LESSON = Math.max(1, parseInt(arg('max', '6'), 10) || 6);
const LIMIT_LESSONS = parseInt(arg('limit', '0'), 10) || 0;
const WORKERS = Math.max(1, Math.min(6, parseInt(arg('workers', '3'), 10) || 3));
const DEADLINE_MIN = parseFloat(arg('deadline', '40')) || 40;
const MIN_WORDS = Math.max(60, parseInt(arg('min-words', '180'), 10) || 180);
const ONLY_FILE = arg('file', '');
const ALL = has('all');

const hash = (s) => crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 12);
const words = (s) => String(s).replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').split(/\s+/).filter((x) => x.length > 1).length;
const strip = (s) => String(s).replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(n, items.length)) }, worker));
  return out;
}
const eol = (s) => s;
function readStore() { try { return JSON.parse(fs.readFileSync(STORE, 'utf8')); } catch (e) { return { cartoons: {} }; } }
function saveStore(st) { fs.writeFileSync(STORE, JSON.stringify(st, null, 1) + '\n', 'utf8'); }

function lessons() {
  if (ONLY_FILE) return String(ONLY_FILE).split(',').map((s) => s.trim()).filter(Boolean).map((s) => path.resolve(ROOT, s));
  const out = [];
  (function walk(dir) {
    let es = [];
    try { es = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
    for (const e of es) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/^lesson-.*\.html$/.test(e.name)) out.push(p);
    }
  })(path.join(ROOT, 'upsc', 'course'));
  out.sort();
  return out;
}

// Split a lesson body into passages. Returns [{headingTag, headingHtml, endAt, text, title, key}].
function chunkSeg(seg, absStart, title) {
  const CHUNK = 950;
  if (words(seg) <= 1300) return [{ absAt: absStart, title, text: seg }];
  let blocks = [];
  let m;
  const reH3 = /<h3[\s\S]*?(?=<h3|$)/g;
  while ((m = reH3.exec(seg))) blocks.push({ at: m.index, html: m[0] });
  if (blocks.length <= 1) {
    blocks = [];
    const reP = /<p[\s\S]*?<\/p>/g;
    while ((m = reP.exec(seg))) blocks.push({ at: m.index, html: m[0] });
    if (!blocks.length) return [{ absAt: absStart, title, text: seg }];
    if (blocks[0].at > 0) blocks.unshift({ at: 0, html: seg.slice(0, blocks[0].at) });
  }
  const chunks = [];
  let acc = '', accAt = blocks[0].at;
  for (const b of blocks) {
    if (acc && words(acc) + words(b.html) > CHUNK && words(acc) >= 300) {
      chunks.push({ absAt: absStart + accAt, title: title + (chunks.length ? ' (' + (chunks.length + 1) + ')' : ''), text: acc });
      acc = '';
    }
    if (!acc) accAt = b.at;
    acc += b.html;
  }
  if (acc) chunks.push({ absAt: absStart + accAt, title: title + (chunks.length ? ' (' + (chunks.length + 1) + ')' : ''), text: acc });
  return chunks;
}

function passages(html) {
  const bodyStart = html.indexOf('<div class="lesson-body"');
  if (bodyStart < 0) return [];
  const bodyEnd = html.indexOf('id="practice-qs"');
  const body = html.slice(bodyStart, bodyEnd > 0 ? bodyEnd : undefined);
  const heads = [...body.matchAll(/<h([23])[^>]*>([\s\S]*?)<\/h\1>/g)];
  const out = [];
  // h2 = major section (default). h3 = each subsection. If a lesson has no h2,
  // fall back to h3 so it still gets cartoons.
  const picked = GRAN === 'h3' ? heads : heads.filter((h) => h[1] === '2');
  const list = picked.length ? picked : heads;
  for (let i = 0; i < list.length; i++) {
    const h = list[i];
    const start = h.index + h[0].length;
    // For h2 grouping, end at the next h2; for h3, end at the next heading of
    // the same list.
    const end = i + 1 < list.length ? list[i + 1].index : body.length;
    // Blank any cartoon already inserted (same length, so offsets stay valid)
    // before measuring words/chunks, so a re-run neither counts the SVG text
    // nor shifts the chunk offsets.
    const seg = body.slice(start, end).replace(/<!--\s*passage-cartoon:[\s\S]*?<\/figure>/g, function (m) { return ' '.repeat(m.length); });
    const title = strip(h[2]);
    if (/practice questions|learning objectives/i.test(title)) continue;
    if (words(seg) < MIN_WORDS) continue;
    for (const c of chunkSeg(seg, bodyStart + start, title)) out.push(c);
  }
  return out;
}

function prompt(title, text, lessonTitle) {
  const passage = strip(text).slice(0, 2400);
  return [
    'You are the editorial cartoonist of The Hindu. Draw ONE single-panel ink cartoon that captures the UPSC passage below in a nutshell: a reader who sees only the cartoon should grasp the argument.',
    '',
    'Return ONLY an <svg> element. No markdown, no prose, no code fence.',
    "Use viewBox='0 0 560 320'. Fill a background <rect> #fbf7ec.",
    'Black ink line art (#1f2937): simple human figures, objects, buildings, maps, arrows. Build ONE central visual metaphor for the passage.',
    'LAYOUT — this is a printed panel, so composition matters:',
    '  * One central image, with up to four supporting images in a rough grid (left/right/top/bottom).',
    '  * Keep a 14px margin from every edge; no shape or label may touch the border.',
    '  * Put each label in its own empty region. NEVER place two <text> labels closer than 20px horizontally and 16px vertically.',
    '  * Labels sit above or beside their shape, never on top of another label; the bottom strip is only for the section title.',
    '  * Font-size 12-16. At most 6 labels, each <= 5 words (<= 24 characters). At most 18 shapes. Strokes 2.5-4.',
    'Add the labels using the passage\'s own key terms. Put a thin caption strip at the bottom with the section title.',
    'Keep every element inside 0..560 x 0..320. No external images, no <script>, no <style>, no gradients, no photographs.',
    'Be legible at 300px wide. If a label cannot fit without overlap, drop it — a clean panel with four labels beats a crowded one.',
    '',
    'LESSON: ' + lessonTitle,
    'PASSAGE SECTION: ' + title,
    'PASSAGE TEXT:',
    passage
  ].join('\n');
}

function extractSvg(text) {
  const s = String(text || '');
  const m = s.match(/<svg[\s\S]*?<\/svg>/i);
  return m ? m[0] : null;
}

function sanitise(svg) {
  let s = String(svg);
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '');
  s = s.replace(/\son\w+\s*=\s*"[^"]*"/gi, '');
  s = s.replace(/\son\w+\s*=\s*'[^']*'/gi, '');
  s = s.replace(/xlink:href\s*=\s*"[^"]*"/gi, '');
  s = s.replace(/href\s*=\s*"https?:[^"]*"/gi, '');
  // Some models omit viewBox; give it one from width/height, else the panel size.
  if (!/viewBox/i.test(s)) {
    const w = (s.match(/<svg[^>]*\bwidth\s*=\s*["']?(\d+)/i) || [])[1];
    const h = (s.match(/<svg[^>]*\bheight\s*=\s*["']?(\d+)/i) || [])[1];
    s = s.replace(/<svg/i, '<svg viewBox="0 0 ' + (w && h ? w + ' ' + h : '560 320') + '"');
  }
  return s;
}

function validSvg(svg) {
  if (!svg) return 'no svg';
  if (!/<svg[^>]*viewBox=/i.test(svg)) return 'no viewBox';
  var labelCount = (svg.match(/<text|<tspan/gi) || []).length;
  if (labelCount < 3) return 'too few labels';
  if (labelCount > 9) return 'too many labels';
  if (/<script/i.test(svg)) return 'script';
  if (/(?:xlink:)?href\s*=\s*["']https?:/i.test(svg)) return 'external ref';
  if (/<image\b/i.test(svg)) return 'external image';
  if (svg.length > 45000) return 'too large';
  if (!/<rect/i.test(svg)) return 'no background';
  // A label outside the canvas is clipped, which is what the repair pass had
  // to fix 700 times. Refuse it at generation instead.
  var vbm = /viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/i.exec(svg);
  var W = vbm ? +vbm[1] : 560, H = vbm ? +vbm[2] : 320;
  var oob = false;
  var tre = /<text\b[^>]*\bx="(-?[\d.]+)"[^>]*\by="(-?[\d.]+)"/g, tm;
  while ((tm = tre.exec(svg))) {
    if (+tm[1] < 6 || +tm[1] > W - 6 || +tm[2] < 12 || +tm[2] > H - 4) { oob = true; break; }
  }
  if (oob) return 'label outside canvas';
  // Reject labels that sit on top of each other (the Bhakti cartoon failure).
  var pts = [];
  var tre2 = /<text\b[^>]*\bx="(-?[\d.]+)"[^>]*\by="(-?[\d.]+)"/g, t2;
  while ((t2 = tre2.exec(svg))) pts.push([+t2[1], +t2[2]]);
  for (var a = 0; a < pts.length; a++) {
    for (var b = a + 1; b < pts.length; b++) {
      if (Math.abs(pts[a][0] - pts[b][0]) < 20 && Math.abs(pts[a][1] - pts[b][1]) < 16) return 'overlapping labels';
    }
  }
  return '';
}

function figureBlock(id, title, svg) {
  const cap = String(title).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return [
    '<!-- passage-cartoon:' + id + ' -->',
    '<figure class="passage-cartoon" data-cartoon="' + id + '">',
    '  <div class="pc-frame">' + svg + '</div>',
    '  <figcaption>' + cap + '</figcaption>',
    '</figure>'
  ].join('\n');
}

async function makeOne(hosted, lessonTitle, p, model) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    let text;
    try {
      text = await hosted.chat(
        'You are an editorial cartoonist. You output a single valid SVG element and nothing else.',
        prompt(p.title, p.text, lessonTitle) + (attempt > 1 ? '\n\nYour last output was rejected. Return ONLY a valid <svg viewBox="0 0 560 320"> with at least 4 <text> labels.' : ''),
        { numPredict: 7000, temperature: 0.6, model }
      );
    } catch (e) {
      console.error('  model failed: ' + e.message);
      continue;
    }
    const svg = sanitise(extractSvg(text));
    const bad = validSvg(svg);
    if (bad) { console.error('  rejected (' + bad + ')'); continue; }
    return svg;
  }
  return null;
}

async function main() {
  // --remaining: print how many lessons still have an un-cartooned passage.
  // Used by the workflow to chain another run, and to stop when done.
  if (has('remaining')) {
    let n = 0;
    for (const f of lessons()) {
      let html;
      try { html = fs.readFileSync(f, 'utf8'); } catch (e) { continue; }
      const existing = new Set([...html.matchAll(/passage-cartoon:([a-z0-9]+)/g)].map((m) => m[1]));
      if (passages(html).some((p) => !existing.has(hash(p.title + '|' + strip(p.text).slice(0, 400))))) n++;
    }
    console.log(n);
    return;
  }
  let hosted = null;
  if (!DRY) {
    hosted = require('./lib/hosted');
    if (!hosted.enabled()) { console.error('no model route configured'); process.exitCode = 1; return; }
  }
  const files0 = lessons();
  let files = files0;
  if (ALL && !ONLY_FILE) {
    // Only lessons that still have a passage without a cartoon, so a limit run
    // advances instead of re-scanning finished lessons forever.
    files = files0.filter(function (f) {
      let html;
      try { html = fs.readFileSync(f, 'utf8'); } catch (e) { return false; }
      const existing = new Set([...html.matchAll(/passage-cartoon:([a-z0-9]+)/g)].map((m) => m[1]));
      return passages(html).some((p) => !existing.has(hash(p.title + '|' + strip(p.text).slice(0, 400))));
    });
  }
  files = files.slice(0, LIMIT_LESSONS || undefined);
  const store = readStore();
  const started = Date.now();
  let done = 0, skipped = 0, failed = 0, lessonsTouched = 0;

  for (const file of files) {
    if ((Date.now() - started) / 60000 > DEADLINE_MIN) { console.log('deadline reached'); break; }
    let html;
    try { html = fs.readFileSync(file, 'utf8'); } catch (e) { continue; }
    const lessonTitle = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [, path.basename(file)])[1].replace(/<[^>]+>/g, '').trim();
    const ps = passages(html);
    if (DRY) {
      console.log(path.relative(ROOT, file).replace(/\\/g, '/') + ' :: ' + ps.length + ' passage(s)');
      for (const p of ps.slice(0, 12)) console.log('   [' + String(words(p.text)).padStart(4) + 'w] ' + p.title.slice(0, 70));
      continue;
    }
    const existing = new Set([...html.matchAll(/passage-cartoon:([a-z0-9]+)/g)].map((m) => m[1]));
    let made = 0;
    // Insert from the end so earlier offsets stay valid.
    const targets = ps.map((p) => ({ p, id: hash(p.title + '|' + strip(p.text).slice(0, 400)) }))
      .filter((t) => !existing.has(t.id)).slice(0, MAX_PER_LESSON);
    const results = await pool(targets, WORKERS, (t) => makeOne(hosted, lessonTitle, t.p, process.env.PASSAGE_CARTOON_MODEL || ''));
    results.forEach((svg, idx) => {
      const t = targets[idx];
      if (!svg) { failed++; return; }
      t.svg = svg;
      done++; made++;
      store.cartoons[t.id] = { file: path.relative(ROOT, file).replace(/\\/g, '/'), heading: t.p.title, words: words(t.p.text), at: new Date().toISOString() };
    });
    if (made) saveStore(store);
    // Re-apply from the end of the body backwards.
    let out = html;
    const applied = targets.filter((t) => t.svg).sort((a, b) => b.p.absAt - a.p.absAt);
    for (const t of applied) {
      const at = t.p.absAt;
      out = out.slice(0, at) + '\n' + figureBlock(t.id, t.p.title, t.svg) + '\n' + out.slice(at);
    }
    if (applied.length && out !== html) { fs.writeFileSync(file, out, 'utf8'); lessonsTouched++; }
    console.log(path.relative(ROOT, file).replace(/\\/g, '/') + ' :: +' + applied.length + ' cartoon(s), ' + (ps.length - targets.length) + ' already/skipped');
  }
  if (!DRY) console.log('\ncartoons written: ' + done + ' | failed: ' + failed + ' | lessons touched: ' + lessonsTouched);
}

main().catch((e) => { console.error(e && e.stack || e); process.exitCode = 1; });