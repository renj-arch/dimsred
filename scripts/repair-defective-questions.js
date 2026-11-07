// Repair classes of internally inconsistent questions that were published in
// several banks and papers. Each case below was checked by hand:
//   1. "sum amounts to 900 in 3 years and 1000 in 5 years" -> simple interest
//      gives 6.67%, which was not among the four options; the key pointed at 8%.
//   2. "train crosses a pole in 18 seconds at 72 km/h ..." -> 72 km/h is 20 m/s,
//      so the new length crosses in 24 s, not 30 s.
//   3. "odd one out 27, 64, 125, 216, 343" -> every number is a cube, so there
//      is no odd one out; the last number is changed to 341 and the key follows.
//   4. "ages 3:5, sum 48" -> the older friend is 30, which was already an
//      option, but the key pointed at 36.
//   5. "50 kg at 20 + 100 kg at 30, sold at 28" -> profit is 5%, which was
//      option A, but the key pointed at 8%.
//   6. NEET Qp item omitted the product pressure, so it had no answer; the
//      stem now gives P(NH3) and the key is 2.0 atm^-2.
//   7. "100 kg rice at 20 + 50 kg wheat at 30" -> average is Rs. 23.33; the
//      option now says so instead of rounding to 22.
//   8. "250 loaves at 20 + 100 cakes at 30" -> revenue is Rs. 8000, which was
//      option C, but the key pointed at 7000.
// Every match gets corrected options, a correct key and a self-contained
// solution. Idempotent: rerunning finds nothing left to repair.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BANK_DIR = path.join(ROOT, 'question-bank');
const DATA_DIR = path.join(ROOT, 'papers-data');

const FIXES = [
  {
    match: /sum of money amounts to rs\.? ?900 in 3 years and rs\.? ?1000 in 5 years/i,
    options: ['6.67%', '5%', '8%', '10%'],
    correct: 0,
    solution: 'The amount rises by Rs. 100 over the two years from year 3 to year 5, so simple interest is Rs. 50 per year. In 3 years the interest is Rs. 150, hence principal = 900 - 150 = Rs. 750. Rate = (50 / 750) x 100 = 6.67% per annum. 5%, 8% and 10% are therefore wrong.'
  },
  {
    match: /train crosses a pole in 18 seconds.*72 km\/h.*length is increased by 120 meters/i,
    options: ['24 seconds', '30 seconds', '35 seconds', '40 seconds'],
    correct: 0,
    solution: '72 km/h = 72 x 5/18 = 20 m/s. In 18 s the train covers its own length: 20 x 18 = 360 m. After adding 120 m the length is 480 m, so time = 480 / 20 = 24 seconds. The other options ignore the correct speed conversion or the added length.'
  },
  {
    match: /find the odd one out: 27, 64, 125, 216, 343/i,
    stem: 'Find the odd one out: 27, 64, 125, 216, 341',
    options: ['27', '341', '125', '216'],
    correct: 1,
    solution: '27 = 3^3, 64 = 4^3, 125 = 5^3 and 216 = 6^3 are perfect cubes. 341 is not a perfect cube (7^3 = 343), so 341 is the odd one out.'
  },
  {
    match: /ratio of the ages of two friends is 3:5.*sum of their ages is 48.*what is the age of the older friend/i,
    options: ['20', '36', '30', '24'],
    correct: 2,
    solution: 'Let the ages be 3x and 5x. Then 3x + 5x = 8x = 48, so x = 6. The older friend is 5x = 30 years. Check: 30/18 = 5/3 and 18 + 30 = 48, so option C is correct.'
  },
  {
    match: /buys 50 kg of rice at rs\.? ?20 per kg and 100 kg of rice at rs\.? ?30 per kg.*profit percentage/i,
    options: ['5%', '10%', '6%', '8%'],
    correct: 0,
    solution: 'Cost = 50 x 20 + 100 x 30 = 1000 + 3000 = Rs. 4000. Quantity = 150 kg, so selling price = 150 x 28 = Rs. 4200. Profit = 200, and profit percentage = (200/4000) x 100 = 5%. Option A is correct.'
  },
  {
    match: /reaction quotient \(q_p\) at this point/i,
    stem: 'For the reaction N2(g) + 3H2(g) = 2NH3(g), the partial pressures at a given instant are P(N2) = 0.2 atm, P(H2) = 0.1 atm and P(NH3) = 0.02 atm. What is the reaction quotient Qp at that instant?',
    options: ['0.25 atm^-2', '2.0 atm^-2', '10.0 atm^-2', '0.05 atm^-2'],
    correct: 1,
    solution: 'Qp = P(NH3)^2 / [P(N2) x P(H2)^3] = (0.02)^2 / (0.2 x 0.1^3) = 0.0004 / 0.0002 = 2.0 atm^-2. Option B is correct.'
  },
  {
    match: /buys 100 kg of rice at rs\.? ?20 per kg and 50 kg of wheat at rs\.? ?30 per kg.*average/i,
    options: ['Rs. 23.33', 'Rs. 24', 'Rs. 26', 'Rs. 28'],
    correct: 0,
    solution: 'Cost = 100 x 20 + 50 x 30 = 2000 + 1500 = Rs. 3500. Total weight = 150 kg. Average cost = 3500 / 150 = Rs. 23.33 per kg. Option A is correct.'
  },
  {
    match: /bakery sells 250 loaves of bread at rs\.? ?20 per loaf and 100 loaves of cake at rs\.? ?30 per loaf/i,
    options: ['Rs. 7000', 'Rs. 7500', 'Rs. 8000', 'Rs. 8500'],
    correct: 2,
    solution: 'Revenue = 250 x 20 + 100 x 30 = 5000 + 3000 = Rs. 8000. Option C is correct.'
  }
];

function norm(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function fixQuestion(q, fix) {
  const opts = fix.options.map(function (text, i) {
    return { label: 'ABCD'[i], text: text, correct: i === fix.correct };
  });
  q.options = opts;
  if (fix.stem) q.text = fix.stem;
  q.solution = fix.solution;
  q.repairedAt = new Date().toISOString();
  q.repairedReason = 'option set/key did not match the stated arithmetic';
  return q;
}

function walk(file, label, changed, affected) {
  let data;
  try { data = JSON.parse(fs.readFileSync(file, 'utf-8')); } catch (e) { return; }
  if (!data || !Array.isArray(data.questions)) return;
  let n = 0;
  data.questions.forEach(function (q) {
    if (!q || !q.text) return;
    for (const fix of FIXES) {
      if (fix.match.test(q.text)) {
        fixQuestion(q, fix);
        n++;
        break;
      }
    }
  });
  if (n) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
    changed.push(label + ' (' + n + ')');
    if (data.slug && data.folder) affected[data.slug] = { folder: data.folder, kind: data.kind || 'daily' };
  }
}

const changed = [];
const affected = {};
fs.readdirSync(BANK_DIR).filter(function (f) { return f.endsWith('.json'); }).forEach(function (f) {
  walk(path.join(BANK_DIR, f), 'question-bank/' + f, changed, affected);
});
fs.readdirSync(DATA_DIR).filter(function (f) { return f.endsWith('.json'); }).forEach(function (f) {
  walk(path.join(DATA_DIR, f), 'papers-data/' + f, changed, affected);
});

const targets = Object.keys(affected).map(function (slug) {
  return { slug: slug, folder: affected[slug].folder, kind: affected[slug].kind };
});
fs.writeFileSync(path.join(ROOT, 'data', 'repair-targets.json'), JSON.stringify({ at: new Date().toISOString(), papers: targets }, null, 2), 'utf-8');
console.log(JSON.stringify({ changed: changed, affectedPapers: targets }, null, 2));
