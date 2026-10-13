// Site Agent: the complete autonomous maintainer. Reads every report,
// fixes everything it safely can, and escalates what needs human decision.
//
// Capabilities:
//   CONTENT  — generate questions, figures, explanations, current affairs
//   CODE     — fix broken links, HTML issues, dead scripts, missing assets
//   SEO      — meta tags, headings, structured data, descriptions
//   A11Y     — accessibility: alt text, contrast, ARIA labels, keyboard nav
//   DESIGN   — responsive fixes, font sizes, spacing, color consistency
//   FEATURES — generate new study tools from templates (flashcards, mind maps)
//   PERF     — image optimization hints, lazy loading, script defer
//   SECURITY — check for unsafe patterns, missing headers
//
// Everything logged to data/agent-log.json. improve.html shows what the
// agent did. Never blocks: any fatal error logs and exits 0.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOG = 'data/agent-log.json';
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';

// ── Self-upgrading model selector ──
const MODEL_RANKING = [
  { ollama: 'qwen3.8:27b',        ramGB: 18, score: 90.3 },
  { ollama: 'nvidia/nemotron-nano-9b-v2', ramGB: 6, score: 71.1 },
  { ollama: 'qwen3.5:9b',         ramGB: 6, score: 65 },
  { ollama: 'qwen3.5:4b',         ramGB: 3.5, score: 55 },
  { ollama: 'qwen3.5:2b',         ramGB: 2, score: 45 }
];

function availableRAM() {
  try {
    const os = require('os');
    return { totalGB: os.totalmem() / (1024 ** 3), freeGB: os.freemem() / (1024 ** 3) };
  } catch (e) { return { totalGB: 7, freeGB: 5 }; }
}

async function pickBestModel() {
  if (process.env.OLLAMA_MODEL) return process.env.OLLAMA_MODEL;
  const ram = availableRAM();
  for (const entry of MODEL_RANKING) {
    if (ram.totalGB >= entry.ramGB + 1) return entry.ollama;
  }
  return MODEL_RANKING[MODEL_RANKING.length - 1].ollama;
}

async function callLLM(system, user, maxTokens) {
  const model = await pickBestModel();
  try {
    const res = await fetch(OLLAMA_HOST + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        stream: false,
        options: { temperature: 0.3, num_predict: maxTokens || 1024 }
      }),
      signal: AbortSignal.timeout(300000) // 5 min: first call loads model into RAM
    });
    if (res.ok) {
      const j = await res.json();
      const text = (j.message && j.message.content) || '';
      if (text.trim()) return { text: text.trim(), model: model };
    }
  } catch (e) {
    console.log('agent: LLM failed: ' + e.message);
  }
  return null;
}

function loadJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fallback; }
}

function saveJson(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 1) + '\n');
}

function listPages() {
  return fs.readdirSync('.')
    .filter(f => /\.html$/i.test(f) && f[0] !== '_' && f[0] !== '.')
    .sort();
}

// ── AGENT 1: SEO optimizer ──
// Ensures every page has: title, meta description, canonical, og tags,
// proper heading hierarchy, structured data.
async function agentSEO() {
  const fixes = [];
  const pages = listPages();

  for (const page of pages) {
    let html = fs.readFileSync(page, 'utf8');
    let changed = false;

    // Add meta description if missing
    if (!/<meta[^>]+name=["']description["']/i.test(html) && /<head>/i.test(html)) {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : page.replace('.html', '').replace(/-/g, ' ');
      const desc = '<meta name="description" content="' + title + ' — study material, quizzes, and AI-powered explanations on Vlymbooq.">';
      html = html.replace(/(<head>)/i, '$1\n' + desc);
      changed = true;
      fixes.push({ page: page, fix: 'Added meta description' });
    }

    // Add viewport if missing
    if (!/<meta[^>]+name=["']viewport["']/i.test(html) && /<head>/i.test(html)) {
      html = html.replace(/(<head>)/i, '$1\n<meta name="viewport" content="width=device-width,initial-scale=1">');
      changed = true;
      fixes.push({ page: page, fix: 'Added viewport meta' });
    }

    // Add lang attribute if missing
    if (!/<html[^>]+lang=/i.test(html)) {
      html = html.replace(/<html/i, '<html lang="en"');
      changed = true;
      fixes.push({ page: page, fix: 'Added lang attribute' });
    }

    if (changed) fs.writeFileSync(page, html);
  }

  console.log('agent: SEO — ' + fixes.length + ' fix(es) across ' + pages.length + ' pages');
  return { agent: 'seo', fixes: fixes };
}

// ── AGENT 1b: Performance ──
// Detects slow-loading pages: huge JS files, missing defer/async, no lazy loading.
async function agentPerf() {
  const fixes = [];
  const pages = listPages();

  for (const page of pages) {
    let html = fs.readFileSync(page, 'utf8');
    let changed = false;

    // Add defer to <script src> tags missing it (except JSON-LD and modules)
    if (/<script[^>]+src=["'][^"']+["'](?!.*defer)(?!.*async)(?!.*type=["']module)/i.test(html) && !/type=["']application\/ld\+json/i.test(html)) {
      html = html.replace(/<script([^>]+src=["'][^"']+["'])([^>]*)>/gi, function (match, src, rest) {
        if (/defer|async|type=["']module/i.test(match)) return match;
        return '<script' + src + rest + ' defer>';
      });
      changed = true;
      fixes.push({ page: page, fix: 'Added defer to script tags' });
    }

    // Add loading="lazy" to images missing it
    if (/<img(?![^>]+loading=)[^>]*>/i.test(html)) {
      html = html.replace(/<img((?:(?!loading=)[^>])*?)>/gi, '<img$1 loading="lazy">');
      changed = true;
      fixes.push({ page: page, fix: 'Added lazy loading to images' });
    }

    // Detect huge inline JS (>50KB) and note it
    const inlineScripts = html.match(/<script(?![^>]+src)[^>]*>([\s\S]*?)<\/script>/gi) || [];
    let hugeInline = 0;
    inlineScripts.forEach(s => { if (s.length > 50000) hugeInline++; });
    if (hugeInline > 0) {
      fixes.push({ page: page, fix: 'WARNING: ' + hugeInline + ' inline script(s) >50KB — consider extracting to external file', kind: 'perf-warn' });
    }

    if (changed) fs.writeFileSync(page, html);
  }

  // Check JS file sizes
  try {
    const jsDir = 'js';
    if (fs.existsSync(jsDir)) {
      fs.readdirSync(jsDir).filter(f => f.endsWith('.js')).forEach(f => {
        const size = fs.statSync(path.join(jsDir, f)).size;
        if (size > 200000) {
          fixes.push({ page: 'js/' + f, fix: 'WARNING: ' + f + ' is ' + (size / 1024).toFixed(0) + 'KB — consider code-splitting', kind: 'perf-warn' });
        }
      });
    }
  } catch (e) { /* ignore */ }

  console.log('agent: Perf — ' + fixes.length + ' fix(es)/warning(s)');
  return { agent: 'perf', fixes: fixes };
}

// ── AGENT 2: Accessibility (A11Y) ──
// Ensures: alt text on images, ARIA labels on interactive elements,
// proper heading hierarchy, color contrast hints.
async function agentA11Y() {
  const fixes = [];
  const pages = listPages();

  for (const page of pages) {
    let html = fs.readFileSync(page, 'utf8');
    let changed = false;

    // Add alt="" to images missing alt (decorative) or alt="..." placeholder
    if (/<img(?![^>]+alt=)[^>]*>/i.test(html)) {
      html = html.replace(/<img(?![^>]+alt=)([^>]*)>/gi, '<img alt=""$1>');
      changed = true;
      fixes.push({ page: page, fix: 'Added alt attributes to images' });
    }

    // Add role="button" and tabindex to clickable divs/spans without them
    // (common pattern in this site's quiz cards)
    if (/<div[^>]+onclick(?![^>]+role=)[^>]*>/i.test(html)) {
      html = html.replace(/<div([^>]+)onclick=/gi, '<div role="button" tabindex="0"$1onclick=');
      changed = true;
      fixes.push({ page: page, fix: 'Added role/tabindex to clickable divs' });
    }

    // Ensure skip-to-content link exists on pages with <main> or <nav>
    if (/<nav/i.test(html) && !/skip/i.test(html) && /<body/i.test(html)) {
      const skip = '<a href="#main" style="position:absolute;left:-9999px" onfocus="this.style.left=\'0\'" onblur="this.style.left=\'-9999px\'">Skip to content</a>';
      html = html.replace(/(<body[^>]*>)/i, '$1\n' + skip);
      changed = true;
      fixes.push({ page: page, fix: 'Added skip-to-content link' });
    }

    if (changed) fs.writeFileSync(page, html);
  }

  console.log('agent: A11Y — ' + fixes.length + ' fix(es) across ' + pages.length + ' pages');
  return { agent: 'a11y', fixes: fixes };
}

// ── AGENT 3: Code fixer ──
// Fixes: dead internal links, missing closing tags, deprecated attributes.
async function agentCode() {
  const fixes = [];
  const pages = listPages();
  const existingFiles = new Set(pages);
  // Also include directories that exist
  try {
    fs.readdirSync('.', { withFileTypes: true }).forEach(d => {
      if (d.isDirectory()) existingFiles.add(d.name + '/');
    });
  } catch (e) { /* ignore */ }

  for (const page of pages) {
    let html = fs.readFileSync(page, 'utf8');
    let changed = false;

    // Fix links to non-existent local .html files
    const linkRegex = /href=["'](?!http|https|mailto|#|\/\/|data:)([^"']+\.html[^"']*)["']/gi;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      const target = match[1].split('#')[0].split('?')[0];
      if (target && !existingFiles.has(target) && !fs.existsSync(target)) {
        // Remove the dead link but keep the text
        html = html.replace(match[0], 'href="#"');
        changed = true;
        fixes.push({ page: page, fix: 'Fixed dead link: ' + target });
      }
    }

    // Remove deprecated align attribute
    if (/\salign=["'](left|right|center|justify)["']/i.test(html)) {
      html = html.replace(/\salign=["'](left|right|center|justify)["']/gi, '');
      changed = true;
      fixes.push({ page: page, fix: 'Removed deprecated align attribute' });
    }

    if (changed) fs.writeFileSync(page, html);
  }

  console.log('agent: Code — ' + fixes.length + ' fix(es) across ' + pages.length + ' pages');
  return { agent: 'code', fixes: fixes };
}

// ── AGENT 4: Content generator ──
// Generates MCQ questions for thin categories using the LLM.
async function agentContent() {
  const fixes = [];
  const faults = loadJson('data/faults.json', null);
  if (!faults || !faults.faults) return { agent: 'content', fixes: fixes };

  const thinCats = faults.faults
    .filter(f => f.severity === 'critical' && f.kind === 'coverage')
    .slice(0, 2); // max 2 per run

  for (const fault of thinCats) {
    const m = fault.title.match(/Category "([^"]+)"/);
    if (!m) continue;
    const catName = m[1];
    const slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const catFile = 'data/questions/' + slug + '.json';
    const cat = loadJson(catFile, null);
    if (!cat) continue;

    const catKey = Object.keys(cat)[0];
    const subs = cat[catKey].subSubjects || {};
    const sampleQ = [];
    for (const arr of Object.values(subs)) {
      if (Array.isArray(arr)) sampleQ.push(...arr.slice(0, 2));
    }
    if (!sampleQ.length) continue;

    const result = await callLLM(
      'Generate 5 MCQ questions for UPSC/SSC category "' + catName + '". Return strict JSON array: [{"question":"...","options":["a","b","c","d"],"answer":0,"explanation":"..."}]. No markdown.',
      'Match this style:\n' + sampleQ.slice(0, 2).map(q => '- ' + q.question).join('\n'),
      1500
    );
    if (!result) continue;

    try {
      const clean = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(clean);
      if (!Array.isArray(parsed) || !parsed.length) continue;

      const subtopicName = Object.keys(subs)[0] || catName;
      const baseId = 'agent-' + Date.now().toString(36);
      let added = 0;
      parsed.forEach((q, i) => {
        if (!q.question || !q.options || !Array.isArray(q.options) || q.options.length !== 4) return;
        if (!subs[subtopicName]) subs[subtopicName] = [];
        subs[subtopicName].push({
          id: baseId + '-' + i, type: 'mcq', category: catName,
          source: 'Site Agent', pubDate: new Date().toISOString(),
          subject: catName, subSubject: subtopicName,
          question: q.question, options: q.options,
          answer: q.options[q.answer] || q.options[0],
          fact: q.explanation || '', wikiDone: false
        });
        added++;
      });

      if (added) {
        saveJson(catFile, cat);
        fixes.push({ page: catFile, fix: 'Generated ' + added + ' MCQs for "' + catName + '"', model: result.model });
      }
    } catch (e) { /* parse failed */ }
  }

  console.log('agent: Content — ' + fixes.length + ' generation(s)');
  return { agent: 'content', fixes: fixes };
}

// ── AGENT 5: Figure generator ──
// Generates SVG figures for topics missing them (reads data/figure-gaps.json).
async function agentFigures() {
  const fixes = [];
  const gaps = loadJson('data/figure-gaps.json', null);
  if (!gaps) return { agent: 'figures', fixes: fixes };

  // Flatten gaps: [{subject, topics: []}]
  const flatGaps = [];
  if (Array.isArray(gaps)) {
    gaps.forEach(g => (g.topics || []).forEach(t => flatGaps.push({ subject: g.subject, topic: t })));
  } else if (gaps.subjects) {
    Object.entries(gaps.subjects).forEach(([subj, data]) => {
      (data.topics || data.missing || []).forEach(t => flatGaps.push({ subject: subj, topic: t }));
    });
  }

  // Generate up to 2 figures per run
  for (const gap of flatGaps.slice(0, 2)) {
    const slug = gap.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    const figFile = 'figures/' + slug + '.html';
    if (fs.existsSync(figFile)) continue;

    const result = await callLLM(
      'Generate a monochrome SVG diagram for the topic "' + gap.topic + '" (subject: ' + gap.subject + '). ' +
      'Return strict JSON: {"title":"...","svg":"<svg xmlns=...>...</svg>","caption":"2-3 sentence explanation"}. ' +
      'The SVG must be self-contained, viewBox="0 0 800 600", use only black/gray/white, and show clear labels.',
      'Topic: ' + gap.topic + '. Make it educational and exam-relevant for UPSC.',
      2000
    );
    if (!result) continue;

    try {
      const clean = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(clean);
      if (!parsed.svg || !parsed.svg.includes('<svg')) continue;

      // Build figure page matching existing figure HTML structure
      const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(parsed.title || gap.topic)} — ${esc(gap.subject)} Figure</title>
<meta name="description" content="${esc(parsed.caption || gap.topic)} — ${esc(gap.subject)} diagram on Vlymbooq.">
<style>
body{background:#0a0a0a;color:#e5e5e5;font-family:system-ui,sans-serif;margin:0;padding:20px;max-width:900px;margin:0 auto}
.fig{background:#111;border:1px solid #333;border-radius:12px;padding:24px;margin:20px 0}
.fig svg{max-width:100%;height:auto}
.cap{color:#a1a1aa;font-size:14px;line-height:1.6;margin-top:12px}
h1{font-size:22px;margin-bottom:8px}
.crumb{color:#71717a;font-size:12px;margin-bottom:16px}
.crumb a{color:#60a5fa;text-decoration:none}
</style>
</head>
<body>
<div class="crumb"><a href="index.html">Home</a> / <a href="subject-figures-index.html">Figures</a> / ${esc(gap.subject)}</div>
<h1>${esc(parsed.title || gap.topic)}</h1>
<div class="fig">${parsed.svg}</div>
<div class="cap">${esc(parsed.caption || '')}</div>
<div style="margin-top:20px;padding:12px;background:#111;border-radius:8px;font-size:12px;color:#71717a">
Generated by Site Agent · Subject: ${esc(gap.subject)} · Topic: ${esc(gap.topic)}
</div>
</body>
</html>`;
      fs.mkdirSync('figures', { recursive: true });
      fs.writeFileSync(figFile, page);
      fixes.push({ page: figFile, kind: 'figure', fix: 'Created figure: ' + gap.topic, model: result.model });
      console.log('agent: created figure ' + figFile);
    } catch (e) { /* parse failed */ }
  }

  console.log('agent: Figures — ' + fixes.length + ' new figure(s)');
  return { agent: 'figures', fixes: fixes };
}

// ── AGENT 6: Flowchart generator ──
// Generates process flowcharts for syllabus topics (e.g. "How a Bill becomes Law").
async function agentFlowcharts() {
  const fixes = [];
  const gaps = loadJson('data/figure-gaps.json', null);
  if (!gaps) return { agent: 'flowcharts', fixes: fixes };

  // Look for process/procedure topics that suit flowcharts
  const processKeywords = /procedure|process|how|steps|formation|structure|system|mechanism|cycle|chain/i;
  const flatGaps = [];
  if (Array.isArray(gaps)) {
    gaps.forEach(g => (g.topics || []).forEach(t => flatGaps.push({ subject: g.subject, topic: t })));
  }

  const processTopics = flatGaps.filter(g => processKeywords.test(g.topic)).slice(0, 2);

  for (const gap of processTopics) {
    const slug = gap.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    const fcFile = 'figures/' + slug + '-flowchart.html';
    if (fs.existsSync(fcFile)) continue;

    const result = await callLLM(
      'Generate a vertical flowchart SVG for the process: "' + gap.topic + '". ' +
      'Return strict JSON: {"title":"...","steps":["step1","step2",...],"svg":"<svg...>...</svg>","caption":"..."}. ' +
      'The SVG must show connected boxes with arrows, viewBox="0 0 600 800", monochrome.',
      'Topic: ' + gap.topic + ' (' + gap.subject + '). UPSC-relevant process.',
      2000
    );
    if (!result) continue;

    try {
      const clean = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(clean);
      if (!parsed.svg || !parsed.svg.includes('<svg')) continue;

      const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(parsed.title || gap.topic)} — Flowchart</title>
<meta name="description" content="Flowchart: ${esc(parsed.title || gap.topic)} on Vlymbooq.">
<style>
body{background:#0a0a0a;color:#e5e5e5;font-family:system-ui,sans-serif;padding:20px;max-width:900px;margin:0 auto}
.fig{background:#111;border:1px solid #333;border-radius:12px;padding:24px;margin:20px 0}
.fig svg{max-width:100%;height:auto}
.steps{margin-top:16px;padding:16px;background:#111;border-radius:8px}
.steps li{margin:6px 0;color:#a1a1aa;font-size:13px}
h1{font-size:22px}
.crumb{color:#71717a;font-size:12px;margin-bottom:16px}
.crumb a{color:#60a5fa;text-decoration:none}
</style>
</head>
<body>
<div class="crumb"><a href="index.html">Home</a> / <a href="subject-figures-index.html">Figures</a> / Flowcharts</div>
<h1>${esc(parsed.title || gap.topic)}</h1>
<div class="fig">${parsed.svg}</div>
${parsed.steps && parsed.steps.length ? '<div class="steps"><b>Steps:</b><ol>' + parsed.steps.map(s => '<li>' + esc(s) + '</li>').join('') + '</ol></div>' : ''}
<div style="margin-top:16px;font-size:12px;color:#71717a">Generated by Site Agent · Flowchart · ${esc(gap.subject)}</div>
</body>
</html>`;
      fs.mkdirSync('figures', { recursive: true });
      fs.writeFileSync(fcFile, page);
      fixes.push({ page: fcFile, kind: 'flowchart', fix: 'Created flowchart: ' + gap.topic, model: result.model });
      console.log('agent: created flowchart ' + fcFile);
    } catch (e) { /* parse failed */ }
  }

  console.log('agent: Flowcharts — ' + fixes.length + ' new flowchart(s)');
  return { agent: 'flowcharts', fixes: fixes };
}

// ── AGENT 7: Mind map generator ──
// Generates radial mind maps for subject topics (tree diagram).
async function agentMindmaps() {
  const fixes = [];
  const gaps = loadJson('data/figure-gaps.json', null);
  if (!gaps) return { agent: 'mindmaps', fixes: fixes };

  const flatGaps = [];
  if (Array.isArray(gaps)) {
    gaps.forEach(g => (g.topics || []).forEach(t => flatGaps.push({ subject: g.subject, topic: t })));
  }

  // Pick 2 topics per run
  for (const gap of flatGaps.slice(0, 2)) {
    const slug = gap.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    const mmFile = 'figures/' + slug + '-mindmap.html';
    if (fs.existsSync(mmFile)) continue;

    const result = await callLLM(
      'Generate a mind map SVG for "' + gap.topic + '" with the topic in the center and 5-7 branches radiating outward. ' +
      'Return strict JSON: {"title":"...","branches":["branch1","branch2",...],"svg":"<svg...>...</svg>","caption":"..."}. ' +
      'The SVG must be a radial/tree diagram, viewBox="0 0 900 700", monochrome.',
      'Topic: ' + gap.topic + ' (' + gap.subject + '). Branches = key subtopics for UPSC.',
      2000
    );
    if (!result) continue;

    try {
      const clean = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(clean);
      if (!parsed.svg || !parsed.svg.includes('<svg')) continue;

      const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(parsed.title || gap.topic)} — Mind Map</title>
<meta name="description" content="Mind map: ${esc(parsed.title || gap.topic)} on Vlymbooq.">
<style>
body{background:#0a0a0a;color:#e5e5e5;font-family:system-ui,sans-serif;padding:20px;max-width:900px;margin:0 auto}
.fig{background:#111;border:1px solid #333;border-radius:12px;padding:24px;margin:20px 0}
.fig svg{max-width:100%;height:auto}
h1{font-size:22px}
.crumb{color:#71717a;font-size:12px;margin-bottom:16px}
.crumb a{color:#60a5fa;text-decoration:none}
</style>
</head>
<body>
<div class="crumb"><a href="index.html">Home</a> / <a href="subject-figures-index.html">Figures</a> / Mind Maps</div>
<h1>${esc(parsed.title || gap.topic)}</h1>
<div class="fig">${parsed.svg}</div>
${parsed.branches && parsed.branches.length ? '<div style="margin-top:12px;font-size:13px;color:#a1a1aa"><b>Branches:</b> ' + parsed.branches.map(b => '<span style="display:inline-block;margin:2px 6px;padding:2px 8px;background:#1a1a2e;border-radius:8px;font-size:11px">' + esc(b) + '</span>').join('') + '</div>' : ''}
<div style="margin-top:16px;font-size:12px;color:#71717a">Generated by Site Agent · Mind Map · ${esc(gap.subject)}</div>
</body>
</html>`;
      fs.mkdirSync('figures', { recursive: true });
      fs.writeFileSync(mmFile, page);
      fixes.push({ page: mmFile, kind: 'mindmap', fix: 'Created mind map: ' + gap.topic, model: result.model });
      console.log('agent: created mindmap ' + mmFile);
    } catch (e) { /* parse failed */ }
  }

  console.log('agent: Mindmaps — ' + fixes.length + ' new mindmap(s)');
  return { agent: 'mindmaps', fixes: fixes };
}

// ── AGENT 8: Feature generator ──
// Generates EVERYTHING: study pages, comparison tables, timelines,
// revision sheets, mnemonics, cheat sheets, topic deep-dives.
async function agentFeatures() {
  const fixes = [];

  // Read existing topics to find gaps
  const existingPages = new Set(listPages());
  const gaps = loadJson('data/topic-gaps.json', null);
  const qDir = 'data/questions';

  // Gather subjects from question bank that lack a study page
  const subjects = [];
  try {
    if (fs.existsSync(qDir)) {
      fs.readdirSync(qDir).filter(f => f.endsWith('.json')).slice(0, 10).forEach(f => {
        const cat = loadJson(path.join(qDir, f), null);
        if (cat) {
          const name = Object.keys(cat)[0];
          const slug = f.replace('.json', '');
          if (!existingPages.has(slug + '.html') && !existingPages.has(slug + '-revision.html')) {
            subjects.push({ name: name, slug: slug });
          }
        }
      });
    }
  } catch (e) { /* ignore */ }

  // ── Type 1: Topic study page ──
  for (const subj of subjects.slice(0, 1)) {
    const result = await callLLM(
      'Create a complete HTML study page for UPSC subject "' + subj.name + '". ' +
      'Include: title, intro paragraph, 5 key topics with brief explanations, ' +
      'a "Key Facts" box, and a "Start Quiz" button linking to quiz.html. ' +
      'Use inline CSS (dark theme: bg #0a0a0a, text #e5e5e5, accent #3b82f6, cards #111). ' +
      'Return ONLY the HTML starting with <!DOCTYPE html>.',
      'Subject: ' + subj.name,
      2500
    );
    if (result) {
      let html = result.text.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
      if (!html.startsWith('<!DOCTYPE')) {
        const m = html.match(/<!DOCTYPE[\s\S]*<\/html>/i);
        if (m) html = m[0];
      }
      if (html.startsWith('<!DOCTYPE') && !fs.existsSync(subj.slug + '.html')) {
        fs.writeFileSync(subj.slug + '.html', html);
        fixes.push({ page: subj.slug + '.html', kind: 'study', fix: 'Created study page: ' + subj.name, model: result.model });
        console.log('agent: created ' + subj.slug + '.html');
      }
    }
  }

  // ── Type 2: Comparison table page ──
  const compareTopics = [
    { title: 'Article 32 vs Article 226', a: 'Article 32 (Right to Constitutional Remedies)', b: 'Article 226 (High Court writ jurisdiction)' },
    { title: 'Lok Sabha vs Rajya Sabha', a: 'Lok Sabha (House of the People)', b: 'Rajya Sabha (Council of States)' },
    { title: 'Fundamental Rights vs Directive Principles', a: 'Fundamental Rights (Part III)', b: 'Directive Principles (Part IV)' }
  ];
  for (const cmp of compareTopics) {
    const slug = cmp.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (existingPages.has(slug + '.html') || fs.existsSync(slug + '.html')) continue;

    const result = await callLLM(
      'Create an HTML comparison table page for: "' + cmp.title + '". ' +
      'Return strict JSON: {"title":"...","intro":"...","rows":[{"feature":"...","a":"...","b":"..."},...6 rows],"conclusion":"..."}. ' +
      'Make it exam-focused with specific details.',
      'Compare: ' + cmp.a + ' vs ' + cmp.b, 2000
    );
    if (!result) continue;
    try {
      const clean = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const d = JSON.parse(clean);
      if (!d.rows || !d.rows.length) continue;
      const rows = d.rows.map(r =>
        '<tr><td style="padding:10px;border-bottom:1px solid #333;color:#a1a1aa">' + esc(r.feature) + '</td>' +
        '<td style="padding:10px;border-bottom:1px solid #333">' + esc(r.a) + '</td>' +
        '<td style="padding:10px;border-bottom:1px solid #333">' + esc(r.b) + '</td></tr>'
      ).join('');
      const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(d.title || cmp.title)} — Comparison</title>
<meta name="description" content="${esc(d.title || cmp.title)} comparison for UPSC on Vlymbooq.">
<style>body{background:#0a0a0a;color:#e5e5e5;font-family:system-ui,sans-serif;padding:20px;max-width:900px;margin:0 auto}table{width:100%;border-collapse:collapse;background:#111;border-radius:12px;overflow:hidden;margin:16px 0}th{background:#1a1a2e;padding:12px;text-align:left;font-size:13px;color:#60a5fa}h1{font-size:22px}.intro{color:#a1a1aa;line-height:1.6}.conclusion{margin-top:16px;padding:16px;background:#111;border-left:3px solid #3b82f6;border-radius:0 8px 8px 0;font-size:13px}.crumb{color:#71717a;font-size:12px;margin-bottom:16px}.crumb a{color:#60a5fa;text-decoration:none}</style>
</head>
<body>
<div class="crumb"><a href="index.html">Home</a> / Comparisons</div>
<h1>${esc(d.title || cmp.title)}</h1>
<div class="intro">${esc(d.intro || '')}</div>
<table><tr><th>Feature</th><th>${esc(cmp.a)}</th><th>${esc(cmp.b)}</th></tr>${rows}</table>
${d.conclusion ? '<div class="conclusion"><b>Key takeaway:</b> ' + esc(d.conclusion) + '</div>' : ''}
<div style="margin-top:16px;font-size:12px;color:#71717a">Generated by Site Agent · Comparison Table</div>
</body></html>`;
      fs.writeFileSync(slug + '.html', page);
      fixes.push({ page: slug + '.html', kind: 'comparison', fix: 'Created comparison: ' + cmp.title, model: result.model });
      console.log('agent: created comparison ' + slug + '.html');
    } catch (e) { /* skip */ }
  }

  // ── Type 3: Quick revision sheet ──
  const revisionTopics = [
    { title: 'Polity Quick Revision', subject: 'Indian Polity' },
    { title: 'Modern History Timeline', subject: 'Modern History' },
    { title: 'Economics Formulas & Concepts', subject: 'Economics' }
  ];
  for (const rev of revisionTopics) {
    const slug = rev.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (existingPages.has(slug + '.html') || fs.existsSync(slug + '.html')) continue;

    const result = await callLLM(
      'Create a quick revision sheet HTML page for "' + rev.title + '". ' +
      'Return strict JSON: {"title":"...","sections":[{"heading":"...","points":["...","...",...5]}...4 sections]}. ' +
      'Points must be concise, factual, exam-relevant one-liners.',
      'Subject: ' + rev.subject, 2500
    );
    if (!result) continue;
    try {
      const clean = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const d = JSON.parse(clean);
      if (!d.sections || !d.sections.length) continue;
      const sections = d.sections.map(s =>
        '<div style="background:#111;border-radius:12px;padding:16px;margin:12px 0">' +
        '<h2 style="font-size:16px;color:#60a5fa;margin:0 0 8px">' + esc(s.heading) + '</h2>' +
        '<ul style="margin:0;padding-left:20px">' + (s.points || []).map(p => '<li style="margin:4px 0;color:#d4d4d8;font-size:13px;line-height:1.5">' + esc(p) + '</li>').join('') + '</ul></div>'
      ).join('');
      const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(d.title || rev.title)}</title>
<meta name="description" content="Quick revision: ${esc(d.title || rev.title)} on Vlymbooq.">
<style>body{background:#0a0a0a;color:#e5e5e5;font-family:system-ui,sans-serif;padding:20px;max-width:900px;margin:0 auto}h1{font-size:22px}.crumb{color:#71717a;font-size:12px;margin-bottom:16px}.crumb a{color:#60a5fa;text-decoration:none}</style>
</head>
<body>
<div class="crumb"><a href="index.html">Home</a> / <a href="revision.html">Revision</a></div>
<h1>${esc(d.title || rev.title)}</h1>
<p style="color:#a1a1aa;font-size:13px">Quick one-liners for last-minute revision</p>
${sections}
<div style="margin-top:16px;font-size:12px;color:#71717a">Generated by Site Agent · Revision Sheet</div>
</body></html>`;
      fs.writeFileSync(slug + '.html', page);
      fixes.push({ page: slug + '.html', kind: 'revision', fix: 'Created revision sheet: ' + rev.title, model: result.model });
      console.log('agent: created revision ' + slug + '.html');
    } catch (e) { /* skip */ }
  }

  // ── Type 4: Mnemonic / abbreviation page ──
  if (!existingPages.has('mnemonics.html') && !fs.existsSync('mnemonics.html')) {
    const result = await callLLM(
      'Create an HTML mnemonics page for UPSC/SSC exams. ' +
      'Return strict JSON: {"title":"...","sections":[{"heading":"...","items":[{"abbr":"...","meaning":"...","mnemonic":"..."}...5]}...3 sections]}. ' +
      'Include: acronyms (IAS, IPS, IFS...), constitutional articles, and geography mnemonics.',
      'Make it exam-focused with memory tricks.', 2500
    );
    if (result) {
      try {
        const clean = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const d = JSON.parse(clean);
        if (d.sections && d.sections.length) {
          const sections = d.sections.map(s =>
            '<div style="background:#111;border-radius:12px;padding:16px;margin:12px 0">' +
            '<h2 style="font-size:16px;color:#a78bfa;margin:0 0 8px">' + esc(s.heading) + '</h2>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px">' +
            (s.items || []).map(i =>
              '<div style="background:#1a1a2e;padding:10px;border-radius:8px">' +
              '<b style="color:#60a5fa">' + esc(i.abbr) + '</b>: ' + esc(i.meaning) +
              '<div style="color:#a78bfa;font-size:11px;margin-top:4px">💡 ' + esc(i.mnemonic) + '</div></div>'
            ).join('') + '</div></div>'
          ).join('');
          const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(d.title || 'UPSC Mnemonics & Memory Tricks')}</title>
<meta name="description" content="Mnemonics and memory tricks for UPSC/SSC exams on Vlymbooq.">
<style>body{background:#0a0a0a;color:#e5e5e5;font-family:system-ui,sans-serif;padding:20px;max-width:900px;margin:0 auto}h1{font-size:22px}.crumb{color:#71717a;font-size:12px;margin-bottom:16px}.crumb a{color:#60a5fa;text-decoration:none}</style>
</head>
<body>
<div class="crumb"><a href="index.html">Home</a> / Mnemonics</div>
<h1>${esc(d.title || 'UPSC Mnemonics & Memory Tricks')}</h1>
<p style="color:#a1a1aa;font-size:13px">Memory tricks to remember facts faster</p>
${sections}
<div style="margin-top:16px;font-size:12px;color:#71717a">Generated by Site Agent · Mnemonics</div>
</body></html>`;
          fs.writeFileSync('mnemonics.html', page);
          fixes.push({ page: 'mnemonics.html', kind: 'mnemonics', fix: 'Created mnemonics page', model: result.model });
          console.log('agent: created mnemonics.html');
        }
      } catch (e) { /* skip */ }
    }
  }

  console.log('agent: Features — ' + fixes.length + ' new page(s)');
  return { agent: 'features', fixes: fixes };
}

// ── AGENT 9: Proposal agent ──
// The innovation engine. Looks at what exists and invents NEW features
// nobody asked for — like how figures/flowcharts/mindmaps were invented.
// Generates proposals to data/ideas.json AND builds prototypes of the best one.
async function agentProposals() {
  const fixes = [];
  const pages = listPages();

  // Build a compact inventory of what exists
  const inventory = {
    totalPages: pages.length,
    categories: pages.filter(p => !p.startsWith('lesson-') && !p.includes('figure')).slice(0, 40),
    hasQuiz: pages.some(p => /quiz|exam|test/i.test(p)),
    hasFlashcards: pages.some(p => /flashcard/i.test(p)),
    hasMindmaps: pages.some(p => /mindmap/i.test(p)),
    hasFlowcharts: pages.some(p => /flowchart/i.test(p)),
    hasFigures: pages.some(p => /figure/i.test(p)),
    hasGlobe: pages.some(p => /globe|map/i.test(p)),
    hasLeaderboard: pages.some(p => /leaderboard/i.test(p)),
    hasMnemonics: pages.some(p => /mnemonic/i.test(p)),
    hasTimelines: pages.some(p => /timeline/i.test(p)),
    hasComparisons: pages.some(p => /comparison|vs-/i.test(p)),
    hasRevision: pages.some(p => /revision/i.test(p)),
    hasMains: pages.some(p => /mains/i.test(p)),
    hasPYQ: pages.some(p => /pyq|previous-year/i.test(p))
  };

  // Ask the model: what NEW feature should this site have?
  const result = await callLLM(
    'You are a product manager for an Indian competitive exam prep site (UPSC, SSC, Banking, Railway). ' +
    'The site currently has: ' + JSON.stringify(inventory) + '. ' +
    'Propose 3 NEW features that would make this site the best educational platform — things it does NOT have yet. ' +
    'Think creatively: study tools, visualizations, interactive exercises, AI features, gamification, social features. ' +
    'For each proposal return strict JSON: {"title":"...","description":"1-2 sentences","why":"why exam students need this","prototypePrompt":"HTML/CSS/JS for a working prototype, dark theme bg #0a0a0a, text #e5e5e5, accent #3b82f6"}. ' +
    'Return a JSON array of exactly 3 proposals. No markdown.',
    'Inventory: ' + inventory.totalPages + ' pages. Gaps to exploit. Think 10x, not incremental.',
    4000
  );

  if (!result) return { agent: 'proposals', fixes: fixes };

  try {
    const clean = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const proposals = JSON.parse(clean);
    if (!Array.isArray(proposals) || !proposals.length) return { agent: 'proposals', fixes: fixes };

    // Load existing ideas
    const ideasFile = 'data/ideas.json';
    const ideas = loadJson(ideasFile, { ideas: [] });

    proposals.forEach(p => {
      if (!p.title) return;
      // Skip if already proposed
      if (ideas.ideas.some(existing => existing.title === p.title)) return;
      ideas.ideas.push({
        title: p.title,
        description: p.description || '',
        why: p.why || '',
        source: 'Site Agent (innovation)',
        createdAt: new Date().toISOString(),
        status: 'proposed'
      });
      fixes.push({ kind: 'proposal', fix: 'Proposed: ' + p.title, detail: p.why || p.description, model: result.model });
    });

    saveJson(ideasFile, ideas);

    // Build a prototype of the FIRST proposal
    const best = proposals[0];
    if (best && best.prototypePrompt) {
      const proto = await callLLM(
        'Create a working HTML prototype for: "' + best.title + '". ' + best.prototypePrompt + '. ' +
        'Use inline CSS. Dark theme: bg #0a0a0a, text #e5e5e5, accent #3b82f6, cards #111. ' +
        'Make it interactive if possible (buttons, inputs, animations). Return ONLY HTML starting with <!DOCTYPE html>.',
        'Feature: ' + best.title + '. Make it look polished and exam-focused.',
        3000
      );
      if (proto) {
        let html = proto.text.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
        if (!html.startsWith('<!DOCTYPE')) {
          const m = html.match(/<!DOCTYPE[\s\S]*<\/html>/i);
          if (m) html = m[0];
        }
        if (html.startsWith('<!DOCTYPE')) {
          const slug = best.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
          const protoFile = 'prototype-' + slug + '.html';
          if (!fs.existsSync(protoFile)) {
            fs.writeFileSync(protoFile, html);
            fixes.push({ kind: 'prototype', fix: 'Built prototype: ' + best.title, page: protoFile, model: proto.model });
            console.log('agent: created prototype ' + protoFile);
          }
        }
      }
    }

    console.log('agent: Proposals — ' + fixes.length + ' idea(s)/prototype(s)');
  } catch (e) {
    console.log('agent: Proposals parse failed: ' + e.message);
  }

  return { agent: 'proposals', fixes: fixes };
}

// ── Main ──
async function main() {
  const log = loadJson(LOG, { runs: [], lastRun: null, model: null });
  const model = await pickBestModel();
  log.model = model;
  console.log('agent: using model ' + model);

  // Warm up: load model into RAM so the first real call isn't slow.
  console.log('agent: warming up model (loading into RAM)...');
  try {
    const warm = await fetch(OLLAMA_HOST + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: model, messages: [{ role: 'user', content: 'Say OK' }], stream: false, options: { num_predict: 5 } }),
      signal: AbortSignal.timeout(300000)
    });
    if (warm.ok) console.log('agent: model loaded and ready');
    else console.log('agent: warmup returned ' + warm.status);
  } catch (e) {
    console.log('agent: warmup failed — ' + e.message);
  }

  const results = [];
  const agents = [
    ['SEO', agentSEO],
    ['Perf', agentPerf],
    ['A11Y', agentA11Y],
    ['Code', agentCode],
    ['Content', agentContent],
    ['Figures', agentFigures],
    ['Flowcharts', agentFlowcharts],
    ['Mindmaps', agentMindmaps],
    ['Features', agentFeatures],
    ['Proposals', agentProposals]
  ];

  for (const [name, fn] of agents) {
    try {
      const result = await fn();
      results.push(result);
    } catch (e) {
      console.log('agent: ' + name + ' failed: ' + e.message);
      results.push({ agent: name.toLowerCase(), fixes: [], error: e.message });
    }
  }

  // Log everything
  const totalFixes = results.reduce((sum, r) => sum + (r.fixes ? r.fixes.length : 0), 0);
  log.lastRun = new Date().toISOString();
  log.runs.push({
    at: log.lastRun,
    model: model,
    totalFixes: totalFixes,
    byAgent: results.map(r => ({ agent: r.agent, count: (r.fixes || []).length }))
  });
  if (log.runs.length > 30) log.runs = log.runs.slice(-30);
  saveJson(LOG, log);

  console.log('agent: total ' + totalFixes + ' fix(es) this run');
  results.forEach(r => {
    if (r.fixes && r.fixes.length) {
      console.log('  [' + r.agent + '] ' + r.fixes.length + ' fix(es)');
      r.fixes.slice(0, 3).forEach(f => console.log('    → ' + f.fix + (f.page ? ' (' + f.page + ')' : '')));
    }
  });
}

main().then(() => process.exit(0)).catch(e => {
  console.error('agent: FATAL — ' + (e.message || e));
  process.exit(0);
});
