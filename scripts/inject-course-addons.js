// Inject the depth addenda for hand-built pages at deploy time.
//
// scripts/course-addons.json (written by scripts/expand-course.js, depth lane)
// holds extra advanced sections for pages the generator must never rewrite:
// the hand-built lesson-*.html pages and the concept-map / paper hubs. Entries
// with target "lesson-body" are appended inside div.lesson-body; entries with
// target "body" (hubs, which have no .lesson-body) are appended just before
// </body> inside a styled .course-addon wrapper. The marked block is replaced
// on every deploy, so injection is deterministic and idempotent.
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

// Hub pages have no lesson-body styles, so the wrapper brings its own.
const HUB_STYLE = [
  '<style>',
  '.course-addon{max-width:1100px;margin:0 auto;padding:56px 24px;font-family:Inter,system-ui,-apple-system,sans-serif;color:#fafafa;line-height:1.7}',
  '.course-addon h3{font-size:1.4rem;font-weight:800;margin:32px 0 12px;color:#c4b5fd}',
  '.course-addon h4{font-size:1.05rem;font-weight:700;margin:20px 0 8px;color:#fbbf24}',
  '.course-addon p,.course-addon li{color:#a1a1aa;font-size:.95rem;line-height:1.75}',
  '.course-addon p{margin:0 0 12px}',
  '.course-addon ul,.course-addon ol{padding-left:22px;margin:0 0 14px}',
  '.course-addon .example-box{background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.18);border-radius:12px;padding:16px;margin:16px 0}',
  '.course-addon .ex-title{font-size:.72rem;font-weight:700;color:#fbbf24;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}',
  '.course-addon .ex-text,.course-addon .ex-soln{color:#a1a1aa;font-size:.9rem;line-height:1.7}',
  '.course-addon .ex-soln{margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.06)}',
  '.course-addon .tip-box{background:rgba(52,211,153,.06);border:1px solid rgba(52,211,153,.18);border-radius:12px;padding:16px;margin:16px 0}',
  '.course-addon .tip-title{font-size:.72rem;font-weight:700;color:#34d399;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}',
  '.course-addon .tip-text{color:#a1a1aa;font-size:.9rem;line-height:1.7}',
  '</style>'
].join('\n');

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
  return html.replace(/<!-- course-addon:start -->[\s\S]*?<!-- course-addon:end -->/g, '');
}

let addons;
try {
  addons = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
} catch (e) {
  console.log('inject-course-addons: no addon file yet (' + e.message + ')');
  process.exit(0);
}
const keys = (addons && addons.keys) || {};

// One file can serve several keys (shared lessons). Group first so the second
// entry appends instead of stripping the first entry's block.
const byFile = new Map();
for (const key of Object.keys(keys)) {
  const entry = keys[key] || {};
  const html = String(entry.html || '').trim();
  if (!html) continue;
  const files = Array.isArray(entry.files) ? entry.files : [];
  for (const rel of files) {
    if (!byFile.has(rel)) byFile.set(rel, []);
    byFile.get(rel).push({ key, entry, html });
  }
}

let pages = 0, changed = 0, missing = 0, skipped = 0;

for (const [rel, items] of byFile) {
  const fp = path.join(ROOT, rel);
  if (!fs.existsSync(fp)) { missing++; continue; }
  const src = fs.readFileSync(fp, 'utf-8');
  const clean = stripExisting(src);
  pages++;
  const useBody = items.some((it) => String(it.entry.target || 'lesson-body') === 'body');
  const html = items.map((it) => it.html).join('\n');

  let out;
  if (useBody) {
    const close = /<\/body\s*>/i.exec(clean);
    if (!close) {
      console.warn('inject-course-addons: no </body> in ' + rel + ', skipped');
      skipped++;
      continue;
    }
    const block = MARK_START + '\n' + HUB_STYLE + '\n<div class="course-addon">\n' +
      html + '\n</div>\n' + MARK_END;
    out = clean.slice(0, close.index) + block + clean.slice(close.index);
  } else {
    const openTag = '<div class="lesson-body">';
    const open = clean.indexOf(openTag);
    if (open === -1) {
      console.warn('inject-course-addons: no lesson-body in ' + rel + ', skipped');
      skipped++;
      continue;
    }
    const close = closingDiv(clean, open + openTag.length);
    if (close === -1) {
      console.warn('inject-course-addons: unbalanced lesson-body in ' + rel + ', skipped');
      skipped++;
      continue;
    }
    const block = MARK_START + '\n' + html + '\n' + MARK_END;
    out = clean.slice(0, close) + block + clean.slice(close);
  }

  if (out !== src) {
    fs.writeFileSync(fp, out, 'utf-8');
    changed++;
  }
}
console.log('inject-course-addons: ' + changed + ' page(s) updated, ' + pages + ' checked' +
  (missing ? ', ' + missing + ' target(s) absent' : '') +
  (skipped ? ', ' + skipped + ' skipped' : ''));
