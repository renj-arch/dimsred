// Does the entity-bucket path answer a question ask-index.json refuses?
//
//   node scripts/ask-entity-fallback-e2e.js
//
// `Dadabhai Naoroji` is the worked example. ask-index.json drops its node because
// the timeline description is "Indian political leader" -- three words under a
// twelve-word floor -- so the index path refuses. But the name IS in
// entities.tsv (16 records) and the entity buckets hold 24 real sentences for it,
// built from the 8.7 GB question bank. The material exists; only one of the two
// retrieval paths can see it.
//
// This stubs fetch exactly as ask-mains-e2e.js does and drives the real browser
// adapter, so it tests the shipping code and not a copy of it.
'use strict';
var fs = require('fs');
var path = require('path');
var ROOT = path.join(__dirname, '..');
var QB = path.join(ROOT, 'data/ask-qb');

var manifest = JSON.parse(fs.readFileSync(path.join(QB, 'manifest.json'), 'utf8'));
var dir = JSON.parse(fs.readFileSync(path.join(QB, 'dir.json'), 'utf8'));
var concepts = JSON.parse(fs.readFileSync(path.join(QB, 'concepts.json'), 'utf8'));
var entities = fs.readFileSync(path.join(QB, 'entities.tsv'), 'utf8');

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

var fetchedBuckets = [];
global.fetch = function (url) {
  var f = String(url);
  if (f.indexOf('manifest') >= 0) return okJson(manifest);
  if (f.indexOf('dir.json') >= 0) return okJson(dir);
  if (f.indexOf('entities.tsv') >= 0) return okText(entities);
  if (f.indexOf('concepts') >= 0) return okJson(concepts);
  if (f.indexOf('bucket/buckets.json') >= 0) {
    return okJson(JSON.parse(fs.readFileSync(path.join(QB, 'bucket/buckets.json'), 'utf8')));
  }
  var bm = f.match(/bucket\/bucket\.(\d+)\.json/);
  if (bm) {
    var bp = path.join(QB, 'bucket/bucket.' + bm[1] + '.json');
    fetchedBuckets.push(+bm[1]);
    if (fs.existsSync(bp)) return okJson(JSON.parse(fs.readFileSync(bp, 'utf8')));
    return Promise.resolve({ ok: false, status: 404 });
  }
  return Promise.resolve({ ok: false, status: 404 });
};

var load = function (p) { return require(path.join(ROOT, p)); };
global.window = undefined;

var AskBrowser = load('scripts/lib/ask-browser.js');

function run(q, outline) {
  return AskBrowser.boot(AskBrowser.answer || null, {});
}

var SUBJECT = 'Dadabhai Naoroji';
var QUESTION = 'Who was Dadabhai Naoroji?';

AskBrowser.boot(load('scripts/lib/ask-answer.js'), {})
  .then(function () { return AskBrowser.loadBuckets(); })
  .then(function () {
    var outline = [[SUBJECT, SUBJECT, []]];
    return AskBrowser.mains(QUESTION, outline, {});
  })
  .then(function (composed) {
    console.log('Q: ' + QUESTION);
    console.log('buckets fetched: ' + JSON.stringify(fetchedBuckets));
    console.log('counts: ' + JSON.stringify(composed.counts));
    console.log('');
    (composed.sections || []).forEach(function (sec) {
      console.log('[' + String(sec.status).toUpperCase() + '] ' + sec.label);
      (sec.lines || []).slice(0, 6).forEach(function (l) {
        console.log('   - ' + String(l.sentence || l).slice(0, 120));
      });
    });
    var answered = (composed.counts && composed.counts.answered) || 0;
    console.log('');
    console.log(answered > 0
      ? 'RESULT: entity-bucket path answered a question the index path refuses.'
      : 'RESULT: entity-bucket path did NOT answer it.');
  })
  .catch(function (err) {
    console.error('FAILED: ' + (err && err.stack || err));
    process.exit(1);
  });