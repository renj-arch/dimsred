// One-off migration: rebuild papers-data JSON sources for paper pages whose
// sources were lost in the history slimming (cgl practice sets 1-3 and the
// 13-sep-2025-s1 paper). Questions are extracted from the rendered HTML,
// repaired with the bank-cleanup functions, and junk questions are dropped.
// After running this, run `node scripts/build-papers.js` to rebuild the pages,
// then commit the pages + papers-data + index cards together.
//
// Usage: node scripts/refresh-papers-from-pages.js
var fs = require('fs');
var path = require('path');
var bc = require('./bank-cleanup.js');

var ROOT = path.resolve(__dirname, '..');
var V = bc.buildVocab().any;

var COLORS = {
  'General Intelligence & Reasoning': '#a855f7',
  'General Intelligence': '#a855f7',
  'General Awareness': '#60a5fa',
  'Quantitative Aptitude': '#34d399',
  'Mathematics': '#34d399',
  'English Comprehension': '#fb923c',
  'English': '#fb923c'
};

var TARGETS = [
  { file: 'cgl/papers/13-sep-2025-s1.html', slug: '13-sep-2025-s1', folder: 'cgl', timer: 60 },
  { file: 'cgl/papers/practice-set-01.html', slug: 'practice-set-01', folder: 'cgl', timer: 60 },
  { file: 'cgl/papers/practice-set-02.html', slug: 'practice-set-02', folder: 'cgl', timer: 60 },
  { file: 'cgl/papers/practice-set-03.html', slug: 'practice-set-03', folder: 'cgl', timer: 60 }
];

var PATTERN_SECTIONS = ['General Intelligence & Reasoning', 'General Awareness', 'Quantitative Aptitude', 'English Comprehension'];

// Known corruption phrases that token-level repair cannot disambiguate
// (both readings are valid words), fixed by explicit mapping. Keep this list
// short and only add phrases that are *always* corruption.
var OVERRIDES = [
  ['averages core', 'average score']
];

function clean(s) {
  if (s === undefined || s === null) return '';
  var out = bc.repairWordSplits(bc.fixMojibake(bc.decodeEntities(String(s))), V);
  OVERRIDES.forEach(function (ov) { out = out.split(ov[0]).join(ov[1]); });
  return out;
}

function extractQuestions(html) {
  var parts = html.split('<div class="question"');
  parts.shift();
  var out = [];
  parts.forEach(function (block) {
    var tm = block.match(/<div class="q-text">([\s\S]*?)<\/div>/);
    if (!tm) return;
    var text = clean(tm[1].replace(/<[^>]+>/g, ''));
    var sm = block.match(/<span class="section-badge[^"]*">([\s\S]*?)<\/span>/);
    var section = sm ? clean(sm[1]).trim() : '';
    var opts = [];
    var ore = /<div class="q-option"([^>]*)>([\s\S]*?)<\/div>/g, om;
    while ((om = ore.exec(block))) {
      var correct = /data-correct="true"/.test(om[1]);
      var inner = clean(om[2].replace(/<[^>]+>/g, '')).trim();
      var lab = inner.match(/^([A-Ea-e])[.)]\s*/);
      opts.push({ label: lab ? lab[1].toUpperCase() : String.fromCharCode(65 + opts.length), text: lab ? inner.slice(lab[0].length).trim() : inner, correct: correct });
    }
    var solm = block.match(/<div class="solution-box">[\s\S]*?<strong>Correct Answer:<\/strong>\s*[A-Ea-e.]*\s*(?:<br>\s*<span[^>]*>([\s\S]*?)<\/span>)?/);
    var solution = solm && solm[1] ? clean(solm[1].replace(/<[^>]+>/g, '')) : '';
    out.push({ text: text, section: section, options: opts, solution: solution });
  });
  return out;
}

function repairQuestion(q) {
  // keep only the first label-run (legacy parser merged option sets)
  var raw = q.options || [];
  var seen = {}, cut = 0;
  while (cut < raw.length && !seen[raw[cut].label]) { seen[raw[cut].label] = true; cut++; }
  if (cut >= 2 && cut < raw.length) q.options = raw.slice(0, cut);
  var so = q.options || [];
  var nCorrect = 0, dup = false, optSeen = {};
  so.forEach(function (o) {
    if (o.correct) nCorrect++;
    var t = String(o.text || '').toLowerCase().replace(/\s+/g, '');
    if (optSeen[t]) dup = true;
    optSeen[t] = true;
  });
  if (!q.text || q.text.length < 8) return 'SHORT';
  if (so.length < 2 || nCorrect !== 1 || dup) return 'STRUCT';
  var res = bc.inspectQuestion(q, V, null);
  if (res.reasons.length) return res.reasons[0].split(':')[0];
  return null;
}

function updateIndexCard(folder, slug, metaText) {
  var indexPath = path.join(ROOT, folder, 'index.html');
  if (!fs.existsSync(indexPath)) return;
  var html = fs.readFileSync(indexPath, 'utf8');
  var i = html.indexOf('papers/' + slug + '.html');
  if (i === -1) { console.log('  card not found for ' + slug); return; }
  var prefix = html.slice(0, i);
  var mi = prefix.lastIndexOf('<div class="meta">');
  if (mi === -1) { console.log('  card meta not found for ' + slug); return; }
  var end = html.indexOf('</div>', mi);
  var patched = html.slice(0, mi) + '<div class="meta">' + metaText + '</div>' + html.slice(end + 6);
  fs.writeFileSync(indexPath, patched, 'utf8');
  console.log('  card updated: ' + folder + '/index.html (' + metaText + ')');
}

var writes = 0;
TARGETS.forEach(function (t) {
  var full = path.join(ROOT, t.file);
  if (!fs.existsSync(full)) { console.log(t.file + ': missing, skipping'); return; }
  var html = fs.readFileSync(full, 'utf8');
  var title = (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || t.slug;
  var h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '';
  h1 = bc.decodeEntities(h1.replace(/<[^>]+>/g, '')).trim();
  var desc = (html.match(/name="description" content="([^"]*)"/) || [])[1] || '';

  var extracted = extractQuestions(html);
  var kept = [], dropCounts = {};
  extracted.forEach(function (q) {
    ['text', 'solution'].forEach(function (f) { if (q[f]) q[f] = clean(q[f]); });
    q.options.forEach(function (o) { o.text = clean(o.text); });
    var why = repairQuestion(q);
    if (why) { dropCounts[why] = (dropCounts[why] || 0) + 1; return; }
    kept.push(q);
  });
  console.log(t.file + ': extracted ' + extracted.length + ', kept ' + kept.length + ' ' + JSON.stringify(dropCounts));

  var minKeep = Math.max(8, Math.round(extracted.length * 0.4));
  if (kept.length < minKeep) { console.log('  too few kept (' + kept.length + ' < ' + minKeep + ') — NOT writing'); return; }

  // sections: use extracted badge names when present, else classify conservatively
  var secNames = [];
  kept.forEach(function (q) { if (q.section && secNames.indexOf(q.section) === -1) secNames.push(q.section); });
  if (!secNames.length) {
    secNames = PATTERN_SECTIONS.slice();
    kept.forEach(function (q) { q.section = bc.classifySection(q, PATTERN_SECTIONS) || ''; });
  }
  var sections = secNames.map(function (n) { return { name: n, color: COLORS[n] || '#a78bfa' }; });

  kept.forEach(function (q, i) { q.q = i + 1; });
  var metaText = kept.length + ' Q \u00b7 ' + t.timer + ' min \u00b7 Solved with answers';
  var data = {
    folder: t.folder,
    slug: t.slug,
    title: h1 || title,
    pageTitle: title,
    pageDesc: desc,
    meta: metaText,
    timerMinutes: t.timer,
    createdDate: new Date().toISOString().split('T')[0],
    sections: sections,
    questions: kept
  };
  var outPath = path.join(ROOT, 'papers-data', t.folder + '-' + t.slug + '.json');
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
  writes++;
  console.log('  wrote ' + path.relative(ROOT, outPath));
  updateIndexCard(t.folder, t.slug, metaText);
});

console.log('\n' + writes + ' paper source(s) rebuilt. Now run: node scripts/build-papers.js');
