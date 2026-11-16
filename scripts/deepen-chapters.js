'use strict';
// Chapter-level deepening: unlike expand-course.js (which works on whole-page
// word counts), this targets the SPECIFIC thin chapters that the chapter-depth
// audit reports, one chapter at a time, and asks the model to expand only that
// chapter. It writes into scripts/course-data.json and records the touched keys
// in scripts/.course-touched.json so the existing regenerate/guard/PR steps can
// publish a review pull request.
//
//   KEYS=mains-gs1/ancient-india CHAPTER_FLOOR=600 MAX_CHAPTERS=4 \
//     node scripts/deepen-chapters.js
//
// It never invents facts silently: the prompt forbids invented citations, and
// the citation guard in the workflow checks the regenerated pages afterwards.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'scripts', 'course-data.json');
const HAND = path.join(ROOT, 'data', 'handwritten-lessons.json');

const KEYS = (process.env.KEYS || '').split(',').map(s => s.trim()).filter(Boolean);
const FLOOR = parseInt(process.env.CHAPTER_FLOOR || '600', 10);
const MAX = parseInt(process.env.MAX_CHAPTERS || '4', 10);
const TARGET = parseInt(process.env.CHAPTER_TARGET || '750', 10);

if (!KEYS.length) { console.error('KEYS is required (comma-separated lesson keys)'); process.exit(2); }

const strip = s => String(s || '').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
const prose = h => strip(h).replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
const words = s => prose(s).split(/\s+/).filter(w => w.length > 1).length;

const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
let handwritten = [];
try { handwritten = JSON.parse(fs.readFileSync(HAND, 'utf8')).lessons || []; } catch (e) {}

const { callLLM } = require('./lib/ollama');

const SYSTEM = 'You are a senior editor of a UPSC Civil Services study course. ' +
  'You expand ONE existing chapter of a lesson with accurate, factual, exam-grade prose. ' +
  'Rules: (1) use only well-established, verifiable facts; (2) never invent case names, dates, ' +
  'Article numbers, committee names or statistics — if unsure of a specific figure, state it ' +
  'qualitatively instead; (3) do not repeat the existing text; (4) write plain, dense, neutral prose. ' +
  'Output ONLY HTML made of <h3> and <p> tags (and <ul><li> if a list helps). No preamble, no code fences.';

function sanitize(html) {
  let s = String(html || '').trim();
  s = s.replace(/^```[a-z]*\n?/i, '').replace(/```$/,'').trim();
  const i = s.indexOf('<h3');
  if (i > 0) s = s.slice(i);
  s = strip(s).replace(/<(\/?)(h3|h4|p|ul|ol|li|strong|em|b|i)\b[^>]*>/gi, '<$1$2>');
  s = s.replace(/<(?!\/?(h3|h4|p|ul|ol|li|strong|em|b|i)>)[^>]+>/g, '');
  return s.trim();
}

function insertBeforeNextH2(body, from, html) {
  const next = body.indexOf('<h2', from);
  if (next === -1) return body + '\n' + html;
  return body.slice(0, next) + html + '\n' + body.slice(next);
}

(async () => {
  const touchedKeys = [], touchedExams = new Set(), touchedFiles = [];
  for (const key of KEYS) {
    const slash = key.indexOf('/');
    const mod = key.slice(0, slash), slug = key.slice(slash + 1);
    const rel = 'upsc/course/' + mod + '/lesson-' + slug + '.html';
    if (handwritten.indexOf(rel) !== -1) { console.log('SKIP hand-written: ' + rel); continue; }
    const body = data[key];
    if (typeof body !== 'string') { console.log('SKIP unknown key: ' + key); continue; }

    // h2 chapters with their block word counts.
    const parts = body.split(/(<h2\b[^>]*>[\s\S]*?<\/h2>)/i);
    const chapters = [];
    for (let i = 1; i < parts.length; i += 2) {
      chapters.push({ headHtml: parts[i], title: prose(parts[i]), words: words(parts[i + 1] || ''), headAt: body.indexOf(parts[i]) });
    }
    const thin = chapters.filter(c => c.words < FLOOR).sort((a, b) => a.words - b.words).slice(0, MAX);
    if (!thin.length) { console.log('OK ' + key + ': no chapter under ' + FLOOR + ' words'); continue; }

    let newBody = data[key];
    let changed = false;
    for (const ch of thin) {
      const need = Math.max(200, TARGET - ch.words);
      const blockStart = newBody.indexOf(ch.headHtml);
      const blockEnd = newBody.indexOf('<h2', blockStart + ch.headHtml.length);
      const current = prose(newBody.slice(blockStart, blockEnd === -1 ? newBody.length : blockEnd));
      const prompt = 'Chapter heading: ' + ch.title + '\n\nExisting chapter text (' + ch.words + ' words):\n' + current +
        '\n\nAdd about ' + need + ' words of NEW subsections that deepen THIS chapter. Use 2 or 3 <h3> subsections. ' +
        'Do not restate the existing text. Output only the new HTML.';
      try {
        const res = await callLLM([{ role: 'system', content: SYSTEM }, { role: 'user', content: prompt }],
          { numPredict: 14000, temperature: 0.3, timeoutMs: 600000 });
        const raw = String((res && res.text) || '');
        if (/entire output budget on reasoning/i.test(raw)) { console.log('SKIP ' + key + ' / ' + ch.title + ': model spent its budget on reasoning'); continue; }
        const html = sanitize(raw);
        if (!html || words(html) < 60) { console.log('SKIP ' + key + ' / ' + ch.title + ': too little output (' + words(html) + 'w)'); continue; }
        newBody = insertBeforeNextH2(newBody, blockStart + ch.headHtml.length, html);
        changed = true;
        console.log('WROTE ' + key + ' / ' + ch.title + ' (was ' + ch.words + 'w, +' + words(html) + 'w)');
      } catch (e) {
        console.log('FAIL ' + key + ' / ' + ch.title + ': ' + e.message);
      }
    }
    if (changed) {
      data[key] = newBody;
      if (touchedKeys.indexOf(key) === -1) touchedKeys.push(key);
      touchedExams.add('upsc');
      if (touchedFiles.indexOf(rel) === -1) touchedFiles.push(rel);
    }
  }

  if (!touchedKeys.length) { console.log('nothing written this run'); process.exit(0); }
  fs.writeFileSync(DATA, JSON.stringify(data, null, 2) + '\n');
  fs.writeFileSync(path.join(ROOT, 'scripts', '.course-touched.json'),
    JSON.stringify({ keys: touchedKeys, exams: [...touchedExams], files: touchedFiles }, null, 2) + '\n');
  console.log('updated keys: ' + touchedKeys.join(', '));
})();
