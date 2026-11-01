'use strict';
// Shared UPSC Mains planning, prompting and acceptance rules.
//
// Why this module exists
// ----------------------
// The MainsFresh agent used to ask a small model to "choose the paper" from a
// prompt whose only example was gs3. The model chose gs3 every single time
// (36/36 items in data/mains-fresh.json), so GS1-GS4, the essay, the two
// optional papers and the two language papers never received a fresh item.
// The owner-runner lane had a copy of the same prompt and the same flaw.
//
// The planner removes the choice from the model:
//   * nextTarget() picks the least-covered paper deterministically (and the
//     least-covered optional subject within an optional paper),
//   * buildPrompt() states the paper, marks, subject and language as facts,
//   * shapeReason() rejects a reply that drifts to another paper,
//   * qualityReason() runs the same rubric the promotion gate uses.
//
// The module is intentionally dependency-free apart from mains-quality so the
// site agent, the on-demand runner, the promotion script and the tests all
// share one definition of a valid item.

const { assess, targetWords } = require('./mains-quality');

const PAPERS = [
  {
    id: 'gs1', name: 'GS Paper 1', kind: 'gs',
    sub: 'Indian Heritage & Culture, History, Geography of the World & Society',
    guide: 'Indian Heritage & Culture, History, Geography of the World & Society. Build answers around a clear chronological or spatial frame, then make an argument: the examiner rewards a thesis, specific evidence and a conclusion, not a list.'
  },
  {
    id: 'gs2', name: 'GS Paper 2', kind: 'gs',
    sub: 'Governance, Constitution, Polity, Social Justice, International Relations',
    guide: 'Governance, Constitution, Polity, Social Justice and International Relations. Name the constitutional provision, institution or agreement, then assess how it works in practice. Description without evaluation scores poorly.'
  },
  {
    id: 'gs3', name: 'GS Paper 3', kind: 'gs',
    sub: 'Economy, Environment, Security, Technology, Disaster Management',
    guide: 'Economy, Environment, Security, Technology and Disaster Management. Link the concept to a named policy, scheme or institution, show the trade-off, and end with an implementable way forward.'
  },
  {
    id: 'gs4', name: 'GS Paper 4', kind: 'gs',
    sub: 'Ethics, Integrity, Aptitude, Emotional Intelligence, Public administration',
    guide: 'Ethics, Integrity and Aptitude. For case studies, name the competing values, establish the facts, choose a defensible course and explain the consequences for each stakeholder. Generic moralising is the common failure.'
  },
  {
    id: 'essay', name: 'Essay', kind: 'essay',
    sub: 'Written 1000-1200 words, 125 marks',
    guide: 'One essay of 125 marks (1000-1200 words). The reviewed items are scaffoldings, not finished essays: a thesis, body movements and a conclusion that you must write in your own words.'
  },
  {
    id: 'optional1', name: 'Optional Paper 1', kind: 'optional',
    sub: "Candidate's choice of subject, 250 marks",
    guide: 'Optional Paper I (250 marks). The subject is chosen by the candidate, so this page filters by subject. The questions here are practice questions, not a full paper; use the syllabus map below to see what each subject covers.'
  },
  {
    id: 'optional2', name: 'Optional Paper 2', kind: 'optional',
    sub: "Candidate's choice of subject, 250 marks",
    guide: 'Optional Paper II (250 marks). Same subject as Paper I, usually a different part of the syllabus. Filter by subject to see the available questions and the syllabus focus for each paper.'
  },
  {
    id: 'lang-indian', name: 'Indian Language', kind: 'language',
    sub: 'Qualifying paper - one Indian language, 300 marks',
    guide: 'Qualifying paper (300 marks, 25% qualifying). One Indian language chosen by the candidate. The worked example here is Hindi; the paper tests comprehension, precis, essay, grammar and translation. The practice task is a model, not a full 300-mark paper.'
  },
  {
    id: 'lang-english', name: 'English Language', kind: 'language',
    sub: 'Qualifying paper - English, 300 marks',
    guide: 'Qualifying paper (300 marks, 25% qualifying). Tests comprehension, precis, essay, grammar and vocabulary. The practice task here is a model, not a full 300-mark paper; write your own answer before reading the skeleton.'
  }
];

const PAPER_IDS = PAPERS.map(p => p.id);
const PAPER_BY_ID = {};
PAPERS.forEach(p => { PAPER_BY_ID[p.id] = p; });

const OPTIONAL_SUBJECTS = [
  { id: 'psir', name: 'Political Science & International Relations', p1: 'Political theory; comparative politics; international relations', p2: 'India: constitutional and political system; social movements; foreign policy' },
  { id: 'sociology', name: 'Sociology', p1: 'Sociology as a discipline; basic concepts; social stratification; work and economic life', p2: 'Indian society: structure, change, caste, tribe, family, religion and social movements' },
  { id: 'history', name: 'History', p1: 'Ancient and medieval India; sources; art, architecture and culture', p2: 'Modern India and world history: British rule, nationalism, freedom movement, world history since 1945' },
  { id: 'geography', name: 'Geography', p1: 'Geomorphology, climatology, oceanography, biogeography and environmental geography', p2: 'Geography of India: physical, economic, social and regional geography; contemporary issues' },
  { id: 'pubadmin', name: 'Public Administration', p1: 'Administrative theory; organisation; management; public policy', p2: 'Indian administration: constitutional framework, civil services and reforms' },
  { id: 'economics', name: 'Economics', p1: 'Microeconomics; macroeconomics; money and banking; public finance', p2: 'Indian economy: growth, development, sectors, external sector and policy' },
  { id: 'anthropology', name: 'Anthropology', p1: 'Physical anthropology; social anthropology; archaeological anthropology', p2: 'Indian anthropology: tribes, caste, kinship, religion and development' },
  { id: 'philosophy', name: 'Philosophy', p1: 'Western philosophy: Greek, modern, epistemology and metaphysics', p2: 'Indian philosophy: schools, ethics, political philosophy and religion' }
];
const OPTIONAL_BY_ID = {};
OPTIONAL_SUBJECTS.forEach(s => { OPTIONAL_BY_ID[s.id] = s; });

const MARKS_BY_KIND = {
  gs: [10, 15, 20],
  essay: [125, 250],
  optional: [10, 15, 20, 25, 30],
  language: [10, 15, 20, 25, 30]
};

const PAPER_HINTS = {
  gs1: 'Choose an under-covered GS1 syllabus area: modern Indian history, the freedom movement, world history, Indian society, or geography. Prefer a question that asks for an argument, not a recollection of a list.',
  gs2: 'Choose an under-covered GS2 area: constitutional bodies, governance, social justice, welfare delivery, or India and its neighbourhood. Anchor the answer in a named provision, institution, scheme or agreement.',
  gs3: 'Choose an under-covered GS3 area: growth and employment, agriculture, infrastructure, energy, environment, disaster management, internal security or technology. Anchor the answer in a named policy, regulator, scheme or report.',
  gs4: 'Choose an under-covered GS4 area: a case study on administrative ethics, conflict of interest, accountability, or a theory question on a named ethical framework. A case study must have a concrete decision, not a list of values.',
  essay: 'Set an essay theme that rewards argument across public life, history, science, culture or ethics. Avoid a slogan. The answer is a scaffolding for a 1000-1200 word essay, not a finished essay.',
  optional1: 'Set an Optional Paper I question for the named subject, at the depth of the UPSC optional syllabus. Use the subject name exactly as given. A question that could appear in a GS paper is too shallow.',
  optional2: 'Set an Optional Paper II question for the named subject, covering the Paper II part of the syllabus. Use the subject name exactly as given. A question that could appear in a GS paper is too shallow.',
  'lang-indian': 'Set an Indian Language qualifying-paper practice task in Hindi (Devanagari). The question and the model answer must both be in Hindi. A 250-word essay is appropriate; do not write a full 300-mark paper.',
  'lang-english': 'Set an English Language qualifying-paper practice task: a 250-word essay, a precis or a comprehension-style writing task. The question and model answer must be in English.'
};

function paper(id) { return PAPER_BY_ID[id] || null; }
function optionalSubject(id) { return OPTIONAL_BY_ID[id] || null; }
function paperKind(id) { const p = paper(id); return p ? p.kind : ''; }
function allowedMarks(id) { return MARKS_BY_KIND[paperKind(id)] || []; }

function normalize(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9\u0900-\u097F]+/g, ' ').trim();
}

function paperCounts(items) {
  const out = {};
  PAPERS.forEach(p => { out[p.id] = 0; });
  (Array.isArray(items) ? items : []).forEach(item => {
    if (item && out[item.paper] != null) out[item.paper]++;
  });
  return out;
}

function subjectCounts(items, paperId) {
  const out = {};
  OPTIONAL_SUBJECTS.forEach(s => { out[s.id] = 0; });
  (Array.isArray(items) ? items : []).forEach(item => {
    if (item && item.paper === paperId && out[item.subject] != null) out[item.subject]++;
  });
  return out;
}

// Least-covered optional subject for this paper. Ties keep the catalogue
// order, which is the order the page shows, so the first few runs walk the
// list instead of repeatedly asking for PSIR.
function nextOptionalSubject(items, paperId) {
  const counts = subjectCounts(items, paperId);
  const min = Math.min.apply(null, OPTIONAL_SUBJECTS.map(s => counts[s.id]));
  return OPTIONAL_SUBJECTS.filter(s => counts[s.id] === min)[0] || OPTIONAL_SUBJECTS[0];
}

// Choose the next paper and the concrete target facts. Deterministic and
// independent of the model: the least-covered paper wins; ties rotate from
// the last paper the caller says it generated (opts.cursor).
function nextTarget(items, opts) {
  const list = Array.isArray(items) ? items : [];
  const options = opts || {};
  let p = options.paper ? paper(options.paper) : null;
  if (!p) {
    const counts = paperCounts(list);
    const exclude = Array.isArray(options.exclude) ? options.exclude : [];
    const candidates = PAPERS.filter(x => exclude.indexOf(x.id) === -1);
    const min = Math.min.apply(null, candidates.map(x => counts[x.id] || 0));
    let least = candidates.filter(x => (counts[x.id] || 0) === min);
    const cursor = options.cursor ? PAPER_IDS.indexOf(options.cursor) : -1;
    if (cursor >= 0 && least.length > 1) {
      least = least.slice().sort((a, b) => {
        const ai = PAPER_IDS.indexOf(a.id);
        const bi = PAPER_IDS.indexOf(b.id);
        return ((ai - cursor + PAPER_IDS.length) % PAPER_IDS.length) -
               ((bi - cursor + PAPER_IDS.length) % PAPER_IDS.length);
      });
    }
    p = least[0];
  }
  if (!p) return null;

  const count = list.filter(x => x && x.paper === p.id).length;
  const target = {
    paper: p.id,
    name: p.name,
    kind: p.kind,
    marks: 15,
    subject: '',
    subjectName: '',
    lang: '',
    task: '',
    maxTokens: 3400
  };
  if (p.kind === 'gs') target.marks = [15, 20, 10][count % 3];
  if (p.kind === 'essay') { target.marks = 125; target.maxTokens = 6000; }
  if (p.kind === 'optional') {
    target.marks = [15, 20, 10][count % 3];
    const subject = (options.subject && optionalSubject(options.subject)) || nextOptionalSubject(list, p.id);
    target.subject = subject.id;
    target.subjectName = subject.name;
  }
  if (p.kind === 'language') {
    target.marks = 15;
    target.lang = p.id === 'lang-indian' ? 'hi' : 'en';
    target.task = 'essay';
  }
  return target;
}

function targetLabel(target) {
  if (!target) return '';
  let label = target.name + ' (' + target.marks + ' marks)';
  if (target.subjectName) label += ', ' + target.subjectName;
  if (target.lang) label += ', ' + (target.lang === 'hi' ? 'Hindi' : 'English');
  return label;
}

function buildPrompt(target, seeds, stricter) {
  if (!target) throw new Error('buildPrompt needs a target');
  const shape = {
    paper: target.paper,
    topic: 'short topic label',
    marks: target.marks,
    difficulty: 'medium',
    question: 'full question text including the marking note, e.g. (' + target.marks + ' marks, ' + targetWords(target.marks) + ' words)',
    answer: [{ h: 'short heading', p: '2-4 sentence paragraph' }],
    marksGuide: ['what the examiner rewards'],
    pitfalls: ['how this is answered badly'],
    keywords: ['term'],
    laws: ['law, case or scheme, only if certain']
  };
  if (target.subject) shape.subject = target.subject;
  if (target.lang) { shape.lang = target.lang; shape.task = target.task; }

  const paperLine = target.subject
    ? 'TARGET: ' + target.name + ' (' + target.paper + '), optional subject "' + target.subject + '" (' + target.subjectName + '), ' + target.marks + ' marks.'
    : target.lang
      ? 'TARGET: ' + target.name + ' (' + target.paper + '), language "' + target.lang + '", task "' + target.task + '", ' + target.marks + ' marks.'
      : 'TARGET: ' + target.name + ' (' + target.paper + '), ' + target.marks + ' marks.';

  const lengthLine = target.kind === 'essay'
    ? 'The answer is a scaffolding for a 1000-1200 word essay: 5 or 6 sections, each 300-900 characters, total at least 850 words. The first heading may be "How to build this essay" or "Introduction"; the last heading MUST be "Conclusion".'
    : target.kind === 'language'
      ? 'The whole answer must reach at least 250 words. Use 5 sections, each 150-600 characters. The first heading should set the context and the last heading MUST be "Conclusion" (Hindi: "निष्कर्ष").'
      : 'The whole answer must reach at least ' + targetWords(target.marks) + ' words. Use 4 to 6 sections, each 150-700 characters. The first heading should set the context; the last heading MUST be "Way forward" or "Conclusion".';

  const subjectLine = target.subject
    ? 'The "subject" field MUST be exactly "' + target.subject + '". Do not choose a different optional subject.'
    : target.lang
      ? 'The "lang" field MUST be exactly "' + target.lang + '" and the "task" field MUST be exactly "' + target.task + '". ' +
        (target.lang === 'hi' ? 'Write both the question and the model answer in Hindi (Devanagari script).' : 'Write both the question and the model answer in English.')
      : '';

  const sys = 'You write UPSC Civil Services Mains practice questions with model-answer skeletons for Indian aspirants. ' +
    'Reply with ONE valid JSON object and nothing else: no markdown fences, no commentary before or after. ' +
    'Shape: ' + JSON.stringify(shape) + '. ' +
    paperLine + ' ' + (subjectLine ? subjectLine + ' ' : '') +
    'The "paper" field MUST be exactly "' + target.paper + '" and the "marks" field MUST be exactly ' + target.marks + '. ' +
    '4 to 6 objects in "answer"; 3 to 5 strings each in marksGuide and pitfalls; 5 to 8 keywords; "laws" may be []. ' +
    'Constraints: ' + lengthLine + ' ' +
    'Keep every "p" paragraph to 2-3 sentences and under 700 characters, except an essay scaffolding where a section may be up to 900 characters (the reply has a strict token budget — longer text gets cut off and the item is rejected). ' +
    'Never invent a scheme, case, article or statistic: name a reform only when certain of it, with its year; a verified older example beats an uncertain new one. Prefer safe, verifiable general knowledge. Stay exam-safe and neutral. ' +
    'Structure the skeleton like a strong answer: the FIRST object in "answer" opens with context — define the term or topic and say where or when it took shape (an agreement, body or year, and only when certain) — never start mid-argument; ' +
    'the LAST object is a way forward or conclusion, 2-3 sentences on what should change or what to watch; the middle objects carry the analysis. ' +
    'Across the answer, place 2 to 3 specific anchors — a court, committee, agreement, scheme, fund, index or landmark event — each one only when you are certain of it; a paragraph that names no real thing is a weak paragraph. For a language-paper answer, the anchor rule is waived: the quality of the prose and the task response matter instead. ' +
    'For a topic with a governing law, agreement or scheme you are certain of, name at least one in "laws"; keep [] only when nothing is certain. ' +
    'Do not reason step by step; reply with ONLY the JSON object. ' +
    (PAPER_HINTS[target.paper] || '');

  const lines = [];
  lines.push('Create ONE practice question for: ' + targetLabel(target) + '.');
  lines.push('Do not change the paper, marks, subject or language: the target is fixed by the site, not chosen by you.');
  lines.push('');
  lines.push('ALREADY COVERED (do not repeat, do not reword, and do not choose the same topic):');
  lines.push(seeds.length
    ? seeds.map(function (s, i) { return (i + 1) + '. ' + s; }).join('\n')
    : '(none provided — prefer a fresh, less over-used angle)');
  if (stricter) {
    lines.push('', 'IMPORTANT: the previous reply was invalid, cut off, or drifted to another paper/topic. ' +
      'Reply with ONLY the JSON object. The "paper" field must be "' + target.paper + '" and the "marks" field must be ' + target.marks + '. ' +
      'Keep each "p" paragraph to 2-3 sentences and under 700 characters.');
  }
  return { sys: sys, user: lines.join('\n') };
}

function topicTokens(s) {
  const stop = { the: 1, a: 1, an: 1, and: 1, or: 1, of: 1, in: 1, on: 1, for: 1, to: 1, with: 1, by: 1, from: 1, is: 1, are: 1, as: 1, at: 1, its: 1, it: 1, this: 1, that: 1, india: 1, indian: 1 };
  return normalize(s).split(' ').filter(t => t.length > 2 && !stop[t]);
}

function topicSimilar(a, b) {
  const A = {}, B = {};
  topicTokens(a).forEach(t => { A[t] = 1; });
  topicTokens(b).forEach(t => { B[t] = 1; });
  const ak = Object.keys(A), bk = Object.keys(B);
  if (!ak.length || !bk.length) return false;
  let inter = 0;
  ak.forEach(t => { if (B[t]) inter++; });
  const min = Math.min(ak.length, bk.length);
  return inter >= 2 && inter / min >= 0.6;
}

function isDuplicate(candidate, known) {
  if (!candidate || !Array.isArray(known)) return null;
  const q = normalize(candidate.question);
  if (!q) return null;
  for (let i = 0; i < known.length; i++) {
    const k = known[i];
    if (!k || !k.question) continue;
    const kq = normalize(k.question);
    if (kq && (kq === q || kq.slice(0, 80) === q.slice(0, 80))) return k;
    if (String(k.paper || '') === String(candidate.paper || '') && topicSimilar(candidate.topic, k.topic)) return k;
  }
  return null;
}

// Shape gate. Deliberately checks target facts before the quality rubric, so
// a well-written reply for the wrong paper is still rejected.
function shapeReason(o, target) {
  if (!o || typeof o !== 'object') return 'not an object';
  const q = String(o.question || '').trim();
  const maxQ = target && target.kind === 'language' ? 1000 : 900;
  if (q.length < 40 || q.length > maxQ) return 'question length';
  if (/[<>]/.test(q)) return 'question markup';
  const paper = String(o.paper || '');
  if (!PAPER_BY_ID[paper]) return 'paper';
  if (target && target.paper && paper !== target.paper) return 'wrong paper (expected ' + target.paper + ')';
  const marks = Number(o.marks);
  const allowed = allowedMarks(paper);
  if (allowed.indexOf(marks) === -1) return 'marks';
  if (target && target.marks && marks !== target.marks) return 'wrong marks (expected ' + target.marks + ')';
  if (target && target.subject && String(o.subject || '') !== target.subject) return 'wrong subject (expected ' + target.subject + ')';
  if (target && target.lang && String(o.lang || '') !== target.lang) return 'wrong language (expected ' + target.lang + ')';
  if (target && target.lang && String(o.task || '') !== target.task) return 'wrong task (expected ' + target.task + ')';
  if (['easy', 'medium', 'high'].indexOf(String(o.difficulty)) === -1) return 'difficulty';
  const ans = Array.isArray(o.answer) ? o.answer.filter(s => s && (s.h || s.p)) : [];
  if (ans.length < 4 || ans.length > 6) return 'answer sections';
  const maxP = target && target.kind === 'essay' ? 2200 : 1500;
  for (let i = 0; i < ans.length; i++) {
    const s = ans[i];
    if (String(s.h || '').length < 2 || String(s.h || '').length > 90) return 'section heading';
    if (String(s.p || '').length < 120 || String(s.p || '').length > maxP) return 'section paragraph';
  }
  if (!Array.isArray(o.marksGuide) || o.marksGuide.length < 3 || o.marksGuide.length > 6) return 'marksGuide';
  if (!Array.isArray(o.pitfalls) || o.pitfalls.length < 3 || o.pitfalls.length > 6) return 'pitfalls';
  if (!Array.isArray(o.keywords) || o.keywords.length < 5 || o.keywords.length > 8) return 'keywords';
  if (!Array.isArray(o.laws) || o.laws.length > 8) return 'laws';
  if (target && target.lang === 'hi') {
    const body = q + ' ' + ans.map(s => String(s.h || '') + ' ' + String(s.p || '')).join(' ');
    const devanagari = (body.match(/[\u0900-\u097F]/g) || []).length;
    if (devanagari < 40) return 'Hindi (Devanagari) expected';
  }
  return null;
}

// Quality gate: the same rubric scripts/promote-mains.js uses. The agent is
// stricter (score 80) so weak items do not fill the public fresh batch.
function qualityReason(o) {
  const qa = assess(o);
  if (!qa.ok || qa.score < 80) {
    return 'quality: ' + (qa.failures.join('; ') || ('score ' + qa.score));
  }
  return null;
}

function validate(o, target, known) {
  const shape = shapeReason(o, target);
  if (shape) return shape;
  const dup = isDuplicate(o, known);
  if (dup) return 'duplicate of ' + (dup.id || 'a covered question');
  const quality = qualityReason(o);
  if (quality) return quality;
  return null;
}

function toItem(o, target, meta) {
  const m = meta || {};
  const maxP = target && target.kind === 'essay' ? 2200 : 1500;
  const item = {
    id: m.id || ((m.prefix || 'ci-') + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6)),
    at: new Date().toISOString().slice(0, 10),
    paper: String(o.paper),
    topic: String(o.topic || 'AI practice').slice(0, 160),
    marks: Number(o.marks),
    difficulty: String(o.difficulty),
    years: [],
    question: String(o.question).trim(),
    answer: o.answer.filter(s => s && (s.h || s.p)).slice(0, 6)
      .map(s => ({ h: String(s.h || 'Section').slice(0, 120), p: String(s.p || '').slice(0, maxP) })),
    marksGuide: o.marksGuide.filter(Boolean).map(String).slice(0, 6),
    pitfalls: o.pitfalls.filter(Boolean).map(String).slice(0, 6),
    laws: (o.laws || []).filter(Boolean).map(String).slice(0, 8),
    keywords: o.keywords.filter(Boolean).map(String).slice(0, 8),
    origin: m.origin || 'ci',
    ai: 1,
    model: m.model || ''
  };
  if (target && target.subject) item.subject = target.subject;
  if (target && target.lang) { item.lang = target.lang; item.task = target.task; }
  const qa = assess(item);
  item.quality = { score: qa.score, words: qa.words, targetWords: qa.targetWords, anchors: qa.anchors };
  return item;
}

function coverage(items) {
  const list = Array.isArray(items) ? items : [];
  const byPaper = paperCounts(list);
  const bySubject = {};
  list.forEach(item => {
    if (!item || !item.subject) return;
    const k = String(item.paper) + ':' + String(item.subject);
    bySubject[k] = (bySubject[k] || 0) + 1;
  });
  return { total: list.length, byPaper: byPaper, bySubject: bySubject };
}

module.exports = {
  PAPERS,
  PAPER_IDS,
  OPTIONAL_SUBJECTS,
  MARKS_BY_KIND,
  paper,
  optionalSubject,
  paperKind,
  allowedMarks,
  normalize,
  paperCounts,
  subjectCounts,
  nextOptionalSubject,
  nextTarget,
  targetLabel,
  buildPrompt,
  topicTokens,
  topicSimilar,
  isDuplicate,
  shapeReason,
  qualityReason,
  validate,
  toItem,
  coverage
};
