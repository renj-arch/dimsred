// How much does the fetch budget cost an answer?
//
//   node scripts/diag-fetch-budget.js <repo-root>
//
// The evidence shards are per-category and very large (World Geography alone is
// 59 MB / 33k entities), while a question needs a handful of specific entities.
// This measures what that costs: the same outline answered across a range of byte
// budgets, so the loss is visible as a number rather than felt as a slow page.
'use strict';
var fs = require('fs');
var path = require('path');
var ROOT = process.argv[2] || path.join(__dirname, '..');
var QB = path.join(ROOT, 'data/ask-qb');
var manifest = JSON.parse(fs.readFileSync(path.join(QB, 'manifest.json'), 'utf8'));
var ents = fs.readFileSync(path.join(QB, 'entities.tsv'), 'utf8');
var cache = {};
function shard(ci) {
  if (!(ci in cache)) {
    var p = path.join(QB, 'ask-qb.' + ci + '.json');
    cache[ci] = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
  }
  return cache[ci];
}
function tj(s) {
  return Promise.resolve({
    ok: true, status: 200,
    json: function () { return Promise.resolve(JSON.parse(s)); },
    text: function () { return Promise.resolve(s); }
  });
}
function jj(v) {
  return Promise.resolve({
    ok: true, status: 200,
    json: function () { return Promise.resolve(v); },
    text: function () { return Promise.resolve(JSON.stringify(v)); }
  });
}

var browser = require(path.join(ROOT, 'scripts/lib/ask-browser.js'));
var answer = require(path.join(ROOT, 'scripts/lib/ask-answer.js'));
var qb = require(path.join(ROOT, 'scripts/lib/ask-qb.js'));

var OUTLINE = [
  ['1. Current vs movement', 'ocean current', []],
  ['2. Gulf Stream', 'gulf stream', []],
  ['3. Canary / aridity', 'canary current', []],
  ['4. Upwelling', 'upwelling', []],
  ['5. AABW / water mass', 'antarctic bottom water', []],
  ['6. Coral reefs', 'coral reef', []],
  ['7. ACC / conveyor', 'antarctic circumpolar current', []],
  ['8. Humboldt / Peru', 'humboldt current', []],
  ['9. El Nino', 'el nino', []],
  ['10. Water mass (concept)', 'water mass', []]
];

// Every shard the outline could need, so budget is the only variable.
var NEEDED = {};
var ed = new qb.EntityDir().load(ents);
OUTLINE.forEach(function (p) {
  (ed.lookup(p[1]) || []).forEach(function (ci) { NEEDED[ci] = 1; });
});
var allIds = Object.keys(NEEDED).map(Number);
var needBytes = allIds.reduce(function (a, ci) { return a + (manifest.categories[ci].bytes || 0); }, 0);
console.log('this outline needs ' + allIds.length + ' shards, ' +
  (needBytes / 1048576).toFixed(1) + ' MB total');
allIds.sort(function (a, b) {
  return manifest.categories[b].bytes - manifest.categories[a].bytes;
}).forEach(function (ci) {
  console.log('  ' + manifest.categories[ci].name.slice(0, 34).padEnd(36) +
    (manifest.categories[ci].bytes / 1048576).toFixed(1).padStart(6) + ' MB');
});

var BUDGETS = [10, 30, 60, 90, 140, 200, 400];
var rows = [];

function run(i) {
  if (i >= BUDGETS.length) return Promise.resolve();
  var mb = BUDGETS[i];
  global.fetch = function (u) {
    var f = String(u);
    if (f.indexOf('manifest') >= 0) return tj(fs.readFileSync(path.join(QB, 'manifest.json'), 'utf8'));
    if (f.indexOf('dir.json') >= 0) return tj(fs.readFileSync(path.join(QB, 'dir.json'), 'utf8'));
    if (f.indexOf('entities.tsv') >= 0) return tj(ents);
    if (f.indexOf('concepts') >= 0) return tj(fs.readFileSync(path.join(QB, 'concepts.json'), 'utf8'));
    var m = f.match(/ask-qb\.(\d+)\.json/);
    if (m) {
      var ci = +m[1];
      if (!NEEDED[ci]) return Promise.resolve({ ok: false, status: 404 });
      return jj(shard(ci));
    }
    return Promise.resolve({ ok: false, status: 404 });
  };
  // boot() memoises, so each budget runs in a fresh module instance.
  delete require.cache[require.resolve(path.join(ROOT, 'scripts/lib/ask-browser.js'))];
  var b = require(path.join(ROOT, 'scripts/lib/ask-browser.js'));
  return b.boot(answer, qb).then(function () {
    return b.mains('q', OUTLINE, { maxBytes: mb * 1048576 });
  }).then(function (c) {
    rows.push({ mb: mb, ans: c.counts.answered, unq: c.counts.unquoted,
      abs: c.counts.absent, q: c.quoted, sh: c.fetchedShards, miss: c.missingShards });
    return run(i + 1);
  });
}

run(0).then(function () {
  console.log('');
  console.log('budget   fetched  answered  unquoted  absent  quoted  shards dropped');
  rows.forEach(function (r) {
    console.log((r.mb + ' MB').padStart(8) + String(r.sh).padStart(9) +
      String(r.ans).padStart(10) + String(r.unq).padStart(10) +
      String(r.abs).padStart(8) + String(r.q).padStart(8) +
      String(r.miss).padStart(15));
  });
  console.log('');
  var best = rows[rows.length - 1];
  var at90 = rows.filter(function (r) { return r.mb === 90; })[0];
  console.log('at the shipped 90 MB budget: ' + at90.ans + '/' + OUTLINE.length +
    ' headings answered, ' + at90.q + ' sentences.');
  console.log('with every shard allowed   : ' + best.ans + '/' + OUTLINE.length +
    ' headings answered, ' + best.q + ' sentences.');
  console.log('');
  console.log('The remaining ' + best.abs + ' absent headings are corpus holes, not');
  console.log('deployment gaps; the rest are thin entities or undeployed shards.');
});