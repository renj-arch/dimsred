// End-to-end exercise of browser.mains() with fetch stubbed.
//
//   node scripts/ask-mains-e2e.js <repo-root> [categoryIndex ...]
//
// Stubs only the network: the routing tables, the entity directory and the
// composer are the real ones, and the shards are the real built files. The stub
// answers 404 for every other shard so the adapter's "missing shard" path is
// taken as well, which is the state the site is actually in today.
'use strict';
var fs = require('fs');
var path = require('path');
var ROOT = process.argv[2] || path.join(__dirname, '..');
var WITH_META = process.argv.indexOf('--meta') !== -1;
// Shard ids are the bare numeric arguments; `--meta` must be filtered out, or it
// parses as NaN, allow{} ends up empty, and every shard 404s -- which looks like a
// retrieval failure rather than a bad invocation.
var allow = {};
var shardArgs = process.argv.slice(3).filter(function (a) { return /^\d+$/.test(a); });
(shardArgs.length ? shardArgs : ['79', '85']).forEach(function (a) { allow[+a] = 1; });

var QB = path.join(ROOT, 'data/ask-qb');
var manifest = JSON.parse(fs.readFileSync(path.join(QB, 'manifest.json'), 'utf8'));
var dir = JSON.parse(fs.readFileSync(path.join(QB, 'dir.json'), 'utf8'));
var concepts = JSON.parse(fs.readFileSync(path.join(QB, 'concepts.json'), 'utf8'));
var entities = fs.readFileSync(path.join(QB, 'entities.tsv'), 'utf8');
var fetched = [];
var notFound = [];

// The adapter reads the tables with r.text() and the shards with r.json(), so a
// stub has to satisfy both. get() wraps the whole call in fetch(url).then(...),
// so every branch returns a promise.
function okJson(v) {
  return Promise.resolve({
    ok: true, status: 200,
    json: function () { return Promise.resolve(v); },
    text: function () { return Promise.resolve(JSON.stringify(v)); }
  });
}
function okText(s) {
  return Promise.resolve({
    ok: true, status: 200,
    json: function () { return Promise.resolve(JSON.parse(s)); },
    text: function () { return Promise.resolve(s); }
  });
}

global.fetch = function (url) {
  var f = String(url);
  if (f.indexOf('manifest') >= 0) return okJson(manifest);
  if (f.indexOf('dir.json') >= 0) return okJson(dir);
  if (f.indexOf('entities.tsv') >= 0) return okText(entities);
  if (f.indexOf('concepts') >= 0) return okJson(concepts);
  var mt = f.match(/ask-qb\.(\d+)\.json/);
  if (mt) {
    var ci = +mt[1];
    if (!allow[ci]) { notFound.push(ci); return Promise.resolve({ ok: false, status: 404 }); }
    fetched.push(ci);
    return okJson(withMeta(JSON.parse(fs.readFileSync(path.join(QB, 'ask-qb.' + ci + '.json'), 'utf8'))));
  }
  return Promise.resolve({ ok: false, status: 404 });
};

var browser = require(path.join(ROOT, 'scripts/lib/ask-browser.js'));
var answer = require(path.join(ROOT, 'scripts/lib/ask-answer.js'));
var qb = require(path.join(ROOT, 'scripts/lib/ask-qb.js'));

// Provenance lives in the 4th shard element, which only a rebuilt shard carries.
// `--meta` fabricates it so the trust states can be exercised without an 838 MB
// rebuild; without it every line is correctly reported as unverified.
function withMeta(rows) {
  if (!WITH_META) return rows;
  return rows.map(function (r) {
    if (r.length > 3) return r;
    var meta = r[1].map(function (s, i) {
      return { source: i % 2 ? 'Archive' : 'Wiki', pubDate: '2026-0' + (i % 2 ? 6 : 3) + '-01' };
    });
    return [r[0], r[1], r[2], meta];
  });
}

var outline = [
  ['1. Island territories', 'Lakshadweep', []],
  ['2. Maritime frontier', 'India', []],
  ['3. Absent on purpose', 'SAGAR', []]
];

browser.boot(answer, qb).then(function () {
  return browser.mains('Question on the Indian Ocean region', outline, {});
}).then(function (c) {
  console.log('answered      ' + c.counts.answered + '/' + c.total);
  console.log('unquoted      ' + c.counts.unquoted);
  console.log('absent        ' + c.counts.absent);
  console.log('quoted        ' + c.quoted + ' sentence(s)');
  console.log('shards        ' + c.fetchedShards + ' fetched, ' + c.missingShards + ' skipped');
  console.log('provenance    ' + JSON.stringify(c.provenance));
  console.log('');
  c.sections.forEach(function (s) {
    var n = s.lines ? s.lines.length : 0;
    console.log('  [' + s.status + '] ' + s.label + '  (' + n + ' line(s))');
    (s.lines || []).slice(0, 2).forEach(function (l) {
      var t = l.trust || {};
      console.log('      ' + (t.state || '?') + ' | ' + (t.source || 'no source') +
        ' ' + String(t.pubDate || 'undated').slice(0, 10) + ' | ' + l.entity);
      console.log('      "' + l.text.slice(0, 96) + (l.text.length > 96 ? '...' : '') + '"');
    });
    (s.gaps || []).forEach(function (g) { console.log('      gap: ' + g.text.slice(0, 90)); });
  });
  console.log('');
  console.log('fetched shard ids: ' + JSON.stringify(fetched));
  console.log('404 shard ids    : ' + JSON.stringify(notFound));
  console.log('isArgument       : ' + c.isArgument);
}).catch(function (err) {
  console.log('ERROR ' + err.message);
  console.log(err.stack);
  process.exit(1);
});