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
// How many floor-passers are carried into the pairwise dedupe. The dedupe is
// O(n^2) over a pool that can be half a million sentences, while the answer
// quotes a few dozen; this bounds the expensive pass without touching anything
// the sections could reach.
var KEEP_POOL = 800;
// The largest pool count for which an uncovered single is still considered
// scope worth repairing. Above this a word is common phrasing of the question
// rather than a facet of its answer, and mining for it would simply re-lift the
// generic material already selected. Also what bounds the repair rescan.
var REPAIR_POOL_CAP = 200;
// How many facts the composer downstream reads -- the slice ask.html and the
// harness both hand to the model. Coverage is judged against exactly these,
// because a scope fact at rank 400 is not in the answer however well it scored,
// and a 724-fact selection that "covers" every facet while its top forty cover
// none has answered nothing.
var COVERAGE_TOP = 40;

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
//
// Hyphens are kept inside a word rather than treated as a separator. The phrase
// index keys them that way -- it holds "nature-based solutions" and not "nature
// based solutions" -- and splitting on the hyphen produced the bigram "nature
// based", which a sentence saying "an article in Nature based on" satisfied. The
// topic then opened the gate for a paper about dinosaurs. A compound is one
// lexical unit, and tokenizing it as one is what makes the phrase lookup and the
// topic gate agree with the index.
function terms(question) {
  // Split on everything except letters, digits and the hyphen, so a hyphenated
  // compound stays whole: "nature-based solutions" yields [nature-based,
  // solutions], not [nature, based, solutions].
  var words = String(question || '').toLowerCase()
    .split(/[^a-z0-9-]+/)
    .map(function (w) { return w.replace(/^-+|-+$/g, ''); })
    .filter(function (w) {
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
      // Equivalence-aware, so "himalayan region" matches a sentence whose own
      // stems read "himalaya region" ("the Himalayas ... region"): the phrase
      // is the same phrase, spelled the other way.
      if (!prose.stemEq(stemArr[i + j], phraseStems[j])) { hit = false; break; }
    }
    if (hit) return true;
  }
  return false;
}

// How many distinct question words a sentence has to hold on its own.
//
// A single shared word is not evidence of topic: "legal framework" qualifies a
// sentence about abortion law for a question about regulating technology, and a
// corpus-wide scorer cannot tell the difference from the words alone. Three is
// the bar wherever the question has enough content words to offer it -- on a
// five-word subject, two generic words like "solutions" and "environmental"
// were admitting sentences about thorium power and district courts. A question
// with three content words or fewer cannot produce three without naming its
// whole subject, so it asks for two, and two is the most it can ever need.
function distinctNeed(n) {
  if (n <= 3) return Math.max(2, n);
  return Math.min(3, n);
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
  // Three lists, so a caller may name each role; a caller with one list passes
  // it once and every role reads it. The question's own phrases carry the
  // topic gate's leading slots, the model's nominations open it as their own
  // set, and everything the question and the model named may be weighed.
  var topicPhrases = opts.topicPhrases || opts.gatePhrases || opts.phrases || [];
  var nominPhrases = opts.nominPhrases || (opts.gatePhrases || opts.phrases || []).slice(topicPhrases.length);
  var rankPhrases = opts.rankPhrases || opts.phrases || [];

  // Which topic phrases the sentence actually holds, and how central each is.
  var heldPhrases = [];
  topicPhrases.forEach(function (t, i) {
    if (hasPhrase(stems, prose.stems(t))) heldPhrases.push(i);
  });

  // Nominations the sentence holds. The model named these because they are
  // specific, so holding one is evidence on its own -- but only for the ones
  // that are phrases, since a single nominated word proves nothing a sentence
  // of any topic would not prove.
  var heldNomin = 0;
  nominPhrases.forEach(function (t) {
    if (hasPhrase(stems, prose.stems(t))) heldNomin++;
  });

  var heldSingles = [];
  singles.forEach(function (t) {
    // Every stem of a term has to be present, not any one. stems() splits a
    // hyphenated compound, so "nature-based" is [nature, based] -- and counting
    // it on either half let "Netherlands based Bibit" qualify for a question
    // about nature-based solutions. A compound is a unit; it counts whole or
    // not at all. A plain word has one stem, so this is the same test for it.
    //
    // stems() rather than stem(), because stem("nature-based") is "nature-bas",
    // which no sentence's stem array will ever contain.
    //
    // Variant-aware, so a claim word counts a sentence using its noun/adjective
    // twin ("himalayan" for "himalayas", "indian" for "india"). Which singles
    // are held is kept as well as counted: the coverage repair later needs to
    // know WHICH scope words a candidate carries, not merely how many, and a
    // candidate rejected at the gate still carries them.
    var ss = prose.stems(t);
    if (!ss.length) return;
    var all = true;
    for (var k = 0; k < ss.length; k++) {
      if (!prose.hasStem(stemSet, ss[k])) { all = false; break; }
    }
    if (all) heldSingles.push(t);
  });
  var distinct = heldSingles.length;

  // Topic gate. A sentence passes when it holds one of the question's leading
  // phrases -- the ones that establish the topic -- or a phrase the model
  // nominated as specific, or when it holds enough distinct question words to
  // be about the subject by accumulation. Holding only trailing context
  // vocabulary ("legal frameworks") does not open the gate, which is what keeps
  // abortion law and canal law out of an answer about regulating technology.
  //
  // The gate is skipped when the candidate arrived from full-text retrieval.
  // BM25 selected that node against the whole corpus, so re-proving topic
  // membership sentence by sentence rejects the answer on a technicality:
  // "technological concentration" appears in no phrase row, so every honest
  // candidate fails a gate written for a corpus that has the phrase.
  //
  // Skipping it entirely is not an option either. The question's rarest word is
  // "concentration", and a concentration camp sentence holds it just as genuinely
  // as "concentration risk" does -- distinct count, phrase hold, all of it comes
  // out the same, because the difference is meaning and the gate only sees words.
  // So a full-text candidate with a single question word is admitted but charged
  // for it: the penalty is large enough that a lone word plus a mid-table BM25
  // rank falls below the floor, while "digital india is an initiative..." carries
  // one word too and survives on its rank and its score. The discrimination the
  // gate cannot do is handed to the whole-corpus ranking, which can.
  // Centrality has two sources. Positionally, the leading phrases establish
  // the topic (`TOP_CENTRAL` of them open the gate). By identity, so does a
  // proper noun of the question -- but only alongside a second question word:
  // a scope name alone admits "Only the Himalayan black bear subspecies is
  // nearly as dangerous" into an answer about sustainable development, and no
  // amount of later ranking can tell that from "In the Himalayan region,
  // battered walls ...". Two distinct question words is the line: the bear
  // sentence holds one, the region sentence holds `himalayan` and `region`.
  //
  // "India's Himalayan region" sits at the END of its question, past every
  // positional slot, so a purely positional gate rejected every sentence that
  // named the scope while the generic front-of-question vocabulary ranked
  // freely. A scope word is the scope by identity, not by where it was written.
  var centralFlags = opts.centralFlags || null;
  var isCentral = function (i) {
    return centralFlags ? !!centralFlags[i] : i < TOP_CENTRAL;
  };
  var properHit = false;
  if (opts.properSet) {
    for (var pk in opts.properSet) {
      if (stemSet[pk]) { properHit = true; break; }
    }
  }
  var properGate = properHit && distinct >= 2;

  var relaxedWeak = false;
  if (opts.relaxed) {
    var centralHit = heldPhrases.length > 0 || properGate;
    if (!centralHit && !heldNomin && distinct < 1) {
      return { base: 0, found: 0, cues: 0, distinct: distinct, heldSingles: heldSingles, total: 0 };
    }
    relaxedWeak = !centralHit && !heldNomin && distinct < 2;
  } else {
    var centralHit = heldPhrases.some(isCentral) || properGate;
    if (!centralHit && !heldNomin && distinct < distinctNeed(singles.length)) {
      return { base: 0, found: 0, cues: 0, distinct: distinct, heldSingles: heldSingles, total: 0 };
    }
    // Admitted by topic words alone. A sentence that holds one of the leading
    // phrases but cannot accumulate a second proof -- and is not carrying the
    // scope by name, which properGate already recognised -- has shown topic and
    // nothing else: "Emerging technologies such as holographic data storage"
    // names the topic phrase and says nothing about regulating it, and a
    // Panama Canal statute "provides the legal framework" without bearing on
    // frameworks as a challenge. Charged at the same rate as a weak full-text
    // candidate because it is the same failure -- one signal, no context -- so
    // it clears the floor only if its claim coverage is real. Proper-noun and
    // nomination admissions are exempt: those are identity, not vocabulary.
    relaxedWeak = centralHit && !properGate && !heldNomin &&
      distinct < distinctNeed(singles.length);
  }

  // Claim and subject share one weight space: see prose.relevance for why the
  // subject's coverage must be measured over the claim's denominator, and why
  // the weights are rarity rather than a word count. Both are judged on the
  // body -- the sentence minus its own leading entity name -- so a question
  // word that occurs only inside the name ("Technological University") is not
  // coverage the sentence earned.
  var entT = prose.entityTerms(entity);
  var body = prose.stripName(sentence, entity);
  var claim = prose.relevance(sentence, opts.claimTerms || prose.claimTerms(question),
    entT, opts.claimWeights, body);
  var subject = opts.subject
    ? prose.relevance(sentence, opts.subjectTerms || prose.claimTerms(opts.subject),
      entT, opts.claimWeights, body)
    : 0;
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

  // The entity name, before any of its text is read. Same whole-compound rule
  // as the gate: "nature-based" counts only when the entity name carries both
  // halves, so an entity called "Nature Conservancy" does not earn the bonus for
  // a question about nature-based solutions. Equivalence-aware for the same
  // reason the gate is: an entity called "Himalayan forests" names a sentence
  // saying "the Himalayas".
  var entStems = prose.stems(entity || '');
  var entSet = {};
  entStems.forEach(function (t) { entSet[t] = 1; });
  var entHit = 0;
  singles.forEach(function (t) {
    var ss = prose.stems(t);
    if (!ss.length) return;
    for (var k = 0; k < ss.length; k++) {
      if (!prose.hasStem(entSet, ss[k])) return;
    }
    entHit++;
  });
  var entityScore = Math.min(0.12, entHit * 0.06) +
    (rankPhrases.some(function (t) { return hasPhrase(entStems, prose.stems(t)); }) ? 0.06 : 0);

  // Centrality of the phrases this sentence holds. It sits after the gate
  // because its only job is to order survivors: a fact about the topic phrase
  // must outrank one that passed on accumulated words. Ranked over every phrase
  // the model nominated as well, since a nomination that did not open the gate
  // still says the sentence is closer to the question than one nothing named.
  var pw = phraseWeight(rankPhrases, stems);

  // Charged here rather than at the gate so it is one number the floor tests
  // against: a weak full-text candidate has to be better than the floor by more
  // than the penalty, which is exactly the intent.
  var weakPenalty = relaxedWeak ? 0.20 : 0;

  return { base: base, found: Math.min(found, 0.3), cues: Math.min(cues, 0.15),
    distinct: distinct, heldSingles: heldSingles, centralHit: centralHit,
    entity: entityScore, phraseW: pw,
    total: base + Math.min(found, 0.3) + Math.min(cues, 0.15) + entityScore + pw - weakPenalty };
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

// Stop one entity from filling the answer.
//
// Near-duplicate suppression catches the same sentence twice, but not a corpus
// entity that simply has fifty distinct true sentences. On the nature-based
// solutions question the entity "Biodiversity" supplied thirty of the
// fifty-five survivors -- all true, all about Europe, and none of them India.
// An answer built from that is a wall of one source. Capping per entity keeps
// the pool varied, which is what a reader means by "the corpus's view" rather
// than one article's.
function capPerEntity(list, max) {
  if (!max) return list;
  var used = {};
  return list.filter(function (item) {
    var key = item.entity || '';
    used[key] = (used[key] || 0) + 1;
    return used[key] <= max;
  });
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

  // Sections in the order a mains answer reads: the shape of the problem first,
  // its institutional face before its human one, because that is how the
  // syllabus frames it. Declared before the loop below, which assigns each
  // fact to its first dimension in this order.
  var ORDER = ['institutional', 'technical', 'risk', 'economic', 'social', 'international'];

  scored.forEach(function (s) {
    var dims = dimsOf(s.sentence);
    var isIntro = /definition|context/.test(s.role) && s.base >= MIN_RELEVANCE;
    var isForward = dims.indexOf('recommend') !== -1 && s.base >= MIN_RELEVANCE;
    if (isForward) { forward.push(s); return; }
    if (isIntro && intro.length < 3) { intro.push(s); return; }
    var named = dims.filter(function (d) { return d !== 'recommend'; });
    if (!named.length) { rest.push(s); return; }
    // One section per fact. Pushing it under every dimension it matched put the
    // same sentence in three sections -- "the collapse of AIG posed a
    // significant systemic risk" read aloud under technical, risk AND
    // cross-border -- which is repetition, not coverage. The fact keeps its
    // FIRST dimension in answer order; if that dimension's four slots are full
    // it falls to its next one, and only when all of them are full does it sit
    // in the overflow section.
    for (var i = 0; i < ORDER.length; i++) {
      var d = ORDER[i];
      if (named.indexOf(d) === -1) continue;
      if (!byDim[d]) byDim[d] = [];
      if (byDim[d].length < 4) { byDim[d].push(s); return; }
    }
    rest.push(s);
  });

  var DIM_LABEL = {
    institutional: 'Institutional and legal challenges',
    risk: 'Risk, accountability and rights',
    economic: 'Economic and market dimensions',
    social: 'Social impact and inclusion',
    technical: 'Technological dimensions',
    international: 'Cross-border and global coordination'
  };

  // Sections in the order a mains answer reads is set by ORDER above.
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

// The question's own proper nouns, expanded to their equivalence sets, as a
// stem set.
//
// Capitalisation in the raw question is the only surface signal that separates
// a name from vocabulary. In "achieving sustainable development in India's
// Himalayan region", "Himalayan" marks the scope the answer has to cover while
// "sustainable" is merely a word the question used -- and a purely positional
// gate could not tell them apart: the scope phrase sits past every positional
// slot, so every sentence naming the scope was rejected while the generic
// front-of-question vocabulary ranked freely. A name is central by identity.
//
// The first word is skipped when it is question furniture ("analyse",
// "Discuss"), because English capitalises the sentence opener regardless of
// what it names. A question typed entirely in lower case yields an empty set
// and the positional rule alone decides, which is the safe degradation.
function properStems(question) {
  var out = {};
  var re = /[A-Za-z][A-Za-z'’-]*/g;
  var m, n = 0;
  var text = String(question || '');
  while ((m = re.exec(text))) {
    n++;
    var w = m[0];
    if (n === 1 && FURNITURE[w.toLowerCase()]) continue;
    // The capitalisation test itself, without which the whole rule inverts:
    // collecting every token made every question word a "proper noun", which
    // made `properGate` -- proper hit AND two distinct singles -- fire on any
    // two words at all, and an abortion-law sentence held "legal" and
    // "frameworks" just as the question did. Capitalised, non-first tokens
    // only: the first is skipped above, a lowercase token is vocabulary.
    if (w[0] !== w[0].toUpperCase() || w[0] === w[0].toLowerCase()) continue;
    prose.stems(w).forEach(function (s) { out[s] = 1; });
  }
  // Expand through the equivalence sets, so a question writing "Himalayas"
  // marks a phrase holding "himalayan" as central too.
  var all = {};
  Object.keys(out).forEach(function (k) {
    prose.stemVariants(k).forEach(function (v) { all[v] = 1; });
  });
  return all;
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

  // Split once here rather than per sentence: the gate needs the question's
  // phrases as units and its single words separately, and rebuilding that
  // 186,000 times over is measurable.
  var all = terms(question);
  var phrases = all.filter(function (t) { return t.indexOf(' ') !== -1; });
  var singles = all.filter(function (t) { return t.indexOf(' ') === -1; });

  // Terms the model nominated when it decided what the question is really about
  // may open the topic gate alongside the question's own leading phrases, but
  // as a separate set rather than spliced in front of them.
  //
  // They earned their place by being specific -- "Green India Mission" names a
  // programme -- and a sentence holding one is better evidence than one that
  // passed on accumulated background words. A single common word does not earn
  // the same trust: nominating "flood" for a question about flooding must not
  // admit every river's flood page into an answer about India, which is exactly
  // what happened when all seven nomination terms were treated alike. Such a
  // word still drives retrieval and still adds ranking weight; it just cannot
  // by itself decide that a sentence is about the question.
  //
  // Separate matters: splicing nominations ahead of the question's phrases made
  // six of them occupy every TOP_CENTRAL slot, so "nature-based solutions" fell
  // to seventh place and stopped being the topic that opens the gate -- the
  // question's own subject was outranked by its own search terms.
  var topicPhrases = phrases.slice();
  var nominPhrases = [];
  var rankPhrases = phrases.slice();
  (opts.expandPhrases || []).forEach(function (t) {
    t = String(t || '').trim();
    if (!t) return;
    if (rankPhrases.indexOf(t) === -1) rankPhrases.push(t);
    if (t.indexOf(' ') !== -1 && topicPhrases.indexOf(t) === -1 && nominPhrases.indexOf(t) === -1) {
      nominPhrases.push(t);
    }
  });

  var floor = opts.minRelevance == null ? MIN_RELEVANCE : opts.minRelevance;

  // Which phrases are central, decided once per document rather than per
  // sentence: the positional slots plus every phrase carrying a proper noun of
  // the raw question (see properStems). A document-level flag array keeps the
  // per-sentence gate to one lookup.
  var properSet = properStems(question);
  var hasProper = Object.keys(properSet).length > 0;
  var centralFlags = topicPhrases.map(function (p, i) {
    if (i < TOP_CENTRAL) return true;
    if (!hasProper) return false;
    var ps = prose.stems(p);
    for (var j = 0; j < ps.length; j++) if (properSet[ps[j]]) return true;
    return false;
  });

  // Which of those proper nouns are also content singles of the question --
  // the ones `terms()` kept rather than the furniture it stripped. The
  // distinction is load-bearing: "India" is a proper noun and appears in half
  // the corpus, so letting it open the gate admitted tens of thousands of
  // sentences that then had to be scored, sorted and pairwise-deduped; it is
  // stripped from the singles precisely because it selects nothing. "Himalayan"
  // survived the furniture filter, is capitalised, and is the actual scope --
  // so the gate opens on it and on words like it, not on every name the
  // question happens to contain.
  var gateProper = {};
  if (hasProper) {
    singles.forEach(function (t) {
      var vs = prose.stemVariants(t);
      for (var i = 0; i < vs.length; i++) {
        if (!properSet[vs[i]]) return;
        for (var j = 0; j < vs.length; j++) gateProper[vs[j]] = 1;
        return;
      }
    });
  }
  var hasGateProper = Object.keys(gateProper).length > 0;

  function bm25Of(c) {
    return (c.fulltext && typeof c.rank === 'number')
      ? Math.max(0, 0.16 - c.rank * 0.004) : 0;
  }
  function item(c, rel, base, held, repaired) {
    return {
      entity: c.entity, sentence: c.sentence, cats: c.cats || [],
      bucket: c.bucket, terms: c.terms || [], rel: rel, base: base, held: held,
      role: prose.classify(c.sentence), dims: dimsOf(c.sentence),
      repaired: !!repaired
    };
  }
  function byRel(a, b) { return b.rel - a.rel; }

  // Pass A: how often each single occurs in the pool, by surface match. The
  // rarity weights the scorer needs must exist BEFORE anything is scored, so
  // exact stemmed counts are not available -- and do not need to be: a rarity
  // weight cares about the tier (ninety vs nine hundred vs five thousand), not
  // the digit, and a substring search lands in the right tier. It is also what
  // keeps this pass cheap: one lowercasing and a handful of C-level searches
  // per candidate, against half a million of them. The variants of the stem
  // are searched alongside the word itself, so "himalaya" finds "Himalayas"
  // and "achiev" finds "achieved".
  var pool = Object.create(null);
  var surfaces = {};
  singles.forEach(function (t) {
    var set = Object.create(null);
    set[t] = 1;
    prose.stemVariants(prose.stem(t)).forEach(function (v) { set[v] = 1; });
    surfaces[t] = Object.keys(set);
  });
  (candidates || []).forEach(function (c) {
    var low = String(c.sentence || '').toLowerCase();
    singles.forEach(function (t) {
      var ss = surfaces[t];
      for (var i = 0; i < ss.length; i++) {
        // Short strings are searched too freely to mean anything ("war" sits
        // inside "towards"): a three-letter single keeps the fallback weight,
        // which is where a word that common belongs anyway.
        if (ss[i].length >= 4 && low.indexOf(ss[i]) !== -1) {
          pool[t] = (pool[t] || 0) + 1;
          break;
        }
      }
    });
  });

  // Rarity weights for the claim's own words, from that pool. Weight falls as
  // pool count rises: the scope word almost nothing holds outweighs the theme
  // word nearly everything does, by construction rather than by tuning. A word
  // the pool never held cannot be hit by any sentence, so it only ever
  // contributes to the denominator -- weighting it as rare would inflate that
  // denominator and push every real sentence under the floor.
  var claimTerms = prose.claimTerms(question);
  var subjectTerms = subject ? prose.claimTerms(subject) : null;
  var poolByStem = Object.create(null);
  singles.forEach(function (t) {
    var p = pool[t] || 0;
    prose.stems(t).forEach(function (st) { poolByStem[st] = (poolByStem[st] || 0) + p; });
  });
  var FALLBACK_W = 1 / (1 + 2000 / 100);
  var weightMap = Object.create(null);
  var weightTotal = 0;
  Object.keys(claimTerms).forEach(function (k) {
    var p = poolByStem[k] || 0;
    var w = p > 0 ? 1 / (1 + p / 100) : FALLBACK_W;
    weightMap[k] = w;
    weightTotal += w;
  });
  var claimWeights = { map: weightMap, total: weightTotal, fallback: FALLBACK_W };

  // One options object, mutated per candidate: foundTerms and relaxed are the
  // only per-candidate fields, and building a fresh object half a million
  // times is pure garbage.
  var scoreOpts = {
    subject: subject,
    claimTerms: claimTerms, subjectTerms: subjectTerms, claimWeights: claimWeights,
    // Three lists, deliberately: the gate decides what is about the question
    // and opens on the question's own leading phrases or on a specific
    // nomination, while the ranking may weigh every nomination including
    // single-word ones.
    topicPhrases: topicPhrases, nominPhrases: nominPhrases,
    rankPhrases: rankPhrases, singles: singles,
    centralFlags: centralFlags,
    properSet: hasGateProper ? gateProper : null,
    foundTerms: [], relaxed: false
  };

  // Score every candidate once. Floor-passers become the selection; everyone
  // else leaves only a trace -- which singles they held -- because that is all
  // the coverage repair downstream needs. Keeping a record object for half a
  // million rejected sentences cost more memory than the answers are worth.
  var heldOf = [];
  var selected = [];
  // Debug seam: when requested, every candidate within reach of the floor is
  // kept with its score components, so a fact that vanished can be explained
  // rather than guessed at. Off by default; costs nothing when off.
  var debugNear = opts.debugNear ? [] : null;
  (candidates || []).forEach(function (c, i) {
    scoreOpts.foundTerms = c.terms || [];
    // Per candidate, not per document. A sentence that came from full-text
    // retrieval has already been ranked against the whole corpus for
    // topicality, so it skips the phrase gate; a sentence that came from a
    // phrase-index bucket has proved nothing beyond "this bucket was fetched"
    // and must still clear it. Relaxing both -- which is what an earlier
    // document-wide flag did -- let every concentration camp in the corpus
    // into an answer about technological concentration, because "concentration"
    // is a question word and the camps are filed under it.
    scoreOpts.relaxed = opts.relaxed || !!c.fulltext;
    var s = scoreSentence(c.sentence, c.entity, question, scoreOpts);
    var held = s.heldSingles || [];
    heldOf[i] = held;
    // Where full-text retrieval found this candidate in its own ranking. BM25 has
    // already ordered the whole corpus for this question; that ordering is better
    // evidence of topicality than the sentence-level scorer, which cannot tell
    // "concentration risk" from "concentration camp" and rates them within a few
    // hundredths of each other. A bounded bonus keeps the whole-corpus rank
    // decisive at the top without letting it override the score entirely. It is
    // added before the floor is applied, so a candidate BM25 placed first can
    // clear a floor its sentence alone would not.
    var rel = s.total + bm25Of(c);
    if (debugNear && rel >= floor - 0.16 && rel < floor + 0.22) {
      debugNear.push({
        entity: c.entity, sentence: String(c.sentence || '').slice(0, 110),
        rel: rel, bm25: bm25Of(c), total: s.total, base: s.base,
        found: s.found, cues: s.cues, entBonus: s.entity, phraseW: s.phraseW,
        distinct: s.distinct, held: s.heldSingles, central: !!s.centralHit,
        fulltext: !!c.fulltext, rank: c.rank
      });
    }
    if (rel < floor) return;
    selected.push(item(c, rel, s.base, held));
  });

  // The dedupe is pairwise and O(n^2), and the pool is half a million
  // sentences: unbounded, it compares everything against everything to decide
  // which of a few dozen facts will be quoted. The answer draws from the top
  // of this list and nothing below it survives the per-entity cap and the
  // section caps either, so the tail is cut before the expensive pass.
  selected.sort(byRel);
  if (selected.length > KEEP_POOL) selected = selected.slice(0, KEEP_POOL);
  selected = dedupe(selected);
  // Before sectioning, so the cap shapes what the sections draw from rather
  // than trimming an answer that has already committed to one source.
  selected = capPerEntity(selected, opts.perEntity || 4);

  // ── coverage contract ─────────────────────────────────────────────────────
  //
  // The question's singles are facets the answer has to cover -- judged over
  // the top COVERAGE_TOP facts, which is the slice the composer reads, not
  // over the whole selection. Selection that leaves a facet out of those forty
  // has answered a DIFFERENT question: on "sustainable development in India's
  // Himalayan region" a hundred generic SDG facts carried `himalayan` nowhere
  // near the top, and the answer read as if the scope had never been written.
  //
  // The gap is measured, stated on the document, and repaired. Repair candidates
  // are re-scored under the relaxed gate and lifted by a flat rarity-gated
  // boost, and then each still-missing facet's best candidate is lifted just
  // over the cut -- a quota, because the boost alone orders by score and the
  // scope fact that scores 0.83 while the cut sits at 0.90 is still not in the
  // answer. Rarity decides eligibility: a single hundreds of candidates carry
  // is how the question was phrased, not what it demands, and lifting it would
  // only re-raise the generic material already there. The same cap bounds the
  // rescan: at most a couple of hundred candidates are ever re-scored.
  function coverageOf(list) {
    var cov = Object.create(null);
    list.slice(0, COVERAGE_TOP).forEach(function (f) {
      f.held.forEach(function (t) { cov[t] = 1; });
    });
    return cov;
  }
  var cov = coverageOf(selected);
  var uncoveredAll = singles.filter(function (t) { return !cov[t]; });

  // Reported gaps are the rare-or-absent ones: a common single left uncovered
  // is expected phrasing, not a missing facet, and saying otherwise would read
  // as a failure that is not one.
  function reportable(list) {
    return list.filter(function (t) { return !pool[t] || pool[t] <= REPAIR_POOL_CAP; });
  }
  var uncovered = reportable(uncoveredAll);

  var repairSet = uncoveredAll.filter(function (t) {
    return pool[t] > 0 && pool[t] <= REPAIR_POOL_CAP;
  });
  if (repairSet.length) {
    var repairWant = Object.create(null);
    repairSet.forEach(function (t) { repairWant[t] = 1; });
    var selKey = Object.create(null);
    selected.forEach(function (f) { selKey[f.entity + '\u0000' + f.sentence] = 1; });
    var repairs = [];
    var best = Object.create(null);
    (candidates || []).forEach(function (c, i) {
      var held = heldOf[i];
      var hit = false;
      for (var j = 0; j < held.length; j++) if (repairWant[held[j]]) { hit = true; break; }
      if (!hit) return;
      // One question word is not a facet being covered, it is a word being
      // matched. Repair exists to lift a genuine scope sentence the strict gate
      // turned away, and a sentence holding only `enhance` -- "to enhance its
      // sportier nature", "to enhance the flavor" -- held the rare single and
      // nothing else; the relaxed gate plus the boost ranked ten of those
      // above real material in the top forty. Two distinct question words is
      // the same line the proper-noun gate draws: a scope sentence names the
      // scope AND its context, a coincidence names one word and stops.
      if (held.length < 2) return;
      // Selection had its turn with this candidate; being dropped by dedupe or
      // by the per-entity cap is a deliberate second rejection, not a gap.
      if (selKey[c.entity + '\u0000' + c.sentence]) return;
      // Re-scored under the relaxed gate because the strict gate rejected this
      // candidate precisely for leaning on rare scope words, which is the
      // property it is wanted for here.
      scoreOpts.foundTerms = c.terms || [];
      scoreOpts.relaxed = true;
      var s2 = scoreSentence(c.sentence, c.entity, question, scoreOpts);
      var boost = 0;
      var hitsRepair = [];
      for (var k = 0; k < held.length; k++) {
        if (!repairWant[held[k]]) continue;
        boost += 0.18;
        hitsRepair.push(held[k]);
      }
      if (!hitsRepair.length) return;
      boost = Math.min(boost, 0.40);
      var rel2 = s2.total + bm25Of(c) + boost;
      if (rel2 < floor) return;
      var it = item(c, rel2, s2.base, held, true);
      repairs.push(it);
      hitsRepair.forEach(function (t) {
        if (!best[t] || best[t].rel < rel2) best[t] = it;
      });
    });

    if (repairs.length) {
      var merged = selected.concat(repairs);
      // The quota: lift each still-missing facet's best candidate just over the
      // current cut, until the top COVERAGE_TOP covers every repairable facet.
      // Re-checked because one lift can push another fact past the cut, taking
      // its own facet with it; five rounds is plenty, as each round fixes at
      // least one facet or stops.
      for (var round = 0; round < 5; round++) {
        merged.sort(byRel);
        var topCov = coverageOf(merged);
        var need = repairSet.filter(function (t) { return !topCov[t]; });
        if (!need.length) break;
        var cut = merged.length > COVERAGE_TOP ? merged[COVERAGE_TOP - 1].rel : 0;
        var lifted = false;
        need.forEach(function (t) {
          var b = best[t];
          if (!b || b.rel > cut) return;
          b.rel = cut + 0.05;
          lifted = true;
        });
        if (!lifted) break;
      }
      selected = merged.sort(byRel);
      if (selected.length > KEEP_POOL) selected = selected.slice(0, KEEP_POOL);
      selected = dedupe(selected);
      selected = capPerEntity(selected, opts.perEntity || 4);
      cov = coverageOf(selected);
      uncoveredAll = singles.filter(function (t) { return !cov[t]; });
      uncovered = reportable(uncoveredAll);
    }
  }
  // The actionable gap: a single no fetched bucket held at all, which is the
  // case full-text retrieval exists for. `uncovered` may still name singles
  // that are merely common phrasing; those are reported, not repaired.
  var uncoveredMissing = uncoveredAll.filter(function (t) { return !pool[t]; });

  var scored = selected;

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
    // Which question facets the carried facts do and do not cover, and how
    // often each single occurred in the pool. `uncoveredMissing` is the
    // actionable subset: a single no fetched bucket held at all, which is the
    // case full-text retrieval exists for.
    coverage: cov,
    uncovered: uncovered,
    uncoveredMissing: uncoveredMissing,
    pool: pool,
    // The scored sentences themselves, best first. `candidates` and `scored`
    // are counts; this is the material a composer downstream works from, so it
    // is carried rather than re-derived by the caller.
    facts: scored.map(function (s) {
      return { entity: s.entity, sentence: s.sentence, rel: s.rel, dims: s.dims,
        repaired: s.repaired || undefined };
    }),
    // Stated because it is true and a reader needs it: the sentences are the
    // corpus's, the section headings are authored, and no model produced either.
    method: 'Deterministic synthesis. Every sentence is verbatim corpus text with ' +
      'its source entity. Section headings are authored; nothing was inferred. ' +
      'No model was used.',
    isGenerated: false,
    isArgument: false,
    debugNear: debugNear
  };
}

return {
  terms: terms,
  rankBuckets: rankBuckets,
  scoreSentence: scoreSentence,
  dimsOf: dimsOf,
  sectionize: sectionize,
  dedupe: dedupe,
  capPerEntity: capPerEntity,
  properStems: properStems,
  write: write,
  CUE: CUE,
  MIN_RELEVANCE: MIN_RELEVANCE
};
}));
