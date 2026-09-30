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
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.VlymbooqAskBrowser = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

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

  return {
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
        state.manifest = res[0];
        state.ready = true;
        return state;
      }).catch(function (err) {
        state.error = err;
        throw err;
      });
    },

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
            subject: route.subject,
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
    }
  };
}));
