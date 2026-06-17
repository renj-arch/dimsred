(function(){
var KEY = 'mental_training_data';
var defaultState = {
  totalPoints: 0,
  rank: 0,
  sessions: [],
  streaks: { current:0, best:0 },
  stats: { math: { attempts:0, correct:0 }, chain: { attempts:0, correct:0 }, pattern: { attempts:0, correct:0 }, trap: { attempts:0, correct:0 }, mixed: { attempts:0, correct:0 }, puzzle: { attempts:0, correct:0 } },
  difficulty: { level: 1, accuracy: 0.5, questionsAtLevel: 0 },
  badges: []
};

var RANKS = [
  { name:'Bronze Brains', minPoints:0, icon:'🥉' },
  { name:'Silver Thinker', minPoints:50, icon:'🥈' },
  { name:'Gold Mind', minPoints:150, icon:'🥇' },
  { name:'Platinum Processor', minPoints:300, icon:'💎' },
  { name:'Diamond Calculator', minPoints:500, icon:'🔷' },
  { name:'Master Genius', minPoints:800, icon:'🏆' }
];

var PATTERN_TYPES = ['Analogy','Classification','Series','Coding','Syllogism','Inequality','Direction','Blood Relation','Puzzle','Data Sufficiency'];
var TRAP_WORDS = ['except','not','incorrect','false','never','least','excluding','but not'];

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || JSON.parse(JSON.stringify(defaultState)); }
  catch(e) { return JSON.parse(JSON.stringify(defaultState)); }
}
function save(s) { localStorage.setItem(KEY, JSON.stringify(s)); }

function getRank(points) {
  var r = RANKS[0];
  for (var i = RANKS.length - 1; i >= 0; i--) { if (points >= RANKS[i].minPoints) { r = RANKS[i]; break; } }
  return r;
}

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = rand(0, i); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

// ====== QUESTION GENERATORS ======
var GENERATORS = {
  math: generateMathQuestion,
  chain: generateChainQuestion,
  pattern: generatePatternQuestion,
  trap: generateTrapQuestion,
  mixed: generateMixedQuestion
};

function generateMathQuestion(diff) {
  var types = [
    function square(){ var n = rand(10, 30 + diff * 5); return { q: n + '\u00B2', a: n * n, hint: 'Break ' + n + ' as (' + (Math.floor(n/10)*10) + '+' + (n%10) + ')\u00B2' }; },
    function percent(){ var p = [10,15,20,25,30,33,40,50][rand(0, diff > 2 ? 7 : 3)]; var n = rand(2, 9) * (diff > 1 ? 10 : 1); return { q: p + '% of ' + n, a: Math.round(n * p / 100), hint: p + '% = ' + p + '/100 = multiply by 0.' + p }; },
    function multiply(){ var a = rand(10, 20 + diff * 5); var b = rand(2, 5 + diff); return { q: a + ' \u00D7 ' + b, a: a * b, hint: 'Break ' + a + ' = ' + (Math.floor(a/10)*10) + ' + ' + (a%10) }; },
    function fraction(){ var a = rand(1, 9); var b = rand(2, 9); return { q: a + '/' + b + ' as %', a: Math.round(a / b * 100), hint: 'Multiply by 100 and divide' }; },
    function add3(){ var a = rand(10, 90); var b = rand(10, 90); var c = rand(10, 90); return { q: a + ' + ' + b + ' + ' + c, a: a + b + c, hint: 'Add first two, then third' }; },
    function diffSq(){ var a = rand(10, 20 + diff * 3); var b = rand(5, 10); return { q: a + '\u00B2 - ' + b + '\u00B2', a: (a*a) - (b*b), hint: 'Use identity: a\u00B2 - b\u00B2 = (a-b)(a+b)' }; }
  ];
  var type = types[rand(0, types.length - 1)];
  var data = type();
  var opts = [data.a];
  while (opts.length < 4) { var d = rand(-5, 5) + data.a; if (opts.indexOf(d) < 0 && d > 0) opts.push(d); }
  shuffle(opts);
  return { question: data.q, answer: data.a, options: opts, hint: data.hint, timeLimit: diff <= 1 ? 10 : (diff <= 3 ? 8 : 6), type: 'math' };
}

function generateChainQuestion(diff) {
  var steps = diff <= 1 ? 3 : (diff <= 3 ? 4 : 5);
  var val = rand(10, 50);
  var startVal = val;
  var chain = [];
  var ops = [ { s:'+', f:function(a,b){return a+b} }, { s:'-', f:function(a,b){return a-b} }, { s:'\u00D7', f:function(a,b){return a*b} } ];
  for (var i = 0; i < steps; i++) {
    var op = ops[rand(0, i < 2 ? 0 : (diff > 1 ? 2 : 0))];
    var num = rand(2, 15 + diff * 5);
    if (op.s === '-' && num > val) num = rand(2, val);
    if (op.s === '\u00D7') num = rand(2, 5 + diff * 2);
    chain.push({ op: op.s, num: num });
    val = op.f(val, num);
  }
  return {
    question: 'Chain: ' + startVal + ' ' + chain.map(function(c){ return c.op + ' ' + c.num; }).join(' '),
    answer: val,
    options: (function(){ var o = [val]; while(o.length < 4){ var d = rand(-3, 3) + val; if(o.indexOf(d) < 0) o.push(d); } shuffle(o); return o; })(),
    hint: 'Do each step in your head. Total ' + steps + ' steps.',
    timeLimit: diff <= 1 ? 30 : (diff <= 3 ? 25 : 20),
    type: 'chain',
    steps: chain
  };
}

function generatePatternQuestion(diff) {
  var pattern = PATTERN_TYPES[rand(0, PATTERN_TYPES.length - 1)];
  var texts = {
    'Analogy': ['Doctor : Hospital :: Teacher : ?','Book : Page :: Tree : ?','Hand : Glove :: Foot : ?','Pen : Write :: Knife : ?'],
    'Classification': ['Find odd one: 12, 24, 36, 51, 48','Find odd one: Square, Triangle, Circle, Rectangle','Find odd one: 121, 144, 169, 196, 200'],
    'Series': ['2, 6, 12, 20, ?','3, 9, 27, 81, ?','1, 4, 9, 16, 25, ?','3, 5, 8, 13, 21, ?'],
    'Coding': ['If CAT = 24, DOG = 26, then BAT = ?','If A=1, B=2, what is ZEBRA?','In a code, MAN = 182, then WOMAN = ?']
  };
  var pool = texts[pattern] || ['Identify the pattern type for this question'];
  var text = pool[rand(0, pool.length - 1)];
  var answers = { 'Analogy':'School', 'Classification':'Circle', 'Series':30, 'Coding':23 };
  var answerMap = { 'Doctor : Hospital :: Teacher : ?':'School', 'Book : Page :: Tree : ?':'Leaf', 'Hand : Glove :: Foot : ?':'Sock', 'Pen : Write :: Knife : ?':'Cut', 'Find odd one: 12, 24, 36, 51, 48':'51', 'Find odd one: Square, Triangle, Circle, Rectangle':'Circle', 'Find odd one: 121, 144, 169, 196, 200':'200', '2, 6, 12, 20, ?':'30', '3, 9, 27, 81, ?':'243', '1, 4, 9, 16, 25, ?':'36', '3, 5, 8, 13, 21, ?':'34', 'If CAT = 24, DOG = 26, then BAT = ?':'23', 'If A=1, B=2, what is ZEBRA?':'56', 'In a code, MAN = 182, then WOMAN = ?':'307' };
  var ans = answerMap[text] || 'Option B';
  var opts = [ans, 'None', 'Both', 'Cannot determine'];
  if (typeof ans === 'number') {
    opts = [ans, ans + 1, ans - 1, ans + 2];
    if (ans <= 1) opts = [ans, ans+1, ans+2, ans+3];
  }
  shuffle(opts);
  return {
    question: '(' + pattern + ') ' + text,
    answer: ans,
    options: opts,
    hint: 'Identify the pattern type first: ' + pattern,
    timeLimit: diff <= 1 ? 15 : (diff <= 3 ? 12 : 10),
    type: 'pattern',
    patternLabel: pattern
  };
}

function generateTrapQuestion(diff) {
  var word = TRAP_WORDS[rand(0, TRAP_WORDS.length - 1)];
  var scenarios = [
    { q: 'All dogs are mammals. Some mammals are cats. Which is true?', a: 'Cannot determine', opts: ['All dogs are cats','Some cats are dogs','Cannot determine','No dogs are cats'] },
    { q: 'Statement: ' + word.toUpperCase() + ' all A are B. Some B are C. Conclusion: Some A are C.', a: 'False', opts: ['True','False','Cannot determine','Depends'] },
    { q: 'Five friends sitting in a row. A is left of B. C is right of B. Who is in the middle?', a: 'B', opts: ['A','B','C','Cannot determine'] },
    { q: word.charAt(0).toUpperCase() + word.slice(1) + ' all squares are rectangles. All rectangles are polygons. Conclusion: All squares are polygons.', a: 'True', opts: ['True','False','Cannot determine','Depends'] }
  ];
  var s = scenarios[rand(0, scenarios.length - 1)];
  var opts = s.opts;
  shuffle(opts);
  return {
    question: '&#9888; Trap Alert: ' + s.q,
    answer: s.a,
    options: opts,
    hint: 'Watch for keywords like "' + word + '" that change the logic.',
    timeLimit: diff <= 1 ? 15 : (diff <= 3 ? 12 : 10),
    type: 'trap'
  };
}

function generateMixedQuestion(diff) {
  var types = ['math','chain','pattern','trap'];
  var type = types[rand(0, 3)];
  return GENERATORS[type](diff);
}

// ====== MAIN TRAINING FUNCTIONS ======
window.startMentalSession = function(mode) {
  var state = load();
  if (!mode || !GENERATORS[mode]) mode = 'mixed';
  var totalQ = (mode === 'puzzle') ? 5 : 10;
  var session = { mode: mode, questionIndex: 0, totalQuestions: totalQ, correct: 0, startTime: Date.now(), active: true };
  if (mode === 'puzzle') {
    // Generate all puzzles upfront
    session.puzzles = [];
    for (var i = 0; i < totalQ; i++) { session.puzzles.push(GENERATORS.puzzle(state.difficulty.level)); }
    session.puzzlePhase = 'clue';
    session.clueIndex = 0;
    session.puzzleIndex = 0;
  }
  return session;
};

window.getMentalQuestion = function(session) {
  if (!session || !session.active) return null;
  var state = load();
  var diff = state.difficulty.level;

  if (session.mode === 'puzzle') {
    var puzzle = session.puzzles[session.puzzleIndex];
    if (!puzzle) return null;
    if (session.puzzlePhase === 'clue') {
      var clueText = puzzle.clues[session.clueIndex];
      return {
        displayType: 'puzzle_clue',
        clueText: clueText,
        clueNum: session.clueIndex + 1,
        totalClues: puzzle.totalClues,
        index: session.puzzleIndex,
        total: session.totalQuestions,
        progress: Math.round(session.puzzleIndex / session.totalQuestions * 100),
        timeLimit: puzzle.clueTimeLimit,
        hint: puzzle.hint
      };
    } else {
      return {
        displayType: 'puzzle_question',
        question: puzzle.questionText,
        options: puzzle.options,
        answer: puzzle.answer,
        target: puzzle.target,
        index: session.puzzleIndex,
        total: session.totalQuestions,
        progress: Math.round(session.puzzleIndex / session.totalQuestions * 100),
        timeLimit: puzzle.timeLimit,
        hint: puzzle.hint
      };
    }
  }

  var q = GENERATORS[session.mode](diff);
  q.displayType = 'normal';
  q.index = session.questionIndex;
  q.total = session.totalQuestions;
  q.progress = Math.round(session.questionIndex / session.totalQuestions * 100);
  return q;
};

window.submitMentalAnswer = function(session, question, selectedAnswer, timeRemaining) {
  var state = load();
  if (!session || !session.active) return null;

  var correct = String(selectedAnswer) === String(question.answer);
  var timeLimit = question.timeLimit;
  var bonus = correct ? Math.round((timeRemaining / timeLimit) * 5) : 0;
  var basePoints = correct ? (question.difficulty || state.difficulty.level) * 2 : 0;
  var points = basePoints + bonus;

  // Puzzle mode uses puzzleIndex to track progress
  if (session.mode === 'puzzle' && session.puzzles) {
    session.puzzleIndex++;
  }
  session.questionIndex++;
  if (correct) session.correct++;

  // Update stats
  var mode = session.mode;
  if (state.stats[mode]) {
    state.stats[mode].attempts++;
    if (correct) state.stats[mode].correct++;
  }

  // Track streak
  if (correct) { state.streaks.current++; if (state.streaks.current > state.streaks.best) state.streaks.best = state.streaks.current; }
  else { state.streaks.current = 0; }

  // Update difficulty adaptively
  var modeStats = state.stats[mode];
  if (modeStats && modeStats.attempts >= 5) {
    var acc = modeStats.correct / modeStats.attempts;
    state.difficulty.accuracy = acc;
    if (acc > 0.8 && state.difficulty.level < 10) state.difficulty.level++;
    else if (acc < 0.4 && state.difficulty.level > 1) state.difficulty.level--;
  }

  // Add points
  state.totalPoints += points;

  // Check rank change
  var oldRank = getRank(state.totalPoints - points);
  var newRank = getRank(state.totalPoints);
  var rankUp = oldRank.name !== newRank.name;

  // Check session end
  var isComplete = session.questionIndex >= session.totalQuestions;

  if (isComplete) {
    session.active = false;
    var elapsed = Math.round((Date.now() - session.startTime) / 1000);
    var accuracy = session.totalQuestions > 0 ? Math.round(session.correct / session.totalQuestions * 100) : 0;
    state.sessions.push({ mode: session.mode, correct: session.correct, total: session.totalQuestions, accuracy: accuracy, time: elapsed, date: new Date().toISOString() });
    if (state.sessions.length > 50) state.sessions = state.sessions.slice(-50);
  }

  save(state);

  return {
    correct: correct,
    points: points,
    bonus: bonus,
    streak: state.streaks.current,
    pointsTotal: state.totalPoints,
    rank: newRank,
    rankUp: rankUp,
    isComplete: isComplete,
    accuracy: session.totalQuestions > 0 ? Math.round(session.correct / session.totalQuestions * 100) : 0,
    progress: Math.round(session.questionIndex / session.totalQuestions * 100)
  };
};

window.getMentalStats = function() {
  var state = load();
  var rank = getRank(state.totalPoints);
  return {
    points: state.totalPoints,
    rank: rank,
    streak: state.streaks.current,
    bestStreak: state.streaks.best,
    stats: state.stats,
    sessions: state.sessions.slice(-10).reverse(),
    difficulty: state.difficulty,
    totalSessions: state.sessions.length,
    overallAccuracy: (function(){
      var t = 0, c = 0;
      for (var m in state.stats) { t += state.stats[m].attempts; c += state.stats[m].correct; }
      return t > 0 ? Math.round(c / t * 100) : 0;
    })()
  };
};

window.getMentalRank = function(points) {
  return getRank(points || load().totalPoints);
};

window.resetMentalStats = function() {
  localStorage.removeItem(KEY);
  return JSON.parse(JSON.stringify(defaultState));
};

// ====== GRID PUZZLE GENERATOR (Person × State + Age) ======
var PUZZLE_STATES = ['Tripura', 'Manipur', 'Assam'];
var PUZZLE_LABELS = 'PQRSTUVWXYZ';
var PUZZLE_AGE_MIN = 18;
var PUZZLE_AGE_MAX = 65;

function genPuzzleSolution(labels) {
  var numS = labels.length <= 5 ? 2 : 3;
  var active = PUZZLE_STATES.slice(0, numS);
  var stateOf = {}, ages = {}, used = [];
  // Distribute: not more than 4, not less than 2 per state
  var shuf = shuffle(labels.slice());
  var per = Math.floor(labels.length / numS);
  var ext = labels.length % numS;
  var idx = 0;
  active.forEach(function(st, si) {
    var cnt = per + (si < ext ? 1 : 0);
    if (cnt < 2) cnt = 2;
    if (cnt > 4) cnt = 4;
    for (var i = 0; i < cnt && idx < shuf.length; i++) {
      stateOf[shuf[idx++]] = st;
    }
  });
  // Reassign any leftover (balance)
  while (idx < shuf.length) {
    var st2 = active[idx % active.length];
    stateOf[shuf[idx++]] = st2;
  }
  // Assign ages (unique, between 18-65)
  shuf.forEach(function(l) {
    var a;
    do { a = rand(PUZZLE_AGE_MIN, PUZZLE_AGE_MAX); } while (used.indexOf(a) >= 0);
    used.push(a);
    ages[l] = a;
  });
  return {
    labels: labels, states: active, stateOf: stateOf, ageOf: ages,
    entitiesIn: function(st) { return labels.filter(function(l) { return stateOf[l] === st; }); }
  };
}

function clueSameState(sol, a, b) {
  if (sol.stateOf[a] === sol.stateOf[b]) return a + ' and ' + b + ' belong to the same state.';
  return '';
}
function clueDiffState(sol, a, b) {
  if (sol.stateOf[a] !== sol.stateOf[b]) return a + ' and ' + b + ' do not belong to the same state.';
  return '';
}
function clueEldest(sol, a) {
  var same = sol.entitiesIn(sol.stateOf[a]);
  var ages = same.map(function(l) { return sol.ageOf[l]; });
  var max = Math.max.apply(null, ages);
  if (sol.ageOf[a] === max) return a + ' is the eldest person in ' + sol.stateOf[a] + '.';
  return '';
}
function clueYoungest(sol, a) {
  var same = sol.entitiesIn(sol.stateOf[a]);
  var ages = same.map(function(l) { return sol.ageOf[l]; });
  var min = Math.min.apply(null, ages);
  if (sol.ageOf[a] === min) return a + ' is the youngest person in ' + sol.stateOf[a] + '.';
  return '';
}
function clueSpecificAgeState(sol, age, state) {
  for (var l in sol.ageOf) { if (sol.ageOf[l] === age) { if (sol.stateOf[l] === state) return 'The one who is ' + age + ' yrs belongs to ' + state + '.'; } }
  return '';
}
function clueAgeDiff(sol, a, b, diff) {
  if (sol.ageOf[a] - sol.ageOf[b] === diff) return a + "'s age is " + diff + ' yrs more than ' + b + "'s age.";
  if (sol.ageOf[b] - sol.ageOf[a] === diff) return b + "'s age is " + diff + ' yrs more than ' + a + "'s age.";
  return '';
}
function clueAgeRatio(sol, a, b, ratio) {
  if (Math.abs(sol.ageOf[a] / sol.ageOf[b] - ratio) < 0.01) return a + "'s age is " + ratio + ' times ' + b + "'s age.";
  return '';
}
function clueElderThan(sol, a, b) {
  if (sol.ageOf[a] > sol.ageOf[b]) return a + ' is elder than ' + b + '.';
  if (sol.ageOf[b] > sol.ageOf[a]) return b + ' is elder than ' + a + '.';
  return '';
}
function clueNotState(sol, a, excludeStates) {
  var st = sol.stateOf[a];
  var others = excludeStates.filter(function(s) { return s !== st; });
  if (others.length === excludeStates.length - 1) {
    return a + ' does not belong to ' + others.join(' and ') + '.';
  }
  return '';
}
function clueSameStateOnlyTwo(sol, a, b) {
  if (sol.stateOf[a] === sol.stateOf[b]) {
    var same = sol.entitiesIn(sol.stateOf[a]);
    if (same.length === 2) return a + ' and the one who is ' + sol.ageOf[b] + ' yrs old belong to the same state and these are the only persons belonging to that state.';
  }
  return '';
}
function clueSameStateAgeRef(sol, a, ageVal) {
  for (var l in sol.ageOf) {
    if (sol.ageOf[l] === ageVal && sol.stateOf[l] === sol.stateOf[a] && l !== a) {
      return a + ' and the one who is ' + ageVal + ' yrs old belong to the same state.';
    }
  }
  return '';
}
function clueParity(sol, a) {
  if (sol.ageOf[a] % 2 === 0) return a + "'s age is an even number.";
  return a + "'s age is an odd number.";
}
function clueMinAge(sol, minAge) {
  var allAges = Object.keys(sol.ageOf).map(function(k) { return sol.ageOf[k]; });
  var min = Math.min.apply(null, allAges);
  if (min === minAge) return 'The minimum age is ' + minAge + ' yrs.';
  return '';
}
function clueSpecificAgeStateReverse(sol, state, ageVal) {
  for (var l in sol.ageOf) {
    if (sol.ageOf[l] === ageVal && sol.stateOf[l] === state) {
      return l + ' is ' + ageVal + ' yrs old and belongs to ' + state + '.';
    }
  }
  return '';
}
function clueNotYoungest(sol, a) {
  var allAges = Object.keys(sol.ageOf).map(function(k) { return sol.ageOf[k]; });
  var min = Math.min.apply(null, allAges);
  if (sol.ageOf[a] !== min) return a + ' is not the youngest person.';
  return '';
}
function clueSameStateWithOrder(sol, a, b) {
  if (sol.stateOf[a] === sol.stateOf[b]) {
    var elder = sol.ageOf[a] > sol.ageOf[b] ? a : b;
    var younger = sol.ageOf[a] > sol.ageOf[b] ? b : a;
    return elder + ' and ' + younger + ' belong to the same state where ' + elder + ' is elder than ' + younger + '.';
  }
  return '';
}

function generatePuzzleClues(sol) {
  var clues = [];
  var labels = sol.labels;
  // Direct state clues (from age references)
  var usedAges = [];
  labels.forEach(function(l) { usedAges.push(sol.ageOf[l]); });
  shuffle(usedAges);
  // Pick 2-3 age→state specific clues
  var numDirect = Math.min(usedAges.length, 2 + rand(0, 1));
  for (var i = 0; i < numDirect; i++) {
    var c = clueSpecificAgeStateReverse(sol, sol.stateOf[labels[i % labels.length]], sol.ageOf[labels[i % labels.length]]);
    if (c) clues.push(c);
  }
  // Same state pairs (use 2-3)
  var pairs = [];
  for (var i = 0; i < labels.length; i++) {
    for (var j = i + 1; j < labels.length; j++) {
      if (sol.stateOf[labels[i]] === sol.stateOf[labels[j]]) pairs.push([labels[i], labels[j]]);
    }
  }
  shuffle(pairs);
  for (var i = 0; i < Math.min(pairs.length, 3); i++) {
    clues.push(clueSameState(sol, pairs[i][0], pairs[i][1]));
  }
  // Different state pairs (use 2)
  var diffPairs = [];
  for (var i = 0; i < labels.length; i++) {
    for (var j = i + 1; j < labels.length; j++) {
      if (sol.stateOf[labels[i]] !== sol.stateOf[labels[j]]) diffPairs.push([labels[i], labels[j]]);
    }
  }
  shuffle(diffPairs);
  for (var i = 0; i < Math.min(diffPairs.length, 2); i++) {
    clues.push(clueDiffState(sol, diffPairs[i][0], diffPairs[i][1]));
  }
  // Age relationships
  var agePairs = [];
  for (var i = 0; i < labels.length; i++) {
    for (var j = i + 1; j < labels.length; j++) {
      var diff = Math.abs(sol.ageOf[labels[i]] - sol.ageOf[labels[j]]);
      if (diff >= 3 && diff <= 12) agePairs.push([labels[i], labels[j], diff]);
    }
  }
  shuffle(agePairs);
  if (agePairs.length > 0) {
    var ap = agePairs[0];
    clues.push(clueAgeDiff(sol, ap[0], ap[1], ap[2]));
  }
  // Elder/younger (1 clue)
  var orderPairs = [];
  for (var i = 0; i < labels.length; i++) {
    for (var j = i + 1; j < labels.length; j++) {
      orderPairs.push([labels[i], labels[j]]);
    }
  }
  shuffle(orderPairs);
  if (orderPairs.length > 0) clues.push(clueElderThan(sol, orderPairs[0][0], orderPairs[0][1]));
  // Extremum (eldest in state)
  shuffle(labels);
  for (var i = 0; i < labels.length; i++) {
    var c3 = clueEldest(sol, labels[i]);
    if (c3) { clues.push(c3); break; }
  }
  // Same state with order
  shuffle(pairs);
  if (pairs.length > 0) {
    var c4 = clueSameStateWithOrder(sol, pairs[0][0], pairs[0][1]);
    if (c4) clues.push(c4);
  }
  // Age parity
  clues.push(clueParity(sol, labels[rand(0, labels.length - 1)]));
  // Not youngest
  shuffle(labels);
  for (var i = 0; i < labels.length; i++) {
    var c5 = clueNotYoungest(sol, labels[i]);
    if (c5) { clues.push(c5); break; }
  }
  // Minimum age
  clues.push(clueMinAge(sol, 18));
  // Negative state (X does not belong to A and B → belongs to C)
  shuffle(labels);
  for (var i = 0; i < labels.length; i++) {
    var others = sol.states.filter(function(s) { return s !== sol.stateOf[labels[i]]; });
    if (others.length === 2) {
      clues.push(labels[i] + ' does not belong to ' + others.join(' and ') + '.');
      break;
    }
  }

  // Deduplicate and shuffle
  var seen = {};
  var uniq = [];
  clues.forEach(function(c) {
    if (c && c.length > 5 && !seen[c]) { seen[c] = true; uniq.push(c); }
  });
  shuffle(uniq);
  return uniq;
}

function pickPuzzleQuestion(sol, clues) {
  // Pick a random entity and ask their age
  var labels = sol.labels.slice();
  shuffle(labels);
  var target = labels[0];
  var answer = sol.ageOf[target];

  var opts = [answer];
  while (opts.length < 4) {
    var d = answer + rand(-5, 5);
    if (opts.indexOf(d) < 0 && d >= 18 && d <= 65) opts.push(d);
  }
  shuffle(opts);

  var clueCount = clues.length;
  return {
    text: 'What is the age of ' + target + '?',
    answer: answer,
    options: opts,
    target: target,
    totalClues: clueCount
  };
}

function generatePuzzleQuestion(diff) {
  var numEntities = Math.min(9, 4 + Math.floor(diff * 0.55));
  var labels = PUZZLE_LABELS.slice(0, numEntities).split('');
  var sol = genPuzzleSolution(labels);
  var clues = generatePuzzleClues(sol);
  var q = pickPuzzleQuestion(sol, clues);
  return {
    type: 'puzzle',
    entities: labels,
    states: sol.states,
    clues: clues,
    questionText: q.text,
    answer: q.answer,
    options: q.options,
    target: q.target,
    totalClues: q.totalClues,
    timeLimit: 20 + diff * 2,
    clueTimeLimit: Math.max(5, 12 - Math.floor(diff / 2)),
    hint: 'Build a mental grid: ' + labels.join(', ') + ' × [' + sol.states.join(', ') + ']. Picture each clue as filling cells.'
  };
}

// Override mixed to include puzzle
GENERATORS.puzzle = generatePuzzleQuestion;
var _origMixed = GENERATORS.mixed;
GENERATORS.mixed = function(diff) {
  var types = ['math', 'chain', 'pattern', 'trap', 'puzzle'];
  return GENERATORS[types[rand(0, 4)]](diff);
};

// Expose generators for testing
window.getMentalGenerators = function() { return GENERATORS; };

})();
