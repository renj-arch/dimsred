(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./ask-core.js'), require('./ask-qb.js'));
  else root.VlymbooqAskAnswer = factory(root.VlymbooqAsk, root.VlymbooqAskQb);
}(typeof self !== 'undefined' ? self : this, function (ask, qb) {
  'use strict';
// Orchestrates a question-bank answer: route, fetch, score, merge.
//
// This is the entry point the page uses. It keeps the browser from holding the
// corpus: the directory and manifest are resident, only routed shards are
// fetched, and each is released once scored. It returns verbatim sentences with
// the entity and category they came from.
//
// It never generates or paraphrases. If it cannot ground the question, it
// returns nothing rather than the least-bad sentence, and the caller shows a
// refusal.


// Routing merges two independent signals, and the order matters.
//
// The entity directory is authoritative. It is built from the corpus itself, so
// it knows that the Indian National Congress lives in `Indian States` and
// `World History` rather than in a polity category, which no amount of
// category-name matching or hand-written hint could discover.
//
// The hint table is only a fallback, and it earns its place on conceptual
// questions. "How far has Indian federalism succeeded" has no entity to look up,
// so the route comes from the concept's vocabulary instead.
function route(question, dir, entityDir, concepts) {
  var subject = ask.subjectOf(question) || '';
  var concept = ask.routeFor(subject, question);
  // Admission uses the `fit` vocabulary only. A `strain` phrase describes the
  // cost side of a concept and is reported separately, because admitting on it
  // lets ordinary words like "demand" and "dispute" pull unrelated entities
  // into the evidence.
  var phrases = concept ? (concept.cfg.fit || []) : [];
  var strain = concept ? (concept.cfg.strain || []) : [];

  var picked = [];
  var seen = {};
  var entityPhrase = null;
  var matchedName = null;

  var addCats = function (idxs, weight) {
    (idxs || []).forEach(function (i) {
      var c = dir.categories[i];
      if (!c) return;
      var cur = seen[c.name];
      // Directory hits are worth more than hint hits, so a category found both
      // ways keeps the higher score instead of being counted twice.
      if (!cur || weight > cur.score) seen[c.name] = { cat: c, score: weight };
      if (!picked.some(function (p) { return p.cat.name === c.name; })) {
        picked.push({ cat: c, score: weight });
      }
    });
  };

  if (entityDir && subject) {
    var cands = entityDir.candidates(subject);
    for (var i = 0; i < cands.length && picked.length < 6; i++) {
      // Only a confident match is allowed to constrain the entity gate. A weak
      // prefix still routes, because its categories are likely relevant, but it
      // must not exclude the rest of the corpus.
      if (!entityPhrase && cands[i].strong) { entityPhrase = cands[i].name; matchedName = cands[i].name; }
      // A weak candidate must not outrank measured concept evidence. "the Sixth
      // Schedule of the Constitution" produced "the sixth battalion" and "the
      // sixth extinction", and at directory weight their categories (International
      // Relations, Applied Sciences) took the first two slots, so the question was
      // answered from World Geography and Applied Sciences while the actual
      // provision in `Indian States` was never fetched. Weak matches still route,
      // but below the concept table and the hints.
      addCats(cands[i].cats, cands[i].strong ? 20 - i : 6 - i);
    }
  }

  // Measured concept evidence. The hint table is a guess about category names;
  // this is a count of the sentences that actually carry the concept, so it
  // outranks hints. It is what routes "the Sixth Schedule" away from the
  // `Constitution` category, which the word "constitution" selects and which
  // holds none of the sentences that mention the Sixth Schedule.
  if (concepts && concepts.concepts && concept && concepts.concepts[concept.key]) {
    var table = concepts.concepts[concept.key];
    addCats(table.categories.map(function (c) { return c.i; }), 18);
  }

  var hints = qb.routeCategories(dir, question, 4, subject);
  hints.forEach(function (h) {
    addCats([(dir.categories || []).indexOf(h.cat)], h.score);
  });

  picked.sort(function (a, b) { return b.score - a.score; });

  return {
    subject: subject,
    matchedEntity: matchedName,
    entityPhrase: entityPhrase,
    // A concept route with no matched entity is the conceptual case, where the
    // answer has to come from sentence content rather than from an entity name.
    conceptTier: !!concept && !entityPhrase,
    concept: concept ? concept.key : null,
    phrases: phrases,
    strainPhrases: strain,
    // Used when there is no entity of this name in the corpus, which is the
    // normal case for statutory and institutional subjects: "the Sixth Schedule
    // of the Constitution" and "the Fazl Ali Commission" are named in the
    // corpus only inside the sentences of other entities, so the subject has to
    // be matched against sentence text.
    subjectPhrases: entityPhrase ? [] : qb.subjectPhrases(subject),
    // Jurisdiction defaults to India. The corpus is an Indian exam corpus, so an
    // unqualified question is about India, and saying so lets the country filter
    // run. Without it the filter is inert on any question that does not name a
    // country, and "What is the Sixth Schedule of the Constitution?" was
    // answered with the Constitution of Haiti and of Jersey.
    jurisdiction: (function () {
      var marks = ask.jurisdictionMarkers ? ask.jurisdictionMarkers(question) : [];
      return marks.length ? marks.join(' ') : 'india';
    })(),
    categories: picked
  };
}

return {
  route: route,

  // Load the directory and the entity table. Kept separate from `route` so the
  // caller can show a loading state and cache both across questions.
  loadDir: function (dirJson, entitiesText) {
    var d = dirJson;
    if (typeof dirJson === 'string') d = JSON.parse(dirJson);
    var e = entitiesText ? new qb.EntityDir().load(entitiesText) : null;
    return { dir: d, entityDir: e };
  },

  scoreShard: qb.scoreShard,

  // Merge scored hits from several shards, dedupe, and cap per entity so one
  // prolific entity cannot fill the whole answer.
  merge: function (lists, limit, maxPerEntity) {
    var all = [];
    (lists || []).forEach(function (l) { all = all.concat(l || []); });
    all.sort(function (a, b) { return b.score - a.score; });
    var perEntity = {};
    var seen = {};
    var picked = [];
    var cap = maxPerEntity || 2;

    // The per-entity cap exists so one prolific entity cannot fill the whole
    // answer. Applied blindly it also hides the answer, because some questions
    // have only one entity that matches at all: "the challenges of water security
    // in India" is carried entirely by the corpus entity "Water security", whose
    // 24 sentences include the droughts, water shortages, water stress and
    // scarcity figures that answer it, and a cap of 2 returned only the two
    // definitional sentences about the aim of water security. So when the
    // evidence is scarce the cap gives way, and it is the diversity it protects
    // that there is no longer any of.
    //
    // The relaxation is bounded. Letting one entity fill the answer entirely
    // helps when the entity is right, but a badly routed question then returns
    // eight sentences of the wrong subject, which is what happened to a question
    // about urbanisation: it came back with migration diplomacy, weaponized
    // migration, and student migration. Four is enough to carry an answer and
    // small enough that a routing mistake stays visible as a mistake.
    var distinct = {};
    all.forEach(function (e) { distinct[e.entity] = 1; });
    var nEnt = Object.keys(distinct).length;
    var want = limit || 12;
    if (nEnt > 0 && nEnt <= 2) cap = Math.max(cap, Math.min(4, Math.ceil(want / nEnt)));

    for (var i = 0; i < all.length && picked.length < want; i++) {
      var e = all[i];
      var key = e.sentence.slice(0, 160);
      if (seen[key]) continue;
      var n = perEntity[e.entity] || 0;
      if (n >= cap) continue;
      seen[key] = 1;
      perEntity[e.entity] = n + 1;
      picked.push(e);
    }
    return picked;
  },

  routeFor: ask.routeFor,
  conceptPhrasesFor: ask.conceptPhrasesFor,
  subjectOf: ask.subjectOf
};
}));
