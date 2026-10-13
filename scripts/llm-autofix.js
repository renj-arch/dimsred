// LLM auto-fixer: reads the fault board + coverage reports, asks Llama 4
// Maverick (via Groq free tier) to fix what it safely can, and writes the
// results back. What it fixes:
//   1. Thin categories — generates new fill_blank questions for low-count cats
//   2. Missing figures — generates monochrome SVG figure pages for syllabus gaps
//   3. Broken captions — rewrites stale/wrong figure text from fault details
//
// Everything is logged to data/autofix-log.json so improve.html can show
// "what the model fixed" with before/after evidence.
//
// Requires GROQ_API_KEY. Falls back to Gemini if Groq fails.
// Never blocks: any fatal error logs and exits 0.

const fs = require('fs');
const path = require('path');

const LOG = 'data/autofix-log.json';
const MAX_FIXES_PER_RUN = 8; // stay well within free-tier rate limits
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
// Cascade: strongest free models first, fall through on 404/403/rate-limit.
// Maverick (400B MoE) → Scout → Kimi K2 → Llama 3.3 70B → GPT-OSS 120B.
const GROQ_MODELS = [
  'meta-llama/llama-4-maverick-17b-128e-instruct',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'moonshotai/kimi-k2-instruct-0905',
  'llama-3.3-70b-versatile',
  'openai/gpt-oss-120b'
];
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

function loadJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fallback; }
}

function saveJson(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 1) + '\n');
}

// ── LLM call (Groq cascade → Gemini fallback) ──
async function callLLM(system, user, maxTokens) {
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (groqKey) {
    // One-time diagnostic: list what models this key can see.
    try {
      const lr = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': 'Bearer ' + groqKey }
      });
      if (lr.ok) {
        const lj = await lr.json();
        const ids = (lj.data || []).map(function (m) { return m.id; });
        console.log('autofix: Groq key sees ' + ids.length + ' models: ' + ids.slice(0, 20).join(', '));
      } else {
        console.log('autofix: Groq model list → ' + lr.status);
      }
    } catch (e) { console.log('autofix: Groq model list failed: ' + e.message); }

    for (const model of GROQ_MODELS) {
      try {
        const res = await fetch(GROQ_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + groqKey },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user }
            ],
            max_tokens: maxTokens || 2048,
            temperature: 0.3
          })
        });
        if (res.ok) {
          const j = await res.json();
          const text = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
          if (text.trim()) return { text: text.trim(), model: model.split('/').pop() };
        }
        const status = res.status;
        const body = await res.text().catch(function () { return ''; });
        console.log('autofix: Groq ' + model + ' → ' + status + ' ' + body.slice(0, 200));
        if (status === 401 || status === 403) break; // bad key — skip remaining models
        // 404/429 → try next model
      } catch (e) {
        console.log('autofix: Groq ' + model + ' failed: ' + (e.message || e));
      }
    }
    console.log('autofix: all Groq models exhausted — trying Gemini');
  }

  if (geminiKey) {
    try {
      const res = await fetch(GEMINI_URL + '?key=' + geminiKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: system + '\n\n' + user }] }],
          generationConfig: { maxOutputTokens: maxTokens || 2048, temperature: 0.3 }
        })
      });
      if (res.ok) {
        const j = await res.json();
        const text = (j.candidates && j.candidates[0] && j.candidates[0].content &&
          j.candidates[0].content.parts && j.candidates[0].content.parts[0] &&
          j.candidates[0].content.parts[0].text) || '';
        if (text.trim()) return { text: text.trim(), model: 'gemini-flash' };
      } else {
        const body = await res.text().catch(function () { return ''; });
        console.log('autofix: Gemini → ' + res.status + ' ' + body.slice(0, 200));
      }
    } catch (e) {
      console.log('autofix: Gemini failed: ' + (e.message || e));
    }
  }

  return null;
}

// ── Fix 1: thin categories → generate questions ──
async function fixThinCategory(fault) {
  const m = fault.title.match(/Category "([^"]+)"/);
  if (!m) return null;
  const catName = m[1];
  const slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const catFile = 'data/questions/' + slug + '.json';
  const cat = loadJson(catFile, null);
  if (!cat) return null;

  const catKey = Object.keys(cat)[0];
  const subs = cat[catKey].subSubjects || {};
  const existing = new Set();
  let subtopicName = Object.keys(subs)[0] || catName;
  for (const arr of Object.values(subs)) {
    if (Array.isArray(arr)) arr.forEach(q => { if (q && q.question) existing.add(q.question.toLowerCase().slice(0, 80)); });
  }
  const sampleQ = [];
  for (const arr of Object.values(subs)) {
    if (Array.isArray(arr)) sampleQ.push(...arr.slice(0, 3));
  }
  if (!sampleQ.length) return null;

  const prompt = 'Generate 5 multiple-choice questions (with 4 options each) for the UPSC/SSC exam category "' + catName + '".\n\n' +
    'Format: strict JSON array, each object with keys: question, options (array of 4 strings), answer (index 0-3), explanation (1-2 sentences).\n' +
    'Match the style of these existing questions:\n' +
    sampleQ.slice(0, 2).map(q => '- ' + q.question).join('\n') +
    '\n\nReturn ONLY the JSON array, no markdown fences.';

  const result = await callLLM(
    'You are an expert UPSC/SSC exam question writer. Generate accurate, exam-relevant MCQs. Return strict JSON only.',
    prompt, 2048
  );
  if (!result) { console.log('autofix: thin-cat ' + catName + ' — no LLM response'); return null; }
  console.log('autofix: thin-cat ' + catName + ' — got ' + result.text.length + ' chars from ' + result.model);

  let parsed;
  try {
    const clean = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(clean);
  } catch (e) {
    console.log('autofix: thin-cat ' + catName + ' — JSON parse failed: ' + e.message + ' | snippet: ' + result.text.slice(0, 150));
    return null;
  }
  if (!Array.isArray(parsed) || !parsed.length) return null;

  const added = [];
  const baseId = 'autofix-' + Date.now().toString(36);
  parsed.forEach((q, i) => {
    if (!q.question || !q.options || !Array.isArray(q.options) || q.options.length !== 4) return;
    const qLower = q.question.toLowerCase().slice(0, 80);
    if (existing.has(qLower)) return; // dedup
    const qObj = {
      id: baseId + '-' + i,
      type: 'mcq',
      category: catName,
      region: '',
      source: 'Llama 4 Maverick (auto-fix)',
      pubDate: new Date().toISOString(),
      subject: catName,
      subSubject: subtopicName,
      emoji: '',
      question: q.question,
      options: q.options,
      answer: q.options[q.answer] || q.options[0],
      hint: '',
      fact: q.explanation || '',
      wikiDone: false
    };
    if (!subs[subtopicName]) subs[subtopicName] = [];
    subs[subtopicName].push(qObj);
    added.push(qObj.id);
  });

  if (!added.length) return null;
  saveJson(catFile, cat);
  return {
    kind: 'questions',
    target: catName,
    file: catFile,
    count: added.length,
    ids: added,
    model: result.model,
    detail: added.length + ' new MCQ(s) generated for "' + catName + '"'
  };
}

// ── Fix 2: missing figures → generate SVG figure pages ──
async function fixMissingFigure(subject, topic) {
  const prompt = 'Create a monochrome pencil-outline SVG line diagram for the exam topic: "' + topic + '" (subject: ' + subject + ').\n' +
    'Style: hand-drawn exam-hall sketch look — simple strokes, no fill colors, no gradients, black on white.\n' +
    'Content: 4-8 boxes/nodes connected by arrows or lines, each labeled with key terms. This is for an Indian competitive exam (UPSC/SSC).\n' +
    'Return ONLY valid SVG starting with <svg, no markdown fences, no explanation. viewBox="0 0 600 400". Use font-family="serif" for labels.';

  const result = await callLLM(
    'You are an expert at creating simple exam-study diagrams. Generate clean, valid SVG. Return SVG only, no markdown.',
    prompt, 3000
  );
  if (!result) return null;

  let svg = result.text.replace(/```svg\n?/g, '').replace(/```\n?/g, '').trim();
  if (!svg.startsWith('<svg')) {
    const m = svg.match(/<svg[\s\S]*<\/svg>/);
    if (m) svg = m[0]; else return null;
  }

  const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  const figFile = 'figures/' + slug + '.html';
  if (fs.existsSync(figFile)) return null;

  const html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
    '<title>Figure: ' + topic + '</title>\n' +
    '<style>body{font-family:Georgia,serif;max-width:700px;margin:2rem auto;padding:0 1rem;background:#fafaf8;color:#222}\n' +
    'h1{font-size:1.2rem;border-bottom:1px solid #ccc;padding-bottom:.4rem}\n' +
    '.cap{font-size:.85rem;color:#666;margin:.5rem 0 1.5rem}\n' +
    'svg{width:100%;height:auto;border:1px solid #ddd;background:#fff}\n' +
    '.src{font-size:.75rem;color:#999;margin-top:1rem}</style>\n</head>\n<body>\n' +
    '<h1>' + topic + '</h1>\n' +
    '<p class="cap">Pencil-outline study diagram · auto-generated · subject: ' + subject + '</p>\n' +
    svg + '\n' +
    '<p class="src">Generated by Llama 4 Maverick via auto-fix pipeline · ' + new Date().toISOString().slice(0, 10) + '</p>\n' +
    '</body>\n</html>\n';

  fs.mkdirSync('figures', { recursive: true });
  fs.writeFileSync(figFile, html);
  return {
    kind: 'figure',
    target: topic,
    file: figFile,
    model: result.model,
    detail: 'Figure page created for "' + topic + '" (' + subject + ')'
  };
}

// ── Fix 3: broken captions → rewrite from fault details ──
async function fixBrokenCaption(fault) {
  if (!fault.action || !fault.action.current || !fault.action.fix) return null;
  const page = fault.action.target || '';
  if (!page || !fs.existsSync(page)) return null;

  let html = fs.readFileSync(page, 'utf8');
  const wrongText = fault.action.current.slice(0, 300);
  const correctHint = fault.action.fix.slice(0, 300);

  const prompt = 'The following text on an exam study page is wrong or broken:\n\nWRONG: ' + wrongText + '\n\n' +
    'It should read (correction hint): ' + correctHint + '\n\n' +
    'Rewrite ONLY the wrong text to be correct. Return the corrected text, no explanation, no markdown fences.';

  const result = await callLLM(
    'You fix factual errors in exam study materials. Return only the corrected text.',
    prompt, 1024
  );
  if (!result) return null;

  const corrected = result.text.trim();
  if (!corrected || corrected === wrongText) return null;

  // Try exact replacement first
  if (html.includes(wrongText)) {
    html = html.replace(wrongText, corrected);
    fs.writeFileSync(page, html);
    return {
      kind: 'caption',
      target: page,
      file: page,
      model: result.model,
      detail: 'Caption corrected on ' + path.basename(page)
    };
  }
  return null;
}

// ── Main ──
async function main() {
  const log = loadJson(LOG, { fixes: [], lastRun: null });
  const faults = loadJson('data/faults.json', null);
  if (!faults || !faults.faults) {
    console.log('autofix: no fault board found — nothing to fix');
    return;
  }

  // Collect actionable fixes from the board
  const thinCats = faults.faults.filter(f => f.severity === 'critical' && f.kind === 'coverage' && f.action);
  const figGaps = loadJson('data/figure-gaps.json', null);
  const brokenSite = faults.faults.filter(f => f.kind === 'site' && f.severity === 'warn');

  let fixes = [];
  let budget = MAX_FIXES_PER_RUN;

  // Priority 1: broken pages (highest impact)
  for (const f of brokenSite) {
    if (budget <= 0) break;
    const fix = await fixBrokenCaption(f);
    if (fix) { fixes.push(fix); budget--; console.log('autofix: ' + fix.detail); }
  }

  // Priority 2: thin categories (critical coverage)
  for (const f of thinCats) {
    if (budget <= 0) break;
    const fix = await fixThinCategory(f);
    if (fix) { fixes.push(fix); budget--; console.log('autofix: ' + fix.detail); }
  }

  // Priority 3: missing figures (generate SVG for first few gaps)
  if (figGaps && figGaps.bySubject && budget > 0) {
    const subjects = Object.keys(figGaps.bySubject).slice(0, 3);
    for (const subj of subjects) {
      if (budget <= 0) break;
      const topics = (figGaps.bySubject[subj] || []).slice(0, 2);
      for (const topic of topics) {
        if (budget <= 0) break;
        const fix = await fixMissingFigure(subj, topic);
        if (fix) { fixes.push(fix); budget--; console.log('autofix: ' + fix.detail); }
      }
    }
  }

  // Log
  log.lastRun = new Date().toISOString();
  log.fixes = log.fixes.concat(fixes);
  if (log.fixes.length > 50) log.fixes = log.fixes.slice(-50);
  saveJson(LOG, log);

  console.log('autofix: ' + fixes.length + ' fix(es) applied this run · ' + log.fixes.length + ' total in log');
  fixes.forEach(f => console.log('  [' + f.kind + '] ' + f.detail));
}

main().then(() => process.exit(0)).catch(e => {
  console.error('autofix: FATAL — ' + (e.message || e));
  process.exit(0); // never block
});
