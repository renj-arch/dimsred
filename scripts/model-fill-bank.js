// Model-only question generation. Replaces the old procedural filler: every
// new practice question is written by the quality Ollama lane (qwen 9B/27B)
// and rejected unless it is a structurally complete, self-consistent MCQ.
//
// Usage:
//   node scripts/model-fill-bank.js upsc --count=15
//   node scripts/model-fill-bank.js cgl --count=30 --paper=tier1
//   node scripts/model-fill-bank.js neet --section=Botany --count=10
//
// Results are appended to question-bank/<exam>.json with provenance
// (source, model, generatedAt, reviewed:false) so the UI can badge them.
const fs = require('fs');
const path = require('path');
const bp = require('./lib/exam-blueprint');
const llm = require('./lib/ollama');

const ROOT = path.resolve(__dirname, '..');
const BANK_DIR = path.join(ROOT, 'question-bank');
const COLORS = ['#a855f7', '#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#22d3ee', '#f87171', '#a3e635'];

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

function maxId(bank) {
  return (bank.questions || []).reduce(function (m, q) { return Math.max(m, parseInt(q.id, 10) || 0); }, 0);
}

function meaningful(s) { return String(s || '').replace(/[^A-Za-z0-9]+/g, ' ').trim(); }

function validItem(item, bank, batch) {
  if (!item || typeof item !== 'object') return 'not an object';
  const text = llm.clean(item.text || item.q || item.stem);
  if (text.length < 12 || text.length > 600) return 'bad stem length';
  if (!Array.isArray(item.options) || item.options.length !== 4) return 'needs exactly 4 options';
  const opts = item.options.map(function (o) { return llm.clean(typeof o === 'string' ? o : (o && o.text)); });
  if (opts.some(function (o) { return o.length < 1 || o.length > 220; })) return 'bad option length';
  if (new Set(opts.map(function (o) { return llm.norm(o); })).size !== 4) return 'duplicate options';
  if (opts.every(function (o) { return /^[A-D][.)]?$/.test(o); })) return 'bare-letter options';
  let correct = item.correct;
  if (typeof correct === 'string' && /^[A-Da-d]$/.test(correct)) correct = correct.toUpperCase().charCodeAt(0) - 65;
  correct = parseInt(correct, 10);
  if (!(correct >= 0 && correct <= 3)) return 'bad correct index';
  const solution = llm.clean(item.solution || item.s || item.explanation || item.a);
  if (solution.length < 30) return 'solution too short';
  if (!/[.!?]/.test(solution)) return 'solution is not prose';
  const leak = llm.leak(text + ' ' + opts.join(' ') + ' ' + solution);
  if (leak) return 'meta text (' + leak + ')';
  if (/\b(?:lorem ipsum|placeholder|TODO|TBD)\b/i.test(text + ' ' + solution)) return 'placeholder text';
  const key = llm.norm(text);
  const inBank = (bank.questions || []).some(function (q) { return llm.norm(q.text) === key; });
  if (inBank) return 'duplicate of bank';
  if (batch.some(function (q) { return llm.norm(q.text) === key; })) return 'duplicate in batch';
  // A correct answer that is only "All of the above" cannot be explained by
  // the option text alone; keep it only when the solution names the options.
  if (/^all of the above$/i.test(opts[correct]) && !/all of the above/i.test(solution)) return 'all-of-the-above without explanation';
  return '';
}

function promptFor(section, count, examName, paperName, seeds) {
  return [
    'You are a senior ' + examName + ' paper setter. Paper: ' + paperName + '.',
    'Write ' + count + ' NEW multiple-choice questions for the section "' + section + '".',
    'They must match the real exam standard: single correct answer, four plausible options, no ambiguity.',
    'Use only standard syllabus facts you are certain of. Never invent a scheme, date, person, formula or statistic.',
    'Do not copy the seed questions; they only show the level and the topics already covered.',
    '',
    'Seeds (do not duplicate):',
    seeds.length ? seeds.slice(0, 12).map(function (s) { return '- ' + s; }).join('\n') : '(none)',
    '',
    'Return STRICT JSON array only, no markdown. Each element:',
    '{"text":"question stem","options":["A text","B text","C text","D text"],"correct":0,"solution":"2-4 sentences: why the key is right and why the other three are wrong","topic":"sub-topic","difficulty":"easy|medium|hard"}',
    '',
    'Rules:',
    '- "correct" is the 0-based index of the right option.',
    '- The solution must be self-contained and must not mention "the model", "the prompt" or rewriting.',
    '- Vary the correct index across items; do not always use 0.',
    '- Every question must be answerable from the stem and options alone.',
    '- Return exactly ' + count + ' items.'
  ].join('\n');
}

async function generateSection(section, sectionDef, need, examName, paperName, bank, batch, budget) {
  if (need <= 0 || budget.left <= 0) return 0;
  const want = Math.min(need, budget.left, 12);
  const seeds = (bank.questions || []).filter(function (q) {
    return bp.sectionAccepts(sectionDef, q.section);
  }).slice(-12).map(function (q) { return q.text; });
  let added = 0;
  for (let attempt = 0; attempt < 3 && added < want && budget.left > 0; attempt++) {
    const ask = Math.min(want - added, budget.left);
    llm.log('generating ' + ask + ' x ' + section + ' (' + (paperName || examName) + ') attempt ' + (attempt + 1));
    let items;
    try {
      items = await llm.callArray([{ role: 'user', content: promptFor(section, ask, examName, paperName, seeds.concat(batch.map(function (q) { return q.text; }))) }],
        { temperature: 0.55, numPredict: Math.min(4200, 260 + ask * 260) }, 'fill/' + section);
    } catch (e) {
      llm.log(section + ': generation failed - ' + e.message);
      continue;
    }
    for (const item of items) {
      if (added >= want || budget.left <= 0) break;
      const reason = validItem(item, bank, batch);
      if (reason) { llm.log('  rejected: ' + reason); continue; }
      const opts = item.options.map(function (o) { return llm.clean(typeof o === 'string' ? o : o.text); });
      const correct = typeof item.correct === 'string' && /^[A-Da-d]$/.test(item.correct)
        ? item.correct.toUpperCase().charCodeAt(0) - 65 : parseInt(item.correct, 10);
      batch.push({
        section: section,
        text: llm.clean(item.text || item.q || item.stem),
        options: opts.map(function (t, i) { return { label: 'ABCD'[i], text: t, correct: i === correct }; }),
        solution: llm.clean(item.solution || item.s || item.explanation || item.a),
        topic: llm.clean(item.topic) || section,
        difficulty: llm.clean(item.difficulty) || 'medium',
        source: 'model',
        model: llm.MODEL,
        generatedAt: new Date().toISOString(),
        reviewed: false
      });
      added++; budget.left--;
    }
  }
  return added;
}

async function fillExam(examKey, opts) {
  opts = opts || {};
  const blueprint = bp.load(ROOT);
  const examDef = bp.exam(blueprint, examKey);
  const meta = readJson(path.join(BANK_DIR, examKey + '-meta.json'), {});
  const nextSet = (meta.lastSetNumber || 0) + 1;
  const paper = opts.paper ? bp.paper(blueprint, examKey, opts.paper) : bp.paperForDaily(blueprint, examKey, nextSet);
  const bankPath = path.join(BANK_DIR, examKey + '.json');
  const bank = readJson(bankPath, null);
  if (!bank) throw new Error('missing bank ' + bankPath);
  bank.questions = bank.questions || [];
  bank.sections = bank.sections || [];

  let plan;
  if (opts.section) {
    const def = paper.sections.find(function (s) { return s.name === opts.section; });
    if (!def) throw new Error('no section "' + opts.section + '" in ' + examKey + '/' + paper.id);
    plan = [{ name: def.name, count: parseInt(opts.count, 10) || 10, bank: (def.bank && def.bank.length) ? def.bank : [def.name] }];
  } else if (opts.count) {
    plan = bp.allocate(parseInt(opts.count, 10), paper.sections);
  } else {
    plan = paper.sections.map(function (s) { return { name: s.name, count: s.count, bank: (s.bank && s.bank.length) ? s.bank : [s.name] }; });
  }

  const budget = { left: parseInt(opts.budget, 10) || 40 };
  const batch = [];
  let added = 0;
  for (const p of plan) {
    if (added >= budget.left) break;
    const def = paper.sections.find(function (s) { return s.name === p.name; });
    added += await generateSection(p.name, def, p.count, examDef.name, paper.name, bank, batch, budget);
  }

  if (!batch.length) {
    llm.log(examKey + ': the model produced no valid question - nothing written');
    return { exam: examKey, paper: paper.id, requested: plan, added: 0, model: llm.MODEL };
  }

  let id = maxId(bank);
  batch.forEach(function (q) {
    q.id = ++id;
    q.q = bank.questions.length + 1;
    bank.questions.push(q);
  });
  bank.sections.forEach(function (s) {
    if (!s.color) s.color = COLORS[bank.sections.indexOf(s) % COLORS.length];
  });
  batch.forEach(function (q) {
    if (!bank.sections.some(function (s) { return s.name === q.section; })) {
      bank.sections.push({ name: q.section, color: COLORS[bank.sections.length % COLORS.length] });
    }
  });
  bank.modelFill = { lastRun: new Date().toISOString(), model: llm.MODEL, added: batch.length };
  fs.writeFileSync(bankPath, JSON.stringify(bank, null, 2), 'utf-8');
  llm.log(examKey + ': +' + batch.length + ' model questions (bank ' + bank.questions.length + ', model ' + llm.MODEL + ')');
  return { exam: examKey, paper: paper.id, requested: plan, added: batch.length, model: llm.MODEL, bankSize: bank.questions.length };
}

if (require.main === module) {
  const a = args(process.argv.slice(2));
  const examKey = a._[0];
  if (!examKey) { console.error('usage: node scripts/model-fill-bank.js <exam> [--count=N] [--paper=id] [--section=name] [--budget=N]'); process.exit(2); }
  fillExam(examKey, a).then(function (r) {
    console.log(JSON.stringify(r));
    if (!r.added) process.exit(1);
  }).catch(function (e) {
    console.error('model fill failed: ' + e.message);
    process.exit(1);
  });
}

module.exports = { fillExam: fillExam, validItem: validItem, promptFor: promptFor };
