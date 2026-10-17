'use strict';
// Why does a term the archive finds in 37 results not exist for Ask?
//
//   node scripts/diag-two-corpora.js Dadabhai Naoroji
//
// Ask and the archive read two different corpora, and the question "why did
// retrieval miss this?" has two possible answers that look identical to a user:
// the corpus lacks it, or the retrieval path cannot see it. This names which.
//
//   data/questions/*.json   -- 8.7 GB, 15,738,586 records, 135 categories.
//                             The archive search reads this, full text.
//   data/timeline.nodes.*.json
//                         -- 199 MB, 529,755 nodes, each with ONE harvested
//                             Wikipedia sentence as its desc. This is what
//                             build-ask-index.js reads to produce the 65,039
//                             nodes in ask-index.json.
//
// So Ask does not search 15M records. It searches 65,039 nodes, each carrying a
// single sentence, and that sentence has to pass a length and quotability gate
// before the node is kept at all.
var fs = require('fs');
var path = require('path');
var ask = require('./lib/ask-core.js');
var ROOT = path.join(__dirname, '..');

var term = process.argv[2] || 'Dadabhai Naoroji';
var re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

console.log('term: ' + term);
console.log('');

// ---- 1. the timeline corpus, which is what build-ask-index.js reads ---------
console.log('=== timeline.nodes (what ask-index.json is built from) ===');
var tlNamed = [];
for (var i = 0; i < 10; i++) {
  var f = path.join(ROOT, 'data', 'timeline.nodes.' + i + '.json');
  if (!fs.existsSync(f)) continue;
  JSON.parse(fs.readFileSync(f, 'utf8')).forEach(function (n) {
    if (re.test(String(n.name))) tlNamed.push({ i: i, name: String(n.name), desc: String(n.desc || '').trim() });
  });
}
console.log('  nodes whose NAME matches      ' + tlNamed.length);
tlNamed.slice(0, 5).forEach(function (n) {
  console.log('    [' + n.name + ']  shard ' + n.i);
  console.log('       desc: ' + JSON.stringify(n.desc.slice(0, 160)));
  console.log('       words ' + ask.wordCount(n.desc) + ' (min ' + ask.MIN_DESC_WORDS +
    ')  quotable ' + ask.isQuoteable(n.desc));
});
console.log('');

// ---- 2. why each of those did or did not survive into ask-index.json --------
console.log('=== survival of each matching node ===');
tlNamed.forEach(function (n) {
  var tooShort = ask.wordCount(n.desc) < ask.MIN_DESC_WORDS;
  var notQuoteable = !ask.isQuoteable(n.desc);
  var verdict = tooShort ? 'DROPPED: desc is ' + ask.wordCount(n.desc) +
    ' words, under the ' + ask.MIN_DESC_WORDS + '-word floor'
    : notQuoteable ? 'DROPPED: isQuoteable() rejected it'
      : 'kept';
  console.log('  ' + verdict);
});
console.log('');

// ---- 3. the archive corpus, for contrast ------------------------------------
console.log('=== data/questions (what the archive search reads) ===');
var catIndex = JSON.parse(fs.readFileSync(
  path.join(ROOT, 'data', 'questions', 'archive-cat-index.json'), 'utf8'));
var cats = Array.isArray(catIndex) ? catIndex : (catIndex.categories || catIndex);
// Each category entry carries `file` as a path relative to the repo root, not
// to data/questions.
var list = [];
var multiFile = 0;
(cats || []).forEach(function (c) {
  // Most categories name one file; a few name several, so `file` is not always
  // a string. Reading it as one produced a path.join() on an array.
  if (!c.file) return;
  [].concat(c.file).forEach(function (f) {
    if (typeof f !== 'string') return;
    list.push(f);
    if ([].concat(c.file).length > 1) multiFile++;
  });
});
console.log('  entries naming several files ' + multiFile);
console.log('  files listed                  ' + list.length +
  (missingPaths ? '  (' + missingPaths + ' not found on disk)' : ''));

// Count matches, stopping early: these files are 8.7 GB and the point is only
// to show the material exists and is reachable by the other path.
// Repo-root-relative, so resolve against ROOT directly rather than
// data/questions. Joining against data/questions produced
// data/questions/data/questions/... and matched nothing, which reads exactly
// like "the corpus does not contain this term".
var files = list.filter(function (f) { return fs.existsSync(path.join(ROOT, f)); });
var missingPaths = list.length - files.length;
var scanned = 0, hits = 0, sample = [];
outer:
for (var fi = 0; fi < files.length; fi++) {
  var fp = path.join(ROOT, files[fi]);
  scanned++;
  var raw = fs.readFileSync(fp, 'utf8');
  var count = 0, m;
  var rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  while ((m = rx.exec(raw)) !== null) {
    count++;
    if (sample.length < 4) {
      sample.push(files[fi] + ': ' + JSON.stringify(raw.slice(Math.max(0, m.index - 90), m.index + 90)));
    }
  }
  hits += count;
  if (scanned >= 40) break outer;
}
console.log('  files scanned                ' + scanned + (files.length > scanned ? ' (stopped early)' : ''));
console.log('  occurrences of the term      ' + hits.toLocaleString());
sample.forEach(function (s) { console.log('    ' + s); });
console.log('');

console.log('=== the gap, stated plainly ===');
console.log('  Ask retrieves from ask-index.json: 65,039 nodes, one sentence each.');
console.log('  The archive reads data/questions: 15,738,586 records, full text.');
console.log('  A term can be abundant in the second and absent from the first, and');
console.log('  Ask will report it as absent from the corpus, which is false.');
console.log('');
console.log('  Build script: scripts/build-ask-index.js');
console.log('  Gate it applies: MIN_DESC_WORDS and isQuoteable() per node.');
console.log('  Data it reads: data/timeline.nodes.0-9.json');