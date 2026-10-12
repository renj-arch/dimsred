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

// One slug function for the id, the href and the filename. These were previously
// built with an inline `replace(/\W+/g, '-')` in three places, which is how they
// drifted apart. It also left leading and trailing hyphens on topics that start or
// end with punctuation, and it left case intact, so "India major cattle breeds"
// and "india major cattle breeds" would have produced two different files for the
// same topic.
function topicSlug(topic) {
  return String(topic).toLowerCase().replace(/\W+/g, '-').replace(/^-+|-+$/g, '');
}

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
// Whether a country-scoped topic also demands country-scoped PROVENANCE.
//
// Measured both ways on the 43,565-file candidate pool, and requiring provenance
// is the wrong trade, so it is off by default:
//
//   with provenance    751 figures, 72 topics
//   without            3,629 figures, ~100 topics
//
// The 2,878 difference was not junk. Provenance refused any file whose category
// path failed to name the country, and that silently emptied topics whose seeds
// are named after programmes and places rather than after India:
// "Integration of GSAT-6A Satellite", "Bharatanatyam dance perforamance",
// "Illustration of a typical nuclear fission reaction" and 60 Panchayat
// photographs were all discarded. Meanwhile the 21 genuinely wrong files it was
// written to catch are already caught by FR.respectsScope, which refuses a file
// only when it names a DIFFERENT country.
//
// So conflict detection does the work and evidence-requirement stays available
// behind a flag for anyone who wants the stricter, emptier corpus.
var REQUIRE_PROVENANCE = !!process.env.FIGURE_REQUIRE_PROVENANCE;

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

  // Per-topic accounting, so the coverage audit can say WHY a topic has no
  // figures instead of only that it has none. A topic that was never attempted,
  // one whose seeds found nothing, one that harvested files but had every one of
  // them rejected, and one that is simply full all look identical from the
  // outside, and they call for four different decisions.
  var REASONS = ['dup', 'scope', 'people', 'words', 'format', 'prov'];
  var stats = state.topicStats || {};

  topics.forEach(function (topic) {
    var entry = cand[topic];
    if (!entry || !entry.files) return;
    var fileSeed = entry.fileSeed || {};
    var taken = 0;

    // A topic's figures are counted across every run, not just this one, so the
    // audit reports the corpus as it stands rather than the latest delta.
    var st = stats[topic] || (stats[topic] = { candidates: 0, added: 0, rejected: {} });
    REASONS.forEach(function (r) { if (st.rejected[r] === undefined) st.rejected[r] = 0; });
    st.candidates += entry.files.length;

    entry.files.forEach(function (file) {
      // The per-topic cap counts figures added by this run, so a saturated topic
      // is not re-examined forever and the cap stays meaningful across reruns.
      if (taken >= PER_TOPIC) return;
      if (TOTAL_CAP && newOrder.length >= TOTAL_CAP) return;
      if (!BULK.acceptable(file)) { rejected.format++; st.rejected.format++; return; }
      if (!sharesTopicWord(file, topic)) { rejected.words++; st.rejected.words++; return; }
      if (REQUIRE_PROVENANCE && !provenanceOk(topic, file, fileSeed[file])) { rejected.prov++; st.rejected.prov++; return; }
      if (!FR.respectsScope({ file: file }, topic)) { rejected.scope++; st.rejected.scope++; return; }
      if (!FR.plausibleFigureType({ file: file }, topic)) { rejected.people++; st.rejected.people++; return; }
      var k = dupKey(file);
      if (claimed[k]) { rejected.dup++; st.rejected.dup++; return; }
      claimed[k] = 1;
      state.files[k] = { file: file, topic: topic };
      newOrder.push(k);
      taken++; added++; st.added++;
    });
  });

  state.topicStats = stats;
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
      + '.tcard{text-decoration:none;color:inherit;display:flex}'
      + '.tcard:hover{border-color:#3f6ea8;background:#1e232b}'
      + '.nav{margin:22px 0;display:flex;gap:10px;flex-wrap:wrap}a{color:#8ab4f8}';

  pages.forEach(function (keys, pi) {
    var cards = keys.map(function (k) {
      var e = state.files[k];
      return '<figure class="card">'
        + '<a href="https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(e.file) + '">'
        + '<img loading="lazy" src="' + esc(thumbUrl(e.file)) + '" alt="' + esc(e.file) + '"></a>'
        + '<figcaption class="cap">' + esc(e.file.replace(/\.[a-z]+$/i, '').replace(/_/g, ' '))
        + '<a class="topic" href="topic-' + topicSlug(e.topic) + '.html">'
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

  // ---- prune pages that no longer exist ----
  // The index only ever links the pages just written, so any page-*.html left
  // over from a run that produced MORE pages is unreachable but still sitting
  // in the directory being deployed. That is how a listing ends up with stale
  // duplicates: the count in the header says 50 while page-051.html is still
  // being served and shows figures that were since re-topiced or removed.
  //
  // CI checks out a clean tree each run, which hides this, but any local rebuild
  // keeps them, and a run that publishes fewer figures than the last one would
  // leave them behind permanently. So the page count is made to match the index
  // exactly, every run.
  // Keys must be zero-padded to match the filename capture. The regex yields
  // "001", so an unpadded "1" key matches nothing and the prune deletes every
  // page including the ones just written.
  var kept = {};
  pages.forEach(function (_, pi) { kept[String(pi + 1).padStart(3, '0')] = 1; });
  var pruned = [];
  fs.readdirSync(OUTDIR).forEach(function (f) {
    var m = f.match(/^page-(\d+)\.html$/);
    if (!m) return;
    if (kept[m[1]]) return;
    fs.unlinkSync(path.join(OUTDIR, f));
    pruned.push(f);
  });
  if (pruned.length) {
    console.log('pruned stale pages: ' + pruned.join(', '));
  }

  // ---- one page per topic ----
  // The index listed 121 topics as plain <div class="card"> with an id and a
  // count, and no href anywhere. A topic could not be opened at all: the only way
  // to see its figures was to page through the whole listing hunting for them,
  // and the per-figure topic link pointed at index.html#<slug>, which scrolled to
  // a card showing a number rather than to anything you could look at.
  //
  // Each topic now gets its own page holding all of its figures, and both the
  // index card and every per-figure topic link point at it.
  var byTopicKeys = {};
  newOrder.forEach(function (k) {
    var t = state.files[k].topic;
    (byTopicKeys[t] = byTopicKeys[t] || []).push(k);
  });

  // Two topics that slug identically would silently overwrite each other's page
  // and leave one of them unopenable, so refuse rather than publish a partial map.
  var slugOwner = {};
  var slugClash = [];
  Object.keys(byTopicKeys).forEach(function (t) {
    var s = topicSlug(t);
    if (slugOwner[s] && slugOwner[s] !== t) slugClash.push(s + ' <- ' + slugOwner[s] + ' | ' + t);
    slugOwner[s] = t;
  });
  if (slugClash.length) {
    throw new Error('topic slugs collide, refusing to publish: ' + slugClash.join('; '));
  }

  var topicPages = Object.keys(byTopicKeys).sort(function (a, b) {
    return byTopicKeys[b].length - byTopicKeys[a].length;
  });

  topicPages.forEach(function (t) {
    var keys = byTopicKeys[t];
    var cards = keys.map(function (k) {
      var e = state.files[k];
      return '<figure class="card">'
        + '<a href="https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(e.file) + '">'
        + '<img loading="lazy" src="' + esc(thumbUrl(e.file)) + '" alt="' + esc(e.file) + '"></a>'
        + '<figcaption class="cap">' + esc(e.file.replace(/\.[a-z]+$/i, '').replace(/_/g, ' ')) + '</figcaption></figure>';
    }).join('\n');

    var html = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">'
      + '<meta name="viewport" content="width=device-width,initial-scale=1">'
      + '<title>' + esc(t) + ' figures</title><style>' + css + '</style></head><body><div class="wrap">'
      + '<h1>' + esc(t) + '</h1>'
      + '<p class="meta">' + keys.length.toLocaleString('en-US') + ' figures &#183; distinct images from Wikimedia Commons</p>'
      + '<div class="nav"><a href="index.html">&#8592; all topics</a></div>'
      + '<div class="grid">' + cards + '</div></div></body></html>';

    fs.writeFileSync(path.join(OUTDIR, 'topic-' + topicSlug(t) + '.html'), html);
  });

  // Same reasoning as the page-*.html prune above, applied to topic pages: a
  // topic that loses all its figures would otherwise leave a file behind that the
  // index no longer links.
  var keptTopics = {};
  topicPages.forEach(function (t) { keptTopics[topicSlug(t)] = 1; });
  var prunedTopics = [];
  fs.readdirSync(OUTDIR).forEach(function (f) {
    var m = f.match(/^topic-(.+)\.html$/);
    if (!m) return;
    if (keptTopics[m[1]]) return;
    fs.unlinkSync(path.join(OUTDIR, f));
    prunedTopics.push(f);
  });
  if (prunedTopics.length) {
    console.log('pruned stale topic pages: ' + prunedTopics.join(', '));
  }

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
    + '<p class="meta">' + newOrder.length.toLocaleString('en-US') + ' distinct figures across ' + pages.length
    + ' pages &#183; ' + topicList.length + ' topics &#183; from Wikimedia Commons</p>'
    + '<div class="nav">';
  pages.forEach(function (_, pi) {
    idx += '<a href="page-' + String(pi + 1).padStart(3, '0') + '.html">page ' + (pi + 1) + '</a> ';
  });
  idx += '</div><h2 style="font-size:16px;margin:24px 0 10px">Topics</h2><div class="grid">';
  topicList.forEach(function (t) {
    idx += '<a class="card tcard" id="' + topicSlug(t) + '" href="topic-' + topicSlug(t) + '.html">'
      + '<div class="cap"><b>' + esc(t) + '</b><br>' + byTopic[t].toLocaleString('en-US') + ' figures</div></a>';
  });
  // The curated per-subject packs live at the repo root as <subject>-figures.html
  // and are built by scripts/build-subject-figures.js, a different pipeline from
  // this one. Nothing linked to them: all 23 were reachable only by typing a URL,
  // and the nav had no tab for figures at all, so the entire figure surface of
  // the site was unreachable by navigation.
  //
  // The directory is scanned rather than hardcoded so a pack added or removed by
  // the other workflow appears or disappears here without anyone editing this
  // file. Paths are relative with a "../" prefix because this index is written
  // into figures/ while the packs sit beside it.
  // Two shapes to match: the packs themselves, "<subject>-figures.html", and
  // their hub, "subject-figures-index.html". Filtering on "-figures.html" alone
  // silently dropped the hub and left the 22nd pack unreachable from this page.
  var PACK_RE = /-figures(-index)?\.html$/;
  var packs = [];
  try {
    packs = fs.readdirSync(ROOT).filter(function (f) { return PACK_RE.test(f); }).sort();
  } catch (e) { packs = []; }

  if (packs.length) {
    idx += '<h2 style="font-size:16px;margin:28px 0 10px">Curated packs</h2>'
      + '<p class="meta" style="margin-bottom:12px">One hand-picked figure per topic, '
      + 'built by a separate pipeline. Links go up one level, out of <code>figures/</code>.</p><div class="grid">';
    packs.forEach(function (f) {
      var label = f.replace(/-figures\.html$/, '').replace(/-/g, ' ');
      idx += '<div class="card"><div class="cap"><a href="../' + encodeURIComponent(f) + '">'
        + esc(label) + '</a><br><span style="color:#9aa0a6">curated pack</span></div></div>';
    });
    idx += '</div>';
  }

  idx += '</div></body></html>';
  fs.writeFileSync(path.join(OUTDIR, 'index.html'), idx);

  console.log('published ' + newOrder.length + ' distinct figures'
    + ' (' + added + ' new this run) across ' + pages.length + ' pages of ' + PER_PAGE);
  console.log('topics with figures: ' + topicList.length);
  console.log('curated packs linked: ' + packs.length);
  console.log('rejected: ' + JSON.stringify(rejected));
  console.log('written: figures/index.html, figures/page-001.html ...');
}

if (require.main === module) main();
module.exports = { sharesTopicWord: sharesTopicWord, dupKey: dupKey };