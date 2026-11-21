'use strict';
// Every exam crash-course page renders from js/study-content.js via
// js/study-engine.js. On 2026-11-15 none of the 14 pages included either
// script, so every page showed "Content Coming Soon" even though the data
// existed. This guard fails the build if a page loses an include or asks for a
// key the data file does not define.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const pages = fs.readdirSync(ROOT)
  .filter(function (d) {
    return fs.existsSync(path.join(ROOT, d, 'crash-course.html'));
  })
  .sort();

const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'study-content.js'), 'utf8'), ctx);
const data = ctx.STUDY_DATA || {};

let checked = 0;
for (const slug of pages) {
  const file = path.join(ROOT, slug, 'crash-course.html');
  const html = fs.readFileSync(file, 'utf8');
  assert.ok(html.indexOf('js/study-content.js') !== -1, slug + ': missing study-content.js');
  assert.ok(html.indexOf('js/study-engine.js') !== -1, slug + ': missing study-engine.js');
  const m = /STUDY_DATA\.([a-z0-9-]+)/i.exec(html);
  assert.ok(m, slug + ': no STUDY_DATA key');
  assert.ok(data[m[1]], slug + ': STUDY_DATA.' + m[1] + ' is not defined');
  checked++;
}

assert.ok(checked >= 14, 'expected at least 14 crash-course pages, found ' + checked);
console.log('PASS  crash-course pages: ' + checked + ' pages include the data engine and a defined key');