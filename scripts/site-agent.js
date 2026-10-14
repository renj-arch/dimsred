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
const memory = require('./agent-memory');

// Seed initial rules from hard-won experience
memory.addRule('NEVER replace a dead link with href="#" — link to a real page or convert to plain text', 'Replacing with # broke the homepage navigation');
memory.addRule('Always check if a file exists before deleting or replacing references to it', 'Agent once removed working script references');
memory.addRule('When modifying exam card links, map to the correct exam page (UPSC→papers, SSC→ssc-je, science→science.html)', 'Agent linked all cards to the same page');
memory.addRule('NEVER load all 9GB of data/questions into memory — process files one at a time', 'Caused OOM crashes');
memory.addRule('When adding alt text to images, derive it from the filename, not random words', 'Agent once added gibberish alt text like "vlymbooq"');
memory.addRule('Check that Ollama server is running before calling it — start it if not', 'Agent calls failed because server was dead');
memory.addRule('Add timeout-minutes to all GitHub Actions jobs', 'Jobs were cancelled after 6h without timeout');
memory.addRule('Use NODE_OPTIONS=--max-old-space-size=4096 for node scripts processing large data', 'Prevents OOM on 7GB runner');

const LOG = 'data/agent-log.json';
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
let _llmFailCount = 0;
const LLM_MAX_FAILS = 3;

// ── Self-upgrading model selector ──
const MODEL_RANKING = [
  { ollama: 'qwen3.8:27b',              ramGB: 18, score: 90.3 },
  { ollama: 'nvidia/nemotron-nano-9b-v2', ramGB: 6,  score: 71.1 },
  { ollama: 'qwen3.5:9b',               ramGB: 6,  score: 65 },
  { ollama: 'qwen3.5:4b',               ramGB: 3.5, score: 55 },
  { ollama: 'qwen3.5:2b',               ramGB: 2,  score: 45 }
];

function availableRAM() {
  try {
    const os = require('os');
    return { totalGB: os.totalmem() / (1024 ** 3), freeGB: os.freemem() / (1024 ** 3) };
  } catch (e) { return { totalGB: 7, freeGB: 5 }; }
}

async function pickBestModel() {
  if (process.env.OLLAMA_MODEL) {
    console.log('agent: using model ' + process.env.OLLAMA_MODEL + ' (from env)');
    return process.env.OLLAMA_MODEL;
  }
  const ram = availableRAM();

  // Check which models are actually available (pulled)
  let available = [];
  try {
    const tagsRes = await fetch(OLLAMA_HOST + '/api/tags', { signal: AbortSignal.timeout(10000) });
    if (tagsRes.ok) {
      const tags = await tagsRes.json();
      available = (tags.models || []).map(m => m.name);
    }
  } catch (e) { /* server down */ }

  // Pick highest-scoring model that fits RAM AND is pulled
  for (const entry of MODEL_RANKING) {
    // Allow model if RAM is sufficient OR if swap exists (16GB swap on runner)
    const effectiveRAM = ram.totalGB + 16; // account for 16GB swap
    if (effectiveRAM >= entry.ramGB) {
      const isAvailable = available.some(a => a.startsWith(entry.ollama) || a.includes(entry.ollama));
      if (isAvailable || available.length === 0) {
        console.log('agent: selected model ' + entry.ollama + ' (score ' + entry.score + ', RAM ' + ram.totalGB.toFixed(1) + 'GB + 16GB swap)');
        return entry.ollama;
      }
    }
  }
  // Fallback: smallest model
  const fallback = MODEL_RANKING[MODEL_RANKING.length - 1];
  console.log('agent: fallback to ' + fallback.ollama);
  return fallback.ollama;
}

async function callLLM(system, user, maxTokens) {
  // Skip if LLM has failed too many times this cycle
  if (_llmFailCount >= LLM_MAX_FAILS) {
    console.log('agent: LLM skipped (failed ' + _llmFailCount + ' times this cycle)');
    return null;
  }
  const model = await pickBestModel();
  const lessons = memory.getLessonsPrompt();
  const fullSystem = lessons ? system + '\n\n' + lessons : system;

  // Health check: ensure Ollama is alive before each call
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // Check server health
      const health = await fetch(OLLAMA_HOST + '/api/tags', { signal: AbortSignal.timeout(10000) }).catch(() => null);
      if (!health || !health.ok) {
        console.log('agent: Ollama dead, restarting...');
        try { execSync('pkill -f "ollama serve" || true', { timeout: 5000 }); } catch (e) {}
        try { execSync('nohup ollama serve > /tmp/ollama.log 2>&1 &', { timeout: 5000, shell: '/bin/bash' }); } catch (e) {}
        await new Promise(r => setTimeout(r, 15000));
        // Wait for server
        for (let w = 0; w < 30; w++) {
          const h2 = await fetch(OLLAMA_HOST + '/api/tags', { signal: AbortSignal.timeout(5000) }).catch(() => null);
          if (h2 && h2.ok) break;
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      const res = await fetch(OLLAMA_HOST + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: fullSystem },
            { role: 'user', content: user }
          ],
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: maxTokens || 1024,
            num_ctx: 2048,
            num_thread: 2,
            num_batch: 256,
            use_mmap: true,
            num_gpu: 0
          }
        }),
        signal: AbortSignal.timeout(300000)
      });
      if (res.ok) {
        const j = await res.json();
        const text = (j.message && j.message.content) || '';
        if (text.trim()) { _llmFailCount = 0; return { text: text.trim(), model: model }; }
      } else {
        console.log('agent: LLM returned ' + res.status);
      }
    } catch (e) {
      _llmFailCount++;
      console.log('agent: LLM attempt ' + attempt + ' failed: ' + e.message);
      if (attempt < 3) {
        // Kill and restart Ollama
        try { execSync('pkill -f "ollama serve" || true', { timeout: 5000 }); } catch (e2) {}
        try { execSync('nohup ollama serve > /tmp/ollama.log 2>&1 &', { timeout: 5000, shell: '/bin/bash' }); } catch (e2) {}
        await new Promise(r => setTimeout(r, 20000));
        for (let w = 0; w < 30; w++) {
          const h2 = await fetch(OLLAMA_HOST + '/api/tags', { signal: AbortSignal.timeout(5000) }).catch(() => null);
          if (h2 && h2.ok) break;
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
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
  try {
    fs.readdirSync('.', { withFileTypes: true }).forEach(d => {
      if (d.isDirectory()) existingFiles.add(d.name + '/');
    });
  } catch (e) { /* ignore */ }

  // Known page mapping for dead links — link to real pages instead of #
  const LINK_MAP = {
    'upsc.html': 'papers.html', 'cgl.html': 'ssc-je.html', 'rrb.html': 'ssc-je.html',
    'ibps.html': 'ssc-je.html', 'bank.html': 'ssc-je.html', 'neet.html': 'science.html',
    'jee.html': 'science.html', 'gate.html': 'polytechnic.html', 'nda.html': 'ssc-je.html',
    'cds.html': 'ssc-je.html', 'clat.html': 'papers.html', 'ctet.html': 'ssc-je.html',
    'ldc.html': 'ssc-je.html', 'aginveer.html': 'ssc-je.html', 'aginveer': 'ssc-je.html',
    'rbi.html': 'ssc-je.html', 'sbi.html': 'ssc-je.html', 'ssc-gd.html': 'ssc-je.html',
    'kerala-psc.html': 'ssc-je.html', 'police.html': 'ssc-je.html', ' army.html': 'ssc-je.html'
  };

  for (const page of pages) {
    let html = fs.readFileSync(page, 'utf8');
    let changed = false;

    // Fix dead links — map to real pages, DON'T use #
    const linkRegex = /href=["'](?!http|https|mailto|\/\/|data:)([^"']+\.html?)["']/gi;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      const target = match[1].split('#')[0].split('?')[0];
      if (!target || existingFiles.has(target) || fs.existsSync(target)) continue;
      const basename = target.split('/').pop().toLowerCase();
      const mapped = LINK_MAP[basename];
      if (mapped && fs.existsSync(mapped)) {
        html = html.replace(match[0], 'href="' + mapped + '"');
        changed = true;
        fixes.push({ page: page, fix: 'Redirected dead link ' + target + ' → ' + mapped });
      } else {
        // Convert <a> to <span> — keep text, remove broken navigation
        html = html.replace(
          new RegExp('<a\\s+href=["\']' + match[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["\'][^>]*>([^<]*)</a>', 'gi'),
          '<span style="cursor:default">$1</span>'
        );
        changed = true;
        fixes.push({ page: page, fix: 'Converted dead link to text: ' + target });
      }
    }

    // Detect placeholder href="#" on clickable exam cards — link to real exam pages
    if (page === 'index.html') {
      // Replace placeholder exam card links with real destinations
      const cardFixes = [
        { pattern: /<a href="#" class="exam-card purple tilt-card">/g, replace: '<a href="papers.html" class="exam-card purple tilt-card">', label: 'UPSC' },
        { pattern: /<a href="#" class="exam-card emerald tilt-card">/g, replace: '<a href="ssc-je.html" class="exam-card emerald tilt-card">', label: 'SSC' },
        { pattern: /<a href="#" class="exam-card blue tilt-card">/g, replace: '<a href="ssc-je.html" class="exam-card blue tilt-card">', label: 'Railway' },
        { pattern: /<a href="#" class="exam-card amber tilt-card">/g, replace: '<a href="ssc-je.html" class="exam-card amber tilt-card">', label: 'Banking' },
        { pattern: /<a href="#" class="exam-card rose tilt-card">/g, replace: '<a href="science.html" class="exam-card rose tilt-card">', label: 'Defence' }
      ];
      for (const cf of cardFixes) {
        if (cf.pattern.test(html)) {
          html = html.replace(cf.pattern, cf.replace);
          changed = true;
          fixes.push({ page: page, fix: 'Linked ' + cf.label + ' exam card to real page' });
        }
      }
      // Generic: replace any remaining # href on exam-cards with mega-test
      html = html.replace(/<a href="#" (class="exam-card[^"]*")>/g, '<a href="mega-test.html" $1>');
      // Fix nav placeholder links
      html = html.replace(/<a href="#">(UPSC|SSC GD|CGL|RBI|JEE|NEET|GATE|Agniveer|IBPS PO|SBI Clerk|LDC|CTET|Kerala PSC|NDA|CDS|CLAT)<\/a>/g,
        function(m, label) {
          const map = { 'UPSC': 'papers.html', 'SSC GD': 'ssc-je.html', 'CGL': 'ssc-je.html',
            'RBI': 'ssc-je.html', 'JEE': 'science.html', 'NEET': 'science.html', 'GATE': 'polytechnic.html',
            'Agniveer': 'ssc-je.html', 'IBPS PO': 'ssc-je.html', 'SBI Clerk': 'ssc-je.html',
            'LDC': 'ssc-je.html', 'CTET': 'ssc-je.html', 'Kerala PSC': 'ssc-je.html',
            'NDA': 'ssc-je.html', 'CDS': 'ssc-je.html', 'CLAT': 'papers.html' };
          var dest = map[label] || 'mega-test.html';
          changed = true;
          fixes.push({ page: page, fix: 'Linked nav "' + label + '" → ' + dest });
          return '<a href="' + dest + '">' + label + '</a>';
        });
    }

    // Remove deprecated align attribute
    if (/\salign=["'](left|right|center|justify)["']/i.test(html)) {
      html = html.replace(/\salign=["'](left|right|center|justify)["']/gi, '');
      changed = true;
      fixes.push({ page: page, fix: 'Removed deprecated align attribute' });
    }

    // Check for missing alt on images
    const imgNoAlt = html.match(/<img(?![^>]*\balt=)[^>]*>/gi);
    if (imgNoAlt && imgNoAlt.length > 0) {
      for (const img of imgNoAlt) {
        const srcMatch = img.match(/src=["']([^"']+)["']/i);
        const alt = srcMatch ? srcMatch[1].split('/').pop().replace(/\.\w+$/, '').replace(/[-_]/g, ' ') : 'image';
        html = html.replace(img, img.replace('<img', '<img alt="' + alt + '"'));
      }
      changed = true;
      fixes.push({ page: page, fix: 'Added alt to ' + imgNoAlt.length + ' images' });
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

// ── AGENT 10: Workflow agent ──
// Reads recent failed/cancelled GitHub Actions runs and proposes fixes.
// It cannot re-run workflows (no gh token in the script), but it can:
//   1. Detect OOM/timeout in workflows and suggest memory/time fixes
//   2. Detect broken syntax in scripts called by workflows
//   3. Add NODE_OPTIONS memory limits, timeouts to workflows
//   4. Fix common CI issues (missing files, wrong paths)
async function agentWorkflows() {
  const fixes = [];
  const wfDir = '.github/workflows';
  if (!fs.existsSync(wfDir)) return { agent: 'workflows', fixes: fixes };

  // Read recent failed workflow runs via gh CLI
  let recentFailures = '';
  try {
    recentFailures = require('child_process').execSync(
      'gh run list --limit 15 --json name,status,conclusion,displayTitle,databaseId --jq "."',
      { encoding: 'utf8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe'] }
    );
  } catch (e) { /* gh not available */ }

  const wfFiles = fs.readdirSync(wfDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));

  for (const wf of wfFiles) {
    const wfPath = path.join(wfDir, wf);
    let content = fs.readFileSync(wfPath, 'utf8');
    let changed = false;

    // Add timeout-minutes to jobs missing it
    if (!/timeout-minutes/.test(content) && /^jobs:/m.test(content)) {
      content = content.replace(/^(jobs:\s*\n(\s+)(\w+):)/gm, function (m, jobs, indent, name) {
        return jobs + '\n' + indent + '  timeout-minutes: 60';
      });
      changed = true;
      fixes.push({ page: wfPath, fix: 'Added timeout-minutes: 60' });
    }

    // Add NODE_OPTIONS memory limit to node steps
    if (/node scripts\//.test(content) && !/NODE_OPTIONS/.test(content)) {
      content = content.replace(
        /(\s+run:\s+)node (scripts\/[\w.-]+)/g,
        '$1NODE_OPTIONS=--max-old-space-size=4096 node $2'
      );
      changed = true;
      fixes.push({ page: wfPath, fix: 'Added memory limit to node steps' });
    }

    // Add retry to git push steps
    if (/git push/.test(content) && !/push --retries|for i in/.test(content)) {
      content = content.replace(/(git push)(?!\s*--retries)/g, 'git push --retries=3 --retry-delay=5');
      changed = true;
      fixes.push({ page: wfPath, fix: 'Added push retries' });
    }

    // If a workflow uses ollama but has no server start step, add it
    if (/ollama/.test(content) && !/Start Ollama|ollama serve/.test(content)) {
      content = content.replace(
        /(\s+- name: )(Install Ollama|Pull model)/,
        '$1Start Ollama server\n        run: |\n          nohup ollama serve > /tmp/ollama.log 2>&1 &\n          for i in $(seq 1 30); do curl -s http://localhost:11434/api/tags > /dev/null 2>&1 && break; sleep 1; done\n          echo "Ollama server ready"\n\n$1$2'
      );
      changed = true;
      fixes.push({ page: wfPath, fix: 'Added Ollama server start step' });
    }

    if (changed) fs.writeFileSync(wfPath, content);
  }

  // Check scripts for syntax errors
  try {
    const scripts = fs.readdirSync('scripts').filter(f => f.endsWith('.js'));
    for (const s of scripts) {
      try {
        require('child_process').execSync('node --check scripts/' + s, { stdio: 'pipe' });
      } catch (e) {
        fixes.push({ page: 'scripts/' + s, fix: 'SYNTAX ERROR: ' + String(e.stderr || e.message).slice(0, 100), kind: 'syntax' });
      }
    }
  } catch (e) { /* ignore */ }

  console.log('agent: Workflows — ' + fixes.length + ' fix(es)');
  return { agent: 'workflows', fixes: fixes };
}
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
    'You are a creative product designer for an Indian competitive exam prep site. ' +
    'The site currently has: ' + JSON.stringify(inventory) + '. ' +
    '' +
    'Think like a HUMAN innovator, not a checklist. Do NOT propose generic things ' +
    'like "add flashcards" or "add more quizzes" — those exist everywhere. ' +
    '' +
    'Instead, think about what would make a student say "WOW, I have never seen this before":' +
    '- What if the site could SIMULATE being an examiner and predict what questions come?' +
    '- What if mistakes could be traced to their ROOT CAUSE (weak concept vs careless) automatically?' +
    '- What if two students could COMPETE live on the same question?' +
    '- What if the site could generate a PERSONALIZED study plan from PYQ patterns?' +
    '- What if wrong answers triggered a MINI-LESSON on the exact concept missed?' +
    '- What if there was a MEMORY FORGETTING CURVE that resurfaces topics just before you forget them?' +
    '- What if the site could AUDIOSUMMARIZE topics for commute study?' +
    '- What if mistakes were mapped to a KNOWLEDGE GRAPH showing which weak topics block which other topics?' +
    '' +
    'Propose 3 genuinely novel features. Each must make a student think "I wish I had this earlier." ' +
    'Return strict JSON array: [{"title":"...","description":"1-2 sentences","why":"why this is novel and exam students need it","prototypePrompt":"detailed description for building a working prototype"}]. ' +
    'No markdown.',
    'Inventory: ' + inventory.totalPages + ' pages. Be CREATIVE. Invent, don\'t iterate.',
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

// ── AGENT: Question Quality (rule-based, no LLM needed) ──
// Arranges subtopics into correct categories, creates new ones if needed,
// and fixes poor questions (fill-in-the-blank) into proper Q&A.
async function agentQuestionQuality() {
  const fixes = [];
  const DIR = 'data/questions';
  if (!fs.existsSync(DIR)) return { agent: 'questions', fixes };

  // Category merge map — overlapping categories get consolidated
  const MERGE = {
    'Awards': 'Awards & Honours',
    'Defence': 'Defence & Security',
    'Ethics': 'Ethics & Integrity',
    'Polity': 'Polity & Governance',
    'Society': 'Indian Society',
    'Tech & Science': 'Science & Technology',
    'General': 'General Science',
    'Ancient India': 'Indian History',
    'Medieval & Modern India': 'Indian History',
    'Geography': 'Indian Geography',
    'PIB': 'PIB Releases',
    'Agricultural Engineering': 'Agriculture',
    'Agricultural Entomology': 'Agriculture',
    'Agricultural Extension & Marketing': 'Agriculture',
    'Agronomy & Crop Production': 'Agriculture',
    'Animal Husbandry & Dairy': 'Agriculture',
    'Farm Machinery': 'Agriculture',
    'Farm Machinery & Power': 'Agriculture',
    'Fisheries & Aquaculture': 'Agriculture',
    'Floriculture & Landscaping': 'Agriculture',
    'Food Processing': 'Agriculture',
    'Horticulture': 'Agriculture',
    'Horticulture - Fruit & Vegetable Production': 'Agriculture',
    'Hydrology & Soil Conservation': 'Agriculture',
    'Plant Breeding & Genetics': 'Agriculture',
    'Plant Pathology & Crop Protection': 'Agriculture',
    'Plant Physiology & Nutrition': 'Agriculture',
    'Seed Science & Technology': 'Agriculture',
    'Soil & Watershed': 'Agriculture',
    'Spices & Plantation Crops': 'Agriculture',
  };

  // Content-based recategorization rules
  const RULES = [
    { cat: 'Health', re: /health|hospital|medical|doctor|patient|disease|ayushman|medicine|vaccine|pharma|drug|nutrition|wellness|healthcare|ayush|dengue|malaria|tuberculosis|covid|ayurveda/i },
    { cat: 'Defence & Security', re: /defence|defense|army|navy|air force|drdo|military|soldier|border|missile|submarine|warship|terrorism|insurgency|coast guard|paramilitary|rafale|tejas/i },
    { cat: 'Education', re: /education|school|college|university|student|teacher|exam|scholarship|fellowship|ncert|nep|skill development|vocational|iit|iim|aiims/i },
    { cat: 'Agriculture', re: /agriculture|farmer|kisan|crop|food grain|wheat|rice|paddy|fertiliser|irrigation|soil health|msp|horticulture|dairy|fisher|animal husbandry/i },
    { cat: 'Energy', re: /energy|electricity|coal|oil|petroleum|natural gas|solar|wind|renewable|hydrogen|biofuel|ethanol|power project|power plant/i },
    { cat: 'Environment & Ecology', re: /environment|climate|forest|wildlife|pollution|ecology|emission|carbon|biodiversity|conservation|wetland|ganga|swachh/i },
    { cat: 'Indian Economy', re: /economy|economic|gdp|inflation|fiscal|monetary|budget|tax|gst|import|export|trade|investment|financial|banking|rbi|sebi/i },
    { cat: 'Infrastructure', re: /infrastructure|road|highway|railway|airport|port|metro|smart city|housing|urban|construction|bridge|tunnel/i },
    { cat: 'Science & Technology', re: /technology|digital|software|artificial intelligence|cyber|space|isro|satellite|rocket|semiconductor|electronics|science|research|nuclear|biotech|quantum/i },
    { cat: 'Polity & Governance', re: /law|justice|court|judicial|legal|constitution|supreme court|high court|legislation|parliament|lok sabha|rajya sabha/i },
    { cat: 'International Relations', re: /foreign|diplomatic|embassy|bilateral|multilateral|summit|united nations|un |nato|brics|g20/i },
    { cat: 'Sports', re: /sports|olympic|cricket|football|hockey|athlete|tournament|championship|medal|commonwealth/i },
    { cat: 'Art & Culture', re: /culture|heritage|monument|museum|festival|art|dance|music|literature|language|tourism/i },
    { cat: 'Indian History', re: /history|empire|dynasty|king|queen|battle|war|independence|freedom struggle|mahatma|gandhi|akbar|shah jahan|mughal|vedic/i },
    { cat: 'Indian Geography', re: /river|mountain|state|district|city|plateau|plain|coast|island|region|climate of india/i },
  ];

  // Poor question patterns to fix
  const POOR_PATTERNS = [
    /^Fill (in the )?blank/i,
    /^Fill blank/i,
    /^Fill in:/i,
    /^Fill:/i,
    /^The _____ was/i,
    /^_____ is a _____/i,
    / deals with _____/,
    / is the study of _____/,
  ];

  const files = fs.readdirSync(DIR).filter(f => f.endsWith('.json'));
  let mergedCount = 0, fixedQuestions = 0, processedFiles = 0;

  for (const file of files) {
    const fp = path.join(DIR, file);
    try {
      const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
      let fileChanged = false;

      for (const sk of Object.keys(data)) {
        if (!data[sk] || !data[sk].subSubjects) continue;
        const subs = data[sk].subSubjects;
        const newSubs = {};

        for (const sub of Object.keys(subs)) {
          let questions = subs[sub] || [];

          // Step 1: Merge overlapping categories
          let targetSub = MERGE[sub] || sub;

          // Step 2: Content-based recategorization if subtopic name is generic
          if (/^Announcements$|^General$|^Current Affairs$|^Misc/.test(sub)) {
            for (const rule of RULES) {
              const sample = questions.slice(0, 5).map(q => (q.question || '') + ' ' + (q.fact || '')).join(' ');
              if (rule.re.test(sample)) { targetSub = rule.cat; break; }
            }
          }

          // Step 3: Fix poor questions — convert fill-in-blank to proper Q&A
          for (const q of questions) {
            if (!q.question) continue;
            const isPoor = POOR_PATTERNS.some(p => p.test(q.question));
            if (isPoor && q.fact) {
              // Extract the fact as the proper Q&A
              const factClean = q.fact.replace(/\s+/g, ' ').trim();
              if (factClean.length > 30) {
                // Formulate a proper question from the fact
                const qMatch = factClean.match(/^(.+?)\s+(?:is|was|are|were)\s+(.+)$/);
                if (qMatch) {
                  q.question = 'What do you know about ' + qMatch[1].substring(0, 80) + '?';
                  q.answer = qMatch[2].substring(0, 120);
                } else {
                  q.question = 'Key facts: ' + factClean.substring(0, 100);
                  q.answer = factClean.substring(0, 150);
                }
                q.type = 'qa';
                delete q.options;
                fixedQuestions++;
                fileChanged = true;
              }
            }
            // Update subSubject field
            q.subSubject = targetSub;
          }

          if (!newSubs[targetSub]) newSubs[targetSub] = [];
          newSubs[targetSub] = newSubs[targetSub].concat(questions);

          if (targetSub !== sub) mergedCount++;
        }

        data[sk].subSubjects = newSubs;
      }

      if (fileChanged) {
        fs.writeFileSync(fp, JSON.stringify(data), 'utf8');
        processedFiles++;
      }
    } catch (e) { /* skip unreadable */ }
  }

  if (mergedCount > 0) fixes.push({ page: 'data/questions', fix: 'Merged ' + mergedCount + ' overlapping subtopics into correct categories' });
  if (fixedQuestions > 0) fixes.push({ page: 'data/questions', fix: 'Converted ' + fixedQuestions + ' fill-in-blank questions to proper Q&A' });
  if (processedFiles > 0) fixes.push({ page: 'data/questions', fix: 'Updated ' + processedFiles + ' question files' });

  return { agent: 'questions', fixes };
}

// ── Main ──
async function agentSelfCheck() {
  const fixes = [];
  const pages = listPages();

  const criticalFiles = [
    'index.html', 'ask.html', 'papers.html', 'mega-test.html',
    'improve.html', 'science.html', 'polytechnic.html', 'mental.html', 'ssc-je.html',
    'js/mental-training.js', 'scripts/lib/ask-core.js', 'scripts/lib/ask-llm.js',
    'data/papers.json', 'data/ask-index.json'
  ];
  for (const f of criticalFiles) {
    if (!fs.existsSync(f)) {
      fixes.push({ page: f, fix: 'CRITICAL FILE MISSING', kind: 'critical' });
    }
  }

  // Read browser test results and fix issues found
  const btPath = 'data/browser-test.json';
  if (fs.existsSync(btPath)) {
    try {
      const bt = JSON.parse(fs.readFileSync(btPath, 'utf8'));
      for (const issue of (bt.issues || [])) {
        if (issue.type === 'placeholder-link' && issue.page) {
          const pf = issue.page.split('/').pop() || issue.page;
          if (fs.existsSync(pf)) {
            let html = fs.readFileSync(pf, 'utf8');
            if (issue.detail && issue.detail.indexOf('"') !== -1) {
              const linkText = issue.detail.match(/"([^"]+)"/);
              if (linkText) {
                // Map link text to a real page
                const text = linkText[1].toLowerCase();
                let dest = 'mega-test.html';
                if (text.includes('upsc') || text.includes('paper')) dest = 'papers.html';
                else if (text.includes('ssc') || text.includes('je') || text.includes('cgl')) dest = 'ssc-je.html';
                else if (text.includes('science') || text.includes('jee') || text.includes('neet')) dest = 'science.html';
                else if (text.includes('poly') || text.includes('gate')) dest = 'polytechnic.html';
                // Find and fix the placeholder link with this text
                html = html.replace(
                  new RegExp('<a href="#"[^>]*>' + linkText[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '</a>', 'gi'),
                  '<a href="' + dest + '">' + linkText[1] + '</a>'
                );
                fs.writeFileSync(pf, html);
                fixes.push({ page: pf, fix: 'Browser-test: linked "' + linkText[1] + '" → ' + dest });
              }
            }
          }
        }
        if (issue.type === 'broken-link' && issue.page) {
          const pf = issue.page.split('/').pop() || issue.page;
          if (fs.existsSync(pf)) {
            let html = fs.readFileSync(pf, 'utf8');
            const target = issue.detail.replace(/^→\s+/, '').split(' ')[0];
            if (target && !fs.existsSync(target)) {
              // Remove the broken link
              html = html.replace(
                new RegExp('<a href="' + target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"[^>]*>([^<]*)</a>', 'gi'),
                '<span>$1</span>'
              );
              fs.writeFileSync(pf, html);
              fixes.push({ page: pf, fix: 'Browser-test: removed broken link → ' + target });
            }
          }
        }
        if (issue.type === 'js-error' || issue.type === 'console-error') {
          fixes.push({ page: issue.page || 'unknown', fix: 'Runtime: ' + issue.msg.substring(0, 100), kind: 'runtime' });
        }
      }
    } catch (e) { /* ignore */ }
  }

  for (const page of pages) {
    let html = fs.readFileSync(page, 'utf8');
    let changed = false;

    if (page === 'index.html') {
      const placeholders = (html.match(/<a href="#" class="exam-card/g) || []).length;
      if (placeholders > 0) {
        html = html.replace(/<a href="#" (class="exam-card[^"]*"[^>]*)>/g, '<a href="mega-test.html" $1>');
        changed = true;
        fixes.push({ page: page, fix: 'Fixed ' + placeholders + ' placeholder exam card links' });
      }
      const navPlaceholders = (html.match(/<a href="#">/g) || []).length;
      if (navPlaceholders > 0) {
        html = html.replace(/<a href="#">([A-Za-z\s]+)<\/a>/g, '<a href="mega-test.html">$1</a>');
        changed = true;
        fixes.push({ page: page, fix: 'Fixed ' + navPlaceholders + ' placeholder nav links' });
      }
    }

    const scriptRefs = html.match(/src=["'](js\/[^"']+\.js)["']/gi) || [];
    for (const ref of scriptRefs) {
      const file = ref.match(/src=["']([^"']+)["']/i)[1];
      if (!fs.existsSync(file)) {
        html = html.replace(ref, '');
        changed = true;
        fixes.push({ page: page, fix: 'Removed broken script ref ' + file });
      }
    }

    if (changed) fs.writeFileSync(page, html);
  }

  console.log('agent: SelfCheck — ' + fixes.length + ' issue(s)');
  return { agent: 'selfcheck', fixes: fixes };
}

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
      body: JSON.stringify({ model: model, messages: [{ role: 'user', content: 'Say OK' }], stream: false, options: { num_predict: 5, num_ctx: 256 } }),
      signal: AbortSignal.timeout(120000)
    });
    if (warm.ok) console.log('agent: model loaded and ready');
    else console.log('agent: warmup returned ' + warm.status);
  } catch (e) {
    console.log('agent: warmup failed — ' + e.message + ' (LLM agents will skip)');
  }

  const results = [];
  const agents = [
    ['Workflows', agentWorkflows],
    ['SelfCheck', agentSelfCheck],
    ['SEO', agentSEO],
    ['Perf', agentPerf],
    ['A11Y', agentA11Y],
    ['Code', agentCode],
    ['Questions', agentQuestionQuality],
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

  // Log everything — store full fix details so improve.html can show them
  const totalFixes = results.reduce((sum, r) => sum + (r.fixes ? r.fixes.length : 0), 0);
  log.lastRun = new Date().toISOString();
  log.runs.push({
    at: log.lastRun,
    model: model,
    totalFixes: totalFixes,
    byAgent: results.map(r => ({ agent: r.agent, count: (r.fixes || []).length })),
    details: results.filter(r => r.fixes && r.fixes.length).map(r => ({
      agent: r.agent,
      fixes: r.fixes.slice(0, 10) // cap at 10 per agent to keep log small
    }))
  });
  if (log.runs.length > 15) log.runs = log.runs.slice(-15); // keep last 15 runs
  saveJson(LOG, log);

  // Update agent memory
  memory.updateStats(totalFixes);
  if (totalFixes > 0) {
    memory.addWin('Cycle fixed ' + totalFixes + ' issues across ' + results.filter(r => r.fixes && r.fixes.length).length + ' agents', 'high');
  }

  // Record specific lessons from this run
  for (const r of results) {
    if (!r.fixes) continue;
    for (const f of r.fixes) {
      if (f.kind === 'critical') {
        memory.addLesson(f.page || 'unknown', f.fix, 'critical');
      }
      // Learn from successful link fixes
      if (f.fix && f.fix.includes('Linked') && f.fix.includes('→')) {
        memory.addLesson('dead-link:' + (f.page || ''), 'When a link is dead, map it to the correct destination page', 'info');
      }
    }
  }

  console.log('agent: total ' + totalFixes + ' fix(es) this run');
  results.forEach(r => {
    if (r.fixes && r.fixes.length) {
      console.log('  [' + r.agent + '] ' + r.fixes.length + ' fix(es)');
      r.fixes.slice(0, 3).forEach(f => console.log('    → ' + f.fix + (f.page ? ' (' + f.page + ')' : '')));
    }
  });

  return totalFixes;
}

// ── Continuous loop mode ──
const MAX_CYCLES = parseInt(process.env.AGENT_MAX_CYCLES || '6', 10);
const CYCLE_WAIT = parseInt(process.env.AGENT_CYCLE_WAIT || '300', 10);

async function runLoop() {
  console.log('agent: continuous loop — max ' + MAX_CYCLES + ' cycles, ' + CYCLE_WAIT + 's between');
  let totalAll = 0, idle = 0;

  for (let cycle = 1; cycle <= MAX_CYCLES; cycle++) {
    if (fs.existsSync('.agent-stop')) { console.log('agent: stop flag found'); break; }
    console.log('\n===== CYCLE ' + cycle + '/' + MAX_CYCLES + ' =====');
    const fixes = await main();
    totalAll += fixes;
    if (fixes === 0) { idle++; if (idle >= 3) { console.log('agent: 3 idle cycles — site clean, stopping'); break; } }
    else idle = 0;
    if (cycle < MAX_CYCLES) {
      console.log('agent: waiting ' + CYCLE_WAIT + 's...');
      await new Promise(r => setTimeout(r, CYCLE_WAIT * 1000));
    }
  }
  console.log('\nagent: loop complete — ' + totalAll + ' total fixes');
}

if (process.argv.includes('--loop')) {
  runLoop().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(0); });
} else {
  main().then(() => process.exit(0)).catch(e => {
    console.error('agent: FATAL — ' + (e.message || e));
    process.exit(0);
  });
}
