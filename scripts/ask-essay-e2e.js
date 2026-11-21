// End-to-end test of essay() with phrase-index rescue, against real shards.
//
//   node scripts/ask-essay-e2e.js
//
// The unit tests in check-ask-prose.js prove the composer's rules. This proves the
// wiring: that phraseLookup resolves a term entity lookup cannot, that the extra
// buckets are fetched only for headings that need them, and that rescue evidence
// reaches the document.
//
// It runs against the real bucket and phrase files on disk with fetch stubbed from
// disk, so the indices are exercised rather than mocked.
'use strict';
var fs = require('fs');
var path = require('path');
var ROOT = path.join(__dirname, '..');
var QB = path.join(ROOT, 'data', 'ask-qb');

var H = require(path.join(ROOT, 'scripts/lib/build-ask-qb-buckets-hash.js'));
var qb = require(path.join(ROOT, 'scripts/lib/ask-qb.js'));
var PROSE = require(path.join(ROOT, 'scripts/lib/ask-prose.js'));

var pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? '  -- ' + detail : '')); }
}

// ── a browser-shaped fetch over the real artefacts ───────────────────────────

var fetched = [];
function fakeFetch(url) {
  var rel = url.replace(/^data\/ask-qb\//, 'data/ask-qb/').replace(/^\//, '');
  var full = path.join(ROOT, rel);
  fetched.push(rel);
  if (!fs.existsSync(full)) {
    return Promise.resolve({ ok: false, status: 404, text: function () { return Promise.resolve(''); },
      json: function () { return Promise.reject(new Error('404')); } });
  }
  var body = fs.readFileSync(full, 'utf8');
  return Promise.resolve({
    ok: true,
    status: 200,
    text: function () { return Promise.resolve(body); },
    json: function () { return Promise.resolve(JSON.parse(body)); }
  });
}

global.fetch = fakeFetch;

// A minimal answer stub: essay() only needs loadDir from the real engine.
var answerStub = {
  loadDir: function (dirJson, entitiesTsv) {
    return { dir: dirJson, entityDir: new qb.EntityDir().load(entitiesTsv) };
  },
  merge: function (lists, limit, per) { return { evidence: [], route: 'stub', missing: [] }; },
  route: function () { return { category: 'stub' }; }
};

var api = require(path.join(ROOT, 'scripts/lib/ask-browser.js'));

// ── outlines ─────────────────────────────────────────────────────────────────

// A domain a heading may draw escape evidence from. Narrow on purpose: the point of
// declaring one is to exclude material that merely shares vocabulary.
var INDIA = ['india', 'indian', 'bengal', 'bengali', 'bihar', 'bombay', 'punjab',
  'congress', 'gandhi', 'bharat', 'hind', 'muslim', 'bose', 'singh', 'ambedkar',
  'nehru', 'gokhale', 'tilak', 'jinnah', 'lal'];

var OUTLINE = [
  // Resolves to an entity, so retrieval serves it and no rescue should occur.
  ['Quit India', 'Quit India Movement', []],
  // Does not resolve to any entity. Rescue must find it.
  ['Revolutionary stream', 'Bhagat Singh', [], {
    rescue: ['bhagat singh', 'hindustan republican'],
    domains: INDIA.concat(['revolutionary', 'naujawan', 'soch'])
  }],
  // No rescue terms declared at all, so it stays unwritten.
  ['Peasant movement', 'peasant movement', [], { domains: INDIA }]
];

var QUESTION = 'Many voices strengthened and enriched the nationalist movement during the Gandhian phase.';

// ── run ──────────────────────────────────────────────────────────────────────

console.log('boot');
api.boot(answerStub, {}).then(function () {
  return api.loadBuckets();
}).then(function (bm) {
  console.log('  bucket manifest loaded: ' + (bm.buckets || []).length + ' shards');
  ok('buckets are available', api.bucketReady());

  console.log('');
  console.log('phraseLookup resolves a term entity lookup cannot');
  var ed = new qb.EntityDir().load(fs.readFileSync(path.join(QB, 'entities.tsv'), 'utf8'));
  ok('entity table has no row for "hindustan republican"', ed.lookup('hindustan republican') === null);
  return api.phraseLookup('hindustan republican').then(function (hit) {
    ok('phrase index resolves it', !!hit, 'got ' + JSON.stringify(hit));
    ok('hit names buckets', !!hit && hit.buckets.length > 0);
    ok('hit names owning entities', !!hit && hit.entities.length > 0);
    if (hit) {
      console.log('        df=' + hit.df + '  buckets=' + hit.buckets.length +
        '  e.g. ' + hit.entities.slice(0, 2).join(' | '));
    }

    console.log('');
    console.log('a term absent from the index returns null, not an error');
    return api.phraseLookup('zzzqqx nonexistent gibberish phrase').then(function (miss) {
      ok('missing phrase returns null', miss === null);

      console.log('');
      console.log('essay() with rescue');
      fetched = [];
      return api.essay(QUESTION, OUTLINE, { perHeading: 4, escapeMaxBuckets: 12 })
        .then(function (doc) {
          ok('essay() resolves', !!doc);
          ok('document states no model was used', /No model was used/.test(doc.method));
          ok('document is not marked as an argument', doc.isArgument === false);

          var byName = {};
          doc.paragraphs.forEach(function (p) { byName[p.heading] = p; });

          console.log('');
          console.log('  headings: ' + JSON.stringify(doc.counts));
          console.log('  escape buckets ' + doc.escapeBuckets + '  bytes ' +
            (doc.escapeBytes / 1048576).toFixed(1) + ' MB  escape sentences offered ' +
            doc.escapeSentences);
          console.log('');

          doc.paragraphs.forEach(function (p) {
            console.log('   [' + p.status.toUpperCase() + '] ' + p.heading +
              '   usedEscape=' + !!p.usedEscape +
              '   offDomainRefused=' + p.rejectedDomain +
              '   sentences=' + (p.sentences ? p.sentences.length : 0));
            (p.sentences || []).slice(0, 2).forEach(function (s) {
              console.log('       [' + (s.escape ? 'escape' : 'entity') + '] ' +
                s.entity + ': ' + s.sentence.slice(0, 78));
            });
          });
          console.log('');

          ok('the entity-resolved heading is written',
            byName['Quit India'].status === 'written');
          ok('the entity-resolved heading did not use escape',
            !byName['Quit India'].usedEscape);

          ok('the rescued heading is written',
            byName['Revolutionary stream'].status === 'written',
            'status=' + byName['Revolutionary stream'].status);
          ok('the rescued heading reports escape was used',
            byName['Revolutionary stream'].usedEscape === true);
          ok('escape fetched at least one extra bucket', doc.escapeBuckets > 0);
          ok('at least one phrase-index shard was fetched',
            fetched.some(function (f) { return /phrase\/phrase\./.test(f); }));

          ok('a heading with no rescue terms stays unwritten',
            byName['Peasant movement'].status !== 'written',
            'status=' + byName['Peasant movement'].status);

          // The whole point of domain gating: a rescue sentence must not come from
          // a foreign entity just because it shares vocabulary.
          var allEntities = [];
          doc.paragraphs.forEach(function (p) {
            (p.sentences || []).forEach(function (s) { allEntities.push(s.entity || ''); });
          });
          ok('no sentence is attributed to an entity with no name',
            allEntities.every(function (e) { return e.length > 0; }));

          console.log('');
          console.log('escape disabled falls back to entity-only');
          return api.essay(QUESTION, OUTLINE, { escape: false }).then(function (doc2) {
            ok('escape disabled fetches no extra buckets', doc2.escapeBuckets === 0);
            ok('escape disabled offers no escape sentences', doc2.escapeSentences === 0);
            var rev = doc2.paragraphs.filter(function (p) {
              return p.heading === 'Revolutionary stream';
            })[0];
            ok('escape disabled leaves the heading unwritten', rev.status !== 'written',
              'status=' + rev.status);
          });
        });
    });
  });
}).catch(function (err) {
  console.log('  FAIL  essay run threw: ' + (err && err.stack || err));
  fail++;
}).then(function () {
  console.log('');
  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
});