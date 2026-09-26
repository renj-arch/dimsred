// Auto-generate UPSC revision content from existing data
// Usage: node --max-old-space-size=4096 scripts/generate-revision-content.js
//
// LAYER 1 (knowledge graph) and LAYER 2 (revision facts) are kept apart here.
// topic-layers.json is a neighbour graph: its items are OTHER entities, and
// their note/desc describes THOSE entities. Treating that text as a fact about
// the selected topic is what contaminated the cards, so every candidate fact
// now has to clear scripts/lib/entity-ownership.js ownsFact() before it can be
// rendered. A connected entity is never a source of facts.

var fs = require('fs');
var path = require('path');
var EO = require(path.join(__dirname, 'lib', 'entity-ownership.js'));

var DATA_DIR = path.join(__dirname, '..', 'data');
var TOPIC_LAYERS = path.join(DATA_DIR, 'topic-layers.json');
var TIMELINE = path.join(DATA_DIR, 'timeline.json');
var PERSON_BIOS = path.join(DATA_DIR, 'person-bios.json');
var OUTPUT = path.join(DATA_DIR, 'revision-content.json');

var topicLayers = JSON.parse(fs.readFileSync(TOPIC_LAYERS, 'utf8'));
var timeline = JSON.parse(fs.readFileSync(TIMELINE, 'utf8'));
var personBios = fs.existsSync(PERSON_BIOS) ? JSON.parse(fs.readFileSync(PERSON_BIOS, 'utf8')) : {};

// ---------------------------------------------------------------------------
// entity space
// ---------------------------------------------------------------------------

var bioKeys = Object.keys(personBios);
var topicNames = Object.keys(topicLayers);

// The resolver may know every topic name, every neighbour name and every person
// with a bio. It deliberately does NOT know the 500k timeline node names: those
// carry mis-routed descriptions and would let a stranger's name be mistaken for
// the subject.
var knownNames = topicNames.concat(bioKeys);
Object.keys(topicLayers).forEach(function (t) {
  (topicLayers[t].branches || []).forEach(function (b) {
    (b.items || []).forEach(function (it) { if (it.name) knownNames.push(it.name); });
  });
});
var aliasIndex = EO.buildAliasIndex(knownNames);
var idSet = EO.buildIdSet(knownNames, aliasIndex);

function bioFor(topicName) {
  var direct = personBios[topicName];
  if (direct && direct.bio) return direct.bio;
  var want = EO.resolveId(topicName, aliasIndex);
  var hit = bioKeys.filter(function (k) { return EO.resolveId(k, aliasIndex) === want; })[0];
  return hit ? personBios[hit].bio : '';
}

// ---------------------------------------------------------------------------
// owned fact sources
// ---------------------------------------------------------------------------

// Timeline node descriptions are keyed by the entity they hang off, but that
// routing is demonstrably unreliable (an "Actuary" node carrying a fact about
// mutual surety). They are therefore only usable when the sentence names the
// entity as its own subject: requireExplicitSubject rejects the rest.
// The description field belongs to the entity's own node, so it is owned by
// construction - the same reasoning as person-bios[topic]. It is still not
// blindly trusted: long co-mention sentences and same-name creative works are
// rejected, and the fact is tagged node-field so the provenance stays visible.
var nodeDescById = {};
var nodeTypeById = {};
var firstTokenCount = Object.create(null);
(function loadNodeDescs() {
  var parts = timeline.nodesParts || 0;
  var want = {};
  topicNames.forEach(function (t) { want[EO.resolveId(t, aliasIndex)] = t; });

  // The timeline holds several nodes for the same entity, and they are not
  // equally good: "Rabindranath Tagore" appears both as "poet and Nobel
  // laureate" and as the fragment "At the age of 80". Taking whichever shard
  // came first gave every one of these figures a junk description, so all
  // candidates are collected and the best one is chosen on evidence.
  var cands = {};
  for (var p = 0; p < parts; p++) {
    var f = path.join(DATA_DIR, 'timeline.nodes.' + p + '.json');
    if (!fs.existsSync(f)) continue;
    var arr = JSON.parse(fs.readFileSync(f, 'utf8'));
    for (var i = 0; i < arr.length; i++) {
      var n = arr[i];
      if (!n.desc) continue;
      // Count how often each word opens a description anywhere in the corpus.
      // Used to tell a cut-off word from an ordinary one; see nodeDescScore.
      var w0 = String(n.desc).replace(/\s+/g, ' ').trim().toLowerCase().split(/[^\p{L}\p{N}]+/u)[0];
      if (w0) firstTokenCount[w0] = (firstTokenCount[w0] || 0) + 1;
      var id = EO.canonicalId(n.name);
      var resolved = aliasIndex[id] || id;
      if (!want[resolved]) continue;
      (cands[resolved] = cands[resolved] || []).push({ desc: n.desc, type: n.type || null });
    }
  }

  Object.keys(cands).forEach(function (id) {
    var best = null;
    cands[id].forEach(function (c) {
      var score = nodeDescScore(c.desc, id);
      if (!best || score > best.score) best = { score: score, desc: c.desc, type: c.type };
    });
    if (best) {
      nodeDescById[id] = best.desc;
      nodeTypeById[id] = best.type;
    }
  });
})();

// How many times the entity's own name appears in the text, matched on the
// full phrase with flexible whitespace. The full phrase matters: "Henry Ford"
// must not be counted twice by "Ford Motor Company ... Henry Ford".
function nameOccurrences(text, entityId) {
  var id = String(entityId || '').trim();
  if (!id) return 0;
  var re = new RegExp('\\b' + id.split(' ').map(function (w) {
    return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('\\s+') + '\\b', 'gi');
  var m = text.match(re);
  return m ? m.length : 0;
}

// Higher is a better description of the entity.
//
// Length is deliberately NOT the main signal. Ashoka has three candidate node
// descriptions - "Mauryan emperor", a 200-character quotation by Sten Konow
// about Ashoka's tradition, and a truncated fragment - and ranking by length
// promoted the quotation, which is someone else's text. For an entity's own
// field the reliable signals are negative: a description that opens on a
// DIFFERENT known entity, opens mid-word, or is a quotation has been mis-routed.
function nodeDescScore(desc, ownerId) {
  var t = String(desc).replace(/\s+/g, ' ').trim();
  if (t.length < 13) return -100;
  if (t.charAt(0) === '"' || /\\"/.test(t)) return -60;
  // A truncated fragment such as "rritory by defeating the Seleucid Empire"
  // begins mid-word. A lowercase opening is otherwise perfectly normal
  // ("mystic poet and saint", "single nationwide indirect tax"), so the signal
  // is rarity, not case: a first word that opens only this one description in
  // the whole corpus is a cut-off word, not an ordinary one.
  var firstWord = t.toLowerCase().split(/[^\p{L}\p{N}]+/u)[0] || '';
  if (/^[a-z]/.test(t) && firstWord && (firstTokenCount[firstWord] || 0) <= 1) return -30;

  if (/^(?:at|in|on|by|for|from|during|after|before|since|with|as|between|under|over|through|about|around|upon|within|into|towards?)\b/i.test(t)) return -50;
  if (/^(?:according to|as per|see also|note:?)\b/i.test(t)) return -50;
  // Raw wiki markup is an article fragment, never a description.
  if (/==|\[\[|\]\]|\|\s*\||\{\{/.test(t)) return -40;

  // Opens on an appositive - "Sten Konow, the Norwegian Indologist, concluded
  // ..." - which is a sentence about a named third party. This catches the case
  // that the known-entity check cannot, because the third party ("Sten Konow")
  // is in no topic list and so is not resolvable at all.
  if (/^[A-Z][\w.'-]*(?:\s+[A-Z][\w.'-]*){0,3}\s*,\s+(?:the|a|an)\b/.test(t)) return -60;
  if (/:\s*\\?"/.test(t)) return -60;

  // Opens on a different entity than the node it is filed under.
  var lead = EO.startsWithEntity(t, idSet, aliasIndex);
  if (lead && lead.id !== ownerId) return -80;

  var score = 10;
  // A circular gloss repeats the entity's own name and says nothing:
  // "The Cold War (1962-1979) refers to the phase within the Cold War that
  // spanned ...". Opening with the name is normally the strongest evidence, so
  // the repetition has to be discounted explicitly.
  if (nameOccurrences(t, ownerId) > 1) score -= 25;
  // For an entity's own field the decisive question is whether the text is
  // ABOUT the entity. Opening with its own name is the strongest evidence;
  // being a short label is good; being long while merely mentioning the entity
  // is the co-mention pattern that mis-fills these nodes.
  if (EO.mentionsEntity(t, ownerId, idSet, aliasIndex)) {
    var head = t.slice(0, ownerId.length + 12).toLowerCase();
    if (head.indexOf(EO.canonicalId(ownerId)) !== -1) score += 15;
    else if (t.length < 90) score += 6;
    else score -= 20;
  } else if (t.length < 90) {
    score += 6;
  } else {
    score -= 20;
  }
  if (/\b(1[4-9]\d{2}|20[0-2]\d)\b/.test(t)) score += 5;
  var caps = (t.match(/[A-Z][a-z]{3,}/g) || []).length;
  score += Math.min(caps, 3);
  return score;
}

// ---------------------------------------------------------------------------
// text quality filters (unchanged intent: drop boilerplate, keep substance)
// ---------------------------------------------------------------------------

function splitSentences(text) {
  return String(text || '').split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/g)
    .map(function (s) { return s.replace(/\s+/g, ' ').trim(); })
    .filter(function (s) { return s.length >= 12 && s.length <= 220; });
}

// Debug hook: REV_DEBUG="kabir" prints the chosen node description and every
// rejection reason for that one topic. Ownership bugs are almost never
// visible from the aggregate counts.
var DEBUG_TOPIC = (process.env.REV_DEBUG || '').toLowerCase();
function debugTopic(topicName, msg) {
  if (DEBUG_TOPIC && String(topicName).toLowerCase() === DEBUG_TOPIC) {
    console.log('  [debug ' + topicName + '] ' + msg);
  }
}

function normalizeKey(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

var TEMPLATE_JUNK = /^(?:the .+ linked to|geography|see also|key concepts|key events|major events)\b/i;

var BAN_PHRASES = /(?:became a union territory|is the capital and largest city|and largest city of|metropolitan area is the largest|most populous city proper|population of [\d,]+|coastline|coast along|along the bay|along the arabian sea|gulf of |marina beach|geography\b|stands on the river|at the head of a|world cities located in|megacity|metropolitan region which is|metropolitan area|officially the|was a (?:ugandan|indian|british|american|pakistani|sri lankan|bangladeshi|nepalese|afghan|chinese|russian|french|german|japanese|italian|spanish|iraqi|iranian|israeli|egyptian|south african|australian|canadian)\b|(?:military officer|dictator who served|general and presiden|liberation army of)\b)/i;

// Neighbour biographies are proper-noun dense, so they need two caps to look
// substantial. A node's own description is already scoped to the entity, so a
// year plus a little prose is enough - "political campaign that won Indian
// independence in 1947" is exactly the kind of line a revision card wants.
// Two substance modes, because the two sources have different failure modes.
//
//   'context' - text from a neighbour's biography or a co-mention sentence.
//     Proper-noun density is the only available signal for "is this really about
//     the entity", so require at least two capitalised words. This is what
//     rejected neighbour-sourced Bismarck/Hoover biographies.
//
//   'owned'   - text from the entity's own node or bio field. Provenance has
//     already established ownership, so proper nouns are meaningless as a
//     filter: the best facts here are short role labels that contain none
//     ("poet and Nobel laureate", "revolutionary freedom fighter"). Judging
//     these by capitalisation threw away the highest-value facts in the corpus.
function hasSubstance(clean, mode) {
  var caps = (String(clean).match(/[A-Z][a-z]{3,}/g) || []).length;
  var hasYear = /\b(1[4-9]\d{2}|20[0-2]\d)\b/.test(clean);
  var hasStat = /\b\d{1,3}(?:,\d{3})*\.?\d*\s*(?:%|percent|million|billion|crore|lakh|thousand|km|tonnes?|states?|districts?|languages?|schemes?)\b/i.test(clean);
  if (mode === 'owned') {
    // Short role labels are the most valuable facts in an owned field
    // ("founder of Pakistan", "jurist and social reformer"), so length alone
    // cannot be the bar. What does separate them from junk is that a real
    // description has a head noun: the timeline corpus also contains bare
    // adverbial fragments ("At the age of 80", "In August 1907").
    if (clean.length < 15) return false;
    if (/^(?:at|in|on|by|for|from|during|after|before|since|with|as|between|under|over|through|about|around|upon|within|into|towards?|upon|whilst|while)\b/i.test(clean)) return false;
    return true;
  }
  return (hasYear || hasStat) ? caps >= 2 : (caps >= 2 && clean.length >= 45);
}

// Parentheticals are usually noise ("the Sabarmati Ashram (Ahmedabad)") and are
// stripped, but a parenthetical that is purely a date is information: dropping
// "(2008)" left Chandrayaan-1 typed as a DATE fact whose displayed text no
// longer contained a date.
function tidy(s) {
  return s
    .replace(/\s+/g, ' ')
    .replace(/\((?!\d{3,4}(?:[\u2013\u2014\-\/]\d{1,4})?\s*\))[^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function usable(s, mode) {
  if (!s || s.length < 15 || s.length > 200) return false;
  if (s.charAt(0) === '"' || s.indexOf(' \u2014 ') !== -1 || s.indexOf('==') !== -1) return false;
  if (s.indexOf('http') !== -1) return false;
  if (/\[(?:citation needed|source needed)\]/.test(s)) return false;
  if (TEMPLATE_JUNK.test(s) || BAN_PHRASES.test(s)) return false;
  if (/^\s*(?:according to|as per|refer|refers to|see also|note:?|read more)\b/i.test(s)) return false;
  if (/[:;]$/.test(s) || /\?\s*$/.test(s) || /^what|^why|^how\b/i.test(s)) return false;
  if (/^(?:however|thus|also|so|then|finally|further|moreover|in addition|meanwhile|hence|therefore|this|that|these|those|there|they|he|she|it|and|but|or)\b/i.test(s)) return false;
  return hasSubstance(s, mode);
}

// ---------------------------------------------------------------------------
// the gate
// ---------------------------------------------------------------------------

// A candidate only becomes a PRIMARY fact when its resolved subject is the
// selected entity. Trust level decides whether provenance alone is enough:
// trusted sources may fall back to the claimant, mis-routed ones may not.
function admit(sentence, ctx) {
  var subj = EO.detectSubject(sentence, ctx);
  var factType = EO.classifyFactType(sentence);
  var cand = {
    subjectId: subj.subjectId,
    subjectName: subj.subjectName,
    uncertain: subj.uncertain,
    factType: factType,
    eventId: subj.selectedIsExplicitAgent ? ctx.selectedId : null,
    participationExplicit: !!subj.selectedIsExplicitAgent,
    confidence: subj.confidence
  };
  var verdict = EO.ownsFact(cand, ctx.selectedId);
  if (!verdict.ok) {
    debugTopic(ctx.topicName, 'reject not-owned: "' + sentence.slice(0, 60) + '" subj=' + subj.subjectId + ' via=' + subj.method);
    return null;
  }

  var text = tidy(sentence);
  // 'context' - owned by the selected entity, but the statement is secondary
  //   (a person/place/organisation it is tied to, or a framing clause) so it
  //   does not belong in the main fact list.
  var substanceMode = ctx.source === 'layer-item' ? 'context' : 'owned';
  if (!usable(text, substanceMode)) {
    debugTopic(ctx.topicName, 'reject unusable: "' + text.slice(0, 60) + '"');
    return null;
  }
  if (!EO.typeConsistent(ctx.nodeType, text)) {
    debugTopic(ctx.topicName, 'reject type: "' + text.slice(0, 60) + '" nodeType=' + ctx.nodeType);
    return null;
  }
  if (nameOccurrences(text, ctx.selectedId) > 1) {
    debugTopic(ctx.topicName, 'reject circular: "' + text.slice(0, 60) + '"');
    return null;
  }
  var date = EO.classifyDate(text, { entityType: ctx.entityType });

  return {
    fact: text.charAt(0).toUpperCase() + text.slice(1),
    role: EO.isPrimaryType(factType) ? 'primary' : 'context',
    factType: factType,
    subjectEntityId: cand.subjectId,
    objectEntityId: null,
    sourceEntityId: ctx.sourceEntityId,
    source: ctx.source,
    via: verdict.via,
    confidence: cand.confidence,
    dateType: date.dateType,
    dateStatus: date.dateStatus,
    ownedDate: date.owned,
    provenance: EO.makeProvenance({
      source: ctx.source,
      sourceEntityId: ctx.sourceEntityId,
      subjectEntityId: cand.subjectId,
      method: subj.method
    })
  };
}

// A scope-qualified entity must not borrow another scope's description.
// "Goods and Services Tax (India)" was picking up the Singapore 9% rate, which
// is a factual error rather than a stylistic one. Only fires when the topic name
// itself carries a qualifier, so unqualified entities are unaffected.
var JURISDICTIONS = [
  'india', 'singapore', 'china', 'japan', 'pakistan', 'bangladesh', 'nepal',
  'sri lanka', 'bhutan', 'maldives', 'afghanistan', 'myanmar', 'indonesia',
  'vietnam', 'thailand', 'united states', 'usa', 'america', 'britain', 'uk',
  'england', 'scotland', 'ireland', 'france', 'germany', 'italy', 'spain',
  'portugal', 'russia', 'ukraine', 'australia', 'canada', 'brazil', 'egypt',
  'nigeria', 'kenya', 'south africa', 'turkey', 'iran', 'iraq', 'saudi arabia',
  'israel', 'greece', 'sweden', 'norway', 'denmark', 'netherlands', 'switzerland'
];

function scopeOf(topicName) {
  var m = String(topicName).match(/\(([^)]+)\)/);
  if (!m) return null;
  var q = normalizeKey(m[1]);
  return JURISDICTIONS.indexOf(q) !== -1 ? q : null;
}

function scopeMatches(text, scope) {
  if (!scope) return true;
  var low = ' ' + normalizeKey(text) + ' ';
  var mentioned = JURISDICTIONS.filter(function (j) {
    return low.indexOf(' ' + j + ' ') !== -1;
  });
  if (!mentioned.length) return true;
  return mentioned.indexOf(scope) !== -1;
}

function gatherPrimary(topicName, selectedId, entityType) {
  var out = [];
  var ctxOut = [];
  var seen = {};
  var seenCtx = {};
  var scope = scopeOf(topicName);

  // Owned statements are split by role, never by source: primary facts are the
  // ones that carry the card, secondary types (a tied person, place or
  // organisation) are kept aside for the CONTEXT section.
  function push(fact) {
    if (!fact) return;
    var isCtx = fact.role === 'context';
    var bag = isCtx ? ctxOut : out;
    var marks = isCtx ? seenCtx : seen;
    if (isCtx && ctxOut.length >= 6) return;
    if (!isCtx && out.length >= 6) return;
    var k = normalizeKey(fact.fact);
    if (!k || marks[k] || seen[k] || seenCtx[k]) return;
    marks[k] = 1;
    bag.push(fact);
  }

// Policy for a description that lives on the entity's OWN node: provenance is
// authoritative, because the field belongs to that node. What still has to be
// proven is that the text describes the entity rather than a neighbour that
// happened to be filed under it.
//
// "Barren Island is a small island" mentions the entity, so it is owned.
// "king of Magadha" is a short label, so it is owned.
// "A theory is, in general, a set of propositions..." is a dictionary entry for
// a common noun, so it is not about Toba and is dropped.
function nodeDescIsOwned(desc, selectedId) {
  var text = String(desc).trim();
  if (!text) return false;
  if (EO.mentionsEntity(text, selectedId, idSet, aliasIndex)) return true;
  return text.length < 90;
}

function run(text, source, sourceEntityId, trusted, nodeType) {
  splitSentences(text).forEach(function (s) {
    if (!scopeMatches(s, scope)) return;
    push(admit(s, {
      selectedId: selectedId,
      idSet: idSet,
      aliasIndex: aliasIndex,
      claimantId: selectedId,
      claimantName: topicName,
      topicName: topicName,
      entityType: entityType,
      nodeType: nodeType || null,
      source: source,
      sourceEntityId: sourceEntityId || selectedId,
      provenanceAuthoritative: source === 'timeline-node',
      requireExplicitSubject: !trusted
    }));
  });
}

var bio = bioFor(topicName);
if (bio) run(bio, 'person-bios', selectedId, true, null);

var nodeDesc = nodeDescById[selectedId];
debugTopic(topicName, 'chosen node desc: ' + (nodeDesc ? JSON.stringify(String(nodeDesc).slice(0, 80)) : 'NONE'));
if (nodeDesc && nodeDescIsOwned(nodeDesc, selectedId)) {
  run(nodeDesc, 'timeline-node', selectedId, true, nodeTypeById[selectedId]);
}

var layer = topicLayers[topicName];
(layer.branches || []).forEach(function (branch) {
  var d = (branch.desc || '').trim();
  if (d && !TEMPLATE_JUNK.test(d) && d.length < 200) run(d, 'layer-branch', selectedId, true, null);
});

  return { primary: out, context: ctxOut };
}

// Layer 1 supplies the relationship labels and nothing else. A neighbour's
// biography is deliberately NOT copied onto the card: this is the exact
// contamination that put Gokhale's life story under Gandhi. Those statements
// belong to the neighbour's own card.
function gatherContextAndNeighbours(topicName, selectedId) {
  var layer = topicLayers[topicName];
  var neighbours = [];
  var seenN = {};

  (layer.branches || []).forEach(function (branch) {
    (branch.items || []).forEach(function (item) {
      if (!item.name) return;
      var nid = EO.canonicalId(item.name);
      if (!nid || nid === selectedId) return;
      var key = nid + '|' + (item.rel || '');
      if (seenN[key]) return;
      seenN[key] = 1;
      neighbours.push({
        entityId: nid,
        entity: EO.displayName(item.name),
        rel: item.rel || 'related to',
        type: item.type || null,
        weight: typeof item.w === 'number' ? item.w : null
      });
    });
  });

  neighbours.sort(function (a, b) { return (b.weight || 0) - (a.weight || 0); });
  return { neighbours: neighbours, context: [] };
}

function rankFacts(facts) {
  var weight = { CORE_FACT: 3, DATE: 3, 'ROLE/POSITION': 3, DIRECT_EVENT: 2, CAUSE: 2, CONSEQUENCE: 2 };
  return facts.slice().sort(function (a, b) {
    var d = (weight[b.factType] || 1) - (weight[a.factType] || 1);
    if (d) return d;
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return b.fact.length - a.fact.length;
  });
}

function cap(arr, n) { return arr.slice(0, n); }

// ---------------------------------------------------------------------------
// build
// ---------------------------------------------------------------------------

var revisionContent = {};
var stats = { topics: 0, withPrimary: 0, primaryTotal: 0, contextTotal: 0, neighbourTotal: 0, zeroPrimary: [] };

Object.keys(topicLayers).forEach(function (topicName) {
  var selectedId = EO.resolveId(topicName, aliasIndex);
  var entityType = 'entity';

  var owned = gatherPrimary(topicName, selectedId, entityType);
  var primary = rankFacts(owned.primary);
  var contextFacts = rankFacts(owned.context);
  var extra = gatherContextAndNeighbours(topicName, selectedId);

  var primaryFacts = cap(primary, 8);
  var bullets = primaryFacts.map(function (f) { return '\u2022 ' + f.fact; });
  var facts = primaryFacts
    .filter(function (f) { return f.factType === 'DATE' || /\b(1[4-9]\d{2}|20[0-2]\d)\b/.test(f.fact); })
    .map(function (f) { return '\uD83D\uDCC5 ' + f.fact; });
  if (!facts.length) {
    facts = primaryFacts.slice(0, 3).map(function (f) { return '\uD83D\uDCCA ' + f.fact; });
  }

  var summary = primaryFacts.slice(0, 2).map(function (f) { return f.fact; }).join(' ');

  revisionContent[topicName] = {
    summary: summary,
    bullets: cap(bullets, 6),
    facts: cap(facts, 6),
    selectedEntityId: selectedId,
    primaryFacts: primaryFacts,
    directRelationships: extra.neighbours.filter(function (n) {
      return /founded|led|leader|successor|predecessor|part of|theatre|theater|involved|ally|opponent|treaty/i.test(n.rel || '');
    }).slice(0, 8),
    context: cap(contextFacts, 6),
    neighbors: cap(extra.neighbours, 24),
    comparisons: [],
    ownership: {
      gate: 'fact-subject-must-equal-selected-entity',
      selectedEntityId: selectedId,
      primaryCount: primaryFacts.length,
      contextCount: cap(extra.context, 5).length,
      neighbourCount: extra.neighbours.length
    },
    generatedAt: new Date().toISOString()
  };

  stats.topics++;
  stats.primaryTotal += primaryFacts.length;
  stats.contextTotal += cap(extra.context, 5).length;
  stats.neighbourTotal += extra.neighbours.length;
  if (primaryFacts.length) stats.withPrimary++; else stats.zeroPrimary.push(topicName);
});

// related-topic rows now quote the related topic's OWN first bio line, never a
// description borrowed from its layer.
Object.keys(revisionContent).forEach(function (topicName) {
  var topicWords = topicName.toLowerCase().split(/\s+/).filter(function (w) { return w.length > 3; });
  var scored = Object.keys(topicLayers).map(function (name) {
    if (name === topicName) return null;
    var nameWords = name.toLowerCase().split(/\s+/).filter(function (w) { return w.length > 3; });
    var common = 0;
    nameWords.forEach(function (w) { if (topicWords.indexOf(w) !== -1) common++; });
    return { name: name, n: common };
  }).filter(function (x) { return x && x.n > 0; })
    .sort(function (a, b) { return b.n - a.n; })
    .slice(0, 2);
  if (!scored.length) return;
  revisionContent[topicName].comparisons = [{
    title: 'Related Topics: ' + scored.map(function (s) { return s.name; }).join(', '),
    table: scored.map(function (s) {
      var own = revisionContent[s.name];
      var keyPoint = '';
      if (own && own.primaryFacts.length) keyPoint = own.primaryFacts[0].fact;
      return { topic: s.name, keyPoint: keyPoint };
    })
  }];
});

fs.writeFileSync(OUTPUT, JSON.stringify(revisionContent, null, 2));

console.log('Generated revision content for ' + Object.keys(revisionContent).length + ' topics');
console.log('  topics with >=1 primary fact : ' + stats.withPrimary + '/' + stats.topics);
console.log('  topics with 0 primary facts  : ' + stats.zeroPrimary.length);
console.log('  primary facts total          : ' + stats.primaryTotal);
console.log('  context statements           : ' + stats.contextTotal);
console.log('  neighbour relationships      : ' + stats.neighbourTotal);
console.log('Saved to: ' + OUTPUT);
if (stats.zeroPrimary.length) {
  console.log('  no-primary sample: ' + stats.zeroPrimary.slice(0, 12).join(' | '));
}
