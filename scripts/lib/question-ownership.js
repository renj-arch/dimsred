'use strict';
/**
 * Question-subject ownership.
 *
 * The cloze generators scrape a Wikipedia article, blank one token from one
 * sentence, and label the item with the *article title* as the subject. That
 * only works when the blank happens to be the article's own subject. When the
 * blank is any other term in the article the recorded subject is wrong, so the
 * question is silently owned by an entity it is not about.
 *
 * Measured over the shipped corpus, 96.8% of questions are in that state.
 *
 * This module decides, per question, which of four things is true:
 *
 *   MATCH      the answer names the recorded subject          -> keep as-is
 *   DATE       the answer is a date drawn from the article    -> keep the
 *              subject (the article really is the thing being dated) and label
 *              the date so it is no longer an untyped string
 *   QUANTITY   the answer is a number that is not a date      -> keep subject,
 *              label the quantity
 *   MISMATCH   the answer is some other entity                -> the answer is
 *              the real subject, so re-derive it
 *
 * UNRESOLVABLE (no answer, or a pronoun/stopword) is reported but never
 * re-derived, because guessing a subject is exactly the failure being fixed.
 */

var MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
  'september', 'october', 'november', 'december',
  'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec'
];
var MONTH_RE = new RegExp('^(' + MONTHS.join('|') + ')\\.?$', 'i');

var BLANK = '_____';

// Words that can never be an entity, so a blank holding one of them carries no
// recoverable subject and must not be re-derived into one.
var STOPWORD_ANSWERS = {
  it: 1, its: 1, they: 1, them: 1, their: 1, he: 1, him: 1, his: 1, she: 1,
  her: 1, hers: 1, we: 1, us: 1, our: 1, this: 1, that: 1, these: 1, those: 1,
  there: 1, here: 1, which: 1, who: 1, whom: 1, whose: 1, what: 1, when: 1,
  where: 1, why: 1, how: 1, and: 1, or: 1, but: 1, if: 1, then: 1, than: 1,
  also: 1, such: 1, other: 1, others: 1, some: 1, any: 1, all: 1, both: 1,
  each: 1, few: 1, more: 1, most: 1, other: 1, own: 1, same: 1, so: 1,
  not: 1, no: 1, nor: 1, only: 1, very: 1, can: 1, will: 1, just: 1,
  // number and ordinal words: a blank holding one of these carries no entity
  one: 1, two: 1, three: 1, four: 1, five: 1, six: 1, seven: 1, eight: 1,
  nine: 1, ten: 1, eleven: 1, twelve: 1, twenty: 1, thirty: 1, forty: 1,
  fifty: 1, hundred: 1, thousand: 1, million: 1, billion: 1,
  first: 1, second: 1, third: 1, fourth: 1, fifth: 1, sixth: 1, seventh: 1,
  eighth: 1, ninth: 1, tenth: 1, last: 1, next: 1, many: 1, several: 1
};

function norm(s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .replace(/[\u2019']s\b/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Leading article plus a plural tail, so "the Beatles" == "Beatles".
function key(s) {
  var n = norm(s);
  if (/^(the|a|an) /.test(n)) n = n.slice(n.indexOf(' ') + 1);
  if (/s$/.test(n) && n.length > 3) n = n.slice(0, -1);
  return n;
}

/**
 * True when the answer is naming the same entity as the recorded subject.
 * Deliberately symmetric on containment: "Ford" must match "Henry Ford",
 * because a cloze that blanks a first name is still about the same person.
 */
function answerNamesSubject(answer, subject) {
  var a = key(answer), s = key(subject);
  if (!a || !s) return false;
  if (a === s) return true;
  if (a.length >= 4 && s.indexOf(a) !== -1) return true;
  if (s.length >= 4 && a.indexOf(s) !== -1) return true;
  return false;
}

function isNumeric(s) {
  return /^[+-]?[\d,]+(?:\.\d+)?$/.test(String(s == null ? '' : s).trim());
}

function isPlausibleYear(s) {
  var t = String(s == null ? '' : s).trim().replace(/[,]/g, '');
  if (!/^\d{3,4}$/.test(t)) return false;
  var n = parseInt(t, 10);
  return n >= 1000 && n <= 2099;
}

// Text on each side of the blank decides what a bare number means.
function aroundBlank(question) {
  var q = String(question == null ? '' : question);
  var i = q.indexOf(BLANK);
  if (i === -1) return { found: false, before: '', after: '', tail: '' };
  return {
    found: true,
    before: q.slice(Math.max(0, i - 60), i),
    after: q.slice(i + BLANK.length, i + BLANK.length + 60),
    tail: q.slice(i + BLANK.length)
  };
}

var MONTH_ANY = new RegExp('^\\W*(' + MONTHS.join('|') + ')\\b', 'i');

/**
 * Classify the blank in one question.
 * Returns { bucket, dateType, quantityType, answer, subject, newSubject, reason }
 */
function classifyBlank(question, answer, subject) {
  var raw = String(answer == null ? '' : answer).trim();
  var res = {
    bucket: 'UNRESOLVABLE',
    dateType: null,
    quantityType: null,
    answer: raw,
    subject: subject == null ? '' : String(subject),
    newSubject: subject == null ? '' : String(subject),
    reason: ''
  };

  if (!raw) {
    res.reason = 'no answer';
    return res;
  }
  var nk = norm(raw);
  if (STOPWORD_ANSWERS[nk]) {
    res.reason = 'answer is a stopword/pronoun, no recoverable entity';
    return res;
  }

  // The answer already names the subject: nothing to repair.
  if (answerNamesSubject(raw, subject)) {
    res.bucket = 'MATCH';
    res.reason = 'answer names the recorded subject';
    return res;
  }

  var ctx = aroundBlank(question);

  // Full dates written out, e.g. "13 May 2012".
  if (new RegExp('^\\d{1,2}\\s+(' + MONTHS.join('|') + ')\\.?\\s+\\d{3,4}$', 'i').test(raw) ||
      new RegExp('^(' + MONTHS.join('|') + ')\\.?\\s+\\d{1,2},?\\s+\\d{3,4}$', 'i').test(raw)) {
    res.bucket = 'DATE';
    res.dateType = 'FULL_DATE';
    res.reason = 'answer is a written-out full date';
    return res;
  }

  // Month, alone or with a year: "August", "August 1914".
  if (MONTH_RE.test(raw)) {
    res.bucket = 'DATE';
    res.dateType = 'MONTH';
    res.reason = 'answer is a month name';
    return res;
  }
  if (new RegExp('^(' + MONTHS.join('|') + ')\\.?\\s+\\d{3,4}$', 'i').test(raw)) {
    res.bucket = 'DATE';
    res.dateType = 'MONTH_YEAR';
    res.reason = 'answer is a month and year';
    return res;
  }

  // A bare year.
  if (isPlausibleYear(raw)) {
    res.bucket = 'DATE';
    res.dateType = 'YEAR';
    res.reason = 'answer is a year';
    return res;
  }

  if (isNumeric(raw)) {
    // "... began on 13 August 2011"  -> 13 is the day
    if (ctx.found && (MONTH_ANY.test(ctx.after) || MONTH_ANY.test(ctx.before))) {
      res.bucket = 'DATE';
      res.dateType = 'DAY';
      res.reason = 'numeric blank adjacent to a month, so it is a day of month';
      return res;
    }
    // "the COVID-19 pandemic", "3,000 km", "50%" -> a quantity, not a date
    var t = ctx.tail;
    if (/^\s*%/.test(t) || /^\s*(per\s*cent|percent)/i.test(t)) {
      res.bucket = 'QUANTITY';
      res.quantityType = 'PERCENT';
    } else if (/^\s*(km|kilomet|m\b|kg|tonne|tons|litre|liter|million|billion|trillion|thousand)/i.test(t)) {
      res.bucket = 'QUANTITY';
      res.quantityType = 'MEASURE';
    } else if (/\b(year|century|decade|anniversary)\b/i.test(t)) {
      res.bucket = 'DATE';
      res.dateType = 'YEAR_LIKE';
    } else {
      res.bucket = 'QUANTITY';
      res.quantityType = 'NUMBER';
    }
    res.reason = 'answer is numeric and not owned by the subject as a date';
    return res;
  }

  // Anything else that is a name: the blank is the real subject. Unit
  // designations lead with a digit ("1st The Queen's Dragoon Guards"), so a
  // leading digit is allowed as long as a letter appears somewhere.
  if (/^[\p{L}\p{N}][\p{L}\p{N} .'\u2019-]*$/u.test(raw) && /\p{L}/u.test(raw)) {
    res.bucket = 'MISMATCH';
    res.newSubject = raw;
    res.reason = 'answer is a different entity, so the subject is re-derived from it';
    return res;
  }

  res.reason = 'answer is not a recoverable entity name';
  return res;
}

/**
 * Patch one question in place-safe fashion. The recorded subject is always
 * preserved under sourceSubject so the original provenance is never lost.
 */
function repairQuestion(q) {
  if (!q || typeof q !== 'object') return { q: q, c: null };
  var c = classifyBlank(q.question, q.answer, q.subSubject != null ? q.subSubject : q.subject);
  var out = {};
  Object.keys(q).forEach(function (k) { out[k] = q[k]; });

  if (out.sourceSubject === undefined && out.subSubject !== undefined) {
    out.sourceSubject = out.subSubject;
  }
  if (out.sourceCategory === undefined && out.category !== undefined) {
    out.sourceCategory = out.category;
  }
  out.subjectOwnership = c.bucket;

  switch (c.bucket) {
    case 'MATCH':
      out.subSubjectVerified = true;
      break;
    case 'DATE':
      out.dateType = c.dateType;
      out.subSubjectVerified = true;
      break;
    case 'QUANTITY':
      out.quantityType = c.quantityType;
      out.subSubjectVerified = true;
      break;
    case 'MISMATCH':
      out.subSubject = c.newSubject;
      out.subSubjectVerified = false;
      out.subjectRepaired = true;
      break;
    default:
      out.subSubjectVerified = false;
  }
  return { q: out, c: c };
}

module.exports = {
  classifyBlank: classifyBlank,
  repairQuestion: repairQuestion,
  answerNamesSubject: answerNamesSubject,
  norm: norm,
  key: key,
  BLANK: BLANK
};
