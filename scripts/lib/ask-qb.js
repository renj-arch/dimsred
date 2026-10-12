(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./ask-core.js'));
  else root.VlymbooqAskQb = factory(root.VlymbooqAsk);
}(typeof self !== 'undefined' ? self : this, function (ask) {
  'use strict';
// Question-bank retrieval for the Ask engine.
//
// The timeline index answers "what is X" from node descriptions. It cannot
// answer "how far has Y succeeded", because the evidence for that lives in the
// question bank: 15.36M records whose `fact` fields hold the sentences behind
// each fill-in-the-blank item. Measured on the full bank, India-relevant
// records number 292 on Article 370, 61 on the Sixth Schedule, 37 on Article 371
// and 141 on autonomous districts.
//
// Loading 828 MB of shards into a browser is not viable, so this works the way
// archive.html already does: a tiny manifest is always resident, the question is
// routed to the few categories that can plausibly answer it, and only those
// shards are fetched. Memory and bandwidth both track the routing decision
// rather than the corpus size.
//
// This module never generates text. It returns verbatim sentences, each tagged
// with the entity and category they came from.

var norm = function (s) {
  return String(s || '').toLowerCase().normalize('NFKD').replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
};
function tokens(s) { return norm(s).split(' ').filter(function (w) { return w.length > 1; }); }

// Phrase matching must be on whole tokens, never substrings. `indexOf` on the
// normalised string is what let "city" match inside "electricity" and answer an
// urbanisation question with electricity supply boards, and it is the same
// defect that let "indian" match inside "argentinian". These helpers are the
// only place phrase membership is decided.
//
// A one-token phrase is matched by token identity (or a longer word starting
// with it, so "india" accepts "indian"). A multi-token phrase must appear as a
// contiguous run, because "union territory" occurring as "territory of the
// union" is not the same claim.
function hasPhrase(textTokens, phraseTokens) {
  if (!phraseTokens.length) return false;
  if (phraseTokens.length === 1) return hasStem(textTokens, phraseTokens[0]);
  for (var i = 0; i + phraseTokens.length <= textTokens.length; i++) {
    var ok = true;
    for (var j = 0; j < phraseTokens.length; j++) {
      if (textTokens[i + j] !== phraseTokens[j]) { ok = false; break; }
    }
    if (ok) return true;
  }
  return false;
}

// A token counts as present if the text has it exactly, or has a longer word
// starting with it ("india" matches "indian", "indians"). This is what lets an
// India question accept Indian evidence without accepting "argentinian".
function hasStem(textTokens, stem) {
  for (var i = 0; i < textTokens.length; i++) {
    var w = textTokens[i];
    if (w === stem) return true;
    if (w.length > stem.length && w.indexOf(stem) === 0) return true;
  }
  return false;
}

// Lenient stem match for ROUTING only: accepts a shared prefix of at least four
// characters in either direction, so "environmental" reaches the category
// "Environment & Ecology" and "federalism" reaches "federal". Routing only
// decides which shards to download, so a slightly loose match costs a wasted
// fetch. It is deliberately NOT used for evidence, where a loose match would put
// an unrelated sentence in the answer.
function hasStemLoose(textTokens, stem) {
  if (stem.length < 4) return false;
  for (var i = 0; i < textTokens.length; i++) {
    var w = textTokens[i];
    if (w === stem) return true;
    if (w.length >= 4 && stem.length >= 4) {
      if (w.indexOf(stem) === 0) return true;
      if (stem.indexOf(w) === 0) return true;
    }
  }
  return false;
}

// True when one token run sits inside the other, in either direction. Used to
// compare an entity name against a directory match, since the two routinely
// differ by a qualifier ("five year plans of india" against "five year plans").
function containsRun(a, b) {
  if (!a.length || !b.length) return false;
  var short = a.length <= b.length ? a : b;
  var long = a.length <= b.length ? b : a;
  for (var i = 0; i + short.length <= long.length; i++) {
    var ok = true;
    for (var j = 0; j < short.length; j++) {
      if (long[i + j] !== short[j]) { ok = false; break; }
    }
    if (ok) return true;
  }
  return false;
}

// Acceptable phrasings of a subject that has no entity of its own.
//
// "the Sixth Schedule of the Constitution" is not an entity name in the corpus,
// but its sentences are exactly what answers the question, so the subject has to
// be matched against sentence text. Trailing function words are dropped so the
// phrase does not have to reproduce the question's grammar, and at least two
// content tokens must survive, because a single token matches far too much to be
// evidence of anything.
var SUBJ_FILLER = { of: 1, the: 1, in: 1, and: 1, a: 1, an: 1, to: 1, for: 1 };

function subjectPhrases(subject) {
  var toks = tokens(subject);
  var out = [];
  var seen = {};
  for (var drop = 0; drop < toks.length; drop++) {
    var t = toks.slice(0, toks.length - drop);
    while (t.length && SUBJ_FILLER[t[t.length - 1]]) t.pop();
    while (t.length && t[0] === 'the') t.shift();
    if (t.length < 2) break;
    var p = t.join(' ');
    if (p.length < 8 || seen[p]) continue;
    seen[p] = 1;
    out.push({ raw: p, toks: t });
  }
  return out;
}

// Ordinals look like proper nouns in a question ("the Sixth Schedule of the
// Constitution" capitalises "Sixth") but they identify nothing, and the
// leading-rare-token rule below then admits anything sharing one. That is how a
// question about the Sixth Schedule of the Constitution was answered with Sixth
// Form College, the Sixth Extinction, and Sixth Schedule airlines.
var ORDINAL = {};
('first second third fourth fifth sixth seventh eighth ninth tenth eleventh twelfth ' +
  'thirteenth fourteenth fifteenth sixteenth seventeenth eighteenth nineteenth twentieth ' +
  'twentyfirst twentysecond twentythird thirtieth').split(' ').forEach(function (w) { ORDINAL[w] = 1; });

var STOP = {};
('a an the of and or in on at to for with by from as is was were are be been being has have had this that these those it he she they them his her its their what which who whom whose when where why how not no nor but if then than there here also into over under about after before during between within without more most other some such only own same so too very can will just should now'
).split(' ').forEach(function (w) { STOP[w] = 1; });

// Country demonyms that mark an entity as belonging to another jurisdiction.
// Matched against ENTITY NAMES, where the demonym is what appears, so a question
// about India is not answered by an Argentine or African body that merely shares
// the generic words "national congress".
var FOREIGN = {};
('argentine argentinian african american brazilian brazil chinese china japanese japan ' +
  'russian russia french france german germany italian italy spanish spain portuguese portugal dutch ' +
  'british britain english england scottish scotland irish ireland canadian canada australian australia ' +
  'mexican mexico peruvian peru chilean chile colombian colombia venezuelan venezuela cuban cuba ' +
  'egyptian egypt nigerian nigeria kenyan kenya southafrican ghanaian ghana ethiopian ethiopia ' +
  'turkish turkey iranian iran iraqi iraq israeli israel palestinian saudi emirati qatari ' +
  'indonesian indonesia malaysian malaysia thai thailand vietnamese vietnam filipino philippine philippines ' +
  'singaporean korean korea nepali nepal bhutanese bhutan bangladeshi bangladesh srilankan sinhala ' +
  'pakistani pakistan afghan afghanistan myanmar burmese tibetan tibet ' +
  'polish poland greek greece roman romanian hungarian hungary czech slovak ukrainian ukraine ' +
  'swedish sweden norwegian norway danish denmark finnish finland icelandic iceland swiss switzerland ' +
  'austrian austria belgian belgium persian'
).split(' ').forEach(function (w) { if (w) FOREIGN[w] = 1; });

// A demonym in leading position marks the entity as foreign. Position matters:
// "Argentine National Congress" leads with it, while "List of governors of
// Karnataka" mentions a place late and must not be excluded.
function entityInOtherCountry(entity) {
  var t = tokens(entity);
  for (var i = 0; i < t.length && i < 3; i++) if (FOREIGN[t[i]]) return true;
  return false;
}

// A country mentioned anywhere in the name, checked against the question's own
// jurisdiction.
//
// The leading-position rule above is not enough, because a national congress is
// usually named after a party and not after its country: "20th National Congress
// of the Chinese Communist Party" and "14th National Congress of the Communist
// Party of Vietnam" put the demonym fourth. Those two were the top results for a
// question about the Indian National Congress, so the check has to see the whole
// name. The jurisdiction token is what keeps it from over-firing, since an
// Indian entity almost always names India somewhere ("Federal Court of India").
function assertsForeignCountry(entity, jurisdictionStems) {
  var t = tokens(entity);
  var foreign = false;
  for (var i = 0; i < t.length; i++) {
    if (!FOREIGN[t[i]]) continue;
    if (jurisdictionStems.some(function (j) { return j === t[i]; })) continue;
    foreign = true;
  }
  return foreign;
}

// ── category routing ────────────────────────────────────────────────────────
//
// The manifest carries only names, so routing is a lexical match between the
// question and the category name. Deliberately conservative: a wrong category
// costs a wasted fetch, while a missed one is caught by the fallback fan-out
// below, which widens when the first pass returns too little.

var ROUTE_HINTS = {
  'Indian Polity & Constitution': ['constitution', 'article', 'schedule', 'amendment', 'polity', 'constitutional',
    'fundamental rights', 'directive', 'federal', 'president', 'governor', 'parliament', 'lok sabha', 'rajya sabha',
    'election', 'party', 'coalition', 'governance', 'judiciary', 'supreme court', 'defection', 'anti-defection',
    'disqualification', 'speaker', 'legislature', 'special status', 'federalism', 'centre', 'state', 'panchayati raj',
    '73rd amendment', '72nd amendment', 'basic structure', 'ordinance', 'bill', 'preamble', 'citizenship', 'election commission'],
  'Polity & Governance': ['polity', 'governance', 'federal', 'centre', 'state', 'constitution', 'policy', 'scheme',
    'governor', 'president', 'election', 'party', 'coalition', 'administration', 'defection', 'anti-defection',
    'disqualification', 'speaker', 'legislature', 'federalism', 'panchayati raj', 'special status'],
  'Polity': ['polity', 'constitution', 'federal', 'centre', 'state', 'governor', 'president', 'election',
    'defection', 'anti-defection', 'disqualification', 'speaker', 'legislature', 'federalism', 'article',
    'schedule', 'special status', 'panchayati raj'],
  'Indian Society': ['society', 'social', 'caste', 'tribe', 'tribal', 'community', 'diversity', 'minority', 'caste',
    'gender', 'women', 'child', 'education', 'religion', 'family', 'marriage', 'inequality', 'empowerment',
    'regional', 'culture', 'custom', 'casteism'],
  'History': ['history', 'historical', 'empire', 'dynasty', 'ancient', 'medieval', 'modern', 'independence',
    'freedom struggle', 'national movement', 'gandhi', 'nehru', 'ambedkar', 'bose', 'laxminath', 'tagore',
    'national congress', 'founding', 'founded', 'aims', 'outcomes', 'lahore session', '1885', 'session'],
  'Indian History': ['national congress', 'founding', 'founded', '1885', 'lahore session', 'gandhi', 'nehru',
    'independence', 'freedom struggle', 'national movement', 'aims', 'outcomes'],
  'Ancient India': ['ancient', 'vedic', 'indus', 'maurya', 'gupta', 'harappan', 'sanskrit', 'upanishad', 'vedic',
    'ashoka', 'chandragupta'],
  'World History': ['world history', 'european', 'british', 'french', 'revolution', 'world war', 'colonial',
    'industrial revolution'],
  'Geography': ['geography', 'river', 'mountain', 'climate', 'monsoon', 'plateau', 'soil', 'vegetation', 'region',
    'basin', 'desert', 'island'],
  'World Geography': ['country', 'continent', 'geography', 'river', 'mountain', 'capital', 'border', 'world'],
  'Environment & Ecology': ['environment', 'ecology', 'pollution', 'biodiversity', 'conservation', 'forest',
    'wildlife', 'climate change', 'sustainable', 'ecosystem', 'wetland', 'sanctuary'],
  'Indian Wildlife & National Parks': ['wildlife', 'national park', 'tiger', 'sanctuary', 'species', 'forest',
    'biosphere', 'endangered'],
  'Economy': ['economy', 'economic', 'gdp', 'inflation', 'budget', 'fiscal', 'monetary', 'rbi', 'gst', 'poverty',
    'employment', 'unemployment', 'growth', 'trade', 'banking', 'finance'],
  'Indian Economy': ['economy', 'economic', 'gdp', 'inflation', 'budget', 'rbi', 'gst', 'poverty', 'fiscal'],
  'International Relations': ['international', 'foreign', 'diplomacy', 'un', 'united nations', 'bilateral',
    'treaty', 'summit', 'brics', 'nuclear', 'defence'],
  'Current Affairs': ['current', 'recent', 'latest', 'news', 'today', 'this year'],
  'Meteorology & Climate': ['monsoon', 'meteorology', 'climate', 'rainfall', 'cyclone', 'temperature', 'weather',
    'el nino', 'jet stream', 'storm'],
  'Disaster Management': ['disaster', 'flood', 'drought', 'cyclone', 'earthquake', 'rescue', 'relief', 'ndma'],
  'Science & Technology': ['science', 'technology', 'research', 'innovation', 'satellite', 'space', 'rocket',
    'isro', 'nuclear', 'biotechnology'],
  'Art & Culture': ['art', 'culture', 'painting', 'music', 'dance', 'theatre', 'literature', 'folk', 'museum',
    'architecture', 'heritage', 'classical'],
  'Indian Polity': ['polity', 'constitution', 'federal', 'democracy', 'election', 'governance'],
  'Urbanisation': ['urbanisation', 'urbanization', 'city', 'urban', 'slum', 'migration', 'metropolitan',
    'municipal', 'smart city'],
  'Demographics & Census': ['census', 'demographic', 'population', 'fertility', 'density', 'migration',
    'literacy', 'sex ratio'],
  'Indian Demographics & Census': ['census', 'demographic', 'population', 'fertility', 'density', 'migration',
    'literacy', 'sex ratio'],
  'International Economics': ['trade', 'wto', 'imf', 'world bank', 'balance of payments', 'export', 'import'],
  'Ethics': ['ethics', 'moral', 'values', 'integrity', 'accountability', 'social justice', 'attitude'],
  'Internal Security': ['security', 'naxal', 'insurgency', 'terrorism', 'police', 'army', 'militant', 'border',
    'left wing', 'naxalite']
};

function routeCategories(manifest, question, limit, subject) {
  var cats = (manifest && manifest.categories) || [];
  var q = norm(question);
  var qTok = {};
  tokens(question).forEach(function (t) { if (!STOP[t]) qTok[t] = 1; });

  // The subject is the most precise routing signal available: "Bhopal gas
  // tragedy" names a topic, while the question as a whole is padded with
  // "discuss the environmental impact of" and routes to Environment by accident.
  // Without this, Bhopal answered with irrigation barrages.
  var subj = norm(subject || '');
  var subjTok = {};
  if (subj) tokens(subject).forEach(function (t) { if (!STOP[t]) subjTok[t] = 1; });

  // Category-name matching is on tokens too, for the same reason: `indexOf`
  // would let "polity" match inside an unrelated name and let a hint like
  // "state" match "statement".
  var qToks = tokens(question);
  var subjToks = tokens(subject || '');

  var scored = [];
  cats.forEach(function (c) {
    var name = String(c.name || '');
    var nameToks = tokens(name);
    var score = 0;
    // A single-word category name is a weak signal, because the corpus has a
    // category literally called `Constitution`, `Polity`, `Society` and
    // `History`, and any question on those topics contains the bare word. It
    // then outranks measured concept evidence and answers a question about the
    // Sixth Schedule from the category that holds none of the nineteen
    // sentences mentioning it. A multi-word name is distinctive, so it keeps
    // the full weight.
    var nameWeight = nameToks.length > 1 ? 12 : 4;
    if (hasPhrase(qToks, nameToks)) score += nameWeight;
    if (subjToks.length && hasPhrase(subjToks, nameToks)) score += nameWeight;

    var hints = ROUTE_HINTS[name];
    if (hints) {
      hints.forEach(function (h) {
        var ht = tokens(h);
        if (hasPhrase(qToks, ht)) score += 3;
        if (subjToks.length && hasPhrase(subjToks, ht)) score += 4;
      });
    }
    Object.keys(qTok).forEach(function (t) {
      if (t.length > 3 && hasStemLoose(nameToks, t)) score += 1;
    });
    Object.keys(subjTok).forEach(function (t) {
      if (t.length > 3 && hasStemLoose(nameToks, t)) score += 2;
    });
    if (score > 0) scored.push({ cat: c, score: score });
  });

  scored.sort(function (a, b) { return b.score - a.score; });
  return scored.slice(0, limit || 4);
}

// A subject's entity is often in a category the hints never anticipated:
// "Indian National Congress" is in `Indian States` and `World History`, not in
// any polity category, and "Urbanisation in India" is in `Indian Geography`.
// Rather than keep extending a hand-written hint table and hoping it covers the
// next question, this widens using the subject itself: a category whose name
// shares a token with the subject is a plausible home for it. It runs only when
// the first pass has not produced enough, so it costs nothing on the questions
// that already route well.
function widenRouting(manifest, question, subject, have, need) {
  var cats = (manifest && manifest.categories) || [];
  var subjToks = tokens(subject || '');
  if (subjToks.length < 2) return [];
  var seen = {};
  (have || []).forEach(function (h) { seen[h.cat.name] = 1; });
  var out = [];
  cats.forEach(function (c) {
    if (seen[c.name]) return;
    var nameToks = tokens(c.name);
    // Require two shared content tokens, so a subject of 2-3 words does not
    // sweep in every category that happens to contain a common word.
    var shared = 0;
    subjToks.forEach(function (t) {
      if (STOP[t] || t.length < 4) return;
      if (hasStemLoose(nameToks, t)) shared++;
    });
    if (shared >= 2) out.push({ cat: c, score: shared });
  });
  out.sort(function (a, b) { return b.score - a.score; });
  return out.slice(0, need || 4);
}

// ── entity directory ────────────────────────────────────────────────────────
//
// The category names carry almost no routing signal, and an inverted token index
// over entity names proved worse still: the corpus has 447k distinct entity
// names and a large mass of df=1 proper nouns, so any frequency cap evicted the
// tokens that actually discriminate. `urbanisation` (df 4) and `congress`
// (df 669) are exactly the tokens that route the two questions a name-based
// router kept failing, and a rarity cap drops the first while a frequency cap
// drops the second.
//
// The manifest already records every entity name and the shard it came from, so
// the exact answer is a sorted table. The format is one `name<TAB>cats` line
// per distinct entity, which binary-searches directly and needs no index
// structure at all.
//
// The table is held as one raw string and searched by byte offset. Splitting it
// into an array of 447k JavaScript strings would cost several times the file
// size in memory for no benefit, since the caller only ever probes a handful of
// subjects.

function EntityDir() {
  this.text = null;
  this._starts = null;
}

EntityDir.prototype.load = function (text) {
  // Offsets of every line, as a typed array: 447k entries at 4 bytes is 1.8 MB
  // versus ~14 MB for a JS array of numbers, and it makes the binary search a
  // direct index rather than a string scan.
  var starts = new Int32Array((text.length / 24) | 0 + 16);
  var n = 0;
  for (var i = 0; i < text.length && n < starts.length; i++) {
    if (text.charCodeAt(i) === 10) {
      // A trailing newline ends the last line rather than starting an empty
      // one. Counting it would put a blank entry in the table, which breaks the
      // sort invariant and reads back as a name that sorts after everything.
      if (i + 1 < text.length) starts[n++] = i + 1;
    }
  }
  this.text = text;
  this._starts = starts.subarray(0, n);
  return this;
};

EntityDir.prototype.lineAt = function (i) {
  var s = this._starts[i];
  var e = this.text.indexOf('\n', s);
  if (e === -1) e = this.text.length;
  return this.text.slice(s, e);
};

EntityDir.prototype.lineName = function (i) {
  var line = this.lineAt(i);
  var t = line.indexOf('\t');
  return t === -1 ? line : line.slice(0, t);
};

// Index of the first line whose name is >= `name`.
EntityDir.prototype.lowerBound = function (name) {
  var lo = 0;
  var hi = this._starts.length;
  while (lo < hi) {
    var mid = (lo + hi) >>> 1;
    if (this.lineName(mid) < name) lo = mid + 1;
    else hi = mid;
  }
  return lo;
};

// Categories for an exact entity name.
EntityDir.prototype.lookup = function (name) {
  var n = norm(name);
  if (!n) return null;
  var i = this.lowerBound(n);
  if (i >= this._starts.length) return null;
  var line = this.lineAt(i);
  var t = line.indexOf('\t');
  if (t === -1 || line.slice(0, t) !== n) return null;
  return line.slice(t + 1).split(',').map(Number);
};

// Tokens for matching against entity NAMES. Unlike `tokens` this keeps
// single-character words, because they carry the name: "Special Status (J&K,
// Article 371)" normalises to a name containing "j" and "k", and dropping them
// rebuilt the name as "special status article 371", which matches nothing.
function nameTokens(s) {
  return norm(s).split(' ').filter(function (w) { return w; });
}

// Tokens a subject may leave over when it names an entity only partially. This
// is a ranking preference, not a filter. A subject of "the anti-defection law in
// India" is the entity "anti-defection law (india)" and the leftovers are
// generic, so those matches are preferred. But rejecting every non-generic
// remainder is wrong: it discards "special status j k article 371" for the
// subject "Special Status", which is a real answer. An imperfect match only
// costs one extra shard to fetch, whereas a rejected match silently loses the
// evidence, so over-strict routing is the worse failure.
var QUALIFIER = {
  of: 1, in: 1, the: 1, and: 1, delhi: 1, india: 1, indian: 1, act: 1, law: 1,
  govt: 1, government: 1, republic: 1, national: 1, centre: 1, center: 1,
  j: 1, k: 1, a: 1, i: 1, ii: 1, iii: 1, iv: 1, v: 1
};

function qualifierRemainder(name, prefix) {
  var rest = name.slice(prefix.length).split(' ').filter(function (t) { return t; });
  if (!rest.length) return true;
  for (var i = 0; i < rest.length; i++) {
    var t = rest[i];
    if (QUALIFIER[t]) continue;
    if (/^\d{3,4}$/.test(t)) continue;
    return false;
  }
  return true;
}

// Entities that begin with `prefix`.
//
// The scan collects far more than it returns, because the cap is applied after
// ranking. Capping first would be wrong in a way that looks like a missing
// answer: for the prefix "five year plans", the first four names alphabetically
// are the plans of argentina, syria, bhutan and china, so capping during the
// scan drops "five year plans of india" entirely and there is nothing left to
// rank. The wanted match was there, and the sort never got to see it.
EntityDir.prototype.prefixLookup = function (prefix, limit) {
  var p = norm(prefix);
  if (p.length < 5) return [];
  var want = limit || 6;
  var scan = want * 8;
  var out = [];
  var i = this.lowerBound(p);
  for (; i < this._starts.length && out.length < scan; i++) {
    var name = this.lineName(i);
    // The prefix must end on a word boundary, not merely at a character
    // boundary. Without this, "anti defection law in" matches inside
    // "anti defection law india" and leaves the remainder "dia", which is then
    // read as a non-generic qualifier. That silently demoted the one exact
    // entity for the question and it surfaced only as an empty subject match.
    if (name !== p && name.indexOf(p + ' ') !== 0) break;
    var line = this.lineAt(i);
    var t = line.indexOf('\t');
    out.push({
      name: name,
      cats: line.slice(t + 1).split(',').map(Number),
      generic: qualifierRemainder(name, p)
    });
  }
  // Generic remainders first: "five year plans of india" is a better match for
  // "Five Year Plans" than "five year plans of argentina", which differs only
  // in the remainder.
  out.sort(function (a, b) { return (b.generic ? 1 : 0) - (a.generic ? 1 : 0); });
  return out.slice(0, want);
};

// Turns a subject into candidate categories, most confident first.
//
// A subject is a noun phrase that usually wraps the real entity rather than
// being it: "the anti-defection law in India" wraps "anti-defection law
// (india)", and "Bhopal gas tragedy" wraps "Bhopal disaster". Dropping only
// trailing tokens misses those, because the real name is a window from the
// middle. So every contiguous window is tried, longest first, and the first
// length that matches anything wins. Long matches are inherently more
// trustworthy, which is why the search is ordered by length and not by position.
EntityDir.prototype.candidates = function (subject) {
  var toks = nameTokens(subject);
  if (toks.length < 2) return [];
  var seen = {};

  for (var len = toks.length; len >= 2; len--) {
    var exact = [];
    var prefix = [];
    for (var start = 0; start + len <= toks.length; start++) {
      var cand = toks.slice(start, start + len).join(' ');
      if (cand.length < 5 || seen[cand]) continue;
      seen[cand] = 1;
      var hit = this.lookup(cand);
      if (hit) exact.push({ name: cand, cats: hit, len: len, generic: true, strong: true });
      else {
        var pre = this.prefixLookup(cand, 4);
        for (var i = 0; i < pre.length; i++) {
          if (seen['p:' + pre[i].name]) continue;
          seen['p:' + pre[i].name] = 1;
          prefix.push({
            name: pre[i].name, cats: pre[i].cats, len: len,
            generic: pre[i].generic,
            // A one-word prefix is far weaker evidence than an exact name, and
            // treating it as equivalent is what made "Fazl Ali Commission" lock
            // onto the person "Fazl Ali" and then exclude the States
            // Reorganisation Commission material that actually answers it.
            // A three-token match is specific enough to require.
            strong: len >= 3
          });
        }
      }
    }
    if (exact.length) return exact.concat(prefix);
    if (prefix.length) return prefix;
  }
  return [];
};

// ── scoring within a loaded shard ───────────────────────────────────────────
//
// Shard rows are [entityName, [sentences], [categories]]. Scoring is BM25-free
// on purpose: a shard holds one topic, so a token-overlap score with an IDF
// weighting is both sufficient and far cheaper than building postings lists for
// 5.7M sentences.

function scoreShard(rows, question, opts) {
  opts = opts || {};
  // Phrase membership is decided on tokens, never substrings, so "city" cannot
  // match "electricity" and "indian" cannot match "argentinian".
  var conceptPhrases = (opts.conceptPhrases || []).map(function (p) {
    return { raw: norm(p), toks: tokens(p) };
  }).filter(function (p) { return p.raw.length > 3; });
  var jurisdiction = norm(opts.jurisdiction || '');
  var limit = opts.limit || 12;
  var jurisdictionStems = jurisdiction ? tokens(jurisdiction) : [];

  var qTok = {};
  tokens(question).forEach(function (t) { if (!STOP[t]) qTok[t] = (qTok[t] || 0) + 1; });
  var qList = Object.keys(qTok);

  // Subject tokens are weighted far above question tokens. In a question like
  // "Discuss the environmental impact of the Bhopal gas tragedy", the generic
  // words (discuss, environmental, impact) match thousands of entities, while
  // the subject (bhopal, tragedy) is what identifies the one. Scoring both at
  // the same weight is how "Bhopal" was answered with barrages and irrigation.
  //
  // A token's weight is its length, because in a proper-noun subject the rare
  // token is the long one: `indian` in "Indian National Congress", `bhopal` in
  // "Bhopal gas tragedy". Without this weighting, "national" and "congress"
  // alone let "Argentine National Congress" and "African National Congress"
  // answer a question about the Indian National Congress, because they share
  // two of the three subject tokens.
  var subjTok = {};
  var subjW = {};
  var subj = norm(opts.subject || '');
  if (opts.subject) {
    tokens(opts.subject).forEach(function (t) {
      if (STOP[t] || t.length <= 2) return;
      // Ordinals stay in the subject here. They are the only thing separating
      // "the Sixth Schedule" from "the Seventh Schedule", and dropping them let
      // "Seventh Schedule to the Constitution of India" match the subject
      // exactly on the tokens that were left.
      subjTok[t] = 1;
      subjW[t] = t.length;
    });
  }
  var subjList = Object.keys(subjTok);
  var subjToks = tokens(opts.subject || '');
  // The share of the subject's total weight that must match before an entity is
  // admitted, OR a match on the single most distinctive subject token.
  //
  // Requiring total weight coverage alone is too strict when the subject is a
  // descriptive phrase: "Bhopal gas tragedy" is 16 weight, and the real node is
  // "Bhopal disaster", which matches only "bhopal" (6) and scores 37%, so
  // Bhopal was dropped entirely. But dropping the coverage rule altogether
  // lets "Argentine National Congress" answer for "Indian National Congress"
  // on the strength of "national" and "congress". So the rule is: a long,
  // distinctive token match is enough on its own, and otherwise a share of the
  // total is required.
  // Coverage is deliberately near-total. At 0.5 a single subject token was
  // often enough on its own, because one high-idf token could outweigh the other
  // entirely: "the Sixth Schedule of the Constitution" was answered with the
  // Constitution of Haiti and of Jersey, matching only "constitution". Ordinals
  // are already excluded, so the remaining tokens carry real content and a
  // near-total requirement no longer costs the descriptive cases it was
  // loosened for: "Bhopal gas tragedy" against the entity "Bhopal disaster" is
  // admitted by the distinct-leading-token rule below, not by coverage.
  var SUBJ_COVERAGE_MIN = 0.85;

  // A token may identify an entity on its own only when it is rare, and "rare"
  // cannot be a fixed count. Measured in the 33,633-row Environment shard, a
  // 0.5% bar is 168 entities, which still admits "environment" (91 entities),
  // "pollution" (37) and "tragedy" (2 -- but those two entities are "Armero
  // tragedy" and "Greek tragedy"). No fixed bar separates "Bhopal" from
  // "tragedy", because both are rare in a shard that size. So the weight is the
  // standard BM25 idf term over entity names instead: a token in a handful of
  // names out of thousands carries a large idf, one in hundreds carries none.
  var ENT_IDF_MAX = 12;
  var ENT_IDF_MIN = 3.0;
  // A token at or above this idf may carry a match on its own.
  var ENT_IDF_DISTINCTIVE = 9;

  function entityDf(rows) {
    if (dfCache && dfCache.N === rows.length) return dfCache;
    var df = Object.create(null);
    for (var i = 0; i < rows.length; i++) {
      var seen = {};
      tokens(String(rows[i][0] || '')).forEach(function (t) { seen[t] = 1; });
      Object.keys(seen).forEach(function (t) { df[t] = (df[t] || 0) + 1; });
    }
    dfCache = { df: df, N: rows.length };
    return dfCache;
  }

  function idfOf(t, ctx) {
    var n = ctx.df[t] || 0;
    if (!n) return ENT_IDF_MAX;
    return Math.max(ENT_IDF_MIN, Math.min(ENT_IDF_MAX,
      Math.log(1 + (ctx.N - n + 0.5) / (n + 0.5))));
  }

  function subjectMatch(eToks, entPhrase, ctx) {
    if (entPhrase) return { ok: true, idfW: 1e6, hits: [], distinctive: true };
    var idfW = 0, totalW = 0, hits = [], distinctive = false;
    subjList.forEach(function (t) {
      totalW += subjW[t];
      if (eToks[t]) {
        idfW += subjW[t] * idfOf(t, ctx);
        hits.push(t);
        // An ordinal can never identify anything on its own. "Sixth" is rare in
        // most shards, so treating it as distinctive let Sixth Form College and
        // the Sixth Extinction admit themselves into an answer about the Sixth
        // Schedule of the Constitution.
        if (idfOf(t, ctx) >= ENT_IDF_DISTINCTIVE && !ORDINAL[t]) distinctive = true;
      }
    });
    if (!totalW) return { ok: false, idfW: 0, hits: [], distinctive: false };
    if (idfW / subjIdfTotal(ctx) >= SUBJ_COVERAGE_MIN) {
      return { ok: true, idfW: idfW, hits: hits, distinctive: distinctive };
    }
    if (!distinctive) return { ok: false, idfW: idfW, hits: hits, distinctive: false };

    // A rare token is not always identifying. "tragedy" has a high idf in the
    // Environment shard (2 entities of 33,633) and those two are "Armero
    // tragedy" and "Greek tragedy", neither of which is Bhopal. The difference
    // is POSITION: in a descriptive subject like "Bhopal gas tragedy" the token
    // that identifies the thing is the one the whole phrase modifies, and it
    // comes first. A rare token in leading position identifies; a rare token in
    // trailing position names the category the subject is an example of.
    if (!isLeading(hits[0])) return { ok: false, idfW: idfW, hits: hits, distinctive: false };
    return { ok: true, idfW: idfW, hits: hits, distinctive: true };
  }

  // True when the token is the first content word of the subject. "Bhopal gas
  // tragedy" leads with "bhopal"; "gas tragedy" leads with "gas".
  function isLeading(tok) {
    if (!opts.subject) return true;
    var toks = tokens(opts.subject).filter(function (t) { return !STOP[t] && !ORDINAL[t]; });
    return toks.indexOf(tok) === 0;
  }

  var dfCache = null;
  var subjIdfTotalCache = null;
  function subjIdfTotal(ctx) {
    if (subjIdfTotalCache !== null) return subjIdfTotalCache;
    var t = 0;
    subjList.forEach(function (x) { t += subjW[x] * idfOf(x, ctx); });
    subjIdfTotalCache = t || 1;
    return subjIdfTotalCache;
  }

  var out = [];
  var ctx = entityDf(rows);

  // Concept phrases are counted against this shard before they are trusted.
  //
  // A phrase that names a large number of entities carries no information, and
  // treating it as if it did is what turns a broad question into a wrong answer.
  // "scheduled tribes" appears in hundreds of entities, so any row whose
  // sentences happen to mention it becomes admissible evidence, and a question
  // about how well federalism accommodates regional diversity comes back with
  // the National Commission for Scheduled Tribes. Meanwhile the phrases that
  // actually characterise the concept are specific and rare.
  //
  // The count is over the sentences, not the entity names, because the gate
  // below admits rows on sentence content: the Fazl Ali Commission is the
  // strongest available evidence on state reorganisation, and its name never
  // says "reorganisation".
  var CONCEPT_DF_MAX = Math.max(20, Math.round(rows.length * 0.01));
  var conceptDf = new Array(conceptPhrases.length);
  for (var ci = 0; ci < conceptPhrases.length; ci++) conceptDf[ci] = 0;
  for (var ri = 0; ri < rows.length; ri++) {
    var rSents = rows[ri][1] || [];
    for (var cj = 0; cj < conceptPhrases.length; cj++) {
      // Once a phrase is known to be over the cap, stop counting it: the value
      // cannot come back under it, and skipping keeps this linear.
      if (conceptDf[cj] > CONCEPT_DF_MAX) continue;
      for (var sj = 0; sj < rSents.length; sj++) {
        if (hasPhrase(tokens(rSents[sj]), conceptPhrases[cj].toks)) { conceptDf[cj]++; break; }
      }
    }
  }
  var liveConcepts = conceptPhrases.filter(function (p, i2) {
    return conceptDf[i2] > 0 && conceptDf[i2] <= CONCEPT_DF_MAX;
  });

  // The entity directory can hand the gate an exact name to require, which is
  // strictly better than any token-overlap heuristic: it knows the Indian
  // National Congress is an entity name and that "14th National People's
  // Congress" is a different one, even though the two share the tokens
  // "national" and "congress".
  var entPhraseToks = opts.entityPhrase ? nameTokens(opts.entityPhrase) : null;

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var entity = String(row[0] || '');
    var sents = row[1] || [];
    var cats = row[2] || [];
    var eToks = {};
    tokens(entity).forEach(function (t) { eToks[t] = 1; });
    var eNameToks = nameTokens(entity);

    var m;
    var eSubjHits;

    var m;
    var eSubjHits;
    var entPhrase = false;
    var bySubjectText = false;
    var byConceptText = false;

    // The entity gate, evaluated first and unchanged: an entity matching the
    // required name, or clearing the idf coverage test, is in.
    if (entPhraseToks && entPhraseToks.length) {
      // When the directory has already identified the entity, this is a hard
      // requirement with no fuzzy fallback. Falling back to token overlap is
      // what let "14th National People's Congress" and "National Congress
      // (Sri Lanka)" answer a question about the Indian National Congress:
      // both satisfy the idf test on "national" and "congress" while neither
      // contains the name the directory resolved. The directory was built from
      // the corpus, so it is better informed than any threshold set here.
      if (!containsRun(eNameToks, entPhraseToks)) continue;
      entPhrase = true;
      // These are the tokens of the matched ENTITY, not of the subject, so they
      // are not all keys of subjW. Stopwords are dropped here because the
      // sentence scorer has no weight for them, and leaving them in made
      // `subjW[t] * 1.5` evaluate to NaN, which silently deleted the best
      // evidence: every sentence of the entity "Article 370 of the Constitution
      // of India" scored NaN and was thrown away, leaving a question about
      // Article 370 with almost nothing to answer with.
      m = { ok: true, idfW: 1e6, hits: entPhraseToks.filter(function (t) { return !STOP[t]; }), distinctive: true };
    } else {
      if (subjToks.length && hasPhrase(eNameToks, subjToks)) entPhrase = true;
      if (!entPhrase) {
        liveConcepts.forEach(function (p) { if (hasPhrase(eNameToks, p.toks)) entPhrase = true; });
      }
      m = subjectMatch(eToks, entPhrase, ctx);
    }
    var byEntityGate = !!(m && m.ok);
    eSubjHits = byEntityGate ? m.hits : [];

    // Sentence-text admission, ADDED to the entity gate rather than replacing
    // it. Two kinds of question have no entity to look up and both need this: a
    // conceptual one ("how far has Indian federalism succeeded") is not about
    // any one article, and a subject absent from the corpus ("the Sixth
    // Schedule of the Constitution") exists only as sentence text inside other
    // entities. It is additive because the entity gate still recognises cases
    // the sentence search cannot: "Bhopal gas tragedy" is not a corpus entity,
    // but "Bhopal disaster" is, and only the entity gate finds it.
    //
    // Only `fit` phrases admit. A `strain` phrase describes the cost side of a
    // concept, and admitting on it is what pulled the Red Scare and unrelated
    // people into an answer about the Sixth Schedule via the words "demand"
    // and "dispute".
    var hasSubjectText = !!(opts.subjectPhrases && opts.subjectPhrases.length);
    var hasConceptText = !!opts.conceptTier;
    if ((hasSubjectText || hasConceptText) && !byEntityGate) {
      for (var z = 0; z < sents.length && !bySubjectText && !byConceptText; z++) {
        var zToks = tokens(sents[z]);
        if (hasSubjectText) {
          for (var sp = 0; sp < opts.subjectPhrases.length; sp++) {
            if (hasPhrase(zToks, opts.subjectPhrases[sp].toks)) { bySubjectText = true; break; }
          }
        }
        if (!bySubjectText && hasConceptText) {
          for (var c2 = 0; c2 < liveConcepts.length; c2++) {
            if (hasPhrase(zToks, liveConcepts[c2].toks)) { byConceptText = true; break; }
          }
        }
      }
    }
    if (!byEntityGate && !bySubjectText && !byConceptText) continue;
    // Admission has to be real, not merely possible. The idf coverage test
    // accepts an entity that matches a majority of the subject's token weight,
    // and on an abstract policy subject that is close to matching anything: a
    // question about "the relationship between biodiversity conservation and
    // development" was answered with Google and Wikipedia, a question about
    // misinformation with a 1462 treaty, and one about infrastructure
    // investment with a United States act. Those read as answers, which is worse
    // than refusing, because an aspirant cannot tell a confident miss from a
    // finding.
    //
    // So a row is only admitted when something actually ties it to the subject:
    // a resolved entity name, the subject phrase in the row's own text, a concept
    // phrase, or a single rare token in the position that identifies the thing
    // being asked about. Weight coverage alone is no longer sufficient.
    var admitted = bySubjectText || byConceptText || entPhrase ||
      (byEntityGate && m && m.distinctive);
    if (!admitted) continue;

    // An entity whose own name asserts a different country cannot answer a
    // question about India. This is what removes "Argentine National Congress"
    // and "14th National Congress of the Communist Party of Vietnam" from an
    // Indian National Congress question, where the idf test alone lets them
    // through on the shared tokens "national" and "congress".
    if (jurisdictionStems.length && assertsForeignCountry(entity, jurisdictionStems)) continue;

    for (var j = 0; j < sents.length; j++) {
      var s = sents[j];
      var sToks = tokens(s);
      var sSet = {};
      sToks.forEach(function (t) { sSet[t] = 1; });
      var sScore = 0;

      // The subject carried by the entity, at high weight.
      sScore += (m.idfW > 1e5 ? 8 : m.idfW * 0.6) + (entPhrase ? 8 : 0);
      eSubjHits.forEach(function (t) {
        if (hasStem(sToks, t)) sScore += (subjW[t] || t.length) * 1.5;
      });

      // Question tokens contribute, but weakly, and only on top of a subject
      // match so they cannot admit an off-topic sentence.
      var qHits = 0;
      qList.forEach(function (t) { if (hasStem(sToks, t)) qHits++; });
      sScore += qHits * 0.8;

      // A concept phrase in the sentence is what admits it in the concept tier.
      // Counting distinct phrases rather than stopping at the first is what
      // separates a sentence that genuinely discusses the arrangement of states
      // from one that happens to name an autonomous district in passing.
      var conceptHit = null;
      var conceptHits = 0;
      for (var c = 0; c < liveConcepts.length; c++) {
        if (hasPhrase(sToks, liveConcepts[c].toks)) {
          conceptHits++;
          if (!conceptHit) conceptHit = liveConcepts[c].raw;
        }
      }
      if (conceptHits) sScore += 2 + conceptHits * 2;

      // A sentence that names the subject outright is the strongest possible
      // evidence, and it is the only signal available in the subject tier.
      if (bySubjectText) sScore += 10;
      if (byConceptText) sScore += 4;

      // A row admitted only by the fuzzy entity gate, with no sentence actually
      // naming the subject or the concept, is the weakest evidence available.
      // It is kept rather than dropped, because the idf gate is what finds "Bhopal
      // disaster" for the subject "Bhopal gas tragedy", but it is halved so it
      // cannot outrank a sentence that states the arrangement being asked about.
      if (!byEntityGate) sScore *= 1.6;
      else if (!entPhrase) sScore *= 0.8;
      // Jurisdiction agreement for the sentence. An entity whose NAME contradicts
      // the question's jurisdiction was already dropped at the gate above, so at
      // this point a sentence simply earns a bonus for naming the jurisdiction
      // and a small penalty for not naming it.
      if (jurisdictionStems.length) {
        var same = jurisdictionStems.some(function (t) { return hasStem(sToks, t); });
        if (same) sScore += 2.5;
        else sScore -= 2.5;
      }
      if (!(sScore > 3)) continue;
      // The 4th shard element is parallel provenance, indexed by sentence. It is
      // looked up by position, not by matching text, so it cannot be misaligned
      // by a duplicate sentence; when a shard predates it, `meta` is undefined
      // and the sentence stays uncited rather than gaining a guessed source.
      var prov = (row[3] || [])[j];
      out.push({ sentence: s, entity: entity, cats: cats, score: sScore,
        concept: conceptHit,
        source: prov && prov.source, pubDate: prov && prov.pubDate });
    }
  }

  out.sort(function (a, b) { return b.score - a.score; });

  // One entity must not monopolise the answer, and the same sentence must not
  // appear twice because it is stored under several entities.
  var perEntity = {};
  var seen = {};
  var picked = [];
  var MAX_PER_ENTITY = opts.maxPerEntity || 2;
  for (var k = 0; k < out.length && picked.length < limit; k++) {
    var e = out[k];
    var key = e.sentence.slice(0, 160);
    if (seen[key]) continue;
    var n = perEntity[e.entity] || 0;
    if (n >= MAX_PER_ENTITY) continue;
    seen[key] = 1;
    perEntity[e.entity] = n + 1;
    picked.push(e);
  }
  return picked;
}

return {
  norm: norm,
  tokens: tokens,
  hasPhrase: hasPhrase,
  hasStem: hasStem,
  hasStemLoose: hasStemLoose,
  routeCategories: routeCategories,
  widenRouting: widenRouting,
  subjectPhrases: subjectPhrases,
  EntityDir: EntityDir,
  scoreShard: scoreShard,
  ROUTE_HINTS: ROUTE_HINTS
};
}));