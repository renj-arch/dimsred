'use strict';
// Run a real mains question through essay() and print what comes out.
//
//   node scripts/ask-question.js "examine the role of scientific temper"
//
// Used to check a question by hand rather than by guessing at the router. Reports
// how the question was routed, which shards were fetched, and every sentence the
// composer kept, so an under-served heading is visible as a fact rather than a
// hunch.
var fs = require('fs');
var path = require('path');
var ROOT = path.join(__dirname, '..');
var QB = 'data/ask-qb/';

var question = process.argv.slice(2).join(' ') ||
  'examine the role of scientific temper in addressing contemporary social and developmental challenges in india';

// A fetch over the real artefacts, so the indices are exercised rather than mocked.
var fetched = [];
global.fetch = function (url) {
  var full = path.join(ROOT, url);
  fetched.push(url);
  if (!fs.existsSync(full)) {
    return Promise.resolve({
      ok: false, status: 404,
      text: function () { return Promise.resolve(''); },
      json: function () { return Promise.reject(new Error('404')); }
    });
  }
  var body = fs.readFileSync(full, 'utf8');
  return Promise.resolve({
    ok: true, status: 200,
    text: function () { return Promise.resolve(body); },
    json: function () { return Promise.resolve(JSON.parse(body)); }
  });
};

var api = require(path.join(ROOT, 'scripts/lib/ask-browser.js'));
var qb = require(path.join(ROOT, 'scripts/lib/ask-qb.js'));
var ask = require(path.join(ROOT, 'scripts/lib/ask-core.js'));

var answerStub = {
  loadDir: function (dir, entities) {
    return { dir: dir, entityDir: new qb.EntityDir().load(entities) };
  },
  merge: function () { return { evidence: [], route: 'stub', missing: [] }; },
  route: function () { return { category: 'stub' }; }
};

console.log('Q: ' + question);
console.log('');
console.log('subject extracted: ' + JSON.stringify(ask.subjectOf(question)));
console.log('route:            ' + JSON.stringify(ask.routeFor ? ask.routeFor(question) : null));
console.log('');

// The heading is the subject the question is actually about, which is what a
// mains answer would be built around. If extraction returns nothing, the outline
// falls back to the whole question, which is worth seeing.
var subject = ask.subjectOf(question) || question;
var OUTLINE = [[subject, subject, [], {}]];

api.boot(answerStub, {}).then(function () {
  return api.loadBuckets();
}).then(function () {
  return api.mains(question, OUTLINE, {});
}).then(function (composed) {
  console.log('route: ' + composed.scheme + '   shards: ' + composed.fetchedShards +
    '   bytes: ' + (composed.shardBytes / 1048576).toFixed(1) + ' MB');
  console.log('');
  (composed.sections || []).forEach(function (s) {
    console.log('[' + String(s.status).toUpperCase() + '] ' + s.label);
    if (s.lines && s.lines.length) {
      s.lines.forEach(function (l) {
        console.log('   - "' + String(l.text).slice(0, 150) + '"');
        console.log('     [' + l.entity + ' | ' + (l.trust ? l.trust.state : '?') + ']');
      });
    }
    if (s.gaps && s.gaps.length) {
      s.gaps.forEach(function (g) { console.log('   ! ' + g.text); });
    }
  });
  console.log('');
  console.log('--- full text ---');
  return api.essay(question, OUTLINE, { perHeading: 6 });
}).then(function (doc) {
  console.log('counts: ' + JSON.stringify(doc.counts));
  console.log('escape: ' + doc.escapeBuckets + ' buckets, ' + doc.escapePool +
    ' candidates offered, ' + doc.escapeSentences + ' escape sentences');
  if (doc.escapeError) console.log('escape error: ' + doc.escapeError);
  console.log('');
  doc.paragraphs.forEach(function (p) {
    console.log('[' + String(p.status).toUpperCase() + '] ' + p.heading +
      (p.usedEscape ? '  (rescued)' : ''));
    (p.sentences || []).forEach(function (s) {
      console.log('   - [' + (s.escape ? 'escape' : 'entity') + '] ' +
        s.entity + ': "' + String(s.sentence).slice(0, 160) + '"');
    });
  });
  console.log('');
  console.log('shards fetched: ' + fetched.length);
}).catch(function (err) {
  console.log('ERROR: ' + (err && err.stack || err));
  process.exit(1);
});