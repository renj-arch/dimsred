// Builds data/map.json — entity → category → topic counts, across all 51 category files.
// Phase 1 PoC: scans a curated ALIASES map. Later phases: auto-extract all entities.
// Usage: node scripts/build-map.js
var fs = require('fs');
var path = require('path');

var DATA = path.join(__dirname, '..', 'data', 'questions');
var OUT = path.join(__dirname, '..', 'data', 'map.json');

// Entity aliases are matched case-insensitively against question+fact text.
var ALIASES = {
  'B. R. Ambedkar': [
    'ambedkar', 'babasaheb', 'bhimrao ramji ambedkar', 'bhimrao',
    'dr. ambedkar', 'dr ambedkar', 'b.r. ambedkar', 'b r ambedkar', 'bhima rao'
  ]
};

function loadCategories() {
  var out = {};
  for (var f of fs.readdirSync(DATA)) {
    if (!f.endsWith('.json') || f === 'manifest.json') continue;
    var parsed = JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
    var label = Object.keys(parsed)[0] || f.replace('.json', '');
    var qs = [];
    for (var subj of Object.keys(parsed)) {
      var subs = parsed[subj].subSubjects || {};
      for (var ss of Object.keys(subs)) {
        var arr = subs[ss];
        if (Array.isArray(arr)) for (var q of arr) { q._topic = ss; qs.push(q); }
      }
    }
    out[f.replace('.json', '')] = { file: f, label: label, questions: qs };
  }
  return out;
}

function matchesAliases(text, aliases) {
  var lower = text.toLowerCase();
  for (var a of aliases) {
    if (lower.indexOf(a) !== -1) return true;
  }
  return false;
}

function main() {
  var cats = loadCategories();
  var entities = {};
  for (var name of Object.keys(ALIASES)) {
    var aliases = ALIASES[name];
    var total = 0;
    var catsOut = {};
    for (var key of Object.keys(cats)) {
      var c = cats[key];
      var topics = {};
      var cTotal = 0;
      for (var q of c.questions) {
        var text = [q.question, q.answer, q.fact, q.hint].filter(Boolean).join(' ');
        if (matchesAliases(text, aliases)) {
          var t = q.subSubject || q._topic || 'General';
          topics[t] = (topics[t] || 0) + 1;
          cTotal++;
          total++;
        }
      }
      if (cTotal > 0) {
        catsOut[key] = { label: c.label, total: cTotal, topics: topics };
      }
    }
    entities[name] = { aliases: aliases, total: total, cats: catsOut };
  }
  var out = { builtAt: new Date().toISOString(), entities: entities };
  fs.writeFileSync(OUT, JSON.stringify(out));
  console.log('Wrote ' + OUT);
  for (var en of Object.keys(entities)) {
    console.log(en + ': ' + entities[en].total + ' questions across ' + Object.keys(entities[en].cats).length + ' categories');
  }
}

main();
