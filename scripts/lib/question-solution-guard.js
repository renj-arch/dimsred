// Shared guard for student-facing solutions.
//
// The deploy gate (scripts/lib/question-solutions.test.js) and the model writer
// (scripts/model-fill-bank.js) must agree on what counts as a leaked or
// unsupported solution. When they drifted, the writer happily saved items the
// gate rejected, so one bad item blocked every deploy until a human rewrote it
// (agniveer 2854, 2026-11-16: "Closest option is 335 m/s").
//
// Every pattern here is a defect class a reader can see: the solution admits
// the options do not contain the computed answer, or it leaks the model's own
// deliberation.
//
// The first pattern used to be a bare /\bnot (?:an|among the) options?\b/, which
// fired on ordinary reasoning about a seating puzzle -- "Seat 6 stays P, not an
// option" -- and blocked deploys over a solution that was not wrong. It now has
// to be the answer that is missing, not any value the writer mentions.
const LEAK = [
  [/\b(?:true value|computed value|calculated value|correct answer|answer|result|value)\b[^.!?\n]{0,60}\bnot (?:an|among the|one of the|in the)\s+(?:given |above |listed )?options?\b/i,
    'solution says the true value is not an option'],
  [/\bnone of the (?:given |above |listed )?options?\b/i,
    'solution says none of the options is correct'],
  [/\bnot (?:among the|one of the|in the)\s+(?:given |above |listed )?options?\b/i,
    'solution says the value is not among the options'],
  [/\bclosest (?:is|option)\b/i, 'solution picks the closest option instead of the exact value'],
  [/\bdo not have the exact\b/i, 'solution admits the options do not contain the answer'],
  [/\b(?:i (?:initially )?misread|let me re-?check|let me recalculate|that doesn.t match)\b/i, 'raw model reasoning in the solution'],
  [/\bwait[,\s]+(?:but|the|that|it|i)\b/i, 'raw model reasoning in the solution']
];

function leakReason(text) {
  const s = String(text == null ? '' : text);
  for (const pair of LEAK) {
    if (pair[0].test(s)) return pair[1];
  }
  return '';
}

module.exports = { LEAK, leakReason };