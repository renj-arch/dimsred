'use strict';
// Deterministic red-flag scan over published lesson HTML. This is a GATE, not a
// fact-checker: it catches the mechanically checkable defects that model-written
// prose produces — empty headings, impossible Article numbers, future dates,
// stacked duplicate paragraphs and unbalanced <div> tags. Anything it flags must
// be looked at by a human before the page is treated as done.
//
//   node scripts/citation-guard.js upsc/course/mains-gs3/lesson-infrastructure.html ...
//   node scripts/citation-guard.js --staged          # files staged in git
//
// Exit 1 if any flag is found, so a workflow step can fail the run.
const fs = require('fs');
const { execFileSync } = require('child_process');

// A plain Article number above 395 does not exist: the Constitution had 395
// original articles, and later insertions carry a letter suffix (21A, 31B,
// 239AA, 243ZG). A bare number above 395 is a defect to review.
const CURRENT_YEAR = new Date().getUTCFullYear();

function files() {
  const args = process.argv.slice(2);
  if (args[0] === '--staged') {
    const out = execFileSync('git', ['diff', '--cached', '--name-only'], { maxBuffer: 64 * 1024 * 1024 }).toString();
    return out.split('\n').map(s => s.trim()).filter(f => /\.html$/.test(f) && fs.existsSync(f));
  }
  return args.filter(f => fs.existsSync(f));
}

const prose = s => String(s || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();

let flags = 0;
function flag(file, what) { flags++; console.log('FLAG ' + file + ': ' + what); }

const list = files();
if (!list.length) { console.log('citation-guard: no files to scan'); process.exit(0); }

for (const f of list) {
  const html = fs.readFileSync(f, 'utf8');

  // 1. Empty or near-empty headings (a heading of punctuation only).
  for (const m of html.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    const t = prose(m[2]);
    if (t && t.replace(/[^A-Za-z0-9]/g, '').length === 0) flag(f, 'empty heading h' + m[1] + ' ' + JSON.stringify(t));
  }

  // 2. Impossible Article numbers: a plain "<number>" above 395.
  for (const m of html.matchAll(/Articles?\s+(\d{1,4})([A-Z]{0,3})\b/g)) {
    const n = parseInt(m[1], 10);
    if (n > 395 && !m[2]) flag(f, 'impossible Article ' + n + ' (the constitution had 395)');
  }

  // 3. Future years, but only inside a case citation — a bare "2047" is usually
  //    a policy target (India@2047), whereas "X v. Y (2030)" cannot be real.
  for (const m of html.matchAll(/\b(20\d\d)\b/g)) {
    if (parseInt(m[1], 10) <= CURRENT_YEAR) continue;
    const before = html.slice(Math.max(0, m.index - 90), m.index);
    if (/\bvs?\.?\s|v\.\s|Court|judgment|held/i.test(before)) flag(f, 'future year ' + m[1] + ' in a case/authority reference');
  }

  // 4. Stacked duplicate paragraphs (deepen passes can repeat a block).
  const ps = [...html.matchAll(/<p>([\s\S]*?)<\/p>/gi)].map(m => prose(m[1]));
  for (let i = 1; i < ps.length; i++) {
    if (ps[i].length > 80 && ps[i] === ps[i - 1]) flag(f, 'duplicate consecutive paragraph (' + ps[i].slice(0, 50) + '...)');
  }

  // 5. Unbalanced <div> (the coloured-line bleed defect).
  const open = (html.match(/<div\b/gi) || []).length;
  const close = (html.match(/<\/div>/gi) || []).length;
  if (open !== close) flag(f, 'unbalanced <div>: ' + open + ' open vs ' + close + ' close');
}

console.log(flags ? ('citation-guard: ' + flags + ' flag(s) — review before publishing') : 'citation-guard: clean');
process.exit(flags ? 1 : 0);
