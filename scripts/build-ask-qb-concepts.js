'use strict';
// Build the concept -> category table used to route conceptual questions.
//
// Category names cannot route a conceptual question. A question about the Sixth
// Schedule matches the category `Constitution` on the word "constitution", but
// not one of the nineteen sentences that actually mention the Sixth Schedule
// lives there: they are spread across `Indian States`, `Indian Society`,
// `Ancient India` and others, filed under autonomous district councils and
// tribal areas. No amount of hint tuning finds that, because the signal is not
// in the category name at all.
//
// So this measures it. For each concept in ask-core's CONCEPT_ROUTES, it counts
// the sentences in each shard that contain the concept's vocabulary, and records
// the categories holding real evidence. The output is a few KB, built once, and
// it makes conceptual routing a lookup over measured data rather than a guess.
//
// The vocabulary is filtered by measured rarity, and that step is the whole
// point. A concept route is written with both the phrases that evidence the
// concept and the ones that signal strain, and many of those are ordinary words:
// the urbanisation route lists "town" and "city", and the anti-defection route
// lists "party", "majority" and "floor". Matching is by token prefix, so "city"
// also matches "civics". Used as-is these produce a table in which World
// Geography holds 11,986 sentences of "federalism" evidence, which is worse than
// no table at all. A phrase that appears in more than a fraction of a percent of
// all sentences cannot identify a category, so it is dropped and the rest are
// re-scored against it.

var fs = require('fs');
var path = require('path');
var qb = require('./lib/ask-qb.js');
var ask = require('./lib/ask-core.js');

var ROOT = path.join(__dirname, '..');
var QBDIR = path.join(ROOT, 'data', 'ask-qb');
var OUT = path.join(QBDIR, 'concepts.json');

// A phrase matching more than this share of all sentences carries no routing
// information. Measured over 5.7M sentences, 0.5% is about 28,500, which keeps
// "reorganisation" and "linguistic" and discards "city", "party" and "floor".
var MAX_PHRASE_DF_SHARE = 0.005;
// A concept keeps a category if at least this many of its sentences land there.
var MIN_SENTENCES = 2;
var MAX_CATS = 6;
// Half-saturation point for a phrase's contribution. At this many hits a phrase
// is worth half of its maximum, so the first few real mentions count and the
// thousandth incidental one counts almost nothing.
var HALF = 3;

function phrasesOf(cfg) {
  var out = [];
  var seen = {};
  [].concat(cfg.fit || [], cfg.strain || []).forEach(function (p) {
    var n = qb.norm(p);
    if (n.length < 4 || seen[n]) return;
    seen[n] = 1;
    out.push({ raw: n, toks: qb.tokens(p) });
  });
  return out;
}

function main() {
  var man = JSON.parse(fs.readFileSync(path.join(QBDIR, 'manifest.json'), 'utf8'));
  var routes = ask.conceptRoutes;
  var keys = Object.keys(routes);
  var phrases = {};
  keys.forEach(function (k) { phrases[k] = phrasesOf(routes[k]); });

  // phraseDf[concept][phraseIndex] is the number of sentences corpus-wide that
  // contain the phrase; catCount[concept][catIndex][phraseIndex] is how many of
  // those land in that category. Keeping the per-phrase breakdown is what makes
  // the rarity filter possible in a single pass: once the bad phrases are known,
  // the surviving counts can be re-summed without re-reading the shards.
  var phraseDf = {};
  var catCount = {};
  keys.forEach(function (k) {
    phraseDf[k] = new Array(phrases[k].length).fill(0);
    catCount[k] = man.categories.map(function () { return new Array(phrases[k].length).fill(0); });
  });

  var totalSentences = 0;
  man.categories.forEach(function (c, ci) {
    var rows = JSON.parse(fs.readFileSync(path.join(ROOT, c.file), 'utf8'));
    rows.forEach(function (row) {
      var sents = row[1] || [];
      for (var j = 0; j < sents.length; j++) {
        totalSentences++;
        var st = qb.tokens(sents[j]);
        for (var kk = 0; kk < keys.length; kk++) {
          var ps = phrases[keys[kk]];
          for (var p = 0; p < ps.length; p++) {
            if (qb.hasPhrase(st, ps[p].toks)) {
              phraseDf[keys[kk]][p]++;
              catCount[keys[kk]][ci][p]++;
            }
          }
        }
      }
    });
  });

  var maxDf = Math.round(totalSentences * MAX_PHRASE_DF_SHARE);
  var shardSentences = man.categories.map(function (c) { return c.sentences || 1; });
  var out = {
    builtAt: new Date().toISOString(),
    totalSentences: totalSentences,
    maxPhraseDf: maxDf,
    minSentences: MIN_SENTENCES,
    concepts: {}
  };

  keys.forEach(function (k) {
    var keep = [];
    for (var p = 0; p < phrases[k].length; p++) {
      if (phraseDf[k][p] > 0 && phraseDf[k][p] <= maxDf) keep.push(p);
    }
    // Specificity weighting. A category is scored by how much the RARE phrases
    // contribute, not by how many of the concept's words it happens to contain.
    //
    // Ranking on raw sentence counts put `Constitution` first for the Sixth
    // Schedule, and ranking on rates then put tiny shards like `Geography`
    // (3 sentences) and `Society` (3) above `Indian States`, which holds the
    // actual provision. Both metrics are dominated by incidental mentions: a
    // sentence saying "scheduled tribes" in a politics shard is not evidence
    // about the Sixth Schedule, but it counts the same as the sentence that
    // says the Sixth Schedule provides for autonomous district councils.
    //
    // Weighting each phrase by log(total / df) alone is not enough either,
    // because the score is still a raw count and the biggest shards simply win:
    // for the Sixth Schedule, World Geography contributed 3,014 incidental
    // "scheduled tribes" hits and outscored the handful of genuine "sixth
    // schedule" sentences, so the question was routed to World Geography and
    // answered with nothing about the provision.
    //
    // So the count is normalised by shard size before it is weighted. The rate
    // asks "how much of this category is about the concept", the idf asks "how
    // specific is the phrase", and MIN_SENTENCES stops a three-sentence shard
    // from winning on concentration alone.
    //
    // Rate on its own is still wrong, because it over-rewards small shards. For
    // the Sixth Schedule the provision is not concentrated anywhere: the genuine
    // sentences sit in `Indian States` (52k sentences, a few dozen of them
    // mention the Sixth Schedule), so a rate ranks the small shards above the
    // only category that actually holds the provision. Raw counts have the
    // opposite bias.
    //
    // So each phrase contributes on a saturating curve, hit / (hit + HALF), which
    // makes a few dozen real hits worth nearly as much as a few hundred while a
    // category cannot win on volume. The idf is what breaks the tie: "sixth
    // schedule" is worth far more than the "scheduled tribes" that every
    // politics sentence mentions, so the category that carries the specific
    // phrase wins instead of the one that carries the common one.
    var idf = {};
    keep.forEach(function (p) {
      idf[p] = Math.log(1 + totalSentences / (1 + phraseDf[k][p]));
    });

    var byCat = [];
    for (var ci2 = 0; ci2 < man.categories.length; ci2++) {
      var n = 0;
      var score = 0;
      for (var q = 0; q < keep.length; q++) {
        var hit = catCount[k][ci2][keep[q]];
        if (!hit) continue;
        n += hit;
        score += idf[keep[q]] * (hit / (hit + HALF));
      }
      if (n < MIN_SENTENCES) continue;
      byCat.push({ i: ci2, n: n, score: score, rate: n / (shardSentences[ci2] || 1) });
    }
    byCat.sort(function (a, b) { return b.score - a.score; });
    out.concepts[k] = {
      phrases: keep.map(function (p) { return phrases[k][p].raw; }),
      categories: byCat.slice(0, MAX_CATS).map(function (e) {
        return { i: e.i, n: e.n, score: Math.round(e.score) };
      })
    };
  });

  fs.writeFileSync(OUT, JSON.stringify(out));
  process.stderr.write('wrote ' + path.relative(ROOT, OUT) + ' (' +
    (fs.statSync(OUT).size / 1024).toFixed(1) + ' KB)  sentences=' + totalSentences.toLocaleString() +
    '  maxPhraseDf=' + maxDf.toLocaleString() + '\n');
  keys.forEach(function (k) {
    var e = out.concepts[k];
    process.stderr.write('  ' + k.padEnd(26) + '[' + e.phrases.join(',') + '] ->\n      ' +
      (e.categories.length ? e.categories.map(function (c) { return man.categories[c.i].name + '(' + c.n + ',s=' + c.score + ')'; }).join('  ') : 'NO EVIDENCE') + '\n');
  });
}

main();
