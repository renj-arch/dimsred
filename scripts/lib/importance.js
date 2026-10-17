(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.VlymbooqImportance = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
// Importance scoring for Indian govt-exam questions.
//
// Which questions are highly important/relevant is DECIDED here (rules) and
// refined by qwen3.8:27b verdicts wherever the model touches an item — the
// browser (WebLLM, quiz pickers, archive matcher) then PICKS by these tags.
// Decision and use are split on purpose: judging 500k+ items per page-view
// in a small local model is slow and noisy; judging once in CI is free.
//
// Levels: high (asked before, or PYQ-top subject) / medium (substantive) /
// low (bare trivia). Stored on sidecar + chunk items as
// {importance, importantFor[]} and rendered as badges.

var EXAMS = ['UPSC', 'SSC CGL', 'SSC CHSL', 'SSC GD', 'SSC JE', 'IBPS PO',
  'IBPS Clerk', 'SBI PO', 'SBI Clerk', 'RBI Grade B', 'RRB NTPC', 'NDA',
  'CDS', 'CTET', 'GATE', 'NEET', 'JEE', 'Agniveer', 'UP Police', 'State PSC'];

// Subjects that top real PYQ analyses (pyq-patterns.json: Environment,
// Economy, Polity lead UPSC; Fluid Mechanics SSC-JE-Mech; Static GK CGL;
// Plant Kingdom NEET-Bio; Kinematics JEE-Phy) plus exam cores.
var TOP_SUBJECTS = ['environment', 'ecolog', 'polity', 'constitution',
  'modern history', 'freedom', 'indian economy', 'economy', 'geography',
  'physics', 'chemistry', 'biology', 'botany', 'general science',
  'quant', 'aptitude', 'mathematics', 'reasoning', 'english', 'banking',
  'finance', 'defence', 'security', 'science and tech', 'current affairs',
  'static gk', 'general awareness', 'history'];

function scoreImportance(q) {
  q = q || {};
  var raw = JSON.stringify([q.type, q.category, q.subject, q.source]).toLowerCase();
  if (raw.indexOf('pyq') !== -1 || raw.indexOf('previous year') !== -1) {
    return { level: 'high', why: 'pyq-marked' };
  }
  var subj = String(q.subject || q.category || '').toLowerCase();
  for (var i = 0; i < TOP_SUBJECTS.length; i++) {
    if (subj.indexOf(TOP_SUBJECTS[i]) !== -1) return { level: 'high', why: 'pyq-top-subject' };
  }
  if (/mains|essay|descriptive/i.test(q.type || '')) return { level: 'high', why: 'mains-type' };
  if (q.type === 'qa') return { level: 'medium', why: 'qa' };
  if (q.fact && String(q.fact).length > 100) return { level: 'medium', why: 'has-fact' };
  if (q.options && q.options.length >= 4) return { level: 'medium', why: 'mcq' };
  if ((q.type || '') === 'fill_blank') return { level: 'low', why: 'bare-fill-blank' };
  return { level: 'medium', why: 'default' };
}

function validLevel(l) {
  l = String(l || '').toLowerCase();
  return (l === 'high' || l === 'medium' || l === 'low') ? l : 'medium';
}

function validExams(list) {
  var out = [];
  (Array.isArray(list) ? list : []).forEach(function (e) {
    var up = String(e || '').toUpperCase().trim();
    for (var i = 0; i < EXAMS.length; i++) {
      if (EXAMS[i].toUpperCase() === up && out.indexOf(EXAMS[i]) === -1 && out.length < 5) {
        out.push(EXAMS[i]);
      }
    }
  });
  return out;
}

return {
  EXAMS: EXAMS,
  TOP_SUBJECTS: TOP_SUBJECTS,
  scoreImportance: scoreImportance,
  validLevel: validLevel,
  validExams: validExams
};
}));
