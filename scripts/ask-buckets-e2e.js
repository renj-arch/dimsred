// End-to-end check of the bucket path, with the network stubbed.
//
//   node scripts/ask-buckets-e2e.js <repo-root>
//
// Serves the real bucket files and the real tables, and 404s every category
// shard. That is the point: if this passes while categories 404, the bucket path
// is genuinely independent of the old deployment rather than quietly falling
// back to it.
'use strict';
var fs = require('fs');
var path = require('path');
var ROOT = process.argv[2] || path.join(__dirname, '..');
var QB = path.join(ROOT, 'data', 'ask-qb');

var ents = fs.readFileSync(path.join(QB, 'entities.tsv'), 'utf8');
var served = [];
var catShardsServed = [];

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

global.fetch = function (u) {
  var f = String(u);
  if (f.indexOf('manifest') >= 0) return tj(fs.readFileSync(path.join(QB, 'manifest.json'), 'utf8'));
  if (f.indexOf('dir.json') >= 0) return tj(fs.readFileSync(path.join(QB, 'dir.json'), 'utf8'));
  if (f.indexOf('entities.tsv') >= 0) return tj(ents);
  if (f.indexOf('concepts') >= 0) return tj(fs.readFileSync(path.join(QB, 'concepts.json'), 'utf8'));
  if (f.indexOf('bucket/buckets.json') >= 0) {
    return tj(fs.readFileSync(path.join(QB, 'bucket', 'buckets.json'), 'utf8'));
  }
  var pm = /phrase\.(.+?)\.json$/.exec(f);
  if (pm) {
    // The phrase shards are served, unlike the category shards. They are the only
    // route to a term that is not an entity name ("water mass"), so 404ing them
    // here would hide exactly the gap this test exists to catch.
    var pf = path.join(QB, 'phrase', 'phrase.' + pm[1] + '.json');
    if (!fs.existsSync(pf)) return Promise.resolve({ ok: false, status: 404 });
    return tj(fs.readFileSync(pf, 'utf8'));
  }
  var bm = /bucket\.(.+?)\.json$/.exec(f);
  if (bm) {
    served.push(+bm[1]);
    return jj(JSON.parse(fs.readFileSync(path.join(QB, 'bucket', 'bucket.' + bm[1] + '.json'), 'utf8')));
  }
  var cm = /ask-qb\.(\d+)\.json$/.exec(f);
  if (cm) {
    // Category shards are deliberately NOT served. Serving them would let a bug in
    // the bucket path hide behind a successful category fallback.
    catShardsServed.push(+cm[1]);
    return Promise.resolve({ ok: false, status: 404 });
  }
  return Promise.resolve({ ok: false, status: 404 });
};

var browser = require(path.join(ROOT, 'scripts/lib/ask-browser.js'));
var answer = require(path.join(ROOT, 'scripts/lib/ask-answer.js'));
var qb = require(path.join(ROOT, 'scripts/lib/ask-qb.js'));

var BUCKETS = require(path.join(ROOT, 'scripts/lib/build-ask-qb-buckets-hash.js'));
var bm = JSON.parse(fs.readFileSync(path.join(QB, 'bucket', 'buckets.json'), 'utf8'));
var catBytes = 0;
Object.keys(bm.buckets).forEach(function (k) { catBytes += bm.buckets[k].bytes; });

var OUTLINE = [
  ['1. What a current is', 'ocean current', []],
  ['2. Climate', 'gulf stream', []],
  ['3. Aridity', 'canary current', []],
  ['4. Fisheries', 'upwelling', []],
  ['5. Water mass', 'antarctic bottom water', []],
  ['6. Reefs', 'coral reef', []],
  ['7. Conveyor', 'antarctic circumpolar current', []],
  ['8. Peru', 'humboldt current', []],
  ['9. El Nino', 'el nino', []],
  ['10. Water mass concept', 'water mass', []]
];

var fails = 0;
function ok(c, label, detail) {
  if (c) { console.log('  ok    ' + label); return; }
  fails++;
  console.log('  FAIL  ' + label + (detail ? '  -> ' + detail : ''));
}

browser.boot(answer, qb)
  .then(function () { return browser.loadBuckets(); })
  .then(function () {
    ok(browser.bucketReady(), 'bucket manifest loaded');
    return browser.mains('How do ocean currents and water masses differ?', OUTLINE, {});
  })
  .then(function (c) {
    console.log('');
    console.log('  scheme            ' + c.scheme);
    console.log('  answered          ' + c.counts.answered + '/' + c.total);
    console.log('  unquoted          ' + c.counts.unquoted);
    console.log('  absent            ' + c.counts.absent);
    console.log('  quoted            ' + c.quoted + ' sentence(s)');
    console.log('  buckets fetched   ' + c.fetchedShards);
    console.log('  bytes             ' + (c.shardBytes / 1048576).toFixed(1) + ' MB');
    console.log('');
    ok(c.scheme === 'buckets', 'the bucket path was used', c.scheme);
    ok(catShardsServed.length === 0,
      'no category shard was fetched', 'fetched ' + catShardsServed.join(','));
    ok(served.length === c.fetchedShards,
      'one request per reported bucket', served.length + ' vs ' + c.fetchedShards);
    // 10 entities, one per heading, so at most 10 distinct buckets.
    ok(served.length <= 10, 'at most one bucket per heading', String(served.length));
    // Measured against the page's own fetch budget, not a fixed byte count.
    //
    // This used to assert "< 40 MB", which was a proxy for "well under the 90 MB
    // budget" written when a bucket averaged 2.3 MB. Lifting the per-entity sentence
    // cap doubled the corpus the buckets hold (5.8M -> 10.6M sentences, 968 MB ->
    // 2.07 GB), so the same ten headings legitimately cost 41 MB. Hardcoding the old
    // number would have made the test fail for the corpus having grown rather than
    // for retrieval misbehaving, and loosening it to a bigger constant would keep
    // saying nothing. What the assertion is for is headroom under the real budget,
    // so it now names that budget and requires a margin.
    var PAGE_BUDGET = 90 * 1048576;
    ok(c.shardBytes < PAGE_BUDGET * 0.75,
      'transfer keeps a 25% margin under the 90 MB page budget',
      (c.shardBytes / 1048576).toFixed(1) + ' MB of ' + (PAGE_BUDGET / 1048576) + ' MB');
    ok(c.counts.answered > 0, 'at least one heading answered', String(c.counts.answered));
    // An absent heading proves the entity table has no row of that name. It does NOT
    // prove the corpus lacks the term: "Water mass concept" resolved to nothing here,
    // while the term itself appears verbatim in sentences belonging to entities like
    // "Antarctic bottom water". The old assertion checked for wording that made the
    // stronger and false claim.
    var absent = c.sections.filter(function (s) { return s.status === 'absent'; });
    ok(absent.every(function (s) { return /No entity named/.test(s.gaps[0].text); }),
      'every absent heading names the entity table');
    ok(absent.every(function (s) { return !/Not covered by this corpus/.test(s.gaps[0].text); }),
      'no absent heading claims the corpus lacks the term');
    console.log('');
    c.sections.forEach(function (s) {
      var n = s.lines ? s.lines.length : 0;
      console.log('    [' + s.status.toUpperCase() + '] ' + s.label + ' (' + n + ')');
      (s.lines || []).slice(0, 1).forEach(function (l) {
        console.log('        "' + l.text.slice(0, 92) + '"');
      });
      (s.gaps || []).forEach(function (g) { console.log('        -> ' + g.text.slice(0, 92)); });
    });
    console.log('');
    console.log(fails ? '=== ' + fails + ' FAILURE(S) ===' : '=== all checks passed ===');
    process.exit(fails ? 1 : 0);
  })
  .catch(function (err) {
    console.log('  FAIL  ' + err.message);
    console.log(err.stack);
    process.exit(1);
  });