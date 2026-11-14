// Content-loss guard for the pages and lessons that agents rewrite.
//
// Several scheduled workflows regenerate content from their own view of the
// world, and anything they cannot see is dropped:
//   - expand-course.yml  rewrites lesson bodies from scripts/course-data.json
//   - site-agent.yml     edits pages with a local 9B model, continuously
//   - selfcheck-quick.yml repairs page markup hourly
// That is how the combined micro-test drills disappeared on 2026-11-10 (see
// scripts/lib/topic-index-guard.test.js) and why AGENTS.md calls a silently
// shorter page a defect.
//
// scripts/content-baseline.json records a floor for each lesson body and for
// hand-built pages, plus marker strings that must survive. Floors are 85% of
// the size at baseline time, so normal growth passes and only real loss fails.
// To accept an intentional shrink, review it and re-run
//   node scripts/generate-content-baseline.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const BASELINE_FILE = path.join(ROOT, 'scripts', 'content-baseline.json');
const COURSE_DATA = path.join(ROOT, 'scripts', 'course-data.json');

assert(fs.existsSync(BASELINE_FILE), 'scripts/content-baseline.json is missing — run node scripts/generate-content-baseline.js');
const baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));

// ── lesson bodies (scripts/course-data.json) ────────────────────────────────
assert(fs.existsSync(COURSE_DATA), 'scripts/course-data.json is missing — every course lesson would render as filler');
const courseData = JSON.parse(fs.readFileSync(COURSE_DATA, 'utf8'));

const lostLessons = [];
const shrunkenLessons = [];
for (const key of Object.keys(baseline.lessons || {})) {
  const floor = baseline.lessons[key];
  const body = courseData[key];
  if (body === undefined) {
    lostLessons.push(key);
    continue;
  }
  const len = String(body || '').length;
  if (len < floor) shrunkenLessons.push(key + ' (' + len + ' < ' + floor + ')');
}

assert.deepStrictEqual(
  lostLessons, [],
  lostLessons.length + ' lesson(s) removed from scripts/course-data.json: ' + lostLessons.slice(0, 8).join(', ') +
  (lostLessons.length > 8 ? ' …' : '')
);
assert.deepStrictEqual(
  shrunkenLessons, [],
  shrunkenLessons.length + ' lesson(s) shrank below the recorded floor: ' + shrunkenLessons.slice(0, 8).join(', ') +
  (shrunkenLessons.length > 8 ? ' …' : '') +
  ' — if this shrink is intentional, review it and re-run node scripts/generate-content-baseline.js'
);

// ── hand-built and agent-rewritten pages ────────────────────────────────────
const missingPages = [];
const smallPages = [];
const missingMarkers = [];
for (const page of baseline.pages || []) {
  const abs = path.join(ROOT, page.path);
  if (!fs.existsSync(abs)) {
    missingPages.push(page.path);
    continue;
  }
  const body = fs.readFileSync(abs, 'utf8');
  const bytes = Buffer.byteLength(body, 'utf8');
  if (bytes < page.floorBytes) smallPages.push(page.path + ' (' + bytes + ' < ' + page.floorBytes + ' bytes)');
  for (const marker of page.markers || []) {
    if (body.indexOf(marker) === -1) missingMarkers.push(page.path + ' → ' + marker);
  }
}

assert.deepStrictEqual(
  missingPages, [],
  'page(s) deleted that the site still links to: ' + missingPages.join(', ') +
  ' — if the removal is intentional, review it and re-run node scripts/generate-content-baseline.js'
);
assert.deepStrictEqual(
  smallPages, [],
  'page(s) shrank below the recorded floor: ' + smallPages.join(', ')
);
assert.deepStrictEqual(
  missingMarkers, [],
  'page section(s) lost: ' + missingMarkers.join(', ')
);

console.log('PASS  content baseline: ' + Object.keys(baseline.lessons || {}).length +
  ' lessons and ' + (baseline.pages || []).length + ' pages intact');
