#!/usr/bin/env node
/**
 * audit-lesson-facts.js — read lesson prose and flag claims that are wrong.
 *
 * The reader found this in a mains lesson:
 *
 *   "launched on 1 August 1920, coinciding with the first anniversary of the
 *    death of Bal Gangadhar Tilak"
 *
 * Tilak died on 1 August 1920, so that was the day of his death, not an
 * anniversary. One wrong word turns a correct paragraph into a trap, and there
 * is no way to find these by grep: the sentence is grammatical, the date is
 * right, only the relation between them is wrong.
 *
 * This reads a lesson the way a careful editor would and records every claim it
 * cannot stand behind, with the quote, the problem, and the correction. With
 * --apply it fixes the ones it is sure about, but only when the quote appears
 * verbatim, so a stale line can never be replaced by the wrong text.
 *
 *   node scripts/audit-lesson-facts.js --file upsc/course/mains-gs1/lesson-x.html
 *   node scripts/audit-lesson-facts.js --all --limit 20
 *   node scripts/audit-lesson-facts.js --all --limit 20 --apply
 *   node scripts/audit-lesson-facts.js --report data/fact-audit.json
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROUTES = {
  NVAPI: 'NVIDIA_API_KEY',
  GROQ: 'GROQ_API_KEY',
  OPENROUTER: 'OPENROUTER_API_KEY',
  GH_MODELS: 'GH_MODELS_TOKEN'
};
for (const flag of Object.keys(ROUTES)) {
  if (process.env[ROUTES[flag]] && process.env[flag] !== '0') process.env[flag] = '1';
}
const hosted = require('./lib/hosted');

const ROOT = path.resolve(__dirname, '..');

function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}
const has = (n) => process.argv.indexOf('--' + n) !== -1;

const LIMIT = parseInt(arg('limit', '0'), 10) || 0;
const APPLY = has('apply');
const REPORT = arg('report', 'data/fact-audit.json');
const PARAS_PER_CALL = parseInt(arg('chunk', '20'), 10) || 20;
// Stop before the job timeout and still publish what was read. The old lane
// wrote its report only after every lesson, so a 90-minute cancellation threw
// away the entire run - which is why the corpus never advanced past one file.
const DEADLINE_MIN = parseInt(process.env.AUDIT_DEADLINE_MIN || '75', 10) || 75;
const STATE = arg('state', 'data/fact-audit-state.json');

function loadJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(path.resolve(ROOT, file), 'utf8')); } catch (e) { return fallback; }
}
function saveJson(file, obj) {
  const p = path.resolve(ROOT, file);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 1) + '\n', 'utf8');
}

function walk(dir, out) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (const e of entries) {
    if (e.name === '.git' || e.name === 'node_modules' || e.name === 'data') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.name.endsWith('.html')) out.push(full);
  }
  return out;
}

// Prose only: the body paragraphs, not the contents list, nav, practice block or
// figure labels. Those carry no claims a reader can be misled by.
function lessonParagraphs(html) {
  const start = html.indexOf('<div class="lesson-body"');
  if (start === -1) return [];
  let body = html.slice(start);
  const endMarkers = ['id="practice-qs"', '<!-- lesson-nav -->', 'class="lesson-nav"'];
  for (const m of endMarkers) {
    const i = body.indexOf(m);
    if (i > 0) body = body.slice(0, i);
  }
  body = body.replace(/<div class="lesson-toc"[\s\S]*?<\/div>\s*<\/div>/g, '');
  body = body.replace(/<svg[\s\S]*?<\/svg>/g, ' ');
  body = body.replace(/<figcaption[\s\S]*?<\/figcaption>/g, ' ');

  const paras = [];
  const re = /<p[^>]*>([\s\S]*?)<\/p>/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const text = m[1].replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
    if (text.length < 120) continue;
    if (/^(this lesson|last updated|source)/i.test(text)) continue;
    paras.push(text);
  }
  return paras;
}

function extractJson(text) {
  const first = String(text || '').indexOf('{');
  if (first < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = first; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) { try { return JSON.parse(text.slice(first, i + 1)); } catch (e) { return null; } }
    }
  }
  return null;
}

const SYSTEM = 'You are a careful history, polity, geography and science editor for an Indian civil-services ' +
  'exam site. You are given numbered paragraphs from one lesson. Find statements that are factually WRONG: ' +
  'wrong dates, wrong attributions, wrong relations between two true facts ("the anniversary of a death on the ' +
  'day of the death"), wrong article numbers, wrong places, wrong orders of events, invented quotes or numbers. ' +
  'Do not report style, wording, simplification, or things that are debatable. Only report something when you ' +
  'are confident it is wrong, and only when you can state the correction precisely. ' +
  'Answer with JSON only: {"problems":[{"n":<paragraph number>,"quote":"<the exact wrong phrase, <=120 chars>",' +
  '"problem":"<what is wrong>","correction":"<the corrected phrase, same length or shorter>",' +
  '"confidence":"high|medium"}]} If there are none, answer {"problems":[]}.';

async function auditParagraphs(paras) {
  const user = paras.map((p, i) => '(' + (i + 1) + ') ' + p).join('\n\n');
  // The default hosted model is a reasoning model: at 2,500 tokens the hidden
  // deliberation consumed the whole budget and every call failed with
  // finish_reason=length, which is why the lane stalled on one lesson. 8,000
  // leaves room for the reasoning plus the small JSON answer.
  const text = await hosted.chat(SYSTEM, user, { numPredict: 8000, temperature: 0.1 });
  const json = extractJson(text);
  return json && Array.isArray(json.problems) ? json.problems : [];
}

// A single model pass is not evidence. It called the Ken-Betwa link
// "Madhya Pradesh only" and told the page it does not involve Uttar Pradesh -
// the project spans both states. Corrections are therefore checked by a second,
// independent call that sees only the quote, the claim and the proposed fix,
// and is told to reject anything it cannot confirm. Unverified claims are
// dropped (and never applied), even when the first pass called them
// high-confidence.
const VERIFY_SYSTEM = 'You are an independent fact-checker for an Indian civil-services exam site. ' +
  'A first reviewer says each numbered quotation is factually wrong and proposes a correction. ' +
  'Judge each one on your own knowledge - do not defer to the reviewer. ' +
  'Answer "agree": true ONLY when the original quotation is clearly wrong AND the proposed correction ' +
  'is accurate and would not itself introduce an error. If the original is right, if the correction is ' +
  'incomplete or misleading, or if the matter is debatable, answer "agree": false. ' +
  'Be strict: a missed error is cheaper than a false correction printed on the site. ' +
  'Answer with JSON only: {"verdicts":[{"n":<number>,"agree":true|false,"reason":"<=160 chars"}]}';

async function verifyProblems(problems) {
  if (!problems.length) return [];
  const list = problems.map(function (p, i) {
    return '(' + (i + 1) + ') QUOTE: ' + String(p.quote || '') +
      '\n    CLAIMED PROBLEM: ' + String(p.problem || '') +
      '\n    PROPOSED CORRECTION: ' + String(p.correction || '');
  }).join('\n\n');
  let json = null;
  try {
    const text = await hosted.chat(VERIFY_SYSTEM, list, { numPredict: 6000, temperature: 0 });
    json = extractJson(text);
  } catch (e) {
    console.error('  verifier failed - dropping ' + problems.length + ' unverified claim(s): ' + e.message);
    return [];
  }
  const verdicts = json && Array.isArray(json.verdicts) ? json.verdicts : [];
  const byNumber = {};
  verdicts.forEach(function (v) {
    if (v && v.n) byNumber[String(v.n)] = v;
  });
  return problems.filter(function (p, i) {
    const v = byNumber[String(i + 1)];
    if (!v || v.agree !== true) {
      if (v) console.log('  [disputed] "' + String(p.quote || '').slice(0, 70) + '" - ' + String(v.reason || 'not confirmed'));
      return false;
    }
    p.verified = true;
    p.verifierReason = String(v.reason || '').slice(0, 200);
    return true;
  });
}

function applyCorrection(file, quote, correction, problem) {
  const html = fs.readFileSync(file, 'utf8');
  if (!quote || !html.includes(quote)) return false;
  // A correction made by the model is marked on the page in green, with the
  // reason on hover, so a reader can see what changed and why. Silently
  // rewriting a lesson would make the site's own text unauditable.
  const safeTitle = String(problem || 'Corrected after a fact check').replace(/"/g, '&quot;');
  const marked = '<span class="model-fix" style="color:#34d399;border-bottom:1px dotted #34d399" ' +
    'title="' + safeTitle + '">' + correction + '</span>';
  fs.writeFileSync(file, html.split(quote).join(marked), 'utf8');
  applyToSource(quote, marked);
  // Source stores still get regenerated: a later expand pass can rebuild the
  // page from a different key and drop the fix (the CLAT static-GK correction
  // did exactly that). Record it for the deploy-time overlay, which rewrites
  // the quote on the final deploy tree whatever the generator did.
  recordCorrection(file, quote, correction, problem);
  return true;
}

function recordCorrection(file, quote, correction, problem) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const store = loadJson('data/fact-corrections.json', { corrections: [] });
  if (!Array.isArray(store.corrections)) store.corrections = [];
  store.corrections = store.corrections.filter((c) => !(c.file === rel && c.quote === quote));
  store.corrections.push({
    file: rel,
    quote,
    correction,
    problem: String(problem || '').slice(0, 300),
    appliedAt: new Date().toISOString()
  });
  store.updatedAt = new Date().toISOString();
  saveJson('data/fact-corrections.json', store);
}

// The page is the output; scripts/course-data.json and course-addons.json are
// the source the expanders regenerate pages from. Editing only the page means
// the very next expand pass silently drops the correction (observed on the
// Mauryan succession fix). Rewrite the same quote in the source stores so the
// corrected sentence survives every rebuild.
function applyToSource(quote, marked) {
  for (const rel of ['scripts/course-data.json', 'scripts/course-addons.json']) {
    const p = path.join(ROOT, rel);
    let doc;
    try { doc = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { continue; }
    let touched = 0;
    if (rel.endsWith('course-addons.json')) {
      for (const key of Object.keys(doc.keys || {})) {
        const entry = doc.keys[key];
        if (!entry || typeof entry.html !== 'string' || !entry.html.includes(quote)) continue;
        entry.html = entry.html.split(quote).join(marked);
        touched++;
      }
    } else {
      for (const key of Object.keys(doc)) {
        if (typeof doc[key] !== 'string' || !doc[key].includes(quote)) continue;
        doc[key] = doc[key].split(quote).join(marked);
        touched++;
      }
    }
    if (touched) {
      fs.writeFileSync(p, JSON.stringify(doc, null, 2) + '\n', 'utf8');
      console.log('  corrected in ' + rel + ' (' + touched + ' entr' + (touched === 1 ? 'y' : 'ies') + ')');
    }
  }
}

async function main() {
  if (!hosted.enabled()) {
    console.error('no model route: set NVIDIA_API_KEY / GROQ_API_KEY / GH_MODELS_TOKEN');
    process.exitCode = 1;
    return;
  }

  let files;
  if (has('file')) files = [path.resolve(arg('file'))];
  else files = walk(ROOT, [])
    .filter((f) => /\/course\/[^/]*\/lesson-[^/]*\.html$/i.test(f.replace(/\\/g, '/')))
    // The audit reads prose. A hub/index page or a bare derivation sheet has no
    // <div class="lesson-body">, so lessonParagraphs() returns [] and the lesson
    // can never be marked audited. Those files therefore stay at "never audited"
    // (timestamp 0) and the never-audited-first sort kept pushing them to the top
    // of the queue on EVERY run: the lane read 20 index pages, found no
    // paragraphs, and reported "audited 0 lesson(s)" forever while the real
    // corpus was never reached. Keep only files that actually carry a body.
    .filter((f) => {
      try { return fs.readFileSync(f, 'utf8').indexOf('<div class="lesson-body"') !== -1; }
      catch (e) { return false; }
    });

  // Least-recently-audited first. Without this the lane re-read the same first
  // N files every day, so the rest of the corpus was never reached.
  const state = loadJson(STATE, { lessons: {} });
  if (!state.lessons || typeof state.lessons !== 'object') state.lessons = {};
  const relOf = (f) => path.relative(ROOT, f).replace(/\\/g, '/');
  files.sort((a, b) => {
    const ra = relOf(a), rb = relOf(b);
    const ta = Date.parse(state.lessons[ra] || '') || 0;
    const tb = Date.parse(state.lessons[rb] || '') || 0;
    // A lesson that changed AFTER its last audit goes first: the expanders keep
    // adding sections, and those new claims have never been read. Only then do
    // we rotate through the untouched corpus, oldest audit first.
    let ma = 0, mb = 0;
    try { ma = fs.statSync(a).mtimeMs; } catch (e) {}
    try { mb = fs.statSync(b).mtimeMs; } catch (e) {}
    const ca = ma > ta + 60000 ? 0 : 1;
    const cb = mb > tb + 60000 ? 0 : 1;
    return ca - cb || ta - tb || ra.localeCompare(rb);
  });
  if (LIMIT) files = files.slice(0, LIMIT);

  const results = [];
  let audited = 0, flagged = 0, applied = 0, callsOk = 0, callsFail = 0;
  const startedAt = Date.now();
  let deadlineHit = false;

  function saveReport() {
    saveJson(REPORT, {
      generatedAt: new Date().toISOString(),
      lessonsAudited: audited,
      flagged,
      applied,
      modelCalls: callsOk,
      modelFailures: callsFail,
      deadlineHit,
      problems: results
    });
  }

  // One lesson at a time was ~5-10 minutes (the hosted model reasons before it
  // answers), so a 75-minute run could never cover 60 lessons. Three lessons in
  // flight, with larger paragraph chunks, is the difference between a sweep
  // that finishes over days and one that never leaves the letter 'a'.
  const WORKERS = Math.max(1, Math.min(6, parseInt(process.env.AUDIT_WORKERS || '3', 10) || 3));

  async function auditOne(file) {
    const rel = relOf(file);
    let html;
    try { html = fs.readFileSync(file, 'utf8'); } catch (e) { return; }
    const paras = lessonParagraphs(html);
    if (!paras.length) return;

    audited++;
    for (let i = 0; i < paras.length; i += PARAS_PER_CALL) {
      const chunk = paras.slice(i, i + PARAS_PER_CALL);
      let problems = [];
      try {
        problems = await auditParagraphs(chunk);
        callsOk++;
      } catch (e) {
        callsFail++;
        console.error('  ' + rel + ': model call failed - ' + e.message);
        continue;
      }
      // Nothing is published or applied on one model's word alone.
      problems = await verifyProblems(problems);
      for (const p of problems) {
        if (!p || !p.quote) continue;
        flagged++;
        const record = {
          file: rel,
          quote: String(p.quote).slice(0, 200),
          problem: String(p.problem || '').slice(0, 300),
          correction: String(p.correction || '').slice(0, 200),
          confidence: p.confidence === 'high' ? 'high' : 'medium',
          verified: true,
          verifierReason: p.verifierReason || ''
        };
        if (APPLY && record.confidence === 'high' && record.correction) {
          record.applied = applyCorrection(file, record.quote, record.correction, record.problem);
          if (record.applied) applied++;
        }
        results.push(record);
        console.log('  [' + record.confidence + '] ' + rel + '\n      "' + record.quote +
          '"\n      -> ' + record.problem + '\n      fix: ' + record.correction + (record.applied ? '  (applied)' : ''));
      }
    }
    // Mark this lesson done and publish immediately, so a cancellation keeps it.
    state.lessons[rel] = new Date().toISOString();
    saveJson(STATE, state);
    saveReport();
  }

  let next = 0;
  async function worker() {
    while (next < files.length) {
      if ((Date.now() - startedAt) / 60000 > DEADLINE_MIN) {
        if (!deadlineHit) {
          deadlineHit = true;
          console.log('\ndeadline ' + DEADLINE_MIN + 'min reached - publishing what was read; the next run continues from here');
        }
        return;
      }
      const file = files[next++];
      await auditOne(file);
    }
  }

  await Promise.all(Array.from({ length: WORKERS }, worker));

  saveReport();
  console.log('\naudited ' + audited + ' lesson(s): ' + flagged + ' claim(s) flagged, ' + applied + ' applied, ' +
    callsOk + ' call(s) ok, ' + callsFail + ' failed');
  console.log('report: ' + REPORT + (deadlineHit ? ' (deadline stop)' : ''));
  // Every route failing is not a clean audit; make the daily run visibly red
  // instead of publishing a report that only means "the model was unreachable".
  if (audited > 0 && callsOk === 0) {
    console.error('FAIL every model call failed - check the hosted route before trusting this report');
    process.exitCode = 1;
  }
}

main().catch((e) => { console.error('FAIL ' + e.message); process.exitCode = 1; });