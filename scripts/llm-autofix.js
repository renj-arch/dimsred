// LLM auto-fixer: reads the fault board + coverage reports, asks a local
// LLM (Ollama on the runner's CPU — free forever, no API keys) to fix what
// it safely can, and writes the results back. What it fixes:
//   1. Thin categories — generates new MCQ questions for low-count cats
//   2. Missing figures — generates monochrome SVG figure pages for syllabus gaps
//   3. Broken captions — rewrites stale/wrong figure text from fault details
//
// Everything is logged to data/autofix-log.json so improve.html can show
// "what the model fixed" with before/after evidence.
//
// Primary: Ollama at OLLAMA_HOST (default http://localhost:11434) — the
// workflow installs Ollama and pulls Qwen2.5-1.5B (~1GB, runs on CPU in
// ~30-60s per call). Zero cost, zero keys, works offline.
// Optional fallbacks: Groq → Gemini, only if OLLAMA_MODEL env is unset and
// API keys happen to be present.
// Never blocks: any fatal error logs and exits 0.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOG = 'data/autofix-log.json';
const MAX_FIXES_PER_RUN = 3; // large models on CPU are slow — keep runs within timeout
// 127.0.0.1 NOT localhost: Node fetch resolves localhost to ::1 (IPv6) first
// on GitHub runners; Ollama listens on IPv4 only → instant "fetch failed"
// while curl/ollama-CLI (IPv4) work fine.
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
// This variable was referenced in callLLM but NEVER DEFINED — every Ollama
// call threw "ReferenceError: OLLAMA_MODEL is not defined", was caught as
// "Ollama not reachable", and the workflow reported success with 0 fixes
// (proven in the LLM Auto-fix logs: "Ollama not reachable: OLLAMA_MODEL is
// not defined" + "0 fix(es) applied this run"). Now it always exists.
let OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3.8:27b'; // reassigned by main() after model selection

// ── Self-upgrading model selector ──
// Ranked by LiveCodeBench v6 / coding ability. When a better model appears
// on Ollama, add it here and the next run picks it automatically. The
// selector probes what's actually pullable and what fits in memory, then
// picks the best available.
//
// To upgrade: just add a new entry at the right position. No code changes
// needed elsewhere. Example: when Qwen4-30B releases and hits 95%+, insert
// it above Qwen3.8-27B and the next run uses it.
const MODEL_RANKING = [
  // { ollama: 'tag', ramGB: approx RAM needed, score: LiveCodeBench %, note }
  { ollama: 'qwen3.8:27b',        ramGB: 18, score: 90.3, note: 'Qwen3.8-27B' },
  { ollama: 'nvidia/nemotron-nano-9b-v2', ramGB: 6, score: 71.1, note: 'Nemotron 9B v2' },
  { ollama: 'qwen3.5:9b',         ramGB: 6, score: 65,   note: 'Qwen3.5-9B' },
  { ollama: 'qwen3.5:4b',         ramGB: 3.5, score: 55, note: 'Qwen3.5-4B' },
  { ollama: 'qwen3.5:2b',         ramGB: 2, score: 45,   note: 'Qwen3.5-2B' },
  { ollama: 'qwen3.5:0.8b',       ramGB: 1, score: 30,   note: 'Qwen3.5-0.8B' }
];

function availableRAM() {
  try {
    const os = require('os');
    const totalGB = os.totalmem() / (1024 * 1024 * 1024);
    const freeGB = os.freemem() / (1024 * 1024 * 1024);
    return { totalGB: totalGB, freeGB: freeGB };
  } catch (e) {
    return { totalGB: 7, freeGB: 5 }; // safe default for GitHub runners
  }
}

async function pickBestModel() {
  const env = process.env.OLLAMA_MODEL;
  if (env) {
    console.log('autofix: using OLLAMA_MODEL env override: ' + env);
    return env;
  }

  const ram = availableRAM();
  console.log('autofix: system RAM ' + ram.totalGB.toFixed(1) + 'GB total, ' + ram.freeGB.toFixed(1) + 'GB free');

  // Check which models are already pulled (no network needed).
  // curl not fetch: fetch resolves localhost → ::1 IPv6 and Ollama is
  // IPv4-only, so the probe always failed and the model list was always empty.
  let pulled = [];
  try {
    const out = execSync(
      'curl -s --max-time 30 ' + OLLAMA_HOST + '/api/tags',
      { encoding: 'utf8', timeout: 40000 }
    );
    const j = JSON.parse(out);
    pulled = (j.models || []).map(function (m) { return m.name; });
    console.log('autofix: ' + pulled.length + ' model(s) already pulled: ' + pulled.join(', '));
  } catch (e) { /* Ollama not up yet */ }

  // Pick the best model that (a) is already pulled, or (b) fits in total RAM.
  // Prefer already-pulled to avoid a slow download.
  for (const entry of MODEL_RANKING) {
    const isPulled = pulled.some(function (n) {
      return n === entry.ollama || n.startsWith(entry.ollama.split(':')[0]);
    });
    const fitsRAM = ram.totalGB >= entry.ramGB + 1; // +1GB headroom for OS

    if (isPulled) {
      console.log('autofix: selected ' + entry.note + ' (already pulled, ' + entry.score + '% LiveCodeBench)');
      return entry.ollama;
    }
    if (fitsRAM) {
      console.log('autofix: selected ' + entry.note + ' (' + entry.score + '% LiveCodeBench, fits in ' + ram.totalGB.toFixed(0) + 'GB RAM)');
      return entry.ollama;
    }
  }

  // Nothing fits — use the smallest.
  console.log('autofix: no model fits, using smallest');
  return MODEL_RANKING[MODEL_RANKING.length - 1].ollama;
}

function loadJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fallback; }
}

function saveJson(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 1) + '\n');
}

// ── LLM call: Ollama (local, free forever) → optional API fallbacks ──
async function callLLM(system, user, maxTokens) {
  // Primary: local Ollama via curl — no keys, no rate limits, runs on runner CPU.
  // --max-time 2400: 27B generates ~1-3 tok/s on CPU; cutting off at 30 min
  // wastes full generations. On timeout: restart (clears wedged server-side
  // work — curl abandoning does NOT stop Ollama, and naive retries queue
  // behind their own zombie), then ONE retry on a clean server.
  let out;
  try {
    out = execSync(
      'curl -sS --max-time 2400 -w "\\n%{http_code}" ' + OLLAMA_HOST + '/api/chat -H "Content-Type: application/json" -d @-',
      {
        input: JSON.stringify({
          model: OLLAMA_MODEL,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user }
          ],
          stream: false,
          // 2048 not 1024: qwen3.8:27b is a THINKING model — it burns
          // ~200-600 tokens on message.thinking before emitting content.
          options: { temperature: 0.3, num_predict: maxTokens || 2048 }
        }),
        encoding: 'utf8', timeout: 2450000, maxBuffer: 50 * 1024 * 1024
      }
    );
  } catch (e) {
    if (e.status === 28) {
      console.log('autofix: Ollama timed out — restarting server to clear wedged work, then one retry');
      try { execSync('pkill -f "ollama serve"; sleep 2; nohup ollama serve >> /tmp/ollama.log 2>&1 &', { stdio: 'ignore', timeout: 15000 }); } catch (e0) { /* ignore */ }
      try {
        for (let i = 0; i < 60; i++) {
          try {
            execSync('curl -sf --max-time 5 ' + OLLAMA_HOST + '/api/tags', { stdio: 'pipe', timeout: 10000 });
            break;
          } catch (e1) { execSync('sleep 2', { stdio: 'ignore' }); }
        }
        out = execSync(
          'curl -sS --max-time 2400 -w "\\n%{http_code}" ' + OLLAMA_HOST + '/api/chat -H "Content-Type: application/json" -d @-',
          {
            input: JSON.stringify({
              model: OLLAMA_MODEL,
              messages: [
                { role: 'system', content: system },
                { role: 'user', content: user }
              ],
              stream: false,
              options: { temperature: 0.3, num_predict: maxTokens || 2048 }
            }),
            encoding: 'utf8', timeout: 2450000, maxBuffer: 50 * 1024 * 1024
          }
        );
      } catch (e2) {
        console.log('autofix: Ollama retry failed after restart: exit=' + e2.status);
        out = null;
      }
    } else {
      console.log('autofix: Ollama curl failed: exit=' + (e.status === undefined ? '?' : e.status) +
        ' stderr=' + String(e.stderr || '').slice(0, 200) + ' out=' + String(e.stdout || '').slice(0, 200));
      out = null;
    }
  }
  if (!out) {
    // Optional fallbacks below (unchanged) — only used if API keys happen to be set.
  } else {
  try {
    const nl = out.lastIndexOf('\n');
    const body = nl >= 0 ? out.slice(0, nl) : out;
    const httpCode = nl >= 0 ? out.slice(nl + 1).trim() : '';
    const j = JSON.parse(body);
    const msg = j.message || {};
    let text = (msg.content || '').trim();
    if (!text && msg.thinking) text = msg.thinking.trim();
    if (text) {
      console.log('autofix: LLM ← ' + OLLAMA_MODEL + ' (' + text.length + ' chars): ' + text.slice(0, 400).replace(/\s+/g, ' '));
      return { text: text, model: OLLAMA_MODEL + ' (local)' };
    }
    console.log('autofix: Ollama ' + OLLAMA_MODEL + ' returned empty (http ' + httpCode + '): ' + body.slice(0, 200));
  } catch (e) {
    console.log('autofix: Ollama response failed: ' + (e.message || e).slice(0, 200));
  }
  }

  // Optional fallbacks — only used if API keys happen to be set.
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + groqKey },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user }
          ],
          max_tokens: maxTokens || 1024,
          temperature: 0.3
        })
      });
      if (res.ok) {
        const j = await res.json();
        const text = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
        if (text.trim()) return { text: text.trim(), model: 'llama-3.3-70b (groq)' };
      }
    } catch (e) { /* continue */ }
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
  // Detailed log: the actual questions written (first 2), so improve.html
  // shows WHAT was written, not just a count.
  const qPreview = parsed.filter(q => q && q.question).slice(0, 2).map(q =>
    'Q: ' + q.question + ' | A: ' + (Array.isArray(q.options) ? (q.options[q.answer] || q.options[0]) : q.answer)
  ).join('\n');
  return {
    kind: 'questions',
    target: catName,
    file: catFile,
    count: added.length,
    ids: added,
    model: result.model,
    detail: added.length + ' new MCQ(s) generated for "' + catName + '"',
    text: qPreview.slice(0, 600)
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
  // Detailed log: the diagram's node labels (what the figure teaches).
  const labels = (svg.match(/<text[^>]*>([^<]{1,60})<\/text>/g) || []).slice(0, 8)
    .map(t => t.replace(/<[^>]*>/g, '').trim()).filter(Boolean);
  return {
    kind: 'figure',
    target: topic,
    file: figFile,
    model: result.model,
    detail: 'Figure page created for "' + topic + '" (' + subject + ')',
    text: 'Nodes: ' + (labels.length ? labels.join(' → ') : topic)
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
      detail: 'Caption corrected on ' + path.basename(page),
      text: '→ ' + corrected.slice(0, 400)
    };
  }
  return null;
}

// ── Main ──
async function main() {
  const log = loadJson(LOG, { fixes: [], lastRun: null, model: null });
  const faults = loadJson('data/faults.json', null);
  if (!faults || !faults.faults) {
    console.log('autofix: no fault board found — nothing to fix');
    return;
  }

  // Self-upgrade: pick the best available model automatically.
  const model = await pickBestModel();
  log.model = model;
  // Apply the selection to the module-level variable callLLM uses (it was
  // previously never wired up — callLLM used an undefined name).
  if (model) OLLAMA_MODEL = model;
  console.log('autofix: this run uses ' + OLLAMA_MODEL);

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
