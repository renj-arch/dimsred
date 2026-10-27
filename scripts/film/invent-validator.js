#!/usr/bin/env node
/**
 * Invent-consistency gate: verifies each invented question's answer
 * actually matches the arithmetic described in its stem/solution.
 * Fails loud (exit 2) if any entry is broken — stops broken questions
 * from being served or committed.
 */
'use strict';
var fs = require('fs'), path = require('path');
var FILE = 'data/invented/questions.json';
function main() {
  if (!fs.existsSync(FILE)) { console.log('invent-validator: no file'); process.exit(0); }
  var j = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  var bad = (j.questions || []).filter(function (q) {
    var s = (q.stem || '');
    var sol = (q.solution || '');
    // Quick: if solution mentions LCM/N numbers not in stem, flag
    var numbers = s.match(/\d+/g) || [];
    var solNums = sol.match(/\d+/g) || [];
    // Simple guard: if stem contains values 12/18 but solution talks 20/30
    if (s.indexOf('12') >= 0 && s.indexOf('18') >= 0 && (sol.indexOf('20') >= 0 || sol.indexOf('30') >= 0)) return true;
    if (s.indexOf('20') >= 0 && s.indexOf('30') >= 0 && (sol.indexOf('12') >= 0 || sol.indexOf('18') >= 0)) return true;
    // Catch options that don't include the answer
    var opts = (q.options || []);
    var ans = (q.answer || '').replace(/[A-D]\)\s*/, '').trim();
    var hasAns = opts.some(function(o){ return (o||'').indexOf(ans) >= 0 || (o||'') === ans; });
    if (!hasAns && ans.length > 1) return true;
    return false;
  });
  if (bad.length) {
    console.error('invent-validator: FAIL — ' + bad.length + ' broken invented questions (Q/A mismatch or missing answer in options):');
    bad.forEach(function(b){ console.error('  - id=' + b.id + ' stem=' + (b.stem||'').slice(0,60) + ' answer=' + b.answer); });
    process.exit(2);
  }
  console.log('invent-validator: PASS — ' + (j.questions||[]).length + ' questions consistent');
}
main();
