// =============================================
// REASONING PATTERN ENGINE v1
// Pattern recognition trainer
// Decomposes puzzles into logical structures
// =============================================
(function(){
var KEY = 'smart_rs_data';
var CACHE_KEY = 'smart_rs_cache';

var defaultState = {
  patterns: {},           // { patternId: { seen, correct, wrong, avgTime, firstLookCorrect, lastSeen } }
  sessions: [],           // { date, puzzles[], accuracy, avgTime, type }
  puzzleDecomp: [],       // { puzzle, identifiedParts, steps, correct }
  stylePreference: null,  // 'visual' or 'logical'
  errorTypes: {},         // { type: count }
  impulsivityLog: [],     // { question, timeSpent, correct, rechecked }
  patternLibrary: null,
  trapRecognition: { seen:0, caught:0, missed:0 }
};

// ========== PATTERN TYPES ==========
var PATTERN_TYPES = {
  'analogy': { id:'aly', label:'Analogy', difficulty:2, sub:['word_analogy','number_analogy','letter_analogy','relationship'] },
  'classification': { id:'cla', label:'Classification/Odd One Out', difficulty:1, sub:['word_class','number_class','letter_class'] },
  'coding_decoding': { id:'cod', label:'Coding-Decoding', difficulty:2, sub:['letter_shift','number_code','symbol_code','substitution'] },
  'blood_relation': { id:'blo', label:'Blood Relations', difficulty:2, sub:['family_tree','relationship_puzzle'] },
  'direction': { id:'dir', label:'Direction & Distance', difficulty:1, sub:['cardinal','displacement','turns'] },
  'series': { id:'ser', label:'Series Completion', difficulty:2, sub:['number_series','letter_series','alpha_numeric'] },
  'puzzle': { id:'puz', label:'Puzzles (Seating/Ranking)', difficulty:3, sub:['linear_arrange','circular_arrange','ranking','scheduling'] },
  'syllogism': { id:'syl', label:'Syllogism', difficulty:2, sub:['all_some','no_none','possibility','either_or'] },
  'inequality': { id:'ine', label:'Inequality', difficulty:1, sub:['direct_ineq','coded_ineq','chain'] },
  'input_output': { id:'io', label:'Input-Output', difficulty:3, sub:['shifting','replacement','arithmetic_op'] },
  'logical_deduction': { id:'log', label:'Logical Deduction', difficulty:3, sub:['statement_conclusion','cause_effect','assumption'] },
  'data_sufficiency': { id:'data', label:'Data Sufficiency', difficulty:3, sub:['single_stmt','both_stmt','either_or'] },
  'venn_diagram': { id:'ven', label:'Venn Diagram', difficulty:2, sub:['set_rel','max_min','overlap'] },
  'cube_dice': { id:'cub', label:'Cube & Dice', difficulty:2, sub:['face_opposite','rotation','cutting'] },
  'calendar_clock': { id:'cal', label:'Calendar & Clock', difficulty:2, sub:['day_find','angle','mirror'] },
  'non_verbal': { id:'nv', label:'Non-Verbal Reasoning', difficulty:3, sub:['mirror_image','water_image','embedded','paper_fold','pattern_completion'] }
};

var TRAP_PATTERNS = [
  { id: 'trap_sneaky_similar', name: 'Nearly identical options', sign: 'Two options differ by one word' },
  { id: 'trap_reversal', name: 'Reversed relationship', sign: 'A:B is reversed in options' },
  { id: 'trap_all_except', name: 'All/every/except confusion', sign: 'Question contains "all except"' },
  { id: 'trap_possibility', name: 'Syllogism possibility trap', sign: '"Some" can include "All" in syllogism' },
  { id: 'trap_neither_nor', name: 'Neither/nor in syllogism', sign: 'Neither/nor appears in options' },
  { id: 'trap_extra_info', name: 'Data sufficiency extra info', sign: 'Statement gives more than needed' },
  { id: 'trap_direction_axis', name: 'Direction axis swap', sign: 'North-East vs East-North confusion' },
  { id: 'trap_blood_gen', name: 'Blood relation gender', sign: 'Gender not specified but assumed' }
];

// ========== ERROR PATTERNS ==========
var ERROR_PATTERNS = {
  'overthinking': { label:'Overthinking', sign:'Spent >2x avg time but got it wrong' },
  'impulsive': { label:'Impulsive Answering', sign:'Answered in <10s and got it wrong' },
  'misread': { label:'Misread Question', sign:'Picked an option that answers a different question' },
  'visual_misinterpret': { label:'Visual Misinterpretation', sign:'Wrong on diagram/arrangement despite correct logic' },
  'logical_jump': { label:'Logical Jump', sign:'Skipped intermediate deduction step' },
  'trap_fell': { label:'Fell for Trap', sign:'Chose the designed wrong answer' }
};

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || JSON.parse(JSON.stringify(defaultState)); }
  catch(e) { return JSON.parse(JSON.stringify(defaultState)); }
}
function save(s) { localStorage.setItem(KEY, JSON.stringify(s)); }

// ========== PATTERN DECOMPOSITION ==========
function decomposePuzzle(patternType, questionText) {
  var base = PATTERN_TYPES[patternType];
  if (!base) return { type: 'unknown', steps: 1, approach: 'Read and analyze' };

  var approachMap = {
    'analogy': 'Find the relationship A:B → apply to C:D',
    'classification': 'Find what 3 share that 1 does not',
    'coding_decoding': 'Identify the substitution rule → apply in reverse',
    'blood_relation': 'Draw family tree → trace relationship',
    'direction': 'Plot path on paper → calculate displacement',
    'series': 'Find the pattern of change → extrapolate',
    'puzzle': 'Draw grid → place fixed items → deduce remaining',
    'syllogism': 'Draw Venn diagrams for each premise → check conclusions',
    'inequality': 'Chain all inequalities → find direct relationships',
    'input_output': 'Find the operation per step → apply repeatedly',
    'logical_deduction': 'Identify structure → evaluate each option systematically',
    'data_sufficiency': 'Check each statement independently → then together',
    'venn_diagram': 'Draw overlapping sets → identify required region',
    'cube_dice': 'Identify adjacent faces → deduce opposite',
    'calendar_clock': 'Calculate days/angle systematically',
    'non_verbal': 'Visualize transformation → compare with options'
  };

  return {
    type: patternType,
    label: base.label,
    difficulty: base.difficulty,
    steps: base.sub.length,
    approach: approachMap[patternType] || 'Analyze the structure'
  };
}

// ========== FIRST-LOOK SUCCESS TRACKING ==========
function computeFirstLookRate(state) {
  var total = 0, correct = 0;
  for (var pid in state.patterns) {
    var p = state.patterns[pid];
    total += p.seen || 0;
    correct += p.firstLookCorrect || 0;
  }
  return total > 0 ? correct / total : 0.5;
}

// ========== TRAP RECOGNITION ==========
function evaluateTrapAwareness(state) {
  var t = state.trapRecognition;
  return {
    totalTrapsSeen: t.seen,
    trapCaughtRate: t.seen > 0 ? t.caught / t.seen : 0,
    trapMissRate: t.seen > 0 ? t.missed / t.seen : 0
  };
}

// ========== STYLE PREFERENCE ==========
function detectStyle(state) {
  var decompLog = state.puzzleDecomp;
  if (decompLog.length < 5) return 'analyzing';
  var visualCorrect = 0, visualTotal = 0, logicalCorrect = 0, logicalTotal = 0;
  decompLog.forEach(function(d){
    if (d.visualType) { visualTotal++; if (d.correct) visualCorrect++; }
    else { logicalTotal++; if (d.correct) logicalCorrect++; }
  });
  var visualAcc = visualTotal > 0 ? visualCorrect / visualTotal : 0;
  var logicalAcc = logicalTotal > 0 ? logicalCorrect / logicalTotal : 0;
  return visualAcc > logicalAcc + 0.1 ? 'visual' : (logicalAcc > visualAcc + 0.1 ? 'logical' : 'balanced');
}

// ========== DRILL GENERATORS ==========
function generateMutationQuestions(baseType, count) {
  var mutations = [];
  for (var i = 0; i < count; i++) {
    mutations.push({
      type: baseType,
      variant: i % 2 === 0 ? 'direct' : 'reverse',
      difficulty: i < count/3 ? 'easy' : (i < count*2/3 ? 'medium' : 'hard'),
      sameLogic: true,
      newFormat: true
    });
  }
  return mutations;
}

function generateTimePressureSet(count, timePerQ) {
  var set = [];
  for (var i = 0; i < count; i++) {
    set.push({
      question: i + 1,
      timeLimit: timePerQ,
      difficulty: i < count/3 ? 'easy' : (i < count*2/3 ? 'medium' : 'hard'),
      type: Object.keys(PATTERN_TYPES)[i % Object.keys(PATTERN_TYPES).length]
    });
  }
  return set;
}

function generateReverseReasoning(correctAnswer, patternType) {
  return {
    answer: correctAnswer,
    patternType: patternType,
    task: 'Reconstruct the logic that leads to this answer',
    steps: decomposePuzzle(patternType, '').steps
  };
}

function generateAdaptivePuzzle(state) {
  var fp = computeFirstLookRate(state);
  var difficulty = fp < 0.4 ? 'easy' : (fp < 0.7 ? 'medium' : 'hard');
  var weakTypes = [];
  for (var pid in state.patterns) {
    var p = state.patterns[pid];
    if (p.seen >= 2 && p.correct / p.seen < 0.5) {
      weakTypes.push(pid);
    }
  }
  var focusType = weakTypes.length > 0 ? weakTypes[0] : Object.keys(PATTERN_TYPES)[Math.floor(Math.random() * Object.keys(PATTERN_TYPES).length)];
  return { difficulty: difficulty, focusType: focusType, adaptive: true };
}

function generatePatternCluster(examType) {
  var sscPatterns = ['analogy','classification','coding_decoding','series','syllogism','inequality','direction','blood_relation'];
  var focus = sscPatterns.slice(0, 5);
  return focus.map(function(p){
    return { type: p, label: PATTERN_TYPES[p]?.label, difficulty: PATTERN_TYPES[p]?.difficulty };
  });
}

// ========== MAIN ANALYSIS ==========
window.runReasoningEngine = function(force) {
  var state = load();
  if (!force && Object.keys(state.patterns).length < 3) return null;

  var firstLookRate = computeFirstLookRate(state);
  var style = detectStyle(state);
  var trapAwareness = evaluateTrapAwareness(state);
  var decomposition = [];

  for (var pid in state.patterns) {
    var p = state.patterns[pid];
    if (p.seen >= 2) {
      decomposition.push({
        pattern: pid,
        label: PATTERN_TYPES[pid]?.label || pid,
        accuracy: Math.round(p.correct / p.seen * 100),
        avgTime: Math.round(p.avgTime || 0),
        firstLook: Math.round((p.firstLookCorrect || 0) / p.seen * 100),
        difficulty: PATTERN_TYPES[pid]?.difficulty || 2
      });
    }
  }
  decomposition.sort(function(a,b){ return a.accuracy - b.accuracy; });

  // Find weak patterns
  var weakPatterns = decomposition.filter(function(d){ return d.accuracy < 60; });
  var strongPatterns = decomposition.filter(function(d){ return d.accuracy >= 80; });

  // Error style analysis
  var dominantErrorType = null, maxErrCount = 0;
  for (var et in state.errorTypes) {
    if (state.errorTypes[et] > maxErrCount) {
      maxErrCount = state.errorTypes[et];
      dominantErrorType = et;
    }
  }

  // Impulsivity score
  var impLog = state.impulsivityLog;
  var impulsivityScore = 0;
  if (impLog.length > 0) {
    var impulsiveWrong = impLog.filter(function(i){ return i.timeSpent < 10 && !i.correct; }).length;
    impulsivityScore = impulsiveWrong / impLog.length;
  }

  var analysis = {
    firstLookRate: (firstLookRate * 100).toFixed(1) + '%',
    stylePreference: style,
    trapAwareness: trapAwareness,
    patternBreakdown: decomposition,
    weakPatterns: weakPatterns,
    strongPatterns: strongPatterns,
    dominantErrorType: dominantErrorType ? ERROR_PATTERNS[dominantErrorType]?.label : 'None detected',
    impulsivityScore: (impulsivityScore * 100).toFixed(1) + '%',
    drills: {
      mutation: generateMutationQuestions(weakPatterns[0]?.pattern || 'series', 5),
      timePressure: generateTimePressureSet(10, 30),
      reverse: generateReverseReasoning('Option B', weakPatterns[0]?.pattern || 'series'),
      adaptive: generateAdaptivePuzzle(state),
      patternCluster: generatePatternCluster('ssc')
    },
    recommendations: generateRecommendations(state, firstLookRate, style, weakPatterns, dominantErrorType, impulsivityScore),
    level: computeLevel(state, firstLookRate, weakPatterns.length)
  };

  state.stylePreference = style;
  save(state);
  localStorage.setItem(CACHE_KEY, JSON.stringify(analysis));
  return analysis;
};

function computeLevel(state, firstLookRate, weakCount) {
  if (Object.keys(state.patterns).length < 3) return { level: '🧩', label: 'Pattern Novice', score: 0 };
  var score = 0;
  score += firstLookRate * 30;
  score += (1 - (weakCount / Math.max(Object.keys(state.patterns).length, 1))) * 30;
  score += (state.trapRecognition.seen > 0 ? state.trapRecognition.caught / state.trapRecognition.seen : 0) * 25;
  score += (1 - (state.impulsivityLog.filter(function(i){ return i.timeSpent < 10 && !i.correct; }).length / Math.max(state.impulsivityLog.length, 1))) * 15;
  var total = Math.round(score);
  if (total >= 80) return { level: '🧠', label: 'Pattern Master', score: total };
  if (total >= 60) return { level: '🎯', label: 'Sharp Solver', score: total };
  if (total >= 40) return { level: '🔍', label: 'Pattern Learner', score: total };
  return { level: '📐', label: 'Building Logic', score: total };
}

function generateRecommendations(state, firstLookRate, style, weakPatterns, dominantErrorType, impulsivityScore) {
  var recs = [];
  if (firstLookRate < 0.4) recs.push('First-look success rate below 40%. Practice identifying question type before solving.');
  if (style === 'visual') recs.push('You prefer visual reasoning. Use diagrams and drawings for logical problems too.');
  if (style === 'logical') recs.push('You prefer logical deduction. Practice non-verbal and diagram-based puzzles for balance.');
  if (weakPatterns.length > 0) recs.push('Weak areas: ' + weakPatterns.slice(0,3).map(function(w){ return w.label; }).join(', ') + '. Focus mutation drills here.');
  if (impulsivityScore > 0.3) recs.push('Impulsive answering detected. Force 5-second pause before every answer.');
  if (state.trapRecognition.caught / Math.max(state.trapRecognition.seen, 1) < 0.5) recs.push('Trap recognition below 50%. Study common SSC trap types before solving.');
  if (recs.length === 0) recs.push('Strong pattern recognition. Focus on speed: target <20s per easy, <40s per hard puzzle.');
  return recs;
}

// ========== TRACKING FUNCTIONS ==========
window.trackReasoningQuestion = function(patternType, timeSpent, correct, firstLook, answered) {
  var state = load();
  if (!state.patterns[patternType]) state.patterns[patternType] = { seen:0, correct:0, wrong:0, avgTime:0, firstLookCorrect:0, lastSeen:null };
  var p = state.patterns[patternType];
  p.seen++;
  if (correct) p.correct++; else p.wrong++;
  p.avgTime = ((p.avgTime * (p.seen - 1)) + timeSpent) / p.seen;
  if (firstLook && correct) p.firstLookCorrect = (p.firstLookCorrect || 0) + 1;
  p.lastSeen = new Date().toISOString();

  // Detect error style
  if (!correct) {
    if (timeSpent > 60) state.errorTypes['overthinking'] = (state.errorTypes['overthinking'] || 0) + 1;
    else if (timeSpent < 10) state.errorTypes['impulsive'] = (state.errorTypes['impulsive'] || 0) + 1;
    else state.errorTypes['logical_jump'] = (state.errorTypes['logical_jump'] || 0) + 1;
  }

  // Impulsivity log
  state.impulsivityLog.push({ question: patternType, timeSpent: timeSpent, correct: correct, rechecked: !firstLook, timestamp: new Date().toISOString() });
  if (state.impulsivityLog.length > 100) state.impulsivityLog = state.impulsivityLog.slice(-100);

  save(state);
};

window.trackTrapEvent = function(caughtTrap) {
  var state = load();
  state.trapRecognition.seen++;
  if (caughtTrap) state.trapRecognition.caught++;
  else state.trapRecognition.missed++;
  save(state);
};

window.trackPuzzleDecomp = function(puzzleType, stepsTaken, correct, visualType) {
  var state = load();
  state.puzzleDecomp.push({ puzzle: puzzleType, steps: stepsTaken, correct: correct, visualType: visualType || false, timestamp: new Date().toISOString() });
  if (state.puzzleDecomp.length > 100) state.puzzleDecomp = state.puzzleDecomp.slice(-100);
  save(state);
};

window.getReasoningAnalysis = function() {
  var cached = localStorage.getItem(CACHE_KEY);
  if (cached) { try { return JSON.parse(cached); } catch(e) {} }
  return window.runReasoningEngine();
};

window.getReasoningState = function() { return load(); };
window.getPatternTypes = function() { return PATTERN_TYPES; };

})();
