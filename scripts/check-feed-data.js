'use strict';
// Fail-closed CLI for the news and magazine snapshots.
//
//   node scripts/check-feed-data.js news
//   node scripts/check-feed-data.js magazine
//
// Used by the agents after a fetch (defence in depth) and by the data-contract
// tests. Exit 1 without printing a wall of JSON when a snapshot breaks.

var fs = require('fs');
var path = require('path');
var V = require('./lib/feed-validate');

var ROOT = path.resolve(__dirname, '..');
var kind = (process.argv[2] || 'news').toLowerCase();

var config = {
  news: { data: 'data/news.json', sources: 'data/news-sources.json', validate: V.validateNewsData },
  magazine: { data: 'data/magazine.json', sources: 'data/magazine-sources.json', validate: V.validateMagazineData }
}[kind];

if (!config) {
  console.error('Usage: node scripts/check-feed-data.js <news|magazine>');
  process.exit(2);
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

try {
  var data = readJson(config.data);
  var sources = fs.existsSync(path.join(ROOT, config.sources)) ? readJson(config.sources) : {};
  var problems = config.validate(data, sources, Date.now());
  if (problems.length) {
    console.error(kind + ': ' + problems.length + ' contract failure(s)');
    problems.slice(0, 25).forEach(function (p) { console.error('  - ' + p); });
    process.exit(1);
  }
  var stats = data.stats || {};
  console.log(kind + ': ok — ' + (stats.items || stats.stories || 0) + ' items, ' +
    (stats.photos || 0) + ' photos, generated ' + data.generatedAt);
} catch (error) {
  console.error(kind + ': could not validate — ' + (error && error.message));
  process.exit(1);
}
