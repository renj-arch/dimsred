'use strict';
// Quality gate for a mains practice item before it can enter the reviewed bank.
//
// This is deliberately stricter than the shape checks used when the AI batch is
// written. Shape checks stop a broken JSON item; this gate asks whether the
// answer is actually usable in an exam: does it answer the directive, is it
// long enough for the marks, does it end with a conclusion, and does it name
// real, checkable anchors instead of vague filler?
//
// It cannot judge whether an argument is brilliant. It can stop the obvious
// weak items, and the owner still reads every promoted answer.

const DIRECTIVE = /\b(discuss|examine|critically|evaluate|analyse|analyze|elucidate|comment|explain|compare|contrast|assess|justify|what|why|how|to what extent|bring out|highlight)\b/i;
const CONCLUSION = /\b(way forward|conclusion|outlook|recommendation|resolution|takeaway|epilogue|what should change|the road ahead)\b/i;
const INTRO = /\b(introduction|context|background|significance|overview|setting the scene|why it matters)\b/i;
const META = /\b(as an ai|as a language model|i cannot|i think|in this answer|this answer will|let me (?:explain|write|answer)|here(?:'s| is) (?:the|my|a) (?:answer|response|json))\b/i;
const PLACEHOLDER = /(\[insert|tbd|todo|lorem ipsum|xxx)/i;
const ANCHOR = /\b(article\s+\d+[a-z]?|section\s+\d+|act\s+\d{4}|committee|commission|court|tribunal|scheme|yojana|mission|policy|agreement|convention|treaty|fund|index|report|survey|census|budget|gst|rbi|sebi|niti aayog|supreme court|high court|parliament|constitution)\b/gi;
const VALUE = /\b(justice|liberty|equality|integrity|empathy|compassion|accountability|transparency|constitutional morality|dharma|kant|rawls|aristotle|gandhi)\b/gi;

function words(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

function targetWords(marks) {
  const m = Number(marks);
  if (m === 10) return 150;
  if (m === 15) return 250;
  if (m === 20) return 300;
  if (m === 125) return 1000;
  if (m === 250) return 2000;
  return 200;
}

function countAnchors(text) {
  const seen = {};
  const s = String(text || '');
  let m;
  ANCHOR.lastIndex = 0;
  while ((m = ANCHOR.exec(s))) {
    const k = m[0].toLowerCase();
    if (k.length > 3) seen[k] = 1;
  }
  return Object.keys(seen).length;
}

function countValues(text) {
  const seen = {};
  const s = String(text || '');
  let m;
  VALUE.lastIndex = 0;
  while ((m = VALUE.exec(s))) seen[m[0].toLowerCase()] = 1;
  return Object.keys(seen).length;
}

function assess(item) {
  const failures = [];
  const warnings = [];
  if (!item || typeof item !== 'object') {
    return { ok: false, score: 0, failures: ['not an object'], warnings: [], words: 0, targetWords: 0, anchors: 0 };
  }
  const q = String(item.question || '').trim();
  const sections = (Array.isArray(item.answer) ? item.answer : [])
    .filter(s => s && (s.h || s.p))
    .map(s => ({ h: String(s.h || '').trim(), p: String(s.p || '').trim() }));
  const body = sections.map(s => s.p).join(' ');
  const total = words(body);
  const target = targetWords(item.marks);
  const anchors = countAnchors(body + ' ' + (item.laws || []).join(' '));
  const values = countValues(body);

  if (q.length < 40 || q.length > 700) failures.push('question must be 40–700 characters');
  if (/[<>]/.test(q)) failures.push('question contains markup');
  if (item.paper !== 'essay' && !DIRECTIVE.test(q)) failures.push('question has no directive word (Discuss / Examine / Evaluate / What / Why…)');
  if (!/\b(10|15|20|125|250)\s*marks?\b/i.test(q)) warnings.push('question does not state the marks');
  if (!/\b\d{3,4}\s*words?\b/i.test(q)) warnings.push('question does not state the word limit');
  if (META.test(q + ' ' + body)) failures.push('contains model/meta text');
  if (PLACEHOLDER.test(q + ' ' + body)) failures.push('contains a placeholder');

  if (sections.length < 4) failures.push('needs at least 4 answer sections');
  if (sections.length > 10) warnings.push('more than 10 answer sections');
  const heads = {};
  for (const s of sections) {
    if (!s.h) failures.push('a section has no heading');
    if (s.h.length > 90) failures.push('a section heading is too long');
    if (s.h && heads[s.h.toLowerCase()]) failures.push('duplicate section heading: ' + s.h);
    if (s.h) heads[s.h.toLowerCase()] = 1;
    if (words(s.p) < 18) failures.push('a section is too short to carry an argument');
  }
  if (!sections.length || !CONCLUSION.test(sections[sections.length - 1].h)) {
    failures.push('last section must be a way forward or conclusion');
  }
  if (sections.length && !INTRO.test(sections[0].h) && !/\b(is|are|refers to|means|describes|emerged|began|since|after)\b/i.test(sections[0].p)) {
    warnings.push('first section does not clearly set the context');
  }

  if (total < target * 0.7) {
    failures.push('answer is too short: ' + total + ' words, need at least ' + Math.round(target * 0.7) + ' for ' + item.marks + ' marks');
  } else if (total < target * 0.85) {
    warnings.push('answer is a little short: ' + total + ' words (target ' + target + ')');
  } else if (total > target * 1.8) {
    warnings.push('answer is long: ' + total + ' words (target ' + target + ')');
  }

  if (item.paper !== 'essay' && anchors < 2 && !(item.paper === 'gs4' && values >= 2)) {
    failures.push('needs at least two checkable anchors (act, case, committee, scheme, report…) or, for GS4, two named ethical values');
  }
  if (!Array.isArray(item.marksGuide) || item.marksGuide.length < 3) failures.push('needs at least 3 examiner-reward points');
  if (!Array.isArray(item.pitfalls) || item.pitfalls.length < 3) failures.push('needs at least 3 pitfalls');
  if (!Array.isArray(item.keywords) || item.keywords.length < 5) failures.push('needs at least 5 keywords');

  let score = 100;
  score -= failures.length * 18;
  score -= warnings.length * 4;
  if (anchors >= 3) score += 4;
  if (total >= target && total <= target * 1.5) score += 4;
  score = Math.max(0, Math.min(100, score));

  return {
    ok: failures.length === 0 && score >= 75,
    score,
    failures,
    warnings,
    words: total,
    targetWords: target,
    anchors,
    values,
    sections: sections.length
  };
}

module.exports = { assess, targetWords, words };
