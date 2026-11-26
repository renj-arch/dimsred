#!/usr/bin/env node
'use strict';
/**
 * passage-images.js — an NCERT-style related photo beside a passage.
 *
 * Textbook lessons carry pictures: a monument, a map, an artifact. This lane
 * finds the real-world entities named in a passage, fetches their Wikipedia
 * lead image from Wikimedia Commons, and embeds it beside the passage with the
 * author and licence (Commons images are CC/PD; attribution is mandatory).
 *
 *   - Candidates: the section title, then sequences of capitalised words
 *     ("Fatehpur Sikri", "Ram Bagh", "Adil Shahi").
 *   - One batched Wikipedia query per lesson resolves candidates to lead images.
 *   - One batched Commons query fetches thumb URL + licence + author.
 *   - Inserted after the section heading; idempotent by passage hash.
 *
 *   node scripts/passage-images.js --file <lesson> --dry
 *   node scripts/passage-images.js --all --limit 10
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const STORE = path.join(ROOT, 'data', 'passage-images.json');
const UA = 'vlymbooq-study/1.0 (educational; contact: bot@vlymbooq.qzz.io)';

function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  if (i === -1) return dflt;
  const v = process.argv[i + 1];
  return v == null || v.indexOf('--') === 0 ? true : v;
}
function has(n) { return process.argv.indexOf('--' + n) !== -1; }
const DRY = has('dry');
const MAX_PER_LESSON = Math.max(1, parseInt(arg('max', '8'), 10) || 8);
const LIMIT = parseInt(arg('limit', '0'), 10) || 0;
const ONLY = arg('file', '');
const MIN_WORDS = Math.max(60, parseInt(arg('min-words', '160'), 10) || 160);

const hash = (s) => crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 12);
const words = (s) => String(s).replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').split(/\s+/).filter((x) => x.length > 1).length;
const strip = (s) => String(s).replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': UA } }, (r) => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) { r.resume(); resolve(get(r.headers.location)); return; }
      let d = '';
      r.on('data', (c) => d += c);
      r.on('end', () => resolve({ status: r.statusCode, body: d }));
    }).on('error', reject);
  });
}
async function getJson(url) { const r = await get(url); try { return JSON.parse(r.body); } catch (e) { return null; } }

function lessons() {
  if (ONLY) return String(ONLY).split(',').map((s) => s.trim()).filter(Boolean).map((s) => path.resolve(ROOT, s));
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

// Passage = major section (h2). Blank existing photo/cartoon blocks (same
// length) so words/hashes stay stable across runs.
function passages(html) {
  const bs = html.indexOf('<div class="lesson-body"');
  if (bs < 0) return [];
  const be = html.indexOf('id="practice-qs"');
  const body = html.slice(bs, be > 0 ? be : undefined);
  const heads = [...body.matchAll(/<h([23])[^>]*>([\s\S]*?)<\/h\1>/g)];
  const h2 = heads.filter((h) => h[1] === '2');
  const list = h2.length ? h2 : heads;
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const h = list[i];
    const start = h.index + h[0].length;
    const end = i + 1 < list.length ? list[i + 1].index : body.length;
    const raw = body.slice(start, end);
    const seg = raw.replace(/<!--\s*passage-(?:image|cartoon):[\s\S]*?<\/figure>/g, (m) => ' '.repeat(m.length));
    const title = strip(h[2]);
    if (/practice questions|learning objectives/i.test(title)) continue;
    if (words(seg) < MIN_WORDS) continue;
    for (const c of chunkSeg(seg, bs + start, title)) out.push(c);
  }
  return out;
}

const STOP = /^(The|This|These|Those|In|During|After|Before|From|With|Under|When|While|However|But|And|Its|His|Her|Their|It|He|She|They|A|An|For|By|On|At|As|To|India|Indian|Chapter|Section|European|Asian|Western|Northern|Southern|Eastern|Modern|Ancient|Early|Late|Major|Minor|New|Old)$/;
const GENERIC = /\b(engineering|design|architecture|tradition|development|system|heritage|literature|history|theory|practice|evolution|culture|festival|religion|text|period|dynasty|empire|movement|school|style|form|types?|features?|aspects?|elements?|role|impact|significance|conservation|institution|institutionalisation|transmission|techniques?|methods?)\b/i;
function candidates(title, text) {
  const seen = new Set();
  const items = [];
  const add = (t, order) => {
    t = String(t || '').replace(/\s+/g, ' ').replace(/^[^A-Za-z]+|[^A-Za-z)]+$/g, '').trim();
    if (t.length < 4 || t.length > 60) return;
    if (STOP.test(t) || GENERIC.test(t)) return;
    const k = t.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    items.push({ t, order, wc: t.split(' ').length });
  };
  add(title.split(':')[0].replace(/\(.*?\)/g, '').trim(), -1);
  // Capitalised runs of 1-4 words. Prefer multi-word proper names.
  const re = /\b([A-Z][a-zA-Z'’-]{2,}(?:\s+[A-Z][a-zA-Z'’-]{2,}){0,3})\b/g;
  let m, n = 0;
  while ((m = re.exec(text)) && n < 60) {
    if (m.index < 0) break;
    add(m[1], n++);
  }
  items.sort((a, b) => (b.wc - a.wc) || (a.order - b.order));
  return items.slice(0, 12).map((x) => x.t);
}

async function resolveImages(titles) {
  // Batched Wikipedia pageimages. Accept only pages that are PLACES/MONUMENTS
  // (they carry coordinates) and match a candidate title exactly or as a
  // prefix — no wild redirects (that is how a Mughal-monuments section once
  // got a baseball player's photo).
  const entries = [];
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const u = 'https://en.wikipedia.org/w/api.php?action=query&titles=' + encodeURIComponent(batch.join('|')) +
      '&prop=pageimages|coordinates&pithumbsize=640&redirects=1&format=json';
    const j = await getJson(u);
    if (!j || !j.query) continue;
    for (const p of Object.values(j.query.pages || {})) {
      if (!p || p.missing || !p.thumbnail || !p.pageimage) continue;
      if (!p.coordinates || !p.coordinates.length) continue; // place/monument only
      const thumb = String(p.thumbnail.source || '').split('?')[0];
      if (!thumb) continue;
      entries.push({ page: p.title, thumb, file: p.pageimage });
    }
  }
  return entries;
}
function matchEntry(entries, cand) {
  const lc = String(cand).toLowerCase();
  for (const e of entries) {
    const t = e.page.toLowerCase();
    if (t === lc || t.indexOf(lc + ' ') === 0) return e;
  }
  return null;
}

async function fileMeta(files) {
  const map = {};
  for (let i = 0; i < files.length; i += 50) {
    const batch = files.slice(i, i + 50);
    const u = 'https://commons.wikimedia.org/w/api.php?action=query&titles=' + encodeURIComponent(batch.map((f) => 'File:' + f).join('|')) +
      '&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=640&format=json';
    const j = await getJson(u);
    if (!j || !j.query) continue;
    for (const p of Object.values(j.query.pages || {})) {
      const ii = (p.imageinfo || [])[0];
      if (!ii) continue;
      const em = ii.extmetadata || {};
      const g = (k) => (em[k] && String(em[k].value || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()) || '';
      const name = p.title.replace(/^File:/, '');
      const rec = {
        thumb: String(ii.thumburl || '').split('?')[0],
        license: g('LicenseShortName') || '',
        artist: g('Artist').slice(0, 80),
        desc: ii.descriptionurl || ('https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(name))
      };
      map[name] = rec;
      map[name.replace(/ /g, '_')] = rec;
    }
  }
  return map;
}

function figureBlock(id, label, info) {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const credit = [info.artist ? esc(info.artist) : '', esc(info.license)].filter(Boolean).join(' · ');
  return [
    '<!-- passage-image:' + id + ' -->',
    '<figure class="passage-photo" data-image="' + id + '">',
    '  <a href="' + esc(info.desc) + '" target="_blank" rel="noopener">',
    '    <img src="' + esc(info.thumb) + '" alt="' + esc(label) + '" loading="lazy" referrerpolicy="no-referrer">',
    '  </a>',
    '  <figcaption>' + esc(label) + (credit ? ' — ' + credit : '') + ' · <a href="' + esc(info.desc) + '" target="_blank" rel="noopener">Wikimedia Commons</a></figcaption>',
    '</figure>'
  ].join('\n');
}

function loadStore() {
  try {
    const j = JSON.parse(fs.readFileSync(STORE, 'utf8'));
    if (!j.images) j.images = {};
    if (!j.attempted) j.attempted = {};
    return j;
  } catch (e) { return { images: {}, attempted: {} }; }
}

async function main() {
  if (has('remaining')) {
    const st = loadStore();
    let n = 0;
    for (const f of lessons()) {
      let html; try { html = fs.readFileSync(f, 'utf8'); } catch (e) { continue; }
      const existing = new Set([...html.matchAll(/passage-image:([a-z0-9]+)/g)].map((m) => m[1]));
      if (passages(html).some((p) => {
        const id = hash(p.title + '|' + strip(p.text).slice(0, 300));
        return !existing.has(id) && !st.attempted[id] && candidates(p.title, p.text).length;
      })) n++;
    }
    console.log(n); return;
  }

  const store = loadStore();
  let files = lessons();
  if (has('all') && !ONLY) {
    files = files.filter((f) => {
      let html; try { html = fs.readFileSync(f, 'utf8'); } catch (e) { return false; }
      const existing = new Set([...html.matchAll(/passage-image:([a-z0-9]+)/g)].map((m) => m[1]));
      return passages(html).some((p) => {
        const id = hash(p.title + '|' + strip(p.text).slice(0, 300));
        return !existing.has(id) && !store.attempted[id] && candidates(p.title, p.text).length;
      });
    });
  }
  files = files.slice(0, LIMIT || undefined);

  let done = 0, lessonsTouched = 0;

  for (const file of files) {
    let html;
    try { html = fs.readFileSync(file, 'utf8'); } catch (e) { continue; }
    const ps = passages(html);
    const existing = new Set([...html.matchAll(/passage-image:([a-z0-9]+)/g)].map((m) => m[1]));
    const all = ps.map((p) => ({ p, id: hash(p.title + '|' + strip(p.text).slice(0, 300)), cands: candidates(p.title, p.text) }));
    const fresh = all.filter((t) => !existing.has(t.id) && !store.attempted[t.id]);
    // Passages with no proper-noun candidate can never have a photo: mark them
    // attempted so the chain can finish instead of re-trying them forever.
    if (!DRY) fresh.filter((t) => !t.cands.length).forEach((t) => { store.attempted[t.id] = 1; });
    const todo = fresh.filter((t) => t.cands.length).slice(0, MAX_PER_LESSON);
    if (!DRY) todo.forEach((t) => { store.attempted[t.id] = 1; });
    if (!todo.length) continue;

    if (DRY) {
      console.log(path.relative(ROOT, file).replace(/\\/g, '/'));
      for (const t of todo) console.log('   [' + t.cands.length + '] ' + t.p.title.slice(0, 50) + '  -> ' + t.cands.slice(0, 4).join(' | '));
      continue;
    }

    const allCands = [...new Set([].concat(...todo.map((t) => t.cands)))];
    const resolved = await resolveImages(allCands);
    const picks = [];
    for (const t of todo) {
      let hit = null;
      for (const c of t.cands) { const r = matchEntry(resolved, c); if (r) { hit = r; break; } }
      if (hit) picks.push({ t, hit });
    }
    if (!picks.length) continue;
    const meta = await fileMeta([...new Set(picks.map((x) => x.hit.file))]);

    const applied = [];
    for (const { t, hit } of picks) {
      const m = meta[hit.file] || {};
      const info = { thumb: m.thumb || hit.thumb, license: m.license || '', artist: m.artist || '', desc: m.desc || ('https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(hit.file)) };
      if (!info.thumb) continue;
      applied.push({ id: t.id, label: hit.page || t.p.title, info, absAt: t.p.absAt, heading: t.p.title });
      store.images[t.id] = { file: path.relative(ROOT, file).replace(/\\/g, '/'), heading: t.p.title, page: hit.page, file: hit.file, thumb: info.thumb, at: new Date().toISOString() };
      done++;
    }
    let out = html;
    applied.sort((a, b) => b.absAt - a.absAt);
    for (const a of applied) out = out.slice(0, a.absAt) + '\n' + figureBlock(a.id, a.label, a.info) + '\n' + out.slice(a.absAt);
    if (applied.length && out !== html) { fs.writeFileSync(file, out, 'utf8'); lessonsTouched++; }
    console.log(path.relative(ROOT, file).replace(/\\/g, '/') + ' :: +' + applied.length + ' image(s)');
  }
  if (!DRY) {
    fs.writeFileSync(STORE, JSON.stringify(store, null, 1) + '\n', 'utf8');
    console.log('\nimages added: ' + done + ' | lessons touched: ' + lessonsTouched);
  }
}
main().catch((e) => { console.error(e && e.stack || e); process.exitCode = 1; });