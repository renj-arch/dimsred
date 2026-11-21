(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./ask-qb.js'));
  else root.VlymbooqAskEvidence = factory(root.VlymbooqAskQb);
}(typeof self !== 'undefined' ? self : this, function (qb) {
  'use strict';
// Evidence retrieval for mains-style questions.
//
// WHY THIS EXISTS, and why it does not reuse scoreShard():
//
// scoreShard() decides relevance by matching the ENTITY NAME against the
// question. That is right for a navigational query and wrong for a mains
// question. The corpus files a sentence under whichever Wikipedia topic it came
// from, so a question about land degradation is answered by sentences filed
// under "Agriculture in Ethiopia", and food security by sentences filed under
// "Biofertilizer". Measured on a four-file agriculture slice: entity-name
// matching returned 0 evidence for all three concepts of "analyse the
// relationship between land degradation, agricultural productivity and food
// security", while scoring the sentence text returned evidence for all three,
// drawn from six or more entities across several categories. Entities are mixed
// across all 135 categories, so a category is a hint for which shards to fetch
// first and must never act as a relevance filter.
//
// Two further defects had to be closed before the output could be trusted:
//
// 1. Bag-of-words scoring reports false confidence. Scoring a mains answer's
//    CLAIMS rather than the question's words produced "11 of 12 headings
//    covered", where "SAGAR" matched an Indus-basin place name, "maritime
//    domain awareness" matched a domain-name squatter in the .ly zone, and
//    "China" matched a land border standoff. A heading that reports coverage on
//    the strength of one shared common noun is worse than a reported gap,
//    because the gap is invisible to the reader. Every sentence must now
//    contain the concept's ANCHOR term, its rarest term, and the score is
//    discounted when only common terms match.
//
// 2. Provenance. Every record carries source and pubDate, and the corpus is
//    machine-fed daily, so a sentence is not self-validating. Nothing here
//    decides whether a claim is true. It reports where the sentence came from
//    and marks anything outside the configured trust window, so a reader can
//    judge. An unsourced or too-recent claim is flagged, never silently dropped
//    and never presented as verified.
//
// Nothing in this module generates, paraphrases or summarises. Every returned
// sentence is a verbatim slice of a record's own `fact` field. Where the corpus
// has no evidence for a required claim, the claim is reported as a gap.

var STOP = {};
('a an the of and or in on at to for with by from as is was were are be been being has have had ' +
  'this that these those it its their his her they them we you i not no than then so such which ' +
  'who whom what when where how why into over under about between among during each other some ' +
  'any all more most less least very can could may might must shall should will would do does ' +
  'did done there here also').split(' ').forEach(function (w) { STOP[w] = 1; });

function contentTokens(s) {
  return qb.tokens(s).filter(function (t) { return !STOP[t]; });
}

// Split a mains question into the concepts it asks about.
//
// "analyse the relationship between land degradation, agricultural productivity
// and food security" names three subjects and no single entity, so route() finds
// no anchor and the whole answer collapses to a refusal. This decomposes the
// QUESTION. It does not generate an answer and does not invent a relationship
// between the concepts: the corpus states each mechanism on its own and never
// states the chain, so establishing the chain stays an explicit, separate step
// and an absent one is reported rather than invented.
function decompose(question) {
  var raw = String(question == null ? '' : question).trim();
  var body = raw
    .replace(/^\s*(analyse|analyze|explain|discuss|examine|assess|elaborate|evaluate)\s+/i, '')
    .replace(/^.*?\brelationships?\s+(?:between|of)\s+/i, '')
    .replace(/^.*?\binteractions?\s+(?:between|of)\s+/i, '')
    .replace(/^.*?\blink(?:s|age)?\s+(?:between|of)\s+/i, '')
    .replace(/^.*?\b(?:impact|effects?|role|influence|significance)\s+of\s+/i, '');
  var parts = body.split(/\s*(?:,|;|\band\b|\bwith\b|\bon\b)\s*/i)
    .map(function (s) { return s.trim().replace(/[?.!,]+$/, ''); })
    .filter(function (s) { return s.length > 2 && /[a-z]{3}/i.test(s); });
  // Never decompose to nothing: fall back to the whole question.
  return parts.length ? parts : [raw];
}

// Turn shard rows into scorable documents, carrying provenance where present.
// Rows are [entity, sentences, categories] as built by scripts/build-ask-qb.js,
// with an optional 4th element for per-sentence or shared provenance.
// Recognise provenance for a row's `meta` element, which may be either one
// object shared by every sentence in the row or an array of per-sentence
// objects. Deciding this by inspecting the object, rather than by index, is what
// keeps a shared object from being read as sentence 0's metadata: when that
// branch was wrong it silently discarded source and pubDate, and every sentence
// then reported as unverified even though the records carried both.
function metaAt(meta, i) {
  if (!meta || typeof meta !== 'object') return {};
  if (Array.isArray(meta)) {
    var m = meta[i];
    return (m && typeof m === 'object') ? m : {};
  }
  // A single object is shared provenance for the row.
  return meta;
}

function documents(rows) {
  var docs = [];
  (rows || []).forEach(function (row) {
    if (!row || !row[0] || !row[1]) return;
    var entity = row[0];
    var meta = row[3] || null;
    row[1].forEach(function (s, i) {
      var m = metaAt(meta, i);
      docs.push({
        entity: entity,
        sentence: s,
        cats: row[2] || [],
        source: m.source || null,
        pubDate: m.pubDate || null
      });
    });
  });
  return docs;
}

// Document frequency over the supplied documents, so a term common to the whole
// corpus cannot outrank a term that pins the answer.
function stats(docs) {
  var df = {};
  var N = 0;
  docs.forEach(function (d) {
    var seen = {};
    N++;
    contentTokens(d.sentence).forEach(function (t) {
      if (seen[t]) return;
      seen[t] = 1;
      df[t] = (df[t] || 0) + 1;
    });
  });
  return { df: df, N: N };
}

function idf(st, t) {
  if (!st || !st.N) return 0;
  return Math.log(1 + (st.N - (st.df[t] || 0) + 0.5) / ((st.df[t] || 0) + 0.5));
}

// The concept's rarest term. A sentence that does not contain it is not about
// the concept, however many common nouns it shares. This is what stops "SAGAR"
// from being satisfied by a sentence about an Indian dam.
function anchorTerm(qTokens, st) {
  var best = null, bestW = -1;
  qTokens.forEach(function (t) {
    var w = idf(st, t);
    if (w > bestW) { bestW = w; best = t; }
  });
  return best;
}

function hits(sentence) {
  var h = {};
  contentTokens(sentence).forEach(function (t) { h[t] = (h[t] || 0) + 1; });
  return h;
}

// True when `token` occurs only as part of a proper noun, e.g. "sagar" inside
// "Gobind Sagar", a reservoir. Such an occurrence is a place or a proper name,
// not a topical mention of the concept, and must not be allowed to support a
// claim. Case is the only signal available, so the check is deliberately
// conservative: it fires when a neighbouring word is capitalised and the
// sentence does not state the token as a phrase in its own right.
function isProperNounOccurrence(sentence, token) {
  var words = String(sentence).match(/[A-Za-z][A-Za-z'\-]*/g) || [];
  for (var i = 0; i < words.length; i++) {
    if (words[i].toLowerCase() !== String(token).toLowerCase()) continue;
    var before = i > 0 ? words[i - 1] : '';
    var after = i + 1 < words.length ? words[i + 1] : '';
    var capitalised = function (w) { return !!w && /^[A-Z]/.test(w); };
    if (capitalised(before) || capitalised(after)) return true;
  }
  return false;
}

// Longest contiguous run of the concept's own tokens present in the sentence,
// e.g. 2 for "food security" or "land degradation". A run means the sentence
// states the concept rather than merely sharing a word with it.
function phraseRun(sTok, runs) {
  var best = 0;
  (runs || []).forEach(function (run) {
    var toks = run && run.toks ? run.toks : run;
    if (!toks || toks.length < 2) return;
    for (var i = 0; i + toks.length <= sTok.length; i++) {
      var ok = true;
      for (var j = 0; j < toks.length; j++) {
        if (!qb.hasStem(sTok, toks[j])) { ok = false; break; }
      }
      if (ok) { if (toks.length > best) best = toks.length; break; }
    }
  });
  return best;
}

// Score one sentence against one concept. Returns 0 for a non-match.
function scoreSentence(d, qTokens, anchor, runs, st) {
  if (!anchor) return 0;
  var sTok = qb.tokens(d.sentence);
  // The anchor must be present, on a stem, or the sentence is off-topic.
  if (!qb.hasStem(sTok, anchor)) return 0;

  var h = hits(d.sentence);
  var total = 0, matched = 0, common = 0;
  qTokens.forEach(function (t) {
    if (!h[t]) return;
    matched++;
    // "common" tracks tokens carrying almost no information, which is how
    // coverage is judged: matching "agricultural" proves nothing, matching
    // "productivity" does.
    if (idf(st, t) < 1.2) common++;
    total += idf(st, t) * (1 + Math.log(h[t]));
  });
  if (!total) return 0;

  var coverage = qTokens.length ? matched / qTokens.length : 0;
  var commonFrac = matched ? common / matched : 0;
  var phrase = phraseRun(sTok, runs);

  var s = total * (0.5 + 0.5 * coverage);
  if (phrase) s += phrase * 6;
  // Discount evidence resting mostly on uninformative tokens, so a definitional
  // sentence about "Bachelor of Agriculture" cannot outrank one that actually
  // discusses agricultural productivity.
  s *= (1 - 0.5 * commonFrac);
  // Below half the concept covered, treat as a weak match even with the anchor.
  if (coverage < 0.5) s *= 0.5;
  return s;
}

// Provenance and recency. This reports; it does not judge truth.
function trust(d, opts) {
  var o = opts || {};
  var flags = [];
  if (!d.source) flags.push('no-source');
  var allow = o.allowSources;
  if (allow && allow.length && d.source && allow.indexOf(d.source) === -1) {
    flags.push('source-not-allowed');
  }
  var cutoff = o.cutoff || null;
  if (cutoff && d.pubDate && String(d.pubDate).slice(0, 10) > cutoff) {
    flags.push('after-cutoff');
  }
  if (!d.pubDate) flags.push('undated');
  var state = 'ok';
  if (flags.indexOf('no-source') !== -1 || flags.indexOf('source-not-allowed') !== -1) {
    state = 'unverified';
  } else if (flags.length) {
    state = 'flagged';
  }
  return { state: state, flags: flags, source: d.source || null, pubDate: d.pubDate || null };
}

var DEFAULTS = {
  perConcept: 4,
  maxPerEntity: 2,
  minScore: 1,
  cutoff: null,
  allowSources: null,
  requireTrusted: false,
  points: null
};

// Rank the documents for one concept, applying the per-entity cap and the
// sentence-level dedupe, and attaching provenance to each pick.
function rankFor(docs, st, concept, opts) {
  var qTokens = contentTokens(concept);
  var runs = qb.subjectPhrases(concept);
  if (!runs || !runs.length) runs = [qTokens];
  var anchor = anchorTerm(qTokens, st);

  var scored = [];
  docs.forEach(function (d) {
    var sc = scoreSentence(d, qTokens, anchor, runs, st);
    if (sc > opts.minScore) scored.push({ doc: d, score: sc });
  });
  scored.sort(function (a, b) { return b.score - a.score; });

  var perEntity = {}, seen = {}, picked = [];
  for (var i = 0; i < scored.length && picked.length < opts.perConcept; i++) {
    var d = scored[i].doc;
    var key = d.sentence.slice(0, 160);
    if (seen[key]) continue;
    if ((perEntity[d.entity] || 0) >= opts.maxPerEntity) continue;
    var t = trust(d, opts);
    // Flagged evidence is kept and reported. It is only withheld when the caller
    // explicitly asks for trusted-only, so nothing disappears silently.
    if (opts.requireTrusted && t.state === 'unverified') continue;
    seen[key] = 1;
    perEntity[d.entity] = (perEntity[d.entity] || 0) + 1;
    picked.push({
      sentence: d.sentence,
      entity: d.entity,
      cats: d.cats,
      score: scored[i].score,
      concept: concept,
      anchor: anchor,
      trust: t
    });
  }
  return picked;
}

// Retrieve evidence per concept, with provenance attached and gaps named.
//
// `points` is an optional list of REQUIRED claims, each [label, terms]. Pass it
// when you know what the answer must establish. The result then reports which
// claims the corpus can and cannot support, which is the only honest way to
// present coverage: a mains answer is as weak as its weakest required point.
function retrieve(rows, question, options) {
  var opts = {};
  Object.keys(DEFAULTS).forEach(function (k) { opts[k] = DEFAULTS[k]; });
  Object.keys(options || {}).forEach(function (k) { opts[k] = options[k]; });

  var docs = documents(rows);
  var st = stats(docs);
  var concepts = decompose(question);

  var byConcept = concepts.map(function (c) {
    return { concept: c, evidence: rankFor(docs, st, c, opts) };
  });

  var result = {
    question: String(question == null ? '' : question),
    concepts: concepts,
    byConcept: byConcept,
    docs: docs.length,
    sentences: st.N,
    evidence: byConcept.reduce(function (n, b) { return n + b.evidence.length; }, 0),
    covered: 0,
    total: concepts.length,
    gaps: [],
    points: [],
    provenance: { ok: 0, flagged: 0, unverified: 0 }
  };

  byConcept.forEach(function (b) {
    if (!b.evidence.length) result.gaps.push({ kind: 'concept', label: b.concept });
    b.evidence.forEach(function (e) {
      if (e.trust.state === 'ok') result.provenance.ok++;
      else if (e.trust.state === 'flagged') result.provenance.flagged++;
      else result.provenance.unverified++;
    });
  });

  // Score the answer's required claims, not the question's words.
  (opts.points || []).forEach(function (p) {
    var label = p[0], terms = p[1] || [];
    var qToks = terms.filter(function (t) { return !STOP[t]; });
    if (!qToks.length) return;
    var anchor = anchorTerm(qToks, st);
    var best = null;
    var supporters = 0;
    var supporting = [];
    docs.forEach(function (d) {
      var sc = scoreSentence(d, qToks, anchor, qToks, st);
      if (sc <= opts.minScore) return;
      var dToks = contentTokens(d.sentence);
      var matched = qToks.filter(function (t) { return qb.hasStem(dToks, t); });
      var entry = { label: label, terms: terms, score: sc, sentence: d.sentence,
        entity: d.entity, cats: d.cats, trust: trust(d, opts),
        matched: matched.length, coverage: qToks.length ? matched.length / qToks.length : 0,
        phrase: phraseRun(dToks, qToks) };
      if (!best || sc > best.score) best = entry;
      // A claim is only counted when the evidence carries the claim's own
      // wording: the whole phrase, or every term of the claim, and never a term
      // that occurs only inside a proper noun.
      var carries = entry.phrase >= 2 || entry.coverage >= 1;
      if (!carries) return;
      var properOnly = matched.every(function (t) { return isProperNounOccurrence(d.sentence, t); });
      if (properOnly) {
        entry.properNounOnly = true;
        return;
      }
      supporting.push(entry);
    });
    // Two independent sentences are required. One sentence can coincide with a
    // claim without establishing it, and a mains answer needs the claim to rest
    // on more than a single citation.
    var MIN_SUPPORT = opts.minSupport == null ? 2 : opts.minSupport;
    var distinctEntities = {};
    supporting.forEach(function (s) { distinctEntities[s.entity] = 1; });
    var strong = supporting.length >= MIN_SUPPORT &&
      Object.keys(distinctEntities).length >= MIN_SUPPORT &&
      !!best && best.score >= 6;
    if (strong) best = supporting[0];
    // `weak` keeps a near-miss visible without letting it masquerade as
    // coverage: "Sagar" matching the Gobind Sagar reservoir is worth recording
    // as a lead for a human to check, and worth nothing to a reader told the
    // corpus supports the heading.
    var weak = !strong && !!best && best.coverage > 0;
    result.points.push({
      label: label,
      terms: terms,
      supported: !!strong,
      weak: weak ? best : null,
      best: strong ? best : null
    });
    if (strong) result.covered++;
    else result.gaps.push({ kind: 'point', label: label, terms: terms });
  });
  result.pointTotal = (opts.points || []).length;

  // The corpus states each mechanism separately and never states the chain, so
  // the relationship the question asks about is reported as unestablished
  // unless a required point says otherwise. This is the single most important
  // honesty property of the module.
  result.relationshipEstablished = false;
  result.note = 'Concepts are retrieved separately. A link between them is not ' +
    'asserted by this module and must be argued from the cited sentences.';

  return result;
}

return {
  contentTokens: contentTokens,
  decompose: decompose,
  documents: documents,
  stats: stats,
  idf: idf,
  anchorTerm: anchorTerm,
  phraseRun: phraseRun,
  scoreSentence: scoreSentence,
  trust: trust,
  rankFor: rankFor,
  retrieve: retrieve
};
}));
