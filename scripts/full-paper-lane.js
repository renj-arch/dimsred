// Assemble a real full-length paper from the question bank, following
// data/exam-blueprints.json exactly. If any section is short the lane refuses
// to publish a padded paper: it writes a gaps report and exits non-zero.
// With --fill it first asks the model lane (scripts/model-fill-bank.js) for
// the missing questions, then re-assembles.
//
// Usage:
//   node scripts/full-paper-lane.js upsc --paper=gs1
//   node scripts/full-paper-lane.js cgl --fill --budget=120
const fs = require('fs');
const path = require('path');
const bp = require('./lib/exam-blueprint');
const llm = require('./lib/ollama');
const fill = require('./model-fill-bank');

const ROOT = path.resolve(__dirname, '..');
const BANK_DIR = path.join(ROOT, 'question-bank');
const DATA_DIR = path.join(ROOT, 'papers-data');
const STATUS = path.join(ROOT, 'data', 'full-paper-status.json');

function args(argv) {
  const out = { _: [] };
  argv.forEach(function (a) {
    const m = /^--([^=]+)=(.*)$/.exec(a);
    if (m) out[m[1]] = m[2];
    else if (a.indexOf('--') === 0) out[a.slice(2)] = true;
    else out._.push(a);
  });
  return out;
}

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } catch (e) { return fallback; }
}

function rng(seedText) {
  let s = 2166136261;
  for (let i = 0; i < seedText.length; i++) s = Math.imul(s ^ seedText.charCodeAt(i), 16777619);
  return function () {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function shuffled(list, random) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function usable(q) {
  return q && q.text && Array.isArray(q.options) && q.options.length === 4 &&
    q.options.some(function (o) { return o.correct; }) && q.solution;
}

function isModel(q) { return q.source === 'model' || q.reviewed === false; }

function pickForSection(bank, sectionDef, count, random, used) {
  const pool = (bank.questions || []).filter(function (q) {
    return usable(q) && !used[q.id] && bp.sectionAccepts(sectionDef, q.section);
  });
  // Reviewed/extracted questions lead; model questions fill the rest and stay
  // badged in the built page.
  const real = shuffled(pool.filter(function (q) { return !isModel(q); }), random);
  const ai = shuffled(pool.filter(isModel), random);
  const picked = real.concat(ai).slice(0, count);
  picked.forEach(function (q) { used[q.id] = 1; });
  return picked;
}

function assemble(examKey, paperId, date) {
  const blueprints = bp.load(ROOT);
  const examDef = bp.exam(blueprints, examKey);
  const paper = bp.paper(blueprints, examKey, paperId);
  if (paper.mcqLane === false || paper.mode === 'descriptive' || paper.mode === 'mixed') {
    throw new Error('paper "' + paper.id + '" is ' + (paper.mode || 'not an MCQ paper') + '; the full-paper MCQ lane cannot assemble it');
  }
  const bank = readJson(path.join(BANK_DIR, examKey + '.json'), null);
  if (!bank) throw new Error('missing bank for ' + examKey);
  const random = rng(examKey + '|' + paper.id + '|' + date);
  const sections = [];
  const gaps = [];
  const used = {};
  for (const s of paper.sections) {
    const picked = pickForSection(bank, s, s.count, random, used);
    if (picked.length < s.count) gaps.push({ section: s.name, need: s.count, have: picked.length, short: s.count - picked.length });
    sections.push({ name: s.name, count: s.count, marks: s.marks, questions: picked });
  }
  return { blueprints, examDef, paper, sections, gaps };
}

function paperJson(examKey, examDef, paper, sections, date) {
  const questions = [];
  sections.forEach(function (s) {
    s.questions.forEach(function (q) {
      questions.push(Object.assign({}, q, { section: s.name, q: questions.length + 1 }));
    });
  });
  const models = Array.from(new Set(questions.filter(isModel).map(function (q) { return q.model; }).filter(Boolean)));
  const nModel = questions.filter(isModel).length;
  const title = examDef.name + ' — ' + paper.name + ' (Full Paper)';
  return {
    kind: 'full',
    folder: examKey,
    slug: 'full-' + date + '-' + examKey + '-' + paper.id,
    title: title,
    pageTitle: title + ' — ' + questions.length + ' Q, solved with explanations',
    pageDesc: 'Free full-length ' + examDef.name + ' ' + paper.name + ' mock test: ' +
      questions.length + ' questions, ' + paper.marks + ' marks, ' + paper.duration +
      ' minutes, answer key and explanations. Generated ' + date + '.',
    meta: questions.length + ' Q · ' + paper.marks + ' marks · ' + paper.duration + ' min · Answer key + explanations',
    paperName: paper.name,
    timerMinutes: paper.duration,
    totalMarks: paper.marks,
    negativeMarking: paper.negative,
    negativeNote: paper.negativeNote || '',
    sectionsMeta: sections.map(function (s) { return { name: s.name, count: s.count, marks: s.marks }; }),
    createdDate: date,
    generatedAt: new Date().toISOString(),
    generatedBy: models.length ? 'qwen model lane (' + models.join(', ') + ')' : 'reviewed question bank',
    modelQuestions: nModel,
    provisional: !!paper.provisional,
    source: paper.source,
    note: paper.note || '',
    sections: sections.map(function (s) { return { name: s.name, color: colorFor(s.name) }; }),
    questions: questions
  };
}

function colorFor(name) {
  const colors = ['#a855f7', '#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#22d3ee', '#f87171', '#a3e635'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}

function writeStatus(entry) {
  const current = readJson(STATUS, { updatedAt: '', papers: [] });
  current.updatedAt = new Date().toISOString();
  current.papers = (current.papers || []).filter(function (p) { return !(p.exam === entry.exam && p.paper === entry.paper); });
  current.papers.unshift(entry);
  current.papers = current.papers.slice(0, 60);
  fs.writeFileSync(STATUS, JSON.stringify(current, null, 2), 'utf-8');
}

async function run(opts) {
  const examKey = opts._[0];
  if (!examKey) throw new Error('usage: node scripts/full-paper-lane.js <exam> [--paper=id] [--date=YYYY-MM-DD] [--fill] [--budget=N]');
  const date = opts.date || new Date().toISOString().slice(0, 10);
  const blueprints = bp.load(ROOT);
  const examDef = bp.exam(blueprints, examKey);
  const paper = bp.paper(blueprints, examKey, opts.paper);
  let built = assemble(examKey, paper.id, date);

  if (built.gaps.length && opts.fill) {
    const budget = parseInt(opts.budget, 10) || 60;
    llm.log(examKey + '/' + paper.id + ': short in ' + built.gaps.map(function (g) { return g.section + ' ' + g.have + '/' + g.need; }).join(', ') + ' — generating with ' + llm.MODEL);
    let left = budget;
    for (const gap of built.gaps) {
      if (left <= 0) break;
      const res = await fill.fillExam(examKey, { paper: paper.id, section: gap.section, count: Math.min(gap.short, left), budget: left });
      left -= res.added || 0;
    }
    built = assemble(examKey, paper.id, date);
  }

  if (built.gaps.length) {
    const entry = {
      exam: examKey, paper: paper.id, date: date, status: 'short',
      model: llm.MODEL, gaps: built.gaps, checkedAt: new Date().toISOString()
    };
    writeStatus(entry);
    console.log(JSON.stringify(entry, null, 2));
    console.log('\nREFUSING to publish a padded paper. Model fill the gaps, then rerun.');
    return { status: 'short', entry: entry };
  }

  const data = paperJson(examKey, examDef, paper, built.sections, date);
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const out = path.join(DATA_DIR, examKey + '-' + data.slug + '.json');
  fs.writeFileSync(out, JSON.stringify(data, null, 2), 'utf-8');
  const entry = {
    exam: examKey, paper: paper.id, date: date, status: 'published',
    slug: data.slug,
    questions: data.questions.length, marks: data.totalMarks, duration: data.timerMinutes,
    modelQuestions: data.modelQuestions, generatedBy: data.generatedBy,
    file: path.relative(ROOT, out).replace(/\\/g, '/'), checkedAt: new Date().toISOString()
  };
  writeStatus(entry);
  console.log(JSON.stringify(entry, null, 2));
  return { status: 'published', entry: entry, data: data };
}

if (require.main === module) {
  const a = args(process.argv.slice(2));
  run(a).then(function (r) {
    process.exit(r.status === 'published' ? 0 : 3);
  }).catch(function (e) {
    console.error('full-paper lane failed: ' + e.message);
    process.exit(1);
  });
}

module.exports = { run: run, assemble: assemble, paperJson: paperJson };
