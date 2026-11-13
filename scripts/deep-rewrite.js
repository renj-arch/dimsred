// Deep-rewrite lane: each run takes ONE lesson from
// data/deep-rewrite-queue.json, asks the local 27B model for new
// exam-level sections, splices them into the lesson HTML before the
// practice block, and writes the queue back (next item first).
//
// Local-only: talks to Ollama on the runner. No external APIs.
const fs = require('fs');
const path = require('path');
const { callLLM } = require('./lib/ollama');

const ROOT = path.resolve(__dirname, '..');
const QUEUE = path.join(ROOT, 'data', 'deep-rewrite-queue.json');
const MAX_SECTIONS = parseInt(process.env.DEEP_MAX_SECTIONS || '4', 10);

function loadJson(f, dflt) {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return dflt; }
}

function stripTags(html) {
  return html.replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function lessonInfo(file) {
  const html = fs.readFileSync(file, 'utf8');
  const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || path.basename(file);
  const title = stripTags(h1);
  const heads = [];
  const re = /<h[23][^>]*>([\s\S]*?)<\/h[23]>/g;
  let m;
  while ((m = re.exec(html)) !== null && heads.length < 40) heads.push(stripTags(m[1]));
  const words = stripTags(html).split(/\s+/).length;
  return { html, title, heads, words };
}

function buildPrompt(info, focus) {
  const existing = info.heads.map(h => '- ' + h).join('\n');
  return [
    'You are an expert UPSC examiner and teacher writing course material.',
    'The lesson "' + info.title + '"' + (focus ? ' needs deeper coverage of: ' + focus + '.' : '') +
      ' It already has these sections — do NOT repeat them:',
    existing || '(none listed)',
    '',
    'Write ' + MAX_SECTIONS + ' NEW sections that add genuine depth: more detail, worked examples, data, constitutional provisions, schemes, committees, maps-to-remember, or examiner traps — whichever fits the topic.',
    'Rules:',
    '- Output ONLY HTML fragments: <h2 id="deep-N">…</h2> followed by <h3>, <p>, <ul><li>, <table>, and optionally <div class="example-box"> or <div class="tip-box"> blocks.',
    '- Number section headings continuing the lesson style: use ids deep-1, deep-2, …',
    '- Total output ~1200–2000 words. Dense, factual, exam-relevant.',
    '- NO invented facts, dates, quotes, or statistics. If unsure of a specific, keep it general.',
    '- No markdown fences, no commentary, no <html>/<body> tags.'
  ].join('\n');
}

function findSplicePoint(html) {
  // Insert before the practice block. Prefer the explicit marker; fall back
  // to the practice-qs container or the end of lesson-body.
  const markers = [
    /<h3 style="margin-top:24px;margin-bottom:12px;font-size:1\.1em">Practice Questions<\/h3>/,
    /<h3[^>]*>Practice Questions<\/h3>/,
    /<div id="practice-qs"><\/div>/,
    /<\/div>\s*<h3 style="margin-top:24px/
  ];
  for (const re of markers) {
    const i = html.search(re);
    if (i !== -1) return i;
  }
  // Last resort: before the closing </div> of lesson-body — find practice script
  const s = html.indexOf('var practiceQs');
  if (s !== -1) {
    const before = html.lastIndexOf('</div>', s);
    return before === -1 ? s : before;
  }
  return -1;
}

async function main() {
  const queue = loadJson(QUEUE, null);
  if (!Array.isArray(queue) || !queue.length) {
    console.log('deep-rewrite: queue empty or missing — nothing to do');
    return;
  }
  const item = queue[0];
  const rel = item.file;
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) {
    console.log('deep-rewrite: missing file ' + rel + ' — dropping from queue');
    queue.shift();
    fs.writeFileSync(QUEUE, JSON.stringify(queue, null, 2) + '\n');
    return;
  }
  const info = lessonInfo(file);
  console.log('deep-rewrite: target ' + rel + ' — "' + info.title + '" (' + info.words + ' words, ' + info.heads.length + ' sections)');

  const prompt = buildPrompt(info, item.focus || '');
  const res = await callLLM([
    { role: 'system', content: 'You write precise, exam-grade study material. Output only the requested HTML fragments.' },
    { role: 'user', content: prompt }
  ], { numPredict: parseInt(process.env.DEEP_NUM_PREDICT || '5000', 10), temperature: 0.5, timeoutMs: 3000000 });

  let frag = (res.text || '').trim();
  // Strip fences if the model disobeyed.
  frag = frag.replace(/^```[a-z]*\n?/i, '').replace(/\n?```\s*$/, '').trim();
  // Require it to look like lesson HTML, not prose.
  if (!/<h[23][^>]*>/.test(frag) || frag.length < 800) {
    console.log('deep-rewrite: model output unusable (' + frag.length + ' chars) — keeping queue item for retry');
    process.exitCode = 1;
    return;
  }

  const at = findSplicePoint(info.html);
  if (at === -1) {
    console.log('deep-rewrite: no splice point found in ' + rel);
    process.exitCode = 1;
    return;
  }
  const out = info.html.slice(0, at) + '\n<!-- deep-rewrite ' + new Date().toISOString().slice(0, 10) + ' -->\n' + frag + '\n\n' + info.html.slice(at);
  fs.writeFileSync(file, out);

  queue.shift();
  fs.writeFileSync(QUEUE, JSON.stringify(queue, null, 2) + '\n');
  console.log('deep-rewrite: inserted ' + frag.length + ' chars into ' + rel + '; ' + queue.length + ' items remain');
}

main().catch(function (e) { console.error('deep-rewrite failed:', e); process.exit(1); });
