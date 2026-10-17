/*
 * figure-bulk.js -- harvest candidate figures for a topic by walking the
 * Commons category tree, instead of picking one best file per topic.
 *
 * Run: node scripts/lib/figure-bulk.js
 *
 * WHY THIS EXISTS
 * The single-best resolver answers "one good figure for this topic", which
 * caps the entire site at roughly one figure per topic -- about 126 subject
 * figures plus geography. Reaching thousands means asking a different
 * question: not "the best file" but "every file plausibly about this topic",
 * then filtering hard and publishing only what survives.
 *
 * WHERE THE VOLUME ACTUALLY IS
 * Not in the top-level category. "Category:Wildlife of India" holds 1 file
 * and about 40 subcategories; the files are in the subcategories. So the walk
 * has to recurse, and breadth has to be bounded per topic or one broad topic
 * ("Culture of India", 548 files at the top) consumes the entire budget.
 *
 * The walk is the slowest part of the whole pipeline by a wide margin: it is
 * API-rate-bound, not CPU-bound, and a naive fan-out gets the runner
 * rate-limited within seconds. Everything here therefore shares figure-resolve
 * module's jget, which already handles 429 and Retry-After, and the walk keeps
 * a global call budget so a run always terminates with a partial, resumable
 * result instead of dying with nothing written.
 *
 * Candidates land in data/figure-candidates.json, deliberately separate from
 * data/subject-figures-cache.json. That cache is one file per topic and is
 * what the live packs render from; a candidate pool with hundreds of files per
 * topic has no business in it.
 */
'use strict';
var fs = require('fs');
var path = require('path');
var FR = require('./figure-resolve.js');

var CAPI = 'https://commons.wikimedia.org/w/api.php';
var OUT = path.join(__dirname, '..', '..', 'data', 'figure-candidates.json');

// 500 is the API maximum for categorymembers. Paging with cmcontinue is what
// turns a 50-file category into a 5,000-file one.
var SEED_MAX = parseInt(process.env.BULK_SEED_MAX || '8', 10);
var CM_PAGE = parseInt(process.env.BULK_CM_PAGE || '500', 10);
var DEPTH = parseInt(process.env.BULK_DEPTH || '2', 10);
var MAX_CATS = parseInt(process.env.BULK_MAX_CATS || '40', 10);
var DELAY_MS = parseInt(process.env.BULK_DELAY_MS || '260', 10);
// Seeds per topic. The walk is capped separately by MAX_CATS, so this bounds
// the search phase only.
// A seed below this relevance score is not walked at all. Tunable because a

var callBudget = { left: parseInt(process.env.BULK_MAX_CALLS || '900', 10) };
var calls = 0;

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

// A candidate must be an image Commons will actually serve, must not be one of
// the things that dominate a category walk without illustrating anything, and
// must not be a photograph of a building.
//
// Flags, coats of arms, logos and bare locator maps are numerous, technically
// relevant to their category, and useless to a student. Institutional
// photography is the same failure in a different costume: "rocket propulsion"
// seeded on propulsion-related categories and returned photographs of the Jet
// Propulsion Laboratory's buildings, because those files genuinely sit in
// propulsion categories. A study site wants the test-stand diagram, not the
// facility. Matched on the filename because that is all a candidate has before
// it is worth an API call to describe.
var REJECT_NAME = /(^|\W)(map|maps|flag|flags|coat of arms|logo|logos|icon|icons|laborator(y|ies)|facilit(y|ies)|building|buildings|hangar|headquarters|aerial view|office|offices|campus|facade|rooftop|parking)\b/i;

function acceptable(file) {
  var f = String(file || '');
  if (!f) return false;
  if (!/\.(svg|png|jpe?g|gif|webp)$/i.test(f)) return false;
  if (REJECT_NAME.test(f)) return false;
  return true;
}

// One page of category members. Returns files and subcategory names, and
// follows cmcontinue so a caller can drain a whole category.
async function categoryPage(cat, cont) {
  if (callBudget.left <= 0) return null;
  callBudget.left--; calls++;
  var url = CAPI + '?action=query&list=categorymembers&cmtype=file|subcat'
    + '&cmlimit=' + CM_PAGE + '&format=json'
    + '&cmtitle=' + encodeURIComponent('Category:' + cat)
    + (cont ? '&cmcontinue=' + encodeURIComponent(cont) : '');
  var j = await FR.apiGet(url);
  var list = (j && j.query && j.query.categorymembers) || [];
  var files = [], subs = [];
  list.forEach(function (m) {
    if (m.ns === 14) subs.push(String(m.title).replace(/^Category:/, ''));
    else if (m.ns === 6) files.push(String(m.title).replace(/^File:/, ''));
  });
  await sleep(DELAY_MS);
  return { files: files, subs: subs, cont: (j && j.query && j.query.continue && j.query.continue.cmcontinue) || null };
}

// Depth-first over subcategories, breadth-capped by `caps`. Returns every file
// seen. `caps` is decremented per category so a single sprawling branch cannot
// eat the whole topic's allowance.
async function walk(cat, depth, caps, seenCat, out, topic, catPath) {
  if (depth < 0 || caps.left <= 0) return;
  var key = cat.toLowerCase();
  if (seenCat[key]) return;
  seenCat[key] = 1;
  caps.left--;

  var cont = null;
  do {
    var page = await categoryPage(cat, cont);
    if (!page) return;
    page.files.forEach(function (f) { if (acceptable(f)) out.files[f] = catPath; });
    out.cats++;
    cont = page.cont;
    if (callBudget.left <= 0) return;
  } while (cont);

if (depth === 0) return;
  // Subcategory order from the API is alphabetical, which is arbitrary. The
  // walk is capped anyway, so accept that breadth is decided by category name
  // rather than pretending it is chosen for relevance.
  //
  // Every subcategory is held to the same test as a seed. Without this the
  // filter only guarded the top of the tree and the walk walked straight into
  // the wrong subject one level down: "Cattle breeds" is a legitimate seed for
  // "india major cattle breeds", and its subcategory "Cattle breeds
  // originating in Cuba" matched nothing and was walked anyway, which is how
  // photographs of Cuban cattle ended up published under an Indian heading.
  // The country guard could not catch them, because a photograph of Cuban
  // cattle is not in Cuba.
  for (var i = 0; i < page.subs.length && caps.left > 0 && callBudget.left > 0; i++) {
    if (!seedMatchesTopic(page.subs[i], topic)) continue;
    await walk(page.subs[i], depth - 1, caps, seenCat, out, topic, catPath + ' / ' + page.subs[i]);
  }
}

// Seed categories for a topic.
//
// P373 (the Commons category on the Wikidata entity) is the accurate route but
// it returns nothing for these topics: names like "india major cattle breeds"
// are syllabus phrasings, not Wikipedia article titles, so no Wikidata entity
// matches and there is no P373 to read. Measured: 0 of 4 smoke-test topics.
//
// So the seeds come from searching the Category namespace, which works but is
// noisy in a way that matters: "mangrove forests india" returns "Category:
// Mangroves Park Pappinisseri" and a Queensland mangrove species, and "monsoon
// mechanism india" returns "Category:Jinkx Monsoon" and "Category:Gorilla
// Monsoon (band)". Walking those wastes the entire category budget on the wrong
// subject, so seeds are scored for topic relevance and anything that fails is
// dropped before the walk starts. Filtering seeds is far cheaper than filtering
// several hundred files harvested from a bad seed.
async function searchCategories(query) {
  if (callBudget.left <= 0) return [];
  callBudget.left--; calls++;
  var url = CAPI + '?action=query&list=search&srnamespace=14&srlimit=12&format=json'
    + '&srsearch=' + encodeURIComponent(query);
  var j = await FR.apiGet(url);
  await sleep(DELAY_MS);
  return ((j && j.query && j.query.search) || [])
    .map(function (s) { return String(s.title).replace(/^Category:/, ''); });
}

// Generic category words: legitimate topic words, far too broad to seed a walk
// on their own. Each one was a measured seed before this list existed.
// "Cattle breeds" really does hold cattle from every country, and "White" holds
// every white thing; seeding on them produced Bali and Amsterdam Island cattle
// under an Indian heading, and 1,409 video-game screenshots under white
// revolution.
var GENERIC_SEED = {white:1,black:1,red:1,blue:1,green:1,yellow:1,brown:1,
  cattle:1,breed:1,milk:1,production:1,revolution:1,national:1,ancient:1,
  modern:1,forest:1,art:1,music:1,dance:1,film:1,food:1,sport:1,game:1,
  industry:1,society:1,culture:1,economy:1,education:1,history:1,science:1,
  technology:1,politics:1,sports:1,bird:1,fish:1,tree:1,flower:1,fruit:1,
  agriculture:1,trade:1,commerce:1,finance:1,banking:1};

// A seed must share TWO distinctive topic words with the topic.
//
// Every failure measured so far came from seeds, not from files, and every one
// of them was a seed that matched too little:
//
//   "India major cattle breeds"  -> "Cattle breeds originating in Cuba", "Bali
//                                   Cattle", "Amsterdam Island Cattle". The
//                                   files were genuine cattle photographs from
//                                   the wrong country, so the file-level country
//                                   guard could not help: it reads the country
//                                   out of the filename, and a photograph of
//                                   Cuban cattle is not in Cuba.
//   "white revolution India milk production" -> "Betty White", "White
//                                   supremacists", then "Dance Dance Revolution",
//                                   which harvested a whole video-game category.
//   The same topics also seeded on the bare words "White", "Milk", "Production",
//   "Cattle" -- each a single generic word that is an enormous category.
//
// An earlier version allowed a one-word seed when it equalled a topic word, on
// the theory that "Monsoon" is the most valuable seed in the monsoon set. That
// is true and it is also exactly the hole that admits "White" and "Milk", and
// the measured harvest from "White" was 1,409 candidates of video games versus
// 50 once the rule tightened. So one word is never enough: two is the minimum.
//
// Seed names are additionally held to the same country guard as files, which is
// what removes the Cuba branch.
function seedMatchesTopic(cat, topic) {
  var stop = { of: 1, in: 1, and: 1, the: 1, a: 1, an: 1, for: 1, to: 1, by: 1, on: 1 };
  function toks(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ')
      .split(/\s+/).filter(function (w) { return w.length > 2 && !stop[w]; })
      .map(function (w) { return w.replace(/(ies)$/, 'y').replace(/(es|s)$/, ''); });
  }
  var catT = toks(cat), topicT = toks(topic);
  if (!topicT.length) return false;

  var matched = 0, singleHit = '';
  for (var i = 0; i < topicT.length; i++) {
    var t = topicT[i];
    for (var j = 0; j < catT.length; j++) {
      var c = catT[j];
      if (c === t || (c.length > 4 && t.length > 4 && (c.indexOf(t) === 0 || t.indexOf(c) === 0))) { matched++; if (!singleHit) singleHit = t; break; }
    }
  }
  // Two matching topic words is the normal case.
  //
  // The single-word clause exists for one measured topic: "Monsoon" is the most
  // valuable seed for "monsoon mechanism india" and matches only one topic
  // word, so requiring two left that topic with nothing. It is allowed only when
  // the seed is the single word and that word is long and not generic.
  //
  // GENERIC_SEED is what stops this clause reopening the hole that two words
  // closed. "White", "Milk", "Production", "Cattle" and "Revolution" are all
  // real topic words and all enormous categories; seeding on them harvested
  // 1,409 video-game screenshots for the white revolution topic. They are short
  // or listed, so they are refused.
  var twoWords = matched >= 2;
  var oneSpecificWord = matched === 1 && catT.length === 1
    && singleHit.length >= 6 && !GENERIC_SEED[singleHit];
  if (!(twoWords || oneSpecificWord)) return false;

  // A seed scoped to another country is the wrong subject, whatever else it
  // matches. "Cattle breeds originating in Cuba" matches two words perfectly.
  return FR.respectsScope({ file: cat }, topic);
}

// Query forms worth trying, most specific first.
//
// The ladder comes from figure-resolve's discoveryCandidates, which is the
// already-tested query reducer: it drops the country qualifier ("india", which
// Commons categories write as "of India" or "in India", so keeping it guarantees
// a miss) and then falls back through concept, conjuncts and single nouns.
//
// Hand-rolled reduction was tried first and measured worse: "monsoon mechanism
// india" reduced to "monsoon mechanism", which is not a category, so the topic
// returned 0 seeds. The same ladder yields the bare "monsoon", which is a
// category with a large tree.
function seedQueries(topic) {
  var t = String(topic).toLowerCase().trim();
  var qs = [];
  try {
    var cands = FR.discoveryCandidates(topic);
    if (Array.isArray(cands)) qs = cands.slice();
  } catch (e) { /* fall through to the local forms below */ }
  qs.push(t);
  var noIndia = t.replace(/\s+(?:india|indian)\b/g, '').replace(/\s+/g, ' ').trim();
  if (noIndia && noIndia !== t) qs.push(noIndia);
  return qs.filter(function (v, i, a) { return v && a.indexOf(v) === i; });
}

// Whether a name carries the topic's country. Used for provenance, not
// rejection: "Kalagarh Tiger Reserve" says nothing about India, but it was
// reached through "Tiger reserves of India", which says everything.
function namesIndia(text) {
  return /\b(india|indian|bharat|desi)\b/i.test(String(text || ''));
}

function topicIsCountryScoped(topic) {
  return namesIndia(topic);
}

// A file reached through a category that never mentions the topic's country
// cannot be shown to be about that country. Matching a broad global category to
// a country-scoped topic is the one case the harvest cannot rescue: after the
// subcat guard, "india major cattle breeds" still returned "Cattles Grazing 6"
// and "Glamorgan Cattle", and "dairy farming in India" returned "Dairy cows,
// Rotorua, New Zealand". Those files are genuinely in a category that matched
// the topic; they are simply not Indian, and no filename rule can tell.
//
// So provenance is recorded and required. The seed each file was reached
// through is kept, and a country-scoped topic only accepts a file when either
// the file or that seed names the country. "Cattle breeds" names no country, so
// the topic yields nothing rather than publishing unverifiable photographs --
// which is the correct outcome under publish-strict, and the honest signal that
// this topic needs the curated resolver instead.
//
// "Tiger reserves of India" and "Mangroves in India" name the country, so
// everything reached through them is kept, including files whose own names say
// nothing about India.
async function harvestTopic(topic) {
  var out = { files: {}, cats: 0 };
  var seenCat = {};
  var caps = { left: MAX_CATS };

  var seeds = [];

  // P373 first: when it works it is exact, and it costs one call.
  try {
    var qids = await FR.topicQids(topic);
    for (var i = 0; i < Math.min(qids.length, 2); i++) {
      var cat = null;
      try { cat = await FR.p373(qids[i].qid); } catch (e) { cat = null; }
      if (cat && seedMatchesTopic(cat, topic)) seeds.push(cat);
    }
  } catch (e) { /* no Wikidata match: fall through to search */ }

if (!seeds.length) {
    // Every rung is tried, not just the first that returns anything. Stopping at
    // the first hit was measurably wrong: "monsoon mechanism india" matches
    // "Jinkx Monsoon", so the loop never reached the bare "monsoon" rung that
    // holds the real tree, and the topic harvested nothing.
    var qs = seedQueries(topic);
    for (var q = 0; q < qs.length && callBudget.left > 0; q++) {
      if (seeds.length >= SEED_MAX) break;
      var found = await searchCategories(qs[q]);
      for (var f = 0; f < found.length && seeds.length < SEED_MAX; f++) {
        if (seedMatchesTopic(found[f], topic) && seeds.indexOf(found[f]) < 0) seeds.push(found[f]);
      }
    }
  }

for (var s = 0; s < seeds.length && caps.left > 0 && callBudget.left > 0; s++) {
    await walk(seeds[s], DEPTH, caps, seenCat, out, topic, seeds[s]);
  }

  var files = Object.keys(out.files);
  var fileSeed = {};
  files.forEach(function (f) { fileSeed[f] = out.files[f]; });
  return {
    files: files,
    fileSeed: fileSeed,
    cats: out.cats,
    seeds: seeds,
    done: callBudget.left > 0,
  };
}

async function main() {
  var topicsPath = path.join(__dirname, '..', '..', 'data', 'figure-topics-curated.json');
  var topics = JSON.parse(fs.readFileSync(topicsPath, 'utf8'));
  // Shape is { _comment, _entities, <subject>: [topic, ...] }. The unit of
  // harvest is the topic, not the subject, so flatten: 126 topics across ~21
  // subjects. Reading top-level keys as topics would have walked 21 subjects
  // and silently harvested the wrong thing.
  var names = [];
  Object.keys(topics).forEach(function (k) {
    if (k.charAt(0) === '_') return;
    if (Array.isArray(topics[k])) names = names.concat(topics[k]);
    else if (typeof topics[k] === 'string') names.push(topics[k]);
  });
  names = names.filter(function (v, i, a) { return a.indexOf(v) === i; });

  var only = process.env.BULK_TOPICS;
  if (only) {
    var re = new RegExp(only, 'i');
    names = names.filter(function (n) { return re.test(n); });
  }

  var store = {};
  if (fs.existsSync(OUT)) {
    try { store = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) { store = {}; }
  }

  var total = 0, doneTopics = 0, harvested = 0, revisited = 0;

  // A finished topic is skipped only while its result is still fresh. Without
  // this the schedule would be a no-op forever: all 125 topics finished on the
  // first big run, so every later run found every topic `done`, walked nothing,
  // and no file added to Commons afterwards could ever be noticed.
  //
  // Staleness is what makes the schedule genuine auto-discovery rather than a
  // one-off. Each run re-walks the topics whose last walk is older than
  // BULK_REFRESH_HOURS, in topic order, and the shared call budget decides how
  // far it gets before the run ends. So the corpus keeps absorbing new uploads,
  // and a topic that has gone quiet costs little, because a walk that finds
  // nothing new spends almost nothing.
  var REFRESH_MS = Math.max(0, parseInt(process.env.BULK_REFRESH_HOURS || '24', 10)) * 3600e3;
  function isStale(entry) {
    if (!entry || !entry.done) return true;
    if (process.env.BULK_RESUME === '0') return true;
    if (!REFRESH_MS) return false;
    if (!entry.at) return true;
    return (Date.now() - entry.at) >= REFRESH_MS;
  }
  console.log('bulk harvest: ' + names.length + ' topics, depth ' + DEPTH
    + ', ' + MAX_CATS + ' cats/topic, ' + callBudget.left + ' API calls');

  for (var i = 0; i < names.length; i++) {
    var name = names[i];
    if (!isStale(store[name])) {
      doneTopics++; total += (store[name].files || []).length;
      continue;
    }
    if (callBudget.left <= 0) {
      console.log('  call budget exhausted after ' + i + ' topics; rerun to resume');
      break;
    }
    revisited++;
    process.stdout.write('  [' + (i + 1) + '/' + names.length + '] ' + name + ' ... ');
    var res;
    try { res = await harvestTopic(name); }
    catch (e) { res = { files: [], cats: 0, seeds: [], done: false }; }

    // A re-walk must not silently shrink the pool. Commons categories gain and
    // lose files, and a subtree that is momentarily empty would otherwise drop
    // candidates that were harvested and vetted yesterday. So the fresh walk is
    // merged over the previous one, and the publisher still deduplicates
    // globally, so a file carried forward cannot be published twice.
    var files = res.files.slice();
    var prevFiles = (store[name] && store[name].files) || [];
    var prevSeed = (store[name] && store[name].fileSeed) || {};
    var freshSeed = res.fileSeed || {};
    var seed = {};
    files.forEach(function (f) { seed[f] = freshSeed[f] || ''; });
    prevFiles.forEach(function (f) {
      if (files.indexOf(f) === -1) { files.push(f); seed[f] = prevSeed[f] || ''; }
    });

    store[name] = {
      files: files,
      fileSeed: seed,
      cats: res.cats,
      seeds: res.seeds,
      done: !!res.done,
      at: Date.now(),
    };
    harvested += res.files.length;
    total += files.length;
    doneTopics++;
    console.log(res.files.length + ' candidates from ' + res.cats + ' categories');
    fs.writeFileSync(OUT, JSON.stringify(store, null, 1));
  }

  console.log('');
  console.log('topics walked this run: ' + revisited + ' of ' + names.length
    + ' (refresh window ' + (REFRESH_MS / 3600e3) + 'h)');
  console.log('topics with candidates: ' + doneTopics + '/' + names.length);
  console.log('candidate files total:  ' + total + '  (' + harvested + ' new this run)');
  console.log('API calls used:        ' + calls);
  console.log('written:               data/figure-candidates.json');
}

if (require.main === module) {
  main().then(function () { process.exit(0); }, function (e) {
    console.error(e && e.stack || e);
    process.exit(1);
  });
}

module.exports = { harvestTopic: harvestTopic, acceptable: acceptable };