// Vlymbooq Research Team - the solver/inventor/verifier pipeline.
//
// For each exam question the team runs three roles:
//   1. Scientist  - solves the question independently.
//   2. Inventor   - finds the fastest correct method a student can apply.
//   3. Verifier   - solves again from scratch as a sceptic.
// A method is published only when the Scientist and Verifier reach the same
// answer. "Original" means original to this lab; no world-first claim is made.
//
// Usage:
//   node scripts/research-run.js --limit=6
//   node scripts/research-run.js --limit=6 --exams=cgl,neet
const fs = require('fs');
const path = require('path');
const bp = require('./lib/exam-blueprint');
const llm = require('./lib/ollama');
const store = require('./lib/research-store');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'papers-data');
const TARGETS_FILE = path.join(ROOT, 'data', 'research-build-targets.json');

const TARGET_SECTIONS = [
  'mathematics', 'quantitative aptitude', 'quantitative techniques',
  'reasoning', 'general intelligence & reasoning', 'logical reasoning',
  'physics', 'chemistry', 'csat', 'data interpretation', 'arithmetic'
];

const BANNED_CLAIMS = /\b(world'?s? (first|fastest|only|best)|never (before|known)|unprecedented|revolutionary|impossible for anyone|patent(ed)?)\b/i;

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

function slugifySection(name) {
  return String(name || '').toLowerCase().trim();
}

function roleFor(section) {
  const s = slugifySection(section);
  if (/math|quant|arithmetic|data interpretation/.test(s)) return 'Mathematician';
  if (/physics|chemistry/.test(s)) return 'Scientist';
  if (/reason|logical|intelligence/.test(s)) return 'Logician';
  return 'Scientist';
}

function isTargetSection(name) {
  const s = slugifySection(name);
  return TARGET_SECTIONS.some(function (t) { return s === t || s.indexOf(t) !== -1; });
}

function optionLetter(options, idx) {
  const o = (options || [])[idx];
  return o && o.label ? String(o.label).toUpperCase() : '';
}

function normaliseAnswer(raw, options) {
  const s = String(raw == null ? '' : raw).trim().toUpperCase();
  const letters = (options || []).map(function (o) { return String(o.label).toUpperCase(); });
  // Exact letter.
  if (letters.indexOf(s) !== -1) return s;
  // "Option B", "(B)", "B." etc.
  const m = s.match(/\b([A-E])\b/);
  if (m && letters.indexOf(m[1]) !== -1) return m[1];
  // Model echoed the option text.
  for (let i = 0; i < (options || []).length; i++) {
    const t = String(options[i].text || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (t && s.toLowerCase().replace(/\s+/g, ' ').trim() === t) return String(options[i].label).toUpperCase();
  }
  return '';
}

function extractObject(text) {
  const s = String(text || '');
  let depth = 0, start = -1, inStr = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === '{') { if (depth === 0) start = i; depth++; continue; }
    if (c === '}' && depth > 0) {
      depth--;
      if (depth === 0 && start !== -1) {
        try { return JSON.parse(s.slice(start, i + 1)); } catch (e) { return null; }
      }
    }
  }
  return null;
}

async function callObject(messages, opts, tag) {
  let text = '';
  try {
    const r = await llm.callLLM(messages, opts || {});
    text = r.text || '';
  } catch (e) {
    llm.log(tag + ': call failed - ' + e.message);
    return null;
  }
  let obj = extractObject(text);
  if (obj) return obj;
  // One repair attempt: ask for the same JSON only.
  try {
    const r2 = await llm.callLLM(messages.concat([
      { role: 'assistant', content: String(text).slice(0, 500) },
      { role: 'user', content: 'Return ONLY the JSON object, no markdown, no prose.' }
    ]), Object.assign({ temperature: 0.1 }, opts || {}));
    obj = extractObject(r2.text || '');
  } catch (e) {
    llm.log(tag + ': repair failed - ' + e.message);
  }
  return obj;
}

function questionBlock(q) {
  const opts = (q.options || []).map(function (o) {
    return String(o.label).toUpperCase() + '. ' + String(o.text || '').trim();
  }).join('\n');
  return [
    'SECTION: ' + (q.section || 'General'),
    'QUESTION: ' + String(q.text || '').trim(),
    'OPTIONS:',
    opts
  ].join('\n');
}

function scientistPrompt(q) {
  return [
    'You are the ' + roleFor(q.section) + ' on the Vlymbooq Research Team, a competitive-exam solution lab.',
    'Solve the question below independently and exactly. Use standard, valid reasoning.',
    '',
    questionBlock(q),
    '',
    'Return STRICT JSON only:',
    '{"answer":"<option letter>","confidence":"high|medium|low","steps":["step 1","step 2"],"reasoning":"one short paragraph"}',
    'Rules: answer must be exactly one option letter from the list. Never guess. At most 6 steps.'
  ].join('\n');
}

function inventorPrompt(q, answer) {
  return [
    'You are the Inventor on the Vlymbooq Research Team.',
    'A student must reach the answer in seconds under exam pressure.',
    'Find the fastest correct method. You may combine known techniques in a new way or invent a shortcut,',
    'but it must be valid and reproducible from the information in the question.',
    '',
    questionBlock(q),
    'VERIFIED ANSWER: ' + answer,
    '',
    'Return STRICT JSON only:',
    '{"methods":[{"name":"short 2-4 word name","idea":"what makes it fast","kind":"shortcut|mnemonic|estimate|invariant","seconds":5,"steps":["step 1","step 2"],"final":"the answer this method gives"}]}',
    'Rules:',
    '- At most 3 methods. Each method has 2-6 steps, each step under 200 characters.',
    '- "seconds" is an integer 1-60: how long a prepared student needs.',
    '- Every method must end at the verified answer above; "final" must be that option letter.',
    '- Do NOT claim a method is world-first, never known, unprecedented or patented.',
    '- Do not invent facts, formulas or numbers that the question does not support.'
  ].join('\n');
}

function verifierPrompt(q) {
  return [
    'You are the Verifier on the Vlymbooq Research Team. Be a sceptic.',
    'Solve the question from scratch. Do not assume any earlier answer is correct.',
    '',
    questionBlock(q),
    '',
    'Return STRICT JSON only:',
    '{"answer":"<option letter>","check":"one paragraph showing the calculation that proves it"}',
    'Rules: answer must be exactly one option letter from the list. If the question is ambiguous, say so in "check" and give the best-supported letter.'
  ].join('\n');
}

function cleanMethod(m, answer) {
  if (!m || typeof m !== 'object') return null;
  const name = llm.clean(m.name);
  const idea = llm.clean(m.idea);
  const kind = /^(shortcut|mnemonic|estimate|invariant)$/.test(String(m.kind || '')) ? String(m.kind) : 'shortcut';
  let seconds = parseInt(m.seconds, 10);
  if (!(seconds >= 1 && seconds <= 60)) seconds = 10;
  const steps = (Array.isArray(m.steps) ? m.steps : []).map(function (s) { return llm.clean(s); })
    .filter(function (s) { return s.length >= 3; });
  if (name.length < 3 || name.length > 80) return null;
  if (idea.length < 10 || idea.length > 400) return null;
  if (steps.length < 2 || steps.length > 6) return null;
  if (steps.some(function (s) { return s.length > 240; })) return null;
  if (BANNED_CLAIMS.test(name + ' ' + idea + ' ' + steps.join(' '))) return null;
  if (llm.leak(name + ' ' + idea + ' ' + steps.join(' '))) return null;
  const final = normaliseAnswer(m.final, null) || normaliseAnswer(m.final, [{ label: answer, text: answer }]);
  if (final && final !== answer) return null;
  return { name: name, idea: idea, kind: kind, seconds: seconds, steps: steps };
}

function candidates(examFilter, excludeIds) {
  const files = fs.readdirSync(DATA_DIR).filter(function (f) { return f.endsWith('.json') && f.indexOf('-full-') !== -1; });
  const items = [];
  files.forEach(function (f) {
    let data;
    try { data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf-8')); } catch (e) { return; }
    if (!data || !Array.isArray(data.questions) || !data.slug || !data.folder) return;
    if (data.kind !== 'full') return;
    if (examFilter.length && examFilter.indexOf(data.folder) === -1) return;
    const created = String(data.generatedAt || data.createdDate || '');
    data.questions.forEach(function (q) {
      if (!isTargetSection(q.section)) return;
      if (!Array.isArray(q.options) || q.options.length < 2) return;
      if (!String(q.text || '').trim()) return;
      const id = store.questionId(data.folder, q.text, q.options);
      if (excludeIds[id]) return;
      items.push({ id: id, data: data, q: q, created: created });
    });
  });
  // Newest papers first, then in paper order.
  items.sort(function (a, b) {
    if (a.created !== b.created) return a.created < b.created ? 1 : -1;
    return (a.q.q || 0) - (b.q.q || 0);
  });
  return items;
}

async function investigate(item) {
  const q = item.q;
  const keyOpt = (q.options || []).find(function (o) { return o.correct; });
  const key = keyOpt ? String(keyOpt.label).toUpperCase() : '';

  const sci = await callObject([{ role: 'user', content: scientistPrompt(q) }],
    { temperature: 0.2, numPredict: 900 }, 'scientist');
  const sciAnswer = normaliseAnswer(sci && sci.answer, q.options);
  if (!sciAnswer) {
    llm.log('  scientist produced no valid answer - skip');
    return { status: 'rejected', reason: 'scientist: no valid answer' };
  }

  const ver = await callObject([{ role: 'user', content: verifierPrompt(q) }],
    { temperature: 0.15, numPredict: 900 }, 'verifier');
  const verAnswer = normaliseAnswer(ver && ver.answer, q.options);

  const inv = await callObject([{ role: 'user', content: inventorPrompt(q, sciAnswer) }],
    { temperature: 0.65, numPredict: 2200 }, 'inventor');
  const rawMethods = inv && Array.isArray(inv.methods) ? inv.methods : [];
  const seen = {};
  const methods = rawMethods.map(function (m) { return cleanMethod(m, sciAnswer); })
    .filter(function (m) { if (!m) return false; if (seen[m.name]) return false; seen[m.name] = 1; return true; });

  if (!methods.length) {
    llm.log('  no valid method from inventor - skip');
    return { status: 'rejected', reason: 'inventor: no valid method' };
  }

  const agree = !!verAnswer && verAnswer === sciAnswer;
  const keyAgrees = !key || key === sciAnswer;
  const solution = {
    id: item.id,
    exam: item.data.folder,
    paperSlug: item.data.slug,
    paperTitle: item.data.title,
    paperFile: path.basename(String(item.data.slug)) + '.json',
    questionNumber: q.q,
    section: q.section,
    question: llm.clean(q.text),
    options: (q.options || []).map(function (o) {
      return { label: String(o.label).toUpperCase(), text: llm.clean(o.text), correct: !!o.correct };
    }),
    key: key,
    answer: sciAnswer,
    verified: agree,
    answerAgreesWithKey: keyAgrees,
    canonicalSteps: (sci && Array.isArray(sci.steps) ? sci.steps : []).map(function (s) { return llm.clean(s); }).slice(0, 6),
    verifierCheck: llm.clean(ver && ver.check),
    roles: { solver: roleFor(q.section), inventor: 'Inventor', verifier: 'Verifier' },
    methods: methods.sort(function (a, b) { return a.seconds - b.seconds; }),
    status: agree && keyAgrees ? 'published' : 'review',
    note: !agree
      ? 'The Scientist and Verifier disagreed; this method is kept for review, not published as verified.'
      : (!keyAgrees ? 'The lab answer differs from the answer key in the paper; kept for review.' : ''),
    model: llm.MODEL,
    generatedAt: new Date().toISOString()
  };

  if (solution.status === 'published') {
    llm.log('  published: ' + sciAnswer + ' via ' + methods.map(function (m) { return m.name + ' (~' + m.seconds + 's)'; }).join(', '));
  } else {
    llm.log('  review: scientist=' + sciAnswer + ' verifier=' + (verAnswer || 'none') + ' key=' + (key || 'none'));
  }
  return { status: solution.status, solution: solution };
}

async function run(opts) {
  const examFilter = String(opts.exams || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  const limit = Math.max(1, parseInt(opts.limit, 10) || 6);
  const maxMinutes = Math.max(5, parseInt(opts['max-minutes'], 10) || 100);
  const deadline = Date.now() + maxMinutes * 60000;
  const current = store.load(ROOT);
  const exclude = {};
  current.solutions.forEach(function (s) { if (s && s.id) exclude[s.id] = 1; });
  const queue = candidates(examFilter, exclude);
  llm.log('research team: ' + queue.length + ' eligible question(s), target ' + limit + ', model ' + llm.MODEL);
  if (!queue.length) {
    console.log(JSON.stringify({ investigated: 0, published: 0, review: 0, rejected: 0, remaining: 0 }));
    return { investigated: 0, published: 0, review: 0, rejected: 0, remaining: 0 };
  }

  const counts = { investigated: 0, published: 0, review: 0, rejected: 0, remaining: queue.length };
  const touchedSlugs = {};
  for (let i = 0; i < queue.length && counts.investigated < limit; i++) {
    if (Date.now() > deadline) { llm.log('time budget reached - stopping'); break; }
    const item = queue[i];
    llm.log('[' + (counts.investigated + 1) + '/' + limit + '] ' + item.data.folder + ' Q' + item.q.q + ' - ' + item.q.section);
    let res;
    try { res = await investigate(item); }
    catch (e) { llm.log('  investigation failed: ' + e.message); res = { status: 'rejected', reason: e.message }; }
    counts.investigated++;
    if (res.status === 'published' || res.status === 'review') {
      current.solutions.push(res.solution);
      if (res.status === 'published') { counts.published++; touchedSlugs[item.data.slug] = 1; }
      else counts.review++;
      // Persist after every solved question so a long run is never lost.
      store.save(ROOT, current);
    } else {
      counts.rejected++;
    }
  }
  counts.remaining = Math.max(0, queue.length - counts.investigated);
  store.save(ROOT, current);
  const targets = Object.keys(touchedSlugs);
  fs.writeFileSync(TARGETS_FILE, JSON.stringify({ slugs: targets, at: new Date().toISOString() }, null, 2), 'utf-8');
  llm.log('research team done: ' + JSON.stringify(counts));
  console.log(JSON.stringify(counts));
  return counts;
}

if (require.main === module) {
  const a = args(process.argv.slice(2));
  run(a).then(function () { process.exit(0); }).catch(function (e) {
    console.error('research team failed: ' + e.message);
    process.exit(1);
  });
}

module.exports = { run: run, investigate: investigate, candidates: candidates, cleanMethod: cleanMethod };


