// gen-topic-weight.js
// Tag every mind-tree name in data/topic-layers.json with an exam-weight so the
// flowchart cards can show priority. For each candidate name (seed topic,
// branch title, layer item) count how many practice questions across
// data/questions/*.json mention it, then bucket the counts into high / med /
// low importance. Usage: node scripts/gen-topic-weight.js
// Writes data/topic-weight.json  { canonName: { q: <int>, imp: 'high|med|low' } }

var fs = require('fs');
var path = require('path');
var ROOT = path.resolve(__dirname, '..');
var QDIR = path.join(ROOT, 'data', 'questions');
var OUT = path.join(ROOT, 'data', 'topic-weight.json');

function canon(s) {
  return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/gi, ' ').replace(/\s+/g, ' ').trim();
}
function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// 1. Candidate names = every seed topic + branch title + item in topic-layers
var layers = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'topic-layers.json'), 'utf8'));
var cand = {}; // canon -> display name
Object.keys(layers).forEach(function (topic) {
  var t = layers[topic];
  cand[canon(topic)] = topic;
  (t.branches || []).forEach(function (br) {
    cand[canon(br.title)] = br.title;
    (br.items || []).forEach(function (it) { cand[canon(it.name)] = String(it.name || '').trim(); });
  });
});
console.log('candidate names:', Object.keys(cand).length);

// 2. One combined alternation regex over canon'd text (longest first so
//    "indian national congress" beats "congress" at the same start).
var names = Object.keys(cand).filter(Boolean).sort(function (a, b) { return b.length - a.length; });
var RE = new RegExp('\\b(?:' + names.map(escRe).join('|') + ')\\b', 'g');
console.log('regex source bytes:', RE.source.length);

// 3. Count question mentions per name, one pass per question
function walk(o, hitSet) {
  if (Array.isArray(o)) { o.forEach(function (x) { walk(x, hitSet); }); return; }
  if (o && typeof o === 'object') {
    if (typeof o.question === 'string') {
      var text = canon([o.question, o.answer, o.fact, o.hint, o.subSubject].filter(Boolean).join(' '));
      if (!text) return;
      var m; RE.lastIndex = 0;
      while ((m = RE.exec(text)) !== null) hitSet[m[0]] = 1;
      return;
    }
    Object.keys(o).forEach(function (k) { walk(o[k], hitSet); });
  }
}

var count = {};
var files = fs.readdirSync(QDIR).filter(function (f) { return /\.json$/i.test(f) && f !== 'state-tracker.json'; });
var t0 = Date.now();
files.forEach(function (f, fi) {
  var j;
  try { j = JSON.parse(fs.readFileSync(path.join(QDIR, f), 'utf8')); } catch (e) { console.log('skip unparsable', f); return; }
  var hit = {};
  walk(j, hit);
  Object.keys(hit).forEach(function (c) { count[c] = (count[c] || 0) + 1; });
  if ((fi + 1) % 25 === 0) console.log('  scanned', fi + 1, '/', files.length, '(', path.basename(f), ')', Date.now() - t0 + 'ms');
});
console.log('files:', files.length, 'names with hits:', Object.keys(count).length, 'took', Date.now() - t0 + 'ms');

// 4. Bucket by count quantiles (min floors so tiny banks still split)
var vals = Object.keys(count).map(function (c) { return count[c]; }).sort(function (a, b) { return a - b; });
function pct(p) { return vals[Math.min(vals.length - 1, Math.floor((vals.length - 1) * p))]; }
var hi = Math.max(4, pct(0.85));
var lo = Math.max(1, pct(0.5));
console.log('thresholds low<', lo, 'med<', hi);

var out = {};
Object.keys(count).forEach(function (c) {
  var q = count[c];
  var imp = q >= hi ? 'high' : q >= lo ? 'med' : 'low';
  out[c] = { q: q, imp: imp };
});

fs.writeFileSync(OUT, JSON.stringify(out));
console.log('wrote', OUT, Object.keys(out).length, 'entries');