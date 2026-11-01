// How much quotable material exists that the index build currently drops only
// because a Wikipedia lead sentence is missing its full stop? If the answer is
// "a lot", the honest fix is to accept period-less lead sentences at index
// build, not to loosen the runtime gate.
'use strict';
var fs = require('fs');
var path = require('path');
var ask = require('./lib/ask-core.js');
var ROOT = path.join(__dirname, '..');
var all = [];
for (var i = 0; i < 10; i++) {
  all = all.concat(JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'timeline.nodes.' + i + '.json'), 'utf8')));
}
var seen = {}, now = 0, repair = 0, total = 0;
var repaired = [];
all.forEach(function (n) {
  var d = String(n.desc || '').trim();
  if (!d) return;
  var k = n.name + '|' + d;
  if (seen[k]) return;
  seen[k] = 1;
  total++;
  if (ask.isQuoteable(d)) { now++; return; }
  if (ask.wordCount(d) < ask.MIN_DESC_WORDS) return;
  if (!/^[A-Z]/.test(d)) return;
  if (/_{3,}/.test(d) || d.indexOf('|') !== -1) return;
  var d2 = d + '.';
  if (ask.isQuoteable(d2)) {
    repair++;
    if (repaired.length < 20) repaired.push(n.name + ' :: ' + d.slice(0, 100));
  }
});
console.log('unique descs:', total);
console.log('quoteable now:', now);
console.log('quoteable if period-less leads accepted:', now + repair);
repaired.forEach(function (r) { console.log('  ' + r); });
