#!/usr/bin/env node
'use strict';
/**
 * Previous Year Papers — Local Model Agent
 *
 * Uses the local Ollama model (qwen3.5:9b or batiai/qwen3.8-27b:iq3) to
 * generate structured previous-year exam papers for data/papers.json.
 * Each paper has: id, exam, year, paper title, questions with options/answer/explanation,
 * subject tags, cutoff, official PDF link.
 *
 * Env:
 *   OLLAMA_MODEL      default qwen3.5:9b
 *   OLLAMA_HOST       default http://127.0.0.1:11434
 *   TARGET_EXAMS      space-separated: upsc ibps-po sbi-clerk ssc-gd rbi nda cds ctet gate
 *   TARGET_YEAR       target year (e.g. 2024)
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const MODEL = process.env.OLLAMA_MODEL || 'qwen3.5:9b';
const HOST = (process.env.OLLAMA_HOST || 'http://127.0.0.1:11434').replace(/\/+$/, '');
const TARGET_EXAMS = (process.env.TARGET_EXAMS || 'upsc ibps-po sbi-clerk ssc-gd rbi nda cds ctet gate').split(/\s+/).filter(Boolean);
const TARGET_YEAR = parseInt(process.env.TARGET_YEAR || String(new Date().getFullYear() - 1), 10);
const PAPERS_FILE = path.join('data', 'papers.json');
const RUN = process.env.GITHUB_RUN_NUMBER || String(Date.now());

const EXAM_CONFIG = {
  upsc: {
    name: 'UPSC Civil Services Prelims',
    paper: 'General Studies Paper I',
    subjects: ['history', 'geography', 'polity', 'economy', 'environment', 'science-and-technology', 'art-and-culture', 'international-relations'],
    cutoff: { general: 75.41, ews: 68.02, obc: 74.75, sc: 59.25, st: 47.82 },
    pdfUrl: 'https://www.upsc.gov.in/sites/default/files/QP_CS_Pre_Exam_{year}_2805{year_short}.pdf',
    qCount: 30,
    duration: '2 hours',
    marks: 200,
    official: true
  },
  'ibps-po': {
    name: 'IBPS PO Prelims',
    paper: 'IBPS PO Preliminary Examination',
    subjects: ['reasoning', 'quantitative-aptitude', 'english', 'general-awareness'],
    cutoff: { general: 56.75, ews: 54.5, obc: 54.5, sc: 48.75, st: 38.25 },
    pdfUrl: 'https://www.ibps.in/uploads/question-paper/PO_Prelims_{year}.pdf',
    qCount: 30,
    duration: '1 hour',
    marks: 100,
    official: true
  },
  'sbi-clerk': {
    name: 'SBI Clerk Prelims',
    paper: 'SBI Clerk Preliminary Examination',
    subjects: ['reasoning', 'quantitative-aptitude', 'english', 'general-awareness'],
    cutoff: { general: 62.5, ews: 60.25, obc: 59.5, sc: 52.75, st: 44.25 },
    pdfUrl: 'https://www.sbi.co.in/web/careers/question-papers/clerk-prelims-{year}.pdf',
    qCount: 30,
    duration: '1 hour',
    marks: 100,
    official: true
  },
  'ssc-gd': {
    name: 'SSC GD Constable',
    paper: 'SSC GD Constable Examination',
    subjects: ['general-knowledge', 'mathematics', 'reasoning', 'english'],
    cutoff: { general: 78.5, ews: 76.25, obc: 75.75, sc: 68.5, st: 59.25 },
    pdfUrl: 'https://ssc.nic.in/Portal/QuestionPaper/GD_{year}.pdf',
    qCount: 30,
    duration: '1 hour',
    marks: 100,
    official: true
  },
  rbi: {
    name: 'RBI Grade B Phase 1',
    paper: 'RBI Grade B Phase I Examination',
    subjects: ['general-awareness', 'quantitative-aptitude', 'reasoning', 'english'],
    cutoff: { general: 82.25, ews: 79.5, obc: 78.75, sc: 70.5, st: 61.25 },
    pdfUrl: 'https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?prid={year}_question_paper.pdf',
    qCount: 30,
    duration: '2 hours',
    marks: 200,
    official: true
  },
  nda: {
    name: 'NDA (National Defence Academy)',
    paper: 'NDA Written Examination',
    subjects: ['mathematics', 'general-ability-test'],
    cutoff: { general: 355, ews: 342, obc: 338, sc: 305, st: 298 },
    pdfUrl: 'https://www.upsc.gov.in/sites/default/files/NDA_{year}_question_paper.pdf',
    qCount: 30,
    duration: '2.5 hours',
    marks: 900,
    official: true
  },
  cds: {
    name: 'CDS (Combined Defence Services)',
    paper: 'CDS Written Examination',
    subjects: ['english', 'general-knowledge', 'mathematics'],
    cutoff: { general: 116, ews: 112, obc: 110, sc: 98, st: 88 },
    pdfUrl: 'https://www.upsc.gov.in/sites/default/files/CDS_{year}_question_paper.pdf',
    qCount: 30,
    duration: '2 hours',
    marks: 300,
    official: true
  },
  ctet: {
    name: 'CTET Paper 1',
    paper: 'Central Teacher Eligibility Test Paper I',
    subjects: ['child-development-pedagogy', 'mathematics', 'environmental-studies', 'language'],
    cutoff: { general: 90, ews: 87, obc: 85, sc: 82, st: 78 },
    pdfUrl: 'https://ctet.nic.in/ctet/question_papers/CTET_Paper1_{year}.pdf',
    qCount: 30,
    duration: '2.5 hours',
    marks: 150,
    official: true
  },
  gate: {
    name: 'GATE',
    paper: 'Graduate Aptitude Test in Engineering',
    subjects: ['general-aptitude', 'engineering-mathematics', 'core-subject'],
    cutoff: { general: 28.5, ews: 25.6, obc: 25.6, sc: 19.0, st: 19.0 },
    pdfUrl: 'https://gate.iisc.ac.in/wp-content/uploads/2024/02/GATE_{year}_question_paper.pdf',
    qCount: 30,
    duration: '3 hours',
    marks: 100,
    official: true
  }
};

function log() { console.log.apply(console, arguments); }
function nowISO() { return new Date().toISOString(); }

function loadExisting() {
  try {
    return JSON.parse(fs.readFileSync(PAPERS_FILE, 'utf8'));
  } catch (e) {
    return { papers: [] };
  }
}

function saveAll(data) {
  fs.writeFileSync(PAPERS_FILE, JSON.stringify(data, null, 2) + '\n');
  log('[papers] saved ' + data.papers.length + ' total papers');
}

function paperKey(p) {
  return p.id || (p.exam + '-' + p.year + '-' + (p.paper || '').toLowerCase().replace(/\s+/g, '-'));
}

function alreadyExists(existing, exam, year) {
  return existing.papers.some(p => p.exam === exam && p.year === year);
}

// ── model call (curl streaming with watchdogs, mirrors invent-questions.js) ──

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function curlChat(payload) {
  const args = [
    '-sS', '--max-time', '5400', '-w', '\n%{http_code}',
    HOST + '/api/chat',
    '-H', 'Content-Type: application/json',
    '-d', '@-'
  ];
  return new Promise((resolve, reject) => {
    const child = spawn('curl', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '', stderr = '';
    const startedAt = Date.now();
    let firstByteAt = 0, lastByteAt = Date.now(), settled = false;

    function fail(why, status) {
      if (settled) return;
      settled = true; clearInterval(mon);
      try { child.kill('SIGKILL'); } catch (e) {}
      const err = new Error('stream monitor: ' + why);
      err.status = status === undefined ? 28 : status;
      if (err.status !== 'DEADLINE') { err.restart = true; err.transport = true; }
      err.stdout = out.slice(0, 2000); err.stderr = stderr.slice(0, 400);
      reject(err);
    }

    const mon = setInterval(() => {
      const now = Date.now();
      if (now - startedAt > 95 * 60000) return fail('hard cap 95min');
      if (!firstByteAt) {
        if (now - startedAt > 25 * 60000) return fail('no first byte in 25min (cold load)');
      } else if (now - lastByteAt > 12 * 60000) {
        return fail('no byte for 12min mid-stream (wedged)');
      }
    }, 5000);

    child.stdout.on('data', d => {
      if (!firstByteAt) { firstByteAt = Date.now(); log('[papers] LLM first byte at ' + Math.round((firstByteAt - startedAt)/1000) + 's'); }
      lastByteAt = Date.now();
      out += d.toString('utf8');
      if (out.length > 32 * 1024 * 1024) fail('buffer cap 32MB');
    });
    child.stderr.on('data', d => { stderr += d.toString('utf8'); });
    child.on('error', err => { if (!settled) { settled = true; clearInterval(mon); reject(err); } });
    child.on('close', code => {
      if (settled) return;
      settled = true; clearInterval(mon);
      if (code === 0) resolve(out);
      else { const err = new Error('curl exit ' + code); err.status = code; if (code === 28) { err.restart = true; err.transport = true; } else if (code === 7 || code === 52 || code === 56) err.transport = true; err.stdout = out.slice(0, 2000); err.stderr = stderr.slice(0, 400); reject(err); }
    });
    child.stdin.on('error', () => {});
    child.stdin.write(payload); child.stdin.end();
  });
}

function parseChatStream(out) {
  const lines = String(out || '').split('\n');
  let httpCode = '';
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  if (lines.length && /^\d{3}$/.test(lines[lines.length - 1].trim())) { httpCode = lines.pop().trim(); }
  let content = '', thinking = '';
  for (const line of lines) {
    const t = line.trim(); if (!t || t.charAt(0) !== '{') continue;
    try { const j = JSON.parse(t); if (j.message) { if (typeof j.message.content === 'string') content += j.message.content; if (typeof j.message.thinking === 'string') thinking += j.message.thinking; } if (typeof j.response === 'string') content += j.response; } catch (e) {}
  }
  return { text: content.trim() || thinking.trim(), httpCode };
}

async function callLLM(system, user) {
  const payload = JSON.stringify({
    model: MODEL,
    stream: true,
    think: false,
    options: { temperature: 0.7, top_p: 0.9, num_ctx: 4096, num_predict: 2048 },
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }]
  });
  let out = await curlChat(payload);
  let parsed = parseChatStream(out);
  if (!parsed.text && parsed.httpCode === '400') {
    log('[papers] Ollama rejected think:false (400) — retrying without');
    out = await curlChat(JSON.stringify(Object.assign(JSON.parse(payload), { think: undefined })));
    parsed = parseChatStream(out);
  }
  if (parsed.httpCode && parsed.httpCode !== '200') throw new Error('HTTP ' + parsed.httpCode);
  return parsed.text || '';
}

function extractJson(text) {
  if (!text) return null;
  let t = String(text).trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const s = t.indexOf('{'); if (s < 0) return null;
  let depth = 0, inStr = false, esc = false, end = -1;
  for (let i = s; i < t.length; i++) {
    const ch = t[i];
    if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; }
    else { if (ch === '"') inStr = true; else if (ch === '{') depth++; else if (ch === '}') { depth--; if (depth === 0) { end = i; break; } } }
  }
  if (end < 0) return null;
  const slice = t.slice(s, end + 1);
  try { return JSON.parse(slice); } catch (e) {}
  // repair control chars
  let rout = '', rinStr = false, resc = false;
  for (let i = 0; i < slice.length; i++) {
    const ch = slice[i];
    if (rinStr) { if (resc) { rout += ch; resc = false; continue; } if (ch === '\\') { rout += ch; resc = true; continue; } if (ch === '"') { rout += ch; rinStr = false; continue; } const code = ch.charCodeAt(0); if (code < 0x20) { rout += ch === '\n' ? '\\n' : ch === '\r' ? '\\r' : ch === '\t' ? '\\t' : ' '; continue; } rout += ch; continue; }
    if (ch === '"') { rinStr = true; rout += ch; continue; } rout += ch;
  }
  try { return JSON.parse(rout.replace(/,\s*([}\]])/g, '$1')); } catch (e2) { return null; }
}

// ── prompt builder ──

function buildPrompt(exam, cfg, year) {
  const subjects = cfg.subjects.join(', ');
  const cutoffStr = JSON.stringify(cfg.cutoff);
  return `You are an expert exam question setter for the ${cfg.name} ${year} examination.
Generate a COMPLETE previous-year paper with ${cfg.qCount} multiple-choice questions.

EXAM: ${cfg.name} ${year}
PAPER: ${cfg.paper}
SUBJECTS TO COVER (distribute evenly): ${subjects}
DURATION: ${cfg.duration} | MARKS: ${cfg.marks}
OFFICIAL PDF PATTERN: ${cfg.pdfUrl.replace('{year}', year).replace('{year_short}', String(year).slice(-2))}

RULES:
- Exactly ${cfg.qCount} questions.
- Each question: stem, 4 options (A/B/C/D), exactly ONE correct, brief solution/explanation.
- Subject distribution must match the real exam pattern.
- Questions must be at actual exam difficulty — not trivial, not impossible.
- Indian exam context (schemes, geography, polity, economy, banking, etc.).
- NO hallucinated facts. If unsure, write a plausible but generic question instead of inventing wrong facts.
- Official cutoff data: ${cutoffStr} — use only for metadata, not in questions.

Return ONLY valid JSON in this exact format (no markdown, no code fences, no extra text):
{
  "id": "${exam}-${year}-${cfg.paper.toLowerCase().replace(/\s+/g, '-')}",
  "exam": "${exam.toUpperCase()}",
  "year": ${year},
  "paper": "${cfg.paper}",
  "totalQuestions": ${cfg.qCount},
  "duration": "${cfg.duration}",
  "marks": ${cfg.marks},
  "cutoff": ${cutoffStr},
  "officialPdf": "${cfg.pdfUrl.replace('{year}', year).replace('{year_short}', String(year).slice(-2))}",
  "official": true,
  "questions": [
    {
      "n": 1,
      "q": "Question text here?",
      "options": [
        {"label": "A", "text": "Option A", "correct": true},
        {"label": "B", "text": "Option B", "correct": false},
        {"label": "C", "text": "Option C", "correct": false},
        {"label": "D", "text": "Option D", "correct": false}
      ],
      "answer": "A",
      "subject": "subject-name",
      "explain": "Brief explanation here."
    }
    // ... ${cfg.qCount} questions total
  ]
}`;
}

// ── validation ──

function validatePaper(raw, cfg) {
  const parsed = extractJson(raw);
  if (!parsed) return { ok: false, why: 'unparseable JSON' };
  const qArr = parsed.questions;
  if (!Array.isArray(qArr) || qArr.length !== cfg.qCount) {
    return { ok: false, why: 'questions array length ' + (qArr ? qArr.length : 0) + ' != ' + cfg.qCount };
  }
  for (let i = 0; i < qArr.length; i++) {
    const q = qArr[i];
    if (!q.q || String(q.q).length < 10) return { ok: false, why: 'q' + (i+1) + ' stem too short' };
    if (!Array.isArray(q.options) || q.options.length !== 4) return { ok: false, why: 'q' + (i+1) + ' options count ' + (q.options ? q.options.length : 0) };
    let correctCount = 0;
    for (let j = 0; j < 4; j++) {
      const o = q.options[j];
      if (!o || !o.label || !o.text) return { ok: false, why: 'q' + (i+1) + ' option ' + j + ' malformed' };
      if (o.correct) correctCount++;
    }
    if (correctCount !== 1) return { ok: false, why: 'q' + (i+1) + ' correct count ' + correctCount };
    if (!q.answer) return { ok: false, why: 'q' + (i+1) + ' answer missing' };
    if (!q.subject) return { ok: false, why: 'q' + (i+1) + ' subject missing' };
    if (!q.explain || String(q.explain).length < 5) return { ok: false, why: 'q' + (i+1) + ' explain too short' };
    if (q.n !== i + 1) q.n = i + 1; // renumber
  }
  return { ok: true, paper: parsed };
}

// ── main ──

async function main() {
  const existing = loadExisting();
  let added = 0, skipped = 0, failed = 0;

  for (const exam of TARGET_EXAMS) {
    const cfg = EXAM_CONFIG[exam];
    if (!cfg) { log('[papers] unknown exam: ' + exam); continue; }
    if (alreadyExists(existing, exam.toUpperCase(), TARGET_YEAR)) {
      log('[papers] ' + exam + ' ' + TARGET_YEAR + ' already exists — skipping');
      skipped++;
      continue;
    }

    log('\n[papers] generating ' + exam + ' ' + TARGET_YEAR + ' (' + cfg.qCount + ' Q) ...');
    const prompt = buildPrompt(exam, cfg, TARGET_YEAR);

    let made = null;
    for (let attempt = 1; attempt <= 2 && !made; attempt++) {
      try {
        const raw = await callLLM(
          'You are an exam setter. Reply with a single strict JSON object and nothing else.',
          prompt
        );
        const v = validatePaper(raw, cfg);
        if (v.ok) {
          made = v.paper;
        } else {
          log('[papers] ' + exam + ' attempt ' + attempt + ' rejected: ' + v.why);
        }
      } catch (e) {
        log('[papers] ' + exam + ' attempt ' + attempt + ' error: ' + e.message);
        if (e.transport) { await sleep(15000); }
      }
    }

    if (made) {
      existing.papers.push(made);
      saveAll(existing);
      log('[papers] + ' + exam + ' ' + TARGET_YEAR + ' added (' + made.questions.length + ' questions)');
      added++;
    } else {
      log('[papers] ' + exam + ' ' + TARGET_YEAR + ' FAILED after 2 attempts');
      failed++;
    }
  }

  log('\n[papers] done — added: ' + added + ', skipped: ' + skipped + ', failed: ' + failed);
  if (added === 0 && failed > 0) process.exit(1);
}

main().catch(e => { console.error('[papers] fatal: ' + e.stack); process.exit(1); });