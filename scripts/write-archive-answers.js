// Archive answers writer: qwen3.8:27B writes rich model answers for archive
// questions, categorized under each question's OWN category/subject and
// tagged auto-gen so readers can distinguish them from corpus text.
//
// Why 27B here and not browser WebLLM: the in-browser model is small and its
// answers read thin next to ChatGPT. The 27B writes once in CI; the browser
// then RETRIEVES the finished answer (ask-archive.js) instead of composing
// from scratch.
//
// Storage (two files, both tracked):
//   data/archive-answers.json ......... SOURCE OF TRUTH, append-only keyed
//       by question id: {question, answer, category, subject, subSubject,
//       source, modelAnswer, keyFacts, autoGen:true, writtenBy, writtenAt}
//   data/questions/00-27b-archive.json  GENERATED chunk, fully regenerated
//       every run from the sidecar, shaped exactly like wiki chunks so
//       build-archive-single.js consumes it with zero changes. The `00-`
//       prefix sorts first so enriched records win first-occurrence dedup
//       (same question+answer text as the wiki original = same dedup key;
//       the enriched copy is a superset, nothing is lost).
//
// Budget: MAX_WRITE answers per run (default 5). 27B on runner CPU takes
// minutes per answer; the weekly schedule fills the archive steadily.

const fs = require('fs');
const path = require('path');
const { callLLM, loadJson, saveJson, EXAMINER_STYLE } = require('./site-agent.js');

const QDIR = 'data/questions';
const SIDECAR = 'data/archive-answers.json';
const CHUNK = path.join(QDIR, '00-27b-archive.json');
const MAX_WRITE = parseInt(process.env.MAX_WRITE || '5', 10);
// Prefer descriptive items (mains/essay answers showcase the model); fall
// back to objective items (fill_blank/mcq get rich explanations).
const DESCRIPTIVE_RES = /mains|essay|descriptive|subjective|long.answer/i;

function norm(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function collectCandidates(sidecar) {
  const have = new Set(Object.keys((sidecar && sidecar.answers) || {}));
  let files = [];
  try { files = fs.readdirSync(QDIR).filter(f => f.endsWith('.json') && f !== '00-27b-archive.json'); }
  catch (e) { console.log('writer: no ' + QDIR); return []; }
  const desc = [], obj = [];
  // Sample across files (not just the first) so categories mix over runs.
  const startAt = Math.floor(Date.now() / 3600000) % Math.max(1, files.length);
  for (let i = 0; i < files.length && (desc.length + obj.length) < 60; i++) {
    const f = files[(startAt + i) % files.length];
    let d;
    try { d = JSON.parse(fs.readFileSync(path.join(QDIR, f), 'utf8')); } catch (e) { continue; }
    for (const top of Object.values(d)) {
      const subs = (top && top.subSubjects) || {};
      for (const arr of Object.values(subs)) {
        if (!Array.isArray(arr)) continue;
        for (const q of arr) {
          if (!q || !q.id || !q.question || !q.answer) continue;
          if (have.has(q.id)) continue;
          if (q.modelAnswer || (q.autoGen && q.fact && q.fact.length > 200)) continue;
          (DESCRIPTIVE_RES.test(q.type || '') ? desc : obj).push(q);
          if (desc.length + obj.length >= 60) break;
        }
        if (desc.length + obj.length >= 60) break;
      }
      if (desc.length + obj.length >= 60) break;
    }
  }
  return desc.concat(obj).slice(0, MAX_WRITE);
}

async function writeOne(q) {
  const isDesc = DESCRIPTIVE_RES.test(q.type || '');
  const sys = 'You are an expert UPSC/SSC exam coach writing archive study material. ' +
    'Return STRICT JSON only: {"modelAnswer": "...", "keyFacts": ["...", "..."]}. No markdown fences, no commentary. ' +
    EXAMINER_STYLE;
  const user = (isDesc
    ? 'Write a complete mains-style model answer (150-250 words, structured with a brief intro, 3-4 analytical points, and a one-line way forward) for:\n'
    : 'Write a crisp exam explanation (60-120 words: why the answer is correct, plus 1-2 memorable facts a student should retain) for this question:\n') +
    'Question: ' + q.question + '\nAnswer: ' + q.answer + '\n' +
    (q.options ? 'Options: ' + JSON.stringify(q.options) + '\n' : '') +
    (q.fact ? 'Corpus note: ' + String(q.fact).slice(0, 400) + '\n' : '') +
    'Category: ' + (q.category || '') + ' | Subject: ' + (q.subject || '') + '\n' +
    'RULES: stay consistent with the given answer; do not invent dates, numbers, or names beyond the item; plain text only.';
  for (let attempt = 1; attempt <= 2; attempt++) {
    const r = await callLLM(sys, user, 2048);
    if (!r || !r.text) { console.log('writer: empty response for ' + q.id + ' (attempt ' + attempt + ')'); continue; }
    let txt = r.text.replace(/```[a-z]*|```/gi, '').trim();
    const s = txt.indexOf('{'), e = txt.lastIndexOf('}');
    if (s < 0 || e <= s) { console.log('writer: no JSON for ' + q.id); continue; }
    try {
      const j = JSON.parse(txt.slice(s, e + 1));
      const ma = String(j.modelAnswer || '').trim();
      if (ma.length < 60 || ma.length > 4000) { console.log('writer: bad length ' + ma.length + ' for ' + q.id); continue; }
      return {
        modelAnswer: ma,
        keyFacts: Array.isArray(j.keyFacts) ? j.keyFacts.map(String).slice(0, 6) : []
      };
    } catch (e) { console.log('writer: JSON parse failed for ' + q.id + ' (attempt ' + attempt + ')'); }
  }
  return null;
}

async function main() {
  const sidecar = loadJson(SIDECAR, { updatedAt: null, answers: {} });
  if (!sidecar.answers) sidecar.answers = {};
  const cands = collectCandidates(sidecar);
  console.log('writer: ' + cands.length + ' candidate(s), budget ' + MAX_WRITE);
  if (!cands.length) { console.log('writer: nothing to write'); return; }
  let wrote = 0;
  for (const q of cands) {
    const w = await writeOne(q);
    if (!w) continue;
    sidecar.answers[q.id] = {
      question: q.question,
      answer: q.answer,
      category: q.category || 'Misc',
      subject: q.subject || 'General',
      subSubject: q.subSubject || q.subject || 'General',
      source: q.source || '',
      modelAnswer: w.modelAnswer,
      keyFacts: w.keyFacts,
      autoGen: true,
      writtenBy: 'qwen3.8:27b',
      writtenAt: new Date().toISOString()
    };
    wrote++;
    console.log('writer: wrote ' + q.id + ' (' + (q.category || '?') + ' / ' + (q.subject || '?') + ')');
  }
  if (!wrote) { console.log('writer: 0 written this run'); return; }
  sidecar.updatedAt = new Date().toISOString();
  saveJson(SIDECAR, sidecar);
  // Regenerate the builder chunk from the sidecar (idempotent full regen).
  const chunk = {};
  for (const [id, a] of Object.entries(sidecar.answers)) {
    const subj = a.subject || 'General';
    const sub = a.subSubject || subj;
    if (!chunk[subj]) chunk[subj] = { subSubjects: {} };
    if (!chunk[subj].subSubjects[sub]) chunk[subj].subSubjects[sub] = [];
    chunk[subj].subSubjects[sub].push({
      id: id,
      type: 'model_answer',
      category: a.category,
      region: '',
      source: a.source,
      pubDate: a.writtenAt,
      subject: subj,
      subSubject: sub,
      emoji: '',
      question: a.question,
      answer: a.answer,
      fact: a.modelAnswer,
      modelAnswer: a.modelAnswer,
      keyFacts: a.keyFacts,
      autoGen: true,
      writtenBy: a.writtenBy,
      writtenAt: a.writtenAt
    });
  }
  saveJson(CHUNK, chunk);
  console.log('writer: sidecar ' + Object.keys(sidecar.answers).length + ' total, chunk regenerated, ' + wrote + ' new this run');
}

if (require.main === module) {
  main().then(() => process.exit(0)).catch(e => { console.error('writer: FATAL ' + (e.message || e)); process.exit(0); });
}
module.exports = { main: main };
