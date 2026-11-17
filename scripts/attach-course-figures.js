#!/usr/bin/env node
/**
 * attach-course-figures.js — put the inked figure library into the lessons.
 *
 * The 44 hand-drawn diagrams were reachable only from figures/index.html. Not
 * one lesson in the corpus linked to figures/svg-<id>.html, so a candidate who
 * read a lesson never saw the diagram that explains it. This script closes that
 * gap in the only place that survives regeneration: after a lesson is written.
 *
 * For each lesson it:
 *   1. scores the lesson title/slug against the figure library (id, title, tag);
 *   2. attaches the best figure when the score clears a floor;
 *   3. otherwise, with --invent, writes a new inked figure for that lesson
 *      (scripts/invent-figure.js) and attaches that;
 *   4. injects one idempotent <figure> block right after <div class="lesson-body">.
 *
 * The block inlines the SVG (so it cannot 404) and links to the figure's own
 * page. The marker comment means a second run never doubles it up.
 *
 *   node scripts/attach-course-figures.js --all --limit 40
 *   node scripts/attach-course-figures.js --file upsc/course/gs/lesson-x.html --invent
 *   node scripts/attach-course-figures.js --all --dry-run
 *   node scripts/attach-course-figures.js --all --check   # exit 1 if any lesson lacks one
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FIGLIB = require('./lib/upsc-svg-figures');
const store = require('./lib/figure-store');

const MARKER = /<!-- course-figure:([a-z0-9-]+) -->/;
const MIN_SCORE = 4;

function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}

function has(name) {
  return process.argv.indexOf('--' + name) !== -1;
}

function args(name) {
  const out = [];
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === '--' + name && i + 1 < process.argv.length) out.push(process.argv[i + 1]);
  }
  return out;
}

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/^lesson-.*\.html$/.test(entry.name)) out.push(full);
  }
  return out;
}

function lessons() {
  const explicit = args('file');
  if (explicit.length) return explicit.map((f) => path.resolve(ROOT, f));
  const from = arg('files-from');
  if (from && fs.existsSync(from)) {
    return fs.readFileSync(from, 'utf8').split(/\r?\n/).map((s) => s.trim())
      .filter(Boolean).map((f) => path.resolve(ROOT, f)).filter((f) => fs.existsSync(f));
  }
  const found = [];
  for (const exam of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!exam.isDirectory()) continue;
    const course = path.join(ROOT, exam.name, 'course');
    if (fs.existsSync(course)) walk(course, found);
  }
  return found.sort();
}

function textOf(html, re) {
  const m = html.match(re);
  return m ? String(m[1]).replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim() : '';
}

// Words that appear in half the corpus and therefore identify nothing. Without
// this list "ancient-india-figure" matched "World History: Modern" on the
// words india + history and put an Indus Valley timeline on a lesson about
// 1919.
const STOP = new Set(['india', 'indian', 'lesson', 'mains', 'gs1', 'gs2', 'gs3', 'gs4',
  'prelims', 'course', 'the', 'and', 'for', 'with', 'from', 'introduction', 'overview',
  'basics', 'advanced', 'part', 'general', 'studies', 'upsc', 'syllabus',
  'history', 'society', 'economy', 'polity', 'geography', 'environment', 'ethics']);

function words(s) {
  return String(s || '').toLowerCase().split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3 && !STOP.has(w));
}

// Two matching subject words beat one, and a match on the figure's own title
// beats a match on its broad tag. A figure is only attached when at least two
// distinctive tokens agree; otherwise the lesson gets its own invented figure.
function score(fig, lessonWords) {
  const titleWords = new Set(words(fig.id.replace(/-/g, ' ') + ' ' + fig.title));
  const tagWords = new Set(words(fig.tag));
  let n = 0;
  for (const w of titleWords) if (lessonWords.has(w)) n += 2;
  for (const w of tagWords) if (lessonWords.has(w)) n += 1;
  return n;
}

function bestFigure(lessonWords) {
  let best = null;
  let bestScore = 0;
  for (const fig of FIGLIB.FIGURES) {
    const s = score(fig, lessonWords);
    if (s > bestScore) { bestScore = s; best = fig; }
  }
  return bestScore >= MIN_SCORE ? { fig: best, score: bestScore } : null;
}

function relativeHref(fromFile, id) {
  const target = path.join(ROOT, 'figures', 'svg-' + id + '.html');
  const rel = path.relative(path.dirname(fromFile), target).replace(/\\/g, '/');
  return rel.startsWith('.') ? rel : './' + rel;
}

function figureBlock(fig, fromFile) {
  const svg = FIGLIB.svg({ id: 'lesson-' + fig.id, w: 760, h: 420, aria: fig.title, items: fig.items });
  const href = relativeHref(fromFile, fig.id);
  return [
    '<!-- course-figure:' + fig.id + ' -->',
    '<figure class="lesson-figure" data-figure="' + fig.id + '" style="margin:18px 0 22px;padding:14px;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:rgba(255,255,255,.03)">',
    '  <div style="background:#fbf7ec;border-radius:8px;padding:10px;overflow-x:auto">',
    '    ' + svg,
    '  </div>',
    '  <figcaption style="margin-top:10px;font-size:.82em;color:var(--text-sec,#c8ccd2)">',
    '    <strong>' + FIGLIB.esc(fig.title) + '</strong>' + (fig.intro ? ' — ' + FIGLIB.esc(fig.intro) : ''),
    '    &middot; <a href="' + href + '" style="color:var(--emerald,#34d399)">Open the full diagram &rarr;</a>',
    '  </figcaption>',
    '</figure>'
  ].join('\n');
}

function inject(html, block) {
  const anchor = /<div class="lesson-body">/i;
  if (anchor.test(html)) return html.replace(anchor, (m) => m + '\n' + block);
  // Hand-built pages have no .lesson-body wrapper: place it after the first h1.
  const h1 = /<\/h1>/i;
  if (h1.test(html)) return html.replace(h1, (m) => m + '\n' + block);
  return null;
}

async function inventFor(file, html) {
  const title = textOf(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i) || path.basename(file, '.html');
  // The slug comes from the lesson file without its extension: lesson-current-
  // affairs.html -> current-affairs-figure, not current-affairs-html-figure.
  const slug = store.kebab(path.basename(file, '.html').replace(/^lesson-/, ''));
  const id = slug + '-figure';
  if (store.ids().indexOf(id) !== -1) return store.get(id);
  const { execFileSync } = require('child_process');
  const cliArgs = [
    path.join(__dirname, 'invent-figure.js'),
    '--lesson', file,
    '--id', id,
    '--topic', title
  ];
  // Only override the paper/tag when the caller asked for one. Passing
  // defaults here forced every invented figure to GS1/Geography, which put a
  // "Constitutional Distribution of Legislative Powers" diagram in the GS1
  // Geography shelf.
  if (arg('paper')) cliArgs.push('--paper', arg('paper'));
  if (arg('tag')) cliArgs.push('--tag', arg('tag'));
  try {
    execFileSync(process.execPath, cliArgs, { cwd: ROOT, stdio: 'inherit' });
  } catch (e) {
    return null;
  }
  return store.get(id);
}

async function main() {
  const files = lessons();
  const limit = Number(arg('limit', '0')) || 0;
  const maxInvent = Number(arg('max-invent', '4'));
  const invent = has('invent');
  const check = has('check');
  const dry = has('dry-run');
  const force = has('force');

  let touched = 0;
  let invented = 0;
  let missing = 0;
  let attached = 0;
  const changed = [];

  for (const file of files) {
    if (limit && attached >= limit) break;
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    let html;
    try { html = fs.readFileSync(file, 'utf8'); } catch (e) { continue; }
    if (html.length < 4000) continue;              // hub or stub, not a lesson
    const already = html.match(MARKER);
    if (already && !force) continue;

    const lessonWords = new Set(words(rel + ' ' + textOf(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i)));
    let chosen = bestFigure(lessonWords);
    let fig = chosen ? chosen.fig : null;

    if (!fig && invent && invented < maxInvent) {
      fig = await inventFor(file, html);
      if (fig) invented++;
    }
    if (!fig) { missing++; continue; }

    if (!html.includes('<div class="lesson-body">') && !/<\/h1>/i.test(html)) { missing++; continue; }

    const block = figureBlock(fig, file);
    let next = html;
    if (already) {
      // Replace an existing block: match the marker through the closing figure.
      const re = new RegExp('<!-- course-figure:[a-z0-9-]+ -->[\\s\\S]*?</figure>');
      next = html.replace(re, block);
    } else {
      next = inject(html, block);
    }
    if (!next) { missing++; continue; }
    if (next === html) continue;

    if (check) {
      console.error('MISSING ' + rel);
      missing++;
      continue;
    }
    if (!dry) fs.writeFileSync(file, next, 'utf8');
    attached++;
    touched++;
    changed.push(rel);
    console.log((dry ? '[dry] ' : '') + rel + ' <- ' + fig.id + (chosen ? ' (score ' + chosen.score + ')' : ' (invented)'));
  }

  console.log('');
  console.log(`lessons scanned: ${files.length}`);
  console.log(`figures attached: ${attached}`);
  console.log(`figures invented: ${invented}`);
  console.log(`lessons left without a figure: ${missing}`);

  // The workflows stage the result. A pathspec like "*/course" does not match
  // upsc/course/... (verified: `git ls-files "*/course"` returns 0), which is
  // why the first CI run attached eight figures and published none of them.
  // Emit the exact list instead.
  const changedOut = arg('changed-out');
  if (changedOut && changed.length) {
    fs.writeFileSync(changedOut, changed.join('\n') + '\n', 'utf8');
    console.log('changed files written to ' + changedOut);
  }

  if (check && missing) process.exitCode = 1;
}

main().catch((e) => {
  console.error('FAIL ' + e.message);
  process.exitCode = 1;
});