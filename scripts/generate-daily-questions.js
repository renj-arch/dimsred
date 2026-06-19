var fs = require('fs');
var path = require('path');

var bankDir = path.resolve(__dirname, '..', 'question-bank');

// ========== PARAMETERIZED TEMPLATE ENGINE ==========

function rng(seed) {
  return function() {
    seed = (seed * 1664525 + 1013904223) & 0xFFFFFFFF;
    return (seed >>> 0) / 0xFFFFFFFF;
  };
}

function randInt(r, min, max) { return Math.floor(r() * (max - min + 1)) + min; }
function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }
function fmt(t, vals) { return t.replace(/\{(\w+)\}/g, function(m, k) { return vals[k] !== undefined ? vals[k] : m; }); }

// ========== TEMPLATE DEFINITIONS ==========

var T = {};

T['General Intelligence & Reasoning'] = function(r) {
  var types = ['analogy', 'series', 'coding', 'direction', 'blood'];
  switch (pick(r, types)) {
    case 'analogy': {
      var pairs = [['Doctor', 'Hospital', 'Teacher', 'School'], ['Pen', 'Write', 'Knife', 'Cut'], ['Bird', 'Fly', 'Fish', 'Swim'], ['Eye', 'See', 'Ear', 'Hear'], ['Hot', 'Cold', 'Big', 'Small']];
      var p = pick(r, pairs);
      return { text: fmt('{0} is to {1} as {2} is to ?', [p[0], p[1], p[2]]), opts: [p[3], pick(r, pairs)[0], pick(r, pairs)[2], pick(r, pairs)[3]], ans: 0, sol: fmt('As {0} works in a {1}, {2} works in a {3}.', [p[0], p[1], p[2], p[3]]) };
    }
    case 'series': {
      var start = randInt(r, 2, 10), diff = randInt(r, 2, 8);
      var a1 = start, a2 = start + diff, a3 = start + 2 * diff, a4 = start + 3 * diff, a5 = start + 4 * diff;
      return { text: fmt('Find the next term: {0}, {1}, {2}, {3}, ?', [a1, a2, a3, a4]), opts: [a5, a5 + diff, a5 - diff, a5 + 1].map(String), ans: 0, sol: fmt('Common difference = {0}. Next = {1} + {0} = {2}', [diff, a4, a5]) };
    }
    case 'coding': {
      var word = pick(r, ['CLOCK', 'TABLE', 'CHAIR', 'HOUSE', 'MONEY']);
      var code = word.split('').map(function(c) { return c.charCodeAt(0) - 64; }).join('-');
      return { text: fmt('If {0} is coded as {1}, how is {2} coded?', [word, code, word.split('').reverse().join('')]), opts: [word.split('').reverse().map(function(c) { return c.charCodeAt(0) - 64; }).join('-'), code, word.split('').map(function(c) { return c.charCodeAt(0) - 65; }).join('-'), word.split('').reverse().map(function(c) { return c.charCodeAt(0) - 65; }).join('-')], ans: 0, sol: fmt('Each letter replaced by its position in alphabet. Same logic for reversed word.', []) };
    }
    case 'direction': {
      var d1 = pick(r, ['North', 'South', 'East', 'West']);
      var d2 = pick(r, ['right', 'left']);
      var dist1 = randInt(r, 3, 10), dist2 = randInt(r, 3, 10);
      var dirMap = { North: { right: 'East', left: 'West' }, South: { right: 'West', left: 'East' }, East: { right: 'South', left: 'North' }, West: { right: 'North', left: 'South' } };
      var d3 = dirMap[d1][d2];
      return { text: fmt('A man walks {0} km {1}, turns {2} and walks {3} km. How far is he from start?', [dist1, d1.toLowerCase(), d2, dist2]), opts: [fmt('{0} km', [Math.abs(dist1 - dist2)]), fmt('{0} km', [dist1 + dist2]), fmt('{0} km', [Math.max(dist1, dist2)]), fmt('{0} km', [Math.min(dist1, dist2)])], ans: 0, sol: fmt('The {1} and {2} directions cancel partially. Net = |{0} - {3}| = {4} km', [dist1, d1, d3, dist2, Math.abs(dist1 - dist2)]) };
    }
    case 'blood': {
      var subjects = [['Ram', 'Shyam'], ['A', 'B'], ['X', 'Y'], ['P', 'Q']];
      var s = pick(r, subjects);
      return { text: fmt('{0} is the brother of {1}. {1} is the son of {2}. How is {0} related to {2}?', [s[0], s[1], pick(r, ['Raja', 'Sita', 'Mohan', 'Geeta'])]), opts: ['Son', 'Brother', 'Father', 'Nephew'], ans: 0, sol: fmt('{0} and {1} are brothers. Their father is {2}. So {0} is son of {2}.', [s[0], s[1], 'their father']) };
    }
  }
};

T['Quantitative Aptitude'] = function(r) {
  var types = ['percentage', 'average', 'timework', 'simpleinterest', 'ratio'];
  switch (pick(r, types)) {
    case 'percentage': {
      var p = pick(r, [5, 8, 10, 12, 15, 18, 20, 25]), n = randInt(r, 4, 20) * 10;
      var ans = (p / 100) * n;
      return { text: fmt('What is {0}% of {1}?', [p, n]), opts: [ans, ans + n / 10, ans - n / 20, ans * 2].map(String), ans: 0, sol: fmt('({0}/100) × {1} = {2}', [p, n, ans]) };
    }
    case 'average': {
      var n = randInt(r, 3, 6), sum = 0, nums = [];
      for (var i = 0; i < n; i++) { var v = randInt(r, 10, 50); nums.push(v); sum += v; }
      var avg = sum / n;
      return { text: fmt('Average of [{0}] is:', [nums.join(', ')]), opts: [avg, avg + 1, avg - 1, avg + 2].map(function(x) { return Math.round(x * 100) / 100; }).map(String), ans: 0, sol: fmt('Sum = {0}, Count = {1}, Average = {0}/{1} = {2}', [sum, n, avg]) };
    }
    case 'timework': {
      var m = randInt(r, 2, 6), d = randInt(r, 6, 15);
      var ansD = Math.ceil((m * d) / (m + 1));
      return { text: fmt('{0} men can do a work in {1} days. How many days will {2} men take?', [m, d, m + 1]), opts: [ansD, ansD + 1, ansD - 1, ansD + 2].map(String), ans: 0, sol: fmt('M1×D1 = M2×D2. {0}×{1} = {2}×D → D = {3}', [m, d, m + 1, ansD]) };
    }
    case 'simpleinterest': {
      var p = randInt(r, 10, 50) * 100, rate = pick(r, [5, 6, 8, 10]), t = randInt(r, 1, 4);
      var si = (p * rate * t) / 100;
      return { text: fmt('Simple interest on ₹{0} at {1}% for {2} years:', [p, rate, t]), opts: [si, si + p / 20, si * 2, si / 2].map(String), ans: 0, sol: fmt('SI = ({0}×{1}×{2})/100 = ₹{3}', [p, rate, t, si]) };
    }
    case 'ratio': {
      var a = randInt(r, 2, 7), b = randInt(r, 2, 7), c = randInt(r, 2, 7), d = randInt(r, 2, 7);
      while (b === a) b = randInt(r, 2, 7);
      var a_c = a * c, b_d = b * d;
      return { text: fmt('If a:b = {0}:{1} and b:c = {2}:{3}, find a:c', [a, b, c, d]), opts: [fmt('{0}:{1}', [a * c, b * d]), fmt('{0}:{1}', [a * d, b * c]), fmt('{0}:{1}', [a + c, b + d]), fmt('{0}:{1}', [a, d])].map(String), ans: 0, sol: fmt('a:c = (a:b)×(b:c) = {0}/{1} × {2}/{3} = {4}:{5}', [a, b, c, d, a * c, b * d]) };
    }
  }
};

T['General Awareness'] = function(r) {
  var qs = [
    {t:'RBI lends to banks at which rate?', o:['Repo Rate','Reverse Repo','Bank Rate','SLR'], a:0, s:'Repo Rate is the rate at which RBI lends to commercial banks.'},
    {t:'Full form of NBFC:', o:['Non-Banking Financial Company','National Banking Finance Corp','National Bureau of Financial Credit','Non-Banking Fiscal Corp'], a:0, s:'NBFC = Non-Banking Financial Company'},
    {t:'Which is a direct tax?', o:['Income Tax','GST','Excise Duty','Customs Duty'], a:0, s:'Income Tax is a direct tax; GST and duties are indirect.'},
    {t:'IMF headquarters:', o:['Washington DC','New York','Geneva','London'], a:0, s:'IMF is headquartered in Washington DC, USA.'},
    {t:'CRR stands for:', o:['Cash Reserve Ratio','Credit Reserve Ratio','Capital Reserve Ratio','Cash Requirement Ratio'], a:0, s:'CRR is portion of deposits kept with RBI as cash.'},
    {t:'Oldest bank in India:', o:['SBI','Bank of India','Bank of Baroda','PNB'], a:0, s:'SBI (est. 1806 as Bank of Calcutta) is oldest.'},
    {t:'Mudra Yojana loan limit:', o:['₹10 lakh','₹5 lakh','₹15 lakh','₹20 lakh'], a:0, s:'Mudra loans up to ₹10 lakh in Shishu/Kishor/Tarun.'},
    {t:'Bad Bank in India:', o:['NARCL','ARCIL','IDRCL','SBI ARC'], a:0, s:'National Asset Reconstruction Company Ltd (NARCL).'},
    {t:'SEBI headquarters:', o:['Mumbai','Delhi','Kolkata','Chennai'], a:0, s:'SEBI is headquartered in Mumbai.'},
    {t:'SLR stands for:', o:['Statutory Liquidity Ratio','Standard Liquidity Rate','State Liquidity Ratio','Statutory Loan Rate'], a:0, s:'SLR is the portion of deposits banks must keep in approved securities.'}
  ];
  var q = pick(r, qs);
  return { text: q.t, opts: q.o, ans: q.a, sol: q.s };
};

T['English Language'] = function(r) {
  var qs = [
    {t:'Synonym of "Abundant":', o:['Plentiful','Scarce','Dull','Empty'], a:0, s:'Abundant means plentiful.'},
    {t:'Antonym of "Generous":', o:['Stingy','Kind','Charitable','Liberal'], a:0, s:'Stingy is opposite of generous.'},
    {t:'Correct spelling:', o:['Accommodate','Accomodate','Acommodate','Acocomodate'], a:0, s:'Correct: Accommodate (double c, double m).'},
    {t:'Idiom "burn midnight oil":', o:['Work late','Wake late','Waste fuel','Cook at night'], a:0, s:'Means to work late into the night.'},
    {t:'Article before "university":', o:['a','an','the','no article'], a:0, s:'"University" starts with consonant sound /juː/, so "a".'},
    {t:'Past tense of "teach":', o:['taught','teached','teached','teached'], a:0, s:'Teach → taught (irregular).'},
    {t:'One who collects stamps:', o:['Philatelist','Numismatist','Collector','Bibliophile'], a:0, s:'Philatelist = stamp collector. Numismatist = coin collector.'},
    {t:'She is afraid ___ dogs:', o:['of','from','with','about'], a:0, s:'"Afraid of" is correct collocation.'},
    {t:'Correct passive: "She writes a letter":', o:['A letter is written by her','A letter was written by her','A letter has been written','A letter had been written'], a:0, s:'Simple present passive: is/am/are + past participle.'},
    {t:'One who cannot read/write:', o:['Illiterate','Uneducated','Ignorant','Illogical'], a:0, s:'Illiterate means unable to read or write.'}
  ];
  var q = pick(r, qs);
  return { text: q.t, opts: q.o, ans: q.a, sol: q.s };
};

T['Physics'] = function(r) {
  var qs = [
    {t:'A body of mass 2 kg has momentum 10 kg·m/s. Its velocity is:', o:['5 m/s','10 m/s','20 m/s','2.5 m/s'], a:0, s:'p = mv → v = 10/2 = 5 m/s'},
    {t:'SI unit of force:', o:['Newton','Joule','Watt','Pascal'], a:0, s:'Force is measured in Newtons.'},
    {t:'Speed of light in vacuum:', o:['3×10⁸ m/s','3×10⁶ m/s','3×10¹⁰ m/s','3×10⁵ m/s'], a:0, s:'Speed of light = 3×10⁸ m/s.'},
    {t:'Which law states action=reaction?', o:['Newton\'s Third','Newton\'s First','Newton\'s Second','Gravitation'], a:0, s:'Newton\'s Third Law: every action has equal and opposite reaction.'},
    {t:'Unit of electric current:', o:['Ampere','Volt','Ohm','Watt'], a:0, s:'Current is measured in Amperes.'},
    {t:'Focal length of a lens with power 2D:', o:['0.5 m','2 m','5 m','0.2 m'], a:0, s:'f = 1/P = 1/2 = 0.5 m'},
    {t:'Escape velocity of Earth:', o:['11.2 km/s','7.9 km/s','15 km/s','3 km/s'], a:0, s:'Escape velocity = √(2GM/R) ≈ 11.2 km/s.'},
    {t:'Ohm\'s law relates:', o:['V = IR','P = VI','E = mc²','F = ma'], a:0, s:'Ohm\'s law: V = IR.'}
  ];
  var q = pick(r, qs);
  return { text: q.t, opts: q.o, ans: q.a, sol: q.s };
};

T['Chemistry'] = function(r) {
  var qs = [
    {t:'pH of 0.001 M HCl:', o:['3','1','2','4'], a:0, s:'[H⁺] = 10⁻³, pH = -log(10⁻³) = 3'},
    {t:'Most abundant element in Earth\'s crust:', o:['Oxygen','Silicon','Aluminium','Iron'], a:0, s:'Oxygen (~46.6%) is most abundant.'},
    {t:'Hybridization of CH₄:', o:['sp³','sp²','sp','dsp²'], a:0, s:'Methane has sp³ hybridization, tetrahedral geometry.'},
    {t:'Chemical symbol for gold:', o:['Au','Go','Gd','Ag'], a:0, s:'Au from Latin "Aurum".'},
    {t:'Which is a noble gas?', o:['Xenon','Chlorine','Oxygen','Nitrogen'], a:0, s:'Xenon (Xe) is a noble gas.'},
    {t:'Atomic number of Carbon:', o:['6','4','8','12'], a:0, s:'Carbon has atomic number 6.'}
  ];
  var q = pick(r, qs);
  return { text: q.t, opts: q.o, ans: q.a, sol: q.s };
};

T['Mathematics'] = function(r) {
  var a = randInt(r, 2, 10), b = randInt(r, 1, 15), c = a * randInt(r, 1, 5) + b;
  var x = (c - b) / a;
  var qs = [
    {t: fmt('If {0}x + {1} = {2}, find x', [a, b, c]), o: [String(x), String(x + 1), String(x - 1), String(x * 2)], a: 0, s: fmt('{0}x = {2} - {1} = {3}, x = {3}/{0} = {4}', [a, b, c, c - b, x])},
    {t: fmt('LCM of {0} and {1}:', [a * 2, a * 3]), o: [String(a * 6), String(a * 3), String(a * 2), String(a)], a: 0, s: fmt('LCM({0},{1}) = {2}', [a * 2, a * 3, a * 6])},
    {t: fmt('Area of square with side {0} cm:', [a]), o: [fmt('{0} cm²', [a * a]), fmt('{0} cm', [4 * a]), fmt('{0} cm', [a]), fmt('{0} cm²', [2 * a])], a: 0, s: fmt('Area = side² = {0}² = {1} cm²', [a, a * a])}
  ];
  return pick(r, qs);
};

T['General Knowledge'] = function(r) {
  var qs = [
    {t:'First President of India:', o:['Rajendra Prasad','Jawaharlal Nehru','S. Radhakrishnan','Mahatma Gandhi'], a:0, s:'Dr. Rajendra Prasad was first President (1950-1962).'},
    {t:'National animal of India:', o:['Tiger','Lion','Elephant','Peacock'], a:0, s:'Bengal Tiger is India\'s national animal.'},
    {t:'Longest river in India:', o:['Ganga','Yamuna','Brahmaputra','Godavari'], a:0, s:'Ganga (2,525 km) is longest.'},
    {t:'Highest gallantry award:', o:['Param Vir Chakra','Ashok Chakra','Mahavir Chakra','Kirti Chakra'], a:0, s:'Param Vir Chakra is highest military decoration.'},
    {t:'Smallest state by area:', o:['Goa','Sikkim','Tripura','Nagaland'], a:0, s:'Goa (3,702 sq km) is smallest.'},
    {t:'Himalayas are which type of mountains?', o:['Fold','Block','Volcanic','Residual'], a:0, s:'Fold mountains formed by tectonic plate collision.'}
  ];
  return pick(r, qs);
};

T['Biology'] = function(r) {
  var qs = [
    {t:'Photosynthesis occurs in:', o:['Chloroplast','Mitochondria','Nucleus','Ribosome'], a:0, s:'Chloroplasts are the sites of photosynthesis.'},
    {t:'Human heart has how many chambers?', o:['4','2','3','5'], a:0, s:'Human heart has 4 chambers: 2 atria, 2 ventricles.'},
    {t:'Vitamin synthesized in sunlight:', o:['Vitamin D','Vitamin A','Vitamin C','Vitamin B'], a:0, s:'Vitamin D is synthesized in skin on sun exposure.'},
    {t:'Functional unit of kidney:', o:['Nephron','Neuron','Alveolus','Villus'], a:0, s:'Nephron is the functional unit of kidney.'},
    {t:'Longest bone in human body:', o:['Femur','Humerus','Tibia','Fibula'], a:0, s:'Femur (thigh bone) is longest.'},
    {t:'Haemoglobin contains which metal?', o:['Iron','Copper','Magnesium','Zinc'], a:0, s:'Haemoglobin contains iron (Fe²⁺) for oxygen binding.'}
  ];
  return pick(r, qs);
};

T['Reasoning'] = function(r) {
  var a = randInt(r, 1, 10), d = randInt(r, 2, 6);
  return {
    text: fmt('Find next: {0}, {1}, {2}, {3}, ?', [a, a + d, a + 2 * d, a + 3 * d]),
    opts: [a + 4 * d, a + 5 * d, a + 3 * d + 1, a + 4 * d - 1].map(String),
    ans: 0,
    sol: fmt('Difference = {0}. Next = {1} + {0} = {2}', [d, a + 3 * d, a + 4 * d])
  };
};

T['Science'] = function(r) {
  var qs = [
    {t:'Chemical formula of water:', o:['H₂O','CO₂','NaCl','HCl'], a:0, s:'Water = H₂O.'},
    {t:'Which planet is nearest to Sun?', o:['Mercury','Venus','Earth','Mars'], a:0, s:'Mercury is closest to the Sun.'},
    {t:'Unit of electric current:', o:['Ampere','Volt','Watt','Ohm'], a:0, s:'Current = Ampere.'},
    {t:'Freezing point of water (°C):', o:['0','100','-1','32'], a:0, s:'Water freezes at 0°C.'},
    {t:'Which gas plants absorb?', o:['Carbon dioxide','Oxygen','Nitrogen','Hydrogen'], a:0, s:'Plants absorb CO₂ for photosynthesis.'}
  ];
  return pick(r, qs);
};

T['General Studies'] = T['General Knowledge'];
T['Current Affairs & GK'] = T['General Awareness'];

// ========== EXAM → SECTION → TEMPLATE MAPPING ==========

var EXAM_SECTIONS = {
  cgl: ['General Intelligence & Reasoning', 'Quantitative Aptitude', 'General Awareness', 'English Language'],
  rbi: ['General Awareness', 'Quantitative Aptitude', 'Reasoning', 'English Language'],
  jee: ['Physics', 'Chemistry', 'Mathematics'],
  neet: ['Physics', 'Chemistry', 'Biology'],
  gate: ['Quantitative Aptitude', 'General Awareness'],
  upsc: ['General Studies', 'Quantitative Aptitude', 'General Awareness', 'English Language'],
  'ibps-po': ['Reasoning', 'Quantitative Aptitude', 'English Language', 'General Awareness'],
  'sbi-clerk': ['Reasoning', 'Quantitative Aptitude', 'English Language', 'General Awareness'],
  'ssc-gd': ['General Knowledge', 'Mathematics', 'Reasoning', 'English Language'],
  'ctet': ['General Knowledge', 'Quantitative Aptitude', 'English Language'],
  agniveer: ['General Knowledge', 'Mathematics', 'Science', 'Reasoning'],
  nda: ['Mathematics', 'General Knowledge'],
  cds: ['English Language', 'General Knowledge', 'Mathematics'],
  clat: ['English Language', 'Current Affairs & GK', 'Reasoning', 'Quantitative Aptitude']
};

function generateQuestions(exam, count) {
  var sections = EXAM_SECTIONS[exam];
  if (!sections) { console.error('Unknown exam: ' + exam); return []; }

  var questions = [];
  var r = rng(Date.now());
  var secCount = Math.ceil(count / sections.length);

  for (var si = 0; si < sections.length; si++) {
    var sec = sections[si];
    var gen = T[sec];
    if (!gen) { gen = T['General Awareness']; }

    for (var i = 0; i < secCount && questions.length < count; i++) {
      var q = gen(r);
      if (!q || !q.text) continue;
      var opts = q.opts.slice();
      // Shuffle options but track correct position
      var correctLabel = String.fromCharCode(65 + q.ans);
      var labels = ['A', 'B', 'C', 'D'];
      // Fisher-Yates shuffle
      for (var j = opts.length - 1; j > 0; j--) {
        var k = Math.floor(r() * (j + 1));
        var tmp = opts[j]; opts[j] = opts[k]; opts[k] = tmp;
      }
      // Find where correct answer moved
      var newAns = opts.indexOf(q.opts[q.ans]);
      if (newAns === -1) newAns = 0;

      questions.push({
        section: sec,
        text: q.text,
        options: opts.map(function(o, idx) { return { label: labels[idx], text: o, correct: idx === newAns }; }),
        solution: q.sol || ''
      });
    }
  }

  return questions;
}

// ========== MAIN ==========

function run() {
  var args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: node scripts/generate-daily-questions.js <exam1> [exam2] ...');
    console.log('Use "all" for all exams');
    console.log('Set count with --count=N (default 15)');
    return;
  }

  var count = 15;
  var minUnused = 0; // 0 = use default threshold (count * 2)
  var exams = [];
  for (var i = 0; i < args.length; i++) {
    var m = args[i].match(/^--count=(\d+)$/);
    if (m) { count = parseInt(m[1]); continue; }
    var n = args[i].match(/^--min=(\d+)$/);
    if (n) { minUnused = parseInt(n[1]); continue; }
    exams.push(args[i].toLowerCase());
  }

  if (exams.length === 1 && exams[0] === 'all') {
    exams = Object.keys(EXAM_SECTIONS);
  }

  var totalAdded = 0;
  for (var ei = 0; ei < exams.length; ei++) {
    var exam = exams[ei];
    var bankPath = path.join(bankDir, exam + '.json');

    if (!fs.existsSync(bankPath)) {
      console.log(exam + ': bank not found, skipping');
      continue;
    }

    var bank = JSON.parse(fs.readFileSync(bankPath, 'utf-8'));
    var questions = bank.questions || [];

    // Check if refill needed
    var metaPath = path.join(bankDir, exam + '-meta.json');
    var usedIds = [];
    if (fs.existsSync(metaPath)) {
      try { var m = JSON.parse(fs.readFileSync(metaPath, 'utf-8')); usedIds = m.usedIds || []; } catch(e) {}
    }
    var unused = questions.filter(function(q) { return usedIds.indexOf(q.id) === -1; });

    // Only generate if bank is running low (use minUnused when specified, e.g. for mock tests)
    var threshold = minUnused > 0 ? minUnused : count * 2;
    var needRefill = unused.length < threshold;
    if (!needRefill) {
      console.log(exam + ': ' + unused.length + ' unused, skipping (threshold ' + (count * 2) + ')');
      continue;
    }

    var newQs = generateQuestions(exam, count);
    if (newQs.length === 0) { console.log(exam + ': no questions generated'); continue; }

    var maxId = 0;
    for (var qi = 0; qi < questions.length; qi++) { if (questions[qi].id > maxId) maxId = questions[qi].id; }

    for (var ni = 0; ni < newQs.length; ni++) {
      maxId++;
      questions.push({
        id: maxId,
        q: questions.length + 1,
        section: newQs[ni].section,
        text: newQs[ni].text,
        options: newQs[ni].options,
        solution: newQs[ni].solution
      });
    }

    bank.questions = questions;
    fs.writeFileSync(bankPath, JSON.stringify(bank, null, 2), 'utf-8');

    // Clear meta so usedIds resets (existing questions are reusable)
    if (fs.existsSync(metaPath)) {
      try {
        var m2 = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        // Only clear if bank was very low — keep usedIds, just add new question IDs
        // Actually let's NOT clear meta — papers track used IDs to avoid repeats
      } catch(e) {}
    }

    console.log(exam + ': added ' + newQs.length + ' questions (total: ' + questions.length + ')');
    totalAdded += newQs.length;
  }

  console.log('\nTotal added: ' + totalAdded + ' questions');
}

run();
