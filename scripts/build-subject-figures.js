// Auto-generate per-subject figure packs for ALL UPSC subjects (non-Geography).
//
// For every subject found in data/questions/*.json (each file is
//   { "<Subject>": { "subSubjects": { "<topic>": [ ...questions ] } } }),
// the top sub-topics are auto-matched to a Wikimedia Commons figure using the
// same quality gates as scripts/build-geography-figures.js:
//   - relevance (the figure title must carry the topic's own words),
//   - map/diagram/scene keyword scoring with svg > png > jpg,
//   - rejection of photos/subject pages,
//   - Special:FilePath redirect verification before a pick is adopted,
//   - stable per-topic cache (data/subject-figures-cache.json) so picks stay
//     constant across builds and can be hand-overridden by editing that file.
// Every auto figure is badged "auto-suggested · verify" in the pack.
//
// Outputs (repo root):
//   <slug>-figures.html          one printable page per subject with figures
//   subject-figures-index.html   index linking every subject pack
//
// Usage: node scripts/build-subject-figures.js

var fs = require('fs');
var path = require('path');

var QUESTIONS_DIR = path.join(__dirname, '..', 'data', 'questions');
var CACHE_FILE = path.join(__dirname, '..', 'data', 'subject-figures-cache.json');
var ROOT = path.join(__dirname, '..');
var TOPICS_PER_SUBJECT = process.env.TOPICS_PER_SUBJECT ? parseInt(process.env.TOPICS_PER_SUBJECT, 10) : 6;
var GLOBAL_LIMIT = process.env.GLOBAL_LIMIT ? parseInt(process.env.GLOBAL_LIMIT, 10) : 150;
var GEO_SKIP = /geograph/i;

function norm(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function C(name, w) { return 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(name) + '?width=' + (w || 1000); }

// ---- shared auto engine (same gates as the geography pack) ----
var AUTO_UA = 'dimsred-subject-figures/1.0 (https://github.com/renj-arch/dimsred; educational build)';
var AUTO_REJECT = /monument|museum|statue|memorial|selfie|portrait|headshot|palace|fort|flag|logo|emblem|coat of arms|coin|stamp|poster|postcard|painting|church|mosque|temple|bridg|rail|train|hotel|aircraft|shipping|\.pdf|\.djvu|\.ogg|\.ogv|\.webm|\.mid|_thumb/;
var AUTO_EXCLUDE_IMG = {};
function tokens(s) {
  return norm(String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')).split(' ').filter(Boolean);
}
function autoScore(titleRaw, topic) {
  var raw = String(titleRaw).toLowerCase();
  var t = norm(raw);
  var ext = /\.svg$/i.test(raw) ? 3 : (/\.png$/i.test(raw) ? 2 : (/\.jpe?g$/i.test(raw) ? 1.2 : (/\.gif$/i.test(raw) ? 0.8 : -10)));
  var hint = /map|locator|topograph|outline|projection|chart|diagram|structure|scheme|anatomy|schemat/.test(t) ? 2 :
    (/relief|physical|political|location|orthograph|globe|continent|terrain|satellite|circuit|graph|flow|schematic/.test(t) ? 1 : 0);
  var bigNum = /[0-9]{4,}/.test(t) ? -1 : 0;
  var rel = 0;
  var tt = tokens(topic || '');
  if (tt.length) rel = tt.some(function (w) { return w.length > 2 && t.indexOf(w) !== -1; }) ? 2 : -3;
  return hint + ext + rel + (AUTO_REJECT.test(t) ? -4 : 0) + bigNum;
}
async function fetchT(url, opts, ms) {
  var ctl = new AbortController();
  var to = setTimeout(function () { ctl.abort(); }, ms || 12000);
  try { return await fetch(url, Object.assign({ signal: ctl.signal }, opts || {})); }
  finally { clearTimeout(to); }
}
async function commonsSearch(q) {
  var url = 'https://commons.wikimedia.org/w/api.php?action=query&list=search&srnamespace=6&srlimit=20&format=json&srsearch=' + encodeURIComponent(q);
  var r;
  try { r = await fetchT(url, { headers: { 'User-Agent': AUTO_UA } }); } catch (e) { return []; }
  if (!r.ok) return [];
  var j = await r.json();
  return (j.query && j.query.search) ? j.query.search.map(function (s) { return s.title; }) : [];
}
async function fileOK(fname) {
  if (AUTO_EXCLUDE_IMG[fname]) return false;
  try {
    var r = await fetchT('https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(fname) + '?width=200', { redirect: 'manual' });
    return r.status === 302;
  } catch (e) { return false; }
}
async function resolveAuto(name) {
  var queries = [name, name + ' diagram', name + ' chart', name + ' map', name + ' filetype:drawing'];
  for (var qi = 0; qi < queries.length; qi++) {
    var hits = await commonsSearch(queries[qi]);
    var best = null;
    var bestAny = null;
    hits.forEach(function (h) {
      var sc = autoScore(h, name);
      if (sc < 3) return;
      var fname = String(h).replace(/^File:/, '');
      if (sc >= 4 && (!best || best.s < sc)) best = { f: fname, s: sc, q: queries[qi] };
      if (!bestAny || bestAny.s < sc) bestAny = { f: fname, s: sc, q: queries[qi] };
    });
    var cand = best || bestAny;
    if (cand && (await fileOK(cand.f))) return cand;
    await new Promise(function (res) { setTimeout(res, 250); });
  }
  return null;
}

// ---- scan question files -> subjects with topics ----
function goodTopic(t) {
  if (!t || String(t).length < 3) return false;
  if (String(t).replace(/[^a-z]/gi, '').length < 2) return false;
  if (/^\d/.test(String(t))) return false;
  return true;
}
function scanSubjects() {
  var subjects = {};
  var files = fs.readdirSync(QUESTIONS_DIR).filter(function (f) { return /\.json$/i.test(f); });
  files.forEach(function (file) {
    var d;
    try { d = JSON.parse(fs.readFileSync(path.join(QUESTIONS_DIR, file), 'utf8')); } catch (e) { return; }
    var sn = d && typeof d === 'object' ? Object.keys(d)[0] : null;
    if (!sn) return;
    var subj = subjects[sn] || (subjects[sn] = { total: 0, topics: {} });
    var ss = d[sn] && d[sn].subSubjects;
    if (!ss || typeof ss !== 'object') return;
    Object.keys(ss).forEach(function (tname) {
      var n = (ss[tname] && ss[tname].length) || 0;
      subj.total += n;
      if (goodTopic(tname)) subj.topics[tname] = (subj.topics[tname] || 0) + n;
    });
  });
  return subjects;
}

// ---- html rendering (style mirrors the geography pack) ----
var CSS = 'body{font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;margin:0;background:#e5e7eb;color:#111827}' +
  'section.page{background:#fff;max-width:980px;margin:16px auto;padding:26px 28px;box-shadow:0 1px 4px rgba(0,0,0,.18);page-break-after:always}' +
  'section.page:last-child{page-break-after:auto}' +
  'header h1{font-size:18px;margin:0 0 2px}' +
  '.num{font-size:10px;letter-spacing:.14em;color:#0e7490;font-weight:700;text-transform:uppercase}' +
  '.fig-title{font-size:15px;font-weight:700;margin:2px 0 6px}' +
  '.fig-src{font-size:9.5px;color:#6b7280;margin:6px 0 0}' +
  '.fig-img{display:flex;justify-content:center;align-items:center;background:#fafafa;border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin:8px 0}' +
  '.fig-img img{max-width:100%;height:auto}' +
  '.auto-badge{background:#fffbeb;border:1px solid #fca5a5;border-radius:6px;color:#b91c1c;font-size:9px;letter-spacing:.08em;padding:3px 8px;display:inline-block;margin-bottom:6px;font-weight:700}' +
  '.marks{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 14px;margin-top:10px;font-size:11px;line-height:1.7}' +
  '.marks b{color:#166534}.marks ul{margin:4px 0 0;padding-left:16px}.marks li{margin:1px 0}' +
  '.missing{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;font-size:9.5px;color:#92400e;line-height:1.6;margin-bottom:8px}' +
  'ul.idx{list-style:none;padding:0;margin:0}ul.idx li{background:#fff;max-width:980px;margin:10px auto;padding:14px 20px;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.12)}ul.idx a{color:#0e7490;font-weight:700;text-decoration:none;font-size:14px}' +
  '@page{size:A4;margin:10mm}' +
  '@media print{body{background:#fff}section.page{box-shadow:none;margin:0;padding:0}.fig-img{break-inside:avoid}}';

function marksHtml(marks) {
  if (!marks || !marks.length) return '';
  return '<div class="marks"><b>Mark in exam:</b><ul>' + marks.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul></div>';
}
function pageFor(f) {
  return '<section class="page">' +
    '<div class="num">' + esc(f.sec) + '</div>' +
    '<div class="fig-title">' + esc(f.title) + '</div>' +
    '<div class="auto-badge">AUTO-SUGGESTED \u00b7 verify image &amp; labels before exam use</div>' +
    '<div class="fig-img"><img src="' + f.url + '" alt="' + esc(f.title) + '"></div>' +
    marksHtml(f.marks) +
    '<div class="fig-src">' + esc(f.src) + '</div>' +
    '</section>';
}
function subjectPage(subj) {
  var pages = subj.figs.map(function (x) {
    return {
      url: C(x.file),
      sec: 'GS Figures \u00b7 ' + subj.name,
      title: x.name + ' \u2014 Suggested Figure',
      marks: ['sketch / label the key parts of this feature', 'note its location, dates or structure as relevant to the subject', 'verify the image really is the feature (auto-suggested)'],
      src: 'Source: auto-suggested from Wikimedia Commons \u00b7 CC BY-SA \u2014 verify before exam',
    };
  });
  var missing = '';
  if (subj.unmatched.length) {
    missing = '<div class="missing"><b>' + esc(subj.name) + ' \u2014 topics still needing a figure</b> (no usable Commons image found):<br>' +
      esc(subj.unmatched.slice(0, 20).join(' \u00b7 ')) + (subj.unmatched.length > 20 ? ' \u00b7 +' + (subj.unmatched.length - 20) + ' more' : '') + '</div>';
  }
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>' + esc(subj.name) + ' Figures (UPSC)</title>' +
    '<style>' + CSS + '</style></head><body>' +
    '<section class="page"><header><span class="num">GS Figures \u00b7 ' + esc(subj.name) + ' \u00b7 UPSC</span>' +
    '<h1>' + esc(subj.name) + ' \u2014 Suggested Figures</h1>' +
    '<p class="meta">' + subj.figs.length + ' figures \u00b7 auto-suggested from Wikimedia Commons (needs internet) \u00b7 print-ready A4 \u00b7 built by scripts/build-subject-figures.js</p></header>' + missing + '</section>' +
    pages.map(pageFor).join('') +
    '</body></html>';
}
function indexPage(all) {
  var items = all.map(function (s) {
    return '<li><a href="' + esc(s.slug) + '-figures.html">' + esc(s.name) + '</a> \u2014 ' + s.figs.length + ' figures</li>';
  }).join('');
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>UPSC Subject Figures \u2014 Index</title>' +
    '<style>' + CSS + '</style></head><body>' +
    '<section class="page"><header><span class="num">GS \u00b7 All Subjects \u00b7 UPSC</span>' +
    '<h1>UPSC Subject Figures \u2014 Index</h1>' +
    '<p class="meta">Per-subject printable figure packs, auto-suggested from Wikimedia Commons. Every image is badged for verification.</p></header></section>' +
    '<ul class="idx"><li><a href="geography-figures.html">Geography</a> \u2014 curated figure pack</li>' + items + '</ul>' +
    '</body></html>';
}

// ---- main ----
async function main() {
  var cache = {};
  if (fs.existsSync(CACHE_FILE)) {
    try { cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch (e) { cache = {}; }
  }
  var subjects = scanSubjects();
  var names = Object.keys(subjects)
    .filter(function (s) { return !GEO_SKIP.test(s); })
    .sort(function (a, b) { return subjects[b].total - subjects[a].total; });
  if (process.env.SUBJECT_DEMO) {
    var demo = process.env.SUBJECT_DEMO.split(',').map(function (s) { return s.trim().toLowerCase(); });
    names = names.filter(function (s) { return demo.indexOf(s.toLowerCase()) !== -1; });
  }

  var made = [];
  var budget = GLOBAL_LIMIT;
  var deadline = Date.now() + (parseInt(process.env.FIGURES_MAX_MS || '900000', 10)); // hard wall-clock budget
  var usedSlugs = {};
  for (var si = 0; si < names.length && budget > 0; si++) {
    if (Date.now() > deadline) break;
    var sname = names[si];
    var topics = subjects[sname].topics;
    var order = Object.keys(topics).sort(function (a, b) { return topics[b] - topics[a]; });
    order.sort(function (a, b) {
      if (cache[norm(a)] && !cache[norm(b)]) return -1;
      if (!cache[norm(a)] && cache[norm(b)]) return 1;
      return 0;
    });
    var figs = [];
    var unmatched = [];
    for (var ti = 0; ti < order.length && figs.length < TOPICS_PER_SUBJECT && budget > 0; ti++) {
      if (Date.now() > deadline) { budget = 0; break; }
      var tname = order[ti];
      var key = norm(tname);
      var fname = null;
      if (cache[key] && (await fileOK(cache[key]))) {
        fname = cache[key];
      } else {
        var hit = null;
        try { hit = await resolveAuto(tname); } catch (e) { hit = null; }
        if (hit) { fname = hit.f; cache[key] = fname; }
        else unmatched.push(tname);
        budget--;
        await new Promise(function (res) { setTimeout(res, 180); });
      }
      if (fname && figs.length < TOPICS_PER_SUBJECT) {
        AUTO_EXCLUDE_IMG[fname] = 1;
        figs.push({ name: tname, file: fname });
      }
    }
    if (figs.length) {
      var s = slug(sname);
      if (usedSlugs[s]) s = s + '-' + (++usedSlugs[s]);
      else usedSlugs[s] = 1;
      made.push({ slug: s, name: sname, figs: figs, unmatched: unmatched });
    }
  }

  made.forEach(function (subj) {
    fs.writeFileSync(path.join(ROOT, subj.slug + '-figures.html'), subjectPage(subj));
  });
  if (made.length) fs.writeFileSync(path.join(ROOT, 'subject-figures-index.html'), indexPage(made));

  var had = fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) : {};
  if (Object.keys(cache).length) fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));

  console.log('Wrote ' + made.length + ' subject packs (' + made.reduce(function (a, s) { return a + s.figs.length; }, 0) + ' figures) + subject-figures-index.html');
  made.slice(0, 30).forEach(function (s) {
    console.log('  ' + s.name + ': ' + s.figs.length + ' figs' + (s.unmatched.length ? ' (' + s.unmatched.length + ' unmatched)' : ''));
  });
  var done = 0, opened = 0;
  made.forEach(function (s) { opened += s.figs.length; });
  if (Object.keys(had).length !== Object.keys(cache).length) done = Object.keys(cache).length - Object.keys(had).length;
  console.log('Cache entries now: ' + Object.keys(cache).length + ' (new this run: ' + (Object.keys(cache).length - Object.keys(had).length) + ')');
}

main().catch(function (e) { console.error(e); process.exit(1); });