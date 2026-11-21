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
  /\bbest (?:strategy|way|approach|method) (?:for|to) (?:attempt(?:ing)?|answer(?:ing)?)\b/i,
  /\bbest (?:strategy|way|approach|method) (?:for|to) (?:the )?(?:exam|paper|test)\b/i,
  /\bhow (?:should|do|can) (?:you|we|one|candidates?) (?:attempt|approach|solve|prepare for|manage) (?:the |a |this )?(?:exam|paper|test|section|questions?)\b/i,
  /\bfirst thing (?:you|one) (?:should|must) do (?:in|during|while)\b/i,
  /\bwhich (?:is|would be) the (?:best|most appropriate) (?:way|strategy|approach) (?:to|for) (?:attempt|answer)\b/i,
  /\btime management (?:in|during) the exam\b/i,
  /\bhow to (?:attempt|prepare for|crack) (?:the )?(?:exam|paper|test)\b/i
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

// A comprehension passage about the exam is not a comprehension passage. The
// real paper prints a passage on a subject - a mela, a sport, deflation, AI in
// farming - and asks what follows from it.
const EXAM_PASSAGE = /\b(?:upsc|csat|civil services|candidate|aspirant|question paper|examiner|syllabus|prelims)\b/i;

function isExamPassage(passage) {
  const s = String(passage == null ? '' : passage);
  return EXAM_PASSAGE.test(s) ? 'the passage is about the exam rather than a subject' : '';
}

// Feeding a lesson into the prompt made the model ask about the lesson instead
// of about the subject: "Is data sufficiency a topic in the UPSC CSAT logical
// reasoning section? I. The lesson states that logical reasoning topics
// include..." That is a question about a page, not an exam question.
const LESSON_META = /\b(?:the|this) lesson\b|\bas per the notes\b|\bthe (?:notes|course material)\b/i;

function isLessonMeta(text) {
  return LESSON_META.test(String(text == null ? '' : text))
    ? 'the question is about the lesson rather than the subject'
    : '';
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
  if (/\b(?:average|median|mean) of [\d,\s.]+:?\s*$/i.test(s)) return 'arithmetic on a number list';
  if (/\b(?:find|complete|which is)\b[^?]{0,30}\bnext\b[^?]*:?\s*[\d,\s?.]+$/i.test(s) && s.length < 70) return 'bare number series';
  if (/\b(?:A, E, I, O|1, 4, 9, 16|2, 6, 18, 54)/.test(s)) return 'well-known sequence';
  if (/\bwhich word is different\b|\bodd one out\b|\bfind the odd\b/i.test(s)) return 'one-line odd-one-out';
  if (/\bif \d+% of a number is \d+\b/i.test(s)) return 'single-step percentage';
  if (/\bhow many (?:mondays|sundays|days)\b/i.test(s)) return 'calendar trivia';
  return '';
}

module.exports = { isMetaQuestion, hasLeakedReasoning, isTrivial, isExamPassage, isLessonMeta, META, LEAK };