/* Exam-scope ground check for quiz/archive items.
 *
 * The old relevance tag matched broad subject words ("science", "history")
 * and therefore stamped every Wikipedia biography filed under Science &
 * Technology as "High relevance". This module decides scope from evidence
 * instead:
 *
 *   1. An explicit `examScope` or `relevance` field always wins.
 *   2. A specific syllabus/PYQ anchor must appear in the sub-topic or the
 *      question text. Broad subject words are deliberately NOT anchors.
 *   3. A biography/foreign-legal/wiki-fact-dump item with no anchor is out.
 *   4. A non-person concept under a syllabus subject falls back to the
 *      subject whitelist (exam, medium).
 *   5. Anything else is "review", not silently labelled high.
 *
 * Grounding sources (checked by scripts/lib/exam-scope.test.js):
 *   data/upsc-topics.json    -> the `upsc:` anchor sources
 *   data/pyq-patterns.json   -> the `pyq:` anchor sources
 *   papers-data/*.json       -> real paper calibration in the test suite
 *
 * This is a site taxonomy check, not a claim about an official syllabus.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ExamScope = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSION = 1;
  var EXAM = 'exam';
  var OUT = 'out';
  var REVIEW = 'review';

  // Keep this list in sync with data/upsc-topics.json. The test suite fails
  // if a key is missing; it exists so the browser bundle needs no fetch.
  var SYLLABUS_SUBJECTS = [
    'Indian Polity & Constitution', 'Constitution', 'Polity',
    'Polity & Governance', 'Indian History', 'Ancient India',
    'Medieval & Modern India', 'Indian Economy', 'Indian Economy & Development',
    'Business & Economy', 'Geography', 'Indian Geography',
    'Indian Physical Geography', 'World & Indian Physical Geography',
    'Environment & Ecology', 'General Science', 'Science & Technology',
    'Tech & Science', 'Space & Astronomy', 'ISRO & Space',
    'India & International Relations', 'International Relations', 'Ethics',
    'Ethics & Integrity', 'Society', 'Defence & Security',
    'Defence & Strategic Affairs', 'Defence', 'Govt Schemes', 'PIB Releases',
    'RBI Press Releases', 'Commissions Committees & Bodies',
    'Public Administration & Governance', 'Indian Judiciary',
    'Elections & Political Parties', 'Indian Tribes', 'Indian Religions',
    'Buddhism & Jainism', 'Hinduism & Mythology', 'Sikhism & Other Faiths',
    'Indian Art & Architecture', 'Art & Culture',
    'Indian Music Dance & Theatre', 'Indian Theatre & Cinema',
    'Energy & Power', 'Nuclear Energy & Technology', 'ICT Digital & Cyber',
    'Disaster Management', 'Education in India', 'Current Affairs',
    'Indian Languages - National & Regional', 'Awards & Honours',
    'Books & Authors', 'Important Days', 'Sports'
  ];

  // Each anchor is specific. Never add a bare subject word here: the bug this
  // module fixes was exactly that a broad subject made every item "high".
  var ANCHORS = [
    { id: 'polity', sources: ['upsc:Polity', 'upsc:Indian Polity & Constitution', 'pyq:Polity'], tier: 'high', terms: [
      'constitution', 'constitutional', 'fundamental right', 'fundamental duty',
      'directive principle', 'parliament', 'parliamentary', 'legislature',
      'legislative assembly', 'judiciary', 'judicial review', 'supreme court',
      'high court', 'president of india', 'vice president of india',
      'prime minister of india', 'council of ministers', 'cabinet',
      'election commission', 'amendment', 'federalism', 'panchayat',
      'rajya sabha', 'lok sabha', 'article 21', 'article 32', 'article 356',
      'writ', 'habeas corpus', 'mandamus', 'certiorari', 'citizenship',
      'panchayati raj',
      'preamble', 'secular', 'indian national congress', 'constituent assembly',
      'bicameral', 'anti-defection', 'money bill', 'ordinance'
    ] },
    { id: 'economy', sources: ['upsc:Indian Economy', 'upsc:Business & Economy', 'pyq:Economy'], tier: 'high', terms: [
      'indian economy', 'economic', 'budget', 'fiscal', 'monetary', 'rbi',
      'reserve bank', 'banking', 'inflation', 'gdp', 'gross domestic product',
      'taxation', 'gst', 'poverty', 'unemployment', 'agriculture', 'msme',
      'industry', 'trade', 'wto', 'imf', 'world bank', 'npa', 'repo rate',
      'monetary policy', 'financial inclusion', 'disinvestment',
      'public sector', 'subsidy', 'msp', 'minimum support price',
      'balance of payments', 'foreign exchange', 'rupee', 'sebi', 'insurance',
      'pension', 'startup', 'national income', 'per capita income',
      'dependency ratio', 'demographic dividend', 'loan', 'collateral',
      'credit', 'fintech', 'laffer curve', 'bank rate', 'crr', 'slr',
      'priority sector', 'bank', 'bank account', 'financial assistance'
    ] },
    { id: 'agriculture', sources: ['upsc:Indian Economy', 'pyq:Economy'], tier: 'medium', terms: [
      'agriculture', 'agricultural', 'crop', 'irrigation', 'fertilizer',
      'fertiliser', 'pesticide', 'horticulture', 'livestock', 'fisheries',
      'food processing', 'kharif', 'rabi', 'zaid', 'soil health',
      'organic farming', 'green revolution', 'food security', 'public distribution system',
      'pds', 'buffer stock', 'milk', 'dairy', 'poultry'
    ] },
    { id: 'environment', sources: ['upsc:Environment & Ecology', 'pyq:Environment'], tier: 'high', terms: [
      'environmental', 'ecology', 'ecological', 'climate change', 'global warming',
      'biodiversity', 'pollution', 'conservation', 'forest', 'wildlife',
      'renewable', 'solar', 'wind energy', 'carbon', 'emission', 'cop26',
      'cop27', 'cop28', 'cop29', 'cop30', 'wetland', 'mangrove',
      'tiger reserve', 'biosphere reserve', 'national park', 'ramsar', 'ozone',
      'greenhouse', 'sustainability', 'e-waste', 'plastic', 'air quality',
      'yamuna', 'ganga', 'polluter pays', 'environment impact assessment'
    ] },
    { id: 'history', sources: ['upsc:Indian History', 'upsc:Medieval & Modern India', 'pyq:History'], tier: 'high', terms: [
      'ancient india', 'medieval india', 'modern india', 'freedom struggle',
      'national movement', 'indian independence', 'independence movement',
      'dynasty', 'empire', 'civilization', 'harappan', 'indus valley', 'vedic',
      'maurya', 'gupta', 'mughal', 'british rule', 'british india',
      'east india company', 'revolt of 1857', 'sepoy mutiny', 'gandhi',
      'mahatma gandhi', 'nehru', 'ambedkar', 'subhas chandra bose', 'bhagat singh',
      'tilak', 'partition of india', 'salt march', 'dandi', 'quit india',
      'non-cooperation', 'civil disobedience', 'swadeshi', 'zamindari',
      'permanent settlement', 'ryotwari', 'plassey', 'panipat', 'ashoka',
      'akbar', 'shivaji', 'maratha', 'vijayanagara', 'chola', 'pallava',
      'chalukya', 'kushan', 'satavahana', 'gandhara', 'ajanta', 'ellora',
      'konark', 'khajuraho', 'churchill', 'mountbatten', 'dalhousie', 'curzon',
      'warren hastings', 'cornwallis', 'queen victoria', 'navigation acts',
      'colonial'
    ] },
    { id: 'geography', sources: ['upsc:Geography', 'upsc:Indian Geography', 'pyq:Geography'], tier: 'high', terms: [
      'geographical', 'himalaya', 'himalayas', 'ganges', 'ganga', 'brahmaputra',
      'indus', 'godavari', 'krishna river', 'kaveri', 'narmada', 'tapi',
      'monsoon', 'southwest monsoon', 'northeast monsoon', 'el nino',
      'la nina', 'cyclone', 'earthquake', 'volcano', 'tsunami', 'plateau',
      'deccan', 'thar', 'western ghats', 'eastern ghats', 'coastal plain',
      'island', 'andaman', 'nicobar', 'lakshadweep', 'latitude', 'longitude',
      'tropic of cancer', 'standard meridian', 'soil', 'alluvial', 'black soil',
      'laterite', 'mineral', 'coal', 'iron ore', 'bauxite', 'manganese',
      'mica', 'petroleum', 'natural gas', 'ocean current', 'salinity', 'tide',
      'coral reef', 'glacier', 'rainfall', 'drainage', 'watershed', 'river',
      'tributary', 'delta', 'basin', 'flood', 'flooding', 'snowfall', 'desert',
      'capital of'
    ] },
    { id: 'science', sources: ['upsc:Science & Technology', 'upsc:General Science', 'pyq:Science & Technology'], tier: 'medium', terms: [
      'physics', 'chemistry', 'biology', 'botany', 'zoology', 'isro',
      'space research', 'satellite', 'chandrayaan', 'mangalyaan', 'aditya-l1',
      'gaganyaan', 'gslv', 'pslv', 'launch vehicle', 'nuclear', 'atomic',
      'biotechnology', 'genetic', 'dna', 'rna', 'vaccine', 'antibiotic',
      'artificial intelligence', 'machine learning', 'semiconductor',
      'quantum', 'nanotechnology', 'laser', 'supercomputer', 'newton',
      'einstein', 'darwin', 'periodic table', 'photosynthesis', 'respiration',
      'cell', 'tissue', 'organ', 'blood', 'hormone', 'enzyme', 'virus',
      'bacteria', 'fungus', 'protein', 'vitamin', 'electricity', 'magnetism',
      'light', 'sound', 'heat', 'energy', 'motion', 'gravity', 'relativity',
      'radioactivity', 'x-ray', 'radar', 'sonar', 'transistor', 'circuit',
      'computer', 'internet', 'cyber', 'digital', 'algorithm', 'telescope',
      'meteorology', 'weather', 'humidity', 'temperature', 'space',
      'astronaut', 'cosmonaut', 'rocket'
    ] },
    { id: 'current-affairs', sources: ['upsc:Current Affairs', 'pyq:Current Affairs', 'pyq:Static GK'], tier: 'high', terms: [
      'government scheme', 'scheme launched', 'yojana', 'pib',
      'press release', 'summit', 'brics', 'g20', 'quad', 'united nations',
      'un security council', 'unsc', 'sco', 'asean', 'saarc',
      'world health organization', 'economic survey', 'global innovation index',
      'gii', 'human development index', 'hdi', 'ease of doing business',
      'niti aayog', 'startup india', 'digital india', 'make in india',
      'skill india', 'ayushman bharat', 'jan dhan', 'mudra', 'swachh bharat',
      'beti bachao', 'appointment', 'appointed', 'election', 'ranking',
      'government of india', 'spacex', 'elon musk', 'facebook', 'google',
      'microsoft', 'apple', 'amazon', 'meta', 'twitter'
    ] },
    { id: 'defence', sources: ['upsc:Defence & Security', 'upsc:Defence'], tier: 'medium', terms: [
      'defence', 'defense', 'army', 'navy', 'air force', 'missile', 'agni',
      'prithvi', 'brahmos', 'drdo', 'tejas', 'rafale', 'ins vikrant',
      'aircraft carrier', 'submarine', 'line of control', 'loc', 'terrorism',
      'insurgency', 'cyber security', 'nuclear doctrine', 'no first use',
      'strategic'
    ] },
    { id: 'society', sources: ['upsc:Society', 'pyq:Indian Society'], tier: 'medium', terms: [
      'society', 'social', 'culture', 'cultural', 'heritage', 'architecture',
      'religion', 'tribe', 'tribal', 'language', 'literature', 'festival',
      'census', 'population', 'women', 'child', 'labour', 'labor', 'migration',
      'globalisation', 'globalization', 'urbanisation', 'urbanization', 'caste',
      'reservation', 'gender'
    ] },
    { id: 'ethics', sources: ['upsc:Ethics', 'upsc:Ethics & Integrity'], tier: 'medium', terms: [
      'ethics', 'ethical', 'integrity', 'aptitude', 'governance', 'transparency',
      'accountability', 'right to information', 'rti', 'lokpal', 'lokayukta',
      'civil services', 'probity', 'conflict of interest', 'code of conduct',
      'corruption'
    ] },
    { id: 'international-relations', sources: ['upsc:International Relations', 'upsc:India & International Relations', 'pyq:International Relations'], tier: 'high', terms: [
      'international relations', 'foreign policy', 'diplomacy', 'diplomatic',
      'treaty', 'peacekeeping', 'sanction', 'tariff', 'trade war',
      'border dispute', 'indo-pacific', 'european union', 'africa',
      'international organization',
      'china', 'pakistan', 'bangladesh', 'sri lanka', 'nepal', 'bhutan',
      'myanmar', 'afghanistan', 'iran', 'russia', 'ukraine', 'united states'
    ] },
    { id: 'disaster', sources: ['upsc:Disaster Management'], tier: 'medium', terms: [
      'disaster', 'flood', 'drought', 'cyclone', 'earthquake', 'tsunami',
      'landslide', 'heatwave', 'cold wave', 'ndma', 'ndrf',
      'disaster management', 'relief', 'resilience', 'sendai framework'
    ] },
    { id: 'education', sources: ['upsc:Education in India'], tier: 'medium', terms: [
      'education', 'school', 'university', 'ugc', 'ncert', 'right to education',
      'rte', 'literacy', 'higher education', 'national education policy',
      'nep', 'iit', 'iim', 'aishe'
    ] },
    { id: 'books', sources: ['upsc:Books & Authors'], tier: 'medium', terms: [
      'book', 'author', 'novel', 'poet', 'writer', 'literature'
    ] },
    { id: 'awards', sources: ['upsc:Awards & Honours'], tier: 'medium', terms: [
      'award', 'honour', 'honor', 'prize', 'bharat ratna', 'padma', 'nobel'
    ] },
    { id: 'art-culture', sources: ['upsc:Art & Culture', 'pyq:Art & Culture'], tier: 'medium', terms: [
      'art and culture', 'art & culture', 'painting', 'sculpture', 'dance',
      'music', 'theatre', 'theater', 'architecture', 'monument', 'temple',
      'stupa', 'cave', 'classical', 'folk', 'handicraft', 'textile'
    ] }
  ];

  // Specific negatives. Broad words such as "bacteria" or "fish" are not
  // here: they are legitimate general-science questions.
  var NEGATIVES = [
    { code: 'entertainment', re: /\b(film|movie|cinema|song|album|singer|actor|actress|television|soap opera|video game|comic book|fictional character|web series|bollywood|hollywood|academy award)\b/i },
    { code: 'sport', re: /\b(cricket|football|hockey|olympic|tournament|league|world cup|ipl|test match|odi|t20|athlete|medal)\b/i },
    { code: 'obscure-event', re: /\b(air show|mid-air collision|train collision|bus accident|beauty pageant|booker prize|oscar|grammy|miss world)\b/i },
    { code: 'obscure-taxonomy', re: /\b(genus|moth|butterfly|beetle)\b/i },
    { code: 'foreign-legal', re: /\b(new york bar|bar examination|united states district|u\.s\. district|american lawyer|supreme court of the united states|us supreme court)\b/i }
  ];

  var FOREIGN_RE = /\b(united states|american|new york|british|english|french|german|russian|australian|canadian|italian|spanish|dutch|portuguese)\b/i;
  var INDIA_RE = /\b(india|indian|bharat|delhi|mumbai|kolkata|chennai|bengal|punjab|gujarat|rajasthan|kerala|tamil nadu|uttar pradesh|madhya pradesh|bihar|odisha|assam)\b/i;
  var WIKI_RE = /\bwiki(pedia)?\b/i;

  var _anchorRes = null;
  function anchorRes() {
    if (_anchorRes) return _anchorRes;
    _anchorRes = ANCHORS.map(function (a) {
      return {
        anchor: a,
        re: new RegExp('(^|[^a-z0-9])(' + a.terms.map(escapeRe).join('|') + ')s?($|[^a-z0-9])', 'i')
      };
    });
    return _anchorRes;
  }

  function escapeRe(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function textOf(v) { return v == null ? '' : String(v); }

  function pick(obj, keys) {
    for (var i = 0; i < keys.length; i++) {
      if (obj && obj[keys[i]] != null && obj[keys[i]] !== '') return obj[keys[i]];
    }
    return '';
  }

  function normalize(q) {
    q = q || {};
    return {
      question: textOf(pick(q, ['q', 'question'])),
      answer: textOf(pick(q, ['a', 'answer'])),
      fact: textOf(pick(q, ['fact', 'solution', 'explanation'])),
      subject: textOf(pick(q, ['subject', 'category'])),
      subTopic: textOf(pick(q, ['subTopic', 'subSubject', 'subsubject'])),
      type: textOf(q.type),
      source: textOf(q.source),
      examScope: textOf(q.examScope).toLowerCase(),
      relevance: textOf(q.relevance).toLowerCase()
    };
  }

  function validScope(s) {
    if (s === 'in' || s === 'in-exam' || s === 'exam' || s === 'exam-specific' || s === 'specific') return EXAM;
    if (s === 'out' || s === 'out-of-exam' || s === 'outside' || s === 'not-exam') return OUT;
    if (s === 'review' || s === 'uncertain' || s === 'unknown') return REVIEW;
    return '';
  }

  function isSyllabusSubject(subject) {
    var s = textOf(subject).trim();
    if (!s) return false;
    for (var i = 0; i < SYLLABUS_SUBJECTS.length; i++) {
      if (SYLLABUS_SUBJECTS[i].toLowerCase() === s.toLowerCase()) return true;
    }
    return false;
  }

  // "Addison Brown", "Adolf Engler", "Firat Arslan". Parentheticals such as
  // "(cricketer)" are ignored. Single-word names are not treated as persons;
  // they are too ambiguous (Achilles, Ashoka, ...).
  function looksLikePerson(s) {
    var core = textOf(s).replace(/\([^)]*\)/g, ' ').trim();
    if (!core || core.length > 60) return false;
    var parts = core.split(/\s+/);
    if (parts.length < 2 || parts.length > 5) return false;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (/^(de|van|von|al|bin|ibn|da|di|le|la)$/i.test(p)) continue;
      if (/^[A-Z][a-z'’.-]*$/.test(p)) continue;
      if (/^[A-Z]\.$/.test(p)) continue;
      return false;
    }
    return true;
  }

  function isCapitalizedEntity(s) {
    var t = textOf(s).trim();
    if (!t) return false;
    return /^[A-Z0-9]/.test(t) && /\b[A-Z][a-z]/.test(t);
  }

  function hasNegative(text) {
    var hits = [];
    for (var i = 0; i < NEGATIVES.length; i++) {
      var m = NEGATIVES[i].re.exec(text);
      if (m) hits.push({ code: NEGATIVES[i].code, match: m[0] });
    }
    return hits;
  }

  function matchesAnchor(text) {
    var res = anchorRes();
    for (var i = 0; i < res.length; i++) {
      var m = res[i].re.exec(text);
      if (m) {
        var term = m[2] || m[0];
        return { anchor: res[i].anchor, term: term };
      }
    }
    return null;
  }

  function classify(input) {
    var q = normalize(input);
    var reasons = [];
    var evidence = [];

    // 1. Explicit metadata wins. `importance` is intentionally NOT treated as
    // scope: the old importance scorer gives every `qa` item medium, which is
    // how fact dumps stayed "relevant".
    var explicitScope = validScope(q.examScope);
    if (explicitScope) {
      reasons.push('explicit:examScope=' + q.examScope);
      return verdict(explicitScope, explicitScope === EXAM ? 'high' : (explicitScope === REVIEW ? 'medium' : 'low'), reasons, evidence);
    }
    if (q.relevance === 'high' || q.relevance === 'medium' || q.relevance === 'low') {
      reasons.push('explicit:relevance=' + q.relevance);
      if (q.relevance === 'low') return verdict(OUT, 'low', reasons, evidence);
      return verdict(EXAM, q.relevance, reasons, evidence);
    }

    // Subjects the Static GK generators emit that are not part of the UPSC GS
    // syllabus. Kept out explicitly even though they appear in the topic
    // taxonomy; a broad subject whitelist must not resurrect them.
    var EXCLUDED_SUBJECTS = {
      "Sports": 1, "Books & Authors": 1, "Awards & Honours": 1,
      "Important Days": 1, "State GK": 1, "Indian Festivals & Fairs": 1,
      "Indian Festivals & Traditions": 1, "Kannada Literature": 1,
      "Malayalam Literature": 1, "Telugu Literature": 1,
      "Punjabi & Other Regional Literature": 1
    };

    var topicText = (q.subTopic + ' ' + q.question + ' ' + q.fact).trim();
    var negatives = hasNegative(topicText);
    var anchor = matchesAnchor(topicText);

    if (q.subject) evidence.push('subject:' + q.subject);
    if (q.subTopic) evidence.push('subTopic:' + q.subTopic);
    if (q.type) evidence.push('type:' + q.type);
    if (q.source) evidence.push('source:' + q.source);

    // A wiki fact dump is not a question, even when its subject is syllabus.
    if (WIKI_RE.test(q.source) && (/^key facts\b/i.test(q.question) || (q.fact && q.fact === q.question))) {
      reasons.push('wiki-fact-dump');
      return verdict(OUT, 'low', reasons, evidence);
    }

    // Biography / named-person items are judged before generic anchors so a
    // biographical detail (school, university, birth date) is not rescued by a
    // plain word like "school" or "University".
    if (looksLikePerson(q.subTopic)) {
      reasons.push('named-person="' + q.subTopic + '"');
      var bioCloze = q.type === 'fill_blank' && (/^(he|she|they|there he|there she)\b/i.test(q.question) ||
        /\b(born|died|married|bar examination|graduated|son of|daughter of)\b/i.test(q.question));
      if (bioCloze) reasons.push('biography-cloze');
      var foreign = FOREIGN_RE.test(topicText) && !INDIA_RE.test(topicText);
      if (foreign) reasons.push('foreign-context');
      // A biographical cloze about a person is never a syllabus question: out
      // when the context is foreign, otherwise at most review.
      if (bioCloze) return verdict(foreign ? OUT : REVIEW, foreign ? 'low' : 'medium', reasons, evidence);
      // A named person with no exam anchor is not exam content.
      if (!anchor) return verdict(OUT, 'low', reasons, evidence);
      // Otherwise fall through: an anchored question about a person (e.g. "Who
      // was the first President of India?") is decided by its anchor.
    }

    // 2. Specific evidence beats a negative. "He was the first President of
    // India" is a biography cloze but still exam-specific when anchored.
    if (anchor) {
      var anchorReason = 'anchor:' + anchor.anchor.id + '="' + anchor.term + '"';
      reasons.push(anchorReason);
      var tier = anchor.anchor.tier || 'medium';
      var foreign = FOREIGN_RE.test(topicText) && !INDIA_RE.test(topicText);
      if (foreign && (anchor.anchor.id === 'polity' || anchor.anchor.id === 'economy' || anchor.anchor.id === 'society')) {
        reasons.push('foreign-context');
        return verdict(REVIEW, 'medium', reasons, evidence);
      }
      if (negatives.length) {
        for (var n = 0; n < negatives.length; n++) reasons.push(negatives[n].code + '="' + negatives[n].match + '"');
        // An explicit exam anchor plus a generic negative (e.g. "film" in a
        // culture question) is review, not out.
        return verdict(REVIEW, 'medium', reasons, evidence);
      }
      return verdict(EXAM, tier, reasons, evidence);
    }

    // 3. No anchor: explicit off-syllabus negatives are out.
    for (var ni = 0; ni < negatives.length; ni++) {
      reasons.push(negatives[ni].code + '="' + negatives[ni].match + '"');
    }
    if (negatives.length) {
      return verdict(OUT, 'low', reasons, evidence);
    }

    // 4. Named non-person concepts under an excluded subject stay out.
    if (Object.prototype.hasOwnProperty.call(EXCLUDED_SUBJECTS, q.subject)) {
      reasons.push('excluded-subject="' + q.subject + '"');
      return verdict(OUT, 'low', reasons, evidence);
    }

    // 5. Named non-person concepts under a syllabus subject fall back to the
    // subject whitelist. This keeps basic science (e.g. "Adder (electronics)")
    // in scope without letting an obscure biography through.
    if (isSyllabusSubject(q.subject)) {
      reasons.push('syllabus-subject="' + q.subject + '"');
      return verdict(EXAM, 'medium', reasons, evidence);
    }

    if (isCapitalizedEntity(q.subTopic)) {
      reasons.push('named-entity-without-exam-anchor="' + q.subTopic + '"');
      return verdict(OUT, 'low', reasons, evidence);
    }

    reasons.push('subject-outside-exam-syllabus="' + q.subject + '"');
    return verdict(OUT, 'low', reasons, evidence);
  }

  function verdict(scope, tier, reasons, evidence) {
    return {
      version: VERSION,
      scope: scope,
      tier: tier,
      reasons: reasons,
      evidence: evidence
    };
  }

  // Attach the verdict to an archive item without mutating the caller's
  // object. `relevance` stays the tier the existing filter reads; `examScope`
  // and the reason arrays are what the UI renders.
  function annotate(item) {
    var v = classify(item);
    var out = {};
    for (var k in item) {
      if (Object.prototype.hasOwnProperty.call(item, k)) out[k] = item[k];
    }
    out.relevance = v.tier;
    out.examScope = v.scope;
    out.scopeReasons = v.reasons;
    out.scopeEvidence = v.evidence;
    out.scopeVersion = v.version;
    return out;
  }

  return {
    VERSION: VERSION,
    EXAM: EXAM,
    OUT: OUT,
    REVIEW: REVIEW,
    ANCHORS: ANCHORS,
    SYLLABUS_SUBJECTS: SYLLABUS_SUBJECTS,
    classify: classify,
    annotate: annotate,
    looksLikePerson: looksLikePerson,
    isSyllabusSubject: isSyllabusSubject
  };
}));
