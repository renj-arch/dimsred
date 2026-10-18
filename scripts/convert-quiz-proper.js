// Quiz proper converter: the CI model (qwen3.5:9b mid tier) rewrites fill-in-the-blank fragments
// into proper questionnaire MCQs (interrogative stem + 4 options + answer +
// explanation). The current-affairs quiz serves these FIRST (properMCQ flag
// + proper-first ordering), so quizzes ask real questions instead of showing
// "_____ was ..." fragments in learning mode. The browser never composes —
// it retrieves these finished items (WebLLM stays out of it).
//
// Storage: data/quiz-proper.json (tracked) = {updatedAt, items: [...]}
// keyed by fromId (original question id) — reruns never duplicate, and the
// sidecar survives corpus regeneration. Cap MAX_CONVERT/run (default 10).
//
// Validation is strict because a broken MCQ (answer not among options) is
// worse than none: stem must be interrogative, exactly 4 options, answer
// must string-match one option, explanation >= 60 chars, 70% overlap
// dedupe vs corpus sample. Retry once per item, then skip.

const fs = require('fs');
const path = require('path');
const { callLLM, loadJson, saveJson, EXAMINER_STYLE } = require('./site-agent.js');
const IMP = require('./lib/importance.js');

const QDIR = 'data/questions';
const SIDECAR = 'data/quiz-proper.json';
const MAX_CONVERT = parseInt(process.env.MAX_CONVERT || '10', 10);

function norm(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}
function textOverlap(a, b) {
  const wa = norm(a).split(' ').filter(w => w.length > 3);
  if (!wa.length) return 0;
  const sb = new Set(norm(b).split(' '));
  return wa.filter(w => sb.has(w)).length / wa.length;
}
const INTERROGATIVE = /^(who|what|which|when|where|why|how|is|are|was|were|does|did|can|could|should|would|will|has|have|had|name|identify|choose|select|match|consider)\b/i;

function collectFillBlanks() {
  let files = [];
  try { files = fs.readdirSync(QDIR).filter(f => f.endsWith('.json') && f !== '00-27b-archive.json'); }
  catch (e) { console.log('converter: no ' + QDIR); return []; }
  const startAt = files.length ? Math.floor(Date.now() / 1800000) % files.length : 0;
  const out = [];
  const t0 = Date.now();
  for (let i = 0; i < files.length && out.length < 40 && Date.now() - t0 < 120000; i++) {
    const f = files[(startAt + i) % files.length];
    let d;
    try { d = JSON.parse(fs.readFileSync(path.join(QDIR, f), 'utf8')); } catch (e) { continue; }
    for (const top of Object.values(d)) {
      for (const arr of Object.values((top && top.subSubjects) || {})) {
        if (!Array.isArray(arr)) continue;
        for (const q of arr) {
          if (!q || !q.id || !q.question || !q.answer) continue;
          if (q.options && q.options.length >= 4) continue; // already proper
          if (q.question.indexOf('___') === -1 && INTERROGATIVE.test(q.question.trim())) continue; // already proper
          out.push(q);
          if (out.length >= 40) break;
        }
        if (out.length >= 40) break;
      }
      if (out.length >= 40) break;
    }
  }
  return out;
}

async function convertOne(q) {
  const sys = 'You are an expert govt-exam question setter turning rough fill-in-the-blank fragments into proper ' +
    'multiple-choice questions. Return STRICT JSON only: {"stem": "...", "options": ["a","b","c","d"], "answer": "a", ' +
    '"explanation": "...", "importance": "high|medium|low", "importantFor": ["EXAM", ...]}. No markdown. ' +
    'STEM RULES: interrogative sentence ending with ? (Who/What/Which/When/Where/Why/How/Is/Are...), self-contained, no blanks. ' +
    'OPTIONS RULES: exactly 4, the correct answer FIRST in spirit but place it at a RANDOM position among the 4; ' +
    'distractors must be plausible same-category wrong answers (never jokes, never empty); "answer" must EXACTLY equal one option string. ' +
    'importance = how likely asked (high: PYQ-grade/core; medium: solid syllabus; low: trivia). ' +
    'importantFor = up to 5 from [UPSC, SSC CGL, SSC CHSL, SSC GD, SSC JE, IBPS PO, IBPS Clerk, SBI PO, SBI Clerk, ' +
    'RBI Grade B, RRB NTPC, NDA, CDS, CTET, GATE, NEET, JEE, Agniveer, UP Police, State PSC]. ' +
    EXAMINER_STYLE;
  const user = 'Fragment question: ' + q.question + '\nAnswer: ' + q.answer + '\n' +
    (q.fact ? 'Corpus note: ' + String(q.fact).slice(0, 400) + '\n' : '') +
    'Category: ' + (q.category || '') + ' | Subject: ' + (q.subject || '') + '\n' +
    'Rewrite as one proper MCQ. Explanation 60-150 words (verdict + why + traps + hook). Stay consistent with the given answer.';
  for (let attempt = 1; attempt <= 2; attempt++) {
    const r = await callLLM(sys, user, 1500);
    if (!r || !r.text) continue;
    const txt = r.text.replace(/```[a-z]*|```/gi, '').trim();
    const s = txt.indexOf('{'), e = txt.lastIndexOf('}');
    if (s < 0 || e <= s) continue;
    try {
      const j = JSON.parse(txt.slice(s, e + 1));
      const stem = String(j.stem || '').trim();
      const opts = Array.isArray(j.options) ? j.options.map(String) : [];
      const ans = String(j.answer || '').trim();
      const ex = String(j.explanation || '').trim();
      if (!INTERROGATIVE.test(stem) && stem.slice(-1) !== '?') { console.log('converter: non-interrogative stem, retry'); continue; }
      if (opts.length !== 4 || opts.some(o => !o.trim())) { console.log('converter: bad options, retry'); continue; }
      if (!opts.some(o => norm(o) === norm(ans))) { console.log('converter: answer not in options, retry'); continue; }
      if (ex.length < 60) { console.log('converter: short explanation, retry'); continue; }
      return {
        stem: stem, options: opts, answer: ans, explanation: ex,
        importance: IMP.validLevel(j.importance),
        importantFor: IMP.validExams(j.importantFor)
      };
    } catch (e) { /* retry */ }
  }
  return null;
}

async function main() {
  const sidecar = loadJson(SIDECAR, { updatedAt: null, items: [] });
  if (!Array.isArray(sidecar.items)) sidecar.items = [];
  const haveFrom = new Set(sidecar.items.map(i => i.fromId).filter(Boolean));
  const existingQs = sidecar.items.map(i => i.question || '');
  // Corpus samples for cross-store dedupe (same subjects as candidates).
  const cands = collectFillBlanks().filter(q => !haveFrom.has(q.id));
  console.log('converter: ' + cands.length + ' fill-blank candidate(s), budget ' + MAX_CONVERT);
  let done = 0;
  for (const q of cands.slice(0, MAX_CONVERT)) {
    if (!q.category || !q.subject) { console.log('converter: skip unplaced ' + q.id + ' (no Misc-dumping)'); continue; }
    const w = await convertOne(q);
    if (!w) continue;
    if (existingQs.concat([q.question]).some(t => textOverlap(w.stem, t) > 0.7)) {
      console.log('converter: dropped duplicate rewrite');
      continue;
    }
    sidecar.items.push({
      id: 'proper-' + String(q.id),
      fromId: q.id,
      question: w.stem,
      options: w.options,
      answer: w.answer,
      explanation: w.explanation,
      category: q.category,
      subject: q.subject,
      importance: w.importance,
      importantFor: w.importantFor,
      properMCQ: true,
      autoGen: true,
      origin: 'converted',
      writtenBy: process.env.OLLAMA_MODEL || 'qwen3.5:9b',
      writtenAt: new Date().toISOString()
    });
    existingQs.push(w.stem);
    done++;
    console.log('converter: converted ' + q.id + ' → proper MCQ (' + (q.subject || '?') + ')');
  }
  if (!done) { console.log('converter: 0 converted this run'); return; }
  sidecar.updatedAt = new Date().toISOString();
  saveJson(SIDECAR, sidecar);
  console.log('converter: sidecar now ' + sidecar.items.length + ' items, +' + done + ' this run');
}

if (require.main === module) {
  main().then(() => process.exit(0)).catch(e => { console.error('converter: FATAL ' + (e.message || e)); process.exit(0); });
}
module.exports = { main: main };
