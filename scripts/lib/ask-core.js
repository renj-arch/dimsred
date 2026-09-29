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
  var MIN_COVERAGE = 0.34;
  var MIN_EVIDENCE = 3;

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
    'beneficence': ['beneficence', 'non-maleficence', 'nonmaleficence']
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
        phrase.split(' ').forEach(function (w) {
          if (w.length < 4) return;
          weights[w] = Math.max(weights[w] || 0, 0.3);      // low weight, recall only
        });
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

  // isQuoteable is the anti-fragment gate. It is intentionally strict: an
  // evidence sentence that fails it is dropped rather than repaired, because
  // repairing a snippet means inventing the context that made it mean something.
  function isQuoteable(s) {
    if (!s) return false;
    if (wordCount(s) < MIN_DESC_WORDS) return false;
    if (FRAGMENT_RE.test(s)) return false;
    if (/_{3,}/.test(s)) return false;                       // cloze blank left in place
    if (/[|]/.test(s)) return false;                         // table or pipe artifact
    if (!/[.!?]$/.test(s.trim())) return false;              // not a complete sentence
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
    var prepared = nodes.map(function (n, idx) {
      var bag = tokens(n.name + ' ' + (n.aliases || []).join(' ') + ' ' + (n.desc || '') + ' ' + (n.type || '') + ' ' + (n.cat || ''));
      var tf = {};
      bag.forEach(function (t) { tf[t] = (tf[t] || 0) + 1; });
      Object.keys(tf).forEach(function (t) { df[t] = (df[t] || 0) + 1; });
      return { i: idx, node: n, tf: tf, len: bag.length };
    });
    var avg = prepared.reduce(function (a, p) { return a + p.len; }, 0) / (prepared.length || 1);
    return { nodes: prepared, adj: adj, df: df, avg: avg || 1, N: prepared.length };
  }

  // BM25 over the real field set. The only non-standard part is that ontology
  // phrase components enter the query at reduced weight, so a synonym can widen
  // recall without being able to outrank a literal title match.
  function bm25(idx, weights) {
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
      terms.forEach(function (term) {
        if (nameTok[term]) s += (weights[term] >= 1 ? 6 : 2);   // exact token in the title
      });
      terms.forEach(function (phrase) {
        if (nameN === norm(phrase)) s += 8;                     // title is exactly the phrase
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
  var DEMAND_NOUN = /\b(aims?|objectives?|goals?|outcomes?|consequences?|impacts?|effects?|causes?|reasons?|measures?|remedies?|reforms?|institutional changes?|challenges?|problems?|issues?|significance|importance|merits?|demerits?|advantages?|disadvantages?|lessons?|implications?|dimensions?|factors?|instruments?|mechanisms?)\b/i;

  // Returns the noun phrase a question is about. Question words, imperatives
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
    // Demand phrases: "... the aims and outcomes of X", "... the environmental
    // impact of X". Cut back to the head noun on the far side of the last
    // preposition, which is where the named subject sits.
    t = t.replace(/\b(?:'s)?\s*(?:the\s+)?[a-z\s,]{0,60}?\b(?:of|for|in|on|about|regarding|concerning)\s+[^?]*$/i, ' ');
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
    var runs = [], cur = [];
    for (var i = 0; i < words.length; i++) {
      var w = words[i].replace(/[^A-Za-z0-9'’\-]/g, '');
      if (!w) { if (cur.length) { runs.push(cur); cur = []; } continue; }
      if (/^[A-Z]/.test(w)) { cur.push(w); continue; }
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
  // from the run across stopwords and take up to two content words that sit
  // immediately beside it, which is where a head noun lives.
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
    var extra = [];
    for (var j = at - 1; j >= 0 && extra.length < 2; j--) {
      var w = words[j].replace(/[^A-Za-z0-9'’\-]/g, '');
      if (!w) break;
      if (STOP.indexOf(norm(w)) !== -1) continue;   // look straight through "of/the/in"
      if (DEMAND_NOUN.test(w)) break;                          // a demand noun ends the subject
      extra.unshift(w);
    }
    return (extra.join(' ') + ' ' + run).trim();
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
    var hits = bm25(idx, a.weights);
    if (!hits.length) {
      return { analysis: a, candidates: [], evidence: [], coverage: 0, refused: true, reason: 'no term in the question appears anywhere in the index' };
    }
    var top = hits.slice(0, 40);
    var ranked = expand(idx, top, limit * 3);

    // Work out what the question is about before scoring anything. A
    // proper-noun run, widened to include the head noun beside it, is the
    // strongest signal; the loose noun-phrase parse is the fallback for
    // lowercase subjects like "urban flooding" or "federalism".
    var prop = properNounRun(question);
    var subject = (prop ? widenSubject(question, prop) : '') || subjectOf(question);
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
    var subjNormEarly = norm(subject);
    var subjListEarly = Object.keys(tokenSet(subjNormEarly));
    var multiEarly = subjListEarly.length > 1;

    var evidence = [];
    ranked.forEach(function (r) {
      if (r.score < floor) return;
      var p = idx.nodes[r.i];
      if (!p) return;
      if (subjListEarly.length) {
        var nameNorm = norm(p.node.name);
        var onSubject = multiEarly
          ? nameNorm.indexOf(subjNormEarly) !== -1
          : tokenSet(nameNorm)[subjNormEarly] === 1;
        if (!onSubject) return;
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
        if (weight <= 0) return;
        evidence.push({ sentence: s, score: r.score + weight, node: p.node, direct: r.direct });
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
      var multi = subjList.length > 1;
      subjectMatched = ranked.some(function (r) {
        if (r.score < floor) return false;
        var nameNorm = norm(idx.nodes[r.i].node.name);
        if (multi) return nameNorm.indexOf(subjNorm) !== -1;
        return tokenSet(nameNorm)[subjNorm] === 1;
      });
    }

    var dimCov = a.demand.length ? a.demand.filter(function (d) {
      return uniq.some(function (e) { return e.sentence.search(d.re) !== -1; });
    }).length / a.demand.length : 1;

    var coverage = Math.max(0, Math.min(1, 0.70 * termCov + 0.30 * dimCov));

    // The gate. Three independent ways to fail, because any one of them means
    // the answer would be assembled rather than retrieved:
    //   not enough quoteable sentences | the subject is not in any node title
    //   | the question's rare terms are not accounted for.
    var refused = true, reason = '';
    if (uniq.length < MIN_EVIDENCE) {
      reason = 'only ' + uniq.length + ' quoteable sentence(s) in the corpus bear on this question';
    } else if (subjectMatched === false) {
      reason = subjList.length
        ? 'no quotable material in the corpus on "' + subject + '", the subject of this question'
        : 'the subject of the question could not be identified in the corpus';
    } else if (coverage < MIN_COVERAGE) {
      reason = 'evidence accounts for ' + Math.round(coverage * 100) + '% of the question, below the ' + Math.round(MIN_COVERAGE * 100) + '% gate';
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
    analyse: analyse,
    buildIndex: buildIndex,
    bm25: bm25,
    expand: expand,
    retrieve: retrieve,
    compose: compose
  };
}));
