// Raw-corpus probe: does the corpus actually hold the nodes a federalism mains
// answer would need (institutions, cases, schedules)? Distinguishes "thin
// index" from "absent corpus" so we can refuse honestly.
'use strict';
var fs = require('fs');
var path = require('path');
var ROOT = path.join(__dirname, '..');
var all = [];
for (var i = 0; i < 10; i++) {
  all = all.concat(JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'timeline.nodes.' + i + '.json'), 'utf8')));
}
console.log('raw nodes:', all.length);
function show(label, re, lim) {
  var h = all.filter(function (n) { return re.test(n.name || ''); });
  console.log('--- ' + label + ': ' + h.length);
  h.slice(0, lim || 10).forEach(function (n) {
    console.log('  [' + n.name + '] words=' + String(n.desc || '').split(/\s+/).length + ' ' + String(n.desc || '').slice(0, 110));
  });
}
show('Indian National Congress', /Indian National Congress/);
show('Finance Commission', /Finance Commission/);
show('GST Council|Goods and Services Tax', /GST Council|Goods and Services Tax/);
show('Inter-State Council|NITI Aayog|Planning Commission', /Inter-State Council|NITI Aayog|Planning Commission/);
show('Bommai|Kesavananda|NCT of Delhi', /Bommai v|Kesavananda|Government of NCT|State of West Bengal v/);
show('federalism title', /federalism/i);
show('Seventh Schedule|State Reorganisation|Union and States', /Seventh Schedule|Reorganisation of States|Union and States|Centres and States/i);
show('Governor|Article 356|President rule', /Article 356|President's rule|Governor of/);
