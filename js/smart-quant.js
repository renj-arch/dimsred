// =============================================
// QUANT SPEED ENGINE v1
// Minimizes time per mark
// NOT about solving math — about speed optimization
// =============================================
(function(){
var KEY = 'smart_qt_data';
var CACHE_KEY = 'smart_qt_cache';

var defaultState = {
  operations: {},      // { op: { attempts, avgTime, correct, wrong, shortcutsUsed, lastSeen } }
  formulas: {},        // { formula: { recallTime, correct, attempts, lastSeen } }
  shortcuts: {},       // { shortcut: { known:bool, used:0, saved:0, lastUsed } }
  sessions: [],        // { date, questions[], totalTime, marks, difficulty }
  mentalMath: { attempts:0, correct:0, avgTime:0 },
  skippingLog: [],     // { question, reason(time/difficulty), attempted, correct }
  bottlenecks: null,
  speedSignature: null
};

var TOPICS = {
  'Number System': ['hcf_lcm','remainder','unit_digit','surds','indices','roots'],
  'Arithmetic': ['percent','profit_loss','si_ci','ratio_proportion','average','mixture','time_work','time_distance','boat_stream','pipe_cistern'],
  'Algebra': ['linear_eq','quadratic','polynomial','inequality','sequence'],
  'Geometry': ['lines_angles','triangles','circles','polygons','coordinate','mensuration_2d','mensuration_3d'],
  'Trigonometry': ['identities','heights','angle_values'],
  'Data Interpretation': ['table','bar','line','pie','mixed_di'],
  'Statistics': ['mean','median','mode','standard_dev']
};

var FORMULA_DB = {
  // Averages
  avg: { text:'Average = Sum/Count', shortcuts:['weighted_avg','assumed_mean'], category:'Arithmetic' },
  weighted_avg: { text:'Weighted Avg = (n1*a1 + n2*a2)/(n1+n2)', shortcuts:[], category:'Arithmetic' },
  // Percentages
  percent_change: { text:'% Change = (New-Old)/Old x 100', shortcuts:['successive_pct','fraction_pct'], category:'Arithmetic' },
  successive_pct: { text:'Effective % = a+b+ab/100', shortcuts:[], category:'Arithmetic' },
  fraction_pct: { text:'1/n = (100/n)%', shortcuts:['1/2=50%','1/3=33.33%','1/4=25%','1/5=20%','1/8=12.5%','1/20=5%'], category:'Arithmetic' },
  // SI & CI
  si: { text:'SI = P*R*T/100', shortcuts:['si_yearly'], category:'Arithmetic' },
  ci: { text:'CI = P*(1+R/100)^T - P', shortcuts:['ci_2yr','ci_3yr'], category:'Arithmetic' },
  ci_2yr: { text:'CI_2yr = P*(2R + R²/100)/100', shortcuts:[], category:'Arithmetic' },
  ci_3yr: { text:'CI_3yr = P*(3R + 3R²/100 + R³/10000)/100', shortcuts:[], category:'Arithmetic' },
  // Time & Work
  tw: { text:'Work = Rate x Time', shortcuts:['lcm_method','efficiency_ratio'], category:'Arithmetic' },
  lcm_method: { text:'LCM of times = total work', shortcuts:[], category:'Arithmetic' },
  // Speed Distance
  sd: { text:'Speed = Distance/Time', shortcuts:['relative_speed','avg_speed'], category:'Arithmetic' },
  avg_speed: { text:'Avg Speed = 2ab/(a+b) for equal distances', shortcuts:[], category:'Arithmetic' },
  relative_speed: { text:'Relative Speed = Sum when opposite, Diff when same', shortcuts:[], category:'Arithmetic' },
  // Geometry
  triangle_area: { text:'Area = 1/2 x Base x Height', shortcuts:['heron'], category:'Geometry' },
  heron: { text:'Area = √(s(s-a)(s-b)(s-c))', shortcuts:[], category:'Geometry' },
  circle_area: { text:'Area = πr²', shortcuts:['π=22/7','π=3.14'], category:'Geometry' },
  // Mensuration
  cube_vol: { text:'Volume = a³', shortcuts:[], category:'Geometry' },
  cuboid_vol: { text:'Volume = lxbxh', shortcuts:[], category:'Geometry' },
  cylinder_vol: { text:'Volume = πr²h', shortcuts:[], category:'Geometry' },
  sphere_vol: { text:'Volume = 4/3πr³', shortcuts:[], category:'Geometry' },
  // Trig
  trig_30: { text:'sin30=1/2, cos30=√3/2, tan30=1/√3', shortcuts:[], category:'Trigonometry' },
  trig_45: { text:'sin45=cos45=1/√2, tan45=1', shortcuts:[], category:'Trigonometry' },
  trig_60: { text:'sin60=√3/2, cos60=1/2, tan60=√3', shortcuts:[], category:'Trigonometry' },
  // DI
  di_pct: { text:'% of Total = (Part/Total)x100', shortcuts:['di_angle'], category:'Data Interpretation' },
  di_angle: { text:'Angle = (Part/Total)x360°', shortcuts:[], category:'Data Interpretation' }
};

var SHORTCUTS = {
  'fraction_pct': { name:'Fraction to %', saves:'15s', description:'Know fractions: 1/2=50%, 1/3=33.3%, 1/4=25%, 1/5=20%, 1/8=12.5%, 1/20=5%' },
  'successive_pct': { name:'Successive %', saves:'20s', description:'a+b+ab/100 — do in head instead of two-step calculation' },
  'lcm_method': { name:'LCM for Work', saves:'30s', description:'LCM of times = total work units. No fractions needed.' },
  'relative_speed': { name:'Relative Speed', saves:'15s', description:'Add for opposite direction, subtract for same direction.' },
  'avg_speed_harmonic': { name:'Harmonic Avg Speed', saves:'20s', description:'For equal distances: 2ab/(a+b). Much faster than full calculation.' },
  'assumed_mean': { name:'Assumed Mean', saves:'10s', description:'Subtract assumed from all values, average, add back.' },
  'ci_2yr_short': { name:'CI 2-Year Formula', saves:'25s', description:'P*(2R + R²/100)/100 — skip the (1+R/100)² expansion.' },
  'di_angle_short': { name:'DI Sector Angle', saves:'10s', description:'Part/Total x 360°. Convert % directly to degrees.' },
  'unit_digit': { name:'Unit Digit Cycles', saves:'20s', description:'Cycles: 2→4→8→6, 3→9→7→1, 4→6, 7→9→3→1, 8→4→2→6, 9→1' },
  'digit_sum': { name:'Digit Sum Verification', saves:'15s', description:'Cross-check by adding digits of result. Catches 80% calculation errors.' }
};

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || JSON.parse(JSON.stringify(defaultState)); }
  catch(e) { return JSON.parse(JSON.stringify(defaultState)); }
}
function save(s) { localStorage.setItem(KEY, JSON.stringify(s)); }

// ========== SPEED SIGNATURE ==========
function computeSpeedSignature(state) {
  var sig = {
    avgCalcTime: 0,
    formulaRecallDelay: 0,
    shortcutAdoptionRate: 0,
    mentalMathEfficiency: 0,
    skipRate: 0,
    timePerMark: 0,
    bottleneckOp: null,
    topSlowOps: [],
    marksPerMinute: 0,
    writtenDependency: 0
  };

  // Per-operation timing
  var opEntries = Object.keys(state.operations);
  if (opEntries.length > 0) {
    var ops = opEntries.map(function(op){
      var d = state.operations[op];
      return { op: op, avgTime: d.avgTime || 999, attempts: d.attempts, correctRate: d.attempts > 0 ? d.correct / d.attempts : 0 };
    });
    ops.sort(function(a,b){ return b.avgTime - a.avgTime; });
    sig.topSlowOps = ops.slice(0, 5);
    sig.avgCalcTime = ops.reduce(function(s,o){ return s + o.avgTime; }, 0) / ops.length;
    sig.bottleneckOp = ops[0]?.op || null;
  }

  // Shortcut adoption
  var knownCount = 0, usedCount = 0;
  for (var s in state.shortcuts) {
    if (state.shortcuts[s].known) knownCount++;
    usedCount += state.shortcuts[s].used || 0;
  }
  sig.shortcutAdoptionRate = knownCount > 0 ? usedCount / (knownCount * 5) : 0;

  // Mental math
  var mm = state.mentalMath;
  sig.mentalMathEfficiency = mm.attempts > 0 ? mm.correct / mm.attempts : 0;

  // Skip rate
  sig.skipRate = state.skippingLog.length > 0
    ? state.skippingLog.filter(function(s){ return !s.attempted; }).length / state.skippingLog.length
    : 0;

  // Time per mark
  var totalSessions = state.sessions;
  if (totalSessions.length > 0) {
    var totalTime = totalSessions.reduce(function(s, sess){ return s + (sess.totalTime || 0); }, 0);
    var totalMarks = totalSessions.reduce(function(s, sess){ return s + (sess.marks || 0); }, 0);
    sig.timePerMark = totalMarks > 0 ? totalTime / totalMarks : 0;
    sig.marksPerMinute = totalTime > 0 ? (totalMarks / totalTime) * 60 : 0;
  }

  state.speedSignature = sig;
  return sig;
}

// ========== BOTTLENECK DETECTOR ==========
function detectBottlenecks(state) {
  var sig = state.speedSignature || computeSpeedSignature(state);
  var bottlenecks = [];

  if (sig.avgCalcTime > 30) bottlenecks.push({ area: 'calculation_speed', severity: 'high', message: 'Avg calculation time >30s. Target: <15s.', metric: Math.round(sig.avgCalcTime) + 's' });
  if (sig.shortcutAdoptionRate < 0.3) bottlenecks.push({ area: 'shortcut_usage', severity: 'high', message: 'Shortcut adoption below 30%. Learn and force-use shortcuts.', metric: Math.round(sig.shortcutAdoptionRate * 100) + '%' });
  if (sig.mentalMathEfficiency < 0.6) bottlenecks.push({ area: 'mental_math', severity: 'medium', message: 'Mental math accuracy below 60%. Practice daily mental drills.', metric: Math.round(sig.mentalMathEfficiency * 100) + '%' });
  if (sig.skipRate > 0.4) bottlenecks.push({ area: 'attempt_rate', severity: 'medium', message: 'Skipping >40% of questions. Identify which topics cause skipping.', metric: Math.round(sig.skipRate * 100) + '%' });
  if (sig.timePerMark > 60) bottlenecks.push({ area: 'time_efficiency', severity: 'high', message: '>60s per mark. Target: <40s per mark.', metric: Math.round(sig.timePerMark) + 's/mark' });
  if (sig.writtenDependency > 0.5) bottlenecks.push({ area: 'written_work', severity: 'medium', message: 'Heavy written dependency. Practice mental calculation.', metric: Math.round(sig.writtenDependency * 100) + '%' });

  state.bottlenecks = bottlenecks;
  return bottlenecks;
}

// ========== SHORTCUT ADOPTION TRACKER ==========
function trackShortcutUsage(shortcutId, savedTime) {
  var state = load();
  if (!state.shortcuts[shortcutId]) {
    state.shortcuts[shortcutId] = { known: true, used: 0, saved: 0, lastUsed: null };
  }
  state.shortcuts[shortcutId].used++;
  state.shortcuts[shortcutId].saved += savedTime || 0;
  state.shortcuts[shortcutId].lastUsed = new Date().toISOString();
  save(state);
}

// ========== DRILL GENERATORS ==========
function generateMentalDrills(count) {
  var drills = [];
  var types = [
    { type: 'square', gen: function(){ var n = Math.floor(Math.random()*90)+10; return { q: n+'²', a: n*n, hint:'Use (a+b)² = a²+2ab+b²' }; }},
    { type: 'multiply', gen: function(){ var a = Math.floor(Math.random()*90)+10, b = Math.floor(Math.random()*9)+2; return { q: a+'×'+b, a: a*b, hint:'Break into (a×10) + (a×units)' }; }},
    { type: 'percent', gen: function(){ var a = Math.floor(Math.random()*9)+1, b = Math.floor(Math.random()*900)+100; return { q: a+'% of '+b, a: Math.round(b*a/100), hint:a+'% = '+(a)+'/100 = multiply by 0.0'+(a) }; }},
    { type: 'fraction', gen: function(){ var a = Math.floor(Math.random()*9)+1, b = Math.floor(Math.random()*9)+2; return { q: a+'/'+b+' as %', a: Math.round(a/b*100), hint:'Multiply by 100 and divide' }; }}
  ];
  for (var i = 0; i < count; i++) {
    var t = types[i % types.length];
    var d = t.gen();
    drills.push({ question: d.q, answer: d.a, type: t.type, hint: d.hint, timeLimit: 10 });
  }
  return drills;
}

function generateComputationChains(startVal, steps) {
  var chain = [];
  var ops = ['+','-','×','÷'];
  var val = startVal;
  for (var i = 0; i < steps; i++) {
    var op = ops[Math.floor(Math.random() * ops.length)];
    var num = Math.floor(Math.random() * 90) + 10;
    chain.push({ step: i+1, expression: val + ' ' + op + ' ' + num });
    val = computeStep(val, op, num);
  }
  return { chain: chain, finalAnswer: val, timeLimit: 30 };
}

function computeStep(a, op, b) {
  switch(op) {
    case '+': return a + b;
    case '-': return a - b;
    case '×': return a * b;
    case '÷': return Math.round(a / b);
    default: return a;
  }
}

function generateShortcutProblems(count) {
  var problems = [];
  var shortcutIds = Object.keys(SHORTCUTS);
  for (var i = 0; i < count; i++) {
    var sc = SHORTCUTS[shortcutIds[i % shortcutIds.length]];
    problems.push({
      shortcut: shortcutIds[i % shortcutIds.length],
      name: sc.name,
      saves: sc.saves,
      description: sc.description,
      forcePractice: true
    });
  }
  return problems;
}

function generateSpeedTest(topic, count) {
  var questions = [];
  for (var i = 0; i < count; i++) {
    questions.push({
      topic: topic,
      difficulty: i < count/3 ? 'easy' : (i < count*2/3 ? 'medium' : 'hard'),
      timeTarget: i < count/3 ? 15 : (i < count*2/3 ? 25 : 40),
      requires: topic ? FORMULA_DB[topic]?.shortcuts[0] : null
    });
  }
  return questions;
}

// ========== MAIN ANALYSIS ==========
window.runQuantEngine = function(force) {
  var state = load();
  if (!force && Object.keys(state.operations).length < 3) return null;

  var sig = computeSpeedSignature(state);
  var bots = detectBottlenecks(state);
  save(state);

  var knownShortcuts = [], unknownShortcuts = [];
  for (var s in SHORTCUTS) {
    if (state.shortcuts[s]?.known) knownShortcuts.push(s);
    else unknownShortcuts.push(s);
  }

  var analysis = {
    speedSignature: sig,
    bottlenecks: bots,
    knownShortcuts: knownShortcuts,
    unknownShortcuts: unknownShortcuts.slice(0, 5),
    shortcutAdoption: (sig.shortcutAdoptionRate * 100).toFixed(1) + '%',
    avgCalcTime: sig.avgCalcTime.toFixed(1) + 's',
    marksPerMinute: sig.marksPerMinute.toFixed(1),
    mentalMathAcc: (sig.mentalMathEfficiency * 100).toFixed(1) + '%',
    drills: {
      mental: generateMentalDrills(5),
      chains: generateComputationChains(Math.floor(Math.random()*50)+50, 5),
      shortcut: generateShortcutProblems(3),
      speedTest: generateSpeedTest(sig.bottleneckOp, 10)
    },
    recommendations: generateRecommendations(state, sig, bots),
    level: computeLevel(state, sig)
  };

  localStorage.setItem(CACHE_KEY, JSON.stringify(analysis));
  return analysis;
};

function computeLevel(state, sig) {
  if (Object.keys(state.operations).length < 3) return { level: '⚡', label: 'Getting Started', score: 0 };
  var score = 0;
  score += Math.max(0, 30 - sig.avgCalcTime) * 1.5;
  score += sig.shortcutAdoptionRate * 25;
  score += sig.mentalMathEfficiency * 20;
  score += sig.marksPerMinute * 5;
  score += (1 - sig.skipRate) * 15;
  var total = Math.min(100, Math.round(score));
  if (total >= 80) return { level: '🚀', label: 'Speed Master', score: total };
  if (total >= 60) return { level: '⚡', label: 'Fast Solver', score: total };
  if (total >= 40) return { level: '🔋', label: 'Building Speed', score: total };
  return { level: '🐢', label: 'Speed Builder', score: total };
}

function generateRecommendations(state, sig, bots) {
  var recs = [];
  bots.forEach(function(b){
    if (b.severity === 'high') recs.push(b.message + ' Try: ' + b.metric + ' → target improvement.');
  });
  var unknownCount = Object.keys(SHORTCUTS).filter(function(s){ return !state.shortcuts[s]?.known; }).length;
  if (unknownCount > 0) recs.push('Learn ' + unknownCount + ' unmastered shortcuts to save ~' + (unknownCount * 15) + 's per question.');
  if (sig.mentalMathEfficiency < 0.6) recs.push('Daily mental math: 10 squaring drills, 10 multiplication drills.');
  if (recs.length === 0) recs.push('Strong speed foundation. Focus on maintaining <20s per question average.');
  return recs;
}

// ========== TRACKING FUNCTIONS ==========
window.trackQuantQuestion = function(topic, operation, timeSpent, correct, usedShortcut) {
  var state = load();
  if (!state.operations[operation]) state.operations[operation] = { attempts:0, avgTime:0, correct:0, wrong:0, shortcutsUsed:0, lastSeen:null };
  var op = state.operations[operation];
  op.attempts++;
  op.avgTime = ((op.avgTime * (op.attempts - 1)) + timeSpent) / op.attempts;
  if (correct) op.correct++; else op.wrong++;
  if (usedShortcut) op.shortcutsUsed++;
  op.lastSeen = new Date().toISOString();
  save(state);
};

window.trackFormulaRecall = function(formulaId, recallTime, correct) {
  var state = load();
  if (!state.formulas[formulaId]) state.formulas[formulaId] = { recallTime:0, correct:0, attempts:0, lastSeen:null };
  var f = state.formulas[formulaId];
  f.attempts++;
  f.recallTime = ((f.recallTime * (f.attempts - 1)) + recallTime) / f.attempts;
  if (correct) f.correct++;
  f.lastSeen = new Date().toISOString();
  save(state);
};

window.trackMentalMath = function(correct, timeSpent) {
  var state = load();
  state.mentalMath.attempts++;
  if (correct) state.mentalMath.correct++;
  state.mentalMath.avgTime = ((state.mentalMath.avgTime * (state.mentalMath.attempts - 1)) + timeSpent) / state.mentalMath.attempts;
  save(state);
};

window.trackSession = function(questions, totalTime, marks, difficulty) {
  var state = load();
  state.sessions.push({ date: new Date().toISOString(), questions: questions, totalTime: totalTime, marks: marks, difficulty: difficulty });
  if (state.sessions.length > 50) state.sessions = state.sessions.slice(-50);
  save(state);
};

window.getQuantAnalysis = function() {
  var cached = localStorage.getItem(CACHE_KEY);
  if (cached) { try { return JSON.parse(cached); } catch(e) {} }
  return window.runQuantEngine();
};

window.getQuantState = function() { return load(); };
window.getShortcuts = function() { return SHORTCUTS; };

})();
