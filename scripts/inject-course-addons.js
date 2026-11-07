// Inject the depth addenda for hand-built lesson pages at deploy time.
//
// scripts/course-addons.json (written by scripts/expand-course.js, depth lane)
// holds extra advanced sections for lessons the generator must never rewrite:
// pages such as Indian Polity that contain thousands of hand-written lines.
// The addendum is appended inside div.lesson-body, before its closing tag, and
// replaced on every deploy so it is deterministic and idempotent.
//
// Run: node scripts/inject-course-addons.js <deploy-root>
const fs = require('fs');
const path = require('path');

const MARK_START = '<!-- course-addon:start -->';
const MARK_END = '<!-- course-addon:end -->';
const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const FILE = process.env.COURSE_ADDONS_FILE
  ? path.resolve(process.env.COURSE_ADDONS_FILE)
  : path.join(__dirname, 'course-addons.json');

function closingDiv(html, openEnd) {
  const re = /<\/?div\b[^>]*>/gi;
  re.lastIndex = openEnd;
  let depth = 1;
  let m;
  while ((m = re.exec(html))) {
    if (m[0].slice(0, 2) === '</') depth--;
    else depth++;
    if (depth === 0) return m.index;
  }
  return -1;
}

function stripExisting(html) {
  return html.replace(/\s*<!-- course-addon:start -->[\s\S]*?<!-- course-addon:end -->\s*/g, '\n');
}

let addons;
try {
  addons = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
} catch (e) {
  console.log('inject-course-addons: no addon file yet (' + e.message + ')');
  process.exit(0);
}
const keys = (addons && addons.keys) || {};
let pages = 0, changed = 0, missing = 0;

for (const key of Object.keys(keys)) {
  const entry = keys[key];
  const html = String((entry && entry.html) || '').trim();
  if (!html) continue;
  const files = Array.isArray(entry && entry.files) ? entry.files : [];
  for (const rel of files) {
    const fp = path.join(ROOT, rel);
    if (!fs.existsSync(fp)) { missing++; continue; }
    const src = fs.readFileSync(fp, 'utf-8');
    const clean = stripExisting(src);
    pages++;
    const open = clean.indexOf('<div class="lesson-body">');
    if (open === -1) {
      console.warn('inject-course-addons: no lesson-body in ' + rel + ', skipped');
      continue;
    }
    const close = closingDiv(clean, open + '<div class="lesson-body">'.length);
    if (close === -1) {
      console.warn('inject-course-addons: unbalanced lesson-body in ' + rel + ', skipped');
      continue;
    }
    const block = '\n' + MARK_START + '\n' + html + '\n' + MARK_END + '\n';
    const out = clean.slice(0, close) + block + clean.slice(close);
    if (out !== src) {
      fs.writeFileSync(fp, out, 'utf-8');
      changed++;
    }
  }
}
console.log('inject-course-addons: ' + changed + ' page(s) updated, ' + pages + ' checked' +
  (missing ? ', ' + missing + ' target(s) absent' : ''));
