// Browser adapter for the question-bank retrieval engine.
//
// The engine itself is shared with the offline tests (see scripts/lib/ask-qb.js
// and scripts/lib/ask-answer.js); this file only does the I/O the browser needs:
// it loads the small routing tables once, then fetches just the shards that a
// question routes to. Nothing here decides what an answer is, so the page and
// the tests cannot disagree about which evidence is acceptable.
//
// The shards are the derived, compact form of data/questions: an entity name and
// the corpus sentences that mention it, with no question text, no answers, and
// no record ids. That is what makes them fetchable. The original category files
// are 200-570 MB each, so reading those at query time is not an option.
(function (root, factory) {
if (typeof module === 'object' && module.exports) {
module.exports = factory({
    entityEvidence: require('./ask-entity-evidence.js'),
    compose: require('./ask-compose.js'),
    bucketHash: require('./build-ask-qb-buckets-hash.js'),
    prose: require('./ask-prose.js')
});
} else {
  root.VlymbooqAskBrowser = factory({
    entityEvidence: root.VlymbooqAskEntityEvidence,
    compose: root.VlymbooqAskCompose,
    bucketHash: root.VlymbooqAskBucketHash,
    prose: root.VlymbooqAskProse
});
}
}(typeof self !== 'undefined' ? self : this, function (deps) {
'use strict';

// The entity-anchored retrieval and composition modules. They are separate
// libraries so the offline tests can require them directly, and are injected
// here so this adapter stays free of hard dependencies: if either is absent the
// existing navigational `ask()` path still works, and only `mains()` refuses.
var EE = deps && deps.entityEvidence;
var COMPOSE = deps && deps.compose;

// The bucket hash. It is injected rather than looked up on `root`, because the
// UMD factory receives its dependencies as an argument and has no other handle on
// the global scope. Injecting it is also what keeps the builder and the page
// computing identical bucket ids. If it is absent the adapter still works, it just
// cannot take the bucket path and falls back to category shards.
var BUCKET = deps && deps.bucketHash;

// The deterministic essay writer. Injected for the same reason as the others:
// `essay()` needs it and must refuse cleanly when it is absent, while the
// navigational `ask()` path keeps working regardless.
var PROSE = deps && deps.prose;

var QB = 'data/ask-qb/';

  // Only the top few shards are fetched per question. Each is a few MB, and the
  // router already orders them by measured relevance, so the tail adds cost
  // without changing the answer.
  var MAX_SHARDS = 5;
  var MAX_BYTES = 90 * 1024 * 1024;

  var state = { ready: false, error: null, dir: null, entityDir: null, concepts: null };

  function get(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + url);
      return r.text();
    });
  }

  function loadJson(url) {
    return get(url).then(function (t) { return JSON.parse(t); });
  }

  // A missing shard must not fail the whole question. Until the evidence shards
  // are deployed this is the normal case, and the page falls back to the
  // timeline engine rather than showing an error.
  function loadShard(file) {
    return fetch(file).then(function (r) {
      if (r.status === 404) return { rows: null, missing: true };
      if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + file);
      return r.json().then(function (rows) { return { rows: rows, missing: false }; });
    });
  }

  // Named rather than returned inline, because essay() needs to call mains() and
  // phraseLookup() on this same object.
  var api = {
    // Fetches the manifest, directory, entity table and concept table. These four
    // are small (about 10.5 MB together, almost all of it the entity table) and
    // are cached across questions.
    boot: function (answer, qb) {
      if (state.ready) return Promise.resolve(state);
      if (state.error) return Promise.reject(state.error);
      return Promise.all([
        loadJson(QB + 'manifest.json'),
        loadJson(QB + 'dir.json'),
        get(QB + 'entities.tsv'),
        loadJson(QB + 'concepts.json')
      ]).then(function (res) {
        var loaded = answer.loadDir(res[1], res[2]);
        state.dir = loaded.dir;
        state.entityDir = loaded.entityDir;
        state.concepts = res[3];
state.answer = answer;
state.qb = qb;
state.ee = EE;
        state.compose = COMPOSE;
        state.manifest = res[0];
        state.ready = true;
        return state;
      }).catch(function (err) {
        state.error = err;
        throw err;
      });
    },

    // Loads the entity-bucket manifest. It is separate from boot() because it is
    // a new artefact: a deployment that has the category shards but not yet the
    // buckets must still work, and a missing bucket manifest should degrade to
    // category fetching rather than break the page.
    loadBuckets: function () {
      if (state.bucketPromise) return state.bucketPromise;
      state.bucketPromise = loadJson(QB + 'bucket/buckets.json').then(function (bm) {
        state.buckets = bm;
        var byId = {};
        (bm.buckets || []).forEach(function (b) { byId[b.bucket] = b; });
        state.bucketById = byId;
        return bm;
      }).catch(function (err) {
        state.bucketPromise = null;
        throw err;
      });
      return state.bucketPromise;
    },

bucketReady: function () { return !!state.buckets; },

    // Reads one phrase-index shard. The index is sharded by hash(phrase), the same
    // hash the entity buckets use, so resolving a term costs exactly one small
    // fetch and the reply names which bucket files actually contain it.
    //
    // It returns null rather than rejecting when the index is not deployed, so a
    // page without it degrades to entity-only retrieval instead of failing the
    // question.
    phraseLookup: function (term) {
      if (!state.buckets || !BUCKET) return Promise.resolve(null);
      var bi = BUCKET.bucketOf(term, state.buckets.bucketCount || 512);
      return loadJson(QB + 'phrase/phrase.' + bi + '.json').then(function (idx) {
        var hit = idx[String(term).toLowerCase()];
        if (!hit) return null;
        return {
          term: term,
          df: hit.d,
          buckets: hit.b || [],
          entities: hit.e || []
        };
      }).catch(function () { return null; });
    },

    phraseReady: function () { return !!state.buckets; },

    isReady: function () { return state.ready; },

    // The question-bank tables are a build-time snapshot, so the page needs to be
    // able to say when it was taken. This reads only the manifest, which is
    // already loaded, so the freshness line costs nothing.
    //
    // The archive keeps growing and nothing here re-reads it: new records in
    // data/questions reach Ask only when scripts/build-ask-qb.js (and then
    // build-ask-qb-dir.js and build-ask-qb-concepts.js) is re-run. Use
    // scripts/check-ask-qb-fresh.js to detect that before a deploy.
    stats: function () {
      if (!state.ready) return null;
      var st = state.manifest.stats || {};
      return {
        builtAt: state.manifest.builtAt || null,
        files: st.files || null,
        records: st.records || null,
        keptSentences: st.keptSent || null
      };
    },

    // Returns { evidence, route, missing } where `missing` counts the routed
    // shards that are not deployed yet. A non-zero `missing` with no evidence is
    // the signal for the caller to fall back.
    ask: function (question, opts) {
      opts = opts || {};
      if (!state.ready) return Promise.reject(new Error('engine not booted'));
      var limit = opts.limit || 8;
      var route = state.answer.route(question, state.dir, state.entityDir, state.concepts);
      var cats = route.categories.slice(0, opts.maxShards || MAX_SHARDS);

      // Shards are already ordered by score, so the byte budget is spent on the
      // most relevant ones and the remainder is reported as missing.
      var budget = opts.maxBytes || MAX_BYTES;
      var chosen = [];
      var skipped = 0;
      cats.forEach(function (c) {
        var bytes = c.cat.bytes || 0;
        if (bytes > budget) { skipped++; return; }
        budget -= bytes;
        chosen.push(c);
      });

      var missing = skipped;
      var lists = [];
      var jobs = chosen.map(function (c) {
        return loadShard(c.cat.file).then(function (out) {
          if (out.missing || !out.rows) { missing++; return; }
          lists.push(state.qb.scoreShard(out.rows, question, {
            conceptPhrases: route.phrases,
            jurisdiction: route.jurisdiction,
            subject: route.anchorSubject,
            entityPhrase: route.entityPhrase,
            conceptTier: route.conceptTier,
            subjectPhrases: route.subjectPhrases,
            limit: opts.perShard || 12,
            // The per-entity cap is applied by merge(), which knows how many
            // distinct entities survived across all the shards and can relax the
            // cap when the evidence is scarce. Capping hard here instead would
            // discard material before merge ever saw it.
            maxPerEntity: opts.shardCap || 12
          }));
        });
      });

return Promise.all(jobs).then(function () {
return {
evidence: state.answer.merge(lists, limit, opts.perEntity || 2),
route: route,
missing: missing
};
});
},

// Answer a mains question as a structured dossier of evidence.
//
// This is deliberately a different shape from ask(). ask() answers a
// navigational question with the best-matching evidence and stops. This one
// takes an authored outline of [heading, term, alternates], resolves every
// heading to a corpus entity through the entity table, and fetches ONLY the
// shards those entities actually live in. Fetching by resolved category is what
// makes it work: a mains answer draws on entities scattered across many
// categories, so routing by question keywords pulls the wrong shards.
//
// Three outcomes are reported separately and never merged, because conflating
// them is what produced confident wrong answers:
//   answered  -- entity resolved and its sentences were fetched and quoted
//   unquoted  -- entity resolved, its shard could not be fetched or held nothing
//   absent    -- no entity of that name exists in the corpus at all
// `absent` is a statement about the corpus. `unquoted` is a statement about this
// deployment, and the two must not both be rendered as "not covered".
mains: function (question, outline, opts) {
opts = opts || {};
if (!state.ready) return Promise.reject(new Error('engine not booted'));
var ev = state.ee;
var dirs = ev.indexRows([]);

var points = (outline || []).map(function (p) {
return [p[0], p[1], p[2] || []];
});

// Resolve every heading against the entity table before fetching anything, so
// the byte budget is spent on the categories the answer actually needs.
var resolved = points.map(function (p) {
var terms = [p[1]].concat(p[2]).filter(Boolean);
var hits = [];
terms.forEach(function (t) {
var ids = state.entityDir.lookup(t);
if (!ids) return;
hits.push({ term: t, cats: ids });
});
var cats = {};
hits.forEach(function (h) {
h.cats.forEach(function (c) { cats[c] = 1; });
});
return { label: p[0], terms: terms, hits: hits, cats: Object.keys(cats) };
});

var needed = [];
resolved.forEach(function (r) {
r.cats.forEach(function (c) { needed[c] = 1; });
});
var catList = Object.keys(needed);

// Bucket path, preferred when the bucket manifest has been deployed.
//
// Entity buckets are the same rows repartitioned by a hash of the entity name
// instead of by category, which is the difference between downloading the
// categories a question touches and downloading only the buckets holding the
// entities it names. Measured by scripts/diag-bucket-win.js on the built corpus:
// a ten-heading oceanography outline cost 478 MB of category shards and 19 MB of
// buckets, and the floor for any question is one bucket per distinct entity
// rather than one whole category each.
//
// The hash is computed from the attempt term, so an alternate spelling resolves to
// the bucket that actually holds it, with no index to look up.
if (state.buckets && opts.buckets !== false) {
var seenBucket = {};
resolved.forEach(function (r) {
r.hits.forEach(function (h) {
var bi = BUCKET.bucketOf(h.term, state.buckets.bucketCount);
if (state.bucketById[bi]) seenBucket[bi] = 1;
});
});
var bucketIds = Object.keys(seenBucket);
if (!bucketIds.length) {
// Every attempt term hashed to an empty bucket, which means the bucket manifest
// does not cover these entities -- a stale deploy. Falling through to categories
// is correct here, and reporting "absent" would blame the corpus for a
// deployment gap.
} else {
var bBudget = opts.maxBytes || MAX_BYTES;
var bMeta = bucketIds.map(function (id) { return state.bucketById[id]; })
.filter(Boolean)
.sort(function (a, b) { return (a.bytes || 0) - (b.bytes || 0); });
var bChosen = [], bSkipped = 0, bSpent = 0;
bMeta.forEach(function (m) {
if (bSpent + (m.bytes || 0) > bBudget) { bSkipped++; return; }
bSpent += m.bytes || 0;
bChosen.push(m);
});
var bMissing = bSkipped;
var bRows = [];
var bJobs = bChosen.map(function (m) {
return loadShard(m.file).then(function (out) {
if (out.missing || !out.rows) { bMissing++; return; }
bRows = bRows.concat(out.rows);
});
});
return Promise.all(bJobs).then(function () {
var bResult = ev.retrieve(bRows, question, points, state.entityDir, opts);
var bComposed = state.compose.compose(question, outline, bResult, opts);
bComposed.fetchedShards = bChosen.length;
bComposed.missingShards = bMissing;
bComposed.shardBytes = bChosen.reduce(function (n, m) { return n + (m.bytes || 0); }, 0);
bComposed.scheme = 'buckets';
return bComposed;
});
}
}

if (!catList.length) {
// Nothing in the outline resolves, so there is nothing to fetch. Return a
// complete, entirely-absent answer rather than an empty one.
var empty = ev.retrieve([], question, points, state.entityDir, {});
var composed = state.compose.compose(question, outline, empty, opts);
composed.fetchedShards = 0;
composed.missingShards = 0;
return Promise.resolve(composed);
}

var budget = opts.maxBytes || MAX_BYTES;
// The entity table stores category ids, and those ids index
// manifest.categories directly: lookup("Lakshadweep") -> [79, 85], and
// categories[79] is "Indian Physical Geography". The first line of the table is a
// header row whose offset 0 would otherwise be read as a category, so ids are
// trusted only when they land inside the manifest.
//
// Shards are then taken in ascending size order, so a byte budget sheds the
// largest ones first and the answer stays as complete as the budget allows.
// Manifest order would drop later topics alphabetically for no reason at all.
var wanted = [];
catList.forEach(function (c) {
var meta = state.manifest.categories[c];
if (meta) wanted.push(meta);
});
wanted.sort(function (a, b) { return (a.bytes || 0) - (b.bytes || 0); });
var chosen = [];
var skipped = 0;
var spent = 0;
wanted.forEach(function (m) {
var bytes = m.bytes || 0;
if (spent + bytes > budget) { skipped++; return; }
spent += bytes;
chosen.push(m);
});

var missing = skipped;
var rows = [];
var jobs = chosen.map(function (meta) {
return loadShard(meta.file).then(function (out) {
if (out.missing || !out.rows) { missing++; return; }
rows = rows.concat(out.rows);
});
});

return Promise.all(jobs).then(function () {
var result = ev.retrieve(rows, question, points, state.entityDir, opts);
var composed = state.compose.compose(question, outline, result, opts);
composed.fetchedShards = chosen.length;
composed.missingShards = missing;
composed.shardBytes = chosen.reduce(function (n, m) { return n + (m.bytes || 0); }, 0);
return composed;
});
}
,

// Write a mains question as a connected essay, deterministically.
//
// Retrieval is mains()'s, unchanged: same shards, same budget, same outcomes. What
// this adds is a second pass for headings that retrieval could not serve.
//
// Entity-anchored retrieval returns an entity's most PROMINENT sentences, which are
// frequently irrelevant to the heading's claim -- asked for the revolutionary
// stream, "Bhagat Singh" returns a police shooting narrative. The phrase index
// exists for exactly that case: it finds sentences containing a term regardless of
// which entity owns them, so on-claim text under other subjects becomes reachable.
//
// Rescue is deliberately lazy. Retrieval has already fetched every bucket the
// outline names, so the first pass is free, and only headings that came back
// unwritten trigger the extra fetches. That keeps the common case at its current
// cost and stops a well-covered heading from being diluted by off-entity sentences.
essay: function (question, outline, opts) {
opts = opts || {};
if (!PROSE) return Promise.reject(new Error('prose module not loaded'));
if (!state.ready) return Promise.reject(new Error('engine not booted'));

return api.mains(question, outline, opts).then(function (composed) {

// The rescue terms declared for a heading, lowercased. Used both to decide which
// headings to rescue and to filter the fetched sentences down to the ones that
// mention the term.
function rescueTermsFor(outline, label) {
var out = [];
(outline || []).forEach(function (p) {
if (!p || p[0] !== label) return;
var spec = p[3] || {};
[].concat(spec.rescue || []).concat(spec.term ? [spec.term] : [])
.forEach(function (t) {
t = String(t || '').toLowerCase().trim();
if (t && out.indexOf(t) === -1) out.push(t);
});
});
return out;
}

// Substring match on whitespace-normalised text. The phrase index stored phrases
// as they appear in the sentence, so a token-wise match would miss "hindustan
// republican" against "Hindustan  Republican"; this does not, and the extra
// looseness is bounded by the domain gate downstream.
function containsAny(sentence, terms) {
var s = ' ' + String(sentence || '').toLowerCase().replace(/\s+/g, ' ') + ' ';
for (var i = 0; i < terms.length; i++) {
if (s.indexOf(' ' + terms[i] + ' ') !== -1) return true;
}
return false;
}

// Assembles the document. Declared inside this callback because it closes over
// `composed`; hoisting it to the factory body made the brace nesting in this
// already-nested promise chain hard to keep straight.
function finish(fetched, escapeErr) {
var result = composed;
var doc_escapePool = 0;

// Escape candidates are collected from every fetched row rather than looked up by
// name. The owning entity was never named by the outline -- that is the whole
// reason escape is needed -- so an entity-keyed index cannot help. The composer
// decides which sentences bear on which claim and gates each by the heading's
// declared domain; this layer only supplies candidates and asserts nothing.
if (fetched && fetched.rows.length) {
result = Object.create(composed);
result.byLabel = composed.byLabel;
var esc = {}, pool = 0;
(composed.sections || []).forEach(function (sec) {
if (!sec) return;
var terms = rescueTermsFor(outline, sec.label);
// Only sentences that actually contain one of this heading's rescue terms are
// offered. Offering every sentence of every fetched row would hand the composer
// hundreds of thousands of candidates, of which all but a handful are irrelevant
// -- and because the buckets were chosen for containing the term, those are exactly
// the sentences the term was meant to find.
var list = [];
fetched.rows.forEach(function (row) {
if (!row || !row[0] || !row[1]) return;
row[1].forEach(function (s, i) {
if (terms.length && !containsAny(s, terms)) return;
var m = (row[3] && Array.isArray(row[3])) ? (row[3][i] || {}) : {};
list.push({ entity: row[0], sentence: s, cats: row[2] || [], meta: m });
});
});
esc[sec.label] = list;
pool += list.length;
});
result.escapeByLabel = esc;
doc_escapePool = pool;
}

var doc = PROSE.write(question, outline, result, {
perHeading: opts.perHeading || 4,
minRelevance: opts.minRelevance == null ? 0.34 : opts.minRelevance
});
doc.fetchedShards = composed.fetchedShards;
doc.missingShards = composed.missingShards;
doc.shardBytes = composed.shardBytes;
doc.scheme = composed.scheme;
doc.outcomes = composed.outcomes;
doc.escapeBuckets = fetched ? fetched.buckets : 0;
doc.escapeBytes = fetched ? fetched.bytes : 0;
doc.escapePool = doc_escapePool;
if (escapeErr) {
doc.escapeError = String((escapeErr && escapeErr.message) || escapeErr);
}
return doc;
}

// Which headings need rescuing, decided by running the composer once with no
// escape evidence and seeing what it could not write.
//
// An earlier version asked whether entity retrieval had returned any candidate
// sentences. That is the wrong question: retrieval can return sentences that all
// score below the heading's threshold -- Bhagat Singh's row does, because its
// sentences talk about trials rather than the revolutionary stream. Such a heading
// has evidence and still needs rescue, so the test skipped it and the heading came
// out thin. The composer's own verdict is the only reliable signal, and it is
// available before any rescue fetch is paid for.
var baseline = PROSE.write(question, outline, composed, {
perHeading: opts.perHeading || 4,
minRelevance: opts.minRelevance == null ? 0.34 : opts.minRelevance
});

var needy = [];
baseline.paragraphs.forEach(function (para) {
if (para.status === 'written') return;
var terms = rescueTermsFor(outline, para.heading);
// A heading that declares no rescue terms cannot be rescued, so it is not worth
// listing: fetching buckets for it would only hand off-domain sentences to a
// heading that asked for none.
if (!terms.length) return;
needy.push({ label: para.heading, terms: terms });
});

if (!needy.length || !state.buckets || !BUCKET || opts.escape === false) {
return finish(null);
}

// One phrase-index shard per rescue term, deduped by shard so a term and an
// alternate naming the same shard do not fetch it twice.
var shardSeen = {}, termJobs = [];
needy.forEach(function (n) {
n.terms.forEach(function (t) {
var bi = BUCKET.bucketOf(t, state.buckets.bucketCount || 512);
if (shardSeen[bi]) return;
shardSeen[bi] = 1;
termJobs.push(t);
});
});

if (!termJobs.length) return finish(null);

var cap = opts.escapeMaxBuckets == null ? 24 : opts.escapeMaxBuckets;

return Promise.all(termJobs.map(function (t) {
return api.phraseLookup(t);
})).then(function (hits) {

// Rank buckets by summed phrase frequency, so the cap sheds the least relevant
// buckets rather than whichever happened to be found first.
var score = {};
hits.forEach(function (h) {
if (!h) return;
(h.buckets || []).forEach(function (b) {
score[b] = (score[b] || 0) + (h.df || 1);
});
});
var ranked = Object.keys(score).sort(function (a, b) {
return score[b] - score[a];
});
if (ranked.length > cap) ranked = ranked.slice(0, cap);
if (!ranked.length) return finish(null);

var jobs = ranked.map(function (b) {
var meta = state.bucketById[b];
var file = meta && meta.file ? meta.file : QB + 'bucket/bucket.' + b + '.json';
return loadShard(file).then(function (out) { return out.rows || []; });
});

return Promise.all(jobs).then(function (lists) {
var rows = [], bytes = 0;
lists.forEach(function (part, i) {
rows = rows.concat(part);
var meta = state.bucketById[ranked[i]];
bytes += meta ? (meta.bytes || 0) : 0;
});
return finish({ rows: rows, bytes: bytes, buckets: ranked.length });
});

}).catch(function (err) {
// A phrase index that is missing, stale or malformed must not fail the question.
// The entity-only answer is still a real answer, and the error is carried so the
// page can say why rescue was skipped rather than implying nothing needed it.
return finish(null, err);
});

});
}
};

return api;
}));
