#!/usr/bin/env node
// Regenerate scripts/content-baseline.json, the floor that
// scripts/lib/content-baseline-guard.test.js checks against.
//
// Run this ONLY when a drop is intentional and reviewed. The guard exists
// because several scheduled agents rewrite content that was authored by hand:
// expand-course rewrites lessons, site-agent edits pages with a 9B model,
// selfcheck-quick repairs markup hourly. Each one is a generator rebuilding a
// file from its own view of the world, so anything it cannot see is dropped.
//
//   node scripts/generate-content-baseline.js
//
// Floors are set at FLOOR_RATIO of the size measured right now, so normal
// growth (an agent appending sections) always passes and only a real loss
// fails.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'content-baseline.json');
const COURSE_DATA = path.join(ROOT, 'scripts', 'course-data.json');
const FLOOR_RATIO = 0.85;

// Pages that are hand-built or that agents rewrite wholesale. `markers` are
// strings that must survive: pick section ids/headings, not prose.
const PAGES = [
  {
    path: 'upsc/course/gs/lesson-indian-history.html',
    markers: ['id="toc"', 'id="indus-valley"', 'id="delhi-sultanate"', 'id="mughal"']
  },
  {
    path: 'upsc/course/gs/lesson-indian-polity.html',
    markers: ['id="toc"', 'id="making"', 'id="preamble"', 'id="citizenship"']
  },
  {
    path: 'upsc/course/gs/lesson-indian-economy.html',
    markers: ['id="toc"', 'id="national-income"', 'id="banking"']
  },
  {
    path: 'upsc/course/gs/lesson-indian-geography.html',
    markers: ['id="toc"', 'id="physical"', 'id="drainage"', 'id="climate"']
  },
  {
    path: 'upsc/course/gs/lesson-general-science.html',
    markers: ['id="physics"', 'id="chemistry"', 'id="biology"', 'id="space"']
  },
  {
    path: 'upsc/course/gs/lesson-environment-ecology.html',
    markers: ['id="ecology-basics"', 'id="population"', 'id="biodiversity"', 'id="climate"']
  },
  {
    path: 'upsc/course/gs/lesson-world-history.html',
    markers: ['id="toc"', 'id="enlightenment"', 'id="american-revolution"', 'id="french-revolution"']
  },
  {
    path: 'upsc/course/gs/lesson-current-affairs.html',
    markers: ['id="national"', 'id="international"', 'id="economy"', 'id="environment"']
  },
  {
    path: 'micro-test.html',
    markers: ['id="stepExam"', 'id="topicList"', 'id="startBtn"', 'js/micro-test.js']
  },
  {
    path: 'js/micro-test.js',
    markers: ['function renderTopics', 'function selectTopic', '__topicIndex']
  },
  {
    path: 'languages.html',
    markers: ['<title>']
  }
];

const courseData = JSON.parse(fs.readFileSync(COURSE_DATA, 'utf8'));
const lessons = {};
let totalChars = 0;
for (const key of Object.keys(courseData)) {
  const len = String(courseData[key] || '').length;
  if (!len) continue;
  lessons[key] = Math.round(len * FLOOR_RATIO);
  totalChars += len;
}

const pages = [];
for (const p of PAGES) {
  const abs = path.join(ROOT, p.path);
  if (!fs.existsSync(abs)) {
    console.error('SKIP ' + p.path + ' — not in this checkout (run from a full checkout)');
    continue;
  }
  const body = fs.readFileSync(abs, 'utf8');
  const missing = p.markers.filter(function (m) { return body.indexOf(m) === -1; });
  if (missing.length) {
    console.error('SKIP ' + p.path + ' — markers not found: ' + missing.join(', '));
    continue;
  }
  pages.push({
    path: p.path,
    floorBytes: Math.round(Buffer.byteLength(body, 'utf8') * FLOOR_RATIO),
    markers: p.markers
  });
}

const baseline = {
  generatedAt: new Date().toISOString(),
  note: 'Floors for scripts/lib/content-baseline-guard.test.js. Regenerate with scripts/generate-content-baseline.js after a reviewed, intentional shrink.',
  floorRatio: FLOOR_RATIO,
  lessonCount: Object.keys(lessons).length,
  totalLessonChars: totalChars,
  lessons: lessons,
  pages: pages
};

fs.writeFileSync(OUT, JSON.stringify(baseline, null, 2) + '\n');
console.log('wrote ' + path.relative(ROOT, OUT));
console.log('  lessons floored : ' + baseline.lessonCount + ' (' + totalChars + ' chars)');
console.log('  pages floored   : ' + pages.length);
pages.forEach(function (p) { console.log('    ' + p.path + ' >= ' + p.floorBytes + ' bytes'); });
