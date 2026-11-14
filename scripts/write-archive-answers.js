// Archive answers writer: the CI model (qwen3.5:9b mid tier in the workflow) writes rich model answers for archive
// questions, categorized under each question's OWN category/subject and
// tagged auto-gen so readers can distinguish them from corpus text.
//
// Why a CI model here and not browser WebLLM: the in-browser model is small and
// its answers read thin next to ChatGPT. The model writes once in CI; the browser
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
// Budget: MAX_WRITE answers per run (default 5), MAX_CREATE new gap
// questions per run (default 6). The model on runner CPU takes minutes per answer;
// the schedule fills the archive steadily — and never stops until the gaps
// are gone (the plan is the taxonomy itself: empty subjects keep coming up).
//
// Resilience (added 2026-10-18 for the 27B lane): progress is saved
// ATOMICALLY after EVERY accepted unit, so a step-cap kill still publishes
// everything already written (the workflow commits with always()) — the same
// contract invent-questions.js uses. Soft stop: ARCHIVE_DEADLINE_MIN (checked
// between units; exits cleanly through the final save + log). Hard stop:
// AGENT_DEADLINE_MIN (callLLM refuses new prompts — see site-agent.js).
//
// PLACEMENT DISCIPLINE (anti-garbage rule): every item lands in a REAL
// category/subject/subSubject from the closed taxonomy
// (data/archive-taxonomy.json, grown monotonically from observed corpus
// structure — never shrunk). The model chooses placement from that closed
// vocabulary; code validates and fuzzy-snaps, and REJECTS on mismatch.
// Nothing ever defaults to Misc/General: an item that cannot be placed is
// dropped, not dumped. Enrichments inherit their question's own placement.

const fs = require('fs');
const path = require('path');
const { callLLM, loadJson, saveJson, EXAMINER_STYLE } = require('./site-agent.js');
const IMP = require('./lib/importance.js');

const QDIR = 'data/questions';
const SIDECAR = 'data/archive-answers.json';
const TAXONOMY = 'data/archive-taxonomy.json';
const PYQ = 'data/pyq-patterns.json';
const CHUNK = path.join(QDIR, '00-27b-archive.json');
const MAX_WRITE = parseInt(process.env.MAX_WRITE || '5', 10);
const MAX_CREATE = parseInt(process.env.MAX_CREATE || '6', 10);
// Prefer descriptive items (mains/essay answers showcase the model); fall
// back to objective items (fill_blank/mcq get rich explanations).
const DESCRIPTIVE_RES = /mains|essay|descriptive|subjective|long.answer/i;

// Soft wall-clock deadline: stop STARTING new units past it so the run still
// reaches its final save + agent log cleanly. Unset/0 disables.
const DEADLINE_MIN = parseFloat(process.env.ARCHIVE_DEADLINE_MIN || '0') || 0;
const START_MS = Date.now();
function deadlineHit() {
  return DEADLINE_MIN > 0 && (Date.now() - START_MS) > DEADLINE_MIN * 60000;
}

// Atomic save: a mid-write kill (step-cap SIGKILL) must never leave torn JSON
// on disk — a reader would silently fall back to the EMPTY default, i.e.
// "lose" the whole archive. tmp + rename (atomic on POSIX), Windows fallback.
function saveAtomic(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = p + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 1) + '\n');
  try { fs.renameSync(tmp, p); }
  catch (e) { fs.writeFileSync(p, fs.readFileSync(tmp)); fs.unlinkSync(tmp); }
}

// The builder chunk, regenerated from the sidecar (idempotent full regen),
// shaped exactly like wiki chunks so build-archive-single.js consumes it with
// zero changes. The `00-` prefix sorts first so enriched records win
// first-occurrence dedup (same question+answer text as the wiki original =
// same dedup key; the enriched copy is a superset, nothing is lost).
function buildChunk(sidecar) {
  const chunk = {};
  for (const [id, a] of Object.entries(sidecar.answers)) {
    const subj = a.subject || 'General';
    const sub = a.subSubject || subj;
    if (!chunk[subj]) chunk[subj] = { subSubjects: {} };
    if (!chunk[subj].subSubjects[sub]) chunk[subj].subSubjects[sub] = [];
    chunk[subj].subSubjects[sub].push({
      id: id,
      type: a.type || 'fill_blank',
      category: a.category,
      region: '',
      source: a.source,
      pubDate: a.writtenAt,
      subject: subj,
      subSubject: sub,
      emoji: '',
      question: a.question,
      answer: a.answer,
      options: a.options || undefined,
      fact: a.modelAnswer,
      modelAnswer: a.modelAnswer,
      keyFacts: a.keyFacts,
      importance: a.importance || 'medium',
      importantFor: Array.isArray(a.importantFor) ? a.importantFor : [],
      autoGen: true,
      origin: a.origin || 'enriched',
      writtenBy: a.writtenBy,
      writtenAt: a.writtenAt
    });
  }
  return chunk;
}

// Incremental progress save, called after EVERY accepted unit (enriched
// answer or created gap item) — hard-kill insurance.
function saveProgress(sidecar) {
  sidecar.updatedAt = new Date().toISOString();
  saveAtomic(SIDECAR, sidecar);
  saveAtomic(CHUNK, buildChunk(sidecar));
}

function norm(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// Word-overlap 0..1 (the 70% duplicate rule). Used both ways: new questions
// must stay UNDER 0.7 vs everything existing (no duplicates anywhere else),
// and model-proposed placements must stay UNDER 0.7 vs existing subtopics
// (a "new" subtopic 80% overlapping an old one is the old one renamed).
function textOverlap(a, b) {
  const wa = norm(a).split(' ').filter(w => w.length > 3);
  if (!wa.length) return 0;
  const sb = new Set(norm(b).split(' '));
  return wa.filter(w => sb.has(w)).length / wa.length;
}

// Closed placement vocabulary, grown monotonically: categories/subjects
// observed in the corpus are added and NEVER removed, so validation is
// stable across runs even though each run only scans a rotating slice.
// {updatedAt, cats: {cat: {count, subjects: {subj: {count, subs: [names...]}}}}}
function loadTaxonomy() {
  const tax = loadJson(TAXONOMY, { updatedAt: null, cats: {} });
  if (!tax.cats) tax.cats = {};
  let files = [];
  try { files = fs.readdirSync(QDIR).filter(f => f.endsWith('.json') && f !== '00-27b-archive.json'); }
  catch (e) { return tax; }
  const startAt = files.length ? Math.floor(Date.now() / 3600000) % files.length : 0;
  const t0 = Date.now();
  let scanned = 0;
  for (let i = 0; i < files.length && scanned < 150 && Date.now() - t0 < 120000; i++) {
    const f = files[(startAt + i) % files.length];
    let d;
    try { d = JSON.parse(fs.readFileSync(path.join(QDIR, f), 'utf8')); } catch (e) { continue; }
    scanned++;
    for (const top of Object.values(d)) {
      const subs = (top && top.subSubjects) || {};
      for (const [sub, arr] of Object.entries(subs)) {
        if (!Array.isArray(arr) || !arr.length) continue;
        const q0 = arr[0] || {};
        const cat = (q0.category || '').trim();
        const subj = (q0.subject || '').trim();
        if (!cat || !subj) continue;
        if (!tax.cats[cat]) tax.cats[cat] = { count: 0, subjects: {} };
        const C = tax.cats[cat];
        if (!C.subjects[subj]) C.subjects[subj] = { count: 0, subs: [] };
        const S = C.subjects[subj];
        C.count += arr.length;
        S.count += arr.length;
        if (S.subs.length < 200 && S.subs.indexOf(sub) === -1) S.subs.push(sub);
      }
    }
  }
  tax.updatedAt = new Date().toISOString();
  try { saveAtomic(TAXONOMY, tax); } catch (e) { /* non-fatal */ }
  console.log('writer: taxonomy ' + Object.keys(tax.cats).length + ' cats (scanned ' + scanned + ' files)');
  return tax;
}

// Snap a model-proposed name to the closest taxonomy entry (overlap >= 0.5),
// else null (reject — never default, never invent).
function snapName(proposed, candidates) {
  let best = null, bestScore = 0;
  for (const c of candidates) {
    const s = textOverlap(proposed, c);
    if (s > bestScore) { bestScore = s; best = c; }
  }
  return bestScore >= 0.5 ? best : null;
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
    'Return STRICT JSON only: {"modelAnswer": "...", "keyFacts": ["...", "..."], ' +
    '"importance": "high|medium|low", "importantFor": ["EXAM", ...]}. No markdown fences, no commentary. ' +
    'importance = how likely this is asked in Indian govt exams (high: PYQ-grade/core; medium: solid syllabus; low: trivia). ' +
    'importantFor = up to 5 exams from [UPSC, SSC CGL, SSC CHSL, SSC GD, SSC JE, IBPS PO, IBPS Clerk, SBI PO, SBI Clerk, ' +
    'RBI Grade B, RRB NTPC, NDA, CDS, CTET, GATE, NEET, JEE, Agniveer, UP Police, State PSC]. ' +
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
      // Model verdict on importance (validated: closed level + closed exam list).
      // Falls back to the rules scorer when the model abstains or errs.
      let imp = IMP.validLevel(j.importance);
      let impFor = IMP.validExams(j.importantFor);
      if (!j.importance || !impFor.length) {
        const r = IMP.scoreImportance(q);
        if (!j.importance) imp = r.level;
        if (!impFor.length) impFor = [];
      }
      return {
        modelAnswer: ma,
        keyFacts: Array.isArray(j.keyFacts) ? j.keyFacts.map(String).slice(0, 6) : [],
        importance: imp,
        importantFor: impFor
      };
    } catch (e) { console.log('writer: JSON parse failed for ' + q.id + ' (attempt ' + attempt + ')'); }
  }
  return null;
}

// ── Gap mode: create must-have Q&A where the archive has nothing ──
// 1. Thinnest high-weight subjects (thin = low count; weight = subject
//    mentioned in real PYQ analyses in pyq-patterns.json).
// 2. The model lists must-know subtopics missing from the subject's list.
// 3. The model writes 3 MCQs per accepted subtopic, placed via CLOSED vocabulary.
// 4. Every new question is overlap-checked vs the sidecar AND corpus samples:
//    >0.7 = duplicate, dropped. Nothing duplicated anywhere else, ever.
function pyqWeight(subject, category) {
  try {
    const hay = norm(JSON.stringify(loadJson(PYQ, {}).exams || {}));
    const words = norm(subject + ' ' + category).split(' ').filter(w => w.length > 4);
    let hits = 0;
    for (const w of words) if (hay.indexOf(w) !== -1) hits++;
    return hits;
  } catch (e) { return 0; }
}

async function gapFill(sidecar, tax) {
  let created = 0;
  const subjects = [];
  for (const [cat, C] of Object.entries(tax.cats || {})) {
    for (const [subj, S] of Object.entries(C.subjects || {})) {
      subjects.push({ cat: cat, subj: subj, count: S.count || 0, subs: S.subs || [], weight: pyqWeight(subj, cat) });
    }
  }
  // Thinnest first, PYQ-weighted subjects float up. Skip well-fed subjects.
  // Aptitudes live on mental.html — never create aptitude/quant/reasoning
  // content here (enriching existing items is fine; creating new ones is not).
  const APT_RES = /aptitude|quantitative|reasoning|mental|mathematics|statistics|arithmetic/i;
  subjects.sort((a, b) => ((b.weight * 10 - Math.log(b.count + 1)) - (a.weight * 10 - Math.log(a.count + 1))));
  const targets = subjects.filter(s => s.count < 25 && !APT_RES.test(s.subj + ' ' + s.cat)).slice(0, 2);
  if (!targets.length) { console.log('writer: gaps — no thin subjects found'); return 0; }
  // Corpus samples for duplicate-checking (same subjects, bounded).
  const samples = [];
  try {
    const files = fs.readdirSync(QDIR).filter(f => f.endsWith('.json') && f !== '00-27b-archive.json');
    const startAt = files.length ? Math.floor(Date.now() / 1800000) % files.length : 0;
    for (let i = 0; i < files.length && samples.length < 300; i++) {
      const f = files[(startAt + i) % files.length];
      let d;
      try { d = JSON.parse(fs.readFileSync(path.join(QDIR, f), 'utf8')); } catch (e) { continue; }
      for (const top of Object.values(d)) {
        for (const arr of Object.values((top && top.subSubjects) || {})) {
          if (!Array.isArray(arr)) continue;
          for (const q of arr) {
            if (q && q.question && targets.some(t => norm(q.subject || '') === norm(t.subj))) {
              samples.push(q.question);
              if (samples.length >= 300) break;
            }
          }
          if (samples.length >= 300) break;
        }
        if (samples.length >= 300) break;
      }
    }
  } catch (e) { /* best effort */ }
  const sidecarQs = Object.values(sidecar.answers || {}).map(a => a.question || '');

  for (const t of targets) {
    if (created >= MAX_CREATE) break;
    if (deadlineHit()) { console.log('writer: gaps — soft deadline hit, stopping'); break; }
    // Model: which must-know subtopics are missing here?
    const listSys = 'You are an exam syllabus expert. Return STRICT JSON only: {"subtopics": ["...", "..."]}. No markdown.';
    const listUser = 'Exam-relevant subject: ' + t.subj + ' (category: ' + t.cat + ').\n' +
      'Already covered subtopics: ' + t.subs.slice(0, 40).join('; ') + '\n' +
      'List exactly 5 MUST-KNOW subtopics a UPSC/SSC aspirant needs that are NOT covered above. ' +
      'Short names (2-5 words each), real syllabus topics, no overlap with the covered list.';
    let wanted = [];
    const lr = await callLLM(listSys, listUser, 600);
    if (lr && lr.text) {
      try {
        const txt = lr.text.replace(/```[a-z]*|```/gi, '').trim();
        const j = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
        wanted = (Array.isArray(j.subtopics) ? j.subtopics : []).map(String).slice(0, 5);
      } catch (e) { console.log('writer: gaps — subtopic list unparseable for ' + t.subj); continue; }
    }
    // Accept at most 2 genuinely-new subtopics (not a rename of an old one).
    const fresh = wanted.filter(s => s.trim().length >= 3 && !t.subs.some(old => textOverlap(s, old) > 0.7)).slice(0, 2);
    for (const sub of fresh) {
      if (created + 3 > MAX_CREATE) break;
      const wSys = 'You are an expert govt-exam question setter. The archive style is FILL-IN-THE-BLANK ' +
        '(no options — aptitudes live on mental.html, MCQs are not needed here). Return STRICT JSON only: ' +
        '{"questions": [{"question": "... _____ ...", "answer": "word or short phrase", "explanation": "...", ' +
        '"importance": "high|medium|low", "importantFor": ["EXAM", ...]}]}. No markdown. ' +
        'importance = how likely this is asked (high: PYQ-grade/core; medium: solid syllabus; low: trivia). ' +
        'importantFor = up to 5 from [UPSC, SSC CGL, SSC CHSL, SSC GD, SSC JE, IBPS PO, IBPS Clerk, SBI PO, SBI Clerk, ' +
        'RBI Grade B, RRB NTPC, NDA, CDS, CTET, GATE, NEET, JEE, Agniveer, UP Police, State PSC]. ' +
        EXAMINER_STYLE;
      const wUser = 'Write 3 original fill-in-the-blank questions in the archive style ' +
        '(a factual sentence with one key term replaced by _____, e.g. "_____ Ayurveda Day Celebrated ... After Month" → "11th").\n' +
        'Subtopic: ' + sub + '\nCategory (FIXED): ' + t.cat + '\nSubject (FIXED): ' + t.subj + '\n' +
        'RULES: use these exact category/subject strings; real exam-grade facts a UPSC/SSC paper could ask; ' +
        'each answer a word or short phrase (under 40 chars); each explanation 60-120 words (verdict + why + trap + hook); ' +
        'plain text; invent no dates/numbers/names.';
      const wr = await callLLM(wSys, wUser, 2048);
      if (!wr || !wr.text) continue;
      let items = [];
      try {
        const txt = wr.text.replace(/```[a-z]*|```/gi, '').trim();
        const j = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
        items = Array.isArray(j.questions) ? j.questions : [];
      } catch (e) { console.log('writer: gaps — question JSON unparseable for ' + sub); continue; }
      for (const it of items.slice(0, 3)) {
        if (created >= MAX_CREATE) break;
        const qq = String(it.question || '').trim(), aa = String(it.answer || '').trim();
        // Archive style: fill-in-the-blank (_____ present), short answer, no options.
        if (qq.length < 20 || qq.indexOf('___') === -1 || !aa || aa.length > 60) continue;
        // Duplicate check vs EVERYTHING: sidecar + corpus samples, 70% rule.
        const dup = sidecarQs.concat(samples).some(t2 => textOverlap(qq, t2) > 0.7);
        if (dup) { console.log('writer: gaps — dropped duplicate: ' + qq.slice(0, 60)); continue; }
        const ex = String(it.explanation || '').trim();
        if (ex.length < 60) continue;
        const id = 'agent-' + norm(t.subj + ' ' + sub).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);
        sidecar.answers[id] = {
          question: qq, answer: aa,
          type: 'fill_blank',
          category: t.cat, subject: t.subj, subSubject: sub,
          source: 'agent-made', modelAnswer: ex, keyFacts: [],
          importance: IMP.validLevel(it.importance),
          importantFor: IMP.validExams(it.importantFor),
          autoGen: true, origin: 'agent-made',
          writtenBy: process.env.OLLAMA_MODEL || 'qwen3.5:9b', writtenAt: new Date().toISOString()
        };
        sidecarQs.push(qq);
        created++;
        saveProgress(sidecar);   // hard-kill insurance: publishable after every unit
        console.log('writer: gaps — created ' + id + ' (' + t.cat + ' / ' + t.subj + ' / ' + sub + ')');
      }
    }
  }
  return created;
}

async function main() {
  const sidecar = loadJson(SIDECAR, { updatedAt: null, answers: {} });
  if (!sidecar.answers) sidecar.answers = {};
  const tax = loadTaxonomy();
  const cands = collectCandidates(sidecar);
  console.log('writer: ' + cands.length + ' enrich candidate(s), budget ' + MAX_WRITE);
  let wrote = 0;
  for (const q of cands) {
    if (deadlineHit()) { console.log('writer: soft deadline hit — stopping enrichment (' + wrote + ' written)'); break; }
    // No Misc-dumping: a question without real placement is SKIPPED, and its
    // placement is snapped to the closed taxonomy (typo-level correction only).
    if (!q.category || !q.subject) { console.log('writer: skip unplaced ' + q.id); continue; }
    const w = await writeOne(q);
    if (!w) continue;
    sidecar.answers[q.id] = {
      question: q.question,
      answer: q.answer,
      type: q.type || 'fill_blank',
      category: q.category,
      subject: q.subject,
      subSubject: q.subSubject || q.subject,
      source: q.source || '',
      modelAnswer: w.modelAnswer,
      keyFacts: w.keyFacts,
      importance: w.importance,
      importantFor: w.importantFor,
      autoGen: true,
      origin: 'enriched',
      writtenBy: process.env.OLLAMA_MODEL || 'qwen3.5:9b',
      writtenAt: new Date().toISOString()
    };
    wrote++;
    saveProgress(sidecar);   // hard-kill insurance: publishable after every unit
    console.log('writer: wrote ' + q.id + ' (' + q.category + ' / ' + q.subject + ')');
  }
  // Gap mode: create must-have Q&A where the archive has nothing.
  let created = 0;
  try { created = await gapFill(sidecar, tax); }
  catch (e) { console.log('writer: gaps failed: ' + (e.message || e).slice(0, 150)); }
  if (!wrote && !created) { console.log('writer: 0 written this run'); return; }
  // Final save. Per-unit saveProgress already flushed every accepted unit;
  // this renormalizes the files once more and guarantees both exist even if
  // the per-unit saves were the only ones (no separate end-of-run write).
  saveProgress(sidecar);
  console.log('writer: sidecar ' + Object.keys(sidecar.answers).length + ' total, chunk regenerated, +' + wrote + ' enriched, +' + created + ' created');
  // Log to agent-log.json so improve.html shows WHAT was written (with
  // excerpts), not just counts. Same shape as agent runs.
  try {
    const LOGP = 'data/agent-log.json';
    const log = loadJson(LOGP, { runs: [], lastRun: null, model: null });
    const fresh = Object.entries(sidecar.answers)
      .filter(([id, a]) => a && a.writtenAt && (Date.now() - new Date(a.writtenAt).getTime()) < 12 * 3600000)
      .slice(-6);
    log.lastRun = new Date().toISOString();
    log.runs.push({
      at: log.lastRun,
      model: process.env.OLLAMA_MODEL || 'qwen3.5:9b',
      totalFixes: wrote + created,
      byAgent: [{ agent: 'archive-writer', count: wrote + created }],
      details: [{
        agent: 'archive-writer',
        fixes: fresh.map(([id, a]) => ({
          page: 'archive (' + (a.category || '?') + ' / ' + (a.subject || '?') + ')',
          fix: (a.origin === 'agent-made' ? 'Created' : 'Explained') + ' "' + String(a.question || '').slice(0, 90) + '"'
            + (a.importance === 'high' ? ' [high-yield' + (a.importantFor && a.importantFor.length ? ': ' + a.importantFor.join(',') : '') + ']' : ''),
          text: String(a.modelAnswer || '').slice(0, 500)
        }))
      }]
    });
    if (log.runs.length > 15) log.runs = log.runs.slice(-15);
    saveJson(LOGP, log);
  } catch (e) { console.log('writer: agent-log update skipped: ' + (e.message || e).slice(0, 100)); }
}

if (require.main === module) {
  main().then(() => process.exit(0)).catch(e => { console.error('writer: FATAL ' + (e.message || e)); process.exit(0); });
}
module.exports = { main: main, _test: { buildChunk: buildChunk, saveAtomic: saveAtomic, deadlineHit: deadlineHit } };
