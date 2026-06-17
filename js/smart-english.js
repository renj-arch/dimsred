// =============================================
// ENGLISH INTELLIGENCE ENGINE v1
// Performance analyzer + correction system
// NOT a grammar tutor — it's a mistake optimizer
// =============================================
(function(){
var KEY = 'smart_en_data';
var CACHE_KEY = 'smart_en_cache';

// ========== DATA MODELS ==========
var defaultState = {
  vocab: {},           // { word: { seen, correct, wrong, lastSeen, strength, nextReview } }
  grammarErrors: [],   // { rule, count, pattern, lastSeen, misconceptionChain[] }
  readingSessions: [], // { wpm, accuracy, passageLen, fatigue, timestamp }
  confidenceGap: [],   // { question, confidence(1-5), correct, timestamp }
  eliminationLog: [],  // { q, optionsRemainingAtStart, eliminatedOrder, finalChoice, correct }
  errorFingerprint: null, // computed
  grammarGraph: null,  // misconception relationships
  vocabDecayModel: null,
  readingFatigueCurve: null,
  totalQuestions: 0,
  totalCorrect: 0,
  timeSpent: 0,
  sessionCount: 0
};

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || JSON.parse(JSON.stringify(defaultState)); }
  catch(e) { return JSON.parse(JSON.stringify(defaultState)); }
}
function save(s) { localStorage.setItem(KEY, JSON.stringify(s)); }

// ========== GRAMMAR RULE DATABASE ==========
var GRAMMAR_RULES = {
  'subject_verb_agreement': { id:'sva', label:'Subject-Verb Agreement', traps:['Neither...nor','Each of','The number of','One of','Either...or'], difficulty:2 },
  'tenses': { id:'tns', label:'Tense Consistency', traps:['Sequence of tenses','Present perfect vs simple past','Past perfect sequence'], difficulty:2 },
  'prepositions': { id:'prep', label:'Prepositions', traps:['Since/For','Between/Among','In/Into','On/Upon','With/By'], difficulty:1 },
  'articles': { id:'art', label:'Articles (A/An/The)', traps:['Omission before abstract nouns','Use before superlatives','Zero article rules'], difficulty:1 },
  'voice': { id:'voc', label:'Active/Passive Voice', traps:['Retain agent','Change in tense','Intransitive verb trap'], difficulty:2 },
  'narration': { id:'nar', label:'Direct/Indirect Speech', traps:['Pronoun change','Tense backshift','Time/place changes'], difficulty:3 },
  'modals': { id:'mod', label:'Modals', traps:['Could vs would','May vs might','Must vs have to','Need/dare'], difficulty:2 },
  'conditionals': { id:'con', label:'Conditional Sentences', traps:['Type 0/1/2/3','Mixed conditionals','Unless vs if not'], difficulty:3 },
  'conjunctions': { id:'cnj', label:'Conjunctions', traps:['Not only...but also','Though/although','As long as','Provided that'], difficulty:2 },
  'relative_clauses': { id:'rel', label:'Relative Clauses', traps:['Who vs whom','Which vs that','Whose vs who\'s'], difficulty:2 },
  'parallelism': { id:'par', label:'Parallelism', traps:['Verb forms in series','Correlative pairs','Than/as comparisons'], difficulty:3 },
  'comparatives': { id:'cmp', label:'Comparatives & Superlatives', traps:['Double comparatives','Fewer vs less','Elder vs older'], difficulty:2 },
  'phrasal_verbs': { id:'phr', label:'Phrasal Verbs', traps:['Put up with vs put with','Look after vs look for','Break down vs break up'], difficulty:2 },
  'determiners': { id:'det', label:'Determiners', traps:['Much vs many','Little vs few','Some vs any'], difficulty:1 },
  'question_tags': { id:'qtg', label:'Question Tags', traps:['Negative with negative','I am tag','Imperative tags','Let\'s tag'], difficulty:2 },
  'infinitives_gerunds': { id:'inf', label:'Infinitives & Gerunds', traps:['Stop + gerund vs infinitive','Remember/forget + form','Allow/permit + object'], difficulty:3 },
  'nouns': { id:'nou', label:'Noun Rules', traps:['Collective noun verb','Uncountable pluralization','Possessive form'], difficulty:1 },
  'adjectives': { id:'adj', label:'Adjective Order', traps:['Opinion-size-age-shape-color','Enough position','Else after compounds'], difficulty:2 },
  'adverbs': { id:'adv', label:'Adverb Placement', traps:['Only position','Not vs never','Enough vs too'], difficulty:2 },
  'spelling': { id:'spe', label:'Spelling & Word Choice', traps:['Stationary vs stationery','Effect vs affect','Practice vs practise'], difficulty:1 }
};

var ERROR_CLUES = {
  sva: ['neither','either','each of','one of','the number of','as well as','together with'],
  tns: ['since','for','already','yet','just','ever','never','by the time','when'],
  prep: ['since/for','between/among','in/into','on/upon','with/by','beside/besides'],
  art: ['the himalayas','a honest','an university','the rich','a few','the few','the little'],
  voc: ['by whom','by which','by whom was','is being','has been','had been'],
  nar: ['said that','told that','exclaimed','ordered','requested','suggested'],
  mod: ['could have','would have','may have','might have','must have','need not'],
  con: ['if i were','if i had','unless','provided','as long as'],
  cnj: ['not only','but also','though','although','as long as','as if'],
  rel: ['who','whom','whose','which','that','whichever'],
  par: ['not only','but also','both','and','either','or','neither','nor'],
  cmp: ['more better','most best','lesser','fewer','elder','older','farther'],
  phr: ['put up','look after','break down','carry out','give up','set up'],
  det: ['much','many','little','few','some','any','each','every'],
  qtg: ['aren\'t i','won\'t','shall we','will you','don\'t','doesn\'t'],
  inf: ['stop to','stop -ing','remember to','forget -ing','allow to','allow -ing'],
  nou: ['scenery','advice','information','knowledge','furniture'],
  adj: ['beautiful round old','new black leather','tall young handsome'],
  adv: ['only','never','always','sometimes','often','rarely'],
  spe: ['effect','affect','practice','practise','stationary','stationery']
};

// ========== VOCABULARY DECAY MODEL ==========
function vocabStrength(reviewCount, daysSinceLast) {
  if (reviewCount === 0) return Math.max(0, 1 - daysSinceLast / 30);
  var base = Math.min(1, reviewCount * 0.15);
  var decay = Math.min(base, daysSinceLast * 0.02 * Math.max(1, 5 - reviewCount));
  return Math.max(0, base - decay);
}

function nextVocabReview(currentStrength) {
  if (currentStrength < 0.2) return 1;
  if (currentStrength < 0.4) return 3;
  if (currentStrength < 0.6) return 7;
  if (currentStrength < 0.8) return 14;
  return 30;
}

// ========== ERROR FINGERPRINT ==========
function computeFingerprint(state) {
  var fp = {
    dominantErrorType: null,
    grammarMisfireRate: 0,
    vocabRetentionRate: 0,
    readingSpeedAvg: 0,
    readingAccuracyAvg: 0,
    confidenceAccuracyGap: 0,
    eliminationEfficiency: 0,
    topErrors: [],
    weakRules: [],
    errorScore: 0
  };

  // Grammar misfire analysis
  var ruleCounts = {};
  state.grammarErrors.forEach(function(e){
    ruleCounts[e.rule] = (ruleCounts[e.rule] || 0) + e.count;
  });
  var sorted = Object.keys(ruleCounts).sort(function(a,b){ return ruleCounts[b] - ruleCounts[a]; });
  fp.topErrors = sorted.slice(0, 5).map(function(r){ return { rule: r, count: ruleCounts[r] }; });

  var totalGrammarErrors = state.grammarErrors.reduce(function(s,e){ return s + e.count; }, 0);
  fp.grammarMisfireRate = state.totalQuestions > 0 ? totalGrammarErrors / state.totalQuestions : 0;

  // Vocab retention
  var vocabWords = Object.keys(state.vocab);
  if (vocabWords.length > 0) {
    var totalStrength = 0;
    vocabWords.forEach(function(w){ totalStrength += state.vocab[w].strength || 0; });
    fp.vocabRetentionRate = totalStrength / vocabWords.length;
  }

  // Reading speed
  if (state.readingSessions.length > 0) {
    fp.readingSpeedAvg = state.readingSessions.reduce(function(s, r){ return s + r.wpm; }, 0) / state.readingSessions.length;
    fp.readingAccuracyAvg = state.readingSessions.reduce(function(s, r){ return s + r.accuracy; }, 0) / state.readingSessions.length;
  }

  // Confidence vs accuracy gap
  if (state.confidenceGap.length > 0) {
    var totalGap = 0;
    state.confidenceGap.forEach(function(c){
      var expected = c.confidence >= 4 ? 1 : (c.confidence <= 2 ? 0 : 0.5);
      totalGap += Math.abs(expected - (c.correct ? 1 : 0));
    });
    fp.confidenceAccuracyGap = totalGap / state.confidenceGap.length;
  }

  // Worst rules
  var weakThreshold = 0.6;
  for (var ruleId in GRAMMAR_RULES) {
    var errs = state.grammarErrors.filter(function(e){ return e.rule === ruleId; });
    var errCount = errs.reduce(function(s,e){ return s + e.count; }, 0);
    var totalAttempts = errs.reduce(function(s,e){ return s + (e.total || 0); }, 0);
    if (totalAttempts > 0 && errCount / totalAttempts > weakThreshold) {
      fp.weakRules.push({ rule: ruleId, errorRate: errCount / totalAttempts, label: GRAMMAR_RULES[ruleId].label });
    }
  }

  fp.errorScore = Math.round((fp.grammarMisfireRate * 40 + (1 - fp.vocabRetentionRate) * 25 + fp.confidenceAccuracyGap * 20 + (1 - fp.readingAccuracyAvg) * 15) * 100);
  fp.dominantErrorType = sorted[0] || null;

  state.errorFingerprint = fp;
  return fp;
}

// ========== GRAMMAR MISCONCEPTION GRAPH ==========
function buildGrammarGraph(state) {
  var graph = { nodes: [], edges: [] };
  var errors = state.grammarErrors;

  // Build co-occurrence matrix
  var coOccur = {};
  errors.forEach(function(e){
    if (!coOccur[e.rule]) coOccur[e.rule] = {};
    errors.forEach(function(e2){
      if (e2.rule !== e.rule) {
        coOccur[e.rule][e2.rule] = (coOccur[e.rule][e2.rule] || 0) + Math.min(e.count, e2.count);
      }
    });
  });

  var seen = {};
  errors.forEach(function(e){
    if (!seen[e.rule]) {
      graph.nodes.push({ id: e.rule, label: GRAMMAR_RULES[e.rule]?.label || e.rule, count: e.count, difficulty: GRAMMAR_RULES[e.rule]?.difficulty || 2 });
      seen[e.rule] = true;
    }
  });

  Object.keys(coOccur).forEach(function(r1){
    Object.keys(coOccur[r1]).forEach(function(r2){
      if (coOccur[r1][r2] > 1) {
        graph.edges.push({ from: r1, to: r2, weight: coOccur[r1][r2] });
      }
    });
  });

  state.grammarGraph = graph;
  return graph;
}

// ========== READING FATIGUE CURVE ==========
function computeFatigueCurve(state) {
  var sessions = state.readingSessions;
  if (sessions.length < 3) return null;

  var curve = [];
  for (var i = 0; i < sessions.length; i++) {
    var seq = i + 1;
    curve.push({ session: seq, wpm: sessions[i].wpm, accuracy: sessions[i].accuracy * 100 });
  }
  // Trend line
  var n = curve.length;
  var sumX = 0, sumY_wpm = 0, sumY_acc = 0;
  curve.forEach(function(p, i){
    sumX += i + 1;
    sumY_wpm += p.wpm;
    sumY_acc += p.accuracy;
  });
  var meanX = sumX / n;
  var meanWPM = sumY_wpm / n;
  var meanAcc = sumY_acc / n;

  state.readingFatigueCurve = {
    sessions: curve,
    wpmTrend: meanWPM,
    accuracyTrend: meanAcc,
    fatigueRate: sessions[0] && sessions[sessions.length-1]
      ? ((sessions[sessions.length-1].wpm - sessions[0].wpm) / sessions[0].wpm * 100)
      : 0
  };
  return state.readingFatigueCurve;
}

// ========== DRILL GENERATORS ==========
function generateMicroDrills(state, ruleId, count) {
  var rule = GRAMMAR_RULES[ruleId];
  if (!rule) return [];
  var drills = [];
  var traps = rule.traps || [];
  for (var i = 0; i < count; i++) {
    drills.push({
      type: 'micro_' + ruleId,
      rule: ruleId,
      label: rule.label,
      difficulty: rule.difficulty,
      trap: traps[i % traps.length],
      hint: 'Watch for: ' + traps[i % traps.length]
    });
  }
  return drills;
}

function generateTrapSentences(state, count) {
  var fp = state.errorFingerprint;
  if (!fp || !fp.weakRules.length) return [];
  var sentences = [];
  fp.weakRules.slice(0, 3).forEach(function(wr){
    var rule = GRAMMAR_RULES[wr.rule];
    if (!rule) return;
    rule.traps.forEach(function(trap){
      if (sentences.length < count) {
        sentences.push({
          rule: wr.rule,
          trap: trap,
          difficulty: rule.difficulty,
          label: rule.label
        });
      }
    });
  });
  return sentences;
}

function generateClozeAdaptation(state, count) {
  var fp = state.errorFingerprint;
  if (!fp || !fp.weakRules.length) return [];
  var cloze = [];
  fp.weakRules.slice(0, 4).forEach(function(wr){
    for (var i = 0; i < Math.ceil(count / Math.min(fp.weakRules.length, 4)); i++) {
      cloze.push({
        type: 'cloze',
        rule: wr.rule,
        label: wr.label,
        difficulty: GRAMMAR_RULES[wr.rule]?.difficulty || 2
      });
    }
  });
  return cloze.slice(0, count);
}

function generateVocabCycle(state, count) {
  var vocabWords = Object.keys(state.vocab);
  var due = vocabWords.filter(function(w){
    var v = state.vocab[w];
    return v.strength < 0.7 || (v.nextReview && new Date(v.nextReview) <= new Date());
  });
  due.sort(function(a,b){ return state.vocab[a].strength - state.vocab[b].strength; });
  return due.slice(0, count).map(function(w){
    return { word: w, strength: state.vocab[w].strength, lastSeen: state.vocab[w].lastSeen };
  });
}

function generateReadingPassage(state) {
  var fp = state.errorFingerprint;
  var level = 'easy';
  var wordCount = 200;
  if (fp) {
    if (fp.readingSpeedAvg > 250) { level = 'hard'; wordCount = 400; }
    else if (fp.readingSpeedAvg > 180) { level = 'medium'; wordCount = 300; }
  }
  return { level: level, wordCount: wordCount, focusAreas: (fp?.weakRules || []).slice(0, 3).map(function(r){ return r.rule; }) };
}

// ========== MAIN ANALYSIS ==========
window.runEnglishEngine = function(force) {
  var state = load();
  if (!force && state.totalQuestions < 5) return null;

  var fp = computeFingerprint(state);
  var graph = buildGrammarGraph(state);
  var fatigue = computeFatigueCurve(state);
  save(state);

  var analysis = {
    fingerprint: fp,
    grammarGraph: graph,
    fatigueCurve: fatigue,
    vocabDueCount: Object.keys(state.vocab).filter(function(w){ return state.vocab[w].strength < 0.7; }).length,
    grammarMisfireRate: (fp.grammarMisfireRate * 100).toFixed(1) + '%',
    vocabRetention: (fp.vocabRetentionRate * 100).toFixed(1) + '%',
    readingAvgWPM: Math.round(fp.readingSpeedAvg),
    readingAvgAcc: (fp.readingAccuracyAvg * 100).toFixed(1) + '%',
    confidenceGap: (fp.confidenceAccuracyGap * 100).toFixed(1) + '%',
    drills: {
      micro: generateMicroDrills(state, fp.topErrors[0]?.rule || 'sva', 5),
      traps: generateTrapSentences(state, 3),
      cloze: generateClozeAdaptation(state, 5),
      vocab: generateVocabCycle(state, 5),
      reading: generateReadingPassage(state)
    },
    recommendations: generateRecommendations(state, fp),
    level: computeLevel(state, fp)
  };

  localStorage.setItem(CACHE_KEY, JSON.stringify(analysis));
  return analysis;
};

function computeLevel(state, fp) {
  if (state.totalQuestions < 10) return { level: '🌱', label: 'Just Started', score: 0 };
  var score = 0;
  score += (1 - fp.grammarMisfireRate) * 35;
  score += fp.vocabRetentionRate * 25;
  score += (fp.readingAccuracyAvg || 0) * 20;
  score += (1 - fp.confidenceAccuracyGap) * 20;
  var total = Math.round(score);
  if (total >= 85) return { level: '🏆', label: 'English Master', score: total };
  if (total >= 70) return { level: '⭐', label: 'Advanced', score: total };
  if (total >= 50) return { level: '📗', label: 'Intermediate', score: total };
  return { level: '📕', label: 'Building Foundation', score: total };
}

function generateRecommendations(state, fp) {
  var recs = [];
  if (fp.grammarMisfireRate > 0.3) recs.push('Grammar misfire rate high. Focus on your top 3 error rules with targeted drills.');
  if (fp.vocabRetentionRate < 0.5) recs.push('Vocabulary retention below 50%. Increase spaced repetition review frequency.');
  if (fp.readingSpeedAvg < 150) recs.push('Reading speed below 150 WPM. Practice speed reading with timed passages.');
  if (fp.confidenceAccuracyGap > 0.3) recs.push('Confidence-accuracy gap detected. You are overconfident in wrong answers — review before submitting.');
  if (recs.length === 0) recs.push('Good foundation. Focus on pushing reading speed above 250 WPM while maintaining accuracy.');
  return recs;
}

// ========== TRACKING FUNCTIONS ==========
window.trackEnglishQuestion = function(qText, chosen, correct, options, confidence, timeSpent) {
  var state = load();
  state.totalQuestions++;
  if (chosen === correct) state.totalCorrect++;
  state.timeSpent += timeSpent || 0;

  // Detect grammar rule from question text
  var lower = (qText || '').toLowerCase() + ' ' + (chosen || '').toLowerCase() + ' ' + (correct || '').toLowerCase();
  var matchedRule = null;
  for (var ruleId in ERROR_CLUES) {
    var clues = ERROR_CLUES[ruleId];
    for (var i = 0; i < clues.length; i++) {
      if (lower.indexOf(clues[i]) >= 0) {
        matchedRule = ruleId; break;
      }
    }
    if (matchedRule) break;
  }

  if (chosen !== correct && matchedRule) {
    var existing = false;
    state.grammarErrors.forEach(function(e){
      if (e.rule === matchedRule) { e.count++; e.lastSeen = new Date().toISOString(); existing = true; }
    });
    if (!existing) state.grammarErrors.push({ rule: matchedRule, count: 1, lastSeen: new Date().toISOString(), misconceptionChain: [] });
  }

  // Confidence logging
  if (confidence) {
    state.confidenceGap.push({ question: qText, confidence: confidence, correct: chosen === correct, timestamp: new Date().toISOString() });
    if (state.confidenceGap.length > 100) state.confidenceGap = state.confidenceGap.slice(-100);
  }

  save(state);
};

window.trackVocab = function(word, correct) {
  var state = load();
  if (!state.vocab[word]) {
    state.vocab[word] = { seen:0, correct:0, wrong:0, lastSeen:null, strength:0, nextReview:null };
  }
  var v = state.vocab[word];
  v.seen++;
  if (correct) v.correct++; else v.wrong++;
  v.lastSeen = new Date().toISOString();
  v.strength = vocabStrength(v.correct, 0);
  v.nextReview = new Date(Date.now() + nextVocabReview(v.strength) * 86400000).toISOString();
  save(state);
};

window.trackReadingSession = function(wpm, accuracy, passageLen) {
  var state = load();
  state.readingSessions.push({ wpm: wpm, accuracy: accuracy, passageLen: passageLen, fatigue: state.readingSessions.length, timestamp: new Date().toISOString() });
  if (state.readingSessions.length > 50) state.readingSessions = state.readingSessions.slice(-50);
  state.sessionCount++;
  save(state);
};

window.getEnglishAnalysis = function() {
  var cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    try { return JSON.parse(cached); } catch(e) {}
  }
  return window.runEnglishEngine();
};

window.getEnglishState = function() { return load(); };

})();
