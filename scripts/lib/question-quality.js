'use strict';
/**
 * question-quality.js — the checks a generated question must pass before a
 * reader ever sees it.
 *
 * Two defect classes were found in the shipped sets by reading them:
 *
 *   "What is the best strategy for attempting Agriculture Paper II questions
 *    in the exam?"            -> a meta question. It teaches nothing, has a
 *                               'correct answer' that is an opinion, and makes
 *                               the page look unprofessional.
 *
 *   "E=5,A=1,S=19,T=20 -> 5+1+19+20=45? Not a match. Let me just go with given
 *    pattern. Answer: 5645."  -> the model's own deliberation leaked into the
 *                               explanation, and the item is fabricated.
 *
 * Both are cheap to detect, so they are detected here rather than shipped.
 */

// A question about how to take an exam is not an exam question.
const META = [
  /\bbest (?:strategy|way|approach|method) (?:for|to) (?:attempt|answer|solve|approach)\b/i,
  /\bhow (?:should|do) (?:you|we) (?:attempt|approach|solve|prepare)\b/i,
  /\bfirst thing (?:you|one) (?:should|must) do\b/i,
  /\bwhich (?:is|would be) the (?:best|most appropriate) (?:way|strategy|approach)\b/i,
  /\btime management (?:in|during) the exam\b/i,
  /\bhow to (?:attempt|prepare for|crack)\b/i
];

// Deliberation the model meant to keep to itself.
const LEAK = [
  /\blet me (?:just )?(?:go with|recheck|recalculate|re-?do|try)\b/i,
  /\bnot (?:an|among the) options?\b/i,
  /\bclosest (?:is|option)\b/i,
  /\bi (?:initially )?misread\b/i,
  /\bthat doesn'?t match\b/i,
  /\bwait[,\s]+(?:but|the|that|it|i)\b/i,
  /\bhmm+\b/i,
  /\bassuming the (?:given|intended) pattern\b/i
];

function isMetaQuestion(text) {
  const s = String(text == null ? '' : text);
  for (const re of META) if (re.test(s)) return re.source;
  return '';
}

function hasLeakedReasoning(solution) {
  const s = String(solution == null ? '' : solution);
  for (const re of LEAK) if (re.test(s)) return re.source;
  return '';
}

// A stem that gives itself away: "Which word is different? Chair, Table, ...".
// Not fatal, but these are the ones that make a set feel like a school quiz
// rather than a paper, so they are counted and reported.
function isTrivial(text) {
  const s = String(text == null ? '' : text);
  if (/\b(?:average|median) of [\d,\s]+$/i.test(s)) return 'arithmetic on a number list';
  if (/\bnext: [\d,\s?]+$/i.test(s) && s.length < 60) return 'bare number series';
  if (/\b(?:A, E, I, O|1, 4, 9, 16)/.test(s)) return 'well-known sequence';
  return '';
}

module.exports = { isMetaQuestion, hasLeakedReasoning, isTrivial, META, LEAK };