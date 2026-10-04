/*
 * build-figure-pages.js -- turn harvested candidates into published, paginated
 * figure pages.
 *
 * Run: node scripts/build-figure-pages.js
 *
 * Harvest is deliberately sloppy (figure-bulk.js) because a wrong candidate
 * costs one API call. This stage is where correctness is enforced, because a
 * wrong candidate that reaches a page costs a wrong figure on a study site.
 *
 * Every candidate must clear all of the following to be published:
 *   - it is an image file, and not a flag/logo/icon/locator map
 *   - its name shares a distinctive word with the topic
 *   - respectsScope(): it does not name a country other than the topic's
 *   - plausibleFigureType(): it is not a photograph of people unless the topic
 *     is about people
 *   - it has not already been published for an earlier topic
 *
 * The last rule is the reason volume and quality can coexist. Commons files are
 * shared across categories, so the same Taj Mahal photo arrives for a dozen
 * topics; publishing it a dozen times is how a site ends up with 10,000
 * figures of which 6,000 are duplicates. One file is published once, on the page
 * of the topic that claimed it first, so the count is distinct images.
 *
 * Output is paginated because a single page with 10,000 hotlinked images is
 * multi-megabyte and will not render in a browser.
 */
'use strict';
var fs = require('fs');
var path = require('path');
var FR = require('./lib/figure-resolve.js');
var BULK = require('./lib/figure-bulk.js');

var ROOT = path.join(__dirname, '..');
var CAND = path.join(ROOT, 'data', 'figure-candidates.json');
var PUBLISHED = path.join(ROOT, 'data', 'figure-published.json');
var OUTDIR = path.join(ROOT, 'figures');

var PER_TOPIC = parseInt(process.env.PUBLISH_PER_TOPIC || '12', 10);
var PER_PAGE = parseInt(process.env.PUBLISH_PER_PAGE || '200', 10);
var TOTAL_CAP = parseInt(process.env.PUBLISH_TOTAL_CAP || '0', 10); // 0 = no cap

// Distinctive-word test, matching the seed test in figure-bulk so a file that
// could not have been reached through a relevant seed is not published either.
function sharesTopicWord(file, topic) {
  var stop = { of: 1, in: 1, and: 1, the: 1, a: 1, an: 1, for: 1, to: 1, by: 1, on: 1 };
  function toks(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ')
      .split(/\s+/).filter(function (w) { return w.length > 2 && !stop[w]; })
      .map(function (w) { return w.replace(/(ies)$/, 'y').replace(/(es|s)$/, ''); });
  }
  var f = toks(file), t = toks(topic);
  if (!t.length) return false;
  for (var i = 0; i < t.length; i++) {
    for (var j = 0; j < f.length; j++) {
      if (f[j] === t[i]
        || (f[j].length > 4 && t[i].length > 4 && (f[j].indexOf(t[i]) === 0 || t[i].indexOf(f[j]) === 0))) return true;
    }
  }
  return false;
}

// Cross-topic duplicate key. Commons titles differ only in case, spacing,
// extension case and punctuation, so all of those are normalised away --
// otherwise "Taj Mahal (1).jpg" and "Taj_Mahal_(1).JPG" both get published.
function dupKey(file) {
  return String(file).toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .replace(/(png|jpe?g|svg|gif|webp)$/, '');
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function thumbUrl(file) {
  return 'https://commons.wikimedia.org/wiki/Special:FilePath/'
    + encodeURIComponent(file) + '?width=640';
}

function readJson(p, fallback) {
  if (!fs.existsSync(p)) return fallback;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fallback; }
}

// A country-scoped topic needs country-scoped provenance. Matching a broad
// global category to a country-scoped topic is the one thing the harvest cannot
// rescue: after every other guard, "india major cattle breeds" still produced
// "Cattles Grazing 6" and "Glamorgan Cattle", and "dairy farming in India"
// produced "Dairy cows, Rotorua, New Zealand". Those files really are in a
// category that matched the topic, and no filename rule can tell.
//
// The seed a file was reached through is therefore checked too. "Kalagarh Tiger
// Reserve" says nothing about India but came via "Tiger reserves of India", so
// it is kept; "Glamorgan Cattle" came via "Cattle breeds", which names no
// country, so it is refused. The cost is that genuinely Indian files sitting in
// a global category are lost as well -- which is the intended trade, because the
// alternative is publishing photographs that cannot be shown to be Indian.
function provenanceOk(topic, file, fileSeed) {
  if (!/\b(india|indian|bharat)\b/i.test(topic)) return true;
  return /\b(india|indian|bharat)\b/i.test(String(file))
    || /\b(india|indian|bharat)\b/i.test(String(fileSeed || ''));
}

function main() {
  var cand = readJson(CAND, {});
  var topics = Object.keys(cand);
  if (!topics.length) {
    console.log('no candidates: run node scripts/lib/figure-bulk.js first');
    process.exit(1);
  }

  // Already-published files stay published. Without this, a topic whose
  // candidates were harvested later would reshuffle every other topic's pages
  // and the site would churn on every run.
  var state = readJson(PUBLISHED, { files: {}, order: [] });
  var claimed = {};
  (state.order || []).forEach(function (k) { claimed[k] = 1; });

  var added = 0, rejected = { dup: 0, scope: 0, people: 0, words: 0, format: 0, prov: 0 };
  var newOrder = (state.order || []).slice();

  topics.forEach(function (topic) {
    var entry = cand[topic];
    if (!entry || !entry.files) return;
    var fileSeed = entry.fileSeed || {};
    var taken = 0;
    entry.files.forEach(function (file) {
      if (taken >= PER_TOPIC) return;
      if (TOTAL_CAP && newOrder.length >= TOTAL_CAP) return;
      if (!BULK.acceptable(file)) { rejected.format++; return; }
      if (!sharesTopicWord(file, topic)) { rejected.words++; return; }
      if (!provenanceOk(topic, file, fileSeed[file])) { rejected.prov++; return; }
      if (!FR.respectsScope({ file: file }, topic)) { rejected.scope++; return; }
      if (!FR.plausibleFigureType({ file: file }, topic)) { rejected.people++; return; }
      var k = dupKey(file);
      if (claimed[k]) { rejected.dup++; return; }
      claimed[k] = 1;
      state.files[k] = { file: file, topic: topic };
      newOrder.push(k);
      taken++; added++;
    });
  });

  state.order = newOrder;
  fs.writeFileSync(PUBLISHED, JSON.stringify(state, null, 1));

  // ---- paginate ----
  if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });
  var pages = [];
  for (var i = 0; i < newOrder.length; i += PER_PAGE) pages.push(newOrder.slice(i, i + PER_PAGE));

  var css = 'body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0f1115;color:#e8eaed;margin:0;padding:24px}'
    + '.wrap{max-width:1400px;margin:0 auto}h1{font-size:24px;margin:0 0 4px}'
    + '.meta{color:#9aa0a6;font-size:13px;margin-bottom:20px}'
    + '.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px}'
    + '.card{background:#1a1d23;border:1px solid #2a2e37;border-radius:10px;overflow:hidden;display:flex;flex-direction:column}'
    + '.card img{width:100%;height:150px;object-fit:contain;background:#0b0d10;display:block}'
    + '.cap{padding:8px 10px;font-size:12px;line-height:1.35;color:#c8ccd2;word-break:break-word}'
    + '.topic{color:#8ab4f8;font-size:11px;margin-top:5px;display:block;text-decoration:none}'
    + '.nav{margin:22px 0;display:flex;gap:10px;flex-wrap:wrap}a{color:#8ab4f8}';

  pages.forEach(function (keys, pi) {
    var cards = keys.map(function (k) {
      var e = state.files[k];
      return '<figure class="card">'
        + '<a href="https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(e.file) + '">'
        + '<img loading="lazy" src="' + esc(thumbUrl(e.file)) + '" alt="' + esc(e.file) + '"></a>'
        + '<figcaption class="cap">' + esc(e.file.replace(/\.[a-z]+$/i, '').replace(/_/g, ' '))
        + '<a class="topic" href="index.html#' + encodeURIComponent(e.topic.replace(/\W+/g, '-')) + '">'
        + esc(e.topic) + '</a></figcaption></figure>';
    }).join('\n');

    var nav = '<div class="nav">';
    if (pi > 0) nav += '<a href="page-' + String(pi).padStart(3, '0') + '.html">&#8592; previous</a>';
    nav += '<a href="index.html">index</a>';
    if (pi < pages.length - 1) nav += '<a href="page-' + String(pi + 2).padStart(3, '0') + '.html">next &#8594;</a>';
    nav += '</div>';

    var html = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">'
      + '<meta name="viewport" content="width=device-width,initial-scale=1">'
      + '<title>UPSC Figures page ' + (pi + 1) + '</title><style>' + css + '</style></head><body><div class="wrap">'
      + '<h1>UPSC Figures &#8212; page ' + (pi + 1) + ' of ' + pages.length + '</h1>'
      + '<p class="meta">' + keys.length + ' figures &#183; distinct images from Wikimedia Commons &#183; filtered for topic relevance and country</p>'
      + '<div class="grid">' + cards + '</div>' + nav + '</div></body></html>';

    fs.writeFileSync(path.join(OUTDIR, 'page-' + String(pi + 1).padStart(3, '0') + '.html'), html);
  });

  // ---- index ----
  var byTopic = {};
  newOrder.forEach(function (k) {
    var t = state.files[k].topic;
    byTopic[t] = (byTopic[t] || 0) + 1;
  });
  var topicList = Object.keys(byTopic).sort(function (a, b) { return byTopic[b] - byTopic[a]; });
  var idx = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>UPSC Figures Index</title><style>' + css + '</style></head><body><div class="wrap">'
    + '<h1>UPSC Figures Index</h1>'
    + '<p class="meta">' + newOrder.length + ' distinct figures across ' + pages.length
    + ' pages &#183; ' + topicList.length + ' topics &#183; from Wikimedia Commons</p>'
    + '<div class="nav">';
  pages.forEach(function (_, pi) {
    idx += '<a href="page-' + String(pi + 1).padStart(3, '0') + '.html">page ' + (pi + 1) + '</a> ';
  });
  idx += '</div><h2 style="font-size:16px;margin:24px 0 10px">Topics</h2><div class="grid">';
  topicList.forEach(function (t) {
    idx += '<div class="card" id="' + esc(t.replace(/\W+/g, '-')) + '"><div class="cap">'
      + '<b>' + esc(t) + '</b><br>' + byTopic[t] + ' figures</div></div>';
  });
  idx += '</div></div></body></html>';
  fs.writeFileSync(path.join(OUTDIR, 'index.html'), idx);

  console.log('published ' + newOrder.length + ' distinct figures'
    + ' (' + added + ' new this run) across ' + pages.length + ' pages of ' + PER_PAGE);
  console.log('topics with figures: ' + topicList.length);
  console.log('rejected: ' + JSON.stringify(rejected));
  console.log('written: figures/index.html, figures/page-001.html ...');
}

if (require.main === module) main();
module.exports = { sharesTopicWord: sharesTopicWord, dupKey: dupKey };