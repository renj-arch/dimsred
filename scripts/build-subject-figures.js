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
var FAS = require('./lib/figure-auto-score.js');
var RESOLVER = require('./lib/figure-resolve.js');

var QUESTIONS_DIR = path.join(__dirname, '..', 'data', 'questions');
var CACHE_FILE = path.join(__dirname, '..', 'data', 'subject-figures-cache.json');
var AUTO_FILE = path.join(__dirname, '..', 'data', 'figure-files-auto.json');
// Picks below this confidence are treated as no answer. The resolver skips
// rather than guesses, so a low number here means fewer figures, never worse.
var AUTO_MIN_CONF = parseFloat(process.env.FIGURE_MIN_CONF || '0.75');
var ROOT = path.join(__dirname, '..');
var TOPICS_PER_SUBJECT = process.env.TOPICS_PER_SUBJECT ? parseInt(process.env.TOPICS_PER_SUBJECT, 10) : 6;
var GLOBAL_LIMIT = process.env.GLOBAL_LIMIT ? parseInt(process.env.GLOBAL_LIMIT, 10) : 150;
var GEO_SKIP = /geograph/i;

// Every figure this script produces is an unverified auto-suggestion. The
// topics it picks are the highest-count subtopics in the question shards, and
// those shards are contaminated: each subject's set is a near-complete A-Z
// English Wikipedia sweep rather than subject-specific material. A raw scan of
// the 22 animal-husbandry-dairy shards returned 3,855 hits for "Democratic
// Party", 848 for "High-speed rail" and 567 for "James K. Polk", which is how
// the Democratic Party ended up as a figure under Animal Husbandry & Dairy.
// So building is now opt-in and the write path is inspectable before it lands.
var ALLOW_UNVERIFIED = /^(1|true|yes)$/i.test(String(process.env.FIGURES_ALLOW_UNVERIFIED || ''));
var DRY_RUN = /^(1|true|yes)$/i.test(String(process.env.FIGURES_DRY_RUN || '')) ||
  process.argv.indexOf('--dry-run') !== -1;

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
function autoScore(titleRaw, topic) {
  // Scoring lives in scripts/lib/figure-auto-score.js, shared with
  // build-geography-figures.js so the two cannot drift apart again.
  return FAS.autoScore(titleRaw, topic, {
    hintRe: /map|locator|topograph|outline|projection|chart|diagram|structure|scheme|anatomy|schemat/,
    hint2Re: /relief|physical|political|location|orthograph|globe|continent|terrain|satellite|circuit|graph|flow|schematic/,
    rejectRe: AUTO_REJECT
  }).score;
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
// A "figure" in this repo means something a candidate can sketch, label or
// trace: a map, a diagram, a schematic, a structure. A photograph of a real
// place is not a figure, however well it matches the topic. The shared scorer's
// bestAny fallback used to admit jpg photos (ext 1.2 + hint 2 + rel 2 = 5.2 > 3),
// which is how "national parks india map" got a photo of Valley of Flowers and
// "biodiversity hotspots india" got a photo of the Western Ghats. A topic only
// accepts a bare photo when the topic itself asks for one (a "photo" topic or a
// topic that IS a specific place/species/building).
// Word boundaries matter here: an earlier version of this regex had none, so
// "Valley of floWERS national park" matched "flow" and the bare photo passed the
// visual check for "national parks india map".
var VISUAL_RE = /\b(map|maps|locator|locator map|topograph|topographic|outline|projection|chart|charts|diagram|diagrams|structure|structures|scheme|schemes|schematic|schematics|anatomy|anatomical|graph|flow|flowchart|network|networks|cycle|cycles|process|processes|layer|layers|architecture|evolution|timeline|taxonomy|classification|composition|division|divisions|distribution|zone|zones|belt|belts|region|regions|system|systems|index|matrix|framework|hierarchy|model|models|profile|profiles|axis|axes|relief|physical|political)\b/;
var PHOTO_OK_RE = /\bphoto(t)?(graph)?\b|\bpicture\b|\bimage of\b|\bview of\b|\bscene\b|\bpanorama\b|\bsunset\b|\bsunrise\b|\bnight\b/i;
function wantsVisual(name) {
  if (PHOTO_OK_RE.test(name)) return false;
  if (/\bphoto\b|\bphotograph\b/i.test(name)) return true;
  // Topics whose own words name a concrete scene/thing are legitimately photos.
  return !/\b(breed|species|flower|bird|mammal|fish|tree|flower|mountain|river|beach|fort|temple|mosque|palace|statue|monument|building|bridge|dam|harbour|port|lake|island|falls|valley|glacier)\b/i.test(name);
}
function isVisualCandidate(fname) {
  var t = norm(fname);
  return VISUAL_RE.test(t) || /\.svg$/i.test(fname);
}
async function resolveAuto(name) {
  var needVisual = wantsVisual(name);
  var queries = [name, name + ' diagram', name + ' chart', name + ' map', name + ' filetype:drawing'];
  for (var qi = 0; qi < queries.length; qi++) {
    var hits = await commonsSearch(queries[qi]);
    var best = null;
    var bestAny = null;
    hits.forEach(function (h) {
      var sc = autoScore(h, name);
      if (sc < 3) return;
      var fname = String(h).replace(/^File:/, '');
      if (process.env.FIG_DEBUG) {
        console.log('    [dbg] q="' + queries[qi] + '" score=' + sc.toFixed(1) +
          ' needVisual=' + needVisual + ' isVisual=' + isVisualCandidate(fname) +
          ' file="' + fname + '"');
      }
      if (needVisual && !isVisualCandidate(fname)) return; // reject bare photos for figure topics
      if (sc >= 4 && (!best || best.s < sc)) best = { f: fname, s: sc, q: queries[qi] };
      if (!bestAny || bestAny.s < sc) bestAny = { f: fname, s: sc, q: queries[qi] };
    });
    var cand = best || (needVisual ? null : bestAny);
    if (cand && (await fileOK(cand.f))) return cand;
    await new Promise(function (res) { setTimeout(res, 250); });
  }
  return null;
}

// ---- curated topic source (data/figure-topics-curated.json) ----
// The question shards cannot be used to pick figure topics: every subject's
// set is a near-complete A-Z English Wikipedia sweep, so the highest-count
// subtopics are generic topics rather than subject material. That is how the
// Democratic Party became an Animal Husbandry figure. Curated topics come from
// the UPSC Paper-1 syllabus instead, in explicit priority order, and are never
// read from the shards.
var CURATED_FILE = path.join(__dirname, '..', 'data', 'figure-topics-curated.json');
var EXACT_FILE = path.join(__dirname, '..', 'data', 'figure-files-curated.json');
var DISPLAY_NAME = {
  'animal-husbandry-dairy': 'Animal Husbandry & Dairy',
  'applied-sciences': 'Applied Sciences',
  'ayurveda-traditional-medicine': 'Ayurveda & Traditional Medicine',
  'computer-it': 'Computer & IT',
  'courts-cases-verdicts': 'Courts, Cases & Verdicts',
  'environment-ecology': 'Environment & Ecology',
  'important-days': 'Important Days',
  'indian-archaeology-epigraphy': 'Indian Archaeology & Epigraphy',
  'indian-architecture': 'Indian Architecture',
  'indian-aviation-shipping': 'Indian Aviation & Shipping',
  'indian-cinema': 'Indian Cinema',
  'indian-demographics-census': 'Indian Demographics & Census',
  'indian-handicrafts-coins': 'Indian Handicrafts & Coins',
  'indian-music-fine-arts': 'Indian Music & Fine Arts',
  'indian-society': 'Indian Society',
  'indian-wildlife-national-parks': 'Indian Wildlife & National Parks',
  'international-relations': 'International Relations',
  'meteorology-climate': 'Meteorology & Climate',
  'sports': 'Sports',
  'telecom-postal': 'Telecom & Postal',
  'women-society': 'Women & Society'
};
function curatedSubjects() {
  var raw = JSON.parse(fs.readFileSync(CURATED_FILE, 'utf8'));
  // Optional hand-picked exact Commons files. When a topic has one, the builder
  // uses it verbatim (the geography-pack method) and never searches. Without an
  // entry the builder falls back to the auto search, which is only reliable for
  // diagram-style topics, so a missing hand-pick is a known coverage gap rather
  // than something to paper over with a wrong auto-pick.
  var exact = {};
  try {
    if (fs.existsSync(EXACT_FILE)) {
      var ex = JSON.parse(fs.readFileSync(EXACT_FILE, 'utf8'));
      Object.keys(ex).forEach(function (s) { if (s.charAt(0) !== '_') exact[s] = ex[s]; });
    }
  } catch (e) { exact = {}; }
  // Precomputed resolver output from the GitHub workflow. Loading it here means
  // a build never needs the network at all when the workflow has run: the picks
  // are already resolved, verified, and committed by scripts/resolve-all-figures.js.
  var auto = {};
  try {
    if (fs.existsSync(AUTO_FILE)) {
      var au = JSON.parse(fs.readFileSync(AUTO_FILE, 'utf8'));
      Object.keys(au).forEach(function (s) { if (s.charAt(0) !== '_') auto[s] = au[s]; });
    }
  } catch (e) { auto = {}; }
  var out = {};
  Object.keys(raw).forEach(function (slug) {
    if (slug.charAt(0) === '_') return;
    var list = [].concat(raw[slug] || []);
    var topics = {};
    // Descending synthetic counts so the curated order survives the builder's
    // count sort and the first-listed topic is the first figure tried.
    list.forEach(function (t, i) {
      t = String(t).trim();
      if (goodTopic(t)) topics[t] = list.length - i;
    });
    out[slug] = { total: list.length, topics: topics, exact: exact[slug] || {},
                  auto: auto[slug] || {}, display: DISPLAY_NAME[slug] || slug };
  });
  return out;
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
  var resolved = f.source === 'auto' || f.source === 'live';
  var badge = f.hand
    ? '<div class="auto-badge" style="background:#f0fdf4;border-color:#86efac;color:#166534">HAND-PICKED \u00b7 file chosen &amp; checked for this topic \u00b7 still verify labels</div>'
    : resolved
      ? '<div class="auto-badge" style="background:#eff6ff;border-color:#93c5fd;color:#1d4ed8">AUTO-RESOLVED \u00b7 matched from the topic\u2019s own Wikipedia article / Wikimedia structured data \u00b7 check labels</div>'
      : '<div class="auto-badge">AUTO-SUGGESTED \u00b7 verify image &amp; labels before exam use</div>';
  return '<section class="page">' +
    '<div class="num">' + esc(f.sec) + '</div>' +
    '<div class="fig-title">' + esc(f.title) + '</div>' +
    badge +
    '<div class="fig-img"><img src="' + f.url + '" alt="' + esc(f.title) + '"></div>' +
    marksHtml(f.marks) +
    '<div class="fig-src">' + esc(f.src) + '</div>' +
    '</section>';
}
function subjectPage(subj) {
  var handN = subj.figs.filter(function (x) { return x.hand; }).length;
  var resN = subj.figs.filter(function (x) { return x.source === 'auto' || x.source === 'live'; }).length;
  var legacyN = subj.figs.length - handN - resN;
  var pages = subj.figs.map(function (x) {
    return {
      url: C(x.file),
      sec: 'GS Figures \u00b7 ' + subj.name,
      title: x.name + ' \u2014 Suggested Figure',
      hand: x.hand,
      source: x.source,
      marks: ['sketch / label the key parts of this feature', 'note its location, dates or structure as relevant to the subject', 'verify the image really is the feature'],
      src: (x.hand ? 'Source: Wikimedia Commons (hand-picked file)'
        : x.source && x.source !== 'legacy' ? 'Source: auto-resolved from Wikimedia Commons (structured match) \u00b7 CC BY-SA'
        : 'Source: auto-suggested from Wikimedia Commons \u00b7 CC BY-SA') + ' \u2014 verify before exam',
    };
  });
  var missing = '';
  if (subj.unmatched.length) {
    missing = '<div class="missing"><b>' + esc(subj.name) + ' \u2014 topics still needing a figure</b> (no confident Commons image found):<br>' +
      esc(subj.unmatched.slice(0, 20).join(' \u00b7 ')) + (subj.unmatched.length > 20 ? ' \u00b7 +' + (subj.unmatched.length - 20) + ' more' : '') + '</div>';
  }
  var counts = subj.figs.length + ' figures (' + handN + ' hand-picked, ' + resN + ' auto-resolved' +
    (legacyN ? ', ' + legacyN + ' auto-suggested' : '') + ')';
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>' + esc(subj.name) + ' Figures (UPSC)</title>' +
    '<style>' + CSS + '</style></head><body>' +
    '<section class="page"><header><span class="num">GS Figures \u00b7 ' + esc(subj.name) + ' \u00b7 UPSC</span>' +
    '<h1>' + esc(subj.name) + ' \u2014 Suggested Figures</h1>' +
    '<p class="meta">' + counts + ' \u00b7 topics from UPSC syllabus \u00b7 from Wikimedia Commons (needs internet) \u00b7 print-ready A4 \u00b7 built by scripts/build-subject-figures.js</p></header>' + missing + '</section>' +
    pages.map(pageFor).join('') +
    '</body></html>';
}
function indexPage(all) {
  // The figures in these packs are on-topic, because topics come from the
  // curated syllabus list (data/figure-topics-curated.json) instead of the
  // contaminated question shards. Provenance is stated per pack rather than
  // implied: hand-picked files, resolver picks (matched against the topic's own
  // Wikipedia article / Wikimedia structured data), and anything left over.
  var items = all.map(function (s) {
    var handN = s.figs.filter(function (x) { return x.hand; }).length;
    var resN = s.figs.filter(function (x) { return x.source === 'auto' || x.source === 'live'; }).length;
    var otherN = s.figs.length - handN - resN;
    var prov = [handN ? handN + ' hand-picked' : '',
                resN ? resN + ' auto-resolved' : '',
                otherN ? otherN + ' auto-suggested' : ''].filter(Boolean).join(' \u00b7 ');
    return '<li><a href="' + esc(s.slug) + '-figures.html">' + esc(s.name) +
      '</a> \u2014 ' + s.figs.length + ' figures \u00b7 ' + esc(prov) + '</li>';
  }).join('');
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>UPSC Subject Figures \u2014 Index</title>' +
    '<style>' + CSS + '</style></head><body>' +
    '<section class="page"><header><span class="num">GS \u00b7 All Subjects \u00b7 UPSC</span>' +
    '<h1>UPSC Subject Figures \u2014 Index</h1>' +
    '<p class="meta">Per-subject printable figure packs. The Geography pack is hand-curated. ' +
    'The other packs take their topics from the curated UPSC syllabus list in ' +
    '<code>data/figure-topics-curated.json</code>, and each image is either a hand-picked file or a ' +
    'resolver pick matched against the topic\u2019s own Wikipedia article and Wikimedia structured data ' +
    '(<code>data/figure-files-auto.json</code>, produced by the Resolve Figures workflow). Every figure ' +
    'is badged with how it was chosen, and labels should still be checked before exam use. The question ' +
    'shards are deliberately NOT used here: each subject\u2019s shard set is a near-complete A\u2013Z Wikipedia ' +
    'sweep, which is what previously produced figures like the Democratic Party under Animal Husbandry.</p></header></section>' +
    '<ul class="idx"><li><a href="geography-figures.html">Geography</a> \u2014 curated figure pack</li>' + items + '</ul>' +
    '</body></html>';
}

// ---- main ----
async function main() {
  if (!ALLOW_UNVERIFIED) {
    console.log('Refusing to build figure packs without opt-in.');
    console.log('Two separate things are unverified here:');
    console.log('  1. topic SOURCE. FIGURE_SOURCE=shards reads topics from the question');
    console.log('     files, and those are A-Z Wikipedia sweeps, so figures inherit the');
    console.log('     contamination (Democratic Party as an Animal Husbandry figure).');
    console.log('     The default FIGURE_SOURCE=curated uses data/figure-topics-curated.json,');
    console.log('     which is grounded in the UPSC Paper-1 syllabus and is on-topic.');
    console.log('  2. the IMAGES. Even with curated topics, each image is a Wikimedia');
    console.log('     auto-match that a human has not eyeballed. Every figure stays badged');
    console.log('     "auto-suggested" and should be checked before exam use.');
    console.log('');
    console.log('Build on-topic packs (still unverified images):');
    console.log('  FIGURES_ALLOW_UNVERIFIED=1 node scripts/build-subject-figures.js');
    console.log('Preview without writing:');
    console.log('  FIGURES_ALLOW_UNVERIFIED=1 FIGURES_DRY_RUN=1 node scripts/build-subject-figures.js');
    return;
  }
  var cache = {};
  if (fs.existsSync(CACHE_FILE)) {
    try { cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch (e) { cache = {}; }
  }
  // Cache values now record how the pick was made. Bare strings from older
  // runs are marked 'cache' (unknown provenance) and are therefore never
  // presented as a resolved figure.
  Object.keys(cache).forEach(function (k) {
    var v = cache[k];
    cache[k] = (typeof v === 'string') ? { file: v, source: 'cache' } : v;
  });
  var source = String(process.env.FIGURE_SOURCE || 'curated').toLowerCase();
  var subjects = source === 'shards' ? scanSubjects() : curatedSubjects();
  // HAND_PICKED_ONLY=1 renders just the hand-verified files from
  // data/figure-files-curated.json and never touches the network search. It is
  // fast and deterministic, so it is the right mode for a quick refresh of the
  // known-good figures; the auto search is a separate, slower, best-effort pass.
  var HAND_ONLY = /^(1|true|yes)$/i.test(String(process.env.HAND_PICKED_ONLY || ''));
  if (source === 'shards') {
    console.log('WARNING: FIGURE_SOURCE=shards — topics come from the contaminated question files.');
  } else {
    console.log('Topic source: curated (data/figure-topics-curated.json)');
  }
  if (HAND_ONLY) console.log('Mode: HAND_PICKED_ONLY — hand-verified files only, no search.');
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
    var exact = subjects[sname].exact || {};
    for (var ti = 0; ti < order.length && figs.length < TOPICS_PER_SUBJECT && budget > 0; ti++) {
      if (Date.now() > deadline) { budget = 0; break; }
      var tname = order[ti];
      var key = norm(tname);
      var fname = null;
      var source = null;
      // A hand-picked exact file wins and is used verbatim (geography method).
      var hand = exact[tname];
      var auto = subjects[sname].auto || {};
      var ap = auto[tname];
      if (hand && (await fileOK(hand))) {
        fname = hand; source = 'hand';
      } else if (HAND_ONLY) {
        unmatched.push(tname); // hand-picked-only mode never falls back to search
      } else if (ap && ap.file && Number(ap.conf) >= AUTO_MIN_CONF && (await fileOK(ap.file))) {
        // Committed by the Resolve Figures workflow: already resolved against
        // Wikimedia structured data and existence-checked there.
        fname = ap.file; source = 'auto'; cache[key] = { file: fname, source: 'auto' };
      } else if (cache[key] && cache[key].file && (await fileOK(cache[key].file))) {
        fname = cache[key].file;
        source = cache[key].source || 'cache';
      } else {
        var hit = null;
        if (/^(1|true|yes)$/i.test(String(process.env.LEGACY_SEARCH || ''))) {
          // Opt-in only: the old free-text search matched historic maps of
          // North America to Indian topics, so it is no longer the default.
          try { hit = await resolveAuto(tname); } catch (e) { hit = null; }
          if (hit) { fname = hit.f; source = 'legacy'; cache[key] = { file: fname, source: 'legacy' }; }
        } else {
          try { hit = await RESOLVER.resolve(tname); } catch (e) { hit = null; }
          if (hit && Number(hit.conf) >= AUTO_MIN_CONF) { fname = hit.file; source = 'live'; cache[key] = { file: fname, source: 'live' }; }
        }
        if (!fname) unmatched.push(tname);
        budget--;
        await new Promise(function (res) { setTimeout(res, 180); });
      }
      if (fname && figs.length < TOPICS_PER_SUBJECT) {
        AUTO_EXCLUDE_IMG[fname] = 1;
        figs.push({ name: tname, file: fname, hand: !!hand, source: source || 'cache' });
      }
    }
    if (figs.length) {
      var s = slug(sname);
      if (usedSlugs[s]) s = s + '-' + (++usedSlugs[s]);
      else usedSlugs[s] = 1;
      made.push({ slug: s, name: subjects[sname].display || sname, figs: figs, unmatched: unmatched });
    }
  }

  if (DRY_RUN) {
    console.log('DRY RUN — no files written. Would write:');
    made.forEach(function (subj) {
      var vN = subj.figs.filter(function (x) { return x.hand || x.source === 'auto' || x.source === 'live'; }).length;
      console.log('  ' + (subj.slug + '-figures.html').padEnd(46) + subj.figs.length + ' figs (' + vN + ' resolved)');
    });
    if (made.length) console.log('  ' + 'subject-figures-index.html'.padEnd(46) + made.length + ' subjects');
    console.log('Cache entries after this run: ' + Object.keys(cache).length);
    return;
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