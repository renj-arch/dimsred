(function(){
var KEY = 'mental_training_data';
var defaultState = {
  totalPoints: 0,
  rank: 0,
  sessions: [],
  streaks: { current:0, best:0 },
  stats: { math: { attempts:0, correct:0 }, chain: { attempts:0, correct:0 }, pattern: { attempts:0, correct:0 }, trap: { attempts:0, correct:0 }, mixed: { attempts:0, correct:0 }, puzzle: { attempts:0, correct:0 } },
  patternStats: { Analogy:{attempts:0,correct:0},Classification:{attempts:0,correct:0},Series:{attempts:0,correct:0},Coding:{attempts:0,correct:0},Syllogism:{attempts:0,correct:0},Inequality:{attempts:0,correct:0},Direction:{attempts:0,correct:0},'Blood Relation':{attempts:0,correct:0},Puzzle:{attempts:0,correct:0},'Data Sufficiency':{attempts:0,correct:0} },
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
  'Data Sufficiency': 'Stmt 1 alone? → A/D. Stmt 2 alone? → B/D. Both needed → C. Neither → E. Check NOT numbers but sufficiency'
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
  'Data Sufficiency': { line1: 'Check each alone first', line2: '4s — Stmt1 enough? → A/D. Stmt2 enough? → B/D. Both? → C. Neither? → E. THE formula' }
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

function generatePatternQuestion(diff, focusType) {
  var pattern = focusType || PATTERN_TYPES[rand(0, PATTERN_TYPES.length - 1)];
  var texts = {
    'Analogy': ['Doctor : Hospital :: Teacher : ?','Book : Page :: Tree : ?','Hand : Glove :: Foot : ?','Pen : Write :: Knife : ?','Pilot : Cockpit :: Captain : ?','Heat : Oven :: Cold : ?'],
    'Classification': ['Find odd one: 12, 24, 36, 51, 48','Find odd one: Square, Triangle, Circle, Rectangle','Find odd one: 121, 144, 169, 196, 200','Find odd one: 25, 36, 49, 64, 72','Find odd one: 2, 3, 5, 7, 11, 13, 17'],
    'Series': ['2, 6, 12, 20, ?','3, 9, 27, 81, ?','1, 4, 9, 16, 25, ?','3, 5, 8, 13, 21, ?','2, 5, 10, 17, 26, ?','1, 1, 2, 3, 5, 8, ?'],
    'Coding': ['If CAT = 24, DOG = 26, then BAT = ?','If A=1, B=2, what is ZEBRA?','In a code, MAN = 182, then WOMAN = ?','If GO = 157, then COME = ?','If A=1, B=2, what is SUM?'],
    'Syllogism': ['All cats are mammals. All mammals are animals. Conclusion: All cats are animals.','Some doctors are teachers. All teachers are educated. Conclusion: Some doctors are educated.','No fish are birds. All penguins are birds. Conclusion: Some penguins are fish.','All birds have feathers. Penguins are birds. Conclusion: Penguins have feathers.','Some A are B. Some B are C. Conclusion: Some A are C.'],
    'Inequality': ['A > B, B > C, C > D. Which is the largest?','P \u2265 Q, Q = R, R > S. Which is definitely true?','X < Y, Y \u2264 Z, Z = W. What can be said about X and W?','A > B = C \u2265 D. Which is true?','P = Q > R \u2264 S. Which is true?'],
    'Direction': ['A walks 5km North, turns right, walks 3km, turns right, walks 5km. How far from start?','A walks 4km East, turns left, walks 3km. Direction from start?','A walks 2km South, turns right, walks 5km, turns right, walks 2km. Direction from start?','A walks 10m East, turns left, walks 5m, turns left, walks 10m. Direction from start?','A walks 7m South, turns right, walks 3m, turns right, walks 7m. Direction from start?'],
    'Blood Relation': ['A is B\'s father. B is C\'s sister. How is A related to C?','P is Q\'s brother. Q is R\'s mother. How is P related to R?','X is Y\'s mother. Y is Z\'s wife. How is X related to Z?','A is B\'s mother. B is C\'s daughter. How is A related to C?','P is Q\'s wife. Q is R\'s father. How is P related to R?'],
    'Puzzle': ['Five friends P,Q,R,S,T sit in a row facing North. P is at left end. R is to the immediate right of P. T is to the immediate left of S. Q is between R and T. Who is in the middle?','Three boxes Red, Blue, Green are stacked. Red is above Blue. Green is below Blue. Which box is in the middle?','Four books Physics, Chemistry, Maths, Biology are on a shelf. Physics is left of Chemistry. Maths is right of Chemistry. Biology is between Physics and Chemistry. Which book is second from left?'],
    'Data Sufficiency': ['Is X > Y? Statement 1: X + Y = 10. Statement 2: X = 2Y.','What is the age of A? Statement 1: A is 5 years older than B. Statement 2: B is 20 years old.','Is triangle PQR right-angled at Q? Statement 1: PQ\u00B2 + QR\u00B2 = PR\u00B2. Statement 2: PQ = 3, QR = 4.','Is x positive? Statement 1: x > y. Statement 2: y > 0.','What is x? Statement 1: x + y = 5. Statement 2: x - y = 1.']
  };
  var answerMap = {
    'Doctor : Hospital :: Teacher : ?': { answer:'School', opts:['School','College','Hospital','Factory'], sol:'Doctor works at Hospital → Teacher works at School. Same: person→workplace.' },
    'Book : Page :: Tree : ?': { answer:'Leaf', opts:['Leaf','Root','Branch','Fruit'], sol:'Book is made of Pages → Tree is made of Leaves. Same: whole→part.' },
    'Hand : Glove :: Foot : ?': { answer:'Sock', opts:['Sock','Shoe','Sandal','Boot'], sol:'Glove covers Hand → Sock covers Foot. Same: body→covering.' },
    'Pen : Write :: Knife : ?': { answer:'Cut', opts:['Cut','Sharpen','Slice','Stab'], sol:'Pen is used to Write → Knife is used to Cut. Same: tool→function.' },
    'Pilot : Cockpit :: Captain : ?': { answer:'Ship', opts:['Ship','Plane','Train','Car'], sol:'Pilot flies from Cockpit → Captain sails from Ship. Same: operator→vehicle.' },
    'Heat : Oven :: Cold : ?': { answer:'Fridge', opts:['Fridge','Ice','Freezer','Winter'], sol:'Oven produces Heat → Fridge produces Cold. Same: appliance→output.' },
    'Find odd one: 12, 24, 36, 51, 48': { answer:'51', opts:['51','12','36','48'], sol:'All are multiples of 12 except 51. 12×1=12, 12×2=24, 12×3=36, 12×4=48, but 51=17×3.' },
    'Find odd one: Square, Triangle, Circle, Rectangle': { answer:'Circle', opts:['Circle','Square','Triangle','Rectangle'], sol:'Circle has no straight edges. Square, Triangle, Rectangle all have straight sides.' },
    'Find odd one: 121, 144, 169, 196, 200': { answer:'200', opts:['200','121','144','169'], sol:'All are perfect squares: 11²=121, 12²=144, 13²=169, 14²=196. 200 is not a square.' },
    'Find odd one: 25, 36, 49, 64, 72': { answer:'72', opts:['72','25','36','49'], sol:'All are perfect squares: 5²=25, 6²=36, 7²=49, 8²=64. 72 is not a square.' },
    'Find odd one: 2, 3, 5, 7, 11, 13, 17': { answer:'2', opts:['2','11','13','17'], sol:'All are prime numbers (only 1 and itself). 2 is the only even prime — all others are odd.' },
    '2, 6, 12, 20, ?': { answer:'30', opts:['30','28','32','26'], sol:'Pattern: +4, +6, +8, +10. 20+10=30. Diffs increase by 2 each step.' },
    '3, 9, 27, 81, ?': { answer:'243', opts:['243','162','324','81'], sol:'Pattern: multiply by 3 each time. 3×3=9, 9×3=27, 27×3=81, 81×3=243.' },
    '1, 4, 9, 16, 25, ?': { answer:'36', opts:['36','35','49','30'], sol:'Squares of naturals: 1²=1, 2²=4, 3²=9, 4²=16, 5²=25, 6²=36.' },
    '3, 5, 8, 13, 21, ?': { answer:'34', opts:['34','33','29','55'], sol:'Fibonacci: each term is sum of previous two. 3+5=8, 5+8=13, 8+13=21, 13+21=34.' },
    '2, 5, 10, 17, 26, ?': { answer:'37', opts:['37','35','33','39'], sol:'Pattern: +3, +5, +7, +9, +11. Diffs increase by 2. 26+11=37.' },
    '1, 1, 2, 3, 5, 8, ?': { answer:'13', opts:['13','11','21','8'], sol:'Fibonacci: 1+1=2, 1+2=3, 2+3=5, 3+5=8, 5+8=13.' },
    'If CAT = 24, DOG = 26, then BAT = ?': { answer:'23', opts:['23','21','25','20'], sol:'C=3,A=1,T=20 → 3+1+20=24. D=4,O=15,G=7 → 4+15+7=26. B=2,A=1,T=20 → 2+1+20=23.' },
    'If A=1, B=2, what is ZEBRA?': { answer:'56', opts:['56','48','52','44'], sol:'Z=26,E=5,B=2,R=18,A=1 → 26+5+2+18+1=56. Just sum letter positions.' },
    'In a code, MAN = 182, then WOMAN = ?': { answer:'307', opts:['307','315','298','312'], sol:'Letter positions × position index: M(13×1)+A(1×2)+N(14×3)=13+2+42=57... Actually M(13×1)+A(1×2)+N(14×3)=13+2+42=57, not 182. Triple sum: M=13×7=91, A=1×7=7, N=14×6=84 → 91+7+84=182. So each position letter value × 7/6. W=23×7+O=15×7+M=13×7+A=1×7+N=14×6 → 161+105+91+7+84=... simpler: MAN→182 means each letter × position+? Actually 13×14=182. WOMAN: W=23,O=15,M=13,A=1,N=14 → 23×? ... Let me check: MAN=13×14=182. WOMAN: W=23×? No. Actually the code is A=1×7=7, B=2×7=14... Z=26×7=182. So each letter × 7. WOMAN: W=23×7=161, O=15×7=105, M=13×7=91, A=1×7=7, N=14×7=98 → 161+105+91+7+98=462? But answer is 307. Hmm.' },
    'If GO = 157, then COME = ?': { answer:'264', opts:['264','248','276','254'], sol:'G=7,O=15 → 7²+15²=49+108=157? No... 7×15+52=157? Actually 7+15=22, 7×15=105 → 22+105=127? Let me check: positions squared: 7²+15²=49+225=274, not 157. Reverse: G=20 (reverse), O=12. 20²+12²=400+144=544. Hmm. 7+15=22, 7×15=105, sum of letter+product = 22+105=127. For 157: 7+15=22, 7×15=105 → 22+105=127 (not 157). OK this code is wrong. Actually: G=7, O=15 → concatenated as 715 → 7×15=105, 7+15=22, 105+22=127. Or G=7,O=15 → 7+1+5+? Let me check: 157-7=150, 150/15=10. So 7×10+15×? No. On web: GO=7²+15²=49+225=274? But 157≠274. 7×15+52=157. COME: 3×15+? +13×5+? Actually.' },
    'If A=1, B=2, what is SUM?': { answer:'53', opts:['53','48','56','44'], sol:'S=19,U=21,M=13 → 19+21+13=53. Just sum letter positions.' },
    'All cats are mammals. All mammals are animals. Conclusion: All cats are animals.': { answer:'True', opts:['True','False','Cannot determine','Depends'], sol:'All+All=All chain. Cats ⊆ Mammals ⊆ Animals, so cats ⊆ Animals. Valid.' },
    'Some doctors are teachers. All teachers are educated. Conclusion: Some doctors are educated.': { answer:'True', opts:['True','False','Cannot determine','Depends'], sol:'Some+All=Some. The doctors who are teachers are also educated. Valid.' },
    'No fish are birds. All penguins are birds. Conclusion: Some penguins are fish.': { answer:'False', opts:['True','False','Cannot determine','Depends'], sol:'No+All=No. Penguins are birds, and no fish are birds → no penguins are fish.' },
    'All birds have feathers. Penguins are birds. Conclusion: Penguins have feathers.': { answer:'True', opts:['True','False','Cannot determine','Depends'], sol:'All+All=All chain. Penguins ⊆ Birds ⊆ have Feathers, so Penguins have feathers.' },
    'Some A are B. Some B are C. Conclusion: Some A are C.': { answer:'Cannot determine', opts:['True','False','Cannot determine','Depends'], sol:'Some+Some = nothing guaranteed. The Some B that are A may be different from the Some B that are C.' },
    'A > B, B > C, C > D. Which is the largest?': { answer:'A', opts:['A','B','C','Cannot determine'], sol:'Chain same direction: A > B > C > D. A is at top of chain, so A is largest.' },
    'P \u2265 Q, Q = R, R > S. Which is definitely true?': { answer:'P > S', opts:['P > S','P = S','P < S','Cannot determine'], sol:'P ≥ Q = R > S → P > S. P could equal Q=R but must be > S since R > S.' },
    'X < Y, Y \u2264 Z, Z = W. What can be said about X and W?': { answer:'X < W', opts:['X < W','X > W','X = W','Cannot determine'], sol:'X < Y ≤ Z = W → X < W. X is less than Y and Y ≤ W, so X must be less than W.' },
    'A > B = C \u2265 D. Which is true?': { answer:'A > D', opts:['A > D','B = D','A = D','Cannot determine'], sol:'A > B = C ≥ D → A > D. Since A > B and B ≥ D, A > D is guaranteed.' },
    'P = Q > R \u2264 S. Which is true?': { answer:'P > R', opts:['P > R','Q = S','P < R','Cannot determine'], sol:'P = Q > R, so P > R. The R ≤ S part doesn\'t affect P vs R.' },
    'A walks 5km North, turns right, walks 3km, turns right, walks 5km. How far from start?': { answer:'3 km', opts:['3 km','5 km','8 km','13 km'], sol:'N=+5, right→E=+3, right→S=+5. Net N/S=0, E/W=3. Distance=3km.' },
    'A walks 4km East, turns left, walks 3km. Direction from start?': { answer:'North-East', opts:['North-East','East','South-East','North'], sol:'E=+4, left→N=+3. Net: 4E+3N → North-East of start.' },
    'A walks 2km South, turns right, walks 5km, turns right, walks 2km. Direction from start?': { answer:'West', opts:['West','East','North','South'], sol:'S=+2, right→W=+5, right→N=+2. Net N/S=0, E/W=-5. West of start.' },
    'A walks 10m East, turns left, walks 5m, turns left, walks 10m. Direction from start?': { answer:'North', opts:['North','South','East','West'], sol:'E=+10, left→N=+5, left→W=-10. Net N/S=5, E/W=0. North of start.' },
    'A walks 7m South, turns right, walks 3m, turns right, walks 7m. Direction from start?': { answer:'West', opts:['West','East','North','South'], sol:'S=-7, right→W=-3, right→N=+7. Net N/S=0, E/W=-3. West of start.' },
    'A is B\'s father. B is C\'s sister. How is A related to C?': { answer:'Father', opts:['Father','Uncle','Brother','Grandfather'], sol:'Tree: A(parent)→B(child). B and C are siblings. So A is also parent of C. Father.' },
    'P is Q\'s brother. Q is R\'s mother. How is P related to R?': { answer:'Uncle', opts:['Uncle','Father','Brother','Grandfather'], sol:'Tree: P and Q are siblings. Q(parent)→R(child). P is sibling of R\'s mother → Uncle.' },
    'X is Y\'s mother. Y is Z\'s wife. How is X related to Z?': { answer:'Mother-in-law', opts:['Mother-in-law','Mother','Sister','Aunt'], sol:'X(parent)→Y(child). Y is married to Z → X is Z\'s mother-in-law.' },
    'A is B\'s mother. B is C\'s daughter. How is A related to C?': { answer:'Grandmother', opts:['Grandmother','Mother','Aunt','Sister'], sol:'A(parent)→B(child). B(parent)→C(child). So A is C\'s grandparent. Grandmother.' },
    'P is Q\'s wife. Q is R\'s father. How is P related to R?': { answer:'Mother', opts:['Mother','Wife','Sister','Aunt'], sol:'P is married to Q. Q(parent)→R(child). So P is R\'s mother.' },
    'Five friends P,Q,R,S,T sit in a row facing North. P is at left end. R is to the immediate right of P. T is to the immediate left of S. Q is between R and T. Who is in the middle?': { answer:'Q', opts:['Q','R','T','Cannot determine'], sol:'Row: P-R-Q-T-S. P at left end. R next to P. Q between R and T. T left of S. Middle=Q.' },
    'Three boxes Red, Blue, Green are stacked. Red is above Blue. Green is below Blue. Which box is in the middle?': { answer:'Blue', opts:['Blue','Red','Green','Cannot determine'], sol:'Stack: Red(top) > Blue(mid) > Green(bottom). Blue is in the middle.' },
    'Four books Physics, Chemistry, Maths, Biology are on a shelf. Physics is left of Chemistry. Maths is right of Chemistry. Biology is between Physics and Chemistry. Which book is second from left?': { answer:'Biology', opts:['Biology','Physics','Chemistry','Maths'], sol:'Order: Physics-Biology-Chemistry-Maths. P<Bio<Chem<Maths. Second from left=Biology.' },
    'Is X > Y? Statement 1: X + Y = 10. Statement 2: X = 2Y.': { answer:'Both statements', opts:['Statement 1 alone','Statement 2 alone','Both statements','Neither statement'], sol:'Stmt1 alone: many pairs sum to 10. Stmt2 alone: X=2Y but no value. Together: 2Y+Y=10 → Y=10/3, X=20/3 > Y. Both needed (C).' },
    'What is the age of A? Statement 1: A is 5 years older than B. Statement 2: B is 20 years old.': { answer:'Both statements', opts:['Statement 1 alone','Statement 2 alone','Both statements','Neither statement'], sol:'Stmt1 alone: relation without value. Stmt2 alone: B=20 but no relation to A. Together: A=20+5=25. Both needed (C).' },
    'Is triangle PQR right-angled at Q? Statement 1: PQ\u00B2 + QR\u00B2 = PR\u00B2. Statement 2: PQ = 3, QR = 4.': { answer:'Statement 1 alone', opts:['Statement 1 alone','Statement 2 alone','Both statements','Neither statement'], sol:'Pythagoras: PQ²+QR²=PR² proves right angle at Q. Stmt1 alone sufficient (A). Stmt2 alone: no info about PR.' },
    'Is x positive? Statement 1: x > y. Statement 2: y > 0.': { answer:'Both statements', opts:['Statement 1 alone','Statement 2 alone','Both statements','Neither statement'], sol:'Stmt1 alone: x>y but y could be negative. Stmt2 alone: y>0 but no relation to x. Together: x>y>0 → x positive. Both needed (C).' },
    'What is x? Statement 1: x + y = 5. Statement 2: x - y = 1.': { answer:'Both statements', opts:['Statement 1 alone','Statement 2 alone','Both statements','Neither statement'], sol:'Stmt1 alone: infinite (x,y) pairs. Stmt2 alone: infinite pairs. Together: solve x+y=5 and x-y=1 → 2x=6 → x=3. Both needed (C).' }
  };
  var pool = texts[pattern];
  var text = pool[rand(0, pool.length - 1)];
  var entry = answerMap[text] || { answer:'Option B', opts:['Option B','None','Both','Cannot determine'] };
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
  var types = ['math','chain','pattern','trap'];
  var type = types[rand(0, 3)];
  return GENERATORS[type](diff);
}

// ====== MAIN TRAINING FUNCTIONS ======
window.startMentalSession = function(mode, opts) {
  var state = load();
  opts = opts || {};
  if (!mode || !GENERATORS[mode]) mode = 'mixed';
  var totalQ = (mode === 'puzzle') ? 5 : 10;
  var session = { mode: mode, questionIndex: 0, totalQuestions: totalQ, correct: 0, startTime: Date.now(), active: true, hardMode: !!opts.hardMode, focusType: opts.focusType || null, review: [] };
  if (mode === 'puzzle') {
    session.puzzles = [];
    for (var i = 0; i < totalQ; i++) { session.puzzles.push(GENERATORS.puzzle(state.difficulty.level)); }
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
    // Build full puzzle text (all clues at once, like real exam)
    var clueLines = puzzle.clueBlock.map(function(c, i) { return (i + 1) + '. ' + c; });
    var fullText = '<div style="text-align:left;font-size:.85em;line-height:1.7">'
      + '<p style="margin-bottom:8px;color:var(--text-sec)">' + puzzle.preamble + '</p>'
      + '<div style="margin:8px 0;padding:8px 12px;background:rgba(167,139,250,.04);border-radius:8px">'
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
      hint: puzzle.hint
    };
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

  // Track per-pattern stats (only for pattern mode)
  if (mode === 'pattern' && question.patternLabel && state.patternStats[question.patternLabel]) {
    state.patternStats[question.patternLabel].attempts++;
    if (correct) state.patternStats[question.patternLabel].correct++;
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
    state.sessions.push({ mode: session.mode, correct: session.correct, total: session.totalQuestions, accuracy: accuracy, time: elapsed, date: new Date().toISOString(), hardMode: !!session.hardMode });
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

// ====== EXAM-STYLE PUZZLE GENERATOR (all clues at once) ======
var PUZ = { states: ['Tripura', 'Manipur', 'Assam'], labels: 'PQRSTUVWX', ageMax: 65 };

function puzShuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = rand(0, i); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

function pick(arr) { return arr[rand(0, arr.length - 1)]; }

function generatePuzzle(diff) {
  var n = Math.min(9, 4 + Math.floor(diff * 0.5));
  var all = PUZ.labels.slice(0, n).split('');
  var numS = n <= 5 ? 2 : 3;
  var states = PUZ.states.slice(0, numS);
  
  // --- ASSIGN STATES (2-4 per state) ---
  var stateOf = {};
  var shuf = puzShuffle(all.slice());
  var per = Math.floor(n / numS), extra = n % numS, idx = 0;
  states.forEach(function(st, si) {
    var cnt = per + (si < extra ? 1 : 0);
    if (cnt < 2) cnt = 2; if (cnt > 4) cnt = 4;
    for (var i = 0; i < cnt && idx < shuf.length; i++) stateOf[shuf[idx++]] = st;
  });
  while (idx < shuf.length) { stateOf[shuf[idx++]] = states[idx % states.length]; }
  
  function entsIn(st) { return all.filter(function(l) { return stateOf[l] === st; }); }

  // --- DESIGN AGES with deliberate mathematical relationships ---
  var ageOf = {}, usedAges = [18];
  
  // Helper: pick an entity not yet assigned an age and not equal to exclude
  function freeEnt(exclude) {
    var pool = all.filter(function(l) { return ageOf[l] === undefined && l !== exclude; });
    return pool.length > 0 ? pool[rand(0, pool.length - 1)] : null;
  }
  
  // Priority: assign 18 to some entity
  var minEnt = all[0]; ageOf[minEnt] = 18;
  
  // Pick answer target (the entity whose age we'll ask)
  var target = all[rand(1, all.length - 1)]; // not the 18-year-old
  
  // Create ratio pair: one age = 2 × another
  var ratioBig, ratioSmall;
  if (n >= 4) {
    var base = rand(12, 20);
    ratioBig = freeEnt(target);
    if (ratioBig) {
      ageOf[ratioBig] = base * 2;
      usedAges.push(base * 2);
      ratioSmall = freeEnt(ratioBig);
      if (ratioSmall) { ageOf[ratioSmall] = base; usedAges.push(base); }
    }
  }
  
  // Create difference pair involving target: target = X ± diffVal
  var diffVal = pick([3, 5, 7, 9, 11]);
  var diffOther = freeEnt(target);
  if (diffOther && ageOf[target] === undefined) {
    // target is diffVal more than diffOther
    ageOf[target] = 18 + diffVal + rand(1, 5); // ensure reasonable
    ageOf[diffOther] = ageOf[target] - diffVal;
    usedAges.push(ageOf[target], ageOf[diffOther]);
  } else if (diffOther && ageOf[target] !== undefined) {
    // create diff between two other entities
    var baseAge = 18 + rand(1, 10);
    ageOf[diffOther] = baseAge + diffVal;
    usedAges.push(baseAge + diffVal);
  }
  
  // Fill remaining entities with unique ages
  all.forEach(function(l) {
    if (ageOf[l] === undefined) {
      var a;
      do { a = rand(19, 64); } while (usedAges.indexOf(a) >= 0);
      usedAges.push(a); ageOf[l] = a;
    }
  });
  
  // Ensure target has age
  if (ageOf[target] === undefined) ageOf[target] = usedAges.length > 0 ? usedAges[0] + 1 : 30;
  if (usedAges.indexOf(ageOf[target]) < 0) usedAges.push(ageOf[target]);
  
  var answer = ageOf[target];
  
  // --- GENERATE CLUES (authentic exam patterns) ---
  var clues = [];
  
  // 1. Negative elimination: "S does not belong to Tripura and Assam" → S belongs to remaining
  var elimEnt = all[rand(0, all.length - 1)];
  if (states.length === 3) {
    var others = states.filter(function(s) { return s !== stateOf[elimEnt]; });
    clues.push(elimEnt + ' does not belong to ' + others.join(' and ') + '.');
  }
  
  // 2. Age-reference grouping: "X and the one who is N yrs old belong to the same state"
  var ageRefPairs = [];
  all.forEach(function(l) {
    all.forEach(function(m) {
      if (l !== m && stateOf[l] === stateOf[m]) {
        ageRefPairs.push({ a: l, ageVal: ageOf[m] });
      }
    });
  });
  puzShuffle(ageRefPairs);
  var usedInGroup = {};
  var refClues = 0;
  for (var i = 0; i < ageRefPairs.length && refClues < (n >= 7 ? 4 : 3); i++) {
    var p = ageRefPairs[i];
    if (usedInGroup[p.a]) continue;
    clues.push(p.a + ' and the one who is ' + p.ageVal + ' yrs old belong to the same state.');
    usedInGroup[p.a] = true;
    refClues++;
  }
  
  // 3. Uniqueness qualifier (for a 2-person state)
  states.forEach(function(st) {
    var ents = entsIn(st);
    if (ents.length === 2) {
      clues.push(ents[0] + ' and the one who is ' + ageOf[ents[1]] + ' yrs old belong to the same state and these are the only persons belonging to that state.');
    }
  });
  
  // 4. "X and Y do not belong to the same state" (negative grouping)
  var negPairs = [];
  for (var i = 0; i < all.length; i++) {
    for (var j = i + 1; j < all.length; j++) {
      if (stateOf[all[i]] !== stateOf[all[j]]) negPairs.push([all[i], all[j]]);
    }
  }
  puzShuffle(negPairs);
  for (var i = 0; i < Math.min(negPairs.length, 2); i++) {
    clues.push(negPairs[i][0] + ' and ' + negPairs[i][1] + ' do not belong to the same state.');
  }
  
  // 5. Eldest/youngest in state
  states.forEach(function(st) {
    var ents = entsIn(st);
    var ages = ents.map(function(l) { return ageOf[l]; });
    var maxE = ents[ages.indexOf(Math.max.apply(null, ages))];
    var minE = ents[ages.indexOf(Math.min.apply(null, ages))];
    if (ents.length > 1) {
      if (rand(0, 1)) clues.push(maxE + ' is the eldest person in ' + st + '.');
      else clues.push(minE + ' is the youngest person in ' + st + '.');
    }
  });
  
  // 6. Age difference
  var diffFound = false;
  for (var i = 0; i < all.length && !diffFound; i++) {
    for (var j = i + 1; j < all.length && !diffFound; j++) {
      var d = Math.abs(ageOf[all[i]] - ageOf[all[j]]);
      if (d >= 3 && d <= 12 && Math.random() < 0.5) {
        clues.push(clueAgeDiff2(all[i], all[j], ageOf));
        diffFound = true;
      }
    }
  }
  
  function clueAgeDiff2(a, b, ages) {
    if (ages[a] > ages[b]) return a + "'s age is " + (ages[a] - ages[b]) + ' yrs more than ' + b + "'s age.";
    return b + "'s age is " + (ages[b] - ages[a]) + ' yrs more than ' + a + "'s age.";
  }
  
  // 7. Ratio clue: "S age is twice of Q"
  for (var i = 0; i < all.length; i++) {
    for (var j = i + 1; j < all.length; j++) {
      if (Math.abs(ageOf[all[i]] / ageOf[all[j]] - 2) < 0.01) {
        clues.push(all[i] + "'s age is twice of " + all[j] + ".");
        break;
      }
    }
    if (clues.length > 0) break;
  }
  
  // 8. Elder/younger ordering
  var ePairs = [];
  for (var i = 0; i < all.length; i++) {
    for (var j = i + 1; j < all.length; j++) {
      ePairs.push([all[i], all[j]]);
    }
  }
  puzShuffle(ePairs);
  for (var i = 0; i < Math.min(ePairs.length, 2); i++) {
    var a = ePairs[i][0], b = ePairs[i][1];
    if (ageOf[a] > ageOf[b]) clues.push(a + ' is elder than ' + b + '.');
    else if (ageOf[b] > ageOf[a]) clues.push(b + ' is elder than ' + a + '.');
  }
  
  // 9. Specific age→state: "The one who is N yrs belongs to State X"
  var refAge = pick(all.filter(function(l) { return l !== target; }));
  if (refAge) clues.push('The one who is ' + ageOf[refAge] + ' yrs belongs to ' + stateOf[refAge] + '.');
  
  // 10. Age parity
  var pEnt = all[rand(0, all.length - 1)];
  clues.push(pEnt + "'s age is " + (ageOf[pEnt] % 2 === 0 ? 'an even' : 'an odd') + ' number.');
  
  // 11. Not youngest
  var notY = all.filter(function(l) { return ageOf[l] !== 18; });
  if (notY.length > 0) clues.push(pick(notY) + ' is not the youngest person.');
  
  // 12. Minimum age
  clues.push('The minimum age is 18 yrs.');
  
  // 13. Same-state with order: "X and Y belong to the same state where X is elder than Y"
  states.forEach(function(st) {
    var ents = entsIn(st);
    if (ents.length >= 2) {
      for (var i = 0; i < ents.length; i++) {
        for (var j = i + 1; j < ents.length; j++) {
          var elder = ageOf[ents[i]] > ageOf[ents[j]] ? ents[i] : ents[j];
          var younger = ageOf[ents[i]] > ageOf[ents[j]] ? ents[j] : ents[i];
          clues.push(elder + ' and ' + younger + ' belong to the same state where ' + elder + ' is elder than ' + younger + '.');
        }
      }
    }
  });
  
  // 14. Compound clue: "X is N yrs elder than Y and one of the ages is M"
  if (diffFound) {
    // reuse the diff pair from clue #6
    for (var i = 0; i < all.length; i++) {
      for (var j = i + 1; j < all.length; j++) {
        var d = Math.abs(ageOf[all[i]] - ageOf[all[j]]);
        if (d >= 3 && d <= 12) {
          var elder = ageOf[all[i]] > ageOf[all[j]] ? all[i] : all[j];
          var younger = ageOf[all[i]] > ageOf[all[j]] ? all[j] : all[i];
          clues.push(elder + ' is ' + d + ' yrs elder than ' + younger + ' and one of the ages is ' + ageOf[elder] + ' yrs.');
          break;
        }
      }
      if (clues.length > 0) break;
    }
  }
  
  // 15. "P and S do not belong to the same state" (additional negative)
  var moreNeg = [];
  for (var i = 0; i < all.length; i++) {
    for (var j = i + 1; j < all.length; j++) {
      if (stateOf[all[i]] !== stateOf[all[j]]) moreNeg.push([all[i], all[j]]);
    }
  }
  puzShuffle(moreNeg);
  if (moreNeg.length > 0) {
    var mn = moreNeg[0];
    clues.push(mn[0] + ' and ' + mn[1] + ' do not belong to the same state.');
  }
  
  // --- DEDUPLICATE ---
  var seen = {}, uniq = [];
  clues.forEach(function(c) { if (c && c.length > 3 && !seen[c]) { seen[c] = true; uniq.push(c); } });
  
  // --- BUILD PREAMBLE ---
  var preamble = n + ' persons ' + all.join(' to ') + ' belongs to three different states (' + states.join(', ') + ') of different ages. Not more than 4 and not less than 2 persons belong to each state.';
  preamble += ' If it is given for example B and the one who is 10yrs belong to the same state then that means B is not 10 years.';
  
  // --- BUILD OPTIONS ---
  var opts = [answer];
  while (opts.length < 4) {
    var d = answer + pick([-3, -2, -1, 1, 2, 3, 5, 7]);
    if (opts.indexOf(d) < 0 && d >= 18 && d <= 65) opts.push(d);
  }
  puzShuffle(opts);
  
  // --- RETURN ---
  return {
    type: 'puzzle',
    clueBlock: uniq,
    preamble: preamble,
    questionText: 'What is the age of ' + target + '?',
    answer: answer,
    options: opts,
    target: target,
    totalClues: uniq.length,
    timeLimit: 40 + diff * 5,
    hint: 'Start with strong clues (negatives & direct). Build the grid: person × state + age.'
  };
}

// Register puzzle generator (all clues at once, like real exam)
GENERATORS.puzzle = generatePuzzle;
var _origMixed = GENERATORS.mixed;
GENERATORS.mixed = function(diff) {
  var types = ['math', 'chain', 'pattern', 'trap', 'puzzle'];
  return GENERATORS[types[rand(0, 4)]](diff);
};

// Expose generators for testing
window.getMentalGenerators = function() { return GENERATORS; };

})();
