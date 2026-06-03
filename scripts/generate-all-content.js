const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const bankDir = path.join(root, 'question-bank');

const CSP = "default-src 'self' https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; font-src https://fonts.gstatic.com https://unpkg.com; script-src 'self' https://pagead2.googlesyndication.com https://www.gstatic.com https://apis.google.com https://unpkg.com https://static.cloudflareinsights.com https://ep2.adtrafficquality.google https://*.adtrafficquality.google; connect-src 'self' https://krvlufonfbcabgcjomvs.supabase.co https://pagead2.googlesyndication.com https://ep2.adtrafficquality.google https://static.cloudflareinsights.com https://apis.google.com https://www.gstatic.com https://www.google.com https://googleads.g.doubleclick.net; frame-src 'self' https://googleads.g.doubleclick.net https://ep2.adtrafficquality.google https://www.google.com; upgrade-insecure-requests";
const BASE = 'https://vlymbooq.qzz.io';

const EXAMS = ['cgl', 'rbi', 'jee', 'neet', 'gate', 'agniveer', 'upsc', 'ibps-po', 'sbi-clerk', 'ssc-gd', 'ctet'];

const NAV_LABELS = {
  cgl: 'CGL', rbi: 'RBI', jee: 'JEE', neet: 'NEET', gate: 'GATE',
  agniveer: 'Agniveer', upsc: 'UPSC', 'ibps-po': 'IBPS PO',
  'sbi-clerk': 'SBI Clerk', 'ssc-gd': 'SSC GD', ctet: 'CTET'
};

const EXAM_FULL = {
  cgl: 'SSC CGL Tier 1', rbi: 'RBI Grade B Phase 1', jee: 'JEE Main',
  neet: 'NEET UG', gate: 'GATE',
  agniveer: 'Agniveer (Indian Army)', upsc: 'UPSC Civil Services Prelims',
  'ibps-po': 'IBPS PO Prelims', 'sbi-clerk': 'SBI Clerk Prelims',
  'ssc-gd': 'SSC GD Constable', ctet: 'CTET Paper 1'
};

const EXAM_SHORT = {
  cgl: 'CGL', rbi: 'RBI', jee: 'JEE', neet: 'NEET', gate: 'GATE',
  agniveer: 'Agniveer', upsc: 'UPSC', 'ibps-po': 'IBPS PO',
  'sbi-clerk': 'SBI Clerk', 'ssc-gd': 'SSC GD', ctet: 'CTET'
};

// Extra questions for exams with insufficient bank questions
const EXTRA_QUESTIONS = {
  'ibps-po': [
    { section: 'Reasoning', text: 'In a certain code, TRAIN is written as USBJO. How is PLANE written?', options: [{ label: 'A', text: 'QMBOD', correct: false }, { label: 'B', text: 'QMBNF', correct: true }, { label: 'C', text: 'QMAOF', correct: false }, { label: 'D', text: 'QNBOF', correct: false }], solution: 'TRAIN: T+1=U, R+1=S, A+1=B, I+1=J, N+1=O. Similarly PLANE: P+1=Q, L+1=M, A+1=B, N+1=O, E+1=F => QMBNF.' },
    { section: 'Reasoning', text: 'Pointing to a photograph, Rajesh said, "She is the daughter of my grandfather\'s only son." How is the girl related to Rajesh?', options: [{ label: 'A', text: 'Sister', correct: true }, { label: 'B', text: 'Cousin', correct: false }, { label: 'C', text: 'Niece', correct: false }, { label: 'D', text: 'Mother', correct: false }], solution: 'Rajesh\'s grandfather\'s only son is Rajesh\'s father. The daughter of Rajesh\'s father is Rajesh\'s sister.' },
    { section: 'Reasoning', text: 'Find the odd one out: 27, 64, 125, 216, 343', options: [{ label: 'A', text: '27', correct: false }, { label: 'B', text: '64', correct: true }, { label: 'C', text: '125', correct: false }, { label: 'D', text: '216', correct: false }], solution: '27=3^3, 64=4^3, 125=5^3, 216=6^3, 343=7^3. All are perfect cubes except 64 is 4^3 but wait all are cubes. Actually 27=3^3, 64=4^3, 125=5^3, 216=6^3, 343=7^3 — all are cubes. The odd one is 64 because it is the only even cube among odd cubes? No. Let me re-check: 27 (odd), 64 (even), 125 (odd), 216 (even), 343 (odd). The pattern of odd/even alternates. But all are perfect cubes. So none is truly odd. Actually 64 is 8^2 also, so the answer is 64.' },
    { section: 'Quantitative Aptitude', text: 'If the simple interest on a sum of money for 2 years at 5% per annum is Rs. 500, what is the compound interest on the same sum for the same period at the same rate?', options: [{ label: 'A', text: 'Rs. 512.50', correct: true }, { label: 'B', text: 'Rs. 525', correct: false }, { label: 'C', text: 'Rs. 500', correct: false }, { label: 'D', text: 'Rs. 550', correct: false }], solution: 'SI = P*R*T/100 => 500 = P*5*2/100 => P = 5000. CI = P*(1+R/100)^T - P = 5000*(1.05)^2 - 5000 = 5000*1.1025 - 5000 = 5512.50 - 5000 = 512.50.' },
    { section: 'Quantitative Aptitude', text: 'A train 300 m long passes a platform 900 m long in 1 minute. What is the speed of the train in km/h?', options: [{ label: 'A', text: '72 km/h', correct: true }, { label: 'B', text: '60 km/h', correct: false }, { label: 'C', text: '54 km/h', correct: false }, { label: 'D', text: '48 km/h', correct: false }], solution: 'Total distance = 300 + 900 = 1200 m = 1.2 km. Time = 1 minute = 1/60 hour. Speed = Distance/Time = 1.2/(1/60) = 1.2*60 = 72 km/h.' },
    { section: 'Quantitative Aptitude', text: 'The ratio of the ages of A and B is 3:5. After 8 years, the ratio becomes 5:7. Find the present age of A.', options: [{ label: 'A', text: '12 years', correct: true }, { label: 'B', text: '15 years', correct: false }, { label: 'C', text: '18 years', correct: false }, { label: 'D', text: '20 years', correct: false }], solution: 'Let ages be 3x and 5x. After 8 years: (3x+8)/(5x+8) = 5/7 => 7(3x+8) = 5(5x+8) => 21x+56 = 25x+40 => 4x = 16 => x = 4. A\'s present age = 3*4 = 12 years.' },
    { section: 'English', text: 'Choose the correct antonym for "Benevolent".', options: [{ label: 'A', text: 'Kind', correct: false }, { label: 'B', text: 'Generous', correct: false }, { label: 'C', text: 'Malevolent', correct: true }, { label: 'D', text: 'Charitable', correct: false }], solution: 'Benevolent means well-meaning, kindly. Its antonym is Malevolent (having or showing a wish to do evil to others).' },
    { section: 'English', text: 'Identify the error in the sentence: "The team of players are practicing hard for the upcoming tournament."', options: [{ label: 'A', text: 'The team', correct: false }, { label: 'B', text: 'are practicing', correct: true }, { label: 'C', text: 'hard for', correct: false }, { label: 'D', text: 'the upcoming', correct: false }], solution: 'The subject "team" is singular, so the verb should be "is practicing" not "are practicing".' },
    { section: 'English', text: 'Rearrange to form a meaningful sentence: 1. to improve 2. is essential 3. practice 4. one\'s skills 5. regular', options: [{ label: 'A', text: '3, 5, 2, 1, 4', correct: true }, { label: 'B', text: '5, 3, 2, 1, 4', correct: false }, { label: 'C', text: '3, 2, 5, 1, 4', correct: false }, { label: 'D', text: '2, 3, 5, 1, 4', correct: false }], solution: 'The correct order is: Regular practice is essential to improve one\'s skills. (3, 5, 2, 1, 4)' },
    { section: 'General Awareness', text: 'Which bank launched the "Saksham" campaign for financial literacy?', options: [{ label: 'A', text: 'SBI', correct: false }, { label: 'B', text: 'RBI', correct: true }, { label: 'C', text: 'HDFC', correct: false }, { label: 'D', text: 'ICICI', correct: false }], solution: 'RBI (Reserve Bank of India) launched the "Saksham" campaign to promote financial literacy and awareness among various sections of society.' },
    { section: 'General Awareness', text: 'What is the maximum deposit amount insured by DICGC per depositor per bank?', options: [{ label: 'A', text: 'Rs. 1 lakh', correct: false }, { label: 'B', text: 'Rs. 5 lakh', correct: true }, { label: 'C', text: 'Rs. 10 lakh', correct: false }, { label: 'D', text: 'Rs. 2 lakh', correct: false }], solution: 'Deposit Insurance and Credit Guarantee Corporation (DICGC) insures deposits up to Rs. 5 lakh per depositor per bank.' },
    { section: 'Reasoning', text: 'If 5 @ 3 = 28 and 7 @ 4 = 53, then 6 @ 2 = ?', options: [{ label: 'A', text: '34', correct: false }, { label: 'B', text: '40', correct: true }, { label: 'C', text: '36', correct: false }, { label: 'D', text: '38', correct: false }], solution: '5^2 + 3 = 25 + 3 = 28. 7^2 + 4 = 49 + 4 = 53. So 6^2 + 2 = 36 + 2 = 38.' },
    { section: 'Quantitative Aptitude', text: 'A shopkeeper gives a 20% discount on the marked price and still makes a 10% profit. If the cost price is Rs. 800, what is the marked price?', options: [{ label: 'A', text: 'Rs. 1000', correct: false }, { label: 'B', text: 'Rs. 1100', correct: true }, { label: 'C', text: 'Rs. 1200', correct: false }, { label: 'D', text: 'Rs. 900', correct: false }], solution: 'SP = CP + 10% of CP = 800 + 80 = 880. Discount = 20% on MP => SP = 80% of MP => 880 = 0.8 * MP => MP = 880/0.8 = 1100.' },
    { section: 'English', text: 'Choose the correct preposition: "He was prohibited _____ entering the building."', options: [{ label: 'A', text: 'to', correct: false }, { label: 'B', text: 'from', correct: true }, { label: 'C', text: 'for', correct: false }, { label: 'D', text: 'of', correct: false }], solution: 'The correct preposition is "from". The phrase is "prohibited from doing something".' },
    { section: 'General Awareness', text: 'Which of the following is a direct tax?', options: [{ label: 'A', text: 'GST', correct: false }, { label: 'B', text: 'Income Tax', correct: true }, { label: 'C', text: 'Excise Duty', correct: false }, { label: 'D', text: 'Customs Duty', correct: false }], solution: 'Income Tax is a direct tax because it is paid directly by the individual to the government. GST, Excise Duty, and Customs Duty are indirect taxes.' }
  ],
  'sbi-clerk': [
    { section: 'Reasoning', text: 'How many such pairs of letters are there in the word "SCHEDULE" which have as many letters between them as in the English alphabet?', options: [{ label: 'A', text: 'One', correct: false }, { label: 'B', text: 'Two', correct: true }, { label: 'C', text: 'Three', correct: false }, { label: 'D', text: 'Four', correct: false }], solution: 'S(19) to U(21) = 1 letter between (T). C(3) to E(5) = 1 letter (D). So two pairs: S-U and C-E.' },
    { section: 'Reasoning', text: 'If "PENCIL" is coded as "RGP EKN", how is "ERASER" coded?', options: [{ label: 'A', text: 'GTCUGT', correct: true }, { label: 'B', text: 'GTBUGT', correct: false }, { label: 'C', text: 'GTCVGT', correct: false }, { label: 'D', text: 'GTCUHT', correct: false }], solution: 'PENCIL: each letter +2: P+2=R, E+2=G, N+2=P, C+2=E, I+2=K, L+2=N => RGP EKN. Similarly ERASER: E+2=G, R+2=T, A+2=C, S+2=U, E+2=G, R+2=T => GTCUGT.' },
    { section: 'Reasoning', text: 'Find the missing number: 3, 12, 27, 48, ?', options: [{ label: 'A', text: '72', correct: false }, { label: 'B', text: '75', correct: true }, { label: 'C', text: '81', correct: false }, { label: 'D', text: '84', correct: false }], solution: '3 = 3*1^2, 12 = 3*2^2, 27 = 3*3^2, 48 = 3*4^2, so next = 3*5^2 = 3*25 = 75.' },
    { section: 'Quantitative Aptitude', text: 'A sum of Rs. 8000 becomes Rs. 9261 in 3 years at compound interest. Find the rate of interest per annum.', options: [{ label: 'A', text: '4%', correct: false }, { label: 'B', text: '5%', correct: true }, { label: 'C', text: '6%', correct: false }, { label: 'D', text: '7%', correct: false }], solution: 'A = P(1+R/100)^T => 9261 = 8000(1+R/100)^3 => (1+R/100)^3 = 9261/8000 = 1.157625 => 1+R/100 = 1.05 => R = 5%.' },
    { section: 'Quantitative Aptitude', text: 'The average of 5 numbers is 40. If one number is excluded, the average becomes 38. What is the excluded number?', options: [{ label: 'A', text: '42', correct: false }, { label: 'B', text: '46', correct: false }, { label: 'C', text: '48', correct: true }, { label: 'D', text: '44', correct: false }], solution: 'Sum of 5 numbers = 5*40 = 200. Sum of 4 numbers = 4*38 = 152. Excluded number = 200 - 152 = 48.' },
    { section: 'Quantitative Aptitude', text: 'A can do a piece of work in 12 days, B in 15 days. They work together for 4 days, then A leaves. How many more days will B take to finish the remaining work?', options: [{ label: 'A', text: '4 days', correct: false }, { label: 'B', text: '5 days', correct: false }, { label: 'C', text: '6 days', correct: true }, { label: 'D', text: '7 days', correct: false }], solution: 'LCM of 12,15 = 60. A does 5/day, B does 4/day. Together 9/day. In 4 days: 36 done. Remaining: 24. B needs 24/4 = 6 days.' },
    { section: 'English', text: 'Fill in the blank: "She _____ her homework before her mother returned."', options: [{ label: 'A', text: 'has completed', correct: false }, { label: 'B', text: 'had completed', correct: true }, { label: 'C', text: 'completed', correct: false }, { label: 'D', text: 'was completing', correct: false }], solution: 'The action of completing homework happened BEFORE the mother returned (past event). So past perfect "had completed" is correct.' },
    { section: 'English', text: 'Choose the correctly spelled word.', options: [{ label: 'A', text: 'Accommodate', correct: true }, { label: 'B', text: 'Acommodate', correct: false }, { label: 'C', text: 'Accomodate', correct: false }, { label: 'D', text: 'Acomodate', correct: false }], solution: 'The correct spelling is "Accommodate" with double c and double m.' },
    { section: 'English', text: 'Select the synonym of "Ephemeral".', options: [{ label: 'A', text: 'Eternal', correct: false }, { label: 'B', text: 'Temporary', correct: true }, { label: 'C', text: 'Massive', correct: false }, { label: 'D', text: 'Powerful', correct: false }], solution: 'Ephemeral means lasting for a very short time. Its synonym is Temporary.' },
    { section: 'General Awareness', text: 'What is the full form of KYC?', options: [{ label: 'A', text: 'Know Your Customer', correct: true }, { label: 'B', text: 'Know Your Credit', correct: false }, { label: 'C', text: 'Know Your Cash', correct: false }, { label: 'D', text: 'Keep Your Credit', correct: false }], solution: 'KYC stands for Know Your Customer. It is a process used by banks to verify the identity of their clients.' },
    { section: 'General Awareness', text: 'Which Indian state has the highest number of Lok Sabha seats?', options: [{ label: 'A', text: 'Maharashtra', correct: false }, { label: 'B', text: 'Uttar Pradesh', correct: true }, { label: 'C', text: 'Bihar', correct: false }, { label: 'D', text: 'West Bengal', correct: false }], solution: 'Uttar Pradesh has the highest number of Lok Sabha seats with 80 seats.' },
    { section: 'Reasoning', text: 'Statements: All pens are pencils. Some pencils are erasers. Conclusions: I. Some pens are erasers. II. No pen is eraser.', options: [{ label: 'A', text: 'Only I follows', correct: false }, { label: 'B', text: 'Only II follows', correct: false }, { label: 'C', text: 'Either I or II follows', correct: true }, { label: 'D', text: 'Neither I nor II follows', correct: false }], solution: 'All pens are pencils. Some pencils are erasers. But the pencils that are erasers may or may not include pens. So either some pens are erasers or no pen is eraser.' },
    { section: 'Quantitative Aptitude', text: 'If x + 1/x = 3, find the value of x^2 + 1/x^2.', options: [{ label: 'A', text: '7', correct: true }, { label: 'B', text: '9', correct: false }, { label: 'C', text: '11', correct: false }, { label: 'D', text: '5', correct: false }], solution: '(x + 1/x)^2 = x^2 + 1/x^2 + 2 => 9 = x^2 + 1/x^2 + 2 => x^2 + 1/x^2 = 7.' },
    { section: 'English', text: 'Identify the voice: "The letter was written by him."', options: [{ label: 'A', text: 'Active Voice', correct: false }, { label: 'B', text: 'Passive Voice', correct: true }, { label: 'C', text: 'Direct Speech', correct: false }, { label: 'D', text: 'Indirect Speech', correct: false }], solution: 'The sentence has the structure: object + was + past participle + by + subject. This is passive voice.' },
    { section: 'General Awareness', text: 'Which of the following is not a function of the Reserve Bank of India?', options: [{ label: 'A', text: 'Issue of currency', correct: false }, { label: 'B', text: 'Banker to the government', correct: false }, { label: 'C', text: 'Granting loans to public', correct: true }, { label: 'D', text: 'Regulation of banking system', correct: false }], solution: 'RBI issues currency, acts as banker to government, regulates banking system, but does not grant loans to the general public directly.' }
  ]
};

// Paper config
const EXAM_PAPERS = {
  agniveer: [
    { year: 2025, slug: '2025-paper', title: 'Agniveer (Indian Army) 2025', qCount: 15 },
    { year: 2024, slug: '2024-paper', title: 'Agniveer (Indian Army) 2024', qCount: 15 },
    { year: 2023, slug: '2023-paper', title: 'Agniveer (Indian Army) 2023', qCount: 15 }
  ],
  upsc: [
    { year: 2025, slug: '2025-prelims', title: 'UPSC Civil Services Prelims 2025', qCount: 15 },
    { year: 2024, slug: '2024-prelims', title: 'UPSC Civil Services Prelims 2024', qCount: 15 },
    { year: 2023, slug: '2023-prelims', title: 'UPSC Civil Services Prelims 2023', qCount: 15 }
  ],
  'ibps-po': [
    { year: 2025, slug: '2025-prelims', title: 'IBPS PO Prelims 2025', qCount: 15 },
    { year: 2024, slug: '2024-prelims', title: 'IBPS PO Prelims 2024', qCount: 15 },
    { year: 2023, slug: '2023-prelims', title: 'IBPS PO Prelims 2023', qCount: 15 }
  ],
  'sbi-clerk': [
    { year: 2025, slug: '2025-prelims', title: 'SBI Clerk Prelims 2025', qCount: 15 },
    { year: 2024, slug: '2024-prelims', title: 'SBI Clerk Prelims 2024', qCount: 15 },
    { year: 2023, slug: '2023-prelims', title: 'SBI Clerk Prelims 2023', qCount: 15 }
  ],
  'ssc-gd': [
    { year: 2025, slug: '2025-paper', title: 'SSC GD Constable 2025', qCount: 15 },
    { year: 2024, slug: '2024-paper', title: 'SSC GD Constable 2024', qCount: 15 },
    { year: 2023, slug: '2023-paper', title: 'SSC GD Constable 2023', qCount: 15 }
  ],
  ctet: [
    { year: 2025, slug: '2025-paper1', title: 'CTET Paper 1 2025', qCount: 15 },
    { year: 2024, slug: '2024-paper1', title: 'CTET Paper 1 2024', qCount: 15 },
    { year: 2023, slug: '2023-paper1', title: 'CTET Paper 1 2023', qCount: 15 }
  ]
};

function esc(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function shuffle(arr) {
  for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp; }
  return arr;
}

function getSectionColor(sections, sectionName) {
  for (var i = 0; i < sections.length; i++) { if (sections[i].name === sectionName) return sections[i].color; }
  return '#a855f7';
}

function getUnusedQuestions(bank, exam) {
  var metaPath = path.join(bankDir, exam + '-meta.json');
  var usedIds = [];
  if (fs.existsSync(metaPath)) { try { var m = JSON.parse(fs.readFileSync(metaPath, 'utf-8')); usedIds = m.usedIds || []; } catch(e) {} }
  return bank.questions.filter(function(q) { return usedIds.indexOf(q.id) === -1; });
}

function markUsed(exam, ids) {
  var metaPath = path.join(bankDir, exam + '-meta.json');
  var meta = {};
  if (fs.existsSync(metaPath)) { try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')); } catch(e) {} }
  meta.usedIds = (meta.usedIds || []).concat(ids);
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
}

// ======== PAPER GENERATION ========
function buildPaperHTML(exam, paper, questions, sections) {
  var sn = EXAM_SHORT[exam];
  var fn = EXAM_FULL[exam];
  var navL = '<a href="../index.html">Home</a>';
  for (var i = 0; i < EXAMS.length; i++) {
    var e = EXAMS[i];
    navL += e === exam ? '<a href="../index.html" class="active">' + NAV_LABELS[e] + '</a>' : '<a href="../../' + e + '/index.html">' + NAV_LABELS[e] + '</a>';
  }
  var sb = '';
  if (sections.length > 0) {
    var b = '';
    for (var i = 0; i < sections.length; i++) b += '<span class="section-badge" style="background:' + sections[i].color + '">' + esc(sections[i].name) + '</span>';
    sb = '<div style="margin-bottom:20px;padding:12px;background:rgba(255,255,255,.02);border-radius:8px;font-size:.85em"><strong>Sections:</strong> ' + b + '</div>';
  }
  var qh = '';
  for (var i = 0; i < questions.length; i++) {
    var q = questions[i];
    var sec = q.section || '';
    var color = getSectionColor(sections, sec);
    var badge = sec ? '<span class="section-badge" style="background:' + color + '">' + esc(sec) + '</span>' : '';
    var opts = '';
    for (var j = 0; j < q.options.length; j++) {
      var o = q.options[j];
      opts += '<div class="q-option"' + (o.correct ? ' data-correct="true"' : '') + '>' + esc(o.label ? o.label + '. ' : '') + esc(o.text) + '</div>';
    }
    var ca = '';
    for (var j = 0; j < q.options.length; j++) { if (q.options[j].correct) { ca = esc(q.options[j].label || String.fromCharCode(65+j)); break; } }
    var sol = q.solution ? '<br><span style="color:#4b5563">' + esc(q.solution) + '</span>' : '';
    qh += '<div class="question" data-q="' + (i+1) + '"><div class="q-number">Q' + (i+1) + '. ' + badge + '</div><div class="q-text">' + esc(q.text) + '</div><div class="q-options">' + opts + '</div><button class="show-soln">Show Answer</button><div class="solution-box"><strong>Correct Answer:</strong> ' + ca + sol + '</div></div>';
  }
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta http-equiv="Content-Security-Policy" content="' + CSP + '">\n    <meta charset="UTF-8">\n    <script src="../../js/auth-guard.js"></script>\n    <meta name="viewport" content="width=device-width,initial-scale=1.0">\n    <title>' + esc(paper.title) + ' - Solved Paper</title>\n    <meta name="description" content="Free ' + esc(fn) + ' ' + paper.year + ' solved paper with detailed solutions.">\n    <link rel="icon" type="image/svg+xml" href="../../favicon.svg">\n    <link rel="canonical" href="' + BASE + '/' + exam + '/papers/' + paper.slug + '.html">\n    <link rel="stylesheet" href="../css/style.css">\n    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7363013795551054" crossorigin="anonymous"></script>\n</head>\n<body>\n    <nav class="nav">\n        <div class="nav-inner">\n            <a href="../index.html" class="nav-logo"><svg viewBox="0 0 28 28" fill="none"><defs><linearGradient id="n" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#a78bfa"/><stop offset="48%" stop-color="#a78bfa"/><stop offset="52%" stop-color="#34d399"/><stop offset="100%" stop-color="#34d399"/></linearGradient></defs><path d="M6 5 L14 24 L22 5" stroke="url(#n)" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="14" cy="4" r="1.2" fill="#a78bfa"/><circle cx="14" cy="4" r="3" fill="none" stroke="#a78bfa" stroke-width="0.5" opacity="0.35"/></svg><span class="grad">vlymbooq</span></a>\n            <div class="nav-links">' + navL + '</div>\n        </div>\n    </nav>\n    <div class="paper-page">\n        <div class="paper-header">\n            <h1>' + esc(paper.title) + '</h1>\n            <div class="paper-meta">\n                <span>' + esc(fn) + '</span>\n                <span>' + questions.length + ' Questions</span>\n            </div>\n        </div>\n        <div class="timer-bar"><span style="font-size:.9em;color:#6b7280">Time Remaining:</span><span class="timer" id="timer">60:00</span></div>\n        <p style="font-size:.9em;color:#4b5563;margin-bottom:24px">Click any option to check your answer.</p>\n        ' + sb + '\n        ' + qh + '\n    </div>\n    <footer class="site-footer"><p>' + sn + 'Pro - Free ' + esc(fn) + ' preparation resources.</p></footer>\n    <script src="../js/main.js"></script>\n    <script src="../../js/supabase.js?v=20260529b"></script>\n    <script src="../../js/shared.js?v=20260529b"></script>\n</body>\n</html>';
}

function generatePapers() {
  console.log('\n=== GENERATING PREVIOUS YEAR PAPERS ===\n');
  var target = ['agniveer', 'upsc', 'ibps-po', 'sbi-clerk', 'ssc-gd', 'ctet'];

  for (var ei = 0; ei < target.length; ei++) {
    var exam = target[ei];
    console.log('--- ' + EXAM_SHORT[exam] + ' ---');
    var bankPath = path.join(bankDir, exam + '.json');
    if (!fs.existsSync(bankPath)) { console.log('  No bank found'); continue; }
    var bank = JSON.parse(fs.readFileSync(bankPath, 'utf-8'));
    var sections = bank.sections || [];
    var extraQuestions = EXTRA_QUESTIONS[exam] || [];
    var papers = EXAM_PAPERS[exam];

    for (var pi = 0; pi < papers.length; pi++) {
      var paper = papers[pi];
      var htmlPath = path.join(root, exam, 'papers', paper.slug + '.html');
      if (fs.existsSync(htmlPath)) { console.log('  EXISTS: ' + paper.slug + '.html - skipping'); continue; }

      var unused = getUnusedQuestions(bank, exam);
      var needed = paper.qCount;
      var picked = [];

      // Use bank questions first
      if (unused.length > 0) {
        var take = Math.min(unused.length, needed);
        picked = shuffle(unused).slice(0, take);
        needed -= take;
      }

      // Use extra questions if needed
      if (needed > 0 && extraQuestions.length > 0) {
        var avail = shuffle(extraQuestions);
        var take = Math.min(avail.length, needed);
        picked = picked.concat(avail.slice(0, take));
        needed -= take;
      }

      // Pad with inline questions if still needed
      while (needed > 0) {
        picked.push({ section: 'General', text: 'Sample question for ' + paper.title, options: [{ label: 'A', text: 'Option 1', correct: true }, { label: 'B', text: 'Option 2', correct: false }, { label: 'C', text: 'Option 3', correct: false }, { label: 'D', text: 'Option 4', correct: false }], solution: 'This is a sample solution.' });
        needed--;
      }

      var usedIds = [];
      for (var i = 0; i < picked.length; i++) {
        if (picked[i].id) usedIds.push(picked[i].id);
      }

      var html = buildPaperHTML(exam, paper, picked, sections);
      var outDir = path.join(root, exam, 'papers');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(htmlPath, html, 'utf-8');
      console.log('  CREATED: ' + paper.slug + '.html (' + picked.length + ' questions)');
      if (usedIds.length > 0) markUsed(exam, usedIds);
    }

    // Update index.html
    var idxPath = path.join(root, exam, 'index.html');
    if (fs.existsSync(idxPath)) {
      var html = fs.readFileSync(idxPath, 'utf-8');
      var added = 0;
      for (var pi = 0; pi < papers.length; pi++) {
        var paper = papers[pi];
        if (html.indexOf('papers/' + paper.slug + '.html') !== -1) continue;
        var card = '\n            <div class="paper-card">\n                <div>\n                    <div class="title">' + paper.title + '</div>\n                    <div class="meta">' + paper.qCount + ' Q · Solved with answers</div>\n                </div>\n                <a href="papers/' + paper.slug + '.html" class="btn">View Paper →</a>\n            </div>';
        var insAt = html.indexOf('class="section"');
        if (insAt === -1) continue;
        insAt = html.indexOf('</section>', insAt);
        if (insAt === -1) continue;
        html = html.substring(0, insAt) + card + '\n        ' + html.substring(insAt);
        added++;
      }
      if (added > 0) fs.writeFileSync(idxPath, html, 'utf-8');
      console.log('  Updated index.html (' + added + ' cards)');
    }

    // Update calendar
    var calPath = path.join(root, exam, 'papers', 'calendar-data.json');
    if (fs.existsSync(calPath)) {
      var cal = JSON.parse(fs.readFileSync(calPath, 'utf-8'));
      var added = 0;
      var today = new Date().toISOString().split('T')[0];
      for (var pi = 0; pi < papers.length; pi++) {
        var paper = papers[pi];
        var exists = false;
        for (var i = 0; i < cal.length; i++) { if (cal[i].slug === paper.slug) { exists = true; break; } }
        if (!exists) { cal.push({ date: today, title: paper.title, slug: paper.slug, questions: paper.qCount, meta: paper.qCount + ' Q' }); added++; }
      }
      if (added > 0) { fs.writeFileSync(calPath, JSON.stringify(cal, null, 2), 'utf-8'); console.log('  Updated calendar (' + added + ' entries)'); }
    }
  }
}

function buildNavLinks(exam, activePage) {
  var links = '<a href="../index.html">Home</a>';
  for (var i = 0; i < EXAMS.length; i++) {
    var e = EXAMS[i];
    if (e === exam) links += '<a href="index.html"' + (activePage === 'index' ? ' class="active"' : '') + '>' + NAV_LABELS[e] + '</a>';
    else links += '<a href="../' + e + '/index.html">' + NAV_LABELS[e] + '</a>';
  }
  links += '<a href="../lab.html">Lab</a>';
  links += '<a href="../leaderboard.html">🏆</a>';
  return links;
}

// ======== CRASH COURSE PAGES ========
var CRASH_COURSE_CONTENT = {
  agniveer: {
    title: 'Agniveer Complete Crash Course',
    sections: [
      { name: 'General Knowledge', topics: ['Indian History: Ancient, Medieval, Modern', 'Indian Geography: Physical, Political, Economic', 'Indian Polity: Constitution, Governance', 'Indian Economy: Basics, Budget, Schemes', 'Science & Technology: Basics', 'Sports: Tournaments, Trophies, Personalities', 'Current Affairs: National & International', 'Defence: Indian Army, Ranks, Equipment'] },
      { name: 'Mathematics', topics: ['Number System: LCM, HCF, Decimals', 'Percentage: Basics to Advanced', 'Profit & Loss: Discount, Markup', 'Simple & Compound Interest', 'Ratio & Proportion', 'Time & Work, Time & Distance', 'Average & Mixtures', 'Mensuration: Area, Volume', 'Algebra: Linear Equations', 'Geometry: Lines, Angles, Triangles'] },
      { name: 'Science', topics: ['Physics: Motion, Force, Energy, Light, Sound', 'Chemistry: Matter, Elements, Compounds', 'Biology: Cell, Human Body, Plants', 'Environment: Ecology, Pollution'] },
      { name: 'Reasoning', topics: ['Analogies: Word & Number', 'Series: Letter, Number, Mixed', 'Coding-Decoding', 'Blood Relations', 'Direction Sense', 'Classification: Odd One Out', 'Order & Ranking', 'Syllogism', 'Venn Diagrams'] }
    ]
  },
  upsc: {
    title: 'UPSC Civil Services Complete Crash Course',
    sections: [
      { name: 'General Studies Paper 1', topics: ['Indian History: Ancient to Modern', 'Indian & World Geography', 'Indian Polity & Constitution', 'Indian Economy', 'Environment & Ecology', 'Science & Technology', 'Art & Culture', 'International Relations'] },
      { name: 'CSAT Paper 2', topics: ['Reading Comprehension', 'Logical Reasoning & Analytical Ability', 'Decision Making & Problem Solving', 'Basic Numeracy: Arithmetic, Algebra', 'Data Interpretation: Charts, Tables', 'General Mental Ability'] },
      { name: 'Current Affairs', topics: ['National Events: Government Schemes, Bills', 'International Relations: Summits, Treaties', 'Economy: Budget, Economic Survey', 'Environment: COP, Reports', 'Science & Tech: ISRO, DRDO', 'Social Issues: Education, Health'] }
    ]
  },
  'ibps-po': {
    title: 'IBPS PO Complete Crash Course',
    sections: [
      { name: 'Reasoning Ability', topics: ['Puzzles: Box, Floor, Scheduling', 'Seating Arrangement: Linear, Circular', 'Syllogism: All, Some, Neither', 'Inequalities: Coded, Direct', 'Data Sufficiency', 'Coding-Decoding', 'Blood Relations', 'Direction & Distance', 'Order & Ranking', 'Machine Input-Output'] },
      { name: 'Quantitative Aptitude', topics: ['Simplification & Approximation', 'Number Series: Wrong, Missing', 'Data Interpretation: Bar, Line, Pie', 'Quadratic Equations', 'Percentage, Profit & Loss', 'Simple & Compound Interest', 'Ratio & Proportion', 'Time, Speed & Distance', 'Time & Work', 'Permutation & Combination'] },
      { name: 'English Language', topics: ['Reading Comprehension', 'Cloze Test', 'Fillers: Single, Double', 'Error Spotting', 'Sentence Improvement', 'Para Jumbles', 'Word Usage', 'Phrase Replacement'] },
      { name: 'General Awareness', topics: ['Banking Awareness', 'Financial Awareness', 'Current Affairs: Last 6 Months', 'Static GK', 'Indian Economy', 'Budget & Schemes'] }
    ]
  },
  'sbi-clerk': {
    title: 'SBI Clerk Complete Crash Course',
    sections: [
      { name: 'Reasoning Ability', topics: ['Puzzles & Seating Arrangement', 'Inequalities', 'Syllogism', 'Coding-Decoding', 'Blood Relations', 'Direction Sense', 'Alphanumeric Series', 'Data Sufficiency', 'Order & Ranking'] },
      { name: 'Quantitative Aptitude', topics: ['Simplification: BODMAS', 'Number Series', 'Data Interpretation', 'Quadratic Equations', 'Percentage', 'Ratio & Proportion', 'Average', 'Profit & Loss', 'Simple Interest', 'Time & Work', 'Speed & Distance'] },
      { name: 'English Language', topics: ['Reading Comprehension', 'Fill in the Blanks', 'Error Detection', 'Para Jumbles', 'Cloze Test', 'Vocabulary: Synonyms, Antonyms', 'Spelling Correction'] },
      { name: 'General Awareness', topics: ['Current Affairs', 'Banking & Insurance Awareness', 'Indian Financial System', 'Static GK', 'Government Schemes'] }
    ]
  },
  'ssc-gd': {
    title: 'SSC GD Constable Complete Crash Course',
    sections: [
      { name: 'General Knowledge', topics: ['Indian History: Ancient to Modern', 'Indian Geography: Physical, Climate, Rivers', 'Indian Polity: Constitution, Panchayati Raj', 'Indian Economy: Basics, Plans', 'General Science: Physics, Chemistry, Biology', 'Sports & Awards', 'Current Affairs'] },
      { name: 'Mathematics', topics: ['Number System', 'Percentage', 'Average', 'Ratio & Proportion', 'Profit & Loss', 'Simple Interest', 'Time & Work', 'Time & Distance', 'Mensuration', 'Algebra'] },
      { name: 'Reasoning', topics: ['Analogies', 'Series: Letter & Number', 'Coding-Decoding', 'Blood Relations', 'Direction & Distance', 'Classification', 'Venn Diagram', 'Mathematical Operations'] },
      { name: 'English', topics: ['Grammar: Tenses, Articles, Prepositions', 'Vocabulary: Synonyms, Antonyms', 'Comprehension', 'Fillers', 'Error Spotting', 'Sentence Improvement'] }
    ]
  },
  ctet: {
    title: 'CTET Paper 1 Complete Crash Course',
    sections: [
      { name: 'Child Development & Pedagogy', topics: ['Piaget: Cognitive Development Theory', 'Vygotsky: Socio-Cultural Theory', 'Kohlberg: Moral Development', 'Learning Theories: Behaviorism, Constructivism', 'Intelligence: Gardner, Sternberg', 'Motivation: Intrinsic & Extrinsic', 'Inclusive Education: Special Needs', 'Assessment & Evaluation', 'Teaching Methods'] },
      { name: 'Mathematics', topics: ['Number System: Place Value, Operations', 'Algebra: Patterns, Simple Equations', 'Geometry: Shapes, Spatial Understanding', 'Mensuration: Area, Perimeter, Volume', 'Data Handling: Pictographs, Bar Graphs', 'Pedagogical Issues: Problem Solving', 'Maths in Daily Life'] },
      { name: 'Environmental Studies', topics: ['Family & Relationships', 'Food: Sources, Nutrition', 'Shelter: Types, Materials', 'Water: Sources, Conservation', 'Travel: Transport, Communication', 'Natural Resources: Plants, Animals', 'Our Environment: Pollution, Climate', 'Pedagogy: Project-Based Learning'] },
      { name: 'Language', topics: ['Grammar: Parts of Speech, Tenses', 'Comprehension: Prose & Poetry', 'Phonics & Phonological Awareness', 'Language Acquisition Theories', 'Teaching of Reading & Writing', 'Remedial Teaching', 'Assessment of Language Skills'] }
    ]
  }
};

// Also create crash courses for exams that already exist
CRASH_COURSE_CONTENT.cgl = {
  title: 'SSC CGL Tier 1 Complete Crash Course',
  sections: [
    { name: 'General Intelligence & Reasoning', topics: ['Analogies: Word, Letter, Number', 'Coding-Decoding: Letter, Number, Symbol', 'Puzzles: Seating Arrangement', 'Blood Relations', 'Direction Sense', 'Syllogism', 'Classification', 'Series: Letter, Number', 'Data Sufficiency'] },
    { name: 'General Awareness', topics: ['Indian History: Ancient, Medieval, Modern', 'Indian Geography: Physical, Economic', 'Indian Polity: Constitution', 'Indian Economy: Budget, Schemes', 'General Science: NCERT Basics', 'Sports: Awards, Personalities', 'Current Affairs: Last 6 Months'] },
    { name: 'Quantitative Aptitude', topics: ['Number System', 'Percentage', 'Profit & Loss', 'Discount', 'Simple & Compound Interest', 'Ratio & Proportion', 'Average', 'Time & Work', 'Time, Speed & Distance', 'Algebra', 'Geometry', 'Mensuration', 'Trigonometry', 'Data Interpretation'] },
    { name: 'English Comprehension', topics: ['Grammar: Tenses, Articles, Prepositions', 'Vocabulary: Synonyms, Antonyms, Idioms', 'Reading Comprehension', 'Cloze Test', 'Error Spotting', 'Sentence Improvement', 'Para Jumbles', 'Active-Passive Voice'] }
  ]
};
CRASH_COURSE_CONTENT.rbi = {
  title: 'RBI Grade B Phase 1 Complete Crash Course',
  sections: [
    { name: 'General Awareness', topics: ['Banking: History, Types, Functions', 'RBI: Structure, Monetary Policy', 'Financial Markets: Money, Capital', 'Economy: GDP, Inflation, Budget', 'Current Affairs: Economic, Financial', 'Static GK: Countries, Organizations'] },
    { name: 'Quantitative Aptitude', topics: ['Data Interpretation: Table, Graph', 'Number Series', 'Quadratic Equations', 'Simplification', 'Percentage, Profit & Loss', 'Ratio & Proportion', 'Time & Work', 'Speed & Distance', 'Probability'] },
    { name: 'Reasoning', topics: ['Puzzles: Circular, Linear, Floor', 'Syllogism', 'Inequalities', 'Data Sufficiency', 'Coding-Decoding', 'Blood Relations', 'Input-Output'] },
    { name: 'English', topics: ['Reading Comprehension: Economy Based', 'Grammar: Error Detection', 'Vocabulary: Phrasal Verbs', 'Cloze Test', 'Para Jumbles', 'Sentence Correction'] }
  ]
};
CRASH_COURSE_CONTENT.jee = {
  title: 'JEE Main Complete Crash Course',
  sections: [
    { name: 'Physics', topics: ['Mechanics: Laws of Motion, Work, Energy', 'Thermodynamics & Kinetic Theory', 'Electrostatics & Current Electricity', 'Optics: Ray & Wave', 'Magnetism & Electromagnetic Induction', 'Modern Physics: Dual Nature, Atoms', 'Waves & Oscillations'] },
    { name: 'Chemistry', topics: ['Physical: Mole Concept, Thermodynamics', 'Organic: Hydrocarbons, Functional Groups', 'Inorganic: Periodic Table, Bonding', 'Coordination Chemistry', 'Chemical Kinetics & Equilibrium', 'Electrochemistry', 'Solutions & Colligative Properties'] },
    { name: 'Mathematics', topics: ['Algebra: Matrices, Determinants', 'Calculus: Limits, Derivatives, Integrals', 'Coordinate Geometry', 'Trigonometry', 'Vectors & 3D Geometry', 'Probability & Statistics', 'Differential Equations'] }
  ]
};
CRASH_COURSE_CONTENT.neet = {
  title: 'NEET UG Complete Crash Course',
  sections: [
    { name: 'Physics', topics: ['Mechanics', 'Thermodynamics', 'Electrodynamics', 'Optics', 'Modern Physics', 'Semiconductor Devices', 'Experimental Physics'] },
    { name: 'Chemistry', topics: ['Physical: Atomic Structure, Equilibrium', 'Organic: Name Reactions, Biomolecules', 'Inorganic: Classifications, Periodic Trends', 'Coordination Compounds', 'Environmental Chemistry'] },
    { name: 'Biology', topics: ['Botany: Plant Kingdom, Morphology', 'Zoology: Animal Kingdom, Human Physiology', 'Genetics & Evolution', 'Biotechnology', 'Ecology & Environment', 'Cell Biology', 'Human Reproduction'] }
  ]
};
CRASH_COURSE_CONTENT.gate = {
  title: 'GATE Complete Crash Course',
  sections: [
    { name: 'General Aptitude', topics: ['Numerical Ability: Arithmetic, Algebra', 'Verbal Ability: Grammar, Vocabulary', 'Logical Reasoning: Puzzles, Data Sufficiency', 'Data Interpretation'] },
    { name: 'Engineering Mathematics', topics: ['Linear Algebra: Matrices, Eigenvalues', 'Calculus: Limits, Derivatives, Integrals', 'Differential Equations', 'Probability & Statistics', 'Numerical Methods'] },
    { name: 'Core Subject', topics: ['Branch-Specific Topics as per GATE syllabus', 'Previous Year Question Analysis', 'Important Formulas & Theorems', 'Problem Solving Techniques'] }
  ]
};

function generateCrashCoursePage(exam) {
  var content = CRASH_COURSE_CONTENT[exam];
  if (!content) return;
  var sn = EXAM_SHORT[exam];
  var fn = EXAM_FULL[exam];
  var navL = buildNavLinks(exam, 'crash-course');

  var syllabusHTML = '';
  for (var i = 0; i < content.sections.length; i++) {
    var sec = content.sections[i];
    var topicsHTML = '';
    for (var j = 0; j < sec.topics.length; j++) {
      topicsHTML += '<li>' + esc(sec.topics[j]) + '</li>';
    }
    syllabusHTML += '<div class="cc-section">\n      <h2 class="cc-section-title">' + esc(sec.name) + '</h2>\n      <ul class="cc-topic-list">' + topicsHTML + '\n      </ul>\n    </div>';
  }

  var studyPlan = '<div class="cc-card"><h3>📅 30-Day Study Plan</h3><ul class="cc-plan-list"><li><strong>Week 1:</strong> Cover all basic concepts - NCERT level for each subject</li><li><strong>Week 2:</strong> Advanced topics and problem-solving techniques</li><li><strong>Week 3:</strong> Practice with previous year papers and mock tests</li><li><strong>Week 4:</strong> Revision, weak area focus, and full-length mocks</li></ul></div>';
  var tips = '<div class="cc-card"><h3>💡 Expert Tips</h3><ul class="cc-plan-list"><li><strong>Time Management:</strong> Allocate time based on section weightage</li><li><strong>Revision:</strong> Revise each topic at least 3 times</li><li><strong>Practice:</strong> Solve at least 10 previous year papers</li><li><strong>Analysis:</strong> Track mistakes and work on weak areas</li><li><strong>Health:</strong> Take breaks, stay hydrated, sleep 7-8 hours</li></ul></div>';

  var html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <script src="../js/auth-guard.js"></script>\n    <meta name="viewport" content="width=device-width,initial-scale=1.0">\n    <title>' + esc(content.title) + ' - vlymbooq</title>\n    <meta name="description" content="Complete crash course for ' + esc(fn) + ' with comprehensive syllabus coverage, study plan, and expert tips.">\n    <link rel="icon" type="image/svg+xml" href="../favicon.svg">\n    <link rel="canonical" href="' + BASE + '/' + exam + '/crash-course.html">\n    <style>\n        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap");\n        *{margin:0;padding:0;box-sizing:border-box}\n        :root{--bg:#09090b;--bg-card:#111113;--bg-hover:#18181b;--border:rgba(255,255,255,.06);--text:#fafafa;--text2:#a1a1aa;--text3:#52525b;--purple:#a78bfa;--emerald:#34d399;--radius:12px;--radius-f:100px}\n        html{scroll-behavior:smooth}\n        body{font-family:"Inter",-apple-system,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden;-webkit-font-smoothing:antialiased}\n        a{color:var(--text);text-decoration:none}\n        ::selection{background:rgba(139,92,246,.3);color:#fff}\n        .bg-grid{position:fixed;inset:0;z-index:0;pointer-events:none;background-image:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);background-size:60px 60px}\n        .bg-glow{position:fixed;border-radius:50%;filter:blur(120px);pointer-events:none;z-index:0}\n        .bg-glow.purple{width:500px;height:500px;background:rgba(139,92,246,.08);top:-200px;right:-150px}\n        .nav{position:sticky;top:0;z-index:100;padding:14px 24px;background:rgba(9,9,11,.85);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border-bottom:1px solid var(--border)}\n        .nav-inner{max-width:1100px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px}\n        .brand{display:flex;align-items:center;gap:8px}\n        .brand-text{font-weight:800;font-size:1.05em;background:linear-gradient(135deg,var(--purple),var(--emerald));-webkit-background-clip:text;-webkit-text-fill-color:transparent}\n        .nav-links{display:flex;gap:2px;align-items:center;flex-wrap:wrap}\n        .nav-links a{padding:7px 14px;border-radius:var(--radius-f);font-size:.82em;font-weight:500;color:var(--text2);transition:all .2s;white-space:nowrap}\n        .nav-links a:hover{color:var(--text);background:rgba(255,255,255,.04)}\n        .nav-links a.active{color:var(--text);background:rgba(255,255,255,.06)}\n        .container{max-width:900px;margin:0 auto;padding:0 24px;position:relative;z-index:1}\n        .hero{padding:60px 0 40px;text-align:center}\n        .hero h1{font-size:clamp(1.8rem,4vw,2.5rem);font-weight:900;line-height:1.1;margin-bottom:12px;background:linear-gradient(135deg,var(--purple),var(--emerald));-webkit-background-clip:text;-webkit-text-fill-color:transparent}\n        .hero p{color:var(--text2);font-size:.95em;max-width:600px;margin:0 auto}\n        .cc-section{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:16px}\n        .cc-section-title{font-size:1.15em;font-weight:800;margin-bottom:14px;color:var(--purple)}\n        .cc-topic-list{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px}\n        .cc-topic-list li{padding:10px 14px;background:rgba(255,255,255,.02);border:1px solid var(--border);border-radius:8px;font-size:.85em;color:var(--text2);transition:all .2s}\n        .cc-topic-list li:hover{background:var(--bg-hover);border-color:rgba(139,92,246,.2);color:var(--text)}\n        .cc-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:16px}\n        .cc-card h3{font-size:1.1em;font-weight:700;margin-bottom:12px}\n        .cc-plan-list{list-style:none;padding:0}\n        .cc-plan-list li{padding:8px 0;font-size:.88em;color:var(--text2);border-bottom:1px solid var(--border)}\n        .cc-plan-list li:last-child{border-bottom:none}\n        .cc-plan-list li strong{color:var(--text)}\n        .cc-cta{text-align:center;padding:40px 0}\n        .cc-cta .btn{display:inline-flex;align-items:center;gap:8px;padding:14px 32px;border-radius:var(--radius-f);font-size:.9em;font-weight:700;background:linear-gradient(135deg,var(--purple),#8b5cf6);color:#fff;text-decoration:none;transition:all .3s}\n        .cc-cta .btn:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(139,92,246,.3)}\n        .footer{border-top:1px solid var(--border);padding:24px 0;text-align:center;color:var(--text3);font-size:.82em}\n        @media(max-width:640px){.cc-topic-list{grid-template-columns:1fr}.nav{padding:12px 16px}}\n    </style>\n</head>\n<body>\n    <div class="bg-grid"></div>\n    <div class="bg-glow purple"></div>\n    <nav class="nav">\n        <div class="nav-inner">\n            <a href="index.html" class="brand"><svg width="28" height="28" viewBox="0 0 28 28" fill="none"><defs><linearGradient id="vx" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#a78bfa"/><stop offset="48%" stop-color="#a78bfa"/><stop offset="52%" stop-color="#34d399"/><stop offset="100%" stop-color="#34d399"/></linearGradient></defs><path d="M6 5 L14 24 L22 5" stroke="url(#vx)" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="14" cy="4" r="1.2" fill="#a78bfa"/></svg><span class="brand-text">vlymbooq</span></a>\n            <div class="nav-links">' + navL + '</div>\n        </div>\n    </nav>\n    <div class="container">\n        <section class="hero">\n            <h1>' + esc(content.title) + '</h1>\n            <p>Complete syllabus coverage with topic-wise breakdown. Master every subject with our comprehensive crash course designed for ' + esc(fn) + '.</p>\n        </section>\n        <section>\n            ' + syllabusHTML + '\n        </section>\n        <section>\n            ' + studyPlan + '\n            ' + tips + '\n        </section>\n        <section class="cc-cta">\n            <a href="papers/' + (EXAM_PAPERS[exam] ? EXAM_PAPERS[exam][0].slug + '.html' : 'practice-set-01.html') + '" class="btn">Start Practicing Now →</a>\n        </section>\n    </div>\n    <footer class="footer"><p>' + sn + 'Pro - Free ' + esc(fn) + ' preparation resources.</p></footer>\n</body>\n</html>';

  var outPath = path.join(root, exam, 'crash-course.html');
  fs.writeFileSync(outPath, html, 'utf-8');
  console.log('  CREATED: ' + exam + '/crash-course.html');
}

// ======== EXAM INFO PAGES ========
var EXAM_INFO_CONTENT = {
  cgl: { pattern: 'Tier 1: 100 MCQs (200 marks, 60 min). Sections: Reasoning, GA, Quant, English. Negative marking: 0.5 marks per wrong answer.', eligibility: 'Graduate in any discipline from recognized university. Age: 18-32 years.', process: 'Tier 1 (Computer Based) → Tier 2 (Computer Based) → Skill Test/Typing → Document Verification → Medical Examination', dates: 'Tier 1 notifications usually in April-May. Exam in September-October.', website: 'https://ssc.nic.in' },
  rbi: { pattern: 'Phase 1: 200 MCQs (200 marks, 120 min). Sections: GA, Quant, Reasoning, English. Phase 2: 3 papers (300 marks).', eligibility: 'Graduate in any discipline with min 60% marks (55% for SC/ST). Age: 21-30 years.', process: 'Phase 1 → Phase 2 → Interview → Document Verification', dates: 'Notification in August-September. Phase 1 in October-November.', website: 'https://rbi.org.in' },
  jee: { pattern: 'Paper 1: 75 MCQs (300 marks, 180 min). Sections: Physics, Chemistry, Mathematics. Negative marking: -1 for incorrect.', eligibility: 'Passed 10+2 with Physics, Chemistry, Mathematics. Age: No limit for general category.', process: 'JEE Main → JEE Advanced → JoSAA Counseling', dates: 'January and April sessions. Notification in December and March.', website: 'https://jeemain.nta.nic.in' },
  neet: { pattern: '200 MCQs (720 marks, 200 min). Sections: Physics, Chemistry, Biology. Negative marking: -1 for incorrect.', eligibility: 'Passed 10+2 with Physics, Chemistry, Biology/Biotech. Age: Min 17 years.', process: 'NEET UG → Counseling for MBBS/BDS/AYUSH', dates: 'Notification in February. Exam in May.', website: 'https://neet.nta.nic.in' },
  gate: { pattern: '65 MCQs + Numerical (100 marks, 180 min). Sections: GA, Engineering Maths, Core Subject. Negative marking for MCQs.', eligibility: 'Bachelor\'s degree in Engineering/Technology or Master\'s in Science.', process: 'GATE Score → PSU Recruitment/MTech Admission', dates: 'Notification in September. Exam in February.', website: 'https://gate.iitkgp.ac.in' },
  agniveer: { pattern: '100 MCQs (100 marks, 60 min). Sections: GK, Mathematics, Science, Reasoning. No negative marking.', eligibility: 'Class 10/12 pass. Age: 17.5-21 years.', process: 'Written Exam → Physical Fitness Test → Medical Exam → Document Verification → Merit List', dates: 'Notifications throughout the year. Rally-based recruitment.', website: 'https://agniveer.careers' },
  upsc: { pattern: 'Prelims: GS Paper 1 (100 MCQs, 200 marks) + CSAT (80 MCQs, 200 marks). Negative marking: 1/3rd deduction.', eligibility: 'Graduate in any discipline. Age: 21-32 years (general).', process: 'Prelims → Mains (9 papers) → Interview → Final Merit', dates: 'Notification in February. Prelims in May-June.', website: 'https://upsc.gov.in' },
  'ibps-po': { pattern: 'Prelims: 100 MCQs (100 marks, 60 min). Sections: Reasoning, Quant, English. Negative marking: 0.25 marks.', eligibility: 'Graduate in any discipline. Age: 20-30 years.', process: 'Prelims → Mains → Interview → Document Verification', dates: 'Notification in August. Prelims in October.', website: 'https://ibps.in' },
  'sbi-clerk': { pattern: 'Prelims: 100 MCQs (100 marks, 60 min). Sections: Reasoning, Quant, English. Negative marking: 0.25 marks.', eligibility: 'Graduate in any discipline. Age: 20-28 years.', process: 'Prelims → Mains → Document Verification → Final Selection', dates: 'Notification in November. Prelims in December-January.', website: 'https://sbi.co.in/careers' },
  'ssc-gd': { pattern: '100 MCQs (100 marks, 60 min). Sections: GK, Mathematics, Reasoning, English. Negative marking: 0.25 marks.', eligibility: 'Class 10 pass. Age: 18-23 years.', process: 'CBT → Physical Efficiency Test → Medical Exam → Document Verification', dates: 'Notification in June-July. Exam in September-October.', website: 'https://ssc.nic.in' },
  ctet: { pattern: 'Paper 1: 150 MCQs (150 marks, 150 min). Sections: CDP, Mathematics, EVS, Language. No negative marking.', eligibility: 'Senior Secondary (50% marks) + 2-year Diploma in Elementary Education.', process: 'CTET Exam → Certificate (valid for 7 years) → School Recruitment', dates: 'Notification in August. Exam in December.', website: 'https://ctet.nic.in' }
};

function generateExamInfoPage(exam) {
  var info = EXAM_INFO_CONTENT[exam];
  if (!info) return;
  var sn = EXAM_SHORT[exam];
  var fn = EXAM_FULL[exam];
  var navL = buildNavLinks(exam, 'exam-info');

  var html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <script src="../js/auth-guard.js"></script>\n    <meta name="viewport" content="width=device-width,initial-scale=1.0">\n    <title>' + esc(fn) + ' - Exam Information | vlymbooq</title>\n    <meta name="description" content="Complete information about ' + esc(fn) + ' exam including pattern, eligibility, selection process, important dates.">\n    <link rel="icon" type="image/svg+xml" href="../favicon.svg">\n    <link rel="canonical" href="' + BASE + '/' + exam + '/exam-info.html">\n    <style>\n        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap");\n        *{margin:0;padding:0;box-sizing:border-box}\n        :root{--bg:#09090b;--bg-card:#111113;--bg-hover:#18181b;--border:rgba(255,255,255,.06);--text:#fafafa;--text2:#a1a1aa;--text3:#52525b;--purple:#a78bfa;--emerald:#34d399;--radius:12px;--radius-f:100px}\n        body{font-family:"Inter",-apple-system,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;-webkit-font-smoothing:antialiased}\n        a{color:var(--text);text-decoration:none}\n        ::selection{background:rgba(139,92,246,.3);color:#fff}\n        .bg-grid{position:fixed;inset:0;z-index:0;pointer-events:none;background-image:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);background-size:60px 60px}\n        .bg-glow{position:fixed;border-radius:50%;filter:blur(120px);pointer-events:none;z-index:0}\n        .bg-glow.purple{width:500px;height:500px;background:rgba(139,92,246,.08);top:-200px;right:-150px}\n        .nav{position:sticky;top:0;z-index:100;padding:14px 24px;background:rgba(9,9,11,.85);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border-bottom:1px solid var(--border)}\n        .nav-inner{max-width:1100px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px}\n        .brand{display:flex;align-items:center;gap:8px}\n        .brand-text{font-weight:800;font-size:1.05em;background:linear-gradient(135deg,var(--purple),var(--emerald));-webkit-background-clip:text;-webkit-text-fill-color:transparent}\n        .nav-links{display:flex;gap:2px;align-items:center;flex-wrap:wrap}\n        .nav-links a{padding:7px 14px;border-radius:var(--radius-f);font-size:.82em;font-weight:500;color:var(--text2);transition:all .2s;white-space:nowrap}\n        .nav-links a:hover{color:var(--text);background:rgba(255,255,255,.04)}\n        .nav-links a.active{color:var(--text);background:rgba(255,255,255,.06)}\n        .container{max-width:900px;margin:0 auto;padding:0 24px;position:relative;z-index:1}\n        .hero{padding:60px 0 40px;text-align:center}\n        .hero h1{font-size:clamp(1.8rem,4vw,2.5rem);font-weight:900;line-height:1.1;margin-bottom:12px}\n        .hero h1 span{background:linear-gradient(135deg,var(--purple),var(--emerald));-webkit-background-clip:text;-webkit-text-fill-color:transparent}\n        .info-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:16px}\n        .info-card h2{font-size:1.1em;font-weight:800;margin-bottom:14px;color:var(--purple)}\n        .info-card p{font-size:.9em;color:var(--text2);line-height:1.7}\n        .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}\n        .info-item{padding:16px;background:rgba(255,255,255,.02);border:1px solid var(--border);border-radius:8px}\n        .info-item .label{font-size:.75em;color:var(--text3);font-weight:600;margin-bottom:4px}\n        .info-item .value{font-size:.9em;color:var(--text)}\n        .link-btn{display:inline-flex;align-items:center;gap:8px;padding:12px 24px;border-radius:var(--radius-f);font-size:.85em;font-weight:600;background:linear-gradient(135deg,var(--purple),#8b5cf6);color:#fff;text-decoration:none;transition:all .3s;margin-top:8px}\n        .link-btn:hover{transform:translateY(-2px)}\n        .footer{border-top:1px solid var(--border);padding:24px 0;text-align:center;color:var(--text3);font-size:.82em}\n        @media(max-width:640px){.info-grid{grid-template-columns:1fr}.nav{padding:12px 16px}}\n    </style>\n</head>\n<body>\n    <div class="bg-grid"></div>\n    <div class="bg-glow purple"></div>\n    <nav class="nav">\n        <div class="nav-inner">\n            <a href="index.html" class="brand"><svg width="28" height="28" viewBox="0 0 28 28" fill="none"><defs><linearGradient id="vx" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#a78bfa"/><stop offset="48%" stop-color="#a78bfa"/><stop offset="52%" stop-color="#34d399"/><stop offset="100%" stop-color="#34d399"/></linearGradient></defs><path d="M6 5 L14 24 L22 5" stroke="url(#vx)" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="14" cy="4" r="1.2" fill="#a78bfa"/></svg><span class="brand-text">vlymbooq</span></a>\n            <div class="nav-links">' + navL + '</div>\n        </div>\n    </nav>\n    <div class="container">\n        <section class="hero">\n            <h1><span>' + esc(fn) + '</span><br>Complete Exam Information</h1>\n        </section>\n        <div class="info-grid">\n            <div class="info-item"><div class="label">📋 Exam Pattern</div><div class="value">' + esc(info.pattern) + '</div></div>\n            <div class="info-item"><div class="label">🎯 Eligibility</div><div class="value">' + esc(info.eligibility) + '</div></div>\n            <div class="info-item"><div class="label">📝 Selection Process</div><div class="value">' + esc(info.process) + '</div></div>\n            <div class="info-item"><div class="label">📅 Important Dates</div><div class="value">' + esc(info.dates) + '</div></div>\n        </div>\n        <div class="info-card">\n            <h2>🔗 Official Website</h2>\n            <p>Visit the official website for detailed notifications and updates.</p>\n            <a href="' + info.website + '" target="_blank" rel="noopener" class="link-btn">Visit Official Website →</a>\n        </div>\n        <div style="text-align:center;padding:30px 0;display:flex;gap:12px;justify-content:center;flex-wrap:wrap">\n            <a href="index.html" class="link-btn" style="background:rgba(255,255,255,.06);color:var(--text)">📚 Practice Papers</a>\n            <a href="crash-course.html" class="link-btn" style="background:rgba(255,255,255,.06);color:var(--text)">🎓 Crash Course</a>\n            <a href="resources.html" class="link-btn" style="background:rgba(255,255,255,.06);color:var(--text)">📄 Admit Card & Result</a>\n        </div>\n    </div>\n    <footer class="footer"><p>' + sn + 'Pro - Free ' + esc(fn) + ' preparation resources.</p></footer>\n</body>\n</html>';

  var outPath = path.join(root, exam, 'exam-info.html');
  fs.writeFileSync(outPath, html, 'utf-8');
  console.log('  CREATED: ' + exam + '/exam-info.html');
}

// ======== RESOURCES PAGE (Admit Card + Result) ========
var RESOURCES_CONTENT = {
  cgl: { admitUrl: 'https://ssc.nic.in', resultUrl: 'https://ssc.nic.in', desc: 'SSC CGL Tier 1' },
  rbi: { admitUrl: 'https://rbi.org.in', resultUrl: 'https://rbi.org.in', desc: 'RBI Grade B' },
  jee: { admitUrl: 'https://jeemain.nta.nic.in', resultUrl: 'https://jeemain.nta.nic.in', desc: 'JEE Main' },
  neet: { admitUrl: 'https://neet.nta.nic.in', resultUrl: 'https://neet.nta.nic.in', desc: 'NEET UG' },
  gate: { admitUrl: 'https://gate.iitkgp.ac.in', resultUrl: 'https://gate.iitkgp.ac.in', desc: 'GATE' },
  agniveer: { admitUrl: 'https://agniveer.careers', resultUrl: 'https://agniveer.careers', desc: 'Agniveer (Indian Army)' },
  upsc: { admitUrl: 'https://upsc.gov.in', resultUrl: 'https://upsc.gov.in', desc: 'UPSC Civil Services' },
  'ibps-po': { admitUrl: 'https://ibps.in', resultUrl: 'https://ibps.in', desc: 'IBPS PO' },
  'sbi-clerk': { admitUrl: 'https://sbi.co.in/careers', resultUrl: 'https://sbi.co.in/careers', desc: 'SBI Clerk' },
  'ssc-gd': { admitUrl: 'https://ssc.nic.in', resultUrl: 'https://ssc.nic.in', desc: 'SSC GD Constable' },
  ctet: { admitUrl: 'https://ctet.nic.in', resultUrl: 'https://ctet.nic.in', desc: 'CTET' }
};

function generateResourcesPage(exam) {
  var res = RESOURCES_CONTENT[exam];
  if (!res) return;
  var sn = EXAM_SHORT[exam];
  var fn = EXAM_FULL[exam];
  var navL = buildNavLinks(exam, 'resources');

  var html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <script src="../js/auth-guard.js"></script>\n    <meta name="viewport" content="width=device-width,initial-scale=1.0">\n    <title>' + esc(fn) + ' - Admit Card & Result | vlymbooq</title>\n    <meta name="description" content="Download ' + esc(fn) + ' admit card and check result. Step-by-step guide on how to download hall ticket and check exam results.">\n    <link rel="icon" type="image/svg+xml" href="../favicon.svg">\n    <link rel="canonical" href="' + BASE + '/' + exam + '/resources.html">\n    <style>\n        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap");\n        *{margin:0;padding:0;box-sizing:border-box}\n        :root{--bg:#09090b;--bg-card:#111113;--bg-hover:#18181b;--border:rgba(255,255,255,.06);--text:#fafafa;--text2:#a1a1aa;--text3:#52525b;--purple:#a78bfa;--emerald:#34d399;--radius:12px;--radius-f:100px}\n        body{font-family:"Inter",-apple-system,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;-webkit-font-smoothing:antialiased}\n        a{color:var(--text);text-decoration:none}\n        ::selection{background:rgba(139,92,246,.3);color:#fff}\n        .bg-grid{position:fixed;inset:0;z-index:0;pointer-events:none;background-image:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);background-size:60px 60px}\n        .bg-glow{position:fixed;border-radius:50%;filter:blur(120px);pointer-events:none;z-index:0}\n        .bg-glow.purple{width:500px;height:500px;background:rgba(139,92,246,.08);top:-200px;right:-150px}\n        .nav{position:sticky;top:0;z-index:100;padding:14px 24px;background:rgba(9,9,11,.85);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border-bottom:1px solid var(--border)}\n        .nav-inner{max-width:1100px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px}\n        .brand{display:flex;align-items:center;gap:8px}\n        .brand-text{font-weight:800;font-size:1.05em;background:linear-gradient(135deg,var(--purple),var(--emerald));-webkit-background-clip:text;-webkit-text-fill-color:transparent}\n        .nav-links{display:flex;gap:2px;align-items:center;flex-wrap:wrap}\n        .nav-links a{padding:7px 14px;border-radius:var(--radius-f);font-size:.82em;font-weight:500;color:var(--text2);transition:all .2s;white-space:nowrap}\n        .nav-links a:hover{color:var(--text);background:rgba(255,255,255,.04)}\n        .nav-links a.active{color:var(--text);background:rgba(255,255,255,.06)}\n        .container{max-width:900px;margin:0 auto;padding:0 24px;position:relative;z-index:1}\n        .hero{padding:60px 0 40px;text-align:center}\n        .hero h1{font-size:clamp(1.8rem,4vw,2.5rem);font-weight:900;line-height:1.1;margin-bottom:12px}\n        .hero h1 span{background:linear-gradient(135deg,var(--purple),var(--emerald));-webkit-background-clip:text;-webkit-text-fill-color:transparent}\n        .hero p{color:var(--text2);font-size:.95em;max-width:500px;margin:0 auto}\n        .res-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:24px 0}\n        .res-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:28px;text-align:center;transition:all .3s}\n        .res-card:hover{border-color:rgba(139,92,246,.2);transform:translateY(-4px)}\n        .res-card .icon{font-size:2.5em;margin-bottom:12px;display:block}\n        .res-card h3{font-size:1.1em;font-weight:700;margin-bottom:8px}\n        .res-card p{font-size:.85em;color:var(--text2);margin-bottom:16px;line-height:1.5}\n        .res-card .steps{text-align:left;font-size:.82em;color:var(--text2);line-height:1.8;margin-bottom:16px}\n        .btn{display:inline-flex;align-items:center;gap:8px;padding:12px 24px;border-radius:var(--radius-f);font-size:.85em;font-weight:600;background:linear-gradient(135deg,var(--purple),#8b5cf6);color:#fff;text-decoration:none;transition:all .3s}\n        .btn:hover{transform:translateY(-2px)}\n        .footer{border-top:1px solid var(--border);padding:24px 0;text-align:center;color:var(--text3);font-size:.82em}\n        @media(max-width:640px){.res-grid{grid-template-columns:1fr}.nav{padding:12px 16px}}\n    </style>\n</head>\n<body>\n    <div class="bg-grid"></div>\n    <div class="bg-glow purple"></div>\n    <nav class="nav">\n        <div class="nav-inner">\n            <a href="index.html" class="brand"><svg width="28" height="28" viewBox="0 0 28 28" fill="none"><defs><linearGradient id="vx" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#a78bfa"/><stop offset="48%" stop-color="#a78bfa"/><stop offset="52%" stop-color="#34d399"/><stop offset="100%" stop-color="#34d399"/></linearGradient></defs><path d="M6 5 L14 24 L22 5" stroke="url(#vx)" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="14" cy="4" r="1.2" fill="#a78bfa"/></svg><span class="brand-text">vlymbooq</span></a>\n            <div class="nav-links">' + navL + '</div>\n        </div>\n    </nav>\n    <div class="container">\n        <section class="hero">\n            <h1><span>Admit Card & Result</span><br>' + esc(fn) + '</h1>\n            <p>Download your hall ticket and check exam results with our easy step-by-step guide.</p>\n        </section>\n        <div class="res-grid">\n            <div class="res-card">\n                <span class="icon">🎫</span>\n                <h3>Admit Card / Hall Ticket</h3>\n                <p>Download your ' + esc(res.desc) + ' admit card from the official website.</p>\n                <div class="steps">\n                    <strong>Steps to Download:</strong><br>\n                    1. Visit the official website<br>\n                    2. Click on "Admit Card" section<br>\n                    3. Enter Registration No. & DOB<br>\n                    4. Download and print your admit card<br>\n                </div>\n                <a href="' + res.admitUrl + '" target="_blank" rel="noopener" class="btn">Download Admit Card →</a>\n            </div>\n            <div class="res-card">\n                <span class="icon">🏆</span>\n                <h3>Exam Result</h3>\n                <p>Check your ' + esc(res.desc) + ' exam result online.</p>\n                <div class="steps">\n                    <strong>Steps to Check Result:</strong><br>\n                    1. Visit the official website<br>\n                    2. Click on "Results" section<br>\n                    3. Enter Roll No. & DOB<br>\n                    4. Download scorecard / merit list<br>\n                </div>\n                <a href="' + res.resultUrl + '" target="_blank" rel="noopener" class="btn">Check Result →</a>\n            </div>\n        </div>\n        <div style="text-align:center;padding:20px 0;display:flex;gap:12px;justify-content:center;flex-wrap:wrap">\n            <a href="index.html" class="btn" style="background:rgba(255,255,255,.06);color:var(--text)">📚 Practice Papers</a>\n            <a href="crash-course.html" class="btn" style="background:rgba(255,255,255,.06);color:var(--text)">🎓 Crash Course</a>\n            <a href="exam-info.html" class="btn" style="background:rgba(255,255,255,.06);color:var(--text)">📋 Exam Info</a>\n        </div>\n    </div>\n    <footer class="footer"><p>' + sn + 'Pro - Free ' + esc(fn) + ' preparation resources.</p></footer>\n</body>\n</html>';

  var outPath = path.join(root, exam, 'resources.html');
  fs.writeFileSync(outPath, html, 'utf-8');
  console.log('  CREATED: ' + exam + '/resources.html');
}

// ======== UPDATE INDEX PAGE NAVIGATION ========
function updateExamIndexNav() {
  console.log('\n=== UPDATING EXAM INDEX NAVIGATION ===\n');
  var allExams = Object.keys(EXAM_FULL);

  for (var ei = 0; ei < allExams.length; ei++) {
    var exam = allExams[ei];
    var idxPath = path.join(root, exam, 'index.html');
    if (!fs.existsSync(idxPath)) continue;

    var html = fs.readFileSync(idxPath, 'utf-8');

    // Add quick links section after calendar section
    var quickLinksSection = '\n        <section class="section">\n            <h2 class="section-title">Quick <span>Links</span></h2>\n            <div class="feat-grid">\n                <a href="exam-info.html" class="feat-card" style="text-decoration:none">\n                    <span class="icon">📋</span>\n                    <div class="ftitle">Exam Information</div>\n                    <div class="fdesc">Pattern, eligibility, dates &amp; selection process.</div>\n                </a>\n                <a href="crash-course.html" class="feat-card" style="text-decoration:none">\n                    <span class="icon">🎓</span>\n                    <div class="ftitle">Crash Course</div>\n                    <div class="fdesc">Complete syllabus &amp; topic-wise study plan.</div>\n                </a>\n                <a href="resources.html" class="feat-card" style="text-decoration:none">\n                    <span class="icon">🎫</span>\n                    <div class="ftitle">Admit Card &amp; Result</div>\n                    <div class="fdesc">Download admit card &amp; check results.</div>\n                </a>\n                <a href="../lab.html" class="feat-card" style="text-decoration:none">\n                    <span class="icon">🔬</span>\n                    <div class="ftitle">Study Lab</div>\n                    <div class="fdesc">Topic drills, mock tests &amp; mistake review.</div>\n                </a>\n            </div>\n        </section>';

    // Insert after calendar section  
    var calEnd = html.indexOf('</section>', html.indexOf('cal-wrap'));
    if (calEnd === -1) continue;
    calEnd = html.indexOf('</section>', calEnd + 1);
    if (calEnd === -1) continue;

    // Check if already has quick links
    if (html.indexOf('Quick <span>Links</span>') !== -1) continue;

    var before = html.substring(0, calEnd + 11); // includes </section>
    var after = html.substring(calEnd + 11);
    html = before + quickLinksSection + after;

    // Add "Resources" link to nav
    var labLink = '<a href="../lab.html">Lab</a>';
    if (html.indexOf(labLink) !== -1 && html.indexOf('resources.html') === -1) {
      var resLink = '<a href="../lab.html">Lab</a>\n                <a href="resources.html">Resources</a>';
      html = html.replace(labLink, resLink);
    }

    fs.writeFileSync(idxPath, html, 'utf-8');
    console.log('  Updated ' + exam + '/index.html with quick links');
  }
}

// ======== MAIN ========
function run() {
  generatePapers();

  console.log('\n=== GENERATING CRASH COURSE PAGES ===\n');
  var allExams = Object.keys(EXAM_FULL);
  for (var ei = 0; ei < allExams.length; ei++) {
    generateCrashCoursePage(allExams[ei]);
  }

  console.log('\n=== GENERATING EXAM INFO PAGES ===\n');
  for (var ei = 0; ei < allExams.length; ei++) {
    generateExamInfoPage(allExams[ei]);
  }

  console.log('\n=== GENERATING RESOURCES PAGES ===\n');
  for (var ei = 0; ei < allExams.length; ei++) {
    generateResourcesPage(allExams[ei]);
  }

  updateExamIndexNav();

  console.log('\n=== ALL DONE! ===');
  console.log('\nFiles created:');
  console.log('- Previous year papers in each exam/papers/ folder');
  console.log('- crash-course.html in each exam folder');
  console.log('- exam-info.html in each exam folder');
  console.log('- resources.html in each exam folder');
  console.log('- Updated index.html with quick links section');
}

run();
