'use strict';
// Turn retrieved sentences into connected prose, deterministically.
//
// No model, no provider, no key. The essay is assembled by rule: sentences are
// classified by the rhetorical job they do, ordered into an argument shape, and
// joined with authored transitions. Every sentence stays verbatim and carries its
// citation.
//
// The hard problem is not joining sentences. It is that entity-anchored
// retrieval returns an entity's most PROMINENT sentences, which are frequently
// irrelevant to the heading's claim. Asked for the revolutionary stream, the
// entity "Bhagat Singh" returns a police shooting narrative; asked for a
// socialist current, "Subhas Chandra Bose" returns an honorific. Written up
// without regard for that, the result is fluent and wrong -- the worst outcome,
// because it survives a reader's glance.
//
// So selection is claim-conditioned first and rhetorical ordering second. A
// sentence has to earn its place against the heading's own terms before it can be
// considered for any structural role. Sentences that survive are labelled by role
// from surface cues only; nothing is inferred that the text does not support.

var COMPOSE_VERSION = 2;

// ── claim conditioning ───────────────────────────────────────────────────────

var STOP = {};
var STOPWORDS = ('a an the and or but of in on at to for from by with as is are was ' +
  'were be been being it its this that these those he she they we you i his her ' +
  'their our your not no nor so than then there here when where which who whom what ' +
  'while during into over under about after before between against through also more ' +
  'most such only other others some any each');
STOPWORDS.split(' ').forEach(function (w) { STOP[w] = 1; });

function tokens(s) {
  return String(s || '').toLowerCase().match(/[a-z0-9]+/g) || [];
}

// Inflected verb forms are reduced to a shared stem before matching.
//
// Without this, a heading saying "how the movement began" fails to match the only
// sentence the corpus offers about its founding, "It was founded on 28 December
// 1885", because "began" and "founded" share no characters. That is not a rare
// accident: most of the corpus records events in the past tense while outlines are
// written in a natural present, so the mismatch is systematic and silently drops
// the most relevant sentence in the set.
//
// The rules are deliberately small and conservative rather than a general
// stemmer. Each entry is an inflection of one stem, so precision is not put at
// risk by guessing; the regex rules below only strip endings where the stem stays
// readable.
var MORPH = {
  began: 'begin', begun: 'begin', begins: 'begin', beginning: 'begin',
  founded: 'found', found: 'found', finds: 'find', finding: 'find',
  formed: 'form', forms: 'form', forming: 'form', formation: 'form',
  organised: 'organise', organized: 'organise', organisation: 'organise',
  organization: 'organise', organises: 'organise', organizes: 'organise',
  mobilized: 'mobilise', mobilised: 'mobilise', mobilises: 'mobilise',
  launched: 'launch', launches: 'launch',
  proposed: 'propose', proposes: 'propose', proposed: 'propose',
  led: 'lead', leads: 'lead', leading: 'lead',
  spread: 'spread', spreads: 'spread', spreading: 'spread',
  grew: 'grow', grown: 'grow', growth: 'grow',
  rose: 'rise', risen: 'rise', rising: 'rise',
  fell: 'fall', fallen: 'fall', falling: 'fall',
  won: 'win', wins: 'win', winning: 'win',
  saw: 'see', seen: 'see', seeing: 'see',
  took: 'take', taken: 'take', taking: 'take',
  gave: 'give', given: 'give', giving: 'give',
  came: 'come', coming: 'come',
  went: 'go', gone: 'go', going: 'go',
  made: 'make', making: 'make',
  became: 'become', becoming: 'become',
  held: 'hold', holding: 'hold',
  built: 'build', building: 'build',
  forced: 'force', forcing: 'force',
  continued: 'continue', continues: 'continue', continuing: 'continue',
  strengthened: 'strengthen', strengthens: 'strengthen', strengthened: 'strengthen',
  enriched: 'enrich', enriches: 'enrich',
  mobilised: 'mobilise', mobilizes: 'mobilise',
  struggle: 'struggle', struggles: 'struggle', struggled: 'struggle'
};

var SUFFIX = [
  [/ies$/, 'y'],
  [/es$/, ''],
  [/s$/, ''],
  [/ing$/, ''],
  [/ed$/, '']
];

// Stem a token: the explicit table first, then conservative suffix stripping.
// Words shorter than four characters are left alone, because stripping "ed" from
// "bed" or "red" produces collisions that would create false relevance.
function stem(t) {
  if (MORPH[t]) return MORPH[t];
  if (t.length <= 4) return t;
  for (var i = 0; i < SUFFIX.length; i++) {
    var next = t.replace(SUFFIX[i][0], SUFFIX[i][1]);
    if (next !== t && next.length >= 4) return next;
  }
  return t;
}

function contentTokens(s) {
  return tokens(s).filter(function (t) { return !STOP[t] && t.length > 2; });
}

function stems(s) {
  var out = [];
  contentTokens(s).forEach(function (t) { out.push(stem(t)); });
  return out;
}

// Terms that make a sentence about a specific claim rather than about a topic.
//
// The heading's own words carry the claim. The entity's words are held separately
// and only ever used as a bonus, because the entity is already guaranteed: every
// sentence considered came out of that entity's shard. Folding the entity's name
// into the same term set was wrong, and measurably so -- a sentence about the
// Indian National Congress that says "the Congress" or "it" without repeating
// "Indian" scored 0.20 against a 0.34 threshold and was discarded, while a
// sentence full of the entity's words but saying nothing about the claim scored
// highly. Retrieval already established the entity; relevance must test the claim.
function claimTerms(heading) {
  var out = {};
  stems(heading).forEach(function (t) { out[t] = 1; });
  return out;
}

function entityTerms(entity) {
  var out = {};
  stems(entity).forEach(function (t) { out[t] = 1; });
  return out;
}

// How strongly a sentence bears on the claim.
//
// Headline: coverage of the heading's vocabulary, which is the claim.
// A small bonus for naming the entity, because a sentence that names its subject
// is easier for a reader to place, but a bonus rather than a requirement.
function relevance(sentence, terms, entityWords) {
  var toks = stems(sentence);
  if (!toks.length) return 0;
  var set = {};
  toks.forEach(function (t) { set[t] = 1; });

  var keys = Object.keys(terms);
  var hits = 0, distinct = 0;
  keys.forEach(function (t) {
    if (set[t]) { hits++; distinct++; }
  });
  if (!keys.length) return 0;
  var termCount = keys.length;
  var coverage = distinct / termCount;
  // Repetition is weak evidence of discussion rather than a passing mention.
  var density = (hits - distinct) * 0.06;

  var eKeys = Object.keys(entityWords || {});
  var named = 0;
  eKeys.forEach(function (t) { if (set[t]) named++; });
  var nameBonus = eKeys.length ? (named / eKeys.length) * 0.12 : 0;

  return coverage + density + nameBonus;
}

// ── rhetorical role, from surface cues only ──────────────────────────────────

var ROLES = {
  definition: /\b(was|is) (an?|the) [\w-]+( who| which| that)?\b|^\w+ (is|was) (a|an|the)\b/,
  // "formed" and "organised" are absent here for the same reason "led" is absent
  // from method: they describe ongoing operation, not inception. "formed in 1885"
  // is still caught by the date rule below.
  origin: /\b(founded|established|created|began|emerged|constituted)\b|\b\w+ed (on|in) \d{1,2}?\s?\w*\s?\d{4}\b|\bin \d{4}\b/,
  // "led" is deliberately absent. Bare `led` matched "led to independence" and,
  // because method outranks outcome in ROLE_PRIORITY, stole it: a sentence
  // reporting a result was filed as a description of how the movement operated.
  // The resultive sense is matched as the two-word phrase in `outcome` instead.
  method: /\b(organised|organized|mobilised|mobilized|launched|started|advocated|proposed|introduced)\b/,
  scale: /\b(million|lakh|crore|thousand|per cent|percent|%|across|throughout|nationwide|all India)\b/,
  outcome: /\b(resulted in|led to|caused|brought about|ended with|concluded|succeeded|failed|passed|declared)\b/,
  significance: /\b(significant|important|marked|milestone|turning point|landmark|decisive|crucial|pivotal)\b/,
  context: /\b(against|background|following|after|during|at the time|colonial|British|era|period)\b/
};

// Which role wins when a sentence matches several. A founding cue outranks a
// copula wherever it sits, because "The base of the movement was an organisation
// formed in 1885" is a statement about origin, not about definition. Ordering was
// previously positional, which labelled that sentence `definition` simply because
// "was an" appeared earlier in the string, and then sorted it to the front of the
// paragraph as though it introduced the thing. Structural cues are self-contained
// and specific; `definition` and `context` are catch-alls, so they rank lowest.
var ROLE_PRIORITY = ['origin', 'method', 'outcome', 'scale', 'significance', 'definition', 'context'];

function classify(sentence) {
  var t = String(sentence || '').toLowerCase();
  var best = 'context';
  for (var i = 0; i < ROLE_PRIORITY.length; i++) {
    var role = ROLE_PRIORITY[i];
    if (ROLES[role].test(t)) return role;
  }
  return best;
}

// ── transitions, authored ────────────────────────────────────────────────────
//
// These are connective tissue, and because they are authored they are the only
// part of the output that is not corpus text. That is stated in the output note
// rather than hidden, so a reader knows exactly what is evidence and what is
// structure.

// Transitions have to read correctly in front of ANY corpus sentence, and most
// corpus sentences open with a pronoun or a bare clause ("It was later governed
// by a committee"). So they are kept short and label-like: an earlier draft used
// "The scale of it: " and "Its origins lie earlier: ", which required knowing
// what the next sentence was about to begin with. A label-like transition stays
// grammatical regardless of what follows it.
var TRANSITION = {
  first: '',
  definition: '',
  origin: 'Earlier still: ',
  method: 'In practice: ',
  scale: 'In scale: ',
  outcome: 'In outcome: ',
  significance: 'Why it mattered: ',
  context: 'In context: '
};

var PARAGRAPH_SHAPE = [
  // The order sentences are placed in. An essay opens by establishing what the
  // thing is, then when it began, then how it operated, then how far it reached,
  // then what came of it.
  ['definition', 'origin', 'method', 'scale', 'outcome', 'significance', 'context'],
  ['origin', 'definition', 'method', 'scale', 'significance', 'outcome', 'context'],
  ['method', 'scale', 'outcome', 'significance', 'definition', 'origin', 'context']
];

function shapeFor(index, heading) {
  var h = String(heading || '').toLowerCase();
  if (/origin|begin|found|emerg|form|establish|start|rise/.test(h)) return PARAGRAPH_SHAPE[1];
  if (/how|method|process|mechanism|operat|practice/.test(h)) return PARAGRAPH_SHAPE[2];
  return PARAGRAPH_SHAPE[0];
}

// ── domain gating ────────────────────────────────────────────────────────────
//
// Sentence-level relevance is necessary but not sufficient. Phrase-index escape
// surfaced sentences from entities with no connection to the question's subject:
//
//   "Socialist stream"     -> "Albanian People's Army ... was the national army"
//   "Socialist stream"     -> "2014 Serbian parliamentary election ... Socialists"
//   "Dalit and anti-caste"  -> "Navy's current Harpoon anti-ship missile"
//
// All three score well on vocabulary: the words "socialist" and "anti" are present
// and the corpus is genuinely about them. But a Serbian election and an Albanian
// army are not evidence about India's nationalist movement, and quoting them under
// that heading is the confident-wrong-answer failure this module exists to prevent.
//
// Vocabulary cannot tell those apart, because the overlap is real. What separates
// them is whether the entity belongs to the same subject area. So a heading may
// declare a domain, and an entity outside it is refused regardless of how well its
// sentences score. Without a declared domain the check is skipped rather than
// guessed, because an invented domain would silently suppress genuine evidence.

// A domain is a list of accepted terms. An entity matches if any of its words, or
// the whole name, contains one. Deliberately loose: the aim is to exclude clearly
// foreign material, not to adjudicate borderline cases.
function domainAllows(entity, domains) {
  if (!domains || !domains.length) return true;
  var name = String(entity || '').toLowerCase();
  var words = tokens(name);
  for (var i = 0; i < domains.length; i++) {
    var d = String(domains[i]).toLowerCase().trim();
    if (!d) continue;
    if (name.indexOf(d) !== -1) return true;
    for (var w = 0; w < words.length; w++) {
      if (words[w] === d) return true;
    }
  }
  return false;
}

// Picks sentences for one heading. `minRelevance` is the cut-off that stops a
// merely-related sentence from being written as though it supported the claim.
function selectFor(heading, entity, evidence, opts) {
  opts = opts || {};
  var minRel = opts.minRelevance == null ? 0.34 : opts.minRelevance;
  var want = opts.perHeading || 4;
  var terms = claimTerms(heading);
  var eWords = entityTerms(entity);
  var domains = opts.domains || (opts.point && opts.point.domains);

  var rejectedDomain = 0;
  var scored = [];
  (evidence || []).forEach(function (e) {
    var sent = e.sentence || e.text || '';
    var entName = e.entity || entity;
    // Only escape evidence is gated. A sentence that reached us through entity
    // lookup was resolved deliberately: its row name came back from the entity
    // table for the heading's own term, so its subject is on-claim by
    // construction and gating it would suppress evidence the caller asked for.
    //
    // Escape evidence is the opposite. It was found by scanning unrelated buckets
    // for sentences containing a phrase, which is how "2014 Serbian parliamentary
    // election" ended up under "Socialist stream". Those entities were never
    // chosen; they were merely the owners of a matching word, so each one has to
    // earn its place against the heading's declared subject area.
    if (e.escape && e.entity && !domainAllows(entName, domains)) {
      rejectedDomain++;
      return;
    }
    scored.push({ item: e, sentence: sent, rel: relevance(sent, terms, eWords),
      role: classify(sent) });
  });

  var kept = scored.filter(function (s) { return s.rel >= minRel; });
  // A heading with nothing above the cut-off is reported as thin rather than
  // padded with the best of the irrelevant. That is the whole point: a short
  // honest paragraph beats a full dishonest one.
  if (!kept.length) {
    var best = scored.slice().sort(function (a, b) { return b.rel - a.rel; })[0];
    return { lines: [], roles: [], top: best ? best.rel : 0,
      rejected: scored.length, rejectedDomain: rejectedDomain };
  }

  kept.sort(function (a, b) { return b.rel - a.rel; });
  var chosen = kept.slice(0, want);
  var shape = shapeFor(0, heading);
  chosen.sort(function (a, b) {
    var ai = shape.indexOf(a.role), bi = shape.indexOf(b.role);
    // Unknown roles sort last rather than first.
    if (ai === -1) ai = 99;
    if (bi === -1) bi = 99;
    return ai - bi || b.rel - a.rel;
  });
  return { lines: chosen, roles: chosen.map(function (c) { return c.role; }),
    top: chosen[0].rel, rejected: scored.length - kept.length,
    rejectedDomain: rejectedDomain };
}

// One paragraph of prose. Returns the paragraph plus the mapping back to
// evidence, because a sentence of prose with no route back to a source is exactly
// the unaccountable writing this system is meant to avoid.
function paragraph(heading, entity, evidence, opts) {
  opts = opts || {};
  var sel = selectFor(heading, entity, evidence, opts);
  if (!sel.lines.length) {
    return {
      status: sel.rejected ? 'thin' : 'empty',
      heading: heading,
      entity: entity,
      text: '',
      sentences: [],
rejectedCount: sel.rejected,
    rejectedDomain: sel.rejectedDomain,
      topRelevance: sel.top
    };
  }

  var parts = [];
  var used = {};
  sel.lines.forEach(function (c, i) {
    var s = String(c.sentence).trim();
    // Dedupe: a sentence that appears twice in one paragraph reads as an error.
    if (used[s]) return;
    used[s] = 1;
    var lead = '';
    if (i > 0) {
      lead = TRANSITION[c.role] || '';
      // Normalise spacing: a transition already ends in a space, and appending
      // another produced a double space in the rendered paragraph.
      lead = lead.trim();
    }
    parts.push({ text: (lead ? lead + ' ' : '') + s, sentence: s, role: c.role,
      entity: c.item.entity, trust: c.item.trust, cats: c.item.cats,
      escape: !!c.item.escape });
  });

  var body = parts.map(function (p) { return p.text; }).join(' ');
  return {
    status: 'written',
    heading: heading,
    entity: entity,
    text: body,
    sentences: parts,
    rejectedCount: sel.rejected,
    rejectedDomain: sel.rejectedDomain,
    topRelevance: sel.top
  };
}

// ── document ─────────────────────────────────────────────────────────────────

// The full essay. An outline point is
//   [heading, entity, alternates, opts?]
// where the optional fourth element declares
//   domains -- admissible subject areas, used to gate escape evidence
//   rescue  -- extra terms to resolve in the phrase index when entity lookup
//              returns nothing usable for this heading
//
// The heading text is the claim, which is why the relevance filter works at all
// without a model. Escape evidence is merged after entity evidence and marked, so
// domain gating applies to it and the renderer can show where each sentence came
// from rather than presenting a rescued sentence as if entity lookup had found it.
function write(question, outline, result, opts) {
  opts = opts || {};
  var byLabel = result.byLabel || {};
  var paras = [];
  var counts = { written: 0, thin: 0, empty: 0 };
  var escapeUsed = 0;

  (outline || []).forEach(function (p) {
    var heading = p[0], entity = p[1];
    var local = p[3] || {};
    var pt = byLabel[heading] || {};
    var resolved = pt.resolved || entity;

    var evidence = (pt.evidence || []).slice();
    // Escape evidence may be attached per heading by the caller, or supplied as a
    // single pool keyed by label. The pool form is what the browser uses, since it
    // fetches one set of rows and offers them to every needy heading.
    var escape = (pt.escape || (result.escapeByLabel || {})[heading] || []).slice();
    escape.forEach(function (e) {
      // Marked here rather than by the caller so a rescue path cannot forget to
      // mark, which would let off-domain evidence past the gate silently.
      e.escape = true;
    });
    escapeUsed += escape.length;

    var popts = {
      perHeading: local.perHeading || opts.perHeading || 4,
      minRelevance: local.minRelevance != null ? local.minRelevance
        : (opts.minRelevance == null ? 0.34 : opts.minRelevance),
      domains: local.domains || opts.domains
    };

    // Entity evidence first. Escape evidence only matters when the heading has
    // little or nothing of its own, so it is appended rather than merged
    // indiscriminately -- otherwise a well-covered heading could have its
    // on-claim sentences displaced by off-entity ones of similar relevance.
    var para = paragraph(heading, resolved, evidence, popts);
    if (para.status !== 'written' && escape.length) {
      para = paragraph(heading, resolved, evidence.concat(escape), popts);
      para.usedEscape = para.status === 'written';
    }

    if (para.status === 'written') counts.written++;
    else if (para.status === 'thin') counts.thin++;
    else counts.empty++;
    paras.push(para);
  });

  var total = paras.length;
  return {
    question: question,
    paragraphs: paras,
    counts: counts,
    total: total,
    escapeSentences: escapeUsed,
    minRelevance: opts.minRelevance == null ? 0.34 : opts.minRelevance,
    // Stated in the output because it is true and a reader needs to know it: the
    // sentences are the corpus's, the structure and transitions are authored.
    method: 'Deterministic assembly. Every sentence is verbatim corpus text with ' +
      'its source. Paragraph order, transitions and heading claims are authored, ' +
      'not inferred. No model was used.',
    isGenerated: false,
    isArgument: false
  };
}

function toText(doc) {
  var threshold = (doc && doc.minRelevance != null) ? doc.minRelevance : 0.34;
  var out = [];
  out.push('QUESTION: ' + doc.question);
  out.push('');
  doc.paragraphs.forEach(function (p) {
    if (p.status === 'written') {
      out.push(p.heading + ' (' + p.entity + ')');
      out.push(p.text);
      out.push('');
    } else if (p.status === 'thin') {
      out.push(p.heading);
      out.push('[Not written. The corpus holds "' + p.entity + '" but none of its ' +
        'sentences bear on this heading; the best available relevance was ' +
        p.topRelevance.toFixed(2) + ' against a ' + threshold.toFixed(2) +
        ' threshold.]');
      out.push('');
    } else {
      out.push(p.heading);
      out.push('[No evidence at all. No entity named "' + p.entity + '" exists in the corpus.]');
      out.push('');
    }
  });
  out.push(doc.method);
  return out.join('\n');
}

function opts_min(opts) { return (opts && opts.minRelevance != null) ? opts.minRelevance : 0.34; }

module.exports = {
  paragraph: paragraph,
  write: write,
  toText: toText,
  relevance: relevance,
  classify: classify,
  domainAllows: domainAllows,
  claimTerms: claimTerms,
  entityTerms: entityTerms,
  contentTokens: contentTokens,
  stems: stems,
  stem: stem,
  selectFor: selectFor,
  COMPOSE_VERSION: COMPOSE_VERSION
};