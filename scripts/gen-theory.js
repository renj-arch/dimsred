/*
 * gen-theory.js -- the THEORY layer: what a candidate must understand about a
 *                  topic, as opposed to what happens to be connected to it.
 *
 * THE PROBLEM THIS SOLVES
 * -----------------------
 * The graph layer answers "what is connected to X?" and for Volcano it returns
 * 261 co-occurrence neighbours, of which the largest are
 *
 *   Hawaii(130) Mauna Loa(56) Chile(41) Ecuador(34) Alaska(33) Philippines(32)
 *   Iceland(31) Tenerife(27) Krakatoa(23) Naples(21) Canary Islands(21) Spain(20)
 *
 * That is a good discovery list and a useless syllabus. Worse, the shard each
 * neighbour came from shows it is question co-occurrence, not meaning:
 * `women-society-10|Ecuador` and `courts-cases-verdicts-33|Alaska` sit in the
 * same list as Krakatoa, and the descriptions attached to them are the ones that
 * produce output like
 *
 *   Italy ... established in _____, following wars of independence
 *   Tenerife ... Tenerife is dominated by Teide...
 *
 * The corpus also reports "World Geography 760+" as a branch. That number is
 * sum(count) over 758 category rows collapsing to 69 distinct labels -- a
 * measure of how much material exists, not of what to learn. Here it is
 * reported as corpus-relevance evidence and never rendered as a branch.
 *
 * THE PIPELINE
 * ------------
 *   raw corpus
 *     -> entity resolution        (GAZ.resolveType)
 *     -> relation/discovery       (typed edges, co-occurrence, semantic scan)
 *     -> DESCRIPTION QUALITY GATE (lib/fact-gate.js)   <-- the hard boundary
 *     -> FACT
 *     -> theory extraction        (lib/theory-frame.js slots + dimensions)
 *     -> MAINS node
 *
 * Nothing downstream of the quality gate may read a raw `n.desc`. Slots with no
 * surviving evidence are printed as NEEDS SOURCE rather than filled in, which
 * is the whole point: a shorter honest tree beats a complete fabricated one.
 *
 * PROVENANCE IS SHOWN, NOT ASSUMED
 * --------------------------------
 *   [ASSERTED] a gated fact stated by a named source node
 *   [DERIVED]  an association inferred from typed edges or co-occurrence
 *   [NEEDS SOURCE] the corpus cannot support this; a human must supply it
 *
 * USAGE
 *   node --max-old-space-size=8192 scripts/gen-theory.js "Volcano"
 *   node --max-old-space-size=8192 scripts/gen-theory.js "Volcano" --json
 *   node --max-old-space-size=8192 scripts/gen-theory.js "Volcano" --write
 */
'use strict';

var fs = require('fs');
var path = require('path');
var FG = require('./lib/fact-gate.js');
var TF = require('./lib/theory-frame.js');
var GAZ = require('./lib/entity-gazetteer.js');

var ROOT = path.join(__dirname, '..');
function p() { return Array.prototype.slice.call(arguments).join(' '); }
function readJSON(rel) { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')); }
function arg(flag) { var i = process.argv.indexOf(flag); return i >= 0; }
function argVal(flag, d) { var i = process.argv.indexOf(flag); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; }

// ---------------------------------------------------------------- load graph
function loadGraph() {
  var t = readJSON('data/timeline.json');
  var nodes = [];
  for (var i = 0; i < 10; i++) {
    var j = readJSON('data/timeline.nodes.' + i + '.json');
    nodes = nodes.concat(j.nodes || j);
  }
  // Lean projection. The raw records carry `cats` arrays of up to 758 objects;
  // collapsing each to a label->count map cuts memory sharply and is all the
  // theory layer needs from them.
  var lean = new Array(nodes.length);
  var byId = Object.create(null), byName = Object.create(null);
  var lex = new Set(), termFreq = Object.create(null);
  for (var k = 0; k < nodes.length; k++) {
    var n = nodes[k];
    var cats = null;
    if (n.cats && n.cats.length) {
      cats = Object.create(null);
      for (var c = 0; c < n.cats.length; c++) {
        var lb = n.cats[c].label;
        cats[lb] = (cats[lb] || 0) + (n.cats[c].count || 0);
      }
    }
    var rec = {
      id: n.id, name: n.name,
      // `type` is the field GAZ.resolveType() reads -- naming it rawType here
      // silently degraded every entity to `misc`, which disabled the domain
      // gate and let co-occurrence noise through as theory. rawType is kept as
      // an alias purely for reporting.
      type: n.type || '', rawType: n.type || '',
      desc: n.desc || '',
      count: n.count || 0, era: n.era || '', level: n.level,
      span: n.span || null, cats: cats
    };
    lean[k] = rec;
    byId[n.id] = rec;
    var nm = String(n.name || '').toLowerCase();
    (byName[nm] || (byName[nm] = [])).push(rec);
    // Vocabulary for the truncation heuristic: only 3-6 letter tokens matter.
    var toks = String(n.desc || '').toLowerCase().match(/[a-z]{3,6}/g);
    if (toks) for (var a = 0; a < toks.length; a++) lex.add(toks[a]);
    // Global term frequency, for IDF in related-topic discovery.
    var big = String(n.desc || '').toLowerCase().match(/[a-z]{5,}/g);
    if (big) for (var b = 0; b < big.length; b++) {
      termFreq[big[b]] = (termFreq[big[b]] || 0) + 1;
    }
  }
  // adjacency for edge-signature type resolution
  var adj = Object.create(null);
  (t.edges || []).forEach(function (e) {
    (adj[e.a] || (adj[e.a] = [])).push({ to: e.b, r: e.rel });
    (adj[e.b] || (adj[e.b] = [])).push({ to: e.a, r: e.rel });
  });
  return { nodes: lean, byId: byId, byName: byName, lex: lex, termFreq: termFreq, links: t.links || [], edges: t.edges || [] };
}

// ------------------------------------------------------------- topic resolve
function resolveTopic(G, topic) {
  var q = String(topic).toLowerCase().trim();
  var exact = G.byName[q] || [];
  if (exact.length) {
    // Prefer the most corroborated node, then the one whose type is not the
    // useless default.
    exact.sort(function (a, b) {
      var ta = (a.rawType && a.rawType !== 'concept') ? 1 : 0;
      var tb = (b.rawType && b.rawType !== 'concept') ? 1 : 0;
      return (tb - ta) || (b.count - a.count);
    });
    return { node: exact[0], ambiguous: exact.length > 1, candidates: exact };
  }
  // Fall back to the closest name, so "Mauna Loa " or "Crater Lake" still work.
  //
  // Every query word has to be present, and a plain substring test is not
  // enough to rank the survivors. The old score was min(len(name), len(query)),
  // which saturates at the query length for every longer name -- so all
  // candidates tied and whichever came first won. That is how the query "Soils"
  // landed on "International Year of Soils" and "Drainage Systems" on
  // "Advanced Drainage Systems". Ranking by how close the name is in length,
  // with a bonus for containing the query as one contiguous phrase, at least
  // prefers the most specific name available.
  var qToks = q.split(/[^a-z0-9]+/).filter(function (w) { return w.length >= 3; });
  var best = null, bestScore = -1;
  Object.keys(G.byName).forEach(function (nm) {
    if (!nm) return;
    var nToks = nm.split(/[^a-z0-9]+/);
    var hit = 0;
    qToks.forEach(function (w) { if (nToks.indexOf(w) >= 0) hit++; });
    if (!hit || (qToks.length && hit < qToks.length)) return;
    var s = (nm.indexOf(q) >= 0 ? 2000 : 1000) - Math.abs(nm.length - q.length);
    if (s > bestScore) { bestScore = s; best = G.byName[nm][0]; }
  });
  if (!best) return null;
  // A stand-in that carries words the query never used is a poor one, whatever
  // its length. Comparing length was not enough: "Advanced Drainage Systems" is
  // 25 characters for the 16-character query "Drainage Systems", so it looked
  // fine, yet it contributed a generic head word that matched "Male reproductive
  // system". Comparing the word sets catches that, and also catches "Soils" ->
  // "International Year of Soils" and "Ganga" -> "Rang Mahal, Sri Ganganagar".
  var nToks2 = best.name.toLowerCase().split(/[^a-z0-9]+/).filter(function (w) { return w.length >= 3; });
  var weak = nToks2.length !== qToks.length ||
    nToks2.some(function (w) { return qToks.indexOf(w) < 0; });
  return { node: best, ambiguous: true, weak: weak, candidates: [best] };
}

// --------------------------------------------------------- member discovery
/**
 * Is this entity named after the topic?
 *
 * A name match is only a candidate, never evidence -- the fact gate still has
 * to accept the description. But the candidate list is user-visible under
 * GRAPH CONNECTIONS, so it must not be absurd.
 *
 * Comparison is per word, both sides stemmed, with no substring matching in
 * either direction. Substring matching is what made this wrong twice over. For
 * a single-word topic, "Ganga".indexOf("nal") is true, so Fin, FINE, Nal, Neal,
 * Deal and Inal were all admitted as members of a river. For a multi-word topic
 * the whole phrase was stemmed into one string, and "vegetation" contains the
 * substring "geta", which recruited Geta Bratescu and Geta (footwear).
 *
 * Words shorter than five characters are ignored, since "year" and "rang"
 * identify nothing. The floor is applied to the word as written, so a plural
 * like "soils" still stems to "soil" and still matches.
 */
function nameSharesTopic(name, topicStems) {
  if (!topicStems || !topicStems.length) return false;
  var toks = String(name || '').toLowerCase().split(/[^a-z0-9]+/);
  for (var i = 0; i < toks.length; i++) {
    if (toks[i].length < 5) continue;
    if (topicStems.indexOf(FG.stem(toks[i])) >= 0) return true;
  }
  return false;
}

function discoverMembers(G, topicRec, tv) {
  // Read the name off the resolved node, tokenised into stems. An earlier
  // version read a duplicate `name` field on the resolve result, which was
  // never populated, so the stem silently became the literal string
  // "undefined" -- and "undefined" contains "fine", so name-based discovery
  // admitted every "Fine*" node under any topic. It then stemmed the whole
  // phrase at once, which is the "vegetation"/"geta" bug documented on
  // nameSharesTopic.
  var topicStems = FG.topicTokens(topicRec.node.name);
  var strong = FG.vocabFor(topicRec.resolved.type);
  var weak = FG.weakVocabFor(topicRec.resolved.type);
  // Place-like types are allowed to qualify on WEAK vocabulary alone, because
  // "the summit of Mt X" legitimately describes a volcano without using the
  // word. A person or concept may not: "crust" and "plume" carry no authority
  // to pull a cricket club into a geology theory.
  var weakEligible = /place|country|state|city|region|river|mountain|island|volcano/.test(
    topicRec.resolved.type);
  var cooc = Object.create(null), edge = Object.create(null);
  var tl = topicRec.id;
  G.links.forEach(function (l) {
    if (l.a === tl) cooc[l.b] = (cooc[l.b] || 0) + (l.w || 1);
    else if (l.b === tl) cooc[l.a] = (cooc[l.a] || 0) + (l.w || 1);
  });
  G.edges.forEach(function (e) {
    if (e.a === tl) edge[e.b] = e.rel;
    else if (e.b === tl) edge[e.a] = e.rel;
  });

  var members = [];
  var seen = Object.create(null);
  function take(id, via) {
    if (id === tl || seen[id]) return;
    var rec = G.byId[id];
    if (!rec) return;
    seen[id] = 1;
    var nameHit = !topicRec.weak && nameSharesTopic(rec.name, topicStems);
    var strongHit = !!(strong && strong.test(rec.desc));
    var weakHit = !!(weak && weak.test(rec.desc));
    var descHit = strongHit || (weakHit && weakEligible);
    if (!nameHit && !descHit && !edge[id] && !cooc[id]) return;
    rec.resolved = GAZ.resolveType(rec, G.adjacency);
    var v = FG.evaluate(rec.desc, rec.name, rec.resolved.type, topicRec.node.name,
                         G.lex, strong, !!topicRec.weak);
    members.push({
      id: id, name: rec.name, type: rec.resolved.type, subtype: rec.resolved.subtype,
      why: rec.resolved.why, count: rec.count, desc: rec.desc, span: rec.span,
      via: edge[id] ? 'edge' : (nameHit ? 'name' : (strongHit ? 'desc' : (weakHit ? 'weak-desc' : 'cooccurrence'))),
      rel: edge[id] || null, coocW: cooc[id] || 0, gate: v
    });
  }
  Object.keys(edge).forEach(function (id) { take(id); });
  Object.keys(cooc).forEach(function (id) { take(id); });
  // Semantic sweep: the corpus also contains volcanoes that never co-occur
  // with the word "volcano" (Barren Island, Krakatoa, Lahar are found this way).
  G.nodes.forEach(function (rec) {
    if (seen[rec.id]) return;
    // Single letters and two-letter fragments are corpus noise ("F", "I",
    // "Dal"); they can never anchor a theory, and short-stem containment makes
    // them match almost anything.
    if (String(rec.name || '').length < 3) return;
    // When the topic node is only a rough stand-in for the query, a shared name
    // word is not evidence of anything. Asking for "Ganga" resolves to the
    // river "Adi Ganga", and the name sweep then recruited the Western Ganga
    // dynasty, Ganga Zumba and Dayavati Ganga Ram as if they were that river.
    // A shared token is not a shared entity, so the name route is switched off
    // and only descriptions that say something about the topic can join.
    if (!topicRec.weak && nameSharesTopic(rec.name, topicStems)) { take(rec.id); return; }
    if (strong && rec.desc && strong.test(rec.desc)) { take(rec.id); return; }
    if (weakEligible && weak && rec.desc && weak.test(rec.desc)) take(rec.id);
  });

  // Rank: asserted facts first, then evidence weight.
  members.sort(function (a, b) {
    var ga = a.gate.verdict === 'fact' ? 0 : (a.gate.verdict === 'weak' ? 1 : 2);
    var gb = b.gate.verdict === 'fact' ? 0 : (b.gate.verdict === 'weak' ? 1 : 2);
    return (ga - gb) ||
           ((b.coocW || 0) - (a.coocW || 0)) ||
           ((b.count || 0) - (a.count || 0)) ||
           a.name.localeCompare(b.name);
  });
  return members;
}

// ------------------------------------------------------------ theory builder
function buildTheory(G, topicRec, members) {
  var facts = members.filter(function (m) {
    return m.gate.verdict === 'fact' || m.gate.verdict === 'weak';
  });
  var off = members.filter(function (m) { return m.gate.verdict === 'offtopic'; });
  var rejected = members.filter(function (m) { return m.gate.verdict === 'reject'; });

  var ownGate = FG.evaluate(topicRec.node.desc, topicRec.node.name,
                            topicRec.resolved.type, topicRec.node.name, G.lex,
                            FG.vocabFor(topicRec.resolved.type), !!topicRec.weak);
  var T = topicRec.node.name;
  var tStem = FG.stem(T.toLowerCase());

  // --- slots
  var slots = {};
  TF.SLOTS.forEach(function (s) { slots[s.key] = []; });

  if (ownGate.verdict === 'fact' || ownGate.verdict === 'weak') {
    slots.DEFINITION.push({ label: T, text: ownGate.text, verdict: ownGate.verdict, via: 'self' });
  }
  facts.forEach(function (m) {
    var sh = TF.slotHits(m.gate.text);
    sh.forEach(function (h) {
      if (h.key === 'DEFINITION') return;   // only the topic defines itself
      if (slots[h.key].length < 8) {
        slots[h.key].push({ label: m.name, text: m.gate.text, verdict: m.gate.verdict, via: m.via, n: h.n });
      }
    });
  });
  // TYPES: members that are themselves named after the topic.
  //
  // A name match is a candidate, not evidence. "Universal Volcano Bay" and
  // "Operation Volcano" both contain the topic stem and both failed the gate,
  // and listing them as kinds of volcano -- even with a note -- teaches the
  // reader something false. So a name match only qualifies a member whose
  // description actually survived; the rest stay out of the theory entirely.
  //
  // The match is on whole words from the topic's own name, not on its stem.
  // A stem substring let "Philippine Institute of Volcanology and Seismology"
  // into TYPES, because "volcan" is a prefix of "volcanology".
  var tWords = FG.content(T).filter(function (w) { return w.length > 3; });
  var tNameRe = tWords.length ? new RegExp('\\b(?:' + tWords.map(function (w) {
    return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('|') + ')(?:s|es)?\\b', 'i') : null;
  members.forEach(function (m) {
    var nm = String(m.name);
    var isType = !!tNameRe && tNameRe.test(nm) && nm.toLowerCase() !== T.toLowerCase();
    if (!isType) return;
    var ok = m.gate.verdict === 'fact' || m.gate.verdict === 'weak';
    if (!ok) return;
    if (slots.TYPES.length >= 14) return;
    if (slots.TYPES.some(function (x) { return x.label === m.name; })) return;
    slots.TYPES.push({
      label: m.name, text: m.gate.text, verdict: m.gate.verdict, via: m.via
    });
  });
  // DISTRIBUTION: place-like members.
  //
  // A place needs evidence that it is a location OF this topic, not merely that
  // it appeared in the same question set. Co-occurrence is membership, so on its
  // own it can never place anything. That is why this loop now requires either
  // a surviving description or a typed edge: without it, the co-occurrence
  // neighbours of "Rang Mahal, Sri Ganganagar" -- Madam Yankelova's Fine
  // Literature Club among them -- were all filed as places of the topic.
  members.forEach(function (m) {
    if (!/place|country|state|city|region|river|mountain|island/.test(m.type)) return;
    var evidenced = m.gate.verdict === 'fact' || m.gate.verdict === 'weak';
    if (!evidenced && !m.rel) return;
    if (slots.DISTRIBUTION.length >= 14) return;
    if (slots.DISTRIBUTION.some(function (x) { return x.label === m.name; })) return;
    slots.DISTRIBUTION.push({
      label: m.name, text: evidenced ? m.gate.text : null,
      verdict: m.gate.verdict, via: m.via, w: m.coocW
    });
  });
  // CASE_STUDIES: concrete, well-evidenced instances.
  members.forEach(function (m) {
    if (m.gate.verdict !== 'fact') return;
    if (slots.CASE_STUDIES.length >= 10) return;
    var parts = TF.slotHits(m.gate.text).map(function (h) { return h.label; });
    slots.CASE_STUDIES.push({
      label: m.name, text: m.gate.text, verdict: m.gate.verdict, via: m.via,
      aspect: parts, count: m.count, span: m.span
    });
  });

  // --- dimensions
  //
  // The topic's own name is not evidence about the topic. On the Climate topic
  // the bare word "climate" appeared in 230 of the gated sentences, so CLIMATE
  // was always the top dimension at 230 signals, and on the topic "Climate" it
  // was a dimension of itself. Membership of the topic name is a prerequisite
  // for a claim, not a property of the claim, so those tokens are dropped.
  var selfWords = Object.create(null);
  FG.content(T).forEach(function (w) { if (w.length > 2) selfWords[w] = true; });
  var dims = Object.create(null);
  facts.forEach(function (m) {
    TF.dimensionHits(m.gate.text).forEach(function (d) {
      var own = {};
      Object.keys(d.terms).forEach(function (t) { if (!selfWords[t]) own[t] = d.terms[t]; });
      var n = Object.keys(own).reduce(function (a, t) { return a + d.terms[t]; }, 0);
      if (!n) return;
      var e = dims[d.key] || (dims[d.key] = { key: d.key, label: d.label, icon: d.icon, n: 0, terms: {}, members: [] });
      e.n += n;
      Object.keys(own).forEach(function (t) { e.terms[t] = (e.terms[t] || 0) + d.terms[t]; });
      if (e.members.length < 6 && e.members.indexOf(m.name) < 0) e.members.push(m.name);
    });
  });
  // A dimension needs corroboration. One matching token is not a dimension:
  // "Costa Rica" produced an ECONOMIC dimension on the strength of the token
  // "costa", and "weathered" alone produced a CLIMATE dimension. Two or more
  // independent signals are required, otherwise the honest answer is that the
  // corpus says nothing about that dimension for this topic.
  var DIM_MIN_SIGNALS = 2;
  var dimList = Object.keys(dims).map(function (k) {
    var e = dims[k];
    e.topTerms = Object.keys(e.terms).sort(function (a, b) { return e.terms[b] - e.terms[a]; }).slice(0, 6);
    return e;
  }).filter(function (e) { return e.n >= DIM_MIN_SIGNALS; })
    .sort(function (a, b) { return b.n - a.n; });

  // --- India hook
  //
  // Only gated members may appear. Earlier this loop listed anything whose
  // name or text merely contained an India cue, so the Indian branch filled up
  // with entities that had no surviving evidence at all -- Chaturdasha Temple,
  // Mangal Mahadev, Ganga Talao, and Anjouan, which is in the Comoros and
  // matched only because its text says "Indian Ocean". A branch that lists
  // unsupported examples teaches the reader they are Indian examples of the
  // topic, which is the one thing this layer must never do. What the corpus
  // cannot support stays NEEDS SOURCE.
  var india = Object.create(null);
  TF.INDIA_BRANCHES.forEach(function (b) { india[b.key] = []; });
  var indiaAny = false;
  members.forEach(function (m) {
    if (m.gate.verdict !== 'fact' && m.gate.verdict !== 'weak') return;
    var br = TF.indiaBranch(m.name, m.type, m.gate.text);
    if (!br) return;
    indiaAny = true;
    if (india[br].length >= 8) return;
    india[br].push({
      label: m.name, text: m.gate.text,
      verdict: m.gate.verdict, via: m.via
    });
  });

  // --- related topics, discovered by IDF-weighted lexical overlap
  var profile = Object.create(null);
  facts.forEach(function (m) {
    FG.content(m.gate.text).forEach(function (t) {
      if (t.length < 5) return;
      if (FG.stem(t) === tStem) return;
      profile[t] = (profile[t] || 0) + 1;
    });
  });
  var profTerms = Object.keys(profile);
  var totalDesc = G.nodes.length;
  var idf = Object.create(null);
  profTerms.forEach(function (t) {
    var df = G.termFreq[t] || 1;
    idf[t] = Math.log(totalDesc / df) + 1;
  });
  var isMember = Object.create(null);
  members.forEach(function (m) { isMember[m.id] = 1; });
  var topicIsPerson = /person|human|leader|politician/.test(topicRec.resolved.type);
  var topicStrong = FG.vocabFor(topicRec.resolved.type);
  var related = [];
  G.nodes.forEach(function (rec) {
    if (rec.id === topicRec.id || isMember[rec.id]) return;
    if (!rec.desc) return;
    var toks = rec.desc.toLowerCase().match(/[a-z]{5,}/g);
    if (!toks) return;
    var score = 0;
    var hits = Object.create(null);
    for (var i = 0; i < toks.length; i++) {
      var w = idf[toks[i]];
      if (!w) continue;
      hits[toks[i]] = 1;
      score += w * Math.min(profile[toks[i]], 3);
    }
    var names = Object.keys(hits);
    if (names.length < 2) return;
    // A person is not a thematic neighbour of a volcano. Without this,
    // "Gustaf" ranked top for sharing the rare words "queen" and "william",
    // both of which occur in exactly one admitted fact each.
    if (!topicIsPerson && /person|human|leader|politician/.test(rec.rawType)) return;
    // The anchor is mandatory. An earlier version treated it as a bonus and
    // fell back on "shares repeated thematic wording", which still admitted
    // Beijing cuisine (cuisine/called/national), the meteorite 2018 WV1 and
    // Copeland Islands -- all of which share perfectly common words with any
    // long geography corpus. Related means the neighbour's OWN text speaks the
    // topic's vocabulary. If it does not, the honest verdict is that the corpus
    // does not connect them, and the graph layer remains free to show them.
    var anchor = null;
    if (topicStrong && topicStrong.unique) {
      var am = String(rec.desc).match(topicStrong.unique);
      if (am) anchor = am[0].toLowerCase();
    }
    if (!anchor) return;
    related.push({ name: rec.name, type: rec.rawType, score: Math.round(score * 10) / 10,
                   shared: names.slice(0, 4), anchor: anchor, desc: rec.desc,
                   provenance: 'ASSERTED' });
  });
  related.sort(function (a, b) { return b.score - a.score; });

  return {
    ownGate: ownGate, slots: slots, dims: dimList, india: india,
    related: related.slice(0, 12), facts: facts, off: off, rejected: rejected
  };
}

// ------------------------------------------------------------------ render
function bullet(indent, last, text) {
  return indent + (last ? '\u2514\u2500\u2500 ' : '\u251c\u2500\u2500 ') + text;
}
function render(topicRec, members, B) {
  var T = topicRec.node.name;
  var L = [];
  L.push(T.toUpperCase() + '  \u2014  THEORY LAYER');
  L.push('resolved type: ' + topicRec.resolved.type +
         (topicRec.resolved.subtype ? '/' + topicRec.resolved.subtype : '') +
         '   (corpus said "' + topicRec.node.rawType + '")');
  L.push('corpus mentions: ' + (topicRec.node.count || 0) + '   candidates found: ' + members.length);
  L.push('');

  // --- theory
  L.push('THEORY');
  L.push('\u2502');
  TF.SLOTS.forEach(function (s, si) {
    var items = B.slots[s.key] || [];
    var lastSlot = si === TF.SLOTS.length - 1;
    L.push('\u2502   ' + (lastSlot ? '\u2514\u2500\u2500 ' : '\u251c\u2500\u2500 ') + s.label.toUpperCase() +
           (items.length ? '' : '   \u2014 NEEDS SOURCE'));
    if (!items.length) return;
    var shown = items.slice(0, 5);
    shown.forEach(function (it, i) {
      var last = (i === shown.length - 1);
      var prov = it.via === 'edge' ? '[ASSERTED]' :
                 (it.verdict === 'fact' ? '[ASSERTED]' : '[DERIVED]');
      var head = bullet('\u2502   ' + (lastSlot ? '    ' : '\u2502   ') + (last ? '   ' : '\u2502  '), last,
                        it.label + '  ' + prov);
      L.push(head);
      if (it.text) {
        L.push('\u2502   ' + (lastSlot ? '    ' : '\u2502   ') + (last ? '   ' : '\u2502  ') + '   \u201c' + clip(it.text, 150) + '\u201d');
      }
      if (it.note) {
        L.push('\u2502   ' + (lastSlot ? '    ' : '\u2502   ') + (last ? '   ' : '\u2502  ') + '   note: ' + it.note);
      }
      if (it.aspect && it.aspect.length) {
        L.push('\u2502   ' + (lastSlot ? '    ' : '\u2502   ') + (last ? '   ' : '\u2502  ') +
               '   supports: ' + it.aspect.join(', '));
      }
    });
    if (items.length > shown.length) {
      L.push('\u2502   ' + (lastSlot ? '    ' : '\u2502   ') + '   ... and ' + (items.length - shown.length) + ' more');
    }
  });
  L.push('');

  // --- dimensions
  L.push('DIMENSIONS  (discovered from gated facts, not declared per topic)');
  L.push('\u2502');
  if (!B.dims.length) L.push('\u2514\u2500\u2500 NEEDS SOURCE \u2014 no gated fact names a dimension');
  B.dims.forEach(function (d, i) {
    var last = i === B.dims.length - 1;
    L.push((last ? '\u2514\u2500\u2500 ' : '\u251c\u2500\u2500 ') + d.icon + ' ' + d.label.toUpperCase() +
           '  (' + d.n + ' signals)');
    d.topTerms.forEach(function (t, j) {
      L.push(bullet('', j === d.topTerms.length - 1, t));
    });
  });
  L.push('');

  // --- india
  L.push('INDIA');
  L.push('\u2502');
  var anyIndia = false;
  TF.INDIA_BRANCHES.forEach(function (b, i) {
    var items = B.india[b.key] || [];
    var last = i === TF.INDIA_BRANCHES.length - 1;
    anyIndia = anyIndia || items.length > 0;
    L.push('\u2502   ' + (last ? '\u2514\u2500\u2500 ' : '\u251c\u2500\u2500 ') + b.label +
           (items.length ? '' : '   \u2014 NEEDS SOURCE'));
    items.slice(0, 4).forEach(function (it, j) {
      L.push(bullet('\u2502   ' + (last ? '    ' : '\u2502   ') + (j === Math.min(items.length, 4) - 1 ? '   ' : '\u2502  '),
                    j === Math.min(items.length, 4) - 1, it.label + '   [DERIVED]'));
      if (it.text) L.push('\u2502   ' + (last ? '    ' : '\u2502   ') + '      \u201c' + clip(it.text, 130) + '\u201d');
    });
  });
  if (!anyIndia) L.push('\u2502');
  L.push('');

  // --- graph connections (kept separate, and explicitly not theory)
  L.push('GRAPH CONNECTIONS  (discovery layer \u2014 NOT part of the theory)');
  L.push('\u2502');
  members.slice(0, 14).forEach(function (m, i) {
    var last = i === Math.min(members.length, 14) - 1;
    var tag = m.via === 'edge' ? 'edge:' + m.rel : (m.via === 'cooccurrence' ? 'co-occurrence w=' + m.coocW : 'semantic:' + m.via);
    L.push(bullet('\u2502', last, m.name + '   (' + m.type + ', ' + tag + ')'));
  });
  L.push('');

  // --- related topics
  L.push('RELATED TOPICS  (each must speak the topic vocabulary in its own text)');
  L.push('│');
  if (!B.related.length) {
    L.push('└── NEEDS SOURCE — every node whose own text speaks this topic’s');
    L.push('    vocabulary is already an admitted member, so the corpus');
    L.push('    evidences no further thematic neighbour.');
  }
  B.related.forEach(function (r, i) {
    L.push(bullet('│', i === B.related.length - 1,
      r.name + '   (' + r.type + ', affinity ' + r.score + ')' +
      '   speaks: ' + r.anchor +
      (r.shared.length ? '   shares: ' + r.shared.join(', ') : '')));
  });
  L.push('');

  // --- pyq + answer frame
  L.push('UPSC QUESTION COVERAGE');
  L.push('\u2502');
  var pre = [], main = [];
  if (B.slots.DEFINITION.length || B.slots.TYPES.length) pre.push('basic concept, types');
  if (B.slots.DISTRIBUTION.length) pre.push('distribution and location');
  if (B.slots.FORMATION.length) pre.push('process and mechanism');
  if (B.slots.HAZARDS.length) main.push('adverse effects');
  if (B.slots.BENEFITS.length) main.push('benefits and utility');
  if (B.slots.MONITORING.length) main.push('monitoring systems');
  if (B.slots.MANAGEMENT.length) main.push('management and response');
  if (B.slots.CASE_STUDIES.length) main.push('case studies');
  L.push('\u251c\u2500\u2500 PRELIMS   ' + (pre.length ? pre.join('; ') : 'NEEDS SOURCE'));
  L.push('\u2514\u2500\u2500 MAINS    ' + (main.length ? main.join('; ') : 'NEEDS SOURCE'));
  L.push('');
  L.push('ANSWER FRAME  (skeleton; content comes only from the slots above)');
  L.push('\u2502');
  L.push('\u251c\u2500\u2500 INTRO         ' + (B.slots.DEFINITION.length ? 'define it' : 'NEEDS SOURCE'));
  L.push('\u251c\u2500\u2500 BODY          ' + ['FORMATION', 'TYPES', 'DISTRIBUTION', 'BENEFITS']
          .filter(function (k) { return B.slots[k].length; }).join(', ') || 'NEEDS SOURCE');
  L.push('\u251c\u2500\u2500 INDIA          ' + (anyIndia ? 'see India branch' : 'NEEDS SOURCE'));
  L.push('\u251c\u2500\u2500 CHALLENGES    ' + (B.slots.HAZARDS.length ? 'see Hazards' : 'NEEDS SOURCE'));
  L.push('\u2514\u2500\u2500 WAY FORWARD  ' + ['MONITORING', 'MANAGEMENT']
          .filter(function (k) { return B.slots[k].length; }).join(', ') || 'NEEDS SOURCE');
  return L.join('\n');
}
function clip(s, n) {
  s = String(s);
  return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '\u2026' : s;
}

// -------------------------------------------------------------------- main
function main() {
  var topic = process.argv[2];
  if (!topic || topic.charAt(0) === '-') {
    console.log('usage: node --max-old-space-size=8192 scripts/gen-theory.js "<topic>" [--json] [--write]');
    process.exit(1);
  }
  process.stdout.write('loading graph... ');
  var G = loadGraph();
  G.adjacency = null; // adjacency is built but edge signatures are optional here
  console.log(G.nodes.length + ' nodes, ' + G.links.length + ' links, ' + G.edges.length + ' edges');

  var tr = resolveTopic(G, topic);
  if (!tr) { console.error('no node found for "' + topic + '"'); process.exit(2); }
  tr.resolved = GAZ.resolveType(tr.node, G.adjacency);
  tr.node.resolved = tr.resolved;
  if (tr.ambiguous) {
    console.log('NOTE: "' + topic + '" is ambiguous (' + tr.candidates.length +
                ' nodes); using ' + tr.node.id);
  }
  if (tr.weak) {
    console.log('NOTE: no node is named "' + topic + '". "' + tr.node.name +
                '" is the closest available, so the theory below is built for ' +
                'that node, not for "' + topic + '".');
  }

  var members = discoverMembers(G, tr, null);
  var B = buildTheory(G, tr, members);

  // corpus-relevance evidence: reported, deliberately not rendered as a branch
  var catAgg = Object.create(null);
  if (tr.node.cats) {
    Object.keys(tr.node.cats).forEach(function (l) { catAgg[l] = tr.node.cats[l]; });
  }
  var catRows = Object.keys(tr.node.cats || {}).length;
  var catTop = Object.keys(catAgg).sort(function (a, b) { return catAgg[b] - catAgg[a]; }).slice(0, 6);

  if (arg('--json')) {
    console.log(JSON.stringify({
      topic: tr.node.name, id: tr.node.id, resolved: tr.node.resolved,
      counts: { mentions: tr.node.count, candidates: members.length,
                facts: B.facts.length, offtopic: B.off.length, rejected: B.rejected.length },
      corpusRelevance: { categoryRows: catRows, distinctLabels: Object.keys(catAgg).length,
                         topLabels: catTop.map(function (l) { return { label: l, weight: catAgg[l] }; }) },
      ownGate: B.ownGate, slots: B.slots, dimensions: B.dims,
      india: B.india, related: B.related,
      members: members.map(function (m) {
        return { name: m.name, type: m.type, via: m.via, w: m.coocW,
                 verdict: m.gate.verdict, gate: m.gate.gate, reason: m.gate.reason };
      })
    }, null, 1));
    return;
  }

  console.log('\n' + render(tr, members, B));
  console.log('\n' + '-'.repeat(78));
  console.log('QUALITY GATE REPORT  (why theory is allowed to say only this much)');
  console.log('  candidates examined      : ' + members.length);
  console.log('  admitted as facts        : ' + B.facts.length);
  console.log('  admitted but weak        : ' +
    members.filter(function (m) { return m.gate.verdict === 'weak'; }).length);
  console.log('  kept, graph layer only   : ' + B.off.length);
  console.log('  rejected outright        : ' + B.rejected.length);
  var byGate = {};
  B.rejected.forEach(function (m) { byGate[m.gate.reason] = (byGate[m.gate.reason] || 0) + 1; });
  Object.keys(byGate).forEach(function (r) { console.log('      - ' + byGate[r] + 'x  ' + r); });
  var byOff = {};
  B.off.forEach(function (m) { byOff[m.gate.reason] = (byOff[m.gate.reason] || 0) + 1; });
  Object.keys(byOff).forEach(function (r) { console.log('      \u00b7 ' + byOff[r] + 'x  ' + r); });
  console.log('\nCORPUS RELEVANCE  (evidence of how much material exists -- NOT a syllabus)');
  console.log('  category rows: ' + catRows + '   distinct labels: ' + Object.keys(catAgg).length +
              '   summed weight: ' + Object.keys(catAgg).reduce(function (n, k) { return n + catAgg[k]; }, 0));
  catTop.forEach(function (l) { console.log('      ' + String(catAgg[l]).padStart(5) + '  ' + l); });

  if (arg('--write')) {
    var slug = String(tr.node.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    var dir = path.join(ROOT, 'data/generated-theory');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, slug + '.txt'), render(tr, members, B) + '\n', 'utf8');
    console.log('\nWROTE data/generated-theory/' + slug + '.txt');
  }
}
main();
