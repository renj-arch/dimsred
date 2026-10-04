#!/usr/bin/env node
/*
 * Figure coverage audit.
 *
 * Answers the only question that matters when asking whether the corpus is
 * complete: which topics have no figures, and why.
 *
 * Without this, a topic that was never attempted is indistinguishable from a
 * topic whose seeds found nothing, which is indistinguishable from a topic
 * whose every candidate was rejected. All three look like "no figures" from the
 * outside, and they need three different responses -- crawl it, fix the seeds,
 * or accept that no suitable image exists and move on. Guessing which is which
 * is how a pipeline either stalls at 0.03% coverage or spends its whole API
 * budget re-crawling topics that were always going to come back empty.
 *
 *   published       topic has figures
 *   capped          has figures and is at the per-topic cap
 *   no-candidates   categories were walked but produced no acceptable file
 *   no-seeds        no Commons category matched the topic at all
 *   all-rejected    candidates existed and every one failed a quality guard
 *   not-attempted   in the corpus, never crawled
 *
 * Writes data/figure-coverage.json and prints a summary. No network calls: it
 * reads only what the harvester and publisher already recorded, so it is safe
 * and instant to run on every build.
 */

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var CANDIDATES = path.join(ROOT, 'data', 'figure-candidates.json');
var PUBLISHED = path.join(ROOT, 'data', 'figure-published.json');
var CURATED = path.join(ROOT, 'data', 'figure-topics-curated.json');
var TOPICS_TXT = path.join(ROOT, 'topics.txt');
var OUT = path.join(ROOT, 'data', 'figure-coverage.json');

function readJson(p, fallback) {
  if (!fs.existsSync(p)) return fallback;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fallback; }
}

var cand = readJson(CANDIDATES, {});
var pub = readJson(PUBLISHED, {});
var curated = readJson(CURATED, {});

// ---- curated topics the bulk harvester knows about ----
var bulkTopics = [];
Object.keys(curated).forEach(function (k) {
  if (k === '_comment' || k === '_entities') return;
  var v = curated[k];
  if (Array.isArray(v)) bulkTopics = bulkTopics.concat(v);
  else if (typeof v === 'string') bulkTopics.push(v);
});

// ---- figures actually published, per topic ----
var figures = {};
var files = pub.files || {};
(pub.order || []).forEach(function (k) {
  var t = files[k] && files[k].topic;
  if (t) figures[t] = (figures[t] || 0) + 1;
});

var stats = pub.topicStats || {};
var PER_TOPIC = parseInt(process.env.PUBLISH_PER_TOPIC || '60', 10);
var REFRESH_MS = Math.max(0, parseInt(process.env.BULK_REFRESH_HOURS || '24', 10)) * 3600e3;

function classify(topic) {
  var n = figures[topic] || 0;
  if (n >= PER_TOPIC) return { state: 'capped', figures: n };
  if (n > 0) return { state: 'published', figures: n };

  var c = cand[topic];
  if (!c) return { state: 'not-attempted', figures: 0 };

  var st = stats[topic] || {};
  var r = st.rejected || {};
  var rejected = ['format', 'words', 'prov', 'scope', 'people', 'dup']
    .reduce(function (a, k) { return a + (r[k] || 0); }, 0);

  if (!(c.files || []).length) {
    // "No matching category" and "not looked at properly yet" are different
    // findings and must not be reported as one. A topic whose last walk predates
    // the current seed rules, or has no walk timestamp at all, is pending
    // refresh rather than empty -- and the two look identical from the file,
    // which is exactly how "monsoon mechanism india" came to be reported as
    // having no category when a single re-walk under the current rules finds 61
    // candidates in one.
    var walkedAt = c.at || 0;
    var staleBy = !walkedAt || (Date.now() - walkedAt) >= REFRESH_MS;
    if (!(c.cats || 0)) {
      return { state: staleBy ? 'pending-refresh' : 'no-seeds', figures: 0, cats: 0, at: walkedAt };
    }
    return { state: staleBy ? 'pending-refresh' : 'no-candidates', figures: 0, cats: c.cats, at: walkedAt };
  }
  if (rejected > 0) {
    return { state: 'all-rejected', figures: 0, candidates: c.files.length, rejected: r };
  }
  return { state: 'no-candidates', figures: 0, cats: c.cats, candidates: c.files.length };
}

// ---- the wider corpus ----
var corpus = [];
if (fs.existsSync(TOPICS_TXT)) {
  var seen = {};
  fs.readFileSync(TOPICS_TXT, 'utf8').split(/\r?\n/).forEach(function (l) {
    var t = l.trim();
    // Single characters and punctuation-only lines are corpus noise, not topics.
    if (t.length < 4) return;
    var k = t.toLowerCase();
    if (seen[k]) return;
    seen[k] = 1;
    corpus.push(t);
  });
}

var bulkSet = {};
bulkTopics.forEach(function (t) { bulkSet[t.toLowerCase()] = 1; });

var bulkReport = bulkTopics.map(function (t) {
  var c = classify(t);
  return {
    topic: t,
    state: c.state,
    figures: c.figures,
    candidates: (cand[t] && cand[t].files || []).length,
    cats: (cand[t] && cand[t].cats) || 0,
    seeds: (cand[t] && cand[t].seeds || []).length,
    rejected: c.rejected || null,
  };
});

var tally = {};
bulkReport.forEach(function (r) { tally[r.state] = (tally[r.state] || 0) + 1; });

// Corpus topics the bulk harvester has never been pointed at. Normalised
// comparison, because the corpus title-cases while the curated list does not.
var attempted = {};
bulkReport.forEach(function (r) { attempted[r.topic.toLowerCase()] = 1; });
Object.keys(figures).forEach(function (t) { attempted[t.toLowerCase()] = 1; });

var untouched = corpus.filter(function (t) { return !attempted[t.toLowerCase()]; });

var report = {
  generated: new Date().toISOString(),
  perTopicCap: PER_TOPIC,
  totals: {
    corpusTopics: corpus.length,
    bulkTopics: bulkTopics.length,
    publishedTopics: Object.keys(figures).length,
    totalFigures: (pub.order || []).length,
    untouchedCorpusTopics: untouched.length,
    coveragePctOfCorpus: corpus.length
      ? +(100 * Object.keys(figures).length / corpus.length).toFixed(4) : 0,
  },
  states: tally,
  bulk: bulkReport,
  untouchedSample: untouched.slice(0, 200),
};

fs.writeFileSync(OUT, JSON.stringify(report, null, 1));

// ---- report ----
var t = report.totals;
console.log('figure coverage audit');
console.log('  corpus topics (topics.txt)   : ' + t.corpusTopics.toLocaleString('en-US'));
console.log('  bulk topics configured      : ' + t.bulkTopics);
console.log('  topics with figures         : ' + t.publishedTopics);
console.log('  figures published           : ' + t.totalFigures.toLocaleString('en-US'));
console.log('  corpus never attempted      : ' + t.untouchedCorpusTopics.toLocaleString('en-US'));
console.log('  coverage of corpus          : ' + t.coveragePctOfCorpus + '%');
console.log('');
console.log('  bulk topics by state:');
Object.keys(tally).sort(function (a, b) { return tally[b] - tally[a]; })
  .forEach(function (s) { console.log('    ' + tally[s] + '  ' + s); });
console.log('');
var gaps = bulkReport.filter(function (r) { return r.state !== 'published' && r.state !== 'capped'; });
if (gaps.length) {
  console.log('  topics with no figures:');
  gaps.forEach(function (r) {
    var why = r.state === 'no-seeds' ? 'no matching Commons category'
      : r.state === 'pending-refresh' ? 'last walk predates current seed rules'
        : r.state === 'no-candidates' ? ('walked ' + r.cats + ' categories, no usable file')
          : r.state === 'all-rejected' ? (r.candidates + ' candidates, all rejected')
            : 'never crawled';
    console.log('    ' + r.state.padEnd(16) + ' ' + r.topic.slice(0, 44).padEnd(46) + why);
  });
}
console.log('');
console.log('  written: data/figure-coverage.json');