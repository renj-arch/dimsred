/*
 * seed-figure-caches.js -- audit shipped figure picks and rebuild the auto-pick
 * caches that both figure builders depend on.
 *
 * WHY
 * ---
 * build-geography-figures.js caches auto-picks in data/geo-auto-figures.json and
 * build-subject-figures.js caches them in data/subject-figures-cache.json. Both
 * files document themselves as the thing that "keeps images stable between builds
 * AND can be hand-overridden". Neither file existed in the repo, so both packs had
 * been produced by one-off network runs and every rebuild would silently re-roll
 * all 123 unverified figures against Wikimedia. Worse, a rebuild reuses a cached
 * pick without re-checking that the image is even about the topic, so a bad pick
 * is permanent once made.
 *
 * This tool treats the committed pack HTML as the record of what was actually
 * chosen and reconstructs the caches from it. It also audits every shipped pick
 * against the current relevance rule (scripts/lib/figure-auto-score.js) so we can
 * see, before regenerating, which picks the rule would now reject.
 *
 * Usage:
 *   node scripts/seed-figure-caches.js --audit    report only, write nothing
 *   node scripts/seed-figure-caches.js            write both cache files
 *
 * Cache formats match the builders exactly:
 *   data/subject-figures-cache.json  { norm(topic): commonsFileName }  (subject packs)
 *   data/geo-auto-figures.json       { norm(topic): commonsFileName }  (geography auto only)
 */
'use strict';
var fs = require('fs');
var path = require('path');
var FAS = require('./lib/figure-auto-score.js');

var ROOT = path.join(__dirname, '..');
var SUBJECT_CACHE = path.join(ROOT, 'data', 'subject-figures-cache.json');
var GEO_CACHE = path.join(ROOT, 'data', 'geo-auto-figures.json');
var AUDIT_ONLY = process.argv.indexOf('--audit') >= 0;

// The same keyword sets the two builders score with. A cache hit bypasses
// autoScore() entirely in the builders (`if (cache[key] && await fileOK(...))`),
// so a pick the current engine would refuse can otherwise sit in the cache
// forever. This tool re-scores every shipped pick with the real rules.
var GEO_REJECT = /monument|museum|statue|memorial|selfie|portrait|headshot|palace|fort|flag|logo|emblem|coat of arms|coin|stamp|poster|postcard|painting|church|mosque|temple|bridg|rail|train|hotel|aircraft|shipping|\.pdf|\.djvu|\.ogg|\.ogv|\.webm|\.mid|_thumb/;
var SUBJECT_REJECT = GEO_REJECT;

function scoreLike(pack, title, topic) {
  var isGeo = /^geography-/.test(pack);
  return FAS.autoScore(title, topic, isGeo
    ? { hintRe: /map|locator|topograph|outline|projection/,
        hint2Re: /relief|physical|political|location|orthograph|globe|continent|terrain|satellite|aerial/,
        rejectRe: GEO_REJECT }
    : { hintRe: /map|locator|topograph|outline|projection|chart|diagram|structure|scheme|anatomy|schemat/,
        hint2Re: /relief|physical|political|location|orthograph|globe|continent|terrain|satellite|circuit|graph|flow|schematic/,
        rejectRe: SUBJECT_REJECT });
}

// Pickings confirmed wrong by eye, each identified by topic AND file, because
// the same topic legitimately has both a good and a bad published image:
// "Axis powers" is correctly served by "Axis Powers Zenith.png" in one pack and
// wrongly by "Powers chart.svg" in another. Keying on the topic alone would
// suppress the good pick too. These are withheld from the caches so a rebuild
// cannot reuse them. Anything else the relevance rule rejects is only FLAGGED,
// never dropped -- the rule reads file names, so it also rejects relevant images
// whose file name simply does not name the topic (e.g.
// "Yugoslav Wars map late 1993.png" is a fair illustration of the Croat-Bosniak
// War). Dropping those would throw away good figures.
var KNOWN_BAD = [
  {
    topic: 'long island',
    file: 'Easter Island map-fr.svg',
    reason: 'Easter Island map-fr.svg is a map of Rapa Nui, published under the heading "Long Island"'
  },
  {
    topic: 'axis powers',
    file: 'Powers chart.svg',
    reason: 'Powers chart.svg matched the topic only on the shared word "powers"'
  }
];

function knownBad(key, file) {
  for (var i = 0; i < KNOWN_BAD.length; i++) {
    if (norm(KNOWN_BAD[i].topic) === key && norm(KNOWN_BAD[i].file) === norm(file)) return KNOWN_BAD[i].reason;
  }
  return null;
}

// Picks the relevance rule rejects but that are correct anyway, with the evidence.
// Without this list they would be reported as "flagged for review" on every run and
// someone would eventually drop a good figure to quiet the warning.
var KNOWN_GOOD = [
  {
    topic: 'Croat–Bosniak War',
    file: 'Yugoslav Wars map late 1993.png',
    reason: 'Commons description: "Blue: Serb forces Light green: Bosniak forces Orange: Croatian forces". A correct map of exactly this war; the file name simply does not contain "croat" or "bosniak", which is the known false-positive mode of the name-based rule'
  }
];

function knownGood(key, file) {
  for (var i = 0; i < KNOWN_GOOD.length; i++) {
    if (norm(KNOWN_GOOD[i].topic) === key && norm(KNOWN_GOOD[i].file) === norm(file)) return KNOWN_GOOD[i].reason;
  }
  return null;
}

function norm(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

// The builders have used both U+2012 and U+2014 as the title separator, and the
// committed packs are not all from the same revision, so accept either.
var TITLE_RE = new RegExp('<div class="fig-title">([^<]*?)\\s*[\\u2012\\u2014]', 'g');
var IMG_RE = /<img src="https:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\/([^"?]+)\?width=/g;

var packs = fs.readdirSync(ROOT).filter(function (f) {
  return /-figures\.html$/.test(f) && f !== 'subject-figures-index.html';
}).sort();

var subjectCache = {};   // written to SUBJECT_CACHE
var geoCache = {};        // written to GEO_CACHE
var withheld = [];        // confirmed bad, excluded from the caches
var stale = [];           // engine would not pick these today; dropped so a rebuild re-resolves
var kept = [];            // documented false positive of the name-based rule, kept deliberately
var checked = 0;
var geoAuto = 0;

packs.forEach(function (file) {
  var isGeo = /^geography-/.test(file);
  var html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  var sections = html.split(/<section class="page">/i).slice(1);
  sections.forEach(function (sec) {
    var t = TITLE_RE.exec(sec);
    if (!t) return;
    TITLE_RE.lastIndex = 0;
    var im = IMG_RE.exec(sec);
    if (!im) return;
    IMG_RE.lastIndex = 0;
    var topic = t[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#\d+;/g, '').trim();
    var file1;
    try { file1 = decodeURIComponent(im[1]); } catch (e) { file1 = im[1]; }
    var isAuto = /class="auto-badge"/.test(sec);
    var key = norm(topic);

    // Only the geography builder has curated figures; everything without an
    // auto-badge there is hand-curated and belongs in no cache.
    if (!isGeo && !isAuto) return;
    if (isGeo && !isAuto) return;

    checked++;
    if (isGeo) geoAuto++;
    var into = isGeo ? geoCache : subjectCache;
    var sc = scoreLike(file, file1, topic);
    var bad = knownBad(key, file1);
    var good = knownGood(key, file1);

    if (bad) {
      withheld.push({ pack: file, topic: topic, file: file1, key: key, reason: bad });
      return;                                  // never seed a confirmed-bad pick
    }
    // A pick the current engine would not make. Kept only if it is a documented
    // false positive, otherwise dropped so the next rebuild re-resolves it.
    if (!sc.accepted) {
      if (good) {
        kept.push({ pack: file, topic: topic, file: file1, key: key, reason: good, score: sc.score });
      } else {
        stale.push({
          pack: file, topic: topic, file: file1, key: key, score: sc.score,
          reason: sc.rel.reason + ' | parts ' + JSON.stringify(sc.parts)
        });
        return;
      }
    }
    if (!into[key]) into[key] = file1;
  });
});

console.log('packs scanned            : ' + packs.length);
console.log('auto picks audited       : ' + checked + ' (geography ' + geoAuto + ', subject ' + (checked - geoAuto) + ')');
console.log('confirmed bad, withheld  : ' + withheld.length);
withheld.forEach(function (r) {
  console.log('   [' + r.pack + ']');
  console.log('      topic "' + r.topic + '"  ->  ' + r.file);
  console.log('      ' + r.reason);
});
console.log('stale, dropped for re-resolve: ' + stale.length);
stale.forEach(function (r) {
  console.log('   [' + r.pack + '] score=' + r.score);
  console.log('      topic "' + r.topic + '"  ->  ' + r.file);
  console.log('      ' + r.reason);
});
console.log('documented false positive, kept: ' + kept.length);
kept.forEach(function (r) {
  console.log('   [' + r.pack + '] score=' + r.score + '  "' + r.topic + '" -> ' + r.file);
  console.log('      ' + r.reason);
});
console.log('subject cache entries    : ' + Object.keys(subjectCache).length);
console.log('geography cache entries  : ' + Object.keys(geoCache).length);
Object.keys(geoCache).forEach(function (k) {
  console.log('      geo  "' + k + '"  ->  ' + geoCache[k]);
});

if (AUDIT_ONLY) {
  console.log('\n--audit: nothing written.');
  process.exit(0);
}
fs.writeFileSync(SUBJECT_CACHE, JSON.stringify(subjectCache, null, 2) + '\n');
fs.writeFileSync(GEO_CACHE, JSON.stringify(geoCache, null, 2) + '\n');
console.log('\nwrote ' + path.relative(ROOT, SUBJECT_CACHE));
console.log('wrote ' + path.relative(ROOT, GEO_CACHE));
