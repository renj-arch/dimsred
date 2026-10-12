(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./ask-qb.js'), require('./ask-answer.js'));
  } else {
    root.VlymbooqAskEntityEvidence = factory(root.VlymbooqAskQb, root.VlymbooqAskAnswer);
  }
}(typeof self !== 'undefined' ? self : this, function (qb, answer) {
  'use strict';
// Entity-anchored evidence retrieval for mains questions.
//
// WHY ENTITY-FIRST, RATHER THAN SCORING SENTENCES
//
// Ranking sentences by how many question tokens they contain cannot tell
// "Sagar taluk", a district in Karnataka, from SAGAR, India's maritime-security
// vision. Both contain the token "sagar", and the difference is not in the
// tokens. Measured on a ten-file slice, a token scorer reported these as
// SUPPORTED when the evidence was:
//
//   8. Regional influence: SAGAR
//      "The waterfalls are in the Sagar taluk of the Shivamogga district."
//   Way forward: maritime domain awareness
//      "Mission DefSpace ... space-based collaboration"
//
// A mains answer that claims corpus support for a heading, on that evidence, is
// worse than an admitted gap, because the reader cannot see the error.
//
// The corpus already resolves the ambiguity, and it is a table that has been
// built for exactly this purpose: data/ask-qb/entities.tsv. It distinguishes
// "sagar island", "sagar khera", "sagarika missile" and "sagara yoshihi" from
// each other, and it holds no entity for "bab-el-mandeb" or "maritime domain
// awareness" at all. So the order of operations is inverted: resolve the claim to
// a corpus entity FIRST, then take that entity's own sentences. A claim whose
// term resolves to nothing in the table is reported as a gap, which is a true and
// useful statement.
//
// WHAT THIS STILL CANNOT DO
//
// Resolving a claim yields sentences that are ABOUT the entity. It does not yield
// the argument. The corpus states "over 50% of India's trade passes through the
// Malacca Strait" and never states that this makes the islands strategically
// valuable, so the link between retrieved facts remains something a human argues.
// This module reports that separation explicitly and never asserts a chain it has
// not found. It also does not generate, paraphrase or summarise: every sentence is
// a verbatim slice of a record's own `fact` field.

var STOP = {};
('a an the of and or in on at to for with by from as is was were be been being has have had ' +
  'this that these those it its their his her they them we you i not no than then so such which ' +
  'who whom what when where how why into over under about between among during each other some ' +
  'any all more most less least very can could may might must shall should will would do does ' +
  'did done there here also discuss discussed discussing examine examined examines examining ' +
  'analyse analyzed analyses analyse analyze analyzed analyses assess assessed assesses ' +
  'evaluate evaluated evaluates evaluation elaborate elaborated explains explained describing ' +
  'described describe critically').split(' ').forEach(function (w) { STOP[w] = 1; });

function contentTokens(s) {
  return qb.tokens(s).filter(function (t) { return !STOP[t]; });
}

// Split a mains question into the concepts it asks about. Only an explicit
// relational frame is split on: "the relationship between A, B and C" names
// several subjects and no single entity, so one retrieval pass over the whole
// question returns nothing. A question with one subject, such as "the
// significance of the Indian Ocean Region for India's national security", must
// stay ONE concept, or its parts are retrieved separately and never joined.
function decompose(question) {
  var raw = String(question == null ? '' : question).trim();
  var relational = /\b(?:relationship|relationships|interaction|interactions|link|links|connection|connections)\s+(?:between|among)\b/i.test(raw);
  if (!relational) return [raw];
  var body = raw
    .replace(/^.*?\b(?:relationship|relationships|interaction|interactions|link|links|connection|connections)\s+(?:between|among)\s+/i, '')
    .replace(/^.*?\b(?:impact|effects?|role|influence|significance)\s+of\s+/i, '')
    .replace(/^\s*(analyse|analyze|explain|discuss|examine|assess|elaborate|evaluate)\s+/i, '');
  var parts = body.split(/\s*(?:,|;|\band\b)\s*/i)
    .map(function (s) { return s.trim().replace(/[?.!,]+$/, ''); })
    .filter(function (s) { return s.length > 2 && /[a-z]{3}/i.test(s); });
  return parts.length ? parts : [raw];
}

// Provenance and recency. Reports; does not judge truth. A claim outside the
// configured window is flagged rather than dropped, so the reader sees it.
function trust(meta, opts) {
  var o = opts || {};
  var m = meta || {};
  var flags = [];
  if (!m.source) flags.push('no-source');
  if (o.allowSources && o.allowSources.length && m.source &&
      o.allowSources.indexOf(m.source) === -1) flags.push('source-not-allowed');
  if (o.cutoff && m.pubDate && String(m.pubDate).slice(0, 10) > o.cutoff) flags.push('after-cutoff');
  if (!m.pubDate) flags.push('undated');
  var state = 'ok';
  if (flags.indexOf('no-source') !== -1 || flags.indexOf('source-not-allowed') !== -1) {
    state = 'unverified';
  } else if (flags.length) state = 'flagged';
  return { state: state, flags: flags, source: m.source || null, pubDate: m.pubDate || null };
}

// A harvested record's `fact` field can pack several source sections into one
// string, bounded by "=== Section name ===" markers. That is why the "Caste
// system" row reads "Colin Mackenzie ... 18th-century India. === During British
// rule (1857 to 1947) === Although the varnas..." -- a block, not a sentence.
// One such block rides a deep entity's IDF to the top on a word buried in its
// tail ("developments" inside the British-rule section), and the block itself
// prints its "===" markers verbatim as prose. Split at the markers so ranking
// and display both see the value sentences individually; the section headers
// are navigation, not content, so they are consumed by the split, not shown.
var SECTION_MARKER = /\s*===\s*[^=]{1,300}\s*===\s*/g;
function splitSectionBlocks(text) {
  return String(text || '')
    .split(SECTION_MARKER)
    .map(function (p) {
      // A malformed source block can leave a dangling section opener with no
      // closing marker: "... India. === Contemporary" -- strip that too.
      p = p.replace(/\s*===\s*[A-Za-z0-9'’\- ]*\s*$/g, '');
      return p.replace(/[=\s]+$/g, '').trim();
    })
    .filter(function (p) { return p.length >= 15; });
}

// Rows are [entity, sentences, categories, meta?] as built by
// scripts/build-ask-qb.js. Grouped by normalised entity name for O(1) lookup.
function indexRows(rows) {
  var byName = {};
  var order = [];
  (rows || []).forEach(function (row) {
    if (!row || !row[0] || !row[1]) return;
    var key = qb.norm(row[0]);
    if (!key) return;
    if (!byName[key]) { byName[key] = []; order.push(key); }
    var meta = row[3] || null;
    row[1].forEach(function (s, i) {
      var m = Array.isArray(meta) ? (meta[i] || {}) : (meta || {});
      splitSectionBlocks(s).forEach(function (frag) {
        byName[key].push({ entity: row[0], sentence: frag, cats: row[2] || [], meta: m });
      });
    });
  });
  return { byName: byName, order: order };
}

// Resolve one claim term to a corpus entity.
//
// The entity table is authoritative and is consulted FIRST, before the slice is
// searched at all. That ordering matters: `lookup` normalises, so "Bab-el-Mandeb"
// and "bab el mandeb" are one lookup, and it returns category ids rather than a
// row index, which means a claim can be recognised as present in the corpus even
// when the slice built on this machine does not contain it. Searching the slice
// first and reporting a miss produced two wrong "no corpus entity" gaps, for
// "bab el mandeb" and "supply chain", both of which are in the table.
//
// What counts as support is deliberately narrow:
//   exact  -- the table holds an entity with exactly this name.
// A prefix match is never treated as support. `prefixLookup("sagar")` returns
// "sagar island", "sagar khera" and "sagara yoshihi", none of which is the SAGAR
// maritime vision; accepting one would reproduce the original defect elsewhere.
// Near-misses are returned for display only, so a reader checking a gap sees what
// the corpus does have.
function resolveEntity(term, idx, entityDir) {
  var norm = qb.norm(term);
  if (!norm) return null;

  if (entityDir) {
    var ids = entityDir.lookup(term);
    if (ids) {
      var rows = idx.byName[norm] || [];
      return {
        name: rows.length ? rows[0].entity : norm,
        rows: rows,
        how: 'exact',
        cats: ids
      };
    }
    // A subject often wraps the real entity rather than being it: "equitable
    // access to justice" wraps "Access to justice". Exact lookup fails on the
    // wrapper even though the corpus holds the sentence, so unwind to the
    // entity the subject's own window names.
    //
    // The unwrap is deliberately narrow so it cannot reproduce the prefix
    // defect this module exists to prevent. A subject that STARTS with the
    // entity is a truncation, not a wrapper: "Fazl Ali Commission" is not the
    // person "Fazl Ali", and treating it as one is how a Commission question
    // came to exclude the States Reorganisation material that actually answers
    // it. A name the subject carries further along, with its own leading
    // tokens before it, is the wrapper case -- "equitable" in "equitable
    // access to justice" does not rename "Access to justice", it modifies it.
    var cands = entityDir.candidates(term);
    for (var ci = 0; ci < cands.length; ci++) {
      var cand = cands[ci];
      if (!cand.strong) break;
      var cn = qb.norm(cand.name);
      var at = norm.indexOf(cn);
      if (at <= 0) break;                // prefix or exact -- not a wrapper
      var crow = idx.byName[cn] || [];
      return {
        name: crow.length ? crow[0].entity : cand.name,
        rows: crow,
        how: 'exact',
        cats: cand.cats,
        near: null
      };
    }
    return null;
  }

  // No table: fall back to the slice, exact match only.
  var rows2 = idx.byName[norm];
  if (rows2 && rows2.length) return { name: rows2[0].entity, rows: rows2, how: 'exact' };
  var weak = [];
  idx.order.forEach(function (key) {
    if (key.indexOf(norm + ' ') !== 0) return;
    weak.push({ name: idx.byName[key][0].entity, rows: idx.byName[key] });
  });
  if (!weak.length) return null;
  return { name: weak[0].name, rows: weak[0].rows, how: 'qualifier', near: weak };
}

// Nearest entity names for a term that did not resolve, so a gap can be shown
// with something concrete rather than as a bare "no match".
function nearMisses(term, entityDir, limit) {
  if (!entityDir) return [];
  var out = [];
  try {
    var res = entityDir.candidates(term);
    if (res && res.length) {
      for (var i = 0; i < res.length && out.length < (limit || 5); i++) {
        var nm = res[i] && (res[i].name || res[i]);
        if (nm) out.push(nm);
      }
    }
  } catch (e) { /* a missing near-miss list must not fail the retrieval */ }
  return out;
}

var DEFAULTS = {
  perPoint: 3,
  minSupport: 2,
  cutoff: null,
  allowSources: null,
  requireTrusted: false
};

// Retrieve evidence for a required claim, entity-anchored.
//
// A claim is `supported` only when its term resolves to a corpus entity AND that
// entity contributes enough distinct sentences. Everything else is a gap, with
// the reason attached.
function claimEvidence(term, idx, entityDir, opts, question) {
  var res = resolveEntity(term, idx, entityDir);
  if (!res) {
    return {
      term: term,
      resolved: false,
      supported: false,
      how: null,
      entity: null,
      evidence: [],
      near: nearMisses(term, entityDir, 5)
    };
  }
  // A corpus entity's own sentences are about the entity, but they are not all
  // about the question. "Social exclusion" holds the EU definition next to a
  // sentence on fathers' roles and one on 2024 Olympic opening ceremonies: all
  // three are verbatim corpus, and all three are on the entity, so a belief that
  // entity == relevance quotes the junk into an exam answer. The question's
  // content tokens are the discriminator -- a sentence carrying them, or a stem
  // of them, is the continuation the question can actually use.
  var qToks = contentTokens(question || '').filter(function (w) { return w.length >= 4; });
  var seen = {};
  var scoredBatch = [];
  for (var i = 0; i < res.rows.length; i++) {
    var r = res.rows[i];
    var key = r.sentence.slice(0, 160);
    if (seen[key]) continue;
    var t = trust(r.meta, opts);
    if (opts.requireTrusted && t.state === 'unverified') continue;
    seen[key] = 1;
    scoredBatch.push({ r: r, t: t });
  }
  // Relevance first, corpus order among equals (Array#sort is stable in the
  // engines this runs on), so an on-topic continuation outranks an off-topic
  // row that happened to be harvested earlier in the record.
  //
  // Raw counts flatten on a deep entity: "Caste system in India" holds 462
  // sentences and nearly every one contains "caste" or "india", so a count of
  // question-token hits rates "a social historian of Indian religions" above a
  // sentence on affirmative action for scheduled castes. The question tokens
  // are instead weighted inside this entity's own corpus: a token that appears
  // in every sentence ("india") discriminates nothing, one that appears in a
  // few ("exclusion") is exactly the value continuation asked for. Weight uses
  // the inside-corpus document frequency, not the entity frequency cap the
  // name index ran into, because this table is already a resolved entity and
  // needs no ranking across names at all.
  var df = {};
  var distinct = [];
  scoredBatch.forEach(function (s) { distinct.push(contentTokens(s.r.sentence)); });
  qToks.forEach(function (q) {
    var n = 0;
    distinct.forEach(function (st) { if (qb.hasStemLoose(st, q)) n++; });
    df[q] = n;
  });
  var nRows = Math.max(1, distinct.length);
  scoredBatch.forEach(function (s) {
    var st = contentTokens(s.r.sentence);
    var score = 0;
    qToks.forEach(function (q) {
      if (qb.hasStemLoose(st, q)) score += Math.log(nRows / (1 + df[q]));
    });
    s.score = score;
  });
  scoredBatch.sort(function (a, b) { return b.score - a.score; });
  var picked = [];
  for (var j = 0; j < scoredBatch.length && picked.length < opts.perPoint; j++) {
    var s = scoredBatch[j];
    picked.push({
      sentence: s.r.sentence,
      entity: res.name,
      cats: s.r.cats,
      trust: s.t,
      how: res.how
    });
  }
  return {
    term: term,
    // A qualifier resolution is a real corpus entity but a weaker identification
    // than an exact one, so it does not by itself count as support.
    resolved: true,
    supported: res.how === 'exact' && picked.length >= opts.minSupport,
    how: res.how,
    entity: res.name,
    evidence: picked,
    near: res.near ? res.near.map(function (w) { return w.name; }) : []
  };
}

// Assemble a mains answer's evidence from its required points.
//
// `points` is a list of [label, term, alternates?]. `alternates` lets a claim name
// several ways the corpus might phrase it, e.g. Bab-el-Mandeb as "Bab el Mandeb",
// without the caller having to know the corpus's spelling.
function retrieve(rows, question, points, entityDir, options) {
  var opts = {};
  Object.keys(DEFAULTS).forEach(function (k) { opts[k] = DEFAULTS[k]; });
  Object.keys(options || {}).forEach(function (k) { opts[k] = options[k]; });

  var idx = indexRows(rows);
  var out = {
    question: String(question == null ? '' : question),
    concepts: decompose(question),
    points: [],
    gaps: [],
    covered: 0,
    total: (points || []).length,
    // Three separate counts, because conflating them is what produced a
    // confident wrong answer: `absent` claims the corpus lacks the entity,
    // `unquoted` claims it has one whose evidence was not loaded, and only
    // `covered` is backed by sentences actually shown.
    absent: 0,
    unquoted: [],
    evidence: 0,
    provenance: { ok: 0, flagged: 0, unverified: 0 },
    entitiesResolved: 0,
    note: 'Each claim is resolved to a corpus entity and answered with that ' +
      "entity's own sentences, quoted verbatim from the record's `fact` field. " +
      'The corpus does not state the links between claims, so those must be ' +
      'argued from the cited sentences; this module does not assert them.'
  };

  // Keyed by label so a composer can look up its own heading without depending on
  // the order the caller happened to supply.
  var byLabel = {};

  (points || []).forEach(function (p) {
    var label = p[0];
    var terms = [p[1]].concat(p[2] || []).filter(Boolean);
    var attempts = [];
    var winner = null;
    for (var i = 0; i < terms.length && !winner; i++) {
      var got = claimEvidence(terms[i], idx, entityDir, opts, question);
      attempts.push(got);
      if (got.supported) winner = got;
    }
    if (!winner) {
      // No spelling produced support. Report the best attempt so the gap shows
      // what WAS found, which distinguishes "absent from the corpus" from
      // "present but not quotable". These are different claims: a claim whose
      // entity exists but whose shard was not loaded has not been refuted, and
      // must not be listed as a gap in the corpus.
      var best = null;
      attempts.forEach(function (a) {
        if (!a.resolved) return;
        if (!best || a.evidence.length > best.evidence.length) best = a;
      });
      var partial = {
        label: label,
        terms: terms,
        supported: false,
        resolved: best ? best.entity : null,
        how: best ? best.how : null,
        // How much text was actually found, so the composer can say whether the
        // evidence was never fetched or fetched and found too thin. Those are
        // different faults and the reader is told which one applies.
        picked: best ? best.evidence.length : 0,
        evidence: best ? best.evidence : [],
        near: best ? best.near : (attempts[0] && attempts[0].near) || []
      };
      out.points.push(partial);
      byLabel[label] = partial;
      if (!best) {
        // Genuinely absent: no entity of any attempted spelling exists.
        out.gaps.push({ kind: 'point', label: label, terms: terms, resolved: null,
          near: (attempts[0] && attempts[0].near) || [] });
        out.absent++;
      } else {
        // Present but unsupported here. Tracked separately so it is neither
        // counted as coverage nor reported as a hole in the corpus.
        out.unquoted.push({ kind: 'point', label: label, terms: terms, resolved: best.entity,
          picked: best.evidence.length });
      }
      return;
    }
    out.covered++;
    out.entitiesResolved++;
    var full = {
      label: label,
      terms: terms,
      supported: true,
      resolved: winner.entity,
      how: winner.how,
      evidence: winner.evidence
    };
    out.points.push(full);
    byLabel[label] = full;
    winner.evidence.forEach(function (e) {
      out.evidence++;
      if (e.trust.state === 'ok') out.provenance.ok++;
      else if (e.trust.state === 'flagged') out.provenance.flagged++;
      else out.provenance.unverified++;
    });
  });

  out.byLabel = byLabel;
  return out;
}

return {
  contentTokens: contentTokens,
  decompose: decompose,
  trust: trust,
  indexRows: indexRows,
  resolveEntity: resolveEntity,
  nearMisses: nearMisses,
  claimEvidence: claimEvidence,
  retrieve: retrieve
};
}));
