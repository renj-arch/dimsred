/*
 * import-figures.js -- import the site's curated figure packs as SOURCED facts.
 *
 * WHY
 * ---
 * The Mains layer needs evidence, and measurement showed the node graph cannot
 * supply it: all 1,786 typed edges are kin/succession, there are no causal
 * verbs, and only 39 `Article N` nodes exist corpus-wide. But the figure packs
 * on the same site already carry exactly the missing material in a form that
 * can be verified:
 *
 *   - a "Mark in exam" list of discrete, examinable facts per figure
 *   - a source with an explicit licence (Wikimedia Commons / NOAA / USGS,
 *     CC BY-SA, public domain)
 *   - a verification badge separating CURATED figures from AUTO-SUGGESTED ones
 *
 * The badge is load-bearing, not cosmetic. In the geography pack the
 * auto-suggested "Long Island" figure ships an Easter Island image, which is
 * exactly the failure the badge exists to catch. So this importer NEVER records
 * an auto-suggested figure as verified, and downstream consumers must check
 * `verified` before presenting a fact as examinable.
 *
 * Output: data/figure-facts.json
 *   [ { subject, scope, category, title, verified, auto, facts[], image,
 *       source, licence, url } ]
 *
 * Facts are stored verbatim. Nothing is paraphrased, merged or summarised,
 * because a rewrite is where a correct fact quietly becomes a wrong one.
 *
 * Usage: node scripts/import-figures.js [--out data/figure-facts.json]
 */
'use strict';
var fs = require('fs');
var path = require('path');

var INDEX = 'https://vlymbooq.qzz.io/subject-figures-index.html';
var OUT = argVal('--out', 'data/figure-facts.json');

function argVal(flag, dflt) {
  var i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}

function strip(s) {
  return String(s == null ? '' : s)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function get(url) {
  var res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(res.status + ' ' + res.statusText + ' for ' + url);
  return await res.text();
}

// One figure lives in one <section class="page">. Everything is read from that
// section only, so a fact can never drift onto the neighbouring figure.
function parseFigures(html) {
  var out = [];
  var sections = html.split(/<section class="page">/i).slice(1);
  sections.forEach(function (sec) {
    var num = /<div class="num">([\s\S]*?)<\/div>/i.exec(sec);
    var title = /<div class="fig-title">([\s\S]*?)<\/div>/i.exec(sec);
    if (!title) return;                       // the header section has no figure
    var img = /<img src="([^"]+)"/i.exec(sec);
    var src = /<div class="fig-src">([\s\S]*?)<\/div>/i.exec(sec);
    var auto = /class="auto-badge"/i.test(sec);

    var facts = [];
    var marks = /<div class="marks">([\s\S]*?)<\/div>\s*<div class="fig-src">/i.exec(sec)
             || /<ul>([\s\S]*?)<\/ul>/i.exec(sec);
    if (marks) {
      var li = /<li>([\s\S]*?)<\/li>/gi, m;
      while ((m = li.exec(marks[1])) !== null) {
        var f = strip(m[1]);
        if (f) facts.push(f);
      }
    }
    var sourceTxt = src ? strip(src[1]) : '';
    // "Source: Wikimedia Commons (Planemad) · CC BY-SA 3.0"
    var licence = '';
    var parts = sourceTxt.split('·');
    if (parts.length > 1) licence = strip(parts[parts.length - 1]);
    var source = strip(parts[0]).replace(/^Source:\s*/i, '');

    out.push({
      scopeCategory: num ? strip(num[1]) : '',
      title: strip(title[1]),
    // An auto-suggested figure is a SUGGESTION. It keeps its facts for review
    // but is permanently marked unverified, whatever it claims about itself.
    verified: !auto,
    auto: auto,
    grade: gradeOf(auto, facts, strip(title[1])),
      facts: facts,
      image: img ? img[1] : '',
      source: source,
      licence: licence,
      sourceLine: sourceTxt
    });
  });
  return out;
}

// Boilerplate that the auto-suggester emits for EVERY figure. It is an
// instruction to the reader, not a statement about the entity, so it must never
// be counted or displayed as a fact.
var TEMPLATE_FACT = new RegExp('^('
  + 'sketch\\s*/\\s*label|label\\s+(the\\s+)?(key\\s+)?parts|'
  + 'note its location|state (its )?co-ordinates|'
  + 'locate\\s*/\\s*label|co-ordinates, hemisphere|'
  + 'verify the image|hemicentre and climatic belt|'
  + 'as relevant to the subject|climatic belt)\\b', 'i');

/**
 * Content grade, which is stricter than the page's own badge.
 *
 *   curated      a human wrote these facts against a named source. Usable.
 *   auto-review  auto-suggested, but the facts are specific to the entity.
 *                Plausible, still unverified.
 *   template     auto-suggested AND the facts are generic boilerplate, so there
 *                is no real content here at all. Measured across the site, 21
 *                of 22 subject packs are entirely `template`: their "facts"
 *                are instructions like "sketch / label the key parts of this
 *                feature", and the entity match can be plainly wrong (a crime
 *                family filed under Courts Cases & Verdicts). Nothing graded
 *                `template` may be presented as a fact.
 */
function gradeOf(auto, facts, title) {
  if (!auto) return facts.length ? 'curated' : 'curated-empty';
  var real = facts.filter(function (f) { return !TEMPLATE_FACT.test(f); });
  if (!real.length) return 'template';
  if (/suggested figure$/i.test(title)) return 'auto-review';
  return 'auto-review';
}

async function main() {
  console.log('fetching index: ' + INDEX);
  var indexHtml = await get(INDEX);

  var urls = [];
  var re = /href="([^"]+)"/gi, m;
  while ((m = re.exec(indexHtml)) !== null) {
    var href = m[1];
    if (!/figure/i.test(href)) continue;
    if (/^https?:/i.test(href)) { urls.push(href); continue; }
    if (/subject-figures-index/i.test(href)) continue;
    urls.push('https://vlymbooq.qzz.io/' + href.replace(/^\//, ''));
  }
  urls = Array.from(new Set(urls)).sort();
  if (!urls.length) {
    console.error('no figure pages found on the index — the page structure may have changed');
    process.exit(2);
  }
  console.log('discovered ' + urls.length + ' subject figure pages');

  var all = [], bySubject = {};
  for (var i = 0; i < urls.length; i++) {
    var url = urls[i];
    var subject = url.replace(/^https?:\/\/[^/]+\//, '').replace(/[-/]?figures?\.?html?$/i, '').replace(/\/$/, '') || url;
    try {
      var html = await get(url);
      var figs = parseFigures(html);
      if (!figs.length) { console.log('  ' + pad(subject, 34) + 'no figures parsed'); continue; }
      figs.forEach(function (f) {
        f.subject = subject;
        f.pageUrl = url;
        all.push(f);
      });
      bySubject[subject] = figs.length;
      var ver = figs.filter(function (f) { return f.grade === 'curated'; }).length;
      var factCount = figs.reduce(function (n, f) { return n + f.facts.length; }, 0);
      var usable = figs.filter(function (f) { return f.grade === 'curated'; })
                       .reduce(function (n, f) { return n + f.facts.length; }, 0);
      console.log('  ' + pad(subject, 30) + pad(figs.length + ' figures', 11) +
                  pad(ver + ' curated', 12) + pad(factCount + ' facts', 11) +
                  usable + ' usable');
    } catch (err) {
      console.log('  ' + pad(subject, 34) + 'FAILED: ' + err.message);
    }
  }

  // Integrity checks. A figure with no facts cannot teach anything and a
  // verified figure with no source cannot be cited, so both are reported rather
  // than silently imported.
  var noFacts = all.filter(function (f) { return !f.facts.length; });
  var noSource = all.filter(function (f) { return f.verified && !f.source; });
  var noLicence = all.filter(function (f) { return f.verified && !f.licence; });

  var payload = {
    builtAt: new Date().toISOString(),
    index: INDEX,
    note: 'Facts are stored verbatim from the source pages. grade=curated is human-written ' +
          'against a named source and is the ONLY grade safe to present as an examinable fact. ' +
          'grade=auto-review is plausible but unverified. grade=template is auto-suggested ' +
          'boilerplate with no real content and must never be shown as a fact.',
    subjects: Object.keys(bySubject).length,
    figures: all.length,
    curated: all.filter(function (f) { return f.grade === 'curated'; }).length,
    autoReview: all.filter(function (f) { return f.grade === 'auto-review'; }).length,
    template: all.filter(function (f) { return f.grade === 'template'; }).length,
    verified: all.filter(function (f) { return f.verified; }).length,
    autoSuggested: all.filter(function (f) { return f.auto; }).length,
    // Facts that may be presented as examinable: curated only.
    usableFacts: all.filter(function (f) { return f.grade === 'curated'; })
                     .reduce(function (n, f) { return n + f.facts.length; }, 0),
    facts: all.reduce(function (n, f) { return n + f.facts.length; }, 0),
    data: all
  };
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 1), 'utf8');

  console.log('\n=== IMPORT SUMMARY ===');
  console.log('  subjects            : ' + payload.subjects);
  console.log('  figures             : ' + payload.figures);
  console.log('  grade=curated       : ' + payload.curated + '   <- the only grade usable as fact');
  console.log('  grade=auto-review   : ' + payload.autoReview + '   (plausible, unverified)');
  console.log('  grade=template      : ' + payload.template + '   (boilerplate, NO content)');
  console.log('  facts total         : ' + payload.facts);
  console.log('  facts USABLE        : ' + payload.usableFacts);
  console.log('  figures w/o facts   : ' + noFacts.length);
  console.log('  verified w/o source : ' + noSource.length);
  console.log('  verified w/o licence: ' + noLicence.length);
  console.log('\nWROTE ' + OUT);
}

function pad(s, n) { s = String(s); while (s.length < n) s += ' '; return s; }

main().catch(function (e) { console.error('FAILED: ' + e.stack); process.exit(1); });
