'use strict';
// Regression suite for the invented-question revalidator.
//
// The live pool shipped wrong keys because the generator only checked shape:
// four options, answer present, no thinking leak. It never re-did the
// arithmetic. This suite pins the cases that exposed that gap.
//
//   node scripts/lib/invented-quality.test.js

const q = require('./invented-quality');

let pass = 0, fail = 0;
function assert(ok, label, detail) {
  ok ? pass++ : fail++;
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (ok || !detail ? '' : '\n        ' + detail));
}
function errorsOf(item) {
  const r = q.auditQuestion(item);
  return r.errors.join('; ');
}
function base(over) {
  return Object.assign({
    id: 'test',
    section: 'quant',
    difficulty: 'hard',
    style: 'test style',
    topic: 'test topic',
    stem: 'A trader buys a batch for 8200 and sells it for 10250 after a 1025 fee. The balance is used to buy one item at X plus 20 tax, with 5% tax on that item. The final balance is 4140. What is X?',
    options: ['60', '70', '72.50', '80'],
    answer: '72.50',
    solution: '1. Gross SP = 8200 * 1.25 = 10250.\n2. Net Cash = 10250 - 1025 = 9225.\n3. Equation: 9225 - 1.05X - 21 = 4140 => 1.05X = 5064 => X = 72.50.'
  }, over);
}
function goodMath(over) {
  return base(Object.assign({
    id: 'good',
    stem: 'A shopkeeper marks an item at 25% above cost, then gives a 10% discount. If the cost is 100, what is the profit percentage?',
    options: ['10%', '12.5%', '15%', '20%'],
    answer: '12.5%',
    solution: 'Cost = 100. Marked price = 1.25 * 100 = 125. Selling price = 125 * 0.90 = 112.5. Profit = 112.5 - 100 = 12.5. Profit % = 12.5%.'
  }, over));
}

// 1. The reported item: its own equation gives 4822.86, not 72.50.
const trader = base();
const traderResult = q.auditQuestion(trader);
assert(!traderResult.ok, 'rejects the reported trader item');
assert(/72.5|4822|contradict/i.test(traderResult.errors.join(' ')), 'reports the arithmetic contradiction', traderResult.errors.join('; '));

// 2. A consistent item is not rejected.
const good = goodMath();
const goodResult = q.auditQuestion(good);
assert(goodResult.ok, 'accepts a consistent profit-and-loss item', goodResult.errors.join('; '));

// 3. Decimal points are not mistaken for numbered steps.
const dec = q.relationsIn('25 / 2 = 12.5.');
assert(dec.length === 1 && q.close(dec[0].lhs, 12.5, 0.001), 'keeps decimal points in equations', JSON.stringify(dec));

// 4. Percentage labels are not treated as arithmetic factors.
assert(q.relationsIn('85% x 90% = 0.85 x 0.90 = 0.765').length === 0, 'skips percentage chains rather than guessing');
assert(q.relationsIn('23.5% = x').length === 0, 'skips a bare percentage answer');

// 5. The series checker follows the real pattern and rejects a wrong key.
const series = 'Complete the series: 24, 36, 54, 81, 121.5, ?';
assert(q.close(q.seriesNext(series), 182.25, 0.001), 'predicts 182.25 for the 1.5x series');
const badSeries = base({
  section: 'reasoning',
  stem: series,
  options: ['160', '170', '180', '190'],
  answer: '160',
  solution: 'Pattern: multiply previous term by 2. 80 * 2 = 160.'
});
assert(!q.auditQuestion(badSeries).ok, 'rejects a series whose key is not the next term');

// 6. Thinking leaks / option fitting are hard failures.
const leaky = goodMath({ solution: 'Wait, let me recalculate. The options do not match, so let us adjust the numbers.' });
assert(!q.auditQuestion(leaky).ok, 'rejects a self-correcting solution');
const fitting = goodMath({ solution: 'Test option B: 125 * 0.90 = 112.5. Matches option B.' });
assert(!q.auditQuestion(fitting).ok, 'rejects option fitting instead of derivation');

// 7. Answer must really be one of the options.
const missing = goodMath({ answer: '18%' });
assert(!q.auditQuestion(missing).ok, 'rejects an answer that is not among the options');

// 8. Letter-only options are rejected only when the stem carries lettered choices.
const letterOptions = goodMath({ options: ['A', 'B', 'C', 'D'], answer: 'A' });
assert(!q.auditQuestion(letterOptions).ok, 'rejects bare A-D option labels');
const people = base({
  section: 'reasoning',
  stem: 'A is the brother of B. C is the father of A and D. If E is the daughter of D, who is the grandfather of E?',
  options: ['A', 'C', 'B', 'D'],
  answer: 'C',
  solution: 'C is the father of D, so C is E\'s grandfather.'
});
assert(q.auditQuestion(people).ok, 'accepts single-letter person names as options', errorsOf(people));

// 9. A date in an English answer is a warning, not a false hard failure.
const english = base({
  section: 'english',
  stem: 'Which sentence is most appropriate for a formal appointment letter?',
  options: ['You are hereby appointed from 1 July 2024.', 'They made you the assistant.', 'Get ready to work tomorrow.', 'You are chosen for the job.'],
  answer: 'You are hereby appointed from 1 July 2024.',
  solution: 'Option A uses the formal passive construction required in an appointment letter.'
});
const englishResult = q.auditQuestion(english);
assert(englishResult.ok, 'does not hard-fail an English date answer', englishResult.errors.join('; '));

// 10. A question mark alone is not a series.
assert(q.seriesNext('What is the value of X when 10 + 23 + 46 + 87 is divided by 3?') === null, 'does not invent a series from a bare question mark');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exitCode = fail ? 1 : 0;
