(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./ask-prose.js'));
  else root.VlymbooqAskSynthesize = factory(root.VlymbooqAskProse);
}(typeof self !== 'undefined' ? self : this, function (prose) {
  'use strict';
// Synthesis: bring scattered corpus facts together into one structured answer.
//
// WHAT THIS IS FOR. The entity path answers "what is X" by fetching the sentences
// belonging to the entity named X. It cannot answer "discuss the challenges of
// regulating emerging technologies", because that question names no entity. The
// facts it needs exist -- sentences about the AI Act, about regulation, about
// biotechnology -- but they sit under dozens of unrelated entity rows, and no
// single lookup reaches them.
//
// This module reaches them the way the archive search does: by term, not by
// entity name. Every content term of the question is looked up in the phrase
// index, which reports which buckets hold sentences containing that term and how
// often. The buckets that hold the most matching text are fetched, every sentence
// in them is scored against the question, and the survivors are grouped into the
// shape a mains answer takes.
//
// WHAT THIS DELIBERATELY IS NOT. It does not write prose and it does not infer.
// Every sentence returned is verbatim corpus text carrying its entity and
// categories. The grouping, the headings and the ordering are authored shapes that
// sentences are filed into -- never text the module composes. An answer assembled
// from facts the reader can check is worth having; a fluent answer that quietly
// invented a claim is the failure mode this whole system exists to avoid, so the
// two are kept apart by construction: `write()` returns quotes and their sources,
// and the caller is responsible for any connective prose it chooses to add.

var MAX_SECTIONS = 6;
var MIN_RELEVANCE = 0.24;

// ── question terms ───────────────────────────────────────────────────────────

// Question scaffolding and ordinary words carry no retrieval signal, and scoring
// on them is what made a stopword match look like a topical one.
var STOP = {};
('a an the and or but of in on at to for from by with as is are was were be been ' +
  'being it its this that these those he she they we you i his her their our your ' +
  'not no nor so than then there here when where which who whom what while during ' +
  'into over under about after before between against through also more most such ' +
  'only other others some any each does did do will would can could may might ' +
  'shall should must has have had').split(' ').forEach(function (w) { STOP[w] = 1; });

// The imperative opener and the demand noun are question furniture. A term list
// built from "discuss the challenges of regulating X" must not be led by
// "discuss" or "challenges", because the phrase index holds neither and every
// bucket looked up for them is a wasted fetch.
var FURNITURE = {};
('analyse analyze examine discuss explain describe evaluate assess appraise ' +
  'compare distinguish differentiate illustrate elaborate outline comment write ' +
  'note examine role roles importance significance contribution contributions ' +
  'impact impacts challenge challenges problem problems issue issues ' +
  'advantage advantages disadvantage disadvantages merit merits demerit demerits ' +
  'lesson lessons measure measures reform reforms way forward conclusion ' +
  'introduction india indian mains gs paper question answer briefly detail ' +
  'details account context light regard given critically examine').split(' ')
  .forEach(function (w) { FURNITURE[w] = 1; });

var MIN_TERM = 3;

// Content terms of a question, longest first, plus the bigrams that the corpus
// often stores whole. Longest-first matters: "emerging technologies" is a phrase
// the index holds verbatim, and searching "technologies" first would surface the
// buckets about optical discs before the phrase ever got its turn.
function terms(question) {
  var words = String(question || '').toLowerCase().split(/[^a-z0-9]+/).filter(function (w) {
    return w.length >= MIN_TERM && !STOP[w] && !FURNITURE[w];
  });
  var seen = {}, out = [];
  for (var i = 0; i + 1 < words.length; i++) {
    var bg = words[i] + ' ' + words[i + 1];
    if (!seen[bg]) { seen[bg] = 1; out.push(bg); }
  }
  words.forEach(function (w) { if (!seen[w]) { seen[w] = 1; out.push(w); } });
  return out;
}

// ── retrieval over the phrase index ──────────────────────────────────────────

// Turn phrase-index hits into a ranked bucket list.
//
// Rank is summed document frequency, so a bucket holding several of the
// question's own terms outranks one holding only a common term. The cap is
// applied here rather than after fetching, because the byte cost is the point:
// twenty-four buckets is a page-load, two hundred is not.
function rankBuckets(hits, cap) {
  var score = {}, byTerm = {};
  hits.forEach(function (h) {
    if (!h) return;
    var t = h.term;
    // The adapter flattens the index row to {term, df, buckets}; a raw index row
    // arrives as {term, hit:{d,b}}. Accepting both means the ranking can be
    // exercised against a fixture without an adapter in the way.
    var buckets = h.buckets || (h.hit && (h.hit.buckets || h.hit.b)) || [];
    var df = h.df != null ? h.df : ((h.hit && h.hit.df != null) ? h.hit.df : ((h.hit && h.hit.d) || 1));
    buckets.forEach(function (b) {
      score[b] = (score[b] || 0) + (df || 1);
      if (!byTerm[b]) byTerm[b] = [];
      if (byTerm[b].indexOf(t) === -1) byTerm[b].push(t);
    });
  });
  var ranked = Object.keys(score).sort(function (a, b) { return score[b] - score[a]; });
  if (cap && ranked.length > cap) ranked = ranked.slice(0, cap);
  return ranked.map(function (b) { return { bucket: b, score: score[b], terms: byTerm[b] }; });
}

// ── scoring ──────────────────────────────────────────────────────────────────

// Whether a stem sequence contains a phrase's stems contiguously. "emerging
// technologies" is matched as a unit, not as two independent words: a sentence
// about "emerging markets" and one about "technologies" each hold one word of it
// and neither is about the topic.
function hasPhrase(stemArr, phraseStems) {
  if (!phraseStems.length || phraseStems.length > stemArr.length) return false;
  for (var i = 0; i + phraseStems.length <= stemArr.length; i++) {
    var hit = true;
    for (var j = 0; j < phraseStems.length; j++) {
      if (stemArr[i + j] !== phraseStems[j]) { hit = false; break; }
    }
    if (hit) return true;
  }
  return false;
}

// How many distinct question words a sentence has to hold on its own.
//
// A single shared word is not evidence of topic: "legal framework" qualifies a
// sentence about abortion law for a question about regulating technology, and a
// corpus-wide scorer cannot tell the difference from the words alone. Requiring
// either the question's own phrase or several distinct words is what separates
// a sentence about the subject from one that merely uses its vocabulary. The
// floor stays at two so a short question is still answerable.
function distinctNeed(n) {
  return Math.max(2, Math.min(3, Math.ceil(n * 0.3)));
}

// Which of the question's phrases name its topic.
//
// Not every phrase in a question carries the same weight. In "the challenges of
// regulating emerging technologies when innovation develops faster than legal
// frameworks", the topic is established at the front and the "when" clause
// supplies background vocabulary. A sentence about "legal frameworks" alone is
// therefore about a different subject -- abortion law has legal frameworks too
// -- while one about "emerging technologies" is not, even though both phrases
// come from the same question.
//
// English puts the head of a noun phrase first, so the leading phrases are the
// topic and the trailing ones are context. `TOP_CENTRAL` of them open the gate
// on their own; a sentence sharing only context vocabulary has to clear the
// distinct-word bar instead, which most coincidental matches do not.
var TOP_CENTRAL = 3;

// Relevance contributed by the phrases a sentence actually contains, weighted by
// how central each phrase is to the question. This is what orders the survivors:
// a fact holding the topic phrase outranks one holding only background
// vocabulary, at equal claim relevance.
function phraseWeight(phrases, stems) {
  var w = 0;
  for (var i = 0; i < phrases.length; i++) {
    if (!hasPhrase(stems, prose.stems(phrases[i]))) continue;
    w += (phrases.length - i) / phrases.length;
  }
  return Math.min(0.2, w * 0.07);
}

// How strongly a sentence bears on the whole question, as opposed to on one of
// its terms.
//
// The order matters. A topic gate runs first and zeroes a sentence that shares
// only a word or two with the question, because scoring such a sentence at all
// lets vocabulary masquerade as relevance -- that is how a sentence about
// abortion law ranked as top evidence for a question about technology
// regulation. What survives the gate is then scored on three signals:
//
//   claim     -- the prose layer's own relevance against the question's stems.
//                This is what stops a sentence from qualifying on vocabulary
//                alone, and it is the same test the entity path already applies,
//                so the two paths hold the same bar.
//   found-by  -- a bonus for each question term that actually located this
//                bucket. A sentence in a bucket reached by "emerging
//                technologies" is better evidence about emerging technologies
//                than one reached only by "legal", even if both score equally on
//                claim coverage.
//   cue       -- a bonus for surface cues that mark a sentence as doing the
//                rhetorical job a mains answer needs: naming a risk, an
//                institution, a recommendation.
//
// The entity's own name is scored as well. An entity called "Regulation of
// artificial intelligence" is on-topic before its sentences are read, while
// "G.I. Joe" is not however many question words its text happens to repeat.
function scoreSentence(sentence, entity, question, opts) {
  opts = opts || {};
  var stems = prose.stems(sentence);
  var stemSet = {};
  stems.forEach(function (t) { stemSet[t] = 1; });

  var singles = opts.singles || [];
  var phrases = opts.phrases || [];

  // Which phrases the sentence actually holds, and how central each is.
  var heldPhrases = [];
  phrases.forEach(function (t, i) {
    if (hasPhrase(stems, prose.stems(t))) heldPhrases.push(i);
  });

  var distinct = 0;
  singles.forEach(function (t) { if (stemSet[prose.stem(t)]) distinct++; });

  // Topic gate. A sentence passes when it holds one of the question's leading
  // phrases -- the ones that establish the topic -- or when it holds enough
  // distinct question words to be about the subject by accumulation. Holding
  // only trailing context vocabulary ("legal frameworks") does not open the
  // gate, which is what keeps abortion law and canal law out of an answer about
  // regulating technology.
  var centralHit = heldPhrases.some(function (i) { return i < TOP_CENTRAL; });
  if (!centralHit && distinct < distinctNeed(singles.length)) {
    return { base: 0, found: 0, cues: 0, distinct: distinct, total: 0 };
  }

  var claim = prose.relevance(sentence, prose.claimTerms(question), prose.entityTerms(entity));
  var subject = opts.subject ? prose.relevance(sentence, prose.claimTerms(opts.subject), prose.entityTerms(entity)) : 0;
  var base = Math.max(claim, subject * 0.9);

  var found = 0;
  var low = ' ' + String(sentence || '').toLowerCase().replace(/\s+/g, ' ') + ' ';
  (opts.foundTerms || []).forEach(function (t) {
    if (low.indexOf(' ' + t + ' ') !== -1) found += 0.05;
  });

  var cues = 0;
  Object.keys(CUE).forEach(function (dim) {
    if (dim === 'recommend') return;
    if (CUE[dim].test(low)) cues += 0.03;
  });

  // The entity name, before any of its text is read.
  var entStems = prose.stems(entity || '');
  var entHit = 0;
  singles.forEach(function (t) { if (entStems.indexOf(prose.stem(t)) !== -1) entHit++; });
  var entityScore = Math.min(0.12, entHit * 0.06) +
    (phrases.some(function (t) { return hasPhrase(entStems, prose.stems(t)); }) ? 0.06 : 0);

  // Centrality of the phrases this sentence holds. It sits after the gate
  // because its only job is to order survivors: a fact about the topic phrase
  // must outrank one that passed on accumulated words.
  var pw = phraseWeight(phrases, stems);

  return { base: base, found: Math.min(found, 0.3), cues: Math.min(cues, 0.15),
    distinct: distinct, centralHit: centralHit, entity: entityScore, phraseW: pw,
    total: base + Math.min(found, 0.3) + Math.min(cues, 0.15) + entityScore + pw };
}

// ── rhetorical dimensions ────────────────────────────────────────────────────
//
// A mains answer is not a flat list of sentences. It has a shape: what the thing
// is, what makes it hard, what institutions are involved, what should follow.
// Those are dimensions, and each is a surface test on the sentence -- no
// inference about what a sentence means, only which of its own words it uses.
//
// The tests are deliberately loose at the top level and specific at the cue
// level. "Regulation" is not a dimension; "regulator", "oversight",
// "compliance" and "enforcement" are, and they are what actually distinguishes
// an institutional sentence from a technical one.

var CUE = {
  // Who makes and enforces the rules.
  institutional: /\b(regulat\w*|legislat\w*|statut\w*|law|laws|legal|framework\w*|polic\w*|govern\w*|ministr\w*|agency|agencies|authorit\w*|commission|council|committee|parliament\w*|legislature\w*|court\w*|judiciar\w*|act|acts|bill|bills|rule\w*|oversight|enforce\w*|compl\w*|licen[cs]\w*|audit\w*|accountab\w*|jurisdiction\w*|mandate\w*|standard\w*|guidelin\w*|code of conduct)\b/,
  // What can go wrong, and who it goes wrong for.
  risk: /\b(risk\w*|harm\w*|danger\w*|threat\w*|vulnerab\w*|expos\w*|misuse|abuse|exploit\w*|bias\w*|discriminat\w*|surveill\w*|privacy|consent\w*|autonomy\w*|dignity|rights?\b|liberty|safety|insecur\w*|unintended|unpredict\w*|opaque|transparen\w*|explainab\w*|accountab\w*|liab\w*)\b/,
  // What it costs and who profits.
  economic: /\b(econom\w*|market\w*|industr\w*|invest\w*|cost\w*|price\w*|growth|competit\w*|monopol\w*|oligopol\w*|intellectual property|patent\w*|startup\w*|entrepreneur\w*|employ\w*|job\w*|trade|export\w*|import\w*|foreign invest\w*|gdp|fiscal\w*|tax\w*|subsid\w*)\b/,
  // Who in society is affected.
  social: /\b(society|social|citizen\w*|public\b|consumer\w*|user\w*|digital divide|inequal\w*|exclusion\w*|inclus\w*|marginal\w*|vulnerab\w*|rural|urban|poor|poverty|health\w*|education\w*|data\b|breach\w*|cyber\w*|access\w*)\b/,
  // The science itself.
  technical: /\b(technolog\w*|scient\w*|research\w*|innovat\w*|invent\w*|develop\w*|artificial intelligence|\bai\b|machine learning|algorithm\w*|quantum|biotech\w*|nano\w*|gene\w*|genom\w*|robot\w*|automat\w*|system\w*|comput\w*|data\b|model\w*|deep learning|autonomous\w*)\b/,
  // Across borders.
  international: /\b(internation\w*|global\w*|cross-border|harmoni[sz]\w*|treaty\w*|agreement\w*|cooperation|united nations|\bun\b|oecd|\beu\b|european union|standard\w* across|jurisdiction\w* conflict|regulatory arbitrage|worldwide|multilateral\w*|bilateral\w*)\b/,
  // What should be done about it.
  recommend: /\b(should|must|needs? to|ought to|recommend\w*|suggest\w*|propos\w*|reform\w*|strengthen\w*|improve\w*|enhance\w*|adopt\w*|introduc\w*|establish\w*|set up|create\w*|ensur\w*|safeguard\w*|protect\w*|regulat\w* sandbox\w*|harmoni[sz]\w*|cooperat\w*|review\w*|updat\w*|modern\w*|capacity building|institutional\w* build\w*)\b/
};

function dimsOf(sentence) {
  var low = ' ' + String(sentence || '').toLowerCase().replace(/\s+/g, ' ') + ' ';
  var out = [];
  Object.keys(CUE).forEach(function (dim) {
    if (CUE[dim].test(low)) out.push(dim);
  });
  return out;
}

// ── assembly ─────────────────────────────────────────────────────────────────

// Near-duplicate suppression.
//
// The corpus stores the same fact several times -- once per record that carried
// it -- and a synthesis that quotes four near-identical sentences about the AI
// Act under one heading has not added information, it has added volume. Two
// sentences are duplicates when they share most of their content tokens and the
// shorter is a subset of the longer's vocabulary.
function isDuplicate(a, b) {
  var ta = prose.stems(a.sentence), tb = prose.stems(b.sentence);
  if (!ta.length || !tb.length) return false;
  var setA = {}, setB = {};
  ta.forEach(function (t) { setA[t] = 1; });
  tb.forEach(function (t) { setB[t] = 1; });
  var inter = 0;
  Object.keys(setA).forEach(function (t) { if (setB[t]) inter++; });
  var shorter = Math.min(Object.keys(setA).length, Object.keys(setB).length);
  return inter / shorter >= 0.75;
}

function dedupe(list) {
  var kept = [];
  list.forEach(function (item) {
    for (var i = 0; i < kept.length; i++) {
      if (isDuplicate(item, kept[i])) return;
    }
    kept.push(item);
  });
  return kept;
}

// File scored sentences into the shape of a mains answer.
//
// The shape is authored: introduction, the hard parts grouped by dimension, what
// should follow, and a closing. Sentences are only ever filed, never rewritten,
// and a section that holds nothing is reported as empty rather than filled from a
// neighbouring one.
function sectionize(scored, opts) {
  opts = opts || {};
  var subject = opts.subject || '';
  var byDim = {};
  var intro = [], forward = [], rest = [];

  scored.forEach(function (s) {
    var dims = dimsOf(s.sentence);
    var isIntro = /definition|context/.test(s.role) && s.base >= MIN_RELEVANCE;
    var isForward = dims.indexOf('recommend') !== -1 && s.base >= MIN_RELEVANCE;
    if (isForward) { forward.push(s); return; }
    if (isIntro && intro.length < 3) { intro.push(s); return; }
    var named = dims.filter(function (d) { return d !== 'recommend'; });
    if (!named.length) { rest.push(s); return; }
    named.forEach(function (d) {
      if (!byDim[d]) byDim[d] = [];
      if (byDim[d].length < 4) byDim[d].push(s);
    });
  });

  var DIM_LABEL = {
    institutional: 'Institutional and legal challenges',
    risk: 'Risk, accountability and rights',
    economic: 'Economic and market dimensions',
    social: 'Social impact and inclusion',
    technical: 'Technological dimensions',
    international: 'Cross-border and global coordination'
  };

  // Sections in the order a mains answer reads: the shape of the problem first,
  // its institutional face before its human one, because that is how the
  // syllabus frames it.
  var ORDER = ['institutional', 'technical', 'risk', 'economic', 'social', 'international'];

  var sections = [];
  sections.push({ id: 'introduction', heading: 'Introduction', sentences: dedupe(intro) });
  ORDER.forEach(function (dim) {
    if (byDim[dim] && byDim[dim].length) {
      sections.push({ id: dim, heading: DIM_LABEL[dim], sentences: dedupe(byDim[dim]) });
    }
  });
  if (rest.length && sections.length < MAX_SECTIONS) {
    sections.push({ id: 'other', heading: 'Other dimensions', sentences: dedupe(rest).slice(0, 3) });
  }
  sections.push({ id: 'wayforward', heading: 'Way forward', sentences: dedupe(forward) });

  return sections.filter(function (s) { return s.sentences.length; });
}

// ── public entry ─────────────────────────────────────────────────────────────

// Build the answer document from scored candidates.
//
// `candidates` are {entity, sentence, cats, bucket, terms} records gathered by
// the caller from the fetched buckets. This function does no I/O, so it can be
// exercised directly against a fixture and the retrieval layer tested separately.
function write(question, candidates, opts) {
  opts = opts || {};
  var subject = opts.subject || '';

  var scored = [];
  // Split once here rather than per sentence: the gate needs the question's
  // phrases as units and its single words separately, and rebuilding that
  // 186,000 times over is measurable.
  var all = terms(question);
  var phrases = all.filter(function (t) { return t.indexOf(' ') !== -1; });
  var singles = all.filter(function (t) { return t.indexOf(' ') === -1; });

  // Terms the model nominated when it decided what the question is really about
  // are treated as topic phrases and placed first: the model named them because
  // it judged them central, and a sentence holding "artificial intelligence act"
  // is better evidence for this question than one that passed the gate on
  // accumulated background words. Singles they contain join the distinct-word
  // pool for the same reason.
  (opts.expandPhrases || []).forEach(function (t) {
    t = String(t || '').trim();
    if (!t) return;
    if (phrases.indexOf(t) === -1) phrases.unshift(t);
    if (t.indexOf(' ') === -1 && singles.indexOf(t) === -1) singles.push(t);
  });

  (candidates || []).forEach(function (c) {
    var s = scoreSentence(c.sentence, c.entity, question, {
      subject: subject, foundTerms: c.terms || [],
      phrases: phrases, singles: singles
    });
    if (s.total < (opts.minRelevance == null ? MIN_RELEVANCE : opts.minRelevance)) return;
    scored.push({
      entity: c.entity, sentence: c.sentence, cats: c.cats || [],
      bucket: c.bucket, terms: c.terms || [], rel: s.total, role: prose.classify(c.sentence),
      dims: dimsOf(c.sentence)
    });
  });

  scored.sort(function (a, b) { return b.rel - a.rel; });
  scored = dedupe(scored);

  var sections = sectionize(scored, { subject: subject });
  if (opts.maxPerSection) {
    sections.forEach(function (s) { s.sentences = s.sentences.slice(0, opts.maxPerSection); });
  }
  sections = sections.filter(function (s) { return s.sentences.length; });

  var used = 0;
  sections.forEach(function (s) { used += s.sentences.length; });

  return {
    question: question,
    subject: subject,
    sections: sections,
    candidates: (candidates || []).length,
    scored: scored.length,
    used: used,
    // The scored sentences themselves, best first. `candidates` and `scored`
    // are counts; this is the material a composer downstream works from, so it
    // is carried rather than re-derived by the caller.
    facts: scored.map(function (s) {
      return { entity: s.entity, sentence: s.sentence, rel: s.rel, dims: s.dims };
    }),
    // Stated because it is true and a reader needs it: the sentences are the
    // corpus's, the section headings are authored, and no model produced either.
    method: 'Deterministic synthesis. Every sentence is verbatim corpus text with ' +
      'its source entity. Section headings are authored; nothing was inferred. ' +
      'No model was used.',
    isGenerated: false,
    isArgument: false
  };
}

return {
  terms: terms,
  rankBuckets: rankBuckets,
  scoreSentence: scoreSentence,
  dimsOf: dimsOf,
  sectionize: sectionize,
  dedupe: dedupe,
  write: write,
  CUE: CUE,
  MIN_RELEVANCE: MIN_RELEVANCE
};
}));
