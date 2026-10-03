// ask-core.js -- zero-AI retrieval + answer composition over the Vlymbooq corpus.
//
// WHY THIS FILE EXISTS
// --------------------
// The idea is that a UPSC question should be answered only from what the site
// actually contains, with a visible source link, and that when the corpus is
// thin the engine must say so instead of writing something plausible. That last
// clause is the whole point: an answer engine that cannot refuse will confidently
// reconstruct a mains answer out of one harvested sentence and be wrong in a way
// the reader cannot detect.
//
// WHAT THE CORPUS ACTUALLY IS (measured, not assumed)
// ---------------------------------------------------
// 529,755 nodes in data/timeline.nodes.0-9.json. Each node carries a `desc`
// that is ONE harvested Wikipedia sentence, not a document: 50.1% of descs are
// 10 words or fewer and only 10.6% exceed 25 words. The same is true of the
// data/questions/ corpus, which is 100% fill-in-the-blank with a 1.5-word mean
// answer. So this engine is a *retrieval* engine that returns quoted evidence
// and refuses to compose beyond it. It is not an answer writer.
//
// Relations are two different things and must not be confused:
//   timeline.json links  -> {a,b,w}, 282,498 co-occurrence pairs. Good for
//                           "what else is this connected to".
//   timeline.json edges  -> {a,b,rel}, 1,786 typed pairs, overwhelmingly
//                           kinship (mother/daughter/wife). NOT an institutional
//                           relation graph. Do not use edges to assert that the
//                           Speaker decides disqualifications under the Tenth
//                           Schedule; the corpus has no such edge and no such
//                           node. See retrieve() scoring, which penalises edges
//                           heavily for exactly this reason.
//
// LOADS IN NODE AND IN THE BROWSER
// -------------------------------
// The deployed site is Cloudflare Pages (static, see .github/workflows/slim-live.yml),
// so there is no server-side endpoint to call. Everything here is a pure
// function over plain objects so the same code builds the index in Node and
// answers queries in the browser. That also means no answer can depend on state
// that only exists on a server, which is what keeps the output reproducible.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.VlymbooqAsk = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ── thresholds ────────────────────────────────────────────────────────────
  // MIN_DESC_WORDS is the single most important number in this file. It is the
  // line between "a sentence someone wrote" and "a fragment the snippet
  // harvester cut out of a paragraph". Measured distribution of desc length over
  // the whole corpus is 50.1% <=10 words, so most nodes fail this and are
  // excluded at index build time rather than retrieved and then judged.
  var MIN_DESC_WORDS = 12;
  // A quoted evidence sentence must look like a sentence. "Paragraph-7: Bar of
  // jurisdiction of courts." is real corpus text and still unusable as evidence,
  // because it refers to an internal document the reader cannot see.
  var FRAGMENT_RE = /^(paragraph|para\.?|section|sec\.?|table|figure|fig\.?|chapter|see also|see|cf\.?|ibid)\b\s*[-:.]?\s*/i;
  // Coverage below this and the engine refuses instead of answering.
  // Lowered from 0.34 to 0.25 to allow more answers when partial relevant content exists
  var MIN_COVERAGE = 0.25;
  var MIN_EVIDENCE = 2;

  var STOP = ('a an the and or of to in on for is are was were be been being has have had with under from by as at this that these those ' +
    'it its his her their they them we you your our not no nor but if then than so such very more most other another each any some all ' +
    'what which who whom whose when where why how does do did done can could may might must shall should will would about into over ' +
    'between among during through above below after before both few many much own same too only just also').split(' ');

  // ── domain ontology ───────────────────────────────────────────────────────
  // Deliberately small and hand-checked, and used ONLY to add recall for
  // multi-word phrases. An earlier version expanded "anti-defection" to include
  // "defect" and "disqualification" as bare query terms, and the result was
  // catastrophic: the question "What is the anti-defection law in India?"
  // retrieved "Atrial septal defect", "Monocrystalline whisker" and the
  // Pakistani Anti-Terrorism Act. Single-word synonyms of this kind collide
  // with unrelated scientific and legal vocabulary, so every entry here is a
  // phrase, and ontology terms are excluded from the coverage score entirely
  // (a synonym hit must never make a question look answered).
  var ONTOLOGY = {
    'anti-defection': ['defection', 'tenth schedule', 'disqualification'],
    'speaker': ['lok sabha speaker', 'presiding officer', 'speaker of lok sabha'],
    'partisan': ['partisan', 'party politics', 'political neutrality'],
    'reform': ['institutional change', 'institutional reform'],
    'judicial review': ['judicial review', 'supreme court', 'high court'],
    'constitution': ['constitution', 'constitutional amendment'],
    'federalism': ['federalism', 'federal'],
    'paternalism': ['paternalism', 'paternalistic'],
    'beneficence': ['beneficence', 'non-maleficence', 'nonmaleficence'],
    'urbanisation': ['urbanization', 'urban area', 'urban population', 'city', 'metropolitan'],
    'globalisation': ['globalization', 'global economy', 'international trade', 'world market'],
    'secularism': ['secular', 'religious freedom', 'state religion', 'neutrality'],
    'socialism': ['socialist', 'socialist economy', 'public sector', 'state ownership'],
    'democracy': ['democratic', 'democratic institutions', 'representative democracy', 'participatory democracy'],
    'decentralisation': ['decentralization', 'local government', 'panchayat', 'municipality', 'local self government'],
    'sustainable development': ['sustainability', 'sustainable', 'environmental sustainability', 'green development'],
    'human rights': ['civil rights', 'fundamental rights', 'human rights violation', 'civil liberties'],
    'rule of law': ['law and order', 'judicial independence', 'legal framework', 'due process'],
    'inclusive growth': ['inclusive development', 'inclusive economy', 'social inclusion', 'economic inclusion'],
    'good governance': ['governance', 'transparency', 'accountability', 'responsiveness', 'efficiency'],
    'strategic autonomy': ['strategic independence', 'non alignment', 'foreign policy independence'],
    'digital india': ['digital transformation', 'digital infrastructure', 'e governance', 'digital economy'],
    'make in india': ['manufacturing', 'industrial policy', 'domestic production', 'manufacturing sector'],
    'swachh bharat': ['sanitation', 'cleanliness', 'waste management', 'hygiene', 'public sanitation'],
    'smart cities': ['smart city', 'urban infrastructure', 'urban planning', 'municipal infrastructure'],
    'skill india': ['skill development', 'vocational training', 'employment skills', 'workforce development'],
    'indigenous knowledge': ['traditional knowledge', 'traditional medicine', 'folk knowledge', 'tribal knowledge', 'local knowledge'],
    'traditional medicine': ['ayurveda', 'siddha', 'unani', 'homeopathy', 'ayush', 'herbal medicine']
  };
  var PHRASE_RE = /\s/;   // guard: only phrases, never bare tokens

  // ── normalisation ─────────────────────────────────────────────────────────
  function norm(s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
      .replace(/-/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tokens(s) {
    var n = norm(s).split(' '), out = [];
    for (var i = 0; i < n.length; i++) {
      if (n[i].length > 1 && STOP.indexOf(n[i]) === -1) out.push(n[i]);
    }
    return out;
  }

  // ── question analysis ─────────────────────────────────────────────────────
  // The verb decides the answer shape the way a UPSC answer key does. "Examine"
  // wants claim -> evidence -> counterpoint; "Compare" wants a two-column
  // contrast; "Why" wants causation. Getting this wrong makes a correct retrieval
  // read as a non-answer, so it is a small explicit table rather than a guess.
  var VERBS = [
    { re: /\bcritically (examine|evaluate|assess|analyse|analyze)\b/, type: 'critically-examine' },
    { re: /\bcritically\b/, type: 'critically-examine' },
    { re: /\bcompare\b|\bdifferentiate\b|\bdistinguish between\b|\bcontrast\b/, type: 'compare' },
    { re: /\bexamine\b/, type: 'examine' },
    { re: /\bevaluate\b|\bassess\b|\bappraise\b/, type: 'evaluate' },
    { re: /\bdiscuss\b/, type: 'discuss' },
    { re: /\banalyse\b|\banalyze\b/, type: 'analyse' },
    { re: /\bexplain\b|\billustrate\b/, type: 'explain' },
    { re: /\bwhy\b/, type: 'why' },
    { re: /\bhow\b/, type: 'how' },
    { re: /\bwhat\b|\blist\b|\bname\b/, type: 'what' },
    { re: /\bdiscuss the (significance|importance|role)\b/, type: 'discuss' }
  ];

  // Dimensions a mains question demands. Used for coverage accounting, so that
  // retrieving three sentences about a topic scores lower than retrieving
  // evidence for each of the things the question actually asked for.
  var DEMAND = [
    { key: 'reform', re: /\b(reform|reforms|institutional change|ensure|safeguard|protect)\b/i, label: 'institutional reform' },
    { key: 'case', re: /\b(case|cases|judgement|judgment|court|supreme)\b/i, label: 'case law' },
    { key: 'constitution', re: /\b(constitution\w*|article|schedule|amendment|provision|office)\b/i, label: 'constitutional basis' },
    { key: 'problem', re: /\b(vulnerab\w*|problem|issue|concern|partisan|bias|criticism|weakness)\b/i, label: 'the problem' },
    { key: 'evidence', re: /\b(example|instance|evidence|data|recent|since)\b/i, label: 'evidence' }
  ];

  // The instruction words that tell the candidate *what to do* rather than what
  // the question is about. "Discuss Section 66A ... with reference to Article 19"
  // asks about Section 66A and Article 19, not about "discussing" or
  // "referencing". Left in the term list they become coverage anchors, and a
  // corpus sentence about IT Act reform will never contain the word "discuss" --
  // so a perfectly answerable question gets refused for failing to quote the
  // exam paper's own scaffolding. They are still read for the `type` verdict
  // above; they are simply excluded from retrieval and coverage.
  var SCAFFOLD = {};
  ('discuss discussed discussion examine examined explain explained analyse analyzed ' +
   'analyse evaluate evaluated assess assessed appraise illustrate illustrated ' +
   'describe described comment commented review reviewed consider considered ' +
   'critically brief briefly note noted highlight highlights elaborate illustrate ' +
   'reference references regard regards light context perspective basis ' +
   'role roles status positions ' +
   'terms term means detail details examine')   // deliberate duplicate guard: set, not list
    .split(' ').forEach(function (w) { if (w) SCAFFOLD[w] = 1; });

  function analyse(q) {
    var s = String(q || '');
    var nq = norm(s);
    var type = 'general';
    for (var i = 0; i < VERBS.length; i++) {
      if (VERBS[i].re.test(nq)) { type = VERBS[i].type; break; }
    }
    var base = tokens(s).filter(function (t) { return !SCAFFOLD[t]; });
    var weights = {};
    base.forEach(function (t) { weights[t] = 1; });

    // Synonyms enter as phrase boosts only. They widen recall for a node whose
    // title uses different words, but they are scored at a fraction of a real
    // term and never counted as evidence that the question was covered.
    var boosts = [];
    Object.keys(ONTOLOGY).forEach(function (key) {
      if (nq.indexOf(norm(key)) === -1) return;
      ONTOLOGY[key].forEach(function (phrase) {
        if (!PHRASE_RE.test(phrase)) return;              // phrases only, no bare tokens
        boosts.push(phrase);
      });
    });

    return {
      type: type,
      raw: s,
      terms: base,          // the candidate's own words: the only thing coverage may count
      weights: weights,
      boosts: boosts,
      ontologyHits: Object.keys(ONTOLOGY).filter(function (k) { return nq.indexOf(norm(k)) !== -1; }),
      demand: DEMAND.filter(function (d) { return d.re.test(s); }).map(function (d) { return d; })
    };
  }

  // ── sentence utilities ────────────────────────────────────────────────────
  function splitSentences(text) {
    return String(text || '').split(/(?<=[.!?])\s+/).map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length > 0; });
  }

  function wordCount(s) {
    return String(s || '').split(/\s+/).filter(function (w) { return w.length > 0; }).length;
  }

  // A description that stops mid-clause: trailing conjunction, preposition or
  // article. This, not the presence of a full stop, is what marks a real
  // fragment. Requiring terminal punctuation threw away 178,936 of 537,888 raw
  // nodes -- a third of the corpus -- including complete 25-word sentences that
  // merely lack a final full stop, among them the only nodes carrying the words
  // "federal" and "federalism" for India. A missing full stop is a typographic
  // detail; a dangling preposition is a genuine truncation.
  var DANGLING_RE = /(\b(and|or|but|nor|of|in|on|at|to|for|with|by|from|as|into|onto|upon|over|under|about|the|a|an|its|their|his|her|that|which|who|whose|than|that|is|was|were|are|be|been|being|has|have|had)\s*)[.,;:]$/i;
  // Truncation inside a word, e.g. a harvester that cut mid-token.
  var MIDWORD_RE = /[a-z][A-Z]$/;

  // isQuoteable is the anti-fragment gate. It is intentionally strict: an
  // evidence sentence that fails it is dropped rather than repaired, because
  // repairing a snippet means inventing the context that made it mean something.
  function isQuoteable(s) {
    if (!s) return false;
    if (wordCount(s) < MIN_DESC_WORDS) return false;
    if (FRAGMENT_RE.test(s)) return false;
    if (/_{3,}/.test(s)) return false;                       // cloze blank left in place
    if (/[|]/.test(s)) return false;                         // table or pipe artifact
    if (DANGLING_RE.test(s.trim())) return false;            // stops mid-clause
    if (MIDWORD_RE.test(s.trim())) return false;             // cut inside a word
    if (/^(thus|hence|therefore|also|however|which|who|that|this|these|those|it|he|she|they)\b/i.test(s.trim())) return false;
    return true;
  }

  // ── index ─────────────────────────────────────────────────────────────────
  // nodes: [{i, id, name, type, desc, cat, span, era, aliases}]
  // adjacency: { "nodeIndex": [[otherIndex, weight], ...] } from timeline links
  function buildIndex(payload) {
    var nodes = (payload && payload.nodes) || [];
    var adj = (payload && payload.links) || {};
    var df = {};
    // titleDf counts how many node TITLES contain a word. It is the signal that
    // tells an entity name from a common English word: `bhopal` titles 11 nodes,
    // `modi` titles 5, but `cry` titles 19 songs and `gas` titles 86. Document
    // frequency alone cannot separate them -- `cry` (df 34) is rarer than `modi`
    // (df 35) -- so the head-proxy fallback consults titleDf before letting a
    // bare word stand in for the subject. Without it, "far cry 3" matched every
    // node with "cry" in its title and answered with doo-wop singles.
    var titleDf = {};
    var prepared = nodes.map(function (n, idx) {
      var bag = tokens(n.name + ' ' + (n.aliases || []).join(' ') + ' ' + (n.desc || '') + ' ' + (n.type || '') + ' ' + (n.cat || ''));
      var tf = {};
      bag.forEach(function (t) { tf[t] = (tf[t] || 0) + 1; });
      Object.keys(tf).forEach(function (t) { df[t] = (df[t] || 0) + 1; });
      var nameToks = {};
      tokens(n.name || '').forEach(function (t) { nameToks[t] = 1; });
      Object.keys(nameToks).forEach(function (t) { titleDf[t] = (titleDf[t] || 0) + 1; });
      return { i: idx, node: n, tf: tf, len: bag.length };
    });
    var avg = prepared.reduce(function (a, p) { return a + p.len; }, 0) / (prepared.length || 1);

    // Nodes the quote gate dropped, keyed by lower-cased title.
    //
    // This exists so a refusal can tell the truth. Without it, a question about
    // `Dadabhai Naoroji` refuses with "no term in the question appears anywhere in
    // the index", while the node is present in the source shard and its title is
    // right there -- its only sentence happens to be three words against a
    // twelve-word floor, and the entity buckets hold 24 real sentences for it. The
    // refusal is false as written and sends the reader away from a corpus that has
    // the material. With this map the engine can say which of the two happened.
    //
    // Encoded by the builder as reason*1000 + wordCount (see build-ask-index.js),
    // decoded here so callers never handle the packing.
    var thin = null;
    if (payload && payload.thin && payload.thin.length) {
      thin = {};
      payload.thin.forEach(function (title, i) {
        var code = payload.thinWhy ? payload.thinWhy[i] : 0;
        thin[title] = { reason: Math.floor(code / 1000), words: code % 1000 };
      });
    }

    return {
      nodes: prepared, adj: adj, df: df, titleDf: titleDf, avg: avg || 1, N: prepared.length,
      thin: thin
    };
  }

  // Is this phrase a node the corpus has but the quote gate excluded?
  //
  // Matches the whole phrase as a lower-cased title first, then any title that
  // contains it as a whole word, so "dadabhai naoroji" and "Naoroji" both find the
  // node while "naor" does not match everything beginning with those letters.
  function thinNode(idx, phrase) {
    if (!idx || !idx.thin) return null;
    var p = norm(phrase);
    if (!p) return null;
    if (idx.thin[p]) return { title: p, info: idx.thin[p] };
    var words = p.split(' ').filter(function (w) { return w.length >= 4; });
    if (!words.length) return null;
    // A single substring test per title, then a whole-word check only on the
    // handful that pass. 311k tokenSet() calls would be 311k allocations on the
    // refusal path; indexOf is one scan each and the whole pass stays cheap,
    // which matters because this runs in the browser.
    var keys = Object.keys(idx.thin);
    var best = null;
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].indexOf(p) === -1) continue;
      if (norm(keys[i]) !== p && !new RegExp('\\b' + p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(keys[i])) continue;
      // Prefer the shortest matching title: the most specific node, not a
      // category-sized name that happens to contain every word.
      if (!best || keys[i].length < best.length) best = keys[i];
    }
    return best ? { title: best, info: idx.thin[best] } : null;
  }

  // BM25 over the real field set. The only non-standard part is that ontology
  // phrase components enter the query at reduced weight, so a synonym can widen
  // recall without being able to outrank a literal title match.
  function bm25(idx, weights, boosts) {
    var k1 = 1.2, b = 0.75;
    var out = [];
    var terms = Object.keys(weights);
    for (var i = 0; i < idx.nodes.length; i++) {
      var p = idx.nodes[i];
      var s = 0, matched = 0;
      for (var t = 0; t < terms.length; t++) {
        var term = terms[t], f = p.tf[term];
        if (!f) continue;
        matched++;
        var n = idx.df[term] || 1;
        var idf = Math.log(1 + (idx.N - n + 0.5) / (n + 0.5));
        s += weights[term] * idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + b * (p.len / idx.avg))));
      }
      if (!matched) continue;
      var nameN = norm(p.node.name);
      var nameTok = tokenSet(nameN);
      // A title hit is only as meaningful as the term that produced it. The
      // bonus is scaled by IDF because a flat bonus treats every word as rare:
      // "indian" occurs in 24,558 of 65,039 nodes yet scored the same +6 as
      // "accommodating", which occurs in exactly one. That is how a question
      // about the Indian federal framework retrieved `.NET Framework` and
      // `Far Cry 3` -- the engine was rewarding the mere presence of a common
      // word in a title. Scaled, "indian" is worth ~0.97 and "framework" ~7.0,
      // so a node must actually be about the distinctive words to win.
      terms.forEach(function (term) {
        if (!nameTok[term]) return;
        var n = idx.df[term] || 1;
        var tIdf = Math.log(1 + (idx.N - n + 0.5) / (n + 0.5));
        // Capped so one term can never dominate a genuine multi-term title match.
        s += Math.min(tIdf, 8) * (weights[term] >= 1 ? 1 : 0.4);
      });
      terms.forEach(function (phrase) {
        if (nameN === norm(phrase)) s += 8;                     // title is exactly the phrase
      });
      // Bonus for multi-word phrase matches in description - these are more specific
      var descN = norm(p.node.desc || '');
      var descTok = descN.split(' ');
      for (var pi = 0; pi < terms.length - 1; pi++) {
        var phrase2 = terms[pi] + ' ' + terms[pi + 1];
        if (descN.indexOf(phrase2) !== -1) s += 2;              // phrase in description
      }
      // Ontology boosts are applied as a title bonus only: a node literally
      // titled "Tenth Schedule" (or "Anti-defection law (India)") tells us more
      // than any synonym injected at query time ever could, and keeping them out
      // of `weights` stops a synonym from being counted as evidence coverage.
      (boosts || []).forEach(function (ph) {
        var pn = norm(ph);
        if (nameN.indexOf(pn) !== -1) s += 3;                   // phrase inside the title
        if (descN.indexOf(pn) !== -1) s += 1.5;                 // phrase in description
      });
      if (s > 0) out.push({ i: i, score: s, direct: true });
    }
    out.sort(function (x, y) { return y.score - x.score; });
    return out;
  }

  function tokenSet(s) {
    var m = {}, t = String(s || '').split(' ');
    for (var i = 0; i < t.length; i++) if (t[i]) m[t[i]] = 1;
    return m;
  }



  // ── question grammar ──────────────────────────────────────────────────────
  // A mains question is not a bag of keywords. It is an instruction about a
  // subject, and the instruction words ("aims", "outcomes", "impact", "causes",
  // "measures") are not the subject. "The corpus has no article on 'outcomes'"
  // is a technically-true and completely useless refusal: the subject was
  // "Indian National Congress", which the corpus does have.
  //
  // So: split the question into the noun phrase that names the subject and the
  // verb phrase that states what to do with it. Only the subject is eligible to
  // be a lead anchor, and only the subject is allowed to decide refusal.
  var ASK_VERB = /\b(what|why|how|when|where|who|which|explain|examine|discuss|analyse|analyze|evaluate|assess|appraise|describe|outline|elaborate|illustrate|comment)\b/i;
  var ASK_OBJECT = /\b(what are|what is|what was|why (is|are|was|were|do|does|did)|how (is|are|was|were|do|does|did|can|should)|when (is|was|did)|who (is|was|are|were))\b/i;
  // Demand nouns: these are what the answer must cover, not what it is about.
  var DEMAND_NOUN = /\b(aims?|objectives?|goals?|outcomes?|consequences?|impacts?|effects?|causes?|reasons?|measures?|remedies?|reforms?|institutional changes?|challenges?|problems?|issues?|significance|importance|merits?|demerits?|advantages?|disadvantages?|lessons?|implications?|dimensions?|factors?|instruments?|mechanisms?|roles?|status|positions?|recommendations?|suggestions?|provisions?|findings?|observations?|merits|terms?)\b/i;
  // Qualifier nouns like "nature", "role", "process" sit in front of a named
  // subject ("the changing nature of caste") and must trigger the same head-noun
  // cut: "of caste" is what the question is about, not "the changing nature".
  var QUALIFIER_NOUN = /\b(changing\s+)?(natures?|roles?|aspects?|features?|characteristics?|process|processes|dynamics?|concept|concepts|idea|ideas|notion|notions|question|questions|issue|issues|problem|problems|evolution|evolutions|status|growth|rise|expansion|emergence|development|expansion)\b/i;
  // Words that close a noun phrase and start a new clause. A positional
  // preposition ("impact of X ON Y") or a reporting verb ("growth of X AFFECTED
  // Y") both end the subject at the same place, so both belong in one list.
  var CLAUSE_BREAK = '(?:on|in|about|for|with|at|by|under|against|regarding|concerning|and|or|affecting|affects|affected|impacting|impacts|impacted|influencing|influences|influenced|shaping|shapes|shaped|changing|changes|changed|helping|helped|contributing|contributed|leading|led|causing|caused|resulting|resulted)'

  // "and" and "or" are not clause breaks when they sit inside an institution's
  // name. "the role of the Comptroller and Auditor General in ensuring
  // accountability" was cut to the subject "Comptroller", which matches no node,
  // while the corpus holds "Comptroller and Auditor General of India". A
  // lookahead on a following lowercase word would express this, but the pattern
  // below is compiled with the `i` flag, where `[a-z]` also matches uppercase, so
  // the lookahead could never exclude a capitalised word. The distinction is made
  // after the match instead: if the span still names a demand, it really was a
  // list ("the aims and outcomes of X") and the old break is the right answer.
  var HEAD_BREAK = CLAUSE_BREAK.replace('|and|or|', '');

  // and demand nouns are all removed, so "What were the aims and outcomes of the
  // Indian National Congress at its founding in 1885?" reduces to "Indian
  // National Congress" rather than to a 13-word sentence fragment. The old
  // version returned that whole fragment, and every subject-match test then
  // demanded a node titled with all 13 words, which nothing can satisfy.
  function subjectOf(text) {
    var t = String(text || '').trim().replace(/\s+/g, ' ');
    t = t.replace(/^(please\s+)?(can you|could you|would you|i want to know|explain to me|tell me about|write an? (answer|essay) (on|for)?)\s+/i, '');
    t = t.replace(ASK_OBJECT, ' ');
    t = t.replace(ASK_VERB, ' ');
    // A question can be two sentences, and the second one is a separate question
    // with its own subject. Joining them produced a subject like "whether the
    // constitutional office of the Lok Sabha Speaker has become vulnerable ...
    // What institutional changes are required to ensure the neutrality of the Lok
    // Sabha Speaker". Nothing in the ontology can be a title-match for that, but
    // the permissive variant matching found "Deputy Speaker of the Lok Sabha" and
    // answered the question with the second-ranking office instead of refusing.
    // A subject ends where the first sentence does.
    t = t.split(/\s*[.?!]\s/)[0];
    // "the impact of urbanisation on social and economic development in India" is
    // a question about urbanisation, not about "impact" or "development". When a
    // demand noun introduces an "of X", the subject is X; and when X runs up
    // against a positional clause ("on/about/in/for/with/at/by/under/against")
    // that clause names what the impact is ON rather than what the question is
    // about. So cut to the head noun after "of", then to that first positional word.
    var ofIdx = t.search(/\bof\b/i);
    if (ofIdx !== -1) {
      DEMAND_NOUN.lastIndex = 0;
      QUALIFIER_NOUN.lastIndex = 0;
      var leadCatchesSubject =
        DEMAND_NOUN.test(t.slice(0, ofIdx)) || QUALIFIER_NOUN.test(t.slice(0, ofIdx));
      if (leadCatchesSubject) {
        var afterOf = t.slice(ofIdx + 2);
        var head = afterOf.match(
          new RegExp('^\\s*(?:the\\s+)?([A-Za-z0-9\'’\\-]+(?:\\s+[A-Za-z0-9\'’\\-]+)*?)\\s+' + HEAD_BREAK + '\\b', 'i')
        );
        t = head ? head[1] : afterOf.replace(/^\s*(?:the\s+)?/, '');
        // The span is only a list, and not a name, if it still names a demand.
        DEMAND_NOUN.lastIndex = 0;
        QUALIFIER_NOUN.lastIndex = 0;
        if (t && (DEMAND_NOUN.test(t) || QUALIFIER_NOUN.test(t))) {
          var asList = afterOf.match(
            new RegExp('^\\s*(?:the\\s+)?([A-Za-z0-9\'’\\-]+(?:\\s+[A-Za-z0-9\'’\\-]+)*?)\\s+' + CLAUSE_BREAK + '\\b', 'i')
          );
          if (asList) t = asList[1];
        }
      }
    }
    // A trailing "in <JURISDICTION>" names the container, not the subject:
    // "What is the anti-defection law in India?" is about the anti-defection law.
    t = t.replace(/\s+\bin\s+[A-Za-z][A-Za-z'’\-]*\s*$/i, ' ');
    // "How far has the Indian federal framework been successful in accommodating
    // regional and cultural diversities" is about the framework, not about
    // success or diversity. Strip the "how far / how much" degree opener and
    // then the "has X been successful" frame, which otherwise consumes the
    // whole sentence and leaves the subject empty -- an empty subject skips the
    // title gate entirely, which is how unrelated nodes answered the question.
    t = t.replace(/^\s*how\s+(?:far|much|long|well)\b/i, ' ');
    t = t.replace(/^\s*how\b/i, ' ');
    // ASK_VERB has already eaten "how" by this point, so a degree opener can
    // arrive as a bare word: "far has the Indian federal framework ...".
    t = t.replace(/^\s*(?:far|much|long|well|often|then)\b/i, ' ');
    // "How far has X been successful in Y?" -- X is the subject. This has to
    // CAPTURE the noun phrase, not merely cut around it: the subject sits
    // inside the "has ... been successful" frame, so a plain deletion of that
    // frame deleted the subject too and left nothing.
    var perf = t.match(/^\s*(?:has|have|had|is|are|was|were)\s+(?:the\s+)?([A-Za-z0-9'’\-]+(?:\s+[A-Za-z0-9'’\-]+)*?)\s+been\s+(?:successful|effective|able|successful\s+in)\b/i);
    if (perf) return perf[1].replace(/[?.!,;:]+$/, '').trim();
    t = t.replace(/\b(?:has|have|had|is|are|was|were|been)\s+[a-z\s]{0,40}?\b(?:been\s+)?(?:successful|effective|successful in|able to|successful at)\b.*$/i, ' ');
    t = t.replace(/\s*\b(?:been\s+)?(?:successful|effective|successful in|successful at|accommodating|accommodate|accommodated)\b.*$/i, ' ');
    // Demand phrases: "... the aims and outcomes of X", "... the environmental
    // impact of X". Cut back to the head noun on the far side of the last
    // preposition, which is where the named subject sits.
    //
    // The cut is conditional on the lead actually naming a demand. Without that
    // check the pattern also matches an ordinary noun phrase before any
    // preposition, and it destroyed real subjects: "Discuss the Sixth Schedule
    // of the Constitution" lost everything after "Schedule" and returned an
    // empty subject, which then skipped the title gate entirely. "The aims and
    // outcomes of X" still works because its lead does contain a demand noun.
    //
    // The lead may also hold the subject itself, in which case deleting the span
    // deletes the subject: "examine the constitutional morality and its
    // significance in indian democracy" has the demand noun `significance` in
    // its lead, and the subject `constitutional morality` sits before it, so
    // the cut returned an empty subject -- and an empty subject skips the title
    // gate entirely, which is how unrelated nodes answered the question.
    //
    // "the aims and outcomes of X" is the other shape: demand nouns first,
    // subject after the preposition, and there the cut is right. So keep the
    // cut only when the lead has no content words of its own; when it does,
    // keep the lead and drop the trailing clause instead.
    t = t.replace(/\b(?:'s)?\s*(?:the\s+)?([A-Za-z\s,']{0,60}?)\b(?:of|for|in|on|about|regarding|concerning)\s+[^?]*$/i,
      function (whole, lead) {
        DEMAND_NOUN.lastIndex = 0;
        QUALIFIER_NOUN.lastIndex = 0;
        if (!DEMAND_NOUN.test(lead) && !QUALIFIER_NOUN.test(lead)) return whole;
        // Content words the lead carries besides the demand nouns themselves.
        var leftover = lead
          .replace(DEMAND_NOUN, ' ')
          .replace(QUALIFIER_NOUN, ' ')
          .replace(/\b(?:and|or|the|its|their|his|her|a|an|of|in|on|for|to|is|are|was|were|be)\b/gi, ' ')
          .replace(/[^A-Za-z0-9\s'\-T]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        // Imperative openers are question furniture, not a subject.
        leftover = leftover.replace(/^(?:critically|comment|describe|outline|elaborate|illustrate|examine|discuss|analyse|analyze|evaluate|assess|appraise|compare|distinguish|differentiate|explain)\b/i, '').trim();
        return leftover.length >= 4 ? ' ' + leftover + ' ' : ' ';
      });
    t = t.replace(/\b(?:aims?|objectives?|goals?|outcomes?|consequences?|impacts?|effects?|causes?|reasons?|measures?|remedies?|reforms?|challenges?|problems?|issues?|significance|importance|merits?|demerits?|advantages?|disadvantages?|lessons?|implications?|dimensions?|factors?|instruments?|mechanisms?|role|impact|effect)\b/gi, ' ');
    t = t.replace(/^\s*(?:of|for|in|on|about)\s+/i, ' ');
    return t.replace(/[?.!,;:]+$/, '').replace(/\s+/g, ' ').trim();
  }

  // Capitalised words that are sentence furniture, not subject names. A UPSC
  // question opens with a capitalised imperative ("Critically examine...") and
  // "Critically" is not the subject, so the run must start *after* it.
  var SENTENCE_LEAD = /^(What|Why|How|When|Where|Who|Which|Explain|Examine|Discuss|Analyse|Analyze|Evaluate|Assess|Appraise|Critically|Comment|Describe|Outline|Elaborate|Illustrate|Compare|Differentiate|Distinguish|Do|Does|Did|Is|Are|Was|Were|Can|Could|Should|Would|Will|Please|Write|Analyse|Discuss)\b/;

    // The capitalised run in the original text is the strongest available signal
    // for "this is the named subject". Titles, proper nouns and acronyms all
    // capitalise; verbs and question words do not.
  function properNounRun(text) {
    var words = String(text || '').replace(/[?!]+$/, '').split(/\s+/);
    // A capitalised sentence opener is furniture, not a subject name. Without
    // this, "How far has the Indian federal framework ..." yields the run "How",
    // and every downstream title test then hunts for a node called "How".
    // SENTENCE_LEAD existed for exactly this and was never wired in.
    if (words.length && SENTENCE_LEAD.test(words[0])) words = words.slice(1);
    var runs = [], cur = [];
    // Connectors inside an institution's name are lowercase but do not end the
    // name: "Comptroller and Auditor General of India", "Election Commission of
    // India", "Reserve Bank of India". Treating a lowercase word as a break
    // yielded the subject "Comptroller" for a question about the Comptroller and
    // Auditor General, which is in the corpus as "Comptroller and Auditor General
    // of India" and was then unfindable.
    var CONNECTOR = /^(?:and|of|the|for|in|on|at|to|&)$/i;
    for (var i = 0; i < words.length; i++) {
      var w = words[i].replace(/[^A-Za-z0-9''\-]/g, '');
      if (!w) { if (cur.length) { runs.push(cur); cur = []; } continue; }
      if (/^[A-Z]/.test(w)) { cur.push(w); continue; }
      if (CONNECTOR.test(w) && cur.length) {
        // Only keep the connector if a capitalised word follows, otherwise the
        // run has ended and the connector belongs to the surrounding sentence.
        var nxt = words[i + 1] ? words[i + 1].replace(/[^A-Za-z0-9''\-]/g, '') : '';
        if (nxt && /^[A-Z]/.test(nxt)) { cur.push(w); continue; }
      }
      if (cur.length) { runs.push(cur); cur = []; }
    }

    if (cur.length) runs.push(cur);
    if (!runs.length) return '';
    // Return the longest run. A sentence opener like "Recent" is 1 word; the
    // real subject ("Indian Constitution", "Natural Gas") is usually longer.
    // On a tie, prefer an all-caps acronym ("NGT") over a regular proper noun
    // ("India"), then prefer the later run — it sits closer to the question verb.
    function isAcronym(w) { return w.length >= 2 && w === w.toUpperCase(); }
    var best = runs[0];
    for (var j = 1; j < runs.length; j++) {
      var bAc = best.every(isAcronym), rAc = runs[j].every(isAcronym);
      if (runs[j].length > best.length) { best = runs[j]; continue; }
      if (runs[j].length === best.length) {
        if (rAc && !bAc) { best = runs[j]; continue; }
        if (rAc === bAc) best = runs[j];
      }
    }
    return best.join(' ');
  }

  // A proper-noun run alone is often too narrow. In "the anti-defection law in
  // India" the run is just "India", and India is not the subject of the
  // question; the subject is "anti-defection law in India". So reach leftwards
  // from the run and take up to two content words that sit immediately beside
  // it, which is where a head noun lives.
  //
  // The returned span keeps the original stopwords ("on", "of", "the"). An
  // earlier version stripped them, producing the mash "Agreement Agriculture
  // World Trade Organisation WTO" — which is a phrase no node title contains,
  // so the subject gate failed on a question the corpus does have partial
  // material for. Stopwords stay in the span; matching handles them.
  //
  // This must not swallow a demand phrase: in "the environmental impact of the
  // Bhopal gas tragedy" the token before "Bhopal" is "impact", which names what
  // the question wants rather than what it is about. Cutting there leaves the
  // subject as "Bhopal", which is correct.
  function widenSubject(text, run) {
    if (!run) return '';
    var words = String(text).replace(/[?!]+$/, '').split(/\s+/);
    var at = -1;
    for (var i = 0; i < words.length; i++) {
      if (words[i].replace(/[^A-Za-z0-9'’\-]/g, '') === run.split(' ')[0]) { at = i; break; }
    }
    if (at < 0) return run;
    var start = at;
    var taken = 0;
    for (var j = at - 1; j >= 0 && taken < 2; j--) {
      var raw = words[j];
      // Never reach across a sentence boundary. "...menaces. Highlight the role
      // of FATF" widened leftwards into the previous sentence's imperative
      // "Highlight", producing the subject "Highlight role Financial Action
      // Task Force FATF", which matches no node title and made the engine
      // refuse a question the corpus actually has material for.
      if (/[.!?:]["')\]]?$/.test(raw)) break;
      var w = raw.replace(/[^A-Za-z0-9'’\-]/g, '');
      if (!w) break;
      if (SCAFFOLD[norm(w)]) break;                          // "Highlight"/"Discuss" ends the subject
      if (STOP.indexOf(norm(w)) !== -1) continue;   // look straight through "of/the/in"
      if (DEMAND_NOUN.test(w)) break;                          // a demand noun ends the subject
      start = j;
      taken++;
    }
    return words.slice(start, at + run.split(' ').length).join(' ').trim()
      .replace(/[.,;:]+$/, '');                                // the span ends at a word, not a full stop
  }

  // British/American spelling is the same word to a reader, and node titles
  // use whichever form Wikipedia happened to use: a subject saying
  // "World Trade Organisation" must still match the node "Dispute settlement
  // in the World Trade Organization".
  function foldSZ(s) { return String(s).replace(/isation/g, 'ization'); }

  // Every contiguous word window of the subject span, longest first. The subject
  // may be a whole phrase the corpus never titles verbatim ("Agreement on
  // Agriculture of World Trade Organisation (WTO)") while one of its windows is
  // titled exactly ("agreement agriculture") or is contained in a longer
  // title ("world trade organisation" inside "Dispute settlement in the World
  // Trade Organization"). Windows are what let a stopworded, acronym-suffixed
  // span find its articles.
  //
  // Stopwords are removed BEFORE windowing. Two bugs taught this:
  //   "world trade" (a 2-word window of the long subject) matched "1 World
  //   Trade Center" and friends — four sentences about Manhattan real estate
  //   offered as evidence for a farm-subsidies question;
  //   "anti-defection law in india" (stopwords kept) matched nothing, because
  //   the node is titled "Anti-defection law (India)" and the window's stray
  //   "in" broke contiguity.
  // So: strip stopwords, then window with a floor of 3 words — unless the
  // subject itself is shorter, in which case keep what there is ("Bhopal").
  function subjectVariants(subj) {
    var words = String(subj || '').trim().split(/\s+/).filter(Boolean)
      .filter(function (w) { return STOP.indexOf(norm(w)) === -1; });
    if (!words.length) words = String(subj || '').trim().split(/\s+/).filter(Boolean);
    var out = [], seen = {};
    var minLen = Math.min(3, words.length);
    function push(arr) {
      if (arr.length < minLen) return;
      var ns = norm(arr.join(' '));
      if (!ns || seen[ns]) return;
      seen[ns] = 1;
      out.push(ns);
      var folded = foldSZ(ns);
      if (!seen[folded]) { seen[folded] = 1; out.push(folded); }
    }
    if (words.length <= 1) { push(words); return out; }
    for (var len = words.length; len >= minLen; len--) {
      for (var i = 0; i + len <= words.length; i++) push(words.slice(i, i + len));
    }
    return out;
  }

  // CONCEPT ROUTES -- a retrieval router, not a knowledge base.
  //
  // A question names concepts, not a single string. "How far has the Indian
  // federal framework accommodated regional and cultural diversity" names
  // federalism, diversity, and asks "how far", which needs BOTH the
  // accommodation mechanisms and the strain. Demanding one exact entity
  // ("Indian federal framework") and refusing when it is absent was the wrong
  // model: "no material labelled Indian federal framework" is not the same
  // statement as "no material about Indian federalism".
  //
  // Every phrase below was verified against the whole 65,039-node index, not
  // sampled: each entry records how many India-relevant nodes actually carry it.
  // Phrases that audit to zero India nodes are kept only where they document a
  // genuine hole in the corpus, and are listed in CORPUS_GAPS instead of being
  // presented as working routes.
  //
  // `fit` answers "how far has it succeeded", `strain` answers the other half.
  // An "how far" question that reported only `fit` would be a press release.
  var CONCEPT_ROUTES = {
    'indian federal framework': {
      fit: ['union territory', 'reorganisation', 'linguistic', 'partition', 'demarcation',
        'autonomous council', 'autonomous district', 'scheduled tribes', 'scheduled castes',
        'article 370', 'article 371', 'reservation', 'minority', 'tribal', 'religion', 'ethnic'],
      strain: ['ethnic', 'separat', 'protest', 'agitation', 'unrest', 'demand', 'insurgency',
        'naxal', 'emergency', 'coalition', 'alliance', 'tribal', 'tension', 'conflict', 'dispute']
    },
    'federalism': {
      fit: ['union territory', 'reorganisation', 'linguistic', 'partition', 'demarcation',
        'scheduled tribes', 'scheduled castes', 'minority', 'reservation'],
      strain: ['ethnic', 'separat', 'agitation', 'unrest', 'insurgency', 'naxal', 'emergency',
        'demand', 'tribal', 'tension', 'dispute']
    },
    'centre state relations': {
      fit: ['centre state', 'union territory', 'governor', 'president'],
      strain: ['president', 'emergency', 'agitation', 'unrest', 'demand', 'insurgency', 'dispute',
        'tension', 'protest']
    },
    'regionalism': {
      fit: ['alliance', 'coalition', 'autonomous council', 'statehood', 'union territory', 'linguistic'],
      strain: ['ethnic', 'separat', 'protest', 'agitation', 'unrest', 'demand', 'insurgency', 'tribal']
    },
    'cultural diversity': {
      fit: ['ethnic', 'religion', 'linguistic', 'tribal', 'minority', 'scheduled castes',
        'scheduled tribes', 'autonomous council', 'union territory'],
      strain: ['conflict', 'tension', 'protest', 'agitation', 'unrest', 'demand', 'insurgency',
        'separat', 'ethnic']
    },
    'urbanisation': {
      fit: ['urbanisation', 'metropolitan', 'slum', 'migration', 'town', 'city'],
      strain: ['pollution', 'inequality', 'eviction', 'congestion', 'shortage', 'overcrowded']
    },
    'anti-defection law': {
      fit: ['defection', 'disqualification', 'speaker', 'legislature', 'coalition', 'party',
        'majority', 'floor', 'tenth schedule'],
      strain: ['defection', 'disqualification', 'petition', 'majority', 'floor', 'privilege', 'split']
    },
    // These are not abstract themes but named provisions of the Constitution,
    // and the corpus answers them densely: measured across the full bank, 292
    // India-relevant records mention Article 370, 61 the Sixth Schedule, 37
    // Article 371 and 141 autonomous districts. Without routes for them a
    // question like "what is the Sixth Schedule" matched only the category
    // `Constitution`, which holds none of the nineteen sentences that actually
    // mention it. Their evidence is filed under tribal administration and
    // autonomous district councils instead.
    'sixth schedule': {
      fit: ['sixth schedule', 'autonomous district council', 'autonomous district',
        'scheduled tribes', 'tribal areas', 'hill areas', 'tribal administration'],
      strain: ['dispute', 'demand', 'agitation', 'tension', 'conflict', 'unrest']
    },
    'article 370': {
      fit: ['article 370', 'special status', 'jammu and kashmir', 'union territory',
        'temporary provision', 'constituent assembly'],
      strain: ['abrogation', 'protest', 'agitation', 'unrest', 'dispute', 'demand', 'separat']
    },
    'article 371': {
      fit: ['article 371', 'special status', 'nagaland', 'mizoram', 'assam', 'meghalaya',
        'gujarat', 'maharashtra', 'tamil nadu', 'andhra pradesh'],
      strain: ['demand', 'agitation', 'protest', 'unrest', 'tension', 'separat']
    },
    'linguistic reorganisation': {
      fit: ['linguistic', 'reorganisation', 'linguistic state', 'demarcation', 'statehood',
        'linguistic states', 'fazl ali', 'states reorganisation commission'],
      strain: ['agitation', 'protest', 'demand', 'dispute', 'tension', 'unrest']
    },
    'autonomous district council': {
      fit: ['autonomous district council', 'autonomous district', 'sixth schedule',
        'scheduled tribes', 'tribal areas'],
      strain: ['dispute', 'demand', 'agitation', 'tension', 'conflict']
    },
    'indian ocean region': {
      fit: ['indian ocean', 'maritime', 'sea trade', 'shipping', 'strait', 'chokepoint',
        'energy security', 'oil imports', 'energy imports', 'sea lanes', 'territorial waters',
        'coastline', 'eez', 'exclusive economic zone', 'andaman', 'nicobar', 'sagar',
        'operation atalanta', 'piracy', 'maritime terrorism', 'china', 'chinese navy'],
      strain: ['piracy', 'maritime terrorism', 'chokepoint', 'competition', 'security']
    },
    'maritime security': {
      fit: ['maritime', 'navy', 'coast guard', 'piracy', 'maritime terrorism', 'strait',
        'chokepoint', 'sea lanes', 'territorial waters', 'eez', 'exclusive economic zone'],
      strain: ['piracy', 'terrorism', 'security', 'threat']
    },
    'parliamentary committees': {
      fit: ['parliamentary committee', 'standing committee', 'select committee', 'parliament',
        'committee', 'oversight', 'scrutiny', 'legislative', 'parliamentary oversight',
        'legislature', 'lok sabha', 'rajya sabha', 'parliamentary procedure'],
      strain: ['executive', 'accountability', 'oversight', 'scrutiny', 'government']
    },
    'executive accountability': {
      fit: ['accountability', 'executive', 'oversight', 'scrutiny', 'parliament', 'legislature',
        'government', 'parliamentary control', 'ministerial responsibility'],
      strain: ['accountability', 'oversight', 'scrutiny', 'corruption', 'misuse']
    },
    'climate change': {
      fit: ['climate change', 'global warming', 'greenhouse gas', 'carbon emission', 'paris agreement',
        'climate summit', 'cop', 'carbon footprint', 'renewable energy', 'solar', 'wind',
        'climate adaptation', 'climate mitigation', 'sea level rise', 'extreme weather'],
      strain: ['vulnerability', 'adaptation', 'mitigation', 'impact', 'risk', 'disaster']
    },
    'environmental protection': {
      fit: ['environment', 'pollution', 'air pollution', 'water pollution', 'soil pollution',
        'biodiversity', 'conservation', 'wildlife', 'forest', 'deforestation',
        'environmental impact', 'sustainable development', 'eco-friendly', 'green'],
      strain: ['degradation', 'threat', 'endangered', 'pollution', 'loss', 'damage']
    },
    'economic development': {
      fit: ['economic growth', 'gdp', 'development', 'industrialisation', 'industrialization',
        'manufacturing', 'services sector', 'infrastructure', 'investment', 'fdi',
        'economic policy', 'fiscal policy', 'monetary policy', 'reform', 'liberalisation'],
      strain: ['inequality', 'poverty', 'unemployment', 'slowdown', 'crisis', 'recession']
    },
    'social justice': {
      fit: ['social justice', 'equality', 'inequality', 'caste', 'reservation', 'affirmative action',
        'discrimination', 'inclusion', 'marginalised', 'marginalized', 'minority',
        'women empowerment', 'gender equality', 'social welfare', 'rights'],
      strain: ['discrimination', 'exclusion', 'oppression', 'inequality', 'violence', 'harassment']
    },
    'international relations': {
      fit: ['foreign policy', 'diplomacy', 'international relations', 'bilateral', 'multilateral',
        'strategic partnership', 'alliance', 'treaty', 'agreement', 'summit',
        'united nations', 'un', 'saarc', 'bimstec', 'asean', 'brics', 'quad'],
      strain: ['conflict', 'dispute', 'tension', 'border', 'war', 'terrorism']
    },
    'science and technology': {
      fit: ['science', 'technology', 'innovation', 'research', 'development', 'space',
        'isro', 'satellite', 'missile', 'nuclear', 'biotechnology', 'it', 'information technology',
        'artificial intelligence', 'ai', 'digital', 'technology transfer'],
      strain: ['challenge', 'ethical', 'risk', 'security', 'dependence', 'gap']
    },
    'agriculture': {
      fit: ['agriculture', 'farming', 'crop', 'irrigation', 'green revolution', 'food security',
        'farmer', 'agricultural policy', 'msp', 'minimum support price', 'subsidy',
        'agricultural credit', 'crop insurance', 'soil health', 'fertilizer'],
      strain: ['distress', 'suicide', 'debt', 'loss', 'drought', 'flood', 'climate']
    },
    'healthcare': {
      fit: ['health', 'healthcare', 'medical', 'hospital', 'public health', 'disease',
        'epidemic', 'pandemic', 'vaccine', 'immunisation', 'immunization', 'health policy',
        'ayushman bharat', 'primary health centre', 'phc', 'rural health'],
      strain: ['shortage', 'inequality', 'access', 'affordability', 'outbreak', 'mortality']
    },
    'education': {
      fit: ['education', 'school', 'college', 'university', 'literacy', 'learning',
        'education policy', 'right to education', 'rte', 'neet', 'skill development',
        'higher education', 'technical education', 'digital education', 'online learning'],
      strain: ['inequality', 'access', 'quality', 'dropout', 'unemployment', 'skill gap']
    },
    'indigenous knowledge': {
      fit: ['indigenous knowledge', 'traditional knowledge', 'traditional medicine', 'ayurveda',
        'siddha', 'unani', 'folk medicine', 'tribal knowledge', 'local knowledge',
        'indigenous practices', 'traditional practices', 'cultural heritage', 'ethnobotany',
        'traditional ecological knowledge', 'indigenous rights', 'tribal culture'],
      strain: ['loss', 'erosion', 'threat', 'extinction', 'modernisation', 'displacement']
    },
    'traditional medicine': {
      fit: ['ayurveda', 'siddha', 'unani', 'homeopathy', 'naturopathy', 'yoga',
        'traditional medicine', 'ayush', 'herbal medicine', 'folk medicine',
        'sushruta', 'charaka', 'traditional healing', 'indigenous healing'],
      strain: ['regulation', 'standardisation', 'quality', 'integration', 'scientific validation']
    },
    'fundamental rights': {
      fit: ['fundamental rights', 'article 14', 'article 19', 'article 21', 'right to equality',
        'right to freedom', 'right to life', 'constitutional rights', 'civil liberties',
        'right to education', 'right to information', 'right to privacy'],
      strain: ['violation', 'restriction', 'suspension', 'emergency', 'limitation']
    },
    'directive principles': {
      fit: ['directive principles', 'dpsp', 'social justice', 'welfare state', 'socialist principles',
        'distribution of wealth', 'equal pay', 'living wage', 'public health', 'education'],
      strain: ['non enforceable', 'implementation', 'judicial review', 'conflict']
    },
    'judiciary': {
      fit: ['supreme court', 'high court', 'judiciary', 'judicial review', 'constitutional interpretation',
        'judicial activism', 'collegium system', 'judicial independence', 'court',
        'justice delivery', 'case backlog', 'legal system'],
      strain: ['interference', 'executive', 'politicisation', 'delay', 'corruption']
    },
    'election commission': {
      fit: ['election commission', 'eci', 'elections', 'voting', 'electoral process',
        'voter id', 'electoral bonds', 'free and fair elections', 'model code of conduct',
        'voter turnout', 'electoral reforms'],
      strain: ['manipulation', 'rigging', 'violence', 'malpractice', 'dispute']
    },
    'pds food security': {
      fit: ['public distribution system', 'pds', 'food security', 'food subsidy', 'ration card',
        'fair price shop', 'fps', 'food grain allocation', 'targeted pds', 'nutrition security'],
      strain: ['leakage', 'corruption', 'diversion', 'quality', 'exclusion error']
    },
    'poverty alleviation': {
      fit: ['poverty', 'poverty alleviation', 'bpl', 'below poverty line', 'poverty line',
        'rural poverty', 'urban poverty', 'poverty estimation', 'multidimensional poverty',
        'poverty reduction', 'anti poverty programme'],
      strain: ['persistent poverty', 'inequality', 'exclusion', 'measurement', 'challenges']
    },
    'unemployment': {
      fit: ['unemployment', 'employment', 'job creation', 'labour force', 'unemployment rate',
        'underemployment', 'disguised unemployment', 'youth unemployment', 'skill gap',
        'employment generation', 'job market'],
      strain: ['job loss', 'underemployment', 'informal sector', 'migration', 'distress']
    },
    'inflation': {
      fit: ['inflation', 'price rise', 'cpi', 'wpi', 'monetary policy', 'interest rate',
        'rbi', 'repo rate', 'inflation targeting', 'food inflation', 'fuel inflation'],
      strain: ['high inflation', 'hyperinflation', 'price volatility', 'cost of living', 'impact']
    },
    'banking sector': {
      fit: ['banking', 'banks', 'rbi', 'monetary policy', 'financial inclusion', 'npa',
        'non performing assets', 'bank nationalisation', 'privatisation', 'digital banking',
        'payment system', 'financial stability'],
      strain: ['npa crisis', 'bank fraud', 'liquidity', 'solvency', 'risk']
    },
    'fiscal policy': {
      fit: ['fiscal policy', 'budget', 'fiscal deficit', 'revenue deficit', 'primary deficit',
        'taxation', 'direct tax', 'indirect tax', 'gst', 'public expenditure',
        'fiscal consolidation', 'federal transfers'],
      strain: ['high deficit', 'debt', 'fiscal imbalance', 'revenue shortfall']
    },
    'external sector': {
      fit: ['external sector', 'balance of payments', 'current account', 'capital account',
        'foreign exchange', 'forex reserves', 'exchange rate', 'rupee', 'fdi', 'fii',
        'external debt', 'trade balance', 'current account deficit'],
      strain: ['cad', 'currency depreciation', 'external vulnerability', 'debt crisis']
    },
    'disaster management': {
      fit: ['disaster management', 'natural disaster', 'cyclone', 'flood', 'drought', 'earthquake',
        'ndma', 'national disaster management authority', 'disaster response', 'relief',
        'rehabilitation', 'disaster preparedness', 'early warning'],
      strain: ['damage', 'loss', 'casualties', 'destruction', 'vulnerability']
    },
    'biodiversity': {
      fit: ['biodiversity', 'species diversity', 'ecosystem diversity', 'genetic diversity',
        'biodiversity hotspot', 'endemic species', 'threatened species', 'conservation',
        'biodiversity loss', 'extinction', 'protected area', 'wildlife sanctuary'],
      strain: ['threat', 'endangered', 'habitat loss', 'poaching', 'invasive species']
    },
    'pollution': {
      fit: ['pollution', 'air pollution', 'water pollution', 'soil pollution', 'noise pollution',
        'industrial pollution', 'vehicle pollution', 'particulate matter', 'pm2.5', 'pm10',
        'pollution control', 'environmental standards', 'emission norms'],
      strain: ['health impact', 'environmental damage', 'air quality index', 'toxic']
    },
    'forest conservation': {
      fit: ['forest', 'forestry', 'forest cover', 'deforestation', 'afforestation', 'reforestation',
        'forest conservation', 'forest rights', 'forest act', 'joint forest management',
        'biosphere reserve', 'national park', 'wildlife sanctuary'],
      strain: ['deforestation', 'forest degradation', 'encroachment', 'loss', 'fragmentation']
    },
    'water resources': {
      fit: ['water resources', 'river', 'water scarcity', 'water conservation', 'rainwater harvesting',
        'groundwater', 'aquifer', 'water pollution', 'water management', 'interlinking rivers',
        'dams', 'irrigation', 'water crisis'],
      strain: ['scarcity', 'depletion', 'pollution', 'conflict', 'overexploitation']
    },
    'energy security': {
      fit: ['energy', 'energy security', 'power sector', 'electricity', 'renewable energy',
        'solar energy', 'wind energy', 'nuclear energy', 'thermal power', 'hydro power',
        'energy mix', 'energy efficiency', 'power generation'],
      strain: ['shortage', 'dependency', 'import', 'coal shortage', 'grid failure']
    },
    'infrastructure': {
      fit: ['infrastructure', 'roads', 'highways', 'railways', 'ports', 'airports',
        'transport', 'logistics', 'digital infrastructure', 'power infrastructure',
        'urban infrastructure', 'rural infrastructure', 'public investment'],
      strain: ['deficit', 'bottleneck', 'quality', 'maintenance', 'funding']
    },
    'make in india': {
      fit: ['make in india', 'manufacturing', 'industrial policy', 'msme', 'micro small medium enterprises',
        'industrial corridors', 'special economic zone', 'sez', 'industrial clusters',
        'manufacturing sector', 'production linked incentive', 'pli'],
      strain: ['challenge', 'competition', 'global value chain', 'logistics', 'skill']
    },
    'digital economy': {
      fit: ['digital economy', 'digital india', 'e commerce', 'fintech', 'digital payments',
        'upi', 'unified payments interface', 'digital literacy', 'internet', 'broadband',
        'digital infrastructure', 'technology adoption', 'startup'],
      strain: ['digital divide', 'cybersecurity', 'privacy', 'regulation', 'inclusion']
    },
    'agriculture': {
      fit: ['agriculture', 'farming', 'crop', 'irrigation', 'green revolution', 'food security',
        'farmer', 'agricultural policy', 'msp', 'minimum support price', 'subsidy',
        'agricultural credit', 'crop insurance', 'soil health', 'fertilizer'],
      strain: ['distress', 'suicide', 'debt', 'loss', 'drought', 'flood', 'climate']
    },
// The four routes below close gaps measured by diag-route-gaps.js, which drives
    // the repo's own mains-questions.json through routeFor(). Two of the nine
    // questions routed before this change; seven did not.
    //
    // The GS4 scenarios themselves are deliberately NOT routed here. A question
    // about an officer pressuring a junior to sign a false report is a fictional
    // situation, not a corpus topic, and matching it to a route would hand the
    // retriever a framing that has nothing to retrieve. What is routable is the
    // concept the scenario tests, which is what these entries carry.
    'civil service values': {
      fit: ['civil service', 'civil servant', 'civil services', 'officer', 'officers',
        'bureaucracy', 'bureaucratic', 'administration', 'administrative', 'obedience',
        'disobedience', 'accountability', 'integrity', 'impartiality', 'impartial',
        'neutrality', 'whistle-blowing', 'whistleblowing', 'whistle blower',
        'civil conduct', 'code of conduct', 'discipline', 'hierarch', 'subordination',
        'public interest', 'conflict of interest', 'misconduct', 'transparency',
        'lokayukta', 'central vigilance commission', 'cvc'],
      strain: ['obedience', 'integrity', 'impartiality', 'conflict of interest',
        'misconduct', 'corruption', 'whistle-blowing', 'accountability',
        'insubordination', 'neutrality', 'bias', 'political loyalty']
    },
    'welfare delivery': {
      fit: ['welfare', 'welfare legislation', 'welfare state', 'social welfare',
        'welfare scheme', 'scheme', 'schemes', 'beneficiary', 'beneficiaries',
        'last mile', 'delivery', 'implementation', 'targeting', 'universalisation',
        'entitlement', 'subsidy', 'transfer', 'pension', 'scholarship', 'mid day meal',
        'mid-day meal', 'pm kisan', 'ayushman bharat', 'nrega', 'mgnrega',
        'rural employment', 'food security', 'public distribution system', 'pds',
        'coverage', 'leakage', 'identification', 'social justice', 'empowerment',
        'marginalised', 'disadvantaged', 'vulnerable'],
      strain: ['delivery', 'last mile', 'implementation', 'leakage', 'exclusion',
        'coverage', 'targeting', 'inequality', 'inequity', 'shortage', 'delay',
        'ineffective', 'uneven', 'gap', 'disbursement']
    },
    'colonial institutions and continuities': {
      fit: ['colonial', 'colonialism', 'colonial state', 'british', 'british raj',
        'raj', 'east india company', 'company rule', 'princely state', 'princely states',
        'crown rule', 'viceroy', 'legislative council', 'durbar', 'civil service',
        'bureaucracy', 'zamindari', 'zamindar', 'landlord', 'tenancy',
        'peasant', 'instability', 'national movement', 'independence', 'continuity',
        'continuities', 'legacy', 'inheritance', 'architecture of the state',
        'institutional legacy', 'transfer of power', 'partition'],
      strain: ['continuity', 'continuities', 'legacy', 'inheritance', 'colonial',
        'discontinuity', 'break', 'residue', 'carry-over', 'vestige']
    },
    'ethics and moral reasoning': {
      fit: ['ethics', 'ethical', 'moral', 'morality', 'ethical dilemma', 'dilemma',
        'moral reasoning', 'impartiality', 'impartial', 'competing claims',
        'competing claims', 'discourse', 'deliberation', 'conscience', 'virtue',
        'virtues', 'deontology', 'consequentialism', 'utilitarian', 'justice',
        'fairness', 'right', 'wrong', 'duty', 'obligation', 'responsibility',
        'moral reasoning', 'stakeholder', 'stakeholders', 'displacement',
        'displaced', 'displacement', 'compensation', 'consent', 'informed consent',
        'harm', 'harmful', 'beneficence', 'non-maleficence', 'respect for persons',
        'tribal rights', 'forest rights', 'indigenous rights'],
      strain: ['dilemma', 'conflict of interest', 'competing claims', 'harm', 'displacement',
        'displaced', 'vulnerable', 'consent', 'impartiality', 'unfair', 'injustice',
        'bias', 'moral', 'ethical', 'right', 'wrong']
    },
    // "Scientific temper" is a corpus entity (`✓ Scientific temper`) but had no
    // route, so a mains question naming it produced routeFor() === null and only
    // the direct entity hit saved it. It also has no single home category: its 36
    // occurrences sit in thirteen source files across Environment & Ecology,
    // Science & Technology, Health & Medicine, Indian Music & Fine Arts and
    // others, and the only category that held enough sentences to index it is the
    // first of those -- which is why it looked misfiled. So the vocabulary is
    // listed here rather than pinned to one category, and retrieval decides
    // where the evidence lives.
    'scientific temper': {
      fit: ['scientific temper', 'scientific attitude', 'rationality', 'rational',
        'reason', 'reasoned', 'empiricism', 'empirical', 'evidence-based', 'scepticism',
        'skepticism', 'critical thinking', 'open-minded', 'enquiry', 'inquiry',
        'experimentation', 'observation', 'superstition', 'superstitious',
        'dogma', 'dogmatic', 'tradition', 'orthodox', 'blind faith',
        'scientific method', 'reasonableness'],
      strain: ['superstition', 'superstitious', 'dogma', 'dogmatic', 'blind faith',
        'ignorance', 'illiteracy', 'myth', 'mythology', 'ritual', 'orthodox']
    },
    'agricultural reforms': {
      fit: ['agricultural reform', 'farm law', 'farmers bill', 'contract farming', 'emarketing',
        'apmc', 'agricultural produce market committee', 'farmers protest', 'agricultural marketing',
        'farming sector reform', 'agricultural liberalisation'],
      strain: ['protest', 'opposition', 'implementation', 'resistance', 'controversy']
    },
    'education system': {
      fit: ['education', 'school', 'college', 'university', 'literacy', 'learning',
        'education policy', 'right to education', 'rte', 'neet', 'skill development',
        'higher education', 'technical education', 'digital education', 'online learning'],
      strain: ['inequality', 'access', 'quality', 'dropout', 'unemployment', 'skill gap']
    },
    'healthcare system': {
      fit: ['health', 'healthcare', 'medical', 'hospital', 'public health', 'disease',
        'epidemic', 'pandemic', 'vaccine', 'immunisation', 'immunization', 'health policy',
        'ayushman bharat', 'primary health centre', 'phc', 'rural health'],
      strain: ['shortage', 'inequality', 'access', 'affordability', 'outbreak', 'mortality']
    },
    'women empowerment': {
      fit: ['women', 'gender', 'women empowerment', 'gender equality', 'feminism',
        'women rights', 'women safety', 'workforce participation', 'political representation',
        'women education', 'maternal health', 'domestic violence', 'sexual harassment'],
      strain: ['discrimination', 'violence', 'harassment', 'pay gap', 'underrepresentation']
    },
    'child rights': {
      fit: ['child', 'children', 'child rights', 'child labour', 'child marriage',
        'child education', 'child health', 'child protection', 'juvenile justice',
        'child abuse', 'malnutrition', 'child welfare'],
      strain: ['exploitation', 'abuse', 'labour', 'marriage', 'neglect', 'mortality']
    },
    'tribal issues': {
      fit: ['tribal', 'tribe', 'scheduled tribes', 'adivasi', 'tribal development',
        'tribal welfare', 'forest rights', 'land rights', 'tribal displacement',
        'tribal education', 'tribal health', 'pesa', 'fifth schedule', 'sixth schedule'],
      strain: ['displacement', 'marginalisation', 'exploitation', 'land alienation', 'poverty']
    },
    'migration': {
      fit: ['migration', 'internal migration', 'rural urban migration', 'labour migration',
        'migrant worker', 'migration policy', 'migration causes', 'migration impact',
        'interstate migration', 'seasonal migration', 'return migration'],
      strain: ['distress', 'exploitation', 'urban slum', 'social dislocation', 'informal sector']
    },
    'urbanisation': {
      fit: ['urbanisation', 'urbanization', 'urban area', 'urban population', 'city', 'metropolitan',
        'urban growth', 'urban sprawl', 'smart city', 'urban planning', 'municipal corporation'],
      strain: ['slum', 'congestion', 'pollution', 'infrastructure', 'housing', 'inequality']
    },
    'border security': {
      fit: ['border', 'border security', 'border management', 'border dispute', 'india china border',
        'india pakistan border', 'lac', 'line of actual control', 'loc', 'border fencing',
        'infiltration', 'cross border terrorism'],
      strain: ['dispute', 'conflict', 'incursion', 'tension', 'standoff', 'violation']
    },
    'internal security': {
      fit: ['internal security', 'naxal', 'maoist', 'insurgency', 'terrorism', 'left wing extremism',
        'lwe', 'militancy', 'kashmir', 'security forces', 'police reform', 'intelligence'],
      strain: ['violence', 'attack', 'casualty', 'threat', 'insurgency', 'militancy']
    },
    'cyber security': {
      fit: ['cyber security', 'cybercrime', 'cyber attack', 'data breach', 'information security',
        'cyber warfare', 'hacking', 'phishing', 'ransomware', 'cyber law', 'cert in'],
      strain: ['threat', 'attack', 'vulnerability', 'breach', 'crime', 'espionage']
    },
    'space programme': {
      fit: ['space', 'isro', 'space programme', 'satellite', 'launch vehicle', 'rocket',
        'space exploration', 'space research', 'communication satellite', 'navigation satellite',
        'chandrayaan', 'mangalyaan', 'gaganyaan'],
      strain: ['failure', 'delay', 'budget', 'technology transfer', 'dependence']
    },
    'nuclear programme': {
      fit: ['nuclear', 'nuclear energy', 'nuclear power', 'nuclear programme', 'atomic energy',
        'nuclear deal', 'nuclear doctrine', 'no first use', 'nuclear disarmament',
        'nuclear non proliferation', 'npt', 'nuclear safety'],
      strain: ['safety', 'waste', 'proliferation', 'accident', 'liability']
    },
    'defence procurement': {
      fit: ['defence', 'military', 'armed forces', 'army', 'navy', 'air force',
        'defence procurement', 'make in india defence', 'defence production', 'indigenisation',
        'defence budget', 'military modernisation'],
      strain: ['delay', 'corruption', 'dependence', 'shortage', 'capability gap']
    }
  };

  // Places the corpus has no material at all, established by auditing rather than
  // by guessing. Recorded so a refusal can say *why* it is refusing and so a
  // future reader does not assume the routes are merely untuned.
  //
  // Deliberately EMPTY, and that is a finding rather than an omission. An
  // earlier version of this table declared `anti-defection law` a corpus gap
  // with nothing found for it. That was wrong: the check had been run against
  // the 65,039-node timeline index, a twelfth of the corpus, and the question
  // bank holds 5 India-relevant `defection` records plus one on "Disqualification
  // of convicted representatives in India". Declaring a gap from a partial
  // corpus is worse than declaring none, because it teaches the user not to
  // ask. Nothing is listed here without a full-bank audit behind it.
  var CORPUS_GAPS = {};

  function gapFor(subject, question) {
    var r = routeFor(subject, question);
    if (!r) return null;
    var g = CORPUS_GAPS[r.key];
    if (!g || !g.fitAbsent) return null;
    return { key: r.key, missing: g.missing };
  }

  // Reverse index: vocabulary term -> the routes that list it.
  //
  // Without this, a route is reachable only when the subject contains the route's
  // key verbatim. "Welfare legislation and last mile delivery" carries four terms
  // from the "welfare delivery" vocabulary (welfare, last mile, delivery,
  // welfare legislation) and still came back null, because key matching only
  // looked for the phrase "welfare delivery" and the longest shared word run was
  // "welfare" at 8 characters, under the 10-character floor. So the table could
  // be written forever and each entry would stay unreachable unless a question
  // happened to phrase the subject as the route's own name. Matching the
  // vocabulary instead is what makes a route mean anything.
  //
  // Built lazily and cached, because CONCEPT_ROUTES is module-level and constant.
  var VOCAB_INDEX = null;
  var VOCAB_TERM_MIN = 6;

  function vocabIndex() {
    if (VOCAB_INDEX) return VOCAB_INDEX;
    var ix = Object.create(null);
    Object.keys(CONCEPT_ROUTES).forEach(function (k) {
      var seen = Object.create(null);
      var cfg = CONCEPT_ROUTES[k] || {};
      // The key itself counts as vocabulary, so a subject phrased as the route
      // name resolves here exactly as it did under key matching.
      [k].concat(cfg.fit || [], cfg.strain || []).forEach(function (p) {
        var t = norm(p);
        // Short terms are too generic to score on: "rights", "law", "policy"
        // appear across a dozen routes and would tie half the table to any one
        // question. The floor is what keeps this from becoming a popularity
        // contest between unrelated concepts.
        if (!t || t.length < VOCAB_TERM_MIN) return;
        if (STOP.indexOf(t.split(' ')[0]) !== -1 && t.indexOf(' ') === -1) return;
        if (seen[t]) return;
        seen[t] = 1;
        (ix[t] || (ix[t] = [])).push(k);
      });
    });
    VOCAB_INDEX = ix;
    return ix;
  }

  // Score a route by how much of its vocabulary the text actually covers, with
  // shared terms discounted: a term listed by eight routes is weak evidence for
  // any one of them, and treating it as strong is what turns "rights" into an
  // answer about constitutional rights for a question about forest rights.
  function vocabScore(ix, key, q, routeKey) {
    var cfg = CONCEPT_ROUTES[routeKey] || {};
    var seen = Object.create(null), score = 0;
    Object.keys(cfg).forEach(function (facet) {
      (cfg[facet] || []).forEach(function (p) {
        var t = norm(p);
        if (!t || t.length < VOCAB_TERM_MIN || seen[t]) return;
        var inKey = t.indexOf(' ') !== -1 ? key.indexOf(t) !== -1 : new RegExp('\\b' + t + '\\b').test(key);
        if (!inKey) {
          if (t.indexOf(' ') === -1) inKey = new RegExp('\\b' + t + '\\b').test(q);
          else inKey = q.indexOf(t) !== -1;
        }
        if (!inKey) return;
        seen[t] = 1;
        var owners = ix[t].length;
        score += t.length / Math.sqrt(owners);
      });
    });
    return score;
  }

  function routeFor(subject, question) {
    var key = norm(subject), q = norm(question);
    var best = null, bestScore = 0;
    Object.keys(CONCEPT_ROUTES).forEach(function (k) {
      var kn = norm(k);
      // Score by how much of the key the text actually covers, so a long
      // subject like "the anti-defection law in India" still routes to
      // "anti-defection law" instead of missing every key.
      var score = 0;
      if (key.indexOf(kn) !== -1) score = kn.length;
      else if (q.indexOf(kn) !== -1) score = kn.length - 1;
      else {
        // Longest shared word run. "anti-defection law" against
        // "the anti-defection law in india" shares "anti defection law".
        var kw = kn.split(' '), qw = key.split(' '), run = 0, runTok = 0, bestRun = 0, bestTok = 0;
        for (var a = 0; a < kw.length; a++) {
          for (var b = 0; b < qw.length; b++) {
            if (kw[a] && kw[a] === qw[b]) {
              run = kw[a].length;
              runTok = 1;
              for (var c = 1; a + c < kw.length && b + c < qw.length; c++) {
                if (kw[a + c] === qw[b + c]) { run += kw[a + c].length; runTok++; }
                else break;
              }
            }
            if (run > bestRun || (run === bestRun && runTok > bestTok)) {
              bestRun = run; bestTok = runTok;
            }
            run = 0; runTok = 0;
          }
        }
        // The run must cover the WHOLE key, not just one of its words.
        //
        // bestRun >= 10 on its own let any single 10+ character word decide the
        // route. "traditional" is 11 characters, so a question about the factors
        // behind the decline of traditional handicraft industries under colonial
        // rule routed to "traditional medicine" -- whose vocabulary is ayurveda,
        // siddha, yoga and charaka -- and was answered with Bikram Yoga and Aerial
        // yoga. Any 10+ character shared adjective could hijack a route the same
        // way.
        //
        // Requiring every token of the key keeps the fuzzy match doing its real
        // job ("anti defection law" inside "the anti defection law in india")
        // while making it impossible to reach a concept by one common word.
        if (bestRun >= 10 && bestTok === kw.length) score = bestRun;
      }
      if (score > bestScore) { bestScore = score; best = k; }
    });
    if (best) return { key: best, cfg: CONCEPT_ROUTES[best] };

    // Nothing matched by name. Fall back to vocabulary coverage, so a question
    // about a concept the table covers but does not name resolves instead of
    // arriving with no framing at all.
    //
    // Deliberately a fallback rather than a blend. Key matching encodes the
    // hand-checked decisions about which concept a phrasing really means, and
    // scoring vocabulary against those same decisions would silently overturn
    // them -- "Displacement, tribal rights and conflict of interest" already
    // routes to "economic development" by name, and letting vocabulary outscore
    // that would change an answer that was checked by hand. The floor keeps a
    // single shared word from routing anything: one 8-character term scores
    // 8/sqrt(owners), and nothing reaches 12 unless at least two substantial
    // terms agree, which is the point at which the concept is genuinely present
    // in the text rather than guessed at.
    var ix = vocabIndex();
    var vBest = null, vBestScore = 0;
    Object.keys(CONCEPT_ROUTES).forEach(function (k) {
      var s = vocabScore(ix, key, q, k);
      if (s > vBestScore) { vBestScore = s; vBest = k; }
    });
    if (vBest && vBestScore >= 12) {
      return { key: vBest, cfg: CONCEPT_ROUTES[vBest], viaVocabulary: true };
    }
    return null;
  }

  // A question that names a country means the answer is about that country.
  // Without this the federal question was answered with a Colorado county
  // "applying for statehood": a true sentence, from a real node, about a
  // different federation. Demonyms, country names and the constituent states are
  // all accepted, because a sentence about the Punjab Reorganisation Act may
  // say "Punjab" and never say "India".
  var JURISDICTIONS = {
    india: ['india', 'indian', 'bharat', 'hindustan', 'punjab', 'haryana', 'gujarat', 'maharashtra',
      'kerala', 'tamil nadu', 'andhra', 'telangana', 'karnataka', 'odisha', 'orissa', 'west bengal',
      'bengal', 'assam', 'bihar', 'rajasthan', 'uttar pradesh', 'himachal', 'goa', 'tripura',
      'manipur', 'mizoram', 'nagaland', 'arunachal', 'sikkim', 'chhattisgarh', 'jharkhand',
      'ladakh', 'jammu', 'kashmir', 'andaman', 'lakshadweep', 'pondicherry', 'chandigarh',
      'delhi', 'lakshadweep']
  };

  function jurisdictionMarkers(question) {
    var q = norm(question);
    var out = [];
    Object.keys(JURISDICTIONS).forEach(function (c) {
      if (q.indexOf(c) !== -1) JURISDICTIONS[c].forEach(function (m) { if (out.indexOf(m) === -1) out.push(m); });
    });
    return out;
  }

  // Flat phrase list for the chosen concept, both facets. Used to build the
  // candidate pool and to qualify a sentence.
  function conceptPhrases(subject, question) {
    var r = routeFor(subject, question);
    if (!r) return [];
    return r.cfg.fit.concat(r.cfg.strain);
  }

  // Which facet a phrase belongs to, so an answer to "how far" can report the
  // accommodation mechanisms and the strain side by side rather than only the
  // flattering one.
  function facetOf(subject, question, phrase) {
    var r = routeFor(subject, question);
    if (!r) return 'fit';
    if (r.cfg.fit.indexOf(phrase) !== -1) return 'fit';
    if (r.cfg.strain.indexOf(phrase) !== -1) return 'strain';
    return 'fit';
  }


  // Does this node's title carry the subject? Per variant: multi-word windows
  // must appear contiguous in the title, a single-word subject must be a whole
  // token. Checked in longest-first order so an exact title match wins before
  // any shorter window can.
  function titleMatchesSubject(nameNorm, variants) {
    var title = foldSZ(nameNorm);
    for (var i = 0; i < variants.length; i++) {
      var v = variants[i];
      if (v.indexOf(' ') === -1) { if (tokenSet(title)[v] === 1) return true; }
      else if (title.indexOf(v) !== -1) return true;
    }
    return false;
  }

  // Anchors are the candidate's own rare words: the terms that identify the
  // subject rather than the topic. "India" and "law" appear in thousands of
  // nodes and identify nothing; "bhopal", "meghachandra", "anti-defection"
  // appear in almost none. Coverage is computed over anchors only, which is
  // what stops a pile of generic sentences from scoring as a full answer.
  function anchorsOf(idx, terms, subject) {
    var subjTok = tokenSet(norm(subject));
    var scored = terms.map(function (t) {
      var df = idx.df[t] || 0;
      return { t: t, idf: Math.log(1 + (idx.N - df + 0.5) / (df + 0.5)), df: df, inSubject: !!subjTok[t] };
    });
    // Subject words outrank rarer incidental words, so that "Congress" beats
    // "outcomes" when deciding what the question is about.
    scored.sort(function (a, b) {
      if (a.inSubject !== b.inSubject) return a.inSubject ? -1 : 1;
      return b.idf - a.idf;
    });
    return scored.filter(function (x) { return x.df > 0; });
  }

  // Graph expansion over co-occurrence links only. Weight decays hard so that a
  // neighbour is never allowed to outrank a direct hit, and typed `edges` are
  // excluded from this path entirely: at 1,786 entries they are a family tree,
  // and treating "wife of" as topical relatedness is how a retrieval engine
  // starts asserting nonsense about constitutional offices.
  function expand(idx, hits, maxPerNode) {
    var seen = {}, out = [];
    hits.forEach(function (h) {
      seen[h.i] = true;
      out.push(h);
    });
    var frontier = hits.slice(0, 12);
    frontier.forEach(function (h) {
      var neighbours = idx.adj[h.i] || [];
      neighbours.forEach(function (pair) {
        var ni = pair[0], w = pair[1];
        if (seen[ni]) return;
        seen[ni] = true;
        out.push({ i: ni, score: h.score * 0.22 * Math.min(1, w / 20), direct: false });
      });
    });
    out.sort(function (a, b) { return b.score - a.score; });
    return out.slice(0, maxPerNode);
  }

  // ── retrieval + composition ───────────────────────────────────────────────
  function retrieve(idx, question, limit) {
    var a = analyse(question);
    limit = limit || 12;
    var prop = properNounRun(question);
    var subject = subjectOf(question) || (prop ? widenSubject(question, prop) : '');
    var route = routeFor(subject, question);
    // When a concept route is found, boost its terms in the search
    var weights = {};
    Object.keys(a.weights).forEach(function (k) { weights[k] = a.weights[k]; });
    var boosts = Array.isArray(a.boosts) ? a.boosts.slice() : [];
    if (route) {
      var conceptTerms = route.cfg.fit.concat(route.cfg.strain);
      conceptTerms.forEach(function (t) {
        if (!weights[t]) weights[t] = 0.8; // Boost concept terms
      });
    }
    var hits = bm25(idx, weights, boosts);
    if (!hits.length) {
      return { analysis: a, candidates: [], evidence: [], coverage: 0, refused: true, reason: 'no term in the question appears anywhere in the index' };
    }
    // bm25 scores only the terms it can find, so a question whose distinctive
    // term is absent is scored on its leftovers alone -- and the leftovers are
    // always the generic ones. "anti-defection law" has no `defection` anywhere
    // in the index, so it ranked on `anti` and `law` alone and answered with the
    // definition of a coalition and a 1955 split in the Australian Labor Party,
    // confidently, at full coverage. "indian federal framework" lost `federal`
    // the same way and answered with .NET Framework.
    //
    // An absent term is not a weak signal, it is a fact about the corpus: it
    // means the subject the question asks about is not in the index at all. The
    // engine cannot answer that, so it says so. Only genuinely rare terms
    // count, and only when most of the question's terms are missing -- a single
    // stray term in an otherwise well-covered question must not cost an answer.
    var contentTerms = a.terms.filter(function (t) { return STOP.indexOf(t) === -1; });
    if (contentTerms.length) {
      var missing = contentTerms.filter(function (t) { return !idx.df[t]; });
      // A term the index has never seen cannot be scored, so whatever else the
      // question matches, it cannot be answered *as asked*. The question is
      // about that term; the terms that remain are only its scaffolding.
      //
      // The discriminator is whether the absent word is the question's subject
      // word. "anti-defection law" is a question about defection, and the index
      // has no `defection` -- so `law` (533 nodes) and `anti` (365) are the
      // scaffolding and the subject is missing. Refuse. A question that merely
      // mentions a rare unknown word alongside a well-covered subject is
      // different, so a single absent term only counts when the terms that DO
      // resolve are themselves common: they identify nothing, and a confident
      // answer built from them is exactly the garbage this guard exists to stop.
      var known = contentTerms.filter(function (t) { return idx.df[t]; });
      var halfMissing = missing.length >= Math.ceil(contentTerms.length / 2);
      var commonScaffold = known.length && known.every(function (t) {
        return idx.df[t] > Math.max(50, Math.round(idx.N * 0.005));
      });
      if (missing.length && (halfMissing || commonScaffold)) {
        return {
          analysis: a, candidates: [], evidence: [], coverage: 0, refused: true,
          reason: 'the corpus index does not contain ' + missing.join(' or ') +
                  ', so it cannot answer this question',
          corpusGap: missing
        };
      }
    }
    var top = hits.slice(0, 40);
    var ranked = expand(idx, top, limit * 3);

    // Work out what the question is about before scoring anything. The noun-phrase
    // parse is primary: it is what correctly reads "the impact of urbanisation on
    // food security in India" as being about urbanisation, a phrase no capitalised
    // run ever captures. The proper-noun run, widened to include the head noun
    // beside it, is the fallback for subjects the grammar does not catch.
    var prop = properNounRun(question);
    var subject = subjectOf(question) || (prop ? widenSubject(question, prop) : '');
    var anchors = anchorsOf(idx, a.terms, subject);

    // Evidence must come from a node that is genuinely competitive. Without this
    // floor, deep-tail nodes with a single incidental term match contributed
    // sentences, and twelve weak sentences looked like a strong answer.
    var topScore = top[0].score;
    var floor = topScore * 0.30;

    // Once a subject has been identified, the only nodes allowed to supply
    // evidence are those whose own title matches it. Without this, a question
    // about the Bhopal disaster was answered with sentences from "Environmental
    // impact of recreational diving" and "Environmental impact of fashion" --
    // real quotes from the corpus, but about something else entirely, held
    // together by the generic word "impact". Restricting evidence to the subject's
    // own articles is what turns a keyword soup into an answer about the thing
    // that was asked.
    // The subject is a phrase no node may title verbatim, so match every
    // contiguous word window of it — longest first, so the exact title wins.
    var subjVariants = subjectVariants(subject);
    var conceptTerms = subject ? conceptPhrases(subject, question) : [];

    // Is the subject a thing this corpus actually titles? Checked across the
    // whole index, not just the hits, because the answer decides which evidence
    // tier applies. A conceptual question ("the Indian federal framework") has
    // no node titled with it -- the corpus titles `Punjab Reorganisation Act,
    // 1966` and `Deori Autonomous Council` instead -- so a strict title gate
    // answers nothing at all. But dropping the gate entirely is what produced
    // `.NET Framework` and `Far Cry 3` for this very question.
    var subjectTitled = false;
    for (var si = 0; si < idx.nodes.length && !subjectTitled; si++) {
      if (titleMatchesSubject(norm(idx.nodes[si].node.name), subjVariants)) subjectTitled = true;
    }
    // A subject can name a real entity and still be untitled as a phrase. "bhopal
    // gas tragedy" is not any node's title, but `Bhopal` is a node in its own
    // right, and it is what the question is about. subjectVariants() floors
    // windows at 3 words so that bare "gas" or "law" can never become a subject
    // (that floor is what stopped "world trade" matching 1 World Trade Center),
    // which means a 3-word subject produces no shorter variant at all and both
    // evidence tiers fall through to the refuse branch -- 12 correct candidates
    // found, every one discarded, 0 evidence, for a corpus that plainly
    // contains the topic.
    //
    // So: if the full phrase is untitled, fall back to the subject's rarest
    // content word, the one that actually identifies the entity. Rarity is
    // measured against the index (df), not by position, because the head is not
    // reliably first -- "bhopal gas tragedy" is headed by "bhopal" but "gas
    // tragedy bhopal" would not be. Only a genuinely rare word is eligible: a
    // word that appears in a large share of nodes identifies nothing, and
    // admitting one would reopen the generic-word gate this whole path exists
    // to hold shut.
    var headVariants = [];
    if (subject && !subjectTitled) {
      var subjWords = String(subject).trim().split(/\s+/).filter(function (w) {
        return w && STOP.indexOf(norm(w)) === -1;
      });
      // The bar has to be genuinely rare, not merely uncommon. At 2% of the
      // index "constitutional" (81 of 65,039 nodes) still qualified, the head
      // became the bare word "constitutional", and every court and tribunal
      // titled with it -- Indonesia, Korea, Myanmar -- answered a question
      // about Indian constitutional morality. A head is allowed to stand in
      // for the subject only when it names something specific.
      var rareBar = Math.max(4, Math.round(idx.N * 0.001));
      // Rarity alone stops separating entities from common words as the corpus
      // grows, because rareBar is a fraction of N: at 214k nodes it admits any
      // word in <=214 nodes, and "cry" (34) sailed through, turning "far cry 3"
      // into doo-wop singles. A real entity name also titles few nodes. `bhopal`
      // titles 11, `modi` 5; `cry` titles 19 and `gas` 86. Capping titleDf at 12
      // keeps the entities and both excludes the songs and hardens the old
      // "framework"/"constitutional" case independently of the concept guard.
      var HEAD_TITLE_DF = 12;
      var rare = subjWords.filter(function (w) {
        var t = norm(w);
        var d = idx.df[t] || 0;
        return d > 0 && d <= rareBar && (idx.titleDf[t] || 0) <= HEAD_TITLE_DF;
      });
      // Rarest first, so the most identifying word leads. Length is the
      // tiebreak only to keep the ordering stable and to prefer a two-word
      // head over a single one when both are equally rare.
      rare.sort(function (x, y) {
        var dx = idx.df[norm(x)] || 0, dy = idx.df[norm(y)] || 0;
        if (dx !== dy) return dx - dy;
        return y.length - x.length;
      });
      headVariants = rare.slice(0, 2).map(function (w) { return norm(w); });
    }
    // A head may stand in for an untitled subject only when the subject is
    // specific enough that no concept is on offer. "indian federal framework"
    // routes to the concept tier by design -- `Federalism in India` is a node --
    // but `framework` is rare (59 of 65,039) and so passed the head bar, the
    // bare word became a title match, and the subject tier answered a question
    // about Indian federalism with `.NET Framework` and `Griffon (framework)` at
    // full coverage while the right node went unread.
    //
    // The concept router is the stronger signal precisely when it fires: it
    // found a phrase that names the question's actual subject. Rarity alone only
    // says the word is uncommon, not that it is the head -- "framework" is the
    // rarest word of that subject and the least identifying of the three.
    if (headVariants.length && conceptTerms.length) headVariants = [];
    var headTitled = false;
    if (headVariants.length) {
      for (var hi = 0; hi < idx.nodes.length && !headTitled; hi++) {
        if (titleMatchesSubject(norm(idx.nodes[hi].node.name), headVariants)) headTitled = true;
      }
      // The head is only an entity proxy, never a subject in its own right: its
      // own questions ("who won the Bhopal state election") must not be routed
      // here, and a head match must never satisfy coverage on its own.
      if (headTitled) subjVariants = subjVariants.concat(headVariants);
    }
    var subjectEffective = subjectTitled || headTitled;
    // Which evidence tier produced the sentences. Declared out here rather than
    // inside the scoring loop because the coverage maths and the verdict below
    // both need it.
    // A head match counts as an entity found. If it did, the subject tier must
    // run and the concept tier must NOT: both tiers admitting sentences at once
    // is how a head-proxied question picks up concept-phrase material from
    // nodes that have nothing to do with the entity.
    var conceptTier = !!(!subjectEffective && conceptTerms.length);

    var juris = jurisdictionMarkers(question);
    function sameJurisdiction(text) {
      if (!juris.length) return true;                     // no country named: no constraint
      for (var j = 0; j < juris.length; j++) if (text.indexOf(juris[j]) !== -1) return true;
      return false;
    }

    // The candidate pool must actually contain the concept material. A top-40
    // BM25 slice over the question's own words is all `.NET Framework` and
    // `Far Cry 3`, because the nodes that actually answer -- `Punjab
    // Reorganisation Act, 1966`, `Deori Autonomous Council` -- contain none of
    // them. So when the subject is untitled, run a second pass over the concept
    // phrases and merge those nodes in. They are scored separately and can
    // never outrank a genuine subject match.
    if (!subjectEffective && conceptTerms.length) {
      // bm25 is token-level, so a two-word concept phrase ("scheduled tribes")
      // would never match anything as a single key. Feed the words; the
      // containment test below still uses the full phrase, which is what
      // actually keeps the evidence honest.
      var cw = {};
      conceptTerms.forEach(function (ph) {
        tokens(ph).forEach(function (w) { if (STOP.indexOf(w) === -1) cw[w] = 1; });
      });
      var chits = Object.keys(cw).length ? bm25(idx, cw, null).slice(0, 160) : [];
      var have = {};
      ranked.forEach(function (r) { have[r.i] = 1; });
      chits.forEach(function (h) {
        if (have[h.i]) return;
        have[h.i] = 1;
        ranked.push({ i: h.i, score: h.score * 0.5, direct: false, concept: true });
      });
    }

    var evidence = [];
    ranked.forEach(function (r) {
      if (r.score < floor && !r.concept) return;
      var p = idx.nodes[r.i];
      if (!p) return;
      if (subjVariants.length && subjectEffective) {
        if (!titleMatchesSubject(norm(p.node.name), subjVariants)) return;
      } else if (conceptTerms.length) {
        // Fallback tier. Require the node's own text to carry a concept phrase,
        // so it must be about the subject and not about a shared keyword.
        var nodeText = norm(p.node.name + ' ' + p.node.desc);
        var hitConcept = conceptTerms.some(function (c) { return nodeText.indexOf(c) !== -1; });
        if (!hitConcept) return;
        // ...and, when the question names a country, that it is the same country.
        if (!sameJurisdiction(nodeText)) return;
      } else {
        // Neither tier applies: no subject, no concept. Refusing is the honest
        // outcome -- loose keyword matching is what produced the garbage answer.
        return;
      }
      // Only the question's *distinctive* terms may qualify a sentence as
      // evidence. Anchoring on any query word let "law" and "india" carry
      // sentences about the Chinese Anti-Secession Law into answers about Indian
      // anti-defection. The bar is the top few anchors by rarity, so a sentence
      // must mention something specific to the question and not merely a common
      // word that happens to appear in it.
      var keyAnchors = anchors.filter(function (an) { return an.idf >= 2.0; }).slice(0, 5);
      if (!keyAnchors.length) keyAnchors = anchors.slice(0, 2);
      splitSentences(p.node.desc).forEach(function (s) {
        if (!isQuoteable(s)) return;
        var sentSet = tokenSet(norm(s));
        var weight = 0;
        for (var k = 0; k < keyAnchors.length; k++) {
          if (sentSet[keyAnchors[k].t]) weight += keyAnchors[k].idf;
        }
        // In the fallback tier the sentence does not contain the question's own
        // words -- that is precisely why the subject could not be titled -- so
        // the anchor-weight test rejects every correct sentence. The concept
        // phrase is the relevance proof there, and it is a stronger one: it is
        // checked inside the sentence, not merely in the node title.
        if (conceptTier) {
          var sNorm = norm(s);
          var inConcept = conceptTerms.some(function (c) { return sNorm.indexOf(c) !== -1; });
          if (!inConcept) return;
          if (!weight) weight = 1;
        }
        if (weight <= 0) return;
        var e = { sentence: s, score: r.score + weight, node: p.node, direct: r.direct };
        if (conceptTier) {
          var sN2 = norm(s);
          var ph2 = null;
          for (var ci = 0; ci < conceptTerms.length; ci++) {
            if (sN2.indexOf(conceptTerms[ci]) !== -1) { ph2 = conceptTerms[ci]; break; }
          }
          e.concept = ph2;
          e.facet = ph2 ? facetOf(subject, question, ph2) : 'fit';
        }
        evidence.push(e);
      });
    });

    // Deduplicate on normalised text; the same Wikipedia sentence is indexed
    // under several category shards.
    var seenS = {}, uniq = [];
    evidence.sort(function (x, y) { return y.score - x.score; });
    evidence.forEach(function (e) {
      var k = norm(e.sentence).slice(0, 120);
      if (seenS[k]) return;
      seenS[k] = true;
      uniq.push(e);
    });

    // Coverage, IDF-weighted over the candidate's own NON-SUBJECT terms. The
    // subject is already gated separately (subjectMatched), so counting it here
    // would let a question about the Bhopal gas tragedy pass on city facts that
    // merely mention "Bhopal". The demanded content — environmental, impact, gas,
    // tragedy — is what must actually appear in the evidence.
    var nonSubj = anchors.filter(function (an) { return !an.inSubject; });
    var totalIdf = 0, gotIdf = 0;
    nonSubj.forEach(function (an) {
      totalIdf += an.idf;
      if (uniq.some(function (e) { return tokenSet(norm(e.sentence))[an.t]; })) gotIdf += an.idf;
    });
    // A pure-entity question ("Who was Dadabhai Naoroji?") has no non-subject
    // anchors; coverage defaults to 1 so a subject-present answer can pass.
    var termCov = nonSubj.length ? (totalIdf ? gotIdf / totalIdf : 0) : 1;

    // Subject terms must also be evidenced, by their own rarity.
    //
    // Excluding subject terms from the score above is what stops a Bhopal
    // question passing on facts that merely mention "Bhopal" -- but it removes
    // the only terms that could have caught the inverse failure, and for a
    // question that IS its own subject there is nothing left to score. "Analyse
    // the role of micro, small and medium enterprises in India's economic
    // development" reported 100% coverage while quoting nine sentences that
    // contain none of micro, medium or enterprises, because "india" and
    // "development" carried the whole score. Coverage cannot go below 100% when
    // the terms that distinguish the subject are not part of it.
    //
    // So: a subject term that is rare in the corpus identifies the subject, and
    // if no sentence contains enough of those rare terms, the evidence is not
    // about the subject however well it scores elsewhere. Rare is measured by idf
    // against the same index the rest of the scoring uses, so this is not a
    // hand-tuned list -- "india" and "development" are too common to qualify and
    // do not count against an answer, while "enterprises" (df 21) and "micro"
    // (df 15) do.
    var subjRare = anchors.filter(function (an) { return an.inSubject && an.idf >= 4.0; });
    var subjRareGot = 0;
    subjRare.forEach(function (an) {
      if (uniq.some(function (e) { return tokenSet(norm(e.sentence))[an.t]; })) subjRareGot++;
    });
    // One rare term unaccounted for is tolerable in a long answer; most of them
    // missing means the evidence is about something else. Requiring all of them
    // would refuse questions whose subject is named in the node title rather than
    // restated in every sentence.
    var subjTermRatio = subjRare.length ? subjRareGot / subjRare.length : 1;
    // A conceptual subject is exempt: its own words need not appear verbatim in
    // the evidence. "indian federal framework" routes to the federalism concept,
    // and a correct federalism answer cites Article 370 and reorganisation
    // without ever saying "federal" or "framework" -- requiring them refused the
    // right node while the generic gate let a worse one through. Concept coverage
    // is the gate for this tier; the literal subject words are the gate elsewhere.
    var subjTermSupported = !subjRare.length || subjTermRatio >= 0.5 || conceptTier;

    // In the concept tier the evidence deliberately does NOT contain the
    // question's own words -- that is why the subject could not be titled -- so
    // scoring coverage over them reports ~30% no matter how good the answer is,
    // and the engine refuses material it just found. Coverage there is the
    // share of the concept vocabulary the evidence actually speaks to, which is
    // the question the reader is really asking.
    var conceptCov = 0, hasFit = false, hasStrain = false;
    if (conceptTier && conceptTerms.length) {
      var seenConcept = {};
      uniq.forEach(function (e) {
        var sN = norm(e.sentence);
        conceptTerms.forEach(function (c) { if (sN.indexOf(c) !== -1) seenConcept[c] = 1; });
        if (e.facet === 'strain') hasStrain = true; else hasFit = true;
      });
      conceptCov = Object.keys(seenConcept).length / conceptTerms.length;
    }

    // The subject must be matched by an actual node title, not merely appear in
    // passing inside some unrelated sentence. A multi-word subject ("Lok Sabha
    // Speaker") is required as a contiguous phrase, because that topic is not
    // satisfied by separate nodes for "Lok Sabha" and "Speaker". A single-word
    // subject ("Bhopal") is required as a whole token. Requiring every token
    // separately was the previous bug: no node is titled with all the words of
    // "the anti-defection law in India", so that phrasing could never match
    // anything and the engine refused questions the corpus can partly answer.
    //
    // The wording of the refusal is deliberately weak: "no quotable material",
    // never "no article". A node titled "Indian National Congress" does exist in
    // the corpus, but its desc is 8 words long and was excluded at index build
    // time, so the engine has nothing to quote. Claiming the article is absent
    // would be a false statement of the kind this engine exists to prevent, and
    // distinguishing the two cases would mean shipping all 529,755 node titles
    // to the browser to support a nicety.
    var subjNorm = norm(subject);
    var subjTokens = tokenSet(subjNorm);
    var subjList = Object.keys(subjTokens);
    var subjectMatched = null;
    if (subjList.length) {
      subjectMatched = ranked.some(function (r) {
        if (r.score < floor) return false;
        return titleMatchesSubject(norm(idx.nodes[r.i].node.name), subjVariants);
      });
      // In the concept tier the subject is never a node title by definition --
      // the tier only runs when it is not one. Judging the subject on a title
      // match there guarantees a refusal no matter how much relevant evidence
      // was found, so the concept evidence itself is the match.
      //
      // But the concept evidence is only a match if it actually speaks to the
      // concept. Without the second condition a question about the
      // anti-defection law was answered with the definition of a coalition, the
      // Deputy Speaker and a 1920 Akali Dal entry, on 18.75% concept coverage:
      // the rescue fired on three sentences that had nothing to do with the
      // subject. Concept coverage now has to clear the same bar as the main
      // gate. Federalism clears it at 85% and still answers, which is the
      // intended behaviour; the anti-defection question should refuse.
      //
      // Coverage alone stopped being enough once the index grew to 214k nodes:
      // with more sentences to draw on, the generic fit terms ('party',
      // 'coalition', 'speaker') covered 62.5% and the question answered with an
      // anti-vivisection coalition. The decisive fact is that the corpus has a
      // node for this subject and the quote gate dropped it -- `thinNode` says
      // so. When the entity exists but is unquotable here, the honest verdict is
      // a refusal that names it (the page then reaches the question bank), never
      // a concept answer assembled from other entities' words.
      if (!subjectMatched && conceptTier && uniq.length >= MIN_EVIDENCE && conceptCov >= MIN_COVERAGE) {
        if (!thinNode(idx, subject)) subjectMatched = true;
      }
    }

    // A subject the question states as a clause is not a topic, and matching a
    // clause against node titles finds whatever happens to be in it. "Examine
    // whether the constitutional office of the Lok Sabha Speaker has become
    // vulnerable to partisan politics" reduced to the whole clause, and the
    // permissive variant matching then found "Deputy Speaker of the Lok Sabha"
    // and answered a question about the Speaker's neutrality with the
    // second-ranking office. There is no title to match, so say so instead of
    // guessing one.
    var clauseSubject = /^(?:whether|if|how|why|that|which|when|where)\b/i.test(subjNorm) ||
      /\b(?:has|have|had|is|are|was|were)\s+(?:been\s+)?(?:become|became|required|needed|possible|vulnerable|affected|able)\b/i.test(subjNorm);

    var dimCov = a.demand.length ? a.demand.filter(function (d) {
      return uniq.some(function (e) { return e.sentence.search(d.re) !== -1; });
    }).length / a.demand.length : 1;

    var coverage = Math.max(0, Math.min(1, 0.70 * termCov + 0.30 * dimCov));
    // A question that asks "how far", "evaluate" or "critically examine" is
    // asking for a judgement, and a judgement needs both sides. A pile of
    // success mechanisms with nothing on the other side is a press release, not
    // an answer, so the concept tier reports coverage against the union of both
    // facets and records which sides were actually evidenced.
    var evalVerdict = /\b(how far|evaluate|assess|critically|examine|success|successful|extent|justify|appraise|comment on|discuss)\b/i.test(String(question || ''));
    if (conceptTier) {
      coverage = Math.max(coverage, Math.min(1, conceptCov));
    }

    // The gate. Three independent ways to fail, because any one of them means
    // the answer would be assembled rather than retrieved:
    //   not enough quoteable sentences | the subject is not in any node title
    //   | the question's rare terms are not accounted for.
    var refused = true, reason = '';
    // A node the quote gate dropped is the most informative case and must be
    // checked first: the corpus HAS the subject, it simply cannot quote it from
    // this index. "No term in the question appears anywhere in the index" is
    // false in that situation, and it is the sentence most likely to make a
    // reader conclude the corpus is empty. Say what actually happened.
    var thin = thinNode(idx, subject);
    if (uniq.length < MIN_EVIDENCE) {
      var gaps = gapFor(subject, question);
      if (thin) {
        reason = 'the corpus has a node titled "' + thin.title + '", but its only ' +
          'quotable sentence is ' + thin.info.words + ' word' + (thin.info.words === 1 ? '' : 's') +
          ' long, under the ' + MIN_DESC_WORDS + '-word floor this index applies' +
          (thin.info.reason === 2 || thin.info.reason === 3
            ? ', and what is there is not a complete sentence' : '') +
          '. The material is in the question bank but this retrieval index cannot quote it.';
      } else {
        reason = gaps
          ? 'the corpus holds no material on "' + gaps.key + '": auditing all ' + idx.nodes.length +
            ' indexed nodes found no India-relevant node for ' + gaps.missing.join(', ') +
            '. That is a gap in the corpus, not a retrieval failure'
          : 'only ' + uniq.length + ' quoteable sentence(s) in the corpus bear on this question';
      }
    } else if (clauseSubject) {
      reason = 'the question is phrased as a clause ("' + subject.slice(0, 80) +
        '…") rather than naming a topic, so the engine cannot tell which subject it should be held to';
    } else if (subjectMatched === false) {
      // Same correction as above, for the path where a few loose sentences were
      // found but none titled the subject. The node may still exist and simply be
      // too thin to quote, which is a different statement from "no material".
      reason = thin
        ? 'the corpus has a node titled "' + thin.title + '", but its only quotation is ' +
          thin.info.words + ' word' + (thin.info.words === 1 ? '' : 's') + ' long, so this ' +
          'index holds nothing it can quote for the subject'
        : subjList.length
          ? 'no quotable material in the corpus on "' + subject + '", the subject of this question'
          : 'the subject of the question could not be identified in the corpus';
    } else if (coverage < MIN_COVERAGE) {
      reason = 'evidence accounts for ' + Math.round(coverage * 100) + '% of the question, below the ' + Math.round(MIN_COVERAGE * 100) + '% gate';
    } else if (!subjTermSupported) {
      // Before the generic coverage gate, because in the MSME case coverage was
      // 100% and reporting "evidence accounts for 100% of the question" alongside
      // a refusal would be nonsense. The subject's own distinguishing terms are
      // the ones absent, so name them: that is what tells a reader whether the
      // corpus lacks the topic or retrieval missed it.
      var missed = subjRare.filter(function (an) {
        return !uniq.some(function (e) { return tokenSet(norm(e.sentence))[an.t]; });
      }).map(function (an) { return an.t; });
      reason = 'only ' + subjRareGot + ' of the ' + subjRare.length +
        ' terms that identify "' + subject + '" (' + missed.join(', ') +
        ') appear in any of the ' + uniq.length + ' sentences retrieved, ' +
        'below the half needed to treat them as evidence. The sentences found ' +
        'share only common words with the question, which is topic similarity ' +
        'rather than evidence';
    } else if (conceptTier && evalVerdict && hasFit && !hasStrain) {
      // Refuse the one-sided answer rather than present it as a judgement.
      //
      // The message must be derived from the route that actually fired. It used
      // to be fixed prose about "how the framework accommodated diversity",
      // written for the federal diversity concept and emitted verbatim for
      // EVERY concept with one-sided evidence. A question about nuclear energy in
      // India's future mix was therefore refused with a sentence about diversity
      // and "how far" -- a debate the reader never raised -- which is worse than
      // no explanation at all. Name the concept and name the missing side.
      var oneRoute = routeFor(subject, question) || {};
      var oneCfg = oneRoute.cfg || {};
      var missingSide = (oneCfg.strain || []).filter(function (t) {
        return !uniq.some(function (e) { return norm(e.sentence).indexOf(norm(t)) !== -1; });
      });
      reason = 'the corpus evidences one side of "' + (oneRoute.key || 'this concept') +
        '" but holds no quotable material on the other side' +
        (missingSide.length
          ? ' (' + missingSide.slice(0, 6).join(', ') + ')' : '') +
        ', so it cannot support a judgement on the trade-off the question asks for';
    } else {
      refused = false;
    }

    return {
      analysis: a,
      candidates: ranked.slice(0, limit).map(function (r) { return idx.nodes[r.i].node; }),
      evidence: uniq.slice(0, 12),
      coverage: coverage,
      termCoverage: termCov,
      dimensionCoverage: dimCov,
      subject: subject,
      subjectMatched: subjectMatched,
      subjectTokens: subjList,
      anchors: anchors.slice(0, 6).map(function (x) { return x.t; }),
      concept: conceptTier ? (routeFor(subject, question) || {}).key : null,
      conceptCoverage: conceptCov,
      corpusGap: gapFor(subject, question),
      facets: { accommodation: !!hasFit, strain: !!hasStrain },
      // The dropped-node record for the subject, if this index had one. Surfaced
      // so a caller can tell "the corpus lacks it" apart from "this index dropped
      // it" and route the subject to the question bank's richer sentences.
      thin: thin,
      refused: refused,
      reason: reason
    };
  }

  // The composer never writes a claim of its own. Every line is either a quoted
  // corpus sentence with its source, or a structural heading. This is the
  // difference between an evidence pack and a fabricated answer.
  function compose(question, res) {
    if (res.refused) {
      return {
        refused: true,
        reason: res.reason,
        coverage: res.coverage,
        answer: 'The Vlymbooq corpus does not contain enough quotable material to answer this question reliably.\n\n' +
          'This engine only answers from text that is present in the corpus, so it will not assemble an answer from fragments. ' +
          'The material for this question appears to be missing rather than merely hard to find.',
        sources: []
      };
    }
    var a = res.analysis;
    var ev = res.evidence;
    var parts = [];
    parts.push('## ' + titleFor(a));
    var seen = {};
    ev.forEach(function (e) {
      var k = norm(e.sentence).slice(0, 80);
      if (seen[k]) return;
      seen[k] = true;
      parts.push('- ' + e.sentence + '  \n  *[' + e.node.name + ']*');
    });
    var unmet = a.demand.filter(function (d) {
      return !ev.some(function (e) { return e.sentence.search(d.re) !== -1; });
    });
    return {
      refused: false,
      coverage: res.coverage,
      answer: parts.join('\n\n'),
      unmetDimensions: unmet.map(function (d) { return d.label; }),
      sources: dedupeSources(ev)
    };
  }

  function titleFor(a) {
    switch (a.type) {
      case 'compare': return 'Comparison: what the corpus establishes';
      case 'critically-examine': return 'Critical examination: evidence from the corpus';
      case 'examine': return 'Examination: evidence from the corpus';
      case 'evaluate': return 'Evaluation: evidence from the corpus';
      case 'analyse': return 'Analysis: evidence from the corpus';
      case 'discuss': return 'Discussion: evidence from the corpus';
      case 'explain': return 'Explanation: evidence from the corpus';
      case 'why': return 'Causal account: evidence from the corpus';
      case 'how': return 'Mechanism: evidence from the corpus';
      default: return 'Evidence from the corpus';
    }
  }

  function dedupeSources(ev) {
    var m = {}, out = [];
    ev.forEach(function (e) {
      var n = e.node;
      if (m[n.id]) return;
      m[n.id] = 1;
      out.push({ id: n.id, title: n.name, type: n.type, cat: n.cat, url: sourceUrl(n) });
    });
    return out;
  }

  // Node ids look like "constitution|Anti-defection law (India)". map.html:1106
  // parses `#id=<decodeURIComponent(...)>` and matches it against node ids, so
  // encoding the id reproduces the site's own deep-link and lands the reader on
  // the node the sentence came from rather than on a search page.
  function sourceUrl(n) {
    return 'map.html#id=' + encodeURIComponent(n.id);
  }

  return {
    MIN_DESC_WORDS: MIN_DESC_WORDS,
    MIN_COVERAGE: MIN_COVERAGE,
    MIN_EVIDENCE: MIN_EVIDENCE,
    norm: norm,
    tokens: tokens,
    isQuoteable: isQuoteable,
    wordCount: wordCount,
    subjectOf: subjectOf,
    properNounRun: properNounRun,
    routeFor: routeFor,
    conceptRoutes: CONCEPT_ROUTES,
    facetOf: facetOf,
    conceptPhrasesFor: conceptPhrases,
    jurisdictionMarkers: jurisdictionMarkers,
    analyse: analyse,
    buildIndex: buildIndex,
    thinNode: thinNode,
    bm25: bm25,
    expand: expand,
    retrieve: retrieve,
    compose: compose
  };
}));
