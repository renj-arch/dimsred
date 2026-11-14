// Deep-rewrite lane: each run takes one (or, with DEEP_BATCH, several)
// lesson(s) from data/deep-rewrite-queue.json, asks the local model for new
// exam-level sections, splices them into the lesson HTML before the practice
// block, and writes the queue back (finished items removed).
//
// Local-only: talks to Ollama on the runner. No external APIs.
const fs = require('fs');
const path = require('path');
const { callLLM } = require('./lib/ollama');
const handwritten = require('./lib/handwritten');

const ROOT = path.resolve(__dirname, '..');
const QUEUE = path.join(ROOT, 'data', 'deep-rewrite-queue.json');
const MAX_SECTIONS = parseInt(process.env.DEEP_MAX_SECTIONS || '4', 10);
const MARKER = '<!-- deep-rewrite';

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

function buildPrompt(info, focus, startId) {
  const existing = info.heads.map(h => '- ' + h).join('\n');
  return [
    'You are an expert UPSC examiner and teacher writing course material.',
    'The lesson "' + info.title + '"' + (focus ? ' needs deeper coverage of: ' + focus + '.' : '') +
      ' It already has these sections - do NOT repeat them:',
    existing || '(none listed)',
    '',
    'Write ' + MAX_SECTIONS + ' NEW sections that add genuine depth: more detail, worked examples, data, constitutional provisions, schemes, committees, maps-to-remember, or examiner traps - whichever fits the topic.',
    'Rules:',
    '- Output ONLY HTML fragments: <h2 id="deep-N">...</h2> followed by <h3>, <p>, <ul><li>, <table>, and optionally <div class="example-box"> or <div class="tip-box"> blocks.',
    '- Number section headings continuing the lesson style: use ids deep-' + startId + ', deep-' + (startId + 1) + ', ...',
    '- Total output ~1200-2000 words. Dense, factual, exam-relevant.',
    '- NO invented facts, dates, quotes, or statistics. If unsure of a specific, keep it general.',
    '- No markdown fences, no commentary, no <html>/<body> tags.'
  ].join('\n');
}

// Teaching the model to number its own sections is unreliable, and re-running a
// lesson that was spliced earlier would emit a second id="deep-1" - duplicate
// ids are invalid HTML and break in-page anchors. So ignore whatever numbers
// the model used and renumber every distinct id sequentially, consistently for
// both id="deep-N" and href="#deep-N".
function maxDeepId(html) {
  let max = 0;
  const re = /id="deep-(\d+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) max = Math.max(max, parseInt(m[1], 10));
  return max;
}

function renumberDeepIds(frag, startId) {
  let next = startId;
  const map = Object.create(null);
  return frag.replace(/(id="|href="#)deep-(\d+)/g, function (all, prefix, n) {
    if (!map[n]) map[n] = next++;
    return prefix + 'deep-' + map[n];
  });
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
  // Last resort: before the closing </div> of lesson-body - find practice script
  const s = html.indexOf('var practiceQs');
  if (s !== -1) {
    const before = html.lastIndexOf('</div>', s);
    return before === -1 ? s : before;
  }
  return -1;
}

// Pure with respect to the queue: this function never mutates it and never
// persists it. main() owns the queue so there is exactly one place that can
// remove an item. (The previous batch loop shifted here AND in main, so a
// missing file silently discarded the NEXT queue item too.)
async function rewriteOne(item) {
  const rel = item.file;
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) {
    console.log('deep-rewrite: missing file ' + rel + ' - dropping from queue');
    return 'dropped';
  }
  const info = lessonInfo(file);

  // A hand-written lesson is off-limits: splicing model sections into authored
  // prose despoils it, and the owner rejected machine-expanded content for these
  // pages. Drop it from the queue so the lane does not retry it every night.
  if (handwritten.isProtected(rel)) {
    console.log('deep-rewrite: ' + rel + ' is hand-written - dropping from queue');
    return 'dropped';
  }

  // A lesson that already carries the marker was spliced by an earlier run but
  // the queue write did not land. Re-running would duplicate the sections, so
  // drop it instead of deepening it twice.
  if (info.html.indexOf(MARKER) !== -1) {
    console.log('deep-rewrite: ' + rel + ' already deepened - dropping from queue');
    return 'dropped';
  }

  console.log('deep-rewrite: target ' + rel + ' - "' + info.title + '" (' + info.words + ' words, ' + info.heads.length + ' sections)');

  const startId = maxDeepId(info.html) + 1;
  const prompt = buildPrompt(info, item.focus || '', startId);
  const res = await callLLM([
    { role: 'system', content: 'You write precise, exam-grade study material. Output only the requested HTML fragments.' },
    { role: 'user', content: prompt }
  ], { numPredict: parseInt(process.env.DEEP_NUM_PREDICT || '5000', 10), temperature: 0.5, timeoutMs: 3000000 });

  let frag = (res.text || '').trim();
  frag = frag.replace(/^```[a-z]*\n?/i, '').replace(/\n?```\s*$/, '').trim();
  if (!/<h[23][^>]*>/.test(frag) || frag.length < 800) {
    console.log('deep-rewrite: model output unusable (' + frag.length + ' chars) - keeping queue item for retry');
    return 'failed';
  }
  frag = renumberDeepIds(frag, startId);

  const at = findSplicePoint(info.html);
  if (at === -1) {
    console.log('deep-rewrite: no splice point found in ' + rel);
    return 'failed';
  }
  const out = info.html.slice(0, at) + '\n' + MARKER + ' ' + new Date().toISOString().slice(0, 10) + ' -->\n' + frag + '\n\n' + info.html.slice(at);
  fs.writeFileSync(file, out);
  console.log('deep-rewrite: inserted ' + frag.length + ' chars into ' + rel);
  return 'done';
}

function positiveInt(raw, dflt) {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : dflt;
}

async function main() {
  const queue = loadJson(QUEUE, null);
  if (!Array.isArray(queue) || !queue.length) {
    console.log('deep-rewrite: queue empty or missing - nothing to do');
    return;
  }
  const batch = positiveInt(process.env.DEEP_BATCH, 1);
  let done = 0, dropped = 0, failed = 0;
  while (queue.length && done < batch) {
    const item = queue[0];
    let status;
    try {
      status = await rewriteOne(item);
    } catch (e) {
      console.log('deep-rewrite: ' + item.file + ' threw: ' + e.message);
      status = 'failed';
    }
    if (status === 'cheap-skip') { queue.shift(); continue; } // reserved
    if (status === 'failed') {
      failed++;
      break; // don't burn the whole batch on a broken item
    }
    // 'done' or 'dropped': this item is finished, so remove exactly one entry
    // and persist immediately. A crash mid-batch then never loses completed work.
    queue.shift();
    fs.writeFileSync(QUEUE, JSON.stringify(queue, null, 2) + '\n');
    if (status === 'done') done++; else dropped++;
  }
  fs.writeFileSync(QUEUE, JSON.stringify(queue, null, 2) + '\n');
  console.log('deep-rewrite: batch done - ' + done + ' rewritten, ' + dropped + ' dropped, ' +
    failed + ' failed, ' + queue.length + ' remain');
}

main().catch(function (e) { console.error('deep-rewrite failed:', e); process.exit(1); });