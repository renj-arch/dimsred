'use strict';
/**
 * Classify the shipped question corpus by subject ownership.
 *
 *   node scripts/audit-question-subject.js              report over all files
 *   node scripts/audit-question-subject.js --file X    report one file
 *   node scripts/audit-question-subject.js --file X --apply   rewrite one file
 *
 * Report mode never writes. --apply rewrites in place and preserves the
 * original subject/category under sourceSubject/sourceCategory.
 */
var fs = require('fs');
var path = require('path');
var QO = require('./lib/question-ownership.js');

var ROOT = path.resolve(__dirname, '..');
var DIR = path.join(ROOT, 'data', 'questions');
var args = process.argv.slice(2);
var only = null, apply = false, limit = Infinity;
for (var i = 0; i < args.length; i++) {
  if (args[i] === '--file') only = args[++i];
  else if (args[i] === '--apply') apply = true;
  else if (args[i] === '--limit') limit = parseInt(args[++i], 10);
}

var files = fs.readdirSync(DIR).filter(function (f) { return /\.json$/i.test(f); }).sort();
if (only) files = files.filter(function (f) { return f === only; });
files = files.slice(0, limit);

var BUCKETS = ['MATCH', 'DATE', 'QUANTITY', 'MISMATCH', 'UNRESOLVABLE'];
var count = {}, dateTypes = {}, qtyTypes = {};
BUCKETS.forEach(function (b) { count[b] = 0; });
var total = 0, filesDone = 0, rewritten = 0, notCloze = 0, noSub = 0;
var subjectCats = new Map();
var changedSubjects = 0;

files.forEach(function (f) {
  var full = path.join(DIR, f);
  var data;
  try { data = JSON.parse(fs.readFileSync(full, 'utf8')); } catch (e) {
    console.log('  unreadable: ' + f);
    return;
  }
  var dirty = false;

  Object.keys(data).forEach(function (cat) {
    var subs = (data[cat] && data[cat].subSubjects) || {};
    Object.keys(subs).forEach(function (sub) {
      var arr = Array.isArray(subs[sub]) ? subs[sub] : [subs[sub]];
      var out = [];
      arr.forEach(function (q) {
        if (!q || typeof q !== 'object') { out.push(q); return; }
        total++;
        if (String(q.question || '').indexOf(QO.BLANK) === -1) notCloze++;
        if (q.subSubject == null || q.subSubject === '') noSub++;

        var r = QO.repairQuestion(q);
        count[r.c.bucket]++;
        if (r.c.dateType) dateTypes[r.c.dateType] = (dateTypes[r.c.dateType] || 0) + 1;
        if (r.c.quantityType) qtyTypes[r.c.quantityType] = (qtyTypes[r.c.quantityType] || 0) + 1;
        if (r.c.bucket === 'MISMATCH') changedSubjects++;

        var newSub = r.q.subSubject;
        if (!subjectCats.has(newSub)) subjectCats.set(newSub, new Set());
        subjectCats.get(newSub).add(cat);

        if (r.q !== q) dirty = true;
        out.push(r.q);
      });
      if (Array.isArray(subs[sub])) subs[sub] = out; else subs[sub] = out[0];
    });
  });

  if (apply && dirty) {
    fs.writeFileSync(full, JSON.stringify(data));
    rewritten++;
  }
  filesDone++;
  if (filesDone % 100 === 0) {
    process.stderr.write('  ...' + filesDone + '/' + files.length + ' files, ' + total.toLocaleString() + ' questions\n');
  }
});

var pct = function (n) { return (100 * n / (total || 1)).toFixed(2) + '%'; };
console.log('\nfiles processed        : ' + filesDone + (apply ? '  (rewritten: ' + rewritten + ')' : '  (read-only)'));
console.log('questions classified   : ' + total.toLocaleString());
console.log('');
BUCKETS.forEach(function (b) {
  var line = b.padEnd(13) + String(count[b].toLocaleString()).padStart(13) + '  ' + pct(count[b]);
  console.log('  ' + line);
});
console.log('');
console.log('  subject was already correct (MATCH)  : ' + count.MATCH.toLocaleString());
console.log('  subject correct, date now typed      : ' + count.DATE.toLocaleString());
console.log('  subject correct, quantity now typed   : ' + count.QUANTITY.toLocaleString());
console.log('  subject re-derived from the answer    : ' + count.MISMATCH.toLocaleString());
console.log('  unresolvable, left untouched          : ' + count.UNRESOLVABLE.toLocaleString());
console.log('  total re-derived                      : ' + changedSubjects.toLocaleString());
console.log('');
console.log('date types    : ' + JSON.stringify(dateTypes));
console.log('quantity types: ' + JSON.stringify(qtyTypes));
console.log('not cloze-formatted : ' + notCloze.toLocaleString());
console.log('missing subSubject  : ' + noSub.toLocaleString());

var shared = 0, maxCats = 0, worst = null;
subjectCats.forEach(function (set) {
  if (set.size > 1) shared++;
  if (set.size > maxCats) { maxCats = set.size; }
});
console.log('');
console.log('distinct subjects after repair : ' + subjectCats.size.toLocaleString());
console.log('subjects still spanning >1 category : ' + shared.toLocaleString() + '  (category ownership is a separate, unfixed problem)');
console.log('widest category spread        : ' + maxCats);
