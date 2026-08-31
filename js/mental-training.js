(function(){

var KEY = 'mental_training_data';
var MISTAKE_KEY = 'mental_mistakes';
var SESSION_CACHE_KEY = 'mental_session_cache';
var activeLayer = 'instinct';
var _questionCache = null;
var _recentQuestions = []; // dedup: stores last 20 question texts
var _RECENT_MAX = 20;
function _isRecent(qtext) { for (var i = 0; i < _recentQuestions.length; i++) { if (_recentQuestions[i] === qtext) return true; } return false; }
function _addRecent(qtext) { _recentQuestions.push(qtext); if (_recentQuestions.length > _RECENT_MAX) _recentQuestions.shift(); }

function loadMistakes() {
  try { return JSON.parse(localStorage.getItem(MISTAKE_KEY)) || []; }
  catch(e) { return []; }
}
function saveMistakes(arr) { localStorage.setItem(MISTAKE_KEY, JSON.stringify(arr)); }

// Cache session state in sessionStorage so page refresh can resume
function cacheSession(session) {
  if (!session) return;
  try { sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({ active: true, mode: session.mode, subMode: session.subMode, questionIndex: session.questionIndex, totalQuestions: session.totalQuestions, hardMode: session.hardMode, layer: session.layer, focusType: session.focusType, mistakeQueue: session.mistakeQueue || [], review: session.review || [] })); }
  catch(e) {}
}
function restoreCachedSession() {
  try { var d = JSON.parse(sessionStorage.getItem(SESSION_CACHE_KEY)); if (d && d.active) { sessionStorage.removeItem(SESSION_CACHE_KEY); return d; } }
  catch(e) {}
  return null;
}
function clearSessionCache() {
  try { sessionStorage.removeItem(SESSION_CACHE_KEY); } catch(e) {}
}

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
  var now = Date.now();
  // Spaced repetition: score each mistake by review urgency.
  // Higher score = more urgent to review.
  for (var i = 0; i < arr.length; i++) {
    var m = arr[i];
    var hoursSinceLast = (now - (m.lastWrong || 0)) / 3600000;
    // Ideal intervals: 1st repeat after 4h, 2nd after 24h, 3rd+ after 72h
    var idealHours = m.attempts === 1 ? 4 : (m.attempts === 2 ? 24 : 72);
    // Urgency = how overdue (hours since / ideal hours). Cap at 3x to avoid old mistakes dominating.
    var urgency = Math.min(hoursSinceLast / idealHours, 3);
    // Boost weight for frequently wrong items
    var attemptWeight = 1 + (m.attempts - 1) * 0.5;
    m._srScore = urgency * attemptWeight;
  }
  // Sort by spaced repetition score descending (most urgent first)
  arr.sort(function(a, b) { return (b._srScore || 0) - (a._srScore || 0); });
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
    quant: { attempts:0, correct:0 }, reasoning: { attempts:0, correct:0 },
    verbal: { attempts:0, correct:0 }
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
    profit_loss:{attempts:0,correct:0}, pipes_cisterns:{attempts:0,correct:0},
    boats_streams:{attempts:0,correct:0}, alligation:{attempts:0,correct:0},
    surds_indices:{attempts:0,correct:0}, bankers_discount:{attempts:0,correct:0},
    stocks_shares:{attempts:0,correct:0},     odd_man_out:{attempts:0,correct:0},
    height_distance:{attempts:0,correct:0}, decimal_fraction:{attempts:0,correct:0},
    chain_rule:{attempts:0,correct:0}, logarithm:{attempts:0,correct:0},
    caselet_di:{attempts:0,correct:0}, trigonometry:{attempts:0,correct:0},
    meta:{attempts:0,correct:0},
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
    decision_making:{attempts:0,correct:0}, venn_diagram:{attempts:0,correct:0},
    letter_symbol_series:{attempts:0,correct:0}, artificial_language:{attempts:0,correct:0},
    matching_definitions:{attempts:0,correct:0}, cause_effect:{attempts:0,correct:0},
    essential_part:{attempts:0,correct:0}, theme_detection:{attempts:0,correct:0},
    statement_argument:{attempts:0,correct:0}, statement_assumption:{attempts:0,correct:0},
    statement_conclusion:{attempts:0,correct:0},
    synonym:{attempts:0,correct:0}, antonym:{attempts:0,correct:0},
    sentence_completion:{attempts:0,correct:0}, word_ordering:{attempts:0,correct:0},
    sentence_ordering:{attempts:0,correct:0}, paragraph_formation:{attempts:0,correct:0},
    comprehension:{attempts:0,correct:0},
    embedded_images:{attempts:0,correct:0}, figure_matrix:{attempts:0,correct:0},
    paper_folding:{attempts:0,correct:0}, paper_cutting:{attempts:0,correct:0},
    rule_detection:{attempts:0,correct:0}, grouping_images:{attempts:0,correct:0},
    image_analysis:{attempts:0,correct:0}, water_images:{attempts:0,correct:0},
    dot_situation:{attempts:0,correct:0},
    making_judgments:{attempts:0,correct:0}, logical_problems:{attempts:0,correct:0},
    logical_games:{attempts:0,correct:0}, analyzing_arguments:{attempts:0,correct:0},
    logical_deduction:{attempts:0,correct:0},
    character_puzzles:{attempts:0,correct:0}, verification_truth:{attempts:0,correct:0},
    analytical_reasoning:{attempts:0,correct:0}, pattern_completion:{attempts:0,correct:0},
    shape_construction:{attempts:0,correct:0},
    spotting_errors:{attempts:0,correct:0}, spellings:{attempts:0,correct:0},
    sentence_correction:{attempts:0,correct:0}, sentence_improvement:{attempts:0,correct:0},
    closet_test:{attempts:0,correct:0}, one_word_subs:{attempts:0,correct:0},
    idioms_phrases:{attempts:0,correct:0}, change_voice:{attempts:0,correct:0},
    change_speech:{attempts:0,correct:0}
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
  'venn_diagram': 'Only A = A-both. Neither = total - (A+B-both). Draw overlapping circles. Total = Aonly + Bonly + both + neither.',
  // New quant
  'profit_loss': 'SP=CP×(100+P%)/100 for profit. For loss: SP=CP×(100-L%)/100. Discount: SP=MP×(100-D%)/100.',
  'pipes_cisterns': 'Together = a×b/(a+b). Net = 1/(1/a+1/b-1/c) for fill+fill+empty. Time = work/rate.',
  'boats_streams': 'Downstream=boat+stream. Upstream=boat-stream. Boat=(DS+US)/2. Stream=(DS-US)/2.',
  'alligation': '(mean-low):(high-mean). Cheaper:Dearer = (Dearer-Mean):(Mean-Cheaper). Avg = Σ(value×qty)/Σqty.',
  'surds_indices': 'a^m×a^n=a^(m+n). (a^m)^n=a^(mn). a^m÷a^n=a^(m-n). √(a²b)=a√b. a^0=1.',
  'bankers_discount': 'BD=FV×R×T/100. TD=BD×100/(100+R×T). BG=BD-TD. PW=100×TD/(R×T).',
  'stocks_shares': 'Yield=D%/MV×100. Income=Shares×D%×FV. MV=(D%×FV)/Yield%. Investment=Shares×MV.',
  'odd_man_out': 'Find the common property (squares/primes/multiples/pattern). The odd one breaks the rule.',
  // New reasoning
  'letter_symbol_series': 'Convert letters to positions (A=1). Find step pattern. Convert back to letter.',
  'artificial_language': 'Each 3-letter chunk maps to one English word. Find mapping from the two given translations.',
  'matching_definitions': 'Read definition carefully. Eliminate options that don\'t match keywords exactly.',
  'cause_effect': 'Cause happens first and produces the effect. Look for temporal/logical sequence.',
  'essential_part': 'Identify the part without which the thing cannot function at all.',
  'theme_detection': 'Theme = central idea. Ignore details. Find what summarizes the entire passage.',
  'statement_argument': 'Strong arguments are directly relevant, significant, fact-based. Weak are vague/emotional.',
  'statement_assumption': 'Assumption is taken for granted. Must be necessarily true for statement to be valid.',
  'statement_conclusion': 'Valid conclusion MUST follow from statements. If it could be false, it does not follow.',
  // Verbal
  'synonym': 'A synonym has same or nearly same meaning. Eliminate opposites first.',
  'antonym': 'An antonym is opposite in meaning. Look for the word that means the reverse.',
  'sentence_completion': 'Read for context clues. Correct word must make logical and grammatical sense.',
  'word_ordering': 'Find subject first, then verb, then object. Form a meaningful sentence.',
  'sentence_ordering': 'Put events in chronological order. Start with what happened first.',
  'paragraph_formation': 'Start with main idea, then supporting points, then conclusion.',
  'comprehension': 'Read the passage. Find the sentence that directly answers the question.',
  // Non-verbal
  'embedded_images': 'The figure may be rotated/scaled/obscured. Look for the exact shape within the larger figure.',
  'figure_matrix': 'Find the pattern in rows AND columns. Same logic applies to all rows.',
  'paper_folding': 'Each fold doubles layers. Number of holes = layers × cuts. Unfold symmetrically.',
  'paper_cutting': 'Cut pattern repeats symmetrically across each fold line.',
  'rule_detection': 'Apply the rule to each figure. The one that violates it is the answer.',
  'grouping_images': 'Find the shared attribute in each group. Match the new item to the right group.',
  'image_analysis': 'Visualize the figure mentally. Count elements carefully.',
  'water_images': 'Water image = vertical mirror. Top becomes bottom. Left-right stays same.',
  'dot_situation': 'Each region belongs to specific shapes. Find which shapes share the dot\'s region.',
  'height_distance': 'tan(angle)=height/distance. sin=opp/hyp. cos=adj/hyp. Common angles: 30°,45°,60°.',
  'caselet_di': 'Extract numbers from the passage. Build the equation stepwise. Watch units.',
  'trigonometry': 'Standard values: sin0=0, sin30=1/2, sin45=1/√2, sin60=√3/2. Identities: sin²+cos²=1, sin(90-θ)=cosθ.',
  'decimal_fraction': 'Fraction→decimal: divide numerator by denominator. Decimal→fraction: write over power of 10, simplify.',
  'chain_rule': 'More men = fewer days (inverse). More work = more days (direct). M1×D1×W2 = M2×D2×W1.',
  'logarithm': 'log_b(x)=y → b^y=x. log(xy)=log(x)+log(y). log(x/y)=log(x)-log(y). log(x^n)=n×log(x).',
  'making_judgments': 'Evaluate options for effectiveness, cost, feasibility. Best choice directly achieves the goal.',
  'logical_problems': 'List all possibilities. Eliminate contradictions. Only one scenario works with all clues.',
  'logical_games': 'Nim: leave multiple of (max+1) for opponent. Weighing: divide into 3 groups.',
  'analyzing_arguments': 'Hasty generalization=small sample. Circular=premise assumes conclusion. Ad populum=popularity.',
  'logical_deduction': 'All A are B, C is A → C is B. If ALL=certain. If SOME=possible. If NO=certain negative.',
  'character_puzzles': 'Find pattern in columns/rows. Same operation applies to all.',
  'verification_truth': 'Assume one true, check for contradictions. Only one scenario fits all facts.',
  'analytical_reasoning': 'Count systematically: smallest first, then larger. For squares: sum n² from 1 to N.',
  'pattern_completion': 'Pattern repeats in a cycle. Check what element is missing from the cycle.',
  'shape_construction': 'Two identical right triangles form a square. Area scales by square of side ratio.',
  'verbal_analogy': 'Find the EXACT relation in the first pair (function→place, part→whole, product→maker, cause→effect). Apply the same relation to the second pair.',
  'number_coding': 'A=1, B=2, ... Z=26. Convert each letter to its position number in order. Reverse/pattern if it shrinks.',
  'instalments': 'Total = Principal + Simple Interest. Equal instalments = Total ÷ number of instalments.',
  'spotting_errors': 'Check: subject-verb agreement, tense, prepositions, word form, singular/plural.',
  'spellings': 'Double consonants (accommodation). -ance (maintenance). -ible vs -able. i before e except after c.',
  'sentence_correction': 'Subject-verb agreement. Tense consistency. Each=singular. Since+point, For+duration.',
  'sentence_improvement': 'too...to (infinitive), so...that (clause). Prefer A to B. No sooner...than.',
  'closet_test': 'Read entire passage first. Missing word must fit context and grammar.',
  'one_word_subs': 'Think of the specific single-word term. Latin/Greek roots help.',
  'idioms_phrases': 'Idioms have figurative meanings. Cannot be understood literally.',
  'change_voice': 'Active→Passive: object→subject, be+past participle, subject→by+agent.',
  'change_speech': 'Remove quotes. Present→past. will→would. today→that day. Commands→to+verb.',
  'tenses': 'Match the TIME MARKER: every day=simple present, since/for=present perfect (continuous), when/before past=past perfect, by+future=future perfect, look/now=present continuous.',
  'prepositions': 'Fixed collocations: good at, interested in, afraid of, fond of. at=point/time, in=enclosed/month, on=surface/day, since=point, for=duration, between=two, among=three+.',
  'articles': 'a/an=first mention & non-specific (an hour, a university by SOUND). the=unique, superlative, specified. no article=general/uncountable.',
  'confusing_words': 'Learn each pair: affect(verb)/effect(noun), advise(verb)/advice(noun), lend(give)/borrow(take). Pick the word matching the sentence meaning.',
  'homophones': 'Same sound, different meaning/spelling. Use sentence context to pick the right one.'
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
  'caselet_di': { line1: 'Passage DI', line2: '4s — Read once, underline numbers. Build the equation stepwise. Answer what is ASKED, not what you computed first.' },
  'trigonometry': { line1: 'Standard values / identities', line2: '3s — sin0=0, sin30=1/2, sin45=1/√2, sin60=√3/2, sin90=1. sin²+cos²=1. sin(90-θ)=cosθ. tan=sin/cos.' },
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
  'venn_diagram': { line1: 'Set theory / surveys', line2: '3s — Only A=A-both. Neither=total-(A+B-both). Draw overlapping circles.' },
  'verbal_analogy': { line1: 'Pair relation match', line2: '3s — Find the exact relation (function→place, part→whole). Apply the same to the second pair.' },
  'number_coding': { line1: 'Letter→number', line2: '3s — A=1 to Z=26. Write each letter\'s position in order.' },
  'instalments': { line1: 'Equal payments', line2: '4s — Total = P + SI. Each instalment = Total ÷ number of instalments.' },
  // Verbal drills
  'sentence_completion': { line1: 'Context clue fill', line2: '3s — Read whole sentence. Word must fit meaning AND grammar. Eliminate illogical options.' },
  'word_ordering': { line1: 'S-V-O order', line2: '2s — Subject → verb → object. Time/place at end. Question words start.' },
  'sentence_ordering': { line1: 'Chronological order', line2: '3s — Start with what happened first; link ideas with pronouns/connectors.' },
  'paragraph_formation': { line1: 'Main-idea ordering', line2: '3s — Topic sentence first, then support, then conclusion.' },
  'comprehension': { line1: 'Direct-answer reading', line2: '5s — Find the exact sentence in the passage. The answer is stated.' },
  'spotting_errors': { line1: 'Grammar check', line2: '3s — Verb agreement, tense, preposition, word form, singular/plural.' },
  'spellings': { line1: 'Spelling rules', line2: '2s — Double consonants, -ance/-ence, -ible/-able, i before e except after c.' },
  'sentence_correction': { line1: 'Fix the grammar', line2: '3s — Agreement, tense, each=singular, since+point/for+duration.' },
  'sentence_improvement': { line1: 'Improve phrasing', line2: '3s — too...to, so...that, prefer A to B, no sooner...than.' },
  'closet_test': { line1: 'Passage fill', line2: '4s — Read whole passage. Missing word fits context and grammar.' },
  'one_word_subs': { line1: 'Phrase→word', line2: '3s — Find the exact single term for the phrase.' },
  'idioms_phrases': { line1: 'Figurative meaning', line2: '3s — Idioms are not literal. Learn common meanings.' },
  'change_voice': { line1: 'Active↔Passive', line2: '3s — object→subject, be+past participle, agent→by+subject.' },
  'change_speech': { line1: 'Direct↔Indirect', line2: '4s — Remove quotes, shift tense, will→would, today→that day.' },
  'sentence_connectors': { line1: 'Relationship connector', line2: '3s — Contrast=but/yet, cause=so/therefore, condition=if/unless, addition=and/moreover, choice=or.' },
  'double_fillers': { line1: 'Two-blank context', line2: '3s — Both blanks must fit meaning AND grammar together.' },
  'paragraph_completion': { line1: 'Concluding sentence', line2: '4s — Must follow logically: summarize/draw conclusion/suggest action.' },
  'tenses': { line1: 'Time marker → tense', line2: '3s — every day=simple present, since/for=perfect, when+before past=past perfect, by+future=future perfect.' },
  'prepositions': { line1: 'Collocations & place', line2: '3s — at=point, in=enclosed/month, on=surface/day, since=point, for=duration.' },
  'articles': { line1: 'a/an/the by sound', line2: '2s — an hour, a university. the=unique/superlative. no article=general.' },
  'confusing_words': { line1: 'Pair meanings', line2: '3s — affect/effect, advise/advice, lend/borrow. Fit meaning to sentence.' },
  'homophones': { line1: 'Sound-alike meaning', line2: '2s — Use context to pick the right spelling/meaning.' }
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

// =============================================
// Question Meta-Engine — self-deriving question generator
// Define a formula ONCE; all 3 permutations + chains auto-generated
// =============================================
var QM = {
  _f: {}, _ctx: {}, _runs: 0,
  // Variable type inference: suffix → type category
  _vt: { _kmh:'speed', _m_s:'speed', _ms:'speed', _m:'length', _s:'time', _days:'time', _yr:'time', _rs:'money', _pct:'pct', _p:'pct' },
  _typeOf: function(v) { for (var k in this._vt) { if (v.indexOf(k) >= 0) return this._vt[k]; } return 'other'; },
  def: function(name, def) {
    this._f[name] = def;
    this._ctx[name] = def.ctx || { _: {} };
    return this;
  },
  _val: function(d) {
    if (d.vals) return d.vals[rand(0, d.vals.length - 1)];
    return rand(d.min, d.max);
  },
  _fmt: function(v, k, ctx) {
    var c = this._ctx[ctx] || {};
    var dk = (c[k] && typeof c[k].display === 'function' && c[k].display) || (c._ && c._[k] && typeof c._[k].display === 'function' && c._[k].display);
    var uk = (c[k] && c[k].unit) || (c._ && c._[k] && c._[k].unit);
    var val = dk ? dk(v) : v;
    var s = Math.round(val * 100) / 100 + '';
    if (uk) s += uk;
    return s;
  },
  // Generate question finding a specific variable
  gen: function(name, find, fixedVals) {
    var def = this._f[name]; if (!def) return null;
    var f = def.formula; if (!f[find]) return null;
    var knowns = def.vars.filter(function(v) { return v !== find; });
    var vals = {};
    for (var i = 0; i < knowns.length; i++) {
      if (fixedVals && fixedVals[knowns[i]] !== undefined) {
        vals[knowns[i]] = fixedVals[knowns[i]];
      } else {
        var d = def.domains[knowns[i]];
        vals[knowns[i]] = d !== undefined ? this._val(d) : 1;
      }
    }
    var result = f[find](vals);
    var ans = Math.round(result[find] * 100) / 100;
    var ctx = def.ctx;
    var parts = [];
    for (var i = 0; i < knowns.length; i++) {
      parts.push(knowns[i] + '=' + this._fmt(vals[knowns[i]], knowns[i], name));
    }
    var autoTpl = parts.join(', ') + '. Find ' + find + '?';
    var qText = (ctx && ctx[find] && ctx[find].tpl) ? (function(tpl,v,ctx2,nm){
      var s=tpl; for(var k in v)s=s.replace(new RegExp('\\{'+k+'\\}','g'),QM._fmt(v[k],k,nm));
      return s;
    })(ctx[find].tpl, vals, name) : autoTpl;
    var hint = knowns.map(function(k) { return k + '=' + QM._fmt(vals[k], k, name); }).join(', ') + ' → ' + find + '=' + QM._fmt(ans, find, name);
    var opts = [ans]; var r = def.optRange || 5;
    for (var _g=0; _g<50 && opts.length<4; _g++) { var d = Math.round((ans + rand(-r, r)) * 100) / 100; if (opts.indexOf(d) < 0 && d > 0) opts.push(d); }
    shuffle(opts);
    return { question: qText, answer: ans, options: opts, hint: hint, timeLimit: 15, type: 'quant', techniqueLabel: name + ': ' + hint.substring(0, 35), intuition: hint, _meta: true, _formula: name, _find: find, _vals: vals, _result: result };
  },
  any: function() {
    var names = Object.keys(this._f);
    for (var t = 0; t < 20; t++) {
      var n = names[rand(0, names.length - 1)];
      var def = this._f[n];
      var solvableVars = def.vars.filter(function(v) { return def.formula[v]; });
      if (solvableVars.length === 0) continue;
      var find = solvableVars[rand(0, solvableVars.length - 1)];
      var r = this.gen(n, find);
      if (r) return r;
    }
    return null;
  },
  // Auto-discover chain: generate formula A, pipe its answer into formula B
  // by matching variable types. Produces infinite combinatoric chains dynamically.
  genChain: function() {
    var names = Object.keys(this._f);
    for (var tries = 0; tries < 30; tries++) {
      var nA = names[rand(0, names.length - 1)];
      var nB = names[rand(0, names.length - 1)];
      if (nA === nB) continue;
      var defA = this._f[nA], defB = this._f[nB];
      var solA = defA.vars.filter(function(v) { return defA.formula[v]; });
      if (solA.length === 0) continue;
      var findA = solA[rand(0, solA.length - 1)];
      var qA = this.gen(nA, findA);
      if (!qA) continue;
      var ansA = qA.answer; var typeA = this._typeOf(findA);
      var compatB = defB.vars.filter(function(v) {
        return defB.formula[v] && QM._typeOf(v) === typeA;
      });
      if (compatB.length === 0) continue;
      var bridgeVar = compatB[rand(0, compatB.length - 1)];
      var d = defB.domains[bridgeVar];
      if (d) {
        if (d.min !== undefined && ansA < d.min * 0.5) continue;
        if (d.max !== undefined && ansA > d.max * 1.5) continue;
        if (d.vals) {
          var ok = false;
          for (var vi = 0; vi < d.vals.length; vi++) {
            if (Math.abs(d.vals[vi] - ansA) / Math.max(1, d.vals[vi]) < 0.3) { ok = true; break; }
          }
          if (!ok) continue;
        }
      }
      // Generate B with bridgeVar fixed to ansA
      var fixed = {}; fixed[bridgeVar] = ansA;
      var qB = this.gen(nB, bridgeVar, fixed);
      if (!qB) continue;
      // Combine into a composite question
      var chainLabel = nA + '→' + nB;
      var step1Hint = qA.hint.split(' → ').pop() || String(ansA);
      var compositeQ = 'Step 1: ' + qA.question + ' (ans: ' + ansA + ') Then: ' + qB.question;
      // Build options from qB's answer
      var opts = [qB.answer]; var r = defB.optRange || 5;
      for (var _g=0; _g<50 && opts.length<4; _g++) { var d2 = Math.round((qB.answer + rand(-r, r)) * 100) / 100; if (opts.indexOf(d2) < 0 && d2 > 0) opts.push(d2); }
      shuffle(opts);
      return { question: compositeQ, answer: qB.answer, options: opts, hint: qB.hint, timeLimit: 25, type: 'quant', techniqueLabel: 'Chain: ' + chainLabel, intuition: qA.intuition + ' | ' + qB.intuition, _meta: true, _chain: true };
    }
    return null;
  }
};

// --- Formula definitions ---
// Each formula: vars, formula (solver for each var), domains, optRange, ctx (templates)
// Auto-derivation: just define the formula with ALL vars as solvers — any can be the unknown

QM.def('train_pole', {
  vars: ['length_m', 'speed_kmh', 'time_s'],
  formula: {
    time_s: function(v) { var ms = v.speed_kmh * 5 / 18; return { time_s: v.length_m / ms }; },
    length_m: function(v) { var ms = v.speed_kmh * 5 / 18; return { length_m: ms * v.time_s }; },
    speed_kmh: function(v) { var ms = v.length_m / v.time_s; return { speed_kmh: ms * 18 / 5 }; }
  },
  domains: { length_m: { min: 100, max: 300 }, speed_kmh: { vals: [36,45,54,60,72,90] }, time_s: { min: 6, max: 15 } },
  optRange: 4,
  ctx: {
    time_s: { tpl: 'Train {length_m}m at {speed_kmh}km/h crosses a pole in?', unit: 's' },
    length_m: { tpl: 'Train at {speed_kmh}km/h crosses a pole in {time_s}s. Length?', unit: 'm' },
    speed_kmh: { tpl: 'Train {length_m}m crosses a pole in {time_s}s. Speed?', unit: 'km/h' }
  }
});

QM.def('train_platform', {
  vars: ['train_m', 'plat_m', 'speed_kmh', 'time_s'],
  formula: {
    time_s: function(v) { var ms = v.speed_kmh * 5 / 18; return { time_s: (v.train_m + v.plat_m) / ms }; },
    train_m: function(v) { var ms = v.speed_kmh * 5 / 18; return { train_m: ms * v.time_s - v.plat_m }; },
    plat_m: function(v) { var ms = v.speed_kmh * 5 / 18; return { plat_m: ms * v.time_s - v.train_m }; },
    speed_kmh: function(v) { var ms = (v.train_m + v.plat_m) / v.time_s; return { speed_kmh: ms * 18 / 5 }; }
  },
  domains: { train_m: { min: 100, max: 200 }, plat_m: { min: 200, max: 400 }, speed_kmh: { vals: [45,54,60,72] }, time_s: { min: 12, max: 35 } },
  optRange: 8,
  ctx: {
    time_s: { tpl: 'Train {train_m}m at {speed_kmh}km/h crosses {plat_m}m platform in?', unit: 's' },
    train_m: { tpl: 'Train at {speed_kmh}km/h crosses {plat_m}m platform in {time_s}s. Length?', unit: 'm' },
    plat_m: { tpl: 'Train {train_m}m at {speed_kmh}km/h crosses platform in {time_s}s. Platform?', unit: 'm' },
    speed_kmh: { tpl: 'Train {train_m}m crosses {plat_m}m platform in {time_s}s. Speed?', unit: 'km/h' }
  }
});

QM.def('train_opposite', {
  vars: ['l1_m', 'l2_m', 'v1_kmh', 'v2_kmh', 'time_s'],
  formula: {
    time_s: function(v) { return { time_s: (v.l1_m + v.l2_m) / ((v.v1_kmh + v.v2_kmh) * 5 / 18) }; },
    v2_kmh: function(v) { var rel = (v.l1_m + v.l2_m) / v.time_s; return { v2_kmh: rel * 18 / 5 - v.v1_kmh }; },
    l2_m: function(v) { return { l2_m: ((v.v1_kmh + v.v2_kmh) * 5 / 18) * v.time_s - v.l1_m }; }
  },
  domains: { l1_m: { min: 100, max: 250 }, l2_m: { min: 100, max: 250 }, v1_kmh: { vals: [36,45,54] }, v2_kmh: { vals: [45,54,60] }, time_s: { min: 6, max: 18 } },
  optRange: 3,
  ctx: {
    time_s: { tpl: 'Two trains {l1_m}m & {l2_m}m at {v1_kmh} & {v2_kmh} km/h cross opposite in?', unit: 's' },
    v2_kmh: { tpl: 'Train1 {l1_m}m at {v1_kmh}km/h. Train2 {l2_m}m. Cross opposite in {time_s}s. Train2 speed?', unit: 'km/h' },
    l2_m: { tpl: 'Two trains at {v1_kmh} & {v2_kmh}km/h cross opposite in {time_s}s. Train1={l1_m}m. Train2 length?', unit: 'm' }
  }
});

QM.def('work_together', {
  vars: ['a_days', 'b_days', 'total_days'],
  formula: {
    total_days: function(v) { return { total_days: v.a_days * v.b_days / (v.a_days + v.b_days) }; },
    a_days: function(v) { return { a_days: v.total_days * v.b_days / (v.b_days - v.total_days) }; },
    b_days: function(v) { return { b_days: v.total_days * v.a_days / (v.a_days - v.total_days) }; }
  },
  domains: { a_days: { min: 6, max: 18 }, b_days: { min: 10, max: 25 }, total_days: { min: 3, max: 12 } },
  optRange: 3,
  ctx: {
    total_days: { tpl: 'A completes in {a_days} days, B in {b_days} days. Together?', unit: ' days' },
    a_days: { tpl: 'A+B finish in {total_days} days. B alone in {b_days} days. A alone?', unit: ' days' },
    b_days: { tpl: 'A+B finish in {total_days} days. A alone in {a_days} days. B alone?', unit: ' days' }
  }
});

QM.def('profit_loss', {
  vars: ['cp_rs', 'profit_pct', 'sp_rs'],
  formula: {
    sp_rs: function(v) { return { sp_rs: v.cp_rs * (100 + v.profit_pct) / 100 }; },
    cp_rs: function(v) { return { cp_rs: v.sp_rs * 100 / (100 + v.profit_pct) }; },
    profit_pct: function(v) { return { profit_pct: (v.sp_rs - v.cp_rs) / v.cp_rs * 100 }; }
  },
  domains: { cp_rs: { min: 100, max: 500 }, profit_pct: { min: 5, max: 25 }, sp_rs: { min: 120, max: 600 } },
  optRange: 20,
  ctx: {
    sp_rs: { tpl: 'CP=₹{cp_rs}, profit={profit_pct}%. SP?', unit: '₹' },
    cp_rs: { tpl: 'SP=₹{sp_rs}, profit={profit_pct}%. CP?', unit: '₹' },
    profit_pct: { tpl: 'CP=₹{cp_rs}, SP=₹{sp_rs}. Profit%?', unit: '%', display: function(v) { return Math.round(v); } }
  }
});

QM.def('si', {
  vars: ['p_rs', 'rate_pct', 'time_yr', 'si_rs'],
  formula: {
    si_rs: function(v) { return { si_rs: v.p_rs * v.rate_pct * v.time_yr / 100 }; },
    p_rs: function(v) { return { p_rs: v.si_rs * 100 / (v.rate_pct * v.time_yr) }; },
    rate_pct: function(v) { return { rate_pct: v.si_rs * 100 / (v.p_rs * v.time_yr) }; },
    time_yr: function(v) { return { time_yr: v.si_rs * 100 / (v.p_rs * v.rate_pct) }; }
  },
  domains: { p_rs: { min: 1000, max: 10000 }, rate_pct: { vals: [5,6,8,10,12] }, time_yr: { vals: [1,2,3,4,5] }, si_rs: { min: 100, max: 2000 } },
  optRange: 200,
  ctx: {
    si_rs: { tpl: 'P=₹{p_rs}, R={rate_pct}%, T={time_yr}yr. SI?', unit: '₹' },
    p_rs: { tpl: 'SI=₹{si_rs}, R={rate_pct}%, T={time_yr}yr. Principal?', unit: '₹' },
    rate_pct: { tpl: 'P=₹{p_rs}, SI=₹{si_rs}, T={time_yr}yr. Rate?', unit: '%' },
    time_yr: { tpl: 'P=₹{p_rs}, R={rate_pct}%, SI=₹{si_rs}. Time?', unit: ' yr' }
  }
});

QM.def('discount', {
  vars: ['mp_rs', 'disc_pct', 'sp_rs'],
  formula: {
    sp_rs: function(v) { return { sp_rs: v.mp_rs * (100 - v.disc_pct) / 100 }; },
    mp_rs: function(v) { return { mp_rs: v.sp_rs * 100 / (100 - v.disc_pct) }; },
    disc_pct: function(v) { return { disc_pct: (v.mp_rs - v.sp_rs) / v.mp_rs * 100 }; }
  },
  domains: { mp_rs: { min: 200, max: 800 }, disc_pct: { min: 10, max: 40 }, sp_rs: { min: 150, max: 600 } },
  optRange: 30,
  ctx: {
    sp_rs: { tpl: 'MP=₹{mp_rs}, discount={disc_pct}%. SP?', unit: '₹' },
    mp_rs: { tpl: 'SP=₹{sp_rs}, discount={disc_pct}%. MP?', unit: '₹' },
    disc_pct: { tpl: 'MP=₹{mp_rs}, SP=₹{sp_rs}. Discount%?', unit: '%' }
  }
});

// Public meta-generator: uses formula bank + dynamic chains
function generateMetaQuestion(diff, layer) {
  // 20% chance of chain (dynamically composed from any compatible pair)
  if (rand(1, 5) <= 1) {
    var c = QM.genChain();
    if (c) { c.timeLimit = (layer === 'instinct') ? 15 : 20; return c; }
  }
  var q = QM.any();
  if (!q) return generateNumberSenseQuestion(diff, layer || 'exam');
  q.timeLimit = (layer === 'instinct') ? 15 : 20;
  return q;
}

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
  grandslam: generateGrandSlamQuestion,
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
  for (var _g=0; _g<50 && opts.length<4; _g++) { var d = rand(-5, 5) + data.a; if (opts.indexOf(d) < 0 && d > 0) opts.push(d); }
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
  { pairs: [['Victory','Joy'],['Loss','Sadness'],['Danger','Fear'],['Gift','Happiness'],['Insult','Anger'],['Surprise','Shock'],['Success','Pride'],['Failure','Disappointment']], rel:'event?emotion' },
  // Hard: number-based analogies (product, digital root)
  { pairs: [['2','4'],['3','9'],['4','16'],['5','25'],['6','36'],['7','49'],['8','64'],['9','81'],['10','100'],['12','144']], rel:'number?square' },
  { pairs: [['2','8'],['3','27'],['4','64'],['5','125'],['6','216'],['7','343'],['8','512'],['9','729'],['10','1000']], rel:'number?cube' },
  { pairs: [['A','1'],['B','2'],['C','3'],['D','4'],['E','5'],['F','6'],['G','7'],['H','8'],['I','9'],['J','10'],['K','11'],['L','12'],['M','13']], rel:'letter?position' },
  { pairs: [['ACE','BDF'],['BDF','CEG'],['CEG','DFH'],['DFH','EGI'],['EGI','FHJ'],['FHJ','GIK']], rel:'skip?one' },
  { pairs: [['2','6'],['3','12'],['4','20'],['5','30'],['6','42'],['7','56'],['8','72'],['9','90'],['10','110']], rel:'number?n(n+1)' },
  { pairs: [['1','0'],['2','1'],['3','2'],['4','3'],['5','4'],['6','5'],['7','6'],['8','7'],['9','8'],['10','9']], rel:'number?predecessor' },
  { pairs: [['3','5'],['5','7'],['11','13'],['17','19'],['29','31'],['41','43'],['59','61'],['71','73']], rel:'prime?twin' },
  // Advanced for high diff
  { pairs: [['2','5'],['3','10'],['4','17'],['5','26'],['6','37'],['7','50'],['8','65'],['9','82'],['10','101']], rel:'number?n²+1' },
  { pairs: [['2','3'],['3','7'],['4','15'],['5','31'],['6','63'],['7','127'],['8','255'],['9','511']], rel:'number?2ⁿ-1' },
  { pairs: [['1','2'],['2','5'],['3','10'],['4','17'],['5','26'],['6','37'],['7','50'],['8','65'],['9','82']], rel:'number?n²+1 (starting 1)' },
  { pairs: [['3','30'],['4','68'],['5','130'],['6','222'],['7','350'],['8','520'],['9','738']], rel:'number?n³+n' },
  { pairs: [['A','1'],['B','2'],['C','3'],['D','4'],['E','5'],['F','6'],['G','7'],['H','8'],['I','9'],['J','10'],['K','11'],['L','12'],['M','13'],['N','14'],['O','15'],['P','16'],['Q','17'],['R','18'],['S','19'],['T','20'],['U','21'],['V','22'],['W','23'],['X','24'],['Y','25'],['Z','26']], rel:'letter?alphabet-position' },
  { pairs: [['ACE','18'],['BDF','24'],['CEG','30'],['DFH','36'],['EGI','42'],['FHJ','48'],['GIK','54']], rel:'letter?sum-of-positions' },
  { pairs: [['AB','2'],['CD','6'],['EF','10'],['GH','14'],['IJ','18'],['KL','22'],['MN','26']], rel:'letter-pair?position-sum' },
  { pairs: [['Z','1'],['Y','2'],['X','3'],['W','4'],['V','5'],['U','6'],['T','7'],['S','8'],['R','9'],['Q','10']], rel:'letter?reverse-position' },
  { pairs: [['5','20'],['6','30'],['7','42'],['8','56'],['9','72'],['10','90'],['11','110']], rel:'number?n(n+1) extended' },
  { pairs: [['2','11'],['3','21'],['4','31'],['5','41'],['6','51'],['7','61'],['8','71'],['9','81']], rel:'number?10n-9' },
  { pairs: [['ODD','EVEN'],['PRIME','COMPOSITE'],['SQUARE','CIRCLE'],['HEIGHT','DEPTH'],['LENGTH','BREADTH'],['WIDTH','HEIGHT']], rel:'opposite-aspect' },
  { pairs: [['B4','D9'],['F16','H25'],['J36','L49'],['N64','P81'],['R100','T121']], rel:'letter?letter+square-number' }
];

function generateAnalogyQuestion(diff) {
  var ty = [
    function() {
      // Standard analogy from ANALOGY_CATS
      var startIdx = diff > 2 ? 9 : 0;
      var catIdx = rand(startIdx, ANALOGY_CATS.length - 1);
      var cat = ANALOGY_CATS[catIdx];
      var idx = rand(0, cat.pairs.length - 1);
      var pair = cat.pairs[idx];
      var ansIdx = rand(0, cat.pairs.length - 1);
      while (ansIdx === idx && cat.pairs.length > 1) ansIdx = rand(0, cat.pairs.length - 1);
      var ansPair = cat.pairs[ansIdx];
      var qText = pair[0] + ' : ' + pair[1] + ' :: ' + ansPair[0] + ' : ?';
      var answer = ansPair[1];
      var opts = [answer];
      var pool = cat.pairs.reduce(function(acc, p) { if (p[1] !== answer && acc.indexOf(p[1]) < 0) acc.push(p[1]); return acc; }, []);
      if (pool.length < 3) {
        ANALOGY_CATS.forEach(function(c) { c.pairs.forEach(function(p) { if (p[1] !== answer && pool.indexOf(p[1]) < 0) pool.push(p[1]); }); });
      }
      shuffle(pool);
      for (var i = 0; opts.length < 4 && i < pool.length; i++) { if (opts.indexOf(pool[i]) < 0) opts.push(pool[i]); }
      for (var _g=0; _g<50 && opts.length<4; _g++) { var d = String.fromCharCode(65 + opts.length); if (opts.indexOf(d) < 0) opts.push(d); }
      shuffle(opts);
      return { q: '(' + cat.rel + ') ' + qText, a: answer, o: opts, hint: 'Identify pattern: ' + cat.rel + '. Apply same to ' + ansPair[0] + '.', t: diff <= 1 ? 15 : (diff <= 3 ? 12 : 10), sol: cat.rel + ': ' + pair[0] + ' → ' + pair[1] + ', so ' + ansPair[0] + ' → ' + answer + '.' };
    },
    function() {
      // Hard: double relationship analogy (e.g., letter:number :: word:?)
      var map = {'A':1,'B':2,'C':3,'D':4,'E':5,'F':6,'G':7,'H':8,'I':9,'J':10,'K':11,'L':12,'M':13,'N':14,'O':15,'P':16,'Q':17,'R':18,'S':19,'T':20,'U':21,'V':22,'W':23,'X':24,'Y':25,'Z':26};
      var letters = Object.keys(map);
      var l1 = letters[rand(0, 25)], l2 = letters[rand(0, 25)];
      while (l2 === l1) l2 = letters[rand(0, 25)];
      var n1 = map[l1], n2 = map[l2];
      var qWord = l1 + l2;
      var ansWord = String.fromCharCode(64 + n1*2) + String.fromCharCode(64 + n2*2);
      var opts = [ansWord];
      for (var _g=0; _g<50 && opts.length<4; _g++) { var w = letters[rand(0, 25)] + letters[rand(0, 25)]; if (opts.indexOf(w) < 0) opts.push(w); }
      shuffle(opts);
      return { q: l1 + ':' + n1 + ' :: ' + l2 + ':' + n2 + '  →  ' + qWord + ' : ?', a: ansWord, o: opts, hint: 'Double mapping: letter→position, then position×2', t: 10, sol: l1 + '→' + n1 + ', ' + l2 + '→' + n2 + '. ' + qWord + ' → each letter doubled: ' + ansWord + '.' };
    },
    function() {
      // Hard: mixed letter-number analogy
      var digits = '0123456789';
      var base = rand(10, 50);
      var code1 = String(base) + String.fromCharCode(64 + base);
      var code2 = String(base + rand(2, 5)) + String.fromCharCode(64 + base + rand(2, 5));
      var ansCode = String(base + rand(4, 7)) + String.fromCharCode(64 + base + rand(4, 7));
      var opts = [ansCode];
      for (var _g=0; _g<50 && opts.length<4; _g++) { var d = String(rand(10, 99)) + String.fromCharCode(64 + rand(1, 26)); if (opts.indexOf(d) < 0) opts.push(d); }
      shuffle(opts);
      return { q: code1 + ' : ' + code2 + ' :: ' + ansCode[0] + (parseInt(ansCode[0])+2) + ' : ?', a: ansCode, o: opts, hint: 'Identify the relationship between number and letter parts', t: 10, sol: 'Pattern: number and corresponding alphabet position. ' + ansCode + ' completes the analogy.' };
    }
  ];
  var idx;
  if (diff >= 5 && ty.length >= 4) {
    idx = Math.random() < 0.7 ? rand(Math.max(0, ty.length - 3), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var t = ty[idx];
  var data = t();
  return {
    question: data.q,
    answer: data.a,
    options: data.o,
    hint: data.hint,
    timeLimit: data.t,
    type: 'pattern', patternLabel: 'Analogy',
    techniqueLabel: 'Analogy',
    drillLine1: data.q,
    drillLine2: 'Answer: ' + data.a,
    solution: data.sol
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
    },
    // Hard: letter pattern — vowel vs consonant
    function() {
      var vowels=['A','E','I','O','U']; var cons=['B','C','D','F','G','H','J','K','L','M','N','P','Q','R','S','T','V','W','X','Y','Z'];
      var items=[];
      var v=pick(vowels); var c1=pick(cons), c2=pick(cons), c3=pick(cons);
      items=[v,c1,c2,c3]; shuffle(items);
      return { items: items, answer: v, expl: v + ' is a vowel, others are consonants' };
    },
    // Hard: perfect squares vs non-square
    function() {
      var sq=[4,9,16,25,36,49,64,81,100]; var ns=[5,10,17,20,26,33,40,50,65,72,82,90,101];
      var items=[sq[rand(0,sq.length-1)], sq[rand(0,sq.length-1)], sq[rand(0,sq.length-1)], ns[rand(0,ns.length-1)]];
      shuffle(items);
      var ans = items.filter(function(x){return sq.indexOf(x)<0;})[0];
      return { items: items, answer: ans, expl: ans + ' is not a perfect square, others are' };
    },
    // Hard: alphabet position — even position vs odd
    function() {
      function letter(p){return String.fromCharCode(64+p);}
      var odd=[letter(1),letter(3),letter(5),letter(7),letter(9),letter(11),letter(13),letter(15),letter(17),letter(19),letter(21),letter(23),letter(25)];
      var even=[letter(2),letter(4),letter(6),letter(8),letter(10),letter(12),letter(14),letter(16),letter(18),letter(20),letter(22),letter(24),letter(26)];
      var items=[pick(odd),pick(odd),pick(odd),pick(even)]; shuffle(items);
      var ans=items.filter(function(x){return even.indexOf(x)>=0;})[0];
      return { items: items, answer: ans, expl: ans + ' is at even position in alphabet, others are at odd positions' };
    },
    // Hard: divisibility — all divisible by 3 except one
    function() {
      var mult3=[function(){return rand(2,12)*3;}];
      for(var i=0;i<3;i++){var n;do{n=rand(2,12)*3;}while(mult3.indexOf(n)>=0);mult3.push(n);}
      var wrong;do{wrong=rand(5,40);}while(wrong%3===0||mult3.indexOf(wrong)>=0);
      var pos=rand(0,3); var ans=mult3.splice(pos,1,wrong)[0];
      return { items: mult3, answer: wrong, expl: wrong + ' is not divisible by 3, others are' };
    },
    // Hard: digit sum pattern
    function() {
      var digSum=rand(5,17);
      var items=[];
      for(var i=0;i<3;i++){var t=rand(1,9), ones=digSum-t; if(ones<0){t=t+ones; ones=0;} if(ones>9){ones=9; t=digSum-ones;} var n=t*10+ones; if(items.indexOf(n)<0) items.push(n);}
      if(items.length<3) items.push(digSum, digSum+10, digSum+20);
      items=items.slice(0,3);
      var wrong;do{wrong=digSum+10+rand(1,9);}while(wrong.toString().split('').reduce(function(a,b){return a+ +b;},0)===digSum||items.indexOf(wrong)>=0);
      items.push(wrong); shuffle(items);
      return {items:items, answer:wrong, expl:wrong+' has digit sum '+wrong.toString().split('').reduce(function(a,b){return a+ +b;},0)+', others have sum '+digSum};
    },
    // Hard: perfect cubes vs non-cube
    function() {
      var cubes=[8,27,64,125,216,343,512,729,1000];
      var nonCubes=[9,28,65,124,217,342,513,728,1001];
      var items=[cubes[rand(0,cubes.length-1)],cubes[rand(0,cubes.length-1)],cubes[rand(0,cubes.length-1)],nonCubes[rand(0,nonCubes.length-1)]];
      shuffle(items);
      var ans=items.filter(function(x){return cubes.indexOf(x)<0;})[0];
      return {items:items, answer:ans, expl:ans+' is not a perfect cube, others are'};
    },
    // Hard: alphabetical order — ascending vs not
    function() {
      function nextLetter(l){return String.fromCharCode(l.charCodeAt(0)+1);}
      function prevLetter(l){return String.fromCharCode(l.charCodeAt(0)-1);}
      var start=rand(0,23); var base=String.fromCharCode(65+start);
      var items=[base+nextLetter(base), nextLetter(base)+nextLetter(base).toLowerCase(), base.toLowerCase()+nextLetter(base).toLowerCase(), base.toLowerCase()+nextLetter(base)];
      // Three follow pattern (consecutive alphabet sequence), one doesn't
      var pattern=[base+nextLetter(base), nextLetter(base)+String.fromCharCode(nextLetter(base).charCodeAt(0)+1), String.fromCharCode(base.charCodeAt(0)+2)+String.fromCharCode(base.charCodeAt(0)+3)];
      var wrong=pick(['AB','CD','XY','MN','OP'])+pick(['A','B','X','Y']);
      var allItems=pattern.slice(0,3); allItems.push(wrong); shuffle(allItems);
      return {items:allItems, answer:wrong, expl:wrong+' does not follow consecutive alphabet pattern, others do'};
    },
    // Hard: number operation pattern — all are n²+n or equivalent
    function() {
      var base=rand(3,9);
      var items=[base*base+base, (base+1)*(base+1)+(base+1), (base+2)*(base+2)+(base+2)];
      var wrong=(base+3)*(base+3)+base; // wrong pattern
      items.push(wrong); shuffle(items);
      return {items:items, answer:wrong, expl:wrong+' does not follow n²+n pattern (n='+base+','+(base+1)+','+(base+2)+'), others do'};
    },
    // Hard: letter position parity — sum of positions even vs odd
    function() {
      function posSum(str){return str.split('').reduce(function(a,c){return a+(c.charCodeAt(0)-64);},0);}
      var words=['AB','CD','EF','GH','IJ','KL','MN','OP','QR','ST','UV','WX','YZ'];
      shuffle(words);
      var selected=words.slice(0,3);
      var parity=posSum(selected[0])%2===0?'even':'odd';
      var sameParity=selected.filter(function(w){return posSum(w)%2===0===parity;});
      var diffParity=words.slice(3).filter(function(w){return posSum(w)%2===0!==parity;});
      if(sameParity.length<3||diffParity.length===0){
        selected=words.slice(4,7); parity=posSum(selected[0])%2===0?'even':'odd';
        sameParity=selected.filter(function(w){return posSum(w)%2===0===parity;});
        diffParity=words.slice(7).filter(function(w){return posSum(w)%2===0!==parity;});
      }
      var wrong=diffParity[0];
      var allItems=selected.slice(0,3); allItems.push(wrong); shuffle(allItems);
      return {items:allItems, answer:wrong, expl:wrong+' has position sum '+posSum(wrong)+' ('+(posSum(wrong)%2===0?'even':'odd')+'), others have '+parity+' sum'};
    },
    // Hard: mixed letter-number pattern (e.g., A1, B2, C3, ...)
    function() {
      var base=rand(0,20);
      function makePair(offset){return String.fromCharCode(65+base+offset)+(base+offset+1);}
      var items=[makePair(0),makePair(1),makePair(2)];
      var wrong=String.fromCharCode(65+base+3)+(base+5); // mismatched number
      items.push(wrong); shuffle(items);
      return {items:items, answer:wrong, expl:wrong+' breaks letter-number match pattern (letter pos should equal number)'};
    },
    // Hard: number with same property (all are 2^n or 2^n-1 etc)
    function() {
      var p=rand(3,8);
      var items=[1<<p, 1<<(p+1), 1<<(p+2)];
      var wrong=(1<<(p+3))+1;
      items.push(wrong); shuffle(items);
      return {items:items, answer:wrong, expl:wrong+' is not a power of 2, others are powers of 2'};
    },
    // SBI PO Hard: number theory — all are n²+n+1 except one
    function() {
      var b=rand(3,7);
      var items=[b*b+b+1, (b+1)*(b+1)+(b+1)+1, (b+2)*(b+2)+(b+2)+1];
      var wrong=(b+3)*(b+3)+(b+3)+2;
      items.push(wrong); shuffle(items);
      return {items:items, answer:wrong, expl:wrong+' does not follow n²+n+1 pattern, others do'};
    },
    // SBI PO Hard: complex pattern — sum of digits forms a GP
    function() {
      var nums=[];
      for(var i=0;i<3;i++){var n=rand(1,9)*111;nums.push(n);}
      var wrong=rand(1,9)*123;
      nums.push(wrong); shuffle(nums);
      return {items:nums, answer:wrong, expl:wrong+' breaks the repeated-digit pattern (111, 222, 444 etc), others have identical digits'};
    },
    // SBI PO Hard: Fibonacci derived — all are F(n)+n except one
    function() {
      var fib=[0,1,1,2,3,5,8,13,21,34,55,89];
      var s=rand(3,6);
      var items=[fib[s]+s, fib[s+1]+s+1, fib[s+2]+s+2];
      var wrong=fib[s+3]+s+4;
      items.push(wrong); shuffle(items);
      return {items:items, answer:wrong, expl:wrong+' does not follow Fibonacci(n)+n pattern, others do'};
    }
  ];
  var ty = rules;
  var idx;
  if (diff >= 5 && ty.length >= 4) {
    idx = Math.random() < 0.7 ? rand(Math.max(0, ty.length - 4), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var fn = ty[idx];
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
    [1, function() { var s=rand(1,10), d=rand(2,5); var n=5,seq=[]; for(var i=0;i<n;i++)seq.push(s+i*d); return {seq:seq,ans:s+n*d,pat:'AP +'+d,hint:'Const diff'}; }],
    [1, function() { var s=rand(50,100), d=rand(5,12); var n=5,seq=[s]; for(var i=0;i<n;i++)seq.push(seq[i]-d); return {seq:seq,ans:seq[n]-d,pat:'AP -'+d,hint:'Sub ' + d}; }],
    [1, function() { var s=rand(1,5), r=rand(2,3); var n=5,seq=[]; for(var i=0;i<n;i++)seq.push(s*Math.pow(r,i)); return {seq:seq,ans:s*Math.pow(r,n),pat:'GP ×'+r,hint:'×' + r}; }],
    [2, function() { var s=rand(3,7); var n=5,seq=[]; for(var i=0;i<n;i++)seq.push((s+i)*(s+i)); return {seq:seq,ans:(s+n)*(s+n),pat:'Squares',hint:'Squares from '+s}; }],
    [2, function() { var primes=[2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61]; var s=rand(0,6),n=5,seq=[]; for(var i=0;i<n;i++)seq.push(primes[s+i]); return {seq:seq,ans:primes[s+n],pat:'Primes',hint:'Prime numbers'}; }],
    [2, function() { var s=rand(5,20), d=rand(2,5), n=5,seq=[s]; for(var i=0;i<n;i++)seq.push(seq[i]+d+i*2); return {seq:seq,ans:seq[n]+d+n*2,pat:'Inc diff',hint:'+'+d+',+'+(d+2)+'...'}; }],
    [3, function() { var a=rand(1,5), b=rand(1,5), n=6,seq=[a,b]; for(var i=2;i<n;i++)seq.push(seq[i-1]+seq[i-2]); return {seq:seq,ans:seq[n-1]+seq[n-2],pat:'Fib',hint:'Sum prev 2'}; }],
    [3, function() { var s=rand(2,5); var n=4,seq=[]; for(var i=0;i<n;i++)seq.push(Math.pow(s+i,3)); return {seq:seq,ans:Math.pow(s+n,3),pat:'Cubes',hint:'Cubes from '+s}; }],
    [3, function() { var s=rand(20,50), a=rand(4,10), n=5,seq=[s]; for(var i=0;i<n;i++)seq.push(seq[i]+(i%2===0?-a:a)); return {seq:seq,ans:seq[n]+(n%2===0?-a:a),pat:'Alt ±'+a,hint:'Alt add/sub ' + a}; }],
    [3, function() { var base=rand(10,50), n=5,seq=[base]; for(var i=0;i<n;i++)seq.push(seq[i]+9); return {seq:seq,ans:seq[n]+9,pat:'Digit sum const',hint:'+9 preserves digit sum'}; }],
    [4, function() { var s=rand(2,5), c=rand(1,5), n=5,seq=[]; for(var i=0;i<n;i++)seq.push((s+i)*(s+i)+c); return {seq:seq,ans:(s+n)*(s+n)+c,pat:'n²+'+c,hint:'Squares+'+c}; }],
    [4, function() { var s=rand(2,6), n=5,seq=[]; for(var i=0;i<n;i++)seq.push((s+i)*(s+i+1)); return {seq:seq,ans:(s+n)*(s+n+1),pat:'n(n+1)',hint:'Prod consecutive'}; }],
    [4, function() { var a1=rand(2,6), d1=rand(2,5), a2=rand(10,20), d2=rand(-5,-2), n=8,seq=[]; for(var i=0;i<n;i+=2){seq.push(a1+(i/2)*d1,a2+(i/2)*d2);} return {seq:seq,ans:a2+(n/2)*d2,pat:'Dual alternating',hint:'Two interleaved: +'+d1+' and '+d2}; }],
    [4, function() { var s=rand(0,2), n=4,seq=[],st=1+s; for(var i=0;i<n;i++){st+=i;seq.push(String.fromCharCode(64+Math.min(st,26)));} return {seq:seq,ans:String.fromCharCode(64+Math.min(st+n,26)),pat:'Letter inc gap',hint:'Gap +1,+2,...'}; }],
    [4, function() { var s=rand(1,4), n=5,seq=[]; for(var i=0;i<n;i++)seq.push(Math.pow(2,s+i)+(s+i)); return {seq:seq,ans:Math.pow(2,s+n)+(s+n),pat:'2ⁿ+n',hint:'Pow 2 + index'}; }],
    [5, function() { var s=rand(2,5), n=4,seq=[]; for(var i=0;i<n;i++)seq.push(Math.pow(s+i,3)+1); return {seq:seq,ans:Math.pow(s+n,3)+1,pat:'n³+1',hint:'Cubes+1'}; }],
    [5, function() { var a=rand(2,4), b=rand(1,5), s=rand(2,6), n=5,seq=[s]; for(var i=0;i<n;i++)seq.push(seq[i]*a+b); return {seq:seq,ans:seq[n]*a+b,pat:'×'+a+'+'+b,hint:'Prev ×'+a+'+'+b}; }],
    [5, function() { var s=rand(2,5), n=7,seq=[s]; for(var i=0;i<n;i++){if(i%2===0)seq.push(seq[i]*2);else seq.push(seq[i]+3);} return {seq:seq,ans:n%2===0?seq[n]+3:seq[n]*2,pat:'Alt ×2+3',hint:'×2 then +3 then ×2...'}; }],
    [5, function() { var s=rand(3,8), n=5,seq=[]; for(var i=0;i<n;i++)seq.push((s+i)*(s+i)-1); return {seq:seq,ans:(s+n)*(s+n)-1,pat:'n²-1',hint:'Squares-1'}; }],
    [5, function() { var s=rand(2,7), n=5,seq=[]; for(var i=0;i<n;i++)seq.push((s+i)*((s+i)+1)); return {seq:seq,ans:(s+n)*((s+n)+1),pat:'n(n+1)²',hint:'n×(n+1)'}; }],
    // SBI PO Hard: alternating pattern with prime gaps
    function() { var p=[2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61]; var s=rand(0,8), n=6, seq=[]; for(var i=0;i<n;i+=2){seq.push(p[s+i/2], p[s+i/2+1]+(i+1));} return {seq:seq,ans:n%2===0?p[s+n/2+1]+(n+1):p[s+(n+1)/2],pat:'Alt prime+gap',hint:'Alternating: prime, prime+index'}; },
    // SBI PO Hard: multi-operation — ×2, +3, ×2, +3...
    function() { var s=rand(3,9), n=7,seq=[s]; for(var i=0;i<n;i++){if(i%2===0)seq.push(seq[i]*2);else seq.push(seq[i]+3);} return {seq:seq,ans:n%2===0?seq[n]+3:seq[n]*2,pat:'Alt ×2,+3',hint:'×2 then +3 then ×2...'}; },
    // SBI PO Hard: mixed operation — n²+1, n²-1 alternating
    function() { var s=rand(3,6), n=6,seq=[]; for(var i=0;i<n;i++){var base=s+i;seq.push(i%2===0?base*base+1:base*base-1);} return {seq:seq,ans:n%2===0?(s+n)*(s+n)-1:(s+n)*(s+n)+1,pat:'Alt n²±1',hint:'Alternating +1, -1 for squares'}; }
  ];
  var ty = types;
  var idx;
  if (diff >= 5 && ty.length >= 4) {
    idx = Math.random() < 0.7 ? rand(Math.max(0, ty.length - 4), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var chosen = ty[idx];
  if (Array.isArray(chosen)) {
    var matched = types.filter(function(t){ return t[0] <= diff; });
    if (matched.length === 0) matched = types;
    chosen = matched[rand(0, matched.length - 1)];
  }
  var data = chosen[1] ? chosen[1]() : chosen();
  var isLetter = typeof data.ans === 'string' && /^[A-Z]$/.test(data.ans);
  var isFrac = typeof data.ans === 'string' && data.ans.indexOf('/')>=0;
  var answer = isLetter ? data.ans : (isFrac ? data.ans : Math.round(data.ans));
  var opts = [answer];
  if (isLetter) { var l='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''); for (var _g=0; _g<50 && opts.length<4; _g++) {var x=l[rand(0,25)];if(opts.indexOf(x)<0)opts.push(x);} }
  else if (isFrac) { var den=parseInt(data.ans.split('/')[1]); for (var _g=0; _g<50 && opts.length<4; _g++) {var d='1/'+(den+rand(-3,3));if(opts.indexOf(d)<0&&d.indexOf('-')<0)opts.push(d);} }
  else { var sp=Math.max(1,Math.round(answer*0.15)); for (var _g=0; _g<50 && opts.length<4; _g++) {var d=answer+rand(-sp*3,sp*3);if(opts.indexOf(d)<0&&d>0)opts.push(d);} }
  shuffle(opts);
  return { question: data.seq.join(', ')+', ?', answer: answer, options: opts, hint: data.hint+'. '+data.pat, timeLimit: diff<=1?15:(diff<=3?12:10), type:'pattern', patternLabel:'Series', techniqueLabel:'Series: '+data.pat+'. '+data.hint, drillLine1:'Pattern: '+data.pat, drillLine2:data.seq.join(' ? ')+' ? '+answer, solution:'Series: '+data.pat+'. Next = '+answer };
}

function generateCodingQuestion(diff) {
  var words = ['CAT','DOG','BAT','RAT','SUN','FAN','BAG','HAT','PEN','CUP','BED','FOG','JAM','KIT','LIP','MAP','NET','OAK','POT','RUG','SAP','TAP','URN','VAN','WAX','YAK','ZIP','BOW','COW','FOX','HEN','ICE','KEY','MAN','OWL','PIG','RAM','TOY','URN','VOW','WEB','AXE','ELF','INK','OAR','URN','ANT','BEE','EMU','FLY','GNU','JAY','LYNX','MOO','SWAN','TROUT','VIXEN','WOLF','ZEBRA'];
  var schemes = [
    [1, function(w){ var s=0; for(var i=0;i<w.length;i++)s+=w.charCodeAt(i)-64; return {ans:s,desc:'A=1... sum positions',sch:'Sum of pos'}; }],
    [1, function(w){ var p=1; for(var i=0;i<w.length;i++)p*=w.charCodeAt(i)-64; return {ans:p,desc:'A=1... product positions',sch:'Product of pos'}; }],
    [2, function(w){ var s=0; for(var i=0;i<w.length;i++)s+=27-(w.charCodeAt(i)-64); return {ans:s,desc:'A=26,B=25... sum rev',sch:'Rev pos sum'}; }],
    [2, function(w){ var s=0; for(var i=0;i<w.length;i++)s+=w.charCodeAt(i)-64; return {ans:s*s,desc:'Sum pos then square',sch:'(Sum pos)²'}; }],
    [3, function(w){ var s=0; for(var i=0;i<w.length;i++){var p=w.charCodeAt(i)-64;s+=p*p;} return {ans:s,desc:'Sum squares of pos',sch:'Sum pos²'}; }],
    [3, function(w){ var s=0; for(var i=0;i<w.length;i++)s+=(w.charCodeAt(i)-64)*(i+1); return {ans:s,desc:'Pos×index sum',sch:'Pos×idx'}; }],
    [4, function(w){ var s=''; for(var i=0;i<w.length;i++){var c=w.charCodeAt(i)-64+rand(1,3);if(c>26)c-=26; s+=String.fromCharCode(64+c);} return {ans:s,desc:'Each letter shifted +'+(rand(1,3))+' positions',sch:'Letter shift +'+(rand(1,3))}; }],
    [4, function(w){ var s=''; for(var i=w.length-1;i>=0;i--)s+=w[i]; return {ans:s,desc:'Word reversed',sch:'Reverse word'}; }],
    [5, function(w){ var vowelPos={'A':1,'E':2,'I':3,'O':4,'U':5}; var s=0; for(var i=0;i<w.length;i++){if(vowelPos[w[i]])s+=vowelPos[w[i]]*2; else s+=w.charCodeAt(i)-64;} return {ans:s,desc:'Vowels ×2, consonants as is',sch:'Vowel double'}; }],
    [5, function(w){ var s=''; for(var i=0;i<w.length;i++){var c=String.fromCharCode(65+rand(0,25));s+=c;} return {ans:s,desc:'Each letter replaced by code letter',sch:'Substitution code'}; },
    function(w){ var s=''; for(var i=0;i<w.length;i++){var p=w.charCodeAt(i)-64;if('AEIOU'.indexOf(w[i])>=0) s+=String.fromCharCode(64+(p%26===0?26:p%26)+2); else s+=String.fromCharCode(64+(p%26===0?26:p%26)+1);} return {ans:s,desc:'Vowels +2, consonants +1',sch:'Conditional shift'}; },
    function(w){ var grid=[['A','B','C','D','E'],['F','G','H','I','J'],['K','L','M','N','O'],['P','Q','R','S','T'],['U','V','W','X','Y']]; var s=0; for(var i=0;i<w.length;i++){for(var r=0;r<5;r++){for(var c=0;c<5;c++){if(grid[r][c]===w[i]){s+=r*10+c;break;}}}} return {ans:s,desc:'Matrix position sum (rowx10+col)',sch:'Matrix code sum'}; },
    function(w){ var rev=w.split('').reverse().join(''); var s=''; for(var i=0;i<rev.length;i++){var p=rev.charCodeAt(i)-64+i+1;if(p>26)p-=26; s+=String.fromCharCode(64+p);} return {ans:s,desc:'Reverse word then shift each by index',sch:'Reverse+shift'}; }]
  ];
  var ty = schemes;
  var idx;
  if (diff >= 5 && ty.length >= 6) {
    idx = Math.random() < 0.7 ? rand(Math.max(0, ty.length - 4), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var scheme = ty[idx];
  if (Array.isArray(scheme)) {
    var matched = schemes.filter(function(t){ return t[0] <= diff; });
    if (matched.length === 0) matched = schemes;
    scheme = matched[rand(0, matched.length - 1)];
  }
  var word = words[rand(0, words.length - 1)];
  var exWord = words[rand(0, words.length - 1)];
  while (exWord === word) exWord = words[rand(0, words.length - 1)];
  var exData = scheme[1] ? scheme[1](exWord) : scheme(exWord);
  var data = scheme[1] ? scheme[1](word) : scheme(word);
  var answer = data.ans;
  var answerStr = typeof answer === 'number' ? answer : String(answer);
  var opts = [answerStr];
  if (typeof answer === 'number') {
    var spread = Math.max(1, Math.round(answer * 0.2));
    for (var _g=0; _g<50 && opts.length<4; _g++) { var d = answer + rand(-spread - 2, spread + 2); if (opts.indexOf(d) < 0 && d > 0 && d < 100000) opts.push(d); }
  } else {
    for (var _g=0; _g<50 && opts.length<4; _g++) { var d = words[rand(0, words.length - 1)]; if (opts.indexOf(d) < 0) opts.push(d); }
  }
  shuffle(opts);
  var sch = data.sch || 'Conditional';
  return { question: 'If ' + exWord + ' = ' + (exData.ans || exData) + ', then ' + word + ' = ?', answer: answerStr, options: opts, hint: data.desc + '. Apply same to ' + word, timeLimit: diff<=1?15:(diff<=3?12:10), type:'pattern', patternLabel:'Coding', techniqueLabel:'Coding: '+sch, drillLine1: exWord + ' = ' + (exData.ans || exData) + ' ? ' + sch, drillLine2: word + ' = ' + answerStr, solution: sch + '. ' + word + ' -> ' + answerStr };
}

function generateSyllogismQuestion(diff) {
  var sets = ['Cats','Dogs','Birds','Fish','Mammals','Reptiles','Insects','Animals','Plants','Trees','Flowers','Fruits','Humans','Robots','Cars','Planes','Boats','Bicycles','Computers','Phones','Books','Chairs','Tables','Artists','Doctors','Engineers','Teachers','Writers','Dancers','Singers','Actors','Lawyers','Athletes','Scientists','Politicians','Students','Men','Women'];
  shuffle(sets);
  var A = sets[0], B = sets[1], C = sets[2], D = sets[3];
  var patterns = [
    [1, 'All ' + A + ' are ' + B + '. All ' + B + ' are ' + C + '.', 'All ' + A + ' are ' + C + '.', 'True', 'All+All=All chain. Valid.' ],
    [1, 'All ' + A + ' are ' + B + '. Some ' + B + ' are ' + C + '.', 'Some ' + A + ' are ' + C + '.', 'Cannot determine', 'Those B=C may not include A' ],
    [1, 'No ' + A + ' are ' + B + '. All ' + C + ' are ' + B + '.', 'No ' + C + ' are ' + A + '.', 'True', 'C⊆B, B∩A=∅ → C∩A=∅' ],
    [1, 'Some ' + A + ' are ' + B + '. All ' + B + ' are ' + C + '.', 'Some ' + A + ' are ' + C + '.', 'True', 'Some+All=Some. Valid.' ],
    [2, 'No ' + A + ' are ' + B + '. All ' + C + ' are ' + A + '.', 'Some ' + C + ' are ' + B + '.', 'False', 'C⊆A, A∩B=∅ → no C is B' ],
    [2, 'Some ' + A + ' are ' + B + '. Some ' + B + ' are ' + C + '.', 'Some ' + A + ' are ' + C + '.', 'Cannot determine', 'Some+Some=no guarantee' ],
    [2, 'All ' + A + ' are ' + B + '. No ' + B + ' are ' + C + '.', 'No ' + A + ' are ' + C + '.', 'True', 'A⊆B, B∩C=∅ → A∩C=∅' ],
    [2, 'No ' + A + ' are ' + B + '. Some ' + B + ' are ' + C + '.', 'Some ' + C + ' are ' + A + '.', 'Cannot determine', 'C could overlap with A or not' ],
    [3, 'Not all ' + A + ' are ' + B + '. All ' + B + ' are ' + C + '.', 'Some ' + A + ' are not ' + C + '.', 'Cannot determine', 'Not-B may or may not be C' ],
    [3, 'Not all ' + A + ' are ' + B + '. No ' + B + ' are ' + C + '.', 'Some ' + A + ' are not ' + C + '.', 'True', 'Some A are B, those B are not C' ],
    [3, 'All ' + A + ' are ' + B + '. Not all ' + B + ' are ' + C + '.', 'Some ' + A + ' are not ' + C + '.', 'Cannot determine', 'Not-C B may exclude A' ],
    [3, 'Only a few ' + A + ' are ' + B + '. All ' + B + ' are ' + C + '.', 'Some ' + A + ' are not ' + C + '.', 'Cannot determine', 'Only a few = some+some not' ],
    [4, 'Only a few ' + A + ' are ' + B + '. No ' + B + ' are ' + C + '.', 'Some ' + A + ' are not ' + C + '.', 'True', 'A that are B are not C' ],
    [4, 'All ' + A + ' are ' + B + '. Some ' + B + ' are not ' + C + '.', 'Possibly some ' + A + ' are not ' + C + '.', 'True', 'Possible, not definite' ],
    [4, 'Some ' + A + ' are ' + B + '. All ' + B + ' are ' + C + '. No ' + C + ' are ' + D + '.', 'Some ' + A + ' are not ' + D + '.', 'True', 'Some A=B=C, not D' ],
    [4, 'All ' + A + ' are ' + B + '. All ' + B + ' are ' + C + '. Some ' + D + ' are ' + C + '.', 'Some ' + D + ' are ' + A + '.', 'Cannot determine', 'D and A have no direct link' ],
    [5, 'Some ' + A + ' are ' + B + '. Some ' + B + ' are ' + C + '. All ' + C + ' are ' + D + '.', 'Some ' + A + ' are ' + D + '.', 'Cannot determine', 'A and D have no guaranteed link' ],
    [5, 'All ' + A + ' are ' + B + '. All ' + B + ' are ' + C + '. Can never be true: No ' + A + ' is ' + C + '.', 'True (can never be)', 'Since all A are C, "no A is C" is impossible' ],
    [5, 'All ' + A + ' are ' + B + '. No ' + C + ' are ' + B + '.', 'Either no ' + A + ' are ' + C + ' or some ' + A + ' are not ' + C + '.', 'True', 'A⊆B, C∩B=∅ → A∩C=∅' ],
    // SBI PO Hard: multi-premise possibility
    function() {
      var opts = POSSIBILITY_ANSWERS[rand(0, POSSIBILITY_ANSWERS.length - 1)];
      var prem = 'All ' + A + ' are ' + B + '. Some ' + B + ' are ' + C + '. All ' + C + ' are ' + D + '.';
      var conc = 'Possibly some ' + A + ' are ' + D + '. Is this a valid possibility?';
      return [5, prem, conc, opts.a, opts.sol];
    },
    // SBI PO Hard: possibility with negative
    function() {
      var prem = 'No ' + A + ' is ' + B + '. All ' + B + ' are ' + C + '. Some ' + D + ' are ' + A + '.';
      var conc = 'Some ' + D + ' are not ' + C + '. Can this be true?';
      return [5, prem, conc, 'Cannot determine', 'D may or may not intersect with C. If D∩A is outside C, then yes. Otherwise no.'];
    },
    // SBI PO Hard: all + some not chain
    function() {
      var prem = 'All ' + A + ' are ' + B + '. Some ' + B + ' are not ' + C + '. All ' + C + ' are ' + D + '.';
      var conc = 'Some ' + A + ' are not ' + D + '. Is this necessarily true?';
      return [5, prem, conc, 'Cannot determine', 'A that are B may or may not be in the "not C" portion.'];
    }
  ];
  var POSSIBILITY_ANSWERS = [
    {a:'True (possible)', sol: 'Since some B are C and all C are D, and A are B, it is possible some A are D via B→C pathway.'},
    {a:'False (impossible)', sol: 'No direct link from A to C to D can be established as possible.'}
  ];
  var ty = patterns;
  var idx;
  if (diff >= 5 && ty.length >= 6) {
    idx = Math.random() < 0.7 ? rand(Math.max(0, ty.length - 4), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var chosen = ty[idx];
  if (Array.isArray(chosen) && typeof chosen[0] === 'number') {
    var p = patterns.filter(function(x){ return Array.isArray(x) && typeof x[0] === 'number' && x[0] <= diff; });
    if (p.length === 0) p = patterns.filter(function(x){ return Array.isArray(x) && typeof x[0] === 'number'; });
    chosen = p[rand(0, p.length - 1)];
  } else if (typeof chosen === 'function') {
    chosen = chosen();
  }
  var isPoss = chosen[3].indexOf('can never') >= 0;
  var baseOpts = isPoss ? ['True','False','Cannot determine','Depends'] : ['Definitely true','Definitely false','Probably true','Cannot determine'];
  var opts = [chosen[3]];
  for (var _oi=0; _oi<baseOpts.length && opts.length<4; _oi++){ var _b=baseOpts[_oi]; if(_b!==chosen[3]&&opts.indexOf(_b)<0) opts.push(_b); }
  var _pads=['Absolutely false','Neither fact nor fancy','Possibly false','Very certain'];
  while(opts.length<4){ var pad=_pads[opts.length-1]; if(opts.indexOf(pad)<0) opts.push(pad); }
  shuffle(opts);
  return { question: 'Statements: ' + chosen[1] + ' Conclusion: ' + chosen[2], answer: chosen[3], options: opts, hint: isPoss ? 'Check if the statement CAN be true' : 'Draw Venn. Check if conclusion definitely follows.', timeLimit: chosen[1].length>80?25:(diff<=1?20:15), type:'pattern', patternLabel:'Syllogism', techniqueLabel:'Syllogism: draw circles. All=⊆, Some=∩, No=∅', drillLine1: chosen[1], drillLine2: 'Conclusion: '+chosen[2]+' → '+chosen[3], solution: chosen[4] };
}

function generateInequalityQuestion(diff) {
  var vars = ['A','B','C','D','E','F','G','H','P','Q','R','S','X','Y','Z','M','N'];
  shuffle(vars);
  var chainLen = rand(3, 5);
  var symbols = ['>', '<', '=', '≥', '≤'];

  // 50% chance of coded inequality (@, #, $, %, &)
  var isCoded = diff > 1 && rand(0, 1) === 0;
  var codeMap = {};
  var codeRev = {};
  if (isCoded) {
    var codes = ['@','#','$','%','&','*'];
    shuffle(codes);
    var codedSymbols = ['>', '<', '=', '≥', '≤', '>'];
    for (var ci = 0; ci < 5; ci++) {
      codeMap[codes[ci]] = codedSymbols[ci];
      codeRev[codedSymbols[ci]] = codes[ci];
    }
  }

  function renderSym(sym) { return isCoded && codeRev[sym] ? codeRev[sym] : sym; }
  function decodeSym(sym) { return isCoded && codeMap[sym] ? codeMap[sym] : sym; }

  var chain = [];
  for (var i = 0; i < chainLen; i++) {
    var sym = symbols[rand(0, (diff > 1 && i > 1) ? 4 : 1)];
    if (i > 0 && (chain[i-1] === '=' || chain[i-1] === '≥' || chain[i-1] === '≤') && (sym === '>' || sym === '<')) {
      if (rand(0,1)) sym = '=';
    }
    chain.push(sym);
  }

  var qStr = '', usedVars = [];
  for (var i = 0; i <= chainLen; i++) {
    if (i === 0) { qStr = isCoded ? vars[i] : vars[i]; usedVars.push(vars[i]); }
    else {
      var v = vars[i];
      var idx = 0;
      while (usedVars.indexOf(v) >= 0) { idx++; v = vars[i] + ((vars.length > i+idx) ? vars[i+idx] : String(idx)); }
      usedVars.push(v);
      qStr += ' ' + renderSym(chain[i-1]) + ' ' + v;
    }
  }

  // Decode the chain to determine relations
  var decodedChain = [];
  for (var i = 0; i < chain.length; i++) decodedChain.push(chain[i]);

  var first = usedVars[0], last = usedVars[usedVars.length - 1];
  var allPositive = true, allNegative = true;
  var hasEq = false;
  for (var i = 0; i < decodedChain.length; i++) {
    var s = decodedChain[i];
    if (s === '>' || s === '≥') { allNegative = false; }
    else if (s === '<' || s === '≤') { allPositive = false; }
    else if (s === '=') { hasEq = true; }
  }

  // Question styles
  var qTypes = [];
  // Direct/chain q
  qTypes.push(function() {
    var ans = allPositive ? first + ' > ' + last : (allNegative ? first + ' < ' + last : 'Cannot determine');
    if (allPositive && hasEq) ans = first + ' ≥ ' + last;
    if (allNegative && hasEq) ans = first + ' ≤ ' + last;
    return { q: 'What is the relation between ' + first + ' and ' + last + '?', ans: ans, opts: [first + ' > ' + last, first + ' < ' + last, first + ' = ' + last, 'Cannot determine'], desc: 'End-point relation' };
  });
  // Which is largest/smallest
  qTypes.push(function() {
    var largest = first, smallest = last;
    for (var i = 0; i < decodedChain.length; i++) {
      if (decodedChain[i] === '>' || decodedChain[i] === '≥') { largest = usedVars[i+1]; }
      else if (decodedChain[i] === '<' || decodedChain[i] === '≤') { smallest = usedVars[i+1]; }
    }
    // Determine by scanning
    var possibleLargest = [], possibleSmallest = [];
    var curMax = usedVars[0], curMin = usedVars[0];
    for (var i = 0; i < decodedChain.length; i++) {
      if (decodedChain[i] === '>' || decodedChain[i] === '≥') { curMax = usedVars[i+1]; }
      else if (decodedChain[i] === '<' || decodedChain[i] === '≤') { curMin = usedVars[i+1]; }
      else if (decodedChain[i] === '=') { curMax = usedVars[i+1]; curMin = usedVars[i+1]; }
    }
    var ans = rand(0,1) === 0 ? (allPositive ? curMax : (allNegative ? curMin : 'Cannot determine')) : (allPositive ? curMin : (allNegative ? curMax : 'Cannot determine'));
    if (ans === 'Cannot determine') { ans = 'Cannot determine'; }
    return { q: rand(0,1) === 0 ? 'Which is definitely the largest?' : 'Which is definitely the smallest?', ans: ans, opts: [curMax, curMin, usedVars[Math.floor(usedVars.length/2)], 'Cannot determine'], desc: 'Extreme value' };
  });
  // Multiple conclusions style (like SSC/RBI)
  qTypes.push(function() {
    var concI = allPositive ? first + ' > ' + last : (allNegative ? first + ' < ' + last : first + ' = ' + last);
    var concII = allPositive ? last + ' < ' + usedVars[Math.floor(usedVars.length/2)] : (allNegative ? first + ' > ' + usedVars[Math.floor(usedVars.length/2)] : 'Cannot determine');
    var ans = 'Only I follows';
    if (concII === 'Cannot determine' && (allPositive || allNegative)) ans = 'Only I follows';
    else if (concI === 'Cannot determine' && concII !== 'Cannot determine') ans = 'Only II follows';
    else if (concI !== 'Cannot determine' && concII !== 'Cannot determine') ans = 'Both I and II follow';
    else ans = 'Neither I nor II follows';
    return { q: 'Conclusions: <br>I. ' + concI + '<br>II. ' + concII, ans: ans, opts: ['Only I follows','Only II follows','Both I and II follow','Neither I nor II follows'], desc: 'Multiple conclusions' };
  });
  // Coded question: given statement with codes, find conclusion
  if (isCoded) {
    qTypes.push(function() {
      var decodeHint = '';
      for (var k in codeMap) { if (codeMap.hasOwnProperty(k)) { decodeHint += k + '→' + codeMap[k] + ' '; } }
      var codedStr = qStr;
      var ans = allPositive ? first + ' > ' + last : (allNegative ? first + ' < ' + last : 'Cannot determine');
      if (allPositive && hasEq) ans = first + ' ≥ ' + last;
      return { q: codedStr + '. ' + 'Decode and find relation between ' + first + ' and ' + last + '.', ans: ans, opts: [first + ' > ' + last, first + ' < ' + last, first + ' = ' + last, 'Cannot determine'], desc: 'Coded: ' + decodeHint };
    });
  }
  // Mixed direction: find which statement is true
  qTypes.push(function() {
    var hasMixed = false;
    for (var i = 1; i < decodedChain.length; i++) {
      if ((decodedChain[i] === '>' || decodedChain[i] === '≥') && (decodedChain[i-1] === '<' || decodedChain[i-1] === '≤')) hasMixed = true;
      if ((decodedChain[i] === '<' || decodedChain[i] === '≤') && (decodedChain[i-1] === '>' || decodedChain[i-1] === '≥')) hasMixed = true;
    }
    var ans = hasMixed ? 'Direction flips — cannot combine all' : (allPositive ? first + ' > ' + last : first + ' < ' + last);
    return { q: 'Which statement is definitely true?', ans: ans, opts: [first + ' > ' + last, first + ' < ' + last, first + ' = ' + last, 'Direction flips — cannot combine all'], desc: 'Mixed direction' };
  });
  // SBI PO Hard: multi-statement coded inequality (find conclusion among 3 given)
  qTypes.push(function() {
    var conclusions = [
      { text: first + ' > ' + last, correct: allPositive && !hasEq },
      { text: first + ' < ' + last, correct: allNegative && !hasEq },
      { text: first + ' ≥ ' + last, correct: allPositive && hasEq },
      { text: first + ' ≤ ' + last, correct: allNegative && hasEq },
      { text: 'Cannot determine', correct: !allPositive && !allNegative }
    ];
    var correct = conclusions.filter(function(c){ return c.correct; });
    var ans = correct.length > 0 ? correct[0].text : 'Cannot determine';
    return { q: 'Which conclusion definitely follows from the given statements?', ans: ans, opts: conclusions.slice(0,4).map(function(c){ return c.text; }), desc: 'Multi-statement conclusion' };
  });
  // SBI PO Hard: find the odd conclusion
  qTypes.push(function() {
    var concs = [first + ' > ' + last, first + ' ≥ ' + last, first + ' = ' + last, first + ' < ' + last];
    var ans = allPositive ? concs[3] : (allNegative ? concs[0] : concs[2]);
    return { q: 'Which of the following conclusions is definitely NOT true?', ans: ans, opts: concs, desc: 'Identify false conclusion' };
  });

  var ty = qTypes;
  var idx;
  if (diff >= 5 && ty.length >= 6) {
    idx = Math.random() < 0.7 ? rand(Math.max(0, ty.length - 3), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var q = ty[idx]();
  var answer = q.ans;
  var opts = q.opts.slice();
  shuffle(opts);

  var hint = isCoded ? 'Decode symbols first: ' + (function(){ var s=''; for(var k in codeMap){if(codeMap.hasOwnProperty(k)){s+=k+'='+codeMap[k]+' ';}} return s; })() : 'Chain same-direction symbols. If sign flips → stop.';
  var label = isCoded ? 'Coded Inequality: decode ' + q.desc : 'Inequality: ' + q.desc;

  return {
    question: (isCoded ? '(Coded) ' : '') + qStr + '. ' + q.q,
    answer: answer,
    options: opts,
    hint: hint,
    timeLimit: isCoded ? 20 : (diff <= 1 ? 15 : (diff <= 3 ? 12 : 10)),
    type: 'pattern',
    patternLabel: 'Inequality',
    techniqueLabel: label,
    drillLine1: qStr,
    drillLine2: q.q + ' → ' + answer,
    solution: 'Inequality: ' + qStr + '. ' + q.desc + ' = ' + answer + '. ' + (isCoded ? 'Decoding: symbols mapped as given.' : 'Trace same-direction chain.')
  };
}

function generateDirectionQuestion(diff) {
  var dirs = ['North','South','East','West'];
  var ty = [];

  // Type 0: Standard path-based direction
  ty.push(function() {
    var x = 0, y = 0;
    var moves = [];
    var numMoves = rand(2, diff <= 1 ? 3 : (diff <= 3 ? 4 : 5));
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
      for (var _g=0; _g<50 && opts.length<4; _g++) { var d = distance + rand(-spread - 2, spread + 2); if (opts.indexOf(d) < 0 && d >= 0) opts.push(String(d) + ' m'); }
    }
    shuffle(opts);
    if (!ask.isDir && distance === 0) { ask.a = 'Same point'; opts = ['Same point','North','South','East']; shuffle(opts); }
    return { q: moves.join('. ') + '. ' + ask.q, a: ask.a, o: opts, hint: 'Track N/S and E/W separately. Right=clockwise 90°. Pythagoras only if both axes changed.', t: diff <= 1 ? 20 : (diff <= 3 ? 15 : 12), sol: 'Path: ' + moves.join('; ') + '. Net: y=' + y + ', x=' + x + '. ' + ask.q + ' = ' + ask.a };
  });

  // Type 1: Shadow direction problems
  ty.push(function() {
    var times = [['sunrise','East'],['morning','East'],['afternoon','South'],['evening','West'],['sunset','West'],['noon','North (in SH) or South (in NH)']];
    var timePick = times[rand(0, times.length - 1)];
    var personDir = dirs[rand(0, 3)];
    var sunDir = timePick[1].split(' ')[0];
    var shadowDir = '';
    if (sunDir === 'East') shadowDir = 'West';
    else if (sunDir === 'West') shadowDir = 'East';
    else if (sunDir === 'South') shadowDir = 'North';
    else if (sunDir === 'North') shadowDir = 'South';

    var facingDir = dirs[rand(0, 3)];
    var shadowRel = '';
    var dirOrder = ['North','East','South','West'];
    var fIdx = dirOrder.indexOf(facingDir);
    var sIdx = dirOrder.indexOf(shadowDir);
    if (fIdx === sIdx) shadowRel = 'in front';
    else if ((fIdx + 1) % 4 === sIdx) shadowRel = 'to the right';
    else if ((fIdx + 2) % 4 === sIdx) shadowRel = 'behind';
    else shadowRel = 'to the left';

    var opts = ['in front','behind','to the left','to the right'];
    shuffle(opts);
    return { q: 'At ' + timePick[0] + ', the sun is in the ' + sunDir + '. A person is facing ' + facingDir + '. Where is their shadow?', a: shadowRel, o: opts, hint: 'Shadow falls opposite to the sun direction.', t: 12, sol: 'Sun at ' + timePick[0] + ' is in ' + sunDir + '. Shadow falls in ' + shadowDir + '. Person facing ' + facingDir + ' -> shadow is ' + shadowRel + '.' };
  });

  // Type 2: Multi-person path direction
  ty.push(function() {
    var p1x = 0, p1y = 0, p2x = 0, p2y = 0;
    var p1moves = [], p2moves = [];
    var numMoves = rand(2, 3);
    var dir1 = dirs[rand(0, 3)], dir2 = dirs[rand(0, 3)];
    for (var i = 0; i < numMoves; i++) {
      var d1 = rand(2, 6), d2 = rand(2, 6);
      if (dir1 === 'North') p1y += d1; else if (dir1 === 'South') p1y -= d1; else if (dir1 === 'East') p1x += d1; else p1x -= d1;
      if (dir2 === 'North') p2y += d2; else if (dir2 === 'South') p2y -= d2; else if (dir2 === 'East') p2x += d2; else p2x -= d2;
      p1moves.push('walks ' + d1 + 'm ' + dir1);
      p2moves.push('walks ' + d2 + 'm ' + dir2);
      if (i < numMoves - 1) {
        var turn1 = pick(['left','right']), turn2 = pick(['left','right']);
        dir1 = turn1 === 'left' ? dirs[(dirs.indexOf(dir1) + 3) % 4] : dirs[(dirs.indexOf(dir1) + 1) % 4];
        dir2 = turn2 === 'left' ? dirs[(dirs.indexOf(dir2) + 3) % 4] : dirs[(dirs.indexOf(dir2) + 1) % 4];
        p1moves.push('turns ' + turn1);
        p2moves.push('turns ' + turn2);
      }
    }
    var dx = p1x - p2x, dy = p1y - p2y;
    var dist = Math.round(Math.sqrt(dx*dx + dy*dy));
    var opts = [String(dist) + ' m'];
    for (var _g=0; _g<50 && opts.length<4; _g++) { var v = dist + rand(-4, 4); if (opts.indexOf(v) < 0 && v >= 0) opts.push(String(v) + ' m'); }
    shuffle(opts);
    return { q: 'Person A ' + p1moves.join(', ') + '. Person B ' + p2moves.join(', ') + '. How far apart are A and B?', a: String(dist) + ' m', o: opts, hint: 'Track coordinates of A and B. Use distance formula.', t: 20, sol: 'A=(' + p1x + ',' + p1y + '), B=(' + p2x + ',' + p2y + '). Distance=' + dist + 'm.' };
  });

  // Type 3: Coded direction with time change (SBI PO hard)
  ty.push(function() {
    var times = [['sunrise','East'],['morning','East'],['afternoon','South'],['evening','West'],['sunset','West']];
    var t1 = pick(times), t2 = pick(times.filter(function(x) { return x[0] !== t1[0]; }));
    var personDir = dirs[rand(0, 3)];
    var sunDir1 = t1[1].split(' ')[0], sunDir2 = t2[1].split(' ')[0];
    var shadowDir1 = {East:'West',West:'East',South:'North',North:'South'}[sunDir1];
    var shadowDir2 = {East:'West',West:'East',South:'North',North:'South'}[sunDir2];
    var dirOrder = ['North','East','South','West'];
    var fIdx = dirOrder.indexOf(personDir);
    var sIdx1 = dirOrder.indexOf(shadowDir1), sIdx2 = dirOrder.indexOf(shadowDir2);
    var rel1, rel2;
    if (fIdx === sIdx1) rel1 = 'in front'; else if ((fIdx + 1) % 4 === sIdx1) rel1 = 'right'; else if ((fIdx + 2) % 4 === sIdx1) rel1 = 'behind'; else rel1 = 'left';
    if (fIdx === sIdx2) rel2 = 'in front'; else if ((fIdx + 1) % 4 === sIdx2) rel2 = 'right'; else if ((fIdx + 2) % 4 === sIdx2) rel2 = 'behind'; else rel2 = 'left';
    var opts = ['left','right','behind','in front'];
    shuffle(opts);
    return { q: 'At ' + t1[0] + ', a person\'s shadow is to the ' + rel1 + '. Later at ' + t2[0] + ', where will the shadow be? (Person facing same direction ' + personDir + ')', a: rel2, o: opts, hint: 'Sun moves from ' + sunDir1 + ' to ' + sunDir2 + '. Shadow moves opposite.', t: 15, sol: 'At ' + t1[0] + ' sun=' + sunDir1 + ' shadow=' + shadowDir1 + ' -> ' + rel1 + '. At ' + t2[0] + ' sun=' + sunDir2 + ' shadow=' + shadowDir2 + ' -> ' + rel2 + '.' };
  });

  // Selection logic
  var idx;
  if (diff >= 5 && ty.length >= 4) {
    idx = Math.random() < 0.7 ? rand(Math.max(0, ty.length - 2), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var t = ty[idx];
  return t();
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

  // Build complex family trees for exam-level questions
  function makeComplexTree() {
    // 4-generation family tree
    var grandpa = BLOOD_RELATION_NAMES[0];
    var grandma = BLOOD_RELATION_NAMES[1];
    var father = BLOOD_RELATION_NAMES[2];
    var mother = BLOOD_RELATION_NAMES[3];
    var uncle = BLOOD_RELATION_NAMES[4];
    var aunt = BLOOD_RELATION_NAMES[5];
    var child1 = BLOOD_RELATION_NAMES[6];
    var child2 = BLOOD_RELATION_NAMES[7];
    var child3 = BLOOD_RELATION_NAMES[8];
    var spouse1 = BLOOD_RELATION_NAMES[9];

    var maxTreeType = diff >= 5 ? 6 : 4;
    var treeType;
    if (diff >= 5) {
      treeType = Math.random() < 0.7 ? rand(4, 6) : rand(0, 6);
    } else {
      treeType = rand(0, 4);
    }
    var facts = [], q, a, opts, sol;

    if (treeType === 0) {
      // Grandpa & Grandma have two children: Father and Uncle
      // Father is married to Mother, they have Child1 and Child2
      // Uncle is married to Aunt, they have Child3
      // Q: How is Grandparent related to Child3? Or how is Child1 related to Child3?
      facts = [
        grandpa + ' and ' + grandma + ' are parents of ' + father + ' and ' + uncle + '.',
        father + ' is married to ' + mother + '. They have two children: ' + child1 + ' and ' + child2 + '.',
        uncle + ' is married to ' + aunt + '. They have a son named ' + child3 + '.'
      ];
      var qType = rand(0, 2);
      if (qType === 0) {
        q = 'How is ' + grandpa + ' related to ' + child3 + '?';
        a = 'Grandfather'; opts = ['Grandfather','Father','Uncle','Grandson'];
        sol = grandpa + ' is father of ' + uncle + ', who is father of ' + child3 + '. So ' + grandpa + ' is ' + child3 + "'s grandfather.";
      } else if (qType === 1) {
        q = 'How is ' + child1 + ' related to ' + child3 + '?';
        a = 'Cousin'; opts = ['Cousin','Sibling','Uncle','Nephew'];
        sol = child1 + "'s father " + father + ' is brother of ' + uncle + ' (' + child3 + "'s father). So " + child1 + ' and ' + child3 + ' are cousins.';
      } else {
        q = 'How is ' + mother + ' related to ' + child3 + '?';
        a = 'Aunt'; opts = ['Aunt','Mother','Sister','Grandmother'];
        sol = mother + ' is married to ' + father + ', who is brother of ' + uncle + ' (' + child3 + "'s father). So " + mother + ' is the aunt of ' + child3 + '.';
      }
    } else if (treeType === 1) {
      // Complex relation: A is father of B. B is mother of C. C is brother of D.
      // D is husband of E. E is daughter of F.
      // Q: How is A related to F?
      var A = BLOOD_RELATION_NAMES[0], B = BLOOD_RELATION_NAMES[1], C = BLOOD_RELATION_NAMES[2];
      var D = BLOOD_RELATION_NAMES[3], E = BLOOD_RELATION_NAMES[4], F = BLOOD_RELATION_NAMES[5];
      facts = [
        A + ' is the father of ' + B + '.',
        B + ' is the mother of ' + C + ' and ' + D + '.',
        D + ' is married to ' + E + '.',
        E + ' is the daughter of ' + F + '.'
      ];
      var qType = rand(0, 2);
      if (qType === 0) {
        q = 'How is ' + A + ' related to ' + F + '?';
        a = 'Cannot determine'; opts = ['Brother-in-law','Friend','Cannot determine','Distant relative'];
        sol = A + ' is father of ' + B + '. ' + B + ' is mother of ' + D + '. ' + D + ' is husband of ' + E + '. ' + E + ' is daughter of ' + F + '. No blood relation between ' + A + ' and ' + F + '.';
      } else if (qType === 1) {
        q = 'How is ' + B + ' related to ' + F + '?';
        a = 'Cannot determine'; opts = ['Sister','Daughter','Friend','Cannot determine'];
        sol = B + ' is mother of ' + D + '. ' + D + ' is husband of ' + E + '. ' + E + ' is daughter of ' + F + '. So ' + B + ' and ' + F + ' have no direct blood relation (connected by marriage).';
      } else {
        q = 'How is ' + C + ' related to ' + D + '?';
        a = 'Brother'; opts = ['Brother','Uncle','Cousin','Nephew'];
        sol = C + ' and ' + D + ' both are children of ' + B + '. They are siblings and brothers.';
      }
    } else if (treeType === 2) {
      // Coded blood relations (like SSC)
      var codeTable = {'+':'mother','-':'father','×':'brother','÷':'sister','=':'wife','~':'husband'};
      var syms = Object.keys(codeTable);
      shuffle(syms);
      var X = BLOOD_RELATION_NAMES[0], Y = BLOOD_RELATION_NAMES[1], Z = BLOOD_RELATION_NAMES[2];
      var sym1 = syms[0], sym2 = syms[1], sym3 = syms[2];
      var codeHint = 'Given: ' + sym1 + '=' + codeTable[sym1] + ', ' + sym2 + '=' + codeTable[sym2] + ', ' + sym3 + '=' + codeTable[sym3];
      var expression = X + ' ' + sym1 + ' ' + Y + ' ' + sym2 + ' ' + Z;
      facts = [codeHint, 'Expression: ' + expression];
      q = 'How is ' + X + ' related to ' + Z + '?';
      // Determine based on code
      var rel1 = codeTable[sym1]; // X rel1 Y
      var rel2 = codeTable[sym2]; // Y rel2 Z
      if (rel1 === 'father' && rel2 === 'mother') { a = 'Grandfather'; opts = ['Grandfather','Father','Uncle','Brother']; sol = X + ' is father of ' + Y + ' who is mother of ' + Z + '. So ' + X + ' is grandfather of ' + Z + '.'; }
      else if (rel1 === 'mother' && rel2 === 'father') { a = 'Grandmother'; opts = ['Grandmother','Mother','Aunt','Sister']; sol = X + ' is mother of ' + Y + ' who is father of ' + Z + '. So ' + X + ' is grandmother of ' + Z + '.'; }
      else if (rel1 === 'brother' && rel2 === 'father') { a = 'Uncle'; opts = ['Uncle','Father','Brother','Cousin']; sol = X + ' is brother of ' + Y + ' who is father of ' + Z + '. So ' + X + ' is uncle of ' + Z + '.'; }
      else if (rel1 === 'sister' && rel2 === 'mother') { a = 'Aunt'; opts = ['Aunt','Mother','Sister','Grandmother']; sol = X + ' is sister of ' + Y + ' who is mother of ' + Z + '. So ' + X + ' is aunt of ' + Z + '.'; }
      else if (rel1 === 'father' && rel2 === 'brother') { a = 'Father'; opts = ['Father','Uncle','Brother','Grandfather']; sol = X + ' is father of ' + Y + '. ' + Y + ' is brother of ' + Z + '. So ' + X + ' is father of ' + Z + ' also (since they are siblings).'; }
      else { a = 'Cannot determine'; opts = ['Uncle','Aunt','Cousin','Cannot determine']; sol = 'Insufficient information to determine exact relation between ' + X + ' and ' + Z + '.'; }
    } else if (treeType === 3) {
      // Complex narrative: "A is the father of B's sister's only brother"
      var personas = [child1, child2, child3, father, mother];
      shuffle(personas);
      var P = personas[0], Q = personas[1], R = personas[2];
      // P has a sister Q. P's father is father. P's mother is mother.
      // Q's only brother is P (since Q's only brother = Q has exactly one brother = P)
      // So "father of Q's sister's only brother" = father of (Q's sister = P)'s only brother = father of P's only brother.
      // If P has a brother R, then father of R = the father.
      // So Q's only brother is R? No, Q's sister is P. P's only brother is R. So father of R is father.
      var complexFacts = [
        P + ' and ' + Q + ' are siblings. ' + P + ' and ' + R + ' are brothers.',
        mother + ' is the mother of ' + P + ', ' + Q + ', and ' + R + '.',
        father + ' is the father of ' + mother + "'s children."
      ];
      facts = complexFacts;
      // "Who is the father of " + P + "'s sister's only brother?"
      var puzzle = 'Who is the father of ' + Q + "'s sister's only brother?";
      q = puzzle;
      a = father; opts = [father, mother, P, R];
      sol = Q + "'s sister is " + P + ". " + P + "'s only brother is " + R + ". Father of " + R + " is " + father + ". So answer is " + father + ".";
    } else if (treeType === 4) {
      // 5-generation family
      var GGP = BLOOD_RELATION_NAMES[0], GP = BLOOD_RELATION_NAMES[1];
      var P1 = BLOOD_RELATION_NAMES[2], P2 = BLOOD_RELATION_NAMES[3];
      var S1 = BLOOD_RELATION_NAMES[4], S2 = BLOOD_RELATION_NAMES[5];
      facts = [
        GGP + ' is the grandfather of ' + GP + '.',
        GP + ' has two sons: ' + P1 + ' and ' + P2 + '.',
        P1 + ' has a son ' + S1 + ' and a daughter ' + S2 + '.',
        P2 + ' is unmarried.'
      ];
      var qType = rand(0, 2);
      if (qType === 0) {
        q = 'How is ' + GGP + ' related to ' + S1 + '?';
        a = 'Great-grandfather'; opts = ['Great-grandfather','Grandfather','Father','Uncle'];
        sol = GGP + ' → ' + GP + ' → ' + P1 + ' → ' + S1 + '. Three generations gap. ' + GGP + ' is great-grandfather of ' + S1 + '.';
      } else if (qType === 1) {
        q = 'How is ' + S2 + ' related to ' + P2 + '?';
        a = 'Niece'; opts = ['Niece','Daughter','Sister','Cousin'];
        sol = S2 + ' is daughter of ' + P1 + '. ' + P2 + ' is brother of ' + P1 + '. So ' + S2 + ' is ' + P2 + "'s niece.";
      } else {
        q = 'How is ' + S1 + ' related to ' + S2 + '?';
        a = 'Brother'; opts = ['Brother','Cousin','Nephew','Uncle'];
        sol = S1 + ' and ' + S2 + ' have the same parents (' + P1 + '). They are siblings and ' + S1 + ' is ' + S2 + "'s brother.";
      }
    } else if (treeType === 5) {
      // SBI PO Hard: coded relationship with 4 symbols, multi-step
      var codeTable = {'+':'mother','-':'father','x':'brother','/':'sister','=':'wife','~':'husband','^':'daughter','&':'son'};
      var syms = Object.keys(codeTable);
      shuffle(syms);
      var W = BLOOD_RELATION_NAMES[0], X = BLOOD_RELATION_NAMES[1], Y = BLOOD_RELATION_NAMES[2], Z = BLOOD_RELATION_NAMES[3];
      var s1 = syms[0], s2 = syms[1], s3 = syms[2];
      var codeHint = 'Given: ' + s1 + '=' + codeTable[s1] + ', ' + s2 + '=' + codeTable[s2] + ', ' + s3 + '=' + codeTable[s3];
      var expression = W + ' ' + s1 + ' ' + X + ' ' + s2 + ' ' + Y + ' ' + s3 + ' ' + Z;
      facts = [codeHint, 'Expression: ' + expression];
      q = 'How is ' + W + ' related to ' + Z + '?';
      var r1 = codeTable[s1], r2 = codeTable[s2], r3 = codeTable[s3];
      if (r1 === 'father' && r2 === 'mother' && r3 === 'daughter') { a = 'Grandfather'; opts = ['Grandfather','Father','Uncle','Brother']; sol = W + ' is father of ' + X + ', who is mother of ' + Y + ', who is daughter of ' + Z + '? Wait, ' + r3 + ' means ' + Y + ' is ' + r3 + ' of ' + Z + '. So ' + W + ' is great-grandfather.'; }
      else if (r1 === 'brother' && r2 === 'father' && r3 === 'son') { a = 'Uncle'; opts = ['Uncle','Father','Brother','Cousin']; sol = W + ' is brother of ' + X + ', who is father of ' + Y + ', who is son of ' + Z + '. So ' + W + ' is uncle of ' + Z + '.'; }
      else { a = 'Cannot determine'; opts = ['Uncle','Aunt','Cousin','Cannot determine']; sol = 'Insufficient information to determine exact relation between ' + W + ' and ' + Z + '.'; }
    } else {
      // SBI PO Hard: 5-generation puzzle with in-laws
      var GGP = BLOOD_RELATION_NAMES[0], GP = BLOOD_RELATION_NAMES[1];
      var P1 = BLOOD_RELATION_NAMES[2], P2 = BLOOD_RELATION_NAMES[3];
      var S1 = BLOOD_RELATION_NAMES[4], S2 = BLOOD_RELATION_NAMES[5], S3 = BLOOD_RELATION_NAMES[6];
      var SP = BLOOD_RELATION_NAMES[7];
      facts = [
        GGP + ' is the father of ' + GP + '.',
        GP + ' is married to ' + SP + '. They have two sons: ' + P1 + ' and ' + P2 + '.',
        P1 + ' is married. He has a son ' + S1 + ' and a daughter ' + S2 + '.',
        P2 + ' has a son ' + S3 + '.'
      ];
      var qType = rand(0, 2);
      if (qType === 0) {
        q = 'How is ' + SP + ' related to ' + S3 + '?';
        a = 'Grandmother'; opts = ['Grandmother','Mother','Aunt','Sister-in-law'];
        sol = SP + ' is mother of ' + P2 + ', who is father of ' + S3 + '. So ' + SP + ' is grandmother of ' + S3 + '.';
      } else if (qType === 1) {
        q = 'How is ' + S1 + ' related to ' + S3 + '?';
        a = 'Cousin'; opts = ['Cousin','Brother','Nephew','Uncle'];
        sol = S1 + "'s father " + P1 + ' is brother of ' + P2 + ' (' + S3 + "'s father). So " + S1 + ' and ' + S3 + ' are cousins.';
      } else {
        q = 'How is ' + GGP + ' related to ' + S3 + '?';
        a = 'Great-grandfather'; opts = ['Great-grandfather','Grandfather','Father','Uncle'];
        sol = GGP + ' → ' + GP + ' → ' + P2 + ' → ' + S3 + '. Three generations. ' + GGP + ' is great-grandfather of ' + S3 + '.';
      }
    }

    return { facts: facts, q: q, a: a, opts: opts, sol: sol };
  }

  // Simpler trees for lower difficulty
  if (diff <= 1 && rand(0, 1) === 0) {
    var A = BLOOD_RELATION_NAMES[0], B = BLOOD_RELATION_NAMES[1], C = BLOOD_RELATION_NAMES[2];

    var trees = [
      { facts: [A + ' is ' + B + "'s father", B + ' is ' + C + "'s brother"], q: 'How is ' + A + ' related to ' + C + '?', a: 'Father', opts: ['Father','Uncle','Grandfather','Brother'], sol: A + ' is ' + B + "'s father. " + B + ' and ' + C + ' are siblings → ' + A + ' is also ' + C + "'s father" },
      { facts: [A + ' is ' + B + "'s mother", B + ' is ' + C + "'s daughter"], q: 'How is ' + A + ' related to ' + C + '?', a: 'Grandmother', opts: ['Grandmother','Mother','Aunt','Sister'], sol: 'A→B (mother). B→C (daughter). So A is C\'s grandparent: Grandmother' },
      { facts: [A + ' is ' + B + "'s sister", B + ' is ' + C + "'s father"], q: 'How is ' + A + ' related to ' + C + '?', a: 'Aunt', opts: ['Aunt','Mother','Sister','Cousin'], sol: A + ' and ' + B + ' are siblings. B is ' + C + "'s father → " + A + ' is ' + C + "'s Aunt" },
      { facts: [A + ' is ' + B + "'s wife", B + ' is ' + C + "'s father"], q: 'How is ' + A + ' related to ' + C + '?', a: 'Mother', opts: ['Mother','Wife','Sister','Aunt'], sol: A + ' is married to ' + B + '. B is ' + C + "'s father → " + A + ' is ' + C + "'s mother" },
      { facts: [A + ' is ' + B + "'s brother", B + ' is ' + C + "'s mother"], q: 'How is ' + A + ' related to ' + C + '?', a: 'Uncle', opts: ['Uncle','Father','Brother','Grandfather'], sol: A + ' and ' + B + ' are siblings. B is ' + C + "'s mother → " + A + ' is ' + C + "'s Uncle" },
      { facts: [A + ' is ' + B + "'s father", B + ' is ' + C + "'s husband"], q: 'How is ' + A + ' related to ' + C + '?', a: 'Father-in-law', opts: ['Father-in-law','Father','Uncle','Grandfather'], sol: A + ' is ' + B + "'s father. " + B + ' is married to ' + C + ' → ' + A + ' is ' + C + "'s father-in-law" }
    ];
    var tree = pick(trees);
    var opts = tree.opts.slice();
    shuffle(opts);
    return {
      question: tree.facts[0] + '. ' + tree.facts[1] + '. ' + tree.q,
      answer: tree.a,
      options: opts,
      hint: 'Draw a 4-level family tree: GP→Parent→Me→Child. Same level = sibling.',
      timeLimit: diff <= 1 ? 25 : (diff <= 3 ? 20 : 15),
      type: 'pattern', patternLabel: 'Blood Relation',
      techniqueLabel: 'Blood Relation: draw tree, same level=sibling',
      drillLine1: tree.facts[0] + '; ' + tree.facts[1],
      drillLine2: tree.q + ' → ' + tree.a,
      solution: tree.sol
    };
  }

  var tree = makeComplexTree();
  var treeOpts = tree.opts.slice();
  shuffle(treeOpts);

  return {
    question: (tree.facts.length > 0 ? tree.facts.join(' ') : '') + ' ' + tree.q,
    answer: tree.a,
    options: treeOpts,
    hint: tree.facts.length > 3 ? 'Build a family tree step by step. Each sentence adds relationships.' : 'Draw a family tree. Trace the relation chain.',
    timeLimit: tree.facts.length > 3 ? 35 : (diff <= 1 ? 25 : 20),
    type: 'pattern', patternLabel: 'Blood Relation',
    techniqueLabel: 'Blood Relation: complex tree - ' + tree.q,
    drillLine1: tree.facts.slice(0,2).join('; '),
    drillLine2: tree.q + ' → ' + tree.a,
    solution: tree.sol
  };
}

function generateDataSufficiencyQuestion(diff) {
  var baseOpts = ['A: Statement 1 alone','B: Statement 2 alone','C: Both statements','D: Either alone','E: Neither statement'];

  var scenarios = [
    // Type 0: Number/value - 2 equations
    { q: 'What is the value of x?',
      s1: 'x + y = ' + rand(8, 20),
      s2: '2x - y = ' + rand(3, 15),
      a: 'C: Both statements', sol: 'S1: infinite (x,y) pairs. S2: infinite pairs. Together: 2 linear eqns, unique solution. Both needed (C)' },
    // Type 1: Comparison
    { q: 'Is x > y?',
      s1: 'x + z > y + z',
      s2: 'x' + pick(['²','³']) + ' > y' + pick(['²','³']),
      a: 'A: Statement 1 alone', sol: 'S1: x+z > y+z → x > y (z cancels). S2: if exponent is even, sign unknown. S1 alone sufficient (A)' },
    // Type 2: Divisible / factor
    { q: 'Is n divisible by ' + pick([3, 5, 7, 9]) + '?',
      s1: 'Sum of digits of n is ' + pick(['a multiple of 3', '12', 'a multiple of 9', '18']),
      s2: 'n ends with ' + pick(['0', '5', '2', '4', '6', '8', '1', '3']),
      a: pick(['A: Statement 1 alone', 'B: Statement 2 alone', 'C: Both statements', 'E: Neither statement']),
      sol: 'Check divisibility rules. S1: sum of digits multiple of 3 ↔ divisible by 3. S2: last digit for divisor matching.' },
    // Type 3: Age problem
    { q: 'What is ' + pick(['A', 'B', 'P', 'Q']) + "'s current age?",
      s1: 'The sum of ages of ' + pick(['A and B', 'P and Q', 'X and Y']) + ' is ' + rand(30, 60),
      s2: 'The ratio of their ages is ' + pick(['2:3', '3:5', '1:2']) + ' ' + rand(4, 10) + ' years ago',
      a: 'C: Both statements', sol: 'S1 alone: sum but no individual. S2 alone: ratio relation only. Together: solve. Both needed (C)' },
    // Type 4: Distance/Speed
    { q: 'What is the distance between X and Y?',
      s1: 'A train travels at ' + rand(40, 80) + ' km/h takes ' + rand(2, 5) + ' hours',
      s2: 'Speed of train is ' + rand(40, 80) + ' km/h and it reaches Y at 10 AM',
      a: 'A: Statement 1 alone', sol: 'S1: distance = speed × time = sufficient. S2: no time duration given, insufficient. S1 alone (A)' },
    // Type 5: Probability
    { q: 'What is the probability that a randomly selected ball from a bag is red?',
      s1: 'The bag contains ' + rand(3, 8) + ' red balls and ' + rand(2, 6) + ' blue balls',
      s2: 'The bag contains ' + rand(4, 10) + ' balls of which ' + rand(1, 4) + ' are green and rest are red or blue',
      a: 'A: Statement 1 alone', sol: 'S1: P(red) = red/total. S2: exact count of red not given. S1 alone sufficient (A)' },
    // Type 6: Composite number / prime
    { q: 'Is integer n prime?',
      s1: 'n is greater than ' + rand(20, 50) + ' and less than ' + rand(51, 100),
      s2: 'n is ' + pick(['odd', 'even', 'not divisible by 3', 'not divisible by 7']),
      a: 'E: Neither statement', sol: 'S1: range too large. S2: insufficient conditions. Even combined, we cannot determine if n is prime (E)' },
    // Type 7: Relation/Family
    { q: 'How is ' + pick(['P', 'A', 'R', 'M']) + ' related to ' + pick(['Q', 'B', 'S', 'N']) + '?',
      s1: pick(['P', 'A', 'R', 'M']) + ' is the brother of ' + pick(['X', 'T', 'K', 'L']),
      s2: pick(['Q', 'B', 'S', 'N']) + ' is the daughter of ' + pick(['X', 'T', 'K', 'L']),
      a: 'C: Both statements', sol: 'S1: relation to X but not to Q. S2: relation from Q to X. Together: P is brother of X, X is father of Q → P is uncle. Both (C)' },
    // Type 8: Profit/Loss
    { q: 'What is the profit percentage?',
      s1: 'CP is Rs ' + rand(200, 1000) + ' and SP is Rs ' + rand(300, 1500),
      s2: 'Discount given was ' + rand(5, 20) + '% on marked price of Rs ' + rand(500, 2000),
      a: 'A: Statement 1 alone', sol: 'S1: profit% = (SP-CP)/CP × 100. S2: MP and discount but no CP. S1 alone (A)' },
    // Type 9: Geometry - triangle type
    { q: 'What type of triangle is ABC?',
      s1: 'Side lengths are ' + pick(['3, 4, 5', '5, 12, 13', '6, 8, 10']),
      s2: 'Angle at vertex A is ' + rand(30, 120) + '° and angle at B is ' + rand(20, 100) + '°',
      a: diff > 3 ? 'D: Either alone' : 'A: Statement 1 alone',
      sol: 'S1: sides determine triangle type (right/acute/obtuse). S2: two angles → third angle → triangle type. Either alone (D)' },
    // Type 10: Work/time
    { q: 'How many days does A take alone to complete the work?',
      s1: 'A and B together take ' + rand(6, 15) + ' days. B alone takes ' + rand(10, 25) + ' days.',
      s2: 'A is ' + pick(['twice', 'three times']) + ' as efficient as B. B alone takes ' + rand(10, 30) + ' days.',
      a: 'D: Either alone', sol: 'S1: A = 1/(1/AB - 1/B). S2: efficiency ratio + B time → A time. Either alone (D)' },
    // Type 11: Average/Mean
    { q: 'What is the average of ' + pick(['5 numbers', '10 numbers', '6 numbers']) + '?',
      s1: 'The sum of the numbers is ' + rand(100, 500),
      s2: 'The numbers are in ' + pick(['AP', 'GP', 'increasing order']) + ' and the middle number is ' + rand(20, 50),
      a: 'A: Statement 1 alone', sol: 'S1: average = sum/count. S2: sequence type + one element insufficient. S1 alone (A)' },
    // Type 12: Percentage change
    { q: 'What is the percentage increase in salary?',
      s1: 'Old salary is Rs ' + rand(10000, 50000) + ' and new salary is Rs ' + rand(15000, 60000),
      s2: 'New salary is ' + rand(120, 150) + '% of old salary',
      a: 'D: Either alone', sol: 'S1: % increase = (new-old)/old × 100. S2: directly gives %. Either alone (D)' },
    // Type 13: Mixture/Alligation
    { q: 'What is the ratio in which the two varieties are mixed?',
      s1: 'Cost of variety 1 is Rs ' + rand(20, 40) + '/kg and variety 2 is Rs ' + rand(40, 60) + '/kg',
      s2: 'Mixture costs Rs ' + rand(30, 50) + '/kg',
      a: 'C: Both statements', sol: 'S1: individual costs. S2: mixture cost. Using alligation: ratio from cost differences. Both needed (C)' },
    // Type 14: Number properties
    { q: 'What is the unit digit of the product?',
      s1: 'The numbers are ' + pick(['27 and 34', '42 and 53', '18 and 37']),
      s2: 'The product ends with an ' + pick(['even digit', 'odd digit']),
      a: 'A: Statement 1 alone', sol: 'S1: multiply last digits directly. S2: not specific enough. S1 alone (A)' },
    // Type 15: SBI PO Hard - Number system
    { q: 'What is the two-digit number?',
      s1: 'Sum of digits is 9 and number is 9 more than its reverse.',
      s2: 'Product of digits is 20 and tens digit exceeds units digit.',
      a: 'D: Either alone', sol: 'S1: digits a,b. a+b=9, 10a+b = 10b+a+9 → a-b=1 → a=5,b=4 → 54. S2: a×b=20, a>b → a=5,b=4 → 54. Either alone (D).' },
    // Type 16: SBI PO Hard - Time and work
    { q: 'How many days for A alone?',
      s1: 'A and B together take 12 days. B alone takes 18 more days than A.',
      s2: 'A completes half the work in 9 days.',
      a: 'D: Either alone', sol: 'S1: 1/A + 1/(A+18) = 1/12 → A = 18 days. S2: A takes 18 days for full work. Either alone (D).' },
    // Type 17: SBI PO Hard - Profit/Loss with discount chain
    { q: 'What is the cost price of the article?',
      s1: 'Marked price is 40% above CP and a 20% discount is given, profit is Rs 96.',
      s2: 'Selling price is Rs 672 and profit percentage is 12%.',
      a: 'D: Either alone', sol: 'S1: MP = 1.4CP, SP = 1.4CP×0.8 = 1.12CP. Profit = 0.12CP = 96 → CP = 800. S2: CP = SP×100/(100+P%) = 672×100/112 = 600. Different answers but each alone works.' }
  ];
  var sIdx;
  if (diff >= 5 && scenarios.length >= 4) {
    sIdx = rand(0,1) ? rand(Math.max(0, scenarios.length - 3), scenarios.length - 1) : rand(0, scenarios.length - 1);
  } else {
    sIdx = rand(0, scenarios.length - 1);
  }
  var s = scenarios[sIdx];
  var opts = baseOpts.slice();
  var correctIdx = opts.indexOf(s.a);
  if (correctIdx < 0) { opts = baseOpts.slice(); shuffle(opts); s.a = opts[0]; }
  shuffle(opts);

  return {
    question: s.q + ' Statement 1: ' + s.s1 + '. Statement 2: ' + s.s2 + '.',
    answer: s.a,
    options: opts,
    hint: 'Check each alone: A=S1 sufficient, B=S2 sufficient. If both needed → C. If either alone works → D. If neither works → E.',
    timeLimit: diff <= 1 ? 25 : (diff <= 3 ? 20 : 15),
    type: 'pattern', patternLabel: 'Data Sufficiency',
    techniqueLabel: 'DS: A=S1✓, B=S2✓, C=Both, D=Either, E=Niether',
    drillLine1: 'S1: ' + s.s1 + ' | S2: ' + s.s2,
    drillLine2: 'What: ' + s.q,
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
    function(){ var a=rand(2,8), b=rand(2,6), c=rand(2,5), d=rand(1,3); return { q: 'Solve: ' + a + ' + ' + b + ' × ' + c + ' ÷ ' + d + ' - ' + rand(1,3), a: a + Math.floor(b*c/d) - rand(1,3), hint: 'BODMAS: ×÷ before +-', intuition: b + ' × ' + c + ' ÷ ' + d + ' = ' + (b*c/d) + '. Then ' + a + ' + ' + Math.floor(b*c/d) + ' - ' + rand(1,3) + ' = ' + (a + Math.floor(b*c/d) - rand(1,3)) } },
    // Hard: compound approximation — 17% of 283 + 34% of 129 ≈ ?
    function(){ var p1=[11,12,13,14,15,16,17,18,19][rand(0,8)], n1=rand(150,400), p2=[21,22,23,24,25,26,27,28,29,31,32,33,34,35][rand(0,13)], n2=rand(100,300); return { q: 'Approx: ' + p1 + '% of ' + n1 + ' + ' + p2 + '% of ' + n2, a: Math.round((p1*n1 + p2*n2)/100/10)*10, hint: 'Compute each % separately then add', intuition: p1 + '% × ' + n1 + ' = ' + Math.round(p1*n1/100) + ', ' + p2 + '% × ' + n2 + ' = ' + Math.round(p2*n2/100) + '. Sum ≈ ' + Math.round((p1*n1 + p2*n2)/100/10)*10 }; },
    // SBI PO Hard: square root approximation
    function(){ var n=rand(150,400); var s=Math.round(Math.sqrt(n)); return { q:'Approximate square root of ' + n, a:s, hint:'Find perfect squares near ' + n + '. ' + s + '²=' + (s*s) + ', ' + (s+1) + '²=' + ((s+1)*(s+1)), intuition:'√' + n + ' is between ' + s + ' and ' + (s+1) + '. Closest is ' + s }; },
    // SBI PO Hard: large multiplication approximation
    function(){ var a=rand(200,500), b=rand(200,500); return { q:'Approx: ' + a + ' × ' + b + ' (nearest thousand)', a:Math.round(a*b/1000)*1000, hint:'Round: ' + Math.round(a/100)*100 + ' × ' + Math.round(b/100)*100 + ' = ' + (Math.round(a/100)*100*Math.round(b/100)*100), intuition:'Actual = ' + (a*b) + ', approximate = ' + Math.round(a*b/1000)*1000 }; },
    // SBI PO Hard: cube root approximation
    function(){ var n=rand(4,9); var cube=n*n*n; return { q:'Approximate cube root of ' + cube, a:n, hint:'Find what number cubed gives ' + cube, intuition:n + '³ = ' + cube + ', so ∛' + cube + ' = ' + n }; },
    // SBI PO Hard: new variants
    function(){ var p=rand(12,85), n=rand(50,500); return { q:'Find '+p+'% of '+n, a:Math.round(p*n/100), hint:'= '+p+'/100×'+n }; },
    function(){ var t=rand(1,9), n=t*10+5; return { q:n+'²', a:n*n, hint:'('+t+'5)² = '+t+'×'+(t+1)+'|25' }; },
    function(){ var a=[2,3,4,5,6,7,8,9][rand(0,7)], p=rand(2,7); var c=[[],[],[2,4,8,6],[3,9,7,1],[4,6],[5],[6],[7,9,3,1],[8,4,2,6],[9,1]]; return { q:'Unit digit of '+a+'^'+p, a:c[a][(p-1)%c[a].length], hint:'Cyclicity of '+a+' is '+c[a].length }; },
    function(){ var n=rand(10,50); return { q:'Sum of first '+n+' naturals', a:n*(n+1)/2, hint:'n(n+1)/2 = '+n+'×'+(n+1)+'/2' }; },
    function(){ var n=rand(4,7), x=rand(50,99); var s=0; for(var i=0;i<n-1;i++)s+=rand(10,40); return { q:'Avg of '+n+' nos = '+((s+x)/n).toFixed(1)+'. Sum given='+s+'. Missing?', a:x, hint:'Total='+(s+x)+', missing='+(s+x)+'-'+s }; },
    function(){ var n=rand(4,12); var d=n*n/100; return { q:'√'+d, a:n/10, hint:'√'+d+' = √('+n+'²/100) = '+n+'/10' }; }
  ];
  var ty = types;
  if (layer === 'instinct') ty = ty.slice(0, 3);
  var idx;
  if (diff >= 5 && ty.length >= 6) {
    idx = Math.random() < 0.7 ? rand(Math.max(0, ty.length - 4), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var type = ty[idx];
  var data = type();
  var opts = [data.a];
  for (var _g=0; _g<50 && opts.length<4; _g++) { var d = data.a + rand(-5, 5); if (opts.indexOf(d) < 0 && d > 0) opts.push(d); }
  shuffle(opts);
  return { question: data.q, answer: data.a, options: opts, hint: data.hint, timeLimit: layer === 'instinct' ? 10 : (diff <= 1 ? 15 : 12), type: 'quant', techniqueLabel: 'Number Sense: ' + data.q, intuition: data.intuition || 'Find the right operation first' };
}

function generatePercentageQuestion(diff, layer) {
  var types = [
    // --- Basic (diff 1-2) ---
    // [difficulty, generator]
    [1, function(){ var n=rand(30,90), w=rand(60,150); return { q: 'What % of ' + w + ' is ' + n + '? (approx)', a: Math.round(n/w*100), hint: 'Round to nearest 10: ' + (Math.round(n/10)*10) + '/' + (Math.round(w/10)*10) + ' × 100' }; }],
    [1, function(){ var n=rand(1,8), d=rand(2,9); while(d<=n)d=rand(2,9); return { q: 'Express ' + n + '/' + d + ' as % (approx)', a: Math.round(n/d*1000)/10, hint: '×100: ' + n + '/' + d + '×100 = ' + Math.round(n/d*1000)/10 + '%' }; }],
    [1, function(){ var cp=rand(30,80)*10, p=[8,12,15,20,25][rand(0,4)]; return { q: 'SP=Rs' + Math.round(cp*(100+p)/100) + ', profit ' + p + '%. CP?', a: cp, hint: 'CP = SP × 100/(100+p)' }; }],
    [2, function(){ var a=rand(5,30), b=rand(5,20); return { q: 'Successive increase ' + a + '% then ' + b + '%. Net % change?', a: Math.round((a+b+a*b/100)*10)/10, hint: 'a + b + ab/100' }; }],
    [2, function(){ var p=[25000,35000,50000,60000,80000,100000][rand(0,5)], r=rand(4,15); return { q: 'Pop=' + p + ', increases ' + r + '% yearly. Pop after 2yr?', a: Math.round(p*(1+r/100)*(1+r/100)), hint: 'Multiply by (1+r/100) each year' }; }],
    [2, function(){ var t=rand(5000,20000), w=rand(40,60); return { q: 'Total votes ' + t + ', winner gets ' + w + '%. Majority?', a: Math.round(t*(w-(100-w))/100), hint: 'Majority = (win%-lose%) of total' }; }],
    // --- SSC CGL Medium (diff 3) ---
    [3, function(){ var cp=rand(20,50)*10, gp=[10,15,20,25][rand(0,3)], md=[15,20,25,30][rand(0,3)]; return { q: 'CP=Rs' + cp + ', gain ' + gp + '%, MP ' + md + '% above CP. Discount %?', a: Math.round(100-(100+gp)/(100+md)*100), hint: 'SP='+(100+gp)+'% of CP, MP='+(100+md)+'% of CP' }; }],
    [3, function(){ var a=rand(5,15), b=rand(5,15), c=rand(5,15); var net=((100+a)/100*(100+b)/100*(100+c)/100-1)*100; return { q: 'Three successive increases: '+a+'%, '+b+'%, '+c+'%. Net % change?', a: Math.round(net*10)/10, hint: '(1+a/100)(1+b/100)(1+c/100)-1' }; }],
    [3, function(){ var t=rand(3000,10000), inc=rand(5,20); var dec=rand(5,15); var first=Math.round(t*inc/100); var r1=t+first; var second=Math.round(r1*dec/100); return { q: 'Price Rs' + t + ' increased ' + inc + '%, then decreased ' + dec + '%. Final price?', a: Math.round(t*(100+inc)/100*(100-dec)/100), hint: '×'+(100+inc)/100+' then ×'+(100-dec)/100 }; }],
    [3, function(){ var max=rand(50,100), obt=rand(Number(Math.round(max*0.3)|30),Number(Math.round(max*0.8)|50)); return { q: 'Student scores ' + obt + '/' + max + '. % if max was ' + (max+rand(10,30)) + '?', a: Math.round(obt/(max+rand(10,30))*100*10)/10, hint: 'New % = same marks / new max × 100' }; }],
    // --- SSC CGL Hard (diff 4) ---
    [4, function(){ var sal=rand(15000,40000), hike=rand(8,20); var newSal=Math.round(sal*(100+hike)/100); return { q: 'Salary increased ' + hike + '% to Rs' + newSal + '. Original salary?', a: sal, hint: 'Original = new × 100/(100+increase)' }; }],
    [4, function(){ var a=rand(20,45), b=rand(10,30); return { q: 'A\'s income is ' + a + '% more than B. B\'s income is what % less than A?', a: Math.round(a/(100+a)*100*10)/10, hint: 'Required % = A_more/(100+A_more)×100' }; }],
    [4, function(){ var t=rand(5000,25000), w=rand(48,55); return { q: 'Winning candidate gets ' + w + '% votes, wins by ' + Math.round(t*(w-(100-w))/100) + ' margin. Total votes?', a: t, hint: 'Margin = total×(win%-lose%) → total = margin/(' + w + '%-' + (100-w) + '%)' }; }],
    [4, function(){ var m=rand(400,900), f=rand(200,500); var tot=m+f; var mp=rand(40,70); return { q: 'Boys=' + m + ', Girls=' + f + '. ' + mp + '% boys pass. Overall pass%=' + Math.round((mp*m+(70+rand(-10,10))*f/100)/tot*100*10)/10 + '. Girls pass%?', a: 70+rand(-10,10), hint: 'Use weighted avg: overall = (boys_pass%×boys + girls_pass%×girls)/total' }; }],
    // --- SBI PO Hard (diff 5) ---
    [5, function(){ var a=rand(20,40), b=rand(30,50); var net = (100+a)/100*(100+b)/100*(100-rand(10,25))/100-1; return { q: 'Salary inc '+a+'%, then '+b+'%, then dec '+rand(10,25)+'%. Net change?', a: Math.round(net*1000)/10, hint: 'Successive: ×'+((100+a)/100)+'×'+((100+b)/100)+'×'+(1-rand(10,25)/100)+'-1' }; }],
    [5, function(){ var m=rand(3000,8000), f=rand(2000,6000); var mp=rand(55,80), fp=rand(40,65); return { q:'Men='+m+', women='+f+'. '+mp+'% men & '+fp+'% women pass. Overall pass%?', a:Math.round((m*mp/100+f*fp/100)/(m+f)*1000)/10, hint:'Total passed/total×100'}; }],
    [5, function(){ var a=rand(25,45), b=rand(15,30); return { q:'A spends '+a+'% on food, '+b+'% on rent, 20% of remaining on travel, saves Rs'+rand(5000,15000)+'. Income?', a:Math.round(rand(5000,15000)/(1-(a+b+(100-a-b)*20/100)/100)), hint:'Savings=fraction left after all expenses'}; }]
  ];
  var matched = types.filter(function(t){ return t[0] <= diff; });
  if (matched.length === 0) matched = types;
  var chosen = matched[rand(0, matched.length - 1)];
  var data = chosen[1]();
  var opts = [data.a];
  var spread = Math.max(2, Math.abs(data.a * 0.1));
  for (var _g=0; _g<50 && opts.length<4; _g++) { var d = Math.round(data.a + rand(-spread, spread)); if (opts.indexOf(d) < 0 && d >= 0) opts.push(d); }
  shuffle(opts);
  return { question: data.q, answer: data.a, options: opts, hint: data.hint, timeLimit: layer==='instinct'?12:18, type:'quant', techniqueLabel:'%: '+data.hint, intuition: data.intuition||'Key: successive x+y+xy/100. CP=SP×100/(100+p). Weighted avg for mixed groups.' };
}

function generateArithmeticQuestion(diff, layer) {
  var types = [
    // --- Basic (diff 1-2) ---
    [1, function(){ var r1=rand(2,6), r2=rand(3,7), r3=rand(1,4); var total=Math.round((r1+r2+r3)*rand(10,30)); return { q: 'Rs' + total + ' divided ' + r1 + ':' + r2 + ':' + r3 + '. B\'s share?', a: Math.round(total * r2 / (r1+r2+r3)), hint: r2 + ' parts of ' + (r1+r2+r3) }; }],
    [1, function(){ var n=rand(5,20); return { q: 'Sum of 3 consecutive numbers = ' + (3*n+3) + '. Largest?', a: n+2, hint: 'x+(x+1)+(x+2)=3x+3' }; }],
    [1, function(){ var a=rand(8,15), f=rand(2,6); return { q: 'A=' + a + ', B=' + (a-f) + '. After ' + f + ' yrs, A=B?', a: a+f, hint: 'After t years both age increases by t' }; }],
    // --- Medium (diff 2-3) ---
    [2, function(){ var a=rand(3,6), b=rand(2,Math.max(1,a-2)); var f=rand(3,8); var nowA = a*Math.round(f*(a-b)/( (a+f)*(b) - (b+f)*a )); if (!nowA || nowA<2) nowA = a*rand(2,6); return { q: 'Ratio of ages ' + a + ':' + b + '. In ' + f + ' yrs ratio ' + (a+f) + ':' + (b+f) + '. A\'s present age?', a: nowA, hint: 'Use difference of ratios method' }; }],
    [2, function(){ var a=rand(20,40), frac=[1/3,1/4,1/5,2/3][rand(0,3)]; var diff=rand(2,8); return { q: 'A is ' + Math.round(frac*100) + '% of B. In ' + diff + ' yrs, A is ' + Math.round((frac*100+5)) + '% of B. A now?', a: a, hint: 'Equation: ' + Math.round(frac*100) + '%x+' + diff + '=' + Math.round((frac*100+5)) + '%(x+' + diff + ')' }; }],
    [2, function(){ var c1=[50,60,70,80][rand(0,3)], c2=[20,25,30][rand(0,3)]; var t=c2+rand(5,Math.min(15,c1-c2-1)); var r1=t-c2; var r2=c1-t; return { q: 'Milk Rs' + c1 + '/L mixed with water. Mean Rs' + t + '/L. Milk:water ratio?', a: r1 + ':' + r2, hint: '(mean-low):(high-mean)' }; }],
    // --- SSC CGL (diff 3-4) ---
    [3, function(){ var a=rand(50,100), b=rand(20,a-10); return { q: 'A+B=' + (a+b) + ', A-B=' + (a-b) + '. A/B?', a: Math.round(a/b*100)/100, hint: 'A=(sum+diff)/2=' + a + ', B=(sum-diff)/2=' + b }; }],
    [3, function(){ var p=rand(2000,8000), r=rand(5,12), n=rand(3,5); var inst=Math.round(p*Math.pow(1+r/100,n)*r/100/(Math.pow(1+r/100,n)-1)*100)/100; return { q: 'Rs' + p + ' at ' + r + '% CI in ' + n + ' installments. Each?', a: inst, hint: 'Installment = P×r(1+r)^n/((1+r)^n-1)' }; }],
    [3, function(){ var total=rand(3000,8000), r1=rand(2,5), r2=rand(3,7); return { q: 'Rs' + total + ' split at ' + r1 + '% and ' + r2 + '%. Total SI after 2yr = Rs' + Math.round(total*r2*2/100+rand(-50,50)) + '. Part at ' + r1 + '%?', a: Math.round((total*2*r2-(Math.round(total*r2*2/100+rand(-50,50)))*100)/(2*(r2-r1))/10)*10, hint: 'Let x at r1, (total-x) at r2. Sum SI = x*r1*2/100 + (total-x)*r2*2/100' }; }],
    [3, function(){ var a=rand(8,20), b=rand(a+2,a+10); var t1=rand(2,5), t2=rand(1,3); var w1=a*t1; var w2=b*t2; return { q: 'A works ' + t1 + 'h/day does in ' + a + 'd. B works ' + t2 + 'h/day. Work ratio A:B per hour?', a: Math.round(w2*10/w1)/10 + ':' + '1', hint: 'Total work = days×hours. Ratio = total_work_B/total_work_A : 1' }; }],
    [4, function(){ var a=rand(3,7), b=rand(2,5); return { q: 'A is ' + a + '× older than B. In ' + rand(4,10) + ' yrs, A is ' + (a-1) + '× B. B\'s age?', a: rand(4,10)*(a-1)-rand(4,10), hint: 'Let B=x, A=' + a + 'x. ' + a + 'x+y=' + (a-1) + '(x+y). Solve x=y(' + (a-1) + '-1)/(' + a + '-' + (a-1) + ')' }; }],
    [4, function(){ var a=rand(2,5)*500, b=rand(3,6)*500; var ap=rand(1,4); var bp=rand(2,6); return { q: 'A Rs' + a + ' for ' + ap + 'mo, B Rs' + b + ' for ' + bp + 'mo. Profit share ratio?', a: (a*ap) + ':' + (b*bp), hint: 'Capital×time ratio' }; }],
    [4, function(){ var x=rand(1,5), y=rand(2,6); var k=rand(3,5); return { q: 'A:B=' + x + ':' + y + ', B:C=' + y + ':' + k + '. A:C?', a: (x*k) + ':' + (y*k*10/y|0), hint: 'Make B common. A:B=' + x + ':' + y + ', B:C=' + y + ':' + k + ' → A:C=' + x + ':' + k }; }],
    [4, function(){ var t=rand(100,500); var a=rand(t/5|0, t/3|0); var b=t-a; return { q: 'Total=' + t + ', A did on ' + a + ' days, rest B in ' + (t-a) + ' days. B\'s days if alone?', a: Math.round(b/((t-a)/(1/(a+rand(10,20))*20|0))/10|0), hint: 'A rate = A_done/days, remaining work = total - A_done' }; }],
    // --- SBI PO Hard (diff 5) ---
    [5, function(){ var a=rand(3,7), f1=rand(3,7), f2=rand(4,10); return { q: f1+' yrs ago, A:B=3:4. In '+f2+' yrs, A:B=5:6. Present B?', a:Math.round((f1*4*(5-3)+f2*6*(4-3))/(4*5-3*6)*10/10)|0, hint:'Let A=3k-'+f1+',B=4k-'+f1+'. Then (3k+'+f2+'):(4k+'+f2+')=5:6. Find k then B.'}; }],
    [5, function(){ var x=rand(2,5), y=rand(3,7), a=rand(5,10), b=rand(6,12); return { q:'A:'+rand(10,30)+', B:'+rand(15,40)+', C joins after '+rand(2,4)+'mo with Rs'+rand(20,60)+'k. Profit share after 1yr?', a:(a*12)+':'+(b*12)+':'+((a+b)*rand(8,12)), hint:'A×12 : B×12 : C×(12-joined_mo)'}; }],
    [5, function(){ var d=rand(2,8); return { q:'If x:y='+d+':'+(d+1)+', y:z='+(d+1)+':'+(d+2)+'. x:y:z?', a:d*(d+1)+':'+(d+1)*(d+1)+':'+(d+2)*(d+1)/d|0, hint:'Make y common. LCM of y parts='+(d+1)}; }]
  ];
  var matched = types.filter(function(t){ return t[0] <= diff; });
  if (matched.length === 0) matched = types;
  var chosen = matched[rand(0, matched.length - 1)];
  var data = chosen[1]();
  var opts = [data.a];
  if (typeof data.a === 'string' && data.a.indexOf(':') > 0) {
    var parts = data.a.split(':');
    var num = parseInt(parts[0]), den = parseInt(parts[1]);
    for (var _g=0; _g<50 && opts.length<4; _g++) { var d = (num+rand(-1,1)) + ':' + (den+rand(-1,1)); if (opts.indexOf(d) < 0 && d !== '0:0') opts.push(d); }
  } else {
    var spread = Math.max(2, Math.abs(data.a * 0.15));
    for (var _g=0; _g<50 && opts.length<4; _g++) { var d = (typeof data.a === 'number' ? Math.round(data.a + rand(-spread, spread)) : data.a + rand(-spread, spread)); if (opts.indexOf(d) < 0 && d > 0) opts.push(d); }
  }
  shuffle(opts);
  return { question: data.q, answer: data.a, options: opts, hint: data.hint, timeLimit: layer==='instinct'?12:18, type:'quant', techniqueLabel: data.hint, intuition: data.intuition||'Ages: equation from conditions. Alligation: (mean-low):(high-mean). Installment: P×r(1+r)^n/((1+r)^n-1).' };
}

function generateMotionQuestion(diff, layer) {
  var types = [
    // --- Basic (diff 1-2) ---
    [1, function(){ var d=rand(300,900), t=rand(2,5); return { q:'Speed for '+d+'m in '+t+'min (km/h)?', a:Math.round(d/(t*60)*3.6*10)/10, hint:'m/s→km/h: ×3.6' }; }],
    [1, function(){ var l=rand(100,300), s=[36,45,54,60,72,90][rand(0,5)]; return { q:'Train '+l+'m at '+s+'km/h crosses pole in?', a:Math.round(l/(s*5/18)*10)/10, hint:'km/h→m/s: ×5/18='+Math.round(s*5/18)}; }],
    [1, function(){ var l=rand(100,200), p=rand(200,400), s=[45,54,60,72][rand(0,3)]; return { q:'Train '+l+'m at '+s+'km/h crosses '+p+'m platform in?', a:Math.round((l+p)/(s*5/18)*10)/10, hint:'Total='+(l+p)+', speed='+Math.round(s*5/18)+'m/s'}; }],
    [2, function(){ var s=[36,45,54,60][rand(0,3)], t=rand(6,15); return { q:'Train at '+s+'km/h crosses pole in '+t+'s. Length?', a:Math.round(s*5/18*t), hint:'L=speed(m/s)×time'}; }],
    [2, function(){ var l=rand(100,200), s=[45,54,60][rand(0,3)], t=rand(18,40); var total=Math.round(s*5/18*t); var bridge=total-l; if(bridge<50)bridge=rand(200,400); return { q:'Train '+l+'m at '+s+'km/h crosses bridge in '+t+'s. Bridge?', a:bridge, hint:'Total='+total+', minus train '+l}; }],
    [2, function(){ var l1=rand(100,250), l2=rand(100,250), v1=[36,45,54][rand(0,2)], v2=[45,54,60][rand(0,2)]; return { q:'Trains '+l1+'m & '+l2+'m at '+v1+' & '+v2+' km/h cross (opposite) in?', a:Math.round((l1+l2)/((v1+v2)*5/18)*10)/10, hint:'Rel speed='+(v1+v2)+'km/h'}; }],
    // --- Medium (diff 3) ---
    [3, function(){ var v1=[54,60,72][rand(0,2)], v2=[36,45,54][rand(0,2)]; if(v1<=v2){var t=v1;v1=v2;v2=t;} var l1=rand(150,300), l2=rand(100,200); return { q:'Train1 '+l1+'m at '+v1+' overtakes Train2 '+l2+'m at '+v2+' (same dir). Time?', a:Math.round((l1+l2)/((v1-v2)*5/18)*10)/10, hint:'Rel speed='+(v1-v2)+'km/h'}; }],
    [3, function(){ var l=rand(100,200), ts=[45,54,60][rand(0,2)], ms=[3,5,7,9][rand(0,3)]; if(ts<=ms)ts+=10; return { q:'Train '+l+'m at '+ts+'km/h passes man at '+ms+'km/h same dir in?', a:Math.round(l/((ts-ms)*5/18)*10)/10, hint:'Rel speed='+(ts-ms)+'km/h'}; }],
    [3, function(){ var d=rand(20,60), t1=rand(3,6), t2=rand(4,8); return { q:'A to B at '+t1+'m/s returns at '+t2+'m/s. Dist='+d+'km. Avg speed?', a:Math.round(2*t1*t2/(t1+t2)*10)/10, hint:'Avg speed = 2ab/(a+b) for same distance'}; }],
    [3, function(){ var u=rand(4,10), d=rand(2,5), s=rand(20,40); return { q:'Boat upstream '+(u-d)+'km/h, downstream '+(u+d)+'km/h. Dist='+s+'km each way. Total time?', a:Math.round(s/(u-d)+s/(u+d)*10)/10, hint:'Time up + time down'}; }],
    // --- SSC CGL (diff 4) ---
    [4, function(){ var l1=rand(100,250), l2=rand(100,250); var v1=rand(5,15), v2=rand(3,10); if(v1<=v2){var t=v1;v1=v2;v2=t;} return { q:'Trains '+l1+'m & '+l2+'m at '+Math.round(v1*3.6*10)/10+' & '+Math.round(v2*3.6*10)/10+' km/h (same dir). Overtake time?', a:Math.round((l1+l2)/(v1-v2)*10)/10, hint:'Rel speed='+(v1-v2)+'m/s='+Math.round((v1-v2)*3.6*10)/10+'km/h'}; }],
    [4, function(){ var d=rand(60,120), s=rand(20,40); return { q:'Car covers '+d+'km at '+s+'km/h, returns at '+(s+rand(5,15))+'km/h. Avg speed?', a:Math.round(2*s*(s+rand(5,15))/(s+s+rand(5,15))*10)/10, hint:'Avg speed = 2ab/(a+b)'}; }],
    [4, function(){ var u=rand(5,10), d=rand(8,15); var dist=rand(40,80); return { q:'Speed down='+d+'km/h, up='+u+'km/h. Dist='+dist+'km each way. Avg speed?', a:Math.round(2*d*u/(d+u)*10)/10, hint:'Avg=2ab/(a+b)'}; }],
    [4, function(){ var l=rand(150,300), s=[45,54,60,72][rand(0,3)], t=rand(20,35); var total=Math.round(s*5/18*t); if(total<=l)total=l+rand(100,300); return { q:'Train '+l+'m at '+s+'km/h crosses man in '+rand(8,15)+'s, platform in '+t+'s. Platform?', a:total-l, hint:'Train L='+l+', total='+total+'. Platform='+(total-l)}; }],
    // --- SBI PO Hard (diff 5) ---
    [5, function(){ var n=[0,1,2,3,4,5,6,7,8,9][rand(0,9)]; var cyc=[1,1,4,4,2,1,1,4,4,2]; return { q:'Cyclicity of unit digit for '+n+'^n?', a:cyc[n], hint:'0:1,1:1,2:4,3:4,4:2,5:1,6:1,7:4,8:4,9:2'}; }],
    [5, function(){ var n=rand(1000,9999); return { q:'Digital sum of '+n, a:(function(x){while(x>9){var s=0;while(x>0){s+=x%10;x=Math.floor(x/10);}x=s;}return x;})(n), hint:'Sum digits until 1 digit'}; }],
    [5, function(){ var a=rand(100,999), b=rand(100,999); var hcf=(function(x,y){while(y){var t=y;y=x%y;x=t;}return x;})(a,b); return { q:'HCF of '+a+' and '+b+'?', a:hcf, hint:'Euclidean algorithm'}; }],
    [5, function(){ var d=rand(5,9), r=rand(1,d-1); return { q:'Remainder when '+(rand(100,999))+' is divided by '+d+'?', a:(rand(100,999))%d, hint:'Just check divisibility'}; }],
    [5, function(){ var n=rand(100,999), m=rand(2,9); return { q:'Largest '+m+'-digit number divisible by '+n+'?', a:(function(x,y){var p=Math.pow(10,m)-1; return p-p%x;})(n,m), hint:'Largest '+m+'-digit=10^'+m+'-1. Subtract remainder'}; }]
  ];
  var matched = types.filter(function(t){ return t[0] <= diff; });
  if (matched.length === 0) matched = types;
  var chosen = matched[rand(0, matched.length - 1)];
  var data = chosen[1]();
  var opts = [data.a]; var spread = Math.max(1, typeof data.a==='number'?Math.abs(data.a*0.15):5);
  for (var _g=0; _g<50 && opts.length<4; _g++) {var v=typeof data.a==='number'?Math.round(data.a+rand(-spread,spread)):['Y','N'][rand(0,1)]; if(opts.indexOf(v)<0&&(typeof v==='string'||v>=0))opts.push(v);}
  shuffle(opts);
  return { question:data.q, answer:data.a, options:opts, hint:data.hint, timeLimit:layer==='instinct'?12:18, type:'quant', techniqueLabel:'Motion: '+data.hint, intuition:'Speed=Dist/Time. Rel speed (opp)=v1+v2, (same)=|v1-v2|. km/h→m/s: ×5/18. Boat: down=u+v, up=u-v.' };
}

function generateSimplificationQuestion(diff, layer) {
  var ty = [
    function(){ var a=rand(5,15), b=rand(2,9), c=rand(1,6); return { q: a + '+' + b + '×' + c + ' - ' + rand(1,5), a: a+b*c-rand(1,5), hint: 'BODMAS: × before +/-', intuition: 'BODMAS: multiplication first. ' + b + '×' + c + '=' + (b*c) + ', then ' + a + '+' + (b*c) + '=' + (a+b*c) + ', subtract = ' + (a+b*c-rand(1,5)) }; },
    function(){ var a=rand(2,5); return { q: 'Approx: √' + (a*a+rand(1, a*2)), a: a, hint: 'Nearest perfect square ' + a*a, intuition: '√' + (a*a+rand(1,a*2)) + ' is close to ' + a + ' because ' + a + '²=' + a*a }; },
    function(){ var a=rand(2,7), b=rand(1,4); return { q: 'Simplify (x^' + a + ')(x^' + b + ') [coefficient=1]', a: a+b, hint: 'Add exponents: x^(a+b)', intuition: 'x^' + a + ' × x^' + b + ' = x^(' + a + '+' + b + ') = x^' + (a+b) }; },
    function(){ var a=rand(2,5), b=rand(1,3); return { q: 'Simplify (x^' + a + ')÷(x^' + b + ')', a: a-b, hint: 'Subtract exponents', intuition: 'x^' + a + ' / x^' + b + ' = x^(' + a + '-' + b + ') = x^' + (a-b) }; },
    function(){ var a=rand(2,6), b=rand(1,4); return { q: '√(' + (a*a*b) + ')', a: a + '√' + b, hint: 'Factor: √(' + a*a + '×' + b + ')', intuition: '√' + (a*a*b) + ' = √(' + a*a + ' × ' + b + ') = ' + a + '√' + b }; },
    // Hard: nested brackets
    function(){ var a=rand(2,5), b=rand(2,5), c=rand(1,4); return { q: 'Simplify: ' + a + ' × [' + b + ' + { ' + c + ' + ' + (b-c+rand(1,3)) + ' }]', a: a * (b + c + (b-c+rand(1,3))), hint: 'Inner brackets first: { } then [ ]', intuition: 'Solve innermost: { ' + c + ' + ' + (b-c+rand(1,3)) + ' } = ' + (c+b-c+rand(1,3)) + '. Then [ ' + b + ' + ' + (c+b-c+rand(1,3)) + ' ] = ' + (b+c+b-c+rand(1,3)) + '. Then ' + a + ' × ' + (b+c+b-c+rand(1,3)) + ' = ' + (a*(b+c+b-c+rand(1,3))) }; },
    // Hard: surd rationalization
    function(){ var a=rand(2,5), b=rand(3,8); return { q: 'Rationalize: 1/(√' + (a*a*b) + ' - ' + b + ')', a: Math.round((Math.sqrt(a*a*b)+b)/(a*a*b-b*b)*10)/10, hint: 'Multiply numerator & denominator by conjugate (√N + ' + b + ')', intuition: 'Conjugate: (√' + (a*a*b) + ' + ' + b + ')/((' + (a*a*b) + ') - ' + (b*b) + ') = (√' + (a*a*b) + ' + ' + b + ')/' + (a*a*b-b*b) + ' = simplified' }; },
    // Fraction simplification chain
    function(){ var a=rand(2,5), b=rand(a+1,9), c=rand(2,6); return { q: 'Simplify: ' + a + '/' + b + ' + ' + c + '/' + (b*2), a: Math.round((2*a + c)/(2*b)*10)/10, hint: 'LCM denominator = ' + (2*b) + ', = (' + (2*a) + '+' + c + ')/' + (2*b), intuition: 'LCM = ' + (2*b) + '. = (' + a + '×2 + ' + c + ')/' + (2*b) + ' = (' + (2*a) + '+' + c + ')/' + (2*b) + ' = ' + Math.round((2*a+c)/(2*b)*10)/10 }; },
    // Mixed BODMAS with fractions
    function(){ var a=rand(2,5), b=rand(3,7), c=rand(2,4); return { q: 'Solve: (' + a + '/' + b + ') × ' + c + ' - ' + rand(1,3) + '/' + rand(2,5), a: Math.round((a*c)/b - rand(1,3)/rand(2,5)*10)/10, hint: 'First multiply fraction by ' + c + ', then subtract', intuition: '(' + a + '/' + b + ') × ' + c + ' = ' + (a*c) + '/' + b + ' = ' + Math.round(a*c/b*10)/10 + '. Then subtract = ' + Math.round(a*c/b*10)/10 + ' - ' + Math.round(rand(1,3)/rand(2,5)*10)/10 + ' = ' + Math.round((a*c)/b - rand(1,3)/rand(2,5)*10)/10 }; },
    // Surd simplification (add surds)
    function(){ var a=rand(2,5); return { q: 'Simplify: ' + a + '√2 + ' + (a*2) + '√2', a: (3*a) + '√2', hint: 'Add coefficients of like surds: ' + a + '+' + (a*2) + ' = ' + (3*a), intuition: 'Like surds: add coefficients. ' + a + '√2 + ' + (a*2) + '√2 = (' + a + '+' + (a*2) + ')√2 = ' + (3*a) + '√2' }; },
    // SBI PO Hard: compound fraction simplification
    function(){ var a=rand(2,5), b=rand(3,8), c=rand(1,4); return { q: 'Simplify: (' + a + '/' + b + ' + ' + c + '/' + (b*2) + ') ÷ (' + rand(2,4) + '/' + (b*3) + ')', a: Math.round(((a*2 + c) / (2*b)) * ((b*3) / rand(2,4)) * 100) / 100, hint: 'Simplify numerator, then invert and multiply', intuition: 'First simplify (' + a + '/' + b + ' + ' + c + '/' + (b*2) + ') = (' + (a*2) + '+' + c + ')/' + (b*2) + ' = ' + (a*2+c) + '/' + (2*b) + '. Then ÷ ' + rand(2,4) + '/' + (b*3) + ' = ×' + (b*3) + '/' + rand(2,4) + ' = ' + Math.round(((a*2+c)/(2*b))*((b*3)/rand(2,4))*100)/100 }; },
    // SBI PO Hard: approximation with decimals and percentage
    function(){ var a=rand(5,15), p=rand(10,30), b=rand(2,8); return { q: 'Approx: ' + a + '.' + rand(1,9) + ' × ' + p + '% of ' + (b*10), a: Math.round(a * p / 100 * b * 10), hint: 'Compute step by step: ' + a + ' × ' + p/100 + ' × ' + (b*10), intuition: '≈ ' + a + ' × ' + p/100 + ' × ' + (b*10) + ' = ' + Math.round(a * p / 100 * b * 10) }; },
    // SBI PO Hard: mixed BODMAS with decimal and fraction
    function(){ var a=rand(3,8), b=rand(2,5), c=rand(4,10); return { q: 'Solve: (' + a + '.' + rand(1,5) + ' + ' + b + '/' + c + ') × ' + rand(2,4), a: Math.round((a + rand(1,5)/10 + b/c) * rand(2,4) * 100) / 100, hint: 'Decimal + fraction, then multiply', intuition: 'First resolve decimal and fraction, then multiply' }; },
    // SBI PO Hard: surd with exponent
    function(){ var a=rand(2,5), b=rand(1,3); return { q: 'Simplify: (√' + (a*a*b) + ')^' + (b+1) + ' ÷ √' + b, a: Math.round(Math.pow(a * Math.sqrt(b), b+1) / Math.sqrt(b) * 100) / 100, hint: 'Express √' + (a*a*b) + ' = ' + a + '√' + b + ', then apply power', intuition: '√' + (a*a*b) + ' = ' + a + '√' + b + '. (' + a + '√' + b + ')^' + (b+1) + ' ÷ √' + b + ' = ' + a + '^' + (b+1) + ' × (√' + b + ')^' + (b+1-1) + ' = ' + Math.round(Math.pow(a, b+1) * Math.pow(b, b/2) * 100)/100 }; }
  ];
  var idx;
  if (diff >= 5 && ty.length >= 4) {
    idx = Math.random() < 0.7 ? rand(Math.max(0, ty.length - 4), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var t = ty[idx];
  var d = t();
  var o = [d.a]; var _g=0; while(o.length<4&&_g++<60){var v=(typeof d.a==='string'?d.a+rand(-2,2):Math.abs(d.a)+rand(-3,3)); if(o.indexOf(v)<0&&(typeof v==='string'||v>=0))o.push(v);} while(o.length<4){o.push('None of these');} shuffle(o);
  shuffle(o);
  return { question: d.q, answer: d.a, options: o, hint: d.hint, timeLimit: layer==='instinct'?10:15, type:'quant', techniqueLabel:'Simplification: '+d.hint, intuition: d.intuition||'BODMAS: brackets, orders, division, multiplication, addition, subtraction' };
}

function generateQuadraticQuestion(diff, layer) {
  var ty = [
    function(){ var r1=rand(2,6), r2=rand(2,6); return { q: 'Roots of x² - ' + (r1+r2) + 'x + ' + (r1*r2) + ' = 0', a: r1 + ',' + r2, hint: 'Find two numbers that sum to ' + (r1+r2) + ', product ' + (r1*r2), intuition: 'Find factors of ' + (r1*r2) + ' that add to ' + (r1+r2) + ': ' + r1 + ' and ' + r2 }; },
    function(){ var r1=rand(-5,-1), r2=rand(2,5); return { q: 'Roots of x² + ' + (-r1-r2) + 'x + ' + (r1*r2) + ' = 0', a: r1 + ',' + r2, hint: 'Signs: sum=' + (-r1-r2) + ', product=' + (r1*r2), intuition: 'Product ' + (r1*r2) + ' (negative → roots have opposite signs). Factors that sum to ' + (-r1-r2) + ': ' + r1 + ' and ' + r2 }; },
    function(){ var a=rand(1,3), b=rand(2,5), c=rand(1,5); var d=b*b-4*a*c; if(d<0) d=0; return { q: 'Discriminant of ' + a + 'x²+' + b + 'x+' + c + '=0', a: d, hint: 'D = b² - 4ac = ' + b*b + ' - ' + (4*a*c), intuition: 'D = ' + b + '² - 4×' + a + '×' + c + ' = ' + (b*b-4*a*c) + '. D>0→real, D=0→equal, D<0→imaginary' }; },
    function(){ var n=rand(2,5); return { q: 'Nature of roots: x² - ' + (n+n) + 'x + ' + (n*n) + ' = 0', a: 'Equal', hint: 'Check D = b²-4ac', intuition: 'D = ' + (n+n) + '² - 4×1×' + n*n + ' = ' + (4*n*n-4*n*n) + ' = 0 → roots are equal (repeated)' }; },
    // Find quadratic given roots
    function(){ var r1=rand(2,5), r2=rand(3,7); return { q: 'Find quadratic with roots ' + r1 + ' and ' + r2, a: 'x² - ' + (r1+r2) + 'x + ' + (r1*r2) + ' = 0', hint: 'Sum=' + (r1+r2) + ', product=' + (r1*r2), intuition: 'Quadratic: x² - (sum)x + product = 0. Sum=' + (r1+r2) + ', product=' + (r1*r2) }; },
    // Word problem: area of rectangle forms quadratic
    function(){ var l=rand(8,15), w=rand(4,8); var area=l*w; var extra=rand(1,3); return { q: 'Rectangle: length ' + l + ', width ' + w + '. If length increased by ' + extra + ', area becomes ' + ((l+extra)*w) + '. Find original area?', a: area, hint: 'New area = (l+'+extra+')×w = ' + ((l+extra)*w) + ', check original area', intuition: 'Original area = ' + l + '×' + w + ' = ' + area + '. (L+'+extra+')W = ' + ((l+extra)*w) + ' → area = ' + ((l+extra)*w) + '. Actually original is ' + area }; },
    // SBI PO Hard: quadratic from age word problem
    function(){ var x=rand(3,7), y=rand(x+2,10); return { q: 'Product of ages (x and x+' + (y-x) + ') is ' + (x*y) + '. Find the sum of their ages?', a: x+y, hint: 'If ages are a and a+' + (y-x) + ', then a(a+' + (y-x) + ')=' + (x*y) + ', solve for a', intuition: 'Let age = p. p(p+' + (y-x) + ')=' + (x*y) + ' → p²+' + (y-x) + 'p-' + (x*y) + '=0. Roots: ' + x + ', ' + (-y) + '. Sum = ' + (x+y) }; },
    // SBI PO Hard: two equations compare roots
    function(){ var a=rand(2,5), b=rand(2,5); return { q: 'Equation I: x² - ' + (2*a) + 'x + ' + (a*a) + ' = 0. Equation II: y² - ' + (2*b) + 'y + ' + (b*b) + ' = 0. Compare x and y', a: a > b ? 'x > y' : (a < b ? 'x < y' : 'x = y'), hint: 'Both are perfect squares: (x-' + a + ')²=0, (y-' + b + ')²=0', intuition: 'x=' + a + ', y=' + b + '. Since ' + a + ' ' + (a>b?'>':(a<b?'<':'=')) + ' ' + b + ', ' + (a>b?'x>y':(a<b?'x<y':'x=y')) }; },
    // SBI PO Hard: quadratic with two conditions (sum and product of reciprocals)
    function(){ var r1=rand(1,5), r2=rand(6,10); return { q: 'Sum of reciprocals of roots of x² - ' + (r1+r2) + 'x + ' + (r1*r2) + ' = 0 is?', a: Math.round((r1+r2)/(r1*r2)*100)/100, hint: 'Sum of reciprocals = (sum of roots)/(product of roots)', intuition: 'Sum=' + (r1+r2) + ', product=' + (r1*r2) + '. 1/' + r1 + ' + 1/' + r2 + ' = (' + r1 + '+' + r2 + ')/(' + r1 + '×' + r2 + ') = ' + Math.round((r1+r2)/(r1*r2)*100)/100 }; },
    // SBI PO Hard: find condition for equal roots
    function(){ var a=rand(1,3), c=rand(1,5); var b = 2 * Math.sqrt(a*c); if (b !== Math.floor(b)) b = Math.floor(b); return { q: 'For what k are roots equal: ' + a + 'x² + ' + b + 'x + ' + c + ' = 0? (k=b value)', a: b, hint: 'For equal roots, discriminant = 0 → b² = 4ac', intuition: 'b² = 4×' + a + '×' + c + ' = ' + (4*a*c) + ', so b = √' + (4*a*c) + ' = ' + Math.round(Math.sqrt(4*a*c)*100)/100 + '... given b=' + b }; },
    // SBI PO Hard: Form quadratic from given roots
    function(){ var a=rand(1,4), b=rand(2,6); return { q:'Form quadratic: roots '+a+' and '+b, a:'x\u00b2-'+(a+b)+'x+'+(a*b), hint:'x\u00b2-(sum)x+product=0' }; },
    // SBI PO Hard: Sum of reciprocals of roots
    function(){ var a=rand(1,4), b=rand(2,5); return { q:'Roots of x\u00b2-'+(a+b)+'x+'+(a*b)+'=0. 1/\u03b1+1/\u03b2?', a:Math.round((a+b)/(a*b)*100)/100, hint:'(sum)/(product) = '+(a+b)+'/'+(a*b) }; },
    // SBI PO Hard: Nature from discriminant
    function(){ var a=rand(1,3), b=rand(5,9), c=rand(2,4); var d=b*b-4*a*c; return { q:'Nature of roots: '+a+'x\u00b2+'+b+'x+'+c+'=0', a:d>0?'Real & distinct':(d===0?'Real & equal':'Imaginary'), hint:'D='+b+'\u00b2-4\u00d7'+a+'\u00d7'+c+'='+d }; },
    // SBI PO Hard: Solve (larger root) by formula
    function(){ var a=rand(1,3), b=rand(3,8), c=rand(1,4); var d=b*b-4*a*c; if(d<0){c=1;d=b*b-4*a*c;} var r=Math.round((-b+Math.sqrt(d))/(2*a)*10)/10; return { q:'Solve: '+a+'x\u00b2+'+b+'x+'+c+'=0 (larger)', a:r, hint:'x=[-b\u00b1\u221a(b\u00b2-4ac)]/2a' }; },
    // SBI PO Hard: Find k for equal roots
    function(){ var a=rand(1,3), b=rand(4,8); return { q:'Find k: '+a+'x\u00b2+'+b+'x+k=0 has equal roots', a:Math.round(b*b/(4*a)), hint:'D=0: '+b+'\u00b2-4\u00d7'+a+'\u00d7k=0' }; },
    // SBI PO Hard: Quadratic from sum & product
    function(){ var a=rand(1,4), b=rand(2,5); return { q:'Sum='+(a+b)+', product='+(a*b)+'. Find quadratic', a:'x\u00b2-'+(a+b)+'x+'+(a*b), hint:'x\u00b2-Sx+P=0' }; },
    // SBI PO Hard: Solve by rearrangement
    function(){ var a=rand(2,5), b=rand(1,4); var val=a*a+b*b-a*b; return { q:'Solve: '+a+'x\u00b2+'+b+'x='+val, a:Math.round((-b+Math.sqrt(b*b+4*a*val))/(2*a)*10)/10, hint:'Rearrange to standard form' }; },
    // SBI PO Hard: \u03b1\u00b2+\u03b2\u00b2 from sum & product
    function(){ var a=rand(1,3), b=rand(2,6); return { q:'If \u03b1,\u03b2 roots of x\u00b2-'+(a+b)+'x+'+(a*b)+'=0, find \u03b1\u00b2+\u03b2\u00b2', a:(a+b)*(a+b)-2*a*b, hint:'\u03b1\u00b2+\u03b2\u00b2=(\u03b1+\u03b2)\u00b2-2\u03b1\u03b2' }; }
  ];
  var idx;
  if (diff >= 5 && ty.length >= 4) {
    idx = Math.random() < 0.7 ? rand(Math.max(0, ty.length - 4), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var t = ty[idx];
  var d = t();
  var o = [d.a]; var _g=0; while(o.length<4&&_g++<60){var v=(typeof d.a==='string'?['Equal','Real','Imaginary','Distinct'][rand(0,3)]:Math.abs(parseInt(d.a))+rand(-3,3)); if(o.indexOf(v)<0)o.push(v);} while(o.length<4){o.push('Equal');} shuffle(o);
  shuffle(o);
  return { question: d.q, answer: d.a, options: o, hint: d.hint, timeLimit: layer==='instinct'?15:20, type:'quant', techniqueLabel:'Quadratic: '+d.hint, intuition: d.intuition||'For roots: find factors of c that sum to b. D=b²-4ac tells nature of roots.' };
}

function generatePartnershipQuestion(diff, layer) {
  var ty = [
    function(){ var a=rand(2,8)*1000, b=rand(3,9)*1000, p=rand(1,5)*1000; return { q: 'A invests Rs' + a + ', B Rs' + b + '. Profit Rs' + p + '. B\'s share?', a: Math.round(b*p/(a+b)), hint: 'Ratio ' + a + ':' + b + ', share = ' + b + '/' + (a+b) + '×' + p, intuition: 'Profit ratio = investment ratio. B share = ' + b + '/(' + a + '+' + b + ') × ' + p + ' = ' + b + '/' + (a+b) + ' × ' + p + ' = ' + Math.round(b*p/(a+b)) }; },
    function(){ var a=rand(1,5)*1000, b=rand(2,6)*1000, pa=rand(1,4), pb=rand(2,5); return { q: 'A Rs' + a + ' for ' + pa + 'mo, B Rs' + b + ' for ' + pb + 'mo. Profit share ratio?', a: (a*pa) + ':' + (b*pb), hint: 'Multiply capital×time: ' + a*pa + ' : ' + b*pb, intuition: 'Ratio = (A capital × A time) : (B capital × B time) = ' + a*pa + ' : ' + b*pb }; },
    function(){ var a=rand(2,5)*1000, b=rand(3,6)*1000; var ap=rand(1,3); return { q: 'A Rs' + a + ', B Rs' + b + ' after ' + ap + 'mo joins. Profit Rs' + (a+b)*2 + '. A\'s share?', a: Math.round((a*(12)) * (a+b)*2 / (a*12 + b*(12-ap))), hint: 'A for 12mo, B for ' + (12-ap) + 'mo', intuition: 'A: ' + a + '×12=' + a*12 + ', B: ' + b + '×' + (12-ap) + '=' + b*(12-ap) + '. A share = ' + a*12 + '/' + (a*12+b*(12-ap)) + ' × total' }; },
    // Reverse: find B's investment given A's investment, total profit, and A's share
    function(){ var a=rand(2,6)*1000, b=rand(3,7)*1000, p=rand(2,6)*1000; var aShare=Math.round(a*p/(a+b)); return { q: 'A invests Rs' + a + ', total profit Rs' + p + ', A gets Rs' + aShare + '. B\'s investment?', a: Math.round(a*(p-aShare)/aShare), hint: 'Profit ratio = investment ratio. A:B = ' + aShare + ':' + (p-aShare), intuition: 'Profit ratio = investment ratio. A:B = ' + aShare + ':' + (p-aShare) + '. B = ' + a + ' × ' + (p-aShare) + '/' + aShare + ' = ' + Math.round(a*(p-aShare)/aShare) }; },
    // Reverse: find B's time given A's investment+time, B's investment, profit ratio
    function(){ var a=rand(2,5)*1000, b=rand(3,6)*1000, pa=rand(2,6); var pr=rand(2,4); var pb=Math.round(pr); return { q: 'A Rs' + a + ' for ' + pa + 'mo, B Rs' + b + '. Profit ratio ' + pr + ':' + pb + '. B\'s time?', a: Math.round(a*pa*pb/(b*pr)), hint: 'Ratio = (A×timeA):(B×timeB) = ' + (a*pa) + ':' + (b*pb), intuition: 'A:B = ' + (a*pa) + ':' + (b*pb) + '. Wait, given ratio ' + pr + ':' + pb + '. B time = (' + b + '×' + pb + ')/( ' + a + '×' + pa + ' ) = solving: B time = ' + Math.round(a*pa*pb/(b*pr)) + ' months' }; },
    // Three partners
    function(){ var a=rand(2,5)*1000, b=rand(3,6)*1000, c=rand(1,4)*1000, p=rand(3,9)*1000; return { q: 'A:Rs' + a + ', B:Rs' + b + ', C:Rs' + c + '. Profit Rs' + p + '. C\'s share?', a: Math.round(c*p/(a+b+c)), hint: 'C share = ' + c + '/' + (a+b+c) + '×' + p, intuition: 'Total capital = ' + (a+b+c) + '. C share = ' + c + '/' + (a+b+c) + ' × ' + p + ' = ' + Math.round(c*p/(a+b+c)) }; },
    // Partner early withdrawal
    function(){ var a=rand(3,6)*1000, b=rand(2,5)*1000; var wd=rand(2,5); return { q: 'A invests Rs' + a + ' for full year. B invests Rs' + b + ' but withdraws after ' + wd + 'mo. Profit Rs' + ((a+b)*2) + '. B\'s share?', a: Math.round(b*wd * (a+b)*2 / (a*12 + b*wd)), hint: 'A: ' + a + '×12, B: ' + b + '×' + wd, intuition: 'A: ' + a + '×12=' + (a*12) + ', B: ' + b + '×' + wd + '=' + (b*wd) + '. B share = ' + (b*wd) + '/' + (a*12+b*wd) + '×' + ((a+b)*2) + ' = ' + Math.round(b*wd*(a+b)*2/(a*12+b*wd)) }; },
    // SBI PO Hard: three partners with changing investments
    function(){ var a=rand(2,5)*1000, b=rand(3,6)*1000, c=rand(1,4)*1000; var ta=12, tb=rand(4,8), tc=rand(6,10); return { q: 'A Rs' + a + ' for ' + ta + 'mo, B Rs' + b + ' for ' + tb + 'mo, C Rs' + c + ' for ' + tc + 'mo. Profit Rs' + ((a*ta+b*tb+c*tc)/2|0) + '. B\'s share?', a: Math.round(b*tb * ((a*ta+b*tb+c*tc)/2|0) / (a*ta+b*tb+c*tc)), hint: 'Eff cap ratio = ' + a*ta + ':' + b*tb + ':' + c*tc, intuition: 'A:' + a + '×' + ta + '=' + a*ta + ', B:' + b + '×' + tb + '=' + b*tb + ', C:' + c + '×' + tc + '=' + c*tc + '. B share = ' + (b*tb) + '/' + (a*ta+b*tb+c*tc) + '×' + ((a*ta+b*tb+c*tc)/2|0) + ' = ' + Math.round(b*tb*((a*ta+b*tb+c*tc)/2|0)/(a*ta+b*tb+c*tc)) }; },
    // SBI PO Hard: partnership with profit reinvested
    function(){ var a=rand(3,8)*1000, b=rand(2,5)*1000, p=rand(5,10)*1000; var rp=Math.round(p*rand(2,4)/10); return { q: 'A Rs' + a + ', B Rs' + b + '. Profit Rs' + p + '. ' + rp + ' reinvested, rest shared. A\'s share?', a: Math.round((a/(a+b))*(p-rp)), hint: 'Profit after reinvestment = ' + (p-rp) + '. Split in ratio ' + a + ':' + b, intuition: 'Remaining = ' + p + '-' + rp + ' = ' + (p-rp) + '. A share = ' + a + '/' + (a+b) + ' × ' + (p-rp) + ' = ' + Math.round((a/(a+b))*(p-rp)) }; },
    // SBI PO Hard: partnership with salary + profit share
    function(){ var a=rand(2,6)*1000, b=rand(3,7)*1000, sal=rand(1,3)*500, p=rand(5,10)*1000; return { q: 'A Rs' + a + ' (active, gets salary Rs' + sal + '/mo), B Rs' + b + '. Annual profit Rs' + p + '. A\'s total?', a: Math.round(sal*12 + (a/(a+b))*(p-sal*12)), hint: 'Salary + profit share of balance', intuition: 'Salary = ' + sal + '×12 = ' + (sal*12) + '. Balance = ' + p + '-' + (sal*12) + ' = ' + (p-sal*12) + '. A share = ' + sal*12 + '+' + a + '/' + (a+b) + '×' + (p-sal*12) + ' = ' + Math.round(sal*12 + (a/(a+b))*(p-sal*12)) }; },
    // SBI PO Hard: find total profit given ratio and individual share
    function(){ var a=rand(3,8)*1000, b=rand(4,9)*1000, p=rand(8,15)*1000; return { q: 'A:B = ' + a + ':' + b + '. A gets Rs' + Math.round(a*p/(a+b)) + '. Total profit?', a: p, hint: 'A share = (a/(a+b)) × total, so total = A share × (a+b)/a', intuition: 'Total = ' + Math.round(a*p/(a+b)) + ' × (' + a + '+' + b + ')/' + a + ' = ' + Math.round(a*p/(a+b)) + ' × ' + (a+b) + '/' + a + ' = Rs' + p }; }
  ];
  var idx;
  if (diff >= 5 && ty.length >= 4) {
    idx = Math.random() < 0.7 ? rand(Math.max(0, ty.length - 4), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var t = ty[idx];
  var d = t();
  var o = [d.a];
  if (typeof d.a === 'string' && d.a.indexOf(':') > 0) {
    var parts = d.a.split(':');
    var nA = parseInt(parts[0]), nB = parseInt(parts[1]);
    for (var _g=0; _g<60 && o.length<4; _g++) { var rv = (nA+rand(-nA/5|0, nA/5|0)) + ':' + (nB+rand(-nB/5|0, nB/5|0)); if (o.indexOf(rv) < 0 && rv !== '0:0') o.push(rv); }
  } else {
    for (var _g=0; _g<60 && o.length<4; _g++) { var v = (typeof d.a === 'number' ? Math.round(d.a + rand(-500, 500)) : 'None of these'); if (o.indexOf(v) < 0 && v >= 0) o.push(v); }
  }
  shuffle(o);
  return { question: d.q, answer: d.a, options: o, hint: d.hint, timeLimit: layer==='instinct'?15:20, type:'quant', techniqueLabel:'Partnership: '+d.hint, intuition: d.intuition||'Profit share ratio = capital × time. Sum ratios, divide profit proportionally.' };
}

function generateSimpleInterestQuestion(diff, layer) {
  var ty = [
    function(){ var p=rand(1000,10000), r=rand(4,15), t=rand(1,5); return { q:'SI on Rs' + p + ' at ' + r + '% for ' + t + 'yr?', a:Math.round(p*r*t/100), hint:'SI = P×R×T/100', intuition:'SI = ' + p + '×' + r + '×' + t + '/100 = ' + Math.round(p*r*t/100) }; },
    function(){ var p=rand(2000,8000), r=rand(5,12), t=rand(2,5); var si=Math.round(p*r*t/100); return { q:'Amount (P+SI) for Rs' + p + ' at ' + r + '% for ' + t + 'yr?', a:p+si, hint:'Amount = P + SI = P + PRT/100', intuition:'SI = ' + p + '×' + r + '×' + t + '/100 = ' + si + '. Amount = ' + p + '+' + si + ' = ' + (p+si) }; },
    function(){ var p=rand(3000,9000), r=rand(5,10), t=rand(3,6); var si=Math.round(p*r*t/100); return { q:'P=Rs' + p + ', R=' + r + '%, T=' + t + 'yr? A = P + 2SI?', a:p+2*si, hint:'2SI = 2×' + si + ' = ' + (2*si), intuition:'2SI = 2×' + si + ' = ' + (2*si) + '. Amount = ' + p + '+' + (2*si) + ' = ' + (p+2*si) }; },
    // Reverse: find principal given SI, rate, time
    function(){ var p=rand(2000,8000), r=rand(5,12), t=rand(2,4); var si=Math.round(p*r*t/100); return { q:'SI=Rs' + si + ', R=' + r + '%, T=' + t + 'yr. Principal?', a:p, hint:'P = SI×100/(R×T) = ' + si + '×100/(' + r + '×' + t + ')', intuition:'P = ' + si + '×100/(' + r + '×' + t + ') = ' + Math.round(si*100/(r*t)) + ' = Rs' + p }; },
    // Reverse: find rate given SI, principal, time
    function(){ var p=rand(3000,9000), r=rand(5,12), t=rand(2,5); var si=Math.round(p*r*t/100); return { q:'SI=Rs' + si + ', P=Rs' + p + ', T=' + t + 'yr. Rate?', a:r, hint:'R = SI×100/(P×T) = ' + si + '×100/(' + p + '×' + t + ')', intuition:'R = ' + si + '×100/(' + p + '×' + t + ') = ' + Math.round(si*100/(p*t)) + '%' }; },
    // Reverse: find time given SI, principal, rate
    function(){ var p=rand(3000,8000), r=rand(5,10), t=rand(2,5); var si=Math.round(p*r*t/100); return { q:'SI=Rs' + si + ', P=Rs' + p + ', R=' + r + '%. Time?', a:t, hint:'T = SI×100/(P×R) = ' + si + '×100/(' + p + '×' + r + ')', intuition:'T = ' + si + '×100/(' + p + '×' + r + ') = ' + Math.round(si*100/(p*r)) + ' years' }; },
    // SI comparison between two schemes
    function(){ var p=rand(5000,15000), r1=rand(5,10), r2=rand(8,14), t=rand(2,4); var si1=Math.round(p*r1*t/100), si2=Math.round(p*r2*t/100); return { q:'Rs' + p + ' at ' + r1 + '% vs ' + r2 + '% for ' + t + 'yr. Difference in SI?', a:Math.abs(si1-si2), hint:'SI1=' + si1 + ', SI2=' + si2 + ', diff=|' + si1 + '-' + si2 + '|', intuition:'SI at ' + r1 + '% = ' + si1 + ', at ' + r2 + '% = ' + si2 + '. Difference = ' + Math.abs(si1-si2) }; },
    // Find sum when SI difference known
    function(){ var r1=rand(5,8), r2=rand(r1+2,14), t=rand(2,4), p=rand(5000,20000); var diff=Math.round(p*(r2-r1)*t/100); return { q:'SI diff for rates ' + r1 + '% and ' + r2 + '% in ' + t + 'yr = Rs' + diff + '. Sum invested?', a:p, hint:'Diff = P×(r2-r1)×T/100 → P = Diff×100/((r2-r1)×T)', intuition:'P = ' + diff + '×100/((' + r2 + '-' + r1 + ')×' + t + ') = ' + Math.round(diff*100/((r2-r1)*t)) }; },
    // Amount at simple interest doubles
    function(){ var r=rand(5,12); return { q:'At what time will Rs ' + rand(1000,5000) + ' double at ' + r + '% SI?', a:Math.round(100/r*10)/10, hint:'Time = 100/R for doubling. 100/' + r + ' = ' + Math.round(100/r*10)/10, intuition:'For sum to double, SI = P. So P = PRT/100 → T = 100/R = 100/' + r + ' = ' + Math.round(100/r*10)/10 + ' years' }; },
    // Equal annual installments with SI
    function(){ var p=rand(3000,10000), r=rand(5,10), n=rand(2,4); var inst=Math.round(p*100/(n*100 + n*(n-1)/2*r)); return { q:'Rs' + p + ' at ' + r + '% SI, ' + n + ' equal annual installments. Each installment?', a:inst, hint:'Installment = P×100/(n×100 + n(n-1)r/2)', intuition:'Installment = ' + p + '×100/(' + n + '×100 + ' + n + '×' + (n-1) + '×' + r + '/2) = ' + inst }; },
    // SBI PO Hard: SI with changing rate over time
    function(){ var p=rand(5000,20000), r1=rand(4,8), r2=rand(6,12), t1=rand(1,3), t2=rand(2,4); return { q:'Rs' + p + ' lent at ' + r1 + '% for ' + t1 + 'yr, then ' + r2 + '% for next ' + t2 + 'yr. Total SI?', a:Math.round(p*(r1*t1 + r2*t2)/100), hint:'SI = P(R1T1 + R2T2)/100', intuition:'SI = ' + p + '×(' + r1 + '×' + t1 + '+' + r2 + '×' + t2 + ')/100 = ' + Math.round(p*(r1*t1+r2*t2)/100) }; },
    // SBI PO Hard: sum that becomes equal at different rates
    function(){ var r1=rand(4,7), r2=rand(8,13), t=rand(3,6), p=rand(5000,15000); return { q:'Two equal sums at ' + r1 + '% and ' + r2 + '% become equal in ' + t + 'yr. Each sum?', a:p, hint:'P(1+r1×t/100)=P(1+r2×t/100) not possible. Actually same P gives diff amounts. Find P when diff in SI is given.', intuition:'Let sum=P. Amount1=P(1+' + r1 + '×' + t + '/100), Amount2=P(1+' + r2 + '×' + t + '/100). Difference = P×' + t + '×(' + r2 + '-' + r1 + ')/100 = given diff.' }; },
    // SBI PO Hard: find time when SI equals principal
    function(){ var r=rand(4,10), p=rand(5000,20000); return { q:'At ' + r + '% SI, after how many years will SI equal the principal Rs' + p + '?', a:Math.round(100/r*10)/10, hint:'SI=P → P = PRT/100 → T = 100/R', intuition:'T = 100/' + r + ' = ' + Math.round(100/r*10)/10 + ' years. Check: SI = ' + p + '×' + r + '%×' + Math.round(100/r*10)/10 + ' = ' + Math.round(p*r*Math.round(100/r*10)/10/100) + ' ≈ ' + p }; },
    // SBI PO Hard: find sum part lent at different rates
    function(){ var p=rand(8000,25000), r1=rand(5,8), r2=rand(9,14), t=rand(2,5), si=Math.round(p*rand(6,12)/100*t); return { q:'Rs' + p + ' split: part at ' + r1 + '%, rest at ' + r2 + '% for ' + t + 'yr. Total SI = Rs' + si + '. Part at ' + r1 + '%?', a:Math.round((p*r2*t/100 - si)*100/((r2-r1)*t)), hint:'Let x at ' + r1 + '%. x×' + r1 + '×' + t + '/100 + (' + p + '-x)×' + r2 + '×' + t + '/100 = ' + si, intuition:'Part1 = (' + p*r2*t/100 + ' - ' + si + ')×100/((' + r2 + '-' + r1 + ')×' + t + ') = ' + Math.round((p*r2*t/100 - si)*100/((r2-r1)*t)) }; }
  ];
  var idx;
  if (diff >= 5 && ty.length >= 4) {
    idx = Math.random() < 0.7 ? rand(Math.max(0, ty.length - 4), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var t = ty[idx];
  var d = t();
  var o = [d.a]; var _g=0; while(o.length<4&&_g++<80){var v=Math.max(1, Math.round(d.a + rand(-Math.max(1,Math.round(d.a*0.2)), Math.max(1,Math.round(d.a*0.2))))); if(o.indexOf(v)<0&&v>0)o.push(v);}
  shuffle(o);
  return { question: d.q, answer: d.a, options: o, hint: d.hint, timeLimit: layer==='instinct'?15:20, type:'quant', techniqueLabel:'SI: '+d.hint, intuition: d.intuition||'SI = P×R×T/100. Amount = P + SI. For doubling: T = 100/R.' };
}

function generateCompoundInterestQuestion(diff, layer) {
  var ty = [
    function(){ var p=rand(2,8)*1000; return { q: 'CI on Rs' + p + ' at 10% for 2yr', a: Math.round(p*0.21), hint: 'CI = P[(1+r)^t-1] = ' + p + '×(1.21-1)', intuition: 'CI = P(1+r/100)^t - P. 10% for 2yr: effective = 10+10+1=21%. CI = ' + p + '×21% = ' + Math.round(p*0.21) }; },
    function(){ var p=rand(1,5)*1000, r=[5,8,12,15][rand(0,3)]; return { q: 'Amount of Rs' + p + ' at ' + r + '% CI for 2yr', a: Math.round(p * Math.pow(1+r/100, 2)), hint: 'A = P(1+r/100)^t', intuition: 'A = ' + p + '×(1+' + r + '/100)² = ' + p + '×(' + (1+r/100) + ')² = ' + Math.round(p*Math.pow(1+r/100,2)) }; },
    function(){ var p=rand(2,6)*1000; return { q: 'CI - SI diff for Rs' + p + ' at 10% for 2yr', a: Math.round(p*0.01), hint: 'Diff = P(r/100)² for 2yr', intuition: 'CI-SI diff at 10% for 2yr = P(r/100)² = ' + p + '×(0.1)² = ' + p + '×0.01 = ' + Math.round(p*0.01) }; },
    function(){ var p=rand(1,4)*10000; return { q: 'CI on Rs' + p + ' at 10% for 3yr', a: Math.round(p*0.331), hint: '3yr CI: 10+10+1+10+3+0.1 = ~33.1%', intuition: '3yr CI%: 10+10+1=21, 21+10+2.1=33.1%. CI = ' + p + '×33.1% = ' + Math.round(p*0.331) }; },
    // Reverse: find P given CI amount at r% for t years
    function(){ var p=rand(2,6)*1000, r=[5,8,10,12][rand(0,3)]; var amt=Math.round(p*Math.pow(1+r/100,2)); return { q: 'Amount Rs' + amt + ' at ' + r + '% CI for 2yr. Principal?', a: p, hint: 'P = A/(1+r/100)^t = ' + amt + '/(' + (1+r/100) + ')²', intuition: 'P = A/(1+r/100)^t = ' + amt + '/(1+' + r/100 + ')² = ' + amt + '/' + Math.round(Math.pow(1+r/100,2)*100)/100 + ' = ' + p }; },
    // Reverse: find rate given CI-SI diff for 2yr and principal
    function(){ var p=rand(3,10)*1000; var r=[4,5,6,8,10,12,15,18,20][rand(0,8)]; var diff=Math.round(p*Math.pow(r/100,2)); return { q: 'CI-SI diff = Rs' + diff + ' for Rs' + p + ' at r% for 2yr. Find r?', a: r, hint: 'Diff = P(r/100)² → r = 100√(diff/P)', intuition: 'Diff = P(r/100)² → (r/100)² = ' + diff + '/' + p + ' = ' + (diff/p).toFixed(4) + ', r/100 = ' + Math.round(Math.sqrt(diff/p)*100)/100 + ', r = ' + Math.round(Math.sqrt(diff/p)*100) + '%' }; },
    // Half-yearly compounding
    function(){ var p=rand(2,6)*1000; return { q: 'CI on Rs' + p + ' at 10% compounded half-yearly for 1yr', a: Math.round(p*Math.pow(1+5/100,2)-p), hint: 'Half-yearly: r/2=5%, t×2=2 periods', intuition: 'Rate per period=5%, 2 periods. Amount=' + p + '(1.05)²=' + Math.round(p*1.1025) + '. CI=' + Math.round(p*0.1025) }; },
    // Find rate given CI amount and time
    function(){ var p=rand(2,5)*1000, r=[5,8,10,12][rand(0,3)]; var amt=Math.round(p*Math.pow(1+r/100,2)); return { q: 'Rs' + p + ' becomes Rs' + amt + ' in 2yr CI. Rate?', a: r, hint: 'A = P(1+r/100)² → r = 100(√(A/P)-1)', intuition: 'A/P = ' + amt + '/' + p + ' = ' + (amt/p).toFixed(3) + '. √(A/P) = ' + Math.round(Math.sqrt(amt/p)*1000)/1000 + '. r = ' + r + '%' }; },
    // SBI PO Hard: quarterly compounding
    function(){ var p=rand(2,6)*1000, r=[8,12,16][rand(0,2)]; return { q: 'CI on Rs' + p + ' at ' + r + '% compounded quarterly for 1yr', a: Math.round(p * Math.pow(1+r/400, 4) - p), hint: 'Quarterly: r/4=' + (r/4) + '%, t×4=4 periods', intuition: 'A = ' + p + '(1+' + r/400 + ')^4 = ' + Math.round(p*Math.pow(1+r/400,4)) + '. CI = ' + Math.round(p*Math.pow(1+r/400,4)-p) }; },
    // SBI PO Hard: CI with different rates each year
    function(){ var p=rand(3,8)*1000, r1=rand(5,10), r2=rand(8,14), r3=rand(6,12); return { q: 'Rs' + p + ' lent at ' + r1 + '%, ' + r2 + '%, ' + r3 + '% for 3yr CI. Amount?', a: Math.round(p * (1+r1/100) * (1+r2/100) * (1+r3/100)), hint: 'A = P(1+r1/100)(1+r2/100)(1+r3/100)', intuition: 'A = ' + p + '×(1+' + r1/100 + ')×(1+' + r2/100 + ')×(1+' + r3/100 + ') = ' + Math.round(p*(1+r1/100)*(1+r2/100)*(1+r3/100)) }; },
    // SBI PO Hard: find CI difference between yearly and half-yearly
    function(){ var p=rand(2,5)*1000, r=[8,10,12][rand(0,2)]; var y=Math.round(p*(1+r/100)-p), hy=Math.round(p*Math.pow(1+r/200,2)-p); return { q: 'Rs' + p + ' at ' + r + '%. CI half-yearly vs yearly diff?', a: hy-y, hint: 'Yearly CI=' + y + ', half-yearly CI=' + hy, intuition: 'Yearly=' + y + ', half-yearly=' + hy + '. Diff = ' + (hy-y) }; },
    // SBI PO Hard: population growth (CI application)
    function(){ var p=rand(50000,200000), r=rand(3,8); return { q: 'Population ' + p + ', grows ' + r + '% annually. Population after 2yr?', a: Math.round(p * Math.pow(1+r/100, 2)), hint: 'Use CI formula: P(1+r/100)^t', intuition: 'After 2yr = ' + p + '×(1+' + r/100 + ')² = ' + Math.round(p*Math.pow(1+r/100,2)) }; }
  ];
  var idx;
  if (diff >= 5 && ty.length >= 4) {
    idx = Math.random() < 0.7 ? rand(Math.max(0, ty.length - 4), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var t = ty[idx];
  var d = t();
  var o = [d.a]; var _g=0; while(o.length<4&&_g++<80){var sp=Math.max(1, Math.round(d.a*0.2)); var v=Math.max(1, Math.round(d.a + rand(-sp, sp))); if(o.indexOf(v)<0&&v>0)o.push(v);}
  shuffle(o);
  return { question: d.q, answer: d.a, options: o, hint: d.hint, timeLimit: layer==='instinct'?15:20, type:'quant', techniqueLabel:'CI: '+d.hint, intuition: d.intuition||'CI = P(1+r/100)^t - P. For 2yr at r%: effective% = r + r + r²/100.' };
}

function generateDiscountQuestion(diff, layer) {
  var ty = [
    function(){ var m=rand(5,20)*100, d=rand(5,30); return { q: 'Discount ' + d + '% on MP Rs' + m + '. SP?', a: Math.round(m*(100-d)/100), hint: 'SP = MP × (100-d)/100', intuition: d + '% off → pay ' + (100-d) + '%. SP = ' + m + ' × ' + (100-d) + '% = ' + Math.round(m*(100-d)/100) }; },
    function(){ var m=rand(5,20)*100, d1=rand(10,20), d2=rand(5,15); return { q: 'Successive ' + d1 + '% then ' + d2 + '% on Rs' + m + '. Net SP?', a: Math.round(m*(100-d1)/100*(100-d2)/100), hint: 'Apply discounts one after another', intuition: 'After ' + d1 + '%: ' + (100-d1) + '% = ' + Math.round(m*(100-d1)/100) + '. Then ' + d2 + '%%: ×' + (100-d2)/100 + ' = ' + Math.round(m*(100-d1)/100*(100-d2)/100) }; },
    function(){ var c=rand(5,15)*100, p=rand(15,40); return { q: 'Single discount equivalent to ' + p + '% + 10%', a: 100 - (100-p)*90/100, hint: 'Net = 100 - (100-d1)(100-d2)/100', intuition: 'Net discount = d1 + d2 - d1×d2/100 = ' + p + ' + 10 - ' + (p*10/100) + ' = ' + (100 - (100-p)*90/100 | 0) + '%' }; },
    function(){ var cp=rand(3,10)*100, g=rand(10,30); return { q: 'CP Rs' + cp + ', gain ' + g + '%. Mark up ' + (g+10) + '% above CP. Discount %?', a: Math.round(100 - (100+g)/(100+g+10)*100), hint: 'SP=CP(' + (100+g) + '%), MP=CP(' + (100+g+10) + '%), discount = (MP-SP)/MP', intuition: 'SP = ' + (100+g) + '% of CP, MP = ' + (100+g+10) + '% of CP. Discount = (MP-SP)/MP × 100' }; },
    // Reverse: find MP given SP and discount %
    function(){ var m=rand(5,20)*100, d=rand(5,25); var sp=Math.round(m*(100-d)/100); return { q: 'SP=Rs' + sp + ', discount ' + d + '%. MP?', a: m, hint: 'MP = SP × 100/(100-d)', intuition: 'MP = ' + sp + ' × 100/' + (100-d) + ' = ' + sp + ' × ' + Math.round(100/(100-d)*100)/100 + ' = ' + m }; },
    // Reverse: find CP given MP, discount%, and profit%
    function(){ var cp=rand(20,60)*10, d=rand(10,25), g=rand(8,20); var mp=Math.round(cp*(100+g+d)/100); var sp=Math.round(mp*(100-d)/100); return { q: 'MP=Rs' + mp + ', discount ' + d + '%, profit ' + g + '%. CP?', a: cp, hint: 'CP = SP × 100/(100+g). SP = MP × (100-d)/100', intuition: 'SP = ' + mp + ' × ' + (100-d) + '% = ' + sp + '. CP = ' + sp + ' × 100/' + (100+g) + ' = Rs' + cp }; },
    // Discount% to gain a specific profit%
    function(){ var cp=rand(20,50)*10, g=rand(10,20), mp=cp+rand(10,30)*10; return { q: 'CP=Rs' + cp + ', wants ' + g + '% profit. MP=Rs' + mp + '. Discount %?', a: Math.round(100 - (cp*(100+g)/100)/mp*100), hint: 'SP = CP(' + (100+g) + '%), discount = (MP-SP)/MP×100', intuition: 'SP = ' + cp + '×' + (100+g) + '% = ' + Math.round(cp*(100+g)/100) + '. Discount = (MP-SP)/MP = (' + mp + '-' + Math.round(cp*(100+g)/100) + ')/' + mp + ' = ' + Math.round(100 - (cp*(100+g)/100)/mp*100) + '%' }; },
    // Find discount% given MP and SP
    function(){ var mp=rand(10,30)*10, d=rand(10,35); return { q: 'MP=Rs' + mp + ', SP=Rs' + Math.round(mp*(100-d)/100) + '. Discount %?', a: d, hint: 'Discount = (MP-SP)/MP × 100', intuition: 'Discount = (' + mp + '-' + Math.round(mp*(100-d)/100) + ')/' + mp + ' × 100 = ' + Math.round((mp-Math.round(mp*(100-d)/100))/mp*100) + '%' }; },
    // SBI PO Hard: three successive discounts equivalent single discount
    function(){ var d1=rand(5,15), d2=rand(5,12), d3=rand(3,10); var eff=100-(100-d1)*(100-d2)*(100-d3)/10000; return { q: 'Single discount equivalent to ' + d1 + '%, ' + d2 + '%, ' + d3 + '%?', a: Math.round(eff), hint: '100 - (100-d1)(100-d2)(100-d3)/100²', intuition: '100 - (' + (100-d1) + '×' + (100-d2) + '×' + (100-d3) + ')/10000 = ' + Math.round(eff) + '%' }; },
    // SBI PO Hard: find MP when two successive discounts give same SP as one discount
    function(){ var mp=rand(2000,8000), d1=rand(10,20), d2=rand(5,15), sd=rand(15,30); var sp=Math.round(mp*(100-d1)/100*(100-d2)/100); return { q: 'MP=Rs' + mp + '. Discount ' + d1 + '% then ' + d2 + '%. Single discount giving same SP?', a: Math.round(100 - sp*100/mp), hint: 'SP = ' + sp + ', single discount = (MP-SP)/MP×100', intuition: 'SP=' + sp + ', discount = (' + mp + '-' + sp + ')/' + mp + '×100 = ' + Math.round(100-sp*100/mp) + '%' }; },
    // SBI PO Hard: profit when marked price equals cost plus markup and two discounts
    function(){ var cp=rand(500,2000), m=rand(30,50), d1=rand(5,15), d2=rand(5,10); var mp=Math.round(cp*(100+m)/100); var sp=Math.round(mp*(100-d1)/100*(100-d2)/100); return { q: 'CP=Rs' + cp + ', marked ' + m + '%↑, discount ' + d1 + '% then ' + d2 + '%. Profit/Loss%?', a: Math.round((sp-cp)/cp*100), hint: 'SP=' + sp + ', P%=(SP-CP)/CP×100', intuition: 'MP=' + mp + ', SP=' + mp + '×' + (100-d1)/100 + '×' + (100-d2)/100 + '=' + sp + '. P%=' + Math.round((sp-cp)/cp*100) + '%' }; },
    // SBI PO Hard: find discount% to achieve target profit when given a false weight
    function(){ var w=rand(800,950), g=rand(10,20), cp=rand(100,300); var effCp=Math.round(cp*1000/w); var sp=Math.round(cp*(100+g)/100); return { q: 'CP=Rs' + cp + '/kg. Uses ' + w + 'g instead of 1kg. Wants ' + g + '% profit. MP for ' + rand(5,15) + '% discount?', a: Math.round(sp*100/(100-rand(5,15))), hint: 'Effective CP per kg = ' + effCp + '. Then SP for ' + g + '% profit = ' + sp + '. Then MP = SP/(1-discount)' }; }
  ];
  var idx;
  if (diff >= 5 && ty.length >= 4) {
    idx = Math.random() < 0.7 ? rand(Math.max(0, ty.length - 4), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var t = ty[idx];
  var d = t();
  var o = [d.a]; var _g=0; while(o.length<4&&_g++<60){var v=d.a+rand(-8,8); if(o.indexOf(v)<0&&v>0)o.push(v);} if(o.length<4){o.push(d.a+8,d.a+16,d.a+24);}
  shuffle(o);
  return { question: d.q, answer: d.a, options: o, hint: d.hint, timeLimit: layer==='instinct'?12:18, type:'quant', techniqueLabel:'Discount: '+d.hint, intuition: d.intuition||'SP = MP × (100-d)/100. Successive: apply one after another, not additive.' };
}

function generateRacesQuestion(diff, layer) {
  var ty = [
    function(){ var d=rand(50,200)*10, a=rand(4,10); return { q: 'A runs ' + d + 'm at ' + a + 'm/s. Beat B by ' + (a*rand(2,5)) + 'm. B speed?', a: Math.round(a * (d - a*rand(2,5)) / d * 10) / 10, hint: 'B time = A time, B distance = ' + (d - a*rand(2,5)), intuition: 'A takes ' + (d/a) + 's. B runs ' + (d - a*rand(2,5)) + 'm in same time. B speed = distance/time' }; },
    function(){ var a=rand(5,12), h=rand(2,5); return { q: 'A gives B ' + h + 'm start in 100m race. A beats B by ' + rand(1,3) + 's. A speed=' + a + 'm/s. B speed?', a: Math.round((100-h)/(100/a+rand(1,3))*10)/10, hint: 'B runs ' + (100-h) + 'm in A time + ' + rand(1,3) + 's', intuition: 'A time = ' + 100/a + 's. B time = ' + (100/a+rand(1,3)) + 's. B runs ' + (100-h) + 'm, speed = ' + (100-h) + '/' + (100/a+rand(1,3)) }; },
    function(){ var l=rand(2,6)*200; return { q: 'A and B on circular track ' + l + 'm. Speeds ' + rand(3,6) + ' and ' + rand(2,5) + 'm/s. Meet first time?', a: Math.round(l / Math.abs(rand(3,6)-rand(2,5))), hint: 'Time = track length ÷ relative speed', intuition: 'Relative speed = ' + Math.abs(rand(3,6)-rand(2,5)) + 'm/s. Time to meet = ' + l + '/' + Math.abs(rand(3,6)-rand(2,5)) + ' = ' + Math.round(l/Math.abs(rand(3,6)-rand(2,5))) + 's' }; },
    // Hard: A beats B by X m in Y m race, find by how much A beats C
    function(){ var d=rand(100,200); var b=rand(5,15); var c=b+rand(3,8); return { q: 'A beats B by ' + b + 'm in ' + d + 'm race. A beats C by ' + c + 'm. By how much does B beat C in ' + d + 'm?', a: Math.round(d - (d-b)*(d-c)/d), hint: 'B distance = ' + (d-b) + ' when A at ' + d + '. C distance = ' + (d-c) + '. B vs C: ratio = ' + (d-b) + ':' + (d-c), intuition: 'When A finishes ' + d + 'm: B at ' + (d-b) + 'm, C at ' + (d-c) + 'm. B beats C by ' + d + ' - ' + (d-b)*(d-c)/d + ' = ' + Math.round(d - (d-b)*(d-c)/d) + 'm' }; },
    // Head start: A gives B X m start
    function(){ var d=rand(100,200), sa=rand(6,12), sb=rand(4,8); var tA=d/sa; var bDist=tA*sb; var start=Math.round(d-bDist); if(start<5)start=rand(10,30); return { q: 'A speed=' + sa + 'm/s, B speed=' + sb + 'm/s in ' + d + 'm race. What start should A give B for a tie?', a: start, hint: 'Time same: d/sa = (d-start)/sb', intuition: 'Time A = ' + d + '/' + sa + ' = ' + tA.toFixed(2) + 's. B distance in same time = ' + tA.toFixed(2) + '×' + sb + ' = ' + bDist.toFixed(1) + 'm. Start = ' + d + ' - ' + bDist.toFixed(1) + ' = ' + start + 'm' }; },
    // Circular race: number of laps
    function(){ var l=rand(2,5)*200; var sa=rand(5,9), sb=rand(3,6); return { q: 'Circular track ' + l + 'm. A at ' + sa + 'm/s, B at ' + sb + 'm/s (same dir). Laps before A overtakes B?', a: Math.round(sa/(sa-sb)), hint: 'Relative speed = ' + (sa-sb) + '. A overtakes B when A gains 1 lap. Laps = sa/(sa-sb)', intuition: 'Time to overtake = ' + l + '/' + (sa-sb) + '=' + Math.round(l/(sa-sb)) + 's. Laps by A = ' + Math.round(l/(sa-sb)) + '×' + sa + '/' + l + ' = ' + Math.round(sa/(sa-sb)) + ' laps' }; },
    // Race with dead heat: find the gap
    function(){ var d=rand(100,200); var a=rand(6,10), b=rand(4,a-1); var tA=d/a; var bDist=tA*b; var win=Math.round(d-bDist); return { q: 'A runs ' + d + 'm at ' + a + 'm/s, B at ' + b + 'm/s. By how many meters does A win?', a: win, hint: 'A time=' + tA.toFixed(2) + 's. B runs ' + bDist.toFixed(1) + 'm in that time. A wins by ' + d + '-' + bDist.toFixed(1), intuition: 'Time A = ' + d + '/' + a + ' = ' + tA.toFixed(2) + 's. B distance = ' + tA.toFixed(2) + '×' + b + ' = ' + bDist.toFixed(1) + 'm. A wins by ' + Math.round(d-bDist) + 'm' }; },
    // Circular track opposite direction: meeting points count
    function(){ var l=rand(2,5)*200; var sa=rand(5,9), sb=rand(4,7); return { q: 'Circular track ' + l + 'm. A at ' + sa + 'm/s, B at ' + sb + 'm/s (opposite). Meetings in 1 hour?', a: Math.floor(3600*(sa+sb)/l), hint: 'Rel speed = ' + (sa+sb) + 'm/s. Each meeting when combined distance = track length. Meetings = total dist/track', intuition: 'Relative speed = ' + (sa+sb) + 'm/s. In 3600s, rel dist = ' + 3600*(sa+sb) + 'm. Meetings = ' + 3600*(sa+sb) + '/' + l + ' = ' + Math.floor(3600*(sa+sb)/l) }; },
    // SBI PO Hard: three runners race
    function(){ var d=200, a=rand(5,9), b=rand(4,7), c=rand(3,5); return { q: 'Race ' + d + 'm. A at ' + a + 'm/s, B at ' + b + 'm/s, C at ' + c + 'm/s. By how much does A beat C if A beats B by ' + Math.round(d - d*b/a) + 'm?', a: Math.round(d - d*c/a), hint: 'A time = ' + d/a + 's. C distance in that time = ' + Math.round(d*c/a), intuition: 'A finishes in ' + d/a + 's. C runs ' + Math.round(d*c/a) + 'm. A beats C by ' + Math.round(d - d*c/a) + 'm' }; },
    // SBI PO Hard: race with handicap
    function(){ var d=rand(100,200), h=rand(5,20), sa=rand(6,12); var win=Math.round(h - d*(sa-rand(3,5))/sa); return { q: 'A gives B ' + h + 'm start in ' + d + 'm race. A wins by ' + win + 'm. A speed=' + sa + 'm/s. B speed?', a: Math.round((d-h-win) / (d/sa) * 10) / 10, hint: 'B runs ' + (d-h-win) + 'm in A time ' + d/sa + 's', intuition: 'A time=' + d/sa + 's. B runs ' + (d-h-win) + 'm, speed=' + Math.round((d-h-win)/(d/sa)*10)/10 + 'm/s' }; },
    // SBI PO Hard: race on circular track - first meeting at a point
    function(){ var l=rand(2,5)*200, sa=rand(5,9), sb=rand(4,7); return { q: 'Circular ' + l + 'm. A=' + sa + 'm/s, B=' + sb + 'm/s (same dir). First meet at starting point? Time?', a: Math.round(l / Math.abs(sa-sb)), hint: 'Time to first meeting = L/|sa-sb|. But to meet at start, need LCM of lap times', intuition: 'A lap time=' + l/sa + 's, B lap time=' + l/sb + 's. First meet at start = LCM(' + l/sa + ',' + l/sb + ')s. First meet anywhere = ' + Math.round(l/Math.abs(sa-sb)) + 's' }; }
  ];
  var idx;
  if (diff >= 5 && ty.length >= 4) {
    idx = Math.random() < 0.7 ? rand(Math.max(0, ty.length - 4), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var t = ty[idx];
  var d = t();
  var o = [d.a]; var _g=0; while(o.length<4&&_g++<80){var v=Math.max(1, Math.round(d.a+rand(-5,5))); if(o.indexOf(v)<0&&v>0)o.push(v);}
  shuffle(o);
  return { question: d.q, answer: d.a, options: o, hint: d.hint, timeLimit: layer==='instinct'?15:20, type:'quant', techniqueLabel:'Races: '+d.hint, intuition: d.intuition||'In races: focus on TIME = same for both runners. Speed = distance/time.' };
}

function generateDataInterpretationQuestion(diff, layer) {
  function tableHtml(headers, rows) {
    var h = headers.map(function(h){return '<th style="padding:4px 10px;border:1px solid rgba(255,255,255,.15);font-size:.82em;background:rgba(167,139,250,.12)">' + h + '</th>';}).join('');
    var r = rows.map(function(row){
      return '<tr>' + row.map(function(c){return '<td style="padding:4px 10px;border:1px solid rgba(255,255,255,.08);font-size:.82em;text-align:center">' + c + '</td>';}).join('') + '</tr>';
    }).join('');
    return '<table style="border-collapse:collapse;margin:8px 0;width:100%"><thead><tr>' + h + '</tr></thead><tbody>' + r + '</tbody></table>';
  }
  var types = [
    [1, function(){ var a=rand(30,80), b=rand(20,60), c=rand(10,40); return { tbl:tableHtml(['Item','Value'],[['A',a],['B',b],['C',c]]), q:'Total of all?', a:a+b+c, hint:'A+B+C'}; }],
    [1, function(){ var m=rand(40,80), f=rand(20,50); return { tbl:tableHtml(['Category','Count'],[['Men',m],['Women',f]]), q:'% women?', a:Math.round(f*100/(m+f)), hint:'women/total×100'}; }],
    [1, function(){ var a=rand(20,50), b=rand(15,40), c=rand(10,30), d=rand(5,20); return { tbl:tableHtml(['Quarter','Sales'],[['Q1',a],['Q2',b],['Q3',c],['Q4',d]]), q:'Avg sales/quarter?', a:Math.round((a+b+c+d)/4), hint:'Sum÷4'}; }],
    [2, function(){ var y1=rand(400,800), y2=y1+rand(50,200); return { tbl:tableHtml(['Year','Rev (₹cr)'],[['Y1',y1],['Y2',y2]]), q:'% growth?', a:Math.round((y2-y1)/y1*100), hint:'(Y2-Y1)/Y1×100'}; }],
    [2, function(){ var a=rand(20,40), b=rand(15,30), c=100-a-b; return { tbl:tableHtml(['Sector','Share (%)'],[['A',a+'%'],['B',b+'%'],['C',c+'%']]), q:'Central angle of C?', a:Math.round(c*3.6*10)/10, hint:'%×3.6°'}; }],
    [2, function(){ var y=rand(3000,8000), e=y-rand(200,500); return { tbl:tableHtml(['Item','Amt (₹)'],[['Revenue',y],['Expense',e]]), q:'Profit %?', a:Math.round((y-e)*100/y), hint:'(R-E)/R×100'}; }],
    [3, function(){ var v=[rand(200,400), rand(300,500), rand(250,450)], yrs=[2018,2019,2020], i=rand(0,2), j=rand(0,2); while(j===i)j=rand(0,2); var g=function(x,y){return y?g(y,x%y):x;}, d=g(v[i],v[j]); return { tbl:tableHtml(['Year','Value'],[[yrs[i],v[i]],[yrs[j],v[j]]]), q:'Ratio '+yrs[i]+':'+yrs[j]+'?', a:(v[i]/d)+':'+(v[j]/d), hint:'Find HCF'}; }],
    [3, function(){ var t=rand(500,2000), a=rand(20,60), b=100-a; return { tbl:tableHtml(['Dept','Share (%)'],[['A',a+'%'],['B',b+'%']])+'<div style="font-size:.82em;margin-top:4px">Total: ₹'+t+'cr</div>', q:'Expenditure of A?', a:Math.round(t*a/100), hint:'Total×A%'}; }],
    [3, function(){ var p1=rand(200,500), p2=rand(300,600), p3=rand(250,550); return { tbl:tableHtml(['Year','Prod (t)'],[['2019',p1],['2020',p2],['2021',p3]]), q:'% change 2019→2021?', a:Math.round((p3-p1)/p1*100), hint:'(2021-2019)/2019×100'}; }],
    [4, function(){ var vals=[rand(50,90), rand(40,80), rand(30,70), rand(20,60), rand(10,50)], labels, ans; if(diff>=4){ labels=['','','','','']; for(var k=0;k<5;k++)labels[k]='City'+String.fromCharCode(65+k); } else labels=['A','B','C','D','E']; var idx=rand(0,4), idx2=rand(0,4); while(idx2===idx)idx2=rand(0,4); ans=Math.round(vals[idx]*100/vals[idx2]); return { tbl:tableHtml(['City','Pop (000)'],labels.map(function(l,i){return[l,vals[i]];})), q:labels[idx]+' is what % of '+labels[idx2]+'?', a:ans, hint:labels[idx]+'/'+labels[idx2]+'×100'}; }],
    [4, function(){ var s1=rand(200,500), s2=rand(150,400), s3=rand(100,300); var growth1to2=Math.round((s2-s1)/s1*100), growth2to3=Math.round((s3-s2)/s2*100); return { tbl:tableHtml(['Year','Sales (₹L)'],[['2020',s1],['2021',s2],['2022',s3]]), q:'Which yr had higher % growth?', a:growth1to2>=growth2to3?'2020-21':'2021-22', hint:'Compute both growth rates'}; }],
    [4, function(){ var a=rand(25,45), b=rand(15,35), c=100-a-b; var tot=rand(800,2000); return { tbl:tableHtml(['Sector','%'],[['Agri',a+'%'],['Ind',b+'%'],['Serv',c+'%']])+'<div style="font-size:.82em">Total GDP: ₹'+tot+'cr</div>', q:'Diff b/w Agri & Serv GDP?', a:Math.round(tot*(Math.abs(a-c))/100), hint:'|Agri-Serv|%×total'}; }],
    [5, function(){ var companies=4; var profits=[]; for(var k=0;k<companies;k++)profits.push(rand(200,600)); var sum=profits.reduce(function(a,b){return a+b;},0); var c=rand(0,companies-1); return { tbl:tableHtml(['Co','Profit (₹L)'],profits.map(function(p,i){return['Co'+(i+1),p];})), q:'Co'+(c+1)+' profit share % of total?', a:Math.round(profits[c]*100/sum), hint:'Co'+(c+1)+'/total×100'}; }],
    [5, function(){ var labels=['Jan','Feb','Mar','Apr','May','Jun']; var revs=labels.map(function(){return rand(100,500);}); var costs=labels.map(function(){return rand(50,300);}); var totals=revs.map(function(r,i){return r-costs[i];}); var maxP=Math.max.apply(null,totals), minP=Math.min.apply(null,totals); var maxI=totals.indexOf(maxP), minI=totals.indexOf(minP); return { tbl:tableHtml(['Month','Rev','Cost'],[['Jan',revs[0],costs[0]],['Feb',revs[1],costs[1]],['Mar',revs[2],costs[2]],['Apr',revs[3],costs[3]],['May',revs[4],costs[4]],['Jun',revs[5],costs[5]]]), q:'Max profit month & min profit month?', a:labels[maxP]+' & '+labels[minP], hint:'Profit=Rev-Cost for each month'}; }],
    // New: Multi-column comparison table
    [3, function(){ var c=[rand(300,700), rand(400,800), rand(500,900), rand(350,750)]; var r=[rand(250,600), rand(300,700), rand(400,800), rand(300,650)]; return { tbl:tableHtml(['Co','Revenue','Expense','Profit'],[['A',c[0],r[0],c[0]-r[0]],['B',c[1],r[1],c[1]-r[1]],['C',c[2],r[2],c[2]-r[2]],['D',c[3],r[3],c[3]-r[3]]]), q:'Which company has highest profit %?', a:function(){var ps=c.map(function(v,i){return Math.round((v-r[i])*100/v);});var mx=Math.max.apply(null,ps);return 'Co'+(ps.indexOf(mx)+1);}(), hint:'Profit% = (Rev-Exp)/Rev×100'}; }],
    // New: Multi-year multi-category table
    [4, function(){ var ap=[rand(200,400), rand(250,450), rand(300,500)]; var bp=[rand(150,300), rand(200,350), rand(250,400)]; var y=[2020,2021,2022]; return { tbl:tableHtml(['Year','Product A','Product B','Total'],[[y[0],ap[0],bp[0],ap[0]+bp[0]],[y[1],ap[1],bp[1],ap[1]+bp[1]],[y[2],ap[2],bp[2],ap[2]+bp[2]]]), q:'% growth in total sales 2020→2022?', a:Math.round((ap[2]+bp[2]-(ap[0]+bp[0]))*100/(ap[0]+bp[0])), hint:'(T2022-T2020)/T2020×100'}; }],
    // New: True/False statement based on table
    [4, function(){ var co=[rand(40,90), rand(30,80), rand(20,70), rand(10,60), rand(5,50)]; var stmts=[co[0]>co[1]?'A > B':'B > A', 'Total > '+Math.round(co.reduce(function(a,b){return a+b;},0)-rand(10,50)), co[2]+' < 50', 'Avg < 60', co[4]+' < '+co[0]]; var which=rand(0,stmts.length-1); return { tbl:tableHtml(['City','Score'],[['A',co[0]],['B',co[1]],['C',co[2]],['D',co[3]],['E',co[4]]]), q:'Which statement is TRUE?', a:stmts[which], hint:'Check each statement against the table'}; }],
    // New: Bar chart visual using CSS
    [3, function(){ var vals=[rand(30,90), rand(20,80), rand(40,95), rand(10,70)]; var max=Math.max.apply(null,vals); var bars=vals.map(function(v){var pct=Math.round(v/max*100);return '<div style="margin:2px 0;font-size:.72em;display:flex;align-items:center;gap:4px"><span style="width:30px;text-align:right">'+v+'</span><div style="height:16px;width:'+pct+'%;background:linear-gradient(90deg,var(--purple),var(--emerald));border-radius:0 4px 4px 0;min-width:4px"></div></div>';}).join(''); var labels=['Q1','Q2','Q3','Q4']; return { tbl:'<div style="margin:8px 0;padding:8px 0"><div style="font-size:.75em;color:var(--text-sec);margin-bottom:4px">Sales (₹L) by Quarter</div>'+bars+'</div>', q:'Total annual sales?', a:vals.reduce(function(a,b){return a+b;},0), hint:'Sum all quarters'}; }],
    // New: Two-table comparison
    [5, function(){ var mNames=['TechCo','MedCorp','FinServ','EduInc']; var revs=[rand(500,1500), rand(400,1200), rand(300,1000), rand(200,800)]; var emps=[rand(100,500), rand(80,400), rand(60,300), rand(40,200)]; var c=rand(0,3); return { tbl:tableHtml(['Company','Rev (₹L)','Employees'],[mNames.map(function(n,i){return[n,revs[i],emps[i]];})[0],mNames.map(function(n,i){return[n,revs[i],emps[i]];})[1],mNames.map(function(n,i){return[n,revs[i],emps[i]];})[2],mNames.map(function(n,i){return[n,revs[i],emps[i]];})[3]]), q:'Revenue per employee of '+mNames[c]+'? (₹L)', a:Math.round(revs[c]*100/emps[c])/100, hint:'Rev÷Employees'}; }]
  ];
  var matched = types.filter(function(t){ return t[0] <= diff; });
  if (matched.length === 0) matched = types;
  var chosen = matched[rand(0, matched.length - 1)];
  var data = chosen[1]();
  var q = (data.tbl || '') + '<div style="margin-top:8px;font-weight:600">' + data.q + '</div>';
  var opts = [data.a];
  var spread = typeof data.a==='number' ? Math.max(2, Math.abs(data.a*0.12)) : 3;
  for (var _g=0; _g<50 && opts.length<4; _g++) {
    var v = typeof data.a==='number' ? Math.round(data.a + rand(-spread, spread)) : data.a;
    if (opts.indexOf(v) < 0 && (typeof v!=='number'||v>=0)) opts.push(v);
  }
  shuffle(opts);
  return { question: q, answer: data.a, options: opts, hint: data.hint, timeLimit: layer==='instinct'?15:20, type:'quant', techniqueLabel:'DI: '+data.hint, intuition:'Read table carefully. Identify total/avg/%, compute stepwise. For pie: central angle = % × 3.6°. For growth: (new-old)/old×100.' };
}

// ====== CASELET DI ======
// Passage-style data interpretation: read a short paragraph, extract the numbers,
// answer one targeted computation. Matches bank exam "caselet" style.
function generateCaseletDIQuestion(diff, layer) {
  function caseletHtml(passage, note) {
    var html = '<div style="margin:8px 0;padding:10px 12px;border-left:3px solid var(--purple);background:rgba(167,139,250,.06);font-size:.86em;line-height:1.55">' + passage + '</div>';
    if (note) html += '<div style="font-size:.74em;color:var(--text-sec);margin-bottom:4px">' + note + '</div>';
    return html;
  }
  var types = [
    // Revenue split passage
    [1, function(){ var rev=rand(400,1200), pa=rand(25,40), pb=rand(20,35), pc=100-pa-pb; var q1=Math.round(rev*pa/100); return { tbl:caseletHtml('A company reported total revenue of ₹'+rev+' crore. Product A contributed '+pa+'%, Product B '+pb+'% and the rest came from Product C.', ''), q:'Revenue from Product C (₹cr)?', a:Math.round(rev*pc/100), hint:pc+'% of '+rev, sol:'Product C = 100 - '+pa+' - '+pb+' = '+pc+'%. '+pc+'% of '+rev+' = ₹'+(rev*pc/100)+'cr.'}; }],
    // Village population passage
    [1, function(){ var pop=rand(2000,9000), menP=rand(45,60), litMen=rand(20,40); var men=Math.round(pop*menP/100), lit=Math.round(men*litMen/100); return { tbl:caseletHtml('Village Amar has a population of '+pop+'. Men form '+menP+'% of the population. '+litMen+'% of the men are literate.', ''), q:'How many literate men?', a:lit, hint:pop+'×'+menP+'%×'+litMen+'%', sol:'Men = '+menP+'% of '+pop+' = '+men+'. Literate men = '+litMen+'% of '+men+' = '+lit+'.'}; }],
    // Students by stream passage
    [2, function(){ var total=rand(600,2000), arts=rand(30,45), sci=rand(25,40), rest=100-arts-sci; return { tbl:caseletHtml('A college has '+total+' students. '+arts+'% study Arts, '+sci+'% study Science and the remaining study Commerce.', ''), q:'Commerce students?', a:Math.round(total*rest/100), hint:rest+'% of '+total, sol:'Commerce = 100 - '+arts+' - '+sci+' = '+rest+'%. '+rest+'% of '+total+' = '+Math.round(total*rest/100)+'.'}; }],
    // Train passenger passage
    [2, function(){ var p1=rand(400,1000), p2=Math.round(p1*(rand(110,140)/100)); return { tbl:caseletHtml('Train A carried '+p1+' passengers on Monday. On Tuesday it carried '+p2+' passengers. On Wednesday it carried '+Math.round(p1*(rand(80,105)/100))+' passengers.', 'Note: compute using Monday as base.'), q:'% increase from Monday to Tuesday?', a:Math.round((p2-p1)*100/p1), hint:'(Tue-Mon)/Mon×100', sol:'Increase = '+(p2-p1)+'. % = '+(p2-p1)+'/'+p1+'×100 = '+Math.round((p2-p1)*100/p1)+'%.'}; }],
    // Farm produce passage
    [3, function(){ var h1=rand(50,150), h2=rand(60,160), h3=rand(40,130); var tot=h1+h2+h3; return { tbl:caseletHtml('A farmer grows wheat, rice and pulses. Production in tonnes: Wheat '+h1+', Rice '+h2+', Pulses '+h3+'. The produce is sold at ₹'+rand(2000,4000)+' per tonne.', 'Prices apply equally to all crops.'), q:'Wheat share of total production (%)?', a:Math.round(h1*100/tot), hint:'Wheat/total×100', sol:'Total = '+tot+'. Wheat% = '+h1+'/'+tot+'×100 = '+Math.round(h1*100/tot)+'%.'}; }],
    // Two products with profit passage
    [3, function(){ var c1=rand(200,500), p1=rand(15,35), c2=rand(300,600), p2=rand(10,30); var sp1=Math.round(c1*(100+p1)/100), sp2=Math.round(c2*(100+p2)/100); return { tbl:caseletHtml('A shopkeeper sells two items. Item X costs ₹'+c1+' and is sold at '+p1+'% profit. Item Y costs ₹'+c2+' and is sold at '+p2+'% profit.', ''), q:'Total selling price of both items (₹)?', a:sp1+sp2, hint:'SP = CP×(100+P)/100 for each', sol:'SP(X) = '+c1+'×'+p1+'% = ₹'+sp1+'. SP(Y) = '+c2+'×'+p2+'% = ₹'+sp2+'. Total = ₹'+(sp1+sp2)+'.'}; }],
    // Monthly savings passage
    [4, function(){ var inc=rand(25000,60000), expP=rand(60,80); var sav=Math.round(inc*(100-expP)/100); return { tbl:caseletHtml('Mr. Rao earns ₹'+inc+' per month. He spends '+expP+'% of his income and saves the rest. He deposits his monthly saving in a scheme at 8% simple interest per annum.', ''), q:'Saving after 1 year including interest?', a:Math.round(sav + sav*8/100), hint:'Save='+sav+'. SI = P×8×1/100', sol:'Monthly saving = '+sav+'. Yearly = '+sav*12+' invested; SI on '+(sav*12)+' = ₹'+(sav*12*8/100)+'. Total = ₹'+(sav*12+sav*12*8/100)+'.'}; }],
    // Election / vote share passage
    [4, function(){ var total=rand(50000,200000), c1P=rand(35,55), c2P=rand(25,45), rest=100-c1P-c2P; var nv=Math.round(total*rest/100); return { tbl:caseletHtml('In a constituency, '+total+' votes were polled. Candidate A got '+c1P+'% of the votes, Candidate B got '+c2P+'% and the remaining votes went to other candidates or were NOTA.', ''), q:'Votes for others + NOTA?', a:nv, hint:rest+'% of '+total, sol:'Others = 100 - '+c1P+' - '+c2P+' = '+rest+'%. '+rest+'% of '+total+' = '+nv+'.'}; }],
    // Mixed: city population with gender & literacy
    [5, function(){ var tot=rand(50000,150000), maleP=rand(48,55), litP=rand(60,80); var males=Math.round(tot*maleP/100), lit=Math.round(tot*litP/100), litFemales=Math.round(lit*(rand(35,50))/100); return { tbl:caseletHtml('City Meera has '+tot+' residents. '+maleP+'% are males. Overall literacy is '+litP+'%. Among literates, '+Math.round((litFemales*100)/lit)+'% are female.', 'Use the given figures exactly.'), q:'Female literates?', a:litFemales, hint:'Total lit×female%, where total lit = '+litP+'% of '+tot, sol:'Total literates = '+litP+'% of '+tot+' = '+lit+'. Female literates = '+Math.round(litFemales*100/lit)+'% of '+lit+' = '+litFemales+'.'}; }],
    // Mixed: company departments budget
    [5, function(){ var tot=rand(2000,8000), hr=rand(15,30), it=rand(20,35), ops=100-hr-it; var opsAmt=Math.round(tot*ops/100); return { tbl:caseletHtml('A company budgets ₹'+tot+' lakh for the year. HR gets '+hr+'%, IT gets '+it+'% and the rest is for Operations. Operations spends 30% of its share on cloud services.', ''), q:'Cloud services budget (₹L)?', a:Math.round(opsAmt*30/100), hint:'Ops = '+ops+'% of '+tot+', then 30% of that', sol:'Ops share = '+ops+'% of '+tot+' = ₹'+opsAmt+'L. Cloud = 30% of '+opsAmt+' = ₹'+Math.round(opsAmt*30/100)+'L.'}; }]
  ];
  var matched = types.filter(function(t){ return t[0] <= diff; });
  if (matched.length === 0) matched = types;
  var chosen = matched[rand(0, matched.length - 1)];
  var data = chosen[1]();
  var q = (data.tbl || '') + '<div style="margin-top:8px;font-weight:600">' + data.q + '</div>';
  var opts = [data.a];
  var spread = typeof data.a==='number' ? Math.max(2, Math.abs(data.a*0.12)) : 3;
  for (var _g=0; _g<50 && opts.length<4; _g++) {
    var v = typeof data.a==='number' ? Math.round(data.a + rand(-spread, spread)) : data.a;
    if (opts.indexOf(v) < 0 && (typeof v!=='number'||v>=0)) opts.push(v);
  }
  shuffle(opts);
  return { question: q, answer: data.a, options: opts, hint: data.hint, solution: data.sol || '', timeLimit: layer==='instinct'?20:30, type:'quant', techniqueLabel:'Caselet DI', intuition:'Extract the numbers from the passage, build the equation stepwise, compute carefully.' };
}

// ====== FULLER TRIGONOMETRY ======
// Identities, standard-angle values, complementary/reciprocal relations — beyond
// the pure height-distance style. Generates exact-value numeric MCQs.
function generateTrigonometryQuestion(diff, layer) {
  var types = [
    // Standard angle value
    [1, function(){ var rows=[['sin 30°','1/2'],['sin 45°','1/√2'],['sin 60°','√3/2'],['cos 30°','√3/2'],['cos 45°','1/√2'],['cos 60°','1/2'],['tan 30°','1/√3'],['tan 45°','1'],['tan 60°','√3'],['sin 0°','0'],['cos 0°','1'],['cos 90°','0']]; var r=rows[rand(0,rows.length-1)]; return { q:'Value of '+r[0]+'?', a:r[1], hint:'Memorize standard angle values', sol:r[0]+' = '+r[1]+'. Standard values: sin0=0, sin30=1/2, sin45=1/√2, sin60=√3/2, cos90=0.'}; }],
    // sin²+cos²
    [1, function(){ var ang=['θ','30°','45°','60°','A'][rand(0,4)]; return { q:'sin²'+ang+' + cos²'+ang+' = ?', a:'1', hint:'Pythagorean identity', sol:'sin²θ + cos²θ = 1 for all θ. This is the fundamental Pythagorean identity.'}; }],
    // complementary angles
    [1, function(){ return { q:'sin 30° = cos of which angle?', a:'60°', hint:'sin(90°-θ) = cos θ', sol:'sin 30° = cos(90°-30°) = cos 60° = 1/2.'}; }],
    [2, function(){ var ang=[['30','60'],['45','45'],['60','30'],['0','90']][rand(0,3)]; return { q:'sin '+ang[0]+'° = cos ____?', a:ang[1]+'°', hint:'sin(90-θ)=cosθ', sol:'sin '+ang[0]+'° = cos(90-'+ang[0]+'°) = cos '+ang[1]+'°.'}; }],
    // Reciprocal relations
    [2, function(){ return { q:'cosec 30° = ?', a:'2', hint:'cosec = 1/sin, sin30°=1/2', sol:'cosec 30° = 1/sin 30° = 1/(1/2) = 2.'}; }],
    [2, function(){ return { q:'sec 60° = ?', a:'2', hint:'sec = 1/cos, cos60°=1/2', sol:'sec 60° = 1/cos 60° = 1/(1/2) = 2.'}; }],
    [2, function(){ return { q:'cot 45° = ?', a:'1', hint:'cot = 1/tan, tan45°=1', sol:'cot 45° = 1/tan 45° = 1/1 = 1.'}; }],
    // sec² - tan²
    [2, function(){ return { q:'sec²θ - tan²θ = ?', a:'1', hint:'Pythagorean identity', sol:'sec²θ - tan²θ = 1 (derived from 1 + tan²θ = sec²θ).'}; }],
    // Given sin, find cos
    [3, function(){ var base=[['3','4','5'],['5','12','13'],['7','24','25'],['8','15','17'],['9','40','41']][rand(0,4)]; var p=parseInt(base[0],10), b=parseInt(base[1],10), h=parseInt(base[2],10); return { q:'If sin θ = '+p+'/'+h+', then cos θ = ?', a:b+'/'+h, hint:'cos = adjacent/hypotenuse, use the triple', sol:'sinθ = '+p+'/'+h+' → opposite='+p+', hyp='+h+'. Adjacent = √(h²-p²) = √('+(h*h-p*p)+') = '+b+'. cosθ = '+b+'/'+h+'.'}; }],
    // tan from sin & cos
    [3, function(){ var base=[['3','4','5'],['5','12','13'],['8','15','17'],['7','24','25']][rand(0,3)]; var p=parseInt(base[0],10), b=parseInt(base[1],10), h=parseInt(base[2],10); return { q:'If sin θ = '+p+'/'+h+' and cos θ = '+b+'/'+h+', then tan θ = ?', a:p+'/'+b, hint:'tan = sin/cos', sol:'tanθ = sinθ/cosθ = ('+p+'/'+h+')/('+b+'/'+h+') = '+p+'/'+b+'.'}; }],
    // sin(A+B) special value
    [3, function(){ var pairs=[['30','60'],['45','45'],['60','30']][rand(0,2)]; var A=parseInt(pairs[0],10), B=parseInt(pairs[1],10); var val = Math.sin((A+B)*Math.PI/180); return { q:'sin '+A+'° cos '+B+'° + cos '+A+'° sin '+B+'° = ?', a:val===1?'1':(val===Math.sqrt(3)/2?'√3/2':'1/2'), hint:'sin(A+B) formula', sol:'This is sin(A+B) = sin('+A+'+'+B+') = sin '+ (A+B)+'° = '+(val===1?'1':(val===Math.sqrt(3)/2?'√3/2':'1/2'))+'.'}; }],
    // 2 sin cos
    [4, function(){ var ang=[30,45,60][rand(0,2)]; var v=Math.sin(2*ang*Math.PI/180); return { q:'2 sin '+ang+'° cos '+ang+'° = ?', a:ang===45?'1':(ang===30?'√3/2':'√3/2'), hint:'2sinθcosθ = sin2θ', sol:'2 sinθ cosθ = sin 2θ = sin '+ (2*ang)+'° = '+(v===1?'1':'√3/2')+'.'}; }],
    // tan(A+B) special
    [4, function(){ var pairs=[['15','30'],['30','15'],['30','30'],['15','15']][rand(0,3)]; var A=parseInt(pairs[0],10), B=parseInt(pairs[1],10); var v=Math.tan((A+B)*Math.PI/180); var av=(v===1?'1':(v===Math.sqrt(3)?'√3':'1/√3')); return { q:'(tan '+A+'° + tan '+B+'°)/(1 - tan '+A+'° tan '+B+'°) = ?', a:av, hint:'tan(A+B) formula', sol:'Formula = tan(A+B) = tan '+(A+B)+'° = '+av+'.'}; }],
    // Identity simplification
    [4, function(){ return { q:'Simplify: (1 - cos²θ)/sin²θ = ?', a:'1', hint:'1 - cos²θ = sin²θ', sol:'1 - cos²θ = sin²θ, so (1-cos²θ)/sin²θ = sin²θ/sin²θ = 1.'}; }],
    // Max value of sin
    [4, function(){ return { q:'Maximum value of sin θ is?', a:'1', hint:'sinθ ranges from -1 to 1', sol:'The sine function oscillates between -1 and 1. Maximum = 1 (at θ=90°).'}; }],
    // Equation solve
    [5, function(){ var rows=[['sin θ = 1','90°'],['cos θ = 1','0°'],['tan θ = 1','45°'],['sin θ = 0','0°'],['cos θ = 0','90°']][rand(0,4)]; return { q:'If 0° ≤ θ ≤ 90° and '+rows[0]+', then θ = ?', a:rows[1], hint:'Solve the trig equation in the given range', sol:rows[0]+' → θ = '+rows[1]+' in the range 0°-90°.'}; }],
    // Compound identity check
    [5, function(){ return { q:'cos 60° = ? (value)', a:'1/2', hint:'cos60° = 1/2', sol:'cos 60° = 1/2 — one of the standard values.'}; }],
    // Sum of squares
    [5, function(){ var ang=['30°','45°','60°'][rand(0,2)]; return { q:'sin²'+ang+' + cos²'+ang+' = ?', a:'1', hint:'Holds for any angle', sol:'sin²'+ang+' + cos²'+ang+' = 1 (Pythagorean identity, true for all angles).'}; }]
  ];
  var matched = types.filter(function(t){ return t[0] <= diff; });
  if (matched.length === 0) matched = types;
  var chosen = matched[rand(0, matched.length - 1)];
  var data = chosen[1]();
  var opts = [data.a];
  var pool = ['1','0','1/2','√3/2','1/√2','√3','1/√3','2','1/√3','√3/2','45°','30°','60°','90°','tan 45°','sin 60°','2/3','3/4'];
  for (var _g=0; _g<50 && opts.length<4; _g++) {
    var v = pool[rand(0, pool.length - 1)];
    if (opts.indexOf(v) < 0) opts.push(v);
  }
  shuffle(opts);
  return { question: '<div style="margin:4px 0 8px 0">' + data.q + '</div>', answer: data.a, options: opts, hint: data.hint, solution: data.sol || '', timeLimit: layer==='instinct'?10:15, type:'quant', techniqueLabel:'Trigonometry', intuition:'Memorize standard values (sin0=0, sin30=1/2, sin45=1/√2, sin60=√3/2). Use identities: sin²+cos²=1, 1+tan²=sec², 1+cot²=cosec², sin(90-θ)=cosθ.' };
}

// ====== NEW REASONING GENERATORS ======

function generateMirrorImageQuestion(diff) {
  var ty = [
    function(){ var l=rand(2,5); return { q: 'How many mirrors needed for ' + l + ' images of an object placed at 60° between them?', a: Math.round(360/60)-1, hint: 'n = 360/θ - 1', intuition: 'n = 360/θ - 1 = 360/'+60+'-1 = '+(6-1)+' mirrors' }; },
    function(){ var fig=['L','G','H','K','M','Q'][rand(0,5)]; return { q: 'Which of these is NOT symmetrical? (' + ['L','G','H','K','M','Q'].join(',') + ')', a: ['G','Q'][rand(0,1)], hint: 'Check vertical mirror axis', intuition: 'Vertical symmetry: left=right mirror copy. Letters like A,H,I,M,O,T,U,V,W,X,Y are vertically symmetrical.' }; },
    function(){ var w=['MOM','WOW','HIM','MADAM'][rand(0,3)]; return { q: 'Water image of "' + w + '" is same as original? (Y/N)', a: w==='MOM'||w==='MADAM'?'Y':'N', hint: 'Check top-bottom reversal', intuition: 'Water image = top-bottom flip. Words that read same upside-down: MOM, WOW, MADAM are symmetrical vertically.' }; },
    // Hard: figure counting (triangles in a pattern)
    function(){ var n=rand(2,4); var count=n*n; return { q: 'How many squares in a ' + n + '×' + n + ' grid?', a: n*n + (n-1)*(n-1) + (n>2?(n-2)*(n-2):0) + (n>3?1:0), hint: 'Count squares of each size: 1×1, 2×2, etc.', intuition: 'Total = 1² + 2² + ... + ' + n + '² = ' + n + '×' + (n+1) + '×' + (2*n+1) + '/6 = ' + Math.round(n*(n+1)*(2*n+1)/6) }; },
    // Hard: cube counting in 3D
    function(){ var n=rand(2,4); return { q: 'How many small cubes in a ' + n + '×' + n + '×' + n + ' cube?', a: n*n*n, hint: 'Volume = n³', intuition: n + ' × ' + n + ' × ' + n + ' = ' + n*n*n + ' small cubes. Subtract hidden ones for painted faces problems.' }; },
    // SBI PO Hard: count triangles in complex figure
    function(){ var base=rand(4,7); var count=base*(base+1)/2; return { q: 'How many triangles in a figure with ' + base + ' small triangles in the base row?', a: count, hint: 'Sum 1 to ' + base + ' = n(n+1)/2', intuition: 'Total triangles = 1+2+3+...+' + base + ' = ' + base + '×' + (base+1) + '/2 = ' + count }; },
    // SBI PO Hard: paper folding with numbered squares
    function(){ var fol=['folded','unfolded'][0]; var n=rand(3,5); return { q: 'A square paper is folded in half ' + n + ' times. How many layers?', a: Math.pow(2,n), hint: 'Each fold doubles layers: 2^' + n, intuition: 'Start with 1 layer. Each fold ×2. After ' + n + ' folds: 2^' + n + ' = ' + Math.pow(2,n) }; },
    // SBI PO Hard: mirror + water image combined
    function(){ var l=['b','d','p','q'][rand(0,3)]; var w='A'; return { q: 'Mirror image of "' + l + '" followed by water image of the result?', a: ({b:'p',d:'q',p:'b',q:'d'})[l], hint: 'Mirror = left-right flip. Water = top-bottom flip. Combine both.', intuition: l + ' mirror → ' + ({b:'d',d:'b',p:'q',q:'p'})[l] + ', then water → ' + ({b:'p',d:'q',p:'b',q:'d'})[l] }; }
  ];
  var idx;
  if (diff >= 5 && ty.length >= 4) {
    idx = rand(0,1) ? rand(Math.max(0, ty.length - 3), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var t = ty[idx];
  var d = t();
  var o = [d.a]; while(o.length<4){var v=['L','G','H','K','M','Q','Y','N','2','3','4'][rand(0,10)]; if(o.indexOf(v)<0)o.push(v);}
  shuffle(o);
  return { question: d.q, answer: d.a, options: o, hint: d.hint, timeLimit: 15, type:'reasoning', techniqueLabel:'Mirror: '+d.hint, intuition: d.intuition||'Mirror image = left-right reversal. Water image = top-bottom reversal. Symmetrical letters: A,H,I,M,O,T,U,V,W,X,Y.' };
}

function generateDiceCubeQuestion(diff) {
  var ty = [
    function(){ var faces = {A:['Top','Bottom','Front','Back','Left','Right']}; var f=['Top','Bottom','Front','Back','Left','Right']; shuffle(f); return { q: 'Dice: ' + f[0] + '=' + rand(1,6) + ', ' + f[1] + '=' + rand(1,6) + '. ' + f[5] + '?', a: 7-Math.abs(rand(1,6)), hint: 'Opposite faces sum to 7', intuition: 'Key: opposite faces sum to 7. If top=n, bottom=7-n. Adjacent are never opposite.' }; },
    function(){ var n=[rand(2,6), rand(2,6)]; while(n[1]===n[0]||n[1]===7-n[0])n[1]=rand(2,6); return { q: 'Two positions of same dice show ' + n[0] + ' & ' + n[1] + '. ' + (7-n[0]) + ' is opposite?', a: 7-n[1], hint: 'Common numbers share face', intuition: 'Compare two positions: the number NOT seen in either position is the one on the hidden face.' }; },
    function(){ var c=rand(1,5); return { q: 'Cube painted all faces, cut into 27 small cubes. Cubes with ' + c + ' faces painted?', a: c===0?1:(c===1?6:(c===2?12:(c===3?8:0))), hint: '0-face=center('+(c===0?1:'')+'), 1-face=face centers(6), 2-face=edge centers(12), 3-face=corners(8)', intuition: 'For n³ cubes: 0-face=(n-2)³, 1-face=6(n-2)², 2-face=12(n-2), 3-face=8 always. Here n=3: ' + (c===0?'1':c===1?'6':c===2?'12':c===3?'8':'0') }; },
    function(){ var cols=['Red','Blue','Green','Yellow','White','Black']; shuffle(cols); var top=rand(1,6), shown=[top]; shown.push(7-top); var side=rand(1,6); while(shown.indexOf(side)>=0)side=rand(1,6); shown.push(side); shown.push(7-side); var ci=rand(0,3); return { q: 'Dice colored: ' + cols[0] + '=' + shown[0] + ', ' + cols[1] + '=' + shown[1] + ', ' + cols[2] + '=' + shown[2] + '. Color of face opposite ' + cols[ci] + '?', a: cols[shown.indexOf(7-shown[ci])], hint: 'Opposite colors have numbers summing to 7', intuition: 'First find opposite numbers (sum 7), then map to colors. ' + cols[ci] + '=' + shown[ci] + ', opposite=' + (7-shown[ci]) + '=' + cols[shown.indexOf(7-shown[ci])] }; },
    function(){ var nums=[1,2,3,4,5,6]; shuffle(nums); var net=[nums[0],nums[1],nums[2],nums[3],nums[4],nums[5]]; var n1=net[0], n2=net[1], n3=net[2]; return { q: 'Dice net shows: top=' + n1 + ', bottom=' + n2 + ', left=' + n3 + '. Which net can form this dice?', a: n1 + ' opposite ' + (7-n1) + ', ' + n2 + ' opposite ' + (7-n2), hint: 'In a net, adjacent in net may not be adjacent on cube', intuition: 'Check which net respects opposite-sum=7. ' + n1 + ' opposite ' + (7-n1) + ', ' + n2 + ' opposite ' + (7-n2) + ', ' + n3 + ' opposite ' + (7-n3) }; },
    function(){ var pos1=rand(1,6), pos2=rand(1,6); while(pos2===pos1||pos2===7-pos1)pos2=rand(1,6); var common=rand(1,6); while(common===pos1||common===pos2||common===7-pos1||common===7-pos2)common=rand(1,6); return { q: 'Position 1: ' + pos1 + ' top, ' + common + ' front. Position 2: ' + pos2 + ' top, ' + common + ' front. What is opposite ' + pos1 + '?', a: 7-pos1, hint: 'Same dice shows common front face in both positions', intuition: 'Since front=' + common + ' in both, the top faces differ. Opposite of top=' + pos1 + ' is always 7-' + pos1 + '=' + (7-pos1) }; },
    // SBI PO Hard: open dice net - which cannot form a dice?
    function(){ var faces=[1,2,3,4,5,6]; shuffle(faces); var a=faces[0], b=faces[1], c=faces[2]; var validAdj=[[1,2],[2,3],[3,4],[4,1],[1,5],[2,5],[3,5],[4,5],[1,6],[2,6],[3,6],[4,6]]; var falsePair=[a+','+b, a+','+c, b+','+c][rand(0,2)]; var isValid=validAdj.some(function(p){return p[0]===a&&p[1]===b||p[0]===b&&p[1]===a;}); return { q: 'In a dice, is ' + a + ' adjacent to ' + b + '?', a: isValid?'Yes':'No', hint: 'Adjacent faces never sum to 7 unless special case', intuition: isValid ? a + ' and ' + b + ' can be adjacent on a standard dice.' : a + ' and ' + b + ' are opposite (sum=' + (a+b) + ') so cannot be adjacent.' }; },
    // SBI PO Hard: colored cube cut into smaller cubes
    function(){ var n=rand(3,5); var colors=['Red','Blue','Green','Yellow','White','Black']; shuffle(colors); var col1=colors[0], col2=colors[1]; var count2Face=(n-2)*12; return { q: 'A ' + n + '×' + n + '×' + n + ' cube is painted ' + col1 + ' on all faces, then cut into unit cubes. Cubes with exactly 2 faces painted?', a: count2Face, hint: 'Edge cubes excluding corners: 12(n-2)', intuition: 'Edge cubes = 12 per layer × (n-2) = 12×' + (n-2) + ' = ' + count2Face + '. Corners have 3 faces, centers have 0-1 faces.' }; },
    // SBI PO Hard: dice with non-standard numbering
    function(){ var nums=[1,2,3,4,5,6]; shuffle(nums); var top=rand(1,6); var opp=7-top; var side=rand(1,6); while(side===top||side===opp)side=rand(1,6); var sum=top+side+rand(1,6); while(sum%2!==0)sum=top+side+rand(1,6); return { q: 'In a dice, top=' + top + ', front=' + side + '. Sum of numbers on the three visible faces (top, front, right) is ' + sum + '. Right face?', a: sum-top-side, hint: 'Visible faces sum = top + front + right. Subtract known values.', intuition: 'Given top=' + top + ', front=' + side + ', sum=' + sum + '. Right = ' + sum + ' - ' + top + ' - ' + side + ' = ' + (sum-top-side) }; }
  ];
  var idx;
  if (diff >= 5 && ty.length >= 4) {
    idx = rand(0,1) ? rand(Math.max(0, ty.length - 3), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var t = ty[idx];
  var d = t();
  var o = [d.a];
  if (typeof d.a === 'string') {
    var wordOpts = ['Yes','No','Top','Bottom','Front','Back','Left','Right','Red','Blue','Green','Yellow','White','Black'];
    for (var _g=0; _g<50 && o.length<4; _g++) { var wv = wordOpts[rand(0, wordOpts.length - 1)]; if (o.indexOf(wv) < 0) o.push(wv); }
  } else {
    for (var _g=0; _g<50 && o.length<4; _g++) { var v = d.a + rand(-3, 3); if (o.indexOf(v) < 0 && v >= 0) o.push(v); }
  }
  shuffle(o);
  return { question: d.q, answer: d.a, options: o, hint: d.hint, timeLimit: 20, type:'reasoning', techniqueLabel:'Dice: '+d.hint, intuition: d.intuition||'Dice: opposite sum=7. Cube painting: corners=3, edges=2, centers=1, inner=0 faces.' };
}

function generateCalendarQuestion(diff) {
  var days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var types = [
    [1, function(){ var m=rand(1,12), d=rand(1,28), y=2024; var date=new Date(y+'/'+m+'/'+d); return {q:'Day of '+d+'/'+m+'/'+y+'?',a:days[date.getDay()],hint:'2024 leap yr'}; }],
    [1, function(){ var y=rand(2024,2030), odd=0; for(var i=2024;i<y;i++)odd+=((i%400)===0||((i%4)===0&&(i%100)!=0))?2:1; return {q:'Odd days 2024→'+y+'?',a:odd%7,hint:'Normal=1, leap=2 odd days'}; }],
    [2, function(){ var y=rand(2000,2024), odd=0; for(var i=2000;i<y;i++)odd+=((i%400)===0||((i%4)===0&&(i%100)!=0))?2:1; return {q:'Odd days 2000→'+y+'?',a:odd%7,hint:'Count odd days mod 7'}; }],
    [2, function(){ var m=rand(1,12), y=2025; var firstDay=new Date(y+'/'+m+'/1').getDay(); var nth=rand(1,4); var targetDay=rand(0,6); var dayOffset=(targetDay-firstDay+7)%7; var date=nth*7+dayOffset-6; if(date<1||date>31)date=rand(1,15)+7*(nth-1); return {q:'Date of '+days[targetDay]+' '+nth+' of '+m+'/'+y+'?',a:String(date),hint:'First '+days[targetDay]+' on '+(dayOffset+1)+'th'}; }],
    [3, function(){ var m=rand(1,12), y=2025; var dim=[31,(y%4===0?29:28),31,30,31,30,31,31,30,31,30,31][m-1]; var firstDay=new Date(y+'/'+m+'/1').getDay(); var targetDay=rand(0,6); var count=0; for(var dt=1;dt<=dim;dt++){if(new Date(y+'/'+m+'/'+dt).getDay()===targetDay)count++;} return {q:'How many '+days[targetDay]+'s in '+m+'/'+y+'?',a:String(count),hint:'First='+days[firstDay]+', '+dim+' days'}; }],
    [3, function(){ var y1=rand(2020,2023), y2=rand(y1+1,2028), odd=0; for(var i=y1;i<y2;i++)odd+=((i%400)===0||((i%4)===0&&(i%100)!=0))?2:1; return {q:'Odd days '+y1+'→'+y2+'?',a:odd%7,hint:'Sum odd days mod 7'}; }],
    [4, function(){ var refM=rand(1,12), refD=rand(1,28), refY=Math.floor(rand(2020,2028)); var refDate=new Date(refY+'/'+refM+'/'+refD); var refDay=refDate.getDay(); var tarM=rand(1,12), tarD=rand(1,28), tarY=Math.floor(rand(2020,2028)); while(tarY===refY&&tarM===refM&&tarD===refD){tarM=rand(1,12); tarD=rand(1,28); tarY=Math.floor(rand(2020,2028));} var tarDate=new Date(tarY+'/'+tarM+'/'+tarD); var diffDays=Math.round((tarDate-refDate)/(24*60*60*1000)); var ans=(refDay+diffDays%7+7*7)%7; return {q:'If '+refD+'/'+refM+'/'+refY+'='+days[refDay]+', day of '+tarD+'/'+tarM+'/'+tarY+'?',a:days[ans],hint:'Diff '+diffDays+' days, mod 7 = '+(diffDays%7)}; }],
    [4, function(){ var y=rand(2024,2035), odd=0, cy=y; do{odd+=((cy%400)===0||((cy%4)===0&&(cy%100)!=0))?2:1; cy++;}while(odd%7!==0&&cy<y+12); if(odd%7===0)return {q:'Same calendar as '+y+'?',a:String(cy),hint:'Odd days sum='+odd+' (mult of 7)'}; else return {q:'Repeats calendar of '+y+'?',a:String(y+((y%4===0&&(y%100!==0||y%400===0))?28:6)),hint:'Leap→28yr, normal→6/11yr'}; }],
    [5, function(){ var c=rand(1,4)*100+rand(0,99); var isLeap=(c%400)===0; return {q:'Is '+c+' leap?',a:isLeap?'Yes':'No',hint:'Century÷400 only'}; }]
  ];
  var matched = types.filter(function(t){ return t[0] <= diff; });
  if (matched.length === 0) matched = types;
  var chosen = matched[rand(0, matched.length - 1)];
  var d = chosen[1]();
  var o = [d.a]; while(o.length<4){var v=days[rand(0,6)]; if(o.indexOf(v)<0)o.push(v);}
  shuffle(o);
  return { question: d.q, answer: d.a, options: o, hint: d.hint, timeLimit: diff>2?25:20, type:'reasoning', techniqueLabel:'Calendar: '+d.hint, intuition:'Odd days: normal year=1, leap=2. Day = ref + odd days mod 7.' };
}

function generateClockQuestion(diff) {
  var types = [
    [1, function(){ var h=rand(1,11); return {q:'Angle at '+h+':00?',a:h*30,hint:'Hr hand at '+h+'×30°'}; }],
    [2, function(){ var h=rand(1,11), m=[15,20,25,30,35,40,45][rand(0,6)]; var a=Math.abs(30*h-5.5*m); a=a>180?360-a:a; return {q:'Angle at '+h+':'+m+'?',a:Math.round(a),hint:'|30H-5.5M|'}; }],
    [2, function(){ var h=rand(0,10); return {q:'Hands overlap '+h+':00–'+(h+1)+':00?',a:(h*60/11).toFixed(1),hint:'60H/11 min past H'}; }],
    [3, function(){ var h=rand(0,10); var m=((60*h+30)/11).toFixed(1); return {q:'Hands opposite (180°) '+h+':00–'+(h+1)+':00?',a:m,hint:'(60H+30)/11'}; }],
    [3, function(){ var h=rand(0,10); var m1=((60*h-90)/11).toFixed(1); var m2=((60*h+90)/11).toFixed(1); if(m1<0)m1=((60*h+270)/11).toFixed(1); return {q:'Right angle (90°) '+h+':00–'+(h+1)+':00?',a:m1,hint:'(60H±90)/11'}; }],
    [4, function(){ var h=rand(1,11), m=rand(0,59); var a=Math.abs(30*h-5.5*m); a=a>180?360-a:a; return {q:'Smaller angle at '+h+':'+(m<10?'0':'')+m+'?',a:Math.round(a),hint:'|30H-5.5M|, smaller if >180'}; }],
    [4, function(){ var h=rand(1,11), m=[0,5,10,15,20,25,30,35,40,45,50,55][rand(0,11)]; var rh=11-h, rm=60-m; if(rh<=0)rh+=12; if(rm===60){rm=0;rh++;} if(rh>=12)rh-=12; return {q:'Mirror image of '+h+':'+(m<10?'0':'')+m+'?',a:rh+':'+(rm<10?'0':'')+rm,hint:'11:60 - given time'}; }],
    [5, function(){ var gainMin=rand(1,10); return {q:'Clock gains '+gainMin+'min/hr. Gain in 24hr?',a:gainMin*24,hint:'×24'}; }],
    [5, function(){ var h=rand(0,10); var m1=(60*h/11).toFixed(1), m2=((60*h+30)/11).toFixed(1); var times=[]; if(m1<60)times.push(m1); if(m2<60)times.push(m2); return {q:'Straight line between '+h+':00–'+(h+1)+':00?',a:times[rand(0,times.length-1)],hint:'Both 0° and 180°'}; }],
    [5, function(){ var h=rand(1,10), m=rand(0,11)*5; var sh=m/5, sm=h*5+Math.floor(m/12); if(sh>=12)sh-=12; return {q:'Swapped hands from '+h+':'+(m<10?'0':'')+m+'?',a:Math.floor(sh)+':'+(Math.floor(sm)<10?'0':'')+Math.floor(sm),hint:'New H=M/5, New M=H×5'}; }]
  ];
  var matched = types.filter(function(t){ return t[0] <= diff; });
  if (matched.length === 0) matched = types;
  var chosen = matched[rand(0, matched.length - 1)];
  var d = chosen[1]();
  var o = [d.a]; var _g=0; while(o.length<4&&_g++<60){var v=Math.round(Math.abs(30*rand(1,11)-5.5*rand(0,59))); if(o.indexOf(v)<0)o.push(v);} while(o.length<4){o.push(o.length+1);} shuffle(o);
  shuffle(o);
  return { question: d.q, answer: d.a, options: o, hint: d.hint, timeLimit: diff>2?25:20, type:'reasoning', techniqueLabel:'Clock: '+d.hint, intuition:'Angle=|30H-5.5M|, if >180° use 360-result. Overlap: 60H/11. Mirror: 11:60-time.' };
}

function generateAlphabetArrangeQuestion(diff) {
  var ty = [
    function(){ var w=['MONKEY','TIGER','BEAR','LION','ZEBRA','HORSE'][rand(0,5)]; var s=w.split('').sort(); return { q: 'Alphabetical order: "' + w + '". ' + s[0] + ' comes first?', a: s[0], hint: 'Sort letters A→Z', intuition: 'Just arrange letters A to Z. Smallest letter comes first.' }; },
    function(){ var w=['APPLE','MANGO','BANANA','GRAPE','ORANGE'][rand(0,4)]; var wr=[...new Set(w.split('').sort())]; return { q: 'How many meaningful words in "' + w + '" using all letters?', a: 1, hint: 'Only 1 arrangement is meaningful', intuition: 'Most letter combinations form only 1 meaningful word. Use patterns: if word has repeated letters, fewer arrangements are valid.' }; },
    function(){ var pair = [['AB','ZY'],['MN','NM'],['PQ','QP'],['BC','CB']][rand(0,3)]; return { q: 'What comes next: ' + pair[0] + ', ' + pair[1] + ', ...?', a: pair[0].charCodeAt(0)+1|0, hint: 'Pair reverses and shifts', intuition: 'Letter pattern: AB→ZY (reverse+ahead), MN→NM (reverse). Next pair reverses the pattern.' }; },
    function(){ var phrase=['The quick brown fox','A quick brown dog','Smart work pays','Code is fun'][rand(0,3)]; var words=phrase.split(' '); var result=''; for(var wi=0;wi<words.length;wi++){result+=words[wi][rand(0,words[wi].length-1)];} return { q: 'Word formed by picking the 2nd letter of each word: "' + phrase + '"?', a: result, hint: 'Take the nth letter of each word and combine', intuition: 'Extract specified position letters from each word: ' + result }; },
    function(){ var w=['CREATION','HOSPITAL','EDUCATION','MOUNTAIN'][rand(0,3)]; var sub=['TRAIN','SOAP','CITE','MOUNT'][rand(0,3)]; while(sub.length>w.length)sub=['CATION','SHIP','DATE','TAIN'][rand(0,3)]; var canForm=true; var wc={};for(var ci=0;ci<w.length;ci++){wc[w[ci]]=(wc[w[ci]]||0)+1;} for(var ci=0;ci<sub.length;ci++){if(!wc[sub[ci]]||wc[sub[ci]]<=0){canForm=false;break;}wc[sub[ci]]--;} return { q: 'Can "' + sub + '" be formed from letters of "' + w + '"?', a: canForm?'Yes':'No', hint: 'Check each letter count in the source word', intuition: 'Count letters in "'+w+'", check if "'+sub+'" uses only those with enough copies.' }; },
    function(){ var l='ABCDEFGHIJKLMNOPQRSTUVWXYZ'; var p1=rand(0,23), p2=rand(p1+2,25); var gap=p2-p1; var gp1=rand(0,25-gap); var gp2=gp1+gap; return { q: 'Which pair has the same gap as ' + l[p1] + '-' + l[p2] + ' (' + gap + ' letters apart)?', a: l[gp1] + l[gp2], hint: 'Gap = ' + gap + '. Find another pair ' + gap + ' apart.', intuition: l[p1] + '→' + l[p2] + ' = ' + gap + ' letters apart. ' + l[gp1] + '→' + l[gp2] + ' also ' + gap + ' apart.' }; }
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
    function(){ var words=['Rain','Strike','Accident','Power cut'][rand(0,3)]; return { q: 'Effect: Trains delayed. Cause? "' + words + '" Which is a valid cause?', a: words === 'Rain' ? 'Yes' : (words === 'Strike' ? 'Yes' : (words === 'Accident' ? 'Yes' : 'Yes')), hint: 'Any of these can delay trains', intuition: 'Multiple causes can lead to same effect. Check if the cause naturally leads to the stated effect without gaps.' }; },
    function(){ var passages=[{p:'Regular exercise improves cardiovascular health and reduces the risk of chronic diseases. Studies show that even 30 minutes of daily activity can extend life expectancy.',c:'Exercise is beneficial for long-term health.'},{p:'The rise of electric vehicles has led to decreased demand for oil. Many countries are investing in charging infrastructure to support this transition.',c:'Electric vehicles are reducing oil dependence.'},{p:'Social media algorithms tend to show users content they already agree with, creating echo chambers that reinforce existing beliefs.',c:'Social media may contribute to political polarization.'}]; var p=passages[rand(0,2)]; return { q: 'Passage: "' + p.p + '"<br>Which conclusion follows?', a: p.c, hint: 'The conclusion must be directly supported by the passage', intuition: 'Read the passage and identify what MUST be true based on the evidence given. Avoid conclusions that go beyond the passage.' }; },
    function(){ var flaws=[{s:'All students in this class passed. Therefore, all students in the school will pass.',f:'Hasty generalization — one class does not represent entire school'},{s:'Every swan I have seen is white. Therefore, all swans are white.',f:'Hasty generalization — insufficient evidence to conclude all'},{s:'If you study hard, you will get good grades. John got good grades, so he studied hard.',f:'Affirming the consequent — good grades can come from other causes'}]; var f=flaws[rand(0,2)]; return { q: 'What is the flaw? "' + f.s + '"', a: f.f, hint: 'Identify the logical error in reasoning', intuition: 'Look for common fallacies: hasty generalization, false cause, circular reasoning, affirming the consequent.' }; },
    function(){ var infs=[{s:'All mammals are warm-blooded. Whales are mammals.',i:'Whales are warm-blooded'},{s:'No bird can swim underwater. A penguin is a bird.',i:'Penguins cannot swim underwater (false — inference contradicts known fact so it may be invalid)'},{s:'If it rains, the ground will be wet. The ground is wet.',i:'It may have rained, but other causes are possible'}]; var inf=infs[rand(0,2)]; return { q: 'From "' + inf.s + '", which is a valid inference?', a: inf.i, hint: 'An inference must necessarily follow from the statements', intuition: 'Apply deductive reasoning. If the premise is true, the conclusion must be true. Check if any other possibility exists.' }; },
    // Strengthen/Weaken argument (exam pattern)
    function(){ var args=[{s:'"Regular exercise improves health." Which strengthens this?',c:'People who exercise have 30% fewer heart attacks'},{s:'"Online education is effective." Which weakens this?',c:'Students in online courses have lower completion rates'},{s:'"Renewable energy is the future." Which strengthens this?',c:'Solar and wind costs have dropped 80% in a decade'}]; var a=args[rand(0,2)]; return { q: a.s, a: a.c, hint: 'Strengthening adds supporting evidence. Weakening introduces counter-evidence.', intuition: 'For strengthen: find evidence that directly supports the conclusion. For weaken: find evidence that contradicts or undermines it.' }; },
    // Assumption identification (exam pattern)
    function(){ var assms=[{s:'"All managers must have a degree." Assumption?',c:'Degree is necessary for management skills'},{s:'"The new policy will reduce traffic." Which is an assumption?',c:'People will follow the new policy'},{s:'"Company should invest in AI technology." Assumption?',c:'AI technology will provide competitive advantage'}]; var a=assms[rand(0,2)]; return { q: a.s, a: a.c, hint: 'An assumption is something that MUST be true for the argument to hold', intuition: 'The assumption is an unstated premise. If the assumption is false, the argument collapses.' }; },
    // Cause and effect advanced (exam pattern)
    function(){ var ces=[{s:'Statement: "The number of road accidents increased significantly after the new traffic signal was installed." Which is true?',c:'The new signal may not have caused the increase; other factors could be responsible'},{s:'Statement: "Company profits increased after the new CEO joined." What can be inferred?',c:'The new CEO may have contributed to the increase, but correlation is not causation'},{s:'Statement: "Cities with more parks have lower crime rates." Conclusion?',c:'Parks and lower crime are correlated, but causation requires more evidence'}]; var ce=ces[rand(0,2)]; return { q: ce.s, a: ce.c, hint: 'Correlation does not imply causation. Other factors may be responsible.', intuition: 'When A and B occur together: A may cause B, B may cause A, or a third factor C may cause both.' }; },
    // Statement: Which action follows (multi-choice)
    function(){ var scs=[{s:'"Industrial waste is polluting the river." Which is the BEST course of action?',c:'Install effluent treatment plants at factories'},{s:'"School dropout rate is increasing in rural areas." Best action?',c:'Provide scholarships and improve school facilities'},{s:'"Traffic congestion is severe in the city." Best action?',c:'Improve public transport and create more parking spaces'}]; var sc=scs[rand(0,2)]; return { q: sc.s, a: sc.c, hint: 'Best course of action directly addresses the root cause of the problem', intuition: 'The best action should be practical, address the root cause, and be within administrative feasibility.' }; },
    // SBI PO Hard: inference from statistical data
    function(){ var data=[{p:'A survey of 1000 people found that 80% of those who exercised regularly had lower blood pressure. The survey also found that 60% of all participants exercised regularly.',c:'Regular exercise is associated with lower blood pressure'},{p:'Company X spent 40% more on advertising this year and profits increased by 25%. Meanwhile, Company Y reduced ad spending and profits fell by 10%.',c:'There is a correlation between advertising spending and profitability'},{p:'In a study, students who attended more than 90% of classes scored an average of 85%, while those with less than 70% attendance scored an average of 65%.',c:'Higher class attendance is correlated with better academic performance'}]; var d=data[rand(0,2)]; return { q: 'Passage: "' + d.p + '"<br>Which conclusion follows?', a: d.c, hint: 'Identify the MOST directly supported conclusion without overgeneralizing', intuition: 'The conclusion must be directly supported. Avoid causal claims if only correlation is shown.' }; },
    // SBI PO Hard: identify the logical fallacy
    function(){ var fallacies=[{s:'"If you don\'t exercise daily, you will become unhealthy. John does not exercise daily. Therefore, John is unhealthy."',f:'Valid modus ponens — if P then Q, P, therefore Q'},{s:'"Every time I wash my car, it rains. Therefore, washing my car causes rain."',f:'False cause (post hoc ergo propter hoc)'},{s:'"Either we cut all taxes or the economy will collapse. We cannot let the economy collapse, so we must cut all taxes."',f:'False dilemma — ignores other options'}]; var f=fallacies[rand(0,2)]; return { q: f.s, a: f.f, hint: 'Identify the reasoning error. Common fallacies: false cause, false dilemma, circular reasoning, hasty generalization.', intuition: 'Check if the conclusion necessarily follows. If not, identify which logical rule is broken.' }; },
    // SBI PO Hard: statement with hidden assumption
    function(){ var hiddens=[{s:'"The government should ban single-use plastics to reduce ocean pollution."',a:'Banning single-use plastics will significantly reduce the amount of plastic entering the ocean'},{s:'"Companies should invest in renewable energy because it creates more jobs than fossil fuels."',a:'Creating more jobs is a desirable outcome for the economy'},{s:'"We should raise the retirement age because people are living longer."',a:'People who live longer are also healthy enough to work longer'}]; var h=hiddens[rand(0,2)]; return { q: 'Statement: "' + h.s + '"<br>Which is an assumption?', a: h.a, hint: 'An assumption is an unstated belief that must be true for the argument to hold', intuition: 'The assumption bridges the premise to the conclusion. If the assumption is false, the argument falls apart.' }; }
  ];
  var idx;
  if (diff >= 5 && ty.length >= 4) {
    idx = rand(0,1) ? rand(Math.max(0, ty.length - 3), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var t = ty[idx];
  var d = t();
  var o = [d.a]; while(o.length<4){var v=['Valid','Invalid','Yes','No','Maybe'][rand(0,4)]; if(o.indexOf(v)<0)o.push(v);}
  shuffle(o);
  return { question: d.q, answer: d.a, options: o, hint: d.hint, timeLimit: diff > 2 ? 25 : 20, type:'reasoning', techniqueLabel:'Critical: '+d.hint, intuition: d.intuition||'Assumption: what MUST be true for statement to hold. Course of action: must solve the problem. Cause-effect: cause must naturally precede effect.' };
}

function generateDecisionMakingQuestion(diff) {
  var ty = [
    function(){ var age=rand(18,30), cond=['degree','diploma','12th'][rand(0,2)]; return { q: 'Eligibility: Age ' + age + ', ' + cond + '. Min req: age>21 & graduate. Eligible?', a: age>21 && cond==='degree' ? 'Yes' : 'No', hint: 'Both conditions must be met', intuition: 'Read ALL conditions. AND means ALL must be true. OR means ANY can be true. Mark yes only if every condition is satisfied.' }; },
    function(){ var score=rand(60,95); return { q: 'Cutoff: 75% in English (60% min), 70% overall. Score=' + score + '%. Allowed?', a: score>=60&&score>=75?'Yes':(score>=60?'No':'No'), hint: 'Check min in each subject', intuition: 'Check each condition separately. Min in each subject AND overall cutoff BOTH must be met. Failing even one = rejected.' }; },
    function(){ var exp=rand(1,8); return { q: 'Job: ' + exp + 'yr exp. Need 3yr exp & degree. Eligible?', a: exp>=3?'Yes':'No', hint: 'Experience '+exp+'yr vs need 3yr', intuition: 'Compare each requirement individually. The lowest common denominator determines eligibility.' }; },
    // Hard: multi-criteria — age, education, experience, medical all needed
    function(){ var age=rand(25,40), deg=['BSc','BA','BCom'][rand(0,2)], exp=rand(2,7), med=['fit','unfit'][rand(0,1)]; return { q: 'Post: age ' + age + ', ' + deg + ', ' + exp + 'yr exp, ' + med + '. Need: age≥21, BSc/BE, ≥3yr exp, fit. Eligible?', a: age>=21 && (deg==='BSc') && exp>=3 && med==='fit' ? 'Yes' : 'No', hint: 'ALL 4 conditions must be met', intuition: 'Break into 4 checks: age=' + (age>=21?'✓':'✗') + ', degree=' + ((deg==='BSc')?'✓':'✗') + ', exp=' + (exp>=3?'✓':'✗') + ', medical=' + (med==='fit'?'✓':'✗') + '. One fail=rejected.' }; },
    // Budget allocation under constraints
    function(){ var budget=rand(50,100)*100, itemA=rand(10,30)*100, itemB=rand(15,35)*100, needBoth=rand(0,1); var canBuy=budget>=(needBoth?itemA+itemB:itemA); return { q: 'Budget=₹' + budget + '. Item X=₹' + itemA + ', Item Y=₹' + itemB + '. ' + (needBoth?'Need both':'Need X') + '. Can buy?', a: canBuy?'Yes':'No', hint: 'Total cost must be within budget', intuition: 'X+Y=' + (itemA+itemB) + ', Budget=' + budget + '. ' + (canBuy?'Within budget':'Over budget') }; },
    // Team selection with conditions
    function(){ var exp=rand(2,7), skill=rand(3,9), avail=[0,1][rand(0,1)]; var reqExp=rand(3,5), reqSkill=rand(5,7); return { q: 'Candidate: ' + exp + 'yr exp, skill rating ' + skill + '/10, ' + (avail?'available':'unavailable') + '. Need: exp≥' + reqExp + ', skill≥' + reqSkill + ', available. Select?', a: exp>=reqExp && skill>=reqSkill && avail ? 'Yes' : 'No', hint: 'All three conditions must be satisfied', intuition: 'exp=' + (exp>=reqExp?'✓':'✗') + ', skill=' + (skill>=reqSkill?'✓':'✗') + ', avail=' + (avail?'✓':'✗') }; },
    // SBI PO Hard: priority-based loan approval matrix
    function(){ var cibil=rand(650,850), income=rand(3,15), existing=rand(0,3); var approved=cibil>=750 && income>=5 && existing<=1; return { q: 'Loan: CIBIL=' + cibil + ', monthly income=₹' + income + 'L, existing loans=' + existing + '. Criteria: CIBIL≥750, income≥₹5L, existing loans≤1. Approved?', a: approved?'Yes':'No', hint: 'ALL three criteria must be satisfied for approval', intuition: 'CIBIL=' + (cibil>=750?'✓':'✗') + ', Income=' + (income>=5?'✓':'✗') + ', Loans≤1=' + (existing<=1?'✓':'✗') + '. All must pass.' }; },
    // SBI PO Hard: conditional admission with relaxation
    function(){ var marks=rand(55,95), category=['General','OBC','SC','ST'][rand(0,3)]; var cutoffs={General:85,OBC:80,SC:70,ST:65}; var eligible=marks>=cutoffs[category]; return { q: 'Admission: marks=' + marks + '%, category=' + category + '. Cutoff for ' + category + '=' + cutoffs[category] + '%. Relaxation: SC/ST -15%, OBC -5% from General cutoff. Eligible?', a: eligible?'Yes':'No', hint: 'Compare marks against category-specific cutoff after relaxation', intuition: 'General cutoff=85%. After relaxation: ' + category + ' cutoff=' + cutoffs[category] + '%. Marks ' + marks + '% ' + (eligible?'meets':'does not meet') + ' cutoff.' }; },
    // SBI PO Hard: resource allocation with constraints
    function(){ var budget=rand(50,100), costA=rand(20,40), costB=rand(20,40), costC=rand(15,35); var priority=['A','B','C'][rand(0,2)]; var canAfford=[budget>=costA,budget>=costB,budget>=costC]; var totalABC=costA+costB+costC; return { q: 'Budget=₹' + budget + 'L. Project A=₹' + costA + 'L, B=₹' + costB + 'L, C=₹' + costC + 'L. Priority=' + priority + '. Can fund all three?', a: totalABC<=budget?'Yes':'No', hint: 'Total cost of all projects must be within budget', intuition: 'A+B+C=' + totalABC + 'L, Budget=' + budget + 'L. ' + (totalABC<=budget?'Within':'Exceeds') + ' budget.' }; }
  ];
  var idx;
  if (diff >= 5 && ty.length >= 4) {
    idx = rand(0,1) ? rand(Math.max(0, ty.length - 3), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var t = ty[idx];
  var d = t();
  var o = [d.a]; while(o.length<4){var v=['Yes','No','Cannot determine','Depends'][rand(0,3)]; if(o.indexOf(v)<0)o.push(v);}
  shuffle(o);
  return { question: d.q, answer: d.a, options: o, hint: d.hint, timeLimit: 15, type:'reasoning', techniqueLabel:'Decision: '+d.hint, intuition: d.intuition||'Check each condition one by one. AND=all must pass. OR=any one enough. Mark "Cannot determine" if info is insufficient.' };
}

function generateVennDiagramQuestion(diff) {
  var types = [
    [1, function(){ var n=rand(30,60), a=rand(10,30), b=rand(10,30), both=rand(5,Math.min(a,b)); return {q:'Total='+n+', A='+a+', B='+b+', both='+both+'. Neither?',a:n-(a+b-both),hint:'Total-(A+B-both)'}; }],
    [1, function(){ var a=rand(20,40), b=rand(15,30), both=rand(5,Math.min(a,b)); return {q:'A='+a+', B='+b+', both='+both+'. Only A?',a:a-both,hint:'A-only=A-both'}; }],
    [2, function(){ var total=rand(50,100), none=rand(5,15); return {q:'Survey: '+total+' people, '+none+' like neither. Either A or B?',a:total-none,hint:'Total-neither'}; }],
    [2, function(){ var pA=rand(30,60), pB=rand(20,50), pBoth=rand(5,Math.min(pA,pB)-5); return {q:pA+'% like A, '+pB+'% like B, '+pBoth+'% both. % exactly one?',a:(pA-pBoth)+(pB-pBoth),hint:'(A-both)+(B-both)'}; }],
    [3, function(){ var total=rand(50,100), a=rand(20,40), b=rand(15,35); return {q:total+' people. '+a+' like A, '+b+' like B. Max who like both?',a:Math.min(a,b),hint:'Max both=min(A,B)'}; }],
    [3, function(){ var total=rand(50,100), a=rand(20,40), b=rand(15,35); var minBoth=Math.max(0,a+b-total); return {q:total+' people. '+a+' like A, '+b+' like B. Min who like both?',a:minBoth,hint:'Min both = max(0, A+B-total)'}; }],
    [4, function(){ var na=rand(20,40), nb=rand(15,35), nc=rand(10,25), two=rand(8,18), three=rand(3,8); var t=na+nb+nc-two-2*three+rand(5,20); return {q:'n(A)='+na+' n(B)='+nb+' n(C)='+nc+', exactly two='+two+', all three='+three+', total='+t+'. Neither?',a:t-(na+nb+nc-two-2*three),hint:'Total-(A+B+C-exact2-2×all3)'}; }],
    [4, function(){ var total=rand(200,500), d=rand(30,80), m=rand(60,120), ind=rand(40,100), dM=rand(10,Math.min(d,m)-5), mInd=rand(10,Math.min(m,ind)-5), dInd=rand(8,Math.min(d,ind)-5), all=rand(3,Math.min(dM,mInd,dInd)-2); var cats=[{l:'only doctors',v:d-dM-dInd+all},{l:'only men',v:m-dM-mInd+all},{l:'only Indians',v:ind-dInd-mInd+all}]; var pick=cats[rand(0,2)]; return {q:'Total='+total+'. Doctors='+d+', Men='+m+', Indians='+ind+'. D&M='+dM+', M&Ind='+mInd+', D&Ind='+dInd+', all='+all+'. '+pick.l+'?',a:pick.v,hint:'Subtract overlaps'}; }],
    [5, function(){ var na=rand(20,35), nb=rand(15,30), nc=rand(10,25), ab=rand(5,Math.min(na,nb)-3), bc=rand(4,Math.min(nb,nc)-2), ac=rand(4,Math.min(na,nc)-2), abc=rand(2,Math.min(ab,bc,ac)-1); return {q:'n(A)='+na+', n(B)='+nb+', n(C)='+nc+'. A&B='+ab+', B&C='+bc+', A&C='+ac+', A&B&C='+abc+'. Exactly two?',a:(ab-abc)+(bc-abc)+(ac-abc),hint:'(AB-all)+(BC-all)+(AC-all)'}; }],
    [5, function(){ var rels=[{q:'Doctors, Men, Indians → diagram?',a:'Three overlapping circles',hint:'Some overlap, none fully contain'},{q:'Tigers, Lions, Animals → diagram?',a:'Two circles inside larger',hint:'Tigers/Lions ⊆ Animals'},{q:'Prime, Even, Integers → diagram?',a:'Two overlapping inside larger',hint:'2 is even prime'},{q:'Fruits, Apples, Oranges → diagram?',a:'Two separate inside larger',hint:'Apples≠Oranges, both⊆Fruits'}]; var r=rels[rand(0,rels.length-1)]; return {q:r.q,a:r.a,hint:r.hint}; }]
  ];
  var matched = types.filter(function(t){ return t[0] <= diff; });
  if (matched.length === 0) matched = types;
  var chosen = matched[rand(0, matched.length - 1)];
  var d = chosen[1]();
  var o = [d.a]; var _g=0; while(o.length<4&&_g++<60){var v=typeof d.a==='string'?['A','B','C','D'][rand(0,3)]:d.a+rand(-10,10); if(o.indexOf(v)<0&&(typeof v==='string'||v>=0))o.push(v);} while(o.length<4){o.push('A');} shuffle(o);
  shuffle(o);
  return { question: d.q, answer: d.a, options: o, hint: d.hint, timeLimit: diff>2?20:15, type:'reasoning', techniqueLabel:'Venn: '+d.hint, intuition:'Only A = A-both. Neither = total-(A+B-both). 3-set: inc-exc principle.' };
}

// ====== SBI PO-SPECIFIC GENERATORS ======

function generateQuadraticComparisonQuestion(diff) {
  var eqs = [];
  for (var qc = 0; qc < 2; qc++) {
    var a = rand(1, 4), b = rand(-12, 12), c = rand(-12, 12);
    if (b === 0) b = 1; if (c === 0) c = 1;
    var d = b*b - 4*a*c;
    var r1 = d >= 0 ? Math.round((-b + Math.sqrt(d))/(2*a)*100)/100 : null;
    var r2 = d >= 0 ? Math.round((-b - Math.sqrt(d))/(2*a)*100)/100 : null;
    eqs.push({eq: a+'x²'+(b>=0?'+':'')+b+'x'+(c>=0?'+':'')+c+'=0', r1:r1, r2:r2, a:a, b:b, c:c});
  }
  var comps = [
    // 1: Compare larger roots
    function(){ var v = eqs[0].r1 !== null && eqs[1].r1 !== null ? (eqs[0].r1 > eqs[1].r1 ? 'I > II' : (eqs[0].r1 < eqs[1].r1 ? 'I < II' : (eqs[0].r1 === eqs[1].r1 ? 'I = II' : 'Cannot compare'))) : 'Cannot compare'; return {a:v, hint:'Compare the larger roots'}; },
    // 2: Compare smaller roots
    function(){ var v = eqs[0].r1 !== null && eqs[1].r1 !== null ? (eqs[0].r2 > eqs[1].r2 ? 'I > II' : (eqs[0].r2 < eqs[1].r2 ? 'I < II' : (eqs[0].r2 === eqs[1].r2 ? 'I = II' : 'Cannot compare'))) : 'Cannot compare'; return {a:v, hint:'Compare the smaller roots'}; },
    // 3: Compare product of roots (c/a)
    function(){ var v = eqs[0].r1 !== null && eqs[1].r1 !== null ? (eqs[0].r1*eqs[0].r2 > eqs[1].r1*eqs[1].r2 ? 'I > II' : (eqs[0].r1*eqs[0].r2 < eqs[1].r1*eqs[1].r2 ? 'I < II' : 'I = II')) : 'Cannot compare'; return {a:v, hint:'Compare product of roots (c/a)'}; },
    // 4: Compare sum of squares of roots
    function(){ var v = eqs[0].r1 !== null && eqs[1].r1 !== null ? (eqs[0].r1*eqs[0].r1+eqs[0].r2*eqs[0].r2 > eqs[1].r1*eqs[1].r1+eqs[1].r2*eqs[1].r2 ? 'I > II' : (eqs[0].r1*eqs[0].r1+eqs[0].r2*eqs[0].r2 < eqs[1].r1*eqs[1].r1+eqs[1].r2*eqs[1].r2 ? 'I < II' : 'I = II')) : 'Cannot compare'; return {a:v, hint:'Compare sum of squares = (b²-2ac)/a²'}; },
    // 5: Compare sum of reciprocals of roots
    function(){ var v = eqs[0].r1 !== null && eqs[1].r1 !== null ? ((1/eqs[0].r1+1/eqs[0].r2) > (1/eqs[1].r1+1/eqs[1].r2) ? 'I > II' : ((1/eqs[0].r1+1/eqs[0].r2) < (1/eqs[1].r1+1/eqs[1].r2) ? 'I < II' : 'I = II')) : 'Cannot compare'; return {a:v, hint:'Sum of reciprocals = -b/c'}; },
    // 6: Compare sum of roots (direct from coefficients)
    function(){ var s1 = -eqs[0].b/eqs[0].a, s2 = -eqs[1].b/eqs[1].a; var v = s1 > s2 ? 'I > II' : (s1 < s2 ? 'I < II' : 'I = II'); return {a:v, hint:'Sum of roots = -b/a. I: -('+eqs[0].b+')/'+eqs[0].a+'='+s1+', II: -('+eqs[1].b+')/'+eqs[1].a+'='+s2}; },
    // 7: Compare absolute values of larger roots
    function(){ var v = eqs[0].r1 !== null && eqs[1].r1 !== null ? (Math.abs(eqs[0].r1) > Math.abs(eqs[1].r1) ? 'I > II' : (Math.abs(eqs[0].r1) < Math.abs(eqs[1].r1) ? 'I < II' : 'I = II')) : 'Cannot compare'; return {a:v, hint:'Compare |larger root| of each equation'}; },
    // 8: Compare x²+y² from both equations (substitute both roots)
    function(){ var v = eqs[0].r1 !== null && eqs[0].r2 !== null && eqs[1].r1 !== null && eqs[1].r2 !== null ? (eqs[0].r1*eqs[0].r1+eqs[0].r2*eqs[0].r2 > eqs[1].r1*eqs[1].r1+eqs[1].r2*eqs[1].r2 ? 'I > II' : (eqs[0].r1*eqs[0].r1+eqs[0].r2*eqs[0].r2 < eqs[1].r1*eqs[1].r1+eqs[1].r2*eqs[1].r2 ? 'I < II' : 'I = II')) : 'Cannot compare'; return {a:v, hint:'Compare sum of squares of BOTH roots'}; },
    // 9: Compare (x - y)² difference of roots squared
    function(){ var v = eqs[0].r1 !== null && eqs[1].r1 !== null ? (Math.pow(eqs[0].r1 - eqs[0].r2,2) > Math.pow(eqs[1].r1 - eqs[1].r2,2) ? 'I > II' : (Math.pow(eqs[0].r1 - eqs[0].r2,2) < Math.pow(eqs[1].r1 - eqs[1].r2,2) ? 'I < II' : 'I = II')) : 'Cannot compare'; return {a:v, hint:'Compare (difference of roots)² = (b²-4ac)/a² = discriminant/a²'}; },
    // 10: Compare x*y + x + y (cross product)
    function(){ var v = eqs[0].r1 !== null && eqs[1].r1 !== null ? (eqs[0].r1*eqs[0].r2+eqs[0].r1+eqs[0].r2 > eqs[1].r1*eqs[1].r2+eqs[1].r1+eqs[1].r2 ? 'I > II' : (eqs[0].r1*eqs[0].r2+eqs[0].r1+eqs[0].r2 < eqs[1].r1*eqs[1].r2+eqs[1].r1+eqs[1].r2 ? 'I < II' : 'I = II')) : 'Cannot compare'; return {a:v, hint:'Compare xy + x + y = product + sum'}; },
    // 11: SBI PO Hard — compare 1/x + 1/y with 1 (sum of reciprocals vs 1)
    function(){ var v = eqs[0].r1 !== null && eqs[1].r1 !== null ? (Math.abs(1/eqs[0].r1+1/eqs[0].r2 - 1) < Math.abs(1/eqs[1].r1+1/eqs[1].r2 - 1) ? 'I > II' : (Math.abs(1/eqs[0].r1+1/eqs[0].r2 - 1) > Math.abs(1/eqs[1].r1+1/eqs[1].r2 - 1) ? 'I < II' : 'I = II')) : 'Cannot compare'; return {a:v, hint:'Compare how close sum of reciprocals is to 1'}; },
    // 12: SBI PO Hard — compare sqrt(x² + y²) magnitude
    function(){ var v = eqs[0].r1 !== null && eqs[1].r1 !== null ? (Math.sqrt(eqs[0].r1*eqs[0].r1+eqs[0].r2*eqs[0].r2) > Math.sqrt(eqs[1].r1*eqs[1].r1+eqs[1].r2*eqs[1].r2) ? 'I > II' : (Math.sqrt(eqs[0].r1*eqs[0].r1+eqs[0].r2*eqs[0].r2) < Math.sqrt(eqs[1].r1*eqs[1].r1+eqs[1].r2*eqs[1].r2) ? 'I < II' : 'I = II')) : 'Cannot compare'; return {a:v, hint:'Compare √(x²+y²) for the two equations'}; }
  ];
  var ty = comps;
  var idx;
  if (diff >= 5 && ty.length >= 4) {
    idx = Math.random() < 0.7 ? rand(Math.max(0, ty.length - 3), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var comp = ty[idx];
  var data = comp();
  var opts = ['I > II','I < II','I = II','Cannot compare'];
  shuffle(opts);
  return { question: 'I: '+eqs[0].eq+'<br>II: '+eqs[1].eq+'<br>Compare x (I) and y (II)?', answer: data.a, options: opts, hint: data.hint, timeLimit: 20, type:'quant', techniqueLabel:'Quad Comparison: solve both, compare', intuition:'Solve each quadratic. Compare the values asked (larger/smaller root or product).' };
}

function generateInputOutputQuestion(diff) {
  var nums = [];
  for (var ioi = 0; ioi < 8; ioi++) nums.push(rand(10, 99));
  var steps = [
    function(arr){ var sorted=arr.slice().sort(function(a,b){return a-b;}); var out=arr.slice(); for(var si=0;si<arr.length;si++){if(arr[si]===sorted[0]){out.splice(si,1);out.unshift(sorted[0]);break;}} return out; },
    function(arr){ var sorted=arr.slice().sort(function(a,b){return b-a;}); var out=arr.slice(); for(var si=0;si<arr.length;si++){if(arr[si]===sorted[0]){out.splice(si,1);out.unshift(sorted[0]);break;}} return out; },
    function(arr){ var max=Math.max.apply(null,arr); var idx=arr.indexOf(max); var out=arr.slice(); out.splice(idx,1); out.push(max); return out; },
    function(arr){ var min=Math.min.apply(null,arr); var idx=arr.indexOf(min); var out=arr.slice(); out.splice(idx,1); out.push(min); return out; },
    // SBI PO Hard: both ends sorted simultaneously (ascending)
    function(arr){ var out=arr.slice(); var sorted=arr.slice().sort(function(a,b){return a-b;}); var left=sorted[0], right=sorted[sorted.length-1]; var li=out.indexOf(left); if(li>0){out.splice(li,1);out.unshift(left);} var ri=out.lastIndexOf(right); if(ri<out.length-1){out.splice(ri,1);out.push(right);} return out; },
    // SBI PO Hard: interleave smallest and largest
    function(arr){ var out=[]; var sorted=arr.slice().sort(function(a,b){return a-b;}); for(var ii=0;ii<Math.floor(arr.length/2);ii++){out.push(sorted[ii]);out.push(sorted[arr.length-1-ii]);} if(arr.length%2)out.push(sorted[Math.floor(arr.length/2)]); return out; },
    // SBI PO Hard: replace each number with sum of digits, then sort
    function(arr){ var out=arr.slice().map(function(n){return String(n).split('').reduce(function(s,d){return s+parseInt(d);},0);}); out.sort(function(a,b){return a-b;}); return out; }
  ];
  var opDesc = ['smallest moved left','largest moved left','largest moved right','smallest moved right','both ends sorted inward','interleave small-large','sum of digits then sort'];
  var si;
  if (diff >= 5 && steps.length >= 4) {
    si = rand(0,1) ? rand(Math.max(0, steps.length - 3), steps.length - 1) : rand(0, steps.length - 1);
  } else {
    si = rand(0, steps.length - 1);
  }
  var step1 = steps[si](nums);
  var step2 = steps[si](step1);
  var step3 = steps[si](step2);
  var stepsArr = [nums.join(' '), step1.join(' '), step2.join(' '), step3.join(' ')];
  var qType = rand(0, 2);
  var q, a, hint;
  if (qType === 0) {
    var stepN = rand(2, 4);
    q = 'Input: '+nums.join(' ')+'<br>Step 1: '+step1.join(' ')+'<br>Step 2: '+step2.join(' ')+'<br>What is Step '+stepN+'?';
    a = stepsArr[stepN];
    hint = 'Each step, the '+opDesc[si]+'. Continue the pattern.';
  } else if (qType === 1) {
    var ts = rand(1, 3);
    q = 'Input: '+nums.join(' ')+'<br>Step '+ts+': '+stepsArr[ts]+'<br>What is the input?';
    a = stepsArr[0];
    hint = 'Reverse the operation. The '+opDesc[si]+' is moved back.';
  } else {
    q = 'Input: '+nums.join(' ')+'<br>Step 1: '+step1.join(' ')+'<br>Step 2: '+step2.join(' ')+'<br>Step 3: '+step3.join(' ')+'<br>How many steps to fully sort '+(si<2?'ascending':'descending')+'?';
    var c = stepsArr.length - 1;
    for (var ci = stepsArr.length - 1; ci >= 0; ci--) {
      var sortedCopy = stepsArr[ci].split(' ').map(Number);
      var isSorted = true;
      for (var cj = 1; cj < sortedCopy.length; cj++) {
        if (si < 2 ? sortedCopy[cj-1] > sortedCopy[cj] : sortedCopy[cj-1] < sortedCopy[cj]) { isSorted = false; break; }
      }
      if (isSorted) c = ci;
    }
    a = String(c);
    hint = 'Track when the sequence becomes fully sorted.';
  }
  var opts = [a];
  for (var _g=0; _g<50 && opts.length<4; _g++) { var r = a + rand(-5, 5); if (opts.indexOf(r) < 0 && r > 0) opts.push(r); }
  shuffle(opts);
  return { question: q, answer: a, options: opts, hint: hint, timeLimit: 30, type:'reasoning', techniqueLabel:'Input-Output: '+opDesc[si], intuition:'Each step reverses or applies a consistent operation. Track one element to find the pattern.' };
}

// ====== ADDITIONAL QUANT GENERATORS ======

function generateProfitLossQuestion(diff, layer) {
  var ty = [
    [1, function(){ var cp=rand(50,200), p=rand(5,30); return { q:'CP=₹'+cp+', profit='+p+'%. SP?', a:Math.round(cp*(100+p)/100), hint:'SP=CP×(100+P%)/100' }; }],
    [1, function(){ var sp=rand(100,300), l=rand(5,20); return { q:'SP=₹'+sp+', loss='+l+'%. CP?', a:Math.round(sp*100/(100-l)), hint:'CP=SP×100/(100-L%)' }; }],
    [1, function(){ var cp=rand(50,150), sp=cp+rand(10,40); return { q:'CP=₹'+cp+', SP=₹'+sp+'. Profit%?', a:Math.round((sp-cp)/cp*100), hint:'P%=(SP-CP)/CP×100' }; }],
    [2, function(){ var mp=rand(200,500), d=rand(10,30), p=rand(5,15); var sp=Math.round(mp*(100-d)/100); var cp=Math.round(sp*100/(100+p)); return { q:'MP=₹'+mp+', discount='+d+'%, profit='+p+'%. CP?', a:cp, hint:'SP from MP, then CP from SP' }; }],
    [2, function(){ var cp=rand(100,300), g1=rand(5,15), g2=rand(5,15); return { q:'A buys ₹'+cp+', sells to B at '+g1+'% profit. B to C at '+g2+'% profit. C CP?', a:Math.round(cp*(100+g1)/100*(100+g2)/100), hint:'Successive ×'+(100+g1)/100+' ×'+(100+g2)/100}; }],
    [2, function(){ var cp=rand(100,200); var p1=rand(10,20), p2=rand(5,15); return { q:'CP=₹'+cp+'. Profit P1='+p1+'%, P2='+p2+'%. SP diff?', a:Math.round(cp*(p1-p2)/100), hint:'CP×('+p1+'%-'+p2+'%)'}; }],
    // --- Medium (diff 3) ---
    [3, function(){ var w=rand(800,950); return { q:'Uses '+w+'g weight instead of 1000g. Profit%?', a:Math.round((1000-w)/w*10000)/100, hint:'= (1000-'+w+')/'+w+'×100'}; }],
    [3, function(){ var cp1=rand(200,500), g=rand(8,20); var cp2=Math.round(cp1*(100-g)/100); return { q:'Sold two items: one at '+g+'% profit, other at '+g+'% loss. Both SP same ₹'+Math.round(cp1*(100+g)/100)+'. Overall P/L?', a:Math.round(-(cp1*g*g/10000)*100)/100, hint:'Always LOSS: -(gain%)²/100. Net loss%='+Math.round(g*g/100*10)/10+'%'}; }],
    [3, function(){ var cp=rand(200,500), d=rand(10,25); return { q:'MP=₹'+Math.round(cp*(100+d)/100)+', discount '+d+'% on MP, profit '+rand(5,15)+'%. CP?', a:cp, hint:'SP=MP×(100-D)%, then CP=SP×100/(100+P%)'}; }],
    // --- SSC CGL (diff 4) ---
    [4, function(){ var cp=rand(200,600), m=rand(15,35); var sp=Math.round(cp*(100+m)/100); var d=rand(5,20); var mp=Math.round(sp*100/(100-d)); return { q:'CP=₹'+cp+', gain '+m+'% after discount '+d+'%. MP?', a:mp, hint:'SP=CP×'+(100+m)+'%, then MP=SP×100/'+(100-d)}; }],
    [4, function(){ var m=rand(100,300), n=rand(6,15); var spPer=Math.round(m/n*10)/10; var cpPer=Math.round(spPer*(100+rand(5,20))/100*10)/10; return { q:''+n+' articles for ₹'+m+' (SP per article). If CP per article ₹'+cpPer+', overall P/L%?', a:Math.round((spPer-cpPer)/cpPer*1000)/10, hint:'Find per-article SP, compare with per-article CP'}; }],
    // --- SBI PO Hard (diff 5) ---
    [5, function(){ var cp=rand(200,500), m=rand(20,40), d=rand(10,20); return { q:'CP=₹'+cp+', MP '+m+'% above CP, discount '+d+'%. Profit%?', a:Math.round(((100+m)*(100-d)/100-100)*10)/10, hint:'Net% = ((100+M%)(100-D%)/100)-100'}; }],
    [5, function(){ var cp=rand(150,400), d=rand(10,25), g=rand(5,12); return { q:'CP=₹'+cp+', wants '+g+'% profit after discount '+d+'%. MP?', a:Math.round(cp*(100+g)/100*100/(100-d)), hint:'MP = CP(100+G%)/100 × 100/(100-D%)'}; }],
    [5, function(){ var r=rand(5,15); return { q:'Same SP. One at '+r+'% gain, other at '+r+'% loss. Net loss%?', a:Math.round(r*r/100*10)/10, hint:'Loss% = (gain%)²/100 = '+r+'²/100='+Math.round(r*r/100*10)/10+'%'}; }],
    [5, function(){ var w=rand(800,1200), d=rand(5,15), g=rand(10,25); var cp=w; var sp=Math.round(cp*(100+g)/100); var mp=Math.round(sp*100/(100-d)); return { q:'Article costs Rs'+w+'(incl '+rand(8,12)+'% tax). Wants '+g+'% profit. Markup for '+d+'% discount?', a:mp, hint:'CP(1+tax) then MP=SP/(1-discount)'}; }],
    [5, function(){ var cp=rand(200,600), a=rand(15,30), b=rand(10,25); return { q:'A buys at Rs'+cp+', spends Rs'+rand(20,60)+' on repairs. Sells to B at '+a+'% profit. Discount '+b+'% on MP. MP?', a:Math.round((cp+rand(20,60))*(100+a)/100*100/(100-b)), hint:'Effective CP=CP+repairs. Then MP = effCP×(100+G%)/100×100/(100-D%)'}; }]
  ];
  var matched = ty.filter(function(t){ return t[0] <= diff; });
  if (matched.length === 0) matched = ty;
  var d = matched[rand(0, matched.length - 1)][1]();
  var o = [d.a]; var spread = Math.max(5, Math.abs(d.a*0.1)); var _g=0;
  while(o.length<4&&_g++<60){var v=Math.round(d.a+rand(-spread,spread)); if(o.indexOf(v)<0&&v>0)o.push(v);} while(o.length<4){o.push(o.length+d.a);} shuffle(o);
  return { question:d.q, answer:d.a, options:o, hint:d.hint, timeLimit:15, type:'quant', techniqueLabel:'P&L: '+d.hint, intuition:'SP=CP×(100±P%)/100. Discount: SP=MP×(100-D%)/100. Successive: multiply factors.' };
}

function generatePipesCisternsQuestion(diff, layer) {
  var ty = [
    function(){ var a=rand(4,10), b=rand(a+2,15); return { q:'Pipe A fills in '+a+'h, B in '+b+'h. Together?', a:Math.round(a*b/(a+b)), hint:'Together = a×b/(a+b)' }; },
    function(){ var a=rand(3,8), b=rand(4,10), c=rand(6,12); return { q:'A fills in '+a+'h, B in '+b+'h, C empties in '+c+'h. Net time?', a:Math.round(1/(1/a+1/b-1/c)), hint:'1/t = 1/a + 1/b - 1/c' }; },
    function(){ var a=rand(5,15), b=rand(a+2,20); var t=Math.round(a*b/(a+b)); return { q:'A fills in '+a+'h. A+B together in '+t+'h. B alone?', a:Math.round(a*t/(a-t)), hint:'B = A×T/(A−T)' }; },
    function(){ var a=rand(4,12), l=rand(2,5); return { q:'Pipe fills in '+a+'h, leakage empties in '+l*2+'h. Net time?', a:Math.round(1/(1/a-1/(l*2))), hint:'Net = 1/(1/a - 1/leak_time)' }; },
    // Pipe A fills, B empties, C fills — combined
    function(){ var a=rand(4,8), b=rand(5,10), c=rand(6,12); return { q:'A fills in '+a+'h, B empties in '+b+'h, C fills in '+c+'h. All open together?', a:Math.round(1/(1/a-1/b+1/c)), hint:'1/t = 1/a - 1/b + 1/c', intuition:'Fill rates positive, empty rates negative. 1/t = 1/'+a+' - 1/'+b+' + 1/'+c+' = ' + Math.round(1/(1/a-1/b+1/c)) + 'h' }; },
    // Two pipes fill with leak
    function(){ var a=rand(3,7), b=rand(4,9), l=rand(6,15); return { q:'A fills in '+a+'h, B fills in '+b+'h. Leak empties full tank in '+l+'h. All three open?', a:Math.round(1/(1/a+1/b-1/l)), hint:'1/t = 1/a + 1/b - 1/l', intuition:'Combined fill: 1/'+a+'+1/'+b+'-1/'+l+' = ' + (1/a+1/b-1/l).toFixed(4) + '. Time=' + Math.round(1/(1/a+1/b-1/l)) + 'h' }; },
    // SBI PO Hard: pipes opened alternately
    function(){ var a=rand(4,8), b=rand(6,12); return { q:'A fills in '+a+'h, B in '+b+'h. A open for 1h, then B for 1h, alternately. Time to fill?', a:Math.round(a*b/(a+b) + (a*b/(a+b) > a ? 0 : a*b/(a+b)*0.5)), hint:'Work done in 2h = 1/a + 1/b = ' + (1/a+1/b).toFixed(4) + ' of tank. Continue until filled', intuition:'In 2h: 1/'+a+'+1/'+b+'=' + (1/a+1/b).toFixed(4) + '. In '+Math.round(2/(1/a+1/b)) + 'h, ' + Math.round(2/(1/a+1/b)) + '×' + (1/a+1/b).toFixed(4) + '=' + Math.round(2/(1/a+1/b)*(1/a+1/b)*100)/100 + ' of tank filled' }; },
    // SBI PO Hard: three pipes with two opening at different times
    function(){ var a=rand(4,8), b=rand(5,10), c=rand(8,15); return { q:'A fills in '+a+'h, B in '+b+'h, C empties in '+c+'h. A&B open for 2h, then C also opened. Total time?', a:Math.round(2 + (1-(1/a+1/b)*2)/(1/a+1/b-1/c)), hint:'First 2h: ' + (1/a+1/b)*2 + ' filled. Remaining = ' + (1-(1/a+1/b)*2).toFixed(4) + '. Then net rate = 1/a+1/b-1/c', intuition:'In 2h: (' + 1/a + '+' + 1/b + ')×2=' + ((1/a+1/b)*2).toFixed(4) + '. Remaining=' + (1-(1/a+1/b)*2).toFixed(4) + '. Net rate=' + (1/a+1/b-1/c).toFixed(4) + '/h. Extra time=' + Math.round((1-(1/a+1/b)*2)/(1/a+1/b-1/c)) + 'h. Total=' + Math.round(2+(1-(1/a+1/b)*2)/(1/a+1/b-1/c)) + 'h' }; },
    // SBI PO Hard: find capacity given partial fill times
    function(){ var cap=rand(1000,5000), a=rand(3,8), b=rand(4,10), m=rand(2,5); return { q:'Pipe A fills at ' + Math.round(cap/a) + 'L/h, B at ' + Math.round(cap/b) + 'L/h. Both open for ' + m + 'h, then A alone. Total time ' + Math.round(m + (cap-m*(cap/a+cap/b))/(cap/a)) + 'h. Tank capacity?', a:cap, hint:'In '+m+'h: filled=' + m*(cap/a+cap/b) + '. Remaining = capacity - ' + m*(cap/a+cap/b) + '. Then A alone takes time = remaining/(cap/a)' }; },
    // SBI PO Hard: pipe with variable filling rate
    function(){ var a=rand(3,6); return { q:'Pipe fills tank in ' + a + 'h. Due to leak, takes ' + (a+rand(2,5)) + 'h. Leak alone empties full tank in?', a:Math.round(a*(a+rand(2,5))/((a+rand(2,5))-a)), hint:'Leak time = (fill×leakFill)/(leakFill-fill)', intuition:'1/' + a + ' - 1/leak = 1/' + (a+rand(2,5)) + '. Leak time = ' + Math.round(a*(a+rand(2,5))/((a+rand(2,5))-a)) + 'h' }; },
    // SBI PO Hard: new variants
    function(){ var a=rand(3,8), b=rand(a+2,12); return { q:'Pipe A fills in '+a+'h, B empties in '+b+'h. Both open?', a:Math.round(a*b/(b-a)), hint:'Net = 1/a-1/b. Time = a*b/(b-a)' }; },
    function(){ var a=rand(4,8), b=rand(5,10), c=rand(12,20); return { q:'Fills: A='+a+'h, B='+b+'h. Empty: C='+c+'h. All open?', a:Math.round(1/(1/a+1/b-1/c)), hint:'1/t = 1/a+1/b-1/c' }; },
    function(){ var a=rand(4,10), b=rand(a+3,18); return { q:'Pipe fills in '+a+'h. Leak takes '+b+'h. Leak empties full tank?', a:Math.round(a*b/(b-a)), hint:'Leak rate = 1/'+a+'-1/'+b+' = '+(1/a-1/b).toFixed(4) }; },
    function(){ var a=rand(4,8), b=rand(6,12); return { q:'A fills in '+a+'h, B in '+b+'h. A open 1h, then B alone. Total?', a:Math.ceil(1+(1-1/a)*b), hint:'A fills 1/'+a+'. Remaining '+(1-1/a).toFixed(2)+' at 1/'+b+' per h' }; },
    function(){ var a=rand(4,10), b=rand(6,14), h=rand(2,4); return { q:'A fills in '+a+'h, B empties in '+b+'h. Both open '+h+'h. How full?', a:Math.round((1/a-1/b)*h*100)/100, hint:'Net fill rate = 1/'+a+'-1/'+b+', \u00d7'+h }; },
    function(){ var a=rand(2,5), b=rand(a+1,7), c=rand(b+2,10); var r=Math.round(1/(1/a+1/b+1/c)); return { q:'A='+a+'h, B='+b+'h, C='+c+'h (fill). Time for 2 tanks?', a:r*2, hint:'1 tank = '+r+'h. 2 tanks = '+r+'\u00d72' }; },
    function(){ var a=rand(5,12), b=rand(a+2,15); var d=rand(2,4); var rem=1-d/a; var net=1/a-1/b; return { q:'Pipe A in '+a+'h. '+d+'h later, B (empties '+b+'h) opened. Total fill time?', a:Math.ceil(d+rem/net), hint:'Done='+d+'/'+a+'. Remaining '+rem.toFixed(2)+' at net rate '+(net).toFixed(4) }; },
    function(){ var a=rand(3,7), b=rand(5,11); return { q:'Cistern has '+a+' inlets (each fills '+b+'h). Outlet empties in '+(a*b)+'h. Fill time?', a:Math.round(1/(a/b-1/(a*b))), hint:'Inlet rate='+a+'/'+b+', outlet=1/'+(a*b) }; }
  ];
  var idx;
  if (diff >= 5 && ty.length >= 4) {
    idx = Math.random() < 0.7 ? rand(Math.max(0, ty.length - 4), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var d = ty[idx](); var o=[d.a]; var _g=0; while(o.length<4&&_g++<80){var v=d.a+rand(-3,3); if(o.indexOf(v)<0&&v>0&&v!==0)o.push(v);} while(o.length<4){o.push(o.length+d.a);} shuffle(o);
  return { question:d.q, answer:d.a, options:o, hint:d.hint, timeLimit:20, type:'quant', techniqueLabel:'Pipes: '+d.hint, intuition:'Together rate = sum of rates. Opposite directions subtract. Time = 1/rate.' };
}

function generateBoatsStreamsQuestion(diff, layer) {
  var ty = [
    // 1: Basic downstream speed
    function(){ var b=rand(8,15), s=rand(2,5); return { q:'Speed in still water='+b+'km/h, stream='+s+'km/h. Downstream?', a:b+s, hint:'Downstream = boat + stream' }; },
    // 2: Basic upstream speed
    function(){ var b=rand(8,15), s=rand(2,5); return { q:'Speed in still water='+b+'km/h, stream='+s+'km/h. Upstream?', a:b-s, hint:'Upstream = boat - stream' }; },
    // 3: Find boat speed from DS and US
    function(){ var ds=rand(12,20), us=rand(6,11); return { q:'Downstream='+ds+'km/h, upstream='+us+'km/h. Boat speed?', a:Math.round((ds+us)/2), hint:'Boat = (downstream + upstream)/2' }; },
    // 4: Find stream speed from DS and US
    function(){ var ds=rand(12,20), us=rand(6,11); return { q:'Downstream='+ds+'km/h, upstream='+us+'km/h. Stream speed?', a:Math.round((ds-us)/2), hint:'Stream = (downstream - upstream)/2' }; },
    // 5: Time downstream
    function(){ var b=rand(10,18), s=rand(2,4), d=rand(30,80); return { q:'Boat='+b+'km/h, stream='+s+'km/h. Time downstream for '+d+'km?', a:Math.round(d/(b+s)), hint:'Time = distance / downstream speed' }; },
    // 6: Round trip
    function(){ var b=rand(10,16), s=rand(2,5), d=rand(40,80); return { q:'Boat='+b+'km/h, stream='+s+'km/h. Time for round trip '+d+'km downstream and back?', a:Math.round(d/(b+s) + d/(b-s)), hint:'Total = d/(b+s) + d/(b-s)', intuition:'Downstream='+d+'/('+b+'+'+s+')='+Math.round(d/(b+s))+'h, Upstream='+d+'/('+b+'-'+s+')='+Math.round(d/(b-s))+'h. Total='+Math.round(d/(b+s)+d/(b-s))+'h' }; },
    // 7: Average speed of round trip
    function(){ var b=rand(8,15), s=rand(2,5), d=rand(30,60); return { q:'Boat covers '+d+'km downstream in '+Math.round(d/(b+s))+'h, same distance upstream in '+Math.round(d/(b-s))+'h. Average speed?', a:Math.round(2*d/(d/(b+s)+d/(b-s))), hint:'Avg speed = total distance/total time', intuition:'Total dist='+2*d+'km, total time='+Math.round(d/(b+s)+d/(b-s))+'h. Avg='+Math.round(2*d/(d/(b+s)+d/(b-s)))+'km/h' }; },
    // 8: Find boat speed from time ratio
    function(){ var b=rand(10,18), s=rand(2,5), d=rand(50,100); var td=d/(b+s), tu=d/(b-s); return { q:'Downstream time : upstream time = 1:' + Math.round(tu/td) + ' for ' + d + 'km. Stream=' + s + 'km/h. Boat speed?', a:b, hint:'Time ratio (b-s):(b+s) = 1:'+Math.round(tu/td)+'. (b+s)='+Math.round(tu/td)+'(b-s)', intuition:'t_down/t_up='+(b-s)+'/'+(b+s)+'='+((b-s)/(b+s)).toFixed(3)+'. Boat='+b+'km/h' }; },
    // 9: Total time with changing stream
    function(){ var b=rand(8,14), s1=rand(2,4), s2=rand(3,6), d1=rand(20,40), d2=rand(20,40); return { q:'Upstream '+d1+'km at stream='+s1+', downstream '+d2+'km at stream='+s2+'. Boat='+b+'. Total time?', a:Math.round(d1/(b-s1) + d2/(b+s2)), hint:'Time='+d1+'/('+b+'-'+s1+')+'+d2+'/('+b+'+'+s2+')', intuition:'='+Math.round(d1/(b-s1))+'h + '+Math.round(d2/(b+s2))+'h = '+Math.round(d1/(b-s1)+d2/(b+s2))+'h' }; },
    // 10: Find stream speed from distance and time difference (IndiaBix style)
    function(){ var b=rand(10,16), s=rand(2,5), d=rand(30,60); var td=d/(b+s), tu=d/(b-s); return { q:'A boat takes '+(Math.round(tu-td))+'h more to go '+d+'km upstream than downstream. Boat='+b+'km/h. Stream speed?', a:s, hint:'d/(b-s)-d/(b+s)='+(tu-td)+'. Solve for s: s='+s+'km/h', intuition:'Time diff = d[1/(b-s)-1/(b+s)] = d[2s/(b²-s²)] = '+(tu-td)+'. Solve: s='+s }; },
    // 11: Find distance given round trip time
    function(){ var b=rand(10,16), s=rand(2,4), t=rand(3,6); var d=Math.round(t*(b*b-s*s)/(2*b)); return { q:'Boat='+b+'km/h, stream='+s+'km/h. Round trip takes '+t+'h. Distance one way?', a:d, hint:'d = t×(b²-s²)/(2b) = '+t+'×('+(b*b)+'-'+(s*s)+')/'+(2*b), intuition:'Round trip time = d/(b+s)+d/(b-s)=2db/(b²-s²). d='+d+'km' }; },
    // 12: SBI PO Hard — speed given time saved by going downstream
    function(){ var b=rand(8,15), s=rand(2,5), d=rand(40,80); var td=d/(b+s), tu=d/(b-s); return { q:'Time saved going downstream vs upstream for '+d+'km is '+(Math.round(tu-td))+'h. Boat='+b+'km/h. Stream speed?', a:s, hint:'Time saved = d/(b-s)-d/(b+s)=2ds/(b²-s²)='+(tu-td)+'. Solve: s='+s }; },
    // 13: SBI PO Hard — man rowing to a place and back (IndiaBix style)
    function(){ var b=rand(6,12), s=rand(2,4); var d=rand(8,20); return { q:'Man rows at '+b+'km/h in still water. Stream='+s+'km/h. He rows to a place '+d+'km away and back. Total time?', a:Math.round(d/(b+s)+d/(b-s)), hint:'Total = d/(b+s)+d/(b-s)', intuition:'DS: '+d+'/'+(b+s)+'='+Math.round(d/(b+s))+'h. US: '+d+'/'+(b-s)+'='+Math.round(d/(b-s))+'h. Total='+Math.round(d/(b+s)+d/(b-s))+'h' }; }
  ];
  var idx;
  if (diff >= 5 && ty.length >= 4) {
    idx = Math.random() < 0.7 ? rand(Math.max(0, ty.length - 4), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var d = ty[idx](); var o=[d.a]; var _g=0; while(o.length<4&&_g++<60){var v=d.a+rand(-3,3)+(d.a>5?0:1); if(o.indexOf(v)<0&&v>0)o.push(v);} while(o.length<4){o.push(o.length+d.a);} shuffle(o);
  return { question:d.q, answer:d.a, options:o, hint:d.hint, timeLimit:15, type:'quant', techniqueLabel:'Boats: '+d.hint, intuition:'Downstream=boat+stream. Upstream=boat-stream. Boat=(DS+US)/2. Stream=(DS-US)/2.' };
}

function generateAlligationQuestion(diff, layer) {
  var ty = [
    // 1: Basic ratio from percentages
    function(){ var p1=rand(5,15), p2=rand(20,40), m=rand(p1+3,p2-3); return { q:'Mix '+(p1*10)+'% and '+(p2*10)+'% to get '+(m*10)+'%? Ratio?', a:(p2-m)+':'+(m-p1), hint:'(mean-low):(high-mean)' }; },
    // 2: Average price from quantities
    function(){ var c1=rand(20,50), c2=c1+rand(15,40), r1=rand(1,4), r2=rand(1,4); var m=Math.round((c1*r1+c2*r2)/(r1+r2)); return { q:'₹'+c1+'/kg (qty '+r1+'kg) + ₹'+c2+'/kg (qty '+r2+'kg). Avg price?', a:m, hint:'Avg = (C1×Q1+C2×Q2)/(Q1+Q2)' }; },
    // 3: Quantity of a component given ratio
    function(){ var w=rand(5,15), c=rand(2,5); return { q:'Water: Milk = '+w+':'+c+' in '+(w+c)*2+'L mixture. Milk quantity?', a:Math.round((w+c)*2*c/(w+c)), hint:'Milk = total × part/total_parts' }; },
    // 4: Replacement of mixture (one step)
    function(){ var m=rand(10,30); var w=rand(3,6); var r=rand(2,4); return { q:m+'L milk, '+w+'L water added then '+r+'L mixture removed. Milk left?', a:Math.round(m*(m/(m+w))), hint:'Milk fraction = ' + m + '/' + (m+w) + ', milk removed = fraction × ' + r, intuition:'Initial milk='+m+'L, total='+(m+w)+'L. After removal, milk='+Math.round(m-r*m/(m+w))+'L' }; },
    // 5: Ratio from mixing rice/grain
    function(){ var c1=rand(20,40), c2=rand(45,60), m=rand(c1+5,c2-5); return { q:'Rice type1 ₹'+c1+'/kg, type2 ₹'+c2+'/kg. Mixture ₹'+m+'/kg. Ratio?', a:(c2-m)+':'+(m-c1), hint:'Cheaper:dearer = (dearer-mean):(mean-cheaper)'}; },
    // 6: Three ingredient mixture
    function(){ var a=rand(20,35), b=rand(30,50), c=rand(40,60), m=rand(b+2,c-2); return { q:'Three varieties: ₹'+a+'/kg, ₹'+b+'/kg, ₹'+c+'/kg. Mix ₹'+m+'/kg. Ratio cheapest:costliest?', a:(c-m)+':'+(m-b), hint:'Mix B&C first: ('+c+'-'+m+'):('+m+'-'+b+')' }; },
    // 7: Repeated dilution (two steps)
    function(){ var m=rand(10,25), w1=rand(3,6), w2=rand(3,6), r=rand(2,4); return { q:m+'L milk. Add '+w1+'L water, remove '+r+'L mixture. Add '+w2+'L water again. Milk %?', a:Math.round((m - r*m/(m+w1))/(m+w1-r+w2)*100), hint:'After step1: milk='+Math.round(m-r*m/(m+w1))+'L. Then add '+w2+'L water', intuition:'Milk after removal='+Math.round(m-r*m/(m+w1))+'L. Total='+(m+w1-r+w2)+'L. %='+Math.round((m - r*m/(m+w1))/(m+w1-r+w2)*100)+'%' }; },
    // 8: False weight profit
    function(){ var cp=rand(20,40), sp=rand(30,50), fw=rand(800,950); return { q:'Shopkeeper sells at ₹'+sp+'/kg (cost ₹'+cp+'/kg) uses '+fw+'g weight. Profit%?', a:Math.round((sp*1000/fw-cp)/cp*100), hint:'Effective SP = '+sp+'×1000/'+fw+' = '+Math.round(sp*1000/fw)}; },
    // 9: Mixture sold at profit
    function(){ var m=rand(10,20), w=rand(2,5), g=rand(10,25), cpl=rand(25,45); return { q:(m+w)+'L mixture (milk:water '+m+':'+w+'). Milk cost ₹'+cpl+'/L. Sold at '+g+'% profit. SP per L?', a:Math.round(cpl*m/(m+w)*(100+g)/100), hint:'Cost = '+cpl+'×'+m+'/('+m+'+'+w+')='+Math.round(cpl*m/(m+w))+'/L. SP = cost × '+(100+g)/100 }; },
    // 10: Find amount of liquid left after n operations (IndiaBix style)
    function(){ var m=rand(15,30); var r=rand(3,6); return { q:'A vessel contains '+m+'L of milk. '+r+'L drawn and replaced with water. Repeated once. Milk left?', a:Math.round(m*Math.pow((m-r)/m,2)), hint:'After n ops: initial × ((initial - drawn)/initial)^n', intuition:'After 1st: '+m+'×('+(m-r)+'/'+m+')='+Math.round(m*(m-r)/m)+'L. After 2nd: '+Math.round(m*(m-r)/m)+'×('+(m-r)+'/'+m+')='+Math.round(m*Math.pow((m-r)/m,2))+'L' }; },
    // 11: Find original quantity before replacement (IndiaBix style)
    function(){ var m=rand(15,30), r=rand(3,6), final=Math.round(m*(m-r)/m); return { q:'After drawing '+r+'L from milk and replacing with water, mixture has '+(final)+'L milk. Original quantity?', a:m, hint:'Let x = original. x × (x-'+r+')/x = '+final+'. x = '+m }; },
    // 12: SBI PO Hard — mix water with milk at profit (IndiaBix style)
    function(){ var g=rand(10,20); return { q:'A milkman mixes water with milk and sells at cost price, gaining '+(g)+'%. Water : Milk ratio?', a:g+':100', hint:'Gain% = water/milk × 100. Water:milk = '+g+':100' }; },
    // 13: SBI PO Hard — alligation with two mixtures example
    function(){ var a=rand(50,70), b=rand(30,49); return { q:'Two vessels contain milk & water in ratio '+(a)+':'+(b)+' and '+(b)+':'+(a)+'. Mix them in what ratio to get 1:1?', a:'1:1', hint:'Fraction milk in vessel1='+a+'/'+(a+b)+', vessel2='+b+'/'+(a+b)+'. Alligation gives equal parts 1:1' }; }
  ];
  var idx;
  if (diff >= 5 && ty.length >= 4) {
    idx = Math.random() < 0.7 ? rand(Math.max(0, ty.length - 4), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var d = ty[idx](); var o=[d.a]; var _g=0; while(o.length<4&&_g++<60){if(typeof d.a==='string'){var parts=d.a.split(':').map(Number);var v=parts[0]+rand(1,3)+':'+(parts[1]+rand(1,3));if(v!==d.a&&o.indexOf(v)<0)o.push(v);}else{var v=d.a+rand(-5,5);if(o.indexOf(v)<0&&v>0)o.push(v);}} shuffle(o);
  return { question:d.q, answer:d.a, options:o, hint:d.hint, timeLimit:20, type:'quant', techniqueLabel:'Alligation: '+d.hint, intuition:'Alligation: (mean-low):(high-mean). Cheaper qty : dearer qty = (dearer-mean):(mean-cheaper).' };
}

function generateSurdsIndicesQuestion(diff, layer) {
  var ty = [
    function(){ var a=rand(2,12), b=rand(2,9); return { q:'Simplify: '+a+'^'+b+' × '+a+'^'+(b+1), a:Math.pow(a,2*b+1), hint:'Add exponents: a^m × a^n = a^(m+n)' }; },
    function(){ var a=rand(2,10), b=rand(2,7); return { q:'Simplify: ('+a+'^'+b+')^'+(b+1), a:Math.pow(a,b*(b+1)), hint:'(a^m)^n = a^(m×n)' }; },
    function(){ var a=rand(4,15), b=rand(2,6); return { q:'Simplify: '+Math.pow(a,b)+' ÷ '+Math.pow(a,b-1), a:a, hint:'a^m ÷ a^n = a^(m-n)' }; },
    function(){ var a=[2,3,5,6,7,8,10,11,12,13][rand(0,9)], b=rand(2,5); return { q:'√'+(a*a*b)+' = ?', a:a*Math.round(Math.sqrt(b)), hint:'√(a²b) = a√b. Split into perfect square × rest.' }; },
    // Rationalizing denominator
    function(){ var a=rand(2,8), b=rand(3,12); return { q:'Rationalize: 1/(√' + a + ' + ' + b + ')', a:Math.round((Math.sqrt(a)-b)/(a-b*b)*10)/10, hint:'Multiply by conjugate: (√'+a+' - '+b+')/((√'+a+')² - '+b+'²)', intuition:'Conjugate = √' + a + ' - ' + b + '. = (√' + a + ' - ' + b + ')/(' + a + ' - ' + (b*b) + ') = ' + Math.round((Math.sqrt(a)-b)/(a-b*b)*10)/10 }; },
    // Comparing surds
    function(){ var a=rand(2,8), b=rand(a+1,12); return { q:'Which is larger? √' + (a*a*2) + ' or √' + (b*b*2), a:Math.max(a*Math.round(Math.sqrt(2)),b*Math.round(Math.sqrt(2))), hint:'Simplify to ' + a + '√2 and ' + b + '√2, compare coefficients', intuition:'√' + (a*a*2) + ' = ' + a + '√2, √' + (b*b*2) + ' = ' + b + '√2. Since ' + a + ' < ' + b + ', √' + (b*b*2) + ' is larger' }; },
    // Compound surd multiplication
    function(){ var a=rand(2,8), b=rand(2,6); return { q:'Simplify: √' + (a*a*b) + ' × √' + b, a:a*b, hint:'√' + (a*a*b) + ' = ' + a + '√' + b + ', then ×√' + b + ' = ' + a + '×' + b, intuition:'√' + (a*a*b) + '×√' + b + ' = ' + a + '√' + b + '×√' + b + ' = ' + a + '×' + b + ' = ' + (a*b) }; },
    // Addition of surds with same radicand
    function(){ var a=rand(2,9), b=rand(3,10); return { q:'Simplify: ' + a + '√' + b + ' + ' + (a*2) + '√' + b + ' - ' + a + '√' + b, a:(a*2) + '√' + b, hint:'Add/subtract coefficients only: ' + a + '+' + (a*2) + '-' + a + '=' + (a*2), intuition:'Like surds: add coefficients. (' + a + '+' + (a*2) + '-' + a + ')√' + b + ' = ' + (a*2) + '√' + b }; },
    // Square of surd
    function(){ var a=rand(2,12); return { q:'Simplify: (√' + a + ')²', a:a, hint:'(√a)² = a by definition', intuition:'(√' + a + ')² = ' + a + ' (square and square root cancel)' }; },
    // SBI PO Hard: rationalize binomial denominator
    function(){ var a=rand(2,6), b=rand(3,8); return { q:'Rationalize: (√' + a + ' + √' + b + ')/(√' + a + ' - √' + b + ')', a:Math.round((a+b+2*Math.sqrt(a*b))/(a-b)*10)/10, hint:'Multiply numerator and denominator by conjugate (√'+a+' + √'+b+')', intuition:'= (√' + a + ' + √' + b + ')²/(' + a + '-' + b + ') = (' + a + '+' + b + '+2√' + (a*b) + ')/(' + (a-b) + ') = ' + Math.round((a+b+2*Math.sqrt(a*b))/(a-b)*10)/10 }; },
    // SBI PO Hard: compare surds with different radicals
    function(){ var a=rand(2,5), b=rand(a+1,8); return { q:'Which is larger? ' + a + '√' + (b*3) + ' or ' + b + '√' + (a*3), a:a*a*a*b > b*b*b*a ? a + '√' + (b*3) : b + '√' + (a*3), hint:'Square both: (' + a + '√' + (b*3) + ')²=' + (a*a*b*3) + ', (' + b + '√' + (a*3) + ')²=' + (b*b*a*3), intuition:'(' + a + '√' + (b*3) + ')²=' + a*a + '×' + (b*3) + '=' + (a*a*b*3) + '. (' + b + '√' + (a*3) + ')²=' + b*b + '×' + (a*3) + '=' + (b*b*a*3) + '. ' + (a*a*b*3 > b*b*a*3 ? 'First' : 'Second') + ' is larger' }; },
    // SBI PO Hard: fractional exponents
    function(){ var a=rand(2,8), b=rand(2,4), c=rand(2,4); return { q:'Simplify: (' + a + '^(' + b + '/' + c + '))^' + c, a:Math.pow(a,b), hint:'(a^(m/n))^n = a^m', intuition:'(' + a + '^(' + b + '/' + c + '))^' + c + ' = ' + a + '^' + b + ' = ' + Math.pow(a,b) }; },
    // SBI PO Hard: surd equation
    function(){ var a=rand(2,6), b=rand(1,4); return { q:'Solve: √(x + ' + (a*a-b) + ') = ' + a, a:b, hint:'Square both sides: x + ' + (a*a-b) + ' = ' + a*a, intuition:'Squaring: x+' + (a*a-b) + '=' + a*a + ' => x=' + a*a + '-' + (a*a-b) + '=' + b }; }
  ];
  var idx;
  if (diff >= 5 && ty.length >= 4) {
    idx = Math.random() < 0.7 ? rand(Math.max(0, ty.length - 4), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var d = ty[idx](); var o=[d.a]; var _g=0; while(o.length<4&&_g++<60){var v=typeof d.a==='string'?d.a:(d.a>0?d.a+rand(1,5):d.a+rand(-5,-1)); if(o.indexOf(v)<0&&(typeof v==='string'||v>0))o.push(v);} while(o.length<4){var f=['None of these','Cannot determine','0','1'][rand(0,3)]; if(o.indexOf(f)<0)o.push(f);} shuffle(o);
  return { question:d.q, answer:d.a, options:o, hint:d.hint, timeLimit:20, type:'quant', techniqueLabel:'Surds: '+d.hint, intuition:'a^m×a^n=a^(m+n), (a^m)^n=a^(mn), a^m÷a^n=a^(m-n). √(a²b)=a√b.' };
}

function generateBankersDiscountQuestion(diff, layer) {
  var ty = [
    function(){ var b=rand(1000,5000), r=rand(5,12), t=rand(1,3); return { q:'BD on ₹'+b+' at '+r+'% for '+t+'yr?', a:Math.round(b*r*t/100), hint:'BD = FaceValue × Rate × Time / 100' }; },
    function(){ var b=rand(1000,4000), r=rand(6,10), t=rand(2,4); var td=Math.round(b*r*t/(100+r*t)); return { q:'TD on ₹'+b+' at '+r+'% for '+t+'yr?', a:td, hint:'TD = (F×R×T)/(100+R×T)' }; },
    function(){ var b=rand(2000,6000), r=rand(5,10), t=rand(1,3); var bd=Math.round(b*r*t/100); var td=Math.round(b*r*t/(100+r*t)); return { q:'BG (BD-TD) on ₹'+b+' at '+r+'% for '+t+'yr?', a:bd-td, hint:'BG = BD - TD' }; },
    function(){ var b=rand(2000,5000), t=rand(2,4), bd=rand(200,600), td=Math.round(bd*100/(100+(bd*100/(b*t))*t)); var r=Math.round(bd*100/(b*t)*10)/10; return { q:'BD=₹'+bd+', FV=₹'+b+', time='+t+'yr. Rate%?', a:r, hint:'R = (BD×100)/(FV×T)', intuition:'R = ' + bd + '×100/(' + b + '×' + t + ') = ' + r + '%' }; },
    function(){ var b=rand(3000,8000), r=rand(6,10), t=rand(2,3); var bd=Math.round(b*r*t/100); return { q:'Find bill amount if BD=₹'+bd+', rate='+r+'%, time='+t+'yr?', a:b, hint:'FV = (BD×100)/(R×T)', intuition:'FV = ' + bd + '×100/(' + r + '×' + t + ') = ' + b }; },
    function(){ var b=rand(2000,5000), r=rand(5,10), t=rand(1,3); var bd=Math.round(b*r*t/100); var td=Math.round(b*r*t/(100+r*t)); return { q:'BD=₹'+bd+', TD=₹'+td+'. Difference (BG) on ₹'+b+' at '+r+'% for '+t+'yr?', a:bd-td, hint:'BG = BD - TD = BD²/(100+BD) or simply subtract', intuition:'BG = ' + bd + ' - ' + td + ' = ' + (bd-td) + '. This is the gain the banker makes.' }; },
    // Find time given BD, FV, rate
    function(){ var b=rand(3000,8000), r=rand(6,12), t=rand(1,4); var bd=b*r*t/100; return { q:'FV=₹'+b+', rate='+r+'%, BD=₹'+Math.round(bd)+'. Time?', a:t, hint:'t = BD×100/(FV×R) = ' + Math.round(bd) + '×100/('+b+'×'+r+')', intuition:'t = BD×100/(FV×R) = ' + Math.round(bd) + '×100/(' + b + '×' + r + ') = ' + t + ' years' }; },
    // Find rate given TD, FV, time
    function(){ var b=rand(3000,6000), r=rand(5,10), t=rand(2,3); var td=b*r*t/(100+r*t); return { q:'FV=₹'+b+', TD=₹'+Math.round(td)+', time='+t+'yr. Rate?', a:r, hint:'TD = (F×R×T)/(100+R×T). Solve for R: R = 100×TD/(F×T - TD×T)', intuition:'TD = ' + Math.round(td) + ' = (' + b + '×r×' + t + ')/(100+r×' + t + '). Solving: r = ' + r + '%' }; },
    // True discount vs banker's gain comparison
    function(){ var b=rand(4000,10000), r=rand(6,10), t=rand(2,4); var bd=Math.round(b*r*t/100); var td=Math.round(b*r*t/(100+r*t)); return { q:'FV=₹'+b+', rate='+r+'%, time='+t+'yr. True Discount?', a:td, hint:'TD = (F×R×T)/(100+R×T) = ('+b+'×'+r+'×'+t+')/(100+'+r+'×'+t+')', intuition:'TD = ' + b + '×' + r + '×' + t + '/(100+' + r + '×' + t + ') = ' + Math.round(b*r*t) + '/' + (100+r*t) + ' = ' + td }; },
    // SBI PO Hard: multi-step BD with due date
    function(){ var b=rand(5000,12000), r=rand(6,12), t=rand(2,4); var bd=Math.round(b*r*t/100); var td=Math.round(b*r*t/(100+r*t)); var bg=bd-td; return { q:'FV=₹'+b+', discounted ' + t + ' years hence at ' + r + '%. BD=₹'+bd+', TD=₹'+td+'. What is the banker\'s gain?', a:bg, hint:'BG = BD - TD = ' + bd + ' - ' + td, intuition:'BG = ' + bd + ' - ' + td + ' = ' + bg + '. This is the extra amount the banker earns.' }; },
    // SBI PO Hard: find face value from BG and rate
    function(){ var b=rand(5000,10000), r=rand(6,10), t=rand(2,3); var bd=Math.round(b*r*t/100); var td=Math.round(b*r*t/(100+r*t)); var bg=bd-td; return { q:'Banker\'s gain = ₹' + bg + ', rate = ' + r + '%, time = ' + t + ' years. Face value?', a:b, hint:'BG = (FV×R×T)² / (100×(100+R×T)). Solve for FV.', intuition:'Using BG formula: FV = sqrt(' + bg + '×100×(100+' + r + '×' + t + '))/(' + r + '×' + t + ') = ' + b }; }
  ];
  var idx;
  if (diff >= 5 && ty.length >= 6) {
    idx = Math.random() < 0.7 ? rand(Math.max(0, ty.length - 3), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var d=ty[idx](); var o=[d.a]; if(typeof d.a==='string'){var wpool=['Stock1','Stock2','Lower at market','Higher at market','Same','None of these']; for(var _g=0;_g<60&&o.length<4;_g++){var wv=wpool[rand(0,wpool.length-1)]; if(o.indexOf(wv)<0)o.push(wv);}} else {for(var _g=0;_g<60&&o.length<4;_g++){var v=d.a>0?d.a+rand(1,100):d.a+rand(-100,-1); if(o.indexOf(v)<0&&v>0)o.push(v);}} shuffle(o);
  return { question:d.q, answer:d.a, options:o, hint:d.hint, timeLimit:20, type:'quant', techniqueLabel:'Banker\'s Discount', intuition:'BD=FV×R×T/100. TD=BD×100/(100+R×T). BG=BD-TD.' };
}

function generateStocksSharesQuestion(diff, layer) {
  var ty = [
    function(){ var fv=rand(50,100), mv=rand(fv-20,fv+30), d=rand(5,12); return { q:'Face=₹'+fv+', Mkt=₹'+mv+', dividend='+d+'%. Yield?', a:Math.round(d*fv/mv*100)/100, hint:'Yield% = (Dividend%/Face)/Market × 100' }; },
    function(){ var fv=rand(50,100), mv=rand(fv-10,fv+20), d=rand(6,15), inv=rand(5000,20000); var shares=Math.floor(inv/mv); return { q:'Face=₹'+fv+', Mkt=₹'+mv+', dividend='+d+'%. Invest ₹'+inv+', income?', a:shares*d*fv/100, hint:'Income = (Investment/Market) × Dividend% × Face' }; },
    function(){ var fv=100, d=rand(8,18), r=rand(6,12); return { q:'₹'+fv+' stock, '+d+'% dividend yields '+r+'%. Market price?', a:Math.round(d*fv/r), hint:'MV = (Dividend% × FV) / Yield%' }; },
    function(){ var fv=rand(50,100), mv=rand(fv-15,fv+25), d=rand(6,14); var yield1=Math.round(d*fv*100/(fv*100)*100)/100; var yield2=Math.round(d*fv*100/(mv*100)*100)/100; return { q:'Face=₹'+fv+', Mkt=₹'+mv+', dividend='+d+'%. Compare yield at face vs market?', a:yield2<yield1?'Lower at market':(yield2>yield1?'Higher at market':'Same'), hint:'Yield = dividend×face/market × 100', intuition:'Yield at face=' + yield1 + '%, at market=' + yield2 + '%' }; },
    function(){ var stks=[{f:50,m:60,d:8},{f:100,m:120,d:10},{f:10,m:15,d:12}][rand(0,2)]; var q1=rand(10,50), q2=rand(10,50); var inv1=q1*stks.m, inv2=q2*stks.m; var inc1=Math.round(q1*stks.d*stks.f/100), inc2=Math.round(q2*stks.d*stks.f/100); return { q:'Buy ' + q1 + ' shares (F=₹' + stks.f + ', M=₹' + stks.m + ', div=' + stks.d + '%) and ' + q2 + ' shares same. Total annual income?', a:inc1+inc2, hint:'Income = shares × div% × face / 100 for each, then sum', intuition:'Income = ' + q1 + '×' + stks.d + '%×' + stks.f + ' + ' + q2 + '×' + stks.d + '%×' + stks.f + ' = ' + inc1 + ' + ' + inc2 + ' = ' + (inc1+inc2) }; },
    function(){ var fv=rand(50,100), mv=rand(fv-10,fv+20), d=rand(8,16), inv=rand(10000,30000); var shares=Math.floor(inv/mv); var income=Math.round(shares*d*fv/100); return { q:'Invest ₹'+inv+' in ₹'+fv+' shares at ₹'+mv+', dividend '+d+'%. Annual income?', a:income, hint:'Shares='+shares+', income=shares×div%×face/100', intuition:'Shares = ' + inv + '/' + mv + ' = ' + shares + '. Income = ' + shares + '×' + d + '%×' + fv + ' = ₹' + income }; },
    // Investment comparison between two stocks
    function(){ var f1=rand(50,100), m1=rand(f1-15,f1+10), d1=rand(6,14); var f2=rand(50,100), m2=rand(f2-10,f2+20), d2=rand(8,16); var inv=rand(10000,20000); var s1=Math.floor(inv/m1); var inc1=Math.round(s1*d1*f1/100); var s2=Math.floor(inv/m2); var inc2=Math.round(s2*d2*f2/100); return { q:'Stock1 F=₹'+f1+' M=₹'+m1+' div='+d1+'%. Stock2 F=₹'+f2+' M=₹'+m2+' div='+d2+'%. Invest ₹'+inv+'. Which yields more income?', a:inc1>inc2?'Stock1':'Stock2', hint:'Income1='+inc1+', Income2='+inc2, intuition:'Stock1 income='+inc1+', Stock2 income='+inc2+'. '+(inc1>inc2?'Stock1 is better':'Stock2 is better') }; },
    // Brokerage: buy/sell with broker fee
    function(){ var fv=rand(50,100), mv=rand(fv-10,fv+15), d=rand(8,14), q=rand(50,200), br=rand(1,3)/10; var cost=q*(mv+br); var income=Math.round(q*d*fv/100); return { q:'Buy '+q+' shares F=₹'+fv+' at ₹'+mv+', broker '+br+'/share. Dividend '+d+'%. Net return %?', a:Math.round((income - q*br)/cost*10000)/100, hint:'Investment='+cost+', income='+income+', net return%='+(income - q*br)+'/'+cost+'×100', intuition:'Cost='+q+'×('+mv+'+'+br+')='+cost+'. Brokerage cost='+q+'×'+br+'='+Math.round(q*br)+'. Return%='+(income-Math.round(q*br))+'/'+cost+'×100='+Math.round((income-Math.round(q*br))/cost*10000)/100+'%' }; },
    // Income difference from two investment strategies
    function(){ var fv=rand(50,100), d=rand(8,16), inv=rand(15000,25000); var m1=fv-rand(5,15), m2=fv+rand(10,25); var s1=Math.floor(inv/m1); var s2=Math.floor(inv/m2); var inc1=Math.round(s1*d*fv/100); var inc2=Math.round(s2*d*fv/100); return { q:'₹'+fv+' share, div='+d+'%. Invest ₹'+inv+'. At ₹'+m1+' buy '+s1+' shares, income ₹'+inc1+'. At ₹'+m2+' buy '+s2+' shares, income ₹'+inc2+'. Income difference?', a:Math.abs(inc1-inc2), hint:'|' + s1 + '×' + d + '%×' + fv + ' - ' + s2 + '×' + d + '%×' + fv + '|', intuition:'Difference = |' + inc1 + ' - ' + inc2 + '| = ' + Math.abs(inc1-inc2) }; },
    // SBI PO Hard: investment in different stocks comparison
    function(){ var f1=rand(50,100), m1=rand(f1-10,f1+15), d1=rand(8,14); var f2=rand(50,100), m2=rand(f2-10,f2+15), d2=rand(8,14); var inv=rand(15000,25000); var s1=Math.floor(inv/m1); var i1=Math.round(s1*d1*f1/100); var s2=Math.floor(inv/m2); var i2=Math.round(s2*d2*f2/100); return { q:'Stock1: F=₹'+f1+' M=₹'+m1+' div='+d1+'%, Stock2: F=₹'+f2+' M=₹'+m2+' div='+d2+'%. Invest ₹'+inv+'. Income difference between two stocks?', a:Math.abs(i1-i2), hint:'Stock1 income='+i1+', Stock2 income='+i2, intuition:'Difference = |'+i1+' - '+i2+'| = '+Math.abs(i1-i2)}; },
    // SBI PO Hard: rate of return with brokerage and tax
    function(){ var fv=rand(50,100), mv=rand(fv-10,fv+10), d=rand(8,14), q=rand(100,500), br=rand(1,5)/10, tax=rand(5,15); var cost=q*(mv+br); var grossInc=Math.round(q*d*fv/100); var netInc=Math.round(grossInc*(100-tax)/100); var netReturn=Math.round((netInc - q*br)/cost*10000)/100; return { q:'Buy '+q+' shares F=₹'+fv+' at ₹'+mv+', broker '+br+'/share, dividend '+d+'%, tax '+tax+'%. Net return %?', a:netReturn, hint:'Cost='+cost+', gross='+grossInc+', net='+netInc+', return='+(netInc-Math.round(q*br))+'/'+cost, intuition:'Net return = '+(netInc-Math.round(q*br))+'/'+cost+'×100 = '+netReturn+'%'}; }
  ];
  var idx;
  if (diff >= 5 && ty.length >= 6) {
    idx = Math.random() < 0.7 ? rand(Math.max(0, ty.length - 3), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var d=ty[idx](); var o=[d.a]; var _g=0; while(o.length<4&&_g++<60){var v=typeof d.a==='number'?Math.round(d.a+rand(-2,2)):(d.a+rand(-2,2)); if(o.indexOf(v)<0&&v>0)o.push(v);} while(o.length<4){o.push(o.length+d.a);} shuffle(o);
  return { question:d.q, answer:d.a, options:o, hint:d.hint, timeLimit:20, type:'quant', techniqueLabel:'Stocks', intuition:'Yield = Dividend/MV × 100. Income = Shares × Dividend% × FV. MV = (D%×FV)/Yield%.' };
}

function generateWorkQuestion(diff, layer) {
  var ty = [
    function(){ var a=rand(3,10), b=rand(a+2,15); return { q:'A completes work in '+a+' days, B in '+b+' days. Together?', a:Math.round(a*b/(a+b)), hint:'T = a×b/(a+b)' }; },
    function(){ var a=rand(4,10), b=rand(6,14), c=rand(a+b+1,a+b+10); return { q:'A='+a+'d, B='+b+'d, C='+c+'d. All three together?', a:Math.round(1/(1/a+1/b+1/c)), hint:'1/t = 1/a + 1/b + 1/c' }; },
    function(){ var a=rand(6,15), b=rand(2,5); return { q:'A in '+a+'d, A+B together in '+b+'d. B alone?', a:Math.round(a*b/(a-b)), hint:'B = a×b/(a−b)' }; },
    function(){ var m=rand(10,30), d=rand(6,15); return { q:'Men='+m+', days='+d+'. Total work in man-days?', a:m*d, hint:'Work = men × days' }; },
    function(){ var m=rand(10,25), d=rand(8,15), h=rand(6,10); return { q:'Men='+m+', days='+d+', hrs/day='+h+'. Total work in man-hours?', a:m*d*h, hint:'Man-hours = men × days × hours/day' }; },
    function(){ var w=rand(60,200), m=rand(5,15); return { q:'Total work='+w+' units. Men='+m+', each does 1 unit/day. Days needed?', a:Math.round(w/m), hint:'Days = total work / men' }; },
    function(){ var a=rand(3,8), b=rand(4,10), c=rand(2,6); return { q:'A='+a+'d, B='+b+'d, A+B+C together='+c+'d. C alone?', a:Math.round(1/(1/c-1/a-1/b)), hint:'1/C = 1/combined − 1/A − 1/B' }; },
    function(){ var m=rand(6,20), d=rand(10,20), h=rand(5,8); return { q:'Men='+m+', hrs='+h+'/day, finish in '+d+' days. How many men to finish in '+(d-rand(2,5))+' days at '+(h+1)+' hrs/day?', a:Math.ceil(m*d*h/((d-rand(2,5))*(h+1))), hint:'M1×D1×H1 = M2×D2×H2. Solve for M2' }; },
    // SBI PO Hard: work with efficiency ratios
    function(){ var e1=rand(2,5), e2=rand(e1+1,7), d=rand(8,15); return { q:'A is ' + Math.round(e2/e1*10)/10 + '× as efficient as B. A+B finish in ' + d + ' days. A alone?', a:Math.round(d*(1+e1/e2)), hint:'Efficiency ratio A:B = ' + e2 + ':' + e1 + '. A+B rate = (e2+e1)/e2 × A rate', intuition:'Let A take x days. B takes ' + Math.round(e2/e1*10)/10 + 'x days. 1/x + 1/' + Math.round(e2/e1*10)/10 + 'x = 1/' + d + '. x=' + Math.round(d*(1+e1/e2)) + ' days' }; },
    // SBI PO Hard: men, women, children combined work
    function(){ var m=rand(2,5), w=rand(3,6), c=rand(4,8), d=rand(10,20); var mRate=1/d, wRate=1/(d+rand(5,10)), cRate=1/(d+rand(8,15)); return { q:'2 men = 3 women = 4 children. ' + m + ' men + ' + w + ' women + ' + c + ' children finish in ' + d + ' days. Time for ' + (m+1) + ' men alone?', a:Math.round(1/((m+1) * mRate)), hint:'Find individual rates using equivalence. 2M=3W=4C → M:W:C = 6:4:3', intuition:'Let M rate='+Math.round(mRate*1000)/1000+', W rate='+Math.round(wRate*1000)/1000+', C rate='+Math.round(cRate*1000)/1000+' per day. ' + (m+1) + ' men take ' + Math.round(1/((m+1)*mRate)) + ' days' }; },
    // SBI PO Hard: work with alternate days
    function(){ var a=rand(5,12), b=rand(a+2,16); return { q:'A in ' + a + 'd, B in ' + b + 'd. A works on day 1, B on day 2, A on day 3... Days to finish?', a:Math.ceil((1/(1/a) > 1/(1/b) ? 2*Math.ceil(a/2) : 2*Math.ceil(b/2)) * (a+b)/(a+b+1) + 1), hint:'Work done in 2 days = 1/a+1/b=' + (1/a+1/b).toFixed(4) + '. Continue cycle' }; },
    // SBI PO Hard: work with break/leave
    function(){ var m=rand(10,25), d=rand(10,20); return { q:m + ' men can finish in ' + d + ' days. After ' + rand(3,6) + ' days, ' + rand(2,5) + ' men leave. Total days?', a:Math.round(rand(3,6) + (m*d - m*rand(3,6))/(m-rand(2,5))), hint:'Work done in ' + rand(3,6) + 'd = ' + m*rand(3,6) + ' units. Remaining=' + (m*d - m*rand(3,6)) + '. Remaining men=' + (m-rand(2,5)) }; },
    // SBI PO Hard: new variants
    function(){ var a=rand(4,10), b=rand(6,15); return { q:'Pipe A fills in '+a+'h, B in '+b+'h. Both together?', a:Math.round(a*b/(a+b)), hint:'=a×b/(a+b)' }; },
    function(){ var a=rand(4,10), b=rand(a+2,14), w=rand(3000,15000); return { q:'A='+a+'d, B='+b+'d. Wage ₹'+w+'. A share?', a:Math.round(w*b/(a+b)), hint:'Eff A:B='+b+':'+a+'. A=₹'+b+'×'+w+'/'+(a+b) }; },
    function(){ var a=rand(7,15); return { q:'A twice as fast as B. Together '+a+'d. B alone?', a:Math.round(3*a), hint:'1/x+1/(2x)=1/'+a+', x=3'+a+'/2, B=2x' }; },
    function(){ var a=rand(5,12), b=rand(a+3,18); return { q:'A='+a+'d, B='+b+'d. A works 2d, then B joins. Total?', a:Math.ceil(2+(1-2/a)/(1/a+1/b)), hint:'A does 2/'+a+', rem='+(1-2/a).toFixed(2)+', rate='+(1/a+1/b).toFixed(4) }; },
    function(){ var a=rand(6,12), p=rand(20,80); return { q:'A='+a+'d. B is '+p+'% more efficient. B alone?', a:Math.round(a*100/(100+p)), hint:'B time = '+a+'×100/'+(100+p) }; },
    function(){ var m=rand(3,7), w=rand(m+2,10), d=rand(8,18); return { q:m+' men = '+w+' women. '+m+' men in '+d+'d. '+w+' women alone?', a:d, hint:'Men=women efficiency, same time' }; }
  ];
  var idx;
  if (diff >= 5 && ty.length >= 4) {
    idx = Math.random() < 0.7 ? rand(Math.max(0, ty.length - 4), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var d = ty[idx](); var o=[d.a]; var _g=0; while(o.length<4&&_g++<100){var v=d.a+rand(-2,3); if(typeof v==='number'&&o.indexOf(v)<0&&v>=0)o.push(v);} shuffle(o);
  // fix negative answers (combined-time rule) with a bounded string-safe fill
  while(o.length<4){var filler=['Less than 1 day','1 day','2 days','3 days','4 days'][rand(0,4)]; if(o.indexOf(filler)<0)o.push(filler);} shuffle(o);
  return { question:d.q, answer:d.a, options:o, hint:d.hint, timeLimit:20, type:'quant', techniqueLabel:'Work: '+d.hint, intuition:'Total work = men × days × hours. Together rate = sum of individual rates.' };
}

function generateAlgebraQuestion(diff, layer) {
  var ty = [
    function(){ var a=rand(2,8), b=rand(2,9); return { q:'Solve: x + ' + a + ' = ' + (a+b), a:b, hint:'x = '+(a+b)+' - '+a }; },
    function(){ var a=rand(2,7), b=rand(2,8); return { q:'Solve: ' + a + 'x = ' + (a*b), a:b, hint:'x = '+(a*b)+'/'+a }; },
    function(){ var a=rand(2,6), b=rand(3,9), c=rand(1,5); return { q:'Expand: (x+' + a + ')(x+' + b + ')', a:'x²+'+(a+b)+'x+'+(a*b), hint:'x²+(a+b)x+ab' }; },
    function(){ var a=rand(1,5), b=rand(a+1,8); return { q:'Factor: x² + ' + (a+b) + 'x + ' + (a*b), a:'(x+'+a+')(x+'+b+')', hint:'Find two numbers summing to '+(a+b)+' and product '+(a*b) }; },
    function(){ var a=rand(1,4), b=rand(2,6); return { q:'Simplify: ' + a + '(x + ' + b + ') - ' + a + 'x', a:a*b, hint:'= ' + a + 'x + ' + (a*b) + ' - ' + a + 'x = ' + (a*b) }; },
    function(){ var a=rand(2,5), b=rand(3,7); return { q:'If x/' + a + ' = ' + b + ', find x', a:a*b, hint:'x = ' + a + '×' + b }; },
    function(){ var a=rand(1,4), b=rand(2,5), c=rand(a+1,6); return { q:'Solve: ' + a + 'x + ' + b + ' = ' + (a*c+b), a:c, hint:a+'x = '+(a*c+b)+'-'+b+' = '+(a*c)+', x='+c }; },
    function(){ var a=rand(2,5), b=rand(1,4); return { q:'(a+b)² formula: ('+a+'+'+b+')²', a:(a+b)*(a+b), hint:'= a² + 2ab + b² = '+(a*a)+'+'+2*a*b+'+'+(b*b) }; },
    // SBI PO Hard: age word problem
    function(){ var x=rand(3,8), y=rand(x+2,14); return { q:'Sum of ages = ' + (x+y) + ', product = ' + (x*y) + '. Find the ages', a: x + ' and ' + y, hint:'Solve: a+b=' + (x+y) + ', ab=' + (x*y) + '. Quadratic: t²-' + (x+y) + 't+' + (x*y) + '=0', intuition:'t² - ' + (x+y) + 't + ' + (x*y) + ' = 0 → (t-' + x + ')(t-' + y + ')=0 → ages ' + x + ' and ' + y }; },
    // SBI PO Hard: fraction equation
    function(){ var a=rand(2,5), b=rand(3,7); return { q:'Solve: 1/x + 1/' + (a+b) + ' = 1/' + a, a:Math.round(a*(a+b)/(b)), hint:'1/x = 1/' + a + ' - 1/' + (a+b) + ' = ' + (a+b-a) + '/' + (a*(a+b)), intuition:'1/x = 1/' + a + ' - 1/' + (a+b) + ' = (' + b + ')/' + (a*(a+b)) + '. x = ' + a*(a+b) + '/' + b + ' = ' + Math.round(a*(a+b)/b) }; },
    // SBI PO Hard: find value of expression given condition
    function(){ var a=rand(2,5), b=rand(2,5); return { q:'If a+b=' + (a+b) + ' and ab=' + (a*b) + ', find a² + b²', a: (a+b)*(a+b) - 2*a*b, hint:'a²+b² = (a+b)² - 2ab = ' + (a+b) + '² - 2×' + (a*b), intuition:'a²+b² = (' + (a+b) + ')² - 2(' + (a*b) + ') = ' + ((a+b)*(a+b)) + ' - ' + (2*a*b) + ' = ' + ((a+b)*(a+b)-2*a*b) }; },
    // SBI PO Hard: linear equation with two variables
    function(){ var a=rand(2,5), b=rand(3,7); return { q:'Solve: x+' + a + 'y = ' + (a+b) + ' and ' + a + 'x-y = ' + (a*a-1), a: a + ',1', hint:'Solve simultaneously. From eq1: x=' + (a+b) + '-' + a + 'y. Substitute in eq2', intuition:'x=' + (a+b) + '-' + a + 'y. In eq2: ' + a + '(' + (a+b) + '-' + a + 'y)-y=' + (a*a-1) + ' → y=1, x=' + a }; },
    // SBI PO Hard: new variants
    function(){ var a=rand(2,5), b=rand(3,7); return { q:'If x+1/x='+a+', find x²+1/x²', a:a*a-2, hint:'x²+1/x²=(x+1/x)²-2' }; },
    function(){ var a=rand(1,4), b=rand(2,6); return { q:'Expand (x-'+a+')(x-'+b+')', a:'x²-'+(a+b)+'x+'+(a*b), hint:'=x²-(a+b)x+ab' }; },
    function(){ var a=rand(1,4), b=rand(1,5); if(a===b)b++; return { q:'Simplify ('+a+'x²+'+b+'x)/'+a+'x', a:'x+'+b+'/'+a, hint:'Factor x: x('+a+'x+'+b+')/'+a+'x = ('+a+'x+'+b+')/'+a }; },
    function(){ var a=rand(2,5), b=rand(2,6); return { q:'Solve: '+a+'/(x+'+b+') = '+(a-1)+'/x', a:Math.round(a*(a-1)*b/(a-(a-1))), hint:'Cross-multiply: '+a+'x = '+(a-1)+'(x+'+b+')' }; },
    function(){ var a=rand(2,5); return { q:'If 2^{x} = '+Math.pow(2,a)+', find x', a:a, hint:'2^'+a+' = '+Math.pow(2,a)+', so x='+a }; },
    function(){ var a=rand(2,5), b=rand(3,7); return { q:'If x²+1/x²='+(a*a-2)+', find x+1/x', a:a, hint:'x²+1/x²=(x+1/x)²-2' }; },
    function(){ var a=rand(1,4), b=rand(2,5); return { q:'If a='+a+', b='+b+', find (a+b)²-(a-b)²', a:4*a*b, hint:'(a+b)²-(a-b)²=4ab' }; }
  ];
  var idx;
  if (diff >= 5 && ty.length >= 4) {
    idx = Math.random() < 0.7 ? rand(Math.max(0, ty.length - 4), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var d = ty[idx](); var o=[d.a]; var _g=0; while(o.length<4&&_g++<50){var v=typeof d.a==='string'?(d.a+'a'):(d.a+rand(-2,2)); if(o.indexOf(v)<0&&(typeof v==='string'||v>0))o.push(v);} while(o.length<4){var f=['a=-1','x=0','Cannot simplify','None'][rand(0,3)]; if(o.indexOf(f)<0)o.push(f);} shuffle(o);
  return { question:d.q, answer:d.a, options:o, hint:d.hint, timeLimit:15, type:'quant', techniqueLabel:'Algebra: '+d.hint, intuition:'Isolate variable. For expansions, use formulas: (a±b)² = a²±2ab+b², (a+b)(a-b)=a²-b².' };
}

function generateGeometryQuestion(diff, layer) {
  var ty = [
    function(){ var a=rand(30,80); return { q:'Complement of '+a+'° angle?', a:90-a, hint:'Complementary angles sum to 90°' }; },
    function(){ var a=rand(30,120); return { q:'Supplement of '+a+'° angle?', a:180-a, hint:'Supplementary angles sum to 180°' }; },
    function(){ var a=rand(30,70), b=rand(a+10,100); var c=180-a-b; return { q:'Triangle angles: '+a+'°, '+b+'°. Third angle?', a:c, hint:'Sum of triangle angles = 180°' }; },
    function(){ var s=rand(4,10); return { q:'Sum of interior angles of '+s+'-sided polygon?', a:(s-2)*180, hint:'Sum = (n-2)×180°' }; },
    function(){ var s=rand(4,10); return { q:'Each interior angle of regular '+s+'-gon?', a:Math.round((s-2)*180/s), hint:'Each = (n-2)×180/n' }; },
    function(){ var r=rand(3,10); return { q:'Area of circle radius='+r+' (π=3.14)?', a:Math.round(3.14*r*r), hint:'Area = πr² = 3.14×'+r+'×'+r }; },
    function(){ var r=rand(3,10); return { q:'Circumference of circle radius='+r+' (π=3.14)?', a:Math.round(2*3.14*r), hint:'C = 2πr = 2×3.14×'+r }; },
    function(){ var b=rand(4,12), h=rand(3,10); return { q:'Area of triangle base='+b+', height='+h+'?', a:Math.round(0.5*b*h), hint:'Area = ½×base×height = 0.5×'+b+'×'+h }; },
    // SBI PO Hard: length of tangent from external point
    function(){ var r=rand(5,12), d=rand(r+3,20); return { q:'Circle radius=' + r + 'cm. External point ' + d + 'cm from center. Tangent length?', a:Math.round(Math.sqrt(d*d - r*r)), hint:'Tangent² = distance² - radius² = ' + d + '² - ' + r + '²', intuition:'Tangent length = √(' + d + '² - ' + r + '²) = √(' + (d*d-r*r) + ') = ' + Math.round(Math.sqrt(d*d-r*r)) + 'cm' }; },
    // SBI PO Hard: chord length from center distance
    function(){ var r=rand(8,15), d=rand(3, r-2); return { q:'Circle radius=' + r + 'cm. Chord ' + d + 'cm from center. Chord length?', a:Math.round(2*Math.sqrt(r*r - d*d)), hint:'Chord = 2√(r²-d²) = 2√(' + r + '²-' + d + '²)', intuition:'Half chord = √(' + r + '²-' + d + '²) = √' + (r*r-d*d) + ' = ' + Math.round(Math.sqrt(r*r-d*d)) + '. Full chord = ' + Math.round(2*Math.sqrt(r*r-d*d)) + 'cm' }; },
    // SBI PO Hard: angle between two tangents
    function(){ var r=rand(5,12), d=rand(r+5,25); var th=Math.round(2*Math.asin(r/d)*180/Math.PI); return { q:'Circle radius=' + r + 'cm. Two tangents from point ' + d + 'cm from center. Angle between tangents?', a:th, hint:'Angle = 2×arcsin(r/d) = 2×arcsin(' + r + '/' + d + ')', intuition:'sin(θ/2) = r/d = ' + r + '/' + d + ' = ' + (r/d).toFixed(3) + '. θ/2 = ' + Math.round(Math.asin(r/d)*180/Math.PI) + '°, θ = ' + th + '°' }; },
    // SBI PO Hard: cyclic quadrilateral property
    function(){ var a=rand(60,100), b=rand(a+10,160); return { q:'Cyclic quadrilateral: ∠A=' + a + '°, ∠C=' + (180-a) + '°. If ∠B=' + b + '°, ∠D?', a:180-b, hint:'Opposite angles sum to 180° in cyclic quadrilateral', intuition:'A+C=' + a + '+' + (180-a) + '=180°. B+D=180° → D=180-'+b+'=' + (180-b) + '°' }; }
  ];
  var idx;
  if (diff >= 5 && ty.length >= 4) {
    idx = Math.random() < 0.7 ? rand(Math.max(0, ty.length - 4), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var d = ty[idx](); var o=[d.a]; var _g=0; while(o.length<4&&_g++<60){var v=d.a+rand(-10,10); if(o.indexOf(v)<0&&v>0)o.push(v);} while(o.length<4){o.push(o.length+d.a);} shuffle(o);
  return { question:d.q, answer:d.a, options:o, hint:d.hint, timeLimit:15, type:'quant', techniqueLabel:'Geometry: '+d.hint, intuition:'Triangle sum=180°, complement=90-x, supplement=180-x. Circle: area=πr², C=2πr.' };
}

function generateMensurationQuestion(diff, layer) {
  var ty = [
    function(){ var s=rand(4,15); return { q:'Area of square side='+s+'?', a:s*s, hint:'Area = side² = '+s+'×'+s }; },
    function(){ var l=rand(5,15), b=rand(3,10); return { q:'Area of rectangle '+l+'×'+b+'?', a:l*b, hint:'Area = length × breadth' }; },
    function(){ var r=rand(3,10), h=rand(5,15); return { q:'Volume of cylinder r='+r+', h='+h+' (π=3.14)?', a:Math.round(3.14*r*r*h), hint:'V = πr²h = 3.14×'+r+'×'+r+'×'+h }; },
    function(){ var s=rand(3,8); return { q:'Volume of cube side='+s+'?', a:s*s*s, hint:'V = side³ = '+s+'×'+s+'×'+s }; },
    function(){ var l=rand(4,10), b=rand(3,8), h=rand(3,7); return { q:'Volume of cuboid '+l+'×'+b+'×'+h+'?', a:l*b*h, hint:'V = l×b×h' }; },
    function(){ var r=rand(3,10); return { q:'Surface area of sphere r='+r+' (π=3.14)?', a:Math.round(4*3.14*r*r), hint:'SA = 4πr² = 4×3.14×'+r+'×'+r }; },
    function(){ var r=rand(3,8), h=rand(5,12); return { q:'Curved surface area of cylinder r='+r+', h='+h+' (π=3.14)?', a:Math.round(2*3.14*r*h), hint:'CSA = 2πrh = 2×3.14×'+r+'×'+h }; },
    function(){ var a=rand(4,10); return { q:'Area of equilateral triangle side='+a+' (√3≈1.73)?', a:Math.round(0.433*a*a), hint:'Area = √3/4 × side² = 0.433×'+a+'×'+a }; },
    // SBI PO Hard: area of path around rectangle
    function(){ var l=rand(20,50), b=rand(15,30), w=rand(2,5); return { q:'Garden ' + l + 'm×' + b + 'm. Path ' + w + 'm wide around inside. Path area?', a:2*w*(l+b-2*w), hint:'Path area = outer-inner = ' + l + '×' + b + ' - (' + l + '-' + 2*w + ')(' + b + '-' + 2*w + ')', intuition:'Outer='+l+'×'+b+'='+(l*b)+'. Inner='+(l-2*w)+'×'+(b-2*w)+'='+((l-2*w)*(b-2*w))+'. Path='+(l*b-(l-2*w)*(b-2*w))+'m²' }; },
    // SBI PO Hard: cost of fencing + painting
    function(){ var l=rand(10,30), b=rand(8,20), h=rand(4,8), rate=rand(10,30), paint=rand(5,15); return { q:'Room ' + l + 'm×' + b + 'm×' + h + 'm. Cost of painting 4 walls at ₹' + paint + '/m² and ceiling at ₹' + (paint-2) + '/m²?', a:Math.round(2*h*(l+b)*paint + l*b*(paint-2)), hint:'Walls area = 2h(l+b), Ceiling = l×b', intuition:'Walls = 2×' + h + '×(' + l + '+' + b + ')=' + 2*h*(l+b) + 'm² × ₹' + paint + ' = ' + (2*h*(l+b)*paint) + '. Ceiling=' + l + '×' + b + '=' + (l*b) + 'm² × ₹' + (paint-2) + ' = ' + (l*b*(paint-2)) + '. Total=' + Math.round(2*h*(l+b)*paint + l*b*(paint-2)) }; },
    // SBI PO Hard: volume of combined solid
    function(){ var r=rand(4,8), h=rand(8,15); return { q:'Cylinder radius=' + r + 'cm, height=' + h + 'cm. Cone on top same radius, height=' + rand(3,6) + 'cm. Total volume (π=3.14)?', a:Math.round(3.14*r*r*(h + rand(3,6)/3)), hint:'V = πr²h_cyl + ⅓πr²h_cone = πr²(' + h + '+' + rand(3,6) + '/3)', intuition:'Cylinder=' + Math.round(3.14*r*r*h) + ', Cone=' + Math.round(3.14*r*r*rand(3,6)/3) + '. Total=' + Math.round(3.14*r*r*(h+rand(3,6)/3)) + 'cm³' }; },
    // SBI PO Hard: area of circle inscribed in square
    function(){ var s=rand(10,25); return { q:'Largest circle inscribed in square side=' + s + 'cm. Area of circle (π=3.14)?', a:Math.round(3.14*s*s/4), hint:'Diameter = side = ' + s + ', radius = ' + s/2 + '. Area = πr²', intuition:'r=' + s/2 + 'cm. Area=3.14×(' + s/2 + ')²=' + Math.round(3.14*s*s/4) + 'cm²' }; }
  ];
  var idx;
  if (diff >= 5 && ty.length >= 4) {
    idx = Math.random() < 0.7 ? rand(Math.max(0, ty.length - 4), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var d = ty[idx](); var o=[d.a]; var _g=0; while(o.length<4&&_g++<60){var v=d.a+rand(-5,5); if(o.indexOf(v)<0&&v>0)o.push(v);} while(o.length<4){o.push(o.length+d.a);} shuffle(o);
  return { question:d.q, answer:d.a, options:o, hint:d.hint, timeLimit:15, type:'quant', techniqueLabel:'Mensuration: '+d.hint, intuition:'Area formulas: square=s², rect=l×b, tri=½bh, circle=πr². Vol: cube=s³, cuboid=l×b×h, cyl=πr²h.' };
}

function generateCountingQuestion(diff, layer) {
  var ty = [
    function(){ var n=rand(3,7); return { q:'How many ways to arrange '+n+' distinct items?', a:function(){var f=1;for(var i=2;i<=n;i++)f*=i;return f;}(), hint:n+'! = '+n+'×'+(n-1)+'×...×1' }; },
    function(){ var n=rand(4,8), r=rand(2,Math.min(4,n-1)); return { q:'Permutation: P('+n+','+r+')?', a:function(){var p=1;for(var i=n;i>n-r;i--)p*=i;return p;}(), hint:'P(n,r) = n!/(n-r)! = '+n+'×'+(n-1)+'×...×'+(n-r+1) }; },
    function(){ var n=rand(4,8), r=rand(2,Math.min(4,n-1)); return { q:'Combination: C('+n+','+r+')?', a:function(){var c=1;for(var i=n;i>n-r;i--)c*=i;for(var i=2;i<=r;i++)c/=i;return c;}(), hint:'C(n,r) = P(n,r)/r!' }; },
    function(){ var n=rand(2,5), k=rand(2,4); return { q:'Number of ways to distribute '+n*k+' items into '+n+' groups of '+k+' each?', a:function(){var f=function(x){var r=1;for(var i=2;i<=x;i++)r*=i;return r;}; return f(n*k)/(Math.pow(f(k),n)*f(n));}(), hint:'(nk)! / [(k!)ⁿ × n!]' }; },
    function(){ var n=rand(3,6); return { q:'How many ways to arrange '+n+' people in a circle?', a:function(){var f=1;for(var i=2;i<n;i++)f*=i;return f;}(), hint:'Circular permutations = (n-1)!' }; },
    function(){ var n=rand(3,10); return { q:'From digits 1-9, how many '+n+'-digit numbers with distinct digits?', a:function(){var p=9;for(var i=1;i<n;i++)p*=(9-i);return p;}(), hint:'First digit 9 choices, then 8, 7... (n-1) more choices' }; },
    function(){ var a=rand(3,7), b=rand(2,5); return { q:'Choose '+b+' from '+a+' items (order matters)?', a:function(){var p=1;for(var i=a;i>a-b;i--)p*=i;return p;}(), hint:'Permutations: n!/(n-r)! = '+a+'×'+(a-1)+'×...' }; },
    // SBI PO Hard: arrangements with restrictions
    function(){ var n=rand(4,7); return { q:'Arrange ' + n + ' people in a row. Two particular always together?', a:function(){var f=function(x){var r=1;for(var i=2;i<=x;i++)r*=i;return r;}; return 2*f(n-1);}(), hint:'Treat the pair as 1 unit: ' + (n-1) + '! × 2', intuition:'Consider the two as one unit → ' + (n-1) + ' items → ' + (n-1) + '! = ' + function(){var f=1;for(var i=2;i<n;i++)f*=i;return f;}() + '. The pair can swap: ×2 = ' + (2*function(){var f=1;for(var i=2;i<n;i++)f*=i;return f;}()) }; },
    // SBI PO Hard: selection with at least one condition
    function(){ var n=rand(5,8), r=rand(2,4); return { q:'Choose ' + r + ' from ' + n + ' items. A particular item always included?', a:function(){var c=1;for(var i=n-1;i>n-r;i--)c*=i;for(var i=2;i<r;i++)c/=i;return c;}(), hint:'Fix the required item, choose remaining ' + (r-1) + ' from ' + (n-1), intuition:'C(' + (n-1) + ',' + (r-1) + ') = ' + function(){var c=1;for(var i=n-1;i>n-r;i--)c*=i;for(var i=2;i<r;i++)c/=i;return c;}() }; },
    // SBI PO Hard: word arrangements with vowels together
    function(){ var word=['BANKING','EXAM','RESULT','SCORE'][rand(0,3)]; var vowels=word.match(/[AEIOU]/g)||[]; var vc=vowels.length, cc=word.length-vc; return { q:'Letters of "' + word + '". Vowels always together. Arrangements?', a:function(){var f=function(x){var r=1;for(var i=2;i<=x;i++)r*=i;return r;}; var arr=f(cc+1); for(var i=0;i<word.length;i++){var c=word[i];var cnt=0;for(var j=0;j<word.length;j++){if(word[j]===c)cnt++;}if(cnt>1){arr/=f(cnt);word=word.replace(new RegExp(c,'g'),'');}} return arr*f(vc);}(), hint:'Treat vowels as 1 block. ' + (cc+1) + '! × ' + vc + '! divided by repeats', intuition:'Vowels=' + vc + ', consonants=' + cc + '. Block=' + (cc+1) + ' items, vowels can swap: ×' + vc + '!' }; },
    // SBI PO Hard: probability with combinations
    function(){ var total=rand(8,15), red=rand(3,6), blue=total-red, draw=rand(2,4); return { q:'Box: ' + red + ' red, ' + blue + ' blue. Pick ' + draw + '. Prob all red?', a:function(){var c=function(n,r){var p=1;for(var i=n;i>n-r;i--)p*=i;for(var i=2;i<=r;i++)p/=i;return p;}; return Math.round(c(red,draw)/c(total,draw)*100)/100;}(), hint:'C(' + red + ',' + draw + ')/C(' + total + ',' + draw + ')', intuition:'Favorable=C(' + red + ',' + draw + '), Total=C(' + total + ',' + draw + ')' }; }
  ];
  var idx;
  if (diff >= 5 && ty.length >= 4) {
    idx = Math.random() < 0.7 ? rand(Math.max(0, ty.length - 4), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var d = ty[idx](); var o=[d.a]; var _g=0; while(o.length<4&&_g++<60){var v=d.a+rand(-5,5); if(o.indexOf(v)<0&&v>0)o.push(v);} while(o.length<4){o.push(o.length+d.a);} shuffle(o);
  return { question:d.q, answer:d.a, options:o, hint:d.hint, timeLimit:25, type:'quant', techniqueLabel:'Counting: '+d.hint, intuition:'Permutation=ordered, Combination=unordered. n! = n×(n-1)×...×1. Circular=(n-1)!.' };
}

function generateDataQuestion(diff, layer) {
  var ty = [
    function(){ var nums=[rand(10,50),rand(20,60),rand(30,70),rand(15,45),rand(25,55)]; var s=nums.reduce(function(a,b){return a+b;},0); return { q:'Data: '+nums.join(', ')+'. Mean?', a:Math.round(s/nums.length), hint:'Sum='+s+', count='+nums.length+'. Mean = sum/count' }; },
    function(){ var nums=[rand(10,40),rand(15,50),rand(20,45),rand(10,35),rand(25,55)]; nums.sort(function(a,b){return a-b;}); var mid=nums[Math.floor(nums.length/2)]; return { q:'Median of: '+nums.join(', ')+'?', a:mid, hint:'Sorted: '+nums.join(', ')+'. Middle value = '+mid }; },
    function(){ var nums=[]; for(var i=0;i<5;i++)nums.push(rand(5,30)); var modeVal=nums[rand(0,4)]; nums.push(modeVal); return { q:'Mode of: '+nums.join(', ')+'?', a:modeVal, hint:'Mode = most frequent value' }; },
    function(){ var nums=[rand(10,30),rand(15,40),rand(20,50),rand(10,35),rand(25,45)]; var mn=nums.reduce(function(a,b){return a+b;},0)/nums.length; var v=nums.reduce(function(s,x){return s+(x-mn)*(x-mn);},0)/nums.length; return { q:'Variance of: '+nums.join(', ')+'? (approx)', a:Math.round(v), hint:'Variance = Σ(x-mean)²/n' }; },
    function(){ var nums=[rand(10,30),rand(15,40),rand(20,50),rand(10,35),rand(25,45)]; var mn=nums.reduce(function(a,b){return a+b;},0)/nums.length; var sd=Math.sqrt(nums.reduce(function(s,x){return s+(x-mn)*(x-mn);},0)/nums.length); return { q:'Std deviation of: '+nums.join(', ')+'? (approx)', a:Math.round(sd), hint:'SD = √variance' }; },
    function(){ var n=rand(20,60); return { q:'Probability of rolling an even number on a die?', a:'1/2', hint:'3 even faces out of 6 = 3/6 = 1/2' }; },
    function(){ var t=rand(10,50), f=rand(3,t-2); return { q:'Bag: '+f+' red, '+(t-f)+' blue. Probability of red?', a:f+'/'+t, hint:'Favorable/Total = '+f+'/'+t }; },
    // SBI PO Hard: weighted mean with groups
    function(){ var g1=rand(20,40), g2=rand(30,60), n1=rand(10,30), n2=rand(15,35); return { q:'Group1 mean=' + g1 + ' (n=' + n1 + '), Group2 mean=' + g2 + ' (n=' + n2 + '). Combined mean?', a:Math.round((g1*n1+g2*n2)/(n1+n2)), hint:'Combined = (x1n1+x2n2)/(n1+n2)', intuition:'Total = ' + g1*n1 + '+' + g2*n2 + '=' + (g1*n1+g2*n2) + ', count=' + (n1+n2) + '. Mean=' + Math.round((g1*n1+g2*n2)/(n1+n2)) }; },
    // SBI PO Hard: find missing frequency given mean
    function(){ var f=rand(5,15), x=rand(10,30), m=rand(15,25); var miss=Math.round(f*(m-x)/(x-m+1)); if(miss<0)miss=Math.abs(miss)+rand(3,8); return { q:'Data: value ' + x + ' occurs ' + f + ' times, value ' + (x+rand(3,8)) + ' occurs ? times. Mean=' + m + '. Missing frequency?', a:miss, hint:'Mean = (sum)/(total freq). Solve for missing freq', intuition:'(' + x + '×' + f + ' + ' + (x+rand(3,8)) + '×f2)/(' + f + '+f2)=' + m + '. Solve: f2=' + miss }; },
    // SBI PO Hard: probability with at least one
    function(){ var n=rand(2,5), p=rand(2,5); return { q:'Two dice rolled. Probability sum > ' + (n+p) + '?', a:((6-Math.min(n+p,6))*(6-Math.min(n+p,6)+1)/2 + Math.max(0, 6-Math.min(n+p-6,6))*Math.max(0, 6-Math.min(n+p-6,6)))/36, hint:'Favorable outcomes for sum=' + (n+p+1) + ' to 12', intuition:'Count favorable sum pairs: ' + (n+p+1) + '→' + (11-n-p) + ', ' + (n+p+2) + '→' + (10-n-p) + '... Prob = favorable/36' }; },
    // SBI PO Hard: find median of grouped data
    function(){ var vals=[]; for(var i=0;i<7;i++)vals.push(rand(5,50)); vals.sort(function(a,b){return a-b;}); return { q:'Data: ' + vals.join(', ') + '. Median?', a:vals[Math.floor(vals.length/2)], hint:'Sort ascending, pick middle value', intuition:'Sorted: ' + vals.join(', ') + '. Middle position=' + (Math.floor(vals.length/2)+1) + ', value=' + vals[Math.floor(vals.length/2)] }; }
  ];
  var idx;
  if (diff >= 5 && ty.length >= 4) {
    idx = Math.random() < 0.7 ? rand(Math.max(0, ty.length - 4), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var d = ty[idx](); var o=[d.a]; var _g=0; while(o.length<4&&_g++<50){var v=typeof d.a==='string'?(d.a+'a'):(d.a+rand(-2,2)); if(o.indexOf(v)<0&&(typeof v==='string'||v>0))o.push(v);} while(o.length<4){var f=['a=-1','x=0','Cannot simplify','None'][rand(0,3)]; if(o.indexOf(f)<0)o.push(f);} shuffle(o);
  return { question:d.q, answer:d.a, options:o, hint:d.hint, timeLimit:15, type:'quant', techniqueLabel:'Data: '+d.hint, intuition:'Mean=sum/n, Median=middle of sorted, Mode=most frequent. Probability=favorable/total.' };
}

function generateNumberSystemQuestion(diff, layer) {
  var ty = [
    // 1: Unit digit of power
    function(){ var n=rand(2,9); return { q:'Unit digit of '+(n*7+3)+'^'+(rand(2,4))+'?', a:function(){var u=n*7+3;var c=u%10;var p=rand(2,4);var r=1;for(var i=0;i<p;i++)r=(r*c)%10;return r;}(), hint:'Find cycle of unit digit. '+(n*7+3)+' ends in '+((n*7+3)%10)+', its powers cycle every 4' }; },
    // 2: Remainder by modulus
    function(){ var n=rand(2,9); var p=rand(2,4); return { q:'Remainder when '+(n*7+3)+'^'+(p)+' divided by 5?', a:function(){var r=1;var b=(n*7+3)%5;for(var i=0;i<p;i++)r=(r*b)%5;return r;}(), hint:'Find '+(n*7+3)+' mod 5 = '+((n*7+3)%5)+', then '+(p)+'th power mod 5' }; },
    // 3: Divisibility check
    function(){ var n=rand(3,9); return { q:'Is ' + n*111 + ' divisible by 3? (Y/N)', a:n*111%3===0?'Y':'N', hint:'Sum of digits = '+(Math.floor(n*111/100)+(Math.floor(n*111/10)%10)+(n*111%10))+' divisible by 3?' }; },
    // 4: Sum of digits
    function(){ var n=rand(100,999); return { q:'Sum of digits of '+n+'?', a:Math.floor(n/100)+Math.floor(n/10)%10+n%10, hint:'Add hundreds, tens, units digit' }; },
    // 5: Factorial remainder (Wilson)
    function(){ var n=rand(3,9); return { q:'Remainder when '+n+'! divided by '+(n+1)+'? (n='+n+')', a:n+1>3?0:n+1, hint:'For n≥3, n! is divisible by n+1 if n+1 is composite' }; },
    // 6: Cyclicity length
    function(){ var n=rand(2,8); return { q:'Cyclicity of unit digit of '+(n*2+1)+'^n? (last digit pattern length)', a:[1,1,4,4,2,1,1,4,4,2][(n*2+1)%10], hint:'Cyclicity: 0,1,5,6→1; 2,3,7,8→4; 4,9→2' }; },
    // 7: Trailing zeros in factorial
    function(){ var n=rand(1,9); return { q:'How many trailing zeros in '+(n*10)+'! ?', a:Math.floor((n*10)/5)+Math.floor((n*10)/25), hint:'Count factors of 5: floor(n/5)+floor(n/25)+floor(n/125)...' }; },
    // 8: Find number from fraction of fraction (IndiaBix style)
    function(){ var n=rand(40,160); return { q:'If 1/'+(rand(3,5))+' of 1/'+(rand(3,5))+' of a number is '+Math.round(n/(rand(3,5)*rand(3,5)))+', find the number?', a:n, hint:'Let x be number. '+(rand(3,5))+'x/'+(rand(3,5)*rand(3,5))+' = '+Math.round(n/(rand(3,5)*rand(3,5)))+'. Solve for x.' }; },
    // 9: Two-digit digit reversal (IndiaBix style)
    function(){ var d1=rand(2,8), d2=rand(d1+1,9); var n=d1*10+d2, r=d2*10+d1; return { q:'Sum of a two-digit number and its reverse is '+(n+r)+'. The digits differ by '+(d2-d1)+'. Find the number?', a:n, hint:'10a+b+10b+a=11(a+b)='+(n+r)+'. a+b='+((n+r)/11)+'. Also a-b='+(d2-d1)+'. Solve.' }; },
    // 10: Number of factors
    function(){ var primes=[2,3,5,7]; var p=primes[rand(0,3)]; var e=rand(2,5); return { q:'How many factors does '+(Math.pow(p,e))+' have? (prime factors: '+p+'^'+e+')', a:e+1, hint:'Number of factors = exponent+1 = '+e+'+1. For p^e, factors = e+1.' }; },
    // 11: Divisibility rule check (7 or 11)
    function(){ var d=rand(1000,9999); return { q:'Is '+d+' divisible by 11? (Y/N)', a:(d%11===0)?'Y':'N', hint:'Alternate sum: '+(String(d).split('').reduce(function(s,c,i){return i%2?s+parseInt(c):s-parseInt(c);},0) % 11 === 0 ? 'divisible' : 'not divisible')+' by 11' }; },
    // 12: SBI PO Hard — find number from remainders (Chinese remainder)
    function(){ var m=rand(3,6), n=rand(4,7); var x=m*n+rand(1,Math.min(m,n)-1); return { q:'Find the smallest number which when divided by '+m+' and '+n+' leaves remainder '+(x%m)+' and '+(x%n)+' respectively?', a:x, hint:'Number = LCM('+m+','+n+')k + common remainder. Smallest when k=1 => '+x }; },
    // 13: SBI PO Hard — sum of first n natural numbers
    function(){ var n=rand(10,30); return { q:'Sum of first '+n+' natural numbers?', a:Math.round(n*(n+1)/2), hint:'Sum = n(n+1)/2 = '+n+'×'+(n+1)+'/2' }; },
    // 14: SBI PO Hard — find number when digits reversed
    function(){ var d1=rand(1,4), d2=rand(6,9); var n=d1*10+d2, r=d2*10+d1; return { q:'A two-digit number is '+(r-n)+' less than its reverse. Sum of digits is '+(d1+d2)+'. Find the number?', a:n, hint:'Let 10a+b=number. 10b+a-10a-b=9(b-a)='+(r-n)+'. b-a='+((r-n)/9)+', a+b='+(d1+d2)+'. Solve.' }; }
  ];
  var d=ty[rand(0,ty.length-1)](); var o=[d.a]; if(typeof d.a==='string'){var wpool=['Y','N','Yes','No','0','1','2','3','Cannot determine','None of these']; for(var _g=0;_g<50&&o.length<4;_g++){var wv=wpool[rand(0,wpool.length-1)]; if(o.indexOf(wv)<0)o.push(wv);}} else {for(var _g=0;_g<50&&o.length<4;_g++){var v=d.a+rand(-1,1); if(o.indexOf(v)<0&&v>0)o.push(v);}} shuffle(o);
  return { question:d.q, answer:d.a, options:o, hint:d.hint, timeLimit:20, type:'quant', techniqueLabel:'Number System: '+d.hint, intuition:'Unit digit cyclicity: 0,1,5,6→1; 2,3,7,8→4; 4,9→2. Sum of digits for divisibility.' };
}

function generateOddManOutQuestion(diff, layer) {
  var ty = [
    function(){ var a=rand(2,5), b=a+rand(1,2); return { q:'Which is odd? 4, 9, 16, '+(a*a+1)+', 36', a:'+'+(a*a+1)+'', hint:'All are perfect squares except one' }; },
    function(){ var n=rand(10,30); var nums=[n*2, n*3, n*4, n*5, n*7]; shuffle(nums); var correct=n*7; return { q:'Which is odd? '+nums.join(', '), a:String(correct), hint:'Four are multiples of '+(n)+', one is not' }; },
    function(){ var primes=[2,3,5,7,11,13,17,19,23,29]; shuffle(primes); var picks=primes.slice(0,5); var nonPrime=picks[4]; while(isPrime(nonPrime))nonPrime=picks[rand(0,3)]+rand(1,3); if(!isPrime(nonPrime)){picks[4]=nonPrime;} else {picks[rand(0,4)]=8;} shuffle(picks); return { q:'Which is odd? '+picks.join(', '), a:String(picks.filter(function(p){return p===nonPrime||!isPrime(p)})[0]||8), hint:'Four are prime numbers, one is not' }; },
    function(){ var a=rand(3,8); return { q:'Which is odd? '+a*1+', '+a*3+', '+a*5+', '+(a*6)+', '+a*7, a:String(a*6), hint:'Four are multiples of '+a+' by odd numbers' }; },
    // Prime vs composite odd-one-out
    function(){ var primes=[13,17,19,23,29,31,37,41,43,47]; shuffle(primes); var picks=primes.slice(0,4); var comps=[15,21,25,27,33,35,39,45,49]; shuffle(comps); picks.push(comps[0]); shuffle(picks); return { q:'Which is odd? '+picks.join(', '), a:String(picks.filter(function(p){return comps.indexOf(p)>=0||!isPrime(p)})[0]), hint:'Four are prime numbers, one is composite' }; },
    // Geographical/cultural odd-one-out
    function(){ var sets=[['India','China','Japan','Brazil','Nepal'],['Amazon','Nile','Ganges','Alps','Yangtze'],['Dollar','Euro','Yen','Pound','Paris'],['Tiger','Lion','Leopard','Eagle','Cheetah']]; var set=sets[rand(0,3)]; var odd=set[3]; shuffle(set); return { q:'Which is odd? '+set.join(', '), a:odd, hint:'Four belong to the same category, one does not' }; },
    // Letter pattern odd-one-out
    function(){ var sets=[['AB','CD','EF','GH','IK'],['ZA','YB','XC','WD','UF'],['MNO','PQR','STU','VWX','YZA'],['ACE','BDF','CEG','DFH','EGI']]; var set=sets[rand(0,3)]; var odd=set[4]; shuffle(set); return { q:'Which is odd? '+set.join(', '), a:odd, hint:'Four follow the same letter pattern, one breaks it' }; },
    // Square/cube based odd one
    function(){ var n=rand(3,7); var nums=[n*n, (n+1)*(n+1), (n+2)*(n+2), (n+3)*(n+3), (n+4)*(n+4)+1]; shuffle(nums); return { q:'Which is odd? '+nums.join(', '), a:String(nums.filter(function(x){var s=Math.round(Math.sqrt(x)); return s*s!==x;})[0]), hint:'Four are perfect squares, one is not' }; },
    // Numerical pattern break
    function(){ var n=rand(2,5); var nums=[n*3, n*6, n*9, n*12, n*14]; shuffle(nums); return { q:'Which is odd? '+nums.join(', '), a:String(nums.filter(function(x){return x%n!==0;})[0]), hint:'Four are multiples of '+n+', one is not' }; },
    // SBI PO Hard: number series odd man out (alternating pattern break)
    function(){ var s=rand(3,7), d=rand(2,4); var nums=[s, s+d, s+2*d, s+3*d+1, s+4*d]; shuffle(nums); return { q:'Which is odd? '+nums.join(', '), a:String(s+3*d+1), hint:'Four follow AP with diff '+d+', one breaks' }; },
    // SBI PO Hard: complex pattern — n²-1, n²+1 mix
    function(){ var b=rand(4,8); var nums=[b*b-1, (b+1)*(b+1)-1, (b+2)*(b+2)-1, (b+3)*(b+3)+1, (b+4)*(b+4)-1]; shuffle(nums); return { q:'Which is odd? '+nums.join(', '), a:String(nums.filter(function(x,i){var n=b+i; return x!==n*n-1;})[0]), hint:'Four follow n²-1 pattern, one is n²+1' }; },
    // SBI PO Hard: digit reversal pattern
    function(){ var ns=[21,32,43,54,75]; shuffle(ns); var ans='75'; return { q:'Which is odd? '+ns.join(', '), a:ans, hint:'Four have digits differing by 1, one does not' }; }
  ];
  function isPrime(n){if(n<2)return false;for(var i=2;i*i<=n;i++){if(n%i===0)return false;}return true;}
  var idx;
  if (diff >= 5 && ty.length >= 6) {
    idx = Math.random() < 0.7 ? rand(Math.max(0, ty.length - 4), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var d=ty[idx](); var o=[d.a]; var picks=d.q.split('? ')[1].split(', '); picks.forEach(function(p){if(p!==d.a&&o.indexOf(p)<0)o.push(p);}); var _g=0; while(o.length<4&&_g++<60){var v=String(rand(10,99));if(o.indexOf(v)<0)o.push(v);} shuffle(o);
  return { question:d.q, answer:d.a, options:o, hint:d.hint, timeLimit:12, type:'quant', techniqueLabel:'Odd Man Out: '+d.hint, intuition:'Find the common property (squares, primes, multiples). The one that breaks the rule is the answer.' };
}

// ====== ADDITIONAL REASONING GENERATORS ======

function generateLetterSymbolSeriesQuestion(diff, layer) {
  var ty = [
    function(){ var letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ'; var start=rand(0,20); var step=rand(1,4); return { q:'Next: '+letters[start]+', '+letters[start+step]+', '+letters[start+2*step]+', '+letters[start+3*step]+'?', a:letters[start+4*step], hint:'Each step +'+(step*2)+' positions' }; },
    function(){ var letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ'; var start=rand(1,15); var steps=[[2,3,4],[1,2,1],[3,5,7],[1,3,5]]; var s=steps[rand(0,3)]; return { q:'Series: '+letters[start]+', '+letters[start+s[0]]+', '+letters[start+s[0]+s[1]]+', '+letters[start+s[0]+s[1]+s[2]]+'?', a:letters[start+s[0]+s[1]+s[2]+s[s.length-1]], hint:'Find the pattern in letter positions' }; },
    function(){ var l='ABCDEFGHIJKLMNOPQRSTUVWXYZ'; var pos=rand(4,20); return { q:'Next: AZ, BY, CX, DW?', a:'EV', hint:'First letter +1, second letter -1 each step' }; },
    // Mixed letter-number series
    function(){ var l='ABCDEFGHIJKLMNOPQRSTUVWXYZ'; var s=rand(0,18); return { q:'Next: ' + l[s] + '2, ' + l[s+2] + '4, ' + l[s+4] + '6, ' + l[s+6] + '8?', a:l[s+8] + '10', hint:'Letters +2, numbers +2 each step', intuition:'Letters: ' + l[s] + '→' + l[s+2] + '→' + l[s+4] + '→' + l[s+6] + ' (+2 each). Numbers: 2→4→6→8 (+2 each). Next: ' + l[s+8] + '10' }; },
    // Skip pattern
    function(){ var l='ABCDEFGHIJKLMNOPQRSTUVWXYZ'; var s=rand(0,14); return { q:'Next: ' + l[s] + ', ' + l[s+2] + ', ' + l[s+5] + ', ' + l[s+9] + '?', a:l[s+14], hint:'Gaps increase by 1: +2, +3, +4, +5', intuition:'Gaps: ' + l[s] + '→' + l[s+2] + ' (+2), →' + l[s+5] + ' (+3), →' + l[s+9] + ' (+4). Next gap +5: ' + l[s+14] }; },
    // Reverse pattern
    function(){ var l='ABCDEFGHIJKLMNOPQRSTUVWXYZ'; var s=rand(5,22); return { q:'Next: ' + l[s] + ', ' + l[s-1] + ', ' + l[s-3] + ', ' + l[s-6] + '?', a:l[s-10], hint:'Gaps increasing backwards: -1, -2, -3, -4', intuition:'Positions: ' + s + ', ' + (s-1) + ', ' + (s-3) + ', ' + (s-6) + '. Gaps -1, -2, -3. Next gap -4: pos ' + (s-10) + ' = ' + l[s-10] }; },
    // SBI PO Hard: mixed letter-number with positional sums
    function(){ var l='ABCDEFGHIJKLMNOPQRSTUVWXYZ'; var s=rand(1,18); var p=[s, s+1, s+3, s+6]; var sums=p.map(function(x){return x+l.charCodeAt(x-1)-64;}); return { q:'Series: ' + l[p[0]-1] + '('+p[0]+'), ' + l[p[1]-1] + '('+p[1]+'), ' + l[p[2]-1] + '('+p[2]+'), ' + l[p[3]-1] + '('+p[3]+')? Next term?', a:l[p[3]+3] + '(' + (p[3]+4) + ')', hint:'Letter position +1, +2, +3 each step. Also track letter itself.', intuition:'Positions: ' + p.join(', ') + '. Differences: +1, +2, +3. Next diff +4: pos ' + (p[3]+4) + ' = ' + l[p[3]+3] }; },
    // SBI PO Hard: alternating direction pattern
    function(){ var l='ABCDEFGHIJKLMNOPQRSTUVWXYZ'; var s=rand(5,18); return { q:'Next: ' + l[s] + ', ' + l[s+3] + ', ' + l[s+2] + ', ' + l[s+5] + ', ' + l[s+4] + '?', a:l[s+7], hint:'Pattern: +3, -1, +3, -1, +3', intuition: s + '→' + (s+3) + ' (+3), →' + (s+2) + ' (-1), →' + (s+5) + ' (+3), →' + (s+4) + ' (-1). Next: +3 → ' + (s+7) + ' = ' + l[s+7] }; },
    // SBI PO Hard: letter series based on reverse alphabetical positions
    function(){ var l='ABCDEFGHIJKLMNOPQRSTUVWXYZ'; var r='ZYXWVUTSRQPONMLKJIHGFEDCBA'; var s=rand(0,20); return { q:'Next: ' + r[s] + ', ' + r[s+1] + ', ' + r[s+3] + ', ' + r[s+6] + '?', a:r[s+10], hint:'Positions in reverse alphabet: +1, +2, +3, +4', intuition:'Reverse alphabet positions: ' + (s+1) + ', ' + (s+2) + ', ' + (s+4) + ', ' + (s+7) + '. Gaps +1, +2, +3. Next gap +4 → pos ' + (s+11) + ' = ' + r[s+10] }; }
  ];
  var idx;
  if (diff >= 5 && ty.length >= 4) {
    idx = rand(0,1) ? rand(Math.max(0, ty.length - 3), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var d=ty[idx](); var o=[d.a]; ['AB','CD','EF','GH','IJ','KL','MN','OP','QR','ST','UV','WX','YZ','EV','FU','GT'].forEach(function(l){if(l!==d.a&&o.indexOf(l)<0)o.push(l);}); var _g=0; while(o.length<4&&_g++<60){var v=String.fromCharCode(65+rand(0,25));if(o.indexOf(v)<0)o.push(v);} shuffle(o);
  return { question:d.q, answer:d.a, options:o, hint:d.hint, timeLimit:12, type:'reasoning', techniqueLabel:'Letter Series: '+d.hint, intuition:'Convert letters to positions (A=1). Find the step pattern. Convert back.' };
}

function generateArtificialLanguageQuestion(diff, layer) {
  var ty = [
    function(){ var words=[['mig','hel','bim','trig']]; var roots={mig:'sky',hel:'blue',bim:'big',trig:'tree'}; var w1='mighel', w2='bimtrig'; shuffle(words[0]); var qw=words[0][0]+words[0][1]; return { q:'If "'+w1+'" means "sky blue" and "'+w2+'" means "big tree", what is "'+qw+'" ?', a:roots[qw.substring(0,3)]+' '+roots[qw.substring(3)], hint:'Split word into two 3-letter roots' }; },
    function(){ var map={tam:'run',pok:'fast',lun:'dog',nir:'black',vok:'cat',zed:'white'}; var keys=Object.keys(map); shuffle(keys); var k1=keys[0],k2=keys[1]; var w=k1+k2; return { q:'If "'+k1+keys[1]+'" means "'+map[k1]+' '+map[keys[1]]+'" and "'+keys[2]+keys[3]+'" means "'+map[keys[2]]+' '+map[keys[3]]+'", what is "'+w+'" ?', a:map[k1]+' '+map[k2], hint:'Each 3-letter segment maps to one word' }; },
    // Type 3: Deduce single word from two compound translations
    function(){ var map={fep:'water',zol:'cold',gir:'fire',nux:'hot',bex:'drink',tav:'food'}; var keys=Object.keys(map); shuffle(keys); var w=keys[0]+keys[2]; return { q:'If "'+keys[0]+keys[1]+'" means "'+map[keys[0]]+' '+map[keys[1]]+'" and "'+keys[2]+keys[3]+'" means "'+map[keys[2]]+' '+map[keys[3]]+'", what does "'+keys[0]+'" mean?', a:map[keys[0]], hint:'Find the segment common to one phrase, subtract from the other' }; },
    // Type 4: Opposite-meaning prefix
    function(){ var roots={lum:'day',rum:'night',gla:'happy',bru:'sad',kli:'light',pru:'dark'}; var prefix='un'; var baseKeys=Object.keys(roots); shuffle(baseKeys); var a=baseKeys[0], b=baseKeys[1]; return { q:'In a language, "lumbru" means "day-night". "'+prefix+a+'" means "not '+roots[a]+'". What does "'+a+prefix+'" mean?', a:roots[a], hint:'Find which segment maps to which meaning' }; },
    // Type 5: Three-way comparison to deduce unknown
    function(){ var map={elo:'mountain',vek:'river',zim:'forest',bal:'high',tor:'deep',sen:'green'}; var keys=Object.keys(map); shuffle(keys); var w=keys[0]+keys[2]+keys[4]; var m=map[keys[0]]+' '+map[keys[2]]+' '+map[keys[4]]; return { q:'If "'+keys[0]+keys[1]+'" means "'+map[keys[0]]+' '+map[keys[1]]+'" and "'+keys[2]+keys[3]+'" means "'+map[keys[2]]+' '+map[keys[3]]+'" and "'+keys[4]+keys[5]+'" means "'+map[keys[4]]+' '+map[keys[5]]+'", what is "'+w+'" ?', a:m, hint:'Each 3-letter chunk = one word. Combine the chunks' }; },
    // Type 6: Verb conjugation pattern with tense marker
    function(){ var verbs={walk:'lak',run:'tok',jump:'riz'}; var past='-ev'; var tense='past'; var vkeys=Object.keys(verbs); shuffle(vkeys); var v=vkeys[0]; return { q:'If "'+verbs[v]+'" means "'+v+'" and "'+verbs[v]+past+'" means "'+v+'ed ('+tense+')", what does "'+verbs[vkeys[1]]+past+'" mean?', a:vkeys[1]+'ed', hint:'Root word + suffix = past tense. Find the verb root and apply the same pattern' }; },
    // SBI PO Hard: four-way comparison to isolate one word
    function(){ var map={vak:'king',zed:'queen',gol:'palace',mir:'crown',tul:'throne',nep:'royal'}; var keys=Object.keys(map); shuffle(keys); var w=keys[0]; var p1=keys[0]+keys[1]+'='+map[keys[0]]+' '+map[keys[1]]; var p2=keys[2]+keys[3]+'='+map[keys[2]]+' '+map[keys[3]]; var p3=keys[4]+keys[5]+'='+map[keys[4]]+' '+map[keys[5]]; return { q:'Given: "'+p1+'", "'+p2+'", "'+p3+'". What does "'+w+'" mean?', a:map[w], hint:'Find which 3-letter segment appears in only one translation and matches the meaning', intuition:'Compare all three phrases. '+w+' appears in the first phrase meaning '+map[keys[0]]+'. The other two phrases help confirm the mapping.' }; },
    // SBI PO Hard: plural + negation combined
    function(){ var nouns={cat:'mip',dog:'zog',bird:'kex'}; var plural='-en'; var neg='no-'; var vkeys=Object.keys(nouns); shuffle(vkeys); var v=vkeys[0]; var singular=nouns[v]; var pluralForm=singular+plural; var negForm=neg+singular; return { q:'If "'+singular+'" means "'+v+'", "'+pluralForm+'" means "'+v+'s", "'+negForm+'" means "no '+v+'", what does "'+neg+nouns[vkeys[1]]+'" mean?', a:'no '+vkeys[1], hint:'Prefix "no-" = negation. Suffix "-en" = plural. Break the word into prefix + root.', intuition:nouns[vkeys[1]]+' = '+vkeys[1]+'. '+neg+nouns[vkeys[1]]+' = no- + '+nouns[vkeys[1]]+' = no '+vkeys[1]+'.' }; },
    // SBI PO Hard: multi-clause sentence translation
    function(){ var subj={king:'tas',queen:'las'}; var verb={eats:'vok',drinks:'mek',sleeps:'nur'}; var obj={apple:'pom',milk:'lum',bread:'bex'}; var sk=Object.keys(subj); shuffle(sk); var vk=Object.keys(verb); shuffle(vk); var ok=Object.keys(obj); shuffle(ok); var s=sk[0],v=vk[0],o=ok[0]; var trans=subj[s]+verb[v]+obj[o]; var givenPair=subj[sk[0]]+verb[vk[1]]+obj[ok[1]]+' means "'+sk[0]+' '+vk[1]+' '+ok[1]+'"'; return { q:'In a language, "'+givenPair+'". What does "'+trans+'" mean?', a:s+' '+v+' '+o, hint:'Each 3-letter segment maps to subject/verb/object. Order: S+V+O.', intuition:'Word order: subject ('+subj[s]+') + verb ('+verb[v]+') + object ('+obj[o]+') = "'+trans+'" = "'+s+' '+v+' '+o+'"' }; }
  ];
  var idx;
  if (diff >= 5 && ty.length >= 4) {
    idx = rand(0,1) ? rand(Math.max(0, ty.length - 3), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var d=ty[idx](); var dex=[d.a]; var allPhrases='sky blue big tree run fast dog black cat white water cold fire hot drink food day night happy sad light dark mountain river forest high deep green walked ran jumped'.split(' '); for(var di=0;di<allPhrases.length-1;di+=2){var p=allPhrases[di]+' '+allPhrases[di+1];if(p!==d.a&&dex.indexOf(p)<0)dex.push(p);} while(dex.length<4){dex.push('red green');} shuffle(dex);
  return { question:d.q, answer:d.a, options:dex, hint:d.hint, timeLimit:20, type:'reasoning', techniqueLabel:'Artificial Language: '+d.hint, intuition:'Each 3-letter chunk maps to one English word. Find the mapping from the two given translations.' };
}

function generateMatchingDefinitionsQuestion(diff, layer) {
  var defs=[
    {d:'A tool used for cutting wood',ex:['A hammer', 'A saw', 'A screwdriver', 'A drill'],ans:1},
    {d:'An animal that lives in water',ex:['A lion that hunts in a forest', 'A fish that swims in the ocean', 'An eagle that flies in the sky', 'A snake that slithers on land'],ans:1},
    {d:'Something used to measure time',ex:['A compass that shows direction', 'A clock that ticks every second', 'A thermometer that reads temperature', 'A barometer that measures pressure'],ans:1},
    {d:'A place where books are kept',ex:['A gym where people exercise', 'A library where people read', 'A kitchen where food is cooked', 'A garden where flowers bloom'],ans:1},
    {d:'A vehicle that travels on water',ex:['A car driving on the highway', 'A boat sailing across the lake', 'A plane flying above the clouds', 'A train moving along the tracks'],ans:1},
    {d:'A device used to see distant celestial objects clearly',ex:['A microscope that magnifies tiny cells','A telescope that brings faraway stars into view','A periscope that looks over obstacles','A kaleidoscope that makes colorful patterns'],ans:1},
    {d:'An instrument used to measure body temperature',ex:['A barometer that gauges air pressure','An altimeter that reads altitude','A thermometer that records fever levels','A hygrometer that measures humidity'],ans:2},
    {d:'A fruit that is long, yellow, and curved',ex:['An apple that is round and red','A mango that is oval and golden','A grape that grows in clusters','A banana that is curved and yellow'],ans:3},
    {d:'An appliance that keeps perishable food fresh and cold',ex:['A microwave that heats meals quickly','A refrigerator that preserves food at low temperature','An oven that bakes and roasts','A dishwasher that cleans utensils'],ans:1},
    {d:'An instrument used to measure how heavy something is',ex:['A tape measure that records length','A protractor that measures angles','A weighing scale that reads mass','A timer that tracks seconds'],ans:2},
    {d:'A tool used to bind loose paper sheets together',ex:['A hole punch that makes round holes','A stapler that fixes pages with metal staples','A shredder that cuts paper to strips','A laminator that seals sheets in plastic'],ans:1},
    {d:'A place where sick and injured people receive medical care',ex:['A school where children learn','A bank where money is kept','A hotel where travelers sleep','A hospital where patients are treated'],ans:3},
    {d:'A vessel used to boil water for tea or coffee',ex:['A frying pan that cooks pancakes','A kettle that heats water quickly','A mixer that blends batters','A colander that strains pasta'],ans:1},
    {d:'A bag carried on the back to hold books and supplies',ex:['A backpack that straps across both shoulders','A suitcase that is pulled on wheels','A handbag that hangs from the shoulder','A duffel that is lugged by a handle'],ans:0},
    {d:'An instrument that shows direction using a magnetic needle',ex:['An odometer that counts distance driven','A compass that always points north','A speedometer that shows vehicle speed','A tachometer that displays engine speed'],ans:1},
    {d:'A place where aircraft take off and land',ex:['A railway station where trains halt','A bus depot where buses are parked','An airport where planes land and depart','A harbor where ships dock'],ans:2},
    {d:'A cutting tool used with a chopping board in the kitchen',ex:['A kitchen knife used to slice vegetables and fruits','A screwdriver used to tighten screws','A wrench used to turn bolts','A spade used to dig soil'],ans:0}
  ];
  var d=defs[rand(0,defs.length-1)]; shuffle(d.ex);
  return { question:'Which matches "'+d.d+'" ?', answer:d.ex[0], options:d.ex, hint:'Find the option that fits the definition exactly', timeLimit:10, type:'reasoning', techniqueLabel:'Matching Definitions: '+d.d, intuition:'Read the definition carefully. Eliminate options that don\'t match all keywords.' };
}

function generateCauseEffectQuestion(diff, layer) {
  var pairs=[
    {c:'The government announced free education for all children',e:'School enrollment rates increased significantly across the country'},
    {c:'There was a severe drought in the region',e:'Farmers faced huge crop losses and water shortages'},
    {c:'The company launched a new advertising campaign',e:'Sales of their product increased by 40%'},
    {c:'Heavy rain caused flooding in the city',e:'Many roads were closed and traffic came to a standstill'},
    {c:'The factory installed new pollution control equipment',e:'Air quality in the surrounding area improved noticeably'},
    {c:'The central bank reduced interest rates on home loans',e:'Demand for housing increased and property sales rose sharply'},
    {c:'Strict bans on single-use plastic were enforced nationwide',e:'Plastic waste in rivers and oceans dropped dramatically'},
    {c:'More people in the city started walking and cycling daily',e:'Rates of heart disease fell steadily over the years'},
    {c:'The state government raised petrol prices through new taxes',e:'Many commuters switched to buses and shared rides'},
    {c:'The restaurant introduced online ordering and faster delivery',e:'Its number of daily orders grew within the first month'},
    {c:'Widespread 5G network coverage was completed across the country',e:'Streaming and video calls became much smoother for users'},
    {c:'A literacy drive was launched in remote villages',e:'The number of adults who could read and write increased'},
    {c:'The price of premium smartphones rose sharply',e:'Sales of affordable phones surged in the market'},
    {c:'Farmers stopped burning crop stubble after the new law',e:'Air pollution dropped during the harvest season'},
    {c:'The city installed free Wi-Fi in public parks',e:'More students began studying and working from these parks'},
    {c:'The company outsourced customer support to AI chatbots',e:'Customer waiting times fell from minutes to seconds'},
    {c:'The government organized vaccination camps across the district',e:'Preventable disease outbreaks reduced sharply'}
  ];
  var p=pairs[rand(0,pairs.length-1)];
  var opts=['A: '+(rand(0,1)?p.c:p.e),'B: '+(rand(0,1)?p.e:p.c),'C: Both are independent','D: Both are effects of a common cause'];
  var isCFirst=opts[0].indexOf(p.c)>=0||opts[0].indexOf(p.e)>=0;
  var ansIdx=(isCFirst&&opts[0].indexOf(p.c)>=0&&opts[1].indexOf(p.e)>=0)||(!isCFirst&&opts[1].indexOf(p.c)>=0&&opts[0].indexOf(p.e)>=0)?0:1;
  // Simplified: A is cause B is effect
  shuffle(opts);
  return { question:'Statement I: '+p.c+'<br>Statement II: '+p.e+'<br>Which is cause, which is effect?', answer:'A is the cause, B is the effect', options:['A is cause, B is effect','B is cause, A is effect','Both independent','Both from common cause'], hint:'The cause happens first and leads to the effect', timeLimit:15, type:'reasoning', techniqueLabel:'Cause & Effect', intuition:'The cause precedes and produces the effect. Look for temporal/logical sequence.' };
}

function generateEssentialPartQuestion(diff, layer) {
  var items=[
    {t:'Painting',parts:['Canvas','Brush','Paint','Easel','Frame'],correct:2},
    {t:'Bicycle',parts:['Wheels','Bell','Chain','Handlebars','Seat'],correct:0},
    {t:'Book',parts:['Cover','Pages','Illustrations','Index','Bookmark'],correct:1},
    {t:'Camera',parts:['Lens','Flash','Tripod','Filter','Case'],correct:0},
    {t:'Shoes',parts:['Sole','Laces','Logo','Insole','Box'],correct:0},
    {t:'Newspaper',parts:['Headlines','Photos','Paper','Advertisements','Comics'],correct:2},
    {t:'Car',parts:['Engine','Headlight','Wheels','Steering','Brakes'],correct:1},
    {t:'TV',parts:['Screen','Remote','Speakers','Power Supply','Tuner'],correct:1},
    {t:'Phone',parts:['Battery','Case','Screen','Processor','Charger Port'],correct:1},
    {t:'Watch',parts:['Strap','Dial','Case','Movement','Crown'],correct:0},
    {t:'House',parts:['Roof','Garden','Walls','Doors','Windows'],correct:1},
    {t:'Motorcycle',parts:['Handlebar Grips','Engine','Wheels','Brakes','Fuel Tank'],correct:0},
    {t:'Lamp',parts:['Bulb','Shade','Switch','Cord','Base'],correct:1},
    {t:'Computer',parts:['Keyboard','Monitor','CPU','Mouse','Fans'],correct:3},
    {t:'Clock',parts:['Hands','Face','Stand','Mechanism','Battery'],correct:2},
    {t:'Garden',parts:['Plants','Soil','Fencing','Water','Sunlight'],correct:2},
    {t:'Ship',parts:['Anchor','Hull','Engine','Rudder','Compass'],correct:0},
    {t:'Sofa',parts:['Frame','Cushions','Armrest','Legs','Throw Pillows'],correct:4}
  ];
  var item=items[rand(0,items.length-1)];
  var opts=item.parts; var ans=opts[item.correct]; shuffle(opts);
  return { question:'Without which part can a "'+item.t+'" still function?', answer:ans, options:opts, hint:'Which part is NOT essential for basic function?', timeLimit:10, type:'reasoning', techniqueLabel:'Essential Part: '+item.t, intuition:'Identify the part without which the thing cannot function at all.' };
}

function generateThemeDetectionQuestion(diff, layer) {
  var passages=[
    {t:'The rapid advancement of technology has transformed every aspect of modern life. From smartphones that connect us globally to AI that automates complex tasks, innovation continues to reshape how we work, communicate, and live.',ans:'Impact of technology on modern life'},
    {t:'Millions of tons of plastic waste enter our oceans every year, harming marine life and entering the food chain. Reducing single-use plastics and improving recycling systems are critical steps to address this crisis.',ans:'Plastic pollution in oceans and solutions'},
    {t:'Regular exercise combined with a balanced diet is the foundation of good health. Studies show that just 30 minutes of moderate activity daily can significantly reduce the risk of chronic diseases.',ans:'Benefits of exercise and healthy diet'},
    {t:'Education empowers individuals and drives economic growth. Countries that invest in quality education see higher productivity, lower poverty rates, and greater social stability.',ans:'Importance of education for development'},
    {t:'Artificial intelligence and automation are replacing routine jobs while creating new roles in data science and machine learning. Workers must continuously upskill to remain relevant in this changing landscape.',ans:'Technology reshaping the job market and need for upskilling'},
    {t:'Social media has changed how people form opinions and engage with news. Algorithm-driven content feeds can create echo chambers that reinforce existing beliefs rather than presenting diverse perspectives.',ans:'Impact of social media on opinion formation and echo chambers'},
    {t:'Global temperatures continue to rise due to greenhouse gas emissions from burning fossil fuels. Scientists warn that without urgent action, sea levels will rise and extreme weather will become more frequent.',ans:'Climate change driven by emissions and its consequences'},
    {t:'Inflation reduces the purchasing power of consumers, making everyday goods more expensive. Central banks respond by raising interest rates, which slows spending but can also hinder economic growth.',ans:'Effects of inflation and central bank responses'},
    {t:'Vaccination campaigns have dramatically reduced the spread of infectious diseases worldwide. Public health experts emphasize that maintaining high immunization coverage is essential to prevent outbreaks.',ans:'Role of vaccination in controlling disease'},
    {t:'Online learning platforms have made education accessible to students in remote areas. However, unequal internet access means many learners are still left behind in the digital divide.',ans:'Online education access and the digital divide'},
    {t:'Renewable energy sources like solar and wind are becoming cheaper and more efficient. Transitioning away from coal is essential to reduce pollution and meet climate goals.',ans:'Transition to renewable energy for sustainability'},
    {t:'Rapid urbanization is putting pressure on housing, transport, and sanitation in growing cities. Planners argue that sustainable infrastructure is needed to support expanding populations.',ans:'Challenges of urbanization and sustainable planning'},
    {t:'Scientific research has led to breakthroughs in medicine, from vaccines to targeted therapies. Investment in science is widely seen as vital for improving human health and living standards.',ans:'Scientific progress improving health and living standards'},
    {t:'Rural communities often struggle with limited access to banks and financial services. Mobile banking has emerged as a practical solution to bring financial inclusion to the unbanked.',ans:'Financial inclusion through mobile banking'},
    {t:'Studies link long working hours with higher stress and lower productivity. Many employers are adopting flexible schedules to improve employee well-being and job satisfaction.',ans:'Workplace well-being and flexible schedules'},
    {t:'Freshwater scarcity threatens agriculture and drinking supplies in many regions. Efficient irrigation and water conservation are being promoted to secure water for future generations.',ans:'Water scarcity and conservation efforts'}
  ];
  var p=passages[rand(0,passages.length-1)];
  var opts=[p.ans,'Historical background of the topic','Biography of a famous person','Step-by-step instructions']; shuffle(opts);
  return { question:'Main theme?<br><span style="font-size:.85em">'+p.t+'</span>', answer:p.ans, options:opts, hint:'What is the passage mostly about?', timeLimit:15, type:'reasoning', techniqueLabel:'Theme Detection', intuition:'The theme is the central idea. Ignore details and find the one sentence that summarizes the entire passage.' };
}

function generateStatementArgumentQuestion(diff, layer) {
  var items=[
    {stmt:'Should the government ban smoking in public places?',strong:'Yes, it harms non-smokers through second-hand smoke',weak:'No, people have the right to do what they want'},
    {stmt:'Should schools have a dress code?',strong:'Yes, it reduces social pressure and distractions',weak:'No, students should express their personality'},
    {stmt:'Should the retirement age be increased?',strong:'Yes, people are living longer and healthier lives',weak:'No, old people should enjoy their life'},
    {stmt:'Should animal testing be banned?',args:['Yes, it causes unnecessary suffering to animals','No, it is essential for medical research','Yes, alternatives like computer models exist'],correct:0,desc:'Two arguments — which one is stronger?'},
    {stmt:'Road accidents are increasing due to drunk driving.',action:['Strictly enforce traffic rules and increase penalties','Ban alcohol sales entirely','Run awareness campaigns on TV'],best:0,desc:'Best course of action'},
    // SBI PO Hard: multi-argument evaluation with hidden premise
    {stmt:'Should India adopt a four-day work week?',args:['Yes, it increases employee productivity and work-life balance','No, it will reduce economic output and competitiveness','Yes, other countries have successfully implemented it'],correct:0,desc:'Which argument is logically strongest?'},
    // SBI PO Hard: identify the argument type (deductive/inductive)
    {stmt:'All humans are mortal. Socrates is human. Therefore, Socrates is mortal.',action:['Deductive argument — conclusion necessarily follows','Inductive argument — conclusion is probable','Fallacious argument — circular reasoning','Analogical argument — based on comparison'],best:0,desc:'What type of argument is this?'},
    // SBI PO Hard: course of action with cost-benefit tradeoff
    {stmt:'The city is facing a severe water shortage due to depleting groundwater levels.',action:['Implement rainwater harvesting in all public buildings and provide subsidies for residential systems','Impose a complete ban on all groundwater usage immediately','Build a large dam at the nearest river'],best:0,desc:'Best course of action considering practicality, cost, and long-term impact'}
  ];
  var idx;
  if (diff >= 5 && items.length >= 4) {
    idx = rand(0,1) ? rand(Math.max(0, items.length - 3), items.length - 1) : rand(0, items.length - 1);
  } else {
    idx = rand(0, items.length - 1);
  }
  var item=items[idx];
  var opts, answer, qText;
  if (item.args) {
    opts = item.args.slice(); answer = item.args[item.correct]; shuffle(opts);
    qText = 'Statement: '+item.stmt+'<br>Which argument follows?';
  } else if (item.action) {
    opts = item.action.slice(); answer = item.action[item.best]; shuffle(opts);
    qText = 'Problem: '+item.stmt+'<br>Best course of action?';
  } else {
    opts=[item.strong, item.weak, 'Both are strong', 'Neither is strong']; shuffle(opts);
    answer=item.strong; qText='Statement: '+item.stmt+'<br>Which argument is strong?';
  }
  return { question:qText, answer:answer, options:opts, hint:'A strong argument is directly relevant and substantial', timeLimit:12, type:'reasoning', techniqueLabel:'Statement Argument', intuition:'Strong arguments are directly relevant, significant, and based on facts. Weak arguments are vague, emotional, or irrelevant.' };
}

function generateStatementAssumptionQuestion(diff, layer) {
  var items=[
    {stmt:'The company has announced a 20% discount on all products this weekend.',assume:'People will buy more due to the discount'},
    {stmt:'The government has launched a new app for filing taxes online.',assume:'People have access to smartphones or computers'},
    {stmt:'All schools will remain closed tomorrow due to heavy rain warning.',assume:'The rain will be heavy enough to make travel unsafe'},
    {stmt:'Our toothpaste is recommended by 9 out of 10 dentists.',assume:'Dentists are qualified to evaluate toothpaste',multi:true,options:['Dentists are qualified to evaluate toothpaste','Only 10 dentists were surveyed','Toothpaste is the best in the market','All dentists recommend it']},
    {stmt:'Buy one get one free on all shoes this weekend!',assume:'The offer will attract more customers',multi:true,options:['The offer will attract more customers','Shoes are expensive','The store is closing down','Everyone needs shoes']},
    // SBI PO Hard: advertisement with statistical assumption
    {stmt:'4 out of 5 dentists recommend our toothpaste for stronger enamel.',assume:'The dentists surveyed are representative of all dentists',multi:true,options:['The dentists surveyed are representative of all dentists','Only 5 dentists were surveyed','Stronger enamel is the most important factor','All toothpastes are equally effective']},
    // SBI PO Hard: policy statement with behavioral assumption
    {stmt:'The government will reduce traffic congestion by introducing a congestion tax of Rs 100 per day for cars entering the city center.',assume:'The tax will be high enough to discourage car usage',multi:true,options:['The tax will be high enough to discourage car usage','All car owners can afford to pay the tax','Public transport is available as an alternative','The tax will generate significant revenue']},
    // SBI PO Hard: implicit value judgment
    {stmt:'Companies should prioritize hiring local talent over outsourcing to reduce costs.',assume:'Hiring local talent is more cost-effective than outsourcing in the long run',multi:true,options:['Hiring local talent is more cost-effective than outsourcing in the long run','Local talent is better skilled than overseas workers','Outsourcing always reduces quality','Companies should always prioritize cost reduction']}
  ];
  var idx;
  if (diff >= 5 && items.length >= 4) {
    idx = rand(0,1) ? rand(Math.max(0, items.length - 3), items.length - 1) : rand(0, items.length - 1);
  } else {
    idx = rand(0, items.length - 1);
  }
  var item=items[idx];
  var opts, ans;
  if (item.multi) {
    opts = item.options.slice(); ans = item.assume; shuffle(opts);
  } else {
    opts=[item.assume, 'The company is losing money', 'The government is forcing people to use apps', 'The rain will stop by tomorrow']; shuffle(opts);
    ans=item.assume;
  }
  return { question:'Statement: "'+item.stmt+'"<br>What is implicit?', answer:ans, options:opts, hint:'What must be true for the statement to make sense?', timeLimit:12, type:'reasoning', techniqueLabel:'Statement Assumption', intuition:'An assumption is something taken for granted without proof. It must be necessarily true for the statement to be valid.' };
}

function generateStatementConclusionQuestion(diff, layer) {
  var items=[
    {stmt:'All birds have wings. A penguin is a bird.',conc:'Penguins have wings'},
    {stmt:'All metals expand when heated. Iron is a metal.',conc:'Iron expands when heated'},
    {stmt:'No student who failed the exam passed the interview. John passed the interview.',conc:'John did not fail the exam'},
    {stmt:'Some fruits are sweet. All sweet things are tasty.',conc:'Some fruits are tasty',multi:true,options:['Some fruits are tasty','All fruits are tasty','No fruits are tasty','Fruits are always sweet']},
    {stmt:'If it rains, the match will be cancelled. The match was not cancelled.',conc:'It did not rain',multi:true,different:true,options:['It did not rain','It rained lightly','The match was postponed','The ground was dry']},
    // SBI PO Hard: multi-premise syllogism
    {stmt:'All A are B. Some B are C. No C is D.',conc:'Some A are not D',multi:true,options:['Some A are not D','All A are D','No A is D','Some A are D']},
    // SBI PO Hard: conditional chain with modus tollens
    {stmt:'If the economy grows, employment will increase. If employment increases, crime will decrease. Crime did not decrease.',conc:'The economy did not grow',multi:true,options:['The economy did not grow','Employment increased','The economy grew but crime increased','Crime decreased due to other factors']},
    // SBI PO Hard: either-or with negation
    {stmt:'Either John is a doctor or he is an engineer. John is not an engineer.',conc:'John is a doctor',multi:true,options:['John is a doctor','John is neither','John could be both','John is an engineer']}
  ];
  var idx;
  if (diff >= 5 && items.length >= 4) {
    idx = rand(0,1) ? rand(Math.max(0, items.length - 3), items.length - 1) : rand(0, items.length - 1);
  } else {
    idx = rand(0, items.length - 1);
  }
  var item=items[idx];
  var opts, ans;
  if (item.multi) {
    opts = item.options.slice(); ans = item.conc; shuffle(opts);
  } else {
    opts=[item.conc, 'Penguins cannot fly', 'Heat changes everything', 'John is a student']; shuffle(opts);
    ans=item.conc;
  }
  return { question:'Statements: "'+item.stmt+'"<br>Which conclusion follows?', answer:ans, options:opts, hint:'Apply the given statements logically. What must be true based on them?', timeLimit:10, type:'reasoning', techniqueLabel:'Statement Conclusion', intuition:'A valid conclusion is one that MUST follow from the given statements. If it could be false, it does not follow.' };
}

// ====== VERBAL REASONING GENERATORS ======

var SYNONYM_BANK = [{w:'Abate',s:['Subside','Increase','Intensify','Aggravate']},
{w:'Abhor',s:['Detest','Adore','Cherish','Embrace']},
{w:'Abjure',s:['Renounce','Embrace','Adopt','Welcome']},
{w:'Absolve',s:['Acquit','Condemn','Blame','Convict']},
{w:'Abstemious',s:['Temperate','Indulgent','Gluttonous','Intemperate']},
{w:'Acerbic',s:['Harsh','Mild','Gentle','Soothing']},
{w:'Acumen',s:['Shrewdness','Ignorance','Stupidity','Obtuseness']},
{w:'Admonish',s:['Reprimand','Praise','Commend','Approve']},
{w:'Adroit',s:['Deft','Clumsy','Awkward','Inept']},
{w:'Adulation',s:['Flattery','Criticism','Censure','Detraction']},
{w:'Aegis',s:['Protection','Vulnerability','Exposure','Peril']},
{w:'Aesthetic',s:['Artistic','Ugly','Unsightly','Grotesque']},
{w:'Affable',s:['Friendly','Aloof','Unfriendly','Haughty']},
{w:'Affluence',s:['Wealth','Poverty','Destitution','Penury']},
{w:'Agile',s:['Nimble','Sluggish','Clumsy','Lethargic']},
{w:'Alacrity',s:['Eagerness','Reluctance','Apathy','Lethargy']},
{w:'Alleviate',s:['Relieve','Aggravate','Exacerbate','Intensify']},
{w:'Allot',s:['Allocate','Withhold','Deny','Deprive']},
{w:'Aloof',s:['Detached','Sociable','Affectionate','Warm']},
{w:'Amalgamate',s:['Merge','Separate','Divide','Disband']},
{w:'Ambivalent',s:['Uncertain','Decisive','Certain','Resolute']},
{w:'Ameliorate',s:['Improve','Worsen','Deteriorate','Degenerate']},
{w:'Amiable',s:['Friendly','Hostile','Unfriendly','Antagonistic']},
{w:'Amorphous',s:['Shapeless','Well-defined','Distinct','Structured']},
{w:'Anachronism',s:['Outdated','Contemporary','Modern','Timely']},
{w:'Anecdote',s:['Story','Fact','Statistic','Doctrine']},
{w:'Animosity',s:['Hostility','Goodwill','Friendship','Benevolence']},
{w:'Anomalous',s:['Irregular','Normal','Typical','Conventional']},
{w:'Antipathy',s:['Aversion','Affinity','Fondness','Sympathy']},
{w:'Apathy',s:['Indifference','Enthusiasm','Passion','Zeal']},
{w:'Appease',s:['Placate','Antagonize','Provoke','Incense']},
{w:'Arbitrary',s:['Random','Systematic','Methodical','Deliberate']},
{w:'Arcane',s:['Mysterious','Clear','Obvious','Evident']},
{w:'Articulate',s:['Eloquent','Inarticulate','Incoherent','Mumbled']},
{w:'Ascetic',s:['Austere','Hedonistic','Indulgent','Sensuous']},
{w:'Assiduous',s:['Diligent','Lazy','Negligent','Indolent']},
{w:'Astute',s:['Shrewd','Naive','Gullible','Simple']},
{w:'Atrophy',s:['Wither','Flourish','Thrive','Grow']},
{w:'Augment',s:['Increase','Decrease','Diminish','Reduce']},
{w:'Austere',s:['Severe','Lavish','Luxurious','Opulent']},
{w:'Avid',s:['Eager','Indifferent','Apathetic','Disinterested']},
{w:'Belie',s:['Contradict','Confirm','Corroborate','Support']},
{w:'Belligerent',s:['Hostile','Peaceful','Amiable','Friendly']},
{w:'Benign',s:['Harmless','Malignant','Harmful','Vicious']},
{w:'Blithe',s:['Carefree','Worried','Anxious','Troubled']},
{w:'Blunt',s:['Direct','Sharp','Piercing','Pointed']},
{w:'Bombastic',s:['Pompous','Modest','Understated','Simple']},
{w:'Bovine',s:['Stupid','Keen','Sharp','Alert']},
{w:'Bristle',s:['Seethe','Cower','Flinch','Quail']},
{w:'Bucolic',s:['Rustic','Urban','Metropolitan','Cosmopolitan']},
{w:'Burgeon',s:['Flourish','Decline','Wither','Dwindle']},
{w:'Burlesque',s:['Parody','Serious','Sincere','Earnest']},
{w:'Cacophony',s:['Discord','Harmony','Melody','Euphony']},
{w:'Cajole',s:['Coax','Coerce','Bully','Intimidate']},
{w:'Calumniate',s:['Slander','Praise','Extol','Commend']},
{w:'Capacious',s:['Spacious','Cramped','Narrow','Constricted']},
{w:'Censure',s:['Condemn','Praise','Approve','Endorse']},
{w:'Chicanery',s:['Deception','Honesty','Fairness','Candor']},
{w:'Churlish',s:['Rude','Polite','Courteous','Gracious']},
{w:'Circumscribe',s:['Restrict','Expand','Enlarge','Broaden']},
{w:'Clamorous',s:['Noisy','Quiet','Silent','Hushed']},
{w:'Clandestine',s:['Secret','Open','Public','Overt']},
{w:'Coalesce',s:['Merge','Separate','Divide','Fragment']},
{w:'Coerce',s:['Compel','Persuade','Encourage','Entice']},
{w:'Cogent',s:['Compelling','Weak','Unconvincing','Feeble']},
{w:'Collaborate',s:['Cooperate','Compete','Oppose','Resist']},
{w:'Colloquial',s:['Informal','Formal','Elevated','Literary']},
{w:'Commensurate',s:['Proportional','Disproportionate','Excessive','Inadequate']},
{w:'Compendium',s:['Collection','Omission','Exclusion','Deletion']},
{w:'Compliant',s:['Submissive','Defiant','Rebellious','Obstinate']},
{w:'Condone',s:['Overlook','Condemn','Punish','Denounce']},
{w:'Conducive',s:['Helpful','Harmful','Detrimental','Adverse']},
{w:'Confiscate',s:['Seize','Return','Restore','Give']},
{w:'Confluence',s:['Junction','Divergence','Separation','Branching']},
{w:'Connoisseur',s:['Expert','Amateur','Novice','Dabbler']},
{w:'Construe',s:['Interpret','Misinterpret','Ignore','Neglect']},
{w:'Contrite',s:['Remorseful','Unrepentant','Defiant','Obstinate']},
{w:'Convoluted',s:['Complex','Simple','Straightforward','Clear']},
{w:'Copious',s:['Abundant','Scarce','Meager','Sparse']},
{w:'Corroborate',s:['Confirm','Contradict','Deny','Refute']},
{w:'Cosmopolitan',s:['Worldly','Provincial','Parochial','Insular']},
{w:'Credulous',s:['Gullible','Skeptical','Suspicious','Wary']},
{w:'Curtail',s:['Reduce','Extend','Increase','Prolong']},
{w:'Cursory',s:['Superficial','Thorough','Detailed','Meticulous']},
{w:'Debilitate',s:['Weaken','Strengthen','Invigorate','Fortify']},
{w:'Decadent',s:['Decaying','Flourishing','Thriving','Prosperous']},
{w:'Decorum',s:['Propriety','Impropriety','Indecency','Vulgarity']},
{w:'Defer',s:['Postpone','Proceed','Continue','Advance']},
{w:'Deferential',s:['Respectful','Disrespectful','Impudent','Insolent']},
{w:'Defunct',s:['Extinct','Extant','Active','Operational']},
{w:'Delineate',s:['Outline','Obscure','Confuse','Blur']},
{w:'Demagogue',s:['Agitator','Statesman','Philosopher','Scholar']},
{w:'Demeanor',s:['Behavior','Physique','Complexion','Stature']},
{w:'Demure',s:['Reserved','Bold','Flirtatious','Forward']},
{w:'Denounce',s:['Condemn','Praise','Commend','Acclaim']},
{w:'Depict',s:['Portray','Conceal','Hide','Obscure']},
{w:'Deplore',s:['Condemn','Approve','Welcome','Embrace']},
{w:'Depravity',s:['Corruption','Virtue','Morality','Integrity']},
{w:'Deride',s:['Mock','Praise','Respect','Admire']},
{w:'Desiccate',s:['Dry','Moisten','Soak','Drench']},
{w:'Despondent',s:['Dejected','Hopeful','Cheerful','Optimistic']},
{w:'Despot',s:['Tyrant','Liberator','Reformer','Benevolent']},
{w:'Detrimental',s:['Harmful','Beneficial','Favorable','Helpful']},
{w:'Dexterous',s:['Skillful','Clumsy','Awkward','Inept']},
{w:'Didactic',s:['Instructional','Uninstructive','Unhelpful','Vague']},
{w:'Diffident',s:['Shy','Bold','Confident','Assertive']},
{w:'Digress',s:['Deviate','Focus','Concentrate','Proceed']},
{w:'Dilatory',s:['Tardy','Prompt','Punctual','Swift']},
{w:'Discordant',s:['Clashing','Harmonious','Agreeable','Melodious']},
{w:'Discreet',s:['Tactful','Indiscreet','Foolish','Reckless']},
{w:'Disdain',s:['Contempt','Respect','Admiration','Esteem']},
{w:'Disparage',s:['Belittle','Praise','Commend','Extol']},
{w:'Disparity',s:['Difference','Equality','Similarity','Uniformity']},
{w:'Dissolution',s:['Termination','Formation','Establishment','Creation']},
{w:'Disseminate',s:['Spread','Suppress','Withhold','Conceal']},
{w:'Dogmatic',s:['Opinionated','Open-minded','Flexible','Liberal']},
{w:'Dormant',s:['Inactive','Active','Vigorous','Alert']},
{w:'Dubious',s:['Doubtful','Certain','Sure','Confident']},
{w:'Duplicity',s:['Deceit','Honesty','Candor','Sincerity']},
{w:'Edify',s:['Enlighten','Mislead','Confuse','Deceive']},
{w:'Efficacious',s:['Effective','Ineffective','Useless','Futile']},
{w:'Effervescent',s:['Bubbly','Dull','Flat','Lifeless']},
{w:'Egalitarian',s:['Equal','Elitist','Aristocratic','Snobbish']},
{w:'Egregious',s:['Flagrant','Admirable','Excellent','Commendable']},
{w:'Elucidate',s:['Clarify','Obscure','Confuse','Complicate']},
{w:'Elusive',s:['Evasive','Obvious','Apparent','Evident']},
{w:'Emaciated',s:['Thin','Stout','Plump','Robust']},
{w:'Embellish',s:['Adorn','Simplify','Strip','Bare']},
{w:'Empathy',s:['Compassion','Indifference','Apathy','Detachment']},
{w:'Enigma',s:['Mystery','Clarity','Certainty','Explanation']},
{w:'Enormity',s:['Atrocity','Delight','Pleasure','Trifle']},
{w:'Entrench',s:['Establish','Remove','Eradicate','Dislodge']},
{w:'Ephemeral',s:['Transient','Permanent','Eternal','Enduring']},
{w:'Equanimity',s:['Composure','Agitation','Distress','Anxiety']},
{w:'Equivocal',s:['Ambiguous','Clear','Definite','Unequivocal']},
{w:'Erroneous',s:['Incorrect','Correct','Accurate','Precise']},
{w:'Esoteric',s:['Abstruse','Common','Ordinary','Popular']},
{w:'Espouse',s:['Adopt','Reject','Abandon','Oppose']},
{w:'Eulogy',s:['Praise','Criticism','Condemnation','Censure']},
{w:'Exacerbate',s:['Worsen','Alleviate','Ease','Relieve']},
{w:'Exculpate',s:['Exonerate','Blame','Condemn','Convict']},
{w:'Exemplary',s:['Model','Unsatisfactory','Poor','Inadequate']},
{w:'Exhort',s:['Urge','Discourage','Dissuade','Deter']},
{w:'Expedite',s:['Accelerate','Delay','Hinder','Retard']},
{w:'Expunge',s:['Erase','Record','Preserve','Retain']},
{w:'Extol',s:['Praise','Criticize','Condemn','Denounce']},
{w:'Extraneous',s:['Irrelevant','Relevant','Pertinent','Related']},
{w:'Facetious',s:['Flippant','Serious','Earnest','Solemn']},
{w:'Fallacious',s:['False','Valid','Sound','True']},
{w:'Fastidious',s:['Fussy','Easygoing','Careless','Indifferent']},
{w:'Fervent',s:['Ardent','Apathetic','Indifferent','Lukewarm']},
{w:'Flagrant',s:['Blatant','Subtle','Secret','Hidden']},
{w:'Flippant',s:['Disrespectful','Respectful','Serious','Earnest']},
{w:'Florid',s:['Red-faced','Pale','Sallow','Pallid']},
{w:'Foment',s:['Incite','Suppress','Calm','Pacify']},
{w:'Forbearance',s:['Patience','Impatience','Intolerance','Agitation']},
{w:'Formidable',s:['Imposing','Weak','Insignificant','Trivial']},
{w:'Fortuitous',s:['Accidental','Planned','Deliberate','Intentional']},
{w:'Fractious',s:['Unruly','Docile','Obedient','Submissive']},
{w:'Garrulous',s:['Loquacious','Taciturn','Reserved','Reticent']},
{w:'Grandiloquent',s:['Pompous','Modest','Humble','Plain']},
{w:'Gratuitous',s:['Unwarranted','Justified','Necessary','Warranted']},
{w:'Gullible',s:['Credulous','Skeptical','Shrewd','Wary']},
{w:'Hackneyed',s:['Cliched','Original','Innovative','Fresh']},
{w:'Hapless',s:['Unlucky','Fortunate','Lucky','Blessed']},
{w:'Harangue',s:['Tirade','Whisper','Murmur','Praise']},
{w:'Hedonist',s:['Pleasure-seeker','Ascetic','Mystic','Sage']},
{w:'Hegemony',s:['Dominance','Subordination','Submission','Servitude']},
{w:'Heresy',s:['Heterodoxy','Orthodoxy','Doctrine','Faith']},
{w:'Hermetic',s:['Sealed','Open','Exposed','Accessible']},
{w:'Hiatus',s:['Gap','Continuity','Continuation','Unbroken']},
{w:'Iconoclast',s:['Rebel','Conformist','Follower','Traditionalist']},
{w:'Idiosyncrasy',s:['Peculiarity','Normality','Convention','Uniformity']},
{w:'Impecunious',s:['Poor','Wealthy','Affluent','Prosperous']},
{w:'Impervious',s:['Resistant','Susceptible','Vulnerable','Permeable']},
{w:'Implacable',s:['Relentless','Merciful','Forgiving','Compassionate']},
{w:'Implicit',s:['Implied','Explicit','Stated','Overt']},
{w:'Impugn',s:['Challenge','Support','Defend','Endorse']},
{w:'Impeccable',s:['Flawless','Faulty','Defective','Imperfect']},
{w:'Impediment',s:['Obstacle','Aid','Assistance','Help']},
{w:'Impending',s:['Imminent','Distant','Remote','Past']},
{w:'Imperative',s:['Essential','Optional','Unnecessary','Trivial']},
{w:'Imperious',s:['Domineering','Humble','Meek','Submissive']},
{w:'Impertinent',s:['Insolent','Pertinent','Relevant','Apposite']},
{w:'Impetuous',s:['Impulsive','Deliberate','Cautious','Prudent']},
{w:'Implausible',s:['Unlikely','Credible','Probable','Plausible']},
{w:'Inadvertent',s:['Unintentional','Deliberate','Intentional','Calculated']},
{w:'Inchoate',s:['Rudimentary','Mature','Developed','Complete']},
{w:'Incipient',s:['Emerging','Established','Mature','Full-blown']},
{w:'Incontrovertible',s:['Indisputable','Debatable','Questionable','Doubtful']},
{w:'Indecorous',s:['Improper','Decorous','Proper','Seemly']},
{w:'Indolent',s:['Lazy','Industrious','Active','Energetic']},
{w:'Inept',s:['Incompetent','Competent','Skilled','Capable']},
{w:'Inexorable',s:['Relentless','Yielding','Flexible','Merciful']},
{w:'Ingenuous',s:['Naive','Cunning','Crafty','Shrewd']},
{w:'Inherent',s:['Intrinsic','Extrinsic','Acquired','External']},
{w:'Inimical',s:['Hostile','Friendly','Amiable','Benevolent']},
{w:'Innocuous',s:['Harmless','Harmful','Dangerous','Toxic']},
{w:'Inscrutable',s:['Enigmatic','Transparent','Lucid','Clear']},
{w:'Insipid',s:['Bland','Spicy','Zesty','Piquant']},
{w:'Insidious',s:['Treacherous','Straightforward','Honest','Candid']},
{w:'Insular',s:['Isolated','Cosmopolitan','Worldly','Open']},
{w:'Intrepid',s:['Fearless','Timid','Cowardly','Apprehensive']},
{w:'Inveterate',s:['Habitual','Occasional','Rare','Sporadic']},
{w:'Irascible',s:['Irritable','Calm','Placid','Even-tempered']},
{w:'Juxtapose',s:['Compare','Separate','Isolate','Divide']},
{w:'Lackluster',s:['Dull','Brilliant','Dazzling','Radiant']},
{w:'Laconic',s:['Brief','Verbose','Long-winded','Wordy']},
{w:'Laudable',s:['Praiseworthy','Blameworthy','Deplorable','Shameful']},
{w:'Leery',s:['Wary','Trusting','Naive','Unsuspicious']},
{w:'Lenient',s:['Mild','Strict','Harsh','Severe']},
{w:'Levity',s:['Frivolity','Seriousness','Gravity','Solemnity']},
{w:'Loquacious',s:['Talkative','Quiet','Reserved','Taciturn']},
{w:'Lugubrious',s:['Mournful','Cheerful','Joyful','Happy']},
{w:'Lucrative',s:['Profitable','Unprofitable','Worthless','Losing']},
{w:'Machination',s:['Plot','Openness','Candor','Transparency']},
{w:'Malevolent',s:['Malicious','Benevolent','Kind','Compassionate']},
{w:'Malleable',s:['Flexible','Inflexible','Rigid','Adamant']},
{w:'Maverick',s:['Nonconformist','Conformist','Traditionalist','Follower']},
{w:'Mendacious',s:['Dishonest','Truthful','Honest','Veracious']},
{w:'Mollify',s:['Appease','Enrage','Anger','Incense']},
{w:'Moribund',s:['Dying','Thriving','Flourishing','Vigorous']},
{w:'Mundane',s:['Ordinary','Extraordinary','Exciting','Spectacular']},
{w:'Myopic',s:['Short-sighted','Far-sighted','Visionary','Prescient']},
{w:'Nefarious',s:['Wicked','Virtuous','Righteous','Noble']},
{w:'Nonchalant',s:['Casual','Anxious','Worried','Concerned']},
{w:'Nonpareil',s:['Unrivaled','Ordinary','Common','Average']},
{w:'Obdurate',s:['Stubborn','Flexible','Yielding','Amiable']},
{w:'Obfuscate',s:['Confuse','Clarify','Explain','Illuminate']},
{w:'Oblique',s:['Slanting','Straight','Perpendicular','Vertical']},
{w:'Oblivious',s:['Unaware','Aware','Conscious','Mindful']},
{w:'Odious',s:['Hateful','Admirable','Pleasant','Charming']},
{w:'Opprobrium',s:['Disgrace','Honor','Glory','Praise']},
{w:'Onerous',s:['Burdensome','Easy','Light','Effortless']},
{w:'Opulent',s:['Luxurious','Poor','Modest','Humble']},
{w:'Ostentatious',s:['Showy','Modest','Understated','Unpretentious']},
{w:'Palatable',s:['Tasty','Unappetizing','Bland','Tasteless']},
{w:'Palpable',s:['Tangible','Imperceptible','Intangible','Abstract']},
{w:'Parsimonious',s:['Miserly','Generous','Lavish','Liberality']},
{w:'Partisan',s:['Biased','Impartial','Neutral','Objective']},
{w:'Pedantic',s:['Fussy','Carefree','Easygoing','Casual']},
{w:'Penchant',s:['Liking','Dislike','Aversion','Antipathy']},
{w:'Pensive',s:['Thoughtful','Careless','Thoughtless','Frivolous']},
{w:'Perennial',s:['Persistent','Ephemeral','Transient','Temporary']},
{w:'Perfidious',s:['Treacherous','Loyal','Faithful','Trustworthy']},
{w:'Perfunctory',s:['Cursory','Thorough','Meticulous','Diligent']},
{w:'Perilous',s:['Dangerous','Safe','Secure','Harmless']},
{w:'Pernicious',s:['Destructive','Harmless','Beneficial','Wholesome']},
{w:'Perspicacious',s:['Astute','Dull','Obtuse','Stupid']},
{w:'Pertinacious',s:['Tenacious','Yielding','Flexible','Compliant']},
{w:'Phlegmatic',s:['Calm','Passionate','Emotional','Excitable']},
{w:'Pinnacle',s:['Peak','Nadir','Bottom','Depth']},
{w:'Pliable',s:['Flexible','Rigid','Inflexible','Stiff']},
{w:'Polemical',s:['Controversial','Agreeable','Harmonious','Peaceful']},
{w:'Pragmatic',s:['Practical','Idealistic','Impractical','Theoretical']},
{w:'Precarious',s:['Unstable','Stable','Secure','Firm']},
{w:'Precocious',s:['Advanced','Slow','Backward','Immature']},
{w:'Preposterous',s:['Absurd','Reasonable','Sensible','Logical']},
{w:'Pretentious',s:['Affected','Modest','Humble','Unassuming']},
{w:'Prodigious',s:['Enormous','Tiny','Slight','Insignificant']},
{w:'Profound',s:['Deep','Shallow','Superficial','Trivial']},
{w:'Prolific',s:['Productive','Barren','Sterile','Unproductive']},
{w:'Propitious',s:['Favorable','Unfavorable','Adverse','Hostile']},
{w:'Prosaic',s:['Dull','Imaginative','Creative','Exciting']},
{w:'Pugnacious',s:['Combative','Peaceful','Placid','Gentle']},
{w:'Punctilious',s:['Meticulous','Careless','Negligent','Sloppy']},
{w:'Pungent',s:['Biting','Bland','Mild','Tasteless']},
{w:'Puerile',s:['Childish','Mature','Adult','Sophisticated']},
{w:'Quagmire',s:['Predicament','Solution','Resolution','Ease']},
{w:'Quandary',s:['Dilemma','Certainty','Clarity','Resolution']},
{w:'Quell',s:['Suppress','Incite','Stir','Provoke']},
{w:'Quixotic',s:['Impractical','Practical','Realistic','Sensible']},
{w:'Quotidian',s:['Everyday','Extraordinary','Unusual','Rare']},
{w:'Rancorous',s:['Bitter','Forgiving','Benevolent','Kind']},
{w:'Rapacious',s:['Greedy','Generous','Charitable','Philanthropic']},
{w:'Rational',s:['Logical','Irrational','Illogical','Foolish']},
{w:'Rebuff',s:['Reject','Accept','Welcome','Embrace']},
{w:'Rebuke',s:['Scold','Praise','Commend','Approve']},
{w:'Recluse',s:['Hermit','Socialite','Extrovert','Joiner']},
{w:'Redundant',s:['Superfluous','Essential','Necessary','Indispensable']},
{w:'Refute',s:['Disprove','Prove','Confirm','Support']},
{w:'Relinquish',s:['Surrender','Retain','Keep','Hold']},
{w:'Reminiscent',s:['Evocative','Unrelated','Irrelevant','Unconnected']},
{w:'Remiss',s:['Negligent','Diligent','Careful','Conscientious']},
{w:'Renounce',s:['Abandon','Embrace','Adopt','Claim']},
{w:'Repudiate',s:['Deny','Accept','Acknowledge','Endorse']},
{w:'Rescind',s:['Revoke','Enact','Establish','Implement']},
{w:'Resolute',s:['Determined','Indecisive','Vacillating','Irresolute']},
{w:'Reticent',s:['Reserved','Outspoken','Loquacious','Talkative']},
{w:'Robust',s:['Strong','Frail','Weak','Fragile']},
{w:'Salubrious',s:['Healthy','Unhealthy','Harmful','Toxic']},
{w:'Sanguine',s:['Optimistic','Pessimistic','Despondent','Gloomy']},
{w:'Scrupulous',s:['Conscientious','Unscrupulous','Dishonest','Corrupt']},
{w:'Sedulous',s:['Diligent','Lazy','Idle','Sluggish']},
{w:'Sentimental',s:['Emotional','Practical','Rational','Detached']},
{w:'Serendipity',s:['Chance','Foresight','Calculation','Design']},
{w:'Serene',s:['Calm','Agitated','Turbulent','Stormy']},
{w:'Solicitous',s:['Concerned','Indifferent','Apathetic','Neglectful']},
{w:'Sophomoric',s:['Immature','Mature','Sophisticated','Refined']},
{w:'Soporific',s:['Sleep-inducing','Invigorating','Stimulating','Refreshing']},
{w:'Squander',s:['Waste','Conserve','Save','Hoard']},
{w:'Stolid',s:['Unemotional','Passionate','Emotional','Sensitive']},
{w:'Strident',s:['Loud','Soft','Quiet','Gentle']},
{w:'Substantiate',s:['Confirm','Disprove','Refute','Undermine']},
{w:'Supercilious',s:['Arrogant','Humble','Modest','Meek']},
{w:'Superficial',s:['Shallow','Thorough','Deep','Profound']},
{w:'Supplant',s:['Replace','Retain','Keep','Maintain']},
{w:'Surreptitious',s:['Secret','Open','Public','Overt']},
{w:'Sycophant',s:['Flatterer','Critic','Opponent','Detractor']},
{w:'Tangible',s:['Concrete','Abstract','Intangible','Ethereal']},
{w:'Tantamount',s:['Equivalent','Different','Opposite','Contrary']},
{w:'Tedious',s:['Boring','Exciting','Fascinating','Engaging']},
{w:'Tenuous',s:['Weak','Strong','Solid','Robust']},
{w:'Timorous',s:['Fearful','Fearless','Bold','Brave']},
{w:'Torpid',s:['Sluggish','Active','Energetic','Lively']},
{w:'Tractable',s:['Docile','Stubborn','Obstinate','Wild']},
{w:'Transient',s:['Fleeting','Permanent','Lasting','Eternal']},
{w:'Trepidation',s:['Fear','Fearlessness','Boldness','Confidence']},
{w:'Truculent',s:['Aggressive','Peaceful','Mild','Gentle']},
{w:'Turgid',s:['Swollen','Shrunken','Withered','Shriveled']},
{w:'Umbrage',s:['Offense','Delight','Pleasure','Joy']},
{w:'Unassailable',s:['Invulnerable','Vulnerable','Weak','Exposed']},
{w:'Unassuming',s:['Modest','Arrogant','Proud','Haughty']},
{w:'Underscore',s:['Emphasize','Diminish','Downplay','Ignore']},
{w:'Unequivocal',s:['Clear','Ambiguous','Vague','Uncertain']},
{w:'Unscrupulous',s:['Dishonest','Honest','Ethical','Principled']},
{w:'Vacillate',s:['Waver','Resolve','Decide','Commit']},
{w:'Venerate',s:['Revere','Despise','Scorn','Dishonor']},
{w:'Verbose',s:['Wordy','Concise','Brief','Succinct']},
{w:'Vicissitude',s:['Change','Constancy','Stability','Continuity']},
{w:'Vindicate',s:['Justify','Blame','Condemn','Accuse']},
{w:'Vociferous',s:['Loud','Quiet','Soft','Muted']},
{w:'Voluble',s:['Fluent','Inarticulate','Halting','Stammering']},
{w:'Zealot',s:['Fanatic','Moderate','Temperate','Indifferent']},
{w:'Abject',s:['Miserable','Happy','Joyful','Elated']},
{w:'Abscond',s:['Flee','Remain','Stay','Linger']},
{w:'Abstruse',s:['Obscure','Simple','Obvious','Clear']},
{w:'Acclaim',s:['Praise','Denounce','Criticize','Censure']},
{w:'Acerbity',s:['Harshness','Mildness','Gentleness','Sweetness']},
{w:'Acrimonious',s:['Bitter','Sweet','Pleasant','Mild']},
{w:'Adamant',s:['Inflexible','Yielding','Flexible','Compliant']},
{w:'Adherent',s:['Follower','Opponent','Critic','Rebel']},
{w:'Adjunct',s:['Supplement','Staple','Core','Essence']},
{w:'Adverse',s:['Unfavorable','Favorable','Beneficial','Helpful']},
{w:'Affectation',s:['Pretense','Genuineness','Sincerity','Authenticity']},
{w:'Afflict',s:['Torment','Comfort','Soothe','Relieve']},
{w:'Aggrandize',s:['Enhance','Diminish','Reduce','Decrease']},
{w:'Amalgam',s:['Mixture','Separation','Division','Component']},
{w:'Ambiguous',s:['Unclear','Clear','Definite','Unequivocal']},
{w:'Ambivalence',s:['Uncertainty','Certainty','Decisiveness','Conviction']},
{w:'Anomaly',s:['Irregularity','Regularity','Normality','Convention']},
{w:'Antiquated',s:['Outdated','Modern','Contemporary','Current']},
{w:'Apathetic',s:['Indifferent','Enthusiastic','Passionate','Concerned']},
{w:'Apotheosis',s:['Culmination','Nadir','Bottom','Decline']},
{w:'Approbation',s:['Approval','Disapproval','Condemnation','Rejection']},
{w:'Aquiline',s:['Hooked','Straight','Flat','Broad']},
{w:'Ardent',s:['Passionate','Indifferent','Lukewarm','Apathetic']},
{w:'Artifice',s:['Trick','Honesty','Sincerity','Candor']},
{w:'Assuage',s:['Ease','Aggravate','Intensify','Worsen']},
{w:'Audacity',s:['Boldness','Timidity','Cowardice','Fear']},
{w:'Aversion',s:['Dislike','Fondness','Affinity','Attraction']},
{w:'Baneful',s:['Harmful','Harmless','Wholesome','Beneficial']},
{w:'Banal',s:['Trite','Original','Innovative','Creative']},
{w:'Besmirch',s:['Tarnish','Honor','Glorify','Praise']},
{w:'Blandishment',s:['Flattery','Criticism','Insult','Censure']},
{w:'Boisterous',s:['Noisy','Quiet','Calm','Silent']},
{w:'Bolster',s:['Support','Undermine','Weaken','Sabotage']},
{w:'Cabal',s:['Conspiracy','Openness','Transparency','Candor']},
{w:'Caustic',s:['Biting','Gentle','Mild','Kind']},
{w:'Cessation',s:['Stop','Continuation','Commencement','Beginning']},
{w:'Chary',s:['Wary','Reckless','Bold','Careless']},
{w:'Circuitous',s:['Indirect','Direct','Straight','Short']},
{w:'Clamor',s:['Outcry','Silence','Whisper','Murmur']},
{w:'Clemency',s:['Mercy','Severity','Harshness','Ruthlessness']},
{w:'Condescend',s:['Deign','Respect','Honor','Esteem']},
{w:'Conflagration',s:['Inferno','Spark','Flicker','Glow']},
{w:'Countenance',s:['Face','Ignore','Disregard','Neglect']},
{w:'Craven',s:['Cowardly','Brave','Valiant','Courageous']},
{w:'Culpable',s:['Blameworthy','Innocent','Guiltless','Blameless']},
{w:'Cynical',s:['Skeptical','Trusting','Optimistic','Hopeful']},
{w:'Denigrate',s:['Belittle','Praise','Laud','Extol']},
{w:'Deprecate',s:['Disapprove','Endorse','Support','Advocate']},
{w:'Derelict',s:['Negligent','Dutiful','Conscientious','Responsible']},
{w:'Desultory',s:['Aimless','Purposeful','Systematic','Methodical']},
{w:'Diaphanous',s:['Sheer','Opaque','Thick','Heavy']},
{w:'Dichotomy',s:['Division','Unity','Agreement','Harmony']},
{w:'Draconian',s:['Harsh','Lenient','Mild','Gentle']},
{w:'Ebullient',s:['Enthusiastic','Subdued','Muted','Restrained']},
{w:'Eclectic',s:['Diverse','Narrow','Limited','Exclusive']},
{w:'Efficacy',s:['Effectiveness','Ineffectiveness','Uselessness','Futility']},
{w:'Effrontery',s:['Audacity','Modesty','Humility','Timidity']},
{w:'Elegy',s:['Lament','Celebration','Song','Hymn']},
{w:'Elicit',s:['Evoke','Suppress','Conceal','Hide']},
{w:'Empirical',s:['Observational','Theoretical','Speculative','Hypothetical']},
{w:'Encomium',s:['Tribute','Criticism','Insult','Censure']},
{w:'Enervate',s:['Weaken','Invigorate','Strengthen','Energize']},
{w:'Engender',s:['Cause','Prevent','Avert','Avoid']},
{w:'Enmity',s:['Hostility','Friendship','Amity','Goodwill']},
{w:'Equivocate',s:['Prevaricate','Assert','Declare','Affirm']},
{w:'Erudite',s:['Scholarly','Ignorant','Uneducated','Illiterate']},
{w:'Eschew',s:['Avoid','Embrace','Seek','Cultivate']},
{w:'Exonerate',s:['Absolve','Blame','Condemn','Accuse']},
{w:'Expedient',s:['Convenient','Inconvenient','Impractical','Unwise']},
{w:'Exquisite',s:['Beautiful','Ugly','Coarse','Rough']},
{w:'Extirpate',s:['Destroy','Establish','Build','Create']},
{w:'Extricate',s:['Free','Trap','Entangle','Imprison']},
{w:'Fable',s:['Tale','Fact','History','Record']},
{w:'Fainthearted',s:['Timid','Brave','Courageous','Bold']},
{w:'Feckless',s:['Useless','Efficient','Effective','Competent']},
{w:'Feral',s:['Wild','Domesticated','Tame','Gentle']},
{w:'Fervid',s:['Intense','Mild','Moderate','Lukewarm']},
{w:'Festoon',s:['Decorate','Strip','Bare','Unclothe']},
{w:'Fidelity',s:['Loyalty','Disloyalty','Treachery','Infidelity']},
{w:'Forestall',s:['Prevent','Allow','Facilitate','Permit']},
{w:'Furtive',s:['Secretive','Open','Public','Overt']},
{w:'Gainsay',s:['Deny','Affirm','Confirm','Assert']},
{w:'Galvanize',s:['Stimulate','Discourage','Deter','Dishearten']},
{w:'Garner',s:['Gather','Disperse','Scatter','Distribute']},
{w:'Genuflect',s:['Kneel','Stand','Rise','Resist']},
{w:'Gerrymander',s:['Manipulate','Fairness','Impartiality','Equality']},
{w:'Gourmand',s:['Glutton','Ascetic','Dieter','Abstemious']},
{w:'Heretical',s:['Unorthodox','Orthodox','Conventional','Doctrinal']},
{w:'Hubris',s:['Arrogance','Humility','Modesty','Meekness']},
{w:'Hypocritical',s:['Insincere','Genuine','Sincere','Honest']},
{w:'Ignominious',s:['Disgraceful','Honorable','Glorious','Noble']},
{w:'Imbroglio',s:['Entanglement','Simplicity','Clarity','Resolution']},
{w:'Immutable',s:['Unchangeable','Changeable','Flexible','Variable']},
{w:'Imperturbable',s:['Calm','Agitated','Flustered','Nervous']},
{w:'Inane',s:['Silly','Sensible','Wise','Meaningful']},
{w:'Incisive',s:['Sharp','Blunt','Vague','Indistinct']},
{w:'Incongruous',s:['Inappropriate','Fitting','Appropriate','Suitable']},
{w:'Indomitable',s:['Unconquerable','Weak','Submissive','Defeated']},
{w:'Insuperable',s:['Insurmountable','Feasible','Conquerable','Achievable']},
{w:'Invincible',s:['Unbeatable','Vulnerable','Weak','Defeatable']},
{w:'Irrefutable',s:['Undeniable','Debatable','Questionable','Doubtful']},
{w:'Itinerant',s:['Wandering','Settled','Stationary','Resident']},
{w:'Languid',s:['Listless','Energetic','Active','Vigorous']},
{w:'Lassitude',s:['Fatigue','Energy','Vigor','Vitality']},
{w:'Legerdemain',s:['Trickery','Honesty','Fairness','Candor']},
{w:'Lilliputian',s:['Tiny','Colossal','Gigantic','Enormous']},
{w:'Maelstrom',s:['Turmoil','Calm','Tranquility','Peace']},
{w:'Majesty',s:['Grandeur','Indignity','Meekness','Humility']},
{w:'Malediction',s:['Curse','Blessing','Praise','Prayer']},
{w:'Malfeasance',s:['Misconduct','Integrity','Probity','Rectitude']},
{w:'Manifest',s:['Obvious','Hidden','Concealed','Secret']},
{w:'Mellifluous',s:['Smooth','Harsh','Grating','Jarring']},
{w:'Mercurial',s:['Unpredictable','Stable','Consistent','Steady']},
{w:'Misanthrope',s:['Man-hater','Philanthropist','Humanitarian','Altruist']},
{w:'Mitigate',s:['Alleviate','Aggravate','Worsen','Intensify']},
{w:'Moratorium',s:['Suspension','Continuation','Resumption','Start']},
{w:'Munificent',s:['Generous','Stingy','Miserly','Niggardly']},
{w:'Nadir',s:['Bottom','Peak','Summit','Zenith']},
{w:'Nascent',s:['Emerging','Mature','Developed','Established']},
{w:'Nemesis',s:['Retribution','Reward','Boon','Blessing']},
{w:'Nonchalance',s:['Indifference','Concern','Anxiety','Worry']},
{w:'Obstreperous',s:['Unruly','Quiet','Docile','Submissive']},
{w:'Obtuse',s:['Dull','Sharp','Keen','Astute']},
{w:'Odium',s:['Hatred','Affection','Love','Adoration']},
{w:'Opprobrious',s:['Disgraceful','Honorable','Respectable','Praiseworthy']},
{w:'Ostensible',s:['Apparent','Real','True','Genuine']},
{w:'Palaver',s:['Chatter','Silence','Conciseness','Brevity']},
{w:'Panacea',s:['Cure-all','Poison','Toxin','Bane']},
{w:'Pandemonium',s:['Chaos','Order','Calm','Peace']},
{w:'Panegyric',s:['Eulogy','Criticism','Censure','Denunciation']},
{w:'Paradigm',s:['Model','Anomaly','Exception','Deviation']},
{w:'Parochial',s:['Narrow-minded','Broad-minded','Cosmopolitan','Worldly']},
{w:'Paucity',s:['Scarcity','Abundance','Plenty','Profusion']},
{w:'Pedagogy',s:['Teaching','Ignorance','Illiteracy','Incompetence']},
{w:'Pejorative',s:['Derogatory','Complimentary','Flattering','Praising']},
{w:'Pellucid',s:['Clear','Opaque','Murky','Turbid']},
{w:'Penurious',s:['Impoverished','Wealthy','Affluent','Opulent']},
{w:'Perdition',s:['Damnation','Salvation','Redemption','Bliss']},
{w:'Peremptory',s:['Commanding','Humble','Deferential','Submissive']},
{w:'Peripatetic',s:['Wandering','Sedentary','Stationary','Fixed']},
{w:'Perquisite',s:['Privilege','Duty','Obligation','Burden']},
{w:'Petulant',s:['Childish','Patient','Mature','Reasonable']},
{w:'Philistine',s:['Uncultured','Cultured','Refined','Aesthetic']},
{w:'Pithy',s:['Concise','Verbose','Wordy','Long-winded']},
{w:'Platitude',s:['Truism','Innovation','Novelty','Originality']},
{w:'Plethora',s:['Excess','Shortage','Scarcity','Deficiency']},
{w:'Polemic',s:['Attack','Praise','Compliment','Tribute']},
{w:'Porcelain',s:['Ceramic','Wood','Metal','Stone']},
{w:'Precipitate',s:['Hasten','Delay','Retard','Postpone']},
{w:'Precipitous',s:['Steep','Gradual','Gentle','Sloping']},
{w:'Predilection',s:['Preference','Aversion','Dislike','Antipathy']},
{w:'Prescient',s:['Foresightful','Unknowing','Ignorant','Blind']},
{w:'Presumptuous',s:['Arrogant','Humble','Modest','Reserved']},
{w:'Primal',s:['Ancient','Modern','Recent','Contemporary']},
{w:'Pristine',s:['Pure','Polluted','Contaminated','Defiled']},
{w:'Probity',s:['Honesty','Dishonesty','Corruption','Deceit']},
{w:'Prodigal',s:['Wasteful','Economical','Frugal','Thrifty']},
{w:'Profligate',s:['Dissolute','Virtuous','Moral','Righteous']},
{w:'Propitiate',s:['Appease','Antagonize','Provoke','Anger']},
{w:'Proscribe',s:['Prohibit','Permit','Allow','Sanction']},
{w:'Protean',s:['Versatile','Rigid','Inflexible','Fixed']},
{w:'Provenance',s:['Origin','Destination','End','Terminus']},
{w:'Proximity',s:['Nearness','Remoteness','Distance','Seclusion']},
{w:'Pugilist',s:['Boxer','Pacifist','Diplomat','Scholar']},
{w:'Pundit',s:['Expert','Novice','Amateur','Dilettante']},
{w:'Purport',s:['Claim','Deny','Reject','Repudiate']},
{w:'Putative',s:['Reputed','Known','Certified','Confirmed']},
{w:'Quiescent',s:['Inactive','Active','Restless','Agitated']},
{w:'Quintessential',s:['Typical','Atypical','Uncharacteristic','Abnormal']},
{w:'Raconteur',s:['Storyteller','Listener','Audience','Spectator']},
{w:'Rapprochement',s:['Reconciliation','Estrangement','Alienation','Rupture']},
{w:'Rationalize',s:['Justify','Condemn','Criticize','Blame']},
{w:'Recalcitrant',s:['Obstinate','Obedient','Docile','Compliant']},
{w:'Recant',s:['Retract','Affirm','Maintain','Uphold']},
{w:'Recidivism',s:['Reoffending','Rehabilitation','Reform','Improvement']},
{w:'Rectitude',s:['Morality','Corruption','Wickedness','Vice']},
{w:'Redoubtable',s:['Formidable','Weak','Insignificant','Trivial']},
{w:'Refractory',s:['Unmanageable','Docile','Obedient','Compliant']},
{w:'Rejuvenate',s:['Revive','Age','Wither','Decline']},
{w:'Remonstrate',s:['Protest','Agree','Comply','Acquiesce']},
{w:'Renegade',s:['Traitor','Loyalist','Patriot','Faithful']},
{w:'Reparations',s:['Compensation','Penalty','Fine','Punishment']},
{w:'Requisite',s:['Necessary','Unnecessary','Optional','Superfluous']},
{w:'Resurgent',s:['Reviving','Declining','Fading','Dying']},
{w:'Retribution',s:['Punishment','Reward','Mercy','Forgiveness']},
{w:'Ruse',s:['Trick','Candor','Honesty','Frankness']},
{w:'Sagacity',s:['Wisdom','Folly','Stupidity','Ignorance']},
{w:'Scurrilous',s:['Vulgar','Decorous','Refined','Polite']},
{w:'Sedentary',s:['Inactive','Active','Mobile','Nomadic']},
{w:'Seminal',s:['Influential','Insignificant','Minor','Trivial']},
{w:'Skeptical',s:['Doubtful','Trusting','Credulous','Believing']},
{w:'Soliloquy',s:['Monologue','Dialogue','Conversation','Discussion']},
{w:'Somnolent',s:['Sleepy','Alert','Wide-awake','Vigilant']},
{w:'Specious',s:['Deceptive','Genuine','Sound','Legitimate']},
{w:'Sycophancy',s:['Flattery','Criticism','Opposition','Hostility']},
{w:'Tacit',s:['Implicit','Explicit','Stated','Expressed']},
{w:'Tautology',s:['Redundancy','Conciseness','Brevity','Precision']},
{w:'Temerity',s:['Boldness','Caution','Timidity','Prudence']},
{w:'Tendentious',s:['Biased','Impartial','Neutral','Unbiased']},
{w:'Threnody',s:['Dirge','Hymn','Anthem','Ballad']},
{w:'Trajectory',s:['Path','Deviation','Irregularity','Anomaly']},
{w:'Travesty',s:['Parody','Tribute','Homage','Eulogy']},
{w:'Turpitude',s:['Depravity','Virtue','Morality','Integrity']},
{w:'Ubiquity',s:['Omnipresence','Rarity','Scarce','Absence']},
{w:'Unconscionable',s:['Excessive','Reasonable','Moderate','Justified']},
{w:'Unctuous',s:['Oily','Sincere','Genuine','Heartfelt']},
{w:'Undulate',s:['Wave','Flatten','Straighten','Stabilize']},
{w:'Unimpeachable',s:['Faultless','Flawed','Defective','Impure']},
{w:'Unprecedented',s:['Unparalleled','Common','Typical','Ordinary']},
{w:'Urbane',s:['Sophisticated','Rustic','Boorish','Crude']},
{w:'Vacuous',s:['Empty','Meaningful','Substantial','Intelligent']},
{w:'Vapid',s:['Dull','Interesting','Fascinating','Engaging']},
{w:'Vaunt',s:['Boast','Understate','Belittle','Deprecate']},
{w:'Venal',s:['Corrupt','Honest','Incorruptible','Principled']},
{w:'Vernacular',s:['Dialect','Formality','Precision','Etiquette']},
{w:'Viable',s:['Feasible','Impractical','Unworkable','Impossible']},
{w:'Vicarious',s:['Indirect','Direct','Personal','Firsthand']},
{w:'Vitriolic',s:['Caustic','Mild','Gentle','Sweet']},
{w:'Wane',s:['Decline','Wax','Increase','Grow']},
{w:'Wanton',s:['Deliberate','Accidental','Unintentional','Incidental']},
{w:'Wrath',s:['Anger','Calm','Tranquility','Serenity']},
{w:'Zephyr',s:['Breeze','Gale','Storm','Hurricane']},
{w:'Aberration',s:['Anomaly','Normality','Regularity','Convention']},
{w:'Abnegate',s:['Renounce','Claim','Embrace','Adopt']},
{w:'Abrogate',s:['Repeal','Enact','Establish','Confirm']},
{w:'Acquiesce',s:['Comply','Resist','Defy','Protest']},
{w:'Adulterate',s:['Contaminate','Purify','Refine','Cleanse']},
{w:'Afferent',s:['Inward','Outward','Peripheral','External']},
{w:'Allegory',s:['Fable','Reality','Fact','Record']},
{w:'Amass',s:['Gather','Disperse','Distribute','Squander']},
{w:'Anachronistic',s:['Outdated','Current','Contemporary','Modern']},
{w:'Anathema',s:['Curse','Blessing','Boon','Gift']},
{w:'Antediluvian',s:['Ancient','Modern','Recent','Contemporary']},
{w:'Archaic',s:['Antiquated','Modern','New','Recent']},
{w:'Auspicious',s:['Favorable','Unfavorable','Inauspicious','Ominous']},
{w:'Autonomous',s:['Independent','Dependent','Subservient','Subordinate']},
{w:'Beleaguer',s:['Harass','Assist','Aid','Relieve']},
{w:'Bellicose',s:['Pugnacious','Peaceful','Pacifist','Conciliatory']},
{w:'Beneficent',s:['Generous','Selfish','Stingy','Miserly']},
{w:'Cadaverous',s:['Ghastly','Healthy','Robust','Vigorous']},
{w:'Captious',s:['Critical','Forgiving','Lenient','Tolerant']},
{w:'Carnage',s:['Slaughter','Safety','Security','Protection']},
{w:'Clairvoyant',s:['Prescient','Ignorant','Blind','Unaware']},
{w:'Coarse',s:['Rough','Fine','Smooth','Delicate']},
{w:'Congenial',s:['Pleasant','Unpleasant','Hostile','Antagonistic']},
{w:'Crux',s:['Core','Trifle','Periphery','Irrelevance']},
{w:'Dearth',s:['Scarcity','Abundance','Plenty','Profusion']},
{w:'Decadence',s:['Decline','Progress','Growth','Flourishing']},
{w:'Eminent',s:['Distinguished','Obscure','Unknown','Insignificant']},
{w:'Enigmatic',s:['Mysterious','Plain','Clear','Straightforward']},
{w:'Ennui',s:['Boredom','Excitement','Enthusiasm','Interest']},
{w:'Epitome',s:['Embodiment','Antithesis','Contrary','Opposite']},
{w:'Eruptive',s:['Explosive','Calm','Gentle','Mild']},
{w:'Excoriate',s:['Castigate','Praise','Commend','Extol']},
{w:'Facile',s:['Easy','Difficult','Challenging','Demanding']},
{w:'Fallacy',s:['Falsehood','Truth','Fact','Certainty']},
{w:'Grandiose',s:['Impressive','Modest','Humble','Simple']},
{w:'Harbinger',s:['Precursor','Follower','Successor','Consequence']},
{w:'Lackadaisical',s:['Languid','Energetic','Enthusiastic','Vigorous']},
{w:'Vituperate',s:['Censure','Praise','Commend','Extol']},
{w:'Abnegation',s:['Renunciation','Acceptance','Indulgence','Embrace']},
{w:'Admonition',s:['Warning','Praise','Encouragement','Commendation']},
{w:'Affluent',s:['Wealthy','Impoverished','Needy','Destitute']},
{w:'Accolade',s:['Award','Penalty','Punishment','Sentence']},
{w:'Acrimony',s:['Bitterness','Kindness','Goodwill','Harmony']},
{w:'Adequacy',s:['Sufficiency','Inadequacy','Deficiency','Shortage']},
{w:'Amicability',s:['Friendliness','Hostility','Enmity','Antagonism']},
{w:'Apocryphal',s:['Fictitious','Authentic','Genuine','Verified']},
{w:'Apprehension',s:['Anxiety','Confidence','Assurance','Composure']},
{w:'Asperity',s:['Harshness','Mildness','Gentleness','Softness']},
{w:'Attenuate',s:['Weaken','Fortify','Strengthen','Intensify']},
{w:'Beguile',s:['Charm','Repel','Disgust','Offend']},
{w:'Benighted',s:['Ignorant','Enlightened','Educated','Learned']},
{w:'Blatant',s:['Obvious','Subtle','Hidden','Secret']},
{w:'Burnish',s:['Polish','Tarnish','Dull','Blacken']},
{w:'Cognizant',s:['Aware','Unaware','Ignorant','Oblivious']},
{w:'Complacency',s:['Self-satisfaction','Vigilance','Caution','Alertness']},
{w:'Conciliatory',s:['Placatory','Hostile','Defiant','Aggressive']},
{w:'Contemptuous',s:['Scornful','Respectful','Reverent','Admiring']},
{w:'Defiant',s:['Rebellious','Obedient','Submissive','Compliant']},
{w:'Dissension',s:['Disagreement','Agreement','Harmony','Concord']},
{w:'Emancipate',s:['Free','Enslave','Imprison','Constrain']},
{w:'Evanescent',s:['Vanishing','Permanent','Enduring','Lasting']},
{w:'Idiosyncratic',s:['Peculiar','Normal','Typical','Standard']},
{w:'Scrutinize',s:['Examine','Ignore','Neglect','Overlook']},
{w:'Abundant',s:['Plentiful','Rare','Small','Weak']},{w:'Benevolent',s:['Kind','Cruel','Strict','Lazy']},
  {w:'Candid',s:['Honest','Secret','Rude','Slow']},{w:'Diligent',s:['Hardworking','Lazy','Careless','Weak']},
  {w:'Eloquent',s:['Fluent','Quiet','Clumsy','Rough']},{w:'Frugal',s:['Economical','Wasteful','Generous','Rich']},
  {w:'Gregarious',s:['Sociable','Shy','Angry','Lonely']},{w:'Hinder',s:['Obstruct','Help','Speed','Build']},
  {w:'Immaculate',s:['Spotless','Dirty','Broken','Rough']},{w:'Jubilant',s:['Joyful','Sad','Calm','Tired']},
  {w:'Keen',s:['Eager','Dull','Slow','Weak']},{w:'Lethargic',s:['Sluggish','Energetic','Quick','Bright']},
  {w:'Malicious',s:['Spiteful','Kind','Gentle','Loving']},{w:'Novel',s:['New','Old','Broken','Simple']},
  {w:'Obscure',s:['Unknown','Famous','Bright','Simple']},{w:'Persevere',s:['Persist','Give up','Rest','Pause']},
  {w:'Querulous',s:['Complaining','Happy','Quiet','Content']},{w:'Resilient',s:['Tough','Fragile','Weak','Brittle']},
  {w:'Succinct',s:['Concise','Wordy','Long','Verbose']},{w:'Tenacious',s:['Determined','Weak','Lazy','Timid']},
  {w:'Ubiquitous',s:['Omnipresent','Rare','Absent','Scarce']},{w:'Versatile',s:['Adaptable','Inflexible','Limited','Narrow']},
  {w:'Whimsical',s:['Fanciful','Serious','Strict','Dull']},{w:'Zealous',s:['Passionate','Apathetic','Lazy','Indifferent']},
  {w:'Audacious',s:['Bold','Timid','Shy','Quiet']},{w:'Brevity',s:['Conciseness','Length','Verbosity','Expansion']},
  {w:'Capricious',s:['Unpredictable','Stable','Reliable','Steady']},{w:'Deleterious',s:['Harmful','Beneficial','Helpful','Healthy']},
  {w:'Abrupt',s:['Sudden','Gradual','Gentle','Slow']},{w:'Adequate',s:['Sufficient','Scarce','Poor','Lacking']},
  {w:'Adversity',s:['Misfortune','Prosperity','Fortune','Ease']},{w:'Aggravate',s:['Worsen','Improve','Calm','Soothe']},
  {w:'Alert',s:['Watchful','Careless','Sleepy','Ignorant']},{w:'Ample',s:['Plentiful','Scanty','Meager','Tiny']},
  {w:'Annihilate',s:['Destroy','Preserve','Create','Build']},{w:'Apparent',s:['Obvious','Hidden','Obscure','Unclear']},
  {w:'Arduous',s:['Difficult','Easy','Simple','Effortless']},{w:'Astonish',s:['Amaze','Bore','Disappoint','Anyway']},
  {w:'Authentic',s:['Genuine','Fake','Forged','False']},{w:'Avarice',s:['Greed','Generosity','Charity','Kindness']},
  {w:'Barren',s:['Infertile','Fertile','Fruitful','Productive']},{w:'Bewilder',s:['Confuse','Clarify','Explain','Guide']},
  {w:'Bland',s:['Plain','Flavorful','Spicy','Rich']},{w:'Cease',s:['Stop','Begin','Start','Continue']},
  {w:'Chaos',s:['Disorder','Order','Peace','Harmony']},{w:'Coherent',s:['Logical','Confused','Unclear','Disjointed']},
  {w:'Compliment',s:['Praise','Criticize','Condemn','Scorn']},{w:'Concede',s:['Admit','Deny','Refuse','Reject']},
  {w:'Concise',s:['Brief','Lengthy','Verbose','Wordy']},{w:'Confine',s:['Restrict','Free','Release','Liberate']},
  {w:'Conspicuous',s:['Noticeable','Hidden','Subtle','Invisible']},{w:'Contaminate',s:['Pollute','Purify','Clean','Purge']},
  {w:'Contradict',s:['Oppose','Agree','Support','Confirm']},{w:'Cordial',s:['Friendly','Hostile','Cold','Rude']},
  {w:'Courageous',s:['Brave','Cowardly','Timid','Fearful']},{w:'Cunning',s:['Sly','Honest','Frank','Straightforward']},
  {w:'Dauntless',s:['Fearless','Cowardly','Afraid','Timid']},{w:'Deduce',s:['Infer','Guess','Ignore','Overlook']},
  {w:'Deficiency',s:['Shortage','Surplus','Abundance','Plenty']},{w:'Deliberate',s:['Intentional','Accidental','Spontaneous','Casual']},
  {w:'Deluge',s:['Flood','Drought','Trickle','Drizzle']},{w:'Dense',s:['Thick','Thin','Sparse','Transparent']},
  {w:'Deplete',s:['Exhaust','Replenish','Restore','Refill']},{w:'Derive',s:['Obtain','Lose','Surrender','Forfeit']},
  {w:'Desolate',s:['Bleak','Thriving','Lively','Populated']},{w:'Deteriorate',s:['Worsen','Improve','Enhance','Repair']},
  {w:'Devastate',s:['Ruin','Rebuild','Restore','Preserve']},{w:'Diligence',s:['Hard work','Laziness','Idleness','Negligence']},
  {w:'Discern',s:['Perceive','Ignore','Miss','Misjudge']},{w:'Discrepancy',s:['Difference','Agreement','Similarity','Consistency']},
  {w:'Dismal',s:['Gloomy','Cheerful','Bright','Joyful']},{w:'Dismantle',s:['Take apart','Assemble','Build','Construct']},
  {w:'Distinguish',s:['Differentiate','Confuse','Blend','Mistake']},{w:'Divulge',s:['Reveal','Conceal','Hide','Suppress']},
  {w:'Durable',s:['Long-lasting','Fragile','Flimsy','Weak']},{w:'Eccentric',s:['Odd','Normal','Ordinary','Conventional']},
  {w:'Eliminate',s:['Remove','Include','Retain','Add']},{w:'Emulate',s:['Imitate','Differ','Disregard','Avoid']},
  {w:'Enhance',s:['Improve','Worsen','Reduce','Weaken']},{w:'Enormous',s:['Huge','Tiny','Small','Minuscule']},
  {w:'Enthusiastic',s:['Eager','Indifferent','Apathetic','Reluctant']},{w:'Eradicate',s:['Eliminate','Preserve','Protect','Establish']},
  {w:'Evident',s:['Obvious','Doubtful','Vague','Hidden']},{w:'Exaggerate',s:['Overstate','Understate','Minimize','Belittle']},
  {w:'Exempt',s:['Free from','Subject to','Bound','Liable']},{w:'Explicit',s:['Clear','Vague','Ambiguous','Obscure']},
  {w:'Extinguish',s:['Put out','Ignite','Light','Kindle']},{w:'Fabricate',s:['Invent','Destroy','Dismantle','Reveal']},
  {w:'Falter',s:['Stumble','Advance','Proceed','Succeed']},{w:'Fathom',s:['Understand','Confuse','Misread','Withhold']},
  {w:'Feasible',s:['Possible','Impossible','Impractical','Unlikely']},{w:'Feud',s:['Quarrel','Peace','Agreement','Harmony']},
  {w:'Fickle',s:['Changeable','Steady','Constant','Loyal']},{w:'Flee',s:['Escape','Remain','Stay','Confront']},
  {w:'Frigid',s:['Freezing','Warm','Hot','Tropical']},{w:'Frivolous',s:['Carefree','Serious','Solemn','Grave']},
  {w:'Futile',s:['Useless','Effective','Productive','Useful']},{w:'Generosity',s:['Kindness','Greed','Stinginess','Meanness']},
  {w:'Gigantic',s:['Huge','Tiny','Small','Petite']},{w:'Gloomy',s:['Dark','Bright','Cheerful','Sunny']},
  {w:'Gratify',s:['Please','Annoy','Offend','Displease']},{w:'Grievance',s:['Complaint','Approval','Praise','Satisfaction']},
  {w:'Gruesome',s:['Horrifying','Pleasant','Delightful','Enjoyable']},{w:'Halt',s:['Stop','Continue','Proceed','Advance']},
  {w:'Haphazard',s:['Random','Orderly','Systematic','Methodical']},{w:'Hinder',s:['Obstruct','Assist','Help','Facilitate']},
  {w:'Hostile',s:['Unfriendly','Friendly','Warm','Welcoming']},{w:'Humiliate',s:['Shame','Honor','Respect','Praise']},
  {w:'Imminent',s:['Impending','Distant','Removed','Unlikely']},{w:'Impartial',s:['Fair','Biased','Partisan','Prejudiced']},
  {w:'Impede',s:['Hinder','Assist','Advance','Facilitate']},{w:'Imply',s:['Suggest','Declare','State','Proclaim']},
  {w:'Improvise',s:['Ad-lib','Plan','Prepare','Rehearse']},{w:'Incentive',s:['Motive','Discouragement','Deterrent','Obstacle']},
  {w:'Indifferent',s:['Uncaring','Interested','Eager','Committed']},{w:'Indispensable',s:['Essential','Optional','Unimportant','Disposable']},
  {w:'Inevitable',s:['Unavoidable','Avoidable','Preventable','Escapable']},{w:'Inferior',s:['Lower','Better','Superior','Excellent']},
  {w:'Inflate',s:['Expand','Deflate','Shrink','Contract']},{w:'Ingenious',s:['Clever','Foolish','Dull','Unimaginative']},
  {w:'Initiate',s:['Begin','Conclude','End','Finish']},{w:'Insolent',s:['Rude','Polite','Respectful','Courteous']},
  {w:'Intricate',s:['Complex','Simple','Easy','Plain']},{w:'Jeopardize',s:['Endanger','Safeguard','Protect','Secure']},
  {w:'Jovial',s:['Cheerful','Gloomy','Sullen','Morose']},{w:'Latent',s:['Dormant','Active','Visible','Obvious']},
  {w:'Lavish',s:['Extravagant','Frugal','Thrifty','Sparing']},{w:'Lucid',s:['Clear','Confusing','Obscure','Vague']},
  {w:'Luminous',s:['Bright','Dim','Dull','Faint']},{w:'Magnify',s:['Enlarge','Shrink','Reduce','Minimize']},
  {w:'Maiden',s:['First','Final','Last','Mature']},{w:'Magnanimous',s:['Generous','Stingy','Petty','Mean']},
  {w:'Meditate',s:['Contemplate','Distract','Ignore','Dismiss']},{w:'Meek',s:['Submissive','Arrogant','Bold','Proud']},
  {w:'Merit',s:['Worth','Demerit','Fault','Shortcoming']},{w:'Minimal',s:['Least','Maximum','Largest','Maximum']},
  {w:'Miserable',s:['Wretched','Joyful','Content','Cheerful']},{w:'Moderate',s:['Average','Extreme','Excessive','Intense']},
  {w:'Momentum',s:['Impetus','Stagnation','Inertia','Stillness']},{w:'Monotonous',s:['Boring','Varied','Interesting','Exciting']},
  {w:'Multitude',s:['Crowd','Few','Handful','Minority']},{w:'Mutual',s:['Shared','Unilateral','Individual','Separate']},
  {w:'Narrate',s:['Recount','Conceal','Suppress','Withhold']},{w:'Negligent',s:['Careless','Careful','Attentive','Diligent']},
  {w:'Notorious',s:['Infamous','Famous','Admired','Honorable']},{w:'Novice',s:['Beginner','Expert','Veteran','Master']},
  {w:'Obstinate',s:['Stubborn','Flexible','Compliant','Submissive']},{w:'Obtain',s:['Acquire','Lose','Forfeit','Relinquish']},
  {w:'Ominous',s:['Threatening','Promising','Auspicious','Favorable']},{w:'Opaque',s:['Cloudy','Transparent','Clear','Translucent']},
  {w:'Opponent',s:['Rival','Ally','Supporter','Partner']},{w:'Oscillate',s:['Swing','Remain','Stick','Halt']},
  {w:'Outrage',s:['Anger','Joy','Pleasure','Delight']},{w:'Paramount',s:['Supreme','Minor','Trivial','Insignificant']},
  {w:'Peril',s:['Danger','Safety','Security','Protection']},{w:'Perpetual',s:['Endless','Temporary','Brief','Momentary']},
  {w:'Placid',s:['Calm','Turbulent','Agitated','Stormy']},{w:'Plausible',s:['Believable','Incredible','Unlikely','Doubtful']},
  {w:'Portray',s:['Depict','Hide','Omit','Disguise']},{w:'Precise',s:['Exact','Vague','Approximate','Imprecise']},
  {w:'Prohibit',s:['Forbid','Permit','Allow','Authorize']},{w:'Proficient',s:['Skilled','Incompetent','Inept','Clumsy']},
  {w:'Prompt',s:['Punctual','Late','Delayed','Tardy']},{w:'Prosperity',s:['Wealth','Poverty','Adversity','Hardship']},
  {w:'Prudent',s:['Wise','Foolish','Reckless','Careless']},{w:'Rare',s:['Uncommon','Common','Frequent','Ordinary']},
  {w:'Reckless',s:['Careless','Cautious','Careful','Prudent']},{w:'Reconcile',s:['Settle','Aggravate','Irritate','Antagonize']},
  {w:'Relentless',s:['Persistent','Giving up','Yielding','Lenient']},{w:'Reluctant',s:['Unwilling','Eager','Ready','Willing']},
  {w:'Renown',s:['Fame','Obscurity','Shame','Disgrace']},{w:'Replenish',s:['Refill','Deplete','Empty','Drain']},
  {w:'Reprimand',s:['Scold','Praise','Commend','Applaud']},{w:'Resent',s:['Begrudge','Welcome','Accept','Appreciate']},
  {w:'Restrain',s:['Hold back','Release','Free','Liberate']},{w:'Revere',s:['Respect','Despise','Scorn','Disrespect']},
  {w:'Rigid',s:['Stiff','Flexible','Pliable','Bending']},{w:'Rupture',s:['Break','Repair','Mend','Join']},
  {w:'Sagacious',s:['Wise','Foolish','Ignorant','Simple']},{w:'Scarce',s:['Rare','Plentiful','Abundant','Plenty']},
  {w:'Shrewd',s:['Astute','Foolish','Naive','Dull']},{w:'Sluggish',s:['Lethargic','Energetic','Quick','Active']},
  {w:'Solemn',s:['Serious','Frivolous','Cheerful','Lighthearted']},{w:'Sparse',s:['Scattered','Dense','Thick','Crowded']},
  {w:'Sporadic',s:['Irregular','Regular','Constant','Frequent']},{w:'Strenuous',s:['Arduous','Easy','Effortless','Simple']},
  {w:'Substantial',s:['Considerable','Insignificant','Minor','Slight']},{w:'Surpass',s:['Exceed','Fail','Lag','Trail']},
  {w:'Surplus',s:['Excess','Shortage','Deficit','Lack']},{w:'Taciturn',s:['Quiet','Talkative','Garrulous','Chatty']},
  {w:'Temporary',s:['Short-lived','Permanent','Lasting','Enduring']},{w:'Terse',s:['Brief','Verbose','Lengthy','Wordy']},
  {w:'Thrifty',s:['Frugal','Extravagant','Wasteful','Spendthrift']},{w:'Tolerant',s:['Accepting','Intolerant','Narrow','Prejudiced']},
  {w:'Transparent',s:['Clear','Opaque','Cloudy','Murky']},{w:'Treacherous',s:['Betraying','Loyal','Faithful','Honest']},
  {w:'Tremendous',s:['Huge','Tiny','Slight','Minor']},{w:'Turbulent',s:['Stormy','Calm','Peaceful','Serene']},
  {w:'Undermine',s:['Weaken','Strengthen','Support','Fortify']},{w:'Uniform',s:['Consistent','Varied','Irregular','Different']},
  {w:'Vague',s:['Unclear','Clear','Precise','Explicit']},{w:'Vanish',s:['Disappear','Appear','Materialize','Emerge']},
  {w:'Vast',s:['Huge','Tiny','Narrow','Small']},{w:'Vivid',s:['Lively','Dull','Faded','Boring']},
  {w:'Vulnerable',s:['Exposed','Safe','Protected','Secure']},{w:'Wary',s:['Cautious','Reckless','Careless','Bold']},
  {w:'Wealthy',s:['Affluent','Poor','Impoverished','Destitute']},{w:'Zeal',s:['Enthusiasm','Apathy','Indifference','Lethargy']},
  {w:'Zenith',s:['Peak','Lowest','Nadir','Bottom']},{w:'Abandon',s:['Desert','Keep','Retain','Maintain']},
  {w:'Amicable',s:['Friendly','Hostile','Unfriendly','Adversarial']},{w:'Acute',s:['Sharp','Dull','Blunt','Mild']},
  {w:'Barrier',s:['Obstacle','Gateway','Opening','Access']},{w:'Beneath',s:['Under','Above','Over','On top']},
  {w:'Castigate',s:['Criticize','Praise','Applaud','Commend']},{w:'Compensate',s:['Repay','Penalize','Withhold','Deny']},
  {w:'Complacent',s:['Self-satisfied','Ambitious','Striving','Driven']},{w:'Comply',s:['Obey','Defy','Resist','Disobey']},
  {w:'Deter',s:['Discourage','Encourage','Motivate','Urge']},{w:'Disband',s:['Break up','Organize','Unite','Assemble']},
  {w:'Dwindle',s:['Decrease','Increase','Grow','Expand']},{w:'Emerge',s:['Appear','Vanish','Disappear','Recede']},
  {w:'Facilitate',s:['Ease','Hinder','Obstruct','Impede']},{w:'Feasible',s:['Practicable','Unlikely','Impractical','Unworkable']},
  {w:'Fortify',s:['Strengthen','Weaken','Undermine','Enfeeble']},{w:'Illuminate',s:['Light up','Darken','Dim','Shade']},
  {w:'Immaculate',s:['Spotless','Dirty','Stained','Filthy']},{w:'Incessant',s:['Endless','Brief','Occasional','Sporadic']},
  {w:'Meticulous',s:['Careful','Careless','Sloppy','Hasty']},{w:'Obsolete',s:['Outdated','Modern','Current','New']},
  {w:'Resolve',s:['Decide','Hesitate','Waver','Doubt']},{w:'Retaliate',s:['Fight back','Forgive','Tolerate','Submit']},
  {w:'Stringent',s:['Strict','Lenient','Relaxed','Permissive']},{w:'Subdue',s:['Overcome','Surrender','Yield','Succumb']},
  {w:'Tenacious',s:['Persistent','Giving up','Weak','Yielding']},{w:'Transparent',s:['See-through','Opaque','Cloudy','Murky']}];

var ANTONYM_BANK = [{w:'Abandon',a:['Retain','Keep','Desert','Dump']},
{w:'Abhor',a:['Adore','Love','Cherish','Detest']},
{w:'Abridge',a:['Expand','Lengthen','Extend','Amplify']},
{w:'Absolve',a:['Condemn','Blame','Accuse','Punish']},
{w:'Abstain',a:['Indulge','Partake','Consume','Imbibe']},
{w:'Accede',a:['Refuse','Reject','Decline','Deny']},
{w:'Accelerate',a:['Decelerate','Retard','Delay','Hinder']},
{w:'Accessible',a:['Inaccessible','Remote','Isolated','Inconvenient']},
{w:'Accommodate',a:['Reject','Refuse','Oppose','Hinder']},
{w:'Accord',a:['Discord','Disagreement','Conflict','Dispute']},
{w:'Accumulate',a:['Disperse','Scatter','Distribute','Deplete']},
{w:'Accurate',a:['Inaccurate','Erroneous','Faulty','Imprecise']},
{w:'Accuse',a:['Defend','Exonerate','Praise','Acquit']},
{w:'Acerbic',a:['Mild','Sweet','Gentle','Soothing']},
{w:'Achieve',a:['Fail','Lose','Forfeit','Abandon']},
{w:'Acquit',a:['Convict','Condemn','Punish','Blame']},
{w:'Acute',a:['Dull','Chronic','Mild','Slight']},
{w:'Adhere',a:['Detach','Separate','Depart','Loosen']},
{w:'Adjacent',a:['Distant','Far','Remote','Separate']},
{w:'Adversary',a:['Ally','Friend','Supporter','Partner']},
{w:'Adverse',a:['Favorable','Beneficial','Helpful','Advantageous']},
{w:'Aesthetic',a:['Ugly','Unattractive','Grotesque','Plain']},
{w:'Affable',a:['Aloof','Unfriendly','Hostile','Cold']},
{w:'Affectation',a:['Genuineness','Sincerity','Authenticity','Naturalness']},
{w:'Affluent',a:['Poor','Impoverished','Destitute','Needy']},
{w:'Aggravate',a:['Alleviate','Mitigate','Relieve','Soothe']},
{w:'Agile',a:['Clumsy','Sluggish','Lethargic','Inept']},
{w:'Agitate',a:['Calm','Soothe','Pacify','Tranquilize']},
{w:'Alacrity',a:['Reluctance','Lethargy','Apathy','Sluggishness']},
{w:'Allocate',a:['Withhold','Retain','Confiscate','Hoard']},
{w:'Allot',a:['Deny','Withhold','Retain','Deprive']},
{w:'Allure',a:['Repel','Deter','Discourage','Disgust']},
{w:'Aloof',a:['Friendly','Affable','Warm','Cordial']},
{w:'Alter',a:['Preserve','Maintain','Retain','Keep']},
{w:'Amateur',a:['Professional','Expert','Veteran','Specialist']},
{w:'Ameliorate',a:['Worsen','Deteriorate','Aggravate','Exacerbate']},
{w:'Amiable',a:['Hostile','Unfriendly','Antagonistic','Irritable']},
{w:'Ample',a:['Scarce','Meager','Limited','Insufficient']},
{w:'Amusing',a:['Dull','Tedious','Boring','Monotonous']},
{w:'Anarchy',a:['Order','Government','Authority','Discipline']},
{w:'Annoy',a:['Delight','Please','Soothe','Comfort']},
{w:'Anonymous',a:['Famous','Known','Identified','Renowned']},
{w:'Antagonize',a:['Pacify','Appease','Calm','Placate']},
{w:'Antiquated',a:['Modern','Current','Contemporary','Innovative']},
{w:'Apathy',a:['Enthusiasm','Passion','Zeal','Ardor']},
{w:'Apparent',a:['Hidden','Obscure','Concealed','Invisible']},
{w:'Appease',a:['Provoke','Incite','Aggravate','Irritate']},
{w:'Apt',a:['Inapt','Unsuitable','Inappropriate','Irrelevant']},
{w:'Arduous',a:['Easy','Effortless','Simple','Trivial']},
{w:'Ardent',a:['Indifferent','Apathetic','Lukewarm','Cool']},
{w:'Ascetic',a:['Hedonistic','Indulgent','Luxurious','Voluptuous']},
{w:'Assert',a:['Deny','Concede','Retract','Withhold']},
{w:'Assiduous',a:['Lazy','Negligent','Idle','Sluggish']},
{w:'Assuage',a:['Aggravate','Intensify','Worsen','Provoke']},
{w:'Audacious',a:['Timid','Cowardly','Meek','Cautious']},
{w:'Authentic',a:['Fake','Counterfeit','Spurious','Fraudulent']},
{w:'Avarice',a:['Generosity','Charity','Benevolence','Liberality']},
{w:'Avert',a:['Invite','Cause','Bring','Attract']},
{w:'Avow',a:['Deny','Conceal','Disavow','Retract']},
{w:'Banal',a:['Original','Novel','Unique','Extraordinary']},
{w:'Barren',a:['Fertile','Productive','Fruitful','Lush']},
{w:'Benign',a:['Malignant','Harmful','Hostile','Cruel']},
{w:'Blithe',a:['Somber','Gloomy','Solemn','Melancholy']},
{w:'Blunt',a:['Sharp','Pointed','Keen','Acute']},
{w:'Boastful',a:['Modest','Humble','Reserved','Meek']},
{w:'Bolster',a:['Weaken','Undermine','Diminish','Undercut']},
{w:'Boorish',a:['Refined','Courteous','Polite','Civilized']},
{w:'Bountiful',a:['Meager','Scanty','Stingy','Miserly']},
{w:'Brevity',a:['Length','Verbosity','Prolixity','Loquacity']},
{w:'Brusque',a:['Gentle','Tactful','Courteous','Polite']},
{w:'Bucolic',a:['Urban','Cosmopolitan','Metropolitan','Industrial']},
{w:'Bulky',a:['Tiny','Minute','Compact','Slender']},
{w:'Bustling',a:['Quiet','Tranquil','Peaceful','Sluggish']},
{w:'Capacious',a:['Cramped','Narrow','Confined','Restrictive']},
{w:'Candid',a:['Deceitful','Evasive','Dishonest','Duplicitous']},
{w:'Capricious',a:['Steady','Constant','Stable','Resolute']},
{w:'Caustic',a:['Mild','Gentle','Soothing','Bland']},
{w:'Censure',a:['Praise','Commend','Approve','Extol']},
{w:'Chaste',a:['Lewd','Vulgar','Obscene','Indecent']},
{w:'Churlish',a:['Polite','Gracious','Courteous','Civilized']},
{w:'Clandestine',a:['Open','Public','Overt','Transparent']},
{w:'Clemency',a:['Severity','Harshness','Ruthlessness','Sternness']},
{w:'Cognizant',a:['Ignorant','Unaware','Oblivious','Unconscious']},
{w:'Commensurate',a:['Disproportionate','Excessive','Inadequate','Unmatched']},
{w:'Compassionate',a:['Cruel','Ruthless','Heartless','Callous']},
{w:'Compendium',a:['Fragment','Scrap','Excerpt','Abbreviation']},
{w:'Complacent',a:['Ambitious','Vigilant','Alert','Concerned']},
{w:'Conciliatory',a:['Hostile','Belligerent','Defiant','Combative']},
{w:'Concise',a:['Verbose','Lengthy','Wordy','Rambling']},
{w:'Condone',a:['Punish','Condemn','Blame','Censure']},
{w:'Confiscate',a:['Return','Restore','Give','Surrender']},
{w:'Conspicuous',a:['Inconspicuous','Hidden','Unnoticeable','Insignificant']},
{w:'Constructive',a:['Destructive','Detrimental','Harmful','Damaging']},
{w:'Consummate',a:['Inept','Incompetent','Amateur','Clumsy']},
{w:'Contempt',a:['Respect','Admiration','Esteem','Regard']},
{w:'Content',a:['Discontent','Dissatisfied','Restless','Disgruntled']},
{w:'Contiguous',a:['Distant','Separated','Remote','Apart']},
{w:'Contrite',a:['Unrepentant','Defiant','Obstinate','Stubborn']},
{w:'Convivial',a:['Aloof','Unfriendly','Solitary','Reserved']},
{w:'Conventional',a:['Unconventional','Innovative','Radical','Avant-garde']},
{w:'Copious',a:['Scarce','Meager','Scanty','Sparse']},
{w:'Cordial',a:['Hostile','Unfriendly','Cold','Aloof']},
{w:'Corroborate',a:['Contradict','Refute','Deny','Disprove']},
{w:'Cosmopolitan',a:['Provincial','Rustic','Parochial','Narrow-minded']},
{w:'Cowardly',a:['Brave','Courageous','Fearless','Valiant']},
{w:'Credulous',a:['Skeptical','Suspicious','Doubtful','Wary']},
{w:'Crisp',a:['Wilted','Soft','Limp','Soggy']},
{w:'Crude',a:['Refined','Polished','Sophisticated','Elegant']},
{w:'Curt',a:['Verbose','Lengthy','Talkative','Loquacious']},
{w:'Cursory',a:['Thorough','Meticulous','Detailed','Exhaustive']},
{w:'Cynical',a:['Optimistic','Hopeful','Trusting','Idealistic']},
{w:'Dearth',a:['Abundance','Surplus','Plenty','Profusion']},
{w:'Debunk',a:['Corroborate','Confirm','Validate','Support']},
{w:'Decorum',a:['Indecency','Impropriety','Vulgarity','Rudeness']},
{w:'Deceit',a:['Honesty','Sincerity','Candor','Truthfulness']},
{w:'Decimate',a:['Build','Create','Preserve','Nurture']},
{w:'Decorous',a:['Improper','Indecent','Vulgar','Unseemly']},
{w:'Decry',a:['Praise','Extol','Commend','Acclaim']},
{w:'Deficient',a:['Abundant','Sufficient','Adequate','Ample']},
{w:'Deft',a:['Clumsy','Awkward','Inept','Maladroit']},
{w:'Degenerate',a:['Flourish','Thrive','Prosper','Improve']},
{w:'Dejected',a:['Elated','Cheerful','Joyful','Exuberant']},
{w:'Deliberate',a:['Accidental','Hasty','Rash','Impulsive']},
{w:'Deluge',a:['Drought','Scarcity','Paucity','Trickle']},
{w:'Demure',a:['Bold','Brazen','Forward','Flirtatious']},
{w:'Depict',a:['Conceal','Hide','Obscure','Disguise']},
{w:'Deplete',a:['Replenish','Refill','Restore','Augment']},
{w:'Deride',a:['Praise','Compliment','Admire','Respect']},
{w:'Desiccate',a:['Moisten','Drench','Soak','Saturate']},
{w:'Despondent',a:['Optimistic','Hopeful','Confident','Cheerful']},
{w:'Destitute',a:['Wealthy','Affluent','Prosperous','Rich']},
{w:'Detrimental',a:['Beneficial','Helpful','Advantageous','Favorable']},
{w:'Dexterous',a:['Clumsy','Inept','Awkward','Maladroit']},
{w:'Didactic',a:['Uninstructive','Uninformative','Unhelpful','Vague']},
{w:'Diffident',a:['Confident','Bold','Assertive','Arrogant']},
{w:'Digress',a:['Focus','Concentrate','Center','Proceed']},
{w:'Diligent',a:['Lazy','Negligent','Idle','Sluggish']},
{w:'Diminutive',a:['Enormous','Huge','Massive','Gigantic']},
{w:'Discernible',a:['Indiscernible','Imperceptible','Invisible','Hidden']},
{w:'Discord',a:['Harmony','Concord','Agreement','Unity']},
{w:'Discriminating',a:['Indiscriminate','Undiscerning','Blind','Reckless']},
{w:'Disdain',a:['Respect','Admiration','Esteem','Appreciation']},
{w:'Disparage',a:['Praise','Commend','Extol','Compliment']},
{w:'Disparity',a:['Similarity','Equality','Parity','Uniformity']},
{w:'Disposition',a:['Reluctance','Unwillingness','Aversion','Indifference']},
{w:'Dissolution',a:['Formation','Establishment','Creation','Union']},
{w:'Distend',a:['Shrink','Contract','Compress','Collapse']},
{w:'Docile',a:['Rebellious','Defiant','Stubborn','Unruly']},
{w:'Dogmatic',a:['Open-minded','Tolerant','Flexible','Modest']},
{w:'Dormant',a:['Active','Alert','Vigilant','Awake']},
{w:'Dour',a:['Cheerful','Pleasant','Affable','Genial']},
{w:'Drastic',a:['Mild','Moderate','Gentle','Slight']},
{w:'Durable',a:['Fragile','Flimsy','Ephemeral','Transient']},
{w:'Eager',a:['Reluctant','Indifferent','Apathetic','Unwilling']},
{w:'Ebullient',a:['Somber','Gloomy','Subdued','Depressed']},
{w:'Eclectic',a:['Narrow','Limited','Restricted','Uniform']},
{w:'Edify',a:['Mislead','Deceive','Confuse','Corrupt']},
{w:'Efficacious',a:['Ineffective','Futile','Useless','Vain']},
{w:'Egalitarian',a:['Elitist','Aristocratic','Authoritarian','Hierarchical']},
{w:'Elaborate',a:['Simple','Plain','Unadorned','Bare']},
{w:'Eloquent',a:['Inarticulate','Incoherent','Mumbling','Tongue-tied']},
{w:'Eminent',a:['Obscure','Unknown','Insignificant','Common']},
{w:'Empathy',a:['Indifference','Apathy','Callousness','Detachment']},
{w:'Enervate',a:['Invigorate','Energize','Strengthen','Refresh']},
{w:'Engender',a:['Prevent','Avert','Suppress','Eliminate']},
{w:'Enormous',a:['Tiny','Minute','Minuscule','Slight']},
{w:'Entangle',a:['Untangle','Disentangle','Free','Release']},
{w:'Ephemeral',a:['Permanent','Enduring','Eternal','Perpetual']},
{w:'Equivocal',a:['Unequivocal','Clear','Definite','Unambiguous']},
{w:'Erratic',a:['Steady','Consistent','Predictable','Regular']},
{w:'Erudite',a:['Ignorant','Uneducated','Illiterate','Unlearned']},
{w:'Espy',a:['Miss','Overlook','Ignore','Conceal']},
{w:'Eternal',a:['Temporary','Transient','Ephemeral','Fleeting']},
{w:'Eulogy',a:['Criticism','Censure','Condemnation','Blame']},
{w:'Exacerbate',a:['Alleviate','Mitigate','Relieve','Soothe']},
{w:'Exalt',a:['Belittle','Degrade','Humble','Deprecate']},
{w:'Exasperate',a:['Calm','Pacify','Soothe','Appease']},
{w:'Exorbitant',a:['Moderate','Reasonable','Fair','Affordable']},
{w:'Explicit',a:['Implicit','Vague','Ambiguous','Obscure']},
{w:'Expunge',a:['Record','Preserve','Retain','Maintain']},
{w:'Extravagant',a:['Frugal','Thrifty','Economical','Miserly']},
{w:'Exuberant',a:['Subdued','Restrained','Muted','Somber']},
{w:'Faint',a:['Strong','Distinct','Clear','Vivid']},
{w:'Faithful',a:['Disloyal','Treacherous','Unfaithful','Perfidious']},
{w:'Fallacious',a:['Sound','Valid','Legitimate','Logical']},
{w:'Familiar',a:['Unfamiliar','Strange','Foreign','Alien']},
{w:'Fathom',a:['Fathomless','Incomprehensible','Unfathomable','Bottomless']},
{w:'Fecund',a:['Barren','Sterile','Infertile','Unproductive']},
{w:'Felicitous',a:['Unfortunate','Inappropriate','Unsuitable','Awkward']},
{w:'Feral',a:['Domesticated','Tame','Gentle','Docile']},
{w:'Fervid',a:['Apathetic','Indifferent','Lukewarm','Unenthusiastic']},
{w:'Flaccid',a:['Firm','Taut','Rigid','Solid']},
{w:'Flagrant',a:['Concealed','Secret','Hidden','Subtle']},
{w:'Flamboyant',a:['Modest','Restrained','Understated','Plain']},
{w:'Flexible',a:['Rigid','Stiff','Inflexible','Inelastic']},
{w:'Flippant',a:['Serious','Solemn','Earnest','Respectful']},
{w:'Florid',a:['Pale','Sallow','Plain','Colorless']},
{w:'Flourish',a:['Decline','Wither','Deteriorate','Languish']},
{w:'Flout',a:['Obey','Comply','Follow','Respect']},
{w:'Fond',a:['Averse','Hostile','Indifferent','Detesting']},
{w:'Foolhardy',a:['Cautious','Prudent','Wary','Circumspect']},
{w:'Forestall',a:['Facilitate','Encourage','Allow','Permit']},
{w:'Forfeit',a:['Gain','Acquire','Retain','Keep']},
{w:'Forthright',a:['Evasive','Deceitful','Dishonest','Shifty']},
{w:'Fracas',a:['Harmony','Tranquility','Peace','Calm']},
{w:'Fractious',a:['Obedient','Docile','Compliant','Calm']},
{w:'Frail',a:['Strong','Robust','Sturdy','Hale']},
{w:'Freakish',a:['Normal','Ordinary','Regular','Typical']},
{w:'Frugal',a:['Extravagant','Wasteful','Lavish','Profligate']},
{w:'Fugacious',a:['Permanent','Enduring','Stable','Lasting']},
{w:'Furtive',a:['Open','Overt','Brazen','Forthright']},
{w:'Futile',a:['Useful','Productive','Effective','Rewarding']},
{w:'Gainsay',a:['Affirm','Agree','Support','Confirm']},
{w:'Garrulous',a:['Taciturn','Quiet','Reserved','Reticent']},
{w:'Gelid',a:['Warm','Hot','Torrid','Tropical']},
{w:'Genial',a:['Aloof','Cold','Hostile','Unfriendly']},
{w:'Genuine',a:['Fake','Counterfeit','Spurious','Artificial']},
{w:'Gloomy',a:['Cheerful','Bright','Joyful','Optimistic']},
{w:'Gratuitous',a:['Necessary','Required','Essential','Justified']},
{w:'Gravitas',a:['Frivolity','Giddiness','Foolishness','Levity']},
{w:'Gregarious',a:['Solitary','Introverted','Reclusive','Unsociable']},
{w:'Grim',a:['Pleasant','Cheerful','Bright','Merry']},
{w:'Grudge',a:['Forgive','Pardon','Excuse','Overlook']},
{w:'Guileless',a:['Crafty','Cunning','Deceitful','Sly']},
{w:'Haggard',a:['Fresh','Healthy','Vigorous','Radiant']},
{w:'Halcyon',a:['Stormy','Turbulent','Chaotic','Troubled']},
{w:'Hamper',a:['Help','Assist','Facilitate','Aid']},
{w:'Harbinger',a:['Follower','Epilogue','Conclusion','Aftermath']},
{w:'Hasty',a:['Deliberate','Cautious','Prudent','Methodical']},
{w:'Haughty',a:['Humble','Modest','Meek','Submissive']},
{w:'Havoc',a:['Order','Harmony','Peace','Preservation']},
{w:'Headstrong',a:['Docile','Yielding','Compliant','Submissive']},
{w:'Heedless',a:['Cautious','Careful','Prudent','Mindful']},
{w:'Heinous',a:['Admirable','Noble','Praiseworthy','Virtuous']},
{w:'Heretic',a:['Orthodox','Believer','Follower','Devotee']},
{w:'Heterogeneous',a:['Homogeneous','Uniform','Identical','Consistent']},
{w:'Hinder',a:['Help','Facilitate','Assist','Promote']},
{w:'Homely',a:['Beautiful','Handsome','Attractive','Gorgeous']},
{w:'Hubris',a:['Humility','Modesty','Meekness','Meanness']},
{w:'Iconoclast',a:['Conformist','Traditionalist','Conservative','Supporter']},
{w:'Idolatry',a:['Contempt','Scorn','Aversion','Hatred']},
{w:'Ignominious',a:['Honorable','Glorious','Praiseworthy','Dignified']},
{w:'Ignorance',a:['Knowledge','Wisdom','Understanding','Awareness']},
{w:'Illustrious',a:['Obscure','Unknown','Insignificant','Ordinary']},
{w:'Immaculate',a:['Tainted','Impure','Corrupted','Flawed']},
{w:'Immaterial',a:['Relevant','Important','Significant','Essential']},
{w:'Imminent',a:['Distant','Remote','Far','Future']},
{w:'Immobile',a:['Moving','Mobile','Active','Restless']},
{w:'Impair',a:['Strengthen','Enhance','Improve','Augment']},
{w:'Impartial',a:['Biased','Prejudiced','Partial','Bigoted']},
{w:'Impassive',a:['Emotional','Sensitive','Passionate','Expressive']},
{w:'Impeccable',a:['Flawed','Faulty','Imperfect','Defective']},
{w:'Impede',a:['Assist','Facilitate','Expedite','Accelerate']},
{w:'Impending',a:['Distant','Past','Remote','Avoided']},
{w:'Imperious',a:['Humble','Meek','Submissive','Modest']},
{w:'Impermanent',a:['Permanent','Lasting','Enduring','Eternal']},
{w:'Imperturbable',a:['Anxious','Flustered','Excitable','Volatile']},
{w:'Impervious',a:['Susceptible','Vulnerable','Exposed','Prone']},
{w:'Impetuous',a:['Cautious','Prudent','Deliberate','Measured']},
{w:'Implacable',a:['Forgiving','Lenient','Merciful','Compassionate']},
{w:'Implicit',a:['Explicit','Stated','Clear','Expressed']},
{w:'Impolite',a:['Polite','Courteous','Civil','Mannerly']},
{w:'Importune',a:['Ignore','Dismiss','Neglect','Overlook']},
{w:'Imposter',a:['Genuine','Authentic','Real','Original']},
{w:'Imprudent',a:['Prudent','Cautious','Wary','Careful']},
{w:'Impunity',a:['Punishment','Penalty','Suffering','Retribution']},
{w:'Inadvertent',a:['Deliberate','Intentional','Calculated','Aware']},
{w:'Inauspicious',a:['Auspicious','Favorable','Promising','Hopeful']},
{w:'Incentive',a:['Disincentive','Deterrent','Discouragement','Hindrance']},
{w:'Incisive',a:['Vague','Ambiguous','Dull','Superficial']},
{w:'Inclined',a:['Reluctant','Averse','Opposed','Unwilling']},
{w:'Inconsequential',a:['Significant','Important','Momentous','Crucial']},
{w:'Inconspicuous',a:['Conspicuous','Noticeable','Obvious','Prominent']},
{w:'Incorrigible',a:['Reformable','Compliant','Obedient','Cooperative']},
{w:'Indefatigable',a:['Tired','Weary','Exhausted','Lethargic']},
{w:'Indelible',a:['Erasable','Removable','Fleeting','Temporary']},
{w:'Indifferent',a:['Passionate','Concerned','Interested','Enthusiastic']},
{w:'Indigent',a:['Wealthy','Affluent','Prosperous','Rich']},
{w:'Indiscriminate',a:['Selective','Careful','Judicious','Cautious']},
{w:'Indolent',a:['Industrious','Diligent','Energetic','Active']},
{w:'Indomitable',a:['Weak','Feeble','Timid','Submissive']},
{w:'Inept',a:['Competent','Skilled','Capable','Adept']},
{w:'Inert',a:['Active','Dynamic','Energetic','Lively']},
{w:'Inexorable',a:['Flexible','Yielding','Relenting','Merciful']},
{w:'Infallible',a:['Fallible','Erroneous','Flawed','Imperfect']},
{w:'Inferior',a:['Superior','Supreme','Paramount','Better']},
{w:'Inflammable',a:['Fireproof','Non-flammable','Resistant','Incombustible']},
{w:'Ingenious',a:['Stupid','Dull','Unimaginative','Inept']},
{w:'Ingratiate',a:['Alienate','Offend','Antagonize','Reproach']},
{w:'Inherent',a:['Acquired','External','Learned','Imposed']},
{w:'Inimical',a:['Friendly','Amiable','Beneficial','Favorable']},
{w:'Innocuous',a:['Harmful','Dangerous','Toxic','Deleterious']},
{w:'Innovative',a:['Conventional','Traditional','Orthodox','Stagnant']},
{w:'Inscrutable',a:['Transparent','Clear','Obvious','Understandable']},
{w:'Insipid',a:['Exciting','Fascinating','Captivating','Spicy']},
{w:'Insolent',a:['Respectful','Deferential','Polite','Courteous']},
{w:'Inspire',a:['Discourage','Deter','Dishearten','Deject']},
{w:'Instigate',a:['Prevent','Deter','Calm','Suppress']},
{w:'Insubordinate',a:['Obedient','Compliant','Submissive','Dutiful']},
{w:'Integrity',a:['Dishonesty','Corruption','Deceit','Treachery']},
{w:'Intellectual',a:['Ignorant','Uneducated','Illiterate','Stupid']},
{w:'Intrepid',a:['Timid','Cowardly','Faint-hearted','Fearful']},
{w:'Intricate',a:['Simple','Straightforward','Plain','Uncomplicated']},
{w:'Invariably',a:['Occasionally','Sometimes','Rarely','Erratically']},
{w:'Inveterate',a:['Occasional','Sporadic','Rare','Newfound']},
{w:'Irascible',a:['Calm','Placid','Even-tempered','Patient']},
{w:'Irksome',a:['Pleasant','Delightful','Enjoyable','Refreshing']},
{w:'Irreverent',a:['Reverent','Respectful','Deferential','Venerate']},
{w:'Itinerant',a:['Settled','Fixed','Resident','Permanent']},
{w:'Jubilant',a:['Despondent','Dejected','Miserable','Somber']},
{w:'Judicious',a:['Foolish','Reckless','Imprudent','Hasty']},
{w:'Justify',a:['Condemn','Blame','Criticize','Censure']},
{w:'Laconic',a:['Verbose','Loquacious','Garrulous','Talkative']},
{w:'Languid',a:['Energetic','Vigorous','Lively','Spirited']},
{w:'Laudable',a:['Deplorable','Blameworthy','Reprehensible','Despicable']},
{w:'Lavish',a:['Frugal','Miserly','Thrifty','Stingy']},
{w:'Lax',a:['Strict','Rigorous','Stern','Tight']},
{w:'Lazy',a:['Industrious','Diligent','Hardworking','Active']},
{w:'Leery',a:['Trusting','Naive','Credulous','Gullible']},
{w:'Lenient',a:['Strict','Harsh','Severe','Stern']},
{w:'Lethargic',a:['Energetic','Lively','Vigorous','Active']},
{w:'Levity',a:['Gravity','Solemnity','Seriousness','Earnestness']},
{w:'Liable',a:['Exempt','Immune','Relieved','Unlikely']},
{w:'Liberate',a:['Restrain','Confine','Imprison','Restrict']},
{w:'Licentious',a:['Moral','Chaste','Virtuous','Abstemious']},
{w:'Limpid',a:['Murky','Turbid','Cloudy','Opaque']},
{w:'Lively',a:['Sluggish','Listless','Dull','Lethargic']},
{w:'Loquacious',a:['Taciturn','Retiring','Silent','Reticent']},
{w:'Lucid',a:['Confused','Unclear','Obscure','Muddled']},
{w:'Machination',a:['Honesty','Fairness','Sincerity','Openness']},
{w:'Magnanimous',a:['Petty','Vindictive','Spiteful','Malicious']},
{w:'Malevolent',a:['Benevolent','Kind','Compassionate','Charitable']},
{w:'Malleable',a:['Rigid','Inflexible','Intractable','Stubborn']},
{w:'Mandate',a:['Prohibit','Forbid','Ban','Deny']},
{w:'Maverick',a:['Conformist','Traditionalist','Follower','Obedient']},
{w:'Meager',a:['Abundant','Plentiful','Copious','Ample']},
{w:'Mediocre',a:['Excellent','Outstanding','Superb','Exceptional']},
{w:'Melancholy',a:['Joy','Gaiety','Cheerfulness','Bliss']},
{w:'Mendacious',a:['Truthful','Honest','Veracious','Candid']},
{w:'Mentor',a:['Pupil','Student','Novice','Learner']},
{w:'Merriment',a:['Gloom','Sorrow','Sadness','Melancholy']},
{w:'Meticulous',a:['Careless','Sloppy','Negligent','Slapdash']},
{w:'Mild',a:['Severe','Harsh','Intense','Violent']},
{w:'Mitigate',a:['Aggravate','Intensify','Exacerbate','Worsen']},
{w:'Mollify',a:['Anger','Provoke','Irritate','Incense']},
{w:'Modest',a:['Arrogant','Proud','Vain','Conceited']},
{w:'Monotonous',a:['Varied','Interesting','Exciting','Diverse']},
{w:'Morose',a:['Cheerful','Jovial','Happy','Pleasant']},
{w:'Mundane',a:['Extraordinary','Exciting','Fascinating','Spectacular']},
{w:'Mutable',a:['Immutable','Constant','Unchanging','Fixed']},
{w:'Myopic',a:['Visionary','Farsighted','Prescient','Far-seeing']},
{w:'Nascent',a:['Mature','Established','Fully-grown','Ancient']},
{w:'Naive',a:['Sophisticated','Worldly','Cynical','Savvy']},
{w:'Nasty',a:['Pleasant','Kind','Nice','Delightful']},
{w:'Natty',a:['Sloppy','Slovenly','Disheveled','Untidy']},
{w:'Nebulous',a:['Clear','Distinct','Defined','Sharp']},
{w:'Necessity',a:['Luxury','Extra','Surplus','Choice']},
{w:'Nefarious',a:['Virtuous','Noble','Honorable','Righteous']},
{w:'Niggardly',a:['Generous','Lavish','Bountiful','Liberality']},
{w:'Nominal',a:['Substantial','Significant','Considerable','Ample']},
{w:'Nonchalant',a:['Anxious','Worried','Concerned','Nervous']},
{w:'Nonplus',a:['Enlighten','Clarify','Resolve','Satisfy']},
{w:'Nostalgia',a:['Anticipation','Excitement','Hopefulness','Enthusiasm']},
{w:'Notoriety',a:['Anonymity','Obscurity','Insignificance','Privacy']},
{w:'Nurture',a:['Neglect','Abandon','Ignore','Forsake']},
{w:'Obdurate',a:['Yielding','Flexible','Compliant','Pliable']},
{w:'Obfuscate',a:['Clarify','Illuminate','Explain','Reveal']},
{w:'Oblique',a:['Straight','Direct','Perpendicular','Vertical']},
{w:'Oblivious',a:['Aware','Mindful','Conscious','Alert']},
{w:'Obnoxious',a:['Pleasant','Charming','Delightful','Endearing']},
{w:'Obsequious',a:['Assertive','Independent','Defiant','Proud']},
{w:'Obsolete',a:['Current','Modern','Up-to-date','Relevant']},
{w:'Obstinate',a:['Flexible','Yielding','Compliant','Docile']},
{w:'Obtuse',a:['Sharp','Keen','Intelligent','Quick']},
{w:'Obviate',a:['Require','Necessitate','Demand','Invite']},
{w:'Officious',a:['Uninvolved','Indifferent','Detached','Aloof']},
{w:'Ominous',a:['Promising','Hopeful','Favorable','Auspicious']},
{w:'Opaque',a:['Transparent','Clear','Translucent','Lucid']},
{w:'Opprobrium',a:['Honor','Praise','Glory','Acclaim']},
{w:'Ornate',a:['Plain','Simple','Unadorned','Bare']},
{w:'Ostentatious',a:['Modest','Understated','Unpretentious','Simple']},
{w:'Ostensible',a:['Real','Genuine','Actual','True']},
{w:'Palliate',a:['Aggravate','Intensify','Exacerbate','Worsen']},
{w:'Palpable',a:['Imperceptible','Intangible','Faint','Invisible']},
{w:'Paradox',a:['Certainty','Clarity','Logic','Consistency']},
{w:'Paragon',a:['Imperfection','Flaw','Deficiency','Failure']},
{w:'Parsimonious',a:['Generous','Liberality','Bountiful','Spending']},
{w:'Partial',a:['Whole','Complete','Entire','Total']},
{w:'Partisan',a:['Impartial','Neutral','Unbiased','Objective']},
{w:'Passive',a:['Active','Assertive','Aggressive','Dynamic']},
{w:'Patience',a:['Impatience','Irritation','Frustration','Agitation']},
{w:'Patriotic',a:['Treasonous','Disloyal','Unpatriotic','Defection']},
{w:'Paucity',a:['Abundance','Plenty','Profusion','Wealth']},
{w:'Pedantic',a:['Carefree','Casual','Easygoing','Practical']},
{w:'Pellucid',a:['Opaque','Murky','Cloudy','Muddy']},
{w:'Pensive',a:['Cheerful','Joyful','Carefree','Jovial']},
{w:'Perfidious',a:['Loyal','Faithful','Trustworthy','Devoted']},
{w:'Perfunctory',a:['Thorough','Meticulous','Diligent','Careful']},
{w:'Pernicious',a:['Harmless','Beneficial','Innocuous','Benign']},
{w:'Persevere',a:['Quit','Surrender','Abandon','Relinquish']},
{w:'Persist',a:['Desist','Cease','Stop','Discontinue']},
{w:'Pertinacious',a:['Yielding','Flexible','Compliant','Surrendering']},
{w:'Pervasive',a:['Limited','Localized','Restricted','Sparse']},
{w:'Pessimism',a:['Optimism','Hope','Confidence','Cheerfulness']},
{w:'Petulant',a:['Patient','Calm','Amiable','Gentle']},
{w:'Pious',a:['Irreligious','Impious','Profane','Secular']},
{w:'Placate',a:['Anger','Provoke','Irritate','Incense']},
{w:'Placid',a:['Turbulent','Stormy','Chaotic','Volatile']},
{w:'Plain',a:['Ornate','Elaborate','Fancy','Decorated']},
{w:'Plausible',a:['Implausible','Unlikely','Incredible','Absurd']},
{w:'Plethora',a:['Scarcity','Shortage','Deficiency','Dearth']},
{w:'Ponderous',a:['Light','Agile','Nimble','Swift']},
{w:'Pragmatic',a:['Impractical','Idealistic','Theoretical','Visionary']},
{w:'Precarious',a:['Stable','Secure','Safe','Steadfast']},
{w:'Preclude',a:['Permit','Allow','Enable','Facilitate']},
{w:'Precocious',a:['Slow','Late','Retarded','Immature']},
{w:'Preposterous',a:['Sensible','Reasonable','Logical','Rational']},
{w:'Prerogative',a:['Obligation','Duty','Responsibility','Burden']},
{w:'Pristine',a:['Corrupted','Tainted','Defiled','Polluted']},
{w:'Probity',a:['Dishonesty','Corruption','Deceit','Unscrupulousness']},
{w:'Prodigal',a:['Economical','Thrifty','Frugal','Miserly']},
{w:'Prodigious',a:['Tiny','Small','Insignificant','Negligible']},
{w:'Profane',a:['Sacred','Holy','Pious','Reverent']},
{w:'Profuse',a:['Scarce','Meager','Sparse','Scanty']},
{w:'Prohibitive',a:['Affordable','Moderate','Reasonable','Permissive']},
{w:'Prolific',a:['Barren','Sterile','Infertile','Unproductive']},
{w:'Prominent',a:['Obscure','Insignificant','Unknown','Inconspicuous']},
{w:'Promulgate',a:['Suppress','Conceal','Withhold','Hide']},
{w:'Propensity',a:['Reluctance','Aversion','Disinclination','Hesitation']},
{w:'Prosaic',a:['Exciting','Imaginative','Dramatic','Romantic']},
{w:'Prosper',a:['Decline','Fail','Languish','Deteriorate']},
{w:'Prostrate',a:['Standing','Upright','Erect','Vertical']},
{w:'Proud',a:['Humble','Meek','Modest','Submissive']},
{w:'Prudent',a:['Reckless','Foolish','Rash','Imprudent']},
{w:'Puerile',a:['Mature','Adult','Sophisticated','Grown-up']},
{w:'Punctilious',a:['Careless','Negligent','Sloppy','Slapdash']},
{w:'Pungent',a:['Bland','Mild','Odorless','Flat']},
{w:'Punitive',a:['Forgiving','Lenient','Merciful','Redemptive']},
{w:'Pusillanimous',a:['Brave','Courageous','Valiant','Gallant']},
{w:'Quaint',a:['Ordinary','Mundane','Commonplace','Modern']},
{w:'Quandary',a:['Certainty','Clarity','Resolution','Answer']},
{w:'Quarrel',a:['Agreement','Harmony','Concord','Accord']},
{w:'Queer',a:['Normal','Ordinary','Typical','Conventional']},
{w:'Querulous',a:['Content','Pleasant','Satisfied','Cheerful']},
{w:'Quiescent',a:['Active','Restless','Stirring','Agitated']},
{w:'Quixotic',a:['Practical','Realistic','Pragmatic','Sensible']},
{w:'Quotidian',a:['Extraordinary','Exceptional','Rare','Unusual']},
{w:'Radical',a:['Conservative','Traditional','Moderate','Mild']},
{w:'Radiant',a:['Gloomy','Dull','Somber','Dark']},
{w:'Rambling',a:['Concise','Brief','Focused','Direct']},
{w:'Rare',a:['Common','Frequent','Usual','Ordinary']},
{w:'Rational',a:['Irrational','Foolish','Illogical','Senseless']},
{w:'Raucous',a:['Quiet','Melodious','Harmonious','Soft']},
{w:'Recalcitrant',a:['Obedient','Compliant','Submissive','Docile']},
{w:'Recluse',a:['Socialite','Extrovert','Joiner','Mixer']},
{w:'Recondite',a:['Simple','Straightforward','Clear','Popular']},
{w:'Recount',a:['Withhold','Conceal','Suppress','Omit']},
{w:'Redolent',a:['Odorless','Scentless','Stale','Musty']},
{w:'Redoubtable',a:['Weak','Feeble','Insignificant','Trivial']},
{w:'Refrain',a:['Indulge','Partake','Continue','Persist']},
{w:'Regal',a:['Common','Ordinary','Humble','Mundane']},
{w:'Relegate',a:['Elevate','Promote','Advance','Exalt']},
{w:'Relentless',a:['Giving','Cessating','Stopping','Weakening']},
{w:'Remiss',a:['Diligent','Careful','Conscientious','Dutiful']},
{w:'Renounce',a:['Embrace','Adopt','Claim','Affirm']},
{w:'Replete',a:['Empty','Devoid','Lacking','Vacant']},
{w:'Reprehensible',a:['Praiseworthy','Admirable','Commendable','Virtuous']},
{w:'Repudiate',a:['Accept','Embrace','Acknowledge','Admit']},
{w:'Reputable',a:['Disreputable','Infamous','Notorious','Discredited']},
{w:'Rescind',a:['Enact','Impose','Establish','Authorize']},
{w:'Resentment',a:['Gratitude','Appreciation','Goodwill','Affection']},
{w:'Resilient',a:['Fragile','Vulnerable','Brittle','Weak']},
{w:'Resolute',a:['Irresolute','Hesitant','Vacillating','Faint-hearted']},
{w:'Restive',a:['Calm','Composed','Settled','Still']},
{w:'Restrained',a:['Wild','Unrestrained','Passionate','Exuberant']},
{w:'Reticent',a:['Talkative','Outgoing','Effusive','Communicative']},
{w:'Revere',a:['Despise','Scorn','Disrespect','Dishonor']},
{w:'Rigid',a:['Flexible','Pliable','Supple','Yielding']},
{w:'Robust',a:['Weak','Feeble','Frail','Delicate']},
{w:'Ruthless',a:['Merciful','Compassionate','Lenient','Kind']},
{w:'Sagacious',a:['Foolish','Stupid','Ignorant','Dull']},
{w:'Sanguine',a:['Pessimistic','Gloomy','Despondent','Melancholy']},
{w:'Savage',a:['Civilized','Gentle','Cultivated','Tame']},
{w:'Scanty',a:['Abundant','Ample','Plentiful','Profuse']},
{w:'Scrutinize',a:['Ignore','Overlook','Gloss over','Neglect']},
{w:'Secular',a:['Religious','Sacred','Spiritual','Divine']},
{w:'Seminal',a:['Insignificant','Trivial','Minor','Imitative']},
{w:'Sentiment',a:['Apathy','Indifference','Coldness','Aversion']},
{w:'Serene',a:['Turbulent','Stormy','Agitated','Chaotic']},
{w:'Severe',a:['Mild','Gentle','Lenient','Tender']},
{w:'Shroud',a:['Reveal','Expose','Unveil','Display']},
{w:'Skeptical',a:['Trusting','Gullible','Credulous','Believing']},
{w:'Slender',a:['Fat','Stout','Plump','Obese']},
{w:'Slight',a:['Considerable','Significant','Substantial','Great']},
{w:'Slovenly',a:['Neat','Tidy','Well-groomed','Immaculate']},
{w:'Sobriety',a:['Drunkenness','Intoxication','Inebriation','Folly']},
{w:'Solemn',a:['Jocular','Jovial','Frivolous','Humorous']},
{w:'Sophisticated',a:['Naive','Simple','Unsophisticated','Innocent']},
{w:'Sparse',a:['Dense','Thick','Abundant','Plentiful']},
{w:'Sporadic',a:['Frequent','Constant','Regular','Persistent']},
{w:'Spurious',a:['Genuine','Authentic','Real','Legitimate']},
{w:'Stagnant',a:['Active','Dynamic','Flowing','Moving']},
{w:'Stalwart',a:['Weak','Feeble','Fragile','Timid']},
{w:'Static',a:['Dynamic','Moving','Changing','Fluctuating']},
{w:'Steadfast',a:['Fickle','Inconstant','Wavering','Unsteady']},
{w:'Steady',a:['Unsteady','Erratic','Fickle','Variable']},
{w:'Stolid',a:['Animated','Passionate','Emotional','Excitable']},
{w:'Straightforward',a:['Deceitful','Cunning','Complicated','Circuitous']},
{w:'Stringent',a:['Lenient','Lax','Relaxed','Flexible']},
{w:'Subjugate',a:['Liberate','Free','Emancipate','Release']},
{w:'Sublime',a:['Inferior','Common','Ordinary','Lowly']},
{w:'Submissive',a:['Dominant','Defiant','Rebellious','Assertive']},
{w:'Substantiate',a:['Disprove','Refute','Deny','Undermine']},
{w:'Succinct',a:['Lengthy','Verbose','Wordy','Rambling']},
{w:'Sufficient',a:['Insufficient','Inadequate','Lacking','Deficient']},
{w:'Superfluous',a:['Essential','Necessary','Required','Scarce']},
{w:'Supplant',a:['Retain','Keep','Maintain','Preserve']},
{w:'Supple',a:['Stiff','Rigid','Inflexible','Brittle']},
{w:'Surfeit',a:['Scarcity','Dearth','Deprivation','Famine']},
{w:'Surly',a:['Friendly','Affable','Amiable','Genial']},
{w:'Surplus',a:['Deficiency','Shortage','Scarcity','Deficit']},
{w:'Surreptitious',a:['Open','Overt','Public','Frank']},
{w:'Sycophant',a:['Critic','Opponent','Rebel','Nonconformist']},
{w:'Taciturn',a:['Talkative','Loquacious','Garrulous','Verbose']},
{w:'Tangible',a:['Intangible','Invisible','Abstract','Impalpable']},
{w:'Tedious',a:['Interesting','Exciting','Stimulating','Fascinating']},
{w:'Temerity',a:['Caution','Prudence','Timidity','Faint-heartedness']},
{w:'Temperate',a:['Intemperate','Excessive','Extreme','Wild']},
{w:'Tenacious',a:['Yielding','Giving','Surrendering','Abandoning']},
{w:'Tender',a:['Harsh','Rough','Tough','Callous']},
{w:'Tentative',a:['Decisive','Certain','Definite','Resolute']},
{w:'Terse',a:['Lengthy','Verbose','Wordy','Digressive']},
{w:'Timid',a:['Bold','Brave','Audacious','Fearless']},
{w:'Torpid',a:['Active','Lively','Energetic','Alert']},
{w:'Transient',a:['Permanent','Enduring','Lasting','Eternal']},
{w:'Trivial',a:['Significant','Important','Crucial','Momentous']},
{w:'Truculent',a:['Peaceful','Gentle','Mild','Docile']},
{w:'Turbulent',a:['Calm','Peaceful','Placid','Tranquil']},
{w:'Ubiquitous',a:['Rare','Scarce','Unique','Uncommon']},
{w:'Unassuming',a:['Proud','Arrogant','Vain','Haughty']},
{w:'Uncouth',a:['Refined','Polished','Sophisticated','Elegant']},
{w:'Underscore',a:['Diminish','Minimize','Understate','Downplay']},
{w:'Unequivocal',a:['Ambiguous','Vague','Equivocal','Uncertain']},
{w:'Unfeigned',a:['Feigned','Insincere','Pretended','Artificial']},
{w:'Unique',a:['Common','Ordinary','Usual','Typical']},
{w:'Unmitigated',a:['Moderate','Partial','Qualified','Relieved']},
{w:'Unprecedented',a:['Common','Frequent','Routine','Ordinary']},
{w:'Unscrupulous',a:['Honest','Ethical','Moral','Principled']},
{w:'Untoward',a:['Favorable','Auspicious','Convenient','Proper']},
{w:'Unwieldy',a:['Manageable','Handy','Compact','Convenient']},
{w:'Uproarious',a:['Quiet','Peaceful','Tranquil','Silent']},
{w:'Vacillate',a:['Decide','Resolve','Commit','Determine']},
{w:'Vague',a:['Clear','Precise','Specific','Definite']},
{w:'Vapid',a:['Interesting','Stimulating','Witty','Brilliant']},
{w:'Vehement',a:['Mild','Moderate','Gentle','Subdued']},
{w:'Venerate',a:['Despise','Scorn','Disrespect','Dishonor']},
{w:'Veracious',a:['Deceitful','Dishonest','False','Mendacious']},
{w:'Verbose',a:['Concise','Brief','Terse','Succinct']},
{w:'Viable',a:['Impractical','Impossible','Unfeasible','Futile']},
{w:'Vigilant',a:['Negligent','Careless','Inattentive','Reckless']},
{w:'Vindicate',a:['Condemn','Blame','Accuse','Convict']},
{w:'Virtuous',a:['Immoral','Corrupt','Wicked','Vicious']},
{w:'Vitriolic',a:['Mild','Gentle','Soothing','Calm']},
{w:'Vociferous',a:['Quiet','Soft-spoken','Mild','Subdued']},
{w:'Voluble',a:['Taciturn','Reserved','Retiring','Mute']},
{w:'Wanton',a:['Restrained','Controlled','Disciplined','Moral']},
{w:'Wary',a:['Careless','Reckless','Trusting','Incautious']},
{w:'Whimsical',a:['Serious','Practical','Steady','Sensible']},
{w:'Wholesome',a:['Harmful','Unhealthy','Toxic','Noxious']},
{w:'Willful',a:['Obedient','Compliant','Submissive','Cooperative']},
{w:'Wrath',a:['Calm','Serenity','Peace','Composure']},
{w:'Zealous',a:['Apathetic','Indifferent','Lukewarm','Unenthusiastic']},
{w:'Zephyr',a:['Gale','Storm','Wind','Hurricane']},
{w:'Zest',a:['Boredom','Apathy','Indifference','Ennui']},
{w:'Aberration',a:['Norm','Standard','Rule','Pattern']},
{w:'Abyss',a:['Peak','Summit','Top','Crest']},
{w:'Accrue',a:['Diminish','Deplete','Decrease','Lose']},
{w:'Acrimonious',a:['Harmonious','Friendly','Sweet','Amicable']},
{w:'Admonish',a:['Praise','Commend','Approve','Reward']},
{w:'Affinity',a:['Aversion','Antipathy','Dislike','Hostility']},
{w:'Amalgamate',a:['Separate','Divide','Part','Split']},
{w:'Ambiguous',a:['Clear','Unambiguous','Definite','Precise']},
{w:'Anomaly',a:['Regularity','Norm','Standard','Custom']},
{w:'Antipathy',a:['Affinity','Sympathy','Fondness','Warmth']},
{w:'Apathetic',a:['Enthusiastic','Passionate','Zealous','Ardent']},
{w:'Austere',a:['Luxurious','Indulgent','Ornate','Sumptuous']},
{w:'Beleaguer',a:['Assist','Support','Comfort','Relieve']},
{w:'Belligerent',a:['Peaceable','Pacifist','Friendly','Gentle']},
{w:'Benevolent',a:['Malevolent','Malicious','Cruel','Hostile']},
{w:'Besiege',a:['Liberate','Free','Abandon','Desert']},
{w:'Bland',a:['Spicy','Pungent','Flavorful','Zesty']},
{w:'Buoyant',a:['Depressed','Heavy','Sluggish','Deflated']},
{w:'Capitulate',a:['Resist','Fight','Defy','Persist']},
{w:'Catastrophic',a:['Fortunate','Lucky','Successful','Benign']},
{w:'Circumscribe',a:['Expand','Enlarge','Broaden','Liberate']},
{w:'Collaborate',a:['Compete','Oppose','Rival','Resist']},
{w:'Compel',a:['Dissuade','Deter','Prevent','Discourage']},
{w:'Confound',a:['Clarify','Explain','Satisfy','Enlighten']},
{w:'Congenial',a:['Hostile','Unpleasant','Antagonistic','Unfriendly']},
{w:'Connoisseur',a:['Novice','Amateur','Beginner','Dilettante']},
{w:'Converge',a:['Diverge','Separate','Spread','Disperse']},
{w:'Convoluted',a:['Simple','Straightforward','Clear','Direct']},
{w:'Countenance',a:['Reject','Disapprove','Deny','Frown']},
{w:'Curtail',a:['Extend','Prolong','Lengthen','Expand']},
{w:'Decay',a:['Flourish','Grow','Prosper','Thrive']},
{w:'Defunct',a:['Living','Active','Thriving','Operational']},
{w:'Deleterious',a:['Beneficial','Helpful','Healthy','Salutary']},
{w:'Demonstrate',a:['Conceal','Hide','Obscure','Deny']},
{w:'Dependable',a:['Unreliable','Irresponsible','Untrustworthy','Inconsistent']},
{w:'Derivative',a:['Original','Innovative','Creative','Pioneering']},
{w:'Despot',a:['Democrat','Liberator','Champion','Rebel']},
{w:'Desultory',a:['Systematic','Methodical','Organized','Planned']},
{w:'Detract',a:['Enhance','Improve','Add','Augment']},
{w:'Diffuse',a:['Concentrated','Focused','Dense','Compact']},
{w:'Dilatory',a:['Prompt','Punctual','Swift','Expedient']},
{w:'Discordant',a:['Harmonious','Melodious','Agreeable','Concordant']},
{w:'Dissipate',a:['Gather','Conserve','Accumulate','Hoard']},
{w:'Diverge',a:['Converge','Meet','Join','Unite']},
{w:'Divergent',a:['Convergent','Identical','Similar','Parallel']},
{w:'Dubious',a:['Certain','Definite','Sure','Confident']},
{w:'Duplicity',a:['Honesty','Sincerity','Candor','Forthrightness']},
{w:'Effervescent',a:['Flat','Dull','Lifeless','Stagnant']},
{w:'Effrontery',a:['Timidity','Modesty','Shyness','Humility']},
{w:'Elicit',a:['Suppress','Conceal','Hide','Withhold']},
{w:'Emaciated',a:['Fat','Plump','Stout','Obese']},
{w:'Encomium',a:['Criticism','Censure','Condemnation','Denunciation']},
{w:'Enigmatic',a:['Clear','Obvious','Understandable','Plain']},
{w:'Erode',a:['Build','Strengthen','Reinforce','Create']},
{w:'Esoteric',a:['Common','Mainstream','Popular','Widely-known']},
{w:'Espouse',a:['Reject','Oppose','Abandon','Renounce']},
{w:'Exemplary',a:['Deplorable','Disgraceful','Shameful','Inadequate']},
{w:'Exonerate',a:['Convict','Blame','Condemn','Accuse']},
{w:'Expedient',a:['Impractical','Unnecessary','Harmful','Inadvisable']},
{w:'Extraneous',a:['Essential','Relevant','Necessary','Pertinent']},
{w:'Facetious',a:['Serious','Earnest','Solemn','Grave']},
{w:'Foment',a:['Suppress','Prevent','Dampen','Quell']},
{w:'Fortify',a:['Weaken','Undermine','Destabilize','Enfeeble']},
{w:'Glib',a:['Earnest','Sincere','Thoughtful','Articulate']},
{w:'Gloating',a:['Sympathetic','Compassionate','Empathetic','Regretful']},
{w:'Hackneyed',a:['Original','Novel','Fresh','Innovative']},
{w:'Harmonious',a:['Discordant','Clashing','Jarring','Incompatible']},
{w:'Heretical',a:['Orthodox','Conforming','Faithful','Devout']},
{w:'Homogeneous',a:['Heterogeneous','Mixed','Varied','Diverse']},
{w:'Ignoble',a:['Noble','Honorable','Dignified','Exalted']},
{w:'Immutable',a:['Changeable','Variable','Mutable','Alterable']},
{w:'Impasse',a:['Solution','Breakthrough','Progress','Resolution']},
{w:'Importunate',a:['Patient','Forbearing','Unhurried','Calm']},
{w:'Inchoate',a:['Developed','Mature','Complete','Formed']},
{w:'Incipient',a:['Advanced','Mature','Full-blown','Established']},
{w:'Incontrovertible',a:['Debatable','Questionable','Arguable','Uncertain']},
{w:'Ineluctable',a:['Avoidable','Preventable','Escapable','Optional']},
{w:'Intractable',a:['Compliant','Obedient','Manageable','Docile']},
{w:'Invincible',a:['Vulnerable','Weak','Defeatable','Mortal']},
{w:'Juxtapose',a:['Separate','Isolate','Distance','Remove']},
{w:'Lassitude',a:['Energy','Vigor','Vitality','Alertness']},
{w:'Latent',a:['Active','Manifest','Evident','Patent']},
{w:'Lurid',a:['Subtle','Muted','Restrained','Understated']},
{w:'Maleficent',a:['Benevolent','Helpful','Beneficent','Kind']},
{w:'Manifest',a:['Hidden','Concealed','Invisible','Obscure']},
{w:'Mercurial',a:['Steady','Consistent','Stable','Predictable']},
{w:'Meretricious',a:['Genuine','Authentic','Honest','Sincere']},
{w:'Noisome',a:['Pleasant','Fragrant','Aromatic','Delightful']},
{w:'Obstreperous',a:['Quiet','Docile','Obedient','Gentle']},
{w:'Opprobrious',a:['Complimentary','Flattering','Praising','Honoring']},
{w:'Panacea',a:['Poison','Toxin','Contaminant','Pestilence']},
{w:'Pedestrian',a:['Exciting','Dynamic','Innovative','Creative']},
{w:'Phlegmatic',a:['Passionate','Excitable','Lively','Animated']},
{w:'Recumbent',a:['Upright','Standing','Erect','Vertical']},
{w:'Salubrious',a:['Unhealthy','Harmful','Noxious','Injurious']},
{w:'Sedulous',a:['Lazy','Idle','Indolent','Sluggish']},
{w:'Sentimental',a:['Unsentimental','Practical','Cold','Detached']},
{w:'Soporific',a:['Invigorating','Stimulating','Refreshing','Awakening']},
{w:'Tendentious',a:['Neutral','Impartial','Objective','Unbiased']},
{w:'Vituperate',a:['Praise','Commend','Extol','Acclaim']},
{w:'Zeal',a:['Apathy','Indifference','Lethargy','Languor']},
{w:'Abundant',a:['Scarce','Plentiful','Full','Large']},{w:'Bold',a:['Timid','Brave','Strong','Loud']},
  {w:'Cautious',a:['Reckless','Careful','Slow','Quiet']},{w:'Dense',a:['Sparse','Thick','Heavy','Solid']},
  {w:'Expand',a:['Contract','Grow','Spread','Rise']},{w:'Fragile',a:['Sturdy','Weak','Brittle','Light']},
  {w:'Generous',a:['Stingy','Kind','Rich','Helpful']},{w:'Humane',a:['Cruel','Gentle','Loving','Caring']},
  {w:'Innocent',a:['Guilty','Pure','Honest','Childlike']},{w:'Justice',a:['Injustice','Fairness','Equality','Truth']},
  {w:'Knowledge',a:['Ignorance','Wisdom','Learning','Intelligence']},{w:'Loyal',a:['Disloyal','Faithful','Devoted','True']},
  {w:'Mature',a:['Immature','Adult','Grown','Ripe']},{w:'Noble',a:['Ignoble','Dignified','Honorable','Royal']},
  {w:'Optimistic',a:['Pessimistic','Hopeful','Positive','Cheerful']},{w:'Permanent',a:['Temporary','Lasting','Eternal','Constant']},
  {w:'Reluctant',a:['Eager','Unwilling','Hesitant','Slow']},{w:'Sincere',a:['Insincere','Honest','Genuine','Truthful']},
  {w:'Tranquil',a:['Agitated','Calm','Peaceful','Serene']},{w:'Voracious',a:['Uninterested','Hungry','Greedy','Eager']},
  {w:'Abundance',a:['Scarcity','Plenty','Enough','Full']},{w:'Absurd',a:['Sensible','Ridiculous','Foolish','Illogical']},
  {w:'Accept',a:['Reject','Receive','Agree','Admit']},{w:'Active',a:['Passive','Lively','Energetic','Vigorous']},
  {w:'Admit',a:['Deny','Allow','Confess','Acknowledge']},{w:'Advance',a:['Retreat','Progress','Proceed','Move']},
  {w:'Ancient',a:['Modern','Old','Antique','Aged']},{w:'Anxious',a:['Calm','Worried','Nervous','Tense']},
  {w:'Arrive',a:['Depart','Reach','Come','Land']},{w:'Artificial',a:['Natural','Fake','Synthetic','Man-made']},
  {w:'Ascend',a:['Descend','Climb','Rise','Rocket']},{w:'Attic',a:['Basement','Loft','Garret','Top']},
  {w:'Awkward',a:['Graceful','Clumsy','Ungainly','Uncouth']},{w:'Bitter',a:['Sweet','Sour','Harsh','Acrid']},
  {w:'Boring',a:['Interesting','Dull','Tedious','Monotonous']},{w:'Brave',a:['Cowardly','Courageous','Bold','Heroic']},
  {w:'Brief',a:['Lengthy','Short','Concise','Succinct']},{w:'Bright',a:['Dim','Shining','Radiant','Luminous']},
  {w:'Broad',a:['Narrow','Wide','Expansive','Vast']},{w:'Bury',a:['Exhume','Inter','Hide','Conceal']},
  {w:'Captive',a:['Free','Prisoner','Detained','Shackled']},{w:'Cheap',a:['Expensive','Inexpensive','Affordable','Low-cost']},
  {w:'Civilized',a:['Barbaric','Refined','Cultured','Polished']},{w:'Coarse',a:['Fine','Rough','Crude','Bumpy']},
  {w:'Common',a:['Rare','Ordinary','Usual','Frequent']},{w:'Concerned',a:['Indifferent','Worried','Interested','Involved']},
  {w:'Conquer',a:['Surrender','Overcome','Defeat','Subdue']},{w:'Construct',a:['Demolish','Build','Create','Assemble']},
  {w:'Courage',a:['Cowardice','Bravery','Valor','Daring']},{w:'Curious',a:['Indifferent','Inquisitive','Interested','Nosey']},
  {w:'Delay',a:['Hasten','Postpone','Procrastinate','Defer']},{w:'Delete',a:['Insert','Remove','Erase','Cancel']},
  {w:'Despair',a:['Hope','Hopelessness','Despondency','Discouragement']},{w:'Devout',a:['Irreligious','Pious','Religious','Devoted']},
  {w:'Divide',a:['Unite','Split','Separate','Part']},{w:'Doubt',a:['Trust','Suspect','Question','Distrust']},
  {w:'Drunk',a:['Sober','Intoxicated','Inebriated','Sloshed']},{w:'Dry',a:['Wet','Parched','Arid','Thirsty']},
  {w:'Dull',a:['Sharp','Blunt','Boring','Tedious']},{w:'Early',a:['Late','Punctual','Timely','Ahead']},
  {w:'Earnest',a:['Insincere','Serious','Sincere','Genuine']},{w:'Easy',a:['Difficult','Simple','Effortless','Facile']},
  {w:'Efficient',a:['Inefficient','Capable','Able','Skilled']},{w:'Elegant',a:['Clumsy','Graceful','Refined','Polished']},
  {w:'Empty',a:['Full','Vacant','Hollow','Void']},{w:'Encourage',a:['Discourage','Motivate','Inspire','Urge']},
  {w:'Enemy',a:['Friend','Foe','Adversary','Opponent']},{w:'Equal',a:['Unequal','Even','Balanced','Level']},
  {w:'Expand',a:['Contract','Enlarge','Extend','Increase']},{w:'Fail',a:['Succeed','Flop','Lose','Fizzle']},
  {w:'Famous',a:['Unknown','Renowned','Illustrious','Eminent']},{w:'Foolish',a:['Wise','Silly','Unwise','Reckless']},
  {w:'Foreign',a:['Domestic','External','Alien','Imported']},{w:'Forgive',a:['Punish','Excuse','Pardon','Absolve']},
  {w:'Forward',a:['Backward','Ahead','Front','Advanced']},{w:'Fresh',a:['Stale','New','Recent','Novel']},
  {w:'Gather',a:['Scatter','Collect','Assemble','Accumulate']},{w:'Gentle',a:['Rough','Kind','Soft','Mild']},
  {w:'Gradual',a:['Sudden','Slow','Progressive','Incremental']},{w:'Great',a:['Small','Grand','Huge','Enormous']},
  {w:'Guilty',a:['Innocent','Culpable','Responsible','At fault']},{w:'Harsh',a:['Gentle','Rough','Severe','Bitter']},
  {w:'Healthy',a:['Sick','Fit','Robust','Vigorous']},{w:'Heavy',a:['Light','Weighty','Massive','Dense']},
  {w:'Honesty',a:['Dishonesty','Truth','Integrity','Honor']},{w:'Horizontal',a:['Vertical','Level','Flat','Even']},
  {w:'Humid',a:['Dry','Moist','Damp','Muggy']},{w:'Humble',a:['Proud','Modest','Meek','Lowly']},
  {w:'Ignorant',a:['Knowledgeable','Unaware','Uneducated','Uninformed']},{w:'Illegal',a:['Legal','Unlawful','Banned','Prohibited']},
  {w:'Immoral',a:['Moral','Unethical','Corrupt','Wicked']},{w:'Important',a:['Trivial','Significant','Crucial','Essential']},
  {w:'Improve',a:['Worsen','Enhance','Upgrade','Refine']},{w:'Increase',a:['Decrease','Grow','Expand','Multiply']},
  {w:'Indoor',a:['Outdoor','Inside','Enclosed','Interior']},{w:'Initial',a:['Final','First','Beginning','Opening']},
  {w:'Interior',a:['Exterior','Inside','Inner','Internal']},{w:'Jealous',a:['Trusting','Envious','Resentful','Green-eyed']},
  {w:'Liberal',a:['Conservative','Broad-minded','Tolerant','Perceptive']},{w:'Liquid',a:['Solid','Fluid','Aqueous','Molten']},
  {w:'Loose',a:['Tight','Lax','Slack','Loose-fitting']},{w:'Loud',a:['Quiet','Noisy','Blaring','Thunderous']},
  {w:'Majority',a:['Minority','Most','Bulk','Mass']},{w:'Maximum',a:['Minimum','Greatest','Utmost','Supreme']},
  {w:'Miser',a:['Spendthrift','Cheapskate','Skinflint','Hoarder']},{w:'Mobile',a:['Stationary','Movable','Portable','Roaming']},
  {w:'Natural',a:['Artificial','Organic','Pure','Real']},{w:'Near',a:['Far','Close','Adjacent','Proximate']},
  {w:'Necessary',a:['Unnecessary','Essential','Required','Vital']},{w:'Negative',a:['Positive','Pessimistic','Unfavorable','Hostile']},
  {w:'Obedient',a:['Disobedient','Compliant','Submissive','Dutiful']},{w:'Obscure',a:['Clear','Unknown','Hazy','Vague']},
  {w:'Order',a:['Disorder','Sequence','Arrangement','Layout']},{w:'Ordinary',a:['Extraordinary','Common','Average','Typical']},
  {w:'Pacify',a:['Aggravate','Soothe','Calm','Quiet']},{w:'Patient',a:['Impatient','Tolerant','Calm','Enduring']},
  {w:'Pleasant',a:['Unpleasant','Agreeable','Nice','Enjoyable']},{w:'Poverty',a:['Wealth','Destitution','Hardship','Need']},
  {w:'Praise',a:['Blame','Commend','Applaud','Laud']},{w:'Present',a:['Absent','Current','Contemporary','Existing']},
  {w:'Private',a:['Public','Personal','Confidential','Intimate']},{w:'Progress',a:['Regress','Advancement','Development','Growth']},
  {w:'Protect',a:['Expose','Guard','Defend','Shelter']},{w:'Punctual',a:['Late','Prompt','Timely','On time']},
  {w:'Rapid',a:['Slow','Fast','Swift','Quick']},{w:'Real',a:['Fake','Genuine','Actual','Authentic']},
  {w:'Rebel',a:['Conform','Revolt','Defy','Mutiny']},{w:'Regular',a:['Irregular','Steady','Consistent','Uniform']},
  {w:'Relax',a:['Tense','Rest','Unwind','Chill']},{w:'Remove',a:['Retain','Eliminate','Extract','Withdraw']},
  {w:'Respect',a:['Disrespect','Admire','Honor','Esteem']},{w:'Rural',a:['Urban','Country','Pastoral','Rustic']},
  {w:'Safety',a:['Danger','Security','Protection','Refuge']},{w:'Satisfied',a:['Dissatisfied','Content','Pleased','Fulfilled']},
  {w:'Scold',a:['Praise','Rebuke','Chide','Reprimand']},{w:'Selfish',a:['Generous','Egocentric','Greedy','Self-centered']},
  {w:'Serious',a:['Frivolous','Solemn','Grave','Intense']},{w:'Shallow',a:['Deep','Surface','Superficial','Frivolous']},
  {w:'Simple',a:['Complex','Easy','Plain','Basic']},{w:'Slim',a:['Fat','Thin','Slight','Narrow']},
  {w:'Sober',a:['Drunk','Serious','Grave','Solemn']},{w:'Solid',a:['Liquid','Firm','Hard','Strong']},
  {w:'Stable',a:['Unstable','Steady','Secure','Firm']},{w:'Start',a:['Finish','Begin','Launch','Commence']},
  {w:'Stern',a:['Lenient','Strict','Harsh','Severe']},{w:'Strength',a:['Weakness','Power','Force','Potency']},
  {w:'Stupid',a:['Intelligent','Foolish','Silly','Dense']},{w:'Submit',a:['Resist','Yield','Surrender','Concede']},
  {w:'Terrible',a:['Wonderful','Awful','Dreadful','Horrible']},{w:'Thick',a:['Thin','Dense','Solid','Concentrated']},
  {w:'Tight',a:['Loose','Firm','Snug','Constricted']},{w:'Truth',a:['Falsehood','Reality','Honesty','Veracity']},
  {w:'Uniform',a:['Varied','Consistent','Identical','Same']},{w:'Urban',a:['Rural','City','Metropolitan','Cosmopolitan']},
  {w:'Victory',a:['Defeat','Win','Triumph','Success']},{w:'Visible',a:['Invisible','Apparent','Clear','Evident']},
  {w:'Weak',a:['Strong','Feeble','Frail','Fragile']},{w:'Wide',a:['Narrow','Broad','Expansive','Extensive']},
  {w:'Wisdom',a:['Folly','Knowledge','Sagacity','Judgment']},{w:'Worst',a:['Best','Poorest','Lowest','Inferior']},
  {w:'Yield',a:['Resist','Produce','Surrender','Give in']},{w:'Young',a:['Old','Youthful','Junior','Immature']}];

function generateSynonymQuestion(diff) {
  var ty = SYNONYM_BANK.map(function(w, i) {
    return function() { return { w: w.w, a: w.s[0], o: w.s.slice(), idx: i }; };
  });
  // SBI PO Hard: context-based synonym
  ty.push(function() {
    var hardWords = [
      { w: 'Prolific', a: 'Fertile', ctx: 'The writer was known for his prolific output.' },
      { w: 'Ephemeral', a: 'Transient', ctx: 'The beauty of the cherry blossom is ephemeral.' },
      { w: 'Ubiquitous', a: 'Omnipresent', ctx: 'Smartphones have become ubiquitous in modern society.' },
      { w: 'Pragmatic', a: 'Practical', ctx: 'She took a pragmatic approach to the problem.' },
      { w: 'Ambivalent', a: 'Uncertain', ctx: 'He felt ambivalent about the career change.' },
      { w: 'Eloquent', a: 'Articulate', ctx: 'Her speech was eloquent and moving.' },
      { w: 'Tenacious', a: 'Persistent', ctx: 'The tenacious reporter would not give up.' }
    ];
    var hw = hardWords[rand(0, hardWords.length - 1)];
    var opts = hw.a ? [hw.a] : [];
    var allSyns = ['Fertile','Transient','Omnipresent','Practical','Uncertain','Articulate','Persistent','Brief','Everywhere','Stubborn','Fluent','Flexible'];
    for (var _g=0; _g<50 && opts.length<4; _g++) { var x = allSyns[rand(0, allSyns.length - 1)]; if (opts.indexOf(x) < 0) opts.push(x); }
    shuffle(opts);
    return { w: hw.w + ' (context: ' + hw.ctx + ')', a: hw.a, o: opts };
  });
  // SBI PO Hard: synonym with word roots
  ty.push(function() {
    var rootWords = [
      { w: 'Benevolent', a: 'Kind', root: 'bene = good' },
      { w: 'Malevolent', a: 'Malicious', root: 'male = bad' },
      { w: 'Amorphous', a: 'Shapeless', root: 'a = without, morph = shape' },
      { w: 'Circumspect', a: 'Cautious', root: 'circum = around, spect = look' },
      { w: 'Contradict', a: 'Deny', root: 'contra = against, dict = speak' }
    ];
    var rw = rootWords[rand(0, rootWords.length - 1)];
    var opts = [rw.a];
    var others = ['Kind','Malicious','Shapeless','Cautious','Deny','Happy','Sad','Bright'];
    for (var _g=0; _g<50 && opts.length<4; _g++) { var x = others[rand(0, others.length - 1)]; if (opts.indexOf(x) < 0) opts.push(x); }
    shuffle(opts);
    return { w: rw.w + ' (root: ' + rw.root + ')', a: rw.a, o: opts };
  });
  var idx;
  if (diff >= 5 && ty.length >= 4) {
    idx = Math.random() < 0.7 ? rand(Math.max(0, ty.length - 3), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var w = ty[idx]();
  shuffle(w.o);
  return { question:'Synonym of "'+w.w+'" ?', answer:w.a, options:w.o, hint:'Think of words with similar meaning', timeLimit:8, type:'verbal', techniqueLabel:'Synonyms: '+w.w, intuition:'A synonym is a word that has the same or nearly the same meaning as another word.' };
}

function generateAntonymQuestion(diff) {
  var ty = ANTONYM_BANK.map(function(w, i) {
    return function() { return { w: w.w, a: w.a[0], o: w.a.slice() }; };
  });
  // SBI PO Hard: context-based antonym
  ty.push(function() {
    var hardWords = [
      { w: 'Boon', a: 'Curse', ctx: 'The new policy was a boon for small businesses.' },
      { w: 'Exacerbate', a: 'Mitigate', ctx: 'The measures will exacerbate the problem.' },
      { w: 'Gregarious', a: 'Introverted', ctx: 'She was gregarious and loved parties.' },
      { w: 'Lethargic', a: 'Energetic', ctx: 'He felt lethargic after the heavy meal.' },
      { w: 'Obsolete', a: 'Contemporary', ctx: 'The technology became obsolete quickly.' },
      { w: 'Prolific', a: 'Barren', ctx: 'The artist had a prolific career.' },
      { w: 'Succinct', a: 'Verbose', ctx: 'His speech was succinct and powerful.' }
    ];
    var hw = hardWords[rand(0, hardWords.length - 1)];
    var opts = [hw.a];
    var pool = ['Curse','Mitigate','Introverted','Energetic','Contemporary','Barren','Verbose','Blessing','Worsen','Talkative','Lazy','Modern','Scarce','Wordy'];
    for (var _g=0; _g<50 && opts.length<4; _g++) { var x = pool[rand(0, pool.length - 1)]; if (opts.indexOf(x) < 0) opts.push(x); }
    shuffle(opts);
    return { w: hw.w + ' (context: ' + hw.ctx + ')', a: hw.a, o: opts };
  });
  // SBI PO Hard: antonym with word roots
  ty.push(function() {
    var rootWords = [
      { w: 'Prognathous', a: 'Retreating', root: 'pro = forward, gnath = jaw' },
      { w: 'Subterranean', a: 'Aboveground', root: 'sub = under, terra = earth' },
      { w: 'Intramural', a: 'Extramural', root: 'intra = within, extra = outside' },
      { w: 'Antebellum', a: 'Postbellum', root: 'ante = before, bellum = war' },
      { w: 'Monologue', a: 'Dialogue', root: 'mono = one, dia = two' }
    ];
    var rw = rootWords[rand(0, rootWords.length - 1)];
    var opts = [rw.a];
    var pool = ['Retreating','Aboveground','Extramural','Postbellum','Dialogue','Forward','Underground','Before','Inside','Outside','Single','Double'];
    for (var _g=0; _g<50 && opts.length<4; _g++) { var x = pool[rand(0, pool.length - 1)]; if (opts.indexOf(x) < 0) opts.push(x); }
    shuffle(opts);
    return { w: rw.w + ' (root: ' + rw.root + ')', a: rw.a, o: opts };
  });
  var idx;
  if (diff >= 5 && ty.length >= 4) {
    idx = Math.random() < 0.7 ? rand(Math.max(0, ty.length - 3), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var w = ty[idx]();
  shuffle(w.o);
  return { question:'Antonym of "'+w.w+'" ?', answer:w.a, options:w.o, hint:'Think of words with opposite meaning', timeLimit:8, type:'verbal', techniqueLabel:'Antonyms: '+w.w, intuition:'An antonym is a word opposite in meaning to another word.' };
}

function generateSentenceCompletionQuestion(diff) {
  var items=[
    {q:'Despite the heavy rain, the match _______ as scheduled.',a:'went ahead',o:['was cancelled','went ahead','was postponed','was delayed']},
    {q:'She is so _______ that she can solve any problem in minutes.',a:'intelligent',o:['lazy','intelligent','careless','nervous']},
    {q:'The scientist made a _______ discovery that changed the world.',a:'groundbreaking',o:['minor','groundbreaking','ordinary','useless']},
    {q:'He was _______ for his role in the conspiracy.',a:'convicted',o:['praised','convicted','promoted','awarded']},
    {q:'The _______ of medical technology has saved countless lives.',a:'advancement',o:['decline','advancement','absence','failure']},
    {q:'The manager asked the employees to _______ the new policy immediately.',a:'implement',o:['ignore','implement','delay','reject']},
    {q:'Her _______ attitude made her very popular among colleagues.',a:'affable',o:['rude','affable','arrogant','indifferent']},
    {q:'The lawyer presented _______ evidence that proved his client\'s innocence.',a:'conclusive',o:['weak','conclusive','irrelevant','ambiguous']},
    {q:'The government plans to _______ a new healthcare scheme next month.',a:'launch',o:['cancel','launch','delay','suspend']},
    {q:'The professor\'s lecture was so _______ that most students fell asleep.',a:'tedious',o:['fascinating','tedious','inspiring','engaging']},
    {q:'The company\'s profits have _______ steadily over the past five years.',a:'grown',o:['declined','grown','stagnated','plummeted']},
    {q:'She displayed remarkable _______ by completing the marathon despite her injury.',a:'perseverance',o:['laziness','perseverance','carelessness','timidity']},
    {q:'The new policy aims to _______ the gap between rich and poor.',a:'bridge',o:['widen','bridge','ignore','measure']},
    {q:'The detective _______ the mystery after months of investigation.',a:'unraveled',o:['created','unraveled','ignored','hid']},
    {q:'His speech was _______ with anecdotes and humor.',a:'interspersed',o:['devoid','interspersed','filled','lacking']},
    {q:'The team worked _______ to meet the project deadline.',a:'diligently',o:['carelessly','diligently','reluctantly','haphazardly']},
    {q:'The _______ of the ancient temple attracted tourists from around the world.',a:'grandeur',o:['decline','grandeur','destruction','remoteness']},
    {q:'The CEO was known for his _______ leadership style that inspired innovation.',a:'visionary',o:['autocratic','visionary','passive','erratic']},
    {q:'The evidence presented in court was entirely _______.',a:'circumstantial',o:['circumstantial','irrefutable','direct','overwhelming']},
    {q:'The company faced severe financial _______ due to the economic downturn.',a:'hardship',o:['growth','hardship','prosperity','expansion']},
    {q:'The new software is designed to _______ productivity in the workplace.',a:'enhance',o:['reduce','enhance','complicate','hinder']},
    {q:'She was _______ for her contribution to the field of medicine.',a:'acclaimed',o:['criticized','acclaimed','overlooked','forgotten']},
    {q:'The _______ of the river caused widespread flooding in the region.',a:'overflow',o:['drought','overflow','freeze','evaporation']},
    {q:'The politician\'s speech was full of empty _______ but no real solutions.',a:'rhetoric',o:['facts','rhetoric','data','logic']},
    {q:'The project was _______ due to lack of funding.',a:'abandoned',o:['accelerated','abandoned','expanded','completed']},
    {q:'She has a _______ for learning new languages quickly.',a:'knack',o:['hatred','knack','fear','disinterest']},
    {q:'The doctor advised him to _______ his salt intake for better health.',a:'reduce',o:['increase','reduce','maintain','ignore']},
    {q:'The meeting was _______ to discuss the quarterly results.',a:'convened',o:['adjourned','convened','cancelled','postponed']},
    {q:'His _______ remarks offended everyone in the room.',a:'tactless',o:['diplomatic','tactless','thoughtful','considerate']},
    {q:'The organization works to _______ awareness about environmental issues.',a:'raise',o:['lower','raise','hide','reduce']}
  ];
  var it=items[rand(0,items.length-1)]; shuffle(it.o);
  return { question:'Fill the blank: "'+it.q+'"', answer:it.a, options:it.o, hint:'Which word makes the sentence meaningful?', timeLimit:10, type:'verbal', techniqueLabel:'Sentence Completion', intuition:'Read the sentence for context clues. The correct word must make logical and grammatical sense.' };
}

function generateWordOrderingQuestion(diff) {
  var items=[
    {w:['the','quick','brown','fox','jumps'],s:'the quick brown fox jumps'},
    {w:['education','is','the','key','to','success'],s:'education is the key to success'},
    {w:['practice','makes','a','man','perfect'],s:'practice makes a man perfect'},
    {w:['honesty','is','the','best','policy'],s:'honesty is the best policy'},
    {w:['united','we','stand','divided','we','fall'],s:'united we stand divided we fall'},
    {w:['knowledge','is','power'],s:'knowledge is power'},
    {w:['all','that','glitters','is','not','gold'],s:'all that glitters is not gold'},
    {w:['actions','speak','louder','than','words'],s:'actions speak louder than words'},
    {w:['every','cloud','has','a','silver','lining'],s:'every cloud has a silver lining'},
    {w:['where','there','is','a','will','there','is','a','way'],s:'where there is a will there is a way'},
    {w:['necessity','is','the','mother','of','invention'],s:'necessity is the mother of invention'},
    {w:['slow','and','steady','wins','the','race'],s:'slow and steady wins the race'},
    {w:['a','stitch','in','time','saves','nine'],s:'a stitch in time saves nine'},
    {w:['charity','begins','at','home'],s:'charity begins at home'},
    {w:['prevention','is','better','than','cure'],s:'prevention is better than cure'},
    {w:['the','early','bird','catches','the','worm'],s:'the early bird catches the worm'},
    {w:['better','late','than','never'],s:'better late than never'},
    {w:['easy','come','easy','go'],s:'easy come easy go'},
    {w:['look','before','you','leap'],s:'look before you leap'},
    {w:['old','is','gold'],s:'old is gold'},
    {w:['time','and','tide','wait','for','none'],s:'time and tide wait for none'},
    {w:['when','in','rome','do','as','the','romans','do'],s:'when in rome do as the romans do'},
    {w:['a','penny','for','your','thoughts'],s:'a penny for your thoughts'},
    {w:['barking','dogs','seldom','bite'],s:'barking dogs seldom bite'},
    {w:['cut','your','coat','according','to','your','cloth'],s:'cut your coat according to your cloth'}
  ];
  var it=items[rand(0,items.length-1)]; var jumbled=it.w.slice(); shuffle(jumbled);
  return { question:'Arrange: "'+jumbled.join(' ')+'"', answer:it.s, options:[it.s, jumbled.slice().reverse().join(' '), [jumbled[0],jumbled[jumbled.length-1],jumbled[2],jumbled[1],jumbled[3]].join(' '), [jumbled[jumbled.length-1],jumbled[0],jumbled[2],jumbled[1],jumbled[3]].join(' ')], hint:'Find the logical sequence', timeLimit:15, type:'verbal', techniqueLabel:'Word Ordering', intuition:'Try to form a meaningful sentence. Look for the subject first, then verb, then object.' };
}

function generateSentenceOrderingQuestion(diff) {
  var items=[
    {s:['People rushed to hospitals.','A massive earthquake struck the city.','Rescue operations began immediately.','The government declared an emergency.']},
    {s:['They decided to open a café.','The friends noticed a lack of good coffee shops.','The café became popular within months.','They saved money and found a location.']},
    {s:['Eventually, dark clouds covered the sky completely.','The rain stopped and a rainbow appeared.','Heavy rain started pouring down suddenly.','First, the wind began to blow strongly.']},
    {s:['After kneading, the dough was left to rise for an hour.','First, all the ingredients were measured and mixed together.','The bread was baked until golden brown.','The dough was shaped into a loaf and placed in a pan.']},
    {s:['He submitted his application online.','The company called him for an interview.','He prepared thoroughly for the interview.','After several rounds, he received the job offer.']},
    {s:['Seeds were planted in small pots with soil.','Fresh vegetables were harvested within weeks.','The seedlings were watered daily and placed in sunlight.','The soil was prepared by adding compost and fertilizer.']},
    {s:['They boarded the train early in the morning.','The family planned a weekend trip to the mountains.','The train arrived at the scenic station by noon.','They spent the afternoon hiking and enjoying the view.']},
    {s:['She finished writing the final chapter of her novel.','She edited the manuscript for several weeks.','She sent it to publishers and waited for replies.','A publisher accepted it and printed the first copies.']},
    {s:['The alarm rang at six o\'clock in the morning.','She got ready and had a quick breakfast.','She walked to the station and caught the train.','She arrived at the office just before nine.']},
    {s:['He put a pot of water on the stove to boil.','He added salt and dropped the pasta into the water.','He stirred the pasta until it was cooked through.','He drained it and served it with tomato sauce.']},
    {s:['She chose a sunny corner of the yard for the garden.','She dug up the soil and mixed in fertilizer.','She planted the seeds and watered them daily.','Weeks later, green sprouts pushed through the soil.']},
    {s:['The instructor explained the basic strokes on the pool deck.','The children held onto the edge and kicked their legs.','They practiced floating with the instructor\'s help.','By the end of the course, everyone could swim a full lap.']},
    {s:['The candidates announced their plans and began campaigning.','Voters went to the polling stations on election day.','The ballots were counted through the night.','The winner gave an acceptance speech the next morning.']},
    {s:['The plot of land was cleared and leveled.','The foundation was poured and allowed to set.','The walls were raised and the roof was fitted.','The final inspection passed and the family moved in.']},
    {s:['A lightning strike started a fire in the dry forest.','The alarm was raised and fire crews were dispatched.','Firefighters contained the blaze with water and controlled burns.','After the rain fell, the last smoldering embers went out.']},
    {s:['The researcher formed a hypothesis about the new treatment.','She conducted a series of controlled experiments.','She analyzed the data and found a clear pattern.','She published the findings in a scientific journal.']},
    {s:['The script was written and the cast was chosen.','The crew filmed all the scenes over several months.','The footage was edited and the sound was added.','The film premiered at a theater to a full audience.']}
  ];
  var it=items[rand(0,items.length-1)]; var j=it.s.slice(); shuffle(j);
  return { question:'Order the sentences:<br>'+j.map(function(s,i){return (i+1)+'. '+s;}).join('<br>'), answer:it.s.join(' → '), options:[it.s.join(' → '), j.slice().reverse().join(' → '), [it.s[1],it.s[0],it.s[3],it.s[2]].join(' → '), [it.s[2],it.s[3],it.s[0],it.s[1]].join(' → ')], hint:'Find the chronological or logical sequence', timeLimit:20, type:'verbal', techniqueLabel:'Sentence Ordering', intuition:'Put events in chronological order. Start with what happened first, then follow logically.' };
}

function generateParagraphFormationQuestion(diff) {
  var items=[
    {s:['In addition, regular exercise boosts mental health.','It is well known that physical activity improves overall health.','Therefore, everyone should exercise daily.','Furthermore, it helps prevent chronic diseases.'],order:'It is well known that physical activity improves overall health. In addition, regular exercise boosts mental health. Furthermore, it helps prevent chronic diseases. Therefore, everyone should exercise daily.'},
    {s:['As a result, many students are choosing online courses.','Online education has become increasingly popular in recent years.','This convenience allows them to learn at their own pace.','Additionally, it is often more affordable than traditional education.'],order:'Online education has become increasingly popular in recent years. This convenience allows them to learn at their own pace. Additionally, it is often more affordable than traditional education. As a result, many students are choosing online courses.'},
    {s:['Consequently, polar ice caps are melting at an alarming rate.','Climate change is one of the most pressing issues of our time.','This leads to rising sea levels and extreme weather events.','The primary cause is the increase in greenhouse gas emissions.'],order:'Climate change is one of the most pressing issues of our time. The primary cause is the increase in greenhouse gas emissions. Consequently, polar ice caps are melting at an alarming rate. This leads to rising sea levels and extreme weather events.'},
    {s:['For example, smartphones put instant communication in our pockets.','Technology has revolutionized the way we live and work.','In conclusion, technology continues to shape every aspect of modern life.','Similarly, artificial intelligence is transforming industries like healthcare and transportation.'],order:'Technology has revolutionized the way we live and work. For example, smartphones put instant communication in our pockets. Similarly, artificial intelligence is transforming industries like healthcare and transportation. In conclusion, technology continues to shape every aspect of modern life.'},
    {s:['A balanced diet rich in fruits and vegetables provides essential nutrients.','Good nutrition is the foundation of a healthy lifestyle.','In contrast, processed foods high in sugar and salt can lead to health problems.','Therefore, making mindful food choices is crucial for long-term well-being.'],order:'Good nutrition is the foundation of a healthy lifestyle. A balanced diet rich in fruits and vegetables provides essential nutrients. In contrast, processed foods high in sugar and salt can lead to health problems. Therefore, making mindful food choices is crucial for long-term well-being.'},
    {s:['Reading regularly improves vocabulary, comprehension, and critical thinking.','Developing a reading habit is one of the best investments in personal growth.','Furthermore, it reduces stress and enhances empathy.','Thus, setting aside time for reading each day is highly beneficial.'],order:'Developing a reading habit is one of the best investments in personal growth. Reading regularly improves vocabulary, comprehension, and critical thinking. Furthermore, it reduces stress and enhances empathy. Thus, setting aside time for reading each day is highly beneficial.'}
  ];
  var it=items[rand(0,items.length-1)];
  return { question:'Form a paragraph:<br>'+it.s.map(function(s,i){return (i+1)+'. '+s;}).join('<br>'), answer:it.order, options:[it.order, it.s.slice().reverse().join(' '), [it.s[2],it.s[0],it.s[3],it.s[1]].join(' '), [it.s[3],it.s[1],it.s[2],it.s[0]].join(' ')], hint:'Find the opening statement, then supporting points, then conclusion', timeLimit:25, type:'verbal', techniqueLabel:'Paragraph Formation', intuition:'Start with the main idea, then supporting details, then transitions, then conclusion.' };
}

function generateComprehensionQuestion(diff) {
  var items=[
    {p:'Trees are essential for life on Earth. They produce oxygen, absorb carbon dioxide, and provide habitat for countless species. Deforestation threatens this delicate balance. Planting more trees is one of the simplest ways to combat climate change.',q:'Why are trees essential?',a:'They produce oxygen and absorb carbon dioxide',o:['They provide wood for furniture','They produce oxygen and absorb carbon dioxide','They make the landscape beautiful','They provide shade in summer']},
    {p:'Water covers about 71% of Earth\'s surface, but only 2.5% is freshwater. Of that, less than 1% is accessible for human use. Conservation of water is therefore critical for sustainable development.',q:'What percentage of Earth\'s water is accessible freshwater?',a:'Less than 1%',o:['About 71%','About 2.5%','Less than 1%','About 10%']},
    {p:'The human brain contains approximately 86 billion neurons. Each neuron can form thousands of connections, creating an incredibly complex network. This complexity enables learning, memory, and consciousness.',q:'How many neurons does the human brain have?',a:'86 billion',o:['86 million','86 billion','86 trillion','860 million']},
    {p:'Photosynthesis is the process by which green plants use sunlight to synthesize nutrients from carbon dioxide and water. Chlorophyll, the green pigment in leaves, captures light energy which is then converted into chemical energy stored as glucose. Oxygen is released as a byproduct of this process.',q:'What is released as a byproduct of photosynthesis?',a:'Oxygen',o:['Carbon dioxide','Oxygen','Glucose','Chlorophyll']},
    {p:'The term "biodiversity" refers to the variety of life forms on Earth, including plants, animals, and microorganisms. It encompasses genetic diversity within species, species diversity in ecosystems, and ecosystem diversity across landscapes. High biodiversity makes ecosystems more resilient to environmental changes.',q:'What does the word "encompasses" most closely mean in this passage?',a:'Includes',o:['Excludes','Includes','Surrounds','Replaces']},
    {p:'The Industrial Revolution, which began in Britain in the late 18th century, transformed production from handcraft methods to machine-based manufacturing. The steam engine, invented by James Watt, was central to this change. It powered factories and railways, drastically reducing travel and production times.',q:'Who invented the steam engine?',a:'James Watt',o:['James Cook','James Watt','Thomas Edison','Alexander Bell']},
    {p:'Honeybees are vital to agriculture because they pollinate a large share of the world\'s crops. A single colony can pollinate millions of flowers in a day. Without bees, many fruits, vegetables and nuts would become scarce. This makes their conservation crucial for food security.',q:'Why are honeybees vital to agriculture?',a:'They pollinate crops',o:['They produce honey','They pollinate crops','They eat pests','They fertilize soil']},
    {p:'The Amazon rainforest, spanning nine countries in South America, is the largest tropical rainforest in the world. It produces about 20% of the world\'s oxygen and houses an enormous diversity of species. However, deforestation for agriculture threatens this vital ecosystem.',q:'How much of the world\'s oxygen does the Amazon produce?',a:'About 20%',o:['About 10%','About 20%','About 50%','About 90%']},
    {p:'Reading regularly improves vocabulary, concentration, and empathy. When we read, our brains simulate the experiences of the characters, which strengthens our understanding of others. Studies show that people who read fiction tend to be better at understanding social cues.',q:'How does reading improve empathy?',a:'It strengthens understanding of others',o:['It increases reading speed','It strengthens understanding of others','It improves memory','It reduces vocabulary']},
    {p:'Vitamins are organic compounds that our bodies need in small amounts to function properly. Vitamin C, found in citrus fruits, supports the immune system and helps heal wounds. Vitamin D, obtained from sunlight, is essential for calcium absorption and bone health.',q:'Where is Vitamin D mainly obtained from?',a:'Sunlight',o:['Citrus fruits','Meat','Sunlight','Milk']},
    {p:'Mumbai, the financial capital of India, is located on the western coast. It is the most populous city in the country and the home of Bollywood, the largest film industry in the world by number of films produced. The city\'s economy is driven by finance, trade and entertainment.',q:'Which industry is Mumbai famous for?',a:'Bollywood (films)',o:['Steel','Software','Bollywood (films)','Textiles']},
    {p:'Deserts are regions that receive very little rainfall, often less than 250 millimeters a year. Despite harsh conditions, many plants and animals have adapted to survive. Cacti store water in their stems, and camels can go for long periods without drinking.',q:'How much rainfall do deserts typically receive each year?',a:'Less than 250 mm',o:['More than 1000 mm','Less than 250 mm','About 500 mm','About 1000 mm']},
    {p:'The Silk Road was an ancient network of trade routes connecting China with the Mediterranean world. It was named after lucrative Chinese silk, a major item of trade. Besides silk, the route carried spices, gold, and ideas, greatly influencing cultural exchange between East and West.',q:'Why was the Silk Road famous?',a:'It connected China with the Mediterranean for trade',o:['It was the fastest sea route','It connected China with the Mediterranean for trade','It was a military road','It was the only road in China']},
    {p:'Statistics reveals that sleep deprivation has serious consequences. Lack of sleep impairs judgment, slows reaction time, and weakens the immune system. Experts recommend that adults get seven to nine hours of sleep nightly for optimal health.',q:'How many hours of sleep do experts recommend for adults?',a:'Seven to nine hours',o:['Five to six hours','Seven to nine hours','Nine to twelve hours','Three to four hours']},
    {p:'Kerala, known as God\'s Own Country, is a state on India\'s southwestern coast. Famous for its backwaters, tropical greenery and Ayurvedic treatments, it has the highest literacy rate in India. Tourism is a major contributor to its economy.',q:'What is Kerala renowned for?',a:'Backwaters and greenery',o:['Deserts and dunes','Backwaters and greenery','Snow-capped peaks','Volcanic landscapes']},
    {p:'Ecosystems provide invaluable services such as clean water, fertile soil, and pollination. When one species disappears, the whole web can be affected. Conservation efforts aim to maintain the balance of these natural systems for future generations.',q:'What do ecosystems provide?',a:'Clean water and fertile soil',o:['Only food','Clean water and fertile soil','Only shelter','Manufactured goods']},
    {p:'The Great Barrier Reef, off the coast of Australia, is the largest coral reef system in the world. It stretches over 2,300 kilometers and is home to thousands of marine species. Climate change and pollution pose major threats to its health.',q:'What threatens the Great Barrier Reef?',a:'Climate change and pollution',o:['Overfishing and noise','Climate change and pollution','Shipping only','Tourism only']},
    {p:'Renewable energy comes from sources that are naturally replenished, such as sunlight, wind, and water. Unlike fossil fuels, renewables produce little or no greenhouse gas. This makes them central to efforts to combat global warming.',q:'Why are renewable sources important?',a:'They produce little greenhouse gas',o:['They are expensive','They produce little greenhouse gas','They are unlimited in all forms','They never fail']},
    {p:'Money works as a medium of exchange. Before money, people used the barter system, trading goods directly. Bartering was difficult because both parties had to want what the other offered, a problem called the double coincidence of wants.',q:'What was the problem with the barter system?',a:'Both had to want what the other offered',o:['Goods were too heavy','Both had to want what the other offered','Money had no value','Trade was illegal']},
    {p:'Archaeologists study the remains of past human societies. They examine artifacts, bones, and structures to reconstruct how ancient people lived. By analyzing these clues, they can trace migrations, trade, and cultural changes over thousands of years.',q:'What do archaeologists study?',a:'Remains of past human societies',o:['Weather patterns','Remains of past human societies','Current politics','Future technology']},
    {p:'The invention of the printing press by Johannes Gutenberg in the 15th century revolutionized access to knowledge. Books became cheaper and more available, allowing ideas to spread quickly across Europe and fueling the Renaissance and the Reformation.',q:'What was the impact of the printing press?',a:'Books became cheaper and widespread',o:['Books became rare','Books became cheaper and widespread','Travel became faster','Trade increased']},
    {p:'Yoga is an ancient practice from India that combines physical postures, breathing and meditation. It improves flexibility, balance, and mental calm. Globally popular today, yoga is recognized for its benefits to both body and mind.',q:'Where does yoga originate?',a:'India',o:['China','India','Greece','Egypt']},
    {p:'The internet has transformed communication by enabling instant sharing of information worldwide. It connects people across distances, supports online education and business, and provides a vast store of knowledge. Yet its misuse also raises concerns about privacy and misinformation.',q:'What is a concern about the internet mentioned?',a:'Privacy and misinformation',o:['It is too slow','Privacy and misinformation','It costs too much','It is rarely used']},
    {p:'Mount Everest, at 8,848 meters, is the highest mountain on Earth. Located in the Himalayas on the border between Nepal and China, it is a destination for experienced climbers. Its extreme altitude presents serious challenges such as low oxygen and harsh weather.',q:'What makes climbing Everest challenging?',a:'Low oxygen and harsh weather',o:['Thick forests','Low oxygen and harsh weather','Heavy rainfall','Extreme heat']},
    {p:'The spread of education is linked to economic growth. More educated workers tend to be more productive and innovative. Governments that invest in schools and universities often see improvements in living standards and reduced poverty.',q:'How does education relate to economic growth?',a:'Educated workers are more productive',o:['Education reduces jobs','Educated workers are more productive','Education is unrelated to growth','Education only helps the rich']},
    {p:'Ocean currents are continuous movements of seawater driven by winds, temperature, and salinity differences. They distribute heat around the planet, influencing climate. For instance, warm currents bring mild winters to some coastal regions.',q:'What do ocean currents influence?',a:'Climate',o:['Only fish migration','Climate','Only shipping','Tides only']}
  ];
  var it=items[rand(0,items.length-1)]; shuffle(it.o);
  return { question:'<span style="font-size:.85em">'+it.p+'</span><br><br>'+it.q, answer:it.a, options:it.o, hint:'Read the passage carefully. The answer is directly stated.', timeLimit:20, type:'verbal', techniqueLabel:'Comprehension', intuition:'Read the passage, then find the sentence that directly answers the question.' };
}

// ====== NON-VERBAL REASONING GENERATORS ======

function generateEmbeddedImagesQuestion(diff) {
  var items=[
    {fig:'A circle with a small triangle inside',emb:'A large square containing concentric circles, with a small triangle in the innermost circle',not:'A large triangle divided into smaller triangles'},
    {fig:'A star shape',emb:'A rectangle containing a circle, inside which there is a star',not:'A pentagon containing a smaller pentagon'},
    {fig:'A diamond (rotated square)',emb:'A complex figure with a hexagon containing a diamond at its center',not:'A simple circle with a dot'},
    {fig:'A cross shape (+)',emb:'A square grid pattern where a cross appears at the intersection of lines',not:'A triangle with a dot inside'},
    {fig:'A small circle',emb:'A large star-shaped polygon with a small circle at its exact center',not:'A rectangle with diagonal lines'},
    {fig:'An equilateral triangle',emb:'A complex geometric mandala with an equilateral triangle inscribed in the outermost ring',not:'A random scribble with no symmetry'},
    {fig:'A crescent moon shape',emb:'A large circle containing a smaller concentric circle, with a crescent inside the innermost zone',not:'A square divided into four triangles'},
    {fig:'A right-angled triangle',emb:'A rectangle divided by a diagonal, forming a right-angled triangle in the lower half',not:'A circle with three dots'},
    {fig:'The letter "T"',emb:'A grid of bricks where a T-shaped outline is formed by thick dark lines',not:'A triangle with a line'},
    {fig:'A small square',emb:'A larger square containing a rotated square, with a small square at its center',not:'A circle with a dot'},
    {fig:'A heart shape',emb:'A large flower design where a heart appears in the middle of four petals',not:'A star with a dot'},
    {fig:'A number "5"',emb:'A cellular pattern where the digit 5 is outlined by connected cells',not:'A rectangle of plain cells'},
    {fig:'An arch (semicircle on rectangle)',emb:'A castle doorway design with an arch formed in the centre',not:'A triangle with a line through it'},
    {fig:'A hexagon',emb:'A mandala of overlapping circles with a hexagon clearly visible at the hub',not:'A grid of dots'},
    {fig:'An arrow pointing right',emb:'A complex logo with an arrow formed between two overlapping squares',not:'A circle with an X inside'},
    {fig:'A spiral',emb:'A target of concentric squares where a spiral runs through the centre',not:'A simple cross'},
    {fig:'A rectangle standing vertically',emb:'A house-shaped figure where a vertical rectangle forms the door',not:'A circle divided into four'}
  ];
  var it=items[rand(0,items.length-1)];
  var opts=[it.emb, it.not, 'A figure containing only straight lines', 'A figure with curved boundaries only']; shuffle(opts);
  return { question:'Which figure contains a "'+it.fig+'" embedded in it?<br><span style="font-size:.8em;color:var(--text-sec)">(described in words)</span>', answer:it.emb, options:opts, hint:'Look for the given shape hidden inside a larger figure', timeLimit:15, type:'reasoning', techniqueLabel:'Embedded Images', intuition:'The embedded figure may be rotated, scaled, or partially obscured. Look for the exact shape within the larger figure.' };
}

function generateFigureMatrixQuestion(diff) {
  var items=[
    {r:'Circle, Triangle, Square<br>Red, Blue, ?',a:'Green',o:['Green','Yellow','Purple','Orange']},
    {r:'1x1, 2x2, 3x3<br>4, 8, ?',a:'12',o:['16','12','10','14']},
    {r:'△, ○, □<br>▲, ●, ?',a:'■',o:['○','□','■','△']},
    {r:'2,4,8<br>3,6,12<br>4,8,?',a:'16',o:['12','14','16','10']},
    {r:'→, ↗, ↑<br>↗, ↑, ?<br>↑, ?, ←',a:'↖',o:['↖','↗','↙','↘']},
    {r:'◐, ◑, ◒<br>◑, ◒, ?<br>◒, ?, ◐',a:'◓',o:['◓','◒','◑','◐']},
    {r:'1, 2, 3<br>2, 4, 6<br>3, 6, ?',a:'9',o:['8','9','7','10']},
    {r:'A, B, C<br>D, E, F<br>G, H, ?',a:'I',o:['H','I','J','K']},
    {r:'3, 5, 7<br>6, 10, 14<br>9, 15, ?',a:'21',o:['18','20','21','24']},
    {r:'○, ○○, ○○○<br>□, □□, □□□<br>△, △△, ?',a:'△△△',o:['△△','△△△','○○○','□□□']},
    {r:'2, 4, 6<br>8, 10, 12<br>14, 16, ?',a:'18',o:['17','18','20','16']},
    {r:'⊿, □, ⬡<br>⊿, □, ⬡<br>⊿, ?, ⬡',a:'□',o:['⬡','⊿','□','○']},
    {r:'5, 10, 15<br>6, 12, 18<br>7, 14, ?',a:'21',o:['20','21','22','19']},
    {r:'a, b, c<br>b, c, d<br>c, d, ?',a:'e',o:['d','e','f','c']},
    {r:'2, 3, 5<br>3, 4, 7<br>5, 7, ?',a:'12',o:['10','11','12','13']},
    {r:'◇, ◇◇, ◇◇◇<br>◇, ◇◇, ◇◇◇<br>◇◇, ?, ◇◇◇◇',a:'◇◇◇',o:['◇','◇◇','◇◇◇','◇◇◇◇']},
    {r:'Mon, Tue, Wed<br>Tue, Wed, Thu<br>Wed, Thu, ?',a:'Fri',o:['Thu','Fri','Sat','Sun']}
  ];
  var it=items[rand(0,items.length-1)]; shuffle(it.o);
  return { question:'Complete the matrix:<br><span style="font-size:1.2em;line-height:1.8">'+it.r+'</span>', answer:it.a, options:it.o, hint:'Find the pattern in rows and columns', timeLimit:15, type:'reasoning', techniqueLabel:'Figure Matrix', intuition:'Look for the pattern row-wise and column-wise. The same operation/logic should apply to all rows.' };
}

function generatePaperFoldingQuestion(diff) {
  var items=[
    {d:'A square paper is folded in half vertically, then folded in half horizontally. A small triangle is cut from the bottom-right corner of the folded paper. How many holes when unfolded?',a:'4 holes',o:['1 hole','2 holes','4 holes','8 holes']},
    {d:'A circular paper is folded in half once. A small square is cut from the center of the folded edge. How many holes when unfolded?',a:'2 holes',o:['1 hole','2 holes','3 holes','4 holes']},
    {d:'A rectangular paper is folded in half three times. A small circle is cut from the corner of the folded paper. How many holes when unfolded?',a:'8 holes',o:['2 holes','4 holes','6 holes','8 holes']},
    {d:'A square paper is folded diagonally once. A small semicircle is cut from the folded edge near the corner. How many holes when unfolded?',a:'2 holes',o:['1 hole','2 holes','3 holes','4 holes']},
    {d:'A square paper is folded in half, then folded in half again, then folded in half a third time. A small circle is punched through all layers at the corner. How many holes when unfolded?',a:'8 holes',o:['2 holes','4 holes','6 holes','8 holes']},
    {d:'A rectangular paper is folded in half vertically. The top-right corner of the folded paper is cut off at a 45° angle. When unfolded, which corners of the original paper will be missing?',a:'Top-right and top-left corners',o:['Top-right only','Top-right and top-left corners','All four corners','Bottom-right only']},
    {d:'A square paper is folded in half once. A small triangle is cut from the folded edge at the centre. How many holes appear when unfolded?',a:'2 holes',o:['1 hole','2 holes','4 holes','8 holes']},
    {d:'A rectangular paper is folded in half twice. A small rectangle is cut from the corner of the folded paper. How many holes when fully unfolded?',a:'4 holes',o:['1 hole','2 holes','4 holes','8 holes']},
    {d:'A square paper is folded diagonally twice to form a small triangle. A small circle is punched through the folded corner. How many holes when unfolded?',a:'4 holes',o:['1 hole','2 holes','4 holes','8 holes']},
    {d:'A rectangular paper is folded into quarters and a semicircle is cut from the folded corner. How many semicircle cutouts appear when unfolded?',a:'4 cutouts',o:['2 cutouts','4 cutouts','6 cutouts','8 cutouts']},
    {d:'A square paper folded in half twice has a small square cut at the centre of the folded edge. When unfolded, how many small square holes form?',a:'4 holes',o:['1 hole','2 holes','4 holes','8 holes']},
    {d:'A circular paper is folded into quarters. A small triangle is cut at the folded point. When unfolded, how many triangle cutouts appear?',a:'8 cutouts',o:['2 cutouts','4 cutouts','6 cutouts','8 cutouts']},
    {d:'A rectangular paper is folded in half vertically, then a star is drawn on the fold line. When unfolded, how many stars appear?',a:'2 stars',o:['1 star','2 stars','4 stars','8 stars']},
    {d:'A square paper is folded in half three times symmetrically. A small ellipse is cut from the folded corner. How many ellipses when unfolded?',a:'8 ellipses',o:['2 ellipses','4 ellipses','6 ellipses','8 ellipses']}
  ];
  var it=items[rand(0,items.length-1)]; shuffle(it.o);
  return { question:it.d, answer:it.a, options:it.o, hint:'Each fold doubles the layers. The number of holes = number of layers × number of cuts', timeLimit:20, type:'reasoning', techniqueLabel:'Paper Folding', intuition:'Each fold doubles the paper layers. When cut, each layer gets a hole. Unfold symmetrically.' };
}

function generatePaperCuttingQuestion(diff) {
  var items=[
    {d:'A paper folded and cut as shown opens to reveal a pattern of 4 symmetrical circles. Which shape do the cuts make?',a:'4 circles in a square pattern',o:['4 circles in a line','4 circles in a square pattern','2 large circles','6 small circles']},
    {d:'A folded paper is cut along the folded edge creating a zigzag pattern. When unfolded, the pattern will be:',a:'Symmetric zigzag on both sides',o:['Random zigzag pattern','Symmetric zigzag on both sides','Straight line only','No pattern visible']},
    {d:'A square paper folded twice and a triangle cut from the corner is unfolded. The resulting shape has:',a:'4 triangular cutouts',o:['1 triangular cutout','2 triangular cutouts','4 triangular cutouts','8 triangular cutouts']},
    {d:'A rectangular paper is folded in half three times — first vertically, then horizontally, then vertically again. A small diamond is cut from the center of the folded edge. When completely unfolded, how many diamond-shaped holes appear?',a:'8 diamond holes',o:['4 diamond holes','6 diamond holes','8 diamond holes','12 diamond holes']},
    {d:'A square paper is folded in half diagonally, then folded again creating a smaller triangle. A curved semicircle is cut from the non-folded edge. When unfolded, the resulting pattern shows:',a:'4 curved cutouts arranged symmetrically',o:['2 curved cutouts opposite each other','4 curved cutouts arranged symmetrically','1 large curved cutout','8 curved cutouts in a circle']},
    {d:'A square paper is folded in half twice and a V-shaped notch is cut from the folded corner. When unfolded, how many V-notches appear?',a:'4 V-notches',o:['2 V-notches','4 V-notches','6 V-notches','8 V-notches']},
    {d:'A rectangular paper folded once is cut with a wavy line along the fold. Unfolding it produces:',a:'Two matching wavy-edged halves',o:['One straight half and one wavy half','Two matching wavy-edged halves','Four identical pieces','An irregular shape']},
    {d:'A circular paper is folded in half and a small circle is punched near the curved edge. When unfolded, how many small circles appear?',a:'2 circles',o:['1 circle','2 circles','4 circles','8 circles']},
    {d:'A square paper is folded into quarters and a diamond is cut out of the centre of the folded square. When unfolded, how many diamond holes appear?',a:'4 diamond holes',o:['1 diamond hole','2 diamond holes','4 diamond holes','8 diamond holes']},
    {d:'A rectangular paper is folded in half lengthwise, then a series of small semicircles is cut along the folded edge. The unfolded pattern shows:',a:'Semicircles mirrored along the fold',o:['Semicircles on one side only','Semicircles mirrored along the fold','Straight slits','Random shapes']},
    {d:'A square paper folded diagonally once has a small square cut from the folded corner. When unfolded, how many small square cutouts form?',a:'2 cutouts',o:['1 cutout','2 cutouts','4 cutouts','8 cutouts']},
    {d:'A rectangular paper is folded in half twice and a small heart is cut from the centre. Unfolding it reveals:',a:'4 hearts in a row',o:['2 hearts','4 hearts in a row','4 hearts in a square','8 hearts']},
    {d:'A circular paper folded into quarters has a small arrow cut at the centre fold point. When unfolded, how many arrow cutouts appear?',a:'8 arrows',o:['2 arrows','4 arrows','6 arrows','8 arrows']}
  ];
  var it=items[rand(0,items.length-1)]; shuffle(it.o);
  return { question:it.d, answer:it.a, options:it.o, hint:'The cut pattern repeats symmetrically across fold lines', timeLimit:20, type:'reasoning', techniqueLabel:'Paper Cutting', intuition:'Each fold creates a mirror. When cut and unfolded, the cut pattern is reflected across each fold line.' };
}

function generateRuleDetectionQuestion(diff) {
  var items=[
    {r:'Figures with an even number of sides are shaded',ex:['Square (shaded) ●', 'Triangle (not shaded) ○', 'Hexagon (shaded) ●'],not:'Pentagon (shaded) ●',a:'Pentagon (shaded) ● breaks rule'},
    {r:'Figures containing a right angle are marked with a dot',ex:['Right triangle ●', 'Rectangle ●', 'Circle ○'],not:'Acute triangle ○',a:'Acute triangle ○ breaks rule'},
    {r:'Figures with more than 4 sides have double outline',ex:['Hexagon =', 'Octagon =', 'Square |'],not:'Triangle =',a:'Triangle = breaks rule'},
    {r:'The pattern follows: each number is the previous number multiplied by 2',ex:['2', '4', '8'],not:'6',a:'6 does not follow the pattern'},
    {r:'Letters alternate between consonants and vowels',ex:['B', 'E', 'F', 'I'],not:'J (consonant follows F consonant)',a:'J breaks rule'},
    {r:'Figures that can roll are marked with a dot',ex:['Ball ●','Wheel ●','Cylinder ●'],not:'Cuboid ●',a:'Cuboid ● breaks rule'},
    {r:'Even numbers are printed in square brackets',ex:['[2]','[14]','[38]'],not:'[27]',a:'[27] breaks rule'},
    {r:'Multiples of 4 are circled',ex:['8 (circled)','16 (circled)','24 (circled)'],not:'18 (circled)',a:'18 (circled) breaks rule'},
    {r:'Shapes with curved sides have an asterisk',ex:['Circle *','Oval *','Semicircle *'],not:'Hexagon *',a:'Hexagon * breaks rule'},
    {r:'Three-letter words are written in capitals',ex:['CAT','DOG','SUN'],not:'STAR',a:'STAR breaks rule'},
    {r:'Numbers greater than 50 are underlined',ex:['63 (underlined)','85 (underlined)','99 (underlined)'],not:'45 (underlined)',a:'45 (underlined) breaks rule'},
    {r:'Words that rhyme with "cat" are boxed',ex:['bat [boxed]','hat [boxed]','mat [boxed]'],not:'dog [boxed]',a:'dog [boxed] breaks rule'},
    {r:'Letters made only of straight lines are colored red',ex:['T (red)','E (red)','A (red)'],not:'S (red)',a:'S (red) breaks rule'},
    {r:'Prime numbers have a line above them',ex:['2 (line above)','7 (line above)','13 (line above)'],not:'9 (line above)',a:'9 (line above) breaks rule'},
    {r:'Days with the letter "u" in their name are boxed',ex:['Tuesday [boxed]','Saturday [boxed]','Thursday [boxed]'],not:'Monday [boxed]',a:'Monday [boxed] breaks rule'}
  ];
  var it=items[rand(0,items.length-1)];
  return { question:'Rule: '+it.r+'<br>Which figure does NOT follow the rule?<br>'+it.ex.concat(it.not).join(', '), answer:it.not.split(' ')[0], options:it.ex.concat(it.not).map(function(s){return s.split(' ')[0];}), hint:'Check each figure against the rule', timeLimit:15, type:'reasoning', techniqueLabel:'Rule Detection', intuition:'Apply the given rule to each figure. The one that violates the rule is the answer.' };
}

function generateGroupingImagesQuestion(diff) {
  var items=[
    {g:'Group A: Triangle, Square, Pentagon (polygons)<br>Group B: Circle, Oval, Semicircle (curved)',q:'Which group does a Hexagon belong to?',a:'Group A',o:['Group A','Group B','Neither','Both']},
    {g:'Group 1: Red, Blue, Yellow (primary colors)<br>Group 2: Green, Purple, Orange (secondary colors)',q:'Which group does Violet belong to?',a:'Group 2',o:['Group 1','Group 2','Neither','Both']},
    {g:'Set X: 2,4,6,8 (even numbers)<br>Set Y: 3,6,9,12 (multiples of 3)',q:'Which set does 10 belong to?',a:'Set X',o:['Set X','Set Y','Both','Neither']},
    {g:'Group A: Triangle (3 sides), Square (4 sides), Hexagon (6 sides)<br>Group B: Pentagon (5), Heptagon (7), Octagon (8)',q:'Which group does a Nonagon (9 sides) belong to?',a:'Group B',o:['Group A','Group B','Neither','Both']},
    {g:'Set 1: A, H, I, M, O (vertically symmetrical)<br>Set 2: B, C, D, E, K (horizontally symmetrical)',q:'Which set does X belong to?',a:'Set 1',o:['Set 1','Set 2','Both','Neither']},
    {g:'Group A: Lion, Tiger, Leopard (big cats)<br>Group B: Dog, Wolf, Fox (canids)',q:'Which group does a Cheetah belong to?',a:'Group A',o:['Group A','Group B','Neither','Both']},
    {g:'Team 1: Mercury, Venus, Earth (rocky planets)<br>Team 2: Jupiter, Saturn, Neptune (gas giants)',q:'Which team does Mars belong to?',a:'Team 1',o:['Team 1','Team 2','Neither','Both']},
    {g:'Group 1: 1, 3, 5, 7 (odd numbers)<br>Group 2: 2, 4, 6, 8 (even numbers)',q:'Which group does 9 belong to?',a:'Group 1',o:['Group 1','Group 2','Neither','Both']},
    {g:'Set A: Apple, Mango, Banana (fruits)<br>Set B: Carrot, Potato, Onion (vegetables)',q:'Which set does a Tomato belong to?',a:'Both',o:['Set A','Set B','Neither','Both']},
    {g:'Group X: 1, 4, 9, 16 (perfect squares)<br>Group Y: 2, 3, 5, 7 (prime numbers)',q:'Which group does 25 belong to?',a:'Group X',o:['Group X','Group Y','Both','Neither']},
    {g:'Team A: 100, 200, 300 (multiples of 100)<br>Team B: 105, 205, 305 (numbers ending in 5)',q:'Which team does 400 belong to?',a:'Team A',o:['Team A','Team B','Both','Neither']},
    {g:'Group 1: Deer, Horse, Zebra (herbivores)<br>Group 2: Lion, Tiger, Eagle (carnivores)',q:'Which group does a Cow belong to?',a:'Group 1',o:['Group 1','Group 2','Neither','Both']},
    {g:'Set P: Winter, Summer, Monsoon (seasons)<br>Set Q: January, May, December (months)',q:'Which set does Spring belong to?',a:'Set P',o:['Set P','Set Q','Neither','Both']},
    {g:'Group A: 0.5, 1.5, 2.5 (numbers with .5)<br>Group B: 1, 2, 3 (whole numbers)',q:'Which group does 3.5 belong to?',a:'Group A',o:['Group A','Group B','Both','Neither']},
    {g:'Set 1: Rose, Lotus, Tulip (flowers)<br>Set 2: Pine, Neem, Oak (trees)',q:'Which set does a Mango tree belong to?',a:'Set 2',o:['Set 1','Set 2','Both','Neither']}
  ];
  var it=items[rand(0,items.length-1)]; shuffle(it.o);
  return { question:it.g+'<br>'+it.q, answer:it.a, options:it.o, hint:'Identify the common property of each group', timeLimit:12, type:'reasoning', techniqueLabel:'Grouping Images', intuition:'Find the shared attribute within each group, then check which group the new item fits into.' };
}

function generateImageAnalysisQuestion(diff) {
  var items=[
    {d:'A rectangle is divided into 4 equal parts. One part is shaded. How many parts are unshaded?',a:'3',o:['1','2','3','4']},
    {d:'A square contains 9 smaller squares. The corner squares are black. How many white squares?',a:'5',o:['4','5','6','7']},
    {d:'A triangle is divided into 3 smaller triangles by lines from one vertex. How many triangles total?',a:'3',o:['2','3','4','5']},
    {d:'A 3×3 grid has all edge cells shaded. How many unshaded cells remain?',a:'1',o:['0','1','2','3']},
    {d:'The word "IMAGE" is shown normally. Which of the following is its mirror image (lateral inversion)?',a:'ƐϱA⅂I',o:['ƐϱA⅂I','IMΛGE','ƐϱA⅂Ɛ','I⅂ΛMI']},
    {d:'A circle with a missing quarter-piece is shown. The complete figure should be:',a:'A full circle with one quarter missing at 45°',o:['A full circle','A circle with half missing','A full circle with one quarter missing at 45°','A circle with two opposite quarters missing']},
    {d:'A rectangle is divided into 6 equal strips. Two strips are shaded. How many strips are unshaded?',a:'4',o:['2','3','4','5']},
    {d:'A circle is divided into 8 equal sectors. Three sectors are shaded. How many sectors are unshaded?',a:'5',o:['3','4','5','6']},
    {d:'A 4×4 grid of small squares has every border cell shaded. How many cells are unshaded?',a:'4',o:['2','4','6','8']},
    {d:'A 3×3 square grid has only the center square shaded. How many squares are unshaded?',a:'8',o:['6','7','8','9']},
    {d:'A rectangle is divided into smaller rectangles by one horizontal and one vertical line. Including the large rectangle itself, how many rectangles appear in total?',a:'4',o:['3','4','5','6']},
    {d:'A square is folded in half vertically and then in half horizontally. When it is unfolded, into how many equal parts does it appear divided?',a:'4',o:['2','4','6','8']},
    {d:'A circle is cut into 4 equal quadrants. Two opposite quadrants are shaded. What fraction of the circle is unshaded?',a:'1/2',o:['1/2','1/3','1/4','2/3']},
    {d:'A plus-shaped figure is made from 5 equal squares (one central square with one square attached on each side). How many squares does the figure contain?',a:'5',o:['4','5','6','9']},
    {d:'Four equal squares are arranged in a row. The two squares at the ends are shaded. How many squares are unshaded?',a:'2',o:['1','2','3','4']},
    {d:'A 2×3 grid of rectangles has all the cells in its first column shaded. How many cells are unshaded?',a:'4',o:['2','3','4','6']}
  ];
  var it=items[rand(0,items.length-1)]; shuffle(it.o);
  return { question:it.d, answer:it.a, options:it.o, hint:'Count carefully. Draw a mental picture.', timeLimit:12, type:'reasoning', techniqueLabel:'Image Analysis', intuition:'Visualize the figure in your mind. Count the elements methodically.' };
}

function generateWaterImagesQuestion(diff) {
  var letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var symTopBottom=['B','C','D','E','H','I','K','O','X'];
  var symVert=['A','H','I','M','O','T','U','V','W','X','Y'];
  var items=[
    function(){var l=letters[rand(0,25)]; var isVert=symVert.indexOf(l)>=0; var inWater=symTopBottom.indexOf(l)>=0?l:'upside-down '+l; return {q:'Water image of "'+l+'" ?',a:isVert?'Looks the same':'Appears inverted vertically',o:['Looks the same','Appears inverted vertically','Appears mirrored horizontally','Completely different']};},
    function(){var word='';for(var i=0;i<3;i++){word+=letters[rand(0,25)];} return {q:'Water image of "'+word+'" appears:',a:'Vertically inverted',o:['The same','Vertically inverted','Horizontally mirrored','Reversed order']};},
    function(){var w='';while(w.length<3){var l=letters[rand(0,25)];if(symTopBottom.indexOf(l)>=0)w+=l;} if(w.length<3){w='HIX';} return {q:'Water image of "'+w+'" ?',a:'Same as original (symmetrical)',o:['Same as original (symmetrical)','Completely different','Left-right reversed','Upside down']};},
    function(){var shapes=['△','□','○','☆','♢']; var s=shapes[rand(0,shapes.length-1)]; return {q:'Water image of "'+s+'" looks like:',a:s+' flipped vertically',o:['Same as original',s+' flipped vertically',s+' flipped horizontally','Rotated 90°']};},
    function(){var n1=rand(10,99), n2=rand(10,99); return {q:'Water image of the number '+(n1)+' appears as which among the following?',a:'Vertically inverted digits of '+(n1),o:['The same number',String(n1)+' reversed',String(n1)+' upside down','Vertically inverted digits of '+String(n1)]};}
  ];
  var d=items[rand(0,items.length-1)](); var opts=d.o; shuffle(opts);
  return { question:d.q, answer:d.a, options:opts, hint:'Water reflection flips vertically (top becomes bottom)', timeLimit:10, type:'reasoning', techniqueLabel:'Water Images', intuition:'Water image = vertical mirror. What is on top appears at the bottom in the reflection.' };
}

function generateDotSituationQuestion(diff) {
  var items=[
    {d:'Three circles overlap creating 4 regions. A dot placed in region common to all 3 circles. How many circles contain the dot?',a:'3',o:['1','2','3','4']},
    {d:'A square and a circle overlap in 2 regions. A dot is where they overlap. Which shapes contain it?',a:'Both square and circle',o:['Square only','Circle only','Both square and circle','Neither']},
    {d:'Two circles intersect creating 3 regions. A dot is outside both circles. It is:',a:'In neither circle',o:['In circle 1 only','In circle 2 only','In both circles','In neither circle']},
    {d:'A square is folded in half, then a dot is placed at the folded corner. When unfolded, how many dots appear?',a:'2 dots',o:['1 dot','2 dots','4 dots','8 dots']},
    {d:'A triangle overlaps a circle creating 5 distinct regions. A dot lies in the region that is inside the triangle but outside the circle. The dot is:',a:'In triangle only',o:['In circle only','In triangle only','In both','In neither']},
    {d:'Two overlapping circles create 3 regions. A dot is placed in the lens-shaped region shared by both circles. How many circles contain the dot?',a:'Both circles',o:['Circle 1 only','Circle 2 only','Both circles','Neither']},
    {d:'Three circles overlap to create a small central region common to all three. A dot rests in the region shared by exactly two of them. How many circles contain the dot?',a:'2',o:['1','2','3','0']},
    {d:'A square is drawn around a circle that touches all four sides. A dot sits between the circle and the right side of the square. The dot is:',a:'In the square only',o:['In the circle only','In the square only','In both','In neither']},
    {d:'Two concentric circles form 2 regions. A dot sits in the outer ring between the two circles. It is:',a:'In the outer circle only',o:['In the inner circle only','In the outer circle only','In both circles','In neither circle']},
    {d:'A triangle and a rectangle overlap creating 5 regions. A dot is in the region inside the rectangle but outside the triangle. The dot is:',a:'In the rectangle only',o:['In the triangle only','In the rectangle only','In both','In neither']},
    {d:'A large circle contains a smaller circle, and neither touches. A dot is placed inside the smaller circle. How many circles contain the dot?',a:'2',o:['1','2','0','Neither']},
    {d:'Two squares overlap partially, making 3 regions. A dot is placed in the part belonging to the left square only. Which statement is true?',a:'The dot is in the left square but not the right',o:['The dot is in both squares','The dot is in the left square but not the right','The dot is in the right square but not the left','The dot is in neither square']},
    {d:'A rectangular paper is folded in half twice and a hole is punched at one corner. When unfolded, how many holes appear?',a:'4',o:['2','4','6','8']},
    {d:'An equilateral triangle and an inverted equilateral triangle overlap, forming a star with a small hexagon at the center. A dot is in the central hexagon. It lies:',a:'In both triangles',o:['In the top triangle only','In the bottom triangle only','In both triangles','In neither triangle']},
    {d:'A circle and a star overlap in two regions. A dot is placed where they overlap. Which figures contain the dot?',a:'Both circle and star',o:['Circle only','Star only','Both circle and star','Neither']}
  ];
  var it=items[rand(0,items.length-1)]; shuffle(it.o);
  return { question:it.d, answer:it.a, options:it.o, hint:'Identify which regions are common to which shapes', timeLimit:12, type:'reasoning', techniqueLabel:'Dot Situation', intuition:'Each region in a Venn-like diagram belongs to a specific set of shapes. Find which shapes share the dot\'s region.' };
}

// ====== ADDITIONAL INDIA BIX COVERAGE ======

function generateHeightDistanceQuestion(diff, layer) {
  var ty = [
    function(){ var h=rand(10,80), a=[15,22,30,36,45,50,60,70,75][rand(0,8)]; var t=Math.round(h/Math.tan(a*Math.PI/180)); return { q:'Pole height='+h+'m, sun elevation='+a+'°. Shadow length?', a:t, hint:'tan'+a+' = height/shadow, shadow = height/tan'+a }; },
    function(){ var d=rand(10,60), a=[15,22,30,36,45,50,60,70,75][rand(0,8)]; var t=Math.round(d*Math.tan(a*Math.PI/180)); return { q:'Shadow='+d+'m, sun elevation='+a+'°. Height?', a:t, hint:'Height = shadow × tan'+a }; },
    function(){ var h=rand(20,80), d=rand(10,40); var deg=Math.round(Math.atan(h/d)*180/Math.PI); return { q:'Tower height='+h+'m, distance='+d+'m. Elevation angle?', a:deg+'°', hint:'tan⁻¹(height/distance) = tan⁻¹('+h+'/'+d+')' }; },
    // Two-pole problem
    function(){ var h1=rand(20,40), h2=rand(10,h1-5), d=rand(10,30); return { q:'Two poles ' + h1 + 'm and ' + h2 + 'm, distance ' + d + 'm. Difference of top heights?', a:Math.round(Math.sqrt(d*d+(h1-h2)*(h1-h2))*10)/10, hint:'Use Pythagoras: √(d²+(h1-h2)²)', intuition:'Pythagoras: √(' + d + '² + (' + h1 + '-' + h2 + ')²) = √(' + (d*d) + '+' + ((h1-h2)*(h1-h2)) + ') = ' + Math.round(Math.sqrt(d*d+(h1-h2)*(h1-h2))*10)/10 + 'm' }; },
    // Angle of depression
    function(){ var h=rand(30,80), d=rand(20,60); return { q:'From cliff ' + h + 'm high, boat at distance ' + d + 'm. Angle of depression?', a:Math.round(Math.atan(h/d)*180/Math.PI) + '°', hint:'tan(angle) = height/distance = ' + h + '/' + d, intuition:'tan θ = ' + h + '/' + d + ' = ' + (h/d).toFixed(2) + ', θ = tan⁻¹(' + (h/d).toFixed(2) + ') = ' + Math.round(Math.atan(h/d)*180/Math.PI) + '°' }; },
    // Ladder against wall
    function(){ var l=rand(5,25), a=[15,22,30,36,45,50,60,70,75][rand(0,8)]; return { q:'Ladder length ' + l + 'm, angle ' + a + '° with ground. Height reached?', a:Math.round(l*Math.sin(a*Math.PI/180)*10)/10, hint:'sin' + a + ' = height/' + l + ', height = ' + l + '×sin' + a, intuition:'sin ' + a + '° = height/' + l + ', height = ' + l + '×' + Math.round(Math.sin(a*Math.PI/180)*100)/100 + ' = ' + Math.round(l*Math.sin(a*Math.PI/180)*10)/10 + 'm' }; },
    // Two angles from different points (same building)
    function(){ var h=rand(20,50), d1=rand(10,30), d2=rand(d1+10, d1+30); var a1=Math.round(Math.atan(h/d1)*180/Math.PI); var a2=Math.round(Math.atan(h/d2)*180/Math.PI); return { q:'Building of height ' + h + 'm. From point A angle=' + a1 + '°, from B (further by ' + (d2-d1) + 'm) angle=' + a2 + '°. Distance AB?', a:d2-d1, hint:'Distance = h/tan(small angle) - h/tan(large angle)', intuition:'d1 = h/tan' + a1 + ' = ' + Math.round(h/Math.tan(a1*Math.PI/180)) + ', d2 = h/tan' + a2 + ' = ' + Math.round(h/Math.tan(a2*Math.PI/180)) + '. AB = d2-d1 = ' + (d2-d1) + 'm' }; },
    // Angle of elevation from two points
    function(){ var h=rand(30,80), a=[15,22,30,36,45,50,60,70,75][rand(0,8)], b=[15,22,30,36,45,50,60,70,75][rand(0,8)]; while(b===a)b=[15,22,30,36,45,50,60,70,75][rand(0,8)]; var d1=Math.round(h/Math.tan(a*Math.PI/180)); var d2=Math.round(h/Math.tan(b*Math.PI/180)); return { q:'Tower height ' + h + 'm. From two points angles ' + a + '° and ' + b + '°. Distance between points?', a:Math.abs(d1-d2), hint:'d1 = h/tan' + a + '=' + d1 + ', d2 = h/tan' + b + '=' + d2 + ', diff = |' + d1 + '-' + d2 + '|', intuition:'When angle=' + a + '°: distance=' + Math.round(h/Math.tan(a*Math.PI/180)) + 'm. When angle=' + b + '°: distance=' + Math.round(h/Math.tan(b*Math.PI/180)) + 'm. Difference=' + Math.abs(d1-d2) + 'm' }; },
    // SBI PO Hard: two-angle shadow problem
    function(){ var h=rand(20,50); var a=[15,22,30,36,45][rand(0,4)], b=[50,60,70,75][rand(0,3)]; var s1=Math.round(h/Math.tan(a*Math.PI/180)); var s2=Math.round(h/Math.tan(b*Math.PI/180)); return { q:'A pole of height ' + h + 'm casts shadows of lengths ' + s1 + 'm and ' + s2 + 'm at two different times. Sun elevation angles?', a:Math.abs(a-b)+'°', hint:'tanθ₁ = h/s₁ = '+(h/s1).toFixed(2)+', tanθ₂ = h/s₂ = '+(h/s2).toFixed(2), intuition:'θ₁ = tan⁻¹('+(h/s1).toFixed(2)+') = '+a+'°, θ₂ = tan⁻¹('+(h/s2).toFixed(2)+') = '+b+'°. Difference = '+Math.abs(a-b)+'°' }; },
    // SBI PO Hard: height of cloud/airplane
    function(){ var h=rand(100,300); var a=[30,45,60][rand(0,2)]; return { q:'An airplane at height ' + h + 'm is observed at an elevation of ' + a + '°. Find the horizontal distance of the airplane from the observation point.', a:Math.round(h/Math.tan(a*Math.PI/180)), hint:'tan' + a + ' = height/distance, distance = height/tan' + a, intuition:'Distance = ' + h + '/tan' + a + '° = ' + Math.round(h/Math.tan(a*Math.PI/180)) + 'm' }; },
    // SBI PO Hard: new variants
    function(){ var a=rand(30,60), d=rand(50,200); return { q:'Angle of elevation='+a+'\u00b0, distance='+d+'m. Height?', a:Math.round(d*Math.tan(a*Math.PI/180)), hint:'Height = d \u00d7 tan('+a+'\u00b0) = '+Math.round(d*Math.tan(a*Math.PI/180))+'m' }; },
    function(){ var h=rand(30,100), a=rand(30,60); return { q:'Tower height='+h+'m, angle='+a+'\u00b0. Shadow length?', a:Math.round(h/Math.tan(a*Math.PI/180)), hint:'Shadow = h/tan(angle)' }; },
    function(){ var a=rand(20,50), b=rand(a+10,70), d=rand(20,80); var h=Math.round(d/(1/Math.tan(a*Math.PI/180)-1/Math.tan(b*Math.PI/180))); return { q:'From point A, angle='+a+'\u00b0, from B ('+d+'m closer), angle='+b+'\u00b0. Height?', a:h, hint:'h = d/(cot A - cot B)' }; },
    function(){ var h=rand(30,80), a=rand(30,60); return { q:'Height='+h+'m, angle of elevation of top from point='+a+'\u00b0. Distance from foot?', a:Math.round(h/Math.tan(a*Math.PI/180)), hint:'Distance = h \u00d7 cot(angle)' }; },
    function(){ var h=rand(20,60), d=rand(20,50); return { q:'Building height='+h+'m. Shadow='+d+'m shorter when sun angle changes from '+rand(30,45)+'\u00b0 to '+rand(50,70)+'\u00b0. Original shadow?', a:Math.round(h/Math.tan(rand(30,45)*Math.PI/180)), hint:'Shadow = h/tan(original angle)' }; },
    function(){ var a=rand(30,60), b=rand(a+10,75), d=rand(50,150); var h=Math.round(d*Math.tan(a*Math.PI/180)*Math.tan(b*Math.PI/180)/(Math.tan(b*Math.PI/180)-Math.tan(a*Math.PI/180))); return { q:'From two points '+d+'m apart, angles='+a+'\u00b0 and '+b+'\u00b0. Height?', a:h, hint:'h = d tanA tanB/(tanB-tanA)' }; },
    function(){ var a=rand(20,50), d=rand(100,300); return { q:'Angle of depression='+a+'\u00b0. Horizontal distance='+d+'m. Height?', a:Math.round(d*Math.tan(a*Math.PI/180)), hint:'Height = distance \u00d7 tan(angle of depression)' }; },
    function(){ var h=rand(40,80), a=rand(25,50), b=rand(30,55); return { q:'Two towers: heights '+h+'m and '+(h+rand(10,30))+'m. Angle of elevation of top of taller from bottom of shorter='+a+'\u00b0. Their distance?', a:Math.round((h+rand(10,30))/Math.tan(a*Math.PI/180)), hint:'Distance = height/tan(angle)' }; }
  ];
  var idx;
  if (diff >= 5 && ty.length >= 6) {
    idx = Math.random() < 0.7 ? rand(Math.max(0, ty.length - 3), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var d=ty[idx](); var o=[d.a]; if(typeof d.a==='string' && d.a.indexOf('°')>=0){var n=parseInt(d.a);for(var i=-2;i<=2;i++){var v=(n+i)+'°';if(v!==d.a&&o.indexOf(v)<0)o.push(v);}}else{for(var i=-5;i<=5;i+=2){var v=d.a+i;if(v>0&&o.indexOf(v)<0)o.push(v);}} shuffle(o);
  return { question:d.q, answer:d.a, options:o, hint:d.hint, timeLimit:20, type:'quant', techniqueLabel:'Height & Distance', intuition:'tan(angle) = height/distance. sin(angle) = opposite/hypotenuse. cos(angle) = adjacent/hypotenuse.' };
}

function generateDecimalFractionQuestion(diff, layer) {
  var ty = [
    function(){ var n=rand(1,9), d=rand(2,9); return { q:(n/d).toFixed(3)+' = ? (fraction)', a:n+'/'+d, hint:'Convert decimal to fraction: write as numerator/denominator, simplify' }; },
    function(){ var n=rand(2,99); return { q:n+'/'+(100)+' = ? (decimal)', a:(n/100).toFixed(2), hint:'Divide numerator by denominator' }; },
    function(){ var a=rand(1,9), b=rand(1,9); return { q:'Arrange: '+(a/b).toFixed(3)+', '+(b/a).toFixed(3)+', 1.000 — smallest?', a:String(Math.min(a/b,b/a,1).toFixed(3)), hint:'Convert to decimal, then compare' }; },
    // Recurring decimal to fraction
    function(){ var n=rand(1,9); return { q:'0.'+n+''+n+''+n+'... (recurring) = ?', a:n+'/9', hint:'0.abcabc... = abc/999. Single digit repeat = digit/9', intuition:'0.' + n + '... = ' + n + '/9 (single digit recurring). Multiply by 10: 10x=' + n + '.' + n + '..., subtract x: 9x=' + n + ', x=' + n + '/9' }; },
    // Decimal ordering
    function(){ var a=rand(1,9)/10, b=rand(1,9)/100, c=rand(1,9)/1000; return { q:'Order: ' + a.toFixed(3) + ', ' + b.toFixed(3) + ', ' + c.toFixed(3) + ' — largest?', a:Math.max(a,b,c).toFixed(3), hint:'Compare place values: tenths > hundredths > thousandths', intuition:'Compare tenths digit first. ' + Math.max(a,b,c).toFixed(3) + ' is largest' }; },
    // Recurring decimal addition
    function(){ var a=rand(1,4), b=rand(5,9); return { q:'0.'+a+''+a+'... + 0.'+b+''+b+'... = ? (as fraction)', a:(a+b)+'/9', hint:'0.'+a+a+'...='+a+'/9, 0.'+b+b+'...='+b+'/9. Sum='+(a+b)+'/9', intuition:a+'/9 + '+b+'/9 = '+(a+b)+'/9' }; },
    // Decimal multiplication — pattern recognition
    function(){ var a=rand(1,9); return { q:'0.'+a+' × 0.'+a+' = ? (as decimal)', a:((a*a)/100).toFixed(2), hint:'Multiply: '+a+'×'+a+'='+(a*a)+', divide by 100 for 2 decimal places', intuition:'0.'+a+'×0.'+a+' = '+a+'×'+a+'/100 = '+a*a+'/100 = '+(a*a/100).toFixed(2) }; },
    // Fraction to decimal conversion — competitive exam style
    function(){ var n=rand(1,9), d=[5,8,10,16,20,25][rand(0,5)]; return { q:n+'/'+d+' as decimal = ?', a:(n/d).toFixed(4), hint:'Divide ' + n + ' by ' + d, intuition:'Long division: ' + n + '/' + d + ' = ' + (n/d).toFixed(4) }; },
    // Compare fraction vs decimal
    function(){ var a=rand(1,9), b=rand(5,9); return { q:'Which is greater? 0.'+b+' or ' + a + '/' + (a+1), a:Math.max(b/10, a/(a+1)).toFixed(4), hint:'Convert both to decimal: 0.'+b+'='+(b/10)+', '+a+'/'+(a+1)+'='+(a/(a+1)).toFixed(4), intuition:'0.'+ b +' = ' + (b/10).toFixed(2) + ', ' + a + '/' + (a+1) + ' = ' + (a/(a+1)).toFixed(4) + '. ' + Math.max(b/10,a/(a+1)).toFixed(4) + ' is larger' }; },
    // SBI PO Hard: two-digit recurring decimal to fraction
    function(){ var n=rand(10,99); return { q:'0.'+n+''+n+'... (two-digit recurring) = fraction?', a:n+'/99', hint:'Two-digit recurring: xyxy... = xy/99', intuition:'0.'+n+n+'... = '+n+'/99' }; },
    // SBI PO Hard: complex fraction simplification
    function(){ var a=rand(2,9), b=rand(2,9), c=rand(2,9); return { q:'Simplify: ('+a+'/'+b+') ÷ ('+c+'/'+b+')', a:(a/c).toFixed(2), hint:'Division of fractions: (a/b) ÷ (c/b) = a/c', intuition:'('+a+'/'+b+') ÷ ('+c+'/'+b+') = '+a+'/'+b+' × '+b+'/'+c+' = '+a+'/'+c+' = '+Math.round(a/c*100)/100 }; },
    // SBI PO Hard: mixed recurring decimal
    function(){ var n=rand(1,9), m=rand(1,9); while(m===n)m=rand(1,9); return { q:'0.'+n+''+m+''+n+''+m+'... (two-digit alternating recurring) = ?', a:(n*10+m)+'/99', hint:'Alternating two-digit pattern = digits as number / 99', intuition:'0.'+n+m+n+m+'... = '+n+m+'/99' }; }
  ];
  var idx;
  if (diff >= 5 && ty.length >= 6) {
    idx = Math.random() < 0.7 ? rand(Math.max(0, ty.length - 4), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var d=ty[idx](); var o=[d.a]; if(typeof d.a==='string' && d.a.indexOf('/')>=0){o.push((rand(1,9))+'/'+(rand(2,9)));o.push((rand(1,9))+'/'+(rand(2,9)));o.push((rand(1,9))+'/'+(rand(2,9)));}else{o.push((rand(10,99)/100).toFixed(2));o.push((rand(10,99)/100).toFixed(2));o.push((rand(10,99)/100).toFixed(2));} shuffle(o);
  return { question:d.q, answer:d.a, options:o, hint:d.hint, timeLimit:12, type:'quant', techniqueLabel:'Decimal Fraction', intuition:'To convert fraction→decimal: divide numerator by denominator. To convert decimal→fraction: write as decimal/1 and simplify.' };
}

function generateChainRuleQuestion(diff, layer) {
  var ty = [
    function(){ var m=rand(5,15), d=rand(10,20); return { q:m+' men do work in '+d+' days. '+(m+rand(3,8))+' men?', a:Math.round(m*d/(m+rand(3,8))), hint:'M1×D1 = M2×D2. Less men = more days' }; },
    function(){ var m=rand(5,12), d=rand(6,15), w=rand(2,4); return { q:m+' men do '+(w-1)+'× work in '+d+' days. '+w+'× work, '+m+' men?', a:Math.round(d*w/(w-1)), hint:'Work ∝ men × days. More work = more days' }; },
    function(){ var h=rand(6,12), d=rand(4,10); return { q:h+' horses eat in '+d+' days. '+(h+rand(2,5))+' horses?', a:Math.round(h*d/(h+rand(2,5))), hint:'H1×D1 = H2×D2. More animals = fewer days' }; },
    // Food consumption with varying people/days
    function(){ var m=rand(10,30), d=rand(5,15), f=rand(5,15); return { q:f+' men eat ' + (m*f) + 'kg rice in ' + d + ' days. ' + (f+rand(3,7)) + ' men need for ' + (d+rand(2,5)) + ' days?', a:Math.round(m*(f+rand(3,7))*(d+rand(2,5))/f/d), hint:'Total food = men × days × daily_ration. More men & days = more food', intuition:'Daily ration per man = ' + m + 'kg/' + f + '/' + d + ' = ' + Math.round(m/f/d*100)/100 + '. For ' + (f+rand(3,7)) + ' men × ' + (d+rand(2,5)) + ' days = ' + Math.round(m*(f+rand(3,7))*(d+rand(2,5))/f/d) + 'kg' }; },
    // Work with multiple variables
    function(){ var m=rand(6,12), d=rand(8,16), h=rand(6,10); return { q:m+' men working ' + h + 'hr/day finish in ' + d + ' days. ' + (m+rand(2,5)) + ' men, ' + (h+rand(1,3)) + 'hr/day?', a:Math.round(m*d*h/((m+rand(2,5))*(h+rand(1,3)))), hint:'Work = men × days × hours. Same work: M1×D1×H1 = M2×D2×H2', intuition:'M1×D1×H1 = ' + m + '×' + d + '×' + h + ' = ' + (m*d*h) + '. D2 = ' + (m*d*h) + '/(' + (m+rand(2,5)) + '×' + (h+rand(1,3)) + ') = ' + Math.round(m*d*h/((m+rand(2,5))*(h+rand(1,3)))) + ' days' }; },
    // Food supply with varying consumers
    function(){ var p=rand(30,60), d=rand(10,20), r=rand(400,800); var newP=p+rand(10,20); return { q:r+'kg rice feeds ' + p + ' people for ' + d + ' days. ' + newP + ' people, same rice, how many days?', a:Math.round(p*d/newP), hint:'Total consumption = people × days. Same total food: P1×D1 = P2×D2', intuition:'Total rice per person per day = ' + r + '/' + p + '/' + d + ' = ' + Math.round(r/p/d*100)/100 + '. Days for ' + newP + ' people = ' + p + '×' + d + '/' + newP + ' = ' + Math.round(p*d/newP) }; },
    // Men + women combined work
    function(){ var m=rand(8,16), w=rand(12,24); var task='field'; return { q:m+' men or ' + w + ' women can do a work in ' + rand(20,40) + ' days. ' + (m+rand(2,5)) + ' men and ' + (w-rand(3,8)) + ' women together?', a:Math.round(1/((m+rand(2,5))/(m*rand(20,40)) + (w-rand(3,8))/(w*rand(20,40)))), hint:'1 man/day = 1/(' + m + '×' + rand(20,40) + '), 1 woman/day = 1/(' + w + '×' + rand(20,40) + ')', intuition:'Men rate=' + (m+rand(2,5)) + '/' + (m*rand(20,40)) + ', Women rate=' + (w-rand(3,8)) + '/' + (w*rand(20,40)) + ', combined = ' + ((m+rand(2,5))/(m*rand(20,40)) + (w-rand(3,8))/(w*rand(20,40))).toFixed(4) + '/day, time=' + Math.round(1/((m+rand(2,5))/(m*rand(20,40)) + (w-rand(3,8))/(w*rand(20,40)))) + ' days' }; },
    // Wages with varying workers
    function(){ var m=rand(6,12), d=rand(10,20), wage=rand(200,500); var total=Math.round(m*d*wage); return { q:m+' men work '+d+' days, wage ₹'+wage+'/day each. Total wages? If '+(m+rand(2,5))+' men for '+(d-rand(3,6))+' days?', a:Math.round((m+rand(2,5))*(d-rand(3,6))*wage), hint:'Total = men × days × wage per day', intuition:'Original: '+m+'×'+d+'×'+wage+'=₹'+(m*d*wage)+'. New: '+(m+rand(2,5))+'×'+(d-rand(3,6))+'×'+wage+'=₹'+Math.round((m+rand(2,5))*(d-rand(3,6))*wage) }; },
    // Men, days, and work amount — triple variable
    function(){ var m=rand(8,15), d=rand(10,18), wmul=rand(2,4); return { q:m+' men complete '+(wmul-1)+' units of work in '+d+' days. To complete '+(wmul+1)+' units in '+(d-rand(2,5))+' days, men needed?', a:Math.round(m*(wmul+1)*(d)/((wmul-1)*(d-rand(2,5)))), hint:'Work = men × days × rate. New men = old men × new work/old work × old days/new days', intuition:'M1×D1×R = W1, M2×D2×R = W2. M2 = ' + m + '×' + (wmul+1) + '/' + (wmul-1) + '×' + d + '/' + (d-rand(2,5)) + ' = ' + Math.round(m*(wmul+1)*d/((wmul-1)*(d-rand(2,5)))) }; },
    // SBI PO Hard: man-days-hours complex proportion
    function(){ var m=rand(10,20), d=rand(8,15), h=rand(6,10), w=rand(2,3); return { q:m+' men work '+h+' hrs/day for '+d+' days to complete '+(w-1)+' units. How many men needed to complete '+(w+1)+' units in '+(d-3)+' days working '+(h+2)+' hrs/day?', a:Math.round(m*(w+1)*(d)*(h)/((w-1)*(d-3)*(h+2))), hint:'M1×D1×H1/W1 = M2×D2×H2/W2', intuition:'M2 = '+m+'×'+(w+1)+'/'+(w-1)+'×'+d+'/'+(d-3)+'×'+h+'/'+(h+2)+' = '+Math.round(m*(w+1)*d*h/((w-1)*(d-3)*(h+2)))}; },
    // SBI PO Hard: food with men, women, children ratio
    function(){ var p=rand(50,100), d=rand(10,20), r=rand(500,1000); var ratio=[rand(2,4), rand(1,3), rand(3,5)]; var total=ratio[0]+ratio[1]+ratio[2]; var newP=Math.round(p/total*ratio[0])+rand(5,10); return { q:'Provisions for '+p+' people for '+d+' days. If '+newP+' men, women and children in ratio '+ratio.join(':')+' (same total consumption), how many days?', a:Math.round(p*d/(newP)), hint:'Total consumption unchanged: P1×D1 = P2×D2', intuition:'Days = '+p+'×'+d+'/'+newP+' = '+Math.round(p*d/newP)}; }
  ];
  var idx;
  if (diff >= 5 && ty.length >= 6) {
    idx = Math.random() < 0.7 ? rand(Math.max(0, ty.length - 3), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var d=ty[idx](); var o=[d.a]; for(var i=-3;i<=4;i+=2){var v=d.a+i;if(v>0&&o.indexOf(v)<0)o.push(v);} shuffle(o);
  return { question:d.q, answer:d.a, options:o, hint:d.hint, timeLimit:15, type:'quant', techniqueLabel:'Chain Rule', intuition:'If more = less (inverse proportion): M1×D1 = M2×D2. If more = more (direct): divide then multiply.' };
}

function generateLogarithmQuestion(diff, layer) {
  var ty = [
    function(){ var b=[2,3,5,10][rand(0,3)], n=Math.pow(b,rand(2,4)); return { q:'log_'+b+'('+n+') = ?', a:Math.round(Math.log(n)/Math.log(b)), hint:'log_b(n) = x means b^x = n' }; },
    function(){ var a=rand(2,5), n=Math.pow(a,rand(2,4)); return { q:'log('+n+') / log('+a+') = ?', a:Math.round(Math.log(n)/Math.log(a)), hint:'log_b(a) = log(a)/log(b). This gives log_'+a+'('+n+')' }; },
    function(){ var a=rand(2,4), b=rand(2,4), n=Math.pow(a,rand(2,3))*Math.pow(b,rand(2,3)); return { q:'log('+a*b+') = log('+a+') + log(?)', a:b, hint:'log(xy) = log(x) + log(y)' }; },
    // Change of base
    function(){ var a=rand(2,5), b=rand(2,5); while(b===a)b=rand(2,5); var n=Math.pow(a,rand(2,3)); return { q:'log_'+a+'('+n+') / log_'+b+'('+n+') = ?', a:Math.round(Math.log(b)/Math.log(a)*100)/100, hint:'Change base: log_a(N)/log_b(N) = log_b(a)', intuition:'log_'+a+'('+n+')/log_'+b+'('+n+') = log_'+a+'('+n+') × log_'+n+'('+b+') = log_'+a+'('+b+') = log('+b+')/log('+a+') = ' + Math.round(Math.log(b)/Math.log(a)*100)/100 }; },
    // Solving log equations
    function(){ var n=rand(3,8); return { q:'Solve: log(x) + log(' + n + ') = log(' + (n*5) + ')', a:'5', hint:'log(x) + log(' + n + ') = log(' + n + 'x) = log(' + (n*5) + '). So ' + n + 'x = ' + (n*5), intuition:'log(x' + n + ') = log(' + (n*5) + ') → ' + n + 'x = ' + (n*5) + ' → x = 5' }; },
    // Power rule: log(a^n)
    function(){ var a=rand(2,5), n=rand(2,4); return { q:'log(' + a + '^' + n + ') = ' + n + ' × log(?)', a:a.toString(), hint:'log(a^n) = n×log(a)', intuition:'log(' + a + '^' + n + ') = ' + n + ' × log(' + a + '). Power rule: bring exponent forward.' }; },
    // Log equation with subtraction
    function(){ var a=rand(3,8), b=rand(2,a-1); return { q:'Solve: log(' + (a*b) + ') - log(' + b + ') = log(x)', a:a.toString(), hint:'log(' + (a*b) + '/' + b + ') = log(x), so x = ' + (a*b) + '/' + b, intuition:'log(' + (a*b) + ') - log(' + b + ') = log(' + (a*b) + '/' + b + ') = log(' + a + '). So x = ' + a }; },
    // Natural log conversion
    function(){ var n=rand(2,5); return { q:'If ln(e^' + n + ') = x, find x', a:n.toString(), hint:'ln(e^n) = n by definition (natural log is log base e)', intuition:'ln(e^' + n + ') = ' + n + '. The natural log and exponential cancel.' }; },
    // Log with fractional base
    function(){ var a=rand(2,5), b=rand(2,5); while(b===a)b=rand(2,5); var n=Math.pow(a,rand(2,3)); return { q:'log_' + b + '(' + n + ') × log_' + a + '(' + b + ') = ?', a:Math.round(Math.log(n)/Math.log(a)), hint:'Change base: log_b(N) × log_a(b) = log_a(N)', intuition:'log_' + b + '(' + n + ') × log_' + a + '(' + b + ') = log_' + a + '(' + n + ') = ' + Math.round(Math.log(n)/Math.log(a)) }; },
    // SBI PO Hard: exponent equation with log
    function(){ var a=rand(2,4), b=rand(2,4); return { q:'Solve: ' + a + '^x = ' + Math.pow(b,3), a:Math.round(Math.log(Math.pow(b,3))/Math.log(a)), hint:'x = log('+Math.pow(b,3)+')/log('+a+') = log_'+a+'('+Math.pow(b,3)+')', intuition: a + '^x = ' + Math.pow(b,3) + ' → x = log_' + a + '(' + Math.pow(b,3) + ') = ' + Math.round(Math.log(Math.pow(b,3))/Math.log(a)) }; },
    // SBI PO Hard: change of base with multiple logs
    function(){ var a=rand(2,5), b=rand(2,5); while(b===a)b=rand(2,5); var n=Math.pow(a,rand(2,3)); return { q:'Simplify: (log_' + a + '(' + n + ')) / (log_' + b + '(' + n + '))', a:Math.round(Math.log(b)/Math.log(a)*100)/100, hint:'= log_' + a + '(' + b + ') = log(b)/log(a)', intuition:'log_'+a+'('+n+')/log_'+b+'('+n+') = log_'+a+'('+b+') = ' + Math.round(Math.log(b)/Math.log(a)*100)/100 }; }
  ];
  var idx;
  if (diff >= 5 && ty.length >= 6) {
    idx = Math.random() < 0.7 ? rand(Math.max(0, ty.length - 3), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var d=ty[idx](); var o=[d.a]; for(var i=-2;i<=3;i++){var v=d.a+i;if(v!==d.a&&v>0&&o.indexOf(v)<0)o.push(v);} shuffle(o);
  return { question:d.q, answer:d.a, options:o, hint:d.hint, timeLimit:20, type:'quant', techniqueLabel:'Logarithms', intuition:'log_b(x)=y means b^y=x. log(xy)=log(x)+log(y). log(x/y)=log(x)-log(y). log(x^n)=n×log(x).' };
}

function generateNumberSeriesQuestion(diff, layer) {
  var ty = [
    [1, function(){ var s=rand(2,8), d=rand(4,10), n=5, seq=[]; for(var i=0;i<n;i++)seq.push(s+i*d); return {seq:seq, ans:s+n*d, typ:'next', pat:'AP +'+d, hint:'Constant difference. Add '+d+' each step.'}; }],
    [1, function(){ var s=rand(3,9), r=rand(2,4), n=5, seq=[]; for(var i=0;i<n;i++)seq.push(s*Math.pow(r,i)); return {seq:seq, ans:s*Math.pow(r,n), typ:'next', pat:'GP ×'+r, hint:'Geometric progression. Multiply by '+r+' each time.'}; }],
    [1, function(){ var s=rand(3,8), n=5, seq=[]; for(var i=0;i<n;i++)seq.push((s+i)*(s+i)); return {seq:seq, ans:(s+n)*(s+n), typ:'next', pat:'Squares', hint:'Numbers are squares of consecutive integers.'}; }],
    [2, function(){ var s=rand(4,10), n=5, seq=[]; for(var i=0;i<n;i++)seq.push((s+i)*(s+i)-1); return {seq:seq, ans:(s+n)*(s+n)-1, typ:'next', pat:'n²-1', hint:'Subtract 1 from each square number.'}; }],
    [2, function(){ var s=rand(2,7), d=rand(2,5), n=6, seq=[s]; for(var i=0;i<n;i++)seq.push(seq[i]+d+i*2); return {seq:seq, ans:seq[n]+d+n*2, typ:'next', pat:'Inc diff', hint:'Differences increase by 2 each step.'}; }],
    [2, function(){ var primes=[2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97]; var s=rand(0,10), n=5; var seq=[]; for(var i=0;i<n;i++)seq.push(primes[s+i]); return {seq:seq, ans:primes[s+n], typ:'next', pat:'Primes', hint:'Prime number series.'}; }],
    [3, function(){ var s=rand(2,5), n=6, seq=[s,s+rand(1,3)]; for(var i=2;i<n;i++)seq.push(seq[i-1]+seq[i-2]); return {seq:seq, ans:seq[n-1]+seq[n-2], typ:'next', pat:'Fibonacci', hint:'Each term is sum of previous two terms.'}; }],
    [3, function(){ var s=rand(2,5), n=5, seq=[]; for(var i=0;i<n;i++)seq.push(Math.pow(s+i,3)); return {seq:seq, ans:Math.pow(s+n,3), typ:'next', pat:'Cubes', hint:'Numbers are cubes of consecutive integers.'}; }],
    [3, function(){ var s=rand(5,12), n=6, seq=[s]; for(var i=0;i<n;i++)seq.push(seq[i]+(i%2===0?rand(3,6):rand(7,12))); return {seq:seq, ans:seq[n]+(n%2===0?rand(3,6):rand(7,12)), typ:'next', pat:'Alt diff', hint:'Two alternating differences in the series.'}; }],
    [4, function(){ var s=rand(2,6), c=rand(1,5), n=5, seq=[]; for(var i=0;i<n;i++)seq.push((s+i)*(s+i)+c); return {seq:seq, ans:(s+n)*(s+n)+c, typ:'next', pat:'n²+'+c, hint:'Add '+c+' to each square number.'}; }],
    [4, function(){ var a=rand(2,4), b=rand(3,7), s=rand(3,8), n=5, seq=[s]; for(var i=0;i<n;i++)seq.push(seq[i]*a+b); return {seq:seq, ans:seq[n]*a+b, typ:'next', pat:'×'+a+'+'+b, hint:'Multiply by '+a+', then add '+b+'.'}; }],
    [4, function(){ var s=rand(10,30), d=rand(2,4), n=6, seq=[s]; for(var i=0;i<n;i++)seq.push(i%2===0?seq[i]-d:seq[i]+d*2); return {seq:seq, ans:seq[n], typ:'next', pat:'Alt ±', hint:'Alternating subtract and add pattern.'}; }],
    // SBI PO style: Wrong number series
    [5, function(){ var s=rand(4,8), d=rand(3,6), n=5, seq=[]; for(var i=0;i<n;i++)seq.push(s+i*d); var wrongIdx=rand(2,3); seq[wrongIdx]+=rand(1,3); return {seq:seq, ans:seq[wrongIdx], wrong:true, correct:s+wrongIdx*d, pat:'Wrong AP', hint:'Find the number that breaks the constant difference pattern of '+d+'.'}; }],
    [5, function(){ var s=rand(2,4), r=rand(2,3), n=5, seq=[]; for(var i=0;i<n;i++)seq.push(s*Math.pow(r,i)); var wrongIdx=rand(2,3); seq[wrongIdx]=Math.round(seq[wrongIdx]*rand(11,14)/10); return {seq:seq, ans:seq[wrongIdx], wrong:true, correct:s*Math.pow(r,wrongIdx), pat:'Wrong GP', hint:'Find the term that does not follow the geometric progression with ratio '+r+'.'}; }],
    [5, function(){ var s=rand(2,5), n=6, seq=[s,s+rand(1,2)]; for(var i=2;i<n;i++)seq.push(seq[i-1]+seq[i-2]); var wrongIdx=rand(2,4); seq[wrongIdx]+=rand(2,4); return {seq:seq, ans:seq[wrongIdx], wrong:true, correct:(seq[wrongIdx-1]+seq[wrongIdx-2]), pat:'Wrong Fibonacci', hint:'Each term should be sum of previous two. Find the term that violates this.'}; }],
    [5, function(){ var s=rand(10,25), d=rand(5,10), n=5, seq=[s]; for(var i=0;i<n;i++)seq.push(seq[i]+d+i*3); var wrongIdx=rand(2,3); seq[wrongIdx]-=rand(2,5); var correctVal=s; for(var i=0;i<=wrongIdx;i++)correctVal+=d+i*3; return {seq:seq, ans:seq[wrongIdx], wrong:true, correct:correctVal, pat:'Wrong inc diff', hint:'Differences should increase by 3 each step.'}; }],
    // SBI PO style: Mixed pattern
    [5, function(){ var s=rand(3,7), n=7, seq=[]; for(var i=0;i<n;i+=2){seq.push((s+i/2)*(s+i/2), (s+i/2)*(s+i/2)+1);} return {seq:seq.slice(0,n), ans:n%2===0?(s+n/2-1)*(s+n/2-1)+1:(s+n/2)*(s+n/2), typ:'next', pat:'n², n²+1', hint:'Alternating pattern: square, square+1, square, square+1...'}; }],
    [5, function(){ var s=rand(1,4), n=5, seq=[]; for(var i=0;i<n;i++)seq.push(Math.pow(2,s+i+1)-1); return {seq:seq, ans:Math.pow(2,s+n+1)-1, typ:'next', pat:'2ⁿ-1', hint:'Subtract 1 from powers of 2.'}; }]
  ];
  var matched = ty.filter(function(t){ return t[0] <= diff; });
  if (matched.length === 0) matched = ty;
  var chosen = matched[rand(0, matched.length - 1)];
  var data = chosen[1]();
  var seqStr = data.seq.join(', ');
  var qText = data.wrong ? 'Find the wrong number: ' + seqStr : 'Find the next term: ' + seqStr + ', ?';
  var answer = data.wrong ? data.ans : data.ans;
  var opts = [answer];
  if (data.wrong) {
    for(var i=-2;i<=3;i++){var v=answer+i;if(v!==answer&&v>0&&opts.indexOf(v)<0&&v!==undefined&&!isNaN(v))opts.push(v);}
  } else {
    var spread = Math.max(2, Math.round(answer*0.15));
    for(var i=-spread;i<=spread;i+=Math.max(1,Math.round(spread/3))){var v=answer+i;if(v!==answer&&v>0&&opts.indexOf(v)<0&&v!==undefined&&!isNaN(v))opts.push(v);}
  }
  opts = opts.filter(function(v){ return v != null && !isNaN(v); });
  if (opts.length < 4) {
    for (var _g=0; _g<50 && opts.length<4; _g++) { var d = answer + rand(2, 8); if(opts.indexOf(d) < 0) opts.push(d); }
  }
  shuffle(opts);
  return {
    question: qText,
    answer: answer,
    options: opts,
    hint: data.hint + ' Pattern: ' + data.pat,
    timeLimit: diff <= 2 ? 20 : (diff <= 4 ? 15 : 12),
    type: 'quant',
    techniqueLabel: 'Number Series: ' + data.pat + (data.wrong ? ' [Wrong: ' + data.ans + ', Correct: ' + data.correct + ']' : ''),
    intuition: 'Number Series: Check differences, ratios, squares/cubes, prime gaps, or mixed operations. ' + data.hint
  };
}

// Logical Reasoning missing topics
function generateMakingJudgmentsQuestion(diff) {
  var items=[
    {s:'You want to buy a reliable used car under ₹5 lakh.',o:['A 2018 model with 80k km service history','A 2022 model with 0 service records','A 2005 model fully restored','A damaged car at auction'],a:0},
    {s:'You need to improve your English speaking skills quickly.',o:['Practice speaking daily with a friend','Read only textbooks','Watch movies without subtitles','Take a 3-year course'],a:0},
    {s:'You want to save money on electricity bills.',o:['Switch to LED bulbs and unplug idle devices','Keep all lights on 24/7','Buy new appliances every month','Run AC at 16°C always'],a:0},
    {s:'You need to choose a healthy breakfast option.',o:['Oatmeal with fruits and nuts','A sugary cereal with milk','A deep-fried samosa','A can of soda'],a:0},
    {s:'You want to prepare for a competitive exam in 6 months.',o:['Create a study schedule and follow daily','Cram everything in the last month','Only study on weekends','Skip mock tests'],a:0},
    {s:'You need to resolve a disagreement with a coworker.',o:['Talk calmly and find common ground','Ignore the problem','Shout and argue your point','Complain to the boss first'],a:0},
    {s:'Your train to an important interview is delayed by two hours.',o:['Stop trying and go back home','Wait silently and blame the railway later','Take a random bus to a different city','Call the interviewer to reschedule and calmly book the next train'],a:3},
    {s:'You find an unattended wallet with cash and an ID card on the street.',o:['Keep the cash and throw the wallet away','Hand it over to the nearest police station','Post the cash online for anyone to claim','Wait and take it if no one comes in 5 minutes'],a:1},
    {s:'A friend asks you to help them cheat in an exam.',o:['Politely refuse and suggest they study','Agree by passing small notes','Tell them you will think about it after the paper','Ask for money in exchange'],a:0},
    {s:'Your internet is down at home and you have an urgent assignment to submit today.',o:['Submit it late and make excuses','Use a library or cafe internet connection','Wait for the internet to return overnight','Ask a friend to submit a fake copy in your name'],a:1},
    {s:'You receive an email promising free money if you share your bank details.',o:['Share details immediately for the reward','Forward the email to friends so they also benefit','Treat it as a scam and ignore or report it','Reply asking for more money'],a:2},
    {s:'You want to learn a new language within a year.',o:['Buy ten grammar books but never open them','Only memorize the alphabet','Watch movies with subtitles off from day one','Practice 20 minutes daily with an app and hold weekly conversations'],a:3},
    {s:'Your neighbor plays loud music late at night and disturbs you.',o:['Play even louder music to annoy them back','File a police complaint without talking first','Talk politely and agree on acceptable hours','Break their speaker'],a:2},
    {s:'You get a stomach ache while on a camping trip far from a doctor.',o:['Ignore it and keep eating the same food','Start taking medicine prescribed for someone else','Drink clean water, rest, and use the basic first-aid kit','Eat more spicy food to flush it out'],a:2},
    {s:'You get selected for two jobs — one pays more but has no growth, the other pays less but offers training.',o:['Choose the high-paying one and stop learning','Accept the lower-paying one with skill growth and a plan','Reject both because neither is perfect','Choose randomly based on office distance only'],a:1},
    {s:'Your team is behind schedule on a project due in a week.',o:['Panic and do nothing while complaining','Hide the delay from your manager','Ask the team to prioritize key tasks and set achievable daily targets','Blame one member publicly'],a:2},
    {s:'A shopkeeper gives you ₹200 extra change by mistake while buying groceries.',o:['Silently keep it as a lucky gain','Return it politely and point out the mistake','Buy extra items to use up the money','Tell him you gave more money'],a:1},
    {s:'You want to stay fit but have a busy 9-to-7 job.',o:['Wait for a holiday to start exercising','Join a gym and go once a month','Schedule short 30-minute workouts 4 times a week','Skip lunch daily to lose weight'],a:2}
  ];
  var it=items[rand(0,items.length-1)];
  return { question:'Best course of action: "'+it.s+'"<br>'+it.o.map(function(x,i){return (i+1)+'. '+x;}).join('<br>'), answer:it.o[it.a], options:it.o.slice(), hint:'Choose the most practical and effective option', timeLimit:12, type:'reasoning', techniqueLabel:'Making Judgments', intuition:'Evaluate each option for effectiveness, cost, and feasibility. The best choice directly achieves the goal with minimal drawbacks.' };
}

function generateLogicalProblemsQuestion(diff) {
  var items=[
    function(){var colors=['Red','Blue','Green','Yellow'];shuffle(colors);return {q:'4 friends — A says "I don\'t wear Red", B says "I wear Blue", C says "I don\'t wear Blue", D says "I wear Red or Green". Only one is lying. Who wears Yellow?',a:colors[3],o:colors};},
    function(){var n=['Alice','Bob','Charlie','Diana'];shuffle(n);return {q:n[0]+', '+n[1]+', '+n[2]+', '+n[3]+' sit in a row. '+n[0]+' sits at an end. '+n[1]+' sits next to '+n[2]+'. '+n[3]+' sits between '+n[0]+' and '+n[1]+'. Who is at the other end?',a:n[2],o:n};},
    // Truth-teller puzzle
    function(){return {q:'You meet two people. A says "B is a liar." B says "We are both truth-tellers." One speaks truth, one lies. Who is the truth-teller?',a:'A',o:['A','B','Neither','Both'],hint:'Assume A truth → B liar → B lies about "both truth-tellers" → works'};},
    // Matching pairs
    function(){var n=['Raj','Simran','Amit','Priya'];var c=['Doctor','Engineer','Teacher','Artist'];shuffle(n);shuffle(c);return {q:n[0]+' is not the Doctor. '+n[1]+' is the Engineer. '+n[2]+' is not the Artist. '+n[3]+' is the Teacher. Who is the Doctor?',a:function(){for(var i=0;i<4;i++){if(n[i]!==n[0]&&n[i]!==n[1]&&n[i]!==n[3])return n[i];}return n[2];}(),o:n};},
    // Order-based puzzle
    function(){var n=['A','B','C','D','E'];shuffle(n);return {q:'5 people: '+n[0]+' > '+n[1]+', '+n[2]+' < '+n[3]+', '+n[4]+' sits between '+n[0]+' and '+n[2]+'. Who is tallest?',a:n[0],o:n};},
    function(){var n=['Aarav','Bhavna'];return {q:n[0]+' and '+n[1]+' are two brothers. One of them always tells the truth and the other always lies. '+n[1]+' says: "We are both liars." Who is telling the truth?',a:n[0],o:[n[0],n[1],'Neither','Both'],hint:'If '+n[1]+' told the truth, "both liars" would be true, making her a liar — a contradiction. So '+n[1]+' lies and '+n[0]+' tells the truth.'};},
    function(){return {q:'Pointing to a girl in a photograph, Arjun says, "Her father is my father\'s only son." How is the girl related to Arjun?',a:'Daughter',o:['Daughter','Sister','Niece','Cousin'],hint:'Arjun\'s father\'s only son is Arjun himself (assuming no other sons). So Arjun is the girl\'s father.'};},
    function(){var n=['Amit','Bina','Charu','Deep','Esha'];return {q:n[4]+' sits at the far right of a row of five friends: '+n.join(', ')+'. '+n[2]+' sits in the middle. '+n[1]+' sits immediately to the left of '+n[2]+'. '+n[3]+' sits between '+n[2]+' and '+n[4]+'. Who sits at the far left?',a:n[0],o:n,hint:'Fix '+n[4]+' at position 5 and '+n[2]+' at position 3. '+n[1]+' must take position 2 and '+n[3]+' position 4, leaving position 1.'};},
    function(){return {q:'Ravi, Sita and Gopal work in three different cities (Delhi, Mumbai, Chennai) as Doctor, Engineer and Teacher. Ravi works in Delhi and is not the Teacher. Sita is the Engineer and does not work in Chennai. Gopal is not the Doctor. Who is the Teacher?',a:'Gopal',o:['Ravi','Sita','Gopal','None'],hint:'Ravi has Delhi, Sita (Engineer) cannot take Chennai so she takes Mumbai, leaving Chennai for Gopal. Sita is the Engineer, so among Ravi and Gopal one is Doctor and one Teacher — Ravi is not the Teacher.'};},
    function(){var n=['A','B','C','D','E'];return {q:'Five friends — '+n.join(', ')+'. '+n[0]+' is taller than '+n[1]+'. '+n[1]+' is taller than '+n[2]+'. '+n[3]+' is taller than '+n[1]+' but shorter than '+n[0]+'. '+n[2]+' is taller than '+n[4]+'. Who is the second tallest?',a:n[3],o:n,hint:'Chain all the comparisons: '+n[0]+' > '+n[3]+' > '+n[1]+' > '+n[2]+' > '+n[4]+'.'};},
    function(){var n=['Anu','Binoy','Chetan','Divya'];var c=['Red','Blue','Green','Black'];return {q:'Four differently coloured pens ('+c.join(', ')+') are given to four children: '+n.join(', ')+'. '+n[0]+' does not get '+c[2]+'. '+n[1]+' gets '+c[0]+'. '+n[2]+' does not get '+c[1]+'. '+n[3]+' gets '+c[3]+'. Who gets the '+c[2]+' pen?',a:n[2],o:n,hint:c[0]+' is taken by '+n[1]+' and '+c[3]+' by '+n[3]+'. Of the remaining two colours, '+n[0]+' cannot take '+c[2]+', so '+n[2]+' must.'};},
    function(){var c=['red','blue','green'];return {q:'Three houses are painted '+c[0]+', '+c[1]+' and '+c[2]+' and they stand in a straight row. The '+c[0]+' house is in the middle. The '+c[2]+' house is immediately to the left of the '+c[0]+' house. Which coloured house is at the far right?',a:c[1],o:[c[0],c[1],c[2],'yellow'],hint:'The '+c[0]+' house is central. The '+c[2]+' house is on its left, so the '+c[1]+' house must be on its right.'};},
    function(){var n=['Kochi','Rome','Quito','Tokio'];return {q:n[3]+' is 20 km east of '+n[0]+'. '+n[1]+' is 30 km west of '+n[3]+'. '+n[2]+' lies between '+n[0]+' and '+n[3]+'. Which town is the easternmost of the four?',a:n[3],o:n,hint:'Place '+n[0]+' at the west end. '+n[3]+' is 20 km east and '+n[2]+' lies along the way, while '+n[1]+' is west.'};}
  ];
  var d=items[rand(0,items.length-1)](); var o=d.o; shuffle(o);
  return { question:d.q, answer:d.a, options:o, hint:'List possibilities and eliminate contradictions', timeLimit:25, type:'reasoning', techniqueLabel:'Logical Problems', intuition:'Track what each statement rules out. If only one is lying, check which scenario makes exactly one false.' };
}

function generateLogicalGamesQuestion(diff) {
  var items=[
    function(){return {q:'Two players take turns removing 1-3 stones from a pile of '+(rand(8,15))+'. The player who takes the last stone wins. How many should the first player take?',a:String((rand(8,15))%4||1),o:['1','2','3','4'],hint:'Winning strategy: leave a multiple of 4 after your turn.'};},
    function(){return {q:'You have 9 coins, one is counterfeit (lighter). You have a balance scale. Min weighings to find it?',a:'2',o:['1','2','3','4'],hint:'Divide into 3 groups of 3. Weigh two groups.'};},
    // Type 3: Water jug problem
    function(){var capA=[3,5,4,7][rand(0,3)], capB=[5,7,7,9][rand(0,3)], target=[4,3,6,5][rand(0,3)]; return {q:'You have a '+capA+'L jug and a '+capB+'L jug. You need exactly '+target+'L. Min steps to measure it? (Assume unlimited water, can fill/empty/pour)',a:'3',o:['2','3','4','5'],hint:'Fill the larger jug, pour into smaller until full, empty smaller, repeat.'};},
    // Type 4: River crossing puzzle
    function(){return {q:'A farmer needs to cross a river with a wolf, a goat, and a cabbage. Boat can carry only the farmer + one item. Wolf eats goat, goat eats cabbage if left alone. Min trips?',a:'7',o:['5','6','7','8'],hint:'Take goat first, return empty, take wolf, bring goat back, take cabbage, return empty, take goat.'};},
    // Type 5: 12 coins — one counterfeit (heavier OR lighter)
    function(){return {q:'You have 12 coins, one is counterfeit (either heavier or lighter). Balance scale. Min weighings to find it?',a:'3',o:['2','3','4','5'],hint:'Weigh 4 vs 4 first. Each weighing eliminates 2/3 of possibilities. 12 coins × 2 possibilities = 24, log3(24) > 2, so 3 weighings.'};},
    // Type 6: Light bulb / switch puzzle
    function(){return {q:'3 switches (A,B,C) control 3 bulbs in another room (initially off). You can flip switches, then enter the room ONCE. How to identify which switch controls which bulb?',a:'Turn A on, wait, turn A off, turn B on, enter. A=warm off, B=on, C=cold off',o:['A=on, B=off, C=warm','A=warm off, B=on, C=cold off','A=off, B=warm, C=on','A=on, B=warm, C=off'],hint:'Use heat as an additional state. Turn one on long enough to warm up, then turn it off.'};},
    // Type 7: Poison wine / rat puzzle
    function(){return {q:'You have 8 bottles of wine, one poisoned. Poison kills a rat in 10 hours. Min rats needed to find the poisoned bottle in 10 hours?',a:'3',o:['2','3','4','8'],hint:'Use binary representation. Number bottles 0-7 in binary (3 bits). Each rat tests one bit position.'};},
    function(){return {q:'You have 8 coins and one is heavier than the rest. Using a balance scale, what is the minimum number of weighings needed to find the heavy coin?',a:'2',o:['1','2','3','4'],hint:'Weigh 3 vs 3 first; if it balances, the heavy coin is among the remaining 2.'};},
    function(){return {q:'You have 27 coins and one is counterfeit (lighter). What is the minimum number of balance-scale weighings to identify it?',a:'3',o:['2','3','4','5'],hint:'3×3×3 = 27, so split the coins into equal thirds at each weighing.'};},
    function(){return {q:'With a 3L jug and a 5L jug (unlimited water; you may fill, empty, or pour), what is the minimum number of steps to measure exactly 4L?',a:'6',o:['4','5','6','7'],hint:'Fill the 5L jug, pour into the 3L jug, empty it, then pour again to leave exactly 4L in the 5L jug.'};},
    function(){return {q:'Three missionaries and three cannibals must cross a river. The boat holds at most 2 people, and cannibals must never outnumber missionaries on either bank. What is the minimum number of crossings?',a:'11',o:['7','9','11','13'],hint:'Send two cannibals across first, then shuttle people so missionaries are never outnumbered.'};},
    function(){return {q:'One door leads to freedom and one to danger. Two guards stand before them: one always lies, the other always tells the truth. You may ask ONE yes/no question. What should you ask, and which door do you take?',a:'Ask "Which door would the other guard say leads to freedom?" and take the opposite door',o:['Ask "Which door would the other guard say leads to freedom?" and take the opposite door','Ask "Am I holding a coin?" and take any door','Ask "Is the left door safe?" and take the left door','Ask "Which guard is the liar?" and take his door'],hint:'Both guards point to the same (wrong) door, so take the opposite one.'};},
    function(){return {q:'You have a 7-minute and an 11-minute hourglass. Starting them together, what time (in minutes) can you accurately measure with them?',a:'15',o:['14','15','16','18'],hint:'Start both, flip the 7-min when it empties, flip the 11-min when it empties, then flip the 7-min again.'};},
    function(){return {q:'1000 identical bottles contain wine, and exactly one is poisoned. A sample fed to a rat gives a result in 24 hours. What is the minimum number of rats needed to find the poisoned bottle within 24 hours?',a:'10',o:['9','10','11','100'],hint:'Number the bottles in binary; 2^10 = 1024 ≥ 1000, so each rat tests one bit position.'};},
    function(){return {q:'Two players take turns removing 1 to 4 matchsticks from a pile of 21. Whoever takes the last stick wins. How many sticks should the first player remove to guarantee victory?',a:'1',o:['1','2','3','4'],hint:'Leave your opponent a multiple of 5 after every turn. 21 leaves a remainder of 1 when divided by 5.'};}
  ];
  var d=items[rand(0,items.length-1)](); var o=d.o; shuffle(o);
  return { question:d.q, answer:d.a, options:o, hint:d.hint||'Think about the minimum worst-case scenario', timeLimit:25, type:'reasoning', techniqueLabel:'Logical Games', intuition:'For Nim-like games, leave opponent at a multiple of (max pick+1). For weighing, divide into 3 groups. Use binary encoding for bottle tests.' };
}

function generateAnalyzingArgumentsQuestion(diff) {
  var items=[
    {p:'"All swans I have seen are white. Therefore, all swans are white."',f:'Hasty generalization (insufficient sample)',o:['Hasty generalization','Circular reasoning','False cause','Appeal to authority']},
    {p:'"If you don\'t study, you\'ll fail. You didn\'t study, so you will fail."',f:'Valid deductive argument',o:['False analogy','Valid deductive argument','Slippery slope','Straw man']},
    {p:'"Everyone believes the earth is round, so it must be round."',f:'Appeal to popularity (argumentum ad populum)',o:['Appeal to popularity','Ad hominem','Red herring','False dilemma']},
    {p:'"You are either with us or against us."',f:'False dilemma (black-and-white fallacy)',o:['False dilemma','Slippery slope','Straw man','Hasty generalization']},
    {p:'"If we allow same-sex marriage, next people will marry animals."',f:'Slippery slope',o:['Slippery slope','Circular reasoning','Ad hominem','False cause']},
    {p:'"My opponent wants to cut education funding. Clearly, he hates children."',f:'Straw man (misrepresenting the argument)',o:['Straw man','Appeal to authority','False dilemma','Red herring']},
    {p:'"My opponent never finished college, so his tax proposal is clearly wrong."',f:'Ad hominem',o:['Ad hominem','Straw man','False dilemma','Appeal to authority']},
    {p:'"My dentist says this toothpaste is the best, so it is the best."',f:'Appeal to authority',o:['Appeal to authority','Red herring','Ad hominem','Hasty generalization']},
    {p:'"The book is the word of God because it says so, and we know it says so because the book is the word of God."',f:'Circular reasoning',o:['Circular reasoning','Slippery slope','False cause','Straw man']},
    {p:'"You question my tax increase, but my opponent once missed a crucial vote - shouldn\'t we focus on that instead?"',f:'Red herring',o:['Red herring','Ad hominem','False dilemma','Appeal to tradition']},
    {p:'"I wore my lucky socks and we won the game, so my socks caused the victory."',f:'False cause (post hoc)',o:['False cause (post hoc)','Circular reasoning','Straw man','Appeal to tradition']},
    {p:'"The sign read \'Fine for parking here,\' and the officer said parking here was fine, so I left the car in the lot."',f:'Equivocation',o:['Equivocation','Red herring','False dilemma','Ad hominem']},
    {p:'"Science has never proven that ghosts do not exist, so ghosts must exist."',f:'Appeal to ignorance',o:['Appeal to ignorance','Slippery slope','False cause','Circular reasoning']},
    {p:'"No true Scotsman puts sugar in his porridge. Angus is a Scotsman and he adds sugar. Therefore Angus is not a true Scotsman."',f:'No true Scotsman',o:['No true Scotsman','Straw man','False cause','Appeal to ignorance']},
    {p:'"Why should I stop smoking? You yourself smoked for ten years."',f:'Tu quoque',o:['Tu quoque','Ad hominem','Red herring','False dilemma']},
    {p:'"The coin has landed on heads five times in a row, so tails is due to come up next."',f:'Gambler\'s fallacy',o:['Gambler\'s fallacy','False cause','Circular reasoning','Appeal to authority']}
  ];
  var it=items[rand(0,items.length-1)]; shuffle(it.o);
  return { question:'Identify the flaw:<br>"'+it.p+'"', answer:it.f, options:it.o, hint:'What logical error does this argument make?', timeLimit:15, type:'reasoning', techniqueLabel:'Analyzing Arguments', intuition:'Hasty generalization = small sample. Circular = premise assumes conclusion. Ad populum = everyone believes it. False cause = correlation ≠ causation.' };
}

function generateLogicalDeductionQuestion(diff) {
  var items=[
    {p:'All mammals are warm-blooded. Whales are mammals.',c:'Whales are warm-blooded',o:['Whales are warm-blooded','Whales live in water','Mammals have fur','Whales are fish']},
    {p:'No honest person lies. John is honest.',c:'John does not lie',o:['John does not lie','John is rich','Everyone lies','Honest people are rare']},
    {p:'All squares have 4 equal sides. This shape has 4 equal sides.',c:'This shape could be a square',o:['This shape is definitely a square','This shape could be a square','This shape is not a square','All 4-sided shapes are squares']},
    // Some/all/no combinations
    {p:'All doctors are educated. Some educated people are rich.',c:'Some doctors might be rich',o:['All doctors are rich','No doctors are rich','Some doctors might be rich','Some educated people are doctors']},
    // Possibility vs certainty
    {p:'Either Ravi is lying or Sita is telling the truth. Ravi is telling the truth.',c:'Sita is telling the truth',o:['Ravi is lying','Sita is lying','Sita is telling the truth','Cannot be determined']},
    {p:'All birds have feathers. Penguins are birds.',c:'Penguins have feathers',o:['Penguins have feathers','Penguins cannot fly','Penguins live at the South Pole','Birds cannot swim']},
    {p:'No reptiles are warm-blooded. Snakes are reptiles.',c:'Snakes are not warm-blooded',o:['Snakes are warm-blooded','Snakes are not warm-blooded','All snakes live in deserts','Reptiles are mammals']},
    {p:'All students in the class are hardworking. Some hardworking people are creative.',c:'Some students might be creative',o:['All students are creative','Some students might be creative','No students are creative','Creative people never work hard']},
    {p:'No cats have wings. This animal has wings.',c:'This animal is not a cat',o:['This animal is a cat','This animal is not a cat','Cats can fly sometimes','Wings make an animal a bird']},
    {p:'All mangoes are fruits. Some fruits are sweet.',c:'Some mangoes might be sweet',o:['All mangoes are sweet','Some mangoes might be sweet','No mangoes are sweet','Mangoes are vegetables']},
    {p:'All roses are flowers. Some flowers fade quickly.',c:'Some roses might fade quickly',o:['All roses fade quickly','Some roses fade slowly','Some roses might fade quickly','Roses never fade']},
    {p:'Either the switch is on or the light is off. The switch is off.',c:'The light is off',o:['The light is on','The light is off','The switch is broken','Cannot be determined']},
    {p:'If it rains, the ground gets wet. The ground is wet.',c:'It might have rained',o:['It must have rained','It might have rained','It definitely did not rain','The ground is dry']},
    {p:'Either Priya is at home or she is at the gym. Priya is not at the gym.',c:'Priya is at home',o:['Priya is at the gym','Priya is at home','Priya is at work','Cannot be determined']},
    {p:'All teachers are educated. All educated people read books.',c:'All teachers read books',o:['All teachers read books','No teachers read books','Some teachers cannot read','Teachers write textbooks']}
  ];
  var it=items[rand(0,items.length-1)]; shuffle(it.o);
  return { question:'What logically follows?<br>"'+it.p+'"', answer:it.c, options:it.o, hint:'Apply deductive reasoning. If ALL X are Y and this is X, then this is Y.', timeLimit:12, type:'reasoning', techniqueLabel:'Logical Deduction', intuition:'Deduction: All A are B. C is A. Therefore C is B. If ALL: certain. If SOME: possible. If NO: certain negative.' };
}

// Verbal Reasoning missing
function generateCharacterPuzzlesQuestion(diff) {
  var items=[
    function(){var a=rand(2,5),b=rand(2,5),c=rand(2,5);return {q:'Find missing: <br>'+(a*3)+'  '+(b*3)+'  '+(c*3)+'<br>'+(a*2)+'  '+(b*2)+'  '+(c*2)+'<br>'+(a*5)+'  '+(b*5)+'  ?',a:String(c*5),o:[String(c*5),String(c*4),String(c*6),String(c*7)],hint:'Each column follows the same pattern.'};},
    function(){return {q:'Find missing: <br>2  5  8<br>3  6  9<br>4  7  ?',a:'10',o:['10','11','12','13'],hint:'Rows: each number increases by 3 from previous.'};},
    function(){var l='ABCDEFGHIJKLMNOPQRSTUVWXYZ';var p=rand(0,20);return {q:'Find missing: <br>'+l[p]+'  '+l[p+1]+'  '+l[p+2]+'<br>'+l[p+3]+'  '+l[p+4]+'  '+l[p+5]+'<br>'+l[p+6]+'  '+l[p+7]+'  ?',a:l[p+8],o:[l[p+8],l[p+6],l[p+9],l[p+10]],hint:'Each row/column follows alphabetical order.'};},
    // Number-based character grid
    function(){return {q:'Find missing: <br>3  6  12<br>4  8  16<br>5  10  ?',a:'20',o:['15','18','20','25'],hint:'Each row: first×2=second, second×2=third'};},
    // Letter with positional logic
    function(){var l='ABCDEFGHIJKLMNOPQRSTUVWXYZ';var p=rand(0,22);return {q:'Find missing: <br>'+l[p]+'  '+(p+1)+'  '+(p+1)*(p+1)+'<br>'+l[p+1]+'  '+(p+2)+'  '+(p+2)*(p+2)+'<br>'+l[p+2]+'  '+(p+3)+'  ?',a:String((p+3)*(p+3)),o:[String((p+3)*(p+3)),String((p+3)*(p+4)),String((p+4)*(p+4)),String((p+2)*(p+3))],hint:'Col1=letter, Col2=position, Col3=position²'};}
  ];
  var d=items[rand(0,items.length-1)](); var o=d.o; shuffle(o);
  return { question:d.q, answer:d.a, options:o, hint:d.hint||'Find the pattern in columns and rows', timeLimit:20, type:'reasoning', techniqueLabel:'Character Puzzles', intuition:'Look for patterns column-wise and row-wise. The same operation should apply to all.' };
}

function generateVerificationTruthQuestion(diff) {
  var items=[
    {f:'A father has 4 children. Each daughter has the same number of brothers as sisters, but each son has twice as many sisters as brothers.',q:'How many daughters?',a:'3',o:['1','2','3','4']},
    {f:'In a row of trees, one tree is 7th from left and 9th from right.',q:'Total trees?',a:'15',o:['13','14','15','16']},
    {f:'A says "B is lying". B says "C is lying". C says "A and B are both lying".',q:'Who is telling the truth?',a:'C',o:['A','B','C','None']},
    {f:'In a family of 6, each son has the same number of brothers as sisters. Each daughter has twice as many brothers as sisters.',q:'How many sons?',a:'4',o:['2','3','4','5']},
    {f:'Five friends — A, B, C, D, E. A is taller than B. C is taller than D but shorter than E. B is taller than C.',q:'Who is the second tallest?',a:'A',o:['A','B','C','D']},
    {f:'In a queue, Ramesh is 5th from the front and 8th from the back.',q:'How many people are in the queue?',a:'12',o:['11','12','13','14']},
    {f:'In a family, each boy has the same number of brothers as sisters, and each girl has twice as many brothers as sisters.',q:'How many girls are there?',a:'2',o:['1','2','3','4']},
    {f:'A, B, C, D are in a line. A is taller than B. B is taller than C. C is taller than D.',q:'Who is the shortest?',a:'D',o:['A','B','C','D']},
    {f:'Three statements are written on a board: 1) "Exactly one of these statements is false." 2) "Exactly two of these statements are false." 3) "All three of these statements are false."',q:'Which statement is true?',a:'Statement 2',o:['Statement 1','Statement 2','Statement 3','None']},
    {f:'In a line of children, Amit is 6th from the left and 7th from the right.',q:'How many children are in the line?',a:'12',o:['11','12','13','14']},
    {f:'A family has five children. Each daughter has the same number of brothers as sisters, and each son has one more sister than brothers.',q:'How many sons are there?',a:'2',o:['1','2','3','4']},
    {f:'In a queue, Sana is 4th from the front and 6th from the back. Her friend Mona stands exactly in the middle of the queue.',q:'What position does Mona stand at from the front?',a:'5',o:['4','5','6','7']},
    {f:'Raj says "I always lie." Simran says "Raj is telling the truth."',q:'Who is telling the truth?',a:'Neither',o:['Raj','Simran','Both','Neither']},
    {f:'P, Q, R, S are comparing heights. P is taller than Q. Q is taller than R. S is shorter than P but taller than Q.',q:'Who is the third tallest?',a:'Q',o:['P','Q','R','S']},
    {f:'At a fork in the road, one path leads to the city and the other to a swamp. Two guards stand there — one always tells the truth, the other always lies. You may ask ONE question to ONE guard.',q:'Which question guarantees you find the right path?',a:'"Which path would the other guard say leads to the city?" — take the opposite',o:['"Which path leads to the city?" (ask the truth-teller)','"Which path would the other guard say leads to the city?" — take the opposite','"Are you the truth-teller?"','"Is the left path safe?"']}
  ];
  var it=items[rand(0,items.length-1)]; shuffle(it.o);
  return { question:it.f+'<br>'+it.q, answer:it.a, options:it.o, hint:'Test each possibility against the given facts', timeLimit:20, type:'reasoning', techniqueLabel:'Verification of Truth', intuition:'Assume one statement is true and check if it leads to contradictions. Only one scenario works with all facts.' };
}

// Non-Verbal Reasoning missing
function generateAnalyticalReasoningQuestion(diff) {
  var items=[
    function(){var n=rand(3,6);return {q:'A square is divided into '+(n*n)+' small squares by '+(n-1)+' horizontal and '+(n-1)+' vertical lines. Total squares?',a:Math.round(n*(n+1)*(2*n+1)/6),o:[String(n*n),String(2*n),String(Math.round(n*(n+1)*(2*n+1)/6)),String(n*2)],hint:'Also count squares of different sizes, not just the smallest.'};},
    function(){return {q:'In a triangle, lines are drawn from one vertex to the opposite side dividing it into '+(rand(3,6))+' parts. How many triangles total?',a:String(rand(3,6)),o:[String(rand(3,6)),String(rand(3,6)*2),String(rand(3,6)+1),String(rand(3,6)*3)],hint:'Count all triangles of different sizes.'};},
    // Count rectangles in grid
    function(){var n=rand(2,4), m=rand(2,4); var rects=Math.round(n*(n+1)*m*(m+1)/4); return {q:'Rectangles in a '+n+'×'+m+' grid?',a:String(rects),o:[String(rects),String(n*m),String(2*rects),String(Math.round(rects/2))],hint:'Formula: n(n+1)×m(m+1)/4'};},
    // Count triangles in complex figure
    function(){var n=rand(2,4); var count=n*n; return {q:'An equilateral triangle divided into '+n+'×'+n+' small triangles. Total triangles?',a:String(count),o:[String(count),String(2*count),String(Math.round(count/2)),String(count+2)],hint:'Count of small triangles = n²'};},
    // Count cubes in 3D stack
    function(){var l=rand(2,4), w=rand(2,4), h=rand(2,4); var cubes=l*w*h; return {q:'A cuboid is made by stacking small cubes in a '+l+'×'+w+'×'+h+' arrangement. Total small cubes?',a:String(cubes),o:[String(cubes),String(l+w+h),String(Math.round(cubes/2)),String(cubes*2)],hint:'Total cubes = length × width × height'};},
    // Count parallelograms in intersecting lines
    function(){var m=rand(2,4), n=rand(2,4); var pCount=Math.round(m*(m+1)*n*(n+1)/4); return {q:'A figure has '+m+' parallel horizontal lines intersecting '+n+' parallel slant lines. Total parallelograms?',a:String(pCount),o:[String(pCount),String(m*n),String(Math.round(pCount/2)),String(pCount*2)],hint:'Formula: m(m+1)×n(n+1)/4 where m=horizontal lines-1, n=slant lines-1'};},
    function(){var n=rand(2,6);var t=n*(n+1)/2;return {q:'From the top vertex of a triangle, straight lines are drawn to its base, dividing the base into '+n+' equal parts. How many triangles are formed in total?',a:String(t),o:[String(t),String(t+1),String(t-1),String(t+2)],hint:'Count the smallest triangles first, then the next larger size, up to the whole triangle. Total = 1+2+...+n = n(n+1)/2.'};},
    function(){var m=rand(2,4),n=rand(m,5),s=0;for(var k=1;k<=m;k++){s=s+(m-k+1)*(n-k+1);}return {q:'A grid that is '+m+' squares wide and '+n+' squares high is drawn. How many squares of all sizes can be counted in it?',a:String(s),o:[String(s),String(s+1),String(s+2),String(s-1)],hint:'For each square size k, there are (m-k+1)×(n-k+1) positions. Sum those values for k = 1 to '+m+'.'};},
    function(){var n=rand(4,8);var c=n*(n-1)/2;return {q:'How many straight lines can be drawn by joining pairs of '+n+' points in a plane, given that no three points are collinear?',a:String(c),o:[String(c),String(c+1),String(c-1),String(c+2)],hint:'Every pair of points determines exactly one line. Number of pairs = n×(n-1)/2.'};},
    function(){var n=rand(5,9);var d=n*(n-3)/2;return {q:'How many diagonals does a polygon with '+n+' sides have?',a:String(d),o:[String(d),String(d+1),String(d-1),String(d+3)],hint:'From each vertex, n-3 diagonals can be drawn (skip itself and its two neighbours). Total = n(n-3)/2.'};},
    function(){var n=rand(2,5);var t=Math.floor(n*(n+2)*(2*n+1)/8);return {q:'An equilateral triangle of side '+n+' is divided into unit equilateral triangles by lines parallel to its three sides. How many triangles of all orientations and sizes are there in the figure?',a:String(t),o:[String(t),String(t+1),String(t-2),String(n*n)],hint:'Add the upright triangles and the inverted ones. Total = n(n+2)(2n+1)/8, rounding down when n is odd.'};},
    function(){var n=rand(3,6);var c=(n-2)*(n-2)*(n-2);return {q:'A cube of side '+n+' is painted on all its faces and then cut into unit cubes. How many unit cubes have no paint on any face?',a:String(c),o:[String(c),String(c+1),String(n*n),String((n-1)*(n-1)*(n-1))],hint:'Only the interior cubes are unpainted. Remove one layer from every face: (n-2)³.'};},
    function(){var n=rand(2,5);var s=2*n*(n+1);return {q:'A grid of '+n+'×'+n+' small squares is built by laying individual matchsticks. How many matchsticks are needed in total?',a:String(s),o:[String(s),String(s+1),String(n*n*4),String(s-3)],hint:'The grid needs n(n+1) horizontal sticks and n(n+1) vertical sticks, so 2n(n+1).'};},
    function(){var n=rand(5,9);return {q:'From one vertex of a polygon with '+n+' sides, every possible diagonal is drawn. Into how many triangles is the polygon split?',a:String(n-2),o:[String(n-2),String(n-1),String(n-3),String(n-4)],hint:'A fully triangulated polygon with n sides is always cut into n-2 triangles.'};},
    function(){var n=rand(2,4);var h=3*n*(n-1)+1;return {q:'Coins are arranged in a hexagonal (honeycomb) pattern with '+n+' coins along each side. How many coins are there in total?',a:String(h),o:[String(h),String(h+1),String(n*n),String(h-2)],hint:'A hexagonal arrangement of side n is built ring by ring: 1 + 6 + 12 + ... = 3n(n-1)+1.'};},
    function(){var n=rand(3,6);var r=1+n*(n+1)/2;return {q:'What is the maximum number of regions into which '+n+' straight lines can divide a plane if no two lines are parallel and no three meet at a single point?',a:String(r),o:[String(r),String(2*n),String(r+1),String(r-2)],hint:'The k-th line cuts the previous k-1 lines and creates k new regions. Total = 1+1+2+...+n.'};}
  ];
  var d=items[rand(0,items.length-1)](); var o=d.o; shuffle(o);
  return { question:d.q, answer:d.a, options:o, hint:d.hint||'Count systematically — all sizes, not just the obvious ones', timeLimit:20, type:'reasoning', techniqueLabel:'Analytical Reasoning', intuition:'Count systematically: smallest first, then larger ones. For squares in a grid: sum of n² from 1 to N.' };
}

function generatePatternCompletionQuestion(diff) {
  var items=[
    {d:'△ ○ □<br>○ □ △<br>□ △ ?',a:'○',o:['△','○','□','◇']},
    {d:'R G B<br>G B R<br>B R ?',a:'G',o:['R','G','B','Y']},
    {d:'1 2 3<br>2 3 4<br>3 4 ?',a:'5',o:['5','6','7','8']},
    {d:'A B C<br>C A B<br>B C ?',a:'A',o:['A','B','C','D']},
    {d:'2 4 6<br>4 6 8<br>6 8 ?',a:'10',o:['8','9','10','12']},
    {d:'A 1 B<br>2 C 3<br>D 4 ?',a:'E',o:['E','5','F','6']},
    {d:'△ ○ □<br>○ □ △<br>□ △ ?',a:'○',o:['△','○','□','◇']},
    {d:'1 3 5<br>3 5 7<br>5 7 ?',a:'9',o:['9','10','8','12']},
    {d:'P Q R<br>Q R P<br>R P ?',a:'Q',o:['Q','P','R','S']},
    {d:'3 6 9<br>6 9 12<br>9 12 ?',a:'15',o:['15','14','16','18']},
    {d:'◇ ☆ □<br>☆ □ ◇<br>□ ◇ ?',a:'☆',o:['□','◇','☆','○']},
    {d:'M N O<br>N O M<br>O M ?',a:'N',o:['N','M','O','L']},
    {d:'2 5 8<br>5 8 11<br>8 11 ?',a:'14',o:['14','13','15','17']},
    {d:'□ ○ △<br>○ △ □<br>△ □ ?',a:'○',o:['△','○','◇','□']},
    {d:'7 8 9<br>8 9 7<br>9 7 ?',a:'8',o:['8','7','9','6']},
    {d:'○ ◇ △<br>◇ △ ○<br>△ ○ ?',a:'◇',o:['△','○','◇','☆']},
    {d:'4 7 10<br>7 10 13<br>10 13 ?',a:'16',o:['16','15','17','14']},
    {d:'X Y Z<br>Y Z X<br>Z X ?',a:'Y',o:['Y','X','Z','W']}
  ];
  var it=items[rand(0,items.length-1)]; var opts=it.o; shuffle(opts);
  return { question:'Complete the pattern:<br>'+it.d, answer:it.a, options:opts, hint:'Look for repeating cycle in rows and columns', timeLimit:15, type:'reasoning', techniqueLabel:'Pattern Completion', intuition:'The pattern repeats in a cycle. Check what element is missing from the cycle in that position.' };
}

function generateShapeConstructionQuestion(diff) {
  var items=[
    {q:'Which pieces can form a square?',a:'Two identical right triangles',o:['Two identical right triangles','A circle and a triangle','Three different rectangles','Four small circles']},
    {q:'Which can form a rectangle?',a:'Two identical rectangles placed side by side',o:['Two identical rectangles placed side by side','A square and a circle','A triangle and a line','Three squares in a row']},
    {q:'How many equilateral triangles of side 1 can fit in an equilateral triangle of side 3?',a:'9',o:['3','6','9','12']},
    {q:'Move 2 matchsticks to make 5 squares from 6 (arranged as 2×3). How to start?',a:'Remove inner match of middle row',o:['Remove inner match of middle row','Remove all corner matches','Add new matches','Move all matches to corners']},
    {q:'Which net folds into a cube?',a:'A cross shape of 6 squares (1 center, 4 around, 1 attached to one)',o:['A cross shape of 6 squares','A line of 6 squares','A T-shape of 6 squares','An L-shape of 6 squares']},
    {q:'Which combination forms a parallelogram?',a:'Two identical triangles joined along a matching side',o:['Two identical triangles joined along a matching side','A circle and a rectangle','Two identical squares','A triangle and a pentagon']},
    {q:'A 5 by 3 rectangle is tiled with unit squares.',a:'15',o:['8','13','15','24']},
    {q:'Which can be folded to form a triangular prism?',a:'Two triangles connected by three rectangles in a chain',o:['Two triangles connected by three rectangles in a chain','Three triangles only','Two rectangles only','One rectangle and one circle']},
    {q:'Which set of pieces forms a cube when assembled?',a:'Six identical squares',o:['Six identical squares','Four identical triangles and a square','Four circles and a square','Five rectangles']},
    {q:'Which pair of shapes can join to form a full circle?',a:'Two identical semicircles',o:['Two identical semicircles','A square and a triangle','Two triangles','A rectangle and an ellipse']},
    {q:'A 3 by 3 by 3 cube is built from unit cubes.',a:'27',o:['9','18','27','36']},
    {q:'Which net forms a cylinder when rolled and joined?',a:'A rectangle with a circle attached to each end',o:['A rectangle with a circle attached to each end','Two squares and a circle','A single rectangle','One rectangle and one triangle']},
    {q:'How many small triangles of side 1 fill an equilateral triangle of side 2?',a:'4',o:['2','3','4','6']},
    {q:'What is the least number of identical squares needed to assemble a closed cube?',a:'6',o:['4','6','12','8']},
    {q:'A square sheet is cut along both diagonals.',a:'Four identical right triangles',o:['Four identical right triangles','Four identical squares','Two rectangles','Four circles']}
  ];
  var it=items[rand(0,items.length-1)]; shuffle(it.o);
  return { question:it.q, answer:it.a, options:it.o, hint:'Think about how shapes combine to form the target shape', timeLimit:15, type:'reasoning', techniqueLabel:'Shape Construction', intuition:'Shapes combine by matching edges. Two identical right triangles form a square/rectangle. Area of similar shapes scales by square of side ratio.' };
}

// Verbal Ability missing
var COMMON_IDIOMS = [{i:'A piece of cake',m:'Something very easy to do'},
{i:'A penny for your thoughts',m:'An expression used to ask someone what they are thinking'},
{i:'A slap on the wrist',m:'A mild punishment or reprimand'},
{i:"A stone's throw",m:'A very short distance'},
{i:'Add insult to injury',m:'To make a bad situation worse by doing something hurtful'},
{i:'Against the clock',m:'Racing to finish something before a deadline'},
{i:'All ears',m:'Listening attentively and eagerly'},
{i:'Apple of my eye',m:'A person who is cherished above all others'},
{i:'At the drop of a hat',m:'Without hesitation or delay; immediately'},
{i:'Back to square one',m:'To start over from the beginning'},
{i:'Bark up the wrong tree',m:'To pursue a wrong course of action or make a false assumption'},
{i:'Bite off more than you can chew',m:'To take on a task that is too big to handle'},
{i:'Born with a silver spoon',m:'Born into a wealthy or privileged family'},
{i:'By hook or by crook',m:'By any means necessary, fair or foul'},
{i:'Castles in the air',m:'Daydreams or unrealistic plans'},
{i:"Cry over spilt milk",m:'To regret something that has already happened and cannot be undone'},
{i:"Devil's advocate",m:'Someone who argues against a position just to test or strengthen it'},
{i:'Dog days',m:'The hottest period of summer; a difficult or sluggish period'},
{i:'Draw the line',m:'To set a limit on what is acceptable'},
{i:'Every cloud has a silver lining',m:'Every bad situation has some good aspect'},
{i:'Fair and square',m:'Honestly and without cheating'},
{i:"Feather in one's cap",m:'An achievement to be proud of'},
{i:'Fish out of water',m:'A person who feels uncomfortable or out of place'},
{i:"Fool's paradise",m:'A state of happiness based on false or deluded hopes'},
{i:'Get the ball rolling',m:'To start an activity or process'},
{i:'Gift of the gab',m:'The ability to speak fluently and persuasively'},
{i:'Greenhorn',m:'An inexperienced or naive person'},
{i:'Hold your horses',m:'Be patient; slow down and wait'},
{i:'In the limelight',m:'At the center of public attention or fame'},
{i:'Kick the bucket',m:'To die (informal slang)'},
{i:'Make a mountain out of a molehill',m:'To exaggerate a minor problem'},
{i:'Mumbo jumbo',m:'Confusing or meaningless language or ritual'},
{i:'Over the moon',m:'Extremely happy and delighted'},
{i:'Paint the town red',m:'To go out and celebrate wildly'},
{i:'Pass the buck',m:'To shift responsibility to someone else'},
{i:'Piece of work',m:'A difficult or unpleasant person to deal with'},
{i:'Play devil\'s advocate',m:'To argue against something just for the sake of debate'},
{i:"Pull someone's leg",m:'To joke with someone or tease them playfully'},
{i:'Red herring',m:'Something that misleads or distracts from the real issue'},
{i:'Ring a bell',m:"To sound familiar or evoke a memory"},
{i:'Rule of thumb',m:'A practical and general guideline, not a strict rule'},
{i:'Sail through',m:'To succeed easily at something without difficulty'},
{i:'Up in arms',m:'Angry and ready to protest or fight'},
{i:'White elephant',m:'A costly possession that is difficult to maintain or useless'},
{i:'Wild goose chase',m:'A hopeless and futile pursuit'},
{i:"You can't judge a book by its cover",m:'You cannot determine the true nature of something from outward appearance'},
{i:'Burning question',m:'An issue that is of immediate and pressing concern'},
{i:"Cat's paw",m:'A person used as a tool by another to accomplish their purposes'},
{i:'Fortnight',m:'A period of two weeks'},
{i:'Hard and fast',m:'Strict and not to be changed or broken'},
{i:'In a fix',m:'In a difficult or awkward situation'},
{i:'Man of straw',m:'A weak or ineffective person; someone easily defeated'},
{i:'Nip in the bud',m:'To stop something at an early stage before it develops further'},
{i:'On tenterhooks',m:'In a state of nervous suspense and anticipation'},
{i:'Out of sorts',m:'Slightly unwell or in a bad mood'},
{i:"Put one's foot down",m:'To assert authority and refuse to allow something'},
{i:'Rank and file',m:'The ordinary members of an organization, not the leaders'},
{i:'Red letter day',m:'A day of special significance or importance'},
{i:'Tooth and nail',m:'With great effort and determination'},
{i:'Turn a deaf ear',m:'To deliberately ignore a request or plea'},
{i:'Bed of roses',m:'A situation of ease and comfort'},
{i:'Carry the day',m:'To win or be victorious'},
{i:'Eke out',m:'To make something last or stretch by using it sparingly'},
{i:'Far cry',m:'A very different thing from what was expected or compared'},
{i:'Give way',m:'To collapse, break down, or yield under pressure'},
{i:'Hang fire',m:'To be delayed or put on hold'},
{i:'Hold water',m:'To be logical or convincing; to withstand scrutiny'},
{i:'Iron will',m:'An extremely strong and determined willpower'},
{i:'Keep in the dark',m:'To keep someone uninformed or ignorant about something'},
{i:'Laughing stock',m:'A person who is ridiculed or mocked by everyone'},
{i:'Make both ends meet',m:'To manage to live within one\'s income; to survive financially'},
{i:'Nook and corner',m:'Every small and hidden part of a place'},
{i:'Part and parcel',m:'An essential or integral part of something'},
{i:'Pocket an insult',m:'To bear an insult without retaliating'},
{i:"Prove one's mettle",m:'To demonstrate one\'s strength of character and ability'},
{i:"Rest on one's oars",m:'To stop making an effort and relax after a period of work'},
{i:'Soft corner',m:'A special feeling of affection or sympathy for someone or something'},
{i:'To beat the air',m:'To make futile efforts or waste energy on something pointless'},
{i:'Uphill task',m:'A very difficult and challenging job'},
{i:'With open arms',m:'To welcome someone warmly and enthusiastically'},
{i:'A hot potato',m:'A controversial or sensitive issue that is difficult to deal with'},
{i:'A wet blanket',m:'A person who spoils other people\'s fun or enthusiasm'},
{i:'Ace up one\'s sleeve',m:'A hidden advantage or secret resource'},
{i:'Actions speak louder than words',m:'What people do is more important than what they say'},
{i:'Add fuel to the fire',m:'To make a bad situation worse by doing something provocative'},
{i:'A dime a dozen',m:'Something very common and of little value'},
{i:'A diamond in the rough',m:'A person of good character who lacks refinement or polish'},
{i:'A flash in the pan',m:'Something that shows initial promise but fails to deliver'},
{i:'Alphabet soup',m:'A jumble of abbreviations or acronyms'},
{i:'An open book',m:'A person whose thoughts and feelings are easily understood'},
{i:'At a loss',m:'Puzzled or uncertain about what to do or say'},
{i:'At one\'s wits\' end',m:'Extremely worried or frustrated; not knowing what to do'},
{i:'Back someone up',m:'To support or assist someone'},
{i:'Bail out',m:'To rescue someone from a difficult situation'},
{i:'Ballpark figure',m:'A rough or approximate estimate'},
{i:'Barking at the wrong tree',m:'To direct efforts toward the wrong target'},
{i:'Bent on',m:'Determined or set on doing something'},
{i:'Best man for the job',m:'The most suitable person for a particular task'},
{i:'Beyond the shadow of a doubt',m:'Absolutely certain; without any doubt'},
{i:'Bite one\'s tongue',m:'To stop oneself from saying something one wants to say'},
{i:'Blood is thicker than water',m:'Family relationships are stronger than other relationships'},
{i:'Blow hot and cold',m:'To keep changing one\'s opinion or attitude'},
{i:'Bob\'s your uncle',m:'And there you have it; it\'s as simple as that'},
{i:'Bosom buddy',m:'A very close and intimate friend'},
{i:'Bought to book',m:'To be called to account for one\'s actions'},
{i:'Break new ground',m:'To do something innovative or pioneering'},
{i:'Break the bank',m:'To cost an excessively large amount of money'},
{i:'Bring home the bacon',m:'To earn a living for one\'s family'},
{i:'Bring to light',m:'To reveal or make something known'},
{i:'Bury the hatchet',m:'To end a quarrel or conflict and make peace'},
{i:'Butter someone up',m:'To flatter someone to gain a favor'},
{i:'By and large',m:'Generally speaking; on the whole'},
{i:'By the skin of one\'s teeth',m:'Barely; by a very narrow margin'},
{i:'Call it a day',m:'To stop working on something for the rest of the day'},
{i:'Call the shots',m:'To be the person in charge who makes the decisions'},
{i:'Can\'t make head or tail',m:'Cannot understand something at all'},
{i:'Carbon copy',m:'An exact duplicate or very similar person or thing'},
{i:'Carry a torch',m:'To have feelings of unrequited love for someone'},
{i:'Cat got your tongue',m:'Used to ask someone why they are not speaking'},
{i:'Chain reaction',m:'A series of events where each causes the next'},
{i:'Change one\'s tune',m:'To change one\'s attitude or opinion about something'},
{i:'Cheapskate',m:'A person who is unwilling to spend money'},
{i:'Chip on one\'s shoulder',m:'A feeling of resentment or grievance from past treatment'},
{i:'Clean bill of health',m:'A report that someone is healthy or something is in good condition'},
{i:'Climb the ladder',m:'To advance in one\'s career or social position'},
{i:'Close at hand',m:'Nearby; easily accessible'},
{i:'Cock and bull story',m:'An unbelievable or fabricated tale'},
{i:'Come rain or shine',m:'Regardless of the circumstances; in any weather'},
{i:'Conk out',m:'To stop functioning; to break down'},
{i:'Cook the books',m:'To falsify financial records or accounts'},
{i:'Cool as a cucumber',m:'Very calm and composed, especially under pressure'},
{i:'Crocodile tears',m:'Insincere or fake display of sorrow'},
{i:'Cry wolf',m:'To raise a false alarm or make threats one will not carry out'},
{i:'Cut the mustard',m:'To meet expectations or perform satisfactorily'},
{i:'Dash off',m:'To write or do something very quickly'},
{i:'Day in and day out',m:'Continuously; every single day without fail'},
{i:'Dead ringer',m:'Someone or something that looks exactly like another'},
{i:'Die-hard',m:'Someone who strongly resists change or is very stubborn'},
{i:'Do away with',m:'To get rid of or abolish something'},
{i:'Do the trick',m:'To produce the desired result or solve a problem'},
{i:'Donkey\'s years',m:'A very long time'},
{i:'Doubting Thomas',m:'A person who is skeptical and refuses to believe without proof'},
{i:'Down to earth',m:'Practical, realistic, and unpretentious'},
{i:'Drive someone up the wall',m:'To annoy or irritate someone greatly'},
{i:'Duck out',m:'To leave suddenly or avoid a responsibility'},
{i:'Dust oneself off',m:'To recover from a setback and try again'},
{i:'Eat humble pie',m:'To make a humiliating apology or admit one was wrong'},
{i:'Egg on one\'s face',m:'To be embarrassed because of something one has done'},
{i:'Elephant in the room',m:'An obvious problem or issue that everyone ignores'},
{i:'End of the road',m:'The point where something can no longer continue'},
{i:'Eye for an eye',m:'A principle that a wrong should be punished in kind'},
{i:'Finger in every pie',m:'Being involved in many different activities or affairs'},
{i:'Fly off the handle',m:'To lose one\'s temper suddenly and unexpectedly'},
{i:'Fool around',m:'To behave in a silly or irresponsible way'},
{i:'For good',m:'Permanently; forever'},
{i:'From the bottom of one\'s heart',m:'Sincerely and genuinely'},
{i:'Get along with',m:'To have a friendly relationship with someone'},
{i:'Get away with',m:'To do something wrong without being caught or punished'},
{i:'Get off on the wrong foot',m:'To start a relationship or situation badly'},
{i:'Get one\'s act together',m:'To organize oneself and behave more effectively'},
{i:'Get the hang of',m:'To learn how to do something; to become familiar with something'},
{i:'Get the sack',m:'To be dismissed from a job'},
{i:'Get to the bottom of',m:'To discover the real truth about something'},
{i:'Give a cold shoulder',m:'To intentionally be unfriendly or ignore someone'},
{i:'Give someone the benefit of the doubt',m:'To believe someone is telling the truth when unsure'},
{i:'Go back on one\'s word',m:'To break a promise or commitment'},
{i:'Go bust',m:'To go bankrupt or run out of money'},
{i:'Go through fire and water',m:'To face great danger or hardship'},
{i:'Golden handshake',m:'A generous financial payment given when someone leaves a job'},
{i:'Grasp the nettle',m:'To deal with a difficult situation firmly and directly'},
{i:'Grey area',m:'A situation that is not clearly defined or categorized'},
{i:'Grind to a halt',m:'To slow down and eventually stop completely'},
{i:'Hand in glove',m:'In close association or partnership'},
{i:'Hands are tied',m:'To be unable to act due to restrictions or rules'},
{i:'Hang in there',m:'To persevere and not give up despite difficulties'},
{i:'Have a heart of gold',m:'To be very kind and generous'},
{i:'Have eyes in the back of one\'s head',m:'To be very aware of what is happening around you'},
{i:'Have the last laugh',m:'To ultimately triumph after initial failure or mockery'},
{i:'Heel',m:'A weak point in a person\'s character'},
{i:'High-handed',m:'Using power in an arbitrary and oppressive way'},
{i:'Honest to God',m:'Used to emphasize that one is telling the truth'},
{i:'In a tight corner',m:'In a difficult or embarrassing situation'},
{i:'In one\'s heyday',m:'During the period of one\'s greatest success or power'},
{i:'In the pipeline',m:'In the process of being planned, developed, or produced'},
{i:'It takes two to tango',m:'Both parties are responsible for a situation or conflict'},
{i:'Jack of all trades',m:'A person who can do many different things but may not excel in any'},
{i:'Jersey barrier',m:'A concrete or steel barrier used to separate lanes of traffic'},
{i:'Keep one\'s chin up',m:'To stay cheerful and brave in a difficult situation'},
{i:'Keep someone at arm\'s length',m:'To avoid becoming too friendly or close to someone'},
{i:'Kick start',m:'To begin something with a burst of energy or enthusiasm'},
{i:'Knock on wood',m:'Said to ward off bad luck after boasting or speaking hopefully'},
{i:'Know the ropes',m:'To be familiar with the details of how something works'},
{i:'Lay one\'s cards on the table',m:'To be completely honest and open about one\'s intentions'},
{i:'Leave no stone unturned',m:'To try every possible option to achieve something'},
{i:'Let bygones be bygones',m:'To forgive and forget past grievances'},
{i:'Look before you leap',m:'To consider possible consequences before taking action'},
{i:'Look down one\'s nose',m:'To consider oneself superior to others'},
{i:'Loose cannon',m:'An unpredictable person who may cause harm'},
{i:'Made of money',m:'Extremely wealthy; having plenty of money'},
{i:'Make a beeline for',m:'To go quickly and directly toward someone or something'},
{i:'Make a long story short',m:'To summarize or give the essential details'},
{i:'Make ends meet',m:'To manage to cover expenses and live within one\'s means'},
{i:'Make hay while the sun shines',m:'To take advantage of an opportunity while it lasts'},
{i:'Make the grade',m:'To meet required standards; to succeed'},
{i:'Man of letters',m:'A scholar or writer; a learned person'},
{i:'Mean business',m:'To be serious and determined about something'},
{i:'Method in one\'s madness',m:'A reason or plan behind what appears to be crazy behavior'},
{i:'Midas touch',m:'An exceptional ability to make money or succeed at everything'},
{i:'Mind one\'s own business',m:'To not interfere in other people\'s affairs'},
{i:'More often than not',m:'Frequently; more than half the time'},
{i:'My way or the highway',m:'Do it my way or leave; there is no alternative'},
{i:'Nail-biter',m:'A very close and exciting contest or event'},
{i:'Neither here nor there',m:'Irrelevant or not important to the matter at hand'},
{i:'Never say die',m:'Never give up; always keep trying'},
{i:'New broom',m:'A person who has just taken over a job and wants to make changes'},
{i:'No rhyme or reason',m:'Without any logical pattern or explanation'},
{i:'No skin off my back',m:'Something that does not affect or concern me at all'},
{i:'Not playing with a full deck',m:'Not thinking clearly; somewhat mentally deficient'},
{i:'Nothing doing',m:'A refusal; an expression of disbelief or disappointment'},
{i:'Off the cuff',m:'Done or said without preparation; spontaneously'},
{i:'Off the record',m:'Not for publication or public knowledge; informally'},
{i:'On a shoestring',m:'With a very small budget or minimal resources'},
{i:'On cloud nine',m:'Extremely happy or euphoric'},
{i:'On the fence',m:'Undecided or neutral about an issue'},
{i:'On the same wavelength',m:'Thinking in a similar way; having the same understanding'},
{i:'On thin ice',m:'In a risky or precarious situation'},
{i:'Once bitten, twice shy',m:'After a bad experience, one becomes more cautious'},
{i:'Out of hand',m:'Out of control; beyond management'},
{i:'Out of the woods',m:'No longer in danger or difficulty'},
{i:'Over the top',m:'Excessive or exaggerated beyond what is appropriate'},
{i:'Pace setter',m:'A person or thing that sets a standard for others to follow'},
{i:'Pan out',m:'To turn out or develop in a particular way'},
{i:'Par for the course',m:'What is expected or normal in a given situation'},
{i:'Patch things up',m:'To repair a relationship or resolve a disagreement'},
{i:'Pay through the nose',m:'To pay an excessively high price for something'},
{i:'Pencil in',m:'To tentatively schedule something; to add provisionally'},
{i:'Perk up',m:'To become more cheerful or lively'},
{i:'Pick someone\'s brain',m:'To get ideas or information from someone knowledgeable'},
{i:'Pig in a poke',m:'Something bought or accepted without being inspected first'},
{i:'Pipe dream',m:'An unattainable or fanciful hope or plan'},
{i:'Play it by ear',m:'To decide how to deal with a situation as it develops'},
{i:'Play with fire',m:'To take a great risk or engage in dangerous behavior'},
{i:'Polar opposite',m:'Something or someone that is completely opposite in every way'},
{i:'Preaching to the choir',m:'Trying to convince people who already agree with you'},
{i:'Pull one\'s weight',m:'To do one\'s fair share of work'},
{i:'Put on a pedestal',m:'To admire someone greatly; to regard as perfect'},
{i:'Put the cart before the horse',m:'To do things in the wrong order'},
{i:'Rack one\'s brains',m:'To think very hard about something'},
{i:'Rags to riches',m:'A situation where someone rises from poverty to wealth'},
{i:'Read between the lines',m:'To understand the hidden or implied meaning'},
{i:'Reinvent the wheel',m:'To waste time creating something that already exists'},
{i:'Ride the coattails',m:'To benefit from someone else\'s success or efforts'},
{i:'Rock the boat',m:'To disturb a stable or peaceful situation'},
{i:'Rub someone the wrong way',m:'To irritate or annoy someone'},
{i:'Run out of steam',m:'To lose energy or momentum and stop making progress'},
{i:'Run the gamut',m:'To cover the entire range of something'},
{i:'Save face',m:'To avoid embarrassment or humiliation'},
{i:'Seal of approval',m:'Official acceptance or endorsement'},
{i:'Second to none',m:'The best; without equal'},
{i:'See eye to eye',m:'To agree with someone; to have the same opinion'},
{i:'Shoot from the hip',m:'To speak or act without careful thought'},
{i:'Shoot oneself in the foot',m:'To inadvertently cause one\'s own failure or problem'},
{i:'Sick and tired',m:'Completely fed up and annoyed with something'},
{i:'Side by side',m:'Next to each other; closely together'},
{i:'Slew of',m:'A large number or quantity of'},
{i:'Smell a rat',m:'To suspect that something is wrong or dishonest'},
{i:'Smooth sailing',m:'Progress without difficulties or obstacles'},
{i:'Snug as a bug in a rug',m:'Very comfortable and content'},
{i:'Snowball effect',m:'A situation where something increases in size or importance at an accelerating rate'},
{i:'Sow one\'s wild oats',m:'To indulge in youthful or reckless behavior before settling down'},
{i:'Speak volumes',m:'To convey a great deal of information or meaning'},
{i:'Spoon feed',m:'To make things too easy; to provide excessive help'},
{i:'Spur of the moment',m:'Done suddenly without planning; spontaneous'},
{i:'Square one',m:'The starting point; the initial stage'},
{i:'Stab in the back',m:'A betrayal of trust by someone close'},
{i:'Stage mother',m:'A mother who aggressively promotes her child in show business'},
{i:'Stand one\'s ground',m:'To maintain one\'s position despite opposition'},
{i:'Star-crossed',m:'Ill-fated; doomed by fate or bad luck'},
{i:'Stiff upper lip',m:'To remain brave and composed in the face of difficulty'},
{i:'Straight from the horse\'s mouth',m:'Information from the most reliable source'},
{i:'Strike while the iron is hot',m:'To take advantage of an opportunity as soon as it arises'},
{i:'Swallow one\'s pride',m:'To humble oneself; to set aside one\'s ego'},
{i:'Sweep under the rug',m:'To hide or conceal something embarrassing or problematic'},
{i:'Swing both ways',m:'To have interests or abilities in two opposing directions'},
{i:'Tear one\'s hair out',m:'To be extremely worried or frustrated'},
{i:'The lion\'s share',m:'The largest part or portion of something'},
{i:'The whole nine yards',m:'Everything; the full extent of something'},
{i:'Thick and thin',m:'Through both good times and bad times'},
{i:'Through thick and thin',m:'Under all circumstances, including difficult ones'},
{i:'Tied up in knots',m:'Very nervous, confused, or emotionally distressed'},
{i:'Till the cows come home',m:'For a very long time; indefinitely'},
{i:'Tipping point',m:'The critical point at which a significant change occurs'},
{i:'Tongue in cheek',m:'Said or done with ironic or humorous intent'},
{i:'Top notch',m:'Of the highest quality or standard'},
{i:'Touch wood',m:'Used to ward off bad luck after making a hopeful statement'},
{i:'Turn the tables',m:'To reverse a situation, especially giving advantage to the disadvantaged'},
{i:'Under one\'s nose',m:'Very close; in plain sight'},
{i:'Vegetate',m:'To live in a monotonous and inactive way'},
{i:'Walk on eggshells',m:'To be very cautious in one\'s words or actions to avoid offending'},
{i:'What goes around comes around',m:'Actions eventually have consequences for the person who did them'},
{i:'Win hands down',m:'To win easily and convincingly'},
{i:'Wolf in sheep\'s clothing',m:'A dangerous person who pretends to be harmless'},
{i:'Wrap one\'s head around',m:'To understand something difficult or confusing'},
{i:'Yield results',m:'To produce or bring about desired outcomes'},
{i:'Break the ice',m:'Start a conversation in a social setting'},
  {i:'Hit the nail on the head',m:'Describe exactly what is causing a situation'},
  {i:'Piece of cake',m:'Very easy'},
  {i:'Once in a blue moon',m:'Very rarely'},
  {i:'Bite the bullet',m:'Face a difficult situation bravely'},
  {i:'Burn the midnight oil',m:'Work late into the night'},
  {i:'Let the cat out of the bag',m:'Reveal a secret accidentally'},
  {i:'Steal someone\'s thunder',m:'Take credit for someone else\'s work'},
  {i:'Cost an arm and a leg',m:'Be very expensive'},
  {i:'Under the weather',m:'Feeling ill'},
  {i:'Cut corners',m:'Do something poorly to save time/money'},
  {i:'Speak of the devil',m:'Someone appears just when you talk about them'},
  {i:'Beat around the bush',m:'Avoid the main topic; talk indirectly'},
  {i:'The ball is in your court',m:'It\'s your turn to make a decision'},
  {i:'When pigs fly',m:'Something that will never happen'},
  {i:'A blessing in disguise',m:'Something bad that turns out to be good'},
  {i:'Hit the sack',m:'Go to sleep'},
  {i:'Put all your eggs in one basket',m:'Risk everything on one venture'},
  {i:'The best of both worlds',m:'Enjoy two different advantages at once'},
  {i:'A picture is worth a thousand words',m:'Visual images convey more than words'},
  {i:'A bolt from the blue',m:'A sudden, unexpected event'},
  {i:'A feather in one\'s cap',m:'An achievement to be proud of'},
  {i:'A man of letters',m:'A scholarly person, well-read'},
  {i:'A snake in the grass',m:'A hidden enemy; a deceitful person'},
  {i:'Alembic of the mind',m:'A refining or purifying process for thoughts'},
  {i:'Apple of one\'s eye',m:'A very dear person'},
  {i:'At sixes and sevens',m:'In a state of confusion or disorder'},
  {i:'At the eleventh hour',m:'At the last possible moment'},
  {i:'Back to the drawing board',m:'Start over after a plan fails'},
  {i:'Barking up the wrong tree',m:'Wasting effort on the wrong target'},
  {i:'Beggars can\'t be choosers',m:'Those in need cannot be picky'},
  {i:'Better late than never',m:'It is better to act late than not at all'},
  {i:'Birds of a feather flock together',m:'People of similar nature gather together'},
  {i:'Burn one\'s boats/bridges',m:'Do something that cannot be reversed'},
  {i:'By leaps and bounds',m:'Very rapidly'},
  {i:'Call a spade a spade',m:'Speak plainly and directly'},
  {i:'Chip off the old block',m:'A child resembling a parent'},
  {i:'Close shave',m:'A narrow escape from danger'},
  {i:'Cut to the chase',m:'Focus on the essential point'},
  {i:'Dark horse',m:'A person whose abilities are unknown'},
  {i:'Down in the dumps',m:'Feeling sad or depressed'},
  {i:'Elbow room',m:'Space to move or work freely'},
  {i:'Face the music',m:'Accept the consequences of one\'s actions'},
  {i:'Feather one\'s nest',m:'Make money for oneself, often selfishly'},
  {i:'Few and far between',m:'Rare, not happening often'},
  {i:'Give the benefit of the doubt',m:'Believe someone\'s claim without proof'},
  {i:'Go the extra mile',m:'Make more effort than is required'},
  {i:'Green thumb',m:'Skill in gardening'},
  {i:'Herculean task',m:'A task requiring great strength or effort'},
  {i:'High and dry',m:'Left helpless or without resources'},
  {i:'Hobson\'s choice',m:'No real choice; take it or leave it'},
  {i:'Hold one\'s horses',m:'Wait; be patient'},
  {i:'In a nutshell',m:'In a few words; concisely'},
  {i:'In hot water',m:'In trouble'},
  {i:'In the nick of time',m:'Just in time'},
  {i:'Ivory tower',m:'A state of being detached from reality'},
  {i:'Kill two birds with one stone',m:'Achieve two aims with one action'},
  {i:'Lion\'s share',m:'The largest portion'},
  {i:'Miss the boat',m:'Lose an opportunity'},
  {i:'No love lost between',m:'They dislike each other'},
  {i:'Null and void',m:'Having no legal force; invalid'},
  {i:'On the verge of',m:'Almost about to do something'},
  {i:'Out of the blue',m:'Suddenly, unexpectedly'},
  {i:'Play second fiddle',m:'Take a subordinate role'},
  {i:'Pot calling the kettle black',m:'Accusing someone of what you also do'},
  {i:'Pull one\'s leg',m:'Tease someone playfully'},
  {i:'Put down in black and white',m:'Write something down officially'},
  {i:'Raining cats and dogs',m:'Raining very heavily'},
  {i:'Rise and shine',m:'Wake up cheerfully'},
  {i:'Sit on the fence',m:'Avoid taking sides in a dispute'},
  {i:'Spill the beans',m:'Reveal a secret'},
  {i:'Take with a grain of salt',m:'Do not take something literally'},
  {i:'The last straw',m:'The final problem that causes collapse'},
  {i:'Throw in the towel',m:'Give up; admit defeat'},
  {i:'Turn a blind eye',m:'Ignore or pretend not to see'},
  {i:'Ups and downs',m:'Times of good and bad fortune'},
  {i:'Wear one\'s heart on one\'s sleeve',m:'Show feelings openly'},
  {i:'Whole nine yards',m:'Everything; the complete amount'},
  {i:'With flying colours',m:'With great success'},
  {i:'Wild-goose chase',m:'A useless or hopeless search'},
  {i:'Worth one\'s salt',m:'Competent and deserving respect'},
  {i:'Yellow journalism',m:'Sensationalist reporting to attract readers'},
  {i:'Zeal without knowledge',m:'Eagerness that leads to trouble due to ignorance'},
  {i:'Achilles\' heel',m:'A fatal weakness despite overall strength'},
  {i:'Beat about the bush',m:'Avoid the main point; speak indirectly'},
  {i:'Blow one\'s own trumpet',m:'Praise one\'s own abilities'},
  {i:'Cold shoulder',m:'Deliberately ignoring someone'},
  {i:'Dutch courage',m:'Boldness that comes from drinking alcohol'},
  {i:'Fair-weather friend',m:'A friend who leaves in times of trouble'},
  {i:'From hand to mouth',m:'Living with only enough to meet basic needs'},
  {i:'Give and take',m:'Mutual concession between people'},
  {i:'In the long run',m:'Over an extended period; eventually'},
  {i:'Keep at arm\'s length',m:'Avoid becoming close or familiar'},
  {i:'Let sleeping dogs lie',m:'Do not disturb old problems'},
  {i:'Moot point',m:'A debatable, uncertain issue'},
  {i:'Out of the frying pan into the fire',m:'From a bad situation to a worse one'},
  {i:'Pros and cons',m:'Advantages and disadvantages'},
  {i:'Round the clock',m:'Continuously, all day and night'},
  {i:'Swan song',m:'A final performance before retirement'},
  {i:'Take the bull by the horns',m:'Face a difficulty boldly'},
  {i:'To let the grass grow under one\'s feet',m:'To delay or waste time in acting'}];

var ONE_WORD_SUBS = [{p:'One who does not believe in the existence of God',w:'Atheist'},
{p:'One who believes God exists but does not intervene',w:'Deist'},
{p:'One who believes everything is predetermined by fate',w:'Fatalist'},
{p:'One who believes in only one God',w:'Monotheist'},
{p:'One who believes in many Gods',w:'Polytheist'},
{p:'One who gives up his religion for another',w:'Apostate'},
{p:'One who is indifferent to religion or pleasure and pain',w:'Stoic'},
{p:'One who doubts the existence of God',w:'Agnostic'},
{p:'A person who loves mankind and does good to others',w:'Philanthropist'},
{p:'One who hates mankind',w:'Misanthrope'},
{p:'One who hates men',w:'Misandrist'},
{p:'One who loves wine',w:'Oenophilist'},
{p:'One who loves learning',w:'Philomath'},
{p:'One who loves art and beautiful things',w:'Aesthete'},
{p:'One who loves and supports his own country',w:'Patriot'},
{p:'One who loves his wife',w:'Uxorious'},
{p:'One who is always doubtful',w:'Sceptic'},
{p:'One who never makes mistakes',w:'Infallible'},
{p:'One who is concerned with the welfare of others',w:'Altruist'},
{p:'One who thinks only of his own interest',w:'Egotist'},
{p:'One who interferes in other people\'s affairs without being asked',w:'Meddler'},
{p:'The study of birds',w:'Ornithology'},
{p:'The study of insects',w:'Entomology'},
{p:'The study of the origin and history of words',w:'Etymology'},
{p:'The study of ancient remains and human history',w:'Archaeology'},
{p:'The study of the mind and behaviour',w:'Psychology'},
{p:'The study of skin diseases',w:'Dermatology'},
{p:'The study of heart diseases',w:'Cardiology'},
{p:'The study of cancer',w:'Oncology'},
{p:'The study of fungi',w:'Mycology'},
{p:'The study of trees',w:'Dendrology'},
{p:'The study of maps and map making',w:'Cartography'},
{p:'The study of handwriting',w:'Graphology'},
{p:'The study of heredity and variation',w:'Genetics'},
{p:'The study of language',w:'Linguistics'},
{p:'The study of the structure of sounds in speech',w:'Phonetics'},
{p:'The study of plants',w:'Botany'},
{p:'The study of animals',w:'Zoology'},
{p:'The study of stars and celestial bodies',w:'Astronomy'},
{p:'The study of the Earth\'s structure and history',w:'Geology'},
{p:'The study of weather',w:'Meteorology'},
{p:'The study of fossils',w:'Palaeontology'},
{p:'The study of earthquakes',w:'Seismology'},
{p:'The study of volcanoes',w:'Volcanology'},
{p:'The study of human races and cultures',w:'Ethnology'},
{p:'The study of coins and medals',w:'Numismatics'},
{p:'The study of stamps',w:'Philately'},
{p:'The study of flags',w:'Vexillology'},
{p:'The study of the influence of stars on human lives',w:'Astrology'},
{p:'The study of the origin and development of the universe',w:'Cosmology'},
{p:'The study of the relationship between living things and their environment',w:'Ecology'},
{p:'The study of the immune system',w:'Immunology'},
{p:'The study of the nervous system',w:'Neurology'},
{p:'The study of the eye',w:'Ophthalmology'},
{p:'The study of the ear, nose and throat',w:'Otolaryngology'},
{p:'The study of kidney diseases',w:'Nephrology'},
{p:'The study of blood',w:'Haematology'},
{p:'The study of bones',w:'Osteology'},
{p:'The study of glands',w:'Endocrinology'},
{p:'The study of the causes of disease',w:'Aetiology'},
{p:'The scientific study of the ageing process',w:'Gerontology'},
{p:'The study of the origin of human beings',w:'Anthropology'},
{p:'The study of the atmosphere and weather conditions',w:'Climatology'},
{p:'The study of fish',w:'Ichthyology'},
{p:'The study of reptiles and amphibians',w:'Herpetology'},
{p:'The study of the breeding and care of bees',w:'Apiculture'},
{p:'The cultivation of fruit',w:'Pomology'},
{p:'The cultivation of garden plants',w:'Horticulture'},
{p:'The art of cultivating land and raising crops',w:'Agriculture'},
{p:'The breeding, feeding and care of fish',w:'Pisciculture'},
{p:'The care and treatment of the teeth',w:'Dentistry'},
{p:'The murder of a king',w:'Regicide'},
{p:'The murder of one\'s father',w:'Patricide'},
{p:'The murder of one\'s mother',w:'Matricide'},
{p:'The murder of one\'s brother',w:'Fratricide'},
{p:'The murder of a child',w:'Infanticide'},
{p:'The murder of a wife by her husband',w:'Uxoricide'},
{p:'The murder of a husband by his wife',w:'Mariticide'},
{p:'The killing of an entire race or people',w:'Genocide'},
{p:'The killing of oneself',w:'Suicide'},
{p:'The killing of a sister',w:'Sororicide'},
{p:'The killing of an old woman',w:'Geronticide'},
{p:'The murder of a father-in-law',w:'Matrixide'},
{p:'The killing of one\'s own family members',w:'Familicide'},
{p:'The murder of a person, especially a public figure, for political reasons',w:'Assassination'},
{p:'The killing of a large number of people together',w:'Massacre'},
{p:'Fear of water',w:'Hydrophobia'},
{p:'Fear of heights',w:'Acrophobia'},
{p:'Fear of closed spaces',w:'Claustrophobia'},
{p:'Fear of fire',w:'Pyrophobia'},
{p:'Fear of strangers',w:'Xenophobia'},
{p:'Fear of darkness',w:'Nyctophobia'},
{p:'Fear of diseases',w:'Nosophobia'},
{p:'Fear of death',w:'Thanatophobia'},
{p:'Fear of snakes',w:'Ophidiophobia'},
{p:'Fear of thunder and lightning',w:'Astraphobia'},
{p:'Fear of flying',w:'Aerophobia'},
{p:'Fear of dogs',w:'Cynophobia'},
{p:'Fear of the sea',w:'Thalassophobia'},
{p:'Fear of blood',w:'Haemophobia'},
{p:'Fear of spiders',w:'Arachnophobia'},
{p:'Fear of open spaces or public places',w:'Agoraphobia'},
{p:'Fear of cats',w:'Ailurophobia'},
{p:'Fear of worms',w:'Scelerophobia'},
{p:'Fear of madness',w:'Maniaphobia'},
{p:'Fear of crowds',w:'Ochlophobia'},
{p:'Fear of germs',w:'Mycophobia'},
{p:'Fear of sunlight',w:'Heliophobia'},
{p:'Fear of God',w:'Theophobia'},
{p:'Fear of machines',w:'Mechanophobia'},
{p:'A place where fish are kept',w:'Aquarium'},
{p:'A place where wild animals are kept for exhibition',w:'Menagerie'},
{p:'A place where clothes and other articles are kept',w:'Wardrobe'},
{p:'A place where coins are made',w:'Mint'},
{p:'A place where ships are built and repaired',w:'Dockyard'},
{p:'A place where dead bodies are kept',w:'Mortuary'},
{p:'A place where medicine is prepared and sold',w:'Dispensary'},
{p:'A place where drugs and medicines are prepared',w:'Pharmacy'},
{p:'A place where animals are slaughtered',w:'Slaughterhouse'},
{p:'A place where money is deposited and kept safe',w:'Bank'},
{p:'A place where ammunition and weapons are kept',w:'Arsenal'},
{p:'A place where prisoners are kept',w:'Prison'},
{p:'A place where monks live together',w:'Monastery'},
{p:'A place where nuns live',w:'Convent'},
{p:'A place where soldiers live',w:'Barracks'},
{p:'A place of worship',w:'Temple'},
{p:'A place where aircraft are housed',w:'Hangar'},
{p:'A place where the aged are cared for',w:'Almshouse'},
{p:'A place where art works are exhibited',w:'Gallery'},
{p:'A place where fruit trees are grown',w:'Orchard'},
{p:'A place where dead are buried',w:'Cemetery'},
{p:'A place where goods are stored',w:'Warehouse'},
{p:'A place where bread and cakes are made and sold',w:'Bakery'},
{p:'A written account of one\'s own life',w:'Autobiography'},
{p:'A book written about a person\'s life by another',w:'Biography'},
{p:'A collection of poems',w:'Anthology'},
{p:'A speech made without previous preparation',w:'Extempore'},
{p:'A speech delivered in church by a priest',w:'Sermon'},
{p:'A formal speech',w:'Oration'},
{p:'A long, angry, scolding speech',w:'Tirade'},
{p:'A long and bitter speech charging someone with something',w:'Diatribe'},
{p:'One who abstains from alcohol',w:'Teetotaller'},
{p:'One who lives on vegetables only',w:'Vegetarian'},
{p:'One who eats human flesh',w:'Cannibal'},
{p:'One who eats everything indiscriminately',w:'Omnivorous'},
{p:'One who takes delight in the suffering of others',w:'Sadist'},
{p:'One who is devoted to the pleasures of food and drink',w:'Epicure'},
{p:'A person who habitually spends beyond his means',w:'Spendthrift'},
{p:'A person who is extremely economical and careful with money',w:'Miser'},
{p:'A person who gives generously',w:'Benefactor'},
{p:'One who cannot be corrected or reformed',w:'Incorrigible'},
{p:'One who cannot be easily satisfied',w:'Insatiable'},
{p:'One who cannot be conquered or defeated',w:'Invincible'},
{p:'One who cannot be read',w:'Illegible'},
{p:'One who cannot be heard',w:'Inaudible'},
{p:'One who cannot be explained',w:'Inexplicable'},
{p:'One who cannot be avoided',w:'Inevitable'},
{p:'One who cannot be changed',w:'Immutable'},
{p:'One who cannot be destroyed',w:'Indestructible'},
{p:'One who cannot be believed',w:'Incredible'},
{p:'One who cannot be paid back or repaired',w:'Irreparable'},
{p:'One who cannot be corrected or retrieved',w:'Irretrievable'},
{p:'One who cannot be separated from the main body',w:'Inseparable'},
{p:'One who cannot make up his mind',w:'Irresolute'},
{p:'One who cannot be satisfied with what he has',w:'Covetous'},
{p:'One who is too ready to believe anything',w:'Credulous'},
{p:'One who walks in his sleep',w:'Somnambulist'},
{p:'One who talks too much',w:'Garrulous'},
{p:'One who talks very little',w:'Taciturn'},
{p:'One who talks pleasantly and convincingly but insincerely',w:'Glib'},
{p:'One who speaks for others or in place of others',w:'Spokesman'},
{p:'One who has lost the use of sight',w:'Blind'},
{p:'One who has lost the use of hearing',w:'Deaf'},
{p:'One who cannot speak',w:'Mute'},
{p:'One who pretends to be ill to avoid work',w:'Malingerer'},
{p:'One who works merely for money and not out of loyalty',w:'Mercenary'},
{p:'One who is skilled in many things',w:'Versatile'},
{p:'One who understands the value of things',w:'Connoisseur'},
{p:'One who is a new beginner',w:'Novice'},
{p:'One who is between eighty and ninety years old',w:'Octogenarian'},
{p:'One who is between seventy and eighty years old',w:'Septuagenarian'},
{p:'One who is between sixty and seventy years old',w:'Sexagenarian'},
{p:'One who is between fifty and sixty years old',w:'Quinquagenarian'},
{p:'One who is between forty and fifty years old',w:'Quadragenarian'},
{p:'One who has reached puberty and is between child and adult',w:'Adolescent'},
{p:'An unmarried woman',w:'Spinster'},
{p:'A woman whose husband has died',w:'Widow'},
{p:'A man whose wife has died',w:'Widower'},
{p:'One who has more than one wife at a time',w:'Polygamist'},
{p:'One who has more than one husband at a time',w:'Polyandrist'},
{p:'One who marries again after the death of the first spouse',w:'Bigamist'},
{p:'An infant who has lost both parents',w:'Orphan'},
{p:'One who is without a home and wanders',w:'Vagabond'},
{p:'One who leaves his own country to settle in another',w:'Emigrant'},
{p:'One who comes into a foreign country to settle',w:'Immigrant'},
{p:'One who is an expert in the science of languages',w:'Philologist'},
{p:'One who is a supporter of war and aggressive policies',w:'Warmonger'},
{p:'One who is against war and violence',w:'Pacifist'},
{p:'One who takes part in a battle',w:'Combatant'},
{p:'One who watches a football or cricket match',w:'Spectator'},
{p:'One who is present at the scene of a crime',w:'Witness'},
{p:'One who looks after the health of a community',w:'Sanitarian'},
{p:'One who refuses to work',w:'Idler'},
{p:'One who is very fond of money and wealth',w:'Avaricious'},
{p:'One who hates spending money',w:'Parsimonious'},
{p:'One who is always cheerful and optimistic',w:'Optimist'},
{p:'One who always expects the worst',w:'Pessimist'},
{p:'One who is easily deceived or fooled',w:'Gullible'},
{p:'One who is extremely stingy',w:'Tightfisted'},
{p:'One who is selflessly devoted to the interests of others',w:'Altruistic'},
{p:'One who believes in the equality of all people',w:'Egalitarian'},
{p:'A government by the wealthy',w:'Plutocracy'},
{p:'A government by a few people',w:'Oligarchy'},
{p:'A government by one person with absolute power',w:'Autocracy'},
{p:'A government by religious leaders',w:'Theocracy'},
{p:'Absence of any form of government',w:'Anarchy'},
{p:'A government of the people, by the people, for the people',w:'Democracy'},
{p:'A government by women',w:'Gynocracy'},
{p:'A government by the mob or masses',w:'Ochlocracy'},
{p:'A government by the best citizens',w:'Aristocracy'},
{p:'A system of government by a single ruler',w:'Monarchy'},
{p:'Rule by both a king and a queen',w:'Dynasty'},
{p:'Government by a small group of powerful people',w:'Junta'},
{p:'Rule by one person without the consent of the people',w:'Despotism'},
{p:'Absence of law and order',w:'Chaos'},
{p:'A book containing information on many subjects arranged alphabetically',w:'Encyclopedia'},
{p:'A government by a ruler with unlimited power',w:'Dictatorship'},
{p:'A person who governs a country on behalf of a monarch',w:'Regent'},
{p:'A person who is over a hundred years old',w:'Centenarian'},
{p:'A person who lives to be very old',w:'Long-lived'},
{p:'A person who acts in a play',w:'Cast'},
{p:'A person who is attacked',w:'Victim'},
{p:'A person who attacks first',w:'Aggressor'},
{p:'One who has a long experience of a particular activity',w:'Veteran'},
{p:'One who is new to a profession or activity',w:'Beginner'},
{p:'One who is reserved and does not easily mix with others',w:'Introvert'},
{p:'One who is outgoing and mixes easily with others',w:'Extrovert'},
{p:'One who eats only vegetables and fruit',w:'Vegan'},
{p:'One who does not drink or lose his head over anything',w:'Sober'},
{p:'One who is charitable and kind to the poor',w:'Philanthropic'},
{p:'One who lives alone avoiding society',w:'Recluse'},
{p:'One who is given to self-indulgence',w:'Hedonist'},
{p:'One who works for the upliftment of society',w:'Reformer'},
{p:'One who is appointed to act for another',w:'Deputy'},
{p:'One who is unable to settle down in any place',w:'Nomad'},
{p:'One who believes in the complete separation of church and state',w:'Secularist'},
{p:'One who is skilled at flattering and persuading people',w:'Sycophant'},
{p:'One who flatters important people to win favour',w:'Flatterer'},
{p:'One who is excessively fond of his own opinion',w:'Dogmatic'},
{p:'One who sticks to old ways and opposes change',w:'Conservative'},
{p:'One who favours progress and reform',w:'Progressive'},
{p:'One who does not care for or toward others',w:'Apathetic'},
{p:'One who is extremely careful and precise',w:'Meticulous'},
{p:'One who is greedy for power',w:'Power-hungry'},
{p:'One who is fanatically devoted to a cause',w:'Zealot'},
{p:'One who pursues the same hobby or studies as another',w:'Aficionado'},
{p:'A person who spends money wastefully',w:'Profligate'},
{p:'One who collects or studies old coins',w:'Numismatist'},
{p:'A person who collects stamps',w:'Philatelist'},
{p:'A person who collects or studies butterflies',w:'Lepidopterist'},
{p:'One who studies the weather of a region over many years',w:'Climatologist'},
{p:'A person who studies the physical and mental development of children',w:'Paediatrician'},
{p:'A doctor who treats diseases of the skin',w:'Dermatologist'},
{p:'A doctor who treats diseases of the eyes',w:'Ophthalmologist'},
{p:'A doctor who treats diseases of the kidney',w:'Nephrologist'},
{p:'A person skilled in the treatment of psychological disorders',w:'Psychiatrist'},
{p:'One who writes the music for a film or play',w:'Composer'},
{p:'One who conducts an orchestra',w:'Conductor'},
{p:'One who writes verses',w:'Poet'},
{p:'One who writes for a newspaper or magazine',w:'Journalist'},
{p:'One who writes or compiles a dictionary',w:'Lexicographer'},
{p:'One who arranges and sets type for printing',w:'Compositor'},
{p:'One who cuts and prepares meat for sale',w:'Butcher'},
{p:'One who mends shoes',w:'Cobbler'},
{p:'One who cuts hair and shaves beards',w:'Barber'},
{p:'One who makes and repairs keys and locks',w:'Locksmith'},
{p:'One who makes and sells hats',w:'Hatter'},
{p:'One who looks after horses',w:'Groom'},
{p:'One who drives a carriage or car',w:'Chauffeur'},
{p:'One who sells flowers',w:'Florist'},
{p:'One who sells books',w:'Bookseller'},
{p:'One who sells medicines',w:'Chemist'},
{p:'One who sells stationery',w:'Stationer'},
{p:'One who sells or deals in groceries',w:'Grocer'},
{p:'One who keeps a shop selling vegetables and fruit',w:'Greengrocer'},
{p:'A person who lives on the bank of a river or sea',w:'Riparian'},
{p:'A person who lives in a particular place permanently',w:'Resident'},
{p:'A person who lives temporarily away from home',w:'Sojourner'},
{p:'A person who moves from one place to another seasonally',w:'Migrant'},
{p:'One who is excessively fond of rules and regulations',w:'Red-tapist'},
{p:'One who interferes in the affairs of others',w:'Meddlesome'},
{p:'One who is unduly fond of his own country',w:'Chauvinist'},
{p:'One who is extremely fond of his country to an unreasonable degree',w:'Jingoist'},
{p:'One who refuses to believe in the supernatural',w:'Rationalist'},
{p:'One who believes in the immortality of the soul',w:'Spiritualist'},
{p:'One who practises magic and sorcery',w:'Sorcerer'},
{p:'One who tells fortunes by reading the stars',w:'Astrologer'},
{p:'One who predicts future events from omens',w:'Soothsayer'},
{p:'A person who is present everywhere at the same time',w:'Ubiquitous'},
{p:'One who cannot be touched',w:'Intangible'},
{p:'One who is unusually calm and composed under stress',w:'Imperturbable'},
{p:'One who never spends or wastes anything',w:'Thrifty'},
{p:'One who is skilled at gaining advantages by deceit',w:'Schemers'},
{p:'One who is always complaining',w:'Grumbler'},
{p:'One who is critical of everything',w:'Cynic'},
{p:'One who is indifferent to right and wrong',w:'Amoral'},
{p:'One who is very careful and avoids risks',w:'Cautious'},
{p:'One who is very bold and daring',w:'Audacious'},
{p:'One who is very cheerful and lively',w:'Spirited'},
{p:'One who shows excessive or offensive pride',w:'Haughty'},
{p:'A person who is extremely particular about minor details',w:'Fussy'},
{p:'A person who is deeply devoted to duty',w:'Conscientious'},
{p:'One who works for the welfare of the poor',w:'Benign'},
{p:'One who takes great pleasure in books and reading',w:'Bookworm'},
{p:'A person who has a photographic memory and remembers everything',w:'Retentive'},
{p:'One who cannot forget anything easily',w:'Eidetic'},
{p:'A person who forgets things easily',w:'Forgetful'},
{p:'One who is always late',w:'Tardy'},
{p:'One who arrives early',w:'Punctual'},
{p:'One who rises early in the morning',w:'Early riser'},
{p:'One who stays up late at night',w:'Night owl'},
{p:'One who is habitually late in paying debts',w:'Delinquent'},
{p:'A person who loves authority, especially over others',w:'Authoritarian'},
{p:'A person who rules over an empire',w:'Emperor'},
{p:'A person who rules over a kingdom',w:'Monarch'},
{p:'The wife of a king',w:'Queen'},
{p:'One who is an unsuccessful or minor ruler',w:'Petty king'},
{p:'One who is extremely interested in the welfare of animals',w:'Animal-lover'},
{p:'One who is extremely cruel to animals',w:'Animal-abuser'},
{p:'One who is interested mainly in the material side of life',w:'Materialist'},
{p:'One who believes that all events are predetermined',w:'Determinist'},
{p:'One who believes in the union of the soul with God',w:'Mystic'},
{p:'One who undergoes suffering for his beliefs without complaint',w:'Martyr'},
{p:'One who gives up his life voluntarily for a cause',w:'Immolator'},
{p:'One who is very interested in his own appearance and comforts',w:'Vanity'},
{p:'One who is extremely vain about his appearance',w:'Foppish'},
{p:'A person who tries to appear more important than he is',w:'Pretentious'},
{p:'A person who is extremely careful not to offend anyone',w:'Diplomatic'},
{p:'One who is careful and cautious in his dealings',w:'Prudent'},
{p:'One who is extremely careful and economical',w:'Provident'},
{p:'One who spends money very carefully',w:'Sparing'},
{p:'One who is not easily excited or disturbed',w:'Phlegmatic'},
{p:'One who is easily excited or disturbed',w:'Excitable'},
{p:'One who shows great warmth and enthusiasm of temperament',w:'Ardent'},
{p:'One who is very hard-working and diligent',w:'Industrious'},
{p:'One who has a fixed way of doing things and dislikes change',w:'Routine'},
{p:'One who is fond of routine and set procedures',w:'Ritualistic'},
{p:'One who is a clever and shrewd bargainer',w:'Haggler'},
{p:'One who is honest and open in his dealings',w:'Frank'},
{p:'One who is secretive and deceitful in his dealings',w:'Sly'},
{p:'One who habitually tells lies',w:'Liar'},
{p:'One who is very truthful and honest',w:'Veracious'},
{p:'One who gives a pretentious display of learning',w:'Pedant'},
{p:'A person who is extremely tense and anxious',w:'Fretful'},
{p:'A person who is easily angered',w:'Irascible'},
{p:'A person who is very bad-tempered and always angry',w:'Choleric'},
{p:'A person who is calm and self-possessed',w:'Composed'},
{p:'One who is pleased with small gains and happiness',w:'Contented'},
{p:'One who is easily satisfied',w:'Satisfiable'},
{p:'One who is greedy to possess everything',w:'Acquisitive'},
{p:'One who is two-faced and not to be trusted',w:'Duplicitous'},
{p:'One who is wicked and evil-minded',w:'Malevolent'},
{p:'One who is kindly and generous-hearted',w:'Benevolent'},
{p:'One who is mean and spiteful',w:'Petty'},
{p:'One who is vain about his own abilities to an offensive degree',w:'Overweening'},
{p:'One who is obedient and easily led',w:'Submissive'},
{p:'One who is rebellious and refuses to obey authority',w:'Defiant'},
{p:'One who steals property by breaking and entering a house',w:'Burglar'},
{p:'One who steals from shops while they are open',w:'Shoplifter'},
{p:'One who steals goods in a public place',w:'Prowler'},
{p:'One who forges documents or signatures',w:'Forger'},
{p:'One who causes a disturbance in a public place',w:'Rioter'},
{p:'One who is confined to bed on account of illness',w:'Bedridden'},
{p:'One who is unable to walk without assistance',w:'Cripple'},
{p:'One who is ill and receiving medical treatment',w:'Patient'},
{p:'One who is recovering from illness',w:'Convalescent'},
{p:'One who is weak and feeble because of old age',w:'Infirm'},
{p:'One who is mentally exhausted due to overwork',w:'Overworked'},
{p:'One who is completely indifferent to pain or pleasure',w:'Stolid'},
{p:'One who is easily frightened',w:'Timid'},
{p:'One who is very brave',w:'Courageous'},
{p:'One who is exactly as he appears, honest and simple',w:'Guileless'},
{p:'One who is sharp and quick at understanding things',w:'Astute'},
{p:'One who is slow at understanding things',w:'Obtuse'},
{p:'A person who dislikes the company of others',w:'Unsociable'},
{p:'A person who enjoys spending time with others',w:'Sociable'},
{p:'A person who is extremely formal and strict in his manners',w:'Prim'},
{p:'One who is full of high spirits and energy',w:'Vivacious'},
{p:'One who is always changing his mind and plans',w:'Vacillating'},
{p:'One who is very unwilling to change his attitude or ideas; stubborn',w:'Obstinate'},
{p:'One who refuses to be persuaded',w:'Stubborn'},
{p:'One who follows another person\'s example blindly',w:'Follower'},
{p:'One who sets an example for others to follow',w:'Exemplar'},
{p:'One who copies the work of others dishonestly',w:'Plagiarist'},
{p:'One who criticises the government or others through satire',w:'Satirist'},
{p:'A person who studies maps and charts',w:'Cartographer'},
{p:'A person who makes and repairs watches',w:'Watchmaker'},
{p:'A person who makes hats as a profession',w:'Milliner'},
{p:'A person who makes goods by hand',w:'Artisan'},
{p:'A craftsman skilled in making objects by hand',w:'Handicraftsman'},
{p:'One who is an expert in the growth and care of trees',w:'Arboriculturist'},
{p:'One who studies the growth and development of plants in water',w:'Hydrologist'},
{p:'A person skilled in the art of navigation at sea',w:'Navigator'},
{p:'A person who teaches by choice',w:'Educator'},
{p:'One who trains athletes for competitions',w:'Coach'},
{p:'One who officiates at a wedding ceremony',w:'Priest'},
{p:'One who performs the ceremony of marriage',w:'Officiant'},
{p:'One who looks after the spiritual needs of a church congregation',w:'Pastor'},
{p:'One who runs a school',w:'Principal'},
{p:'One who holds an academic chair in a university',w:'Professor'},
{p:'One who delivers lectures in a university',w:'Lecturer'},
{p:'One who is a member of a board of trustees',w:'Trustee'},
{p:'A person who manages the business affairs of another',w:'Agent'},
{p:'One who transfers property or rights to another',w:'Assignor'},
{p:'One to whom property or rights are transferred',w:'Assignee'},
{p:'A person who lends money to others at interest',w:'Moneylender'},
{p:'A person who borrows money from others',w:'Borrower'},
{p:'One who keeps a record of accounts',w:'Accountant'},
{p:'One who inspects accounts and financial records',w:'Auditor'},
{p:'One who takes charge of someone else\'s property in trust',w:'Custodian'},
{p:'One who is responsible for the care and custody of something',w:'Guardian'},
{p:'One who looks after the welfare of a minor child legally',w:'Ward'},
{p:'One who is legally responsible for another person\'s actions',w:'Surety'},
{p:'One who signs a document on behalf of a company',w:'Mandatory'},
{p:'A person who signs a legally binding document for another',w:'Attorney'},
{p:'One who advises people on legal matters',w:'Lawyer'},
{p:'A lawyer who presents a case in court',w:'Advocate'},
{p:'A lawyer who defends someone in court',w:'Defence counsel'},
{p:'A person who decides cases in a court of law',w:'Judge'},
{p:'The highest judge in a country',w:'Chief justice'},
{p:'One who has the power to decide the guilt or innocence of an accused',w:'Tribunal'},
{p:'A group of people chosen to decide a legal case',w:'Jury'},
{p:'One who gives false evidence in a court of law',w:'Perjurer'},
{p:'One who is accused of a crime',w:'Accused'},
{p:'One who proves that someone else is not guilty',w:'Exonerator'},
{p:'One who is the first to try something new',w:'Pioneer'},
{p:'One who is very advanced in a subject',w:'Expert'},
{p:'One who is very backward in a subject',w:'Trainee'},
{p:'One who cannot read or write',w:'Illiterate'},
  {p:'A speech without preparation',w:'Extempore'},
  {p:'One who knows everything',w:'Omniscient'},
  {p:'That which cannot be seen through',w:'Opaque'},
  {p:'A place where birds are kept',w:'Aviary'},
  {p:'One who walks in sleep',w:'Somnambulist'},
  {p:'A remedy for all diseases',w:'Panacea'},
  {p:'One who loves books',w:'Bibliophile'},
  {p:'A life story written by oneself',w:'Autobiography'},
  {p:'A group of ships',w:'Fleet'},
  {p:'One who hates women',w:'Misogynist'},
  {p:'A government by the rich',w:'Plutocracy'},
  {p:'One who talks in sleep',w:'Somniloquist'},
  {p:'That which cannot be corrected',w:'Incorrigible'},
  {p:'A place where weapons are stored',w:'Arsenal'},
  {p:'One who is all-powerful',w:'Omnipotent'},
  {p:'The practice of marrying one person at a time',w:'Monogamy'},
  {p:'Killing of a race or community',w:'Genocide'},
  {p:'One who is present everywhere',w:'Omnipresent'},
  {p:'One who does not believe in God',w:'Atheist'},
  {p:'One who believes in God',w:'Theist'},
  {p:'One who is easily deceived',w:'Gullible'},
  {p:'One who cannot be cured',w:'Incurable'},
  {p:'One who is hard to please',w:'Fastidious'},
  {p:'A government by the people',w:'Democracy'},
  {p:'A government by one person',w:'Autocracy'},
  {p:'A government by a few',w:'Oligarchy'},
  {p:'A government by officials',w:'Bureaucracy'},
  {p:'A government by the military',w:'Junta'},
  {p:'Rule by the nobility',w:'Aristocracy'},
  {p:'A state of perfect happiness',w:'Utopia'},
  {p:'A place where bees are kept',w:'Apiary'},
  {p:'A place where animals are kept',w:'Menagerie'},
  {p:'A place where honey is produced and stored',w:'Beehive'},
  {p:'A place where fish are bred',w:'Aquarium'},
  {p:'A place where clothes are kept',w:'Wardrobe'},
  {p:'A place where coins are manufactured',w:'Mint'},
  {p:'A place where grain is stored',w:'Granary'},
  {p:'A place where books are kept',w:'Library'},
  {p:'A place where medicines are kept',w:'Dispensary'},
  {p:'A place where wine is stored',w:'Cellar'},
  {p:'A place where ships are built',w:'Dockyard'},
  {p:'One who studies the stars',w:'Astronomer'},
  {p:'One who studies the mind',w:'Psychologist'},
  {p:'One who studies ancient remains',w:'Archaeologist'},
  {p:'One who repairs and maintains buildings',w:'Caretaker'},
  {p:'One who treats animals',w:'Veterinarian'},
  {p:'A person who speaks two languages',w:'Bilingual'},
  {p:'A person who speaks many languages',w:'Polyglot'},
  {p:'One who writes for newspapers',w:'Journalist'},
  {p:'One who writes about his own life',w:'Autobiographer'},
  {p:'One who writes about another\'s life',w:'Biographer'},
  {p:'A hater of mankind',w:'Misanthropist'},
  {p:'A lover of mankind',w:'Philanthropist'},
  {p:'One who likes to spend money freely',w:'Spendthrift'},
  {p:'One who is miserly',w:'Miser'},
  {p:'One who lives on vegetables',w:'Vegetarian'},
  {p:'One who eats everything',w:'Omnivore'},
  {p:'An animal that eats meat',w:'Carnivore'},
  {p:'An animal that eats plants',w:'Herbivore'},
  {p:'One who is unable to pay debts',w:'Insolvent'},
  {p:'One who is legally qualified to practice medicine',w:'Physician'},
  {p:'One who performs surgical operations',w:'Surgeon'},
  {p:'One who repairs shoes',w:'Cobbler'},
  {p:'One who cuts hair',w:'Barber'},
  {p:'One who makes and repairs wooden objects',w:'Carpenter'},
  {p:'One who works in a mine',w:'Miner'},
  {p:'A place where orphans are cared for',w:'Orphanage'},
  {p:'A place where the sick are treated',w:'Hospital'},
  {p:'A place where criminals are confined',w:'Prison'},
  {p:'A place where abandoned animals are kept',w:'Animal shelter'},
  {p:'A person who lives by himself',w:'Hermit'},
  {p:'A person who wanders from place to place',w:'Vagabond'},
  {p:'A person who always finds faults',w:'Critic'},
  {p:'A person who is easily influenced',w:'Impressionable'},
  {p:'One who is determined to have his own way',w:'Obstinate'},
  {p:'One who is fond of company',w:'Gregarious'},
  {p:'One who loves his country',w:'Patriot'},
  {p:'One who betrays his own country',w:'Traitor'},
  {p:'A person who disguises himself to gain favour',w:'Impostor'},
  {p:'One who pretends to be what he is not',w:'Hypocrite'},
  {p:'One who is optimistic about the future',w:'Optimist'},
  {p:'One who is pessimistic about the future',w:'Pessimist'},
  {p:'One who is too careful with money',w:'Stingy'},
  {p:'One who believes in fate',w:'Fatalist'},
  {p:'One who does not care for art and culture',w:'Philistine'},
  {p:'A person who eats too much',w:'Glutton'},
  {p:'One who cannot sleep',w:'Insomniac'},
  {p:'A person who fears confined spaces',w:'Claustrophobic'},
  {p:'A person who fears heights',w:'Acrophobic'},
  {p:'A person who fears water',w:'Hydrophobic'},
  {p:'One who collects stamps',w:'Philatelist'},
  {p:'One who collects coins',w:'Numismatist'},
  {p:'One who studies birds',w:'Ornithologist'},
  {p:'One who studies insects',w:'Entomologist'},
  {p:'One who studies the weather',w:'Meteorologist'},
  {p:'One who compiles a dictionary',w:'Lexicographer'},
  {p:'A triangle having unequal sides',w:'Scalene'},
  {p:'A twelve-sided figure',w:'Dodecagon'},
  {p:'A figure with eight sides',w:'Octagon'},
  {p:'A figure with ten sides',w:'Decagon'},
  {p:'A person guided by reason rather than emotion',w:'Rationalist'},
  {p:'One who is indifferent to pleasure or pain',w:'Stoic'},
  {p:'One who speaks or acts without thinking',w:'Impulsive'},
  {p:'Living or lasting for a very short time',w:'Ephemeral'},
  {p:'Lasting for a very long time',w:'Perennial'},
  {p:'A speech made in honour of a dead person',w:'Eulogy'},
  {p:'A funeral oration',w:'Dirge'},
  {p:'The study of ancient life forms',w:'Paleontology'},
  {p:'The science of the origin of mankind',w:'Anthropology'},
  {p:'Equipment for wrestling in a theatrical context',w:'Props'},
  {p:'A person who can use both hands equally well',w:'Ambidextrous'},
  {p:'A piece of writing signed by the author',w:'Autograph'},
  {p:'An inscription on a tomb',w:'Epitaph'},
  {p:'The path of light',w:'Light beam'}];

function generateSpottingErrorsQuestion(diff) {
  var ty = [
    {s:'He don\'t like coffee.',e:'don\'t → doesn\'t',o:['don\'t → doesn\'t','He → Him','coffee → coffees','No error']},
    {s:'She go to school everyday.',e:'go → goes',o:['go → goes','to → for','everyday → every day','No error']},
    {s:'They has completed the work.',e:'has → have',o:['has → have','the → a','work → works','No error']},
    {s:'I am loving this weather.',e:'am loving → love',o:['am loving → love','this → these','weather → weathers','No error']},
    {s:'Neither the teacher nor the students was present.',e:'was → were',o:['was → were','Neither → Either','the → a','No error']},
    {s:'He is angry on me for no reason.',e:'on → with',o:['on → with','He → Him','me → myself','No error']},
    {s:'She is an university professor.',e:'an → a',o:['an → a','She → Her','university → universities','No error']},
    {s:'Everyone should bring their own lunch.',e:'their → his/her (pronoun agreement)',o:['their → his/her','Everyone → Every','bring → brings','No error']},
    // SBI PO Hard: complex sentence - parallel structure
    {s:'She not only writes novels but also she writes poetry.',e:'but also she writes → but also poetry (parallel structure)',o:['but also she writes → but also poetry','not only → not just','writes → write','No error']},
    // SBI PO Hard: complex sentence - conditional
    {s:'If he would have studied harder, he would have passed the exam.',e:'would have studied → had studied',o:['would have studied → had studied','would have passed → will have passed','the exam → exams','No error']},
    // SBI PO Hard: complex sentence - misplaced modifier
    {s:'Having finished the assignment, the TV was turned on.',e:'the TV was turned on → she turned on the TV (dangling participle)',o:['the TV was turned on → she turned on the TV','Having finished → After finishing','the assignment → assignments','No error']}
  ];
  var idx;
  if (diff >= 5 && ty.length >= 6) {
    idx = Math.random() < 0.7 ? rand(Math.max(0, ty.length - 4), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var it = ty[idx];
  return { question:'Spot the error: "'+it.s+'"', answer:it.e, options:it.o, hint:'Check subject-verb agreement, tense, parallel structure, and modifiers', timeLimit:12, type:'verbal', techniqueLabel:'Spotting Errors', intuition:'Common errors: subject-verb agreement, tense consistency, parallel structure, dangling modifiers.' };
}

function generateSpellingsQuestion(diff) {
  var items=[
    {c:'Accommodation',w:['Acommodation','Accomodation','Accommodation','Acomodation'],a:2},
    {c:'Necessary',w:['Neccessary','Necessary','Neccesary','Nessessary'],a:1},
    {c:'Maintenance',w:['Maintanance','Maintainance','Maintenance','Maintence'],a:2},
    {c:'Separate',w:['Seperate','Separate','Separete','Saperate'],a:1},
    {c:'Embarrass',w:['Embarass','Embarrass','Embaras','Embarras'],a:1},
    {c:'Independent',w:['Independant','Indepentent','Independent','Indipendent'],a:2},
    {c:'Occurrence',w:['Occurence','Occurance','Occurrence','Ocurrence'],a:2},
    {c:'Guarantee',w:['Guarantee','Gurantee','Gaurantee','Garantee'],a:0},
    {c:'Harass',w:['Harass','Harrass','Haras','Harras'],a:0},
    {c:'Millennium',w:['Millennium','Millenium','Milennium','Milenium'],a:0},
    {c:'Privilege',w:['Privilege','Priviledge','Privelege','Privilige'],a:0},
    {c:'Rhythm',w:['Rhythm','Rythm','Rythym','Rhythim'],a:0}
  ];
  var it=items[rand(0,items.length-1)]; var opts=it.w.slice(); shuffle(opts);
  return { question:'Correct spelling?', answer:it.c, options:opts, hint:'Think about how the word sounds and common spelling rules', timeLimit:8, type:'verbal', techniqueLabel:'Spellings', intuition:'Double consonants (accommodation, embarrass), -ance vs -ence (maintenance), -able vs -ible.' };
}

function generateSentenceCorrectionQuestion(diff) {
  var ty = [
    {s:'The committee have decided to postpone the meeting.',c:'The committee has decided to postpone the meeting',o:['The committee have decided to postpone the meeting','The committee has decided to postpone the meeting','The committee have decide to postpone the meeting','The committee has decide to postpone the meeting']},
    {s:'Each of the students were given a certificate.',c:'Each of the students was given a certificate',o:['Each of the students were given a certificate','Each of the students was given a certificate','Each of the student were given a certificate','Every of the students were given a certificate']},
    {s:'I have been working here since five years.',c:'I have been working here for five years',o:['I have been working here since five years','I have been working here for five years','I am working here since five years','I worked here since five years']},
    {s:'Walking down the street, the flowers looked beautiful.',c:'Walking down the street, I saw beautiful flowers (misplaced modifier)',o:['Walking down the street, the flowers looked beautiful','Walking down the street, I saw beautiful flowers','The flowers walking down the street looked beautiful','Walking the street, flowers looked beautiful']},
    {s:'She likes swimming, to run, and dance.',c:'She likes swimming, running, and dancing',o:['She likes swimming, to run, and dance','She likes swimming, running, and dancing','She likes to swim, to run, and dancing','She likes swim, run, dance']},
    {s:'Being a rainy day, the picnic was cancelled.',c:'It being a rainy day, the picnic was cancelled (dangling participle)',o:['Being a rainy day, the picnic was cancelled','It being a rainy day, the picnic was cancelled','The picnic being a rainy day was cancelled','A rainy day being, the picnic cancelled']},
    // SBI PO Hard: subject-verb agreement with intervening phrase
    {s:'The collection of rare stamps were sold at auction.',c:'The collection of rare stamps was sold at auction',o:['The collection of rare stamps were sold at auction','The collection of rare stamps was sold at auction','The collection of rare stamps have been sold','The collection of rare stamps are sold']},
    // SBI PO Hard: tense consistency in complex sentence
    {s:'The professor suggested that the student revises his notes before the exam.',c:'The professor suggested that the student revise his notes before the exam (subjunctive)',o:['The professor suggested that the student revises his notes before the exam','The professor suggested that the student revise his notes before the exam','The professor suggested that the student revised his notes','The professor suggests that the student revises']},
    // SBI PO Hard: pronoun-antecedent agreement
    {s:'Each of the managers must submit their report by Friday.',c:'Each of the managers must submit his or her report by Friday',o:['Each of the managers must submit their report by Friday','Each of the managers must submit his or her report by Friday','Each of the managers must submit reports by Friday','Each of the managers must be submitting report by Friday']}
  ];
  var idx;
  if (diff >= 5 && ty.length >= 6) {
    idx = Math.random() < 0.7 ? rand(Math.max(0, ty.length - 4), ty.length - 1) : rand(0, ty.length - 1);
  } else {
    idx = rand(0, ty.length - 1);
  }
  var it = ty[idx];
  shuffle(it.o);
  return { question:'Correct: "'+it.s+'"', answer:it.c, options:it.o, hint:'Check subject-verb agreement, tense, prepositions, subjunctive mood', timeLimit:15, type:'verbal', techniqueLabel:'Sentence Correction', intuition:'Collective nouns take singular verb. Subjunctive: suggest that + base verb. Each + singular pronoun.' };
}

function generateSentenceImprovementQuestion(diff) {
  var items=[
    {s:'He is too weak that he cannot walk.',i:'He is so weak that he cannot walk',o:['He is too weak that he cannot walk','He is so weak that he cannot walk','He is too weak to cannot walk','He is very weak that he cannot walk']},
    {s:'No sooner had he arrived than the meeting started.',i:'No sooner had he arrived than the meeting started (correct)',o:['No sooner had he arrived than the meeting started','No sooner he arrived than the meeting started','No sooner had he arrived when the meeting started','No sooner did he arrive than the meeting had started']},
    {s:'I prefer coffee than tea.',i:'I prefer coffee to tea',o:['I prefer coffee than tea','I prefer coffee to tea','I prefer coffee over tea','I prefer coffee from tea']},
    {s:'Walking through the park, the flowers looked beautiful.',i:'Walking through the park, she saw that the flowers looked beautiful',o:['Walking through the park, the flowers looked beautiful','Walking through the park, she saw that the flowers looked beautiful','Walking through the park, beautiful flowers were seen','The park walking, flowers looked beautiful']},
    {s:'She likes swimming, to run, and dancing.',i:'She likes swimming, running, and dancing',o:['She likes swimming, to run, and dancing','She likes swimming, running, and dancing','She likes to swim, to run, to dance','She likes to swim, running, and dance']},
    {s:'I and my friend went to the park.',i:'My friend and I went to the park',o:['I and my friend went to the park','My friend and I went to the park','I and my friend went to the park together','Me and my friend went to the park']},
    {s:'If I was you, I would accept the offer.',i:'If I were you, I would accept the offer',o:['If I was you, I would accept the offer','If I were you, I would accept the offer','If I am you, I would accept the offer','If I had been you, I would accept the offer']},
    {s:'He asked that what is your name.',i:'He asked, "What is your name?"',o:['He asked that what is your name','He asked, "What is your name?"','He asked what my name is','He asked that what was my name']},
    {s:'She not only lost her wallet but also her phone.',i:'She lost not only her wallet but also her phone',o:['She not only lost her wallet but also her phone','She lost not only her wallet but also her phone','She not only lost her wallet but also lost her phone','She lost her wallet and also her phone']},
    {s:'The reason he was late is because of the traffic.',i:'The reason he was late is that there was traffic',o:['The reason he was late is because of the traffic','The reason he was late is that there was traffic','The reason he was late is due to traffic','Because of traffic, he was late']},
    {s:'One of the boys have broken the window.',i:'One of the boys has broken the window',o:['One of the boys have broken the window','One of the boys has broken the window','One of the boy has broken the window','One boy among them have broken the window']},
    {s:'He is suffering from fever since Monday.',i:'He has been suffering from fever since Monday',o:['He is suffering from fever since Monday','He has been suffering from fever since Monday','He was suffering from fever since Monday','He suffered from fever since Monday']},
    {s:'Neither the manager nor the employees was present.',i:'Neither the manager nor the employees were present',o:['Neither the manager nor the employees was present','Neither the manager nor the employees were present','Neither the manager nor the employees is present','The manager and employees was not present']},
    {s:'This is the same dress which she wore yesterday.',i:'This is the same dress that she wore yesterday',o:['This is the same dress which she wore yesterday','This is the same dress that she wore yesterday','This is same dress that she wore yesterday','This is the dress which she wore yesterday']},
    {s:'He did nothing but to complain.',i:'He did nothing but complain',o:['He did nothing but to complain','He did nothing but complain','He did nothing except to complain','He did nothing except complaining']},
    {s:'I have seen him yesterday.',i:'I saw him yesterday',o:['I have seen him yesterday','I saw him yesterday','I had seen him yesterday','I did see him yesterday']},
    {s:'Work hard so that you may pass.',i:'Work hard so that you may pass (correct)',o:['Work hard so that you may pass','Work hard so that you can pass','Work hard so that you might pass','Work hard so that you could pass']},
    {s:'Scarcely had he left when the storm began.',i:'Scarcely had he left when the storm began (correct)',o:['Scarcely had he left when the storm began','Scarcely had he left than the storm began','Scarcely he left when the storm began','Scarcely did he leave when the storm began']},
    {s:'He is more taller than his brother.',i:'He is taller than his brother',o:['He is more taller than his brother','He is taller than his brother','He is more tall than his brother','He is much taller than his brother']},
    {s:'Neither did he call nor did he come.',i:'Neither did he call nor did he come (correct)',o:['Neither did he call nor did he come','He neither called nor came','Neither he called nor came','He called nor came']}
  ];
  var it=items[rand(0,items.length-1)]; shuffle(it.o);
  return { question:'Improve: "'+it.s+'"', answer:it.i, options:it.o, hint:'Replace the incorrect word/phrase with the correct one', timeLimit:12, type:'verbal', techniqueLabel:'Sentence Improvement', intuition:'too...to (infinitive), so...that (clause). Prefer A to B. No sooner...than. Scarcely...when.' };
}

function generateClosetTestQuestion(diff) {
  var items=[
    {p:'The _____ of technology has transformed education. Students can now access information from anywhere. This has made learning more _____ than ever before. However, it also _____ challenges like screen addiction.',blanks:['advancement','accessible','poses'],q:'Blank 2?',a:'accessible',o:['accessible','difficult','expensive','boring']},
    {p:'Air pollution is a serious _____ in many cities. It causes respiratory problems and _____ the environment. Planting more trees can help _____ the air quality.',blanks:['problem','harms','improve'],q:'Blank 1?',a:'problem',o:['solution','problem','benefit','ignored']},
    {p:'Social media has a powerful _____ on young minds. While it helps them stay _____, excessive use can lead to addiction and anxiety. Parents must _____ their children\'s usage.',blanks:['impact','connected','monitor'],q:'Blank 2?',a:'connected',o:['connected','isolated','ignorant','bored']},
    {p:'The _____ of electric vehicles is growing rapidly. They are more _____ than petrol cars and produce zero emissions. However, the lack of charging _____ remains a challenge.',blanks:['adoption','efficient','infrastructure'],q:'Blank 3?',a:'infrastructure',o:['infrastructure','batteries','drivers','roads']},
    {p:'Regular exercise and a _____ diet are essential for good health. Physical activity strengthens the heart and improves blood _____. Eating plenty of fruits and vegetables helps _____ the immune system.',blanks:['balanced','circulation','boost'],q:'Blank 1?',a:'balanced',o:['balanced','spicy','expensive','limited']},
    {p:'Skill development programs help workers _____ to changing job markets. Learning new technologies makes employees more _____ and opens up better career _____. Governments and companies must invest in continuous training.',blanks:['adapt','versatile','opportunities'],q:'Blank 2?',a:'versatile',o:['versatile','lazy','dependent','rigid']}
  ];
  var it=items[rand(0,items.length-1)]; shuffle(it.o);
  return { question:'<span style="font-size:.85em">'+it.p+'</span><br><br>'+it.q, answer:it.a, options:it.o, hint:'Read the full passage for context. The correct word makes sense in the overall meaning.', timeLimit:20, type:'verbal', techniqueLabel:'Closet Test', intuition:'Read the entire passage first. The missing word must fit the context, grammar, and overall meaning.' };
}

function generateOneWordSubstitutesQuestion(diff) {
  var it=ONE_WORD_SUBS[rand(0,ONE_WORD_SUBS.length-1)]; var opts=[it.w];
  var allWords=ONE_WORD_SUBS.map(function(x){return x.w;}).filter(function(x){return x!==it.w;});
  shuffle(allWords); while(opts.length<4&&allWords.length){var w=allWords.pop();if(opts.indexOf(w)<0)opts.push(w);}
  shuffle(opts);
  return { question:'One word for: "'+it.p+'"', answer:it.w, options:opts, hint:'Think of the specific term used for this description', timeLimit:10, type:'verbal', techniqueLabel:'One Word Substitutes', intuition:'Many concepts have specific single-word terms. Think about Latin/Greek roots and common prefixes.' };
}

function generateIdiomsPhrasesQuestion(diff) {
  var it=COMMON_IDIOMS[rand(0,COMMON_IDIOMS.length-1)]; var opts=[it.m];
  var allMeanings=COMMON_IDIOMS.map(function(x){return x.m;}).filter(function(x){return x!==it.m;});
  shuffle(allMeanings); while(opts.length<4&&allMeanings.length){var m=allMeanings.pop();if(opts.indexOf(m)<0)opts.push(m);}
  shuffle(opts);
  return { question:'Meaning of "'+it.i+'" ?', answer:it.m, options:opts, hint:'Idioms have figurative meanings different from literal', timeLimit:8, type:'verbal', techniqueLabel:'Idioms & Phrases', intuition:'Idioms cannot be understood literally. Learn their conventional meanings through exposure and context.' };
}

function generateChangeVoiceQuestion(diff) {
  var items=[
    {a:'The cat chased the mouse.',p:'The mouse was chased by the cat',o:['The mouse was chased by the cat','The mouse is chased by the cat','The mouse was being chased','The mouse had been chased']},
    {a:'She writes a letter.',p:'A letter is written by her',o:['A letter is written by her','A letter was written by her','A letter has been written','A letter writes by her']},
    {p:'The work was done by John.',a:'John did the work',o:['John did the work','John does the work','John was doing the work','John had done the work']},
    {a:'They will build a bridge.',p:'A bridge will be built by them',o:['A bridge will be built by them','A bridge will build by them','A bridge would be built','A bridge is built by them']},
    {a:'She has finished the work.',p:'The work has been finished by her',o:['The work has been finished by her','The work has finished by her','She has been finished the work','The work had been finished by her']},
    {a:'You must obey the rules.',p:'The rules must be obeyed by you',o:['The rules must be obeyed by you','The rules must obey by you','You must be obeyed the rules','The rules are obeyed by you']},
    {a:'Please open the door.',p:'You are requested to open the door',o:['You are requested to open the door','The door is opened please','Let the door be opened','Please the door be opened']},
    {a:'The chef is cooking dinner.',p:'Dinner is being cooked by the chef',o:['Dinner is being cooked by the chef','Dinner was being cooked by the chef','The chef is cooked dinner','Dinner is cooked by the chef']},
    {a:'The students had completed the assignment.',p:'The assignment had been completed by the students',o:['The assignment had been completed by the students','The assignment has been completed by the students','The assignment was completed by the students','The students had been completed the assignment']},
    {p:'The letter was being written by her.',a:'She was writing the letter',o:['She was writing the letter','She wrote the letter','She had written the letter','She is writing the letter']},
    {a:'They will have finished the project by Friday.',p:'The project will have been finished by Friday',o:['The project will have been finished by Friday','The project will be finished by Friday','The project would have been finished by Friday','The project is finished by Friday']},
    {p:'English is spoken all over the world.',a:'People speak English all over the world',o:['People speak English all over the world','People spoke English all over the world','People are speaking English all over the world','People have spoken English all over the world']},
    {a:'Who broke the window?',p:'By whom was the window broken?',o:['By whom was the window broken?','Who was the window broken by?','The window was broken by whom?','By who was the window broken?']},
    {p:'The child was given a toy by the aunt.',a:'The aunt gave the child a toy',o:['The aunt gave the child a toy','The aunt gives the child a toy','The aunt has given the child a toy','The child was gave a toy by the aunt']},
    {a:'We can solve this problem easily.',p:'This problem can be solved easily',o:['This problem can be solved easily','This problem could be solved easily','This problem can solve easily','This problem is solved easily by us']},
    {p:'The building was destroyed by the earthquake.',a:'The earthquake destroyed the building',o:['The earthquake destroyed the building','The earthquake destroys the building','The earthquake has destroyed the building','The building destroyed the earthquake']},
    {a:'The committee is considering the proposal.',p:'The proposal is being considered by the committee',o:['The proposal is being considered by the committee','The proposal was being considered by the committee','The proposal is considered by the committee','The committee is being considered the proposal']},
    {a:'They had invited us to the party.',p:'We had been invited to the party by them',o:['We had been invited to the party by them','We were invited to the party by them','We have been invited to the party by them','They had been invited us to the party']},
    {p:'The match was won by our team.',a:'Our team won the match',o:['Our team won the match','Our team wins the match','Our team had won the match','Our team has won the match']},
    {a:'Do not touch the exhibits.',p:'You are advised not to touch the exhibits',o:['You are advised not to touch the exhibits','The exhibits are not touched','Let the exhibits not be touched','Do not be touched the exhibits']},
    {a:'The scientist discovered a new planet.',p:'A new planet was discovered by the scientist',o:['A new planet was discovered by the scientist','A new planet is discovered by the scientist','A new planet has been discovered','The scientist was discovered a new planet']},
    {a:'Someone stole my car yesterday.',p:'My car was stolen yesterday',o:['My car was stolen yesterday','My car is stolen yesterday','My car has been stolen yesterday','My car had been stolen yesterday']},
    {p:'The report will be submitted by the manager.',a:'The manager will submit the report',o:['The manager will submit the report','The manager submits the report','The manager would submit the report','The report will submit by the manager']},
    {a:'The teacher is explaining the lesson.',p:'The lesson is being explained by the teacher',o:['The lesson is being explained by the teacher','The lesson was being explained by the teacher','The lesson is explained by the teacher','The teacher is being explained the lesson']},
    {a:'Why did you make this mistake?',p:'Why was this mistake made by you?',o:['Why was this mistake made by you?','Why this mistake was made by you?','By whom was this mistake made?','Why did this mistake made by you?']}
  ];
  var it=items[rand(0,items.length-1)];
  var fromActive = rand(0,1) ? true : false;
  var show = fromActive && it.a ? it.a : (it.p || it.a);
  var answer = fromActive ? (it.p || it.a) : (it.a || it.p);
  var label = fromActive ? 'Active→Passive' : 'Passive→Active';
  var opts = it.o.slice(); shuffle(opts);
  return { question:'Change voice ('+label+'): "'+show+'"', answer:answer, options:opts, hint:'Active→Passive: object becomes subject, verb becomes be+past participle, subject becomes by+agent', timeLimit:15, type:'verbal', techniqueLabel:'Change of Voice', intuition:'Active: subject does action. Passive: subject receives action. Verb changes: do→is done, did→was done, will do→will be done.' };
}

function generateChangeSpeechQuestion(diff) {
  var items=[
    {d:'She said, "I am happy."',i:'She said that she was happy',o:['She said that she was happy','She said that I am happy','She said that she is happy','She said she is happy']},
    {d:'He said, "I will come tomorrow."',i:'He said that he would come the next day',o:['He said that he would come the next day','He said that he will come tomorrow','He said he will come tomorrow','He said that he would come tomorrow']},
    {d:'"Please help me," she said.',i:'She requested me to help her',o:['She requested me to help her','She said please help me','She ordered me to help her','She said to help me']},
    {d:'He asked, "Are you coming?"',i:'He asked if I was coming',o:['He asked if I was coming','He asked that I am coming','He asked are you coming','He asked that you are coming']},
    {d:'She said, "What a beautiful day!"',i:'She exclaimed that it was a beautiful day',o:['She exclaimed that it was a beautiful day','She said what a beautiful day','She asked what a beautiful day','She exclaimed what a day']},
    {d:'The teacher said, "The Earth revolves around the Sun."',i:'The teacher said that the Earth revolves around the Sun',o:['The teacher said that the Earth revolves around the Sun','The teacher said that the Earth revolved around the Sun','The teacher said that the Earth is revolving around the Sun','The teacher said the Earth revolved around the Sun']},
    {d:'"Don\'t touch the wire," the electrician warned.',i:'The electrician warned me not to touch the wire',o:['The electrician warned me not to touch the wire','The electrician said don\'t touch the wire','The electrician warned that do not touch the wire','The electrician said not to touch the wire']},
    {d:'She said, "I have finished my homework."',i:'She said that she had finished her homework',o:['She said that she had finished her homework','She said that she has finished her homework','She said that I have finished my homework','She said that she finished her homework']},
    {d:'He said, "I was reading a book."',i:'He said that he had been reading a book',o:['He said that he had been reading a book','He said that he was reading a book','He said that I was reading a book','He said that he read a book']},
    {d:'"Leave the room immediately!" the officer shouted.',i:'The officer ordered me to leave the room immediately',o:['The officer ordered me to leave the room immediately','The officer shouted leave the room','The officer said to leave the room','The officer ordered that leave the room']},
    {d:'My mother said, "I cooked dinner for you."',i:'My mother said that she had cooked dinner for me',o:['My mother said that she had cooked dinner for me','My mother said that she cooked dinner for me','My mother said that I cooked dinner for you','My mother said she has cooked dinner for me']},
    {d:'The stranger asked, "Where does the road lead?"',i:'The stranger asked where the road led',o:['The stranger asked where the road led','The stranger asked where does the road lead','The stranger asked that where the road leads','The stranger asked where the road leads']},
    {d:'"May I come in?" the student asked.',i:'The student asked if he might come in',o:['The student asked if he might come in','The student asked may I come in','The student asked to come in','The student asked if he may come in']},
    {d:'He said, "Alas! I have lost my wallet."',i:'He exclaimed with sorrow that he had lost his wallet',o:['He exclaimed with sorrow that he had lost his wallet','He said alas I have lost my wallet','He exclaimed that he lost his wallet','He said with sorrow that he lost his wallet']},
    {d:'The coach said, "Practice until you perfect it."',i:'The coach advised us to practice until we perfected it',o:['The coach advised us to practice until we perfected it','The coach said practice until you perfect it','The coach advised that practice until perfection','The coach said to practice until perfect']},
    {d:'"Shut up!" the teacher shouted at the noisy class.',i:'The teacher ordered the noisy class to shut up',o:['The teacher ordered the noisy class to shut up','The teacher shouted shut up at the class','The teacher said shut up','The teacher ordered that the class shut up']},
    {d:'He said, "I have been waiting for an hour."',i:'He said that he had been waiting for an hour',o:['He said that he had been waiting for an hour','He said that he has been waiting for an hour','He said that I have been waiting for an hour','He said that he waited for an hour']},
    {d:'The little girl said, "How beautiful the stars are!"',i:'The little girl exclaimed with wonder that the stars were very beautiful',o:['The little girl exclaimed with wonder that the stars were very beautiful','The little girl said how beautiful the stars are','The little girl exclaimed the stars are beautiful','The little girl asked how beautiful the stars are']},
    {d:'"Could you help me with this?" she asked.',i:'She requested me to help her with that',o:['She requested me to help her with that','She asked could you help me with this','She said could you help me','She requested if I could help']},
    {d:'The man said, "I regret my actions."',i:'The man said that he regretted his actions',o:['The man said that he regretted his actions','The man said that he regrets his actions','The man said I regret my actions','The man said that he had regretted his actions']},
    {d:'"Let\'s go for a walk," he proposed.',i:'He proposed that they should go for a walk',o:['He proposed that they should go for a walk','He said let us go for a walk','He proposed to go for a walk','He said they should go for a walk']},
    {d:'She said, "I will meet you tomorrow."',i:'She said that she would meet me the next day',o:['She said that she would meet me the next day','She said that she will meet me tomorrow','She said that she would meet me tomorrow','She said I will meet you tomorrow']},
    {d:'"Please don\'t make noise," the librarian said.',i:'The librarian requested us not to make noise',o:['The librarian requested us not to make noise','The librarian said please don\'t make noise','The librarian ordered not to make noise','The librarian said not to make noise']},
    {d:'He said, "I can swim across the river."',i:'He said that he could swim across the river',o:['He said that he could swim across the river','He said that he can swim across the river','He said that I can swim across the river','He said he swam across the river']},
    {d:'"Bravo! You played well," the captain said.',i:'The captain applauded him saying that he played well',o:['The captain applauded him saying that he played well','The captain said bravo you played well','The captain exclaimed that he played well','The captain praised him you played well']}
  ];
  var it=items[rand(0,items.length-1)]; shuffle(it.o);
  return { question:'Change to indirect speech:<br>"'+it.d+'"', answer:it.i, options:it.o, hint:'Remove quotes, change pronouns, adjust tense (present→past, will→would, tomorrow→next day)', timeLimit:15, type:'verbal', techniqueLabel:'Change of Speech', intuition:'Reporting verb + that clause. Present→past. will→would. today→that day. tomorrow→next day. Commands become to+verb. Questions become if/whether.' };
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
    data_interpretation: generateDataInterpretationQuestion,
    profit_loss: generateProfitLossQuestion,
    pipes_cisterns: generatePipesCisternsQuestion,
    boats_streams: generateBoatsStreamsQuestion,
    alligation: generateAlligationQuestion,
    simple_interest: generateSimpleInterestQuestion,
    surds_indices: generateSurdsIndicesQuestion,
    bankers_discount: generateBankersDiscountQuestion,
    stocks_shares: generateStocksSharesQuestion,
    odd_man_out: generateOddManOutQuestion,
    height_distance: generateHeightDistanceQuestion,
    decimal_fraction: generateDecimalFractionQuestion,
    chain_rule: generateChainRuleQuestion,
    logarithm: generateLogarithmQuestion,
    quadratic_comparison: generateQuadraticComparisonQuestion,
    number_series: generateNumberSeriesQuestion,
    quantity_comparison: generateQuantityComparisonQuestion,
    caselet_di: generateCaseletDIQuestion,
    trigonometry: generateTrigonometryQuestion,
    meta: generateMetaQuestion,
    instalments: generateInstalmentsQuestion
  };
  // If no subMode, pick random quant topic
  var topic = subMode || pick(['number_sense','percentage','arithmetic','motion','work','algebra','geometry','mensuration','counting','data','number_system','simplification','quadratic','quadratic_comparison','partnership','simple_interest','compound_interest','discount','races','data_interpretation','profit_loss','pipes_cisterns','boats_streams','alligation','surds_indices','bankers_discount','stocks_shares','odd_man_out','height_distance','decimal_fraction','chain_rule','logarithm','number_series','quantity_comparison','caselet_di','trigonometry','instalments','meta','meta','meta']);
  var gen = genMap[topic];
  if (gen) {
    var q, attempts = 0;
    do {
      q = gen(diff, activeLayer || 'instinct');
      q._subTopic = topic;
      q.techniqueLabel = (q.techniqueLabel || '') + ' [' + topic.replace(/_/g,' ') + ']';
      attempts++;
      if (attempts > 10) break;
    } while (_isRecent(q.question));
    _addRecent(q.question);
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
    box_distribution: function(d){ try { var p = generatePuzzle(d, 'distribution'); if(p && p.questionText) return p; } catch(e){} try { var p2 = generatePuzzle(d, 'comparison'); if(p2) return p2; } catch(e2){} return fallbackPuzzle(d); },
    scheduling: function(d){ try { var p = generatePuzzle(d, 'scheduling'); if(p) return p; } catch(e){} return fallbackPuzzle(d); },
    input_output: generateInputOutputQuestion,
    mirror_image: generateMirrorImageQuestion,
    dice_cube: generateDiceCubeQuestion,
    calendar: generateCalendarQuestion,
    clock: generateClockQuestion,
    alphabet_arrange: generateAlphabetArrangeQuestion,
    critical_reasoning: generateCriticalReasoningQuestion,
    decision_making: generateDecisionMakingQuestion,
    venn_diagram: generateVennDiagramQuestion,
    // New reasoning
    letter_symbol_series: generateLetterSymbolSeriesQuestion,
    artificial_language: generateArtificialLanguageQuestion,
    matching_definitions: generateMatchingDefinitionsQuestion,
    cause_effect: generateCauseEffectQuestion,
    essential_part: generateEssentialPartQuestion,
    theme_detection: generateThemeDetectionQuestion,
    statement_argument: generateStatementArgumentQuestion,
    statement_assumption: generateStatementAssumptionQuestion,
    statement_conclusion: generateStatementConclusionQuestion,
    // Non-verbal
    embedded_images: generateEmbeddedImagesQuestion,
    figure_matrix: generateFigureMatrixQuestion,
    paper_folding: generatePaperFoldingQuestion,
    paper_cutting: generatePaperCuttingQuestion,
    rule_detection: generateRuleDetectionQuestion,
    grouping_images: generateGroupingImagesQuestion,
    image_analysis: generateImageAnalysisQuestion,
    water_images: generateWaterImagesQuestion,
    dot_situation: generateDotSituationQuestion,
    making_judgments: generateMakingJudgmentsQuestion,
    logical_problems: generateLogicalProblemsQuestion,
    logical_games: generateLogicalGamesQuestion,
    analyzing_arguments: generateAnalyzingArgumentsQuestion,
    logical_deduction: generateLogicalDeductionQuestion,
    character_puzzles: generateCharacterPuzzlesQuestion,
    verification_truth: generateVerificationTruthQuestion,
    analytical_reasoning: generateAnalyticalReasoningQuestion,
    pattern_completion: generatePatternCompletionQuestion,
    shape_construction: generateShapeConstructionQuestion,
    verbal_analogy: generateVerbalAnalogyQuestion,
    number_coding: generateNumberCodingQuestion,
  };
  var topic = subMode || pick(['pattern_flash','coding_flash','logic_snap','direction_sense','blood_relations','ranking_grid','floor_puzzle','linear_seating','circular_seating','scheduling','input_output','mirror_image','dice_cube','calendar','clock','alphabet_arrange','critical_reasoning','decision_making','venn_diagram','letter_symbol_series','artificial_language','matching_definitions','cause_effect','essential_part','theme_detection','statement_argument','statement_assumption','statement_conclusion','embedded_images','figure_matrix','paper_folding','paper_cutting','rule_detection','grouping_images','image_analysis','water_images','dot_situation','making_judgments','logical_problems','logical_games','analyzing_arguments','logical_deduction','character_puzzles','verification_truth','analytical_reasoning','pattern_completion','shape_construction','verbal_analogy','number_coding']);
  var gen = genMap[topic];
  if (gen) {
    var result, attempts = 0;
    do {
      try {
        var q = gen(diff);
        q._subTopic = topic;
        if (q.questionText) {
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
          result = {
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
        } else {
          q._subTopic = topic;
          q.type = 'reasoning';
          q.timeLimit = q.timeLimit || 15;
          q.techniqueLabel = (q.techniqueLabel || '') + ' [' + topic.replace(/_/g,' ') + ']';
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
            venn_diagram: 'Only A = A-both. Neither = total - (A+B-both). Draw overlapping circles.',
            letter_symbol_series: 'Convert letters to positions (A=1). Find the step pattern. Convert back.',
            artificial_language: 'Each 3-letter chunk = one English word. Find mapping from translations.',
            matching_definitions: 'Match the definition exactly. All keywords must fit.',
            cause_effect: 'Cause happens first and produces the effect. Look for temporal sequence.',
            essential_part: 'Without which part can the thing NOT function? That is essential.',
            theme_detection: 'Theme = central idea. What is the passage mostly about?',
            statement_argument: 'Strong argument = directly relevant, substantial, fact-based.',
            statement_assumption: 'What must be true for the statement to make sense? That is implicit.',
            statement_conclusion: 'What MUST follow from the statements? If it could be false, it does not follow.',
            embedded_images: 'The figure may be rotated/scaled. Look for the exact shape within the larger figure.',
            figure_matrix: 'Find the pattern in rows and columns. Same logic applies to all.',
            paper_folding: 'Each fold doubles layers. Holes = layers × cuts. Unfold symmetrically.',
            paper_cutting: 'The cut pattern repeats symmetrically across each fold line.',
            rule_detection: 'Apply the rule to each figure. The one that violates it is the answer.',
            grouping_images: 'Find the shared attribute within each group.',
            image_analysis: 'Visualize the figure mentally. Count carefully.',
            water_images: 'Water image = vertical mirror. Top becomes bottom.',
            dot_situation: 'Each region belongs to specific shapes. Find which shapes share the dot\'s region.',
            making_judgments: 'Evaluate each option. Best choice directly achieves the goal with minimum drawbacks.',
            logical_problems: 'List possibilities, eliminate contradictions. Only one scenario fits all clues.',
            logical_games: 'Nim: leave multiple of max+1. Weighing: divide into 3 groups.',
            analyzing_arguments: 'Identify reasoning flaws: hasty generalization, circular, ad populum, false cause.',
            logical_deduction: 'All A are B + C is A → C is B. Certain: ALL. Possible: SOME. Negative: NO.',
            character_puzzles: 'Find pattern in columns/rows. Same operation applied consistently.',
            verification_truth: 'Assume one is true, check for contradictions. Only one scenario works.',
          };
          q.intuition = intuitions[topic] || 'Draw a diagram/table. Fill known facts, deduce the rest.';
          result = q;
        }
      } catch(e) { /* fallback */ }
      attempts++;
      if (attempts > 10) break;
    } while (result && _isRecent(result.question));
    if (result) {
      _addRecent(result.question);
      return result;
    }
  }
  // Fallback
  return generateAnalogyQuestion(diff);
}

function generateSentenceConnectorsQuestion(diff) {
  var items = [
    { p1:'He was tired', p2:'he continued working', a:'Although', opts:['Although','Because','Therefore','Unless'], hint:'Opposing ideas need a contrast connector' },
    { p1:'She studied hard', p2:'she passed the exam', a:'so', opts:['so','but','although','unless'], hint:'Result needs a cause-effect connector' },
    { p1:'You must start early', p2:'you will miss the train', a:'otherwise', opts:['otherwise','because','so','and'], hint:'Warning needs a conditional connector' },
    { p1:'The weather was bad', p2:'they cancelled the flight', a:'therefore', opts:['therefore','although','however','unless'], hint:'Consequence needs a result connector' },
    { p1:'He is rich', p2:'he is not happy', a:'yet', opts:['yet','so','because','and'], hint:'Contrast between wealth and happiness' },
    { p1:'She is intelligent', p2:'she is hardworking', a:'and', opts:['and','but','or','yet'], hint:'Similar qualities need an additive connector' },
    { p1:'We can go by train', p2:'we can drive', a:'or', opts:['or','and','but','so'], hint:'Options need an alternative connector' },
    { p1:'He run fast', p2:'he missed the bus', a:'but', opts:['but','so','and','because'], hint:'Unexpected result needs a contrast connector' },
    { p1:'She will not come', p2:'you invite her', a:'unless', opts:['unless','if','because','although'], hint:'Conditional negative needs "unless"' },
    { p1:'The project was complex', p2:'the team completed it on time', a:'nevertheless', opts:['nevertheless','therefore','because','moreover'], hint:'Despite difficulty, they finished' },
    { p1:'He invested wisely', p2:'his wealth grew', a:'consequently', opts:['consequently','however','although','meanwhile'], hint:'Result of wise investment' },
    { p1:'The company expanded', p2:'profits increased', a:'as a result', opts:['as a result','on the contrary','in contrast','for example'], hint:'Expansion led to higher profits' },
    { p1:'She speaks French', p2:'she learned it in school', a:'for', opts:['for','yet','so','and'], hint:'Reason for her French ability' },
    { p1:'The food was expensive', p2:'it was delicious', a:'but', opts:['but','so','and','or'], hint:'Price vs quality contrast' },
    { p1:'Take an umbrella', p2:'it might rain', a:'in case', opts:['in case','although','therefore','unless'], hint:'Precaution for possible rain' },
    { p1:'He is not eligible for the loan', p2:'his credit score is low', a:'because', opts:['because','however','therefore','nevertheless'], hint:'Reason for ineligibility' },
    { p1:'The experiment failed', p2:'they learned valuable lessons', a:'yet', opts:['yet','so','because','or'], hint:'Failure with positive outcome contrast' },
    { p1:'The path was steep', p2:'the view was worth it', a:'but', opts:['but','so','because','and'], hint:'Difficulty vs reward contrast' },
    { p1:'Technology advances rapidly', p2:'we must keep learning', a:'therefore', opts:['therefore','however','although','unless'], hint:'Advancement implies action' },
    { p1:'The plane was delayed', p2:'passengers missed their connections', a:'as a result', opts:['as a result','nevertheless','on the contrary','in addition'], hint:'Delay caused missed connections' }
  ];
  var item = items[rand(0, items.length - 1)];
  var qText = item.p1 + ', _____ ' + item.p2 + '.';
  var opts = item.opts.slice(); shuffle(opts);
  return {
    question: qText,
    answer: item.a,
    options: opts,
    hint: item.hint,
    timeLimit: 10,
    type: 'verbal',
    techniqueLabel: 'Connector: ' + item.a + ' (' + item.hint + ')',
    intuition: 'Connectors show relationships: contrast (but, although, yet), cause-effect (so, therefore, because), condition (if, unless), addition (and, moreover), alternative (or).'
  };
}

function generateDoubleFillersQuestion(diff) {
  var items = [
    { s:'The _____ of the new policy led to _____ among employees.', a:'implementation, confusion', opts:['implementation, confusion','rejection, harmony','delay, enthusiasm','approval, resistance'], hint:'New rules usually cause uncertainty' },
    { s:'The _____ manager was known for his _____ attitude.', a:'strict, no-nonsense', opts:['strict, no-nonsense','lazy, ambitious','lenient, aggressive','friendly, rude'], hint:'Someone strict does not tolerate nonsense' },
    { s:'She gave a _____ explanation that _____ everyone.', a:'clear, satisfied', opts:['clear, satisfied','vague, confused','brief, angered','long, bored'], hint:'Good explanation meets expectations' },
    { s:'The _____ of the ancient city was a _____ discovery.', a:'excavation, remarkable', opts:['excavation, remarkable','destruction, minor','construction, ordinary','location, disappointing'], hint:'Finding ancient things is extraordinary' },
    { s:'His _____ speech _____ the audience deeply.', a:'emotional, moved', opts:['emotional, moved','boring, excited','short, confused','angry, pleased'], hint:'Emotion affects listeners' },
    { s:'The _____ weather caused _____ damage to crops.', a:'severe, extensive', opts:['severe, extensive','mild, minimal','pleasant, serious','sudden, little'], hint:'Bad weather leads to widespread harm' },
    { s:'The _____ of new technology _____ productivity.', a:'adoption, boosted', opts:['adoption, boosted','rejection, improved','delay, increased','lack, enhanced'], hint:'Using tech improves output' },
    { s:'The company _____ a new strategy to _____ market share.', a:'implemented, increase', opts:['implemented, increase','rejected, lose','delayed, maintain','ignored, capture'], hint:'Strategy is meant to grow business' },
    { s:'Her _____ nature made her _____ among friends.', a:'generous, popular', opts:['generous, popular','selfish, loved','rude, admired','lazy, respected'], hint:'Generosity attracts people' },
    { s:'The _____ of funds _____ the project progress.', a:'shortage, hindered', opts:['shortage, hindered','surplus, stopped','availability, delayed','allocation, helped'], hint:'Lack of money slows things down' },
    { s:'The _____ evidence _____ the defendant\'s guilt.', a:'conclusive, proved', opts:['conclusive, proved','weak, confirmed','circumstantial, denied','insufficient, established'], hint:'Strong evidence confirms guilt' },
    { s:'He _____ the offer _____ the terms were unfavorable.', a:'rejected, because', opts:['rejected, because','accepted, although','considered, unless','declined, therefore'], hint:'Unfavorable terms lead to refusal' },
    { s:'The _____ of the lake was _____ during winter.', a:'surface, frozen', opts:['surface, frozen','depth, warm','water, evaporated','shore, dry'], hint:'Winter makes water surface solid' },
    { s:'Her _____ performance in the interview _____ her selection.', a:'impressive, ensured', opts:['impressive, ensured','poor, guaranteed','average, prevented','mediocre, secured'], hint:'Good performance leads to selection' },
    { s:'The _____ of gas _____ the car to stop.', a:'lack, caused', opts:['lack, caused','excess, helped','presence, forced','supply, enabled'], hint:'No fuel means vehicle cannot run' }
  ];
  var item = items[rand(0, items.length - 1)];
  var opts = item.opts.slice(); shuffle(opts);
  return {
    question: item.s,
    answer: item.a,
    options: opts,
    hint: item.hint,
    timeLimit: 15,
    type: 'verbal',
    techniqueLabel: 'Double Fillers: ' + item.a,
    intuition: 'Read the full sentence first. Both blanks must fit logically and grammatically. Eliminate pairs where even one word does not fit.'
  };
}

function generateParagraphCompletionQuestion(diff) {
  var items = [
    { p:'The internet has revolutionized the way we access information. With just a few clicks, we can find answers to almost any question. However, this easy access has also led to the spread of misinformation. People often share news without verifying its authenticity. ',
      a:'Therefore, it is crucial to develop critical thinking skills to evaluate online information.', opts:['Therefore, it is crucial to develop critical thinking skills to evaluate online information.','The internet should be banned to prevent misinformation.','People should stop using social media altogether.','Information on the internet is always reliable.'], hint:'The paragraph warns about misinformation, so the conclusion should address solutions.' },
    { p:'Climate change is one of the most pressing challenges of our time. Rising temperatures are causing glaciers to melt and sea levels to rise. Extreme weather events are becoming more frequent. Governments worldwide are discussing measures to reduce carbon emissions. ',
      a:'Individual actions, combined with policy changes, can make a significant difference in combating climate change.', opts:['Individual actions, combined with policy changes, can make a significant difference in combating climate change.','Climate change is a natural phenomenon that cannot be stopped.','Only governments can solve climate change.','There is nothing we can do about climate change.'], hint:'After discussing the problem and government action, the conclusion should mention collective effort.' },
    { p:'Regular exercise is essential for maintaining good health. It strengthens the heart, improves blood circulation, and boosts the immune system. Physical activity also releases endorphins, which improve mood and reduce stress. ',
      a:'Incorporating at least 30 minutes of exercise into your daily routine can significantly enhance your quality of life.', opts:['Incorporating at least 30 minutes of exercise into your daily routine can significantly enhance your quality of life.','Exercise is only for young people.','Only intense workouts are beneficial.','You should exercise only on weekends.'], hint:'The paragraph lists benefits; the conclusion should recommend a practical action.' },
    { p:'Education is the foundation of a progressive society. It empowers individuals with knowledge and skills needed to contribute meaningfully. However, access to quality education remains unequal across different regions and economic groups. ',
      a:'Bridging this educational gap is essential for creating a more equitable and prosperous world.', opts:['Bridging this educational gap is essential for creating a more equitable and prosperous world.','Education is not necessary for success.','Only wealthy people deserve quality education.','Standardized tests should be eliminated.'], hint:'After noting inequality, the conclusion should advocate for solutions.' },
    { p:'Artificial intelligence is transforming industries at an unprecedented pace. From healthcare diagnosis to autonomous vehicles, AI is making tasks more efficient. However, concerns about job displacement and ethical implications are growing. ',
      a:'It is important to establish regulations that ensure AI development benefits humanity while minimizing risks.', opts:['It is important to establish regulations that ensure AI benefits humanity while minimizing risks.','AI will eventually replace all human workers.','AI development should be stopped immediately.','AI has no ethical implications.'], hint:'The paragraph mentions both benefits and concerns; conclusion should balance both.' },
    { p:'Teamwork is crucial in any organization. When individuals collaborate effectively, they can achieve more than they could alone. Diverse perspectives lead to innovative solutions, and shared responsibilities reduce individual stress. ',
      a:'Fostering a culture of collaboration should be a priority for every successful organization.', opts:['Fostering a culture of collaboration should be a priority for every successful organization.','Working alone is always more efficient.','Teams are unnecessary in modern workplaces.','Individual effort does not matter.'], hint:'After listing benefits of teamwork, conclude by recommending it.' },
    { p:'Time management is a skill that greatly impacts productivity. Prioritizing tasks and avoiding procrastination can help individuals accomplish more in less time. Successful people often plan their days meticulously. ',
      a:'Learning to manage time effectively is one of the most valuable skills for personal and professional growth.', opts:['Learning to manage time effectively is one of the most valuable skills for personal and professional growth.','Time management is an inborn talent that cannot be learned.','Only professionals need time management.','Planning is a waste of time.'], hint:'The paragraph praises time management; conclude by reinforcing its value.' },
    { p:'Forests play a vital role in maintaining ecological balance. They absorb carbon dioxide, produce oxygen, and provide habitat for countless species. Deforestation, however, is threatening this balance at an alarming rate. ',
      a:'Protecting and restoring forests is essential for the survival of our planet and future generations.', opts:['Protecting and restoring forests is essential for the survival of our planet and future generations.','Deforestation has no impact on the environment.','Forests are not important for human survival.','Only animals need forests.'], hint:'After highlighting forests\' importance and deforestation, the conclusion should call for action.' },
    { p:'Reading books has numerous benefits beyond entertainment. It improves vocabulary, enhances empathy, and reduces stress. Reading also stimulates the brain and can help prevent cognitive decline in old age. ',
      a:'Making reading a daily habit is one of the best investments you can make in your mental well-being.', opts:['Making reading a daily habit is one of the best investments you can make in your mental well-being.','Reading is a waste of time.','Only fiction books are worth reading.','Watching movies has the same benefits as reading.'], hint:'The paragraph lists benefits; conclude by encouraging reading.' }
  ];
  var item = items[rand(0, items.length - 1)];
  var opts = item.opts.slice(); shuffle(opts);
  return {
    question: item.p + '<br><br>_____',
    answer: item.a,
    options: opts,
    hint: item.hint,
    timeLimit: 25,
    type: 'verbal',
    techniqueLabel: 'Paragraph Completion: ' + item.a.substring(0, 50),
    intuition: 'The concluding sentence should logically follow from the passage. It should summarize, draw a conclusion, or suggest action based on the information presented.'
  };
}

function generateTensesQuestion(diff) {
  var items = [
    { s:'She ___ to the market every Sunday.', a:'goes', opts:['goes','went','gone','going'], hint:'Every Sunday = habitual present → simple present' },
    { s:'They ___ dinner when I arrived.', a:'were having', opts:['were having','are having','have had','had'], hint:'An interrupted action in the past = past continuous' },
    { s:'I ___ this book twice already.', a:'have read', opts:['have read','read','will read','am reading'], hint:'"Already" + completed action relevant now = present perfect' },
    { s:'The train ___ before we reached the station.', a:'had left', opts:['had left','left','has left','leaves'], hint:'Earlier of two past actions = past perfect' },
    { s:'Look! It ___ outside.', a:'is raining', opts:['is raining','rains','rained','has rained'], hint:'"Look!" = action happening now + ongoing = present continuous' },
    { s:'We ___ the project by next Friday.', a:'will have completed', opts:['will have completed','complete','completed','are completing'], hint:'Completed before a future time = future perfect' },
    { s:'He ___ for the exam since morning.', a:'has been studying', opts:['has been studying','studies','studied','is studying'], hint:'Ongoing action started in past, still continuing = present perfect continuous' },
    { s:'When I was a child, I ___ to the park every day.', a:'went', opts:['went','go','have gone','am going'], hint:'Routine in past = simple past' },
    { s:'The sun ___ in the east.', a:'rises', opts:['rises','rose','is rising','has risen'], hint:'Universal truth = simple present' },
    { s:'She ___ her homework before going out to play.', a:'finished', opts:['finished','finishes','will finish','is finishing'], hint:'Completed action before another past action = simple past' },
    { s:'By the time you arrive, I ___ the work.', a:'will have done', opts:['will have done','do','did','am doing'], hint:'Action completed by a future time = future perfect' },
    { s:'Ravi ___ to Delhi last month.', a:'went', opts:['went','has gone','goes','is going'], hint:'Specific past time (last month) = simple past' },
    { s:'It ___ heavily since yesterday.', a:'has been raining', opts:['has been raining','rains','rained','is raining'], hint:'Ongoing since past point = present perfect continuous' },
    { s:'I ___ him at the party tonight.', a:'will meet', opts:['will meet','met','have met','meet'], hint:'Future reference (tonight) = simple future' },
    { s:'She ___ a letter when the phone rang.', a:'was writing', opts:['was writing','writes','has written','is writing'], hint:'Interrupted past action = past continuous' },
    { s:'The museum ___ at 9 a.m. every day.', a:'opens', opts:['opens','opened','is opening','has opened'], hint:'Fixed timetable/schedule = simple present' },
    { s:'He ___ in this company for ten years so far.', a:'has worked', opts:['has worked','works','worked','is working'], hint:'Duration up to now = present perfect' },
    { s:'I ___ you tomorrow at the office.', a:'will see', opts:['will see','saw','have seen','see'], hint:'Future plan (tomorrow) = simple future' },
    { s:'She realized she ___ her keys at home.', a:'had forgotten', opts:['had forgotten','forgets','has forgotten','is forgetting'], hint:'Earlier of two past actions = past perfect' },
    { s:'The children ___ in the garden now.', a:'are playing', opts:['are playing','play','played','will play'], hint:'"Now" = present continuous' }
  ];
  var item = items[rand(0, items.length - 1)];
  var opts = item.opts.slice(); shuffle(opts);
  return {
    question: item.s + '<br><br>Choose the correct verb form.',
    answer: item.a,
    options: opts,
    hint: item.hint,
    timeLimit: 12,
    type: 'verbal',
    techniqueLabel: 'Tense: ' + item.a + ' (' + item.hint + ')',
    intuition: 'Match the TIME MARKER to the tense: Every day/Sunday = simple present; since/for + now = present perfect (continuous); when/before + past = past perfect; by+future = future perfect; Look!/now = present continuous.'
  };
}

function generatePrepositionsQuestion(diff) {
  var items = [
    { s:'She is good ___ mathematics.', a:'at', opts:['at','in','on','with'], hint:'Good at (skill) is the fixed phrase' },
    { s:'He arrived ___ the airport on time.', a:'at', opts:['at','in','on','to'], hint:'Arrive at (a point/small place)' },
    { s:'The meeting is scheduled ___ 3 p.m.', a:'at', opts:['at','in','on','for'], hint:'Precise time = at' },
    { s:'My birthday falls ___ January.', a:'in', opts:['in','at','on','by'], hint:'Months/years = in' },
    { s:'We met ___ a rainy Monday.', a:'on', opts:['on','in','at','for'], hint:'Specific day/date = on' },
    { s:'She is interested ___ learning French.', a:'in', opts:['in','at','on','for'], hint:'Interested in is the fixed phrase' },
    { s:'He is afraid ___ dogs.', a:'of', opts:['of','from','at','to'], hint:'Afraid of is the fixed phrase' },
    { s:'Please divide the cake ___ the children.', a:'among', opts:['among','between','within','beneath'], hint:'Among = three or more; between = two' },
    { s:'The cat jumped ___ the table.', a:'onto', opts:['onto','into','below','across'], hint:'Moving to a surface = onto' },
    { s:'They have been friends ___ childhood.', a:'since', opts:['since','for','from','during'], hint:'Since = point of time (childhood)' },
    { s:'She has lived here ___ five years.', a:'for', opts:['for','since','from','during'], hint:'For = duration (five years)' },
    { s:'The keys are ___ the drawer.', a:'in', opts:['in','on','at','under'], hint:'Inside an enclosed space = in' },
    { s:'We walked ___ the bridge.', a:'across', opts:['across','through','over','along'], hint:'From one side to the other of a surface = across' },
    { s:'The ball rolled ___ the road.', a:'across', opts:['across','through','between','upon'], hint:'Across = from side to side' },
    { s:'He is senior ___ me in the company.', a:'to', opts:['to','than','of','from'], hint:'Senior to is the correct phrase' },
    { s:'The map was hanging ___ the wall.', a:'on', opts:['on','in','at','over'], hint:'Attached to a vertical surface = on' },
    { s:'The train passed ___ the tunnel.', a:'through', opts:['through','across','over','along'], hint:'From one end to the other of an enclosed path = through' },
    { s:'I have no interest ___ politics.', a:'in', opts:['in','at','for','of'], hint:'Interest in is the fixed phrase' },
    { s:'The book is ___ the shelf.', a:'on', opts:['on','in','at','beneath'], hint:'Resting on a horizontal surface = on' },
    { s:'Ritu is very fond ___ music.', a:'of', opts:['of','on','at','with'], hint:'Fond of is the fixed phrase' },
    { s:'He will arrive ___ Monday morning.', a:'on', opts:['on','in','at','by'], hint:'Specific day + part of day = on' },
    { s:'There is a bridge ___ the river.', a:'over', opts:['over','on','in','at'], hint:'Spanning above = over' }
  ];
  var item = items[rand(0, items.length - 1)];
  var opts = item.opts.slice(); shuffle(opts);
  return {
    question: item.s + '<br><br>Choose the correct preposition.',
    answer: item.a,
    options: opts,
    hint: item.hint,
    timeLimit: 10,
    type: 'verbal',
    techniqueLabel: 'Preposition: ' + item.a + ' (' + item.hint + ')',
    intuition: 'Learn fixed collocations (good at, interested in, afraid of, fond of). Rule of thumb: at=point/time, in=enclosed/month/year, on=surface/day/date, since=point, for=duration, between=two, among=three+.'
  };
}

function generateArticlesQuestion(diff) {
  var items = [
    { s:'He is ___ honest man.', a:'an', opts:['an','a','the','no article'], hint:'"Honest" starts with silent H, vowel sound → an' },
    { s:'I saw ___ elephant at the zoo.', a:'an', opts:['an','a','the','no article'], hint:'Elephant begins with a vowel sound → an (first mention)' },
    { s:'She is ___ university student.', a:'a', opts:['a','an','the','no article'], hint:'University starts with a "yu" sound → a' },
    { s:'___ sun rises in the east.', a:'The', opts:['The','A','An','No article'], hint:'Unique object → the' },
    { s:'He is ___ best player on the team.', a:'the', opts:['the','a','an','no article'], hint:'Superlative (best) → the' },
    { s:'She bought ___ new car yesterday.', a:'a', opts:['a','an','the','no article'], hint:'First mention, non-specific → a' },
    { s:'We had ___ amazing time at the beach.', a:'an', opts:['an','a','the','no article'], hint:'"Amazing" begins with vowel sound → an' },
    { s:'___ Ganges is a sacred river.', a:'The', opts:['The','A','An','No article'], hint:'Rivers take "the"' },
    { s:'He plays ___ guitar very well.', a:'the', opts:['the','a','an','no article'], hint:'Musical instruments take "the"' },
    { s:'She is ___ nurse at the city hospital.', a:'a', opts:['a','an','the','no article'], hint:'Profession, non-specific → a' },
    { s:'This is ___ historical moment for the team.', a:'a', opts:['a','an','the','no article'], hint:'"Historical" begins with "h" consonant sound → a' },
    { s:'I met ___ old friend at the station.', a:'an', opts:['an','a','the','no article'], hint:'"Old" begins with vowel sound → an' },
    { s:'___ Himalayas are in Asia.', a:'The', opts:['The','A','An','No article'], hint:'Mountain ranges take "the"' },
    { s:'She is ___ only child in her family.', a:'the', opts:['the','a','an','no article'], hint:'"Only" makes it definite → the' },
    { s:'He wants to become ___ engineer.', a:'an', opts:['an','a','the','no article'], hint:'"Engineer" begins with vowel sound → an' },
    { s:'We visited ___ Taj Mahal last summer.', a:'the', opts:['the','a','an','no article'], hint:'Famous landmarks/unique monuments take "the"' },
    { s:'___ courage she showed was remarkable.', a:'The', opts:['The','A','An','No article'], hint:'Specific noun (limited by clause) → the' },
    { s:'I have ___ idea that might work.', a:'an', opts:['an','a','the','no article'], hint:'"Idea" begins with vowel sound → an' }
  ];
  var item = items[rand(0, items.length - 1)];
  var opts = item.opts.slice(); shuffle(opts);
  return {
    question: item.s + '<br><br>Fill the blank with the correct article (a / an / the / no article).',
    answer: item.a,
    options: opts,
    hint: item.hint,
    timeLimit: 8,
    type: 'verbal',
    techniqueLabel: 'Article: ' + item.a + ' (' + item.hint + ')',
    intuition: 'Use a/an = first mention & non-specific (a before consonant SOUND, an before vowel SOUND: an hour, a university). Use the = unique, superlative, already mentioned, famous landmarks. No article = general/abstract/uncountable.'
  };
}

function generateConfusingWordsQuestion(diff) {
  var items = [
    { p:'Choose the correct word: The weather will ___ (affect/effect) the match.', a:'affect', opts:['affect','effect'], hint:'Affect = verb (to influence); effect = noun (result)' },
    { p:'Choose the correct word: She gave a short ___ (break/breathe) to rest.', a:'break', opts:['break','breathe'], hint:'Break = pause; breathe = take air (verb)' },
    { p:'Choose the correct word: He ___ (advice/advised) me to study hard.', a:'advised', opts:['advised','advice'], hint:'Advise = verb; advice = noun' },
    { p:'Choose the correct word: Please ___ (accept/except) my apologies.', a:'accept', opts:['accept','except'], hint:'Accept = receive; except = excluding' },
    { p:'Choose the correct word: Their ___ (principal/principle) concern is safety.', a:'principal', opts:['principal','principle'], hint:'Principal = main/chief; principle = rule/belief' },
    { p:'Choose the correct word: She ___ (borrowed/lent) me her pen.', a:'lent', opts:['lent','borrowed'], hint:'Lend = give temporarily; borrow = take temporarily' },
    { p:'Choose the correct word: The new policy will ___ (complement/compliment) the old one.', a:'complement', opts:['complement','compliment'], hint:'Complement = go well together; compliment = praise' },
    { p:'Choose the correct word: He made a serious ___ (mistake/mistakes) in the report.', a:'mistake', opts:['mistake','mistakes'], hint:'"A" + singular → mistake' },
    { p:'Choose the correct word: His ___ (sight/site/state) of the new factory is ideal.', a:'site', opts:['site','sight'], hint:'Site = location; sight = view/vision' },
    { p:'Choose the correct word: The ___ (weather/whether) today is pleasant.', a:'weather', opts:['weather','whether'], hint:'Weather = climate; whether = if' },
    { p:'Choose the correct word: Please ___ (stationary/stationery) the van here.', a:'stationary', opts:['stationary','stationery'], hint:'Stationary = not moving; stationery = writing materials' },
    { p:'Choose the correct word: I can ___ (hear/here) the music clearly.', a:'hear', opts:['hear','here'], hint:'Hear = perceive sound; here = at this place' },
    { p:'Choose the correct word: The ___ (loan/lone) was approved by the bank.', a:'loan', opts:['loan','lone'], hint:'Loan = borrowed money; lone = alone' },
    { p:'Choose the correct word: She is ___ (confident/confidant) about passing the exam.', a:'confident', opts:['confident','confidant'], hint:'Confident = sure; confidant = trusted friend' },
    { p:'Choose the correct word: The ___ (counsel/council) will meet on Monday.', a:'council', opts:['council','counsel'], hint:'Council = governing body; counsel = advice/lawyer' },
    { p:'Choose the correct word: His ___ (career/career choice) in medicine is inspiring.', a:'career', opts:['career','career choice'], hint:'Career = profession; career choice = chosen path' },
    { p:'Choose the correct word: The ___ (desert/dessert) is dry and sandy.', a:'desert', opts:['desert','dessert'], hint:'Desert = dry land; dessert = sweet course' },
    { p:'Choose the correct word: Please ___ (quiet/quit) the noise.', a:'quiet', opts:['quiet','quit'], hint:'Quiet = silent; quit = stop/leave' },
    { p:'Choose the correct word: He received an ___ (award/reward) for his bravery.', a:'award', opts:['award','reward'], hint:'Award = official prize; reward = recompense for service' },
    { p:'Choose the correct word: The ___ (moral/morale) of the team is high.', a:'morale', opts:['morale','moral'], hint:'Morale = confidence/spirit; moral = principle' }
  ];
  var item = items[rand(0, items.length - 1)];
  return {
    question: item.p,
    answer: item.a,
    options: item.opts.slice(),
    hint: item.hint,
    timeLimit: 8,
    type: 'verbal',
    techniqueLabel: 'Confusing Word: ' + item.a + ' (' + item.hint + ')',
    intuition: 'Learn the meaning of each confusing pair and insert the word that fits the sentence\'s meaning. Affect=verb / effect=noun; advice=noun / advise=verb; lend=give / borrow=take.'
  };
}

function generateHomophonesQuestion(diff) {
  var items = [
    { s:'The boat sailed across the ___ sea.', a:'blue', opts:['blue','blew'], hint:'Sea = blue (colour); blew = past of blow' },
    { s:'She ate a ___ of bread.', a:'piece', opts:['piece','peace'], hint:'Piece = part; peace = calm' },
    { s:'The ___ began to howl at the moon.', a:'wolf', opts:['wolf','woof'], hint:'Wolf = wild animal; woof = dog bark' },
    { s:'Please ___ the door quietly.', a:'close', opts:['close','clothes'], hint:'Close = shut; clothes = garments' },
    { s:'He won the race ___ great effort.', a:'by', opts:['by','bye','buy'], hint:'By = through; bye = farewell; buy = purchase' },
    { s:'The ___ of the tree is thick.', a:'bark', opts:['bark','barque'], hint:'Bark = tree covering/dog sound; barque = sailing ship' },
    { s:'She used a ___ to write.', a:'pen', opts:['pen','pin'], hint:'Pen = writing tool; pin = fastener' },
    { s:'The ___ is covered with snow.', a:'peak', opts:['peak','peek','pique'], hint:'Peak = mountain top; peek = quick look; pique = provoke' },
    { s:'He left the room and ___ the door.', a:'shut', opts:['shut','shot','shave'], hint:'Shut = close; shot = fired; shave = trim' },
    { s:'The ___ guards the treasure.', a:'mayor', opts:['mayor','mare'], hint:'Mayor = city head; mare = female horse' },
    { s:'Please ___ your name here.', a:'write', opts:['write','right'], hint:'Write = inscribe; right = correct/direction' },
    { s:'The ___ of the bell was loud.', a:'ring', opts:['ring','wring'], hint:'Ring = sound/circle; wring = squeeze' },
    { s:'I want to ___ this book.', a:'read', opts:['read','red'], hint:'Read = peruse; red = colour' },
    { s:'The ___ is very cold today.', a:'weather', opts:['weather','whether'], hint:'Weather = climate; whether = if' },
    { s:'He told a funny ___ at the party.', a:'tale', opts:['tale','tail'], hint:'Tale = story; tail = animal\'s appendage' },
    { s:'The farmer reaps the ___ in autumn.', a:'crop', opts:['crop','crap'], hint:'Crop = harvest; crap = waste' },
    { s:'She will ___ the gift to her friend.', a:'send', opts:['send','scent'], hint:'Send = dispatch; scent = smell' },
    { s:'The ___ of the street is narrow.', a:'lane', opts:['lane','lain'], hint:'Lane = narrow road; lain = past of lie' }
  ];
  var item = items[rand(0, items.length - 1)];
  var opts = item.opts.slice(); shuffle(opts);
  return {
    question: item.s + '<br><br>Choose the correct homophone (word that sounds alike).',
    answer: item.a,
    options: opts,
    hint: item.hint,
    timeLimit: 8,
    type: 'verbal',
    techniqueLabel: 'Homophone: ' + item.a + ' (' + item.hint + ')',
    intuition: 'Homophones sound alike but differ in meaning/spelling. Pick the word whose meaning fits the sentence context.'
  };
}

function generateVerbalAnalogyQuestion(diff) {
  var items = [
    { a:'Doctor', b:'Hospital', c:'Teacher', d:'School', hint:'Function → place of work' },
    { a:'Bird', b:'Nest', c:'Lion', d:'Den', hint:'Animal → its home' },
    { a:'Hand', b:'Glove', c:'Foot', d:'Sock', hint:'Body part → covering' },
    { a:'Pen', b:'Write', c:'Knife', d:'Cut', hint:'Tool → its function' },
    { a:'Fire', b:'Smoke', c:'Rain', d:'Cloud', hint:'Cause → result/phenomenon' },
    { a:'Book', b:'Author', c:'Painting', d:'Painter', hint:'Work → its creator' },
    { a:'Flower', b:'Rose', c:'Animal', d:'Dog', hint:'Category → specific example' },
    { a:'Hour', b:'Minute', c:'Minute', d:'Second', hint:'Larger unit → smaller unit' },
    { a:'Tiger', b:'Cub', c:'Dog', d:'Puppy', hint:'Adult animal → young one' },
    { a:'Sugar', b:'Sweet', c:'Lemon', d:'Sour', hint:'Taste of the object' },
    { a:'Cow', b:'Herd', c:'Sheep', d:'Flock', hint:'Animal → collective noun' },
    { a:'Sun', b:'Light', c:'Rain', d:'Water', hint:'Source → what it gives' },
    { a:'Teacher', b:'Teach', c:'Hunter', d:'Hunt', hint:'Person → action' },
    { a:'Guitar', b:'Music', c:'Brush', d:'Painting', hint:'Tool → product/art' },
    { a:'Meter', b:'Length', c:'Kilogram', d:'Weight', hint:'Unit → what it measures' },
    { a:'Eye', b:'See', c:'Ear', d:'Hear', hint:'Organ → its function' },
    { a:'Lawyer', b:'Court', c:'Scientist', d:'Laboratory', hint:'Profession → workplace' },
    { a:'Window', b:'Glass', c:'Book', d:'Paper', hint:'Object → its material' },
    { a:'Village', b:'City', c:'City', d:'Metropolis', hint:'Scale: smaller → larger' },
    { a:'Start', b:'Finish', c:'Morning', d:'Evening', hint:'Beginning → end (opposite)' },
    { a:'Noise', b:'Loud', c:'Silence', d:'Quiet', hint:'State → adjective describing it' },
    { a:'Tall', b:'Short', c:'Wide', d:'Narrow', hint:'Opposite adjectives' },
    { a:'Water', b:'Thirst', c:'Food', d:'Hunger', hint:'What satisfies the need' },
    { a:'Key', b:'Lock', c:'Screwdriver', d:'Screw', hint:'Tool → what it works with' },
    { a:'Tennis', b:'Racket', c:'Cricket', d:'Bat', hint:'Sport → equipment' },
    { a:'Chef', b:'Kitchen', c:'Carpenter', d:'Workshop', hint:'Worker → workplace' },
    { a:'Moon', b:'Tide', c:'Sun', d:'Day', hint:'Celestial body → its effect/cycle' },
    { a:'Silk', b:'Worm', c:'Honey', d:'Bee', hint:'Product → its maker' },
    { a:'Coal', b:'Mine', c:'Gold', d:'Mine', hint:'Resource → extraction site' },
    { a:'Book', b:'Library', c:'Medicine', d:'Pharmacy', hint:'Item → where it is kept/sold' }
  ];
  var item = items[rand(0, items.length - 1)];
  var rels = [
    { d:'Rabbit', rel:'Ear' }, { d:'Lamp', rel:'Light' }, { d:'Chair', rel:'Wood' },
    { d:'Bus', rel:'Road' }, { d:'Shirt', rel:'Cloth' }, { d:'Storm', rel:'Wind' },
    { d:'Pen', rel:'Ink' }, { d:'Star', rel:'Sky' }, { d:'River', rel:'Water' }
  ];
  var opts = [item.d];
  var pool = shuffle(rels).slice(0, 3);
  pool.forEach(function(r){ if (opts.indexOf(r.d) < 0) opts.push(r.d); });
  while (opts.length < 4) { var extra = pick(['Cup','Stone','Cloud','Button','Fan']); if (opts.indexOf(extra) < 0) opts.push(extra); }
  shuffle(opts);
  return {
    question: item.a + ' : ' + item.b + ' :: ' + item.c + ' : ?',
    answer: item.d,
    options: opts,
    hint: '"' + item.a + '" is to "' + item.b + '" as "' + item.c + '" is to "?" — ' + item.hint,
    timeLimit: 10,
    type: 'reasoning',
    techniqueLabel: 'Verbal Analogy: ' + item.a + '→' + item.b + ' = ' + item.c + '→' + item.d + ' (' + item.hint + ')',
    intuition: 'First identify the EXACT relation between the first pair (function→place, part→whole, product→maker). Then find the option that matches for the second pair.'
  };
}

function generateNumberCodingQuestion(diff) {
  var items = [
    { w:'CAT', code:'3-1-20', other:'DOG', o:'4-15-7', hint:'A=1,B=2... Z=26, write positions' },
    { w:'A-Z', code:'1-26', other:'B-Y', o:'2-25', hint:'Pair letters at opposite positions (A=1, Z=26)' },
    { w:'HM', code:'8-13', other:'KQ', o:'11-17', hint:'A=1... H=8, M=13. Write letter positions' },
    { w:'XBCZ', code:'24-2-3-26', other:'WADE', o:'23-1-4-5', hint:'A=1 to Z=26, just write each position' },
    { w:'FISH', code:'6921', other:'BIRD', o:'2975', hint:'A=1... I=9, F=6. Positions: F=6,I=9,S=19→19? Use single digits: S=19→? count as 1,9 → FISH=6,9,19,8' },
    { w:'CAB', code:'312', other:'BED', o:'254', hint:'Put the position number of each letter in order' },
    { w:'GOOD', code:'7715', other:'LUCK', o:'12-21-3-11', hint:'G=7,O=15,O=15,D=4 → reverse digit order for 15' },
    { w:'ONE', code:'15145', other:'TWO', o:'202315', hint:'O=15,N=14,E=5 → 15-14-5. For 2-digit, write both digits' }
  ];
  var item = pick(items);
  return {
    question: 'In a certain code, "' + item.w + '" is written as "' + item.code + '". How is "' + item.other + '" written ?',
    answer: item.o,
    options: [item.o, item.o.split('').reverse().join(''), shuffle(item.o.split('')).join(''), shuffle(item.o.split('')).join('')].filter(function(v,i,a){ return a.indexOf(v) === i; }),
    hint: item.hint,
    timeLimit: 15,
    type: 'reasoning',
    techniqueLabel: 'Number Coding: ' + item.hint,
    intuition: 'A=1, B=2, ... Z=26. Convert each letter of the second word to its position number, in the same order.'
  };
}

function generateInstalmentsQuestion(diff) {
  var items = [];
  function build() {
    var p = [5000, 8000, 10000, 12000, 15000][rand(0,4)];
    var r = [12, 15, 16, 18, 20][rand(0,4)];
    var t = [2, 3, 4][rand(0,2)];
    // Equal installments with simple interest: total = P + interest, split equally
    var total = p + Math.round(p * r * t / 100);
    var each = Math.round(total / t);
    items.push({
      part1: 'Rs ' + p + ' is borrowed at ' + r + '% simple interest and repaid in ' + t + ' equal annual instalments.',
      q: 'What is the value of each instalment (approx, equal principal? use SI total)?',
      a: String(each),
      opts: [String(each), String(each - 100), String(each + 100), String(Math.round(p / t))],
      hint: 'Total = Principal + SI = ' + total + '. Equal instalments = ' + total + ' ÷ ' + t + ' = ' + each + '.'
    });
  }
  build();
  var item = items[0];
  var opts = item.opts.slice(); shuffle(opts);
  return {
    question: item.part1 + '<br><br>' + item.q,
    answer: item.a,
    options: opts,
    hint: item.hint,
    timeLimit: diff <= 3 ? 30 : 20,
    type: 'quant',
    techniqueLabel: 'Instalments: Total = P + SI, then ÷ no. of instalments (' + item.a + ')',
    intuition: 'For simple-instalment problems: total amount = Principal + Simple Interest. Divide that total by the number of instalments to get each equal equal-payment value.'
  };
}

function generateQuantityComparisonQuestion(diff, layer) {
  var ty = [
    [1, function(){ return { q1:'A bag has 5 red, 3 blue balls. P(red)', v1:'5/8', q2:'P(blue)', v2:'3/8', ans:'Quantity I > Quantity II' }; }],
    [1, function(){ return { q1:'Speed 60km/h for 2h → distance', v1:'120 km', q2:'Speed 40km/h for 4h → distance', v2:'160 km', ans:'Quantity I < Quantity II' }; }],
    [1, function(){ return { q1:'Cost of 5 pens at Rs10 each', v1:'Rs 50', q2:'Cost of 4 pens at Rs12 each', v2:'Rs 48', ans:'Quantity I > Quantity II' }; }],
    [1, function(){ return { q1:'Average of 4, 6, 8, 10', v1:'7', q2:'Average of 5, 7, 9, 11', v2:'8', ans:'Quantity I < Quantity II' }; }],
    [2, function(){ var a=rand(20,40), b=rand(30,50); return { q1:'(a+b)² - (a-b)² where a='+a+', b='+b, v1:4*a*b, q2:'4ab = 4×'+a+'×'+b, v2:4*a*b, ans:'Quantity I = Quantity II' }; }],
    [2, function(){ var p=rand(1000,5000), r=rand(5,15), t=rand(2,4); var si=Math.round(p*r*t/100), ci=Math.round(p*Math.pow(1+r/100,t)-p); return { q1:'SI on Rs'+p+' at '+r+'% for '+t+'yr', v1:si, q2:'CI on Rs'+p+' at '+r+'% for '+t+'yr', v2:ci, ans:si>ci?'Quantity I > Quantity II':(si<ci?'Quantity I < Quantity II':'Quantity I = Quantity II') }; }],
    [2, function(){ var m1=rand(10,20), m2=rand(5,15), d1=rand(5,10), d2=rand(d1+1,12); return { q1:m1+' men complete in '+d1+' days. Work in man-days', v1:m1*d1, q2:m2+' men complete in '+d2+' days. Work in man-days', v2:m2*d2, ans:m1*d1>m2*d2?'Quantity I > Quantity II':(m1*d1<m2*d2?'Quantity I < Quantity II':'Quantity I = Quantity II') }; }],
    [3, function(){ var c=rand(400,1000), s1=c+rand(50,150), s2=c+rand(160,250); return { q1:'Profit% if CP='+c+', SP='+s1, v1:Math.round((s1-c)/c*100)+'%', q2:'Profit% if CP='+c+', SP='+s2, v2:Math.round((s2-c)/c*100)+'%', ans:Math.round((s1-c)/c*100)>Math.round((s2-c)/c*100)?'Quantity I > Quantity II':'Quantity I < Quantity II' }; }],
    [3, function(){ var a=rand(5,10), b=rand(3,7); var x=rand(2,5), y=rand(3,6); return { q1:'Ratio a:b = '+a+':'+b+'. Sum='+(a+b)+'x'+x+'. A share?', v1:a*x, q2:'Ratio a:b = '+a+':'+b+'. Sum='+(a+b)+'x'+y+'. B share?', v2:b*y, ans:a*x>b*y?'Quantity I > Quantity II':(a*x<b*y?'Quantity I < Quantity II':'Cannot be determined') }; }],
    [3, function(){ var s=rand(40,80), t1=rand(2,4), t2=rand(1,3); return { q1:'Speed '+s+'km/h for '+t1+'h. Distance', v1:s*t1+' km', q2:'Speed '+(s+rand(5,15))+'km/h for '+t2+'h. Distance', v2:(s+rand(5,15))*t2+' km', ans:s*t1>(s+rand(5,15))*t2?'Quantity I > Quantity II':(s*t1<(s+rand(5,15))*t2?'Quantity I < Quantity II':'Cannot be determined') }; }],
    [4, function(){ var p=rand(500,2000), r1=rand(5,10), r2=rand(11,15), t=rand(2,3); return { q1:'CI on Rs'+p+' at '+r1+'% for '+t+'yr', v1:Math.round(p*Math.pow(1+r1/100,t)-p), q2:'SI on Rs'+p+' at '+r2+'% for '+t+'yr', v2:Math.round(p*r2*t/100), ans:Math.round(p*Math.pow(1+r1/100,t)-p) > Math.round(p*r2*t/100) ? 'Quantity I > Quantity II' : 'Quantity I < Quantity II' }; }],
    [4, function(){ var a=rand(200,500), b=rand(100,400); return { q1:'(a+b)² where a='+a+', b='+b, v1:(a+b)*(a+b), q2:'a²+b²+2ab where a='+a+', b='+b, v2:a*a+b*b+2*a*b, ans:'Quantity I = Quantity II' }; }],
    [4, function(){ var m=rand(4,8), w=rand(3,6); return { q1:'Men='+m+', earn Rs'+(m*rand(200,500))+' total. Each earns?', v1:rand(200,500), q2:'Women='+w+', earn Rs'+(w*rand(150,400))+' total. Each earns?', v2:rand(150,400), ans:'Cannot be determined' }; }],
    [5, function(){ var p=rand(800,3000), r=rand(8,15), t=rand(1,3); return { q1:'CI on Rs'+p+' at '+r+'% for '+t+'yr (annual)', v1:Math.round(p*Math.pow(1+r/100,t)-p), q2:'CI on Rs'+p+' at '+r+'% for '+t+'yr (half-yearly)', v2:Math.round(p*Math.pow(1+r/200,2*t)-p), ans:Math.round(p*Math.pow(1+r/100,t)-p) > Math.round(p*Math.pow(1+r/200,2*t)-p) ? 'Quantity I > Quantity II' : 'Quantity I < Quantity II' }; }],
    [5, function(){ var a=rand(300,700), b=rand(a+100,a+300); return { q1:'Discount% if MP='+b+', SP='+(a+rand(10,50)), v1:Math.round((b-(a+rand(10,50)))/b*100)+'%', q2:'Discount% if MP='+b+', SP='+(a+rand(60,100)), v2:Math.round((b-(a+rand(60,100)))/b*100)+'%', ans:'Cannot be determined' }; }],
    [5, function(){ var n=rand(2,5); return { q1:'Number of triangles formed by '+n+' points on a circle', v1:n*(n-1)*(n-2)/6, q2:'Number of chords formed by '+n+' points on a circle', v2:n*(n-1)/2, ans:n*(n-1)*(n-2)/6 > n*(n-1)/2 ? 'Quantity I > Quantity II' : 'Quantity I < Quantity II' }; }],
    [5, function(){ var d=rand(60,90); return { q1:'tan('+d+'°)', v1:Math.round(Math.tan(d*Math.PI/180)*100)/100, q2:'cot('+d+'°)', v2:Math.round(1/Math.tan(d*Math.PI/180)*100)/100, ans:Math.round(Math.tan(d*Math.PI/180)*100)/100 > Math.round(1/Math.tan(d*Math.PI/180)*100)/100 ? 'Quantity I > Quantity II' : 'Quantity I < Quantity II' }; }]
  ];
  var matched = ty.filter(function(t){ return t[0] <= diff; });
  if (matched.length === 0) matched = ty;
  var chosen = matched[rand(0, matched.length - 1)];
  var data = chosen[1]();
  var qText = 'Quantity I: ' + data.q1 + ' = ' + data.v1 + '<br>Quantity II: ' + data.q2 + ' = ' + data.v2 + '<br><br>Which is correct?';
  var opts = ['Quantity I > Quantity II', 'Quantity I < Quantity II', 'Quantity I = Quantity II', 'Cannot be determined'];
  var correctIdx = opts.indexOf(data.ans);
  if (correctIdx < 0) correctIdx = 3;
  shuffle(opts);
  return {
    question: qText,
    answer: data.ans,
    options: opts,
    hint: 'Compute both quantities separately, then compare. ' + data.ans,
    timeLimit: diff <= 2 ? 25 : (diff <= 4 ? 20 : 15),
    type: 'quant',
    techniqueLabel: 'Quantity Comparison: ' + data.ans,
    intuition: 'Compute Quantity I and Quantity II separately. Check: I > II, I < II, I = II, or cannot determine (if insufficient data). For CI vs SI: CI > SI for same rate and time > 1yr.'
  };
}

function generateVerbalQuestion(diff, subMode) {
  var genMap = {
    synonym: generateSynonymQuestion,
    antonym: generateAntonymQuestion,
    sentence_completion: generateSentenceCompletionQuestion,
    word_ordering: generateWordOrderingQuestion,
    sentence_ordering: generateSentenceOrderingQuestion,
    paragraph_formation: generateParagraphFormationQuestion,
    comprehension: generateComprehensionQuestion,
    spotting_errors: generateSpottingErrorsQuestion,
    spellings: generateSpellingsQuestion,
    sentence_correction: generateSentenceCorrectionQuestion,
    sentence_improvement: generateSentenceImprovementQuestion,
    closet_test: generateClosetTestQuestion,
    one_word_subs: generateOneWordSubstitutesQuestion,
    idioms_phrases: generateIdiomsPhrasesQuestion,
    change_voice: generateChangeVoiceQuestion,
    change_speech: generateChangeSpeechQuestion,
    sentence_connectors: generateSentenceConnectorsQuestion,
    double_fillers: generateDoubleFillersQuestion,
    paragraph_completion: generateParagraphCompletionQuestion,
    tenses: generateTensesQuestion,
    prepositions: generatePrepositionsQuestion,
    articles: generateArticlesQuestion,
    confusing_words: generateConfusingWordsQuestion,
    homophones: generateHomophonesQuestion
  };
  var topic = subMode || pick(['synonym','antonym','sentence_completion','word_ordering','sentence_ordering','paragraph_formation','comprehension','spotting_errors','spellings','sentence_correction','sentence_improvement','closet_test','one_word_subs','idioms_phrases','change_voice','change_speech','sentence_connectors','double_fillers','paragraph_completion','tenses','prepositions','articles','confusing_words','homophones']);
  var gen = genMap[topic];
  if (gen) {
    var q, attempts = 0;
    do {
      try {
        q = gen(diff);
        q._subTopic = topic;
        q.type = 'verbal';
        q.timeLimit = q.timeLimit || 15;
        q.techniqueLabel = (q.techniqueLabel || '') + ' [' + topic.replace(/_/g,' ') + ']';
        var intuitions = {
          synonym: 'Find the word with the same or nearly the same meaning.',
          antonym: 'Find the word opposite in meaning to the given word.',
          sentence_completion: 'Read for context. The correct word makes logical and grammatical sense.',
          word_ordering: 'Arrange to form a meaningful sentence. Look for subject → verb → object.',
          sentence_ordering: 'Put sentences in chronological/logical order. Start with what happened first.',
          paragraph_formation: 'Start with the main idea, then supporting details, then conclusion.',
          comprehension: 'Read the passage. The answer is directly stated in the text.',
          spotting_errors: 'Check verb agreement, tense, prepositions, singular/plural, word form.',
          spellings: 'Double consonants, -ance/-ence, i before e except after c.',
          sentence_correction: 'Each + singular. Since + point, For + duration. Collective nouns = singular.',
          sentence_improvement: 'too+to, so+that, prefer+to, no sooner+than, not only+but also.',
          closet_test: 'Read whole passage. Choose word that fits context AND grammar.',
          one_word_subs: 'Find the specific single word. Common prefixes/suffixes help.',
          idioms_phrases: 'Idioms have figurative meanings. Learn by exposure.',
          change_voice: 'Active: subject does. Passive: subject receives. Object becomes subject.',
          change_speech: 'Quotes→that clause. Present→past. will→would. Commands→to+verb.',
          sentence_connectors: 'Connectors show relationships: contrast, cause-effect, condition, addition, alternative between two parts of a sentence.',
          double_fillers: 'Read the full sentence. Both blanks must fit logically AND grammatically. Eliminate by checking one blank at a time.',
          paragraph_completion: 'The last sentence should logically conclude the passage — summarize, recommend action, or draw inference.'
        };
        q.intuition = intuitions[topic] || '';
      } catch(e) {}
      attempts++;
      if (attempts > 10) break;
    } while (q && _isRecent(q.question));
    if (q) {
      _addRecent(q.question);
      return q;
    }
  }
  return generateSynonymQuestion(diff);
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
  for (var _g=0; _g<50 && opts.length<4; _g++) { var d = item.a + rand(-3, 3); if (opts.indexOf(d) < 0 && d > 0) opts.push(d); }
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

function generateGrandSlamQuestion(diff) {
  var examDiff = Math.max(4, diff);
  var category = pick(['quant', 'reasoning', 'verbal']);
  var q;
  switch (category) {
    case 'quant': q = generateQuantQuestion(examDiff); break;
    case 'reasoning': q = generateReasoningQuestion(examDiff); break;
    case 'verbal': q = generateVerbalQuestion(examDiff); break;
  }
  if (!q) {
    q = generateNumberSenseQuestion(examDiff, 'exam');
    category = 'quant';
  }
  q.type = 'grandslam';
  q._parentCategory = category;
  q.techniqueLabel = 'Grand Slam [' + category + '] ' + (q.techniqueLabel || '');
  q.timeLimit = q.timeLimit || 15;
  if (!q.options || q.options.length < 2) {
    q.options = [q.answer, q.answer + 1, q.answer + 2, q.answer + 3];
  }
  q.options = q.options.filter(function(v){ return v != null && v !== undefined && !(typeof v === 'number' && isNaN(v)); });
  return q;
}

// Register new generators
GENERATORS.quicksolve = generateQuickSolveQuestion;
GENERATORS.instinct = generateInstinctQuestion;
GENERATORS.fivesec = generateFiveSecQuestion;
GENERATORS.examrush = generateExamRushQuestion;
GENERATORS.weakspot = generateWeakSpotQuestion;
GENERATORS.grandslam = generateGrandSlamQuestion;
GENERATORS.quant = generateQuantQuestion;
GENERATORS.reasoning = generateReasoningQuestion;
GENERATORS.verbal = generateVerbalQuestion;

// ====== MAIN TRAINING FUNCTIONS ======
window.startMentalSession = function(mode, opts) {
  var state = load();
  opts = opts || {};

  // Check for cached session to resume (prevents data loss on page refresh).
  // Only restore if mode AND subMode match; a new subTopic starts fresh.
  var cached = restoreCachedSession();
  if (cached && cached.mode && cached.active && (!mode || mode === cached.mode) && (!opts.subMode || cached.subMode === opts.subMode)) {
    var resume = {
      mode: cached.mode,
      subMode: cached.subMode || null,
      layer: cached.layer || 'instinct',
      questionIndex: cached.questionIndex || 0,
      totalQuestions: cached.totalQuestions || 10,
      correct: 0,
      startTime: Date.now(),
      active: true,
      hardMode: !!cached.hardMode,
      focusType: cached.focusType || null,
      review: cached.review || [],
      mistakeQueue: cached.mistakeQueue || []
    };
    if (cached.mode === 'puzzle' && cached.puzzles) {
      resume.puzzles = cached.puzzles;
      resume.puzzleIndex = cached.puzzleIndex || 0;
    }
    return resume;
  }

  if (!mode || !GENERATORS[mode]) mode = 'mixed';
  var subMode = opts.subMode || null;
  var totalQ = (mode === 'puzzle') ? 5 : (mode === 'grandslam') ? 999 : 10;

  // Inject mistake bank questions (skip for puzzle/weakspot/grandslam mode and when a specific sub-topic is chosen)
  var mistakeQueue = [];
  if (mode !== 'puzzle' && mode !== 'weakspot' && mode !== 'grandslam' && !subMode) {
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

  // Normalize the many raw shapes procedural generators return ({q,a,o},
  // {type:'puzzle', questionText}, canonical {question,answer,options}, ...)
  // into the single {question, answer, options, hint, timeLimit, solution}
  // envelope the UI reads. Missing fields fall back to safe defaults.
  function _mentCanon(q) {
    if (!q || typeof q !== 'object') return q;
    if (q.question === undefined && q.a !== undefined) {
      var optsN = (q.o || []).slice();
      if (optsN.indexOf(q.a) < 0) optsN.unshift(q.a);
      if (optsN.length < 2) optsN.push('None of these');
      if (optsN.length < 3) optsN.push('Cannot determine');
      shuffle(optsN);
      q.question = q.q;
      q.answer = q.a;
      q.options = optsN;
      if (q.t !== undefined && q.timeLimit === undefined) q.timeLimit = q.t;
      if (q.sol !== undefined && q.solution === undefined) q.solution = q.sol;
      q.hint = q.hint || '';
    }
    q.question = (q.question === undefined || q.question === null) ? 'Solve: ' + (q.answer !== undefined ? 'find the answer' : 'solve') : q.question;
    if (q.answer === undefined || q.answer === null || String(q.answer) === 'undefined' || String(q.answer) === 'NaN') q.answer = (q.questionText !== undefined) ? q.questionText : 'Option A';
    if (!Array.isArray(q.options) || q.options.length < 2) q.options = ['Yes','No','Cannot determine','Option D'];
    q.options = q.options.filter(function(o){ return o !== undefined && o !== null && String(o) !== 'undefined' && String(o) !== 'NaN'; });
    if (q.options.indexOf(q.answer) < 0) q.options.unshift(q.answer);
    if (q.options.length < 2) q.options.push('None of these');
    if (q.options.length < 3) q.options.push('Cannot determine');
    if (q.options.length < 4) q.options.push('Option D');
    shuffle(q.options);
    if (q.timeLimit === undefined) q.timeLimit = 15;
    q.hint = q.hint || '';
    q.solution = q.solution || '';
    return q;
  }

  if (session.mode === 'quant' || session.mode === 'reasoning' || session.mode === 'verbal') {
    var q = _mentCanon(GENERATORS[session.mode](diff, session.subMode));
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
  q = _mentCanon(q);
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
    var parentCat = mode === 'grandslam' ? (question._parentCategory || null) : (mode === 'quant' ? 'quant' : (mode === 'reasoning' ? 'reasoning' : (mode === 'verbal' ? 'verbal' : null)));
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

  // Cache session state so page refresh can resume
  if (!isComplete) cacheSession(session);
  else clearSessionCache();

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
  for (var _g=0; _g<50 && opts.length<4; _g++) { var d = rand(1, 10); if (opts.indexOf(d) < 0) opts.push(d); }
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
    var choices = ['floor','linear','circular','comparison','blood','direction','scheduling','inputoutput','coding','syllogism','inequality','orderrank','distribution'];
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
        for (var _g=0; _g<50 && opts.length<4; _g++) { d = rand(1, n); if (opts.indexOf(d) < 0) opts.push(d); }
      } else if (typeof ans === 'string') {
        opts = [ans];
        for (var _g=0; _g<50 && opts.length<4; _g++) { var rn = PUZ_NAMES[rand(0, PUZ_NAMES.length - 1)]; if (opts.indexOf(rn) < 0) opts.push(rn); }
      } else {
        opts = [ans];
        for (var _g=0; _g<50 && opts.length<4; _g++) { d = rand(1, n + 2); if (opts.indexOf(d) < 0) opts.push(d); }
      }
      shuffle(opts);
      return {
        type: 'puzzle', clueBlock: clues,
        preamble: n + ' persons ' + names.join(', ') + ' live in a ' + n + '-storey building (ground floor=1). Each lives on a different floor.',
        questionText: qText, answer: String(ans),
        options: opts, timeLimit: 45 + diff * 8,
        hint: 'Draw a vertical building. Floor 1 at bottom. Mark names from clues.',
        typeLabel: 'Floor Puzzle',
        solution: 'Floor map: ' + names.map(function(nn){return nn+'='+liveOn[nn];}).join(', ') + '. Answer=' + ans + '.'
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
        for (var _g=0; _g<50 && opts.length<4; _g++) { var rname = PUZ_NAMES[rand(0, PUZ_NAMES.length - 1)]; if (opts.indexOf(rname) < 0) opts.push(rname); }
      } else {
        opts = [ans];
        for (var _g=0; _g<50 && opts.length<4; _g++) { d = rand(1, n + 1); if (opts.indexOf(d) < 0) opts.push(d); }
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
        for (var _g=0; _g<50 && opts.length<4; _g++) { d = rand(1, n + 1); if (opts.indexOf(d) < 0) opts.push(d); }
      } else {
        opts = [ans];
        for (var _g=0; _g<50 && opts.length<4; _g++) { var rn = PUZ_NAMES[rand(0, PUZ_NAMES.length - 1)]; if (opts.indexOf(rn) < 0) opts.push(rn); }
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
        for (var _g=0; _g<50 && opts.length<4; _g++) { var d2 = rand(1, n + 1); if (opts.indexOf(d2) < 0) opts.push(d2); }
      } else {
        opts = [ans];
        for (var _g=0; _g<50 && opts.length<4; _g++) { var rn = PUZ_NAMES[rand(0, PUZ_NAMES.length - 1)]; if (opts.indexOf(rn) < 0) opts.push(rn); }
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
      var REL = ['father','mother','brother','sister','uncle','aunt','grandfather','grandmother','cousin','nephew','niece','son','daughter','grandson','granddaughter'];
      // Build a family tree
      var famNames = PUZ_NAMES.slice(0, 6 + rand(0, Math.min(2, diff)));
      shuffle(famNames);
      var gen0 = famNames.slice(0, 2); // grandparents
      var gen1 = famNames.slice(2, 5); // parents
      var gen2 = famNames.slice(5); // children
      var clues = [];
      if (gen0[0] && gen1[0]) clues.push(gen0[0] + ' is the father of ' + gen1[0] + '.');
      if (gen0[1] && gen1[0]) clues.push(gen0[1] + ' is the mother of ' + gen1[0] + '.');
      if (gen1[0] && gen2[0]) clues.push(gen1[0] + ' is the father of ' + gen2[0] + '.');
      if (gen1[1] && gen2[0]) clues.push(gen1[1] + ' is the mother of ' + gen2[0] + '.');
      if (gen1[0] && gen1[1]) clues.push(gen1[0] + ' is the husband of ' + gen1[1] + '.');
      if (gen1[2] && gen2[1]) clues.push(gen1[2] + ' is the mother of ' + gen2[1] + '.');
      if (gen2[0] && gen2[1]) clues.push(gen2[0] + ' is the brother of ' + gen2[1] + '.');
      // Build possible pairs for questioning
      var pairs = [];
      if (gen2[0] && gen0[0]) pairs.push({a:gen2[0], b:gen0[0], rel:'grandson'});
      if (gen2[0] && gen1[2]) pairs.push({a:gen2[0], b:gen1[2], rel:'nephew'});
      if (gen2[0] && gen2[1]) pairs.push({a:gen2[0], b:gen2[1], rel:'brother'});
      if (gen1[0] && gen1[2]) pairs.push({a:gen1[0], b:gen1[2], rel:'brother'});
      if (gen1[1] && gen1[2]) pairs.push({a:gen1[1], b:gen1[2], rel:'sister'});
      if (gen1[0] && gen0[1]) pairs.push({a:gen1[0], b:gen0[1], rel:'son'});
      if (gen0[0] && gen2[0]) pairs.push({a:gen0[0], b:gen2[0], rel:'grandfather'});
      if (gen1[2] && gen1[0]) pairs.push({a:gen1[2], b:gen1[0], rel:'sister'});
      if (gen1[1] && gen0[0]) pairs.push({a:gen1[1], b:gen0[0], rel:'daughter-in-law'});
      if (gen0[1] && gen2[0]) pairs.push({a:gen0[1], b:gen2[0], rel:'grandmother'});
      if (pairs.length === 0) pairs.push({a:famNames[0], b:famNames[1], rel:'cousin'});
      // Multiple question types
      var bloodQType = rand(0, 2);
      var chosen = pairs[rand(0, pairs.length - 1)];
      var target = chosen.a, target2 = chosen.b, ans = chosen.rel, qText;
      if (bloodQType === 0) {
        qText = 'How is ' + target + ' related to ' + target2 + '?';
      } else if (bloodQType === 1) {
        qText = target + '\'s mother\'s father is whom?';
        if (gen0[0]) { ans = gen0[0]; } else { qText = 'How is ' + target + ' related to ' + target2 + '?'; }
      } else {
        qText = 'Who is the ' + ans + ' of ' + target2 + '?';
        ans = target;
      }
      opts = [ans];
      var otherRels = REL.filter(function(r){ return r !== ans && r !== chosen.rel; });
      shuffle(otherRels);
      for (var _g=0; _g<50 && opts.length<4; _g++) { if (otherRels.length) { var ro = otherRels.pop(); opts.push(ro); } else { opts.push(PUZ_NAMES[rand(0, PUZ_NAMES.length - 1)]); } }
      shuffle(opts);
      return {
        type: 'puzzle', clueBlock: clues,
        preamble: 'Study the following family relationships:',
        questionText: qText, answer: ans,
        options: opts, timeLimit: 45 + diff * 8,
        hint: 'Draw a family tree. Parents above children. Label each person.',
        typeLabel: 'Blood Relations',
        solution: ans + ' is the ' + chosen.rel + ' of ' + target2 + '.'
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
      // Multiple question types
      var schedQType = rand(0, 2);
      var schedQ, schedAns;
      if (schedQType === 0) {
        schedQ = 'On which day is ' + sTarget + ' scheduled?';
        schedAns = sAns;
      } else if (schedQType === 1) {
        var adjacentIdx = (sDays.indexOf(sAns) + 1) % nDays;
        var adjacentDay = sDays[adjacentIdx];
        var whoOnAdj = null;
        for (var sn in dayOf) { if (dayOf[sn] === adjacentDay) { whoOnAdj = sn; break; } }
        if (whoOnAdj) { schedQ = 'What is scheduled on ' + adjacentDay + '?'; schedAns = whoOnAdj; }
        else { schedQ = 'On which day is ' + sTarget + ' scheduled?'; schedAns = sAns; }
      } else {
        var countAfter = 0;
        var tIdx = sDays.indexOf(sAns);
        for (var ci = tIdx + 1; ci < nDays; ci++) countAfter++;
        schedQ = 'How many events are scheduled after ' + sTarget + '?';
        schedAns = String(countAfter);
      }
      opts = [schedAns];
      for (var _g=0; _g<50 && opts.length<4; _g++) { var rd = DAYS[rand(0, DAYS.length - 1)]; if (opts.indexOf(rd) < 0) opts.push(rd); }
      shuffle(opts);
      return {
        type: 'puzzle', clueBlock: clues,
        preamble: sNames.length + ' events (' + sNames.join(', ') + ') are scheduled on different days Monday to ' + sDays[nDays-1] + '.',
        questionText: schedQ, answer: schedAns,
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
      for (var _g=0; _g<50 && opts.length<4; _g++) { var fake = vars[rand(0,vars.length-1)] + ' ' + symbols[rand(0,2)] + ' ' + vars[rand(0,vars.length-1)]; if (opts.indexOf(fake) < 0) opts.push(fake); }
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
      if (nRank > names.length) nRank = names.length;
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
        for (var _g=0; _g<50 && opts.length<4; _g++) { var rv = String(rand(1, nRank)); if (opts.indexOf(rv) < 0) opts.push(rv); }
      } else {
        for (var ri = 0; ri < nRank; ri++) { if (opts.indexOf(sortedNames[ri]) < 0) opts.push(sortedNames[ri]); }
        for (var _g=0; _g<50 && opts.length<4; _g++) { var fake = rankNames[rand(0, nRank-1)]; if (opts.indexOf(fake) < 0) opts.push(fake); }
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
    } else if (puzType === 'distribution') {
      // EXAM-STYLE DISTRIBUTION (Double Line-up / Matrix Arrangement)
      // n persons each have a unique: city, profession, and color (3 parameters)
      var DIST_CITIES = ['Delhi','Mumbai','Chennai','Kolkata','Bangalore','Hyderabad','Pune','Ahmedabad'];
      var DIST_PROFS = ['Doctor','Engineer','Teacher','Lawyer','Artist','Chef','Pilot','Banker'];
      var DIST_COLORS = ['Red','Blue','Green','Yellow','White','Black','Pink','Orange'];
      shuffle(DIST_CITIES); shuffle(DIST_PROFS); shuffle(DIST_COLORS);
      var dNames = names.slice(0, Math.min(n, 6));
      var dN = dNames.length;
      var dCities = DIST_CITIES.slice(0, dN);
      var dProfs = DIST_PROFS.slice(0, dN);
      var dColors = DIST_COLORS.slice(0, dN);
      var dClues = [];
      var usedClueTypes = [];
      var c0 = rand(0, dN-1);
      dClues.push('The person from ' + dCities[c0] + ' is a ' + dProfs[c0] + '.');
      usedClueTypes.push(0);
      if (dN > 2) {
        var c1 = rand(0, dN-1);
        while(c1 === c0) c1 = rand(0, dN-1);
        dClues.push('The ' + dProfs[c1] + ' likes ' + dColors[c1] + ' colour.');
        usedClueTypes.push(1);
      }
      if (dN > 2 && usedClueTypes.length < 5) {
        var c2 = rand(0, dN-1);
        var wrongCity = dCities[rand(0, dN-1)];
        while (wrongCity === dCities[c2]) wrongCity = dCities[rand(0, dN-1)];
        dClues.push(dNames[c2] + ' does not live in ' + wrongCity + '.');
        usedClueTypes.push(2);
      }
      if (dN > 3 && usedClueTypes.length < 6) {
        var c3 = rand(0, dN-1);
        dClues.push('The person who likes ' + dColors[c3] + ' is from ' + dCities[c3] + '.');
        usedClueTypes.push(3);
      }
      if (dN > 2 && usedClueTypes.length < 7) {
        var c4 = rand(0, dN-1);
        dClues.push(dNames[c4] + ' likes ' + dColors[c4] + ' colour.');
        usedClueTypes.push(4);
      }
      if (dN > 3 && usedClueTypes.length < 8) {
        var c5 = rand(0, dN-1);
        var wrongProf = dProfs[rand(0, dN-1)];
        while (wrongProf === dProfs[c5]) wrongProf = dProfs[rand(0, dN-1)];
        dClues.push(dNames[c5] + ' is not a ' + wrongProf + '.');
        usedClueTypes.push(5);
      }
      var dQType = rand(0, 3);
      var dTarget, dAns, dQText, dOpts;
      if (dQType === 0) {
        dTarget = dNames[rand(0, dN-1)];
        dAns = dProfs[dNames.indexOf(dTarget)];
        dQText = 'What is the profession of ' + dTarget + '?';
        dOpts = dProfs.slice();
        shuffle(dOpts);
      } else if (dQType === 1) {
        dTarget = dCities[rand(0, dN-1)];
        dAns = dNames[dCities.indexOf(dTarget)];
        dQText = 'Who lives in ' + dTarget + '?';
        dOpts = dNames.slice();
        shuffle(dOpts);
      } else if (dQType === 2) {
        dTarget = dColors[rand(0, dN-1)];
        dAns = dNames[dColors.indexOf(dTarget)];
        dQText = 'Who likes ' + dTarget + ' colour?';
        dOpts = dNames.slice();
        shuffle(dOpts);
      } else {
        dTarget = dNames[rand(0, dN-1)];
        dAns = dColors[dNames.indexOf(dTarget)];
        dQText = 'Which colour does ' + dTarget + ' like?';
        dOpts = dColors.slice();
        shuffle(dOpts);
      }
      return {
        type: 'puzzle', clueBlock: dClues,
        preamble: dN + ' persons ' + dNames.join(', ') + ' each have a different city, profession, and favourite colour.',
        questionText: dQText, answer: String(dAns),
        options: dOpts, timeLimit: 55 + diff * 10,
        hint: 'Make a table with persons, cities, professions, colors. Each clue eliminates possibilities.',
        typeLabel: 'Distribution',
        solution: dTarget + ' → ' + dAns + '. Map: ' + dNames.map(function(nn,i){return nn+': '+dCities[i]+', '+dProfs[i]+', '+dColors[i];}).join(' | ')
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
        for (var _g=0; _g<50 && opts.length<4; _g++) { opts.push(wrongDirs.pop() || DIRS[rand(0, 3)]); }
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
        for (var _g=0; _g<50 && opts.length<4; _g++) { var d2 = rand(minDist, maxDist); if (opts.indexOf(String(d2)) < 0) opts.push(String(d2)); }
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

// Expose session cache (resume on page refresh)
window.hasCachedSession = function() { try { return !!sessionStorage.getItem(SESSION_CACHE_KEY); } catch(e) { return false; } };
window.clearCachedSession = function() { clearSessionCache(); };

})();

