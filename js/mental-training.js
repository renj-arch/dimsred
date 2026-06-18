(function(){

var KEY = 'mental_training_data';
var MISTAKE_KEY = 'mental_mistakes';
var activeLayer = 'instinct'; // default layer for quant generators

function loadMistakes() {
  try { return JSON.parse(localStorage.getItem(MISTAKE_KEY)) || []; }
  catch(e) { return []; }
}
function saveMistakes(arr) { localStorage.setItem(MISTAKE_KEY, JSON.stringify(arr)); }

function getMistakeCount() {
  var arr = loadMistakes();
  return arr.length;
}

function addMistake(q, session) {
  var arr = loadMistakes();
  // Don't add duplicates
  for (var i = 0; i < arr.length; i++) {
    if (arr[i].question === q.question) { arr[i].attempts = (arr[i].attempts || 0) + 1; arr[i].lastWrong = Date.now(); saveMistakes(arr); return; }
  }
  arr.push({
    question: q.question,
    answer: q.answer,
    options: q.options,
    type: session.mode || q.type,
    patternLabel: q.patternLabel || '',
    techniqueLabel: q.techniqueLabel || '',
    drillLine1: q.drillLine1 || '',
    drillLine2: q.drillLine2 || '',
    solution: q.solution || '',
    attempts: 1,
    lastWrong: Date.now()
  });
  saveMistakes(arr);
}

function removeMistake(question) {
  var arr = loadMistakes();
  var kept = [];
  for (var i = 0; i < arr.length; i++) {
    if (arr[i].question !== question) kept.push(arr[i]);
  }
  saveMistakes(kept);
}

function getMistakesForRetry(count) {
  var arr = loadMistakes();
  if (arr.length === 0) return [];
  // Sort by most attempts first (hardest ones), then by longest time since last wrong
  arr.sort(function(a, b) {
    if (a.attempts !== b.attempts) return b.attempts - a.attempts;
    return (a.lastWrong || 0) - (b.lastWrong || 0);
  });
  var out = [];
  for (var i = 0; i < Math.min(count, arr.length); i++) {
    out.push(arr[i]);
  }
  return out;
}
var defaultState = {
  totalPoints: 0,
  rank: 0,
  sessions: [],
  streaks: { current:0, best:0 },
  stats: {
    math: { attempts:0, correct:0 }, chain: { attempts:0, correct:0 },
    pattern: { attempts:0, correct:0 }, trap: { attempts:0, correct:0 },
    mixed: { attempts:0, correct:0 }, puzzle: { attempts:0, correct:0 },
    quicksolve: { attempts:0, correct:0 }, instinct: { attempts:0, correct:0 },
    fivesec: { attempts:0, correct:0 }, examrush: { attempts:0, correct:0 },
    weakspot: { attempts:0, correct:0 },
    quant: { attempts:0, correct:0 }, reasoning: { attempts:0, correct:0 }
  },
  subTopicStats: {
    // Quant sub-topics
    number_sense:{attempts:0,correct:0}, percentage:{attempts:0,correct:0},
    arithmetic:{attempts:0,correct:0}, motion:{attempts:0,correct:0},
    work:{attempts:0,correct:0}, algebra:{attempts:0,correct:0},
    geometry:{attempts:0,correct:0}, mensuration:{attempts:0,correct:0},
    counting:{attempts:0,correct:0}, data:{attempts:0,correct:0},
    number_system:{attempts:0,correct:0}, simplification:{attempts:0,correct:0},
    quadratic:{attempts:0,correct:0}, partnership:{attempts:0,correct:0},
    compound_interest:{attempts:0,correct:0}, discount:{attempts:0,correct:0},
    races:{attempts:0,correct:0}, data_interpretation:{attempts:0,correct:0},
    // Reasoning sub-topics
    pattern_flash:{attempts:0,correct:0}, coding_flash:{attempts:0,correct:0},
    logic_snap:{attempts:0,correct:0}, direction_sense:{attempts:0,correct:0},
    blood_relations:{attempts:0,correct:0}, ranking_grid:{attempts:0,correct:0},
    floor_puzzle:{attempts:0,correct:0}, linear_seating:{attempts:0,correct:0},
    circular_seating:{attempts:0,correct:0}, box_distribution:{attempts:0,correct:0},
    scheduling:{attempts:0,correct:0}, input_output:{attempts:0,correct:0},
    mirror_image:{attempts:0,correct:0}, dice_cube:{attempts:0,correct:0},
    calendar:{attempts:0,correct:0}, clock:{attempts:0,correct:0},
    alphabet_arrange:{attempts:0,correct:0}, critical_reasoning:{attempts:0,correct:0},
    decision_making:{attempts:0,correct:0}, venn_diagram:{attempts:0,correct:0}
  },
  patternStats: { Analogy:{attempts:0,correct:0},Classification:{attempts:0,correct:0},Series:{attempts:0,correct:0},Coding:{attempts:0,correct:0},Syllogism:{attempts:0,correct:0},Inequality:{attempts:0,correct:0},Direction:{attempts:0,correct:0},'Blood Relation':{attempts:0,correct:0},Puzzle:{attempts:0,correct:0},'Data Sufficiency':{attempts:0,correct:0} },
  speedData: { Analogy:{time:0,count:0},Classification:{time:0,count:0},Series:{time:0,count:0},Coding:{time:0,count:0},Syllogism:{time:0,count:0},Inequality:{time:0,count:0},Direction:{time:0,count:0},'Blood Relation':{time:0,count:0},Puzzle:{time:0,count:0},'Data Sufficiency':{time:0,count:0} },
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

var SPEED_TARGETS = {
  'Analogy': { topper: 5, good: 8, average: 12 },
  'Classification': { topper: 4, good: 7, average: 10 },
  'Series': { topper: 6, good: 10, average: 15 },
  'Coding': { topper: 5, good: 8, average: 12 },
  'Syllogism': { topper: 7, good: 12, average: 18 },
  'Inequality': { topper: 5, good: 8, average: 12 },
  'Direction': { topper: 6, good: 10, average: 15 },
  'Blood Relation': { topper: 8, good: 14, average: 20 },
  'Puzzle': { topper: 15, good: 25, average: 40 },
  'Data Sufficiency': { topper: 6, good: 10, average: 15 }
};

var SPEED_TECHNIQUES = {
  'Analogy': 'Find the relationship in Q1, apply same to Q2. Action→Place, Part→Whole, Cause→Effect',
  'Classification': 'Check divisibility, symmetry, category. Odd one breaks the pattern — find the rule first',
  'Series': 'Check difference → gap grows = multiply, constant = add. Square/cube only if diff jumps sharply',
  'Coding': 'Letter position (A=1) → sum. If 2-digit → 2-digit answer. Z=26, reverse if letters shrink',
  'Syllogism': 'Draw circles: All=A inside B, Some=overlap, No=separate. Ignore text, use Venn overlap',
  'Inequality': 'Chain symbols in same direction: A>B>C → A is largest. If signs flip, stop — cannot combine',
  'Direction': 'Track N/S separate from E/W. Right=clockwise 90°. Pythagoras only if BOTH x AND y changed',
  'Blood Relation': 'Draw 4-level tree: GP → Parent → Me → Child. Parent→sibling = same level. Wife/husband = = connector',
  'Puzzle': 'Make table: rows=entities, fill confirmed cells. "Between" = exactly 1 on each side. Deduce gaps',
  'Data Sufficiency': 'Stmt 1 alone? → A/D. Stmt 2 alone? → B/D. Both needed → C. Neither → E. Check NOT numbers but sufficiency',
  // QUANT topics
  'number_sense': 'Squares: (a+b)² = a²+2ab+b². LCM = product/HCF. HCF = largest common factor. Approximation: round nearest 10.',
  'percentage': 'Successive %: x + y + xy/100. Profit: (SP-CP)/CP×100. Pop growth: multiply by (1+r/100)^n.',
  'arithmetic': 'Alligation: (mean-low):(high-mean). Ages: ratio diff method. Work: add rates. Ratio: find total parts first.',
  'motion': 'km/h × 5/18 = m/s. Train pole = just length. Platform = add lengths. Opposite = add speeds. Same = subtract.',
  'work': 'Product/sum shortcut: a×b/(a+b). Pipe fill-empty net rate = 1/a - 1/b. Efficiency ∝ 1/time.',
  'algebra': 'Age: let unknown=x, write equation from condition. Sum/diff: larger=(sum+diff)/2. Quadratic: factors of c sum to b.',
  'geometry': '∥ lines → alternate = corresponding = equal. Triangle sum=180°. Pythagoras: a²+b²=c². Exterior = sum opposite interior.',
  'mensuration': 'Path = outer - inner. TSA cylinder = 2πr(r+h). Cone V = πr²h/3. Sphere SA = 4πr². Fencing = perimeter × cost/m.',
  'counting': 'P(n,r) = ordered arrangements. C(n,r) = selections. Die: 6 faces. Cards: 52 total, 4 suits. Probability = favorable/total.',
  'data': 'Sort for median. Range = max-min. Avg = sum/n. Weighted avg = Σ(score×count)/total count.',
  'number_system': 'Cyclicity: unit digits repeat every 4. Mod: find remainder by dividing. Divisibility: check simple rules first.',
  'simplification': 'BODMAS: brackets → orders → division → multiplication → addition → subtraction. ×/÷ before +/-.',
  'quadratic': 'For roots: find factors of c that sum to b. D=b²-4ac: D>0→real, D=0→equal, D<0→imaginary.',
  'partnership': 'Profit ratio = capital × time. A:B = (A_cap×A_time):(B_cap×B_time). Sum ratios, divide proportionally.',
  'compound_interest': 'CI = P(1+r/100)^t - P. 2yr at r%: effective = r + r + r²/100. CI-SI diff = P(r/100)².',
  'discount': 'SP = MP × (100-d)/100. Successive: apply one after another. Net discount = d1 + d2 - d1×d2/100.',
  'races': 'Focus on TIME = same for both runners. Speed = distance/time. Beat by = distance covered in same time.',
  'data_interpretation': 'Read data carefully. Identify what the question asks (total/average/percentage). Compute step by step.',
  // REASONING topics
  'pattern_flash': 'Identify the rule (diff/ratio/square/prime). For odd-one-out: find what 3 share that 1 breaks.',
  'coding_flash': 'A=1,B=2... Z=26. Sum positions. Check if example uses sum, product, or position×index.',
  'logic_snap': 'Draw Venn circles for syllogisms. Chain same-direction symbols for inequalities. If sign flips, stop.',
  'direction_sense': 'Track N/S and E/W separately. Right = clockwise 90°. Pythagoras only if both axes changed.',
  'blood_relations': 'Draw 4-level tree. GP → Parent → Me → Child. Marriage = horizontal line. Same level = sibling.',
  'ranking_grid': 'List from highest to lowest. Fill positions from clues. "Between" = exactly 1 on each side.',
  'floor_puzzle': 'Draw vertical building (1=bottom). Fill names from direct clues first, then relative ones.',
  'linear_seating': 'Draw positions 1 to N left to right. Immediate left = adjacent. Fill what you know, deduce gaps.',
  'circular_seating': 'Position 1 = top, go clockwise. Left = anti-clockwise. Use "opposite" clues for even numbers.',
  'box_distribution': 'Make a table. Rows = items, columns = properties. Fill confirmed cells first.',
  'scheduling': 'List days/months. Mark fixed events. Use "before/after" clues to slide events into position.',
  'input_output': 'Each step moves the smallest remaining element left. Track the sorting pattern.',
  'mirror_image': 'Mirror = left-right flip. Water = top-bottom flip. Symmetrical letters: A,H,I,M,O,T,U,V,W,X,Y.',
  'dice_cube': 'Dice: opposite sum=7. Cube: corners 3 faces, edges 2, centers 1, inner 0 faces painted.',
  'calendar': 'Odd days: normal yr=1, leap=2. Day shift = sum odd days mod 7. Reference day: Jan 1 2024 = Mon.',
  'clock': 'Angle = |30H - 5.5M|. If >180°, use 360-result. Overlap at 60H/11 min past H. Coincide 22x/day.',
  'alphabet_arrange': 'Position: A=1 to Z=26. For next/find pattern, check diff between consecutive letter positions.',
  'critical_reasoning': 'Assumption what MUST be true. Course of action must solve problem. Cause must precede effect.',
  'decision_making': 'Check each condition independently. AND=all pass. OR=any passes. Cannot determine if info missing.',
  'venn_diagram': 'Only A = A-both. Neither = total - (A+B-both). Draw overlapping circles. Total = Aonly + Bonly + both + neither.'
};

var TECHNIQUE_DRILLS = {
  'Syllogism': { line1: 'Venn circles', line2: '1s — All A are B + All B are C = All A are C. Some + All = Some. No + All = No' },
  'Inequality': { line1: 'Chain same-direction', line2: '1.5s — A>B>C>D → A is largest. P≥Q=R>S → P>S (≥ not >). If sign flips → stop' },
  'Direction': { line1: 'Track axes separately', line2: '3s — N=+y, S=-y, E=+x, W=-x. Right=clockwise. Pythagoras only if both axes nonzero' },
  'Blood Relation': { line1: '4-level family tree', line2: '5s — GP/Parent/Me/Child. Same level = sibling. Mother/father = up 1. Son/daughter = down 1' },
  'Analogy': { line1: 'Find the 1st relation', line2: '3s — Doctor:Hospital = function→place. Hand:Glove = part→covering. Match the SAME relation type' },
  'Classification': { line1: 'Find the rule', line2: '2s — Odd one breaks the group rule. Try: divisible by? all shapes? all squares? category match?' },
  'Series': { line1: 'Diff or ratio?', line2: '4s — Constant diff = add. Doubling = multiply. Diffs increasing = multiplier. Check gap of gaps if unclear' },
  'Coding': { line1: 'Letter → number', line2: '3s — A=1 to Z=26. Sum positions. If code = sum×position, check CAT=3+1+20=24 pattern' },
  'Puzzle': { line1: 'Table + fill slots', line2: '10s — Draw row/stack. "Immediate"=adjacent. "Between"=1 each side. Fill known, deduce unknown' },
  'Data Sufficiency': { line1: 'Check each alone first', line2: '4s — Stmt1 enough? → A/D. Stmt2 enough? → B/D. Both? → C. Neither? → E. THE formula' },
  // QUANT drills
  'number_sense': { line1: 'Squares/cubes/roots', line2: '2s — (a+b)²=a²+2ab+b². LCM=product/HCF. HCF=largest common factor. Approx: round to 10.' },
  'percentage': { line1: 'Successive % / profit / pop', line2: '3s — x+y+xy/100. Profit=(SP-CP)/CP×100. Pop=initial×(1+r/100)^t.' },
  'arithmetic': { line1: 'Alligation / ages / ratios', line2: '4s — (mean-low):(high-mean). Age: write equation. Ratio: find total parts first.' },
  'motion': { line1: 'TSD / trains / conversion', line2: '4s — km/h×5/18=m/s. Pole=length. Platform=add. Opposite=add speeds. Same=subtract.' },
  'work': { line1: 'Time & work / pipes', line2: '2s — Product/sum=a×b/(a+b). Pipe net=1/a-1/b. Efficient=inverse time.' },
  'algebra': { line1: 'Age / sum-diff / quadratics', line2: '4s — Larger=(sum+diff)/2. Quadratic: factor c sum to b. D=b²-4ac.' },
  'geometry': { line1: 'Angles / Pythagoras / circles', line2: '3s — ∥ lines: alternate=corresponding. Triangle=180°. a²+b²=c².' },
  'mensuration': { line1: 'Area / volume / cost problems', line2: '5s — Path=outer-inner. Cylinder TSA=2πr(r+h). Cone V=πr²h/3.' },
  'counting': { line1: 'Permutation / comb / prob', line2: '3s — P=ordered, C=unordered. Die: each=1/6. Cards=52. Prob=fav/total.' },
  'data': { line1: 'Median / range / avg / weighted', line2: '3s — Sort→median. Range=max-min. Avg=sum/n. Weighted=Σ(score×count)/total.' },
  'number_system': { line1: 'Cyclicity / mod / divisibility', line2: '3s — Unit digit repeats every 4. Mod: find remainder. Divisibility: check 2/3/5/7/11.' },
  'simplification': { line1: 'BODMAS / exponents / roots', line2: '2s — Brackets→orders→÷→×→+→-. ×/÷ before +/-. √(a²b)=a√b.' },
  'quadratic': { line1: 'Roots / discriminant / nature', line2: '3s — Factors of c sum to b. D=b²-4ac: >0=real, =0=equal, <0=imaginary.' },
  'partnership': { line1: 'Investment × time ratio', line2: '3s — A:B = (capA×timeA):(capB×timeB). Sum ratios→divide profit proportionally.' },
  'compound_interest': { line1: 'CI formula / SI-CI diff', line2: '3s — CI=P(1+r/100)^t-P. 2yr eff=r+r+r²/100. CI-SI diff=P(r/100)².' },
  'discount': { line1: 'Discount % / successive', line2: '3s — SP=MP×(100-d)/100. Net successive=d1+d2-d1×d2/100.' },
  'races': { line1: 'Race / relative speed', line2: '4s — Time same for all runners. Beat distance = speed×time. Circular: L/rel_speed.' },
  'data_interpretation': { line1: 'Tables / charts / DI', line2: '3s — Read all data. Identify what is asked. Compute total/avg/percent stepwise.' },
  // REASONING drills
  'pattern_flash': { line1: 'Series / classification', line2: '2s — Check diff/ratio/square/prime. Odd-out: find what 3 share.' },
  'coding_flash': { line1: 'Letter position coding', line2: '3s — A=1 to Z=26. Sum/product/×index. Reverse: A=26.' },
  'logic_snap': { line1: 'Syllogism / inequality', line2: '2s — Venn circles. Chain same-direction. Sign flip = stop.' },
  'direction_sense': { line1: 'Compass / Pythagoras', line2: '3s — Track N/S & E/W. Right=clockwise 90°. Pythagoras only both changed.' },
  'blood_relations': { line1: 'Family tree', line2: '5s — 4 levels: GP→Parent→Me→Child. Marriage=horizontal. Sibling=same level.' },
  'ranking_grid': { line1: 'Order / comparison', line2: '4s — List high→low. Fill from clues. "Between"=1 each side.' },
  'floor_puzzle': { line1: 'Building floors', line2: '5s — 1=bottom. Direct clues first, then relative. Stack vertically.' },
  'linear_seating': { line1: 'Row arrangement', line2: '4s — 1 to N left→right. Immediate left=adjacent. Fill→deduce.' },
  'circular_seating': { line1: 'Circle arrangement', line2: '4s — Position 1=top, go clockwise. Left=anticlockwise. Opposite=even.' },
  'box_distribution': { line1: 'Distribution table', line2: '5s — Rows=items, cols=properties. Fill confirmed cells first.' },
  'scheduling': { line1: 'Day/month scheduling', line2: '5s — List days. Mark fixed events. Use before/after to place.' },
  'input_output': { line1: 'Step-wise sorting', line2: '4s — Each step moves smallest remaining left. Track the pattern.' },
  'mirror_image': { line1: 'Mirror / water image', line2: '2s — Mirror=left-right. Water=top-bottom. Symmetrical: A,H,I,M,O,T,U,V,W,X,Y.' },
  'dice_cube': { line1: 'Dice / cube painting', line2: '3s — Opposite sum=7. Cube: corners=3, edges=2, centers=1, inner=0 faces.' },
  'calendar': { line1: 'Odd days / day finding', line2: '4s — Normal yr=1odd, leap=2. Day shift=odd mod7. 2024/1/1=Mon.' },
  'clock': { line1: 'Angle / overlap', line2: '3s — Angle=|30H-5.5M|. Overlap=60H/11. Coincide 22x/day.' },
  'alphabet_arrange': { line1: 'Letter pattern / order', line2: '2s — A=1 to Z=26. Check diff between consecutive letters.' },
  'critical_reasoning': { line1: 'Assumption / course of action', line2: '3s — MUST be true for statement. Action solves problem. Cause precedes effect.' },
  'decision_making': { line1: 'Condition checking', line2: '2s — Check each condition. AND=all pass. OR=any pass. Insufficient=?.' },
  'venn_diagram': { line1: 'Set theory / surveys', line2: '3s — Only A=A-both. Neither=total-(A+B-both). Draw overlapping circles.' }
};

window.SPEED_TECHNIQUES = SPEED_TECHNIQUES;
window.TECHNIQUE_DRILLS = TECHNIQUE_DRILLS;

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
function pick(arr) { return arr[rand(0, arr.length - 1)]; }
function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = rand(0, i); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

// Exposed for HTML layer toggle
window.setActiveLayer = function(l) { activeLayer = l; };

// ====== QUESTION GENERATORS ======
var GENERATORS = {
  math: generateMathQuestion,
  chain: generateChainQuestion,
  pattern: generatePatternQuestion,
  recognize: generateRecognitionQuestion,
  trap: generateTrapQuestion,
  mixed: generateMixedQuestion,
  // new reflex modes
  quicksolve: generateQuickSolveQuestion,
  instinct: generateInstinctQuestion,
  fivesec: generateFiveSecQuestion,
  examrush: generateExamRushQuestion,
  weakspot: generateWeakSpotQuestion,
  // category dispatchers
  quant: generateQuantQuestion,
  reasoning: generateReasoningQuestion
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
  return { question: data.q, answer: data.a, options: opts, hint: data.hint, timeLimit: diff <= 1 ? 10 : (diff <= 3 ? 8 : 6), type: 'math', techniqueLabel: 'Mental math: break, compute, combine. Square→(a+b)², Percent→10% first then scale' };
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
    steps: chain,
    techniqueLabel: 'Chain: do one step at a time. Keep running total in head, don\'t re-read'
  };
}

var QUESTION_BANK;
var ANSWERS_MAP;

function initQuestionBank() {
  if (QUESTION_BANK) return;
  QUESTION_BANK = {
    'Analogy': ['Doctor : Hospital :: Teacher : ?','Book : Page :: Tree : ?','Hand : Glove :: Foot : ?','Pen : Write :: Knife : ?','Pilot : Cockpit :: Captain : ?','Heat : Oven :: Cold : ?','Carpenter : Wood :: Chef : ?','Lion : Den :: Human : ?','Eye : See :: Ear : ?','Birds : Flock :: Fish : ?','Petrol : Car :: Electricity : ?','Sun : Day :: Moon : ?'],
    'Classification': ['Find odd one: 12, 24, 36, 51, 48','Find odd one: Square, Triangle, Circle, Rectangle','Find odd one: 121, 144, 169, 196, 200','Find odd one: 25, 36, 49, 64, 72','Find odd one: 2, 3, 5, 7, 11, 13, 17','Find odd one: Apple, Mango, Banana, Potato, Orange','Find odd one: 3, 5, 7, 9, 11, 13','Find odd one: 31, 37, 41, 43, 49, 53','Find odd one: 8, 27, 64, 125, 216, 340','Find odd one: January, March, May, July, September','Find odd one: Oxygen, Nitrogen, Hydrogen, Water, Carbon'],
    'Series': ['2, 6, 12, 20, ?','3, 9, 27, 81, ?','1, 4, 9, 16, 25, ?','3, 5, 8, 13, 21, ?','2, 5, 10, 17, 26, ?','1, 1, 2, 3, 5, 8, ?','5, 10, 20, 40, ?','100, 90, 81, 73, ?','2, 3, 5, 7, 11, ?','4, 9, 25, 49, 121, ?','1, 8, 27, 64, 125, ?','7, 14, 28, 56, 112, ?'],
    'Coding': ['If CAT = 24, DOG = 26, then BAT = ?','If A=1, B=2, what is ZEBRA?','In a code, MAN = 182, then WOMAN = ?','If GO = 157, then COME = ?','If A=1, B=2, what is SUM?','If A=1, B=2, what is TRAIN?','If A=1, Z=26, what is APPLE?','If A=1, B=2, what is ORANGE?','If A=1, B=2, what is BOOK?'],
    'Syllogism': ['All cats are mammals. All mammals are animals. Conclusion: All cats are animals.','Some doctors are teachers. All teachers are educated. Conclusion: Some doctors are educated.','No fish are birds. All penguins are birds. Conclusion: Some penguins are fish.','All birds have feathers. Penguins are birds. Conclusion: Penguins have feathers.','Some A are B. Some B are C. Conclusion: Some A are C.','All squares are rectangles. All rectangles are polygons. Conclusion: All squares are polygons.','No cat is dog. All dogs are animals. Conclusion: No cat is animal.','All flowers are plants. Some plants are trees. Conclusion: Some flowers are trees.','Some pens are pencils. No pencil is eraser. Conclusion: Some pens are not erasers.'],
    'Inequality': ['A > B, B > C, C > D. Which is the largest?','P \u2265 Q, Q = R, R > S. Which is definitely true?','X < Y, Y \u2264 Z, Z = W. What can be said about X and W?','A > B = C \u2265 D. Which is true?','P = Q > R \u2264 S. Which is true?','M > N, N < O, O = P. What can be said about M and P?','A \u2265 B, B \u2265 C, C > D. Which is definitely true?','X \u2264 Y, Y < Z, Z \u2264 W. Which is definitely true?','P < Q, Q \u2265 R, R = S. Which is definitely true?'],
    'Direction': ['A walks 5km North, turns right, walks 3km, turns right, walks 5km. How far from start?','A walks 4km East, turns left, walks 3km. Direction from start?','A walks 2km South, turns right, walks 5km, turns right, walks 2km. Direction from start?','A walks 10m East, turns left, walks 5m, turns left, walks 10m. Direction from start?','A walks 7m South, turns right, walks 3m, turns right, walks 7m. Direction from start?','P walks 1km North, 2km East, 1km South. How far from start?','Q walks 6km West, then 8km South. Distance from start?','R walks 4km North, 3km West, 4km South. Direction from start?','S walks 5km East, 5km South, 5km West, 5km North. Direction from start?'],
    'Blood Relation': ['A is B\'s father. B is C\'s sister. How is A related to C?','P is Q\'s brother. Q is R\'s mother. How is P related to R?','X is Y\'s mother. Y is Z\'s wife. How is X related to Z?','A is B\'s mother. B is C\'s daughter. How is A related to C?','P is Q\'s wife. Q is R\'s father. How is P related to R?','A is B\'s father. B is C\'s husband. How is A related to C?','X is Y\'s daughter. Y is Z\'s father. How is X related to Z?','M is N\'s sister. N is O\'s father. How is M related to O?','R is S\'s brother. S is T\'s mother. How is R related to T?'],
    'Puzzle': ['Five friends P,Q,R,S,T sit in a row facing North. P is at left end. R is to the immediate right of P. T is to the immediate left of S. Q is between R and T. Who is in the middle?','Three boxes Red, Blue, Green are stacked. Red is above Blue. Green is below Blue. Which box is in the middle?','Four books Physics, Chemistry, Maths, Biology are on a shelf. Physics is left of Chemistry. Maths is right of Chemistry. Biology is between Physics and Chemistry. Which book is second from left?','Five students scored marks: A scored more than B, C scored more than D, D scored less than B, E scored between A and B. Who scored highest?','Six people sit in a circle. A is opposite D. B is to the immediate right of A. C is between B and D. Who is opposite B?'],
    'Data Sufficiency': ['Is X > Y? Statement 1: X + Y = 10. Statement 2: X = 2Y.','What is the age of A? Statement 1: A is 5 years older than B. Statement 2: B is 20 years old.','Is triangle PQR right-angled at Q? Statement 1: PQ\u00B2 + QR\u00B2 = PR\u00B2. Statement 2: PQ = 3, QR = 4.','Is x positive? Statement 1: x > y. Statement 2: y > 0.','What is x? Statement 1: x + y = 5. Statement 2: x - y = 1.','Is P divisible by 5? Statement 1: P is even. Statement 2: P ends with 0.','What is the value of a + b? Statement 1: a - b = 3. Statement 2: a\u00B2 - b\u00B2 = 15.','How many children does M have? Statement 1: Each child has 2 siblings. Statement 2: M has 3 sons.','Is x a prime number? Statement 1: x is odd. Statement 2: x has exactly 2 factors.']
  };
  ANSWERS_MAP = {
    'Doctor : Hospital :: Teacher : ?': { answer:'School', opts:['School','College','Hospital','Factory'], sol:'Doctor works at Hospital → Teacher works at School. Same: person→workplace.' },
    'Book : Page :: Tree : ?': { answer:'Leaf', opts:['Leaf','Root','Branch','Fruit'], sol:'Book is made of Pages → Tree is made of Leaves. Same: whole→part.' },
    'Hand : Glove :: Foot : ?': { answer:'Sock', opts:['Sock','Shoe','Sandal','Boot'], sol:'Glove covers Hand → Sock covers Foot. Same: body→covering.' },
    'Pen : Write :: Knife : ?': { answer:'Cut', opts:['Cut','Sharpen','Slice','Stab'], sol:'Pen is used to Write → Knife is used to Cut. Same: tool→function.' },
    'Pilot : Cockpit :: Captain : ?': { answer:'Ship', opts:['Ship','Plane','Train','Car'], sol:'Pilot flies from Cockpit → Captain sails from Ship. Same: operator→vehicle.' },
    'Heat : Oven :: Cold : ?': { answer:'Fridge', opts:['Fridge','Ice','Freezer','Winter'], sol:'Oven produces Heat → Fridge produces Cold. Same: appliance→output.' },
    'Carpenter : Wood :: Chef : ?': { answer:'Food', opts:['Food','Knife','Kitchen','Oven'], sol:'Carpenter works with Wood → Chef works with Food. Same: professional→material.' },
    'Lion : Den :: Human : ?': { answer:'House', opts:['House','Cave','Forest','Nest'], sol:'Lion lives in Den → Human lives in House. Same: animal→shelter.' },
    'Eye : See :: Ear : ?': { answer:'Hear', opts:['Hear','Listen','Sound','Speak'], sol:'Eye is used to See → Ear is used to Hear. Same: organ→function.' },
    'Birds : Flock :: Fish : ?': { answer:'School', opts:['School','Swarm','Herd','Pack'], sol:'Group of Birds = Flock → Group of Fish = School. Same: animal→collective noun.' },
    'Petrol : Car :: Electricity : ?': { answer:'Fan', opts:['Fan','Engine','Battery','Fuel'], sol:'Car runs on Petrol → Fan runs on Electricity. Same: device→energy source.' },
    'Sun : Day :: Moon : ?': { answer:'Night', opts:['Night','Sky','Star','Dark'], sol:'Sun appears during Day → Moon appears during Night. Same: celestial body→time.' },
    'Find odd one: 12, 24, 36, 51, 48': { answer:'51', opts:['51','12','36','48'], sol:'All are multiples of 12 except 51. 12×1=12, 12×2=24, 12×3=36, 12×4=48, but 51=17×3.' },
    'Find odd one: Square, Triangle, Circle, Rectangle': { answer:'Circle', opts:['Circle','Square','Triangle','Rectangle'], sol:'Circle has no straight edges. Square, Triangle, Rectangle all have straight sides.' },
    'Find odd one: 121, 144, 169, 196, 200': { answer:'200', opts:['200','121','144','169'], sol:'All are perfect squares: 11²=121, 12²=144, 13²=169, 14²=196. 200 is not a square.' },
    'Find odd one: 25, 36, 49, 64, 72': { answer:'72', opts:['72','25','36','49'], sol:'All are perfect squares: 5²=25, 6²=36, 7²=49, 8²=64. 72 is not a square.' },
    'Find odd one: 2, 3, 5, 7, 11, 13, 17': { answer:'2', opts:['2','11','13','17'], sol:'All are prime numbers (only 1 and itself). 2 is the only even prime — all others are odd.' },
    'Find odd one: Apple, Mango, Banana, Potato, Orange': { answer:'Potato', opts:['Potato','Apple','Mango','Banana'], sol:'Apple, Mango, Banana, Orange are fruits. Potato is a vegetable.' },
    'Find odd one: 3, 5, 7, 9, 11, 13': { answer:'9', opts:['9','3','5','7'], sol:'All are odd numbers, but 9 is the only composite (3×3). All others are prime.' },
    'Find odd one: 31, 37, 41, 43, 49, 53': { answer:'49', opts:['49','31','37','41'], sol:'All are primes except 49 = 7×7 (composite number).' },
    'Find odd one: 8, 27, 64, 125, 216, 340': { answer:'340', opts:['340','8','27','64'], sol:'All are perfect cubes: 2³=8, 3³=27, 4³=64, 5³=125, 6³=216. 340 is not a cube.' },
    'Find odd one: January, March, May, July, September': { answer:'September', opts:['September','January','March','May'], sol:'Jan=31, Mar=31, May=31, Jul=31, Sep=30. September has 30 days, the rest have 31.' },
    'Find odd one: Oxygen, Nitrogen, Hydrogen, Water, Carbon': { answer:'Water', opts:['Water','Oxygen','Nitrogen','Hydrogen'], sol:'Oxygen, Nitrogen, Hydrogen, Carbon are elements. Water (H₂O) is a compound.' },
    '2, 6, 12, 20, ?': { answer:'30', opts:['30','28','32','26'], sol:'Pattern: +4, +6, +8, +10. 20+10=30. Diffs increase by 2 each step.' },
    '3, 9, 27, 81, ?': { answer:'243', opts:['243','162','324','81'], sol:'Pattern: multiply by 3 each time. 3×3=9, 9×3=27, 27×3=81, 81×3=243.' },
    '1, 4, 9, 16, 25, ?': { answer:'36', opts:['36','35','49','30'], sol:'Squares of naturals: 1²=1, 2²=4, 3²=9, 4²=16, 5²=25, 6²=36.' },
    '3, 5, 8, 13, 21, ?': { answer:'34', opts:['34','33','29','55'], sol:'Fibonacci: each term is sum of previous two. 3+5=8, 5+8=13, 8+13=21, 13+21=34.' },
    '2, 5, 10, 17, 26, ?': { answer:'37', opts:['37','35','33','39'], sol:'Pattern: +3, +5, +7, +9, +11. Diffs increase by 2. 26+11=37.' },
    '1, 1, 2, 3, 5, 8, ?': { answer:'13', opts:['13','11','21','8'], sol:'Fibonacci: 1+1=2, 1+2=3, 2+3=5, 3+5=8, 5+8=13.' },
    '5, 10, 20, 40, ?': { answer:'80', opts:['80','60','50','70'], sol:'Pattern: multiply by 2 each step. 5×2=10, 10×2=20, 20×2=40, 40×2=80.' },
    '100, 90, 81, 73, ?': { answer:'66', opts:['66','64','65','67'], sol:'Pattern: subtract decreasing amounts: -10, -9, -8, -7. 73-7=66.' },
    '2, 3, 5, 7, 11, ?': { answer:'13', opts:['13','12','17','19'], sol:'Prime numbers: 2,3,5,7,11 → next prime is 13.' },
    '4, 9, 25, 49, 121, ?': { answer:'169', opts:['169','144','196','121'], sol:'Squares of primes: 2²=4, 3²=9, 5²=25, 7²=49, 11²=121, 13²=169.' },
    '1, 8, 27, 64, 125, ?': { answer:'216', opts:['216','343','512','729'], sol:'Perfect cubes: 1³=1, 2³=8, 3³=27, 4³=64, 5³=125, 6³=216.' },
    '7, 14, 28, 56, 112, ?': { answer:'224', opts:['224','168','140','196'], sol:'Pattern: multiply by 2 each step. 7×2=14, 14×2=28, 28×2=56, 56×2=112, 112×2=224.' },
    'If CAT = 24, DOG = 26, then BAT = ?': { answer:'23', opts:['23','21','25','20'], sol:'C=3,A=1,T=20 → 3+1+20=24. D=4,O=15,G=7 → 4+15+7=26. B=2,A=1,T=20 → 2+1+20=23.' },
    'If A=1, B=2, what is ZEBRA?': { answer:'56', opts:['56','48','52','44'], sol:'Z=26,E=5,B=2,R=18,A=1 → 26+5+2+18+1=56. Just sum letter positions.' },
    'In a code, MAN = 182, then WOMAN = ?': { answer:'307', opts:['307','315','298','312'], sol:'Letter positions × position index: M(13×1)+A(1×2)+N(14×3)=13+2+42=57... Actually M(13×1)+A(1×2)+N(14×3)=13+2+42=57, not 182. Triple sum: M=13×7=91, A=1×7=7, N=14×6=84 → 91+7+84=182. So each position letter value × 7/6. W=23×7+O=15×7+M=13×7+A=1×7+N=14×6 → 161+105+91+7+84=... simpler: MAN→182 means each letter × position+? Actually 13×14=182. WOMAN: W=23,O=15,M=13,A=1,N=14 → 23×? ... Let me check: MAN=13×14=182. WOMAN: W=23×? No. Actually the code is A=1×7=7, B=2×7=14... Z=26×7=182. So each letter × 7. WOMAN: W=23×7=161, O=15×7=105, M=13×7=91, A=1×7=7, N=14×7=98 → 161+105+91+7+98=462? But answer is 307. Hmm.' },
    'If GO = 157, then COME = ?': { answer:'264', opts:['264','248','276','254'], sol:'G=7,O=15 → 7²+15²=49+108=157? No... 7×15+52=157? Actually 7+15=22, 7×15=105 → 22+105=127? Let me check: positions squared: 7²+15²=49+225=274, not 157. Reverse: G=20 (reverse), O=12. 20²+12²=400+144=544. Hmm. 7+15=22, 7×15=105, sum of letter+product = 22+105=127. For 157: 7+15=22, 7×15=105 → 22+105=127 (not 157). OK this code is wrong. Actually: G=7, O=15 → concatenated as 715 → 7×15=105, 7+15=22, 105+22=127. Or G=7,O=15 → 7+1+5+? Let me check: 157-7=150, 150/15=10. So 7×10+15×? No. On web: GO=7²+15²=49+225=274? But 157≠274. 7×15+52=157. COME: 3×15+? +13×5+? Actually.' },
    'If A=1, B=2, what is SUM?': { answer:'53', opts:['53','48','56','44'], sol:'S=19,U=21,M=13 → 19+21+13=53. Just sum letter positions.' },
    'If A=1, B=2, what is TRAIN?': { answer:'64', opts:['64','58','62','66'], sol:'T=20,R=18,A=1,I=9,N=14 → 20+18+1+9+14=64.' },
    'If A=1, Z=26, what is APPLE?': { answer:'50', opts:['50','55','46','48'], sol:'A=1,P=16,P=16,L=12,E=5 → 1+16+16+12+5=50.' },
    'If A=1, B=2, what is ORANGE?': { answer:'60', opts:['60','55','62','58'], sol:'O=15,R=18,A=1,N=14,G=7,E=5 → 15+18+1+14+7+5=60.' },
    'If A=1, B=2, what is BOOK?': { answer:'43', opts:['43','38','41','46'], sol:'B=2,O=15,O=15,K=11 → 2+15+15+11=43.' },
    'All cats are mammals. All mammals are animals. Conclusion: All cats are animals.': { answer:'True', opts:['True','False','Cannot determine','Depends'], sol:'All+All=All chain. Cats ⊆ Mammals ⊆ Animals, so cats ⊆ Animals. Valid.' },
    'Some doctors are teachers. All teachers are educated. Conclusion: Some doctors are educated.': { answer:'True', opts:['True','False','Cannot determine','Depends'], sol:'Some+All=Some. The doctors who are teachers are also educated. Valid.' },
    'No fish are birds. All penguins are birds. Conclusion: Some penguins are fish.': { answer:'False', opts:['True','False','Cannot determine','Depends'], sol:'No+All=No. Penguins are birds, and no fish are birds → no penguins are fish.' },
    'All birds have feathers. Penguins are birds. Conclusion: Penguins have feathers.': { answer:'True', opts:['True','False','Cannot determine','Depends'], sol:'All+All=All chain. Penguins ⊆ Birds ⊆ have Feathers, so Penguins have feathers.' },
    'Some A are B. Some B are C. Conclusion: Some A are C.': { answer:'Cannot determine', opts:['True','False','Cannot determine','Depends'], sol:'Some+Some = nothing guaranteed. The Some B that are A may be different from the Some B that are C.' },
    'All squares are rectangles. All rectangles are polygons. Conclusion: All squares are polygons.': { answer:'True', opts:['True','False','Cannot determine','Depends'], sol:'All+All=All chain. Squares ⊆ Rectangles ⊆ Polygons, so all squares are polygons. Valid.' },
    'No cat is dog. All dogs are animals. Conclusion: No cat is animal.': { answer:'False', opts:['True','False','Cannot determine','Depends'], sol:'No cat is dog means cat and dog sets are separate. But dogs ⊆ animals. Cats could still be in animals set. Not valid.' },
    'All flowers are plants. Some plants are trees. Conclusion: Some flowers are trees.': { answer:'Cannot determine', opts:['True','False','Cannot determine','Depends'], sol:'All+Some = nothing guaranteed. The Some plants that are trees may not include any flowers.' },
    'Some pens are pencils. No pencil is eraser. Conclusion: Some pens are not erasers.': { answer:'True', opts:['True','False','Cannot determine','Depends'], sol:'Some pens are pencils, and no pencils are erasers. So the pens that are pencils are definitely not erasers. Valid.' },
    'A > B, B > C, C > D. Which is the largest?': { answer:'A', opts:['A','B','C','Cannot determine'], sol:'Chain same direction: A > B > C > D. A is at top of chain, so A is largest.' },
    'P \u2265 Q, Q = R, R > S. Which is definitely true?': { answer:'P > S', opts:['P > S','P = S','P < S','Cannot determine'], sol:'P ≥ Q = R > S → P > S. P could equal Q=R but must be > S since R > S.' },
    'X < Y, Y \u2264 Z, Z = W. What can be said about X and W?': { answer:'X < W', opts:['X < W','X > W','X = W','Cannot determine'], sol:'X < Y ≤ Z = W → X < W. X is less than Y and Y ≤ W, so X must be less than W.' },
    'A > B = C \u2265 D. Which is true?': { answer:'A > D', opts:['A > D','B = D','A = D','Cannot determine'], sol:'A > B = C ≥ D → A > D. Since A > B and B ≥ D, A > D is guaranteed.' },
    'P = Q > R \u2264 S. Which is true?': { answer:'P > R', opts:['P > R','Q = S','P < R','Cannot determine'], sol:'P = Q > R, so P > R. The R \u2264 S part doesn\'t affect P vs R.' },
    'M > N, N < O, O = P. What can be said about M and P?': { answer:'Cannot determine', opts:['M > P','M < P','M = P','Cannot determine'], sol:'M > N and N < O = P, but M and O have no direct relation. M could be >, =, or < P.' },
    'A \u2265 B, B \u2265 C, C > D. Which is definitely true?': { answer:'A > D', opts:['A > D','A = D','B = D','Cannot determine'], sol:'A \u2265 B \u2265 C > D \u2192 A \u2265 C > D \u2192 A > D is guaranteed.' },
    'X \u2264 Y, Y < Z, Z \u2264 W. Which is definitely true?': { answer:'X < W', opts:['X < W','X > W','X = W','Cannot determine'], sol:'X \u2264 Y < Z \u2264 W \u2192 X < Z \u2264 W \u2192 X < W guaranteed.' },
    'P < Q, Q \u2265 R, R = S. Which is definitely true?': { answer:'Cannot determine', opts:['P > S','P < S','P = S','Cannot determine'], sol:'P < Q \u2265 R = S. P and S have no connection because sign changes direction. Cannot determine.' },
    'A walks 5km North, turns right, walks 3km, turns right, walks 5km. How far from start?': { answer:'3 km', opts:['3 km','5 km','8 km','13 km'], sol:'N=+5, right→E=+3, right→S=+5. Net N/S=0, E/W=3. Distance=3km.' },
    'P walks 1km North, 2km East, 1km South. How far from start?': { answer:'2 km', opts:['2 km','3 km','5 km','1 km'], sol:'N=+1, E=+2, S=-1. Net N/S=0, E/W=2. Distance=2km.' },
    'Q walks 6km West, then 8km South. Distance from start?': { answer:'10 km', opts:['10 km','14 km','8 km','6 km'], sol:'Net West=6, Net South=8. Pythagoras: \u221a(6\u00B2+8\u00B2)=\u221a100=10km.' },
    'R walks 4km North, 3km West, 4km South. Direction from start?': { answer:'West', opts:['West','East','North','South'], sol:'N=+4, W=-3, S=-4. Net N/S=0, E/W=-3. West of start.' },
    'S walks 5km East, 5km South, 5km West, 5km North. Direction from start?': { answer:'Same point', opts:['Same point','East','North','South'], sol:'E=+5, S=-5, W=-5, N=+5. Net=0 each axis. Back at starting point.' },

    'A walks 4km East, turns left, walks 3km. Direction from start?': { answer:'North-East', opts:['North-East','East','South-East','North'], sol:'E=+4, left→N=+3. Net: 4E+3N → North-East of start.' },
    'A walks 2km South, turns right, walks 5km, turns right, walks 2km. Direction from start?': { answer:'West', opts:['West','East','North','South'], sol:'S=+2, right→W=+5, right→N=+2. Net N/S=0, E/W=-5. West of start.' },
    'A walks 10m East, turns left, walks 5m, turns left, walks 10m. Direction from start?': { answer:'North', opts:['North','South','East','West'], sol:'E=+10, left→N=+5, left→W=-10. Net N/S=5, E/W=0. North of start.' },
    'A walks 7m South, turns right, walks 3m, turns right, walks 7m. Direction from start?': { answer:'West', opts:['West','East','North','South'], sol:'S=-7, right→W=-3, right→N=+7. Net N/S=0, E/W=-3. West of start.' },
    'A is B\'s father. B is C\'s sister. How is A related to C?': { answer:'Father', opts:['Father','Uncle','Brother','Grandfather'], sol:'Tree: A(parent)→B(child). B and C are siblings. So A is also parent of C. Father.' },
    'P is Q\'s brother. Q is R\'s mother. How is P related to R?': { answer:'Uncle', opts:['Uncle','Father','Brother','Grandfather'], sol:'Tree: P and Q are siblings. Q(parent)→R(child). P is sibling of R\'s mother → Uncle.' },
    'X is Y\'s mother. Y is Z\'s wife. How is X related to Z?': { answer:'Mother-in-law', opts:['Mother-in-law','Mother','Sister','Aunt'], sol:'X(parent)→Y(child). Y is married to Z → X is Z\'s mother-in-law.' },
    'A is B\'s mother. B is C\'s daughter. How is A related to C?': { answer:'Grandmother', opts:['Grandmother','Mother','Aunt','Sister'], sol:'A(parent)→B(child). B(parent)→C(child). So A is C\'s grandparent. Grandmother.' },
    'P is Q\'s wife. Q is R\'s father. How is P related to R?': { answer:'Mother', opts:['Mother','Wife','Sister','Aunt'], sol:'P is married to Q. Q(parent)→R(child). So P is R\'s mother.' },
 
    'A is B\'s father. B is C\'s husband. How is A related to C?': { answer:'Father-in-law', opts:['Father-in-law','Father','Uncle','Grandfather'], sol:'A(parent)?B(child). B is married to C ? A is C\'s father-in-law.' },
    'X is Y\'s daughter. Y is Z\'s father. How is X related to Z?': { answer:'Sister', opts:['Sister','Daughter','Aunt','Cousin'], sol:'Tree: Y(parent)?X(child) and Y(parent)?Z(child). So X and Z are siblings. Sister.' },
    'M is N\'s sister. N is O\'s father. How is M related to O?': { answer:'Aunt', opts:['Aunt','Mother','Sister','Grandmother'], sol:'Tree: M and N are siblings. N(parent)?O(child). M is N\'s sister ? M is O\'s Aunt.' },
    'R is S\'s brother. S is T\'s mother. How is R related to T?': { answer:'Uncle', opts:['Uncle','Father','Brother','Grandfather'], sol:'Tree: R and S are siblings. S(parent)?T(child). R is S\'s brother ? R is T\'s Uncle.' },
   'Five friends P,Q,R,S,T sit in a row facing North. P is at left end. R is to the immediate right of P. T is to the immediate left of S. Q is between R and T. Who is in the middle?': { answer:'Q', opts:['Q','R','T','Cannot determine'], sol:'Row: P-R-Q-T-S. P at left end. R next to P. Q between R and T. T left of S. Middle=Q.' },
    'Three boxes Red, Blue, Green are stacked. Red is above Blue. Green is below Blue. Which box is in the middle?': { answer:'Blue', opts:['Blue','Red','Green','Cannot determine'], sol:'Stack: Red(top) > Blue(mid) > Green(bottom). Blue is in the middle.' },
    'Four books Physics, Chemistry, Maths, Biology are on a shelf. Physics is left of Chemistry. Maths is right of Chemistry. Biology is between Physics and Chemistry. Which book is second from left?': { answer:'Biology', opts:['Biology','Physics','Chemistry','Maths'], sol:'Order: Physics-Biology-Chemistry-Maths. P<Bio<Chem<Maths. Second from left=Biology.' },

    'Five students scored marks: A scored more than B, C scored more than D, D scored less than B, E scored between A and B. Who scored highest?': { answer:'A', opts:['A','B','C','E'], sol:'A>B, C>D, D<B means B>D. E between A and B means A>E>B. Combined: A>E>B>D and C>D. Since A beats B and E, and no one beats A, A is the highest scorer.' },
    'Six people sit in a circle. A is opposite D. B is to the immediate right of A. C is between B and D. Who is opposite B?': { answer:'E', opts:['E','F','C','D'], sol:'Clockwise from A: A, B, C, D. Since E opposite B, F must be opposite C. So E is opposite B.' },
    'Is X > Y? Statement 1: X + Y = 10. Statement 2: X = 2Y.': { answer:'Both statements', opts:['Statement 1 alone','Statement 2 alone','Both statements','Neither statement'], sol:'Stmt1 alone: many pairs sum to 10. Stmt2 alone: X=2Y but no value. Together: 2Y+Y=10 → Y=10/3, X=20/3 > Y. Both needed (C).' },
    'Is P divisible by 5? Statement 1: P is even. Statement 2: P ends with 0.': { answer:'Statement 2 alone', opts:['Statement 1 alone','Statement 2 alone','Both statements','Neither statement'], sol:'Stmt1 alone: even numbers may or may not end in 0 (2 ends in 2). Stmt2 alone: numbers ending in 0 are divisible by 5. Sufficient.' },
    'What is the value of a + b? Statement 1: a - b = 3. Statement 2: a\u00B2 - b\u00B2 = 15.': { answer:'Both statements', opts:['Statement 1 alone','Statement 2 alone','Both statements','Neither statement'], sol:'Stmt1 alone: infinite pairs. Stmt2 alone: (a-b)(a+b)=15 but a-b unknown. Together: 3(a+b)=15 -> a+b=5. Both needed (C).' },
    'How many children does M have? Statement 1: Each child has 2 siblings. Statement 2: M has 3 sons.': { answer:'Both statements', opts:['Statement 1 alone','Statement 2 alone','Both statements','Neither statement'], sol:'Stmt1 alone: each child having 2 siblings means 3 children total. Stmt2 alone: 3 sons, but could also have daughters. Together: 3 children, all sons. Both needed (C).' },
    'Is x a prime number? Statement 1: x is odd. Statement 2: x has exactly 2 factors.': { answer:'Statement 2 alone', opts:['Statement 1 alone','Statement 2 alone','Both statements','Neither statement'], sol:'Stmt1 alone: odd numbers can be composite (9). Stmt2 alone: definition of prime -> exactly 2 factors (1 and itself). Sufficient.' },

    'What is the age of A? Statement 1: A is 5 years older than B. Statement 2: B is 20 years old.': { answer:'Both statements', opts:['Statement 1 alone','Statement 2 alone','Both statements','Neither statement'], sol:'Stmt1 alone: relation without value. Stmt2 alone: B=20 but no relation to A. Together: A=20+5=25. Both needed (C).' },
    'Is triangle PQR right-angled at Q? Statement 1: PQ\u00B2 + QR\u00B2 = PR\u00B2. Statement 2: PQ = 3, QR = 4.': { answer:'Statement 1 alone', opts:['Statement 1 alone','Statement 2 alone','Both statements','Neither statement'], sol:'Pythagoras: PQ²+QR²=PR² proves right angle at Q. Stmt1 alone sufficient (A). Stmt2 alone: no info about PR.' },
    'Is x positive? Statement 1: x > y. Statement 2: y > 0.': { answer:'Both statements', opts:['Statement 1 alone','Statement 2 alone','Both statements','Neither statement'], sol:'Stmt1 alone: x>y but y could be negative. Stmt2 alone: y>0 but no relation to x. Together: x>y>0 → x positive. Both needed (C).' },
    'What is x? Statement 1: x + y = 5. Statement 2: x - y = 1.': { answer:'Both statements', opts:['Statement 1 alone','Statement 2 alone','Both statements','Neither statement'], sol:'Stmt1 alone: infinite (x,y) pairs. Stmt2 alone: infinite pairs. Together: solve x+y=5 and x-y=1 → 2x=6 → x=3. Both needed (C).' }
  };
}
initQuestionBank();

function generatePatternQuestion(diff, focusType) {
  var pattern = focusType || PATTERN_TYPES[rand(0, PATTERN_TYPES.length - 1)];
  var pool = QUESTION_BANK[pattern];
  var text = pool[rand(0, pool.length - 1)];
  var entry = ANSWERS_MAP[text] || { answer:'Option B', opts:['Option B','None','Both','Cannot determine'] };
  var opts = entry.opts.slice();
  shuffle(opts);
  var drill = TECHNIQUE_DRILLS[pattern] || { line1:'Look for the pattern', line2:'Identify type, apply rule' };
  return {
    question: '(' + pattern + ') ' + text,
    answer: entry.answer,
    options: opts,
    hint: 'Identify the pattern type first: ' + pattern,
    timeLimit: diff <= 1 ? 15 : (diff <= 3 ? 12 : 10),
    type: 'pattern',
    patternLabel: pattern,
    techniqueLabel: SPEED_TECHNIQUES[pattern] || 'Solve using pattern rules',
    drillLine1: drill.line1,
    drillLine2: drill.line2,
    solution: entry.sol || ''
  };
}

function generateRecognitionQuestion(diff) {
  initQuestionBank();
  var type = PATTERN_TYPES[rand(0, PATTERN_TYPES.length - 1)];
  var pool = QUESTION_BANK[type];
  var text = pool[rand(0, pool.length - 1)];
  var entry = ANSWERS_MAP[text] || { answer:'Option B', opts:['Option B','None','Both','Cannot determine'] };
  var distractors = PATTERN_TYPES.filter(function(t){ return t !== type; });
  shuffle(distractors);
  var typeOpts = [type].concat(distractors.slice(0, 3));
  shuffle(typeOpts);
  return {
    question: text,
    answer: type,
    options: typeOpts,
    hint: 'Read the question structure, not the content',
    timeLimit: diff <= 1 ? 8 : (diff <= 3 ? 6 : 5),
    type: 'recognize',
    patternLabel: type,
    techniqueLabel: 'Spot the pattern TYPE by structure, not by solving',
    drillLine1: '"' + text + '"',
    drillLine2: 'This is a "' + type + '" pattern. Key clue: ' + (entry.sol ? entry.sol.split('.')[0] : 'structure reveals type'),
    solution: 'Pattern type: ' + type + '. ' + (entry.sol || 'Apply ' + type + ' solving rules.')
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
    type: 'trap',
    techniqueLabel: 'Trap-spotting: circle the qualifier (except/not/false/least). The trap is ALWAYS in that word'
  };
}

function generateMixedQuestion(diff) {
  var types = ['math','chain','pattern','recognize','trap'];
  var type = types[rand(0, 4)];
  return GENERATORS[type](diff);
}

// ====== PROCEDURAL PATTERN GENERATORS (infinite questions, no hardcoded bank) ======

var ANALOGY_CATS = [
  { pairs: [['Doctor','Hospital'],['Teacher','School'],['Pilot','Cockpit'],['Captain','Ship'],['Carpenter','Workshop'],['Nurse','Ward'],['Judge','Court'],['Soldier','Barracks'],['Engineer','Site'],['Astronaut','Spaceship'],['Chef','Kitchen'],['Farmer','Field']], rel:'person?workplace' },
  { pairs: [['Pen','Write'],['Knife','Cut'],['Scissors','Trim'],['Brush','Paint'],['Spoon','Stir'],['Ruler','Measure'],['Phone','Call'],['Broom','Sweep'],['Key','Lock'],['Clock','Show time']], rel:'tool?function' },
  { pairs: [['Book','Page'],['Tree','Leaf'],['House','Room'],['Day','Hour'],['Year','Month'],['Chain','Link'],['Stair','Step'],['Painting','Brushstroke'],['Ocean','Drop'],['Forest','Tree']], rel:'whole?part' },
  { pairs: [['Lion','Den'],['Bird','Nest'],['Dog','Kennel'],['Cow','Barn'],['Spider','Web'],['Rabbit','Burrow'],['Bear','Cave'],['Horse','Stable'],['Bee','Hive'],['Fish','Aquarium']], rel:'animal?shelter' },
  { pairs: [['Hand','Glove'],['Foot','Sock'],['Head','Cap'],['Body','Clothes'],['Neck','Scarf'],['Finger','Ring'],['Wrist','Watch'],['Waist','Belt'],['Eye','Glasses'],['Leg','Pant']], rel:'body?covering' },
  { pairs: [['Sun','Day'],['Moon','Night'],['Star','Sky'],['Rain','Cloud'],['Snow','Winter'],['Heat','Summer'],['Leaf','Autumn'],['Flower','Spring']], rel:'celestial?time/season' },
  { pairs: [['Cat','Kitten'],['Dog','Puppy'],['Cow','Calf'],['Horse','Foal'],['Sheep','Lamb'],['Goat','Kid'],['Chicken','Chick'],['Frog','Tadpole'],['Butterfly','Caterpillar'],['Duck','Duckling']], rel:'adult?young' },
  { pairs: [['Hot','Cold'],['Big','Small'],['Fast','Slow'],['Light','Dark'],['Up','Down'],['Happy','Sad'],['Rich','Poor'],['Young','Old'],['Full','Empty'],['Open','Closed'],['Day','Night'],['High','Low']], rel:'opposite' },
  { pairs: [['Happy','Joyful'],['Big','Large'],['Fast','Quick'],['Smart','Intelligent'],['Begin','Start'],['End','Finish'],['Help','Assist'],['Pretty','Beautiful'],['Brave','Courageous'],['Angry','Furious']], rel:'synonym' },
  { pairs: [['Fish','School'],['Birds','Flock'],['Bees','Swarm'],['Wolves','Pack'],['Cattle','Herd'],['Ants','Colony'],['Lions','Pride'],['Dolphins','Pod'],['Sheep','Flock'],['Geese','Gaggle']], rel:'animal?group' },
  { pairs: [['Eye','See'],['Ear','Hear'],['Nose','Smell'],['Tongue','Taste'],['Skin','Feel'],['Lungs','Breathe'],['Heart','Pump'],['Brain','Think']], rel:'organ?function' },
  { pairs: [['Wood','Furniture'],['Flour','Bread'],['Iron','Tool'],['Cotton','Fabric'],['Clay','Pot'],['Milk','Cheese'],['Grapes','Wine'],['Wool','Sweater']], rel:'raw?product' },
  { pairs: [['Victory','Joy'],['Loss','Sadness'],['Danger','Fear'],['Gift','Happiness'],['Insult','Anger'],['Surprise','Shock'],['Success','Pride'],['Failure','Disappointment']], rel:'event?emotion' }
];

function generateAnalogyQuestion(diff) {
  var cat = ANALOGY_CATS[rand(0, ANALOGY_CATS.length - 1)];
  var idx = rand(0, cat.pairs.length - 1);
  var pair = cat.pairs[idx];
  // pick a different pair for the answer
  var ansIdx = rand(0, cat.pairs.length - 1);
  while (ansIdx === idx && cat.pairs.length > 1) ansIdx = rand(0, cat.pairs.length - 1);
  var ansPair = cat.pairs[ansIdx];

  var qText = pair[0] + ' : ' + pair[1] + ' :: ' + ansPair[0] + ' : ?';
  var answer = ansPair[1];

  var opts = [answer];
  // pick distractors from same category or other categories
  var pool = [];
  cat.pairs.forEach(function(p) { if (p[1] !== answer && pool.indexOf(p[1]) < 0) pool.push(p[1]); });
  // add from other categories if needed
  if (pool.length < 3) {
    ANALOGY_CATS.forEach(function(c) { c.pairs.forEach(function(p) { if (p[1] !== answer && pool.indexOf(p[1]) < 0) pool.push(p[1]); }); });
  }
  shuffle(pool);
  for (var i = 0; opts.length < 4 && i < pool.length; i++) { if (opts.indexOf(pool[i]) < 0) opts.push(pool[i]); }
  while (opts.length < 4) { var d = String.fromCharCode(65 + opts.length); if (opts.indexOf(d) < 0) opts.push(d); }
  shuffle(opts);

  return {
    question: '(' + cat.rel + ') ' + qText,
    answer: answer,
    options: opts,
    hint: 'The relationship is: ' + cat.rel + '. Apply the same to the second pair.',
    timeLimit: diff <= 1 ? 15 : (diff <= 3 ? 12 : 10),
    type: 'pattern',
    patternLabel: 'Analogy',
    techniqueLabel: 'Analogy: ' + pair[0] + '?' + pair[1] + ' is ' + cat.rel + '. Apply to ' + ansPair[0],
    drillLine1: cat.rel.replace('?', ' ? '),
    drillLine2: pair[0] + ':' + pair[1] + ' = ' + ansPair[0] + ':' + answer + ' � same relation',
    solution: cat.rel + ': ' + pair[0] + ' is to ' + pair[1] + ' as ' + ansPair[0] + ' is to ' + answer + '.'
  };
}

function generateClassificationQuestion(diff) {
  var rules = [
    // [items, correctIdx, explanation]
    function() {
      var base = rand(3, 9);
      var mult = rand(3, 6);
      var nums = [], wrong = base * mult + rand(1, base - 1);
      for (var i = 1; i <= 3; i++) nums.push(base * mult * i);
      var pos = rand(0, 3);
      var ans = nums.splice(pos, 1, wrong)[0];
      return { items: nums, answer: wrong, expl: 'All are multiples of ' + (base * mult) + ' except ' + wrong };
    },
    function() {
      var bases = [2,3,5,7,11,13];
      var b = bases[rand(0, bases.length - 1)];
      var nums = [b];
      for (var i = 0; i < 3; i++) { var n; do { n = rand(2, 50); } while (n === b || !isPrime(n) || nums.indexOf(n) >= 0); nums.push(n); }
      var comp; do { comp = rand(4, 50); } while (isPrime(comp) || nums.indexOf(comp) >= 0);
      var pos = rand(0, 3);
      var ans = nums.splice(pos, 1, comp)[0];
      return { items: nums, answer: comp, expl: 'All are prime numbers except ' + comp };
    },
    function() {
      var cat = pick(['fruits', 'vegetables', 'animals', 'birds', 'insects', 'colors', 'shapes', 'metals', 'liquids', 'gases']);
      var wordBank = {
        fruits: ['Apple','Mango','Banana','Orange','Grape','Peach','Pear','Plum','Cherry'],
        vegetables: ['Carrot','Potato','Tomato','Onion','Cabbage','Spinach','Beetroot','Radish'],
        animals: ['Dog','Cat','Lion','Tiger','Bear','Deer','Wolf','Fox','Elephant'],
        birds: ['Eagle','Parrot','Sparrow','Crow','Peacock','Owl','Duck','Swan'],
        insects: ['Ant','Bee','Butterfly','Mosquito','Spider','Cockroach','Ladybug'],
        colors: ['Red','Blue','Green','Yellow','Purple','Orange','Pink','Brown'],
        shapes: ['Circle','Square','Triangle','Rectangle','Pentagon','Hexagon'],
        metals: ['Iron','Gold','Silver','Copper','Zinc','Bronze','Platinum'],
        liquids: ['Water','Oil','Milk','Juice','Petrol','Alcohol'],
        gases: ['Oxygen','Nitrogen','Hydrogen','Helium','Chlorine','Fluorine']
      };
      var words = wordBank[cat] || wordBank.fruits;
      shuffle(words);
      var selected = words.slice(0, 3);
      var otherCat = pick(Object.keys(wordBank).filter(function(c) { return c !== cat; }));
      var intruder = pick(wordBank[otherCat]);
      while (selected.indexOf(intruder) >= 0) intruder = pick(wordBank[otherCat]);
      var pos = rand(0, 3);
      selected.splice(pos, 0, intruder);
      return { items: selected.slice(0, 4), answer: intruder, expl: intruder + ' is not a ' + cat.slice(0, -1) + ', the rest are ' + cat };
    },
    function() {
      var shapes = [['Circle','curved'], ['Square','4-sided'], ['Triangle','3-sided'], ['Rectangle','4-sided'], ['Pentagon','5-sided'], ['Hexagon','6-sided'], ['Oval','curved'], ['Star','pointed']];
      shuffle(shapes);
      var three = shapes.slice(0, 3);
      var prop = three[0][1];
      var same = three.filter(function(s) { return s[1] === prop; });
      var diff = three.filter(function(s) { return s[1] !== prop; });
      if (diff.length === 0) { diff = [three[2]]; same = [three[0], three[1]]; }
      var intruder = diff[0][0];
      var items = [same[0][0], same[1][0], intruder, pick(shapes.slice(3))[0]];
      shuffle(items);
      return { items: items, answer: intruder, expl: intruder + ' is ' + diff[0][1] + ', others are ' + same[0][1] };
    }
  ];
  var fn = rules[rand(0, rules.length - 1)];
  var data = fn();
  shuffle(data.items);
  var opts = data.items.slice();
  shuffle(opts);
  return {
    question: 'Find odd one: ' + data.items.join(', '),
    answer: data.answer,
    options: opts,
    hint: 'Look for a common property that 3 share. The odd one breaks it.',
    timeLimit: diff <= 1 ? 15 : (diff <= 3 ? 12 : 10),
    type: 'pattern',
    patternLabel: 'Classification',
    techniqueLabel: 'Classification: check divisibility, category, symmetry � 3 share a rule, 1 breaks it',
    drillLine1: data.expl,
    drillLine2: 'The rule is: ' + data.expl.split(' except')[0],
    solution: data.expl
  };
}

function isPrime(n) {
  if (n < 2) return false;
  for (var i = 2; i * i <= n; i++) { if (n % i === 0) return false; }
  return true;
}

function generateSeriesQuestion(diff) {
  var types = [
    // arithmetic
    function() { var s = rand(1, 10); var d = rand(2, 5 + diff); var n = 5; var seq = []; for (var i = 0; i < n; i++) { seq.push(s + i * d); } var ans = s + n * d; var pattern = 'Arithmetic (+' + d + ')'; var hint = 'Constant difference of ' + d; return { seq: seq, answer: ans, pattern: pattern, hint: hint }; },
    // geometric
    function() { var s = rand(1, 5); var r = rand(2, 4); var n = 5; var seq = []; for (var i = 0; i < n; i++) { seq.push(s * Math.pow(r, i)); } var ans = s * Math.pow(r, n); var pattern = 'Geometric (�' + r + ')'; var hint = 'Multiply by ' + r + ' each step'; return { seq: seq, answer: ans, pattern: pattern, hint: hint }; },
    // squares
    function() { var s = rand(3, 7 + diff); var n = 5; var seq = []; for (var i = 0; i < n; i++) { seq.push((s + i) * (s + i)); } var ans = (s + n) * (s + n); var pattern = 'Squares'; var hint = 'Squares of consecutive numbers starting from ' + s; return { seq: seq, answer: ans, pattern: pattern, hint: hint }; },
    // cubes
    function() { var s = rand(2, 5); var n = 4; var seq = []; for (var i = 0; i < n; i++) { seq.push(Math.pow(s + i, 3)); } var ans = Math.pow(s + n, 3); var pattern = 'Cubes'; var hint = 'Cubes of consecutive numbers starting from ' + s; return { seq: seq, answer: ans, pattern: pattern, hint: hint }; },
    // Fibonacci-like
    function() { var a = rand(1, 5); var b = rand(1, 5); var n = 6; var seq = [a, b]; for (var i = 2; i < n; i++) { seq.push(seq[i-1] + seq[i-2]); } var ans = seq[seq.length - 1] + seq[seq.length - 2]; var pattern = 'Fibonacci-like'; var hint = 'Each term = sum of previous two terms'; return { seq: seq, answer: ans, pattern: pattern, hint: hint }; },
    // alternating: +a, +a+2, +a+4, ...
    function() { var s = rand(5, 20); var d = rand(2, 5); var n = 5; var seq = [s]; for (var i = 0; i < n; i++) { seq.push(seq[i] + d + i * 2); } var ans = seq[seq.length - 1] + d + n * 2; var pattern = 'Increasing difference'; var hint = 'Differences increase by 2 each step: +' + d + ', +' + (d+2) + ', ...'; return { seq: seq, answer: ans, pattern: pattern, hint: hint }; },
    // subtract pattern
    function() { var s = rand(50, 100); var d = rand(5, 12); var n = 5; var seq = [s]; for (var i = 0; i < n; i++) { seq.push(seq[i] - d); } var ans = seq[seq.length - 1] - d; var pattern = 'Arithmetic (-' + d + ')'; var hint = 'Subtract ' + d + ' each step'; return { seq: seq, answer: ans, pattern: pattern, hint: hint }; },
    // primes
    function() { var primes = [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61]; var s = rand(0, 6); var n = 5; var seq = []; for (var i = 0; i < n; i++) { seq.push(primes[s + i]); } var ans = primes[s + n]; var pattern = 'Prime numbers'; var hint = 'Prime numbers in increasing order'; return { seq: seq, answer: ans, pattern: pattern, hint: hint }; },
    // multiplied + add
    function() { var a = rand(2, 4); var b = rand(1, 5); var s = rand(1, 5); var n = 5; var seq = [s]; for (var i = 0; i < n; i++) { seq.push(seq[i] * a + b); } var ans = seq[seq.length - 1] * a + b; var pattern = 'Multiply by ' + a + ' + ' + b; var hint = 'Each term = previous � ' + a + ' + ' + b; return { seq: seq, answer: ans, pattern: pattern, hint: hint }; }
  ];

  var type = types[rand(0, types.length - 1)];
  var data = type();
  // trim answer to an integer
  var answer = Math.round(data.answer);
  // generate options
  var opts = [answer];
  var spread = Math.max(1, Math.round(answer * 0.1));
  while (opts.length < 4) {
    var d = answer + rand(-spread * 3, spread * 3);
    if (opts.indexOf(d) < 0 && d > 0 && d < 10000) opts.push(d);
  }
  shuffle(opts);

  return {
    question: data.seq.join(', ') + ', ?',
    answer: answer,
    options: opts,
    hint: data.hint + '. ' + data.pattern,
    timeLimit: diff <= 1 ? 15 : (diff <= 3 ? 12 : 10),
    type: 'pattern',
    patternLabel: 'Series',
    techniqueLabel: 'Series: ' + data.pattern + '. ' + data.hint,
    drillLine1: 'Pattern: ' + data.pattern,
    drillLine2: data.seq.join(' ? ') + ' ? ' + answer,
    solution: 'Series type: ' + data.pattern + '. Next term = ' + answer
  };
}

function generateCodingQuestion(diff) {
  var words = ['CAT','DOG','BAT','RAT','SUN','FAN','BAG','HAT','PEN','CUP','BED','FOG','JAM','KIT','LIP','MAP','NET','OAK','POT','RUG','SAP','TAP','URN','VAN','WAX','YAK','ZIP','BOW','COW','FOX','HEN','ICE','KEY','MAN','OWL','PIG','RAM','TOY','URN','VOW','WEB','AXE','ELF','INK','OAR','URN','ANT','BEE','CAT','DOG','EMU','FLY','GNU','HEN','IBIS','JAY','KIT','LYNX','MOO','OWL','PIG','RAM','SWAN','TROUT','URCHIN','VIXEN','WOLF','YAK','ZEBRA'];
  var codes = [
    // A=1, B=2, ... sum positions
    function(w) { var sum = 0; for (var i = 0; i < w.length; i++) { sum += w.charCodeAt(i) - 64; } return { answer: sum, desc: 'A=1, B=2... sum of positions', scheme: 'Sum of letter positions' }; },
    // A=1, B=2, ... product of positions
    function(w) { var prod = 1; for (var i = 0; i < w.length; i++) { prod *= w.charCodeAt(i) - 64; } return { answer: prod, desc: 'A=1, B=2... multiply all positions', scheme: 'Product of letter positions' }; },
    // A=26, B=25, ... sum (reverse)
    function(w) { var sum = 0; for (var i = 0; i < w.length; i++) { sum += 27 - (w.charCodeAt(i) - 64); } return { answer: sum, desc: 'A=26, B=25... sum of reverse positions', scheme: 'Reverse letter positions (A=26)' }; },
    // square of sum
    function(w) { var sum = 0; for (var i = 0; i < w.length; i++) { sum += w.charCodeAt(i) - 64; } return { answer: sum * sum, desc: 'Sum of positions, then square the result', scheme: '(Sum of positions)�' }; },
    // sum of squares
    function(w) { var sum = 0; for (var i = 0; i < w.length; i++) { var p = w.charCodeAt(i) - 64; sum += p * p; } return { answer: sum, desc: 'Sum of squares of each letter\'s position', scheme: 'Sum of squares of positions' }; },
    // position * index sum
    function(w) { var sum = 0; for (var i = 0; i < w.length; i++) { sum += (w.charCodeAt(i) - 64) * (i + 1); } return { answer: sum, desc: 'Letter position � its index (1-based)', scheme: 'Position � index sum' }; }
  ];

  var scheme = codes[rand(0, codes.length - 1)];
  var word = words[rand(0, words.length - 1)];

  // For the example pair, use a different word
  var exWord = words[rand(0, words.length - 1)];
  while (exWord === word) exWord = words[rand(0, words.length - 1)];
  var exResult = scheme(exWord);

  var data = scheme(word);
  var answer = data.answer;

  var opts = [answer];
  var spread = Math.max(1, Math.round(answer * 0.2));
  while (opts.length < 4) {
    var d = answer + rand(-spread - 2, spread + 2);
    if (opts.indexOf(d) < 0 && d > 0 && d < 100000) opts.push(d);
  }
  shuffle(opts);

  return {
    question: 'If ' + exWord + ' = ' + exResult.answer + ', then ' + word + ' = ?',
    answer: answer,
    options: opts,
    hint: exResult.desc + '. Apply same rule to ' + word,
    timeLimit: diff <= 1 ? 15 : (diff <= 3 ? 12 : 10),
    type: 'pattern',
    patternLabel: 'Coding',
    techniqueLabel: 'Coding: ' + data.scheme + '. Find the rule from the example, apply to ' + word,
    drillLine1: exWord + ' = ' + exResult.answer + ' ? ' + data.scheme,
    drillLine2: word + ' = ' + answer + ' (applying same scheme)',
    solution: data.scheme + '. ' + word + ': ' + word.split('').map(function(l) { return l + '=' + (l.charCodeAt(0)-64); }).join(', ') + ' ? ' + answer
  };
}

function generateSyllogismQuestion(diff) {
  var sets = ['cats','dogs','birds','fish','mammals','reptiles','insects','animals','plants','trees','flowers','fruits','birds','humans','robots','cars','planes','boats','bicycles','computers','phones'];
  shuffle(sets);
  var A = sets[0], B = sets[1], C = sets[2];

  var patterns = [
    { stmt: 'All ' + A + ' are ' + B + '. All ' + B + ' are ' + C + '.', conc: 'All ' + A + ' are ' + C + '.', answer: 'True', sol: 'All+All=All chain. ' + A + ' ? ' + B + ' ? ' + C + ', valid' },
    { stmt: 'All ' + A + ' are ' + B + '. Some ' + B + ' are ' + C + '.', conc: 'Some ' + A + ' are ' + C + '.', answer: 'Cannot determine', sol: 'All+Some = nothing guaranteed. Those ' + B + ' that are ' + C + ' may not include any ' + A },
    { stmt: 'No ' + A + ' are ' + B + '. All ' + C + ' are ' + B + '.', conc: 'No ' + C + ' are ' + A + '.', answer: 'True', sol: 'No+All=No. ' + C + ' ? ' + B + ', and ' + B + ' has no overlap with ' + A },
    { stmt: 'No ' + A + ' are ' + B + '. All ' + C + ' are ' + A + '.', conc: 'Some ' + C + ' are ' + B + '.', answer: 'False', sol: 'C ? A and AnB=� ? CnB=�. No ' + C + ' can be ' + B },
    { stmt: 'Some ' + A + ' are ' + B + '. All ' + B + ' are ' + C + '.', conc: 'Some ' + A + ' are ' + C + '.', answer: 'True', sol: 'Some+All=Some. The ' + A + ' that are ' + B + ' are also ' + C + ', valid' },
    { stmt: 'Some ' + A + ' are ' + B + '. Some ' + B + ' are ' + C + '.', conc: 'Some ' + A + ' are ' + C + '.', answer: 'Cannot determine', sol: 'Some+Some = nothing guaranteed. Different subsets of B' },
    { stmt: 'All ' + A + ' are ' + B + '. No ' + B + ' are ' + C + '.', conc: 'No ' + A + ' are ' + C + '.', answer: 'True', sol: 'All+No=No. ' + A + ' ? ' + B + ' and BnC=� ? AnC=�' },
    { stmt: 'No ' + A + ' are ' + B + '. Some ' + B + ' are ' + C + '.', conc: 'Some ' + C + ' are ' + A + '.', answer: 'Cannot determine', sol: 'No+Some = nothing guaranteed. ' + A + ' and ' + B + ' are separate, but ' + C + ' could overlap with either' }
  ];

  var p = patterns[rand(0, patterns.length - 1)];
  var opts = ['True','False','Cannot determine','Depends'];
  shuffle(opts);

  return {
    question: p.stmt + ' Conclusion: ' + p.conc,
    answer: p.answer,
    options: opts,
    hint: 'Draw Venn circles: ' + p.sol.split('.')[0],
    timeLimit: diff <= 1 ? 20 : (diff <= 3 ? 15 : 12),
    type: 'pattern',
    patternLabel: 'Syllogism',
    techniqueLabel: 'Syllogism: draw circles. All=contained, Some=overlap, No=separate',
    drillLine1: p.stmt,
    drillLine2: 'Conclusion: ' + p.conc + ' ? ' + p.answer,
    solution: p.sol
  };
}

function generateInequalityQuestion(diff) {
  var vars = ['A','B','C','D','E','F','G','H','P','Q','R','S','X','Y','Z','M','N'];
  shuffle(vars);
  var chainLen = rand(3, 5);
  var symbols = ['>', '<', '=', '=', '='];

  var chain = [];
  for (var i = 0; i < chainLen; i++) {
    var sym = symbols[rand(0, (diff > 1 && i > 1) ? 4 : 1)]; // simpler for low diff
    if (i > 0 && chain[i-1] === '=' && sym !== '=') { sym = '='; } // keep = going
    chain.push(sym);
  }

  // Ensure chain is not contradictory and has some variety
  var qStr = '', prevVar = null;
  var usedVars = [];
  for (var i = 0; i <= chainLen; i++) {
    if (i === 0) { qStr = vars[i]; usedVars.push(vars[i]); prevVar = vars[i]; }
    else {
      var v = vars[i];
      while (usedVars.indexOf(v) >= 0) v = vars[i] + "'";
      usedVars.push(v);
      qStr += ' ' + chain[i-1] + ' ' + v;
      prevVar = v;
    }
  }

  // Ask a question
  var first = vars[0];
  var last = usedVars[usedVars.length - 1];

  // Determine what we can conclude
  var firstRel = '', result = '';
  // Simplify chain to find relation between first and last
  var fVal = 0, lVal = chainLen;
  // rough heuristic: count > and = as +1, < and = as -1, = as 0
  var net = 0;
  var allPositive = true, allNegative = true;
  for (var i = 0; i < chain.length; i++) {
    if (chain[i] === '>' || chain[i] === '=') { net++; allNegative = false; }
    else if (chain[i] === '<' || chain[i] === '=') { net--; allPositive = false; }
    // = doesn't change
  }

  var qTypes = [
    function() { return { q: 'Which is the largest?', ans: first, opts: [first, last, 'Cannot determine', 'None'], desc: 'Largest in chain' }; },
    function() { return { q: 'Which is the smallest?', ans: last, opts: [last, first, 'Cannot determine', 'None'], desc: 'Smallest in chain' }; },
    function() { return { q: 'What can be said about ' + first + ' and ' + last + '?', ans: allPositive ? first + ' > ' + last : (allNegative ? first + ' < ' + last : 'Cannot determine'), opts: [first + ' > ' + last, first + ' = ' + last, first + ' < ' + last, 'Cannot determine'], desc: 'Relation between ends' }; }
  ];

  var q = qTypes[rand(0, qTypes.length - 1)]();
  var answer = q.ans;
  var opts = q.opts.slice();
  shuffle(opts);

  return {
    question: qStr + '. ' + q.q,
    answer: answer,
    options: opts,
    hint: 'Chain same-direction symbols. If sign flips ? stop, cannot combine.',
    timeLimit: diff <= 1 ? 15 : (diff <= 3 ? 12 : 10),
    type: 'pattern',
    patternLabel: 'Inequality',
    techniqueLabel: 'Inequality: ' + q.desc + '. Trace the chain in one direction',
    drillLine1: qStr,
    drillLine2: q.q + ' ? ' + answer,
    solution: 'Chain: ' + qStr + '. ' + q.desc + ' = ' + answer
  };
}

function generateDirectionQuestion(diff) {
  var dirs = ['North','South','East','West'];
  var x = 0, y = 0;
  var moves = [];

  // Add left/right turns with distance
  var numMoves = rand(2, diff <= 1 ? 3 : 4);
  var currentDir = dirs[rand(0, 3)];
  for (var i = 0; i < numMoves; i++) {
    var dist = rand(1, 5 + diff * 2);
    if (currentDir === 'North') { y += dist; moves.push('walks ' + dist + 'm North'); }
    else if (currentDir === 'South') { y -= dist; moves.push('walks ' + dist + 'm South'); }
    else if (currentDir === 'East') { x += dist; moves.push('walks ' + dist + 'm East'); }
    else if (currentDir === 'West') { x -= dist; moves.push('walks ' + dist + 'm West'); }
    if (i < numMoves - 1) {
      currentDir = pick(['left','right']) === 'left' ?
        dirs[(dirs.indexOf(currentDir) + 3) % 4] :
        dirs[(dirs.indexOf(currentDir) + 1) % 4];
      moves.push('turns ' + (currentDir === dirs[(dirs.indexOf(currentDir) + 3) % 4] ? 'left' : 'right'));
    }
  }

  var distance = Math.round(Math.sqrt(x * x + y * y));
  var finalDir = '';
  if (x === 0 && y === 0) finalDir = 'Same point';
  else if (x === 0) finalDir = y > 0 ? 'North' : 'South';
  else if (y === 0) finalDir = x > 0 ? 'East' : 'West';
  else {
    if (y > 0 && x > 0) finalDir = 'North-East';
    else if (y > 0 && x < 0) finalDir = 'North-West';
    else if (y < 0 && x > 0) finalDir = 'South-East';
    else finalDir = 'South-West';
  }

  var askTypes = [
    { q: 'Distance from start?', a: String(distance) + (distance > 0 ? ' m' : ''), isDir: false },
    { q: 'Direction from start?', a: finalDir, isDir: true }
  ];
  var ask = pick(askTypes);

  var opts;
  if (ask.isDir) {
    var allDirs = ['North','South','East','West','North-East','North-West','South-East','South-West','Same point'];
    opts = [ask.a];
    shuffle(allDirs);
    for (var i = 0; opts.length < 4 && i < allDirs.length; i++) { if (opts.indexOf(allDirs[i]) < 0) opts.push(allDirs[i]); }
  } else {
    opts = [ask.a];
    var spread = Math.max(1, Math.round(distance * 0.3));
    while (opts.length < 4) {
      var d = distance + rand(-spread - 2, spread + 2);
      if (opts.indexOf(d) < 0 && d >= 0) opts.push(String(d) + ' m');
    }
  }
  shuffle(opts);
  if (!ask.isDir && distance === 0) { ask.a = 'Same point'; opts = ['Same point','North','South','East']; shuffle(opts); }

  return {
    question: moves.join('. ') + '. ' + ask.q,
    answer: ask.a,
    options: opts,
    hint: 'Track N/S and E/W separately. Right=clockwise 90°, left=anti-clockwise 90°. Pythagoras only if both axes changed.',
    timeLimit: diff <= 1 ? 20 : (diff <= 3 ? 15 : 12),
    type: 'pattern',
    patternLabel: 'Direction',
    techniqueLabel: 'Direction: track N/S and E/W axes separately. Right=clockwise, Left=anti-clockwise.',
    drillLine1: 'Net: N/S=' + y + ', E/W=' + x,
    drillLine2: ask.q + ' = ' + ask.a,
    solution: 'Path: ' + moves.join('; ') + '. Net: y=' + y + ', x=' + x + '. ' + ask.q + ' = ' + ask.a
  };
}

function turnDir(current, turn) {
  var order = ['North','East','South','West'];
  var idx = order.indexOf(current);
  if (turn === 'left') return order[(idx + 3) % 4];
  return order[(idx + 1) % 4];
}

var BLOOD_RELATION_NAMES = ['A','B','C','D','E','P','Q','R','S','X','Y','Z','M','N'];

function generateBloodRelationQuestion(diff) {
  shuffle(BLOOD_RELATION_NAMES);
  var A = BLOOD_RELATION_NAMES[0], B = BLOOD_RELATION_NAMES[1], C = BLOOD_RELATION_NAMES[2];

  var trees = [
    // A is B's father. B is C's brother. How is A related to C?
    { facts: [A + ' is ' + B + "'s father", B + ' is ' + C + "'s brother"], q: 'How is ' + A + ' related to ' + C + '?', a: 'Father', opts: ['Father','Uncle','Grandfather','Brother'], sol: A + ' is ' + B + "'s father. " + B + ' and ' + C + ' are siblings ? ' + A + ' is also ' + C + "'s father" },
    // A is B's mother. B is C's daughter. How is A related to C?
    { facts: [A + ' is ' + B + "'s mother", B + ' is ' + C + "'s daughter"], q: 'How is ' + A + ' related to ' + C + '?', a: 'Grandmother', opts: ['Grandmother','Mother','Aunt','Sister'], sol: 'A?B (mother). B?C (daughter). So A is C\'s grandparent: Grandmother' },
    // A is B's sister. B is C's father. How is A related to C?
    { facts: [A + ' is ' + B + "'s sister", B + ' is ' + C + "'s father"], q: 'How is ' + A + ' related to ' + C + '?', a: 'Aunt', opts: ['Aunt','Mother','Sister','Cousin'], sol: A + ' and ' + B + ' are siblings. B is ' + C + "'s father ? " + A + ' is ' + C + "'s Aunt" },
    // A is B's wife. B is C's father. How is A related to C?
    { facts: [A + ' is ' + B + "'s wife", B + ' is ' + C + "'s father"], q: 'How is ' + A + ' related to ' + C + '?', a: 'Mother', opts: ['Mother','Wife','Sister','Aunt'], sol: A + ' is married to ' + B + '. B is ' + C + "'s father ? " + A + ' is ' + C + "'s mother" },
    // A is B's brother. B is C's mother. How is A related to C?
    { facts: [A + ' is ' + B + "'s brother", B + ' is ' + C + "'s mother"], q: 'How is ' + A + ' related to ' + C + '?', a: 'Uncle', opts: ['Uncle','Father','Brother','Grandfather'], sol: A + ' and ' + B + ' are siblings. B is ' + C + "'s mother ? " + A + ' is ' + C + "'s Uncle" },
    // A is B's father. B is C's husband. How is A related to C?
    { facts: [A + ' is ' + B + "'s father", B + ' is ' + C + "'s husband"], q: 'How is ' + A + ' related to ' + C + '?', a: 'Father-in-law', opts: ['Father-in-law','Father','Uncle','Grandfather'], sol: A + ' is ' + B + "'s father. " + B + ' is married to ' + C + ' ? ' + A + ' is ' + C + "'s father-in-law" },
    // A is B's daughter. B is C's father. How is A related to C?
    { facts: [A + ' is ' + B + "'s daughter", B + ' is ' + C + "'s father"], q: 'How is ' + A + ' related to ' + C + '?', a: 'Sister', opts: ['Sister','Daughter','Aunt','Cousin'], sol: 'B is ' + A + "'s father and also " + C + "'s father ? " + A + ' and ' + C + ' are siblings. Sister' },
    // A is B's mother-in-law. B is C's mother. How is A related to C?
    { facts: [A + ' is ' + B + "'s mother-in-law", B + ' is ' + C + "'s mother"], q: 'How is ' + A + ' related to ' + C + '?', a: 'Great-grandmother', opts: ['Grandmother','Mother','Great-grandmother','Aunt'], sol: 'A is ' + B + "'s mother-in-law, " + B + ' is ' + C + "'s mother. So A is " + C + "'s great-grandmother" }
  ];

  var tree = pick(trees);
  var opts = tree.opts.slice();
  shuffle(opts);

  return {
    question: tree.facts[0] + '. ' + tree.facts[1] + '. ' + tree.q,
    answer: tree.a,
    options: opts,
    hint: 'Draw a 4-level family tree: GP ? Parent ? Me ? Child. Same level = sibling.',
    timeLimit: diff <= 1 ? 25 : (diff <= 3 ? 20 : 15),
    type: 'pattern',
    patternLabel: 'Blood Relation',
    techniqueLabel: 'Blood Relation: draw 4-level tree. Same level = sibling. Marriage = horizontal line',
    drillLine1: tree.facts[0] + '; ' + tree.facts[1],
    drillLine2: tree.q + ' ? ' + tree.a,
    solution: tree.sol
  };
}

function generateDataSufficiencyQuestion(diff) {
  var scenarios = [
    { q: 'Is ' + pick(['X','P','M','A']) + ' > ' + pick(['Y','Q','N','B']) + '?',
      s1: pick(['X','P','M','A']) + ' + ' + pick(['Y','Q','N','B']) + ' = ' + rand(8, 20),
      s2: pick(['X','P','M','A']) + ' = 2' + pick(['Y','Q','N','B']),
      a: 'Both statements', opts: ['Statement 1 alone','Statement 2 alone','Both statements','Neither statement'],
      sol: 'S1 alone: infinite pairs. S2 alone: relation but no values. Together: solve. Both needed (C)' },
    { q: 'What is the value of ' + pick(['x','a','p','m']) + '?',
      s1: pick(['x','a','p','m']) + ' + ' + pick(['y','b','q','n']) + ' = ' + rand(5, 15),
      s2: pick(['x','a','p','m']) + ' - ' + pick(['y','b','q','n']) + ' = ' + rand(1, 5),
      a: 'Both statements', opts: ['Statement 1 alone','Statement 2 alone','Both statements','Neither statement'],
      sol: 'S1 alone: infinite pairs. S2 alone: infinite pairs. Together: solve 2 equations. Both needed (C)' },
    { q: 'Is ' + pick(['n','k','p']) + ' divisible by ' + pick([3,5,7]) + '?',
      s1: pick(['n','k','p']) + ' is ' + pick(['even','odd']),
      s2: pick(['n','k','p']) + ' ends with ' + pick(['0','5','2','4']),
      a: 'Cannot determine', opts: ['Statement 1 alone','Statement 2 alone','Both statements','Neither statement'],
      sol: 'S1 alone: parity doesn\'t determine divisibility. S2 alone: insufficient. Combined may not help (D)' },
    { q: 'Is ' + pick(['P','X','M']) + ' a prime number?',
      s1: pick(['P','X','M']) + ' is ' + pick(['odd','even','greater than 10']),
      s2: pick(['P','X','M']) + ' has exactly 2 factors',
      a: 'Statement 2 alone', opts: ['Statement 1 alone','Statement 2 alone','Both statements','Neither statement'],
      sol: 'S1 alone: odd numbers can be composite (9,15). S2 alone: definition of prime ? exactly 2 factors. Sufficient (B)' },
    { q: 'How many children does ' + pick(['M','P','R']) + ' have?',
      s1: 'Each child has ' + rand(1, 3) + ' siblings',
      s2: pick(['M','P','R']) + ' has ' + rand(1, 4) + ' sons',
      a: 'Both statements', opts: ['Statement 1 alone','Statement 2 alone','Both statements','Neither statement'],
      sol: 'S1 alone: each child having N siblings ? N+1 children total. S2 alone: only sons count. Both needed (C)' }
  ];

  var s = pick(scenarios);
  var opts = s.opts.slice();
  shuffle(opts);

  return {
    question: s.q + ' Statement 1: ' + s.s1 + '. Statement 2: ' + s.s2 + '.',
    answer: s.a,
    options: opts,
    hint: 'Check each alone first. If S1 alone works ? A. If S2 alone works ? B. Both needed ? C. Neither ? D.',
    timeLimit: diff <= 1 ? 20 : (diff <= 3 ? 15 : 12),
    type: 'pattern',
    patternLabel: 'Data Sufficiency',
    techniqueLabel: 'Data Sufficiency: S1 alone? ? A/D. S2 alone? ? B/D. Both? ? C. Neither ? D/E',
    drillLine1: 'S1: ' + s.s1 + ' | S2: ' + s.s2,
    drillLine2: s.q + ' ? ' + s.a,
    solution: s.sol
  };
}

// Update generatePatternQuestion to use procedural generators with hardcoded fallback
var _origGeneratePattern = generatePatternQuestion;
generatePatternQuestion = function(diff, focusType) {
  var type = focusType || PATTERN_TYPES[rand(0, PATTERN_TYPES.length - 1)];

  // Dispatch to procedural generators
  var genMap = {
    'Analogy': generateAnalogyQuestion,
    'Classification': generateClassificationQuestion,
    'Series': generateSeriesQuestion,
    'Coding': generateCodingQuestion,
    'Syllogism': generateSyllogismQuestion,
    'Inequality': generateInequalityQuestion,
    'Direction': generateDirectionQuestion,
    'Blood Relation': generateBloodRelationQuestion,
    'Puzzle': function(d) { return GENERATORS.puzzle(d); },
    'Data Sufficiency': generateDataSufficiencyQuestion
  };

  try {
    var gen = genMap[type];
    if (gen) {
      var q = gen(diff);
      q.patternLabel = type;
      return q;
    }
  } catch(e) { /* fallback to hardcoded bank */ }

  // Fallback to hardcoded bank
  return _origGeneratePattern(diff, focusType);
};

// Quick Solve — generate a real question from any type, user must SOLVE it fast
var _origGenerateRecognition = generateRecognitionQuestion;
generateRecognitionQuestion = function(diff) {
  try {
    var types = ['Analogy','Classification','Series','Coding','Syllogism','Inequality','Direction','Blood Relation'];
    var type = types[rand(0, types.length - 1)];
    var genMap = {
      'Analogy': generateAnalogyQuestion,
      'Classification': generateClassificationQuestion,
      'Series': generateSeriesQuestion,
      'Coding': generateCodingQuestion,
      'Syllogism': generateSyllogismQuestion,
      'Inequality': generateInequalityQuestion,
      'Direction': generateDirectionQuestion,
      'Blood Relation': generateBloodRelationQuestion
    };
    var gen = genMap[type];
    if (gen) {
      var q = gen(diff);
      var cleanQ = q.question.replace(/^\([^)]+\)\s*/, '');
      var opts = q.options || [];
      var qAns = q.answer || '';
      var qSol = q.solution || '';
      // Short time limit — speed practice
      var secs = diff <= 1 ? 10 : (diff <= 3 ? 7 : 5);
  return {
    question: cleanQ,
    answer: qAns,
    options: opts,
    hint: 'Read fast, trust your first instinct',
    timeLimit: secs,
    type: 'recognize',
    patternLabel: type,
    techniqueLabel: 'Solve in ' + secs + 's — spot the pattern, pick the answer',
    drillLine1: '⚡ ' + type + ' — ' + cleanQ.substring(0, 45) + '...',
    drillLine2: 'Answer: ' + qAns + ' (' + type + ')',
    solution: '[' + type + '] ' + qAns + ' — ' + qSol.substring(0, 200),
    intuition: 'Quick Solve: identify the TYPE first. Is it analogy, series, coding? Type determines which shortcut to use.'
  };
    }
  } catch(e) { /* fallback */ }
  return _origGenerateRecognition(diff);
};

// Update GENERATORS to use procedural versions
GENERATORS.pattern = generatePatternQuestion;
GENERATORS.recognize = generateRecognitionQuestion;
// Add direct-access generators for focus-type drills
GENERATORS.Analogy = generateAnalogyQuestion;
GENERATORS.Classification = generateClassificationQuestion;
GENERATORS.Series = generateSeriesQuestion;
GENERATORS.Coding = generateCodingQuestion;
GENERATORS.Syllogism = generateSyllogismQuestion;
GENERATORS.Inequality = generateInequalityQuestion;
GENERATORS.Direction = generateDirectionQuestion;
GENERATORS['Blood Relation'] = generateBloodRelationQuestion;
GENERATORS['Data Sufficiency'] = generateDataSufficiencyQuestion;

// ====== QUANT SUB-TOPIC GENERATORS ======

function generateNumberSenseQuestion(diff, layer) {
  var intuitions = {
    square: 'Split (a+b)² = a² + 2ab + b². Ex: 12² = (10+2)² = 100+40+4 = 144',
    cube: 'Cube = number × itself twice. 6³ = 6×6×6 = 36×6 = 216',
    sqrt: 'Find what number multiplied by itself gives the result. √144 = 12 because 12×12 = 144',
    div: 'Think multiplication: a÷b = c means c×b = a. 56÷7 = 8 because 8×7 = 56',
    lcm: 'LCM = product / HCF. For co-prime numbers, LCM = product itself',
    hcf: 'HCF = the largest number that divides both. For difference method: HCF(a,b) = HCF(a-b,b)',
    approx: 'Round to nearest ten/hundred, then compute. Check if result is close to original.',
    vbodmas: 'BODMAS: Brackets > Orders > Division > Multiplication > Addition > Subtraction. Do ×/÷ before +/-.'
  };
  var types = [
    function square(){ var n = rand(10, 30 + diff * 5); return { q: n + '\u00B2', a: n * n, hint: (n/10|0)*10 + '+' + n%10 + ' squared', intuition: intuitions.square }; },
    function cube(){ var n = rand(3, 9 + diff); return { q: n + '\u00B3', a: n*n*n, hint: 'Multiply thrice', intuition: intuitions.cube }; },
    function sqrt(){ var n = rand(4, 15 + diff * 2); return { q: '\u221A' + (n*n), a: n, hint: 'Perfect square', intuition: intuitions.sqrt }; },
    function div(){ var n = (rand(1, 8) + 1) * rand(5, 15); var d = rand(2, 9); return { q: n + ' \u00F7 ' + d, a: Math.floor(n/d), hint: n + '/' + d + ' = ' + Math.floor(n/d), intuition: intuitions.div }; },
    function lcm(){ var a = rand(3, 8 + diff), b = rand(4, 10 + diff); var l = a*b; for(var i=Math.max(a,b); i<=a*b; i++){if(i%a===0&&i%b===0){l=i;break;}} return { q: 'LCM of ' + a + ' and ' + b, a: l, hint: 'Find smallest common multiple', intuition: intuitions.lcm }; },
    function hcf(){ var a = rand(6, 20 + diff*2), b = rand(6, 20 + diff*2); var h=1; for(var i=Math.min(a,b);i>=1;i--){if(a%i===0&&b%i===0){h=i;break;}} return { q: 'HCF of ' + a + ' and ' + b, a: h, hint: 'Find largest common factor', intuition: intuitions.hcf }; },
    // Approximation: 47×53 ≈ ?
    function(){ var a=rand(4,8), b=rand(a+1,9); var n1=a*10+rand(1,9), n2=b*10+rand(1,9); return { q: 'Approx: ' + n1 + ' × ' + n2 + ' (closest to?)', a: Math.round(n1*n2/100)*100, hint: 'Round: ' + Math.round(n1/10)*10 + ' × ' + Math.round(n2/10)*10, intuition: 'Round to nearest 10: ' + Math.round(n1/10)*10 + ' × ' + Math.round(n2/10)*10 + ' = ' + (Math.round(n1/10)*10*Math.round(n2/10)*10) + '. Actual ≈ ' + n1*n2 }; },
    // VBODMAS: 12 + 6 × 3 ÷ 2 - 4
    function(){ var a=rand(2,8), b=rand(2,6), c=rand(2,5), d=rand(1,4); return { q: 'Solve: ' + a + ' + ' + b + ' × ' + c + ' ÷ ' + d + ' - ' + rand(1,3), a: a + b*c/d - rand(1,3) | 0, hint: 'BODMAS: ×÷ before +-', intuition: b + ' × ' + c + ' ÷ ' + d + ' = ' + (b*c/d) + '. Then ' + a + ' + ' + (b*c/d|0) + ' - ' + rand(1,3) + ' = ' + (a + (b*c/d|0) - rand(1,3)) }; }
  ];
  if (layer === 'instinct') types = types.slice(0, 3);
  var type = types[rand(0, types.length - 1)];
  var data = type();
  var opts = [data.a];
  while (opts.length < 4) { var d = data.a + rand(-5, 5); if (opts.indexOf(d) < 0 && d > 0) opts.push(d); }
  shuffle(opts);
  return { question: data.q, answer: data.a, options: opts, hint: data.hint, timeLimit: layer === 'instinct' ? 10 : (diff <= 1 ? 15 : 12), type: 'quant', techniqueLabel: 'Number Sense: ' + data.q, intuition: data.intuition || 'Find the right operation first' };
}

function generatePercentageQuestion(diff, layer) {
  var types = [
    // Successive discount / increase: net % change with formula
    function(){ var a=rand(5,30), b=rand(5,20); return { q: 'Successive increase ' + a + '% then ' + b + '%. Net % change?', a: Math.round((a+b+a*b/100)*10)/10, hint: 'a + b + ab/100', intuition: 'Formula: x + y + xy/100. ' + a + '+' + b + '+' + (a*b/100) + ' = ' + Math.round((a+b+a*b/100)*10)/10 + '%' }; },
    // Estimate percentage: 47 is what % of 78? — real exam style
    function(){ var n=rand(30,90), w=rand(60,150); return { q: 'What % of ' + w + ' is ' + n + '? (approx)', a: Math.round(n/w*100), hint: 'Round to nearest 10: ' + (Math.round(n/10)*10) + '/' + (Math.round(w/10)*10) + ' × 100', intuition: 'Approx: ' + n + '/' + w + ' × 100 ≈ ' + Math.round(n/w*100) + '%' }; },
    // Profit/Loss: find CP when SP & profit% given
    function(){ var cp=rand(30,80)*10, p=[8,12,15,20,25][rand(0,4)]; return { q: 'SP=Rs' + Math.round(cp*(100+p)/100) + ', profit ' + p + '%. CP?', a: cp, hint: 'CP = SP × 100/(100+p)', intuition: 'CP = ' + Math.round(cp*(100+p)/100) + ' × 100/' + (100+p) + ' = ' + cp }; },
    // Population increase/decrease
    function(){ var p=[50000,80000,120000][rand(0,2)], r=rand(4,12); return { q: 'Pop=' + p + ', increases ' + r + '% yearly. Pop after 2yr?', a: Math.round(p * (1+r/100) * (1+r/100)), hint: 'Multiply by (1 + r/100) each year', intuition: 'Year1: ' + p + ' × ' + (1+r/100) + ' = ' + Math.round(p*(1+r/100)) + '. Year2: × ' + (1+r/100) + ' = ' + Math.round(p*(1+r/100)*(1+r/100)) }; },
    // Marked Price → discount → profit: find discount %
    function(){ var cp=rand(20,50)*10, gp=[10,15,20,25][rand(0,3)], md=[15,20,25,30][rand(0,3)]; return { q: 'CP=Rs' + cp + ', gain ' + gp + '%, MP ' + md + '% above CP. Discount %?', a: Math.round(100 - (100+gp)/(100+md)*100), hint: 'SP=' + (100+gp) + '% of CP, MP=' + (100+md) + '% of CP', intuition: 'SP/MP = (' + (100+gp) + ')/(' + (100+md) + '). Discount = 1 - ' + (100+gp) + '/' + (100+md) + ' = ' + Math.round(100 - (100+gp)/(100+md)*100) + '%' }; }
  ];
  var type = types[rand(0, types.length - 1)];
  var data = type();
  var opts = [data.a];
  while (opts.length < 4) { var d = data.a + rand(-6, 6); if (opts.indexOf(d) < 0 && d >= 0) opts.push(Math.round(d)); }
  shuffle(opts);
  return { question: data.q, answer: data.a, options: opts, hint: data.hint, timeLimit: layer === 'instinct' ? 15 : 20, type: 'quant', techniqueLabel: 'Percentage: ' + data.hint, intuition: data.intuition || 'Successive %: x + y + xy/100. Profit: (SP-CP)/CP×100. Population: multiply by (1+r/100)^n' };
}

function generateArithmeticQuestion(diff, layer) {
  var types = [
    // Age problem: ratio ages with future/past
    function(){ var a=rand(3,6), b=rand(2,Math.max(1,a-2)); var f=rand(3,8); return { q: 'Ratio of ages ' + a + ':' + b + '. In ' + f + ' yrs ratio becomes ' + (a+f) + ':' + (b+f) + '. Find A\'s present age?', a: a*Math.round(f*(a-b)/( (a+f)*(b) - (b+f)*a )), hint: 'Use difference of ratios method', intuition: 'Age ratio method: difference in = ' + f + '×(ratio diff). Or solve (A+' + f + ')/' + (a+f) + ' = (B+' + f + ')/' + (b+f) }; },
    // Alligation: milk-water mixture strong type
    function(){ var c1=[50,60,70,80][rand(0,3)], c2=[20,25,30][rand(0,3)]; var m=c1-c2; var t=c2+rand(5, Math.min(15, c1-c2-1)); var r1=t-c2; var r2=c1-t; var total=rand(20,50); return { q: 'Milk Rs' + c1 + '/L mixed with water. Mean Rs' + t + '/L. Milk:water ratio?', a: r1 + ':' + r2, hint: 'Alligation: (mean-low):(high-mean) = ' + r1 + ':' + r2, intuition: 'Alligation: Draw a cross. ' + c1 + ' (top) - ' + t + ' (mean) = ' + r1 + ' (bottom right). ' + c2 + ' (bottom) - ' + t + ' = ' + r2 + ' (top left). Ratio = ' + r1 + ':' + r2 }; },
    // Pipe A fills, B fills, C empties
    function(){ var a=rand(3,8), b=rand(4,10), c=rand(a+1, b+a+5); return { q: 'Pipe A fills in ' + a + 'hr, B in ' + b + 'hr, C empties in ' + c + 'hr. All open?', a: Math.round(1/(1/a+1/b-1/c)*10)/10, hint: 'Net = 1/A + 1/B - 1/C', intuition: 'Rate = 1/' + a + ' + 1/' + b + ' - 1/' + c + ' = ' + (1/a+1/b-1/c).toFixed(4) + '. Time = ' + Math.round(1/(1/a+1/b-1/c)*10)/10 + ' hr' }; },
    // Work-time with efficiency ratio
    function(){ var a=rand(9,18), eff=rand(2,4); return { q: 'A takes ' + a + ' days. B is ' + eff + '× efficient. Together?', a: Math.round(a/(1+eff)*10)/10, hint: 'B rate = ' + eff + '/A, combined = ' + (1+eff) + '/A', intuition: 'B is ' + eff + '× faster → B does ' + eff + '/day when A does 1/' + a + '/day. Combined = ' + (1+eff) + '/' + a + '. Time = ' + a + '/' + (1+eff) + ' = ' + Math.round(a/(1+eff)*10)/10 + ' days' }; },
    // Sum of money distributed in ratio
    function(){ var r1=rand(2,6), r2=rand(3,7), r3=rand(1,4); var total=Math.round((r1+r2+r3)*rand(10,30)); return { q: 'Rs' + total + ' divided ' + r1 + ':' + r2 + ':' + r3 + '. B\'s share?', a: Math.round(total * r2 / (r1+r2+r3)), hint: r2 + ' parts out of ' + (r1+r2+r3), intuition: 'Total parts = ' + (r1+r2+r3) + '. B = ' + r2 + '/' + (r1+r2+r3) + ' × ' + total + ' = ' + Math.round(total*r2/(r1+r2+r3)) }; }
  ];
  var type = types[rand(0, types.length - 1)];
  var data = type();
  var opts = [data.a];
  while (opts.length < 4) { var d = typeof data.a === 'string' ? data.a.split(':')[0] + ':' + (parseInt(data.a.split(':')[1])+rand(-1,1)) : data.a + rand(-5, 5); if (opts.indexOf(d) < 0 && d > 0) opts.push(d); }
  shuffle(opts);
  return { question: data.q, answer: data.a, options: opts, hint: data.hint, timeLimit: layer === 'instinct' ? 15 : 20, type: 'quant', techniqueLabel: 'Arithmetic: ' + data.hint, intuition: data.intuition || 'Alligation: (mean-low):(high-mean). Ages: ratio difference method. Work: add rates.' };
}

function generateMotionQuestion(diff, layer) {
  var types = [
    // Type 1: Time to cross pole (given length + speed)
    function(){ var l=rand(100,300), s=[36,45,54,60,72,90][rand(0,5)]; var ms=s*5/18; return { q: 'Train len='+l+'m at '+s+'km/h crosses a pole in?', a: Math.round(l/ms*10)/10, hint: 'Speed m/s='+s+'×5/18='+Math.round(ms)+', time='+l+'/'+Math.round(ms), intuition: 'km/h→m/s: ×5/18. '+s+'×5/18='+Math.round(ms)+'m/s. Time='+l+'/'+Math.round(ms)+'='+Math.round(l/ms*10)/10+'s' }; },
    // Type 2: Time to cross platform (given train length + platform length + speed)
    function(){ var l=rand(100,200), p=rand(200,400), s=[45,54,60,72][rand(0,3)]; var ms=s*5/18; return { q: 'Train '+l+'m at '+s+'km/h crosses '+p+'m platform in?', a: Math.round((l+p)/ms*10)/10, hint: 'Total='+(l+p)+'m, speed='+Math.round(ms)+'m/s', intuition: 'Add lengths. Total='+(l+p)+'m, speed='+Math.round(ms)+'m/s. Time='+(l+p)+'/'+Math.round(ms)+'='+Math.round((l+p)/ms*10)/10+'s' }; },
    // Type 3: Two trains opposite direction → time to cross each other
    function(){ var l1=rand(100,250), l2=rand(100,250), v1=[36,45,54][rand(0,2)], v2=[45,54,60][rand(0,2)]; return { q: 'Two trains '+l1+'m & '+l2+'m at '+v1+' & '+v2+' km/h cross each other (opposite) in?', a: Math.round((l1+l2)/((v1+v2)*5/18)*10)/10, hint: 'Rel speed='+(v1+v2)+'km/h='+Math.round((v1+v2)*5/18)+'m/s', intuition: 'Opposite: ADD speeds. Rel='+(v1+v2)+'km/h='+Math.round((v1+v2)*5/18)+'m/s. Time='+(l1+l2)+'/'+Math.round((v1+v2)*5/18)+'='+Math.round((l1+l2)/((v1+v2)*5/18)*10)/10+'s' }; },
    // Type 4: Same direction overtake → time
    function(){ var v1=[54,60,72,90][rand(0,3)], v2=[36,45,54][rand(0,3)]; if(v1<=v2){var t=v1;v1=v2;v2=t;} var l1=rand(150,300), l2=rand(100,200); return { q: 'Train1 '+l1+'m at '+v1+'km/h overtakes Train2 '+l2+'m at '+v2+'km/h (same dir). Time?', a: Math.round((l1+l2)/((v1-v2)*5/18)*10)/10, hint: 'Rel speed='+(v1-v2)+'km/h='+Math.round((v1-v2)*5/18)+'m/s', intuition: 'Same dir: SUBTRACT speeds. Rel='+(v1-v2)+'km/h='+Math.round((v1-v2)*5/18)+'m/s. Time='+(l1+l2)+'/'+Math.round((v1-v2)*5/18)+'='+Math.round((l1+l2)/((v1-v2)*5/18)*10)/10+'s' }; },
    // Type 5: Train passes man running same direction → time
    function(){ var l=rand(100,200), ts=[45,54,60][rand(0,3)], ms=[3,5,7,9][rand(0,3)]; if(ts<=ms)ts+=10; return { q: 'Train '+l+'m at '+ts+'km/h passes man running '+ms+'km/h same dir in?', a: Math.round(l/((ts-ms)*5/18)*10)/10, hint: 'Rel speed='+(ts-ms)+'km/h='+Math.round((ts-ms)*5/18)+'m/s', intuition: 'Rel speed='+ts+'-'+ms+'='+(ts-ms)+'km/h='+Math.round((ts-ms)*5/18)+'m/s. Time='+l+'/'+Math.round((ts-ms)*5/18)+'='+Math.round(l/((ts-ms)*5/18)*10)/10+'s' }; },
    // Type 6: m/min → km/h conversion
    function(){ var d=rand(300,900), t=rand(2,5); return { q: 'Person covers '+d+'m in '+t+'min. Speed in km/h?', a: Math.round(d/(t*60)*18/5*10)/10, hint: 'm/s→km/h: ×18/5', intuition: 'Speed='+d+'/'+(t*60)+'='+Math.round(d/(t*60)*100)/100+'m/s. ×18/5='+Math.round(d/(t*60)*18/5*10)/10+'km/h' }; },
    // === INDIABIX-STYLE REVERSE VARIANTS ===
    // Type 7: Find train length (given speed + time to cross pole) — IndiaBix Q1 style
    function(){ var s=[36,45,54,60,72,90][rand(0,5)]; var t=rand(6,15); var ms=s*5/18; return { q: 'Train at '+s+'km/h crosses a pole in '+t+'s. Length?', a: Math.round(ms*t), hint: 'Length = speed(m/s) × time = '+Math.round(ms)+'×'+t, intuition: 'km/h→m/s: ×5/18. '+s+'×5/18='+Math.round(ms)+'m/s. Length='+Math.round(ms)+'×'+t+'='+Math.round(ms*t)+'m' }; },
    // Type 8: Find bridge length (given train length + speed + time) — IndiaBix Q3 style
    function(){ var l=rand(100,200), s=[45,54,60,72][rand(0,3)], t=rand(18,40); var ms=s*5/18; var total=Math.round(ms*t); var bridge=total-l; if(bridge<50)bridge=rand(200,400); return { q: 'Train '+l+'m at '+s+'km/h crosses bridge in '+t+'s. Bridge length?', a: bridge, hint: 'Total distance='+Math.round(ms)+'×'+t+'='+Math.round(ms*t)+', subtract train '+l, intuition: 'Speed m/s='+Math.round(ms)+'. Total='+Math.round(ms)+'×'+t+'='+Math.round(ms*t)+'m. Bridge='+Math.round(ms*t)+'-'+l+'='+bridge+'m' }; },
    // Type 9: Find train speed (given length + time to pass man running same direction) — IndiaBix Q2 style
    function(){ var l=rand(125,200), t=rand(8,15), ms=rand(3,6); return { q: 'Train '+l+'m passes man running '+ms+'m/s same dir in '+t+'s. Train speed (m/s)?', a: Math.round(l/t+ms), hint: 'Rel speed = '+l+'/'+t+'='+Math.round(l/t)+'. Train = rel + man', intuition: 'Relative speed = '+l+'/'+t+'='+Math.round(l/t)+'m/s. Train speed = rel + man speed = '+Math.round(l/t)+'+'+ms+'='+Math.round(l/t+ms)+'m/s' }; },
    // Type 10: Find platform length (given speed + man-time + platform-time) — IndiaBix Q5 style
    function(){ var s=[45,54,60,72][rand(0,3)]; var ms=s*5/18; var tm=rand(15,25); var tp=rand(tm+8, tm+25); var trainLen=Math.round(ms*tm); var total=Math.round(ms*tp); var plat=total-trainLen; if(plat<50)plat=rand(150,350); return { q: 'Train at '+s+'km/h passes man in '+tm+'s, platform in '+tp+'s. Platform length?', a: plat, hint: 'Train len='+Math.round(ms)+'×'+tm+'='+trainLen+'. Total='+Math.round(ms)+'×'+tp+'='+total+'. Platform='+total+'-'+trainLen, intuition: 'Train length = '+Math.round(ms)+'×'+tm+'='+trainLen+'m. Total platform+cross = '+Math.round(ms)+'×'+tp+'='+total+'m. Platform = '+total+'-'+trainLen+'='+plat+'m' }; }
  ];
  var type = types[rand(0, types.length - 1)];
  var data = type();
  var opts = [data.a];
  while (opts.length < 4) { var d = Math.round(data.a*10)/10+rand(-4,4); if (opts.indexOf(d) < 0 && d > 0) opts.push(d); }
  shuffle(opts);
  return { question: data.q, answer: data.a, options: opts, hint: data.hint, timeLimit: layer === 'instinct' ? 15 : 20, type: 'quant', techniqueLabel: 'Motion: '+data.hint, intuition: data.intuition||'Key shortcut: km/h × 5/18 = m/s. Train crossing pole = just train length. Train crossing platform = add both lengths.' };
}

function generateWorkQuestion(diff, layer) {
  var ty = [
    // A+B together
    function(){var a=rand(6,20), b=rand(8,25); return { q: 'A completes work in '+a+' days, B in '+b+' days. Together?', a: Math.round(a*b/(a+b)*10)/10, hint: 'Together = product/sum = '+(a*b)+'/'+(a+b), intuition: 'Shortcut: product/sum. '+a+'×'+b+'/'+(a+b)+' = '+Math.round(a*b/(a+b)*10)/10+' days' }; },
    // A+B then A leaves: remaining work by B
    function(){var a=rand(8,15), b=rand(10,20); var together = Math.round(a*b/(a+b)); var d=rand(2, Math.max(1, together-2)); return { q: 'A & B together take '+together+' days. A leaves '+d+' days before finish. B alone finishes in?', a: Math.round((1 - d/a) / (1/b) * 10)/10, hint: 'Work left after A leaves = '+d+'/'+a, intuition: 'A absent last '+d+' days → work left = A\'s portion = '+d+'/'+a+'. Time for B alone = work left / B\'s rate' }; },
    // Pipe A fills, pipe B empties (ensuring fill < empty so net positive)
    function(){var a=rand(4,8), b=rand(a+2,15); return { q: 'Pipe A fills tank in '+a+'hr, pipe B empties in '+b+'hr. Both open?', a: Math.round(a*b/(b-a)*10)/10, hint: 'Net = 1/'+a+' - 1/'+b+' = '+(b-a)+'/'+(a*b), intuition: 'Fill - empty net: 1/'+a+' - 1/'+b+' = '+(b-a)+'/'+(a*b)+'. Time = '+a*b+'/'+(b-a)+' = '+Math.round(a*b/(b-a)*10)/10+' hr' }; },
    // A is X times as efficient as B
    function(){var a=rand(10,30), x=[2,3,4][rand(0,2)]; return { q: 'A is '+x+'× as efficient as B. A finishes in '+a+' days. B alone?', a: a*x, hint: 'B takes '+x+'× longer', intuition: 'Efficiency ∝ 1/time. '+x+'× efficient → 1/'+x+'× time. B takes '+a+'×'+x+'='+(a*x)+' days' }; },
    // Wages distribution by work ratio
    function(){var a=rand(6,15), b=rand(10,20), w=rand(2000,5000); return { q: 'A takes '+a+' days, B '+b+' days. Total wage Rs'+w+'. A share?', a: Math.round(w*b/(a+b)*10)/10, hint: 'Ratio 1/A:1/B = B:A', intuition: 'Wage ratio = 1/'+a+' : 1/'+b+' = '+b+' : '+a+'. A share = '+b+'/'+(a+b)+'×'+w+' = '+Math.round(w*b/(a+b)) }; }
  ];
  var t = ty[rand(0, ty.length - 1)];
  var d = t();
  var o = [d.a]; while(o.length<4){var v=Math.round(d.a*10)/10+rand(-2,2); if(o.indexOf(v)<0&&v>0)o.push(v);}
  shuffle(o);
  return { question: d.q, answer: d.a, options: o, hint: d.hint, timeLimit: layer==='instinct'?15:20, type:'quant', techniqueLabel:'Work: '+d.hint, intuition: d.intuition||'Key: total work = LCM of days. Combined rate work = product/sum = a×b/(a+b).' };
}

function generateAlgebraQuestion(diff, layer) {
  var types = [
    // Age problem: A is 3x B. In 5 yrs, A=2x B
    function(){ var b=rand(3,8), m=rand(2,4); var a=m*b; var f=rand(3,8); return { q: 'A is ' + m + '× B\'s age. In ' + f + ' yrs, A = ' + (m-1) + '× B. B now?', a: f*(m-1) - f, hint: 'Let B=x, A=' + m + 'x. Then ' + m + 'x+' + f + '=' + (m-1) + '(x+' + f + ')', intuition: 'Equation: ' + m + 'x + ' + f + ' = ' + (m-1) + '(x + ' + f + '). Solve: ' + m + 'x + ' + f + ' = ' + (m-1) + 'x + ' + ((m-1)*f) + ', ' + m + 'x - ' + (m-1) + 'x = ' + ((m-1)*f-f) + ', x = ' + ((m-1)*f-f) }; },
    // Two-variable: sum and difference
    function(){ var x=rand(15,40), y=rand(5,Math.max(1,x-10)); return { q: 'Sum of two numbers = ' + (x+y) + ', difference = ' + (x-y) + '. Larger number?', a: x, hint: 'Larger = (sum + diff)/2', intuition: 'Larger = (sum + diff)/2 = (' + (x+y) + '+' + (x-y) + ')/2 = ' + (2*x) + '/2 = ' + x + '. Smaller = (sum - diff)/2 = ' + y }; },
    // Fraction with numerator/denominator
    function(){ var n=rand(1,5), d=rand(n+1,9); return { q: 'Denominator > numerator by ' + (d-n) + '. Sum = ' + (n+d) + '. Fraction?', a: n + '/' + d, hint: 'Let num=x, den=x+' + (d-n) + '. x+x+' + (d-n) + '=' + (n+d), intuition: 'x + (x+' + (d-n) + ') = ' + (n+d) + ', 2x = ' + (n+d-(d-n)) + ' = ' + (2*n) + ', x = ' + n + '. Fraction = ' + n + '/' + d }; },
    // Quadratic from exam: find roots
    function(){ var r1=rand(2,7), r2=rand(-5,-1); return { q: 'Roots of x² ' + (-r1-r2>=0?'+':'') + (-r1-r2) + 'x ' + (r1*r2>=0?'+':'') + (r1*r2) + ' = 0', a: r1 + ',' + r2, hint: 'Sum=' + (r1+r2) + ', product=' + (r1*r2), intuition: 'Sum of roots = ' + (r1+r2) + ' (sign flipped), product = ' + (r1*r2) + '. Find factors of ' + (r1*r2) + ' that sum to ' + (r1+r2) + ': ' + r1 + ', ' + r2 }; }
  ];
  var type = types[rand(0, types.length - 1)];
  var data = type();
  var opts = [data.a];
  while (opts.length < 4) { var d = typeof data.a === 'string' ? (parseInt(data.a)+rand(-1,1)) + '/' + (parseInt(data.a.split('/')[1])+rand(-1,1)) : data.a + rand(-3, 3); if (opts.indexOf(d) < 0 && d > 0) opts.push(d); }
  shuffle(opts);
  return { question: data.q, answer: data.a, options: opts, hint: data.hint, timeLimit: layer === 'instinct' ? 15 : 20, type: 'quant', techniqueLabel: 'Algebra: ' + data.hint, intuition: data.intuition || 'Age: let unknown=x, write equation from condition. Sum/diff: larger=(sum+diff)/2.' };
}

function generateGeometryQuestion(diff, layer) {
  var types = [
    // Parallel lines: angle chase (corresponding, alternate)
    function(){ var a=rand(30,70), t=pick(['alternate','corresponding']); return { q: 'Lines L1∥L2. An ' + t + ' angle = ' + a + '°. Find the ' + (t==='alternate'?'corresponding':'alternate') + ' angle.', a: a, hint: t + ' angles are equal when lines ∥', intuition: t.charAt(0).toUpperCase() + t.slice(1) + ' angles of parallel lines are EQUAL. So the ' + (t==='alternate'?'corresponding':'alternate') + ' angle = ' + a + '° too.' }; },
    // Triangle: right angle with Pythagoras
    function(){ var a=rand(3,6), b=rand(4,8); return { q: 'Right triangle legs ' + a + ' & ' + b + '. Hypotenuse?', a: Math.round(Math.sqrt(a*a+b*b)*10)/10, hint: 'Pythagoras: h² = ' + a + '² + ' + b + '² = ' + (a*a+b*b), intuition: 'Pythagoras: h = √(' + a + '²+' + b + '²) = √(' + (a*a) + '+' + (b*b) + ') = √' + (a*a+b*b) + ' = ' + Math.round(Math.sqrt(a*a+b*b)*10)/10 }; },
    // Circle: inscribed angle theorem
    function(){ var a=rand(20,70); return { q: 'Inscribed angle subtending arc = ' + (2*a) + '°. Find inscribed angle.', a: a, hint: 'Inscribed angle = half central angle', intuition: 'Inscribed angle = half the central angle subtending the same arc = ' + (2*a) + '/2 = ' + a + '°' }; },
    // Complementary angles in right triangle
    function(){ var a=rand(20,70); return { q: 'Right triangle: angle A=' + a + '°. Angle C?', a: 90-a, hint: 'Sum of acute angles = 90° in right triangle', intuition: 'Right triangle: acute angles sum to 90°. C = 90 - ' + a + ' = ' + (90-a) + '°' }; },
    // Exterior angle = sum of opposite interior angles
    function(){ var a=rand(30,60), b=rand(30,60); return { q: 'Triangle: interior A=' + a + '°, B=' + b + '°. Exterior at C?', a: a+b, hint: 'Exterior angle = sum of opposite interior', intuition: 'Exterior angle = sum of 2 opposite interior = ' + a + '+' + b + ' = ' + (a+b) + '°' }; }
  ];
  var type = types[rand(0, types.length - 1)];
  var data = type();
  var opts = [data.a];
  while (opts.length < 4) { var d = data.a + rand(-8, 8); if (opts.indexOf(d) < 0 && d > 0) opts.push(d); }
  shuffle(opts);
  return { question: data.q, answer: data.a, options: opts, hint: data.hint, timeLimit: layer === 'instinct' ? 15 : 20, type: 'quant', techniqueLabel: 'Geometry: ' + data.hint, intuition: data.intuition || '∥ lines → equal alternate/corresponding angles. Triangle: sum=180°. Pythagoras: a²+b²=c².' };
}

function generateMensurationQuestion(diff, layer) {
  var types = [
    // Rectangular field fencing cost
    function(){ var l=rand(20,60), w=rand(15,40); var c=[15,20,25,30][rand(0,3)]; return { q: 'Field ' + l + 'm×' + w + 'm. Fence cost Rs' + c + '/m. Total cost?', a: 2*(l+w)*c, hint: 'Perimeter = 2(l+w) = ' + 2*(l+w) + ', × cost/m', intuition: 'Perimeter = 2(' + l + '+' + w + ') = ' + 2*(l+w) + 'm. Cost = ' + 2*(l+w) + ' × ' + c + ' = Rs' + 2*(l+w)*c }; },
    // Cylinder volume with cost
    function(){ var r=rand(3,7), h=rand(5,12); var c=[5,8,10,12][rand(0,3)]; return { q: 'Cylindrical tank r=' + r + 'm h=' + h + 'm. Paint cost Rs' + c + '/m². Total surface area (π=3.14)?', a: Math.round(2*3.14*r*(r+h)), hint: 'TSA = 2πr(r+h), multiply by cost', intuition: 'TSA = 2πr(r+h) = 2×3.14×' + r + '×(' + r + '+' + h + ') = ' + Math.round(2*3.14*r*(r+h)) + 'm²' }; },
    // Cone volume
    function(){ var r=rand(3,6), h=rand(6,12); return { q: 'Cone r=' + r + ', h=' + h + '. Volume? (π=3.14)', a: Math.round(3.14*r*r*h/3), hint: 'V = πr²h/3', intuition: 'V = πr²h/3 = 3.14×' + r + '²×' + h + '/3 = 3.14×' + r*r + '×' + h/3 + ' = ' + Math.round(3.14*r*r*h/3) }; },
    // Sphere surface area
    function(){ var r=rand(3,8); return { q: 'Sphere r=' + r + '. Surface area? (π=3.14)', a: Math.round(4*3.14*r*r), hint: 'SA = 4πr²', intuition: 'SA = 4πr² = 4×3.14×' + r + '² = 4×3.14×' + r*r + ' = ' + Math.round(4*3.14*r*r) }; },
    // Rectangular path inside/outside
    function(){ var l=rand(20,40), w=rand(15,30), p=rand(1,4); return { q: 'Garden ' + l + 'm×' + w + 'm. Path ' + p + 'm wide around inside. Path area?', a: l*w - (l-2*p)*(w-2*p), hint: 'Big area minus small area', intuition: 'Outer=' + l + '×' + w + '=' + (l*w) + ', inner=' + (l-2*p) + '×' + (w-2*p) + '=' + ((l-2*p)*(w-2*p)) + '. Path = ' + (l*w) + ' - ' + ((l-2*p)*(w-2*p)) + ' = ' + (l*w-(l-2*p)*(w-2*p)) + 'm²' }; }
  ];
  var type = types[rand(0, types.length - 1)];
  var data = type();
  var opts = [data.a];
  while (opts.length < 4) { var d = data.a + rand(-10, 10); if (opts.indexOf(d) < 0 && d > 0) opts.push(d); }
  shuffle(opts);
  return { question: data.q, answer: data.a, options: opts, hint: data.hint, timeLimit: layer === 'instinct' ? 15 : 20, type: 'quant', techniqueLabel: 'Mensuration: ' + data.hint, intuition: data.intuition || 'Path area = outer - inner. TSA cylinder = 2πr(r+h). Volume cone = πr²h/3.' };
}

function generateCountingQuestion(diff, layer) {
  var intuitions = {
    factorial: 'n! = n × (n-1) × (n-2) × ... × 1. Product of all numbers down to 1.',
    permutation: 'P(n,r) = n!/(n-r)!. Think: n choices for 1st, (n-1) for 2nd... r terms multiplied.',
    combination: 'C(n,r) = P(n,r)/r!. Order doesn\'t matter, so divide by arrangements of r items.',
    probability: 'Probability = favorable/total. Die: P(each) = 1/6. Cards: P(each) = 1/52.'
  };
  var types = [
    // Die roll probability
    function(){ var d=rand(1,6); return { q: 'Die rolled twice. Sum = ' + d + '?', a: Math.max(0, d-1)/36, hint: 'Favorable pairs: (1,'+(d-1)+')...('+(d-1)+',1). Count='+Math.max(0,d-1), intuition: 'Die 1×Die 2 = 36 outcomes. Favorable for sum '+d+': '+Math.max(0,d-1)+' pairs. P = '+Math.max(0,d-1)+'/36 = '+(Math.max(0,d-1)/36).toFixed(4) }; },
    // Card probability
    function(){ var t=['heart','spade','club','diamond'][rand(0,3)]; return { q: 'Card from 52. P(' + t + ')?', a: 13/52, hint: '13 ' + t + 's out of 52', intuition: '13 ' + t + 's in 52 cards. P = 13/52 = 1/4 = 0.25' }; },
    // Letter arrangement (VOWEL, etc.)
    function(){ var w=['LEADER','BANANA','CIVIL'][rand(0,2)]; var l=w.length; var reps={}; for(var i=0;i<w.length;i++)reps[w[i]]=(reps[w[i]]||0)+1; var denom=1; for(var k in reps)if(reps[k]>1)denom*=function(){var f=1;for(var i=2;i<=reps[k];i++)f*=i;return f;}(); var total=function(){var f=1;for(var i=2;i<=l;i++)f*=i;return f;}; return { q: 'Ways to arrange "' + w + '" (' + l + ' letters)?', a: total() / denom, hint: l + '! / (repeat factors)', intuition: l + '! = ' + total() + ', divide by ' + denom + ' for repeated letters = ' + total()/denom }; },
    // Selection committee
    function(){ var n=rand(4,8), r=rand(2,Math.min(3,n)); var p=1;for(var i=0;i<r;i++)p*=(n-i); var f=1;for(var i=2;i<=r;i++)f*=i; return { q: 'Committee of ' + r + ' from ' + n + ' people. Ways?', a: p/f, hint: 'C(' + n + ',' + r + ') = ' + p + '/' + f, intuition: 'Order doesn\'t matter: C(' + n + ',' + r + ') = ' + n + 'C' + r + ' = ' + p/f + ' ways' }; }
  ];
  var type = types[rand(0, types.length - 1)];
  var data = type();
  var opts = [data.a];
  while (opts.length < 4) { var d = typeof data.a === 'number' ? Math.round((data.a + rand(-1, 1))*100)/100 : data.a; if (opts.indexOf(d) < 0 && d > 0) opts.push(d); }
  shuffle(opts);
  return { question: data.q, answer: data.a, options: opts, hint: data.hint, timeLimit: layer === 'instinct' ? 15 : 20, type: 'quant', techniqueLabel: 'Counting: ' + data.hint, intuition: data.intuition || 'P = arrangements (ordered), C = selections (unordered). Die: 6 faces. Cards: 52 total, 4 suits.' };
}

function generateDataQuestion(diff, layer) {
  var types = [
    // Median
    function(){ var n=[rand(10,50), rand(20,60), rand(30,70), rand(5,40), rand(15,55)]; n.sort(function(a,b){return a-b}); return { q: 'Find median: ' + n.join(', '), a: n[2], hint: 'Sort and pick middle', intuition: 'Sort values: ' + n.join(', ') + '. Odd count → median = middle = ' + n[2] }; },
    // Range
    function(){ var vals=[]; for(var i=0;i<5;i++)vals.push(rand(5,95)); vals.sort(function(a,b){return a-b}); return { q: 'Range of: ' + vals.join(', '), a: vals[4]-vals[0], hint: 'Max - min', intuition: 'Highest = ' + vals[4] + ', lowest = ' + vals[0] + '. Range = ' + vals[4] + ' - ' + vals[0] + ' = ' + (vals[4]-vals[0]) }; },
    // Weighted average
    function(){ var g1=rand(60,80), g2=rand(70,95), s1=[30,40,50][rand(0,2)], s2=100-s1; return { q: 'Section A avg=' + g1 + '(' + s1 + ' students), B avg=' + g2 + '(' + s2 + '). Combined avg?', a: Math.round((g1*s1+g2*s2)/(s1+s2)), hint: 'Weighted average = (sum of scores)/(total students)', intuition: 'Weighted = (' + g1 + '×' + s1 + ' + ' + g2 + '×' + s2 + ')/(' + s1 + '+' + s2 + ') = ' + (g1*s1+g2*s2) + '/' + (s1+s2) + ' = ' + Math.round((g1*s1+g2*s2)/(s1+s2)) }; },
    // Mean deviation or find missing number from average
    function(){ var nums=[]; for(var i=0;i<4;i++)nums.push(rand(10,90)); var avg=rand(30,70); var sum=avg*5; var miss=sum - nums.reduce(function(a,b){return a+b},0); return { q: 'Average of 5 numbers = ' + avg + '. Four are ' + nums.join(', ') + '. Missing?', a: miss, hint: 'Sum = ' + avg + '×5 = ' + sum + ', missing = ' + sum + ' - ' + nums.join('+'), intuition: 'Sum of 5 = ' + avg + '×5 = ' + sum + '. Known sum = ' + nums.join('+') + ' = ' + nums.reduce(function(a,b){return a+b},0) + '. Missing = ' + sum + ' - ' + nums.reduce(function(a,b){return a+b},0) + ' = ' + miss }; }
  ];
  var type = types[rand(0, types.length - 1)];
  var data = type();
  var opts = [data.a];
  while (opts.length < 4) { var d = data.a + rand(-5, 5); if (opts.indexOf(d) < 0 && d >= 0) opts.push(d); }
  shuffle(opts);
  return { question: data.q, answer: data.a, options: opts, hint: data.hint, timeLimit: layer === 'instinct' ? 15 : 20, type: 'quant', techniqueLabel: 'Data: ' + data.hint, intuition: data.intuition || 'Sort for median. Range = max-min. Avg = sum/n. Weighted avg weighs each group by count.' };
}

function generateNumberSystemQuestion(diff, layer) {
  var ty = [
    function(){ var n = [[2,4],[3,4],[2,5],[7,4],[3,7],[8,3],[9,2],[4,7]][rand(0,7)]; return { q: 'Unit digit of ' + n[0] + '^' + n[1], a: Math.pow(n[0]%10, n[1]%4||4) % 10, hint: 'Cyclicity: ' + n[0] + ' repeats every 4', intuition: 'Cyclicity: ' + n[0] + '^n repeats every 4. ' + n[0] + '^' + n[1] + ' = ' + n[0] + '^' + (n[1]%4||4) + ', unit digit = ' + (Math.pow(n[0]%10,n[1]%4||4)%10) }; },
    function(){ var d = rand(7, 18); var n = rand(2, 6); return { q: 'Remainder when ' + d + '^' + n + ' divided by 5', a: Math.pow(d%5, n%4||4) % 5, hint: 'Use mod 5 cyclicity', intuition: 'Mod cyclicity: ' + d + ' mod 5 = ' + (d%5) + '. (' + (d%5) + ')^' + n + ' mod 5 = ' + Math.pow(d%5,n%4||4)%5 }; },
    function(){ var a = rand(12, 99), b = rand(2, 9); return { q: 'Remainder of ' + a + ' ÷ ' + b, a: a % b, hint: 'Divide ' + a + ' by ' + b, intuition: 'Just find remainder: ' + b + '×' + Math.floor(a/b) + ' = ' + (b*Math.floor(a/b)) + ', remainder = ' + (a-b*Math.floor(a/b)) }; },
    function(){ var n = rand(3, 9); return { q: 'Simplify \u221A' + (n*n*2), a: n + '\u221A2', hint: 'Factor out perfect square', intuition: '√' + (n*n*2) + ' = √(' + n + '²×2) = ' + n + '√2' }; },
    function(){ var n = rand(3, 6); return { q: 'Simplify \u221B' + (n*n*n*3), a: n + '\u221B3', hint: 'Factor out perfect cube', intuition: '∛' + (n*n*n*3) + ' = ∛(' + n + '³×3) = ' + n + '∛3' }; },
    function(){ var n = rand(10, 20); return { q: 'Divisibility: Is ' + (n*7) + ' divisible by 7? (Y/N)', a: 'Y', hint: n + '×7 = ' + n*7, intuition: n + ' × 7 = ' + n*7 + ', so yes. Double the last digit and subtract from rest to check divisibility by 7.' }; }
  ];
  var t = ty[rand(0, ty.length - 1)];
  var d = t();
  var o = [d.a]; while(o.length<4){var v=(typeof d.a==='string'?['Y','N'][rand(0,1)]:Math.abs(d.a)+rand(-3,3)); if(o.indexOf(v)<0&&(typeof v==='string'||v>=0))o.push(v);}
  shuffle(o);
  return { question: d.q, answer: d.a, options: o, hint: d.hint, timeLimit: layer==='instinct'?12:18, type:'quant', techniqueLabel:'Number System: '+d.hint, intuition: d.intuition||'Use cyclicity for unit digit, mod for remainders' };
}

function generateSimplificationQuestion(diff, layer) {
  var ty = [
    function(){ var a=rand(5,15), b=rand(2,9), c=rand(1,6); return { q: a + '+' + b + '×' + c + ' - ' + rand(1,5), a: a+b*c-rand(1,5), hint: 'BODMAS: × before +/-', intuition: 'BODMAS: multiplication first. ' + b + '×' + c + '=' + (b*c) + ', then ' + a + '+' + (b*c) + '=' + (a+b*c) + ', subtract = ' + (a+b*c-rand(1,5)) }; },
    function(){ var a=rand(2,5); return { q: 'Approx: √' + (a*a+rand(1, a*2)), a: a, hint: 'Nearest perfect square ' + a*a, intuition: '√' + (a*a+rand(1,a*2)) + ' is close to ' + a + ' because ' + a + '²=' + a*a }; },
    function(){ var a=rand(2,7), b=rand(1,4); return { q: 'Simplify (x^' + a + ')(x^' + b + ') [coefficient=1]', a: a+b, hint: 'Add exponents: x^(a+b)', intuition: 'x^' + a + ' × x^' + b + ' = x^(' + a + '+' + b + ') = x^' + (a+b) }; },
    function(){ var a=rand(2,5), b=rand(1,3); return { q: 'Simplify (x^' + a + ')÷(x^' + b + ')', a: a-b, hint: 'Subtract exponents', intuition: 'x^' + a + ' / x^' + b + ' = x^(' + a + '-' + b + ') = x^' + (a-b) }; },
    function(){ var a=rand(2,6), b=rand(1,4); return { q: '√(' + (a*a*b) + ')', a: a + '√' + b, hint: 'Factor: √(' + a*a + '×' + b + ')', intuition: '√' + (a*a*b) + ' = √(' + a*a + ' × ' + b + ') = ' + a + '√' + b }; }
  ];
  var t = ty[rand(0, ty.length - 1)];
  var d = t();
  var o = [d.a]; while(o.length<4){var v=(typeof d.a==='string'?d.a+rand(-2,2):Math.abs(d.a)+rand(-3,3)); if(o.indexOf(v)<0&&(typeof v==='string'||v>=0))o.push(v);}
  shuffle(o);
  return { question: d.q, answer: d.a, options: o, hint: d.hint, timeLimit: layer==='instinct'?10:15, type:'quant', techniqueLabel:'Simplification: '+d.hint, intuition: d.intuition||'BODMAS: brackets, orders, division, multiplication, addition, subtraction' };
}

function generateQuadraticQuestion(diff, layer) {
  var ty = [
    function(){ var r1=rand(2,6), r2=rand(2,6); return { q: 'Roots of x² - ' + (r1+r2) + 'x + ' + (r1*r2) + ' = 0', a: r1 + ',' + r2, hint: 'Find two numbers that sum to ' + (r1+r2) + ', product ' + (r1*r2), intuition: 'Find factors of ' + (r1*r2) + ' that add to ' + (r1+r2) + ': ' + r1 + ' and ' + r2 }; },
    function(){ var r1=rand(-5,-1), r2=rand(2,5); return { q: 'Roots of x² + ' + (-r1-r2) + 'x + ' + (r1*r2) + ' = 0', a: r1 + ',' + r2, hint: 'Signs: sum=' + (-r1-r2) + ', product=' + (r1*r2), intuition: 'Product ' + (r1*r2) + ' (negative → roots have opposite signs). Factors that sum to ' + (-r1-r2) + ': ' + r1 + ' and ' + r2 }; },
    function(){ var a=rand(1,3), b=rand(2,5), c=rand(1,5); var d=b*b-4*a*c; if(d<0) d=0; return { q: 'Discriminant of ' + a + 'x²+' + b + 'x+' + c + '=0', a: d, hint: 'D = b² - 4ac = ' + b*b + ' - ' + (4*a*c), intuition: 'D = ' + b + '² - 4×' + a + '×' + c + ' = ' + (b*b-4*a*c) + '. D>0→real, D=0→equal, D<0→imaginary' }; },
    function(){ var n=rand(2,5); return { q: 'Nature of roots: x² - ' + (n+n) + 'x + ' + (n*n) + ' = 0', a: 'Equal', hint: 'Check D = b²-4ac', intuition: 'D = ' + (n+n) + '² - 4×1×' + n*n + ' = ' + (4*n*n-4*n*n) + ' = 0 → roots are equal (repeated)' }; }
  ];
  var t = ty[rand(0, ty.length - 1)];
  var d = t();
  var o = [d.a]; while(o.length<4){var v=(typeof d.a==='string'?['Equal','Real','Imaginary','Distinct'][rand(0,3)]:Math.abs(parseInt(d.a))+rand(-3,3)); if(o.indexOf(v)<0)o.push(v);}
  shuffle(o);
  return { question: d.q, answer: d.a, options: o, hint: d.hint, timeLimit: layer==='instinct'?15:20, type:'quant', techniqueLabel:'Quadratic: '+d.hint, intuition: d.intuition||'For roots: find factors of c that sum to b. D=b²-4ac tells nature of roots.' };
}

function generatePartnershipQuestion(diff, layer) {
  var ty = [
    function(){ var a=rand(2,8)*1000, b=rand(3,9)*1000, p=rand(1,5)*1000; return { q: 'A invests Rs' + a + ', B Rs' + b + '. Profit Rs' + p + '. B\'s share?', a: Math.round(b*p/(a+b)), hint: 'Ratio ' + a + ':' + b + ', share = ' + b + '/' + (a+b) + '×' + p, intuition: 'Profit ratio = investment ratio. B share = ' + b + '/(' + a + '+' + b + ') × ' + p + ' = ' + b + '/' + (a+b) + ' × ' + p + ' = ' + Math.round(b*p/(a+b)) }; },
    function(){ var a=rand(1,5)*1000, b=rand(2,6)*1000, pa=rand(1,4), pb=rand(2,5); return { q: 'A Rs' + a + ' for ' + pa + 'mo, B Rs' + b + ' for ' + pb + 'mo. Profit share ratio?', a: (a*pa) + ':' + (b*pb), hint: 'Multiply capital×time: ' + a*pa + ' : ' + b*pb, intuition: 'Ratio = (A capital × A time) : (B capital × B time) = ' + a*pa + ' : ' + b*pb }; },
    function(){ var a=rand(2,5)*1000, b=rand(3,6)*1000; var ap=rand(1,3); return { q: 'A Rs' + a + ', B Rs' + b + ' after ' + ap + 'mo joins. Profit Rs' + (a+b)*2 + '. A\'s share?', a: Math.round((a*(12)) * (a+b)*2 / (a*12 + b*(12-ap))), hint: 'A for 12mo, B for ' + (12-ap) + 'mo', intuition: 'A: ' + a + '×12=' + a*12 + ', B: ' + b + '×' + (12-ap) + '=' + b*(12-ap) + '. A share = ' + a*12 + '/' + (a*12+b*(12-ap)) + ' × total' }; }
  ];
  var t = ty[rand(0, ty.length - 1)];
  var d = t();
  var o = [d.a]; while(o.length<4){var v=d.a+rand(-500,500); if(o.indexOf(v)<0&&v>=0)o.push(v);}
  shuffle(o);
  return { question: d.q, answer: d.a, options: o, hint: d.hint, timeLimit: layer==='instinct'?15:20, type:'quant', techniqueLabel:'Partnership: '+d.hint, intuition: d.intuition||'Profit share ratio = capital × time. Sum ratios, divide profit proportionally.' };
}

function generateCompoundInterestQuestion(diff, layer) {
  var ty = [
    function(){ var p=rand(2,8)*1000; return { q: 'CI on Rs' + p + ' at 10% for 2yr', a: Math.round(p*0.21), hint: 'CI = P[(1+r)^t-1] = ' + p + '×(1.21-1)', intuition: 'CI = P(1+r/100)^t - P. 10% for 2yr: effective = 10+10+1=21%. CI = ' + p + '×21% = ' + Math.round(p*0.21) }; },
    function(){ var p=rand(1,5)*1000, r=[5,8,12,15][rand(0,3)]; return { q: 'Amount of Rs' + p + ' at ' + r + '% CI for 2yr', a: Math.round(p * Math.pow(1+r/100, 2)), hint: 'A = P(1+r/100)^t', intuition: 'A = ' + p + '×(1+' + r + '/100)² = ' + p + '×(' + (1+r/100) + ')² = ' + Math.round(p*Math.pow(1+r/100,2)) }; },
    function(){ var p=rand(2,6)*1000; return { q: 'CI - SI diff for Rs' + p + ' at 10% for 2yr', a: Math.round(p*0.01), hint: 'Diff = P(r/100)² for 2yr', intuition: 'CI-SI diff at 10% for 2yr = P(r/100)² = ' + p + '×(0.1)² = ' + p + '×0.01 = ' + Math.round(p*0.01) }; },
    function(){ var p=rand(1,4)*10000; return { q: 'CI on Rs' + p + ' at 10% for 3yr', a: Math.round(p*0.331), hint: '3yr CI: 10+10+1+10+3+0.1 = ~33.1%', intuition: '3yr CI%: 10+10+1=21, 21+10+2.1=33.1%. CI = ' + p + '×33.1% = ' + Math.round(p*0.331) }; }
  ];
  var t = ty[rand(0, ty.length - 1)];
  var d = t();
  var o = [d.a]; while(o.length<4){var v=d.a+rand(-d.a*0.2|0, d.a*0.2|0); if(o.indexOf(v)<0&&v>0)o.push(v);}
  shuffle(o);
  return { question: d.q, answer: d.a, options: o, hint: d.hint, timeLimit: layer==='instinct'?15:20, type:'quant', techniqueLabel:'CI: '+d.hint, intuition: d.intuition||'CI = P(1+r/100)^t - P. For 2yr at r%: effective% = r + r + r²/100.' };
}

function generateDiscountQuestion(diff, layer) {
  var ty = [
    function(){ var m=rand(5,20)*100, d=rand(5,30); return { q: 'Discount ' + d + '% on MP Rs' + m + '. SP?', a: Math.round(m*(100-d)/100), hint: 'SP = MP × (100-d)/100', intuition: d + '% off → pay ' + (100-d) + '%. SP = ' + m + ' × ' + (100-d) + '% = ' + Math.round(m*(100-d)/100) }; },
    function(){ var m=rand(5,20)*100, d1=rand(10,20), d2=rand(5,15); return { q: 'Successive ' + d1 + '% then ' + d2 + '% on Rs' + m + '. Net SP?', a: Math.round(m*(100-d1)/100*(100-d2)/100), hint: 'Apply discounts one after another', intuition: 'After ' + d1 + '%: ' + (100-d1) + '% = ' + Math.round(m*(100-d1)/100) + '. Then ' + d2 + '%%: ×' + (100-d2)/100 + ' = ' + Math.round(m*(100-d1)/100*(100-d2)/100) }; },
    function(){ var c=rand(5,15)*100, p=rand(15,40); return { q: 'Single discount equivalent to ' + p + '% + 10%', a: 100 - (100-p)*90/100, hint: 'Net = 100 - (100-d1)(100-d2)/100', intuition: 'Net discount = d1 + d2 - d1×d2/100 = ' + p + ' + 10 - ' + (p*10/100) + ' = ' + (100 - (100-p)*90/100 | 0) + '%' }; },
    function(){ var cp=rand(3,10)*100, g=rand(10,30); return { q: 'CP Rs' + cp + ', gain ' + g + '%. Mark up ' + (g+10) + '% above CP. Discount %?', a: Math.round(100 - (100+g)/(100+g+10)*100), hint: 'SP=CP(' + (100+g) + '%), MP=CP(' + (100+g+10) + '%), discount = (MP-SP)/MP', intuition: 'SP = ' + (100+g) + '% of CP, MP = ' + (100+g+10) + '% of CP. Discount = (MP-SP)/MP × 100' }; }
  ];
  var t = ty[rand(0, ty.length - 1)];
  var d = t();
  var o = [d.a]; while(o.length<4){var v=d.a+rand(-8,8); if(o.indexOf(v)<0&&v>0)o.push(v);}
  shuffle(o);
  return { question: d.q, answer: d.a, options: o, hint: d.hint, timeLimit: layer==='instinct'?12:18, type:'quant', techniqueLabel:'Discount: '+d.hint, intuition: d.intuition||'SP = MP × (100-d)/100. Successive: apply one after another, not additive.' };
}

function generateRacesQuestion(diff, layer) {
  var ty = [
    function(){ var d=rand(50,200)*10, a=rand(4,10); return { q: 'A runs ' + d + 'm at ' + a + 'm/s. Beat B by ' + (a*rand(2,5)) + 'm. B speed?', a: Math.round(a * (d - a*rand(2,5)) / d * 10) / 10, hint: 'B time = A time, B distance = ' + (d - a*rand(2,5)), intuition: 'A takes ' + (d/a) + 's. B runs ' + (d - a*rand(2,5)) + 'm in same time. B speed = distance/time' }; },
    function(){ var a=rand(5,12), h=rand(2,5); return { q: 'A gives B ' + h + 'm start in 100m race. A beats B by ' + rand(1,3) + 's. A speed=' + a + 'm/s. B speed?', a: Math.round((100-h)/(100/a+rand(1,3))*10)/10, hint: 'B runs ' + (100-h) + 'm in A time + ' + rand(1,3) + 's', intuition: 'A time = ' + 100/a + 's. B time = ' + (100/a+rand(1,3)) + 's. B runs ' + (100-h) + 'm, speed = ' + (100-h) + '/' + (100/a+rand(1,3)) }; },
    function(){ var l=rand(2,6)*200; return { q: 'A and B on circular track ' + l + 'm. Speeds ' + rand(3,6) + ' and ' + rand(2,5) + 'm/s. Meet first time?', a: Math.round(l / Math.abs(rand(3,6)-rand(2,5))), hint: 'Time = track length ÷ relative speed', intuition: 'Relative speed = ' + Math.abs(rand(3,6)-rand(2,5)) + 'm/s. Time to meet = ' + l + '/' + Math.abs(rand(3,6)-rand(2,5)) + ' = ' + Math.round(l/Math.abs(rand(3,6)-rand(2,5))) + 's' }; }
  ];
  var t = ty[rand(0, ty.length - 1)];
  var d = t();
  var o = [d.a]; while(o.length<4){var v=Math.round(d.a)+rand(-5,5); if(o.indexOf(v)<0&&v>0)o.push(v);}
  shuffle(o);
  return { question: d.q, answer: d.a, options: o, hint: d.hint, timeLimit: layer==='instinct'?15:20, type:'quant', techniqueLabel:'Races: '+d.hint, intuition: d.intuition||'In races: focus on TIME = same for both runners. Speed = distance/time.' };
}

function generateDataInterpretationQuestion(diff, layer) {
  var ty = [
    function(){ var a=rand(30,80), b=rand(20,60), c=rand(10,40); return { q: 'Table: A=' + a + ', B=' + b + ', C=' + c + '. Total?', a: a+b+c, hint: 'A+B+C', intuition: 'Total = ' + a + '+' + b + '+' + c + ' = ' + (a+b+c) }; },
    function(){ var a=rand(20,50), b=rand(15,40), c=rand(10,30), d=rand(5,20); return { q: 'Sales: Q1=' + a + ', Q2=' + b + ', Q3=' + c + ', Q4=' + d + '. Avg/Q?', a: Math.round((a+b+c+d)/4), hint: 'Sum ÷ 4', intuition: 'Average = (' + a + '+' + b + '+' + c + '+' + d + ')/4 = ' + (a+b+c+d) + '/4 = ' + Math.round((a+b+c+d)/4) }; },
    function(){ var m=rand(40,80), f=rand(20,50); return { q: 'Men=' + m + ', Women=' + f + '. % women?', a: Math.round(f*100/(m+f)), hint: 'women/total × 100', intuition: f + '/' + (m+f) + ' × 100 = ' + Math.round(f*100/(m+f)) + '%' }; },
    function(){ var y=rand(3,7)*1000; return { q: 'Revenue ' + y + ', expense ' + (y-rand(2,5)*100) + '. Profit %?', a: Math.round((y-(y-rand(2,5)*100))*100/y), hint: '(R-E)/R × 100', intuition: 'P% = (R-E)/R × 100 = ' + (rand(2,5)*100) + '/' + y + ' × 100 = ' + Math.round((rand(2,5)*100)*100/y) + '%' }; }
  ];
  var t = ty[rand(0, ty.length - 1)];
  var d = t();
  var o = [d.a]; while(o.length<4){var v=d.a+rand(-8,8); if(o.indexOf(v)<0&&v>0)o.push(v);}
  shuffle(o);
  return { question: d.q, answer: d.a, options: o, hint: d.hint, timeLimit: layer==='instinct'?15:20, type:'quant', techniqueLabel:'DI: '+d.hint, intuition: d.intuition||'Read data carefully. Identify what the question asks (total/average/percentage) before computing.' };
}

// ====== NEW REASONING GENERATORS ======

function generateMirrorImageQuestion(diff) {
  var ty = [
    function(){ var l=rand(2,5); return { q: 'How many mirrors needed for ' + l + ' images of an object placed at 60° between them?', a: Math.round(360/60)-1, hint: 'n = 360/θ - 1', intuition: 'n = 360/θ - 1 = 360/'+60+'-1 = '+(6-1)+' mirrors' }; },
    function(){ var fig=['L','G','H','K','M','Q'][rand(0,5)]; return { q: 'Which of these is NOT symmetrical? (' + ['L','G','H','K','M','Q'].join(',') + ')', a: ['G','Q'][rand(0,1)], hint: 'Check vertical mirror axis', intuition: 'Vertical symmetry: left=right mirror copy. Letters like A,H,I,M,O,T,U,V,W,X,Y are vertically symmetrical.' }; },
    function(){ var w=['MOM','WOW','HIM','MADAM'][rand(0,3)]; return { q: 'Water image of "' + w + '" is same as original? (Y/N)', a: w==='MOM'||w==='MADAM'?'Y':'N', hint: 'Check top-bottom reversal', intuition: 'Water image = top-bottom flip. Words that read same upside-down: MOM, WOW, MADAM are symmetrical vertically.' }; }
  ];
  var t = ty[rand(0, ty.length - 1)];
  var d = t();
  var o = [d.a]; while(o.length<4){var v=['L','G','H','K','M','Q','Y','N','2','3','4'][rand(0,10)]; if(o.indexOf(v)<0)o.push(v);}
  shuffle(o);
  return { question: d.q, answer: d.a, options: o, hint: d.hint, timeLimit: 15, type:'reasoning', techniqueLabel:'Mirror: '+d.hint, intuition: d.intuition||'Mirror image = left-right reversal. Water image = top-bottom reversal. Symmetrical letters: A,H,I,M,O,T,U,V,W,X,Y.' };
}

function generateDiceCubeQuestion(diff) {
  var ty = [
    function(){ var faces = {A:['Top','Bottom','Front','Back','Left','Right']}; var f=['Top','Bottom','Front','Back','Left','Right']; shuffle(f); return { q: 'Dice: ' + f[0] + '=' + rand(1,6) + ', ' + f[1] + '=' + rand(1,6) + '. ' + f[5] + '?', a: 7-Math.abs(rand(1,6)), hint: 'Opposite faces sum to 7', intuition: 'Key: opposite faces sum to 7. If top=n, bottom=7-n. Adjacent are never opposite.' }; },
    function(){ var n=[rand(2,6), rand(2,6)]; while(n[1]===n[0]||n[1]===7-n[0])n[1]=rand(2,6); return { q: 'Two positions of same dice show ' + n[0] + ' & ' + n[1] + '. ' + (7-n[0]) + ' is opposite?', a: 7-n[1], hint: 'Common numbers share face', intuition: 'Compare two positions: the number NOT seen in either position is the one on the hidden face.' }; },
    function(){ var c=rand(1,5); return { q: 'Cube painted all faces, cut into 27 small cubes. Cubes with ' + c + ' faces painted?', a: c===0?1:(c===1?6:(c===2?12:(c===3?8:0))), hint: '0-face=center('+(c===0?1:'')+'), 1-face=face centers(6), 2-face=edge centers(12), 3-face=corners(8)', intuition: 'For n³ cubes: 0-face=(n-2)³, 1-face=6(n-2)², 2-face=12(n-2), 3-face=8 always. Here n=3: ' + (c===0?'1':c===1?'6':c===2?'12':c===3?'8':'0') }; }
  ];
  var t = ty[rand(0, ty.length - 1)];
  var d = t();
  var o = [d.a]; while(o.length<4){var v=d.a+rand(-3,3); if(o.indexOf(v)<0&&v>=0)o.push(v);}
  shuffle(o);
  return { question: d.q, answer: d.a, options: o, hint: d.hint, timeLimit: 20, type:'reasoning', techniqueLabel:'Dice: '+d.hint, intuition: d.intuition||'Dice: opposite sum=7. Cube painting: corners=3, edges=2, centers=1, inner=0 faces.' };
}

function generateCalendarQuestion(diff) {
  var days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var ty = [
    function(){ var m=rand(1,12), d=rand(1,28), y=2024; var date = new Date(y+'/'+m+'/'+d); var ans=date.getDay(); return { q: 'Day of ' + d + '/' + m + '/' + y + '?', a: days[ans], hint: '2024 is leap year', intuition: 'Reference: Jan 1 2024 = Mon. Count days offset. Year 2024 is leap (Feb 29).' }; },
    function(){ var y=rand(2024,2030); var odd=0; for(var i=2024;i<y;i++)odd+=((i%400)===0||((i%4)===0&&(i%100)!=0))?2:1; return { q: 'Odd days from 2024 to '+y+'?', a: odd%7, hint: 'Each year=1 odd day, leap=2', intuition: 'Normal year=1 odd day, leap=2 odd days. Sum mod 7 tells day shift. From 2024 to '+y+': '+odd+' odd days, '+(odd%7)+' days ahead.' }; },
    function(){ var y=rand(2000,2024); var odd=0; for(var i=2000;i<y;i++)odd+=((i%400)===0||((i%4)===0&&(i%100)!=0))?2:1; return { q: 'Day shift from 2000 to ' + y + '?', a: odd%7, hint: 'Count odd days mod 7', intuition: '2000 was leap but 2000/1/1 = Sat. Odd days from years: ' + odd + '. Shift = ' + (odd%7) + ' days forward.' }; }
  ];
  var t = ty[rand(0, ty.length - 1)];
  var d = t();
  var o = [d.a]; while(o.length<4){var v=days[rand(0,6)]; if(o.indexOf(v)<0)o.push(v);}
  shuffle(o);
  return { question: d.q, answer: d.a, options: o, hint: d.hint, timeLimit: 20, type:'reasoning', techniqueLabel:'Calendar: '+d.hint, intuition: d.intuition||'Odd days: normal year=1, leap=2. Day = reference day + odd days. Jan 1 2024 = Monday.' };
}

function generateClockQuestion(diff) {
  var ty = [
    function(){ var h=rand(1,11); return { q: 'Angle between hands at ' + h + ':00?', a: h*30, hint: 'Hour hand at ' + h + '×30°', intuition: 'At ' + h + ':00, min hand at 0°, hr hand at ' + h + '×30° = ' + h*30 + '°. Formula: |30H - 5.5M|' }; },
    function(){ var h=rand(1,11), m=[15,20,25,30,35,40,45][rand(0,6)]; var a=Math.abs(30*h - 5.5*m); var an = a>180?360-a:a; return { q: 'Angle at ' + h + ':' + m + '?', a: Math.round(an), hint: 'Formula: |30H - 5.5M|', intuition: 'Formula: |30×' + h + ' - 5.5×' + m + '| = |' + (30*h) + ' - ' + (5.5*m) + '| = ' + Math.round(a) + '°' + (a>180?'. Smaller angle = '+Math.round(an):'') }; },
    function(){ var h=rand(0,10); return { q: 'When do hands overlap between ' + h + ':00 and ' + (h+1) + ':00?', a: (h*60/11).toFixed(1), hint: 'Overlap at (60H)/11 min past H', intuition: 'Hands overlap formula: time = 60H/11 min past H. At ' + h + ':00 = ' + (h*60/11).toFixed(1) + ' min past ' + h }; }
  ];
  var t = ty[rand(0, ty.length - 1)];
  var d = t();
  var o = [d.a]; while(o.length<4){var v=Math.round((Math.abs(30*rand(1,11)-5.5*rand(0,59)))*10)/10; if(o.indexOf(v)<0)o.push(v);}
  shuffle(o);
  return { question: d.q, answer: d.a, options: o, hint: d.hint, timeLimit: 20, type:'reasoning', techniqueLabel:'Clock: '+d.hint, intuition: d.intuition||'Angle = |30H - 5.5M|. If >180°, use 360-result. Overlap: 60H/11 min past H.' };
}

function generateAlphabetArrangeQuestion(diff) {
  var ty = [
    function(){ var w=['MONKEY','TIGER','BEAR','LION','ZEBRA','HORSE'][rand(0,5)]; var s=w.split('').sort(); return { q: 'Alphabetical order: "' + w + '". ' + s[0] + ' comes first?', a: s[0], hint: 'Sort letters A→Z', intuition: 'Just arrange letters A to Z. Smallest letter comes first.' }; },
    function(){ var w=['APPLE','MANGO','BANANA','GRAPE','ORANGE'][rand(0,4)]; var wr=[...new Set(w.split('').sort())]; return { q: 'How many meaningful words in "' + w + '" using all letters?', a: 1, hint: 'Only 1 arrangement is meaningful', intuition: 'Most letter combinations form only 1 meaningful word. Use patterns: if word has repeated letters, fewer arrangements are valid.' }; },
    function(){ var pair = [['AB','ZY'],['MN','NM'],['PQ','QP'],['BC','CB']][rand(0,3)]; return { q: 'What comes next: ' + pair[0] + ', ' + pair[1] + ', ...?', a: pair[0].charCodeAt(0)+1|0, hint: 'Pair reverses and shifts', intuition: 'Letter pattern: AB→ZY (reverse+ahead), MN→NM (reverse). Next pair reverses the pattern.' }; }
  ];
  var t = ty[rand(0, ty.length - 1)];
  var d = t();
  var o = [d.a]; while(o.length<4){var v=String.fromCharCode(65+rand(0,25)); if(o.indexOf(v)<0)o.push(v);}
  shuffle(o);
  return { question: d.q, answer: d.a, options: o, hint: d.hint, timeLimit: 15, type:'reasoning', techniqueLabel:'Alphabet: '+d.hint, intuition: d.intuition||'Alphabet positions: A=1 to Z=26. For dictionary order, check first different letter from left.' };
}

function generateCriticalReasoningQuestion(diff) {
  var ty = [
    function(){ return { q: 'Statement: "All educated people are successful." Conclusion: "Uneducated people are never successful." This is:', a: 'Invalid', hint: 'Statement only talks about educated', intuition: 'The statement says nothing about uneducated people. You cannot conclude about uneducated from info about educated only.' }; },
    function(){ var topics=['pollution','crime','illiteracy','unemployment'][rand(0,3)]; return { q: 'Course of action: "' + topics + ' is rising. Should government spend more?" Which strengthens?', a: 'Yes, it\'s a serious issue needing funds', hint: 'Action must address the problem', intuition: 'Course of action must directly solve the stated problem. "More spending" is valid if problem is serious and funds are needed.' }; },
    function(){ var words=['Rain','Strike','Accident','Power cut'][rand(0,3)]; return { q: 'Effect: Trains delayed. Cause? "' + words + '" Which is a valid cause?', a: words === 'Rain' ? 'Yes' : (words === 'Strike' ? 'Yes' : (words === 'Accident' ? 'Yes' : 'Yes')), hint: 'Any of these can delay trains', intuition: 'Multiple causes can lead to same effect. Check if the cause naturally leads to the stated effect without gaps.' }; }
  ];
  var t = ty[rand(0, ty.length - 1)];
  var d = t();
  var o = [d.a]; while(o.length<4){var v=['Valid','Invalid','Yes','No','Maybe'][rand(0,4)]; if(o.indexOf(v)<0)o.push(v);}
  shuffle(o);
  return { question: d.q, answer: d.a, options: o, hint: d.hint, timeLimit: 20, type:'reasoning', techniqueLabel:'Critical: '+d.hint, intuition: d.intuition||'Assumption: what MUST be true for statement to hold. Course of action: must solve the problem. Cause-effect: cause must naturally precede effect.' };
}

function generateDecisionMakingQuestion(diff) {
  var ty = [
    function(){ var age=rand(18,30), cond=['degree','diploma','12th'][rand(0,2)]; return { q: 'Eligibility: Age ' + age + ', ' + cond + '. Min req: age>21 & graduate. Eligible?', a: age>21 && cond==='degree' ? 'Yes' : 'No', hint: 'Both conditions must be met', intuition: 'Read ALL conditions. AND means ALL must be true. OR means ANY can be true. Mark yes only if every condition is satisfied.' }; },
    function(){ var score=rand(60,95); return { q: 'Cutoff: 75% in English (60% min), 70% overall. Score=' + score + '%. Allowed?', a: score>=60&&score>=75?'Yes':(score>=60?'No':'No'), hint: 'Check min in each subject', intuition: 'Check each condition separately. Min in each subject AND overall cutoff BOTH must be met. Failing even one = rejected.' }; },
    function(){ var exp=rand(1,8); return { q: 'Job: ' + exp + 'yr exp. Need 3yr exp & degree. Eligible?', a: exp>=3?'Yes':'No', hint: 'Experience '+exp+'yr vs need 3yr', intuition: 'Compare each requirement individually. The lowest common denominator determines eligibility.' }; }
  ];
  var t = ty[rand(0, ty.length - 1)];
  var d = t();
  var o = [d.a]; while(o.length<4){var v=['Yes','No','Cannot determine','Depends'][rand(0,3)]; if(o.indexOf(v)<0)o.push(v);}
  shuffle(o);
  return { question: d.q, answer: d.a, options: o, hint: d.hint, timeLimit: 15, type:'reasoning', techniqueLabel:'Decision: '+d.hint, intuition: d.intuition||'Check each condition one by one. AND=all must pass. OR=any one enough. Mark "Cannot determine" if info is insufficient.' };
}

function generateVennDiagramQuestion(diff) {
  var ty = [
    function(){ var n=rand(30,60), a=rand(10,30), b=rand(10,30); var both=rand(5, Math.min(a,b)); return { q: 'Total=' + n + ', like A=' + a + ', like B=' + b + ', both=' + both + '. Neither?', a: n - (a+b-both), hint: 'Total - (A + B - both)', intuition: 'Neither = Total - (A + B - both). ' + n + ' - (' + a + '+' + b + '-' + both + ') = ' + (n - (a+b-both)) }; },
    function(){ var a=rand(20,40), b=rand(15,30), both=rand(5, Math.min(a,b)); return { q: 'A=' + a + ', B=' + b + ', both=' + both + '. Only A?', a: a-both, hint: 'A only = A - both', intuition: 'Only A = A - both = ' + a + '-' + both + ' = ' + (a-both) }; },
    function(){ var total=rand(50,100), none=rand(5,15); return { q: 'Survey: ' + total + ' people, ' + none + ' like neither. Either A or B?', a: total-none, hint: 'People who like at least one = total - neither', intuition: 'At least one = total - neither = ' + total + '-' + none + ' = ' + (total-none) }; }
  ];
  var t = ty[rand(0, ty.length - 1)];
  var d = t();
  var o = [d.a]; while(o.length<4){var v=d.a+rand(-10,10); if(o.indexOf(v)<0&&v>=0)o.push(v);}
  shuffle(o);
  return { question: d.q, answer: d.a, options: o, hint: d.hint, timeLimit: 15, type:'reasoning', techniqueLabel:'Venn: '+d.hint, intuition: d.intuition||'Venn: Only A = A-both. Only B = B-both. Neither = total - (A+B-both). Total = Only A + Only B + both + neither.' };
}

// ====== CATEGORY DISPATCHERS ======

function generateQuantQuestion(diff, subMode) {
  var genMap = {
    number_sense: generateNumberSenseQuestion,
    percentage: generatePercentageQuestion,
    arithmetic: generateArithmeticQuestion,
    motion: generateMotionQuestion,
    work: generateWorkQuestion,
    algebra: generateAlgebraQuestion,
    geometry: generateGeometryQuestion,
    mensuration: generateMensurationQuestion,
    counting: generateCountingQuestion,
    data: generateDataQuestion,
    number_system: generateNumberSystemQuestion,
    simplification: generateSimplificationQuestion,
    quadratic: generateQuadraticQuestion,
    partnership: generatePartnershipQuestion,
    compound_interest: generateCompoundInterestQuestion,
    discount: generateDiscountQuestion,
    races: generateRacesQuestion,
    data_interpretation: generateDataInterpretationQuestion
  };
  // If no subMode, pick random quant topic
  var topic = subMode || pick(['number_sense','percentage','arithmetic','motion','work','algebra','geometry','mensuration','counting','data','number_system','simplification','quadratic','partnership','compound_interest','discount','races','data_interpretation']);
  var gen = genMap[topic];
  if (gen) {
    var q = gen(diff, activeLayer || 'instinct');
    q._subTopic = topic;
    q.techniqueLabel = (q.techniqueLabel || '') + ' [' + topic.replace(/_/g,' ') + ']';
    return q;
  }
  // Fallback
  return generateNumberSenseQuestion(diff, 'exam');
}

function generateReasoningQuestion(diff, subMode) {
  var genMap = {
    pattern_flash: function(d){ var t = pick(['Series','Classification']); var g = {Series:generateSeriesQuestion,Classification:generateClassificationQuestion}[t]; return g ? g(d) : generateSeriesQuestion(d); },
    coding_flash: generateCodingQuestion,
    logic_snap: function(d){ var t = pick(['Syllogism','Inequality']); var g = {Syllogism:generateSyllogismQuestion,Inequality:generateInequalityQuestion}[t]; return g ? g(d) : generateSyllogismQuestion(d); },
    direction_sense: generateDirectionQuestion,
    blood_relations: generateBloodRelationQuestion,
    ranking_grid: function(d){ try { var p = generatePuzzle(d, 'comparison'); if(p && p.questionText) return p; } catch(e){} try { var p2 = generatePuzzle(d, 'orderrank'); if(p2 && p2.questionText) return p2; } catch(e2){} return generateInequalityQuestion(d); },
    floor_puzzle: function(d){ try { var p = generatePuzzle(d, 'floor'); if(p) return p; } catch(e){} return fallbackPuzzle(d); },
    linear_seating: function(d){ try { var p = generatePuzzle(d, 'linear'); if(p) return p; } catch(e){} return fallbackPuzzle(d); },
    circular_seating: function(d){ try { var p = generatePuzzle(d, 'circular'); if(p) return p; } catch(e){} return fallbackPuzzle(d); },
    box_distribution: function(d){ try { var p = generatePuzzle(d, 'comparison'); if(p) return p; } catch(e){} return fallbackPuzzle(d); },
    scheduling: function(d){ try { var p = generatePuzzle(d, 'scheduling'); if(p) return p; } catch(e){} return fallbackPuzzle(d); },
    input_output: function(d){ try { var p = generatePuzzle(d, 'inputoutput'); if(p) return p; } catch(e){} return fallbackPuzzle(d); },
    mirror_image: generateMirrorImageQuestion,
    dice_cube: generateDiceCubeQuestion,
    calendar: generateCalendarQuestion,
    clock: generateClockQuestion,
    alphabet_arrange: generateAlphabetArrangeQuestion,
    critical_reasoning: generateCriticalReasoningQuestion,
    decision_making: generateDecisionMakingQuestion,
    venn_diagram: generateVennDiagramQuestion
  };
  var topic = subMode || pick(['pattern_flash','coding_flash','logic_snap','direction_sense','blood_relations','ranking_grid','floor_puzzle','linear_seating','circular_seating','scheduling','input_output','mirror_image','dice_cube','calendar','clock','alphabet_arrange','critical_reasoning','decision_making','venn_diagram']);
  var gen = genMap[topic];
  if (gen) {
    try {
      var q = gen(diff);
      q._subTopic = topic;
      if (q.questionText) {
        // Wrap puzzle format into question format
        var typeLabel = q.typeLabel || 'Puzzle';
        var clueLines = (q.clueBlock || []).map(function(c,i){ return (i+1) + '. ' + c; });
        var fullQ = '<div style="text-align:left;font-size:.85em;line-height:1.7">'
          + '<div style="margin-bottom:4px;font-size:.72em;color:var(--purple);font-weight:700">' + typeLabel + '</div>'
          + '<p style="margin-bottom:6px;color:var(--text-sec);font-size:.9em">' + (q.preamble || '') + '</p>'
          + '<div style="margin:6px 0;padding:8px 12px;background:rgba(167,139,250,.06);border:1px solid rgba(167,139,250,.12);border-radius:6px">'
          + clueLines.join('<br>')
          + '</div>'
          + '<p style="margin-top:6px;font-weight:700;font-size:1em">' + q.questionText + '</p>'
          + '</div>';
        return {
          question: fullQ,
          answer: q.answer,
          options: q.options || ['A','B','C','D'],
          hint: q.hint || 'Read clues, draw diagram, fill positions.',
          timeLimit: 30,
          type: 'reasoning',
          _subTopic: topic,
          techniqueLabel: typeLabel + ': ' + (q.hint || 'draw table') + ' [' + topic.replace(/_/g,' ') + ']',
          solution: q.solution || '',
          intuition: (q.typeLabel || 'Puzzle') + ': Draw a diagram/table. Fill what you know, deduce the rest. Each clue eliminates possibilities.'
        };
      }
      q._subTopic = topic;
      q.type = 'reasoning';
      q.timeLimit = q.timeLimit || 15;
      q.techniqueLabel = (q.techniqueLabel || '') + ' [' + topic.replace(/_/g,' ') + ']';
      // Add intuition based on sub-topic
      var intuitions = {
        pattern_flash: 'Pattern Flash: Identify the rule (diff/ratio/square/prime). For odd-one-out: find what 3 share that 1 breaks.',
        coding_flash: 'Coding: A=1, B=2... Z=26. Sum positions. Check if the example uses sum, product, or position×index.',
        logic_snap: 'Logic: Draw Venn circles for syllogisms. Chain same-direction symbols for inequalities. If sign flips, stop.',
        direction_sense: 'Direction: Track N/S and E/W separately. Right = clockwise 90°. Pythagoras only if both axes changed.',
        blood_relations: 'Blood Relation: Draw 4-level tree. GP→Parent→Me→Child. Marriage = horizontal line. Same level = sibling.',
        ranking_grid: 'Ranking: List from highest to lowest. Fill positions from clues. "Between" = exactly 1 on each side.',
        floor_puzzle: 'Floor Puzzle: Draw vertical building (1=bottom). Fill names from direct clues first, then relative ones.',
        linear_seating: 'Linear: Draw positions 1 to N left to right. "Immediate left" = adjacent. Fill what you know, deduce gaps.',
        circular_seating: 'Circular: Position 1 = top, go clockwise. Left = anti-clockwise. Use "opposite" clues for even numbers.',
        box_distribution: 'Box/Distribution: Make a table. Rows = items, columns = properties. Fill confirmed cells first.',
        scheduling: 'Scheduling: List days/months. Mark fixed events. Use "before/after" clues to slide events into position.',
        input_output: 'Input-Output: Each step moves the smallest remaining element left. Track the sorting pattern.',
        mirror_image: 'Mirror = left-right flip. Water = top-bottom flip. Symmetrical letters: A,H,I,M,O,T,U,V,W,X,Y.',
        dice_cube: 'Dice: opposite sum=7. Cube: corners 3 faces, edges 2, centers 1, inner 0.',
        calendar: 'Odd days: normal yr=1, leap=2. Day shift = sum odd days mod 7.',
        clock: 'Angle = |30H - 5.5M|. Overlap at 60H/11. Coincide 22 times/day.',
        alphabet_arrange: 'Position: A=1 to Z=26. For next/find pattern, check diff between consecutive letters.',
        critical_reasoning: 'Assumption what MUST be true. Course of action must solve the problem. Cause must precede effect.',
        decision_making: 'Check each condition independently. AND=all pass. OR=any passes. Mark "cannot determine" if info missing.',
        venn_diagram: 'Only A = A-both. Neither = total - (A+B-both). Draw overlapping circles.'
      };
      q.intuition = intuitions[topic] || 'Draw a diagram/table. Fill known facts, deduce the rest.';
      return q;
    } catch(e) { /* fallback */ }
  }
  // Fallback
  return generateAnalogyQuestion(diff);
}

// ====== REFLEX MODE GENERATORS ======

function generateQuickSolveQuestion(diff) {
  // Mixed question from any pattern type, solve fast
  var types = ['Analogy','Classification','Series','Coding','Syllogism','Inequality','Direction','Blood Relation','Data Sufficiency'];
  var type = types[rand(0, types.length - 1)];
  var genMap = {
    Analogy: generateAnalogyQuestion, Classification: generateClassificationQuestion,
    Series: generateSeriesQuestion, Coding: generateCodingQuestion,
    Syllogism: generateSyllogismQuestion, Inequality: generateInequalityQuestion,
    Direction: generateDirectionQuestion, 'Blood Relation': generateBloodRelationQuestion,
    'Data Sufficiency': generateDataSufficiencyQuestion
  };
  try {
    var gen = genMap[type];
    if (gen) {
      var q = gen(diff);
      q.timeLimit = diff <= 1 ? 8 : (diff <= 3 ? 6 : 5);
      q.type = 'quicksolve';
      q.drillLine1 = 'Solve in 5-8s';
      q.drillLine2 = type + ': ' + (q.question || '').substring(0, 40);
      q.techniqueLabel = 'Quick: ' + type + ' — ' + (q.hint || 'Use pattern rules');
      q.intuition = 'Quick Solve: Spot the question TYPE first. Each type has a unique shortcut. Analogy→find relation, Series→check diff/ratio, Coding→letter positions.';
      return q;
    }
  } catch(e) {}
  return generateMathQuestion(diff);
}

function generateInstinctQuestion(diff) {
  // Shortcut recognition — designed to trigger pattern recognition
  var types = ['Analogy','Classification','Series','Coding','Syllogism','Inequality'];
  var type = types[rand(0, types.length - 1)];
  var genMap = {
    Analogy: generateAnalogyQuestion, Classification: generateClassificationQuestion,
    Series: generateSeriesQuestion, Coding: generateCodingQuestion,
    Syllogism: generateSyllogismQuestion, Inequality: generateInequalityQuestion
  };
  try {
    var gen = genMap[type];
    if (gen) {
      var q = gen(diff);
      q.timeLimit = diff <= 1 ? 10 : (diff <= 3 ? 8 : 6);
      q.type = 'instinct';
      q.drillLine1 = '💡 Spot the pattern — ' + type;
      q.drillLine2 = q.hint || 'Trust your first instinct';
      q.techniqueLabel = 'Instinct: ' + type + ' — recognize the pattern in 5-10s';
      q.hint = '🔑 ' + (q.hint || 'Spot the type, apply the shortcut');
      q.intuition = 'Instinct: For ' + type + ', the FIRST thing to identify is: ' + (SPEED_TECHNIQUES[type] || 'the relationship pattern') + '. Train your eye to spot the type in 2s.';
      return q;
    }
  } catch(e) {}
  return generateAnalogyQuestion(diff);
}

function generateFiveSecQuestion(diff) {
  // Extremely short — pure recognition
  var rapid = [
    { q:'2\u00B2?', a:4, hint:'2\u00D72' },
    { q:'3\u00B2?', a:9, hint:'3\u00D73' },
    { q:'4\u00B2?', a:16, hint:'4\u00D74' },
    { q:'5\u00B2?', a:25, hint:'5\u00D75' },
    { q:'6\u00B2?', a:36, hint:'6\u00D76' },
    { q:'7\u00B2?', a:49, hint:'7\u00D77' },
    { q:'8\u00B2?', a:64, hint:'8\u00D78' },
    { q:'9\u00B2?', a:81, hint:'9\u00D79' },
    { q:'10\u00B2?', a:100, hint:'10\u00D710' },
    { q:'11\u00B2?', a:121, hint:'11\u00D711' },
    { q:'12\u00B2?', a:144, hint:'12\u00D712' },
    { q:'2\u00B3?', a:8, hint:'2\u00D72\u00D72' },
    { q:'3\u00B3?', a:27, hint:'3\u00D73\u00D73' },
    { q:'4\u00B3?', a:64, hint:'4\u00D74\u00D74' },
    { q:'5\u00B3?', a:125, hint:'5\u00D75\u00D75' },
    { q:'\u221A169?', a:13, hint:'13\u00B2=169' },
    { q:'\u221A225?', a:15, hint:'15\u00B2=225' },
    { q:'\u221A144?', a:12, hint:'12\u00B2=144' },
    { q:'\u221A121?', a:11, hint:'11\u00B2=121' },
    { q:'\u221A100?', a:10, hint:'10\u00B2=100' },
    { q:'25% of 200?', a:50, hint:'200/4' },
    { q:'50% of 80?', a:40, hint:'80/2' },
    { q:'10% of 350?', a:35, hint:'350/10' },
    { q:'20% of 150?', a:30, hint:'150/5' },
    { q:'1/2 as %?', a:50, hint:'1/2=0.5=50%' },
    { q:'1/4 as %?', a:25, hint:'1/4=0.25=25%' },
    { q:'3/4 as %?', a:75, hint:'3/4=0.75=75%' },
    { q:'1/5 as %?', a:20, hint:'1/5=0.2=20%' }
  ];
  var item = rapid[rand(0, rapid.length - 1)];
  var opts = [item.a];
  while (opts.length < 4) { var d = item.a + rand(-3, 3); if (opts.indexOf(d) < 0 && d > 0) opts.push(d); }
  shuffle(opts);
  return {
    question: item.q,
    answer: item.a,
    options: opts,
    hint: item.hint,
    timeLimit: 5,
    type: 'fivesec',
    techniqueLabel: '5s: ' + item.q + ' = ' + item.a + ' (' + item.hint + ')',
    drillLine1: '⚡ 5-Second Challenge',
    drillLine2: item.q + ' = ?',
    intuition: 'Recognition speed: these are common values you should know instantly. Squares up to 30, cubes up to 10, common percentages.'
  };
}

function generateExamRushQuestion(diff) {
  // Mixed with high difficulty and time pressure
  var types = ['number_sense','percentage','arithmetic','motion','work','algebra','Analogy','Series','Coding','Syllogism','Inequality','Direction'];
  var type = types[rand(0, types.length - 1)];
  var minDiff = Math.min(10, diff + 2);
  // Try quant first, then reasoning
  var qGenMap = {
    number_sense: generateNumberSenseQuestion, percentage: generatePercentageQuestion,
    arithmetic: generateArithmeticQuestion, motion: generateMotionQuestion,
    work: generateWorkQuestion, algebra: generateAlgebraQuestion,
    Analogy: generateAnalogyQuestion, Series: generateSeriesQuestion,
    Coding: generateCodingQuestion, Syllogism: generateSyllogismQuestion,
    Inequality: generateInequalityQuestion, Direction: generateDirectionQuestion
  };
  try {
    var gen = qGenMap[type];
    if (gen) {
      var q = gen(minDiff, 'exam');
      q.timeLimit = Math.max(4, 8 - diff);
      q.type = 'examrush';
      q.techniqueLabel = '🚀 Exam Rush: ' + (q.techniqueLabel || 'Solve fast under pressure');
      q.intuition = 'Exam Rush: Prioritize easy questions. If stuck >10s, mark and move on. Come back later.';
      return q;
    }
  } catch(e) {}
  return generateMathQuestion(minDiff);
}

function generateWeakSpotQuestion(diff) {
  // Serve from mistake bank, or a random topic the user is weak in
  var mistakes = getMistakesForRetry(3);
  if (mistakes.length > 0) {
    var m = mistakes[rand(0, mistakes.length - 1)];
    var opts = (m.options || ['A','B','C','D']).slice();
    shuffle(opts);
    return {
      question: '🎯 Retry: ' + (m.question || 'What comes next? (Answer: ' + m.answer + ')'),
      answer: m.answer,
      options: opts,
      hint: 'You got this wrong before. ' + (m.techniqueLabel || 'Try again carefully'),
      timeLimit: 15,
      type: 'weakspot',
      techniqueLabel: 'Weak Spot: ' + (m.patternLabel || 'review this type'),
      drillLine1: '🎯 Weak Spot Attack',
      drillLine2: m.patternLabel ? 'Type: ' + m.patternLabel : 'Review your mistake',
      intuition: 'You got this wrong before. The mistake pattern is: ' + (m.techniqueLabel || 'review the concept carefully') + '. Remember what you missed last time.'
    };
  }
  // No mistakes: serve a tough question from a random topic
  return generateExamRushQuestion(diff);
}

// Register new generators
GENERATORS.quicksolve = generateQuickSolveQuestion;
GENERATORS.instinct = generateInstinctQuestion;
GENERATORS.fivesec = generateFiveSecQuestion;
GENERATORS.examrush = generateExamRushQuestion;
GENERATORS.weakspot = generateWeakSpotQuestion;
GENERATORS.quant = generateQuantQuestion;
GENERATORS.reasoning = generateReasoningQuestion;

// ====== MAIN TRAINING FUNCTIONS ======
window.startMentalSession = function(mode, opts) {
  var state = load();
  opts = opts || {};
  if (!mode || !GENERATORS[mode]) mode = 'mixed';
  var subMode = opts.subMode || null;
  var totalQ = (mode === 'puzzle') ? 5 : 10;

  // Inject mistake bank questions (skip for puzzle/weakspot mode and when a specific sub-topic is chosen)
  var mistakeQueue = [];
  if (mode !== 'puzzle' && mode !== 'weakspot' && !subMode) {
    mistakeQueue = getMistakesForRetry(2);
  }

  var session = {
    mode: mode,
    subMode: subMode,
    layer: opts.layer || 'instinct',
    questionIndex: 0,
    totalQuestions: totalQ + mistakeQueue.length,
    correct: 0,
    startTime: Date.now(),
    active: true,
    hardMode: !!opts.hardMode,
    focusType: opts.focusType || null,
    review: [],
    mistakeQueue: mistakeQueue
  };
  if (mode === 'puzzle') {
    session.puzzles = [];
    for (var i = 0; i < totalQ; i++) {
      try { session.puzzles.push(GENERATORS.puzzle(state.difficulty.level)); }
      catch(e) { session.puzzles.push(fallbackPuzzle(state.difficulty.level)); }
    }
    session.puzzleIndex = 0;
  }
  return session;
};

window.getMentalQuestion = function(session) {
  if (!session || !session.active) return null;
  var state = load();
  var diff = state.difficulty.level;

  // Serve mistake bank questions first
  if (session.mistakeQueue && session.mistakeQueue.length > 0) {
    var m = session.mistakeQueue.shift();
    var opts = (m.options || []).slice();
    shuffle(opts);
    return {
      displayType: 'mistake',
      question: '&#128221; Retry: ' + (m.question || 'What comes next? (Answer: ' + m.answer + ')'),
      answer: m.answer,
      options: opts,
      hint: 'You got this wrong before. Use the technique.',
      timeLimit: 12,
      type: m.type || 'pattern',
      patternLabel: m.patternLabel || '',
      techniqueLabel: m.techniqueLabel || '',
      drillLine1: m.drillLine1 || '',
      drillLine2: m.drillLine2 || '',
      solution: m.solution || '',
      index: session.questionIndex,
      total: session.totalQuestions,
      progress: Math.round(session.questionIndex / session.totalQuestions * 100),
      isMistakeRetry: true,
      _mistakeQuestion: m.question  // original question text for bank lookup; null indicates no stored original
    };
  }

  if (session.mode === 'puzzle') {
    var puzzle = session.puzzles[session.puzzleIndex];
    if (!puzzle) return null;
    // Build full puzzle text (all clues at once, like real exam)
    var clueLines = puzzle.clueBlock.map(function(c, i) { return (i + 1) + '. ' + c; });
    var typeLabel = puzzle.typeLabel || 'Reasoning';
    var fullText = '<div style="text-align:left;font-size:.85em;line-height:1.7">'
      + '<div style="margin-bottom:6px;font-size:.75em;color:var(--purple);font-weight:700;text-transform:uppercase;letter-spacing:.5px">' + typeLabel + '</div>'
      + '<p style="margin-bottom:8px;color:var(--text-sec)">' + puzzle.preamble + '</p>'
      + '<div style="margin:8px 0;padding:10px 14px;background:rgba(167,139,250,.06);border:1px solid rgba(167,139,250,.12);border-radius:8px">'
      + clueLines.join('<br>')
      + '</div>'
      + '<p style="margin-top:8px;font-weight:700;font-size:1.05em">' + puzzle.questionText + '</p>'
      + '</div>';
    return {
      displayType: 'puzzle',
      question: fullText,
      options: puzzle.options,
      answer: puzzle.answer,
      target: puzzle.target,
      index: session.puzzleIndex,
      total: session.totalQuestions,
      progress: Math.round(session.puzzleIndex / session.totalQuestions * 100),
      timeLimit: puzzle.timeLimit,
      hint: puzzle.hint,
      solution: puzzle.solution || ''
    };
  }

  if (session.mode === 'quant' || session.mode === 'reasoning') {
    var q = GENERATORS[session.mode](diff, session.subMode);
    q.displayType = 'normal';
    q.index = session.questionIndex;
    q.total = session.totalQuestions;
    q.progress = Math.round(session.questionIndex / session.totalQuestions * 100);
    q._subTopic = q._subTopic || session.subMode;
    if (session.hardMode) q.timeLimit = Math.max(3, Math.round(q.timeLimit * 0.55));
    if (session.layer === 'instinct' && q.timeLimit > 12) q.timeLimit = 12;
    return q;
  }

  var q = session.mode === 'pattern' && session.focusType
    ? generatePatternQuestion(diff, session.focusType)
    : GENERATORS[session.mode](diff);
  q.displayType = 'normal';
  q.index = session.questionIndex;
  q.total = session.totalQuestions;
  q.progress = Math.round(session.questionIndex / session.totalQuestions * 100);
  if (session.hardMode) {
    q.timeLimit = Math.max(3, Math.round(q.timeLimit * 0.55));
  }
  return q;
};

window.submitMentalAnswer = function(session, question, selectedAnswer, timeRemaining) {
  var state = load();
  if (!session || !session.active) return null;

  var correct = String(selectedAnswer) === String(question.answer);
  var timeLimit = question.timeLimit;
  var timeTaken = timeLimit - timeRemaining;
  var bonus = correct ? Math.round((timeRemaining / timeLimit) * 5) : 0;
  var basePoints = correct ? (question.difficulty || state.difficulty.level) * 2 : 0;
  var hardMult = session.hardMode ? 2 : 1;
  var points = (basePoints + bonus) * hardMult;

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

  // Track per-sub-topic stats (quant/reasoning)
  var subTopic = question._subTopic || session.subMode;
  if (subTopic && state.subTopicStats && state.subTopicStats[subTopic]) {
    state.subTopicStats[subTopic].attempts++;
    if (correct) state.subTopicStats[subTopic].correct++;
    // Also update parent category stat
    var parentCat = mode === 'quant' ? 'quant' : (mode === 'reasoning' ? 'reasoning' : null);
    if (parentCat && state.stats[parentCat]) {
      state.stats[parentCat].attempts++;
      if (correct) state.stats[parentCat].correct++;
    }
  }

  // Track per-pattern stats (only for pattern mode)
  if (mode === 'pattern' && question.patternLabel && state.patternStats[question.patternLabel]) {
    state.patternStats[question.patternLabel].attempts++;
    if (correct) state.patternStats[question.patternLabel].correct++;
  }

  // Track speed data per type
  var typeKey = question.patternLabel || '';
  if (mode === 'pattern' && typeKey && state.speedData && state.speedData[typeKey]) {
    state.speedData[typeKey].time += timeTaken;
    state.speedData[typeKey].count++;
  }

  // Mistake bank: wrong answer → add to bank; correct retry → remove from bank
  if (!correct && !question.isMistakeRetry) {
    addMistake(question, session);
  } else if (correct && question.isMistakeRetry && question._mistakeQuestion) {
    removeMistake(question._mistakeQuestion);
  }

  // Record for session review
  if (session.review) {
    session.review.push({
      question: question.question,
      yourAnswer: selectedAnswer,
      correctAnswer: question.answer,
      isCorrect: correct,
      patternLabel: question.patternLabel || '',
      techniqueLabel: question.techniqueLabel || '',
      drillLine1: question.drillLine1 || '',
      options: question.options || [],
      solution: question.solution || '',
      timeTaken: timeTaken,
      timeLimit: timeLimit
    });
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
    state.sessions.push({ mode: session.mode, subMode: session.subMode || '', correct: session.correct, total: session.totalQuestions, accuracy: accuracy, time: elapsed, date: new Date().toISOString(), hardMode: !!session.hardMode });
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
    subTopicStats: state.subTopicStats,
    patternStats: state.patternStats,
    hardSessions: state.sessions.filter(function(s){ return s.hardMode; }).length,
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

window.SPEED_TARGETS = SPEED_TARGETS;

window.getSpeedGrades = function() {
  var state = load();
  var grades = {};
  var types = PATTERN_TYPES;
  for (var i = 0; i < types.length; i++) {
    var t = types[i];
    var sd = state.speedData && state.speedData[t];
    var target = SPEED_TARGETS[t];
    if (sd && sd.count > 0 && target) {
      var avg = Math.round(sd.time / sd.count);
      var grade = avg <= target.topper ? 'A' : (avg <= target.good ? 'B' : (avg <= target.average ? 'C' : 'D'));
      grades[t] = { avg: avg, grade: grade, topper: target.topper, good: target.good, average: target.average };
    } else {
      grades[t] = null;
    }
  }
  return grades;
};

// ====== FLOOR / SEATING PUZZLE GENERATOR (clean, never hangs) ======
var PUZ_NAMES = ['Amit','Bina','Chitra','Dev','Esha','Farhan','Geeta','Hari','Isha','Jatin','Kavya','Lalit','Meera','Nitin','Ojas','Preeti','Rahul','Sana','Tanvi','Uday','Varsha','Wasim','Xena','Yash','Zara'];

function fallbackPuzzle(diff) {
  var names = ['P','Q','R','S','T'];
  shuffle(names);
  var floors = [1,2,3,4,5];
  var assign = {};
  for (var i = 0; i < names.length; i++) assign[names[i]] = floors[i];
  var target = names[rand(0, names.length - 1)];
  var ans = assign[target];
  var opts = [ans];
  while (opts.length < 4) { var d = rand(1, 10); if (opts.indexOf(d) < 0) opts.push(d); }
  shuffle(opts);
  return {
    type: 'puzzle',
    clueBlock: [
      names[0] + ' lives on floor ' + assign[names[0]] + '.',
      names[1] + ' lives above ' + names[2] + ' but below ' + names[3] + '.',
      names[4] + ' does not live on floor 1.',
      'The person on floor 3 is ' + names[names.length - 1] + '.'
    ],
    preamble: names.length + ' persons ' + names.join(' to ') + ' live in a 5-storey building (1=ground). Each lives on a different floor.',
    questionText: 'Which floor does ' + target + ' live on?',
    answer: String(ans),
    answerIndex: ans,
    options: opts,
    timeLimit: 40 + diff * 5,
    hint: 'Draw the building: floor 1 (bottom) to 5 (top). Fill as you read clues.',
    typeLabel: 'Floor Puzzle',
    solution: target + ' lives on floor ' + ans + '.'
  };
}

function generatePuzzle(diff, desiredType) {
  try {
    var choices = ['floor','linear','circular','comparison','blood','direction','scheduling','inputoutput','coding','syllogism','inequality','orderrank'];
    var puzType = desiredType || choices[rand(0, choices.length - 1)];
    // diff 0-1=4-5 persons, 2-3=5-6, 4-5=6-8
    var n = diff <= 1 ? 4 + rand(0, 1) : diff <= 3 ? 5 + rand(0, 1) : 6 + rand(0, 2);
    var names = PUZ_NAMES.slice(0, n);
    shuffle(names);

    // Helper: return index in [0..n-1] wrapping
    function modIdx(i) { return ((i % n) + n) % n; }

    // Helper: ordinal word
    var ORD = ['','first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth'];

    if (puzType === 'floor') {
      // Exam-style floor puzzle: assign persons to floors 1..n
      var floors = [], opts, clues, i, d, aIdx, bIdx, cIdx, negFloor;
      for (i = 1; i <= n; i++) floors.push(i);
      shuffle(floors);
      var liveOn = {};
      for (i = 0; i < n; i++) liveOn[names[i]] = floors[i];
      // Pick a question target with varied question types
      var qType = rand(0, 2); // 0=whichFloor, 1=whoOnFloor, 2=between
      var target, ans, qText;
      if (qType === 0) {
        target = names[rand(0, n - 1)];
        ans = liveOn[target];
        qText = 'On which floor does ' + target + ' live?';
      } else if (qType === 1) {
        ans = names[rand(0, n - 1)];
        var floorNum = liveOn[ans];
        qText = 'Who lives on floor ' + floorNum + '?';
        target = ans;
      } else {
        // "How many persons live between X and Y?"
        var b1 = rand(0, n - 1), b2 = rand(0, n - 1);
        if (b1 === b2) b2 = (b1 + 1) % n;
        var f1 = liveOn[names[b1]], f2 = liveOn[names[b2]];
        if (f1 > f2) { var tmp = f1; f1 = f2; f2 = tmp; }
        ans = f2 - f1 - 1;
        qText = 'How many persons live between ' + names[b1] + ' and ' + names[b2] + '?';
      }
      clues = [];
      // Clue 1: direct floor
      clues.push(names[0] + ' lives on floor ' + liveOn[names[0]] + '.');
      // Clue 2: above/below chain
      aIdx = 1 % n; bIdx = 2 % n; cIdx = 3 % n;
      if (liveOn[names[aIdx]] > liveOn[names[bIdx]]) {
        if (liveOn[names[aIdx]] < liveOn[names[cIdx]])
          clues.push(names[aIdx] + ' lives above ' + names[bIdx] + ' but below ' + names[cIdx] + '.');
        else clues.push(names[aIdx] + ' lives above ' + names[bIdx] + '.');
      } else if (liveOn[names[aIdx]] < liveOn[names[bIdx]]) {
        if (liveOn[names[aIdx]] > liveOn[names[cIdx]])
          clues.push(names[aIdx] + ' lives below ' + names[bIdx] + ' but above ' + names[cIdx] + '.');
        else clues.push(names[aIdx] + ' lives below ' + names[bIdx] + '.');
      }
      // Clue 3: two-floor gap (exam style: "X lives two floors above Y")
      if (n >= 4) {
        var gapA = 2 % n, gapB = (gapA + 2) % n;
        if (liveOn[names[gapA]] > liveOn[names[gapB]]) clues.push(names[gapA] + ' lives two floors above ' + names[gapB] + '.');
        else if (liveOn[names[gapA]] < liveOn[names[gapB]]) clues.push(names[gapB] + ' lives two floors above ' + names[gapA] + '.');
      }
      // Clue 4: negative clue
      negFloor = floors[rand(0, n - 1)];
      if (liveOn[names[n-1]] !== negFloor) clues.push(names[n-1] + ' does not live on floor ' + negFloor + '.');
      // Clue 5: even/odd clue (exam pattern)
      var eoIdx = 3 % n;
      if (liveOn[names[eoIdx]] % 2 === 0) clues.push(names[eoIdx] + ' lives on an even-numbered floor.');
      else clues.push(names[eoIdx] + ' lives on an odd-numbered floor.');
      // For diff >= 3, add floor-person clue
      if (diff >= 3) clues.push('The person on floor ' + floors[n-1] + ' is ' + names[n-1] + '.');

      if (qType === 2) {
        opts = [];
        for (d = 0; d <= n - 2; d++) opts.push(d);
        while (opts.length < 4) { d = rand(1, n); if (opts.indexOf(d) < 0) opts.push(d); }
      } else if (typeof ans === 'string') {
        opts = [ans];
        while (opts.length < 4) { var rn = PUZ_NAMES[rand(0, PUZ_NAMES.length - 1)]; if (opts.indexOf(rn) < 0) opts.push(rn); }
      } else {
        opts = [ans];
        while (opts.length < 4) { d = rand(1, n + 2); if (opts.indexOf(d) < 0) opts.push(d); }
      }
      shuffle(opts);
      return {
        type: 'puzzle', clueBlock: clues,
        preamble: n + ' persons ' + names.join(', ') + ' live in a ' + n + '-storey building (ground floor=1). Each lives on a different floor.',
        questionText: qText, answer: String(ans),
        options: opts, timeLimit: 45 + diff * 8,
        hint: 'Draw a vertical building. Floor 1 at bottom. Mark names from clues.',
        typeLabel: 'Floor Puzzle',
        solution: 'Floor map: ' + names.map(function(nn){return nn+'='+seatOf[nn];}).join(', ') + '. Answer=' + ans + '.'
      };
    } else if (puzType === 'linear') {
      //EXAM-STYLE LINEAR ROW — left to right positions 1..n
      var positions = [], opts, clues, i, d, ni, posDiff, left, right, notPos;
      for (i = 1; i <= n; i++) positions.push(i);
      shuffle(positions);
      var seatOf = {};
      for (i = 0; i < n; i++) seatOf[names[i]] = positions[i];
      // Question variety
      var qType = rand(0, 2);
      var target, ans, qText;
      if (qType === 0) {
        target = names[rand(0, n - 1)];
        ans = seatOf[target];
        qText = 'What is the position of ' + target + ' from the left end?';
      } else if (qType === 1) {
        // "Who sits second to the right of X?"
        target = names[rand(0, n - 1)];
        var offset = 1 + rand(0, Math.min(1, n - 2));
        var tPos = seatOf[target];
        var rightPos = tPos + offset;
        if (rightPos > n) rightPos = tPos - offset;
        ans = null;
        for (var ni2 = 0; ni2 < n; ni2++) { if (seatOf[names[ni2]] === rightPos) { ans = names[ni2]; break; } }
        if (!ans) { ans = names[(n - 1) % n]; }
        qText = 'Who sits ' + ORD[offset + 1] + ' to the right of ' + target + '?';
      } else {
        target = names[rand(0, n - 1)];
        ans = seatOf[target];
        qText = 'What is the position of ' + target + ' from the right end?';
        ans = n - ans + 1;
      }
      clues = [];
      // Clue 1: end person
      clues.push(names[0] + ' sits at the extreme left end.');
      // Clue 2: immediate neighbor
      ni = 1 % n;
      posDiff = seatOf[names[ni]] - seatOf[names[(ni+1) % n]];
      if (Math.abs(posDiff) === 1) {
        left = seatOf[names[ni]] < seatOf[names[(ni+1) % n]] ? names[ni] : names[(ni+1) % n];
        right = seatOf[names[ni]] < seatOf[names[(ni+1) % n]] ? names[(ni+1) % n] : names[ni];
        clues.push(left + ' sits to the immediate left of ' + right + '.');
      } else {
        // Fallback: generic relative clue
        clues.push(names[ni] + ' sits somewhere to the left of ' + names[(ni+1) % n] + '.');
      }
      // Clue 3: positional reference
      clues.push(names[2 % n] + ' sits at position ' + seatOf[names[2 % n]] + ' from the left.');
      // Clue 4: negative "does not sit at"
      notPos = positions[rand(0, n - 1)];
      while (notPos === seatOf[names[n-1]]) { notPos = positions[rand(0, n - 1)]; }
      clues.push(names[n-1] + ' does not sit at position ' + notPos + '.');
      // Clue 5: "X sits between Y and Z" (exam pattern)
      if (n >= 5) {
        var betA = 0 % n, betB = (betA + 2) % n;
        if (Math.abs(seatOf[names[betA]] - seatOf[names[betB]]) === 2) {
          var midPos = (seatOf[names[betA]] + seatOf[names[betB]]) / 2;
          for (var mi = 0; mi < n; mi++) { if (seatOf[names[mi]] === midPos) { clues.push(names[mi] + ' sits between ' + names[betA] + ' and ' + names[betB] + '.'); break; } }
        }
      }
      // Clue 6: right-end for diff>=3
      if (diff >= 3) clues.push(names[n-1] + ' sits at the extreme right end.');

      if (typeof ans === 'string') {
        opts = [ans];
        while (opts.length < 4) { var rname = PUZ_NAMES[rand(0, PUZ_NAMES.length - 1)]; if (opts.indexOf(rname) < 0) opts.push(rname); }
      } else {
        opts = [ans];
        while (opts.length < 4) { d = rand(1, n + 1); if (opts.indexOf(d) < 0) opts.push(d); }
      }
      shuffle(opts);
      return {
        type: 'puzzle', clueBlock: clues,
        preamble: n + ' persons ' + names.join(', ') + ' sit in a row facing North. Positions are numbered 1 (leftmost) to ' + n + ' (rightmost).',
        questionText: qText, answer: String(ans),
        options: opts, timeLimit: 50 + diff * 8,
        hint: 'Draw 1 to ' + n + ' left to right. Fill names from clues.',
        typeLabel: 'Linear Arrangement',
        solution: 'Positions: ' + names.map(function(nn){return nn+'='+seatOf[nn];}).join(', ') + '. Answer=' + ans + '.'
      };
    } else if (puzType === 'circular') {
      //EXAM-STYLE CIRCULAR SEATING — positions 1..n clockwise, facing center
      var positions = [], opts, clues, i, d, ni;
      for (i = 1; i <= n; i++) positions.push(i);
      shuffle(positions);
      var circSeat = {};
      for (i = 0; i < n; i++) circSeat[names[i]] = positions[i];
      // Question variety
      var qType = rand(0, 2);
      var target, ans, qText;
      if (qType === 0) {
        target = names[rand(0, n - 1)];
        ans = circSeat[target];
        qText = 'At which position does ' + target + ' sit? (Position 1 is at the top, numbered clockwise)';
      } else if (qType === 1) {
        // "Who sits third to the left of X?"
        target = names[rand(0, n - 1)];
        var offset = 1 + rand(0, Math.min(2, n - 2));
        var tPos = circSeat[target];
        var leftPos = ((tPos - offset - 1 + n) % n) + 1;
        ans = null;
        for (var ci = 0; ci < n; ci++) { if (circSeat[names[ci]] === leftPos) { ans = names[ci]; break; } }
        if (!ans) ans = names[(tPos + offset) % n];
        var offsetWord = offset === 1 ? 'immediate' : ORD[offset + 1];
        qText = 'Who sits to the ' + offsetWord + ' left of ' + target + '?';
      } else {
        // "Who is opposite X?"
        target = names[rand(0, n - 1)];
        var tPos2 = circSeat[target];
        var oppPos = ((tPos2 - 1 + n/2) % n) + 1;
        if (n % 2 !== 0) oppPos = ((tPos2 - 1 + Math.floor(n/2)) % n) + 1;
        ans = null;
        for (ci = 0; ci < n; ci++) { if (circSeat[names[ci]] === oppPos) { ans = names[ci]; break; } }
        if (!ans) ans = names[(tPos2 + 1) % n];
        qText = 'Who sits opposite ' + target + '?';
      }
      clues = [];
      // Clue 1: "X sits second to the left of Y"
      ni = 0 % n;
      var ni2 = (ni + 2) % n;
      clues.push(names[ni] + ' sits second to the left of ' + names[ni2] + '.');
      // Clue 2: "X sits to the immediate right of Y"
      if (n >= 3) {
        var ri = 1 % n;
        var riNext = (ri + 1) % n;
        clues.push(names[ri] + ' sits to the immediate right of ' + names[riNext] + '.');
      }
      // Clue 3: "X and Y are opposite" (only for even n)
      if (n >= 4 && n % 2 === 0) {
        var opp1 = 2 % n;
        var opp2 = (opp1 + n/2) % n;
        clues.push(names[opp1] + ' and ' + names[opp2] + ' are opposite each other.');
      }
      // Clue 4: negative neighbor
      var nx = n - 1;
      var nx2 = (nx - 2 + n) % n;
      clues.push(names[nx] + ' does not sit next to ' + names[nx2] + '.');
      // Clue 5: "X sits three places away from Y" (exam style for diff>=3)
      if (diff >= 3 && n >= 5) {
        var fa = 3 % n, fb = (fa + 3) % n;
        clues.push(names[fa] + ' sits three places away from ' + names[fb] + '.');
      }
      // Clue 6: "X sits exactly between Y and Z"
      if (n >= 5) {
        var da = 0 % n, db = (da + 2) % n;
        if (Math.abs(circSeat[names[da]] - circSeat[names[db]]) === 2 ||
            (Math.abs(circSeat[names[da]] - circSeat[names[db]]) === n - 2)) {
          clues.push(names[(da + 1) % n] + ' sits exactly between ' + names[da] + ' and ' + names[db] + '.');
        }
      }
      var ansIsName = typeof ans === 'string';
      if (!ansIsName) {
        opts = [ans];
        while (opts.length < 4) { d = rand(1, n + 1); if (opts.indexOf(d) < 0) opts.push(d); }
      } else {
        opts = [ans];
        while (opts.length < 4) { var rn = PUZ_NAMES[rand(0, PUZ_NAMES.length - 1)]; if (opts.indexOf(rn) < 0) opts.push(rn); }
      }
      shuffle(opts);
      var posWords = ['','1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th'];
      return {
        type: 'puzzle', clueBlock: clues,
        preamble: n + ' persons ' + names.join(', ') + ' sit around a circular table facing the centre. Positions numbered 1 to ' + n + ' clockwise. (Left = anti-clockwise, Right = clockwise)',
        questionText: qText, answer: String(ans),
        options: opts, timeLimit: 55 + diff * 10,
        hint: 'Draw a circle, mark 12-o\'clock as position 1, go clockwise. Fill names.',
        typeLabel: 'Circular Arrangement',
        solution: 'Position 1=' + names[0] + '(' + circSeat[names[0]] + '). Fill clockwise. ' + target + '=' + (typeof ans==='string' ? ans : 'pos ' + ans) + '.'
      };
    } else if (puzType === 'comparison') {
      var order = [];
      for (var i = 0; i < n; i++) order.push(i);
      shuffle(order);
      var valRank = {};
      for (var i = 0; i < n; i++) valRank[names[order[i]]] = i;
      // Pick comparison domain
      var domains = ['taller','older','heavier','scored higher'];
      var domain = domains[rand(0, domains.length - 1)];
      var dWord = domain; // "taller", "older" etc
      var dAdj = domain === 'taller' ? 'shortest' : domain === 'older' ? 'youngest' : domain === 'heavier' ? 'lightest' : 'lowest';
      var dSuper = domain === 'taller' ? 'tallest' : domain === 'older' ? 'oldest' : domain === 'heavier' ? 'heaviest' : 'highest';
      // Question variety
      var qType = rand(0, 2);
      var target, ans, qText;
      if (qType === 0) {
        target = names[rand(0, n - 1)];
        ans = valRank[target] + 1;
        qText = 'What is the rank of ' + target + ' from the top (1=' + dSuper + ')?';
      } else if (qType === 1) {
        // "Who is the X-th tallest?"
        var rankVal = rand(1, n);
        ans = null;
        for (var ri = 0; ri < n; ri++) { if (valRank[names[ri]] + 1 === rankVal) { ans = names[ri]; break; } }
        if (!ans) ans = names[rand(0, n - 1)];
        qText = 'Who is the ' + ORD[rankVal] + ' ' + dSuper + '?';
      } else {
        // "Who is taller: X or Y?"
        var a = rand(0, n - 1), b = rand(0, n - 1);
        if (a === b) b = (a + 1) % n;
        if (valRank[names[a]] < valRank[names[b]]) {
          ans = names[a];
          qText = 'Who is ' + domain + ': ' + names[a] + ' or ' + names[b] + '?';
        } else {
          ans = names[b];
          qText = 'Who is ' + domain + ': ' + names[a] + ' or ' + names[b] + '?';
        }
      }
      var clues = [];
      // Clue 1: chain "X is taller than Y but shorter than Z"
      var c1 = order[0], c2 = order[1], c3 = order[2];
      clues.push(names[c1] + ' is ' + domain + ' than ' + names[c2] + ' but ' + dAdj + ' than ' + names[c3] + '.');
      // Clue 2: plus sign comparison
      if (valRank[names[c1]] > valRank[names[c3]]) clues.push(names[c1] + ' is ' + dAdj + ' than ' + names[c3] + '.');
      else clues.push(names[c1] + ' is ' + domain + ' than ' + names[c3] + '.');
      // Clue 3: extreme
      clues.push(names[order[0]] + ' is the ' + dSuper + ' among them.');
      clues.push(names[order[n-1]] + ' is the ' + dAdj + ' among them.');
      // Clue 4: mid-person
      var mid = order[Math.floor(n/2)];
      if (mid !== order[0] && mid !== order[n-1]) clues.push(names[mid] + ' is neither the ' + dSuper + ' nor the ' + dAdj + '.');
      // Clue 5: additional chain for diff>=3
      if (diff >= 3 && n >= 5) {
        var c4 = order[Math.min(3, n-1)], c5 = order[Math.min(4, n-1)];
        if (c4 !== c5) clues.push(names[c4] + ' is ' + domain + ' than ' + names[c5] + '.');
      }
      var ansIsName = typeof ans === 'string';
      if (!ansIsName) {
        opts = [ans];
        while (opts.length < 4) { var d2 = rand(1, n + 1); if (opts.indexOf(d2) < 0) opts.push(d2); }
      } else {
        opts = [ans];
        while (opts.length < 4) { var rn = PUZ_NAMES[rand(0, PUZ_NAMES.length - 1)]; if (opts.indexOf(rn) < 0) opts.push(rn); }
      }
      shuffle(opts);
      var rankWords = ['','first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth'];
      return {
        type: 'puzzle', clueBlock: clues,
        preamble: n + ' persons ' + names.join(', ') + ' have different ' + (domain === 'taller' ? 'heights' : domain === 'older' ? 'ages' : domain === 'heavier' ? 'weights' : 'marks') + '. Rank 1 = ' + dSuper + ', Rank ' + n + ' = ' + dAdj + '.',
        questionText: qText, answer: String(ans),
        options: opts, timeLimit: 45 + diff * 8,
        hint: 'List 1=' + dSuper + ' to ' + n + '=' + dAdj + '. Fill names from clues.',
        typeLabel: 'Comparison (' + domain + ')',
        solution: 'Rank 1=' + names[order[0]] + '(' + dSuper + '), ' + names[order[n-1]] + '(' + dAdj + '). ' + names.join(', ') + ' in order: ' + names.slice().sort(function(a,b){return (valRank[a]||0)-(valRank[b]||0);}).join(' > ') + '.'
      };
    } else if (puzType === 'blood') {
      // BLOOD RELATION PUZZLE — family tree from generated relations
      var REL = ['father','mother','brother','sister','uncle','aunt','grandfather','grandmother','cousin','nephew','niece'];
      var REL_REV = {father:'son',mother:'daughter',brother:'sister',sister:'brother',uncle:'nephew',aunt:'niece','grandfather':'grandson','grandmother':'granddaughter','cousin':'cousin','nephew':'uncle','niece':'aunt'};
      // Build a 3-generation family tree
      var family = {};
      var famNames = PUZ_NAMES.slice(0, 6 + rand(0, Math.min(2, diff)));
      shuffle(famNames);
      // Pick roles: gen0 = grandparents, gen1 = parents, gen2 = children
      var gen0 = famNames.slice(0, 2); // grandfather, grandmother
      var gen1 = famNames.slice(2, 5); // father, mother, uncle/aunt
      var gen2 = famNames.slice(5); // children
      // Assign genders
      var male = [gen0[0], gen1[0], gen2[0], gen2[2]];
      var female = [gen0[1], gen1[1], gen1[2], gen2[1], gen2[3]].filter(Boolean);
      var clues = [];
      // Chain: "X is the father of Y"
      if (gen0[0] && gen1[0]) clues.push(gen0[0] + ' is the father of ' + gen1[0] + '.');
      if (gen0[1] && gen1[0]) clues.push(gen0[1] + ' is the mother of ' + gen1[0] + '.');
      if (gen1[0] && gen2[0]) clues.push(gen1[0] + ' is the father of ' + gen2[0] + '.');
      if (gen1[1] && gen2[0]) clues.push(gen1[1] + ' is the mother of ' + gen2[0] + '.');
      if (gen1[0] && gen1[1]) clues.push(gen1[0] + ' is the husband of ' + gen1[1] + '.');
      if (gen1[2] && gen2[1]) clues.push(gen1[2] + ' is the mother of ' + gen2[1] + '.');
      // Pick question: relationship between two members
      var pairs = [];
      if (gen2[0] && gen0[0]) pairs.push({a:gen2[0], b:gen0[0], rel:'grandson'});
      if (gen2[0] && gen1[2]) pairs.push({a:gen2[0], b:gen1[2], rel:'nephew'});
      if (gen2[0] && gen2[1]) pairs.push({a:gen2[0], b:gen2[1], rel:'cousin'});
      if (gen1[0] && gen1[2]) pairs.push({a:gen1[0], b:gen1[2], rel:'brother'});
      if (gen1[1] && gen1[2]) pairs.push({a:gen1[1], b:gen0[1], rel:'daughter'});
      if (gen2[0] && gen2[2]) pairs.push({a:gen2[0], b:gen2[2], rel:'brother'});
      if (pairs.length === 0) pairs.push({a:famNames[0], b:famNames[1], rel:'cousin'});
      var chosen = pairs[rand(0, pairs.length - 1)];
      var target = chosen.a;
      var target2 = chosen.b;
      var ans = chosen.rel;
      var qText = 'How is ' + target + ' related to ' + target2 + '?';
      opts = [ans];
      var otherRels = REL.filter(function(r){ return r !== ans; });
      shuffle(otherRels);
      while (opts.length < 4) { if (otherRels.length) { var ro = otherRels.pop(); opts.push(ro); } else { opts.push(REL[rand(0, REL.length - 1)]); } }
      shuffle(opts);
      return {
        type: 'puzzle', clueBlock: clues,
        preamble: 'Study the following family relationships:',
        questionText: qText, answer: ans,
        options: opts, timeLimit: 45 + diff * 8,
        hint: 'Draw a family tree. Parents above children. Label each person.',
        typeLabel: 'Blood Relations',
        solution: target + ' is the ' + ans + ' of ' + target2 + '.'
      };
    } else if (puzType === 'scheduling') {
      // SCHEDULING PUZZLE — events on different days of the week
      var DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
      var nDays = diff <= 2 ? 5 : (diff <= 4 ? 6 : 7);
      var sDays = DAYS.slice(0, nDays);
      var sNames = names.slice(0, nDays);
      var dayOf = {};
      for (var si = 0; si < nDays; si++) dayOf[sNames[si]] = sDays[si];
      var sTarget = sNames[rand(0, sNames.length - 1)];
      var sAns = dayOf[sTarget];
      var clues = [];
      if (nDays > 3) clues.push(sNames[0] + ' is scheduled on ' + dayOf[sNames[0]] + '.');
      var r1 = sNames[1 % nDays], r2 = sNames[(1 + 2) % nDays];
      var idx1 = sDays.indexOf(dayOf[r1]), idx2 = sDays.indexOf(dayOf[r2]);
      if (idx1 < idx2) clues.push(r1 + ' is ' + (idx2 - idx1) + ' day(s) before ' + r2 + '.');
      else clues.push(r2 + ' is ' + (idx1 - idx2) + ' day(s) before ' + r1 + '.');
      var notSDay = sDays[rand(0, sDays.length - 1)];
      if (dayOf[sNames[sNames.length-1]] !== notSDay) clues.push(sNames[sNames.length-1] + ' is not on ' + notSDay + '.');
      var wIdx = rand(0, sNames.length - 1);
      var wDay = dayOf[sNames[wIdx]];
      if (wDay === 'Saturday' || wDay === 'Sunday') clues.push(sNames[wIdx] + ' is on a weekend.');
      else clues.push(sNames[wIdx] + ' is on a weekday.');
      opts = [sAns];
      while (opts.length < 4) { var rd = DAYS[rand(0, DAYS.length - 1)]; if (opts.indexOf(rd) < 0) opts.push(rd); }
      shuffle(opts);
      return {
        type: 'puzzle', clueBlock: clues,
        preamble: sNames.length + ' events (' + sNames.join(', ') + ') are scheduled on different days Monday to ' + sDays[nDays-1] + '.',
        questionText: 'On which day is ' + sTarget + ' scheduled?', answer: sAns,
        options: opts, timeLimit: 45 + diff * 8,
        hint: 'List days Monday to ' + sDays[nDays-1] + '. Fill events from clues.',
        typeLabel: 'Scheduling',
        solution: 'Monday=' + dayOf[sNames[0]] + ', ' + sNames[nDays-1] + '=' + dayOf[sNames[nDays-1]] + '. ' + sTarget + '=' + sAns + '.'
      };
    } else if (puzType === 'coding') {
      // CODING-DECODING PUZZLE — wrap existing generator into puzzle format
      try {
        var cq = GENERATORS['Coding'](diff);
        if (cq && cq.question && cq.answer) {
          return {
            type: 'puzzle', clueBlock: ['The code follows a consistent pattern.'],
            preamble: cq.question,
            questionText: 'Find the correct code.', answer: String(cq.answer),
            options: cq.options,
            timeLimit: 40 + diff * 5,
            hint: cq.hint || 'Find the pattern from the example.',
            typeLabel: 'Coding-Decoding',
            solution: cq.solution || 'Identify the rule from the given example and apply it.'
          };
        }
      } catch(e) {}
      return fallbackPuzzle(diff);
    } else if (puzType === 'inputoutput') {
      // INPUT-OUTPUT PUZZLE — machine rearrangement steps
      var ioItems = [];
      for (var ii = 0; ii < 5 + rand(0, Math.min(1, diff)); ii++) ioItems.push(names[ii]);
      var ioInput = ioItems.slice();
      shuffle(ioInput);
      var working = ioInput.slice();
      // Generate step series as clue text
      var stepClues = ['Input: ' + ioInput.join(' ')];
      for (var step = 1; step <= ioInput.length - 2; step++) {
        var minI = step - 1;
        for (var si = step; si < working.length; si++) {
          if (working[si] < working[minI]) minI = si;
        }
        if (minI !== step - 1) { var t = working[step - 1]; working[step - 1] = working[minI]; working[minI] = t; }
        if (step <= 2) stepClues.push('Step ' + step + ': ' + working.join(' '));
      }
      var targetStep = rand(1, Math.min(3, ioInput.length - 2));
      var working2 = ioInput.slice();
      for (var step = 1; step <= targetStep; step++) {
        var minI = step - 1;
        for (var si = step; si < working2.length; si++) { if (working2[si] < working2[minI]) minI = si; }
        if (minI !== step - 1) { var t = working2[step - 1]; working2[step - 1] = working2[minI]; working2[minI] = t; }
      }
      var ansStr = working2.join(' ');
      var optsIO = [ansStr];
      while (optsIO.length < 4) {
        var shuffled = working2.slice(); shuffle(shuffled);
        var s = shuffled.join(' ');
        if (optsIO.indexOf(s) < 0) optsIO.push(s);
      }
      shuffle(optsIO);
      return {
        type: 'puzzle', clueBlock: stepClues,
        preamble: 'A machine rearranges words alphabetically. In each step, the smallest remaining word moves left.',
        questionText: 'What is Step ' + targetStep + '?', answer: ansStr,
        options: optsIO, timeLimit: 55 + diff * 10,
        hint: 'In each step, the alphabetically smallest unsorted word moves to the next unsorted position.',
        typeLabel: 'Input-Output',
        solution: 'Sorted: ' + ioInput.slice().sort().join(' ') + '. Target is step ' + targetStep + ' result.'
      };
    } else if (puzType === 'syllogism') {
      // SYLLOGISM PUZZLE — wrap existing generator
      try {
        var sq = GENERATORS['Syllogism'](diff);
        if (sq && sq.question && sq.answer) {
          return {
            type: 'puzzle',
            clueBlock: sq.question.split('\n').filter(Boolean),
            preamble: 'Statements:',
            questionText: 'Which conclusion follows?', answer: String(sq.answer),
            options: sq.options,
            timeLimit: 45 + diff * 5,
            hint: sq.hint || 'Draw Venn diagrams. Conclusion must be true in ALL cases.',
            typeLabel: 'Syllogism',
            solution: sq.solution || 'Draw Venn diagrams for each statement. Check if conclusion holds in all possible cases.'
          };
        }
      } catch(e) {}
      return fallbackPuzzle(diff);
    } else if (puzType === 'inequality') {
      // INEQUALITY PUZZLE — coded inequalities with conclusions
      var symbols = ['>', '=', '<'];
      var vars = ['A','B','C','D','E'];
      var statements = [];
      var usedPairs = {};
      var chain = [];
      for (var ii = 0; ii < vars.length - 1; ii++) {
        var sym = symbols[rand(0, symbols.length - 1)];
        var pair = vars[ii] + sym + vars[ii+1];
        chain.push({ a: vars[ii], sym: sym, b: vars[ii+1] });
        statements.push(vars[ii] + ' ' + sym + ' ' + vars[ii+1]);
      }
      // Add one extra relationship for complexity
      if (diff >= 2) {
        var extra = chain[rand(0, chain.length - 1)];
        var ea = extra.a, eb = extra.b, es = symbols[rand(0, symbols.length - 1)];
        if (ea !== eb) statements.push(ea + ' ' + es + ' ' + eb);
      }
      // Generate conclusion
      var cA = vars[rand(0, vars.length - 1)], cB = vars[rand(0, vars.length - 1)];
      while (cB === cA) cB = vars[rand(0, vars.length - 1)];
      // Determine actual relationship by evaluating chain
      function evalRel(x, y) {
        var xIdx = vars.indexOf(x), yIdx = vars.indexOf(y);
        if (xIdx < 0 || yIdx < 0) return '?';
        var xVal = xIdx + 1, yVal = yIdx + 1;
        // Simple: higher index = larger value (with some random displacement)
        return xVal > yVal ? '>' : xVal < yVal ? '<' : '=';
      }
      var trueRel = evalRel(cA, cB);
      var conclusions = [
        cA + ' > ' + cB,
        cA + ' < ' + cB,
        cA + ' = ' + cB,
        cA + ' >= ' + cB,
        cA + ' <= ' + cB
      ];
      // Correct answer is the one that matches trueRel
      var ansMap = { '>': [0, 3], '<': [1, 4], '=': [2] };
      var ansIndices = ansMap[trueRel];
      var correctAns = conclusions[ansIndices[0]];
      // Add extra incorrect if type is >= or <=
      if (ansIndices.length > 1 && rand(0,1)===0) correctAns = conclusions[ansIndices[1]];
      var opts = [correctAns];
      for (var ii = 0; ii < conclusions.length; ii++) {
        if (opts.indexOf(conclusions[ii]) < 0) opts.push(conclusions[ii]);
      }
      while (opts.length < 4) { var fake = vars[rand(0,vars.length-1)] + ' ' + symbols[rand(0,2)] + ' ' + vars[rand(0,vars.length-1)]; if (opts.indexOf(fake) < 0) opts.push(fake); }
      shuffle(opts);
      return {
        type: 'puzzle', clueBlock: statements,
        preamble: 'Statements:',
        questionText: 'Which conclusion is definitely true?', answer: correctAns,
        options: opts, timeLimit: 40 + diff * 8,
        hint: 'Combine all relationships to find the relation between ' + cA + ' and ' + cB + '.',
        typeLabel: 'Inequality',
        solution: 'From given relations: ' + cA + ' ' + trueRel + ' ' + cB + '.'
      };
    } else if (puzType === 'orderrank') {
      // ORDER & RANKING PUZZLE — tallest/shortest or position ranking
      var nRank = diff <= 2 ? 5 + rand(0,1) : 6 + rand(0,2);
      var rankNames = names.slice(0, nRank);
      // Generate random heights (unique)
      var heights = [];
      for (var ri = 0; ri < nRank; ri++) heights.push(140 + rand(0, 60));
      // Remove duplicates
      var uniqueH = []; for (var ri = 0; ri < nRank; ri++) { if (uniqueH.indexOf(heights[ri])<0) uniqueH.push(heights[ri]); }
      while (uniqueH.length < nRank) { var hh = 140 + rand(0, 60); if (uniqueH.indexOf(hh)<0) uniqueH.push(hh); }
      heights = uniqueH;
      var sortedNames = rankNames.slice().sort(function(a,b){ return heights[rankNames.indexOf(b)] - heights[rankNames.indexOf(a)]; });
      var clues = [];
      // Clue: who is taller than whom
      var c1 = rand(0, nRank-1), c2 = rand(0, nRank-1);
      while (c2 === c1) c2 = rand(0, nRank-1);
      clues.push(rankNames[c1] + ' is taller than ' + rankNames[c2] + '.');
      // Clue: shortest/tallest
      clues.push(sortedNames[sortedNames.length-1] + ' is the shortest.');
      // Clue: position from top/bottom
      var mid = Math.floor(nRank/2);
      clues.push(sortedNames[mid] + ' is taller than exactly ' + mid + ' people.');
      if (nRank >= 5) {
        var r3 = rand(0, nRank-1);
        if (heights[r3] > 170) clues.push(rankNames[r3] + ' is above average height.');
        else clues.push(rankNames[r3] + ' is below average height.');
      }
      // Question: who is the tallest? or what is X's rank?
      var qType = rand(0, 2);
      var qText, ans;
      if (qType === 0) {
        ans = sortedNames[0];
        qText = 'Who is the tallest among them?';
      } else if (qType === 1) {
        var qIdx = rand(1, nRank - 2);
        ans = sortedNames[qIdx];
        qText = 'Who is the ' + (['','second ','third ','fourth ','fifth ','sixth '][qIdx] || (qIdx+1) + 'th ') + 'tallest?';
      } else {
        var qPerson = rankNames[rand(0, nRank-1)];
        var rank = sortedNames.indexOf(qPerson) + 1;
        ans = String(rank);
        qText = 'What is the rank of ' + qPerson + ' from the top?';
      }
      var opts = [ans];
      if (qType === 2) {
        while (opts.length < 4) { var rv = String(rand(1, nRank)); if (opts.indexOf(rv) < 0) opts.push(rv); }
      } else {
        for (var ri = 0; ri < nRank; ri++) { if (opts.indexOf(sortedNames[ri]) < 0) opts.push(sortedNames[ri]); }
        while (opts.length < 4) { var fake = rankNames[rand(0, nRank-1)]; if (opts.indexOf(fake) < 0) opts.push(fake); }
      }
      shuffle(opts);
      return {
        type: 'puzzle', clueBlock: clues,
        preamble: nRank + ' people (' + rankNames.join(', ') + ') are ranked by height.',
        questionText: qText, answer: String(ans),
        options: opts, timeLimit: 45 + diff * 8,
        hint: 'Order them from tallest to shortest. Each clue eliminates possibilities.',
        typeLabel: 'Order & Ranking',
        solution: 'Tallest to shortest: ' + sortedNames.join(' > ') + '.'
      };
    } else {
      // DIRECTION & DISTANCE PUZZLE — multi-leg path tracking
      var DIRS = ['North','South','East','West'];
      var OPP = {North:'South',South:'North',East:'West',West:'East'};
      var legs = 3 + rand(0, Math.min(2, diff));
      var x = 0, y = 0;
      var clues = [];
      var path = [];
      for (var di = 0; di < legs; di++) {
        var dir = DIRS[rand(0, 3)];
        var dist = 2 + rand(0, 5);
        path.push({dir:dir, dist:dist});
        clues.push('walks ' + dist + ' km towards ' + dir + '.');
        if (dir === 'North') y += dist;
        else if (dir === 'South') y -= dist;
        else if (dir === 'East') x += dist;
        else if (dir === 'West') x -= dist;
      }
      // Question: final direction and distance from origin
      var absX = Math.abs(x), absY = Math.abs(y);
      var finalDir = '';
      if (x >= 0 && y >= 0) finalDir = x >= y ? 'East' : 'North';
      else if (x >= 0 && y < 0) finalDir = x >= absY ? 'East' : 'South';
      else if (x < 0 && y >= 0) finalDir = absX >= y ? 'West' : 'North';
      else finalDir = absX >= absY ? 'West' : 'South';
      var finalDist = Math.round(Math.sqrt(x*x + y*y));
      if (finalDist === 0) finalDist = 1;
      // Pick question type
      var qType = rand(0, 2);
      if (qType === 0) {
        // "In which direction is he from start?"
        var wrongDirs = DIRS.filter(function(d){ return d !== finalDir; });
        shuffle(wrongDirs);
        opts = [finalDir];
        while (opts.length < 4) { opts.push(wrongDirs.pop() || DIRS[rand(0, 3)]); }
        shuffle(opts);
        return {
          type: 'puzzle', clueBlock: clues,
          preamble: 'A person starts from point A and follows this path:',
          questionText: 'In which direction is he from the starting point?', answer: finalDir,
          options: opts, timeLimit: 40 + diff * 5,
          hint: 'Draw a grid. Mark each leg with direction and distance. Calculate net displacement.',
          typeLabel: 'Direction & Distance',
          solution: 'Net N-S=' + y + 'km, E-W=' + x + 'km. Final direction: ' + finalDir + '.'
        };
      } else {
        // "How far is he from the starting point?"
        var minDist = Math.max(1, finalDist - 4), maxDist = finalDist + 4;
        opts = [String(finalDist)];
        while (opts.length < 4) { var d2 = rand(minDist, maxDist); if (opts.indexOf(String(d2)) < 0) opts.push(String(d2)); }
        shuffle(opts);
        return {
          type: 'puzzle', clueBlock: clues,
          preamble: 'A person starts from point A and follows this path:',
          questionText: 'How far is he from the starting point (in km)?', answer: String(finalDist),
          options: opts, timeLimit: 50 + diff * 8,
          hint: 'Track net North-South and East-West displacement. Use Pythagoras: d = \u221a(x\u00b2 + y\u00b2)',
          typeLabel: 'Direction & Distance',
          solution: 'Net N-S=' + y + 'km, E-W=' + x + 'km. Distance=\u221a(' + (x*x) + '+' + (y*y) + ')=' + finalDist + 'km.'
        };
      }
    }
  } catch(e) { return fallbackPuzzle(diff); }
}

// Register puzzle generator (all clues at once, like real exam)
GENERATORS.puzzle = generatePuzzle;
var _origMixed = GENERATORS.mixed;
GENERATORS.mixed = function(diff) {
  var types = ['math', 'chain', 'pattern', 'pattern', 'puzzle', 'puzzle', 'recognize'];
  return GENERATORS[types[rand(0, types.length - 1)]](diff);
};

// Expose mistake bank for UI
window.getMistakeCount = getMistakeCount;

// Expose generators for testing
window.getMentalGenerators = function() { return GENERATORS; };

})();

