'use strict';

// Fact / date / category ownership primitives.
//
// A source page tells us WHERE a statement was found. It never tells us WHO or
// WHAT the statement is ABOUT. Everything here exists to keep those two apart:
// a candidate fact is only allowed to reach a selected entity's revision card
// after its resolved subject has been compared with that entity's canonical id.

var STOPWORDS = {
  the: 1, a: 1, an: 1
};

// Words that join a name without carrying meaning. They are removed when
// deriving an acronym, so "Goods and Services Tax" still yields "GST".
var CONNECTORS = {
  and: 1, of: 1, the: 1, for: 1, in: 1, on: 1, at: 1, to: 1, de: 1, la: 1
};

var HONORIFICS = {
  mr: 1, mrs: 1, ms: 1, miss: 1, dr: 1, prof: 1, professor: 1, sir: 1,
  lord: 1, lady: 1, saint: 1, st: 1, sri: 1, swami: 1, pandit: 1,
  president: 0, prime: 0, general: 0, captain: 1, major: 1, colonel: 1
};

var SUFFIXES = {
  jr: 1, sr: 1, junior: 1, senior: 1, ii: 1, iii: 1, iv: 1
};

// Cross-name equivalences that normalisation cannot derive. The first entry of
// each group is the canonical form: the most specific, full name. Surnames are
// deliberately absent here, because "Ford" or "Jinnah" alone is ambiguous and
// guessing ownership is exactly the bug this module prevents.
// Kept minimal on purpose. Every alias here was either named explicitly by the
// user or proven necessary by measurement; a longer hand-written list was tried
// and reverted because single-token aliases hijack unrelated text ("RAW" is an
// acronym and also an ordinary English word, which silently stole subjects from
// other entities). A two-token alias needs a space; single-token aliases are
// only safe for unmistakable strings such as an acronym no prose spells out.
var ALIAS_GROUPS = [
  ['World War I', 'First World War', 'WWI', 'World War 1'],
  ['World War II', 'Second World War', 'WWII', 'World War 2'],
  ['Jallianwala Bagh massacre', 'Jallianwala Bagh', 'Amritsar massacre'],
  // 'Indian Independence' was removed from this group: it is an ordinary noun
  // phrase, and as an entity alias it hijacked the head subject of "Indian
  // independence leader", stripping Gandhi of his only fact.
  ['Indian independence movement'],
  ['Muhammad Ali Jinnah', 'Muhammad Ali Jinnah Ahmed', 'Mohammad Ali Jinnah'],
  ['Rabindranath Tagore', 'Gurudev Rabindranath Tagore'],
  ['Goods and Services Tax', 'GST']
];

// Tokens too generic to identify an entity on their own.
var AMBIGUOUS_TOKENS = {
  company: 1, company: 1, bank: 1, university: 1, college: 1, school: 1,
  ministry: 1, department: 1, party: 1, court: 1, council: 1, commission: 1,
  war: 1, wars: 1, revolution: 1, independence: 1, movement: 1, act: 1,
  empire: 1, kingdom: 1, state: 1, states: 1, city: 1, government: 1,
  national: 1, international: 1, general: 1, union: 1, league: 1, association: 1
};

// Relations that make a neighbour's statement usable as context rather than
// as borrowed biography.
var CONTEXT_RELATIONS = [
  /\bpart of\b/i, /\btheatre of\b/i, /\btheater of\b/i, /\b involved in\b/i,
  /\bfought in\b/i, /\bplayed a (?:key |major |pivotal )?role\b/i,
  /\bled by\b/i, /\bcommanded by\b/i, /\bsigned\b/i, /\bratified\b/i,
  /\bnegotiated\b/i, /\btriggered\b/i, /\bcaused\b/i, /\bled to\b/i,
  /\bresulted in\b/i, /\bresulted from\b/i, /\bconsequence of\b/i,
  /\bin (?:protest|response) (?:against|to|following)\b/i,
  /\bfollowing the\b/i, /\bduring\b/i, /\bafter the\b/i, /\bbecause of\b/i,
  /\bwhich led to\b/i, /\bthat led to\b/i, /\bwho\b/i, /\bwhose\b/i
];

var PRIMARY_TYPES = {
  CORE_FACT: 1, DIRECT_EVENT: 1, DATE: 1, 'ROLE/POSITION': 1, CAUSE: 1, CONSEQUENCE: 1
};

var SECONDARY_TYPES = {
  IMPORTANT_PERSON: 1, IMPORTANT_PLACE: 1, IMPORTANT_ORGANIZATION: 1, CONTEXT: 1
};

function flatten(s) {
  return String(s == null ? '' : s)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/[^\x20-\x7E\u0900-\u097F\u00C0-\u024F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Canonical, order-independent entity id. Two mentions of the same entity must
// produce the same id or the ownership comparison silently passes everything.
function canonicalId(name) {
  var s = flatten(name).toLowerCase();
  s = s.replace(/\([^)]*\)/g, ' ');
  s = s.replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  if (!s) return '';
  var parts = s.split(' ').filter(function (w) { return w && !STOPWORDS[w]; });
  while (parts.length && (HONORIFICS[parts[0]] || SUFFIXES[parts[parts.length - 1]])) {
    if (HONORIFICS[parts[0]] === 0) break;
    parts.shift();
  }
  while (parts.length > 1 && SUFFIXES[parts[parts.length - 1]]) parts.pop();
  return parts.join(' ');
}

function displayName(name) {
  var s = flatten(name).replace(/\s+/g, ' ').trim();
  return s;
}

// Register the forms a corpus actually uses for the same entity: the name with a
// trailing qualifier dropped, so "goods and services tax (india)" also answers
// to "goods and services tax".
//
// Acronyms are deliberately NOT derived. Automatic derivation was tried and
// rejected twice on this corpus: it invented colliding aliases that then
// hijacked subject detection for unrelated entities. Acronyms are declared
// explicitly in ALIAS_GROUPS, where they can be reviewed.
function addDerivedAliases(idx, names) {
  (names || []).forEach(function (n) {
    var full = canonicalId(n);
    if (!full) return;
    var withoutParen = canonicalId(String(n).replace(/\([^)]*\)/g, ' '));
    if (withoutParen && withoutParen !== full && !idx[withoutParen]) {
      idx[withoutParen] = full;
    }
  });
}

// alias id -> canonical id
function buildAliasIndex(names) {
  var idx = Object.create(null);
  (names || []).forEach(function (n) {
    var c = canonicalId(n);
    if (c && !idx[c]) idx[c] = c;
  });
  ALIAS_GROUPS.forEach(function (group) {
    var canonical = canonicalId(group[0]);
    if (!canonical) return;
    idx[canonical] = canonical;
    group.slice(1).forEach(function (alt) {
      var a = canonicalId(alt);
      if (a) idx[a] = canonical;
    });
  });
  addDerivedAliases(idx, names);
  return idx;
}

// Deliberately NOT auto-deriving surname aliases ("Ford" -> Henry Ford). The
// heuristic is unsound: it also treats bare years and common nouns as surnames,
// so "German Revolution of 1918-1919" registered the alias "1919" and hijacked
// any sentence beginning with that year. Correctness beats recall; short forms
// stay separate identities unless an explicit ALIAS_GROUP declares them.
function resolveEntity(name, aliasIndex) {
  var raw = displayName(name);
  var id = canonicalId(raw);
  if (!id) return null;
  var resolved = (aliasIndex && aliasIndex[id]) || id;
  return {
    id: resolved,
    raw: raw,
    mentionedAs: id,
    method: resolved === id ? 'canonical' : 'alias'
  };
}

// Never-null variant for bulk use: a name that canonicalises to nothing simply
// owns nothing rather than aborting a whole corpus run.
function resolveId(name, aliasIndex) {
  var e = resolveEntity(name, aliasIndex);
  return e ? e.id : '';
}

// Index of known entity names keyed by first token, so subject detection stays
// linear instead of scanning every known name for every sentence.
// Every known entity id, plus every alias key, mapped to its canonical id.
// Matching is done by exact phrase lookup: comparing word COUNTS is what made
// "Indian Muslim campaign" resolve to "Indian Space Research Organisation".
function buildIdSet(names, aliasIndex) {
  var set = Object.create(null);
  (names || []).forEach(function (n) {
    var c = canonicalId(n);
    if (!c) return;
    set[c] = (aliasIndex && aliasIndex[c]) || c;
  });
  var aliases = aliasIndex || {};
  Object.keys(aliases).forEach(function (k) { if (k) set[k] = aliases[k]; });
  return set;
}

function words(sentence) {
  return flatten(sentence).toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim().split(' ').filter(Boolean);
}

// Longest known entity id that the word run beginning at `start` spells out.
function entityAt(tokens, start, idSet, maxWords) {
  var limit = Math.min(maxWords || 10, tokens.length - start);
  for (var take = limit; take >= 1; take--) {
    var phrase = tokens.slice(start, start + take).join(' ');
    var hit = idSet[phrase];
    if (hit) return { id: hit, len: take, raw: phrase };
  }
  return null;
}

function nameFor(id, displayById) {
  return (displayById && displayById[id]) || null;
}

// Words that can open a sentence without being its subject.
var LEADING_FUNCTION_WORDS = {
  in: 1, on: 1, at: 1, by: 1, during: 1, from: 1, to: 1, for: 1, with: 1,
  as: 1, after: 1, before: 1, between: 1, under: 1, over: 1, about: 1,
  since: 1, the: 1, a: 1, an: 1, that: 1, this: 1, these: 1, those: 1,
  it: 1, he: 1, she: 1, they: 1, there: 1, then: 1, also: 1, however: 1
};

// True when the token right after a matched name marks a genitive: "ISRO's",
// "Gandhi's", "Akbar's". A possessor modifies the head noun, it is not the
// subject, so "ISRO's first lunar orbiter" is about Chandrayaan-1 rather than
// about ISRO. Treating the possessor as the subject is what emptied the
// Chandrayaan cards.
//
// The bare "s" case matters: the corpus uses curly apostrophes and the
// tokenizer strips punctuation, so "ISRO’s" arrives here as the two tokens
// "isro" + "s".
function isGenitive(tokens, afterIndex) {
  var next = tokens[afterIndex];
  return next === "'s" || next === "s'" || next === "'" || next === 's';
}

function startsWithEntity(sentence, idSet, aliasIndex, maxWords) {
  var tokens = words(sentence);
  if (!tokens.length) return null;
  var start = 0;
  while (start < 3 && LEADING_FUNCTION_WORDS[tokens[start]]) start++;
  var hit = entityAt(tokens, start, idSet, maxWords || 8);
  if (hit && !isGenitive(tokens, start + hit.len)) {
    return { id: hit.id, name: null, len: hit.len, raw: hit.raw };
  }
  // Possessor first: look for a real subject further in. "Gandhi's Quit India
  // movement was launched in 1942" is about the movement, not about Gandhi.
  if (hit) {
    var alt = entityAt(tokens, start + hit.len + 1, idSet, maxWords || 8);
    if (alt && !isGenitive(tokens, start + hit.len + 1 + alt.len)) {
      return { id: alt.id, name: null, len: alt.len, raw: alt.raw };
    }
  }
  return null;
}

// Who is this statement about?
//
// ctx.claimantId is provenance: the entity whose own text this sentence was
// taken from. Provenance is a prior, never a proof, so an explicit grammatical
// subject in the sentence always overrides it.
var COPULAS = {
  is: 1, was: 1, are: 1, were: 1, be: 1, been: 1, being: 1,
  refers: 1, referred: 1, means: 1, meant: 1, denotes: 1, denoted: 1,
  stands: 1, stood: 1, remains: 1, remained: 1, became: 1, becomes: 1,
  remains: 1, represents: 1, represented: 1, describes: 1, described: 1
};

// A definitional sentence often buries its subject behind a determiner and an
// adjective: "The fundamental accounting equation, also called X, is ...". The
// leading test misses those, so look for a known name inside the opening clause
// that is immediately followed by a copula - that is a real grammatical subject,
// not a mention.
function findCopularSubject(sentence, idSet, maxScan) {
  var tokens = words(sentence);
  var limit = Math.min(maxScan || 12, tokens.length);
  for (var i = 0; i < limit; i++) {
    var hit = entityAt(tokens, i, idSet, 8);
    if (!hit) continue;
    var next = tokens[i + hit.len];
    if (!next) continue;
    if (COPULAS[next] || next === 's') return { id: hit.id, len: hit.len, at: i };
  }
  return null;
}

function detectSubject(sentence, ctx) {
  var s = flatten(sentence);
  var empty = { subjectId: null, confidence: 0, method: 'empty', uncertain: true, selectedIsExplicitAgent: false };
  if (!s) return empty;
  var idSet = (ctx && ctx.idSet) || Object.create(null);
  var aliasIndex = (ctx && ctx.aliasIndex) || null;
  var selectedId = (ctx && ctx.selectedId) || null;
  var claimantId = (ctx && ctx.claimantId) || null;
  var agent = detectExplicitAgent(s, selectedId, idSet, aliasIndex);

  var head = startsWithEntity(s, idSet, aliasIndex);
  if (head) {
    var isSelected = !!selectedId && head.id === selectedId;
    return {
      subjectId: head.id,
      subjectName: head.name,
      confidence: isSelected ? 0.95 : 0.85,
      method: isSelected ? 'explicit-subject' : 'explicit-subject-other',
      uncertain: false,
      selectedIsExplicitAgent: isSelected || agent
    };
  }

  if (!ctx.provenanceAuthoritative) {
    var copular = findCopularSubject(s, idSet, 12);
    if (copular) {
      var copIsSelected = !!selectedId && copular.id === selectedId;
      return {
        subjectId: copular.id,
        subjectName: null,
        confidence: copIsSelected ? 0.8 : 0.75,
        method: copIsSelected ? 'copular-subject' : 'copular-subject-other',
        uncertain: false,
        selectedIsExplicitAgent: copIsSelected || agent
      };
    }
  }

  if (claimantId && (!ctx.requireExplicitSubject || ctx.provenanceAuthoritative)) {
    return {
      subjectId: claimantId,
      subjectName: (ctx && ctx.claimantName) || null,
      confidence: 0.7,
      method: 'provenance',
      uncertain: false,
      selectedIsExplicitAgent: agent
    };
  }

  return {
    subjectId: null,
    confidence: 0,
    method: 'unresolved',
    uncertain: true,
    mentionsSelected: !!(selectedId && mentionsEntity(s, selectedId, idSet, aliasIndex)),
    selectedIsExplicitAgent: agent
  };
}

function mentionsEntity(sentence, entityId, idSet, aliasIndex) {
  var tokens = words(sentence);
  if (!tokens.length) return false;
  var joined = ' ' + tokens.join(' ') + ' ';
  var variants = Object.keys(aliasIndex || {}).filter(function (k) { return aliasIndex[k] === entityId; });
  variants.push(entityId);
  for (var i = 0; i < variants.length; i++) {
    var v = variants[i];
    if (!v) continue;
    if (joined.indexOf(' ' + v + ' ') !== -1) return true;
  }
  return false;
}

var AGENTIVE_PREPS = /\b(?:by|through|via)\s+(?:the\s+)?/i;
var AGENTIVE_VERBS = /\b(?:founded|established|created|formed|developed|populari[sz]ed|introduced|launched|headed|led|commanded|ruled|owned|designed|written|signed|discovered|invented|organi[sz]ed|directed|negotiated|authored)\s+by\s+/i;

// Is the selected entity explicitly the agent of the statement? "Established by
// Henry Ford" makes Ford the owner of that fact; "theatre of World War I" does
// not, because the entity sits in an object position instead.
function detectExplicitAgent(sentence, selectedId, idSet, aliasIndex) {
  if (!selectedId) return false;
  var raw = flatten(sentence);
  var variants = Object.keys(aliasIndex || {}).filter(function (k) { return aliasIndex[k] === selectedId; });
  variants.push(selectedId);
  variants = variants.filter(function (v) { return v && v.indexOf(' ') > -1 || v === selectedId; });
  for (var i = 0; i < variants.length; i++) {
    var v = variants[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var passive = new RegExp(AGENTIVE_PREPS.source + v + '\\b', 'i');
    if (passive.test(raw)) return true;
    var active = new RegExp(AGENTIVE_VERBS.source + '(?:the\\s+)?' + v + '\\b', 'i');
    if (active.test(raw)) return true;
  }
  return false;
}

// Ordered: the first match wins. ROLE/POSITION deliberately requires a real
// office construction rather than a bare copula, otherwise "was" swallows every
// sentence in the corpus and the label stops carrying information.
var TYPE_RULES = [
  ['CAUSE', /\b(?:because(?: of)?|due to|owing to|caused by|triggered by|resulted from|sparked|prompted|gave rise to|as a result of)\b/i],
  ['CONSEQUENCE', /\b(?:consequence|consequences|resulted in|led to|following which|thereafter|as a result|in the wake of|after which|ushered in)\b/i],
  ['DIRECT_EVENT', /\b(?:treaty|signed|declared|independence|war|battle|session|act|revolution|uprising|revolt|accord|agreement|charter|constitution|amendment|expedition|riot|protest|renounced|resigned|abolished|established|founded|inaugurated|launched|created|formed)\b/i],
  ['ROLE/POSITION', /\b(?:served as|serving as|held the (?:office|post|title|position)|appointed (?:as|to)|elected (?:as|to)|sworn in|reigned|ruled)\b|\bwas (?:the|a|an) (?:first|only|former|then|current|last|late)?\s*(?:president|prime minister|minister|chancellor|emperor|empress|king|queen|governor|governor-general|chief minister|commander|director|chairman|secretary general|president-general)\b/i],
  ['DATE', /\b(?:1[0-9]\d{2}|20[0-2]\d)\b|\b(?:c\.|circa|bc|bce|ad|ce)\b|\b\d{1,2}\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\b/i]
];

function classifyFactType(sentence) {
  var s = flatten(sentence);
  for (var i = 0; i < TYPE_RULES.length; i++) {
    if (TYPE_RULES[i][1].test(s)) return TYPE_RULES[i][0];
  }
  return 'CORE_FACT';
}

function isPrimaryType(t) { return !!PRIMARY_TYPES[t]; }
function isSecondaryType(t) { return !!SECONDARY_TYPES[t]; }

// Context must be a stated relationship, not a neighbour's biography that
// happens to name the selected entity somewhere in the middle.
// A name can denote a different thing entirely: the person "Deng Xiaoping" and
// the 2003 film "Deng Xiaoping". When the field belongs to a person node but
// the sentence describes a creative work, the lexical subject match is a
// coincidence and the statement is not about our entity.
var CREATIVE_WORKS = /\b(?:film|movie|song|album|novel|book|series|documentary|opera|musical|play|video game|sitcom|telenovela|EP|single)\b/i;

function typeConsistent(nodeType, sentence) {
  var s = flatten(sentence);
  if (!nodeType) return true;
  var t = String(nodeType).toLowerCase();
  if (t === 'person' && CREATIVE_WORKS.test(s)) return false;
  if (t === 'person' && /\b(?:is|was) (?:a|an|the) (?:film|movie|song|novel|book)\b/i.test(s)) return false;
  if (t === 'organization' && /\b(?:is|was) (?:a|an|the) (?:film|movie|song|novel|book)\b/i.test(s)) return false;
  return true;
}

function hasContextRelation(sentence) {
  var s = flatten(sentence);
  for (var i = 0; i < CONTEXT_RELATIONS.length; i++) {
    if (CONTEXT_RELATIONS[i].test(s)) return true;
  }
  return false;
}

// THE GATE. Nothing reaches a revision card without passing this.
function ownsFact(candidate, selectedId) {
  if (!candidate) return { ok: false, reason: 'no-candidate' };
  if (!selectedId) return { ok: false, reason: 'no-selected-entity' };

  if (candidate.subjectId && candidate.subjectId === selectedId) {
    if (candidate.uncertain) return { ok: false, reason: 'uncertain-subject' };
    return { ok: true, via: 'subject-match' };
  }

  // A validated event relationship may be admitted when the selected entity is
  // the explicitly established participant. The criterion is explicit agency,
  // not the fact_type label, but secondary types never become facts.
  if (candidate.participationExplicit === true &&
      candidate.eventId === selectedId &&
      isPrimaryType(candidate.factType)) {
    return { ok: true, via: 'explicit-event-participation' };
  }

  if (!candidate.subjectId) return { ok: false, reason: 'uncertain-subject' };
  return { ok: false, reason: 'subject-mismatch', subjectId: candidate.subjectId };
}

var DATE_TYPES = ['lifespan', 'reign', 'event', 'existence', 'publication', 'other'];

// A year inside an article is a mentioned date, not the entity's own date.
function classifyDate(text, opts) {
  var s = flatten(text);
  var years = (s.match(/\b(?:1[0-9]\d{2}|20[0-2]\d)\b/g) || []);
  var o = opts || {};
  if (!years.length) {
    return { dateType: null, dateStatus: 'undated', years: [], owned: false, reason: 'no-date' };
  }
  var selfOwned = /\b(?:born|died|reigned|ruled|established|founded|created|formed|published|released|launched|occurred|happened|took place|spanned|from .* to |lived)\b/i.test(s);
  if (selfOwned) {
    return { dateType: o.entityType === 'person' ? 'lifespan' : 'event', dateStatus: 'explicit', years: years, owned: true, reason: 'self-owned-interval' };
  }
  return { dateType: 'other', dateStatus: 'mentioned', years: years, owned: false, reason: 'mentioned-in-source' };
}

function validateCategory(entityId, categoryKey, ctx) {
  var rules = (ctx && ctx.categoryRules) || null;
  if (!rules) return { ok: false, reason: 'no-category-rule' };
  var allowed = rules[entityId];
  if (!allowed) return { ok: false, reason: 'category-not-established' };
  if (allowed.indexOf(categoryKey) === -1) return { ok: false, reason: 'category-mismatch' };
  return { ok: true };
}

function makeProvenance(o) {
  return {
    source: (o && o.source) || null,
    sourceEntityId: (o && o.sourceEntityId) || null,
    subjectEntityId: (o && o.subjectEntityId) || null,
    objectEntityId: (o && o.objectEntityId) || null,
    extractor: (o && o.extractor) || 'generate-revision-content',
    method: (o && o.method) || null,
    confidence: typeof (o && o.confidence) === 'number' ? o.confidence : 0
  };
}

module.exports = {
  canonicalId: canonicalId,
  displayName: displayName,
  flatten: flatten,
  buildAliasIndex: buildAliasIndex,
  buildIdSet: buildIdSet,
  resolveEntity: resolveEntity,
  resolveId: resolveId,
  detectSubject: detectSubject,
  mentionsEntity: mentionsEntity,
  startsWithEntity: startsWithEntity,
  detectExplicitAgent: detectExplicitAgent,
  classifyFactType: classifyFactType,
  classifyDate: classifyDate,
  validateCategory: validateCategory,
  ownsFact: ownsFact,
  isPrimaryType: isPrimaryType,
  isSecondaryType: isSecondaryType,
  hasContextRelation: hasContextRelation,
  typeConsistent: typeConsistent,
  makeProvenance: makeProvenance,
  PRIMARY_TYPES: PRIMARY_TYPES,
  SECONDARY_TYPES: SECONDARY_TYPES,
  DATE_TYPES: DATE_TYPES
};
