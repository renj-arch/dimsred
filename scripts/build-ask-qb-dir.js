'use strict';
// Build the entity directory used to route a question to shards.
//
// Routing on CATEGORY NAMES is the wrong signal. "Indian" appears in roughly
// fifty category names, so a subject token of "indian" carries no information,
// while a subject like "Indian National Congress" lives in `Indian States` and
// `World History` rather than in any polity category. That is why a hint table
// could not route it no matter how many entries were added.
//
// A token index was tried first and is the wrong structure too. The corpus has
// 472,762 entities and a huge mass of df=1 proper-noun tokens, so capping by
// rarity evicted the discriminative rare tokens (`urbanisation` df=4, `bhopal`
// df=17) while capping by document frequency evicted the discriminative common
// ones (`congress` df=669). The exact answer is already in the manifest: every
// entity name and the shard it came from.
//
// So this writes a sorted, de-duplicated `name<TAB>category` table. Because it
// is sorted, the page can binary-search a subject prefix to find exactly which
// shards hold that entity, with no heuristics at all. Conceptual questions,
// where the subject is a phrase rather than an entity, still use the hint table.
//
// It reads the generated shards rather than the 8.5 GB source, so it is fast.

var fs = require('fs');
var path = require('path');
var qb = require('./lib/ask-qb.js');

var ROOT = path.join(__dirname, '..');
var QBDIR = path.join(ROOT, 'data', 'ask-qb');
var MANIFEST = path.join(QBDIR, 'manifest.json');
var DIR_JSON = path.join(QBDIR, 'dir.json');
var ENTITIES = path.join(QBDIR, 'entities.tsv');

function main() {
  var man = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  var cats = man.categories;

  // De-duplicate on the normalised name: the same entity name occurs in several
  // categories and a few occur twice in one shard, and repeats only inflate the
  // directory. Tabs and newlines are impossible in a normalised name, which is
  // what makes this a safe line format.
  var byName = Object.create(null);
  var totalRows = 0;

  cats.forEach(function (c, ci) {
    var rows = JSON.parse(fs.readFileSync(path.join(ROOT, c.file), 'utf8'));
    c.entities = rows.length;
    c.sentences = rows.reduce(function (a, r) { return a + (r[1] ? r[1].length : 0); }, 0);
    rows.forEach(function (r) {
      totalRows++;
      var n = qb.norm(r[0] || '');
      if (!n) return;
      var list = byName[n] || (byName[n] = []);
      if (list.indexOf(ci) === -1) list.push(ci);
    });
  });

  var names = Object.keys(byName).sort();
  var lines = new Array(names.length);
  for (var i = 0; i < names.length; i++) {
    lines[i] = names[i] + '\t' + byName[names[i]].join(',');
  }
  var text = lines.join('\n') + '\n';
  fs.writeFileSync(ENTITIES, text, 'utf8');

  var out = {
    builtAt: new Date().toISOString(),
    totalRows: totalRows,
    totalEntities: totalRows,
    distinctNames: names.length,
    entitiesFile: 'entities.tsv',
    categories: cats.map(function (c) {
      return { name: c.name, file: c.file, entities: c.entities, sentences: c.sentences, bytes: c.bytes };
    })
  };
  fs.writeFileSync(DIR_JSON, JSON.stringify(out, null, 1));

  process.stderr.write('wrote ' + path.relative(ROOT, DIR_JSON) + ' (' +
    (fs.statSync(DIR_JSON).size / 1048576).toFixed(2) + ' MB)\n');
  process.stderr.write('wrote ' + path.relative(ROOT, ENTITIES) + ' (' +
    (fs.statSync(ENTITIES).size / 1048576).toFixed(2) + ' MB)\n');
  process.stderr.write('  rows: ' + totalRows.toLocaleString() +
    '   distinct names: ' + names.length.toLocaleString() + '\n');

  // Self-check on the questions that were previously unroutable.
  ['bhopal disaster', 'indian national congress', 'history of the indian national congress',
    'urbanisation in india', 'anti-defection law (india)', 'punjabi suba movement',
    'special status (j&k, article 371)'].forEach(function (probe) {
    var n = qb.norm(probe);
    var hit = byName[n] ? byName[n].map(function (ci) { return cats[ci].name; }) : null;
    process.stderr.write('  ' + probe.padEnd(42) + (hit ? '-> ' + hit.join(' | ') : 'NOT FOUND') + '\n');
  });
}

main();
