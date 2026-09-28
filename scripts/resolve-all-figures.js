/*
 * resolve-all-figures.js -- resolve a confident figure for every curated topic.
 *
 * Runs the structured-data resolver (scripts/lib/figure-resolve.js) over every
 * subject/topic in data/figure-topics-curated.json and writes the results to
 * data/figure-files-auto.json. Topics with no confident Commons figure are
 * recorded as gaps rather than filled with a guess.
 *
 * Designed to run in GitHub Actions (see .github/workflows/resolve-figures.yml)
 * because it is network-bound and takes several minutes, but it is safe to run
 * locally too. It only writes one file and never touches the generated HTML.
 *
 * Usage: node scripts/resolve-all-figures.js
 */
'use strict';

var fs = require('fs');
var path = require('path');
var R = require('./lib/figure-resolve.js');

var DATA = path.join(__dirname, '..', 'data');
var TOPICS_FILE = path.join(DATA, 'figure-topics-curated.json');
var OUT_FILE = path.join(DATA, 'figure-files-auto.json');
var DELAY_MS = parseInt(process.env.RESOLVE_DELAY_MS || '150', 10);

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

async function main() {
  var topics = JSON.parse(fs.readFileSync(TOPICS_FILE, 'utf8'));
  var results = {};
  var unresolved = [];
  var stats = { tier1: 0, tier2: 0, tier3: 0, total: 0 };

  var subjects = Object.keys(topics).filter(function (s) { return s.charAt(0) !== '_'; });
  console.log('Resolving figures for ' + subjects.length + ' subjects\n');

  for (var si = 0; si < subjects.length; si++) {
    var slug = subjects[si];
    results[slug] = {};
    var list = topics[slug];
    for (var ti = 0; ti < list.length; ti++) {
      var topic = String(list[ti]).trim();
      stats.total++;
      var r = null;
      try { r = await R.resolve(topic); } catch (e) { r = null; }
      if (r) {
        results[slug][topic] = { file: r.file, tier: r.tier, conf: r.conf, method: r.method };
        if (r.tier === 1) stats.tier1++;
        else if (r.tier === 2) stats.tier2++;
        else stats.tier3++;
      } else {
        unresolved.push(slug + ' :: ' + topic);
      }
      if (stats.total % 10 === 0) {
        console.log('  ' + stats.total + ' topics processed (' + stats.tier1 + ' high-confidence)...');
      }
      await sleep(DELAY_MS);
    }
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(results, null, 2));

  console.log('\n================ SUMMARY ================');
  console.log('topics processed        : ' + stats.total);
  console.log('high confidence (T1)    : ' + stats.tier1);
  console.log('medium confidence (T2)  : ' + stats.tier2);
  console.log('low confidence (T3)     : ' + stats.tier3);
  console.log('no figure found (gaps)  : ' + unresolved.length);
  console.log('\nWritten: ' + path.relative(process.cwd(), OUT_FILE));

  if (process.env.RESOLVE_REPORT) {
    fs.writeFileSync(process.env.RESOLVE_REPORT,
      'figure resolution report\n' +
      'topics: ' + stats.total + '\n' +
      'high confidence: ' + stats.tier1 + '\n' +
      'medium: ' + stats.tier2 + '\n' +
      'low: ' + stats.tier3 + '\n' +
      'gaps: ' + unresolved.length + '\n\n' +
      'GAPS:\n' + unresolved.map(function (u) { return '  ' + u; }).join('\n') + '\n');
    console.log('Report: ' + process.env.RESOLVE_REPORT);
  }
}

main().catch(function (e) { console.error(e); process.exit(1); });
