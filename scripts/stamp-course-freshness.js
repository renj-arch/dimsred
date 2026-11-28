#!/usr/bin/env node
/**
 * stamp-course-freshness.js — put "Updated <date> · N words · M sections" on
 * every course lesson.
 *
 * Runs on the deploy tree (slim-live), not against the repo, for the same
 * reason inject-course-addons.js does: one insertion point covers the generated
 * lessons and the hand-built ones, and no workflow has to rewrite 600 files to
 * keep a line current.
 *
 * Date precedence:
 *   1. data/course-freshness.json  (last commit that touched the file)
 *   2. course-versions.json        (date the generate lane last wrote it)
 *   3. course-depth.json           (date the deepen lane last appended)
 *   4. none — the line then shows size and section count only, which is still
 *      honest; it never claims a date it does not have.
 *
 *   node scripts/stamp-course-freshness.js .
 *   node scripts/stamp-course-freshness.js --check .
 */

'use strict';

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2).filter((a) => a !== '--check');
const ROOT = path.resolve(args[0] || '.');
const CHECK = process.argv.includes('--check');

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; }
}

const fresh = readJson(path.join(ROOT, 'data', 'course-freshness.json'), {});
const versions = (readJson(path.join(ROOT, 'scripts', 'course-versions.json'), {}) || {}).lessons || {};
const depth = (readJson(path.join(ROOT, 'scripts', 'course-depth.json'), {}) || {}).keys || {};

const MARK = '<!-- lesson-freshness -->';

function walk(dir, out) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/^lesson-.*\.html$/.test(e.name)) out.push(full);
  }
  return out;
}

function lessonKey(rel) {
  // upsc/course/gs/lesson-indian-history.html -> gs/indian-history
  const m = /(?:^|\/)([^/]+)\/lesson-(.+)\.html$/.exec(rel);
  return m ? m[1] + '/' + m[2] : rel;
}

function words(html) {
  const i = html.indexOf('<div class="lesson-body"');
  const body = i === -1 ? html : html.slice(i);
  const text = body
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  return text.split(/\s+/).filter(Boolean).length;
}

function pretty(date) {
  const d = new Date(date + (date.length === 10 ? 'T00:00:00Z' : ''));
  if (isNaN(d)) return String(date);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function line(rel, html) {
  const key = lessonKey(rel);
  const date = fresh[rel] ||
    (versions[key] && versions[key].updated) ||
    (depth[key] && depth[key].at) ||
    '';
  const w = words(html);
  const sections = (html.match(/<h2\b/g) || []).length;
  const bits = [];
  if (date) bits.push('Updated ' + pretty(String(date).slice(0, 10)));
  bits.push(w.toLocaleString('en-IN') + ' words');
  if (sections) bits.push(sections + ' sections');
  if (/course-figure:/.test(html)) bits.push('illustrated');
  return MARK + '<div style="margin:6px 0 18px;font-size:.76em;letter-spacing:.04em;color:var(--muted,#9aa0a6)">' +
    bits.join(' &#183; ') + '</div>';
}

const files = [];
for (const exam of fs.readdirSync(ROOT, { withFileTypes: true })) {
  if (!exam.isDirectory()) continue;
  const course = path.join(ROOT, exam.name, 'course');
  if (fs.existsSync(course)) walk(course, files);
}

let written = 0;
let skipped = 0;
for (const file of files) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  let html;
  try { html = fs.readFileSync(file, 'utf8'); } catch (e) { continue; }
  if (!/<h1/i.test(html)) { skipped++; continue; }

  const stamp = line(rel, html);
  let next;
  const existing = /<!-- lesson-freshness -->[\s\S]*?<\/div>/;
  if (existing.test(html)) {
    next = html.replace(existing, stamp);
  } else {
    // Right after the lesson's own h1.
    next = html.replace(/(<\/h1>)/i, '$1\n' + stamp);
  }
  if (next === html) { skipped++; continue; }
  if (CHECK) { console.log('STALE ' + rel); continue; }
  fs.writeFileSync(file, next, 'utf8');
  written++;
}

console.log('freshness: ' + written + ' stamped, ' + skipped + ' unchanged, ' + files.length + ' lessons');
if (CHECK && written) process.exitCode = 1;